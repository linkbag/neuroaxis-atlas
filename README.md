# NeuroAxis — 3D Brainstem Atlas

**An interactive, realistic web atlas of the diencephalon, mesencephalon (midbrain), and rhombencephalon (pons, medulla, cerebellum)** — selectable 3D nuclei and fiber tracts, twelve labeled 2D cross-section plates bidirectionally synced with the 3D clipping planes, a clinical-syndrome browser, and per-structure neurophysiology, connections, blood supply, and references. Built with Vite, React 18, TypeScript, three.js (`@react-three/fiber`), and zustand. The interaction model is inspired by [ashemag/human-atlas](https://github.com/ashemag/human-atlas); **all anatomy content and plate artwork are original schematic works authored for this project, and since the v2 realism upgrade the envelope surfaces are derived from [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (CC BY 4.0)** — see [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md).

## Features

- **Realistic v2 rendering** — real-scan-derived brainstem/diencephalon/cerebellum envelopes, organically sculpted nuclei, CSF spaces, PBR lighting with SSAO/bloom/SMAA, and a High/Balanced quality toggle (details below).
- **3D viewer** — orbit / zoom / pan; click-select any nucleus, tract, ventricle, or surface landmark; hover labels; global selection shared with every other panel.
- **Region & system layers** — toggle diencephalon / midbrain / pons / medulla / cerebellum and nuclei / tracts / ventricles / surface / context; presets *All*, *Nuclei*, *Tracts*, *Clinical motor*.
- **Exploded view** — slider fans nuclei radially off the brainstem axis while tracts and envelopes stay put.
- **Clipping planes** — sagittal / coronal / transverse cuts over the full canonical range with a plane-helper toggle; the transverse slider snaps to plate levels.
- **Live section sync (v3)** — every clip slider also drives a GPU picture-in-picture live section (bottom-right of the 3D view) and a worker-computed 2D live-section canvas in the *Plates* tab, both underlaid with real imagery (stained micrographs on mapped levels, continuous T1 MRI everywhere) — details below.
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

## Section sync & multi-modality (v3)

Moving **any** clipping slider updates three synced surfaces in real time (spec: [docs/SECTION_SYNC_PLAN.md](docs/SECTION_SYNC_PLAN.md)) — one `clip.x/y/z` value in the zustand store is the single source of truth for all of them:

- **3D cut** — the shared clipping planes slice every mesh (unchanged v1/v2 behavior; the transverse slider still snaps to plate levels).
- **GPU live-section PiP** (3D tab) — a second orthographic camera looking straight down the active plane's normal renders the same scene into a picture-in-picture panel docked bottom-right: stencil-capped "filled tissue" cut faces, orientation labels (L/R/A/P/S/I, patient-left convention), a `y = −24.0 au` plane readout, axis override + size/hide buttons. Visible by default; the hidden state persists in `localStorage` (`neuroaxis.sectionPip`, same pattern as the quality toggle).
- **2D live-section canvas** (Plates tab → *Live section*) — a Web Worker clips every visible structure's triangles by the current plane, chains closed contours and fills them even-odd with taxonomy colors (transverse: anterior up, patient-left on image-right — matching the authored SVG plates). Click/drag inside sets the other two sliders (crosshair placement); a chip snaps to the nearest authored plate; selected/hovered structures highlight with labels. Perf-guarded: worker-only contour math, 15 Hz + 0.25 au plane quantization while dragging, painting skipped while the tab is hidden, canvas dpr ≤ 1.5, PiP skips entirely when hidden.

Both live-section surfaces follow the **last-touched** clip slider (drag or keyboard focus — the active slider row is marked "live"); the PiP header's X/Y/Z buttons override manually.

**Real-image layers** draw *under* the simulated contours, with opacity (and MRI window) sliders in the Live-section toolbar and the exact credit line always visible in-canvas whenever an image shows:

- **Stain underlay** (level-mapped, ±1.5 au) — 17 UBC brainstem/spinal-cord micrographs, **CC BY-NC-SA 4.0**, © University of British Columbia, embedded verbatim (JPEG re-encode at native resolution); 10 MSU Human Brain Atlas coronal cell stains, embedded under the brainmuseum permission policy with the required credit line ("University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine…").
- **MRI underlay** (continuous) — a T1 volume resampled from OpenNeuro dataset **ds007313** (**CC0**, single subject, 1.3 mm iso) onto the canonical grid at ≈1.5 mm (`src/assets/imaging/mri-t1.bin` + `mri-manifest.json`, fixed documented affine); grayscale with window low/high sliders, available at **every** plane position on all three axes.
- **Sources & licenses** — the live toolbar lists "open source ↗" chips (the mapped image's own page plus the UBC / MSU / Harvard Whole Brain Atlas / BrainMaps atlases; the latter two are link-out only). License verdicts and fetch evidence: [docs/IMAGING_SOURCES.md](docs/IMAGING_SOURCES.md); full provenance and verbatim credit lines: [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md). New committed imagery stays inside the ≤ 6 MB plan budget (`src/assets/imaging/` ≈ 3.0 MB: stains 2.77 MB + MRI grid 0.24 MB).

Re-bake the MRI grid (deterministic, Node-only; the raw NIfTI stays in gitignored `assets-src/imaging/mri/`):

```bash
node scripts/build-mri-grid.mjs          # → src/assets/imaging/mri-t1.bin + mri-manifest.json + QA previews (exit ≠ 0 on QA-gate violation)
node scripts/build-mri-grid.mjs --probe  # inspect the source NIfTI header without writing
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 with HMR |
| `npm run build` | Type-safe production build (`vite build`) → `dist/` |
| `npm run check` | `tsc --noEmit` over `src/` |
| `npm run validate` | Data-integrity gate: JSON shape, canonical-coordinate bounds, id/slug uniqueness, plate↔SVG↔taxonomy referential integrity, syndrome id resolution, unique display names (`scripts/validate-data.mjs`) |
| `node scripts/build-anatomy-geometry.mjs --manifest` | Anatomy asset gate: rebuilds the manifest from the committed GLBs and enforces the v2 perf budgets (exit 1 = over budget) |
| `node scripts/build-mri-grid.mjs` | MRI bake gate: resamples the CC0 OpenNeuro T1w into the canonical uint8 grid + manifest + QA preview PNGs (exit ≠ 0 on registration-QA violation) |

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
  assets/imaging committed v3 stain JPEGs + mri-t1.bin + mri-manifest.json
  components/    Header, SearchBox, TaxonomyTree, LevelRuler, InfoPanel,
                 PlatesTab, PlateRenderer, SyndromeBrowser, ReferencesModal, Legend
  components/viewer3d/   R3F canvas, GLB-backed meshes, tract tubes, clip
                 planes, post FX composer, live-section PiP
  components/section/    2D live-section canvas, contour worker, real-image
                 layer implementations (stain + MRI)
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
