# UX Fixes Plan — NeuroAxis v5 (PiP restore + live-section sliders)

Two focused, user-reported gaps. Both are small; the risk is regression, not scope — so the acceptance bar is explicit and I (the orchestrator) will run the browser probe against them afterwards, since the agents cannot drive a browser.

## Feature 1 — Restore the live-section PiP after it is hidden
**Problem (confirmed in code):** `SectionPiPPanel` renders `null` when `visible === false`, and its only visibility control is the hide (×) button. `Viewer3D` owns the flag (persisted in localStorage), so once hidden there is **no affordance anywhere** to bring the panel back — the user must clear localStorage or reload with a different state.

**Required:**
- A discoverable **restore control** that appears when the PiP is hidden: a small pill/button docked bottom-right of the 3D viewer (exactly where the panel was), labelled e.g. **“Live section ▸”** with `title="Show the live synced 2D section"`. Clicking sets the visible flag back to true.
- It must also be reachable **before** the PiP has ever been shown (first visit), so the feature is discoverable without hiding it first.
- Keep the existing persistence behaviour (localStorage) and the existing × / size-toggle controls unchanged.
- Accessibility: real `<button>`, `aria-pressed` / `aria-expanded` as appropriate, keyboard reachable, no layout shift of the canvas.
- The restore control must disappear while the panel is visible.

**Files:** `src/components/viewer3d/SectionPiP.tsx` (panel + a small `SectionPiPRestoreButton` export), `src/components/viewer3d/Viewer3D.tsx` (mount it, pass the setter), `src/styles/sectionPip.css` (styling consistent with the existing dock).

## Feature 2 — Plane sliders inside the Plates-tab live section
**Problem:** the live section only follows the sliders that live in the **3D** tab's CLIPPING PLANES dock. In the Plates tab the user can only click level chips — they cannot scrub the plane continuously.

**Required:**
- A compact slider strip rendered with the live section, with **one slider per axis**: `Sagittal · x`, `Coronal · z`, `Transverse · y`, each labelled and showing its current value (`−42.0 au` style, matching ClipControls formatting).
- Ranges/steps MUST match the 3D dock exactly (AMENDMENT A): x ∈ [−48, 48], z ∈ [−56, 26], y ∈ [−55, 45]; step 0.5; the value written to the store is what everything else already consumes.
- Dragging a slider must update the live section **immediately** (the canvas already redraws via its store subscription) **and** the 3D clip planes (ClipSync already follows the store) — no new sync mechanism, just store writes.
- The slider of the **active section axis** is visually emphasised (it is the plane the canvas shows); the other two keep the crosshair in sync (the canvas already draws a crosshair from those values).
- Include a **“Snap to levels”** checkbox mirroring the 3D dock behaviour (reuse the store flag if one exists; if not, follow ClipControls' existing semantics exactly — do not invent a second snapping path).
- Keyboard accessible (`<input type="range">`), with `aria-label` per slider.
- Must NOT break: click-to-set crosshair on the canvas (Feature 2 sliders and that interaction write the same store fields — they must agree), the author-plate mode, or responsiveness (the strip wraps on narrow widths).

**Files:** new `src/components/section/SectionSliderBar.tsx`; mounted by `src/components/PlatesTab.tsx` (live-section mode only); styles in `src/styles/plates.css`.

## Acceptance (verified in a real browser by the orchestrator)
1. Hide the PiP with × → a “Live section” restore pill appears in the same corner → clicking it brings the panel back with the correct plane readout.
2. Reload with the PiP hidden (persisted state) → the restore pill is still there.
3. Plates → Live section: dragging the Transverse slider moves the section continuously; the readout, crosshair and 3D clip plane all follow; no console errors; canvas pixels change (probe assertion).
4. Author-plate mode and all v1–v4 features unchanged; `validate`/`check`/`build` green.
