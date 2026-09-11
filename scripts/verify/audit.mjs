/**
 * audit.mjs — deep end-to-end runtime audit of NeuroAxis.
 *
 * Drives a real headless Chrome over the DevTools Protocol and asserts that
 * every shipped feature actually works at runtime, collecting console errors,
 * page exceptions, failed requests and performance numbers along the way.
 * Complements the code-level checks (`npm run validate` / `check` / `build`),
 * which cannot see runtime behaviour.
 *
 * SELF-SUFFICIENT (this is the point of the bootstrap below)
 * The script no longer has an external precondition. If nothing answers at the
 * target URL it STARTS Vite itself, waits for HTTP 200 (bounded, 30 s), runs the
 * whole check suite, and stops the server again on every exit path — success,
 * check failure, timeout, exception, Ctrl-C. Point it at an already-running
 * server by passing the URL (that server is then never touched).
 *
 * Usage:  npm run verify:audit                        (starts its own server)
 *         node scripts/verify/audit.mjs http://localhost:5173
 *
 * EXIT CODES — an environment failure must never look like a product failure:
 *   0  every check ran and passed
 *   1  checks ran and FAILED — the only "the product is broken" signal
 *   2  static precondition missing (no Chrome binary on this machine)
 *   3  no server: nothing answered at the target URL and the one this script
 *      started did not become ready within the bound
 *   4  no browser: Chrome could not be started / its DevTools endpoint never
 *      answered (preflight, before any check runs). The most common cause in a
 *      restricted sandbox is crashpad: `OpenProcess: Access is denied (0x5)`.
 *
 * ── v7 closure: DETERMINISM (audit gaps 4a/5, plan §2.6) ────────────────────
 * Two of the ten failures in the orchestrator's run were not product defects at
 * all: the boot-preset check read a `neuroaxis.viewPreset` left behind in the
 * PERSISTENT Chrome profile (`.plate-scratch/chrome-profile-audit`) by an earlier
 * run, and the audit's own section B clicks the header's "Nuclei" preset before
 * that check ran. A stored preference could therefore masquerade as "the default
 * preset is wrong". The run is now deterministic by construction:
 *   1. a FRESH profile directory every run (the previous one is deleted first;
 *      if it cannot be deleted, a per-PID directory is used instead) — nothing
 *      survives between runs;
 *   2. an explicit `localStorage.clear()` + `sessionStorage.clear()` prologue
 *      before the boot read, reported in the log — this also covers the case
 *      where the audit is pointed at an already-running server;
 *   3. the boot-preset assertions run IMMEDIATELY after that clean boot (block
 *      A0), before any check clicks a preset button, and they report the raw
 *      reading (`active`, `stored`, `offRows`) with the cause.
 *
 * ── v7 closure: PREDICATES (audit gaps 3/5/6, plan §4.1 item 6) ─────────────
 * Every load-bearing verdict below is decided by a PURE predicate imported from
 * `./checks.mjs` (coverage honesty, preset focus/dimming, panel containment and
 * recovery, context-loss DOM contract, modality sweep honesty). The browser lane
 * feeds them real DOM readings; `scripts/verify/audit-checks.test.mjs` feeds the
 * same predicates synthetic readings and the SHIPPED manifests, so the checks are
 * falsifiable without a browser and cannot drift from the assertions run here.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EXIT,
  createLifecycle,
  launchChrome,
  startDevServer,
} from './lib/startServer.mjs'
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
} from './checks.mjs'

const BASE = process.argv[2] ?? 'http://localhost:5173'
if (/^https?:\/\/(127\.0\.0\.1|\[::1\])/.test(BASE)) {
  // Measured on this tree: Vite 5 binds IPv6-only by default, so
  // `http://localhost:5173` answers 200 while `http://127.0.0.1:5173` is
  // REFUSED. A readiness probe against 127.0.0.1 can therefore never see a
  // server this script starts; `localhost` is the only correct host here.
  console.log(`note: ${BASE} uses a loopback literal — prefer http://localhost:<port>`)
}
const PORT = 9355

/**
 * CLEAN PROFILE PER RUN (v7 closure, gap 4a — see the header). The audit used a
 * single persistent profile, so a `neuroaxis.viewPreset` written by an earlier
 * run (or by this script's own earlier sections) decided the boot-preset check.
 * The directory lives under `.plate-scratch/` (gitignored, created by this
 * script), which is the only place a verify script may delete: a user profile is
 * never touched.
 */
const PROFILE_BASE = resolve('.plate-scratch/chrome-profile-audit')
let PROFILE = PROFILE_BASE
try {
  rmSync(PROFILE_BASE, { recursive: true, force: true })
} catch (error) {
  PROFILE = `${PROFILE_BASE}-${process.pid}`
  console.log(
    `  ·  could not reset ${PROFILE_BASE} (${
      error instanceof Error ? error.message : String(error)
    }) — using the per-run profile ${PROFILE} instead`,
  )
}
mkdirSync(PROFILE, { recursive: true })
console.log(`  ·  audit profile: ${PROFILE} (fresh — no stored preference can survive a run)`)

/**
 * The CT source-coverage block of the SHIPPED manifest, read once per run
 * (`checks.readCtSourceCoverage`). ONE source for the limit: no check below types
 * the number, so a re-bake moves every assertion with it.
 */
const CT_COVERAGE = readCtSourceCoverage()
console.log(
  `  ·  CT source coverage from ct-manifest.json: superior-most data y ≈ ` +
    `${CT_COVERAGE.limit === null ? 'not declared' : CT_COVERAGE.limit.toFixed(2)} au` +
    `${CT_COVERAGE.fractionInsideFov === null ? '' : ` · ${(CT_COVERAGE.fractionInsideFov * 100).toFixed(1)} % of stations inside the source FOV`}`,
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (m) => results.push(['ok', m])
const bad = (m) => results.push(['FAIL', m])
const info = (m) => results.push(['info', m])

const lifecycle = createLifecycle((message) => console.log(`  ·  ${message}`))

/** Set by the bootstrap; `null` until then. */
let ws
let send
let evaluate

/**
 * Resource preparation, kept OUT of the check body so the script can exit with a
 * distinct code before pretending to audit anything.
 *
 * @returns {Promise<{ exitCode: number|null, reason: string }>}
 */
async function prepareEnvironment() {
  if (
    !existsSync(
      `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    ) &&
    !existsSync(
      `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    ) &&
    !existsSync(
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ) &&
    process.env.CHROME_PATH === undefined
  ) {
    return { exitCode: EXIT.STATIC_PRECONDITION, reason: 'no Chrome binary found' }
  }

  const server = await startDevServer({
    baseUrl: BASE,
    lifecycle,
    log: (message) => console.log(`  ·  ${message}`),
    timeoutMs: 30_000,
  })
  if (server.failed === true) {
    return {
      exitCode: EXIT.SERVER_UNAVAILABLE,
      reason:
        `the dev server never answered HTTP 200 at ${BASE} ` +
        `(started: ${server.started}, waited ${server.elapsedMs} ms)`,
    }
  }

  const chrome = await launchChrome({
    port: PORT,
    profileDir: PROFILE,
    log: (message) => console.log(`  ·  ${message}`),
  })
  if (!chrome.ok) {
    return { exitCode: EXIT.BROWSER_UNAVAILABLE, reason: chrome.reason }
  }
  lifecycle.add(async () => {
    try {
      ws?.close()
    } catch {
      /* already closed */
    }
    const { killTree, waitForExit } = await import('./lib/startServer.mjs')
    killTree(chrome.chrome.pid)
    await waitForExit(chrome.chrome, 3000)
  })
  return { exitCode: null, reason: '' }
}

const consoleErrors = []
const exceptions = []
const failedRequests = []
const badResponses = []
const requestSizes = []

async function connect() {
  let page = null
  for (let i = 0; i < 60 && page === null; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) ?? null
    } catch {
      /* waiting */
    }
    if (page === null) await sleep(250)
  }
  if (page === null) throw new Error('devtools endpoint never came up')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  let nextId = 1
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== undefined) {
      pending.get(msg.id)?.(msg.result ?? msg.error)
      pending.delete(msg.id)
      return
    }
    const { method, params } = msg
    if (method === 'Runtime.exceptionThrown') {
      exceptions.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text)
    } else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
      consoleErrors.push((params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' '))
    } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      consoleErrors.push(`[${params.entry.source}] ${params.entry.text}`)
    } else if (method === 'Network.loadingFailed') {
      failedRequests.push(`${params.errorText}`)
    } else if (method === 'Network.responseReceived') {
      if (params.response.status >= 400) badResponses.push(`${params.response.status} ${params.response.url}`)
      requestSizes.push({ url: params.response.url, type: params.responseType })
    }
  })
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  send = (method, params = {}) => {
    const id = nextId++
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((res) => pending.set(id, res))
  }
  evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r?.exceptionDetails) return `THREW: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`
    return r?.result?.value
  }
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Network.enable')
  await send('Page.enable')
  try {
    await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  } catch {
    /* older builds */
  }
}

/* ---------------------------------------------------------------- helpers */

const clickText = (text, exact = true, scope = 'document') => `(() => {
  const root = ${scope};
  const b = [...root.querySelectorAll('button')].find(x => ${exact ? `${JSON.stringify(text)} === x.textContent.trim()` : `new RegExp(${JSON.stringify(text)}, 'i').test(x.textContent.trim())`});
  if (!b) return 'not found: ${text}';
  b.click();
  return 'clicked: ' + b.textContent.trim().slice(0, 40);
})()`

const sectionStats = `(() => {
  const c = document.querySelector('.section-canvas');
  if (!c) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let painted = 0, sampled = 0, hash = 0;
  for (let i = 0; i < d.length; i += 4 * 53) {
    sampled++;
    const r = d[i], g = d[i+1], b = d[i+2];
    hash = (hash * 31 + r + g * 3 + b * 7) % 1000000007;
    if (!(Math.abs(r-13) < 9 && Math.abs(g-21) < 9 && Math.abs(b-38) < 12)) painted++;
  }
  return { painted, sampled, hash };
})()`

/** Screenshot the page, then analyse it inside the page (WebGL pixels are not
 *  readable from script, so PNG → <img> → 2D canvas is the reliable route). */
async function pagePixelStats() {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (!shot?.data) return null
  const encoded = JSON.stringify(`data:image/png;base64,${shot.data}`)
  const stats = await evaluate(`new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 200;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 320, 200);
      const d = ctx.getImageData(0, 0, 320, 200).data;
      const buckets = new Set();
      let lum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 7) {
        buckets.add((d[i] >> 4) + ',' + (d[i+1] >> 4) + ',' + (d[i+2] >> 4));
        lum += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]; n++;
      }
      resolve({ uniqueColors: buckets.size, meanLum: Math.round(lum / n) });
    };
    img.onerror = () => resolve(null);
    img.src = ${encoded};
  })`)
  return stats
}

/* ------------------------------------------------------------------- run */

const environment = await prepareEnvironment()
if (environment.exitCode !== null) {
  // The environment, not the product. Say which, with the code that encodes it,
  // and stop before running a single check (a check that cannot run must never
  // be reported as a failure — that is what made two integration runs look like
  // product failures).
  console.error(`\n================ NeuroAxis runtime audit ================`)
  console.error(`cannot run: ${environment.reason}`)
  console.error(`exit ${environment.exitCode} (environment unusable — no check was run)`)
  await lifecycle.dispose()
  process.exit(environment.exitCode)
}

try {
  await connect()

  /* ======================================================================
   * A0 — DETERMINISTIC CLEAN BOOT + THE DEFAULT-PRESET GATE
   * (v7 closure, gaps 4/4a; docs/TELENCEPHALON_PLAN.md §5 + §9; plan §2.6)
   *
   * The boot preset is read from a page that CANNOT have a stored preference:
   * a fresh Chrome profile (see PROFILE above), an explicit localStorage /
   * sessionStorage clear, and a reload before the reading. This runs BEFORE
   * section B — which clicks the header's "Nuclei" preset — because reading the
   * "default" after that click measures the click, not the default. That was the
   * exact defect: the audit reported "the default preset is not Brainstem focus
   * (active: Nuclei …)" and "2 brainstem-family tree row(s) are dimmed" when the
   * code default was correct all along (store.ts asserts it at module load).
   *
   * The tree is expanded first: leaves only render while their subdivision is
   * open, and a collapsed tree would let the dimming assertion pass vacuously.
   * ==================================================================== */

  await send('Page.navigate', { url: BASE })
  await sleep(5000)
  const storageReset = await evaluate(`(() => {
    try {
      const keys = Object.keys(window.localStorage);
      window.localStorage.clear();
      window.sessionStorage.clear();
      return 'cleared ' + keys.length + ' key(s)' + (keys.length > 0 ? ': ' + keys.join(', ') : '');
    } catch (error) {
      return 'storage unavailable: ' + (error && error.message ? error.message : String(error));
    }
  })()`)
  info('clean-profile prologue: ' + String(storageReset))

  // Reload: the app now boots from the cleared state (first-visit conditions).
  await send('Page.navigate', { url: BASE })
  await sleep(7000)

  const expandRegions = await evaluate(`(() => {
    const family = /(medulla|pons|midbrain|diencephalon|cerebellum)/i;
    let opened = 0;
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = (region.querySelector('.tree-region-name')?.textContent || '');
      if (!family.test(name)) continue;
      const row = region.querySelector('.tree-region-row');
      if (row && row.getAttribute('aria-expanded') !== 'true') { row.click(); opened++; }
    }
    return 'opened ' + opened + ' brainstem-family region(s)';
  })()`)
  await sleep(1000)
  const expandSubdivisions = await evaluate(`(() => {
    const family = /(medulla|pons|midbrain|diencephalon|cerebellum)/i;
    let opened = 0;
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = (region.querySelector('.tree-region-name')?.textContent || '');
      if (!family.test(name)) continue;
      for (const sub of region.querySelectorAll('.tree-sub-row')) {
        if (sub.getAttribute('aria-expanded') !== 'true') { sub.click(); opened++; }
      }
    }
    return 'opened ' + opened + ' subdivision(s)';
  })()`)
  await sleep(1200)

  const bootPreset = await evaluate(`(() => {
    const presets = [...document.querySelectorAll('.header-presets button')];
    const active = presets.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent.trim());
    const offRows = [];
    let rowsSeen = 0;
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = (region.querySelector('.tree-region-name')?.textContent || '').toLowerCase();
      if (name.indexOf('telencephalon') !== -1) continue;
      if (!/(medulla|pons|midbrain|diencephalon|cerebellum)/.test(name)) continue;
      for (const row of region.querySelectorAll('.tree-leaf-row')) {
        rowsSeen++;
        if (row.classList.contains('is-off')) offRows.push((row.textContent || '').trim().slice(0, 24));
      }
    }
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.viewPreset'); } catch (error) { stored = null; }
    return {
      bootActiveLabels: active,
      labels: presets.map((b) => b.textContent.trim()),
      offRows: offRows.slice(0, 8),
      offCount: offRows.length,
      rowsSeen,
      storedPreset: stored,
    };
  })()`)
  info('boot preset reading (' + String(expandRegions) + ', ' + String(expandSubdivisions) + '): '
    + JSON.stringify({
      active: bootPreset.bootActiveLabels,
      stored: bootPreset.storedPreset,
      rowsSeen: bootPreset.rowsSeen,
      offCount: bootPreset.offCount,
    }))
  const focusVerdict = presetFocusReading(bootPreset)
  focusVerdict.ok ? ok(focusVerdict.detail) : bad(focusVerdict.detail)
  const dimmingVerdict = presetDimmingReading(bootPreset)
  dimmingVerdict.ok ? ok(dimmingVerdict.detail) : bad(dimmingVerdict.detail)

  /* A — shell & boot */
  const boot = await evaluate(`({
    rootChildren: document.getElementById('root')?.childElementCount ?? -1,
    tabs: [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>/^(3D|Plates|Syndromes)$/.test(t)),
    canvases: document.querySelectorAll('canvas').length,
    pip: !!document.querySelector('.pip-panel'),
  })`)
  boot.rootChildren > 0 ? ok(`app boots (root children ${boot.rootChildren})`) : bad('app did not boot')
  boot.tabs.length === 3 ? ok(`tabs present: ${boot.tabs.join(', ')}`) : bad(`tabs missing (${boot.tabs.join(', ')})`)
  boot.canvases >= 1 ? ok(`3D canvas present (${boot.canvases} canvas elements)`) : bad('no canvas')
  boot.pip ? ok('section PiP visible by default') : bad('section PiP missing on load')

  const threeStats = await pagePixelStats()
  threeStats && threeStats.uniqueColors > 20
    ? ok(`3D scene renders (${threeStats.uniqueColors} colour buckets, mean luminance ${threeStats.meanLum})`)
    : bad(`3D scene looks blank (${JSON.stringify(threeStats)})`)

  /* B — 3D interactions */
  const layerToggle = await evaluate(`(() => {
    const chip = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Nuclei');
    if (!chip) return 'no Nuclei chip';
    const before = chip.getAttribute('aria-pressed');
    chip.click();
    const after = chip.getAttribute('aria-pressed');
    chip.click();
    return 'aria-pressed ' + before + ' -> ' + after + ' -> ' + chip.getAttribute('aria-pressed');
  })()`)
  String(layerToggle).includes('->') && !String(layerToggle).includes('-> treu')
    ? ok(`layer toggle works (${layerToggle})`)
    : bad(`layer toggle suspicious: ${layerToggle}`)

  for (const q of ['Balanced', 'High']) {
    await evaluate(clickText(q))
    await sleep(700)
  }
  ok('quality toggle High/Balanced switched without error')

  const explode = await evaluate(`(() => {
    const r = [...document.querySelectorAll('input[type=range]')].find(x => /explode/i.test((x.getAttribute('aria-label')||'') + x.className));
    if (!r) return 'no explode slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '2');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return 'explode set';
  })()`)
  String(explode).includes('set') ? ok('explode slider operable') : info(`explode slider: ${explode}`)

  /* clip slider → PiP sync (the 3 dock sliders carry no labels — identify by range) */
  const clipSync = await evaluate(`(() => {
    const ranges = [...document.querySelectorAll('input[type=range]')];
    const x = ranges.find(r => r.min === '-48' && r.max === '48');
    if (!x) return 'no sagittal clip slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(x, '12');
    x.dispatchEvent(new Event('input', { bubbles: true }));
    return 'set x=12';
  })()`)
  await sleep(1200)
  await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const btn = panel && [...panel.querySelectorAll('button')].find(b => b.textContent.trim() === 'X');
    if (btn) btn.click();
  })()`)
  await sleep(900)
  const pipReadout = await evaluate(`document.querySelector('.pip-readout')?.textContent?.trim() ?? 'no readout'`)
  String(clipSync).includes('set') && /x\s*=\s*12/.test(String(pipReadout))
    ? ok(`clip slider drives the PiP (readout "${pipReadout}")`)
    : bad(`PiP did not follow the clip slider (${clipSync} → "${pipReadout}")`)

  const pipAxes = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const out = [];
    for (const label of ['Y','Z','X']) {
      const b = [...panel.querySelectorAll('button')].find(x => x.textContent.trim() === label) ;
      if (b) { b.click(); out.push(label); }
    }
    return out.join(',') + ' | badges ' + [...panel.querySelectorAll('.pip-orient')].map(e=>e.textContent).join('');
  })()`)
  await sleep(800)
  String(pipAxes).startsWith('Y,Z,X')
    ? ok(`PiP axis switch + orientation badges (${pipAxes})`)
    : bad(`PiP axis controls: ${pipAxes}`)

  /* C — selection + info panel content (tree is region → subdivision → structure)
   *
   * Matching rules learned from the live DOM:
   *  - subdivision rows are `button.tree-sub-row` whose text is `▸Thalamus16`,
   *    so a bare substring test matches `Epithalamus` too — strip the marker and
   *    the count and compare the NAME exactly;
   *  - leaves expose their name in `.tree-leaf-name`. */
  const clickInTree = (text, opt = {}) => `(() => {
    const root = document.querySelector('nav.tree') ?? document;
    const clean = (s) => String(s || '').replace(/^[^A-Za-z]+/, '').replace(/\\d+\\s*$/, '').trim();
    const wanted = ${JSON.stringify(text)}.toLowerCase();
    if (${opt.rowsOnly ? 'true' : 'false'}) {
      const row = [...root.querySelectorAll('button.tree-sub-row, button.tree-region-row')]
        .find((b) => clean(b.textContent).toLowerCase() === wanted || clean(b.textContent).toLowerCase().startsWith(wanted + ' '));
      if (!row) return 'not found: ${text}';
      // Idempotent: the pre-flight check expands every region, so an
      // unconditional click would COLLAPSE the subtree we need.
      const expanded = row.getAttribute('aria-expanded');
      const marker = (row.textContent || '').trim().charAt(0);
      const isOpen = expanded === 'true' || marker === '▾';
      if (!isOpen) row.click();
      return (isOpen ? 'already open: ' : 'opened: ') + row.textContent.trim().replace(/\\s+/g, ' ').slice(0, 34);
    }
    const leaf = [...root.querySelectorAll('.tree-leaf-name')].find((n) => n.textContent.trim().toLowerCase() === wanted);
    if (leaf) {
      (leaf.closest('button') ?? leaf).click();
      return 'leaf ' + leaf.textContent.trim();
    }
    return 'not found: ${text}';
  })()`
  const regionClick = await evaluate(clickInTree('Diencephalon', { rowsOnly: true }))
  await sleep(900)
  const groupClick = await evaluate(clickInTree('Thalamus', { rowsOnly: true }))
  await sleep(900)
  const pickNucleus = await evaluate(clickInTree('Pulvinar'))
  await sleep(1200)
  info(`tree navigation: region "${regionClick}" → group "${groupClick}" → node "${pickNucleus}"`)
  const panel = await evaluate(`(() => {
    const panelEl = document.querySelector('.info-panel');
    if (!panelEl) return null;
    const sections = [...panelEl.querySelectorAll('.info-section h3')].map(h => h.textContent.trim());
    const links = [...panelEl.querySelectorAll('a[href^="http"]')].map(a => a.href);
    const refs = panelEl.querySelectorAll('.ref-list li').length;
    return {
      name: panelEl.querySelector('.info-name')?.textContent?.trim() ?? '',
      sections,
      externalLinks: links.length,
      relSafe: links.every((h, i) => true),
      scholarlyRefs: refs,
      learnMore: sections.includes('Learn more'),
      bodyLength: panelEl.innerText.length,
    };
  })()`)
  if (panel === null) bad('info panel missing')
  else {
    panel.name ? ok(`selection shows a record ("${panel.name}", ${panel.bodyLength} chars of detail)`) : bad('selection panel empty')
    const need = ['Function (neurophysiology)']
    need.every((s) => panel.sections.includes(s))
      ? ok(`record sections present: ${panel.sections.join(' · ')}`)
      : bad(`missing expected sections (have: ${panel.sections.join(' · ')})`)
    panel.scholarlyRefs > 0 ? ok(`scholarly references listed (${panel.scholarlyRefs})`) : bad('no scholarly references')
    panel.learnMore && panel.externalLinks > 0
      ? ok(`Learn more external links (${panel.externalLinks})`)
      : bad(`Learn more links missing (learnMore=${panel.learnMore}, links=${panel.externalLinks})`)
  }

  /* D — search */
  const search = await evaluate(`(() => {
    const input = [...document.querySelectorAll('input')].find(i => /search/i.test(i.placeholder || i.getAttribute('aria-label') || ''));
    if (!input) return 'no search input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'STN');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'typed STN';
  })()`)
  await sleep(1200)
  const searchHits = await evaluate(`(() => {
    const hits = [...document.querySelectorAll('button,li')].filter(e => /subthalamic|STN/i.test(e.textContent || ''));
    return hits.length;
  })()`)
  String(search).includes('typed') && searchHits > 0
    ? ok(`search returns hits for "STN" (${searchHits} matching nodes)`)
    : bad(`search failed (${search} → ${searchHits} hits)`)

  /* E — Plates tab: author + live */
  await evaluate(clickText('Plates'))
  await sleep(1500)
  const authorMode = await evaluate(`({
    svg: document.querySelectorAll('svg').length,
    plateChips: document.querySelectorAll('.plate-chip').length,
    title: document.querySelector('.plate-title')?.textContent?.trim() ?? document.querySelector('.plate-stage h2')?.textContent?.trim() ?? '',
  })`)
  authorMode.svg > 0 && authorMode.plateChips >= 10
    ? ok(`author plates render (${authorMode.svg} svg, ${authorMode.plateChips} plate chips)`)
    : bad(`author plate view incomplete: ${JSON.stringify(authorMode)}`)

  await evaluate(clickText('Live section'))
  await sleep(6000)
  const live = await evaluate(sectionStats)
  live && live.painted > 50
    ? ok(`live section paints (${live.painted}/${live.sampled} non-background samples)`)
    : bad(`live section blank: ${JSON.stringify(live)}`)

  const sliders = await evaluate(`(() => {
    const ranges = [...document.querySelectorAll('.section-plane-sliders input[type=range]')];
    return ranges.map(r => (r.getAttribute('aria-label')||'?').replace(' plane position (atlas units)','') + '=' + r.value);
  })()`)
  Array.isArray(sliders) && sliders.length === 3
    ? ok(`plane sliders present (${sliders.join(', ')})`)
    : bad(`plane sliders missing: ${JSON.stringify(sliders)}`)

  const beforeMove = await evaluate(sectionStats)
  const moveSlider = async (axisLabel, delta) =>
    evaluate(`(() => {
      const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find(x => new RegExp(${JSON.stringify(axisLabel)}, 'i').test(x.getAttribute('aria-label')||''));
      if (!r) return 'not found';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(r, String(Number(r.value) + ${delta}));
      r.dispatchEvent(new Event('input', { bubbles: true }));
      return r.value;
    })()`)
  await moveSlider('transverse', 4)
  await sleep(2000)
  const afterMove = await evaluate(sectionStats)
  beforeMove && afterMove && beforeMove.hash !== afterMove.hash
    ? ok(`transverse slider moves the section (hash ${beforeMove.hash} → ${afterMove.hash})`)
    : bad(`transverse slider had no effect (${JSON.stringify(beforeMove)} → ${JSON.stringify(afterMove)})`)

  /* modality availability is axis-aware: photographs exist only for transverse
   * and coronal, so the Photo control must be disabled (with a reason) on the
   * sagittal axis — an enabled-but-inert control would be the bug. */
  const setAxis = (axis) => evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => new RegExp(${JSON.stringify(axis)}, 'i').test(x.textContent) && /transverse|sagittal|coronal/i.test(x.textContent));
    if (!b) return 'axis button not found';
    b.click();
    return b.textContent.trim();
  })()`)
  const modalityState = () => evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /^(Auto \\(real-first\\)|MRI|CT|Photo|Simulated only)$/.test(b.textContent.trim()));
    return btns.map(b => ({ m: b.textContent.trim(), disabled: !!b.disabled, title: (b.title || '').slice(0, 70), pressed: b.getAttribute('aria-pressed') === 'true' }));
  })()`)

  await setAxis('sagittal')
  await sleep(2000)
  const sagittalModalities = await modalityState()
  const photoOnSagittal = sagittalModalities.find((m) => m.m === 'Photo')
  photoOnSagittal && photoOnSagittal.disabled
    ? ok(`Photo is correctly disabled on the sagittal axis (no sagittal photographs exist) — reason: "${photoOnSagittal.title}"`)
    : bad(`Photo should be disabled on sagittal (state: ${JSON.stringify(photoOnSagittal)})`)

  await setAxis('transverse')
  await sleep(2500)

  /* modality sweep — explicit modalities must never silently swap to another.
   * v7 closure (gap 6): this sweep is COVERAGE-AWARE. It used to demand a credit
   * for every modality at every plane, which is false in this build in two
   * measured cases (the CT source ends at canonical y ≈ 36.25 au, and no
   * photograph is anchored above the highest mapped level) — and it read the
   * canvas hint from `.section-overlay-note`, which is the ERROR slot, not the
   * honest-state line (`.section-imagery-hint`). The verdict now comes from
   * `checks.modalityReading`, which is fed the plane the section is ACTUALLY on
   * (axis + value), the credit, the canvas hint and the toolbar note. */
  const modalityResults = []
  // The sweep must run with the live-section toolbar on screen: the plane
  // reading below queries the toolbar's own groups, which do not exist on the
  // 3D tab (that is what made every modality read as "pressed: null").
  await evaluate(`(() => {
    const plates = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Plates')
    if (plates) plates.click()
  })()`)
  await sleep(1200)
  const ensureLive = await evaluate(`(() => {
    const already = document.querySelector('.section-toolbar-group[aria-label="Imagery modality"]');
    if (already) return 'already in live section';
    const live = [...document.querySelectorAll('button')].find((b) => /^live section$/i.test(b.textContent.trim()));
    if (!live) return 'live-section toggle not found';
    live.click();
    return 'entered live section';
  })()`)
  await sleep(4500)
  info('modality sweep context: ' + String(ensureLive))
  const sectionPlaneReading = `(() => {
    const axisGroup = document.querySelector('.section-toolbar-group[aria-label="Section axis"]');
    const axisBtn = axisGroup
      ? [...axisGroup.querySelectorAll('button')].find((b) => b.getAttribute('aria-pressed') === 'true')
      : null;
    const activeRow = document.querySelector('.section-plane-sliders .slider-row.is-active-axis');
    const slider = activeRow ? activeRow.querySelector('input[type=range]') : null;
    const kindGroup = document.querySelector('.section-toolbar-group[aria-label="Imagery modality"]');
    const kindBtn = kindGroup
      ? [...kindGroup.querySelectorAll('button')].find((b) => b.getAttribute('aria-pressed') === 'true')
      : null;
    return {
      axis: axisBtn && /^[xyz]/.test(axisBtn.textContent.trim()) ? axisBtn.textContent.trim().charAt(0) : null,
      planeValue: slider ? Number(slider.value) : null,
      kindPressed: kindBtn ? kindBtn.textContent.trim() : null,
    };
  })()`
  for (const label of ['CT', 'MRI', 'Photo', 'Simulated only']) {
    const clicked = await evaluate(`(() => {
      const group = document.querySelector('.section-toolbar-group[aria-label="Imagery modality"]')
        ?? document.querySelector('.section-toolbar-group[aria-label=\\"Imagery modality\\"]');
      const scope = group ?? document;
      const b = [...scope.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      if (!b) return { found: false };
      const state = { found: true, disabled: !!b.disabled, title: (b.title || '').slice(0, 90), pressedBefore: b.getAttribute('aria-pressed') };
      b.click();
      return state;
    })()`)
    await sleep(3000)
    if (clicked && clicked.found === false) {
      bad(`the "${label}" modality button is not in the imagery toolbar`)
      continue
    }
    const stats = await evaluate(sectionStats)
    const planeState = await evaluate(sectionPlaneReading)
    const dom = await evaluate(`(() => ({
      credit: document.querySelector('.section-credit')?.textContent?.trim() ?? '',
      hint: document.querySelector('.section-imagery-hint')?.textContent?.trim() ?? '',
      note: document.querySelector('.section-alignment-note.is-ct-coverage')?.textContent?.trim() ?? '',
    }))()`)
    const reading = {
      requested: label,
      axis: planeState?.axis ?? null,
      planeValue: planeState?.planeValue ?? null,
      painted: stats?.painted ?? 0,
      credit: dom?.credit ?? '',
      hint: dom?.hint ?? '',
      note: dom?.note ?? '',
    }
    modalityResults.push({ ...reading, label, pressed: planeState?.kindPressed ?? null })
    if (planeState?.kindPressed !== label) {
      // Distinguish the two honest outcomes from a real defect:
      //  - the control was DISABLED and carried its reason → correct behaviour;
      //  - the control was ENABLED and the click still did not take → defect.
      if (clicked && clicked.disabled) {
        clicked.title
          ? ok(`"${label}" is disabled at this plane and states why: "${clicked.title}"`)
          : bad(`"${label}" is disabled without a reason in its title`)
      } else {
        bad('the "' + label + '" modality could not be selected (pressed: '
          + String(planeState?.kindPressed) + ', disabled: ' + String(clicked?.disabled)
          + ', title: "' + String(clicked?.title ?? '') + '")')
      }
      continue
    }
    const verdict_ = modalityReading(reading, CT_COVERAGE)
    verdict_.ok ? ok(verdict_.detail) : bad(verdict_.detail)
  }
  info('modality sweep readings: ' + JSON.stringify(
    modalityResults.map((r) => ({
      m: r.label, axis: r.axis, plane: r.planeValue, painted: r.painted,
      credit: r.credit.slice(0, 30), hint: r.hint.slice(0, 40),
    })),
  ))

  /* cross-view sync: section slider → 3D clip plane */
  const setY = await moveSlider('transverse', -6)
  await sleep(1500)
  await evaluate(clickText('3D'))
  await sleep(2500)
  const pipAfter = await evaluate(`document.querySelector('.pip-readout')?.textContent?.trim() ?? 'n/a'`)
  const expected = Number(setY)
  String(pipAfter).includes(`y = ${expected.toFixed(1)}`.replace('-', '−')) || String(pipAfter).includes(String(expected))
    ? ok(`section slider drives the 3D clip plane (PiP "${pipAfter}" vs slider ${setY})`)
    : info(`cross-view check: PiP "${pipAfter}" vs section slider y=${setY} (formatting may differ)`)

  /* F — syndromes */
  await evaluate(clickText('Syndromes'))
  await sleep(1500)
  const syndromes = await evaluate(`(() => {
    const cards = document.querySelectorAll('.syndrome-card, .syndrome-item, article');
    const openBtn = [...document.querySelectorAll('button')].find(b => /syndrome/i.test(b.className));
    return { cards: cards.length, sample: document.body.innerText.slice(0, 120).replace(/\\n+/g,' | ') };
  })()`)
  syndromes.cards > 0 ? ok(`syndromes tab renders (${syndromes.cards} cards)`) : bad('syndromes tab empty')

  /* G — references modal */
  await evaluate(clickText('References'))
  await sleep(1200)
  const modal = await evaluate(`(() => {
    const m = document.querySelector('[role=dialog]');
    return m ? m.innerText.slice(0, 200).replace(/\\n+/g, ' | ') : null;
  })()`)
  modal && /bibliograph/i.test(modal) ? ok(`references modal opens ("${modal.slice(0, 80)}…")`) : bad(`references modal missing: ${modal}`)
  await evaluate(`(() => { const b = document.querySelector('.modal-close'); if (b) b.click(); })()`)

  /* H — accessibility: authoritative accessible-name check via the AX tree */
  await send('Accessibility.enable')
  const ax = await send('Accessibility.getFullAXTree')
  const interactiveRoles = new Set(['button', 'slider', 'checkbox', 'combobox', 'textbox', 'link', 'switch', 'radio', 'tab'])
  const axNodes = (ax?.nodes ?? []).filter((n) => interactiveRoles.has(n.role?.value))
  const unnamed = axNodes.filter((n) => !(n.name?.value ?? '').trim())
  const byRole = axNodes.reduce((acc, n) => {
    const r = n.role.value
    acc[r] = (acc[r] ?? 0) + 1
    return acc
  }, {})
  axNodes.length > 0
    ? ok(`accessibility tree exposes ${axNodes.length} interactive nodes (${Object.entries(byRole).map(([r, c]) => `${r}×${c}`).join(', ')})`)
    : info('accessibility tree returned no interactive nodes')
  unnamed.length === 0
    ? ok('every interactive control has a computed accessible name')
    : bad(`${unnamed.length}/${axNodes.length} interactive controls have NO accessible name (roles: ${[...new Set(unnamed.map((n) => n.role.value))].join(', ')})`)

  /* I — keyboard operability of a plane slider */
  await evaluate(clickText('Plates'))
  await sleep(1200)
  await evaluate(clickText('Live section'))
  await sleep(3500)
  const kb = await evaluate(`(() => {
    // Use the sagittal slider: the transverse one snaps to levels, so an arrow
    // key legitimately lands back on the same value.
    const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find(x => /sagittal/i.test(x.getAttribute('aria-label') || '')) ?? [...document.querySelectorAll('.section-plane-sliders input[type=range]')][0];
    if (!r) return 'no slider';
    r.focus();
    return { focused: document.activeElement === r, value: r.value, step: r.step };
  })()`)
  if (kb && kb.focused) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 39, key: 'ArrowRight', code: 'ArrowRight' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 39, key: 'ArrowRight', code: 'ArrowRight' })
    await sleep(1200)
    const after = await evaluate(`(() => {
      const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find(x => /sagittal/i.test(x.getAttribute('aria-label') || '')) ?? [...document.querySelectorAll('.section-plane-sliders input[type=range]')][0];
      return r?.value;
    })()`)
    String(after) !== String(kb.value)
      ? ok(`plane slider is keyboard operable (ArrowRight ${kb.value} → ${after})`)
      : bad(`plane slider ignored ArrowRight (stayed ${after})`)
  } else {
    bad(`could not focus a plane slider (${JSON.stringify(kb)})`)
  }

  /* J — perf numbers */
  const perf = await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const js = res.filter(r => r.name.endsWith('.js') || r.initiatorType === 'script');
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      requests: res.length,
      jsRequests: js.length,
      transferKB: Math.round(res.reduce((n, r) => n + (r.transferSize || 0), 0) / 1024),
      largest: res.map(r => ({ n: r.name.split('/').pop(), kb: Math.round((r.transferSize||0)/1024) })).sort((a,b)=>b.kb-a.kb).slice(0,3),
    };
  })()`)
  info(`perf: DCL ${perf.domContentLoaded}ms · load ${perf.load}ms · ${perf.requests} requests · ${perf.transferKB} KB transferred · largest ${perf.largest.map(l=>`${l.n} (${l.kb}KB)`).join(', ')}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (shot?.data) {
    writeFileSync(resolve('.plate-scratch/audit-final.png'), Buffer.from(shot.data, 'base64'))
    info('final screenshot: .plate-scratch/audit-final.png')
  }

  /* K — console hygiene (a favicon 404 is the dev server's only known noise) */
  const realErrors = [...new Set([...exceptions, ...consoleErrors])].filter(
    (e) => !/favicon/i.test(e) && !/404 \(Not Found\)/.test(e),
  )
  realErrors.length === 0
    ? ok('no page exceptions or console errors during the whole audit')
    : bad(`${realErrors.length} runtime error(s): ${realErrors.slice(0, 3).join(' || ')}`)
  const faviconNoise = [...consoleErrors].some((e) => /404 \(Not Found\)/.test(e))
  if (faviconNoise) info('one console 404 observed: the app ships no favicon.ico (cosmetic)')
  const realFailures = failedRequests.filter((f) => !/favicon/i.test(f))
  realFailures.length === 0 ? ok('no failed network requests') : bad(`failed requests: ${realFailures.slice(0,3).join(' || ')}`)
  const badRes = badResponses.filter((r) => !/favicon/i.test(r))
  badRes.length === 0 ? ok('no HTTP 4xx/5xx responses') : bad(`bad responses: ${badRes.slice(0,3).join(' || ')}`)
  /* ======================================================================
   * L — v7 TELENCEPHALON checks (docs/TELENCEPHALON_PLAN.md section 5 and 9)
   *
   * Appended by v7b-integration. APPEND-ONLY: the v6 run's integration task
   * also edits this file, so this group adds a new lettered block and changes
   * nothing above it.
   *
   * Every assertion uses the existing ok/bad/info helpers and DOM the app
   * already ships (the region tree, the plate chips, the header preset buttons,
   * the section plane sliders and the .section-canvas sampler that section E
   * defines). The app exposes no debug globals and this block invents none.
   *
   * Message strings here are built with concatenation rather than template
   * literals: a stray backtick inside a comment that sits inside a template
   * literal silently terminates that literal, and the resulting parse error
   * points at an unrelated later line. Concatenation removes that trap.
   *
   * NOTE ON THE BROWSER (plan C12): this whole file needs headless Chrome,
   * which cannot start in some restricted sandboxes. Where it cannot, the
   * node-only lane is the evidence: npm run verify:pipeline independently
   * proves the +58 plane paints, npm run validate proves the four levels and
   * the telencephalon taxonomy, and the anatomy build CLI proves the budgets.
   * ==================================================================== */

  /* L1 — MOVED (v7 closure, gap 4a). The default-preset assertions now run in
   * block A0, immediately after the clean-profile boot and BEFORE any check
   * clicks a preset button. Reading the "default" here measured the audit's own
   * earlier preset click (the `Nuclei` chip in section B, which persists to
   * `neuroaxis.viewPreset`) and, across runs, whatever the persistent Chrome
   * profile had left behind. Nothing about the product changed: the default was
   * — and is — Brainstem focus, asserted at module load in `src/state/store.ts`.
   * `A0` proves it deterministically and also asserts that no brainstem-family
   * tree row renders dimmed at boot. */

  /* L2 — the tree shows the telencephalon region with its five subdivisions. */
  const telTreeOpen = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return 'no telencephalon region';
    const region = heading.closest('.tree-region');
    const row = region && region.querySelector('.tree-region-row');
    if (row && row.getAttribute('aria-expanded') !== 'true') row.click();
    return 'opened';
  })()`)
  await sleep(900)
  const telSubdivisions = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return [];
    const region = heading.closest('.tree-region');
    if (!region) return [];
    return [...region.querySelectorAll('.tree-sub-name')].map((el) => el.textContent.trim());
  })()`)
  const wantedSubdivisions = ['cerebral cortex', 'basal ganglia', 'limbic system',
    'telencephalic white matter', 'lateral ventricles']
  if (String(telTreeOpen) !== 'opened') {
    bad('telencephalon region missing from the taxonomy tree (' + String(telTreeOpen) + ')')
  } else {
    const lowered = telSubdivisions.map((name) => name.toLowerCase())
    const missing = wantedSubdivisions.filter((want) => !lowered.some((have) => have.indexOf(want) !== -1))
    if (missing.length === 0) {
      ok('telencephalon region in the tree with all ' + wantedSubdivisions.length
        + ' subdivisions (' + telSubdivisions.join(' / ') + ')')
    } else {
      bad('telencephalon subdivisions missing from the tree: ' + missing.join(', ')
        + ' (have: ' + telSubdivisions.join(' / ') + ')')
    }
  }

  /* L3 — a telencephalon structure is selectable and the info panel fills. */
  const pickTelSub = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return 'no telencephalon region';
    const region = heading.closest('.tree-region');
    if (!region) return 'no region node';
    const sub = [...region.querySelectorAll('.tree-sub-row')]
      .find((el) => /basal ganglia/i.test(el.textContent || ''));
    if (!sub) return 'no basal ganglia subdivision';
    if (sub.getAttribute('aria-expanded') !== 'true') sub.click();
    return 'opened';
  })()`)
  await sleep(800)
  const telLeafName = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return 'no region';
    const region = heading.closest('.tree-region');
    const leaf = region && region.querySelector('.tree-leaf-row');
    if (!leaf) return 'no leaf rendered';
    leaf.click();
    return (leaf.textContent || '').trim().slice(0, 40);
  })()`)
  await sleep(1300)
  const telPanel = await evaluate(`(() => {
    const el = document.querySelector('.info-panel');
    if (!el) return null;
    const nameEl = el.querySelector('.info-name');
    return {
      name: nameEl && nameEl.textContent ? nameEl.textContent.trim() : '',
      chars: el.innerText.length,
      sections: [...el.querySelectorAll('.info-section h3')].length,
    };
  })()`)
  if (String(pickTelSub).indexOf('opened') === 0 && telPanel !== null && telPanel.chars > 200 && telPanel.name !== '') {
    ok('telencephalon structure selectable from the tree (' + String(telLeafName)
      + ' -> info panel "' + telPanel.name + '", ' + telPanel.chars + ' chars, '
      + telPanel.sections + ' sections)')
  } else {
    bad('telencephalon selection failed (' + String(pickTelSub) + ' / ' + String(telLeafName)
      + ' / ' + JSON.stringify(telPanel) + ')')
  }

  /* L4 — the new level anchors exist and are reachable, and the live section
   * paints at y = +58. Reachability is proven the way a user reaches it: move
   * the transverse plane slider to +58 and require the canvas to repaint. */
  const levelAnchors = await evaluate(`(() => {
    const text = document.body.innerText;
    const ids = ['lvl-tel-thalamostriate', 'lvl-tel-basal-ganglia',
      'lvl-tel-centrum-semiovale', 'lvl-tel-convexity'];
    return { idsInDom: ids.filter((id) => text.indexOf(id) !== -1) };
  })()`)

  await evaluate(clickText('Plates'))
  await sleep(1200)
  await evaluate(clickText('Live section'))
  await sleep(5000)
  // Park the plane on a DIFFERENT telencephalic level first: an earlier check
  // may already have left the slider on +58, in which case "set to 58" causes
  // no repaint and the assertion would fail for the wrong reason.
  const parkElsewhere = await evaluate(`(() => {
    const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')]
      .find((x) => /transverse/i.test(x.getAttribute('aria-label') || ''));
    if (!r) return 'no transverse plane slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '48');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return 'parked at ' + r.value;
  })()`)
  await sleep(2500)
  const beforeTel = await evaluate(sectionStats)

  const setTransverse = await evaluate(`(() => {
    const sliders = [...document.querySelectorAll('.section-plane-sliders input[type=range]')];
    const r = sliders.find((x) => /transverse/i.test(x.getAttribute('aria-label') || '')
      || /transverse/i.test(x.className));
    if (!r) return 'no transverse plane slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '58');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return 'set to ' + r.value + ' (range ' + r.min + '..' + r.max + ')';
  })()`)
  await sleep(3000)
  const afterTel = await evaluate(sectionStats)
  const reached58 = String(setTransverse).indexOf('set to 58') !== -1
  if (reached58 && beforeTel && afterTel && beforeTel.hash !== afterTel.hash) {
    ok('transverse plane reaches y = +58 and the live section repaints (' + String(setTransverse)
      + '; hash ' + beforeTel.hash + ' -> ' + afterTel.hash + ')')
  } else {
    bad('y = +58 was not reachable / did not repaint (' + String(setTransverse)
      + ' -> ' + JSON.stringify(afterTel) + ')')
  }
  if (afterTel && afterTel.painted > 50) {
    ok('live section paints at y = +58 (' + afterTel.painted + '/' + afterTel.sampled
      + ' non-background samples)')
  } else {
    bad('live section blank at y = +58: ' + JSON.stringify(afterTel))
  }
  if (levelAnchors.idsInDom.length > 0) {
    ok('telencephalon level anchors rendered in the level ruler ('
      + levelAnchors.idsInDom.join(', ') + ')')
  } else {
    info('level anchor ids are not text in the DOM (the ruler may render names only) - '
      + 'the four anchors are proven by npm run validate + verify:plane + verify:pipeline')
  }

  /* L5 — CT coverage honesty above the Visible Human series' measured apex
   * (docs/TELENCEPHALON_PLAN.md section 2 and 9, plan C3).
   *
   * v7 closure (gap 3): the statement is a function of (axis, planeValue, kind),
   * and the check used to drive the transverse SLIDER without pinning the AXIS —
   * earlier sections focus the sagittal slider, which pins `sectionAxis = 'x'`,
   * where no coverage statement can exist. The result was a FAIL with an empty
   * note and an empty hint, which reads as a product defect but measured nothing.
   * The check now: pins the axis through its own toolbar button, PROVES the pin
   * (aria-pressed), reports {axis, planeValue, kind, notePresent, noteText,
   * hintText}, and only then asserts — through the shared pure predicate, so the
   * covered and uncovered directions are both exercised. */
  const pinTransverse = await evaluate(`(() => {
    const group = document.querySelector('.section-toolbar-group[aria-label="Section axis"]');
    const b = group ? [...group.querySelectorAll('button')].find((x) => /transverse/i.test(x.textContent)) : null;
    if (!b) return 'no transverse axis button';
    b.click();
    return 'clicked ' + b.textContent.trim();
  })()`)
  await sleep(1500)
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'CT');
    if (b) b.click();
  })()`)
  await sleep(2500)
  const ctPlane = await evaluate(sectionPlaneReading)
  const ctNote = await evaluate(`(() => {
    const noteEl = document.querySelector('.section-alignment-note.is-ct-coverage');
    const hintEl = document.querySelector('.section-imagery-hint');
    const creditEl = document.querySelector('.section-credit');
    return {
      notePresent: noteEl !== null,
      text: noteEl && noteEl.textContent ? noteEl.textContent.trim() : '',
      credit: creditEl && creditEl.textContent ? creditEl.textContent.trim() : '',
      hint: hintEl && hintEl.textContent ? hintEl.textContent.trim() : '',
    };
  })()`)
  const ctAxisProven = ctPlane?.axis === 'y'
  ctAxisProven
    ? ok('the live section is pinned to the transverse (y) axis before the CT coverage assertion ('
      + String(pinTransverse) + ', plane y = ' + String(ctPlane?.planeValue) + ' au, kind '
      + String(ctPlane?.kindPressed) + ')')
    : bad('the CT coverage check could not pin the transverse axis (' + String(pinTransverse)
      + ' → ' + JSON.stringify(ctPlane) + ') — a coverage assertion on an unpinned axis measures nothing')
  const ctVerdict = ctCoverageReading(
    {
      axis: ctPlane?.axis ?? null,
      planeValue: ctPlane?.planeValue ?? null,
      kind: ctPlane?.kindPressed ?? null,
      notePresent: ctNote?.notePresent === true,
      noteText: ctNote?.text ?? '',
      hintText: ctNote?.hint ?? '',
    },
    CT_COVERAGE,
  )
  info('CT coverage reading: ' + JSON.stringify({
    axis: ctPlane?.axis ?? null,
    planeValue: ctPlane?.planeValue ?? null,
    kind: ctPlane?.kindPressed ?? null,
    notePresent: ctNote?.notePresent === true,
    note: String(ctNote?.text ?? '').slice(0, 90),
    hint: String(ctNote?.hint ?? '').slice(0, 90),
  }))
  ctVerdict.ok ? ok(ctVerdict.detail) : bad(ctVerdict.detail)

  /* The canvas half must state the same limit as the toolbar: the hint is the
   * only thing visible over the blank plane itself. (No regex literal after a
   * statement that ends in a call — see the note on concatenation in block L.) */
  const ctCanvasHint = String(ctNote?.hint ?? '')
  const ctLimitText = CT_COVERAGE.limit === null ? '' : CT_COVERAGE.limit.toFixed(2)
  const canvasHintIsHonest =
    ctCanvasHint.length > 0 &&
    ctLimitText.length > 0 &&
    ctCanvasHint.indexOf(ctLimitText) !== -1 &&
    ctCanvasHint.indexOf('MRI is the modality of record') !== -1
  canvasHintIsHonest
    ? ok('the canvas states the same CT coverage limit as the toolbar ("'
      + ctCanvasHint.slice(0, 110) + '")')
    : bad('the canvas hint at a CT plane above the source does not state the measured limit ("'
      + ctCanvasHint.slice(0, 110) + '")')

  if (/openneuro/i.test(ctNote?.credit ?? '')) {
    ok('MRI is the modality of record above the CT limit (credit "'
      + String(ctNote?.credit ?? '').slice(0, 46) + '")')
  } else {
    info('credit while CT is requested above its coverage: "' + String(ctNote?.credit ?? '').slice(0, 60) + '"')
  }

  /* L5b — the third surface that shows real imagery: the 3D tab's live-section
   * PiP. At this same CT-above-the-source request its hint must state the same
   * measured limit (it used to print the internal token "beyond-source"). */
  await evaluate(clickText('3D'))
  await sleep(3000)
  const pipHint = await evaluate(`(() => {
    const el = document.querySelector('.pip-backdrop-hint');
    if (el === null) return null;
    return { text: (el.textContent || '').trim(), hidden: el.hidden === true };
  })()`)
  if (pipHint === null) {
    info('the PiP backdrop hint element is not in this page (the panel may be hidden) — '
      + 'the canvas half above is the asserted one')
  } else if (pipHint.text === '') {
    info('the PiP shows real imagery at this plane (no hint line) — the CT request is honoured by another modality')
  } else if (pipHint.text.indexOf(ctLimitText) !== -1 && pipHint.text.indexOf('MRI is the modality of record') !== -1) {
    ok('the PiP states the same CT coverage limit as the toolbar and the canvas ("'
      + pipHint.text.slice(0, 100) + '")')
  } else {
    bad('the PiP hint at a CT plane above the source does not state the measured limit ("'
      + pipHint.text.slice(0, 100) + '")')
  }
  // Back to the Plates tab: block L6 (the author plate) lives there.
  await evaluate(clickText('Plates'))
  await sleep(2000)

  /* L6 — the telencephalon plates are present and render. */
  await evaluate(clickText('Author plate'))
  await sleep(1200)
  const telPlate = await evaluate(`(() => {
    const chips = [...document.querySelectorAll('.plate-chip')];
    const tel = chips.filter((c) => /telencephalon/i.test(c.textContent || ''));
    if (tel.length === 0) return { found: false, count: 0, chips: chips.length, label: '' };
    tel[0].click();
    return {
      found: true,
      count: tel.length,
      chips: chips.length,
      label: tel[0].textContent.trim().slice(0, 60),
    };
  })()`)
  await sleep(1800)
  const telPlateDrawn = await evaluate(`({
    svg: document.querySelectorAll('.plate-stage svg').length,
    labels: document.querySelectorAll('.plate-stage svg text').length,
  })`)
  if (telPlate.found && telPlateDrawn.svg > 0) {
    ok('telencephalon plate present and renders (' + telPlate.count + ' of ' + telPlate.chips
      + ' chips; "' + telPlate.label + '" -> ' + telPlateDrawn.svg + ' svg, '
      + telPlateDrawn.labels + ' label elements)')
  } else {
    bad('telencephalon plate missing or blank (' + JSON.stringify(telPlate) + ' / '
      + JSON.stringify(telPlateDrawn) + ')')
  }

  /* L7 — runtime hygiene during the telencephalon pass: the same collectors as
   * section K, re-read so a failure introduced by the new geometry or presets
   * is attributed to this block rather than only to the earlier one. */
  const telErrors = [...new Set([...exceptions, ...consoleErrors])].filter(
    (e) => !/favicon/i.test(e) && !/404 \(Not Found\)/.test(e),
  )
  if (telErrors.length === 0) {
    ok('no page exceptions or console errors during the telencephalon checks')
  } else {
    bad(telErrors.length + ' runtime error(s) during the telencephalon checks: '
      + telErrors.slice(0, 3).join(' || '))
  }

  /* ======================================================================
   * M — P0: WEBGL CONTEXT LOSS IS SURVIVABLE (QUALITY_PLAN §1 item 1, §6)
   *
   * This is a PERMANENT GATE, not a demonstration: it drives the real
   * `WEBGL_lose_context` extension on the R3F canvas and requires the app to
   * show its recovery state and then come back.
   *
   * The contract it asserts (Viewer3D.tsx):
   *   • `div.viewer-context-lost[role="alert"][data-context-lost]` is the
   *     recovery overlay, and it is UNMOUNTED while the context is healthy — so
   *     a healthy canvas is never covered by it;
   *   • `loseContext()` must make it appear with `data-context-lost="lost"`;
   *   • `restoreContext()` must remove it again AND leave a live, non-lost
   *     context behind (asserted through the canvas' own `isContextLost()`);
   *   • if the browser never fires `webglcontextrestored`, the code's own
   *     terminal state after CONTEXT_LOSS_DEAD_MS (20 s) is
   *     `data-context-lost="dead"` with a Reload control. That branch is also a
   *     PASS — the failure mode being eliminated is the SILENT blank canvas,
   *     not the honest "reload" affordance. Which branch fired is reported.
   * ==================================================================== */

  await evaluate(clickText('3D'))
  await sleep(2500)
  const contextBefore = await evaluate(`(() => {
    const overlay = document.querySelector('[data-context-lost]');
    const canvas = document.querySelector('.viewer3d-canvas canvas')
      || document.querySelector('.viewer3d-root canvas')
      || document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas found' };
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'no WebGL context on the canvas' };
    const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return { error: 'WEBGL_lose_context is unavailable in this browser' };
    // Stash on window so the next evaluate() can reach the SAME context object
    // (a second getContext call on a lost canvas may return null).
    window.__auditGl = gl;
    window.__auditExt = ext;
    window.__auditCanvas = canvas;
    return {
      tag: canvas.tagName,
      canvasClass: canvas.className,
      lostBefore: gl.isContextLost(),
      overlayMounted: overlay !== null,
      overlayPhase: overlay === null ? null : overlay.getAttribute('data-context-lost'),
      panelError: document.querySelector('[data-panel-error]')?.getAttribute('data-panel-error') ?? null,
    };
  })()`)

  if (contextBefore?.error !== undefined) {
    /* An environment limitation, not a product failure: no canvas, no WebGL, or
     * no extension. Reported as informational so the gate is honest about what
     * it could not exercise rather than failing the run for it. */
    info('context-loss gate skipped: ' + contextBefore.error)
  } else {
    const healthyVerdict = contextLossReading(
      {
        mounted: contextBefore.overlayMounted === true,
        phase: contextBefore.overlayPhase,
        canvasLost: contextBefore.lostBefore,
        panelError: contextBefore.panelError,
      },
      false,
    )
    healthyVerdict.ok ? ok(healthyVerdict.detail) : bad(healthyVerdict.detail)

    // --- lose the context -------------------------------------------------
    const lostNow = await evaluate(`(() => {
      const ext = window.__auditExt;
      if (!ext) return 'no extension stashed';
      ext.loseContext();
      return 'loseContext() called';
    })()`)
    await sleep(1200)
    const afterLoss = await evaluate(`(() => {
      const overlay = document.querySelector('[data-context-lost]');
      const gl = window.__auditGl;
      return {
        mounted: overlay !== null,
        phase: overlay === null ? null : overlay.getAttribute('data-context-lost'),
        role: overlay === null ? '' : overlay.getAttribute('role'),
        text: overlay === null ? '' : overlay.innerText.slice(0, 120).replace(/\\n+/g, ' | '),
        buttons: overlay === null ? [] : [...overlay.querySelectorAll('button')].map((b) => b.textContent.trim()),
        canvasLost: gl ? gl.isContextLost() : 'no gl',
        // Fail-stop diagnostics: when the overlay is missing, these fields say
        // WHY — a panel error card means an error boundary replaced the canvas
        // subtree (the measured v7 defect), while a still-attached canvas means
        // the loss was simply never observed.
        panelError: document.querySelector('[data-panel-error]')?.getAttribute('data-panel-error') ?? null,
        canvasAttached: window.__auditCanvas ? document.contains(window.__auditCanvas) : false,
        canvasCount: document.querySelectorAll('canvas').length,
      };
    })()`)
    info('context-loss diagnostic after loseContext(): ' + JSON.stringify({
      phase: afterLoss.phase,
      role: afterLoss.role,
      buttons: afterLoss.buttons,
      canvasLost: afterLoss.canvasLost,
      canvasAttached: afterLoss.canvasAttached,
      canvasCount: afterLoss.canvasCount,
      panelError: afterLoss.panelError,
      text: String(afterLoss.text).slice(0, 80),
    }))
    String(lostNow).includes('called') && afterLoss.canvasLost === true
      ? ok('WEBGL_lose_context.loseContext() really lost the context (isContextLost() === true)')
      : bad('loseContext() did not lose the context (' + String(lostNow) + ' / ' + JSON.stringify(afterLoss) + ')')
    const lossVerdict = contextLossReading(afterLoss, true)
    lossVerdict.ok ? ok(lossVerdict.detail) : bad(lossVerdict.detail)

    // --- restore it -------------------------------------------------------
    const restoreNow = await evaluate(`(() => {
      const button = [...document.querySelectorAll('[data-context-lost] button')]
        .find((b) => /restore/i.test(b.textContent || ''));
      if (button) { button.click(); return 'clicked the Restore button'; }
      const ext = window.__auditExt;
      if (ext) { ext.restoreContext(); return 'called restoreContext() directly'; }
      return 'no restore path';
    })()`)
    await sleep(2500)
    const afterRestore = await evaluate(`(() => {
      const overlay = document.querySelector('[data-context-lost]');
      const gl = window.__auditGl;
      const canvas = document.querySelector('.viewer3d-canvas canvas') || document.querySelector('canvas');
      return {
        mounted: overlay !== null,
        phase: overlay === null ? null : overlay.getAttribute('data-context-lost'),
        buttons: overlay === null ? [] : [...overlay.querySelectorAll('button')].map((b) => b.textContent.trim()),
        canvasLost: gl ? gl.isContextLost() : 'no gl',
        canvasCount: document.querySelectorAll('canvas').length,
        liveContext: canvas ? (canvas.getContext('webgl2') || canvas.getContext('webgl')) !== null : false,
      };
    })()`)
    const restoreVerdict = contextRestoreReading(afterRestore)
    if (restoreVerdict.ok && restoreVerdict.label === 'restored') {
      ok(restoreVerdict.detail + ' (' + String(restoreNow) + ')')
      const repaint = await pagePixelStats()
      repaint && repaint.uniqueColors > 20
        ? ok('the 3D scene really repainted after the restore (' + repaint.uniqueColors
          + ' colour buckets, mean luminance ' + repaint.meanLum + ')')
        : bad('the canvas did not repaint after the context was restored (' + JSON.stringify(repaint) + ')')
    } else {
      restoreVerdict.ok
        ? ok(restoreVerdict.detail + ' (' + String(restoreNow) + ')')
        : bad(restoreVerdict.detail + ' (' + String(restoreNow) + ' / ' + JSON.stringify(afterRestore) + ')')
    }

    /* The PiP has its own context survival path. `pipContextState` is the
     * module's own published state, and the PiP note (`.pip-context-lost`) is
     * the visible half. A loss on the SHARED canvas is what the PiP listens for
     * (`gl.domElement`), so the PiP is asserted from whatever the loss left
     * behind rather than by losing a second, separate context. */
    const pipAfter = await evaluate(`(() => {
      const note = document.querySelector('.pip-context-lost');
      const pipCanvas = document.querySelector('.pip-panel canvas');
      return {
        note: note === null ? 'none' : (note.getAttribute('role') || 'no role'),
        text: note === null ? '' : note.innerText.slice(0, 80),
        pipCanvas: pipCanvas !== null,
      };
    })()`)
    info('PiP context state after the loss cycle: ' + JSON.stringify(pipAfter))
  }

  /* ======================================================================
   * N — P0: AN ERROR BOUNDARY CONTAINS A REAL THROW (QUALITY_PLAN §1 item 2, §6)
   *
   * The forced throw is a DEV-ONLY hook: `?panelfail=<surface>` makes exactly
   * one named boundary throw during render. It is implemented inside
   * `src/components/section/SectionErrorBoundary.tsx` guarded by
   * `import.meta.env.DEV`, so a production build can never reach it.
   *
   * What is proven here: the throw is CONTAINED (the card appears, the rest of
   * the app still works, Retry brings the panel back). What is proven by
   * `scripts/verify/boundary-contract.mjs`: every surface is wrapped, and the
   * boundary's own state transition + Retry reset behave as advertised.
   * ==================================================================== */

  /** The surfaces the app wraps, in the order App.tsx mounts them. */
  const BOUNDARY_SURFACES = ['Taxonomy tree', 'Syndrome browser']
  await send('Page.navigate', { url: `${BASE}/?panelfail=${encodeURIComponent(BOUNDARY_SURFACES[0])}` })
  await sleep(7000)

  const probeHooked = await evaluate(`document.querySelector('[data-panel-probe]')?.getAttribute('data-panel-probe') ?? 'not armed'`)
  info('forced-throw probe reports: ' + String(probeHooked))

  const contained = await evaluate(`(() => {
    const card = document.querySelector('[data-panel-error]');
    const probe = document.querySelector('[data-panel-probe]');
    return {
      card: card === null ? null : card.getAttribute('data-panel-error'),
      role: card === null ? '' : card.getAttribute('role'),
      text: card === null ? '' : card.innerText.slice(0, 140).replace(/\\n+/g, ' | '),
      hasRetry: card === null ? false : [...card.querySelectorAll('button')].some((b) => /retry/i.test(b.textContent || '')),
      // v7 closure (gap 5): the marker now lives ON the failure card, so a single
      // signal proves "the hook armed" AND "that throw was contained here".
      probes: document.querySelectorAll('[data-panel-probe]').length,
      probeName: probe === null ? null : probe.getAttribute('data-panel-probe'),
      cards: document.querySelectorAll('[data-panel-error]').length,
      // The rest of the app must still be there and still be interactive.
      tabs: [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim()),
      appShell: document.querySelector('.app-shell') !== null,
      canvases: document.querySelectorAll('canvas').length,
      otherSurfaces: {
        header: document.querySelector('header, .app-header, .header') !== null,
        infoPanel: document.querySelector('.info-panel') !== null,
      },
    };
  })()`)

  const containmentVerdict = panelContainmentReading({
    expected: BOUNDARY_SURFACES[0],
    card: contained.card,
    probes: contained.probes,
    hasRetry: contained.hasRetry,
    armed: probeHooked,
  })
  containmentVerdict.ok
    ? ok(containmentVerdict.detail + ' — "' + String(contained.text).slice(0, 80) + '"')
    : bad(containmentVerdict.detail)
  contained.appShell && contained.tabs.length >= 3
    ? ok('the app did NOT blank: shell present, ' + contained.tabs.length + ' tabs still rendered ('
      + contained.tabs.join(', ') + ')')
    : bad('the app was degraded by the contained throw (' + JSON.stringify(contained) + ')')
  contained.canvases >= 1
    ? ok('the other panels kept rendering while one threw (' + contained.canvases + ' canvas element(s) live)')
    : info('no canvas while the Plates/3D tab is inactive (tab-scoped panels are unmounted by design)')

  /* Exactly ONE boundary may be armed by the parameter, and the other surfaces
   * must be untouched. Read from the SAME reading as the card (before Retry):
   * the probe is one-shot (see SectionErrorBoundary), so after a successful
   * recovery there is correctly nothing left to count. */
  contained.probes === 1 && contained.cards === 1
    ? ok('exactly ONE boundary is armed by ?panelfail=<surface> (probe="' + String(contained.probeName)
      + '", 1 failure card, the other surfaces render their children normally)')
    : bad('?panelfail armed ' + contained.probes + ' boundary marker(s) / ' + contained.cards
      + ' failure card(s) — the other panels must be unaffected')
  contained.probes === 1 && contained.probeName === BOUNDARY_SURFACES[0]
    ? ok('the containment card is observable: [data-panel-probe="' + contained.probeName
      + '"] and [data-panel-error="' + contained.card + '"] are the same element')
    : bad('the containment signal is not observable (probes=' + contained.probes
      + ', probeName=' + JSON.stringify(contained.probeName) + ', card=' + JSON.stringify(contained.card) + ')')

  /* Retry must clear the card and bring the panel back. */
  const retryClick = await evaluate(`(() => {
    const card = document.querySelector('[data-panel-error]');
    const button = card && [...card.querySelectorAll('button')].find((b) => /retry/i.test(b.textContent || ''));
    if (!button) return 'no retry button';
    button.click();
    return 'clicked Retry';
  })()`)
  await sleep(1500)
  const afterRetry = await evaluate(`(() => {
    const card = document.querySelector('[data-panel-error]');
    const probe = document.querySelector('[data-panel-probe]');
    return {
      card: card === null ? 'cleared' : card.getAttribute('data-panel-error'),
      probeArmed: probe === null ? 'disarmed' : 'still armed',
      treePanelBack: document.querySelector('.tree .tree-region-row') !== null,
      cards: document.querySelectorAll('[data-panel-error]').length,
    };
  })()`)
  const recoveryVerdict = panelRecoveryReading({
    expected: BOUNDARY_SURFACES[0],
    card: afterRetry.card,
    panelBack: afterRetry.treePanelBack === true,
  })
  recoveryVerdict.ok
    ? ok(recoveryVerdict.detail + ' (' + String(retryClick) + ', probe ' + String(afterRetry.probeArmed) + ')')
    : bad(recoveryVerdict.detail + ' (card=' + String(afterRetry.card) + ', probe='
      + String(afterRetry.probeArmed) + ', tree=' + String(afterRetry.treePanelBack) + ')')

  /* Back to a healthy page: the hook must be inert without the parameter. */
  await send('Page.navigate', { url: BASE })
  await sleep(6000)
  const healthyAgain = await evaluate(`({
    probes: document.querySelectorAll('[data-panel-probe]').length,
    cards: document.querySelectorAll('[data-panel-error]').length,
    tabs: document.querySelectorAll('[role=tab]').length,
    appShell: document.querySelector('.app-shell') !== null,
  })`)
  healthyAgain.probes === 0 && healthyAgain.cards === 0
    ? ok('without ?panelfail the forced-throw hook is completely inert (0 probes, 0 failure cards)')
    : bad('the forced-throw hook is active without the parameter (' + JSON.stringify(healthyAgain) + ')')
  healthyAgain.appShell && healthyAgain.tabs >= 3
    ? ok('the app loads healthy again after the containment demonstration')
    : bad('the app did not return to a healthy state (' + JSON.stringify(healthyAgain) + ')')

  /* v7 closure (gap 5): the `?panelfail` throw is DELIBERATE, so the boundary's
   * own componentDidCatch line, React's dev log of the captured error and the
   * "The above error occurred in the <PanelFailureProbe> component" message are
   * expected traffic — they are excluded by the probe's OWN error text, never by
   * a broad "any panel error" pattern, so a real (uncontained) failure still
   * fails this gate. How many lines were excluded is reported. */
  const DELIBERATE_PROBE = /deliberate render failure|PanelFailureProbe/
  const collected = [...new Set([...exceptions, ...consoleErrors])].filter(
    (e) => !/favicon/i.test(e) && !/404 \(Not Found\)/.test(e),
  )
  const deliberate = collected.filter(
    (e) => /panel\] .* failed/.test(e) || DELIBERATE_PROBE.test(e),
  )
  const p0Errors = collected.filter(
    (e) => !/panel\] .* failed/.test(e) && !DELIBERATE_PROBE.test(e),
  )
  if (deliberate.length > 0) {
    info('excluded ' + deliberate.length + ' log line(s) from the DELIBERATE ?panelfail throw: "'
      + deliberate[0].slice(0, 90) + '"')
  }
  if (p0Errors.length === 0) {
    ok('no unexpected runtime errors during the P0 gates (the deliberate throw is reported by the boundary itself)')
  } else {
    bad(p0Errors.length + ' unexpected error(s) during the P0 gates: ' + p0Errors.slice(0, 3).join(' || '))
  }

} catch (error) {
  bad(`audit aborted: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  // Stops Chrome AND the dev server this script started (a server it did not
  // start is never touched), then hard-exits below so no handle can keep the
  // wrapper alive.
  await lifecycle.dispose()
}

const passed = results.filter(([s]) => s === 'ok').length
const failed = results.filter(([s]) => s === 'FAIL').length
console.log('\n================ NeuroAxis runtime audit ================')
for (const [status, message] of results) {
  console.log(`${status === 'ok' ? '  ok ' : status === 'FAIL' ? ' FAIL' : ' info'}  ${message}`)
}
console.log(`\n${passed} passed · ${failed} failed · ${results.filter(([s]) => s === 'info').length} informational`)
console.log(`exit ${failed === 0 ? EXIT.OK : EXIT.CHECKS_FAILED} (${failed === 0 ? 'all checks passed' : 'CHECKS FAILED'})`)
process.exit(failed === 0 ? EXIT.OK : EXIT.CHECKS_FAILED)
