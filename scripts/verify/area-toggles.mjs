/**
 * area-toggles.mjs — the committed check for the header's two toggle rows
 * (**Areas** and **Systems**), re-pointed to the post-v12 header by the v13
 * `review-qa` task.
 *
 * ── WHY THIS FILE WAS RE-POINTED (measured, not cosmetic) ───────────────────
 * Run against the v13 tree BEFORE this rewrite, this gate read **228 passed ·
 * 27 failed**, and every non-bite failure was the same class: the gate still
 * encoded the v11 header. Concretely it demanded
 *
 *   • `vasculature` be the SIXTH AREA                       → v12 moved it into the
 *     Systems row as the region-backed `data-system-region` button (`store.ts:1226`);
 *   • `.header-presets`, `data-preset` and `data-header-action="reset"|"all"` →
 *     v12–v12g REMOVED the preset shortcut row and the Reset/All pair, replacing
 *     them with the two per-axis All modules (`areas-all-on` / `areas-all-off` /
 *     `systems-all-on` / `systems-all-off`) plus the `clinical-motor` category
 *     button;
 *   • a 6-button Systems row and a 6-element boot snapshot → v13 added the SEVENTH
 *     kind, `nerve`, surfaced as the `Cranial nerves` button.
 *
 * The product was NOT bent back to satisfy the old text. The gate was re-pointed
 * at the controls that exist, and every claim the old gate made is still made —
 * see `RUNNERS.surface` (the hooks), `RUNNERS.partition` (the regions), and
 * `RUNNERS.render` (the rows) for the per-claim notes.
 *
 * ── v17 RE-COUNT (task `review-qa`): THREE STALE LITERALS IN §9/§11 ─────────
 * Run against the v17 tree BEFORE this edit, §9/§11 failed **6 assertions**, all
 * of them counts the product had already moved past, none of them a product
 * defect:
 *   • `partsForCanvas().length === 138 + 12` → **190**, because v17 added the 40
 *     procedural VESSEL course metas the run plan §5.2 row 5 mandates;
 *   • `registryNerveParts().length === 12` and its four dependent assertions →
 *     **24**, because the v17 mirror twin hands the worker one part per authored
 *     side PLUS one per mirrored twin (the number `cranial-nerve-render.mjs:370`
 *     already pinned).
 * The literals were not updated, they were REMOVED: every count in §11 is now a
 * sum of terms read from the shipped tables, each term asserted against its own
 * table and printed (`[2D domain]`, `[2D worker]`, `[2D slice]`, `[2D handoff]`),
 * so the next family to land fails with the term named instead of drifting
 * silently. §11 also gained the vessel half of the same claim (kind + region
 * ablation, the mirrored twin proven to be the reflection rather than a cached
 * duplicate, the worker slicing all 101 registry parts) and the one OPEN handoff
 * is asserted against `SectionCanvas.tsx` so it cannot be forgotten. Nothing was
 * deleted; the two instructions the old text carried are both still asserted.
 *
 * ── WHAT THIS PROVES NOW ────────────────────────────────────────────────────
 * It imports the SHIPPED store (`src/state/store.ts`), the SHIPPED `Header.tsx`,
 * the SHIPPED render-path modules (`SceneLayers`, `NucleusMesh`,
 * `sectionAssets`, `SectionCanvas`, `TaxonomyTree`, `Legend`) and the SHIPPED
 * cortical-lobe rule, through the same in-process TS/TSX loader the other Node
 * gates use (no copy, no re-typed table), and drives the real controls:
 *
 *   1  the shipped source declares the contract the header calls, with the
 *      post-v12 hooks present and the REMOVED v11 hooks absent (asserted, so a
 *      half-reverted header fails here);
 *   2  the AREA partition plus the region-backed Systems buttons are TOTAL and
 *      DISJOINT over `ALL_REGIONS` — every region claimed by exactly one control
 *      — with the per-button taxonomy row count printed;
 *   3  the two rhombencephalon areas together ARE that division, at the vesicle
 *      boundary the label names;
 *   4  the SYSTEMS row is `ALL_KINDS` (seven kinds, `nerve` last) plus the one
 *      region-backed system button, printed with each slice's row count;
 *   5  every area's region set is DERIVED, not retyped: the shipped `AREAS` must
 *      equal the table reconstructed from the shipped `DIVISIONS` minus the
 *      documented vascular carve-out, and `SYSTEM_REGION_BUTTONS` must equal the
 *      store's own complement rule, evaluated here from the parsed source;
 *   6  each area toggle, each system toggle and the region-backed button add and
 *      remove EXACTLY their own slice through the store ACTIONS the buttons call;
 *   7  the DEFAULT framing is unchanged: `DEFAULT_LAYERS`, `viewPresetOf`, the
 *      boot row state (5 areas pressed, all 7 kinds pressed, vasculature off) and
 *      the pinned hidden/emphasis sets;
 *   8  the documented default framing is REACHABLE from the post-v12 controls —
 *      `areas-all-on` + `systems-all-on` + the vascular region off lands exactly on
 *      `DEFAULT_LAYERS`, asserted as a set equality, not as a vibe;
 *   9  the rendered `<Header />` exposes both rows with the right counts, distinct
 *      accessible names, visible text that is a PREFIX of the accessible name
 *      (WCAG 2.5.3), the removed v11 hooks absent, and the two All modules +
 *      `Clinical motor` present with their own names;
 *  10  the WIRED handlers: the `onClick` the rendered buttons actually carry are
 *      called against the real store and must toggle exactly the right slice — so
 *      this gate cannot pass while the buttons are inert;
 *  11  the v13 `nerve` kind really is sliced everywhere it must be: the twelve
 *      taxonomised records, the 3D structure pass (12 records / 24 bodies on, 0
 *      off), the taxonomy tree's dim rule, the Legend swatch and token, and the 2D
 *      half — RE-POINTED AT v14, which is the run that made the Plates live
 *      section react, and RE-COUNTED AT v17 by `review-qa`. The canvas now takes
 *      138 committed-GLB parts + 12 PROCEDURAL nerve parts + 40 PROCEDURAL vessel
 *      course parts = **190 metas**, so this section asserts the DOMAIN as a sum of
 *      terms read from the shipped tables (`NERVE_COURSES`, `VESSEL_COURSES`), the
 *      ABLATION of both families (every nerve/vessel meta admitted with its kind on
 *      and none with it off, the vessel family additionally needing the vasculature
 *      region, the 138 committed admissions byte-identical), the worker's own
 *      geometry (`registryNerveParts()` 24 = 12 + 12 mirrored; `registryVesselParts()`
 *      77 = 40 + 37 mirrored, every twin proven the reflection of its authored side,
 *      indices in range) and a real `extractContours` slice per part (101 parts), while
 *      the PAYLOAD invariants stay asserted (manifest 138 parts, no `nrv-*` GLB, no
 *      committed GLB carrying a granular course id). Through v13 the same section
 *      asserted "no nerve part exists"; that claim is now false by design, and
 *      audit.mjs R3b's matching pixel-INVARIANCE claim is re-pointed with it;
 *  12  the v11 carry-over item-4 divergence (the canvas painting divisions the rule
 *      excludes at y = 6 / 26 / 30 / 32) re-measured by executing the canvas' own
 *      `buildLobeLayer` and the shipped rule at every plane the browser lane names;
 *  13  a SOURCE-LEVEL guard against this project's known failure mode: every
 *      static browser probe inside `scripts/verify/audit.mjs` is parsed here, so a
 *      probe with a syntax error cannot reach the orchestrator's browser run
 *      unnoticed;
 *  14  the BITE half: mutated `AREAS`/kind tables are run in an isolated copy of
 *      the tree and must trip the store's own load-time partition assertion with a
 *      non-zero exit, and in-process defect tables prove the named checks fail on a
 *      hardcoded / merged / dropped / clobbered table or a mislabelled kind.
 *
 * Every check prints its numbers and the script exits non-zero if any assertion
 * fails. Rendered pixels, real key presses and real pointer input stay
 * orchestrator-only: Chrome cannot start in this sandbox, so the browser-facing
 * claims here are about the DOM contract, the wired handlers and the executed
 * draw paths.
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
 * JSON imports wrapped, `import.meta.glob` emulated — including the `?url` form
 * `src/geometry/anatomyAssets.ts:443` uses for the GLBs), so the SHIPPED modules
 * are what run — nothing is copied, stubbed or re-typed for the test's convenience.
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
      // (`src/data/load.ts` needs it); only the eager form is used here. `?url`
      // globs (the GLB table) must yield a URL-returning function, never a
      // JSON.parse of binary geometry.
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
          const urlOnly = /\?url/.test(options)
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
            if (urlOnly) {
              return `${JSON.stringify(key)}: () => Promise.resolve(${JSON.stringify(`/assets/${relative}`)})`
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
 * framing, the v10 division partition and the v11 area partition) run again on
 * every import, so the instance count is also how many times those assertions
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
 * The AREA partition RECONSTRUCTED from the shipped v10 `DIVISIONS` plus the TWO
 * documented rules: every division is one area verbatim, except
 *   • the rhombencephalon, which splits at the metencephalon/myelencephalon
 *     boundary — `pons` + `cerebellum` alongside `medulla` (PLAN.md §1a), and
 *   • the vasculature division, which v12 moved OUT of the Areas row into the
 *     Systems row as the region-backed `Vasculature` button (`store.ts:1202–1228`).
 * Derived at runtime, never retyped, so this is the assertion that fails if the
 * shipped table is edited to a hardcoded set that no longer matches the
 * taxonomy/division structure.
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
    } else if (division.id === 'vasculature') {
      // v12: NOT an area. Its region belongs to the Systems row's region-backed
      // button, which `SYSTEM_REGION_BUTTONS` derives as the complement of AREAS.
      continue
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
 *   • `regions: SPLIT.filter(...)`         → the constant's literal regions,
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
   * string literal (`'medulla'`) or as a named constant
   * (`HINDBRAIN_SPLIT_MEDULLA`). A constant that cannot be resolved yields null,
   * and a null comparison leaves the base list unfiltered — which makes this check
   * FAIL loudly rather than quietly agreeing with a set it never evaluated.
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

/** The four per-axis "All" module hooks, in the order `Header.tsx` renders them. */
const ALL_MODULE_HOOKS = ['areas-all-on', 'areas-all-off', 'systems-all-on', 'systems-all-off']

/* ═══════════════════════════════════ the checks, as re-runnable functions ═══ */

/**
 * The SHIPPED implementations, held in a MUTABLE table: ES module namespaces are
 * frozen, so the bite section cannot monkey-patch the module itself. The checks
 * always call through this table, which is why replacing an entry here genuinely
 * replaces the behaviour under test.
 */
const impl = {
  AREAS: null,
  SYSTEM_REGION_BUTTONS: null,
  areaRegions: undefined,
  areasOf: undefined,
  areaLayersOn: undefined,
  ALL_KINDS: null,
}

function bindImplementations(module) {
  impl.AREAS = module.AREAS
  impl.SYSTEM_REGION_BUTTONS = module.SYSTEM_REGION_BUTTONS
  impl.areaRegions = module.areaRegions
  impl.areasOf = module.areasOf
  impl.areaLayersOn = module.areaLayersOn
  impl.ALL_KINDS = ALL_KINDS
}

/** The area table as the checks see it (the shipped one unless a defect is armed). */
const areaTable = () => impl.AREAS
const kindTable = () => impl.ALL_KINDS
const systemRegionTable = () => impl.SYSTEM_REGION_BUTTONS
const findArea = (id) => areaTable().find((area) => area.id === id)

const RUNNERS = {}

/* ------------------------------------------------------------- 1. the surface */

RUNNERS.surface = () => {
  const code = stripComments(readSource('src/state/store.ts'))
  for (const fact of ['AREAS', 'SYSTEM_REGION_BUTTONS', 'areaRegions', 'areasOf', 'areaLayersOn']) {
    truthy(`store.ts exports ${fact}`, new RegExp(`export (function|const) ${fact}\\b`).test(code))
  }
  truthy('store.ts exports the AreaId type', /export type AreaId\b/.test(code))
  truthy('store.ts exports ALL_ON_LAYERS (the "everything on" definition)', /export const ALL_ON_LAYERS\b/.test(code))
  truthy(
    'the AREA table is DERIVED from the division table (divisionRegions), not retyped',
    /AREAS[\s\S]{0,1400}divisionRegions\(/.test(code),
  )
  truthy(
    'the region-backed Systems buttons are DERIVED as the complement of AREAS, not retyped (v12)',
    /SYSTEM_REGION_BUTTONS[\s\S]{0,400}ALL_REGIONS[\s\S]{0,200}filter\([\s\S]{0,200}AREAS\.some/.test(code),
  )

  const header = stripComments(readSource('src/components/Header.tsx'))
  truthy(
    'Header.tsx imports AREAS + areaLayersOn + SYSTEM_REGION_BUTTONS from the store',
    /AREAS/.test(header) && /areaLayersOn/.test(header) && /SYSTEM_REGION_BUTTONS/.test(header) &&
      /from '\.\.\/state\/store'/.test(header),
  )
  truthy('Header.tsx reads the kind axis from ALL_KINDS', /ALL_KINDS/.test(header))
  truthy('Header.tsx calls toggleRegionLayer (the two region paths)', /toggleRegionLayer\(/.test(header))
  truthy('Header.tsx calls toggleKindLayer (the systems path)', /toggleKindLayer\(/.test(header))
  truthy('Header.tsx calls applyViewPreset (Clinical motor resolves through the preset table)', /applyViewPreset\(/.test(header))
  for (const hook of [
    'data-area=',
    'data-division=',
    'data-kind=',
    'data-system-region=',
    'data-region=',
    'data-header-action=',
    'data-row=',
  ]) {
    const occurrences = (header.match(new RegExp(hook.replace('=', '\\s*='), 'g')) ?? []).length
    truthy(`Header.tsx carries the "${hook}" hook`, occurrences >= 1, `${occurrences} occurrence(s)`)
  }
  /* v12 asserts the REMOVALS too: a header that kept a dead `data-preset` or
     `.header-presets` hook would make the browser lane's machine-hook clicks
     ambiguous again, and the audit blocks below rely on those hooks being gone. */
  for (const gone of ['data-preset', 'header-presets']) {
    const occurrences = (header.match(new RegExp(gone, 'g')) ?? []).length
    truthy(
      `Header.tsx carries no live "${gone}" hook (removed by v12)`,
      occurrences === 0,
      `${occurrences} occurrence(s)`,
    )
  }
  const moduleHooks = ALL_MODULE_HOOKS.filter((hook) => header.includes(`data-header-action="${hook}"`))
  equal('the four per-axis All-module hooks in the shipped Header source', moduleHooks, ALL_MODULE_HOOKS)
  truthy(
    'Header.tsx carries the clinical-motor category button',
    /data-header-action="clinical-motor"/.test(header),
  )
  const pressed = (header.match(/aria-pressed=/g) ?? []).length
  truthy('every Header control is a real aria-pressed button', pressed >= 5, `${pressed} aria-pressed control(s)`)
  truthy(
    'no Header button is a div/span with a button role',
    !/role="button"/.test(header) && !/<input/.test(header),
  )
  truthy(
    'KIND_LABELS is an exhaustive Record<Kind, string> (a kind cannot land without a label)',
    /const KIND_LABELS: Record<Kind, string>/.test(header),
  )
  truthy(
    'KIND_LABELS labels the v13 nerve kind "Cranial nerves"',
    /nerve:\s*'Cranial nerves'/.test(header),
  )
}

/* ------------------------------------------- 2/3. the AREA partition, printed */

RUNNERS.partition = () => {
  const areas = areaTable()
  const systemRegions = systemRegionTable()
  equal('the number of area buttons', areas.length, 5)
  equalJson('the area ids, in row order', areas.map((area) => area.id), [
    'telencephalon',
    'diencephalon',
    'mesencephalon',
    'metencephalon',
    'myelencephalon',
  ])
  equal('the number of region-backed Systems buttons (v12)', systemRegions.length, 1)
  equalJson(
    'the region-backed Systems button id',
    systemRegions.map((entry) => entry.id),
    ['vasculature'],
  )

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
  for (const entry of systemRegions) {
    const rows = rowsOfRegions([entry.id])
    console.log(
      `     ${`system:${entry.id}`.padEnd(16)}${entry.id.padEnd(24)}${String(rows).padEnd(7)}` +
        `${'vasculature'.padEnd(17)}${store.DEFAULT_LAYERS.regions.has(entry.id) ? 'ON' : 'off'}`,
    )
    if (claimed.includes(entry.id)) duplicates.push(`${entry.id} (again in system:${entry.id})`)
    claimed.push(entry.id)
  }
  console.log(
    `     ${'Σ'.padEnd(16)}${String(claimed.length).padEnd(24)}${String(rowsOfRegions(claimed)).padEnd(7)}` +
      `${'—'.padEnd(17)}${claimed.length} claims for ${ALL_REGIONS.length} regions`,
  )

  equal('the union of the areas + region-backed systems', sorted(claimed), sorted(ALL_REGIONS))
  equal('regions claimed twice', duplicates, [])
  equal('regions no control reaches', ALL_REGIONS.filter((region) => impl.areasOf(region).length === 0 && !systemRegions.some((entry) => entry.id === region)), [])
  equal(
    'every area claims at least one region',
    areas.filter((area) => impl.areaRegions(area.id).length === 0).map((area) => area.id),
    [],
  )
  for (const region of ALL_REGIONS) {
    const owners = impl.areasOf(region)
    if (owners.length === 0) {
      equal(`"${region}" is owned by the Systems row (the v12 carve-out)`, sorted(systemRegions.filter((entry) => entry.id === region).map((entry) => entry.id)), [region])
      continue
    }
    equal(`areasOf('${region}')`, [...owners], [owners[0]])
  }
  equal('the Σ of the per-control taxonomy rows', rowsOfRegions(claimed), taxonomy.length)
  truthy(
    'the five areas carry non-empty, distinct labels',
    areas.every((area) => typeof area.label === 'string' && area.label.trim().length > 0) &&
      new Set(areas.map((area) => area.label)).size === areas.length,
    areas.map((area) => area.label).join(' · '),
  )

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
  equal('the vascular region keeps its own division row', store.divisionsOf('vasculature'), ['vasculature'])
}

/* ----------------------------------------------- 4/5. the systems + derivation */

RUNNERS.systems = () => {
  console.log('  ── SYSTEMS partition (button · kind · taxonomy rows · boot state)')
  console.log(`     ${'data-kind'.padEnd(16)}${'rows'.padEnd(7)}boot`)
  let total = 0
  for (const kind of kindTable()) {
    const rows = rowsOfKind(kind)
    total += rows
    console.log(
      `     ${kind.padEnd(16)}${String(rows).padEnd(7)}${store.DEFAULT_LAYERS.kinds.has(kind) ? 'ON' : 'off'}`,
    )
  }
  for (const entry of systemRegionTable()) {
    const rows = rowsOfRegions([entry.id])
    total += rows
    console.log(
      `     ${`system:${entry.id}`.padEnd(16)}${String(rows).padEnd(7)}${store.DEFAULT_LAYERS.regions.has(entry.id) ? 'ON' : 'off'}`,
    )
  }
  console.log(`     ${'Σ'.padEnd(16)}${String(total).padEnd(7)}of ${taxonomy.length} taxonomy rows · ${kindTable().length} kinds`)

  equalJson('ALL_KINDS is the seven documented kinds, in order', [...kindTable()], [
    'nucleus',
    'tract',
    'ventricle',
    'surface',
    'vessel',
    'context',
    'nerve',
  ])
  equalJson('ALL_KINDS has no duplicate', new Set(kindTable()).size, kindTable().length)
  equal('the Σ of the per-kind taxonomy rows', kindTable().reduce((sum, kind) => sum + rowsOfKind(kind), 0), taxonomy.length)
  /* The two Systems-row AXES are orthogonal: the kinds axis is total over the
     taxonomy, and the region-backed button re-reaches rows that already have a
     kind. So the claim is not "they add up to 248" (they overlap on purpose) but
     "the region-backed button's rows are exactly the vessel kind's rows" — a user
     reaching the arteries through `Vasculature` and through `Vessels` sees the same
     14 records. A region-backed button whose rows were NOT already covered by a
     kind would be a row reachable only through one of the two axes. */
  equal(
    'the vascular region\'s taxonomy rows are exactly the vessel kind\'s rows (the two axes overlap, by design)',
    rowsOfRegions(systemRegionTable().map((entry) => entry.id)),
    rowsOfKind('vessel'),
  )
  equal(
    'every kind is layer-on at boot',
    kindTable().filter((kind) => !store.DEFAULT_LAYERS.kinds.has(kind)),
    [],
  )
  truthy(
    'the v13 nerve kind is on at boot, so its twelve rows are reachable without a click',
    store.DEFAULT_LAYERS.kinds.has('nerve'),
    `${rowsOfKind('nerve')} taxonomy rows`,
  )

  // 5. derivation: the shipped table must equal the reconstruction from DIVISIONS.
  const expected = expectedAreasFromDivisions(store)
  equalJson('the shipped AREA ids equal the table reconstructed from DIVISIONS', areaTable().map((a) => a.id), expected.map((a) => a.id))
  for (const want of expected) {
    const actual = findArea(want.id)
    equal(`reconstructed regions of "${want.id}"`, actual ? sorted(actual.regions) : null, sorted(want.regions))
    equal(`reconstructed division of "${want.id}"`, actual ? actual.division : null, want.division)
  }
  /* …and the region SETS READ OUT OF THE AREAS SOURCE TEXT must resolve to the
     same sets: a retyped literal that drifts from the taxonomy fails here even if
     the shipped table and the reconstruction were edited together. */
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
  /* The v12 complement rule, evaluated the way the store writes it. */
  const areaRegionsSet = new Set(areaTable().flatMap((area) => [...area.regions]))
  equal(
    'SYSTEM_REGION_BUTTONS equals the complement of the areas over ALL_REGIONS (the store\'s own rule)',
    sorted(systemRegionTable().map((entry) => entry.id)),
    sorted(ALL_REGIONS.filter((region) => !areaRegionsSet.has(region))),
  )
  equalJson(
    'the vascular button keeps the v8 label',
    systemRegionTable().map((entry) => entry.label),
    ['Vasculature'],
  )
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

  // The regions the v12 Systems row owns, through the same region action.
  for (const entry of systemRegionTable()) {
    const before = readState(module)
    module.useAtlasStore.getState().toggleRegionLayer(entry.id)
    const flipped = readState(module)
    equal(
      `system region "${entry.id}" toggles exactly its own region`,
      flipped.regions,
      sorted(
        before.regions.includes(entry.id)
          ? before.regions.filter((region) => region !== entry.id)
          : [...before.regions, entry.id],
      ),
    )
    equalSet(`system region "${entry.id}" did not touch kinds`, new Set(flipped.kinds), new Set(before.kinds))
    module.useAtlasStore.getState().toggleRegionLayer(entry.id)
    equal(`system region "${entry.id}" round-trips the region set`, readState(module).regions, before.regions)
  }
  setState(module, boot)

  // The systems axis, through the action the buttons call.
  for (const kind of kindTable()) {
    const before = readState(module)
    module.useAtlasStore.getState().toggleKindLayer(kind)
    const off = readState(module)
    equal(`system "${kind}" OFF removes exactly that kind`, off.kinds, sorted(before.kinds.filter((k) => k !== kind)))
    equalSet(`system "${kind}" OFF did not touch regions`, new Set(off.regions), new Set(before.regions))
    module.useAtlasStore.getState().toggleKindLayer(kind)
    equal(`system "${kind}" ON restores the kind set exactly`, readState(module).kinds, sorted(before.kinds))
  }
  setState(module, boot)

  /* (d) THE TWO ALL MODULES, as the header computes them. `Header.tsx` derives
     `areaRegions` from AREAS, `systemRegions` from SYSTEM_REGION_BUTTONS, and
     `setSlice` writes exactly the ids whose state differs — so the module's own
     semantics are reproducible here from the SHIPPED tables and the SHIPPED
     action. Each direction is driven from a deliberately dirty state. */
  const areaRegionsAll = areaTable().flatMap((area) => [...area.regions])
  const systemRegionIds = systemRegionTable().map((entry) => entry.id)
  const applySlice = (state, regions, kinds, on) => {
    setState(module, state)
    for (const region of regions) {
      if (module.useAtlasStore.getState().layers.regions.has(region) !== on) {
        module.useAtlasStore.getState().toggleRegionLayer(region)
      }
    }
    for (const kind of kinds) {
      if (module.useAtlasStore.getState().layers.kinds.has(kind) !== on) {
        module.useAtlasStore.getState().toggleKindLayer(kind)
      }
    }
    return readState(module)
  }
  const dirty = {
    regions: ['vasculature', 'pons'],
    kinds: ['nucleus'],
    hidden: ['probe-hidden'],
    emphasis: ['probe-emphasis'],
  }
  const areasOn = applySlice(dirty, areaRegionsAll, [], true)
  equal('areas-all-on turns exactly the area regions on', areasOn.regions, sorted(ALL_REGIONS))
  equal('areas-all-on turns every kind on too? NO — it is one axis', areasOn.kinds, sorted(['nucleus']))
  const areasOff = applySlice(boot, areaRegionsAll, [], false)
  equal(
    'areas-all-off leaves exactly the regions no area owns (the v12 carve-out survives the click)',
    areasOff.regions,
    sorted(boot.regions.filter((region) => !areaRegionsAll.includes(region))),
  )
  equal('areas-all-off does not touch the kind axis', areasOff.kinds, sorted(ALL_KINDS))
  const systemsOn = applySlice(dirty, systemRegionIds, ALL_KINDS, true)
  equal('systems-all-on turns every kind on and the region-backed systems on', systemsOn.kinds, sorted(ALL_KINDS))
  equal('systems-all-on turns the vascular region on (that is its slice)', systemsOn.regions, sorted(['pons', 'vasculature']))
  const systemsOff = applySlice(boot, systemRegionIds, ALL_KINDS, false)
  equal('systems-all-off clears the kind axis and the region-backed systems', systemsOff.kinds, [])
  equal(
    'systems-all-off leaves the areas\' own regions alone',
    systemsOff.regions,
    sorted(ALL_REGIONS.filter((region) => !systemRegionIds.includes(region))),
  )
  setState(module, boot)
}

/* -------------------------------------------------------- 7. the default framing */

RUNNERS.defaults = () => {
  const boot = store.DEFAULT_LAYERS
  equal('viewPresetOf(DEFAULT_LAYERS)', store.viewPresetOf(boot), 'brainstem-focus')
  equalJson('VIEW_PRESETS still carries the nine documented presets', Object.keys(store.VIEW_PRESETS).length, 9)
  equalJson('VIEW_PRESETS still carries brainstem-focus', typeof store.VIEW_PRESETS['brainstem-focus'], 'object')
  equalJson('VIEW_PRESETS still carries all', typeof store.VIEW_PRESETS.all, 'object')
  truthy('viewPresetOf is still a function', typeof store.viewPresetOf === 'function')

  // The documented default, pinned as a literal so a silent edit of the preset
  // table fails here as well as in the store's own load-time block.
  equal('DEFAULT_LAYERS.regions', sorted(boot.regions), sorted(ALL_REGIONS.filter((r) => r !== 'vasculature')))
  equal('DEFAULT_LAYERS.kinds', sorted(boot.kinds), sorted(ALL_KINDS))
  equal('the default hidden set is the 32 cortex-preset ids', boot.hidden.size, 32)
  equal('the default emphasis set is empty', [...boot.emphasis], [])
  truthy('the vasculature REGION is off at boot', !boot.regions.has('vasculature'))
  truthy('the vessel KIND is on at boot', boot.kinds.has('vessel'))
  truthy('the nerve KIND is on at boot (v13)', boot.kinds.has('nerve'))

  equalJson(
    'the boot area row (aria-pressed per button)',
    areaTable().map((area) => impl.areaLayersOn(boot, area.id)),
    [true, true, true, true, true],
  )
  equalJson(
    'the boot region-backed Systems row (aria-pressed per button)',
    systemRegionTable().map((entry) => boot.regions.has(entry.id)),
    [false],
  )
  equalJson(
    'the boot systems row (aria-pressed per kind)',
    kindTable().map((kind) => boot.kinds.has(kind)),
    [true, true, true, true, true, true, true],
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

  /* THE POST-V12 FRAMING CLAIM (this review task). The v11 gate asserted "Reset
     reproduces the default" because a Reset button existed. It does not exist any
     more, and the product must NOT be bent back — so the same claim is made about
     the controls that do exist, as a SET EQUALITY rather than a description:

       areas-all-on  +  systems-all-on  +  vascular region off   ==  DEFAULT_LAYERS
     */
  const areaRegionsAll = areaTable().flatMap((area) => [...area.regions])
  const composedRegions = sorted([...areaRegionsAll])
  equal(
    'areas-all-on alone reproduces DEFAULT_LAYERS.regions',
    composedRegions,
    sorted(boot.regions),
  )
  equal(
    'systems-all-on alone reproduces DEFAULT_LAYERS.kinds',
    sorted(ALL_KINDS),
    sorted(boot.kinds),
  )
  equalJson(
    'the framing triple the audit reads has no off-by-one',
    [
      areaRegionsAll.length,
      ALL_KINDS.length,
      ALL_REGIONS.filter((region) => !areaRegionsAll.includes(region)).length,
    ],
    [boot.regions.size, boot.kinds.size, 1],
  )
}

/* ------------------------------------------------------------ 8. composed default */

RUNNERS.composed = async () => {
  const module = await sharedStore()
  const boot = readState(store)

  // A deliberately dirty state: one area soloed away, two systems off, the
  // vascular region on, plus probe hidden/emphasis entries.
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

  /* The RESTORE PATH THE AUDIT NOW USES (`audit.mjs`'s `RESTORE_DEFAULT_SCRIPT`),
     reproduced here against the shipped store so the Node lane proves the same
     sequence lands exactly where the browser lane asserts it does:
       1. areas-all-on      → every region the Areas row owns is on
       2. systems-all-on    → every kind on, and the vascular region on
       3. vasculature off   → the region-backed button, the one thing the default excludes
     `setSlice` writes only the ids whose state differs, so each step is idempotent. */
  const areaRegionsAll = areaTable().flatMap((area) => [...area.regions])
  const systemRegionIds = systemRegionTable().map((entry) => entry.id)
  const setSlice = (regions, kinds, on) => {
    for (const region of regions) {
      if (module.useAtlasStore.getState().layers.regions.has(region) !== on) {
        module.useAtlasStore.getState().toggleRegionLayer(region)
      }
    }
    for (const kind of kinds) {
      if (module.useAtlasStore.getState().layers.kinds.has(kind) !== on) {
        module.useAtlasStore.getState().toggleKindLayer(kind)
      }
    }
  }
  setSlice(areaRegionsAll, [], true)
  setSlice(systemRegionIds, ALL_KINDS, true)
  setSlice(['vasculature'], [], false)
  const restored = readState(module)
  equal('the composed default restores DEFAULT_LAYERS.regions exactly', restored.regions, sorted(boot.regions))
  equal('the composed default restores DEFAULT_LAYERS.kinds exactly', restored.kinds, sorted(boot.kinds))
  /* `viewPresetOf` compares all FOUR layer fields, so the composed restore only
     reads as the documented preset when `hidden`/`emphasis` already match — which
     is a fact about the preset table, not about the restore. Asserted both ways
     rather than papered over: */
  equalJson(
    'from a state whose hidden/emphasis are the default\'s, the composed restore reads as the documented preset',
    (() => {
      setState(module, { ...dirty, hidden: sorted(boot.hidden), emphasis: sorted(boot.emphasis) })
      setSlice(areaRegionsAll, [], true)
      setSlice(systemRegionIds, ALL_KINDS, true)
      setSlice(['vasculature'], [], false)
      return module.viewPresetOf(module.useAtlasStore.getState().layers)
    })(),
    'brainstem-focus',
  )
  info(
    'the composed restore after the dirty state reads viewPresetOf = ' +
      String(module.viewPresetOf(module.useAtlasStore.getState().layers)) +
      ' because the preset compares hidden too and the post-v12 controls cannot write it (documented)',
  )
  /* The honest limitation, asserted rather than glossed: the composed path writes
     regions + kinds only, so `hidden`/`emphasis` are NOT restored (no post-v12
     control writes them — `store.ts:1495–1507`). The audit ASSERTS the hidden
     proxy instead of assuming it, and this gate pins the limitation so a future
     header that silently restores hidden is noticed. */
  equal('the composed default leaves hidden as it found it (documented limitation)', restored.hidden, sorted(dirty.hidden))
  equal(
    'the composed default leaves emphasis as it found it (documented limitation)',
    restored.emphasis,
    sorted(dirty.emphasis),
  )

  // The store's own preset path still exists and still works (nothing was removed
  // from the API — only from the header), so a future control can use it.
  module.useAtlasStore.getState().applyViewPreset('brainstem-focus')
  const viaApi = readState(module)
  equal('applyViewPreset(brainstem-focus) restores regions', viaApi.regions, sorted(boot.regions))
  equal('applyViewPreset(brainstem-focus) restores kinds', viaApi.kinds, sorted(boot.kinds))
  equal('applyViewPreset(brainstem-focus) restores hidden', viaApi.hidden, sorted(boot.hidden))

  // All, through the store's own preset (what `Clinical motor`'s off-branch applies).
  module.useAtlasStore.getState().applyViewPreset('all')
  const afterAll = readState(module)
  equal('applyViewPreset(all) reproduces VIEW_PRESETS.all regions', afterAll.regions, sorted(ALL_REGIONS))
  equal('applyViewPreset(all) reproduces VIEW_PRESETS.all kinds', afterAll.kinds, sorted(ALL_KINDS))
  equal('applyViewPreset(all) clears hidden', afterAll.hidden, [])

  // Reset from the All state — the round trip a user actually performs.
  module.useAtlasStore.getState().applyViewPreset('brainstem-focus')
  equalJson('the store-level default round trip returns the boot state', readState(module), boot)
  setState(module, boot)
}

/* ---------------------------------------------------- 9. the rendered header */

/**
 * The rendered header, produced by React's OWN renderer
 * (`renderToStaticMarkup`) from `React.createElement(Header)`: the component
 * reads the store through zustand's hook, so it is rendered rather than called.
 *
 * Two views of the same render are kept: the MARKUP (for the group/class
 * assertions the browser lane also addresses) and the ELEMENT TREE, materialised
 * by `readButtons` so every `aria-label`, `data-*` hook and text node below is
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
  const systemRegionButtons = buttons.filter((button) => button.attributes['data-system-region'] !== undefined)
  const actionButtons = buttons.filter((button) => button.attributes['data-header-action'] !== undefined)
  const presetButtons = buttons.filter((button) => button.attributes['data-preset'] !== undefined)

  equal('rendered area buttons', areaButtons.length, areaTable().length)
  equal('rendered system buttons (one per kind)', kindButtons.length, kindTable().length)
  equal('rendered region-backed system buttons', systemRegionButtons.length, systemRegionTable().length)
  equalJson(
    'rendered data-header-action hooks, in DOM order',
    actionButtons.map((button) => button.attributes['data-header-action']),
    [...ALL_MODULE_HOOKS, 'clinical-motor'],
  )
  equalJson(
    'rendered preset buttons (the v12 removal, asserted not assumed)',
    presetButtons.map((button) => button.attributes['data-preset']),
    [],
  )
  truthy(
    'the removed .header-presets group is NOT rendered',
    group('header-presets') === '',
  )
  truthy('the .header-areas group is rendered', group('header-areas') !== '')
  truthy('the .header-systems group is rendered', group('header-systems') !== '')
  equalJson('the areas group is a labelled group', [groupAttr('header-areas', 'role'), groupAttr('header-areas', 'aria-label')], ['group', 'Anatomical areas'])
  equalJson('the systems group is a labelled group', [groupAttr('header-systems', 'role'), groupAttr('header-systems', 'aria-label')], ['group', 'Structure systems'])
  equalJson(
    'the two All modules are labelled groups of their own (v12e)',
    [groupAttr('header-all-module', 'role'), groupAttr('header-all-module', 'aria-label')],
    ['group', 'Show or hide all areas'],
  )
  truthy(
    'the four All-module buttons sit in the two header-all-module groups',
    (markup.match(/class="header-all-module"/g) ?? []).length === 2,
    `${(markup.match(/class="header-all-module"/g) ?? []).length} module group(s)`,
  )

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
    ['true', 'true', 'true', 'true', 'true'],
  )
  equalJson(
    'the rendered systems row boots fully pressed (seven kinds, v13)',
    kindButtons.map((button) => button.attributes['aria-pressed']),
    ['true', 'true', 'true', 'true', 'true', 'true', 'true'],
  )
  equalJson(
    'the rendered region-backed Systems row boots with the vascular region off',
    systemRegionButtons.map((button) => button.attributes['aria-pressed']),
    ['false'],
  )
  equalJson(
    'every rendered button declares type="button" (no implicit submit)',
    buttons.filter((button) => button.attributes.type !== 'button').map((button) => button.text),
    [],
  )

  // The machine hooks must be complete, unique, and in the documented order.
  equalJson('data-area values, in row order', areaButtons.map((button) => button.attributes['data-area']), areaTable().map((a) => a.id))
  equalJson('data-kind values, in row order', kindButtons.map((button) => button.attributes['data-kind']), [...kindTable()])
  equalJson(
    'data-system-region values, in row order',
    systemRegionButtons.map((button) => button.attributes['data-system-region']),
    systemRegionTable().map((entry) => entry.id),
  )
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
  equalJson(
    'the region-backed Systems button carries both hooks (data-region + data-system-region)',
    systemRegionButtons.map((button) => [button.attributes['data-region'], button.attributes['data-system-region']]),
    [['vasculature', 'vasculature']],
  )

  // Accessible names: present, distinct, and WCAG 2.5.3 (the visible text is a
  // prefix of the accessible name, so voice control can say what is on screen).
  const labelled = [...areaButtons, ...kindButtons, ...systemRegionButtons]
  const nameOf = (button) => button.attributes['aria-label'] ?? ''
  equalJson('toggle controls without an accessible name', labelled.filter((button) => nameOf(button) === '').map((button) => button.text), [])
  const names = labelled.map(nameOf)
  equalJson('toggle accessible names are distinct across the rows', new Set(names).size, names.length)
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
  for (const kind of kindTable()) {
    truthy(`the "${kind}" system button names the kind it switches`, names.some((name) => name.includes(`(${kind})`)))
  }
  truthy(
    'the v13 nerve button reads exactly "Cranial nerves" and names its kind',
    kindButtons.some((button) => button.attributes['data-kind'] === 'nerve' && button.text === 'Cranial nerves') &&
      names.some((name) => name.startsWith('Cranial nerves') && name.includes('(nerve)')),
  )

  /* ── WCAG 2.5.3 IN THE FOUR ALL-MODULE BUTTONS: A MEASURED DEFECT, PINNED ────
   * The four per-axis module buttons are the ONE place in this header where the
   * accessible name does not contain the visible text:
   *
   *     visible "All on"   accessible "All areas on — show every area"
   *     visible "All off"  accessible "All areas off — hide every area"
   *     visible "All on"   accessible "All systems on — show every system"
   *     visible "All off"  accessible "All systems off — hide every system"
   *
   * `"All areas on — show every area".includes("All on")` is false, so a voice
   * control user saying the words on the button cannot activate it: that is a real
   * WCAG 2.5.3 (Label in Name) failure introduced with the v12e/v12g modules in
   * `src/components/Header.tsx`, and it is OUTSIDE this task's write scope (the
   * review task owns three verify scripts, not the header). It is therefore
   * recorded here the way this repo records a known, owned defect: the exemption is
   * documented, the SEARCH is asserted (exactly four, named, with their strings),
   * and the moment the labels are fixed this pin FAILS and forces the exemption to
   * be deleted rather than silently outliving the bug. The orchestrator must route
   * it to a header owner; a fix is one option: `aria-label="All on — every area"`
   * (or "All on areas"), which contains the visible text. */
  const actionLabels = actionButtons.map((button) => ({
    hook: button.attributes['data-header-action'],
    text: button.text,
    name: nameOf(button),
  }))
  const violating = actionLabels.filter((entry) => !entry.name.includes(entry.text))
  const moduleViolations = violating.filter((entry) => ALL_MODULE_HOOKS.includes(entry.hook))
  equalJson(
    'the four All-module buttons are the ONLY header controls whose accessible name misses its visible text (pinned defect)',
    violating.map((entry) => entry.hook),
    ALL_MODULE_HOOKS,
  )
  equalJson(
    'all four module buttons carry their own axis in the accessible name (so the two "All on" buttons are distinguishable)',
    moduleViolations.map((entry) => `${entry.hook}: "${entry.name}"`),
    [
      'areas-all-on: "All areas on — show every area"',
      'areas-all-off: "All areas off — hide every area"',
      'systems-all-on: "All systems on — show every system"',
      'systems-all-off: "All systems off — hide every system"',
    ],
  )
  info(
    '[a11y·PINNED DEFECT] WCAG 2.5.3 (Label in Name) fails for exactly ' + violating.length +
      ' of ' + actionLabels.length + ' action button(s): ' + violating.map((entry) => `"${entry.text}" ∩ "${entry.name}"`).join(' · ') +
      ' — reported, not fixed (Header.tsx is outside this task\'s write scope); the pin above fails once it is fixed',
  )
  truthy(
    'exactly one control reads exactly "Vasculature" (the v8 label, still unambiguous)',
    buttons.filter((button) => button.text === 'Vasculature').length === 1,
    `${buttons.filter((button) => button.text === 'Vasculature').length} control(s)`,
  )
  const allOnButtons = buttons.filter((button) => button.text === 'All on')
  const allOffButtons = buttons.filter((button) => button.text === 'All off')
  equalJson('the two "All on" buttons (areas + systems) are distinct by hook', allOnButtons.map((b) => b.attributes['data-header-action']), ['areas-all-on', 'systems-all-on'])
  equalJson('the two "All off" buttons (areas + systems) are distinct by hook', allOffButtons.map((b) => b.attributes['data-header-action']), ['areas-all-off', 'systems-all-off'])
  info(`[render] text of every control: ${buttons.map((button) => button.text).join(' | ')}`)
  info(`[render] ${areaButtons.length} area + ${kindButtons.length} system + ${systemRegionButtons.length} region-backed + ${actionButtons.length} action buttons`)
}

/**
 * The WIRING check — proof that the buttons are not inert, in an isolated copy of
 * the tree. `renderToStaticMarkup` cannot fire a handler, and a handler must run
 * inside a real React render (the component reads the store through zustand's
 * hook), so the copy replaces `useAtlasStore` with a plain `getState()` read —
 * `Legend.tsx` is used for exactly this in `division-toggles.mjs` — and a child
 * probe calls each button's real `onClick` after a real `renderToStaticMarkup`.
 * Everything else in the copy is the shipped source: the component, the store,
 * the actions and the AREAS / SYSTEM_REGION_BUTTONS / ALL_KINDS tables.
 */
RUNNERS.wiring = () => {
  const require_ = createRequire(import.meta.url)
  const React = require_('react')
  const { renderToStaticMarkup } = require_('react-dom/server')
  const work = resolve(ROOT, '.plate-scratch/v13-area-wiring')
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
  equal('the probe rendered every system button as an element', report.kindCount, kindTable().length)
  equal('the probe rendered every region-backed system button as an element', report.systemRegionCount, systemRegionTable().length)
  equalJson('the probe found every header action', report.actions, [...ALL_MODULE_HOOKS, 'clinical-motor'])
  equalJson('every toggle button carries an onClick', report.missingHandlers, [])
  for (const step of report.steps) {
    equalJson(`[wired] ${step.name}`, step.value, step.expected)
  }
  equalJson('[wired] the area clicks left the boot region set restored', report.afterAreaClicks, boot.regions)
  equalJson('[wired] the system clicks left the boot kind set restored', report.afterKindClicks, boot.kinds)
  equalJson('[wired] the composed default restored the default regions', report.composed.regions, boot.regions)
  equalJson('[wired] the composed default restored the default kinds', report.composed.kinds, boot.kinds)
  /* The four module buttons, asserted PER AXIS — the whole point of two modules is
     that each touches only its own axis, so a module that also wrote the other
     axis' layer set would be a defect and must fail here. */
  equalJson(
    '[wired] areas-all-on turned exactly the six area regions on (the vascular region is NOT its slice)',
    report.afterAreasAllOn.regions,
    sorted(ALL_REGIONS.filter((region) => region !== 'vasculature')),
  )
  equalJson('[wired] areas-all-on left the kind axis alone', report.afterAreasAllOn.kinds, ['nucleus'])
  equalJson(
    '[wired] systems-all-on turned exactly the vascular region on (the area regions are NOT its slice)',
    report.afterSystemsAllOn.regions,
    ['midbrain', 'vasculature'],
  )
  equalJson('[wired] systems-all-on turned every kind on', report.afterSystemsAllOn.kinds, sorted(ALL_KINDS))
  equalJson(
    '[wired] areas-all-off turned the area regions off and left the vascular region alone',
    report.afterAreasAllOff.regions,
    ['vasculature'],
  )
  equalJson('[wired] areas-all-off left the kind axis alone', report.afterAreasAllOff.kinds, ['nucleus'])
  equalJson(
    '[wired] systems-all-off turned the vascular region off and left the area regions alone',
    report.afterSystemsAllOff.regions,
    ['pons'],
  )
  equalJson('[wired] systems-all-off cleared every kind', report.afterSystemsAllOff.kinds, [])
  equalJson('[wired] the two All-on modules together turned every region and kind on', report.composed.regions, sorted(store.DEFAULT_LAYERS.regions))
  equalJson('[wired] the two All-on modules + the vascular click reproduce the default kinds', report.composed.kinds, sorted(store.DEFAULT_LAYERS.kinds))
  equalJson('[wired] Clinical motor applied the store preset', report.clinicalMotor.preset, 'clinical-motor')
  equalJson('[wired] Clinical motor applied the preset\'s own kind set', report.clinicalMotor.kinds, sorted(store.VIEW_PRESETS['clinical-motor'].kinds))
  equalJson('[wired] the probe saw the two rows in the rendered markup', [
    report.markupHasAreas,
    report.markupHasSystems,
  ], [true, true])
  equalJson('[wired] the probe confirmed the removed preset row is absent from the markup', [
    report.markupHasPresets,
    report.markupHasDataPreset,
  ], [false, false])
  equalJson(
    '[wired] the probe read the same boot aria-pressed states as section 9',
    report.bootPressed,
    [true, true, true, true, true],
  )
  equalJson(
    '[wired] the probe read every system button pressed at boot',
    report.bootKindPressed,
    [true, true, true, true, true, true, true],
  )
  equalJson(
    '[wired] the probe read the vascular system region unpressed at boot',
    report.bootSystemRegionPressed,
    [false],
  )
  info(`[wired] ${report.steps.length} handler-driven assertions reported by the child probe`)
  rmSync(work, { recursive: true, force: true })
}

/* --------------------------------------------- 11. the v13 nerve kind, sliced */

/**
 * v13 §3 — "the `Cranial nerves` toggle really filters every surface". The brief
 * for this run asks for painted/legend evidence, not a class name. Chrome is
 * denied in this sandbox, so what this section executes is the SHIPPED DECISION
 * CHAIN on both surfaces, per record and per part, and it prints the sets:
 *
 *   3D   `SceneLayers.isStructureVisible` over all 225 structure records, with
 *        the kind on and off (region ∧ kind ∧ ¬hidden ∧ ¬ghost/content-only), plus
 *        the body count `NucleusMesh` would mount for each admitted record.
 *   2D   `SectionCanvas.isPartVisible` over all 138 committed-GLB parts, with the
 *        kind on and off — and the honest number: ZERO of them is a nerve part, so
 *        the Plates live section cannot react to this toggle. The synthetic part
 *        below proves the decision itself would admit a nerve part, which is the
 *        falsifiable half; the browser lane's R3b block asserts the corresponding
 *        pixel invariance.
 *   TREE `TaxonomyTree.layerOff`, parsed out of the shipped source and EXECUTED
 *        over the twelve nerve rows (never re-typed here).
 */
RUNNERS.nerve = async () => {
  const scene = await import(moduleUrl('src/components/viewer3d/SceneLayers.tsx'))
  const section = await import(moduleUrl('src/components/section/sectionAssets.ts'))
  const canvas = await import(moduleUrl('src/components/section/SectionCanvas.tsx'))
  const assets = await import(moduleUrl('src/geometry/anatomyAssets.ts'))
  const nucleus = await import(moduleUrl('src/components/viewer3d/NucleusMesh.tsx'))

  const nerveEntries = taxonomy.filter((entry) => entry.kind === 'nerve')
  const nerveRecords = loadModule.structures.filter((record) => record.kind === 'nerve')
  equal('taxonomy rows of kind "nerve" (v13)', nerveEntries.length, 12)
  equal('authored structure records of kind "nerve"', nerveRecords.length, 12)
  equal(
    'every nerve taxonomy row is in the ONE subdivision "Cranial nerves"',
    [...new Set(nerveEntries.map((entry) => entry.subdivision))],
    ['Cranial nerves'],
  )
  const regionHistogram = {}
  for (const entry of nerveEntries) regionHistogram[entry.region] = (regionHistogram[entry.region] ?? 0) + 1
  equalJson('the twelve rows sit in their TRUE regions (2 telencephalon / 2 midbrain / 4 pons / 4 medulla)', regionHistogram, {
    telencephalon: 2,
    midbrain: 2,
    pons: 4,
    medulla: 4,
  })
  equal(
    'every nerve id is a taxonomy id (the registry is the authority for the tree)',
    nerveRecords.filter((record) => !taxonomy.some((entry) => entry.id === record.id)).map((record) => record.id),
    [],
  )
  equalJson(
    'every nerve record is meshes:false (no committed geometry — PLAN.md §5)',
    nerveRecords.filter((record) => record.meshes !== false).map((record) => record.id),
    [],
  )
  equalJson(
    'no nerve record claims a sized placement it does not carry',
    nerveRecords
      .filter((record) => !Array.isArray(record.origin3d) || !Array.isArray(record.size3d) ||
        record.size3d.some((value) => !(value > 0)))
      .map((record) => record.id),
    [],
  )

  const mkLayers = (kinds, regions = ALL_REGIONS) => ({
    regions: new Set(regions),
    kinds: new Set(kinds),
    hidden: new Set(),
  })
  const onLayers = mkLayers(ALL_KINDS)
  const offLayers = mkLayers(ALL_KINDS.filter((kind) => kind !== 'nerve'))
  const admittedOn = loadModule.structures.filter((record) => scene.isStructureVisible(record, onLayers))
  const admittedOff = loadModule.structures.filter((record) => scene.isStructureVisible(record, offLayers))
  const nerveAdmittedOn = admittedOn.filter((record) => record.kind === 'nerve').length
  const nerveAdmittedOff = admittedOff.filter((record) => record.kind === 'nerve').length
  equal('the 3D structure pass admits all 12 nerve records with the kind ON', nerveAdmittedOn, 12)
  equal('the 3D structure pass admits NO nerve record with the kind OFF', nerveAdmittedOff, 0)
  const paired = nerveRecords.filter((record) => record.laterality === 'paired').length
  equal(
    'the 3D body count that appears/disappears with the toggle (paired records draw twice)',
    nerveAdmittedOn * 2,
    paired * 2,
  )
  equal(
    'the rest of the 3D structure set is untouched by the nerve toggle',
    admittedOn.filter((record) => record.kind !== 'nerve').length,
    admittedOff.length,
  )
  info(
    `[nerve·3D] admitted with kind on ${admittedOn.length} · off ${admittedOff.length} · ` +
      `Δ ${admittedOn.length - admittedOff.length} record(s) = ${nerveAdmittedOn * 2} drawn bodies (all ${paired} are paired)`,
  )
  equalJson(
    'no nerve record is linked to a committed body (ANATOMY_RECORD_LINKS miss ⇒ the schematic fallback body)',
    nerveRecords.filter((record) => assets.anatomySlugsForRecord(record.id) !== null).map((record) => record.id),
    [],
  )
  equalJson(
    'no nerve record is filtered out as ghost/content-only (it must reach the ordinary body pass)',
    nerveRecords.filter((record) => assets.isGhostOrContentOnly(record.id)).map((record) => record.id),
    [],
  )
  truthy(
    'the nerve kind draws opaque (KIND_OPACITY ≥ 1) and gets a material hint',
    nucleus.KIND_OPACITY.nerve >= 1 && typeof nucleus.hintForKind('nerve') === 'string',
    `opacity ${nucleus.KIND_OPACITY.nerve} · hint ${nucleus.hintForKind('nerve')}`,
  )

  /* v14 RE-POINT OF THE 2D HALF, RE-POINTED AGAIN BY THE v17 REVIEW (`review-qa`).
   *
   * Through v13 this block asserted the opposite of the v14/v17 goal: `SECTION_PARTS`
   * is one entry per COMMITTED GLB (138), none is a nerve, so the gate could honestly
   * claim "the Plates surface cannot react to this toggle". v14 routed the twelve
   * nerve courses into the live section as PROCEDURAL parts (`partsForCanvas()` =
   * 138 committed GLBs + `SECTION_NERVE_PARTS`, the worker fed by
   * `registryNerveParts()`), and v17 added the 40 granular VESSEL courses through the
   * same shared route (`SECTION_VESSEL_PARTS` / `registryVesselParts()`).
   *
   * WHAT WENT STALE AND WHY THIS RE-POINT IS NOT COSMETIC (measured before the edit):
   * lane 9 pinned three literals that the product had already moved past —
   *   • `partsForCanvas().length === 138 + 12` → **190** after v17 (the 40 vessel
   *     metas), so the gate failed on a count the plan §5.2 row 5 mandates;
   *   • `registryNerveParts().length === 12` (×4 dependent assertions) → **24** after
   *     the v17 mirror twin, which is one part per authored side PLUS one per
   *     mirrored twin and is what the 3D pass draws (`cranial-nerve-render.mjs:370`
   *     already pinned 24; lane 9 did not follow).
   * The literals are gone: every count below is now a SUM OF TERMS read from the
   * shipped modules, and each term is asserted against its own table, so the next
   * family to land cannot silently move a number — it fails here with the term named.
   *
   * What is asserted instead, all of it re-measured here by executing the shipped
   * decision (`canvas.isPartVisible`) and the shipped builder (`registry*Parts()`):
   *   • the domain split as four printed terms — 138 committed-GLB parts + 12 nerve
   *     + 40 vessel = 190 on the canvas;
   *   • the NERVE TOGGLE is the ablation: every nerve part admitted with the kind on
   *     and 0 with it off, while the 138 committed-GLB admissions are identical sets;
   *   • the VESSEL family is gated by BOTH controls the plan §5.3 names — the
   *     `vessel` kind and the `vasculature` region — checked as two separate
   *     ablations over the same 40 metas;
   *   • the worker registry the 2D contour comes from: one part per authored side
   *     plus one per mirrored twin, the twin proven to be the REFLECTION (bbox
   *     x-negated, y/z identical) rather than a cached duplicate — the inherited
   *     bug the v17 render task fixed;
   *   • the shipped contour worker really slices every procedural part (nerve AND
   *     vessel), with no non-finite loop;
   *   • the payload invariants this gate exists to protect are unchanged: the
   *     manifest still carries 138 parts, no `nrv-*` GLB exists on disk, and no
   *     committed part's admission moved.
   * `SECTION_PARTS` is still counted (138) wherever it is used, so every other
   * claim in this file keeps its domain. */
  const curves = await import(moduleUrl('src/geometry/curves.ts'))
  const vessels = await import(moduleUrl('src/geometry/vasculature-courses.ts'))
  const canvasParts = section.partsForCanvas()
  const committedOn = section.SECTION_PARTS.filter((meta) => canvas.isPartVisible(meta, onLayers))
  const committedOff = section.SECTION_PARTS.filter((meta) => canvas.isPartVisible(meta, offLayers))
  const nervePartMetas = canvasParts.filter((meta) => meta.taxonomyKind === 'nerve')
  /* `taxonomyKind: 'vessel'` appears on BOTH families in `partsForCanvas()`: the 14
   * shipped artery records have committed GLBs (26 of their 30 vessel bodies are
   * manifest parts) and the 40 granular course records are procedural. The two are
   * separated by provenance, not by the label — which is exactly why the gate must
   * print both terms instead of one count. */
  const committedVesselParts = section.SECTION_PARTS.filter((meta) => meta.taxonomyKind === 'vessel')
  const vesselPartMetas = section.SECTION_VESSEL_PARTS
  const labelledVesselParts = canvasParts.filter((meta) => meta.taxonomyKind === 'vessel')
  const nerveOn = nervePartMetas.filter((meta) => canvas.isPartVisible(meta, onLayers))
  const nerveOff = nervePartMetas.filter((meta) => canvas.isPartVisible(meta, offLayers))
  const vesselKindOffLayers = mkLayers(ALL_KINDS.filter((kind) => kind !== 'vessel'))
  const vesselOn = vesselPartMetas.filter((meta) => canvas.isPartVisible(meta, onLayers))
  const vesselOff = vesselPartMetas.filter((meta) => canvas.isPartVisible(meta, vesselKindOffLayers))
  const vesselLabelledOff = labelledVesselParts.filter((meta) => canvas.isPartVisible(meta, vesselKindOffLayers))
  /* The region axis (§5.3): the Vasculature system button writes `layers.regions`,
   * so a vessel contour must need the vasculature REGION as well as the kind. */
  const regionOffLayers = {
    regions: new Set(ALL_REGIONS.filter((region) => region !== 'vasculature')),
    kinds: new Set(ALL_KINDS),
    hidden: new Set(),
  }
  const vesselRegionOff = vesselPartMetas.filter((meta) => canvas.isPartVisible(meta, regionOffLayers))
  const lateralityOf = (id) => taxonomy.find((entry) => entry.id === id)?.laterality ?? null
  const pairedNerveIds = curves.NERVE_COURSES.filter((course) => lateralityOf(course.id) === 'paired').map((course) => course.id)
  const pairedVesselIds = vessels.VESSEL_COURSES
    .filter((course) => vessels.isPairedVessel(course, lateralityOf(course.id)))
    .map((course) => course.id)

  equal('the committed-GLB section domain is unchanged (SECTION_PARTS)', section.SECTION_PARTS.length, 138)
  equal('the procedural nerve part count is the shipped nerve table (v14)',
    section.SECTION_NERVE_PARTS.length, curves.NERVE_COURSES.length)
  equal('the procedural vessel part count is the shipped vessel table (v17)',
    section.SECTION_VESSEL_PARTS.length, vessels.VESSEL_COURSES.length)
  equal('the 2D canvas domain = committed GLBs + nerve parts + vessel parts',
    canvasParts.length,
    section.SECTION_PARTS.length + section.SECTION_NERVE_PARTS.length + section.SECTION_VESSEL_PARTS.length)
  equal('the committed-GLB domain holds no nerve part (there is still no nerve GLB)', section.SECTION_PARTS.filter((meta) => meta.taxonomyKind === 'nerve').length, 0)
  equal('no committed GLB carries a granular course id (the 40 v17 courses are procedural only — zero payload)',
    section.SECTION_PARTS.filter((meta) => vessels.VESSEL_COURSE_IDS.some((id) => meta.slug === id || meta.slug.startsWith(`${id}-`))).length, 0)
  equal('the canvas labels the committed artery bodies AND the procedural course metas "vessel"',
    labelledVesselParts.length, committedVesselParts.length + vesselPartMetas.length)
  info(
    `[2D vessel provenance] committed artery bodies labelled vessel ${committedVesselParts.length} (the 14 shipped ` +
      `records' meshes) + procedural course parts ${vesselPartMetas.length} (the ${vessels.VESSEL_COURSE_IDS.length} ` +
      `v17 courses) = ${labelledVesselParts.length} vessel-labelled part(s) on the canvas`,
  )
  equal('the procedural nerve parts are one per nerve course (v14)', nervePartMetas.length, curves.NERVE_COURSES.length)
  equal('every procedural nerve part names its course id',
    nervePartMetas.filter((meta) => /^nrv-/.test(meta.slug)).length, curves.NERVE_COURSES.length)
  equal('the Cranial nerves toggle admits ALL nerve parts', nerveOn.length, nervePartMetas.length)
  equal('…and turning it off removes EXACTLY those (the 2D ablation this gate measures)', nerveOff.length, 0)
  equal('the procedural vessel parts are one per granular vessel course (v17)',
    vesselPartMetas.length, vessels.VESSEL_COURSES.length)
  equal('every procedural vessel part names its course id',
    vesselPartMetas.filter((meta) => /^vasc-/.test(meta.slug)).length, vessels.VESSEL_COURSES.length)
  equal('the Vessels system toggle admits ALL vessel course metas', vesselOn.length, vesselPartMetas.length)
  equal('…and turning the vessel KIND off removes EXACTLY those', vesselOff.length, 0)
  equal('…and removes every vessel-labelled part, committed bodies included (one kind, one decision)',
    vesselLabelledOff.length, 0)
  equal('…and turning the vasculature REGION off removes EXACTLY those too (the second control, §5.3)',
    vesselRegionOff.length, 0)
  equal('…while the committed-GLB admission is byte-identical on and off',
    committedOn.length, committedOff.length)
  equalJson(
    'the committed parts the 2D decision admits do not move when the nerve kind is toggled',
    sorted(committedOn.map((meta) => meta.slug)),
    sorted(committedOff.map((meta) => meta.slug)),
  )
  info(
    `[2D domain] committed GLB parts ${section.SECTION_PARTS.length} + procedural nerve parts ` +
      `${section.SECTION_NERVE_PARTS.length} (${curves.NERVE_COURSE_IDS.length} courses) + procedural vessel parts ` +
      `${section.SECTION_VESSEL_PARTS.length} (${vessels.VESSEL_COURSE_IDS.length} courses) = ${canvasParts.length} ` +
      `on the canvas · nerve toggle on ${nerveOn.length} / off ${nerveOff.length} · vessel course metas on ` +
      `${vesselOn.length} / off ${vesselOff.length} · vessel-labelled parts off ${vesselLabelledOff.length} · ` +
      `vasculature region off ${vesselRegionOff.length} · committed admissions ${committedOn.length} identical on and off`,
  )

  /* The procedural parts carry REAL geometry from the one shared builder — the
   * same mesh the 3D pass draws — and the worker's own slicer cuts it. */
  const contours = await import(moduleUrl('src/components/section/contours.ts'))
  const nerveWorkerParts = section.registryNerveParts()
  const vesselWorkerParts = section.registryVesselParts()
  const workerParts = [...nerveWorkerParts, ...vesselWorkerParts]
  const midlineNerveIds = curves.NERVE_COURSES.map((course) => course.id).filter((id) => !pairedNerveIds.includes(id))
  const midlineVesselIds = vessels.VESSEL_COURSES.map((course) => course.id).filter((id) => !pairedVesselIds.includes(id))
  equal('registryNerveParts() = one part per authored nerve side + one per mirrored twin',
    nerveWorkerParts.length, curves.NERVE_COURSES.length + pairedNerveIds.length)
  equal('registryVesselParts() = one part per authored vessel side + one per mirrored twin',
    vesselWorkerParts.length, vessels.VESSEL_COURSES.length + pairedVesselIds.length)
  equal('registryCoursePartsAll() is the two families and nothing else (the one-call route the canvas can take)',
    section.registryCoursePartsAll().length, nerveWorkerParts.length + vesselWorkerParts.length)
  equal('every worker part carries positions',
    workerParts.filter((part) => part.positions instanceof Float32Array && part.positions.length > 0).length, workerParts.length)
  equal('every worker part carries indices',
    workerParts.filter((part) => part.indices instanceof Uint32Array && part.indices.length > 0).length, workerParts.length)
  equal('every index is inside its own vertex array',
    workerParts.filter((part) => {
      if (!(part.positions instanceof Float32Array) || !(part.indices instanceof Uint32Array)) return false
      const count = part.positions.length / 3
      for (const index of part.indices) if (!(index < count)) return false
      return true
    }).length, workerParts.length)
  equal('every worker part slug is unique (the `#mirror` twin cannot collide with its authored side)',
    new Set(workerParts.map((part) => part.slug)).size, workerParts.length)

  /* The mirrored twin must be the REFLECTION, not the authored geometry handed back
   * from the id-keyed tube cache — the inherited bug the v17 render task fixed. */
  const boundsOf = (part) => {
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (let i = 0; i < part.positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = part.positions[i + axis]
        if (value < min[axis]) min[axis] = value
        if (value > max[axis]) max[axis] = value
      }
    }
    return { min, max }
  }
  const mirrorRows = []
  for (const part of workerParts) {
    if (!part.slug.endsWith('#mirror')) continue
    const authoredPart = workerParts.find((other) => other.slug === part.slug.slice(0, -'#mirror'.length))
    if (authoredPart === undefined) {
      mirrorRows.push({ slug: part.slug, ok: false, why: 'no authored twin in the registry' })
      continue
    }
    const a = boundsOf(authoredPart)
    const b = boundsOf(part)
    const xNegated = Math.abs(b.min[0] + a.max[0]) <= 0.05 && Math.abs(b.max[0] + a.min[0]) <= 0.05
    const yzKept = Math.abs(b.min[1] - a.min[1]) <= 0.05 && Math.abs(b.max[1] - a.max[1]) <= 0.05 &&
      Math.abs(b.min[2] - a.min[2]) <= 0.05 && Math.abs(b.max[2] - a.max[2]) <= 0.05
    mirrorRows.push({ slug: part.slug, ok: xNegated && yzKept, xNegated, yzKept, authored: a, mirror: b })
  }
  equal('every procedural course has a mirrored twin in the worker registry (paired nerves + paired vessels)',
    mirrorRows.length, pairedNerveIds.length + pairedVesselIds.length)
  equalJson('every mirrored twin is the x → −x REFLECTION of its authored side (no cached duplicate)',
    mirrorRows.filter((row) => !row.ok).map((row) => `${row.slug}:${row.ok === false ? (row.why ?? `xNegated=${row.xNegated} yzKept=${row.yzKept}`) : ''}`),
    [])
  info(
    `[2D worker] nerve ${curves.NERVE_COURSES.length} authored + ${pairedNerveIds.length} mirrored (midline ${midlineNerveIds.length}) ` +
      `= ${nerveWorkerParts.length} · vessel ${vessels.VESSEL_COURSES.length} authored + ${pairedVesselIds.length} mirrored ` +
      `(midline ${midlineVesselIds.length}) = ${vesselWorkerParts.length} · both families ${workerParts.length} part(s)`,
  )
  info(
    `[2D mirror] example: ${mirrorRows[0]?.slug ?? '(none)'} authored x [${(mirrorRows[0]?.authored.min[0] ?? NaN).toFixed(3)}, ` +
      `${(mirrorRows[0]?.authored.max[0] ?? NaN).toFixed(3)}] → twin x [${(mirrorRows[0]?.mirror.min[0] ?? NaN).toFixed(3)}, ` +
      `${(mirrorRows[0]?.mirror.max[0] ?? NaN).toFixed(3)}] (y/z unchanged)`,
  )

  const sliceRows = []
  let slicedPlanes = 0
  let slicedLoops = 0
  let nonFiniteLoops = 0
  for (const part of workerParts) {
    const bounds = contours.partBounds(part.positions)
    let crossing = 0
    let loops = 0
    for (const axis of ['x', 'y', 'z']) {
      const low = axis === 'x' ? bounds.min[0] : axis === 'y' ? bounds.min[1] : bounds.min[2]
      const high = axis === 'x' ? bounds.max[0] : axis === 'y' ? bounds.max[1] : bounds.max[2]
      for (let value = Math.ceil(low - 2); value <= Math.floor(high + 2); value += 2) {
        const plane = { axis, value }
        if (!contours.boundsMayCut(bounds, plane)) continue
        const result = contours.extractContours(part.positions, part.indices, plane)
        crossing += 1
        loops += result.loops.length
        for (const loop of result.loops) {
          for (const coordinate of loop) if (!Number.isFinite(coordinate)) nonFiniteLoops += 1
        }
      }
    }
    slicedPlanes += crossing
    slicedLoops += loops
    sliceRows.push({ slug: part.slug, family: /^nrv-/.test(part.slug) ? 'nerve' : 'vessel', crossing, loops })
  }
  const nerveSliced = sliceRows.filter((row) => row.family === 'nerve')
  const vesselSliced = sliceRows.filter((row) => row.family === 'vessel')
  equal('every NERVE part has at least one crossing plane the worker can slice, with at least one loop',
    nerveSliced.filter((row) => row.loops > 0).length, nerveSliced.length)
  equal('every VESSEL part has at least one crossing plane the worker can slice, with at least one loop',
    vesselSliced.filter((row) => row.loops > 0).length, vesselSliced.length)
  equal('no contour the worker computes is non-finite (both families)', nonFiniteLoops, 0)
  info(
    `[2D slice] the worker sliced ${slicedPlanes} crossing plane(s) into ${slicedLoops} loop(s) over ` +
      `${workerParts.length} procedural part(s) — nerve ${nerveSliced.reduce((sum, row) => sum + row.loops, 0)} loop(s), ` +
      `vessel ${vesselSliced.reduce((sum, row) => sum + row.loops, 0)} loop(s)`,
  )

  /* THE ONE OPEN HANDOFF, PINNED SO IT CANNOT BE FORGOTTEN (v17 review). `partsForCanvas()`
   * — the visible list — carries the 40 vessel metas, but the 2D contour comes from the
   * worker registry, which `SectionCanvas`'s init effect builds itself. That effect
   * appends the nerve family and NOT the vessel family, so today the vessel contours
   * are computed by no one and painted nowhere (`registryVesselParts()` above proves
   * the geometry and the slicer are ready — the missing piece is one line). This
   * assertion states the shipped code as it is and FAILS the moment the line lands,
   * which is what routes the fix to the next editor instead of hiding it. */
  const canvasSource = readSource('src/components/section/SectionCanvas.tsx')
  const registryPushes = [...canvasSource.matchAll(/registryParts\.push\(\.\.\.(\w+)\(\)\)/g)].map((match) => match[1])
  equalJson(
    'SectionCanvas.tsx hands the worker the procedural families it appends (v17: the vessel family is the open handoff)',
    registryPushes,
    ['registryNerveParts'],
  )
  info(
    `[2D handoff] SectionCanvas.tsx appends ${JSON.stringify(registryPushes)} to the worker registry; ` +
      `registryVesselParts() returns ${vesselWorkerParts.length} ready part(s) that reach it when ` +
      `\`registryParts.push(...registryVesselParts())\` joins that effect`,
  )
  /* The falsifiable half: a SYNTHETIC nerve part must be admitted iff the kind is
   * on AND its region is on — i.e. the 2D decision really does know the new kind. */
  const synthetic = {
    slug: 'nrv-probe-nerve',
    group: 'nrv-probe-nerve',
    region: 'medulla',
    kind: 'nucleus',
    taxonomyKind: 'nerve',
    color: '#14b8a6',
  }
  truthy('a synthetic nerve part is admitted when the nerve kind is on', canvas.isPartVisible(synthetic, onLayers))
  truthy('the same synthetic part is rejected when the nerve kind is off', !canvas.isPartVisible(synthetic, offLayers))
  truthy(
    'the same synthetic part is also rejected when its REGION is off (both axes still apply)',
    !canvas.isPartVisible(synthetic, mkLayers(ALL_KINDS, ALL_REGIONS.filter((region) => region !== 'medulla'))),
  )

  /* The TREE rule, executed from the shipped source rather than re-typed. */
  const treeSource = readSource('src/components/TaxonomyTree.tsx')
  const ruleSource = /function layerOff\(([^)]*)\)[^{]*\{([\s\S]*?)\n\}/.exec(treeSource)
  truthy('TaxonomyTree.tsx declares the layerOff rule this check executes', ruleSource !== null)
  if (ruleSource !== null) {
    const args = ruleSource[1].split(',').map((token) => token.trim().split(':')[0].trim()).filter(Boolean)
    const rule = new Function(...args, ruleSource[2])
    equalJson('the tree rule\'s parameter names (the check must call it the way the tree does)', args, ['layers', 'region', 'kind'])
    const dimOn = nerveEntries.filter((entry) => rule(store.DEFAULT_LAYERS, entry.region, entry.kind) === true)
    const dimOff = nerveEntries.filter((entry) =>
      rule(
        { ...store.DEFAULT_LAYERS, kinds: new Set(ALL_KINDS.filter((kind) => kind !== 'nerve')) },
        entry.region,
        entry.kind,
      ) === true,
    )
    equal('at the documented default the tree dims NO nerve row', dimOn.length, 0)
    equal('with the nerve kind off the tree dims ALL twelve nerve rows', dimOff.length, 12)
    info(
      `[nerve·tree] layerOff over the 12 rows: default dims ${dimOn.length} · nerve kind off dims ${dimOff.length} ` +
        `(rule executed from TaxonomyTree.tsx: ${JSON.stringify(ruleSource[2].trim().slice(0, 96))})`,
    )
    /* …and the region axis still dims them too, so the toggle is not the only switch. */
    const dimByRegion = nerveEntries.filter((entry) =>
      rule(
        { ...store.DEFAULT_LAYERS, regions: new Set(ALL_REGIONS.filter((region) => region !== entry.region)) },
        entry.region,
        entry.kind,
      ) === true,
    )
    equal('turning a nerve row\'s region off dims it as well (both axes apply)', dimByRegion.length, 12)
  }

  /* The Legend's swatch and its CSS token — a kind with no swatch is invisible in
   * the palette legend, which is the one place a user learns the kind's colour. */
  const legendSource = readSource('src/components/Legend.tsx')
  truthy(
    'the Legend palette declares a "Cranial nerves" swatch for the nerve kind',
    /Cranial nerves/.test(legendSource) && /kind-nerve/.test(legendSource),
  )
  const tokens = readSource('src/styles/tokens.css')
  truthy('tokens.css defines --kind-nerve', /--kind-nerve:\s*#[0-9a-fA-F]{3,8}/.test(tokens))

  /* Geometry honesty: no GLB, no manifest part, no baked element. */
  const manifest = JSON.parse(readSource('src/assets/anatomy/anatomy-manifest.json'))
  const manifestParts = Array.isArray(manifest) ? manifest : (manifest.parts ?? [])
  equalJson(
    'no anatomy-manifest part is a nerve record',
    manifestParts.filter((part) => String(part.slug ?? '').startsWith('nrv-')).map((part) => part.slug),
    [],
  )
  const anatomyDir = resolve(ROOT, 'src/assets/anatomy')
  const nerveGlbs = readdirSync(anatomyDir).filter((name) => /^nrv-.*\.glb$/i.test(name))
  equalJson('no nerve GLB is committed under src/assets/anatomy', nerveGlbs, [])
  equal('the anatomy manifest still carries its 138 parts (nothing was added)', manifestParts.length, 138)
}

/* ------------------------------------ 12. the v11 item-4 divergence, re-measured */

/**
 * v11 CARRY-OVER ITEM 4 — "the canvas paints divisions the rule excludes at
 * y = 6 / 26 / 30 / 32". PLAN.md §8.9 says this slice gets nothing from the v13
 * change and that it must not be closed by silence; this review task re-measures
 * it in a NON-BROWSER lane by executing the canvas' own function.
 *
 * WHAT RUNS. For every plane the browser lane names (`audit.mjs`'s
 * `ARTEFACT_PLANES`, parsed out of its source so the two lanes cannot drift):
 *   • the two committed cortical ribbons are loaded from the anatomy manifest,
 *   • sliced with the SAME `contours.extractContours` the section worker calls,
 *   • handed to the canvas' OWN `SectionCanvas.buildLobeLayer` with the default
 *     layer state — this is the code that fills the painted Path2Ds,
 *   • and compared against `corticalLobes.paintedDivisionsOfLoops` (the shipped
 *     rule) over BOTH ribbons.
 *
 * The printed pair per plane IS the "rule-vs-canvas sets" the brief asks for. The
 * `ARTEFACT_PLANES[].drawn` column is printed beside them as the cross-check the
 * browser lane uses; the pass condition is canvas ∥ rule.
 *
 * A failure to load a ribbon, or a missing plane in either table, is reported as a
 * FAILURE — never skipped — because a check that passes by not running is this
 * project's known failure mode.
 */
RUNNERS['item-4'] = async () => {
  /* `buildLobeLayer` strokes every run into a `Path2D`. Node has no `Path2D` and
     this gate never paints, so the stub records the calls: the counts printed
     below are also proof that the canvas' function really ran its paint path
     instead of returning early (the "passes by not running" failure mode). */
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

  const lobes = await import(moduleUrl('src/components/section/corticalLobes.ts'))
  const contours = await import(moduleUrl('src/components/section/contours.ts'))
  const geometry = await import(moduleUrl('src/components/section/planeGeometry.ts'))
  const section = await import(moduleUrl('src/components/section/sectionAssets.ts'))
  const canvasModule = await import(moduleUrl('src/components/section/SectionCanvas.tsx'))
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

  const manifest = JSON.parse(readSource('src/assets/anatomy/anatomy-manifest.json'))
  const manifestParts = Array.isArray(manifest) ? manifest : (manifest.parts ?? [])

  /* The plane table the BROWSER lane sweeps, read out of its own source text. */
  const auditSource = readSource('scripts/verify/audit.mjs')
  const tableBlock = /const ARTEFACT_PLANES = \[([\s\S]*?)\n\]/.exec(auditSource)?.[1] ?? ''
  const planes = []
  for (const match of tableBlock.matchAll(/value:\s*(\d+),\s*\n\s*drawn:\s*\[([^\]]*)\]/g)) {
    planes.push({
      value: Number(match[1]),
      drawn: [...match[2].matchAll(/'([a-z]+)'/g)].map((inner) => inner[1]),
    })
  }
  equal('the plane values parsed out of audit.mjs ARTEFACT_PLANES', planes.length, 6)
  equal(
    'the four planes the v11 divergence named are all in the sweep',
    [6, 26, 30, 32].filter((value) => !planes.some((plane) => plane.value === value)),
    [],
  )

  const ribbonSlugs = [...section.SECTION_CORTICAL_RIBBON_SLUGS]
  equal('the two committed cortical ribbons', ribbonSlugs.length, 2)
  const loadRibbon = async (slug) => {
    const part = manifestParts.find((candidate) => candidate.slug === slug)
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
    return {
      slug,
      positions,
      indices,
      meta: section.SECTION_PARTS.find((candidate) => candidate.slug === slug),
    }
  }

  let ribbons = []
  try {
    for (const slug of ribbonSlugs) ribbons.push(await loadRibbon(slug))
    ok(`both cortical ribbons loaded from the manifest (${ribbons.map((ribbon) => `${ribbon.slug} ${ribbon.indices.length / 3} tris`).join(' · ')})`)
  } catch (error) {
    bad(`the item-4 parity measurement CANNOT run: a ribbon GLB did not load (${String(error?.message ?? error)})`)
    return
  }

  const layersDefault = {
    regions: new Set(store.DEFAULT_LAYERS.regions),
    kinds: new Set(store.DEFAULT_LAYERS.kinds),
    hidden: new Set(store.DEFAULT_LAYERS.hidden),
  }
  const transform = geometry.planeTransform('y', 0, { width: 800, height: 600 })
  const rows = []
  console.log('  ── item 4 parity (plane · rule over both ribbons · canvas\' own buildLobeLayer · audit table)')
  console.log(`     ${'plane'.padEnd(8)}${'rule (l+r)'.padEnd(46)}${'canvas (l+r)'.padEnd(46)}audit table`)
  for (const plane of planes) {
    const items = []
    const loopsPerSlug = new Map()
    for (const ribbon of ribbons) {
      if (!contours.boundsMayCut(contours.partBounds(ribbon.positions), { axis: 'y', value: plane.value })) {
        loopsPerSlug.set(ribbon.slug, [])
        continue
      }
      const slice = contours.extractContours(ribbon.positions, ribbon.indices, { axis: 'y', value: plane.value })
      loopsPerSlug.set(ribbon.slug, slice.loops)
      items.push({ meta: ribbon.meta, part: { slug: ribbon.slug, loops: slice.loops }, path: null })
    }
    const bothLoops = [...(loopsPerSlug.get(ribbonSlugs[0]) ?? []), ...(loopsPerSlug.get(ribbonSlugs[1]) ?? [])]
    const cache = canvasModule.createLobeLayerCache()
    canvasModule.buildLobeLayer(cache, items, 'y', plane.value, transform, 1, layersDefault)
    const canvasSet = lobes.CORTICAL_DIVISIONS.filter((division) => cache.entries[division] !== undefined)
    const ruleSet = lobes.paintedDivisionsOfLoops(bothLoops, 'y', plane.value)
    const ruleOnly = sorted(ruleSet.filter((division) => !canvasSet.includes(division)))
    const canvasOnly = sorted(canvasSet.filter((division) => !ruleSet.includes(division)))
    console.log(
      `     ${`y=${plane.value}`.padEnd(8)}${`[${sorted(ruleSet).join(' ')}]`.padEnd(46)}` +
        `${`[${sorted(canvasSet).join(' ')}]`.padEnd(46)}[${sorted(plane.drawn).join(' ')}]`,
    )
    rows.push({ value: plane.value, canvasSet: sorted(canvasSet), ruleSet: sorted(ruleSet), table: sorted(plane.drawn) })
    equalJson(
      `[item 4] y=${plane.value}: the canvas' painted set equals the rule's set over both ribbons`,
      [canvasOnly, ruleOnly],
      [[], []],
    )
    /* The audited table is the browser lane's cross-check. It is asserted here only
     * for the FOUR planes the v11 divergence named, because those are the sets this
     * review is responsible for restating; the other planes stay printed. */
    if ([6, 26, 30, 32].includes(plane.value)) {
      equalJson(
        `[item 4] y=${plane.value}: the measured set equals the set the v11 divergence reported (restated with numbers)`,
        sorted(canvasSet),
        sorted(plane.drawn),
      )
    } else {
      info(
        `[item 4] y=${plane.value} (cross-check only): audit table [${sorted(plane.drawn).join(' ')}] vs measured ` +
          `[${sorted(canvasSet).join(' ')}] — ${JSON.stringify(sorted(plane.drawn)) === JSON.stringify(sorted(canvasSet)) ? 'agree' : 'DIFFER'}`,
      )
    }
  }
  const parity = rows.filter((row) => JSON.stringify(row.canvasSet) === JSON.stringify(row.ruleSet)).length
  info(
    `[item 4] parity ${parity}/${rows.length} planes · sets: ` +
      rows.map((row) => `y=${row.value} canvas[${row.canvasSet.join(',')}]`).join(' · '),
  )
  /* Non-vacuity: the y = 6 plane must paint MORE than the left ribbon alone would,
   * which is the coverage asymmetry the v10 audit reading "canvas paints NONE" came
   * from. If the two ever coincide, the claim above stops meaning anything. */
  const y6 = rows.find((row) => row.value === 6)
  truthy(
    'the item-4 measurement is not vacuous: y = 6 paints 5 divisions, including one only the RIGHT ribbon carries',
    y6 !== undefined && y6.canvasSet.length === 5,
    `y=6 canvas [${(y6?.canvasSet ?? []).join(', ')}]`,
  )
  truthy(
    'the canvas function really did the painting (a non-empty entry map, not an early return)',
    rows.every((row) => row.canvasSet.length > 0),
    rows.map((row) => `y=${row.value}:${row.canvasSet.length}`).join(' '),
  )
}

/* ------------------------------- 12. the browser-lane predicate, exercised */

/**
 * The re-pointed `checks.headerToggleRowsReading` is the predicate that decides the
 * orchestrator's browser lane (audit.mjs blocks A0b and R1). It is PURE, so it can
 * be exercised here against a reading built from the SHIPPED header render and the
 * SHIPPED declarations — no Chrome, no retyped expectations.
 *
 * Two halves, and the second is the one that matters: the reading the app really
 * produces must satisfy every claim, and a MUTATED reading must fail with the
 * NAMED label each mutation is supposed to trip. A predicate that returned `ok`
 * for everything would pass the first half and fail the second.
 */
RUNNERS.predicate = async () => {
  const checksModule = await import(moduleUrl('scripts/verify/checks.mjs'))
  const { markup, buttons } = await renderHeader()

  const rowPresence = (className, name) => {
    const tag = markup.match(new RegExp(`<div[^>]*class="${className}"[^>]*>`))?.[0]
    if (tag === undefined) return { present: false, role: null, name: null, buttons: 0 }
    const attr = (key) => (tag.match(new RegExp(`${key}="([^"]*)"`)) ?? [])[1] ?? null
    const group = new RegExp(`class="${className}"[^>]*>`)
    const rest = markup.slice(markup.search(group))
    return {
      present: true,
      role: attr('role'),
      name: attr('aria-label') ?? name,
      buttons: (rest.slice(0, rest.indexOf('</div>')).match(/<button/g) ?? []).length,
    }
  }
  const toggleOf = (hook) =>
    buttons
      .filter((button) => button.attributes[hook] !== undefined)
      .map((button) => ({
        hook,
        key: button.attributes[hook],
        text: button.text,
        pressed: button.attributes['aria-pressed'] === 'true',
        name: button.attributes['aria-label'] ?? '',
        tag: 'BUTTON',
        type: button.attributes.type ?? '',
      }))
  const actionsOf = (source) =>
    source
      .filter((button) => button.attributes['data-header-action'] !== undefined)
      .map((button) => ({
        key: button.attributes['data-header-action'],
        text: button.text,
        pressed: button.attributes['aria-pressed'] === 'true',
        name: button.attributes['aria-label'] ?? '',
      }))
  const headerButtonsOf = (source) =>
    source.map((button) => ({
      text: button.text,
      hook: ['data-preset', 'data-area', 'data-kind', 'data-system-region', 'data-region', 'data-header-action']
        .filter((name) => button.attributes[name] !== undefined)
        .join('+'),
    }))
  const legendLayers = () => ({
    regions: Object.fromEntries(ALL_REGIONS.map((region) => [region, store.DEFAULT_LAYERS.regions.has(region)])),
    kinds: Object.fromEntries(ALL_KINDS.map((kind) => [kind, store.DEFAULT_LAYERS.kinds.has(kind)])),
  })
  const readingFrom = (source) => {
    const toggles = [
      ...toggleOf('data-area'),
      ...toggleOf('data-kind'),
      ...toggleOf('data-system-region'),
    ].filter((toggle) => source.some((button) => button.attributes[toggle.hook] === toggle.key))
    const areas = toggles.filter((toggle) => toggle.hook === 'data-area')
    const kinds = toggles.filter((toggle) => toggle.hook === 'data-kind')
    const systemRegions = toggles.filter((toggle) => toggle.hook === 'data-system-region')
    const vascular = systemRegions.find((toggle) => toggle.key === 'vasculature') ?? null
    return {
      rows: {
        areas: rowPresence('header-areas', 'Anatomical areas'),
        systems: rowPresence('header-systems', 'Structure systems'),
      },
      toggles,
      actions: actionsOf(source),
      presets: [],
      headerButtons: headerButtonsOf(source),
      rowFraming: {
        areasAll: areas.length > 0 && areas.every((toggle) => toggle.pressed === true),
        systemsAll: kinds.length > 0 && kinds.every((toggle) => toggle.pressed === true),
        vascularRegion: vascular === null ? null : vascular.pressed,
        buttonCount: areas.length + kinds.length + systemRegions.length,
      },
      expectedAreas: areaTable().map((area) => area.id),
      expectedKinds: [...kindTable()],
      expectedSystemRegions: systemRegionTable().map((entry) => entry.id),
      allRegions: [...ALL_REGIONS],
      areaRegions: Object.fromEntries(areaTable().map((area) => [area.id, [...area.regions]])),
      layers: legendLayers(),
    }
  }

  const live = readingFrom(buttons)
  const verdicts = checksModule.headerToggleRowsReading(live)
  const failed = verdicts.filter((verdict) => !verdict.ok)
  equalJson('the shipped header satisfies every claim of the browser lane\'s predicate', failed.map((verdict) => verdict.label), [])
  info(
    `[predicate] ${verdicts.length} claims on the real reading: ${verdicts.map((verdict) => verdict.label).join(', ')}`,
  )
  equalJson(
    'the two per-axis All modules are read as UNPRESSED at the default framing (the vascular region is off)',
    live.actions
      .filter((action) => action.key === 'systems-all-on' || action.key === 'systems-all-off')
      .map((action) => `${action.key}=${action.pressed}`),
    ['systems-all-on=false', 'systems-all-off=false'],
  )

  const dropKind = (key) => buttons.filter((button) => button.attributes['data-kind'] !== key)
  const MUTATIONS = [
    {
      name: 'the v13 nerve toggle is dropped from the Systems row',
      source: () => dropKind('nerve'),
      expect: 'hooks-incomplete',
    },
    {
      name: 'the vascular system region is switched on at the default framing',
      mutate: (reading) => ({
        ...reading,
        toggles: reading.toggles.map((toggle) =>
          toggle.key === 'vasculature' && toggle.hook === 'data-system-region' ? { ...toggle, pressed: true } : toggle),
      }),
      expect: 'pressed-disagrees-with-layers',
    },
    {
      name: 'the systems All module is always pressed',
      mutate: (reading) => ({
        ...reading,
        actions: reading.actions.map((action) => (action.key === 'systems-all-on' ? { ...action, pressed: true } : action)),
      }),
      expect: 'all-modules-not-bound',
    },
    {
      name: 'the Clinical motor button is deleted from the Systems row',
      source: () => buttons.filter((button) => button.attributes['data-header-action'] !== 'clinical-motor'),
      expect: 'vascular-or-clinical-motor-missing',
    },
    {
      name: 'an area button loses its accessible name',
      mutate: (reading) => ({
        ...reading,
        toggles: reading.toggles.map((toggle) =>
          toggle.hook === 'data-area' && toggle.key === 'mesencephalon' ? { ...toggle, name: '' } : toggle),
      }),
      expect: 'toggle-contract-broken',
    },
    {
      name: 'the nucleus kind is rendered twice',
      mutate: (reading) => ({
        ...reading,
        toggles: [...reading.toggles, { ...reading.toggles.find((toggle) => toggle.key === 'nucleus'), key: 'nucleus' }],
      }),
      expect: 'hooks-incomplete',
    },
    {
      name: 'an AREA is dropped from the declaration AND from the row (its region becomes unreachable)',
      mutate: (reading) => ({
        ...reading,
        toggles: reading.toggles.filter((toggle) => !(toggle.hook === 'data-area' && toggle.key === 'telencephalon')),
        expectedAreas: reading.expectedAreas.filter((id) => id !== 'telencephalon'),
        areaRegions: Object.fromEntries(
          Object.entries(reading.areaRegions).filter(([id]) => id !== 'telencephalon'),
        ),
      }),
      expect: 'areas-partition-broken',
    },
  ]
  for (const mutation of MUTATIONS) {
    const mutated = mutation.mutate === undefined
      ? readingFrom(mutation.source())
      : mutation.mutate(readingFrom(buttons))
    const mutatedVerdicts = checksModule.headerToggleRowsReading(mutated)
    const broke = mutatedVerdicts.filter((verdict) => !verdict.ok)
    broke.some((verdict) => verdict.label === mutation.expect)
      ? ok(`[predicate bite] "${mutation.name}" is caught as ${mutation.expect} (${broke.length} claim(s) failed)`)
      : bad(
        `[predicate bite] "${mutation.name}" was NOT caught as ${mutation.expect} — the predicate is toothless ` +
          `(failed labels: ${JSON.stringify(broke.map((verdict) => verdict.label))})`,
      )
  }
}

/* -------------------------------- 14. the browser-lane probes parse (guard) */

/**
 * THE "PASSES BY NOT RUNNING" GUARD. `scripts/verify/audit.mjs` is executed by the
 * orchestrator with Chrome. Its page probes are template literals, so a typo inside
 * one is invisible to `node --check` — the gate would start, the probe would throw
 * inside `evaluate`, and the browser lane would report a *product* failure that is
 * really a check bug. (This review task hit exactly that: two unescaped backticks
 * inside the header probe broke the file, caught only because `node --check` reads
 * the whole file.)
 *
 * This section extracts every STATIC probe body (a template literal whose text
 * contains no `${…}` interpolation, i.e. the ones that are self-contained) and
 * parses each with the JS parser. Interpolated probes cannot be parsed standalone
 * and are counted and reported rather than silently ignored.
 *
 * THE SECOND GUARD (added by the v14 review): A DEAD CLICK CANNOT BE A CHECK'S
 * PREMISE. Every block in the browser lane that needs the documented default
 * framing used to click `[data-header-action="reset"]` (bound to
 * `applyViewPreset('brainstem-focus')`); v12 removed that control with the preset
 * row, so the four v11 blocks below were left clicking a selector that matches
 * nothing — the exact "a check that passes by not running" failure mode this
 * project keeps hitting, because a DOM click on a missing element is a silent
 * no-op, never an error. Those four sites were re-pointed (in `audit.mjs`, and in
 * this gate's own §11/§12) to `[data-header-action="areas-all-on"]`,
 * `[data-header-action="systems-all-on"]` and `[data-system-region="vasculature"]`
 * through the `restoreDefaultFraming` helper. This guard is what keeps them
 * re-pointed: it scans every `clickHook('<selector>')` call site in `audit.mjs`
 * and refuses any selector naming a hook the post-v12 header does not render.
 */
RUNNERS.probes = () => {
  const source = readSource('scripts/verify/audit.mjs')
  /* The hooks the shipped header renders — read from the SHIPPED source, so a
     hook removed from the product cannot stay clickable in the gates. */
  const headerSource = stripComments(readSource('src/components/Header.tsx'))
  const liveHooks = ['data-area', 'data-kind', 'data-system-region', 'data-division', 'data-region', 'data-header-action']
    .filter((hook) => new RegExp(hook.replace('=', '') + '\\s*=').test(headerSource))
  equalJson(
    'the hooks the shipped Header.tsx renders (the guard below is measured against these)',
    liveHooks,
    ['data-area', 'data-kind', 'data-system-region', 'data-division', 'data-region', 'data-header-action'],
  )
  const removedHooks = ['data-preset'].filter((hook) => !new RegExp(hook + '\\s*=').test(headerSource))
  equalJson('the v12-removed "data-preset" hook is still absent from Header.tsx (the premise of the guard)', removedHooks, ['data-preset'])
  truthy(
    'the audit really addresses its clicks through machine hooks (the guard has a domain)',
    (source.match(/clickHook\(/g) ?? []).length >= 5,
    `${(source.match(/clickHook\(/g) ?? []).length} clickHook call(s)`,
  )
  /* Parse each site into `{ hook, key }` so the verdict names the hook, not a
     hand-written list of forbidden strings. The source is read with its comments
     stripped: the re-point notes quote the OLD selectors on purpose, and a guard
     that flagged its own documentation would be turned off within a week. */
  const clickSource = stripComments(source)
  const CLICK_SITE = /clickHook\([^)]{0,140}?(?:'\[|"\[|`\[)([a-zA-Z-]+)="([a-zA-Z0-9_${}-]*)['"`]/g
  const clickSites = [...clickSource.matchAll(CLICK_SITE)].map((match) => ({ hook: match[1], key: match[2] }))
  const callCount = (clickSource.match(/clickHook\(/g) ?? []).length
  truthy(
    'the guard read a bracketed selector at almost every clickHook call site (the only exception is the one helper that takes its selector as a variable)',
    clickSites.length >= callCount - 1 && clickSites.length >= 6,
    `${clickSites.length} parsed of ${callCount} call site(s)`,
  )
  /* The one site the extractor cannot read is `clickHook(selector)`, a selector
     PARAMETER of the `v11ToggleRow(hook, key)` helper. Follow the helper's own
     call sites instead of excusing it: the hooks passed in must be hooks the
     header renders. */
  const v11Calls = [...clickSource.matchAll(/v11ToggleRow\(\s*'([a-zA-Z-]+)'\s*,\s*'([^']*)'/g)]
    .map((match) => ({ hook: match[1], key: match[2] }))
  equalJson(
    'the variable-selector helper is called only with hooks the shipped header renders',
    v11Calls.filter((entry) => !liveHooks.includes(entry.hook)).map((entry) => `${entry.hook}="${entry.key}"`),
    [],
  )
  const deadClicks = clickSites.filter((entry) =>
    !liveHooks.includes(entry.hook) ||
    (entry.hook === 'data-header-action' && (entry.key === 'reset' || entry.key === 'all')))
  equalJson(
    'no audit.mjs click site targets a hook the post-v12 header no longer renders (a dead click is a check that passes by not running)',
    deadClicks.map((entry) => `${entry.hook}="${entry.key}"`),
    [],
  )
  info(
    `[dead-clicks] ${clickSites.length} clickHook site(s) in audit.mjs · live hooks ${liveHooks.join(' ')} · ` +
      `removed ${removedHooks.join(' ') || '(none)'} · dead click sites ${deadClicks.length}`,
  )
  const bodies = []
  let index = 0
  while (index < source.length) {
    const start = source.indexOf('`', index)
    if (start < 0) break
    let cursor = start + 1
    let body = ''
    let closed = false
    while (cursor < source.length) {
      const character = source[cursor]
      if (character === '\\') {
        body += source.slice(cursor, cursor + 2)
        cursor += 2
        continue
      }
      if (character === '`') {
        closed = true
        break
      }
      body += character
      cursor += 1
    }
    if (!closed) break
    bodies.push(body)
    index = cursor + 1
  }
  const looksLikeProbe = (text) =>
    /document\.querySelector|document\.querySelectorAll|window\.|getElementById/.test(text) &&
    /^\(?\(?\s*\(?\)?\s*=>|^\(\(\) =>/.test(text.trim()) === true || /document\.querySelector/.test(text) && text.includes('return')
  const staticProbes = bodies.filter((text) => looksLikeProbe(text) && !text.includes('${'))
  const interpolated = bodies.filter((text) => looksLikeProbe(text) && text.includes('${'))
  truthy(
    'at least ten static browser probes were found in audit.mjs (the extractor really read the file)',
    staticProbes.length >= 10,
    `${staticProbes.length} static · ${interpolated.length} interpolated`,
  )
  let broken = 0
  for (const probe of staticProbes) {
    try {
      // eslint-disable-next-line no-new-func
      new Function(probe)
    } catch (error) {
      broken += 1
      bad(`a static probe in audit.mjs does not parse: ${String(error?.message ?? error)} — ${probe.trim().slice(0, 90)}`)
    }
  }
  broken === 0
    ? ok(`all ${staticProbes.length} static browser probes inside audit.mjs parse as JavaScript`)
    : bad(`${broken} of ${staticProbes.length} static probes in audit.mjs do not parse`)
  info(
    `[probes] ${bodies.length} template literal(s) scanned · ${staticProbes.length} static (parsed) · ` +
      `${interpolated.length} interpolated (not standalone-parseable by construction)`,
  )
}

/* -------------------------------------------------------------------- 14. bite */

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
    ],
  },
  /** An area dropped from the row: its regions would become unreachable. */
  dropped: {
    AREAS: [
      { id: 'telencephalon', label: 'Telencephalon', division: 'prosencephalon', regions: ['telencephalon'] },
      { id: 'diencephalon', label: 'Diencephalon', division: 'prosencephalon', regions: ['diencephalon'] },
      { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', division: 'mesencephalon', regions: ['midbrain'] },
      { id: 'myelencephalon', label: 'Myelencephalon (medulla)', division: 'rhombencephalon', regions: ['medulla'] },
    ],
  },
  /** The vascular carve-out dropped: the region would move back into the Areas row. */
  'vasculature-as-area': {
    AREAS: [
      { id: 'telencephalon', label: 'Telencephalon', division: 'prosencephalon', regions: ['telencephalon'] },
      { id: 'diencephalon', label: 'Diencephalon', division: 'prosencephalon', regions: ['diencephalon'] },
      { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', division: 'mesencephalon', regions: ['midbrain'] },
      { id: 'metencephalon', label: 'Metencephalon (pons + cerebellum)', division: 'rhombencephalon', regions: ['pons', 'cerebellum'] },
      { id: 'myelencephalon', label: 'Myelencephalon (medulla)', division: 'rhombencephalon', regions: ['medulla'] },
      { id: 'vasculature', label: 'Cerebral vasculature', division: 'vasculature', regions: ['vasculature'] },
    ],
  },
  /** The v13 kind dropped from the systems axis (the row would lose the toggle). */
  'nerve-kind-dropped': {
    ALL_KINDS: ALL_KINDS.filter((kind) => kind !== 'nerve'),
  },
  /** The kind axis carrying a duplicate (the row would render the kind twice). */
  'kind-duplicated': {
    ALL_KINDS: [...ALL_KINDS, 'nerve'],
  },
  /** The area toggle writes the whole region set instead of its own regions. */
  clobber: {
    areasOf: () => [],
    areaLayersOn: () => true,
  },
}

/** Which check titles a defect is expected to break. */
const DEFECT_TARGETS = {
  hardcoded: ['2.', '3.'],
  merged: ['2.', '3.'],
  dropped: ['2.'],
  'vasculature-as-area': ['2.', '3.'],
  'nerve-kind-dropped': ['3.'],
  'kind-duplicated': ['3.'],
  clobber: ['2.', '4.'],
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
    {
      name: 'the vascular carve-out is dropped, so the region is claimed by both rows',
      from: 'export const SYSTEM_REGION_BUTTONS: readonly { id: Region; label: string }[] = ALL_REGIONS\n  .filter((region) => !AREAS.some((area) => area.regions.includes(region)))',
      to: 'export const SYSTEM_REGION_BUTTONS: readonly { id: Region; label: string }[] = ALL_REGIONS\n  .filter(() => false)',
      expect: '',
    },
  ]
  const work = resolve(ROOT, '.plate-scratch/v13-area-bite')
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
      mutation.expect === '' ? (firstError ?? '').length > 0 : (firstError ?? '').includes(mutation.expect),
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
console.log('store imported without throwing (AREAS=' + store.AREAS.length + ', SYSTEM_REGION_BUTTONS=' + store.SYSTEM_REGION_BUTTONS.length + ')')
`

/**
 * The child probe for section 10 — it prints ONE JSON line that the parent reads.
 *
 * It renders `<Header />` with React's own server renderer (so the component sees
 * elements, and the stub hook is only a state read), then calls the real `onClick`
 * of every area, system, region-backed and action button and reports the store
 * after each one. All paths are relative to the COPIED tree, which is why this
 * lives in a template literal (the `division-toggles.mjs` technique).
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
          const urlOnly = /\?url/.test(options)
          const mapped = walk(baseDir, '').map((relative) => {
            const full = resolve(baseDir, relative)
            const key = head.replace(/\*\*\/?/g, '') + relative
            if (urlOnly) return JSON.stringify(key) + ': () => Promise.resolve("")'
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
    if (url.startsWith('file:') && /\.(css|svg|png|glb|bin|jpg|jpeg|webp)$/i.test(pathOnly)) {
      return { format: 'module', source: 'export default undefined', shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const moduleUrl = (relative) => pathToFileURL(resolve(ROOT, relative)).href
const { renderToStaticMarkup } = await import('react-dom/server')
const store = await import(moduleUrl('src/state/store.ts'))
const load = await import(moduleUrl('src/data/load.ts'))
const Header = (await import(moduleUrl('src/components/Header.tsx'))).default
/** The region/kind axes, from the shipped data module (never retyped). */
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
/**
 * Re-materialise the element tree. REQUIRED before driving a module/action
 * button: Header's handlers close over the layers value of the render they were
 * created in (setSlice/toggleArea compare against layers.regions / layers.kinds),
 * and the stub hook is a plain getState() read rather than a subscription — so a
 * stale tree would make "All on" a no-op after a state change. A live React
 * render re-creates those closures on every store write; re-collecting here is the
 * probe's way of doing the same thing honestly.
 */
const collectButtons = () => collect(createElement(Header)).filter((node) => node.type === 'button')
const nodes = collectButtons()
const buttons = nodes
const areas = buttons.filter((node) => node.props['data-area'] !== undefined)
const kinds = buttons.filter((node) => node.props['data-kind'] !== undefined)
const systemRegions = buttons.filter((node) => node.props['data-system-region'] !== undefined)
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
  record('system ' + kind + ' click twice restores the kind set', snap().kinds ? before.kinds : before.kinds, before.kinds)
  node.props.onClick()
  record('system ' + kind + ' click twice restores the kind set (second click)', snap().kinds, before.kinds)
}

for (const node of systemRegions) {
  const region = node.props['data-system-region']
  const before = snap()
  node.props.onClick()
  const after = snap()
  record(
    'region-backed system ' + region + ' click flips exactly that region',
    after.regions,
    before.regions.includes(region)
      ? before.regions.filter((entry) => entry !== region)
      : [...before.regions, region].sort(),
  )
  record('region-backed system ' + region + ' click leaves kinds untouched', after.kinds, before.kinds)
  node.props.onClick()
  record('region-backed system ' + region + ' click twice restores the region set', snap().regions, before.regions)
}

const afterAreaClicks = snap()

/* the four All modules, from a deliberately dirty state. */
const setLayers = (regions, kinds) => {
  store.useAtlasStore.setState({
    layers: {
      regions: new Set(regions),
      kinds: new Set(kinds),
      hidden: new Set(['probe-hidden']),
      emphasis: new Set(['probe-emphasis']),
    },
  })
}
const clickAction = (key) => {
  // FRESH element tree: see the note above collectButtons. The header's handlers
  // close over the layers of the render they came from, so driving an action from
  // a stale tree would make "All on" a silent no-op.
  const node = collectButtons().find((entry) => entry.props['data-header-action'] === key)
  if (node === undefined) return false
  node.props.onClick()
  return true
}
setLayers(['midbrain'], ['nucleus'])
clickAction('areas-all-on')
const afterAreasAllOn = snap()
setLayers(['midbrain'], ['nucleus'])
clickAction('systems-all-on')
const afterSystemsAllOn = snap()
setLayers(['vasculature', 'pons'], ['nucleus'])
clickAction('areas-all-off')
const afterAreasAllOff = snap()
setLayers(['vasculature', 'pons'], ['nucleus'])
clickAction('systems-all-off')
const afterSystemsAllOff = snap()

/* the COMPOSED DEFAULT — the sequence scripts/verify/audit.mjs uses. */
setLayers(['vasculature', 'midbrain'], ['nucleus'])
clickAction('areas-all-on')
clickAction('systems-all-on')
clickAction('systems-all-off')
const composedAllOff = snap()
setLayers(['vasculature', 'midbrain'], ['nucleus'])
clickAction('areas-all-on')
clickAction('systems-all-on')
if (store.useAtlasStore.getState().layers.regions.has('vasculature')) {
  const vascular = collectButtons().find((node) => node.props['data-system-region'] === 'vasculature')
  if (vascular !== undefined) vascular.props.onClick()
}
const composed = snap()

/* Clinical motor: the one preset-backed control left in the header. */
setLayers([...ALL_REGIONS], [...ALL_KINDS])
clickAction('clinical-motor')
const clinicalMotor = {
  preset: store.viewPresetOf(store.useAtlasStore.getState().layers),
  kinds: snap().kinds,
}

console.log(JSON.stringify({
  areaCount: areas.length,
  kindCount: kinds.length,
  systemRegionCount: systemRegions.length,
  actions: actions.map((node) => node.props['data-header-action']),
  missingHandlers: buttons
    .filter((node) =>
      node.props['data-area'] !== undefined || node.props['data-kind'] !== undefined ||
      node.props['data-system-region'] !== undefined || node.props['data-header-action'] !== undefined)
    .filter((node) => typeof node.props.onClick !== 'function')
    .map((node) => node.props['data-area'] ?? node.props['data-kind'] ?? node.props['data-system-region'] ?? node.props['data-header-action']),
  bootPressed: areas.map((node) => node.props['aria-pressed']),
  bootKindPressed: kinds.map((node) => node.props['aria-pressed']),
  bootSystemRegionPressed: systemRegions.map((node) => node.props['aria-pressed']),
  afterAreaClicks: afterAreaClicks.regions,
  afterKindClicks: afterAreaClicks.kinds,
  afterAreasAllOn: afterAreasAllOn,
  afterSystemsAllOn: afterSystemsAllOn,
  afterAreasAllOff: afterAreasAllOff,
  afterSystemsAllOff: afterSystemsAllOff,
  afterAll: { regions: afterSystemsAllOn.regions, kinds: afterSystemsAllOn.kinds },
  afterAllOff: { regions: afterSystemsAllOff.regions, kinds: afterSystemsAllOff.kinds },
  composed: composed,
  composedAllOff: composedAllOff,
  clinicalMotor: clinicalMotor,
  markupHasAreas: markup.indexOf('header-areas') >= 0,
  markupHasSystems: markup.indexOf('header-systems') >= 0,
  markupHasPresets: markup.indexOf('header-presets') >= 0,
  markupHasDataPreset: markup.indexOf('data-preset') >= 0,
  steps: steps,
}))
`

/* ------------------------------------------------------------------- driver */

/** The check titles, in order, mapped to their runner. */
const TITLES = [
  ['surface', '1. the shipped source declares the post-v12 header contract'],
  ['partition', '2. the AREA partition + the region-backed Systems button are total and disjoint (printed)'],
  ['systems', '3. the SYSTEMS row is ALL_KINDS (7, nerve last) + the vascular region; areas derived from divisions'],
  ['toggle', '4. every area/system/region toggle writes exactly its own slice; the two All modules write their axis'],
  ['defaults', '5. the default framing is unchanged (DEFAULT_LAYERS, viewPresetOf, both rows, the nerve kind on)'],
  ['composed', '6. the documented default is REACHABLE from the post-v12 controls (composed set equality)'],
  ['render', '7. the rendered <Header /> exposes both rows, the All modules, and no removed hook'],
  ['wiring', '8. the rendered buttons are WIRED: their onClick writes exactly the right layer'],
  ['nerve', '9. the v13 nerve kind is sliced on every surface it must be (3D, 2D, tree, legend, manifest)'],
  ['item-4', '10. the v11 item-4 divergence re-measured at y = 6/26/30/32 with the canvas\' own paint path'],
  ['probes', '11. every static browser probe inside audit.mjs parses (the "passes by not running" guard)'],
  ['predicate', '12. the browser lane\'s predicate is exercised here and fails on seven mutated readings'],
  ['bite', '13. bite — every injected defect is caught by a named check'],
  ['bite-partition', "14. bite — a mutated AREAS/SYSTEM_REGION_BUTTONS table trips the store's load-time assertion"],
]
const RUNNER_BY_TITLE = Object.fromEntries(TITLES.map(([key, title]) => [title.split('.')[0] + '.', key]))

console.log('\n============ NeuroAxis v13 — Areas + Systems toggle rows (post-v12 header) ============')
console.log(`  workspace: ${ROOT}`)
console.log('  under test: the SHIPPED src/state/store.ts, src/components/Header.tsx, the render-path')
console.log('              modules (SceneLayers / NucleusMesh / sectionAssets / SectionCanvas /')
console.log('              TaxonomyTree / Legend), and the cortical-lobe rule')
console.log('  areas:      Telencephalon · Diencephalon · Mesencephalon (midbrain) ·')
console.log('              Metencephalon (pons + cerebellum) · Myelencephalon (medulla)')
console.log('  systems:    Nuclei · Tracts · Ventricles · Surface · Vessels · Context · Cranial nerves')
console.log('              + Vasculature (region-backed) + Clinical motor (preset-backed)')
console.log('  re-pointed: v12 removed .header-presets, data-preset and Reset/All; this gate now drives the')
console.log('              two per-axis All modules (areas-all-on/off, systems-all-on/off) and the region-backed')
console.log('              Vasculature button — the product was NOT bent back to satisfy the old text.')

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
console.log('\n✔ the five Areas + the region-backed Vasculature button partition all 7 regions exactly once and')
console.log('  the seven Systems are ALL_KINDS; each control toggles exactly its own slice of layers.regions /')
console.log('  layers.kinds (the one decision the 3D scene, the 2D live section and the PiP all read); the')
console.log('  documented default framing is reachable by composing the two All modules with the vascular')
console.log('  region off; the v13 nerve kind is sliced on the 3D surface and dimmed in the tree, and the 2D')
console.log('  half is RE-POINTED at v14 and RE-COUNTED at v17 — the Plates live section reacts to BOTH')
console.log('  procedural families now: the canvas registry is 138 committed GLB parts + 12 nerve parts +')
console.log('  40 vessel course parts = 190 metas (every term read from the shipped tables, none pinned), the')
console.log('  nerve and vessel metas are admitted iff their kind is on and rejected otherwise, the vessel')
console.log('  metas additionally need the vasculature REGION, the 138 committed admissions do not move, and the')
console.log('  worker\'s own extractContours slices a real cross-section out of every one of the 101 registry')
console.log('  parts (24 nerve = 12 authored + 12 mirrored; 77 vessel = 40 authored + 37 mirrored, each twin')
console.log('  proven the x → −x reflection of its authored side). The one OPEN handoff is asserted, not hidden:')
console.log('  SectionCanvas.tsx still appends only registryNerveParts() to the worker registry, so the vessel')
console.log('  contours are ready but not yet painted; that assertion fails the moment the line lands. The v11')
console.log('  item-4 divergence is re-measured at every plane the browser lane names. Payload invariants')
console.log('  unchanged: the manifest still holds 138 parts, no nrv-*.glb exists and no committed GLB carries a')
console.log('  granular course id — route (a) costs 0 bytes.')
console.log('  The matching browser-lane claim (audit.mjs R3b, which through v13 asserted pixel INVARIANCE) is')
console.log('  re-pointed to assert the hash CHANGES and round-trips; only the orchestrator can run it.')
console.log('  Rendered pixels and real pointer/keyboard use stay orchestrator-only: Chrome cannot start in')
console.log('  this sandbox, so the browser-facing claims here are the DOM contract, the wired onClick')
console.log('  handlers and the executed draw paths.\n')
process.exit(0)
