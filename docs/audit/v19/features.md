# NeuroAxis v19 — feature-completeness audit (`features`)

**Task:** `audit-features` · **run** `run-muf4frwh-02e3` · **writes** `docs/audit/v19/features.findings.json` + this file.
**Machine-readable half:** [`features.findings.json`](features.findings.json) (16 findings, v15-compatible schema).
**Plan of record:** [`PLAN-run-muf4frwh-rz8s.md`](../../../PLAN-run-muf4frwh-rz8s.md) §3.1 (plus deviations D4/D5/D7, all confirmed by measurement here).

**This task edits no product code and no product data.** Every statement below is either a quote of a shipped file
(with `file:line`), a number printed by a command executed in this session, or a judgment explicitly labelled as
such in the findings file.

---

## 0. What this audit could and could not establish

| | |
| --- | --- |
| **Ran here (exit 0)** | `validate` · `check` · `build` · `verify:pipeline` · `verify:plane` · `verify:plane-helper-extent` · `verify:somatotopy` · `verify:cortical-lobes` · `verify:pip-contract` · `verify:division-toggles` · `verify:area-toggles` · `verify:view-filter-consistency` · `verify:audit-checks` · `verify:closure-bite` · `verify:boundary-contract` · `verify:a11y-contract` · `verify:budget-report` · `verify-imaging-v4` · `verify-imaging-v4b` · `verify:cranial-nerves` · `verify:nerve-kind` · `verify:cranial-nerve-courses` · `verify:cranial-nerve-render` · `verify:vasc-courses` · `verify:vessel-render` · `build-anatomy-geometry.mjs --manifest` — **25 green** |
| **RED here, environment** | `verify:anatomy` (`spawnSync powershell EPERM`, 0 verdicts) · `verify:imaging-fit` (`spawnSync node.exe EPERM`) — FEA-012 |
| **RED here, product/content** | `node scripts/verify/audit-facts.mjs` — 49 assertions · **47 passed · 2 failed** (both content-level; FEA-013) |
| **NOT claimable here** | `verify:audit` / `verify:browser` / `verify:acceptance` — Chrome cannot start in this sandbox (exit 4, "no check was run"). **No rendered-pixel claim appears anywhere in this report.** The orchestrator owns those lanes. |
| **Method limit** | This is a *feature-delivery* audit: it establishes that the code path exists, that a gate would fail on regression, and that the README matches. It does **not** re-derive the anatomy, and it cannot see a pixel. |

---

## 1. Delivery matrix — every feature era in the brief

`verdict` is the finding anchor for that row (`ok` = delivered with a gate and a truthful claim;
`wrong`/`suspect` = see the finding). Gate names are the npm scripts; each was executed here unless marked.

| # | era | feature claim (source) | code path (file:line) | gate that fails on regression | verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | v2 | real-scan envelopes from BodyParts3D, sculpted nuclei, containment report | `src/geometry/anatomyAssets.ts:194,405` (`TEL_CONTENT_ONLY_IDS`, body pass); `src/assets/anatomy/nuclei-report.json`; `anatomy-manifest.json` (138 parts) | `verify:pipeline` (138/138 · 0 problems) · `budget-report` · `build-anatomy-geometry --manifest` | ok |
| 2 | v2 | CSF spaces (4th ventricle, aqueduct, 3rd ventricle) as cyan fresnel translucent meshes | `src/geometry/materials.ts:311-325` (`createCsfMaterial`, `CSF_COLOR`, opacity 0.32, depthWrite false) | `verify:pipeline` (ventricle parts slice) · `verify:anatomy` (**unverifiable here** — FEA-012) | ok (measurement open) |
| 3 | v2 | PBR + postFX: RoomEnvironment/ACES, SSAO+bloom+SMAA, one clipping-aware factory | `src/geometry/materials.ts` factories (all set `clippingPlanes: ALL_CLIP_PLANES`); `src/components/viewer3d/PostFX.tsx:24,80` | `check` (exhaustive `Record<Kind,…>`) · `verify:a11y-contract` (bundle) · `verify:audit-checks` (PostFX null-while-lost) | ok |
| 4 | v2 | High (post composer, dpr ≤ 2) / Balanced (no composer, dpr ≤ 1.5) + WebGL2 auto-downgrade + persistence | `src/components/viewer3d/Viewer3D.tsx:712-715`, `:838`, `:921`; `src/state/store.ts:53,64-71,89` | `verify:audit-checks` · `verify:closure-bite` (7/7) · `verify:a11y-contract` | ok |
| 5 | v2 | fallback contract: slug without a committed mesh renders its v1 primitive, "the app never blanks" | `src/geometry/anatomyAssets.ts` (manifest resolution) + `src/geometry/envelope.ts` | `verify:pipeline` · `verify:audit-checks` (geometry fallback) | ok |
| 6 | v3 | live-section sync: one worker, clip → contour chain → even-odd fill, shared by canvas + PiP | `src/components/section/SectionCanvas.tsx` (`partsForCanvas` visible list), `src/components/section/contourWorker.ts` | `verify:plane` (10,827 assertions) · `verify:pipeline` (386 loops / 13 planes) · `verify:pip-contract` | ok |
| 7 | v4 | real imagery base plate: Auto real-first → photo ±1.5 au → CT → MRI → none; modality toolbar; honest fallbacks | `src/state/store.ts:168-196` (`SECTION_UNDERLAY_KIND_LABELS`, `SECTION_UNDERLAY_KIND_DESCRIPTIONS.none`, `IMAGERY_OFF_STATEMENT`); `src/components/PlatesTab.tsx:167,219,609,766` | `verify-imaging-v4` (anchors, orientation §2.2, credits, budgets) · `verify-imaging-v4b` (22/22 cryosections) · `verify:audit-checks` (CT coverage honesty) | ok |
| 8 | v4 | "no embeddable CT grid" disables the button *with the reason in its tooltip* | `src/components/PlatesTab.tsx:219` | `verify-imaging-v4` (manifest status) | ok |
| 9 | v7 | telencephalon: 22 meshes, 46 registry entries, 4 levels, 3 plates, ghost cortex | `src/components/viewer3d/SceneLayers.tsx:101,279,511,551` (`GHOST_OUTLINE_OPACITY` 0.05 / `GHOST_SHELL_OPACITY` 0.14); `src/geometry/materials.ts:386-408` (`createGhostShellMaterial`: opacity 0.14, `depthWrite:false`, `side: FrontSide`) | `verify:audit-checks` (outline branch) · `verify:closure-bite` (4a/4b presets) · `budget-report` · `validate` | ok |
| 10 | v7 | "No placeholder geometry at the origin" (`TEL_CONTENT_ONLY_IDS`), 20 records content-only | `src/geometry/anatomyAssets.ts:194,405` | `verify:audit-checks` (inventory) · `verify:view-filter-consistency` (264 structures) | ok |
| 11 | v7 | explode: 16 au per hemisphere shell, 6 au per nucleus | `src/components/viewer3d/SceneLayers.tsx:300` (`HEMISPHERE_EXPLODE_FACTOR = 16`); `src/components/viewer3d/NucleusMesh.tsx:182-183` (`explode * 6`, inlined) | none — **untested claim** (no gate asserts either factor) | ok, gate missing |
| 12 | v7 | presets Brainstem focus (default) / Deep structures / Whole brain / Cortex only | `src/state/store.ts:686-766` (`VIEW_PRESETS`), `:775-777` (`defaultLayers`), `:844-975` (load-time assertions) | `verify:division-toggles` (boot still `brainstem-focus`) · `verify:audit-checks` · `verify:area-toggles` | **wrong** — the presets exist but the UI to reach them does not (FEA-001/FEA-002) |
| 13 | v8 | 14 named artery records + territory/supply/clinical on real BP3D meshes | `src/data/structures/vasculature.json`; `src/geometry/materials.ts:411-456` (`createVesselMaterial`: roughness 0.34, clearcoat 0.3, opacity 0.5, `#7f1d1d` cap) | `verify:vessel-render` (75/75, one-body-per-record table) · `verify:vasc-courses` (2,171) | ok (record count now 53 — FEA-006) |
| 14 | v8 | Vasculature preset; overlay hidden by default *by the region layer*, asserted both ways | `src/state/store.ts:758-765`, `:835-911` (the vascular exemption + its own assertions) | `verify:audit-checks` (dimmed-row predicate + its pinning assertion) · `verify:area-toggles` | ok |
| 15 | v8 | deep content: 12 cortical areas, 4 hippocampal subfields, optic pathway, ventricular segments, striatal depth | `src/data/structures/telencephalon-cortical-areas.json`, `-hippocampal-subfields.json`, `-optic-pathway.json`, `-ventricle-segments.json`, `-basal-ganglia.json` | `validate` (264 records, id/slug/name contract) · `verify:audit-checks` (inventory) | ok |
| 16 | v9 | somatotopy: 16 M1/S1 records, probed placement, order enforced, oriented-patch overlay, one colour ramp | `src/geometry/somatotopy.ts`; `src/components/viewer3d/SomatotopyOverlay.tsx:248,252-258` | `verify:somatotopy` — **45 passed · 0 failed**, prints the order/arc/x tables | ok |
| 17 | v9 | cortical-division layer with fitted boundaries + per-boundary residuals in the file header | `src/components/section/corticalLobes.ts` (header + `:375,385` floors) | `verify:cortical-lobes` — **564/564 assertions**, prints the per-plane per-division table | ok |
| 18 | v9 | measured imaging registration; 24 photo plates corrected+applied; CT/MRI measured and rejected with numbers | `src/assets/imaging/registration-fit.json`, `plate-fit.json` (200 KB/93 KB), `src/components/section/imageLayers.ts` (`fittedFit` preference); manifests carry the rejected fits | `verify:imaging-fit` (**unverifiable here** — EPERM; README's own v9 note records 289 assertions/20 failures when driven through a copy) · `verify-imaging-v4` | ok (gate unverifiable here) |
| 19 | v9 | simulated-section PiP that never shows imagery; pixel guard; clamps 224–880 × 170–640 px | `src/components/viewer3d/SectionPiP.tsx`; `src/components/viewer3d/PipSection.tsx`; `src/state/store.ts:283-285` (`SECTION_PIP_SIZE_MIN`/`MAX`) | `verify:pip-contract` — **panel contract PASSED** (the arm of it that would fail on regression) | ok |
| 20 | v10 | plane helpers derived from `CLIP_BOUNDS`, constant ≈4 au grid, no extent literal | `src/components/viewer3d/PlaneHelpers.tsx`; `src/components/viewer3d/clipPlanes.ts:1-5` (`CLIP_BOUNDS` x ±58 · y −55…116 · z −76…72) | `verify:plane-helper-extent` — **206 passed · 0 failed** (prints the mutation proof + the shipped SHA-256 unchanged) | ok |
| 21 | v10 | division visibility on/off + one-click Solo per division | `src/components/Legend.tsx:82-88,147-157` (`data-division-action="solo"`) | `verify:division-toggles` — **251 passed · 0 failed** (renders the shipped Legend through `react-dom`, drives the shipped handlers) | ok |
| 22 | v10 | four-corner PiP resize | `src/components/viewer3d/SectionPiP.tsx:411-424,871-887` (`se` keeps the bare `.pip-resizer`, `--nw/--ne/--sw` modifiers) | `verify:pip-contract` group F (local-frame geometry proof + 6/6 mutations) | ok |
| 23 | v10 | cortical-division quality: arc ≥ 10 au, drawn area ≥ 25 au², label area ≥ 25 au², no 1-vertex runs | `src/components/section/corticalLobes.ts:375,385,619-620` | `verify:cortical-lobes` (sliver census: `arc < 2/5/10` = 0, `area < 1/10` = 0) | ok |
| 24 | v10 | cortex canvas label dropped, contour kept | `src/components/section/SectionCanvas.tsx:239` (`NO_CANVAS_LABEL_RECORD_IDS`), `:765,1971,2078,2361` | `verify:cortical-lobes` (real `react-dom` render: cortex chip `""`, thalamus chip renders) | ok |
| 25 | v11 | Areas + Systems toggle rows; 7 regions owned exactly once; Systems = `ALL_KINDS` | `src/components/Header.tsx:314-418` (`data-area`, `data-kind`, `data-division`); `src/state/store.ts` `AREAS`/`ALL_ON_LAYERS` | `verify:area-toggles` (exit 0, prints the partition tables) · `verify:nerve-kind` (79/0) | ok |
| 26 | v11 | one visibility decision across 3D / live section / PiP | store layer predicate + `src/components/section/SectionCanvas.tsx` (`isPartVisible` only) + `src/components/viewer3d/SceneLayers.tsx` (`layersAdmit`) | `verify:view-filter-consistency` — **102/102 · 548 cross-surface comparisons · 0 disagreements · 75 `Path2D`s stroked** | ok |
| 27 | v11 | "All shows everything" / "Reset restores the default framing" | `src/components/Header.tsx:177-184` (`setSlice` = regions + kinds only) vs `src/state/store.ts:717` (`hidden: CORTEX_PRESET_IDS`) | none for this claim (the gate asserts the slices, not the promise) | **wrong** — FEA-002 |
| 28 | v11 | "the preset row is not deleted — it moved … Reset and All at the end of that row" | `src/components/Header.tsx:74-84` ("v12 — the preset shortcut row is GONE") | `verify:area-toggles` §11 dead-click guard (asserts the post-v12 header) | **wrong** — FEA-001 |
| 29 | v12 | two All modules (areas / systems), one per axis, each on its group's line | `src/components/Header.tsx:220-306` (`data-row="all-areas"/"all-systems"`, `data-header-action`, `role="group"`) | `verify:area-toggles` · `verify:a11y-contract` (38/0) | ok (undocumented — FEA-011) |
| 30 | v12 | Clinical motor survives as a Systems-row category, from `VIEW_PRESETS` (no second definition) | `src/components/Header.tsx:407-417` | `verify:area-toggles` (real `react-dom` header render) | ok (undocumented — FEA-011) |
| 31 | v13 | 12 cranial-nerve records, 7th kind `nerve`, Cranial-nerves toggle, foramen per nerve | `src/data/structures/{brainstem,telencephalon}-cranial-nerves.json`; `src/types.ts`; `src/data/load.ts` `ALL_KINDS`; `src/components/Header.tsx:104-116` | `verify:cranial-nerves` — **451 assertions · 0 failed** · `verify:nerve-kind` — 79/0 | ok |
| 32 | v14 | 12 authored courses; one body per nerve (tube XOR marker); both surfaces | `src/geometry/curves.ts` (`NERVE_COURSES`); `src/components/section/sectionAssets.ts:244,264-265` (`SECTION_NERVE_PARTS`, `partsForCanvas`) | `verify:cranial-nerve-courses` (220/0) · `verify:cranial-nerve-render` — **47/47** | ok (README says 46/47 — FEA-008) |
| 33 | v15 | six-area factual audit + corrections ledger + a structural check named `verify:audit-facts` | `scripts/verify/audit-facts.mjs` (34.6 KB, 13 groups); `docs/audit/v15/*` (9 files) | `node scripts/verify/audit-facts.mjs` — runs, **47/49 pass**; **no npm script wires it** | **wrong** (wiring + 2 content failures) — FEA-013 |
| 34 | v16 | single-click select in the live section **without** jumping to the 3D tab | `src/components/section/SectionCanvas.tsx:2263-2293` (`selectStructure(hit.group, { tab: null })`) | none directly (`verify:audit` R3b is browser-only); the contract is asserted structurally only | ok, gate is browser-only |
| 35 | v16 | `neuroaxis.sectionUnderlay` opacity migration (old subdued default → base-plate 1.0) | `src/state/store.ts:337-439` (`isV3Payload` migration, `schemaVersion`) | `verify:audit-checks` · `verify:pip-contract` (imagery scope) | ok |
| 36 | v17 | 53 vessel records / authored courses / drawn tubes; no blobs; radii from stated calibres; surface hugging measured | `src/data/structures/vasculature-courses.json`; `src/geometry/vasculature-courses.ts:266-408,874-923`; `src/components/viewer3d/SceneLayers.tsx:715-739` (ellipsoid suppression) | `verify:vasc-courses` — **2,171 assertions · 0 failures** · `verify:vessel-render` — **75/75 · blobs 0**, measured **41 courses / 79 tubes** | ok in code; counts wrong in the README — FEA-016 |
| 37 | v17 | "every visible structure's triangles" reach the 2D section canvas | `src/components/section/SectionCanvas.tsx:2114-2126` (registry appends `registryNerveParts()` only) vs `partsForCanvas()` (190 metas) | `verify:area-toggles` **pins the open state** ("fails the moment the line lands") | **wrong** — FEA-003 |
| 38 | v18 | vessel material reads as an artery; paired tracts/nerves mirrored on both sides | `src/geometry/materials.ts:411-456`; `src/components/viewer3d/TractTube.tsx` (`mirrored`), `src/components/section/sectionAssets.ts:249` (`#mirror` keying) | `verify:vessel-render` (77 = 40 + 37 mirrored; mirror bboxes negated) · `verify:cranial-nerve-render` | ok (undocumented — FEA-011) |
| 39 | all | syndrome browser: "24 cards" (L45) | `src/components/SyndromeBrowser.tsx:50` (`{syndromes.length} cards`) | `validate` (26 syndrome records) | **wrong** (prose only) — FEA-004 |
| 40 | all | "12 interactive 2D plates" (L41) | `src/data/plates.json` (15 records) + `src/data/plates/*.svg` (15) | `validate` (15/15/15) | **wrong** — FEA-005 |
| 41 | all | zh-CN README as a full translation | `README.zh-CN.md` (1388 lines vs 1567) | none | **wrong** — FEA-009 |
| 42 | all | per-era evidence numbers quoted as current | README §Content scope, script table, project layout | `validate` / gates print the true numbers | **suspect** — FEA-006, FEA-007, FEA-010 |

**Reverse sweep (built but undocumented).** Everything the code carries for v12 / v15 / v16 / v18 has **no README
version entry**: `grep -n 'v12|v16|v18' README.md` returns exactly one line (L1268, a table cell). Rows 29, 30, 34,
35 and 38 above are delivered features whose only narrative lives in code comments and
`docs/SWARM_V17_PLAN.md` §12 (v18b falsification report). See **FEA-011**.

---

## 2. Verdict / severity summary

| verdict | count | ids |
| --- | --- | --- |
| `ok` | 1 | FEA-014 |
| `wrong` | 12 | FEA-001 · FEA-002 · FEA-003 · FEA-004 · FEA-005 · FEA-007 · FEA-008 · FEA-009 · FEA-010 · FEA-013 · FEA-015 · FEA-016 |
| `suspect` | 2 | FEA-006 · FEA-011 |
| `unverifiable-here` | 1 | FEA-012 |
| **total** | **16** | |

| severity | count | ids |
| --- | --- | --- |
| `critical` | 3 | FEA-001 · FEA-002 · FEA-003 |
| `major` | 7 | FEA-004 · FEA-006 · FEA-008 · FEA-009 · FEA-011 · FEA-012 · FEA-016 |
| `minor` | 6 | FEA-005 · FEA-007 · FEA-010 · FEA-013 · FEA-014 · FEA-015 |

| basisKind | count |
| --- | --- |
| `internal` (contradiction with another record / gate / the same file) | 14 |
| `standard` (the sandbox's own documented boundary) | 1 |
| `judgment` (labelled as such — FEA-014, the positive delivery finding) | 1 |
| `textbook` / `nomenclature` | 0 — this area audits *delivery*, not anatomy (that is `audit-facts`) |

### The three findings that matter

1. **FEA-001 (critical).** The README promises a preset shortcut row with **Reset / All** in five places
   (L27, L38, L1067-1074, L1403). v12 deleted it from the product
   (`Header.tsx:74-84`: "the preset shortcut row is GONE … the All on / All off module replaced the old Reset /
   All pair"). `applyViewPreset` now has exactly **one** UI caller (the Clinical motor button). The result is not
   just a stale sentence: **six of the nine documented presets are unreachable**, and nothing in the suite guards
   the README's claim (the gate was re-pointed at the post-v12 header, correctly, without touching the prose).
2. **FEA-002 (critical).** "All shows everything" is false for the two All modules: `setSlice` writes regions and
   kinds only (`Header.tsx:177-184`), while the v7 structure-level `hidden` set (32 taxonomy rows = **28 authored
   records**, measured) is written only by `applyViewPreset`. On the shipped default framing those 28 records stay
   hidden through both "All on" clicks, and there is no control anywhere that can reveal them. On the 2D
   section/PiP the same click is a complete no-op, because those surfaces never read `hidden` (the README says so
   itself at L1155).
3. **FEA-003 (critical).** v17's vessel layer is computed, gated and admitted to the canvas part list
   (`partsForCanvas()` = 138 + 12 + 40 = **190**) but the worker registry still receives only 138 + 12, because
   `SectionCanvas.tsx:2126` appends `registryNerveParts()` and never `registryVesselParts()`. `verify:area-toggles`
   **pins this open state** in its own sentence, so the gate only fires if someone fixes it. Architect deviation
   **D4**, confirmed measured from this side.

### Findings that are about honesty rather than product

- **FEA-008** — the README still reports `verify:cranial-nerve-render` as the run's one product-red gate at
  **46/47**; the re-point has already landed (`cranial-nerve-render.mjs:363-366` carries the three-term identity)
  and the gate measured **47/47, exit 0** here. A red claim with no red gate.
- **FEA-012** — `verify:anatomy` (27/27) and `verify:imaging-fit` cannot be run from this environment at all
  (`EPERM` on piped child stdio, before any assertion). Reported as `unverifiable-here`, **not** claimed green.
  The one measurement anatomy-qa was blocked on was re-derived another way and agrees exactly:
  `src/assets/anatomy` = **14,566,178 B = 13.8914 MiB / 140 files**.
- **FEA-013** — `scripts/verify/audit-facts.mjs` documents `npm run verify:audit-facts`, but package.json has no
  such script (D5). Run directly, it prints **49 assertions · 47 passed · 2 failed** — two content rows for
  `audit-facts` to own: `vasc-sca-vermian-branches` is midline with `x = 5.2 au`, and
  `ctx-internal-medullary-lamina` is `laterality: "paired"` in the record and `"midline"` in the registry.
- **FEA-015** — three numbers the README states as fact (`HEMISPHERE_EXPLODE_FACTOR` 16 au, the nucleus `explode * 6`,
  the cyan CSF preset) are **true and ungated**: `grep` over every `scripts/verify/*.mjs` finds no assertion on them,
  while the neighbouring ghost-shell opacity *is* asserted (which is why that one is safe and these are not).
- **FEA-016** — the v17 section's headline arithmetic is one course short of the shipped table.
  `npm run verify:vessel-render` printed **"41 courses (2 built-in surviving + 2 replaced by authored + 37 new
  authored) … 3D tubes 79 = 41 + 38 mirrored … 2D parts 41 (79 worker parts)"**, and the data files agree
  (39 authored records = 36 paired + 3 midline; 4 built-ins, 2 replaced/grouped, 2 surviving). The README says
  40 courses, **37** paired, `2 × 37 + 3 = 77` tubes, "1 built-in surviving" — internally consistent, one course
  short of the data. audit-code-quality and audit-robustness reached the same 41/79 from their own probes.

---

## 3. Per-finding index (detail lives in the JSON)

| id | verdict / severity | one-line subject |
| --- | --- | --- |
| FEA-001 | wrong / critical | The preset shortcut row and Reset/All the README promises do not exist in the shipped header (v12 removed them). |
| FEA-002 | wrong / critical | "All shows everything" is false: the All modules never touch the structure-level `hidden` set (28 records stay hidden). |
| FEA-003 | wrong / critical | v17 vessel contours are built and gated but never sent to the worker, so no vessel paints in the 2D section or PiP. |
| FEA-004 | wrong / major | "Clinical syndrome browser — 24 cards"; the committed count is 26 (same file says 26 twice elsewhere). |
| FEA-005 | wrong / minor | "12 interactive 2D plates" in the Features head; the committed count is 15 (the same bullet's parenthetical). |
| FEA-006 | suspect / major | The Content-scope table mixes v8/v11/v13/v17 eras and contradicts itself (287 registry rows vs "236 entries"). |
| FEA-007 | wrong / minor | Project-layout block quotes the v7 imaging payload (8.71 MiB / 80 files); measured 9.02 MiB / 82 files. |
| FEA-008 | wrong / major | The README's "one product-red gate (46/47)" is stale — the gate is re-pointed and measures 47/47 here. |
| FEA-009 | wrong / major | README.zh-CN.md claims parity but stops at v14 (171 lines shorter, no v17 body, stale `vessel 14`, dead anchor). |
| FEA-010 | wrong / minor | One gate's assertion count is quoted five ways in one file (331 / 437 / 455 / 472 / 10-vs-14 groups). |
| FEA-011 | suspect / major | v12, v16 and v18 have no README version entry at all; v15 appears only through its artifacts. |
| FEA-012 | unverifiable-here / major | `verify:anatomy` and `verify:imaging-fit` cannot run here (EPERM before any verdict). |
| FEA-013 | wrong / minor | `verify:audit-facts` is documented but not wired in package.json (D5); run directly it is 47/49. |
| FEA-014 | ok / minor | Positive delivery finding: every v2–v18 era in the brief is present in code with a named gate (matrix §1). |
| FEA-015 | wrong / minor | Three documented numbers (explode 16 / 6 au, the cyan CSF preset) are true but **ungated** — the "untested claim" class. |
| FEA-016 | wrong / major | The v17 headline counts are off by one course: the shipped merge is **41 courses / 79 tubes**, not 40 / 77; the `2 × 37 + 3` pairing arithmetic no longer matches the data. |

---

## 3.5 Cross-area overlaps (for the integrator's CORRECTIONS ledger)

Five of this area's subjects were independently reached by a sibling auditor from a different direction. That is
corroboration, not duplication — but `integrate-fixes` must **merge them into one disposition each**, because the
same product change would otherwise be applied twice or rejected once and accepted once. Named, by sibling id:

| this area | sibling finding | what they establish that this file does not |
| --- | --- | --- |
| FEA-001 / FEA-002 (preset row gone; All modules are the only framing control) | `robustness rob-024` (suspect/minor: `neuroaxis.viewPreset` is written by exactly ONE control — the Clinical motor button — but read at every boot), `ux ux-039` (ok/minor: Clinical motor inside the Systems row is a view framing, not a system), `quality dc-06` (`.header-presets` CSS survives the v12 removal of the row it styled) | the persistence consequence (a legacy stored preset keeps deciding the boot framing with no UI to change it) and the dead stylesheet |
| FEA-003 (vessel contours reach no worker) | `robustness rob-021` (wrong/major: 79 registry parts, 2.08 MiB of copies, reach no worker), `quality td-05` (wrong/major, plan D4), `quality gq-29` (wrong/major: `verify:vessel-render`'s handoff branch can only PRINT — it cannot fail) | the memory cost of the dead registry path and the fact that the gate's handoff branch is not falsifiable |
| FEA-004 ("24 cards") | `quality doc-01` (wrong/major: README states the syndrome-card count twice with two different values) | the same contradiction, graded major there and major here — one edit fixes both |
| FEA-009 / FEA-011 (zh-CN frozen at v14; no v12/v16/v18 entries) | `quality doc-02/doc-04/doc-06/doc-08/doc-10/doc-13/doc-14/doc-19/doc-21…doc-24` (a series of zh-CN documentation findings) | the per-claim breakdown of the translation drift |
| FEA-013 (`verify:audit-facts` not wired) | `quality doc-19` (wrong/minor: `verify:audit-facts` and `verify:browser` are documented nowhere) | that the same script is missing from the script documentation as well as from `package.json` |
| FEA-016 (41 courses / 79 tubes) | `robustness rob-006` (wrong/minor: "measured 41 authored courses / 79 registry parts / 103 both families"), `quality gq-26`/`gq-28` | their independently measured 41/79 and the 103-part two-family total |
| FEA-015 (explode / CSF ungated) | `robustness rob-027` (ok/minor — a different ungated surface: the failed-mesh fallback) | a second instance of the same class, so the integrator can fix the class rather than one number |

**Nothing in this file was changed by, or changes, a sibling's output.** Writes stayed inside
`docs/audit/v19/features.findings.json` + `docs/audit/v19/features.md` (plus gitignored scratch under
`.dsh-scratch/feature-audit/`).

---

## 4. Reproduce this audit

```powershell
# the sweep that produced §0 (Chrome lanes excluded by contract)
npm run validate; npm run check; npm run build; npm run verify:pipeline; npm run verify:plane
npm run verify:plane-helper-extent; npm run verify:somatotopy; npm run verify:cortical-lobes
npm run verify:pip-contract; npm run verify:division-toggles; npm run verify:area-toggles
npm run verify:view-filter-consistency; npm run verify:audit-checks; npm run verify:closure-bite
npm run verify:boundary-contract; npm run verify:a11y-contract; npm run verify:budget-report
node scripts/verify-imaging-v4.mjs; node scripts/verify-imaging-v4b.mjs
npm run verify:cranial-nerves; npm run verify:nerve-kind; npm run verify:cranial-nerve-courses
npm run verify:cranial-nerve-render; npm run verify:vasc-courses; npm run verify:vessel-render
node scripts/build-anatomy-geometry.mjs --manifest
node scripts/verify/audit-facts.mjs        # 47/49 — the two failures are FEA-013's evidence
npm run verify:anatomy                      # exit 1 EPERM — environment (FEA-012)
npm run verify:imaging-fit                  # exit 1 EPERM — environment (FEA-012)

# the derived counts quoted above
node .dsh-scratch/feature-audit/counts.mjs        # 264 records / 287 rows / 138 parts / 599,204 tris
node .dsh-scratch/feature-audit/hidden-set.mjs    # boot hidden set: 32 rows = 28 authored records
node .dsh-scratch/feature-audit/vessel-counts.mjs # 39 authored courses / 36 paired + 3 midline / 4 built-ins
node .dsh-scratch/feature-audit/check-schema.mjs  # re-validates the findings file (schema + summary)
```

The three helper probes are gitignored scratch (`.dsh-scratch/feature-audit/`), read-only against the product.
