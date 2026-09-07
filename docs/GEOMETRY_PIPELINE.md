# Geometry Pipeline — NeuroAxis v2 (author-facing contract)

The deterministic, Node-only geometry kernel that turns SDF fields (and
optionally voxelize'd BP3D surfaces) into committed GLB assets. Everything in
`scripts/lib/sdf/` plus `scripts/build-anatomy-geometry.mjs` is plain `.mjs`
ESM with **zero dependencies beyond the Node stdlib** and **no browser APIs**.
`scripts/` is outside the `tsconfig.json` include (`["src"]`), so
`npm run check` never type-checks the kernel — keep it that way.

Authoritative plan: `docs/REALISM_PLAN.md` §4 (layout), §6 (nuclei shaping),
§7 (task ownership). This document is the contract for anyone authoring
recipes (tasks 5–7) or feeding it registered OBJs (task 4).

---

## 1. Layout

```
scripts/
  lib/sdf/                    # the kernel (this document)
    vec.js                    # typed-array vec3 helpers (out-param style)
    sdf.js                    # primitives + boolean/smooth ops + domain warps
    noise.js                  # seeded simplex3, fbm, ridged fbm (deterministic)
    surfacenets.js            # block-wise SurfaceNets mesher (streaming)
    objio.js                  # minimal OBJ parse (v/f, fan triangulation) + write
    voxelize.js               # triangle soup -> signed-distance grid
    glb.js                    # minimal GLB writer (single mesh, POS+NORM, u32)
    stats.js                  # tri/bbox/manifold/degenerate/containment QA
  anatomy-recipes/            # ONE MODULE PER PART (tasks 5-7) — see §3
    DEMO.md                   # ownership note for this directory
    demo-ellipsoid.mjs        # SAMPLE recipe pinning the contract (demo-* slug)
  build-anatomy-geometry.mjs  # CLI: --all | --part <slug> | --selftest | --stats
src/assets/anatomy/           # COMMITTED output: <slug>.glb + anatomy-manifest.json
.selftest/                    # gitignored scratch (self-test GLBs, demo bakes)
```

Canonical space is **unchanged** (plan §2.1): au units, x = +left,
y = +superior, z = +anterior. The kernel is unit-agnostic but every recipe
bbox is expressed in it.

## 2. Determinism rule (non-negotiable)

**All randomness is seeded from the part slug string.** No `Math.random`, no
`Date.now()`, no ambient state anywhere in the kernel or recipes. Noise is
created as `createFbm3(slug, ...)` / `createRidgedFbm3(slug, ...)`, so the
same recipe always bakes a byte-identical GLB. `--selftest` proves this by
baking twice and comparing bytes.

## 3. Recipe contract (`scripts/anatomy-recipes/<slug>.mjs`)

A recipe is an ES module exporting exactly:

| export | type | meaning |
| --- | --- | --- |
| `slug` | `string` | lowercase-kebab part id; must match `/^[a-z0-9]+(-[a-z0-9]+)*$/`; **slugs starting with `demo-` are excluded from `--all` and from the manifest** |
| `bbox()` | `() => {min:[x,y,z], max:[x,y,z]}` | region of interest in au (canonical space). The mesher adds padding automatically (default 2 cells per side) — give the *tight* box of the part |
| `sdf(x, y, z)` | `(x,y,z) => number` | signed distance, **negative inside**, au. Must be pure + deterministic. The CLI spot-checks finiteness at the bbox center and corners |
| `meshOpts` | `object` (optional) | `{ resolution?, kind?, materialHint?, source? }` — see below |

`meshOpts` fields:

- `resolution` — grid step in au (kernel default **0.35**, plan §8). Coarsen
  only as a last resort; refine only with a tri-count budget check.
- `kind` — manifest kind (e.g. `context`, `nucleus`, `ventricle`); default
  `context`.
- `materialHint` — one of `gray-matter | white-matter | csf | nucleus |
  context` (plan §4 manifest schema); default `context`.
- `source` — `sculpt` (pure SDF) or `bp3d+sculpt` (voxelize'd BP3D base);
  default `sculpt`.

**Pattern — build the field once at module scope**, never inside `sdf()`
(composing inside the per-sample call would allocate millions of closures):

```js
import { smoothUnion, ellipsoid, displace } from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';

export const slug = 'nuc-red-r';                       // seeds everything
const noise = createFbm3(slug, { octaves: 4 });        // deterministic
const field = displace(ellipsoid(3, 2.2, 2.6), noise, 0.3); // ~12% of radius

export function bbox() { return { min: [-5, 20, -4], max: [5, 30, 4] }; }
export function sdf(x, y, z) { return field(x, y, z); }
export const meshOpts = { kind: 'nucleus', materialHint: 'nucleus' };
```

Sizing guidance (plan §6): envelopes ~20–60k tris at 0.35 au; nuclei 3–6k
tris — use a coarser `meshOpts.resolution` (~0.6–0.9) for small nuclei.
Organic noise amplitude ≈ 12% of the mean radius.

**Registry modules** — a recipe file may instead export
`recipes: [ entry, … ]` (plus `aliases: { "<slug>": [targets] }`), where each
entry carries the same contract as above plus a `nucleus: true` flag. The CLI
validates and flattens every entry, so `--part <slug>` / `--all` / `--stats`
address each entry individually and aliases resolve to their target parts.
`scripts/anatomy-recipes/nuclei.mjs` (task 7) is the one registry module: 71
nucleus entries, every `kind:"nucleus"` slug from `taxonomy.json`.

The CLI validates every discovered recipe and fails with `file: reason` on
contract violations, duplicate slugs, or a field that returns non-finite
values. Recipes owned by later tasks may `import` from
`../lib/register.mjs` (task 4) — the CLI imports recipes lazily per run, so
missing optional modules only fail the recipes that need them.

## 4. CLI

```
node scripts/build-anatomy-geometry.mjs --all          # bake all non-demo recipes
node scripts/build-anatomy-geometry.mjs --part <slug>  # bake one (demo-* allowed; aliases resolve)
node scripts/build-anatomy-geometry.mjs --nuclei       # bake every nucleus entry w/ containment QA
node scripts/build-anatomy-geometry.mjs --selftest     # kernel round-trip self-test
node scripts/build-anatomy-geometry.mjs --stats        # in-memory stats table + nuclei summary
node scripts/build-anatomy-geometry.mjs --list         # list discovered recipes
      [--resolution <au>]                              # override meshOpts.resolution
```

- Exit codes: `0` pass · `1` failure · `2` usage error.
- Bakes write `src/assets/anatomy/<slug>.glb` and **upsert** manifest
  entries (per-slug replace, other entries untouched, parts sorted by slug).
  `--all` exits 1 if any part failed (after baking the rest); with zero
  non-demo recipes it is a successful no-op (envelope tasks land later).
- `demo-*` slugs bake to `.selftest/` and never touch the manifest or
  `src/assets/`.
- Manifest schema follows plan §4 exactly:
  `{ version: 2, generatedBy, parts: [{ slug, file, kind, source, materialHint, triCount, centroid, bbox: {min, max} }] }`.

### Nucleus containment QA (`--nuclei`, and every nucleus `--part` bake)

REALISM_PLAN §6 gate, enforced in the bake path (`nucleus: true` entries):

1. Bake the organic nucleus field (per-family shaping — see nuclei.mjs
   header: fbm ellipsoids, olivary purse, SN crescents sampled from the
   midbrain envelope's ventral surface, soft-Voronoi thalamic cells
   (cell = bisector half-space set ∩ thalamic envelope), CN columns, floor
   plaques). All seeds are PROJECTED onto the envelope interior along the
   SDF gradient and every shape is CLIPPED into its region envelope.
2. Sample ~200 surface points; a point is inside when
   min(relevant envelope SDFs) ≤ +0.8 au. Violators are auto-nudged toward
   the envelope interior along the gradient (whole-mesh translation,
   ≤ 8 iterations) — the nudged positions are what gets written.
3. Upsert `src/assets/anatomy/nuclei-report.json`:
   `{ "<slug>": { tris, contained, nudged: [dx,dy,dz], samples, envelope } }`
   (sorted by slug, per-slug replace). `--stats` prints a summary from this
   file (tri budget ≤ 200k, pooled/min containment, gate ≥ 98%).
4. Relevant envelopes per region: midbrain/pons/medulla surfaces (with
   adjacent-junction fallbacks), thalamus L/R (thalamic + habenula + TRN),
   hypothalamus (hypothalamic + subthalamic), pineal, cerebellum L/R + vermis
   (deep nuclei). Envelope SDFs come from the envelope recipe modules; if a
   module cannot be imported they are reconstructed by voxelize of the baked
   envelope GLB (tiny reader in nuclei.mjs, matching the documented writer
   format).

### `--selftest`

Bakes two demo parts to `.selftest/*.glb` — a noise-displaced ellipsoid
(the sample recipe) and a smooth-union/subtract of primitives — then re-reads
each GLB **by parsing the binary back with a tiny built-in GLB reader (no
three import)** and asserts: header magic/version/lengths, 4-byte chunk
alignment, JSON chunk parse, vertex/normal/index counts equal the in-memory
mesh, indices in range, positions finite, normals ~unit, accessor min/max
inside the bbox, watertight closure, positive signed volume (outward
winding), and byte-identical determinism across two bakes. Prints a stats
table; exits 0 only when every check passes.

## 5. GLB writer constraints (`lib/sdf/glb.js`)

The writer emits the smallest spec-conformant glTF 2.0 binary that
three.js's GLTFLoader accepts (plan §2.6: *the runtime owns materials*):

- exactly one scene / node / mesh / **one primitive**; indexed `TRIANGLES`
  (mode 4) with **uint32** indices, float32 components;
- attributes: **POSITION + NORMAL only** (no UV/TANGENT/COLOR/SKIN);
- single buffer, little-endian; accessors 4-byte aligned; JSON chunk padded
  to 4 bytes with `0x20`, BIN chunk with `0x00` (per spec);
- the POSITION accessor carries required `min`/`max`;
- **no** materials, textures, skins, animations, extensions, extras;
- geometry is written as-is in canonical space (y = +superior — matches
  glTF Y-up);
- payload discipline: committed GLBs must together stay ≤ 2.5 MB raw
  (plan §2.7) — check with `--stats` before landing big parts.

Runtime loading (GLTFLoader + manifest) is integration task 10's scope.

## 6. Kernel API quick reference

Signatures abbreviated; all distances in au; SDF convention negative inside.

**`vec.js`** — `vec3()`, `set/copy/add/sub/scale/addScaled/lerp/cross/min/max(out, ...)`,
`dot(a,b)`, `length(a)`, `lengthSq`, `normalize(out,a)`, `distance(a,b)`.
Out-param style: allocate outside hot loops.

**`sdf.js`** — primitives (centered at origin; place with `translate`):
`sphere(r)`; `ellipsoid(rx,ry,rz)` (bounded approx, **exact zero set**);
`roundBox(bx,by,bz,r)`; `cylinderY(r,h)`; `capsule(ax,ay,az, bx,by,bz, r)`;
`cappedConeY(h, r1, r2)`; `torusY(R,r)`.
Hard ops: `union`, `subtract`, `intersect`, `unionAll(...f)`.
Smooth ops (per-op k): `smoothUnion(f,g,k)`, `smoothSubtract(f,g,k)`,
`smoothIntersect(f,g,k)`, `smoothUnionAll(fields, k)`.
Transforms: `translate(f,tx,ty,tz)`, `scaleU(f,s)` (uniform), `invert(f)`.
Warps: `elongate(f,ex,ey,ez)` (exact for \|f\| < min(e)); `bendY(f,k)` (x' = x − k·y²);
`bowY(f,amp,y0,y1)` (bounded sinusoid, zero outside window); `twistY(f,radPerAu)`.
Combinator: `displace(f, g, amplitude)` with `g` a bounded noise fn — the
organic "tissue" look (amplitude ≈ 8–15% of local feature radius, plan §6).

**`noise.js`** — `hashString(str)`, `mulberry32(seed)`,
`createSimplex3(seedStrOrNum)` → (x,y,z) ∈ ~[−1,1];
`createFbm3(seed, {octaves=4, frequency=1, lacunarity=2, gain=0.5})`;
`createRidgedFbm3(seed, opts)` → ~[0,1] sharp crests (cerebellar folia).

**`surfacenets.js`** — `surfaceNets(field, bounds, {resolution=0.35,
padding=2, normalEps, maxSamples})` → `{positions, normals, indices,
vertexCount, triCount, resolution, dims, gridMin, gridMax,
missingVertexQuads, faceNormalFallbacks, samples}`.
Block-wise/streaming: two z-sample layers + two vertex-id layers alive at a
time → memory O(nx·ny), not O(volume). Watertight index output (edge-driven
quad emission); normals are central-difference field gradients with
face-normal fallback; quad winding is outward for negative-inside fields
(verified by signed volume in the selftest).

**`objio.js`** — `parseOBJ(text)` → `{positions, triangles, vertexCount,
triangleCount}` (v/f only, `v`, `v/vt`, `v/vt/vn`, `v//vn`, negative
indices, fan triangulation; all other lines ignored);
`writeOBJ(mesh, {name, comment, precision=6})` → minimal `v`/`f` text.
This is the interchange format for task 4's canonical OBJ caches
(`assets-src/bp3d/canonical/*.obj` → `parseOBJ` → `voxelizeTriangles`).

**`voxelize.js`** — `voxelizeTriangles(positions, triangles|null,
{bbox?, resolution=0.35, bandCells=4, mode='auto'|'winding'|'parity'})` →
signed grid `{min, max, dims, spacing, band, data, sample(x,y,z), sdf,
diagnostics}`. Pipeline: triangle-AABB band rasterization of the unsigned
distance → per-column (+z) winding/parity sign fill with per-column parity
fallback and boundary-shell orientation normalization → 26-neighbor chamfer
distance-transform band → signed data. `grid.sdf` plugs directly into
`surfaceNets` and `containmentFraction`. `diagnostics` reports
`{leakColumns, flipped, signDisagreementRatio, elapsedMs}` — investigate
any recipe with `leakColumns > 0` or `signDisagreementRatio > 0.15`
(source mesh likely open or inconsistently wound).

**`stats.js`** — `triCount`, `vertexCount`, `bounds`, `signedVolume`
(positive ⇒ outward winding), `surfaceArea`, `edgeManifoldRatio` (edges with
exactly 2 faces; ambiguous-face quads lower it without opening holes),
`watertightness` → `{closed, boundaryEdges, oddEdges}` (the closure test),
`degenerateFaceRatio`, `containmentFraction(sdf, positions, {margin=0.8,
stride=1})` → `{fraction, samples, inside}` — the plan §6 QA metric
("fraction of sample points with SDF(x) < margin", pass ≥ 0.98),
`meshReport(positions, indices, {sdf, margin})` one-call report,
`formatTable(columns, rows)` for CLI tables.

## 7. Budgets

| budget | value | enforced by |
| --- | --- | --- |
| default grid resolution | 0.35 au | kernel default |
| bake time per part | < 90 s (plan §8) | `--stats` bake column |
| peak mesher memory | O(nx·ny) streaming layers | surfacenets.js |
| committed GLB payload | ≤ 2.5 MB total raw | `--stats` / review-qa |
| total rendered tris | ≤ 700k (runtime) | integration task 10 |
| grid size guard | 64M samples (mesher) / 96M nodes (voxelize) | hard throw |

## 8. Verification status

- `node scripts/build-anatomy-geometry.mjs --selftest` — 26/26 checks pass
  (round-trip parse, counts, alignment, closure, winding, determinism).
- Kernel unit smoke checks (scratch, gitignored): sphere signed volume
  within 0.3% of analytic; cube voxelize→SurfaceNets volume within 0.8%;
  OBJ write→parse round trip.
- `npm run check` stays green: the kernel is plain `.mjs` outside the
  TypeScript project (`tsconfig.json` includes `src` only).
