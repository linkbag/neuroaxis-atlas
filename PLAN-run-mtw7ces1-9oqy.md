# PLAN — run `mtw7ces1-9oqy` (swarm run id `run-mtw7ces2-v4wt`): NeuroAxis v7 relief — complete the bake, wire the telencephalon, verify

Refined plan for the relief run. Repo `D:\Startup projects\3DNeuroanatamoy`.
Authoritative specs: `docs/TELENCEPHALON_PLAN.md` (§2 AMENDMENT B, §3 data model, §4 geometry/budgets, §5 rendering/UX, §6 plates, §8 risks, §9 acceptance), `docs/QUALITY_PLAN.md`, `docs/SECTION_SYNC_PLAN.md §2`, `docs/AUDIT_REPORT.md` (background only).

Proposed task ids are **kept** (`v7b-integration`, `v7b-qa`) — this is a refinement, not a re-plan. **D1** and everything in §8 are deviations from the dispatched proposal.

---

## 0. What this review actually verified (measurements, not assumptions)

Every number below was produced in this session against the live tree. The bake was **still running** while I measured (§1), so treat counts as a timestamped snapshot, not as constants to copy into a final message.

| Check | Command / method | Result |
| --- | --- | --- |
| Data gate | `npm run validate` | **PASS 0 errors / 0 warnings** · levels 17 · taxonomy 183 entries · structures 11 files / 160 records · tracts 23 · plates 15 records / 15 SVGs |
| Types | `npm run check` | **exit 0** |
| Section pipeline | `npm run verify:pipeline` | **PASS** — `92/92 parts · 575,744 triangles` at 17:16; 8 planes; 0 problems |
| Plane transform | `npm run verify:plane` | **PASS** — `17 anchors · 10,827 assertions` (`nearestLevelTo`/`snapClipWrite` agree with levels.json) |
| Anatomy budget gate | `node scripts/build-anatomy-geometry.mjs --manifest` | **RED** (see §2 C7/C8) — per-part nucleus cap already exceeded by `ctx-caudate-l`/`-r` |
| Imaging gate A | `node scripts/verify-imaging-v4.mjs` | **FAIL exit 1** — `imaging payload 8.71 MiB exceeds the 8 MiB plan §4 cap` |
| Imaging gate B | `node scripts/verify-imaging-v4b.mjs` | **FAIL exit 1** — `src/assets/imaging/** is 8.71 MiB in 80 files — over the 8 MiB cap` |
| Browser gates | `npm run verify:audit` / `verify:acceptance` | **not runnable here** — headless Chrome cannot start (§2 C12). Two attempts: exit 21 `crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)`, then a silent kill with no output |
| Existing assets unchanged | `git diff --name-only HEAD -- src/assets/` | **only `src/assets/anatomy/anatomy-manifest.json`** → no pre-existing GLB and no imaging byte has moved. This is the strongest available "nothing below +45 moved" evidence |
| Manifest snapshot | node read at 2026-09-11T00:21Z | 94 parts · 581,296 tris / 800,000 · GLB 14,017,608 B (13.37 MiB) / 14 MiB · nucleus bytes 2,441,544 B (2.33 MiB) / 2.5 MiB · **12 tel parts still unbaked** |
| Tel family completeness | `scripts/anatomy-recipes/lib/tel-budget.mjs` `TEL_SLUGS` (22 slugs) vs manifest | **10 / 22 present**; missing: `ctx-putamen-r`, `ctx-globus-pallidus-l/-r`, `ctx-hippocampus-l/-r`, `ctx-amygdala-l/-r`, `ctx-fornix-l/-r`, `ctx-fornix-commissure`, `ctx-choroid-plexus-l/-r` |
| Tel content | 5 files under `src/data/structures/telencephalon-*.json` | **38 records** (cortex 10 · basal ganglia 7 · limbic 6 · ventricles 7 · white matter 8), 46 tel taxonomy entries, 4 authored tracts (optic radiation, cingulum, uncinate, SLF) |
| Plates | `src/data/plates.json` | **15 plates**, 3 tel ones: `plate-tel-axial-58` (transverse → `lvl-tel-basal-ganglia`, 19 regions), `plate-tel-sagittal-hemisphere` (25), `plate-tel-coronal-fornix` (25) |
| Ghost/space wiring | `src/components/viewer3d/clipPlanes.ts` + consumers | `CLIP_BOUNDS = x ±48, y −55..85, z −75..55` is the single declaration; `ClipControls`, `SectionSliderBar`, `planeGeometry`, `SectionPiP` all derive from it; `ALL_REGIONS` already contains `telencephalon` |
| Slug wiring | `SceneLayers.tsx` / `NucleusMesh.tsx` / `anatomyAssets.ts` / `sectionAssets.ts` | **GAP** — `partBySlug` is an exact map and `SceneLayers` passes `anatomySlug={record.id}`; there is **no alias layer** (§2 C9) |
| Record placement | 38 tel records | **6 have** `origin3d`+`size3d` (surf-planum-temporale, nuc-ventral-striatum, nuc-dentate-gyrus, tract-fimbria, vent-interventricular-foramen, tract-corona-radiata); **32 have neither** (§2 C10) |
| Chrome process evidence | `Get-Process chrome` | Many long-lived Chrome processes exist from earlier (non-sandboxed) sessions — so the browser lane is **uncertain, not impossible**: attempt it, never assume it |

I did **not** run `npm run build` (writes `dist/`, and it is meaningless while the bake is in flight) — the objective states exit 0 on the pre-relief tree, and step 9 of the integration brief re-runs it.
I edited **no** repository file: this plan file is the only artifact of this task.

---

## 1. Live concurrency finding — the integrator MUST gate on it

`swarm_status` shows the **original run `run-mtw0wuua-38ru` is still running**: `tel-geometry [running]`, `tel-plates [running]` (its `integration-v7`/`review-qa-v7` are permanently blocked and are superseded by this relief run).

Observed directly:

- `anatomy-manifest.json` advanced **89 → 91 → 92 → 94 parts** during this review; GLBs `tel-lateral-ventricle-l` 17:13, `ctx-caudate-l` 17:16, `ctx-caudate-r` 17:18, `ctx-putamen-l` 17:20 (a live `node` process, PID 24192, 45 s CPU at 17:21).
- `plates.json` went 14 → **15** with a third tel plate (`plate-tel-coronal-fornix`) appearing while I measured.
- The proposal's "89 parts / 14 plates / 179 taxonomy entries" are therefore stale by minutes.

**Consequence.** `v7b-integration` owns `scripts/anatomy-recipes/**`, `src/assets/anatomy/**`, `src/data/plates.json` — the exact files those two running builders are still writing. Two concurrent bakes writing the same GLBs and the same manifest produce half-written artifacts and transiently red gates: precisely the mechanism that killed `tel-plates` in the original run ("caught a transient mid-edit `npm run check` failure from a concurrent task").

**Rule (binding, step 0 of the integration brief):** the integrator does not start baking, wiring or committing until the bake is **quiescent** — no `node` process is writing `src/assets/anatomy/`, and `anatomy-manifest.json` plus the GLB set have not changed for ≥ 3 minutes across two checks ≥ 3 minutes apart. If the sibling tasks are still writing, the integrator waits (reports `progress:` each cycle) rather than racing them. If they stop mid-way and leave a part missing, the integrator completes it (single writer from then on).

---

## 2. Corrections to the proposal (C1–C16)

Each correction is a factual finding with its evidence. C7–C12 are the ones that change the shape of the work.

- **C1 — Stale counts.** Manifest 89 → **94 parts and growing**; plates 14 → **15** (three tel plates, not two); taxonomy 179 → **183** entries (46 telencephalon ✓ — this figure was right); tel structure records **38**, not 42 (`10+7+6+7+8` across the five files); total structures 160, tracts 23.
- **C2 — CT coverage number and its exact source.** The objective says "y ≈ +36.7"; the authoritative measured value is **`intensity.sourceCoverage.superiorMostDataYAu = 36.25`** in `src/assets/imaging/ct-manifest.json` (`stationsInsideFov 629,370 / 979,371`, `fractionInsideFov 0.6426`), with the prose in `registration.residuals.coverageNote`: *"its own head apex lands at canonical y ≈ 36.25 au while the atlas cortex vertex is at y = +80.6 au"*. The UI text must read **36.25 from the manifest** — not +36.7, and not a second hard-coded constant.
- **C3 — §9's CT clause is unachievable as written.** `docs/TELENCEPHALON_PLAN.md` line 116 demands "MRI/CT underlays cover the hemispheres at any plane". For CT that is physically impossible (§C2). Restate per modality: **the MRI grid is populated across the whole AMENDMENT B box (`coverage.fractionInsideFov = 1`, 979,371 / 979,371 stations, dims `[81,113,107]`), so MRI has data at y = +58 — the integrator must show it painting there; CT must state its measured coverage limit above y = 36.25** (§10).
- **C4 — Stale README budgets.** README line 123 claims "7.30 MiB across 80 files", "mri-t1.bin (238 KiB) / ct.bin (238 KiB)", "≤ 8 MiB total imaging payload". Measured now: **9,132,531 B = 8.71 MiB / 80 files**, grids **979,371 B each**, dims `[81,113,107]`, box = AMENDMENT B. README's Content scope table is also stale (118 structures / 19 tracts / 137 entries / 13 levels / 12 plates / 24 syndromes vs 160 / 23 / 183 / 17 / 15 / 26).
- **C5 — Two existing gates are already RED and nobody owns them yet.** `scripts/verify-imaging-v4.mjs` (line 529–533, `8 * MIB`) and `scripts/verify-imaging-v4b.mjs` (line 79 `IMAGING_CAP_BYTES`, message at line 471) both exit 1 on today's 8.71 MiB payload. `TELENCEPHALON_PLAN.md` §2/§4 raise the imaging cap to **10 MB**; the gates must be updated to that number with the plan cited, and `node scripts/verify-imaging-v4.mjs` / `verify-imaging-v4b.mjs` must exit 0 afterwards. These two files are **not in the proposal's write scope**.
- **C6 — The proposal's QA evidence method is impossible.** It requires "compare the brainstem/diencephalon canonical OBJs (`assets-src/bp3d/canonical/`) … against git history (`git show HEAD:path`)". **`assets-src/` is gitignored** (`.gitignore`, "External anatomy downloads … `assets-src/`"), so `git show HEAD:assets-src/...` fails — a directory/gitignored-path evidence defect of exactly the class that failed `tel-content`. Replacement method (stronger and cheap): `git diff --stat HEAD -- src/assets/anatomy src/assets/imaging` must list **only** `anatomy-manifest.json`, and the committed brainstem/diencephalon GLB bytes must be byte-identical to HEAD (git blob hashes). Extend it by parsing bboxes from the **committed** GLBs in `git show HEAD:src/assets/anatomy/<slug>.glb` when a per-part bbox comparison is wanted.
- **C7 — The anatomy budget gate is already failing and will fail harder.** Measured per-part violations right now: `ctx-caudate-l 76,644 B` and `ctx-caudate-r 78,064 B` against the **nucleus per-part cap of 60 KiB** (`scripts/build-anatomy-geometry.mjs` `BUDGETS.partBytes.nucleus = 60 * 1024`). Headroom is thin for the global caps too: payload **647 KiB** to 14 MiB and nucleus total **180 KiB** to 2.5 MiB, with **12 parts (~44k tris ≈ 1.05 MB) still unbaked**. Simply "completing the bake" therefore lands ≈ 15.1 MB (over 14 MiB), nucleus total ≈ 3.4 MiB (over 2.5 MiB), and adds further per-part nucleus breaches (choroid plexus ≈ 4.3k tris ≈ 103 KiB, hippocampus/fornix ≈ 3.2k ≈ 77 KiB, pallidum ≈ 1.9k ≈ 45 KiB). **The proposal's step 7 ("report bytes") plus step 8 ("all green") is not achievable without an explicit reconciliation decision.** §5 step 2 gives the decision rule.
- **C8 — The binding budget definition is the CLI, not a hand count.** `node scripts/build-anatomy-geometry.mjs --manifest` prints and enforces `totalTris 800,000`, `totalBytes 14 MiB`, `partBytes {context 4 MiB, nucleus 60 KiB, ventricle 1.5 MiB}`, `nucleusTotalBytes 2.5 MiB`, and exits 1 on any breach. "Budgets green" must mean **this command exits 0**, with its report pasted. `scripts/build-anatomy-geometry.mjs` is the second file missing from the proposal's write scope.
- **C9 — The slug contract gap is the largest missing work item.** Manifest slugs and taxonomy ids do not agree for the tel family, and nothing maps them:
  - `SceneLayers.tsx` (lines 265–271) passes `anatomySlug={record.id}`; `NucleusMesh` calls `useAnatomyAsset(anatomySlug)`; `anatomyAssets.ts` resolves via an exact `partBySlug` map (line 72) with **no alias and no fuzzy fallback**. So `ctx-caudate-l`, `ctx-putamen-l`, `ctx-hippocampus-*`… are **invisible in 3D** — the records fall back to v1 primitives.
  - `sectionAssets.ts` builds `SECTION_PARTS` from **every** manifest part via `metaFor`, resolving region/colour through `getTaxonomyEntry(slug) ?? getTaxonomyEntry(group)`; without an entry in `GROUP_OVERRIDES` (lines 62–73) the new slugs get `region: null` and no taxonomy colour — so the live section paints them outside every region filter.
  - `src/components/section/sectionAssets.ts` is the **third file missing from the proposal's write scope**.
  Required shape (recommended, so both consumers share one truth): one exported table, e.g. `TEL_SLUG_TO_RECORD: Record<string, { record: string; region: Region; group?: string }>`, consumed by `SceneLayers` (to build `anatomySlug`) and by `sectionAssets.GROUP_OVERRIDES`.
- **C10 — 32 of 38 tel records currently draw a unit sphere at the origin.** `NucleusMesh` falls back to the shared `SphereGeometry(1,24,16)` with `position = origin3d ?? [0,0,0]` and `scale = size3d ?? [1,1,1]`. Measured: only 6 tel records carry `origin3d`+`size3d`; the other 32 (all 8 `surf-*` lobes/gyri, 4 ventricular horns/atrium, 4 corpus-callosum parts, 3 internal-capsule parts, `nuc-caudate-head/body/tail`, `nuc-putamen`, `nuc-globus-pallidus-*`, `nuc-hippocampus`, `nuc-amygdala`, `tract-fornix`, `tract-fornix-commissure`, `vent-lateral-ventricle`, `vent-choroid-plexus-lateral`, `ctx-cerebral-cortex`) render 1-au spheres stacked in the brainstem at default framing — visual clutter **and** a picking hazard at the exact framing §5 makes the default. Resolving this is a first-class deliverable, not polish.
- **C11 — The preset model cannot express §5's presets.** `VIEW_PRESETS` in `store.ts` (lines 334–347) is `{regions, kinds}` only and `viewPresetOf` (line 355) compares exactly those two sets. "Brainstem focus = cortex hidden except a faint outline" and "Deep structures = ghost cortex + basal ganglia/limbic emphasised" are **structure-level** states. Also `PRESET_ORDER` and the buttons live in `src/components/Header.tsx` (line 10) — **the fourth file missing from the proposal's write scope**. Minimal shape: add one optional field to `AtlasLayers` (e.g. `hidden: ReadonlySet<string>` — or `emphasis` if "emphasised" is to be literal), honour it in `SceneLayers`' `visibleStructures`/`visibleTracts` filter, teach `viewPresetOf` to compare it, and extend `Header.PRESET_ORDER`. Persist with the existing schema-versioned `neuroaxis.*` pattern (`store.ts` lines 214–263 / 475–524); old stored records must keep restoring their own values.
- **C12 — The browser lane is not assured.** Headless Chrome failed twice in this sandbox (§0). The repo already anticipated this: `scripts/verify/a11y-contract.mjs`'s header says the runtime audit "needs headless Chrome, which cannot start in some restricted sandboxes (mojo platform_channel: access denied). Where that applies, this script is the strongest available proof." Therefore: **`verify:audit`/`verify:acceptance`/`verify:browser` are best-effort, never assumed, and never an evidence-contract command.** Acceptance must be provable node-only (§5 step 9).
- **C13 — `git add -A` is unsafe here.** The working tree already mixes v6 and v7 edits (`git status` shows `src/components/section/planeGeometry.ts`, `ClipSliderBar`/`ClipControls.tsx`, `NucleusMesh.tsx`, `clipPlanes.ts`, `plane-transform.mjs`, the v6 structure files, plus all the v7 additions), and the v6 run's `integration-v6` may still commit. `git add -A` would fold another run's in-flight work into this commit under a v7 message. Stage **explicit paths** after reading `git status --porcelain`, and say so in the final message.
- **C14 — Write scopes are too narrow in the proposal and too broad in QA.** Integration gains `src/components/Header.tsx`, `src/components/section/sectionAssets.ts`, `scripts/build-anatomy-geometry.mjs`, `scripts/verify-imaging-v4.mjs`, `scripts/verify-imaging-v4b.mjs`, `scripts/verify/section-pipeline.mjs`. QA's blanket "`src/`, `scripts/`, `docs/`, `README.md`" is narrowed to the verification harnesses + `docs/QA_CHANGELOG.md` + justification per edit (§6).
- **C15 — `--all` is a repair hazard.** `DEGRADABLE_REGISTRIES` only tolerates `nuclei.mjs`; a load-time failure inside `tel-parts.mjs` **aborts the whole CLI**, so a broken tel recipe would block re-baking the brainstem too. Fix the recipe first (or bake `--part <slug>`), and only then `--all`.
- **C16 — Evidence-contract hygiene (the failure that caused this run).** Never list a directory; `src/data/structures/` poisoned `tel-content`. Every evidence file below is a real, non-empty regular file. Never list a command that depends on the dev server or Chrome.

---

## 3. Global rules for both tasks

1. **One writer at a time** on `src/assets/anatomy/**`, `scripts/anatomy-recipes/**`, `src/data/plates.json`. No concurrent bakes; no bake while the sibling run is baking.
2. **Evidence = real files only**, plus commands that provably run in this environment (node/npm, no browser, no dev server). Quote command output verbatim; never paraphrase a gate result.
3. **Re-read before writing** `README.md` and `scripts/verify/audit.mjs`; additive, surgical edits only; never rewrite either from memory (the v6 `integration-v6` task may touch both).
4. **The dev server runs only inside the acceptance step** and is stopped afterwards; check port 5173 is free first; never leave it running.
5. **Nothing below y = +45 moves**; `npm run validate` stays 0/0; the slug contract (`ctx-`, `nuc-`, `tract-`, `vent-`, `surf-`) is frozen; every v1–v6 feature keeps working.
6. **Budgets are machine-checked**: rendered tris ≤ 800k, committed anatomy GLB ≤ 14 MiB, imaging ≤ 10 MB — enforced by `node scripts/build-anatomy-geometry.mjs --manifest` and the two imaging gates, all of which must exit 0.
7. **Honesty over silence**: the CT coverage limit, the derived cortical ribbon, the four authored tracts without meshes, the aliased/excluded record bodies and every raised cap are stated in README + the final message — never tuned away.
8. **Scratch stays out of git**: `assets-src/`, `.bp3d-probe/`, `.plate-scratch/`, `_*` work dirs stay ignored and uncommitted.
9. **`swarm_report`** a note (prefixed `progress:`/`blocker:`/`done:`) at each milestone and at least every ~10 minutes.

---

## 4. The task DAG (unchanged ids, refined scopes)

```
architect-review (this task) ──► v7b-integration (integrator) ──► v7b-qa (reviewer, blockedBy v7b-integration)
```

- **No new tasks and no new edges.** The two workstreams cannot be parallelised on a file basis: integration writes ~14 files that QA must judge *after* they are frozen, and QA's whole value is independence from the integration's own claims. The proposal already had this order — it is confirmed correct.
- **Because the sibling run is still writing (§1), the integration task's *first* deliverable is the quiescence gate, not a bake.** If the bake is still live, the integrator waits and reports; it must not "helpfully" re-bake into the same files.
- Write scopes are disjoint by construction: integration owns production code + data + harnesses; QA owns the verification harnesses it extends, `docs/QA_CHANGELOG.md`, and any repair it justifies. QA runs strictly after integration's commit.

| id | role | needs | writes (exclusive) |
| --- | --- | --- | --- |
| `v7b-integration` | integrator | quiescent bake (§1) | `src/assets/anatomy/**`, `scripts/anatomy-recipes/**`, `scripts/build-anatomy-geometry.mjs`, `src/components/viewer3d/{SceneLayers,Viewer3D,NucleusMesh}.tsx`, `src/components/Header.tsx`, `src/components/{TaxonomyTree,Legend,PlatesTab}.tsx`, `src/components/section/{imageLayers,sectionAssets}.ts(x)`, `src/state/store.ts`, `scripts/verify/{audit.mjs,section-pipeline.mjs}`, `scripts/verify-imaging-v4.mjs`, `scripts/verify-imaging-v4b.mjs`, `README.md` |
| `v7b-qa` | reviewer | `v7b-integration` complete | `scripts/verify/**` (additive), `docs/QA_CHANGELOG.md`, `README.md` (errata only), any repair it justifies in writing |

---

## 5. `v7b-integration` — refined brief

You carry v7 to done. Work the steps **in order**; each one ends with a check.

### Step 0 — preconditions and quiescence gate
- `git status --porcelain` → record the baseline; note that v6 files are dirty and are **not yours** (C13).
- Wait for bake quiescence (§1). Evidence to record: two timestamps ≥ 3 min apart with no change in `anatomy-manifest.json` mtime or GLB set, and no `node` process touching the directory.
- Record the pre-bake snapshot: manifest part count, Σ triCount, GLB bytes, nucleus bytes, which `TEL_SLUGS` are missing.

### Step 1 — complete the bake (single writer)
- Read first: `scripts/build-anatomy-geometry.mjs` (CLI + BUDGETS), `scripts/anatomy-recipes/tel-parts.mjs`, `ctx-hemisphere-l.mjs`, `ctx-hemisphere-r.mjs`, `lib/tel-common.mjs`, `lib/tel-budget.mjs`.
- Complete the 12 missing parts. Prefer `--all` **only after** any recipe-load error is fixed (C15); otherwise `--part <slug>` per missing slug. Every one of the 22 `TEL_SLUGS` must end up in the manifest with a committed GLB.
- Verify each hemisphere shell: tri cap ≤ 90k, watertight, measured cortical thickness inside the 2.5–3.3 au window (the CLI prints the ribbon-check block — paste it).

### Step 2 — budget reconciliation (the step the proposal omitted)
Decision order, applied until `node scripts/build-anatomy-geometry.mjs --manifest` exits 0:
1. **Measure** after the bake: Σ tris, GLB bytes, nucleus bytes, every per-part violation.
2. **Cut resolution before raising caps.** The byte cost is in the two hemisphere shells (`ctx-hemisphere-l` 78,512 tris = 1.88 MB, `-r` 80,080 = 1.92 MB; ≈ 24 B/tri uncompressed) and the two WM cores (20.5k tris ≈ 0.49 MB each, interior context). Raising the voxel `STEP` for the shells to land nearer 55–65k tris each (~0.9 MB saved) and for the WM cores to ~12–14k (~0.35 MB saved) buys the ~1.05 MB the remaining parts need while staying far inside the 800k-tri cap. Re-bake, re-measure.
3. **Only if a cap must move**, move the narrowest one and document why in the same file's comment: `BUDGETS.partBytes.nucleus` (60 KiB was sized for brainstem nuclei; a caudate/choroid-plexus-scale nucleus cannot fit it) and `BUDGETS.nucleusTotalBytes` (2.5 MiB → enough for the tel nuclei). Keep `totalTris = 800_000` and `totalBytes = 14 MiB` untouched — those are the run-level constraints.
4. Report the final table: per-part tris/bytes, Σ tris, Σ bytes, nucleus bytes, every cap with its verdict. **A red gate is not an acceptable final state**; if the constraints genuinely cannot be met, stop and report the exact numbers as a blocker instead of editing the cap to fit.

### Step 3 — wire the geometry (the C9/C10 work)
- Add the shared slug→record table (C9) and consume it from `SceneLayers` (`anatomySlug`) and `sectionAssets.GROUP_OVERRIDES` (region + group). One record per baked part; mirrored left/right share the taxonomy record exactly like `ctx-thalamus-l/r` → `ctx-thalamus-envelope`.
- Add the hemisphere shells to the envelope pass as the **ghost**: slots keyed to `ctx-cerebral-cortex` with slugs `ctx-hemisphere-l`/`-r`, opacity ≈ 0.12–0.18, `depthWrite:false`, `renderOrder:-1`, so the brainstem stays visible through them (§5 line 72). Corpus callosum / WM cores / ventricles / basal-ganglia parts take material hints from the manifest (`white-matter`, `context`, `csf`, `nucleus`) via the central factory — no ad-hoc materials.
- **Kill the origin clutter:** for every tel record that neither owns a baked GLB nor has `origin3d`/`size3d` (C10 list), either give it an authored placement **measured from a canonical source where one exists** (`tel-insula-l/r`, `tel-occipital-lobe-l/r`, `tel-cingulate-gyrus-l/r`, `tel-internal-capsule-l/r`, `tel-wm-telencephalon-extra` exist under `assets-src/bp3d/canonical/` and are otherwise unused by the recipes — a small script can print centroid+size) or exclude it from the 3D body pass with a documented, explicit set (the `ENVELOPE_RECORD_IDS` precedent) while keeping it fully selectable from tree/search/plates. What is **not** acceptable: a unit sphere at `[0,0,0]`.
- Check: at default framing no tel mesh sits at the origin; a hemisphere click selects `ctx-cerebral-cortex`; a caudate/putamen/hippocampus/amygdala/ventricle click selects its own record; the section canvas groups the new parts under the telencephalon region.

### Step 4 — ghost default and telencephalon-aware presets (§5, C11)
- Implement the four presets — **Brainstem focus** (cortex hidden except a faint outline), **Deep structures** (ghost cortex + basal ganglia/limbic emphasised), **Whole brain**, **Cortex only** — with the minimal `AtlasLayers` extension and `viewPresetOf` support, `Header.PRESET_ORDER` updated, and the choice persisted like the quality toggle (schema-versioned, back-compatible).
- **Brainstem focus is the default** for a fresh visitor. Existing stored settings keep winning (no silent overrides of a returning user's layers).
- Check: at boot the brainstem/diencephalon is the visual focus, the ghost cortex is readable rather than muddy, and `viewPresetOf` reports the active preset.

### Step 5 — picking, tree, legend, plates, section
- Every new slug selectable from 3D, tree, search and the plates; the tree shows **Telencephalon (cerebral hemispheres)** with its five subdivisions (Cerebral cortex · Basal ganglia · Limbic system · Telencephalic white matter · Lateral ventricles) — `TaxonomyTree` groups by region→subdivision automatically, so this is a data/wiring check, not a rewrite.
- Legend and filters handle the new region plus the existing five with no regression (the legend maps `ALL_REGIONS`).

### Step 6 — explode, clip, levels, CT honesty
- Hemisphere shells separate outward on ±x with a **documented, larger factor** than nuclei; keep the nuclei rule untouched.
- The four new anchors (+48/+58/+68/+78) drive clip, plates, live section and snap-to-plate; verify nothing below +45 changed behaviour (the slider defaults stay the olivary anchor and x/z = 0).
- **CT honesty:** extend the existing axis-aware unavailability path (`section/imageLayers.ts`: `SliceMissReason`, `resolveSliceModality`, the `unavailable` reporting used by canvas/PiP/toolbar) so that above the measured CT limit the toolbar and canvas say plainly that the Visible Human CT series ends at canonical y ≈ 36.25 au and that MRI is the modality of record there. Read the number from `ct-manifest.json` (`registration.coverageNote`, `sourceCoverage.fractionInsideFov`) — do not type a second, drifting constant (C2). No blank canvas, no stale slice, no silent fallback.

### Step 7 — budgets in the existing gates and README (C4/C5)
- Update the imaging cap in `scripts/verify-imaging-v4.mjs` (line 529–533) and `scripts/verify-imaging-v4b.mjs` (line 79 + message line 471) to the AMENDMENT B figure (**10 MB**, `docs/TELENCEPHALON_PLAN.md` §2/§4), citing the plan in the comment, and make both exit 0 with the measured payload printed.
- Add the **Telencephalon (v7)** README section (additive, re-read first): what was added; data source BodyParts3D 4.0 CC BY 4.0 with the existing attribution block; the new bounds (±48 / −55..85 / −75..55) and the four new levels; how to re-bake (register → geometry → grids); measured tris / anatomy GLB bytes / imaging bytes; and the honest limits — derived cortical ribbon, four authored tracts without meshes, CT coverage end at y ≈ 36.25, registration tolerance, which records are content-only.
- Refresh the stale numbers in README's payload and Content scope tables (C4) — additive edits, no rewrite.

### Step 8 — extend the verification harnesses (additive)
- `scripts/verify/section-pipeline.mjs`: add the four tel levels (and one frontal plane, e.g. `z = +40`) to the plane array at lines 89–98 → `npm run verify:pipeline` then **proves the live section paints at y = +58** without a browser. This is the machine evidence for the §9 sectioning item.
- `scripts/verify/audit.mjs`: append a telencephalon check group **before** the summary block, using the existing `ok`/`bad` helpers and existing DOM selectors (region tree nodes, plate chips, the legend, the modality toolbar). Assert at least: the tree shows the telencephalon region; a telencephalon structure is selectable (3D or tree) and the info panel fills; the four new levels exist and are reachable; the live section paints at y = +58; the default preset does not hide the brainstem. Keep it append-only so the v6 run's concurrent edits to this file cannot be clobbered.

### Step 9 — acceptance run (node lane mandatory, browser lane best-effort)
Run, in order, and capture verbatim output:
`npm run validate` · `npm run check` · `npm run build` · `node scripts/build-anatomy-geometry.mjs --manifest` · `npm run verify:pipeline` · `npm run verify:plane` · `node scripts/verify-imaging-v4.mjs` · `node scripts/verify-imaging-v4b.mjs`.
All must exit 0.
Then, **inside a bounded window**: check port 5173 is free, start `npm run dev`, attempt `npm run verify:acceptance` and `npm run verify:audit` (port 5173, headless Chrome), and **stop the server**. If Chrome cannot start (C12), quote the exact error, do **not** claim a browser pass, and state that the node-only lane above is the strongest available evidence for this environment. Note also the pre-existing `verify:plane` observation (degenerate coronal camera basis) rather than "fixing" it silently.

### Step 10 — commit
- Re-read `git status --porcelain`; stage **explicit paths** belonging to this run (C13); inspect `git diff --cached --stat` for foreign v6 edits before committing; do not rewrite `README.md`/`audit.mjs` from memory (§3.3). Commit message: `feat: v7 telencephalon — hemispheres, basal ganglia, limbic, ventricles, extended canonical space`.
- **Final message:** manifest/tri/byte table (per-part tris + bytes, Σ tris, Σ bytes, nucleus bytes, each cap with verdict); the gate list with exit codes and the two imaging gates' printed payloads; the default preset behaviour; the CT-coverage text shown above y ≈ 36.25; commit hash; any cap that moved with its justification; the residual limitations.

---

## 6. `v7b-qa` — refined brief

Independent verification and the final gate. Fix conservatively; **justify every edit in writing** and record it in `docs/QA_CHANGELOG.md`. Your write scope: the verification harnesses you extend, `docs/QA_CHANGELOG.md`, README errata, and any repair you explicitly justify — **not** a blanket `src/`. Do not re-author tel content, plates or recipes.

1. **Space integrity (corrected method — C6).** `git diff --name-only HEAD -- src/assets/` must show **only** `anatomy-manifest.json`. Prove the committed brainstem/diencephalon/cerebellum GLBs are byte-identical to HEAD (`git diff --stat`, or `git show HEAD:<path>` hashes vs disk). Prove the 13 pre-existing level anchors keep their exact y values and that the pre-existing levels' MRI/CT samples are unchanged within a stated tolerance — the imaging re-bake landed in commit `d1cefef`, so diff `716896f` → `d1cefef` for `mri-t1.bin`/`ct.bin` and reproduce a max-|Δ| number. Grep for leftover hard-coded bounds in `src/` and confirm `CLIP_BOUNDS` is still the single declaration.
2. **Geometry sanity.** Ribbon hemispheric (bbox vs WM core), interhemispheric and Sylvian fissures present as concavities (measure a sagittal and an axial profile), lateral ventricles inside the ribbon and non-degenerate, caudate/putamen/pallidum/hippocampus/amygdala plausible against the thalamus and the +58 axial plate. Report per-part tri counts; flag anything under-sampled at hemisphere scale.
3. **Orientation.** Re-verify `SECTION_SYNC_PLAN.md §2` conventions on all three surfaces after the bounds change (canvas, PiP, and the **three** tel plates — including `plate-tel-coronal-fornix`), via `npm run verify:plane` and direct inspection; check the plates' left/right letters against the geometry.
4. **Usability at the DEFAULT preset.** Is the brainstem still the focus? Is the ghost cortex readable, not muddy? Is every new structure selectable (3D/tree/search/plates)? Do the four new levels work with snap-to-plate and the live section? Is the CT limit stated honestly above y ≈ 36.25? Is the origin free of stray placeholder spheres (C10)?
5. **Budgets/gates.** `npm run validate`, `check`, `build`, `node scripts/build-anatomy-geometry.mjs --manifest`, `verify:pipeline`, `verify:plane`, both `verify-imaging-v4*` gates — all exit 0 **after your edits**; report tris / GLB / imaging bytes with the caps beside them. Attempt the browser gates and report the outcome verbatim (C12).
6. **Regression — full v1–v6 checklist.** Selection paths (3D, tree, search, plate, syndrome), layer toggles, clip + snap-to-plate, explode, quality toggle, Learn-more links, PiP (slider-plane fix + restore control), live section in every modality incl. axis-aware Photo disabling, plane sliders, keyboard plate selection, error boundaries, context-loss overlay.
7. **Cleanliness.** Remove strays; confirm `assets-src/`, `.bp3d-probe/`, `.plate-scratch/` are still gitignored and uncommitted; confirm no dev server is left running on 5173.
8. **Verdict** with per-check results and the honest limitations list (ribbon fidelity, unanchored fiber tracts, CT coverage, registration tolerance, any cap that moved).

---

## 7. Evidence contracts (real files only; commands proven runnable here)

**`v7b-integration`**

- files: `src/assets/anatomy/anatomy-manifest.json`, `src/components/viewer3d/SceneLayers.tsx`, `src/state/store.ts`, `src/components/Header.tsx`, `src/components/section/sectionAssets.ts`, `src/data/plates.json`, `README.md`, `scripts/verify/audit.mjs`
- commands: `npm run validate` · `npm run check` · `node scripts/build-anatomy-geometry.mjs --manifest` · `npm run verify:pipeline` · `npm run verify:plane` · `node scripts/verify-imaging-v4.mjs` · `node scripts/verify-imaging-v4b.mjs`

**`v7b-qa`**

- files: `docs/QA_CHANGELOG.md`, `README.md`, `scripts/verify/section-pipeline.mjs`
- commands: `npm run validate` · `npm run check` · `npm run build` · `npm run verify:pipeline` · `npm run verify:plane` · `node scripts/build-anatomy-geometry.mjs --manifest`

Rules: never list a directory (C16); never list a Chrome/dev-server command as a contract item (C12); if a contract file is renamed by a justified repair, update the contract in the same task and say so.

---

## 8. Deviations from the proposal (D1–D12)

- **D1** — Added the **quiescence precondition** (§1): the original run's `tel-geometry`/`tel-plates` are still writing the integrator's own files. The proposal assumed the bake was merely "in flight when this run starts"; it is in flight **now**, concurrently.
- **D2** — Corrected every stale count (89 → 94+ parts, 14 → 15 plates with a **third** tel plate, 179 → 183 taxonomy entries, 42 → 38 tel records) and required measurement at the end instead of copying numbers into the final message (C1).
- **D3** — Replaced the impossible QA evidence method (gitignored `assets-src/` vs `git show`) with the git-tracked-asset diff method (C6).
- **D4** — Corrected the CT number to the manifest's measured **y ≈ 36.25 au** and made the manifest the single source of the UI text (C2).
- **D5** — Restated §9's imaging clause per modality: MRI must paint at y = +58; CT must state its limit (C3).
- **D6** — Added a **budget reconciliation decision rule** with an explicit order (cut resolution → narrowest documented cap raise) and made `--manifest` exit 0 the definition of "budgets green"; a red gate is a blocker, not a footnote (C7/C8).
- **D7** — Added the missing write scopes: `Header.tsx`, `section/sectionAssets.ts`, `scripts/build-anatomy-geometry.mjs`, both `verify-imaging-v4*` gates, `scripts/verify/section-pipeline.mjs` (C5/C8/C9/C11/C14).
- **D8** — Added the **slug-alias work item** and the **no-stray-origin-body rule** as first-class deliverables with their own checks (C9/C10) — without them the baked telencephalon is invisible in 3D and cluttered at the default framing.
- **D9** — Specified the minimal shape of the preset extension (`AtlasLayers.hidden`, `viewPresetOf`, `PRESET_ORDER`, persisted back-compatibly) instead of "add presets per §5" (C11).
- **D10** — Split acceptance into a **mandatory node-only lane** and a **best-effort browser lane**, with a verbatim-error rule when Chrome cannot start; browser gates removed from all evidence contracts (C12).
- **D11** — Replaced `git add -A && git commit` with explicit-path staging plus a foreign-edit inspection, because the tree mixes v6 and v7 work (C13).
- **D12** — Narrowed QA's write scope; kept both task ids and the single integration → QA edge, with no new tasks (C14, §4).

Not deviating: the task ids, the integration → QA order, the "already done, do not redo" list, the frozen slug contract, "nothing below y = +45 moves", and the four run-level budgets.

---

## 9. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Concurrent sibling-run writes corrupt the manifest/GLBs or produce transient red gates | **High** (observed) | High | Quiescence gate (§1); single writer; re-read before write |
| R2 | Anatomy GLB payload exceeds 14 MiB once the last 12 parts land (647 KiB headroom, ≈ 1.05 MB needed) | **High** | High | Budget reconciliation (step 2): cut hemisphere/WM resolution first; report final numbers |
| R3 | `BUDGETS.partBytes.nucleus` (60 KiB) / `nucleusTotalBytes` (2.5 MiB) breached by tel nuclei — `ctx-caudate-*` already over | **Certain** (measured) | Medium | Narrowest documented cap raise with the rationale, keeping 800k/14 MiB untouched |
| R4 | Baked tel meshes never appear / appear region-less because of the slug gap | **Certain** unless wired | High | Shared slug→record table consumed by `SceneLayers` + `sectionAssets` (step 3) |
| R5 | 32 tel records draw unit spheres at the origin, wrecking default framing and picking | **Certain** (measured) | High | Placement or documented exclusion; QA check 4 |
| R6 | Browser gates unprovable in-sandbox | **High** | Medium | Node-only acceptance lane; verbatim error reporting; extend `verify:pipeline` for the +58 proof |
| R7 | `verify-imaging-v4`/`-v4b` stay red (8.71 MiB vs 8 MiB) and nobody notices | **Certain** (measured) | Medium | Cap updated to the plan's 10 MB with citation; both gates in the evidence contract |
| R8 | Collision with the v6 run's `integration-v6` on `README.md` / `scripts/verify/audit.mjs` | Medium | Medium | Re-read before writing; additive surgical edits; append-only check group; explicit staging |
| R9 | `--all` aborts on a broken tel recipe and blocks brainstem re-bakes | Medium | Medium | Fix the recipe first / use `--part`; registry load errors are hard failures (C15) |
| R10 | Cap "adjustment" becomes moving the goalposts to make a red gate green | Medium | High | Decision order in step 2; caps may move only with a written justification and only the narrowest one; run-level constraints frozen; QA re-derives the numbers independently |

---

## 10. Run-level acceptance (restated, modality-correct, provable here)

1. All 22 `TEL_SLUGS` are baked, in `anatomy-manifest.json`, and rendered/registered per step 3; hemisphere shells ≤ 90k tris each and ≤ their context cap.
2. The telencephalon is visible and selectable: lobes (via the ghost hemisphere shell + tree/search/plates), basal ganglia, hippocampus/amygdala, ventricles, corpus callosum — pickable in 3D where a body exists, and every tel record reachable from tree, search and the plates.
3. The default preset is brainstem-first: the cortex is a readable ghost, the brainstem remains the visual focus, and no stray placeholder geometry sits at the origin.
4. The four new levels (+48/+58/+68/+78) drive clip, plates, live section and snap-to-plate; nothing below y = +45 changed — evidenced by unchanged committed GLB bytes, unchanged 13 anchors, and the unchanged existing-level imagery within a stated tolerance.
5. The live section paints at y = +58 (machine-checked by the extended `npm run verify:pipeline`).
6. **MRI** covers the hemispheres at the new levels; **CT** states its measured coverage limit above canonical y ≈ 36.25 au in the toolbar and canvas, sourced from `ct-manifest.json` — no blank canvas, no stale slice, no silent fallback.
7. Budgets and gates, all exit 0: `validate` (0 errors/0 warnings), `check`, `build`, `build-anatomy-geometry.mjs --manifest` (≤ 800k rendered tris, ≤ 14 MiB anatomy GLB, per-part and nucleus-total caps), `verify:pipeline`, `verify:plane`, `verify-imaging-v4`, `verify-imaging-v4b` (≤ 10 MB imaging).
8. `verify:audit` extended with telencephalon checks and attempted with the dev server running; the outcome — pass **or** the exact sandbox error — is reported verbatim, never assumed.
9. No regression in the v1–v6 brainstem/diencephalon/cerebellum experience; the whole QA checklist in §6.6 passes.
10. Everything is committed with explicit paths, and the final message carries the tri/byte table, the gate results, the preset behaviour, the CT statement, the commit hash and the residual limitations.
