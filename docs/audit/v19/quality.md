# NeuroAxis v19 — code quality / architecture audit (`audit-code-quality`)

**Run** `run-muf4frwh-02e3` · **area** `quality` · **plan of record** [`PLAN-run-muf4frwh-rz8s.md`](../../../PLAN-run-muf4frwh-rz8s.md) §3.6
**Machine-readable twin** [`quality.findings.json`](quality.findings.json) — 79 findings, all 12 schema keys, enum-valid, 0 violations.
**Scope discipline:** findings only. No product code, data, CSS or gate script was edited. `git status --porcelain` before and after this audit is identical (one pre-existing change, `.dsh-swarm/task-architect-review.json`); nothing under `src/`, `scripts/`, `public/` or any JSON data file was written.

---

## 1. Verdict / severity summary

| lane | findings | ok | wrong | suspect | unverifiable-here | critical | major | minor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dc · Dead code | 9 | 1 | 7 | 1 | 0 | 0 | 2 | 7 |
| cs · Consistency | 6 | 1 | 0 | 5 | 0 | 0 | 1 | 5 |
| td · Tech debt | 8 | 3 | 4 | 1 | 0 | 0 | 4 | 4 |
| gq · Gate quality | 32 | 23 | 6 | 3 | 0 | 0 | 6 | 26 |
| doc · Documentation | 24 | 8 | 16 | 0 | 0 | 0 | 11 | 13 |
| **total** | **79** | **36** | **33** | **10** | **0** | **0** | **24** | **55** |

Basis kinds: `internal` 75 · `judgment` 2 (cs-05, td-07) · `standard` 2 (doc-14, doc-15) · `textbook`/`nomenclature` 0 — this lane has no anatomy claims to make, so every finding rests on a contradiction measurable inside the repository, on a named standard (MIT/CC licence texts, Node `child_process` semantics), or on a judgement that is labelled as one.

**The 22 `wrong` + `major` findings, in one line each:**

| id | what is wrong |
| --- | --- |
| dc-01 | `SceneLayers.tsx:748` is unreachable (line 736 already covers it) — and `verify:vessel-render.mjs:683` pins that dead line |
| dc-02 | The section-capping registry is write-only: 7 factories write it, `firstSectionCapColor()` has zero callers since the v9 GPU rig was deleted |
| td-04 | The v12g `--sidebar-w` gap is still open: 320 px header column vs 264 px sidebar at 641–1024 px = **56 px** misalignment; no gate reads the variable |
| td-05 | The vessel-contour 2D handoff is still open — **79** ready parts reach no worker (plan D4) |
| td-06 | `verify:audit-facts` has no npm script and is in no README tier list, and it is **RED with 2 real data defects** (plan D5) |
| td-08 | The tier-1 `build-anatomy-geometry.mjs --manifest` **rewrites** the manifest it validates, so drift is repaired rather than reported and a deleted GLB only warns |
| gq-07 / gq-31 | `verify:anatomy` **cannot run**: exit 1, `spawnSync powershell EPERM`, 0 of 27 verdicts — for a byte total Node computes natively |
| gq-16 | `audit-facts.mjs` exits 1: `49 assertions · 47 passed · 2 failed` |
| gq-29 | `verify:vessel-render.mjs:1084-1094` is an `if/else` that only `console.log`s — it can never fail |
| gq-30 | The same gate's PASS banner claims the live-section surface its own HANDOFF line contradicts |
| doc-01/02 | README (both languages) says **24** syndrome cards in the feature list and **26** in the content table; the data says 26 |
| doc-03/04 | README (both) computes Structures as `264 − 23 = 241`; the 23 tracts are not in `structures/*.json` (0 id overlap) — `264 + 23 = 287` = the registry |
| doc-05/06 | `verify:area-toggles` is quoted at **331 / 437 / 455** assertions across five lines of one README; the gate prints **472** |
| doc-07/08 | README (both) says **40** vessel courses / **77** drawn tubes; the owning gate prints **41 / 79** — the v18b course was added after the prose |
| doc-09/10 | README (both) says the imaging payload is **7.30 MiB in 80 files** inside an **8 MiB** cap; disk and two gates say **9.02 MiB in 82 files**, cap **10.00 MiB** (AMENDMENT B) |
| doc-13 | `docs/ATTRIBUTION.md:420` establishes the provenance of **12** SVG plates under a glob that now matches **15** |

---

## 2. Method (what was executed, not read)

| measurement | how |
| --- | --- |
| dead-code scan | inline Node walk of `src/**/*.{ts,tsx}` (509 exported symbols) requiring a `\bNAME\b` match in another `src` file **or** any `scripts/**/*.{mjs,js}` file; self-mention count 1 identifies a symbol used nowhere, including its own module |
| gate sweep | all **28** non-browser commands of plan §5 executed once through `npm` in one session; exit code, wall time and summary line recorded. The three browser lanes (`verify:browser`, `verify:acceptance`, `verify:audit`) were **not** run — Chrome cannot start in this sandbox |
| data counts | read-only Node one-liners over `src/data/**`, `src/assets/anatomy/anatomy-manifest.json`, `src/assets/imaging/**` |
| licence check | `docs/ATTRIBUTION.md` statements cross-read against `LICENSE`, the licence constants in `src/data/sectionImages.ts`, and (for BodyParts3D) the rights holder's own licence page |

Not run, and why: `node scripts/build-anatomy-geometry.mjs --manifest` — it writes `src/assets/anatomy/anatomy-manifest.json` (line 711), outside this audit's write scope. That is itself finding td-08. Its numbers were obtained from `verify:budget-report`, which computes the same quantities with `fs`.

---

## 3. The gate sweep (exit codes and printed numbers)

| # | command | exit | what it printed |
| --- | --- | --- | --- |
| 1 | `npm run validate` | 0 | `0 errors, 0 warning(s)`; 20 files / 264 records · 23 tracts · 26 syndromes · 15 plates + 15 SVGs · 287 registry rows (kind split printed) · 17 levels |
| 2 | `npm run check` | 0 | silence (22.0 s) — no assertion count exists for this gate |
| 3 | `npm run build` | 0 | `✓ built in 16.14s`; `index-*.js 1,888.18 kB` |
| 4 | `npm run verify:pipeline` | 0 | `138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)` |
| 5 | `npm run verify:plane` | 0 | `10827 assertions`; reports the coronal camera-basis degeneracy without failing |
| 6 | `npm run verify:plane-helper-extent` | 0 | `206 passed · 0 failed` + scratch-tree hash proof |
| 7 | `npm run verify:anatomy` | **1** | `spawnSync powershell EPERM` at `anatomy-qa.mjs:294`; groups 1–2 printed, group 3 died → **0 of 27 verdicts** |
| 8 | `npm run verify:somatotopy` | 0 | `45 passed · 0 failed` |
| 9 | `npm run verify:cortical-lobes` | 0 | `564/564 assertions passed` |
| 10 | `npm run verify:imaging-fit` | **1** | `FAIL the fitter could not be re-run: spawnSync … EPERM` → 0 verdicts (environment) |
| 11 | `npm run verify:pip-contract` | 0 | `187 passed · 0 failed` + 6 explicit non-claims |
| 12 | `npm run verify:division-toggles` | 0 | `251 assertions passed · 0 failed` |
| 13 | `npm run verify:view-filter-consistency` | 0 | `102/102` + anti-vacuity section: `548 cross-surface state comparisons`, `75 Path2D stub(s) built, 75 moveTo / 2233 lineTo` |
| 14 | `npm run verify:area-toggles` | 0 | `472 assertions passed · 0 failed` (14 groups; stable over 3 sequential runs) |
| 15 | `npm run verify:audit-checks` | 0 | `92 passed · 0 failed · 7 informational · 9 group(s)` |
| 16 | `node scripts/verify/audit-facts.mjs` | **1** | `49 assertions · 47 passed · **2 failed**` — `vasc-sca-vermian-branches x=5.2` on a midline check; `ctx-internal-medullary-lamina` laterality record vs registry |
| 17 | `npm run verify:closure-bite` | 0 | `7/7 mutations caught by the mirror · shared tree untouched` |
| 18 | `npm run verify:boundary-contract` | 0 | `22 passed · 0 failed` |
| 19 | `npm run verify:a11y-contract` | 0 | `38 passed · 0 failed` (source-text assertions) |
| 20 | `npm run verify:budget-report` | 0 | `5 passed · 0 failed · 5 informational`; `599,204 tris` · `13.82 MiB` · `140 file(s)` · imaging `9.02 MiB / 82 files` |
| 21 | `node scripts/verify-imaging-v4.mjs` | 0 | `✔ v4 imaging QA PASSED`; per-family table; `cap 10.00 MiB, AMENDMENT B`; no assertion total printed |
| 22 | `node scripts/verify-imaging-v4b.mjs` | 0 | `OK — 22 cryosections … credit verbatim in 5 records`; `22/22 raw source plates re-decoded` |
| 23 | `npm run verify:cranial-nerves` | 0 | `451 passed · 0 failed` |
| 24 | `npm run verify:nerve-kind` | 0 | `79 passed · 0 failed` |
| 25 | `npm run verify:cranial-nerve-courses` | 0 | `220 assertions, 0 failures` |
| 26 | `npm run verify:cranial-nerve-render` | 0 | `47/47 assertions` |
| 27 | `npm run verify:vasc-courses` | 0 | `2171 assertions, 0 failures` |
| 28 | `npm run verify:vessel-render` | 0 | `75/75 assertions`; `41 courses (2 built-in + 2 replaced + 37 new) + 0 group(s)` · `79 = 41 + 38 mirrored` · `79 worker parts` · `blobs 0` |
| — | `node scripts/build-anatomy-geometry.mjs --manifest` | **not run** | writes the committed manifest — see td-08 |

**Score: 25 green · 3 red · 1 not run.** All three reds are script/environment defects or an unwired data gate, not product regressions: two die on the sandbox's piped-child-stdio denial before any verdict (gq-07, gq-31, gq-10), and one is a real gate reporting two real data defects that no documented command runs (gq-16, td-06).

---

## 4. The five questions the brief asked, answered

### (1) Dead code

Mechanical result: **509** exported symbols; **191** are referenced nowhere outside their own module; of those, **18 are declared and used exactly zero times anywhere** (dc-05 lists all of them with file:line). The retired machinery is real and still shipping:

- **The v9-deleted GPU stencil rig** left a write-only registry: `enableSectionCapping` is called by all seven material factories (`materials.ts:235, 275, 302, 328, 356, 407, 460`) and `firstSectionCapColor()` (`materials.ts:136`) — the only reader — has **zero** call sites. `registeredAnatomyMaterials()` and `updateAllClipping()` are also uncalled. `materialRegistry`/`sectionCapRegistry` still grow one entry per material with a dispose listener each (dc-02, dc-03, dc-04). The `materials.ts:109-110` doc comment still describes the deleted consumer in the present tense, while `SectionPiP.tsx:87-90` admits the retention is accidental.
- **The v12-removed preset row** left two dead CSS rules (`layout.css:96-100` and the `≤640px` override at `:374-376`) whose class no JSX renders — the project's own gate asserts the group is absent (`area-toggles.mjs:1251-1252`). `VIEW_PRESETS`/`viewPresetOf` are **not** dead: the Clinical-motor button and the default framing still resolve through them (`Header.tsx:150-156, 413-414`).
- **The ellipsoid suppression paths** are live but contain one unreachable statement: `SceneLayers.tsx:748` re-tests `hasVesselCourse(record.id)` after `:736` already returned for it (dc-01). The `variant="vessel"` mount and the group-head branch are the v17/v18 additions; the group branch is currently inert because `VESSEL_COURSE_GROUPS` is empty (the gate prints `+ 0 group(s)`, dc-08).
- **`NOTE (orchestrator-only)`** — two occurrences, both after the failure branch, both explicitly disclaiming browser claims (`cranial-nerve-render.mjs:661`, `vessel-render.mjs:1272`). They are honest, not assertions in name only (dc-09) — but see gq-30 for the PASS banner printed just above the second one.

### (2) Consistency

- **The record hierarchy is coherent but not a hierarchy.** `TractRecord` (15 fields), `NerveCourseRecord` (46 lines redeclaring them) and `VesselCourseRecord extends VesselCourseHead` (71 lines) are three parallel definitions; neither course type `extends TractRecord`, so the documented "structural superset" is enforced only structurally at the three `<TractTube>` call sites — which tsc does enforce (`check` exits 0). Not a defect; the drift surface is real (cs-01, cs-05).
- **The v18 `variant` prop should have been kind-derived, and it has no gate.** The information is already on the record (`kind: 'vessel'`), and the sibling pass already does exactly this kind of derivation (`hintForKind`, `NucleusMesh.tsx:67-79`). Measured consequence: `grep variant scripts/verify/**` → **0 matches**, so dropping `variant="vessel"` from `SceneLayers.tsx:839-840` silently reverts the user-reported "colors are different — all bright red" defect with every gate still green (cs-02, gq-32).
- **The three course mounts are duplicated**, and the tracts and nerves blocks contain the byte-identical pairing expression; only the vessel block uses the shared `isPairedVessel` predicate that the v17 plan documents as the one rule (cs-03).
- `presetFocusReading` retains a v11 fallback chain that only its own synthetic fixture can reach, because `audit.mjs` always supplies `rowFraming` (cs-04).

### (3) Tech debt

- **The two "red gates" (D1): both premises are stale, by measurement.** `verify:area-toggles` exits **0** with **472** assertions and already drives the post-v12 header (`areas-all-on`, `systems-all-on`, `clinical-motor`, the region-backed `data-system-region="vasculature"`), and it *asserts* the removals. Every `clickHook` site in `audit.mjs` is post-v12; the surviving `.header-presets`/`[data-preset]` references are deliberate zero-count reads, guarded by `area-toggles.mjs:2415-2471`. Nothing needs re-pointing for this run (td-01, td-02).
- **The v11 item-4 divergence (D2): closed and doubly guarded.** `area-toggles.mjs` §10 re-measures the canvas' own paint path at y = 6/26/30/32 with a non-vacuity assertion (`:2198`), and `view-filter-consistency.mjs:1097` adds the same guard from the other side. Restate with those numbers; do not treat it as open (td-03).
- **The v12g `--sidebar-w` narrow-breakpoint gap: still open.** `--sidebar-w` has one declaration (320 px); the `≤1024px` block overrides the shell's first column to a literal 264 px without re-declaring it, so the header's rows start **56 px** right of the 3D view's left border at 641–1024 px. At `≤640px` the header also regains `padding: 8px 10px`, contradicting the v12g rule that the first column start at x = 0. No gate reads the variable (td-04).
- **D4** (vessel contours) open, now quantified: **79** parts ready, one line missing (td-05). **D5** (missing npm script) confirmed, and it matters more than the plan recorded because the unwired gate is **red** on two live data defects (td-06).
- `build-anatomy-geometry.mjs --manifest` is a writer wearing a gate's name (td-08).

### (4) Gate quality

The suite is **not** vacuous. Three structures are worth naming as good practice: `closure-bite` proves 7/7 injected mutations are caught and prints per-file hashes; `view-filter-consistency` prints an explicit *"execution evidence (nothing above ran vacuously)"* section with counters (`75 Path2D stub(s) built, 75 moveTo / 2233 lineTo`); `area-toggles` §11 parses every static browser probe and scans every click hook for dead targets. 23 of 32 gate findings are `ok` with printed numbers.

Four gates would pass with the feature deleted (gq-32):

1. **`variant="vessel"`** — no gate references it (cs-02).
2. **The vessel 2D contours** — `vessel-render.mjs:1084-1094` prints the defect and exits 0 (gq-29), while `area-toggles.mjs:1935-1939` *pins the open state*, so the correct one-line fix turns that gate red instead. **The two gates covering the same handoff disagree about whether it is a failure, and neither can go red for the missing contours.**
3. **The 641–1024 px header alignment** — no gate reads `--sidebar-w` (td-04).
4. **A committed GLB** — `--manifest` repairs and warns; `verify:anatomy` cannot run (td-08, gq-07).
5. Plus **anything only `audit-facts.mjs` catches**, which is two live defects today (gq-16).

Two gates cannot run at all in the documented verification environment (gq-07/gq-31, gq-10), and one of them prints its block as `FAIL`, which reads as a product failure in a sweep log. `verify:vessel-render.mjs:1271` ends with a PASS banner for "the live section" that the same script's HANDOFF line 180 lines earlier contradicts (gq-30). `verify:plane` reports a known-degenerate coronal camera basis and exits 0 (gq-05). `a11y-contract` asserts CSS/TSX text, so a class whose last consumer was deleted passes — demonstrated by the repository's own `.header-presets` rules (gq-19, dc-06).

### (5) Documentation

**20+ claims spot-checked per README**: **12** falsifiable claims resolved against `README.md` (findings doc-01, 03, 05, 07, 09, 11, 12, 17, 18, 19, 20, 21) and **11** resolved against `README.zh-CN.md` (doc-02, 04, 06, 08, 10, 14, 19, 21, 22, 23, 24), each with a measured number from the data, from the gate that owns the fact, or from the rights holder's own page. The documentation lane holds **24 findings: 16 `wrong`, 8 `ok`** — the `ok` set is doc-14/15/16 (licences), doc-17/18/21/23/24 (the totals that reproduce). The numbers that are *right* are the load-bearing payload ones — 138 parts, 599,204 triangles, 13.82 MiB manifest / 13.89 MiB directory / 14,566,178 B, 287 registry rows, 264 records in 20 files, 23 tracts, 26 syndromes, 15 plates, 17 levels, the `14 + 39 = 53` vessel decomposition, and five per-gate counts (45/564, 187/251, 102/102, 92/9 groups, 75/75) — which is why the drift is identifiable rather than general.

The drift has one shape: **totals written at a version boundary and never re-measured when the next version added to them.** Syndrome cards 24 → 26; vessel courses 40 → 41 (v18b); assertion counts 331 → 437 → 455 → 472 (and the group count 10 → 14); imaging payload 7.30 → 9.02 MiB and its stated cap 8 → 10 MiB; plate split 11/2/2 → 10/2/3; the `241` subtraction, which was wrong from the start. In three cases the same file states both the stale and the current value (README.md L45 vs L1484, L1062 vs L1268 vs L1372, L662 vs L814), and `README.zh-CN.md` carries **seven** stale `verify:area-toggles` occurrences (331 ×4, 437 ×1, 455 ×2).

**Structural sync:** the two READMEs have **72/72 identical headings in identical order** and the 179-line difference accumulates inside sections, so no section or table is missing from the translation — and every stale number found in one is present in the other, i.e. a shared source of stale figures, not a translation gap. Both files must be edited together.

**`docs/ATTRIBUTION.md` licences:** the high-stakes statement is **correct and was verified at the rights holder** — the DBCLS/LSDB licence page states CC Attribution 4.0 International and gives the attribution string quoted character-for-character at `ATTRIBUTION.md:63` (doc-14). The code licence matches `LICENSE` (MIT, doc-15), and every embedded imagery family reconciles with its stanza by file count: 41 `ubc-*` = 17 v3 + 24 v4, 10 `bmm-*`, 3 `wikict-*`, 22 `vhp-*`, plus the named ct/mri grids (doc-16). **One gap:** `ATTRIBUTION.md:420` establishes provenance for "All 12 SVG plates" under a glob that now matches **15** — the three v7 telencephalon plates are unaccounted for in the document a downstream user would cite (doc-13).

---

## 5. Routed handoffs (nothing here is an edit by this task)

| for | items |
| --- | --- |
| **integrate-fixes** (product/data/`package.json`) | `td-06` add `"verify:audit-facts"`; `td-04` `--sidebar-w` at `≤1024px` + the `≤640px` padding; `td-05` the vessel-contour line **or** a documented open state; `gq-16` the two data defects (`vasc-sca-vermian-branches` x=5.2, `ctx-internal-medullary-lamina` laterality); `dc-01` delete the unreachable line; `dc-02`/`dc-08` retire or re-document the write-only cap registry; `cs-02` derive the vessel material from `kind` **and** gate it |
| **final-review** (gate scripts) | `gq-29` make the handoff branch an assertion; `gq-30` reword the PASS banner; `gq-07`/`gq-31` replace the two `execFileSync('powershell', …)` calls with `fs`; `gq-10` distinguish environment-blocked from failed; `td-08` add a read-only `--check` mode; `dc-01`'s pin at `vessel-render.mjs:683`; `td-05`'s gate flip at `area-toggles.mjs:1935-1939` (the D7 coupling) |
| **docs** (whoever owns README) | `doc-01`…`doc-13`, `doc-19`, `doc-20`, `doc-22` — one pass, both languages, using the gate's own printed numbers rather than recomputed ones |

**Unknowns this audit cannot close.** (a) The browser lanes were not run: every pixel, pointer, focus and runtime claim is untouched here and stays orchestrator-only. (b) One non-zero exit from `verify:area-toggles` was observed while a sibling gate was crashing in the same session and could not be reproduced in three isolated runs — recorded as `suspect`/minor (td-07), no mechanism claimed. (c) `docs/ATTRIBUTION.md`'s per-source licence quotes for UBC/MSU/NLM were checked against the repository's own constants and gates, not re-fetched at each source page; only BodyParts3D was verified at the rights holder. (d) Whether `vendor/esbuild-shim` needs its own attribution line was not established and is not claimed.
