# Research Notes — 3D Brainstem & Diencephalon Atlas

Date: 2026-09-07 · Compiled during the planning phase before implementation.

## 1. Reference app: `ashemag/human-atlas`

Source: https://github.com/ashemag/human-atlas (README, inspected 2026-09-07)

- **Stack**: React + Three.js + shadcn/ui, Vite, TypeScript. Node ≥ 22.13, `npm ci`, dev port 3016. MIT code license.
- **UX worth replicating**:
  - Orbit / zoom / select structures directly in 3D.
  - System layers with toggles + presets (skeleton, organs).
  - **Exploded view**: assembled anatomy → spaced inventory.
  - Search over names + source identifiers (3,432 concepts).
  - **Isolate** a selected structure + read its details in a side panel.
  - Mobile-first attention: compact controls, verified at 390×844 / 320×568 / 844×390.
  - Validation scripts as first-class repo citizens (`validate-atlas.mjs`, `validate-interactions.mjs`).
- **Data**: BodyParts3D 4.0 (CC BY 4.0), 2,234 meshes, ~33 MB compressed, 2.28 M triangles; GPU-texture-driven batching + per-structure picking.

### Why we do NOT reuse that geometry approach
1. BodyParts3D has gross-organ meshes only — **no brainstem nuclei, no tracts, no thalamic subnuclei** — the exact content we need.
2. 33 MB download is hostile to a study tool that should open instantly.
3. Our core feature — **2D cross-section plates ↔ 3D clipping plane sync** — requires every structure to live in one canonical coordinate space, which hand-authored parametric geometry gives us for free and scanned meshes do not.

**Decision**: fully procedural, data-driven geometry (ellipsoid nuclei, tube-geometry tracts along Catmull-Rom curves, lathe-based brainstem/diencephalon envelopes), original hand-authored SVG plates. Zero external anatomy data → no attribution burden beyond textbook citations, tiny bundle, every primitive individually selectable.

## 2. Prior art & content-model references

| Source | What we take from it |
| --- | --- |
| [Neurotorium 3D Brain Atlas](https://neurotorium.org/tool/brain-atlas/) | IA proof: hierarchical tree (Diencephalon → Thalamus/Hypothalamus/Epithalamus → nuclei), 3-plane section views, search |
| [A high-resolution interactive atlas of the human brainstem (PMC8480283)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8480283/) | Free-viewing planes over brainstem; confirmation that axial/coronal/sagittal + user planes is the expected UX |
| [Midbrain, Pons, and Medulla: Anatomy and Syndromes (RadioGraphics 2019)](https://pubs.rsna.org/doi/abs/10.1148/rg.2019180126) | Definitive modern review of our exact cross-section levels + syndromes; cite in app references |
| [FreeSurfer ThalamicNuclei (25 nuclei)](https://freesurfer.net/fswiki/ThalamicNuclei) | Nomenclature sanity check for thalamic nuclear list (VPL/VPM/VL/VA/MD/Pulvinar/LGN/MGN…) |
| [Reddit r/threejs DKT neuroanatomy atlas](https://www.reddit.com/r/threejs/comments/y4puqb/neuroanatomy_atlas_using_threejs_tensorflow/) | Proof that Three.js/R3F handles hundreds of brain meshes interactively |
| [IMAIOS e-Anatomy](https://www.imaios.com/en/e-anatomy/brain/mri-axial-brain), [JHP MRI Brain Atlas](https://jhpmribrainatlas.rcc.uchicago.edu/mri-brain-atlas) | Plate-based axial/coronal/sagittal UX conventions (5 mm spacing, labeled overlays) |

### Datasets considered and rejected/deferred
- **BodyParts3D 4.0** — gross organs only (see above). Deferred as optional future context meshes.
- **BigBrain** (bigbrainproject.org) — CC BY-NC-SA, research-only, huge. Rejected.
- **Allen CCF** — mouse. Rejected.
- **FreeSurfer thalamic atlas** — requires running FreeSurfer; probabilistic histology atlas, coordinates not directly portable to a schematic web atlas. Used for nomenclature only.

## 3. Content authority (citations to embed in the app)

Primary: **Blumenfeld, *Neuroanatomy through Clinical Cases*** (2nd/3rd ed., Sinauer). Chapter map (titles verified via [CR4-DL ToC](https://brianpho.com/CR4-DL/textbooks/neuroanatomy-through-clinical-cases/)):
- Ch. 5 *Brain and Environs* · Ch. 6 *Corticospinal Tract and Other Motor Pathways* · Ch. 7 *Somatosensory Pathways* · Ch. 8 *Spinal Cord* · brainstem chapters (surface anatomy & cranial nerves, internal organization) · *Diencephalon: Thalamus and Hypothalamus* · chapters on basal ganglia, visual system, consciousness, memory.
- **Rule for data authors**: cite chapter **titles** (not bare numbers) + section/figure hints, e.g. `Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Diencephalon: Thalamus and Hypothalamus"`. Only add a number when certain of the edition.

Secondary: Patten *Neurological Differential Diagnosis* (brainstem level plates); Fix *High-Yield Neuroanatomy*; Snell *Clinical Neuroanatomy*; Nolte; Parent *Carpenter's Human Neuroanatomy*; RSNA 2019 review above; [Duke Lab 3 brainstem sectional anatomy](https://brain.oit.duke.edu/lab03/lab03.html).

## 4. Stack decision

- **Vite + React 18 + TypeScript** — same class as reference app, fastest DX, static deploy.
- **three + @react-three/fiber + @react-three/drei** — declarative scene graph, OrbitControls, Html tooltips, easy raycast events.
- **zustand** — tiny global store (selection, layers, planes, search).
- **Vanilla CSS** (custom properties, one design system) — avoids Tailwind/shadcn config overhead for a from-scratch design; fewer deps for agents to fumble.
- **No backend.** Static bundle; data as authored JSON + SVG, validated by a Node script at build time.

## 5. Key engineering insight

**One canonical coordinate space shared by 3D scene, tract waypoints, nucleus positions, and every 2D plate.** Transverse plates are keyed to a `y` level from `levels.json`; selecting a plate moves the 3D transverse clipping plane to that `y`, and dragging the plane snaps to the nearest plate. That bidirectional sync is the product's signature feature and is only possible because all geometry is authored in the same space.
