# vendor/esbuild-shim

An installed-in-place replacement for the `esbuild` package, wired via the root
`package.json` devDependency:

```json
"esbuild": "file:vendor/esbuild-shim"
```

(The shim declares `"version": "0.21.5"`, which satisfies vite's `esbuild@^0.21.3`
range, so vite dedupes onto the shim without needing npm `overrides` — npm 12
silently ignores `file:` overrides.)

**Why:** the swarm's execution sandbox forbids Node child-process spawns with
piped stdio (`spawn EPERM`), and esbuild's JS API *always* drives its Go binary
over stdio pipes — including `esbuild-wasm` in Node. That made `vite build`
(vite 5) unable to even load `vite.config.ts`.

**Behavior:**

- Normal machines: a runtime probe delegates everything to **real esbuild
  0.21.5** (`esbuild-real`) — zero behavior change, full minify/bundle fidelity.
- Restricted sandboxes: a pipe-free fallback (TypeScript `transpileModule`) keeps
  `vite build` working:
  - `build()` bundles the vite config by type-stripping it (bare imports stay
    external, mirroring vite's own `externalize-deps` plugin). Keep
    `vite.config.ts` free of relative imports and `__dirname`/`import.meta.url`
    usage for full compatibility.
  - `transform()` transpiles `ts/tsx/js/jsx`; `css` and minify calls pass through
    unminified (still valid).
  - `context()` (dev-time dep optimizer only) rejects with an explanatory error.

With `build.target: "esnext"` and `build.minify: false` in `vite.config.ts`,
vite skips the per-chunk esbuild transpile/minify pass entirely (see vite
`resolveEsbuildTranspileOptions`), so restricted-environment builds make no
esbuild service calls at all. Re-enable minification (e.g. `terser`, pure JS)
later if bundle size matters — see ENGINEERING_PLAN §12.
