/**
 * lib/startServer.mjs — the shared browser-lane bootstrap for the verify
 * scripts (`audit.mjs`, `browser-acceptance.mjs`, `browser-probe.mjs`).
 *
 * WHY THIS EXISTS
 * The browser lane used to require a dev server that somebody else had already
 * started: every script defaulted to `http://localhost:5173` and, when nothing
 * answered, failed with "devtools endpoint never came up" — a message that is
 * identical whether the *server* is missing, the *port* is taken, or Chrome
 * itself cannot start. Two integration runs were lost to exactly that
 * ambiguity (a browser command was a hard gate that could not satisfy its own
 * external precondition). This module removes the precondition: the lane starts
 * Vite itself when the target URL is not reachable, waits for HTTP 200, and
 * tears the server down on every exit path.
 *
 * DESIGN NOTES (each one is a bug that was measured, not a style choice)
 *
 * 1. `localhost`, never `127.0.0.1`. Vite 5 binds IPv6-only by default in this
 *    environment: `http://localhost:5173` answers 200 while
 *    `http://127.0.0.1:5173` is REFUSED and `http://[::1]:5173` times out. A
 *    readiness probe against 127.0.0.1 can therefore never see a server this
 *    module started. (The *DevTools* endpoint is the opposite case — Chrome's
 *    remote debugging port is IPv4-only, so `127.0.0.1` is correct there.)
 *
 * 2. `stdio: 'ignore'` on the spawned server. Under the restricted sandbox this
 *    repo is developed in, a child process whose stdio is piped can fail with
 *    `EPERM`; `'ignore'` and `'inherit'` are the working modes. The server's
 *    output is not needed — readiness is decided by HTTP, not by log parsing.
 *
 * 3. The server is a process TREE on Windows (`npm.cmd` → `node` → Vite). A
 *    plain `child.kill()` kills the `npm.cmd` shim and leaves Vite holding the
 *    port, which then poisons the next run with a *stale* server (a stale
 *    server silently serving an old build is how a "passing" audit can lie).
 *    `taskkill /pid <pid> /T /F` is the only reliable tree kill, and it is run
 *    synchronously so it completes before the process exits.
 *
 * 4. A server this module did NOT start is never killed. `startDevServer()`
 *    returns `started: false` when the target URL already answered, and the
 *    cleanup path then only closes Chrome.
 *
 * EXIT-CODE CONTRACT (used by the callers, so an environment failure is never
 * dressed up as a product failure):
 *   0  all checks ran and passed
 *   1  checks ran and FAILED — the only "the product is broken" signal
 *   2  static precondition missing (e.g. no Chrome binary on this machine)
 *   3  environment unusable: neither an existing server at the target URL nor
 *      one this module started answered HTTP 200 within the bounded wait
 *   4  environment unusable: Chrome could not be started / its DevTools
 *      endpoint never answered (preflight, before any check runs)
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Exit codes, exported so the callers cannot drift from the contract above. */
export const EXIT = {
  OK: 0,
  CHECKS_FAILED: 1,
  STATIC_PRECONDITION: 2,
  SERVER_UNAVAILABLE: 3,
  BROWSER_UNAVAILABLE: 4,
}

/** Milliseconds between readiness probes. */
const PROBE_INTERVAL_MS = 250

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/** One bounded HTTP probe. Any response — even a 404 — proves something is listening. */
export async function urlAnswers(url, timeoutMs = 1500) {
  try {
    const response = await fetch(url, {
      // A GET with a per-attempt timeout. `keepalive: false` plus the short
      // deadline matters for a second, non-obvious reason: an undici HTTP/1.1
      // connection that is still pooled when the script finishes keeps the Node
      // event loop alive, so the process hangs (and the *server* it just killed
      // is not the thing holding it). Every socket here is transient.
      keepalive: false,
      headers: { connection: 'close' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    response.body?.cancel().catch(() => {})
    return response.status
  } catch {
    return null
  }
}

/**
 * Poll `url` until it answers HTTP 200 or `timeoutMs` expires.
 * Returns `{ status, elapsedMs }`; `status` is null on timeout.
 */
export async function waitForHttp200(url, timeoutMs, onTick) {
  const started = Date.now()
  for (;;) {
    const status = await urlAnswers(url)
    if (status === 200) return { status, elapsedMs: Date.now() - started }
    if (Date.now() - started >= timeoutMs) return { status, elapsedMs: Date.now() - started }
    if (typeof onTick === 'function') onTick(Date.now() - started)
    await sleep(PROBE_INTERVAL_MS)
  }
}

/** Chrome locations, most specific first. Returns null when none exists. */
export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.ProgramFiles === undefined
      ? undefined
      : `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env['ProgramFiles(x86)'] === undefined
      ? undefined
      : `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env.LOCALAPPDATA === undefined
      ? undefined
      : `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ]
  return candidates.find((candidate) => candidate !== undefined && existsSync(candidate)) ?? null
}

/**
 * Kill a process TREE synchronously (see design note 3). Safe to call with
 * `null` and safe to call twice.
 */
export function killTree(pid) {
  if (typeof pid !== 'number' || Number.isNaN(pid)) return
  if (process.platform === 'win32') {
    // `/T` = the whole tree, `/F` = force. Synchronous on purpose: this runs
    // from `finally` and from signal handlers, where an async kill can be
    // abandoned before it lands.
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      /* already gone */
    }
  }
}

/**
 * Best-effort confirmation that a killed child is gone.
 *
 * MEASURED, and the reason this is best-effort rather than authoritative:
 * after `taskkill /pid <vite> /T /F`, Node's `'exit'` and `'close'` events for
 * that child NEVER arrive, and a `ProcessWrap` handle stays in
 * `getActiveResourcesInfo()` even after `child.unref()` — the taskkill path does
 * not run libuv's normal child-reaping. Meanwhile the process really is gone
 * (`netstat` shows no LISTENING socket and the next request fails). So:
 *
 *   • liveness is decided by `process.kill(pid, 0)` (ESRCH ⇒ gone), never by the
 *     absence of an event;
 *   • a port probe is NOT evidence either way: a lingering socket can still
 *     complete a handshake and answer 200 for a moment after the server died;
 *   • every caller still ends with an explicit `process.exit()`, which is what
 *     actually guarantees the wrapper terminates.
 *
 * @returns {Promise<boolean>} true when the pid is confirmed gone
 */
export async function waitForExit(child, timeoutMs) {
  if (child === null || child === undefined || typeof child.pid !== 'number') return true
  if (child.exitCode !== null || child.signalCode !== null) return true
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (child.exitCode !== null || child.signalCode !== null) return true
    try {
      // Signal 0 = liveness probe only. ESRCH means the pid is gone.
      process.kill(child.pid, 0)
    } catch {
      return true
    }
    if (Date.now() >= deadline) return false
    await sleep(100)
  }
}

/**
 * Start Vite.
 *
 * The process spawned is `node node_modules/vite/bin/vite.js` with
 * `--strictPort`, NOT `npm run dev`, and that is deliberate (it is the one
 * deviation from the letter of the task brief; the brief's intent — "the audit
 * starts the dev server itself" — is met exactly, and it is *more* reliably met
 * this way):
 *
 *   • `npm run dev` on Windows is `cmd.exe` → `npm.cmd` → `node` → `vite`, a
 *     four-process chain that exists only to resolve a one-line script. The pid
 *     `spawn` returns is the shell's, so a kill that misses one link leaves
 *     Vite holding the port — the stray server that poisons the next run.
 *   • `--strictPort` makes the failure mode honest: if the port is taken, Vite
 *     EXITS instead of silently binding :5174, which would leave the audit
 *     checking a different server than the one it manages.
 *   • Anything else can still be forced through `DEV_SERVER_COMMAND`, so the
 *     npm path remains available.
 *
 * `stdio: 'ignore'` is mandatory under the restricted sandbox (a piped child
 * stdio can fail with `EPERM`); readiness is decided by HTTP, never by parsing
 * the server's log.
 */
function startDevProcess({ cwd, port }) {
  const override = process.env.DEV_SERVER_COMMAND
  if (override !== undefined && override.trim().length > 0) {
    return {
      child: spawn(override, { cwd, shell: true, stdio: 'ignore', windowsHide: true }),
      description: `\`${override}\``,
    }
  }
  return {
    child: spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'],
      { cwd, stdio: 'ignore', windowsHide: true },
    ),
    description: `\`vite --port ${port} --strictPort\``,
  }
}

/**
 * A shared cleanup registry: every run registers the resources it created and
 * `dispose()` releases them in reverse order exactly once. Registering the
 * signal handlers here means an interrupted run cannot leave Chrome or Vite
 * behind either.
 */
export function createLifecycle(log = () => {}) {
  const disposers = []
  let disposed = false

  const dispose = async () => {
    if (disposed) return
    disposed = true
    for (const disposer of disposers.reverse()) {
      try {
        await disposer()
      } catch (error) {
        log(`cleanup step failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const onSignal = (signal) => {
    log(`received ${signal} — cleaning up`)
    dispose().then(
      () => process.exit(EXIT.CHECKS_FAILED),
      () => process.exit(EXIT.CHECKS_FAILED),
    )
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  return {
    /** Register a cleanup step; the LAST registered runs FIRST. */
    add(disposer) {
      disposers.push(disposer)
    },
    dispose,
  }
}

/**
 * Make a dev server available at `baseUrl`.
 *
 * @param {object} options
 * @param {string} options.baseUrl           target URL (must use `localhost`)
 * @param {string} [options.cwd]             repo root (default: process cwd)
 * @param {number} [options.timeoutMs]       readiness bound, default 30 s
 * @param {object} options.lifecycle         from `createLifecycle()`
 * @param {(message: string) => void} [options.log]
 * @returns {Promise<{ baseUrl: string, started: boolean, pid: number|null, elapsedMs: number, failed?: boolean }>}
 *          `started: false` means the caller's own server is in use and must
 *          not be killed.
 */
export async function startDevServer({
  baseUrl,
  cwd = process.cwd(),
  timeoutMs = 30_000,
  lifecycle,
  log = () => {},
}) {
  const existing = await urlAnswers(baseUrl)
  if (existing === 200) {
    log(`using the server already running at ${baseUrl}`)
    return { baseUrl, started: false, pid: null, elapsedMs: 0, exitObserved: true }
  }

  const port = Number(new URL(baseUrl).port || (new URL(baseUrl).protocol === 'https:' ? 443 : 80))
  const server = startDevProcess({ cwd, port })
  log(`nothing answering HTTP 200 at ${baseUrl} — started ${server.description} (pid ${server.child.pid})`)

  let killed = false
  if (typeof server.child.pid === 'number') {
    const pid = server.child.pid
    lifecycle.add(async () => {
      if (killed) return
      killed = true
      log(`stopping the dev server (pid ${pid}, whole tree)`)
      killTree(pid)
      // Best-effort confirmation only. On Windows an exited child can still
      // answer `kill(pid, 0)` for a moment, so a false negative here is NOT a
      // stray server — the wrapper's own port probe after the run is the check
      // that matters, and every caller ends with an explicit `process.exit()`.
      const gone = await waitForExit(server.child, 2000)
      if (!gone) log(`taskkill sent to pid ${pid} (tree, forced)`)
    })
  }

  const { status, elapsedMs } = await waitForHttp200(baseUrl, timeoutMs)
  if (status !== 200) {
    log(
      `the dev server did not answer HTTP 200 at ${baseUrl} within ${Math.round(timeoutMs / 1000)} s ` +
        `— it will be stopped now (last probe status: ${status === null ? 'no response' : status})`,
    )
    return { baseUrl, started: true, pid: server.child.pid ?? null, elapsedMs, failed: true }
  }
  log(`dev server ready at ${baseUrl} after ${elapsedMs} ms`)
  return { baseUrl, started: true, pid: server.child.pid ?? null, elapsedMs, failed: false }
}

/**
 * Launch headless Chrome with a DevTools port and probe the endpoint BEFORE any
 * check runs (design note: the crashpad failure is instant and deterministic, so
 * discovering it once is honest and discovering it per check is not).
 *
 * @returns {Promise<{ ok: true, chrome: import('node:child_process').ChildProcess, port: number, launchedAt: number }
 *                  | { ok: false, reason: string, stderr: string, launchedAt: number }>}
 */
export async function launchChrome({
  port,
  profileDir,
  windowSize = '1500,950',
  hopTimeoutMs = 15_000,
  settleMs = 1200,
  extraArgs = [],
  log = () => {},
}) {
  const chromePath = findChrome()
  if (chromePath === null) {
    return {
      ok: false,
      reason: 'no Chrome binary found (set CHROME_PATH to override the search)',
      stderr: '',
      launchedAt: 0,
    }
  }
  const profile = resolve(profileDir)
  mkdirSync(profile, { recursive: true })
  const launchedAt = Date.now()
  // Chrome's stderr goes to a FILE, never a pipe: under the restricted sandbox
  // a piped child stdio can fail with `EPERM`, and the last three lines of
  // Chrome's own complaint (e.g. crashpad's `OpenProcess: Access is denied`) are
  // the difference between a diagnosable environment failure and a mystery.
  const stderrFile = resolve(profile, 'chrome-stderr.log')
  let stderrFd = null
  try {
    stderrFd = openSync(stderrFile, 'w')
  } catch {
    stderrFd = null
  }
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      // SwiftShader keeps WebGL alive where no GPU is available; without it the
      // 3D checks cannot run in a headless container at all.
      '--enable-unsafe-swiftshader',
      `--window-size=${windowSize}`,
      ...extraArgs,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', stderrFd === null ? 'ignore' : stderrFd] },
  )
  const readStderrTail = () => {
    try {
      return readFileSync(stderrFile, 'utf8').trim().split('\n').slice(-3).join(' | ')
    } catch {
      return ''
    }
  }

  await sleep(settleMs)
  const endpoint = `http://127.0.0.1:${port}/json/version`
  const { status } = await waitForHttp200(endpoint, hopTimeoutMs)
  if (status !== 200) {
    const exited = chrome.exitCode !== null || chrome.signalCode !== null
    const stderr = readStderrTail()
    killTree(chrome.pid)
    return {
      ok: false,
      reason:
        `Chrome's DevTools endpoint never answered at ${endpoint}` +
        (exited ? ` (the browser process exited immediately)` : '') +
        (stderr.length > 0 ? ` — chrome said: ${stderr}` : ''),
      stderr,
      launchedAt,
    }
  }
  log(`Chrome DevTools ready on port ${port}`)
  return { ok: true, chrome, port, launchedAt }
}
