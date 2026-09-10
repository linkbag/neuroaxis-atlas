# PLAN — run `mtvyh3sc-kcu5` · NeuroAxis v5 (PiP restore control + live-section plane sliders)

**Role:** refinement of the dispatched plan by the `architect-review` task. This file is the plan-of-record for the run; it does **not** replace `docs/UX_FIXES_PLAN.md` (authoritative spec) — where they differ, the spec wins and the difference is listed in §6.

**Repo:** `D:\Startup projects\3DNeuroanatamoy` · branch `master` · HEAD `6276ce0` (clean tree; only untracked path: `docs/UX_FIXES_PLAN.md`).

---

## 1. Repository verification (every proposal assumption checked)

Baseline gates were run on the **pristine tree before any task edits**, so any later failure is attributable to the change:

| Gate | Command | Result |
| --- | --- | --- |
| Data validator | `npm run validate` | **PASS** (0 errors/0 warnings; 118 structures · 19 tracts · 24 syndromes · 12 plates · 13 levels) |
| Types | `npx tsc --noEmit` (= `npm run check`) | **PASS** |
| Bundle | `npm run build` | **PASS** — `✓ built in 4.18s` |
| v4 imaging QA | `node scripts/verify-imaging-v4.mjs` | **PASS** (anchors reachable, orientation matches §2.2, credits verbatim, payload 7.30 MiB / 8.00 cap) |
| v4b cryosection QA | `node scripts/verify-imaging-v4b.mjs` | **PASS** (22 cryosections, >1.5 au anchor spacing) |
| Port 5173 | `Get-NetTCPConnection -LocalPort 5173` | 0 listeners — dev server stopped, as stated |

| Assumption in the proposal | Verdict | Evidence |
| --- | --- | --- |
| Canonical ranges = x [−48,48], z [−56,26], y [−55,45], step 0.5 | **Confirmed** | `src/components/viewer3d/clipPlanes.ts:21-25` `CLIP_BOUNDS` exactly those numbers; `ClipControls.tsx:106-108 / 124-126 / 147-150` use `CLIP_BOUNDS` + `step={0.5}` (y: `step={snapToPlate ? 1 : 0.5}`) |
| `SectionPiPPanel` returns `null` when `visible === false`; × is the only visibility control | **Confirmed** | `SectionPiP.tsx:1237`, `:1273-1280` |
| `Viewer3D` owns the persisted `sectionPipVisible` flag | **Confirmed** | `Viewer3D.tsx:90-104` (`neuroaxis.sectionPip` = `'visible' \| 'hidden'`), `:254-268` (`useState(initialSectionPipVisible)` + persistence effect), `:321-325` (panel mount) |
| `snapToPlate` store flag exists | **Confirmed — defaults to `true`** | `store.ts:373` `snapToPlate: true`, `store.ts:409` `setSnapToPlate`; consumed by `ClipControls.tsx:41` (read) and `ClipControls.tsx:181-188` (checkbox); snapping is **transverse-only** (`onTransverseInput`, `ClipControls.tsx:60-69`) |
| `.slider-row` / `.is-active-axis` / `.toggle-row` are reusable CSS classes | **Partly — see D3** | Defined in `src/styles/viewer.css:78-133` (globally imported by `main.tsx:9`), so available in the Plates tab. **But** the range-input layout rule is scoped `.viewer-panel input[type='range']` (`viewer.css:115-120`) — a bare `.slider-row` outside a `.viewer-panel` does **not** get `grid-column:1/-1; width:100%` |
| `PlatesTab` has a live-section mode + toolbar to mount into | **Confirmed** | `PlatesTab.tsx:517-710` live branch; `.section-toolbar` is `display:flex; flex-wrap:wrap` (`plates.css:318-327`) and full-row children use `flex-basis:100%` (`plates.css:386-391`) |
| `SectionCanvas` subscribes to the store and redraws; click-to-set writes `clip{x,y,z}` + `sectionAxis` | **Confirmed** | `SectionCanvas.tsx:1256` `useAtlasStore.subscribe(() => scheduleDraw())`, `:705-710` reactive re-pump on `clip.x/y/z + sectionAxis`, `:1223-1242` click writes the **other two** axes + pins `sectionAxis`; crosshair drawn from the other two at `:871-872`, `:1021` |
| Restore pill containing block | **Confirmed** | `.viewer3d-root { position: relative; overflow: hidden }` (`viewer.css:10-19`); `.pip-panel { position:absolute; right/bottom: var(--space-3); z-index: 6 }` (`sectionPip.css:11-23`). ClipControls lives in `.viewer-overlay` (top-right, `viewer.css:34-48`) — bottom-right never collides |
| Names are free | **Confirmed** | No occurrence of `pip-restore`, `SectionSliderBar`, `slider-strip` anywhere in `src/` or `README.md` |

---

## 2. Final task DAG

One run, four tasks. The two builders are **fully parallel**: their write sets are disjoint and neither reads a file the other writes. `integration-v5` is the only join point and the only task allowed to start the dev server.

```
architect-review ──► pip-restore ─────┐
                 └─► section-sliders ─┴─► integration-v5 ──► (orchestrator browser probe)
```

| id | role | blockedBy | writes (exclusive) |
| --- | --- | --- | --- |
| `architect-review` | architect | — | `PLAN-run-mtvyh3sc-kcu5.md` |
| `pip-restore` | builder | `architect-review` | `src/components/viewer3d/SectionPiP.tsx`, `src/components/viewer3d/Viewer3D.tsx`, `src/styles/sectionPip.css` |
| `section-sliders` | builder | `architect-review` | `src/components/section/SectionSliderBar.tsx` (new), `src/components/PlatesTab.tsx`, `src/styles/plates.css` |
| `integration-v5` | integrator | `pip-restore`, `section-sliders` | the six files above + `README.md` (+ git staging, see §5) |

`blockedBy: architect-review` for the two builders is real but **soft**: it exists so the refined deltas below are read before code is written. If the builders were already dispatched in parallel with this review (the dispatch note says other tasks run in parallel), all required deltas are re-checked and enforced by `integration-v5`, which owns every file — see §7, "message to forward".

**Do not touch (any task):** `src/components/section/contourWorker.ts`, `contours.ts`, `sectionAssets.ts`, `imageLayers.ts`, the registry/draw internals of `SectionCanvas.tsx`, `src/components/viewer3d/clipPlanes.ts`, `src/state/store.ts`, `src/components/viewer3d/ClipControls.tsx`, any `src/data/**` or `src/assets/**` JSON, `index.html`, `vite.config.ts`, `tsconfig.json`.

---

## 3. Task briefs

### 3.1 `pip-restore` — restore control for the hidden PiP (Feature 1)

**Deliverable.** A discoverable restore control that is present exactly when the live-section PiP is hidden.

1. **Export `SectionPiPRestoreButton` from `src/components/viewer3d/SectionPiP.tsx`**, prop `{ onShow: () => void }` (a plain show callback — not a bidirectional `onVisibleChange`, so the component cannot accidentally hide anything). Real `<button type="button">`:
   - text exactly **`Live section ▸`**, `title="Show the live synced 2D section"`;
   - `aria-expanded={false}` (the region it discloses — the PiP panel — is collapsed). **Do not** also set `aria-pressed` (a show affordance is not a toggle; two contradictory ARIA states is an a11y defect — see D9);
   - class `pip-restore`.
2. **Style in `src/styles/sectionPip.css`** under class `.pip-restore`: `position:absolute; right:var(--space-3); bottom:var(--space-3); z-index:7;` (z-index **7** > the panel's 6 > the explode dock's `auto`, so it can never be obscured — matters for automated clicks), accent-tinted border (`color-mix(in srgb, var(--accent) 45%, var(--border-strong))`), `background: color-mix(in srgb, var(--bg-panel) 90%, transparent)`, `color: var(--text-primary)`, `font-family: var(--font-mono); font-size: .68rem`, `padding: 4px 9px`, `border-radius: 999px`, `cursor:pointer`, `box-shadow: 0 6px 18px rgb(0 0 0 / 35%)`; `:hover`/`:focus-visible` → `border-color/color: var(--accent)`; add the `≤860px` padding trim next to the existing media query. Tokens only — no literal colours beyond `color-mix` over tokens.
3. **Mount in `src/components/viewer3d/Viewer3D.tsx`** as a **direct child of `.viewer3d-root`**, immediately after `<SectionPiPPanel … />` (`Viewer3D.tsx:321-325`) — the same containing block the panel uses:
   ```tsx
   {sectionPipVisible ? null : (
     <SectionPiPRestoreButton onShow={() => setSectionPipVisible(true)} />
   )}
   ```
   Add it to the named re-export block at `Viewer3D.tsx:336-347`. **Do not** mount it inside `.viewer-overlay` (that is ClipControls' top-right flex dock).
4. **No gating on history.** It renders whenever `sectionPipVisible === false` — including a first visit with a persisted `'hidden'` value. There must be **no** "has been shown/hidden before" state (that would fail acceptance #2 and contradict "reachable before the PiP has ever been shown").
5. **Untouched:** the persistence effect and `SECTION_PIP_STORAGE_KEY`, the panel's × (`onVisibleChange(false)`), the axis-override `X/Y/Z` buttons, the small/large toggle, the renderer (`SectionPiP`) and every pass/backdrop line inside it, the `?pipdebug` overlay, `SectionPipHint`. The button adds no layout: it is absolutely positioned in a `position:relative` container, so the R3F canvas rect cannot shift.

**Verification (task-level).**
- `npm run check` exit 0 (note `noUnusedLocals`/`noUnusedParameters` are on — no dead imports).
- `npm run build` exit 0.
- `node scripts/verify-imaging-v4.mjs` exit 0 — **this gate parses `SectionPiP.tsx`**: it takes `sectionPip.slice(indexOf('const SECTION_VIEWS'))` and matches `/^\s{2}([xyz]):\s*\{[\s\S]*?labels:\s*\{\s*top:\s*'(\w)'…/gm`. **Do not** add any object literal indented by exactly two spaces and keyed `x: {` / `y: {` / `z: {` that also contains a `labels: { top/bottom/left/right }` block after `SECTION_VIEWS` — it would overwrite the parsed badge table and fail the orientation assertion (see R3).
- Manual read-back: button exists iff `sectionPipVisible === false`; `onShow` calls the same setter the panel's × calls.

**Evidence contract.** files: `src/components/viewer3d/SectionPiP.tsx`, `src/components/viewer3d/Viewer3D.tsx`, `src/styles/sectionPip.css`; commands: `npm run check`, `npm run build`, `node scripts/verify-imaging-v4.mjs`.

### 3.2 `section-sliders` — plane sliders in the Plates-tab live section (Feature 2)

**Deliverable.** New `src/components/section/SectionSliderBar.tsx` (default **and** named export `SectionSliderBar`; also export `formatSliderValue` for QA), a compact accessible strip with one slider per axis, mounted in the live-section toolbar.

1. **Read the store itself** (`useAtlasStore`) — no props needed: `clip`, `setClip`, `sectionAxis`, `setSectionAxis`, `snapToPlate`, `setSnapToPlate`.
2. **Ranges/steps from the single source:** import `CLIP_BOUNDS` from `../viewer3d/clipPlanes` (relative to `src/components/section/`) and use `min={CLIP_BOUNDS.x.min}` etc. — never retype the numbers. `step = 0.5` for all three, **except** the transverse (y) slider: `step={snapToPlate ? 1 : 0.5}`, mirroring `ClipControls.tsx:150`.
3. **Rows** (order and visible label text identical to `ClipControls`, so one selector vocabulary works across both docks):
   | row | label text | `id` | `aria-label` on the input | writes |
   | --- | --- | --- | --- | --- |
   | 1 | `Sagittal · x` | `section-slider-sagittal` | `Sagittal · x plane position (atlas units)` | `setClip({ x })` |
   | 2 | `Coronal · z` | `section-slider-coronal` | `Coronal · z plane position (atlas units)` | `setClip({ z })` |
   | 3 | `Transverse · y` | `section-slider-transverse` | `Transverse · y plane position (atlas units)` | `setClip({ y })` via snapping path |

   The `aria-label` deliberately begins with the same text as the visible `<label>` (D6): `aria-label` wins over `<label htmlFor>` for the accessible name, and every probe/AT lookup by `Transverse` / `Transverse · y` / `plane position` then resolves. **Ids must not collide** with ClipControls' `clip-sagittal|clip-coronal|clip-transverse`.
4. **Value readout:** `<output htmlFor={id}>` per row showing `formatSliderValue(v)` = `${v > 0 ? '+' : ''}${v.toFixed(1).replace('-', '−')} au` → e.g. `−42.0 au`, `+12.0 au` (typographic minus U+2212, one decimal, unit — the spec's literal `−42.0 au` style; see D2).
5. **Store writes only, no new sync.** Every `onChange` writes `clip` through the existing `setClip` (so `SectionCanvas`'s `subscribe → scheduleDraw` redraws and `ClipSync` moves the shared planes when the 3D tab is mounted). No new subscription, timer, or ref is added anywhere.
6. **Axis follows the touched slider** — mirror `ClipControls.touchAxis` (D5): `onPointerDown` **and** `onFocus` on each input call `setSectionAxis(axis)` when it differs. Rationale: this is the app's documented v3 rule ("the live-section surfaces follow the last-touched plane", `ClipControls.tsx:10-14`, `:49-52`) and it makes "dragging the Transverse slider moves the section" true for mouse **and** keyboard interaction regardless of the previously selected axis. The active row is then always the row that emphasises itself next:
   `className={`slider-row section-slider${sectionAxis === axis ? ' is-active-axis' : ''}`}` — reusing `viewer.css`'s existing accent + `● live` marker (`viewer.css:94-104`), no new emphasis CSS.
7. **Snap-to-levels checkbox:** `<label className="toggle-row">` + real `<input type="checkbox" checked={snapToPlate} onChange={e => setSnapToPlate(e.target.checked)}>` with the literal label text **`Snap to levels`** (the spec's string; ClipControls' variant reads "Snap slider to levels") and `title="While on, the transverse slider jumps between the plate levels (the same setting as the 3D clipping dock)"`. One flag, one snapping path — **no second snapping implementation, no local mirror state**.
8. **Snapping semantics must equal `ClipControls.onTransverseInput` exactly:** on transverse input, `raw = Number(event.target.value)`; if `snapToPlate`, write `nearestLevelTo(raw).y` (same `levels` array from `../../data/load`, same "nearest to the *dragged* raw value, not to the current `clip.y`" rule), else write `raw`. **x and z never snap** (matching the dock).
9. **CSS in `src/styles/plates.css`** — append a v5 block:
   ```css
   .section-plane-sliders { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 4px 18px; align-items: flex-start; }
   .section-plane-sliders > .section-slider { flex: 1 1 190px; min-width: 160px; margin-bottom: 0; }
   /* viewer.css scopes the range layout to .viewer-panel — re-scope it here (D3) */
   .section-plane-sliders input[type='range'] { grid-column: 1 / -1; width: 100%; height: 18px; accent-color: var(--accent); }
   .section-plane-sliders output { font-family: var(--font-mono); font-size: .72rem; color: var(--text-secondary); min-width: 4.6em; text-align: right; }
   ```
   Reused, not reinvented: `.slider-row` grid, `.is-active-axis` emphasis, `.toggle-row`, tokens. Without the range re-scope the input lands as a narrow third grid item in column 1 — a real layout defect, not a cosmetic one.
10. **Mount in `PlatesTab.tsx`, live branch only:** insert `<SectionSliderBar />` as the **second child of `.section-toolbar`** (right after the `Section axis` group, before the `Imagery` group) at `PlatesTab.tsx:536`. It spans a full toolbar row (`flex-basis:100%`), stays visually one unit with the axis/modality controls, and wraps gracefully. The author-plate branch (`mode === 'author'`, `:422-470` and `:473-516`) must render **byte-identically** to today. Import it next to `SectionCanvas` (`:78`). While in the file, correct the now-stale comment at `:662-665` ("this file's write scope excludes src/styles") because `plates.css` is in this task's scope.
11. **Consistency with click-to-set (verified, not assumed):** canvas clicks write the *other two* axes and pin `sectionAxis`; the strip reads/writes the same `clip.x|y|z` and the same `sectionAxis`, so both directions stay consistent with no glue code. Crosshair behaviour is unchanged: it is drawn from the two non-active axes (`SectionCanvas.tsx:871-872`).

**Verification (task-level).**
- `npm run check` exit 0, `npm run build` exit 0.
- Static read-back: min/max come from `CLIP_BOUNDS`; y step = `snapToPlate ? 1 : 0.5`; x/z never snap; `aria-label` present on all three inputs; `htmlFor`/`id` wired; no second snapping path; `SectionSliderBar` mounted only in the `mode === 'live'` branch.
- Sanity-check by hand that with `snapToPlate` ON (the default) a y drag jumps between level anchors, and that x/z drags move smoothly at 0.5 au — this is the dock's behaviour, and it means "continuous" motion on the transverse axis requires the checkbox OFF (R1).

**Evidence contract.** files: `src/components/section/SectionSliderBar.tsx`, `src/components/PlatesTab.tsx`, `src/styles/plates.css`; commands: `npm run check`, `npm run build`.

### 3.3 `integration-v5` — assembly, gates, smoke, commit

1. **Re-verify both features in code** against the spec's acceptance list and §3.1/§3.2 above; fix any gap (this task owns all six files). Explicit checklist: restore pill present iff `sectionPipVisible === false` **and** wired to the same setter as ×; no history gating; ×/size-toggle/axis-override/persistence untouched; strip mounted in live mode only with `CLIP_BOUNDS` ranges, y step + snapping reuse, active-axis emphasis, `aria-label`s, wrapping CSS present; author mode untouched.
2. **Data flow to state in the final report** (§4) — including the 3D-plane nuance: the shared plane constants are re-applied by `ClipSync` **on Viewer3D mount**, so the plane "follows" observably when the 3D tab is (re)opened, not simultaneously from the Plates tab.
3. **Gates, run alone (no other task writing):** `npm run validate`, `npm run check`, `npm run build`, plus the two QA scripts the proposal missed — `node scripts/verify-imaging-v4.mjs`, `node scripts/verify-imaging-v4b.mjs`. All must exit 0.
4. **Dev smoke:** start `npm run dev` **backgrounded**, poll `http://localhost:5173` → HTTP 200 + `<div id="root">` + the `/src/main.tsx` module script; then **stop it and confirm the port is free** (`Get-NetTCPConnection -LocalPort 5173` → 0 listeners) so the orchestrator's headless probe can bind it. Do not leave a background job alive.
5. **Regression pass** over the code paths touching these files: 3D selection, clip + snap, plane helper, explode, quality toggle (PiP rig re-create), PiP renderer + slider-plane fix + `?pipdebug`, live-section canvas in every modality, author-plate mode, level chips/ruler, Learn-more/reference links, tab switching both ways.
6. **README (additive only):** mention the restore pill in the existing "GPU live-section PiP" bullet and the plane sliders in the "2D live-section canvas" bullet; add the strip to the `components/section/` layout note. **Do not reword or delete any credit/attribution sentence** — `scripts/verify-imaging-v4.mjs` asserts the verbatim credit strings in `README.md` at 7 assertion sites (`:391`, `:398`, `:405`, `:412`, `:420`, `:457`, `:478`).
7. **Commit with an explicit path list — not `git add -A`** (D11):
   ```
   git add src/components/viewer3d/SectionPiP.tsx src/components/viewer3d/Viewer3D.tsx \
           src/components/section/SectionSliderBar.tsx src/components/PlatesTab.tsx \
           src/styles/sectionPip.css src/styles/plates.css README.md docs/UX_FIXES_PLAN.md
   git commit -m 'feat: restore control for the hidden live-section PiP + plane sliders in the Plates-tab live section'
   ```
   `docs/UX_FIXES_PLAN.md` is currently **untracked** and is the run's authoritative spec; committing it matches the tracked `docs/*_PLAN.md` convention. `PLAN-run-mtvyh3sc-kcu5.md` (and any other `PLAN-run-*.md`) is **run scaffolding and must never be committed** — note that only root `PLAN.md` is gitignored.
8. **Final message:** files changed, gate results (with the two QA scripts), smoke result + port freed, the data-flow verification, and the commit hash.

**Evidence contract.** files: `src/components/viewer3d/SectionPiP.tsx`, `src/components/viewer3d/Viewer3D.tsx`, `src/components/section/SectionSliderBar.tsx`, `src/components/PlatesTab.tsx`, `src/styles/sectionPip.css`, `src/styles/plates.css`, `README.md`; commands: `npm run validate`, `npm run check`, `npm run build`, `node scripts/verify-imaging-v4.mjs`, `node scripts/verify-imaging-v4b.mjs`.

---

## 4. Data flow (single source of truth — no new sync mechanism)

```
                      useAtlasStore  (clip{x,y,z}, clip.enabled, sectionAxis, snapToPlate)
                        │            ▲                    ▲                    ▲
   write paths ─────────┘            │                    │                    │
   • ClipControls sliders (3D tab) ──┘                    │                    │
   • SectionCanvas click-to-set (other two axes + axis pin)                    │
   • NEW SectionSliderBar (Plates tab, live mode) ──────────────────────────-─┘
                        │
        ┌───────────────┼───────────────────────────────┬─────────────────────────┐
        ▼               ▼                               ▼                         ▼
  ClipSync (mount +  SectionCanvas             SectionPiPPanel readout      SectionPip renderer
  clip-change ⇒      subscribe ⇒ scheduleDraw  + SectionPiP per-frame       (OWN planes from
  applyClipState)    (worker contours,         store read                    store.clip)
                     crosshair from other 2)
```

Facts that were checked, not assumed:
- `applyClipState` has **exactly one** caller: `ClipSync` inside `<Canvas>` (`Viewer3D.tsx:76-84`; `grep applyClipState` → only `Viewer3D.tsx` + comments). Tabs are rendered exclusively (`App.tsx`: `activeTab === '3d' && <Viewer3D />`), so **while the Plates tab is open the shared `THREE.Plane` constants are not touched**; `ClipSync` re-applies the current `store.clip` in its mount effect when the 3D tab is opened again. Net user-visible behaviour: the plane follows — with one tab switch, which is inherent to the existing architecture and must **not** be "fixed" by adding a sync path.
- `SectionCanvas` redraws on *any* store change (`:1256`) and re-pumps the worker on `clip.x/y/z` + `sectionAxis` (`:705-710`), so slider drags repaint without new plumbing.
- The PiP renderer reads `store.clip`/`sectionAxis` per frame (`SectionPiP.tsx:721-731`) and never depends on `clip.enabled`; the new strip therefore cannot break the PiP's always-render contract.

---

## 5. Staging / commit hygiene

- Clean baseline: `git status --porcelain` = `?? docs/UX_FIXES_PLAN.md` only.
- Explicit path list (see §3.3.7). `git add -A` would sweep untracked run artefacts (`PLAN-run-*.md`, other runs' plan files) into the repo — root `PLAN.md` is gitignored "so `git add -A` never commits it", but the `PLAN-run-*` name is **not** covered.
- `dist/` is gitignored, so `npm run build` leaves no dirty path.

---

## 6. Explicit deviations from the dispatched proposal

| # | Proposal said | Refined decision | Why |
| --- | --- | --- | --- |
| **D1** | "reuse the same store field/action **if one exists** — read ClipControls first" | **It exists**: `snapToPlate` + `setSnapToPlate` (`store.ts:373/409`), default **`true`**. Mandatory: bind the checkbox to it, and mirror the y-only snapping + `step={snapToPlate?1:0.5}` exactly | Removes the conditional; guarantees one snapping path and identical semantics. Also fixes the probe expectation: x/z move continuously, y is quantised to level anchors while the box is on |
| **D2** | "formatted like ClipControls (one decimal, typographic minus)" | ClipControls' `formatValue` is **ASCII minus, '+' for positives, and 0 decimals for integers** (`ClipControls.tsx:35-37`); the spec's `−42.0 au` example matches `SectionPiP.formatPlaneValue` (`:1117-1120`: `toFixed(1)` + U+2212). Output = one decimal + typographic minus + ` au`, '+' for positives. `formatValue` stays module-private (exporting it would require editing `ClipControls.tsx`, which no task owns) | Follows the spec's literal example while keeping numeric identity with the dock; documented so the difference is a decision, not drift |
| **D3** | "reuse its … CSS classes rather than inventing new ones" | Reuse **is** possible for `.slider-row`, `.is-active-axis`, `.toggle-row` (viewer.css, globally imported) **but not sufficient**: the range layout rule is scoped to `.viewer-panel input[type='range']`. `plates.css` must re-scope it for `.section-plane-sliders` | Without it the range input is a narrow, mis-aligned grid item — a visible defect a probe would catch as "slider not draggable/visible" |
| **D4** | "place it adjacent to the existing axis/modality toolbar" | Mount **inside** `.section-toolbar` as its second child with `flex-basis:100%` (the container already wraps and already uses full-row children for notes) | Reads as one unit, wraps for free, zero restructuring of the live branch, author branch provably untouched |
| **D5** | silent on whether touching a slider changes `sectionAxis` | **Yes — mirror `ClipControls.touchAxis`** (`onPointerDown` + `onFocus` → `setSectionAxis`) | The app's documented rule is "live-section surfaces follow the last-touched plane"; it makes acceptance #3 ("dragging the Transverse slider moves the section") true for mouse *and* keyboard regardless of the previously chosen axis |
| **D6** | "`aria-label` per slider (e.g. 'Sagittal plane position (x, atlas units)')" | `aria-label` = `Sagittal · x plane position (atlas units)` — starts with the visible label text | `aria-label` overrides `<label>` for the accessible name; this form satisfies lookups by axis word, by `Transverse · y`, and by "plane position". Ids renamed `section-slider-*` to avoid colliding with `clip-*` |
| **D7** | "docked bottom-right … reuse the panel's positioning tokens/classes" | Explicit mount point: **direct child of `.viewer3d-root`**, immediately after `<SectionPiPPanel>`; `z-index: 7` | Same containing block as the panel (`.viewer3d-root` is `position:relative`); top-right `.viewer-overlay` is ClipControls' dock. z-index 7 keeps the pill above the panel (6) and the bottom-centre explode dock (`auto`) so automated clicks are never intercepted |
| **D8** | "make sure the button is discoverable on a FIRST visit" | No `hasEverBeenHidden/Shown` state at all: render iff `visible === false` | "First visit" here means "not gated on a prior hide interaction" (default state is *visible*, so the pill is naturally absent then) — a literal "first visit shows the pill" reading would contradict "must disappear while the panel is visible" |
| **D9** | "`aria-pressed="false"` / `aria-expanded="false"` as appropriate" | Ship **`aria-expanded={false}`** only | A show control is a disclosure, not a toggle; the spec allows either |
| **D10** | gates = `validate`/`check`/`build` | **Add** `node scripts/verify-imaging-v4.mjs` (reads and parses `SectionPiP.tsx`, asserts §2.2 orientation table + verbatim credits in code **and README**) and `node scripts/verify-imaging-v4b.mjs` | These are the repo's own QA gates for exactly the file being edited; both PASS on the pristine tree (verified) |
| **D10b** | — | The final README gate constraint is the 7 verbatim-credit assertions in `verify-imaging-v4.mjs` (`:391-478`), so README edits are **additive only** | Same gate — stated once here so §3.3.6 has a checked source |
| **D11** | "`git add -A && git commit`" | Explicit path list; commit `docs/UX_FIXES_PLAN.md`; never commit `PLAN-run-*.md` | `UX_FIXES_PLAN.md` is the only dirty path and is the run's spec (matches `docs/*_PLAN.md` convention); `git add -A` would sweep run scaffolding into the repo |
| **D12** | "(3) consistency with canvas click-to-set … describe the data flow" | Pre-verified and written down in §4, including the `ClipSync`-on-mount nuance for the 3D plane | Prevents the integrator from inventing a sync path or reporting a false failure |
| **D13** | both builders run `npm run check` + `npm run build` concurrently | Keep both, but note `vite build` empties `dist/`: if a build fails with a `dist`/ENOENT race, re-run once; the integrator's final build runs alone | Concurrent builds are the only cross-task resource contention in the DAG |
| **D14** | (implicit) trust the tree is green | Baseline recorded in §1 before any edit | Makes every later failure attributable |

---

## 7. Flagged risks and mitigations

| id | Risk | Severity | Mitigation / owner |
| --- | --- | --- | --- |
| **R1** | `snapToPlate` defaults to `true`, so the **transverse** slider quantises to level anchors. A probe that drags it only slightly (or hits ArrowRight once) may land on the same level → "no change" → acceptance #3 could look failed | **High for the probe** | Behaviour is exactly the dock's (spec-mandated), so it must not be changed in the strip. The checkbox is present, labelled `Snap to levels` and unchecked→continuous; x/z always move continuously at 0.5 au. Integrator must state this explicitly in the final report so the probe author knows a transverse drag must either uncheck the box or move past a level anchor. `owner: integration-v5` (report) |
| **R2** | A probe asserting "the 3D clip plane follows" **while on the Plates tab** cannot observe it (Viewer3D unmounted; `ClipSync` re-applies on mount) | Medium | Documented in §4; verification must switch to the 3D tab. `owner: integration-v5` |
| **R3** | `verify-imaging-v4.mjs` badge-parse fragility: a new two-space-indented `x:{`/`y:{`/`z:{` object containing a `labels: {top,bottom,left,right}` block **after** `const SECTION_VIEWS` in `SectionPiP.tsx` would overwrite `pipBadges` and fail | Medium | Do not write such a literal next to the new restore button; the gate is in the evidence contract, so a violation fails loudly and is fixed in place. `owner: pip-restore` |
| **R4** | README edits could drop one of the verbatim credit strings asserted at 7 sites in `verify-imaging-v4.mjs` (`:391-478`) | Medium | Additive-only README edits + the gate in the evidence contract. `owner: integration-v5` |
| **R5** | New strip mounted outside `.section-toolbar`, or styled with `.slider-row` but without the range re-scope → narrow/mis-aligned slider | Medium | §3.2.9/10 exact spec + CSS requirement; integrator re-checks the rendered dev smoke. `owner: section-sliders`, verified by `integration-v5` |
| **R6** | Restore pill obscured by ClipControls (top-right, up to `100% - 24px` tall) or the bottom-centre explode dock on short/narrow viewports → automated click intercepted | Low–Medium | Pill is `z-index: 7` (above both), small, and in the panel's own corner. `owner: pip-restore` |
| **R7** | Stale comment in `PlatesTab.tsx:662-665` claiming `src/styles` is out of write scope | Low | Corrected while editing (`section-sliders`). |
| **R8** | Concurrent `npm run build` from both builders racing on `dist/` | Low | Re-run once on a dist/ENOENT error; integrator's final build runs alone. `owner: both builders` |
| **R9** | Dev server left running / port occupied for the orchestrator's probe | Medium | Integration starts it backgrounded, checks 200, stops it, and verifies 0 listeners on 5173 before finishing (`§3.3.4`). `owner: integration-v5` |
| **R10** | Scope creep into the working live-section path | High if it happens | Hard do-not-touch list in §2; no task other than the three file owners may edit; no `src/data`/`store.ts`/`clipPlanes.ts` edits |

---

## 8. Acceptance-probe readiness checklist (spec §"Acceptance", verified against this plan)

| Spec item | What must be true in the built app | Owning detail |
| --- | --- | --- |
| 1. Hide with × → restore pill in the same corner → click restores the panel with the correct readout | `<button class="pip-restore">` with accessible name containing `Live section`, `title="Show the live synced 2D section"`, positioned `right/bottom: 12px` in `.viewer3d-root`; `onShow` → `setSectionPipVisible(true)`; panel readout `x|y|z = −42.0 au` from the store (untouched) | §3.1.1-3 |
| 2. Reload with the PiP hidden → pill still there | Initial state from `initialSectionPipVisible()` (`neuroaxis.sectionPip === 'hidden'` → false) and pill rendered purely on `visible === false`, no history gate | §3.1.4 |
| 3. Plates → Live section: dragging the Transverse slider moves the section; readout, crosshair and 3D plane follow; no console errors; canvas pixels change | `<input type="range" aria-label*="Transverse">` writing `clip.y` via `setClip` (snapping path when `snapToPlate`), pinning `sectionAxis` on pointerdown/focus; `<output>` shows `−42.0 au`; `SectionCanvas` redraws through its existing subscription; crosshair from the other two axes; 3D plane re-applied by `ClipSync` on returning to the 3D tab | §3.2.2-8, §4, R1, R2 |
| 4. Author-plate mode and v1–v4 unchanged; `validate`/`check`/`build` green | Author branch untouched; both QA scripts green; regression list walked in §3.3.5 | §3.3.3, §2 |

---

## 9. Message to forward to already-dispatched tasks

If `pip-restore` / `section-sliders` are already running, forward the Deltas that change their code:

- **pip-restore:** mount the pill as a **direct child of `.viewer3d-root`** (not in `.viewer-overlay`), `z-index: 7`, `aria-expanded={false}` only, **no history gate**, and keep the new code free of two-space-indented `x:{`/`y:{`/`z:{` + `labels:{…}` literals in `SectionPiP.tsx`; add `node scripts/verify-imaging-v4.mjs` to your gates.
- **section-sliders:** reuse the **existing** `snapToPlate` flag (+ `step={snapToPlate?1:0.5}`, y-only snapping, nearest-to-dragged-value rule), import `CLIP_BOUNDS` instead of retyping ranges, output `−42.0 au` style, pin `sectionAxis` on pointerdown/focus, `aria-label` = `<Label text> plane position (atlas units)`, mount as the second child of `.section-toolbar` with `flex-basis:100%`, and **add the range-input re-scope in `plates.css`** (`.viewer-panel` scoping does not reach the strip).
- **integration-v5:** all of §3.3, especially the two extra QA gates, the explicit `git add` path list (include `docs/UX_FIXES_PLAN.md`, exclude `PLAN-run-*.md`), and freeing port 5173 before finishing.
