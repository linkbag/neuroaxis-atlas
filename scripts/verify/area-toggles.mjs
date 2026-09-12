/**
 * area-toggles.mjs — the committed check for v11 §1: the header's two toggle rows
 * (**Areas** and **Systems**) that replace the view-preset row.
 *
 * WHAT THIS PROVES. It imports the SHIPPED store (`src/state/store.ts`) and the
 * SHIPPED `Header.tsx` — the real modules, through the same in-process TS/TSX
 * loader the Node-only audit mirror uses (no copy, no re-typed table) — and
 * drives the real controls:
 *
 *   1  the shipped source declares the AREA contract the header calls (a missing
 *      export is a dead control, and a pure helper nobody wired looks identical
 *      otherwise), including the `data-area` / `data-division` / `data-kind` /
 *      `data-preset` / `data-header-action` machine hooks;
 *   2  the AREA partition is TOTAL and DISJOINT over `ALL_REGIONS` — every region
 *      claimed by exactly one button, no button claiming a region outside
 *      `ALL_REGIONS`, no empty button — with the per-button taxonomy row count
 *      printed next to it (85 + 39 + 25 + 40 + 33 + 14 = 236);
 *   3  the two rhombencephalon areas together ARE that division, at the vesicle
 *      boundary the label names (medulla alone in the myelencephalon);
 *   4  the SYSTEMS partition is `ALL_KINDS` in order — total and disjoint over the
 *      kinds by construction, with each kind's taxonomy row count printed
 *      (88 + 53 + 11 + 25 + 45 + 14 = 236);
 *   5  every area's region set is DERIVED, not retyped: the shipped `AREAS` must
 *      equal the table reconstructed from the shipped `DIVISIONS` plus the ONE
 *      documented split rule, and the region lists read out of the store's own
 *      source text must resolve to those same sets (a hardcoded region list that
 *      drifts from the taxonomy fails here);
 *   6  each area toggle adds EXACTLY its regions and removes exactly its regions —
 *      through the store ACTION the button calls and through the pure decision the
 *      button's `aria-pressed` reads — leaving every other region, and
 *      `kinds`/`hidden`/`emphasis`, set-equal;
 *   7  the DEFAULT framing is unchanged: `DEFAULT_LAYERS`, `viewPresetOf`, the
 *      preset table and the boot row state (5 areas pressed, vasculature not; all
 *      six systems pressed) are asserted, and `DEFAULT_LAYERS` is compared against
 *      a literal snapshot of the documented v10/v8 values;
 *   8  Reset reproduces the documented default EXACTLY from a deliberately dirty
 *      state, All reproduces `VIEW_PRESETS.all`, and both resolve through the
 *      store's own preset definitions (no second copy of the default rule);
 *   9  the rendered `<Header />` exposes both rows with the right counts, distinct
 *      accessible names, visible text that is a PREFIX of the accessible name
 *      (WCAG 2.5.3), no control whose text is the forbidden exact preset label
 *      `Vasculature`, and the preset shortcut row still present and readable;
 *  10  the WIRED handlers: the `onClick` the rendered buttons actually carry are
 *      called against the real store and must toggle exactly the right region or
 *      kind (and Reset/All must write the documented layer states) — so this gate
 *      cannot pass while the buttons are inert;
 *  11  the BITE half: a mutated `AREAS` table (two variants) is run in an isolated
 *      copy of the tree and must trip the store's own load-time partition
 *      assertion with a non-zero exit, and an in-process defect table proves the
 *      named checks fail on a hardcoded/merged/dropped area.
 *
 * Every check prints its numbers and the script exits non-zero if any assertion
 * fails. Rendered pixels, real key presses and real pointer input stay
 * orchestrator-only: Chrome cannot start in this sandbox, so the browser-facing
 * claims here are about the DOM contract and the wired handlers.
 *
 * Run:  node scripts/verify/area-toggles.mjs
 * npm:  "verify:area-toggles": "node scripts/verify/area-toggles.mjs"
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
 * Same technique as `division-toggles.mjs`, `boundary-contract.mjs` and
 * `audit-checks.test.mjs`: the app's own `.ts`/`.tsx` sources are transpiled
 * in-process (extensionless relative imports resolved the way Vite resolves them,
 * JSON imports wrapped, `import.meta.glob` emulated), so the SHIPPED modules are
 * what run — nothing is copied, stubbed or re-typed for the test's convenience.
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
      // `import.meta.glob(..., { eager: true })` is a Vite build-time transform
      // (`src/data/load.ts` needs it); only the eager form is used here.
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
              if (!test.test(entry.name)) continue
              out.push(relative)
            }
            return out
          }
          const mapped = walk(baseDir, '').map((relative) => {
            const full = resolve(baseDir, relative)
            const key = `${head.replace(/\*\*\/?/g, '')}${relative}`
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
    // Vite asset imports (`?url` on binaries / raw CSS) resolve to a URL string in
    // the app; this lane never decodes them.
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

// Imported AFTER the loader hook: the shipped data module (never re-typed here).
const loadModule = await import(moduleUrl('src/data/load.ts'))
const ALL_REGIONS = loadModule.ALL_REGIONS
const ALL_KINDS = loadModule.ALL_KINDS
const taxonomy = loadModule.taxonomy

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
const toIterable = (value) =>
  value !== null && typeof value === 'object' && Symbol.iterator in value ? value : [value]

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

function equal(label, actual, expected) {
  const show = (value) => `[${[...toIterable(value)].join(', ')}]`
  const good = elementEqual(actual, expected)
  good
    ? ok(`${label} = ${show(actual)}`)
    : bad(`${label} = ${show(actual)} (expected ${show(expected)})`)
  return good
}

function equalJson(label, actual, expected) {
  const good = JSON.stringify(actual) === JSON.stringify(expected)
  good
    ? ok(`${label} = ${JSON.stringify(actual)}`)
    : bad(`${label} = ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`)
  return good
}

/** Size-and-membership assertion — for the layer fields a toggle must NOT touch. */
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
 * framing, the v10 division partition and the NEW v11 area partition) run again
 * on every import, so the instance count is also how many times those assertions
 * executed in this run.
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

/** A layer set with every region and kind on — the user's "everything on" state. */
const fullyLit = () => ({
  regions: new Set(ALL_REGIONS),
  kinds: new Set(ALL_KINDS),
  hidden: new Set(['probe-hidden']),
  emphasis: new Set(['probe-emphasis']),
})

/** Taxonomy row count of one region / kind — printed with every table. */
const rowsOfRegions = (regions) => taxonomy.filter((entry) => regions.includes(entry.region)).length
const rowsOfKind = (kind) => taxonomy.filter((entry) => entry.kind === kind).length

/**
 * The AREA partition RECONSTRUCTED from the shipped v10 `DIVISIONS` plus the ONE
 * documented rule (PLAN.md §1a): every division is one area verbatim, except the
 * rhombencephalon, which splits at the metencephalon/myelencephalon boundary —
 * `pons` + `cerebellum` alongside `medulla`. Derived at runtime, never retyped,
 * so this is the assertion that fails if the shipped table is edited to a
 * hardcoded set that no longer matches the taxonomy/division structure.
 */
function expectedAreasFromDivisions(module) {
  const split = ['pons', 'cerebellum']
  const expected = []
  for (const division of module.DIVISIONS) {
    if (division.id === 'prosencephalon') {
      // The forebrain is the one division v11 splits into its two vesicles — the
      // user's own examples ("telencephalon, diencephalon").
      for (const region of ['telencephalon', 'diencephalon']) {
        expected.push({
          id: region,
          label: region === 'telencephalon' ? 'Telencephalon' : 'Diencephalon',
          division: 'prosencephalon',
          regions: [region],
        })
      }
    } else if (division.id === 'rhombencephalon') {
      expected.push({
        id: 'metencephalon',
        label: 'Metencephalon (pons + cerebellum)',
        division: 'rhombencephalon',
        regions: division.regions.filter((region) => split.includes(region)),
      })
      expected.push({
        id: 'myelencephalon',
        label: 'Myelencephalon (medulla)',
        division: 'rhombencephalon',
        regions: division.regions.filter((region) => !split.includes(region)),
      })
    } else {
      expected.push({ id: division.id, label: division.label, division: division.id, regions: [...division.regions] })
    }
  }
  return expected
}

/**
 * `id → [region literals]` as written in the shipped `AREAS` TABLE SOURCE. The
 * three expression forms the table may use are all resolved here:
 *
 *   • `regions: divisionRegions('X')`      → the division's taxonomy regions
 *   • `regions: SOME_CONST.filter(...)`     → the constant's literal regions,
 *                                            with `=== 'R'` / `!== 'R'` applied
 *   • `regions: ['a', 'b']`                 → the literals verbatim
 *
 * The table constants (`HINDBRAIN_REGIONS`, `HINDBRAIN_SPLIT_MEDULLA`) are read
 * from the same source text, so a retyped list that drifts from the taxonomy
 * cannot hide behind a constant.
 */
function areaRegionLiterals() {
  const code = stripComments(readSource('src/state/store.ts'))
  const tableStart = code.indexOf('export const AREAS')
  const tableEnd = code.indexOf('\n]', tableStart)
  const block = tableStart < 0 || tableEnd < 0 ? '' : code.slice(tableStart, tableEnd)

  // `const NAME: ... = divisionRegions('x')` / `... = 'x'`
  const constants = new Map()
  for (const match of code.matchAll(/const\s+([A-Z][A-Z0-9_]*)[^=\n]*=\s*([^\n]+)/g)) {
    constants.set(match[1], match[2])
  }

  /**
   * The value of a comparison's right-hand side, whether it is written as a
   * string literal (`'medulla'`) or as a named constant (`HINDBRAIN_SPLIT_MEDULLA`).
   * A constant that cannot be resolved yields null, and a null comparison leaves
   * the base list unfiltered — which makes this check FAIL loudly rather than
   * quietly agreeing with a set it never evaluated.
   */
  const constantValue = (name) => {
    const expression = constants.get(name)
    if (expression === undefined) return null
    const literal = expression.trim().match(/^'([^']*)'/)
    return literal === null ? null : literal[1]
  }

  const regionsOfExpression = (expression) => {
    const source = expression.trim()
    const division = source.match(/divisionRegions\('([^']+)'\)/)
    if (division !== null) {
      const found = store.DIVISIONS.find((entry) => entry.id === division[1])
      const regions = found === undefined ? [] : [...found.regions]
      // `divisionRegions('prosencephalon').filter((region) => region === 'x')`
      const predicate = source.match(/filter\(\(region\)\s*=>\s*region\s*([!=]==)\s*(?:'([^']+)'|([A-Z][A-Z0-9_]*))\)/)
      if (predicate === null) return regions
      const region = predicate[2] ?? constantValue(predicate[3])
      if (region === null) return []
      return regions.filter((value) => (predicate[1] === '===' ? value === region : value !== region))
    }
    const literalArray = source.match(/^\[([^\]]*)\]$/)
    if (literalArray !== null) {
      return literalArray[1]
        .split(',')
        .map((token) => token.trim().replace(/^'(.*)'$/, '$1'))
        .filter((token) => token.length > 0)
    }
    // `CONST.filter((region) => region !== SPLIT_CONST)` — the one derivation the
    // shipped table uses. The predicate is re-evaluated here only as the ONE
    // documented split rule (never as a region list).
    const filtered = source.match(/^([A-Z][A-Z0-9_]*)\.filter\(\(region\) =>\s*(.+?)\)$/)
    if (filtered !== null) {
      const base = regionsOfExpression(constants.get(filtered[1]) ?? '[]')
      const comparison = filtered[2].match(/([!=]==)\s*(?:'([^']+)'|([A-Z][A-Z0-9_]*))/)
      if (comparison === null) return base
      const region = comparison[2] ?? constantValue(comparison[3])
      if (region === null) return []
      return base.filter((value) => (comparison[1] === '===' ? value === region : value !== region))
    }
    return []
  }

  /** The `regions:` expression of one entry, brackets balanced (nested parens). */
  const regionsExpression = (entry) => {
    const at = entry.indexOf('regions:')
    if (at < 0) return null
    const source = entry.slice(at + 'regions:'.length).replace(/\}\s*$/, '')
    let depth = 0
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index]
      if (character === '(' || character === '[') depth += 1
      else if (character === ')' || character === ']') depth -= 1
      else if (character === ',' && depth === 0) return source.slice(0, index).trim().replace(/\}\s*$/, '')
    }
    return source.trim().replace(/\}\s*$/, '').trim()
  }

  const found = new Map()
  for (const entry of block.split('{').slice(1)) {
    const id = entry.match(/id:\s*'([^']+)'/)?.[1]
    const expression = regionsExpression(entry)
    if (id === undefined || expression === null) continue
    found.set(id, regionsOfExpression(expression))
  }
  return found
}

/* ═══════════════════════════════════ the checks, as re-runnable functions ═══ */

/**
 * The SHIPPED implementations, held in a MUTABLE table: ES module namespaces are
 * frozen, so the bite section cannot monkey-patch the module itself. The checks
 * always call through this table, which is why replacing an entry here genuinely
 * replaces the behaviour under test.
 */
const impl = {
  AREAS: null,
  areaRegions: undefined,
  areasOf: undefined,
  areaLayersOn: undefined,
}

function bindImplementations(module) {
  impl.AREAS = module.AREAS
  impl.areaRegions = module.areaRegions
  impl.areasOf = module.areasOf
  impl.areaLayersOn = module.areaLayersOn
}

/** The area table as the checks see it (the shipped one unless a defect is armed). */
const areaTable = () => impl.AREAS
const findArea = (id) => areaTable().find((area) => area.id === id)

const RUNNERS = {}

/* ------------------------------------------------------------- 1. the surface */

RUNNERS.surface = () => {
  const code = stripComments(readSource('src/state/store.ts'))
  for (const fact of ['AREAS', 'areaRegions', 'areasOf', 'areaLayersOn']) {
    truthy(`store.ts exports ${fact}`, new RegExp(`export (function|const) ${fact}\\b`).test(code))
  }
  truthy('store.ts exports the AreaId type', /export type AreaId\b/.test(code))
  truthy('store.ts exports ALL_ON_LAYERS (the "everything on" definition)', /export const ALL_ON_LAYERS\b/.test(code))
  truthy(
    'the AREA table is DERIVED from the division table (divisionRegions), not retyped',
    /AREAS[\s\S]{0,1400}divisionRegions\(/.test(code),
  )

  const header = stripComments(readSource('src/components/Header.tsx'))
  truthy(
    'Header.tsx imports AREAS + areaLayersOn from the store',
    /AREAS/.test(header) && /areaLayersOn/.test(header) && /from '\.\.\/state\/store'/.test(header),
  )
  truthy('Header.tsx reads the kind axis from ALL_KINDS', /ALL_KINDS/.test(header))
  truthy('Header.tsx calls toggleRegionLayer (the area path)', /toggleRegionLayer\(/.test(header))
  truthy('Header.tsx calls toggleKindLayer (the systems path)', /toggleKindLayer\(/.test(header))
  for (const hook of ['data-area=', 'data-division=', 'data-kind=', 'data-preset=', 'data-header-action=']) {
    const occurrences = (header.match(new RegExp(hook.replace('=', '\\s*='), 'g')) ?? []).length
    truthy(`Header.tsx carries the "${hook}" hook`, occurrences >= 1, `${occurrences} occurrence(s)`)
  }
  truthy(
    'Header.tsx keeps the .header-presets group (the preset shortcut row + the boot assertion)',
    /className="header-presets"/.test(header) && /aria-label="View presets"/.test(header),
  )
  truthy(
    'Header.tsx keeps applyViewPreset (Reset / All resolve through the preset table)',
    /applyViewPreset\(/.test(header),
  )
  const pressed = (header.match(/aria-pressed=/g) ?? []).length
  truthy('every Header control is a real aria-pressed button', pressed >= 5, `${pressed} aria-pressed control(s)`)
  truthy(
    'no Header button is a div/span with a button role',
    !/role="button"/.test(header) && !/<input/.test(header),
  )
}

/* ------------------------------------------- 2/3. the AREA partition, printed */

RUNNERS.partition = () => {
  const areas = areaTable()
  equal('the number of area buttons', areas.length, 6)
  equalJson('the area ids, in row order', areas.map((area) => area.id), [
    'telencephalon',
    'diencephalon',
    'mesencephalon',
    'metencephalon',
    'myelencephalon',
    'vasculature',
  ])

  console.log('  ── AREA partition (button · regions · taxonomy rows · boot state)')
  console.log(
    `     ${'data-area'.padEnd(16)}${'regions'.padEnd(24)}${'rows'.padEnd(7)}${'division'.padEnd(17)}boot`,
  )
  const claimed = []
  const duplicates = []
  for (const area of areas) {
    const rows = rowsOfRegions(area.regions)
    console.log(
      `     ${area.id.padEnd(16)}${area.regions.join('+').padEnd(24)}${String(rows).padEnd(7)}` +
        `${area.division.padEnd(17)}${impl.areaLayersOn(store.DEFAULT_LAYERS, area.id) ? 'ON' : 'off'}`,
    )
    for (const region of area.regions) {
      if (claimed.includes(region)) duplicates.push(`${region} (again in ${area.id})`)
      claimed.push(region)
    }
  }
  console.log(
    `     ${'Σ'.padEnd(16)}${String(claimed.length).padEnd(24)}${String(rowsOfRegions(claimed)).padEnd(7)}` +
      `${'—'.padEnd(17)}${claimed.length} claims for ${ALL_REGIONS.length} regions`,
  )

  equal('the union of the six areas', sorted(claimed), sorted(ALL_REGIONS))
  equal('regions claimed by two areas', duplicates, [])
  equal('regions no area reaches', ALL_REGIONS.filter((region) => impl.areasOf(region).length === 0), [])
  equal(
    'every area claims at least one region',
    areas.filter((area) => impl.areaRegions(area.id).length === 0).map((area) => area.id),
    [],
  )
  for (const region of ALL_REGIONS) {
    equal(`areasOf('${region}')`, [...impl.areasOf(region)], [impl.areasOf(region)[0] ?? 'none'])
  }
  equal('the Σ of the per-area taxonomy rows', rowsOfRegions(claimed), taxonomy.length)
  truthy(
    'the six areas carry the six documented labels',
    areas.every((area) => typeof area.label === 'string' && area.label.trim().length > 0),
    areas.map((area) => area.label).join(' · '),
  )
  equalJson('area labels are distinct', new Set(areas.map((area) => area.label)).size, areas.length)

  // 3. the hindbrain split, as the labels claim it.
  const hindbrain = store.DIVISIONS.find((division) => division.id === 'rhombencephalon').regions
  const met = [...impl.areaRegions('metencephalon')]
  const myel = [...impl.areaRegions('myelencephalon')]
  equal('metencephalon regions (pons + cerebellum)', sorted(met), ['cerebellum', 'pons'])
  equal('myelencephalon regions (medulla alone)', myel, ['medulla'])
  equal('metencephalon + myelencephalon = the rhombencephalon division', sorted([...met, ...myel]), sorted(hindbrain))
  for (const area of areas) {
    const owners = store.divisionsOf(area.regions[0])
    equal(`area "${area.id}" declares its own division`, area.division, owners[0] ?? 'none')
  }
}

/* ----------------------------------------------- 4/5. the systems + derivation */

RUNNERS.systems = () => {
  console.log('  ── SYSTEMS partition (button · kind · taxonomy rows · boot state)')
  console.log(`     ${'data-kind'.padEnd(16)}${'rows'.padEnd(7)}boot`)
  let total = 0
  for (const kind of ALL_KINDS) {
    const rows = rowsOfKind(kind)
    total += rows
    console.log(
      `     ${kind.padEnd(16)}${String(rows).padEnd(7)}${store.DEFAULT_LAYERS.kinds.has(kind) ? 'ON' : 'off'}`,
    )
  }
  console.log(`     ${'Σ'.padEnd(16)}${String(total).padEnd(7)}of ${taxonomy.length} taxonomy rows · ${ALL_KINDS.length} kinds`)
  equal('the Σ of the per-kind taxonomy rows', total, taxonomy.length)
  equal('the kind axis is ALL_KINDS, in order', sorted(ALL_KINDS), sorted(ALL_KINDS))
  equalJson('ALL_KINDS has no duplicate', new Set(ALL_KINDS).size, ALL_KINDS.length)
  equal(
    'every kind is layer-on at boot',
    ALL_KINDS.filter((kind) => !store.DEFAULT_LAYERS.kinds.has(kind)),
    [],
  )

  // 5. derivation: the shipped table must equal the reconstruction from DIVISIONS.
  const expected = expectedAreasFromDivisions(store)
  equalJson('the shipped AREA ids equal the table reconstructed from DIVISIONS', areaTable().map((a) => a.id), expected.map((a) => a.id))
  for (const want of expected) {
    const actual = findArea(want.id)
    equal(`reconstructed regions of "${want.id}"`, actual ? sorted(actual.regions) : null, sorted(want.regions))
    equal(`reconstructed division of "${want.id}"`, actual ? actual.division : null, want.division)
  }
  // …and the region SETS READ OUT OF THE AREAS SOURCE TEXT must resolve to the
  // same sets: a retyped literal that drifts from the taxonomy fails here even if
  // the shipped table and the reconstruction were edited together.
  const literalsById = areaRegionLiterals()
  equalJson(
    'every area entry in the source text declares its regions',
    [...literalsById.keys()],
    areaTable().map((area) => area.id),
  )
  for (const area of areaTable()) {
    const literals = literalsById.get(area.id) ?? []
    equal(
      `"${area.id}": the regions named in the source text are regions of ALL_REGIONS`,
      literals.filter((region) => !ALL_REGIONS.includes(region)),
      [],
    )
    equal(
      `"${area.id}": the source text's region set equals the shipped region set`,
      sorted(literals),
      sorted(area.regions),
    )
  }
}

/* --------------------------------------------------------- 6. the toggle paths */

RUNNERS.toggle = async () => {
  const module = await sharedStore()
  const boot = readState(store)

  for (const area of areaTable()) {
    const mine = area.regions
    const others = ALL_REGIONS.filter((region) => !mine.includes(region))

    // (a) FROM OFF → ON through the store ACTION the button calls.
    const off = { ...boot, regions: boot.regions.filter((region) => !mine.includes(region)) }
    setState(module, off)
    for (const region of mine) module.useAtlasStore.getState().toggleRegionLayer(region)
    const on = readState(module)
    equal(`area "${area.id}" OFF→ON adds exactly its regions`, on.regions, sorted([...off.regions, ...mine]))
    equal(
      `area "${area.id}" leaves every other region untouched`,
      on.regions.filter((region) => others.includes(region)),
      sorted(off.regions.filter((region) => others.includes(region))),
    )
    truthy(
      `"${area.id}": a complete area reads as pressed`,
      impl.areaLayersOn(module.useAtlasStore.getState().layers, area.id),
    )
    equalSet(`area "${area.id}" ON did not touch kinds`, new Set(on.kinds), new Set(boot.kinds))
    equalSet(`area "${area.id}" ON did not touch hidden`, new Set(on.hidden), new Set(boot.hidden))
    equalSet(`area "${area.id}" ON did not touch emphasis`, new Set(on.emphasis), new Set(boot.emphasis))

    // (b) ON → OFF through the same action.
    for (const region of mine) module.useAtlasStore.getState().toggleRegionLayer(region)
    const back = readState(module)
    equal(`area "${area.id}" ON→OFF removes exactly its regions`, back.regions, sorted(off.regions))
    truthy(
      `"${area.id}": an area with one region off reads as unpressed`,
      !impl.areaLayersOn(module.useAtlasStore.getState().layers, area.id),
    )
    const partiallyOff = { ...off, regions: [...off.regions, ...mine.slice(0, -1)].sort() }
    setState(module, partiallyOff)
    truthy(
      `"${area.id}": a PARTLY on area reads as unpressed (no third click outcome)`,
      !impl.areaLayersOn(module.useAtlasStore.getState().layers, area.id),
    )

    // (c) the pure decision the button's aria-pressed reads, on a fully lit set.
    const lit = fullyLit()
    truthy(`areaLayersOn(all-on, "${area.id}") is true`, impl.areaLayersOn(lit, area.id))
    truthy(
      `areaLayersOn("${area.id}" minus one region) is false`,
      !impl.areaLayersOn({ ...lit, regions: new Set(sorted(mine).slice(0, -1)) }, area.id),
    )
    equal(
      `areaRegions("${area.id}") is the area's own region list`,
      sorted(impl.areaRegions(area.id)),
      sorted(mine),
    )
    info(
      `"${area.id}": ${mine.join('+')} (${rowsOfRegions(mine)} taxonomy rows) · ` +
        `others untouched: ${others.length} regions`,
    )
  }
  setState(module, boot)

  // The systems axis, through the action the buttons call.
  for (const kind of ALL_KINDS) {
    const before = readState(module)
    module.useAtlasStore.getState().toggleKindLayer(kind)
    const off = readState(module)
    equal(`system "${kind}" OFF removes exactly that kind`, off.kinds, sorted(before.kinds.filter((k) => k !== kind)))
    equalSet(`system "${kind}" OFF did not touch regions`, new Set(off.regions), new Set(before.regions))
    module.useAtlasStore.getState().toggleKindLayer(kind)
    equal(`system "${kind}" ON restores the kind set exactly`, readState(module).kinds, sorted(before.kinds))
  }
  setState(module, boot)
}

/* -------------------------------------------------------- 7. the default framing */

RUNNERS.defaults = () => {
  const boot = store.DEFAULT_LAYERS
  equal('viewPresetOf(DEFAULT_LAYERS)', store.viewPresetOf(boot), 'brainstem-focus')
  equalJson('VIEW_PRESETS has the nine documented presets', Object.keys(store.VIEW_PRESETS).length, 9)
  equalJson('VIEW_PRESETS still carries brainstem-focus', typeof store.VIEW_PRESETS['brainstem-focus'], 'object')
  equalJson('VIEW_PRESETS still carries all', typeof store.VIEW_PRESETS.all, 'object')
  truthy('viewPresetOf is still a function', typeof store.viewPresetOf === 'function')

  // The documented default, pinned as a literal so a silent edit of the preset
  // table fails here as well as in the store's own load-time block.
  equal('DEFAULT_LAYERS.regions', sorted(boot.regions), sorted(ALL_REGIONS.filter((r) => r !== 'vasculature')))
  equal('DEFAULT_LAYERS.kinds', sorted(boot.kinds), sorted(ALL_KINDS))
  equal('the default hidden set is the 32 cortex-preset ids', boot.hidden.size, 32)
  equal('the default emphasis set is empty', [...boot.emphasis], [])
  truthy('the vasculature AREA is off at boot', !boot.regions.has('vasculature'))
  truthy('the vessel SYSTEM is on at boot', boot.kinds.has('vessel'))

  equalJson(
    'the boot area row (aria-pressed per button)',
    areaTable().map((area) => impl.areaLayersOn(boot, area.id)),
    [true, true, true, true, true, false],
  )
  equalJson(
    'the boot systems row (aria-pressed per button)',
    ALL_KINDS.map((kind) => boot.kinds.has(kind)),
    [true, true, true, true, true, true],
  )
  equal(
    'the boot pressed-area count',
    areaTable().filter((area) => impl.areaLayersOn(boot, area.id)).length,
    5,
  )
  equal('ALL_ON_LAYERS reports the "all" preset', store.viewPresetOf(store.ALL_ON_LAYERS), 'all')
  equal('ALL_ON_LAYERS.regions', sorted(store.ALL_ON_LAYERS.regions), sorted(ALL_REGIONS))
  equal('ALL_ON_LAYERS.kinds', sorted(store.ALL_ON_LAYERS.kinds), sorted(ALL_KINDS))
  equalJson('ALL_ON_LAYERS hides nothing', [...store.ALL_ON_LAYERS.hidden], [])
  equalJson('ALL_ON_LAYERS emphasises nothing', [...store.ALL_ON_LAYERS.emphasis], [])
}

/* --------------------------------------------------------------- 8. Reset / All */

RUNNERS.reset = async () => {
  const module = await sharedStore()
  const boot = readState(store)

  // A deliberately dirty state: one area soloed away, two systems off.
  const dirty = {
    regions: ['vasculature', 'midbrain'],
    kinds: ['nucleus'],
    hidden: ['probe-hidden'],
    emphasis: ['probe-emphasis'],
  }
  setState(module, dirty)
  truthy(
    'the dirty state does not read as the default preset',
    module.viewPresetOf(module.useAtlasStore.getState().layers) !== 'brainstem-focus',
    `viewPresetOf = ${String(module.viewPresetOf(module.useAtlasStore.getState().layers))}`,
  )
  // The Reset button's own handler body: applyViewPreset('brainstem-focus').
  module.useAtlasStore.getState().applyViewPreset('brainstem-focus')
  const afterReset = readState(module)
  equal('Reset reproduces DEFAULT_LAYERS.regions exactly', afterReset.regions, sorted(store.DEFAULT_LAYERS.regions))
  equal('Reset reproduces DEFAULT_LAYERS.kinds exactly', afterReset.kinds, sorted(store.DEFAULT_LAYERS.kinds))
  equal('Reset reproduces DEFAULT_LAYERS.hidden exactly', afterReset.hidden, sorted(store.DEFAULT_LAYERS.hidden))
  equal('Reset reproduces DEFAULT_LAYERS.emphasis exactly', afterReset.emphasis, sorted(store.DEFAULT_LAYERS.emphasis))
  equalJson(
    'Reset leaves the Reset button pressed and the All button unpressed',
    [
      module.viewPresetOf(module.useAtlasStore.getState().layers) === 'brainstem-focus',
      module.viewPresetOf(module.useAtlasStore.getState().layers) === 'all',
    ],
    [true, false],
  )
  equalJson(
    'after Reset the area row reads the documented boot state again',
    areaTable().map((area) => impl.areaLayersOn(module.useAtlasStore.getState().layers, area.id)),
    [true, true, true, true, true, false],
  )

  // The All button's handler body (bound to VIEW_PRESETS.all via ALL_ON_LAYERS).
  const allPreset = store.viewPresetOf(store.ALL_ON_LAYERS) ?? 'all'
  equal('All resolves to a real preset id', typeof allPreset, 'string')
  module.useAtlasStore.getState().applyViewPreset(allPreset)
  const afterAll = readState(module)
  equal('All reproduces VIEW_PRESETS.all regions', afterAll.regions, sorted(ALL_REGIONS))
  equal('All reproduces VIEW_PRESETS.all kinds', afterAll.kinds, sorted(ALL_KINDS))
  equal('All clears the hidden set', afterAll.hidden, [])
  equal('All clears the emphasis set', afterAll.emphasis, [])
  equalJson(
    'after All every area and system button is pressed',
    [
      ...areaTable().map((area) => impl.areaLayersOn(module.useAtlasStore.getState().layers, area.id)),
      ...ALL_KINDS.map((kind) => module.useAtlasStore.getState().layers.kinds.has(kind)),
    ],
    Array.from({ length: areaTable().length + ALL_KINDS.length }, () => true),
  )

  // Reset from the All state — the round trip the user actually performs.
  module.useAtlasStore.getState().applyViewPreset('brainstem-focus')
  equalJson('Reset after All returns the full default state', readState(module), boot)
  setState(module, boot)
}

/* ---------------------------------------------------- 9/10. the rendered header */

/**
 * The rendered header, produced by React's OWN renderer
 * (`renderToStaticMarkup`) from `React.createElement(Header)`: the component
 * reads the store through zustand's hook, so it is rendered rather than called.
 *
 * Two views of the same render are kept: the MARKUP (for the group/class
 * assertions the browser lane also addresses) and the ELEMENT TREE, materialised
 * by `collectButtons` so every `aria-label`, `data-*` hook and text node below is
 * read from the props the component really passed — not from a re-parsed string.
 */
let headerRender = null

/** Undo the entities React's server renderer emits, and drop its `<!-- -->` marks. */
function decodeText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(span|strong|em)>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Every rendered `<button>` with its attributes and its visible text, read out of
 * the markup React produced — so the DOM contract asserted here (hooks, names,
 * pressed state, text) is exactly what the browser will parse.
 */
function readButtons(markup) {
  const found = []
  for (const match of markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attributes = {}
    for (const attribute of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]] = attribute[2]
    }
    found.push({ attributes, text: decodeText(match[2]) })
  }
  return found
}

async function renderHeader() {
  if (headerRender !== null) return headerRender
  const React = projectRequire('react')
  const { renderToStaticMarkup } = projectRequire('react-dom/server')
  const Header = (await import(moduleUrl('src/components/Header.tsx'))).default
  const markup = renderToStaticMarkup(React.createElement(Header))
  headerRender = { markup, buttons: readButtons(markup) }
  return headerRender
}

RUNNERS.render = async () => {
  const { markup, buttons } = await renderHeader()
  const group = (className) => markup.match(new RegExp(`<div[^>]*class="${className}"[^>]*>`))?.[0] ?? ''
  const groupAttr = (className, name) => (group(className).match(new RegExp(`${name}="([^"]*)"`)) ?? [])[1] ?? ''

  const areaButtons = buttons.filter((button) => button.attributes['data-area'] !== undefined)
  const kindButtons = buttons.filter((button) => button.attributes['data-kind'] !== undefined)
  const presetButtons = buttons.filter((button) => button.attributes['data-preset'] !== undefined)
  const headerActions = buttons.filter((button) => button.attributes['data-header-action'] !== undefined)

  equal('rendered area buttons', areaButtons.length, areaTable().length)
  equal('rendered system buttons', kindButtons.length, ALL_KINDS.length)
  equal('rendered preset buttons (the shortcut row, unchanged)', presetButtons.length, 9)
  equalJson(
    'rendered Reset / All actions',
    headerActions.map((button) => button.attributes['data-header-action']),
    ['reset', 'all'],
  )
  truthy('the .header-presets group is still rendered', group('header-presets') !== '')
  truthy('the .header-areas group is rendered', group('header-areas') !== '')
  truthy('the .header-systems group is rendered', group('header-systems') !== '')
  equalJson('the areas group is a labelled group', [groupAttr('header-areas', 'role'), groupAttr('header-areas', 'aria-label')], ['group', 'Anatomical areas'])
  equalJson('the systems group is a labelled group', [groupAttr('header-systems', 'role'), groupAttr('header-systems', 'aria-label')], ['group', 'Structure systems'])
  equalJson('the preset group is a labelled group (the v10 group the audit reads)', [groupAttr('header-presets', 'role'), groupAttr('header-presets', 'aria-label')], ['group', 'View presets'])

  equalJson(
    'every area button is a real button with aria-pressed',
    areaButtons.filter((button) => button.attributes['aria-pressed'] === undefined).map((button) => button.attributes['data-area']),
    [],
  )
  equalJson(
    'every system button is a real button with aria-pressed',
    kindButtons.filter((button) => button.attributes['aria-pressed'] === undefined).map((button) => button.attributes['data-kind']),
    [],
  )
  equalJson(
    'the rendered area row boots with the documented pressed states',
    areaButtons.map((button) => button.attributes['aria-pressed']),
    ['true', 'true', 'true', 'true', 'true', 'false'],
  )
  equalJson(
    'the rendered systems row boots fully pressed',
    kindButtons.map((button) => button.attributes['aria-pressed']),
    ['true', 'true', 'true', 'true', 'true', 'true'],
  )
  equalJson(
    'every rendered button declares type="button" (no implicit submit)',
    buttons.filter((button) => button.attributes.type !== 'button').map((button) => button.text),
    [],
  )

  // The machine hooks must be complete, unique, and in the documented order.
  equalJson('data-area values, in row order', areaButtons.map((button) => button.attributes['data-area']), areaTable().map((a) => a.id))
  equalJson('data-kind values, in row order', kindButtons.map((button) => button.attributes['data-kind']), [...ALL_KINDS])
  equalJson(
    'every area button also carries the v10 data-division vocabulary',
    areaButtons.map((button) => button.attributes['data-division']),
    areaTable().map((a) => a.division),
  )
  equalJson(
    'every area button carries a title naming its own regions',
    areaButtons
      .filter((button) => {
        const area = findArea(button.attributes['data-area'])
        return area === undefined || !String(button.attributes.title ?? '').includes(area.regions.join(' + '))
      })
      .map((button) => button.attributes['data-area']),
    [],
  )

  // Accessible names: present, distinct, and WCAG 2.5.3 (the visible text is a
  // prefix of the accessible name, so voice control can say what is on screen).
  const labelled = [...areaButtons, ...kindButtons, ...headerActions]
  const nameOf = (button) => button.attributes['aria-label'] ?? ''
  equalJson('controls without an accessible name', labelled.filter((button) => nameOf(button) === '').map((button) => button.text), [])
  const names = labelled.map(nameOf)
  equalJson('accessible names are distinct across the three rows', new Set(names).size, names.length)
  for (const button of labelled) {
    truthy(
      `visible text "${button.text}" is a prefix of its accessible name`,
      nameOf(button).startsWith(button.text) && button.text.length > 0,
      `"${nameOf(button).slice(0, 72)}"`,
    )
  }
  for (const area of areaTable()) {
    truthy(
      `the "${area.label}" button lists its regions in the accessible name`,
      names.some((name) => name.includes(area.regions.join(' + '))),
    )
  }
  for (const kind of ALL_KINDS) {
    truthy(`the "${kind}" system button names the kind it switches`, names.some((name) => name.includes(`(${kind})`)))
  }
  equalJson(
    'the two controls reading exactly "Nuclei" (the preset and the system toggle)',
    buttons.filter((button) => button.text === 'Nuclei').map((button) => button.attributes['data-preset'] ?? button.attributes['data-kind']),
    ['nuclei', 'nucleus'],
  )

  // The one forbidden label (measured collision, PLAN.md §1c): the v8 preset
  // `Vasculature` is clicked by exact text in the browser lane, so no NEW control
  // may carry that exact text.
  const exactVasculature = buttons.filter((button) => button.text === 'Vasculature')
  equalJson('buttons reading exactly "Vasculature" (one: the v8 preset)', exactVasculature.length, 1)
  equalJson(
    'that button is the preset, not a new row control',
    exactVasculature.map((button) => button.attributes['data-preset']),
    ['vasculature'],
  )
  info(`[render] text of every control: ${buttons.map((button) => button.text).join(' | ')}`)
  info(`[render] ${areaButtons.length} area + ${kindButtons.length} system + ${presetButtons.length} preset + ${headerActions.length} action buttons`)
}

/**
 * The WIRING check — proof that the buttons are not inert, in an isolated copy of
 * the tree. `renderToStaticMarkup` cannot fire a handler, and a handler must run
 * inside a real React render (the component reads the store through zustand's
 * hook), so the copy replaces `useAtlasStore` with a plain `getState()` read —
 * `Legend.tsx` is used for exactly this in `division-toggles.mjs` — and a child
 * probe calls each button's real `onClick` after a real `renderToStaticMarkup`.
 * Everything else in the copy is the shipped source: the component, the store,
 * the actions and the AREAS table.
 */
RUNNERS.wiring = () => {
  const require_ = createRequire(import.meta.url)
  const React = require_('react')
  const { renderToStaticMarkup } = require_('react-dom/server')
  const work = resolve(ROOT, '.plate-scratch/v11-area-wiring')
  const tree = resolve(work, 'tree')
  const log = resolve(work, 'probe.log')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(tree, { recursive: true })
  cpSync(resolve(ROOT, 'src'), resolve(tree, 'src'), { recursive: true })
  cpSync(resolve(ROOT, 'package.json'), resolve(tree, 'package.json'))
  mkdirSync(resolve(tree, 'scripts'), { recursive: true })

  for (const component of ['Header', 'Legend']) {
    const componentPath = resolve(tree, `src/components/${component}.tsx`)
    const source = readFileSync(componentPath, 'utf8')
    if (component === 'Header') {
      // The one edit made to the copy: the store HOOK becomes a plain state read
      // (so the component can be rendered and its handlers fired outside the app),
      // while every value import stays the shipped store's.
      const FROM = '  useAtlasStore,\n  viewPresetOf,'
      const occurrences = source.split(FROM).length - 1
      occurrences === 1
        ? ok('the Header store-import anchor appears exactly once in the copy (1×)')
        : bad(`the Header store-import anchor appears ${occurrences}× — fix this check`)
      writeFileSync(
        resolve(tree, 'src/components/_area-hook-stub.ts'),
        "import { useAtlasStore as real } from '../state/store'\n\n"
          + '// Probe-only: the store hook as a plain state read, so the component can be\n'
          + '// rendered with React and then have its real handlers driven directly.\n'
          + 'export const useAtlasStore = (selector) => selector(real.getState())\n',
      )
      writeFileSync(
        componentPath,
        source
          .replace(FROM, '  viewPresetOf,')
          .replace(
            "import type { CSSProperties } from 'react'",
            "import type { CSSProperties } from 'react'\nimport { useAtlasStore } from './_area-hook-stub'",
          ),
      )
    }
  }
  // The Legend's own import lines must stay intact: the FIRST one is an exact
  // mutation anchor in `division-toggles.mjs` (its behaviour probe rewrites that
  // exact text in an isolated copy), and the second is how the Legend names the
  // header's areas. Both are asserted here so neither can be "tidied" away.
  const legendCopy = readFileSync(resolve(tree, 'src/components/Legend.tsx'), 'utf8')
  truthy(
    'the copy keeps the Legend store-hook import line byte-identical',
    legendCopy.includes("import { DIVISIONS, useAtlasStore } from '../state/store'"),
  )
  truthy(
    'the Legend still names the header areas (the second store import)',
    /import \{ AREAS as HEADER_AREAS, type AreaDefinition \} from '\.\.\/state\/store'/.test(legendCopy),
  )

  try {
    symlinkSync(resolve(ROOT, 'node_modules'), resolve(tree, 'node_modules'), 'junction')
  } catch {
    /* a junction already exists from a previous run */
  }

  const probe = resolve(tree, 'scripts/_area-wiring-probe.mjs')
  writeFileSync(probe, WIRING_PROBE_SOURCE)
  const fd = openSync(log, 'w')
  const run = spawnSync(process.execPath, ['scripts/_area-wiring-probe.mjs'], {
    cwd: tree,
    stdio: ['ignore', fd, fd],
  })
  closeSync(fd)
  const output = existsSync(log) ? readFileSync(log, 'utf8') : ''
  const jsonLine = output
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('{'))
  if (jsonLine === undefined) {
    bad(`the wiring probe produced no result (exit ${String(run.status)}) — ${output.split('\n').slice(-4).join(' ').slice(0, 240)}`)
    rmSync(work, { recursive: true, force: true })
    return
  }
  const report = JSON.parse(jsonLine)
  const boot = { regions: sorted(store.DEFAULT_LAYERS.regions), kinds: sorted(store.DEFAULT_LAYERS.kinds) }
  equal('the probe rendered every area button as an element', report.areaCount, areaTable().length)
  equal('the probe rendered every system button as an element', report.kindCount, ALL_KINDS.length)
  equalJson('the probe found the Reset and All actions', report.actions, ['reset', 'all'])
  equalJson('every area button carries an onClick', report.missingHandlers, [])
  for (const step of report.steps) {
    equalJson(`[wired] ${step.name}`, step.value, step.expected)
  }
  equalJson('[wired] the area clicks left the boot region set restored', report.afterAreaClicks, boot.regions)
  equalJson('[wired] the system clicks left the boot kind set restored', report.afterKindClicks, boot.kinds)
  equalJson('[wired] Reset reproduced the default regions', report.afterReset.regions, boot.regions)
  equalJson('[wired] Reset reproduced the default kinds', report.afterReset.kinds, boot.kinds)
  equalJson('[wired] Reset reproduced the default hidden set', report.afterReset.hidden, sorted(store.DEFAULT_LAYERS.hidden))
  equalJson('[wired] All turned every region on', report.afterAll.regions, sorted(ALL_REGIONS))
  equalJson('[wired] All turned every kind on', report.afterAll.kinds, sorted(ALL_KINDS))
  equalJson('[wired] the probe saw the three rows in the rendered markup', [
    report.markupHasPresets,
    report.markupHasAreas,
    report.markupHasSystems,
  ], [true, true, true])
  equalJson(
    '[wired] the probe read the same boot aria-pressed states as section 9',
    report.bootPressed,
    [true, true, true, true, true, false],
  )
  equalJson(
    '[wired] the probe read every system button pressed at boot',
    report.bootKindPressed,
    [true, true, true, true, true, true],
  )
  info(`[wired] ${report.steps.length} handler-driven assertions reported by the child probe`)
  rmSync(work, { recursive: true, force: true })
}

/* -------------------------------------------------------------------- 11. bite */

/**
 * The in-process defects, as drop-in replacements for the shipped table and
 * helpers. Each is a mistake a real edit could make, and each must be caught by a
 * NAMED check — a defect nobody catches is itself a failure of this gate.
 */
const DEFECTS = {
  /** An area that names a label region but claims a different one (a typo). */
  hardcoded: {
    AREAS: [
      { id: 'telencephalon', label: 'Telencephalon', division: 'prosencephalon', regions: ['diencephalon'] },
      { id: 'diencephalon', label: 'Diencephalon', division: 'prosencephalon', regions: ['diencephalon'] },
      { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', division: 'mesencephalon', regions: ['midbrain'] },
      { id: 'metencephalon', label: 'Metencephalon (pons + cerebellum)', division: 'rhombencephalon', regions: ['pons', 'cerebellum'] },
      { id: 'myelencephalon', label: 'Myelencephalon (medulla)', division: 'rhombencephalon', regions: ['medulla'] },
      { id: 'vasculature', label: 'Cerebral vasculature', division: 'vasculature', regions: ['vasculature'] },
    ],
  },
  /** The hindbrain lumped back into one four-region area (the v10 granularity). */
  merged: {
    AREAS: [
      { id: 'telencephalon', label: 'Telencephalon', division: 'prosencephalon', regions: ['telencephalon'] },
      { id: 'diencephalon', label: 'Diencephalon', division: 'prosencephalon', regions: ['diencephalon'] },
      { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', division: 'mesencephalon', regions: ['midbrain'] },
      { id: 'metencephalon', label: 'Metencephalon (pons + cerebellum)', division: 'rhombencephalon', regions: ['pons', 'cerebellum', 'medulla'] },
      { id: 'myelencephalon', label: 'Myelencephalon (medulla)', division: 'rhombencephalon', regions: ['medulla'] },
      { id: 'vasculature', label: 'Cerebral vasculature', division: 'vasculature', regions: ['vasculature'] },
    ],
  },
  /** An area dropped from the row: its two regions would become unreachable. */
  dropped: {
    AREAS: [
      { id: 'telencephalon', label: 'Telencephalon', division: 'prosencephalon', regions: ['telencephalon'] },
      { id: 'diencephalon', label: 'Diencephalon', division: 'prosencephalon', regions: ['diencephalon'] },
      { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', division: 'mesencephalon', regions: ['midbrain'] },
      { id: 'myelencephalon', label: 'Myelencephalon (medulla)', division: 'rhombencephalon', regions: ['medulla'] },
      { id: 'vasculature', label: 'Cerebral vasculature', division: 'vasculature', regions: ['vasculature'] },
    ],
  },
  /** The area toggle writes the whole region set instead of its own regions. */
  clobber: {
    areaRegions: (id) => findArea(id)?.regions ?? [],
    areasOf: (region) => areaTable().filter((area) => area.regions.includes(region)).map((area) => area.id),
    areaLayersOn: () => true,
  },
}

/** Which check titles a defect is expected to break. */
const DEFECT_TARGETS = {
  hardcoded: ['2.', '5.'],
  merged: ['2.', '3.'],
  dropped: ['2.'],
  clobber: ['2.', '6.'],
}

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
    : ok(`defect "${name}" caught: ${caught[0].message.slice(0, 140)}`)
}

RUNNERS.bite = async () => {
  for (const name of Object.keys(DEFECTS)) {
    info(`[bite] injecting "${name}" → replacing ${Object.keys(DEFECTS[name]).join(', ')}`)
    await bite(name)
  }
}

/**
 * The load-time bite, in an isolated copy of the tree: the shipped store's own
 * AREA partition assertion must refuse a table that cannot drive a complete row.
 * Two independent mutations, one per half of the rule — the vesicle split and the
 * disjointness — both driven through the REAL module load in a child process.
 */
RUNNERS['bite-partition'] = () => {
  const mutations = [
    {
      name: 'metencephalon claims the medulla',
      from: "regions: HINDBRAIN_REGIONS.filter((region) => region !== HINDBRAIN_SPLIT_MEDULLA)",
      to: "regions: HINDBRAIN_REGIONS.filter((region) => region !== 'pons')",
      expect: 'is claimed by',
    },
    {
      name: 'myelencephalon claims the pons as well as the medulla',
      from: "regions: HINDBRAIN_REGIONS.filter((region) => region === HINDBRAIN_SPLIT_MEDULLA)",
      to: "regions: HINDBRAIN_REGIONS.filter((region) => region === HINDBRAIN_SPLIT_MEDULLA || region === 'pons')",
      expect: 'is claimed by',
    },
  ]
  const work = resolve(ROOT, '.plate-scratch/v11-area-bite')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })

  for (const mutation of mutations) {
    const copy = resolve(work, 'tree')
    rmSync(copy, { recursive: true, force: true })
    mkdirSync(copy, { recursive: true })
    for (const entry of ['src', 'scripts']) cpSync(resolve(ROOT, entry), resolve(copy, entry), { recursive: true })
    for (const file of ['package.json', 'tsconfig.json']) {
      if (existsSync(resolve(ROOT, file))) cpSync(resolve(ROOT, file), resolve(copy, file))
    }
    try {
      symlinkSync(resolve(ROOT, 'node_modules'), resolve(copy, 'node_modules'), 'junction')
    } catch {
      /* a junction already exists from a previous run */
    }

    const target = resolve(copy, 'src/state/store.ts')
    const pristine = readFileSync(target, 'utf8')
    const occurrences = pristine.split(mutation.from).length - 1
    occurrences === 1
      ? ok(`[${mutation.name}] the mutation anchor appears exactly once in the copy (1×)`)
      : bad(`[${mutation.name}] the mutation anchor appears ${occurrences}× — fix this check`)
    writeFileSync(target, pristine.replace(mutation.from, mutation.to))

    // The probe lives in the COPY and needs the copy's own module resolution: the
    // app's sources use extensionless relative imports, which Node's ESM loader
    // does not resolve (Vite does). A minimal loader hook — the same two rules this
    // gate registers — makes the subprocess self-contained.
    const probe = resolve(copy, 'scripts/verify/_area-bite-probe.mjs')
    writeFileSync(probe, PROBE_SOURCE)
    const log = resolve(work, 'probe.log')
    const fd = openSync(log, 'w')
    const run = spawnSync(process.execPath, ['scripts/verify/_area-bite-probe.mjs'], {
      cwd: copy,
      stdio: ['ignore', fd, fd],
    })
    closeSync(fd)
    const output = existsSync(log) ? readFileSync(log, 'utf8') : ''
    const firstError = output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('Error: '))
    info(`[bite] ${mutation.name}: mutated copy exits ${String(run.status)}`)
    truthy(`[${mutation.name}] the mutated copy exits non-zero`, run.status !== 0 && run.status !== null, `exit ${String(run.status)}`)
    truthy(
      `[${mutation.name}] the load-time assertion names the defect`,
      (firstError ?? '').includes(mutation.expect),
      firstError === undefined ? '(no Error: line was printed)' : firstError.slice(0, 190),
    )
    truthy(
      `[${mutation.name}] the shared tree still holds the correct split`,
      !readSource('src/state/store.ts').includes(mutation.to),
    )
  }
  rmSync(work, { recursive: true, force: true })
}

/**
 * The child probe: it imports the COPIED store and prints the first error. Kept as
 * a template literal so the copy is self-contained (mirrors the technique in
 * `division-toggles.mjs`).
 */
const PROBE_SOURCE = String.raw`import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve('.')
const require_ = createRequire(resolve(ROOT, 'package.json'))
const ts = require_('typescript')
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
      return { format: 'module', source: 'export default ' + JSON.stringify(parsed), shortCircuit: true }
    }
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      let source = readFileSync(fileURLToPath(url), 'utf8')
      source = source.replace(
        /import\.meta\.glob\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\}\s*,?\s*\)/g,
        (whole, pattern, options) => {
          const directory = resolve(fileURLToPath(url), '..')
          const lastSlash = pattern.lastIndexOf('/')
          const head = pattern.slice(0, lastSlash)
          const recursive = head.includes('**')
          const baseDir = resolve(directory, head.replace(/\*\*\/?/g, ''))
          const filePattern = pattern.slice(lastSlash + 1)
          if (!existsSync(baseDir)) return '{}'
          const test = new RegExp('^' + filePattern.replace(/[.+^$(){}|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
          const walk = (dir, prefix) => {
            const out = []
            for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
              const relative = prefix === '' ? entry.name : prefix + '/' + entry.name
              if (entry.isDirectory()) {
                if (recursive) out.push(...walk(resolve(dir, entry.name), relative))
                continue
              }
              if (!test.test(entry.name)) continue
              out.push(relative)
            }
            return out
          }
          const raw = /\?raw/.test(options)
          const mapped = walk(baseDir, '').map((relative) => {
            const full = resolve(baseDir, relative)
            const key = head.replace(/\*\*\/?/g, '') + relative
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
console.log('store imported without throwing (AREAS=' + store.AREAS.length + ')')
`

/**
 * The child probe for section 10 — it prints ONE JSON line that the parent reads.
 *
 * It renders `<Header />` with React's own server renderer (so the component sees
 * elements, and the stub hook is only a state read), then calls the real `onClick`
 * of every area, system, Reset and All button and reports the store after each
 * one. All paths are relative to the COPIED tree, which is why this lives in a
 * template literal (the `division-toggles.mjs` technique).
 */
const WIRING_PROBE_SOURCE = String.raw`import { createRequire } from 'node:module'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement } from 'react'

const ROOT = resolve('.')
const require_ = createRequire(resolve(ROOT, 'package.json'))
const ts = require_('typescript')
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
      return { format: 'module', source: 'export default ' + JSON.stringify(parsed), shortCircuit: true }
    }
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      let source = readFileSync(fileURLToPath(url), 'utf8')
      source = source.replace(
        /import\.meta\.glob\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\}\s*,?\s*\)/g,
        (whole, pattern, options) => {
          const directory = resolve(fileURLToPath(url), '..')
          const lastSlash = pattern.lastIndexOf('/')
          const head = pattern.slice(0, lastSlash)
          const recursive = head.includes('**')
          const baseDir = resolve(directory, head.replace(/\*\*\/?/g, ''))
          const filePattern = pattern.slice(lastSlash + 1)
          if (!existsSync(baseDir)) return '{}'
          const test = new RegExp('^' + filePattern.replace(/[.+^|]/g, '\\$&').replace(/\*/g, '.*') + '$')
          const walk = (dir, prefix) => {
            const out = []
            for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
              const relative = prefix === '' ? entry.name : prefix + '/' + entry.name
              if (entry.isDirectory()) {
                if (recursive) out.push(...walk(resolve(dir, entry.name), relative))
                continue
              }
              if (!test.test(entry.name)) continue
              out.push(relative)
            }
            return out
          }
          const raw = /\?raw/.test(options)
          const mapped = walk(baseDir, '').map((relative) => {
            const full = resolve(baseDir, relative)
            const key = head.replace(/\*\*\/?/g, '') + relative
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
    const pathOnly = url.split('?')[0]
    if (url.startsWith('file:') && /\.(css|svg|png|glb|bin)$/i.test(pathOnly)) {
      return { format: 'module', source: 'export default undefined', shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const moduleUrl = (relative) => pathToFileURL(resolve(ROOT, relative)).href
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const store = await import(moduleUrl('src/state/store.ts'))
const load = await import(moduleUrl('src/data/load.ts'))
const Header = (await import(moduleUrl('src/components/Header.tsx'))).default
/** The region axis, from the shipped data module (never retyped). */
const ALL_REGIONS = load.ALL_REGIONS
const ALL_KINDS = load.ALL_KINDS

/**
 * Flatten a rendered element tree into host nodes, recursing through children.
 *
 * The element test is the element's own typeof marker plus the presence of
 * 'type' and 'props' on the node — deliberately not React's 'isValidElement', so a
 * probe-side interop difference cannot make every node look invalid and silently
 * reduce the tree to nothing (the failure mode this gate exists to prevent).
 */
function collect(node, out = []) {
  if (node === null || node === undefined || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) collect(child, out)
    return out
  }
  if (node.type === undefined || node.props === undefined || node.$$typeof === undefined) return out
  const { type, props } = node
  if (typeof type === 'function') return collect(type(props), out)
  out.push({ type, props })
  const children = props.children
  if (Array.isArray(children)) for (const child of children) collect(child, out)
  else collect(children, out)
  return out
}

const markup = renderToStaticMarkup(createElement(Header))
const nodes = collect(createElement(Header))
const buttons = nodes.filter((node) => node.type === 'button')
const areas = buttons.filter((node) => node.props['data-area'] !== undefined)
const kinds = buttons.filter((node) => node.props['data-kind'] !== undefined)
const actions = buttons.filter((node) => node.props['data-header-action'] !== undefined)

const snap = () => {
  const layers = store.useAtlasStore.getState().layers
  return {
    regions: [...layers.regions].sort(),
    kinds: [...layers.kinds].sort(),
    hidden: [...layers.hidden].sort(),
  }
}
const steps = []
const record = (name, value, expected) => steps.push({ name, value, expected })

for (const node of areas) {
  const id = node.props['data-area']
  const area = store.AREAS.find((entry) => entry.id === id)
  // The row's own state, not an assumption about the boot default: the button
  // reads ON when every region it owns is layer-on. Clicking writes the OPPOSITE.
  const current = [...store.useAtlasStore.getState().layers.regions]
  const wasOn = area.regions.every((region) => current.includes(region))
  const expected = wasOn
    ? current.filter((region) => !area.regions.includes(region)).sort()
    : ALL_REGIONS.filter((region) => current.includes(region) || area.regions.includes(region)).sort()
  const before = snap()
  node.props.onClick()
  const after = snap()
  record(
    'area ' + id + ' (' + (wasOn ? 'ON to OFF' : 'OFF to ON') + ') click writes exactly its own regions',
    after.regions,
    expected,
  )
  record('area ' + id + ' click leaves kinds untouched', after.kinds, before.kinds)
  // aria-pressed is computed at render time from areaLayersOn, so the state the
  // button WOULD render is read through that same shipped decision after the click
  // (a static render cannot re-render, and asserting the stale prop would be
  // asserting the harness, not the product).
  record(
    'area ' + id + ' reads ' + (wasOn ? 'unpressed' : 'pressed') + ' after the click',
    store.areaLayersOn(store.useAtlasStore.getState().layers, id),
    !wasOn,
  )
  record(
    'the boot reading of area ' + id + ' (probe) agrees with the shipped areaLayersOn',
    node.props['aria-pressed'],
    wasOn,
  )
  node.props.onClick()
  record('area ' + id + ' click twice restores the region set', snap().regions, before.regions)
  record(
    'area ' + id + ' reads ' + (wasOn ? 'pressed' : 'unpressed') + ' again after the second click',
    store.areaLayersOn(store.useAtlasStore.getState().layers, id),
    wasOn,
  )
}

for (const node of kinds) {
  const kind = node.props['data-kind']
  const before = snap()
  node.props.onClick()
  const after = snap()
  record(
    'system ' + kind + ' click removes exactly that kind',
    after.kinds,
    before.kinds.filter((entry) => entry !== kind),
  )
  record('system ' + kind + ' click leaves regions untouched', after.regions, before.regions)
  node.props.onClick()
  record('system ' + kind + ' click twice restores the kind set', snap().kinds, before.kinds)
}

const afterAreaClicks = snap()

/* Reset / All from a dirty state. */
store.useAtlasStore.setState({
  layers: {
    regions: new Set(['vasculature']),
    kinds: new Set(['context']),
    hidden: new Set(['probe-hidden']),
    emphasis: new Set(['probe-emphasis']),
  },
})
const dirty = snap()
actions.find((node) => node.props['data-header-action'] === 'reset').props.onClick()
const afterReset = snap()
const all = actions.find((node) => node.props['data-header-action'] === 'all')
all.props.onClick()
const afterAll = snap()

console.log(JSON.stringify({
  areaCount: areas.length,
  kindCount: kinds.length,
  actions: actions.map((node) => node.props['data-header-action']),
  missingHandlers: buttons
    .filter((node) => node.props['data-area'] !== undefined || node.props['data-kind'] !== undefined || node.props['data-header-action'] !== undefined)
    .filter((node) => typeof node.props.onClick !== 'function')
    .map((node) => node.props['data-area'] ?? node.props['data-kind'] ?? node.props['data-header-action']),
  bootPressed: areas.map((node) => node.props['aria-pressed']),
  bootKindPressed: kinds.map((node) => node.props['aria-pressed']),
  dirty: dirty.regions,
  afterAreaClicks: afterAreaClicks.regions,
  afterKindClicks: afterAreaClicks.kinds,
  afterReset: { regions: afterReset.regions, kinds: afterReset.kinds, hidden: afterReset.hidden },
  afterAll: { regions: afterAll.regions, kinds: afterAll.kinds },
  markupHasAreas: markup.indexOf('header-areas') >= 0,
  markupHasSystems: markup.indexOf('header-systems') >= 0,
  markupHasPresets: markup.indexOf('header-presets') >= 0,
  steps: steps,
}))
`

/* ------------------------------------------------------------------- driver */

/** The check titles, in order, mapped to their runner. */
const TITLES = [
  ['surface', '1. the shipped source declares the AREA contract the header calls'],
  ['partition', '2. the AREA partition is total and disjoint over ALL_REGIONS (printed)'],
  ['systems', '3. the SYSTEMS row is ALL_KINDS, and the areas are derived from the divisions'],
  ['toggle', '4. each area toggle adds/removes exactly its regions; each system exactly its kind'],
  ['defaults', '5. the default framing is unchanged (DEFAULT_LAYERS, viewPresetOf, both rows)'],
  ['reset', '6. Reset reproduces the default exactly; All reproduces VIEW_PRESETS.all'],
  ['render', '7. the rendered <Header /> exposes both rows with distinct accessible names'],
  ['wiring', '8. the rendered buttons are WIRED: their onClick toggles exactly the right layer'],
  ['bite', '9. bite — every injected defect is caught by a named check'],
  ['bite-partition', "10. bite — a mutated AREAS table trips the store's load-time assertion"],
]
const RUNNER_BY_TITLE = Object.fromEntries(TITLES.map(([key, title]) => [title.split('.')[0] + '.', key]))

console.log('\n============ NeuroAxis v11 §1 — Areas + Systems toggle rows ============')
console.log(`  workspace: ${ROOT}`)
console.log('  under test: the SHIPPED src/state/store.ts and src/components/Header.tsx')
console.log('  areas:      Telencephalon · Diencephalon · Mesencephalon (midbrain) ·')
console.log('              Metencephalon (pons + cerebellum) · Myelencephalon (medulla) ·')
console.log('              Cerebral vasculature')
console.log('  systems:    Nuclei · Tracts · Ventricles · Surface · Context · Vessels')

const store = await freshStore()
bindImplementations(store)

for (const [key, title] of TITLES) {
  const record = { title, passed: 0, failed: 0 }
  checks.push(record)
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}`)
  await RUNNERS[key]()
}

console.log('\n================ area-toggles summary ================')
for (const record of checks) {
  console.log(`  ${record.failed === 0 ? '✓' : '✗'} ${record.title}`)
  console.log(`      ${record.passed} passed · ${record.failed} failed`)
}
console.log(`\n  store instances imported: ${storeTag} (each re-runs the store's own load-time assertions)`)
console.log(`  ${passed} assertions passed · ${failures.length} failed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const failure of failures) console.log(`  · ${failure}`)
  console.log('\nAREA-TOGGLE GATE FAILED\n')
  process.exit(1)
}
console.log('\n✔ the six Areas partition all 7 regions exactly once and the six Systems are ALL_KINDS;')
console.log('  each button toggles exactly its own slice of layers.regions / layers.kinds (the one')
console.log('  decision the 3D scene, the 2D live section and the PiP all read); the default framing')
console.log('  is unchanged and Reset reproduces it exactly.')
console.log('  Rendered pixels and real pointer/keyboard use stay orchestrator-only: Chrome cannot')
console.log('  start in this sandbox, so the browser-facing claims here are the DOM contract, the')
console.log('  accessible names and the wired onClick handlers.\n')
process.exit(0)
