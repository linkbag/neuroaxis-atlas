# NeuroAxis v19 — UI/UX audit (accessibility · discoverability · feedback · layout · naming)

**Area:** `ui-ux` · **Task:** `audit-ui-ux` (builder, findings-only) · **Run:** NeuroAxis v19 comprehensive audit
**Artifacts:** [`ux.findings.json`](./ux.findings.json) (40 findings) · this file
**Product/data files edited by this task: NONE.** Every claim below is read from the shipped source, the shipped
bundle, or the CSS tokens; nothing was changed to make a finding true.

---

## 1. What was executed (and what was not)

| Step | Command / method | Result |
| --- | --- | --- |
| a11y gate (source + shipped bundle + CSS + data) | `node scripts/verify/a11y-contract.mjs` | **exit 0** — `38 passed · 0 failed`; bundle reader read `dist/assets/index-DayLESCm.js` (1844 kB); plate data reader: 15 SVGs / 360 named regions, every id resolves |
| header a11y/state group | `npm run verify:area-toggles` (group 7 prints the accessible names) | **exit 0** on re-run — `472 assertions passed · 0 failed` (14 groups). The first (cold) run printed the whole a11y group and then aborted on a Windows file-lock (see §6.2); no assertion failed in either run |
| contrast, 18 tokens × 3 surfaces + 5 composites | `node -e` with the WCAG 2.1 relative-luminance formula (sRGB, 0.04045 knee) over the hexes in `src/styles/tokens.css` | all ratios quoted in the findings are from this run; candidates in `suggestedFix` were measured the same way |
| selector/inventory facts | `grep`/`glob` over `src/**`, `src/styles/*.css`, `scripts/verify/*.mjs`; `node -e` over `dist/assets/index-*.js` and the data JSON | every count quoted (12 nerve records, 9 stale context notes, 7 kinds, 5 areas + 7 systems + 1 region-backed + 5 action buttons, 3.31:1, …) |
| browser lanes | **not run** | Chrome cannot start in the agent sandbox (the run's ground rules reserve `verify:audit`/`verify:acceptance`/`verify:browser` to the orchestrator). No screenshot or accessibility-tree dump was available, so no finding asserts a rendered pixel as its evidence |

Every finding names **file:line + selector/data id**, states **what the code says**, **what it should say**, and a
**basis** with a kind (`internal` 20 · `standard` 18 · `judgment` 2).

---

## 2. Verdict and severity summary

| verdict | critical | major | minor | total |
| --- | --- | --- | --- | --- |
| `wrong` | **2** | **13** | 13 | **28** |
| `suspect` | 0 | 0 | 2 | 2 |
| `unverifiable-here` | 0 | 0 | 1 | 1 |
| `ok` | 0 | 0 | 9 | 9 |
| **total** | **2** | **13** | **25** | **40** |

By subsection (the five questions the task asks):

| subsection | findings | worst verdict |
| --- | --- | --- |
| 1 · Accessibility (WCAG 2.1) | ux-001 … ux-021 (21) | `wrong` / critical |
| 2 · Discoverability | ux-022 … ux-027 (6) | `wrong` / critical |
| 3 · Feedback | ux-028 … ux-030 (3) | `wrong` / minor |
| 4 · Layout & consistency | ux-031 … ux-035 (5) | `wrong` / major |
| 5 · Naming & UX writing | ux-036 … ux-040 (5) | `wrong` / minor |

### The two critical findings

1. **ux-001 — `div.section-canvas-wrap[role="img"]` makes an AX atom of a box that contains four interactive
   controls** (the cortical-divisions toggle, the nearest-plate chip, the attribution link, and the only
   selection label on that surface). WAI-ARIA gives `role="img"` `children presentational: true`. This repo
   already fixed exactly this defect class on the plate root (`scripts/verify/ax-delta.mjs:6-14`: before the fix
   the plate contributed **ZERO** interactive nodes) and asserts the fix in `a11y-contract.mjs:207-208`; the
   live-section wrapper still carries the retired pattern. This is also why no gate caught it: an AX atom
   contributes no child nodes, so the browser lane's "every interactive node has a name" check has nothing to
   fail on.
2. **ux-022 — the 12 cranial-nerve records' `course` (876–1290 characters each) and `modality` fields have no
   renderer.** `types.ts:70-85` declares them as "the two facts a reader needs"; README L39 sells the
   skull-base foramen as the v13 payoff; `SceneLayers.tsx:711-713` even claims "the InfoPanel" reads them —
   exhaustive grep shows no component reads either field. The content is delivered, validated, and invisible.

### The thirteen major findings, one line each

| id | subject | evidence core |
| --- | --- | --- |
| ux-002 | four All-module buttons fail WCAG 2.5.3 | `"All areas on — show every area".includes("All on")` = false; pinned by `verify:area-toggles` |
| ux-003 | `--text-muted #64748b` = **3.73:1** used as body text in ~10 selectors | fails 1.4.3 (needs 4.5:1) on all three surfaces |
| ux-004 | vessel palette 2.14–2.82:1 on both surfaces it encodes | fails 1.4.11 (needs 3:1); `#dc2626` passes at 3.68:1 |
| ux-005 | `.btn` border **1.55:1**, fill **1.08:1** vs the panel | the 1 px border is the only edge → 1.4.11 |
| ux-006 | dimmed tree rows **3.31:1 / 3.84:1** while still enabled | 1.4.3; reachable in one click via "All off" |
| ux-007 | PiP header controls named "X"/"Y"/"Z"/"▴"/"×" | content beats `title` in the name computation; no `aria-label` in the file |
| ux-011 | tree selection/syndrome state is colour-only and has no ARIA state | sibling `aria-expanded` in the same file proves the omission is accidental |
| ux-023 | 9 of 12 nerve "Context note" texts describe the ellipsoid v14 retired | `SceneLayers.tsx:736` returns null for all 12 course-bearing nerves |
| ux-024 | the v14 "authored path, not a segmented scan" honesty text has no in-app surface | `anchorNote` occurs only in the two TS course tables + JSON; zero component consumers |
| ux-025 | the live section's one-click crosshair+select gesture is undiscoverable | no hint/title anywhere; the 3D hint is hidden ≤860 px |
| ux-031 | ≤1024 px the header rows start **56 px** right of the 3D view's left border | `var(--sidebar-w)` = 320 px (header) vs literal `264px` (shell); one grep, three hits |
| ux-032 | ≤640 px the header still reserves a **320 px** first column | cannot fit a 320 px viewport → 1.4.10 Reflow; arithmetic, not text metrics |
| ux-033 | the documented header alignment mechanism (`flexBasis: 100%`, `marginLeft: auto`) does not exist in the code | three comment blocks assert it; `grep flexBasis` → one hit, in `PlatesTab.tsx` |

---

## 3. Accessibility (question 1)

**Accessible names — inventory of the surfaces the brief names.** Every control listed in the task brief has an
accessible name today; none is nameless. Measured: `verify:area-toggles` group 7 prints
`toggle controls without an accessible name = []` over the 13 header toggles (5 areas + 7 systems + 1
region-backed) and `toggle accessible names are distinct across the rows`; `a11y-contract.mjs` proves the plate
regions/labels are named from the injected SVG `<title>` (360 regions, 15 plates) and that the combobox and the
modal are named; source reading shows the resize handles (`pipResizerLabel`), the modality toolbar
(`SECTION_UNDERLAY_KIND_DESCRIPTIONS`, all five names containing their visible label), the level ruler (content
name = short level + signed y), the search input (`aria-label`) and the plate chips (content = title +
orientation + level) are all named. What fails is the *quality* of four names (ux-002, ux-007), not their
presence — plus two controls that are named but invisible to AT (ux-001). `aria-pressed` is present and correct
on every toggle-shaped control measured (header rows, the four All buttons, the quality pair, plate chips,
Plates mode/axis/modality, the PiP axis + size pair, the cortical-divisions toggle, the sidebar Browse toggle);
the only pressed-state defect is the All-off pair's missing *visible* state (ux-028).

**Verified good (with evidence):** the plate keyboard model (360 named regions, roving tabindex, Arrow/Home/End,
Enter/Space), the references modal (focus capture per open, Tab trap, Escape, restore-to-opener, `aria-modal`),
the sidebar/bottom-sheet `inert` contract (and the negative assertion that `App.tsx` contains no `aria-hidden`
at all), the search combobox (`aria-activedescendant` + stable `searchbox-option-<id>` ids), the PiP's four
resize handles (per-corner names carrying the live size, 24×24 px, keyboard resize, focus rings), the 24 px hit
targets, the favicon, and the selection stroke contrast (`#f59e0b` = 8.27:1 on the panel, 8.49:1 on the canvas;
hover `#0ea5e9` = 6.58:1).

**Measured contrast table** (WCAG 2.1 formula, computed from `tokens.css`; the surfaces are the ones the CSS
actually paints — `--bg-panel #101827`, `--bg-elevated #16202f`, the section canvas' `BACKGROUND #0d1526`):

| colour | vs `--bg-panel` | vs `--bg-elevated` | vs canvas `#0d1526` | verdict |
| --- | --- | --- | --- | --- |
| `--text-primary #e5e7eb` | 14.35:1 | 13.23:1 | — | pass |
| `--text-secondary #94a3b8` | 6.93:1 | 6.39:1 | 7.11:1 | pass |
| `--text-muted #64748b` | **3.73:1** | **3.44:1** | — | **fail 1.4.3** (ux-003) |
| `--selection #f59e0b` | 8.27:1 | 7.63:1 | 8.49:1 | pass |
| `--accent #38bdf8` | 8.29:1 | 7.65:1 | — | pass |
| `--border-strong #2c3a52` (button edge) | **1.55:1** | 1.43:1 | — | **fail 1.4.11** (ux-005) |
| `#16202f` fill vs panel | **1.08:1** | — | — | context for ux-005 |
| `--kind-vessel #b91c1c` | **2.75:1** | **2.53:1** | **2.82:1** | **fail 1.4.11** (ux-004) |
| vessel deep `#991b1b` | **2.14:1** | **1.97:1** | **2.19:1** | **fail 1.4.11** (ux-004) |
| vessel distal `#dc2626` | 3.68:1 | 3.39:1 | 3.77:1 | pass |
| tree dim 0.40 × `#e5e7eb` | **3.31:1** | — | — | **fail 1.4.3** (ux-006) |
| tree dim 0.45 × `#e5e7eb` | **3.84:1** | — | — | **fail 1.4.3** (ux-006) |
| header row label 0.65 × `#e5e7eb` | 6.67:1 | — | — | pass |

Note the pattern: the *chrome* tokens are healthy and the **two muted-state tokens** (`--text-muted`, the dim
opacities) plus the **pressed/edge tokens** are what fail — i.e. the failures cluster exactly where a user has
to read something the app is describing as secondary or as a state.

**Keyboard reach:** every control the brief lists is keyboard reachable and has a native path except (a) the
live-section canvas hit-test — filed `suspect` because the equivalent selection IS reachable through the tree
and the search box, so SC 2.1.1 is met by an alternative (ux-008) — and (b) the PiP's controls at ≤900 px,
which are `display:none` until the labelled tab is expanded (documented, not filed).

---

## 4. Discoverability (question 2)

| asked surface | reachable? | how a new user finds it |
| --- | --- | --- |
| Areas / Systems rows | **yes** | first two control rows; a visible "Areas"/"Systems" `.header-row-label` precedes each; each button has a `title` |
| the two All on / All off modules | **partly** | visible, but with no axis word (ux-027) and their identifying mechanism (row position) is not implemented (ux-033); `role="group"` + `aria-label` are present |
| the live section | **yes** | Plates tab → "Live section" mode button, plus the 3D tab's PiP with a restore pill; the PiP's own `title` literals are explicit |
| the cortical-division toggle | **partly** | present top-left of the live section with `aria-pressed` and a `title` that carries the method caveat — but it disappears from the accessibility tree inside the `role="img"` wrapper (ux-001) |
| the images-off state ("Simulated only") | **yes** | five visible surfaces state it (`IMAGERY_OFF_STATEMENT` + the toolbar, panel, canvas hint and coverage notes) — one of the best honest-limit implementations in the app |
| the PiP resize | **yes** | four corner glyphs with per-corner titles naming the keyboard step; plus the ▴/▾ size cycle |
| the honest limits of the *course geometry* | **no** | exists only in `anchorNote`, rendered nowhere (ux-024) |
| the cranial-nerve `course` / `modality` content | **no** | authored in all 12 records, no renderer (ux-022) |
| what "au" means | **no** | shown in 5 surfaces, defined only in comments/JSON (ux-038, `suspect`) |
| the live section is clickable | **no** | cursor-only affordance (ux-025) |

The boot help (`InfoPanel` empty state) is the app's only onboarding text and it is **three feature waves stale**
(ux-026): it names Search / tree / ruler / plates / syndromes, says "click any nucleus or tract" (2 of 7 kinds)
and never mentions the Areas/Systems rows, the All modules, the division layer or the modality toolbar.

---

## 5. Feedback, layout and naming (questions 3–5)

**Feedback.** One store write per click path drives label + border + panel + tree highlight — verified present
(ux-030). Layer toggles are consistent across the three surfaces that carry them (ux-029). The one asymmetry: the
two **All-off** buttons carry `aria-pressed` but never the `is-active` class their All-on siblings get, so the
control that empties the view is the one with no pressed state (ux-028).

**Layout.** Three of the five layout findings are the header grid, and they are one story: a single declaration
(`--sidebar-w: 320px`, layout.css:35) is consumed by the header (:69) but **not** by the breakpoint that changes
the sidebar width (:312, a literal `264px`), and not reset at all at phone widths — so the property the v12f/v12g
comments say makes "the two cannot drift" is exactly the property that drifts, by 56 px at tablet widths and by
overflow at 320 px. The stated mechanism for putting each All module on its own group's line
(`flexBasis: 100%`, `marginLeft: auto`) is absent from the code (ux-033). The PiP chrome inventory and the Plates
toolbar were checked item by item and are complete and correctly wired (ux-034, ux-035).

**Naming.** The Systems row's three near-synonyms are **correct for three different objects** ("Vasculature" =
region-backed system, "Vessels" = the vessel kind, "Cranial nerves" = the nerve kind) and the region-backed
button is derived as the complement of `AREAS` — filed `ok` (ux-039). What is not consistent: the Legend renames
the same seven kinds into raw slugs (`vessel`, `nerve`, lowercase) while the header uses display plurals
(ux-036), the product name/subtitle disagrees with every data table about "Mesencephalon (midbrain)" vs
"midbrain" vs "Mesencephalon" (ux-037), and the info panel landmark is unnamed (ux-040).

---

## 6. Gate coupling and environment notes (for the integrator and final reviewer)

1. **Pinned-assertion coupling (plan D7).** Two of my findings can flip a pinned assertion:
   * fixing **ux-002** (the four All-module accessible names) **must** flip
     `scripts/verify/area-toggles.mjs:1385-1399` and the README L1254 row — the gate is *designed* to fail then
     ("the pin fails once it is fixed");
   * fixing **ux-027** by renaming the visible button text touches the browser lane's exact-text addresses
     (README L1154 documents that two header controls read exactly `Nuclei` and two read `All`).
   Neither is a reason not to fix; both need a **gate-flip handoff** row in `CORRECTIONS.md` naming gate +
   assertion, for `final-review` to re-pin.
2. **`npm run verify:area-toggles` is GREEN — but it is flaky on Windows on its first run in a cold sandbox.**
   Run 1 printed the whole a11y group (quoted in ux-002) and then exited 1 with
   `EPERM, Permission denied: … \.plate-scratch\v13-area-wiring` from `area-toggles.mjs:1435` (`rmSync` of the
   wiring fixture's directory) — no check reported `FAIL`, and no assertion had failed when the process died.
   Run 2 of the same command **exited 0**, printing `472 assertions passed · 0 failed` (14 groups) — note that
   README L1062/L1403 quote this gate at "331 assertions" and L1268 at "437", so the live number is also a
   doc-drift seed for the code-quality auditor. The cause is a Windows directory-lock race between the wiring
   child process and the `rmSync` that follows it, not a product or assertion problem; `rmSync` on a fresh
   directory in the same tree succeeds in this sandbox in isolation. Worth one line in the run's sweep notes
   because a cold first run can look red for a reason that is not the product — the fix (if it is ever wanted)
   is a retry/`maxRetries` on that `rmSync`, and only `final-review` may edit `scripts/verify/*`.
3. **Contrast methodology.** Ratios are computed, not photographed: `#RRGGBB` → sRGB linearisation with the
   0.04045 knee → WCAG relative luminance → `(L1+0.05)/(L2+0.05)`. Opacity composites are done by alpha-blending
   the text colour onto the token background first (no gamma-space blending, which is what browsers do not do
   either). The four `suggestedFix` values I proposed were re-measured before being written down (e.g. the
   border candidate is `#556a8c` = 3.24:1, **not** the `#4b5f80` I first estimated at 2.75:1; the dim is
   opacity **0.55** = 5.12:1, not the 0.68 I first estimated at 7.19:1).
4. **One `unverifiable-here`.** ux-017 (does the `● live` `::after` marker enter the accessible name?) depends on
   runtime name computation. I did not guess: it is recorded as `unverifiable-here` with the two possible
   outcomes and the measurement that would settle it.

## 7. What this audit cannot establish

* **No rendered pixels.** Every visual consequence (the 56 px header offset, the phone-width overflow, the
  missing pressed state, the invisible-but-reachable controls) is derived from source, CSS arithmetic and the
  spec. A browser lane should confirm at least: the header's first column at 834 px and 390 px, the AX tree of
  the live-section wrapper (ux-001), and the computed accessible names of the PiP header buttons (ux-007).
* **No assistive technology was driven.** Findings about what a screen reader *announces* follow from the
  naming/role specifications and from exhaustive source reading, not from an AT session.
* **No user testing.** The discoverability findings (ux-025, ux-026, ux-027, ux-038) are legibility judgments
  with file-level evidence; they are labelled `judgment` in `basisKind` where the call is mine.
* **No content re-derivation.** ux-022/ux-023/ux-024 are findings about *reachability*; whether the nerve
  courses and context notes are anatomically right is the domain auditors' work, not mine.
