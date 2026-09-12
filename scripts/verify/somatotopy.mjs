/**
 * verify/somatotopy.mjs — the committed non-browser check for the v9 somatotopic
 * map (docs/SWARM_V9_PLAN.md §1 acceptance, PLAN.md §5.1).
 *
 * It imports the modules the app really ships — `src/geometry/somatotopy.ts`
 * (through the same extensionless-specifier loader hook `verify:plane` uses) and
 * `src/components/viewer3d/clipPlanes.ts` (the single runtime declaration of
 * CLIP_BOUNDS) — and the two data files, then asserts:
 *
 *  A. REGISTRY-FIRST — the 16 ids exist in src/data/taxonomy.json BEFORE a record
 *     references them, the taxonomy id set EQUALS the record id set EQUALS the
 *     geometry table's id set (16/16 each), every taxonomy entry nests under
 *     ctx-m1 / ctx-s1, carries subdivision 'Functional cortical areas', kind
 *     'context' and a unique display name, and every record name matches its
 *     registry name (validate's own 0-warning rule).
 *  B. PLACEMENT — for every segment: origin3d is inside CLIP_BOUNDS, origin3d ±
 *     size3d is inside too, the patch centre offset along the measured normal is
 *     inside, and the mirrored (−x) placement is inside as well. Every failure is
 *     printed with the offending numbers.
 *  C. ORDERING — `order` is 0..7 exactly once per strip, `arcS` is strictly
 *     increasing on both strips (the coordinate the map is defined by) and `x` is
 *     strictly increasing too, with the per-gap table printed.
 *  D. PAIRING — each of the 8 body parts has exactly one M1 and one S1 segment
 *     (8/8, printed both ways).
 *  E. HONESTY — every record carries a `contextNote` containing the required
 *     "schematic on the derived … ribbon" statement, the note names the probe
 *     command and the measured residual, and the residual it quotes equals the
 *     residual in the geometry table.
 *  F. COLOURS — the one ramp in src/geometry/somatotopy.ts reproduces the 16
 *     committed record/taxonomy colours exactly (so the overlay cannot drift from
 *     the registry), and the ramp is monotone in `rampT` between its two anchors.
 *  G. THE OVERLAY IS WIRED — SceneLayers.tsx mounts `SomatotopyOverlay` and filters
 *     `SOMATOTOPY_RECORD_IDS` out of the structure pass, and the overlay's own
 *     source gates on `telencephalon` + `context` and dims with the shared
 *     `highlightIdSet` rule. Read as source text (no browser here).
 *
 * It NEVER only prints pass/fail: the probe command, the probe's per-segment
 * residual, the ordering gaps and the pairing table are all in the output.
 *
 * Run from the repo root:  node scripts/verify/somatotopy.mjs
 * (wired as `npm run somatotopy` — see the integrator's package.json line in the
 * task report; this task does not own package.json).
 */
import { register } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href)

const geometry = await import('../../src/geometry/somatotopy.ts')
const { CLIP_BOUNDS } = await import('../../src/components/viewer3d/clipPlanes.ts')

const {
  SOMATOTOPY_SEGMENTS,
  SOMATOTOPY_RECORD_IDS,
  SOMATOTOPY_BODY_PARTS,
  SOMATOTOPY_PATCH_SIZE,
  SOMATOTOPY_SURFACE_OFFSET_AU,
  SOMATOTOPY_SEGMENT_COLORS,
  SOMATOTOPY_RAMP_ANCHORS,
  SOMATOTOPY_RAMP_T,
  SOMATOTOPY_METHOD_NOTE,
  somatotopyColor,
  somatotopySegmentsForBodyPart,
} = geometry

const RECORD_FILE = 'src/data/structures/telencephalon-somatotopy.json'
const TAXONOMY_FILE = 'src/data/taxonomy.json'
const OVERLAY_FILE = 'src/components/viewer3d/SomatotopyOverlay.tsx'
const SCENE_FILE = 'src/components/viewer3d/SceneLayers.tsx'
const PROBE = 'node .dsh-scratch/somatotopy-probe7b.mjs'

const records = JSON.parse(readFileSync(RECORD_FILE, 'utf8'))
const taxonomy = JSON.parse(readFileSync(TAXONOMY_FILE, 'utf8'))
const taxonomyById = new Map(taxonomy.map((e) => [e.id, e]))
const recordById = new Map(records.map((r) => [r.id, r]))

let passed = 0
const failures = []
function ok(message) { passed++; console.log(`  ok   ${message}`) }
function bad(message) { failures.push(message); console.log(`  FAIL ${message}`) }
function check(condition, goodMessage, badMessage) {
  if (condition) ok(goodMessage); else bad(badMessage)
}

const fmt = (n, digits = 2) => Number(n).toFixed(digits)
const vec = (v) => `[${v.map((n) => fmt(n)).join(', ')}]`

console.log('==============================================================')
console.log(' v9 somatotopy — M1/S1 strip records, probed placement, 3D overlay')
console.log('==============================================================')
console.log(`geometry table : src/geometry/somatotopy.ts — ${SOMATOTOPY_SEGMENTS.length} segments`)
console.log(`records        : ${RECORD_FILE} — ${records.length} records`)
console.log(`registry       : ${TAXONOMY_FILE} — ${taxonomy.length} entries`)
console.log(`probe          : ${PROBE}   (re-run it to reproduce the placement table)`)
console.log(`CLIP_BOUNDS    : x[${CLIP_BOUNDS.x.min}, ${CLIP_BOUNDS.x.max}] y[${CLIP_BOUNDS.y.min}, ${CLIP_BOUNDS.y.max}] z[${CLIP_BOUNDS.z.min}, ${CLIP_BOUNDS.z.max}]`)

/* ---------------------------------------------------------------- A. registry */
console.log('\n=== A. REGISTRY-FIRST — ids registered, names unique, three sources agree ===')

const geometryIds = new Set(SOMATOTOPY_SEGMENTS.map((s) => s.id))
const recordIds = new Set(records.map((r) => r.id))
const SET_IDS = new Set([...geometryIds])

check(SOMATOTOPY_SEGMENTS.length === 16, `geometry table carries 16 segments`, `expected 16 segments, found ${SOMATOTOPY_SEGMENTS.length}`)
check(records.length === 16, `record file carries 16 records`, `expected 16 records, found ${records.length}`)

const unregistered = [...SET_IDS].filter((id) => !taxonomyById.has(id))
check(unregistered.length === 0, 'every geometry id exists in taxonomy.json (registry-first)', `unregistered ids: ${unregistered.join(', ')}`)

const recordsNotRegistered = [...recordIds].filter((id) => !taxonomyById.has(id))
check(recordsNotRegistered.length === 0, 'every record id exists in taxonomy.json', `records without a registry entry: ${recordsNotRegistered.join(', ')}`)

const geometryNotRecorded = [...SET_IDS].filter((id) => !recordById.has(id))
const recordedNotInGeometry = [...recordIds].filter((id) => !geometryIds.has(id))
check(
  geometryNotRecorded.length === 0 && recordedNotInGeometry.length === 0,
  'taxonomy/record/geometry id sets are equal (16/16)',
  `id set mismatch — in table not in records: [${geometryNotRecorded.join(', ')}]; in records not in table: [${recordedNotInGeometry.join(', ')}]`,
)

check(
  SOMATOTOPY_RECORD_IDS.size === 16 && [...SET_IDS].every((id) => SOMATOTOPY_RECORD_IDS.has(id)),
  'SOMATOTOPY_RECORD_IDS names all 16 (the set SceneLayers filters on)',
  `SOMATOTOPY_RECORD_IDS has ${SOMATOTOPY_RECORD_IDS.size} entries, expected 16`,
)

const WRONG_PARENT = []
for (const id of SET_IDS) {
  const entry = taxonomyById.get(id)
  if (!entry) continue
  const strip = id.startsWith('ctx-m1-') ? 'm1' : 's1'
  if (entry.parent !== `ctx-${strip}`) WRONG_PARENT.push(`${id} → ${entry.parent}`)
  if (entry.region !== 'telencephalon') WRONG_PARENT.push(`${id} region ${entry.region}`)
  if (entry.subdivision !== 'Functional cortical areas') WRONG_PARENT.push(`${id} subdivision ${entry.subdivision}`)
  if (entry.kind !== 'context') WRONG_PARENT.push(`${id} kind ${entry.kind}`)
  if (entry.laterality !== 'paired') WRONG_PARENT.push(`${id} laterality ${entry.laterality}`)
}
check(
  WRONG_PARENT.length === 0,
  'every entry: region telencephalon · subdivision "Functional cortical areas" · kind context · paired · parent ctx-m1/ctx-s1',
  `registry metadata problems: ${WRONG_PARENT.join('; ')}`,
)
check(
  taxonomyById.has('ctx-m1') && taxonomyById.has('ctx-s1'),
  'the two parents ctx-m1 / ctx-s1 exist in the registry (the tree nests under them)',
  'ctx-m1 or ctx-s1 is missing from the registry',
)

const names = new Map()
const DUPLICATE_NAMES = []
for (const id of SET_IDS) {
  const entry = taxonomyById.get(id)
  if (!entry) continue
  if (names.has(entry.name)) DUPLICATE_NAMES.push(`${entry.name} (${names.get(entry.name)} / ${id})`)
  else names.set(entry.name, id)
}
check(DUPLICATE_NAMES.length === 0, '16 unique display names (validate\'s 0-warning rule)', `duplicate display names: ${DUPLICATE_NAMES.join('; ')}`)

const NAME_MISMATCH = []
for (const id of SET_IDS) {
  const entry = taxonomyById.get(id)
  const record = recordById.get(id)
  if (entry && record && entry.name !== record.name) NAME_MISMATCH.push(`${id}: "${record.name}" vs registry "${entry.name}"`)
}
check(NAME_MISMATCH.length === 0, 'each record name equals its registry name', `name mismatches: ${NAME_MISMATCH.join('; ')}`)

const CONTENT_MISMATCH = []
for (const segment of SOMATOTOPY_SEGMENTS) {
  const record = recordById.get(segment.id)
  if (!record) continue
  if (record.region !== 'telencephalon') CONTENT_MISMATCH.push(`${segment.id} region`)
  if (record.subdivision !== 'Functional cortical areas') CONTENT_MISMATCH.push(`${segment.id} subdivision`)
  if (record.kind !== 'context') CONTENT_MISMATCH.push(`${segment.id} kind`)
  if (record.laterality !== 'paired') CONTENT_MISMATCH.push(`${segment.id} laterality`)
  if (!Array.isArray(record.levels) || record.levels.length === 0) CONTENT_MISMATCH.push(`${segment.id} levels`)
  if (!Array.isArray(record.refs) || record.refs.length === 0) CONTENT_MISMATCH.push(`${segment.id} refs`)
  if (!Array.isArray(record.synonyms) || record.synonyms.length === 0) CONTENT_MISMATCH.push(`${segment.id} synonyms`)
  const connections = record.connections
  if (!connections || !Array.isArray(connections.afferent) || connections.afferent.length === 0) CONTENT_MISMATCH.push(`${segment.id} connections.afferent`)
  if (!connections || !Array.isArray(connections.efferent) || connections.efferent.length === 0) CONTENT_MISMATCH.push(`${segment.id} connections.efferent`)
  if (typeof record.function !== 'string' || record.function.length < 120) CONTENT_MISMATCH.push(`${segment.id} function`)
  if (!Array.isArray(record.clinical) || record.clinical.length === 0) CONTENT_MISMATCH.push(`${segment.id} clinical`)
}
check(
  CONTENT_MISMATCH.length === 0,
  'every record carries levels, refs, synonyms, connections (afferent+efferent), a substantive function and a clinical entry',
  `incomplete records: ${CONTENT_MISMATCH.join('; ')}`,
)

/* --------------------------------------------------------------- B. placement */
console.log('\n=== B. PLACEMENT — inside CLIP_BOUNDS, and the three sources agree ===')

const bounds = [
  { axis: 'x', min: CLIP_BOUNDS.x.min, max: CLIP_BOUNDS.x.max },
  { axis: 'y', min: CLIP_BOUNDS.y.min, max: CLIP_BOUNDS.y.max },
  { axis: 'z', min: CLIP_BOUNDS.z.min, max: CLIP_BOUNDS.z.max },
]

const OOB_ORIGIN = []
const OOB_EXTENT = []
const OOB_MIRROR = []
const OOB_CENTRE = []
const PLACEMENT_MISMATCH = []

for (const segment of SOMATOTOPY_SEGMENTS) {
  const record = recordById.get(segment.id)
  if (!record) continue
  const origin = record.origin3d
  const size = record.size3d
  if (!Array.isArray(origin) || origin.length !== 3) { PLACEMENT_MISMATCH.push(`${segment.id} origin3d shape`); continue }
  if (!Array.isArray(size) || size.length !== 3) { PLACEMENT_MISMATCH.push(`${segment.id} size3d shape`); continue }
  origin.forEach((n, i) => {
    if (n < bounds[i].min || n > bounds[i].max) OOB_ORIGIN.push(`${segment.id} ${bounds[i].axis}=${fmt(n)} ∉ [${bounds[i].min}, ${bounds[i].max}]`)
  })
  origin.forEach((n, i) => {
    if (n - size[i] < bounds[i].min) OOB_EXTENT.push(`${segment.id} ${bounds[i].axis}−size=${fmt(n - size[i])} < ${bounds[i].min}`)
    if (n + size[i] > bounds[i].max) OOB_EXTENT.push(`${segment.id} ${bounds[i].axis}+size=${fmt(n + size[i])} > ${bounds[i].max}`)
  })
  // Mirroring is x → −x only: y and z are untouched, so only the x extent can move.
  if (-origin[0] - size[0] < bounds[0].min) OOB_MIRROR.push(`${segment.id} mirrored x−size=${fmt(-origin[0] - size[0])} < ${bounds[0].min}`)
  if (-origin[0] + size[0] > bounds[0].max) OOB_MIRROR.push(`${segment.id} mirrored x+size=${fmt(-origin[0] + size[0])} > ${bounds[0].max}`)
  const centre = origin.map((n, i) => n + segment.normal[i] * SOMATOTOPY_SURFACE_OFFSET_AU)
  centre.forEach((n, i) => {
    if (n < bounds[i].min || n > bounds[i].max) OOB_CENTRE.push(`${segment.id} centre ${bounds[i].axis}=${fmt(n)} ∉ [${bounds[i].min}, ${bounds[i].max}]`)
  })
  // the geometry table is the source the overlay draws from: it must equal the record
  for (let i = 0; i < 3; i++) {
    if (Math.abs(origin[i] - segment.surfacePoint[i]) > 1e-9) PLACEMENT_MISMATCH.push(`${segment.id} origin3d[${i}] ${fmt(origin[i], 4)} ≠ table ${fmt(segment.surfacePoint[i], 4)}`)
    if (Math.abs(size[i] - SOMATOTOPY_PATCH_SIZE[i]) > 1e-9) PLACEMENT_MISMATCH.push(`${segment.id} size3d[${i}] ${fmt(size[i], 4)} ≠ table ${fmt(SOMATOTOPY_PATCH_SIZE[i], 4)}`)
  }
  if (record.rampT !== segment.rampT) PLACEMENT_MISMATCH.push(`${segment.id} rampT ${record.rampT} ≠ table ${segment.rampT}`)
}

const describe = (list, n = 6) => (list.length <= n ? list.join('; ') : `${list.slice(0, n).join('; ')} … (+${list.length - n} more)`)
check(OOB_ORIGIN.length === 0, `all 16 origin3d inside CLIP_BOUNDS (max |x| ${fmt(Math.max(...SOMATOTOPY_SEGMENTS.map((s) => Math.abs(s.surfacePoint[0]))))}, max y ${fmt(Math.max(...SOMATOTOPY_SEGMENTS.map((s) => s.surfacePoint[1])))})`, `origin3d outside CLIP_BOUNDS: ${describe(OOB_ORIGIN)}`)
check(OOB_EXTENT.length === 0, 'every origin3d ± size3d inside CLIP_BOUNDS (+x side)', `origin3d ± size3d outside: ${describe(OOB_EXTENT)}`)
check(OOB_MIRROR.length === 0, 'every MIRRORED (−x) placement ± size3d inside CLIP_BOUNDS (mirroring moves x only)', `mirrored placement outside: ${describe(OOB_MIRROR)}`)
check(OOB_CENTRE.length === 0, `every patch centre (origin + ${SOMATOTOPY_SURFACE_OFFSET_AU} au along the normal) inside CLIP_BOUNDS`, `patch centre outside: ${describe(OOB_CENTRE)}`)
check(PLACEMENT_MISMATCH.length === 0, 'record origin3d/size3d/rampT equal the geometry table (one source of truth)', `record vs table mismatch: ${describe(PLACEMENT_MISMATCH)}`)

console.log('\n  committed placement table (record origin3d · measured outward normal · size3d · patch footprint):')
for (const segment of SOMATOTOPY_SEGMENTS) {
  const record = recordById.get(segment.id)
  const normal = `(${segment.normal.map((n) => fmt(n, 2)).join(', ')})`
  console.log(
    `    ${segment.id.padEnd(15)} order ${segment.order} · x=${fmt(segment.surfacePoint[0]).padStart(5)} y=${fmt(segment.surfacePoint[1]).padStart(6)} z=${fmt(segment.surfacePoint[2]).padStart(6)}`
    + ` · n=${normal.padEnd(22)} · size ${vec(record ? record.size3d : SOMATOTOPY_PATCH_SIZE)}`
    + ` · residual ${fmt(segment.residual)} au (${fmt(segment.residual * geometry.SOMATOTOPY_AU_MM)} mm)`,
  )
}
const closestX = Math.min(...SOMATOTOPY_SEGMENTS.filter((s) => s.strip === 'm1').slice(1).map((s, i, arr) => {
  const previous = SOMATOTOPY_SEGMENTS.filter((x) => x.strip === 'm1')[i]
  return s.surfacePoint[0] - previous.surfacePoint[0]
}))
console.log(`  closest pair of patch centres: ${fmt(closestX)} au (${fmt(closestX * geometry.SOMATOTOPY_AU_MM)} mm) apart on the M1 strip —`
  + ` patches are ${vec(SOMATOTOPY_PATCH_SIZE.map((n) => n * 2))} au across, so the strip reads as a band and the two labial segments overlap`)

/* -------------------------------------------- B2. the patches sit on the ribbon */
console.log('\n=== B2. SURFACE CONTACT — the patch footprints measured against the ribbon itself ===')
console.log('  (this half re-reads the committed GLB, so it needs no probe run; the overlay builds the')
console.log('   same tangent frame at runtime from `normal` and the neighbouring segments)')

const RIBBON_FILE = 'src/assets/anatomy/ctx-hemisphere-l.glb'
try {
  const buffer = readFileSync(resolve(RIBBON_FILE))
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(arrayBuffer, '', res, rej))
  let ribbon = null
  gltf.scene.traverse((child) => { if (ribbon === null && child.isMesh) ribbon = child })
  const positions = ribbon.geometry.getAttribute('position').array
  const vertexCount = positions.length / 3
  const nearestDistance = (point) => {
    let best = Infinity
    for (let i = 0; i < vertexCount; i++) {
      const dx = positions[i * 3] - point[0]
      const dy = positions[i * 3 + 1] - point[1]
      const dz = positions[i * 3 + 2] - point[2]
      const d = dx * dx + dy * dy + dz * dz
      if (d < best) best = d
    }
    return Math.sqrt(best)
  }

  const CENTRE_TOLERANCE = 1.0 // au — the centre must be on the surface (the probe fitted it to 0.16 au)
  const RIM_TOLERANCE = 3.5 // au — every sampled rim point must be near the surface, not floating or buried
  const RIM_FRACTION = 0.92 // the drawn outline's radius, so a sample cannot fall outside the geometry
  const RIM_SAMPLES = 24 // the overlay's CircleGeometry segment count
  const CENTRE_PROBLEMS = []
  const RIM_PROBLEMS = []
  const RIM_STATS = []
  for (const segment of SOMATOTOPY_SEGMENTS) {
    const normalLength = Math.hypot(...segment.normal) || 1
    const normal = segment.normal.map((q) => q / normalLength)
    const strip = SOMATOTOPY_SEGMENTS.filter((s) => s.strip === segment.strip)
    const positionInStrip = strip.findIndex((s) => s.id === segment.id)
    const next = strip[Math.min(positionInStrip + 1, strip.length - 1)]
    const previous = strip[Math.max(positionInStrip - 1, 0)]
    const raw = [0, 1, 2].map((k) => next.surfacePoint[k] - previous.surfacePoint[k])
    const projection = raw.reduce((sum, q, k) => sum + q * normal[k], 0)
    let along = raw.map((q, k) => q - projection * normal[k])
    const alongLength = Math.hypot(...along) || 1
    along = along.map((q) => q / alongLength)
    const axisY = [
      normal[1] * along[2] - normal[2] * along[1],
      normal[2] * along[0] - normal[0] * along[2],
      normal[0] * along[1] - normal[1] * along[0],
    ]
    const centre = segment.surfacePoint.map((q, k) => q + normal[k] * SOMATOTOPY_SURFACE_OFFSET_AU)
    const centreDistance = nearestDistance(centre)
    if (centreDistance > CENTRE_TOLERANCE) {
      CENTRE_PROBLEMS.push(`${segment.id} centre ${fmt(centreDistance)} au > ${CENTRE_TOLERANCE}`)
    }
    let worstRim = 0
    for (let j = 0; j < RIM_SAMPLES; j++) {
      const angle = (j / RIM_SAMPLES) * Math.PI * 2
      const point = [0, 1, 2].map((k) => centre[k]
        + along[k] * Math.cos(angle) * segment.size[0] * RIM_FRACTION
        + axisY[k] * Math.sin(angle) * segment.size[1] * RIM_FRACTION)
      worstRim = Math.max(worstRim, nearestDistance(point))
    }
    RIM_STATS.push({ id: segment.id, centreDistance, worstRim })
    if (worstRim > RIM_TOLERANCE) RIM_PROBLEMS.push(`${segment.id} rim ${fmt(worstRim)} au > ${RIM_TOLERANCE}`)
  }
  check(
    CENTRE_PROBLEMS.length === 0,
    `all 16 patch centres are within ${CENTRE_TOLERANCE} au of a ribbon vertex (worst ${fmt(Math.max(...RIM_STATS.map((s) => s.centreDistance)))}, offset ${SOMATOTOPY_SURFACE_OFFSET_AU})`,
    `patch centres too far from the ribbon: ${describe(CENTRE_PROBLEMS)}`,
  )
  const worstRim = RIM_STATS.reduce((worst, s) => (s.worstRim > worst.worstRim ? s : worst), RIM_STATS[0])
  check(
    RIM_PROBLEMS.length === 0,
    `every sampled patch rim point lies within ${RIM_TOLERANCE} au of the ribbon (worst ${fmt(worstRim.worstRim)} au = ${fmt(worstRim.worstRim * geometry.SOMATOTOPY_AU_MM)} mm at ${worstRim.id})`,
    `patch rims leave the ribbon: ${describe(RIM_PROBLEMS)}`,
  )
  console.log(`    rim distance per segment (au): ${RIM_STATS.map((s) => `${s.id.replace('ctx-', '')}:${fmt(s.worstRim, 1)}`).join(' ')}`)
} catch (error) {
  bad(`could not read ${RIBBON_FILE}: ${error instanceof Error ? error.message : String(error)}`)
}

/* --------------------------------------------------------------- C. ordering */
console.log('\n=== C. ORDERING — somatic order monotone along the chosen coordinate ===')

for (const strip of ['m1', 's1']) {
  const list = SOMATOTOPY_SEGMENTS.filter((s) => s.strip === strip)
  const orders = list.map((s) => s.order)
  const expected = [0, 1, 2, 3, 4, 5, 6, 7]
  check(
    orders.join(',') === expected.join(','),
    `${strip}: order is 0..7 in somatotopic sequence (${list.map((s) => s.bodyPart).join(' → ')})`,
    `${strip}: order sequence is ${orders.join(',')} — expected 0..7`,
  )
  const arcGaps = list.slice(1).map((s, i) => s.arcS - list[i].arcS)
  check(
    arcGaps.every((g) => g > 0),
    `${strip}: arcS strictly increasing (min gap ${fmt(Math.min(...arcGaps))} au = ${fmt(Math.min(...arcGaps) * geometry.SOMATOTOPY_AU_MM)} mm)`,
    `${strip}: arcS not strictly increasing — gaps ${arcGaps.map((g) => fmt(g)).join(', ')}`,
  )
  const xGaps = list.slice(1).map((s, i) => s.surfacePoint[0] - list[i].surfacePoint[0])
  check(
    xGaps.every((g) => g > 0),
    `${strip}: canonical x also strictly increasing (min gap ${fmt(Math.min(...xGaps))} au) — medial→lateral in +x`,
    `${strip}: x not strictly increasing — gaps ${xGaps.map((g) => fmt(g)).join(', ')}`,
  )
  console.log(`    arcS  ${list.map((s) => `${s.bodyPart}:${fmt(s.arcS, 1)}`).join('  ')}`)
  console.log(`    gaps  ${arcGaps.map((g) => fmt(g, 1)).join('  ')}      x gaps ${xGaps.map((g) => fmt(g, 1)).join('  ')}`)
  const residuals = list.map((s) => s.residual).slice().sort((a, b) => a - b)
  console.log(`    probe residual: min ${fmt(residuals[0])} · median ${fmt(residuals[Math.floor(residuals.length / 2)])} · max ${fmt(residuals[residuals.length - 1])} au`)
}

/* ---------------------------------------------------------------- D. pairing */
console.log('\n=== D. PAIRING — every body part has exactly one M1 and one S1 segment ===')

let pairedParts = 0
for (const part of SOMATOTOPY_BODY_PARTS) {
  const pair = somatotopySegmentsForBodyPart(part)
  const m1 = pair.filter((s) => s.strip === 'm1')
  const s1 = pair.filter((s) => s.strip === 's1')
  const good = pair.length === 2 && m1.length === 1 && s1.length === 1 && m1[0].order === s1[0].order
  if (good) pairedParts++
  else bad(`${part}: expected one M1 + one S1 with the same order, got ${pair.map((s) => `${s.id}(order ${s.order})`).join(', ') || 'none'}`)
  if (good) {
    const d = [0, 1, 2].map((i) => s1[0].surfacePoint[i] - m1[0].surfacePoint[i])
    console.log(
      `    ${part.padEnd(7)} ctx-m1-${part} (order ${m1[0].order}) ↔ ctx-s1-${part} (order ${s1[0].order})`
      + ` · posterior offset ${vec(d)} · |d| ${fmt(Math.hypot(...d))} au (${fmt(Math.hypot(...d) * geometry.SOMATOTOPY_AU_MM)} mm)`,
    )
  }
}
check(pairedParts === 8, `M1/S1 pairing 8/8 by body part`, `only ${pairedParts}/8 body parts are correctly paired`)
const counterpartFails = SOMATOTOPY_SEGMENTS.filter((segment) => {
  const other = segment.strip === 'm1' ? 's1' : 'm1'
  return !SOMATOTOPY_SEGMENTS.some((s) => s.strip === other && s.bodyPart === segment.bodyPart)
})
check(counterpartFails.length === 0, 'every segment has a counterpart of the same body part on the other strip', `segments without a counterpart: ${counterpartFails.map((s) => s.id).join(', ')}`)

/* --------------------------------------------------------------- E. honesty */
console.log('\n=== E. HONESTY — the contextNote states what was measured ===')

const NOTE_PROBLEMS = []
const NOTE_TERMS = [
  'PLACEMENT IS SCHEMATIC ON THE DERIVED ctx-hemisphere-l RIBBON',
  '.dsh-scratch/somatotopy-probe7b.mjs',
  'residual',
  'au',
]
for (const segment of SOMATOTOPY_SEGMENTS) {
  const record = recordById.get(segment.id)
  if (!record) { NOTE_PROBLEMS.push(`${segment.id} has no record`); continue }
  const note = record.contextNote
  if (typeof note !== 'string' || note.length < 200) { NOTE_PROBLEMS.push(`${segment.id} contextNote missing or short (${typeof note === 'string' ? note.length : 'n/a'} chars)`); continue }
  for (const term of NOTE_TERMS) if (!note.includes(term)) NOTE_PROBLEMS.push(`${segment.id} contextNote lacks "${term}"`)
  if (!note.includes(fmt(segment.residual))) NOTE_PROBLEMS.push(`${segment.id} contextNote does not quote its own residual ${fmt(segment.residual)}`)
  if (!note.includes(`ctx-${segment.strip === 'm1' ? 's1' : 'm1'}-${segment.bodyPart}`)) NOTE_PROBLEMS.push(`${segment.id} contextNote does not name its counterpart`)
}
check(
  NOTE_PROBLEMS.length === 0,
  'all 16 contextNotes: "schematic on the derived … ribbon", the probe command, and the measured residual',
  `contextNote problems: ${describe(NOTE_PROBLEMS, 4)}`,
)
check(
  SOMATOTOPY_METHOD_NOTE.includes('DERIVED') && /schematic/i.test(SOMATOTOPY_METHOD_NOTE) && SOMATOTOPY_METHOD_NOTE.includes('residual'),
  'the shared SOMATOTOPY_METHOD_NOTE states the schematic-on-DERIVED-ribbon limit and the residual range',
  'SOMATOTOPY_METHOD_NOTE does not carry the limit statement',
)

/* ---------------------------------------------------------------- F. colours */
console.log('\n=== F. COLOURS — one ramp, reproduced in the registry ===')

const COLOUR_PROBLEMS = []
for (const segment of SOMATOTOPY_SEGMENTS) {
  const fromRamp = somatotopyColor(segment)
  const inTable = SOMATOTOPY_SEGMENT_COLORS[segment.strip][segment.bodyPart]
  const record = recordById.get(segment.id)
  const entry = taxonomyById.get(segment.id)
  if (fromRamp !== inTable) COLOUR_PROBLEMS.push(`${segment.id} ramp ${fromRamp} ≠ table ${inTable}`)
  if (record && record.color !== fromRamp) COLOUR_PROBLEMS.push(`${segment.id} record colour ${record.color} ≠ ramp ${fromRamp}`)
  if (entry && entry.color !== fromRamp) COLOUR_PROBLEMS.push(`${segment.id} registry colour ${entry.color} ≠ ramp ${fromRamp}`)
}
check(COLOUR_PROBLEMS.length === 0, 'all 16 record + registry colours are the ramp value (they cannot drift)', `colour problems: ${describe(COLOUR_PROBLEMS, 4)}`)
check(
  SOMATOTOPY_RAMP_T.toe === 1 && SOMATOTOPY_RAMP_T.face === 0 && SOMATOTOPY_RAMP_T.leg > SOMATOTOPY_RAMP_T.trunk && SOMATOTOPY_RAMP_T.trunk > SOMATOTOPY_RAMP_T.arm,
  `the ramp runs face(${SOMATOTOPY_RAMP_T.face}) → hand(${SOMATOTOPY_RAMP_T.hand}) → arm(${SOMATOTOPY_RAMP_T.arm}) → trunk(${SOMATOTOPY_RAMP_T.trunk}) → leg(${SOMATOTOPY_RAMP_T.leg}) → toe(${SOMATOTOPY_RAMP_T.toe})`,
  `rampT is not the declared face→…→toe ordering: ${JSON.stringify(SOMATOTOPY_RAMP_T)}`,
)
console.log(`    anchors M1 ${SOMATOTOPY_RAMP_ANCHORS.m1[0]} → ${SOMATOTOPY_RAMP_ANCHORS.m1[1]} · S1 ${SOMATOTOPY_RAMP_ANCHORS.s1[0]} → ${SOMATOTOPY_RAMP_ANCHORS.s1[1]}`)
console.log(`    M1 ramp: ${SOMATOTOPY_BODY_PARTS.map((p) => `${p}:${SOMATOTOPY_SEGMENT_COLORS.m1[p]}`).join(' ')}`)

/* ------------------------------------------------------- G. overlay wiring */
console.log('\n=== G. OVERLAY WIRING — read as source text (no browser in this sandbox) ===')

const overlaySource = readFileSync(OVERLAY_FILE, 'utf8')
const sceneSource = readFileSync(SCENE_FILE, 'utf8')

check(/export default function SomatotopyOverlay/.test(overlaySource), 'SomatotopyOverlay.tsx exports a default component (no props)', 'SomatotopyOverlay.tsx has no default export')
check(/regions\.has\('telencephalon'\)\s*&&\s*kinds\.has\('context'\)/.test(overlaySource), "the overlay is gated on regions.has('telencephalon') && kinds.has('context')", 'the overlay has no telencephalon+context gate')
check(/hidden\.has\(/.test(overlaySource), 'the overlay honours the preset `hidden` set', 'the overlay ignores the preset `hidden` set')
check(/highlightIdSet/.test(overlaySource), 'the overlay uses the shared highlightIdSet (selecting ctx-m1-hand dims the rest)', 'the overlay does not use highlightIdSet')
check(/PATCH_OPACITY_DIMMED = 0\.15/.test(overlaySource), 'the dim opacity is the NucleusMesh 0.15 value', 'the dim opacity is not 0.15')
check(/normalize\(\)/.test(overlaySource) && /Quaternion/.test(overlaySource), 'each patch is oriented by the measured normal (quaternion), not axis-aligned', 'no normal→quaternion orientation in the overlay')
check(/makeAnatomyMaterial/.test(overlaySource), 'the overlay reuses the central material factory', 'the overlay does not use the shared material factory')
check(/<SomatotopyOverlay\s*\/>/.test(sceneSource), 'SceneLayers mounts <SomatotopyOverlay />', 'SceneLayers does not mount the overlay')
check(/SOMATOTOPY_RECORD_IDS\.has\(record\.id\)/.test(sceneSource), 'SceneLayers filters SOMATOTOPY_RECORD_IDS out of the structure pass (no double draw)', 'SceneLayers does not filter the somatotopy ids')
check(/from '\.\.\/\.\.\/geometry\/somatotopy'/.test(sceneSource), 'SceneLayers imports the shared table from src/geometry/somatotopy', 'SceneLayers does not import the somatotopy table')

// The tree order hook the acceptance criterion needs. load.ts is NOT in this
// task's write scope, so the verifier asserts the INTERFACE is correct and says
// out loud whether the call site has been wired yet.
const rankProblems = []
for (const strip of ['m1', 's1']) {
  const list = SOMATOTOPY_SEGMENTS.filter((s) => s.strip === strip)
  const stripRanks = list.map((s) => geometry.somatotopyTreeOrder(s.id))
  if (stripRanks.join(',') !== '0,1,2,3,4,5,6,7') rankProblems.push(`${strip}: ranks ${stripRanks.join(',')}`)
}
check(
  rankProblems.length === 0,
  `somatotopyTreeOrder ranks each strip's 8 leaves 0..7 in somatotopic order (${SOMATOTOPY_SEGMENTS.filter((s) => s.strip === 'm1').map((s) => geometry.somatotopyTreeOrder(s.id)).join(', ')})`,
  `somatotopyTreeOrder rank problems: ${rankProblems.join('; ')}`,
)
check(
  geometry.somatotopyTreeOrder('ctx-a1') === Number.POSITIVE_INFINITY && geometry.somatotopyTreeOrder('nuc-va') === Number.POSITIVE_INFINITY,
  'somatotopyTreeOrder returns +∞ for every other entry (no existing subdivision order changes)',
  'somatotopyTreeOrder returns a finite rank for a non-somatotopy id',
)

// What the tree ACTUALLY shows today: load.ts builds each leaf's `children` in
// encounter order from this file, so the serial order of the 16 entries in
// taxonomy.json is the order they appear under ctx-m1 / ctx-s1.
const childrenOf = new Map([['ctx-m1', []], ['ctx-s1', []]])
for (const entry of taxonomy) {
  if (entry.parent === 'ctx-m1' || entry.parent === 'ctx-s1') childrenOf.get(entry.parent).push(entry.id)
}
for (const parent of ['ctx-m1', 'ctx-s1']) {
  const children = childrenOf.get(parent)
  const expectedOrder = SOMATOTOPY_SEGMENTS.filter((s) => s.id.startsWith(`${parent}-`)).map((s) => s.id)
  check(
    children.length === 8 && children.join(',') === expectedOrder.join(','),
    `${parent}: the tree's 8 children are emitted in somatotopic order (${children.map((id) => id.replace(`${parent}-`, '')).join(' → ')})`,
    `${parent}: children are [${children.join(', ')}], expected the somatotopic order [${expectedOrder.join(', ')}]`,
  )
}

const loadSource = readFileSync('src/data/load.ts', 'utf8')
if (/somatotopyTreeOrder/.test(loadSource)) {
  ok('src/data/load.ts wires somatotopyTreeOrder into the tree child sort')
} else {
  console.log('  info src/data/load.ts does NOT call somatotopyTreeOrder — the tree relies on the committed')
  console.log('       serial order of the 16 registry entries (asserted above). load.ts is outside this task\'s')
  console.log('       write scope; the one-line call site is stated in the task report.')
}

/* ---------------------------------------------------------------- verdict */
console.log('\n==============================================================')
console.log(` ${passed} passed · ${failures.length} failed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const failure of failures) console.log(`  - ${failure}`)
}
console.log('==============================================================')
process.exit(failures.length === 0 ? 0 : 1)
