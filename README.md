# NeuroAxis — 3D Brainstem Atlas

**An interactive, schematic web atlas of the diencephalon, mesencephalon (midbrain), and rhombencephalon (pons, medulla, cerebellum)** — selectable 3D nuclei and fiber tracts, twelve labeled 2D cross-section plates bidirectionally synced with the 3D clipping planes, a clinical-syndrome browser, and per-structure neurophysiology, connections, blood supply, and references. Built with Vite, React 18, TypeScript, three.js (`@react-three/fiber`), and zustand. The interaction model is inspired by [ashemag/human-atlas](https://github.com/ashemag/human-atlas); **all anatomy content, geometry, and plate artwork are original schematic works** authored for this project (see [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)).

## Features

- **3D viewer** — orbit / zoom / pan; click-select any nucleus, tract, ventricle, or surface landmark; hover labels; global selection shared with every other panel.
- **Region & system layers** — toggle diencephalon / midbrain / pons / medulla / cerebellum and nuclei / tracts / ventricles / surface / context; presets *All*, *Nuclei*, *Tracts*, *Clinical motor*.
- **Exploded view** — slider fans nuclei radially off the brainstem axis while tracts and envelopes stay put.
- **Clipping planes** — sagittal / coronal / transverse cuts over the full canonical range with a plane-helper toggle; the transverse slider snaps to plate levels.
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

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 with HMR |
| `npm run build` | Type-safe production build (`vite build`) → `dist/` |
| `npm run check` | `tsc --noEmit` over `src/` |
| `npm run validate` | Data-integrity gate: JSON shape, canonical-coordinate bounds, id/slug uniqueness, plate↔SVG↔taxonomy referential integrity, syndrome id resolution, unique display names (`scripts/validate-data.mjs`) |

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
docs/            engineering plan, content inventory, research notes, attribution
scripts/         validate-data.mjs (data gate)
src/
  App.tsx        shell: header · sidebar · center tabs · info rail (this integration)
  state/         zustand store (selection, layers, clip planes, syndromes)
  data/          taxonomy.json · levels.json · structures/ · tracts.json ·
                 syndromes/ · plates.json · plates/*.svg
  components/    Header, SearchBox, TaxonomyTree, LevelRuler, InfoPanel,
                 PlatesTab, PlateRenderer, SyndromeBrowser, ReferencesModal, Legend
  components/viewer3d/   R3F canvas, nucleus meshes, tract tubes, clip planes
  geometry/      envelope + curve builders for the parametric 3D scene
  styles/        tokens · base · layout · panels · viewer · plates
```

The authoritative spec is [docs/ENGINEERING_PLAN.md](docs/ENGINEERING_PLAN.md) (canonical coordinates §2, content inventory §3, data model §4, rendering §5, plate contract §6, UI §7, validation §9).

## Educational disclaimer

NeuroAxis is a **schematic study aid, not a medical device or diagnostic tool**. All geometry is stylized and didactic — proportions and positions are simplified for teaching and do not replace a validated stereotactic or imaging atlas, histology, or clinical judgment. Citations point to the standard textbooks listed in [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md); descriptions are original paraphrases written for this project.

## Credits

- **Content authority**: Blumenfeld, *Neuroanatomy through Clinical Cases* (2nd/3rd ed.); Patten, *Neurological Differential Diagnosis*; Fix, *High-Yield Neuroanatomy*; Snell, *Clinical Neuroanatomy*; Nolte, *The Human Brain*; *Midbrain, Pons, and Medulla: Anatomy and Syndromes*, RadioGraphics 2019 (doi:[10.1148/rg.2019180126](https://pubs.rsna.org/doi/10.1148/rg.2019180126)).
- **Interaction-design inspiration**: [ashemag/human-atlas](https://github.com/ashemag/human-atlas) (UX patterns only — no code or data reused).
- **Thalamic nomenclature sanity check**: FreeSurfer *ThalamicNuclei* atlas documentation.
- **All 3D geometry, SVG plates, and text**: original schematic works created for NeuroAxis. MIT-licensed — see [LICENSE](LICENSE).
