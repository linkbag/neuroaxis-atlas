import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config — NeuroAxis 3D Brainstem Atlas.
// JSON module imports (src/data/*.json) are enabled for both the dev server
// and the TS compiler (see `resolveJsonModule` in tsconfig.json).
//
// ── Production output (QUALITY_PLAN §3 item 12, AUDIT §2.16) ────────────────
// BEFORE this change: `target: 'esnext'` + `minify: false` shipped one
// 3 340.40 kB entry chunk (746.82 kB gzip) with no vendor split. The 7.75 MB of
// anatomy GLBs were already out of the JS graph (see below), so the entry was
// the whole first-paint script cost.
//
// MINIFY: `terser`, not `esbuild`. The repo installs `vendor/esbuild-shim` as
// its `esbuild` devDependency because this sandbox denies Node child processes
// with piped stdio (esbuild's JS API always drives its Go binary over stdio
// pipes — see vendor/esbuild-shim/README.md). Through the shim,
// `esbuild.transform(src, { minify: true })` returns its input UNCHANGED
// (`vendor/esbuild-shim/index.js` minify passthrough), so `minify: 'esbuild'`
// — Vite's default — builds successfully but produces a byte-identical,
// unminified bundle: a silent no-op that would ship a false claim. terser@5 is
// pure JavaScript and runs IN-PROCESS, so it works in this environment and on
// an unrestricted machine alike.
//
// VERIFIED IN THIS SANDBOX (npm run build): 3 340.40 kB → 1 973.38 kB raw,
// 746.82 kB → 517.86 kB gzip for the entry chunk (see the report).
//
// DEPENDENCY NOTE: terser is resolved from node_modules but is NOT yet declared
// in package.json (this task's exclusive write scope is the five performance
// files, and package.json/package-lock.json are shared integration files).
// A fresh `npm ci` therefore needs `npm install -D terser@5 --cache .npm-cache`
// before `npm run build`, otherwise Vite fails loudly with "terser not found".
// Documented here so the omission is visible rather than implied away.
//
// SPLIT: `manualChunks` puts three/@react-three*/postprocessing in ONE vendor
// chunk. They are kept together deliberately: R3F, drei and postprocessing
// share instance state (three's WebGLRenderer, R3F's context and the
// postprocessing EffectComposer) and resolving them out of one file avoids
// cross-chunk circular initialization. React/ReactDOM/zustand stay in the
// entry chunk (the app shell cannot start without them) and the contour worker
// keeps its own chunk.
//
// The anatomy GLBs need no lazy-loading work here: they are imported through
// `import.meta.glob('../assets/anatomy/*.glb', { query: '?url' })`
// (src/geometry/anatomyAssets.ts), which Vite already emits as 84 tiny
// per-GLB URL chunks — the 7.57 MB of geometry is fetched on demand, one file
// at a time, and never enters the JS first-paint path.
export default defineConfig({
  plugins: [react()],
  json: {
    namedExports: true,
    stringify: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    // Scratch/tool directories hold transient downloads, edit-temp files, and
    // generated assets that are written while the dev server runs; watching
    // them crashes chokidar with EBUSY on Windows (locked mid-write files).
    watch: {
      ignored: [
        '**/.bp3d-probe/**',
        '**/.plate-scratch/**',
        '**/.npm-cache/**',
        '**/.scaffold-tmp/**',
        '**/assets-src/**',
        '**/node_modules/**',
      ],
    },
  },
  build: {
    // 'esnext' keeps TS/JSX transformation with @vitejs/plugin-react + the
    // vite:esbuild plugin while skipping vite's per-chunk esbuild TRANSPILE
    // pass (see vendor/esbuild-shim/README.md); source targets ES2020.
    target: 'esnext',
    // Minification is done by terser (in-process, works through the shim —
    // see the header). `minify: 'esbuild'` must not be used here.
    minify: 'terser',
    terserOptions: {
      ecma: 2020,
      compress: {
        // Keep the console diagnostics the app ships on purpose: the PiP
        // parity watchdog, the geometry-transfer fallback and the
        // context-loss/restore notices are the field-diagnosis contract.
        drop_console: false,
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 2400,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('node_modules/three/') ||
            id.includes('node_modules/@react-three/') ||
            id.includes('node_modules/postprocessing/')
          ) {
            return 'vendor-three'
          }
          return undefined
        },
      },
    },
  },
})
