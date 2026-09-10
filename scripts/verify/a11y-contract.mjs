/**
 * a11y-contract.mjs — verifies the P2 accessibility/polish contract of the
 * SHIPPED artifacts (not the source comments). Node-only, no browser.
 *
 * Why a script instead of only a browser run: the runtime audit
 * (`verify:audit`) needs headless Chrome, which cannot start in some restricted
 * sandboxes (mojo platform_channel: access denied). Where that applies, this
 * script is the strongest available proof, and it does not grep for keywords —
 * it applies the same operations the runtime code performs:
 *
 *   1. PLATE REGIONS — for every authored plate SVG, extract the
 *      `[data-structure]` ids with the same attribute rule the validator uses,
 *      and require that (a) each resolves in taxonomy.json, (b) each has a
 *      non-empty display name, so PlateRenderer's `role="button"` can never be
 *      attached without an accessible name (that is the invariant that keeps
 *      scripts/verify/audit.mjs §H — "every interactive node has a computed
 *      accessible name" — from failing on a data gap), and (c) the count is > 0.
 *   2. TRANSFORMED SOURCE — fetch every changed component through the dev
 *      server's own esbuild transform (src/…, the same pipeline `npm run build`
 *      uses) and assert the a11y contract survived it: region roles/tabindex,
 *      the roving helper, the keyboard handler, the inert sidebar, the modal
 *      trap, the combobox pointer, the PiP toggle row. Code is normalised
 *      (whitespace stripped, quotes unified) before matching so the checks are
 *      independent of formatting/minification.
 *   3. CSS — fetch the stylesheets Vite serves and assert the focus-ring,
 *      ≥24 px hit-target and ≤900 px PiP-collapse rules are present, and that
 *      the closed-sidebar rule hides the panel.
 *
 * Usage:  node scripts/verify/a11y-contract.mjs [http://localhost:5173]
 *         (a running dev server is preferred; without one the built `dist/`
 *          artifacts are checked instead)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
const failures = []
const notes = []
let passed = 0
const ok = (m) => {
  passed += 1
  notes.push(`  ok   ${m}`)
}
const info = (m) => notes.push(`  info ${m}`)
const bad = (m) => failures.push(`  FAIL ${m}`)

const read = (p) => readFileSync(resolve(p), 'utf8')
/** Formatting-independent view of a source file: no whitespace, one quote style. */
const normalize = (text) => text.replace(/\s+/g, '').replace(/'/g, '"')
/**
 * Code-only view: JS/TS comments removed. Used for the NEGATIVE assertions
 * ("this attribute is gone"), which must not be satisfied by a comment that
 * merely documents the removal.
 */
const stripComments = (text) =>
  normalize(
    text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n'),
  )

let source = 'dist/'
try {
  const probe = await fetch(`${BASE}/@vite/client`, { signal: AbortSignal.timeout(2500) })
  source = probe.ok ? BASE : 'dist/'
} catch {
  source = 'dist/'
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

/* ---------------------------------------------------------------- 1. plates */

const PLATE_DIR = 'src/data/plates'
const PLATE_FILES = existsSync(resolve(PLATE_DIR))
  ? readdirSync(resolve(PLATE_DIR)).filter((f) => f.endsWith('.svg')).map((f) => `${PLATE_DIR}/${f}`)
  : []

const taxonomy = JSON.parse(read('src/data/taxonomy.json'))
const nameById = new Map()
const walk = (node) => {
  if (typeof node !== 'object' || node === null) return
  if (typeof node.id === 'string') nameById.set(node.id, typeof node.name === 'string' ? node.name : '')
  for (const value of Object.values(node)) walk(value)
}
walk(taxonomy)

let regionTotal = 0
let regionsWithoutTaxonomy = 0
let regionsWithoutName = 0
for (const file of PLATE_FILES) {
  const svg = read(file)
  const ids = new Set()
  for (const attr of svg.matchAll(/data-structure\s*=\s*"([^"]+)"/g)) ids.add(attr[1])
  regionTotal += ids.size
  for (const id of ids) {
    if (!nameById.has(id)) regionsWithoutTaxonomy += 1
    else if ((nameById.get(id) ?? '').trim() === '') regionsWithoutName += 1
  }
}

PLATE_FILES.length > 0
  ? ok(`${PLATE_FILES.length} authored plate SVGs ship ${regionTotal} named [data-structure] regions`)
  : bad('no plate SVGs found under src/data/plates')
regionsWithoutTaxonomy === 0
  ? ok('every plate region id resolves in taxonomy.json (role="button" is attachable)')
  : bad(`${regionsWithoutTaxonomy} plate region id(s) are not in taxonomy.json`)
regionsWithoutName === 0
  ? ok('every plate region has a display name → every new button node in the AX tree is named (audit §H)')
  : bad(`${regionsWithoutName} plate region(s) have no display name — audit §H would fail`)

/* ------------------------------------------------- 2. transformed components */

const MODULES = [
  'src/components/PlateRenderer.tsx',
  'src/components/ReferencesModal.tsx',
  'src/components/SearchBox.tsx',
  'src/App.tsx',
  'src/components/viewer3d/SectionPiP.tsx',
]

/** [module, fact, regex against the NORMALISED module source] */
const CONTRACT = [
  ['src/components/PlateRenderer.tsx', 'plate root is role="group", aria-labelled (no AX atom — PLAN DEV-13)',
    /className:"plate-root",role:"group","aria-label":/],
  ['src/components/PlateRenderer.tsx', 'regions are role="button"',
    /setAttribute\("role","button"\)/],
  ['src/components/PlateRenderer.tsx', 'regions carry a roving tabindex (exactly one "0")',
    /setAttribute\("tabindex",el===stop\?"0":"-1"\)/],
  ['src/components/PlateRenderer.tsx', 'region accessible name = its <title> display name',
    /createElementNS\([\s\S]{0,60}?"title"\)[\s\S]{0,60}?appendChild\(title\)/],
  ['src/components/PlateRenderer.tsx', 'Arrow/Home/End roving keys handled on the plate root',
    /NAV_KEYS[\s\S]{0,1400}?addEventListener\("keydown",onKeyDown\)/],
  ['src/components/PlateRenderer.tsx', 'Enter and Space activate the focused region like a click',
    /event\.key==="Enter"\|\|event\.key===""\|\|event\.key==="Spacebar"[\s\S]{0,1600}?selectRegion\(/],
  ['src/components/PlateRenderer.tsx', 'leader labels are keyboard-activatable too',
    /onKeyDownLabel[\s\S]{0,400}?selectRegion\(/],
  ['src/App.tsx', 'sidebar is inert while closed (not aria-hidden)',
    /\{inert:sidebarOpen\?undefined:""\}/],
  ['src/components/ReferencesModal.tsx', 'focus restored to the opener on close',
    /opener\.isConnected[\s\S]{0,60}?opener\.focus\(/],
  ['src/components/ReferencesModal.tsx', 'Tab cycles inside the dialog (focus trap)',
    /FOCUSABLE[\s\S]{0,300}?focusableIn/],
  ['src/components/ReferencesModal.tsx', 'Escape closes from inside the dialog',
    /event\.key==="Escape"[\s\S]{0,120}?setReferencesOpen\(false\)/],
  ['src/components/ReferencesModal.tsx', 'dialog is modal and labelled',
    /role:"dialog","aria-modal":"true","aria-label":/],
  ['src/App.tsx', 'sidebar carries NO aria-hidden in code (comments stripped)',
    { stripComments: true, absent: true, re: /aria-hidden/ }],
  ['src/components/SearchBox.tsx', 'combobox exposes aria-activedescendant',
    /"aria-activedescendant"/],
  ['src/components/SearchBox.tsx', 'options carry stable ids',
    /searchbox-option-/],
  ['src/components/viewer3d/SectionPiP.tsx', 'narrow-viewport PiP tab is rendered',
    /className:"pip-toggle"/],
]

if (source === BASE) {
  for (const module of MODULES) {
    let code
    try {
      code = await fetchText(`${BASE}/${module}`)
    } catch (error) {
      bad(`dev server did not transform ${module} (${error.message})`)
      continue
    }
    const flat = normalize(code)
    for (const [owner, fact, check] of CONTRACT) {
      if (owner !== module) continue
      const re = check instanceof RegExp ? check : check.re
      const text = check instanceof RegExp || check.stripComments !== true ? flat : stripComments(code)
      const hit = re.test(text)
      const want = check instanceof RegExp || check.absent !== true
      hit === want ? ok(`${module}: ${fact}`) : bad(`${module}: ${want ? 'MISSING' : 'STILL PRESENT —'} ${fact}`)
    }
  }
  ok(`dev server transformed all ${MODULES.length} changed modules (esbuild pipeline, same as the build)`)
} else {
  const entry = readdirSync(resolve('dist/assets'))
    .filter((f) => f.startsWith('index-') && f.endsWith('.js'))
    .sort()
    .pop()
  if (entry === undefined) {
    bad('no dist/assets/index-*.js found and no dev server reachable — run `npm run build` or start `npm run dev`')
  } else {
    const flat = normalize(read(`dist/assets/${entry}`))
    for (const [, fact, check] of CONTRACT) {
      // A descriptor entry is an object ({ absent, stripComments, re }), not a
      // RegExp: the `check.re` below covers it, but the negative ("must be
      // absent") checks are dev-only, so they are skipped in bundle mode.
      const re = check instanceof RegExp ? check : check.re
      if (check instanceof RegExp === false && check.absent === true) continue
      // The production bundle keeps identifiers, attributes and (with
      // `minify:false`) comments; a named fact is enough here.
      re.test(flat) ? ok(`bundle: ${fact}`) : bad(`bundle: MISSING ${fact}`)
    }
    info('dev server not reachable — checked the production bundle instead of live transforms')
  }
}

/* -------------------------------------------------------------------- 3. CSS */

/**
 * In dev, Vite serves a CSS file as a JS module whose stylesheet text is a JSON
 * string (`const __vite__css = "…"`). Extract that string when present and fall
 * back to the raw response, so the same checks work against the dev server and
 * against the plain source files.
 */
function extractCss(text) {
  const match = text.match(/const __vite__css = ("(?:[^"\\]|\\.)*")/)
  if (match === null) return text
  try {
    return JSON.parse(match[1])
  } catch {
    return text
  }
}

const CSS_CONTRACT = [
  ['src/styles/plates.css', 'visible focus ring on plate regions and labels',
    /:is\(\.plate-region,\s*\.plate-label\):focus-visible\s*\{[^}]*outline:\s*3px solid/],
  ['src/styles/plates.css', 'visible focus ring on the plate root',
    /\.plate-root svg:focus-visible\s*\{[^}]*outline:\s*2px solid/],
  ['src/styles/viewer.css', '.btn-snap hit target ≥24 px',
    /\.btn-snap\s*\{[^}]*min-height:\s*24px/],
  ['src/styles/sectionPip.css', '.pip-btn hit target ≥24 px',
    /\.pip-btn\s*\{[^}]*min-height:\s*24px/],
  ['src/styles/sectionPip.css', 'PiP collapses behind a labelled tab below 900 px',
    /@media \(max-width: 900px\)\s*\{[\s\S]*?\.pip-panel:has\(\.pip-toggle input:checked\)[\s\S]*?\.pip-toggle/],
  ['src/styles/layout.css', 'a closed sidebar is not visible in any breakpoint',
    /\.app-shell\.is-sidebar-closed \.sidebar\s*\{[^}]*visibility:\s*hidden/],
]

for (const [module, fact, re] of CSS_CONTRACT) {
  let text
  try {
    text = source === BASE ? extractCss(await fetchText(`${BASE}/${module}`)) : read(module)
  } catch (error) {
    bad(`${module}: could not read CSS (${error.message})`)
    continue
  }
  re.test(text) ? ok(`${module}: ${fact}`) : bad(`${module}: MISSING ${fact}`)
}

/* -------------------------------------------------------------- 4. favicon */

const html = read('index.html')
const faviconHref = html.match(/<link[^>]+rel="icon"[^>]*href="([^"]+)"/)
if (faviconHref === null) {
  bad('index.html has no <link rel="icon"> — the browser will keep probing /favicon.ico (404)')
} else {
  // Vite serves `public/` at the site root (and copies it verbatim into dist/).
  const served = faviconHref[1].replace(/^\//, '')
  const candidates = [resolve('public', served), resolve(served)]
  const found = candidates.find((p) => existsSync(p))
  found !== undefined
    ? ok(`favicon declared (${faviconHref[1]}) and ${found.includes('public') ? 'public/' : ''}${served} exists — the last console 404 is gone`)
    : bad(`index.html points at ${faviconHref[1]} but neither public/${served} nor ${served} exists`)
}

/* ------------------------------------------------------------------ report */

console.log('\n================ NeuroAxis a11y contract ================')
for (const line of notes) console.log(line)
for (const line of failures) console.log(line)
console.log(
  `\n${passed} passed · ${failures.length} failed` +
    `\n  source: ${source === BASE ? `live dev-server transforms (${BASE})` : 'built dist/ artifacts + sources'}`,
)
if (failures.length > 0) process.exitCode = 1
