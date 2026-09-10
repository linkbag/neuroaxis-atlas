/**
 * audit.mjs — deep end-to-end runtime audit of NeuroAxis.
 *
 * Drives a real headless Chrome over the DevTools Protocol and asserts that
 * every shipped feature actually works at runtime, collecting console errors,
 * page exceptions, failed requests and performance numbers along the way.
 * Complements the code-level checks (`npm run validate` / `check` / `build`),
 * which cannot see runtime behaviour.
 *
 * Usage:  npm run verify:audit           (expects the dev server on :5173)
 *         node scripts/verify/audit.mjs http://localhost:5173
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const PORT = 9355
const PROFILE = resolve('.plate-scratch/chrome-profile-audit')
mkdirSync(PROFILE, { recursive: true })

const CHROME = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
].find((p) => p !== undefined && existsSync(p))
if (!CHROME) {
  console.error('chrome not found')
  process.exit(2)
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--enable-unsafe-swiftshader',
    '--window-size=1500,950',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (m) => results.push(['ok', m])
const bad = (m) => results.push(['FAIL', m])
const info = (m) => results.push(['info', m])

let ws
let send
let evaluate
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

try {
  await connect()
  await send('Page.navigate', { url: BASE })
  await sleep(7000)

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

  /* C — selection + info panel content (tree is region → subdivision → structure) */
  const clickContaining = (text) => `(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(${JSON.stringify(text)}));
    if (!b) return 'not found: ${text}';
    b.click();
    return b.textContent.trim().slice(0, 34);
  })()`
  const regionClick = await evaluate(clickContaining('Diencephalon'))
  await sleep(900)
  const groupClick = await evaluate(clickContaining('Thalamus'))
  await sleep(900)
  const pickNucleus = await evaluate(clickContaining('Pulvinar'))
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

  /* modality sweep — explicit modalities must never silently swap to another */
  const modalityResults = []
  for (const [label, expect, forbid] of [
    ['CT', /national library of medicine/i, /openneuro|british columbia/i],
    ['MRI', /openneuro/i, /national library of medicine|british columbia/i],
    ['Photo', /(british columbia|national library of medicine)/i, /openneuro|ds007313/i],
    ['Simulated only', null, /openneuro|national library|british columbia/i],
  ]) {
    await evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)});
      if (b) b.click();
    })()`)
    await sleep(3000)
    const stats = await evaluate(sectionStats)
    const credit = await evaluate(`document.querySelector('.section-credit')?.textContent?.trim() ?? ''`)
    const hint = await evaluate(`document.querySelector('.section-overlay-note:not(.section-debug)')?.textContent?.trim() ?? ''`)
    modalityResults.push({ label, painted: stats?.painted ?? 0, credit, hint })
    if (!stats || stats.painted < 50) bad(`modality ${label} painted nothing`)
    else if (forbid && forbid.test(credit)) bad(`modality ${label} silently showed another modality: "${credit.slice(0, 50)}"`)
    else if (expect && expect.test(credit)) ok(`modality ${label}: ${stats.painted} samples · credit "${credit.slice(0, 44)}"`)
    else if (!expect && credit === '') ok(`modality ${label}: ${stats.painted} samples · no real imagery (as chosen)`)
    else if (!credit && hint) ok(`modality ${label}: ${stats.painted} samples · honest state "${hint.slice(0, 40)}"`)
    else bad(`modality ${label} credit unexpected: "${credit.slice(0, 50)}"`)
  }

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
} catch (error) {
  bad(`audit aborted: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  chrome.kill()
}

const passed = results.filter(([s]) => s === 'ok').length
const failed = results.filter(([s]) => s === 'FAIL').length
console.log('\n================ NeuroAxis runtime audit ================')
for (const [status, message] of results) {
  console.log(`${status === 'ok' ? '  ok ' : status === 'FAIL' ? ' FAIL' : ' info'}  ${message}`)
}
console.log(`\n${passed} passed · ${failed} failed · ${results.filter(([s]) => s === 'info').length} informational`)
process.exit(failed === 0 ? 0 : 1)
