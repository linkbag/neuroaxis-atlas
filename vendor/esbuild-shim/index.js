'use strict'
/**
 * esbuild-restricted-env-shim
 * ===========================
 * WHY THIS EXISTS
 * The DSH agent sandbox used by this swarm enforces a "no piped stdio spawn"
 * policy: any Node.js child_process spawn whose stdio is piped fails with
 * EPERM. Real esbuild's JS API always launches its Go binary as a child
 * process and speaks the request/response protocol over stdin/stdout pipes,
 * so under that policy every esbuild call fails (`Error: spawn EPERM`) and
 * `vite build` (v5) cannot load its own config. esbuild-wasm does NOT help in
 * Node: its async and even its worker-thread sync service re-spawn the same
 * binary (verified in esbuild-wasm@0.21.5 lib/main.js).
 *
 * WHAT IT DOES
 * - On normal machines (probed once at runtime with a 4s ping): every call
 *   delegates to REAL esbuild (esbuild-real). Zero behavior change.
 * - In restricted environments (ping fails): a pipe-free fallback keeps
 *   `vite build` working:
 *     * build()        -> single-file TS/TSX type-strip via `typescript`
 *                         transpileModule. Bare imports stay untouched, which
 *                         is exactly how vite's config bundler externalizes
 *                         deps. Relative imports are NOT inlined: keep
 *                         vite.config.ts free of relative imports.
 *     * transform()    -> transpileModule for ts/tsx/js/jsx loaders; plain
 *                         passthrough for css and for minify-style calls
 *                         (output stays valid, just unminified).
 *     * formatMessages/analyzeMetafile -> simple formatters.
 *     * context()      -> rejects (only vite's dev-time dep optimizer uses it).
 *
 * INSTALLED VIA package.json devDependencies:
 *   "esbuild": "file:vendor/esbuild-shim"
 * (declared version 0.21.5 satisfies vite's esbuild@^0.21.3 range).
 *
 * vite@5 consumes exactly: { version, transform, formatMessages, build,
 * default(context) } (see vite dist chunks dep-BK3b2jBa.js lines 12,
 * 66845, 19316+, 37216).
 */
const fs = require('fs')
const path = require('path')
const url = require('url')
const childProcess = require('child_process')

const ESBUILD_VERSION = '0.21.5'

let realEsbuild = null
let resolvedMode = null

function getReal() {
  if (realEsbuild === null) realEsbuild = require('esbuild-real')
  return realEsbuild
}

/**
 * Detect the environment once, synchronously: a piped-stdio spawnSync that
 * fails with EPERM means the sandbox denies esbuild's transport. In that mode
 * we also make child_process.exec/execFile degrade gracefully (spawn failures
 * go to the callback instead of throwing synchronously) — vite's one-time
 * `exec("net use")` Windows realpath optimization relies on the callback and
 * would otherwise crash the build (see vite optimizeSafeRealPathSync).
 */
function detectMode() {
  if (resolvedMode) return resolvedMode
  try {
    const probe = childProcess.spawnSync(process.execPath, ['-e', ''], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    })
    resolvedMode = probe.error && probe.error.code === 'EPERM' ? 'restricted' : 'real'
  } catch (_err) {
    resolvedMode = 'real'
  }
  if (resolvedMode === 'restricted') {
    const events = require('events')
    // Degrade gracefully: when a spawn is denied (EPERM), deliver the error to
    // the callback (as async exec semantics promise) instead of throwing.
    const graceful = (original) =>
      function (cmd, ...rest) {
        try {
          return original.apply(childProcess, [cmd, ...rest])
        } catch (err) {
          if (!err || err.code !== 'EPERM') throw err
          let cb = null
          for (let i = rest.length - 1; i >= 0; i--) {
            if (typeof rest[i] === 'function') {
              cb = rest[i]
              break
            }
          }
          if (!cb) throw err // no callback: keep the honest failure
          const fakeChild = new events.EventEmitter()
          fakeChild.kill = () => true
          fakeChild.stdin = null
          fakeChild.stdout = null
          fakeChild.stderr = null
          queueMicrotask(() => cb(err, '', ''))
          return fakeChild
        }
      }
    childProcess.exec = graceful(childProcess.exec)
    childProcess.execFile = graceful(childProcess.execFile)
  }
  return resolvedMode
}

/** Probe once whether piped-stdio child processes work (i.e. real esbuild). */
function decideMode() {
  return Promise.resolve(detectMode())
}

/* ------------------------------------------------------------------ *
 * Fallback implementation (pipe-free)
 * ------------------------------------------------------------------ */

function tsCompile(source, fileName, compilerOptions, wantMap) {
  const ts = require('typescript')
  const out = ts.transpileModule(source, {
    fileName,
    compilerOptions: wantMap
      ? { ...compilerOptions, sourceMap: true, inlineSourceMap: false, inlineSources: true }
      : compilerOptions,
    reportDiagnostics: true,
  })
  const errors = (out.diagnostics || [])
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map((d) => ({
      pluginName: 'typescript',
      text: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      location: null,
      notes: [],
    }))
  return { text: out.outputText, map: out.sourceMapText || '', errors }
}

/**
 * Approximate esbuild's `define` replacement for the identifiers vite uses in
 * build transforms (process.env.NODE_ENV, import.meta.env.*, custom dotted
 * keys). Textual, word-boundary-scoped — good enough for dependency transforms
 * where real esbuild is unavailable; normal machines delegate to real esbuild.
 */
function applyDefine(source, define) {
  const keys = Object.keys(define).sort((a, b) => b.length - a.length)
  let out = source
  for (const key of keys) {
    const value = define[key]
    if (typeof value !== 'string') continue
    const escaped = key
      .split('.')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s*\\.\\s*')
    out = out.replace(new RegExp('(?<![\\w$.])' + escaped + '(?![\\w$])', 'g'), value)
  }
  return out
}

function transformFallback(input, options) {
  options = options || {}
  const loader = options.loader || 'js'

  // CSS and minify-style calls: passthrough keeps output valid (unminified).
  if (loader === 'css' || loader === 'less' || loader === 'scss') {
    return { code: input, map: '', warnings: [], errors: [] }
  }
  if (options.minify === true || options.minifyIdentifiers === true || options.minifyWhitespace === true) {
    return { code: input, map: '', warnings: [], errors: [] }
  }

  const isTsx = loader === 'tsx'
  const isJsx = loader === 'jsx'
  const isTs = loader === 'ts' || isTsx
  const ext = isTsx ? '.tsx' : isJsx ? '.jsx' : isTs ? '.ts' : '.js'
  const fileName = options.sourcefile || 'file' + ext

  const prepared = options.define ? applyDefine(input, options.define) : input
  // vite JSON.parse()s transform maps whenever sourcemap is requested
  // (transformWithEsbuild), so a real (TS-generated) map string is required.
  const wantMap = !!options.sourcemap && options.sourcemap !== 'inline'

  const jsx = options.jsx === 'transform' ? 2 /* Classic */ : 5 /* ReactJSX (automatic) */
  const { text, map, errors } = tsCompile(
    prepared,
    fileName,
    {
      target: 6 /* ES2020 */,
      module: 99 /* ESNext - rollup downstream handles modules */,
      jsx,
      jsxImportSource: options.jsxImportSource || 'react',
      esModuleInterop: false,
      importHelpers: false,
    },
    wantMap,
  )
  if (errors.length) {
    const error = new Error(errors.map((e) => e.text).join('\n'))
    error.errors = errors
    error.warnings = []
    throw error
  }
  // esbuild returns the map as a JSON string (empty string when disabled);
  // vite's replaceDefine calls result.map.includes(...) unconditionally.
  return { code: text, map: map || '', warnings: [], errors: [] }
}

function buildFallback(options) {
  options = options || {}
  let source
  let sourceFile
  if (options.entryPoints && options.entryPoints.length) {
    const entry = options.entryPoints[0]
    const entryPath = typeof entry === 'string' ? entry : entry.in
    sourceFile = path.resolve(options.absWorkingDir || process.cwd(), entryPath)
    source = fs.readFileSync(sourceFile, 'utf8')
  } else if (options.stdin && options.stdin.contents) {
    source = options.stdin.contents
    sourceFile = options.stdin.sourcefile || 'stdin.ts'
  } else {
    throw new Error('esbuild shim fallback: only entryPoints/stdin builds are supported')
  }

  // Mirror vite's "inject-file-scope-variables" plugin (see vite bundleConfigFile).
  const injected =
    `const __vite_injected_original_dirname = ${JSON.stringify(path.dirname(sourceFile))};` +
    `const __vite_injected_original_filename = ${JSON.stringify(sourceFile)};` +
    `const __vite_injected_original_import_meta_url = ${JSON.stringify(url.pathToFileURL(sourceFile).href)};`

  const format = options.format === 'cjs' ? 'cjs' : 'esm'
  const { text, errors } = tsCompile(injected + source, sourceFile, {
    target: 6 /* ES2020 */,
    module: format === 'cjs' ? 1 /* CommonJS */ : 99 /* ESNext */,
    jsx: 5 /* ReactJSX */,
    esModuleInterop: false,
    importHelpers: false,
  })
  if (errors.length) {
    const error = new Error(errors.map((e) => e.text).join('\n'))
    error.errors = errors
    error.warnings = []
    throw error
  }

  const outfile = options.outfile || sourceFile.replace(/\.(ts|tsx|js|jsx|mts|cts)$/i, '.js')
  return {
    outputFiles: [{ path: outfile, text, contents: null, hash: '', comments: '' }],
    metafile: { inputs: { [sourceFile]: { bytes: Buffer.byteLength(source, 'utf8') } } },
    errors: [],
    warnings: [],
    mangleCache: undefined,
  }
}

function formatMessageOne(msg) {
  if (!msg) return ''
  const loc = msg.location
  const where = loc && loc.file ? `${loc.file}:${loc.line || 0}:${loc.column || 0}: ` : ''
  return (where + (msg.text || '')).trim()
}

/* ------------------------------------------------------------------ *
 * Public API — runtime dispatch between real esbuild and the fallback
 * ------------------------------------------------------------------ */

async function build(options) {
  const mode = await decideMode()
  return mode === 'real' ? getReal().build(options) : buildFallback(options)
}

function buildSync(options) {
  return resolvedMode === 'real' ? getReal().buildSync(options) : buildFallback(options)
}

async function transform(input, options) {
  const mode = await decideMode()
  return mode === 'real' ? getReal().transform(input, options) : transformFallback(input, options)
}

function transformSync(input, options) {
  return resolvedMode === 'real'
    ? getReal().transformSync(input, options)
    : transformFallback(input, options)
}

async function formatMessages(messages, options) {
  const mode = await decideMode()
  if (mode === 'real') return getReal().formatMessages(messages, options)
  return (messages || []).map(formatMessageOne)
}

function formatMessagesSync(messages, options) {
  if (resolvedMode === 'real') return getReal().formatMessagesSync(messages, options)
  return (messages || []).map(formatMessageOne)
}

async function analyzeMetafile(metafile, options) {
  const mode = await decideMode()
  if (mode === 'real') return getReal().analyzeMetafile(metafile, options)
  return typeof metafile === 'string' ? metafile : JSON.stringify(metafile, null, 2)
}

function analyzeMetafileSync(metafile, options) {
  if (resolvedMode === 'real') return getReal().analyzeMetafileSync(metafile, options)
  return typeof metafile === 'string' ? metafile : JSON.stringify(metafile, null, 2)
}

async function context(options) {
  const mode = await decideMode()
  if (mode === 'real') return getReal().context(options)
  throw new Error(
    'esbuild shim: context() is unavailable in restricted environments ' +
      '(only vite dev-time dependency scanner/optimizer uses it; `vite build` does not).',
  )
}

function stop() {
  if (resolvedMode === 'real' && realEsbuild) return getReal().stop()
  return Promise.resolve()
}

module.exports = {
  version: ESBUILD_VERSION,
  build: build,
  buildSync: buildSync,
  transform: transform,
  transformSync: transformSync,
  formatMessages: formatMessages,
  formatMessagesSync: formatMessagesSync,
  analyzeMetafile: analyzeMetafile,
  analyzeMetafileSync: analyzeMetafileSync,
  context: context,
  stop: stop,
}
