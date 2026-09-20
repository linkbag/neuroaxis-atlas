# NeuroAxis — 3D Brainstem Atlas

**An interactive, realistic web atlas of the diencephalon, mesencephalon (midbrain), and rhombencephalon (pons, medulla, cerebellum) — with the telencephalon (cerebral hemispheres, basal ganglia, limbic system, ventricles) layered on from v7, the cerebral vasculature (circle of Willis and the major cerebral arteries) plus the deep functional/projection content from v8, and the somatotopic map, the cortical-division section layer, the re-runnable imaging registration and the simulated-section panel from v9, and the v10 display round (full-box plane helpers, division-level visibility with solo, four-corner panel resize, cortical-division quality, and the dropped cortex label)** — selectable 3D nuclei and fiber tracts, labeled 2D cross-section plates bidirectionally synced with the 3D clipping planes, a clinical-syndrome browser, and per-structure neurophysiology, connections, blood supply, and references. Built with Vite, React 18, TypeScript, three.js (`@react-three/fiber`), and zustand. The interaction model is inspired by [ashemag/human-atlas](https://github.com/ashemag/human-atlas); **all anatomy content and plate artwork are original schematic works authored for this project, and since the v2 realism upgrade the envelope surfaces are derived from [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (CC BY 4.0)** — see [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

## Features

- **Realistic v2 rendering** — real-scan-derived brainstem/diencephalon/cerebellum envelopes, organically sculpted nuclei, CSF spaces, PBR lighting with SSAO/bloom/SMAA, and a High/Balanced quality toggle (details below).
- **3D viewer** — orbit / zoom / pan; click-select any nucleus, tract, ventricle, or surface landmark; hover labels; global selection shared with every other panel.
- **Two toggle rows — Areas and Systems (v11)** — the header's primary control is **two labelled rows of on/off toggle buttons**: **Areas** (Telencephalon · Diencephalon · Mesencephalon (midbrain) · Metencephalon (pons + cerebellum) · Myelencephalon (medulla) · Cerebral vasculature) and **Systems** (Nuclei · Tracts · Ventricles · Surface · Vessels · Context · **Cranial nerves** — the seventh kind, added by v13). Switching one **off excludes that slice of the atlas from the 3D view, the 2D live section *and* the PiP**; switching it on includes it — one visibility decision, three surfaces. **Reset** restores the documented default framing and **All** shows everything. The view-preset row is kept as the **shortcut row beneath them**; the per-region / per-kind checkboxes stay in the Legend and read the same two sets.
- **Region & system layers** — the Legend still toggles diencephalon / midbrain / pons / medulla / cerebellum **/ telencephalon / vasculature** and nuclei / tracts / ventricles / surface / context / **vessel** individually, plus the v10 division group with **Solo**; presets *Brainstem focus* (default), *Deep structures*, *Whole brain*, ***Vasculature***, *Cortex only*, *All*, *Nuclei*, *Tracts*, *Clinical motor* are unchanged.
- **Exploded view** — slider fans nuclei radially off the brainstem axis while tracts and envelopes stay put.
- **Clipping planes** — sagittal / coronal / transverse cuts over the full canonical range with a plane-helper toggle; the transverse slider snaps to plate levels.
- **Live section sync (v3/v4/v9)** — every clip slider drives a 2D live-section canvas in the *Plates* tab **and** a simulated-section panel docked bottom-right of the 3D view, both computed by the same Web Worker (clip the committed GLB triangles by the plane, chain closed contours, fill even-odd with taxonomy colours) and both showing **real imagery as the base layer** in the *Plates* tab — real section photographs on their anchored planes, a continuous real head CT volume, and a continuous T1 MRI at any plane, with a modality toolbar (Auto real-first / MRI / CT / Photo / Simulated only), CT brain–bone windows, and the active modality's credit always visible. **The 3D tab's panel is the simulated section only and never counts as an imagery surface** — v9 replaced its GPU stencil-cut renderer with that shared 2D renderer, and retired the v4 real-slice backdrop with it (details in [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel)).
- **Telencephalon (v7)** — the cerebral hemispheres, basal ganglia, limbic structures, lateral ventricles and telencephalic white matter (22 new meshes, 46 registry entries, 4 new levels, 3 new plates) layered onto the same canonical space, with the hemispheres as a translucent **ghost cortex** so the brainstem stays the subject of the app. New presets *Brainstem focus* (the default) / *Deep structures* / *Whole brain* / *Cortex only* — details in [Telencephalon (v7)](#telencephalon-v7--the-rest-of-the-brain).
- **Cerebral vasculature & deep content (v8)** — the **circle of Willis and the major cerebral arteries** as 14 records over **32 new real meshes** (arteries + optic pathway), each with its territory and the syndromes it causes, under a new *Vasculature* preset; plus the telencephalon's deep granularity — 12 functional cortical areas (V1, V2, A1, A2, Wernicke, Broca, M1, S1, premotor, SMA, entorhinal, FEF), 4 hippocampal subfields, the optic pathway, the ventricular segments and the striatal/pallidal subdivisions — details in [Cerebral vasculature & deep content (v8)](#cerebral-vasculature--deep-content-v8--the-arterial-layer-and-the-telencephalon-at-brainstem-granularity).
- **Somatotopic M1/S1 map (v9)** — **16 records** (`ctx-m1-*` / `ctx-s1-*`, toe → leg → trunk → arm → hand → face → tongue → larynx) placed on the **derived** cortical ribbon by a reported probe, with a dedicated oriented-patch 3D overlay, a face→hand→arm→trunk→leg colour ramp, body-part labels, and the somatotopic order enforced in the tree — details in [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel).
- **Cortical-division section layer (v9)** — a toggleable layer in the 2D live section that re-colours the cortical ribbon by **frontal · parietal · temporal · occipital · insula · limbic**, fitted to the ribbon's own geometry with the measured per-boundary residuals in the file header, drawn *over* the existing cortex fill so the reader can switch between "cortex" and "which part of the cortex" — details in [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel).
- **Measured imaging registration (v9)** — a re-runnable fitter (`node scripts/fit-imaging-affine.mjs --report`) that measures the atlas brain mask against each modality's own image mask and commits the residuals; **24 photograph plates corrected and applied (mean ROI IoU 0.074 → 0.447, 0 worsened)**, while the **CT and MRI corrections were measured and rejected** with their numbers stated in the manifests and in the UI — details in [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel).
- **Simulated-section panel + images-off (v9)** — the 3D tab's bottom-right panel is now a **2D simulated-section panel** (no clipped 3D geometry, no plane helper, **no real imagery ever**, resizable with the size remembered across reloads), and the *Plates* toolbar's **Simulated only** state is a first-class, persisted, clearly-worded "no imagery" mode — details in [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel).
- **Display round 2 (v10)** — the three 3D plane helpers now span the **whole `CLIP_BOUNDS` rectangle** of their two in-plane axes, so a cut through the hemispheres shows the cut plane where the cortex actually is instead of stopping at the brainstem; a **division-level visibility control** (Prosencephalon · Mesencephalon · Rhombencephalon · Cerebral vasculature) in the Legend with an on/off checkbox **and** a one-click **Solo** per division, so "everything on" stops being overwhelming; the simulated-section panel resizes from **all four corners**; the cortical-division layer stops painting slivers and floating wedges; and the *"Cerebral cortex (context envelope)"* **text label is dropped while its contour stays** — details in [v10](#v10--plane-helper-extent-division-visibility-four-corner-pip-resize-cortical-division-quality-and-the-cortex-label).
- **Areas + Systems toggle rows (v11)** — the header's view-preset row is demoted to a shortcut row beneath **two rows of on/off toggles**: the big anatomical **Areas** (Telencephalon · Diencephalon · Mesencephalon · Metencephalon (pons + cerebellum) · Myelencephalon (medulla) · Cerebral vasculature — which together partition all 7 taxonomy regions and all 236 entries exactly once) and the orthogonal **Systems** axis (Nuclei · Tracts · Ventricles · Surface · Vessels · Context = `ALL_KINDS`; **v13 adds a seventh, Cranial nerves**). An area or system **off** is excluded from the 3D scene, the live section **and** the PiP by **one** visibility decision, with **Reset / All** restoring the documented default; the run also settled the two v10 carry-over defects (the cortical-division rule vs what the canvas paints; the sagittal plane-helper `u/v` convention) — details in [v11](#v11--the-areas--systems-toggle-rows-replace-the-view-preset-row).
- **Cranial nerves (v13)** — the twelve cranial nerves (**CN I Olfactory → CN XII Hypoglossal**) as first-class records under a new seventh **Systems** toggle, **Cranial nerves** (kind `nerve`, id prefix `nrv-`): each record carries its modality, its course *with the skull-base foramen it uses*, its function, links to the cranial-nerve **nuclei** the atlas already had, its blood supply or the vessel it is clinically related to, and clinical items that give the palsy picture **and its localisation**. They are placed in their **true** regions (telencephalon 2 · midbrain 2 · pons 4 · medulla 4) under one subdivision, `Cranial nerves`, so they group in the tree. **v13 shipped them as records with schematic placement markers; v14 replaced the markers with authored course geometry** — read the [v14 section](#v14--the-cranial-nerves-as-traveling-tracts) and its [honest limits](#v14-honest-limits-in-one-place) before quoting one in 3D — details in [v13](#v13--the-cranial-nerves-the-seventh-system).
- **12 interactive 2D plates** — 9 transverse levels (pyramidal decussation → mid-thalamus), 1 midline sagittal profile, 2 coronal slices; every labeled region highlights on hover and selects everywhere on click; leader-line labels toggle on/off. **(v7 adds 3 more — 15 total:** axial +58, sagittal hemisphere, coronal fornix.)
- **2D ↔ 3D sync** — selecting a plate (or level-ruler entry) moves the 3D transverse clipping plane to that level and reveals the plane helper; dragging the plane keeps the level ruler and plate sync indicator in step.
- **Structure browser** — region → subdivision → structure taxonomy tree plus case-insensitive search over names and synonyms (try "STN", "MLF", "pulvinar").
- **Info panel** — overview, neurophysiological function, afferent/efferent connections, blood supply, clickable level chips, related syndromes, and textbook references for every record; tracts add direction, modality, origin→target, decussation, and somatotopy.
- **Clinical syndrome browser** — 24 cards (Wallenberg, Weber, Benedikt, locked-in, Parinaud, Déjérine-Roussy, hemiballismus…); opening a card lights the involved structures in 3D, on the plates, and in the tree, and dims everything else.
- **References** — global bibliography modal; every record's citations link into it.
- **Responsive** — three-column desktop (1280×800), stacked tablet with collapsible sidebar (834×1112), phone layout with a bottom tab bar and bottom sheets (390×844).

## Screenshots

> Placeholders — replace with captured images.

| View | What it shows | File |
| --- | --- | --- |
| 3D viewer | Orbitable brainstem with selected red nucleus, clip controls, explode slider | `docs/screenshots/3d-viewer.png` (to capture) |
| Transverse plate | Mid-olivary plate with labels and 3D plane sync indicator | `docs/screenshots/plate-olivary.png` (to capture) |
| Syndrome highlight | Wallenberg card open — involved structures lit, rest dimmed | `docs/screenshots/syndrome-wallenberg.png` (to capture) |
| Phone layout | Bottom tab bar, info bottom sheet | `docs/screenshots/phone-390.png` (to capture) |

## Quickstart

```bash
npm install        # Node ≥ 20 (Node 24 verified)
npm run dev        # → http://localhost:5173
npm run build      # production bundle in dist/
```

Open **http://localhost:5173**, click any structure in the 3D view (or search / browse the tree / open a plate) — the info panel shows its full record. Try: select the *Plates* tab and pick *Medulla — mid-olivary*; the 3D transverse plane jumps to y = −34 au.

## Realistic rendering (v2)

The 3D scene was upgraded from schematic primitives ("blobs" + lathe envelopes) to realistic anatomy per [docs/REALISM_PLAN.md](docs/REALISM_PLAN.md) — the canonical coordinate system, the levels table, and every v1 interaction (selection, layers, clipping + snap-to-plate, explode, 2D↔3D sync) are unchanged:

- **Real-scan envelopes** — the brainstem, diencephalon and cerebellum outer surfaces derive from **BodyParts3D 4.0** (CC BY 4.0, license evidence in [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md); the thalami and lateral/medial geniculate bodies come from the IS-A tree archive of the same release), registered into the canonical atlas space (mm/Z-up → au, level-anchored y-warp, centerline straightening) and organically sculpted: SDF smooth-union/subtract carves the interpeduncular fossa and ventricles and reinforces pyramids, olives, colliculi, the pontine bulge and the thalamic pulvinar.
- **Organic nuclei** — every nucleus record renders a committed organic mesh (noise-displaced per its `origin3d`/`size3d`, shaped per type: purse-folded inferior olive, crescent substantia nigra, thalamic partition cells, sulcus-hugging cranial-nerve columns), containment-checked ≥ 98% inside its envelopes (report: `src/assets/anatomy/nuclei-report.json`).
- **CSF spaces** — fourth-ventricle tent, cerebral aqueduct and third-ventricle slit as cyan fresnel-weighted translucent meshes.
- **PBR + post FX** — RoomEnvironment IBL, ACESFilmic tone mapping, `MeshPhysicalMaterial` presets from one clipping-aware factory (`src/geometry/materials.ts`), and SSAO + subtle bloom + SMAA (`@react-three/postprocessing`).
- **Quality toggle** — *High* (post composer, dpr ≤ 2) vs *Balanced* (no composer, dpr ≤ 1.5) in the header; persisted in `localStorage`, auto-downgrades without WebGL2.
- **Fallback contract** — the runtime loader (`src/geometry/anatomyAssets.ts`) resolves each slug's GLB through the manifest; any slug without a committed mesh (and every tract — tubes stay procedural) renders its v1 primitive, so the app never blanks.

**Committed assets & budgets (v2 milestone; current totals — 138 GLBs · 599,204 triangles · 13.82 MiB — are in [Cerebral vasculature & deep content (v8)](#cerebral-vasculature--deep-content-v8--the-arterial-layer-and-the-telencephalon-at-brainstem-granularity))**: at the v2 commit `src/assets/anatomy/` held 84 GLBs + `anatomy-manifest.json` (10 envelopes · 3 CSF spaces · 71 nuclei; **320,296 triangles · 7.40 MiB**), inside the plan §2.7 (Amendment A) budget: ≤ 700k tris, ≤ 8 MiB total, per-part caps (envelope 1.5 MiB · CSF 0.8 MiB · nucleus 60 KiB · nuclei 2.5 MiB). `node scripts/build-anatomy-geometry.mjs --manifest` re-verifies all of it and exits non-zero on any violation.

**Re-baking** (deterministic, Node-only — raw BP3D downloads stay in gitignored `assets-src/`):

```bash
node scripts/build-anatomy-geometry.mjs --all                                  # bake every part at recipe resolutions
node scripts/build-anatomy-geometry.mjs --part ctx-pons-surface --resolution 0.72   # (re)bake one part, finer/coarser
node scripts/build-anatomy-geometry.mjs --manifest                             # rebuild manifest from committed GLBs + budget report
node scripts/build-anatomy-geometry.mjs --stats                                # in-memory stats table, no writes
node scripts/build-anatomy-geometry.mjs --selftest                             # SDF kernel round-trip self-test
```

Note: recipe resolutions target anatomical fidelity; the committed payload above was fitted to the §2.7 budgets by re-baking the largest envelope/CSF parts coarser via `--part <slug> --resolution <au>`. After any bake, run `--manifest` so the manifest and the budget gate reflect the committed GLBs. Pipeline details: [docs/GEOMETRY_PIPELINE.md](docs/GEOMETRY_PIPELINE.md).

## Real imagery (v4) — real MRI, CT, and section photographs as the section view

Spec: [docs/IMAGING_V4_PLAN.md](docs/IMAGING_V4_PLAN.md); licence verdicts, verbatim licence quotes and fetch dates: [docs/IMAGING_SOURCES_V4.md](docs/IMAGING_SOURCES_V4.md); every credit line: [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

Since v4 the section surfaces are **real-imagery-first**: the real slice is the section's *base plate* wherever real data covers the plane, and the simulated structure contours are drawn over it as a translucent overlay. The simulated section remains the honest fallback at planes no modality covers (it is the only thing that exists at *every* plane, and it is what carries the labels).

All three section surfaces move together — the 3D cut, the simulated-section panel (3D tab) and the 2D live-section canvas (Plates tab → *Live section*) — from the same `clip.x/y/z` + `sectionUnderlay` store state. **Only two of them are imagery surfaces**: the panel shows the simulated section and withholds imagery by construction (v9, see below); the Plates tab and the main 3D cut paint the real modality.

- **The panel (3D tab, bottom-right)** — **v9 replaced the GPU stencil-cut picture-in-picture with a 2D simulated-section panel.** It mounts the *same* `SectionCanvas` the Plates tab mounts, so it shows the worker-clipped simulated section — **no clipped 3D geometry, no plane helper and no real imagery, ever** — with orientation labels (L/R/A/P/S/I, patient-left convention), a `y = −24.0 au` plane readout, axis override, hide/restore, and a **resizable window whose size is remembered** (`neuroaxis.sectionPipSize`, clamped to 224–880 × 170–640 px). Hiding it is reversible: whenever it is hidden — including on a fresh visit that loads a persisted `hidden` value — a **“Live section ▸” restore pill** occupies its corner, so the feature is discoverable without clearing `localStorage`; clicking it shows the panel again. The retired GPU path (in-canvas renderer, private camera + render target, stencil parity/cap passes, MSAA watchdog, `?pipdebug` overlay, scissored blit, real-slice backdrop sampler) is deleted, not parked. The panel's own imagery scope holds the store in the images-off state while its canvas is mounted — the user's Plates-tab choice is never rewritten — and a pixel guard shadows `drawImage`/`putImageData` on that canvas' context as a second, structural guarantee. Full contract, limits and evidence: [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel) and `npm run verify:pip-contract`.
- **2D live-section canvas** (Plates tab → *Live section*) — a Web Worker clips every visible structure's triangles by the current plane, chains closed contours and fills them even-odd with taxonomy colors (transverse: anterior up, patient-left on image-right — matching the authored SVG plates). Click/drag inside sets the other two sliders (crosshair placement); a chip snaps to the nearest authored plate; selected/hovered structures highlight with labels. The toolbar carries its own **plane slider strip** — one labelled scrubber per axis (Sagittal · x, Coronal · z, Transverse · y) over the same canonical ranges as the 3D clipping dock, a `−42.0 au` readout per row, the active section axis emphasised, and a “Snap to levels” checkbox sharing the dock's single `snapToPlate` setting — so the plane can be scrubbed continuously without leaving the Plates tab; it writes the same `clip` store fields the canvas already reads, so slider and crosshair stay in agreement in both directions. Perf-guarded: worker-only contour math, 15 Hz + 0.25 au plane quantization while dragging, painting skipped while the tab is hidden, canvas dpr ≤ 1.5, PiP skips entirely when hidden.

### The modality toolbar (Plates tab → Live section)

| Control | What it does |
| --- | --- |
| **Auto (real-first)** — default | Picks the best real modality *that actually covers this plane*: anchored photograph (±1.5 au) → CT → MRI → none. The real slice becomes the base plate; contours are overlaid at 65 % with crisp outlines; selection/hover highlighting is unaffected. |
| **MRI** | The continuous T1 grid only, with uint8 window low/high sliders. |
| **CT** | The continuous CT grid only, with **brain / bone** window presets (Hounsfield windows from `ct-manifest.json`). |
| **Photo** | Embedded photographs only (plane-anchored plates + the level-mapped micrographs) — never silently switches modality. |
| **Simulated only** | No real imagery at all — the v3 schematic section, explicitly. |
| **Opacity** | Alpha of the real image (100 % by default: it is the base plate, not an underlay). |
| **Sources / credit** | "Open source ↗" chips (active imagery first, then the UBC / MSU / Harvard Whole Brain Atlas / BrainMaps references) and the **active modality's verbatim credit line**, always visible; the canvas prints the same line bottom-left over the image it actually drew. |

A modality button is disabled — with the reason in its tooltip, e.g. *"no embeddable CT grid in this build — re-bake with: node scripts/build-ct-grid.mjs"* — only when the build cannot serve that modality at all. An empty plane *inside* a covered modality stays selectable and is explained by the canvas hint line ("no photograph is anchored at this plane — showing the simulated section"). Harvard and BrainMaps are link-out only and never embedded.

### Modality availability, licences and credits

| Modality | Coverage | Source | Licence | Verbatim credit |
| --- | --- | --- | --- | --- |
| **Stain / photograph** (76 plates) | per-plane: **22 NLM Visible Human axial cryosections** (y = +34.0 … −52.2 au, densest through medulla/pons/midbrain) + 9 UBC horizontal plates (y = +10 … −44) + 15 UBC coronal plates (z = +26 … −54) + 3 Commons CT plates, all ±1.5 au; plus the 17 UBC level-mapped micrographs on transverse planes (every authored level has one) | **NLM Visible Human Project** cryosections (Brigham and Women's Hospital / Harvard Medical School head); UBC `neuroanatomy.ca` micrograph / horizontal / coronal viewers; MSU Human Brain Atlas coronal cell stains | NLM Terms and Conditions (2019) — redistribution permitted with acknowledgement (cryosections + CT); **CC BY-NC-SA 4.0** (UBC — non-commercial educational use, recorded in ATTRIBUTION); site permission with mandatory credit (brainmuseum.org); CC0 (Commons CT slices) | `Courtesy of the U.S. National Library of Medicine` · `© University of British Columbia, CC BY-NC-SA 4.0` · `University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health` · `CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)` |
| **MRI** (continuous, all 3 axes) | every plane position on all three axes | OpenNeuro **ds007313** (3 T MPRAGE, head + cervical spine), resampled onto the canonical grid | **CC0** (no attribution required; credited for provenance) | `ds007313 doi:10.18112/openneuro.ds007313.v1.0.0, OpenNeuro CC0` |
| **CT** (continuous, all 3 axes) | every plane position on all three axes | **NLM Visible Human Project** — "Additional Head Images" head CT (Brigham and Women's Hospital / Harvard Medical School head, 463 axial DICOM slices, 1.5 mm) | NLM Terms and Conditions (2019) — redistribution permitted with acknowledgement; committed grid is a **frozen 2026-09-10 snapshot**, not a live NLM mirror | `Courtesy of the U.S. National Library of Medicine` |

Both grids are `uint8` volumes on the **same canonical box and spacing** (45 × 81 × 67, origin x −27 / y −55 / z −56 au), row-major x-fastest, ≈1.23 × 1.25 × 1.24 au per voxel, with a manifest recording dims/origin/spacing, the registration block (constants + measured residuals) and the source/licence/credit. CT is baked in Hounsfield units (`storedHU = stored16 · 1 − 1200`) with the `brain (−20…100 HU)` and `bone (200…1600 HU)` presets.

### Visible Human cryosections (v4b)

**22 full-colour axial photographs of the frozen Visible Human head** are the real base plate at their own transverse planes — `src/assets/imaging/stains/vhp-0017.jpg` … `vhp-0721.jpg`. They are the *Additional Head Images* cryosection series from the NLM Visible Human Project (Brigham and Women's Hospital / Harvard Medical School head), photographed as the block was milled away, so each plate is a photograph of a **physical cut face** rather than a reconstruction.

- **What they are:** 528 × 764 px, **0.294 mm/px** (155.2 × 224.6 mm field of view), **0.147 mm slice spacing**, indices 0001–1477. The 22 committed plates are indices 17 … 721, i.e. the superior-to-mid region of the series, curated for extra density through medulla / pons / midbrain.
- **Content verbatim:** re-encoded JPEG q80 at the native size — **no crop, no rotation, no resize, no annotation, no colour change**. Per-plate source URL in the manifest (`…/cryo/jpeg/halfSize/axial/NNNN.02.jpg.gz`).
- **Acknowledgement, verbatim:** `Courtesy of the U.S. National Library of Medicine` — rendered in-UI (canvas credit bottom-left, PiP attribution, Plates toolbar) together with each plate's own source link, exactly as the NLM Terms and Conditions require.
- **Licence:** NLM Terms and Conditions (2019), redistribution permitted with acknowledgement. The committed set is a **frozen 2026-09-10 snapshot — not a live NLM mirror**; it is never re-synced at runtime, which is how this project meets NLM's "maintain the most current version **or** say so" condition (full quote in [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)).
- **How they were registered.** The plate *order* and relative spacing come from the documented 0.147 mm slice spacing; the *absolute* placement comes from `y = +36.0 − (index − 1) × 0.1225 au`, where **+36.0 au is the same donor's head apex, measured** from the full-field head CT DICOM series through the committed CT grid's own canonical registration (not assumed from the atlas box). A programmatic fit against that reference was attempted and **rejected**: it reached r = 0.92 and refuted the competing `y₁ ≈ −8 au` mapping (r = 0.29), but its landmark residuals missed by 20–210 au against a ±5 au tolerance, so the plan's documented fallback is what ships. Lateral placement is per plate: `fit.dx` is the plate's own measured left–right symmetry axis (mean mirror correlation r = 0.51), and `fit.scale = 4.0816 px/au` (the reciprocal-correct form — the plate is 0.245 *au per pixel*).
- **Honest limits.** Every plate carries **±10 au (≈ ±12 mm) of absolute plane uncertainty**, disclosed *per plate* in the manifest's `planeValueNote` and shown in the Plates UI. The plate **order** and **relative spacing** are exact; the absolute plane is a documented placement, not a landmark-verified registration. The plates are **per-plane anchors, not a continuous photographic volume** — move the slider off an anchor and `Auto` falls through to CT, then MRI, and says so. The **row direction (anterior up vs down) rests on the source's documented photographic practice plus this module's convention, and `mirrorX: false` is documented-but-not-proven** (the two asymmetric statistics computed for it scored |r| = 0.16 and 0.21 and disagreed in sign); both are called out as open questions in the registration record. Full method, search grid, residuals and orientation evidence: `assets-src/imaging3/VHP_ANCHORS.md` (gitignored working artefact).
- **What `v4c-qa` independently re-measured** (`node scripts/verify-imaging-v4b.mjs` + the raw-plate probes recorded in the registration record): the **lateral (column) axis is measured** — the plates' mirror-symmetry axis is vertical at **mean |r| = 0.59** on the 22 committed plates (160 × fewer under a horizontal mirror, 0.12), which is what makes the per-plate `dx` a measurement rather than an assumption; the committed plates are **physically continuous** — plate *i* and plate *i+1* correlate at **r = 0.9935** as stored against 0.176 row-flipped and 0.10 at 200 indices apart, i.e. the sequence really is one stacked specimen sampled at 0.147 mm and the plate *order* is exact. Neither probe settles the **absolute** plane or the **row direction**, for the reason above: they are **unverifiable without a visual pass**, and no vision model is reachable from this environment (`read_image`: *"model 'deepseek-flash' does not declare image input"*; `modlens_read_image`: *"claude-cli provider failed … vision reachable through codex, which modlens is not yet allowed to reuse"*). A head CT of the same donor **is** on disk, but it is a brain-box resample whose field of view is smaller than the plate frame, so it cannot anchor the absolute plane either — a cross-check against the *full-field* head-and-neck plate framing did not converge and is recorded as inconclusive rather than acted on.

### Honest limits (please read before quoting a plane position)

- **Photographs are per-plane, not continuous.** Each plate is anchored to one canonical plane value with a ±1.5 au mount tolerance, so moving the slider between two photographs falls back to CT/MRI (Auto) or to the simulated section, and the canvas says which. Photo *sequence* coverage is deliberately denser through the brainstem than through the hemispheres.
- **Registration is approximate and disclosed.** The photographs are photographs of physical slabs — there is no voxel registration. Their `planeValue` comes from the sources' own labels (UBC viewer landmark labels, the Commons 4 mm slice indices) plus per-image tissue measurements, and their `fit {scale, dx, dy, mirrorX}` is a first-pass affine; absolute plane error is on the order of ±1 step (≈5–6 au) for the photographs. **The 22 Visible Human cryosections are the loosest of the set: their absolute plane carries ±10 au (≈ ±12 mm) of uncertainty** — measured, not assumed; see *Visible Human cryosections* above and `assets-src/imaging3/VHP_ANCHORS.md`. The MRI and CT volumes are registered with measured, re-runnable corrections (midline residual ≤ 1.25 au; CT pons-face residual 2.04 au mean against the stylized atlas envelope) and both manifests report their residuals verbatim.
- **MRI, CT and the photographs are different individuals.** The OpenNeuro subject, the NLM Visible Human donor and the UBC/MSU specimens are placed in the *same canonical atlas frame*; the atlas geometry is the common frame of reference, and each modality keeps its own documented affine rather than inheriting another subject's fit.
- **This is a study aid.** NeuroAxis is not a medical device, and none of this imagery is for diagnosis (see *Educational disclaimer* below).

### Committed payload & budgets

> **v7 update.** These figures are the **v4/v6 measurements** and are kept verbatim as the
> record of that bake. For the current, v7 (AMENDMENT B) numbers see
> [Telencephalon (v7)](#telencephalon-v7--the-rest-of-the-brain) below: the canonical box grew to
> x ±48 / y −55…85 / z −75…+55, so **both uint8 grids are now `[81, 113, 107]` = 979,371 B each**
> and the imaging payload is **8.71 MiB across 80 files** against the **10 MiB** cap that
> `docs/TELENCEPHALON_PLAN.md` §2/§4 sets (the pre-v7 8 MiB limit is superseded; the ≤ 4 MiB
> v4-added sub-cap is unchanged and still met).

`src/assets/imaging/` holds **7.30 MiB across 80 files** (measured on disk) — **76 committed stain photographs** (6.82 MiB: 22 `vhp-*` cryosections 1.18 MiB, 9 `ubc-h*` + 15 `ubc-c*` 2.73 MiB, 3 `wikict-*` 0.14 MiB, 17 `ubc-m*` + 10 `bmm-*` v3 micrographs 2.77 MiB), `mri-t1.bin` (238 KiB) + `mri-manifest.json`, `ct.bin` (238 KiB) + `ct-manifest.json` — inside the plan §4 budgets: **≤ 8 MiB total imaging payload** (measured 7.30 MiB, 0.70 MiB of headroom) and **≤ 4 MiB of assets added by v4** (measured 3.11 MiB: `ct.bin` + 24 UBC plates + 3 Commons CT plates; the v4b cryosections are 1.18 MiB against their own ≤ 1.75 MB sub-cap and are not counted into that v4 remainder). Raw downloads stay in the gitignored `assets-src/`; every embedded plate is a content-verbatim copy (no crops, no retouching) with only technical modifications (integer 2× downsampling, alpha flatten onto white, lossless filtered-PNG re-encode for the v3/v4 photographs; JPEG q80 re-encode at native size for the v4b cryosections; uint8 resampling for the grids) recorded per file in `assets-src/imaging2/processed-photos.json` and `assets-src/imaging3/analysis/local-files.json`.

**Re-baking** (deterministic, Node-only, no clock/RNG — the committed artifacts are byte-identical across runs; raw inputs stay in gitignored `assets-src/`):

```bash
node scripts/build-mri-grid.mjs          # → src/assets/imaging/mri-t1.bin + mri-manifest.json + QA previews (exit ≠ 0 on a registration-QA violation)
node scripts/build-mri-grid.mjs --probe  # inspect the source NIfTI header without writing
node scripts/build-ct-grid.mjs           # → src/assets/imaging/ct.bin + ct-manifest.json + QA previews (exit ≠ 0 on QA violation)
node scripts/build-ct-grid.mjs --tune    # re-run the CT↔MRI registration search and print the candidate table
node scripts/build-ct-grid.mjs --probe   # inspect the source DICOM series header without writing
```

A missing or failed CT bake is not fatal: `ct-manifest.json` carries `status: 'unavailable'` and the CT layer registers disabled — the toolbar then disables the CT button with that reason, the PiP hint says the same, and Auto simply falls through to MRI/photographs.

### Credits and link-outs (v3 behaviour, unchanged)

The live toolbar lists "open source ↗" chips for the section's level: the mapped image's own page plus the UBC, MSU, Harvard Whole Brain Atlas and BrainMaps.org references — the latter two link-out only. License verdicts and fetch evidence: [docs/IMAGING_SOURCES.md](docs/IMAGING_SOURCES.md) (v3 sources) and [docs/IMAGING_SOURCES_V4.md](docs/IMAGING_SOURCES_V4.md) (v4 sources); full provenance and verbatim credit lines: [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

## Telencephalon (v7) — the rest of the brain

v7 layers the **telencephalon** (cerebral hemispheres, basal ganglia, limbic structures, lateral
ventricles and telencephalic white matter) onto the brainstem + diencephalon atlas **without
giving up the brainstem as the subject of the app**. Spec: [`docs/TELENCEPHALON_PLAN.md`](docs/TELENCEPHALON_PLAN.md) §2 AMENDMENT B (space),
§3 (data model), §4 (geometry + budgets), §5 (rendering/UX), §6 (plates), §9 (acceptance).

### What was added

| | |
| --- | --- |
| **Canonical space (AMENDMENT B)** | x ±48 (unchanged) · **y −55…+85** · **z −75…+55**. `CLIP_BOUNDS` in `src/components/viewer3d/clipPlanes.ts` is still the single declaration — the clip sliders, the section plane geometry, the PiP camera, the plate↔clip sync and the level ruler all derive from it. **Nothing below y = +45 moved**: the 13 original level anchors keep their exact y values, the default transverse plane is still the olivary anchor (y = −34) and x/z stay 0. |
| **Levels** | 13 pre-existing anchors + **4 new telencephalic ones**: `lvl-tel-thalamostriate` **+48**, `lvl-tel-basal-ganglia` **+58**, `lvl-tel-centrum-semiovale` **+68**, `lvl-tel-convexity` **+78** (17 total). They drive the clip plane, snap-to-plate, the level ruler and the live section. |
| **Anatomy meshes** | **22 new committed GLBs** in `src/assets/anatomy/` (106 parts total, 570,096 rendered triangles of 800,000): 2 hemisphere shells (`ctx-hemisphere-l/-r`), the cerebral white-matter cores, corpus callosum, lateral ventricles, caudate, putamen, globus pallidus, hippocampus, amygdala, fornix + commissure, choroid plexus. |
| **Registry** | 46 `telencephalon` entries (183 total) under five subdivisions: **Cerebral cortex · Basal ganglia · Limbic system · Telencephalic white matter · Lateral ventricles**. 38 new authored structure records in `src/data/structures/telencephalon-*.json`. |
| **Plates** | 3 new authored SVGs (15 total): `plate-tel-axial-58` (19 labelled regions, synced to `lvl-tel-basal-ganglia`), `plate-tel-sagittal-hemisphere`, `plate-tel-coronal-fornix`. |
| **Tracts** | 4 authored pathways with waypoints — optic radiation, cingulum, uncinate fasciculus, superior longitudinal fasciculus. |

### How it renders — the cortex ghost, and why the brainstem stays the subject

Plan §5 makes this the usability core, so the defaults are the feature:

- **The hemispheres are a translucent ghost.** `createGhostShellMaterial`
  (`src/geometry/materials.ts`) renders the two shells at **opacity 0.14** (plan §5 window
  0.12–0.18) with **`depthWrite: false`**, **front-face only** (a closed watertight solid drawn
  twice would stack two translucent layers into a muddy interior and double the fill rate on the
  largest meshes in the app) and `renderOrder −2`. The brainstem, diencephalon and cerebellum read
  straight through them.
- **View presets (plan §5), with Brainstem focus as the DEFAULT** — a fresh visitor boots
  brainstem-first; the choice persists like the quality toggle (`localStorage
  neuroaxis.viewPreset`), so a returning visitor keeps their own framing:

  | Preset | Behaviour |
  | --- | --- |
  | **Brainstem focus** *(default)* | The cortex records are hidden, so the ghost drops to a **faint outline** (`GHOST_OUTLINE_OPACITY` 0.05) and the brainstem/diencephalon/cerebellum carry the view. |
  | **Deep structures** | Ghost cortex + the basal ganglia and limbic structures lifted by an emissive emphasis (`emphasised`, 0.18 — below the hover value, so emphasis can never be mistaken for an interaction). |
  | **Whole brain** | Every structure at its own material. |
  | **Cortex only** | Every non-telencephalic record hidden: the hemispheres alone. |
  | All · Nuclei · Tracts · Clinical motor | The v1–v6 presets, unchanged. |

  This needed one additive field pair on the layer model (`AtlasLayers.hidden` / `.emphasis`,
  structure-level sets), because "hide the cortex" and "emphasise the basal ganglia" span region
  and kind boundaries that `regions`/`kinds` cannot express. Empty sets mean "behave exactly as
  v6 did", which is why the Legend toggles and the old presets are untouched.
- **Every new structure is selectable from 3D, the tree, search and the plates.** Manifest slugs
  and registry ids are reconciled in one table (`ANATOMY_RECORD_LINKS` in
  `src/geometry/anatomyAssets.ts`) that both the 3D pass and the live-section registry read — many
  records share one mesh (the caudate's head/body/tail are one caudate; the ventricular
  horns/atrium are one ventricular cast; the callosal parts are one corpus callosum), which is the
  registry's own pairing rule at hemisphere scale.
- **No placeholder geometry at the origin.** Records that own no mesh and have no authored
  placement are listed explicitly (`TEL_CONTENT_ONLY_IDS`) and excluded from the 3D body pass while
  staying fully reachable from the tree, search and plates. Before v7, 32 of the 38 telencephalon
  records would have drawn a unit sphere at `[0, 0, 0]`.
- **Explode** separates the hemisphere shells outward on ±x — **16 au per shell at 100 %**
  (`HEMISPHERE_EXPLODE_FACTOR` in `src/components/viewer3d/SceneLayers.tsx`) against the nuclei's
  **6 au** (`NucleusMesh`: `explodeDirection · explode · 6`). The larger factor is deliberate: a
  ~110 au-wide envelope has to clear its twin rather than fan off an axis, and at 100 % the 32 au
  gap exposes the corpus callosum, fornix and ventricles. The nucleus rule is unchanged, and every
  other kind stays at its canonical position.
- **CT coverage is stated, not hidden.** The Visible Human CT series is a **head-only scan whose
  own apex lands at canonical y ≈ 36.25 au** (measured; recorded in `ct-manifest.json` at
  `intensity.sourceCoverage.superiorMostDataYAu` and `registration.residuals.coverageNote`). Above
  that plane the CT grid has stations but no data, so the CT layer reports **`unavailable`**
  rather than a stale slice, and the live-section toolbar says plainly that the series ends there
  and that **MRI is the modality of record**. The MRI grid covers the whole AMENDMENT B box
  (`coverage.fractionInsideFov = 1`, 979,371/979,371 stations), so it paints at +48/+58/+68/+78.
  The number in the UI is read from the manifest — there is no second, drifting constant.

### Data source

The telencephalon geometry is **BodyParts3D 4.0** (the archive this project already owns,
`assets-src/bp3d/isa_BP3D_4.0_obj_99.zip`, 2,234 meshes) — **CC BY 4.0**, the same source and
licence as the brainstem, diencephalon and cerebellum meshes. **No new data source and no new
licence work**: the archive already contained the whole telencephalon.

Attribution, verbatim (also in [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)): *BodyParts3D, © The
Database Center for Life Science, licensed under CC BY 4.0.* The cortical ribbon is derived from
this data — see the honest limits below.

### How to re-bake (deterministic, Node-only, no clock/RNG)

```bash
node scripts/lib/register.mjs            # 1. REGISTER  BP3D meshes → canonical space (assets-src/bp3d/canonical/tel-*.obj)
node scripts/build-anatomy-geometry.mjs --all          # 2. GEOMETRY  bake every recipe → src/assets/anatomy/*.glb + manifest
node scripts/build-anatomy-geometry.mjs --manifest     #    gate: rebuild the manifest from disk + enforce the budgets (exit 1 = over)
node scripts/build-anatomy-geometry.mjs --stats --tel-check   #    per-part tris/bytes + ribbon watertightness and thickness
node scripts/build-mri-grid.mjs          # 3. GRIDS     resample the CC0 OpenNeuro T1w over the AMENDMENT B box
node scripts/build-ct-grid.mjs           #              resample the NLM Visible Human CT over the same box
```

Bake a single part with `--part <slug>` (and `--resolution <au>` to override its voxel step);
`node scripts/build-anatomy-geometry.mjs --list` prints every slug. The SDF kernel, the recipe
contract and the budget report are documented in [docs/GEOMETRY_PIPELINE.md](docs/GEOMETRY_PIPELINE.md).

`node scripts/build-anatomy-geometry.mjs --all` is the *integrator's* command: it is a hard
failure if any recipe module fails to load, so a broken recipe blocks re-baking everything else —
prefer `--part` while iterating.

### Measured budgets (this commit)

| Budget | Cap | Measured | Verdict |
| --- | --- | --- | --- |
| Rendered triangles (scene) | ≤ 800,000 | **570,096** | PASS |
| Committed anatomy GLB payload | ≤ 14 MiB | **13,755,548 B = 13.12 MiB** | PASS |
| Pooled nucleus payload | ≤ 3 MiB | **2.81 MiB** | PASS |
| Per-part caps | context ≤ 4 MiB · csf ≤ 1.5 MiB · nucleus ≤ 80 KiB | largest nucleus `ctx-caudate-r` 76 KiB | PASS |
| Hemisphere shell tri caps (plan §4) | ≤ 90,000 each | `ctx-hemisphere-l` 78,512 · `ctx-hemisphere-r` 80,080 | PASS |
| Imaging payload | ≤ 10 MiB | **9,132,531 B = 8.71 MiB / 80 files** | PASS |

`node scripts/build-anatomy-geometry.mjs --manifest` is the authority for the first four rows and
exits 1 on any breach; `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` enforce the last row.

### Honest limits (v7)

- **The cortical ribbon is derived, not scanned.** BodyParts3D carries **no explicit cortical
  gray-matter surface** — the archive's only cortical concept resolves to the hippocampus. The
  ribbon is therefore the standard construction: take the registered cerebral white-matter surface
  and band it outward by the cortical thickness (**2.9 au ≈ 3.5 mm**, plan §1's 3–4 mm window),
  then carve the interhemispheric fissure, the Sylvian cleft and the ventricular space. It is a
  *modelled* pial surface, not a segmentation of a real cortex, and it inherits the white-matter
  surface's gyral relief rather than reproducing true sulcal detail.
- **Four tracts have no meshes.** The optic radiation, cingulum, uncinate fasciculus and superior
  longitudinal fasciculus are **authored as waypoint paths** (like the v1–v6 tracts) because the
  source archive contains no fibre geometry. They are schematic centre-lines, not tractography.
- **CT does not cover the hemispheres.** The Visible Human series ends at **y ≈ 36.25 au**; see
  *How it renders* above. The CT affine is deliberately **byte-identical to v4** (no re-fit), so
  the 13 existing level anchors and their CT samples are unchanged — aligning the CT apex with the
  MRI's would need a ≈ +45 au translation and would move every existing level, which is a separate
  re-registration and explicitly out of scope.
- **Registration is approximate and disclosed.** Telencephalon meshes inherit the documented
  registration residuals of the brainstem bake (midline ≤ 1.25 au) and the derived ribbon adds the
  thickness model's own error on top.
- **Some records are content-only.** 20 telencephalon records are deliberately not drawn as 3D
  bodies (see `TEL_CONTENT_ONLY_IDS`) — either because another record already draws their mesh, or
  because they are sub-regions of one mesh. They remain fully selectable from the tree, search and
  plates, and the live section still paints their region.
- **One budget cap moved.** The **pooled nucleus payload cap 2.5 MiB → 3 MiB** is the single
  number v7 raises, and it is documented with its measurements in
  `scripts/build-anatomy-geometry.mjs` (`BUDGETS`). Resolution was cut first, as the plan
  requires. The two run-level constraints — **800,000 rendered triangles** and **14 MiB committed
  anatomy payload** — are unchanged and pass.

## v7 closure — what the QA confirmed, and how it was verified

The telencephalon landed in `d1cefef → 2681d20 → 8ab1b47 → b5ab6f3`, but the run's QA never executed
and an independent 56-check browser audit left **10 failures**. This section records the closure:
what was wrong, what was fixed, and — importantly — **which tier of evidence proves each item**.

### The five real defects, and their fixes

| # | Symptom the audit measured | Root cause (established in code) | Fix | Gate that fails if reverted |
| --- | --- | --- | --- | --- |
| 1 | `no "lost" recovery overlay after the context was lost` (`isContextLost() === true`, no `[data-context-lost]`) | The PostFX `alpha` throw (#2) was re-thrown by react-three-fiber's internal boundary into the DOM tree, so the `3D viewer` panel boundary unmounted **all of `Viewer3D`** — taking the overlay with it | The overlay is now rendered **outside** the `<Canvas>` subtree, and every canvas child sits in its own `CanvasSceneBoundary` (which renders `null`, the only fallback the THREE reconciler accepts) | `audit-checks.test.mjs` — *"the overlay is rendered OUTSIDE the R3F `<Canvas>` subtree"* / *"canvas children are wrapped in CanvasSceneBoundary"* |
| 2 | `TypeError: Cannot read properties of null (reading 'alpha')` at `PostFX.tsx` | `postprocessing@6.36.7` reads `renderer.getContext().getContextAttributes().alpha` in `addPass` (`build/index.js:1002`) and `setRenderer` (`:864`); per the WebGL spec that call returns **`null`** while the context is lost, and React re-renders the R3F tree on the loss | `PostFX` returns `null` while lost (`contextLost` prop), so there is no pass to re-add; it remounts on restore against the new context | `audit-checks.test.mjs` — *"PostFX returns null while the context is lost"* / *"passes the live loss state into PostFX"* |
| 3 | `CT coverage statement missing at y = +58` | **Check defect, not a product defect.** The statement already existed and was already wired; the check never proved the live section was pinned to the **y** axis before asserting | The check now pins the axis, proves `sectionAxis === 'y'`, and reports `{axis, planeValue, kind, notePresent}` before it asserts — and asserts the **honest** state above the measured limit instead of demanding a credit that cannot exist | `audit-checks.test.mjs` group (3) — driven by the real `ctCoverageStatement()` and the shipped `ct-manifest.json` |
| 4 | `the default preset is not Brainstem focus` + `2 brainstem-family tree row(s) are dimmed` | **Check defect + a latent code gap.** The audit's profile persisted `neuroaxis.viewPreset`, so a returning preference decided the boot check. Separately, `telSubdivisionIds` filtered on `subdivision` **alone**, so a diencephalon record could be swept into a cortex preset's `hidden` set | The audit uses a **fresh profile per run** plus an explicit `localStorage.clear()` prologue, and asserts the boot state in its own block before any check clicks a preset. `telSubdivisionIds` now filters on `region === 'telencephalon'` **and** subdivision. The load-time guard was then widened by the closure: **every** preset is now swept at
module load — a subdivision-derived preset may only hide telencephalon records, `cortex-only` may hide
**no** telencephalon record (that is not its purpose), and every hidden/emphasised id must exist in the
taxonomy. The mutation proof shows both directions throwing (`ctx-thalamus-envelope` on the default,
`ctx-cerebral-cortex` on `cortex-only`) | `audit-checks.test.mjs` group (4) + `closure-bite.mjs`
mutations (4a)/(4b) — the region guard and the "no brainstem row is layer-off" assertion |
| 5 | `the forced throw was not contained by the "Taxonomy tree" boundary` + `?panelfail armed 0 boundaries` | **Two real defects.** (a) The probe marker was a *sibling* of the component that throws, so React discarded it in the render pass that threw — "armed" was unobservable. (b) `isDevBuild()` read `import.meta.env` through a **type-cast alias**, which esbuild erases; Vite's `vite:import-analysis` walks the transformed module for a literal `import.meta.<prop>` access, so no env object was injected and the hook was dead in the dev server | The marker moved **onto the failure card** (`panelErrorCard`), so `probes === 1` proves arming *and* containment as one fact; `isDevBuild()` reads the literal token. The latch is one-shot, consumed in `componentDidCatch`, so **Retry recovers** instead of re-throwing | `audit-checks.test.mjs` group (5) — drives the real boundary through the real throw and asserts `card=Taxonomy tree · probes=1 · retry=true`, then that Retry restores the children |

Defects 1 and 2 share one cause: the effects stack must not crash while the context is lost, and a
canvas throw must not be able to unmount the recovery UI. The two fixes are independent, so either
alone leaves the other gap open.

### Two audit artifacts (checks, not product bugs)

Both were checks demanding something the data cannot provide; both are now **coverage-aware** and
assert the honest state instead:

- **CT at telencephalon planes.** The Visible Human CT series is a head-only scan whose data ends at
  canonical **y ≈ 36.25 au** (`ct-manifest.json` → `intensity.sourceCoverage.superiorMostDataYAu`;
  64.3 % of stations inside the source FOV). Above it the CT grid still spans the box but *every
  station is background*. The check now requires **no CT credit** there and requires the statement
  naming the limit and MRI — never "painted nothing" as a failure.
- **Photo at y = +58.** No photograph is anchored above the highest mapped level, so the honest
  assertion is the canvas' no-anchor hint, not a credit.

Inside its coverage the CT check is **unchanged and still strict**: it demands the NLM credit and
real painted samples. The sweep gate fails if CT paints nothing on a covered plane.

### The audit's own DOM queries were hardened too (so the browser re-run measures the product)

Three of the ten failures were decided by a **query**, not by the product, and a query that misfires is
indistinguishable from a defect in the report. The browser lane was therefore made deterministic about
what it reads, not only about what it stores:

- **Tree navigation is name-exact and idempotent.** With the telencephalon in the tree, a bare
  `textContent.includes('Thalamus')` also matches *Epithalamus*, and an unconditional click on an
  already-expanded subdivision row **collapses** the subtree the next check needs. `audit.mjs` now
  strips the `▸`/`▾` marker and the count, compares the **name** exactly, and only clicks when the row
  is actually closed (`aria-expanded`/marker read first).
- **The modality sweep runs inside the live section.** The plane/kind readout is read from the
  live-section toolbar's own groups (`.section-toolbar-group[aria-label="Imagery modality"]`), which do
  not exist on the 3D tab — that is why every modality in the orchestrator's run read as
  `pressed: null`. The sweep now enters the live section first and reports which context it measured.
- **A disabled modality is an honest state, not a failure.** At planes where a modality genuinely
  cannot paint (CT above `y ≈ 36.25 au`, Photo with no anchored plate), the check now distinguishes
  *disabled with its reason in `title`* (correct behaviour) from *enabled but the click did not take*
  (a real defect). The pre-fix check reported both as the same failure.

The two telencephalon-specific audit gaps are closed as **checks**: the tree check scopes itself to the
region → subdivision → structure rows that actually expand the subtree, and the predicate layer
(`scripts/verify/checks.mjs`) is shared with the Node lane, so the browser lane cannot drift from the
falsifiable mirror.

### Measured budgets (v7 closure, re-derived from the committed artifacts)

| Budget | Cap | Measured | Verdict |
| --- | --- | --- | --- |
| Rendered triangles (scene) | ≤ 800,000 | **570,096** (106 parts) | PASS |
| Committed anatomy GLB payload | ≤ 14 MiB | **13,755,548 B = 13.12 MiB** (106 files, 0 missing) | PASS |
| Imaging payload | ≤ 10 MiB | **9,132,531 B = 8.71 MiB / 80 files** | PASS |

`node scripts/build-anatomy-geometry.mjs --manifest` is the authority for the anatomy rows and
`node scripts/verify-imaging-v4.mjs` for the imaging row. Two browser-free gates re-derive the same
numbers **without any external precondition** (no `assets-src/`, no re-bake, no server):
`node scripts/verify/budget-report.mjs` reads the committed manifest and `statSync`es the committed
asset tree — printing the payload reading *and* the stricter whole-directory reading — and
`audit-checks.test.mjs` cross-checks all three inside its own run. Both fail on any breach.

### Space integrity — nothing below y = +45 moved

The run's hard constraint is explicitly verified, not assumed:

- `src/assets/anatomy/anatomy-manifest.json` is **byte-identical** to the pre-closure commit — every
  one of the 106 parts keeps its `triCount`, `bbox` and `centroid`, so no baked geometry moved.
- `src/data/levels.json` holds the **same 17 anchors**: the 13 pre-v7 ones
  (−50, −46, −42, −34, −24, −18, −8, 2, 8, 14, 19, 28, 36) are unchanged, and the four v7 additions
  (+48/+58/+68/+78) are purely additive with the set still strictly increasing.
- `CLIP_BOUNDS` extends only upward: `x −48..48`, `y −55..+85`, `z −75..+55`. The lower bounds are
  untouched.

`audit-checks.test.mjs` asserts the anchor arithmetic on every run.

### Evidence tiers — read this before quoting a pass

The browser lane (`verify:audit`, `verify:browser`, `verify:acceptance`) drives **headless Chrome
over the DevTools Protocol**. In a restricted sandbox Chrome cannot start at all, and all three
lanes exit **`4` — "environment unusable, no check was run"**:

```
crashpad_client_win.cc:421  OpenProcess: Access is denied. (0x5)
platform_channel.cc:108     Check failed: . : Access is denied. (0x5)
```

Chrome dies **inside `mojo::PlatformChannel`** — it cannot create the IPC channel it uses for every
child process — so this is the sandbox boundary, not a missing browser: both `chrome.exe`
(`C:\Program Files\Google\Chrome\Application\`) and `msedge.exe` exist on this machine, and the audit's
dev server reaches `http://localhost:5173` in ~0.5 s in the same run that then fails to start Chrome.
A Node-spawned Chrome dies immediately with the Windows crash status **4294930433 (0xFFFF7001)** and its
DevTools endpoint (`http://127.0.0.1:<port>/json/version`) never answers.

This was measured against **four** launch variants — Chrome *and* Edge, `--headless=new` *and*
legacy headless, all with `--no-sandbox --disable-crash-reporter --disable-breakpad` — every one
exiting before its DevTools endpoint answered. **`exit 4` is neither a pass nor a product failure**;
the harness's own exit codes exist precisely so that "a check that cannot run" can never be read as
"the product is broken".

So every audit verdict is decided by the **same pure predicates** in `scripts/verify/checks.mjs`.
The browser lane feeds them real DOM readings; the Node lane feeds them the **shipped manifests and
the shipped sources**:

| Tier | Gate | Runs without a browser |
| --- | --- | --- |
| **1 — binding** | `npm run validate`, `check`, `build`, `verify:pipeline`, `verify:plane`, **`verify:plane-helper-extent`** (v10), `verify:somatotopy`, `verify:cortical-lobes`, `verify:pip-contract`, **`verify:division-toggles`** (v10), **`verify:area-toggles`** (v11), **`verify:view-filter-consistency`** (v11), `node scripts/verify/boundary-contract.mjs`, `node scripts/verify/a11y-contract.mjs`, `node scripts/verify/budget-report.mjs`, `node scripts/build-anatomy-geometry.mjs --manifest`, `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | yes — these must exit 0 |
| **1b — binding; the v9 close-out note that these were RED does not reproduce** | `npm run verify:audit-checks` (92 passed · 0 failed) and `node scripts/verify/closure-bite.mjs` (7/7 mutations caught) | yes — both re-measured green by the v10 integrator sweep against the **unmodified** file at `f5d3ed2` ([v10 verification](#verification-v10-close-out-non-browser)); the dimmed-row check carries the documented vasculature exemption **plus the assertion that pins it** (*"the 14 vascular rows are off at default framing through the REGION layer only…"*), so the v9 statement is superseded rather than papered over |
| **2 — recorded, not asserted** | `npm run verify:anatomy`, `npm run verify:imaging-fit` (both **environment-blocked in the agent sandbox**: `spawnSync … EPERM` before any verdict), `npm run verify:audit`, `verify:browser`, `verify:acceptance` | **no** — reported as command + exit code + reason |

`audit-checks.test.mjs` is a **mirror, not a browser test**: it proves the decision logic, the DOM
contract in the shipped code and the shipped data/manifest facts — 91 assertions across 9 groups,
including the v1–v7 regression surfaces and the browser-free half of the telencephalon sanity
checklist. It does **not** prove that pixels appeared. The runtime half of the audit (scene luminance,
live-section paint counts, pointer and focus interaction, translucency of the ghost shell, and the
real `WEBGL_lose_context` cycle) remains **unproven in a sandbox** and must be re-run with
`npm run verify:audit` on a machine where Chrome can launch.

### The telencephalon sanity checklist — what is proven here, per item

The run's sanity checklist is a **browser** checklist. No browser can start here, so each item below is
answered from the shipped data, sources and manifests (the strongest browser-free form of the same
fact), and the one thing only a rendering engine can add is named explicitly. Nothing in the right-hand
column is a browser observation.

| Checklist item | Browser-free evidence (asserted on every run) | Still needs a browser |
| --- | --- | --- |
| The tree shows the region with its 5 subdivisions | taxonomy: 46 telencephalon entries in **Basal ganglia 9 · Cerebral cortex 10 · Lateral ventricles 7 · Limbic system 6 · Telencephalic white matter 14** (42 structures + 4 tracts) | that the rows paint and expand |
| A hemisphere/ghost shell renders, translucent enough that the brainstem stays visible | `GHOST_OUTLINE_OPACITY = 0.05` (hidden record) and `GHOST_SHELL_OPACITY = 0.14` at hue `#9fb0c4`; the default preset really takes the outline branch (it hides `ctx-cerebral-cortex` and the ternary picks 0.05 over 0.14) | the rendered luminance — 0.05/0.14 are the shipped opacities, not a measured screen |
| A telencephalon structure selects from the tree, search, the 3D view **and** the axial +58 plate | all four paths dispatch the same `selectStructure` action (regression group); a `data-structure` label on the +58 plate resolves to `ctx-cerebral-cortex`; "Head of caudate nucleus" resolves 2 external references | the click, focus and hover themselves |
| The four new levels (+48/+58/+68/+78) drive the clip plane, snap-to-plate, the live section and the PiP | all four anchors exist with their ids (`lvl-tel-thalamostriate@48 · lvl-tel-basal-ganglia@58 · lvl-tel-centrum-semiovale@68 · lvl-tel-convexity@78`), sit inside `CLIP_BOUNDS` (y −55…+85), and keep the table strictly increasing so `nearestLevelTo` is unambiguous | that a dragged slider lands on them |
| The live section paints at y = +58 in Auto and MRI | the MRI grid covers +58 (station 57.50 au, 0.50 au away, 100 % of stations inside the FOV) and the pip/section pipelines share one transform (`verify:plane`, 10 827 assertions) | the paint count on screen |
| The CT modality states its coverage limit there | the shipped statement names `36.25 au` and "MRI is the modality of record", and is `null` inside coverage and on non-transverse axes | that the toolbar shows it at that plane |
| The +58 axial plate renders its labels | `plate-tel-axial-58.svg` carries 24 labels over 19 distinct structure ids, all resolvable in the taxonomy, 0 dangling | that the SVG rasterises |

The three telencephalon plates are committed as `plate-tel-axial-58.svg`, `plate-tel-sagittal-hemisphere.svg`
and `plate-tel-coronal-fornix.svg` (15 plate records: 12 pre-existing + 3 v7; only the axial one carries a
`levelId`, `lvl-tel-basal-ganglia`, which is what snap-to-plate reads).

### The closure is mutation-proven, not just asserted

`node scripts/verify/closure-bite.mjs` re-introduces the **exact pre-fix defect** for every closed gap
in an isolated copy of the tree (`.plate-scratch/bite/tree`, gitignored) and requires the mirror to
fail with the expected text — a gate that cannot fail is not a gate:

| Closed gap | Mutation re-applied | Result |
| --- | --- | --- |
| (1) context-loss overlay | drop `data-context-lost` from the recovery card | caught, `exit 1` |
| (2) PostFX composer guard | let the composer mount while the context is lost | caught, `exit 1` |
| (3) CT coverage honesty | keep the limit, drop "MRI is the modality of record" | caught, `exit 1` |
| (4a) default preset | make *Brainstem focus* hide `ctx-thalamus-envelope` | caught — the store's load-time assertion throws |
| (4b) preset region guard | make a **non-default** preset hide a telencephalon record | caught — the per-preset guard throws |
| (5) `?panelfail` containment | render the failure card without its probe marker | caught, `exit 1` |
| (6) coverage-aware CT sweep | ignore the CT source limit in the modality sweep | caught, `exit 1` |

The script prints each mutation's exit code, the failing check's own sentence and the SHA-256 of the
six mutated files **before and after** the run: 7/7 caught, the shared tree byte-identical, and the
restored copy re-runs green (91 passed · 0 failed).

## Cerebral vasculature & deep content (v8) — the arterial layer, and the telencephalon at brainstem granularity

**What v8 adds.** Two things the atlas was missing: the **cerebral vasculature** (circle of Willis and
the major cerebral arteries) as a layer of its own, and the **deep content** that brings the
telencephalon to the naming granularity the brainstem already had — functional cortical areas,
hippocampal subfields, the optic pathway, the ventricular segments, and the striatal/pallidal
subdivisions. The arterial meshes are **real BodyParts3D 4.0 geometry** (CC BY 4.0), registered into
the canonical space by the same script as every other envelope and baked by the same CLI.

### The arterial layer

- **32 new baked meshes** — 26 artery elements (both sides where the artery is paired) + the 6 optic-pathway
  meshes — taking the committed set to **138 GLBs · 599,204 triangles · 13.82 MiB**, verified by
  `npm run verify:pipeline` (138/138 parts, 0 problems) and `npm run verify:anatomy` (including
  *every baked part lies inside `CLIP_BOUNDS`*, so the clip sliders can reach all of it).
- **One record per named artery, with its territory and its syndromes.** 14 records
  (`vasc-internal-carotid-artery` … `vasc-posterior-medial-choroidal-artery`) each carry the structures
  they supply (`territory`), the **existing syndrome cards** whose arterial territory they are
  (`supply` — PCA → Déjérine-Roussy / Percheron / Weber / Benedikt, AICA → lateral pontine / Millard-Gubler,
  SCA → cerebellar, PICA → lateral medullary / central Horner), laterality, a crimson shade, and level chips.
  Selecting an artery highlights its territory structures; opening a syndrome lights the artery that causes it.
- **The circle of Willis is a real ring, not a set of stubs.** BP3D carries one element per side, so each
  paired artery names its **right side explicitly** (`bodyRight`) instead of being mirrored — the circle is
  asymmetric and mirroring the left carotid would put the right one at the wrong calibre and course. The MCA
  and PCA each own **two segments per side** (M1+M2, P1+P2) under the one record, so selecting either segment
  selects and lights the whole artery.
- **A material that reads as an artery.** `createVesselMaterial` — crimson, `roughness 0.34` +
  `clearcoat 0.3` against the tissue presets' 0.85–0.95, translucent at 0.5 with a fresnel-lit rim, and its
  section cut face painted in the arterial wall's own tone (`#7f1d1d`) rather than the shared tissue cap.
- **A `Vasculature` view preset** — the arterial cast with the brain it supplies kept as a faint outline
  (vessels + surface records + context envelopes; every nucleus, tract and ventricle is layer-off by *kind*).
  The overlay is **hidden in the default Brainstem-focus framing by the region layer** and visible in
  *All*, *Whole brain* and *Vasculature* — asserted at module load both ways, so it can neither leak into the
  default view nor become unreachable (see `state/store.ts`: the vascular exemption is paid for with its own
  assertions).

### Deep content (records, annotated)

| Group | Records | Notes |
| --- | --- | --- |
| Functional cortical areas | 12 (`ctx-v1`, `ctx-v2`, `ctx-a1`, `ctx-a2`, `ctx-wernicke`, `ctx-broca`, `ctx-m1`, `ctx-s1`, `ctx-premotor`, `ctx-sma`, `ctx-entorhinal`, `ctx-frontal-eye-fields`) | each anchored to its host gyrus mesh, with function, connections, blood supply, levels and refs |
| Hippocampal subfields | 4 (`nuc-subiculum`, `nuc-ca1`, `nuc-ca2-ca3`, `nuc-ca4`) | **record-only** — placed schematic markers, flagged as such |
| Optic pathway | 3 (`tract-optic-nerve`, `ctx-optic-chiasm`, `tract-optic-tract`) | **real meshes**; the pre-existing optic radiation keeps its own record |
| Ventricular segments | 1 new (`vent-lateral-ventricle-body`) + subdivisions | the lateral ventricle is a real cast with horns/atrium/body named as records |
| Striatal / pallidal depth | `nuc-accumbens`, `nuc-ventral-pallidum`, `nuc-claustrum`, `nuc-globus-pallidus-internus`/`-externus`, `nuc-caudate-head`/`-body`/`-tail` | records exist and are annotated; the segments share their parent mesh (see *Honest limits*) |
| Cerebral vasculature | 14 | the table above |

**Where the optic pathway renders from.** The optic nerve, chiasm and tract are `tract`/`context` records that
live in `src/data/structures/`, which means they resolve their baked bodies through the same body pass the
nuclei use — the six optic meshes are real geometry, so the optic nerve is a nerve and not a swept tube. Their
baked parts carry `materialHint: 'vasculature'` (the v8 bake emitted them alongside the arteries), so
`RECORD_MATERIAL_OVERRIDES` restores the hint their own kind implies: pale CNS white matter for the two tracts,
the neutral context preset for the chiasmatic crossing. An optic nerve in arterial crimson would have been a
false statement about the tissue.

### Honest limits (v8)

- **The striatal/ventricular subdivisions share their parent mesh.** `nuc-globus-pallidus-externus`,
  `nuc-caudate-head`/`-body`/`-tail` and the lateral-ventricle horns/atrium are fully recorded, annotated and
  selectable, but their **geometry is the one committed mesh of their parent structure** — selecting GPe
  highlights the pallidum, not a separate outer segment. Splitting them needs per-segment meshes (see below).
- **Some v8 records are record-only, deliberately.** The four hippocampal subfields and
  `vasc-lenticulostriate-arteries` own no mesh: each renders a **sized schematic placement marker** at its
  authored `origin3d`/`size3d` and says so in its own `contextNote`. For the lenticulostriate arteries this is
  the anatomy's own limit — BodyParts3D has no lenticulostriate concept (the vessel is documented from the MCA's
  anterolateral central branches, which the inventory files under the MCA).
- **The vascular source has a cervical tail that the atlas crops.** The registered ICA/vertebral elements carry
  their neck course down to `y ≈ −97 au`, well outside the canonical box. The **bake crops the two trunks at
  `y = −45 au`**, so nothing rendered leaves `CLIP_BOUNDS`; the canonical source keeps the full element and the
  deviation is recorded in `assets-src/bp3d/REGISTRATION.md` §B.4 rather than hidden.
- **`vasc-lenticulostriate-arteries` has no mesh, and the MCA's branch mesh is not it.** BP3D's MCA elements
  include the anterolateral central branches, but carving them out as "the lenticulostriate arteries" would
  assert a segmentation the source does not make.
- **No vascular imaging is layered into the section view.** The real-imagery layers (MRI, CT, cryosections) are
  unchanged: they are tissue modalities, and no vessel-annotated dataset (MRA/CTA) is committed.
- **What v8 deliberately did not do: carve the sub-nuclei their own meshes.** GPi/GPe, the three caudate parts and
  the four ventricular segments each remain one mesh with several records pointing at it. Doing it properly means
  an SDF/CSG split of a committed solid (a *shell* for GPe around GPi, a *plane-clipped* caudate head/body/tail,
  horn-clipped ventricle casts), each of which must stay watertight, inside its per-part triangle cap and inside
  the parent's bounding box before it can be committed — a geometry task with its own verification, not a
  content task. It is the first item of the remaining v8 work, and the records already in place are what it
  will point at.

### Evidence (v8)

| Gate | Result |
| --- | --- |
| `npm run validate` | **exit 0 — 0 errors, 0 warnings** (220 registry entries, 0 awaiting a record; 16 structure files / 197 records) |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** |
| `npm run verify:pipeline` | **exit 0 — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems** |
| `npm run verify:plane` | **exit 0 — 10,827 assertions** |
| `npm run verify:anatomy` | **exit 0 — 27 passed · 0 failed** (bbox invariance for the brainstem envelopes, MRI/CT content invariant, every baked part inside `CLIP_BOUNDS`, budgets) |
| `npm run verify:acceptance` / `verify:audit` | browser lanes, re-run by the orchestrator after this change (see *Verification* below) |

## v9 — somatotopy, cortical divisions, measured imaging registration, and a simulated-section panel

Spec: [`docs/SWARM_V9_PLAN.md`](docs/SWARM_V9_PLAN.md) (the run's authoritative spec) and its §8 closure;
the executable contract the run was verified against is `PLAN.md` (**gitignored**, so it is a plan of record
in the working tree only — the gates below are what is reproducible from a fresh checkout). Every number in
this section was re-measured at close-out with the command named next to it.

### 1. A somatotopic map of M1 and S1

**16 new records** — 8 motor and 8 sensory body segments (`ctx-m1-toe` … `ctx-m1-larynx` and the `ctx-s1-*`
mirrors), region `telencephalon`, subdivision *Functional cortical areas*, `kind: context`, `parent` =
`ctx-m1`/`ctx-s1`. They are ordinary records, so the tree, search, the info panel, the plates and the section
all pick them up for free.

- **Placement is probed, not guessed.** `src/geometry/somatotopy.ts` carries the table *and* the rule that
  produced it; a gitignored probe walks the committed `ctx-hemisphere-l` ribbon (40,388 verts / 81,128 tris,
  signed volume +301,371.7 au³, so vertex normals point outward), snaps each segment to the nearest ribbon
  vertex and reports the residual. Measured residuals: **M1 min 0.01 / median 0.04 / max 0.16 au**;
  **S1 min 0.29 / median 0.78 / max 2.29 au** (the three least certain S1 segments are named in their own
  `contextNote`). Worst sampled patch-rim distance from the ribbon: **3.05 au = 3.67 mm** (`ctx-s1-trunk`).
- **The order is enforced, not implied.** `npm run verify:somatotopy` (45 assertions) requires the somatotopic
  order 0…7 per strip, **arc length strictly increasing** (M1 min gap 7.72 au = 9.26 mm, S1 6.27 au =
  7.52 mm), **canonical x also strictly increasing**, **8/8 M1↔S1 pairing**, and every placement (including
  the mirrored −x extents) inside `CLIP_BOUNDS`.
- **3D overlay.** `SomatotopyOverlay.tsx` draws one oriented patch per segment — quaternion from the measured
  normal, colour from a single face→hand→arm→trunk→leg ramp, body-part label — gated by the same
  telencephalon+context layer switches as everything else, honouring the preset `hidden` set and dimming to
  0.15 when another structure is selected. It is a **dedicated patch pass rather than `NucleusMesh`**: that
  mesh has no orientation input, takes its colour from the record and floats one bbox label for the whole
  shape (full reason in plan §8.1).

**Honest limit.** The patches sit on the **derived** cortical ribbon — a modelled pial surface, not a
segmentation of a real cortex — so every position is schematic-on-the-ribbon, with the probe residual above
as the only accuracy statement. At rest the map reads by colour ramp; the body-part labels render for the
hovered/selected segment.

### 2. Cortical divisions in the 2D live section

A new **"Cortical divisions"** toggle (persisted, with a legend) re-colours the cortical ribbon in the live
section by **frontal · parietal · temporal · occipital · insula · limbic**, drawn *over* the existing
"Cerebral cortex" fill rather than replacing it. `src/components/section/corticalLobes.ts` carries the fitted
boundary constants, their measurement and their **per-boundary residual** in the file header.

- Boundaries are fitted to the committed ribbon by a reported probe series: the central sulcus from the
  measured dorsal-ridge notch (residual **0.0 au** at both measured endpoints, **5.4 au** at the hand-knob
  reach), the lateral fissure anchored on the measured MCA M1 junction and M2 exit (**3.9 au** at the M2
  exit), the parieto-occipital boundary pinned to an **11.05 %** ribbon share, the insula fitted through the
  Sylvian corridor as an ellipsoid holding **3.34 %** of ribbon vertices (morphometric series 1.8–2.5 %), and
  the limbic band set **3.4 au = 4.1 mm** of cingulate beyond the callosal surface.
- **Measured shares** (`npm run verify:cortical-lobes`, 200 assertions, exit 0) — whole ribbon: frontal 44.3 %,
  parietal 21.6 %, temporal 17.6 %, occipital 9.3 %, limbic 3.9 %, insula 3.3 %. Across the 13 reference
  planes: frontal **47.60 %**, parietal **27.30 %**, temporal **12.90 %**, occipital **6.60 %**, limbic
  **3.50 %**, insula **2.11 %** — and the check prints, per plane, which division is absent.

**Honest limit.** *This divides the DERIVED ribbon, not a gyral map* — the caveat is in the file header, in
the legend and here. **Three of the 13 reference planes (y = −46, −24, −8) miss the ribbon entirely** (its
inferior limit is y = −6.803) and carry no division; the insula is absent on 7 of the 13 and limbic on 4; the
derived ribbon has **no insular surface**, so the insula paints the deepest available limen tissue; and
`limbic : rest = 1 : 26.8` against 1 : 8–1 : 20 in the literature, because the band is the 1–2 gyrus strip the
probe could measure, not the whole limbic lobe.

### 3. The CT / photo mis-registration, measured

`node scripts/fit-imaging-affine.mjs --report` is a **re-runnable fitter** (deterministic coarse-to-fine grid
search, 3 stages, no RNG/clock/network) that measures the **atlas brain mask** (34 committed GLB parts through
the section pipeline's own clipping) against **each modality's own image mask** and prints a before/after
table, the search bounds, every plane's residual and the count that improved vs got worse.

| modality | what was measured | verdict |
| --- | --- | --- |
| **Photographs / stains** (24 measurable PNG plates) | mean ROI IoU **0.0741 → 0.4468**; **24 improved · 0 worsened**; e.g. `ubc-h20` 0.343 → 0.731, `ubc-h17` 0.099 → 0.699, `ubc-c07` 0.028 → 0.348; residuals 21.0 → 0.8 au and 20.3 → 1.5 au on the best plates, 16.0 → 14.1 au on the weakest | **APPLIED** — the corrected affine travels as `fittedFit` and `imageLayers` prefers it |
| **CT** (8 reference planes) | per-plane best fit: mean ROI IoU 0.0569 → 0.1428, mean centroid residual **18.09 → 10.64 au** (8 improved, 0 worse). But **one** similarity must ship, and it makes things worse: mean residual **18.09 → 20.39 au**, median 10.82 → 34.04 au, worst plane **+15.24 au**, improving 2/8 | **NOT APPLIED** — `applied: false`, reason and numbers committed in `ct-manifest.json` |
| **MRI** (8 reference planes) | per-plane best fit: mean residual **9.40 → 6.93 au**; the shippable similarity: **9.40 → 17.75 au**, worst plane +14.79 au, improving 3/8 | **NOT APPLIED** — same, in `mri-manifest.json` |
| **JPEG plates** (49: `vhp-*` 22, `ubc-m*` 17, `bmm-*` 10) | **nothing measured** — no JPEG decoder exists in this repo and no dependency may be added | recorded as **`unmeasurable: no-decoder`** with the count and the reason; committed placement kept |
| **3 Commons CT plates** | they carry no committed `fit` to correct | `not-fittable`, stated as such |

**Why a "better" overlap number is not a fix here.** The atlas mask is a **brain**; the CT/MRI mask is the
**head's soft-tissue envelope** (there is no brain segmenter in this repo), so only **6.6 % (CT) / 8.0 % (MRI)**
of the atlas lands on image mask — the search is not comparing two views of the same object. The honest
outcome is the residual table, which is why it ships **instead of** a correction.

**Honest limits.** The user's report ("the CT overlay is clearly off") is **measured, quantified and still
unfixed**: the CT/MRI layers keep their committed placement and say so, with the number, in the UI. The
photograph correction covers **24 of 76** committed plates. Nothing moved below y = +45: `ct.bin`,
`mri-t1.bin` and both manifests' `dims`/`originAu`/`spacingAu` are byte-identical to HEAD — the correction is
display-time only, so `verify:anatomy`'s MRI/CT `max |Δ| 0 of 255` invariant still holds. And
**`npm run verify:imaging-fit` is RED at close-out** (see *Verification*): the gate compares per-plane tables
against `registration.display.planes`, which the manifests do not carry, and two `fittedFit` literals are
formatted as `3.108820` where the gate builds `3.10882`.

### 4. An "images off" state

The *Plates* toolbar's **Simulated only** modality is now a first-class, legible state: one wording
(`SECTION_UNDERLAY_KIND_DESCRIPTIONS.none` — *"Simulated only (no imagery): draw the simulated section and
nothing external"*), the modality buttons' accessible names, the live-section state line, the panel's own line,
and `IMAGERY_OFF_STATEMENT` for the state itself. It is persisted like the other underlay settings
(`neuroaxis.sectionUnderlay`, schemaVersion 2) and it is a **hard short-circuit** in the one sampling place
(`resolveSliceModality` returns `{modality:'none'}`), so no sampler runs and no credit line is drawn.

**Honest limit.** The visible button text stays **"Simulated only"** rather than becoming "Simulated only (no
imagery)": four call sites match that string by exact text and two of the files are outside every v9 task's
write scope, so the explanatory clause lives in the accessible name and the state lines instead. That the
canvas then paints nothing but the simulated section is a browser observation (orchestrator lane).

### 5. The PiP is a simulated-section panel

The 3D tab's bottom-right panel was a ~1,700-line GPU stencil-cut renderer with a real-slice backdrop. It is
now a **2D simulated-section panel**: `SectionPiP.tsx` **717 lines**, mounting the **same `SectionCanvas`** the
*Plates* tab mounts (one code path) inside its own error boundary (`PipSection.tsx`).

| Requirement (the user's words) | How it holds |
| --- | --- |
| No clipped 3D geometry | the panel mounts no 3D scene and owns no WebGL context; the retired rig (in-canvas renderer, private camera + `WebGLRenderTarget`, stencil parity/cap passes, MSAA watchdog, `?pipdebug` overlay, scissored blit, backdrop sampler) is **deleted** — the check asserts 12 retired tokens are absent from the file's code |
| No plane helper | the panel imports no `PlaneHelpers`; the helper stays the **main** canvas' cut indicator, unchanged |
| **No real imagery, ever** | two structural guarantees: a reference-counted **non-persisting** imagery scope holds the store in `kind:'none'` while the panel's canvas is mounted (the user's own choice is never rewritten and is restored on unmount), and a pixel guard shadows `drawImage`/`putImageData` on that canvas' context only, counting what it drops — those two calls are the only real-imagery route in `imageLayers.ts` (5 blit sites) |
| Resizable, and remembered | a real `<button class="pip-resizer">` (pointer drag, arrow keys, Shift ×4) plus a small→large cycle, stored in `sectionPipSize` / `neuroaxis.sectionPipSize` (JSON), **clamped on read and on write to 224–880 × 170–640 px**, and delivered to CSS as `--pip-window-width/-height` so the ≤900 px media query still wins |
| The chrome that still means something | axis override (X/Y/Z, `aria-pressed`), the plane readout in the audited `x = 12.0 au` shape, the four orientation badges from `planeGeometry.PLANE_BADGES` (the panel throws at module load if its own table disagrees), hide (`Hide live section`) → restore pill (`Live section ▸`), and the narrow-viewport tab with its exact a11y literals |

`npm run verify:pip-contract` (new, **83 assertions**, exit 0) decides the DOM contract, the clamp arithmetic
and the wiring in Node. Its own honest limit is documented in the file: zustand 4 hands the static renderer the
store's **initial** snapshot, so the markup half asserts the boot state and the other axes are proven through
the same pure functions the panel calls. The guard's limit is in `PipSection.tsx`: it is a JS-level shadow on
one context, not a browser policy.

### v9 honest limits, in one place

| Item | Limit (with its number) |
| --- | --- |
| 1 · somatotopy | Placement is **schematic on the DERIVED ribbon**, not a cortical map; probe residual M1 ≤ 0.16 au / S1 ≤ 2.29 au; worst patch-rim distance 3.05 au (3.67 mm); labels render only for the hovered/selected segment |
| 2 · cortical divisions | **A geometric division of the derived ribbon, not a gyral or cytoarchitectonic map**; 3 of 13 reference planes miss the ribbon entirely; insula absent on 7 of 13 planes and painted on limen tissue, not insular cortex; limbic : rest 1 : 26.8 vs 1 : 8–1 : 20 in the literature |
| 3 · imaging registration | The CT half of the user's complaint is **measured and NOT fixed** (mean centroid residual 18.09 → 20.39 au on the only shippable similarity, so nothing was applied); MRI likewise 9.40 → 17.75 au; **52 of 76 plates have no measurement** (49 JPEG `no-decoder`, 3 `not-fittable`); the 24 corrected plates are corrected against a **synthetic atlas mask**, not a landmark or voxel registration |
| 4 · images off | The visible button text is "Simulated only" (four exact-text call sites outside the run's scope); that the canvas paints only the simulated section in a page is browser-only |
| 5 · simulated-section panel | It shows the **simulated section only** — never real imagery, by design and on request; the pixel guard is a JS-level shadow, not a browser policy; the resizer, the persistence across a reload and the absence of any plane helper on screen are browser-only; `audit-checks.test.mjs:1155` still carries the retired backdrop assertion (it passes only because the removal is *documented* in the file) — see below |
| all items | Browser-only claims (that the overlay, the lobe layer, the corrected photographs, the images-off canvas and the resized panel look and behave right in a page) are **orchestrator-verified only**; Chrome cannot start in the agent sandbox |

### Verification (v9 close-out, non-browser)

| Gate | Result |
| --- | --- |
| `npm run validate` | **exit 0** — 236 registry entries (0 awaiting a record) · 213 records in 17 files · 23 tracts · 26 syndromes · 15 plates · 17 levels · 0 errors, 0 warnings |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (`✓ built in 9.15s`) |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** — 10,827 assertions |
| `npm run verify:somatotopy` | **exit 0** — 45 passed / 0 failed |
| `npm run verify:cortical-lobes` | **exit 0** — 200/200 assertions |
| `npm run verify:pip-contract` | **exit 0** — 83 passed / 0 failed (and its bite check catches 5/5 mutations in an isolated copy) |
| `npm run verify:imaging-fit` | **exit 1 — NOT RUN AS ASSERTED in the agent sandbox**: the committed gate re-runs the fitter as a piped child (`spawnSync node EPERM`) and stops before any assertion. Driven through a byte-identical copy with the fitter's captured JSON it completes with **289 assertions and 20 failures = 18 real defects + 2 `HEAD`-path artifacts of the copy**: 16 × the manifests carry no `registration.display.planes` (the gate compares every recomputed plane), 2 × `ubc-c13`/`ubc-c14` ship `3.108820` where the gate builds `3.10882` (equal numbers, different string). Both fixes are in files owned by the `imaging-registration` task. Nothing was papered over: the correction record and the gate disagree about the committed shape and the gate says so |
| `npm run verify:audit-checks` | **exit 1 — 90 passed / 1 failed / 7 informational**: *"rows dimmed at default framing"* lists the 14 `vasc-*` rows — pre-existing since v8 (the brainstem-focus default hides the vasculature by design while the check only exempts the telencephalon), reproduced by three tasks against stashed HEAD files |
| `npm run verify:anatomy` | **not runnable in the agent sandbox** — exit 1 with `spawnSync powershell EPERM` (errno −4048) *before* any verdict prints; the orchestrator records 27/27 in its own environment |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **orchestrator lane only** — Chrome cannot start in the sandbox (exit 4, "no check was run") |


The single warning the content task left behind (a deliberately staged
`src/data/structures-pending/vasculature.json`) is **gone**: the `vasculature` region is now legal in
`types.ts` / `load.ts` / `validate-data.mjs`, the 14 registry rows were appended from the records themselves
(so registry and record cannot drift), and the file moved into `src/data/structures/`.

## v10 — plane-helper extent, division visibility, four-corner PiP resize, cortical-division quality, and the cortex label

Spec: [`docs/SWARM_V10_PLAN.md`](docs/SWARM_V10_PLAN.md) — **§8 is this run's closure**, and every number in
this section is re-measured there by the integrator's own sweep (`npm run …`, exit codes printed per gate).
The five items are the user's own five reports; each one now has a user-visible control or behaviour **and** a
committed check that fails if it regresses.

### 1. The plane helpers cover the telencephalon

`src/components/viewer3d/PlaneHelpers.tsx` used to draw **literal** quads around the brainstem: transverse
`[96, 82]` → x ±48, z ±41; sagittal `[82, 100]` → z ±41, y −55…+45; coronal `[96, 100]` → x ±48, y −55…+45.
Against `CLIP_BOUNDS` (x[−58, 58] · y[−55, 116] · z[−76, 72], the single runtime declaration) that left the two
sheets with `y` in plane **71.0 au = 85.2 mm short of the box vertex** at y = +116 — i.e. **68.7 au = 82.4 mm
above the measured top of the cortex ribbon (+113.7)** — and the transverse sheet missing **31.0 au anteriorly**
(z +41 → +72) and **35.0 au posteriorly** (z −41 → −76).

All three sheets are now **derived at runtime from `CLIP_BOUNDS`** (no extent literal anywhere in the code — the
gate strips comments and strings and searches the remaining literals) and gridded at a **constant ≈4 au cell**
instead of a fixed line count:

| axis (sheet) | in-plane rect | quad W × H (au) | grid cells | cells (au) |
| --- | --- | --- | --- | --- |
| x — sagittal | z[−76.00, 72.00] × y[−55.00, 116.00] | 148.00 × 171.00 | 37 × 43 | 4.000 / 3.977 |
| z — coronal | x[−58.00, 58.00] × y[−55.00, 116.00] | 116.00 × 171.00 | 29 × 43 | 4.000 / 3.977 |
| y — transverse | x[−58.00, 58.00] × z[−76.00, 72.00] | 116.00 × 148.00 | 29 × 37 | 4.000 / 4.000 |

Colour, opacity, `renderOrder` (30/31), raycast-off, the group name and the `clip.showHelper` gate are unchanged,
and every geometry is still built once at module load. `npm run verify:plane-helper-extent` (**196 assertions**)
executes the shipped render path, walks the element tree, transforms the quad corners and every grid vertex
through the shipped rotation onto the `CLIP_BOUNDS` rectangle, and proves the derivation by mutating a scratch
copy of `clipPlanes.ts` (widths 116→128 / 148→162, heights 148→162 / 171→185, cells 29→32 / 37→41 / 43→46) while
the shipped files' SHA-256 stay identical.

**Honest limits.** (a) The grid is a `LineSegments` in the sheet's own local frame, not a `GridHelper`: three
0.169's `GridHelper(size, divisions)` takes **one** divisions value and is always square, so it cannot span
116 × 171 au with au-constant cells. (b) **Whether the helper actually covers the cortex on screen is not
provable from this environment** — with the shipped camera the sheets project far outside a 1500 × 950 viewport
for the old *and* the new box (x-sheet bbox y −794…9637 px new vs −452…1441 px old), so "it looks right" is a
**browser** observation the orchestrator's `verify:audit` decides from the rendered scene, not a claim made here.

### 2. Division-level visibility (on/off + solo)

The Legend's existing *Layer toggles* group gained a **Divisions** group: one row per division, each with a real
`<input type="checkbox">` (on/off) and a real **Solo** button (everything else off). The per-region, per-kind and
per-palette toggles are untouched, and the four divisions **partition** all seven regions of `ALL_REGIONS`
(asserted at module load, so a region added later cannot silently fall outside the control):

| division | regions it contains | a fresh boot |
| --- | --- | --- |
| Prosencephalon (forebrain) | telencephalon + diencephalon | ticked |
| Mesencephalon (midbrain) | midbrain | ticked |
| Rhombencephalon (hindbrain) | pons + cerebellum + medulla | ticked |
| Cerebral vasculature | vasculature (its own system — never folded into a division) | unticked (v8: the arterial overlay is hidden by default) |

Measured by `npm run verify:division-toggles` (**250 assertions**), which imports the *shipped* store through an
in-process TS/TSX loader, renders the shipped Legend through `react-dom`, and drives the shipped handlers in an
isolated copy: `solo(prosencephalon)` ⇒ `[diencephalon, telencephalon]`, `solo(mesencephalon)` ⇒ `[midbrain]`,
`solo(rhombencephalon)` ⇒ `[cerebellum, medulla, pons]`, `solo(vasculature)` ⇒ `[vasculature]` — **every other
region off** in all four cases; the checkbox turns a complete division off and an incomplete one on (a union that
is idempotent and restores the previous set exactly); kinds/hidden/emphasis are set-equal after every call; a
mutated `DIVISIONS` table (arteries folded into the hindbrain) trips the store's own load-time assertion. The
default is unchanged: a fresh boot still reports **`brainstem-focus`** with `vasculature` off and every other
region on.

**Honest limits.** (a) **This is a display grouping over the taxonomy regions, not new anatomy** — each division
is exactly the union of the region layers listed above, so soloing "Prosencephalon" shows what the telencephalon
and diencephalon toggles show, in one click; it is the reference figure's embryological grouping, nothing more.
(b) A division choice is **deliberately not persisted** (no storage key exists): a returning visitor must not boot
into a tree where six of seven regions look switched off — the v7 audit failure mode. (c) Solo switches **region**
layers only; the `hidden` set of the default preset (32 telencephalic ids) is untouched, so a solo on a fresh boot
still leaves those records hidden until the user picks another preset. (d) `TaxonomyTree.tsx` was deliberately not
modified — the tree already dims through the same `layerOff()` rule. (e) That the checkboxes and Solo buttons move
the *live scene* is a browser observation (orchestrator lane); this run proves the store, the rendered DOM, the
accessible names and the wiring.

### 3. The simulated-section panel resizes from all four corners

`SectionPiP.tsx` now renders **four** handles — `se` (the first in DOM order, keeping the bare
`class="pip-resizer"` the browser lane focuses), `nw`, `ne`, `sw` — each with a 24 × 24 px hit target, its own
diagonal cursor, and its own accessible name naming the corner and the live size. Dragging a corner moves the two
edges that corner owns; the size still passes through the store's own `clampSectionPipSize`, so nothing can leave
**224×170 … 880×640 px**:

| corner | +40/+40 | −400/−400 (clamped) | +5000/+5000 (clamped) | (+40, 0) | (0, +40) |
| --- | --- | --- | --- | --- | --- |
| nw | 360×260 | 800×640 | 224×170 | 360×300 | 400×260 |
| ne | 440×260 | 224×640 | 880×170 | 440×300 | 400×260 |
| sw | 360×340 | 800×170 | 224×640 | 360×300 | 400×340 |
| se | 440×340 | 224×170 | 880×640 | 440×300 | 400×340 |

In the panel's local frame (0, 0)–(400, 300) a +40/+40 drag puts each dragged corner exactly on
pointer + (40, 40) — nw (40, 40), ne (440, 40), sw (40, 340), se (440, 340) — while the **opposite** corner keeps
both coordinates bit-identical ((400, 300), (0, 300), (400, 0), (0, 0)). One-axis drags leave the other axis
bit-identical, and at the clamp bound the opposite corner is still fixed. Keyboard resize (Arrow = 16 px,
Shift = 4×), the small⇄large cycle button, the size `aria-label` and the DOM contract the browser lane reads are
unchanged. `npm run verify:pip-contract` grew from 83 to **187 assertions**; its bite half re-runs six mutations
in an isolated copy and each one makes it exit 1.

**Honest limits.** (a) **The "opposite corner stays put" rule is the resize arithmetic, not a screen-space fact
everywhere**: the card is CSS-docked bottom-right, so a width change *always* moves the panel's left edge and a
height change *always* moves its top edge — in screen terms **NW** is the corner that behaves exactly as
described, while the south-east handle (whose own corner is the pinned one) cannot follow the pointer.
`npm run verify:pip-contract` asserts the arithmetic and the dock invariant; the browser lane prints the
per-corner screen readout rather than claiming the impossible. (b) Size **persists across reloads**
(`neuroaxis.sectionPipSize`, clamped on read *and* write) — that a real reload restores it is a browser
observation. (c) Arrow-key resize in a live page is likewise browser-only.

### 4. Cortical-division quality — the slivers and triangles are gone

The wrong wedges were the **partition's own geometry**, not the ribbon's: a run is a consecutive stretch of one
contour loop with one classification, so a fitted boundary crossing the ribbon at a shallow angle produced
2–4-vertex runs, and a long thin run could still enclose almost no area. The fix is a documented **run-quality
rule** (`src/components/section/corticalLobes.ts`, header + constants):

- `MIN_DIVISION_RUN_AU = 10` (own-vertex **arc** floor, 12 mm), `MIN_DIVISION_AREA_AU2 = 25` (**drawn** shoelace
  area of the polygon the canvas fills), `MIN_DIVISION_LABEL_AREA_AU2 = 25` — deliberately equal to the paint
  floor, so *painted ⇒ has a label-eligible run* is an asserted inequality rather than a hope.
- The splitter rotates a closed ring to start at a division change (a wrapped stretch is **one** run), absorbs
  every sub-threshold span into its neighbour **to a fixpoint**, and drops a loop that reduces to a single
  sub-threshold span (it keeps the context fill). The pre-v10 off-by-one that emitted 1-vertex runs of
  **arc 0.00 au** is gone.
- The division label now competes by **drawn area**, not vertex count, and is drawn at most once per division per
  plane — which is what removes "TEMPORAL" from a 5.5 au² long thin wedge.

Measured on the 13 reference planes (`npm run verify:cortical-lobes`, **519/519 assertions**, which prints the
full per-plane per-division table): **80 → 47 painted runs**, 22 raw spans absorbed, 3 whole loops dropped
(32 vertices, every one sub-threshold, ≤ 23.87 au²), and **zero** painted runs below either floor —
`arc < 2 / < 5 / < 10` = 0, `area < 1 / < 10` = 0, 1-vertex runs = 0, for every division. The independent raw
re-cut of the same planes holds **72 raw spans, 23 of them sub-threshold** (shortest: arc 0.00 au, one vertex),
so the rule is doing the work, not the classifier. Over the 34-plane user grid: **548 → 265 runs**, 199 absorbed,
33 dropped loops, **174 labels**, 0 painted divisions without a label-eligible run.

**Honest limits.** (a) **This divides the DERIVED ribbon, not a gyral map** — no sulcal fundus, Brodmann area or
flat-map boundary is traced; the caveat is in the file header, in the legend and here. **Nothing in the fitted
boundary constants moved** in v10: the wedges were the run rule, and the fit was re-checked, not re-fitted.
(b) Absorption re-labels the absorbed stretch with the **neighbour's** division, so where a boundary crosses at a
shallow angle the colour is the neighbour's along 10–25 au of contour. (c) A whole loop that is a single
sub-threshold stretch is not painted at all (measured: 3 of 13 reference planes, 33 of 49 user-grid planes) — the
layer paints territories, not splinters. (d) The three reference planes y = −46, −24, −8 **miss the ribbon
entirely** and carry no division; the derived shell has **no insular surface**, so the insula still paints the
deepest available limen tissue. (e) Known and unasserted: over 218 planes × both ribbons, **6 cases** were
traced where an absorption collapses a span's area and a later pass absorbs it into a *different* division, so a
body that cleared both floors is painted as its neighbour — a limit of the shipped rule, reported rather than
hidden. (f) The committed gate slices `ctx-hemisphere-l` only, while the canvas paints **both** ribbons, so the
gate's per-plane run counts are a lower bound (at y=0: gate 3 runs / 3 divisions, both ribbons 6 runs /
4 divisions).

### 5. The cortex label is dropped, the contour stays

`NO_CANVAS_LABEL_RECORD_IDS = {ctx-cerebral-cortex}` gates **both** canvas label sites (the selected label and
the hover label) and the `.section-structure-chip`, so *"Cerebral cortex (context envelope)"* no longer appears on
the 2D live-section canvas, in the Plates tab, or in the simulated-section panel (which mounts the same
component) — and it is out of the canvas' accessibility subtree, not merely painted over. The record's **contour
and fill are untouched** (`drawPart`), and no other context label is filtered: **45 context records exist, 44 keep
their canvas label** (the thalamus envelope, the level chips and the division labels all still label). Proven by a
real `react-dom` render: cortex selected ⇒ chip markup `""`; thalamus envelope selected ⇒ the chip renders.

**Honest limit.** The *canvas* label is gone, but the exact string still exists elsewhere on the same screen and
is **recorded, not hidden**: the info rail and taxonomy tree announce the record name, `PlateRenderer` injects an
`<svg><title>` carrying it, and the three authored telencephalon plate SVGs draw their **own** hand-written cortex
labels (`plate-tel-axial-58.svg` *"cerebral cortex (cortical ribbon)"*, `plate-tel-coronal-fornix.svg`
*"(envelope)"*, `plate-tel-sagittal-hemisphere.svg` *"(medial surface)"*). Those plate artefacts were outside
every task's write scope in this run.

### v10 honest limits, in one place

| Item | Limit (with its number) |
| --- | --- |
| 1 · plane helpers | The grid is a `LineSegments`, not `GridHelper` (three's `GridHelper` is square, one divisions value) — same spacing and material. On-screen coverage and legibility at 43 lines are **browser-only**; with the shipped camera the sheets project far outside a 1500 × 950 viewport for the old *and* new box (`y −794…9637 px` vs `−452…1441 px`), so the extent claim rests on `verify:plane-helper-extent`, not on pixels |
| 2 · division visibility | A **display grouping over the taxonomy regions** (Prosencephalon = telencephalon + diencephalon; Mesencephalon = midbrain; Rhombencephalon = pons + cerebellum + medulla; Cerebral vasculature = vasculature, its own system) — not new anatomy. Not persisted by design. Solo switches region layers only, so the default preset's 32 hidden telencephalic ids stay hidden. That it repaints the live scene is browser-only |
| 3 · four-corner resize | The "opposite corner fixed" rule is the **resize arithmetic in the panel's local frame**; on screen the card is docked right/bottom, so width changes always move the left edge and height changes always move the top edge — NW is the corner that matches the sentence, and the SE handle cannot follow the pointer. Clamp **224×170…880×640 px** on read and on write. Real pointer drags, arrow keys and the cross-reload persistence are browser-only |
| 4 · cortical divisions | **Fitted to the DERIVED ribbon, not a gyral map**; fitted constants unchanged in v10 (the fix is the run rule: arc ≥ 10 au, drawn area ≥ 25 au², label area ≥ 25 au²). Absorption can re-label 10–25 au of contour with the neighbour's division; a whole sub-threshold loop is unpainted on 3/13 reference planes and 33/49 user-grid planes; **6 measured cases** paint a floors-clearing body as its neighbour and the committed gate asserts nothing about that class; the gate slices one ribbon while the canvas paints two |
| 5 · cortex label | The canvas text is suppressed (45 context records: 1 suppressed, 44 kept) and it leaves the canvas' accessibility subtree — but the exact record name still reaches the app's accessibility tree through the info rail, the taxonomy tree and `PlateRenderer`'s injected `<title>`, and the three authored plate SVGs draw their own cortex labels |
| all items | Every rendered-pixel claim (**the helpers over the cortex, the solo repaint, a real four-corner drag, the division layer at the artefact planes in Plates *and* PiP, the label absent on screen**) is **orchestrator-verified only**: Chrome cannot start in the agent sandbox, every browser lane exits 4 with "no check was run" |

### Verification (v10 close-out, non-browser)

| Gate | Result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors / 0 warnings · 236 registry entries (0 awaiting a record) · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (`✓ built in 10.88s`) |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** — 10,827 assertions |
| `npm run verify:plane-helper-extent` | **exit 0 (new gate)** — 196 passed · 0 failed |
| `npm run verify:somatotopy` | **exit 0** — 45 passed / 0 failed |
| `npm run verify:cortical-lobes` | **exit 0** — 519/519 assertions (prints the per-plane per-division arc table and the zero-sliver census) |
| `npm run verify:pip-contract` | **exit 0** — 187 passed / 0 failed (was 83; the new group F covers the four corners, the per-corner geometry and the stylesheet, and 6/6 mutations are caught in an isolated copy) |
| `npm run verify:division-toggles` | **exit 0 (new gate)** — 250 passed · 0 failed |
| `npm run verify:audit-checks` | **exit 0** — 92 passed · 0 failed · 7 informational · 9 groups. **Green now**: the v9 close-out note said this gate was red, and the check that failed then (the dimmed-row predicate) carries the documented vascular exemption from `f5d3ed2` **plus a second assertion that pins it** — *"the 14 vascular rows are off at default framing through the REGION layer only (none structure-hidden, the vessel kind layer stays on, so switching the region reveals them)"* |
| `npm run verify:closure-bite` | **exit 0** — 7/7 mutations caught, shared tree byte-identical, restored copy re-runs 92/0. **Green now** because its unmutated reference run (`verify:audit-checks`) is green |
| `npm run verify:boundary-contract` | **exit 0** — 22 passed / 0 failed |
| `npm run verify:a11y-contract` | **exit 0** — 38 passed / 0 failed |
| `npm run verify:budget-report` | **exit 0** — 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB, all inside their caps |
| `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | **exit 0** — 9.02 MiB in 82 files (cap 10) · v4-added 3.81 MiB (cap 4) · 22 cryosections −52.20 … 34.04 au |
| `npm run verify:anatomy` | **exit 1 — environment, not product**: `spawnSync powershell EPERM` before any verdict prints (the gate pipes a child's stdio, which this sandbox denies). Red at base, in no v10 task's scope; the orchestrator records 27/27 in its own environment |
| `npm run verify:imaging-fit` | **exit 1 — environment, not product**: `FAIL the fitter could not be re-run: spawnSync node EPERM` (0 assertions run). Red at base and unchanged by this run — the v9 section above records what the gate says when it *can* run |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **orchestrator lane only** — `verify:audit` runs its non-browser half here (it prints `v10 source facts: CLIP_BOUNDS x[-58, 58] y[-55, 116] z[-76, 72] · declaration sites 1 · grid cell 4 au · division floors 10 au / 25 au2 (label 25 au2) · PiP clamp 224x170…880x640 px · suppressed canvas label ids [ctx-cerebral-cortex]`) and then **exits 4** at the browser half: Chrome dies in `mojo::PlatformChannel` (`OpenProcess: Access is denied (0x5)`) |

No content record was added, renamed or moved by v10: `npm run validate` reports the same 236 / 213 / 23 / 26 /
15 / 17 inventory as v9 — the run is display, controls and rules only.

## v11 — the Areas + Systems toggle rows replace the view-preset row

Spec: [`docs/SWARM_V11_PLAN.md`](docs/SWARM_V11_PLAN.md) — **§7 is this run's closure**, and every number in this
section is re-measured there by the integrator's own sweep (`npm run …`, exit code per gate). The ask was
"*instead of divisions such as 'brainstem focus', use big categories like telencephalon, mesencephalon … and make
them toggle buttons so users can toggle brain areas on and off (exclude from 3D/2D section view when off)*", plus
"*another orthogonal axis is vascular, nuclei, tract (also toggle on and off), which you already pretty much
have*". It is data slicing, controls and rules — **no content record, mesh, level, plate or syndrome moved**
(`npm run validate`: the same 236 registry entries · 213 records · 23 tracts · 26 syndromes · 15 plates · 17
levels, 0 errors / 0 warnings).

### 1. Two rows of toggles, and where the preset row went

The header's first control row is now **Areas**, followed by **Systems**; every button is a real
`<button type="button">` with `aria-pressed`, an accessible name whose visible text is a prefix (WCAG 2.5.3) and
a stable machine hook for the browser lane (`data-area` / `data-kind`) — and because they are real buttons they
are focusable and keyboard-operable by construction, which the browser lane confirms with a real Space keypress
(the check is written to fail, not to skip).

| Row **Areas** (`data-area`) | regions it owns | taxonomy rows | v10 division (`data-division`) | a fresh boot |
| --- | --- | --- | --- | --- |
| Telencephalon | telencephalon | 85 | prosencephalon | on |
| Diencephalon | diencephalon | 39 | prosencephalon | on |
| Mesencephalon (midbrain) | midbrain | 25 | mesencephalon | on |
| Metencephalon (pons + cerebellum) | pons + cerebellum | 40 | rhombencephalon | on |
| Myelencephalon (medulla) | medulla | 33 | rhombencephalon | on |
| Cerebral vasculature | vasculature | 14 | vasculature | **off** (v8: the arterial overlay is off by default) |
| **Σ** | **7 regions, each owned exactly once** | **236 = every taxonomy entry** | — | pressed row `[true,true,true,true,true,false]` |

| Row **Systems** (`data-kind`) | taxonomy rows | a fresh boot |
| --- | --- | --- |
| Nuclei · Tracts · Ventricles · Surface · Vessels · Context | 88 · 53 · 11 · 25 · 14 · 45 = **236** | all six **on** |

The partition is **derived and asserted, not typed**: the Areas table is computed from the v10 `DIVISIONS`
(`metencephalon` = rhombencephalon minus medulla, `myelencephalon` = medulla) and the store throws **at module
load** if any region is claimed twice, claimed by nobody, or claimed by an area whose declared division
disagrees — in Node *and* in the browser. The Systems row is `ALL_KINDS` mapped in order, so it is total over the
kinds by construction. `npm run verify:area-toggles` (**331 assertions, 0 failed**) imports the shipped store and
the shipped `Header`, drives the real `onClick` handlers, renders the header through `react-dom`, prints the two
tables above, and bites: a mutated area table (region moved, region shared, area dropped, helpers clobbered)
fails a named check, and two load-time mutations make the store itself exit 1 naming the defect.

**What changed for users, exactly.** The **preset row is not deleted — it moved**: it is still in the header,
now the **shortcut row beneath Areas and Systems** (presentation order 0/1/2; the DOM order is deliberately
presets-first so the existing default-framing assertion still addresses the same buttons). **Reset** and **All**
sit at the end of that row: Reset calls the store's existing default (`applyViewPreset('brainstem-focus')`) and
All resolves through the preset table, so there is exactly **one** definition of "the default framing" — the
v7 *Brainstem focus* default, its 32 hidden cortex-preset ids, the vasculature region off and all six kinds on
are unchanged, and `viewPresetOf(DEFAULT_LAYERS)` is still `brainstem-focus` (asserted in the unchanged
`verify:audit-checks` mirror, 92/0, and in the new gate's own §5–§6). The Legend keeps every per-region,
per-kind and per-division control, and its division rows now name the header areas they resolve to; the
taxonomy tree dims through the same layer sets, so the tree and the rows can never disagree.

### 2. One visibility decision — the 3D scene, the live section and the PiP agree

The point of the rows is that **off means off everywhere**. Before v11 one path bypassed the layer sets:
`buildLobeLayer` (the cortical-division pass) was correct only because its input happened to be pre-filtered.
It now re-applies the same gate, and the check sweeps both surfaces case by case
(`npm run verify:view-filter-consistency`, **100/100**):

| what was swept | result |
| --- | --- |
| **2D canvas + PiP** — 138 section parts × 4 states (on+on / kind-off / area-off / both-off) | on+on **138/138 painted**; kind-off **138 hidden**; area-off **138 hidden**; both-off **138 hidden**; parts with no region (**the silent-bypass class**) **0 of 138** |
| **3D** — the same 4 states through `layersAdmit` | **552 comparisons · 0 disagreements** with the 2D decision |
| **every 3D pass** — 213 structure records, 23 tracts, 10 envelope slots, 2 ghost shells | area off ⇒ **all hidden**; kind off ⇒ **all hidden**; both off ⇒ **all hidden**; **violations 0** |
| **cross-surface join** on the taxonomy id — 137 of 138 parts | **548 comparisons · 0 disagreements** |
| **the cortical-division pass executed** over both committed ribbon GLBs, 5 planes × 2 ribbons | parity **5/5**; area off ⇒ **0 ribbons / 0 painted divisions** even with the unfiltered catalogue |

Per area, what each surface hides (2D parts hidden/owned · 3D drawn records hidden/owned): diencephalon 33/33 ·
38/38 — telencephalon 28/28 · 57/57 — midbrain 14/14 · 21/21 — pons 17/17 · 27/27 — medulla 14/14 · 27/27 —
cerebellum 6/6 · 5/5 — vasculature 26/26 · 14/14. Per system: nucleus 81/81 · 84/84 — context 17/17 · 44/44 —
tract 7/7 · 24/24 (+23 tract tubes) — ventricle 7/7 · 6/6 — surface 0/0 · 17/17 — vessel 26/26 · 14/14.

The check is not decorative: the pass really built **75 `Path2D`s (75 `moveTo` · 2233 `lineTo` · 75
`closePath`)**, and with the canvas' gate removed in a scratch copy the mutant paints **5 divisions with the
telencephalon off** where the shipped code paints **0**. `SectionCanvas.tsx`'s SHA-256 is printed identical
before and after.

### 3. The two v10 carry-over defects — settled

**(a) The cortical-division rule vs what the canvas paints (§3 item 4).** The v10 audit read "at the planes the
rule expects 4–6 painted divisions the canvas paints **NONE**" (y=6 legend `[]` vs the rule's five; y=14 `[]`
vs all six). The measured cause is **ribbon coverage, not a rule disagreement**: the canvas paints **both**
cortical ribbons while the gate's per-plane tables sliced the **left** one only. Per reference plane
(`npm run verify:cortical-lobes`, **564/564**, prints both columns and the audit's own table is reconciled
**6/6** rows):

| plane | rule, LEFT ribbon alone | rule, both ribbons = what the canvas paints | only the right ribbon adds |
| --- | --- | --- | --- |
| y=0 | temporal · occipital · limbic | **parietal** · temporal · occipital · limbic | parietal |
| **y=14** | frontal · temporal · occipital · insula | frontal · **parietal** · temporal · occipital · insula · **limbic** | parietal · limbic |
| y=30 | frontal · parietal · temporal · occipital | *identical* | — |
| y=48 | frontal · parietal · temporal · occipital · limbic | *identical* | — |
| y=58 | frontal · parietal · occipital | frontal · parietal · occipital · **limbic** | limbic |
| y=68 | frontal · parietal | *identical* | — |
| y=78 | frontal | *identical* | — |
| x=6 | frontal · parietal · occipital | *identical* | — |
| z=0 | frontal · temporal · limbic | *identical* | — |
| z=40 | frontal · parietal | *identical* | — |
| y=−46 / −24 / −8 | `[]` | `[]` (these planes miss the ribbon entirely) | — |

**3 of 13 reference planes** carry a division only the right ribbon paints, and the canvas now consumes the
**same** splitter + floors the Node gate exercises (`corticalRunsForLoop`; run ≥ 10 au, drawn area ≥ 25 au²,
label ≥ 25 au², all read from `corticalLobes.ts`). The browser lane no longer hardcodes the expected set: it
re-derives it at audit runtime over both ribbons and keeps the old table as a printed cross-check.

**(b) The sagittal plane-helper `u/v` convention (§3 item 1).** The v10 audit measured the sagittal helper quad
at **148 × 171 au** and its own in-plane `CLIP_BOUNDS` rectangle at **171 × 148**. The arithmetic settles it:
`AXIS_PAIR.x = [z, y]`, so `u = z` → 72 − (−76) = **148** and `v = y` → 116 − (−55) = **171** — **the shipped
quad is right** and the audit's `['x','y','z'].filter(c => c !== axis)` was **ascending axis *name***
(`['y','z']` → 171 × 148), which no single permutation can match for all three planes. The **audit** was fixed:
it reads the ORDERED pair out of the shipped `planeGeometry.ts` and prints it in its own run
(`AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]}`), and the hand-typed `AXIS_INDEX` table is gone;
`npm run verify:plane-helper-extent` (**206/0**) now reports *"ascending-name in-plane derivation absent ·
reads AXIS_PAIR yes"*. `PlaneHelpers.tsx` itself is unchanged (a comment documents the convention).

**(c) Found by this run, not in the brief: the coronal plane frame.** `planePointToCanonical` sent the coronal
axis down the transverse branch, so every coronal section was classified at wrong canonical coordinates.
Measured on the left ribbon, before → after: **z=0** `[parietal temporal limbic]` → `[frontal temporal insula
limbic]`; **z=30** `[insula parietal]` → `[temporal insula frontal parietal]`; **z=40** `[parietal limbic]` →
`[frontal parietal]`; **z=−30** `[parietal temporal limbic]` → `[frontal temporal]`. The frame is now
`[u, v, planeValue]` for all three axes and both gates assert it per axis.

### v11 honest limits, in one place

| Item | Limit (with its number) |
| --- | --- |
| 1 · the Areas row | The six areas are a **display grouping over the taxonomy regions**, not new anatomy and not a new taxonomy: each button is exactly the union of the region layers named in the table above (`Metencephalon` = pons + cerebellum; `Myelencephalon` = medulla), i.e. the reference figure's embryological vesicles plus the arterial system, at one click. A region added to the taxonomy later **cannot** be orphaned — the store's load-time assertion throws instead — and a button reads "on" only when *every* region it owns is on (a partly-on area reads unpressed; there is no third state) |
| 2 · the Systems row | The orthogonal axis is exactly the **`kind` axis the app already had** (`ALL_KINDS`: nucleus · tract · ventricle · surface · vessel · context) — not a new grouping, and not the same thing as the v10 divisions. Measured consequence: **25 `surface` records exist but only 17 have a 3D body and 0 have a section part**, so switching Surface off changes the 3D view and nothing in the section; and the 26 vessel *parts* are gated by `taxonomyKind`, not by their draw bucket |
| 3 · the preset row | The row is **demoted, not deleted** (it is the shortcut row below the two new rows) — the documented default framing stays reachable and asserted. `Cortex only` keeps its v7 meaning and is not a header toggle. **Two header buttons read exactly "Nuclei"** (the preset and the system toggle) and two read "All" (the preset and the action); both are machine-hooked, and a new contract check fails if an *unhooked* duplicate ever appears |
| 4 · one decision, one axis | The 3D surface also honours the **structure-level `hidden` set** of the v7 presets (28 records under *Brainstem focus*), which the 2D section does not. That is a *different* axis, measured and printed (gate lane C2), deliberately **not** merged with the area/kind decision. Four section parts have no 3D body of their own (`ctx-caudate-l/-r`, `ctx-choroid-plexus-l/-r`) and one part (`ctx-pineal`) has no taxonomy entry, so the cross-surface join is **137 of 138 parts**, not 138 |
| 5 · cortical divisions | **Fitted to the DERIVED ribbon, not a gyral map** — no sulcal fundus, Brodmann area or flat-map boundary is traced; the caveat is in the file header, in the legend and in the [v10 limits](#v10--plane-helper-extent-division-visibility-four-corner-pip-resize-cortical-division-quality-and-the-cortex-label). v11 changed **no fitted constant**: it unified the *rule*, fixed the coronal plane frame, and replaced the one-ribbon reading with the two-ribbon measurement above |
| 6 · claim tier | Every rendered-pixel claim — **the two rows appearing on screen, a toggle repainting the 3D scene / the Plates canvas / the PiP, real pointer and keyboard activation, and whether the v10 audit's 14 failures are now gone** — is **orchestrator-verified only**: Chrome cannot start in the agent sandbox and every browser lane exits **4** ("no check was run"). This section's numbers are the store, the rendered DOM contract, the wired handlers and the executed draw paths |

### Verification (v11 close-out, non-browser)

| Gate | Result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors / 0 warnings · 236 registry entries (0 awaiting a record) · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (`✓ built in 9.40s`) |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** — 10,827 assertions |
| `npm run verify:area-toggles` | **exit 0 (new gate)** — 331 passed · 0 failed, printing the two partition tables |
| `npm run verify:view-filter-consistency` | **exit 0 (new gate)** — 100/100 assertions, 548 + 552 cross-surface comparisons with 0 disagreements |
| `npm run verify:cortical-lobes` | **exit 0** — **564/564** assertions (prints the two-ribbon table and the audit reconciliation) |
| `npm run verify:plane-helper-extent` | **exit 0** — 206 passed · 0 failed (lane A2 settles the `u/v` convention) |
| `npm run verify:division-toggles` | **exit 0** — 250 passed · 0 failed |
| `npm run verify:somatotopy` / `verify:pip-contract` | **exit 0** — 45/0 · 187/0 |
| `npm run verify:audit-checks` | **exit 0** — 92 passed · 0 failed · 7 informational · 9 groups (the DEFAULT-framing mirror is byte-unchanged by v11) |
| `npm run verify:closure-bite` | **exit 0** — 7/7 mutations caught, shared tree byte-identical, restored copy re-runs 92/0 |
| `npm run verify:boundary-contract` / `verify:a11y-contract` | **exit 0** — 22/0 · 38/0 (the a11y gate re-run after `build`, so its shipped-bundle spot check ran) |
| `npm run verify:budget-report` | **exit 0** — 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB, all inside their caps |
| `npm run verify:anatomy` | **exit 1 — environment, not product**: `spawnSync powershell EPERM` before any verdict prints. Red at base, in no v11 task's scope |
| `npm run verify:imaging-fit` | **exit 1 — environment, not product**: `FAIL the fitter could not be re-run: spawnSync node EPERM` (0 assertions run) |
| `npm run verify:audit` | **exit 4 — orchestrator lane only** — it prints its non-browser half here (`v11 source facts: AREAS telencephalon→[telencephalon] · … · ALL_KINDS nucleus, tract, ventricle, surface, vessel, context · AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]} · AXIS_INDEX {"x":0,"y":1,"z":2}`) and then Chrome dies in `mojo::PlatformChannel` (`OpenProcess: Access is denied (0x5)`) |
| `verify:acceptance` / `verify:browser` | **not run and not claimed** |

The **14 `verify:audit` failures** the v10 run recorded (`202 passed / 14 failed`) are accounted for class by
class in [the plan's §7.4](docs/SWARM_V11_PLAN.md): the item-1 convention is fixed on the audit side; the item-4
divergence is retired with the two-ribbon numbers above; the audit-side end-of-run shape reading is unchanged by
v11 and remains orchestrator-verified. Nothing was deleted or weakened to make a failure disappear.

## v13 — the cranial nerves, the seventh system

Plan and closure: [`docs/SWARM_V13_PLAN.md`](docs/SWARM_V13_PLAN.md) (the run's executable contract is
[`PLAN.md`](PLAN.md)). Every number below was printed by the integrator's own non-browser sweep, gate by gate;
the full table with exit codes is in that file's §9.

The ask was to add a **Cranial nerves** slice to the Systems row — which meant **creating the data slice first,
because it did not exist**: the taxonomy already carried the cranial-nerve *nuclei* (17 rows under
`Cranial nerve nuclei`) and the *exit landmarks* (`surf-cn3-exit` … `surf-cn12-exit`), but never the twelve
nerves as records, and there was no kind to slice them by. Two things shipped: a seventh **kind**, `nerve`, and
**twelve records**.

### 1. The twelve records, and where each one lives

One record per nerve, in its **true region** (the taxonomy is the authority) under a single subdivision name,
**`Cranial nerves`**, so all twelve group together inside each region in the tree. `course` is the one string
carrying the cisternal course **and the skull-base foramen**; `connections` **link the ids that already exist**
rather than paraphrasing them.

| # | record | region | course → foramen | nuclei / ids it links | geometry |
| --- | --- | --- | --- | --- | --- |
| I | `nrv-cn1-olfactory` — CN I Olfactory nerve | telencephalon | olfactory fila → **cribriform plate** | `nuc-amygdala`, `nuc-hippocampus`, `nuc-md` | schematic marker, `meshes:false` |
| II | `nrv-cn2-optic` — CN II Optic nerve | telencephalon | optic canal | `tract-optic-nerve`, `ctx-optic-chiasm`, `tract-optic-tract`, `nuc-lgn`, `nuc-pretectal`, `nuc-suprachiasmatic` | schematic marker, `meshes:false` (the v8 optic-pathway **meshes** belong to those three records, not to this one) |
| III | `nrv-cn3-oculomotor` — CN III Oculomotor nerve | midbrain | interpeduncular cistern → **superior orbital fissure** | `nuc-oculomotor`, `nuc-edinger-westphal`, `nuc-pprf`, `nuc-pretectal` | schematic marker, `meshes:false` |
| IV | `nrv-cn4-trochlear` — CN IV Trochlear nerve | midbrain | dorsal exit below the inferior colliculus → **superior orbital fissure** | `nuc-trochlear`, `nuc-pprf`, `nuc-mesencephalic-v` | schematic marker, `meshes:false` |
| V | `nrv-cn5-trigeminal` — CN V Trigeminal nerve | pons | prepontine cistern → **foramen ovale** (V3; V1/V2 superior orbital fissure / foramen rotundum) | `nuc-trigeminal-motor`, `nuc-principal-sensory-v`, `nuc-mesencephalic-v`, `tract-mesencephalic-v`, `nuc-spinal-trigeminal`, `nuc-vpm` | schematic marker, `meshes:false` |
| VI | `nrv-cn6-abducens` — CN VI Abducens nerve | pons | prepontine cistern, **Dorello canal** → **superior orbital fissure** | `nuc-abducens`, `nuc-oculomotor`, `nuc-pprf`, `nuc-vestibular-medial` | schematic marker, `meshes:false` |
| VII | `nrv-cn7-facial` — CN VII Facial nerve | pons | cerebellopontine angle → **internal acoustic meatus**, then stylomastoid foramen | `nuc-facial`, `nuc-superior-salivatory`, `nuc-solitarius-rostral`, `nuc-spinal-trigeminal`, `nuc-vpm` | schematic marker, `meshes:false` |
| VIII | `nrv-cn8-vestibulocochlear` — CN VIII Vestibulocochlear nerve | pons | cerebellopontine angle → **internal acoustic meatus** | `nuc-vestibular-superior/-medial/-lateral/-inferior`, `nuc-cochlear-ventral/-dorsal`, `nuc-superior-olivary`, `nuc-inferior-colliculus`, `nuc-mgn` | schematic marker, `meshes:false` |
| IX | `nrv-cn9-glossopharyngeal` — CN IX Glossopharyngeal nerve | medulla | postolivary sulcus → **jugular foramen** | `nuc-ambiguus`, `nuc-solitarius-caudal`, `nuc-solitarius-rostral`, `nuc-dmv`, `nuc-spinal-trigeminal` | schematic marker, `meshes:false` |
| X | `nrv-cn10-vagus` — CN X Vagus nerve | medulla | postolivary sulcus → **jugular foramen** | `nuc-dmv`, `nuc-ambiguus`, `nuc-solitarius-caudal`, `nuc-solitarius-rostral` | schematic marker, `meshes:false` |
| XI | `nrv-cn11-accessory` — CN XI Accessory nerve | medulla | cranial root from the postolivary sulcus → **jugular foramen**, plus a stated spinal-cord origin | `nuc-ambiguus` | schematic marker, `meshes:false` |
| XII | `nrv-cn12-hypoglossal` — CN XII Hypoglossal nerve | medulla | preolivary sulcus → **hypoglossal canal** | `nuc-hypoglossal`, `nuc-medullary-reticular`, `nuc-inferior-olive-principal`, `nuc-solitarius-caudal` | schematic marker, `meshes:false` |

Measured by `npm run verify:cranial-nerves` (**451 assertions · 0 failed**): 12 registry rows and 12 authored
records of kind `nerve`, the numbers I…XII each exactly once, regions medulla 4 · pons 4 · midbrain 2 ·
telencephalon 2, **24** level-anchor references all resolving, **131** id tokens inside the records with **0**
unresolved (**56** of them nucleus/tract records), **50** clinical items (each nerve ≥ 2, most 4–5), **13,465**
content words, and **12/12** records with a curated web reference. CN II sits in `telencephalon` on purpose: the
three committed v8 optic-pathway rows do, so the registry keeps **one** answer for optic-nerve region.

### 2. The seventh kind — the `nerve` contract

| where | what it is now |
| --- | --- |
| `src/types.ts` `Kind` · `src/data/load.ts` `ALL_KINDS` · `scripts/validate-data.mjs` `KINDS` | **`nerve`**, appended last — 7 kinds. The Systems row renders `ALL_KINDS.map(…)`, so the button exists **because** the kind exists; the store boots it **on** (it throws at module load if a non-telencephalon row's kind is off) |
| `scripts/validate-data.mjs` `SLUG_RE` · `PREFIX_KIND` | `/^(nuc\|tract\|vent\|surf\|vasc\|ctx\|nrv)-[a-z0-9-]+$/` and `nrv → nerve`. The prefix follows the kind in all 248 rows (0 contradictions); the three near-misses `cn3-oculomotor`, `nrv-CN3`, `nerve-cn3` are still rejected |
| `Header.tsx` `KIND_LABELS` | label **Cranial nerves**; accessible name `Cranial nerves — show/hide the nerve system (nerve)` (visible text is a prefix of it, WCAG 2.5.3) |
| `KindGlyph.tsx` · `NucleusMesh.tsx` | glyph `✦`; `KIND_OPACITY.nerve = 1` (opaque, so a marker is pickable) and `hintForKind('nerve') = 'nucleus'` (the gray-matter preset of a schematic placement) |
| `Legend.tsx` · `styles/tokens.css` | palette swatch **Cranial nerves** on `var(--kind-nerve)` = `#14b8a6` — the same teal as `--kind-cn-nucleus`, so "the nuclei of the twelve" and "the twelve" read as one family |

**What the toggle actually reaches** (all measured, `verify:nerve-kind` §3–§6 and `verify:area-toggles` §9):
with `nerve` **on**, all 12 records are admitted to the 3D scene (24 drawn bodies — every nerve is paired) and
0 of 12 tree rows are dimmed; with `nerve` **off**, **0** nerve records are admitted, the other kinds are
untouched, all **12 of 12** tree rows dim, the `Cranial nerves` button flips to `aria-pressed="false"` (the
other six buttons' markup byte-identical), and clicking it again restores the boot rendering byte for byte.

### v13 honest limits, in one place

| Item | Limit (with its number) |
| --- | --- |
| 1 · the twelve nerves are **records with schematic placement markers, not meshes** | No cranial-nerve mesh is committed and none was added. Each record is `meshes: false` with a **sized schematic ellipsoid** at its authored `origin3d`/`size3d` inside the clip box — the same mechanism the hippocampal subfields (`nuc-subiculum`) and the lenticulostriate artery already use — and each record's own `contextNote` says exactly what geometry stands behind it and which committed landmark/envelope it anchors against |
| 2 · **why there is no mesh** | There is nothing to bake: `assets-src/` (`bp3d/canonical/`, 86 OBJs) holds **no cranial-nerve element** beyond the already-baked CN II trio (`tract-optic-nerve-*`, `ctx-optic-chiasm-*`, `tract-optic-tract-*`), and `bp3d/raw*` holds only `FJ*.obj` sources. The GLB budget is **13.82 MiB of a 14 MiB cap — 0.18 MiB of headroom** — and `verify:anatomy` **freezes the existing bounding boxes**, so a new GLB would be both unaffordable and a deliberate re-freeze |
| 3 · the **2D live section and the PiP do not react to this toggle** — **SUPERSEDED BY v14** | *This was true at v13 and is stated here as the record of it.* `SECTION_PARTS` is one entry per committed GLB (138) and **0 of them are of kind `nerve`**, so at v13 `isPartVisible` returned the same 138 parts with the kind on and off. **v14 changed this**: the canvas now draws 138 committed parts + **12 procedurally generated** nerve parts, the *Cranial nerves* toggle flips exactly those 12 (measured: on 12/12, off 0/12), and the worker computes their contours — see [v14](#v14--the-cranial-nerves-as-traveling-tracts) |
| 4 · CN II's meshes belong to other records | `tract-optic-nerve`, `ctx-optic-chiasm` and `tract-optic-tract` keep their v8 geometry; the new `nrv-cn2-optic` is the **nerve as a record** and is mesh-less like the other eleven — the 3D view shows the pathway, not a second copy of it |
| 5 · what is **not** verified here | `verify:anatomy` (27/27) and `verify:imaging-fit` cannot run in the agent sandbox — both die on `spawnSync … EPERM` **before any assertion** (0 assertions run), red at base and in no v13 task's write scope; `verify:audit` / `verify:acceptance` / `verify:browser` need Chrome, which exits **4** here. So "the button is on screen and the markers are drawn" is **orchestrator-browser-verified only**; what this run proves is the shipped data, the shipped decision chain, the rendered DOM contract and the wired handlers |
| 6 · a pre-existing header a11y defect is pinned, not hidden | The four All-module buttons show `All on` / `All off` while their accessible names are `All areas on — …` / `All areas off — …`, so the visible text is not contained in the name (WCAG 2.5.3). `Header.tsx` is outside this run's write scope, so `verify:area-toggles` asserts **exactly those four violations with their exact strings** — a pinned exemption that **fails the moment someone fixes the labels**, which routes the fix instead of burying it |

### Verification (v13 close-out, non-browser)

| Gate | Result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors / 0 warnings · **248 registry entries** (0 awaiting a record) · **7 kinds**: nucleus 88 · tract 53 · ventricle 11 · surface 25 · vessel 14 · context 45 · **nerve 12** · 19 files / 225 records · 23 tracts · 26 syndromes · 15 plates · 17 levels |
| `npm run check` | **exit 0** (`tsc --noEmit` — the five exhaustive `Record<Kind, …>` maps are the coverage proof) |
| `npm run build` | **exit 0** (`✓ built in 9.57s`) |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` / `verify:plane-helper-extent` | **exit 0** — 10,827 assertions · 206/0 |
| `npm run verify:somatotopy` / `verify:cortical-lobes` | **exit 0** — 45/0 · 564/564 |
| `npm run verify:pip-contract` / `verify:division-toggles` | **exit 0** — 187/0 · 251/0 |
| `npm run verify:view-filter-consistency` | **exit 0** — 102/102 assertions, 7 regions × 7 kinds (the nerve kind included), 548 cross-surface comparisons |
| `npm run verify:area-toggles` | **exit 0** — **437 assertions · 0 failed** in 14 groups. **Red at base (225 passed / 25 failed)** on the pre-v12 header contract; re-pointed by the review task, and the product was **not** bent back (no preset row, no `data-preset`, no `data-header-action`) |
| `npm run verify:audit-checks` | **exit 0** — 92 passed · 0 failed · 7 informational · 9 groups |
| `npm run verify:closure-bite` | **exit 0** — 7/7 mutations caught, shared tree byte-identical, restored copy re-runs 92/0 |
| `npm run verify:boundary-contract` / `verify:a11y-contract` | **exit 0** — 22/0 · 38/0 (the a11y gate re-run after `build`, so its shipped-bundle spot check ran) |
| `npm run verify:budget-report` | **exit 0** — 599,204 tris · GLB 13.82 MiB (cap 14, headroom 0.18) · imaging 9.02 MiB (cap 10) |
| `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | **exit 0** — v4 imaging QA PASSED · `verify-imaging-v4b: OK` (22/22 cryosections re-decoded) |
| **`npm run verify:cranial-nerves`** *(new gate)* | **exit 0** — **451 assertions · 0 failed**, 16 printed measurements: 12/12 records, `meshes:false` 12/12, placements inside `CLIP_BOUNDS` 12/12, manifest parts of kind `nerve` **0**, manifest still 138 |
| **`npm run verify:nerve-kind`** *(new gate)* | **exit 0** — **79 passed · 0 failed** in 9 groups; the bite catches **8/8** defective kind tables by name (a check that cannot fail is not evidence) |
| `npm run verify:anatomy` | **exit 1 — environment, not product** — `spawnSync powershell … EPERM` before any verdict; the 27 items are **not** claimed here |
| `npm run verify:imaging-fit` | **exit 1 — environment, not product** — `FAIL the fitter could not be re-run: spawnSync node.exe EPERM` (0 assertions run) |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **not run and not claimed** — Chrome cannot start in the sandbox (exit **4**, "no check was run"); orchestrator lane |

The v11 carry-over defect (the canvas painting divisions the rule excludes at y = 6/26/30/32) was re-measured
with the canvas' **own** `buildLobeLayer` over both committed ribbons: **parity 6/6** — y=6 paints 5 divisions,
**not** NONE — so its measured cause was the v11 reading's left-ribbon-only slice, and nothing in the product
was changed to satisfy it.

## v14 — the cranial nerves as traveling tracts

Plan and closure: [`docs/SWARM_V14_PLAN.md`](docs/SWARM_V14_PLAN.md) (the run's executable contract is
[`PLAN.md`](PLAN.md)). Every number below was printed by the integrator's own non-browser sweep, gate by gate;
the full table with exit codes is in that file's §8.

v13 added the twelve cranial nerves **as records**, each with a schematic ellipsoid placement marker — which is
what you saw as **blobs**. v14 gives them **real course geometry**: a cranial nerve is a bundle that leaves the
brainstem at a **root**, crosses the **cistern**, traverses a named **skull-base foramen** and reaches its
**target**, so it is drawn as a Catmull-Rom path with a radius through the project's existing `TractTube`
machinery — in the 3D view **and** in the 2D live section. **The blobs are gone, not stacked on.**

### 1. The twelve courses, root to target (measured)

`len au` / `len mm` are the published **chord** length (straight segments between waypoints); `drawn` is the
Catmull-Rom arc the tube actually integrates. The **root** column is the course's first waypoint: the committed
nucleus `origin3d` for the ten nerves that have a brainstem root, the epithelium for CN I, the orbital end of
the committed optic-nerve chain for CN II.

| nerve | root au | foramen | target | wp | len au / mm | drawn au / mm | r au | calibre mm → r |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I Olfactory | [11, 9, 66] | cribriform plate | olfactory bulb → tract → primary olfactory cortex | 5 | 18.51 / 22.2 | 18.52 / 22.2 | 0.71 | 1.7 |
| II Optic | [26, 16, 57] | optic canal | optic chiasm → tract → LGN | 5 | 42.42 / 50.9 | 42.69 / 51.2 | 1.67 | 4.0 |
| III Oculomotor | [0, 14, −4] | superior orbital fissure | recti, inferior oblique, levator palpebrae; ciliary ganglion | 6 | 44.23 / 53.1 | 44.63 / 53.6 | 1.25 | 3.0 |
| IV Trochlear | [0, 8, −5] | superior orbital fissure | contralateral superior oblique | 7 | 41.21 / 49.5 | 42.10 / 50.5 | 0.42 | 1.0 |
| V Trigeminal | [4, −8, 4] | foramen ovale | face and anterior scalp; muscles of mastication, tensor tympani, mylohyoid | 7 | 30.64 / 36.8 | 30.85 / 37.0 | 1.88 | 4.5 |
| VI Abducens | [1.5, −18, −4] | superior orbital fissure | lateral rectus | 8 | 51.85 / 62.2 | 52.44 / 62.9 | 0.79 | 1.9 |
| VII Facial | [4, −19, −2] | internal acoustic meatus | muscles of facial expression, stapedius, stylohyoid, taste | 8 | 52.94 / 63.5 | 54.88 / 65.9 | 0.79 | 1.9 |
| VIII Vestibulocochlear | [3.5, −14, −5.5] | internal acoustic meatus | cochlear and the four vestibular nuclei | 8 | 48.64 / 58.4 | 49.56 / 59.5 | 1.17 | 2.8 |
| IX Glossopharyngeal | [3.5, −31, −4] | jugular foramen | stylopharyngeus, parotid, carotid body and sinus, taste | 7 | 40.82 / 49.0 | 41.56 / 49.9 | 0.83 | 2.0 |
| X Vagus | [2, −32, −7] | jugular foramen | pharyngeal and laryngeal muscles, thoracic and abdominal viscera | 8 | 44.31 / 53.2 | 44.95 / 53.9 | 1.00 | 2.4 |
| XI Accessory | [3.5, −31, −4] | jugular foramen | sternocleidomastoid and trapezius | 8 | 48.93 / 58.7 | 49.57 / 59.5 | 0.63 | 1.5 |
| XII Hypoglossal | [0, −31, −4] | hypoglossal canal | intrinsic tongue muscles, genioglossus, hyoglossus, styloglossus | 7 | 36.11 / 43.3 | 36.44 / 43.7 | 0.75 | 1.8 |
| **total** | 84 waypoints | 12 named foramina | — | **84** | **500.62 / 600.7** | **508.20 / 609.8** | 0.42–1.88 | **r = d ÷ 2.4** at 1 au = 1.2 mm |

**Anchored, not free-hand.** Ten of the twelve carry their own committed exit landmark (the `surf-cn3-exit` …
`surf-cn12-exit` surface records) as a **literal waypoint at 0.000 au**, and all ten start on the committed
nucleus `origin3d` they name (CN XI starts on `nuc-ambiguus`), also at **0.000 au**. The radii are converted
from **cisternal-segment calibres** (dissection / high-resolution-MRI ranges, with the mm figure and the range
both in `docs/SWARM_V14_PLAN.md` §2) and are genuinely non-uniform — **0.42 au (CN IV) to 1.88 au (CN V)**.
Every waypoint is inside `CLIP_BOUNDS`, minimum clearance **6.00 au** (CN I).

### 2. One body per nerve — the blob is retired, not covered

The structure pass returns `null` for any record that has a course, so a nerve with a course stops drawing its
schematic marker: the shipped XOR table prints `tube = yes` **and** `marker would-draw = no` **and**
`section part = yes` for all twelve. `hasNerveCourse(id)` is true for exactly the 12 course ids and false for a
real tract. The honesty statement that a course is an **authored path, not a segmented scan, ships in each
course's `anchorNote` (432–692 characters) and the gate asserts it in both halves.

### 3. Both surfaces — 3D tubes and 2D procedural contours

| surface | what it shows | the evidence |
| --- | --- | --- |
| **3D scene** | one tapered tube per nerve (12), mounted by the `SceneLayers` nerve-course pass | the kind truth table, executed through the **shipped** `isTractVisible`: all on → 23 tracts + **12/12** nerves; **tract kind off → 0/23 tracts but 12/12 nerves**; **nerve kind off → 23/23 tracts but 0/12 nerves**; both off → 0 + 0; midbrain area off → 19 tracts + 10 nerves. **The wrong-toggle trap the run was warned about is fixed at the line that held it** — `isTractVisible` now reads the record's **own registry kind** instead of the literal `'tract'` |
| **2D live section + PiP** | **route (a): procedurally generated parts.** `registryNerveParts()` feeds the 12 tubes through the **existing** `registryPartFromGeometry(meta, geometry)` adapter, so the 3D tube and the 2D contour are the **same geometry by construction** | 12 registry parts (803 verts / 1,440 tris each); the **shipped worker machinery** (`partBounds` / `boundsMayCut` / `extractContours`) run over them: **38 planes → 121 closed loops, 0 non-finite**; the courses gate sweeps three orthogonal plane sets per nerve: **576 crossing planes → 689 contour loops**. `partsForCanvas()` = 138 committed + 12 procedural = **150**, and the *Cranial nerves* toggle flips exactly those 12 (`verify:area-toggles` §11: on **12/12**, off **0/12**, committed admissions byte-identical) |

**Why not bake the tubes into GLBs.** Measured: one tube at `TractTube`'s 72 × 10 sweep is 803 verts /
1,440 tris = **33.5 KiB** raw / **14.7 KiB** quantized; the twelve are **0.3929 MiB raw / 0.1724 MiB
quantized** (`0.3448 MiB` for 24, both sides). The binding budget is the `src/assets/anatomy/` directory —
**13.8914 MiB of the 14 MiB cap, 140 files, headroom 0.1086 MiB** — so the bake misses by **1.6× at best**
and by **3.6×** at the honest reading, before the JSON chunk or any left/right duplication. Route (a) costs
**0 bytes**: the manifest is still **138 parts / 599,204 tris**, `Σ stat(parts[].file)` is still
**14,486,228 B**, and no committed GLB, manifest row or bounding box moved.

### v14 honest limits, in one place

| Item | Limit (with its number) |
| --- | --- |
| 1 · **the courses are AUTHORED PATHS** | Every one of the twelve is a path authored through documented landmarks — root (a committed nucleus `origin3d`), cisternal segment, named skull-base foramen, target — with a radius converted from a stated calibre. **They are not segmented scans, not tractography, and not a dissection.** No skull-base, dural-sinus or orbit mesh is committed, so **every foramen position is authored from anatomy**, not measured from geometry; each course's `anchorNote` says so in the record itself |
| 2 · **CN II is stated separately — and it is the one place the rule is not met** | `nrv-cn2-optic` is the one nerve with committed geometry behind it (the v8 `tract-optic-nerve` / `ctx-optic-chiasm` / `tract-optic-tract` meshes). Its authored tube **overlaps the baked `tract-optic-nerve-l` GLB** (x 26.2 au, y 1.9 au, z 36.8 au of overlap), and the mesh belongs to a **different** record, so both bodies render. That is a second optic nerve, and the fix is a data decision carried forward in `docs/SWARM_V14_PLAN.md` §6.1 — it was **not** quietly papered over. Its chain is anchored on the committed optic-nerve waypoints (0.000 au at both ends, worst interior 6.595 au), **not** on the `surf-optic-chiasm` landmark its own `anchorId` still names (which disagrees with the mesh by ~7 au) |
| 3 · **CN I is stated separately** | CN I has **no brainstem root and no exit landmark** (`surf-cn1-exit` does not exist and no olfactory nucleus record exists). Its chain runs the other way — epithelium **[11, 9, 66]** → bulb/tract → and **ends** on its own committed `origin3d` **[8, 12, 48]** (0.000 au). Nothing behind the anterior end is committed geometry, which the gate prints rather than hides |
| 4 · **the twelve records' own `contextNote` still describes the retired ellipsoid** | The ellipsoid no longer renders, but the note still reads "the ellipsoid at `origin3d` … is a SCHEMATIC placement". `src/data/structures/*-cranial-nerves.json` was outside this run's write scope, so it is reported, not silently edited: the **data model** the note describes (`meshes:false`, sized placement, no manifest part) is still accurate, and the authored-path statement ships in the course's `anchorNote` |
| 5 · **the published length understates the drawn tube by 1.5 %** | The gate prints the chord sum **500.62 au = 600.74 mm**; the drawn Catmull-Rom tube is **508.20 au = 609.84 mm**. Both are published above — the earlier plan estimate (475.79 au) is superseded |
| 6 · **what is not verified here** | `verify:anatomy` (27/27) and `verify:imaging-fit` die on the sandbox's piped-child-stdio denial **before any verdict** (red at base, 0 assertions); the blocked anatomy measurement re-run directly returns **14,566,178 B**, i.e. unchanged. **Chrome cannot start here**, so *"the tubes are painted on screen"*, *"the button toggles them on screen"*, *"the section and the PiP paint the contours"* and *"click-select works"* are **orchestrator-browser-verified only** — the browser proof of 2D parity is `verify:audit` **R3b**, re-pointed by this run's review to assert the Plates hash **changes** and round-trips |

### Verification (v14 close-out, non-browser)

| Gate | Result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors / 0 warnings · 248 registry entries · 7 kinds (nerve 12) · 19 files / 225 records · 23 tracts |
| `npm run check` · `npm run build` | **exit 0** · **exit 0** (`✓ built in 9.08s`) |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` / `verify:plane-helper-extent` | **exit 0** — 10,827 assertions · 206/0 |
| `npm run verify:somatotopy` / `verify:cortical-lobes` | **exit 0** — 45/0 · 564/564 |
| `npm run verify:pip-contract` / `verify:division-toggles` | **exit 0** — panel contract PASSED · 251/0 |
| `npm run verify:view-filter-consistency` | **exit 0** — 102/102 · 138 parts · 225 structures · 23 tracts · **7 regions × 7 kinds** · 548 cross-surface comparisons |
| `npm run verify:area-toggles` | **exit 0** — **455 assertions · 0 failed · 14 groups**, including §11's 2D nerve parity (on 12/12, off 0/12) and the dead-click guard (4/4 mutated variants caught) |
| `npm run verify:audit-checks` / `verify:closure-bite` | **exit 0** — 92/0 · 7/7 mutations caught, shared tree byte-identical |
| `npm run verify:boundary-contract` / `verify:a11y-contract` | **exit 0** — 22/0 · 38/0 |
| `npm run verify:budget-report` | **exit 0** — 599,204 tris · parts **13.82 MiB** · tree **13.89 MiB / 140 files** (cap 14) · imaging 9.02 MiB |
| `npm run verify:cranial-nerves` / `verify:nerve-kind` | **exit 0** — 451/0 · 79/0 |
| **`npm run verify:cranial-nerve-courses`** *(new)* | **exit 0** — **220 assertions · 0 failed**, the twelve-row probe table, 84 waypoints, 10/10 exit landmarks at 0.000 au, 12/12 foramina named, min clearance 6.00 au, **689 worker contour loops** |
| **`npm run verify:cranial-nerve-render`** *(new)* | **exit 0** — **47/47 assertions**, 3D tubes 12/12 with the four-state toggle table, 2D parts 12, **121 contour loops over 38 planes**, XOR-with-the-marker 12/12, payload unchanged |
| `npm run verify:anatomy` / `verify:imaging-fit` | **exit 1 — environment, not product** (`spawnSync powershell` / `node.exe` EPERM, 0 verdicts; the anatomy measurement re-run directly = 14,566,178 B) |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **not run and not claimed** — Chrome cannot start in the sandbox; orchestrator lane |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 with HMR |
| `npm run build` | Type-safe production build (`vite build`) → `dist/` |
| `npm run check` | `tsc --noEmit` over `src/` |
| `npm run validate` | Data-integrity gate: JSON shape, canonical-coordinate bounds, id/slug uniqueness, plate↔SVG↔taxonomy referential integrity, syndrome id resolution, unique display names (`scripts/validate-data.mjs`) |
| `node scripts/build-anatomy-geometry.mjs --manifest` | Anatomy asset gate: rebuilds the manifest from the committed GLBs and enforces the v2 perf budgets (exit 1 = over budget) |
| `node scripts/build-mri-grid.mjs` | MRI bake gate: resamples the CC0 OpenNeuro T1w into the canonical uint8 grid + manifest + QA preview PNGs (exit ≠ 0 on registration-QA violation) |
| `node scripts/build-ct-grid.mjs` | CT bake gate: resamples the NLM Visible Human head CT DICOM series into the canonical uint8 grid (HU) + manifest with `brain`/`bone` windows + QA previews; `--tune` re-runs the registration search (exit ≠ 0 on QA violation) |
| `node scripts/verify-imaging-v4.mjs` | Real-imagery QA gate (no bundler/browser): re-derives anchoring + reachability of all **49** plane-anchored photographs (24 UBC/Commons v4 + **22 v4b NLM cryosections** + 3 Commons CT) against the clip-slider range, checks every plate is the unambiguous nearest plate at its own plane, checks the transverse `levelId` mappings against `levels.json`, asserts the §2.2 orientation tables of the 2D canvas and the GPU PiP agree with `docs/SECTION_SYNC_PLAN.md` §2.2, checks every verbatim credit line in code + docs (including the NLM acknowledgement and the frozen-2026-09-10-snapshot statement), verifies asset/manifest completeness, prints the per-source payload breakdown and enforces both payload budgets (exit ≠ 0 on any violation) |
| `node scripts/verify-imaging-v4b.mjs` | **v4b cryosection QA gate** (the `v4c-qa` review artifact): re-derives the v4b claims from the committed sources — the 22 manifest entries against the placement formula, the reachable slider range and the > 1.5 au spacing rule that keeps every plate the nearest at its own plane; each plate's JPEG header, size and curated byte count; the exact NLM structure/marker (`SOF` 528 × 764, `EOI` present, baseline only); the verbatim acknowledgement + fetch date + frozen-snapshot statement in all five records; the NLM host and per-plate index of every `sourceUrl`; no link-out-only source; that the registration record discloses the row direction and the mirror as unproven where their statistics are sub-threshold; the ≤ 8 MiB / ≤ 1.75 MB payload budgets; and that the pre-v4b manifest is intact and still comes first (exit ≠ 0 on any violation). **v7 update:** the total-payload cap this gate enforces was raised **8 MiB → 10 MiB** by `docs/TELENCEPHALON_PLAN.md` §2/§4 (AMENDMENT B makes both uint8 grids `[81, 113, 107]` = 979,371 B each); the cryosection sub-cap is unchanged |

| `npm run verify:plane` | **One-plane-transform gate** (`scripts/verify/plane-transform.mjs`): imports the shipped `src/components/section/planeGeometry.ts` (never a copy) and asserts that the 2D canvas, the section panel and the backdrop sampler agree on the world→screen mapping for a grid of axes/planes/viewports and that the orientation badge table is derived from projected pixels (10 827 assertions). **v9:** the panel no longer renders a 3D scene, but the gate still parses its source for the `SECTION_VIEWS` table and the `planeTransform(` call (PLAN §7.15), so the orientation contract is unchanged. Also prints the pre-existing coronal camera-basis degeneracy it does **not** fail on |
| `npm run verify:plane-helper-extent` | **v10 plane-helper gate, no browser** (`scripts/verify/plane-helper-extent.mjs`, created by the v10 `plane-helpers-extent` task): 196 assertions in four lanes — (A) the shipped pure `planeHelperGeometry(axis, value)` derivation plus a 2D-canvas cross-check against `planeGeometry.axisExtents`, printing the per-axis quad W×H, the measured world u/v rectangle and the cell sizes; (B) the **shipped component's render path** executed (project TypeScript transpile + a repo Node hook) with its element tree walked, so the quad's four corners and every grid vertex are transformed through the shipped rotation and must land on the `CLIP_BOUNDS` rectangle, plus material/renderOrder/raycast/gating/geometry-identity; (C) the source with comments **and string payloads** stripped must contain no extent literal, must import `CLIP_BOUNDS` and must build exactly one `BufferGeometry` outside the render path; (D) the bite — `clipPlanes.ts` mutated in a scratch copy (58→70, 116→130, −76→−90) must move every quad, and the shipped files' SHA-256 are printed identical before/after. Also shown to bite on four in-place mutations of `PlaneHelpers.tsx` (pre-v10 literal → 165/28 failures, u/v swap → 150/43, fixed line count → 181/12, rotation dropped → 184/9), file restored byte-identical |
| `npm run verify:pipeline` | Section-pipeline gate: slices every committed anatomy GLB through 13 planes and asserts the contour engine's loop/segment invariants (138/138 parts, no problems) |
| `npm run verify:somatotopy` | **v9 somatotopy gate, no browser** (`scripts/verify/somatotopy.mjs`, PLAN §5.6 also wires the bare alias `npm run somatotopy`): 45 assertions on the M1/S1 map — registry-first resolution of all 16 ids, the committed placement table inside `CLIP_BOUNDS` (including the mirrored −x extents), somatotopic order monotone in arc length **and** in canonical x on both strips, 8/8 M1↔S1 pairing, patch contact re-measured against the committed ribbon GLB, the one colour ramp, and the overlay's wiring read as source text |
| `npm run verify:cortical-lobes` | **v9 cortical-division gate, no browser** (`scripts/verify/cortical-lobes.mjs`): **v10 rewrote it to 519 assertions** — the six divisions and their 12 labels (full + short), per-plane shares with the per-plane absence list printed, containment (no classified cell outside the ribbon, no invented run point, runs form a closed chain), determinism under a repeat and a reversed sweep, 17 pinned anatomical spot checks, the legend's real JSX rendered through `react-dom/server` carrying the caveat, and `section-pipeline.mjs` re-run as a child. **v10 groups C–F** add the run-quality rule: the three floors read from the shipped constants, the printed **per-plane per-division arc/area table**, the sliver census (`arc < 2 / < 5 / < 10`, `area < 1 / < 10`, 1-vertex — all **0** over the 47 painted reference-plane runs), the dropped-loop census, the independent **raw** re-cut that shows 23 of 72 spans sub-threshold under the unchanged classification, the 49-plane user-grid sweep, and a real `react-dom` render proving `ctx-cerebral-cortex`'s chip is suppressed while the thalamus envelope's still renders. Shown to bite on six in-place mutations (paint floor, floors not gating absorption, un-gated hover label, un-gated chip, vertex-count label competition, filtered contour), each exiting 1, files restored byte-identical |
| `npm run verify:pip-contract` | **v9/v10 simulated-section panel gate, no browser** (`scripts/verify/pip-contract.mjs`): **187 assertions in 6 groups** (v10 added group F) — the panel mounts the shared 2D renderer (one canvas, no WebGL context, no `PlaneHelpers`), 12 retired GPU-renderer tokens absent from its code, the imagery scope started in an effect + the pixel guard shadowing the two blit calls, the surviving chrome (axis override, readout shape, badges from `planeGeometry.PLANE_BADGES`, hide/restore, the ≤900 px tab literals), and the size control's arithmetic — clamp window pinned to 224–880 × 170–640 px, totality over 0/negatives/`NaN`/±∞, idempotence, small⇄large cycle, persistence key. **Group F (v10 item 3)** adds the four corner handles with four distinct corner-naming accessible names, the corner table and render order, the plan's exact numbers, an independent re-derivation, the **local-frame geometry proof** (dragged corner on the pointer, opposite corner bit-identical, one-axis drags leave the other axis alone, still fixed at the clamp bound), the keyboard/wiring non-regression and the stylesheet anchors. Its header states the zustand-4 static-render limit that decides how the markup half is asserted; its own bite check catches **6/6** mutations in an isolated copy |
| `npm run verify:division-toggles` | **v10 division-visibility gate, no browser** (`scripts/verify/division-toggles.mjs`, new): 250 assertions in 10 groups, importing the **shipped store** through an in-process TS/TSX loader (the `audit-checks.test.mjs` technique) — the exported contract the Legend calls; the four divisions equal the documented ones and **partition** `ALL_REGIONS` (no region in two divisions, none unreachable); a fresh boot still reports `brainstem-focus` with the vasculature region off and the vessel kind on; `solo` leaves exactly one division's regions on for all four (action + pure function, idempotent, printed per division); the checkbox path is a union that is idempotent, empties a complete division and restores the previous set exactly; the arteries are never swept into a division (7×4 matrix printed); kinds/hidden/emphasis set-equal after every call; a **real `react-dom` render** yields 4 checkboxes + 4 solo buttons with distinct accessible names above the region rows; and group 10 drives the **shipped handlers** in an isolated copy capturing 7 states (boot `[true,true,true,false]` → solo(mesencephalon) → checkbox off/on → vascular checkbox ± → solo(prosencephalon)). Bite: four injected defects each caught by a named check, plus a mutated `DIVISIONS` table (arteries folded into the hindbrain) tripping the store's own load-time assertion |
| `npm run verify:area-toggles` | **v11 Areas/Systems toggle-row gate, no browser** (`scripts/verify/area-toggles.mjs`, new): **331 assertions in 10 groups**, importing the **shipped store and the shipped `Header.tsx`** through the in-process TS/TSX loader the other Node gates use — the exported area contract the header calls (`AREAS`, `areaRegions`, `areasOf`, `areaLayersOn`, `ALL_ON_LAYERS`); the **Area partition printed as a table** (button · regions · taxonomy rows · boot state: 85/39/25/40/33/14 = 236 over 7 regions owned exactly once, no region in two areas and none unreached); the rhombencephalon split proven at the vesicle boundary (metencephalon + myelencephalon = the division, medulla alone); the Systems row = `ALL_KINDS` in order with its own row counts (88/53/11/25/14/45 = 236); the shipped `AREAS` equal to the table **reconstructed from `DIVISIONS`** and to the region sets parsed out of the store's own source text (a hardcoded list that drifts fails); every area toggle adding/removing **exactly** its regions through the real store action *and* the real `onClick` (a child probe fires all twelve buttons), leaving kinds/hidden/emphasis set-equal; the unchanged default (`viewPresetOf(DEFAULT_LAYERS) === 'brainstem-focus'`, boot row `[true,true,true,true,true,false]`); Reset reproducing the default exactly from a dirty state and after All; a real `react-dom` render of the header (6 + 6 + 9 buttons, labelled groups, distinct accessible names, visible text a prefix of each name, no `div` impersonating a button); and a bite half — four injected defects caught by named checks plus two load-time mutations that make the store exit 1 naming the partition defect |
| `npm run verify:view-filter-consistency` | **v11 one-visibility-decision gate, no browser** (`scripts/verify/view-filter-consistency.mjs`, new): **100/100 assertions** — sweeps **138 section parts · 213 structure records · 23 tracts · 10 envelope slots · 2 ghost shells** through **7 areas × 6 systems** in 4 states each, comparing the 2D/PiP decision (`isPartVisible`) with the 3D primitive (`layersAdmit`) and joining both surfaces on the taxonomy id: **548 cross-surface comparisons and 0 disagreements**, area-off/kind-off/both-off concealing **every** owned body on every pass, and **0 of 138** parts with an undecidable region (the silent-bypass class). It prints the per-area and per-system hide tables, asserts `isPartVisible` is the **only** layer read in `SectionCanvas.tsx` and that `SceneLayers.tsx`'s component body holds **zero** direct region/kind reads, executes the shipped `buildLobeLayer` over **both** committed ribbon GLBs (division parity **5/5** planes; area off ⇒ 0 ribbons / 0 divisions even with the unfiltered catalogue, 75 `Path2D`s / 2233 `lineTo` proving the pass stroked), and bites: removing the canvas' layer gate in a scratch copy paints 5 divisions with the telencephalon off where the shipped pass paints 0, and a canvas-private rule filter diverges from the shared rule (`SectionCanvas.tsx` SHA-256 identical before/after) |
| `npm run verify:cranial-nerves` | **v13 cranial-nerve records gate, no browser** (`scripts/verify/cranial-nerves.mjs`, new): **451 assertions · 0 failed · 16 printed measurements**, reading the twelve records through the **shipped data layer** (`src/data/load.ts` — the real selector, not a re-typed copy), `CLIP_BOUNDS` from the shipped runtime declaration, the manifest from `src/assets/anatomy/anatomy-manifest.json`, and the id contract **parsed out of `scripts/validate-data.mjs` and executed**, so the gate cannot drift from the regex that accepts the ids. It counts what no other gate counts: 12 taxonomy rows and 12 authored records of kind `nerve` (no registry-only stub), each nerve number I…XII exactly once, all 12 ids accepted by that `SLUG_RE`, the true regions 2/2/4/4 with the one subdivision `Cranial nerves` (and `Cranial nerve nuclei` still at its 17 rows), laterality/colour/name agreeing with the registry, **24** level anchors resolving, **131** id tokens inside the records with **0** unresolved, the named links per nerve, the foramen name in each `course`, ≥2 clinical items with an explicit localisation, ≥2 refs and a curated web reference, and the geometry: **12/12 `meshes:false`**, **12/12** sized placements inside `CLIP_BOUNDS`, **0** manifest parts of kind `nerve`, **0** `nrv-*` GLBs, manifest still **138** parts |
| `npm run verify:nerve-kind` | **v13 kind gate, no browser** (`scripts/verify/nerve-kind.mjs`, new): **79 assertions · 0 failed** in **9 groups**. It imports the **shipped** `load.ts`, `Header.tsx`, `Legend.tsx`, `KindGlyph.tsx`, `NucleusMesh.tsx`, `SceneLayers.tsx` and `store.ts` through the in-process TS/TSX loader the other Node gates use, renders the real components with `react-dom` **and** through a live hook dispatcher (zustand 4 hands React's *server* renderer the boot snapshot, so a post-toggle re-render is only readable on the client path), and reads the two declaration sites that cannot be imported (`validate-data.mjs` runs on import; `types.ts` is types-only) as parsed data. It proves the kind is declared in **every** site and the sites **agree** (ALL_KINDS ≡ validator `KINDS` ≡ the `Kind` union ≡ the `KIND_GLYPH`/`KIND_OPACITY` key sets, seven kinds, `nerve` last); the slug contract accepts all 12 `nrv-*` ids, still rejects the four near-misses, and finds **0** prefix/kind contradictions over all **248** rows; the rendered `<Header />` carries **one Systems button per `ALL_KINDS` entry, in order**, the seventh reading exactly **Cranial nerves** with `data-kind`, `aria-pressed`, `type="button"` and a WCAG-2.5.3-correct accessible name; the Legend has a palette swatch **and** a toggle row per kind, the `Cranial nerves` swatch on a token `tokens.css` really defines; **the shipped `onClick` handler is called** and the toggle removes exactly `nerve` from `layers.kinds` while `regions`/`hidden`/`emphasis` stay set-equal, with the round trip rendering byte-identically to boot; a synthetic `nrv-*` record is admitted by the shipped `isStructureVisible` iff the kind is on, at opacity 1 with the gray-matter hint; and its **bite** runs the *same* contract checker against **8 defective kind tables**, each caught by name |
| `npm run verify:cranial-nerve-courses` | **v14 course-geometry gate, no browser** (`scripts/verify/cranial-nerve-courses.mjs`, new): **220 assertions · 0 failed**. It reads the twelve authored courses through the repo's own TS loader — so it verifies the table the two surfaces actually render — and asserts, per nerve and with every number printed: ≥ 3 finite waypoints; `tubeRadius` finite, > 0, equal to `calibreMm ÷ 2.4` at 1 au = 1.2 mm and equal to the plan's table (1.7/4.0/3.0/1.0/4.5/1.9/1.9/2.8/2.0/2.4/1.5/1.8 mm → 0.71/1.67/1.25/0.42/1.88/0.79/0.79/1.17/0.83/1.00/0.63/0.75 au); the nerve's **own exit landmark carried as a literal waypoint** (measured deviation **0.000 au** for all ten that have one, tolerance 2 au) and the chain **starting on the committed nucleus `origin3d`** it names (0.000 au); the documented foramen **named in the record and present in its own course sentence**; every waypoint inside `CLIP_BOUNDS` with the printed minimum clearance (**6.00 au**, CN I); length in **au and mm**; and the direction/modality/origin/target/decussation/function/clinical/levels/refs content. It then **executes** the rendering claims: the 23 tracts + 12 courses through the shipped `isTractVisible` (kind gating, `hasNerveCourse`, the structure pass dropping a record that has a course) and each course's tube through the **section worker's own** `boundsMayCut`/`extractContours` (**576 crossing planes → 689 loops**, per-plane counts printed). Its probe table is the twelve-row root · foramen · target · length table |
| `npm run verify:cranial-nerve-render` | **v14 render-parity gate, no browser** (`scripts/verify/cranial-nerve-render.mjs`, new): **47 assertions · 0 failed**. It mounts nothing and paints nothing (Chrome cannot start here) — it **executes the shipped modules** through the same in-process loader and proves: **12 tubes in the scene's tract list**, with the four-state toggle truth table printed (all on 23+12 · **tract off → 0 tracts but 12/12 nerves** · **nerve off → 23/23 tracts but 0/12 nerves** · both off 0+0 · midbrain off 19+10 · a preset-hidden id 11) — i.e. the mis-gating trap is closed in both directions; **12 section registry parts** (803 verts / 1,440 tris each, `maxIndex 802 < 803`) whose contours the **shipped** `partBounds`/`boundsMayCut`/`extractContours` compute over 38 planes (**121 closed loops, ≥ 1 crossing plane with ≥ 1 loop per nerve, 0 non-finite**); the **XOR** — a nerve renders a tube **or** a marker, never both, for all twelve; the shared-builder claim read as source; and the payload re-measured (**138 manifest parts, 0 `nrv-*` GLBs, 599,204 tris, 13.8151 MiB of parts / 13.8914 MiB of tree**). A bite flips the literal `'tract'` back into `isTractVisible` and the nerve-off row goes from 0 to 12 shown |
| `npm run verify:imaging-fit` | **v9 imaging-registration gate** (`scripts/verify/imaging-fit.mjs`): re-runs the fitter and requires every committed number to equal the recomputation — grid bytes frozen against `HEAD`, per-plane and mean residuals, `applied` vs the record's own gate, every accepted plate present in `src/data/sectionImages.ts` as a `fittedFit` and every rejected one absent, the 49 JPEG plates recorded as `unmeasurable: no-decoder`, and `imageLayers.ts` preferring `fittedFit`. **RED in the agent sandbox** — the gate re-runs the fitter as a piped child and the sandbox denies it (`spawnSync node EPERM`, **0 assertions run**); when driven through a byte-identical copy with the captured fitter JSON it completes with 289 assertions / 20 failures (18 real, 2 copy artifacts) — the exact failures are in the [v9 section](#verification-v9-close-out-non-browser) |
| `npm run verify:audit-checks` | **Audit check mirror, no browser** (`scripts/verify/audit-checks.test.mjs`, exposed as an npm script at v9 close-out; it was previously run as a bare `node` command): runs the *same* pure predicates the runtime audit uses (`scripts/verify/checks.mjs`) against the **shipped manifests and the shipped sources** — CT coverage honesty driven by the real `ct-manifest.json` and `ctCoverageStatement()`, the brainstem-focus default and the preset region guard (imported from the real store), the `?panelfail` containment demonstration (drives the real `PanelErrorBoundary` through the real throw: `probes === 1`, correct surface, Retry recovers), the context-loss DOM contract including the "overlay is outside `<Canvas>`" and "PostFX returns null while lost" root causes, and the modality sweep in both directions. It also re-derives the three budget numbers and checks the telencephalon data/plate inventory. **This is a mirror, not a browser test**: it proves the decision logic and the shipped code contract, never that pixels appeared. **v10: measured 92 passed · 0 failed · 7 informational · 9 groups (exit 0)** — the dimmed-row predicate carries the documented vasculature exemption *and* the assertion that pins it (*"the 14 vascular rows are off at default framing through the REGION layer only…"*), which supersedes the v9 close-out note that this gate was red |
| `npm run verify:audit` | **Self-sufficient runtime audit** (`scripts/verify/audit.mjs`): starts Vite itself when nothing answers at the target URL, drives headless Chrome over the DevTools Protocol through the whole feature surface, and stops the server again on every exit path. Includes the two P0 gates — simulated WebGL context loss via `WEBGL_lose_context` (overlay appears, canvas recovers) and a **forced render throw** through the dev-only `?panelfail=<surface>` hook (the failure is contained, the app keeps working, Retry restores the panel). Pass an existing URL to reuse a running server. **v7 closure:** every load-bearing verdict is now decided by `scripts/verify/checks.mjs`, the run uses a **fresh Chrome profile per run** plus a `localStorage`/`sessionStorage` clear before the boot read (so a persisted `neuroaxis.viewPreset` can never masquerade as a wrong default), and the CT/modality checks are coverage-aware. **v9:** the PiP checks were re-pointed at the simulated-section panel (structure at boot, per-axis badges + readout, resizable/persisted/preset/hide+restore, the panel's independence from the Plates modality) and the retired `.pip-backdrop-hint` / `.pip-context-lost` checks now assert the **absence** of the retired elements. **v10 (re-pointed by the run's `review-qa` task):** a Node-side **"v10 source facts"** block reads `CLIP_BOUNDS`, `GRID_CELL_AU`, the `MIN_DIVISION_*` floors, `SECTION_PIP_SIZE_MIN/MAX`, `NO_CANVAS_LABEL_RECORD_IDS`, `DIVISIONS` and `REGION_LABELS` out of the shipped sources so no browser assertion retypes a number; a **three.js scene bridge** installed through `THREE.__THREE_DEVTOOLS__` makes the *rendered* helper geometry and mesh set readable; and blocks **Q0–Q6** (~120 assertions) cover the helper sheets' rendered spans vs the DOM sliders, division solos driving legend + tree + scene, real per-corner pointer drags with the dock-pinned edges, the artefact planes in Plates **and** PiP, and the suppressed cortex label with a hover/click sweep. The only in-place edits were the `node:fs` import and the sanctioned re-point `pipBoot.resizer === 1 → === 4`; no existing check was deleted or weakened |
| `node scripts/verify/budget-report.mjs` | **Budget re-derivation gate, no precondition** (v7 closure): re-derives the three hard caps from the **committed** artifacts alone — Σ `parts[].triCount` against ≤ 800,000, Σ `stat(part.file)` against ≤ 14 MiB **plus** the stricter whole-`src/assets/anatomy` reading, and Σ `stat()` over `src/assets/imaging` against ≤ 10 MiB — prints the part mix and the largest mesh, and exits 1 on any breach. It deliberately does **not** re-bake: if a manifest and its assets ever disagreed, this gate and `build-anatomy-geometry.mjs --manifest` would say so independently |
| `node scripts/verify/closure-bite.mjs` | **Mutation proof of the closure** (v7 closure): re-applies the exact pre-fix defect for each closed gap in an isolated copy of the tree (`.plate-scratch/bite/tree` + a `node_modules` junction) and requires `audit-checks.test.mjs` to **fail** with the expected text — 7/7 caught. Prints the failing check's own sentence, the exit code, and the SHA-256 of every mutated file before/after so "the shared tree was never touched" is measured (this sandbox blocks piped child stdio, so output is captured through file descriptors). **v10:** it is green again — its unmutated reference run (`audit-checks.test.mjs`) is now 92/0, so the mutation proof reaches a green baseline: **7/7 mutations caught · shared tree untouched · restored copy 92 passed · 0 failed** (exit 0) |
| `node scripts/verify/boundary-contract.mjs` | **Error-boundary gate, no browser** (`scripts/verify/boundary-contract.mjs`): loads the shipped boundary components through the installed TypeScript compiler and drives their real state transitions — healthy render returns the children unchanged, a throw renders the `role="alert"` card with `data-panel-error`, Retry clears the error, and all seven App-level surfaces plus both PlatesTab modes are wrapped. This is the same claim the audit's forced throw proves, for environments where Chrome cannot start |
| `node scripts/verify/a11y-contract.mjs` | **a11y gate, no browser**: reads the shared source files and the shipped bundle for the keyboard/AX contract (plate regions focusable with an accessible name, `inert` hidden panels, modal trap/restore, `aria-activedescendant`, focus rings, ≥24 px hit targets, favicon) |

All of `validate`, `check`, `build`, `verify:pipeline`, `verify:plane`, `verify:plane-helper-extent`,
`verify:somatotopy`, `verify:cortical-lobes`, `verify:pip-contract`, `verify:division-toggles`,
`verify:area-toggles`, `verify:view-filter-consistency`, **`verify:cranial-nerves`**, **`verify:nerve-kind`**,
**`verify:cranial-nerve-courses`**, **`verify:cranial-nerve-render`**, `a11y-contract`,
`boundary-contract`, `budget-report.mjs` and `build-anatomy-geometry.mjs --manifest` must exit 0;
`npm run validate` is the pre-commit data authority (plan §9). The Node gates are wired as plain `node` entry
points on purpose — they have no external precondition, so they can be quoted as evidence from any checkout.
**Two gates are red in the agent sandbox at v10 close-out** (`verify:anatomy`, `verify:imaging-fit`): both abort
**before printing a verdict** on `spawnSync … EPERM` — the sandbox denies a child process' piped stdio — both are
red at base, neither is in a v10 task's write scope, and **neither is claimed green here**. The three gates that
were red at v9 close-out (`verify:imaging-fit` aside, `verify:audit-checks` and `closure-bite.mjs`) were
re-measured by the v10 sweep: `verify:audit-checks` is **92 passed · 0 failed** and `closure-bite.mjs` catches
**7/7** mutations against a green baseline. **v11 re-measured both reds** (identical `spawnSync … EPERM`, 0
assertions run — environmental, unchanged, in no v11 task's write scope), and re-measured the whole binding list:
the v11 integrator sweep is in [v11 verification](#verification-v11-close-out-non-browser), including the two new
gates `verify:area-toggles` (**331/0**) and `verify:view-filter-consistency` (**100/100**).
**v14 re-measured the whole list** (the sweep with every exit code and printed tail is in
[`docs/SWARM_V14_PLAN.md`](docs/SWARM_V14_PLAN.md) §8): **21 green · 2 environment-red · 0 product-red**, with the
two new gates `verify:cranial-nerve-courses` (**220/0**) and `verify:cranial-nerve-render` (**47/47**) wired as
npm scripts and executed **through npm**, so the wiring itself is tested. `verify:anatomy` and
`verify:imaging-fit` fail identically (`spawnSync … EPERM`, **0 verdicts**); the single measurement
`verify:anatomy` was blocked on — the `src/assets/anatomy` directory size — re-run directly returns
**14,566,178 B**, unchanged. The brief's "known-red" note for **`verify:area-toggles` was stale**: it exits **0**
with **455 assertions · 0 failed**, and the v11 item-4 divergence (the canvas painting divisions the rule
excludes at y = 6/26/30/32) is **closed with parity 6/6** — the product was never bent back to either gate.

**Exit codes of the browser lane** (`verify:audit`, `verify:acceptance`, `verify:browser`) — an environment failure must never look like a product failure:

| Exit | Meaning |
| --- | --- |
| `0` | every check ran and passed |
| `1` | checks ran and **failed** — the only "the product is broken" signal |
| `2` | static precondition missing (no Chrome binary; set `CHROME_PATH` to override the search) |
| `3` | **environment unusable** — no server answered at the target URL and the one the script started never became ready (30 s bound) |
| `4` | **environment unusable** — Chrome could not be started / its DevTools endpoint never answered. In a restricted sandbox the usual cause is crashpad: `OpenProcess: Access is denied (0x5)`; the script prints Chrome's own last stderr lines |

The lane is self-sufficient: it starts Vite (directly, with `--strictPort`, so it owns exactly one process) when the URL is not already served, waits for HTTP 200, and kills the whole process tree — plus Chrome — on success, on check failure, on timeout, on exception and on `SIGINT`/`SIGTERM`. Readiness probes use `localhost`, never `127.0.0.1` (Vite binds IPv6-only by default and `127.0.0.1` is refused).

## Content scope

All numbers produced by `npm run validate` at integration time:

| Content | Count |
| --- | --- |
| Structures (nuclei, ventricles, surfaces, context, **cranial nerves**) | **202 records** (225 records in `structures/*.json` minus the 23 tracts) |
| Fiber tracts & pathways (with waypoints, decussation, somatotopy) | **23 records** |
| Cranial nerves (kind `nerve`, id prefix `nrv-`, `meshes:false` placement markers — v13) | **12 records** (CN I Olfactory … CN XII Hypoglossal) |
| Registry entries (taxonomy tree + search; every authored id registered) | **248 entries** |
| Canonical levels (rostro-caudal anchors, y = −50…+78 au) | **17 levels** |
| 2D cross-section plates | **15** (11 transverse + 2 sagittal + 2 coronal) |
| Clinical syndromes | **26 cards** |

> Counts as of **v9** (measured at close-out, `npm run validate`): 236 registry entries · 213 records in 17
> files · 23 tracts · 26 syndromes · 15 plates · 17 levels, **0 errors and 0 warnings**. The v9 content delta
> is **16 new records** (the M1/S1 somatotopic segments) plus their registry rows — nothing pre-existing was
> edited, renamed or moved, and nothing below y = +45 moved. Earlier milestones: v7 added the telencephalon
> (42 structure records, 4 tracts, 46 registry entries, 4 levels, 3 plates, levels now running to y = +78);
> v8 added 43 records including the 14 arteries.
>
> **v10 and v11 added no content at all.** The v11 sweep's `npm run validate` reports the identical inventory
> (236 / 213 / 23 / 26 / 15 / 17, 0 errors / 0 warnings), and the Areas/Systems rows of v11 are a **display
> grouping over the existing taxonomy regions and kinds** — every one of the 236 entries belongs to exactly one
> area button and exactly one system button, measured by `npm run verify:area-toggles`.
>
> **v13 adds content** — the twelve cranial nerves: **12 structure records** in 2 new files
> (`telencephalon-cranial-nerves.json`, `brainstem-cranial-nerves.json`), 12 registry rows under the new seventh
> kind `nerve`, and 12 curated web references. Measured at close-out by `npm run validate`: **248 registry
> entries · 225 records in 19 files · 23 tracts · 26 syndromes · 15 plates · 17 levels, 0 errors / 0 warnings**.
> Nothing pre-existing was edited, renamed or moved — the appending of the 12 rows is the only `taxonomy.json`
> change (one earlier line gained a trailing comma) — and **no mesh, GLB, manifest part or bbox moved**.

Vascular territories are carried as string fields (`bloodSupply` per structure, `vascularTerritory` per syndrome) — no 3D vessel models. Every structure spans at least one of the 17 canonical levels; a subset of those levels has a matching transverse plate, and the plates' `data-structure` slugs resolve against the same registry as the 3D scene (enforced by the validator).

## Project layout

```
docs/            engineering plan, realism plan + research notes, geometry pipeline,
                 content inventory, attribution
scripts/         validate-data.mjs (data gate) · build-anatomy-geometry.mjs +
                 lib/sdf/ (SDF kernel) + anatomy-recipes/ (anatomy bake CLI)
src/
  App.tsx        shell: header · sidebar · center tabs · info rail
  state/         zustand store (selection, layers, clip planes, quality, syndromes)
  data/          taxonomy.json · levels.json · structures/ · tracts.json ·
                 syndromes/ · plates.json · plates/*.svg · sectionImages.ts
  assets/anatomy committed v2 GLBs + anatomy-manifest.json (+ nuclei-report.json):
                 138 parts, 599,204 rendered tris, 13.82 MiB (v8)
  assets/imaging committed imaging payload (8.71 MiB in 80 files, cap 10 MiB from
                 v7 AMENDMENT B): stain plates + mri-t1.bin + mri-manifest.json
                 + ct.bin + ct-manifest.json, both grids [81, 113, 107], plus the
                 v9 registration records registration-fit.json / plate-fit.json
  components/    Header, SearchBox, TaxonomyTree, LevelRuler, InfoPanel,
                 PlatesTab, PlateRenderer, SyndromeBrowser, ReferencesModal, Legend
  components/viewer3d/   R3F canvas, GLB-backed meshes, tract tubes, clip
                 planes, post FX composer, SomatotopyOverlay (v9 patches),
                 simulated-section panel (v9 - the same 2D renderer as the Plates tab)
  components/section/    2D live-section canvas, corticalLobes (v9 division layer),
                 plane slider strip (Sagittal · x / Coronal · z / Transverse · y),
                 contour worker, real-image layer implementations (photographs +
                 MRI + CT registries, modality resolution, fittedFit preference)
  geometry/      anatomyAssets (GLB loader + manifest), generated (manifest
                 types), materials (PBR factory), envelope (v1 fallbacks),
                 textures (procedural normal maps), curves
  styles/        tokens · base · layout · panels · viewer · plates · sectionPip
```

The authoritative spec is [docs/ENGINEERING_PLAN.md](docs/ENGINEERING_PLAN.md) (canonical coordinates §2, content inventory §3, data model §4, rendering §5, plate contract §6, UI §7, validation §9).

## Educational disclaimer

NeuroAxis is a **schematic study aid, not a medical device or diagnostic tool**. All geometry is stylized and didactic — proportions and positions are simplified for teaching and do not replace a validated stereotactic or imaging atlas, histology, or clinical judgment. Citations point to the standard textbooks listed in [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md); descriptions are original paraphrases written for this project.

## Credits

- **Content authority**: Blumenfeld, *Neuroanatomy through Clinical Cases* (2nd/3rd ed.); Patten, *Neurological Differential Diagnosis*; Fix, *High-Yield Neuroanatomy*; Snell, *Clinical Neuroanatomy*; Nolte, *The Human Brain*; *Midbrain, Pons, and Medulla: Anatomy and Syndromes*, RadioGraphics 2019 (doi:[10.1148/rg.2019180126](https://pubs.rsna.org/doi/10.1148/rg.2019180126)).
- **Interaction-design inspiration**: [ashemag/human-atlas](https://github.com/ashemag/human-atlas) (UX patterns only — no code or data reused).
- **Thalamic nomenclature sanity check**: FreeSurfer *ThalamicNuclei* atlas documentation.
- **3D envelope surfaces (v2)**: derived from [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/), © The Database Center for Life Science, licensed under CC Attribution 4.0 International — registered and sculpted at build time; nuclei, tracts, plates, and text remain original works (full provenance in [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)).
- **All other 3D geometry, SVG plates, and text**: original schematic works created for NeuroAxis. MIT-licensed — see [LICENSE](LICENSE).
