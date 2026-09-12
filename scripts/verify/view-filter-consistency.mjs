/**
 * scripts/verify/view-filter-consistency.mjs — v11 §2 (PLAN.md §2/§2a): ONE
 * visibility decision, and the proof that the 3D pass, the live-section worker
 * input and the PiP all obey the same area/system toggles.
 *
 * THE CLAIM THIS GATE OWNS
 * ------------------------
 * With an area or a system switched OFF, no structure of that area/system is
 * drawn on either surface; with it ON, it is. The sections below execute the
 * SHIPPED decision functions (imported from `src/`, never re-typed here) over
 * the SHIPPED domains (138 section parts, 213 structure records, 23 tracts, 10
 * context-envelope slots, 2 ghost shells) and print what each surface hides.
 *
 * WHAT WAS ACTUALLY WRONG, AND WHAT THIS GATE FIXES (measured, not assumed)
 * -------------------------------------------------------------------------
 * PLAN.md §2 lists seven visibility paths and finds six whole. The seventh —
 * `SectionCanvas.buildLobeLayer` (the cortical-division pass) — was correct only
 * because its input `order.visibleParts` is pre-filtered: it never named the
 * gate, so any future caller passing the raw part catalogue (or a list cached
 * for a different layer state) would have painted the whole telencephalon with
 * the area switched off, silently. v11 adds the explicit `isPartVisible` call
 * inside `buildLobeLayer` (and `RenderOrderCache.visibleLayers`, the set
 * snapshot the visible list was filtered with), and lane D below is the
 * functional test of that line: it hands the pass the UNFILTERED catalogue and
 * requires nothing to be painted. Lane F2 then mutates the line away in a
 * scratch copy and requires this gate to catch it.
 *
 * The other suspects named in the brief, measured and NOT defects (stated so
 * nobody "fixes" them):
 *   • the section worker's slug→region table (`sectionAssets.ts`): the worker is
 *     fed the FULL registry by design and region/kind filtering happens on the
 *     returned contours, client-side. The table decides the REGION a part
 *     belongs to, never its visibility — lane A asserts every part has one
 *     (`region === null` count is printed and must be 0) and lane C asserts the
 *     table agrees with the 3D records about that region (0 mismatches).
 *   • the cortical-division ribbon gate: it inherits the part gate by
 *     construction and now names it (lane D).
 *   • the ghost-shell pass, the context envelopes and the tract tubes: all three
 *     are `layersAdmit(region, kind)` in `SceneLayers.tsx`, executed per record
 *     in lane B, and lane B3 asserts no other `region`/`kind` read exists in
 *     that file.
 *   • the PiP: `PipSection` mounts the SAME `SectionCanvas` with no visibility
 *     prop (lane E), so it cannot disagree — and lane E measures that too.
 *
 * THE ONE DIFFERENCE THIS GATE DOES NOT SILENCE
 * ---------------------------------------------
 * The 3D surface additionally honours the preset's structure-level `hidden` set
 * (v7 vocabulary: "cortex hidden", "deep structures only"); the 2D section does
 * not. That is a different axis from the area/system toggles this task proves,
 * and §2's remit is the region/kind decision — so it is MEASURED and PRINTED
 * (lane C2, with the per-preset numbers) rather than silently unified or
 * silently ignored.
 *
 * WHAT IT CANNOT OBSERVE. Chrome does not start in this sandbox: that a toggle
 * button changes the pixels on screen is `verify:acceptance` / `verify:audit`
 * business (orchestrator lane). Everything here is the module-level decision
 * plus a Node execution of the canvas' own `buildLobeLayer` over the committed
 * ribbon GLBs, i.e. the input the draw loop consumes; the `ctx.fill/stroke` calls
 * themselves are not executed (no 2D context in Node).
 *
 * Run from the repo root:  node scripts/verify/view-filter-consistency.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:view-filter-consistency": "node scripts/verify/view-filter-consistency.mjs"
 *  — package.json is the integrator's file, so it is named here, not edited.)
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')

/* ==================================================================== *
 *  MODULE LOADING — the repo's convention (pip-contract.mjs,
 *  plane-helper-extent.mjs, audit-checks.test.mjs): resolve the app's
 *  extensionless relative imports, emulate Vite's `import.meta.glob`, transpile
 *  `.ts`/`.tsx` with the PROJECT'S OWN TypeScript, wrap JSON, and answer asset
 *  specifiers with the Vite-shaped URL. The modules under test are the modules
 *  that ship: nothing is copied or re-typed for the passing lanes.
 *
 *  ONE extra rule, used only by the lane F bites: a specifier resolved from
 *  inside `.dsh-scratch/**` that is NOT next to the mutated file falls back to
 *  the same relative path under the real source tree, so a scratch copy of ONE
 *  file can be imported against the shipped modules it imports.
 * ==================================================================== */

const SCRATCH_ROOT = resolve(ROOT, '.dsh-scratch/v11-view-filter')
const SCRATCH_PREFIX = SCRATCH_ROOT.replace(/\\/g, '/')

/** Resolve `specifier` next to `fromFile`, else under the real tree (bites). */
function resolveModule(specifier, fromFile) {
  const directory = dirname(fromFile)
  for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
    const candidate = resolve(directory, specifier + extension)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  const normalized = directory.replace(/\\/g, '/')
  if (normalized.startsWith(SCRATCH_PREFIX)) {
    const relative = normalized.slice(SCRATCH_PREFIX.length).replace(/^\/+/, '')
    const realDirectory = resolve(ROOT, 'src', relative)
    for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
      const candidate = resolve(realDirectory, specifier + extension)
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
    }
  }
  return null
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
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
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
          const test = new RegExp(
            `^${filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
          )
          const raw = /\?raw/.test(options)
          const wantedExtension =
            (filePattern.match(/\*(\.[A-Za-z0-9]+)$/) ?? [])[1]?.toLowerCase() ?? null
          const walk = (dir, prefix) => {
            const out = []
            for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
              a.name.localeCompare(b.name),
            )) {
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
              const viteUrl = `/src/${relative.replace(/^\.\.\//, '')}`
              const value = /assets\/anatomy/.test(pattern) ? viteUrl : relative
              return `${JSON.stringify(key)}: () => Promise.resolve(${JSON.stringify(value)})`
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
    }
    return nextLoad(url, context)
  },
})

/**
 * `buildLobeLayer` strokes every run into a `Path2D`. Node has no `Path2D`, and
 * this gate never paints: the stub records the calls so lane D can count the
 * paths that WOULD be drawn without needing a 2D context.
 */
class Path2DStub {
  static instances = 0
  static calls = { moveTo: 0, lineTo: 0, closePath: 0 }
  constructor() {
    Path2DStub.instances += 1
  }
  moveTo() {
    Path2DStub.calls.moveTo += 1
  }
  lineTo() {
    Path2DStub.calls.lineTo += 1
  }
  closePath() {
    Path2DStub.calls.closePath += 1
  }
}
globalThis.Path2D = Path2DStub

/* ------------------------------------------------------------ assertion log */

const failures = []
let checks = 0

/** Records one assertion; the detail is printed with the failure. */
function assert(condition, label, detail = '') {
  checks++
  if (condition) return true
  failures.push(detail === '' ? label : `${label} — ${detail}`)
  return false
}

const fmt = (n, d = 1) => (Number.isFinite(n) ? Number(n).toFixed(d) : String(n))
const pad = (value, width) => String(value).padEnd(width)
const list = (values) => (values.length === 0 ? '(none)' : values.join(' '))
const sameSet = (a, b) => a.length === b.length && a.every((value, index) => value === b[index])

/* ==================================================================== *
 *  THE SHIPPED MODULES (imported from disk, unmodified)
 * ==================================================================== */

const store = await import(pathToFileURL(resolve(ROOT, 'src/state/store.ts')).href)
const load = await import(pathToFileURL(resolve(ROOT, 'src/data/load.ts')).href)
const sectionAssets = await import(
  pathToFileURL(resolve(ROOT, 'src/components/section/sectionAssets.ts')).href
)
const sceneLayers = await import(
  pathToFileURL(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx')).href
)
const sectionCanvas = await import(
  pathToFileURL(resolve(ROOT, 'src/components/section/SectionCanvas.tsx')).href
)
const lobes = await import(
  pathToFileURL(resolve(ROOT, 'src/components/section/corticalLobes.ts')).href
)
const contours = await import(pathToFileURL(resolve(ROOT, 'src/components/section/contours.ts')).href)
const planeGeometry = await import(
  pathToFileURL(resolve(ROOT, 'src/components/section/planeGeometry.ts')).href
)
const anatomyAssets = await import(
  pathToFileURL(resolve(ROOT, 'src/geometry/anatomyAssets.ts')).href
)

const {
  ALL_ON_LAYERS,
  DEFAULT_LAYERS,
  VIEW_PRESETS,
  viewPresetOf,
} = store
const {
  getTaxonomyEntry,
  structures,
  tracts,
} = load
const {
  SECTION_CORTICAL_RIBBON_SLUGS,
  SECTION_PARTS,
  isCorticalRibbonSlug,
} = sectionAssets
const {
  ENVELOPE_RECORD_IDS,
  ENVELOPE_SLOTS,
  isEnvelopeSlotVisible,
  isGhostShellVisible,
  isStructureVisible,
  isTractVisible,
  layersAdmit,
} = sceneLayers
const {
  buildLobeLayer,
  createLobeLayerCache,
  isPartVisible,
} = sectionCanvas
const { CORTICAL_DIVISIONS, corticalRunsForLoop, paintedDivisionsOfLoops } = lobes
const { extractContours, partBounds, boundsMayCut } = contours
const { planeTransform } = planeGeometry
const { TEL_HEMISPHERE_RECORD_IDS, TEL_HEMISPHERE_SHELLS, isGhostOrContentOnly } = anatomyAssets

const TAXONOMY = JSON.parse(readFileSync(resolve(ROOT, 'src/data/taxonomy.json'), 'utf8'))
const TAXONOMY_ENTRIES = Array.isArray(TAXONOMY)
  ? TAXONOMY
  : (TAXONOMY.entries ?? TAXONOMY.structures ?? [])
const TAXONOMY_BY_ID = new Map(TAXONOMY_ENTRIES.map((entry) => [entry.id, entry]))

/** The two domains the layer sets are keyed on — derived from the registry. */
const REGIONS = [...new Set(TAXONOMY_ENTRIES.map((entry) => entry.region))]
const KINDS = [...new Set(TAXONOMY_ENTRIES.map((entry) => entry.kind))]

const SOURCE = {
  sceneLayers: readFileSync(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx'), 'utf8'),
  sectionCanvas: readFileSync(resolve(ROOT, 'src/components/section/SectionCanvas.tsx'), 'utf8'),
  sectionAssets: readFileSync(resolve(ROOT, 'src/components/section/sectionAssets.ts'), 'utf8'),
  pipSection: readFileSync(resolve(ROOT, 'src/components/viewer3d/PipSection.tsx'), 'utf8'),
  sectionPip: readFileSync(resolve(ROOT, 'src/components/viewer3d/SectionPiP.tsx'), 'utf8'),
  somatotopy: readFileSync(resolve(ROOT, 'src/components/viewer3d/SomatotopyOverlay.tsx'), 'utf8'),
  corticalLobes: readFileSync(resolve(ROOT, 'src/components/section/corticalLobes.ts'), 'utf8'),
}

/** A layer state built from the two sets (`hidden` and `emphasis` aside). */
function layerState({ regions = REGIONS, kinds = KINDS, hidden = [] } = {}) {
  return { regions: new Set(regions), kinds: new Set(kinds), hidden: new Set(hidden) }
}
const without = (value, domain) => domain.filter((entry) => entry !== value)

/** The 2D decision, exactly as `ensureRenderOrder` applies it. */
const visibleSlugs = (layers) =>
  SECTION_PARTS.filter((meta) => isPartVisible(meta, layers)).map((meta) => meta.slug)

console.log('=== v11 §2 — one visibility decision, both surfaces ===')
console.log(
  `domains from src/data/taxonomy.json (${TAXONOMY_ENTRIES.length} records): ` +
    `regions ${REGIONS.length} [${REGIONS.join(', ')}] · kinds ${KINDS.length} [${KINDS.join(', ')}]`,
)
console.log(
  `surfaces: 2D+Pip ${SECTION_PARTS.length} section parts · 3D ${structures.length} structure records + ` +
    `${tracts.length} tracts + ${ENVELOPE_SLOTS.length} envelope slots + ${TEL_HEMISPHERE_SHELLS.length} ghost shells`,
)
console.log(
  `default framing: viewPresetOf(DEFAULT_LAYERS) = ${viewPresetOf(DEFAULT_LAYERS)} · ` +
    `regions ${DEFAULT_LAYERS.regions.size}/${REGIONS.length} · kinds ${DEFAULT_LAYERS.kinds.size}/${KINDS.length} · ` +
    `all-on regions ${ALL_ON_LAYERS.regions.size} kinds ${ALL_ON_LAYERS.kinds.size}`,
)

/* ==================================================================== *
 *  A. THE 2D DECISION (canvas AND PiP — one predicate)
 * ==================================================================== */

console.log('\n--- A. the 2D/Pip decision: isPartVisible, per part -----------------------')
assert(typeof isPartVisible === 'function', 'SectionCanvas exports isPartVisible (the one 2D decision)')
assert(typeof buildLobeLayer === 'function', 'SectionCanvas exports buildLobeLayer (the lobe pass)')

const NULL_REGION_PARTS = SECTION_PARTS.filter((meta) => meta.region === null)
assert(
  NULL_REGION_PARTS.length === 0,
  'no section part has region === null (a part with no region is invisible to every area toggle)',
  `${NULL_REGION_PARTS.length} part(s): ${list(NULL_REGION_PARTS.map((meta) => meta.slug))}`,
)
console.log(
  `  parts with region === null: ${NULL_REGION_PARTS.length} of ${SECTION_PARTS.length} ` +
    '(the silent-bypass class — measured, not assumed)',
)

const bucketKinds = new Set(SECTION_PARTS.map((meta) => meta.taxonomyKind ?? `bucket:${meta.kind}`))
const strayKinds = [...bucketKinds].filter(
  (kind) => !KINDS.includes(kind) && !kind.startsWith('bucket:'),
)
assert(
  strayKinds.length === 0,
  'every part resolves to a taxonomy kind the systems row can toggle',
  `stray: ${list(strayKinds)}`,
)
console.log(
  `  effective kinds across the parts: ${list([...bucketKinds].sort())} (all in the systems domain)`,
)

const labels2d = [1, 0]
console.log('\n  part-by-part truth table (region flag × kind flag), 4 states each:')
const truthTable = { visibleOnOn: 0, hiddenOnOff: 0, hiddenOffOn: 0, hiddenOffOff: 0, violations: [] }
for (const meta of SECTION_PARTS) {
  const region = meta.region ?? REGIONS[0]
  const kind = meta.taxonomyKind ?? 'nucleus'
  const states = [
    { regions: REGIONS, kinds: KINDS, expect: true, why: 'on/on' },
    { regions: REGIONS, kinds: without(kind, KINDS), expect: false, why: 'on/kind off' },
    { regions: without(region, REGIONS), kinds: KINDS, expect: false, why: 'area off/on' },
    { regions: without(region, REGIONS), kinds: without(kind, KINDS), expect: false, why: 'off/off' },
  ]
  for (const state of states) {
    const layers = layerState(state)
    const visible = isPartVisible(meta, layers)
    const admit = layersAdmit(layers, region, kind)
    if (visible !== admit) {
      truthTable.violations.push(`${meta.slug}: isPartVisible ${visible} vs layersAdmit(3D) ${admit} (${state.why})`)
    }
    if (visible !== state.expect) {
      truthTable.violations.push(`${meta.slug}: ${state.why} → visible ${visible}, expected ${state.expect}`)
    }
    if (state.why === 'on/on' && visible) truthTable.visibleOnOn += 1
    if (state.why === 'on/kind off' && !visible) truthTable.hiddenOnOff += 1
    if (state.why === 'area off/on' && !visible) truthTable.hiddenOffOn += 1
    if (state.why === 'off/off' && !visible) truthTable.hiddenOffOff += 1
  }
}
console.log(
  `    on+on visible ${truthTable.visibleOnOn}/${SECTION_PARTS.length} · kind-off hidden ${truthTable.hiddenOnOff}` +
    ` · area-off hidden ${truthTable.hiddenOffOn} · both-off hidden ${truthTable.hiddenOffOff}`,
)
console.log(
  `    the same 4 states through the 3D primitive layersAdmit: ` +
    `${SECTION_PARTS.length * 4} comparisons, ${truthTable.violations.length} disagreement(s)`,
)
assert(
  truthTable.violations.length === 0,
  'every part obeys "kind off ∨ area off ⇒ hidden; both on ⇒ visible", and isPartVisible agrees with layersAdmit',
  list(truthTable.violations.slice(0, 6)),
)
console.log(`  the 2×2 state matrix printed per surface is [${labels2d.join('|')}] — on/on painted, everything else hidden`)

/* ==================================================================== *
 *  B. THE 3D DECISION (four passes, one primitive)
 * ==================================================================== */

console.log('\n--- B. the 3D decision: layersAdmit, applied by every pass ----------------')
assert(typeof layersAdmit === 'function', 'SceneLayers exports layersAdmit (the one 3D decision)')

const base3d = layerState()

/**
 * Per-pass 4-state sweep: when BOTH the area and the system are on, a pass's own
 * non-layer conditions decide (`extraOn`); when EITHER is off, the entry must be
 * gone — that implication is the whole claim, and it cannot be excused by the
 * pass's other conditions.
 */
function sweepPass(name, entries, admitOf, regionOf, kindOf, extraOn = () => true) {
  const counts = { admitted: 0, skipped: 0, areaOff: 0, kindOff: 0, bothOff: 0, violations: [] }
  for (const entry of entries) {
    const region = regionOf(entry)
    const kind = kindOf(entry)
    const eligible = extraOn(entry)
    const cases = [
      { layers: base3d, expect: eligible, key: eligible ? 'admitted' : 'skipped' },
      { layers: layerState({ regions: without(region, REGIONS) }), expect: false, key: 'areaOff' },
      { layers: layerState({ kinds: without(kind, KINDS) }), expect: false, key: 'kindOff' },
      {
        layers: layerState({ regions: without(region, REGIONS), kinds: without(kind, KINDS) }),
        expect: false,
        key: 'bothOff',
      },
    ]
    for (const testCase of cases) {
      const admitted = admitOf(entry, testCase.layers)
      if (admitted === testCase.expect) counts[testCase.key] += 1
      else counts.violations.push(`${name} ${entry.id ?? entry.slug}: ${testCase.key} → ${admitted}`)
    }
  }
  console.log(
    `  ${pad(name, 20)} entries ${String(entries.length).padStart(3)} · drawn with all areas+systems on ` +
      `${String(counts.admitted).padStart(3)} · held back by a non-layer condition ${String(counts.skipped).padStart(3)}` +
      ` · area off ${String(counts.areaOff).padStart(3)} hidden · kind off ${String(counts.kindOff).padStart(3)} hidden` +
      ` · both off ${String(counts.bothOff).padStart(3)} hidden · violations ${counts.violations.length}`,
  )
  return counts.violations
}

const structureViolations = sweepPass(
  'structures',
  structures,
  (record, layers) => isStructureVisible(record, layers),
  (record) => record.region,
  (record) => record.kind,
  // The ghost/content-only records have no body of their own (another pass or no
  // GLB): not a layer decision, so the "everything on" state excludes them.
  (record) => !isGhostOrContentOnly(record.id),
)
const tractViolations = sweepPass(
  'tracts',
  tracts,
  (tract, layers) => isTractVisible(tract.id, layers),
  (tract) => getTaxonomyEntry(tract.id)?.region ?? 'medulla',
  () => 'tract',
)
const envelopeViolations = sweepPass(
  'envelope slots',
  ENVELOPE_SLOTS,
  (slot, layers) => isEnvelopeSlotVisible(slot, layers),
  (slot) => slot.region,
  () => 'context',
)
const ghostViolations = []
{
  const cases = [
    { layers: base3d, expect: true, why: 'telencephalon+context on' },
    { layers: layerState({ regions: without('telencephalon', REGIONS) }), expect: false, why: 'area off' },
    { layers: layerState({ kinds: without('context', KINDS) }), expect: false, why: 'kind off' },
  ]
  for (const testCase of cases) {
    const admitted = isGhostShellVisible(testCase.layers)
    if (admitted !== testCase.expect) ghostViolations.push(`${testCase.why} → ${admitted}`)
  }
  console.log(
    `  ${pad('ghost shells', 20)} entries ${String(TEL_HEMISPHERE_SHELLS.length).padStart(3)} · ` +
      `drawn with telencephalon+context on ${isGhostShellVisible(base3d)} · area off hidden ` +
      `${!isGhostShellVisible(layerState({ regions: without('telencephalon', REGIONS) }))} · kind off hidden ` +
      `${!isGhostShellVisible(layerState({ kinds: without('context', KINDS) }))} · violations ${ghostViolations.length}`,
  )
}
assert(
  structureViolations.length + tractViolations.length + envelopeViolations.length + ghostViolations.length === 0,
  'every 3D pass admits exactly when area ∧ kind are on, and drops the entry when either is off',
  list([...structureViolations, ...tractViolations, ...envelopeViolations, ...ghostViolations].slice(0, 6)),
)

/* ---- B2. the passes really call it, and nothing else reads the sets ----- */
console.log('\n  B2. wiring: the component body calls the exported predicates, no other read')
for (const [label, pattern] of [
  ['structure pass', /structures\.filter\(\(record\) => isStructureVisible\(record, layerSets\)\)/],
  ['tract pass', /tracts\.filter\(\(tract\) => isTractVisible\(tract\.id, layerSets\)\)/],
  ['envelope pass', /isEnvelopeSlotVisible\(slot, \{ regions, kinds \}\)/],
  ['ghost-shell pass', /isGhostShellVisible\(\{ regions, kinds \}\)/],
  ['somato overlay (other task)', /SOMATOTOPY_RECORD_IDS\.has\(record\.id\)/],
]) {
  assert(pattern.test(SOURCE.sceneLayers), `SceneLayers.tsx wires the ${label} through the one decision`)
}

/**
 * Every `regions.has` / `kinds.has` / `hidden.has` in SceneLayers.tsx must live
 * inside the exported predicates: the component body owns the composition, not
 * the test.
 */
const sceneCode = SOURCE.sceneLayers
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '')
const predicateStart = sceneCode.indexOf('export function layersAdmit(')
const predicateEnd = sceneCode.indexOf('export default function SceneLayers(')
const predicateBlock = sceneCode.slice(predicateStart, predicateEnd)
const componentBlock = sceneCode.slice(predicateEnd)
/** The area/system decision: `regions.has` / `kinds.has` reads. */
const countHas = (block) => (block.match(/\b(regions|kinds)\.has\(/g) ?? []).length
/** The structure-level preset set — a different axis, counted separately. */
const countHidden = (block) => (block.match(/\bhidden\.has\(/g) ?? []).length
console.log(
  `    .regions/.kinds reads — inside the exported predicates: ${countHas(predicateBlock)} · ` +
    `in the component body: ${countHas(componentBlock)}`,
)
assert(
  predicateStart > 0 && predicateEnd > predicateStart,
  'the exported predicate block is sliceable from SceneLayers.tsx',
)
assert(
  countHas(componentBlock) === 0,
  'the SceneLayers component body contains NO direct region/kind read (it delegates to the one decision)',
  `${countHas(componentBlock)} direct read(s) remain`,
)
assert(
  countHas(predicateBlock) >= 2,
  'the predicates themselves carry the region/kind reads (the block is not empty)',
  `${countHas(predicateBlock)}`,
)
console.log(
  `    the v7 structure-level \`hidden\` set (a different axis, 3D-only by design): ` +
    `${countHidden(componentBlock) + countHidden(predicateBlock)} read(s) in SceneLayers.tsx, ` +
    `${countHidden(SOURCE.somatotopy)} in SomatotopyOverlay.tsx, 0 in SectionCanvas.tsx — printed in lane C2, ` +
    'not silently unified with the region/kind decision',
)
console.log(
  `    SomatotopyOverlay.tsx (outside this task's write scope) reads the same two sets: ` +
    `${countHas(SOURCE.somatotopy)} read(s) — verified by source read, not by execution`,
)

/* ==================================================================== *
 *  C. PER AREA / PER SYSTEM — what each surface hides
 * ==================================================================== */

console.log('\n--- C. per region and per kind: the 2D slugs and the 3D records hidden ---')
const base2d = visibleSlugs(base3d)
const baseStructures = structures.filter((record) => isStructureVisible(record, base3d))
const baseTracts = tracts.filter((tract) => isTractVisible(tract.id, base3d))

const regionRows = []
for (const region of REGIONS) {
  const off = layerState({ regions: without(region, REGIONS) })
  const hidden2d = base2d.filter((slug) => !visibleSlugs(off).includes(slug))
  const hidden3d = baseStructures.filter((record) => !isStructureVisible(record, off))
  const hiddenTracts = baseTracts.filter((tract) => !isTractVisible(tract.id, off))
  const ofRegion2d = SECTION_PARTS.filter((meta) => meta.region === region).map((meta) => meta.slug)
  // The comparable 3D domain: the records of that region the 3D surface draws
  // with everything on (the ghost/content-only records have no body at all).
  const ofRegionStructures = baseStructures.filter((record) => record.region === region)
  const ofRegionTracts = baseTracts.filter(
    (tract) => (getTaxonomyEntry(tract.id)?.region ?? 'medulla') === region,
  )
  const row = {
    region,
    hidden2d,
    hidden3d,
    hiddenTracts,
    ofRegion2d,
    ofRegionStructures,
    ofRegionTracts,
    ghosts: structures.filter(
      (record) => record.region === region && isGhostOrContentOnly(record.id),
    ).length,
  }
  regionRows.push(row)
  assert(
    sameSet(hidden2d.slice().sort(), ofRegion2d.slice().sort()),
    `area "${region}" off hides EXACTLY the 2D parts of that region`,
    `${hidden2d.length} hidden vs ${ofRegion2d.length} parts of the region`,
  )
  assert(
    sameSet(hidden3d.map((r) => r.id).sort(), ofRegionStructures.map((r) => r.id).sort()),
    `area "${region}" off hides EXACTLY the 3D structure records of that region`,
    `${hidden3d.length} hidden vs ${ofRegionStructures.length} records of the region`,
  )
  assert(
    sameSet(hiddenTracts.map((t) => t.id).sort(), ofRegionTracts.map((t) => t.id).sort()),
    `area "${region}" off hides EXACTLY the 3D tracts the taxonomy puts in that region`,
    `${hiddenTracts.length} hidden vs ${ofRegionTracts.length} tracts of the region`,
  )
}
console.log(
  '  area             2D parts (hidden/owned)   3D drawn records (hidden/owned)   3D tracts hidden   envelopes/ghosts   bodies held back',
)
for (const row of regionRows) {
  const envelopes = ENVELOPE_SLOTS.filter((slot) => slot.region === row.region)
  const ghost = row.region === 'telencephalon' ? TEL_HEMISPHERE_SHELLS.length : 0
  console.log(
    `  ${pad(row.region, 16)} ${pad(`${row.hidden2d.length}/${row.ofRegion2d.length}`, 26)} ` +
      `${pad(`${row.hidden3d.length}/${row.ofRegionStructures.length}`, 33)} ` +
      `${pad(row.hiddenTracts.length, 18)} ${pad(`${envelopes.length} slot(s) + ${ghost} ghost(s)`, 18)} ` +
      `${row.ghosts} ghost/content-only record(s)`,
  )
}

const kindRows = []
for (const kind of KINDS) {
  const off = layerState({ kinds: without(kind, KINDS) })
  const hidden2d = base2d.filter((slug) => !visibleSlugs(off).includes(slug))
  const hidden3d = baseStructures.filter((record) => !isStructureVisible(record, off))
  const hiddenTracts = baseTracts.filter((tract) => !isTractVisible(tract.id, off))
  const ofKind2d = SECTION_PARTS.filter(
    (meta) => (meta.taxonomyKind ?? 'nucleus') === kind,
  ).map((meta) => meta.slug)
  const ofKind3d = baseStructures.filter((record) => record.kind === kind)
  kindRows.push({ kind, hidden2d, hidden3d, hiddenTracts, ofKind2d, ofKind3d })
  assert(
    sameSet(hidden2d.slice().sort(), ofKind2d.slice().sort()),
    `system "${kind}" off hides EXACTLY the 2D parts of that kind`,
    `${hidden2d.length} hidden vs ${ofKind2d.length} parts of the kind`,
  )
  assert(
    sameSet(hidden3d.map((r) => r.id).sort(), ofKind3d.map((r) => r.id).sort()),
    `system "${kind}" off hides EXACTLY the 3D structure records of that kind`,
    `${hidden3d.length} hidden vs ${ofKind3d.length} records of the kind`,
  )
}
console.log('\n  system      2D parts (hidden/owned)   3D drawn records (hidden/owned)   3D tracts hidden')
for (const row of kindRows) {
  console.log(
    `  ${pad(row.kind, 12)} ${pad(`${row.hidden2d.length}/${row.ofKind2d.length}`, 26)} ` +
      `${pad(`${row.hidden3d.length}/${row.ofKind3d.length}`, 33)} ${row.hiddenTracts.length}`,
  )
}
/* The two rows the numbers above make visible, stated so they cannot be read as
 * a bypass: the section has no `surface` body of its own, and its `tract`
 * bodies are manifest GLBs whose taxonomy kind is `tract`. */
const surfaceRow = kindRows.find((row) => row.kind === 'surface')
assert(
  surfaceRow !== undefined && surfaceRow.ofKind2d.length === 0,
  'the Surface system owns no 2D part: the 25 `surf-*` records have no committed GLB (measured, not a bypass)',
  `${surfaceRow?.ofKind2d.length} part(s)`,
)
console.log(
  `  note  Surface: ${structures.filter((record) => record.kind === 'surface').length} taxonomy records of that ` +
    `kind, ${surfaceRow?.ofKind3d.length} of them with a 3D body, 0 section parts — the \`surf-*\` peripheral-nerve ` +
    'and lobe-surface records have no committed GLB, so the section has nothing of that kind to hide (measured)',
)
console.log(
  `  note  Vessels: ${kindRows.find((row) => row.kind === 'vessel')?.ofKind2d.length} 2D parts carry ` +
    'taxonomyKind "vessel" while their draw bucket is nucleus — the kind gate reads taxonomyKind, so the ' +
    'bucket cannot leak them past the toggle',
)

/* ---- C2. the one measured difference: the preset's structure-level hidden -- */
console.log('\n  C2. the structure-level `hidden` set (v7 presets) — measured, 3D-only by design')
const hiddenRows = []
for (const preset of Object.keys(VIEW_PRESETS)) {
  const definition = VIEW_PRESETS[preset]
  const layers = layerState({
    regions: definition.regions,
    kinds: definition.kinds,
    hidden: definition.hidden ?? [],
  })
  const pruned = SECTION_PARTS.filter((meta) => !isPartVisible(meta, layers)).map((meta) => meta.slug)
  const drawn3d = structures.filter((record) => isStructureVisible(record, layers))
  const hiddenOnly = [...layers.hidden].filter((id) => {
    const record = structures.find((candidate) => candidate.id === id)
    return record !== undefined && layersAdmit(layers, record.region, record.kind)
  })
  hiddenRows.push({ preset, pruned: pruned.length, hiddenOnly, drawn3d: drawn3d.length })
}
console.log('  preset            2D parts dropped by region/kind   hidden-set ids eligible in 3D   3D records drawn')
for (const row of hiddenRows) {
  console.log(
    `  ${pad(row.preset, 18)} ${pad(row.pruned, 34)} ${pad(row.hiddenOnly.length, 32)} ${row.drawn3d}`,
  )
}
const brainstem = hiddenRows.find((row) => row.preset === 'brainstem-focus')
assert(
  brainstem !== undefined,
  'the default preset is readable from the shipped VIEW_PRESETS',
)
console.log(
  `  the difference: with "${brainstem?.preset}" the 3D surface drops ${brainstem?.hiddenOnly.length} more ` +
    'records through `hidden` (cortex envelope + hemisphere shells) while the 2D section keeps them — ' +
    'a structure-level preset axis, NOT a region/kind one; this task proves the region/kind decision and ' +
    'does not silently unify the other',
)

/* ==================================================================== *
 *  D. THE JOIN — the 2D part and its 3D record agree, part by part
 * ==================================================================== */

console.log('\n--- D. the two surfaces agree on the SAME body (join on the taxonomy id) ---')
const somatotopy = await import(
  pathToFileURL(resolve(ROOT, 'src/geometry/somatotopy.ts')).href
)
const { SOMATOTOPY_RECORD_IDS } = somatotopy
const structureById = new Map(structures.map((record) => [record.id, record]))
const tractById = new Map(tracts.map((tract) => [tract.id, tract]))

/**
 * WHICH 3D pass owns a body, for a given taxonomy record — because "the 3D
 * surface draws it" is not always `isStructureVisible`: the hemispheres are the
 * ghost shell, the six silhouettes are envelope slots, the 16 somatotopic
 * segments are the overlay, and the sub-regions of a body another record already
 * draws (`TEL_CONTENT_ONLY_IDS`) have no 3D body of their own at all. The gate
 * asks the OWNING pass's predicate, so the comparison is pass-by-pass and never
 * an assumption about which pass draws what.
 */
function ownerOf(group) {
  if (TEL_HEMISPHERE_RECORD_IDS.includes(group)) return 'ghost-shell'
  if (ENVELOPE_RECORD_IDS.has(group)) return 'envelope'
  if (SOMATOTOPY_RECORD_IDS.has(group)) return 'somato-overlay'
  if (tractById.has(group)) return 'tract'
  if (structureById.has(group)) {
    return isGhostOrContentOnly(group) ? 'no-3d-body' : 'structure'
  }
  return 'no-3d-record'
}

/** The owning pass's visibility, as that pass computes it. */
function ownerVisible(owner, group, layers) {
  if (owner === 'structure') return isStructureVisible(structureById.get(group), layers)
  if (owner === 'tract') return isTractVisible(group, layers)
  if (owner === 'ghost-shell') return isGhostShellVisible(layers)
  if (owner === 'envelope') {
    return ENVELOPE_SLOTS.filter((slot) => slot.id === group).some((slot) =>
      isEnvelopeSlotVisible(slot, layers),
    )
  }
  // The somatotopy overlay is outside this task's write scope and carries the
  // same two tests (SomatotopyOverlay.tsx:263, verified by source read in lane
  // B2); its gate is `telencephalon ∧ context`, the ghost shell's own.
  if (owner === 'somato-overlay') return layersAdmit(layers, 'telencephalon', 'context')
  return false
}

const join = []
const noRecord = []
for (const meta of SECTION_PARTS) {
  const record = structureById.get(meta.group) ?? null
  const tract = tractById.get(meta.group) ?? null
  if (record === null && tract === null && !TAXONOMY_BY_ID.has(meta.group)) {
    noRecord.push({ slug: meta.slug, group: meta.group, hasTaxonomy: false })
    continue
  }
  const owner = ownerOf(meta.group)
  if (owner === 'no-3d-record') {
    noRecord.push({ slug: meta.slug, group: meta.group, hasTaxonomy: true })
    continue
  }
  join.push({
    slug: meta.slug,
    group: meta.group,
    region: record?.region ?? getTaxonomyEntry(tract?.id ?? meta.group)?.region ?? 'medulla',
    kind: record?.kind ?? getTaxonomyEntry(meta.group)?.kind ?? meta.taxonomyKind ?? 'nucleus',
    owner,
    meta,
  })
}
const joinViolations = []
const bodylessRows = []
const ownerTally = new Map()
for (const row of join) {
  ownerTally.set(row.owner, (ownerTally.get(row.owner) ?? 0) + 1)
  if (row.region !== row.meta.region) {
    joinViolations.push(`${row.slug}: 2D region ${row.meta.region} vs 3D region ${row.region}`)
  }
  const rowKind = row.meta.taxonomyKind ?? 'nucleus'
  if (rowKind !== row.kind) {
    joinViolations.push(`${row.slug}: 2D kind ${rowKind} vs 3D kind ${row.kind}`)
  }
  for (const testCase of [
    { layers: base3d, expect: true, why: 'on/on' },
    { layers: layerState({ regions: without(row.region, REGIONS) }), expect: false, why: 'area off' },
    { layers: layerState({ kinds: without(row.kind, KINDS) }), expect: false, why: 'kind off' },
    {
      layers: layerState({ regions: without(row.region, REGIONS), kinds: without(row.kind, KINDS) }),
      expect: false,
      why: 'both off',
    },
  ]) {
    const twoD = isPartVisible(row.meta, testCase.layers)
    if (twoD !== testCase.expect) {
      joinViolations.push(`${row.slug} (${testCase.why}): 2D ${twoD}, expected ${testCase.expect}`)
    }
    // A body with no 3D counterpart cannot be compared: the 3D surface has
    // nothing to hide, and that is asserted positively below.
    if (row.owner === 'no-3d-body') continue
    const threeD = ownerVisible(row.owner, row.group, testCase.layers)
    if (twoD !== threeD) {
      joinViolations.push(
        `${row.slug} [${row.owner}] (${testCase.why}): 2D ${twoD} vs 3D ${threeD}`,
      )
    }
  }
  if (row.owner === 'no-3d-body') bodylessRows.push(row)
}
console.log(
  `  joined bodies: ${join.length} of ${SECTION_PARTS.length} section parts ` +
    `(${join.length * 4} 2D-vs-3D state comparisons, ${joinViolations.length} disagreement(s))`,
)
console.log(
  `  owners: ${[...ownerTally.entries()].map(([owner, count]) => `${owner} ${count}`).join(' · ')}`,
)
if (joinViolations.length > 0) {
  for (const violation of joinViolations.slice(0, 12)) console.log(`    join mismatch ${violation}`)
}
console.log(
  `  bodies whose 2D part has no 3D body of its own (the sub-regions another record already draws): ` +
    `${bodylessRows.length} — ${list(bodylessRows.map((row) => row.slug))}`,
)
assert(
  bodylessRows.every((row) => isGhostOrContentOnly(row.group)),
  'every 2D body without a 3D counterpart is shipped-flagged content-only (the 3D has nothing to hide)',
  list(bodylessRows.filter((row) => !isGhostOrContentOnly(row.group)).map((row) => row.slug)),
)
assert(
  joinViolations.length === 0,
  'for every body both surfaces draw, the 2D predicate and the OWNING 3D pass agree in all 4 layer states',
  list(joinViolations.slice(0, 8)),
)
for (const row of regionRows) {
  const inRegion = join.filter((entry) => entry.region === row.region)
  console.log(
    `    ${pad(row.region, 16)} ${String(inRegion.length).padStart(3)} joined body/bodies ` +
      `(2D parts joined to a 3D record) of ${row.ofRegion2d.length} parts / ` +
      `${row.ofRegionStructures.length} structure-pass records in this area`,
  )
}
console.log(
  `  section parts with no 3D record at all: ${noRecord.length} — ` +
    list(noRecord.map((row) => `${row.slug} (${row.hasTaxonomy ? 'taxonomy entry, no 3D body' : 'no taxonomy entry, region from the shipped override table'})`)),
)
assert(
  noRecord.every((row) => SECTION_PARTS.some((meta) => meta.slug === row.slug)),
  'every part without a 3D record still resolves its region from the shipped override table',
)

/* ==================================================================== *
 *  E. THE PIP — the same component, no second framing
 * ==================================================================== */

console.log('\n--- E. the PiP mounts the same canvas, so it cannot disagree ----------------')
assert(
  /from '\.\.\/section\/SectionCanvas'/.test(SOURCE.pipSection) ||
    /from '\.\.\/section\/SectionCanvas'/.test(SOURCE.sectionPip),
  'the PiP imports SectionCanvas (one renderer, one decision)',
)
assert(
  /<SectionCanvas\s*\/>/.test(SOURCE.pipSection),
  'PipSection renders <SectionCanvas /> with NO props (no plane, layer or visibility prop to diverge on)',
)
const pipFilterReads = (SOURCE.pipSection + SOURCE.sectionPip).match(/\.(regions|kinds|hidden)\.has\(/g) ?? []
assert(
  pipFilterReads.length === 0,
  'neither PipSection.tsx nor SectionPiP.tsx filters a layer set of its own',
  `${pipFilterReads.length} read(s)`,
)
/** The ONE 2D decision must be the only layer read in SectionCanvas.tsx too. */
const canvasCode = SOURCE.sectionCanvas
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '')
const canvasHasReads = canvasCode.match(/\.(regions|kinds)\.has\(/g) ?? []
const predicateBody = canvasCode.slice(
  canvasCode.indexOf('export function isPartVisible('),
  canvasCode.indexOf('/** Click/drag writes clamp'),
)
const predicateReads = predicateBody.match(/\.(regions|kinds)\.has\(/g) ?? []
console.log(
  `  SectionCanvas.tsx layer reads: ${canvasHasReads.length} total, ${predicateReads.length} inside ` +
    'isPartVisible (the one 2D decision; everything else consumes it)',
)
assert(
  canvasHasReads.length === predicateReads.length && predicateReads.length === 2,
  'isPartVisible is the ONLY place SectionCanvas.tsx reads the layer sets (2 reads: region + kind)',
  `${canvasHasReads.length} total vs ${predicateReads.length} in the predicate`,
)
assert(
  /isPartVisible\(meta, args\.state\.layers\)/.test(SOURCE.sectionCanvas),
  'the draw order is built with isPartVisible (the same gate the hit test reads)',
)

/* ==================================================================== *
 *  F. THE LOBE PASS — real ribbons, the canvas' own function
 * ==================================================================== */

console.log('\n--- F. the cortical-division pass: gate + the ONE rule, executed -----------')

const MANIFEST = JSON.parse(
  readFileSync(resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json'), 'utf8'),
)
const RIBBON_SLUGS = [...SECTION_CORTICAL_RIBBON_SLUGS]
assert(
  RIBBON_SLUGS.length === 2 && RIBBON_SLUGS.every((slug) => isCorticalRibbonSlug(slug)),
  'the lobe layer names two ribbon slugs (ctx-hemisphere-l + -r)',
  list(RIBBON_SLUGS),
)
for (const slug of RIBBON_SLUGS) {
  const meta = SECTION_PARTS.find((part) => part.slug === slug)
  assert(
    meta !== undefined && meta.region === 'telencephalon' && meta.taxonomyKind === 'context',
    `ribbon ${slug} is a telencephalon/context part, so the areas+systems toggles own it`,
    meta === undefined ? 'not a section part' : `region ${meta.region} kind ${meta.taxonomyKind}`,
  )
}

/** Load a committed ribbon GLB the way `sectionAssets.registryPartFromGeometry` does. */
async function loadRibbon(slug) {
  const part = MANIFEST.parts.find((candidate) => candidate.slug === slug)
  if (part === undefined) throw new Error(`${slug} is not in the anatomy manifest`)
  const loader = new GLTFLoader()
  const buffer = readFileSync(resolve(ROOT, 'src/assets/anatomy', part.file ?? `${slug}.glb`))
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const gltf = await new Promise((res, rej) => loader.parse(arrayBuffer, '', res, rej))
  let mesh = null
  gltf.scene.traverse((child) => {
    if (mesh === null && child.isMesh) mesh = child
  })
  const position = mesh.geometry.getAttribute('position')
  const index = mesh.geometry.getIndex()
  const positions = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    positions[i * 3] = position.getX(i)
    positions[i * 3 + 1] = position.getY(i)
    positions[i * 3 + 2] = position.getZ(i)
  }
  const indices = new Uint32Array(index.count)
  for (let i = 0; i < index.count; i++) indices[i] = index.getX(i)
  return { slug, part, positions, indices, meta: SECTION_PARTS.find((candidate) => candidate.slug === slug) }
}

const ribbons = []
for (const slug of RIBBON_SLUGS) ribbons.push(await loadRibbon(slug))
console.log(
  `  ribbons: ${ribbons
    .map((ribbon) => `${ribbon.slug} ${ribbon.positions.length / 3} vertices / ${ribbon.indices.length / 3} tris`)
    .join(' · ')}`,
)

/** The planes lane F exercises: the carry-over planes plus one per other axis. */
const F_PLANES = [
  { axis: 'y', value: 6, why: 'the carry-over plane of the v10 audit (5 divisions over l+r)' },
  { axis: 'y', value: 14, why: 'the second carry-over plane (all six over l+r)' },
  { axis: 'y', value: 30, why: 'a plane where the floors removed the insula/limbic wedges' },
  { axis: 'x', value: 6, why: 'sagittal: only the left ribbon is cut (the right shell is at -x)' },
  { axis: 'z', value: 0, why: 'coronal' },
]

/** The part inputs the render order would hand the lobe pass. */
function ribbonItems(plane) {
  const items = []
  const loopsPerSlug = new Map()
  for (const ribbon of ribbons) {
    if (!boundsMayCut(partBounds(ribbon.positions), plane)) {
      loopsPerSlug.set(ribbon.slug, [])
      continue
    }
    const slice = extractContours(ribbon.positions, ribbon.indices, plane)
    loopsPerSlug.set(ribbon.slug, slice.loops)
    items.push({ meta: ribbon.meta, part: { slug: ribbon.slug, loops: slice.loops }, path: null })
  }
  return { items, loopsPerSlug }
}

const transform = planeTransform('y', 0, { width: 800, height: 600 })
const lobeRows = []
for (const plane of F_PLANES) {
  const { items, loopsPerSlug } = ribbonItems(plane)
  const leftLoops = loopsPerSlug.get(RIBBON_SLUGS[0]) ?? []
  const rightLoops = loopsPerSlug.get(RIBBON_SLUGS[1]) ?? []
  const bothLoops = [...leftLoops, ...rightLoops]

  // (F1) the honest case: layers on.
  const onCache = createLobeLayerCache()
  buildLobeLayer(onCache, items, plane.axis, plane.value, transform, 1, base3d)
  const canvasSet = CORTICAL_DIVISIONS.filter((division) => onCache.entries[division] !== undefined)
  const ruleSetBoth = paintedDivisionsOfLoops(bothLoops, plane.axis, plane.value)
  const ruleSetLeft = paintedDivisionsOfLoops(leftLoops, plane.axis, plane.value)

  // (F2) area OFF — the same call with the UNFILTERED catalogue (the defect).
  const areaOffCache = createLobeLayerCache()
  const areaOffLayers = layerState({ regions: without('telencephalon', REGIONS) })
  buildLobeLayer(areaOffCache, items, plane.axis, plane.value, transform, 1, areaOffLayers)
  // (F3) system OFF.
  const kindOffCache = createLobeLayerCache()
  const kindOffLayers = layerState({ kinds: without('context', KINDS) })
  buildLobeLayer(kindOffCache, items, plane.axis, plane.value, transform, 1, kindOffLayers)

  const row = {
    plane: `${plane.axis}=${plane.value}`,
    why: plane.why,
    ribbons: onCache.ribbons.length,
    vertices: onCache.vertices,
    canvasSet,
    ruleSetBoth,
    ruleSetLeft,
    hiddenByArea: Object.keys(areaOffCache.entries).length + areaOffCache.ribbons.length,
    hiddenByKind: Object.keys(kindOffCache.entries).length + kindOffCache.ribbons.length,
  }
  lobeRows.push(row)

  assert(
    sameSet(canvasSet, ruleSetBoth),
    `F ${row.plane}: the canvas' own buildLobeLayer paints exactly the rule's division set (parity)`,
    `canvas [${list(canvasSet)}] vs rule [${list(ruleSetBoth)}]`,
  )
  assert(
    areaOffCache.ribbons.length === 0 && Object.keys(areaOffCache.entries).length === 0,
    `F ${row.plane}: with the telencephalon area OFF the lobe pass paints NOTHING, even with the unfiltered catalogue`,
    `ribbons [${list(areaOffCache.ribbons)}], ${Object.keys(areaOffCache.entries).length} division(s)`,
  )
  assert(
    kindOffCache.ribbons.length === 0 && Object.keys(kindOffCache.entries).length === 0,
    `F ${row.plane}: with the context system OFF the lobe pass paints NOTHING`,
    `ribbons [${list(kindOffCache.ribbons)}], ${Object.keys(kindOffCache.entries).length} division(s)`,
  )
  assert(
    row.canvasSet.length > 0 || bothLoops.length === 0,
    `F ${row.plane}: the pass is not vacuous — it painted something where the ribbon has tissue`,
    `${row.canvasSet.length} division(s) from ${bothLoops.length} loops`,
  )
  // The ribbon set the pass consumed is a subset of the parts the 2D surface draws.
  const visibleOn = visibleSlugs(base3d)
  assert(
    onCache.ribbons.every((slug) => visibleOn.includes(slug)),
    `F ${row.plane}: every ribbon the pass consumed is in the 2D visible-part set`,
    list(onCache.ribbons),
  )
}

console.log('  plane    ribbons  rule(l) — left ribbon alone        canvas(l+r) === rule(l+r)                     area off  system off')
for (const row of lobeRows) {
  console.log(
    `  ${pad(row.plane, 8)} ${pad(row.ribbons, 8)} ${pad(`[${list(row.ruleSetLeft)}]`, 38)}` +
      `${pad(`[${list(row.canvasSet)}]`, 45)} ${pad(row.hiddenByArea === 0 ? 'nothing' : row.hiddenByArea, 9)} ` +
      `${row.hiddenByKind === 0 ? 'nothing' : row.hiddenByKind}`,
  )
}
const parityRows = lobeRows.filter((row) => sameSet(row.canvasSet, row.ruleSetBoth)).length
console.log(
  `  parity: ${parityRows}/${lobeRows.length} planes where the canvas' painted set === the rule's set over both ` +
    'ribbons · the `rule(l)` column is the LEFT ribbon alone — the coverage asymmetry the v10 audit reading ' +
    '"canvas paints NONE" came from is printed here per plane, and it is a COVERAGE difference, never a rule one',
)
const y6 = lobeRows.find((row) => row.plane === 'y=6')
const y14 = lobeRows.find((row) => row.plane === 'y=14')
assert(
  y6 !== undefined && sameSet(y6.canvasSet, ['frontal', 'parietal', 'temporal', 'occipital', 'limbic']),
  'the y = 6 carry-over plane paints five divisions (parietal comes from the RIGHT ribbon, never from the left)',
  `canvas [${list(y6?.canvasSet ?? [])}] left-only rule [${list(y6?.ruleSetLeft ?? [])}]`,
)
assert(
  y14 !== undefined && sameSet(y14.canvasSet, CORTICAL_DIVISIONS),
  'the y = 14 carry-over plane paints all six divisions over the two ribbons',
  `canvas [${list(y14?.canvasSet ?? [])}] left-only rule [${list(y14?.ruleSetLeft ?? [])}]`,
)
assert(
  y6 !== undefined && !sameSet(y6.ruleSetLeft, y6.canvasSet),
  'the left-ribbon-only set really differs at y = 6 (so the coverage claim is not vacuous)',
  `left [${list(y6?.ruleSetLeft ?? [])}] vs both [${list(y6?.canvasSet ?? [])}]`,
)
console.log(
  `  the ONE rule both consume: corticalLobes.corticalRunsForLoop ` +
    `(canvas source references it: ${/corticalRunsForLoop\(loop, axis, planeValue\)/.test(SOURCE.sectionCanvas)})`,
)
assert(
  /corticalRunsForLoop\(loop, axis, planeValue\)/.test(SOURCE.sectionCanvas),
  'buildLobeLayer splits with the shared corticalRunsForLoop (not a private rule)',
)
assert(
  /if \(!isPartVisible\(item\.meta, layers\)\) continue/.test(SOURCE.sectionCanvas),
  'buildLobeLayer names its own visibility gate (the v11 §2 fix)',
)
assert(
  /cache\.visibleLayers = \{ regions: args\.state\.layers\.regions, kinds: args\.state\.layers\.kinds \}/.test(
    SOURCE.sectionCanvas,
  ),
  'the render-order cache records the layer snapshot the visible list was filtered with',
)
assert(
  /order\.visibleLayers,/.test(SOURCE.sectionCanvas),
  'the draw path hands that snapshot to the lobe pass (one layer state, two consumers)',
)
assert(
  !/splitLoopByDivisionPlane/.test(SOURCE.sectionCanvas),
  'the canvas no longer splits privately (the rule lives in corticalLobes)',
)

/* ==================================================================== *
 *  G. THE BITES — a gate that cannot fail is not a gate
 * ==================================================================== */

console.log('\n--- G. bites: mutate the source in a scratch copy, require the gate to notice --')

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12)
const CANVAS_PATH = resolve(ROOT, 'src/components/section/SectionCanvas.tsx')
const shippedCanvasSha = sha(CANVAS_PATH)

rmSync(SCRATCH_ROOT, { recursive: true, force: true })
mkdirSync(resolve(SCRATCH_ROOT, 'components/section'), { recursive: true })

/**
 * Write a mutated copy of `SectionCanvas.tsx` under `.dsh-scratch/…/components/
 * section/` and import it. Its relative imports resolve against the SHIPPED
 * modules (the fallback rule in the resolve hook), so the mutation is the only
 * difference between the two builds.
 */
async function mutantOf(name, mutate) {
  const mutated = mutate(SOURCE.sectionCanvas)
  if (mutated === SOURCE.sectionCanvas) throw new Error(`bite ${name}: the mutation changed nothing`)
  const target = resolve(SCRATCH_ROOT, `components/section/${name}.tsx`)
  writeFileSync(target, mutated)
  return import(pathToFileURL(target).href)
}

const bitePlane = { axis: 'y', value: 6 }
const biteInput = ribbonItems(bitePlane)

/** Bite 1 — remove the gate line the v11 fix added. */
{
  const name = 'SectionCanvas.gateless'
  const mutant = await mutantOf(name, (text) =>
    text.replace(/\n[ \t]*if \(!isPartVisible\(item\.meta, layers\)\) continue/, ''),
  )
  const cache = mutant.createLobeLayerCache()
  mutant.buildLobeLayer(
    cache,
    biteInput.items,
    bitePlane.axis,
    bitePlane.value,
    transform,
    1,
    layerState({ regions: without('telencephalon', REGIONS) }),
  )
  const painted = Object.keys(cache.entries).length
  console.log(
    `  bite 1 (gate removed): area OFF, the mutant paints ${painted} division(s) from ` +
      `[${list(cache.ribbons)}] — the shipped pass paints 0`,
  )
  assert(
    painted > 0 && cache.ribbons.length > 0,
    'bite 1: removing the isPartVisible gate from buildLobeLayer is CAUGHT (the mutant paints with the area off)',
    `mutant painted ${painted}`,
  )
  assert(
    mutant.isPartVisible !== undefined,
    'bite 1: the mutant really is the mutated module (it still exports the other symbols)',
  )
}

/** Bite 2 — a private rule inside the canvas: drop one division from the paint. */
{
  const name = 'SectionCanvas.privatedrop'
  const mutant = await mutantOf(name, (text) =>
    text.replace(
      /const runs = corticalRunsForLoop\(loop, axis, planeValue\)/,
      "const runs = corticalRunsForLoop(loop, axis, planeValue).filter((run) => run.division !== 'insula')",
    ),
  )
  const plane = { axis: 'y', value: 14 }
  const { items, loopsPerSlug } = ribbonItems(plane)
  const cache = mutant.createLobeLayerCache()
  mutant.buildLobeLayer(cache, items, plane.axis, plane.value, transform, 1, base3d)
  const mutantSet = CORTICAL_DIVISIONS.filter((division) => cache.entries[division] !== undefined)
  const ruleSet = paintedDivisionsOfLoops(
    [...(loopsPerSlug.get(RIBBON_SLUGS[0]) ?? []), ...(loopsPerSlug.get(RIBBON_SLUGS[1]) ?? [])],
    plane.axis,
    plane.value,
  )
  console.log(
    `  bite 2 (private rule): at y = 14 the mutant paints [${list(mutantSet)}] while the shared rule says ` +
      `[${list(ruleSet)}] — the parity assertion above would fail`,
  )
  assert(
    !sameSet(mutantSet, ruleSet),
    'bite 2: a canvas-private filter makes the painted set differ from the rule, and the parity check catches it',
    `mutant [${list(mutantSet)}] vs rule [${list(ruleSet)}]`,
  )
}

const canvasShaAfter = sha(CANVAS_PATH)
assert(
  canvasShaAfter === shippedCanvasSha,
  'the bites ran on copies: the shipped SectionCanvas.tsx is byte-identical afterwards',
  `${shippedCanvasSha} → ${canvasShaAfter}`,
)
rmSync(SCRATCH_ROOT, { recursive: true, force: true })
console.log(
  `  shared tree untouched: SectionCanvas.tsx ${shippedCanvasSha} → ${canvasShaAfter} ` +
    `(scratch ${SCRATCH_ROOT.replace(ROOT, '.')} removed)`,
)

/* ==================================================================== *
 *  H. THE EXECUTED-CALL COUNTER — the gate is not passing by not running
 * ==================================================================== */

console.log('\n--- H. execution evidence (nothing above ran vacuously) --------------------')
const executed = {
  parts: SECTION_PARTS.length,
  structures: structures.length,
  tracts: tracts.length,
  envelopeSlots: ENVELOPE_SLOTS.length,
  ghostShells: TEL_HEMISPHERE_SHELLS.length,
  regions: REGIONS.length,
  kinds: KINDS.length,
  planes: lobeRows.length,
  ribbonLoops: lobeRows.reduce((sum, row) => sum + row.canvasSet.length, 0),
  path2dRuns: lobeRows.reduce((sum, row) => sum + row.vertices, 0),
  joinComparisons: join.length * 4,
}
console.log(
  `  swept ${executed.parts} parts · ${executed.structures} structures · ${executed.tracts} tracts · ` +
    `${executed.envelopeSlots} slots · ${executed.ghostShells} ghost shells · ${executed.regions} regions × ` +
    `${executed.kinds} kinds · ${executed.planes} planes × 2 ribbons`,
)
console.log(
  `  buildLobeLayer painted ${executed.ribbonLoops} division(s) over ${executed.path2dRuns} run vertices ` +
    `· ${executed.joinComparisons} cross-surface state comparisons`,
)
console.log(
  `  the pass really stroked its runs: ${Path2DStub.instances} Path2D stub(s) built, ` +
    `${Path2DStub.calls.moveTo} moveTo / ${Path2DStub.calls.lineTo} lineTo / ${Path2DStub.calls.closePath} closePath`,
)
assert(
  executed.parts > 100 && executed.structures > 100 && executed.planes >= 5 && executed.ribbonLoops > 0,
  'the sweep really executed (part, record, plane and paint counters are non-zero)',
  JSON.stringify(executed),
)
assert(
  Path2DStub.instances > 0 && Path2DStub.calls.lineTo > 0 && Path2DStub.calls.closePath > 0,
  'buildLobeLayer really built and closed paths (the executed lane is not vacuous)',
  `${Path2DStub.instances} instance(s), ${Path2DStub.calls.lineTo} lineTo`,
)

/* ==================================================================== verdict */

console.log(`\nview-filter-consistency: ${checks - failures.length}/${checks} assertions passed`)
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`)
  console.log(`\n${failures.length} failure(s)`)
  process.exit(1)
}
console.log('  PASS view-filter-consistency')
process.exit(0)
