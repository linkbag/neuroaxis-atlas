# PiP Fix Plan — live section shows nothing (NeuroAxis v3 hotfix)

## Symptom
Section PiP panel (bottom-right of 3D viewer) renders its chrome — header, `TRANSVERSE y = −8.0 au` readout, axis buttons, orientation badges, "clipping off" badge — but the section window is empty. Main model renders fine (screenshot verified). User's state: "Enable clipping" **unchecked**.

## Root cause (confirmed by code reading)
`section-pip` (SectionPiP.tsx) builds its section from the **shared plane singletons** (`SAGITTAL_PLANE`/`CORONAL_PLANE`/`TRANSVERSE_PLANE` from `viewer3d/clipPlanes.ts`). That module parks the constants at `OFF_CONSTANT` whenever `store.clip.enabled === false`:

```ts
TRANSVERSE_PLANE.constant = clip.enabled ? clip.y : OFF_CONSTANT
```

So with the checkbox off (the default-ish state the user hit):
- the stencil parity passes (override materials with `clippingPlanes = [plane]`) clip against a plane at `OFF_CONSTANT` — no cut;
- the cap plane draws nothing (parity 0);
- the color pass has no section isolation.
→ empty section window, exactly as reported.

Design flaw beyond the bug: **sliders alone should define the section plane**; `clip.enabled` should ONLY control whether the main 3D model is visibly cut. The PiP must never depend on that checkbox. Documented in the GUI: the "clipping off" badge becomes informational.

## Fix contract (binding)
1. **Own planes**: SectionPiP allocates its own `THREE.Plane` instances per axis (or per frame), setting `constant = store.clip[axis]` and the correct normal each frame — derived ONLY from the store slider values. Never `OFF_CONSTANT`.
   - Stencil passes clip with the PiP's own ACTIVE plane.
   - The cap mesh is clipped by the PiP's own OTHER-axis planes (same construction as today, but from live values).
   - The color pass may keep using the scene materials' shared planes **when clipping is enabled**; when disabled, the section must still render correctly — verify the combination: own active plane for the section semantics + shared planes for the color pass produce a correct cut illustration in both checkbox states. Materials that are NOT clip-registered (if any) must still work: the section is meaningful from the ortho cut regardless.
2. **Always-render**: while the panel is visible, the section renders every frame — checkbox state does not gate it. The "clipping off" badge text/behavior becomes informational ("model not clipped — section synced to sliders") and never suppresses content.
3. **MSAA/stencil robustness**: `WebGLRenderTarget` uses `samples: 4` under High. Stencil parity on multisampled targets is driver-sensitive; add an automatic fallback — build the rig with `samples: 0` (still stencilBuffer:true) when `gl.capabilities.isWebGL2` false, and verify correct behavior with samples 4; if parity counts are observed wrong at runtime (`?pipdebug`), flip to 0 with a console note. Document the choice.
4. **Diagnostics flag**: `?pipdebug` in the URL adds a DOM overlay in the panel: live readouts — `planeValue`, own-plane constant, RT size, last blit rect (x,y,w,h), `gl.getError()`, stencil-pass frame counter, visible-instance count. Styled unobtrusively; zero cost when off. This gives the user's next screenshot ground truth if anything remains.
5. **Fallback**: if the GPU path cannot be made correct, the panel falls back to embedding the worker-contour `SectionCanvas` (already proven working — same orientation conventions, same store) inside the PiP window; the GPU path stays behind a `?pipgpu` flag. Decide by evidence, not preference: if diagnostics show a clean render, keep GPU; else flip default to canvas.

## Repro/verification
- Open app → 3D tab → panel visible → drag sliders WITHOUT checking "Enable clipping": section must appear and follow.
- Then check "Enable clipping": 3D cut + section both live; snap-to-plate still works.
- Toggle axis buttons X/Y/Z; small/large; hide/show. Quality High/Balanced.
- `?pipdebug` overlay: numbers change with the slider; RT size = panel size × dpr/half-dpr; no gl errors.
- Gates: `npm run validate` 0, `check` 0, `build` 0; dev smoke 200.

## Swarm DAG (3 tasks)
1. `pip-fix` (builder): implement §fix 1–4 in `src/components/viewer3d/SectionPiP.tsx` (+ optional small `clipPlanes.ts` helper if useful; keep shared-plane behavior identical for ClipSync), inline `?pipdebug` in `SectionPiPPanel`, own-plane plumbing, MSAA fallback, §5 evidence-based GPU-vs-canvas decision (if canvas fallback chosen, wire in SectionCanvas via a lazy import — do NOT change SectionCanvas/store/PiP props surface; keep `windowRef` contract).
2. `integration-pip-fix` (integrator): mount verification, regression (PiP + clip + snap + plates + selection), gates, dev smoke, commit `fix: PiP section renders from slider planes regardless of clip toggle`.
3. `review-pip-fix` (reviewer): code-verify fix 1–4, edge cases (Balanced quality half-res, large/small toggle rect change — rect changes MUST NOT break the blit: clamp rect into canvas), regression checklist, verdict. Conservative fixes only.

Evidence: exact file paths; commands `npm run check`, `npm run build`, `npm run validate`.
