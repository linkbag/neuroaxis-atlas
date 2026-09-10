# NeuroAxis — 3D Brainstem Atlas

**An interactive, realistic web atlas of the diencephalon, mesencephalon (midbrain), and rhombencephalon (pons, medulla, cerebellum)** — selectable 3D nuclei and fiber tracts, twelve labeled 2D cross-section plates bidirectionally synced with the 3D clipping planes, a clinical-syndrome browser, and per-structure neurophysiology, connections, blood supply, and references. Built with Vite, React 18, TypeScript, three.js (`@react-three/fiber`), and zustand. The interaction model is inspired by [ashemag/human-atlas](https://github.com/ashemag/human-atlas); **all anatomy content and plate artwork are original schematic works authored for this project, and since the v2 realism upgrade the envelope surfaces are derived from [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (CC BY 4.0)** — see [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

## Features

- **Realistic v2 rendering** — real-scan-derived brainstem/diencephalon/cerebellum envelopes, organically sculpted nuclei, CSF spaces, PBR lighting with SSAO/bloom/SMAA, and a High/Balanced quality toggle (details below).
- **3D viewer** — orbit / zoom / pan; click-select any nucleus, tract, ventricle, or surface landmark; hover labels; global selection shared with every other panel.
- **Region & system layers** — toggle diencephalon / midbrain / pons / medulla / cerebellum and nuclei / tracts / ventricles / surface / context; presets *All*, *Nuclei*, *Tracts*, *Clinical motor*.
- **Exploded view** — slider fans nuclei radially off the brainstem axis while tracts and envelopes stay put.
- **Clipping planes** — sagittal / coronal / transverse cuts over the full canonical range with a plane-helper toggle; the transverse slider snaps to plate levels.
- **Live section sync (v3/v4)** — every clip slider also drives a GPU picture-in-picture live section (bottom-right of the 3D view) and a worker-computed 2D live-section canvas in the *Plates* tab, both showing **real imagery as the base layer** — real section photographs on their anchored planes, a continuous real head CT volume, and a continuous T1 MRI at any plane, with a modality toolbar (Auto real-first / MRI / CT / Photo / Simulated only), CT brain–bone windows, and the active modality's credit always visible — details below.
- **12 interactive 2D plates** — 9 transverse levels (pyramidal decussation → mid-thalamus), 1 midline sagittal profile, 2 coronal slices; every labeled region highlights on hover and selects everywhere on click; leader-line labels toggle on/off.
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

- **GPU live-section PiP** (3D tab) — a second orthographic camera looking straight down the active plane's normal renders the same scene into a picture-in-picture panel docked bottom-right: stencil-capped "filled tissue" cut faces, orientation labels (L/R/A/P/S/I, patient-left convention), a `y = −24.0 au` plane readout, axis override + size/hide buttons. Since v4 it paints the **real slice of the active modality** into its render target *behind* the 3D cut, so the panel composites real imagery with the anatomy cut. The sampled backdrop is redrawn at most once per plane/modality/size change (never per frame), the volume slice raster is cached per quantized plane + window, and the panel's visible/hidden state persists in `localStorage` (`neuroaxis.sectionPip`, same pattern as the quality toggle). When the active modality genuinely cannot paint at a plane, the panel stays the pure GPU cut and a line under it says so — naming the Plates tab, where the embedded modalities are listed — instead of showing an unexplained empty frame (`?pipdebug` adds the full diagnostics overlay).
- **2D live-section canvas** (Plates tab → *Live section*) — a Web Worker clips every visible structure's triangles by the current plane, chains closed contours and fills them even-odd with taxonomy colors (transverse: anterior up, patient-left on image-right — matching the authored SVG plates). Click/drag inside sets the other two sliders (crosshair placement); a chip snaps to the nearest authored plate; selected/hovered structures highlight with labels. Perf-guarded: worker-only contour math, 15 Hz + 0.25 au plane quantization while dragging, painting skipped while the tab is hidden, canvas dpr ≤ 1.5, PiP skips entirely when hidden.

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
| **Stain / photograph** (54 plates) | per-plane: 9 UBC horizontal plates (y = +10 … −44) + 15 UBC coronal plates (z = +31 … −54) + 3 Commons CT plates, all ±1.5 au; plus the 17 UBC level-mapped micrographs on transverse planes (every authored level has one) | UBC `neuroanatomy.ca` micrograph / horizontal / coronal viewers; MSU Human Brain Atlas coronal cell stains | **CC BY-NC-SA 4.0** (UBC — non-commercial educational use, recorded in ATTRIBUTION); site permission with mandatory credit (brainmuseum.org); CC0 (Commons CT slices) | `© University of British Columbia, CC BY-NC-SA 4.0` · `University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health` · `CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)` |
| **MRI** (continuous, all 3 axes) | every plane position on all three axes | OpenNeuro **ds007313** (3 T MPRAGE, head + cervical spine), resampled onto the canonical grid | **CC0** (no attribution required; credited for provenance) | `ds007313 doi:10.18112/openneuro.ds007313.v1.0.0, OpenNeuro CC0` |
| **CT** (continuous, all 3 axes) | every plane position on all three axes | **NLM Visible Human Project** — "Additional Head Images" head CT (Brigham and Women's Hospital / Harvard Medical School head, 463 axial DICOM slices, 1.5 mm) | NLM Terms and Conditions (2019) — redistribution permitted with acknowledgement | `Courtesy of the U.S. National Library of Medicine` |

Both grids are `uint8` volumes on the **same canonical box and spacing** (45 × 81 × 67, origin x −27 / y −55 / z −56 au), row-major x-fastest, ≈1.23 × 1.25 × 1.24 au per voxel, with a manifest recording dims/origin/spacing, the registration block (constants + measured residuals) and the source/licence/credit. CT is baked in Hounsfield units (`storedHU = stored16 · 1 − 1200`) with the `brain (−20…100 HU)` and `bone (200…1600 HU)` presets.

### Honest limits (please read before quoting a plane position)

- **Photographs are per-plane, not continuous.** Each plate is anchored to one canonical plane value with a ±1.5 au mount tolerance, so moving the slider between two photographs falls back to CT/MRI (Auto) or to the simulated section, and the canvas says which. Photo *sequence* coverage is deliberately denser through the brainstem than through the hemispheres.
- **Registration is approximate and disclosed.** The photographs are photographs of physical slabs — there is no voxel registration. Their `planeValue` comes from the sources' own labels (UBC viewer landmark labels, the Commons 4 mm slice indices) plus per-image tissue measurements, and their `fit {scale, dx, dy, mirrorX}` is a first-pass affine; absolute plane error is on the order of ±1 step (≈5–6 au) for the photographs. The MRI and CT volumes are registered with measured, re-runnable corrections (midline residual ≤ 1.25 au; CT pons-face residual 2.04 au mean against the stylized atlas envelope) and both manifests report their residuals verbatim.
- **MRI, CT and the photographs are different individuals.** The OpenNeuro subject, the NLM Visible Human donor and the UBC/MSU specimens are placed in the *same canonical atlas frame*; the atlas geometry is the common frame of reference, and each modality keeps its own documented affine rather than inheriting another subject's fit.
- **This is a study aid.** NeuroAxis is not a medical device, and none of this imagery is for diagnosis (see *Educational disclaimer* below).

### Committed payload & budgets

`src/assets/imaging/` holds **6.12 MiB across 58 files** — 54 stain JPEG/PNG plates (5.64 MiB), `mri-t1.bin` (238 KiB) + `mri-manifest.json`, `ct.bin` (238 KiB) + `ct-manifest.json` — inside the plan §4 budget: **new committed assets ≤ 4 MiB this run** (v4 added `ct.bin` + 24 UBC plates + 3 Commons CT plates) and **≤ 8 MiB total imaging payload** (measured 6.12 MiB, so no photo re-encode was needed). Raw downloads stay in the gitignored `assets-src/imaging2/`; every embedded plate is a content-verbatim copy (no crops, no retouching) with only technical modifications (integer 2× downsampling, alpha flatten onto white, lossless filtered-PNG re-encode for the photographs; uint8 resampling for the grids) recorded per file in `assets-src/imaging2/processed-photos.json`.

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

All three gates (`validate`, `check`, `build`) must exit 0; `npm run validate` is the pre-commit data authority (plan §9).

## Content scope

All numbers produced by `npm run validate` at integration time:

| Content | Count |
| --- | --- |
| Structures (nuclei, ventricles, surfaces, context) | **118 records** |
| Fiber tracts & pathways (with waypoints, decussation, somatotopy) | **19 records** |
| Registry entries (taxonomy tree + search; every authored id registered) | **137 entries** |
| Canonical levels (rostro-caudal anchors, y = −50…+36 au) | **13 levels** |
| 2D cross-section plates | **12** (9 transverse + 1 sagittal + 2 coronal) |
| Clinical syndromes | **24 cards** |

Vascular territories are carried as string fields (`bloodSupply` per structure, `vascularTerritory` per syndrome) — no 3D vessel models in v1. Every structure spans at least one of the 13 canonical levels; 9 of those levels have a matching transverse plate, and the plates' `data-structure` slugs resolve against the same registry as the 3D scene (enforced by the validator).

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
  assets/anatomy committed v2 GLBs + anatomy-manifest.json (+ nuclei-report.json)
  assets/imaging committed imaging payload (6.12 MiB): stain plates + mri-t1.bin
                 + mri-manifest.json + ct.bin + ct-manifest.json
  components/    Header, SearchBox, TaxonomyTree, LevelRuler, InfoPanel,
                 PlatesTab, PlateRenderer, SyndromeBrowser, ReferencesModal, Legend
  components/viewer3d/   R3F canvas, GLB-backed meshes, tract tubes, clip
                 planes, post FX composer, live-section PiP
  components/section/    2D live-section canvas, contour worker, real-image
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
