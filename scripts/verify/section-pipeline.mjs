/**
 * Headless reproduction of the live-section pipeline (SectionCanvas registry
 * build + contour extraction) so a crash can be diagnosed without a browser.
 *
 * Mirrors:
 *   sectionAssets.registryPartFromGeometry  → positions/indices copies
 *   contourWorker init                      → partBounds + slice
 *   contourWorker plane                     → extractContours per part
 *
 * Run: npm run verify:pipeline   (must be run from the repo root — the paths
 * below are repo-relative and this file lives in scripts/verify/)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { boundsMayCut, extractContours, partBounds } from '../../src/components/section/contours.ts'

const MANIFEST = resolve('src/assets/anatomy/anatomy-manifest.json')
const DIR = resolve('src/assets/anatomy')

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
console.log(`manifest: ${manifest.parts.length} parts, version ${manifest.version}`)

const loader = new GLTFLoader()

function parseGlb(arrayBuffer) {
  return new Promise((res, rej) => loader.parse(arrayBuffer, '', res, rej))
}

function registryPartFromGeometry(slug, geometry) {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return null
  const positions = position.array.slice()
  const sourceIndex = geometry.getIndex()
  let indices
  if (sourceIndex !== null) {
    indices = new Uint32Array(sourceIndex.array)
  } else {
    indices = new Uint32Array(position.count)
    for (let i = 0; i < position.count; i++) indices[i] = i
  }
  return { slug, positions, indices }
}

const parts = []
const failures = []
let totalTris = 0

for (const part of manifest.parts) {
  const file = resolve(DIR, part.file ?? `${part.slug}.glb`)
  try {
    const buf = readFileSync(file)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const gltf = await parseGlb(ab)
    let mesh = null
    gltf.scene.traverse((child) => {
      if (mesh === null && child.isMesh) mesh = child
    })
    if (mesh === null) {
      failures.push([part.slug, 'no mesh in GLB'])
      continue
    }
    const reg = registryPartFromGeometry(part.slug, mesh.geometry)
    if (reg === null) {
      failures.push([part.slug, 'no position attribute'])
      continue
    }
    const bounds = partBounds(reg.positions)
    const tris = reg.indices.length / 3
    totalTris += tris
    // Validate index range the way the worker will use it.
    let maxIdx = 0
    for (let i = 0; i < reg.indices.length; i++) if (reg.indices[i] > maxIdx) maxIdx = reg.indices[i]
    const vertCount = reg.positions.length / 3
    if (maxIdx >= vertCount) {
      failures.push([part.slug, `index ${maxIdx} >= vertex count ${vertCount}`])
    }
    parts.push({ slug: part.slug, positions: reg.positions, indices: reg.indices, bounds })
  } catch (error) {
    failures.push([part.slug, error instanceof Error ? error.message : String(error)])
  }
}

console.log(`registry: ${parts.length} parts, ${totalTris.toFixed(0)} triangles`)
console.log(`failures: ${failures.length}`)
for (const [slug, why] of failures.slice(0, 20)) console.log(`  - ${slug}: ${why}`)

// --- plane sweep: the exact per-plane worker work -------------------------
/**
 * The plane sweep. The first eight entries are the original v1–v6 set (they
 * must keep producing the same contours: "nothing below y = +45 moves"); the
 * five added by v7 cover the AMENDMENT B telencephalon box
 * (docs/TELENCEPHALON_PLAN.md §2/§9) — the four new transverse anchors
 * (+48 thalamostriate, +58 basal ganglia, +68 centrum semiovale, +78 high
 * convexity) plus one frontal plane at z = +40. This is the machine evidence
 * for the §9 item "the four new levels drive the live section", and it runs
 * without a browser (plan C12/R6).
 */
const TEL_PLANES = [
  { axis: 'y', value: 48 },
  { axis: 'y', value: 58 },
  { axis: 'y', value: 68 },
  { axis: 'y', value: 78 },
  { axis: 'z', value: 40 },
]

const planes = [
  { axis: 'y', value: -46 },
  { axis: 'y', value: -24 },
  { axis: 'y', value: -8 },
  { axis: 'y', value: 0 },
  { axis: 'y', value: 14 },
  { axis: 'y', value: 30 },
  { axis: 'x', value: 6 },
  { axis: 'z', value: 0 },
  ...TEL_PLANES,
]

let sweepErrors = 0
let sweepLoops = 0

for (const plane of planes) {
  const t0 = performance.now()
  let tris = 0
  let segments = 0
  let loops = 0
  let partsWithLoops = 0
  const errors = []
  for (const part of parts) {
    try {
      if (!boundsMayCut(part.bounds, plane)) continue
      const result = extractContours(part.positions, part.indices, plane)
      tris += result.trianglesTested
      segments += result.segmentCount
      loops += result.loops.length
      if (result.loops.length > 0) partsWithLoops += 1
      for (const loop of result.loops) {
        if (loop.length < 6 || loop.length % 2 !== 0) {
          errors.push(`${part.slug}: malformed loop len ${loop.length}`)
        }
        for (const n of loop) {
          if (!Number.isFinite(n)) {
            errors.push(`${part.slug}: non-finite loop value`)
            break
          }
        }
      }
    } catch (error) {
      errors.push(`${part.slug}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const ms = performance.now() - t0
  const heap = (process.memoryUsage().heapUsed / 1048576).toFixed(0)
  sweepErrors += errors.length
  sweepLoops += loops
  console.log(
    `plane ${plane.axis}=${String(plane.value).padStart(4)}  tris ${String(tris).padStart(6)}  ` +
      `seg ${String(segments).padStart(6)}  loops ${String(loops).padStart(5)}  parts ${partsWithLoops}/${parts.length}  ` +
      `${ms.toFixed(0)}ms  heap ${heap}MB  errors ${errors.length}`,
  )
  for (const e of errors.slice(0, 5)) console.log(`    ! ${e}`)
}

/* ------------------------------------------------------------------- gate */
const expectedParts = manifest.parts.length
const problems = []
if (parts.length !== expectedParts) {
  problems.push(`registry built ${parts.length}/${expectedParts} manifest parts`)
}
if (failures.length > 0) problems.push(`${failures.length} GLB parse/validation failure(s)`)
if (sweepErrors > 0) problems.push(`${sweepErrors} contour error(s) during the plane sweep`)
if (sweepLoops === 0) problems.push('no contours produced at any tested plane')

console.log(
  `\npipeline: ${parts.length}/${expectedParts} parts · ${totalTris.toFixed(0)} triangles · ` +
    `${sweepLoops} loops across ${planes.length} planes · ${problems.length} problem(s)`,
)
if (problems.length > 0) {
  for (const p of problems) console.log(`  FAIL ${p}`)
  process.exit(1)
}
console.log('  PASS section pipeline')
process.exit(0)
