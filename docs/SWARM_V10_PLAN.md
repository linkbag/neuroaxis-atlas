# NeuroAxis v10 — display/UI/UX round 2

**Status:** spec for execution (swarm run v10; the orchestrator finishes/audits whatever the run does not).
Written after the v9 closure (`docs/SWARM_V9_PLAN.md` §8, commit `f5d3ed2`). Interfaces named here were located
in the current source; where this document is uncertain it says so, and the architect task verifies it.

**The five items (user's words → requirement)**

1. *"The plane helpers in the 3D view should be extended to telencephalon"* → §1
2. *"Allow user to turn on and off just telencephalon, mesencephalon etc. (see division in the reference
   figure); right now everything is on in the 3D/2D views, and can be too overwhelming"* → §2
3. *"Allow users to drag all 4 corners of the PiP window to adjust"* → §3
4. *"Some cortical divisions are not correct (weird triangles of temporal, limbic etc. at some levels)"* → §4
5. *"No need to show 'Cerebral cortex (context envelope)' text as it's already obvious, still show the
   contour"* → §5

## 0. Ground rules (unchanged from v9 — they are what made that run pass)

- **Frozen invariants:** every gate in `README.md`'s tier list must exit 0 after your task. That now includes
  `validate` (0 errors/0 warnings), `check`, `build`, `verify:pipeline`, `verify:plane`, `verify:anatomy`
  (27/27), `verify:somatotopy` (45/45), `verify:cortical-lobes` (200/200), `verify:imaging-fit` (347/347),
  `verify:pip-contract`, `verify:audit-checks`, `verify:closure-bite`, `verify:boundary-contract` (22/22),
  `verify:a11y-contract`, `verify:budget-report`, `verify-imaging-v4`, `verify-imaging-v4b`. Nothing below
  `y = +45` moves.
- **The two browser lanes cannot run in the agent sandbox** (Chrome is denied). Never claim
  `verify:acceptance` / `verify:audit`; the orchestrator runs them. Write checks that would fail if the
  behaviour regressed, and say plainly which claims you could not observe.
- **Canonical space:** x = +patient-left, y = +superior, z = +anterior, 1 au = 1.2 mm; `CLIP_BOUNDS`
  (`src/components/viewer3d/clipPlanes.ts`) is the single runtime declaration and must stay that way — do not
  hardcode a box in a second place.
- **File ownership is exclusive** (see §6). `package.json` belongs to the integrator: state the npm script
  line you need in your report instead of editing the file.
- **Honesty contract:** a limitation is stated with a number and a method. A check that "passes" by not
  running is the failure mode this project has already been bitten by twice — make every check actually
  execute.
- **Do not break the store's load-time assertions** (`src/state/store.ts` bottom) or their Node mirror
  (`scripts/verify/audit-checks.test.mjs`). They are executable invariants about the default framing and the
  presets, and one of them was already broken once by an unmirrored change.

## 1. Plane helpers must cover the telencephalon  [task `plane-helpers-extent`]

**Where:** `src/components/viewer3d/PlaneHelpers.tsx` (mounted from `Viewer3D.tsx` line ~908).

**The defect.** The helper quads do not span the canonical box: in the app the sagittal/coronal/transverse
helper grid stops at the brainstem extent, so a user cutting through the hemispheres sees no plane boundary
where the cortex actually is. The helper must span the **whole `CLIP_BOUNDS` rectangle of its two in-plane
axes**, derived from `CLIP_BOUNDS` (not typed in), for all three planes, and must stay legible (grid spacing
constant in au, not in line count) when the box got bigger.

**Acceptance.** A committed check asserts, for each axis, that the helper quad's extents equal that axis'
`CLIP_BOUNDS` extents in the two in-plane axes (to a small tolerance) and that the extents were derived from
`CLIP_BOUNDS` rather than a literal (read the source, don't just measure). `verify:plane` stays green
(it reads `SectionPiP.tsx` tokens only, but the in-plane transform facts must not drift).

## 2. Division-level visibility (the reference figure's groupings)  [task `division-toggles`]

**Where:** `src/state/store.ts` (`layers.regions`, `toggleRegionLayer`, `ALL_REGIONS`), `src/components/Legend.tsx`
(the per-region checkboxes), `src/components/TaxonomyTree.tsx` (region rows dim via `layerOff`).

**What to add.** The existing per-region toggles stay exactly as they are. Add a **division control** that
groups them the way the reference figure does, so a user can isolate one part of the brain in one action:

| division | regions it contains |
| --- | --- |
| Prosencephalon (forebrain) | telencephalon + diencephalon |
| Mesencephalon (midbrain) | midbrain |
| Rhombencephalon (hindbrain) | pons + cerebellum (metencephalon) + medulla (myelencephalon) |
| Cerebral vasculature | vasculature (its own system — never grouped into a division) |

Each division row needs (a) an on/off **checkbox** that sets exactly its regions, and (b) a **solo** action
that turns everything else off. Solo is the point of the item: "everything on is visually intense".
State where you put the control and why (the Legend is the natural home; the header is the alternative),
and keep it keyboard-reachable with an accessible name (the a11y gate reads the DOM).

**Acceptance.** A committed check (Node, importing the store) asserts: soloing each division leaves exactly
that division's regions layer-on and everything else off; the checkbox path restores/toggles exactly its
regions; `vasculature` is never swept into a division; the store's load-time assertions still hold; and the
**default** layer state is unchanged (a fresh boot still reports `brainstem-focus`). `verify:audit-checks`
and `verify:closure-bite` stay green — they read `DEFAULT_LAYERS` and the preset table.

## 3. PiP: drag any of the four corners  [task `pip-resize-corners`]

**Where:** `src/components/viewer3d/SectionPiP.tsx` (one resize handle today: `onResizePointerDown/Move/Up`,
`pipSizeAfterCycle`, `sectionPipSizePresetOf`), `src/styles/sectionPip.css`.

**What to add.** Four corner handles (NW, NE, SW, SE), each dragging in the direction that corner implies:
the opposite corner stays put, so dragging NW grows up-left (the panel's left/top edges move), and the size
still clamps to `SECTION_PIP_SIZE_MIN`/`MAX` through the store's own `clampSectionPipSize`. Keep: keyboard
resize (Arrow keys, Shift = 4× — it now works; do not regress it), the size-cycle button, persistence across
reloads, and the `aria-label` that carries the live size. Each handle needs an accessible name that names its
corner.

**Acceptance.** Update `scripts/verify/pip-contract.mjs` (it is yours) to assert all four handles exist with
distinct accessible names and that each handle's drag direction moves the edge it owns while the opposite edge
stays fixed; keep every existing pip-contract assertion green, and keep the panel's DOM contract that the
browser lane reads (`.pip-panel`, `.pip-readout`, `.pip-orient`, the axis buttons by exact text, the size
aria-label, `.pip-window` after `.viewer3d-canvas` in DOM order).

## 4. Cortical-division artefacts  [task `cortical-divisions-quality`, with §5]

**Where:** `src/components/section/corticalLobes.ts` (`classifyCorticalPoint` — the fitted position rule,
`splitLoopByDivisionPlane`/`splitLoopByDivision` — the run splitting), `src/components/section/SectionCanvas.tsx`
(`buildLobeLayer`, the label anchors), `scripts/verify/cortical-lobes.mjs`.

**The defect (user's screenshot).** At some levels the division layer shows small wrong wedges: a green LIMBIC
patch near the inferior midline and an orange TEMPORAL triangle floating on the lateral edge. Both are the
partition's own geometry, not the ribbon's: a *run* is a consecutive stretch of one loop with one classification,
so where the rule flips back and forth across a boundary (or where a loop belongs to a structure that is not the
ribbon at all) you get slivers and triangles. Fix the **classification and the run rule**, not the symptom:
- classify by position in canonical space with boundaries that follow the ribbon (the fitted planes were fitted
  at v9 — re-derive them if the fit is what produces the slivers, and say which you changed);
- a run must be a *meaningful* stretch: drop slivers below a documented minimum arc length (in au, printed in
  the file header and in your report) instead of painting them;
- a division label is drawn at most once per plane and only on a division whose drawn area clears a documented
  threshold — that is what makes "TEMPORAL" appear on a triangle today;
- verify against the ACTUAL contours at several planes: report, per division per plane, the run count and the
  arc-length distribution, and show that no division is present only as slivers.

**Acceptance.** `scripts/verify/cortical-lobes.mjs` (yours) asserts the new rule on the reference planes: the
minimum-run threshold is enforced (no run below it is painted), every division present in a plane has at least
one run above the label threshold, the partition is deterministic, and no point is assigned outside the ribbon.
It must print the per-plane per-division table so the numbers are visible, and the honest caveat stays (the
division is fitted to the DERIVED ribbon, not a gyral map).

## 5. Drop the cortex label, keep the contour  [task `cortical-divisions-quality`]

**Where:** `src/components/section/SectionCanvas.tsx` (the label pass that draws a context record's name —
"Cerebral cortex (context envelope)" appears up to twice per frame at present), and the same canvas is what the
PiP mounts, so one fix covers both surfaces.

**Requirement.** The `ctx-cerebral-cortex` context envelope keeps its **contour and fill** and loses its
**text label** — in the Plates canvas and in the PiP. Do not remove other context labels (the thalamus
envelope, the level chips and the division labels are all still useful); suppress this one record's label
specifically, with a comment saying why (the cortex outline is self-evident and the label overlapped the
division labels). The label must also disappear from the canvas' accessibility tree, not just visually.

## 6. Task graph

| # | task | role | writes (exclusive) | blocked by |
| --- | --- | --- | --- | --- |
| 0 | architect review → refined `PLAN.md` | architect | `PLAN.md` | — |
| 1 | `plane-helpers-extent` | builder | `src/components/viewer3d/PlaneHelpers.tsx`, `scripts/verify/plane-helper-extent.mjs` | 0 |
| 2 | `division-toggles` | builder | `src/state/store.ts`, `src/components/Legend.tsx`, `src/components/TaxonomyTree.tsx`, `scripts/verify/division-toggles.mjs` | 0 |
| 3 | `pip-resize-corners` | builder | `src/components/viewer3d/SectionPiP.tsx`, `src/styles/sectionPip.css`, `scripts/verify/pip-contract.mjs` | 0 |
| 4 | `cortical-divisions-quality` (items 4+5) | builder | `src/components/section/corticalLobes.ts`, `src/components/section/SectionCanvas.tsx`, `scripts/verify/cortical-lobes.mjs` | 0 |
| 5 | `review-qa` | reviewer | `scripts/verify/audit.mjs` | 1, 2, 3, 4 |
| 6 | `integrate-docs` | integrator | `README.md`, `docs/CONTENT_INVENTORY.md`, `docs/SWARM_V10_PLAN.md`, `package.json` | 5 |

Tasks 1–4 run in parallel and touch disjoint files. Task 5 re-points the browser checks at the new behaviour
(four PiP handles, solo divisions, helper extents, cortical-division quality, no cortex label) and must not
delete an existing check without saying which and why. Task 6 wires npm scripts for the three new check
scripts, documents with measured numbers, and runs the full non-browser sweep.

## 7. Acceptance for the run

- Every gate in §0 exits 0, with the new checks included in the sweep output.
- Items 1–5 each have a user-visible control/behaviour and a committed check that fails if it regresses.
- Claims only observable in a browser are marked as orchestrator-verified-only until the orchestrator runs
  `verify:acceptance` + `verify:audit` and records the numbers.

---

# 8. Closure (run v10) — what shipped, with its measured numbers

Written by the integrator (`integrate-docs`) after `review-qa` (`scripts/verify/audit.mjs` + reviews) landed.
**Everything below was re-measured in this worktree on the committed v10 state** (Node v24.18.0, Windows);
the sweep table in §8.7 is the integrator's own run, not a builder's. Two gates are **RED and not ours** —
they are named with their exact output in §8.7 and §8.8 item 8, not papered over.

## 8.1 What shipped, per item

| # | item | control / behaviour | files | committed check that fails if it regresses |
| --- | --- | --- | --- | --- |
| 1 | plane helpers span the whole `CLIP_BOUNDS` rectangle | all three helper sheets now cover their two in-plane axes over the full canonical box, derived at runtime from `CLIP_BOUNDS` with a constant ~4 au grid cell | `src/components/viewer3d/PlaneHelpers.tsx` | `npm run verify:plane-helper-extent` (new, **196 passed · 0 failed**) |
| 2 | division-level visibility | a **Divisions** group inside the Legend's existing *Layer toggles*: one on/off **checkbox** + one **Solo** action per division (Prosencephalon · Mesencephalon · Rhombencephalon · Cerebral vasculature) | `src/state/store.ts` (additive), `src/components/Legend.tsx` | `npm run verify:division-toggles` (new, **250 passed · 0 failed**) |
| 3 | PiP draggable from all four corners | four corner handles NW/NE/SW/SE, each moving the edges its corner owns, clamped through the store's own `clampSectionPipSize`; keyboard resize, cycle button, persistence and the size `aria-label` kept | `src/components/viewer3d/SectionPiP.tsx`, `src/styles/sectionPip.css` | `npm run verify:pip-contract` (**187 passed · 0 failed**, was 83) |
| 4 | cortical-division slivers/triangles | documented run-quality floors (arc **10 au** = 12 mm, drawn area **25 au²**, label area **25 au²**), absorption to a fixpoint, wrapped stretches kept whole, label anchor competing by **drawn area** | `src/components/section/corticalLobes.ts`, `src/components/section/SectionCanvas.tsx` | `npm run verify:cortical-lobes` (**519/519 assertions**, prints the per-plane per-division table) |
| 5 | drop the "Cerebral cortex (context envelope)" label, keep the contour | `NO_CANVAS_LABEL_RECORD_IDS = {ctx-cerebral-cortex}` gates both canvas label sites **and** the `.section-structure-chip`; `drawPart` (contour + fill) untouched; reaches the PiP because the PiP mounts the same canvas | `src/components/section/SectionCanvas.tsx` | `npm run verify:cortical-lobes` group E2 (real `react-dom` render: cortex selected ⇒ markup `""`) |

`package.json` (integrator-owned) gained exactly two lines, nothing pre-existing touched:

```json
"verify:plane-helper-extent": "node scripts/verify/plane-helper-extent.mjs",
"verify:division-toggles":    "node scripts/verify/division-toggles.mjs"
```

## 8.2 Item 1 — measured helper extents, per axis

`CLIP_BOUNDS` (single declaration, `src/components/viewer3d/clipPlanes.ts`): **x[−58, 58] · y[−55, 116] · z[−76, 72]**;
`GRID_CELL_AU = 4`. Pre-v10 the sheets were literal quads: transverse `[96, 82]` → x ±48, z ±41; sagittal
`[82, 100]` → z ±41, y −55…+45; coronal `[96, 100]` → x ±48, y −55…+45.

| axis | in-plane u/v | world u rect | world v rect | quad W × H (au) | cells u/v (au) | grid vertices | grid lines | centre |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **x** (sagittal sheet) | z / y | z[−76.00, 72.00] | y[−55.00, 116.00] | 148.00 × 171.00 | 4.000 / 3.977 (37 × 43) | 164 | 38 + 44 | (x = clip, 30.50, −2.00) |
| **z** (coronal sheet) | x / y | x[−58.00, 58.00] | y[−55.00, 116.00] | 116.00 × 171.00 | 4.000 / 3.977 (29 × 43) | 148 | 30 + 44 | (0.00, 30.50, z = clip) |
| **y** (transverse sheet) | x / z | x[−58.00, 58.00] | z[−76.00, 72.00] | 116.00 × 148.00 | 4.000 / 4.000 (29 × 37) | 136 | 30 + 38 | (0.00, y = clip, −2.00) |

**What that fixed, in au and mm.** The two sheets with `y` in plane were **71.0 au = 85.2 mm short of the box
vertex** at y = +116 (68.7 au = 82.4 mm above the measured ribbon top at **+113.7**); the transverse sheet missed
**31.0 au anteriorly** (z +41 → +72) and **35.0 au posteriorly** (z −41 → −76); and the two sheets with `x` in
plane missed **10.0 au** laterally on each side (±48 → ±58). Unchanged visual contract: colour
`#38bdf8`, opacity 0.07 quad / 0.22 grid, `DoubleSide`, `depthWrite false`, renderOrder 30/31, raycast disabled,
group `clip-plane-helpers`, still gated by `clip.showHelper`.

**Derived, not typed — and the gate bites.** Lane C strips comments *and* string payloads from the source: the
remaining 31 numeric literals contain none of {26, 30.5, 41, 45, 48, 55, 56, 58, 72, 76, 82, 96, 100, 116}; the
file imports `CLIP_BOUNDS` from `./clipPlanes` and builds exactly one `BufferGeometry` outside the render path.
Lane D mutates a scratch copy of `clipPlanes.ts` (`x.max 58→70`, `y.max 116→130`, `z.min −76→−90`): widths
116 → 128 / 148 → 162, heights 148 → 162 / 171 → 185, cell counts 29 → 32 / 37 → 41 / 43 → 46, cells still ~4 au,
and the shipped files' SHA-256 are identical before/after (`clipPlanes.ts` `d4447170f9f9`, `PlaneHelpers.tsx`
`a31171b10876`).

**Deviation from §1 of this plan.** The plan specified `GridHelper` args `[W, H, divisionsU, divisionsV]`. Three
0.169's `GridHelper(size, divisions)` takes **one** divisions value and is always square, so it cannot span
116 × 171 au with au-constant cells (it would coarsen the y cells and overhang the quad). Shipped instead: the
same lines as a `LineSegments` built in the quad's **own local XY frame with the quad's rotation** — one rotation
per sheet, so quad and grid cannot desync.

## 8.3 Item 2 — the division layer sets, and what each action does

`DIVISIONS` (`src/state/store.ts:1044`), asserted at module load to **partition** `ALL_REGIONS`:

| division (`data-division`) | label | regions | regions it leaves ON when soloed | every other region |
| --- | --- | --- | --- | --- |
| `prosencephalon` | Prosencephalon (forebrain) | `telencephalon` + `diencephalon` | `[diencephalon, telencephalon]` | off |
| `mesencephalon` | Mesencephalon (midbrain) | `midbrain` | `[midbrain]` | off |
| `rhombencephalon` | Rhombencephalon (hindbrain) | `pons` + `cerebellum` + `medulla` | `[cerebellum, medulla, pons]` | off |
| `vasculature` | Cerebral vasculature | `vasculature` (its own system) | `[vasculature]` | off |

- Union of the four divisions = all **7** regions; regions claimed by two divisions = **none**; regions no division
  reaches = **none** (the load-time block throws otherwise, proven by a mutated `DIVISIONS` table in an isolated copy).
- **Checkbox path** (`toggleDivision` → `toggleDivisionLayers`): a complete division turns all of its regions off, an
  incomplete one turns all of them on (union, idempotent), and toggling twice restores the previous region set exactly.
- **Boot is unchanged**: a fresh boot still reports **`brainstem-focus`**, `DEFAULT_LAYERS.regions` =
  `[cerebellum, diencephalon, medulla, midbrain, pons, telencephalon]` with the `vasculature` **region** off (v8) and
  the `vessel` **kind** on; the rendered control boots `[true, true, true, false]`.
- **No persistence**: no storage key exists for a division (asserted), and `TaxonomyTree.tsx` was deliberately **not**
  modified — solo already dims the tree through the existing `layerOff()` rule.
- **A11y**: 4 real checkboxes + 4 real `<button>` Solo actions above the per-region rows, with distinct accessible
  names, e.g. `Toggle the Rhombencephalon (hindbrain) division (pons + cerebellum + medulla)` and
  `Show only the Cerebral vasculature division (vasculature)`; `npm run verify:a11y-contract` stays 38/38.

## 8.4 Item 3 — measured PiP corner geometry

Clamp window **224×170 … 880×640 px** (store `clampSectionPipSize`, unchanged), default 224×170. Four rendered
handles in `PIP_CORNER_ORDER = ['se', 'nw', 'ne', 'sw']` (south-east **first** so `document.querySelector('.pip-panel .pip-resizer')`
still resolves to the handle the browser lane focuses, and the first handle keeps the bare `class="pip-resizer"`).

`pipsizeFromCornerDrag(corner, start, dx, dy)` from a 400 × 300 px start — the numbers the gate prints:

| corner | +40 / +40 | −400 / −400 (clamped) | +5000 / +5000 (clamped) | (+40, 0) | (0, +40) |
| --- | --- | --- | --- | --- | --- |
| nw | 360 × 260 | 800 × 640 | 224 × 170 | 360 × 300 | 400 × 260 |
| ne | 440 × 260 | 224 × 640 | 880 × 170 | 440 × 300 | 400 × 260 |
| sw | 360 × 340 | 800 × 170 | 224 × 640 | 360 × 300 | 400 × 340 |
| se | 440 × 340 | 224 × 170 | 880 × 640 | 440 × 300 | 400 × 340 |

Geometry in the panel's local frame (0, 0)–(400, 300) with a +40/+40 drag — the dragged corner follows the
pointer and the opposite corner keeps **both** coordinates bit-identical:

| corner | size after | dragged corner | opposite corner (must not move) |
| --- | --- | --- | --- |
| nw | 360 × 260 | (40, 40) | (400, 300) — was (400, 300) |
| ne | 440 × 260 | (440, 40) | (0, 300) — was (0, 300) |
| sw | 360 × 340 | (40, 340) | (400, 0) — was (400, 0) |
| se | 440 × 340 | (440, 340) | (0, 0) — was (0, 0) |

Kept: one shared arrow-key handler (Arrow = 16 px, Shift = 4×, **absolute** `size + delta`), the small⇄large cycle,
`neuroaxis.sectionPipSize` persistence, the `aria-label` carrying the live `W×H` size, and the DOM contract the
browser lane reads (`.pip-panel`, `.pip-readout`, `.pip-orient`, the axis buttons by exact text, `.pip-window`
after `.viewer3d-canvas`). CSS: `.pip-resizer` is the shared 24 × 24 px hit target with four corner anchors and
exactly the two diagonal cursors; the two bottom-left text lines were moved out of the 24 px handle band.

## 8.5 Item 4 — the per-plane, per-division arc-length table (slivers gone)

Rule: `MIN_DIVISION_RUN_AU = 10` (own-vertex arc), `MIN_DIVISION_AREA_AU2 = 25` (shoelace of the path the canvas
fills/strokes), `MIN_DIVISION_LABEL_AREA_AU2 = 25` (equal by construction, so *painted ⇒ has a label-eligible run*
is an inequality the gate asserts). Arc = own-vertex polyline length (au); area = drawn path area (au²).

| plane | division | runs | arc min / med / max (au) | area min (au²) |
| --- | --- | --- | --- | --- |
| y=0 | temporal | 1 | 48.92 / 48.92 / 48.92 | 329.77 |
| y=0 | occipital | 1 | 80.93 / 80.93 / 80.93 | 378.96 |
| y=0 | limbic | 1 | 37.47 / 37.47 / 37.47 | 148.17 |
| y=14 | frontal | 1 | 63.43 / 63.43 / 63.43 | 152.60 |
| y=14 | temporal | 2 | 25.98 / 108.04 / 108.04 | 56.41 |
| y=14 | occipital | 1 | 57.51 / 57.51 / 57.51 | 382.35 |
| y=14 | insula | 1 | 40.18 / 40.18 / 40.18 | 172.38 |
| y=30 | frontal | 1 | 32.18 / 32.18 / 32.18 | 107.72 |
| y=30 | parietal | 2 | 15.58 / 107.16 / 107.16 | 35.66 |
| y=30 | temporal | 1 | 79.13 / 79.13 / 79.13 | 167.22 |
| y=30 | occipital | 1 | 138.60 / 138.60 / 138.60 | 1304.42 |
| y=48 | frontal | 3 | 17.95 / 69.78 / 77.16 | 29.17 |
| y=48 | parietal | 2 | 36.20 / 165.72 / 165.72 | 116.23 |
| y=48 | temporal | 1 | 33.24 / 33.24 / 33.24 | 37.61 |
| y=48 | occipital | 1 | 45.17 / 45.17 / 45.17 | 233.53 |
| y=48 | limbic | 1 | 34.89 / 34.89 / 34.89 | 110.51 |
| y=58 | frontal | 2 | 84.27 / 113.25 / 113.25 | 326.22 |
| y=58 | parietal | 2 | 38.44 / 160.85 / 160.85 | 87.41 |
| y=58 | occipital | 1 | 12.72 / 12.72 / 12.72 | 29.76 |
| y=68 | frontal | 1 | 239.07 / 239.07 / 239.07 | 2216.17 |
| y=68 | parietal | 1 | 156.17 / 156.17 / 156.17 | 1788.23 |
| y=78 | frontal | 2 | 22.45 / 344.27 / 344.27 | 42.89 |
| x=6 | frontal | 6 | 17.41 / 41.61 / 260.79 | 36.98 |
| x=6 | parietal | 2 | 142.44 / 148.49 / 148.49 | 426.83 |
| x=6 | occipital | 2 | 19.26 / 88.14 / 88.14 | 51.36 |
| z=0 | parietal | 1 | 231.74 / 231.74 / 231.74 | 1941.90 |
| z=0 | temporal | 3 | 15.07 / 40.54 / 123.49 | 27.35 |
| z=0 | limbic | 1 | 17.18 / 17.18 / 17.18 | 56.11 |
| z=40 | parietal | 1 | 196.49 / 196.49 / 196.49 | 1889.41 |
| z=40 | limbic | 1 | 22.54 / 22.54 / 22.54 | 82.16 |

**Sliver census over every painted run at the 13 reference planes** (`npm run verify:cortical-lobes`, group c7):

| division | runs | arc < 2 | arc < 5 | arc < 10 | area < 1 | area < 10 | 1-vertex | arc median (au) | area median (au²) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| frontal | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 69.78 | 152.60 |
| parietal | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 148.49 | 1108.88 |
| temporal | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 48.92 | 167.22 |
| occipital | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 57.51 | 378.96 |
| insula | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 40.18 | 172.38 |
| limbic | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 34.89 | 110.51 |
| **total** | **47** | **0** | **0** | **0** | **0** | **0** | **0** | — | — |

47 painted runs · 30 labels · 3 dropped loops (32 vertices, every one sub-threshold, area ≤ 23.87 au²).
The independent raw re-cut of the same planes holds **72 raw spans, 23 of them below a floor → 22 absorbed by the
rule**; the shortest raw span is **y=0 frontal, arc 0.00 au, 1 own vertex** — the pre-v10 artefact this run removed.
Over the 34-plane user grid: **548 → 265 runs**, 199 spans absorbed, 33 dropped loops (269 vertices), **174 labels**,
0 painted divisions without a label-eligible run, 0 floor violations. Determinism: re-splitting the reference-plane
loops twice is byte-identical. **Nothing in `CORTICAL_BOUNDARIES` moved** — re-checked, not re-fitted — and the 17
boundary spot checks still pin the same divisions to exact float equality.

**Honest limit of this item (measured, not hidden).** Absorption re-labels the absorbed stretch with the
*neighbour's* division, so where a boundary crosses the ribbon at a shallow angle the colour is the neighbour's
along 10–25 au of contour. A whole loop that is one sub-threshold stretch is **not painted at all** (it keeps the
context fill): measured on 3 of the 13 reference planes and 33 of 49 user-grid planes.

## 8.6 Item 5 — the label change, and what still carries the string

`NO_CANVAS_LABEL_RECORD_IDS: ReadonlySet<string> = new Set(['ctx-cerebral-cortex'])` (`SectionCanvas.tsx:221`)
suppresses the **text** at both canvas label sites (`drawSelectedLabel` → `meta.group`, `drawHoverLabel` →
`hover.group`) and at the `.section-structure-chip`. Census from the shipped taxonomy: **45 context records
exist (including `ctx-cerebral-cortex`); 44 keep their canvas label** — the thalamus envelope, the level chips and
the division labels are untouched. A real `react-dom` render proves the surfaces: cortex selected ⇒ chip markup
`""`; thalamus envelope selected ⇒ `102` chars with `.section-structure-chip` present. `drawPart` (contour + fill)
is unchanged, so the **contour stays** in the Plates canvas **and** in the PiP, which mounts the same component.

**Not shipped (flagged, outside every task's write scope).** The suppressed string is gone from the canvas' own
DOM and its scoped accessibility subtree, **but on the same screen** the exact record name still reaches the app's
accessibility tree through the info rail and the taxonomy tree, and `PlateRenderer.tsx:106-108` injects an
`<svg><title>` carrying `entry.name` onto the plate's `[data-structure="ctx-cerebral-cortex"]` group. The three
authored plate SVGs additionally draw their **own** hand-written cortex labels:
`plate-tel-axial-58.svg:53` *"Cerebral cortex / (cortical ribbon)"*, `plate-tel-coronal-fornix.svg:65`
*"(envelope)"*, `plate-tel-sagittal-hemisphere.svg:58` *"Cerebral cortex (medial surface)"*. §5 of this plan put
the plate SVGs outside every task's write list; the integrator records them here rather than editing them.

## 8.7 The run's full non-browser sweep (integrator's own run, actual exit codes)

| gate | command | exit | measured tail |
| --- | --- | --- | --- |
| data | `npm run validate` | **0** | `✔ Validation PASSED — 0 errors, 0 warning(s)` · 236 registry entries (0 awaiting a record) · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels |
| types | `npm run check` | **0** | `tsc --noEmit`, no diagnostics |
| bundle | `npm run build` | **0** | `✓ built in 10.88s` |
| pipeline | `npm run verify:pipeline` | **0** | `138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)` |
| plane transform | `npm run verify:plane` | **0** | `✔ plane transform QA PASSED — 10827 assertions` |
| **item 1 (new)** | `npm run verify:plane-helper-extent` | **0** | `plane-helper-extent: 196 passed · 0 failed — exit 0` |
| anatomy | `npm run verify:anatomy` | **1** | **RED — environment, not product**: `spawnSync powershell EPERM` before any verdict prints (the script pipes a child's stdio and this sandbox denies it); red at base, no task in this run owns the file |
| somatotopy | `npm run verify:somatotopy` | **0** | `45 passed · 0 failed` |
| cortical divisions | `npm run verify:cortical-lobes` | **0** | `cortical-lobes: 519/519 assertions passed · PASS` (prints §8.5's tables) |
| imaging fit | `npm run verify:imaging-fit` | **1** | **RED — environment, not product**: `FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM` (0 assertions run); red at base |
| PiP contract | `npm run verify:pip-contract` | **0** | `187 passed · 0 failed` (prints §8.4's tables) |
| audit mirror | `npm run verify:audit-checks` | **0** | `92 passed · 0 failed · 7 informational · 9 group(s)` — **green now**, superseding the v9 close-out note (the check's dimmed-row predicate gained the documented vascular exemption in `f5d3ed2` with a second assertion pinning it: *"the 14 vascular rows are off at default framing through the REGION layer only"*) |
| **item 2 (new)** | `npm run verify:division-toggles` | **0** | `250 assertions passed · 0 failed` (prints the 7-state behaviour trace of §8.3) |
| closure bite | `npm run verify:closure-bite` | **0** | `7/7 mutations caught by the mirror · shared tree untouched` · restored copy `92 passed · 0 failed` — **green now** (its reference run, `audit-checks.test.mjs`, is green) |
| boundaries | `npm run verify:boundary-contract` | **0** | `22 passed · 0 failed` |
| a11y | `npm run verify:a11y-contract` | **0** | `38 passed · 0 failed` |
| budgets | `npm run verify:budget-report` | **0** | `599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB — all inside their caps` |
| imaging v4 | `node scripts/verify-imaging-v4.mjs` | **0** | `✔ v4 imaging QA PASSED — 9.02 MiB in 82 files (cap 10.00) · v4-added 3.81 MiB in 28 files (cap 4.00)` |
| imaging v4b | `node scripts/verify-imaging-v4b.mjs` | **0** | `OK — 22 NLM Visible Human cryosections, -52.20 … 34.04 au, credit verbatim in 5 records, anchors clear of every other transverse anchor by > 1.5 au` |

`verify:acceptance`, `verify:audit` and `verify:browser` were **not run and are not claimed** — Chrome cannot
start in the agent sandbox (every lane exits 4, *"no check was run"*). `node scripts/verify/audit.mjs` does execute
its non-browser half: it prints
`v10 source facts: CLIP_BOUNDS x[-58, 58] y[-55, 116] z[-76, 72] · declaration sites 1 · grid cell 4 au ·
division floors 10 au / 25 au2 (label 25 au2) · PiP clamp 224x170...880x640 px · suppressed canvas label ids
[ctx-cerebral-cortex]` and then exits 4 at the browser half.

## 8.8 What did NOT ship, and why (every item with a number)

1. **GridHelper → LineSegments** for the helper grid (three 0.169's `GridHelper` is square with one divisions
   value; §8.2). Same material, same ~4 au spacing, one rotation per sheet.
2. **`TaxonomyTree.tsx` untouched** by item 2: solo dims the tree through the existing `layerOff()` rule, and the
   plan's §6 write list was narrowed accordingly.
3. **Item 3's "the opposite corner stays put" is a size-rule fact, not a screen-space one.** The panel is
   CSS-docked right/bottom (`sectionPip.css`), so a width change **always** moves the left edge and a height change
   **always** moves the top edge, and the SE handle — whose own corner is the pinned one — cannot follow the
   pointer. `PIP_CORNER_EDGES` still enumerates the two edges each corner owns (that is what the size rule uses);
   `review-qa` therefore made the browser lane assert **the size rule plus the dock invariant** and *print* the
   per-corner screen readout instead of encoding the false edge claim. **Flagged for the orchestrator**: on screen,
   NW is the corner that behaves exactly as the plan's sentence describes.
4. **Absorption can drop a body that clears both floors** — measured by `review-qa` over 218 planes × both
   ribbons: **1,836 painted runs, 0 floor violations, 0 metric mismatches, 164/170 "geometry but no painted run"
   rows sub-threshold-only, and 6 in this new class**, where an earlier absorption collapses a span's shoelace
   area and a later pass absorbs it into a *different* division (traced: `ctx-hemisphere-l` y=32 frontal, raw
   41.82 au arc / 129.46 au², painted as occipital; z=15 insula 35.04 → 1.59 au² → absorbed into limbic, the whole
   69-vertex loop then painted as one 635 au² temporal run). **The committed gate asserts nothing about this
   class** — it is a known limit of the shipped rule, not a green claim.
5. **The committed cortical gate slices `ctx-hemisphere-l` only**, while the canvas paints **both** ribbons
   (`sectionAssets.ts:168-171`): at y=0 the gate reports 3 runs / 3 divisions, both ribbons give 6 runs /
   4 divisions. `review-qa` measured the browser lane's artefact expectations from both ribbons for that reason.
6. **Item 1's extent is not decidable from pixels**: with the shipped default camera the sheets project far
   outside a 1500 × 950 viewport for the old **and** the new box (x-sheet bbox y −794…9637 px new vs −452…1441 px
   old), which is why the browser lane reads rendered geometry through a three.js scene bridge and why
   `verify:plane-helper-extent` stays the authoritative gate.
7. **Item 5's string still exists elsewhere** (§8.6): info rail, taxonomy tree, `PlateRenderer` `<title>`, and three
   authored plate SVGs that draw their own cortex labels.
8. **`verify:anatomy` and `verify:imaging-fit` are RED in the agent sandbox** for the recorded piped-child-stdio
   reason (§8.7); both are red at base, both are unchanged by this run, and **neither is claimed green here**.
9. Minor, recorded not fixed: the Legend's Solo button has no CSS rule of its own (`.legend-divisions` /
   `.legend-division` / `.legend-solo`), so it renders as an unstyled UA button — reachable and named (the a11y
   gate is 38/38), but **no gate asserts its hit size**: `a11y-contract.mjs`'s ≥24 px rules cover `.btn-snap` and
   `.pip-btn` only, so this is browser-only territory the orchestrator may want to look at; and `Legend.tsx` lost
   its trailing newline.

## 8.9 Evidence tiers — orchestrator-browser-verified vs non-browser-only

| claim | tier |
| --- | --- |
| helper sheets span the `CLIP_BOUNDS` rectangle on all three axes, derived (not literal), ~4 au cells, unchanged material/renderOrder contract, geometry built once | **non-browser verified** — `verify:plane-helper-extent` 196/0, executing the shipped render path with a bite proof |
| a solo leaves exactly one division's regions on; the checkbox toggles exactly its regions; the arteries are never swept into a division; boot still `brainstem-focus`; the Legend renders 4 + 4 named controls | **non-browser verified** — `verify:division-toggles` 250/0 (real `react-dom` render + the shipped handlers driven in an isolated copy) |
| four corner handles exist, are named per corner, and the size rule moves the edge each corner owns while the opposite corner is fixed **in the local frame** | **non-browser verified** — `verify:pip-contract` 187/0 |
| the run rule's floors, the per-plane per-division arc table, the zero-sliver census, determinism, and the suppressed label in a rendered canvas tree | **non-browser verified** — `verify:cortical-lobes` 519/519 (real `react-dom` render, both label sites, the chip) |
| **that the helper now covers the cortex on screen and stays legible at 43 grid lines; that a real pointer drag on each of the four handles moves the box while the dock-pinned edges stay put; that arrow keys move it 16 px (Shift ×4) and the size survives a reload; that the division checkboxes/solo paint what they claim in a live page; that the cortical-division layer looks right at the artefact planes in Plates **and** PiP; that the cortex label is absent on screen** | **orchestrator-browser-only** — Chrome cannot start in the agent sandbox; `audit.mjs` Q0–Q6 (re-pointed by `review-qa`) is what decides them, and until the orchestrator runs `verify:audit` + `verify:acceptance` these are **unverified claims**, not passes |
| `verify:anatomy` (27/27) and `verify:imaging-fit` (its own numbers) | **orchestrator environment only** — both exit 1 in the agent sandbox before printing a verdict |
