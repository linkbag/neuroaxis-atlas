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

