# Telencephalon Plan — NeuroAxis v7 (the rest of the brain)

Goal: layer the **telencephalon** (cerebral hemispheres, basal ganglia, limbic structures, lateral ventricles and telencephalic white matter) onto the existing brainstem + diencephalon atlas — without losing the brainstem as the focus, and without leaving the canonical coordinate contract that keeps the 3D, the 2D plates, the clip planes and the real imagery in sync.

**Headline research result: this needs no new data source and no new licence work.** The BodyParts3D 4.0 archive we already own (CC BY 4.0, `assets-src/bp3d/isa_BP3D_4.0_obj_99.zip`, 2,234 meshes) contains the whole telencephalon. Verified by extracting and measuring the actual meshes (§1).

---

## 1. Data — what we already have (verified, not assumed)

Every file below was extracted from the archive we own and parsed with the repo's own `parse-objs.mjs`; faces are pre-decimation counts.

| Structure | FMA | FJ files | faces | Notes |
| --- | --- | --- | --- | --- |
| **Cerebral white matter (L/R cores)** | — | FJ1758, FJ1806 | ~1.8 MB each | the hemispheric mass; `white matter of left/right cerebral hemisphere` |
| Corpus callosum | 86464 | FJ1742 | 30,232 | complete commissure |
| **Lateral ventricles (L/R)** | 78448/78449/78450 | FJ1767, FJ1814 | 17,968 / 18,016 | full ventricular cast |
| Caudate nucleus (L/R) | 61833 | FJ1754, FJ1802 | 2,544 / 2,570 | |
| Putamen (L/R) | 61834 | FJ1776, FJ1823 | 7,056 / 7,064 | |
| Globus pallidus (L/R) | 61835 | FJ1757, FJ1805 | 7,080 / 5,344 | |
| Amygdala (L/R) | 61841 | FJ1753, FJ1829 | 382 / 384 | |
| Hippocampus (L/R) | 62493 | FJ1759, FJ1807 | 980 / 1,020 | classed as cortex (allocortex) in BP3D |
| Cingulate gyrus (L/R) | 62434 | FJ1739, FJ1740 | 2,416 / 2,346 | |
| Insula (L/R) | 67329 | FJ1748, FJ1749 | 2,448 each | |
| Occipital lobe (L/R) | 67325 | FJ1791, FJ1792 | 4,390 / 4,564 | |
| Internal capsule (L/R) | 61950 | FJ1750, FJ1751 | 10,740 each | |
| Fornix (L/R) + commissure | 61965/61970 | FJ1756, FJ1804, FJ1741 | 6,764 / 6,748 / 10,632 | |
| Choroid plexus (L/R) | 61934 | FJ1755, FJ1803 | 4,930 / 4,942 | |
| White matter of telencephalon (extra) | 83930 | FJ1734 | 812 | small; anatomy TBD at registration |
| Named gyri (19 concepts) | — | various | — | superior/middle/inferior frontal, precentral, postcentral, supramarginal, angular, middle/inferior temporal, fusiform, parahippocampal, orbital … available if gyral relief is wanted |

**Total: 175,562 faces** for the set above (before any resampling).

**Known gap:** BP3D has **no explicit cortical gray-matter surface** (`gray matter of cerebral hemisphere` does not exist as a concept; the `region of cerebral cortex` concept resolves only to the hippocampus). So the cortical ribbon must be **derived**: dilate the cerebral-white-matter SDF by the cortical thickness (~3–4 mm ≈ 2.5–3.3 au) and subtract the white matter — the standard "inflated ribbon" construction, done in the existing SDF kernel. The named gyri meshes are available to add surface relief (sulcal grooves, sylvian fissure) where the derivation looks too smooth.

**Imaging:** the existing MRI (OpenNeuro ds007313, CC0) and CT (NLM Visible Human) volumes both cover the whole head, so the telencephalon is already *in* the raw data — only the canonical grids need re-baking over a bigger box. No new imaging licence either.

## 2. Canonical space — AMENDMENT B (measured)

Applying the live registration constants (`mmPerAu 1.2`, seam −0.655 mm, warp knots in `registration-summary.json`, `zRef` calibrated from the canonical pons) to the measured telencephalon bboxes gives:

| axis | telencephalon extent (au) | current bound (AMENDMENT A) | verdict |
| --- | --- | --- | --- |
| x | −37.4 … +37.4 | ±27 core / ±48 context | **already covered** |
| y | −7.8 … **+80.6** | −55 … +45 | **extend to +85** (cortex vertex) |
| z | **−72.6** … **+54.4** | −56 … +26 | **extend to −75 … +55** (occipital pole … frontal pole) |

**AMENDMENT B (binding for the v7 run — numbers CORRECTED by the v7 QA against the baked geometry):**
- Canonical bounds become **x ∈ [−58, +58]**, **y ∈ [−55, +116]**, **z ∈ [−76, +72]**.
  The estimate in the table above came from the lobar/gyral parts only; the v7 QA measured the
  *baked* meshes and found the cerebral white-matter cores and the derived ribbon reach
  **x ±56.1, y −6.8…+113.7, z −72.8…+70.6 au** — i.e. the first AMENDMENT B box
  (x ±48, y +85, z +55) clipped 28.8 au of cortex at the vertex, 8.1 au laterally and
  15.7 au at the frontal pole, leaving them unreachable by the clip sliders.
  `scripts/verify/anatomy-qa.mjs` now asserts that every baked part lies inside `CLIP_BOUNDS`.
- `levels.json` gains telencephalic transverse anchors above the diencephalon roof: **+48** (thalamostriate / body of lateral ventricle), **+58** (basal ganglia + internal capsule), **+68** (centrum semiovale), **+78** (high convexity). Existing 13 anchors keep their exact y values (nothing moves — the brainstem contract is untouched).
- `ClipControls` / `SectionSliderBar` ranges: y [−55, +116], z [−76, +72], x [−58, +58]. Snap-to-level continues to snap y to level anchors.
- Camera default distance ×1.4; the level ruler gains the four new levels; `CLIP_BOUNDS` in `clipPlanes.ts` is the single place they are declared (the validator's `AXIS_BOUNDS` mirrors it).
- MRI/CT grids re-baked over the new box (dims 81×113×107 uint8 ≈ 956 KB each; imaging payload 7.30 MB → 8.71 MB, so the cap rises to **10 MB** and is stated in the README).

## 3. Data model

- **New region**: `telencephalon` (the `Region` union, taxonomy, tree, filters, legend, plate manifests all keyed off it).
- **Subdivisions**: `Cerebral cortex` (lobes + key gyri), `Basal ganglia`, `Limbic system` (hippocampus, amygdala, fornix, cingulate), `Telencephalic white matter` (corpus callosum, internal capsule), `Lateral ventricles`.
- **Kinds** reuse the existing set (`nucleus`, `tract`, `ventricle`, `surface`, `context`); the cortex is `context` (an envelope) with lobe-level `surface`/`ctx-` entries so plate labels and selection still work.
- **id prefixes** follow the frozen slug contract (`ctx-`, `nuc-`, `tract-`, `vent-`, `surf-`) — no new prefix needed.
- **Content to author (~40 records)**: 6 lobes (frontal, parietal, temporal, occipital, insula, limbic lobe) + cingulate/parahippocampal gyri; basal ganglia (caudate, putamen, globus pallidus internus/externus, nucleus accumbens/ventral striatum, claustrum as context); limbic (hippocampus, dentate gyrus, amygdala, fornix, mammillothalamic continuity note); ventricles (lateral ventricles + atria/horns, choroid plexus, interventricular foramen); white matter (corpus callosum with its parts, internal capsule limbs, corona radiata, optic radiation, cingulum, uncinate, superior longitudinal fasciculus — the last four are authored as tracts with waypoints since BP3D has no fiber meshes); plus a small number of functional-anatomy `context` records (planum temporale, operculum) only if they earn their place.

## 4. Geometry pipeline

1. **Register** (`scripts/lib/register.mjs`): add the telencephalon files to its input table and re-run — the same axis remap, y-warp and centerline straightening then produce canonical OBJs for them (`assets-src/bp3d/canonical/tel-*.obj`). One run, deterministic, no new code beyond the table + a `raw-tel` source path.
2. **Bake** (`scripts/anatomy-recipes/*`): envelopes for each lobe (or one hemisphere shell + fissure subtracts), the WM cores, corpus callosum, lateral ventricles, basal ganglia nuclei, hippocampus/amygdala/fornix. Cortex = ribbon derivation (§1) with sulcal grooves sculpted from the gyri meshes; CSF spaces carved (lateral ventricles, interhemispheric and sylvian fissures).
3. **Budget**: decimate to keep the *rendered* total ≤ 800k tris (currently 320k). Suggested caps: hemisphere shell ≤ 90k each, corpus callosum ≤ 25k, ventricles ≤ 20k each, basal ganglia ≤ 8k each, hippocampus/amygdala ≤ 6k each. Committed GLB payload: currently 7.75 MB → cap 14 MB (state it in `anatomy-manifest.json` notes + README).
4. **LOD/legibility**: the cortex is 4–5× the brainstem in every dimension; the default view must stay brainstem-centric (§5).

## 5. Rendering & UX (the part that decides whether this is usable)

- **Cortex ghost by default**: hemispheres render as a translucent shell (opacity ~0.12–0.18, `depthWrite:false`, back-face culled) so the brainstem and diencephalon remain visible through it — mirroring how the existing context envelopes behave, but at hemisphere scale.
- **Layer presets** gain telencephalon-aware options: `Brainstem focus` (cortex hidden except faint outline), `Deep structures` (cortex ghost + basal ganglia/limbic emphasised), `Whole brain`, `Cortex only`.
- **Explode**: hemisphere shells separate outward along ±x with a larger factor than nuclei; document the rule.
- **Clipping**: the four new levels make coronal/axial navigation through the hemispheres meaningful; the plate↔clip sync must keep working with the extended ranges.
- **Section canvas / PiP**: with the bigger box the ortho framing must auto-fit per axis (the v6 `planeGeometry` module already centralises this — extend its extents, do not re-derive).
- **Performance**: 84 → ~130 meshes; cortex shells dominate fill rate. Keep the SSAO/PiP quality tiers honest, and consider `frustumCulled` + `renderOrder` tuning rather than more geometry.

## 6. Plates (2D)

New authored SVG plates (hand-drawn, same conventions and label-routing attributes as the existing 12):
- **Axial/transverse at +58** (basal ganglia, internal capsule, lateral ventricles, thalamus below) — the highest-value teaching section.
- **Coronal through the thalamus/basal ganglia** (already have `plate-coronal-thalamus`; extend a coronal at the level of the anterior commissure/fornix if it adds value).
- **Sagittal hemisphere** (mid-sagittal showing corpus callosum, cingulate, brainstem, cerebellum together).
- Optional: axial at +68 (centrum semiovale) if authoring capacity allows.

## 7. Swarm DAG (8 tasks)

| # | Task | Role | Deps | Owns |
| --- | --- | --- | --- | --- |
| 1 | `tel-register` | architect | — | `scripts/lib/register.mjs` (input table), `assets-src/bp3d/canonical/tel-*.obj`, `REGISTRATION.md` addendum, `RESEARCH_TEL.md` numbers |
| 2 | `tel-taxonomy` | architect | — | `src/data/taxonomy.json` (telencephalon region + ~40 entries), `src/data/levels.json` (4 new anchors), `docs/DATA_CONTRACT` note |
| 3 | `tel-geometry` | builder | 1 | `scripts/anatomy-recipes/tel-*.mjs` + baked GLBs + `anatomy-manifest.json` (cortex ribbon derivation, decimation, budget report) |
| 4 | `tel-space` | builder | 2 | `clipPlanes.ts` CLIP_BOUNDS, `planeGeometry` extents, ClipControls/SectionSliderBar ranges, camera framing, store defaults |
| 5 | `tel-imaging` | architect | 2 | re-baked `mri-t1.bin`/`ct.bin` + manifests + previews over the new box (same scripts, new bounds), README budget note |
| 6 | `tel-content` | builder | 2 | ~40 authored records (structures/tracts/syndromes refs), `webRefs.ts` entries, `CONTENT_INVENTORY.md` telencephalon section |
| 7 | `tel-plates` | builder | 2 | 2–3 new SVG plates + `plates.json`, label routing, validator-clean |
| 8 | `integration-v7` | integrator | 3,4,5,6,7 | SceneLayers/layer presets/cortex ghost, README, gates, browser acceptance, commit |

Then `review-qa-v7` (reviewer) — 9th task: orientation/scale sanity, cortex-vs-brainstem legibility, budget, regression, verdict.

## 8. Risks & mitigations
| Risk | Mitigation |
| --- | --- |
| Cortex swamps the app (visually and in perf) | ghost-by-default opacity, brainstem-first presets, strict tri caps, per-mesh LOD |
| Canonical-space extension breaks the existing brainstem contract | **nothing below +45 moves**: existing anchors, plates, clip values and imagery keep their coordinates; only new ranges are added |
| Derived cortical ribbon looks artificial | sculpt sulci/fissures from the available gyri meshes; keep the ribbon's amplitude modest; verify against the sagittal plate |
| MRI/CT re-bake changes existing section appearance | re-bake with the same registration affine extended, then diff the existing 13 levels' slices before/after and report any change |
| Scope creep in content authoring | cap at the ~40 records listed in §3; anything beyond is a follow-up |
| Two swarms colliding on shared files | v7 starts only after the v6 remediation run reaches its integration task |

## 9. Acceptance
- Telencephalon visible and selectable: lobes, basal ganglia, hippocampus/amygdala, ventricles, corpus callosum all pickable in 3D and on the new plates.
- Cortex ghost default keeps the brainstem readable (verified in the browser at default framing).
- The four new levels drive clip + plates + live section correctly; snap-to-plate works at them.
- MRI/CT underlays cover the hemispheres at any plane (spot-check at y = +60: cortical ribbon + ventricles visible).
- Rendered tris ≤ 800k, committed anatomy GLB ≤ 14 MB, imaging ≤ 10 MB; `validate`/`check`/`build`/`verify:*` green; `verify:audit` extended with telencephalon checks and 0 failures.
- No regression in the existing brainstem/diencephalon experience: existing plate↔3D sync, sectioning and imagery byte-identical at the old levels.
