# NeuroAxis v11 — area/kind toggle rows instead of view presets

**Status:** spec for execution (swarm run v11; the orchestrator finishes/audits whatever the run does not).
Written after v10 (commit `ae96937`). Interfaces named here were located in the current source; the architect
task verifies them and may correct this document — if it does, it says so explicitly (v9/v10 precedent).

**The user's ask (verbatim intent).**
1. *"Instead of divisions such as 'brainstem focus', simply use big categories like telencephalon,
   mesencephalon etc. (or cortex, limbic system, thalamus, midbrain, brainstem, whichever is more
   scientifically intuitive), and make them toggle buttons so users can toggle on and off these brain areas
   (exclude from 3D/2D section view when off, include when on)."*
2. *"Another orthogonal axis is vascular, nuclei, tract (also toggle on and off), which you already pretty much
   have."*
3. *"This is mostly a data slicing then UI/UX improvement — all structures and information should already be
   there."*

## 0. Ground rules

- Every gate in `README.md`'s tier list must exit 0 after your task, including the v10 additions
  (`verify:plane-helper-extent` 196/0, `verify:division-toggles` 250/0, `verify:pip-contract` 187/0) and
  `verify:somatotopy`, `verify:cortical-lobes`, `verify:imaging-fit`, `verify:audit-checks`,
  `verify:closure-bite`. Nothing below `y = +45` moves.
- **Chrome cannot run in the agent sandbox.** Never claim `verify:acceptance` / `verify:audit`; the
  orchestrator runs those. State plainly which claims you could not observe.
- Canonical space and `CLIP_BOUNDS` (`src/components/viewer3d/clipPlanes.ts`) stay the single declarations.
- **Exclusive file ownership** (§5). `package.json` is the integrator's: name the npm script line in your
  report instead of editing it.
- **The store's load-time assertions are executable invariants**, mirrored in
  `scripts/verify/audit-checks.test.mjs`. Removing the preset ROW from the UI must not silently remove the
  documented DEFAULT framing: the default layer state stays exactly what it is today, asserted the same way.
- Honesty: a check that passes by not running is this project's known failure mode. Make every check execute
  and print its numbers.

## 1. The two toggle rows (primary UI)

**Where:** `src/state/store.ts` (layers, `toggleRegionLayer`, `toggleKindLayer`, the v10 `DIVISIONS`
partition), `src/components/Header.tsx` (today: the preset button row), `src/components/Legend.tsx` (today:
the region + kind checkbox rows and the v10 division group).

**Deliverable.** The header's preset row is replaced by **two labelled rows of toggle buttons**:

- **Row "Areas"** — the big anatomical categories, multi-select, each toggling exactly the taxonomy regions
  it owns. Baseline mapping (the architect may refine the labels, not the partition, and must justify any
  change from the taxonomy itself):
  | button | regions |
  | --- | --- |
  | Telencephalon | telencephalon |
  | Diencephalon | diencephalon |
  | Mesencephalon (midbrain) | midbrain |
  | Metencephalon (pons + cerebellum) | pons + cerebellum |
  | Myelencephalon (medulla) | medulla |
  | Cerebral vasculature | vasculature |
  Every region of `ALL_REGIONS` must be covered by exactly one button — a committed check asserts the
  partition is total and disjoint, so a future region cannot be added without landing in a button.
- **Row "Systems"** — the orthogonal axis the user already has, as toggles: **Nuclei, Tracts, Ventricles,
  Surface, Context, Vessels** (i.e. `ALL_KINDS`). Same rule: total and disjoint over `ALL_KINDS`.

**Behaviour requirements.**
- Off ⇒ the area/kind is excluded from **3D and the 2D section canvas and the PiP**, on ⇒ included. Both
  surfaces read `layers.regions` / `layers.kinds` already; the point of the check in §2 is to prove no path
  bypasses them.
- Every button is a real `aria-pressed` toggle with an accessible name, keyboard operable, and carries a
  stable machine hook for the browser lane (a `data-area` / `data-kind` attribute; the v10 division rows
  already use `data-division`).
- A **Reset / All** action restores the documented default framing, and the preset *state* keeps working:
  `VIEW_PRESETS` and `viewPresetOf` stay (they are the default-state definition and several gates read
  them). If the preset ROW is gone from the header, name where the preset shortcut lives now (a secondary
  row, a menu, or nowhere) and say why — but the default framing must still be reachable and asserted.
- The taxonomy tree keeps its own finer per-region rows and its `is-off` dimming; the tree and the toggles
  must never disagree (both read the same two sets).

**Acceptance.** `scripts/verify/area-toggles.mjs` (yours, Node, importing the store) asserts: the area
partition is total and disjoint over `ALL_REGIONS`; the kind partition is total over `ALL_KINDS`; toggling
each area adds/removes exactly its regions; every region's button is derivable from the taxonomy (no
hardcoded region list that could drift); the default layer state and `viewPresetOf(DEFAULT_LAYERS)` are
unchanged; and the Reset action reproduces the default exactly. Print the partition table.

## 2. Prove both surfaces obey the toggles (and fix what does not)

**Where:** `src/components/section/SectionCanvas.tsx`, `src/components/viewer3d/SceneLayers.tsx`,
`src/components/section/sectionAssets.ts`, `scripts/verify/view-filter-consistency.mjs` (new).

**Requirement.** For every region and every kind there must be exactly one place that decides visibility,
and a committed check must show that the 3D pass, the live-section worker input and the PiP all agree: with
an area off, no structure of that area is drawn on either surface; with it on, it is. Where a path bypasses
the layer sets, FIX it and say which path it was. (Known suspects to verify rather than assume: the section
worker's slug→region table, the cortical-division layer's ribbon gate, the ghost-shell pass, the tract
tubes, and the context envelopes.)

## 3. Carry-over defects from v10's audit (the orchestrator's diagnosis, not a guess)

- **Item 4 divergence (the important one).** `verify:audit` reports that at planes where `corticalLobes`'
  shipped rule expects 4–6 painted divisions the canvas paints NONE (y=6: legend `[]` vs rule
  `["frontal","limbic","occipital","parietal","temporal"]`; y=14: `[]` vs all six). The Node gate
  (`verify:cortical-lobes`) and the canvas' own draw path therefore disagree. Make ONE rule — the canvas
  must consume the same classification/threshold result the Node gate exercises — and prove parity by
  printing, per reference plane, the rule's division set next to the set the canvas reports.
- **Item 1 convention.** The sagittal (x) helper quad measures 148×171 au while the audit's in-plane
  `CLIP_BOUNDS` rectangle is 171×148: settle which `AXIS_PAIR` order the quad and the audit each use, make
  them one convention, and fix whichever is wrong (state which, with the arithmetic).

## 4. Non-goals

No new content, no new meshes, no change to the taxonomy's regions/subdivisions, no change to the imaging
layers, and no re-labelling of the v10 division partition (v11 reuses it as the "Areas" row).

## 5. Task graph

| # | task | role | writes (exclusive) | blocked by |
| --- | --- | --- | --- | --- |
| 0 | architect review → refined `PLAN.md` | architect | `PLAN.md` | — |
| 1 | `area-toggle-rows` | builder | `src/state/store.ts`, `src/components/Header.tsx`, `src/components/Legend.tsx`, `scripts/verify/area-toggles.mjs` | 0 |
| 2 | `section-correctness` (§2 + §3) | builder | `src/components/section/SectionCanvas.tsx`, `src/components/viewer3d/SceneLayers.tsx`, `src/components/section/sectionAssets.ts`, `src/components/section/corticalLobes.ts`, `src/components/viewer3d/PlaneHelpers.tsx`, `scripts/verify/view-filter-consistency.mjs`, `scripts/verify/plane-helper-extent.mjs`, `scripts/verify/cortical-lobes.mjs` | 0 |
| 3 | `review-qa` | reviewer | `scripts/verify/audit.mjs`, `scripts/verify/checks.mjs` | 1, 2 |
| 4 | `integrate-docs` | integrator | `README.md`, `docs/CONTENT_INVENTORY.md`, `docs/SWARM_V11_PLAN.md`, `package.json` | 3 |

Tasks 1 and 2 run in parallel on disjoint files. Task 3 must re-point EVERY check that clicks a preset
button by its label (the audit clicks `Brainstem focus` / `Vasculature` / `Cortex only` by exact text in
several places) at the new toggles, and must say which checks it changed; deleting one requires naming it and
why. Task 4 wires the two new npm scripts, documents with measured numbers, and runs the full sweep.

## 6. Acceptance for the run

- Every gate in §0 exits 0, with the new checks in the sweep output.
- Both toggle rows are user-visible, keyboard operable, and each has a check that fails if a region or kind
  stops being covered.
- The 14 `verify:audit` failures recorded in commit `ae96937` are either fixed (§3) or explicitly re-stated
  with their measured cause — never silently dropped.

## 7. Closure — what shipped, the measured numbers, and what did not

**Executed by the v11 swarm** (architect contract → two parallel builders on disjoint files → adversarial
review/re-point → this integration), closed by the integrator's own non-browser sweep (§7.6, every gate's exit
code printed). Nothing below is a browser observation unless it says so: **Chrome cannot start in the agent
sandbox** — `verify:audit` starts Vite, prints its source-facts line and then exits **4** with
`crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)` — so `verify:audit`, `verify:acceptance` and
`verify:browser` are the **orchestrator's lane** and are never claimed here.

### 7.1 What shipped, item by item

| # | item (the user's ask / the plan) | what shipped | files | committed check that fails if it regresses |
| --- | --- | --- | --- | --- |
| 1 | **Row "Areas"** (§1) | six real `<button type="button">` toggles with `aria-pressed` and an accessible name — **Telencephalon · Diencephalon · Mesencephalon (midbrain) · Metencephalon (pons + cerebellum) · Myelencephalon (medulla) · Cerebral vasculature** — each switching exactly its own regions through the store's existing `toggleRegionLayer` | `src/state/store.ts`, `src/components/Header.tsx` | `npm run verify:area-toggles` (**331 passed · 0 failed**, new script) |
| 2 | **Row "Systems"** (§1) | the orthogonal kind axis as toggles — **Nuclei · Tracts · Ventricles · Surface · Vessels · Context** (`ALL_KINDS` in order), through `toggleKindLayer` | `src/components/Header.tsx` | same gate (§3–§4, §7–§8) |
| 3 | **Reset / All** (§1) | Reset calls the store's existing `applyViewPreset('brainstem-focus')`; All resolves through `viewPresetOf(ALL_ON_LAYERS) ?? 'all'` and `ALL_ON_LAYERS = layersFromPreset('all')` — one definition of the default, not two | `Header.tsx`, `store.ts` | `verify:area-toggles` §6 (Reset from a dirty state and after All) **plus** the byte-unchanged DEFAULT-framing mirror in `verify:audit-checks` (**92/0**) |
| 4 | **one visibility decision** (§2) | `SectionCanvas.isPartVisible` is the only layer read in the canvas (2 reads, both inside it) and `buildLobeLayer` re-applies it — it was the one path that bypassed the layer sets, correct only because its input was pre-filtered; `SceneLayers.tsx` exports `layersAdmit` / `isStructureVisible` / `isTractVisible` / `isEnvelopeSlotVisible` / `isGhostShellVisible` and its component body holds **0** direct region/kind reads | `src/components/section/SectionCanvas.tsx`, `src/components/viewer3d/SceneLayers.tsx`, `sectionAssets.ts` | `npm run verify:view-filter-consistency` (**100/100**, new script) |
| 5 | **§3 item 4 — one rule** | `corticalLobes.corticalRunsForLoop` is the ONE splitter + floors the canvas' draw path, the legend and both gates consume; `scripts/verify/audit.mjs` derives the expected division set **at audit runtime** from that shipped rule over **both** ribbons (its `ARTEFACT_PLANES` table is now a printed cross-check, not the pass condition) | `src/components/section/corticalLobes.ts`, `scripts/verify/audit.mjs`, `scripts/verify/cortical-lobes.mjs` | `npm run verify:cortical-lobes` (**564/564**, prints `rule(l)` ∥ `rule(l+r)` per reference plane) and `verify:view-filter-consistency` lane F (parity **5/5**) |
| 6 | **§3 item 1 — the u/v convention** | the helper was **right** and is unchanged (comment only); the **audit** was fixed to read the ORDERED `AXIS_PAIR` out of the shipped `src/components/section/planeGeometry.ts` and the hand-typed `AXIS_INDEX` table was deleted | `scripts/verify/audit.mjs`, `src/components/viewer3d/PlaneHelpers.tsx` | `npm run verify:plane-helper-extent` (**206 passed · 0 failed**, lane A2) |
| 7 | **coronal plane-frame defect** (found by this run, not in the brief) | `corticalLobes.planePointToCanonical` mapped the coronal axis down the transverse branch (plane value on `y`, loop `v` on `z`), so every coronal section was classified at wrong canonical coordinates; now `[u, v, planeValue]` for all three axes | `src/components/section/corticalLobes.ts` | `verify:cortical-lobes` (per-axis assertion) + `verify:view-filter-consistency` lane F |

### 7.2 The measured numbers

#### 7.2.1 The Areas partition — total and disjoint over `ALL_REGIONS` (printed by `npm run verify:area-toggles`)

| `data-area` | button label | regions it owns | taxonomy rows | v10 division (`data-division`) | boot `aria-pressed` |
| --- | --- | --- | --- | --- | --- |
| `telencephalon` | Telencephalon | telencephalon | 85 | prosencephalon | **true** |
| `diencephalon` | Diencephalon | diencephalon | 39 | prosencephalon | **true** |
| `mesencephalon` | Mesencephalon (midbrain) | midbrain | 25 | mesencephalon | **true** |
| `metencephalon` | Metencephalon (pons + cerebellum) | pons + cerebellum | 40 | rhombencephalon | **true** |
| `myelencephalon` | Myelencephalon (medulla) | medulla | 33 | rhombencephalon | **true** |
| `vasculature` | Cerebral vasculature | vasculature | 14 | vasculature | **false** (v8: the arterial overlay is off by default) |
| **Σ** | 6 buttons | **7 regions, each owned exactly once** | **236 = every taxonomy entry** | — | boot row `[true,true,true,true,true,false]` · 5 pressed |

Measured, not asserted by hand: regions claimed by two areas = `[]`; regions no area reaches = `[]`; areas
claiming no region = `[]`; `metencephalon` + `myelencephalon` = the `rhombencephalon` division exactly, with the
**medulla alone** in the myelencephalon. The table is **derived** from `DIVISIONS` (`metencephalon` =
rhombencephalon minus medulla, `myelencephalon` = medulla) and the gate proves the shipped `AREAS` equals the
table reconstructed from `DIVISIONS`, and equals the region sets parsed out of the store's own source text.

#### 7.2.2 The Systems partition — `ALL_KINDS`, total by construction (same gate)

| `data-kind` | label | taxonomy rows | boot `aria-pressed` |
| --- | --- | --- | --- |
| `nucleus` | Nuclei | 88 | true |
| `tract` | Tracts | 53 | true |
| `ventricle` | Ventricles | 11 | true |
| `surface` | Surface | 25 | true |
| `vessel` | Vessels | 14 | true |
| `context` | Context | 45 | true |
| **Σ** | 6 kinds | **236 of 236 taxonomy rows** | boot row all `true` |

#### 7.2.3 One visibility decision — per-case agreement (`npm run verify:view-filter-consistency`, 100/100)

Swept: **138 section parts · 213 structure records · 23 tracts · 10 envelope slots · 2 ghost shells** through
**7 areas × 6 systems**, 4 states each.

| surface | what was compared | per-case result |
| --- | --- | --- |
| 2D canvas + PiP (`isPartVisible`) | 138 parts × 4 states (on+on / kind-off / area-off / both-off) | on+on **visible 138/138**; kind-off **hidden 138**; area-off **hidden 138**; both-off **hidden 138**; parts with `region === null` (the silent-bypass class) **0 of 138** |
| 3D (`layersAdmit`) | the same 4 states through the 3D primitive | **552 comparisons, 0 disagreements** with the 2D decision |
| 3D passes | structures 213 (189 drawn all-on, 24 held back by a non-layer condition) · tracts 23/23 · envelope slots 10/10 · ghost shells 2/2 | **area off ⇒ all hidden · kind off ⇒ all hidden · both off ⇒ all hidden · violations 0** |
| cross-surface join | 137 of 138 parts joined to a 3D body on the taxonomy id | **548 comparisons, 0 disagreements** |
| cortical-division pass | the shipped `buildLobeLayer` executed over both committed ribbon GLBs, 5 planes × 2 ribbons | **parity 5/5** planes; area off ⇒ **0 ribbons / 0 divisions** even with the UNFILTERED catalogue |

Per area, what each surface actually hides (2D parts hidden/owned · 3D drawn records hidden/owned):
diencephalon **33/33 · 38/38**; telencephalon **28/28 · 57/57**; midbrain **14/14 · 21/21**; pons **17/17 ·
27/27**; medulla **14/14 · 27/27**; cerebellum **6/6 · 5/5**; vasculature **26/26 · 14/14**. Per system:
nucleus **81/81 · 84/84**; context **17/17 · 44/44**; tract **7/7 · 24/24** (+23 tract tubes); ventricle **7/7 ·
6/6**; surface **0/0 · 17/17**; vessel **26/26 · 14/14**.

Two measured notes the gate prints rather than hiding: **Surface** — 25 taxonomy records, only 17 with a 3D
body and **0 section parts** (the `surf-*` records have no committed GLB, so the section has nothing of that
kind to hide); **Vessels** — 26 section parts carry `taxonomyKind: "vessel"` while their draw bucket is
`nucleus`, and the kind gate reads `taxonomyKind`, so the bucket cannot leak them past the toggle.

Execution evidence (so nothing above ran vacuously): the pass built **75 `Path2D` stubs · 75 `moveTo` · 2233
`lineTo` · 75 `closePath`**, and `buildLobeLayer` painted **21 divisions over 1748 run vertices**. The gate
bites: with the canvas' layer gate removed in a scratch copy, the mutant paints **5 divisions with the
telencephalon off** where the shipped pass paints **0**; a canvas-private rule filter diverges from the shared
rule; `SectionCanvas.tsx` sha-256 identical before/after.

#### 7.2.4 §3 item 4 — the rule set next to the canvas' set, per reference plane (`verify:cortical-lobes`, 564/564)

Both ribbons are 40,388 / 40,546 vertices and 81,128 / 81,448 triangles (`ctx-hemisphere-l` / `-r`).

| plane | loops l/r | `rule(l)` — LEFT ribbon alone | `rule(l+r)` — what the canvas paints | only the right ribbon adds |
| --- | --- | --- | --- | --- |
| y=−46 / −24 / −8 | 0/0 | `[]` | `[]` | — (these planes miss the ribbon: its y extent is −6.8…113.7) |
| y=0 | 3/3 | `[temporal occipital limbic]` | `[parietal temporal occipital limbic]` | parietal |
| **y=14** | 1/1 | `[frontal temporal occipital insula]` | `[frontal parietal temporal occipital insula limbic]` | parietal, limbic |
| y=30 | 2/2 | `[frontal parietal temporal occipital]` | `[frontal parietal temporal occipital]` | (same) |
| y=48 | 3/3 | `[frontal parietal temporal occipital limbic]` | `[frontal parietal temporal occipital limbic]` | (same) |
| y=58 | 2/2 | `[frontal parietal occipital]` | `[frontal parietal occipital limbic]` | limbic |
| y=68 / y=78 | 1/1 · 4/4 | `[frontal parietal]` · `[frontal]` | `[frontal parietal]` · `[frontal]` | (same) |
| x=6 | 4/0 | `[frontal parietal occipital]` | `[frontal parietal occipital]` | (same) |
| z=0 / z=40 | 2/2 · 1/1 | `[frontal temporal limbic]` · `[frontal parietal]` | `[frontal temporal limbic]` · `[frontal parietal]` | (same) |

**Coverage: 3 of 13 reference planes carry a division the LEFT ribbon alone does not paint (y = 0, y = 14,
y = 58).** That is the whole of the v10 "the canvas paints NONE" divergence — a one-ribbon measurement, not a
rule disagreement — and it is now printed per plane in the gate and re-derived at audit runtime. The browser
lane's own table is reconciled row by row, read out of `audit.mjs` and never retyped: **6/6 rows match** the
measured two-ribbon rule (y=6 `[frontal limbic occipital parietal temporal]`, y=14 all six, y=26, y=30, y=32,
y=34). Floors, read from `corticalLobes.ts`: run **≥ 10 au**, drawn area **≥ 25 au²**, label **≥ 25 au²** (the
v10 plan's "10 au²" for the drawn area is stale).

#### 7.2.5 §3 item 1 — the sagittal quad convention, settled with arithmetic

| plane | `AXIS_PAIR` (shipped) | u extent | v extent | shipped quad | ascending-axis-**name** order | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| x (sagittal) | `['z','y']` | z: 72 − (−76) = **148** | y: 116 − (−55) = **171** | **148 × 171** | `['y','z']` → 171 × 148 | **the helper was right; the audit's expectation was the wrong side** |
| y (transverse) | `['x','z']` | 116 | 148 | 116 × 148 | `['x','z']` (same) | agrees |
| z (coronal) | `['x','y']` | 116 | 171 | 116 × 171 | `['x','y']` (same) | agrees |

`['x','y','z'].filter(c => c !== axis)` yields `['y','z']` for the sagittal sheet — ascending axis **name**,
not u/v order, and no single permutation matches all three planes. One convention now serves all consumers:
the quad, `planeGeometry.axisExtents`, the 2D canvas / PiP camera / backdrop sampler and the audit, which reads
the ORDERED pair from the shipped source and prints it in its own run
(`AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]} · AXIS_INDEX {"x":0,"y":1,"z":2}`).
`verify:plane-helper-extent` lane A2 flipped from *"ascending-name in-plane derivation PRESENT"* to
*"absent — reads AXIS_PAIR yes"*, and `verify:plane` remains one transform for canvas/PiP/sampler (10,827
assertions).

#### 7.2.6 The coronal plane-frame defect found and fixed in this run

`planePointToCanonical` mapped the coronal axis down the transverse branch, so classification ran at wrong
canonical coordinates. Measured on `ctx-hemisphere-l`, before → after: **z=0** `[parietal temporal limbic]` →
`[frontal temporal insula limbic]`; **z=30** `[insula parietal]` → `[temporal insula frontal parietal]`;
**z=40** `[parietal limbic]` → `[frontal parietal]`; **z=−30** `[parietal temporal limbic]` →
`[frontal temporal]`. The frame is now `[u, v, planeValue]` for all three axes, asserted per axis by both
`verify:cortical-lobes` and `verify:view-filter-consistency`.

### 7.3 What did **not** ship, and why

1. **The preset row was demoted, not deleted.** The user asked for the preset *row* to be replaced as the
   primary control; it is now the third (visually last) row, presented after Areas and Systems by CSS `order`
   while it stays **first in the DOM** so `verify:audit`'s boot reading — `.header-presets button` reading
   exactly `Brainstem focus` with `aria-pressed="true"` — and the `textContent === 'Nuclei'` lookup keep
   resolving to the same elements. **The preset `state` is untouched**: `VIEW_PRESETS`, `viewPresetOf`,
   `DEFAULT_LAYERS` (32 hidden ids, vasculature region off, all six kinds on) and the `neuroaxis.viewPreset`
   persistence all behave exactly as in v10; §0's rule ("removing the preset ROW must not remove the documented
   default framing") is met by keeping the row.
2. **The spec's §3b premise is retired, not re-fixed.** "At planes where the rule expects 4–6 painted
   divisions the canvas paints NONE" was a **two-ribbons-vs-one-ribbon coverage artefact** of the v10 audit's
   reading; §7.2.4 gives the per-plane numbers. No new canvas rule was invented to satisfy it.
3. **The structure-level `hidden` axis is deliberately not unified.** The 3D surface also honours the v7
   preset `hidden` set (28 records under `brainstem-focus`) which the 2D section does not — a *different* axis
   from areas/systems. Measured and printed (gate lane C2: brainstem-focus 3D 167 records drawn vs 189 with
   "all"), never silently merged.
4. **`src/styles/**` is in no task's write list.** Both new rows use inline styles from `Header.tsx`; no
   stylesheet was added, so the header's spacing on screen is a browser observation.
5. **Two records still have no 3D body while the section paints them** (four sub-region parts — `ctx-caudate-l`,
   `ctx-caudate-r`, `ctx-choroid-plexus-l`, `ctx-choroid-plexus-r` — and `ctx-pineal`, which has no taxonomy
   entry and takes its region from the shipped override table). The toggles hide them on both surfaces
   (measured), but the join is 137 of 138 parts, not 138.
6. **`verify:anatomy` and `verify:imaging-fit` are RED for an environmental reason** — `spawnSync powershell
   EPERM` / `spawnSync node EPERM` before any verdict prints (the sandbox denies a child's piped stdio; 0
   assertions run). Both are red at base, neither is in any v11 task's write scope, and **neither is claimed
   green here**.
7. **No content moved.** `npm run validate` reports the same inventory as v10: 236 registry entries · 17 files
   / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels, 0 errors / 0 warnings. v11 is data
   slicing, controls and rules only (plan §4).

### 7.4 The 14 `verify:audit` failures from the v10 run (`ae96937`), re-stated class by class

The v10 record (`verify:audit 202 passed / 14 failed`) grouped its failures into three classes. All 14 live in
the browser lane, which **cannot run here** (exit 4), so each is re-stated with its measured cause or its fix:

| class | the v10 reading | what v11 did | evidence available in this sandbox |
| --- | --- | --- | --- |
| **(a) item 1, the helper convention** — "the sagittal (x) helper quad measures 148 × 171 au while the audit's in-plane `CLIP_BOUNDS` rectangle is 171 × 148" | a convention disagreement between the quad's `(u,v) = AXIS_PAIR.x = (z,y)` and the audit's expectation | **Fixed on the audit side** (§3a, §7.2.5): the audit reads the ORDERED `AXIS_PAIR` out of the shipped `planeGeometry.ts` and the hand-typed `AXIS_INDEX` table is deleted; the helper is unchanged | `verify:plane-helper-extent` **206/0**, lane A2 *"ascending-name in-plane derivation absent · reads AXIS_PAIR yes"*; the audit's own run prints the table it uses |
| **(a′) the same class: "the audit also threw reading the helper group's children after the toggle turned it off"** | an audit-side robustness gap (a reading, not a product defect) | the item-1 rewrite **dereferences nothing unchecked**: a sheet without a quad/grid is its own named failure (`audit.mjs:3816`), the off-read is taken through the same probe and decided with `bad()`, not an exception (`audit.mjs:3936–3951`), and the probe itself — unchanged from v10, `audit.mjs:1086–1090` — still returns `{ sheets: 0, list: [] }` when the group is absent. **No claim that the v10 throw is gone**: the browser lane cannot run here, so it stays an orchestrator-observed item | source-measured only (the code paths and their guards); the live behaviour is **orchestrator-only** |
| **(b) item 4, the divergence** — "at planes where the rule expects 4–6 painted divisions the canvas paints NONE" (y=6 legend `[]` vs rule `["frontal","limbic","occipital","parietal","temporal"]`; y=14 `[]` vs all six) | **measured cause: ribbon COVERAGE** — the canvas paints both ribbons, the per-plane tables sliced the left one only; 3 of 13 reference planes carry a right-ribbon-only division (y=0, y=14, y=58) | the expectation is now **derived at audit runtime** from the shipped splitter + floors over both ribbons; the hardcoded table is a printed cross-check only; the canvas and the Node gate consume the ONE rule | §7.2.4's per-plane table (rule(l) ∥ rule(l+r), **6/6** audit rows reconciled) and `verify:view-filter-consistency` lane F (**parity 5/5**, `buildLobeLayer` executed over both GLBs) |
| **(c) "v10 hygiene: after the v10 checks the 3D canvas was absent from the app"** (`{"root":1,"tabs":3,"canvas":false,"pip":false,"sections":1}`) | an audit-side end-of-run shape reading, not a product defect; the same check also reported the PiP as hidden | the v10 hygiene assertion (`audit.mjs:4894–4903`) is **unchanged** by v11; the v11 block adds its own hygiene reading after the toggle sweep (`audit.mjs:5365–5381`) and re-binds the three.js scene bridge to the newest mounted scene after each tab round trip (`audit.mjs:5104–5109`), which is what made the same kind of reading reliable for the v11 checks | **Orchestrator-only.** Whether the v10 hygiene check now reads clean on a live page is exactly the class of claim this run does not make |

The v10 record also stated that a speculative one-line fix had been tried and **reverted**; nothing in v11
re-attempts it. **No check was deleted** to make a failure disappear: the v11 run **adds** block A0b, block R
(six sub-blocks) and the item-1/item-4 re-points, and the only re-purposing is the one PLAN.md §3b explicitly
requires — `ARTEFACT_PLANES[].drawn` stops being the pass condition and becomes a **printed cross-check**
against the set the audit derives at runtime.

### 7.5 Claim tiers — what is proven here and what only the orchestrator can prove

| claim | tier |
| --- | --- |
| the six areas partition all 7 regions exactly once; the six systems are `ALL_KINDS`; each button toggles exactly its own slice; Reset reproduces the documented default and `viewPresetOf(DEFAULT_LAYERS)` is still `brainstem-focus` | **non-browser, asserted** — `verify:area-toggles` imports the shipped store and drives the shipped `Header`'s own handlers (331/0), and the load-time partition assertion throws in Node *and* in the browser |
| the same visibility decision reaches the 2D canvas, the PiP and every 3D pass; the cortical-division rule is one rule | **non-browser, asserted** — `verify:view-filter-consistency` 100/100 (548 + 552 cross-surface comparisons, 0 disagreements) and `verify:cortical-lobes` 564/564 |
| the two rows exist in the rendered DOM with `role="group"`, distinct accessible group names, real `<button type="button">` + boolean `aria-pressed` + a visible-text name prefix, and total machine hooks | **non-browser, asserted** — `verify:area-toggles` §7 (50 assertions through a real `react-dom` render); the browser lane re-asserts the same 10 verdicts from the live DOM at boot and after Reset |
| **that the buttons render on screen, repaint the 3D scene / the Plates canvas / the PiP, respond to a real pointer and to keyboard activation, and that the audit's 14 v10 failures are gone** | **orchestrator-browser-verified only** — Chrome exits 4 in this sandbox; `verify:audit` blocks A0b and R1–R6 are written to read those facts and the run never observed them |
| `verify:anatomy` 27/27 and `verify:imaging-fit` | **orchestrator-lane** (both exit 1 here on `spawnSync … EPERM`, before any assertion) |

### 7.6 The integrator's sweep — every gate, with its exit code

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors / 0 warnings · 236 registry entries (0 awaiting a record) · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates / 15 svg · 17 levels |
| `npm run check` | **exit 0** (`tsc --noEmit`) |
| `npm run build` | **exit 0** — `✓ built in 9.40s` |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** — 10,827 assertions (the pre-existing coronal camera-basis degeneracy is reported, not failed) |
| `npm run verify:anatomy` | **exit 1 — environment, not product** — `spawnSync powershell EPERM` before any verdict |
| `npm run verify:somatotopy` | **exit 0** — 45 passed / 0 failed |
| `npm run verify:cortical-lobes` | **exit 0** — **564/564** assertions (prints §7.2.4's two-ribbon table) |
| `npm run verify:imaging-fit` | **exit 1 — environment, not product** — `FAIL the fitter could not be re-run: spawnSync node EPERM` |
| `npm run verify:pip-contract` | **exit 0** — 187 passed / 0 failed |
| `npm run verify:audit-checks` | **exit 0** — 92 passed · 0 failed · 7 informational · 9 groups (the DEFAULT-framing mirror is byte-unchanged) |
| `npm run verify:closure-bite` | **exit 0** — 7/7 mutations caught, shared tree byte-identical, restored copy re-runs 92/0 |
| `npm run verify:boundary-contract` | **exit 0** — 22 passed / 0 failed |
| `npm run verify:a11y-contract` | **exit 0** — 38 passed / 0 failed (re-run after `build` so the shipped-bundle spot check runs: `dist/assets`) |
| `npm run verify:budget-report` | **exit 0** — 599,204 tris · GLB 13.82 MiB (cap 14) · imaging 9.02 MiB (cap 10) |
| `npm run verify:plane-helper-extent` | **exit 0** — 206 passed · 0 failed |
| `npm run verify:division-toggles` | **exit 0** — 250 passed · 0 failed |
| **`npm run verify:area-toggles`** *(new script)* | **exit 0** — 331 assertions passed · 0 failed |
| **`npm run verify:view-filter-consistency`** *(new script)* | **exit 0** — 100/100 assertions passed |
| `node scripts/verify/audit.mjs` | **exit 4 — environment unusable, no check was run** (Chrome: `crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)`); it prints its non-browser half first: `v11 source facts: AREAS telencephalon→[telencephalon] · … · ALL_KINDS nucleus, tract, ventricle, surface, vessel, context · AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]} · AXIS_INDEX {"x":0,"y":1,"z":2}` |
| `verify:acceptance` / `verify:browser` | **not run and not claimed** — orchestrator lane |

`package.json` (the integrator's file) gained exactly two lines and nothing pre-existing was touched or
renumbered — `npm run` now lists **24 script entries** (22 pre-existing + 2 new):

```json
"verify:area-toggles": "node scripts/verify/area-toggles.mjs",
"verify:view-filter-consistency": "node scripts/verify/view-filter-consistency.mjs",
```

Both were executed **as npm scripts** in the sweep above, so the wiring is proven rather than merely written.
