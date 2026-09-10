/**
 * v5 acceptance probe — headless verification of the two UX fixes.
 *   1. PiP restore control appears when the panel is hidden and brings it back.
 *   2. Plates-tab live section has plane sliders that actually move the section.
 *
 * Run: node .plate-scratch/cdp-acceptance.mjs [url]
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const URL_ = process.argv[2] ?? 'http://localhost:5173'
const PORT = 9344
const PROFILE = resolve('.plate-scratch/chrome-profile-accept')
mkdirSync(PROFILE, { recursive: true })

const CHROME = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
].find((p) => p !== undefined && existsSync(p))

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
    '--window-size=1400,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const fail = (m) => results.push(`FAIL  ${m}`)
const pass = (m) => results.push(`ok    ${m}`)

try {
  let page = null
  for (let i = 0; i < 40 && page === null; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) ?? null
    } catch {
      /* not up yet */
    }
    if (page === null) await sleep(250)
  }
  if (page === null) throw new Error('devtools endpoint never came up')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let nextId = 1
  const pending = new Map()
  const exceptions = []
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== undefined) {
      pending.get(msg.id)?.(msg.result ?? msg.error)
      pending.delete(msg.id)
      return
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
    }
  })
  const send = (method, params = {}) => {
    const id = nextId++
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((res) => pending.set(id, res))
  }
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  await send('Runtime.enable')
  await send('Page.enable')
  try {
    await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  } catch {
    /* older builds */
  }
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r?.exceptionDetails) return `THREW: ${r.exceptionDetails.exception?.description}`
    return r?.result?.value
  }
  const byText = (re, exact = false) => `(() => {
    const b = [...document.querySelectorAll('button')].find(x => ${exact ? `${JSON.stringify(re)} === x.textContent.trim()` : `new RegExp(${JSON.stringify(re)}, 'i').test(x.textContent.trim())`});
    if (!b) return 'not found';
    b.click();
    return b.textContent.trim();
  })()`
  const dumpDom = () => evaluate(`(() => {
    const ranges = [...document.querySelectorAll('input[type=range]')].map(r =>
      (r.getAttribute('aria-label') || '(no aria)') + ' | class=' + r.className +
      ' | parent=' + (r.parentElement?.className || '?') +
      ' | grandparent=' + (r.parentElement?.parentElement?.className || '?'));
    return JSON.stringify({ ranges, hasSectionCanvas: !!document.querySelector('.section-canvas'),
      hasSliderBar: !!document.querySelector('[class*=slider]'),
      classesWithSlider: [...new Set([...document.querySelectorAll('[class*=slider],[class*=Slider]')].map(e=>e.className))] }, null, 1);
  })()`)

  await send('Page.navigate', { url: URL_ })
  await sleep(6000)

  // ---------- Feature 1: PiP + restore control -----------------------------
  const pipVisible = () => evaluate(`!!document.querySelector('.pip-panel')`)
  const restoreVisible = () =>
    evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find(x => /live section/i.test(x.textContent));
      return b ? b.className + ' :: ' + b.textContent.trim() : 'absent';
    })()`)

  if ((await pipVisible()) !== true) fail('PiP panel is not visible on first load (expected visible by default)')
  else pass('PiP panel visible by default')

  const hideResult = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    if (!panel) return 'no panel';
    const b = [...panel.querySelectorAll('button')].find(x => x.title && /hide/i.test(x.title));
    if (!b) return 'no hide button';
    b.click();
    return 'clicked hide';
  })()`)
  await sleep(1200)
  if ((await pipVisible()) !== false) fail(`hiding the PiP did not hide it (${hideResult})`)
  else pass(`PiP hides on × (${hideResult})`)

  const restore = await restoreVisible()
  if (String(restore).includes('absent')) fail('no restore control after hiding the PiP (Feature 1 missing)')
  else pass(`restore control present while hidden: ${restore}`)

  await evaluate(byText('live section', false))
  await sleep(1500)
  if ((await pipVisible()) !== true) fail('clicking the restore control did not bring the panel back')
  else pass('restore control brings the PiP back')

  // persistence: hide, reload, the restore control must still be offered
  await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const b = panel && [...panel.querySelectorAll('button')].find(x => x.title && /hide/i.test(x.title));
    if (b) b.click();
  })()`)
  await sleep(800)
  await send('Page.navigate', { url: URL_ })
  await sleep(6000)
  if ((await pipVisible()) !== false) fail('PiP visibility did not persist across reload')
  else pass('PiP stays hidden across reload (persisted)')
  const restoreAfterReload = await restoreVisible()
  if (String(restoreAfterReload).includes('absent')) fail('restore control missing after reload with PiP hidden')
  else pass('restore control available after reload')
  await evaluate(byText('live section', false))
  await sleep(1200)

  // ---------- Feature 2: live-section sliders ------------------------------
  console.log('plates click:', await evaluate(byText('Plates', true)))
  await sleep(1500)
  console.log('plates-tab buttons:', await evaluate(`[...document.querySelectorAll('button')].map(b => b.textContent.trim() + '{' + b.className + '}').filter(s => /live|author|plate/i.test(s)).join(' | ')`))
  console.log('toggle click:', await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => /^live section$/i.test(x.textContent.trim()));
    if (!b) return 'live-section toggle not found';
    b.click();
    return 'clicked ' + b.textContent.trim() + ' (class ' + b.className + ')';
  })()`))
  await sleep(6000)
  console.log('dom after live section:', await dumpDom())

  const sliderProbe = await evaluate(`(() => {
    const ranges = [...document.querySelectorAll('.section-plane-sliders input[type=range]')];
    if (ranges.length === 0) return 'no section sliders';
    return ranges.map(r => (r.getAttribute('aria-label') || '?') + ' [' + r.min + '..' + r.max + ' step ' + r.step + '] = ' + r.value).join(' | ');
  })()`)
  if (String(sliderProbe).startsWith('no section sliders')) fail(`no plane sliders in live section: ${sliderProbe}`)
  else pass(`plane sliders present: ${sliderProbe}`)

  const canvasStats = `(() => {
    const c = document.querySelector('.section-canvas');
    if (!c) return 'no canvas';
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let painted = 0, sampled = 0, hash = 0;
    for (let i = 0; i < d.length; i += 4 * 53) {
      sampled++;
      const r = d[i], g = d[i+1], b = d[i+2];
      hash = (hash * 31 + r + g * 3 + b * 7) % 1000000007;
      if (!(Math.abs(r-13) < 9 && Math.abs(g-21) < 9 && Math.abs(b-38) < 12)) painted++;
    }
    return JSON.stringify({ painted, sampled, hash });
  })()`

  const before = await evaluate(canvasStats)
  const moved = await evaluate(`(() => {
    const ranges = [...document.querySelectorAll('.section-plane-sliders input[type=range]')];
    const target = ranges.find(r => /transverse/i.test(r.getAttribute('aria-label') || '')) || ranges[0];
    if (!target) return 'no slider to move';
    const before = target.value;
    const next = String(Number(target.value) + 4);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(target, next);
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return (target.getAttribute('aria-label') || '?') + ' ' + before + ' → ' + next;
  })()`)
  await sleep(2500)
  const after = await evaluate(canvasStats)
  const readout = await evaluate(`document.querySelector('.section-debug')?.textContent?.trim().slice(0,80) ?? document.querySelector('.section-canvas-wrap')?.textContent?.trim().slice(0,120) ?? 'n/a'`)
  if (before === after) fail(`moving the slider did not change the section (${moved}) — before/after identical: ${before}`)
  else pass(`slider moves the section (${moved}) · painted ${JSON.parse(before).painted}→${JSON.parse(after).painted} · ${readout}`)

  if (exceptions.length > 0) {
    fail(`page exceptions: ${exceptions.slice(0, 3).join(' || ')}`)
  } else {
    pass('no page exceptions')
  }

  ws.close()
} catch (error) {
  fail(`probe error: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  chrome.kill()
}

console.log('\n=== v5 acceptance ===')
for (const line of results) console.log(line)
const failures = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - failures}/${results.length} checks passed`)
process.exit(failures === 0 ? 0 : 1)
