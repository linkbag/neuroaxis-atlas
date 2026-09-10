# NeuroAxis — End-to-End QA & Audit Report

Date: 2026-09-10 · Scope: the shipped app at commit `54be95a` (+ audit-tooling fixes)
Method: three independent workstreams — (1) a **runtime audit** driving real headless Chrome over the DevTools Protocol (`npm run verify:audit`, 37 checks), (2) a **content/data audit** (read-only, direct file inspection), (3) a **code/architecture audit** (read-only). Every claim below was checked against the running app or the files; three subagent claims that did not survive verification are recorded in §4.

---

## 1. Verdict — does it deliver the intended features?

**Yes.** Every feature promised across v1–v5 is present and works at runtime. Evidence is from the live app, not from code reading.

| Intended capability | Status | Runtime evidence |
| --- | --- | --- |
| 3D atlas of diencephalon / midbrain / rhombencephalon, nuclei + tracts + ventricles | ✅ | 84 baked meshes (320,016 tris), 3D scene renders (415 colour buckets), 71/71 nuclei meshes present |
| Realistic (non-blob) rendered anatomy | ✅ | BodyParts3D-derived envelopes + SDF-sculpted detail; QA-verified silhouettes |
| Tract geometry (ascending/descending) | ✅ | 36 tract records, tube geometry with taper/striation; 19 tracts carry full 6-field path data |
| Per-structure content: function, connections, blood supply, clinical, levels, refs | ✅ | Pulvinar panel renders 1,948 chars across 8 sections incl. Function/Connections/Clinical/Blood supply/Levels/Syndromes/References/Learn more |
| Clinical syndromes with involved structures | ✅ | 26 syndrome cards render (24 records + 2 composed views) |
| 2D cross-sections: transverse / sagittal / coronal (authored plates) | ✅ | 12 plates + 12 plate chips; SVG renders |
| Live 2D sections synced to the sliders | ✅ | Live section paints 469–5,518 samples; moving the transverse slider changes the rendered section; plane sliders present with correct ranges |
| GPU section PiP in the 3D view (clipping-slider synced) | ✅ | PiP visible by default; clip slider x=12 → PiP readout "x = 12.0 au"; axis switch + orientation badges |
| PiP restore after hiding | ✅ | 6/6 acceptance checks incl. persistence across reload |
| Real imagery: MRI volume (any plane) | ✅ | credit "MRI · ds007313 … OpenNeuro CC0", 1,877 samples painted |
| Real imagery: CT volume (any plane, brain/bone windows) | ✅ | credit "CT · Courtesy of the U.S. National Library of Medicine", 1,831 samples painted |
| Real photographs (histology + Visible Human cryosections) | ✅ | 76 stain images (7.30 MB); Photo modality paints 5,518 samples with UBC/NLM credit |
| Modality switcher with honest unavailable states | ✅ | Photo correctly *disabled* on the sagittal axis (no sagittal photos exist) with an explanatory tooltip; Simulated-only paints 553 samples with no credit |
| Per-structure external references ("Learn more") | ✅ | 2 external links on Pulvinar (Wikipedia + journal) |
| Search, taxonomy tree, level ruler, snap-to-plate | ✅ | Search "STN" returns hits; tree navigates region → subdivision → structure; snap-to-plate drives the plane |
| Quality toggle, explode, layer filters | ✅ | High/Balanced switch cleanly; explode operable; layer chip toggles aria-pressed |
| Accessibility basics | ✅ | 93 interactive nodes in the AX tree, **every one has a computed accessible name**; plane sliders keyboard-operable (ArrowRight 12 → 12.5) |
| No runtime errors | ✅ | 0 page exceptions, 0 console errors, 0 failed requests during the whole audit |

**Gates & budgets:** `validate` 0 errors/0 warnings · `tsc --noEmit` 0 · `vite build` 0 · bundle 3.09 MB (672 KB gzip) · imaging payload 7.30 MB of the 8 MB cap · MRI+CT grids 45×81×67 uint8 each.

**Verdict summary: the tool does what it set out to do.** The gaps below are depth/robustness/polish items, not missing capabilities.

---

## 2. Verified defects and gaps (ranked)

### P0 — robustness (a bad day becomes a dead app)
1. **No WebGL context-loss handling anywhere** (0 matches for `webglcontextlost`). On GPU reset / driver crash / tab suspend the 3D canvas, PiP render targets, PMREM environment and 84 programs die permanently with a blank canvas and no recovery path.
2. **Only one error boundary**, wrapping `SectionCanvas` inside `PlatesTab`. A throw in `Viewer3D`, `Header`, `InfoPanel`, `SyndromeBrowser`, `TaxonomyTree` or `PlateRenderer` still blanks the entire app (this is exactly what the earlier `DataCloneError` did).
3. **Worker/asset loading can hang with no timeout**: `useAnatomyAsset` has no abort/timeout, so a stalled GLB fetch never resolves to `'fallback'`, and the contour registry waits forever behind a "Loading anatomy meshes X/84" banner with no retry or failure state.

### P1 — correctness/consistency of the *verification* and *derivations*
4. **Three independent implementations of the same plane transform** (canvas `SectionCanvas.tsx` · PiP `SectionPiP.tsx` · sampler `imageLayers.ts`): centre and scale differ (canvas centres on the bounds midpoint; the other two assume centre 0 with a 1.08 margin), so the *same photograph at the same plane* lands at a different world position/size in the canvas than in the PiP.
5. **Four hand-copied rules** that must stay identical but can drift: `nearestLevelTo` (×2), the snap-to-level write (×2), the 1.5 au anchor window (×3), `AXIS_PAIR` (×2), plus `photoForPlane` re-implementing `pickStainForPlane`.
6. **Photo registration is horizontally fitted but vertically unverified**: `fit.dy = 0` and `mirrorX = false` on all 46 fitted entries — they are documented defaults, not measurements, so vertical alignment of photographs is asserted nowhere.
7. **45 of 76 images are not level-anchored** (`levelId: null`), and the 22 Visible Human entries carry a **±10 au** plane uncertainty (their own note says so). "Level-mapped micrographs" is true for 31/76 entries.
8. **`lvl-post-comm` has no imagery at all** while the other 12 levels have 1–4 images each.

### P1 — content depth
9. **11 records ship `clinical: []`** — including teaching staples (`nuc-cochlear-dorsal`, `nuc-superior-olivary`, `nuc-interposed`, `tract-lateral-lemniscus`, `tract-trapezoid-body`, `tract-internal-arcuate`, `nuc-nucleus-cuneatus`, `tract-fasciculus-cuneatus`, `nuc-inferior-olive-medial`, `nuc-arcuate-medullary`, `nuc-vestibular-inferior`). 51 of 107 clinically-covered records have exactly **one** item.
10. **8 tracts are invisible in both 2D and 3D** (no mesh, no plate label): `tract-dcml`, `tract-trigeminothalamic-ventral/dorsal`, `tract-auditory-pathway`, `tract-spinoreticular`, `tract-lateral/medial-vestibulospinal`, `tract-hypothalamospinal` — they have good records but cannot be found by eye.
11. **All 11 `context` taxonomy entries have no mesh, while 10 *unregistered* `ctx-*` meshes render** (`ctx-thalamus-l/r`, `ctx-pons-surface`, …). The context layer is therefore not addressable by id: you cannot select or describe the silhouettes you see.
12. **One classic syndrome missing: one-and-a-half** (both substrates — `nuc-pprf`, `tract-mlf` — exist and are strong). Also `syn-central-horner` is documented in `CONTENT_INVENTORY.md` but exists in no data file, and `syn-lateral-pontine` / `syn-peduncular-hallucinosis` exist but are undocumented (doc says 23 syndromes; files hold 24).

### P2 — performance
13. **`SectionCanvas.draw()` rebuilds per frame**: registry list + sort, `SECTION_PARTS.filter().sort()`, linear level scans, and `new Path2D` per part — the same filter+sort also runs on **every pointermove**.
14. **PiP renders the scene 3–4×/frame** (two stencil passes + cap + colour) plus a per-frame `readRenderTargetPixels(32×32)` watchdog; the 19 tract tubes each add a `useFrame` callback.
15. **Per-plane volume resampling allocates heavily**: a 512×512 sample loop with ~3 arrays per sample and a closure per call (~1.5 M short-lived allocations per plane change); slice caches are canvas-count bounded (~32 MB worst case), not byte-bounded.
16. **Load cost**: 3.09 MB unminified bundle (672 KB gzip, `minify:false`, no code splitting) + 7.75 MB of GLBs parsed eagerly and then copied again for the worker (~15 MB extra).

### P2 — accessibility & polish
17. **Plate regions are mouse-only**: `PlateRenderer` collapses the SVG to `role="img"`; the 12 `[data-structure]` regions have click handlers but no focus/role/keyboard path — the app's most graphically appealing interaction is unreachable by keyboard.
18. **Hidden-but-focusable panels**: `App.tsx:65` sets `aria-hidden` on containers that stay tabbable while hidden by `transform` (sidebar, info panel under 640 px).
19. **Modal hygiene**: `ReferencesModal` has no focus trap/autofocus/restore; `SearchBox` is a combobox without `aria-activedescendant`.
20. **PiP is fixed-size** (224×170 / 348×262) with no narrow-width collapse; `.btn-snap` ≈21 px and `.pip-btn` ≈16 px hit targets.
21. **No favicon** → a 404 in the console on every load (cosmetic, but it is the only console noise left).

### P2 — dead code / maintainability
22. Truly dead: ~15 unused exports (`curves.mirroredWaypoints`, `textures.getFoliaNormalTexture`/`disposeProceduralTextures`, `materials.isSectionCapped`, `contours.polygonArea`, `imageLayers.getCtWindow`, `anatomyAssets.hasAnatomyPart`, `Viewer3D`'s 11-name re-export block, `webRefs.webRefCount`, `load.allStructures/REGION_ORDER/KIND_ORDER/getSyndromes`, `TractTube.tubeCacheSize/disposeTubeCache`, `SectionSliderBar` self re-export), 6 dead exports inside `envelope.ts` (**the file itself is still live** as the per-slot v1 fallback), 2 dead CSS classes, 5 dead tokens.
23. God files: `SectionCanvas.tsx` 1,410 · `imageLayers.ts` 1,517 · `SectionPiP.tsx` 1,106 · `PlatesTab.tsx` 725 lines; `SectionCanvas.draw()` is one 145-line function that also owns interaction, registry and diagnostics.

---

## 3. Verification coverage — what is actually gated today

| Tool | Status after this audit | What it proves |
| --- | --- | --- |
| `npm run validate` | ✅ 88 data gates, 0 errors/warnings | data integrity (ids, referential tree, plate/SVG agreement) |
| `npm run check` / `build` | ✅ 0 / 0 | types, bundling |
| `npm run verify:pipeline` | ✅ **fixed** (was broken: wrong import path, no exit code) — now 84/84 parts, 162 loops, passes/fails | geometry registry + contour engine + plane slicing |
| `npm run verify:browser` | ✅ **fixed** (was 0 assertions, always exit 0) — now fails on page exceptions/bad responses | live app smoke + diagnostics dump |
| `npm run verify:acceptance` | ✅ 9/9 | PiP restore + plane sliders |
| `npm run verify:audit` | ✅ **new, 37 checks, now wired into package.json** | the full feature surface (see §1) |

**Highest-risk behaviour still uncovered by any automation:** GPU stencil-capped cut faces (the word "stencil" appears in no script), and the au→volume/imagery mapping (an axis swap or laterality flip would pass every existing gate — which is exactly why §4's coronal scare was worth chasing).

---

## 4. Claims checked and REFUTED (recorded so they are not re-litigated)

1. **"Coronal sections are mirrored: patient-left on image-left in the PiP and the SVGs — a HIGH correctness defect, and the verify gate is circular."** **False.** The PiP declares `labels: {left:'R', right:'L'}` for coronal with `flipX:false`, and the authored plate puts `R` at x=52 (image-left) and `L` at x=748 (image-right) — i.e. **patient-left on image-right, exactly the spec**. The gate's hard-coded `['S|I|R|L']` table is therefore correct, not circular-inverted.
2. **"`validate-data.mjs` structurally forces `registryOnly = 0`, so it under-reports gaps."** **False.** `registryIds` is the taxonomy id set returned by `validateTaxonomy` (`validate-data.mjs:689`), so `[...registryIds].filter(id => !authored.has(id))` is the genuine "registry entries without records" count — and it is legitimately 0 because all 137 entries do have records (independently recomputed).
3. **"19 registry-only tract stubs."** **False** — the subagent retracted this itself: 36 tract registry ids ↔ 36 tract records, disjoint and complete; 0 stubs by either test.

## 5. Claims checked and CONFIRMED (the ones that matter)
- No `webglcontextlost` handler anywhere; a single error boundary; `aria-hidden` on focusable containers — all confirmed by grep.
- My own audit found **no product defect** after fixing its three probe artifacts (tree needed 3 levels of expansion; the modality sweep ran on an axis where Photo is legitimately disabled; the clip sliders carry no labels so they must be selected by range). Every "failure" in the first audit pass was a harness bug, which is itself instructive: **the harness is code and needs the same scepticism as the app.**

---

## 6. Proposed improvements (prioritized)

**P0 — make failure survivable (≈1.5 days total)**
1. `webglcontextlost`/`webglcontextrestored` handlers on the R3F canvas + PiP targets: prevent default, rebuild on restore, and show a "graphics context lost — click to restore" state.
2. Error boundaries around every major surface (viewer, plates, info panel, tree, syndromes, modal) with a compact "this panel failed" card and a retry — never a blank app.
3. Timeouts + explicit failure states for the asset/volume loaders (e.g. 15 s → `'fallback'` + a visible "geometry unavailable" note with retry), so a stalled fetch cannot brick the live section.

**P1 — remove the drift that causes bugs (≈2 days)**
4. Extract ONE shared `planeTransform(axis, planeValue, viewport)` + `AXIS_PAIR` + `nearestLevelTo` + snap write into a single module used by the canvas, the PiP and the sampler; add a unit check asserting canvas and PiP agree for the same photo/plane.
5. Measured photo registration: compute and store real `fit.dy`/`mirrorX` per source by comparing photograph silhouettes to the envelope cross-sections (the same technique that fit the VHP cryosections), and show a per-image residual in `sectionImages.ts`.
6. Wire a gate that derives the orientation table from the *geometry* (project known world points through each camera and assert which anatomical side lands on image-left) instead of hard-coding the expected string.

**P1 — close the content gaps (≈2–3 days, mostly authoring)**
7. Author the missing clinical items for the 11 empty records (and a second item for the 51 single-item records).
8. Add the one-and-a-half syndrome card; reconcile `CONTENT_INVENTORY.md` with the data (24 syndromes; `syn-central-horner` either authored or removed from the doc); refresh the stale §3/§7 counts.
9. Give the 8 "invisible" tracts a minimal 3D representation (a simple tube along their plate polyline) and register the 10 unregistered `ctx-*` meshes in taxonomy so every rendered silhouette is selectable.

**P2 — performance (≈1.5 days)**
10. Cache per-plane work in the canvas: memoize the visible-part list and layer order on `(plane, layers, selection)` instead of rebuilding per frame; move the pointermove path off the full filter+sort.
11. Cut PiP cost: single-scene-pass capping option, drop the per-frame 32×32 readback to an on-demand watchdog, and move tract tubes onto one shared `useFrame`.
12. Make the volume sampler allocation-free (reuse typed buffers) and bound the slice caches by bytes.
13. Enable `minify: true` + manual chunking for the production build (672 KB gzip → roughly half) and lazy-load the GLBs outside the initial view.

**P2 — accessibility & polish (≈1.5 days)**
14. Keyboard-accessible plate regions (each region becomes a focusable element with `role="button"` + Enter/Space, plus roving tabindex) — this is the single biggest a11y win.
15. `inert`/`hidden` instead of transform-hiding panels; focus trap + restore in the modal; `aria-activedescendant` in search; a stopgap favicon.
16. Responsive PiP (collapse to a tab below ~900 px) and larger hit targets for snap/pip buttons.

**P3 — housekeeping (½ day)**
17. Delete the dead exports/CSS/tokens listed in §2.22; split `SectionCanvas.draw()` into transform / layers / contours / overlays; add the missing `verify:audit` entry to CI (no CI exists today).

---

## 7. Definition of done for the next round
`validate` + `check` + `build` + `verify:pipeline` + `verify:audit` all green on a clean checkout; zero page exceptions with the context-loss path exercised; content gaps in §2.9–2.12 closed; one shared plane transform with a cross-surface agreement test; plate regions keyboard-reachable. At that point the atlas is not merely feature-complete but field-robust.
