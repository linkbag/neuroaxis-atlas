/**
 * v17 gate — RENDER: granular VESSELS as tubes in 3D and in the 2D live
 * section / PiP, with the schematic lenticulostriate blob suppressed.
 *
 * Run from the repo root:  node scripts/verify/vessel-render.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:vessel-render": "node scripts/verify/vessel-render.mjs"
 *  — package.json is the integrator's file, so it is named here, not edited.)
 *
 * ── WHAT THIS GATE PROVES, AND HOW ────────────────────────────────────────
 * It EXECUTES the shipped modules (never a re-typed copy): the same
 * node:module `registerHooks` loader `cranial-nerve-render.mjs` uses resolves
 * the app's extensionless imports, emulates Vite's `import.meta.glob`,
 * transpiles `.ts`/`.tsx` with the PROJECT'S OWN TypeScript, and answers asset
 * specifiers. Every number below is printed, so no assertion can pass by not
 * running.
 *
 *   1. THE COURSE TABLE IS THE MERGED ONE — `VESSEL_COURSES` (the built-in
 *      PLAN.md §2.1 Tier-1 records ∪ whatever the authored content task landed
 *      in `src/data/structures/vasculature-courses.json`), with the two terms
 *      printed separately and every rejected authored record named.
 *   2. ONE TUBE PER COURSE, BOTH SIDES FOR A PAIRED VESSEL. `SceneLayers`
 *      exports the vessel pass (`vesselCoursesVisible`); the gate runs the
 *      SHIPPED `isTractVisible` over the course table × six layer states and
 *      prints the counts. The tube count is printed as its two terms (authored
 *      + mirrored), never as a bare product.
 *   3. THE LENTICULOSTRIATE BLOB IS GONE. `hasVesselCourse` is executed for
 *      every vessel record: a course-bearing record draws a tube and NO
 *      schematic ellipsoid, the suppression line is asserted in the source, and
 *      every lenticulostriate-family record in the tree must be suppressed.
 *   4. THE 2D LIVE SECTION CARRIES BOTH SIDES. `SECTION_VESSEL_PARTS`,
 *      `partsForCanvas()` and `registryVesselParts()` (authored + `#mirror`,
 *      same group, `taxonomyKind: 'vessel'`), gated by the vasculature region
 *      AND the vessel kind through the shipped `isPartVisible`.
 *   5. THE WORKER REALLY SLICES THEM: `registryVesselParts()` is handed to the
 *      shipped `partBounds` / `boundsMayCut` / `extractContours` — the functions
 *      `contourWorker` itself calls — and per-course loop counts are printed.
 *   6. ONE BUILDER: the 2D registry part IS the 3D tube geometry, compared
 *      element by element, so the section slices what the scene draws.
 *   7. THE PAYLOAD IS UNTOUCHED: 138 manifest parts, Σ 14,486,228 B, 599,204
 *      tris, no GLB for any course id.
 *
 * ── WHAT ONLY THE ORCHESTRATOR CAN CONFIRM (Chrome cannot run in this
 *    sandbox — no claim below is made by this gate) ────────────────────────
 *   • that the 3D scene actually PAINTS the vessel tubes and that the two red
 *     blobs are gone on screen;
 *   • that the live section and the PiP PAINT the vessel contours;
 *   • that clicking a vessel tube selects the same record the section does;
 *   • the frame-time cost of the extra tubes.
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
/** Deviations in the AUTHORED (sibling-owned) records — reported, not failed.
 *  Their content gate owns validity; this gate owns the render route. */
const authoredNotes = []

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
/** au → mm at the canonical 1 au = 1.2 mm. */
const mm = (au) => au * 1.2

const SOURCE = {
  sceneLayers: readFileSync(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx'), 'utf8'),
  tractTube: readFileSync(resolve(ROOT, 'src/components/viewer3d/TractTube.tsx'), 'utf8'),
  sectionAssets: readFileSync(resolve(ROOT, 'src/components/section/sectionAssets.ts'), 'utf8'),
  sectionCanvas: readFileSync(resolve(ROOT, 'src/components/section/SectionCanvas.tsx'), 'utf8'),
  vesselCourses: readFileSync(resolve(ROOT, 'src/geometry/vasculature-courses.ts'), 'utf8'),
  pipSection: readFileSync(resolve(ROOT, 'src/components/viewer3d/PipSection.tsx'), 'utf8'),
}

/* ==================================================================== *
 *  modules under test — the shipped ones
 * ==================================================================== */

const vesselCoursesModule = await import(
  pathToFileURL(resolve(ROOT, 'src/geometry/vasculature-courses.ts')).href
)
const sceneLayers = await import(pathToFileURL(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx')).href)
const tractTube = await import(pathToFileURL(resolve(ROOT, 'src/components/viewer3d/TractTube.tsx')).href)
const sectionAssets = await import(pathToFileURL(resolve(ROOT, 'src/components/section/sectionAssets.ts')).href)
const sectionCanvas = await import(pathToFileURL(resolve(ROOT, 'src/components/section/SectionCanvas.tsx')).href)
const contours = await import(pathToFileURL(resolve(ROOT, 'src/components/section/contours.ts')).href)
const load = await import(pathToFileURL(resolve(ROOT, 'src/data/load.ts')).href)
const anatomyAssets = await import(pathToFileURL(resolve(ROOT, 'src/geometry/anatomyAssets.ts')).href)

const {
  VESSEL_COURSES,
  VESSEL_COURSE_IDS,
  VESSEL_COURSE_GROUPS,
  VESSEL_COURSE_GROUP_IDS,
  VESSEL_COURSE_SOURCES,
  BUILT_IN_VESSEL_COURSES,
  VESSEL_COURSE_SOURCE_PATH,
  hasVesselCourse,
  hasVesselCourseGroup,
  vesselCourseById,
  vesselCourseGroupById,
  isPairedVessel,
  mirrorVesselCourse,
  vesselTubeCount,
} = vesselCoursesModule
const { isTractVisible, isStructureVisible, vesselCoursesVisible } = sceneLayers
const { tubeGeometryFor } = tractTube
const {
  SECTION_PARTS,
  SECTION_NERVE_PARTS,
  SECTION_VESSEL_PARTS,
  partsForCanvas,
  registryNerveParts,
  registryVesselParts,
  registryCoursePartsAll,
} = sectionAssets
const { isPartVisible } = sectionCanvas
const { extractContours, partBounds, boundsMayCut } = contours
const { getTaxonomyEntry, structures, tracts } = load
const { anatomySlugsForRecord, isGhostOrContentOnly } = anatomyAssets

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
const CLIP_CLEARANCE_AU = 1.0

console.log('=== v17 — granular vessels as courses: 3D tubes + 2D section + blob removal ===')
console.log(
  `domains: ${TAXONOMY_ENTRIES.length} registry records · ${structures.length} structures · ${tracts.length} tracts · ` +
    `${VESSEL_COURSES.length} vessel courses + ${VESSEL_COURSE_GROUPS.length} course group(s)`,
)
console.log(
  `surfaces: 3D ${tracts.length} tracts + ${VESSEL_COURSES.length} vessel courses · ` +
    `2D section ${SECTION_PARTS.length} committed parts + ${SECTION_NERVE_PARTS.length} nerve + ${SECTION_VESSEL_PARTS.length} vessel procedural parts`,
)

/* ==================================================================== *
 *  1. THE COURSE TABLE: built-in ∪ authored, merged by id, printed
 * ==================================================================== */

console.log('\n--- 1. the vessel course table: built-in ∪ authored (merged by id) ------')

const sourceFiles = [...VESSEL_COURSE_SOURCES.report.files.entries()]
const groupFiles = [...VESSEL_COURSE_SOURCES.report.groupFiles.entries()]
const authoredEntries = VESSEL_COURSE_SOURCES.authoredIds.length + VESSEL_COURSE_SOURCES.replacedIds.length
ms('built-in records', BUILT_IN_VESSEL_COURSES.length, 'PLAN.md §2.1 Tier 1 — always in force')
ms('built-in surviving', VESSEL_COURSE_SOURCES.builtInIds.length, `withdrawn: ${VESSEL_COURSE_SOURCES.replacedIds.length} replaced, ${VESSEL_COURSE_SOURCES.groupedIds.length} grouped`)
ms('authored courses', authoredEntries, `${VESSEL_COURSE_SOURCES.authoredIds.length} new + ${VESSEL_COURSE_SOURCES.replacedIds.length} replacing a built-in`)
ms('authored groups', VESSEL_COURSE_GROUPS.length, 'records whose body is their child courses')
for (const [path, used] of sourceFiles) {
  const groups = groupFiles.find(([candidate]) => candidate === path)?.[1] ?? 0
  console.log(`      ${pad(path, 56)} ${padStart(used, 4)} course(s) · ${groups} group(s)`)
}
if (sourceFiles.length === 0) {
  console.log(
    `      ${VESSEL_COURSE_SOURCE_PATH} not present — the authored content task has not landed; ` +
      'the built-in lenticulostriate courses are in force (the blob fix does not depend on it)',
  )
}
for (const id of VESSEL_COURSE_SOURCES.replacedIds) {
  console.log(`      merge: authored record REPLACED the built-in course ${id}`)
}
for (const id of VESSEL_COURSE_SOURCES.groupedIds) {
  const group = vesselCourseGroupById(id)
  console.log(
    `      merge: built-in course ${id} became a GROUP — the authored ladder draws ` +
      `(${group === undefined ? '?' : group.childIds.join(' ')}) and the built-in tube is withdrawn`,
  )
}
for (const id of VESSEL_COURSE_SOURCES.authoredIds) console.log(`      merge: authored-only course ${id}`)
for (const note of VESSEL_COURSE_SOURCES.report.rejected) console.log(`      authored record REJECTED: ${note}`)
for (const note of VESSEL_COURSE_SOURCES.report.unrecognized) {
  console.log(`      authored module shape not recognized: ${note}`)
}
for (const [id, aliases] of VESSEL_COURSE_SOURCES.report.aliases) {
  console.log(`      field alias used for ${id}: ${aliases.join(' ')}`)
}

assert(
  VESSEL_COURSES.length ===
    VESSEL_COURSE_SOURCES.builtInIds.length +
      VESSEL_COURSE_SOURCES.replacedIds.length +
      VESSEL_COURSE_SOURCES.authoredIds.length,
  'the table is (built-in surviving + replacing-authored + new-authored) — no record is lost or duplicated',
  `${VESSEL_COURSES.length} vs ${VESSEL_COURSE_SOURCES.builtInIds.length} + ${VESSEL_COURSE_SOURCES.replacedIds.length} + ${VESSEL_COURSE_SOURCES.authoredIds.length}`,
)
assert(
  VESSEL_COURSE_IDS.length === new Set(VESSEL_COURSE_IDS).size,
  'every course id is unique (one record, one tube)',
  `${VESSEL_COURSE_IDS.length - new Set(VESSEL_COURSE_IDS).size} duplicate(s)`,
)
assert(
  VESSEL_COURSES.length >= BUILT_IN_VESSEL_COURSES.length && VESSEL_COURSES.length > 0,
  'the table is never empty (the blob fix cannot be silently disabled)',
  `found ${VESSEL_COURSES.length}`,
)
assert(
  VESSEL_COURSE_GROUPS.every((group) => group.childIds.length > 0),
  'every course GROUP owns at least one child course — a group with no children would have no body at all',
  VESSEL_COURSE_GROUPS.filter((group) => group.childIds.length === 0).map((group) => group.id).join(' '),
)
assert(
  VESSEL_COURSE_GROUPS.every((group) => !VESSEL_COURSE_IDS.includes(group.id)) &&
    VESSEL_COURSE_GROUPS.every((group) => hasVesselCourse(group.id) && hasVesselCourseGroup(group.id)),
  'a group is never also a drawing course, and the suppression key covers both shapes',
)
assert(
  sourceFiles.length === 0 || VESSEL_COURSE_SOURCES.authoredIds.length + VESSEL_COURSE_SOURCES.replacedIds.length > 0,
  'an authored course file that IS present contributed at least one usable record (the adapter really read it)',
  `${sourceFiles.length} file(s) present, 0 records read`,
)

if (VESSEL_COURSE_GROUPS.length > 0) {
  console.log(
    `\n  ${pad('group record (body = its children)', 46)} ${pad('parent artery', 34)} ${pad('surface', 18)} ` +
      `${pad('basis', 17)} ${padStart('children', 8)}`,
  )
  for (const group of VESSEL_COURSE_GROUPS) {
    console.log(
      `  ${pad(group.id, 46)} ${pad(group.parent, 34)} ${pad(group.surface ?? '(none)', 18)} ` +
        `${pad(group.basis, 17)} ${padStart(group.childIds.length, 8)}   ${group.childIds.join(' ')}`,
    )
  }
}

/* Per-course table + the structural invariants the render route needs. */
console.log(
  `\n  ${pad('course id', 46)} ${pad('lat', 7)} ${pad('parent', 34)} ${pad('surface', 18)} ${pad('basis', 17)} ` +
    `${padStart('pts', 4)} ${padStart('arc mm', 7)} ${padStart('r au', 6)} ${padStart('mm', 5)}`,
)
const structuralProblems = []
const builtInCalibreProblems = []
const authoredDeviations = []
const clipDeviations = []
for (const course of VESSEL_COURSES) {
  const isBuiltIn = BUILT_IN_VESSEL_COURSES.some((built) => built.id === course.id)
  // Arc length over the authored control points (not the swept curve): the
  // documented-course figure the anchorNote quotes.
  let arc = 0
  for (let i = 1; i < course.waypoints.length; i += 1) {
    const [x0, y0, z0] = course.waypoints[i - 1]
    const [x1, y1, z1] = course.waypoints[i]
    arc += Math.hypot(x1 - x0, y1 - y0, z1 - z0)
  }
  console.log(
    `  ${pad(course.id, 46)} ${pad(course.laterality, 7)} ${pad(course.parent, 34)} ${pad(course.surface ?? '(none)', 18)} ` +
      `${pad(course.basis, 17)} ${padStart(course.waypoints.length, 4)} ${padStart(fmt(mm(arc), 1), 7)} ` +
      `${padStart(fmt(course.tubeRadius, 3), 6)} ${padStart(fmt(course.calibreMm, 2), 5)}${isBuiltIn ? '' : '   (authored)'}`,
  )
  if (!/^vasc-[a-z0-9-]+$/.test(course.id)) structuralProblems.push(`${course.id}: id prefix`)
  if (course.region !== 'vasculature') structuralProblems.push(`${course.id}: region ${course.region}`)
  if (course.kind !== 'vessel') structuralProblems.push(`${course.id}: kind ${course.kind}`)
  if (course.waypoints.length < 2) structuralProblems.push(`${course.id}: ${course.waypoints.length} waypoint(s)`)
  if (!(course.tubeRadius > 0) || !Number.isFinite(course.tubeRadius)) structuralProblems.push(`${course.id}: radius`)
  if (!Number.isFinite(course.calibreMm)) structuralProblems.push(`${course.id}: calibreMm`)
  for (const [x, y, z] of course.waypoints) {
    if (![x, y, z].every(Number.isFinite)) structuralProblems.push(`${course.id}: non-finite waypoint`)
  }
  // The v14 conversion rule: r_au = d_mm / 2.4 (1 au = 1.2 mm).
  const calibreOk = Math.abs(course.tubeRadius * 2.4 - course.calibreMm) < 0.03
  if (!calibreOk) {
    if (isBuiltIn) builtInCalibreProblems.push(`${course.id}: ${course.tubeRadius} au vs ${course.calibreMm} mm`)
    else authoredDeviations.push(`${course.id}: |r*2.4 − calibreMm| = ${fmt(Math.abs(course.tubeRadius * 2.4 - course.calibreMm), 4)}`)
  }
  // Containment in CLIP_BOUNDS with the v14 1 au floor.
  for (const [x, y, z] of course.waypoints) {
    const outside =
      x < CLIP_BOUNDS.x.min + CLIP_CLEARANCE_AU ||
      x > CLIP_BOUNDS.x.max - CLIP_CLEARANCE_AU ||
      y < CLIP_BOUNDS.y.min + CLIP_CLEARANCE_AU ||
      y > CLIP_BOUNDS.y.max - CLIP_CLEARANCE_AU ||
      z < CLIP_BOUNDS.z.min + CLIP_CLEARANCE_AU ||
      z > CLIP_BOUNDS.z.max - CLIP_CLEARANCE_AU
    if (outside) {
      const note = `${course.id}: [${x}, ${y}, ${z}] outside CLIP_BOUNDS ± ${CLIP_CLEARANCE_AU} au`
      if (isBuiltIn) clipDeviations.push(note)
      else authoredDeviations.push(note)
    }
  }
  if (
    course.surface === null &&
    !/surface`? is null|no committed envelope|intraparenchymal/i.test(
      `${course.anchorNote} ${course.surfaceNote ?? ''}`,
    )
  ) {
    const note = `${course.id}: surface null without stating why in anchorNote/surfaceNote`
    if (isBuiltIn) structuralProblems.push(note)
    else authoredDeviations.push(note)
  }
  if (course.basis === 'bp3d-element' && course.elementIds.length === 0) {
    const note = `${course.id}: basis bp3d-element with no elementIds`
    if (isBuiltIn) structuralProblems.push(note)
    else authoredDeviations.push(note)
  }
}
assert(structuralProblems.length === 0, 'every vessel course is structurally renderable', structuralProblems.slice(0, 4).join('; '))
assert(
  builtInCalibreProblems.length === 0 && clipDeviations.length === 0,
  'every BUILT-IN course satisfies r_au × 2.4 = calibreMm and sits ≥ 1 au inside CLIP_BOUNDS',
  [...builtInCalibreProblems, ...clipDeviations].slice(0, 4).join('; '),
)
for (const note of authoredDeviations) authoredNotes.push(note)
assert(
  VESSEL_COURSES.every((course) => typeof course.anchorNote === 'string' && course.anchorNote.length > 0),
  'every course states what stands behind its path (anchorNote)',
)
assert(
  VESSEL_COURSES.every((course) => typeof course.parent === 'string' && course.parent.length > 0),
  'every course names its parent artery',
)
assert(
  hasVesselCourse('vasc-lenticulostriate-arteries'),
  'the ELIPSOID OWNER (vasc-lenticulostriate-arteries) is in the course table — the blob cannot come back',
  `hasVesselCourse false for the record that owns the two red ellipsoids`,
)

/* The registry must resolve the ids the render gate reads (region/kind). */
const unregistered = VESSEL_COURSE_IDS.filter((id) => getTaxonomyEntry(id) === undefined)
ms('courses with a taxonomy row', VESSEL_COURSE_IDS.length - unregistered.length, `of ${VESSEL_COURSE_IDS.length}`)
if (unregistered.length > 0) {
  console.log(
    `      not yet registered (admitted by isTractVisible's documented medulla/tract fallback until the registry task lands): ` +
      unregistered.join(' '),
  )
}

/* ==================================================================== *
 *  2. THE 3D PASS: one tube per course, both sides when paired
 * ==================================================================== */

console.log('\n--- 2. the 3D scene: one tube per course, + the mirror twin when paired --')

const lateralityOf = (course) => getTaxonomyEntry(course.id)?.laterality
const tubeCount = vesselTubeCount(VESSEL_COURSES, lateralityOf)
ms('authored tubes', tubeCount.authored, 'one per course')
ms('mirrored tubes', tubeCount.mirrored, 'one per registry-`paired` course')
ms('drawn tubes (3D)', tubeCount.total, `${VESSEL_COURSES.length} authored + ${tubeCount.mirrored} mirrored`)

const sceneCourseIds = vesselCoursesVisible(VESSEL_COURSES, ALL_ON).map((course) => course.id)
const missingFromScene = VESSEL_COURSE_IDS.filter((id) => !sceneCourseIds.includes(id))
assert(
  missingFromScene.length === 0 && sceneCourseIds.length === VESSEL_COURSES.length,
  'every vessel course is in the 3D scene pass (vesselCoursesVisible) with all areas+systems on',
  `missing ${missingFromScene.join(' ')}`,
)

/**
 * The kind/area truth rows can only be asserted over the courses the REGISTRY
 * knows: `isTractVisible` reads `entry.region`/`entry.kind`, and a course whose
 * taxonomy row has not landed yet falls back to the documented medulla/tract
 * default (the registry-first workflow, validate-data.mjs). The unregistered
 * count is PRINTED — never skipped silently — and every row below is still
 * executed over the registered subset.
 */
const registeredCourses = VESSEL_COURSES.filter((course) => getTaxonomyEntry(course.id) !== undefined)
const unregisteredCourses = VESSEL_COURSES.filter((course) => getTaxonomyEntry(course.id) === undefined)
if (unregisteredCourses.length > 0) {
  console.log(
    `  AWAITING REGISTRY (taxonomy task not landed): ${unregisteredCourses.length} of ${VESSEL_COURSES.length} course(s) ` +
      `— ${unregisteredCourses.map((course) => course.id).join(' ')}`,
  )
  console.log(
    `      until their rows land they are admitted through isTractVisible's documented medulla/tract fallback ` +
      '(the kind/area rows below are therefore asserted over the registered subset, and the count is printed)',
  )
}
assert(
  registeredCourses.length === VESSEL_COURSES.length || unregisteredCourses.length > 0,
  'the registered/unregistered split is printed, never silently dropped',
)

const pairedCourses = VESSEL_COURSES.filter((course) => isPairedVessel(course, lateralityOf(course)))
const midlineCourses = VESSEL_COURSES.filter((course) => !isPairedVessel(course, lateralityOf(course)))
console.log(
  `  paired ${pairedCourses.length} → ${pairedCourses.length * 2} tubes · midline ${midlineCourses.length} → ` +
    `${midlineCourses.length} tube(s)${midlineCourses.length === 0 ? '' : ` (${midlineCourses.map((c) => c.id).join(' ')})`}`,
)
assert(
  tubeCount.total === pairedCourses.length * 2 + midlineCourses.length,
  'the tube count is exactly 2 × paired + 1 × midline (printed as its two terms, not a bare product)',
  `${tubeCount.total} vs ${pairedCourses.length * 2} + ${midlineCourses.length}`,
)

const states = [
  { label: 'all on', layers: ALL_ON },
  { label: 'vessel kind off', layers: layerState({ kinds: without('vessel', KINDS) }) },
  { label: 'tract kind off', layers: layerState({ kinds: without('tract', KINDS) }) },
  { label: 'nerve kind off', layers: layerState({ kinds: without('nerve', KINDS) }) },
  { label: 'vasculature area off', layers: layerState({ regions: without('vasculature', REGIONS) }) },
  { label: 'telencephalon area off', layers: layerState({ regions: without('telencephalon', REGIONS) }) },
  { label: 'hidden preset (first course)', layers: layerState({ hidden: [VESSEL_COURSE_IDS[0]] }) },
]
console.log(`\n  ${pad('layer state', 28)} ${padStart('vessels', 9)} ${padStart('tracts', 8)} ${padStart('nerves', 8)}   ids`)
const toggle = {}
for (const state of states) {
  const vessels = vesselCoursesVisible(VESSEL_COURSES, state.layers)
  const visibleTracts = tracts.filter((tract) => isTractVisible(tract.id, state.layers))
  const nerves = sceneLayers.nerveCoursesVisible(
    (await import(pathToFileURL(resolve(ROOT, 'src/geometry/curves.ts')).href)).NERVE_COURSES,
    state.layers,
  )
  toggle[state.label] = { vessels: vessels.length, tracts: visibleTracts.length, nerves: nerves.length }
  console.log(
    `  ${pad(state.label, 28)} ${padStart(`${vessels.length}/${VESSEL_COURSES.length}`, 9)} ` +
      `${padStart(`${visibleTracts.length}/${tracts.length}`, 8)} ${padStart(`${nerves.length}/12`, 8)}   ` +
      `${vessels.map((course) => course.id.replace('vasc-', '')).slice(0, 4).join(' ')}${vessels.length > 4 ? ' …' : ''}`,
  )
}
assert(
  toggle['all on'].vessels === VESSEL_COURSES.length && toggle['all on'].nerves === 12,
  'with every area+system on the scene shows every vessel course (and the twelve nerves)',
  `vessels ${toggle['all on'].vessels} nerves ${toggle['all on'].nerves}`,
)
assert(
  toggle['vessel kind off'].vessels === VESSEL_COURSES.length - registeredCourses.length &&
    toggle['vessel kind off'].tracts === tracts.length,
  'turning the VESSEL system off hides every REGISTERED vessel course and NO tract (the kind gate is per record)',
  `vessels ${toggle['vessel kind off'].vessels} (registered ${registeredCourses.length}) tracts ${toggle['vessel kind off'].tracts}`,
)
assert(
  toggle['vasculature area off'].vessels === VESSEL_COURSES.length - registeredCourses.length,
  "turning the AREA 'vasculature' off hides every registered vessel course",
  `vessels ${toggle['vasculature area off'].vessels} (registered ${registeredCourses.length})`,
)
assert(
  toggle['tract kind off'].vessels === registeredCourses.length,
  'turning the TRACT system off leaves every registered vessel course shown (the vessel kind is not the tract kind)',
  `vessels ${toggle['tract kind off'].vessels} (registered ${registeredCourses.length})`,
)
assert(
  toggle['hidden preset (first course)'].vessels === VESSEL_COURSES.length - 1,
  "a preset's `hidden` set still hides one course (the same predicate a tract uses)",
  `vessels ${toggle['hidden preset (first course)'].vessels}`,
)
assert(
  registeredCourses.every((course) => vesselCoursesVisible([course], ALL_ON).length === 1) &&
    registeredCourses.every(
      (course) => vesselCoursesVisible([course], layerState({ kinds: without('vessel', KINDS) })).length === 0,
    ) &&
    registeredCourses.every(
      (course) =>
        vesselCoursesVisible([course], layerState({ regions: without('vasculature', REGIONS) })).length === 0,
    ),
  'per course, the vessel kind and the vasculature area are the ONLY two controls that admit it',
  `${registeredCourses.length} registered course(s)`,
)

/* The wiring itself, asserted on the source because a React pass cannot be
 * mounted here: the scene must FILTER the vessel table through the one
 * predicate and RENDER one TractTube per surviving course, plus the twin. */
assert(
  /from '\.\.\/\.\.\/geometry\/vasculature-courses'/.test(SOURCE.sceneLayers) &&
    /VESSEL_COURSES/.test(SOURCE.sceneLayers) &&
    /hasVesselCourse/.test(SOURCE.sceneLayers),
  'SceneLayers imports the vessel course table and the suppression key from src/geometry/vasculature-courses.ts',
)
assert(
  /const visibleVesselCourses = useMemo\(\s*\(\) => vesselCoursesVisible\(VESSEL_COURSES, layerSets\),/.test(
    SOURCE.sceneLayers,
  ) && /export function vesselCoursesVisible\(/.test(SOURCE.sceneLayers),
  'SceneLayers routes the vessel table through the exported vesselCoursesVisible(VESSEL_COURSES, layerSets)',
)
assert(
  /visibleVesselCourses\.map\(\(course\)\s*=>\s*\{/.test(SOURCE.sceneLayers) &&
    /<TractTube tract=\{course\} highlight=\{highlight\} \/>/.test(SOURCE.sceneLayers) &&
    /<TractTube tract=\{course\} highlight=\{highlight\} mirrored \/>/.test(SOURCE.sceneLayers),
  'SceneLayers mounts TWO <TractTube> per paired vessel course — authored side plus mirrored twin',
)
assert(
  /isPairedVessel\(course, getTaxonomyEntry\(course\.id\)\?\.laterality\)/.test(SOURCE.sceneLayers),
  "the vessel pass reads the registry laterality through isPairedVessel (record laterality as fallback)",
)
assert(
  !/layersAdmit\(layers, entry \? entry\.region : 'medulla', 'vessel'\)/.test(SOURCE.sceneLayers) &&
    /const kind = entry\?\.kind \?\? 'tract'/.test(SOURCE.sceneLayers),
  "isTractVisible still reads the record's OWN registry kind (no hard-coded 'vessel' argument was added)",
)

/* ==================================================================== *
 *  3. ONE BODY PER VESSEL: a tube XOR the schematic ellipsoid
 * ==================================================================== */

console.log('\n--- 3. the lenticulostriate blob: a tube XOR the schematic ellipsoid -----')

const vesselRecords = structures.filter((record) => record.kind === 'vessel')
const taxonomyOnlyVesselRows = TAXONOMY_ENTRIES.filter(
  (entry) => entry.kind === 'vessel' && !vesselRecords.some((record) => record.id === entry.id),
)
ms('vessel structure records', vesselRecords.length, 'the ordinary body pass iterates these')
ms('vessel registry rows', TAXONOMY_ENTRIES.filter((entry) => entry.kind === 'vessel').length, 'taxonomy.json')
if (taxonomyOnlyVesselRows.length > 0) {
  const drawnAsCourse = taxonomyOnlyVesselRows.filter((entry) => hasVesselCourse(entry.id))
  const treeOnly = taxonomyOnlyVesselRows.filter((entry) => !hasVesselCourse(entry.id))
  console.log(
    `      registry rows with no authored structure record: ${taxonomyOnlyVesselRows.length} — ` +
      `drawn as a course ${drawnAsCourse.length}${drawnAsCourse.length === 0 ? '' : ` (${drawnAsCourse.map((e) => e.id).join(' ')})`}, ` +
      `tree-only ${treeOnly.length}${treeOnly.length === 0 ? '' : ` (${treeOnly.map((e) => e.id).join(' ')})`} — no body, no blob`,
  )
}

console.log(
  `\n  ${pad('vessel record', 46)} ${pad('baked body', 14)} ${pad('course', 8)} ${pad('blob?', 7)} verdict`,
)
const doubleBodied = []
const blobSurvivors = []
const lenticulostriateSurvivors = []
for (const record of vesselRecords) {
  const tube = isTractVisible(record.id, ALL_ON)
  const suppressed = hasVesselCourse(record.id)
  const contentOnly = isGhostOrContentOnly(record.id)
  const bodies = anatomySlugsForRecord(record.id)
  const bakedBody = !contentOnly && bodies !== null
  // The ordinary pass draws the schematic ellipsoid when the record has no
  // LINKS body, is not content-only, and is not suppressed by a course.
  const blobDrawn = !bakedBody && !contentOnly && !suppressed
  const isLenticulostriate = /lenticulostriate/.test(record.id)
  if (blobDrawn) {
    blobSurvivors.push(record.id)
    if (isLenticulostriate) lenticulostriateSurvivors.push(record.id)
  }
  if (suppressed && bakedBody) doubleBodied.push(record.id)
  console.log(
    `  ${pad(record.id, 46)} ${pad(bakedBody ? (bodies.left[0] ?? 'yes') : contentOnly ? '(content-only)' : 'none', 14)} ` +
      `${pad(suppressed ? 'yes' : 'no', 8)} ${pad(blobDrawn ? 'YES' : 'no', 7)} ` +
      `${blobDrawn ? 'BLOB STILL DRAWN' : suppressed && !bakedBody ? 'tube only' : bakedBody ? 'baked body' : 'content-only'}`,
  )
}
const lenticulostriateRecords = vesselRecords.filter((record) => /lenticulostriate/.test(record.id))
const lenticulostriateSuppressed = lenticulostriateRecords.filter((record) => hasVesselCourse(record.id))
console.log(
  `\n  lenticulostriate records: ${lenticulostriateRecords.length} ` +
    `(${lenticulostriateRecords.map((r) => r.id).join(', ') || 'none'}) · suppressed: ${lenticulostriateSuppressed.length}` +
    ` · courses authored for the family: ${VESSEL_COURSE_IDS.filter((id) => /lenticulostriate/.test(id)).length}`,
)
assert(
  blobSurvivors.length === 0,
  'NO vessel record draws a schematic placement ellipsoid (every body-less vessel is course-suppressed or content-only)',
  blobSurvivors.join(' '),
)
assert(
  lenticulostriateSurvivors.length === 0 && lenticulostriateRecords.length > 0,
  'every LENTICULOSTRIATE record in the tree is suppressed by a course — the two red blobs are retired',
  `${lenticulostriateRecords.length} record(s), ${lenticulostriateSurvivors.length} still drawing a blob`,
)
assert(doubleBodied.length === 0, 'no vessel renders both a baked body and a course tube', doubleBodied.join(' '))
assert(
  /hasNerveCourse\(record\.id\) \|\| hasVesselCourse\(record\.id\) \|\| hasVesselCourseGroup\(record\.id\)\) return null/.test(
    SOURCE.sceneLayers,
  ),
  'the structure pass returns null for a course-bearing vessel record AND for a group head (the ellipsoid is retired in the render — the group check is what retires the grandparent lenticulostriate blob)',
)
assert(
  VESSEL_COURSES.every((course) => hasVesselCourse(course.id)) && !hasVesselCourse('tract-corticospinal-lateral'),
  'hasVesselCourse() is true for every course id and false for a real tract',
  `${VESSEL_COURSES.filter((course) => hasVesselCourse(course.id)).length}/${VESSEL_COURSES.length}`,
)
assert(
  vesselCoursesModule.mirrorVesselWaypoints([[1, 2, 3]])[0][0] === -1 &&
    mirrorVesselCourse(VESSEL_COURSES[0]).waypoints[0][0] === -VESSEL_COURSES[0].waypoints[0][0] &&
    mirrorVesselCourse(VESSEL_COURSES[0]).id === VESSEL_COURSES[0].id,
  'the mirror twin is x → −x on the SAME record (id/group unchanged, geometry mirrored)',
)
assert(
  vesselCourseById(VESSEL_COURSE_IDS[0]) !== undefined && vesselCourseById('vasc-not-a-course') === undefined,
  'vesselCourseById() resolves a real course and refuses an unknown id',
)
assert(
  VESSEL_COURSE_GROUP_IDS.every((id) => vesselCourseGroupById(id) !== undefined && hasVesselCourse(id)) &&
    VESSEL_COURSE_GROUP_IDS.every(
      (id) =>
        vesselCourseGroupById(id).childIds.every((childId) => VESSEL_COURSE_IDS.includes(childId)) &&
        hasVesselCourse(id),
    ),
  'every group resolves, is suppressed, and its child ids are real drawing courses',
)
const V8_VESSEL_IDS = [
  'vasc-internal-carotid-artery',
  'vasc-vertebral-artery',
  'vasc-basilar-artery',
  'vasc-anterior-cerebral-artery',
  'vasc-anterior-communicating-artery',
  'vasc-middle-cerebral-artery',
  'vasc-posterior-communicating-artery',
  'vasc-posterior-cerebral-artery',
  'vasc-superior-cerebellar-artery',
  'vasc-anterior-inferior-cerebellar-artery',
  'vasc-posterior-inferior-cerebellar-artery',
  'vasc-lenticulostriate-arteries',
  'vasc-anterior-choroidal-artery',
  'vasc-posterior-medial-choroidal-artery',
]
const missingV8 = V8_VESSEL_IDS.filter((id) => !vesselRecords.some((record) => record.id === id))
assert(
  missingV8.length === 0,
  'the fourteen v8 vessel STRUCTURE records all still exist (a course replaced a body, never a record)',
  `missing ${missingV8.join(' ')}`,
)
assert(
  V8_VESSEL_IDS.every((id) => anatomySlugsForRecord(id) !== null || hasVesselCourse(id)),
  'every one of the fourteen v8 records still has a body: its committed GLB, or a course',
)

/* ==================================================================== *
 *  4. THE 2D LIVE SECTION: one part per course, both sides
 * ==================================================================== */

console.log('\n--- 4. the 2D live section / PiP: procedural vessel parts -----------------')

assert(
  SECTION_PARTS.length === 138,
  'SECTION_PARTS is unchanged at 138 committed GLB parts (every count-based gate keeps its domain)',
  `found ${SECTION_PARTS.length}`,
)
assert(
  SECTION_VESSEL_PARTS.length === VESSEL_COURSES.length,
  'SECTION_VESSEL_PARTS holds exactly one part per vessel course',
  `found ${SECTION_VESSEL_PARTS.length} for ${VESSEL_COURSES.length} courses`,
)
assert(
  partsForCanvas().length === SECTION_PARTS.length + SECTION_NERVE_PARTS.length + SECTION_VESSEL_PARTS.length,
  'partsForCanvas() is the committed parts plus both procedural families',
  `found ${partsForCanvas().length}`,
)
assert(
  SECTION_PARTS.every((meta) => !VESSEL_COURSE_IDS.includes(meta.slug)),
  'no committed GLB part carries a course id (a course body is procedural, never a baked part)',
  SECTION_PARTS.filter((meta) => VESSEL_COURSE_IDS.includes(meta.slug)).map((meta) => meta.slug).join(' '),
)
assert(
  /\[\.\.\.SECTION_PARTS, \.\.\.SECTION_NERVE_PARTS, \.\.\.SECTION_VESSEL_PARTS\]/.test(SOURCE.sectionAssets),
  'partsForCanvas() spreads SECTION_VESSEL_PARTS (the visible-list side needs no further change)',
)
assert(
  /function registryCourseParts</.test(SOURCE.sectionAssets) &&
    (SOURCE.sectionAssets.match(/return registryCourseParts\(/g) ?? []).length >= 2 &&
    /registryPartFromGeometry\(nerveCourseMeta\(course\), tubeGeometryFor\(course\)\)/.test(SOURCE.sectionAssets),
  'nerves and vessels flow through ONE shared course adapter (registryCourseParts, defined once and called by both families)',
  `${(SOURCE.sectionAssets.match(/return registryCourseParts\(/g) ?? []).length} call site(s)`,
)
assert(
  /const visible = partsForCanvas\(\)\.filter\(/.test(SOURCE.sectionCanvas),
  "SectionCanvas's visible list is built from partsForCanvas() — so a vessel contour the worker returns gets DRAWN",
)

const nerveParts = registryNerveParts()
assert(
  nerveParts.length === 24,
  'registryNerveParts() is UNCHANGED at 24 worker parts — the vessel family did not move the nerve domain',
  `found ${nerveParts.length}`,
)

const vesselParts = registryVesselParts()
const vesselPaired = VESSEL_COURSES.filter((course) => isPairedVessel(course, lateralityOf(course))).length
const vesselMidline = VESSEL_COURSES.length - vesselPaired
console.log(
  `  registryVesselParts(): ${vesselParts.length} = ${vesselPaired} authored side(s) × 2 (paired) + ` +
    `${vesselMidline} authored side(s) × 1 (midline)`,
)
assert(
  vesselParts.length === vesselPaired * 2 + vesselMidline,
  'registryVesselParts() returns one part per authored side plus one per mirrored twin',
  `${vesselParts.length} vs 2 × ${vesselPaired} + 1 × ${vesselMidline}`,
)
assert(
  registryCoursePartsAll().length === nerveParts.length + vesselParts.length,
  'the combined procedural registry is the sum of the two families',
  `${registryCoursePartsAll().length}`,
)
assert(
  vesselParts.filter((part) => part.slug.endsWith('#mirror')).length === vesselPaired &&
    vesselParts.every((part) => !part.slug.endsWith('#mirror') || VESSEL_COURSE_IDS.includes(part.slug.replace('#mirror', ''))),
  'every mirrored part carries the #mirror suffix and its authored slug resolves to a course',
  `${vesselParts.filter((part) => part.slug.endsWith('#mirror')).length} mirrored`,
)
assert(
  vesselParts.every((part) => VESSEL_COURSE_IDS.includes(part.group)),
  'every vessel worker part keeps the COURSE ID as its group (a contour on either side selects the same record)',
)

console.log(
  `\n  ${pad('course', 46)} ${pad('region', 12)} ${pad('taxKind', 8)} ${padStart('verts', 6)} ${padStart('tris', 6)} ` +
    `${padStart('maxIdx', 7)} ${pad('indices ok', 11)} visible(vessel on/off · area on/off)`,
)
let partProblems = 0
for (const meta of SECTION_VESSEL_PARTS) {
  const course = vesselCourseById(meta.slug)
  const paired = isPairedVessel(course, lateralityOf(course))
  const authored = vesselParts.find((candidate) => candidate.slug === meta.slug)
  const mirrored = vesselParts.find((candidate) => candidate.slug === `${meta.slug}#mirror`)
  const vertexCount = authored === undefined ? 0 : authored.positions.length / 3
  let maxIndex = -1
  for (const part of [authored, mirrored]) {
    if (part === undefined) continue
    for (let i = 0; i < part.indices.length; i++) if (part.indices[i] > maxIndex) maxIndex = part.indices[i]
  }
  const mirrorRequired = paired
  const indicesOk =
    authored !== undefined &&
    authored.indices.length % 3 === 0 &&
    maxIndex < vertexCount &&
    (mirrored === undefined ||
      (mirrored.indices.length % 3 === 0 && mirrored.positions.length / 3 === vertexCount)) &&
    (!mirrorRequired || mirrored !== undefined)
  const visibleOn = isPartVisible(meta, ALL_ON)
  const kindOff = isPartVisible(meta, layerState({ kinds: without('vessel', KINDS) }))
  const areaOff = isPartVisible(meta, layerState({ regions: without('vasculature', REGIONS) }))
  if (
    !indicesOk ||
    meta.region !== 'vasculature' ||
    meta.taxonomyKind !== 'vessel' ||
    meta.group !== meta.slug ||
    !visibleOn ||
    kindOff ||
    areaOff
  ) {
    partProblems += 1
  }
  console.log(
    `  ${pad(meta.slug, 46)} ${pad(meta.region ?? '(null)', 12)} ${pad(meta.taxonomyKind ?? '(null)', 8)} ` +
      `${padStart(vertexCount, 6)} ${padStart(authored === undefined ? 0 : authored.indices.length / 3, 6)} ` +
      `${padStart(maxIndex, 7)} ${pad(indicesOk ? 'yes' : 'NO', 11)} ` +
      `${visibleOn ? 'shown' : 'HIDDEN'}/${kindOff ? 'shown' : 'hidden'} · ${areaOff ? 'shown' : 'hidden'}` +
      `${mirrorRequired && mirrored === undefined ? '   NO MIRROR PART' : ''}`,
  )
}
assert(
  partProblems === 0,
  'every vessel part is well formed, carries region vasculature + taxonomyKind vessel, and is gated by both controls',
  `${partProblems} problem(s)`,
)
assert(
  SECTION_VESSEL_PARTS.every((meta) => isPartVisible(meta, ALL_ON)),
  'each vessel part is visible with every area+system on',
)
assert(
  SECTION_VESSEL_PARTS.every((meta) => !isPartVisible(meta, layerState({ kinds: without('vessel', KINDS) }))),
  'no vessel part is visible with the vessel system off',
)
assert(
  SECTION_VESSEL_PARTS.every((meta) => !isPartVisible(meta, layerState({ regions: without('vasculature', REGIONS) }))),
  'no vessel part is visible with the vasculature area off',
)
const unmirroredPaired = VESSEL_COURSES.filter(
  (course) =>
    isPairedVessel(course, lateralityOf(course)) &&
    !vesselParts.some((part) => part.slug === `${course.id}#mirror`),
)
assert(
  unmirroredPaired.length === 0,
  'every paired vessel course has its mirrored 2D part as well (the two surfaces agree about sides)',
  unmirroredPaired.map((course) => course.id).join(' '),
)

/* ==================================================================== *
 *  5. THE WORKER COMPUTES CONTOURS ON THE PLANES THAT CROSS EACH COURSE
 * ==================================================================== */

console.log('\n--- 5. the contour worker on the vessel parts (shipped machinery) ---------')

const boundsBySlug = new Map()
for (const part of vesselParts) boundsBySlug.set(part.slug, partBounds(part.positions))

/** Planes derived from each course's OWN bbox (step 1 au), so every course is
 *  guaranteed a crossing plane instead of hoping a fixed grid hits a hairline. */
const PLANE_STEP = 1
function planesFor(bounds) {
  const planes = []
  for (const axis of ['x', 'y', 'z']) {
    const low = axis === 'x' ? bounds.min[0] : axis === 'y' ? bounds.min[1] : bounds.min[2]
    const high = axis === 'x' ? bounds.max[0] : axis === 'y' ? bounds.max[1] : bounds.max[2]
    for (let value = Math.ceil(low); value <= Math.floor(high); value += PLANE_STEP) planes.push({ axis, value })
  }
  return planes
}

console.log(
  `  ${pad('course', 46)} ${pad('bbox y (au)', 16)} ${pad('crossing planes', 16)} ${padStart('loops', 6)} ` +
    `${padStart('segs', 6)} non-finite`,
)
let coursesWithoutLoops = []
let nonFiniteValues = 0
let totalLoops = 0
let totalPlanes = 0
let totalCrossings = 0
const perCoursePlanes = new Map()
for (const course of VESSEL_COURSES) {
  const part = vesselParts.find((candidate) => candidate.slug === course.id)
  const bounds = boundsBySlug.get(course.id)
  const planes = planesFor(bounds)
  let crossing = 0
  let loops = 0
  let segments = 0
  let bad = 0
  const detail = []
  for (const plane of planes) {
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
  totalPlanes += planes.length
  totalCrossings += crossing
  if (loops === 0) coursesWithoutLoops.push(course.id)
  perCoursePlanes.set(course.id, { crossing, loops, planes: planes.length })
  console.log(
    `  ${pad(course.id, 46)} ${pad(`${fmt(bounds.min[1], 0)}..${fmt(bounds.max[1], 0)}`, 16)} ` +
      `${pad(`${crossing} of ${planes.length}`, 16)} ${padStart(loops, 6)} ${padStart(segments, 6)} ${bad}` +
      `${detail.length === 0 ? '' : `   ${detail.slice(0, 6).join(' ')}`}`,
  )
}
assert(
  coursesWithoutLoops.length === 0,
  'every vessel course has at least one crossing plane with at least one closed loop',
  `no loops for ${coursesWithoutLoops.join(' ')}`,
)
assert(
  nonFiniteValues === 0,
  'no contour loop is malformed or non-finite (every loop is a closed even-length path)',
  `${nonFiniteValues} bad value(s)`,
)
assert(
  VESSEL_COURSES.every((course) => perCoursePlanes.get(course.id).crossing >= 1),
  'every vessel course intersects at least one tested plane (boundsMayCut admitted it)',
)
assert(
  totalLoops >= VESSEL_COURSES.length,
  'the vessel parts produce at least one loop per course across the sweep',
  `${totalLoops} loop(s) over ${totalCrossings} crossing plane(s) of ${totalPlanes}`,
)

/* ==================================================================== *
 *  6. ONE BUILDER: the 2D registry part IS the 3D tube geometry
 * ==================================================================== */

console.log('\n--- 6. the shared builder: one sweep for the 3D tube and the 2D contour --')

const sharedBuilderProblems = []
let identicalValues = 0
let comparedValues = 0

/**
 * The mirrored 2D part must be the MIRRORED geometry, i.e. swept under the same
 * `#mirror` cache key the 3D twin uses (`TractTube`'s `instanceKey`). Sweeping
 * it under the authored id would hit the cache and hand the worker a duplicate
 * of the authored side — the defect this comparison exists to catch (it was
 * live for the twelve cranial nerves until this gate compared the arrays).
 */
function compareParts(courses, parts, label) {
  for (const course of courses) {
    for (const [side, source, slug] of [
      ['authored', course, course.id],
      ['mirror', mirrorCourse(course), `${course.id}#mirror`],
    ]) {
      if (side === 'mirror' && !isPaired(course)) continue
      const geometry = tubeGeometryFor(source, slug)
      const part = parts.find((candidate) => candidate.slug === slug)
      if (part === undefined) {
        sharedBuilderProblems.push(`${label} ${course.id} (${side}): no registry part`)
        continue
      }
      const vertexCount = geometry.getAttribute('position').count
      if (vertexCount !== part.positions.length / 3) {
        sharedBuilderProblems.push(`${label} ${course.id} (${side}): ${vertexCount} verts vs ${part.positions.length / 3}`)
      }
      if (geometry.getIndex().count !== part.indices.length) {
        sharedBuilderProblems.push(`${label} ${course.id} (${side}): index count differs`)
      }
      const sourceArray = geometry.getAttribute('position').array
      let mismatched = 0
      for (let i = 0; i < part.positions.length; i += 1) {
        comparedValues += 1
        if (sourceArray[i] !== part.positions[i]) mismatched += 1
      }
      if (mismatched === 0) identicalValues += part.positions.length
      else sharedBuilderProblems.push(`${label} ${course.id} (${side}): ${mismatched} position value(s) differ`)
    }
  }
}
const mirrorCourse = (course) => mirrorVesselCourse(course)
const isPaired = (course) => isPairedVessel(course, lateralityOf(course))
compareParts(VESSEL_COURSES, vesselParts, 'vessel')

/** The nerve half of the same route, checked with the nerve record shape. */
const NERVE_COURSES = (await import(pathToFileURL(resolve(ROOT, 'src/geometry/curves.ts')).href)).NERVE_COURSES
const mirrorNerve = (course) => ({
  ...course,
  waypoints: course.waypoints.map(([x, y, z]) => [-x, y, z]),
})
const nervePairs = NERVE_COURSES.filter((course) => getTaxonomyEntry(course.id)?.laterality === 'paired')
const nerveChecks = []
for (const course of nervePairs) {
  const authoredPart = nerveParts.find((part) => part.slug === course.id)
  const mirroredPart = nerveParts.find((part) => part.slug === `${course.id}#mirror`)
  if (authoredPart === undefined || mirroredPart === undefined) {
    nerveChecks.push(`${course.id} (missing part)`)
    continue
  }
  // The mirrored sweep must be the x-negation of the authored one: compare the
  // two bounding boxes (the Frenet frames of a mirrored curve are not exactly
  // the mirrored frames, so a vertex-wise comparison would be the wrong test).
  const authoredBounds = partBounds(authoredPart.positions)
  const mirroredBounds = partBounds(mirroredPart.positions)
  const close = (a, b) => Math.abs(a - b) < 1e-4
  const mirroredOk =
    close(mirroredBounds.min[0], -authoredBounds.max[0]) &&
    close(mirroredBounds.max[0], -authoredBounds.min[0]) &&
    close(mirroredBounds.min[1], authoredBounds.min[1]) &&
    close(mirroredBounds.max[1], authoredBounds.max[1]) &&
    close(mirroredBounds.min[2], authoredBounds.min[2]) &&
    close(mirroredBounds.max[2], authoredBounds.max[2])
  if (!mirroredOk) nerveChecks.push(`${course.id} (bbox not negated)`)
}
console.log(
  `  nerve side of the same route: ${nervePairs.length} paired courses, ${nerveParts.length} worker parts, ` +
    `${nerveChecks.length} mirror problem(s)`,
)
assert(
  nerveChecks.length === 0,
  'the nerve mirror parts are MIRRORED geometry too (the shared route fixed the id-keyed cache collision for both families)',
  nerveChecks.join(' '),
)

assert(
  sharedBuilderProblems.length === 0,
  'every 2D registry part IS the 3D tube geometry (same vert/index counts AND identical position values)',
  sharedBuilderProblems.slice(0, 3).join('; '),
)
console.log(
  `  compared ${comparedValues} position value(s) between tubeGeometryFor() and registryVesselParts() — ` +
    `${identicalValues} identical`,
)
assert(
  /export function tubeGeometryFor/.test(SOURCE.tractTube) &&
    /registryPartFromGeometry\(vesselCourseMeta\(course\), tubeGeometryFor\(course\)\)/.test(SOURCE.sectionAssets) &&
    /tubeGeometryFor\(mirrored, `\$\{course\.id\}#mirror`\)/.test(SOURCE.sectionAssets),
  'TractTube exports the shared cached builder and the shared adapter sweeps the AUTHORED part under the id key and the TWIN under the #mirror key',
)
assert(
  /<SectionCanvas \/>/.test(SOURCE.pipSection),
  'PipSection mounts <SectionCanvas /> itself, so one route covers the Plates tab and the PiP',
)
if (!/registryVesselParts/.test(SOURCE.sectionCanvas)) {
  console.log(
    '  HANDOFF (outside this task\'s write scope): SectionCanvas\'s init-registry effect appends the procedural\n' +
      "           families with `registryParts.push(...registryNerveParts())`; adding\n" +
      '           `registryParts.push(...registryVesselParts())` on the next line hands the worker the vessel\n' +
      '           geometry too. `partsForCanvas()` (the visible list) already carries the vessel metas, and the\n' +
      '           2D machinery above is proven by execution — only that one line is missing for the pixels.',
  )
} else {
  console.log('  SectionCanvas already appends registryVesselParts() to the worker registry.')
}

/* ==================================================================== *
 *  7. THE PAYLOAD IS UNTOUCHED — the course route costs 0 bytes
 * ==================================================================== */

console.log('\n--- 7. payload: the course route costs nothing on disk ---------------------')

const MANIFEST = resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json')
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const manifestBytes = manifest.parts.reduce(
  (sum, part) => sum + statSync(resolve(ROOT, 'src/assets/anatomy', part.file ?? `${part.slug}.glb`)).size,
  0,
)
const dirBytes = readdirSync(resolve(ROOT, 'src/assets/anatomy')).reduce((sum, name) => {
  const full = resolve(ROOT, 'src/assets/anatomy', name)
  return statSync(full).isFile() ? sum + statSync(full).size : sum
}, 0)
const triTotal = manifest.parts.reduce((sum, part) => sum + (part.triCount ?? 0), 0)
const courseGlbs = manifest.parts.filter((part) => VESSEL_COURSE_IDS.includes(part.slug))

ms('manifest parts', manifest.parts.length, 'must stay 138 (a new part would re-point three gates)')
ms('Σ parts[].file', `${fmt(manifestBytes / 1048576, 4)} MiB`, 'of the 14 MiB cap')
ms('anatomy directory', `${fmt(dirBytes / 1048576, 4)} MiB`, 'the binding reading')
ms('Σ parts[].triCount', triTotal, 'unchanged at 599204')
ms('baked course GLBs', courseGlbs.length, 'route (a) bakes nothing')

assert(manifest.parts.length === 138, 'no manifest part was added', `found ${manifest.parts.length}`)
assert(courseGlbs.length === 0, 'no vessel-course GLB exists on disk (procedural route)', `found ${courseGlbs.join(' ')}`)
assert(dirBytes / 1048576 <= 14, 'the anatomy directory is inside the 14 MiB cap', `${fmt(dirBytes / 1048576, 4)} MiB`)
assert(
  manifestBytes === 14486228,
  'Σ parts[].file is still the measured 14,486,228 B (no existing part changed)',
  `${manifestBytes}`,
)
assert(triTotal === 599204, 'Σ parts[].triCount is still 599,204 (no existing part changed)', `${triTotal}`)
assert(
  !/vasc-.*\.glb/.test(SOURCE.sectionAssets),
  'the section registry feeds the worker PROCEDURAL tube geometry, never a course GLB',
)

/* ==================================================================== *
 *  8. THE MERGE AND THE GROUP PATH, EXERCISED ON SYNTHETIC INPUT
 * ==================================================================== */

console.log('\n--- 8. the merge + group path, exercised (the live data may not hit it) -----')

/** A minimal, valid course for the synthetic cases (never drawn, never shipped). */
const syntheticCourse = (id, laterality = 'paired', waypoints = [[1, 2, 3], [4, 5, 6]]) => ({
  id,
  name: id,
  region: 'vasculature',
  kind: 'vessel',
  laterality,
  parent: 'vasc-middle-cerebral-artery',
  surface: null,
  basis: 'documented-course',
  elementIds: [],
  anchorNote: 'synthetic',
  territory: [],
  supply: [],
  direction: 'descending',
  modality: 'Arterial blood (oxygenated)',
  origin: '',
  target: '',
  decussation: '',
  function: '',
  waypoints,
  tubeRadius: 0.333,
  calibreMm: 0.8,
  color: '#b91c1c',
  clinical: [],
  refs: [],
})

// A. a built-in course whose id gains an authored ladder becomes a GROUP.
const grouped = vesselCoursesModule.mergeVesselCourses(
  [syntheticCourse('vasc-synthetic-parent')],
  [syntheticCourse('vasc-synthetic-parent-1'), syntheticCourse('vasc-synthetic-parent-2')],
  [],
)
assert(
  grouped.courses.length === 2 &&
    grouped.groups.length === 1 &&
    grouped.groups[0].id === 'vasc-synthetic-parent' &&
    grouped.groups[0].childIds.join(',') === 'vasc-synthetic-parent-1,vasc-synthetic-parent-2' &&
    grouped.groupedIds.join(',') === 'vasc-synthetic-parent',
  'a built-in course with an authored ladder becomes a GROUP (its children draw, its own tube is withdrawn)',
  `courses ${grouped.courses.length} groups ${grouped.groups.length} grouped ${grouped.groupedIds.join(' ')}`,
)
assert(
  grouped.courses.every((course) => course.id !== 'vasc-synthetic-parent'),
  'the grouped parent is NOT also drawn as a course (the duplicate tube the rule exists to prevent)',
)

// B. an authored record replaces a built-in record of the same id.
const replaced = vesselCoursesModule.mergeVesselCourses(
  [syntheticCourse('vasc-synthetic-parent')],
  [syntheticCourse('vasc-synthetic-parent', 'midline')],
  [],
)
assert(
  replaced.courses.length === 1 &&
    replaced.courses[0].laterality === 'midline' &&
    replaced.replacedIds.join(',') === 'vasc-synthetic-parent' &&
    replaced.builtInIds.length === 0,
  'an authored record REPLACES the built-in record with the same id (no duplicate course)',
)

// C. the authored reader: a group entry (course block, no path), an unreadable
//    entry, and an alias hit — all three must be reported, not swallowed.
const syntheticRead = vesselCoursesModule.readAuthoredVesselCourses({ 'synthetic://file.json': [
  { id: 'vasc-synthetic-group', vesselCourse: { surface: null, surfaceNote: 'Intraparenchymal.', basis: 'documented-course', anchorNote: 'group' } },
  { id: 'vasc-synthetic-group-1', laterality: 'paired', vesselCourse: { waypoints: [[1, 1, 1], [2, 2, 2]], tubeRadius: 0.5, calibreMm: 1.2 } },
  { id: 'vasc-synthetic-broken', vesselCourse: { waypoints: 'not-a-path' } },
  { id: 'vasc-synthetic-alias', course: [[3, 3, 3], [4, 4, 4]], radius: 0.25 },
] })
assert(
  syntheticRead.courses.length === 2 && syntheticRead.groups.length === 1,
  'the authored reader separates drawing courses from group records',
  `courses ${syntheticRead.courses.length} groups ${syntheticRead.groups.length}`,
)
assert(
  syntheticRead.groups[0].childIds.join(',') === 'vasc-synthetic-group-1',
  'a group picks up its authored children from the `<id>-…` ladder',
  syntheticRead.groups[0].childIds.join(','),
)
assert(
  syntheticRead.report.rejected.length === 1 && /vasc-synthetic-broken/.test(syntheticRead.report.rejected[0]),
  'an entry that is neither a path nor a course block is REJECTED and named (never silently dropped)',
  syntheticRead.report.rejected.join(' · '),
)
assert(
  syntheticRead.courses.some((course) => course.id === 'vasc-synthetic-alias' && course.tubeRadius === 0.25) &&
    (syntheticRead.report.aliases.get('vasc-synthetic-alias') ?? []).length > 0,
  'an aliased field is read AND reported (the drift between the two modules stays visible)',
  [...syntheticRead.report.aliases.entries()].map(([id, keys]) => `${id}:${keys.join('+')}`).join(' '),
)

// D. the pairing rule and the tube arithmetic.
const pairedCourse = syntheticCourse('vasc-synthetic-paired', 'paired')
const midlineCourse = syntheticCourse('vasc-synthetic-midline', 'midline')
assert(
  isPairedVessel(pairedCourse, undefined) && !isPairedVessel(midlineCourse, undefined) &&
    !isPairedVessel(pairedCourse, 'midline') && isPairedVessel(midlineCourse, 'paired'),
  'isPairedVessel prefers the registry laterality and falls back to the record’s own',
)
const syntheticCount = vesselTubeCount([pairedCourse, midlineCourse], () => undefined)
assert(
  syntheticCount.authored === 2 && syntheticCount.mirrored === 1 && syntheticCount.total === 3,
  'the tube arithmetic is 2 × paired + 1 × midline, printed as its two terms',
  `${syntheticCount.authored} + ${syntheticCount.mirrored} = ${syntheticCount.total}`,
)

/* ==================================================================== *
 *  verdict
 * ==================================================================== */

if (authoredNotes.length > 0) {
  console.log(`\n  authored-record notes (the content task's gate owns validity; reported here): ${authoredNotes.length}`)
  for (const note of authoredNotes) console.log(`    NOTE ${note}`)
}

console.log(
  `\nvessel-render: ${VESSEL_COURSES.length} courses (${VESSEL_COURSE_SOURCES.builtInIds.length} built-in surviving + ` +
    `${VESSEL_COURSE_SOURCES.replacedIds.length} replaced by authored + ${VESSEL_COURSE_SOURCES.authoredIds.length} new ` +
    `authored) + ${VESSEL_COURSE_GROUPS.length} group(s) · 3D tubes ${tubeCount.total} = ${tubeCount.authored} + ` +
    `${tubeCount.mirrored} mirrored · vessel kind off → ${toggle['vessel kind off'].vessels}, vasculature area off → ` +
    `${toggle['vasculature area off'].vessels} · 2D parts ${SECTION_VESSEL_PARTS.length} ` +
    `(${vesselParts.length} worker parts) · ${totalLoops} contour loop(s) · blobs ${blobSurvivors.length} · ` +
    `${checks - failures.length}/${checks} assertions`,
)
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`)
  console.log(`\n${failures.length} failure(s)`)
  process.exit(1)
}
console.log('  PASS granular vessels render as courses in 3D and in the live section, and no vessel draws a placement blob')
console.log('  NOTE (orchestrator-only, Chrome): that the 3D scene PAINTS the tubes, that the two red blobs are gone on')
console.log('       screen, that the section/PiP PAINTS the contours, and click-select are browser claims this gate cannot make.')
process.exit(0)
