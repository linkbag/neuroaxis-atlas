# QA changelog — final review pass (`review-qa`)

Date: final QA gate of the NeuroAxis build (spec: `docs/ENGINEERING_PLAN.md`).
Scope: anatomy accuracy spot-checks, cross-file consistency, gates, UX polish.
All fixes are conservative, textbook-standard (Blumenfeld / Patten / Fix / Snell / RadioGraphics 2019).

## Gates (after all edits below)

| Gate | Result |
| --- | --- |
| `npm run validate` | PASS — 0 errors, 0 warnings (118 structures · 19 tracts · 24 syndromes · 12 plates · 13 levels · 137 registry entries) |
| `npm run check` (tsc --noEmit) | PASS |
| `npm run build` (vite build) | PASS |
| Dev-server smoke (`:5173`) | PASS — HTTP 200, root div + entry script, `main.tsx` transforms cleanly |

## 1. Anatomy accuracy fixes

| File | Record | Issue → fix |
| --- | --- | --- |
| `src/data/structures/medulla.json` | `tract-medial-lemniscus` | **Somatotopy inverted.** Claimed "leg lateral, arm medial" *in the medulla*. Textbook: in the caudal medulla the ML stacks ventral-to-dorsal (leg/gracile ventral, arm/cuneate dorsal) and rotates ≈90° through the pons, ending leg-lateral / arm-medial in the midbrain. Rewritten accordingly. |
| `src/data/tracts.json` | `tract-dcml` | Same error family in the `somatotopy` field: "leg is medial/dorsal in the midbrain" (backwards) and "leg ventral (and lateral)" in the medulla (sloppy). Now: medulla leg-ventral/arm-dorsal → pontine rotation → midbrain leg-lateral/arm-medial, face at VPM. |
| `src/data/syndromes/hindbrain.json` | `syn-medial-medullary` | Presentation said ML "lower-limb fibers lateral" — lower-limb (gracile) fibers are **ventral** in the medullary ML segment. Corrected. |
| `src/data/structures/medulla.json` | `nuc-nucleus-gracilis` | "tonotopically leg-arranged columns" — a somatosensory nucleus; "tonotopically" → "somatotopically". |
| `src/data/structures/medulla.json` | `nuc-ambiguus` (clinical) | Typo "ambiguityus" → "ambiguus". |
| `src/data/structures/midbrain.json` | `nuc-pag` (clinical) | Garbled phrase "stress hypergravity responses" → "autonomic stress responses". |
| `src/data/structures/midbrain.json` | `nuc-snc` (clinical) | Malformed "hemiballistic" → "hemiballismic". |
| `src/data/structures/diencephalon-hypothalamus.json` | `nuc-paraventricular` | Duplicated axis in note "(HPA/HPG/HPG-axis)" → "(HPA/HPG/HPT-axis)" (the record's TRH neurons are the HPT axis). |
| `src/data/structures/diencephalon-epithalamus-subthalamus.json` | `vent-cerebral-aqueduct` | `origin3d` z = −2.5 placed the aqueduct in the ventral tegmentum (level of the red nucleus, z≈0). Moved to z = −6 so the tube runs through the PAG/tectal region, matching the PAG record (z = −6), the plates (aqueduct inside the PAG ring), and the sagittal profile. |
| `src/data/syndromes/hindbrain.json` | `syn-lateral-medullary` | `structures[]` did not include `tract-icp`, although the presentation text attributes the ipsilateral ataxia to it (restiform body). Added so the syndrome highlight lights the canonical structure in 3D/plates/tree. |

### Spot-checks that PASSED (no change needed)

- **Diencephalon (≥5 sampled)**: VPL body leg-lateral/arm-medial with VPM medial for face ✓; LGN six-layer eye segregation (ipsi 2/3/5, contra 1/4/6), light-reflex fibers leaving before the LGN, dual AChA/lateral-PC supply with wedge vs horizontal sectoranopia ✓; MGN via IC brachium → sublenticular capsule → Heschl, positioned medial/inferior to the LGN under the pulvinar ✓; pulvinar as largest nucleus overlying the geniculates ✓; VA (GPi/SNr) vs VL (dentatothalamic) ✓; STN → contralateral hemiballismus, ZI dorsal to STN, H1/H2 definitions ✓; supraoptic/PVN magnocellular ADH/oxytocin → posterior pituitary ✓; mammillary bodies → mamillothalamic tract (Vicq d'Azyr), Wernicke/Korsakoff ✓.
- **Midbrain (≥5)**: z-order crus → SNr → SNc → red nucleus (ventral→dorsal) correct in both `origin3d` and the SC plate ✓; SNc dorsal band of the SN ✓; EW dorsal to CN III complex ✓; trochlear nucleus at the IC level with complete decussation in the superior medullary velum and dorsal exit ✓; crus somatotopy frontopontine → corticobulbar → corticospinal → temporopontine, medial→lateral (plate and tract records agree) ✓; SCP decussation in the caudal ventral tegmentum at the IC level ✓.
- **Pons (≥5)**: facial nucleus ventrolateral vs facial colliculus/facial genu dorsal over the abducens nucleus ✓; PPRF paramedian ventral to the abducens nucleus; nuclear-VI gaze palsy vs fascicular diplopia ✓; trigeminal motor medial to principal sensory V ✓; four vestibular nuclei at the ventricular floor with cochlear nuclei dorsolateral at the CP angle ✓; LC periventricular at the rostral pons ✓.
- **Medulla (≥5)**: nucleus ambiguus dorsal to the inferior olive (data and olivary plate) ✓; gracile medial / cuneate lateral dorsal columns ✓; hypoglossal paramedian under the hypoglossal trigone, DMV lateral (vagal trigone), NTS dorsolateral ✓; spinal trigeminal tract dorsolateral to its nucleus with onion-skin lamination ✓; inferior olive folded lamina ventrolateral with climbing-fiber/Guillain-Mollaret physiology ✓.
- **Tracts / decussation levels**: pyramidal decussation at the cervicomedullary junction (~85–90%) ✓; sensory (internal arcuate) decussation at the lower medulla ✓; rubrospinal crossing in the **ventral** tegmental decussation immediately caudal to the red nucleus ✓; tectospinal crossing in the **dorsal** tegmental decussation (of Meynert), dorsal to the ML ✓; spinothalamic crossing within 1–2 segments with sacral-sparing lamination ✓; ventral trigeminothalamic crossed / dorsal ipsilateral ✓; anterior spinocerebellar double decussation ✓; hypothalamospinal uncrossed lateral tegmentum (central Horner) ✓.

## 2. Consistency checks

- taxonomy ↔ structures/tracts: **0** color/name/kind/region mismatches (colors match for every record; registry names are authoritative for display).
- Taxonomy orphans: **0** — all 137 registry entries have authored records; syndrome `structures[]` refs: **0** unresolved; plate `data-structure`/`data-for` slugs all resolve (validator-enforced + manually spot-checked).
- SVG plate contract: all 12 plates viewBox 0 0 800×800, `data-role="outline"` present, balanced `data-structure`/`data-for` counts, **no** `<style>` tags and no fill/style on region shapes (renderer recolors from taxonomy).
- Orientation: transverse plates dorsal-top with patient LEFT on image right + L/R/A/P badges; sagittal anterior-left/superior-top — per plan §6.
- Manifest `labelPos` values match the authored label text anchors and leader lines point at their regions (spot-checked on plate-olivary, plate-midbrain-sc, plate-thalamus-mid).

## 3. UX polish

| File | Fix |
| --- | --- |
| `src/components/viewer3d/ClipControls.tsx` | **Transverse snap bug**: with "Snap slider to levels" on (the default), dragging the slider snapped to the level nearest the *pre-drag* `clip.y`, so the handle always snapped back to its starting level instead of stepping between plate levels. Now snaps to the level nearest the dragged value. |

### Verified working end-to-end (no change needed)

- Selection loop: 3D click (`onPointerMissed` clears), tree/search, plate region + leader-line labels (`keepSyndrome`), syndrome cards, info-panel level chips → all funnel through one zustand selection; open syndrome dims everything outside its structure set.
- Plane sync, both directions: plate/level selection → `clip.y` + helper reveal (`setPlate`, `gotoLevel`); 3D drag → nearest-level naming in ClipControls, ruler highlight (`LevelRuler`), and "Snap to plate" jump.
- Mobile/tablet: breakpoint classes present (≤1024 stack + collapsible sidebar, ≤640 bottom tab bar with safe-area inset, bottom-sheet info panel and sidebar, z-order tab bar 70 > info 60 > sidebar 55); plates/legends overflow handled.
- Contrast: plate labels live on the light "paper" surface with dark ink; hot-label state (#0c4a6e) readable.

## Residual known limitations

- Schematic fidelity: proportions and some multi-level records (e.g., a single midline blob for the paired paramedian CN III/XII columns; transverse plates as composite line-ups showing rostral nuclei such as VA/anterior on the mid-thalamus slice) are didactic simplifications, documented in the README disclaimer.
- Quiz mode (plan §1.1 stretch) is **not implemented**; tract flow animation and camera-nudge-on-select are likewise stretch items not present.
- README screenshots are declared placeholders.
- 3D scene verified by code + data review and HTTP smoke test; interactive clicking in a live browser was outside this environment's reach.

---

# QA changelog — v4 real-imagery review pass (`review-qa-v4`)

Date: 2026-09-10. Spec: `docs/IMAGING_V4_PLAN.md` §6 (definition of done).
Scope: licence/credit audit, real-first correctness, plane anchoring and
orientation, PiP backdrop, perf + budgets, gates, v1–v3 regression, hygiene.
All fixes are conservative: no anchor was re-estimated (no vision/browser tool in
this environment), no licence claim was accepted from a summary, and every
statement below is reproducible with the command named next to it.

## Gates (after all edits)

| Gate | Result |
| --- | --- |
| `npm run validate` | PASS — 0 errors, 0 warnings (13 levels · 137 registry entries · 118 structures · 19 tracts · 24 syndromes · 12 plates) |
| `npm run check` (`tsc --noEmit`) | PASS |
| `npm run build` (`vite build`) | PASS — `dist/` carries `ct.bin` + `mri-t1.bin` + all 54 plates; main bundle 3,225.66 kB (gzip 716.35 kB), unchanged in kind from v3 |
| `node scripts/verify-imaging-v4.mjs` (**new QA gate**) | PASS — 24/24 anchored photographs inside the reachable slider range and unambiguous at their own plane; orientation tables match §2.2; every credit exact; 6.12 MiB payload ≤ 8 MiB |
| Dev-server smoke (`:5173`) | PASS — HTTP 200 (server stopped afterwards) |

## 1. Licence + credit audit — PASS, with one documentation defect fixed

Every embedded imaging asset was traced to a licence verdict recorded **with a
fetch date**, cross-checked against the source terms, and its credit line checked
verbatim in code, `docs/ATTRIBUTION.md` and `README.md`
(`scripts/verify-imaging-v4.mjs` asserts all of it):

| Asset | Licence + date | Verbatim credit | In-UI |
| --- | --- | --- | --- |
| 27 v3 UBC micrographs | CC BY-NC-SA 4.0 (site footer, 2026-09) | `© University of British Columbia, CC BY-NC-SA 4.0` | canvas bottom-left + toolbar |
| 24 v4 UBC horizontal/coronal plates | CC BY-NC-SA 4.0 (site footer, 2026-09-08) | same line | same |
| 10 MSU/Wisconsin coronals | site permission, credit mandatory | the MSU/Wisconsin/NMHM line | authored-plate view + toolbar chips |
| 3 Commons CT slices | CC0 1.0 per file (2026-09-08) | `CT of a normal brain — Mikael Häggström, M.D., … CC0 1.0` | same |
| MRI grid | OpenNeuro ds007313, CC0 | `ds007313 doi:10.18112/openneuro.ds007313.v1.0.0, OpenNeuro CC0` | same |
| CT grid | NLM Terms and Conditions (2019), fetched 2026-09-10 | `Courtesy of the U.S. National Library of Medicine` | same + PiP attribution |

- **NC sources:** only UBC (CC BY-NC-SA 4.0), recorded explicitly in
  `docs/ATTRIBUTION.md` for a non-commercial educational tool (**UBC precedent**,
  unchanged by v4). No new NC source was added.
- **Link-out-only sources:** Harvard Whole Brain Atlas and BrainMaps.org appear
  only as link chips — nothing embedded (asserted).
- **Fixed — stale licence record.** `docs/IMAGING_SOURCES_V4.md` still said
  *"CT volume … NOT FOUND … `ct-grid` must degrade gracefully"* while the
  committed tree ships `ct.bin` with `status:"available"`. The research record is
  preserved verbatim, marked as superseded, and a full **§3.7 acquisition
  record** (source, landing page, licence quotes, fetch date, credit, what was
  taken, adaptations) was added, with the §1/§4.2 payload tables corrected.
- **Fixed — NLM redistribution clause.** The 2019 terms require a redistributor
  to *maintain the most current version* **or** *state plainly that the copy may
  not be current*. The second arm is now recorded verbatim in
  `docs/ATTRIBUTION.md` (the committed grid is a frozen 2026-09-10 snapshot, not
  a live mirror).

## 2. Real-first correctness — PASS (code-verified)

`sectionUnderlay.kind` defaults to `'auto'` with `opacity: 1` and
`realFirst: true` (`src/state/store.ts`), and a v3 persisted payload that still
holds the v3 defaults is migrated to real-first. Resolution order is implemented
once in `SectionCanvas.resolveLayerFrame` (`auto` = photograph → CT → MRI) and
mirrored by `imageLayers.resolveSliceModality` for the PiP, so all three section
surfaces agree:

- **anchored photograph** (±1.5 au) → real plate + contours overlaid at 65 % fill
  strength with 0.9-alpha outlines; the **selected** structure keeps its full
  strength (+0.2 alpha, 2.2 px orange stroke) and its label, so selection and
  hover stay readable over a photograph;
- **no photograph but CT/MRI available** → the continuous grid is the base
  (CT covers the whole canonical box, so `auto` has a real base at *every*
  reachable plane);
- **nothing available** (e.g. explicit *Photo* between two anchors, or the plane
  outside a grid's extent) → simulated section **plus a one-line honest hint**
  naming the reason (`imageryHint()` / `pipBackdropHint()`), never a blank
  window;
- **`Simulated only`** is an explicit store value (`kind: 'none'`) and is
  labelled as such.
- **Credits render for each case:** the canvas replaces the credit slot with the
  drawn layer's exact line; the Plates toolbar prints the same line for the
  requested modality; the PiP panel shows the sampled modality's line. Nothing
  renders when nothing drew (an honest empty state, not a stale attribution).

## 3. Plane anchoring + orientation — 1 reachability defect, 1 metadata defect, 1 orientation regression fixed

- `node scripts/verify-imaging-v4.mjs` lists all 24 anchored plates with their
  mount windows (see its output). Spot-checks: **coronal** `ubc-c16` → z = −14,
  `ubc-c21` → z = −46, `ubc-c24` → z = −54; **transverse** `ubc-h16` → y = −14,
  `ubc-h19` → y = −38, `wikict-axial-18` → y = −14 — each is the nearest plate at
  its own value and no two ±1.5 au windows overlap.
- **Fixed:** `ubc-c07` was anchored at **z = 31, outside the reachable coronal
  slider range z ∈ [−56, 26]** — the plate could never be displayed. Clamped to
  26 (ordering preserved, 5 au rostral to `c09`).
- **Fixed:** `ubc-h12`/`ubc-h13` had their `levelId`s **swapped** relative to the
  nearest-anchor rule; corrected (no runtime drawing change — the level-mapped
  pick is still the earlier v3 micrograph — but the metadata no longer
  contradicts the rule).
- **Fixed (regression):** the v4 commit changed the **GPU PiP's transverse
  orientation badges** from `A`-top / `L`-right to `P`-top / `R`-right while
  leaving `cameraSide`, `up`, `flipX` and the blit untouched — the geometry
  cannot have changed, so the letters contradicted the image (posterior is never
  up on a transverse section), `docs/SECTION_SYNC_PLAN.md` §2.2 and
  SectionCanvas' own badge table. Restored, and the script now asserts both
  surfaces against §2.2. Sagittal (`S`-top / `A`-right) and coronal
  (`S`-top / `L`-right) were already correct.
- `fit {scale, dx, dy, mirrorX}`: `mirrorX: false` everywhere (each source
  already shows patient-left on image-right), and the affine places the plate's
  measured midline on the canonical midline; the PiP's backdrop mirror is
  cancelled by its blit mirror, so backdrop and 3D cut land on the same pixels.

## 4. PiP — PASS (backdrop shipped, no fallback needed)

The real-slice backdrop is implemented, not just documented: `imageLayers
.renderSliceToCanvas()` paints the active modality into a caller-owned canvas
reused by the 2D canvas paths, `SectionPiP` wraps it in a `CanvasTexture` and
composites it **before** the stencil/cap/colour passes. The bfeceb0 behaviour is
intact: the PiP uses its own per-axis planes (never `OFF_CONSTANT`), so the
section renders with clipping **off**, and the cap pass is unaffected (the
backdrop writes neither depth nor stencil). A `?pipdebug` overlay exposes the
backdrop key/redraw state, and `SectionPipHint` names the reason whenever no
modality painted. The plan §4 "PiP unchanged + note in the Plates tab" fallback
was therefore correctly **not** taken.

## 5. Perf + budgets — PASS

- **No per-frame volume reads:** the slice raster is cached per
  (grid, axis, quantized plane, window, upsample) and the backdrop texture is
  re-sampled only when the rounded plane / modality / RT size changes; the
  contour worker, 15 Hz plane throttle, 0.25 au quantization, dpr caps and
  hidden-tab skip from v3 are unchanged.
- **Budgets:** imaging payload **6.12 MiB / 58 files** (cap 8 MiB); v4-added
  assets **3.11 MiB / 28 files** (cap 4 MiB); `dist/` still emits the two
  `.bin` grids + 54 plates.
- Minor, left as is (documented here rather than churned): while a photograph is
  still decoding, the PiP re-runs the sampler each frame (a canvas clear; no
  volume read) — that polling is what lets the plate appear without a
  store round-trip, but the code comment describing it as "sticky, not per
  frame" overstates the behaviour.

## 6. Hygiene

`assets-src/` and `.bp3d-probe/` are gitignored **and** untracked (0 tracked
files); no stray logs, probe output or gate files are tracked; the working tree
was clean at review start and only the files listed below changed.

## v4 QA changes (this pass)

| File | Change |
| --- | --- |
| `src/components/viewer3d/SectionPiP.tsx` | transverse orientation badges restored to the §2.2 table (`A/P/R/L`) + the badge derivation written down |
| `src/data/sectionImages.ts` | `ubc-c07` anchor clamped into the reachable range (31 → 26); `ubc-h12`/`h13` `levelId` swap corrected; anchoring comments corrected to match the data (6 au steps with a 12 au gap; 5 au widening to 7–10 au) |
| `scripts/verify-imaging-v4.mjs` | **new** reproducible QA gate (§Gates above) |
| `docs/IMAGING_SOURCES_V4.md` | §1/§4.2/§5.1/§6.1 updated; **§3.7** NLM head-CT acquisition record; review-update notes |
| `docs/ATTRIBUTION.md` | NLM "most current version" clause recorded verbatim; MRI credit line quoted as displayed; heading corrected (derived grid embedded) |
| `README.md` | coronal coverage corrected (`z = +26 … −54`); QA-gate row added to the scripts table |

## Residual known limitations (v4)

- **Photo coverage is per-plane, not continuous.** 24 anchored photographs at
  ±1.5 au windows; between them `auto` falls back to CT/MRI (or the v3
  level-mapped micrograph within 1.5 au of a level on transverse planes). The 10
  MSU coronals carry no published plane position, so they stay browse-only in
  the authored-plate view and never mount in the live section (true in v3 too).
- **Registration is approximate and disclosed.** Photograph `planeValue`s are
  estimates (±1 step ≈5–6 au inside a run, up to ≈10–12 au across the widest
  gaps) from the sources' own labels; `fit.scale` is a family constant, so
  internal detail is not voxel-registered to the atlas envelopes. MRI/CT carry
  measured residuals (midline ≤ 1.25 au; CT pons face 2.04 au mean) reported
  verbatim in their manifests.
- **The CT grid is a frozen 2026-09-10 snapshot** of the NLM Visible Human head
  CT (see the NLM terms clause above).
- **Verified by code + reproducible gate, not by eye.** No browser automation or
  vision model exists in this environment, so pixel appearance (does the
  photograph *look* right at its plane?) was not asserted — the orientation,
  anchoring and credit claims were settled from the committed sources, the
  geometry, and the plan's conventions.

---

# v6 remediation closure — independent QA pass (`v6b-qa`)

Date: 2026-09-10 · Tree: `b5ab6f3`, clean before and after · Scope: the final QA
gate of the v6 audit remediation (`docs/QUALITY_PLAN.md` §6, §8).
Full record, with the exact failure text of every mutation: `docs/QUALITY_PLAN.md`
**§8**. This entry is the changelog half.

## Verdict

**VERIFIED, with four recorded gaps** (`docs/QUALITY_PLAN.md §8.6`). The P0 fixes
bite, the gates can fail when the code they guard is broken, every budget is
inside its cap, and no v1–v7 feature regressed. The gaps are: the browser lane
could not run at all in this environment (`verify:audit` exit **4**), 4
`kind:"context"` records still carry an empty `clinical[]`, the historical
`CONTENT_INVENTORY.md` tables still show their pinned-revision counts (a §10
re-measurement was appended), and stray `chrome.exe` could not be attributed per
process (the sandbox denies `Win32_Process`).

## 1. The P0 fixes bite (mutation-tested, not inspected)

- Context-loss handlers are real on **both** surfaces — main canvas
  (`Viewer3D.tsx:640-658`, `preventDefault` + overlay `[data-context-lost]`
  mounted only while lost) and the PiP
  (`SectionPiP.tsx:833-858`, shared `gl.domElement`, `restoreGeneration` rebuild
  of the target/stencil/materials).
- The permanent gate (browser audit block M) **could not be run** — Chrome 153
  exits instantly with `crashpad_client_win.cc:421 OpenProcess: Access is denied`.
  A Node-only surrogate (scratch, uncommitted) passes 30/30 on the shipped tree
  and **fails with a specific label** on each of six deliberate defects
  (removed `preventDefault`, unwired listener, missing `data-context-lost`,
  always-mounted overlay, dropped PiP rig rebuild, always-refusing
  `requestContextRestore`). This is a surrogate, **not** the audit.
- Boundaries: 7/7 surfaces wrapped. `boundary-contract.mjs` **fails** when one
  wrapper is removed (`FAIL App.tsx does not wrap: Info panel`) and when
  `role="alert"` is deleted from the recovery card.

## 2. The gates can fail (the audit's own lesson, demonstrated)

| Mutated in a scratch copy | Result |
| --- | --- |
| `DIRECTION_VECTORS` L/R mirror flipped | `verify:plane` **exit 1** — `PLANE_BADGES.y (A/P/R/L) disagrees with the geometry-derived orientation (A/P/L/R)` |
| `AXIS_PAIR.x` swapped `['z','y']→['y','z']` | `verify:plane` **exit 1** — `PLANE_BADGES.x (S/I/P/A) disagrees with the geometry-derived orientation (A/P/I/S)` |
| `axisExtents` `uMax + 6` (extent shift) | `verify:plane` **exit 1** — `10761/10827 assertion(s) passed, 66 FAILED` |
| `boundsMayCut → false` (cull every part) | `verify:pipeline` **exit 1** — `FAIL no contours produced at any tested plane` |

All reverted; scratch files byte-identical to the repository, both gates green
again. Honest non-bite: shifting `CLIP_BOUNDS` itself does **not** fail
`verify:plane` — C1 is a consistency assertion, not a pinned copy of AMENDMENT B,
so out-of-band bound edits are caught by the plan and the baked geometry, not by
that gate.

## 3. Claimed-landed work, re-measured

- **`p1-photofit` — honest.** `REGISTRATION_MEASURED` holds 43 rows; recomputing
  its statistics reproduces the note's stated ranges exactly (centroid 0.23 /
  2.49 / 64.78; UBC transverse 0.53–1.32 median 0.81; UBC coronal 0.23–4.16; VHP
  2.36–64.78 median 10.84; VHP extentV 0.06–0.74; IoU peak 0.383). One prose range
  does not reproduce — the note's "1.7–3.5× (UBC)" extent, where the table spans
  0.34–6.07 — and it errs in the safe direction (the real mismatch is wider, so
  the rejection stands). No `fit` value changed; every entry stays
  `unmeasured-default`.
- **`p1-identity` — landed.** 16/16 `ctx-*` ids are registered and authored
  (validator: 0 awaiting records); all 10 rendered silhouettes map to a registry
  id and answer `selectStructure(slot.id)`; the four previously unowned
  silhouettes now carry `ctx-medulla-surface`, `ctx-pons-surface`,
  `ctx-midbrain-surface`, `ctx-pineal`. The 8 "invisible" tracts always rendered
  through `TractTube`; the surviving gap is 2D — 9 authored tracts (the 8 + v7's
  `tract-uncinate-fasciculus`) carry no plate label.
- **`p1-content` — landed, with one unmet acceptance line.** 26 syndromes
  (`syn-one-and-a-half` present and conformant; every `clinical[].syndromeId`
  resolves; `syn-central-horner` exists). **4 records still hold `clinical: []`**,
  so §6's "0 records with empty `clinical`" is NOT met.

## 4. Gates and budgets on the closure tree

`validate` 0/0 · `check` 0 · `build` 0 (entry 1 120.53 kB / 252.91 kB gzip;
vendor 1 206.81 kB / 354.64 kB) · `verify:pipeline` 106/106 · `verify:plane`
10 827 assertions · `a11y-contract` 38 · `boundary-contract` 22 · tris
**570 096/800 000** · GLB **13.12 MiB/14 MiB** · imaging **8.71 MiB/10 MiB** ·
`verify:audit` **exit 4, no check ran**.

## 5. Files changed by this QA pass

| File | Change |
| --- | --- |
| `docs/QUALITY_PLAN.md` | **§8** appended — the full QA verdict, per-item results, the gate-bite demonstrations with exact failure text, and the honest limitations |
| `docs/CONTENT_INVENTORY.md` | **§10** appended — the re-measured current counts, as the document's own preamble asks; the historical §1–§9 tables are left intact as the pinned-revision record |
| `docs/QA_CHANGELOG.md` | this entry |

No product, data or gate file was edited. Every mutation lived in
`.dsh-scratch/qa-bite/` (gitignored) and was reverted there; the scratch
surrogate and counter are uncommitted, and `.dsh-scratch/`, `.plate-scratch/`,
`.bp3d-probe/`, `assets-src/` remain gitignored and uncommitted.


# v7 closure — integration acceptance pass (`v7c-integration`)

Date: v7 closure (spec: `docs/TELENCEPHALON_PLAN.md` §9 + `docs/QUALITY_PLAN.md` §6).
Scope: merge the closure work, prove each of the five audit gaps is genuinely closed, re-run every
gate, re-derive the budgets, and commit — without touching anything below `y = +45`.

## Verdict

The five gaps the orchestrator's 56-check browser audit found are **closed in the shipped code**, and
every fix is now covered by a gate that fails if it is reverted. The **browser lane could not run in
this sandbox** — see the honest limitation below — so no Tier-2 verdict is claimed.

## 1. Gate table on the frozen tree

| # | Gate | Command | Tier | Result |
| --- | --- | --- | --- | --- |
| 1 | Data integrity | `npm run validate` | 1 | **PASS** — 0 errors, 0 warnings · 17 levels · 183 registry entries · 160 structures · 23 tracts · 26 syndromes · 15 plates |
| 2 | Types | `npm run check` | 1 | **PASS** — exit 0 |
| 3 | Build | `npm run build` | 1 | **PASS** — exit 0 (`index` 1,123.44 kB / 253.89 kB gzip + `vendor-three` 1,206.81 kB / 354.64 kB) |
| 4 | Section pipeline | `npm run verify:pipeline` | 1 | **PASS** — 106/106 parts · 570,096 triangles · 329 loops across 13 planes · 0 problems |
| 5 | Plane transform | `npm run verify:plane` | 1 | **PASS** — 10,827 assertions |
| 6 | Boundary contract | `node scripts/verify/boundary-contract.mjs` | 1 | **PASS** — 22 passed · 0 failed |
| 7 | a11y contract | `node scripts/verify/a11y-contract.mjs` | 1 | **PASS** — 38 passed · 0 failed |
| 8 | Audit check mirror | `node scripts/verify/audit-checks.test.mjs` | 1 | **PASS** — 75 passed · 0 failed · 8 groups |
| 9 | Anatomy + budgets | `node scripts/build-anatomy-geometry.mjs --manifest` | 1 | **PASS** — 570,096/800,000 tris · 13.12/14 MiB GLB · 2.81/3 MiB nuclei |
| 10 | Imaging gates | `node scripts/verify-imaging-v4.mjs`, `-v4b.mjs` | 1 | **PASS** — 8.71 MiB/10 MiB in 80 files · 22/22 cryosections re-decoded |
| 11 | Runtime audit | `npm run verify:audit` | **2** | **exit 4 — no check was run** (no browser; see §4) |
| 12 | Browser probe | `npm run verify:browser` | **2** | **exit 4 — no check was run** |
| 13 | Browser acceptance | `npm run verify:acceptance` | **2** | **exit 4 — no check was run** |

Rows 11–13 are recorded as command + exit code + reason and are **never reported as a pass**.
`exit 4` is `EXIT.BROWSER_UNAVAILABLE`, not a product failure — that distinction is the whole reason
the harness has separate exit codes.

## 2. Per-gap evidence (with the gate that fails if the fix is reverted)

| Gap | Fix in the shipped code | Gate that catches a revert |
| --- | --- | --- |
| (1) no recovery overlay on context loss | overlay moved **outside** the R3F `<Canvas>` subtree; each canvas child wrapped in `CanvasSceneBoundary` (THREE-safe `null` fallback) | `audit-checks.test.mjs` — "the overlay is rendered OUTSIDE the R3F `<Canvas>` subtree" · "canvas children are wrapped in CanvasSceneBoundary" |
| (2) `TypeError … reading 'alpha'` in PostFX | `PostFX` returns `null` while `contextLost` (no composer ⇒ no `addPass` ⇒ no `getContextAttributes().alpha`); remounts on restore against the new context | `audit-checks.test.mjs` — "PostFX returns null while the context is lost" · "passes the live loss state into PostFX" · "the 'high' quality gate is unchanged" |
| (3) CT coverage statement "missing" at y = +58 | **check defect**: the statement already existed and was wired; the check never proved the axis. It now pins `sectionAxis === 'y'` and reports `{axis, planeValue, kind, notePresent}` before asserting, then asserts the honest state | `audit-checks.test.mjs` group (3), driven by the real `ctCoverageStatement()` + shipped `ct-manifest.json`; the predicate is proven to **bite** when the note is absent above the limit |
| (4) default preset + 2 dimmed rows | **check defect + latent code gap**: audit profile persisted `neuroaxis.viewPreset`; and `telSubdivisionIds` filtered on `subdivision` alone. Now: fresh profile per run + `localStorage.clear()` prologue + boot assertions in their own block; `region === 'telencephalon'` added to the filter | `audit-checks.test.mjs` group (4) — the region guard, the "no brainstem row is layer-off" sweep, and the stale-preference-vs-wrong-default discrimination |
| (5) `?panelfail` armed 0 boundaries / no containment | **two real defects**: the probe marker was a *sibling* of the throwing component (React discards it in the throwing pass), and `isDevBuild()` read `import.meta.env` through a type-cast alias that esbuild erases (so Vite injected no env object and the hook was dead). Marker moved onto the failure card; the token is now literal; the latch is one-shot so Retry recovers | `audit-checks.test.mjs` group (5) — drives the real `PanelErrorBoundary` through the real throw: `card=Taxonomy tree · probes=1 · retry=true`, then Retry restores the children |

### Audit artifacts (checks, not product bugs) — both re-framed

- **CT above its source.** The Visible Human CT series ends at canonical **y ≈ 36.25 au**
  (`ct-manifest.json` → `intensity.sourceCoverage.superiorMostDataYAu`, 64.3 % of stations inside the
  source FOV). The check now requires **no CT credit** there and requires the statement naming the
  limit and MRI. **Inside** coverage the check is unchanged and still demands the NLM credit plus
  real painted samples, and it is proven to fail when CT paints nothing on a covered plane.
- **Photo at y = +58.** No photograph is anchored above the highest mapped level, so the honest
  assertion is the canvas' no-anchor hint.

## 3. Budgets, re-derived from the committed artifacts

| Budget | Cap | Measured | Verdict |
| --- | --- | --- | --- |
| Rendered triangles | ≤ 800,000 | **570,096** (106 parts) | PASS |
| Committed anatomy GLB | ≤ 14 MiB | **13,755,548 B = 13.12 MiB** (106 files, 0 missing) | PASS |
| Imaging payload | ≤ 10 MiB | **9,132,531 B = 8.71 MiB / 80 files** | PASS |
| Pooled nuclei | ≤ 3 MiB | **2.81 MiB** | PASS |

## 4. Honest limitation — the browser lane did not run here

`verify:audit`, `verify:browser` and `verify:acceptance` all exit **4** with *"environment unusable,
no check was run"*. Measured against **four** launch variants — Chrome **and** Edge, `--headless=new`
**and** legacy headless, every one with `--no-sandbox --disable-crash-reporter --disable-breakpad`
and a fresh profile — each process died before its DevTools endpoint answered:

```
crashpad_client_win.cc:421  OpenProcess: Access is denied. (0x5)
platform_channel.cc:108     Check failed: . : Access is denied. (0x5)
```

**Therefore:** the runtime half of the audit (scene luminance, live-section paint counts, pointer and
focus interaction, translucency of the ghost shell, the real `WEBGL_lose_context` cycle, and the
telencephalon browser sanity checklist) is **NOT independently reproduced in this run**. What the
Node lane proves is the decision logic, the DOM contract in the shipped sources and the shipped
data/manifest facts — it does **not** prove that pixels appeared. The two observations below are
quoted from the orchestrator's earlier run against this tree, not produced here:

- `ok transverse plane reaches y = +58 and the live section repaints (range -55..85; hash 63782274 → 788243822)`
- `ok live section paints at y = +58 (494/6492 non-background samples)`

**Unproven here and requiring a machine where Chrome starts:** re-run `npm run verify:audit` and
require exit 0.

## 5. Node-verified telencephalon facts (the half a browser is not needed for)

- taxonomy: 183 entries · **46 telencephalon** records · all 5 subdivisions present (Basal ganglia ·
  Cerebral cortex · Lateral ventricles · Limbic system · Telencephalic white matter)
- the default preset hides 31 telencephalic records and **no** non-telencephalon record; neither
  `ctx-thalamus-envelope` nor `ctx-internal-medullary-lamina` is hidden or layer-dimmed (137 rows swept)
- the four v7 levels are anchored (+48/+58/+68/+78) and `CLIP_BOUNDS` admits them:
  x −48..48, y −55..+85, z −75..+55
- 15 plate records; the 3 v7 telencephalon plates are committed (`plate-tel-axial-58`,
  `plate-tel-coronal-fornix`, `plate-tel-sagittal-hemisphere`)

**Not Node-verifiable** (requires the browser): that the hemisphere/ghost shell renders and is
translucent enough to keep the brainstem visible at the default preset, and that a telencephalon
structure selects from the tree, search, the 3D view and the axial +58 plate.

## 6. Files added/changed by this pass

| File | Change |
| --- | --- |
| `scripts/verify/audit-checks.test.mjs` | **new** — the Tier-1 mirror of the audit's load-bearing checks (75 assertions, 8 groups), runnable with plain `node` |
| `README.md` | **v7 closure** section — the five defects with root causes and reverting gates, the two audit artifacts, the budgets, the evidence tiers and the browser-lane limitation; `audit-checks.test.mjs` added to the Scripts table |
| `docs/QA_CHANGELOG.md` | this entry |

# v7 closure — integration acceptance, RESUMED pass (`v7c-integration`)

Date: v7 closure, resumed integration. Tree: the closure commit `f32daee` + this pass.
Scope: re-run the whole acceptance suite on the committed closure, land the two gates the plan
(`PLAN-run-mtwh4t68-t8gm.md` §5 rows 9–10 signal) still required but which had never been written,
widen the Tier-1 mirror to the two coverage holes this pass found, re-prove the browser lane's
unavailability from scratch, re-derive the budgets, and commit.

## Verdict

Every gap the orchestrator's 56-check browser audit found is **closed in the shipped code**, and each
one is now covered by a gate that **bites on its own defect** (7/7 mutation-proven). Every gate that
can run in this sandbox exits 0. The browser lane still cannot run here — re-proved below with five
launch variants and a falsified alternative hypothesis — so **no Tier-2 verdict is claimed anywhere**.

## 1. What this pass changed

| File | Change |
| --- | --- |
| `scripts/verify/budget-report.mjs` | **new** — the plan's gate-table row 9 (never landed). Re-derives the three caps from the committed artifacts alone (Σ `triCount`, Σ `stat(part.file)` + the stricter whole-directory reading, Σ `stat(imaging)`), no re-bake and no precondition; exits 1 on any breach |
| `scripts/verify/closure-bite.mjs` | **new** — the plan's §4.2 mutation proof (task `v7c-qa-bite` never landed). Re-applies the exact pre-fix defect for each gap in an isolated copy (`.plate-scratch/bite/tree` + `node_modules` junction) and requires the mirror to fail; prints the failing check's own sentence and the before/after SHA-256 of every mutated file |
| `scripts/verify/audit-checks.test.mjs` | extended 75 → **91 assertions / 9 groups**: the **Learn-more links** claim (present in the browser audit at `audit.mjs` section D, missing from the mirror) and a new *Telencephalon browser sanity — Node-verifiable half* group (5 subdivisions, ghost-shell opacity + the outline branch the default preset actually takes, the four v7 anchors driving clip/snap/plate, MRI source at +58 vs CT out of source, the +58 plate's 24 labels resolving to real records, and all 42 telencephalon records carrying the full data contract) |
| `src/state/store.ts` | the preset region guard now runs **for every preset** at module load (plan §4.1 item 4): a subdivision-derived preset may only hide telencephalon records, `cortex-only` may hide none, and every hidden/emphasised id must exist — previously only the default was asserted |
| `README.md` | budget gates, the mutation table, the widened tier-1 list, and the corrected assertion count |
| `docs/QA_CHANGELOG.md` | this section |

## 2. Gate table (this pass, on the committed tree)

| # | Gate | Command | Exit | Result |
| --- | --- | --- | --- | --- |
| 1 | Data integrity | `npm run validate` | **0** | PASS — 0 errors, 0 warnings (17 levels · 183 registry entries · 160 structures · 23 tracts · 26 syndromes · 15 plates) |
| 2 | Types | `npm run check` | **0** | PASS |
| 3 | Build | `npm run build` | **0** | PASS — `index-*.js` 1,124.53 kB / 254.16 kB gzip · `vendor-three` 1,206.81 kB / 354.64 kB |
| 4 | Section pipeline | `npm run verify:pipeline` | **0** | PASS — 106/106 parts |
| 5 | Plane transform | `npm run verify:plane` | **0** | PASS |
| 6 | Audit mirror (Tier 1) | `node scripts/verify/audit-checks.test.mjs` | **0** | PASS — **91 passed · 0 failed · 9 groups** |
| 7 | Budget re-derivation | `node scripts/verify/budget-report.mjs` | **0** | PASS — 5 passed · 0 failed |
| 8 | Mutation proof | `node scripts/verify/closure-bite.mjs` | **0** | PASS — **7/7 mutations caught**, shared tree byte-identical |
| 9 | Boundary contract | `node scripts/verify/boundary-contract.mjs` | **0** | PASS |
| 10 | a11y contract | `node scripts/verify/a11y-contract.mjs` | **0** | PASS |
| 11 | Anatomy budgets | `node scripts/build-anatomy-geometry.mjs --manifest` | **0** | PASS — 570,096 tris · 13.12 MiB GLB · per-part caps |
| 12 | Imaging QA | `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | **0** / **0** | PASS — 49 anchored photographs, 8.71 MiB / 10 MiB |
| 13 | Runtime audit (Tier 2) | `npm run verify:audit` | **4** | **NOT RUN** — environment unusable, 0 of 56 checks executed |
| 14 | Browser probe (Tier 2) | `npm run verify:browser` | **4** | **NOT RUN** — same cause |
| 15 | Browser acceptance (Tier 2) | `npm run verify:acceptance` | **4** | **NOT RUN** — same cause |

Rows 13–15 are reported as *command + exit code + reason*. **`exit 4` is neither a pass nor a product
failure**; printing a pass/fail count for them in this sandbox would report something that did not
happen.

## 3. The browser lane, re-proved in this pass (not inherited)

The previous pass's conclusion was re-tested from scratch, and the *assumed* cause was falsified:

- **Five** Chrome launch variants, all fresh profiles inside the workspace: `--headless=new` (plain),
  `+ --disable-crash-reporter --disable-breakpad`, `+ --single-process`, `--headless=old`, and
  `+ --enable-crash-reporter --crash-dumps-dir`. Every process **exited before rendering** with
  `mojo/public/cpp/platform/platform_channel.cc:108 Check failed: . : Access is denied. (0x5)`,
  `--dump-dom` producing **zero bytes** on a `data:` URL — i.e. no page was ever created.
- **The named-pipe hypothesis is FALSE for this sandbox:** a Node named-pipe server in the same
  environment succeeds (`\\.\pipe\dsh-pipe-selftest-1` → OK), so the "confined modes cannot open named
  pipes" rule of the harness documentation does not explain this failure. The denial is Chrome's own
  process/handle-level Mojo setup (`OpenProcess: Access is denied (0x5)` immediately before it) —
  which is why no flag combination gets past it.
- **No fallback browser is reachable:** `chrome-headless-shell` is not installed, and the network is
  unavailable for downloading one (`Invoke-WebRequest` to the Chrome-for-Testing bucket fails), so the
  audit cannot be given a smaller browser either.

## 4. Per-gap evidence, with the gate that bites when the fix is reverted

Mutation proof (`node scripts/verify/closure-bite.mjs`, isolated copy, shared tree verified
byte-identical afterwards):

| Gap | Defect re-applied | Gate's own sentence when it caught it |
| --- | --- | --- |
| (1) context-loss overlay | `data-context-lost` removed from the recovery card | *"the overlay does not expose data-context-lost"* |
| (2) PostFX composer guard | `if (contextLost) return null` removed | *"PostFX has no contextLost guard: the composer would read getContextAttributes().alpha (null)"* |
| (3) CT coverage honesty | "MRI is the modality of record" sentence dropped | *"the y = +58 toolbar note satisfies the coverage predicate — CT coverage statement at axis y at 58.0 au …"* |
| (4a) default preset | default hides `ctx-thalamus-envelope` | *"store: the default preset hides \"ctx-thalamus-envelope\" (diencephalon) …"* (module-load throw) |
| (4b) preset region guard | `cortex-only` hides `ctx-cerebral-cortex` | *"store: preset \"cortex-only\" hides the telencephalon record \"ctx-cerebral-cortex\" …"* (module-load throw) |
| (5) `?panelfail` containment | probe marker removed from the failure card | *"[data-panel-probe] count is 0 on the failure card, expected exactly 1 …"* |
| (6) coverage-aware CT sweep | CT source limit ignored in the modality sweep | *"a CT credit is refused above the source (the honest state is \"no CT here\") …"* |

(4a) and (4b) prove both directions of the region guard: the **default** assertion and the new
**per-preset** assertion each throw before a single frame renders.

## 5. Budgets, re-derived from the committed artifacts

| Budget | Cap | Measured | Verdict |
| --- | --- | --- | --- |
| Rendered triangles | ≤ 800,000 | **570,096** (106 parts: 86 nucleus · 15 context · 5 ventricle; largest `ctx-hemisphere-r` 81,448) | PASS |
| Committed anatomy GLB | ≤ 14 MiB | **13,755,548 B = 13.12 MiB** (106/106 manifest files present) · whole `src/assets/anatomy` tree **13.18 MiB** in 108 files (strict reading, also PASS) | PASS |
| Imaging payload | ≤ 10 MiB | **9,132,531 B = 8.71 MiB** in 80 files | PASS |

Headroom: 229,904 tris · 0.88 MiB GLB · 1.29 MiB imaging.

## 6. Telencephalon sanity — what is verified here, and what is not

Node-verified in this pass (assertions in the mirror, driven by the shipped data/manifests/sources):

- the tree's telencephalon region carries **all 5 subdivisions**, each populated (Basal ganglia 9 ·
  Cerebral cortex 10 · Lateral ventricles 7 · Limbic system 6 · Telencephalic white matter 14)
- the shell is translucent **by construction and by state**: `GHOST_OUTLINE_OPACITY = 0.05`,
  `GHOST_SHELL_OPACITY = 0.14`, the opacity ternary picks the outline branch, `cortexHidden` is read
  from the store's hidden set, and the default preset really hides `ctx-cerebral-cortex` — while no
  non-telencephalon record is hidden or layer-dimmed
- the four v7 anchors (`lvl-tel-thalamostriate@48`, `lvl-tel-basal-ganglia@58`,
  `lvl-tel-centrum-semiovale@68`, `lvl-tel-convexity@78`) exist, sit inside `CLIP_BOUNDS`
  (y −55..+85), and the 3 telencephalon plates' `levelId`s resolve
- the live section at y = +58: the MRI grid really covers it (y −55..+85, nearest station 57.50 au,
  0.50 au away) while CT is measurably out of source (58 > 36.25 au), so *Auto* resolves to MRI and
  the UI must state the limit — which `ctCoverageStatement('y', 58)` does
- the axial **+58 plate** renders **24 labels** over 19 distinct structure ids, **all** resolvable in
  the taxonomy, and at least one maps to a telencephalon record
- all **42** telencephalon records carry function + clinical + connections (the audit's
  "caudate → 1,597-char record" evidence reproduces as 1,636 chars for `ctx-caudate-nucleus`)
- Learn-more links resolve for a v7 record (2 external http(s) links, first Wikipedia)

**Not observed here (needs a browser):** that pixels actually appeared — scene luminance, live-section
paint counts, the real `WEBGL_lose_context` cycle, pointer/focus interaction (tree clicks, search,
sliders, keyboard plate selection, PiP sync), the `?panelfail` query string through the dev server, and
that the ghost shell *reads* as translucent on screen. The two observed paint facts quoted in the
earlier entry came from the orchestrator's own browser run, not from this pass.

## 7. Deviations and honest limitations

- **`npm run verify:audit` does not exit 0 here, by design.** The dispatched brief listed it in this
  task's evidence contract; the refined plan of record (§5, §7, §8) explicitly removes the browser
  lanes from every evidence contract and forbids reporting a pass/fail count for them in this sandbox.
  The plan wins, and the brief's instruction says so. The substitute evidence is gates 6–8 above.
- **The CT half of `TELENCEPHALON_PLAN §9` ("MRI/CT underlays cover the hemispheres at any plane") is
  a measured source limit**, not a bug: the Visible Human CT ends at y ≈ 36.25 au, so the honest state
  above it is *"MRI is the modality of record"* — implemented, asserted, and mutation-proven.
- **Ribbon fidelity, unanchored fiber tracts and registration tolerance** remain as recorded in the
  earlier entry; nothing in this pass re-measures them.
