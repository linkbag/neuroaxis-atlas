/**
 * nerve-kind.mjs — the committed check for v13 §2: the `nerve` kind exists
 * platform-wide and the Systems row surfaces it as a **Cranial nerves** toggle.
 *
 * WHAT THIS PROVES. It imports the SHIPPED modules — `src/data/load.ts`,
 * `src/components/Header.tsx`, `src/components/Legend.tsx`,
 * `src/components/KindGlyph.tsx`, `src/components/viewer3d/NucleusMesh.tsx`,
 * `src/components/viewer3d/SceneLayers.tsx` and `src/state/store.ts` — through the
 * same in-process TS/TSX loader `area-toggles.mjs` and `division-toggles.mjs`
 * use (no copy, no re-typed table), renders the real components with React's own
 * `renderToStaticMarkup` AND with a live dispatcher harness (see below), CALLS
 * the real `onClick` handlers, and reads the two SOURCE files that cannot be
 * imported (`scripts/validate-data.mjs` runs on import; `src/types.ts` is
 * types-only), so every claim below runs:
 *
 *   1  the kind is declared in every declaration site and the sites AGREE:
 *      `load.ALL_KINDS` ≡ the validator's `KINDS` ≡ the `Kind` union ≡ the key
 *      sets of `KIND_GLYPH` / `KIND_OPACITY` (the exhaustive maps tsc guards) —
 *      seven kinds, `nerve` appended last;
 *   2  the SLUG contract accepts the new `nrv-` prefix and still rejects the four
 *      near-misses (`cn3-oculomotor`, `nrv-CN3`, `nerve-cn3`, `nrv-`), and the
 *      validator's prefix→kind rule resolves every `nrv-*` row to `kind: nerve`
 *      (0 contradictions over the whole 248-row registry);
 *   3  the rendered `<Header />` Systems row carries ONE button per `ALL_KINDS`
 *      entry, in order, each with `data-kind`, `aria-pressed`, a non-empty
 *      unique label, and a label that is a PREFIX of its accessible name
 *      (WCAG 2.5.3) — `nerve` among them, labelled exactly "Cranial nerves",
 *      inside the `Structure systems` group;
 *   4  the rendered `<Legend />` has a palette swatch for every kind (the plain
 *      array tsc cannot check) whose token is DEFINED in `src/styles/tokens.css`,
 *      plus the `ALL_KINDS` checkbox row for every kind — `nerve` checked at boot;
 *   5  toggling the `nerve` kind removes exactly `nerve` from `layers.kinds` and
 *      adds it back, leaving `regions`/`hidden`/`emphasis` untouched — driven by
 *      CALLING the `onClick` the rendered button really carries, then asserting
 *      the live re-render flips exactly that one `aria-pressed`, with the other
 *      six buttons' markup and the round-tripped header byte-identical to boot;
 *   6  a nerve record is drawn by the ordinary schematic-placement path: the
 *      SHIPPED `SceneLayers.isStructureVisible` admits a synthetic `nrv-*` probe
 *      exactly when the `nerve` kind is on (and the region is on), the shipped
 *      `KIND_OPACITY.nerve` is 1 (opaque, depth-writing — so it is pickable like
 *      the other schematic placements) and `hintForKind('nerve')` is the
 *      gray-matter preset; the census over the real records is printed with
 *      `on`/`off` counts;
 *   7  geometry honesty: every authored nerve record is `meshes: false` with a
 *      sized placement inside `AXIS_BOUNDS`, no `nrv-*` GLB is committed, no
 *      anatomy-manifest part and no `anatomyAssets` LINK names a nerve id — i.e.
 *      the schematic ellipsoid is the whole 3D story, and nothing was baked;
 *   8  the store's load-time assertions and their Node mirror still hold:
 *      importing `src/state/store.ts` (twice) runs them — the module throws on
 *      violation — the mirror is re-derived here over every non-telencephalon,
 *      non-vascular registry row, and `scripts/verify/audit-checks.test.mjs` is
 *      EXECUTED as a child process with inherited stdio and must exit 0;
 *   9  the BITE: the same contract checker is run against EIGHT defective kind
 *      tables (dropped kind in ALL_KINDS / in the validator / in the union, empty
 *      label, missing swatch, typo'd CSS token, missing glyph, missing opacity)
 *      and each one must be caught BY NAME — a check that cannot fail is not
 *      evidence.
 *
 * WHY A SECOND RENDER PATH (section 5). `renderToStaticMarkup` cannot show a
 * post-toggle re-render: React's server renderer reads the *server* snapshot of
 * `useSyncExternalStore`, and zustand v4 passes `api.getServerState ||
 * api.getInitialState` — the state captured when the store was created. Measured:
 * after `useAtlasStore.setState({ quality: 'balanced' })` a server re-render
 * still prints the boot reading. Section 5 therefore calls the shipped component
 * directly with a minimal hook dispatcher whose `useSyncExternalStore` returns
 * `getSnapshot()` (the CLIENT path a browser takes), which yields the real props
 * — handlers included — for the CURRENT store state. Nothing in `src/` is
 * modified and no module is faked; React's dispatcher slot is borrowed for the
 * duration of one call and restored in a `finally`.
 *
 * NOT PROVEN HERE (orchestrator lane only): pixels, real pointer input and the
 * browser's own reading of the Systems row. Chrome cannot start in this sandbox,
 * so the DOM claims above are about the markup React really produced and the
 * handlers those buttons really carry, not about a rendered screenshot.
 *
 * The `nerve` census is printed in full (section 6) because no other gate counts
 * records by kind: registry rows, authored records, `meshes:false` count,
 * placements inside bounds, manifest parts, GLBs and the region split.
 *
 * Run:  node scripts/verify/nerve-kind.mjs
 * npm:  "verify:nerve-kind": "node scripts/verify/nerve-kind.mjs"   (package.json
 *       is integrator-owned — this line is the requested wiring)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
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

/* ------------------------------------------------- the shipped-module loader */

/**
 * Same technique as `area-toggles.mjs` / `division-toggles.mjs` /
 * `boundary-contract.mjs`: the app's own `.ts`/`.tsx` sources are transpiled
 * in-process (extensionless relative imports resolved the way Vite resolves them,
 * JSON imports wrapped, `import.meta.glob` emulated), so the SHIPPED modules are
 * what run. Two additions over `area-toggles.mjs`, both needed by the viewer3d
 * modules this gate imports:
 *   • `?url` globs (lazy, e.g. `../assets/anatomy/*.glb`) become thunks returning
 *     the asset path instead of being JSON-parsed — a GLB is not JSON;
 *   • binary/asset extensions already resolve to `undefined` in both lanes.
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
          const urlGlob = /\?url/.test(options)
          const eager = /eager\s*:\s*true/.test(options)
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
            if (urlGlob) {
              const assetUrl = `assets/${relative}`
              return `${JSON.stringify(key)}: ${
                eager ? JSON.stringify(assetUrl) : `() => Promise.resolve(${JSON.stringify(assetUrl)})`
              }`
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

/* ----------------------------------------------------------------- reporting */

let passed = 0
const failures = []
const checks = []
/** When set, verdicts are captured instead of recorded (the bite re-runs). */
let sink = null

function group(title) {
  checks.push({ title, passed: 0, failed: 0 })
  console.log(`\n── ${title}`)
}

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

/* --------------------------------------------------------- shipped modules */

const loadModule = await import(moduleUrl('src/data/load.ts'))
const ALL_KINDS = [...loadModule.ALL_KINDS]
/**
 * v19 — the kinds the Systems row RENDERS as `data-kind` buttons. `vessel` is the
 * one deliberate omission: its 53 records are exactly the `vasculature` region's
 * 53 records (verified in both directions), so the row keeps ONE button for the
 * arterial system — the region-backed "Vasculature" button, which carries both
 * layers — instead of two controls for one system. The DATA model is untouched:
 * `ALL_KINDS` still carries all seven kinds (the kind axis is real; only its
 * redundant button is gone), and the contract checks below assert the vessel
 * kind is COVERED by the vasculature button rather than rendered by its own.
 */
const RENDERED_KINDS = ALL_KINDS.filter((kind) => kind !== 'vessel')
const ALL_REGIONS = [...loadModule.ALL_REGIONS]
const taxonomy = loadModule.taxonomy
const structures = loadModule.structures
const { KIND_GLYPH } = await import(moduleUrl('src/components/KindGlyph.tsx'))
const { KIND_OPACITY, hintForKind } = await import(moduleUrl('src/components/viewer3d/NucleusMesh.tsx'))
const { isStructureVisible, layersAdmit } = await import(moduleUrl('src/components/viewer3d/SceneLayers.tsx'))
const storeModule = await import(moduleUrl('src/state/store.ts'))
/** A SECOND instance: re-importing re-runs the store's load-time assertions. */
const storeEcho = await import(moduleUrl('src/state/store.ts', '?assertions=2'))
const { useAtlasStore, DEFAULT_LAYERS, VIEW_PRESETS, viewPresetOf } = storeModule

const React = projectRequire('react')
const { renderToStaticMarkup } = projectRequire('react-dom/server')
const Header = (await import(moduleUrl('src/components/Header.tsx'))).default
const Legend = (await import(moduleUrl('src/components/Legend.tsx'))).default
const render = (component) => renderToStaticMarkup(React.createElement(component))

/* ------------------------------------------------------- source-side readers */

/**
 * `scripts/validate-data.mjs` cannot be imported (importing it validates and
 * exits), and `src/types.ts` is types-only, so the two declaration sites that are
 * not runtime modules are read as text. Both are parsed as data — an array
 * literal and a union of string literals — never pattern-matched for a hoped-for
 * word, and the values they yield are then compared against the imported maps.
 */
const validatorSource = readSource('scripts/validate-data.mjs')
const typesSource = readSource('src/types.ts')
const tokensSource = readSource('src/styles/tokens.css')
const headerSource = stripComments(readSource('src/components/Header.tsx'))

const VALIDATOR_KINDS = (() => {
  const match = validatorSource.match(/const KINDS = \[([^\]]*)\]/)
  if (match === null) throw new Error('could not read `const KINDS = [...]` out of scripts/validate-data.mjs')
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
})()

const TYPE_KINDS = (() => {
  const match = typesSource.match(/export type Kind = ([^\n]+)/)
  if (match === null) throw new Error('could not read `export type Kind = ...` out of src/types.ts')
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
})()

const VALIDATOR_SLUG_RE = (() => {
  const match = validatorSource.match(/const SLUG_RE = (\/[^\n]*?\/);/)
  if (match === null) throw new Error('could not read `const SLUG_RE = …` out of scripts/validate-data.mjs')
  const literal = match[1]
  return new RegExp(literal.slice(1, literal.lastIndexOf('/')))
})()

const VALIDATOR_PREFIX_KIND = (() => {
  const match = validatorSource.match(/const PREFIX_KIND = \{([\s\S]*?)\n\};/)
  if (match === null) throw new Error('could not read `const PREFIX_KIND = {...}` out of scripts/validate-data.mjs')
  const out = {}
  for (const pair of match[1].matchAll(/(\w+):\s*'([^']+)'/g)) out[pair[1]] = pair[2]
  return out
})()

const CSS_TOKENS = [...tokensSource.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])
const ANATOMY_MANIFEST = JSON.parse(readSource('src/assets/anatomy/anatomy-manifest.json'))
const ANATOMY_GLBS = readdirSync(resolve(ROOT, 'src/assets/anatomy')).filter((f) => f.endsWith('.glb'))
const ANATOMY_ASSETS_SOURCE = readSource('src/geometry/anatomyAssets.ts')

/* ------------------------------------------------- the rendered DOM readers */

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

/** Every rendered `<button>` with its attributes and its visible text. */
function readButtons(markup) {
  const found = []
  for (const match of markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attributes = {}
    for (const attribute of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attributes[attribute[1]] = attribute[2]
    found.push({ attributes, text: decodeText(match[2]) })
  }
  return found
}

/** The Legend's palette swatches: `{ token, label }` in render order. */
function readSwatches(markup) {
  const found = []
  const re = /class="legend-swatch"[^>]*style="background:([^"]+)"[^>]*><\/span>\s*<span>([^<]*)<\/span>/g
  for (const match of markup.matchAll(re)) found.push({ token: match[1], label: decodeText(match[2]) })
  return found
}

/**
 * Every `legend-row legend-toggle` checkbox row, with the label text beside it.
 * The division control is a THIRD family of rows in the same markup, so it is
 * flagged here (`data-division`) and excluded by the caller — kind rows and
 * region rows carry a bare checkbox and are told apart by their own names.
 */
function readLegendToggleRows(markup) {
  const found = []
  const re = /<label class="legend-row legend-toggle[^>]*><input type="checkbox"([^>]*)\/><span>([^<]*)<\/span><\/label>/g
  for (const match of markup.matchAll(re)) {
    found.push({
      label: decodeText(match[2]),
      checked: /\bchecked=/.test(match[1]),
      division: /data-division=/.test(match[1]),
    })
  }
  return found
}

/**
 * THE LIVE RENDER HARNESS.
 *
 * `renderToStaticMarkup` is the right tool for the DOM contract (section 3: the
 * markup the browser will parse), but it CANNOT show a post-toggle re-render:
 * React's server renderer reads `useSyncExternalStore`'s **server** snapshot, and
 * zustand v4 passes `api.getServerState || api.getInitialState` — i.e. the state
 * captured when the store was created. Measured here: after
 * `useAtlasStore.setState({ quality: 'balanced' })` a server re-render still
 * prints the boot reading, so no assertion about a CHANGED store can be made
 * through that path.
 *
 * This harness calls the shipped component directly with a minimal hook
 * dispatcher whose `useSyncExternalStore` returns `getSnapshot()` — the CLIENT
 * path a browser takes. The element tree it returns therefore carries the props
 * the component really passes for the CURRENT store state, including the real
 * `onClick` handlers, which are then CALLED (section 5). No source file is
 * modified and no module is faked: only React's dispatcher slot is borrowed for
 * the duration of the call and restored in a `finally`.
 */
const reactInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
function makeLiveDispatcher() {
  return {
    useSyncExternalStore(subscribe, getSnapshot) { return getSnapshot() },
    useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}] },
    useReducer(reducer, initial) { return [initial, () => {}] },
    useRef(value) { return { current: value } },
    useMemo(factory) { return factory() },
    useCallback(fn) { return fn },
    useEffect() {},
    useLayoutEffect() {},
    useInsertionEffect() {},
    useImperativeHandle() {},
    useDebugValue() {},
    useContext(context) { return context?._currentValue ?? context?.currentValue },
    useDeferredValue(value) { return value },
    useTransition() { return [false, (fn) => fn()] },
    useId() { return ':nerve-kind:' },
  }
}

/** The element tree a component returns when called with the live dispatcher. */
function renderLive(component) {
  const previous = reactInternals.ReactCurrentDispatcher.current
  reactInternals.ReactCurrentDispatcher.current = makeLiveDispatcher()
  try {
    return component({})
  } finally {
    reactInternals.ReactCurrentDispatcher.current = previous
  }
}

/** `data-kind -> button props` from a live element tree (real handlers included). */
function liveKindButtons(component) {
  const nodes = []
  const walk = (element) => {
    if (element === null || element === undefined || typeof element !== 'object') return
    if (Array.isArray(element)) {
      for (const child of element) walk(child)
      return
    }
    if (element.type === 'button') nodes.push(element.props)
    if (element.props?.children !== undefined) walk(element.props.children)
  }
  walk(renderLive(component))
  const out = new Map()
  for (const props of nodes) if (props['data-kind'] !== undefined) out.set(props['data-kind'], props)
  return out
}

/** One rendered `<button>`'s attributes and text, keyed by `data-kind`. */
function readKindButtons(markup) {
  const out = new Map()
  for (const button of readButtons(markup)) {
    const kind = button.attributes['data-kind']
    if (kind !== undefined) out.set(kind, button)
  }
  return out
}

/**
 * Which Legend swatch label stands for a kind. Documented rather than guessed:
 * `tract` is deliberately THREE swatches (ascending / descending / mixed) because
 * the palette splits the kind by direction, `vessel` is the arterial family, and
 * every other kind has exactly one swatch whose label names it.
 */
const SWATCH_MATCHERS = {
  nucleus: /^Nuclei$/,
  tract: /\btracts$/i,
  ventricle: /ventricle/i,
  surface: /surface/i,
  vessel: /arteries|vessels/i,
  context: /context/i,
  nerve: /^Cranial nerves$/,
}

/**
 * THE CONTRACT CHECKER — one pure function, used both on the shipped tables and
 * (section 9) on deliberately defective ones, so "the check bites" is measured
 * with the same code path as "the check passes".
 */
function kindContractViolations(site) {
  const violations = []
  if (JSON.stringify(site.kinds) !== JSON.stringify(site.validatorKinds)) {
    violations.push(`ALL_KINDS ${JSON.stringify(site.kinds)} ≠ validator KINDS ${JSON.stringify(site.validatorKinds)}`)
  }
  if (JSON.stringify(site.kinds) !== JSON.stringify(site.typeKinds)) {
    violations.push(`ALL_KINDS ${JSON.stringify(site.kinds)} ≠ the Kind union ${JSON.stringify(site.typeKinds)}`)
  }
  for (const kind of site.kinds) {
    // v19 — `vessel` has no rendered KIND_LABELS label of its own: its records
    // are exactly the `vasculature` region's (verified identical sets), so the
    // row keeps one button — the region-backed "Vasculature" — which carries
    // both layers and is named in section 3 below. The label obligation for
    // `vessel` is satisfied by that button, not by a KIND_LABELS row.
    const labelCoveredByRegion = kind === 'vessel'
    if (!labelCoveredByRegion && (!Object.prototype.hasOwnProperty.call(site.labels, kind) || String(site.labels[kind]).trim() === '')) {
      violations.push(`no KIND_LABELS label for kind "${kind}"`)
    }
    if (!Object.prototype.hasOwnProperty.call(site.glyphs, kind) || String(site.glyphs[kind]).trim() === '') {
      violations.push(`no KIND_GLYPH glyph for kind "${kind}"`)
    }
    if (!Object.prototype.hasOwnProperty.call(site.opacities, kind)) {
      violations.push(`no KIND_OPACITY entry for kind "${kind}"`)
    }
    const matcher = SWATCH_MATCHERS[kind]
    const swatch = site.swatches.find((s) => matcher !== undefined && matcher.test(s.label))
    if (swatch === undefined) {
      violations.push(`no Legend swatch for kind "${kind}"`)
      continue
    }
    const token = /^var\((--[a-z0-9-]+)\)$/.exec(swatch.token)
    if (token === null) violations.push(`Legend swatch "${swatch.label}" does not use a var(--…) token (got ${swatch.token})`)
    else if (!site.cssTokens.includes(token[1])) {
      violations.push(`Legend swatch "${swatch.label}" names ${token[1]}, which src/styles/tokens.css does not define`)
    }
  }
  for (const kind of site.kinds) {
    if (!site.validatorKinds.includes(kind)) violations.push(`kind "${kind}" is missing from the validator's KINDS`)
  }
  return violations
}

/** The shipped declaration sites, read once and shared with the bite section. */
const bootMarkup = render(Header)
const bootLegend = render(Legend)
const bootKindButtons = readKindButtons(bootMarkup)
const SHIPPED_TABLE = {
  kinds: ALL_KINDS,
  validatorKinds: VALIDATOR_KINDS,
  typeKinds: TYPE_KINDS,
  labels: Object.fromEntries([...bootKindButtons].map(([kind, button]) => [kind, button.text])),
  glyphs: KIND_GLYPH,
  opacities: KIND_OPACITY,
  swatches: readSwatches(bootLegend),
  cssTokens: CSS_TOKENS,
}

/* ------------------------------------------------------------ 1. declaration */

group('1. the `nerve` kind is declared in every declaration site, and the sites agree')

const kindViolations = kindContractViolations(SHIPPED_TABLE)
equalJson('ALL_KINDS, in order (src/data/load.ts)', ALL_KINDS, [
  'nucleus', 'tract', 'ventricle', 'surface', 'vessel', 'context', 'nerve',
])
equalJson('the validator’s KINDS (scripts/validate-data.mjs)', VALIDATOR_KINDS, ALL_KINDS)
equalJson('the `Kind` union (src/types.ts)', TYPE_KINDS, ALL_KINDS)
truthy('`nerve` is in ALL_KINDS (the Systems row maps this list)', ALL_KINDS.includes('nerve'))
truthy('`nerve` is in the validator’s KINDS', VALIDATOR_KINDS.includes('nerve'))
equalJson('every kind has a KIND_GLYPH entry', sorted(Object.keys(KIND_GLYPH)), sorted(ALL_KINDS))
equalJson('every kind has a KIND_OPACITY entry', sorted(Object.keys(KIND_OPACITY)), sorted(ALL_KINDS))
equalJson('the contract checker finds no violation on the shipped tables', kindViolations, [])
truthy('the validator still runs its own KINDS enum check', /checkEnum\(file, `\$\{at\}\.kind`, rec\.kind, KINDS\)/.test(validatorSource))

group('2. the SLUG contract accepts `nrv-`, and the prefix→kind rule names `nerve`')
{
  const nerveIds = taxonomy.filter((entry) => entry.kind === 'nerve').map((entry) => entry.id)
  const accepted = nerveIds.filter((id) => VALIDATOR_SLUG_RE.test(id))
  equalJson(`all ${nerveIds.length} registered nerve ids match the validator's SLUG_RE`, accepted, nerveIds)
  equalJson('`nrv-cn3-oculomotor` is accepted by the shipped regex', VALIDATOR_SLUG_RE.test('nrv-cn3-oculomotor'), true)
  equalJson(
    'the four near-misses are still rejected',
    ['cn3-oculomotor', 'nrv-CN3', 'nerve-cn3', 'nrv-'].map((id) => [id, VALIDATOR_SLUG_RE.test(id)]),
    [['cn3-oculomotor', false], ['nrv-CN3', false], ['nerve-cn3', false], ['nrv-', false]],
  )
  equalJson('PREFIX_KIND maps `nrv` to `nerve`', VALIDATOR_PREFIX_KIND.nrv, 'nerve')
  equalJson(
    'every prefix in PREFIX_KIND maps to a declared kind',
    sorted(Object.values(VALIDATOR_PREFIX_KIND)),
    sorted(ALL_KINDS),
  )
  const prefixMismatch = taxonomy.filter((entry) => {
    const want = VALIDATOR_PREFIX_KIND[String(entry.id).split('-')[0]]
    return want !== undefined && want !== entry.kind
  })
  equalJson(`no registry row's id prefix contradicts its kind (${taxonomy.length} rows checked)`, prefixMismatch.map((e) => e.id), [])
  info(`nerve registry rows: ${nerveIds.length} — ${nerveIds.join(', ') || 'none'}`)
}

/* ------------------------------------------------------ 3. the Systems row */

group('3. the rendered <Header /> exposes one Systems button per ALL_KINDS entry')
{
  const systemsStart = bootMarkup.indexOf('class="header-systems"')
  const actionsStart = bootMarkup.indexOf('class="header-actions"')
  const inSystemsRow = (kind) => {
    const at = bootMarkup.indexOf(`data-kind="${kind}"`)
    return at > systemsStart && systemsStart >= 0 && at < actionsStart
  }
  equalJson('data-kind values, in row order', [...bootKindButtons.keys()], RENDERED_KINDS)
  equalJson(
    'every kind button sits inside the `Structure systems` group',
    RENDERED_KINDS.filter((kind) => !inSystemsRow(kind)),
    [],
  )
  equalJson(
    'the systems group is a labelled group',
    ['role="group"', 'aria-label="Structure systems"'].filter((attr) => bootMarkup.slice(systemsStart, systemsStart + 200).includes(attr)),
    ['role="group"', 'aria-label="Structure systems"'],
  )
  equalJson(
    'every kind button carries aria-pressed',
    RENDERED_KINDS.filter((kind) => bootKindButtons.get(kind)?.attributes['aria-pressed'] === undefined),
    [],
  )
  equalJson(
    'the Systems row boots fully pressed (every kind layer on, `nerve` included)',
    RENDERED_KINDS.map((kind) => bootKindButtons.get(kind)?.attributes['aria-pressed']),
    RENDERED_KINDS.map(() => 'true'),
  )
  equalJson(
    'every kind button declares type="button"',
    RENDERED_KINDS.filter((kind) => bootKindButtons.get(kind)?.attributes.type !== 'button'),
    [],
  )
  const labels = RENDERED_KINDS.map((kind) => bootKindButtons.get(kind)?.text ?? '')
  equalJson('every kind button has a non-empty label', labels.filter((label) => label.trim() === ''), [])
  equalJson('the labels are unique (no two systems read alike)', labels.length, new Set(labels).size)
  equalJson('the `nerve` button reads exactly "Cranial nerves"', bootKindButtons.get('nerve')?.text, 'Cranial nerves')
  equalJson(
    'nothing else in the header claims the exact text "Cranial nerves"',
    readButtons(bootMarkup).filter((button) => button.text === 'Cranial nerves').map((button) => button.attributes['data-kind'] ?? button.text),
    ['nerve'],
  )
  equalJson(
    'visible text is a PREFIX of the accessible name (WCAG 2.5.3), for every kind',
    RENDERED_KINDS.filter((kind) => {
      const button = bootKindButtons.get(kind)
      if (button === undefined) return true
      const name = String(button.attributes['aria-label'] ?? '')
      return name === '' || !name.startsWith(button.text)
    }),
    [],
  )
  equalJson(
    'the `nerve` accessible name states the visible label first',
    [bootKindButtons.get('nerve')?.attributes['aria-label'], bootKindButtons.get('nerve')?.attributes.title],
    [
      'Cranial nerves — show/hide the nerve system (nerve)',
      'Cranial nerves — show/hide the nerve system (nerve)',
    ],
  )
  // The WIRING, read from the shipped source: the rendered markup cannot carry a
  // handler, so the one line that connects the button to the store is asserted
  // here and then EXERCISED in section 5.
  const systemsBlock = headerSource.slice(
    headerSource.indexOf('className="header-systems"'),
    headerSource.indexOf('className="header-actions"'),
  )
  equalJson(
    'the Systems row wires data-kind, aria-pressed, the label and toggleKindLayer',
    ['data-kind={kind}', 'const on = layers.kinds.has(kind)', 'aria-pressed={on}', '{KIND_LABELS[kind]}', 'onClick={() => toggleKindLayer(kind)}']
      .filter((needle) => !systemsBlock.includes(needle)),
    [],
  )
  equalJson('the `nerve` label lives in the exhaustive KIND_LABELS map', /KIND_LABELS: Record<Kind, string>/.test(headerSource), true)
}

/* ------------------------------------------- 4. the Legend, swatches + rows */

group('4. the rendered <Legend /> has a swatch AND a toggle row for every kind')
{
  const swatches = SHIPPED_TABLE.swatches
  equalJson(
    'every kind has a palette swatch',
    ALL_KINDS.filter((kind) => !swatches.some((s) => SWATCH_MATCHERS[kind].test(s.label))),
    [],
  )
  equalJson(
    'every swatch token is a var(--…) defined in src/styles/tokens.css',
    swatches.filter((s) => {
      const token = /^var\((--[a-z0-9-]+)\)$/.exec(s.token)
      return token === null || !CSS_TOKENS.includes(token[1])
    }).map((s) => `${s.label} → ${s.token}`),
    [],
  )
  const nerveSwatch = swatches.find((s) => s.label === 'Cranial nerves')
  equalJson('the `nerve` swatch is "Cranial nerves" on var(--kind-nerve)', nerveSwatch, {
    token: 'var(--kind-nerve)',
    label: 'Cranial nerves',
  })
  // The `ALL_KINDS.map` toggle rows. The same markup also carries the division
  // control and the per-region rows, so all three families are separated by their
  // own names — and the split is asserted to be complete, so a dropped row cannot
  // hide in "not a kind, not a region".
  const toggleRows = readLegendToggleRows(bootLegend)
  const kindRows = toggleRows.filter((row) => !row.division && RENDERED_KINDS.includes(row.label))
  const regionRows = toggleRows.filter((row) => !row.division && !ALL_KINDS.includes(row.label))
  const divisionRows = toggleRows.filter((row) => row.division)
  equalJson('the Legend renders one toggle row per kind, in the row\'s order (vessel covered by the vasculature region row)', kindRows.map((row) => row.label), RENDERED_KINDS)
  equalJson('and one per region (the second ALL_* map in the same panel)', regionRows.map((row) => row.label), ALL_REGIONS)
  equalJson('the division control is a third, separate family of rows', divisionRows.length > 0, true)
  equalJson('every kind toggle row is checked at boot (the nerve layer is on)', kindRows.filter((row) => !row.checked).map((row) => row.label), [])
  equalJson('the `nerve` toggle row exists exactly once and is checked', kindRows.filter((row) => row.label === 'nerve'), [
    { label: 'nerve', checked: true, division: false },
  ])
  info(`palette swatches rendered: ${swatches.length} — ${swatches.map((s) => `${s.label} [${s.token}]`).join(' · ')}`)
}

/* ------------------------------------------------------- 5. the toggle bite */

group('5. toggling the `nerve` kind changes exactly the nerve layer — through the real onClick')
{
  const readLayers = () => useAtlasStore.getState().layers
  const boot = readLayers()
  const bootLayers = {
    regions: new Set(boot.regions),
    kinds: new Set(boot.kinds),
    hidden: new Set(boot.hidden),
    emphasis: new Set(boot.emphasis),
  }
  equalJson('the boot layer set contains every kind, `nerve` included', sorted(bootLayers.kinds), sorted(ALL_KINDS))
  equalJson('the boot framing is still the documented default preset', viewPresetOf(boot), 'brainstem-focus')
  equalJson('VIEW_PRESETS[brainstem-focus].kinds IS ALL_KINDS (the boot mechanism)', [...VIEW_PRESETS['brainstem-focus'].kinds], ALL_KINDS)

  // The live tree first: its props must agree with the rendered DOM contract.
  const liveBoot = liveKindButtons(Header)
  info('rendering through the live dispatcher (useSyncExternalStore → getSnapshot, the client path): a server render would keep printing the BOOT snapshot because zustand hands React `api.getServerState || api.getInitialState`')
  equalJson('the live element tree carries one Systems button per kind (vessel covered by the region-backed button)', [...liveBoot.keys()], RENDERED_KINDS)
  equalJson(
    'the live aria-pressed readings equal the rendered DOM attributes at boot',
    RENDERED_KINDS.map((kind) => String(liveBoot.get(kind)?.['aria-pressed'])),
    RENDERED_KINDS.map((kind) => bootKindButtons.get(kind)?.attributes['aria-pressed']),
  )
  equalJson(
    'every Systems button carries a callable onClick',
    RENDERED_KINDS.filter((kind) => typeof liveBoot.get(kind)?.onClick !== 'function'),
    [],
  )
  // v19 — the vessel kind is COVERED, not rendered: the region-backed
  // "Vasculature" button carries both layers (see Header's toggleVasculature),
  // and no data-kind="vessel" button exists. Both halves are asserted, so the
  // coverage cannot silently stop covering.
  equalJson(
    'no data-kind="vessel" button is rendered (the arterial system has one button)',
    [...bootKindButtons.keys()].filter((kind) => kind === 'vessel'),
    [],
  )
  equalJson(
    'the region-backed "Vasculature" button covers the vessel kind (its label names the system)',
    readButtons(bootMarkup).filter((button) => button.attributes['data-system-region'] === 'vasculature').map((button) => button.text),
    ['Vasculature'],
  )

  // OFF — by CALLING the handler the button really passes, not a re-typed action.
  liveBoot.get('nerve').onClick()
  const off = readLayers()
  equalJson(
    'clicking the `Cranial nerves` button removes exactly the nerve kind from layers.kinds',
    sorted(off.kinds),
    sorted([...bootLayers.kinds].filter((kind) => kind !== 'nerve')),
  )
  equalSet('layers.regions', off.regions, bootLayers.regions)
  equalSet('layers.hidden', off.hidden, bootLayers.hidden)
  equalSet('layers.emphasis', off.emphasis, bootLayers.emphasis)

  const liveOff = liveKindButtons(Header)
  equalJson(
    'the live re-render flips exactly the `nerve` button to aria-pressed=false',
    RENDERED_KINDS.filter((kind) => Boolean(liveOff.get(kind)?.['aria-pressed']) !== (kind !== 'nerve')),
    [],
  )
  const offMarkup = render(Header)
  equalJson(
    'the DOM contract for the other six buttons is untouched by the toggle',
    ALL_KINDS.filter(
      (kind) => kind !== 'nerve'
        && offMarkup.match(new RegExp(`<button[^>]*data-kind="${kind}"[^>]*>`))?.[0]
          !== bootMarkup.match(new RegExp(`<button[^>]*data-kind="${kind}"[^>]*>`))?.[0],
    ),
    [],
  )

  // ON again — the round trip must restore the exact boot state and rendering.
  liveOff.get('nerve').onClick()
  const back = readLayers()
  equalJson('clicking it again re-adds exactly that kind', sorted(back.kinds), sorted(bootLayers.kinds))
  equalSet('layers.regions after the round trip', back.regions, bootLayers.regions)
  equalSet('layers.hidden after the round trip', back.hidden, bootLayers.hidden)
  equalSet('layers.emphasis after the round trip', back.emphasis, bootLayers.emphasis)
  equalJson('the round-tripped header renders byte-identically to boot', render(Header) === bootMarkup, true)
  equalJson(
    'the live tree is back to every button pressed',
    RENDERED_KINDS.filter((kind) => liveKindButtons(Header).get(kind)?.['aria-pressed'] !== true),
    [],
  )
}

/* -------------------------------------------- 6. the schematic-placement path */

group('6. a nerve record is admitted by the ordinary schematic-placement path')
{
  const synthetic = {
    id: 'nrv-verify-probe',
    name: 'CN probe',
    region: 'midbrain',
    subdivision: 'Cranial nerves',
    kind: 'nerve',
    laterality: 'paired',
    color: '#14b8a6',
    function: 'probe',
    origin3d: [0, 20, 0],
    size3d: [1, 1, 1],
    meshes: false,
  }
  const layersWith = (kinds, regions = ALL_REGIONS) => ({
    regions: new Set(regions),
    kinds: new Set(kinds),
    hidden: new Set(),
  })
  equalJson('a synthetic `nrv-*` record is admitted when the nerve kind is on', isStructureVisible(synthetic, layersWith(ALL_KINDS)), true)
  equalJson(
    'and is excluded the moment the nerve kind is off',
    isStructureVisible(synthetic, layersWith(ALL_KINDS.filter((kind) => kind !== 'nerve'))),
    false,
  )
  equalJson(
    'the region gate still applies to it',
    isStructureVisible(synthetic, layersWith(ALL_KINDS, ALL_REGIONS.filter((region) => region !== 'midbrain'))),
    false,
  )
  equalJson('layersAdmit agrees with the pass for the nerve kind', layersAdmit(layersWith(ALL_KINDS), 'midbrain', 'nerve'), true)
  equalJson('layersAdmit rejects the nerve kind when it is off', layersAdmit(layersWith([]), 'midbrain', 'nerve'), false)
  equalJson('a nerve record renders opaque (KIND_OPACITY = 1, so depth writes)', KIND_OPACITY.nerve, 1)
  equalJson('a nerve record takes the nucleus material hint when no manifest hint exists', hintForKind('nerve'), 'nucleus')

  // The census over the REAL records, through the same shipped predicate.
  const bootLayers = {
    regions: new Set(useAtlasStore.getState().layers.regions),
    kinds: new Set(useAtlasStore.getState().layers.kinds),
    hidden: new Set(useAtlasStore.getState().layers.hidden),
  }
  const nerveOffLayers = { ...bootLayers, kinds: new Set([...bootLayers.kinds].filter((kind) => kind !== 'nerve')) }
  const nerveRecords = structures.filter((record) => record.kind === 'nerve')
  const expectedOn = nerveRecords.filter((record) => bootLayers.regions.has(record.region) && !bootLayers.hidden.has(record.id)).length
  const admittedOn = nerveRecords.filter((record) => isStructureVisible(record, bootLayers)).length
  const admittedOff = nerveRecords.filter((record) => isStructureVisible(record, nerveOffLayers)).length
  const otherKindsOn = structures.filter((record) => record.kind !== 'nerve' && isStructureVisible(record, bootLayers)).length
  const otherKindsOff = structures.filter((record) => record.kind !== 'nerve' && isStructureVisible(record, nerveOffLayers)).length
  const registryNerveRows = taxonomy.filter((entry) => entry.kind === 'nerve')
  equalJson('every authored nerve record is admitted at boot framing', admittedOn, expectedOn)
  equalJson('toggling the nerve kind off removes EVERY nerve record and nothing else', [admittedOff, otherKindsOff], [0, otherKindsOn])
  info(`census: registry rows ${registryNerveRows.length} · authored records ${nerveRecords.length} · admitted on ${admittedOn} · admitted off ${admittedOff} · other kinds ${otherKindsOn}→${otherKindsOff}`)
  if (nerveRecords.length < registryNerveRows.length) {
    info(`NOTE: ${registryNerveRows.length - nerveRecords.length} registry row(s) have no authored record yet (the content task owns them); the census above covers the ${nerveRecords.length} that exist`)
  }

  /* The run's own evidence line (PLAN.md §7) — no other gate counts records by
   * kind, so the numbers are printed here in full. */
  const inBounds = (record, key, positive) => {
    const v = record[key]
    if (!Array.isArray(v) || v.length !== 3) return false
    if (positive && !(v[0] > 0 && v[1] > 0 && v[2] > 0)) return false
    const bounds = [[-58, 58], [-55, 116], [-76, 72]]
    return v.every((n, i) => typeof n === 'number' && Number.isFinite(n) && n >= bounds[i][0] && n <= bounds[i][1])
  }
  const regionCounts = {}
  for (const row of registryNerveRows) regionCounts[row.region] = (regionCounts[row.region] ?? 0) + 1
  const manifestParts = Array.isArray(ANATOMY_MANIFEST.parts) ? ANATOMY_MANIFEST.parts : []
  const nerveParts = manifestParts.filter((part) => String(part.slug ?? '').startsWith('nrv-'))
  const nerveGlbs = ANATOMY_GLBS.filter((file) => file.startsWith('nrv-'))
  const nerveLinks = (ANATOMY_ASSETS_SOURCE.match(/'nrv-[a-z0-9-]+'/g) ?? [])
  console.log(
    '\n     kind=nerve -> '
    + `${registryNerveRows.length} taxonomy rows, ${nerveRecords.length} authored records, `
    + `${nerveRecords.filter((r) => r.meshes === false).length} with meshes:false, `
    + `${nerveRecords.filter((r) => inBounds(r, 'origin3d', false) && inBounds(r, 'size3d', true)).length} with origin3d+size3d inside bounds, `
    + `${nerveParts.length} manifest parts, ${nerveGlbs.length} GLBs, ${nerveLinks.length} anatomyAssets links`,
  )
  console.log(
    `     regions (registry): ${Object.entries(regionCounts).map(([region, n]) => `${region} ${n}`).join(' · ') || 'none'}`
    + ` · manifest parts total ${manifestParts.length} · GLBs total ${ANATOMY_GLBS.length}`,
  )
}

/* ---------------------------------------------------- 7. geometry honesty */

group('7. geometry honesty — no mesh, no GLB, no manifest part, nothing baked')
{
  const nerveRecords = structures.filter((record) => record.kind === 'nerve')
  const registryNerveRows = taxonomy.filter((entry) => entry.kind === 'nerve')
  const manifestParts = Array.isArray(ANATOMY_MANIFEST.parts) ? ANATOMY_MANIFEST.parts : []
  const inBounds = (record, key, positive) => {
    const v = record[key]
    if (!Array.isArray(v) || v.length !== 3) return false
    if (positive && !(v[0] > 0 && v[1] > 0 && v[2] > 0)) return false
    const bounds = [[-58, 58], [-55, 116], [-76, 72]]
    return v.every((n, i) => typeof n === 'number' && Number.isFinite(n) && n >= bounds[i][0] && n <= bounds[i][1])
  }
  equalJson(
    'no `nrv-*` GLB is committed',
    ANATOMY_GLBS.filter((file) => file.startsWith('nrv-')),
    [],
  )
  equalJson(
    'no anatomy-manifest part names a nerve id',
    manifestParts.filter((part) => String(part.slug ?? '').startsWith('nrv-')).map((part) => part.slug),
    [],
  )
  equalJson(
    'no `anatomyAssets` LINK registers a nerve id (no BP3D element is claimed)',
    ANATOMY_ASSETS_SOURCE.match(/'nrv-[a-z0-9-]+'/g) ?? [],
    [],
  )
  truthy(
    `the registry declares the nerve kind with at least one row (${registryNerveRows.length} row(s) of kind 'nerve')`,
    registryNerveRows.length > 0,
  )
  /* The registry is authoritative for region/subdivision/kind — the same rule
   * `validate-data.mjs` cross-checks, re-asserted here on the nerve family so a
   * record authored in the wrong region cannot pass this gate either. */
  const registryById = new Map(taxonomy.map((entry) => [entry.id, entry]))
  equalJson(
    'every authored nerve record agrees with its registry row on region/subdivision/kind',
    nerveRecords
      .map((record) => {
        const entry = registryById.get(record.id)
        if (entry === undefined) return `${record.id}: not registered`
        const drift = ['region', 'subdivision', 'kind'].filter((field) => entry[field] !== record[field])
        return drift.length === 0 ? null : `${record.id}: ${drift.map((f) => `${f} ${record[f]} ≠ ${entry[f]}`).join(', ')}`
      })
      .filter((line) => line !== null),
    [],
  )
  equalJson(
    'every authored nerve record declares meshes:false',
    nerveRecords.filter((record) => record.meshes !== false).map((record) => record.id),
    [],
  )
  equalJson(
    'every authored nerve record carries a sized placement inside AXIS_BOUNDS',
    nerveRecords
      .filter((record) => !(inBounds(record, 'origin3d', false) && inBounds(record, 'size3d', true)))
      .map((record) => record.id),
    [],
  )
  equalJson(
    'every authored nerve record states what its schematic placement stands for',
    nerveRecords.filter((record) => String(record.contextNote ?? '').trim() === '').map((record) => record.id),
    [],
  )
  info(`${nerveRecords.length} authored nerve record(s) checked; the schematic ellipsoid at origin3d/size3d is the whole 3D story (NucleusMesh falls back on the manifest miss)`)
}

/* --------------------------------- 8. the store's load-time assertions + mirror */

group('8. the store’s load-time assertions and their Node mirror still hold')
{
  truthy(
    'importing src/state/store.ts ran its load-time assertions twice without throwing',
    storeEcho.DEFAULT_LAYERS !== undefined,
    '2 instances imported — the module-level guards execute on every import',
  )
  equalJson('the default framing is still `brainstem-focus`', viewPresetOf(DEFAULT_LAYERS), 'brainstem-focus')
  truthy(
    'the guard that would catch a kind left layer-off in the default is still present',
    storeEcho !== undefined
      && readSource('src/state/store.ts').includes('if (!DEFAULT_LAYERS.regions.has(entry.region) || !DEFAULT_LAYERS.kinds.has(entry.kind))'),
  )
  /* The mirror `audit-checks.test.mjs` re-derives (its §"store's own load-time
   * assertion"): every non-telencephalon / non-vascular row must be layer-ON at
   * default framing. Re-derived here over the CURRENT registry, so it tracks the
   * twelve new rows instead of a frozen count. */
  const checked = taxonomy.filter((entry) => entry.region !== 'telencephalon' && entry.region !== 'vasculature')
  const dimmed = checked.filter(
    (entry) => !DEFAULT_LAYERS.regions.has(entry.region) || !DEFAULT_LAYERS.kinds.has(entry.kind),
  )
  equalJson(
    `no non-telencephalon/non-vascular row is layer-off at default framing (${checked.length} rows checked)`,
    dimmed.map((entry) => `${entry.id} (${entry.region}/${entry.kind})`),
    [],
  )
  const nerveRows = taxonomy.filter((entry) => entry.kind === 'nerve')
  equalJson(
    `every one of the ${nerveRows.length} nerve registry row(s) has its kind layer on at boot`,
    nerveRows.filter((entry) => !DEFAULT_LAYERS.kinds.has(entry.kind)).map((entry) => entry.id),
    [],
  )
  /* The node-only AUDIT MIRROR, executed — not re-implemented. It is spawned with
   * INHERITED stdio on purpose: a piped child fails with EPERM in this sandbox
   * (the same environment limit that blocks `verify:anatomy`), and inherited
   * stdio is the form that works, so the mirror really runs and really prints. */
  const mirror = spawnSync(process.execPath, ['scripts/verify/audit-checks.test.mjs'], { stdio: 'inherit' })
  console.log('')
  equalJson(
    'scripts/verify/audit-checks.test.mjs (the Node mirror) exits 0',
    [mirror.status, mirror.error === undefined ? null : String(mirror.error.code)],
    [0, null],
  )
}

/* ----------------------------------------------------------------- 9. the bite */

group('9. bite: the same checker catches a defective kind table, by name')
{
  const defect = (mutate) => {
    const table = {
      kinds: [...SHIPPED_TABLE.kinds],
      validatorKinds: [...SHIPPED_TABLE.validatorKinds],
      typeKinds: [...SHIPPED_TABLE.typeKinds],
      labels: { ...SHIPPED_TABLE.labels },
      glyphs: { ...SHIPPED_TABLE.glyphs },
      opacities: { ...SHIPPED_TABLE.opacities },
      swatches: SHIPPED_TABLE.swatches.map((s) => ({ ...s })),
      cssTokens: [...SHIPPED_TABLE.cssTokens],
    }
    mutate(table)
    return kindContractViolations(table)
  }
  const bites = [
    ['the kind is dropped from ALL_KINDS only', (t) => { t.kinds = t.kinds.filter((k) => k !== 'nerve') }, 'ALL_KINDS'],
    ['the validator’s KINDS loses the kind', (t) => { t.validatorKinds = t.validatorKinds.filter((k) => k !== 'nerve') }, 'validator KINDS'],
    ['the Kind union loses the kind', (t) => { t.typeKinds = t.typeKinds.filter((k) => k !== 'nerve') }, 'Kind union'],
    ['the System label is blank', (t) => { t.labels.nerve = '' }, 'no KIND_LABELS label for kind "nerve"'],
    ['the Legend swatch is forgotten (a plain array — tsc cannot catch it)', (t) => { t.swatches = t.swatches.filter((s) => s.label !== 'Cranial nerves') }, 'no Legend swatch for kind "nerve"'],
    ['the swatch names a CSS token that does not exist', (t) => { t.swatches.find((s) => s.label === 'Cranial nerves').token = 'var(--kind-nerves)' }, 'tokens.css does not define'],
    ['the glyph table loses the kind', (t) => { delete t.glyphs.nerve }, 'no KIND_GLYPH glyph for kind "nerve"'],
    ['the opacity table loses the kind', (t) => { delete t.opacities.nerve }, 'no KIND_OPACITY entry for kind "nerve"'],
  ]
  const missed = []
  for (const [name, mutate, expected] of bites) {
    const violations = defect(mutate)
    const caught = violations.some((message) => message.includes(expected))
    if (!caught) missed.push(`${name} → expected a violation containing "${expected}", got ${JSON.stringify(violations)}`)
  }
  equalJson(`all ${bites.length} defective tables are caught, each by the right check`, missed, [])
  info(`mutants: ${bites.map(([name]) => name).join(' · ')}`)
}

/* ------------------------------------------------------------------ summary */

const failedTotal = checks.reduce((sum, check) => sum + check.failed, 0)
console.log('\n================ nerve-kind summary ================')
for (const check of checks) {
  console.log(`  ${check.failed === 0 ? '✓' : '✗'} ${check.title}`)
  console.log(`      ${check.passed} passed · ${check.failed} failed`)
}
console.log(`\n  under test: the SHIPPED src/data/load.ts, src/components/{Header,Legend,KindGlyph}.tsx,`)
console.log('  src/components/viewer3d/{NucleusMesh,SceneLayers}.tsx, src/state/store.ts,')
console.log('  scripts/validate-data.mjs (source), src/types.ts (source), src/styles/tokens.css (source)')
console.log(`  manifest: ${Array.isArray(ANATOMY_MANIFEST.parts) ? ANATOMY_MANIFEST.parts.length : 0} parts · ${ANATOMY_GLBS.length} GLBs`)
if (failedTotal > 0) {
  console.log(`\n${passed} passed · ${failedTotal} failed`)
  for (const failure of failures) console.log(`  · ${failure}`)
  console.log('\nNERVE-KIND GATE FAILED')
  process.exitCode = 1
} else {
  console.log(`\n${passed} passed · 0 failed`)
  console.log('\n✔ NERVE-KIND GATE PASSED')
}
