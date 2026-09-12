/**
 * division-toggles.mjs — the committed check for v10 §2 (division-level
 * visibility: Prosencephalon / Mesencephalon / Rhombencephalon / vasculature,
 * each with an on-off checkbox and a SOLO action).
 *
 * WHAT THIS PROVES. It imports the SHIPPED store (`src/state/store.ts`) — the
 * real module, through the same in-process TS/TSX loader the Node-only audit
 * mirror uses (no copy, no re-typed table) — and drives the real actions:
 *
 *   1  the shipped source declares the four divisions and the four
 *      region-writing actions the UI calls (a missing action is a dead control,
 *      and a *pure function* nobody wired to the store looks identical otherwise);
 *   2  the four divisions are the documented ones and PARTITION `ALL_REGIONS`
 *      exactly — no orphan, no region in two divisions (that is what makes the
 *      control complete);
 *   3  a fresh boot still reports `brainstem-focus` with the documented default
 *      state (the store's own load-time assertion re-runs on every import here,
 *      so N imports = N executions of it; the count is printed);
 *   4  soloing each division leaves EXACTLY that division's regions layer-on and
 *      every other region off — through the store action AND the pure function;
 *   5  the checkbox path toggles exactly its regions: incomplete → all on (a
 *      union, idempotent), complete → all off, and the previous region set is
 *      restored exactly;
 *   6  `vasculature` is never swept into a brain division (matrix printed);
 *   7  `kinds` / `hidden` / `emphasis` are set-equal before and after every call
 *      (a division filter must not rewrite the preset framing);
 *   8  the BITE half: four deliberate defects are injected in-process and a named
 *      check must fail on each one of them, so this gate cannot "pass by not
 *      running"; and a mutated `DIVISIONS` table is run in an isolated copy of
 *      the tree and must trip the store's own load-time partition assertion;
 *   9  a real React render of `<Legend />` yields one checkbox + one solo button
 *      per division with DISTINCT accessible names, keeps every kind/region row
 *      and the palette, and puts the division control above them — the a11y
 *      surface the Node lane can observe (rendered pixels and real key presses
 *      stay orchestrator-only: Chrome cannot start in this sandbox).
 *
 * Every check prints its numbers (the per-division layer sets included) and the
 * script exits non-zero if any assertion fails.
 *
 * Run:  node scripts/verify/division-toggles.mjs
 * npm:  "verify:division-toggles": "node scripts/verify/division-toggles.mjs"
 */
import { spawnSync } from 'node:child_process'
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve('.')
const require_ = createRequire(import.meta.url)
/** Node's own resolution from the workspace root — finds the app's dependencies. */
const projectRequire = createRequire(resolve(ROOT, 'package.json'))
const ts = require_('typescript')
const moduleUrl = (relative, tag = '') => pathToFileURL(resolve(ROOT, relative)).href + tag


const readSource = (relative) => readFileSync(resolve(ROOT, relative), 'utf8')
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n')
const sorted = (iterable) => [...iterable].sort()

/* --------------------------------------------------- the shipped-store loader */

/**
 * Same technique as `audit-checks.test.mjs` and `boundary-contract.mjs`: the
 * app's own `.ts`/`.tsx` sources are transpiled in-process (extensionless
 * relative imports resolved the way Vite resolves them, JSON imports wrapped,
 * `import.meta.glob` emulated), so the SHIPPED module is what runs — nothing is
 * copied, stubbed or re-typed for the test's convenience. Duplicated rather than
 * imported from the mirror because the mirror is a test harness, not a library.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const directory = resolve(base, '..')
      for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
        const candidate = resolve(directory, specifier + extension)
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: `export default ${JSON.stringify(parsed)}`, shortCircuit: true }
    }
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      const filePath = fileURLToPath(url)
      let source = readFileSync(filePath, 'utf8')
      // `import.meta.glob(..., { eager: true, import: 'default' })` is a Vite
      // build-time transform (`src/data/load.ts` needs it); only the eager form
      // is used by the modules this gate touches.
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
            const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
              a.name.localeCompare(b.name),
            )
            for (const entry of entries) {
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
          const mapped = walk(baseDir, '').map((relative) => {
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
          return `{ ${mapped.join(', ')} }`
        },
      )
      const output = ts.transpileModule(source, {
        fileName: url,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      })
      return { format: 'module', source: output.outputText, shortCircuit: true }
    }
    // Vite asset imports (`?url` on binaries / raw CSS) resolve to a URL string
    // in the app; this lane never decodes them.
    const pathOnly = url.split('?')[0]
    if (
      url.startsWith('file:') &&
      /\.(jpe?g|png|svg|webp|gif|glb|gltf|bin|ktx2|hdr|mp3|ogg|wasm|css)$/i.test(pathOnly)
    ) {
      return { format: 'module', source: 'export default undefined', shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

// The region/kind enums these assertions are written against come from the shipped
// data module (never re-typed here). Imported AFTER the loader hook above, so the
// JSON imports inside src/data/load.ts resolve the way Vite resolves them.
const ALL_REGIONS = (await import(moduleUrl('src/data/load.ts'))).ALL_REGIONS
const ALL_KINDS = (await import(moduleUrl('src/data/load.ts'))).ALL_KINDS

/** The four divisions, as this check *expects* them (docs/SWARM_V10_PLAN.md §2). */
const EXPECTED_DIVISIONS = [
  { id: 'prosencephalon', label: 'Prosencephalon (forebrain)', regions: ['telencephalon', 'diencephalon'] },
  { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', regions: ['midbrain'] },
  { id: 'rhombencephalon', label: 'Rhombencephalon (hindbrain)', regions: ['pons', 'cerebellum', 'medulla'] },
  { id: 'vasculature', label: 'Cerebral vasculature', regions: ['vasculature'] },
]

/* ----------------------------------------------------------------- reporting */

let passed = 0
const failures = []
const checks = []
/** When set, verdicts are captured instead of recorded (the bite re-runs). */
let sink = null

function ok(message) {
  if (sink !== null) {
    sink.push({ good: true, message })
    return
  }
  passed += 1
  checks[checks.length - 1].passed += 1
  console.log(`  ok   ${message}`)
}

function bad(message) {
  if (sink !== null) {
    sink.push({ good: false, message })
    return
  }
  failures.push(`${checks[checks.length - 1].title} — ${message}`)
  checks[checks.length - 1].failed += 1
  console.log(`  FAIL ${message}`)
}

function info(message) {
  if (sink === null) console.log(`  info ${message}`)
}

/** Element-wise comparison: stable for arrays AND sets, whatever their order. */
function elementEqual(actual, expected) {
  const left = [...toIterable(actual)]
  const pool = [...toIterable(expected)]
  if (left.length !== pool.length) return false
  for (const value of left) {
    const at = pool.indexOf(value)
    if (at < 0) return false
    pool.splice(at, 1)
  }
  return true
}

/** One reading for `equal`: sets/arrays are iterated, scalars are boxed. */
const toIterable = (value) =>
  value !== null && typeof value === 'object' && Symbol.iterator in value ? value : [value]

/**
 * Values are printed element-wise (`[a, b, c]`), never as `Set(7) {…}`: a set that
 * compares unequal must show WHICH member differs, and a big set (the default
 * preset's 32 hidden ids) must not print its whole contents on every assertion.
 */
function equal(label, actual, expected) {
  const show = (value) => `[${[...toIterable(value)].join(', ')}]`
  const good = elementEqual(actual, expected)
  good
    ? ok(`${label} = ${show(actual)}`)
    : bad(`${label} = ${show(actual)} (expected ${show(expected)})`)
  return good
}

/** For scalars and structured expectations (division ids, labels, matrices). */
function equalJson(label, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected)
  good
    ? ok(`${label} = ${JSON.stringify(actual)}`)
    : bad(`${label} = ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`)
  return good
}

/** Size-and-membership assertion — for the layer fields a division call must NOT touch. */
function equalSet(label, actual, expected) {
  const good = actual.size === expected.size && [...actual].every((value) => expected.has(value))
  good
    ? ok(`${label} unchanged (${actual.size} entries)`)
    : bad(`${label} CHANGED: ${actual.size} entries, expected ${expected.size}`)
  return good
}

function truthy(label, value, detail = '') {
  const text = `${label}${detail === '' ? '' : ` — ${detail}`}`
  value ? ok(text) : bad(text)
  return Boolean(value)
}

/* -------------------------------------------------------------- store access */

let storeTag = 0

/**
 * A FRESH instance of the shipped store. The query-suffix trick re-evaluates the
 * module, which is deliberate: its load-time assertion blocks (the default
 * framing and the division partition) run again on every import, so the instance
 * count is also how many times those assertions executed in this run.
 */
async function freshStore() {
  storeTag += 1
  return import(moduleUrl('src/state/store.ts', `?instance=${storeTag}`))
}

let shared = null
/** The instance whose ACTIONS are driven, so the store path is covered too. */
async function sharedStore() {
  if (shared === null) shared = await freshStore()
  return shared
}

/** The layer state as plain arrays — sets are never compared by identity here. */
function readState(module) {
  const layers = module.useAtlasStore.getState().layers
  return {
    regions: sorted(layers.regions),
    kinds: sorted(layers.kinds),
    hidden: sorted(layers.hidden),
    emphasis: sorted(layers.emphasis),
  }
}

function setState(module, state) {
  module.useAtlasStore.setState({
    layers: {
      regions: new Set(state.regions),
      kinds: new Set(state.kinds),
      hidden: new Set(state.hidden),
      emphasis: new Set(state.emphasis),
    },
  })
}

/** Every region of every division other than `id`. */
const otherRegions = (all, id) =>
  all.filter((division) => division.id !== id).flatMap((division) => [...division.regions])

/** A layer set with every region and kind on — the user's "everything on" state. */
const fullyLit = () => ({
  regions: new Set(ALL_REGIONS),
  kinds: new Set(ALL_KINDS),
  hidden: new Set(['probe-hidden']),
  emphasis: new Set(['probe-emphasis']),
})

/* ═════════════════════════════════════ the checks, as re-runnable functions ═ */

/**
 * The SHIPPED implementations, held in a MUTABLE table: ES module namespaces are
 * frozen, so the bite section below cannot monkey-patch the module itself. The
 * checks always call through this table, which is why replacing one entry here
 * genuinely replaces the behaviour under test (a copy that only the bite used
 * would prove nothing).
 */
const impl = {
  applyDivisionLayers: undefined,
  clearDivisionLayers: undefined,
  soloDivisionLayers: undefined,
  toggleDivisionLayers: undefined,
  divisionLayersOn: undefined,
}

/** Fill the table from the freshly imported shipped store (called by the driver). */
function bindImplementations(module) {
  impl.applyDivisionLayers = module.applyDivisionLayers
  impl.clearDivisionLayers = module.clearDivisionLayers
  impl.soloDivisionLayers = module.soloDivisionLayers
  impl.toggleDivisionLayers = module.toggleDivisionLayers
  impl.divisionLayersOn = module.divisionLayersOn
}

const divide = (id) => store.DIVISIONS.find((division) => division.id === id)

const RUNNERS = {}

/* ---------------------------------------------------------------- 1. surface */

RUNNERS.surface = () => {
  const code = stripComments(readSource('src/state/store.ts'))
  for (const fact of ['DIVISIONS', 'divisionsOf', 'applyDivisionLayers', 'clearDivisionLayers', 'soloDivisionLayers']) {
    truthy(`store.ts exports ${fact}`, new RegExp(`export (function|const) ${fact}\\b`).test(code))
  }
  const state = store.useAtlasStore.getState()
  for (const action of ['applyDivision', 'clearDivision', 'toggleDivision', 'soloDivision']) {
    truthy(`store.ts declares the "${action}" action`, new RegExp(`\\b${action}:\\s*\\(`).test(code))
    truthy(`useAtlasStore.getState().${action} is callable`, typeof state[action] === 'function')
  }
  const legend = stripComments(readSource('src/components/Legend.tsx'))
  truthy(
    'Legend.tsx imports DIVISIONS from the store',
    /DIVISIONS/.test(legend) && /from '\.\.\/state\/store'/.test(legend),
  )
  truthy('Legend.tsx calls toggleDivision', /toggleDivision\(division\.id\)/.test(legend))
  truthy('Legend.tsx calls soloDivision', /soloDivision\(division\.id\)/.test(legend))
  const hooks = (legend.match(/data-division=/g) ?? []).length
  truthy('Legend.tsx addresses every control with data-division', hooks >= 2, `${hooks} occurrences`)
}

/* ------------------------------------------------- 2. definition + partition */

RUNNERS.definition = () => {
  equalJson('DIVISIONS ids', store.DIVISIONS.map((division) => division.id), EXPECTED_DIVISIONS.map((d) => d.id))
  equalJson('DIVISIONS labels', store.DIVISIONS.map((division) => division.label), EXPECTED_DIVISIONS.map((d) => d.label))
  for (const expected of EXPECTED_DIVISIONS) {
    const actual = divide(expected.id)
    equal(`division ${expected.id} regions`, actual ? [...actual.regions] : null, expected.regions)
  }
  const union = []
  const duplicates = []
  for (const division of store.DIVISIONS) {
    for (const region of division.regions) {
      if (!ALL_REGIONS.includes(region)) bad(`division ${division.id} claims "${region}", absent from ALL_REGIONS`)
      if (union.includes(region)) duplicates.push(`${region} (again in ${division.id})`)
      union.push(region)
    }
  }
  equal('the union of the four divisions', sorted(union), sorted(ALL_REGIONS))
  equal('regions claimed by two divisions', duplicates, [])
  equal('regions no division reaches', ALL_REGIONS.filter((region) => store.divisionsOf(region).length === 0), [])
  for (const region of ALL_REGIONS) {
    const owner = EXPECTED_DIVISIONS.filter((division) => division.regions.includes(region)).map((d) => d.id)
    equalJson(`divisionsOf('${region}')`, [...store.divisionsOf(region)], owner)
  }
}

/* ------------------------------------------------------------ 3. default boot */

RUNNERS.boot = () => {
  const boot = store.DEFAULT_LAYERS
  equal('viewPresetOf(DEFAULT_LAYERS)', store.viewPresetOf(boot), 'brainstem-focus')
  equal(
    'DEFAULT_LAYERS.regions',
    sorted(boot.regions),
    sorted(ALL_REGIONS.filter((region) => region !== 'vasculature')),
  )
  equal('DEFAULT_LAYERS.kinds', sorted(boot.kinds), sorted(ALL_KINDS))
  truthy('the vasculature REGION is off at boot', !boot.regions.has('vasculature'), 'v8: the arterial overlay is hidden by default')
  truthy('the vessel KIND is on at boot', boot.kinds.has('vessel'))
  const vessels = store.DIVISIONS.length > 0 ? [...boot.hidden].filter((id) => id.includes('artery') || id.includes('art-')) : []
  equal('vessels hidden at STRUCTURE level at boot', vessels, [])
  truthy('no division persistence key exists in the store', !/neuroaxis\.division/i.test(readSource('src/state/store.ts')))
  for (const division of store.DIVISIONS) {
    info(
      `boot checkbox "${division.label}": ${impl.divisionLayersOn(boot, division.id) ? 'ticked' : 'unticked'} — ` +
        division.regions.map((region) => `${region}:${boot.regions.has(region) ? 'on' : 'off'}`).join(', '),
    )
  }
}

/* ------------------------------------------------------------------- 4. solo */

RUNNERS.solo = async () => {
  const module = await sharedStore()
  for (const division of EXPECTED_DIVISIONS) {
    setState(module, readState(store))
    module.useAtlasStore.getState().soloDivision(division.id)
    const afterAction = readState(module)
    equal(`solo("${division.id}") → regions (via the store action)`, afterAction.regions, sorted(division.regions))
    equal(
      `solo("${division.id}") → every other region is off`,
      otherRegions(EXPECTED_DIVISIONS, division.id).filter((region) => afterAction.regions.includes(region)),
      [],
    )
    const soloed = impl.soloDivisionLayers(fullyLit(), division.id)
    equal(`solo("${division.id}") from all-7-on → regions (pure)`, sorted(soloed.regions), sorted(division.regions))
    equal(
      `solo("${division.id}") is idempotent`,
      sorted(impl.soloDivisionLayers(soloed, division.id).regions),
      sorted(soloed.regions),
    )
    info(
      `${division.label}: ${division.regions.join(' + ')} on · ` +
        `${sorted(ALL_REGIONS.filter((region) => !soloed.regions.has(region))).join(', ')} off`,
    )
  }
  setState(module, readState(store))
}

/* ---------------------------------------------------------- 5. checkbox path */

RUNNERS.checkbox = async () => {
  const module = await sharedStore()
  for (const division of EXPECTED_DIVISIONS) {
    const other = otherRegions(EXPECTED_DIVISIONS, division.id)
    const base = readState(store)
    const off = { ...base, regions: base.regions.filter((region) => !division.regions.includes(region)) }
    setState(module, off)
    truthy(
      `"${division.id}": an incomplete division reads as unticked`,
      !impl.divisionLayersOn(module.useAtlasStore.getState().layers, division.id),
    )
    // The UI's checkbox click: the store writes whatever the pure decision says
    // (the wiring), and the decision itself is the table entry the bite section
    // replaces — so this assertion covers both halves.
    module.useAtlasStore.setState((state) => ({
      layers: impl.toggleDivisionLayers(state.layers, division.id),
    }))
    const onState = readState(module)
    equal(
      `toggle("${division.id}") OFF→ON adds exactly its regions`,
      onState.regions,
      sorted([...off.regions, ...division.regions]),
    )
    equal(
      `toggle("${division.id}") leaves every other region untouched`,
      onState.regions.filter((region) => other.includes(region)),
      sorted(off.regions.filter((region) => other.includes(region))),
    )
    truthy(
      `"${division.id}": a complete division reads as ticked`,
      impl.divisionLayersOn(module.useAtlasStore.getState().layers, division.id),
    )
    module.useAtlasStore.setState((state) => ({
      layers: impl.toggleDivisionLayers(state.layers, division.id),
    }))
    const offAgain = readState(module)
    equal(`toggle("${division.id}") twice restores the previous region set exactly`, offAgain.regions, sorted(off.regions))

    // The shipped ACTION the Legend's checkbox calls must also be wired (a pure
    // helper nobody calls looks identical otherwise).
    const beforeAction = readState(module)
    module.useAtlasStore.getState().applyDivision(division.id)
    const afterAction = readState(module)
    equal(
      `the applyDivision ACTION agrees with applyDivisionLayers for "${division.id}"`,
      afterAction.regions,
      sorted(impl.applyDivisionLayers(beforeAction, division.id).regions),
    )
    module.useAtlasStore.getState().clearDivision(division.id)
    equal(
      `the clearDivision ACTION agrees with clearDivisionLayers for "${division.id}"`,
      readState(module).regions,
      sorted(impl.clearDivisionLayers(afterAction, division.id).regions),
    )
    setState(module, beforeAction)

    const lit = fullyLit()
    const applied = impl.applyDivisionLayers(lit, division.id)
    equal(`applyDivisionLayers on all-7-on is the identity for "${division.id}"`, sorted(applied.regions), sorted(ALL_REGIONS))
    equal(
      `applyDivisionLayers is idempotent for "${division.id}"`,
      sorted(impl.applyDivisionLayers(applied, division.id).regions),
      sorted(applied.regions),
    )
    const narrow = { ...lit, regions: new Set(['vasculature']) }
    equal(
      `applyDivisionLayers unions into an existing set for "${division.id}"`,
      sorted(impl.applyDivisionLayers(narrow, division.id).regions),
      sorted(new Set(['vasculature', ...division.regions])),
    )
    const cleared = impl.clearDivisionLayers(lit, division.id)
    equal(
      `clearDivisionLayers removes exactly its regions for "${division.id}"`,
      sorted(cleared.regions),
      sorted(ALL_REGIONS.filter((region) => !division.regions.includes(region))),
    )
  }
  setState(module, readState(store))
}

/* ------------------------------------------------------------- 6. vasculature */

RUNNERS.vascular = () => {
  equal("divisionsOf('vasculature')", [...store.divisionsOf('vasculature')], ['vasculature'])
  for (const division of store.DIVISIONS) {
    if (division.id === 'vasculature') continue
    truthy(
      `division "${division.id}" does not contain the vasculature region`,
      !division.regions.includes('vasculature'),
      `regions: ${division.regions.join(' + ')}`,
    )
  }
  for (const division of store.DIVISIONS) {
    const soloed = impl.soloDivisionLayers(fullyLit(), division.id)
    equal(
      `after solo("${division.id}") the vascular region is`,
      soloed.regions.has('vasculature'),
      division.id === 'vasculature',
    )
  }
  console.log('  ── 7×4 region × division matrix')
  console.log(`     ${'region'.padEnd(14)}${store.DIVISIONS.map((d) => d.id.padEnd(17)).join('')}`)
  for (const region of ALL_REGIONS) {
    console.log(
      `     ${region.padEnd(14)}${store.DIVISIONS.map((d) => (d.regions.includes(region) ? '●' : '·').padEnd(17)).join('')}`,
    )
  }
}

/* ------------------------------------------------- 7. framing left untouched */

RUNNERS.framing = async () => {
  const module = await sharedStore()
  const start = readState(store)

  // The pure half, on a layer set whose kinds/hidden/emphasis are distinctive:
  // a division call that rebuilds the layer object and forgets a field fails
  // HERE, not only in the store-driven loop below (where the store's own merge
  // can hide it).
  const lit = fullyLit()
  for (const division of EXPECTED_DIVISIONS) {
    for (const [name, result] of [
      ['soloDivisionLayers', impl.soloDivisionLayers(lit, division.id)],
      ['applyDivisionLayers', impl.applyDivisionLayers(lit, division.id)],
      ['clearDivisionLayers', impl.clearDivisionLayers(lit, division.id)],
      ['toggleDivisionLayers', impl.toggleDivisionLayers(lit, division.id)],
    ]) {
      equalSet(`${name}("${division.id}") kinds`, new Set(result.kinds), new Set(lit.kinds))
      equalSet(`${name}("${division.id}") hidden`, new Set(result.hidden), new Set(lit.hidden))
      equalSet(`${name}("${division.id}") emphasis`, new Set(result.emphasis), new Set(lit.emphasis))
    }
  }

  setState(module, start)
  for (const division of EXPECTED_DIVISIONS) {
    for (const [name, run] of [
      ['soloDivision', () => module.useAtlasStore.getState().soloDivision(division.id)],
      ['applyDivision', () => module.useAtlasStore.getState().applyDivision(division.id)],
      ['clearDivision', () => module.useAtlasStore.getState().clearDivision(division.id)],
      ['toggleDivision', () => module.useAtlasStore.getState().toggleDivision(division.id)],
    ]) {
      run()
      const after = readState(module)
      equalSet(`${name}("${division.id}") kinds`, new Set(after.kinds), new Set(start.kinds))
      equalSet(`${name}("${division.id}") hidden`, new Set(after.hidden), new Set(start.hidden))
      equalSet(`${name}("${division.id}") emphasis`, new Set(after.emphasis), new Set(start.emphasis))
    }
  }
  setState(module, start)
}

/* -------------------------------------------------------------------- 8. bite */

/** The deliberate defects, as drop-in replacements for the shipped functions. */
const DEFECTS = {
  assignment: {
    applyDivisionLayers: (layers, id) => ({ ...layers, regions: new Set(divide(id).regions) }),
    toggleDivisionLayers: (layers, id) => ({ ...layers, regions: new Set(divide(id).regions) }),
  },
  partial: {
    applyDivisionLayers: (layers, id) => {
      const regions = new Set(layers.regions)
      for (const region of divide(id).regions.slice(0, -1)) regions.add(region)
      return { ...layers, regions }
    },
    toggleDivisionLayers: (layers, id) => {
      const regions = new Set(layers.regions)
      for (const region of divide(id).regions.slice(0, -1)) regions.add(region)
      return { ...layers, regions }
    },
  },
  swept: {
    soloDivisionLayers: (layers, id) => {
      const regions = new Set(divide(id).regions)
      if (id !== 'vasculature') regions.add('vasculature')
      return { ...layers, regions }
    },
  },
  clobber: {
    soloDivisionLayers: (layers, id) => ({
      regions: new Set(divide(id).regions),
      kinds: new Set(['nucleus']),
      hidden: layers.hidden,
      emphasis: layers.emphasis,
    }),
  },
}

/** Which check titles a defect is expected to break. */
const DEFECT_TARGETS = {
  assignment: ['5.'],
  partial: ['4.', '5.'],
  swept: ['6.'],
  clobber: ['7.'],
}

/**
 * Inject one defect, re-run its target checks with the verdicts captured, and
 * report which assertion caught it. Nothing here can pass by not running: a
 * defect nobody catches is itself a failure of this gate.
 */
async function bite(name) {
  const originals = {}
  for (const [key, value] of Object.entries(DEFECTS[name])) {
    originals[key] = impl[key]
    impl[key] = value
  }
  const captured = []
  sink = captured
  try {
    for (const title of DEFECT_TARGETS[name]) await RUNNERS[RUNNER_BY_TITLE[title]]()
  } finally {
    sink = null
    for (const [key, value] of Object.entries(originals)) impl[key] = value
  }
  const caught = captured.filter((record) => !record.good)
  caught.length === 0
    ? bad(`defect "${name}" was NOT caught by ${DEFECT_TARGETS[name].join('/')} — the gate is toothless`)
    : ok(`defect "${name}" caught: ${caught[0].message.slice(0, 130)}`)
}

async function RUNNERS_bite() {
  for (const name of Object.keys(DEFECTS)) {
    info(`[bite] injecting "${name}" → replacing ${Object.keys(DEFECTS[name]).join(', ')}`)
    await bite(name)
  }
}

RUNNERS.bite = RUNNERS_bite

/** The load-time assertion bite, in an isolated copy of the tree. */
RUNNERS['bite-partition'] = () => {
  const work = resolve(ROOT, '.plate-scratch/v10-division-bite')
  const copy = resolve(work, 'tree')
  const log = resolve(work, 'probe.log')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(copy, { recursive: true })
  for (const entry of ['src', 'scripts']) cpSync(resolve(ROOT, entry), resolve(copy, entry), { recursive: true })
  for (const file of ['package.json', 'tsconfig.json']) {
    if (existsSync(resolve(ROOT, file))) cpSync(resolve(ROOT, file), resolve(copy, file))
  }
  symlinkSync(resolve(ROOT, 'node_modules'), resolve(copy, 'node_modules'), 'junction')

  // The defect: the arteries folded into the rhombencephalon — the one grouping
  // error the item's wording calls out.
  const FROM = "    regions: ['pons', 'cerebellum', 'medulla'],"
  const TO = "    regions: ['pons', 'medulla', 'vasculature'],"
  const target = resolve(copy, 'src/state/store.ts')
  const pristine = readFileSync(target, 'utf8')
  const occurrences = pristine.split(FROM).length - 1
  occurrences === 1
    ? ok(`the mutation anchor appears exactly once in the copy (${occurrences}×)`)
    : bad(`the mutation anchor appears ${occurrences}× in the copied store.ts — fix this check`)
  writeFileSync(target, pristine.replace(FROM, TO))

  const probe = resolve(copy, 'scripts/verify/_division-bite-probe.mjs')
  // The probe lives in the COPY and needs the copy's own module resolution: the
  // app's sources use extensionless relative imports, which Node's ESM loader
  // does not resolve (Vite does). A minimal loader hook — the same two rules the
  // gate above registers — is written next to the probe so the subprocess is
  // self-contained.
  writeFileSync(
    probe,
    `import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve('.')
const require_ = createRequire(resolve(ROOT, 'package.json'))
const ts = require_('typescript')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const directory = resolve(base, '..')
      for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
        const candidate = resolve(directory, specifier + extension)
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: 'export default ' + JSON.stringify(parsed), shortCircuit: true }
    }
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      let source = readFileSync(fileURLToPath(url), 'utf8')
      // src/data/load.ts is loaded only through Vite's import.meta.glob, which
      // does not exist under Node; emulate the eager form (read the real files)
      // so the SHIPPED data module is what runs here.
      source = source.replace(
        /import\\.meta\\.glob\\(\\s*'([^']+)'\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*,?\\s*\\)/g,
        (whole, pattern, options) => {
          const directory = resolve(fileURLToPath(url), '..')
          const lastSlash = pattern.lastIndexOf('/')
          const head = pattern.slice(0, lastSlash)
          const recursive = head.includes('**')
          const baseDir = resolve(directory, head.replace(/\\*\\*\\/?/g, ''))
          const filePattern = pattern.slice(lastSlash + 1)
          if (!existsSync(baseDir)) return '{}'
          const test = new RegExp('^' + filePattern.replace(/[.+^|[\\]\\\\]/g, '\\\\$&').replace(/[$(){}]/g, '\\\\$&').replace(/\\*/g, '.*') + '$')
          const wanted = (filePattern.match(/\\*(\\.[A-Za-z0-9]+)$/) || [])[1]
          const walk = (dir, prefix) => {
            const out = []
            for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
              const relative = prefix === '' ? entry.name : prefix + '/' + entry.name
              if (entry.isDirectory()) {
                if (recursive) out.push(...walk(resolve(dir, entry.name), relative))
                continue
              }
              if (wanted !== undefined && !entry.name.toLowerCase().endsWith(wanted.toLowerCase())) continue
              if (!test.test(entry.name)) continue
              out.push(relative)
            }
            return out
          }
          const raw = /\\?raw/.test(options)
          const mapped = walk(baseDir, '').map((relative) => {
            const full = resolve(baseDir, relative)
            const key = head.replace(/\\*\\*\\/?/g, '') + relative
            const value = raw ? readFileSync(full, 'utf8') : JSON.parse(readFileSync(full, 'utf8'))
            return JSON.stringify(key) + ': ' + JSON.stringify(value)
          })
          return '{ ' + mapped.join(', ') + ' }'
        },
      )
      const output = ts.transpileModule(source, {
        fileName: url,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      })
      return { format: 'module', source: output.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
const store = await import('../../src/state/store.ts')
console.log('store imported without throwing (DIVISIONS=' + store.DIVISIONS.length + ')')
`,
  )

  const fd = openSync(log, 'w')
  const run = spawnSync(process.execPath, ['scripts/verify/_division-bite-probe.mjs'], {
    cwd: copy,
    stdio: ['ignore', fd, fd],
  })
  closeSync(fd)
  const output = existsSync(log) ? readFileSync(log, 'utf8') : ''
  const firstError = output
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('Error: '))
  info(`[bite] mutated copy exits ${String(run.status)}`)
  truthy('the mutated copy exits non-zero', run.status !== 0 && run.status !== null, `exit ${String(run.status)}`)
  // The mutant leaves `cerebellum` unclaimed AND puts the arteries in a brain
  // division; the first assertion to fire is the partition rule, and the vascular
  // rule is the second. Both are accepted — what matters is that the store
  // refuses to load a table that could not drive a complete control.
  truthy(
    'the load-time assertion names the defect',
    (firstError ?? '').includes('belongs to 0 divisions') || (firstError ?? '').includes('is grouped into'),
    firstError === undefined ? '(no Error: line was printed)' : firstError.slice(0, 190),
  )
  truthy(
    'the shared tree still holds the correct grouping',
    !readSource('src/state/store.ts').includes(TO),
  )
  rmSync(copy, { recursive: true, force: true })
}

/* -------------------------------------------------------------- 9. the Legend */

RUNNERS.legend = async () => {
  try {
    const React = projectRequire('react')
    const { renderToStaticMarkup } = projectRequire('react-dom/server')
    const Legend = (await import(moduleUrl('src/components/Legend.tsx'))).default
    const markup = renderToStaticMarkup(React.createElement(Legend))
    const inputs = [...markup.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map((match) => match[0])
    const aria = (tag) => (tag.match(/aria-label="([^"]+)"/) ?? [])[1] ?? ''
    const toggles = inputs.map(aria).filter((label) => label.startsWith('Toggle the '))
    const solos = [...markup.matchAll(/<button[^>]*data-division-action="solo"[^>]*>/g)].map((match) => aria(match[0]))
    equal('division checkboxes rendered', toggles.length, store.DIVISIONS.length)
    equal('solo buttons rendered', solos.length, store.DIVISIONS.length)
    equalJson('solo buttons without an accessible name', solos.filter((label) => label === ''), [])
    equalJson('toggles without an accessible name', toggles.filter((label) => label === ''), [])
    const names = [...toggles, ...solos]
    equalJson('accessible names are distinct', new Set(names).size, names.length)
    for (const division of store.DIVISIONS) {
      truthy(`a toggle exists for "${division.label}"`, toggles.some((label) => label.includes(division.label)))
      truthy(`a solo action exists for "${division.label}"`, solos.some((label) => label.includes(division.label)))
    }
    for (const kind of ALL_KINDS) truthy(`the "${kind}" kind row still renders`, markup.includes(`>${kind}<`))
    for (const region of ALL_REGIONS) truthy(`the "${region}" region row still renders`, markup.includes(`>${region}<`))
    truthy('the palette swatches still render', markup.includes('Palette (kind / direction)'))
    const divisionIndex = markup.indexOf('Toggle the ')
    const regionIndex = markup.indexOf(`>${ALL_REGIONS[0]}<`)
    truthy('the division control is rendered above the per-region rows', divisionIndex >= 0 && divisionIndex < regionIndex)
    info(`[render] ${toggles.length} division checkboxes + ${solos.length} solo buttons`)
    for (const name of names) info(`[render] accessible name: "${name}"`)
  } catch (error) {
    bad(`could not render <Legend /> under Node: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/* ------------------------------------------- 10. the wired control behaviour */

/**
 * The END-TO-END handler proof, in an isolated copy of the tree.
 *
 * Check 9 proves the DOM contract; this one proves the controls are WIRED —
 * that a Solo click writes the store and that the checkbox's own onChange
 * toggles exactly its regions, checked state included. It needs a copy for one
 * reason: `<Legend />` reads the store through zustand's hook, and a hook cannot
 * run outside a renderer. In the copy the hook is replaced by a plain state read
 * (`src/components/_division-hook-stub.ts`), which is what makes calling the
 * component and firing the handlers it returned possible at all. Everything else
 * — the component, the store, the actions — is the shipped source.
 */
RUNNERS.behaviour = () => {
  const require_ = createRequire(import.meta.url)
  const React = require_('react')
  const { renderToStaticMarkup } = require_('react-dom/server')
  const work = resolve(ROOT, '.plate-scratch/v10-division-behaviour')
  const tree = resolve(work, 'tree')
  const log = resolve(work, 'probe.log')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(tree, { recursive: true })
  cpSync(resolve(ROOT, 'src'), resolve(tree, 'src'), { recursive: true })
  cpSync(resolve(ROOT, 'package.json'), resolve(tree, 'package.json'))
  const legendPath = resolve(tree, 'src/components/Legend.tsx')
  const legendSource = readFileSync(legendPath, 'utf8')
  const IMPORT_FROM = "import { DIVISIONS, useAtlasStore } from '../state/store'"
  const occurrences = legendSource.split(IMPORT_FROM).length - 1
  occurrences === 1
    ? ok('the Legend imports its controls from the store (anchor found once)')
    : bad(`the Legend import anchor appears ${occurrences}× — fix this check`)
  writeFileSync(
    resolve(tree, 'src/components/_division-hook-stub.ts'),
    "import { useAtlasStore as real } from '../state/store'\n\n"
      + '// Probe-only: the store hook as a plain state read, so the component can be\n'
      + '// called outside a renderer and its handlers driven directly.\n'
      + 'export const useAtlasStore = (selector) => selector(real.getState())\n',
  )
  writeFileSync(
    legendPath,
    legendSource
      .replace(IMPORT_FROM, "import { DIVISIONS } from '../state/store'\nimport { useAtlasStore } from './_division-hook-stub'"),
  )
  try {
    symlinkSync(resolve(ROOT, 'node_modules'), resolve(tree, 'node_modules'), 'junction')
  } catch {
    /* a junction already exists from a previous run */
  }
  const probe = resolve(tree, 'scripts/_division-behaviour-probe.mjs')
  mkdirSync(resolve(tree, 'scripts'), { recursive: true })
  writeFileSync(
    probe,
    `import { createRequire } from 'node:module'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve('.')
const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const directory = resolve(base, '..')
      for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
        const candidate = resolve(directory, specifier + extension)
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: 'export default ' + JSON.stringify(parsed), shortCircuit: true }
    }
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      let source = readFileSync(fileURLToPath(url), 'utf8')
      source = source.replace(
        /import\\.meta\\.glob\\(\\s*'([^']+)'\\s*,\\s*\\{([\\s\\S]*?)\\}\\s*,?\\s*\\)/g,
        (whole, pattern, options) => {
          const directory = resolve(fileURLToPath(url), '..')
          const lastSlash = pattern.lastIndexOf('/')
          const head = pattern.slice(0, lastSlash)
          const recursive = head.includes('**')
          const baseDir = resolve(directory, head.replace(/\\*\\*\\/?/g, ''))
          const filePattern = pattern.slice(lastSlash + 1)
          if (!existsSync(baseDir)) return '{}'
          const test = new RegExp('^' + filePattern.replace(/[.+^|[\\]\\\\]/g, '\\\\$&').replace(/[$(){}]/g, '\\\\$&').replace(/\\*/g, '.*') + '$')
          const wanted = (filePattern.match(/\\*(\\.[A-Za-z0-9]+)$/) || [])[1]
          const walk = (dir, prefix) => {
            const out = []
            for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
              const relative = prefix === '' ? entry.name : prefix + '/' + entry.name
              if (entry.isDirectory()) {
                if (recursive) out.push(...walk(resolve(dir, entry.name), relative))
                continue
              }
              if (wanted !== undefined && !entry.name.toLowerCase().endsWith(wanted.toLowerCase())) continue
              if (!test.test(entry.name)) continue
              out.push(relative)
            }
            return out
          }
          const raw = /\\?raw/.test(options)
          const mapped = walk(baseDir, '').map((relative) => {
            const full = resolve(baseDir, relative)
            const value = raw ? readFileSync(full, 'utf8') : JSON.parse(readFileSync(full, 'utf8'))
            return JSON.stringify(head.replace(/\\*\\*\\/?/g, '') + relative) + ': ' + JSON.stringify(value)
          })
          return '{ ' + mapped.join(', ') + ' }'
        },
      )
      const output = ts.transpileModule(source, {
        fileName: url,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      })
      return { format: 'module', source: output.outputText, shortCircuit: true }
    }
    const pathOnly = url.split('?')[0]
    if (url.startsWith('file:') && /\\.(css|svg|png|glb|bin)$/i.test(pathOnly)) {
      return { format: 'module', source: 'export default undefined', shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const moduleUrl = (relative) => pathToFileURL(resolve(ROOT, relative)).href
const store = await import(moduleUrl('src/state/store.ts'))
const Legend = (await import(moduleUrl('src/components/Legend.tsx'))).default

function collect(node, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out)
    return out
  }
  if (node.type !== undefined && node.props !== undefined) {
    if (typeof node.type === 'function') collect(node.type(node.props), out)
    else {
      out.push(node)
      collect(node.props.children, out)
    }
  }
  return out
}
const render = () => {
  const nodes = collect(Legend({}))
  return {
    toggles: nodes
      .filter((node) => node.type === 'input' && (node.props['aria-label'] ?? '').startsWith('Toggle the '))
      .map((node) => ({ label: node.props['aria-label'], checked: node.props.checked, onChange: node.props.onChange })),
    solos: nodes
      .filter((node) => node.type === 'button')
      .map((node) => ({ label: node.props['aria-label'], onClick: node.props.onClick })),
  }
}
const regions = () => [...store.useAtlasStore.getState().layers.regions].sort()
const state = () => ({
  regions: regions(),
  checked: render().toggles.map((toggle) => toggle.checked),
  buttons: render().solos.length,
})

const steps = []
const record = (name, value) => steps.push({ name, value })

record('boot', state())
// Solo the mesencephalon: only the midbrain may survive, and the checkbox must follow.
render().solos[1].onClick()
record('afterSoloMesencephalon', state())
// Click its (now complete) checkbox: the division goes off — nothing left on.
render().toggles[1].onChange()
record('afterCheckboxOff', state())
// Click it again on the incomplete state: exactly the midbrain comes back.
render().toggles[1].onChange()
record('afterCheckboxOn', state())
// The vasculature checkbox adds and removes exactly its own region.
render().toggles[3].onChange()
record('afterVascularCheckboxOn', state())
render().toggles[3].onChange()
record('afterVascularCheckboxOff', state())
// Solo the forebrain from there: everything else off.
render().solos[0].onClick()
record('afterSoloProsencephalon', state())
console.log(JSON.stringify(steps))
`,
  )

  const fd = openSync(log, 'w')
  const run = spawnSync(process.execPath, ['scripts/_division-behaviour-probe.mjs'], {
    cwd: tree,
    stdio: ['ignore', fd, fd],
  })
  closeSync(fd)
  const output = existsSync(log) ? readFileSync(log, 'utf8') : ''
  const jsonLine = output
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('['))
  if (jsonLine === undefined) {
    bad(`the behaviour probe produced no result (exit ${String(run.status)}) — ${output.split('\n').slice(-3).join(' ').slice(0, 200)}`)
  } else {
    const steps = JSON.parse(jsonLine)
    const step = (name) => steps.find((entry) => entry.name === name)?.value
    equal('boot checkbox states', step('boot').checked, [true, true, true, false])
    equal('after a SOLO click on the mesencephalon', step('afterSoloMesencephalon').regions, ['midbrain'])
    equal(
      'after the SOLO click only that division reads ticked',
      step('afterSoloMesencephalon').checked,
      [false, true, false, false],
    )
    equal('the checkbox click on a complete division empties the view', step('afterCheckboxOff').regions, [])
    equal(
      'the checkbox click on an incomplete division restores exactly its regions',
      step('afterCheckboxOn').regions,
      ['midbrain'],
    )
    equal('the vasculature checkbox adds exactly the vascular region', step('afterVascularCheckboxOn').regions, ['midbrain', 'vasculature'])
    equal('the vasculature checkbox removes exactly the vascular region', step('afterVascularCheckboxOff').regions, ['midbrain'])
    equal('a SOLO click on the forebrain isolates telencephalon + diencephalon', step('afterSoloProsencephalon').regions, ['diencephalon', 'telencephalon'])
    equal('all four solo buttons still render after the clicks', step('afterSoloProsencephalon').buttons, 4)
    info(`[behaviour] ${steps.length} states captured by driving the shipped handlers: ${steps.map((entry) => entry.name).join(' → ')}`)
  }
  rmSync(tree, { recursive: true, force: true })
}

/* ------------------------------------------------------------------- driver */

/** The check titles, in order, mapped to their runner. */
const TITLES = [
  ['surface', '1. the shipped source declares the contract the Legend calls'],
  ['definition', '2. the four divisions are the documented ones and partition ALL_REGIONS'],
  ['boot', '3. a fresh boot still reports the brainstem-focus default (unchanged framing)'],
  ['solo', '4. soloing each division leaves EXACTLY its regions on (action + pure function)'],
  ['checkbox', '5. the checkbox path toggles exactly its regions (incomplete→on, complete→off, restores)'],
  ['vascular', '6. the vasculature region is never swept into a brain division'],
  ['framing', '7. kinds / hidden / emphasis are set-equal across every division call'],
  ['bite', '8. bite — every injected defect is caught by a named check'],
  ['bite-partition', "8b. bite — a mutated DIVISIONS table trips the store's load-time assertion"],
  ['legend', '9. the rendered Legend exposes the control with distinct accessible names'],
  ['behaviour', '10. the wired control: SOLO and the checkbox drive the store (isolated copy)'],
]
const RUNNER_BY_TITLE = Object.fromEntries(TITLES.map(([key, title]) => [title.split('.')[0] + '.', key]))

console.log('\n============ NeuroAxis v10 §2 — division-level visibility ============')
console.log(`  workspace: ${ROOT}`)
console.log('  under test: the SHIPPED src/state/store.ts and src/components/Legend.tsx')
console.log('  divisions:  Prosencephalon (forebrain) · Mesencephalon (midbrain) ·')
console.log('              Rhombencephalon (hindbrain) · Cerebral vasculature')

const store = await freshStore()
bindImplementations(store)

for (const [key, title] of TITLES) {
  const record = { title, passed: 0, failed: 0 }
  checks.push(record)
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`)
  await RUNNERS[key]()
}

console.log('\n================ division-toggles summary ================')
for (const record of checks) {
  console.log(`  ${record.failed === 0 ? '✓' : '✗'} ${record.title}`)
  console.log(`      ${record.passed} passed · ${record.failed} failed`)
}
console.log(`\n  store instances imported: ${storeTag} (each re-runs the store's own load-time assertions)`)
console.log(`  ${passed} assertions passed · ${failures.length} failed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const failure of failures) console.log(`  · ${failure}`)
  console.log('\nDIVISION-TOGGLE GATE FAILED\n')
  process.exit(1)
}
console.log('\n✔ solo isolates exactly one division; the checkbox toggles exactly its regions;')
console.log('  the arteries are their own division; the default framing is unchanged')
console.log('  (rendered pixels and real pointer/keyboard use stay orchestrator-only: Chrome')
console.log('   cannot start in this sandbox, so this lane asserts the rendered DOM instead)\n')
process.exit(0)
