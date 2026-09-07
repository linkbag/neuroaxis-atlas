# scripts/anatomy-recipes/

One module per envelope part; each exports the recipe contract:

```js
export const slug = 'ctx-medulla-surface';
export function bbox() { return { min: [x, y, z], max: [x, y, z] }; } // au, canonical space
export function sdf(x, y, z) { ... }        // < 0 inside; built ONCE at module scope
export const meshOpts = { resolution: 0.35, kind: 'context', materialHint: 'gray-matter' };
```

**Registry modules** (multi-part): a file may instead export
`recipes: [entry…]` where every entry carries the same contract — the CLI
validates and flattens them, so `--part <entry-slug>` works per entry.
`nuclei.mjs` (task 7) is the one registry module: all 71 `kind:"nucleus"`
taxonomies slugs, each baked through the plan §6 containment-QA path (see
docs/GEOMETRY_PIPELINE.md, "Nucleus containment QA").

**This directory is owned by the envelope/nuclei build tasks**
(REALISM_PLAN §7 tasks 5–7: `medulla.mjs`, `pons.mjs`, `cerebellum.mjs`,
`midbrain.mjs`, `diencephalon-*.mjs`, `epithalamus.mjs`, `csf-*.mjs`,
`nuclei.mjs`). The only sample module is `demo-ellipsoid.mjs`
(`slug: "demo-ellipsoid"`), which exists to pin the contract end-to-end;
slugs starting with `demo-` are excluded from `--all` bakes and never
written to `anatomy-manifest.json`.

Read **docs/GEOMETRY_PIPELINE.md** before authoring: full contract,
kernel API reference, determinism rule (all randomness seeded from the
slug string), resolution/memory budget, and CLI usage.
