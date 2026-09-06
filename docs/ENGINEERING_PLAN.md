# Engineering Plan — 3D Brainstem & Diencephalon Atlas

**Product name (working title): NeuroAxis — 3D Brainstem Atlas**
**Scope**: Interactive web atlas of the diencephalon, mesencephalon (midbrain), and rhombencephalon (pons, medulla, cerebellum-related structures): 3D selectable nuclei + ascending/descending tracts, interactive 2D cross-sections in sagittal/transverse/coronal planes, neurophysiological functions, clinical significance, textbook references.
**Model of inspiration**: `ashemag/human-atlas` UX (select, layers, isolate, exploded view, search, detail panel) applied to brainstem neuroanatomy.
**Content authority**: Blumenfeld *Neuroanatomy through Clinical Cases* (primary), Patten, Fix, Snell, Nolte, RSNA RadioGraphics 2019 brainstem review. See `docs/RESEARCH_NOTES.md`.

---

## 1. Product requirements

### 1.1 Core features
1. **3D viewer** — orbit/zoom/pan; click-select any nucleus, tract, ventricle, or surface landmark; hover tooltip; selection shared globally.
2. **Region + system layers** — toggle visibility of: diencephalon / midbrain / pons / medulla / cerebellum contexts, and of nuclei / ascending tracts / descending tracts / ventricles / surface landmarks. Presets: "All", "Nuclei only", "Tracts only", "Clinical motor paths".
3. **Exploded view** — slider fans nuclei radially away from the brainstem axis while tracts stay in place.
4. **Clipping planes** — sagittal / coronal / transverse cut with sliders over the full canonical range; transverse slider snaps to plate levels; "show plane" helper toggle; option to hide everything on one side of the cut.
5. **2D cross-section plates** — 12 interactive SVG plates (9 transverse, 1 midline sagittal, 2 coronal). Hover/tap highlights region; click selects the structure everywhere (tree, 3D, info panel); labels with leader lines toggle on/off.
6. **2D↔3D sync** — selecting a plate sets the 3D transverse clipping plane to that plate's level; dragging the plane highlights the nearest plate in the level ruler.
7. **Structure browser** — taxonomy tree by region → subdivision → structure; search box (name + synonyms, case-insensitive substring); results jump to selection.
8. **Info panel** — per structure: overview (location, subdivision, laterality), connections (afferent/efferent), **function** (neurophysiology), **clinical significance** (syndromes + deficits), blood supply, references. Tabs or accordion on mobile.
9. **Tract inspector** — for a selected tract: direction (ascending/descending), origin→target, decussation level, modality, somatotopy, animated flow direction on the tube (shader or texture offset; static fallback acceptable).
10. **Clinical syndromes browser** — cards (e.g., Wallenberg, Weber, Benedikt, locked-in, Parinaud, Déjérine-Roussy, hemiballismus…) that, on open, highlight the involved structures in 3D and mark the relevant plate.
11. **Level ruler** — vertical rostro-caudal strip listing plate levels (pyramidal decussation → thalamus); click navigates.
12. **References panel** — global bibliography; each structure's refs link into it.
13. **Quiz mode (stretch)** — "Find the structure" click challenge from a random structure name, 10 rounds, score. Implement only if integration is otherwise complete.

### 1.2 Non-goals (v1)
- Photorealistic/MRI-derived geometry, patient-specific imaging, segmentation.
- Cerebral hemisphere/cortex content beyond context silhouettes.
- Backend, accounts, persistence beyond URL hash (deep-link to selected structure is a plus).
- MRI image plates (we use schematic vector plates; no medical-image licensing).

### 1.3 Quality gates
- `npm run check` (tsc --noEmit), `npm run validate` (data integrity), `npm run build` all exit 0.
- Dev server smoke: loads at `http://localhost:5173`, no console errors, selection works from each of: 3D click, tree click, search, plate click, syndrome card.
- Responsive at 1280×800 (desktop reference), 834×1112 (tablet), 390×844 (phone; panels become sheets).

---

## 2. Canonical coordinate system (the contract)

Axes in "atlas units" (au, ~0.7 mm each):

| Axis | Meaning | Range |
| --- | --- | --- |
| **x** | medial→lateral, **+x = patient LEFT** (so +x appears on image RIGHT in transverse plates — clinical convention) | −22 … +22 |
| **y** | inferior→superior, +y = superior | −55 … +45 |
| **z** | posterior→anterior, +z = anterior (ventral) | −18 … +18 |

Brainstem axis is (mostly) the y axis with a gentle ventral bow at the midbrain flexure (~+3 z at y≈12, returning to z≈0 at thalamus).

**Level table (levels.json)** — authoritative y anchors:

| Level id | Name | y (au) |
| --- | --- | --- |
| `lvl-spinal-medulla` | Cervicomedullary junction | −50 |
| `lvl-pyramid-decuss` | Medulla — pyramidal decussation | −46 |
| `lvl-sensory-decuss` | Medulla — sensory (internal arcuate) decussation | −42 |
| `lvl-olivary` | Medulla — mid-olivary (open medulla) | −34 |
| `lvl-pontomedullary` | Pontomedullary junction (CN VI–VII exits) | −24 |
| `lvl-pons-caudal` | Pons — lower (CN VI, VII, VIII nuclei) | −18 |
| `lvl-pons-middle` | Pons — midpontine (CN V) | −8 |
| `lvl-pons-rostral` | Pons — upper (CN IV exit, ICP→SCP transition) | +2 |
| `lvl-midbrain-ic` | Midbrain — inferior colliculus | +8 |
| `lvl-midbrain-sc` | Midbrain — superior colliculus (CN III) | +14 |
| `lvl-post-comm` | Posterior commissure / pretectal | +19 |
| `lvl-thalamus-mid` | Diencephalon — mid-thalamus (mammillary bodies) | +28 |
| `lvl-thalamus-rostral` | Diencephalon — rostral thalamus / hypothalamus (optic chiasm) | +36 |

Structures may span multiple levels (`levels: [ ... ]` on the record). Plates reference exactly these ids.

## 3. Content inventory (authoritative scope)

Region enum: `diencephalon | midbrain | pons | medulla | cerebellum`.
Kind enum: `nucleus | tract | ventricle | surface | vessel | context`.
Laterality: `midline | paired`.

**ID slug convention**: `nuc-…`, `tract-…`, `vent-…`, `surf-…`, `vasc-…`, `ctx-…` (e.g., `nuc-red-nucleus`, `tract-corticospinal-lateral`, `plate ids`: `plate-<level>` for transverse, `plate-sagittal-midline`, `plate-coronal-midbrain`, `plate-coronal-thalamus`).

### 3.1 Diencephalon (~30 records)
- **Thalamus** (each a nucleus record): anterior; ventral anterior (VA); ventral lateral (VL); ventral posterolateral (VPL); ventral posteromedial (VPM); lateral dorsal; lateral posterior; **pulvinar**; mediodorsal (MD); centromedian–parafascicular (intralaminar); midline/paraventricular; **reticular nucleus**; **lateral geniculate (LGN)**; **medial geniculate (MGN)**; internal medullary lamina (context).
- **Hypothalamus**: preoptic area; suprachiasmatic; supraoptic; paraventricular; arcuate; ventromedial; dorsomedial; posterior (incl. mammillary-body neurons); mammillary bodies (paired surface-visible); tuber/infundibulum + optic chiasm + mammillary bodies also as `surf-…` landmarks where helpful.
- **Epithalamus**: pineal gland; habenular nuclei; stria medullaris thalami (tract); posterior commissure (tract).
- **Subthalamus**: subthalamic nucleus; zona incerta; fields of Forel (H1/H2, context).
- **CSF**: third ventricle; cerebral aqueduct; (fourth ventricle listed under medulla).

### 3.2 Midbrain / mesencephalon (~16)
superior colliculus; inferior colliculus; periaqueductal gray; oculomotor nucleus; Edinger–Westphal; trochlear nucleus; **red nucleus**; substantia nigra pars compacta; substantia nigra pars reticulata; crus cerebri (fiber-bundle record; function field documents somatotopy: frontopontine medial → corticobulbar → corticospinal → temporoparietooccipitopontine lateral); interpeduncular fossa (surface); CN III exit (surface); CN IV exit (surface, dorsal); mesencephalic trigeminal nucleus & tract; central tegmental tract; MLF (single paired record spanning pons/midbrain, `region: midbrain`, levels listed across); dorsal raphe (spans, region: midbrain); cuneiform reticular formation; superior cerebellar peduncle decussation.

### 3.3 Pons (~20)
basis pontis (context: pontine nuclei + longitudinal/transverse fibers as two records); middle cerebellar peduncle; trigeminal motor nucleus; principal sensory nucleus V; spinal trigeminal nucleus + tract (region: pons, spans medulla); abducens nucleus; facial nucleus; superior salivatory (lacrimary) nucleus; vestibular nuclear complex (superior, medial, lateral, inferior — four records); ventral & dorsal cochlear nuclei; nucleus solitarius (rostral gustatory part); trapezoid body + superior olivary complex; lateral lemniscus; locus coeruleus; pontine reticular formation (oral/caudal); **PPRF**; CN V/VII/VIII exits (surface); abducens fibers–facial colliculus (surface/landmark note).

### 3.4 Medulla (~18)
pyramid (basis, corticospinal fibers) + pyramidal decussation; fasciculus gracilis + nucleus gracilis; fasciculus cuneatus + nucleus cuneatus; internal arcuate fibers (sensory decussation); inferior olivary complex (principal + medial accessory); medial lemniscus (formation→ascending; tract record spans); spinal trigeminal tract (if not owned by pons — owner: **medulla**, levels span); nucleus solitarius (cardiorespiratory part; owner: **medulla**); dorsal motor nucleus of vagus; nucleus ambiguus; hypoglossal nucleus; area postrema; inferior cerebellar peduncle; vestibular nuclei caudal extensions (cross-reference pons records, no duplicate); arcuate nucleus; medullary reticular formation (ventral/gigantocellular + medial); CN IX/X/XI/XII root exits (surface); obex (surface).

### 3.5 Cerebellum (context + 7 records)
context envelope (hemispheres + vermis); dentate nucleus; interposed (emboliform+globose); fastigial nucleus; inferior cerebellar peduncle (owner: medulla); middle cerebellar peduncle (owner: pons); **superior cerebellar peduncle** (owner: midbrain, tract); vermis (surface record).

### 3.6 Tracts (`tracts.json`, ~16) — each with waypoints, direction, modality, decussation, somatotopy, clinical
Ascending: dorsal column–medial lemniscus (spinal cord → gracile/cuneate → internal arculate → contralateral ML → VPL → S1); anterolateral/spinothalamic (lateral + ventral, cross within 1–2 segments); trigeminothalamic — ventral (principal sensory + spinal V → contralateral VPM) and dorsal (mechanosensory, ipsilateral, note); lateral spinocerebellar; ventral spinocerebellar; auditory pathway (cochlear nuclei → trapezoid/superior olive → lateral lemniscus → inferior colliculus → MGN — one composite record); spinoreticular/RAS arousal (reticular formation → intralaminar thalamus).
Descending: corticospinal (lateral, via internal capsule → crus cerebri → basis pontis → pyramid → pyramidal decussation → lateral column); corticobulbar; corticopontine (frontopontine + temporoparietooccipitopontine); rubrospinal; tectospinal (crosses in dorsal tegmental decussation); vestibulospinal — lateral (LVST) & medial (MVST via MLF); reticulospinal — pontine & medullary; MLF (mixed: vestibular↔oculomotor internuclear, tectospinal contributions); central tegmental tract; hypothalamospinal (sympathetic — clinical: central Horner; optional record).

### 3.7 Syndromes (`syndromes/*.json`, ≥18)
Lateral medullary (Wallenberg/PICA); medial medullary (ASA); hemimedullary; Millard-Gubler; Foville; locked-in (ventral pons); central pontine myelinolysis (osmotic demyelination); Weber; Benedikt; Claude; Nothnagel; Parinaud (dorsal midbrain); internuclear ophthalmoplegia (MLF); central Horner syndrome; Déjérine-Roussy thalamic pain; artery-of-Percheron paramedian thalamic; tuberothalamic aphasia-plus (optional); Korsakoff (mammillary); hypothalamic — diabetes insipidus/SIADH/autonomic; pineal region tumor gaze palsy; Parkinson's disease (SNc); hemiballismus (STN); cerebellar signs (dentate/SCP). Each: `structures[]`, `vascularTerritory`, `presentation`, `cause`, `refs`.

### 3.8 Vascular map (string fields + refs, no 3D vessels in v1)
ASA, PICA, vertebral, basilar + paramedian perforators, AICA, SCA, PCA (thalamogeniculate, tuberothalamic, paramedian thalamic/Percheron), collicular/quadrigeminal. Stored as `bloodSupply` on structures + `vascularTerritory` on syndromes.

### 3.9 Plates (12)
Transverse (9): `plate-pyramid-decuss`, `plate-sensory-decuss`, `plate-olivary`, `plate-pons-caudal`, `plate-pons-middle`, `plate-pons-rostral`, `plate-midbrain-ic`, `plate-midbrain-sc`, `plate-thalamus-mid`.
Sagittal (1): `plate-sagittal-midline` — midline profile: corpus callosum + 3rd ventricle + thalamus/hypothalamus blocks, aqueduct, tectum/colliculi, 4th ventricle, brainstem outline, pineal, mammillary bodies, optic chiasm.
Coronal (2): `plate-coronal-midbrain` — through cerebral peduncles/red nucleus/SN; `plate-coronal-thalamus` — through thalamus/3rd ventricle/LGN/MGN/pineal + cerebral peduncle slice below.

Each plate: 18–40 labeled regions, every region tagged `data-structure="<slug>"`; orientation markers L/R/A/P/S/I drawn in the SVG.

## 4. Data model (`src/types.ts`)

```ts
export type Region = 'diencephalon' | 'midbrain' | 'pons' | 'medulla' | 'cerebellum';
export type Kind = 'nucleus' | 'tract' | 'ventricle' | 'surface' | 'vessel' | 'context';
export type Laterality = 'midline' | 'paired';
export type Vec3 = [number, number, number];

export interface ClinicalItem { syndrome: string; findings: string; vascular?: string; note?: string }

export interface StructureRecord {
  id: string; name: string; synonyms?: string[];
  region: Region; subdivision: string; kind: Kind; laterality: Laterality;
  color: string;                     // hex
  function: string;                  // neurophysiology, 1–3 sentences
  connections?: { afferent?: string[]; efferent?: string[] };
  bloodSupply?: string;
  clinical?: ClinicalItem[];
  levels?: string[];                 // level ids where visible
  origin3d?: Vec3;                   // canonical space (one side for paired; renderer mirrors)
  size3d?: Vec3;                     // ellipsoid radii
  refs?: string[];                   // e.g. "Blumenfeld, 2nd ed., Ch. 'Diencephalon…'"
  contextNote?: string;              // for context records
}

export interface TractRecord {
  id: string; name: string;
  direction: 'ascending' | 'descending' | 'mixed';
  modality: string; origin: string; target: string;
  decussation: string; somatotopy?: string;
  function: string; clinical: ClinicalItem[];
  waypoints: Vec3[];                 // Catmull-Rom control points (canonical space)
  tubeRadius: number; color: string;
  levels?: string[]; refs?: string[]; synonyms?: string[];
}

export interface SyndromeRecord {
  id: string; name: string; eponym?: string;
  structures: string[];              // structure/tract ids
  vascularTerritory?: string;
  presentation: string; cause: string; refs?: string[];
}

export interface PlateRegionMap { slug: string; label: string; labelPos: [number, number] }

export interface PlateRecord {
  id: string; title: string;
  orientation: 'transverse' | 'sagittal' | 'coronal';
  region: Region; levelId?: string;   // transverse only
  svg: string;                        // 'plates/plate-olivary.svg'
  regions: PlateRegionMap[];          // duplicated from data-structure attrs for label routing
}
```

Files: `src/data/taxonomy.json` (registry of all ids → name/region/kind/color/subdivision/parent for the tree), `src/data/levels.json`, `src/data/structures/<region-group>.json` (array of `StructureRecord`), `src/data/tracts.json`, `src/data/syndromes/<group>.json`, `src/data/plates/<plate>.svg` + `plates.json` manifest.

**Loader** (`src/data/load.ts`) merges all files; id collisions throw.

## 5. 3D rendering (`src/components/viewer3d/`)

- `<Canvas>` R3F; camera ~[30, 10, 55] looking at [0, -5, 0]; `OrbitControls` with damping.
- **Envelopes** (context meshes, translucent gray, `depthWrite:false`, `renderOrder:-1`): medulla tube (lathe, radius 5→7 au), pontine bulge (scaled sphere r≈11 flattened z), midbrain tube (r≈7), thalamus paired ovoids (r≈7×5×9), hypothalamic wedge, cerebellum (two spheres + vermis bar). Built in `src/geometry/envelope.ts` from level table.
- **Nuclei**: `<mesh>` with `SphereGeometry(1, 24, 16)` scaled by `size3d`, positioned at `origin3d`; paired → mirrored instance at −x. Materials: MeshStandardMaterial, roughness 0.55, emissive on hover/select.
- **Tracts**: `TubeGeometry(CatmullRomCurve3(waypoints), 64, tubeRadius, 10)`; ascending = blue family `#3b82f6`, descending = violet `#8b5cf6`, mixed = `#a78bfa`→ per-tract override allowed; optional `drei` `<Trail>`-style animated dashes = stretch (skip if risky).
- **Ventricles**: cyan translucent (`vent-*` records + aqueduct tube + 4th ventricle tent).
- **Picking**: R3F `onPointerOver/Out/Down` per mesh; store `selectedId`, `hoveredId` in zustand.
- **Highlighting**: selected → emissive boost + others dim to 0.15 opacity; hover → outline via `drei/Outlines` or emissive tint.
- **Clipping**: three `Plane` + `clippingPlanes` on materials; three global sliders (sagittal x, coronal z, transverse y); plane helper mesh toggle.
- **Explode**: offset = (normalized xz of origin) × factor for nuclei; tracts unaffected.
- **Labels in 3D**: `drei/Html` sprite labels for selected + hovered only (performance).
- **Lighting**: ambient 0.7 + directional key/fill; background radial gradient (CSS behind transparent canvas).
- Performance: <300 draw calls; memoized geometries; `dpr={[1, 2]}`.

## 6. 2D plates architecture

- SVG files authored per contract (below); `PlateRenderer.tsx` fetches SVG text (Vite `?raw`), injects via `dangerouslySetInnerHTML`, then wires events by querying `[data-structure]` nodes; recolors from taxonomy; dims non-selected; toggles `plate-label` groups; reads label positions from manifest.
- **SVG authoring contract**: viewBox `0 0 800 800`; transverse: dorsal top, patient LEFT on image right, L/R badges; sagittal: anterior left, superior top; coronal: patient left on image right, superior top. Every region element carries `data-structure="<slug>"`; label groups `<g class="plate-label" data-for="<slug>">` containing `<line>` + `<text>`; outline path `data-role="outline"`; stroke `#0f172a` at 1.5; plate file must not embed critical styling (renderer controls fill/opacity via CSS vars).
- Palette by kind (structure color from taxonomy wins): nuclei amber `#d97706`, cranial-nerve nuclei teal `#14b8a6`, ascending blue `#3b82f6`, descending violet `#8b5cf6`, ventricle cyan `#06b6d4`, surface slate `#64748b`, context gray `#94a3b8`. Named overrides: red nucleus `#b91c1c`, SN `#1f2937`/`#374151`, locus coeruleus `#1d4ed8`.

## 7. UI layout & state

Desktop 3-column: left sidebar (search + taxonomy tree + level ruler), center (tabs: 3D | Plates | Syndromes; Plates tab shows plate picker strip + plate), right info panel (selection details; empty state = help). Header: title, view presets, quiz (stretch), references button → modal. Phone: header + main + bottom sheet for info.

zustand store: `selectedId, hoveredId, activeTab, plateId, clip {x,z,y,on}, snapPlate, explode, layers {regions:set, kinds:set}, search, syndromeId, labelVisibility`.

## 8. Tech stack & repo layout

Vite 5 + React 18 + TS 5.6; three ^0.169; @react-three/fiber ^8.17; @react-three/drei ^9.114; zustand ^4.5. npm scripts: `dev` (--port 5173), `build` (vite build), `check` (tsc --noEmit), `validate` (node scripts/validate-data.mjs).

```
index.html  package.json  vite.config.ts  tsconfig.json
scripts/validate-data.mjs
docs/ (RESEARCH_NOTES, ENGINEERING_PLAN, CONTENT_INVENTORY, ATTRIBUTION)
src/
  main.tsx  App.tsx  types.ts
  state/store.ts
  data/ taxonomy.json levels.json tracts.json plates.json
        structures/{diencephalon-thalamus,diencephalon-hypothalamus,diencephalon-epithalamus-subthalamus,midbrain,pons,medulla}.json
        syndromes/{diencephalon,midbrain,hindbrain}.json
        plates/*.svg
        load.ts
  geometry/ envelope.ts curves.ts
  components/
    Header.tsx SearchBox.tsx TaxonomyTree.tsx LevelRuler.tsx
    InfoPanel.tsx SyndromeBrowser.tsx ReferencesModal.tsx Legend.tsx
    PlatesTab.tsx PlateRenderer.tsx
    viewer3d/ Viewer3D.tsx SceneLayers.tsx NucleusMesh.tsx TractTube.tsx ClipControls.tsx ExplodeSlider.tsx
  styles/ base.css tokens.css layout.css panels.css viewer.css plates.css
```

## 9. Validation (`scripts/validate-data.mjs`)

Exits 1 with a readable report on any failure:
- JSON parses; ids globally unique across structures+tracts; slugs match `^(nuc|tract|vent|surf|vasc|ctx)-[a-z0-9-]+$`.
- Every required field non-empty; color `^#[0-9a-f]{6}$`; waypoints ≥ 2; `origin3d`/`size3d` numeric triples within canonical bounds.
- Plate manifest ↔ SVG files exist; every `data-structure` attr in every SVG resolves to a known id; every `data-for` label matches a present region; level ids resolve.
- Syndrome `structures[]` resolve; taxonomy registry ⊇ union of all structure/tract ids (and flags records missing from registry).
- No two structures share the same `name`.

## 10. Swarm task DAG

Roles: architect / builder / reviewer / integrator. Shared spec = this file + `docs/CONTENT_INVENTORY.md`. Waves:

| # | Task | Role | Depends on | Owns (writes) |
| --- | --- | --- | --- | --- |
| 1 | `scaffold` | architect | — | package.json, vite/ts configs, index.html, src/main.tsx, src/App.tsx placeholder, styles base, .gitignore |
| 2 | `taxonomy` | architect | — | docs/CONTENT_INVENTORY.md, src/data/taxonomy.json, levels.json |
| 3 | `types-validator` | architect | 1, 2 | src/types.ts, scripts/validate-data.mjs, package.json scripts, docs/DATA_CONTRACT.md |
| 4 | `data-diencephalon` | builder | 3 | structures/diencephalon-*.json, syndromes/diencephalon.json |
| 5 | `data-midbrain` | builder | 3 | structures/midbrain.json, syndromes/midbrain.json |
| 6 | `data-hindbrain` | builder | 3 | structures/pons.json, medulla.json, syndromes/hindbrain.json |
| 7 | `tracts-data` | builder | 3 | tracts.json |
| 8 | `plates-hindbrain` | builder | 3 | plates/{pyramid-decuss, sensory-decuss, olivary, pons-caudal, pons-middle, pons-rostral}.svg + manifest fragment |
| 9 | `plates-rostral` | builder | 3 | plates/{midbrain-ic, midbrain-sc, thalamus-mid, sagittal-midline, coronal-midbrain, coronal-thalamus}.svg + manifest fragment |
| 10 | `ui-shell` | builder | 3 | components (except viewer3d/), state/store.ts, data/load.ts, styles |
| 11 | `viewer3d` | builder | 4–7 | components/viewer3d/**, geometry/envelope.ts, curves.ts |
| 12 | `integration` | integrator | 4–11 | App.tsx wiring, README.md, docs/ATTRIBUTION.md, LICENSE, plates.json final manifest, fixes, optional git init+commit |
| 13 | `review-qa` | reviewer | 12 | spot-fixes anywhere; verifies all gates + anatomy accuracy sample |

Evidence per task: files exist & `npm run validate` / `npm run build` exit 0 (task-appropriate). Reviewer reviews every task (2 loops); final `review-qa` is a task.

## 11. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Hand-authored SVG plates anatomically wrong | CONTENT_INVENTORY gives per-plate region lists + layout guidance from textbook conventions; reviewer with neuroanatomy knowledge checks each plate against Blumenfeld/Patten figures; 2 review loops |
| id drift between plates/3D/data | taxonomy.json is the single registry created FIRST; validator enforces referential integrity |
| 3D coordinates inconsistent with plates | same canonical space + level table; explode/clipping use the table; reviewer cross-checks 5 structures per region between plate & 3D |
| Transparent-mesh picking artifacts | envelopes non-pickable (`raycast = null`), depthWrite false, renderOrder; nuclei/tracts opaque |
| Scope creep (quiz, animations) | quiz + flow animation are stretch-only; core gates first |
| Bundle/perf | no external meshes; total geometry < 1 MB; memoization; dpr cap |

## 12. Definition of done

All quality gates green; ≥100 structure/tract records with function + clinical + refs; 12 plates interactive; 3D↔2D sync works; syndromes browser highlights structures; responsive at three breakpoints; README with run instructions + screenshot-worthy description; ATTRIBUTION lists textbook sources.
