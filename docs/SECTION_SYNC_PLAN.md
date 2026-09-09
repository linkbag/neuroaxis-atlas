# Section Sync & Multi-Modality Plan — NeuroAxis v3

Goal: when the user moves any clipping slider, a corresponding **2D cross-section view updates in real time** — simulated from our own geometry — and can be **underlaid with real anatomical imagery** (stained micrographs, MRI) that is legally embedded or linked out. Focus: transverse (axial) planes through the brainstem/diencephalon/cerebellum regions.

Companion research: license verdicts in §1 (verified at source 2026-09). This document is the authoritative spec for the v3 swarm run.

---

## 1. Data sources — license verdicts (verified)

| Source | Content | License | Verdict |
| --- | --- | --- | --- |
| [neuroanatomy.ca](https://www.neuroanatomy.ca/micrographs.html) (UBC) | 17 labeled brainstem/spinal micrographs (`m1..m17`, URL pattern `/micrographviewer/images/micrographs/mN/mNbrain.png` + `mNthumb.png`) | **CC BY-NC-SA 4.0** (site footer) | **Embed verbatim** with credit "© University of British Columbia, CC BY-NC-SA 4.0" + link. Non-commercial educational app satisfies NC; verbatim copies (no crops/edits) keep SA trivially compliant |
| [brainmuseum.org](https://brainmuseum.org/) (UW/MSU/NMHM) | Sectioned & stained human brain series (coronal; hosted at brains.anatomy.msu.edu) | **Explicit permission** for educational/research use with their credit line: "University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health" + site reference. Not to be re-copyrighted | **Embed a subset** with the exact credit line |
| [OpenNeuro](https://openneuro.org/) | MRI volumes | **CC0** (all datasets) | **Download one T1w volume**, resample to canonical grid, embed slices |
| [Harvard Whole Brain Atlas](https://www.med.harvard.edu/aanlib/) | MR/PET slices | Permission-gated (copyrighted) | **Link-out only** (per-level/structure deep links) |
| [BrainMaps.org](https://brainmaps.org/index.php?p=termsofuse) | High-res histology | Per-dataset copyright | **Link-out only** |

Payload budget for new committed assets: **≤ 6 MB** (micrographs downscaled to ≤1400 px JPEG q80 ≈ 150–250 KB each; MRI grid ≈ 200–500 KB uint8).

## 2. Product spec — three synced surfaces

All driven by the existing `clipX/clipY/clipZ` store values (single source of truth).

### 2.1 GPU live-section PiP (3D tab)
- Second orthographic camera looking down the **active plane normal** (axis = most-recently-moved slider; manual override), rendering to a render-target texture shown in a resizable picture-in-picture panel docked in the viewer.
- **Stencil capping** so cut surfaces render filled (tissue face, not hollow shells): per-material stencil pass hooked through the central materials factory (`src/geometry/materials.ts`) so every GLB + primitive participates.
- Orientation labels (L/R/A/P/S/I per axis, patient-left convention), plane-position readout (`y = −24.0 au`), toggle + pop-out-to-corner sizes. Sync is inherently real-time (same render loop).

### 2.2 2D section canvas (Plates tab, new "Live section" mode)
- **Simulated cross-section**: worker thread clips every visible structure's triangles by the current plane (bbox-culled, plane-band filtered), chains segments into closed contours, and fills them even-odd with each structure's taxonomy color on a 2D canvas. Throttled to ~15 Hz while dragging, quantized to 0.25 au plane steps (cache keyed by plane).
- **Orientation**: transverse = anterior up, patient-left on image-right (radiological, matching our SVG plates); sagittal = superior up, anterior right; coronal = superior up, patient-left on image-right. Labels rendered in-canvas.
- **Interactions**: click/drag inside the canvas sets the other two sliders (crosshair placement); a chip shows the nearest authored plate ("0.4 au from lvl-olivary — open") with one-click snap; selected structure's contour is highlighted + labeled; hover identifies contours.
- Authored SVG plates remain available side-by-side (mode toggle: "Author plate | Live section"), so textbook schematic and live section compare directly.

### 2.3 Real-image layer (underlay/overlay in the section canvas)
- **Stain layer (level-mapped)**: when the active plane is within ±1.5 au of a level that has a mapped micrograph (UBC m-series ↔ levels.json; brainmuseum coronals ↔ relevant levels), offer the real image as a scaled underlay (opacity slider 0–100%), with a permanent attribution line and a "source" link. Image registered to the canvas by a per-image affine (two-point fit: midline + one landmark, constants in the manifest; QA-checked).
- **MRI layer (continuous)**: the resampled T1 grid (§3) is sampled at the current plane position for **any** slider value — grayscale underlay with window/level presets (brain/bone-ish) + opacity. This is the "real imaging at every plane" feature.
- Layer toggles + opacities live in the section toolbar; attribution is always visible when a real image is shown; "open source ↗" deep links (UBC page, MSU series, Harvard atlas, BrainMaps) per level/structure.

## 3. MRI pipeline (build-time)
`scripts/build-mri-grid.mjs` (Node, zero deps):
1. Download a small single-subject T1w NIfTI (`.nii.gz`) from a CC0 OpenNeuro dataset → `assets-src/imaging/mri/` (gitignored).
2. Minimal NIfTI-1 parser (header 348 B, sform/qform affine, gzip via node:zlib).
3. **Fixed, documented affine** MRI→canonical (6–9 constants tuned once by the task agent against our envelope silhouettes: midline x, brainstem-axis alignment, scale from pons width/brainstem length, translation to the level anchors; residual tolerance ±2 au, preview PNGs for QA).
4. Resample to a uint8 grid at ≈1.5 mm (canonical x∈[−27,27], y∈[−55,45], z∈[−56,26] → ≈ 38×88×73) → `src/assets/imaging/mri-t1.bin` (~240 KB) + `mri-manifest.json` `{dims, origin, spacing, rowMajorAxisOrder, patientLeft:+x, windowDefaults}`.
5. Runtime sampler draws the slice for the current plane (nearest-neighbor → bilinear upgrade if cheap) — works for **all three axes**.

## 4. Component & data contracts
```
src/components/section/
  SectionCanvas.tsx      # 2D live-section canvas (owns render loop + interactions)  [G2]
  contourWorker.mjs|ts   # mesh-plane contour extraction worker                      [G2]
  imageLayers.ts         # layer API + stain/MRI layer implementations               [G3]
src/components/viewer3d/
  SectionPiP.tsx         # GPU PiP live section                                      [G1]
src/assets/imaging/      # stains/*.jpg + mri-t1.bin + mri-manifest.json             [R1/A1]
src/data/sectionImages.ts# level→stain manifest + credit/link metadata              [R1]
```
- **Store**: G2 owns ALL store additions (`sectionAxisMode`, `sectionUnderlay{kind,opacity,window}`, `sectionPopout`); G3 consumes via props/registry, never edits the store.
- **Layer API** (G2 defines, G3 implements): `registerImageLayer({ id, appliesTo(plane, level), draw(ctx, view, plane), credit, sourceLink })` — canvas draws underlay → contours → overlay labels, in that order.
- Materials factory gets one new hook (`enableSectionCapping(material, color)`) — G1 owns it; clipping behavior (§2 constraint 3 of REALISM_PLAN) must keep working unchanged.
- Data JSONs stay frozen (additive files only). Attribution strings live in `docs/ATTRIBUTION.md` + always-visible canvas credit.

## 5. Swarm DAG (7 tasks)

| # | Task | Role | Deps | Owns (writes) |
| --- | --- | --- | --- | --- |
| 1 | `imaging-assets` | architect | — | assets-src/imaging/**, src/assets/imaging/stains/*, src/data/sectionImages.ts, docs/IMAGING_SOURCES.md, docs/ATTRIBUTION.md (credit lines) |
| 2 | `section-pip` | builder | — | viewer3d/SectionPiP.tsx, materials.ts capping hook, Viewer3D.tsx mount |
| 3 | `section-canvas` | builder | — | section/SectionCanvas.tsx, section/contourWorker.ts, section/contours.ts, state/store.ts additions, PlatesTab mode toggle |
| 4 | `mri-grid` | architect | 1 | scripts/build-mri-grid.mjs, scripts/lib/nifti.mjs, src/assets/imaging/mri-t1.bin + mri-manifest.json, preview PNGs |
| 5 | `image-layers` | builder | 1, 4 | section/imageLayers.ts (implements §4 layer API), toolbar controls markup consumed via props |
| 6 | `integration-v3` | integrator | 2, 3, 5 | wiring across viewer/plates/header, perf guards (worker, throttle, dpr), budgets, README, gates, dev smoke, commit |
| 7 | `review-qa-v3` | reviewer | 6 | spot-fixes; E2E verification (§2 behaviors), regression checklist (v1+v2 features), gates, verdict |

Evidence contracts quote exact paths; every task keeps `npm run check`/`validate`/`build` green. Imaging tasks must record license verification in `docs/IMAGING_SOURCES.md` **before** committing embedded assets.

## 6. Risks & mitigations
| Risk | Mitigation |
| --- | --- |
| UBC images are PNGs sized ~1 MB each | Downscale to ≤1400 px JPEG q80 (verbatim content, only resolution/encoding adapted — permitted with attribution; note adaptation in ATTRIBUTION) |
| NIfTI parse/registration accuracy | Fixed-constant affine tuned against envelope silhouettes; preview PNGs QA'd by reviewer; underlay is explicitly labeled "approximate alignment" in UI until tuned |
| Contour extraction jank while dragging | Worker + 15 Hz throttle + 0.25 au quantization + bbox cull; degrade to outline-only mode under load |
| Stencil capping perf on weak GPUs | PiP only renders when open; capping skips under `quality: 'balanced'` |
| License drift | Credit lines pinned verbatim from the live pages (captured in IMAGING_SOURCES.md with fetch dates); images stored verbatim (no crops) |
| Dev-server watcher races swarm edits | Server stopped during the run; restarted + smoke-tested at integration |

## 7. Definition of done (v3)
Moving any slider updates: 3D clip + PiP section + 2D live-section canvas in real time; transverse MRI underlay works at every y position; stain images appear on mapped levels with attribution; click-in-canvas sets crosshair sliders; nearest-plate snap chip works; all v1/v2 features regress-free; gates green; committed assets ≤ 6 MB new payload; ATTRIBUTION/README updated; dev server 200 at :5173.
