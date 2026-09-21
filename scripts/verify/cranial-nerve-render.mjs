/**
 * v14 gate — RENDER: the twelve cranial nerves as tubes in 3D, as PROCEDURAL
 * parts in the 2D live section / PiP, with no nerve drawing both.
 *
 * Run from the repo root:  node scripts/verify/cranial-nerve-render.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:cranial-nerve-render": "node scripts/verify/cranial-nerve-render.mjs"
 *  — package.json is the integrator's file, so it is named here, not edited.)
 *
 * ── WHAT THIS GATE PROVES, AND HOW ────────────────────────────────────────
 * It EXECUTES the shipped modules (never a re-typed copy): the same
 * node:module `registerHooks` loader the repo's other gates use resolves the
 * app's extensionless imports, emulates Vite's `import.meta.glob`, transpiles
 * `.ts`/`.tsx` with the PROJECT'S OWN TypeScript, and answers asset specifiers.
 *
 *   1. ONE TUBE PER NERVE, GATED BY ITS OWN KIND. `SceneLayers` exports the
 *      nerve-course pass (`visibleNerveCourses`); this gate runs the shipped
 *      `isTractVisible` over 35 tracts + 12 courses × four layer states and
 *      prints the four counts. A regression that put the literal 'tract' back
 *      into `isTractVisible` flips the "nerve kind off" row from 0 to 12 shown
 *      and fails here — not in a comment.
 *   2. ONE SECTION REGISTRY PART PER NERVE, and the worker really computes its
 *      contours: `registryNerveParts()` is handed to the shipped
 *      `partBounds` / `boundsMayCut` / `extractContours` — the functions
 *      `contourWorker` itself calls — and per-plane loop counts are printed.
 *   3. NO NERVE RENDERS BOTH a tube and a blob: exactly one of the two bodies
 *      exists for each of the twelve.
 *   4. THE SHARED BUILDER IS SHARED: the 3D tube and the 2D contour come from
 *      one `tubeGeometryFor`, so the section slices the geometry on screen.
 *   5. The payload is untouched: 138 manifest parts, no `nrv-*` GLB on disk.
 *
 * ── WHAT ONLY THE ORCHESTRATOR CAN CONFIRM (Chrome cannot run in this
 *    sandbox — no claim below is made by this gate) ────────────────────────
 *   • that the 3D scene actually PAINTS the twelve tubes (frame renders, the
 *     Systems row's "Cranial nerves" button toggles them on screen, no
 *     console error from the new pass);
 *   • that the live section and the PiP PAINT the nerve contours (this gate
 *     proves the registry part + contours exist and are admissible; it cannot
 *     prove pixels);
 *   • that clicking a nerve tube in 3D and a nerve contour in 2D selects the
 *     same record (`selectStructure(course.id)`);
 *   • frame-time cost of the twelve extra tubes (~17,280 tris).
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

/** SectionCanvas strokes Path2D objects; Node has none and this gate never
 *  paints, so the stub only has to exist for the module to load. */
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
  if (condition) return true
  failures.push(detail === '' ? label : `${label} — ${detail}`)
  return false
}

const fmt = (n, d = 2) => (Number.isFinite(n) ? Number(n).toFixed(d) : String(n))
const pad = (value, width) => String(value).padEnd(width)
const padStart = (value, width) => String(value).padStart(width)
const ms = (label, value, extra = '') =>
  console.log(`  ${pad(label, 30)} ${padStart(value, 6)}${extra === '' ? '' : `   ${extra}`}`)

const SOURCE = {
  sceneLayers: readFileSync(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx'), 'utf8'),
  tractTube: readFileSync(resolve(ROOT, 'src/components/viewer3d/TractTube.tsx'), 'utf8'),
  sectionAssets: readFileSync(resolve(ROOT, 'src/components/section/sectionAssets.ts'), 'utf8'),
  sectionCanvas: readFileSync(resolve(ROOT, 'src/components/section/SectionCanvas.tsx'), 'utf8'),
  pipSection: readFileSync(resolve(ROOT, 'src/components/viewer3d/PipSection.tsx'), 'utf8'),
  sectionPip: readFileSync(resolve(ROOT, 'src/components/viewer3d/SectionPiP.tsx'), 'utf8'),
}

/* ==================================================================== *
 *  modules under test — the shipped ones
 * ==================================================================== */

const curves = await import(pathToFileURL(resolve(ROOT, 'src/geometry/curves.ts')).href)
const sceneLayers = await import(pathToFileURL(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx')).href)
const tractTube = await import(pathToFileURL(resolve(ROOT, 'src/components/viewer3d/TractTube.tsx')).href)
const sectionAssets = await import(pathToFileURL(resolve(ROOT, 'src/components/section/sectionAssets.ts')).href)
const sectionCanvas = await import(pathToFileURL(resolve(ROOT, 'src/components/section/SectionCanvas.tsx')).href)
const contours = await import(pathToFileURL(resolve(ROOT, 'src/components/section/contours.ts')).href)
const load = await import(pathToFileURL(resolve(ROOT, 'src/data/load.ts')).href)

const { NERVE_COURSES, NERVE_COURSE_IDS, hasNerveCourse } = curves
const { isTractVisible, isStructureVisible, nerveCoursesVisible } = sceneLayers
const { tubeGeometryFor } = tractTube
const {
  SECTION_PARTS,
  SECTION_NERVE_PARTS,
  partsForCanvas,
  registryNerveParts,
} = sectionAssets
const { isPartVisible } = sectionCanvas
const { extractContours, partBounds, boundsMayCut } = contours
const { getTaxonomyEntry, structures, tracts } = load

const TAXONOMY = JSON.parse(readFileSync(resolve(ROOT, 'src/data/taxonomy.json'), 'utf8'))
const TAXONOMY_ENTRIES = Array.isArray(TAXONOMY) ? TAXONOMY : (TAXONOMY.entries ?? TAXONOMY.structures ?? [])
const REGIONS = [...new Set(TAXONOMY_ENTRIES.map((entry) => entry.region))]
const KINDS = [...new Set(TAXONOMY_ENTRIES.map((entry) => entry.kind))]
const without = (value, domain) => domain.filter((entry) => entry !== value)

/** A layer state built from the two sets (the preset `hidden` set is empty). */
const layerState = ({ regions = REGIONS, kinds = KINDS, hidden = [] } = {}) => ({
  regions: new Set(regions),
  kinds: new Set(kinds),
  hidden: new Set(hidden),
})
const ALL_ON = layerState()

const CLIP_BOUNDS = JSON.parse(
  readFileSync(resolve(ROOT, 'src/components/viewer3d/clipPlanes.ts'), 'utf8')
    .match(/CLIP_BOUNDS\s*=\s*(\{[\s\S]*?\n\})/)[1].replace(/(\w+):/g, '"$1":').replace(/,(\s*[}\]])/g, '$1'),
)

console.log('=== v14 — cranial nerves as traveling tracts: 3D tubes + 2D section ===')
console.log(
  `domains: ${TAXONOMY_ENTRIES.length} registry records · ${structures.length} structures · ${tracts.length} tracts · ` +
    `${NERVE_COURSES.length} nerve courses`,
)
console.log(
  `surfaces: 3D tract list ${tracts.length} + nerve courses ${NERVE_COURSES.length} · ` +
    `2D section ${SECTION_PARTS.length} committed parts + ${SECTION_NERVE_PARTS.length} procedural nerve parts`,
)

/* ==================================================================== *
 *  1. ONE TUBE PER NERVE, GATED BY ITS OWN REGISTRY KIND
 * ==================================================================== */

console.log('\n--- 1. the 3D tract list: 12 nerve tubes, each gated by kind "nerve" ----')

const sceneTracts = [...tracts, ...nerveCoursesVisible(NERVE_COURSES, ALL_ON)]
const sceneCourseIds = sceneTracts.filter((record) => /^nrv-/.test(record.id)).map((record) => record.id)
const missingFromScene = NERVE_COURSE_IDS.filter((id) => !sceneCourseIds.includes(id))
assert(
  NERVE_COURSES.length === 12,
  'the nerve course table holds twelve courses',
  `found ${NERVE_COURSES.length}`,
)
assert(
  missingFromScene.length === 0,
  "every nerve course is in the 3D scene's tract list (nerveCoursesVisible)",
  `missing ${missingFromScene.join(' ')}`,
)
assert(
  sceneCourseIds.length === 12 && sceneTracts.length === tracts.length + 12,
  'the 3D scene list holds every tract plus exactly twelve nerve tubes with all areas+systems on',
  `tracts ${sceneTracts.length - sceneCourseIds.length} courses ${sceneCourseIds.length}`,
)

/** The truth table the brief asks for: the toggle must control EXACTLY 12. */
const states = [
  { label: 'all on', layers: ALL_ON },
  { label: 'tract kind off', layers: layerState({ kinds: without('tract', KINDS) }) },
  { label: 'nerve kind off', layers: layerState({ kinds: without('nerve', KINDS) }) },
  { label: 'both kinds off', layers: layerState({ kinds: KINDS.filter((kind) => kind !== 'tract' && kind !== 'nerve') }) },
  { label: 'midbrain area off', layers: layerState({ regions: without('midbrain', REGIONS) }) },
  { label: 'hidden preset (CN III)', layers: layerState({ hidden: ['nrv-cn3-oculomotor'] }) },
]

console.log(
  `  ${pad('layer state', 24)} ${padStart('tracts', 7)} ${padStart('nerve courses', 14)}   ids`,
)
const toggle = {}
for (const state of states) {
  const tractShown = tracts.filter((tract) => isTractVisible(tract.id, state.layers))
  const courseShown = nerveCoursesVisible(NERVE_COURSES, state.layers)
  toggle[state.label] = { tracts: tractShown.length, courses: courseShown.length }
  console.log(
    `  ${pad(state.label, 24)} ${padStart(`${tractShown.length}/${tracts.length}`, 7)} ` +
      `${padStart(`${courseShown.length}/${NERVE_COURSES.length}`, 14)}   ` +
      `${courseShown.map((course) => course.id.replace('nrv-cn', '')).slice(0, 8).join(' ')}` +
      `${courseShown.length > 8 ? ' …' : ''}`,
  )
}

assert(
  toggle['all on'].courses === 12 && toggle['all on'].tracts === tracts.length,
  'with every area+system on the scene shows all twelve nerves AND every tract',
  `tracts ${toggle['all on'].tracts} courses ${toggle['all on'].courses}`,
)
assert(
  toggle['tract kind off'].courses === 12 && toggle['tract kind off'].tracts === 0,
  'turning the TRACT system off hides every tract and NO nerve (the kind gate is per record)',
  `tracts ${toggle['tract kind off'].tracts} courses ${toggle['tract kind off'].courses}`,
)
assert(
  toggle['nerve kind off'].courses === 0 && toggle['nerve kind off'].tracts === tracts.length,
  'turning the CRANIAL NERVES system off hides exactly the twelve and NO tract',
  `tracts ${toggle['nerve kind off'].tracts} courses ${toggle['nerve kind off'].courses}`,
)
assert(
  toggle['both kinds off'].courses === 0 && toggle['both kinds off'].tracts === 0,
  'with both systems off the tract list is empty',
  `tracts ${toggle['both kinds off'].tracts} courses ${toggle['both kinds off'].courses}`,
)
assert(
  toggle['midbrain area off'].courses === 10 && toggle['midbrain area off'].tracts === 19,
  'the midbrain AREA toggle hides exactly the two midbrain nerves (III, IV) and only those',
  `courses ${toggle['midbrain area off'].courses} tracts ${toggle['midbrain area off'].tracts}`,
)
assert(
  toggle['hidden preset (CN III)'].courses === 11,
  "a preset's `hidden` set still hides one nerve (it is the same predicate as a tract's)",
  `courses ${toggle['hidden preset (CN III)'].courses}`,
)

/* the wiring itself, asserted on the source because a React pass cannot be
 * mounted here: the scene must FILTER the course table through the one
 * predicate and RENDER one TractTube per surviving course. */
assert(
  /const visibleNerveCourses = useMemo\(\s*\(\) => nerveCoursesVisible\(NERVE_COURSES, layerSets\),/.test(
    SOURCE.sceneLayers,
  ) && /export function nerveCoursesVisible\(/.test(SOURCE.sceneLayers),
  'SceneLayers routes the course table through the exported nerveCoursesVisible(NERVE_COURSES, layerSets)',
)
assert(
  /visibleNerveCourses\.map\(\(course\)\s*=>\s*\{/.test(SOURCE.sceneLayers) &&
    /<TractTube tract=\{course\} highlight=\{highlight\} \/>/.test(SOURCE.sceneLayers) &&
    /<TractTube tract=\{course\} highlight=\{highlight\} mirrored \/>/.test(SOURCE.sceneLayers),
  'SceneLayers mounts TWO <TractTube> per paired course — authored side plus mirrored twin (v17 both-sides rendering)',
)
assert(
  /const kind = entry\?\.kind \?\? 'tract'/.test(SOURCE.sceneLayers) &&
    /layersAdmit\(layers, entry \? entry\.region : 'medulla', kind\)/.test(SOURCE.sceneLayers),
  "isTractVisible reads the record's OWN registry kind — the literal 'tract' argument is gone",
)
assert(
  !/layersAdmit\(layers, entry \? entry\.region : 'medulla', 'tract'\)/.test(SOURCE.sceneLayers),
  "no hard-coded 'tract' kind argument survives in the visibility predicate",
)

/* ==================================================================== *
 *  2. THE 2D SECTION REGISTRY: ONE PROCEDURAL PART PER NERVE
 * ==================================================================== */

console.log('\n--- 2. the 2D live section / PiP: 12 procedural nerve parts --------------')

assert(
  SECTION_PARTS.length === 138,
  'SECTION_PARTS is unchanged at 138 committed GLB parts (every count-based gate keeps its domain)',
  `found ${SECTION_PARTS.length}`,
)
assert(
  SECTION_NERVE_PARTS.length === 12,
  'SECTION_NERVE_PARTS holds exactly one part per nerve',
  `found ${SECTION_NERVE_PARTS.length}`,
)
assert(
  partsForCanvas().length === SECTION_PARTS.length + SECTION_NERVE_PARTS.length,
  'partsForCanvas() is the committed parts plus the procedural ones',
  `found ${partsForCanvas().length}`,
)

const nerveParts = registryNerveParts()
assert(
  nerveParts.length === 24,
  'registryNerveParts() returns twenty-four worker parts — twelve authored sides plus twelve mirrored twins (v17 both-sides rendering)',
  `found ${nerveParts.length}`,
)
assert(
  /const visible = partsForCanvas\(\)\.filter\(/.test(SOURCE.sectionCanvas),
  "SectionCanvas's visible list is built from partsForCanvas() — so a nerve contour the worker returns gets DRAWN",
)
assert(
  /registryParts\.push\(\.\.\.registryNerveParts\(\)\)/.test(SOURCE.sectionCanvas),
  'SectionCanvas appends the procedural nerve parts to the worker registry message',
)
assert(
  !/const visible = SECTION_PARTS\.filter\(/.test(SOURCE.sectionCanvas) &&
    !/for \(const meta of SECTION_PARTS\) \{\n\s+const geometry = geometryStatus\.geometries/.test(SOURCE.sectionCanvas),
  'neither canvas call site still works from SECTION_PARTS alone (which would make the section and the PiP blind to the nerves)',
)

console.log(
  `  ${pad('nerve', 28)} ${pad('region', 14)} ${pad('taxKind', 9)} ${pad('verts', 6)} ${pad('tris', 6)} ` +
    `${pad('maxIdx', 7)} ${pad('indices ok', 10)} visible(nerve on/off)`,
)
let partProblems = 0
for (const meta of SECTION_NERVE_PARTS) {
  const part = nerveParts.find((candidate) => candidate.slug === meta.slug)
  const vertexCount = part === undefined ? 0 : part.positions.length / 3
  let maxIndex = -1
  if (part !== undefined) {
    for (let i = 0; i < part.indices.length; i++) if (part.indices[i] > maxIndex) maxIndex = part.indices[i]
  }
  const indicesOk = part !== undefined && maxIndex < vertexCount && part.indices.length % 3 === 0
  const visibleOn = isPartVisible(meta, ALL_ON)
  const visibleOff = isPartVisible(meta, layerState({ kinds: without('nerve', KINDS) }))
  if (!indicesOk || meta.region === null || meta.taxonomyKind !== 'nerve' || !visibleOn || visibleOff) partProblems += 1
  console.log(
    `  ${pad(meta.slug, 28)} ${pad(meta.region ?? '(null)', 14)} ${pad(meta.taxonomyKind ?? '(null)', 9)} ` +
      `${padStart(vertexCount, 6)} ${padStart(part === undefined ? 0 : part.indices.length / 3, 6)} ` +
      `${padStart(maxIndex, 7)} ${pad(indicesOk ? 'yes' : 'NO', 10)} ${visibleOn ? 'shown' : 'HIDDEN'}/${visibleOff ? 'shown' : 'hidden'}`,
  )
}
assert(
  partProblems === 0,
  'every nerve part is well formed, carries region+taxonomyKind nerve, and is gated by the nerve kind',
  `${partProblems} problem(s)`,
)
assert(
  SECTION_NERVE_PARTS.every((meta) => meta.taxonomyKind === 'nerve' && meta.region !== null),
  'each nerve part declares taxonomyKind "nerve" and a real region',
)
assert(
  SECTION_NERVE_PARTS.every((meta) => isPartVisible(meta, ALL_ON)),
  'each nerve part is visible with every area+system on',
)
assert(
  SECTION_NERVE_PARTS.every((meta) => !isPartVisible(meta, layerState({ kinds: without('nerve', KINDS) }))),
  'no nerve part is visible with the nerve system off',
)
assert(
  SECTION_NERVE_PARTS.every((meta) => !isPartVisible(meta, layerState({ regions: without(meta.region, REGIONS) }))),
  'no nerve part is visible with its own area off',
)

/* ==================================================================== *
 *  3. THE WORKER COMPUTES CONTOURS ON THE PLANES THAT CROSS EACH NERVE
 * ==================================================================== */

console.log('\n--- 3. the contour worker on the nerve parts (shipped machinery) ---------')

const PLANES = [
  ...[-46, -43, -34, -32, -31, -28, -24, -19, -18, -14, -8, 0, 8, 9, 14, 30, 48, 58].map((value) => ({ axis: 'y', value })),
  ...[0, 2, 4, 8, 12, 22, 26].map((value) => ({ axis: 'x', value })),
  ...[-16, -8, 0, 8, 16, 23.5, 27, 33, 36, 45, 48, 57, 66].map((value) => ({ axis: 'z', value })),
]

const boundsBySlug = new Map()
for (const part of nerveParts) boundsBySlug.set(part.slug, partBounds(part.positions))

console.log(
  `  ${pad('nerve', 28)} ${pad('bbox y', 16)} ${pad('crossing planes', 15)} ${padStart('loops', 6)} ` +
    `${padStart('segs', 6)} non-finite`,
)
let nervesWithoutLoops = []
let nonFiniteValues = 0
let totalLoops = 0
const perNervePlanes = new Map()

for (const course of NERVE_COURSES) {
  const part = nerveParts.find((candidate) => candidate.slug === course.id)
  const bounds = boundsBySlug.get(course.id)
  let crossing = 0
  let loops = 0
  let segments = 0
  let bad = 0
  const detail = []
  for (const plane of PLANES) {
    if (!boundsMayCut(bounds, plane)) continue
    const result = extractContours(part.positions, part.indices, plane)
    crossing += 1
    segments += result.segmentCount
    loops += result.loops.length
    if (result.loops.length > 0) detail.push(`${plane.axis}=${plane.value}:${result.loops.length}`)
    for (const loop of result.loops) {
      if (loop.length < 6 || loop.length % 2 !== 0) bad += 1
      for (const value of loop) if (!Number.isFinite(value)) bad += 1
    }
  }
  nonFiniteValues += bad
  totalLoops += loops
  if (loops === 0) nervesWithoutLoops.push(course.id)
  perNervePlanes.set(course.id, { crossing, loops })
  console.log(
    `  ${pad(course.id, 28)} ${pad(`${fmt(bounds.min[1], 0)}..${fmt(bounds.max[1], 0)}`, 16)} ` +
      `${pad(`${crossing} of ${PLANES.length}`, 15)} ${padStart(loops, 6)} ${padStart(segments, 6)} ${bad}` +
      `${detail.length === 0 ? '' : `   ${detail.join(' ')}`}`,
  )
}

assert(
  nervesWithoutLoops.length === 0,
  'every nerve has at least one crossing plane with at least one closed loop',
  `no loops for ${nervesWithoutLoops.join(' ')}`,
)
assert(
  nonFiniteValues === 0,
  'no contour loop is malformed or non-finite (every loop is a closed even-length path)',
  `${nonFiniteValues} bad value(s)`,
)
assert(
  NERVE_COURSES.every((course) => perNervePlanes.get(course.id).crossing >= 1),
  'every nerve intersects at least one tested plane (boundsMayCut admitted it)',
)
assert(
  totalLoops >= 12,
  'the nerve parts produce at least one loop per nerve across the sweep',
  `${totalLoops} loop(s)`,
)

/* The 3D tube and the 2D contour must be the SAME geometry: one shared sweep. */
const sharedBuilderProblems = []
for (const course of NERVE_COURSES) {
  const geometry = tubeGeometryFor(course)
  const part = nerveParts.find((candidate) => candidate.slug === course.id)
  const vertexCount = geometry.getAttribute('position').count
  if (vertexCount !== part.positions.length / 3) sharedBuilderProblems.push(`${course.id}: ${vertexCount} verts vs ${part.positions.length / 3}`)
  if (geometry.getIndex().count !== part.indices.length) sharedBuilderProblems.push(`${course.id}: index count differs`)
}
assert(
  sharedBuilderProblems.length === 0,
  'the 2D registry part IS the 3D tube geometry (same vert/index counts from one shared builder)',
  sharedBuilderProblems.slice(0, 3).join('; '),
)
assert(
  /export function tubeGeometryFor/.test(SOURCE.tractTube),
  'TractTube exports the shared cached tube builder the section registry calls',
)

/* ==================================================================== *
 *  4. NO NERVE RENDERS BOTH A TUBE AND A BLOB
 * ==================================================================== */

console.log('\n--- 4. one body per nerve: a tube XOR the schematic ellipsoid ------------')

console.log('  nerve                        tube(3D)  marker would-draw  section part  verdict')
let doubleBodied = []
let bodyless = []
for (const course of NERVE_COURSES) {
  const tube = isTractVisible(course.id, ALL_ON)
  const suppressed = hasNerveCourse(course.id)
  // The structure pass admits the record (the layer decision), and the render
  // then skips it because the course owns the body — so the marker is NOT drawn.
  const markerDrawn = !suppressed
  const sectionPart = SECTION_NERVE_PARTS.some((meta) => meta.slug === course.id)
  const verdict = tube && !markerDrawn && sectionPart ? 'ok' : 'BROKEN'
  if (tube && markerDrawn) doubleBodied.push(course.id)
  if (!tube && !markerDrawn) bodyless.push(course.id)
  console.log(
    `  ${pad(course.id, 28)} ${pad(tube ? 'yes' : 'NO', 9)} ${pad(markerDrawn ? 'YES' : 'no', 17)} ` +
      `${pad(sectionPart ? 'yes' : 'NO', 13)} ${verdict}`,
  )
}
assert(doubleBodied.length === 0, 'no nerve renders both a tube and a schematic marker', doubleBodied.join(' '))
assert(bodyless.length === 0, 'no nerve is left without a body', bodyless.join(' '))
assert(
  NERVE_COURSES.every((course) => hasNerveCourse(course.id)),
  'hasNerveCourse() is true for all twelve ids (the suppression key)',
)
assert(
  /if \(hasNerveCourse\(record\.id\)\) return null/.test(SOURCE.sceneLayers),
  'the structure pass returns null for a course-bearing record (the marker is retired in the render)',
)
assert(
  structures.filter((record) => /^nrv-/.test(record.id)).length === 12,
  'the twelve nerve STRUCTURE records still exist (the course replaced the body, not the record)',
  `found ${structures.filter((record) => /^nrv-/.test(record.id)).length}`,
)
assert(
  structures
    .filter((record) => /^nrv-/.test(record.id))
    .every((record) => record.contextNote === undefined || typeof record.contextNote === 'string'),
  'the nerve records keep their authored content (the InfoPanel still gets function/clinical/modality)',
)
assert(
  NERVE_COURSES.every((course) => typeof course.anchorNote === 'string' && course.anchorNote.includes('AUTHORED PATH')),
  'every course states in its own anchorNote that the body is an AUTHORED PATH, not a segmented scan',
)
assert(
  NERVE_COURSES.every(
    (course) =>
      Number.isFinite(course.tubeRadius) &&
      course.tubeRadius > 0 &&
      Math.abs(course.tubeRadius * 2.4 - course.calibreMm) < 0.03 &&
      course.anchorNote.includes('1.2 mm'),
  ),
  'every radius is the stated mm calibre converted at 1 au = 1.2 mm, and says so',
)

/* ==================================================================== *
 *  5. THE PAYLOAD IS UNTOUCHED — route (a) really costs 0 bytes
 * ==================================================================== */

console.log('\n--- 5. payload: route (a) costs nothing on disk ---------------------------')

const MANIFEST = resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json')
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const manifestBytes = manifest.parts.reduce((sum, part) => sum + statSync(resolve(ROOT, 'src/assets/anatomy', part.file ?? `${part.slug}.glb`)).size, 0)
const dirBytes = readdirSync(resolve(ROOT, 'src/assets/anatomy')).reduce((sum, name) => {
  const full = resolve(ROOT, 'src/assets/anatomy', name)
  return statSync(full).isFile() ? sum + statSync(full).size : sum
}, 0)
const triTotal = manifest.parts.reduce((sum, part) => sum + (part.triCount ?? 0), 0)
const nrvGlbs = manifest.parts.filter((part) => /^nrv-/.test(part.slug))

ms('manifest parts', manifest.parts.length, 'must stay 138 (a new part would re-point three gates)')
ms('Σ parts[].file', `${fmt(manifestBytes / 1048576, 4)} MiB`, `of the 14 MiB cap`)
ms('anatomy directory', `${fmt(dirBytes / 1048576, 4)} MiB`, 'the binding reading')
ms('Σ parts[].triCount', triTotal, 'unchanged at 599204')
ms('nrv-* GLB parts', nrvGlbs.length, 'route (a) bakes nothing')

assert(manifest.parts.length === 138, 'no manifest part was added', `found ${manifest.parts.length}`)
assert(nrvGlbs.length === 0, 'no nerve GLB exists on disk (route (a), procedural)', `found ${nrvGlbs.join(' ')}`)
assert(dirBytes / 1048576 <= 14, 'the anatomy directory is inside the 14 MiB cap', `${fmt(dirBytes / 1048576, 4)} MiB`)
assert(
  manifestBytes === 14486228,
  'Σ parts[].file is still the measured 14,486,228 B (no existing part changed)',
  `${manifestBytes}`,
)
assert(
  triTotal === 599204,
  'Σ parts[].triCount is still 599,204 (no existing part changed)',
  `${triTotal}`,
)
assert(
  !/nrv-.*\.glb/.test(SOURCE.sectionAssets) && /registryPartFromGeometry\(nerveCourseMeta\(course\), tubeGeometryFor\(course\)\)/.test(SOURCE.sectionAssets),
  'the section registry feeds the worker PROCEDURAL tube geometry, not a GLB',
)

/* ==================================================================== *
 *  6. THE PiP — same canvas, so one fix covers both
 * ==================================================================== */

console.log('\n--- 6. the PiP path -------------------------------------------------------')

assert(
  /<SectionCanvas \/>/.test(SOURCE.pipSection) &&
    /import SectionCanvas from '\.\.\/section\/SectionCanvas'/.test(SOURCE.pipSection),
  'PipSection mounts <SectionCanvas /> ITSELF — no prop, no filter — so the PiP slices exactly what the Plates tab slices',
)
assert(
  /partsForCanvas\(\)/.test(SOURCE.sectionCanvas) && !/<SectionCanvas [^>]*parts=/.test(SOURCE.pipSection),
  'the canvas draws from partsForCanvas() and the PiP passes no parts prop: one fix covers both surfaces',
)

/* ==================================================================== *
 *  verdict
 * ==================================================================== */

console.log(
  `\nnerve-render: ${NERVE_COURSES.length} courses · 3D tubes ${toggle['all on'].courses}/${NERVE_COURSES.length} ` +
    `(nerve kind off ${toggle['nerve kind off'].courses}, tract kind off ${toggle['tract kind off'].tracts} tracts hidden) · ` +
    `2D parts ${SECTION_NERVE_PARTS.length} · ${totalLoops} contour loop(s) over ${PLANES.length} planes · ` +
    `${checks - failures.length}/${checks} assertions`,
)
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`)
  console.log(`\n${failures.length} failure(s)`)
  process.exit(1)
}
console.log('  PASS cranial nerves render as traveling tracts in 3D and in the live section')
console.log('  NOTE (orchestrator-only, Chrome): that the 3D scene PAINTS the tubes, the section/PiP')
console.log('       PAINTS the contours, the Systems-row button toggles them on screen, and click-select')
console.log('       works, are browser claims this gate cannot make.')
process.exit(0)
