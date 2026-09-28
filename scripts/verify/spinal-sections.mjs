/**
 * v20 gate — SECTIONS: the 2D live section paints the spinal cord from the
 * SAME procedural geometry the 3D scene draws, and the spinal teaching points
 * survive the slice.
 *
 * Run from the repo root:  node scripts/verify/spinal-sections.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:spinal-sections": "node scripts/verify/spinal-sections.mjs"
 *  — package.json is the integrator's file, so it is named here, not edited.)
 *
 * ── WHAT THIS GATE PROVES, AND HOW ────────────────────────────────────────
 * It EXECUTES the shipped modules (the same node:module `registerHooks`
 * loader `vessel-render.mjs` uses) and hands the SHIPPED worker registry to
 * the SHIPPED slicer (`partBounds` / `boundsMayCut` / `extractContours` — the
 * functions `contourWorker` itself calls). Every loop count is printed, so no
 * assertion can pass by not running.
 *
 *   1. ONE SOURCE OF TRUTH. `registrySpinalParts()` (what the 2D worker
 *      receives) IS `spinalGeometry(slug)` (what SceneLayers mounts), compared
 *      vertex by vertex and index by index — including the `#mirror` twins.
 *   2. THE SECTION PAINTS AT SPINAL LEVELS. At C5 (−112), T8 (−249),
 *      L3 (−325), S3 (−360): gray H loops, white-funiculus loops and the
 *      central-canal loop are extracted from the real slicer and counted.
 *   3. THE TEACHING POINTS SURVIVE THE SLICE. Cuneatus: present at C5/T6,
 *      ABSENT at T8/L3/S3 (T6-and-above). Lateral horn + IML: present at T8,
 *      ABSENT at C5/L3/S3 (T1–L2). Clarke: at T8, not at C5. Sacral
 *      parasympathetic: at S3, not at C5. Root-entry zone: the dorsal/ventral
 *      root stubs cross their own segment plane. Segment band: its own level.
 *   4. SAGITTAL IS CONTINUOUS ACROSS y = −50. The cord-shell slice at x = 0
 *      covers y −383…−50 with no gap > 2.5 au, and the medulla envelope slice
 *      overlaps the junction.
 *   5. GRAY-OVER-WHITE DRAW ORDER. Buckets: gray → 'nucleus' (painted last),
 *      canal → 'ventricle', shell/funiculi/roots/bands → 'context', and
 *      SECTION_KIND_ORDER paints context → ventricle → nucleus.
 *   6. THE MOUNT CONTRACT STAYS PINNED. SectionCanvas appends
 *      registryNerveParts → registryVesselParts → registrySpinalParts (in
 *      that order, all three lines present), `partsForCanvas()` keeps its
 *      pre-spinal count identity, and the 2D visibility formula and the 3D
 *      `layersAdmit` decision agree on every spinal part across four layer
 *      states.
 *
 * ── WHAT ONLY THE ORCHESTRATOR CAN CONFIRM (Chrome cannot run in this
 *    sandbox — no claim below is made by this gate) ────────────────────────
 *   • that the canvas actually PAINTS the extracted loops (colors, order);
 *   • that the PiP shows the same sections;
 *   • that the sliders reach the spinal levels in the running app.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')

/* ==================================================================== *
 *  MODULE LOADING — the repo's convention (see the file header)
 * ==================================================================== */

function resolveModule(specifier, fromFile) {
  const directory = dirname(fromFile)
  for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
    const candidate = resolve(directory, specifier + extension)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

class Path2DStub {
  moveTo() {}
  lineTo() {}
  closePath() {}
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(specifier) || specifier.endsWith('?url')) {
      return { url: `dsh-asset:${specifier}`, shortCircuit: true }
    }
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const candidate = resolveModule(specifier, base)
      if (candidate !== null) return { url: pathToFileURL(candidate).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('dsh-asset:')) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (!url.startsWith('file:')) return nextLoad(url, context)
    if (url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: `export default ${JSON.stringify(parsed)}`, shortCircuit: true }
    }
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(url)) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (!/\.(ts|tsx)$/.test(url)) return nextLoad(url, context)
    const filePath = fileURLToPath(url)
    let source = readFileSync(filePath, 'utf8')
    source = source.replace(
      /import\.meta\.glob\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\}\s*,?\s*\)/g,
      (whole, pattern, options) => {
        const directory = resolve(filePath, '..')
        const lastSlash = pattern.lastIndexOf('/')
        const head = pattern.slice(0, lastSlash)
        const recursive = head.includes('**')
        const baseDir = resolve(directory, head.replace(/\*\*\/?/g, ''))
        const filePattern = pattern.slice(lastSlash + 1)
        if (!existsSync(baseDir)) return '{}'
        const test = new RegExp(`^${filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
        const raw = /\?raw/.test(options)
        const wantedExtension = (filePattern.match(/\*(\.[A-Za-z0-9]+)$/) ?? [])[1]?.toLowerCase() ?? null
        const walk = (dir, prefix) => {
          const out = []
          for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
            if (entry.isDirectory()) {
              if (recursive) out.push(...walk(resolve(dir, entry.name), relative))
              continue
            }
            if (wantedExtension !== null && !entry.name.toLowerCase().endsWith(wantedExtension)) continue
            if (!test.test(entry.name)) continue
            out.push(relative)
          }
          return out
        }
        const entries = walk(baseDir, '').map((relative) => {
          const full = resolve(baseDir, relative)
          const key = `${head.replace(/\*\*\/?/g, '')}${relative}`
          if (!raw && !/eager:\s*true/.test(options)) {
            return `${JSON.stringify(key)}: () => Promise.resolve(${JSON.stringify(relative)})`
          }
          const value = raw ? readFileSync(full, 'utf8') : JSON.parse(readFileSync(full, 'utf8'))
          return `${JSON.stringify(key)}: ${JSON.stringify(value)}`
        })
        return `{ ${entries.join(', ')} }`
      },
    )
    const { outputText } = ts.transpileModule(source, {
      fileName: url,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        isolatedModules: true,
      },
    })
    return { format: 'module', source: outputText, shortCircuit: true }
  },
})

globalThis.Path2D = Path2DStub

/* ==================================================================== *
 *  assertions
 * ==================================================================== */

let checks = 0
const failures = []

function assert(condition, label, detail = '') {
  checks += 1
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function ms(label, value, extra = '') {
  console.log(`  ${String(label).padEnd(58)} ${String(value).padStart(10)}  ${extra}`)
}

/* ==================================================================== *
 *  SHIPPED MODULES
 * ==================================================================== */

const moduleUrl = (rel) => pathToFileURL(resolve(ROOT, rel)).href
const contours = await import(moduleUrl('src/components/section/contours.ts'))
const sectionAssets = await import(moduleUrl('src/components/section/sectionAssets.ts'))
const partsModule = await import(moduleUrl('src/geometry/spinalParts.ts'))
const cordModule = await import(moduleUrl('src/geometry/spinalCord.ts'))
const sceneLayers = await import(moduleUrl('src/components/viewer3d/SceneLayers.tsx'))

const { extractContours, partBounds, boundsMayCut, sliceToSegments } = contours
const {
  SECTION_KIND_ORDER, SECTION_PARTS, SECTION_NERVE_PARTS, SECTION_VESSEL_PARTS,
  partsForCanvas, SECTION_SPINAL_PARTS, spinalPartsForCanvas, registrySpinalParts,
} = sectionAssets
const { SPINAL_PARTS, spinalGeometry, spinalRecordPart } = partsModule
const { SPINAL_REGION, CORD_TOP_Y, CORD_TIP_Y, T1_Y, T6_Y, L2_Y, C8_Y, L3_Y, S2_Y, S4_Y } = cordModule
const { layersAdmit, spinalPartKind, isSpinalStaticBody } = sceneLayers

/** Strip the mirror suffix for classification. */
const baseSlug = (slug) => slug.replace(/#mirror$/, '')

/** Slice one registry part with the SHIPPED worker slicer. */
function slicePart(part, plane) {
  const bounds = partBounds(part.positions)
  if (!boundsMayCut(bounds, plane)) return { loops: [], cut: false, open: 0 }
  const result = extractContours(part.positions, part.indices, plane)
  return { loops: result.loops, cut: true, open: result.openChainCount }
}

/** Total loops over all registry parts whose base slug matches a predicate. */
function loopCount(registry, plane, predicate) {
  let total = 0
  for (const part of registry) {
    if (!predicate(baseSlug(part.slug))) continue
    total += slicePart(part, plane).loops.length
  }
  return total
}

/* ==================================================================== *
 *  1. ONE SOURCE OF TRUTH — registry == 3D geometry
 * ==================================================================== */

console.log('\n── 1. the 2D registry IS the 3D geometry ─────────────────────────')
const registry = registrySpinalParts()
ms('registrySpinalParts() count', registry.length)
const registrySlugs = registry.map((p) => p.slug)
assert(new Set(registrySlugs).size === registrySlugs.length, 'registry slugs unique')
assert(
  registry.length === SPINAL_PARTS.length + SPINAL_PARTS.filter((p) => p.paired).length,
  'registry = parts + paired mirror twins',
  `${registry.length} vs ${SPINAL_PARTS.length} parts`,
)
let identityBreaks = 0
for (const part of registry) {
  const geometry = spinalGeometry(part.slug)
  if (geometry === null) {
    identityBreaks += 1
    failures.push(`registry part ${part.slug} has no 3D geometry`)
    continue
  }
  const pos = geometry.attributes.position.array
  const idx = geometry.index.array
  let same = pos.length === part.positions.length && idx.length === part.indices.length
  if (same) {
    for (let i = 0; i < pos.length; i += 1) {
      if (Number(pos[i]) !== Number(part.positions[i])) { same = false; break }
    }
  }
  if (same) {
    for (let i = 0; i < idx.length; i += 1) {
      if (Number(idx[i]) !== Number(part.indices[i])) { same = false; break }
    }
  }
  if (!same) {
    identityBreaks += 1
    console.log(`  FAIL registry part ${part.slug} differs from spinalGeometry (pos ${pos.length}/${part.positions.length}, idx ${idx.length}/${part.indices.length})`)
    failures.push(`registry part ${part.slug} ≠ 3D geometry`)
  }
  checks += 1
}
assert(identityBreaks === 0, `all ${registry.length} registry parts are element-wise the 3D geometry`, `${identityBreaks} differ`)

/* ==================================================================== *
 *  2–3. THE SECTION PAINTS AT SPINAL LEVELS + TEACHING POINTS
 * ==================================================================== */

console.log('\n── 2. transverse slices at C5 / T8 / L3 / S3 ─────────────────────')
const isGray = (s) => s === 'spinal-dorsal-horn' || s === 'spinal-ventral-horn' || s === 'spinal-gray-commissure' || s === 'spinal-lateral-horn' || s.startsWith('spinal-nucleus-')
const isWhite = (s) => s === 'spinal-gracilis' || s === 'spinal-cuneatus' || s === 'spinal-lateral-funiculus' || s === 'spinal-anterior-funiculus'
const isCanal = (s) => s === 'spinal-central-canal'

for (const [label, y] of [['C5', -112], ['T8', -249], ['L3', -325], ['S3', -360]]) {
  const plane = { axis: 'y', value: y }
  const gray = loopCount(registry, plane, isGray)
  const white = loopCount(registry, plane, isWhite)
  const canal = loopCount(registry, plane, isCanal)
  const cordLoops = loopCount(registry, plane, (s) => s === 'spinal-cord-surface' || s.startsWith('spinal-segment-'))
  ms(`${label} gray / white / canal / shell loops`, `${gray} / ${white} / ${canal} / ${cordLoops}`)
  assert(gray >= 3, `${label}: gray H loops painted (≥ 3)`, `got ${gray}`)
  assert(white >= 3, `${label}: white funiculus loops painted (≥ 3)`, `got ${white}`)
  assert(canal >= 1, `${label}: central-canal loop painted`, `got ${canal}`)
  assert(cordLoops >= 1, `${label}: cord shell / segment band loop painted`, `got ${cordLoops}`)
}

console.log('\n── 3. the teaching points survive the slice ──────────────────────')
// Cuneatus: T6-and-above only.
const cuneAt = (y) => loopCount(registry, { axis: 'y', value: y }, (s) => s === 'spinal-cuneatus')
ms('cuneatus loops @ C5 / T6 / T8 / L3 / S3', `${cuneAt(-112)} / ${cuneAt(-226)} / ${cuneAt(-249)} / ${cuneAt(-325)} / ${cuneAt(-360)}`)
assert(cuneAt(-112) >= 1 && cuneAt(-226) >= 1, 'cuneatus painted at C5 and T6')
assert(cuneAt(-249) === 0 && cuneAt(-325) === 0 && cuneAt(-360) === 0, 'cuneatus ABSENT below T6 (teaching point)')
// Lateral horn + IML: T1–L2 only.
const lhAt = (y) => loopCount(registry, { axis: 'y', value: y }, (s) => s === 'spinal-lateral-horn')
const imlAt = (y) => loopCount(registry, { axis: 'y', value: y }, (s) => s === 'spinal-nucleus-intermediolateral')
ms('lateral-horn loops @ C5 / T8 / L3 / S3', `${lhAt(-112)} / ${lhAt(-249)} / ${lhAt(-325)} / ${lhAt(-360)}`)
ms('IML loops @ C5 / T8 / L3 / S3', `${imlAt(-112)} / ${imlAt(-249)} / ${imlAt(-325)} / ${imlAt(-360)}`)
assert(lhAt(-249) >= 1 && imlAt(-249) >= 1, 'lateral horn + IML painted at T8')
assert(lhAt(-112) === 0 && lhAt(-325) === 0 && lhAt(-360) === 0, 'lateral horn ABSENT at C5/L3/S3 (T1–L2)')
assert(imlAt(-112) === 0 && imlAt(-325) === 0 && imlAt(-360) === 0, 'IML ABSENT at C5/L3/S3 (T1–L2)')
// Clarke (C8–L3) and sacral parasympathetic (S2–S4).
const clarkesAt = (y) => loopCount(registry, { axis: 'y', value: y }, (s) => s === 'spinal-nucleus-clarkes-nucleus')
const sacralAt = (y) => loopCount(registry, { axis: 'y', value: y }, (s) => s === 'spinal-nucleus-sacral-parasympathetic')
ms('Clarke loops @ C5 / T8 / L3', `${clarkesAt(-112)} / ${clarkesAt(-249)} / ${clarkesAt(-325)}`)
ms('sacral parasym. loops @ C5 / L3 / S3', `${sacralAt(-112)} / ${sacralAt(-325)} / ${sacralAt(-360)}`)
assert(clarkesAt(-249) >= 1, 'Clarke painted at T8')
assert(clarkesAt(-112) === 0, 'Clarke ABSENT at C5 (C8–L3)')
assert(sacralAt(-360) >= 1, 'sacral parasympathetic painted at S3')
assert(sacralAt(-112) === 0 && sacralAt(-325) === 0, 'sacral parasympathetic ABSENT at C5 and L3 (S2–S4)')
// Root entry zone: dorsal/ventral stubs cross their own segment plane.
const rootsAt = (y, role) => loopCount(registry, { axis: 'y', value: y }, (s) => s === `spinal-${role}-roots`)
ms('dorsal-root loops @ C5−0.7 / ventral @ C5+0.7', `${rootsAt(-112.7, 'dorsal')} / ${rootsAt(-111.3, 'ventral')}`)
assert(rootsAt(-112.7, 'dorsal') >= 1, 'dorsal root entry zone painted at its segment')
assert(rootsAt(-111.3, 'ventral') >= 1, 'ventral root entry zone painted at its segment')
// Segment band at its own level.
const bandAt = (y) => loopCount(registry, { axis: 'y', value: y }, (s) => s === 'spinal-segment-c5')
ms('C5 segment-band loops @ C5', bandAt(-112))
assert(bandAt(-112) >= 1, 'segment band painted at its own level')

/* ==================================================================== *
 *  4. SAGITTAL CONTINUITY ACROSS y = −50
 * ==================================================================== */

console.log('\n── 4. sagittal profile continuous across y = −50 ─────────────────')
const sagittal = { axis: 'x', value: 0 }
// PLANE_FRAME x → [z, y]: segment coordinate 1 (v) is world y. Coverage is
// measured from the RAW slice segments — open chains included — so continuity
// holds even where a wall runs out an uncapped end (the medulla envelope is
// not ours to cap). The loop assert below separately proves the cord itself
// closes into paintable contours.
function vCoverage(registry, plane, predicate) {
  const intervals = []
  for (const part of registry) {
    if (!predicate(baseSlug(part.slug))) continue
    if (!boundsMayCut(partBounds(part.positions), plane)) continue
    for (const seg of sliceToSegments(part.positions, part.indices, plane)) {
      intervals.push([Math.min(seg.a[1], seg.b[1]), Math.max(seg.a[1], seg.b[1])])
    }
  }
  intervals.sort((a, b) => a[0] - b[0])
  let gap = 0
  let covered = null
  for (const [lo, hi] of intervals) {
    if (covered === null) { covered = [lo, hi]; continue }
    if (lo > covered[1] + gap) gap = lo - covered[1]
    if (hi > covered[1]) covered[1] = hi
  }
  return { intervals, gap, covered }
}
function loopIntervals(registry, plane, predicate) {
  const intervals = []
  for (const part of registry) {
    if (!predicate(baseSlug(part.slug))) continue
    for (const loop of slicePart(part, plane).loops) {
      let lo = Infinity
      let hi = -Infinity
      for (let i = 1; i < loop.length; i += 2) {
        if (loop[i] < lo) lo = loop[i]
        if (loop[i] > hi) hi = loop[i]
      }
      if (Number.isFinite(lo)) intervals.push([lo, hi])
    }
  }
  return intervals
}
const isCordBody = (s) => s === 'spinal-cord-surface' || s === 'spinal-conus' || s === 'spinal-filum'
const cordSag = vCoverage(registry, sagittal, isCordBody)
const cordLoopsSag = loopIntervals(registry, sagittal, isCordBody)
ms('cord sagittal raw segments', cordSag.intervals.length)
ms('cord sagittal closed loops', cordLoopsSag.length)
ms('cord sagittal y coverage', cordSag.covered ? `${cordSag.covered[0].toFixed(1)} … ${cordSag.covered[1].toFixed(1)}` : 'none')
ms('cord sagittal max gap (au)', cordSag.gap.toFixed(2))
assert(cordLoopsSag.length >= 1, 'cord shell yields CLOSED sagittal loops at x = 0 (the canvas can paint them)')
assert(
  cordSag.covered !== null && cordSag.covered[0] <= CORD_TIP_Y + 1 && cordSag.covered[1] >= CORD_TOP_Y - 1,
  'cord sagittal profile spans the full y −383 … −50',
  cordSag.covered ? `${cordSag.covered[0].toFixed(1)} … ${cordSag.covered[1].toFixed(1)}` : 'none',
)
assert(cordSag.gap <= 2.5, 'cord sagittal profile has no gap > 2.5 au (continuous across y = −50)', `gap ${cordSag.gap.toFixed(2)}`)
// The medulla envelope overlaps the junction from the brainstem side.
const envelopeModule = await import(moduleUrl('src/geometry/envelope.ts'))
const medullaRaw = envelopeModule.createMedullaEnvelope()
const medulla = medullaRaw && medullaRaw.isBufferGeometry ? medullaRaw : medullaRaw?.geometry
if (medulla) {
  const pos = medulla.attributes.position.array
  const idx = medulla.index ? medulla.index.array : new Uint32Array([])
  const medRegistry = [{ slug: 'medulla', positions: pos, indices: idx }]
  const medSag = vCoverage(medRegistry, sagittal, () => true)
  ms('medulla sagittal raw segments', medSag.intervals.length)
  ms('medulla sagittal y coverage', medSag.covered ? `${medSag.covered[0].toFixed(1)} … ${medSag.covered[1].toFixed(1)}` : 'none')
  assert(
    medSag.covered !== null && medSag.covered[0] <= CORD_TOP_Y + 2,
    'medulla envelope slice reaches the junction (overlap with cord top)',
    medSag.covered ? `y-min ${medSag.covered[0].toFixed(1)}` : 'no segments',
  )
}

/* ==================================================================== *
 *  5. GRAY-OVER-WHITE DRAW ORDER
 * ==================================================================== */

console.log('\n── 5. draw order + buckets (gray over white) ─────────────────────')
ms('SECTION_KIND_ORDER', SECTION_KIND_ORDER.join(' → '))
assert(
  SECTION_KIND_ORDER.indexOf('context') < SECTION_KIND_ORDER.indexOf('ventricle') &&
  SECTION_KIND_ORDER.indexOf('ventricle') < SECTION_KIND_ORDER.indexOf('nucleus'),
  'context → ventricle → nucleus paint order (gray on top of white)',
)
let bucketProblems = 0
for (const part of SPINAL_PARTS) {
  const slug = part.slug
  const expected = isGray(slug) ? 'nucleus' : isCanal(slug) ? 'ventricle' : 'context'
  if (part.bucket !== expected) {
    bucketProblems += 1
    console.log(`  FAIL ${slug} bucket ${part.bucket} (expected ${expected})`)
    failures.push(`${slug} bucket ${part.bucket} ≠ ${expected}`)
  }
  if (!SECTION_KIND_ORDER.includes(part.bucket)) {
    bucketProblems += 1
    failures.push(`${slug} bucket ${part.bucket} not in SECTION_KIND_ORDER`)
  }
  checks += 1
}
assert(bucketProblems === 0, 'every spinal part carries its histology bucket', `${bucketProblems} wrong`)

/* ==================================================================== *
 *  6. MOUNT CONTRACT + 2D/3D VISIBILITY AGREEMENT
 * ==================================================================== */

console.log('\n── 6. SectionCanvas pins + visibility agreement ─────────────────')
const canvasSrc = readFileSync(resolve(ROOT, 'src/components/section/SectionCanvas.tsx'), 'utf8')
const nerveIdx = canvasSrc.indexOf('registryParts.push(...registryNerveParts())')
const vesselIdx = canvasSrc.indexOf('registryParts.push(...registryVesselParts())')
const spinalIdx = canvasSrc.indexOf('registryParts.push(...registrySpinalParts())')
ms('registryParts.push order (nerve/vessel/spinal)', `${nerveIdx} / ${vesselIdx} / ${spinalIdx}`)
assert(nerveIdx >= 0, 'registryNerveParts() append line intact (pinned)')
assert(vesselIdx > nerveIdx, 'registryVesselParts() appends AFTER the nerve line (pinned order)')
assert(spinalIdx > vesselIdx, 'registrySpinalParts() appends AFTER the vessel line (pinned order)')
assert(canvasSrc.includes('const visible = partsForCanvas().filter('), 'pinned visible-list line intact')
assert(canvasSrc.includes('spinalPartsForCanvas()'), 'SectionCanvas appends the spinal metas to the painted list')
// The pre-spinal count identity must stay true (vessel-render/area-toggles pin it).
assert(
  partsForCanvas().length === SECTION_PARTS.length + SECTION_NERVE_PARTS.length + SECTION_VESSEL_PARTS.length,
  'partsForCanvas() keeps its pre-spinal count identity',
  `${partsForCanvas().length} = ${SECTION_PARTS.length} + ${SECTION_NERVE_PARTS.length} + ${SECTION_VESSEL_PARTS.length}`,
)
ms('SECTION_SPINAL_PARTS / spinalPartsForCanvas()', `${SECTION_SPINAL_PARTS.length} / ${spinalPartsForCanvas().length}`)
assert(SECTION_SPINAL_PARTS.length === SPINAL_PARTS.length, 'every part has a section meta')
assert(spinalPartsForCanvas().length === SPINAL_PARTS.length, 'spinalPartsForCanvas() covers every part')

// isPartVisible (2D) vs layersAdmit + spinalPartKind (3D) across four states.
const isPartVisibleSrc = canvasSrc.slice(canvasSrc.indexOf('function isPartVisible'))
assert(isPartVisibleSrc.slice(0, 600).includes('layers.regions.has'), 'isPartVisible reads layers.regions (the 2D decision)')
let visibilityBreaks = 0
for (const part of SPINAL_PARTS) {
  const meta = SECTION_SPINAL_PARTS.find((m) => m.slug === part.slug)
  if (meta === undefined) { visibilityBreaks += 1; continue }
  if (meta.region !== SPINAL_REGION) {
    visibilityBreaks += 1
    console.log(`  FAIL ${part.slug} meta.region = ${meta.region} (expected spinal)`)
    failures.push(`${part.slug} meta.region ≠ spinal`)
  }
  if (meta.taxonomyKind !== spinalPartKind(part)) {
    visibilityBreaks += 1
    console.log(`  FAIL ${part.slug} meta.taxonomyKind = ${meta.taxonomyKind} ≠ 3D spinalPartKind ${spinalPartKind(part)}`)
    failures.push(`${part.slug} taxonomyKind diverges from spinalPartKind`)
  }
  const states = [
    { regions: ['spinal'], kinds: [meta.taxonomyKind] },
    { regions: [], kinds: [meta.taxonomyKind] },
    { regions: ['spinal'], kinds: [] },
    { regions: [], kinds: [] },
  ]
  for (const state of states) {
    const layers = {
      regions: new Set(state.regions),
      kinds: new Set(state.kinds),
      hidden: new Set(),
    }
    // The 2D formula (SectionCanvas.isPartVisible) reduced to its two reads.
    const twoD = (meta.region === null || layers.regions.has(meta.region)) &&
      layers.kinds.has(meta.taxonomyKind ?? meta.kind)
    const threeD = layersAdmit(layers, SPINAL_REGION, spinalPartKind(part))
    if (twoD !== threeD) {
      visibilityBreaks += 1
      console.log(`  FAIL ${part.slug} visibility diverges: 2D ${twoD} vs 3D ${threeD} (regions ${state.regions}, kinds ${state.kinds})`)
      failures.push(`${part.slug} 2D/3D visibility divergence`)
    }
    checks += 1
  }
  checks += 2
}
assert(visibilityBreaks === 0, '2D isPartVisible and 3D layersAdmit agree on every spinal part (4 states)', `${visibilityBreaks} divergence(s)`)
assert(isSpinalStaticBody('ctx-spinal-cord') === true, 'isSpinalStaticBody maps the cord record')
assert(isSpinalStaticBody('tract-fasciculus-gracilis') === false, 'isSpinalStaticBody refuses the MEDULLA gracilis record')
assert(spinalRecordPart('tract-fasciculus-gracilis') === null, 'spinalRecordPart refuses the MEDULLA gracilis record')

/* ==================================================================== */

console.log(`\n${'─'.repeat(72)}`)
console.log(`spinal-sections: ${checks - failures.length}/${checks} checks passed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const f of failures) console.log(`  • ${f}`)
  process.exitCode = 1
} else {
  console.log('\nAll section assertions green. NOT claimed here (no browser): that')
  console.log('the canvas PAINTS the extracted loops, that the PiP shows them, or that')
  console.log('the sliders reach the spinal levels in the running app.')
}
