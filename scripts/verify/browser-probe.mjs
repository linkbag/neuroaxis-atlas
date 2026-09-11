/**
 * Headless browser probe (Chrome DevTools Protocol, no npm deps).
 *
 * Loads the running dev server, clicks "Live section", and reports every
 * console message, page exception and failed network request — so runtime
 * failures can be diagnosed without a human at the keyboard.
 *
 * SELF-SUFFICIENT: when nothing answers at the target URL this starts the dev
 * server itself, waits for HTTP 200, then stops it again on every exit path
 * (an already-running server can still be targeted by passing its URL).
 *
 * Run: node scripts/verify/browser-probe.mjs [url] [--screenshot out.png]
 * Exit: 0 clean · 1 page exceptions / bad responses · 2 no Chrome · 3 no server
 *       · 4 Chrome unusable (see scripts/verify/lib/startServer.mjs)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { EXIT, createLifecycle, killTree, launchChrome, startDevServer } from './lib/startServer.mjs'

const URL_ = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:5173'
const SHOT = resolve('.plate-scratch/live-section.png')
const PORT = 9333
const PROFILE = resolve('.plate-scratch/chrome-profile')
mkdirSync(PROFILE, { recursive: true })

const lifecycle = createLifecycle((message) => console.log(`  ·  ${message}`))

const server = await startDevServer({
  baseUrl: URL_,
  lifecycle,
  log: (message) => console.log(`  ·  ${message}`),
  timeoutMs: 30_000,
})
if (server.failed === true) {
  console.error(`\ncannot run: the dev server never answered HTTP 200 at ${URL_}`)
  console.error(`exit ${EXIT.SERVER_UNAVAILABLE} (environment unusable — no check was run)`)
  await lifecycle.dispose()
  process.exit(EXIT.SERVER_UNAVAILABLE)
}

const launched = await launchChrome({
  port: PORT,
  profileDir: PROFILE,
  windowSize: '1400,900',
  log: (message) => console.log(`  ·  ${message}`),
})
if (!launched.ok) {
  console.error(`\ncannot run: ${launched.reason}`)
  console.error(`exit ${EXIT.BROWSER_UNAVAILABLE} (environment unusable — no check was run)`)
  await lifecycle.dispose()
  process.exit(EXIT.BROWSER_UNAVAILABLE)
}
lifecycle.add(async () => {
  killTree(launched.chrome.pid)
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('devtools endpoint never came up')
}

const page = await targets()
const ws = new WebSocket(page.webSocketDebuggerUrl)
let nextId = 1
const pending = new Map()
const console_ = []
const exceptions = []
const failedRequests = []
const responses404 = []

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id !== undefined) {
    const resolver = pending.get(msg.id)
    if (resolver) {
      pending.delete(msg.id)
      resolver(msg.result ?? msg.error)
    }
    return
  }
  const { method, params } = msg
  if (method === 'Runtime.consoleAPICalled') {
    const text = (params.args ?? [])
      .map((a) => (a.value !== undefined ? String(a.value) : a.description ?? a.type))
      .join(' ')
    console_.push(`[${params.type}] ${text}`)
  } else if (method === 'Runtime.exceptionThrown') {
    const d = params.exceptionDetails
    exceptions.push(
      `${d.exception?.description ?? d.text}${d.url ? ` (${d.url}:${d.lineNumber})` : ''}`,
    )
  } else if (method === 'Log.entryAdded') {
    const e = params.entry
    if (e.level === 'error') console_.push(`[log:${e.source}] ${e.text}`)
  } else if (method === 'Network.loadingFailed') {
    failedRequests.push(`${params.type} ${params.errorText}${params.blockedReason ? ` (${params.blockedReason})` : ''}`)
  } else if (method === 'Network.responseReceived') {
    if (params.response.status >= 400) {
      responses404.push(`${params.response.status} ${params.response.url}`)
    }
  }
})

function send(method, params = {}) {
  const id = nextId++
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((res) => pending.set(id, res))
}

await new Promise((res, rej) => {
  ws.addEventListener('open', res, { once: true })
  ws.addEventListener('error', rej, { once: true })
})

await send('Runtime.enable')
await send('Log.enable')
await send('Network.enable')
await send('Page.enable')
// Headless pages report `document.hidden === true`, and SectionCanvas skips its
// rAF paint while hidden — force the page visible so the draw path really runs.
try {
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
} catch {
  /* older builds */
}
try {
  await send('Page.setWebLifecycleState', { state: 'active' })
} catch {
  /* older builds */
}
try {
  await send('Page.bringToFront')
} catch {
  /* older builds */
}

await send('Page.navigate', { url: URL_ })
await sleep(6000)

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result?.exceptionDetails) return `THREW: ${result.exceptionDetails.exception?.description}`
  return result?.result?.value
}

console.log('--- initial DOM ---')
console.log(
  'root children:',
  await evaluate('document.getElementById("root")?.childElementCount ?? -1'),
)
console.log('buttons:', await evaluate('[...document.querySelectorAll("button")].map(b=>b.textContent.trim()).slice(0,40).join(" | ")'))

console.log('\n--- page visibility ---')
console.log(
  'visibilityState:',
  await evaluate('document.visibilityState + " hidden=" + document.hidden'),
)

console.log('\n--- opening Plates tab ---')
console.log(
  'click Plates:',
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /^plates$/i.test(x.textContent.trim()));
    if (!b) return 'Plates tab not found';
    b.click();
    return 'clicked Plates';
  })()`),
)
await sleep(1500)
console.log('buttons now:', await evaluate('[...document.querySelectorAll("button")].map(b=>b.textContent.trim()).slice(0,30).join(" | ")'))

console.log('\n--- clicking "Live section" ---')
console.log(
  'click result:',
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /live section/i.test(x.textContent));
    if (!b) return 'button not found';
    b.click();
    return 'clicked: ' + b.textContent.trim();
  })()`),
)
await sleep(7000)

console.log('\n--- transfer experiment (isolates the DataCloneError) ---')
console.log(
  await evaluate(`(() => {
    const out = [];
    const a = new Float32Array(8), b = new Uint32Array(8);
    out.push('plain Float32Array: bufferIsAB=' + (a.buffer instanceof ArrayBuffer) +
             ' bufferIsSAB=' + (typeof SharedArrayBuffer !== 'undefined' && a.buffer instanceof SharedArrayBuffer));
    try {
      const w = new Worker(URL.createObjectURL(new Blob(['self.onmessage=()=>{}'], {type:'application/javascript'})));
      w.postMessage({ t: 'x', parts: [{ positions: a, indices: b }] }, [a, b]);
      out.push('blob-worker transfer OK');
      w.terminate();
    } catch (e) { out.push('blob-worker THREW: ' + e.name + ': ' + e.message); }
    try {
      const c = new Float32Array(8), d = new Uint32Array(8);
      const w2 = new Worker(new URL('/src/components/section/contourWorker.ts', location.origin), { type: 'module' });
      w2.postMessage({ t: 'init', parts: [{ slug:'t', group:'t', region:null, kind:'nucleus', color:'#fff', positions: c, indices: d }] }, [c, d]);
      out.push('module-worker transfer OK');
      w2.terminate();
    } catch (e) { out.push('module-worker THREW: ' + e.name + ': ' + e.message); }
    return out.join(' | ');
  })()`),
)

console.log('\n--- post-click DOM ---')
console.log('canvas count:', await evaluate('document.querySelectorAll("canvas").length'))
console.log('section canvas size:', await evaluate(`(() => {
  const c = document.querySelector('.section-canvas');
  return c ? c.width + 'x' + c.height + ' css ' + c.clientWidth + 'x' + c.clientHeight : 'no .section-canvas';
})()`))
console.log('overlay notes:', await evaluate(`[...document.querySelectorAll('.section-overlay-note')].map(n=>n.textContent.trim()).join(' || ') || 'none'`))
console.log('credit:', await evaluate(`document.querySelector('.section-credit')?.textContent?.trim() ?? 'none'`))
console.log('hint:', await evaluate(`document.querySelector('.section-hint')?.textContent?.trim() ?? 'none'`))
console.log('body text head:', await evaluate('document.body.innerText.slice(0,300).replace(/\\n+/g," | ")'))

// --- render assertions: does the section canvas actually contain anything? ---
console.log('\n--- rAF health + store-driven redraw ---')
console.log(
  'rAF ticks in 500ms:',
  await evaluate(`new Promise((resolve) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < 500) requestAnimationFrame(f); else resolve(n); };
    requestAnimationFrame(f);
  })`),
)
console.log(
  'click a level chip then re-measure:',
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /midpontine/i.test(x.textContent));
    if (!b) return 'level chip not found';
    b.click();
    return 'clicked ' + b.textContent.trim();
  })()`),
)
await sleep(2500)
console.log('canvas size after store change:', await evaluate(`(() => {
  const c = document.querySelector('.section-canvas');
  return c ? c.width + 'x' + c.height : 'no canvas';
})()`))
console.log('debug line:', await evaluate(`document.querySelector('.section-debug')?.textContent?.trim() ?? 'none'`))

console.log('\n--- modality + axis sweep ---')
const pixelStats = `(() => {
  const c = document.querySelector('.section-canvas');
  if (!c) return 'no canvas';
  const ctx = c.getContext('2d');
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  let painted = 0, sampled = 0;
  for (let i = 0; i < data.length; i += 4 * 37) {
    sampled++;
    const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
    if (a < 8) continue;
    const isBg = Math.abs(r-13) < 9 && Math.abs(g-21) < 9 && Math.abs(b-38) < 12;
    if (!isBg) painted++;
  }
  return (100*painted/sampled).toFixed(1) + '% painted of ' + c.width + 'x' + c.height;
})()`

for (const label of ['CT', 'MRI', 'Photo', 'Simulated only']) {
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)});
    if (b) b.click();
  })()`)
  await sleep(2500)
  console.log(
    `${label.padEnd(15)} →`,
    await evaluate(pixelStats),
    '· credit:',
    await evaluate(`document.querySelector('.section-credit')?.textContent?.trim().slice(0, 60) ?? 'none'`),
  )
}

for (const axisName of ['sagittal', 'coronal', 'transverse']) {
  const clicked = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => ${JSON.stringify(axisName)} + '$' === x.textContent.trim().split(' ').slice(-1)[0].toLowerCase() || new RegExp(${JSON.stringify(axisName)} + '$', 'i').test(x.textContent.trim()));
    if (!b) return 'not found';
    b.click();
    return b.textContent.trim();
  })()`)
  await sleep(2200)
  console.log(
    `axis ${axisName.padEnd(11)} →`,
    await evaluate(pixelStats),
    '· clicked:',
    clicked,
    '·',
    await evaluate(`document.querySelector('.section-debug')?.textContent?.trim().slice(0, 70) ?? 'no debug'`),
  )
}

console.log('\n--- canvas pixels ---')
console.log(
  await evaluate(`(() => {
    const c = document.querySelector('.section-canvas');
    if (!c) return 'no .section-canvas';
    const ctx = c.getContext('2d');
    const { width, height } = c;
    const data = ctx.getImageData(0, 0, width, height).data;
    let painted = 0, sampled = 0;
    const colors = new Map();
    for (let i = 0; i < data.length; i += 4 * 37) {
      sampled++;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 8) continue;
      // Background of the canvas (v3 token) is a near-uniform dark navy.
      const isBg = Math.abs(r-13) < 9 && Math.abs(g-21) < 9 && Math.abs(b-38) < 12;
      if (!isBg) painted++;
      const key = (r>>4) + ',' + (g>>4) + ',' + (b>>4);
      colors.set(key, (colors.get(key) || 0) + 1);
    }
    const top = [...colors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4)
      .map(([k,v]) => k + '×' + v).join(' ');
    return 'size ' + width + 'x' + height + ' · sampled ' + sampled +
      ' · non-background ' + painted + ' (' + (100*painted/sampled).toFixed(1) + '%)' +
      ' · top color buckets ' + top;
  })()`),
)

const shot = await send('Page.captureScreenshot', { format: 'png' })
if (shot?.data) {
  writeFileSync(SHOT, Buffer.from(shot.data, 'base64'))
  console.log(`\nscreenshot: ${SHOT}`)
}

console.log('\n=== PAGE EXCEPTIONS ===')
if (exceptions.length === 0) console.log('(none)')
for (const e of exceptions.slice(0, 12)) console.log('-', e)

console.log('\n=== CONSOLE (errors/warnings first) ===')
const interesting = console_.filter((l) => /error|warn|fail|uncaught/i.test(l))
for (const l of (interesting.length ? interesting : console_).slice(0, 25)) console.log('-', l)

console.log('\n=== FAILED REQUESTS ===')
if (failedRequests.length === 0) console.log('(none)')
for (const f of failedRequests.slice(0, 15)) console.log('-', f)

console.log('\n=== HTTP >=400 ===')
const realBadResponses = responses404.filter((f) => !/favicon/.test(f))
if (realBadResponses.length === 0) console.log('(none)')
for (const f of realBadResponses.slice(0, 15)) console.log('-', f)

/* This probe is primarily a diagnostic dumper, but it must still be able to
 * FAIL: an uncaught page exception means the app is broken, so exited non-zero
 * (a probe that can never fail is not a gate). */
ws.close()
const fatal = exceptions.length + realBadResponses.length
console.log(
  fatal === 0
    ? '\nprobe: no page exceptions, no bad responses — PASS'
    : `\nprobe: ${exceptions.length} page exception(s), ${realBadResponses.length} bad response(s) — FAIL`,
)
await lifecycle.dispose()
process.exit(fatal === 0 ? EXIT.OK : EXIT.CHECKS_FAILED)
