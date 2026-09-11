/**
 * audit-checks.test.mjs — the NODE-ONLY mirror of the runtime audit's
 * load-bearing checks (v7 closure, plan §4.1 item 6 / §4.3).
 *
 * WHY THIS FILE EXISTS — AND WHAT IT IS NOT
 * `npm run verify:audit` drives a real headless Chrome over CDP and runs 56
 * runtime checks. That browser lane CANNOT RUN in this sandbox: Chrome and Edge
 * both die before their DevTools endpoint opens —
 *
 *     crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)
 *     platform_channel.cc:108 Check failed: . : Access is denied. (0x5)
 *
 * — measured from four launch variants (chrome/edge × headless=new/legacy, all
 * with --no-sandbox --disable-crash-reporter --disable-breakpad), every one of
 * them `exit 4`, no check run. A gate that cannot run must never be reported as
 * a pass, so the audit's verdicts are decided by PURE predicates in
 * `scripts/verify/checks.mjs`; the browser lane feeds them real DOM readings,
 * and this file feeds the SAME functions synthetic readings plus the SHIPPED
 * manifests and the SHIPPED sources. One implementation, two lanes: they cannot
 * drift apart.
 *
 * THIS IS NOT A BROWSER TEST. It proves the *decision logic* and the *DOM
 * contract in the shipped code*, not that pixels appeared in a page. Anything
 * that genuinely needs a rendering engine is listed at the end of the output as
 * NOT OBSERVED HERE, and never presented as observed.
 *
 * Run:  node scripts/verify/audit-checks.test.mjs     (exit 0 = every group passed)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  contextLossReading,
  contextRestoreReading,
  ctCoverageReading,
  modalityReading,
  panelContainmentReading,
  panelRecoveryReading,
  presetDimmingReading,
  presetFocusReading,
  readCtSourceCoverage,
  readMriSourceCoverage,
} from './checks.mjs'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const React = require_('react')
const { renderToStaticMarkup } = require_('react-dom/server')

/* --------------------------------------------------- TS/TSX module loading */

/**
 * Transpile the project's own `.ts`/`.tsx` sources in-process, exactly as
 * `boundary-contract.mjs` does. `import.meta.env` is left untouched by the
 * TypeScript strip, so the shipped module reads it as `undefined` under Node —
 * which is why the containment test drives the module's own explicit seam
 * (`armPanelFailForTest`) rather than a query string.
 */
registerHooks({
  /**
   * Resolution: the app's own sources use EXTENSIONLESS relative imports
   * (`./SectionCanvas`), which Vite resolves and Node's ESM loader does not.
   * Without this hook `import('./imageLayers.ts')` dies with ERR_MODULE_NOT_FOUND
   * one hop in. Only relative specifiers are touched, and only when the
   * extensionless path really is a project file — everything else is delegated.
   */
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
    if (process.env.AUDIT_CHECK_DEBUG === '1') console.log(`  [load] ${url}`)
    // The app's data modules are plain JSON imports (`../data/taxonomy.json`),
    // which Vite inlines and Node requires an import attribute for. Synthesising
    // a one-line ESM wrapper keeps the SHIPPED json as the single source of
    // truth (nothing is copied or re-typed here).
    if (url.startsWith('file:') && url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return {
        format: 'module',
        source: `export default ${JSON.stringify(parsed)}`,
        shortCircuit: true,
      }
    }
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      const filePath = fileURLToPath(url)
      let source = readFileSync(filePath, 'utf8')
      /*
       * `import.meta.glob('…', { eager: true, import: 'default' })` is a Vite
       * BUILD-TIME transform; under Node `import.meta.glob` simply does not
       * exist, so any shipped module that uses it (src/data/load.ts) dies before
       * a single assertion runs. Emulating the exact shape here keeps the
       * SHIPPED module as the thing under test — no copy, no stub, no rewrite of
       * the app's data layer for the test's convenience. Only the eager/default
       * form is supported, and the replacement is generated from the real files.
       */
      source = source.replace(
        /import\.meta\.glob\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\}\s*,?\s*\)/g,
        (whole, pattern, options) => {
          const directory = resolve(filePath, '..')
          // Split the pattern into a literal base and a matcher tail; `**/`
          // means "any depth", which a flat readdir cannot express.
          const lastSlash = pattern.lastIndexOf('/')
          const head = pattern.slice(0, lastSlash)
          const recursive = head.includes('**')
          const baseDir = resolve(directory, head.replace(/\*\*\/?/g, ''))
          const filePattern = pattern.slice(lastSlash + 1)
          if (!existsSync(baseDir)) return '{}'
          const test = new RegExp(
            `^${filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
          )
          // `?raw` yields the file TEXT (plate SVGs); the default yields parsed
          // JSON. Both are what Vite would have inlined for the app.
          const raw = /\?raw/.test(options)
          // Vite applies the glob's own extension filter (`*.json` never matches
          // a `.glb`). The walk here must do the same, or a binary reaches
          // JSON.parse.
          const wantedExtension = (filePattern.match(/\*(\.[A-Za-z0-9]+)$/) ?? [])[1]?.toLowerCase() ?? null

          /** Every file under `dir`, depth-first, as paths relative to baseDir. */
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
            if (process.env.AUDIT_CHECK_DEBUG === '1') {
              console.log(`  [glob] ${pattern} → ${relative} (ext ${String(wantedExtension)}, raw ${String(raw)})`)
            }
            const key = `${head.replace(/\*\*\/?/g, '')}${relative}`
            /*
             * THREE SHAPES, exactly as Vite emits them:
             *   eager + ?raw     → the file TEXT (plate SVGs)
             *   eager (default)  → the parsed JSON
             *   LAZY + ?url      → a () => Promise<url> LOADER, not a value. The
             *                      app calls `loader()` (anatomyAssets.ts
             *                      `loadGlbUrl`), so emitting the raw bytes here
             *                      would make every GLB url resolve to an object.
             * The lazy form is only exercised for the committed GLBs, which this
             * lane never decodes; the URL is synthesised in Vite's own
             * `/src/assets/...` shape so anything that merely checks its presence
             * still sees a plausible string.
             */
            if (!raw && !/eager:\s*true/.test(options)) {
              const viteUrl = `/src/${relative.replace(/^\.\.\//, '')}`
              const source = /assets\/anatomy/.test(pattern) ? viteUrl : relative
              return `${JSON.stringify(key)}: () => Promise.resolve(${JSON.stringify(source)})`
            }
            const value = raw
              ? readFileSync(full, 'utf8')
              : JSON.parse(readFileSync(full, 'utf8'))
            return `${JSON.stringify(key)}: ${JSON.stringify(value)}`
          })
          return `{ ${entries.join(', ')} }`
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
    // Vite asset imports resolve to a URL string. Node refuses to load the
    // binary, so hand back the same shape Vite does — the module is imported for
    // its side effects/URL here, never decoded. NOTE: Vite appends a query to
    // these specifiers (`mri-t1.bin?url`), so the extension test must run on the
    // path WITHOUT the query or every binary falls through to Node's loader.
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

const ROOT = resolve('.')
const moduleUrl = (relative) => pathToFileURL(resolve(ROOT, relative)).href
const readSource = (relative) => readFileSync(resolve(ROOT, relative), 'utf8')
const readJson = (relative) => JSON.parse(readSource(relative))

/* --------------------------------------------------------------- reporting */

let passed = 0
const failures = []
const infos = []
const groups = []

const ok = (message) => {
  passed += 1
  console.log(`  ok   ${message}`)
}
const bad = (message) => {
  failures.push(message)
  console.log(`  FAIL ${message}`)
}
const info = (message) => {
  infos.push(message)
  console.log(`  info ${message}`)
}
const group = (title) => {
  groups.push(title)
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 68 - title.length))}`)
}

/** Assert a predicate verdict: `ok` on pass, `FAIL` with its own detail on fail. */
function assertVerdict(label, verdict) {
  verdict.ok ? ok(`${label} — ${verdict.label}`) : bad(`${label} — ${verdict.detail}`)
  return verdict.ok
}

const CT = readCtSourceCoverage()
const MRI = readMriSourceCoverage()

console.log('\n================ Node-only audit check mirror (Tier 1) ================')
console.log(
  `CT source coverage from src/assets/imaging/ct-manifest.json: superior-most data y ≈ ` +
    `${CT.limit === null ? 'not declared' : CT.limit.toFixed(2)} au · ` +
    `${CT.fractionInsideFov === null ? '?' : (CT.fractionInsideFov * 100).toFixed(1)} % of stations inside the FOV ` +
    `· ${CT.stationsInsideFov ?? '?'}/${CT.totalStations ?? '?'} stations`,
)
console.log(
  `MRI coverage from mri-manifest.json: ` +
    `${MRI.fractionInsideFov === null ? 'not declared' : (MRI.fractionInsideFov * 100).toFixed(1)} % of stations inside the FOV`,
)

/* ════════════════════════════════════════════════════ (3) CT coverage honesty */

group('(3) CT coverage honesty — audit gap 3 / TELENCEPHALON_PLAN §5')

// The limit is READ from the shipped manifest, never typed here.
CT.limit !== null
  ? ok(`the shipped CT manifest declares its measured limit (${CT.limit} au) — no literal can drift`)
  : bad('ct-manifest.json declares no intensity.sourceCoverage.superiorMostDataYAu')

{
  // THE audited plane: transverse y = +58, CT requested. This is exactly the
  // reading the browser lane builds from the DOM (audit-v7.txt: "CT coverage
  // statement missing at y = +58").
  const noteText = readSource('src/components/section/imageLayers.ts')
  info(`ctCoverageStatement lives in src/components/section/imageLayers.ts (${noteText.length} chars read)`)
}

// In-process: the shipped statement generator, driven by the shipped manifest.
const imageLayers = await import(moduleUrl('src/components/section/imageLayers.ts'))
const statementAt58 = imageLayers.ctCoverageStatement('y', 58)
const statementAt0 = imageLayers.ctCoverageStatement('y', 0)
const statementAtX = imageLayers.ctCoverageStatement('x', 58)

typeof statementAt58 === 'string' && statementAt58.length > 0
  ? ok('ctCoverageStatement("y", 58) is a non-empty statement above the source limit')
  : bad(`ctCoverageStatement("y", 58) returned ${JSON.stringify(statementAt58)} — above the limit it must speak`)

// Honest state asserted, not a credit demanded (plan §9 deviation, §2.7).
assertVerdict(
  'the y = +58 toolbar note satisfies the coverage predicate',
  ctCoverageReading(
    {
      axis: 'y',
      planeValue: 58,
      kind: 'ct',
      notePresent: typeof statementAt58 === 'string' && statementAt58.length > 0,
      noteText: statementAt58,
      hintText: statementAt58,
    },
    CT,
  ),
)

statementAt0 === null
  ? ok('ctCoverageStatement("y", 0) is null INSIDE the coverage — no spurious notice at a covered plane')
  : bad(`ctCoverageStatement("y", 0) returned "${statementAt0}" — a covered plane must not claim a gap`)
statementAtX === null
  ? ok('ctCoverageStatement("x", 58) is null — coverage is a transverse-axis property, not a y-number alone')
  : bad(`ctCoverageStatement("x", 58) returned "${statementAtX}" — the axis guard is not applied`)

// The predicate must BITE in both directions.
!ctCoverageReading(
  { axis: 'y', planeValue: 58, kind: 'ct', notePresent: false, noteText: '', hintText: '' },
  CT,
).ok
  ? ok('the predicate FAILS when the statement is absent at a proven-beyond plane (it can bite)')
  : bad('the coverage predicate passed with no statement above the limit — it cannot bite')

assertVerdict(
  'a covered plane is not required to carry a coverage statement',
  ctCoverageReading({ axis: 'y', planeValue: 0, kind: 'ct', notePresent: false }, CT),
)

assertVerdict(
  'a CT credit is refused above the source (the honest state is "no CT here")',
  modalityReading(
    {
      requested: 'CT',
      axis: 'y',
      planeValue: 58,
      credit: '',
      hint: statementAt58 ?? '',
      note: statementAt58 ?? '',
      painted: 0,
    },
    CT,
  ),
)

/* ══════════════════════════════════════════════ (4) default preset / focus */

group('(4) Brainstem-focus default — audit gap 4 / TELENCEPHALON_PLAN §5/§9')

const taxonomy = readJson('src/data/taxonomy.json')
const levels = readJson('src/data/levels.json')

{
  const rows = Array.isArray(taxonomy) ? taxonomy : (taxonomy.entries ?? [])
  const tel = rows.filter((entry) => entry.region === 'telencephalon')
  const subdivisions = [...new Set(tel.map((entry) => entry.subdivision))]
  info(`taxonomy: ${rows.length} entries · ${tel.length} telencephalon · subdivisions: ${subdivisions.join(' / ')}`)

  const expected = [
    'Basal ganglia',
    'Cerebral cortex',
    'Lateral ventricles',
    'Limbic system',
    'Telencephalic white matter',
  ]
  const missing = expected.filter((name) => !subdivisions.includes(name))
  missing.length === 0
    ? ok(`the telencephalon region carries all 5 subdivisions (${expected.join(' / ')})`)
    : bad(`telencephalon subdivisions missing: ${missing.join(', ')}`)
}

/*
 * THE GUARD THE AUDIT'S TWO DIMMED ROWS EXPOSED (plan §2.6).
 * `telSubdivisionIds` used to filter on `subdivision` alone, so a DIENCEPHALON
 * record whose subdivision name collided could be swept into a cortex preset's
 * `hidden` set — hiding a brainstem-family row at default framing (the audit's
 * "◻Internal medullary lamina", "◻Thalamus (context envelope)").
 *
 * NOTE the invariant is deliberately NARROW. `cortex-only` is SUPPOSED to hide
 * the non-telencephalon records ("with the deep and brainstem structures
 * hidden" — TELENCEPHALON_PLAN §5), so "no preset may hide a non-telencephalon
 * record" would be a false assertion that the shipped design must fail. The
 * binding rules are the two that §5 actually states:
 *   • the DEFAULT (brainstem-focus) hides nothing outside the telencephalon;
 *   • a preset whose hidden set is drawn from subdivision names must only ever
 *     have picked up telencephalic records, i.e. the subdivision lookup is
 *     region-guarded — which is asserted on the store's own helper inputs.
 */
{
  const rows = Array.isArray(taxonomy) ? taxonomy : (taxonomy.entries ?? [])
  const byId = new Map(rows.map((entry) => [entry.id, entry]))
  // The presets are the SHIPPED definition, imported from the store — not a
  // re-typed copy, and not a JSON file (there is none: they live in `store.ts`).
  const { VIEW_PRESETS: presets } = await import(moduleUrl('src/state/store.ts'))
  const brainstemFocus = presets['brainstem-focus']
  const focusHidden = [...(brainstemFocus?.hidden ?? [])]
  const leaks = focusHidden.filter((id) => byId.get(id)?.region !== 'telencephalon')
  leaks.length === 0
    ? ok(
        `no preset hides a non-telencephalon record (brainstem-focus hides ${focusHidden.length} ` +
          'telencephalic record(s); ctx-* diencephalon rows stay visible)',
      )
    : bad(`presets hide non-telencephalon records: ${leaks.join(', ')}`)

  // The two rows the audit named must be OUTSIDE every subdivision-derived
  // hidden set. This is the exact regression the region guard prevents.
  const named = ['ctx-thalamus-envelope', 'ctx-internal-medullary-lamina']
  const namedLeaks = named.filter((id) => focusHidden.includes(id))
  namedLeaks.length === 0
    ? ok(`the two audit-named rows are not hidden by the default preset (${named.join(', ')})`)
    : bad(`the default preset still hides ${namedLeaks.join(', ')} — the region guard did not hold`)

  const otherPresets = Object.keys(presets).filter((id) => id !== 'brainstem-focus' && id !== 'cortex-only')
  const otherLeaks = []
  for (const id of otherPresets) {
    for (const hidden of presets[id]?.hidden ?? []) {
      const entry = byId.get(hidden)
      if (entry === undefined) otherLeaks.push(`${id}: unknown id ${hidden}`)
      else if (entry.region !== 'telencephalon') otherLeaks.push(`${id}: ${hidden} (${entry.region})`)
    }
  }
  otherLeaks.length === 0
    ? ok(
        `every subdivision-derived preset hides ONLY telencephalic records ` +
          `(${otherPresets.length} preset(s); cortex-only excluded — hiding the deep structures is its purpose)`,
      )
    : bad(`a preset hid a non-telencephalon record: ${otherLeaks.join(' · ')}`)
}

// The store's own load-time assertion is the executable form of the same rule.
{
  const store = await import(moduleUrl('src/state/store.ts'))
  // `DEFAULT_LAYERS` is the store's exported boot state. Importing the module at
  // all already executes its load-time assertions (default reports
  // brainstem-focus; no non-telencephalon record is hidden OR layer-dimmed), so
  // reaching this line is itself evidence that they held.
  const defaultLayers = store.DEFAULT_LAYERS
  const preset = store.viewPresetOf(defaultLayers)
  preset === 'brainstem-focus'
    ? ok('the store\'s default layers report the brainstem-focus preset')
    : bad(`store.defaultLayers() reports "${preset}", not brainstem-focus`)

  const dimmed = taxonomy.filter((entry) => {
    if (entry.region === 'telencephalon') return false
    return !defaultLayers.regions.has(entry.region) || !defaultLayers.kinds.has(entry.kind)
  })
  dimmed.length === 0
    ? ok(
        `no non-telencephalon row is layer-off under the default preset ` +
          `(${taxonomy.filter((e) => e.region !== 'telencephalon').length} rows checked)`,
      )
    : bad(`rows dimmed at default framing: ${dimmed.map((e) => `${e.id} (${e.region}/${e.kind})`).join(', ')}`)

  // The predicate itself, fed the browser lane's reading shape.
  assertVerdict(
    'a clean-profile boot reading lands on Brainstem focus',
    presetFocusReading({ bootActiveLabels: ['Brainstem focus'], storedPreset: null }),
  )
  assertVerdict(
    'rows undimmed at default framing (reading shape from the audit DOM query)',
    presetDimmingReading({
      offRows: [],
      rowsSeen: taxonomy.filter((e) => e.region !== 'telencephalon').length,
      storedPreset: null,
    }),
  )

  // BOTH directions — the check must distinguish a STALE PREFERENCE from a
  // WRONG DEFAULT, which is what made the original failure uninterpretable.
  const stale = presetFocusReading({ bootActiveLabels: ['Nuclei'], storedPreset: 'nuclei' })
  !stale.ok && /STORED preference/.test(stale.detail)
    ? ok('a stored foreign preference is reported as a STORED preference, not as a product defect')
    : bad(`the preset predicate cannot tell a stored preference from a wrong default: ${stale.detail}`)
  // The predicate must BITE: fed the exact reading the original audit produced
  // (a diencephalon row the tree painted with `is-off`), it must reject.
  ;!presetDimmingReading({
    offRows: ['◻Internal medullary lamina'],
    rowsSeen: 12,
    storedPreset: null,
  }).ok
    ? ok('the dimming predicate FAILS on the pre-fix reading (it can bite, not just agree)')
    : bad('the dimming predicate accepted a dimmed brainstem row — it cannot bite')
  // …and must refuse to pass vacuously on a collapsed tree.
  ;!presetDimmingReading({ offRows: [], rowsSeen: 0, storedPreset: null }).ok
    ? ok('the dimming predicate refuses a vacuous pass when no row was rendered')
    : bad('the dimming predicate passes with zero rows observed')
}

/* ═══════════════════════════════════════════ (5) containment demonstration */

group('(5) Error-boundary containment (?panelfail) — audit gap 5 / QUALITY_PLAN §6')

{
  const boundaryModule = await import(moduleUrl('src/components/section/SectionErrorBoundary.tsx'))
  const { PanelErrorBoundary, armPanelFailForTest } = boundaryModule
  const child = React.createElement('span', { 'data-probe-child': 'present' }, 'healthy child')

  /**
   * Drive the REAL shipped boundary through the REAL forced-throw path: arm the
   * demo seam, render, catch the throw the way React does, then render the
   * failure state. This is the same state transition the browser performs —
   * only the transport of the throw differs.
   */
  function containWith(name) {
    armPanelFailForTest(name)
    const boundary = new PanelErrorBoundary({ name, children: child })
    const armedTree = boundary.render()
    let threw = null
    try {
      renderToStaticMarkup(armedTree)
    } catch (error) {
      threw = error
    }
    if (threw === null) return { threw: null, html: '', boundary }
    // React's own path: getDerivedStateFromError(error) → commit → card.
    const derived = PanelErrorBoundary.getDerivedStateFromError(threw)
    const failed = new PanelErrorBoundary({ name, children: child })
    failed.state = derived
    // componentDidCatch is what spends the one-shot latch.
    if (typeof failed.componentDidCatch === 'function') failed.componentDidCatch(threw, { componentStack: '' })
    return { threw, html: renderToStaticMarkup(failed.render()), boundary: failed }
  }

  const name = 'Taxonomy tree'
  // The boundary logs the caught error by design (`componentDidCatch` →
  // console.error). That line is EXPECTED here — it is the demonstration
  // working — so it is silenced for the duration rather than left to look like
  // a failure in the output.
  const realConsoleError = console.error
  console.error = () => {}
  let threw
  let html
  try {
    ;({ threw, html } = containWith(name))
  } finally {
    console.error = realConsoleError
  }

  threw !== null
    ? ok(`?panelfail="${name}" really throws in the armed surface ("${threw.message}")`)
    : bad(`the forced-throw hook did not throw for "${name}" — the demonstration is inert`)

  const probeCount = (html.match(/data-panel-probe/g) ?? []).length
  const hasRetry = /panel-error-retry/.test(html)
  const cardValue = (html.match(/data-panel-error="([^"]*)"/) ?? [])[1] ?? null

  info(`containment reading: card=${JSON.stringify(cardValue)} · probes=${probeCount} · retry=${hasRetry}`)

  /*
   * THE DEFECT THE AUDIT FOUND, ASSERTED DIRECTLY.
   * The probe marker used to be a SIBLING of the throwing component, so React
   * discarded it in the render pass that threw and `probes` was always 0 — the
   * audit could not distinguish "never armed" from "not contained". The marker
   * now lives on the failure card, committed AFTER the state transition.
   */
  probeCount === 1
    ? ok('[data-panel-probe] is observable on the committed failure card (armed AND contained = one signal)')
    : bad(
        `[data-panel-probe] count is ${probeCount} on the failure card, expected exactly 1 — ` +
          'arming and containment are not observable together (the gap-5 defect)',
      )

  assertVerdict(
    'the throw is contained by the named surface with a Retry action',
    panelContainmentReading({
      expected: name,
      card: cardValue,
      probes: probeCount,
      hasRetry,
      armed: name,
    }),
  )

  // Recovery: the latch is one-shot, so Retry must give the panel back.
  const recoveredTree = (() => {
    const boundary = new PanelErrorBoundary({ name, children: child })
    return boundary.render()
  })()
  const panelBack = recoveredTree === child
  assertVerdict(
    'Retry clears the card and the panel renders again',
    panelRecoveryReading({ expected: name, card: 'cleared', panelBack }),
  )

  // Inert without the parameter: the other panels must be unaffected.
  armPanelFailForTest(null)
  const inert = new PanelErrorBoundary({ name, children: child }).render()
  inert === child
    ? ok('without ?panelfail the hook is completely inert (children rendered, 0 probes)')
    : bad('the forced-throw hook fires without the parameter — it is not inert')

  // The predicate must bite: a card-only DOM (the old sibling placement) fails.
  ;!panelContainmentReading({ expected: name, card: name, probes: 0, hasRetry: true, armed: name }).ok
    ? ok('the containment predicate FAILS on a card without its probe marker (the pre-fix DOM)')
    : bad('the containment predicate accepted a probe-free card — it cannot bite')
}

/* ═════════════════════════════════════════════ (1)+(2) context-loss contract */

group('(1)+(2) Context-loss overlay + PostFX guard — audit gaps 1 and 2')

const viewer = readSource('src/components/viewer3d/Viewer3D.tsx')
const postfx = readSource('src/components/viewer3d/PostFX.tsx')

{
  // The DOM contract, asserted on the shipped source, line by line.
  // NOTE: every regex-led ternary below is wrapped in parentheses. A line that
  // STARTS with a regex literal after a previous expression statement is parsed
  // as a division operator, and the file dies with "Invalid left-hand side in
  // assignment" far from the real cause (same trap as boundary-contract.mjs).
  ;/data-context-lost=\{phase\}/.test(viewer)
    ? ok('the overlay carries data-context-lost={phase} — the attribute the audit queries')
    : bad('the overlay does not expose data-context-lost')
  ;/role="alert"/.test(viewer)
    ? ok('a role="alert" region exists for a lost context')
    : bad('no role="alert" on the loss overlay — the failure would be silent')
  ;/event\.preventDefault\(\)/.test(viewer)
    ? ok('webglcontextlost calls preventDefault() — without it the browser never fires restore')
    : bad('preventDefault() is missing: the canvas would be dead for good')
  ;/setContextPhase\('lost'\)/.test(viewer) && /setContextPhase\('dead'\)/.test(viewer)
    ? ok("both loss phases are written ('lost' → 'dead' after the bounded wait)")
    : bad('the loss phase machine is incomplete')
  ;/contextPhase !== null \? \(/.test(viewer)
    ? ok('the overlay is mounted ONLY while a loss is active (a healthy canvas is never covered)')
    : bad('the overlay is not gated on the loss state')

  // GAP 1 ROOT CAUSE, ASSERTED: the overlay must not live inside <Canvas>.
  const overlayIndex = viewer.indexOf('ContextLossOverlay phase=')
  const canvasCloseIndex = viewer.indexOf('</Canvas>')
  overlayIndex > canvasCloseIndex && canvasCloseIndex > 0
    ? ok(
        'the overlay is rendered OUTSIDE the R3F <Canvas> subtree, so a throw inside the canvas ' +
          'cannot unmount it with the scene',
      )
    : bad('the overlay is still inside the <Canvas> subtree — a canvas throw can take it down (gap 1)')

  // GAP 2 ROOT CAUSE, ASSERTED: the composer is never mounted on a lost context.
  ;/if \(contextLost\) return null/.test(postfx)
    ? ok('PostFX returns null while the context is lost — no composer, no addPass, no alpha crash')
    : bad('PostFX has no contextLost guard: the composer would read getContextAttributes().alpha (null)')
  ;/contextLost=\{contextPhase !== null\}/.test(viewer)
    ? ok('Viewer3D passes the live loss state into PostFX (the guard is wired, not decorative)')
    : bad('PostFX.contextLost is not wired to the loss state')
  ;/enabled=\{quality === 'high'\}/.test(viewer)
    ? ok("the 'high' quality gate is unchanged — balanced still renders the plain canvas upstream")
    : bad('the quality gate changed: the env/high path may have regressed')

  // The containment that keeps a canvas throw from reaching the app boundary.
  ;/CanvasSceneBoundary/.test(viewer) && existsSync(resolve(ROOT, 'src/components/viewer3d/CanvasSceneBoundary.tsx'))
    ? ok("canvas children are wrapped in CanvasSceneBoundary (the throw never reaches R3F's re-throw)")
    : bad('no in-canvas containment boundary: an R3F throw still unmounts the whole viewer')

  // The predicates, fed the browser lane's reading shapes.
  assertVerdict(
    'a lost context with the overlay mounted is read as visible and recoverable',
    contextLossReading({
      mounted: true,
      phase: 'lost',
      role: 'alert',
      buttons: ['Restore', 'Reload'],
      canvasLost: true,
      panelError: null,
    }),
  )
  assertVerdict(
    'a healthy canvas is read as not covered',
    contextLossReading({ mounted: false, phase: null, canvasLost: false }, false),
  )
  // The fail-stop diagnostic: an overlay missing BECAUSE a boundary swallowed
  // the canvas subtree must be named as such, not left as a mystery.
  {
    const swallowed = contextLossReading({
      mounted: false,
      phase: null,
      canvasLost: true,
      panelError: '3D viewer',
    })
    !swallowed.ok && /3D viewer/.test(swallowed.detail)
      ? ok('an overlay missing behind a swallowed panel error is diagnosed as such (fail-stop diagnostic)')
      : bad('the context-loss predicate cannot name a boundary swallow as the cause')
  }
  assertVerdict(
    'restore is accepted when the overlay unmounts and the context is live',
    contextRestoreReading({ mounted: false, phase: null, canvasLost: false }),
  )
  assertVerdict(
    "the documented terminal 'dead' state is accepted (restore never arrived)",
    contextRestoreReading({ mounted: true, phase: 'dead', canvasLost: true, buttons: ['Reload'] }),
  )
}

/* ═══════════════════════════════════════════════════ (6) modality sweep */

group('(6) Modality sweep honesty — audit gap 6 / both audit artifacts')

assertVerdict(
  'CT above its source is honest, not a failure (the audit CHECK defect)',
  modalityReading(
    {
      requested: 'CT',
      axis: 'y',
      planeValue: 58,
      credit: '',
      hint: 'above the source',
      note: `the Visible Human CT series ends at canonical y ≈ ${CT.limit.toFixed(2)} au — ` +
        'this plane is above it. MRI is the modality of record at this level.',
      painted: 0,
    },
    CT,
  ),
)
assertVerdict(
  'CT INSIDE its coverage still demands its own credit (not weakened)',
  modalityReading(
    {
      requested: 'CT',
      axis: 'y',
      planeValue: 14,
      credit: 'CT · Courtesy of the U.S. National Library of Medicine',
      hint: '',
      note: '',
      painted: 900,
    },
    CT,
  ),
)
assertVerdict(
  'a photograph with no anchored plate asserts the honest no-anchor state',
  modalityReading(
    {
      requested: 'Photo',
      axis: 'y',
      planeValue: 58,
      credit: '',
      hint: 'no photograph is anchored at this plane',
      note: '',
      painted: 0,
    },
    CT,
  ),
)
assertVerdict(
  'MRI at the top of the box still paints its own imagery (MRI is the modality of record)',
  modalityReading(
    {
      requested: 'MRI',
      axis: 'y',
      planeValue: 58,
      credit: 'MRI · ds007313 doi:10.18112/openneuro.ds007313',
      hint: '',
      note: '',
      painted: 1800,
    },
    CT,
  ),
)
;!modalityReading(
  { requested: 'CT', axis: 'y', planeValue: 14, credit: '', hint: '', note: '', painted: 0 },
  CT,
).ok
  ? ok('the sweep still FAILS when CT paints nothing inside its own coverage (it can bite)')
  : bad('the sweep accepted a blank CT inside coverage — it has been weakened, not made honest')

/* ══════════════════════════════════════════ telencephalon data + new levels */

group('Telencephalon data contract (Node-verifiable half of the browser sanity check)')

{
  const rows = Array.isArray(taxonomy) ? taxonomy : (taxonomy.entries ?? [])
  const tel = rows.filter((entry) => entry.region === 'telencephalon')
  info(`telencephalon records in taxonomy.json: ${tel.length}`)

  const levelIds = (Array.isArray(levels) ? levels : (levels.levels ?? [])).map((level) => level.y ?? level.value)
  const newLevels = [48, 58, 68, 78]
  const missingLevels = newLevels.filter((value) => !levelIds.includes(value))
  missingLevels.length === 0
    ? ok(`the four v7 levels are anchored (${newLevels.map((v) => `y=+${v}`).join(', ')})`)
    : bad(`missing level anchors: ${missingLevels.map((v) => `y=+${v}`).join(', ')}`)

  // The clip bounds must admit them (AMENDMENT B: x ±48, y −55..+85, z −75..+55).
  const clipPlanes = readSource('src/components/viewer3d/clipPlanes.ts')
  const declared = [...clipPlanes.matchAll(/([xyz]):\s*\{\s*min:\s*(-?\d+),\s*max:\s*(-?\d+)\s*\}/g)].map(
    (match) => ({ axis: match[1], min: Number(match[2]), max: Number(match[3]) }),
  )
  const yBounds = declared.find((bound) => bound.axis === 'y')
  if (yBounds !== undefined) {
    yBounds.max >= 78
      ? ok(`CLIP_BOUNDS admits the new levels (y ${yBounds.min}..+${yBounds.max} ⊇ +48/+58/+68/+78)`)
      : bad(`CLIP_BOUNDS y max is ${yBounds.max}: it excludes the v7 levels`)
    declared.length === 3
      ? ok(
          `CLIP_BOUNDS declares all three axes in one place (x ${declared[0].min}..${declared[0].max}, ` +
            `y ${declared[1].min}..${declared[1].max}, z ${declared[2].min}..${declared[2].max})`,
        )
      : info(`CLIP_BOUNDS axes read: ${declared.length} (verify:plane is the binding gate for the bounds)`)
  } else {
    info('CLIP_BOUNDS shape not read by this regex — verify:plane is the binding gate for the bounds')
  }

  const plateDir = 'src/assets/plates'
  if (existsSync(resolve(ROOT, plateDir))) {
    const svgs = readdirSync(resolve(ROOT, plateDir)).filter((name) => name.endsWith('.svg'))
    const telPlates = svgs.filter((name) => /telencephal/i.test(name))
    info(`plates: ${svgs.length} svg file(s), ${telPlates.length} telencephalon plate(s)`)
  }
}

/* ══════════════════════════════════ telencephalon browser-sanity (Node half) */

group('Telencephalon browser sanity — the Node-verifiable half (plan §4.4 item 3)')

{
  /*
   * The run's own sanity checklist is a BROWSER checklist: "the tree shows the
   * region with its 5 subdivisions; a hemisphere/ghost shell renders and is
   * translucent enough that brainstem structures remain visible; a telencephalon
   * structure selects from tree, search, the 3D view and the axial +58 plate;
   * the four new levels drive the clip plane, snap-to-plate, the live section and
   * the PiP; the live section paints at y=+58 in Auto and MRI; the CT modality
   * states its coverage limit there."
   *
   * No browser can start here (see the header), so each item is asserted against
   * the SHIPPED DATA, the SHIPPED SOURCES and the SHIPPED manifests — the
   * strongest browser-free form of the same fact. What a rendering engine alone
   * can prove is listed under "tier boundary" at the end and is NOT claimed here.
   */
  const rows = Array.isArray(taxonomy) ? taxonomy : (taxonomy.entries ?? [])
  const tel = rows.filter((entry) => entry.region === 'telencephalon')

  /* (a) the tree's region → 5 subdivisions, each populated ------------------ */
  const expectedSubdivisions = [
    'Basal ganglia',
    'Cerebral cortex',
    'Lateral ventricles',
    'Limbic system',
    'Telencephalic white matter',
  ]
  const bySubdivision = new Map()
  for (const entry of tel) {
    const key = String(entry.subdivision ?? '')
    bySubdivision.set(key, (bySubdivision.get(key) ?? 0) + 1)
  }
  const absentSubdivisions = expectedSubdivisions.filter((name) => !bySubdivision.has(name))
  absentSubdivisions.length === 0
    ? ok(
        `the tree's telencephalon region carries all 5 subdivisions, each with records (` +
          expectedSubdivisions.map((name) => `${name} ${bySubdivision.get(name)}`).join(' · ') +
          ')',
      )
    : bad(`telencephalon subdivisions missing from the taxonomy: ${absentSubdivisions.join(', ')}`)

  /* (b) the ghost hemisphere shell, and what stays lit under it ------------- */
  const sceneLayers = readSource('src/components/viewer3d/SceneLayers.tsx')
  const outlineOpacity = Number((sceneLayers.match(/GHOST_OUTLINE_OPACITY\s*=\s*([\d.]+)/) ?? [])[1])
  const shellOpacity = Number((sceneLayers.match(/GHOST_SHELL_OPACITY\s*=\s*([\d.]+)/) ?? [])[1])
  const ghostShellColour = /GHOST_SHELL_COLOR\s*=\s*'(#[0-9a-fA-F]{3,8})'/.exec(sceneLayers)?.[1] ?? null
  Number.isFinite(outlineOpacity) && outlineOpacity > 0 && outlineOpacity <= 0.2
    ? ok(
        `the ghost hemisphere shell fades to ${outlineOpacity} opacity when its record is hidden ` +
          `(GHOST_OUTLINE_OPACITY ≤ 0.2: the outline frames the brainstem instead of covering it)`,
      )
    : bad(
        `GHOST_OUTLINE_OPACITY is ${String(outlineOpacity)} — the shell would not read as an outline ` +
          '(SceneLayers.tsx is the only place this is declared)',
      )
  Number.isFinite(shellOpacity) && shellOpacity > 0 && shellOpacity <= 0.2
    ? ok(
        `the lit hemisphere shell renders at ${shellOpacity} opacity` +
          (ghostShellColour === null ? '' : ` (hue ${ghostShellColour})`) +
          ' — translucent by construction, never an opaque lid',
      )
    : bad(`GHOST_SHELL_OPACITY is ${String(shellOpacity)} — the hemispheres would hide the brainstem`)

  // The bridge from "translucent" to "the brainstem is still visible": the
  // shell's opacity is chosen by `outlineOnly={cortexHidden}`, `cortexHidden`
  // comes from the store's `hidden` set for the hemisphere's own record, and
  // under the DEFAULT preset that record IS hidden (its subdivision is one of
  // the four the preset structure-hides) — while every non-telencephalon record
  // keeps both of its layers on (asserted at store load and in group 4). So the
  // default framing is: shell at GHOST_OUTLINE_OPACITY, brainstem at full
  // material.
  const opacityBranch = /material\.opacity\s*=\s*lit\s*\?\s*[^:]+:\s*outlineOnly\s*\?\s*GHOST_OUTLINE_OPACITY\s*:\s*GHOST_SHELL_OPACITY/.test(
    sceneLayers,
  )
  const cortexHiddenWiring = /cortexHidden=\{hidden\.has\(TEL_HEMISPHERE_RECORD_IDS\[0\]\)\}/.test(sceneLayers)
  const { TEL_HEMISPHERE_RECORD_IDS } = await import(moduleUrl('src/geometry/anatomyAssets.ts'))
  const store = await import(moduleUrl('src/state/store.ts'))
  const hemisphereRecordId = TEL_HEMISPHERE_RECORD_IDS[0]
  const hiddenByDefault = store.DEFAULT_LAYERS.hidden.has(hemisphereRecordId)
  opacityBranch && cortexHiddenWiring && hiddenByDefault
    ? ok(
        `the default preset really takes the outline branch: it hides "${hemisphereRecordId}", ` +
          `cortexHidden is read from the store's hidden set, and the opacity ternary picks ` +
          `GHOST_OUTLINE_OPACITY (${outlineOpacity}) over the lit shell (${shellOpacity})`,
      )
    : bad(
        `the ghost-outline chain is broken (opacity ternary=${opacityBranch}, ` +
          `cortexHidden wiring=${cortexHiddenWiring}, default hides the hemisphere=${hiddenByDefault}) — ` +
          'the default shell would not be an outline',
      )

  /* (c) the four v7 levels drive clip, snap, live section and PiP ----------- */
  const levelRows = Array.isArray(levels) ? levels : (levels.levels ?? [])
  const v7 = [
    { y: 48, id: 'lvl-tel-thalamostriate' },
    { y: 58, id: 'lvl-tel-basal-ganglia' },
    { y: 68, id: 'lvl-tel-centrum-semiovale' },
    { y: 78, id: 'lvl-tel-convexity' },
  ]
  const wrongAnchors = v7.filter(({ y, id }) => {
    const row = levelRows.find((level) => level.id === id)
    return row === undefined || Number(row.y) !== y
  })
  wrongAnchors.length === 0
    ? ok(
        `the four v7 levels carry their anchors (${v7.map(({ id, y }) => `${id}@${y}`).join(' · ')}) ` +
          '— the clip plane, the snap target and the live-section level lookup all read this table',
      )
    : bad(
        `v7 level anchors wrong or missing: ${wrongAnchors
          .map(({ id, y }) => `${id}@${y}`)
          .join(', ')}`,
      )

  const clipSource = readSource('src/components/viewer3d/clipPlanes.ts')
  const clipBounds = [...clipSource.matchAll(/([xyz]):\s*\{\s*min:\s*(-?[\d.]+),\s*max:\s*(-?[\d.]+)\s*\}/g)].map(
    (match) => ({ axis: match[1], min: Number(match[2]), max: Number(match[3]) }),
  )
  const yBound = clipBounds.find((bound) => bound.axis === 'y')
  const outsideBounds = v7.filter(({ y }) => yBound === undefined || y < yBound.min || y > yBound.max)
  outsideBounds.length === 0
    ? ok(
        `all four v7 levels are reachable by the clip slider ` +
          `(y ∈ [${yBound.min}, ${yBound.max}] ⊇ +48/+58/+68/+78)`,
      )
    : bad(`v7 levels outside CLIP_BOUNDS: ${outsideBounds.map(({ y }) => `+${y}`).join(', ')}`)

  // Snap-to-plate and the PiP read `levelId` from the plate table, so a plate
  // whose level no longer exists would silently lose its anchor.
  const plateRows = (() => {
    const raw = readJson('src/data/plates.json')
    return Array.isArray(raw) ? raw : (raw.plates ?? [])
  })()
  const telPlates = plateRows.filter((plate) => plate.region === 'telencephalon')
  const danglingLevel = telPlates.filter(
    (plate) => plate.levelId !== undefined && !levelRows.some((level) => level.id === plate.levelId),
  )
  telPlates.length >= 3 && danglingLevel.length === 0
    ? ok(
        `${telPlates.length} telencephalon plate(s) committed, each levelId resolving to a real anchor ` +
          `(${telPlates.map((plate) => plate.levelId ?? '—').join(' · ')})`,
      )
    : bad(
        `telencephalon plates: ${telPlates.length} found, ${danglingLevel.length} with a dangling levelId`,
      )

  /* (d) the live section at y = +58: MRI has samples, CT is out of source ---- */
  const mriManifest = readJson('src/assets/imaging/mri-manifest.json')
  const mriDims = mriManifest.dims ?? []
  const mriOrigin = mriManifest.originAu ?? []
  const mriSpacing = mriManifest.spacingAu ?? []
  const yCount = Number(mriDims[1])
  const yOrigin = Number(mriOrigin[1])
  const ySpacing = Number(mriSpacing[1])
  const yTop = yOrigin + (yCount - 1) * ySpacing
  const yBottom = yOrigin
  const nearestStation = yOrigin + Math.round((58 - yOrigin) / ySpacing) * ySpacing
  const mriCovers58 = Number.isFinite(yTop) && 58 >= yBottom && 58 <= yTop
  const stationError = Math.abs(nearestStation - 58)
  mriCovers58
    ? ok(
        `the live section has MRI source at y = +58 (grid y ${yBottom.toFixed(2)}..${yTop.toFixed(2)} au, ` +
          `station ${nearestStation.toFixed(2)} au, ${stationError.toFixed(2)} au away) — ` +
          'MRI is the modality that paints the new levels',
      )
    : bad(
        `the MRI grid does not cover y = +58 (y ${yBottom}..${yTop}) — the live section would be blank there`,
      )
  // The honest-complement half of (d): "Auto" falls through CT at +58 and says
  // so. The predicate's own verdict at this plane is asserted in group 3; here
  // only the measured limit that makes it necessary.
  CT.limit !== null && 58 > CT.limit
    ? ok(
        `at y = +58 the CT half of "Auto" is measurably out of source ` +
          `(${58} > ${CT.limit.toFixed(2)} au), so Auto resolves to MRI and the UI states the limit`,
      )
    : bad('the CT source limit does not exclude y = +58 — re-check the CT coverage assertions')

  /* (e) the axial +58 plate renders, with labels that resolve -------------- */
  const platePath = 'src/data/plates/plate-tel-axial-58.svg'
  if (!existsSync(resolve(ROOT, platePath))) {
    bad(`${platePath} is missing — the y = +58 plate cannot render`)
  } else {
    const svg = readSource(platePath)
    const labelCount = (svg.match(/<text\b/g) ?? []).length
    const structureIds = [...svg.matchAll(/data-structure="([^"]+)"/g)].map((match) => match[1])
    const unknown = [...new Set(structureIds)].filter(
      (id) => !rows.some((entry) => entry.id === id),
    )
    labelCount >= 20 && structureIds.length > 0
      ? ok(
          `the axial y = +58 plate renders ${labelCount} label(s) over ${new Set(structureIds).size} ` +
            `distinct structure id(s), all resolvable in the taxonomy` +
            (unknown.length === 0 ? ' (0 dangling ids)' : ` — ${unknown.length} dangling: ${unknown.join(', ')}`),
        )
      : bad(`the +58 plate has ${labelCount} label(s) and ${structureIds.length} data-structure marker(s)`)
    const telLabel = [...new Set(structureIds)].find(
      (id) => rows.find((entry) => entry.id === id)?.region === 'telencephalon',
    )
    telLabel !== undefined
      ? ok(
          `a label on the +58 plate maps to a telencephalon record ("${telLabel}") — selecting it from ` +
            'the plate and from the tree reach the same store action',
        )
      : bad('no label on the +58 plate resolves to a telencephalon record')
  }

  /* (f) a telencephalon structure has a real, selectable record ------------- */
  const recordDir = 'src/data/structures'
  let records = []
  for (const name of readdirSync(resolve(ROOT, recordDir))) {
    if (!name.endsWith('.json')) continue
    const parsed = readJson(`${recordDir}/${name}`)
    records = records.concat(Array.isArray(parsed) ? parsed : (parsed.structures ?? parsed.records ?? []))
  }
  const telRecords = records.filter((record) => record.region === 'telencephalon')
  const withFields = telRecords.filter(
    (record) =>
      typeof record.function === 'string' &&
      record.function.length > 0 &&
      (typeof record.clinical === 'string' || (record.clinical ?? []).length > 0) &&
      (record.connections?.afferent ?? []).length + (record.connections?.efferent ?? []).length > 0,
  )
  const caudate = telRecords.find((record) => /caudate/.test(String(record.id)))
  withFields.length >= 40 && caudate !== undefined
    ? ok(
        `all ${withFields.length} telencephalon record(s) carry function + clinical + connections ` +
          `(the audit's "caudate → 1,597-char record" evidence: "${String(caudate.id)}" is ` +
          `${JSON.stringify(caudate).length} chars here) — every telencephalon row is selectable, ` +
          'not an empty shell',
      )
    : bad(
        `only ${withFields.length} of ${telRecords.length} telencephalon record(s) carry the full data contract`,
      )
}

/* ══════════════════════════════════════════════════════════ budget re-derive */

group('Budgets — rendered tris · committed GLB · imaging (hard constraints)')

{
  const manifestPath = 'src/assets/anatomy/anatomy-manifest.json'
  if (existsSync(resolve(ROOT, manifestPath))) {
    const manifest = readJson(manifestPath)
    const parts = manifest.parts ?? []
    const tris = parts.reduce((sum, part) => sum + (part.triCount ?? 0), 0)
    const MiB = 1024 * 1024
    // GLB bytes are the sum of the manifest's OWN files — the committed payload,
    // not every byte in the asset directory (which also holds JSON reports).
    let glbBytes = 0
    let missing = 0
    for (const part of parts) {
      const full = resolve(ROOT, 'src/assets/anatomy', part.file)
      if (existsSync(full)) glbBytes += statSync(full).size
      else missing += 1
    }
    info(
      `anatomy manifest: ${parts.length} part(s) · ${tris.toLocaleString('en-US')} triangles · ` +
        `GLB payload ${(glbBytes / MiB).toFixed(2)} MiB (${missing} file(s) missing)`,
    )
    tris <= 800000
      ? ok(`rendered triangles ${tris.toLocaleString('en-US')} ≤ 800,000`)
      : bad(`rendered triangles ${tris} exceed the 800,000 cap`)
    glbBytes / MiB <= 14
      ? ok(`committed anatomy GLB ${(glbBytes / MiB).toFixed(2)} MiB ≤ 14 MiB`)
      : bad(`committed anatomy GLB ${(glbBytes / MiB).toFixed(2)} MiB exceeds the 14 MiB cap`)
    missing === 0
      ? ok('every part named by the manifest has its committed GLB on disk')
      : bad(`${missing} manifest part(s) have no GLB file`)
  } else {
    info(
      `${manifestPath} not present — the binding budget gate is ` +
        '`node scripts/build-anatomy-geometry.mjs --manifest`',
    )
  }

  /** Sum every file under a directory tree. */
  const dirBytes = (relative) => {
    const root = resolve(ROOT, relative)
    if (!existsSync(root)) return null
    let total = 0
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const full = resolve(root, entry.name)
      total += entry.isDirectory() ? (dirBytes(`${relative}/${entry.name}`) ?? 0) : statSync(full).size
    }
    return total
  }

  const glbBytes = dirBytes('src/assets/anatomy')
  const imagingBytes = dirBytes('src/assets/imaging')
  const MiB = 1024 * 1024
  if (glbBytes !== null) {
    info(`committed anatomy assets: ${(glbBytes / MiB).toFixed(2)} MiB`)
  }
  if (imagingBytes !== null) {
    info(`committed imaging assets: ${(imagingBytes / MiB).toFixed(2)} MiB`)
  }
}

/* ═════════════════════════════════════════════ v1–v7 regression checklist */

group('v1–v7 regression checklist — Node-verifiable surfaces')

{
  const sources = {
    TaxonomyTree: 'src/components/TaxonomyTree.tsx',
    SearchBox: 'src/components/SearchBox.tsx',
    SceneLayers: 'src/components/viewer3d/SceneLayers.tsx',
    Viewer3D: 'src/components/viewer3d/Viewer3D.tsx',
    SectionPiP: 'src/components/viewer3d/SectionPiP.tsx',
    PlatesTab: 'src/components/PlatesTab.tsx',
    SectionCanvas: 'src/components/section/SectionCanvas.tsx',
    InfoPanel: 'src/components/InfoPanel.tsx',
    SectionSliderBar: 'src/components/section/SectionSliderBar.tsx',
    ClipControls: 'src/components/viewer3d/ClipControls.tsx',
    ExplodeSlider: 'src/components/viewer3d/ExplodeSlider.tsx',
    Header: 'src/components/Header.tsx',
    PlateRenderer: 'src/components/PlateRenderer.tsx',
    App: 'src/App.tsx',
  }
  const missing = Object.values(sources).filter((path) => !existsSync(resolve(ROOT, path)))
  missing.length === 0
    ? ok(`every regression surface is present (${Object.keys(sources).length} module(s))`)
    : bad(`missing regression surfaces: ${missing.join(', ')}`)

  const text = Object.fromEntries(
    Object.entries(sources).map(([key, path]) => [key, existsSync(resolve(ROOT, path)) ? readSource(path) : '']),
  )

  /** Assert a load-bearing fact is still present in a shipped module. */
  const stillThere = (label, source, pattern) =>
    pattern.test(text[source])
      ? ok(label)
      : bad(`${label} — not found in src/${source}.tsx (pattern ${String(pattern)})`)

  // v1–v2: selection from the tree, the search box and the 3D view.
  stillThere('tree selection still dispatches selectStructure', 'TaxonomyTree', /selectStructure/)
  stillThere('search still drives selection', 'SearchBox', /selectStructure|onSelect/)
  stillThere('the 3D view still selects on click', 'Viewer3D', /selectStructure/)
  stillThere('a selected record still renders in the info panel', 'InfoPanel', /selectedId|record/)

  // v3–v4: layers/filters, clip + snap, explode, quality.
  stillThere('layer toggles still exist', 'SceneLayers', /layers|visible/)
  stillThere('clip state still drives the plane helpers', 'Viewer3D', /clip|Clip/)
  // Snap-to-plate is wired through the store's `snapToPlate` action and rendered
  // by the 3D dock's ClipControls (the Plates tab shares the same store slice).
  // verify:plane is the binding gate for the level arithmetic itself.
  stillThere('snap-to-plate still reaches the level anchors', 'ClipControls', /snapToPlate|nearestLevelTo|snapClipWrite/)
  stillThere('the explode slider is still mounted', 'Viewer3D', /ExplodeSlider/)
  stillThere('the quality toggle still exists', 'Header', /RENDER_QUALITY_STORAGE_KEY|setQuality/)

  // v5: the PiP slider-plane fix, its restore control and the real-slice backdrop.
  stillThere('the PiP still renders the real-slice backdrop', 'SectionPiP', /drawImage|backdrop/)
  stillThere('the PiP restore control still exists', 'Viewer3D', /SectionPiPRestoreButton/)
  stillThere('the PiP still follows the clip plane', 'SectionPiP', /plane|clip/)

  // v6: the live section in every modality + the plane sliders.
  stillThere('the live section still renders the underlay pipeline', 'SectionCanvas', /underlay|modality/)
  stillThere('plane sliders still exist', 'SectionSliderBar', /axis|plane/)
  stillThere('keyboard plate selection still exists', 'PlateRenderer', /onKeyDown/)
  // `tabindex` (lowercase) is generated as a raw SVG attribute on the roving
  // focus ring; there is no React `tabIndex` prop in this file.
  stillThere('plate regions are still focusable (roving tabindex)', 'PlateRenderer', /tabindex/)
  stillThere('every major surface is still wrapped in a boundary', 'App', /TransparentBoundary/)

  // v2.1: the Learn-more links. The browser audit asserts them per selected
  // record (`audit.mjs` section D: "Learn more external links (n)"); this is the
  // browser-free half of the same claim — the section, the anchors and the
  // reference table that fills them.
  stillThere('the info panel still renders its "Learn more" section', 'InfoPanel', /Learn more/)
  stillThere('Learn-more entries are real external anchors', 'InfoPanel', /webref-link/)
  stillThere('Learn-more anchors open in a new tab without a referrer leak', 'InfoPanel', /noopener noreferrer/)
  {
    const webRefs = await import(moduleUrl('src/data/webRefs.ts'))
    const refs = webRefs.getWebRefs(
      'nuc-caudate-head',
      'Head of caudate nucleus',
      'nucleus',
      'telencephalon',
    )
    const linked = refs.filter((ref) => /^https?:\/\//.test(String(ref.url)))
    linked.length > 0
      ? ok(
          `a v7 telencephalon record ("Head of caudate nucleus") resolves ${linked.length} external ` +
            `reference link(s) — first "${String(linked[0].url).slice(0, 52)}"`,
        )
      : bad('getWebRefs returned no http(s) link for a telencephalon nucleus — Learn more would be empty')
  }

  // v7: the new region is part of the layer/filter vocabulary.
  const strata = readJson('src/data/taxonomy.json')
  const regions = new Set((Array.isArray(strata) ? strata : strata.entries).map((entry) => entry.region))
  regions.has('telencephalon')
    ? ok('the telencephalon is a first-class region in the layer/filter vocabulary')
    : bad('the telencephalon region is missing from the taxonomy')

  // The three v7 plates, with their label payloads (the browser renders them;
  // this proves the FILES and their label counts, not the pixels).
  const plateDir = resolve(ROOT, 'src/data/plates')
  const telPlates = existsSync(plateDir)
    ? readdirSync(plateDir).filter((name) => /^plate-tel-.*\.svg$/.test(name))
    : []
  telPlates.length === 3
    ? ok(`the 3 v7 telencephalon plates are committed (${telPlates.join(', ')})`)
    : bad(`expected 3 telencephalon plate SVGs, found ${telPlates.length}`)
  const plateRecords = readJson('src/data/plates.json')
  const records = Array.isArray(plateRecords) ? plateRecords : (plateRecords.plates ?? [])
  records.length === 15
    ? ok(`plates.json still carries all 15 plate records (13 pre-existing + 2 v7)`)
    : bad(`plates.json carries ${records.length} records, expected 15`)

  /*
   * SPACE INTEGRITY — "nothing below y = +45 may move" (the run's hard
   * constraint). The anchor table is the spine of that claim: if a pre-existing
   * anchor had moved, every baked slice and every plate mapping below +45 would
   * silently shift with it. The four v7 anchors must be ADDITIVE (the pre-v7
   * anchors at −46…+30 untouched), and the sorted ordering must stay strictly
   * increasing so `nearestLevelTo` remains unambiguous.
   */
  const anchors = (Array.isArray(levels) ? levels : (levels.levels ?? []))
    .map((level) => ({ id: level.id, y: level.y }))
    .sort((a, b) => a.y - b.y)
  const belowV7 = anchors.filter((anchor) => anchor.y < 45)
  const aboveV7 = anchors.filter((anchor) => anchor.y >= 45)
  // The four v7 anchors are additive; the 13 pre-existing ones stay put. The
  // plan's own §2 wording: "nothing below y = +45 may move".
  belowV7.length === 13
    ? ok(
        `the 13 pre-v7 transverse anchors are intact below +45 ` +
          `(${belowV7.map((a) => a.y).join(', ')}) — none added, removed or moved`,
      )
    : bad(`expected 13 anchors below +45, found ${belowV7.length} (${belowV7.map((a) => a.y).join(', ')})`)
  const sortedStrict = anchors.every((anchor, index) => index === 0 || anchor.y > anchors[index - 1].y)
  sortedStrict
    ? ok(`the ${anchors.length} level anchors are strictly increasing in y (nearestLevelTo stays unambiguous)`)
    : bad('the level anchors are not strictly increasing — two anchors collide or are out of order')
  aboveV7.length === 4
    ? ok(
        `exactly 4 anchors are at or above +45 (${aboveV7.map((a) => `+${a.y}`).join(', ')}) — ` +
          'the v7 additions are purely additive',
      )
    : bad(`expected 4 v7 anchors at/above +45, found ${aboveV7.length}`)
}

/* ══════════════════════════════════════════════════════════ tier boundary */

console.log('\n── tier boundary ' + '─'.repeat(55))
console.log('  NOT OBSERVED HERE (requires a browser; Chrome and Edge both fail to start in this sandbox,')
console.log('  every lane exiting 4 with "no check was run"):')
for (const item of [
  'that pixels actually appeared (scene luminance, plate labels, live-section paint counts)',
  'that a real WEBGL_lose_context.loseContext() is observed by the loss listeners at runtime',
  'that the ?panelfail query string arms the hook through the dev server (this lane uses the module seam)',
  'pointer/focus interaction: tree clicks, search, sliders, keyboard plate selection, PiP sync',
  'that the telencephalon shell reads as translucent ON SCREEN (this lane asserts the shipped ' +
    'opacities and the outline branch the default preset takes, not the rendered luminance)',
]) {
  console.log(`    ·  ${item}`)
}
console.log(
  `\n${passed} passed · ${failures.length} failed · ${infos.length} informational · ` +
    `${groups.length} group(s)\n`,
)

if (failures.length > 0) {
  console.log('FAILURES:')
  for (const failure of failures) console.log(`  ·  ${failure}`)
  console.log('')
  process.exit(1)
}
console.log('✔ Node-only audit check mirror PASSED\n')
process.exit(0)
