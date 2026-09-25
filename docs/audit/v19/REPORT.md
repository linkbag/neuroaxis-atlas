# NeuroAxis v19 — final review report (`final-review`)

**Run:** `run-muf4frwh-02e3` · **Task:** `final-review` (reviewer) · **Inputs:** the six
`docs/audit/v19/*.findings.json` files (266 findings, untouched), `docs/audit/v19/CORRECTIONS.md`
(the integrator's 500-line ledger for all 266), the plan of record `PLAN-run-muf4frwh-rz8s.md`
(D1–D8), and the integrated tree.

This report is written by the run's reviewer, whose job was to **falsify** the corrections pass
rather than to summarise it. Every claim below was re-measured against the code, the data, the
shipped gates or the rendered contract; where a ledger row and the code disagree, the disagreement
is the finding.

---

## 1. Method (what was actually done, in order)

1. **Recon.** Read `PLAN-run-muf4frwh-rz8s.md` in full (D1–D8), then all 500 lines of
   `CORRECTIONS.md`, then the six findings files where a ledger row needed the auditor's own
   wording (`FAC-BS-006/007`, `rob-023`, `rob-001/003/021`, `ux-009/022/026`, …).
2. **Measure the two "stale gate" premises first (plan D1), before touching anything.** Both were
   stale, exactly as the plan predicted — see §6.
3. **Falsify every `applied` row against the artefact itself.** The primary instrument was
   `git diff` against the pre-run commit `54d75a1` (the corrections pass touched 35 files,
   542 insertions / 205 deletions), read hunk by hunk, plus direct probes of the JSON/TS data
   through `node` (never through the ledger's prose). All 68 `applied` rows were read; every
   `critical`/`major` row was verified against the diff, and the numeric claims
   (contrast ratios, counts, distances, bounding-box relations) were **re-computed from the
   shipped values**, not quoted.
4. **Hunt for new errors** in the three classes the brief names: renamed ids orphaned elsewhere
   (§4.1, §5.1), material/suppression changes that break a render contract (§4.2, §5.2),
   coordinate changes outside `CLIP_BOUNDS` or contradicting the record's own fields (§5.3).
   The instrument for the orphan class is now a permanent gate (audit-facts group 13).
5. **Re-point only what was actually stale**, never the product: three assertions in
   `scripts/verify/area-toggles.mjs` (plan D7 gate-flips) plus that file's stale prose. Every
   re-pointed assertion was **bite-tested** in a scratch copy of the tree (§6).
6. **Restate the v11 item-4 question with measured rule-vs-canvas sets** by executing the shipped
   canvas paint path (plan D2) — §7.
7. **Add structural checks that can actually fail** to `scripts/verify/audit-facts.mjs`
   (groups 13–16, 19 new assertions) and bite-test each one against a mutated copy (§8).
8. **Run the full non-browser sweep** (plan §5, 29 commands) and paste every tail — §9.

### What this review is NOT

* It is **not** a source-verified re-derivation of the literature. No finding here was checked
  against a paper, an atlas image or a specimen; the scientific content is reviewed for
  *internal consistency, named-textbook agreement and nomenclature*, exactly as the audit's own
  basis field records.
* It is **not** a browser run. `verify:browser`, `verify:acceptance` and `verify:audit` were
  **not** executed: Chrome cannot start in this sandbox. Every pixel-level, pointer-level and
  screen-reader-level claim in the six findings files remains **unverified here** and is reserved
  to the orchestrator.
* It is **not** an independent implementation of the product's features. Where I say "the fix
  landed", I mean "the shipped source/data now says and does X, and gate Y fails if it stops".

---

## 2. The numbers

### 2.1 Findings, by area and disposition (from the integrator's ledger, cross-checked row by row)

| area | findings | applied | rejected | open | positive (`ok`) |
| --- | --- | --- | --- | --- | --- |
| features | 16 | 4 | 10 | 1 | 1 |
| facts | 70 | 17 | 5 | 24 | 24 |
| rendering | 31 | 7 | 2 | 9 | 13 |
| ux | 40 | 25 | 3 | 3 | 9 |
| robustness | 30 | 4 | 1 | 11 | 14 |
| code quality | 79 | 11 | 17 | 15 | 36 |
| **total** | **266** | **68** | **38** | **63** | **97** |

Ledger arithmetic re-checked: 266 rows for 266 findings, and the per-area columns above sum to
the totals in both directions.

### 2.2 Verdict × severity as filed by the auditors

| verdict | critical | major | minor | total |
| --- | --- | --- | --- | --- |
| `wrong` | 8 | 57 | 52 | 117 |
| `suspect` | 0 | 11 | 39 | 50 |
| `unverifiable-here` | 0 | 1 | 1 | 2 |
| `ok` | 0 | 0 | 97 | 97 |
| **total** | **8** | **69** | **189** | **266** |

### 2.3 This review's own findings

| id | class | verdict/severity | one line |
| --- | --- | --- | --- |
| FR-01 | ledger ↔ code | `wrong`/major | `FAC-BS-007` is recorded `APPLIED` on `nuc-principal-sensory-v`; that record still says the bare `"AICA"`. The replacement text landed on a **different** record. |
| FR-02 | new error | `wrong`/major | The same edit (*unrequested* by any finding) changed `nuc-cochlear-ventral.clinical[0].vascular` — a record whose own `findings` text says the lesion is "classically produced by AICA infarction" and whose `bloodSupply` says "AICA (labyrinthine/internal auditory arcade branches)". |
| FR-03 | new error (content) | `wrong`/minor | The `ux-023` fix prefixes an **audit changelog** ("v19 (audit ux-023) …", "verify:anatomy freezes the existing bounding boxes", "`meshes: false`", source paths) to the user-visible `contextNote` of 13 records. |
| FR-04 | ledger ↔ code | `wrong`/minor | `FAC-DI-008` claims the record "no longer says" the stale v1 sentence; the sentence is still there, quoted inside the new note. |
| FR-05 | partial fix | `wrong`/minor | `rob-023` marked `APPLIED`: only the **range** is clamped. An in-range inverted pair (`windowMin > windowMax`) still reaches `windowMap`'s `wMax > wMin` fallback — the finding's "ordering clamp" half is unmet. |
| FR-06 | partial fix | `wrong`/minor | `ux-009` marked `APPLIED`: roving `tabIndex` + arrow keys landed, but the `role="tablist"` still owns a non-tab child (the Browse toggle) and the panel has no `aria-labelledby`. |
| FR-07 | new error (content) | `wrong`/minor | `ux-026`'s new boot help tells the user to look for a control called **"Cerebral vasculature"**; the shipped button reads exactly **"Vasculature"**. |
| FR-08 | side effect | `suspect`/minor | The v19 mirrored-contour change makes the selected-label pass run per **instance**, so a selected paired nerve/vessel issues two `drawSelectedLabel` calls (one per side) while the ledger says labels "still address one record". |
| FR-09 | hygiene | `wrong`/minor | `dc-03` deleted `registeredAnatomyMaterials()` but left its JSDoc block, which now documents the *next* declaration (`updateClipping`). |
| FR-10 | scope handoff | `wrong`/major (gate, not product) | `verify:vessel-render` is red at 74/75 because its §3 assertion pins the source line `dc-01` correctly deleted. The re-point is a one-line change in a file **outside this task's exclusive write scope**; a compensating assertion was added inside scope (§8, group 16). |

---

## 3. What was verified (`applied` rows, falsified against the artefact)

Every `applied` row was read; the table names the instrument, not the ledger's prose. Rows are
grouped; the same row is never counted twice.

### 3.1 Data rows — re-read from the JSON

| row | what the code says now | instrument |
| --- | --- | --- |
| `FAC-VN-001` | `vasc-anterior-communicating-artery.supply == ["syn-hypothalamic"]` | `git diff` + JSON probe |
| `FAC-VN-002` | `vasc-pca-thalamogeniculate-arteries.supply == ["syn-dejerine-roussy"]` | diff + probe |
| `FAC-VN-004` | all four `supply` arrays in `BUILT_IN_VESSEL_COURSES` are `[]`; two of the three retired syndrome ids survive only inside the v19 comments that document the removal, the third appears nowhere | diff + text scan |
| `FAC-VN-005` | `vasc-anterior-choroidal-artery.territory` has 13 entries and includes `nuc-subthalamic` | probe |
| `FAC-VN-019` | umbrella synonyms `["arteriae lenticulostriatae","lenticulostriate arteries (group)"]` | probe |
| `FAC-BS-006` | `nuc-trigeminal-motor.clinical[0].vascular` = "Short circumferential branches of the basilar artery (superior cerebellar artery branches at the rostral pole)" — no AICA claim | diff + probe |
| `FAC-BS-007` | **MISMATCH — see FR-01** | diff + probe |
| `FAC-DI-001/002/003` | `ctx-lenticular-nucleus`, `ctx-caudate-nucleus`, `ctx-internal-capsule` synonyms are the silhouette wording; no part names claimed as identities | diff + probe |
| `FAC-DI-004` | `nuc-ventral-striatum` = `["limbic striatum","fundus striati"]`; `nuc-accumbens` dropped the reciprocal "ventral striatum" claim and kept its own Latin name | diff + probe |
| `FAC-DI-008` | the note is rewritten and names the eight nucleus records + three capsule segments; **the old sentence survives quoted — see FR-04** | diff + probe |
| `FAC-SYN-001` | `syn-claude.structures == ["nuc-red-nucleus","nuc-oculomotor","tract-scp"]` (the cerebellar dentate is gone) | diff + probe |
| `FAC-SYN-004` | satisfied by the same AChA `territory[]` change as `FAC-VN-005` | probe |
| `FAC-TEL-001` | all 16 `somatotopicOrder` strings read "order N of 8" (was "of 7"); orders 0..7 present | diff + probe |
| `FAC-TEL-002` | `ctx-a2` no longer claims `planum temporale`; `surf-planum-temporale` says "(host gyrus of A2)" | diff + probe |
| `FAC-TR-001` | `plate-thalamus-mid.svg`: top letter `P`, bottom letter `A` | diff + SVG parse |
| `plate-4` | `plate-tel-sagittal-hemisphere.svg`: left `P`, right `A` | diff + SVG parse |
| `mir-2` | `vasc-sca-vermian-branches.origin3d` = `[0.961, −3.998, 16.562]`, **identical to its own `vesselCourse.waypoints[0]`**; registry laterality still `midline` | probe |
| `mir-6` | `ctx-internal-medullary-lamina.laterality == "midline"`, `origin3d.x == 0`, `size3d == [1.2,4,4.5]`; the record owns **no manifest body and no `LINKS` entry**, so the ellipsoid fallback really is drawn once on the midline (the ledger's claim holds) | probe + `anatomyAssets` grep |

### 3.2 Code rows — re-read from the diff

| row | what the code says now | instrument |
| --- | --- | --- |
| `FEA-003` / `sec-4` / `rob-021` / `td-05` | `SectionCanvas.tsx` appends **both** `registryNerveParts()` and `registryVesselParts()`; the worker now receives 79 vessel parts | diff + gate |
| `rob-003` | `contourSlugsFor(meta)` resolves `slug` **and** `slug#mirror`, and the item loop pushes one item per contour — the 12 mirrored nerve + 38 mirrored vessel contours are painted | diff |
| `rob-001` | `tractDriverKey` is module-level, refreshed on register/withdraw; the `useFrame` callback returns unless it owns the key | diff |
| `rob-023` | `clampWindowValue` on read and write — **range only; see FR-05** | diff |
| `mat-1` | `TractFrameEntry.idleOpacity`; vessel courses publish `VESSEL_IDLE_OPACITY = 0.5`; `depthWrite = opacity > 0.99` | diff |
| `dc-01` | one reachable guard: `if (hasNerveCourse(record.id) \|\| hasVesselCourse(record.id) \|\| hasVesselCourseGroup(record.id)) return null`; the duplicate line is gone | diff |
| `dc-02` / `mat-5` | the section-capping block is documented RETIRED AT v9 (write-only), and the two docstrings no longer claim the live PiP reads it | diff |
| `dc-03` / `dc-04` | `registeredAnatomyMaterials()` and `updateAllClipping()` are gone; **no live reference anywhere** (grep over `src` + `scripts`); note FR-09 | diff + grep |
| `dc-06` | both `.header-presets` rules removed from `layout.css` | diff |
| `pos-5` | `ventricleGeometryFor` docstring now describes the function as the loading/fallback stand-in | diff |
| `ux-001` | canvas wrapper is `role="group"` with its `aria-label` | diff |
| `ux-002` | four accessible names begin with their visible text | diff + gate (bite-tested) |
| `ux-003` | `--text-muted: #8496ad` | **ratios recomputed from the shipped hexes**: 5.88 / 5.42 / 6.19 on `bg-panel` / `bg-elevated` / `bg-page` (the ledger's numbers reproduce exactly), old value 3.73 / 3.44 / 3.93 |
| `ux-005` | `--border-interactive: #5b7093` on `.btn` and `button.chip`; recomputed 3.54 / 3.26 (old `--border-strong` 1.55 / 1.43) |
| `ux-006` | `.tree-leaf-row.is-off { opacity: 0.55 }`; recomputed blend 5.12 / 4.91 (at 0.4: 3.31 / 3.28) |
| `ux-007` | PiP glyph buttons carry names, declared **before** `className`; `verify:pip-contract` 187 passed / 0 failed | diff + gate |
| `ux-008`, `ux-025` | wrapper `title` names the two-in-one gesture and the keyboard alternative | diff |
| `ux-009` | roving `tabIndex` + arrows/Home/End — **partial; see FR-06** | diff |
| `ux-010`, `ux-011` | `aria-current="true"` on the current level and the selected tree row | diff |
| `ux-012` … `ux-016` | `role="group"` on the plate strip + sources group, `aria-label` on the CT select and three ranges, `role="presentation"` on the two listbox info rows, `:focus:not(:focus-visible)` | diff |
| `ux-022` | `InfoPanel` renders "Modality" and "Course" sections gated on the field | diff |
| `ux-023` | 13 `contextNote`s carry the "what is actually drawn" prefix — **see FR-03** | diff |
| `ux-026` | the boot help gained the Areas/Systems, Plates-toolbar, live-section and "au" lines — **partial + new error; see FR-07** | diff |
| `ux-028` | both All-off buttons take `is-active` when pressed | diff |
| `ux-031` / `td-04` | `@media (max-width:1024px)` sets `--sidebar-w: 264px` and the grid reads the token | diff |
| `ux-032` | `@media (max-width:640px)` gives `.app-header` one column | diff |
| `ux-033` | the v12b comment now states the measured truth | diff |
| `ux-038`, `ux-040` | au definition paragraph; `<aside aria-label="Selection details">` | diff |
| `FEA-013` / `td-06` / `gq-16` | `package.json` has `verify:audit-facts`; the gate runs **68/68** (was 47/49 before the pass) | `npm run verify:audit-facts` |
| `FEA-015` | `export const NUCLEUS_EXPLODE_AU = 6`, referenced by the three former inline literals | grep + diff |

**Rows that are honestly partial and say so** (no ledger/code disagreement): `gq-29` / `gq-30`
(the handoff landed, but the gate's print-only branch and its banner prose are still prose),
`ux-008` (a `title`, not a keyboard path), `ux-024` (the nerve `contextNote` prefix; the course
`anchorNote`s are still not rendered), `FEA-002` (tooltips name the axis scope; "All on" still
does not clear the structure-level hidden set).

---

## 4. Fixes that introduced new errors

### 4.1 The wrong record was edited (`FAC-BS-007`)

The ledger says:

> `APPLIED` — `pons.json` / **`nuc-principal-sensory-v`**.clinical[0].vascular was the bare "AICA",
> now "Short circumferential branches of the basilar artery (AICA territory for the caudal part of
> the nucleus)".

The code says:

```
nuc-principal-sensory-v.clinical[0] = { syndrome: "Ipsilateral facial tactile loss", …, vascular: "AICA" }   ← UNCHANGED
nuc-cochlear-ventral.clinical[0]    = { syndrome: "Ipsilateral sensorineural hearing loss", …, vascular: "Short circumferential branches of the basilar artery (AICA territory for the caudal part of the nucleus)" }
```

`git diff src/data/structures/pons.json` locates the edit at line 414 — inside the record whose
clinical text reads *"classically produced by AICA infarction or cerebellopontine-angle tumors"*
and whose `bloodSupply` reads *"AICA (labyrinthine/internal auditory arcade branches)"*, at
`origin3d [6, −19, −4.5]` in `lvl-pontomedullary` / `lvl-pons-caudal` — i.e. the one pontine
record for which AICA *is* the correct primary attribution. No finding in any of the six files
mentions `nuc-cochlear-ventral`.

**Basis:** internal (ledger vs. code; and the edited record's own two fields contradict the new
string). **The auditor's fix for `FAC-BS-007` is still outstanding**, and the edit that did land
is a regression on a different record. Both must be corrected by a data owner; this review does
not edit product data.

### 4.2 Audit bookkeeping leaked into user-visible content (`ux-023`, `FAC-DI-008`)

`InfoPanel`'s "Context note" block renders `record.contextNote` verbatim. Thirteen records now
open with text addressed to an auditor, not a reader:

> `v19 (audit ux-023) WHAT IS ACTUALLY DRAWN: since v14 this record's body is the authored course
> tube in `src/geometry/curves.ts` (`NERVE_COURSES`) … no cranial-nerve mesh is committed and none
> may be added (the GLB budget has under 0.2 MiB of headroom and verify:anatomy freezes the
> existing bounding boxes), so this record is `meshes: false` …`

and `ctx-lenticular-nucleus` (FAC-DI-008) still contains the exact sentence the ledger says it no
longer says, inside quotes:

> `v19 (audit FAC-DI-008): the old sentence "basal-ganglia detail is out of scope for v1" was stale …`

**Basis:** internal — the record's own content contract (`contextNote` is rendered prose; every
other record's note is anatomy) and the ledger's own wording. `FAC-DI-008`'s *semantic* fix is
right; its literal wording disagrees with the ledger and puts the stale sentence back in front of
the user.

### 4.3 The same class of leak in the boot help (`ux-026`)

`InfoPanel.EmptyState` now reads:

> **Areas / Systems rows** (header) — … "Cerebral vasculature" sits in the Systems row …

The shipped control reads exactly **"Vasculature"** (`store.ts` `SYSTEM_REGION_BUTTONS`, derived
from `ALL_REGIONS` minus `AREAS`; `Header.tsx` renders `entry.label`). The gate
`verify:area-toggles` §7 asserts *"exactly one control reads exactly 'Vasculature'"* and passes —
so the help text points at a label that does not exist in the UI. (The same bullet writes the
modality "photo" where the button reads "Photo"; that is cosmetic.) The finding's other explicit
request — replacing "Click any nucleus or tract" with a phrase covering all seven kinds — was not
made either (`InfoPanel.tsx:346`).

**Basis:** internal (the store's own table + this repo's own gate assertion).

### 4.4 The frame-driver fix and the mirrored-contour fix — checked for regressions

* `rob-001` (`tractDriverKey`): the owner is the **first registry entry**, re-derived on every
  register/withdraw; every mounted tube still subscribes one callback but returns unless it owns
  the key, so exactly one registry walk happens per frame and ownership transfers on unmount. No
  stall path found (the key is refreshed in the same effect that mutates the registry).
* `rob-003` (mirror resolution): `ensureRenderOrder`'s outer filter lost `contours.has(meta.slug)`
  and the test moved inside the item loop, which is **equivalent for the item list**
  (`cache.visibleParts` only ever receives pars with a contour) and additionally admits the
  `#mirror` instance. One measured side effect: `drawSectionContours`' label loop
  (`SectionCanvas.tsx:1751`) runs **per item**, so a selected paired course now yields two
  `drawSelectedLabel` calls (one per side) — see FR-08. Hit-testing (`visibleFaces`) gains the
  mirror instance, which can only make a mirrored contour select its own record.

### 4.5 Coordinate changes

* `mir-2` moved `vasc-sca-vermian-branches.origin3d` ~30 au onto its own documented first
  waypoint. Re-measured: `origin3d == vesselCourse.waypoints[0]` exactly, inside `CLIP_BOUNDS`
  (audit-facts group 1), and the new position is a committed vertex of the parent SCA — i.e. on
  its parent body, not inside an unrelated structure.
* `mir-6` moved `ctx-internal-medullary-lamina` to the midline. The record has no `LINKS` body and
  no manifest part, so the fallback ellipsoid is what is drawn: one midline body now, where the
  `paired` flag previously mirrored it. No other record's `origin3d` changed.

---

## 5. Regression hunt (the three named classes)

### 5.1 Renamed / orphaned ids

The corrections pass renamed **no** id, and the new sweep confirms nothing dangles: every
structured reference (`parent`, `territory[]`, `supply[]`, `mesh[]`, `anchors.mesh`,
`vesselCourse.parentArtery` / `.surface`, syndrome `structures[]`) resolves, and every id-shaped
token in the free text of every structure, tract, syndrome and plate manifest resolves except
five tokens that are prose, each named in the gate's allowlist (`plate-2`, `vasc-course-probe`,
`vasc-inventory`, `vasc-acquire`, `tract-level`). That sweep is now permanent
(`audit-facts.mjs` group 13) and it was bite-tested: renaming a syndrome's structure id and a
course's parent artery in a copy made it fail with the exact orphan printed (§9.2).

One rename-adjacent artefact is worth recording: `dc-03` deleted a function but left its JSDoc
block, which JSDoc now attaches to `updateClipping` (FR-09, hygiene only, no behaviour).

### 5.2 Material and section-capping changes

* The section-capping registry is **write-only** and now says so; nothing in `src/` or `scripts/`
  reads `sectionCapRegistry` / `firstSectionCapColor` (grep). No gate regressed.
* `mat-1`'s `idleOpacity` is additive: tracts still settle at `1`, vessels at `0.5`, and
  `depthWrite` still follows `opacity > 0.99`, so no depth-buffer contract changed.
* The v18 `variant="vessel"` path is the only consumer of the new field; `verify:vessel-render`
  (structural half) and `verify:budget-report` are unchanged and green.
* Nothing in the corrections pass touches `clipPlanes.ts` or `PipSection`; `verify:pip-contract`
  (187/0), `verify:plane` (10,827), `verify:plane-helper-extent` (206/0) and
  `verify:boundary-contract` (22/0) are green.

### 5.3 Nothing is hidden that should draw

The two suppression-adjacent edits are `dc-01` (one reachable guard instead of two) and
`rob-003`/`FEA-003` (the vessel family reaches the worker). `dc-01` is a strict de-duplication of
an unreachable line, so the drawn set is unchanged — and the three behavioural assertions in
`verify:vessel-render` (`blobs 0`, `doubleBodied 0`, `lenticulostriate 0`) still pass, only its
**source-text** pin fails (FR-10). The audit-facts additions now pin the merged guard as well.

---

## 6. The two "stale gates" (plan D1) — measured, then re-pointed only where stale

**Measured before any edit.** `npm run verify:area-toggles` exited **0** with *469 passed · 0
failed*. The four preset click sites in `scripts/verify/audit.mjs` and `checks.mjs` were already
post-v12: `audit.mjs` clicks `[data-header-action="areas-all-on"]` / `["systems-all-on"]` and
`[data-system-region="vasculature"]`, reads `.header-presets` only as a **count that must be 0**,
and `checks.mjs`'s `presetFocusReading` decides from `rowFraming` with a vacuous-pass guard
(`framing.buttonCount > 0`). `area-toggles.mjs` §11 scans every `clickHook` call site in
`audit.mjs` against the hooks the shipped `Header.tsx` renders and reports **"dead click sites 0"**.
`area-toggles.mjs` §10 re-measures the v11 item-4 divergence 6/6 (§8). Neither premise in the
brief held; the plan's D1/D2 said so in advance.

**What had actually gone stale at run close** was created by the corrections pass itself: three
assertions in `scripts/verify/area-toggles.mjs` that pinned the pre-fix product on purpose. All
three were re-pointed (never the product), and each re-point was bite-tested in a copy:

| # | assertion (before → after) | why | bite test |
| --- | --- | --- | --- |
| 1 | `the four All-module buttons are the ONLY header controls whose accessible name misses its visible text (pinned defect)` — expected the four hooks → **expected `[]`**; renamed to *"no header control's accessible name misses its visible text (WCAG 2.5.3 — v19 ux-002 fixed the four module buttons)"* | `ux-002` fixed all four WCAG 2.5.3 failures | restoring the pre-v19 `aria-label`s in a copy → FAIL with the two hooks printed |
| 2 | `all four module buttons carry their own axis in the accessible name` — read the *violating* buttons, expected the four pre-fix names → **reads all four module buttons, expects the four shipped names** | same fix; the assertion no longer needs a violation to have a subject | same mutation → FAIL, expected/actual both printed |
| 3 | `SectionCanvas.tsx hands the worker the procedural families it appends (v17: the vessel family is the open handoff)` — expected `["registryNerveParts"]` → **expected `["registryNerveParts","registryVesselParts"]`**; renamed to *"…every procedural family it builds (v19: nerve AND vessel — the v17 handoff is closed)"* | `FEA-003`/`sec-4`/`rob-021`/`td-05` landed the handoff the pin demanded | deleting the vessel append in a copy → FAIL, `["registryNerveParts"]` printed |

**Added, not replaced:** a third assertion asserts the SC 2.5.3 test itself
(`name.startsWith(text)` for each module button), so the re-point does not trade a strong pin for
a weaker one. **No assertion was deleted.** The run's own count went 469/3-failed → **473 passed ·
0 failed**.

**Also corrected in that file:** its stale prose (the header §9/§11 narrative and the closing
banner still said *190 metas / 40 courses / 77 vessel parts / 37 mirrored*). It now prints the
numbers the gate itself measures: **191 canvas metas = 138 + 12 + 41**, **79 vessel worker parts =
41 + 38 mirrored**, **103 registry parts**, and the handoff paragraph states the closed state.
This is the `sec-5` row the integrator routed here ("gate prose, 190 → 191").

**Every check inspected in the two "preset click site" files, and left unmodified** (the plan's D1
requirement: name them, change only what is stale — these are not):

* `scripts/verify/checks.mjs` — `presetFocusReading()` (line 282) and its two verdict strings: it
  decides from `rowFraming` (`areasAll ∧ systemsAll ∧ ¬vascularRegion`) with a `buttonCount > 0`
  vacuous-pass guard, and falls back to the v11 `data-preset` hook / label path only when
  `rowFraming` is null (the synthetic fixture `verify:audit-checks` feeds). **Current.**
* `scripts/verify/audit.mjs` — the A0 boot-header read (`.header-presets button[data-preset]` kept
  only as a count that must be 0, line 983); `headerToggleRowsReading(bootHeader)` (line 1717);
  the **A0b** claim *"the header carries both per-axis All modules as real hooked buttons"*
  (`MODULE_HOOKS`, line 1726) — it asserts the four `data-header-action` hooks by name and does
  **not** read their accessible names, so the `ux-002` fix could not stale it; the default-framing
  composition (`clickHook('[data-header-action="areas-all-on"]')`,
  `["systems-all-on"]`, `[data-system-region="vasculature"]`, lines 823–830); the v12 **R3b**
  re-point that composes the default framing from the same hooks (lines 3211–3229) and the
  vascular-region claim at line 3305; the A0/close-out readings `vascularRegion`,
  `areasAllOnPressed`, `systemsAllOnPressed` (lines 3503–3505) and the `presetFocusReading` call
  at line 5878. **All current**; `area-toggles.mjs` §11 additionally re-scans every `clickHook`
  call site in that file at run time and reports **0 dead click sites**.

No check in either file was deleted, and neither file was edited: the measured state at run close
is the v12/v13 contract, which is why the brief's second stale-gate premise did not hold.

---

`verify:vessel-render` §3, which still asserts the source text
`/if \(hasVesselCourse\(record\.id\)\) return null/`. The one-line re-point is:

```js
// scripts/verify/vessel-render.mjs §3 (line ~683), the file NOT in this task's write scope:
assert(
  /if \(hasNerveCourse\(record\.id\) \|\| hasVesselCourse\(record\.id\) \|\| hasVesselCourseGroup\(record\.id\)\) return null/
    .test(SOURCE.sceneLayers),
  'the structure pass returns null for a course-bearing vessel record (the ellipsoid is retired in the render)',
)
```

The product behaviour that assertion was standing in for is **still asserted three times over**
in the same file by execution (`blobSurvivors === 0`, `lenticulostriateSurvivors === 0`,
`doubleBodied === 0`, all green), and this review added a direct source pin for the merged guard
inside its own scope (audit-facts group 16). The gate nevertheless reads **74/75** at run close;
that is the single red gate caused by a correct product change, and it is a scope handoff rather
than a product defect.

---

## 7. The v11 item-4 divergence (plan D2) — restated with measured sets

**Verdict: closed, and now gate-protected.** `verify:area-toggles` §10 executes the canvas' own
`buildLobeLayer` (the paint path the live section uses) against the shipped cortical-division rule
at every plane the browser lane names, over **both** cortical ribbons. The three sets agree at
every plane — rule, canvas and the browser lane's own audit table:

| plane | rule over (l+r) | canvas (`buildLobeLayer`) | `audit.mjs` table | parity |
| --- | --- | --- | --- | --- |
| **y = 6** | frontal limbic occipital parietal temporal | frontal limbic occipital parietal temporal | frontal limbic occipital parietal temporal | 6/6 |
| y = 14 (cross-check) | frontal insula limbic occipital parietal temporal | frontal insula limbic occipital parietal temporal | frontal insula limbic occipital parietal temporal | agree |
| **y = 26** | frontal insula occipital parietal temporal | frontal insula occipital parietal temporal | frontal insula occipital parietal temporal | 6/6 |
| **y = 30** | frontal occipital parietal temporal | frontal occipital parietal temporal | frontal occipital parietal temporal | 6/6 |
| **y = 32** | frontal occipital parietal temporal | frontal occipital parietal temporal | frontal occipital parietal temporal | 6/6 |
| y = 34 (cross-check) | frontal occipital parietal temporal | frontal occipital parietal temporal | frontal occipital parietal temporal | 6/6 |

Two committed ribbons are loaded from the manifest for the re-measure
(`ctx-hemisphere-l` 81,128 tris · `ctx-hemisphere-r` 81,448 tris) and the four planes the v11
divergence named are all inside the sweep. The ledger's `sec-2` / `td-03` rows are therefore
**confirmed**, and the brief's premise ("known-open") is stale — as the plan's D2 predicted. The
v11 reading that produced the divergence was a **left-ribbon-only** slice; the product never
changed. No product change was made here, and none was needed.

---

## 8. Structural checks added (plan §3.8 item 5)

All four were added to the file the brief names — `scripts/verify/audit-facts.mjs`, which is wired
as `npm run verify:audit-facts` (D5, added by the integrator) — and each is **named** here with the
defect it can see. The gate went from **49 assertions / 13 groups** to **68 assertions / 17 groups**,
all green.

| group | assertion (short) | what it catches |
| --- | --- | --- |
| 13 | *every id named anywhere in the data resolves (the orphaned-reference sweep)* | a renamed/deleted id left behind in `parent`, `territory[]`, `supply[]`, `mesh[]`, `anchors.mesh`, `vesselCourse.parentArtery`/`.surface`, a syndrome `structures[]`, **or any sentence** in the data; the five prose tokens are a pinned allowlist, itself asserted, so it cannot grow silently |
| 14 | *every vessel course starts on its parent artery, or states its provenance* | a course whose parent name no longer owns a committed body; a first waypoint that drifted off the parent without a declared basis. Covers the 39 authored JSON courses **and** the 4 `BUILT_IN_VESSEL_COURSES` chunks (symbolic `M1_TAKEOFF`-style first waypoints are resolved from the literal constant table); prints per-course distance, max 56.31 au (the five distal MCA branches that arise beyond the committed M1/M2 mesh — all with `basis: bp3d-element`) |
| 15 | *every structure kind and every manifest hint has a material preset* | `KIND_OPACITY` missing a kind; a `MATERIAL_HINTS` value with no `case` in `makeAnatomyMaterial` (a silent fall-through to the nucleus preset); a manifest `materialHint` outside the enum (the `mat-2` class); `hintForKind` returning an undeclared hint |
| 16 | *the v19 corrections are pinned (they had no gate before this one)* | the five data corrections of §3.1 that only prose recorded (`ACoA`, thalamogeniculate, AChA territory, `syn-claude`, the two plate frames) **and** the merged `SceneLayers` suppression guard — the compensating source pin for FR-10 |

**Bite evidence (mutations applied to a scratch copy of the tree, `AUDIT_FACTS_ROOT=<copy>`):**

```
MUT1 syndrome structures[] += nuc-renamed-away
  ✗ dangling syndrome structures[] ids — syn-claude → nuc-renamed-away            (group 7, pre-existing)
  ✗ a structured reference points at an id that does not exist — vasc-sca-vermian-branches.vesselCourse.parentArtery → vasc-superior-cerebellar-artery-renamed · syn-claude.structures[] → nuc-renamed-away   (13)
  ✗ unresolvable id-shaped token(s) in the data text — vasc-superior-cerebellar-artery-renamed … · nuc-renamed-away …   (13)
MUT2 vessel course parent renamed + first waypoint moved to [40,40,40]
  ✗ course parent with no committed body (renamed parent?) — vasc-sca-vermian-branches → vasc-superior-cerebellar-artery-renamed   (14)
MUT3 manifest materialHint "gray-matter" → "grey-matter-typo"
  ✗ manifest part declares a materialHint outside MATERIAL_HINTS — grey-matter-typo   (15)
→ 68 assertions · 62 passed · 6 failed  (exit 1)
```

The unmutated copy runs green (`68/68`), so the checks are not passing by refusing to parse.

---

## 9. The full non-browser sweep at run close

Run from the workspace root on the integrated tree, after every code and script edit named in this
report (REPORT.md itself is not an input to any gate), in the plan's §5 order (29 commands).
**26 exit 0.** The three non-zero rows are named in full below; none is a
product defect introduced by this review, and two of them could not have been executed by *any*
agent in this sandbox.

| # | gate | exit | time | tail (the command's own last lines) |
| --- | --- | --- | --- | --- |
| 1 | `npm run validate` | **0** | 0.3s | syndromes 3 file(s), 26 record(s) · plates 1 manifest(s), 15 plate record(s), 15 svg file(s) · **✔ Validation PASSED — 0 errors, 0 warning(s)** |
| 2 | `npm run check` | **0** | 2s | `tsc --noEmit` — no diagnostics |
| 3 | `npm run build` | **0** | 11.6s | `dist/assets/index-Cbi69UtA.js 1,899.20 kB │ gzip: 425.10 kB` · **✓ built in 10.92s** |
| 4 | `npm run verify:pipeline` | **0** | 0.4s | pipeline: **138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)** · PASS section pipeline |
| 5 | `npm run verify:plane` | **0** | 0.3s | ✔ plane transform QA PASSED — **10827 assertions** · one transform for canvas/PiP/sampler |
| 6 | `npm run verify:plane-helper-extent` | **0** | 0.5s | the sheet covers y[−55, 116] … **plane-helper-extent: 206 passed · 0 failed — exit 0** |
| 7 | `npm run verify:anatomy` | **1** | 0.3s | **could not execute** — `Error: spawnSync powershell EPERM` (the gate shells out at `anatomy-qa.mjs:294/296`); **0 verdicts**, no assertion ran. Environment block, measured here for the second time. |
| 8 | `npm run verify:somatotopy` | **0** | 0.3s | **45 passed · 0 failed** |
| 9 | `npm run verify:cortical-lobes` | **0** | 1.1s | **cortical-lobes: 564/564 assertions passed** · PASS |
| 10 | `npm run verify:imaging-fit` | **1** | 0.3s | **could not execute** — `FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM`; 0 verdicts |
| 11 | `npm run verify:pip-contract` | **0** | 1s | **187 passed · 0 failed** · ✔ simulated-section panel contract PASSED |
| 12 | `npm run verify:division-toggles` | **0** | 2.8s | the arteries are their own division; the default framing is unchanged · (rendered pixels and real pointer/keyboard use stay orchestrator-only: Chrome cannot start in this sandbox, so this lane asserts the rendered DOM instead) — group totals 17 / 16 / 7 / 16 passed, 0 failed |
| 13 | `npm run verify:view-filter-consistency` | **0** | 1.3s | the pass really stroked its runs: 75 Path2D stubs, 75 moveTo / 2233 lineTo / 75 closePath · **102/102 assertions passed** |
| 14 | `npm run verify:area-toggles` | **0** | 6.2s | **473 assertions passed · 0 failed** (was 469 + 3 pinned failures at run start) |
| 15 | `npm run verify:audit-checks` | **0** | 1.1s | **92 passed · 0 failed · 7 informational · 9 group(s)** |
| 16 | `npm run verify:audit-facts` | **0** | 0.5s | **68 assertions · 68 passed · 0 failed** (49 before this task) |
| 17 | `npm run verify:closure-bite` | **0** | 9.3s | **7/7 mutations caught by the mirror · shared tree untouched** |
| 18 | `npm run verify:boundary-contract` | **0** | 0.4s | the live-section boundary is layout-transparent · **22 passed · 0 failed** |
| 19 | `npm run verify:a11y-contract` | **0** | 0.2s | **38 passed · 0 failed** · shipped bundle spot check: `dist/assets` |
| 20 | `npm run verify:budget-report` | **0** | 0.2s | **5 passed · 0 failed** · ✔ **599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB** — all inside their caps |
| 21 | `node scripts/verify-imaging-v4.mjs` | **0** | 0.1s | ✔ v4 imaging QA PASSED — anchors reachable, selection unambiguous, orientation matches §2.2 |
| 22 | `node scripts/verify-imaging-v4b.mjs` | **0** | 0.4s | OK — **22 NLM Visible Human cryosections, −52.20 … 34.04 au**, credit verbatim in 5 records |
| 23 | `npm run verify:cranial-nerves` | **0** | 0.5s | manifest parts added **0** (still 138) · ✔ 12 records verified: **451 assertions passed, 0 failed** |
| 24 | `npm run verify:nerve-kind` | **0** | 1.8s | manifest: 138 parts · 138 GLBs · **79 passed · 0 failed** |
| 25 | `npm run verify:cranial-nerve-courses` | **0** | 0.3s | ✔ 12 courses: **220 assertions passed, 0 failed** · 491.78 au of authored path · min clearance 6.00 au · 680 contour loops |
| 26 | `npm run verify:cranial-nerve-render` | **0** | 1.1s | 12 courses · 3D tubes 12/12 · 2D parts 12 · 121 contour loops over 38 planes · **47/47 assertions** |
| 27 | `npm run verify:vasc-courses` | **0** | 0.9s | ✔ **2170 assertions, 0 failures** · 39 vessel records · 172 waypoints · 67 projected waypoints re-measured |
| 28 | `npm run verify:vessel-render` | **1** | 1.2s | 41 courses · 3D tubes **79 = 41 + 38 mirrored** · 2D parts 41 (79 worker parts) · 2618 loops · blobs 0 · **74/75** — **FAIL the structure pass returns null for a course-bearing vessel record**; the one source-text pin the `dc-01` fix invalidated (FR-10, re-pointer in §6) |
| 29 | `node scripts/build-anatomy-geometry.mjs --manifest` | **0** | 167s | scene total **599,204 / ≤ 800,000 rendered tris → PASS** · **MANIFEST + BUDGET PASS** |

**Browser lanes: not run, not claimed.** `verify:browser`, `verify:acceptance` and `verify:audit`
require Chrome, which cannot start in this sandbox. Everything the six findings files assert about
rendered pixels, pointer behaviour, focus order and screen-reader output therefore remains
**orchestrator-only**.

### 9.1 Independent re-measurement of the two un-runnable gates' subject matter

`verify:anatomy` cannot execute here, so its two claims were re-measured with `fs` only (no child
process):

* `src/assets/anatomy/` = **140 entries · 14,566,178 B = 13.8914 MiB · 138 GLB files**
* `anatomy-manifest.json` = **138 parts · Σ triCount 599,204** · **0 `nrv-*.glb` on disk**
* `verify:budget-report` and `verify:vessel-render` §7 independently print the same 138 parts /
  13.8151 MiB of manifest payload / 599,204 tris, and `scripts/build-anatomy-geometry.mjs
  --manifest` re-derived **138 / 599,204 / PASS** in this sweep.

That is strong evidence that the frozen-payload contract holds, but it is **not** the 27/27
bounding-box comparison `verify:anatomy` performs against `git show`. **The 27/27 claim remains
`unverifiable-here` for this run** — the remedy is the `execFileSync` → `fs` replacement the
findings already name (`gq-07`/`gq-31`/`gq-10`/`FEA-012`), in a file outside this task's scope.

---

## 10. What remains open

### 10.1 `unverifiable-here` (2 findings, all still open, by construction)

| id | subject | why it stays open |
| --- | --- | --- |
| `ux-017` | the CSS-generated "● live" marker inside a `<label>` — does it reach the accessible name? | needs a browser's accessibility tree; not measurable from source |
| `FEA-012` / `gq-07` / `gq-31` / `gq-10` | `verify:anatomy` (27/27) and `verify:imaging-fit` cannot run in this sandbox | measured cause, twice: `spawnSync powershell EPERM` / `spawnSync node EPERM` — the sandbox denies **piped** child stdio. The fix (replace the `execFileSync`/`spawnSync` calls with `fs`) is in `scripts/verify/**`, outside this task's write scope. §9.1 gives the fs-only alternative measurements. |

Additionally, **every browser-visible claim in the six findings files** (rendered pixels, the
live-section click precedence `sel-1`, the plate-vs-canvas transverse convention `plate-2` /
`FAC-TR-002`, screen-reader output) is unverifiable here and is reserved to the orchestrator.

### 10.2 `rejected` (38 findings) — the whole set, by reason

* **Documentation-only, outside every writer's scope (24):** `FEA-001` (a Reset/preset row the
  README still promises), `FEA-004`…`FEA-011` (record, payload, gate-count and zh-parity drift),
  `FEA-016` + `FAC-VN-013` + `rob-006` + `doc-01`…`doc-13`, `doc-19`, `doc-20`, `doc-22`
  (40/77 vs 41/79, "24 cards" vs 26, the tier tables, ATTRIBUTION's "12 SVG plates"). Each is a
  real defect with a named line; the docs owner must apply them. The **code was not bent** to
  match the stale prose.
* **Gate-pinned (4):** `FAC-VN-008` (the CN V foramen string, pinned in two gates),
  `ux-027` (the All modules' visible text, pinned by `area-toggles`),
  `ux-036` (Legend kind labels, pinned by `nerve-kind.mjs`), `cs-06` (`hasVesselCourse`'s name,
  asserted by name in two gates).
* **Scope/cost decisions with a measured cause (6):** `FAC-VN-011` (count cascade across four
  pinned censuses), `FAC-TR-003` + `plate-3` (re-derived and contradicted: the corner compass
  agrees with the artwork on all six plates), `FAC-TR-007`, `ux-004` (a 53-record palette
  decision), `cs-04` (`presetFocusReading`'s fixture-only fallbacks).
* **Auditor disagreement resolved by measurement (2):** `plate-2` / `FAC-TR-002` (the
  transverse plate-vs-canvas convention) and `plate-3` / `FAC-TR-003`.

### 10.3 The rest of the `open` set (63 rows)

The integrator's §7 groups them by owner without loss: **documents** (the README/zh/ATTRIBUTION
class above), **`scripts/verify/**`** (the two un-runnable gates, the `vessel-render` print-only
branch `gq-29`/`gq-30`, `budget-report`'s manifest-only triangle count `rob-002` and the draw-call
census `rob-028`, `a11y-contract`'s source-text-only reading `gq-19`, `verify:plane`'s
known-wrong reading `gq-05`, `build-anatomy-geometry.mjs --check` `td-08`, `verify:audit-facts`'s
README rows `doc-19`), **content** (the laterality census `FAC-BS-001`…`005` + `FAC-SYN-002/005`,
`FAC-VN-003/006/007/009/010/017`, `FAC-DI-005/006/007/009`, `FAC-SYN-003/008`, `FAC-TEL-007`,
`FAC-TR-006`, the 24 missing `bloodSupply` fields, `mat-2`'s unreachable gray-matter preset),
**render/UX** (`pos-1`/`pos-6`/`pos-7` — the body-ownership census, which is one decision and
should be fixed once; `mir-1`/`mir-3` mirroring vs crossing chains; `sel-1` click precedence;
`mat-4` nerve-tube colour; `ux-037` naming; `rob-004/005/007/008/009/014/024/025/029`;
`cs-02/03/05`, `dc-05/07/08`), and **product decisions** (`FEA-002`'s second half — what "All on"
should clear; `FAC-VN-004`/`FAC-VN-011`'s registry-first changes).

Three of those are now **disagreements with this review** and should be re-routed to a data owner
rather than closed: **FR-01** (`FAC-BS-007` was applied to the wrong record), **FR-02** (the
unrequested edit to `nuc-cochlear-ventral`), and **FR-03/04/07** (the content-leak class). **FR-05**
(`rob-023`'s ordering half), **FR-06** (`ux-009`'s tablist child) and **FR-08** (duplicate
selected labels) are small, named, and unclaimed by anyone.

---

## 11. What this audit cannot establish

* **It is a model-based review of authored text, coordinates and code — not a source-verified
  re-derivation of the literature.** No claim in the 266 findings, and none in this report, was
  checked against a primary paper, a textbook page image, a radiological dataset or a specimen.
  The scientific findings rest on internal contradiction, on the records' own named references
  (Blumenfeld, Patten, Fix, Snell, Nolte), on Terminologia Anatomica / FMA naming and on the
  auditors' labelled judgement. A claim that is internally consistent and wrongly attributed in
  the literature would pass this audit untouched.
* **No finding was validated against imaging.** The MRI/CT/cryosection registration, the simulated
  section's contours and the plate artwork were reviewed as code and as numbers; nothing was
  compared pixel-by-pixel against a real scan.
* **Browser claims are reserved to the orchestrator.** `verify:browser`, `verify:acceptance` and
  `verify:audit` were not run. Rendered pixels, real pointer and keyboard input, focus order, the
  accessibility tree as a screen reader sees it, and the live-section click precedence are
  **unverified** here.
* **Two named gates could not execute at all** (`verify:anatomy` 27/27, `verify:imaging-fit`):
  measured cause, in §9.1. Their subject matter was re-measured by other means, but the gates
  themselves did not run, and this report does not claim their verdicts.
* **`verify:vessel-render` is red at 74/75** for a reason that is not a product defect (FR-10); the
  re-point is outside this task's exclusive write scope and is stated here as a handoff rather
  than silently satisfied.
* **The ledger is the integrator's own record.** This review falsified every `applied` row it
  could measure and found three disagreements (FR-01, FR-04, FR-05) plus two partials presented as
  applied (FR-06, and `rob-023`'s second half) — but a ledger row asserting a *reason* for a
  rejection or an *open* state is a judgement call, and this review did not re-litigate each of
  the 63 open and 38 rejected rows one by one; it checked that none of them hides a product change
  (the `git diff` is exhaustive) and that the code was never bent to satisfy a gate.
