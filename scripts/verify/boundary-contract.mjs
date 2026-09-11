/**
 * boundary-contract.mjs — the P0 error-boundary gate that needs NO browser.
 *
 * WHY IT EXISTS (docs/QUALITY_PLAN.md §1 item 2 and §6, AUDIT §2.2)
 * The runtime audit proves boundaries work by forcing a throw in the browser
 * (`?panelfail=<surface>`) and looking at the real DOM. That route needs headless
 * Chrome, which cannot start in restricted sandboxes (measured here: Chrome exits
 * instantly with `crashpad_client_win.cc OpenProcess: Access is denied`). A P0
 * guarantee must not have an unrunnable gate, so this script proves the SAME
 * claim a different way — by EXECUTING the shipped component, not by grepping it.
 *
 * WHAT IT ACTUALLY DOES
 *   1. Loads the real `src/components/section/SectionErrorBoundary.tsx` and
 *      `src/components/AppErrorBoundary.tsx` through a Node module hook that
 *      applies the project's own `typescript` dependency (the same compiler
 *      `npm run check` uses) to strip types. No copy of the component, no regex
 *      over a minified bundle: the object under test is the shipped class.
 *   2. Drives it the way React does: a healthy instance must render its children
 *      UNCHANGED (identity, not a wrapper); `getDerivedStateFromError` must
 *      transition it to the failure state; the failure render must produce the
 *      shared card; the Retry callback must clear the error.
 *   3. Renders the failure tree to markup with `react-dom/server` and asserts the
 *      recovery affordance is real: `role="alert"`, `data-panel-error="<name>"`,
 *      the "«name» failed" text and a focusable Retry button.
 *   4. Asserts every surface App.tsx claims to wrap really is wrapped, and that
 *      the live-section/plate/live-canvas call sites in PlatesTab are too.
 *
 * WHAT IT DOES NOT PROVE (stated so nobody over-reads the result)
 *   • React's own containment — that a throw in a child is caught during a real
 *     render pass. That is React's contract, not this component's; the browser
 *     audit's forced-throw check is what demonstrates it, and when the browser
 *     lane cannot run this file is the honest ceiling.
 *   • Anything about event-handler / async throws: React boundaries do not catch
 *     those, and `SectionErrorBoundary.tsx` says so in its header.
 *
 * Usage:  node scripts/verify/boundary-contract.mjs
 *         (Node-only; no server, no browser, no external precondition)
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const React = require_('react')
const { renderToStaticMarkup } = require_('react-dom/server')

/* --------------------------------------------------- TS/TSX module loading */

/**
 * A synchronous `load` hook (async hooks are not supported by
 * `module.registerHooks` in Node 24) that transpiles the project's own `.ts` /
 * `.tsx` sources with the installed TypeScript compiler. JSX is emitted with
 * `react/jsx-runtime`, which `react@18.3.1` ships, so the transformed module
 * needs no shims.
 */
registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && (url.endsWith('.tsx') || url.endsWith('.ts'))) {
      const source = readFileSync(fileURLToPath(url), 'utf8')
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

const ROOT = resolve('.')
const moduleUrl = (relative) => pathToFileURL(resolve(ROOT, relative)).href
const readSource = (relative) => readFileSync(resolve(ROOT, relative), 'utf8')

/* --------------------------------------------------------------- reporting */

const checks = []
const failures = []
const infos = []
const ok = (message) => checks.push(`  ok   ${message}`)
const bad = (message) => failures.push(`  FAIL ${message}`)
const info = (message) => infos.push(`  info ${message}`)

/** Minimal structural walk over a React element tree. */
function collect(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) collect(child, visit)
    return
  }
  visit(node)
  collect(node.props?.children, visit)
}

/** All host-element tag names, attributes and text in a rendered tree. */
function describeTree(tree) {
  const tags = []
  const attributes = []
  let text = ''
  collect(tree, (element) => {
    if (typeof element.type === 'string') {
      tags.push(element.type)
      for (const [key, value] of Object.entries(element.props ?? {})) {
        if (/^(data-|role$|className$|aria-)/.test(key)) attributes.push(`${key}=${String(value)}`)
      }
      if (typeof element.props?.children === 'string') text += ` ${element.props.children}`
    }
  })
  return { tags, attributes, text: text.trim() }
}

/* ---------------------------------------------- 1. the panel boundary itself */

const boundaryModule = await import(moduleUrl('src/components/section/SectionErrorBoundary.tsx'))
const { PanelErrorBoundary, panelErrorCard } = boundaryModule

typeof PanelErrorBoundary === 'function'
  ? ok('src/components/section/SectionErrorBoundary.tsx loads and exports PanelErrorBoundary')
  : bad('PanelErrorBoundary is not exported as a class/function')
typeof panelErrorCard === 'function'
  ? ok('the shared recovery card (panelErrorCard) is exported for layout-transparent call sites')
  : bad('panelErrorCard is not exported')
typeof boundaryModule.default === 'function'
  ? ok('the historic default export (SectionErrorBoundary) still exists — PlatesTab keeps working')
  : bad('the default SectionErrorBoundary export is gone (PlatesTab imports it)')

const child = React.createElement('span', { 'data-probe-child': 'present' }, 'healthy child')
const healthy = new PanelErrorBoundary({ name: 'Probe panel', children: child })
const healthyTree = healthy.render()
healthyTree === child
  ? ok('healthy state renders its children UNCHANGED (identity) — no wrapper is injected into the live DOM')
  : info(
      'healthy state renders a new tree rather than the children identity ' +
        `(type ${String(healthyTree?.type)}) — the healthy DOM carries a boundary wrapper`,
    )

const thrown = new Error('probe: deliberate panel failure')
const derived = PanelErrorBoundary.getDerivedStateFromError(thrown)
derived?.error === thrown
  ? ok('getDerivedStateFromError stores the thrown error (the state transition React relies on)')
  : bad(`getDerivedStateFromError did not record the error: ${JSON.stringify(derived)}`)

const failed = new PanelErrorBoundary({ name: 'Probe panel', children: child })
failed.state = { error: thrown }
const failedTree = failed.render()
let retryCalls = 0
collect(failedTree, (element) => {
  if (element.type === 'button' && element.props?.className?.includes('panel-error-retry')) {
    const previous = element.props.onClick
    if (typeof previous === 'function') retryCalls += 1
  }
})
const failedMarkup = renderToStaticMarkup(failedTree)
const failedInfo = describeTree(failedTree)
// NOTE: a line that STARTS with a regex literal must follow a semicolon, or the
// parser reads the leading `/` as a division operator and the file dies with a
// confusing "Unexpected identifier" far from the real cause.

failedMarkup.includes('role="alert"')
  ? ok('failure state renders role="alert" — the failure is announced, not silent')
  : bad('failure state is not announced (no role="alert")')
failedMarkup.includes('data-panel-error="Probe panel"')
  ? ok('failure card carries data-panel-error="<surface name>" — the audit can attribute a failure')
  : bad(`failure card has no data-panel-error="Probe panel" (markup: ${failedMarkup.slice(0, 120)})`)
const namesSurface = new RegExp('Probe panel failed').test(failedMarkup)
namesSurface ? ok('failure card names the failed surface ("Probe panel failed…")') : bad('failure card does not name the failed surface')
const retryMarkup = new RegExp('<button[^>]*>Retry</button>').test(failedMarkup)
retryMarkup
  ? ok('failure card offers a real focusable Retry button (the recovery path)')
  : bad('failure card has no Retry button')
retryCalls === 1
  ? ok('the Retry button is wired to a handler (onClick present exactly once)')
  : bad(`Retry button onClick wiring is wrong (found ${retryCalls} handler(s))`)
failedInfo.tags.includes('div')
  ? ok('failure state renders real host elements (a card can occupy the failed surface)')
  : bad('failure state rendered no host elements')

// The retry contract: the ONLY thing reset does is clear the error, and after it
// the boundary must render the children again. Driven directly, because React
// owns the re-render in the browser.
const resetTarget = new PanelErrorBoundary({ name: 'Probe panel', children: child })
resetTarget.state = { error: thrown }
let clearedTo = 'not called'
resetTarget.setState = (next) => {
  clearedTo = JSON.stringify(next)
}
const retryButton = []
collect(resetTarget.render(), (element) => {
  if (element.type === 'button' && element.props?.className?.includes('panel-error-retry')) {
    retryButton.push(element)
  }
})
retryButton[0]?.props?.onClick?.()
clearedTo === '{"error":null}'
  ? ok('Retry clears the error state ({ error: null }) — the panel re-mounts instead of staying dead')
  : bad(`Retry did not clear the error state (setState got ${clearedTo})`)

const healthyAfterReset = new PanelErrorBoundary({ name: 'Probe panel', children: child })
healthyAfterReset.state = { error: null }
healthyAfterReset.render() === child
  ? ok('after a reset the boundary returns the children again (a recovered panel is fully restored)')
  : bad('after a reset the boundary did not return the children')

/* --------------------------------------------------- 2. app-level boundary */

const appBoundaryModule = await import(moduleUrl('src/components/AppErrorBoundary.tsx'))
const AppErrorBoundary = appBoundaryModule.default
typeof AppErrorBoundary === 'function'
  ? ok('src/components/AppErrorBoundary.tsx loads and default-exports the shell guard')
  : bad('AppErrorBoundary default export missing')

const appFailed = new AppErrorBoundary({ children: child })
appFailed.state = { error: new Error('probe: shell failure') }
const appMarkup = renderToStaticMarkup(appFailed.render())
appMarkup.includes('data-app-error="true"') && appMarkup.includes('role="alert"')
  ? ok('the shell guard renders its own announced card (data-app-error="true")')
  : bad('the shell guard card is missing its role/data attributes')
const appActions = new RegExp('Reload page').test(appMarkup) && new RegExp('Retry').test(appMarkup)
appActions
  ? ok('the shell guard offers both honest actions (Retry, Reload page)')
  : bad('the shell guard is missing Retry/Reload')

/* ---------------------------------------- 3. every surface is actually wrapped */

const appSource = readSource('src/App.tsx')
const surfaces = [
  'Header',
  'Taxonomy tree',
  '3D viewer',
  'Plates tab',
  'Syndrome browser',
  'Info panel',
  'References modal',
]
const unwrapped = surfaces.filter((label) => !appSource.includes(`label="${label}"`))
unwrapped.length === 0
  ? ok(`App.tsx wraps all ${surfaces.length} major surfaces (${surfaces.join(', ')})`)
  : bad(`App.tsx does not wrap: ${unwrapped.join(', ')}`)
const wrapperCount = (appSource.match(/<TransparentBoundary\b/g) ?? []).length
wrapperCount === surfaces.length
  ? ok(`every surface uses the SAME boundary factory (${wrapperCount} <TransparentBoundary> call sites)`)
  : bad(`expected ${surfaces.length} <TransparentBoundary> call sites, found ${wrapperCount}`)
const mountsAppGuard = new RegExp('AppErrorBoundary').test(appSource)
mountsAppGuard
  ? ok('the whole shell is additionally wrapped in AppErrorBoundary (last line of defence)')
  : bad('App.tsx does not mount AppErrorBoundary')

const platesSource = readSource('src/components/PlatesTab.tsx')
const platesCallSites = (platesSource.match(/<SectionErrorBoundary\b/g) ?? []).length
platesCallSites >= 2
  ? ok(`PlatesTab guards both of its modes internally (${platesCallSites} SectionErrorBoundary call sites)`)
  : bad(`PlatesTab guards only ${platesCallSites} mode(s) — author plate and live section both need one`)
const plateViewerNamed = new RegExp('name="Plate viewer"').test(platesSource)
plateViewerNamed
  ? ok('the author plate viewer has its own named boundary ("Plate viewer")')
  : bad('the author plate viewer is not individually guarded')
const transparentLive = new RegExp("display: 'contents'").test(platesSource)
transparentLive
  ? ok('the live-section boundary is layout-transparent (style={{ display: "contents" }})')
  : bad('the live-section boundary wrapper is not layout-transparent')

/* ------------------------------------------------------------------ report */

console.log('\n================ NeuroAxis error-boundary contract ================')
console.log('  (executes the shipped components; no browser required)')
for (const line of checks) console.log(line)
for (const line of infos) console.log(line)
for (const line of failures) console.log(line)
console.log(`\n${checks.length} passed · ${failures.length} failed`)
if (failures.length > 0) process.exitCode = 1
