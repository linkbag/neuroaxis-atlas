# PLAN — run `mtw0n2eu-cuw2`: NeuroAxis v6 audit remediation (P0–P2)

**Author:** `architect-review` (task `architect-review`, no dependencies)
**Date:** 2026-09-10 · **Repo:** `D:\Startup projects\3DNeuroanatamoy` · branch `master` @ `716896f`
**Authoritative spec:** `docs/QUALITY_PLAN.md` (untracked at review time) → `docs/AUDIT_REPORT.md`
**Status of this document:** review + refinement of the dispatched proposal. It *replaces* the proposal's
task/write-scope/blockedBy tables. Everything below marked **VERIFIED** was checked against the working tree
during this review; everything marked **REFUTED** contradicts a claim in the proposal or the audit report and
overrides it.

---

## 0. Verification summary — what this review actually checked

All commands below were run in `D:\Startup projects\3DNeuroanatamoy`, Node v24.18.0, npm 12.0.2.

| # | Claim under review | Method | Verdict |
| --- | --- | --- | --- |
| 1 | All gates green at baseline | `npm run validate` (0 errors/0 warnings), `npm run check` (exit 0), `npm run build` (exit 0), `npm run verify:pipeline` (84/84 parts, 320 016 tris, 162 loops, PASS) | **VERIFIED** |
| 2 | Bundle baseline | `dist/assets/index-*.js` = **3 267.43 kB raw / 726.27 kB gzip** (the audit's "672 KB gzip" line is stale — see deviation D16) | **VERIFIED + CORRECTED** |
| 3 | "0 matches for `webglcontextlost`" | grep across `src/` | **VERIFIED** (the only `WEBGL_lose_context` hit is a capability probe in `src/state/store.ts:40`) |
| 4 | "Three independent plane transforms" | grep `AXIS_PAIR` → `SectionCanvas.tsx:111`, `imageLayers.ts:792`; `nearestLevelTo` → `ClipControls.tsx:22`, `SectionSliderBar.tsx:48`; `photoForPlane` → `PlatesTab.tsx:223` | **VERIFIED** |
| 5 | "`SECTION_PARTS.filter().sort()` per frame **and** per pointermove" | `SectionCanvas.tsx:848-850` (draw) and `:1185-1187` (pointermove) | **VERIFIED** |
| 6 | "PiP reads back 32×32 every frame" | `SectionPiP.tsx:940-988` already gates the readback behind a "stencil parity watchdog" | **PARTIALLY REFUTED** — make it *tighter* (watchdog schedule), do not describe it as unconditional |
| 7 | "The 8 invisible tracts need authored `waypoints`/`tubeRadius`/`color`/`levels`" | printed all 19 entries of `src/data/tracts.json` | **REFUTED** — **all 19 tracts already carry complete paths** (waypoints 5–8 each, tubeRadius 0.4–0.9, colour, levels). 0 tracts have "no waypoints". Revision 6 rebuilds the fix |
| 8 | "11 records ship `clinical: []`" | parsed all 137 records | **REFUTED + CORRECTED** — `clinical: []` occurs **0** times; **11 records ship no `clinical` field at all** (the proposal lists exactly those 11 ids, so the *work* is right and the *diagnosis* is wrong) |
| 9 | "All 11 `context` taxonomy entries have no mesh, while 10 unregistered `ctx-*` meshes render" | manifest + taxonomy cross-join | **REFUTED + CORRECTED** — see §1.2. 6 of the 10 rendered `ctx-*` silhouettes are **already owned by an existing registered id** via `SceneLayers.ENVELOPE_SLOTS`; only **4** need new registry records. The real defect is different: envelopes are `raycast={() => null}` (`SceneLayers.tsx:153`) and `NucleusMesh` forces `pickable = record.kind !== 'context'` (`NucleusMesh.tsx:97`), so the silhouettes cannot be clicked |
| 10 | "registered `context` ids ↔ rendered meshes" is a 1:1 naming problem | taxonomy dump | **REFUTED** — no registered id equals any `ctx-*` mesh slug, so a naive "add mesh slug to the id" edit is impossible; the mapping table in `CONTENT_INVENTORY.md` is the deliverable, and it must be an *ownership* table (slot → record), not a slug-equality table |
| 11 | `CONTENT_INVENTORY.md` staleness | read §2, §3, §5, §7 | **VERIFIED** — §2 says "diencephalon 42, midbrain 24, pons 34, medulla 32" (correct!) while §3 headings say 41/22/27/25 (stale); §5 says 23 syndromes with `syn-central-horner` (absent from all data files) and omits `syn-lateral-pontine` / `syn-peduncular-hallucinosis`; actual = **24** syndromes |
| 12 | "46 fitted entries" with `fit.dy = 0` | grep `dy:` in `sectionImages.ts` | **CORRECTED** — **25 `dy:` occurrences**: 1 interface field + **24 concrete fitted entries** (9 `ubcNotes`, 15 `ubcCoronalNotes`), all `dy: 0`, all `mirrorX: false`. The 22 VHP entries also carry `dy: 0`. The measurement task must operate on the *programmatically generated* entries, not on "46 literals" |
| 13 | The `verify:plane` gate can import the new module from Node | imported `src/components/section/contours.ts` from Node 24 directly | **VERIFIED** (Node 24 type-strips `.ts`); **but** `src/data/load.ts` is NOT importable from Node (`needs an import attribute of "type: json"`) and `src/data/sectionImages.ts` is NOT importable (imports `.jpg`). → hard rule R4 below |
| 14 | "Enable `minify` … the esbuild shim exists because of a sandbox limitation" | ran `esbuild.transform(src,{minify:true})` through the shim; built with `minify:'esbuild'`; built with `minify:'terser'` | **RESOLVED — minify via esbuild is a silent NO-OP, minify via terser WORKS** (see §1.5, the single most valuable finding in this review) |
| 15 | 37-check runtime audit exists and is green | `scripts/verify/audit.mjs` (513/551 lines, 11 lettered sections A–K, `ok/bad/info` + `process.exit(failed===0?0:1)`) | **VERIFIED as a harness** (assertion count is ~46 call sites, not 37; the report's "37" is a run-time count and will move when demos are added) |
| 16 | The dev server is stopped; nothing else running | `git status --porcelain` → only two untracked docs | **VERIFIED** |

### 1.1 Numbers to re-baseline in `docs/AUDIT_REPORT.md` (do not silently change the report — record corrections)

* clinical coverage: 137 records · 0 with `clinical: []` · **11 with no `clinical` field** · 126 with ≥1 item · **51 with exactly 1 item**
* syndromes: **24** records in 3 files; `syn-central-horner` exists in no data file; `syn-lateral-pontine` and `syn-peduncular-hallucinosis` are undocumented
* taxonomy: **137** entries (region 42/24/34/32/5 · kind nucleus 71, context 11, tract 36, ventricle 3, surface 16)
* tracts: **19 tract records** (all with complete path data) vs **36 taxonomy tract ids** → **17 registry tract ids have no tract record** (2D-label-only: `tract-pyramid`, `tract-pyramidal-decussation`, `tract-scp`, `tract-mcp`, `tract-icp`, `tract-medial-lemniscus`, `tract-lateral-lemniscus`, `tract-trapezoid-body`, `tract-internal-arcuate`, `tract-fasciculus-gracilis`, `tract-fasciculus-cuneatus`, `tract-stria-medullaris`, `tract-posterior-commissure`, `tract-mesencephalic-v`, `tract-crus-cerebri`, `tract-scp-decussation`, `tract-spinal-trigeminal`)
* the "8 invisible tracts" are exactly the tract records with **no plate label**: `tract-dcml`, `tract-trigeminothalamic-ventral`, `tract-trigeminothalamic-dorsal`, `tract-auditory-pathway`, `tract-spinoreticular`, `tract-lateral-vestibulospinal`, `tract-medial-vestibulospinal`, `tract-hypothalamospinal`
* plate labels: **122** distinct `data-structure` / `data-for` ids across 12 SVGs, **28** of them tracts, **0** unregistered → plate/taxonomy integrity is already complete

### 1.2 Context-layer identity — the corrected statement of the defect

`SceneLayers.tsx` builds 10 envelope slots (the "rendered silhouettes"). Each slot has its **own internal
id** (`env-medulla`, `env-pons`, `env-midbrain`, `ctx-thalamus-envelope` ×2, `ctx-hypothalamus-envelope`,
`ctx-cerebellum` ×3, `env-pineal`) and an **asset slug** which is what the manifest and the runtime `mesh.name`
carry:

| manifest slug (rendered) | `mesh.name` (runtime) | owned by taxonomy record | registry state |
| --- | --- | --- | --- |
| `ctx-thalamus-l` | `ctx-thalamus-l` | `ctx-thalamus-envelope` | exists (paired, `laterality: related`) |
| `ctx-thalamus-r` | `ctx-thalamus-r` | `ctx-thalamus-envelope` | same record |
| `ctx-hypothalamus-surface` | `ctx-hypothalamus-surface` | `ctx-hypothalamus-envelope` | exists |
| `ctx-cerebellum-l` | `ctx-cerebellum-l` | `ctx-cerebellum` | exists |
| `ctx-cerebellum-r` | `ctx-cerebellum-r` | `ctx-cerebellum` | same record |
| `ctx-cerebellar-vermis` | `ctx-cerebellar-vermis` | `ctx-cerebellum` | same record |
| `ctx-midbrain-surface` | `ctx-midbrain-surface` | — | **needs a new `ctx-*` record** |
| `ctx-pons-surface` | `ctx-pons-surface` | — | **needs a new `ctx-*` record** |
| `ctx-pineal` | `ctx-pineal` | — | **needs a new `ctx-*` record** (distinct from `nuc-pineal-gland`) |
| `ctx-medulla-surface` | `ctx-medulla-surface` | — | **needs a new `ctx-*` record** |

So: **6 of the 10 slots are already owned by an existing registered id; the remaining 4 slots need 4 new
records** (`ctx-midbrain-surface`, `ctx-pons-surface`, `ctx-medulla-surface`, `ctx-pineal`). The other
registered `context` ids (`ctx-internal-medullary-lamina`, `ctx-fields-of-forel`,
`ctx-corpus-callosum`, `ctx-internal-capsule`, `ctx-lenticular-nucleus`, `ctx-caudate-nucleus`,
`ctx-pontine-nuclei`, `ctx-pontine-fibers`) are **plate-2D/derivation-only by design** and must be *documented
as having no 3D silhouette*, not given one.

**And the actual user-visible defect is not the naming at all:** every envelope is
`raycast={() => null}` (`SceneLayers.tsx:153`) and `NucleusMesh.tsx:97` hard-codes
`const pickable = record.kind !== 'context'`. That is the code that must change for "every rendered
silhouette is selectable" (QUALITY_PLAN §2 item 8, §6 acceptance). See task `p1-identity` item (1).

### 1.3 The only real tract gap

All 19 tract records render (`SceneLayers.tsx:183-190` + `:212-214`: every tract with a taxonomy entry,
default layers = ALL regions × ALL kinds → visible on first paint). The gap is **discoverability**, not
rendering: 8 tract records appear on no plate. The proposal's requirement to author `waypoints` is therefore
**withdrawn**; the corrected task is (a) *prove* the 19 render and are selectable, (b) record the "no plate
label" set honestly, (c) decide and document the 17 registry-stub tracts (out of scope to author here).

### 1.4 Concurrency hazards found in the proposal

The dispatched `writes` lists collide **five ways** on three god-files:

| File | Proposal owners | Hazard |
| --- | --- | --- |
| `src/components/section/SectionCanvas.tsx` | `p0-survivability`, `p1-planededup`, `p2-perf` | three concurrent writers on a 1 313-line file |
| `src/components/section/imageLayers.ts` | `p0-survivability`, `p1-planededup`, `p2-perf` | same, 1 396 lines |
| `src/components/viewer3d/SectionPiP.tsx` | `p0-survivability`, `p1-planededup`, `p2-perf` | same, 1 286 lines |
| `src/App.tsx` | `p0-survivability`, `p2-a11y`, `integration-v6` | same |
| `src/data/structures/*.json` (7 files) | `p1-content`, `p1-identity` | same |
| `package.json` | `p1-planededup`, `p2-perf`, `integration-v6` | same |
| `src/components/ReferencesModal.tsx` | `p0-survivability`, `p2-a11y` | same |

All of these are resolved below by **exclusive write scopes + real dependency edges**. No two tasks that run
concurrently share a file (R1).

### 1.5 The minify question — resolved, with measurements

The `vendor/esbuild-shim` exists because the sandbox denies piped-stdio child processes. Measured facts:

* `esbuild.transform(src, { minify: true })` through the shim returns the **input unchanged**
  (147 B → 147 B; the comment survives) — `vendor/esbuild-shim/index.js:164-166` is an explicit minify passthrough.
* `vite build` with `build.minify: 'esbuild'` (the Vite default) **succeeded but produced a byte-identical
  entry chunk** (`index-CeW4pqyo.js`, 3 267.43 kB → 726.27 kB gzip, same content hash as the `minify:false`
  build). esbuild's per-chunk minify pass is a **silent no-op**.
* `vite build` with `build.minify: 'terser'` — terser@5.51.2 is pure JS and runs in-process — **works**:

| variant | entry JS raw | entry JS gzip | CSS raw | CSS gzip | build time |
| --- | --- | --- | --- | --- | --- |
| baseline (`minify:false`) | 3 267.43 kB | 726.27 kB | (unminified) | — | 3.5 s |
| `minify:'esbuild'` | 3 267.43 kB | 726.27 kB | — | — | 3.6 s |
| **`minify:'terser'`** | **1 969.13 kB** | **514.18 kB** | 50.43 kB | 11.35 kB | 10.6 s |

**Decision for this run: `build.minify: 'terser'` with `terserOptions`, `terser` declared as a devDependency.**
`minify:'esbuild'` must be forbidden (it would ship a false claim of minification). GLBs are already emitted as
`dist/assets/*.glb` (7.39 MB) and are **not** in the JS bundle; the 86 tiny per-GLB JS chunks already make the
`?url` import lazy, so the proposal's "lazy-loading for the anatomy GLBs" item is **already done** — the real
first-paint win is minification + `manualChunks`. `package-lock.json` does **not** contain `terser`, so the
build task must run `npm install -D terser@5 --cache .npm-cache` (global npm cache is EPERM-denied; the
repo-local cache works) and commit both `package.json` and `package-lock.json`.

---

## 2. Global rules for every task in this run

* **R1 — exclusive write scope.** A task may write only the files in its `writes` list. If you need a change in
  a file you do not own, put the request in your final report; the owner (or the integrator) applies it.
* **R2 — gate discipline.** Never weaken, skip or delete an existing check to make it pass. `npm run validate`
  must stay at **0 errors AND 0 warnings** (warnings count against you).
* **R3 — prove the product is wrong before changing it.** The audit's own history is the reason: three
  "product failures" were harness bugs. If a check fails, first demonstrate the product is at fault.
* **R4 — Node-importable pure modules.** `scripts/verify/plane-transform.mjs` must be able to
  `import` `src/components/section/planeGeometry.ts` from Node 24. That file therefore may import **only**
  `import type` declarations and other such pure modules — **no** `src/data/load.ts` (it statically imports
  `.json`, which Node rejects without `with { type: 'json' }`), **no** `src/data/sectionImages.ts` (imports
  `.jpg`), **no** assets. Pass `levels` **in as a parameter** from the caller (`levels.json` read via
  `readFileSync` + `JSON.parse` in the script); do not import it in the module.
* **R5 — dev server.** Exactly one server, one owner at a time:
  `npm run dev > .dsh-scratch/dev.log 2>&1` as a background job, wait for
  `node -e "fetch('http://localhost:5173').then(r=>console.log(r.status))"` → `200`, run
  `node scripts/verify/audit.mjs http://localhost:5173`, then **kill the job**. Never leave it running.
  Tasks that must do this: `p2-perf`, `p2-a11y`, `p1-photofit` (optional), `integration-v6`, `review-qa-v6`.
* **R6 — evidence = real files.** `evidence.files` lists files, never directories. Gate commands are run from
  the repo root. Report `npm run audit` output hashes/numbers verbatim.
* **R7 — canonical space immovable.** `src/data/levels.json` and `CANONICAL`/`CLIP_BOUNDS`
  (`x ∈ [−48, 48]`, `y ∈ [−55, 45]`, `z ∈ [−56, 26]`) keep their current values. Do not extend them.
* **R8 — budgets.** committed imaging payload stays ≤ 8 MB (currently **7.30 MB of 7 653 833 B**);
  committed anatomy payload stays ≤ 8 MB (currently **7.45 MB / 7 806 718 B**). No new binary assets without a
  stated budget line.
* **R9 — v1–v5 regression list** (every task's final self-check): selection from 3D / tree / search / plate /
  syndrome; region+kind layers; clip + snap-to-plate; explode; quality toggle; Learn-more links; PiP
  (slider-plane fix + restore control); live section in all modality modes incl. axis-aware Photo disabling;
  plane sliders.
* **R10 — scratch hygiene.** All temporary files go under `.dsh-scratch/`, `.plate-scratch/`, `assets-src/` or
  `.bp3d-probe/` (all already gitignored). `git add -A` must never pick up a scratch artefact.

---

## 3. The task DAG (one run, ten tasks)

```
                        architect-review  ✅ (this task)
                                 |
   +--------------+--------------+--------------+--------------+--------------+
   |              |              |              |              |              |
p0-survivability  p1-planededup  p1-content     p1-identity    p1-photofit
   (P0)             (P1, gate)     (P1, data)     (P1, 3D/a11y)  (P1, data)
   |                 |                                                    |
   |                 +--> p2-perf (P2)         p2-a11y (P2) <-- p0-survivability
   |                        |                       |
   +------------------------+-----------------------+------------------------+
                            |
                      integration-v6
                            |
                       review-qa-v6
```

**blockedBy edges (all of them real, each justified by a shared file or a required artefact):**

| task | blockedBy | why it is real |
| --- | --- | --- |
| `p0-survivability` | — | starts immediately |
| `p1-planededup` | — | owns the god-files outright; nobody else may touch them until it lands |
| `p1-content` | — | JSON + one doc file, disjoint from everything |
| `p1-identity` | — | `taxonomy.json` + `SceneLayers.tsx` + recipes; region JSON removed from its scope, so no overlap with `p1-content` |
| `p1-photofit` | — | `sectionImages.ts` only; measures `dy` and records `mirrorX` as *unmeasured* (the orientation table stays `p1-planededup`'s artefact) |
| `p2-perf` | **`p1-planededup`** | shares `SectionCanvas.tsx`, `imageLayers.ts`, `SectionPiP.tsx`, `PlatesTab.tsx`, `package.json` with the refactor; the refactor must land first or both edits are lost |
| `p2-a11y` | **`p0-survivability`** | shares `App.tsx` (boundary wrapping) and `ReferencesModal.tsx` (boundary card) |
| `integration-v6` | `p0-survivability`, `p1-planededup`, `p1-content`, `p1-identity`, `p1-photofit`, `p2-perf`, `p2-a11y` | it is the close-out: acceptance run, housekeeping (`SectionCanvas.draw()` split touches the refactored file), commit |
| `review-qa-v6` | `integration-v6` | final independent gate; must review the committed tree |

**Independent workstreams that run concurrently (verified disjoint):** `p0-survivability` ∥ `p1-planededup` ∥
`p1-content` ∥ `p1-identity` ∥ `p1-photofit`. Then `p2-perf` ∥ `p2-a11y`. Then `integration-v6`, then
`review-qa-v6`. That is 7 tasks of width-5/2 parallelism — **one run, one DAG, no sibling runs** (as required).

---

## 4. Task-by-task plan

### 4.1 `p0-survivability` — builder · P0 survivability

**Spec:** `docs/QUALITY_PLAN.md` §1 items 1–3 · `docs/AUDIT_REPORT.md` §2.1–2.3, §6 P0.

**writes (exclusive):**
`src/components/viewer3d/Viewer3D.tsx` · `src/geometry/anatomyAssets.ts` ·
`src/components/section/sectionAssets.ts` · `src/components/section/SectionErrorBoundary.tsx` ·
`src/components/PanelErrorBoundary.tsx` (new) · `src/components/AppErrorBoundary.tsx` ·
`src/App.tsx` · `src/components/InfoPanel.tsx` · `src/components/TaxonomyTree.tsx` ·
`src/components/SyndromeBrowser.tsx` · `src/components/PlateRenderer.tsx` ·
`src/components/ReferencesModal.tsx` · `src/components/Header.tsx` ·
`src/components/Legend.tsx` · `src/components/LevelRuler.tsx` · `src/components/SearchBox.tsx` ·
`src/styles/panels.css`

**DEV-1 (details 1 and 2, upgrade-to-blockers):** `SectionCanvas.tsx`, `imageLayers.ts`, `SectionPiP.tsx` and
`PlatesTab.tsx` are **removed from this task's scope** — `p1-planededup` owns all four unreleased god-files for
the whole run, and a three-way concurrent edit of a 1 313-line file loses work. Consequences:

* the live-section loader state lives in `sectionAssets.ts` (the hook that fans `useAnatomyAsset` over
  `SECTION_PARTS`) and `anatomyAssets.ts`, which **you do own** — implement the timeout, the failure state and
  the retry there, and hand the exact banner text to `p1-planededup` (owner of `SectionCanvas.tsx:884`) in your
  final report;
* export `PanelErrorBoundary` as a self-contained component and hand the exact 3-line wrap for
  `PlatesTab` / `SectionCanvas` / `SectionPiP` / the PiP container to `p1-planededup` in your final report.
  The **behavioural** acceptance for those surfaces still belongs to the run, and `integration-v6` step 4(a)
  demonstrates it end to end.

**Deliverables**

1. **WebGL context loss.**
   `Viewer3D.tsx`: attach `webglcontextlost` / `webglcontextrestored` to the R3F canvas element (get it from
   `onCreated({ gl })` → `gl.domElement`; `onCreated` already exists at `Viewer3D.tsx:288`). On loss:
   `event.preventDefault()`, stop scheduling frame work, set a `contextLost` state; on restore: recreate the
   `PMREMGenerator` environment (`Viewer3D.tsx:123-137`), re-apply `gl.localClippingEnabled = true`,
   toneMapping/`outputColorSpace`, and call `invalidate()`/one forced redraw. Render an overlay
   (`role="alert"`, text "Graphics context lost — restoring…", plus a click-to-restore button) inside the
   canvas container, not over the whole app.
   **The PiP half is an interface, not an edit:** `p1-planededup` owns `SectionPiP.tsx`. Establish and document
   whether the PiP shares the main R3F context or owns its own (read `SectionPiP.tsx:440-620`), then hand it a
   concrete recipe — either "rebuild the rig on the main canvas' `webglcontextrestored`" or "attach your own
   listeners to your own target's context". Put that recipe in the file header of `Viewer3D.tsx` and in your
   final report; `p1-planededup` applies it, and `integration-v6` step 4(b) proves it at runtime.
2. **Error boundaries everywhere.**
   Keep `src/components/section/SectionErrorBoundary.tsx` as a thin re-export shim over a new generic
   `src/components/PanelErrorBoundary.tsx` (`props: { name: string; children; fallback? }`), so the existing
   import path keeps working. Wrap, each with its own compact "«panel» failed — Retry" card
   (`role="alert"`, `class="panel-error"`, styles in `panels.css`): the 3D viewer, InfoPanel, TaxonomyTree,
   SyndromeBrowser, ReferencesModal, Header, PlateRenderer, and the browse-rail search/tree/ruler sections.
   Add an outer `AppErrorBoundary` around `<App />` content in `App.tsx` as the last line of defence.
   For `PlatesTab` / `SectionCanvas` / `SectionPiP`: hand the exact wrap to `p1-planededup` (DEV-1).
3. **Load timeouts + visible failure states.**
   `anatomyAssets.ts`: bound the `Promise.all([loadGlbUrl, loadAnatomyGeometry])` in `useAnatomyAsset` with an
   abort/timeout of `ANATOMY_LOAD_TIMEOUT_MS = 15_000` (exported constant). On timeout → `status: 'fallback'`
   (the v1 primitive keeps rendering — never a blank) **and** a distinct `timedOut: true` flag so the UI can
   say "geometry unavailable — retry" rather than "loading". Expose a `retry()` that clears the slug's entry
   from `geometryCache`/`urlCache` and re-runs the effect (the caches already delete on failure — extend that
   to the timeout path). `imageLayers.ts`: same bound for the grid/photo loaders → `'unavailable'` + a
   `retry()`. `sectionAssets.ts`: aggregate `readyCount/partial/timedOut` and expose
   `allSettled: boolean`; the "Loading anatomy meshes X/84" banner (drawn in `SectionCanvas.tsx:884`) must
   become terminal — report the exact text `sectionAssets` should surface to `p1-planededup` so the banner can
   say "geometry unavailable (N/84) — retry" and never spin forever.
4. **Regression proof:** forced-throw demo per wrapped surface is `integration-v6`'s job; here, satisfy
   yourself with `npm run check`.

**Gates / evidence:** `npm run check` (exit 0) · `npm run build` (exit 0) · `npm run verify:pipeline` (PASS) ·
files: `PanelErrorBoundary.tsx`, `AppErrorBoundary.tsx`, `anatomyAssets.ts`, `sectionAssets.ts`.

**Risks flagged:** (a) React 18 error boundaries do not catch async/event-handler throws — state that
limitation in the file headers rather than implying full coverage; (b) an overlay that covers the canvas will
break `verify:audit`'s pixel-bucket check (`scripts/verify/audit.mjs:150-174`) — the loss overlay must be
hidden unless a loss is active; (c) `preventDefault()` on `webglcontextlost` is mandatory or the canvas is
never restored.

---

### 4.2 `p1-planededup` — builder · P1 one plane transform + geometry-derived orientation gate

**Spec:** `docs/QUALITY_PLAN.md` §2 items 4–5 · `docs/AUDIT_REPORT.md` §2.4/§2.5, §6.6.
**Highest-risk refactor in the run.** Behaviour must be identical or better.

**writes (exclusive):**
`src/components/section/planeGeometry.ts` (new) · `src/components/section/SectionCanvas.tsx` ·
`src/components/viewer3d/SectionPiP.tsx` · `src/components/section/imageLayers.ts` ·
`src/components/PlatesTab.tsx` · `src/components/viewer3d/ClipControls.tsx` ·
`src/components/section/SectionSliderBar.tsx` · `scripts/verify/plane-transform.mjs` (new) ·
`package.json` (**add the one line `"verify:plane": "node scripts/verify/plane-transform.mjs"`; touch nothing else**)

**DEV-2 (detail 1):** `p0-survivability` was removed from `SectionCanvas.tsx`/`imageLayers.ts`/`SectionPiP.tsx`
so this task owns them outright.

**Deliverables**

1. **`src/components/section/planeGeometry.ts`** — one module, header-documented contract per export:
   `planeTransform(axis, planeValue, viewport)` (the single world↔screen mapping),
   `AXIS_PAIR`, `axisExtents(axis)`, `nearestLevelTo(axis, value, levels)`,
   `snapClipWrite(axis, value, snapToPlate, levels)`, `pickImageForPlane(entries, axis, planeValue, toleranceAu)`,
   `badges(axis)` + `mirrorX(axis)`.
   * `levels` is a **parameter** (rule R4). `axisExtents` derives from `CLIP_BOUNDS`
   (`src/components/viewer3d/clipPlanes.ts`) — move that constant into `planeGeometry.ts` and have
   `clipPlanes.ts` re-export it, so there is still exactly one declaration.
   * Snapping contract (must be preserved exactly): transverse snaps to `levels[].y`; x/z never snap;
     the comparison is against the **dragged** value, never the current `clip.y`
     (`ClipControls.tsx:60-69`, `SectionSliderBar.tsx:48-59` — documented, do not "improve" it).
2. **Refactor every consumer:** `SectionCanvas.tsx` (`AXIS_PAIR` at :111 and :1027, transform at :423, level
   lookup), `SectionPiP.tsx` (camera framing, labels, and the photo mirror flag it hands the canvas —
   `SectionPiP.tsx:91`), `imageLayers.ts` (its private `AXIS_PAIR` at :792 and the extent/fit maths at
   :791-910), `PlatesTab.tsx` (`photoForPlane` at :223 → `pickImageForPlane`), `ClipControls.tsx`
   (`nearestLevelTo` at :22 + the snap write), `SectionSliderBar.tsx` (`nearestLevelTo` at :48 + the snap write).
   **Delete every private duplicate** — the gate will grep for them.
3. **Resolve the canvas-vs-PiP disagreement and say which convention won.** Canvas centres on the bounds
   midpoint; PiP/sampler assume centre 0 with a 1.08 margin (`AUDIT §2.4`). Decide from the authored plates:
   the `fit.scale` doc comment (`sectionImages.ts:247-248`) defines `wAu = naturalWidth / fit.scale`, and the
   plate orientation badges are drawn in the SVG itself — pick the convention under which the *same photograph
   at the same plane* lands at the same world position/size in both surfaces **and** `fit.scale` keeps its
   declared meaning. Record the choice and the reasoning in `planeGeometry.ts`'s header and in the final report.
4. **`scripts/verify/plane-transform.mjs` (new gate, `npm run verify:plane`)** — must exit **non-zero** on any
   failure, run from the repo root, and read `src/data/levels.json` via `readFileSync` (rule R4). Assertions:
   (a) canvas transform ≡ PiP transform over a grid of 3 axes × N plane values × ≥5 viewport aspects
   (incl. degenerate wide/tall);
   (b) the badge table is **derived from geometry**: project world points (+x = patient-left, +y = superior,
   +z = anterior) through each axis' mapping and assert which anatomical side lands on image-left
   (transverse: anterior up, patient-left on image-**right**; sagittal: superior up, anterior right;
   coronal: superior up, patient-left on image-**right**) — then assert `badges(axis)` equals the derived
   string. No hard-coded expected string anywhere in the gate;
   (c) `nearestLevelTo` and `snapClipWrite` agree with the 13 `levels.json` anchors, including ties and
   out-of-range values.
   **Self-test the gate (mandatory):** before finishing, temporarily mutate one constant (in a scratch copy),
   confirm the gate fails, revert. A gate that cannot fail is worthless — the audit already found one such gate.
5. **Two inbound obligations from `p0-survivability`** (it owns the loaders and the boundary component but not
   these files). Apply both, they are part of the P0 acceptance:
   (a) the terminal live-section banner text from `sectionAssets` at `SectionCanvas.tsx:884` (must read as a
   failure + retry, never "Loading anatomy meshes X/84" forever);
   (b) the PiP WebGL context-loss recipe in the `Viewer3D.tsx` header — rebuild the PiP render-target/stencil
   rig on the main canvas' `webglcontextrestored`, or attach listeners to the PiP's own context, whichever the
   recipe says.
   Also wrap `PlatesTab` / `SectionCanvas` / `SectionPiP` in `PanelErrorBoundary` using the exact wrap
   `p0-survivability` hands you. Any dead CSS class you orphan (e.g. for a removed badge) goes on a list for
   `p2-a11y`; **do not edit `src/styles/*.css`** — those files belong to `p2-a11y`.

**Gates / evidence:** `npm run validate` 0/0 · `npm run check` 0 · `npm run build` 0 · `npm run verify:pipeline`
PASS · `npm run verify:plane` PASS **and** observed to FAIL under the mutation · files:
`planeGeometry.ts`, `plane-transform.mjs`.

**Risks flagged:** (a) `SectionPiP.tsx` is 1 286 lines with a documented stencil/clipping contract in its
header — read it fully before editing; (b) **the PiP slider-plane fix and the restore control are v3/v5
regression items (constraint c)** — re-verify both by hand after the refactor; (c) do not change
`planeValue`/`fit.dx` semantics, `p1-photofit` consumes them.

---

### 4.3 `p1-content` — builder · P1 clinical content, syndrome, doc reconciliation

**Spec:** `docs/QUALITY_PLAN.md` §2 item 7 · `docs/AUDIT_REPORT.md` §2.9–2.12, §6 P1-content.
Content-only; no components, no scripts.

**writes (exclusive):**
`src/data/structures/diencephalon-thalamus.json` · `src/data/structures/diencephalon-hypothalamus.json` ·
`src/data/structures/diencephalon-epithalamus-subthalamus.json` · `src/data/structures/midbrain.json` ·
`src/data/structures/medulla.json` · `src/data/structures/tracts.json` ·
`src/data/syndromes/diencephalon.json` · `src/data/syndromes/hindbrain.json` ·
`src/data/syndromes/midbrain.json` · `docs/CONTENT_INVENTORY.md`

**Corrections to the proposal (read carefully):**

* **DEV-3 (detail 1):** the defect is **not** `clinical: []`. Exactly **11 records omit the `clinical` field
  entirely**: `nuc-cochlear-dorsal`, `nuc-superior-olivary`, `nuc-interposed`, `nuc-inferior-olive-medial`,
  `nuc-arcuate-medullary`, `nuc-nucleus-cuneatus`, `nuc-vestibular-inferior`, `tract-lateral-lemniscus`,
  `tract-trapezoid-body`, `tract-internal-arcuate`, `tract-fasciculus-cuneatus`. `checkClinical(..., required)`
  (`validate-data.mjs:197-220`) makes the array **required and non-empty for tracts** (:437) and **optional-but
  never-empty for structures** (:414). Author `clinical: [ … ]` with **at least one** item on all 11 → the
  post-state is "**0 records without clinical content**" (that is the acceptance wording in QUALITY_PLAN §6).
* **DEV-4 (detail 4, WITHDRAWN):** the requirement to author/patch `waypoints`, `tubeRadius`, `color`, `levels`
  is **withdrawn**. Verified: all 19 tracts already have 5–8 waypoints each and valid radii/colours/levels;
  0 tracts lack waypoints; none are outside the canonical bounds. Do **not** edit those fields — a pointless
  edit here is a real regression risk (the tube curriculum, striation repeat and taper all read them:
  `TractTube.tsx:105-200`). Replace the work with a *recorded finding*: the 8 tract records with no plate label
  are a **2D discoverability gap**, not a 3D gap; write that in `CONTENT_INVENTORY.md` (§4 tract index) and in
  your final report.
* **DEV-5 (detail 5):** `taxonomy.json` is owned by `p1-identity`. In `CONTENT_INVENTORY.md` you document the
  **as-authored** state; if `p1-identity` lands its 4 new `ctx-*` records, `integration-v6` reconciles the
  table in close-out (that step is in its scope on purpose). Prefix your context-identity subsection with the
  date and the taxonomy revision you documented.

**Deliverables**

1. **Clinical gaps.** The 11 records above get ≥1 clinically accurate, original-paraphrase item in the
   existing shape `{ syndrome, findings, vascular?, note? }`, in the same Blumenfeld-chapter citation style as
   their neighbours; `vascular` wherever a territory applies. Then add a **second** item to the 15
   most-taught single-item records — **state your selection rule explicitly** (suggested: teaching frequency in
   Blumenfeld/Patten + syndrome cards that reference the record + presence on a plate) and list the 15 ids.
   Post-state: 0 records without clinical content; the 51 single-item records drop to 36.
2. **Missing syndrome.** Author `syn-one-and-a-half` (one-and-a-half syndrome: PPRF + ipsilateral MLF) in the
   correct regional file with `structures: [nuc-pprf, tract-mlf]` (both exist — **VERIFIED**), `presentation`,
   `cause`, `vascularTerritory`, `refs`. Both ids must resolve (validator-enforced).
3. **Doc reconciliation** in `docs/CONTENT_INVENTORY.md`, with a "refreshed 2026-09-10" note:
   §2 registry line already correct (42/24/34/32/5) while **§3 headings are stale** (41/22/27/25 → 42/24/34/32;
   cerebellum 5 unchanged) — recompute from the data, do not copy;
   §5 → **24** syndromes (25 after your addition): fix the count, **resolve `syn-central-horner`** — either
   author it properly with resolving structures (incl. `tract-hypothalamospinal`, which exists) **or** remove
   the claim and record the decision; add rows for `syn-lateral-pontine` and `syn-peduncular-hallucinosis`;
   §7 — recompute all six disagreeing "Required" counts against the SVGs' `data-structure` sets;
   §2 add a **"Context layer identity"** subsection per DEV-5.
4. **Do not touch:** `src/assets/**` (imaging ≤8 MB / anatomy ≤8 MB budgets), `taxonomy.json`,
   `plates.json`, `plates/*.svg`, `levels.json`.

**Gates / evidence:** `npm run validate` → **0 errors AND 0 warnings** · `npm run check` exit 0 · files:
`src/data/structures/tracts.json`, `src/data/syndromes/hindbrain.json`, `docs/CONTENT_INVENTORY.md`.

**Risks flagged:** (a) authoring against a copy-pasted neighbour risks *duplicate display names* and
*colour drift* — the validator warns on both (`validate-data.mjs:289`, `:385`) and warnings count against you;
(b) do not invent ids outside `taxonomy.json` — every `structures[]`/`syndrome` reference must resolve;
(c) keep every authored `levelId`/`levels[]` entry inside the existing 13 anchors.

---

### 4.4 `p1-identity` — builder · P1 context identity + tract visibility (corrected)

**Spec:** `docs/QUALITY_PLAN.md` §2 item 8 · `docs/AUDIT_REPORT.md` §2.10/§2.11.
**This task is substantially re-scoped by this review — read §1.2 and §1.3 before starting.**

**writes (exclusive):**
`src/data/taxonomy.json` · `src/data/structures/context.json` (new) · `src/components/viewer3d/SceneLayers.tsx` ·
`src/components/viewer3d/NucleusMesh.tsx`

**DEV-6 (the biggest deviation, detail 1):** the proposal's "map every registered context id onto the mesh
slug it represents" is **impossible as literally specified** — no registered id equals any `ctx-*` mesh slug,
and 6 of the 10 rendered silhouettes are *already* owned by an existing record (see the §1.2 table). Do this
instead:

1. **Register the 4 silhouettes that genuinely lack an owner.** Add **4** `kind: 'context'` records to
   `taxonomy.json` — `ctx-midbrain-surface`, `ctx-pons-surface`, `ctx-medulla-surface`, `ctx-pineal` — per
   `docs/DATA_CONTRACT.md` and the existing conventions (region, subdivision, laterality, colour `#94a3b8`,
   optional synonyms/parent), plus the matching minimal authored record for each in the new
   `src/data/structures/context.json` (see the validator's structure contract `validate-data.mjs:396-419`).
   Reuse the `contextNote` convention already used by `ctx-thalamus-envelope` / `ctx-hypothalamus-envelope`
   (`taxonomy.json`) so the registry explains that these are envelopes, not nuclei, and cross-link
   `nuc-pineal-gland` from `ctx-pineal`. **The 7 remaining registered context ids must NOT get a mesh** — they
   are plate-2D/derivation-only by design; that is what the `CONTENT_INVENTORY.md` mapping table documents.
2. **Make the silhouettes selectable (this is the user-visible fix).**
   `SceneLayers.tsx:153` — remove `raycast={() => null}` from `EnvelopeSlotMesh` and wire
   `onPointerDown`/`onPointerOver`/`onPointerOut` to `selectStructure(slot.id, { tab: null })` /
   `setHovered(slot.id)` / `setHovered(null)`, exactly mirroring `NucleusMesh.tsx:148-164`.
   `NucleusMesh.tsx:95-97` — the comment says "envelopes non-pickable", so **change the comment too**, and
   make `pickable` true for `kind: 'context'`; keep context records out of the explode path (they already are:
   explode only applies to `kind === 'nucleus'`, `NucleusMesh.tsx:116-122`).
   **Regression risk is the whole point of this item:** the 71 nucleus meshes must still win the click.
   Verify by hand that (a) clicking a nucleus selects the nucleus, never the envelope behind it; (b) hovering
   the pons surface selects `ctx-pons-surface`; (c) `onPointerMissed` deselect still works.
   If (and only if) envelope picking measurably breaks nucleus picking, fall back to picking envelopes only
   when no nucleus is hit (a second raycast pass), and document the fallback.
3. **Invisible tracts — corrected scope.** All 19 tract records already render as tubes and already carry full
   path data (**VERIFIED**). So: *prove* it, do not author geometry. Use the runtime debug hook or a small
   read-only script to report, for a default-layers scene, the number of `TractTube` meshes present vs 19 and
   confirm each is hit-testable. Report the **final count pairing**: `19/19 tract records rendering`,
   `0 tract records without waypoints`, `8 tract records with no plate label (2D-only gap, recorded)`,
   and `17 taxonomy tract ids with no tract record (pre-existing registry stubs, out of scope — record, do not
   author)`. Do **not** add taxonomy entries for those 17: the task's own constraint (d) and the validator's
   id-integrity checks make that an unnecessary risk.
4. **Gates:** `npm run validate` 0/0 · `npm run check` 0 · `npm run build` 0. Also report the final
   pairing: taxonomy entries ↔ rendered meshes (`84 manifest parts`, `137 registry entries`, how many have a
   GLB, how many are envelope-fallback only).

**DEV-7:** `scripts/anatomy-recipes/**` and `src/assets/anatomy/**` are **removed from this task's scope** —
no new geometry is needed (DEV-6 item 3), and the anatomy payload is at 7.45 MB of an 8 MB budget (rule R8).
If you believe a new GLB is genuinely required, stop and report; do not bake.

**Gates / evidence:** `npm run validate` 0/0 · `npm run check` exit 0 · `npm run build` exit 0 · files:
`src/data/taxonomy.json`, `src/data/structures/context.json`, `src/components/viewer3d/SceneLayers.tsx`.

**Risks flagged:** (a) adding taxonomy ids changes `counts.taxonomy` — `CONTENT_INVENTORY.md` §2's "137 entries"
line becomes stale; that is expected and is `integration-v6`'s reconciliation step; (b) hover on a large
translucent silhouette fires constantly — debounce via `stopPropagation()` exactly as `NucleusMesh` does;
(c) `verify:audit` has an accessible-name check over the whole AX tree (`audit.mjs` §H) — new focusable
nothing here, but new *named* 3D labels must not break it.

---

### 4.5 `p1-photofit` — builder · P1 measured photo registration (`fit.dy`)

**Spec:** `docs/QUALITY_PLAN.md` §2 item 6 · `docs/AUDIT_REPORT.md` §2.6.

**writes (exclusive):** `src/data/sectionImages.ts` (+ scratch under `.plate-scratch/`, gitignored)

**DEV-8 (detail 1, corrected):** the audit says "46 fitted entries". **VERIFIED actual: 24 fitted entries
carry `fit`, all with `dy: 0`** — 9 from `ubcNotes` (`sectionImages.ts:619`) and 15 from
`ubcCoronalNotes` (`:643`) — plus the 22 VHP entries (`:711-1026`), which also carry `dy: 0` and a documented
`VHP_PLANE_NOTE` with ±10 au plane uncertainty and a measured `mirrorX` note (`sectionImages.ts:281-322`).
Target the **programmatically generated** entries (the four `.map()` builders at `:558`, `:577`, `:595`, `:624`),
not a hand-written list of 46.

**Deliverables**

1. **Scratch measurement script** under `.plate-scratch/` (never committed): for each `sectionImages` entry with
   a `planeValue`, extract the photograph's tissue silhouette (dark background → threshold → largest connected
   component bbox/centroid) and compare it to the envelope cross-section at that plane. For the cross-section,
   reuse the contour extraction from `scripts/verify/section-pipeline.mjs:110-128`
   (`boundsMayCut` + `extractContours` from `src/components/section/contours.ts`, which Node imports fine) over
   the GLBs in `src/assets/anatomy`. Solve `dy` by a 1-D search (bbox-centre or row-profile correlation) and
   report the residual in au.
2. **Update `src/data/sectionImages.ts`:** store the **measured** `fit.dy`; do **not** change `fit.dx`
   (QUALITY_PLAN §2 item 6 is explicit) or `fit.scale`; keep every credit/licence field untouched.
   Add `registration: { dyAu, residualAu, method }` to each measured entry. Entries that cannot be measured
   keep the documented default **and** carry `registration: { method: 'unmeasured-default' }` — do not pretend.
3. **`mirrorX`: record, do not decide.** The orientation rule is owned by `p1-planededup`
   (`planeGeometry.mirrorX(axis)`), which lands **after** this task starts. Keep the existing `mirrorX` values
   and mark them `mirrorX: 'pending-planeGeometry'` in the new `registration` field, so there is no second
   source of truth and no serialization between the two tasks. If the module does happen to exist by the time
   you finish, consume `mirrorX(axis)` and say so.
4. **Report the residual distribution** (median/max/n) and list every entry whose residual exceeds **3 au** as a
   known limitation.

**Gates / evidence:** `npm run validate` 0/0 · `npm run check` exit 0 · `npm run build` exit 0 ·
`npm run verify:pipeline` PASS · file: `src/data/sectionImages.ts`.

**Risks flagged:** (a) the VHP entries have a **±10 au** plane uncertainty (their own note says so) — a
measured `dy` for a ±10 au plane is not a measurement of anything better than ±10 au; say that, do not hide it;
(b) do not spend the imaging budget — no new image files (rule R8); (c) `imageLayers.ts` (owned by
`p1-planededup`) consumes `fit.dy`; if the sign convention is ambiguous, document it in the file header.

---

### 4.6 `p2-perf` — builder · P2 canvas / PiP / volume / build

**Spec:** `docs/QUALITY_PLAN.md` §3 items 9–12 · `docs/AUDIT_REPORT.md` §2.13–2.16.

**blockedBy: `p1-planededup`** (shared god-files + `package.json`).

**writes (exclusive):**
`src/components/section/SectionCanvas.tsx` · `src/components/section/imageLayers.ts` ·
`src/components/viewer3d/TractTube.tsx` · `src/components/viewer3d/SectionPiP.tsx` ·
`vite.config.ts` · `package.json` · `package-lock.json`

**DEV-9 (detail 4, resolved — see §1.5):** `minify: 'esbuild'` is a **no-op** in this sandbox and must not be
used. Use `minify: 'terser'` + `terserOptions`; declare `terser` in `devDependencies` and commit the lockfile.
Measured: **726.27 kB → 514.18 kB gzip (−29 %)**. The proposal's "lazy-loading for the anatomy GLBs" item is
already delivered (86 per-GLB `?url` chunks in `dist/assets`); use `manualChunks` for
three/R3F/postprocessing instead, and state the chunk sizes before/after. `package.json`: **merge** — preserve
`verify:plane` (added by `p1-planededup`) and every existing script; add a `terser` devDependency only.

**Deliverables**

1. **Canvas (`SectionCanvas.tsx`).** Memoize on `(plane, axis, layers, selection, syndrome)`: the visible-part
   list (`:848-850`), the layer draw order, and the nearest-level lookup. Replace the pointermove path's
   `SECTION_PARTS.filter().sort()` (`:1185-1187`) with the cached list. Reuse `Path2D` per part when its
   contours did not change. Keep the module's public behaviour byte-identical.
2. **PiP (`SectionPiP.tsx`, `TractTube.tsx`).** Move the 32×32 stencil-parity `readRenderTargetPixels`
   (`SectionPiP.tsx:940-988`) onto an explicit watchdog schedule: the first ~30 stencil frames after a rig or
   plane change, then only on plane change or on a suspicious frame. **Note:** it is already gated behind a
   watchdog, so this is a tightening, not a first implementation — the audit's "per-frame readback" wording is
   imprecise (DEV-10). Consolidate the per-tract `useFrame` callbacks in `TractTube.tsx` into one shared frame
   callback **only if** the pattern allows without touching the striation/selection-pulse behaviour. The
   own-plane parity behaviour from the earlier fix must remain intact.
3. **Volume (`imageLayers.ts`).** Make `sampleGrid` allocation-free (reuse typed arrays; hoist closures out of
   the loop). Bound the slice/contour caches by **bytes** instead of entry counts, and **state the cap you
   chose** in the code and in your report. Keep `pickStainForPlane`/`pickImageForPlane` semantics — by now the
   plane rule lives in `planeGeometry.ts`, so consume it, do not re-implement it.
4. **Build.** See DEV-9. Record before/after gzip in your report and update **only** the acceptance line of
   `docs/QUALITY_PLAN.md` §6 if you touch that file at all (`integration-v6` owns it otherwise — prefer not to
   touch it and report the numbers instead).

**Gates / evidence:** `npm run validate` 0/0 · `npm run check` 0 · `npm run build` 0 ·
`npm run verify:pipeline` PASS · `npm run verify:plane` PASS · dev server + `npm run verify:audit` **0 failures**
(R5) · files: `SectionCanvas.tsx`, `imageLayers.ts`, `vite.config.ts`, `package.json`.

**Risks flagged:** (a) terser adds ~7 s to the build (10.6 s total) — acceptable; (b) memoization keyed too
coarsely will make the section stop repainting on a layer toggle — that is exactly the v1 regression list, so
re-verify the live section by hand after every cache change; (c) pruning `Path2D` reuse can leak GPU/CPU
memory — bound it with the same byte-budget mechanism.

---

### 4.7 `p2-a11y` — builder · P2 accessibility & polish

**Spec:** `docs/QUALITY_PLAN.md` §4 items 13–15 · `docs/AUDIT_REPORT.md` §2.17–2.21.

**blockedBy: `p0-survivability`** (shares `App.tsx` and `ReferencesModal.tsx`).

**writes (exclusive):**
`src/components/PlateRenderer.tsx` · `src/components/ReferencesModal.tsx` · `src/components/SearchBox.tsx` ·
`src/App.tsx` · `src/styles/layout.css` · `src/styles/viewer.css` · `src/styles/sectionPip.css` ·
`src/styles/plates.css` · `index.html` · `public/favicon.svg` (new)

**DEV-11 (detail 1, corrected + upgrade-to-blocker):** `PlateRenderer.tsx` renders
`<div className="plate-root" role="img" aria-label=…>` with `dangerouslySetInnerHTML` (`:130-138`). `role="img"`
makes the whole injected SVG subtree an **atom** in the accessibility tree — the regions you are about to make
focusable would be invisible to assistive technology even if they are in the tab order. So the **first** change
is to drop `role="img"` from the root and replace it with a real accessible structure: keep a single
programmatic label via `aria-label` on a `<figure>`-like wrapper **or** move the name onto the SVG, add
`role="group"`/`aria-label` for the plate, and give each `[data-structure]` region its own name.
Without this, the whole task's headline deliverable is cosmetically true and functionally false.
Additional verified detail: the region nodes are created by `wireRegions()` **after** injection
(`PlateRenderer.tsx:25-70`), so `tabindex`/`role`/`aria-label` must be set inside `wireRegions` and the wiring
must survive the `[raw]`-keyed `useLayoutEffect`. Do not regenerate the SVGs (they belong to `p1-content`'s
doc-reconciliation evidence, not to this task).

**Deliverables**

1. **Keyboard-reachable plate regions.** `role="button"`, `aria-label` = the region's display name (from
   `getTaxonomyEntry(id).name` — already fetched at `PlateRenderer.tsx:33`), roving `tabindex` (one `0`, rest
   `-1`, Arrow/Home/End move within the plate), Enter/Space activate the same
   `selectStructure(id, { tab: 'plates', keepSyndrome: true })` as a click, and a visible focus ring
   (`.plate-region:focus-visible`, styles in `plates.css`). Keep label routing (`.plate-label[data-for]`) and
   the `.is-selected/.is-hovered/.is-highlight/.is-dim` contract identical.
2. **Panel visibility semantics.** `App.tsx:62-66` sets `aria-hidden={!sidebarOpen}` on a container that holds
   focusable children, and `layout.css:348-364` / `:384-401` hide the sidebar and info panel by `transform`
   only, so they stay tabbable. Use `inert` (React 18.3 supports the `inert` attribute as a DOM prop on
   `div`/`aside`; if TS complains, use `{...({ inert: '' } as any)}` sparingly or `hidden` where the design
   allows) and **remove `aria-hidden` from containers that still hold focusable children**. Keep the
   `transform` transitions for the visual animation.
3. **Modal / search / misc.** `ReferencesModal`: focus trap (Tab cycles inside), autofocus the close button or
   the dialog, restore focus to the opener on close, `role="dialog"` + `aria-modal`, `Esc` to close.
   `SearchBox` (`:103` lines, a combobox): `aria-activedescendant` + stable `id` per option + `aria-expanded`/
   `aria-controls`. Favicon: inline SVG data-URI link in `index.html` **or** a committed `public/favicon.svg`
   (`public/` does not exist yet — create it); verify the audit's console-404 noise is gone.
   Responsive PiP: collapse to a labelled tab below ~900 px (`sectionPip.css` + a `matchMedia` in the PiP);
   enlarge `.btn-snap` (~21 px) and `.pip-btn` (~16 px) hit targets to **≥24 px** (`viewer.css`, `sectionPip.css`).
4. **Do not break the audit's AX check.** `scripts/verify/audit.mjs` §H asserts **every interactive node in the
   AX tree has a computed accessible name** (93 nodes at baseline). Report the before/after interactive-node
   count, and if any new node is unnamed the audit fails — name it.

**Gates / evidence:** `npm run validate` 0/0 · `npm run check` 0 · `npm run build` 0 · dev server +
`npm run verify:audit` **0 failures** (R5) · files: `PlateRenderer.tsx`, `App.tsx`, `index.html`,
`public/favicon.svg`.

**Risks flagged:** (a) `inert` + `display:none` interact badly with the existing transitions on some engines —
test at 1500 px, 900 px and 600 px; (b) the plate keyboard path must not swallow the arrow keys used by the
sliders — scope the handler to the plate root; (c) if the audit's interactive-node count changes, that is
expected and must be reported, not suppressed.

---

### 4.8 `integration-v6` — integrator · close the remediation

**Spec:** `docs/QUALITY_PLAN.md` §5 items 16–17, §6 acceptance.

**blockedBy:** every builder task.

**writes (exclusive):**
`src/geometry/curves.ts` · `src/geometry/textures.ts` · `src/geometry/materials.ts` ·
`src/geometry/envelope.ts` · `src/components/section/contours.ts` ·
`src/components/section/imageLayers.ts` · `src/components/viewer3d/Viewer3D.tsx` ·
`src/components/viewer3d/TractTube.tsx` · `src/data/load.ts` · `src/data/webRefs.ts` ·
`src/components/section/SectionSliderBar.tsx` · `src/styles/panels.css` ·
`src/styles/tokens.css` · `src/components/section/SectionCanvas.tsx` ·
`scripts/verify/audit.mjs` · `docs/QUALITY_PLAN.md` · `docs/AUDIT_REPORT.md` · `README.md`
(`src/styles/viewer.css` is **not** here — `p2-a11y` owns it; hand it any orphaned-class list)

**DEV-12:** `package.json` is **not** in this task's scope (three earlier writers, and the file must not be
hand-merged at close-out). If a script entry is genuinely missing, request it in the report and have
`review-qa-v6` (or the orchestrator) apply it. Every other dead-export site above is listed explicitly so no
task runs concurrently with this one.

**Deliverables**

1. **Housekeeping (`AUDIT §2.22`).** Delete the ~15 dead exports, 2 dead CSS classes and 5 dead tokens —
   **except `src/geometry/envelope.ts` itself** (still the v1 per-slot fallback; only its 6 dead exports go).
   Apply `p2-a11y`'s orphaned-CSS list too. Split `SectionCanvas.draw()` into transform / layers / contours /
   overlays helpers and document the split in the file header.
2. **Reconcile `docs/CONTENT_INVENTORY.md` with the final taxonomy** — §2's "137 entries" and the context
   mapping table against `p1-identity`'s 4 new `ctx-*` records (this is the deliberate DEV-5 follow-up).
3. **Full acceptance run** (R5 for the server): `npm run validate` · `npm run check` · `npm run build` ·
   `npm run verify:pipeline` · `npm run verify:plane` · `npm run verify:acceptance` ·
   `npm run verify:audit` — all green, audit **0 failures**.
4. **Demonstrate the P0 fixes** by extending `scripts/verify/audit.mjs` (preferred — they are permanent value):
   (a) forced throw inside one wrapped panel, confirm the boundary card appears and the rest of the app is still
   usable (assert a known-good element is still present and interactive), then un-throw;
   (b) `WEBGL_lose_context`: `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`,
   assert the recovery overlay appears, then `restoreContext()` and assert the canvas repaints
   (reuse `pagePixelStats()` at `audit.mjs:150-174`).
   **Critical sequencing:** §K (`audit.mjs:~508-525`) fails the run on any page exception/console error, so both
   demos must be inserted **before** §K and must fully clean up (no lingering overlay, boundary remounted,
   no forced error state) — otherwise the new checks make the audit fail on its own scaffolding.
5. **Regression:** the R9 v1–v5 checklist by hand in the browser, plus keyboard plate selection once
   `p2-a11y` lands.
6. **Commit:** `git add -A && git commit -m 'fix: audit P0-P2 remediation — context-loss recovery, error
   boundaries, loader timeouts, plane-transform dedup, measured photo fit, content gaps, perf, a11y'`.
   Before committing, verify `git status` shows **no** scratch artefacts (`.dsh-scratch/`, `.plate-scratch/`,
   `assets-src/`, `.bp3d-probe/` are ignored — R10) and include the untracked `docs/QUALITY_PLAN.md` (it is the
   run's spec and is currently untracked).
7. **Record the corrections** from §1.1/§1.5 as a short "Audit report errata" block appended to
   `docs/AUDIT_REPORT.md` (the report is the historical record; errata beats silent rewriting).

**Final message must contain:** the gate table, the audit result, both P0 demonstrations with evidence, perf
deltas (gzip before/after, cache caps), and the commit hash.

---

### 4.9 `review-qa-v6` — reviewer · independent QA of the remediation

**Spec:** `docs/QUALITY_PLAN.md` §6.

**blockedBy: `integration-v6`.** **writes:** the whole repo, **conservative fixes only** (see R3/R11).

**R11 — reviewer discipline:** fix only what a *failed gate* or a *demonstrated defect* requires, keep each fix
minimal, and list every file you touched in the final report. Do not redesign, re-scope, or "tidy".

**Checks**

1. **P0.** Read the context-loss and boundary code and confirm the failure modes are actually contained:
   a throw in **each** wrapped surface; a lost context recovers. Confirm loaders time out to a **visible** state
   with a retry affordance and that **no banner can hang forever**. Adversarially: does the timeout actually
   fire (a 15 s constant with no timer is a lie)? Does `preventDefault()` get called?
2. **P1.** `grep` for leftover private copies of `AXIS_PAIR` / `nearestLevelTo` / `axisExtents` /
   `photoForPlane` — zero expected. **Make `verify:plane` fail on purpose** (mutate a constant in a scratch copy,
   prove non-zero exit, revert) — the audit already found one gate that could not fail, so a gate you did not
   see fail is unproven. Confirm the badge/orientation table is derived from geometry (no hard-coded string).
   Check the measured `fit.dy` distribution and that unmeasured entries say so. Content: **0 records without
   clinical content**, `syn-one-and-a-half` present and resolving, `CONTENT_INVENTORY.md` counts equal to the
   data. Identity: every rendered silhouette selectable **and** nuclei still win the click; the 19 tract tubes
   render (report the corrected count pairing, incl. the 17 registry-only tract ids as a documented limitation).
3. **P2.** Spot-check the hot paths (nothing allocates/sorts per frame or per pointermove; caches are
   byte-bounded and the cap is stated). Build gzip materially reduced (expect ≈514 kB) **or** documented.
   Drive the plate regions with **CDP keyboard events only** (`Input.dispatchKeyEvent`, as `audit.mjs` §I does
   at `:480-497`) — a programmatic `.click()` proves nothing about keyboard operability.
   Confirm hidden panels are not tabbable (Tab walk).
4. **Gates.** validate / check / build / verify:pipeline / verify:plane / verify:acceptance / verify:audit all
   green **after** your edits.
5. **Regression.** The full v1–v5 checklist.
6. **Hygiene.** Strays cleaned; `assets-src/`, `.bp3d-probe/`, `.plate-scratch/`, `.dsh-scratch/` gitignored
   and uncommitted.

**Final message:** verdict + per-item results + **any gate that turned out not to bite** + honest limitations.

---

## 5. Deviation list (proposal → this plan)

| # | Proposal | This plan | Why |
| --- | --- | --- | --- |
| D1 | `p0-survivability` writes `SectionCanvas.tsx`, `imageLayers.ts`, `SectionPiP.tsx` | **all three removed**, plus `PlatesTab.tsx` | up to three concurrent writers on two 1 300-line god-files; the loader state lives in `sectionAssets.ts`/`anatomyAssets.ts`, which it still owns |
| D2 | `p2-perf` runs in parallel with `p1-planededup` | **`p2-perf` blockedBy `p1-planededup`** | five shared files incl. `package.json` |
| D3 | `p2-a11y` blockedBy `p0-survivability` "if the boundary work has not landed yet, wait" | **hard edge, kept** | `App.tsx` + `ReferencesModal.tsx` are shared |
| D4 | `p1-content` writes `waypoints`/`tubeRadius`/`color`/`levels` for 8 tracts | **WITHDRAWN** | all 19 tracts already have complete, in-bounds path data (VERIFIED) |
| D5 | "11 records ship `clinical: []`" | **11 records ship no `clinical` field** | `clinical: []` occurs 0 times; same 11 ids, so same work |
| D6 | `p1-identity` "map each registered context id to its mesh slug" | **4 new `ctx-*` records + make silhouettes pickable** | no id/slug equality exists; 6 of the 10 silhouettes are already owned; the real defect is `raycast={()=>null}` + `pickable = kind !== 'context'` |
| D7 | `p1-identity` writes 7 region JSON files | **new `src/data/structures/context.json` + `taxonomy.json`** | removes the last overlap with `p1-content` |
| D8 | `p1-identity` bakes GLBs / edits `scripts/anatomy-recipes/` | **removed** | no new geometry needed; payload budget is 7.45/8 MB |
| D9 | `p1-photofit` "46 fitted entries" | **24 generated fitted entries + 22 VHP** | grep of `dy:` in `sectionImages.ts` |
| D10 | `p1-photofit` confirms `mirrorX` against the orientation table | **records it as pending `planeGeometry`** | avoids a second source of truth and a serialization between two tasks |
| D11 | `p2-perf` "enable minify … verify it builds" | **`minify:'terser'` mandated; `minify:'esbuild'` forbidden** | measured: the shim's esbuild minify is a silent no-op (3 267.43 kB unchanged); terser works (1 969.13 kB / 514.18 kB gzip) |
| D12 | `p2-perf` "lazy-loading for the anatomy GLBs" | **already delivered**; use `manualChunks` instead | 86 per-GLB `?url` chunks + 7.39 MB `.glb` already outside the JS entry |
| D13 | `p2-a11y` "make each region focusable … keep `role="img"`" | **drop `role="img"` first** | `role="img"` makes the injected subtree an AX atom — the fix would be a no-op for assistive tech |
| D14 | `integration-v6` writes `package.json`, `App.tsx` | **removed** from its scope | three earlier writers; dev-11/dev-12 |
| D15 | `p2-perf` writes `src/styles/**` (via PiP CSS mentions) | **`p2-a11y` owns all CSS**; `p2-perf` hands over an orphan list | single writer per file; `integration-v6` applies the same rule for `viewer.css` |
| D16 | audit's "37 checks" / "672 KB gzip" / "23 syndromes" | **~46 assertion sites / 726.27 kB gzip / 24 syndromes** | re-baselined; errata block in `integration-v6` |
| D17 | `integration-v6` "fix breaks" | unchanged, but it must **not** weaken gates (R2) | housekeeping ≠ loosening |
| D18 | — (new) | **`terser` becomes a declared devDependency + locked** | `package-lock.json` has no `terser` entry; reproducibility |
| D19 | — (new) | **`docs/QUALITY_PLAN.md` is untracked and must be committed** | it is the run's authoritative spec |

**Explicitly out of scope for this run (record, do not do):**

* the **17 taxonomy tract ids with no tract record** (`tract-pyramid`, `tract-scp`, `tract-mcp`, `tract-icp`,
  `tract-medial-lemniscus`, …) — 2D-label-only today; authoring them is a content-run decision;
* making `X/84` a hard assertion somewhere — the launch timeout is the fix, not a longer wait;
* extending `levels.json` / the canonical bounds (rule R7 — a later run owns that);
* any change to `scripts/validate-data.mjs` (all tasks) — the validator is the immutable referee.

---

## 6. Risk register (run-level)

| Risk | Impact | Mitigation |
| --- | --- | --- |
| God-file refactor regresses the live section | High — it is the app's centrepiece | `p1-planededup` owns the files outright (D1/D2); pixel/sample-count checks in `verify:audit` (`sectionStats`, 469–5 518 samples) are the tripwire; `integration-v6` re-runs the R9 list |
| The P0 loader/boundary work depends on hand-offs into files this task cannot touch | Medium — a P0 item could land half-wired | the hand-off payloads are explicit (banner text; PiP context-loss recipe; the boundary wrap); `integration-v6` step 4(a)/(b) proves both at runtime before the commit |
| `p2-perf` memoization keyed too coarsely | High — section stops repainting | key on `(plane, axis, layers, selection, syndrome)` exactly as QUALITY_PLAN §3 item 9 says; hand-verify every layer toggle after each cache change |
| Envelope picking steals nucleus clicks | High — 71 selections become unreliable | `p1-identity` DEV-6 item 2 defines the fallback (second raycast pass) and the manual proof |
| Terser build breaks on a future dependency | Medium | measured working (10.6 s); keep `minify` a single-line change and document it in `vite.config.ts` |
| Node cannot import the new plane module | Medium — the new gate would be untestable | rule R4 (no JSON/asset imports in `planeGeometry.ts`; pass `levels` in) |
| New audit demos fail their own console-hygiene check | Medium — audit goes red on scaffolding | demos inserted **before** §K with full cleanup (integration step 4) |
| Content authoring trips a validator **warning** | Medium — warnings count | `p1-content` runs `npm run validate` after every file, not once at the end |
| Two tasks start a dev server at once | Medium | rule R5: one server, one owner, always stopped |
| Imaging/anatomy budget creep | Low | rule R8; `p1-identity` bakes nothing (D8) |

---

## 7. Acceptance for the whole run (mirrors QUALITY_PLAN §6, corrected)

* `npm run validate` (0 errors / **0 warnings**) · `check` · `build` · `verify:pipeline` · **`verify:plane`** ·
  `verify:acceptance` · `verify:audit` — all green, audit **0 failures**.
* A forced throw inside a wrapped panel leaves the rest of the app usable (demonstrated, then reverted).
* Simulated `WEBGL_lose_context` loss shows the recovery overlay and restores a working canvas.
* Canvas and PiP place an anchored photograph at the same position/size, proven by `verify:plane`, **and
  `verify:plane` is itself proven to fail when mutated**.
* **0 records without clinical content** (11 authored from nothing, plus 15 second items); `syn-one-and-a-half`
  present and resolving; `CONTENT_INVENTORY.md` counts equal the data (24 → 25 syndromes, 42/24/34/32 registry).
* Every rendered silhouette is selectable **and nuclei still win the click**; all 19 tract tubes render
  (the 8 plate-label-less records and the 17 registry-only tract ids are recorded as known limitations).
* Build gzip materially below the **726.27 kB** baseline — target ≈**514 kB** (measured with terser), or a
  documented reason it cannot be.
* Plate regions operable by keyboard alone (driven via CDP keyboard events).
* Committed imaging payload ≤ 8 MB (7.30 MB) and anatomy payload ≤ 8 MB (7.45 MB) — unchanged.
