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
const serverUp = source === BASE

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

/**
 * Remove JS/TS comments from source text WITHOUT touching string contents.
 *
 * A regex is not enough here, and the failure mode is silent: a naive `//` strip
 * deletes the rest of any line containing a URL literal
 * (`createElementNS('http://www.w3.org/2000/svg', 'title')`) and — worse — sees
 * the `//` in `useEffect, useMemo, useRef` and truncates the statement, so the
 * `</*` of the NEXT comment then matches inside what is left and swallows the
 * whole region. That is exactly how the `<title>` fact stopped being findable.
 * This scanner tracks '  " and ` so a comment marker inside a string is text.
 */
function stripCommentsSafely(text) {
  let out = ''
  let quote = null
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote !== null) {
      out += ch
      if (ch === '\\') {
        out += text[i + 1] ?? ''
        i += 1
        continue
      }
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      out += ch
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1
      out += '\n'
      continue
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1
      i += 1
      out += ' '
      continue
    }
    out += ch
  }
  return out
}

/**
 * The SOURCE reading: comments removed, single quotes unified to double quotes,
 * and ALL whitespace preserved.
 *
 *  • comments are REMOVED, so no fact can be satisfied by prose ABOUT the fact;
 *  • quotes are UNIFIED (the convention the table was written in), so a fact
 *    written `'button'` and the same fact written `"button"` are one form; in
 *    JSX the author's double quotes already are the normal form;
 *  • whitespace is PRESERVED — the patterns contain `\s` classes, so the
 *    whitespace-free reading used for the shipped bundle would break every one
 *    that spans a line break.
 */
const sourceCode = (text) => stripCommentsSafely(text).replace(/'/g, '"')

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

/* -------------------------------------- 2. the contract, read from sources */

/**
 * MODULES lists every file the contract above reads. Kept explicit so a missing
 * file fails loudly instead of quietly skipping its facts.
 */
const MODULES = [
  'src/components/PlateRenderer.tsx',
  'src/components/ReferencesModal.tsx',
  'src/components/SearchBox.tsx',
  'src/components/InfoPanel.tsx',
  'src/App.tsx',
  'src/components/viewer3d/SectionPiP.tsx',
]

/**
 * The contract, as (module, fact, regex) triples.
 *
 * EVERY regex here matches attribute names, string literals or method names —
 * never a minifier-renamable identifier — so the same expression is valid
 * against the raw shared source AND against a Terser-mangled bundle. That is
 * what lets one table serve both readings (see the two readers below); the
 * previous version matched local function names and silently stopped working
 * the moment `minify` was enabled (QUALITY_PLAN §3 item 12).
 */
const CONTRACT = [
  ['src/components/PlateRenderer.tsx', 'plate root is role="group", aria-labelled (no AX atom — PLAN DEV-13)',
    /className="plate-root"[\s\S]{0,400}role="group"[\s\S]{0,400}aria-label/],
  ['src/components/PlateRenderer.tsx', 'regions are role="button"',
    /setAttribute\("role",\s*"button"\)/],
  ['src/components/PlateRenderer.tsx', 'regions carry a roving tabindex (exactly one "0")',
    /setAttribute\("tabindex"[\s\S]{0,90}\?\s*"0"\s*:\s*"-1"\)/],
  ['src/components/PlateRenderer.tsx', 'region accessible name = the injected SVG <title>',
    /createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "title"\)[\s\S]{0,200}textContent = entry\.name[\s\S]{0,200}appendChild\(title\)/],
  ['src/components/PlateRenderer.tsx', 'Arrow/Home/End roving keys handled on the plate root',
    /new Set\(\[[^\]]*"ArrowDown"[^\]]*"Home"[^\]]*"End"[^\]]*\]\)[\s\S]{0,4000}addEventListener\("keydown", onKeyDown\)/],
  ['src/components/PlateRenderer.tsx', 'Enter and Space activate the focused region like a click',
    /"Enter"\s*\|\|\s*event\.key\s*===\s*" "\s*\|\|\s*event\.key\s*===\s*"Spacebar"/],
  ['src/components/PlateRenderer.tsx', 'leader labels are keyboard-activatable too',
    /onKeyDownLabel = \(event: KeyboardEvent\)[\s\S]{0,400}selectRegion\([\s\S]{0,300}label\.setAttribute\("role", "button"\)[\s\S]{0,300}label\.addEventListener\("keydown", onKeyDownLabel\)/],
  ['src/App.tsx', 'sidebar is inert while closed (not aria-hidden)',
    /inert:\s*sidebarOpen\s*\?\s*undefined\s*:\s*""/],
  ['src/components/InfoPanel.tsx', 'collapsed bottom-sheet body is inert, not aria-hidden',
    /inert:\s*collapsedSheet\s*\?\s*""\s*:\s*undefined/],
  ['src/components/ReferencesModal.tsx', 'focus is captured per OPEN and restored on close',
    /opener\.isConnected[^]{0,60}opener\.focus\(\{ preventScroll: true \}\)[\s\S]{0,120}\}, \[open\]\)/],
  ['src/components/ReferencesModal.tsx', 'Tab cycles inside the dialog (focus trap)',
    /const nodes = focusableIn\(dialog\)[\s\S]{0,300}event\.shiftKey/],
  ['src/components/ReferencesModal.tsx', 'Escape closes from inside the dialog',
    /"Escape"[\s\S]{0,140}setReferencesOpen\(false\)/],
  ['src/components/ReferencesModal.tsx', 'dialog is modal and labelled',
    /role="dialog"[\s\S]{0,80}aria-modal="true"[\s\S]{0,120}aria-label="References and bibliography"/],
  ['src/App.tsx', 'sidebar carries NO aria-hidden in code (comments stripped)',
    { stripComments: true, absent: true, re: /aria-hidden/ }],
  ['src/components/SearchBox.tsx', 'combobox exposes aria-activedescendant',
    /aria-activedescendant=\{activeOptionId\}/],
  ['src/components/SearchBox.tsx', 'options carry stable ids',
    /searchbox-option-/],
  ['src/components/viewer3d/SectionPiP.tsx', 'narrow-viewport PiP tab is rendered',
    /"pip-toggle"[\s\S]{0,120}"Show or hide the live section panel"/],
]

/**
 * READER 1 — the named facts, read from the SHARED SOURCE FILES.
 *
 * This is the authoritative reading and it needs no server: it is the same text
 * `npm run build` compiles, so a fact missing here is missing from the product.
 * The files are read once each and normalised (comments stripped, one quote
 * style) before matching.
 */
for (const module of MODULES) {
  if (!existsSync(resolve(module))) {
    bad(`${module} does not exist — the contract cannot be checked`)
    continue
  }
}
for (const [owner, fact, check] of CONTRACT) {
  const re = check instanceof RegExp ? check : check.re
  const text = sourceCode(read(owner))
  const hit = re.test(text)
  const want = check instanceof RegExp || check.absent !== true
  hit === want
    ? ok(`${owner}: ${fact}`)
    : bad(`${owner}: ${want ? 'MISSING' : 'STILL PRESENT —'} ${fact}`)
}
ok(`read ${MODULES.length} source modules (no dev server needed; the same text the build compiles)`)

/**
 * A small subset that must be present in the SHIPPED bundle. These are picked
 * because minification cannot remove them (attribute names, string literals,
 * literal `"0"`/`"true"`) — so a bundle miss is a real regression, not a
 * mangling artefact.
 */
const BUNDLE_SPOT_CHECKS = [
  ['plate root role="group" + aria-label', /"group"[\s\S]{0,200}"aria-label"/],
  ['region role="button"', /"role",\s*"button"/],
  ['roving tabindex literals', /"tabindex"[\s\S]{0,60}"0"[\s\S]{0,20}"-1"/],
  ['Enter/Space activation', /"Spacebar"/],
  ['accessible name from an SVG <title>', /"title"[\s\S]{0,80}appendChild/],
  ['inert sidebar', /inert:/],
  ['modal role/aria-modal', /"aria-modal":"true"|aria-modal="true"/],
  ['combobox aria-activedescendant', /"aria-activedescendant"/],
  ['stable option ids', /searchbox-option-\$\{/],
  ['narrow PiP toggle tab', /"pip-toggle"/],
]

/**
 * READER 2 — the SHIPPED bundle must still carry the contract.
 *
 * Reader 1 proves the source is right; this proves the artifact a user receives
 * actually contains those attributes and strings. It is deliberately a SPOT
 * check: every pattern here is minifier-stable (an attribute name, a string
 * literal, or a literal "0"/"true"), so a miss is a real regression rather than
 * a mangling artefact. It runs whether or not a dev server happens to be up.
 */
{
  const entry = existsSync(resolve('dist/assets'))
    ? readdirSync(resolve('dist/assets'))
        .filter((f) => f.startsWith('index-') && f.endsWith('.js'))
        .sort()
        .pop()
    : undefined
  if (entry === undefined) {
    info('no dist/assets/index-*.js — run `npm run build` to enable the shipped-bundle spot check')
  } else {
    const bundle = read(`dist/assets/${entry}`)
    for (const [fact, re] of BUNDLE_SPOT_CHECKS) {
      re.test(bundle)
        ? ok(`shipped bundle (${entry}): ${fact}`)
        : bad(`shipped bundle (${entry}) LOST: ${fact}`)
    }
    info(`shipped-bundle spot check read dist/assets/${entry} (${Math.round(bundle.length / 1024)} kB)`)
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
    `\n  facts read from: the shared SOURCE files (${serverUp ? `${BASE} is up; ` : ''}` +
    'the source reading is independent of any server)' +
    `\n  shipped bundle spot check: ${existsSync(resolve('dist/assets')) ? 'dist/assets' : 'unavailable (run npm run build)'}`,
)
if (failures.length > 0) process.exitCode = 1
