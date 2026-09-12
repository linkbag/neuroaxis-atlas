# NeuroAxis v9 — somatotopy, cortical lobes in section, imaging registration, and a simulated-section PiP

**Status:** spec for execution (swarm run v9, or direct execution if the swarm stalls — the orchestrator owns
that decision). Written by the orchestrator after the v8 closure (`docs/NEUROATLAS_V8_PLAN.md` §9), against the
five items the user listed. Where this document states an interface, that interface is verified against the
current source, not assumed.

**The five items (user's words, then the requirement this document derives from them)**

1. *"add a map of Somatotopic arrangement in the sensory and motor cortices"* → §1
2. *"In the 2D live section view, can we get one layer more granular cortical breakdown … show the rough
   cortical division of the cerebral cortex"* → §2
3. *"CT image overlay with brain regions contour is clearly off, so does the photo/ staining view"* → §3
4. *"Besides CT, MRI, Photo, can we add an image off view (just show simulated sections)"* → §4
5. *"For the 3D view, the 2D section on the bottom right shouldn't show the clipped sections, also it
   shouldn't show plane helper at all. For this 2D section window, allow user to adjust window size, only show
   the simulated sections as in point 4, don't overlap any real photos"* → §5

**Item 5 interpretation (explicit, so it can be challenged).** The PiP becomes a **2D simulated-section
panel**: it shows the same simulated section the Plates tab computes (worker-clipped contours, taxonomy
fills, lobes, labels) and NOT the 3D clipped scene, NOT the plane-helper quads, NOT any real imagery. The
current GPU stencil-cut rig (`SectionPiP.tsx`, ~1,000 lines of stencil parity / MSAA fallback / slice
backdrop) loses its reason to exist; retiring it must be done cleanly (no dead code left mounted, its audit
checks repurposed rather than deleted, the removal documented). If a reviewer disagrees, the fallback
position is to keep the GPU cut behind the "Live section" toggle and add the simulated panel as the default —
but the default must match the user's words.

## 0. Ground rules for every task

- **Frozen invariants (do not break):** `npm run validate` 0 errors/0 warnings; `npm run check` exit 0;
  `npm run build` exit 0; `npm run verify:pipeline` exit 0; `npm run verify:plane` exit 0;
  `npm run verify:anatomy` exit 0 (27/27). Nothing below `y = +45` moves: no brainstem envelope bbox may
  change, and MRI/CT legacy-level slice content must stay `max |Δ| 0 of 255`.
- **Canonical space:** x = +patient-left, y = +superior, z = +anterior, **1 au = 1.2 mm**;
  `CLIP_BOUNDS` x [−58, 58], y [−55, 116], z [−76, 72] (`src/components/viewer3d/clipPlanes.ts` is the single
  runtime declaration; `scripts/validate-data.mjs` `AXIS_BOUNDS` mirrors it).
- **Orientation conventions:** transverse = anterior up / patient-left on image RIGHT; sagittal = superior
  up / anterior right; coronal = superior up / patient-left right. These are verified by `verify:plane`
  (10,827 assertions) — do not re-derive them.
- **Slug contract:** `^(nuc|tract|vent|surf|vasc|ctx)-[a-z0-9-]+$`; kinds `nucleus|tract|ventricle|surface|vessel|context`;
  regions `telencephalon|diencephalon|midbrain|pons|medulla|cerebellum|vasculature`.
- **Data discipline:** author into `src/data/` only; the validator is the contract. Every id must be
  registered in `src/data/taxonomy.json` FIRST (registry-first). Raw/derived scratch stays gitignored
  (`assets-src/`, `.dsh-scratch/`, `.plate-scratch/`); only processed outputs are committed.
- **Honesty contract:** a limitation is stated with a number, in the record's own `contextNote`, the README
  or the relevant doc — never hidden, never claimed as verified when it is not. If you cannot verify
  something (e.g. no browser in the agent sandbox), say so explicitly instead of claiming a pass.
- **File ownership is exclusive.** Only touch files in your task's `writes` list. `package.json` is owned by
  the integrator: if you need an npm script, state the exact line in your report instead of editing it.
- **Browser lanes (`verify:audit`, `verify:acceptance`) cannot run in the agent sandbox** (Chrome is
  denied: `platform_channel.cc:108 Check failed: Access is denied (0x5)`). Do not claim them; the
  orchestrator runs them.

## 1. Somatotopic map — motor (M1) and sensory (S1) strips  [task `somatotopy`]

**Deliverable.** A somatotopic map readable in 3D, in the tree, in the live section and on the plates, as
**records** (so every existing surface picks it up for free): one record per body segment per strip, e.g.
`ctx-m1-toe`, `ctx-m1-leg`, `ctx-m1-trunk`, `ctx-m1-arm`, `ctx-m1-hand`, `ctx-m1-face`, `ctx-m1-tongue`,
and the S1 mirror set. Region `telencephalon`, subdivision **`Functional cortical areas`** (existing — do not
invent a subdivision), `kind: 'context'`, `parent` = `ctx-m1` / `ctx-s1` (taxonomy `parent` nests them in the
tree under the area records, which already exist).

**Placement must be probed, not guessed.** The cortical ribbon is a derived shell (`ctx-hemisphere-l`,
~81k tris). Derive each segment's `origin3d`/`size3d` from the ribbon geometry itself — walk the strip along
the central-sulcus neighbourhood from the medial surface (toe/leg, paracentral) down the lateral convexity
(trunk, arm, hand, face, tongue), and use the measured local surface normal to offset the patch so it hugs
the surface. A probe script may live in `.dsh-scratch/` (gitignored) and MUST be reported; a committed
`src/geometry/somatotopy.ts` must carry the resulting table as data plus the rule that produced it.

**3D rendering.** A dedicated overlay pass (`src/components/viewer3d/SomatotopyOverlay.tsx`), wired from
`SceneLayers.tsx`, draws each segment as a small oriented patch (or marker) with a **body-part label**,
using one colour ramp from face → hand → arm → trunk → leg so the ordering is legible at a glance. It must
respect the existing layer gating (region + kind), selection/hover dimming and the shared `highlightIdSet`
(selecting `ctx-m1-hand` must lift its patch and dim the rest). Prefer reusing `NucleusMesh` over a new
mesh/material path if that gets you selection, labels and dimming for free; state which you did and why.

**Why records beat a bespoke layer here:** they are searchable, selectable, annotated, painted by the live
section and labelled on plates without touching any of those subsystems — and the section work in §2 will
then show the homunculus in a section for free.

**Acceptance.** 12–16 new records, all registered, all with a `contextNote` that says the placement is
schematic-on-the-derived-ribbon; `validate`/`check` exit 0; the tree shows the two strips with their segments
in somatotopic order; the 3D overlay is visible only when the telencephalon region and the `context` kind
layers are on; no record's placement falls outside `CLIP_BOUNDS`; a small non-browser check proves the
ordering and the M1/S1 pairing (medial→lateral sequence is monotonic in the coordinate you chose, and each
M1 segment has an S1 counterpart with the same body part).

## 2. Cortical breakdown in the 2D live section  [task `cortical-lobes`]

**Deliverable.** A new **toggleable section layer** that re-colours the cortical ribbon in the live section by
**lobe / rough division** — frontal, parietal, temporal, occipital, insula, limbic (cingulate +
parahippocampal) — with labels, drawn over the existing "Cerebral cortex (context envelope)" fill instead of
replacing it, so the reader can switch between "cortex" and "which part of the cortex".

**Where it goes.** The live section is computed by a Web Worker (`src/components/section/contourWorker.ts`)
that clips the committed GLB triangles by the plane, chains closed contours and fills them even-odd with
taxonomy colours; `SectionCanvas.tsx` paints them. The partition rule must therefore be **geometric and
cheap**: assign each contour vertex (or each contour pixel) to a division by position in canonical space.

**Rule requirements.** Use real anatomical boundaries, expressed in canonical coordinates and derived from the
baked hemisphere ribbon (not invented): the central sulcus (frontal|parietal), the lateral fissure
(temporal|frontal/parietal), the parieto-occipital + calcarine boundary (occipital), the circular sulcus /
insular limen (insula), and the callosal/cingulate + collateral boundaries (limbic). Fit each boundary to the
ribbon from the geometry (probe), then commit the fitted values as documented constants in
`src/components/section/corticalLobes.ts` with the method and residuals in the file header.

**Acceptance.** The layer has a user-visible toggle and legend; on the reference planes each division gets a
non-empty share (a committed check asserts this per plane and prints the shares); the partition never
assigns a point outside the ribbon; labels follow the section's own orientation convention (do not re-derive
it); `verify:pipeline` stays exit 0 (the worker's existing outputs must not regress); the honest caveat
("divides the DERIVED ribbon, not a gyral map") is in the file header, the legend and the README.

## 3. CT / photo mis-registration  [task `imaging-registration`]

**The defect.** The real-slice layers are placed by a fixed documented affine that was never registered to
the atlas contours: in the coronal CT view the brain sits in the lower part of the frame while the contours
float above it, and the UBC photograph is a small patch in the middle. The data is on disk
(`src/assets/imaging/ct.bin`, `mri-t1.bin`, `stains/*.jpg`, manifests with `fit {scale, dx, dy, mirrorX}`).

**Deliverable.** A re-runnable fitter (`scripts/fit-imaging-affine.mjs`) that, for a set of reference planes
per modality, measures the **atlas brain mask** (from the committed GLBs via the same clipping the section
pipeline uses) against the **image's own brain mask** (threshold on the committed voxels/JPEG), and fits the
correction (translation + scale, optionally a 2-D affine) that minimises mask mismatch. Then:
- the corrected parameters are committed into the imaging manifests, with **measured residuals before and
  after** printed by the script and stored next to the parameters;
- `src/components/section/imageLayers.ts` applies them (it is the single place the layers are sampled);
- the UI keeps stating the alignment honestly — if a residual is still large, the note says so with the
  number, rather than the current blanket disclaimer standing in for a measurement.

**Method constraints.** Deterministic (no clock/RNG), Node-only, no network, no new dependency. Report the
optimiser (grid/coordinate descent is fine), the objective, the search bounds, per-plane residuals and the
number of planes that improved vs got worse — never only the wins. If some modality cannot be fitted
honestly (e.g. the cryosection photographs have no shared frame), say so in the report and keep the current
placement for that modality with the reason recorded.

**Acceptance.** `node scripts/fit-imaging-affine.mjs --report` prints the table and exits 0; the committed
manifests carry the corrections; a check (`scripts/verify/imaging-fit.mjs`) asserts the residuals recorded in
the manifests match what the fitter recomputes (so a hand-edit cannot silently diverge), and that no
correction moved a legacy-level slice by more than the fitted amount (the MRI/CT `max |Δ| 0 of 255`
invariant in `verify:anatomy` must still hold — if it cannot, the invariant and the reason must be updated
deliberately, in the open).

## 4. An "images off" view  [task `section-ux`, with §5]

**Deliverable.** A first-class **images-off** state: the section view (Plates tab canvas AND the PiP) shows
the simulated section only, with real imagery explicitly off — not merely "unavailable at this plane". The
store already has `SectionUnderlayKind = 'auto' | 'mri' | 'ct' | 'stain' | 'none'` with a "Simulated only"
button; the work is to make that state *legible and complete*: a label that says what it does ("Simulated
only (no imagery)"), the same choice honoured by the PiP, the coverage/credit line replaced by an honest
"real imagery is switched off" statement (not a coverage excuse), and the state persisted like the other
underlay settings. If a distinct `'off'` kind is cleaner than reusing `'none'`, add it and keep `'none'`
working (it is a persisted user value in `localStorage`).

## 5. The PiP becomes a simulated-section panel  [task `section-ux`, blocked by §2]

Requirements, in the user's terms:
1. **No clipped 3D geometry** in the panel — it shows the simulated section, not the 3D cut.
2. **No plane helper** — not even the in-plane quads.
3. **No real imagery** — no CT/MRI slice, no photograph, ever, in this panel (independently of the Plates
   tab's modality choice, which keeps working as today).
4. **Resizable window** — the user can change the panel's size; the choice persists across reloads (same
   `localStorage` pattern as the existing hide/show state and the `pip-large`/`pip-small` toggle).
5. The panel keeps its existing chrome that is still meaningful: axis override, plane readout, orientation
   labels (L/R/A/P/S/I, patient-left convention), hide/restore behaviour and the restore pill.

**Also required:** the retired GPU path must be removed deliberately — no module left mounted with no
purpose, the stencil/parity/MSAA machinery deleted with it (or kept only if some other consumer still needs
it, in which case say which), and `scripts/verify/audit.mjs`'s PiP-specific checks **repurposed** to assert
the new contract (no imagery in the PiP, no plane helper, resizable, size persists, hide/restore still
works) rather than deleted. The context-loss recovery overlay must keep working for the main canvas.

## 6. Task graph

| # | task | role | writes (exclusive) | blocked by |
| --- | --- | --- | --- | --- |
| 0 | architect review → refined `PLAN.md` | architect | `PLAN.md` | — |
| 1 | `somatotopy` | builder | `src/data/structures/telencephalon-somatotopy.json`, `src/data/taxonomy.json`, `src/data/webRefs.ts`, `src/geometry/somatotopy.ts`, `src/components/viewer3d/SomatotopyOverlay.tsx`, `src/components/viewer3d/SceneLayers.tsx`, `scripts/verify/somatotopy.mjs` | 0 |
| 2 | `cortical-lobes` | builder | `src/components/section/corticalLobes.ts`, `src/components/section/contourWorker.ts`, `src/components/section/SectionCanvas.tsx`, `src/components/section/sectionAssets.ts`, `scripts/verify/cortical-lobes.mjs` | 0 |
| 3 | `imaging-registration` | builder | `scripts/fit-imaging-affine.mjs`, `scripts/verify/imaging-fit.mjs`, `src/assets/imaging/**`, `src/components/section/imageLayers.ts` | 0 |
| 4 | `section-ux` (items 4+5) | builder | `src/components/viewer3d/SectionPiP.tsx`, `src/components/viewer3d/PipSection.tsx` (new), `src/components/viewer3d/Viewer3D.tsx`, `src/components/PlatesTab.tsx`, `src/state/store.ts`, `src/styles/sectionPip.css`, `src/styles/*.css` | 2 |
| 5 | `review-qa` | reviewer | `scripts/verify/audit.mjs` | 1, 2, 3, 4 |
| 6 | `integrate-docs` | integrator | `README.md`, `docs/CONTENT_INVENTORY.md`, `docs/SWARM_V9_PLAN.md`, `package.json` | 5 |

**Concurrency note:** tasks 1–3 run in parallel and touch disjoint files. Task 4 waits for 2 because the PiP
reuses the section renderer. Task 5 reviews the whole change and re-points the browser checks; task 6 wires
npm scripts, documents, and runs the full non-browser sweep.

## 7. Acceptance for the run

- All six non-browser gates exit 0 (§0), with `verify:anatomy` still 27/27.
- Items 1–5 each have a committed, user-visible control and a committed check that would fail if the
  behaviour regressed.
- Every claim about the browser (what the PiP shows, that no real imagery appears in it, that the lobes
  render) is marked as **orchestrator-verified only** if it was not actually observed in Chrome; the
  orchestrator runs `verify:audit` + `verify:acceptance` afterwards and records the numbers.
- Documentation updated: README (features + honest limits), `docs/CONTENT_INVENTORY.md` (the imaging
  registration numbers, the lobe partition method and residuals, the somatotopy placement method), and this
  plan's own closure section.

---

## 8. Closure — what shipped, what is measured, what did not ship

**Written by task `integrate-docs` (task 6) on the tree as committed at the end of the run.** Every number
below was re-measured in that task with the commands named next to it, on the **committed** artifacts and
sources — not copied from a task report. Where a task's own report and the recomputation disagree, the
recomputation is what this section states and the disagreement is called out.

Registry at closure: **236 taxonomy entries** · **213 structure records** in 17 files · **23 tracts** ·
26 syndromes · 15 plates · 17 level anchors (`npm run validate`).

### 8.1 Item 1 — somatotopic map of M1/S1 (`somatotopy`) — SHIPPED

- **16 records** (`ctx-m1-*` / `ctx-s1-*` × toe, leg, trunk, arm, hand, face, tongue, larynx), all
  **registry-first** (the 16 ids were appended to `src/data/taxonomy.json`, which went 220 → 236 entries),
  region `telencephalon`, subdivision `Functional cortical areas` (existing), `kind: 'context'`,
  `laterality: 'paired'`, `parent` = `ctx-m1` / `ctx-s1`, `meshes: false`, each with levels, refs, synonyms,
  connections, function, clinical and a `contextNote` that carries the probe's residual.
- **Placement is probed, not guessed.** `node .dsh-scratch/somatotopy-probe7b.mjs` (gitignored scratch,
  reported in the task report) walks the committed `ctx-hemisphere-l` GLB — 40,388 verts / 81,128 tris,
  bbox x [1.00, 55.47] y [−6.80, 113.70] z [−72.82, 70.59], signed volume +301,371.7 au³ so vertex normals
  point outward, mean edge 1.306 au — snaps each segment to its nearest ribbon vertex and reports the
  residual between the requested landmark and the vertex found. The committed table lives in
  `src/geometry/somatotopy.ts` with the rule that produced it.
- **Measured (`npm run verify:somatotopy`, 45 assertions, exit 0):**
  - probe residuals: **M1 min 0.01 / median 0.04 / max 0.16 au**; **S1 min 0.29 / median 0.78 /
    max 2.29 au** (the three least certain S1 segments — `ctx-s1-leg` 2.29, `ctx-s1-larynx` 2.20,
    `ctx-s1-toe` 1.00 au — are named in their own `contextNote`).
  - ordering: `order` 0…7 per strip, **arc length strictly increasing** (M1 min gap 7.72 au = 9.26 mm,
    S1 6.27 au = 7.52 mm) **and canonical x strictly increasing** (M1 min gap 1.93 au, S1 3.29 au).
  - pairing: **8/8** body parts have one M1 and one S1 segment; per-part posterior offset 4.45–10.53 au.
  - all 16 `origin3d`, their ±`size3d`, the normal-offset patch centres and the mirrored (−x) extents are
    inside `CLIP_BOUNDS x[−58,58] y[−55,116] z[−76,72]`.
  - surface contact re-measured against the GLB (no probe run needed): every patch centre within 0.36 au of
    a ribbon vertex; worst sampled rim point 3.05 au = 3.67 mm at `ctx-s1-trunk` (tolerance 3.5 au).
- **Routing decision (the spec asked which):** a **dedicated oriented-patch pass**, not `NucleusMesh`.
  `NucleusMesh` has no orientation input (it scales a unit sphere or draws a canonical-space GLB), takes its
  colour from `record.color`, and floats one bbox label for the whole shape. The overlay reuses
  `makeAnatomyMaterial('context', colour)`, the store's layer gate
  (`regions.has('telencephalon') && kinds.has('context')`), the `hidden` set, the shared `highlightIdSet`
  (dim to 0.15) and the `label3d` path, so selection, dimming and labels come from the same code paths.
- **Honest limit:** the patch is **schematic on the DERIVED ribbon** (see §8.6 item 1). The 3D labels render
  for the hovered/selected segment only (two `label3d` nodes per segment, one per hemisphere), so at rest the
  map reads by colour ramp alone.
- **Orchestrator-only:** that the patches, their labels and the hover/select behaviour look right in a page.

### 8.2 Item 2 — cortical lobes in the 2D live section (`cortical-lobes`) — SHIPPED

- `src/components/section/corticalLobes.ts` (new) carries `classifyCorticalPoint` + the fitted boundary
  constants, their measurement and their per-boundary residual in the file header, under the caveat
  **"THIS DIVIDES THE DERIVED RIBBON, NOT A GYRAL MAP"**. `SectionCanvas.tsx` gained the draw pass, a
  user-visible **"Cortical divisions"** toggle (`aria-pressed`, persisted) and a legend that renders the
  caveat verbatim. The partition is deliberately on the **main thread** (PLAN §7.5): `contourWorker.ts`'s
  protocol is unchanged, so `verify:pipeline` cannot regress.
- **Boundaries, fitted from committed geometry only** (probe series reported in the task report): central
  sulcus from the measured dorsal-ridge notch (ridge 106 → 90 at x 20–26), residual **0.0 au at both measured
  endpoints and 5.4 au at the hand-knob reach**; lateral fissure anchored on the measured MCA M1 junction
  (nearest ribbon vertex 3.13 au) and M2 exit (5.93 au), residual **3.9 au at the M2 exit**; occipital pinned
  to an 11.05 % ribbon share at z ≤ −52; insula fitted through the Sylvian corridor as an ellipsoid holding
  3.34 % of ribbon vertices (morphometric series 1.8–2.5 %); limbic = callosal band + medial temporal band,
  3.4 au = 4.1 mm of cingulate beyond the callosal surface.
- **Measured (`npm run verify:cortical-lobes`, 200 assertions, exit 0).** Whole-ribbon vertex shares:
  frontal 44.30 %, parietal 21.63 %, temporal 17.60 %, occipital 9.27 %, limbic 3.86 %, insula 3.34 %.
  Over the 13 reference planes (2,715–13,833 raster cells each):

  | division | share | planes present | planes absent |
  | --- | --- | --- | --- |
  | frontal | 47.60 % | 9 | y = 0 |
  | parietal | 27.30 % | 7 | y = 14, y = 78, z = 0 |
  | temporal | 12.90 % | 6 | y = 68, y = 78, x = 6, z = 40 |
  | occipital | 6.60 % | 7 | y = 78, z = 0, z = 40 |
  | limbic | 3.50 % | 6 | y = 30, y = 68, y = 78, z = 40 |
  | insula | 2.11 % | 3 | y = 0, 48, 58, 68, 78, x = 6, z = 40 |

- **Honest limits, with numbers:** (1) **three of the 13 reference planes — y = −46, −24, −8 — MISS the
  ribbon entirely** (its inferior limit is y = −6.803), so they carry no division at all; (2) the plan's
  "each division is non-empty on the reference planes" holds only in the weak reading, and the per-division
  absence list above is the honest form of it; (3) the ±0.5 au raster also loses two **sub-cell slivers**
  (parietal at z = 0 and limbic at z = 40 have run vertices but no raster cell); (4) the derived ribbon has
  **no insular surface** — the ellipsoid paints the deepest available limen tissue, not real insular cortex;
  (5) `limbic : rest = 1 : 26.8` against 1 : 8–1 : 20 in the literature: the band is the 1–2 gyrus strip the
  probe could measure, not the whole limbic lobe.
- **Orchestrator-only:** that the layer, its toggle and its legend render in a page.

### 8.3 Item 3 — CT / photo mis-registration (`imaging-registration`) — **PARTLY SHIPPED, HONESTLY**

- **The CT half is NOT fixed, and the fit that would have shipped was measured and REJECTED.** The
  re-runnable fitter (`scripts/fit-imaging-affine.mjs`, deterministic coarse-to-fine grid search, 3 stages,
  9×13² → 5×11² → 5×9², no RNG/clock/network) measures the atlas brain mask (34 committed GLB parts through
  the section pipeline's own clipping) against each modality's own image mask on 512² in-plane grids.
  - CT, 8 reference planes: image mask 302,860 / 979,371 voxels (30.9 %), mean ROI IoU **0.0569 → 0.1428**
    for the per-plane winners (8 improved, 0 worse) and mean centroid residual **18.09 → 10.64 au**.
  - **But only one similarity can ship**, and it fails its own gate: mean residual **18.09 → 20.39 au**
    (median 10.82 → 34.04 au), worst single plane **+15.24 au**, improving 2/8 planes → **`applied: false`**;
    the committed CT placement is unchanged and the manifest states the reason with those numbers.
  - MRI is the same story with smaller numbers: mean residual **9.40 → 17.75 au** on the chosen similarity
    (per-plane winners 6.93 au, worst single plane +14.79 au), improving 3/8 planes → **`applied: false`**.
  - Why a "better" IoU is not an improvement here, in the fitter's own words: the atlas mask is the
    **brain** and the image mask is the **head's soft-tissue envelope** (no brain segmenter exists in this
    repo and no dependency may be added), so only **6.6 % (CT) / 8.0 % (MRI)** of the atlas lands on image
    mask; a translation/scale search is not comparing two views of the same object. Reported, not tuned away.
- **The photograph/stain half IS fixed, materially.** All **24** measurable PNG plates were corrected and the
  corrections are **applied** — mean IoU **0.0741 → 0.4468**, **24 improved · 0 worsened · 0 kept**.
  Selected per-plate before → after (ROI IoU / centroid residual in au): `ubc-h20` 0.343 → 0.731 / 2.28 →
  0.80 · `ubc-h17` 0.099 → 0.699 / 20.28 → 1.48 · `ubc-h15` 0.110 → 0.624 / 21.01 → 2.00 · `ubc-c07`
  0.028 → 0.348 / 3.91 → 1.32 · `ubc-h12` 0.090 → 0.349 / 16.26 → 11.47 · `ubc-h13` 0.099 → 0.414 /
  15.99 → 14.09 (the two weakest corrections — the committed placement was already close, which is why the
  gain is small and the residual barely moves).
  The earlier "extent repair" override is part of the shipped record: a plate whose committed placement was
  0.16 × 0.09 the atlas cross-section has no meaningful tissue centroid, so the centroid gate is overridden by
  the extent repair and the record says so in the plate's own `applyReason`.
- **What is NOT measured: 49 JPEG plates** (`vhp-*` 22, `ubc-m*` 17, `bmm-*` 10) are recorded as
  **`unmeasurable: no-decoder`** with the count and the reason (no JPEG decoder exists in the repo, no new
  dependency is allowed), and they keep their committed placement. **3 more** (`wikict-axial-*`) carry no
  committed `fit` and are `not-fittable`. Nothing about those 52 plates is claimed.
- **The frozen invariant held: no grid moved.** `src/assets/imaging/ct.bin` and `mri-t1.bin` and both
  manifests' `dims`/`originAu`/`spacingAu` are byte-identical to HEAD (the only manifest change is the
  additive `registration.display` block), so `verify:anatomy`'s MRI/CT `max |Δ| 0 of 255` legacy-level
  invariant is untouched — the correction is display-time only.
- **RED GATE — reported, not papered over.** `npm run verify:imaging-fit` **fails on the committed tree**, and
  the failure was made measurable despite the sandbox: the committed gate re-runs the fitter as a **piped
  child process**, which this sandbox denies, so the command itself stops at
  `FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM` (exit 1, no assertions run).
  The fitter's own `--json` output was therefore captured by file redirection and fed to a **byte-identical
  copy of the gate with only that transport swapped** (`.dsh-scratch/v9-imagingfit/imaging-fit.local.mjs`,
  gitignored scratch; 5 insertions / 9 deletions against the committed file, nothing else changed), which
  completes: **289 assertions, 20 failures**. 18 are real defects in the committed state —
  - **16 × "the manifest stores this plane"** — the gate compares every recomputed plane against
    `registration.display.planes`, and the committed `ct-manifest.json` / `mri-manifest.json` carry **no
    `planes` array at all** (keys: `planesFitted, improved, worsened, unchanged, roi, roiIouBefore,
    roiIouAfterPerPlaneWinners, roiIouWithChosenCorrection, min/maxRoiIouBefore,
    mean/maxCentroidResidual{Before,AfterPerPlaneWinners,WithChosenCorrection}Au, meanAtlasCoverage{Before,
    After}, toleranceIou, toleranceAu, note`). The fitter's `--report` path and the gate disagree about the
    committed shape; §3's "measured residuals before and after **stored next to the parameters**" is only
    half-stored.
  - **2 × "`sectionImages.ts` carries the accepted correction"** — for `ubc-c13` / `ubc-c14` the shipped
    literal is `3.108820` while the gate's expectation is built with `Math.round(scale * 1e6) / 1e6` =
    **`3.10882`**: the values are equal, the *string* is not, so a formatting rule fails an honest record.
  - The other 2 failures are **artifacts of running the copy**, not of the tree: the copied gate lives under
    `.dsh-scratch`, where its own `git show HEAD:src/assets/imaging/*.bin` byte comparison cannot resolve, so
    `ct.bin` / `mri-t1.bin` report *"cannot read HEAD"*. On the committed gate, run from the repo root, those
    two bytes checks are the ones that pass — i.e. **the real defects are exactly the 18 above**.
  - **Fix (outside this task's write scope — stated, not executed):** either write
    `registration.display.planes` from the fitter's own per-plane table, or drop the per-plane comparison from
    the gate and keep the means; and format the `fittedFit` literals as the gate reads them (or compare
    numerically instead of by string). Both files involved
    (`src/assets/imaging/*-manifest.json`, `src/data/sectionImages.ts`) belong to task `imaging-registration`.
- **Orchestrator-only:** that the corrected photographs read as aligned on screen, and that the UI states the
  alignment with the committed numbers.

### 8.4 Item 4 — an "images off" view (`section-ux`) — SHIPPED

- One wording, four surfaces: `SECTION_UNDERLAY_KIND_DESCRIPTIONS.none` ("Simulated only (no imagery): draw
  the simulated section and nothing external"), `IMAGERY_OFF_STATEMENT` and
  `PIP_IMAGERY_WITHHELD_STATEMENT` in `src/state/store.ts`, used by the modality buttons' accessible name
  (which still *contains* the visible label, so WCAG 2.5.3 holds), the live-section state line, the panel's
  own line and `Viewer3D`'s hint.
- **Deviation from §4, stated:** the button's visible text stays **"Simulated only"** rather than becoming
  "Simulated only (no imagery)", because four call sites match it by exact text
  (`audit.mjs:656/716`, `checks.mjs:523`, `browser-probe.mjs:274`) and two of those files are outside every
  v9 task's write scope. The explanatory clause moved into the accessible name and the state lines instead.
- Persistence is unchanged and asserted: `neuroaxis.sectionUnderlay` (schemaVersion 2, field-wise merge) —
  `'none'` is a persisted user value and keeps working, so no distinct `'off'` kind was added (PLAN §7.13).
- **Honest limit:** `'none'` is a hard short-circuit in the one sampling place (`resolveSliceModality`
  returns `{modality:'none'}`); that the canvas then paints nothing but the simulated section is a
  **browser** observation (orchestrator-only), asserted here only as shipped code.

### 8.5 Item 5 — the PiP becomes a simulated-section panel (`section-ux`) — SHIPPED

- **`SectionPiP.tsx` 1,706 lines / 81,127 B → 717 lines / ~33 kB.** Deleted: the in-canvas renderer, the
  private orthographic camera + `WebGLRenderTarget`, the stencil parity/cap passes, the MSAA+parity watchdog,
  the `?pipdebug` overlay, the scissored blit, the real-slice backdrop sampler and the PiP context-loss
  mirror. `scripts/verify/pip-contract.mjs` asserts **12 retired tokens are absent from the file's code**
  (prose that documents the removal is allowed and present) and that **no other module referenced any of
  them**.
- **The panel now renders `<PipSection>`** (new, 155 lines) = its own `SectionErrorBoundary` + the **same
  `SectionCanvas`** the Plates tab mounts — one code path (PLAN §0a), so the worker pump, draw order, labels
  and the cortical-division layer cannot drift between the two surfaces.
- **Two structural guarantees that no real imagery arrives:** (a) a reference-counted **non-persisting**
  imagery scope holds the store in `kind: 'none'` while the panel's canvas is mounted (the user's own choice
  is never rewritten and is restored on unmount); (b) an unconditional pixel guard shadows `drawImage` /
  `putImageData` on that canvas' own context only, counting what it drops — those two calls are the only
  route `imageLayers.ts` uses for real imagery (5 blit sites: `drawImage` ×4, `putImageData` ×1). The guard's
  honest limits are in `PipSection.tsx`'s header: it is a JS-level shadow on one context, not a browser
  policy, and a future layer that painted imagery by another route would not be seen.
- **Resizable and persistent:** a real `<button class="pip-resizer">` (pointer drag + arrow keys, Shift ×4)
  plus the small→large cycle, written to **`sectionPipSize` / `neuroaxis.sectionPipSize`** (JSON), clamped on
  read *and* write to **[224, 880] × [170, 640]** px, travelling to CSS as
  `--pip-window-width` / `--pip-window-height` so the ≤ 900 px media query still wins. `clampSectionPipSize`
  is total and idempotent over 0, negatives, `NaN` and ±∞ (asserted).
- **Chrome kept:** axis override (X/Y/Z, `aria-pressed`), the plane readout in the audited `x = 12.0 au`
  shape (one decimal, typographic minus), the four orientation badges drawn from
  `planeGeometry.PLANE_BADGES` (the panel throws at module load if its own view table disagrees), hide
  (`Hide live section`) → restore pill (`Live section ▸`, `aria-expanded={false}`, deliberately not
  `aria-pressed`), and the narrow-viewport `.pip-toggle` tab with its exact a11y literals.
- **`npm run verify:pip-contract` (new) — 83 assertions, 5 groups, exit 0** (and its own bite check catches
  **5/5** mutations — guard removed, resizer removed, clamp window widened, retired GPU token restored, imagery
  scope not started — in an isolated copy, with the restored copy re-running green).
- **Honest limit of the new gate, measured:** zustand 4 hands the static renderer the store's
  **initial** snapshot, so `renderToStaticMarkup` always renders the boot state — verified by patching the
  store *before* the first render (`sectionAxis: 'z'`, `clip.z: 42`) and still getting the boot readout
  `y = −34.0 au`. The markup half of the gate therefore asserts the boot state, and the other axes are proven
  through the same pure functions the panel calls (`pipWorldWindow` vs `planeTransform`,
  `sectionPipSizePresetOf`, `pipImageStateText`) plus that load-time guard.
- **Orchestrator-only:** that the panel actually paints the simulated section, that a drag and the arrow keys
  move the box, that the size survives a reload, that the guard drops a live blit, and that no plane helper
  is on screen.
- **Known stale mirror, reported not fixed:** `scripts/verify/audit-checks.test.mjs:1155` still asserts
  `stillThere('the PiP still renders the real-slice backdrop', 'SectionPiP', /drawImage|backdrop/)`. It passes
  only because the retired renderer is still *named* in the file's documentation. PLAN §5.5 asked task 5 to
  replace it with the mirror of the new contract; the file is task 5's (`review-qa`), and task 5's report does
  not claim it was done — `npm run verify:audit-checks` is therefore red for a second, independent reason
  (§8.7).

### 8.6 What did not ship, and why

1. **A non-derived somatotopy / lobe map.** Both item-1 placement and item-2 boundaries are fitted to the
   **DERIVED** cortical ribbon (the white-matter surface banded outward by 2.9 au ≈ 3.5 mm — BodyParts3D has
   no cortical gray-matter concept). Neither is a gyral, cytoarchitectonic or functional map, and the residual
   numbers in §8.1/§8.2 are the size of that gap.
2. **A CT/MRI correction that ships.** Measured, gated, and rejected: the masks are a brain and a head, not
   two views of one object (§8.3). The residuals are committed and shown instead.
3. **A measured registration for 52 of the 76 committed plates** (49 JPEG + 3 without a committed `fit`).
4. **`scripts/verify/pip-contract.mjs` as task 4's artifact.** PLAN §5.6 lists the npm line and §4 lists the
   file in task 4's writes; task 4's report states it was out of scope and handed the line to this task. Task
   6 created the file so the planned gate exists and can be run; it is the **integrator's** implementation,
   not task 4's, and it is the reason the §5.5 mirror gap above is only *reported* rather than *fixed*.
5. **A green `verify:imaging-fit` and a green `verify:audit-checks`.** Both are red at closure with the exact
   failures reproduced below (§8.7). They are not frozen invariants (§0 does not list them), and every task's
   report that touched them said so.
6. **The `verify:anatomy` verdict, from inside the agent sandbox.** `anatomy-qa.mjs:294` calls PowerShell with
   piped stdio; the sandbox denies it (`spawnSync powershell EPERM`, errno −4048) and the script aborts
   **before printing its verdict** — measured again in this task (0.4 s, exit 1, the stack trace and nothing
   else). No agent may report 27/27 from here; the orchestrator records it.

### 8.7 The full non-browser sweep at closure (tails pasted verbatim)

| command | result |
| --- | --- |
| `npm run validate` | **exit 0** — 236 registry entries (0 awaiting authored records) · 213 records in 17 files · 23 tracts · 26 syndromes · 15 plates · 17 levels · 0 errors, 0 warnings |
| `npm run check` | **exit 0** (`tsc --noEmit`) |
| `npm run build` | **exit 0** (`vite build`) |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** — 10,827 assertions |
| `npm run verify:anatomy` | **NOT RUN — environment** (exit 1, `spawnSync powershell EPERM` errno −4048, before any verdict) |
| `npm run verify:somatotopy` (= the plan's `somatotopy`) | **exit 0** — 45 passed / 0 failed |
| `npm run verify:cortical-lobes` | **exit 0** — 200/200 assertions |
| `npm run verify:pip-contract` | **exit 0** — 83 passed / 0 failed |
| `npm run verify:imaging-fit` | **exit 1 — NOT RUN AS ASSERTED in this sandbox**: the committed gate re-runs the fitter as a piped child (`spawnSync node EPERM`), so it stops before any assertion. Driven instead through a byte-identical copy with the captured fitter JSON: **289 assertions, 20 failures = 18 real defects + 2 `HEAD` artifacts of the copy** (§8.3) |
| `npm run verify:audit-checks` | **exit 1 — 90 passed / 1 failed / 7 informational**: *"rows dimmed at default framing"* lists the 14 `vasc-*` rows. Pre-existing since v8 (the brainstem-focus default hides the vasculature by design while the check only exempts telencephalon); reproduced by three independent tasks against stashed HEAD files |
| `npm run verify:closure-bite` | depends on that mirror, so it also reports a baseline failure; not a v9 regression |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **never run here — Chrome is denied in the sandbox** (exit 4, "no check was run"). Orchestrator lane |

**Claims tier.** *Non-browser verified* (the table above): the records, ids, registry consistency, the
committed placement table and its residuals, the per-plane lobe shares, the clamp/persistence arithmetic, the
panel's DOM contract and the source-level wiring of every control. *Orchestrator-browser-verified only*:
that the somatotopy patches/labels render and respond to selection, that the cortical-division layer, toggle
and legend paint, that the corrected photographs look aligned and the alignment note shows the numbers, that
images-off paints nothing but the simulated section, and — for the panel — that it paints the simulated
section, that the drag and the arrow keys resize it, that the size survives a reload, that the imagery guard
drops a live blit and that no plane helper appears in it. **No item in this closure claims a browser
observation.**

