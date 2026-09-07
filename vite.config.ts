import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config — NeuroAxis 3D Brainstem Atlas.
// JSON module imports (src/data/*.json) are enabled for both the dev server
// and the TS compiler (see `resolveJsonModule` in tsconfig.json).
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
    // 'esnext' + minify:false skips vite's per-chunk esbuild transpile/minify
    // pass (see vendor/esbuild-shim/README.md). TS/JSX are still transformed
    // by @vitejs/plugin-react + the vite:esbuild plugin; source targets ES2020.
    target: 'esnext',
    minify: false,
    sourcemap: false,
  },
})
