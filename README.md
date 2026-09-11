# NeuroAxis — 3D Brainstem Atlas

**An interactive, realistic web atlas of the diencephalon, mesencephalon (midbrain), and rhombencephalon (pons, medulla, cerebellum) — with the telencephalon (cerebral hemispheres, basal ganglia, limbic system, ventricles) layered on from v7** — selectable 3D nuclei and fiber tracts, labeled 2D cross-section plates bidirectionally synced with the 3D clipping planes, a clinical-syndrome browser, and per-structure neurophysiology, connections, blood supply, and references. Built with Vite, React 18, TypeScript, three.js (`@react-three/fiber`), and zustand. The interaction model is inspired by [ashemag/human-atlas](https://github.com/ashemag/human-atlas); **all anatomy content and plate artwork are original schematic works authored for this project, and since the v2 realism upgrade the envelope surfaces are derived from [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (CC BY 4.0)** — see [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

## Features

- **Realistic v2 rendering** — real-scan-derived brainstem/diencephalon/cerebellum envelopes, organically sculpted nuclei, CSF spaces, PBR lighting with SSAO/bloom/SMAA, and a High/Balanced quality toggle (details below).
- **3D viewer** — orbit / zoom / pan; click-select any nucleus, tract, ventricle, or surface landmark; hover labels; global selection shared with every other panel.
- **Region & system layers** — toggle diencephalon / midbrain / pons / medulla / cerebellum **/ telencephalon** and nuclei / tracts / ventricles / surface / context; presets *Brainstem focus* (default), *Deep structures*, *Whole brain*, *Cortex only*, *All*, *Nuclei*, *Tracts*, *Clinical motor*.
- **Exploded view** — slider fans nuclei radially off the brainstem axis while tracts and envelopes stay put.
- **Clipping planes** — sagittal / coronal / transverse cuts over the full canonical range with a plane-helper toggle; the transverse slider snaps to plate levels.
- **Live section sync (v3/v4)** — every clip slider also drives a GPU picture-in-picture live section (bottom-right of the 3D view) and a worker-computed 2D live-section canvas in the *Plates* tab, both showing **real imagery as the base layer** — real section photographs on their anchored planes, a continuous real head CT volume, and a continuous T1 MRI at any plane, with a modality toolbar (Auto real-first / MRI / CT / Photo / Simulated only), CT brain–bone windows, and the active modality's credit always visible — details below.
- **Telencephalon (v7)** — the cerebral hemispheres, basal ganglia, limbic structures, lateral ventricles and telencephalic white matter (22 new meshes, 46 registry entries, 4 new levels, 3 new plates) layered onto the same canonical space, with the hemispheres as a translucent **ghost cortex** so the brainstem stays the subject of the app. New presets *Brainstem focus* (the default) / *Deep structures* / *Whole brain* / *Cortex only* — details in [Telencephalon (v7)](#telencephalon-v7--the-rest-of-the-brain).
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

**Committed assets & budgets**: `src/assets/anatomy/` holds 84 GLBs + `anatomy-manifest.json` (10 envelopes · 3 CSF spaces · 71 nuclei; **320,296 triangles · 7.40 MiB**), inside the plan §2.7 (Amendment A) budget: ≤ 700k tris, ≤ 8 MiB total, per-part caps (envelope 1.5 MiB · CSF 0.8 MiB · nucleus 60 KiB · nuclei 2.5 MiB). `node scripts/build-anatomy-geometry.mjs --manifest` re-verifies all of it and exits non-zero on any violation.

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

All three section surfaces move together — the 3D cut, the GPU PiP (3D tab) and the 2D live-section canvas (Plates tab → *Live section*) — from the same `clip.x/y/z` + `sectionUnderlay` store state:

- **GPU live-section PiP** (3D tab) — a second orthographic camera looking straight down the active plane's normal renders the same scene into a picture-in-picture panel docked bottom-right: stencil-capped "filled tissue" cut faces, orientation labels (L/R/A/P/S/I, patient-left convention), a `y = −24.0 au` plane readout, axis override + size/hide buttons. Since v4 it paints the **real slice of the active modality** into its render target *behind* the 3D cut, so the panel composites real imagery with the anatomy cut. The sampled backdrop is redrawn at most once per plane/modality/size change (never per frame), the volume slice raster is cached per quantized plane + window, and the panel's visible/hidden state persists in `localStorage` (`neuroaxis.sectionPip`, same pattern as the quality toggle). Hiding the panel is reversible: whenever it is hidden — including on a fresh visit that loads a persisted `hidden` value — a **“Live section ▸” restore pill** occupies the panel's own bottom-right corner in its place, so the feature is discoverable without clearing `localStorage`; clicking it shows the panel again and the pill disappears. When the active modality genuinely cannot paint at a plane, the panel stays the pure GPU cut and a line under it says so — naming the Plates tab, where the embedded modalities are listed — instead of showing an unexplained empty frame (`?pipdebug` adds the full diagnostics overlay).
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
| **1 — binding** | `npm run validate`, `check`, `build`, `verify:pipeline`, `verify:plane`, `node scripts/verify/boundary-contract.mjs`, `node scripts/verify/a11y-contract.mjs`, `node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs`, `node scripts/verify/closure-bite.mjs`, `node scripts/build-anatomy-geometry.mjs --manifest`, `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | yes — these must exit 0 |
| **2 — recorded, not asserted** | `npm run verify:audit`, `verify:browser`, `verify:acceptance` | **no** — reported as command + exit code + reason |

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

| `npm run verify:plane` | **One-plane-transform gate** (`scripts/verify/plane-transform.mjs`): imports the shipped `src/components/section/planeGeometry.ts` (never a copy) and asserts that the 2D canvas, the GPU PiP and the backdrop sampler agree on the world→screen mapping for a grid of axes/planes/viewports and that the orientation badge table is derived from projected pixels (10 827 assertions). Also prints the pre-existing coronal camera-basis degeneracy it does **not** fail on |
| `npm run verify:pipeline` | Section-pipeline gate: slices every committed anatomy GLB through 13 planes and asserts the contour engine's loop/segment invariants (106/106 parts, no problems) |
| `node scripts/verify/audit-checks.test.mjs` | **Audit check mirror, no browser** (v7 closure): runs the *same* pure predicates the runtime audit uses (`scripts/verify/checks.mjs`) against the **shipped manifests and the shipped sources** — CT coverage honesty driven by the real `ct-manifest.json` and `ctCoverageStatement()`, the brainstem-focus default and the preset region guard (imported from the real store), the `?panelfail` containment demonstration (drives the real `PanelErrorBoundary` through the real throw: `probes === 1`, correct surface, Retry recovers), the context-loss DOM contract including the "overlay is outside `<Canvas>`" and "PostFX returns null while lost" root causes, and the modality sweep in both directions. It also re-derives the three budget numbers and checks the telencephalon data/plate inventory. **This is a mirror, not a browser test**: it proves the decision logic and the shipped code contract, never that pixels appeared |
| `npm run verify:audit` | **Self-sufficient runtime audit** (`scripts/verify/audit.mjs`): starts Vite itself when nothing answers at the target URL, drives headless Chrome over the DevTools Protocol through the whole feature surface, and stops the server again on every exit path. Includes the two P0 gates — simulated WebGL context loss via `WEBGL_lose_context` (overlay appears, canvas recovers) and a **forced render throw** through the dev-only `?panelfail=<surface>` hook (the failure is contained, the app keeps working, Retry restores the panel). Pass an existing URL to reuse a running server. **v7 closure:** every load-bearing verdict is now decided by `scripts/verify/checks.mjs`, the run uses a **fresh Chrome profile per run** plus a `localStorage`/`sessionStorage` clear before the boot read (so a persisted `neuroaxis.viewPreset` can never masquerade as a wrong default), and the CT/modality checks are coverage-aware |
| `node scripts/verify/budget-report.mjs` | **Budget re-derivation gate, no precondition** (v7 closure): re-derives the three hard caps from the **committed** artifacts alone — Σ `parts[].triCount` against ≤ 800,000, Σ `stat(part.file)` against ≤ 14 MiB **plus** the stricter whole-`src/assets/anatomy` reading, and Σ `stat()` over `src/assets/imaging` against ≤ 10 MiB — prints the part mix and the largest mesh, and exits 1 on any breach. It deliberately does **not** re-bake: if a manifest and its assets ever disagreed, this gate and `build-anatomy-geometry.mjs --manifest` would say so independently |
| `node scripts/verify/closure-bite.mjs` | **Mutation proof of the closure** (v7 closure): re-applies the exact pre-fix defect for each closed gap in an isolated copy of the tree (`.plate-scratch/bite/tree` + a `node_modules` junction) and requires `audit-checks.test.mjs` to **fail** with the expected text — 7/7 caught. Prints the failing check's own sentence, the exit code, and the SHA-256 of every mutated file before/after so "the shared tree was never touched" is measured (this sandbox blocks piped child stdio, so output is captured through file descriptors) |
| `node scripts/verify/boundary-contract.mjs` | **Error-boundary gate, no browser** (`scripts/verify/boundary-contract.mjs`): loads the shipped boundary components through the installed TypeScript compiler and drives their real state transitions — healthy render returns the children unchanged, a throw renders the `role="alert"` card with `data-panel-error`, Retry clears the error, and all seven App-level surfaces plus both PlatesTab modes are wrapped. This is the same claim the audit's forced throw proves, for environments where Chrome cannot start |
| `node scripts/verify/a11y-contract.mjs` | **a11y gate, no browser**: reads the shared source files and the shipped bundle for the keyboard/AX contract (plate regions focusable with an accessible name, `inert` hidden panels, modal trap/restore, `aria-activedescendant`, focus rings, ≥24 px hit targets, favicon) |

All of `validate`, `check`, `build`, `verify:pipeline`, `verify:plane`, `a11y-contract`,
`boundary-contract`, `audit-checks.test.mjs`, `budget-report.mjs` and `closure-bite.mjs` must exit 0;
`npm run validate` is the pre-commit data authority (plan §9). The two new gates are wired as `node`
entry points on purpose — they have no external precondition, so they can be quoted as evidence from
any checkout.

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
| Structures (nuclei, ventricles, surfaces, context) | **160 records** |
| Fiber tracts & pathways (with waypoints, decussation, somatotopy) | **23 records** |
| Registry entries (taxonomy tree + search; every authored id registered) | **183 entries** |
| Canonical levels (rostro-caudal anchors, y = −50…+78 au) | **17 levels** |
| 2D cross-section plates | **15** (11 transverse + 2 sagittal + 2 coronal) |
| Clinical syndromes | **26 cards** |

> Counts as of **v7**: the telencephalon added 42 structure records, 4 tracts, 46 registry entries,
> 4 canonical levels and 3 plates. Levels now run to y = +78 (the high-convexity anchor); the
> **original 13 anchors keep their exact y values** — nothing below y = +45 moved.

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
                 106 parts, 570,096 rendered tris, 13.12 MiB (v7)
  assets/imaging committed imaging payload (8.71 MiB in 80 files, cap 10 MiB from
                 v7 AMENDMENT B): stain plates + mri-t1.bin + mri-manifest.json
                 + ct.bin + ct-manifest.json, both grids [81, 113, 107]
  components/    Header, SearchBox, TaxonomyTree, LevelRuler, InfoPanel,
                 PlatesTab, PlateRenderer, SyndromeBrowser, ReferencesModal, Legend
  components/viewer3d/   R3F canvas, GLB-backed meshes, tract tubes, clip
                 planes, post FX composer, live-section PiP
  components/section/    2D live-section canvas, plane slider strip (Sagittal
                 · x / Coronal · z / Transverse · y), contour worker, real-image
                 layer implementations (photographs + MRI + CT registries,
                 modality resolution, canvas→texture sampler for the PiP)
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
