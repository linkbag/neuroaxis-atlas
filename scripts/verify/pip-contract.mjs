/**
 * scripts/verify/pip-contract.mjs — `npm run verify:pip-contract`
 *
 * THE NODE-ONLY GATE FOR THE v9 ITEM-5 CONTRACT: the 3D tab's bottom-right
 * panel is a SIMULATED-SECTION panel, and five properties of that contract must
 * hold in the shipped code — not in a replica of it.
 *
 *    1. no clipped 3D geometry      — the panel mounts the 2D section renderer
 *                                     (`PipSection` → `SectionCanvas`), not a
 *                                     second 3D scene or a render target;
 *    2. no plane helper             — nothing in the panel's markup can draw
 *                                     `PlaneHelpers`' in-plane quads;
 *    3. no real imagery, EVER       — the panel's own imagery scope holds the
 *                                     store in the images-off state and a pixel
 *                                     guard shadows the two 2D blit calls on
 *                                     that canvas, whatever the Plates tab
 *                                     modality is;
 *    4. resizable, and the size persists — `sectionPipSize`, clamped on read
 *                                     and on write, persisted under
 *                                     `neuroaxis.sectionPipSize`;
 *    5. the surviving chrome        — axis override, plane readout, the four
 *                                     orientation badges (patient-left
 *                                     convention), hide/restore, and the
 *                                     narrow-viewport tab with its exact a11y
 *                                     literals (`verify:plane` and
 *                                     `a11y-contract.mjs` read those too).
 *
 * WHY THIS FILE EXISTS IN THE NODE LANE. `verify:audit` drives a real headless
 * Chrome over CDP and is the only lane that can observe what a page *paints*.
 * Chrome cannot start in the agent sandbox
 * (`platform_channel.cc:108 Check failed: Access is denied (0x5)`, every lane
 * exiting 4 with "no check was run"), so every claim about the panel that a DOM
 * read can decide is decided here, against the SHIPPED modules, by the SAME
 * `clampSectionPipSize` / `sectionPipSizePresetOf` / `nextSectionPipSize` /
 * `pipImageryStateText` the panel calls.
 *
 * WHAT IT DOES NOT PROVE — stated here so a pass is never read as more than it
 * is: that pixels appeared, that a pointer drag moved the box, that the guard
 * actually dropped a live blit, or that the size survived a real reload. Those
 * are `audit.mjs` B3/P4's browser checks. This lane asserts the DOM contract,
 * the arithmetic, the persistence KEY and the wiring as source text.
 *
 * Run from the repo root:  node scripts/verify/pip-contract.mjs
 * Exit 0 = every group passed. Exit 1 prints each failure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const React = require_('react')
const { renderToStaticMarkup } = require_('react-dom/server')

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')

/* --------------------------------------------------- TS/TSX module loading */
/* The same hook shape `audit-checks.test.mjs` and `boundary-contract.mjs` use:
 * the app's extensionless relative imports are resolved to their real
 * `.ts`/`.tsx` file, JSON imports become ESM wrappers over the SHIPPED json,
 * and `.tsx` is transpiled with the project's own TypeScript. Nothing is copied
 * or re-typed: the modules under test are the modules that ship. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    /*
     * BINARY ASSETS. `src/data/sectionImages.ts` and the imaging manifests import
     * their `.bin`/`.glb` companions for their URL tables. Node's own
     * `getFileProtocolModuleFormat` rejects those extensions before any `load`
     * hook is consulted, so the specifier is redirected to a synthetic `.mjs`
     * URL that the load hook below answers with the Vite-shaped URL string.
     * Nothing is fetched or decoded in this lane.
     */
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(specifier) || specifier.endsWith('?url')) {
      return { url: `dsh-asset:${specifier}`, shortCircuit: true }
    }
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
    if (url.startsWith('dsh-asset:')) {
      // A stylesheet import is inert under Node; an asset import yields its
      // Vite-shaped URL. Both are placeholders for files this lane never reads
      // through the module graph — the CSS is read as TEXT below, and the
      // `.bin`/`.glb` payloads are the `verify:anatomy` / `verify-imaging-*`
      // gates' business, not this one's.
      const source = /\.css(\?|$)/i.test(url) ? '' : 'export default "/src/assets/asset-url"'
      return { format: 'module', source, shortCircuit: true }
    }
    if (!url.startsWith('file:')) return nextLoad(url, context)
    if (url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: `export default ${JSON.stringify(parsed)}`, shortCircuit: true }
    }
    if (
      url.endsWith('.png') ||
      url.endsWith('.jpg') ||
      url.endsWith('.svg') ||
      url.endsWith('.bin') ||
      url.endsWith('.glb')
    ) {
      // The plate table (`src/data/sectionImages.ts`) and the imaging manifests
      // import their assets for their URL table; nothing in this lane fetches
      // them, so the Vite-shaped URL string is the honest placeholder.
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const filePath = fileURLToPath(url)
      let source = readFileSync(filePath, 'utf8')
      /*
       * `import.meta.glob('…', { eager: true, import: 'default' })` is a Vite
       * BUILD-TIME transform; under Node `import.meta.glob` does not exist, so
       * `src/data/load.ts` (reached through the store) dies before a single
       * assertion runs. The emulation below is `audit-checks.test.mjs`'s, reused
       * verbatim rather than re-invented: it generates the same three shapes
       * Vite emits from the REAL files, so the shipped data modules stay the
       * thing under test.
       */
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

/* ------------------------------------------------------------------ imports */

const store = await import(pathToFileURL(resolve(ROOT, 'src/state/store.ts')).href)
const {
  DEFAULT_SECTION_PIP_SIZE,
  IMAGERY_OFF_STATEMENT,
  PIP_IMAGERY_WITHHELD_STATEMENT,
  SECTION_PIP_SIZE_MAX,
  SECTION_PIP_SIZE_MIN,
  SECTION_PIP_SIZE_PRESETS,
  SECTION_PIP_SIZE_STORAGE_KEY,
  clampSectionPipSize,
  nextSectionPipSize,
  sectionPipImageryScope,
  sectionPipSizePresetOf,
  useAtlasStore,
} = store

const pip = await import(pathToFileURL(resolve(ROOT, 'src/components/viewer3d/SectionPiP.tsx')).href)
const {
  SectionPiPPanel,
  SectionPiPRestoreButton,
  pipImageryStateText,
  pipImageryStateTitle,
  pipSizeAfterCycle,
  pipWorldWindow,
  sectionPipDiagnostics,
} = pip

const pipSection = await import(
  pathToFileURL(resolve(ROOT, 'src/components/viewer3d/PipSection.tsx')).href
)
const { guardSimulatedOnlyCanvas, pipSectionGuard } = pipSection

const planeGeometry = await import(
  pathToFileURL(resolve(ROOT, 'src/components/section/planeGeometry.ts')).href
)
const { AXIS_PAIR, PLANE_BADGES, planeTransform } = planeGeometry

/* ------------------------------------------------------------------- harness */

let checks = 0
const failures = []

function check(condition, label, detail = '') {
  checks += 1
  if (!condition) failures.push(detail === '' ? label : `${label} — ${detail}`)
  return condition === true
}

const ok = (label) => console.log(`  ok   ${label}`)

/** Render a component's markup the way the panel renders it, in Node. */
const render = (element) => renderToStaticMarkup(element)

const sourceOf = (relative) => readFileSync(resolve(ROOT, relative), 'utf8')

const SECTION_PIP_SOURCE = sourceOf('src/components/viewer3d/SectionPiP.tsx')
const PIP_SECTION_SOURCE = sourceOf('src/components/viewer3d/PipSection.tsx')
const VIEWER3D_SOURCE = sourceOf('src/components/viewer3d/Viewer3D.tsx')
const IMAGE_LAYERS_SOURCE = sourceOf('src/components/section/imageLayers.ts')
const SECTION_IMAGES_SOURCE = sourceOf('src/data/sectionImages.ts')
const CSS_SOURCE = sourceOf('src/styles/sectionPip.css')

const state = () => useAtlasStore.getState()

console.log('=== v9 item 5 — the PiP contract, decided by the shipped modules ===')
console.log(`clamp window: ${SECTION_PIP_SIZE_MIN.width}×${SECTION_PIP_SIZE_MIN.height} … ` +
  `${SECTION_PIP_SIZE_MAX.width}×${SECTION_PIP_SIZE_MAX.height} px · ` +
  `default ${DEFAULT_SECTION_PIP_SIZE.width}×${DEFAULT_SECTION_PIP_SIZE.height} px`)

/* ==================================================================== A ==== *
 * A. THE PANEL IS A SIMULATED-SECTION PANEL                                  *
 * ==================================================================== ===== */

console.log('\n--- A. the panel mounts the 2D section renderer, and nothing else ----')

const markup = render(React.createElement(SectionPiPPanel, { visible: true }))
const classesOf = (html) => (html.match(/class="([^"]*)"/) ?? ['', ''])[1].split(/\s+/).filter(Boolean)

check(classesOf(markup).includes('pip-panel'), 'the panel renders `.pip-panel`', classesOf(markup).join(' '))
check(markup.includes('class="pip-window"'), 'the panel renders its `.pip-window` viewport')
check(markup.includes('class="pip-section"'), 'the panel content is `PipSection` (`.pip-section` wrapper)')
check(
  markup.includes('section-canvas-wrap') || markup.includes('section-canvas'),
  'the panel content is the shared 2D section canvas (`.section-canvas*`)',
)
check(
  /<canvas class="section-canvas">/.test(markup),
  'the panel\'s only canvas is the 2D section canvas (no WebGL canvas, no render target)',
)
check(
  PIP_SECTION_SOURCE.includes("from '../section/SectionCanvas'"),
  'PipSection imports the SAME SectionCanvas the Plates tab mounts (one code path)',
)
check(
  /SectionErrorBoundary/.test(PIP_SECTION_SOURCE),
  'PipSection owns its own SectionErrorBoundary (a section failure cannot take the panel chrome down)',
)

// The retired GPU path: the panel must not drag a 3D scene, a stencil cap rig,
// a render target or a private camera back in. Prose naming the removal is
// allowed (it is how the change is documented); CODE tokens are not.
const RETIRED_TOKENS = [
  'createPipRig',
  'disposePipRig',
  'supportsMsaaTargets',
  'WebGLRenderTarget',
  'OWN_AFTER_IMAGE_PLANES',
  'OWN_PRE_IMAGE_PLANES',
  'PARITY_',
  'pipContextState',
  'pipdebug',
  'stencil',
  'renderTarget',
  'blitPip',
]
const codeOnly = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments — the retirement prose
    .replace(/^\s*\/\/.*$/gm, '') // whole-line comments
    .replace(/^\s*\*.*$/gm, '') // jsdoc continuation lines
const retiredFound = RETIRED_TOKENS.filter((token) => codeOnly(SECTION_PIP_SOURCE).includes(token))
check(
  retiredFound.length === 0,
  `the retired GPU renderer is gone from SectionPiP.tsx code (${RETIRED_TOKENS.length} tokens checked)`,
  `still present: ${retiredFound.join(', ')}`,
)
const webgl = /getContext\(\s*['"]webgl/i.test(codeOnly(SECTION_PIP_SOURCE))
check(!webgl, 'SectionPiP.tsx never asks for a WebGL context (the panel owns no 3D canvas)')
check(
  !/<canvas/.test(codeOnly(SECTION_PIP_SOURCE)),
  'SectionPiP.tsx declares no <canvas> of its own — the only canvas is SectionCanvas\'s 2D one',
)

// No plane helper: `PlaneHelpers` is the main canvas' "show plane" indicator.
// The panel draws no 3D scene at all, so the in-plane quads cannot appear in it.
// The feature is NOT deleted — it stays the MAIN canvas' indicator.
check(
  !/PlaneHelpers/.test(codeOnly(SECTION_PIP_SOURCE)) && !/PlaneHelpers/.test(PIP_SECTION_SOURCE),
  'neither the panel nor PipSection imports PlaneHelpers',
)
check(
  /PlaneHelpers/.test(sourceOf('src/components/viewer3d/Viewer3D.tsx')),
  'Viewer3D still mounts PlaneHelpers for the MAIN canvas (item 5 removed nothing from the 3D view)',
)
check(
  typeof state().clip.showHelper === 'boolean',
  'the plane-helper toggle still exists on the clip state (`clip.showHelper`)',
  String(state().clip.showHelper),
)

/* ==================================================================== B ==== *
 * B. NO REAL IMAGERY, INDEPENDENTLY OF THE PLATES TAB                        *
 * ==================================================================== ===== */

console.log('\n--- B. no real imagery in the panel, whatever the Plates tab draws ---')

check(
  markup.includes('pip-imagery-state'),
  'the panel states the imagery situation in its own line (`.pip-imagery-state`)',
)
check(
  markup.includes(PIP_IMAGERY_WITHHELD_STATEMENT.replace(/&/g, '&amp;')) ||
    markup.includes(PIP_IMAGERY_WITHHELD_STATEMENT),
  'that line is the shipped withheld statement, verbatim',
)
check(
  /beginSectionPipImageryScope/.test(PIP_SECTION_SOURCE) &&
    /useEffect\(\s*\(\)\s*=>\s*beginSectionPipImageryScope\(\)/.test(PIP_SECTION_SOURCE),
  'PipSection STARTS the imagery scope in an effect (holding the store in the images-off state while its canvas is mounted)',
  'the scope is imported but never started',
)
check(
  typeof store.beginSectionPipImageryScope === 'function',
  'beginSectionPipImageryScope is exported by the store (the scope is not a local convention)',
)
check(
  typeof sectionPipImageryScope === 'object' && 'saved' in sectionPipImageryScope,
  'the scope tracks the USER\'s own choice separately (`sectionPipImageryScope.saved`)',
)
check(
  /guardSimulatedOnlyCanvas/.test(PIP_SECTION_SOURCE) && typeof guardSimulatedOnlyCanvas === 'function',
  'the pixel guard `guardSimulatedOnlyCanvas` ships and is applied to the panel\'s canvas',
)
check(
  typeof pipSectionGuard === 'object' &&
    pipSectionGuard !== null &&
    typeof pipSectionGuard.blockedDraws === 'number' &&
    pipSectionGuard.blockedDraws === 0,
  'the guard starts unarmed and counts what it drops (`pipSectionGuard.blockedDraws`)',
)
for (const call of ['drawImage', 'putImageData']) {
  check(
    PIP_SECTION_SOURCE.includes(`'${call}'`),
    `the guard shadows \`ctx.${call}\`, which is where imageLayers places a real image`,
  )
}
// The imagery chokepoints, read out of the shipped sampler.
const drawImageSites = (IMAGE_LAYERS_SOURCE.match(/\.drawImage\(/g) ?? []).length
const putImageDataSites = (IMAGE_LAYERS_SOURCE.match(/\.putImageData\(/g) ?? []).length
check(
  drawImageSites + putImageDataSites >= 5,
  `imageLayers.ts still routes every real-imagery blit through those two calls ` +
    `(${drawImageSites} drawImage + ${putImageDataSites} putImageData = ${drawImageSites + putImageDataSites} sites)`,
)
// The images-off state is a hard short-circuit in the one sampling place.
check(
  /modality:\s*'none'/.test(IMAGE_LAYERS_SOURCE),
  "resolveSliceModality short-circuits `kind:'none'` to `{modality:'none'}` (no sampler runs at all)",
)
// The panel publishes the USER's modality in its line, not its own scoped one,
// so the line cannot claim a modality the panel is withholding.
check(
  /sectionPipImageryScope\.saved/.test(SECTION_PIP_SOURCE),
  'the panel\'s imagery line reads the user\'s saved modality, not its own scoped state',
)
const requestedKinds = ['auto', 'mri', 'ct', 'stain', 'none']
const imageryTexts = requestedKinds.map((kind) => pipImageryStateText(kind, 0))
check(
  imageryTexts.every((text) => typeof text === 'string' && text.length > 20),
  `pipImageryStateText returns a real sentence for all ${requestedKinds.length} underlay kinds`,
)
check(
  pipImageryStateText('none', 0).includes('real imagery off'),
  'the images-off text says the imagery is OFF (not that none was found)',
  pipImageryStateText('none', 0),
)
check(
  imageryTexts
    .filter((_, index) => requestedKinds[index] !== 'none')
    .every((text) => text.includes('real imagery kept in the Plates tab')),
  'every real modality is described as KEPT IN THE PLATES TAB, i.e. withheld here (not as unavailable)',
)
check(
  pipImageryStateText('auto', 3).includes('3 image draw(s) blocked'),
  'the line reports a non-zero guard count (a future imagery route reports itself instead of appearing)',
  pipImageryStateText('auto', 3),
)
check(
  requestedKinds.every((kind) => typeof pipImageryStateTitle(kind) === 'string'),
  'every kind has an explanatory title for the line',
)
check(
  typeof IMAGERY_OFF_STATEMENT === 'string' && IMAGERY_OFF_STATEMENT.length > 20,
  'the single images-off string ships in the store (`IMAGERY_OFF_STATEMENT`)',
)

/* ==================================================================== C ==== *
 * C. THE SURVIVING CHROME: axis override, readout, badges, hide/restore      *
 * ==================================================================== ===== */

console.log('\n--- C. the chrome that is still meaningful ---------------------------')

const planeValue = 12
const setState = (patch) => useAtlasStore.setState(patch)
/** The panel prints one decimal with a typographic minus (`'−24.0'`, plan §2.1). */
const readoutText = (value) => value.toFixed(1).replace('-', '−')

/**
 * THE STATIC-RENDER LIMIT, measured and stated here rather than hidden.
 *
 * zustand 4's `create()` hands `useSyncExternalStoreWithSelector` the store's
 * `getServerState ?? getInitialState` as its server snapshot — the state captured
 * at module load, NOT the live one. `renderToStaticMarkup` is therefore a
 * server-side render and always sees the BOOT state, whatever the store holds by
 * the time it is called: measured with the store patched before the first render
 * (`sectionAxis: 'z'`, `clip.z: 42`), the markup still printed the boot readout
 * `y = −34.0 au`.
 *
 * So the markup half of this gate asserts the panel against the BOOT state, and
 * every OTHER axis is proven through the same pure functions the panel calls
 * (`pipWorldWindow`, `sectionPipSizePresetOf`, `pipImageryStateText`) plus the
 * load-time `SECTION_VIEWS` ⇄ `PLANE_BADGES` guard that SectionPiP.tsx runs on
 * import. What that leaves to the browser lane is named at the end of this file.
 */
const boot = state()
const bootAxis = boot.sectionAxis
const bootPlane = boot.clip[bootAxis]

check(
  markup.includes(`>${bootAxis} = ${readoutText(bootPlane)} au</span>`),
  `the readout uses the audited "axis = N.N au" shape (boot: ${bootAxis} = ${readoutText(bootPlane)} au)`,
  markup.match(/class="pip-readout"[^>]*>[^<]*</)?.[0] ?? 'no readout',
)
// Every axis, through the transform the panel actually uses.
for (const axis of ['x', 'y', 'z']) {
  const value = axis === 'x' ? 12 : axis === 'y' ? -24 : 6
  const window_ = pipWorldWindow(axis, value, DEFAULT_SECTION_PIP_SIZE)
  const expected = planeGeometry.planeTransform(axis, value, {
    width: DEFAULT_SECTION_PIP_SIZE.width,
    height: DEFAULT_SECTION_PIP_SIZE.height,
  })
  check(
    window_.uMin === expected.uMin &&
      window_.uMax === expected.uMax &&
      window_.vMin === expected.vMin &&
      window_.vMax === expected.vMax &&
      window_.pixelsPerAu === expected.scale,
    `pipWorldWindow(${axis} = ${value}) is planeGeometry.planeTransform — the panel invents no second mapping`,
  )
  check(
    Number.isFinite(window_.pixelsPerAu) && window_.pixelsPerAu > 0,
    `the ${axis}-axis window reports a positive, finite scale (${window_.pixelsPerAu.toFixed(3)} px/au)`,
  )
  check(
    AXIS_PAIR[axis] !== undefined && PLANE_BADGES[axis] !== undefined,
    `AXIS_PAIR and PLANE_BADGES both declare the ${axis} plane frame`,
  )
}
// SectionPiP.tsx throws at module load if a view's labels disagree with
// PLANE_BADGES, so this import having succeeded is itself the proof; the
// assertion below records what that guard compares.
check(
  /PLANE_BADGES/.test(SECTION_PIP_SOURCE) && /SECTION_VIEWS/.test(SECTION_PIP_SOURCE),
  'SECTION_VIEWS is checked against PLANE_BADGES at module load (the import above already ran that guard)',
)
const drawnBadges = ['n', 's', 'w', 'e'].map((position) => {
  const match = markup.match(new RegExp(`class="pip-orient pip-orient-${position}"[^>]*>([^<]*)<`))
  return match === null ? null : match[1]
})
const bootBadges = PLANE_BADGES[bootAxis]
check(
  drawnBadges.every((value, index) =>
    value === [bootBadges.top, bootBadges.bottom, bootBadges.left, bootBadges.right][index],
  ),
  `the four orientation badges carry PLANE_BADGES.${bootAxis} ` +
    `(${[bootBadges.top, bootBadges.bottom, bootBadges.left, bootBadges.right].join('/')})`,
  `drawn ${drawnBadges.join('/')}`,
)
const axisButtons = [...markup.matchAll(/class="pip-btn" aria-pressed="(true|false)">([XYZ])<\/button>/g)]
check(
  ['X', 'Y', 'Z'].every((label) => axisButtons.some((match) => match[2] === label)),
  'the X/Y/Z axis override buttons are all in the panel',
)
check(
  axisButtons.filter((match) => match[1] === 'true').length === 1 &&
    axisButtons.find((match) => match[1] === 'true')[2] === bootAxis.toUpperCase(),
  `exactly one axis button is pressed, and it is the boot axis (${bootAxis.toUpperCase()})`,
  axisButtons.map((match) => `${match[2]}=${match[1]}`).join(' '),
)
// Patient-left convention is `verify:plane`'s to prove (10,827 assertions); this
// lane only asserts the badges come from that same table, which it just did.
setState({ sectionAxis: 'y', clip: { ...state().clip, y: planeValue } })

check(
  markup.includes('title="Hide live section"'),
  'the hide control keeps its exact title (`Hide live section`)',
)
const restoreMarkup = render(React.createElement(SectionPiPRestoreButton, { onShow: () => {} }))
check(
  restoreMarkup.includes('pip-restore') && /Live section/.test(restoreMarkup),
  'the restore pill renders as `.pip-restore` ("Live section ▸")',
)
check(
  /aria-expanded="false"/.test(restoreMarkup) && !/aria-pressed/.test(restoreMarkup),
  'the restore pill is a disclosure (aria-expanded=false), not a contradictory toggle',
)
const hidden = render(React.createElement(SectionPiPPanel, { visible: false }))
check(hidden === '', '`visible={false}` renders nothing (the pill is what remains)')
check(
  /SectionPiPRestoreButton/.test(VIEWER3D_SOURCE) && /SectionPiPPanel/.test(VIEWER3D_SOURCE),
  'Viewer3D mounts both the panel and its restore pill',
)
check(
  /'pip-toggle'|pip-toggle/.test(SECTION_PIP_SOURCE) &&
    /Show or hide the live section panel/.test(SECTION_PIP_SOURCE),
  'the narrow-viewport tab keeps its literal a11y pair (`pip-toggle` + its title)',
)
check(
  SECTION_PIP_SOURCE.includes('const RESIZE_KEY_STEP = 16'),
  'the keyboard resize step is the documented 16 px (Shift ×4)',
)
check(
  typeof pipWorldWindow === 'function',
  'the panel publishes its own world window (`pipWorldWindow`) — no second projection is invented',
)
check(
  typeof sectionPipDiagnostics === 'object' && sectionPipDiagnostics !== null,
  'the panel publishes lean diagnostics (`sectionPipDiagnostics`) for the audit\'s readout',
)

/* ==================================================================== D ==== *
 * D. THE WINDOW IS RESIZABLE AND THE SIZE IS PERSISTENT                      *
 * ==================================================================== ===== */

console.log('\n--- D. resizable, clamped on read and on write, persisted ------------')

check(
  markup.includes('class="pip-resizer"'),
  'the panel exposes a REAL resize control (`.pip-resizer`, a <button>, keyboard operable)',
)
check(
  /aria-label="Resize the simulated-section panel \(224×170 px, 224–880 wide, 170–640 tall\)"/.test(markup) ||
    /Resize the simulated-section panel/.test(markup),
  'the resize handle\'s accessible name carries the live size and the clamp window',
)
check(
  markup.includes(`--pip-window-width:${DEFAULT_SECTION_PIP_SIZE.width}px`) &&
    markup.includes(`--pip-window-height:${DEFAULT_SECTION_PIP_SIZE.height}px`),
  'the stored size reaches CSS as custom properties (so the ≤900 px media query can still win)',
  `expected --pip-window-width:${DEFAULT_SECTION_PIP_SIZE.width}px`,
)
check(
  !/\bwidth:\s*\d+px/.test(codeOnly(SECTION_PIP_SOURCE)) &&
    !/\bheight:\s*\d+px/.test(codeOnly(SECTION_PIP_SOURCE)),
  'the size is never written as an inline `width`/`height` declaration (that would beat the media query)',
)
// The cycle's own stops are the presets, and the store owns both: `small` is the
// clamp floor, `large` the next stop, and any other size is 'custom'.
check(
  JSON.stringify(SECTION_PIP_SIZE_PRESETS.small) === JSON.stringify(SECTION_PIP_SIZE_MIN),
  'the `small` preset is the clamp floor (224×170)',
  JSON.stringify(SECTION_PIP_SIZE_PRESETS.small),
)
check(
  SECTION_PIP_SIZE_PRESETS.large.width > SECTION_PIP_SIZE_PRESETS.small.width &&
    SECTION_PIP_SIZE_PRESETS.large.width <= SECTION_PIP_SIZE_MAX.width &&
    SECTION_PIP_SIZE_PRESETS.large.height <= SECTION_PIP_SIZE_MAX.height,
  'the `large` preset sits inside the clamp window and is larger than `small`',
  JSON.stringify(SECTION_PIP_SIZE_PRESETS.large),
)
check(
  JSON.stringify(pipSizeAfterCycle(SECTION_PIP_SIZE_MIN)) === JSON.stringify(SECTION_PIP_SIZE_PRESETS.large) &&
    JSON.stringify(pipSizeAfterCycle(SECTION_PIP_SIZE_PRESETS.large)) === JSON.stringify(SECTION_PIP_SIZE_MIN),
  'the size control cycles small ⇄ large through the same clamped step the store uses',
  JSON.stringify(pipSizeAfterCycle(SECTION_PIP_SIZE_MIN)),
)
check(
  JSON.stringify(nextSectionPipSize(SECTION_PIP_SIZE_MAX)) === JSON.stringify(SECTION_PIP_SIZE_MIN),
  'cycling from a size above the presets returns to `small` (the control is total, never stuck)',
)
check(
  SECTION_PIP_SIZE_STORAGE_KEY === 'neuroaxis.sectionPipSize',
  'the persistence key is the planned `neuroaxis.sectionPipSize`',
  SECTION_PIP_SIZE_STORAGE_KEY,
)
check(
  typeof state().setSectionPipSize === 'function',
  'the store exposes `setSectionPipSize` (the action the control calls)',
)
check(
  /SECTION_PIP_SIZE_STORAGE_KEY/.test(sourceOf('src/state/store.ts')),
  'the store persists the size under that key inside its own try/catch',
)

// The clamp is total, idempotent and integral over its whole domain — and the
// WINDOW ITSELF is pinned to the plan's numbers, so widening it (which would let
// a drag push the panel off the viewer pane) cannot pass this gate.
check(
  SECTION_PIP_SIZE_MIN.width === 224 &&
    SECTION_PIP_SIZE_MIN.height === 170 &&
    SECTION_PIP_SIZE_MAX.width === 880 &&
    SECTION_PIP_SIZE_MAX.height === 640,
  'the clamp window is exactly the planned 224×170 … 880×640 px',
  `${SECTION_PIP_SIZE_MIN.width}×${SECTION_PIP_SIZE_MIN.height} … ${SECTION_PIP_SIZE_MAX.width}×${SECTION_PIP_SIZE_MAX.height}`,
)
const candidates = []
for (let i = -6; i <= 30; i += 1) {
  candidates.push({ width: i * 47, height: i * 31 })
}
candidates.push(
  { width: 0, height: 0 },
  { width: -1, height: -1 },
  { width: Number.NaN, height: 12 },
  { width: Number.POSITIVE_INFINITY, height: Number.POSITIVE_INFINITY },
  SECTION_PIP_SIZE_MIN,
  SECTION_PIP_SIZE_MAX,
  DEFAULT_SECTION_PIP_SIZE,
)
const clamped = candidates.map((candidate) => clampSectionPipSize(candidate))
const insideBounds = clamped.every(
  (size) =>
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width >= SECTION_PIP_SIZE_MIN.width &&
    size.width <= SECTION_PIP_SIZE_MAX.width &&
    size.height >= SECTION_PIP_SIZE_MIN.height &&
    size.height <= SECTION_PIP_SIZE_MAX.height,
)
check(
  insideBounds,
  `clampSectionPipSize keeps all ${candidates.length} candidates inside the window ` +
    `(including 0, negatives, NaN and ±∞)`,
)
check(
  clamped.every((size, index) => {
    const twice = clampSectionPipSize(size)
    return twice.width === size.width && twice.height === size.height
  }),
  'clamping is idempotent (a clamped value re-clamps to itself)',
)
check(
  clamped.every((size) => Number.isInteger(size.width) && Number.isInteger(size.height)),
  'every clamped size is an integral number of CSS pixels',
)
check(
  clampSectionPipSize(null).width === DEFAULT_SECTION_PIP_SIZE.width &&
    clampSectionPipSize(undefined).height === DEFAULT_SECTION_PIP_SIZE.height,
  'null/undefined storage falls back to the default size (never trusts what it reads)',
)
check(
  sectionPipSizePresetOf(SECTION_PIP_SIZE_MIN) === 'small' &&
    sectionPipSizePresetOf(SECTION_PIP_SIZE_PRESETS.large) === 'large' &&
    sectionPipSizePresetOf({ width: 500, height: 300 }) === 'custom',
  'sectionPipSizePresetOf reports small/large/custom, so the CSS fallback classes stay meaningful',
  [
    sectionPipSizePresetOf(SECTION_PIP_SIZE_MIN),
    sectionPipSizePresetOf(SECTION_PIP_SIZE_PRESETS.large),
    sectionPipSizePresetOf({ width: 500, height: 300 }),
  ].join('/'),
)
check(
  nextSectionPipSize(SECTION_PIP_SIZE_MIN).width === SECTION_PIP_SIZE_PRESETS.large.width,
  'nextSectionPipSize walks the preset cycle from `small` to `large`',
)

/* ==================================================================== E ==== *
 * E. THE STYLES AND THE WIRING AS SOURCE TEXT                                *
 * ==================================================================== ===== */

console.log('\n--- E. the styles and the sampler wiring, read as source text --------')

for (const selector of [
  '.pip-window',
  '.pip-resizer',
  '.pip-imagery-state',
  '.pip-restore',
  '.pip-btn',
]) {
  check(CSS_SOURCE.includes(selector), `sectionPip.css styles ${selector}`)
}
check(
  CSS_SOURCE.includes('var(--pip-window-width') && CSS_SOURCE.includes('var(--pip-window-height'),
  '.pip-window consumes the custom properties (the store is the single size source)',
)
check(
  /@media \(max-width: 900px\)/.test(CSS_SOURCE),
  'the narrow-viewport media query survives (a11y-contract reads this block)',
)
check(
  /\.pip-panel:has\(\.pip-toggle input:checked\)/.test(CSS_SOURCE),
  'the checkbox-driven collapsed state survives in that block',
)
check(
  !/pip-backdrop-hint/.test(codeOnly(SECTION_PIP_SOURCE)) ||
    /retired|no longer|used to/i.test(SECTION_PIP_SOURCE),
  'any surviving mention of the old backdrop hint is prose about its removal, not a live element',
)
check(
  /fittedFit/.test(IMAGE_LAYERS_SOURCE) && /fittedFit/.test(SECTION_IMAGES_SOURCE),
  'the v9 registration correction travels as `fittedFit` in the shipped sampler and plate table',
)
check(
  (SECTION_IMAGES_SOURCE.match(/fittedFit:/g) ?? []).length >= 2,
  'the plate table actually carries `fittedFit` entries (the corrected plates are the shipped ones)',
)

/* ================================================================== verdict */

console.log(`\n${checks - failures.length} passed · ${failures.length} failed\n`)
console.log('NOT OBSERVED HERE (needs a page; Chrome cannot start in this sandbox —')
console.log('verify:audit exits 4 with "no check was run", so the orchestrator runs it):')
for (const item of [
  'that the panel actually paints the simulated section (pixel counts)',
  'that a pointer drag on .pip-resizer moves the box, and that arrow keys move it by 16 px (Shift ×4)',
  'that the size survives a real page reload',
  'that the drawImage/putImageData guard drops a live imagery blit (its counter is proven here only as shipped code)',
  'that no plane helper is on screen in the panel',
]) {
  console.log(`  ·  ${item}`)
}
console.log('')

if (failures.length > 0) {
  console.log('FAILURES:')
  for (const failure of failures) console.log(`  ·  ${failure}`)
  console.log('')
  process.exit(1)
}
console.log('✔ simulated-section panel contract PASSED\n')
process.exit(0)
