# NeuroAxis v17 — vasculature depth: lenticulostriate courses, granular branches, surface-hugging vessels (plan of record + closure)

**Authority.** This is the run's **plan of record and closure**, written by the integrator task `integrate-docs` for run
`run-mtze6lyq-t83x`. The architect's **executable contract** is [`PLAN.md`](../PLAN.md) at the repo root (397 lines,
gitignored, working-tree only): its §2 is the granular record list, §3 the blob fix, §4 the surface-projection method,
§5 the render architecture, §6 the payload proof, §7 the fourteen places the dispatch spec got wrong and §8 the
acceptance criteria. This file does not restate `PLAN.md`; it records **what shipped, what the gates printed, and what
did not ship**. Every number below was printed by a command run in this checkout — the command is named next to it.

Canonical space: **x = +patient-LEFT, y = +superior, z = +anterior, 1 au = 1.2 mm**; `CLIP_BOUNDS` =
x[−58, 58] y[−55, 116] z[−76, 72] (`src/components/viewer3d/clipPlanes.ts`).

---

## 0. The run, and which file owns what

| task | role | writes (exclusive) | outcome |
| --- | --- | --- | --- |
| `architect-review` | architect | `PLAN.md` | the record list, the measured landmarks, the projection method, the render route — all verified against the checkout |
| `vasc-courses-author` | builder | `src/data/structures/vasculature-courses.json`, `src/data/taxonomy.json`, `src/data/webRefs.ts`, `scripts/verify/vasc-courses.mjs` | **39 authored course records**, 172 waypoints, all 39 ids registered first, the measured projection pipeline, the courses gate |
| `vasc-render-platform` | builder | `src/geometry/vasculature-courses.ts`, `src/components/viewer3d/SceneLayers.tsx`, `src/components/section/sectionAssets.ts`, `scripts/verify/vessel-render.mjs` | the `VesselCourseRecord` table + merge, the 3D tube pass, the 2D procedural parts, the **blob suppression**, the render gate |
| `review-qa` | reviewer | `scripts/verify/area-toggles.mjs`, `scripts/verify/audit.mjs`, `scripts/verify/checks.mjs` | adversarial falsification (its own GLB reader), the two count-stale gates re-pointed, four product findings reported |
| `integrate-docs` | integrator | `package.json`, `README.md`, `README.zh-CN.md`, `docs/CONTENT_INVENTORY.md`, `docs/VASC_INVENTORY.md`, `docs/SWARM_V17_PLAN.md` | this file, the npm wiring, the two READMEs, the two inventories, the full non-browser sweep |

**The payload constraint decided the architecture**, exactly as the brief said it would: the anatomy GLB budget is
**13.82 MiB of parts (14,486,228 B) against a 14 MiB cap** with **0.18 MiB** of headroom, and the BP3D branch elements
this run draws would need **0.3–1.4 MiB** baked (`PLAN.md` §6). So every new granular vessel is an **authored course
record rendered as a procedural tube**: **zero new bytes on disk**, no new GLB, no new manifest part, no new bounding box.

---

## 1. What shipped, file by file

| file | change | measured by |
| --- | --- | --- |
| `src/data/structures/vasculature-courses.json` **(new)** | **39 course records** (37 new + 2 replacing a built-in), 172 waypoints, 67 of them projected onto committed envelopes, per-waypoint `measured.envelopeResiduals` | `npm run verify:vasc-courses` (2,171 assertions) |
| `src/data/taxonomy.json` | **248 → 287 rows**; `vessel` rows **14 → 53**; 0 registry-only rows; every new id `vasc-*` + `kind:"vessel"` | `npm run validate` |
| `src/data/webRefs.ts` | one curated reference per new id (the `vessel` kind has no automatic fallback) | `npm run validate` + the courses gate |
| `src/geometry/vasculature-courses.ts` **(new)** | `VesselCourseRecord`, `VESSEL_COURSES`, `hasVesselCourse`, `VesselCourseGroup`, `isPairedVessel`, `mirrorVesselCourse`, `vesselTubeCount`, `readAuthoredVesselCourses` / `mergeVesselCourses`, and the **built-in Tier-1 lenticulostriate courses** that guarantee the blob fix | `npm run verify:vessel-render` |
| `src/components/viewer3d/SceneLayers.tsx` | the vessel tube pass (one `<TractTube>` per course + `<TractTube mirrored>` per paired course) and the **blob suppression line** beside the nerve one | the executed 3D truth table (7 layer states) |
| `src/components/section/sectionAssets.ts` | the nerve route generalised into one shared adapter; `vesselCourseMeta`, `SECTION_VESSEL_PARTS`, `registryVesselParts()`, `partsForCanvas()`; and the **inherited mirror-cache bug** (`registryNerveParts` swept the twin under the authored id, duplicating geometry) fixed for both families | the shared-builder comparison (185,493 position values identical) |
| `scripts/verify/vasc-courses.mjs` **(new)** | the data gate: registration, waypoints, `CLIP_BOUNDS`, projection arithmetic re-derived from the GLB bytes, mirror consistency, links, the blob fix, the radius table, payload | `npm run verify:vasc-courses` |
| `scripts/verify/vessel-render.mjs` **(new)** | the render gate: the merged table, the 3D tube list over 7 layer states, the one-body-per-record table, the 2D registry + worker contours, the shared builder, payload | `npm run verify:vessel-render` |
| `package.json` | **two npm scripts added** (`verify:vasc-courses`, `verify:vessel-render`), nothing pre-existing touched — §9 | both scripts were then executed **through npm** (§7), so the wiring itself is tested |

---

## 2. The granular vessel table

### 2.1 The 40 shipped courses (39 authored + 1 built-in umbrella)

`course au / mm` is the **published chord** length (straight segments between the record's own waypoints, computed from
the shipped JSON; `mm = au × 1.2`). The render gate prints the same figure in mm next to each id, and the two agree to
the printed rounding. `terr.` is the number of `territory[]` ids, all of which resolve (§2.2).

| # | id | name | parent artery (registry parent) | lat. | terr. | course au / mm | r au (calibre mm) | surface |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `vasc-lateral-lenticulostriate-arteries-1` | Lateral lenticulostriate artery 1 (putamen, antero-superior) | `vasc-middle-cerebral-artery` (registry parent `vasc-lateral-lenticulostriate-arteries`) | paired | 3 | 26.88 / 32.3 | 0.333 (0.8) | **none** |
| 2 | `vasc-lateral-lenticulostriate-arteries-2` | Lateral lenticulostriate artery 2 (putamen, middle) | `vasc-middle-cerebral-artery` (registry `…lateral-lenticulostriate-arteries`) | paired | 3 | 23.66 / 28.4 | 0.333 (0.8) | **none** |
| 3 | `vasc-lateral-lenticulostriate-arteries-3` | Lateral lenticulostriate artery 3 (putamen, postero-inferior) | `vasc-middle-cerebral-artery` (registry `…lateral-lenticulostriate-arteries`) | paired | 3 | 29.42 / 35.3 | 0.333 (0.8) | **none** |
| 4 | `vasc-lateral-lenticulostriate-arteries-4` | Lateral lenticulostriate artery 4 (putamen, lateral) | `vasc-middle-cerebral-artery` (registry `…lateral-lenticulostriate-arteries`) | paired | 3 | 23.92 / 28.7 | 0.333 (0.8) | **none** |
| 5 | `vasc-medial-lenticulostriate-arteries-1` | Recurrent artery of Heubner 1 (caudate head, anterior) | `vasc-anterior-cerebral-artery` (registry `…medial-lenticulostriate-arteries`) | paired | 3 | 29.15 / 35.0 | 0.417 (1.0) | **none** |
| 6 | `vasc-medial-lenticulostriate-arteries-2` | Recurrent artery of Heubner 2 (caudate head, posterior) | `vasc-anterior-cerebral-artery` (registry `…medial-lenticulostriate-arteries`) | paired | 3 | 24.01 / 28.8 | 0.417 (1.0) | **none** |
| 7 | `vasc-mca-insular-segment` | MCA insular segment (M2) | `vasc-middle-cerebral-artery` | paired | 5 | 27.05 / 32.5 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 8 | `vasc-mca-superior-terminal-branch` | MCA superior (cortical) terminal branch | `vasc-middle-cerebral-artery` | paired | 8 | 63.92 / 76.7 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 9 | `vasc-mca-inferior-terminal-branch` | MCA inferior (cortical) terminal branch | `vasc-middle-cerebral-artery` | paired | 7 | 98.80 / 118.6 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 10 | `vasc-mca-angular-branch` | MCA branch to the angular gyrus | `vasc-middle-cerebral-artery` | paired | 5 | 34.43 / 41.3 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 11 | `vasc-mca-middle-temporal-branch` | MCA middle temporal branch | `vasc-middle-cerebral-artery` | paired | 3 | 9.14 / 11.0 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 12 | `vasc-mca-posterior-temporal-branch` | MCA posterior temporal branch | `vasc-middle-cerebral-artery` | paired | 4 | 14.76 / 17.7 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 13 | `vasc-mca-temporo-occipital-branch` | MCA temporo-occipital branch | `vasc-middle-cerebral-artery` | paired | 3 | 16.44 / 19.7 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 14 | `vasc-mca-m4-prefrontal-branch` | MCA M4 prefrontal branch | `vasc-middle-cerebral-artery` | paired | 4 | 47.23 / 56.7 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 15 | `vasc-mca-m4-precentral-branch` | MCA M4 precentral branch | `vasc-middle-cerebral-artery` | paired | 5 | 49.22 / 59.1 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 16 | `vasc-mca-m4-central-branch` | MCA M4 central (rolandic) branch | `vasc-middle-cerebral-artery` | paired | 4 | 59.20 / 71.0 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 17 | `vasc-mca-m4-anterior-parietal-branch` | MCA M4 anterior parietal branch | `vasc-middle-cerebral-artery` | paired | 3 | 71.55 / 85.9 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 18 | `vasc-aca-pericallosal-artery` | Pericallosal artery (A2–A3) | `vasc-anterior-cerebral-artery` | paired | 9 | 107.33 / 128.8 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 19 | `vasc-aca-callosomarginal-artery` | Callosomarginal artery (A3) | `vasc-anterior-cerebral-artery` | paired | 6 | 107.82 / 129.4 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 20 | `vasc-aca-frontopolar-artery` | Frontopolar artery (A2) | `vasc-anterior-cerebral-artery` | paired | 2 | 44.05 / 52.9 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 21 | `vasc-aca-orbitofrontal-artery` | ACA orbitofrontal branch | `vasc-anterior-cerebral-artery` | paired | 2 | 28.30 / 34.0 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 22 | `vasc-pca-parieto-occipital-artery` | Parieto-occipital artery (P4) | `vasc-posterior-cerebral-artery` | paired | 4 | 131.16 / 157.4 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 23 | `vasc-pca-calcarine-artery` | Calcarine artery (P4) | `vasc-posterior-cerebral-artery` | paired | 5 | 85.25 / 102.3 | 0.833 (2.0) | `ctx-hemisphere-l` |
| 24 | `vasc-pca-posterior-temporal-branches` | Posterior temporal branches of the PCA | `vasc-posterior-cerebral-artery` | paired | 6 | 51.98 / 62.4 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 25 | `vasc-pca-anterior-temporal-branches` | Anterior temporal branches of the PCA | `vasc-posterior-cerebral-artery` | paired | 4 | 55.37 / 66.4 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 26 | `vasc-pca-middle-temporal-branches` | Middle temporal branches of the PCA | `vasc-posterior-cerebral-artery` | paired | 4 | 52.37 / 62.8 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 27 | `vasc-pca-splenial-artery` | Splenial artery | `vasc-posterior-cerebral-artery` | paired | 5 | 67.54 / 81.0 | 0.500 (1.2) | `ctx-hemisphere-l` |
| 28 | `vasc-pca-thalamogeniculate-arteries` | Thalamogeniculate arteries | `vasc-posterior-cerebral-artery` | paired | 6 | 15.69 / 18.8 | 0.333 (0.8) | **none** |
| 29 | `vasc-pca-posteromedial-central-branches` | Posteromedial central (thalamoperforating) branches | `vasc-posterior-cerebral-artery` | paired | 6 | 12.82 / 15.4 | 0.333 (0.8) | **none** |
| 30 | `vasc-pontine-perforating-arteries` | Pontine perforating arteries | `vasc-basilar-artery` | **midline** | 9 | 36.69 / 44.0 | 0.333 (0.8) | `ctx-pons-surface` |
| 31 | `vasc-sca-lateral-branch` | Lateral branch of the superior cerebellar artery | `vasc-superior-cerebellar-artery` | paired | 4 | 34.53 / 41.4 | 0.500 (1.2) | `ctx-midbrain-surface` |
| 32 | `vasc-sca-medial-branch` | Medial branch of the superior cerebellar artery | `vasc-superior-cerebellar-artery` | paired | 6 | 43.95 / 52.7 | 0.500 (1.2) | `ctx-midbrain-surface` |
| 33 | `vasc-sca-vermian-branches` | Vermian branches of the superior cerebellar artery | `vasc-superior-cerebellar-artery` | **midline** | 3 | 34.50 / 41.4 | 0.500 (1.2) | `ctx-midbrain-surface` |
| 34 | `vasc-aica-labyrinthine-artery` | Labyrinthine (internal auditory) artery | `vasc-anterior-inferior-cerebellar-artery` | paired | 7 | 20.78 / 24.9 | 0.333 (0.8) | `ctx-pons-surface` |
| 35 | `vasc-pica-tonsillomedullary-segment` | PICA tonsillomedullary segment | `vasc-posterior-inferior-cerebellar-artery` | paired | 5 | 27.06 / 32.5 | 0.500 (1.2) | `ctx-cerebellum-l` |
| 36 | `vasc-pica-telovelotonsillar-segment` | PICA telovelotonsillar segment | `vasc-posterior-inferior-cerebellar-artery` | paired | 5 | 67.24 / 80.7 | 0.500 (1.2) | `ctx-cerebellum-l` |
| 37 | `vasc-anterior-spinal-artery` | Anterior spinal artery | `vasc-vertebral-artery` | **midline** | 6 | 32.83 / 39.4 | 0.417 (1.0) | `ctx-medulla-surface` |
| 38 | `vasc-lateral-lenticulostriate-arteries` | Lateral lenticulostriate arteries (group) | `vasc-middle-cerebral-artery` | paired | 9 | 25.26 / 30.3 | 0.333 (0.8) | **none** |
| 39 | `vasc-medial-lenticulostriate-arteries` | Medial lenticulostriate arteries (recurrent artery of Heubner, group) | `vasc-anterior-cerebral-artery` | paired | 6 | 36.63 / 44.0 | 0.417 (1.0) | **none** |
| 40 | `vasc-lenticulostriate-arteries` *(built-in, `src/geometry/vasculature-courses.ts`)* | Lenticulostriate arteries (M1 perforator group, the umbrella record) | `vasc-middle-cerebral-artery` | paired | 13 | 7.74 / 9.3 | 0.333 (0.8) | **none** |

**Totals.** 40 courses · **172 waypoints in the 39 authored records** (the gate prints the same 172) · **1,775.64 au =
2,130.8 mm** of authored course (39 authored records: 1,767.90 au = 2,121.5 mm; the built-in umbrella: 7.74 au =
9.3 mm — the render gate's own printed figure) · **37 paired + 3 midline** courses → **77 drawn tubes**
(`2 × 37 + 3`, printed as its two terms by the render gate, never as a product alone) · **0 group records in the live
data** (the group path exists and is exercised synthetically).

**Where the parent comes from.** The registry `parent` of the six lenticulostriate chains is the *group* record
(`vasc-lateral-lenticulostriate-arteries` / `vasc-medial-lenticulostriate-arteries`), which itself hangs off the parent
artery; every other course's registry `parent` is the artery in the column. The courses gate resolves all 39 registry
parents and all supply links by execution.

### 2.2 Territory and supply, per course (the full lists)

Every id below resolves through the shipped loader (0 unresolved territory/supply ids, gate-verified). `supply` is only
claimed where a shipped syndrome card's own `vascularTerritory` names the artery — **21 links over the 26 cards**, no
invented causal links.

| id | territory | supply |
| --- | --- | --- |
| `vasc-lateral-lenticulostriate-arteries-1` | 3: `nuc-putamen` `tract-internal-capsule-anterior-limb` `ctx-internal-capsule` | — |
| `vasc-lateral-lenticulostriate-arteries-2` | 3: `nuc-putamen` `nuc-globus-pallidus-externus` `ctx-internal-capsule` | — |
| `vasc-lateral-lenticulostriate-arteries-3` | 3: `nuc-putamen` `nuc-globus-pallidus-externus` `ctx-internal-capsule` | — |
| `vasc-lateral-lenticulostriate-arteries-4` | 3: `nuc-putamen` `nuc-claustrum` `ctx-internal-capsule` | — |
| `vasc-medial-lenticulostriate-arteries-1` | 3: `nuc-caudate-head` `nuc-accumbens` `tract-internal-capsule-anterior-limb` | — |
| `vasc-medial-lenticulostriate-arteries-2` | 3: `nuc-caudate-head` `nuc-ventral-pallidum` `tract-internal-capsule-anterior-limb` | — |
| `vasc-mca-insular-segment` | 5: `surf-insula` `nuc-claustrum` `nuc-putamen` `ctx-internal-capsule` `tract-internal-capsule-posterior-limb` | — |
| `vasc-mca-superior-terminal-branch` | 8: `surf-frontal-lobe` `surf-parietal-lobe` `ctx-m1` `ctx-s1` `ctx-premotor` `ctx-broca` `ctx-frontal-eye-fields` `tract-corona-radiata` | — |
| `vasc-mca-inferior-terminal-branch` | 7: `surf-temporal-lobe` `surf-parietal-lobe` `ctx-wernicke` `ctx-a1` `ctx-a2` `tract-optic-radiation` `tract-corona-radiata` | — |
| `vasc-mca-angular-branch` | 5: `ctx-a1` `ctx-a2` `ctx-wernicke` `surf-parietal-lobe` `tract-optic-radiation` | — |
| `vasc-mca-middle-temporal-branch` | 3: `surf-temporal-lobe` `ctx-wernicke` `ctx-a1` | — |
| `vasc-mca-posterior-temporal-branch` | 4: `surf-temporal-lobe` `ctx-wernicke` `ctx-a1` `tract-optic-radiation` | — |
| `vasc-mca-temporo-occipital-branch` | 3: `surf-temporal-lobe` `surf-occipital-lobe` `tract-optic-radiation` | — |
| `vasc-mca-m4-prefrontal-branch` | 4: `surf-frontal-lobe` `ctx-broca` `ctx-frontal-eye-fields` `ctx-premotor` | — |
| `vasc-mca-m4-precentral-branch` | 5: `ctx-m1` `ctx-premotor` `surf-frontal-lobe` `ctx-s1` `tract-corona-radiata` | — |
| `vasc-mca-m4-central-branch` | 4: `ctx-m1` `ctx-s1` `surf-parietal-lobe` `ctx-premotor` | — |
| `vasc-mca-m4-anterior-parietal-branch` | 3: `ctx-s1` `surf-parietal-lobe` `ctx-wernicke` | — |
| `vasc-aca-pericallosal-artery` | 9: `surf-frontal-lobe` `surf-limbic-lobe` `surf-cingulate-gyrus` `ctx-corpus-callosum` `tract-corpus-callosum-genu` `tract-corpus-callosum-body` `ctx-sma` `ctx-m1` `ctx-s1` | — |
| `vasc-aca-callosomarginal-artery` | 6: `surf-cingulate-gyrus` `surf-frontal-lobe` `ctx-sma` `ctx-m1` `ctx-s1` `tract-corpus-callosum-body` | — |
| `vasc-aca-frontopolar-artery` | 2: `surf-frontal-lobe` `surf-limbic-lobe` | — |
| `vasc-aca-orbitofrontal-artery` | 2: `surf-frontal-lobe` `ctx-frontal-eye-fields` | — |
| `vasc-pca-parieto-occipital-artery` | 4: `surf-occipital-lobe` `surf-parietal-lobe` `ctx-v2` `tract-optic-radiation` | — |
| `vasc-pca-calcarine-artery` | 5: `ctx-v1` `ctx-v2` `surf-occipital-lobe` `tract-optic-radiation` `nuc-lgn` | — |
| `vasc-pca-posterior-temporal-branches` | 6: `surf-temporal-lobe` `surf-parahippocampal-gyrus` `ctx-entorhinal` `nuc-hippocampus` `nuc-ca1` `nuc-subiculum` | — |
| `vasc-pca-anterior-temporal-branches` | 4: `surf-temporal-lobe` `surf-parahippocampal-gyrus` `nuc-amygdala` `ctx-entorhinal` | — |
| `vasc-pca-middle-temporal-branches` | 4: `surf-parahippocampal-gyrus` `surf-temporal-lobe` `ctx-entorhinal` `nuc-subiculum` | — |
| `vasc-pca-splenial-artery` | 5: `ctx-corpus-callosum` `ctx-v1` `surf-occipital-lobe` `tract-optic-radiation` `surf-cingulate-gyrus` | — |
| `vasc-pca-thalamogeniculate-arteries` | 6: `nuc-vpl` `nuc-pulvinar` `nuc-mgn` `nuc-lgn` `tract-optic-radiation` `vent-lateral-ventricle-atrium` | `syn-dejerine-roussy` `syn-tuberothalamic` |
| `vasc-pca-posteromedial-central-branches` | 6: `nuc-thalamic-anterior` `nuc-md` `nuc-intralaminar` `nuc-midline-thalamic` `nuc-superior-colliculus` `nuc-pretectal` | `syn-percheron` `syn-tuberothalamic` `syn-peduncular-hallucinosis` |
| `vasc-pontine-perforating-arteries` | 9: `ctx-pontine-nuclei` `ctx-pontine-fibers` `tract-corticospinal-lateral` `tract-corticobulbar` `tract-medial-lemniscus` `nuc-abducens` `nuc-facial` `nuc-pprf` `nuc-trigeminal-motor` | `syn-locked-in` `syn-millard-gubler` `syn-foville` `syn-one-and-a-half` |
| `vasc-sca-lateral-branch` | 4: `ctx-cerebellum` `nuc-dentate` `nuc-interposed` `tract-scp` | `syn-cerebellar` `syn-nothnagel` |
| `vasc-sca-medial-branch` | 6: `surf-vermis` `nuc-superior-colliculus` `nuc-inferior-colliculus` `nuc-pretectal` `nuc-trochlear` `nuc-red-nucleus` | `syn-cerebellar` `syn-nothnagel` |
| `vasc-sca-vermian-branches` | 3: `surf-vermis` `nuc-fastigial` `ctx-cerebellum` | `syn-cerebellar` |
| `vasc-aica-labyrinthine-artery` | 7: `nuc-cochlear-ventral` `nuc-cochlear-dorsal` `nuc-vestibular-superior` `nuc-vestibular-medial` `nuc-vestibular-inferior` `surf-cn7-exit` `surf-cn8-exit` | `syn-lateral-pontine` |
| `vasc-pica-tonsillomedullary-segment` | 5: `ctx-cerebellum` `surf-vermis` `vent-choroid-plexus-lateral` **← finding F1, §5** `nuc-vestibular-inferior` `nuc-ambiguus` | `syn-lateral-medullary` `syn-cerebellar` |
| `vasc-pica-telovelotonsillar-segment` | 5: `ctx-cerebellum` `surf-vermis` `vent-fourth-ventricle` `nuc-dentate` `tract-icp` | `syn-lateral-medullary` `syn-cerebellar` |
| `vasc-anterior-spinal-artery` | 6: `ctx-pontine-fibers` **← finding F2, §5** `tract-corticospinal-lateral` `tract-medial-lemniscus` `nuc-inferior-olive-principal` `nuc-inferior-olive-medial` `nuc-dmv` | `syn-medial-medullary` `syn-hemimedullary` |
| `vasc-lateral-lenticulostriate-arteries` | 9: `nuc-putamen` `nuc-globus-pallidus-externus` `nuc-caudate-body` `nuc-claustrum` `ctx-internal-capsule` `tract-internal-capsule-anterior-limb` `tract-internal-capsule-genu` `tract-internal-capsule-posterior-limb` `tract-corona-radiata` | — |
| `vasc-medial-lenticulostriate-arteries` | 6: `nuc-caudate-head` `nuc-accumbens` `nuc-ventral-pallidum` `nuc-putamen` `tract-internal-capsule-anterior-limb` `ctx-internal-capsule` | — |
| `vasc-lenticulostriate-arteries` *(umbrella, in `vasculature.json`)* | 13 (`territory[]` of the v8 record; the render gate prints the subset relations child ⊆ group ⊆ umbrella, 8/8 hold) | — |

### 2.3 Radius, and where its mm comes from

`tubeRadius = calibreMm ÷ 2.4` at **1 au = 1.2 mm** (the v14 conversion rule). All **39/39** records satisfy
`\|tubeRadius × 2.4 − calibreMm\| < 0.03` (the gate's own assertion; measured max error **0.0008 au**), and the four
distinct calibres are the documented arterial diameters — the drawn radius is a **rendering of a stated calibre, not a
measurement**:

| calibre (stated) | r au | records | where the calibre comes from |
| --- | --- | --- | --- |
| **0.8 mm** | 0.333 | 9 | lenticulostriate/perforator range 0.2–0.8 mm, top of range (a perforator is a hairline: 0.8 mm = a 2.6 px radius at the default framing) |
| **1.0 mm** | 0.417 | 4 | Heubner, the largest of the medial group; the anterior spinal artery |
| **1.2 mm** | 0.500 | 19 | the MCA/PCA cortical branches (M4/P4 range 1–2 mm, low end) |
| **2.0 mm** | 0.833 | 7 | the MCA/PCA/ACA proximal segments (M2, terminal trunks, A2–A3, P4 parieto-occipital/calcarine) |

### 2.4 Surface distance distribution

Two independent readings, both printed with their definitions — they answer different questions and neither is a
substitute for the other.

**(a) What the shipped records store** (67 projected waypoints of the 172; the other 105 are committed-vertex origins,
graze targets and interior points that declare no surface). `residual` = authored input point → nearest triangle of the
declared envelope; `placed` = the waypoint actually written, measured back to the same mesh:

| declared envelope | n | residual in → mesh au (mean / max) | placed → mesh au (min / p50 / max) | max in mm |
| --- | --- | --- | --- | --- |
| `ctx-hemisphere-l` | 50 | 1.162 / 7.728 | 0.021 / 0.415 / 0.925 | 1.11 |
| `ctx-pons-surface` | 5 | 0.038 / 0.057 | 0.145 / 0.411 / 0.454 | 0.54 |
| `ctx-midbrain-surface` | 5 | 0.027 / 0.049 | 0.496 / 0.623 / 0.643 | 0.77 |
| `ctx-cerebellum-l` | 4 | 0.021 / 0.041 | 0.549 / 0.561 / 0.615 | 0.74 |
| `ctx-medulla-surface` | 3 | 0.030 / 0.043 | 0.377 / 0.516 / 0.555 | 0.67 |

**(b) The reviewer's independent re-measurement** (`review-qa`, its own GLB reader written from scratch, over **all**
waypoints of every surface-declaring course — including the unprojected origins): **0 waypoints beyond the plan's 14 au
hard bound**; **9 beyond the 6 au snap band**, and all 9 are *unprojected committed-vertex origins* — 6 shared M2/M4
origins at 6.072 au and 3 SCA origins at **10.058 au** from the declared midbrain surface, whose actual anchor is the
pons (0.966 au away). Per surface: hemisphere-l **n=93**, min 0.017 / p50 0.554 / p90 2.495 / max 6.072; pons n=8 max
0.771; medulla n=4 max 1.622; cerebellum-l n=11 max 3.852; midbrain n=9 max 10.058 au.

**Mirror.** Courses are authored on the left and drawn on both sides (`x → −x`). The courses gate re-projects **52
mirrored waypoints** onto the right-hand envelopes and reports the worst deviation **1.480 au = 1.78 mm**, tolerance
1.6 au — the two committed hemispheres are **independently decimated**, so an exact reflection is not available and the
tolerance is stated rather than hidden.

**The placement rule is implemented exactly, and it still does not achieve the intended clearance — measured, §5 F4.**
All 67 stored entries carry `offsetAu = tubeRadius + 0.15` (67/67); the achieved distance to the mesh is **below** that
offset in **61 of them** (the reviewer's own reader reads 44 of 59 — the two counts differ only in denominator, the 8
shared `aps-entry` rows), because the offset direction is the *estimated* normal, not the nearest-triangle normal. Worst
case: `vasc-mca-inferior-terminal-branch[angular]` and `vasc-mca-angular-branch[angular]`, intended 0.983 au, achieved
**0.021 au**, with r = 0.833 au — i.e. about half the tube's cross-section lies inside the envelope. **42 of 67** placed
waypoints put the tube's axis closer to the mesh than its own radius.

---

## 3. The lenticulostriate replacement — the two red blobs

**What the blobs were (confirmed, not assumed).** `vasc-lenticulostriate-arteries` is absent from `LINKS` in
`src/geometry/anatomyAssets.ts` by design, so `anatomySlugsForRecord` returns null and `NucleusMesh` fell to its third
branch: **one unit sphere scaled by `size3d` at `origin3d`**, drawn twice because the record is `paired` — the two
dark-red ellipsoids at the anterior perforated substance. The scene contains a **second** red paired ellipsoid,
`nuc-red-nucleus` (a nucleus *with* committed geometry); it is out of scope, and if two red blobs are still visible on
screen after this run they are the red nuclei, not a regression (`PLAN.md` §7.6).

**How it is retired.** The render task adds `hasVesselCourse(record.id) → return null` beside the nerve check in the
structure pass, and the built-in Tier-1 courses are **always in force** in `src/geometry/vasculature-courses.ts`, so the
fix does not depend on any sibling task landing. The record keeps its taxonomy row, its `territory[]`, its `supply[]`,
its clinical items and its InfoPanel page — **one record, one body**.

**The evidence the render gate prints** (`npm run verify:vessel-render`, 75/75):

| claim | measured |
| --- | --- |
| every vessel record draws **either** a tube **or** the schematic ellipsoid | 53 vessel structure records · **blobs 0** · the tablet prints `tube only` / `baked body only` per record with **0 BROKEN** |
| the lenticulostriate family is fully suppressed | **9 records** (`…-lateral-…-1..4`, `…-medial-…-1..2`, the two group records and the umbrella) · **suppressed 9 · courses authored for the family 9** |
| no vessel record has a baked body that would double the tube | 0 `vasc-*` GLBs for the new ids, manifest still **138 parts** |
| the tubes exist in the 3D pass | **77 drawn tubes = 40 authored + 37 mirrored**; **vessel kind off → 0/40**; **vasculature area off → 0/40** (tracts 23/23 and nerves 12/12 untouched in both states) |
| the group path exists for future ladders | merge + group + alias cases exercised synthetically (`0 group(s)` in live data) |

**The anatomy behind the drawn spray.** Six chains run from the **M1 superior-wall vertex [15.786, 11.967, 24.920]**
(the committed `vasc-middle-cerebral-artery-m1-l` vertex, exact distance **0.000 au**) through the **anterior perforated
substance** (the projected waypoint: lateral group residual 0.018 au = 0.02 mm on the hemisphere, Heubner 1.456 au)
into the basal ganglia: four lateral chains to putamen targets and two medial (Heubner) chains to the caudate head.
Terminal grazes (`measured.terminalToTargetAu`): lateral **0.021–0.179 au = 0.03–0.21 mm** from the putamen mesh,
Heubner **0.249–0.296 au = 0.30–0.36 mm** from the caudate — a perforator *ends inside* the structure it
supplies, which is why a graze is the authored intent and not a miss (§3's numbers come from each record's own `measured`)
. The gate re-derives every one of those numbers
from the mesh bytes (67 projected waypoints re-measured, 2,171 assertions, 0 failures).

---

## 4. The surface-projection method (what "measured, not eyeballed" means here)

| step | rule | measured |
| --- | --- | --- |
| **parse** | read the committed GLB (12-byte header, JSON + BIN chunks), `POSITION` accessor + indices — 138 committed parts, no loader change, no new file | the gates parse the same bytes independently of each other |
| **project** | nearest mesh **vertex**, then the exact nearest point on the triangles **incident to that vertex** (clamped barycentric) | the vertex pass alone leaves 0.85 au mean on the hemisphere; the triangle refinement gives **0.66 au** (`PLAN.md` §4.2) |
| **place** | offset outward along the surface normal by **`tubeRadius + 0.15 au`** (0.15 au = 0.18 mm subarachnoid clearance) | 67/67 stored entries carry exactly that offset |
| **band** | residual ≤ **6.0 au (7.2 mm)** → the waypoint is moved onto the surface; **> 14.0 au (16.8 mm)** → gate failure | 0 beyond the hard bound; 9 beyond the band, all unprojected committed-vertex origins (§2.4b) |
| **which envelope** | cortical branches → `ctx-hemisphere-l/r`; SCA → midbrain, then pons; AICA/pontine → pons; PICA → cerebellum; vertebral/ASA → medulla; **perforators → none, stated** | printed per surface by the courses gate: hemisphere 21 courses / 81,128 tris · midbrain 3 / 14,776 · pons 2 / 23,776 · cerebellum 2 / 23,208 · medulla 1 / 18,556 |

**Perforators declare `surface: null` on purpose.** The lenticulostriate, thalamoperforating and thalamogeniculate
courses run *inside* the brain after piercing the surface; projecting them onto an envelope would be exactly the
eyeballed-coordinate error the run forbids. Their **entry point is projected** (that is the one surface constraint) and
each record's `surfaceNote` says why the field is null — the gate asserts the statement is present, so `null` can never
be a silent omission.

---

## 5. What did **not** ship, and why — stated, not dropped

| # | item | the honest statement |
| --- | --- | --- |
| **1** | **`verify:cranial-nerve-render` is RED at close-out (46/47)** — the only product-red gate this run leaves | Its §6 identity `partsForCanvas() === SECTION_PARTS + SECTION_NERVE_PARTS` now finds **190 = 138 committed + 12 nerve + 40 vessel** and fails with `FAIL partsForCanvas() is the committed parts plus the procedural ones — found 190`. This is the **v17 data landing, not a regression**: `partsForCanvas()` grew by `SECTION_VESSEL_PARTS.length` exactly as `PLAN.md` §5.2 row 5 mandates. The one-line re-point (`+ SECTION_VESSEL_PARTS.length` and its import, `scripts/verify/cranial-nerve-render.mjs:362`) belongs to **no task in this run's write scopes** — `review-qa` reported it as F6 and this integrator's scope (`package.json` + four docs) does not cover it. **The product was not bent to make the gate pass, and the gate was not edited outside its owner's scope.** |
| **2** | **the 2D live section and the PiP do NOT paint the vessel contours** | The visible list (`partsForCanvas()`, which now carries the 40 vessel metas) and the **worker registry** are two different lists. `SectionCanvas.tsx`'s init-registry effect appends only `registryParts.push(...registryNerveParts())` (`:2126`); the one line `registryParts.push(...registryVesselParts())` is what hands the worker the vessel geometry. Both gates print this handoff on every run. The 2D machinery itself is proven by execution (77 worker parts sliced by the shipped `partBounds`/`boundsMayCut`/`extractContours`: **2,581 contour loops, 0 non-finite**), so the missing line is a wiring gap in a file outside every v17 task's scope, not an untested claim |
| **3** | **finding F1 (HIGH, reviewer): one wrong-territory row** | `vasc-pica-tonsillomedullary-segment.territory` claims **`vent-choroid-plexus-lateral`** — the **lateral** ventricle's choroid plexus, a telencephalic structure — while the record's own `function` text says *"It supplies the choroid plexus of the **fourth** ventricle"* and its sibling `vasc-pica-telovelotonsillar-segment` correctly claims `vent-fourth-ventricle`. A syndrome card's `vascularTerritory` is **prose** (`syn-lateral-medullary` reads "Posterior inferior cerebellar artery (PICA)…"), so no card is wired to the erroneous row — but the structure the app highlights when the tonsillomedullary course is selected is wrong. **Content file outside this task's write scope** (`src/data/structures/vasculature-courses.json`); reported, not silently edited |
| **4** | **finding F2 (MEDIUM, reviewer): a pons row on a medullary artery** | `vasc-anterior-spinal-artery.territory` claims **`ctx-pontine-fibers`** (region `pons`) although the ASA is a medullary/cord artery and its own prose claims only the pyramids, the medial lemniscus and the hypoglossal fibres; the row was inherited from the basilar record's list. Same file, same status: reported, not edited |
| **5** | **finding F3 (MEDIUM-LOW, reviewer): two stale texts** | (a) The **umbrella** record `vasc-lenticulostriate-arteries` in `src/data/structures/vasculature.json` still carries the **retired ellipsoid's** `origin3d [16, 28, 20]` / `size3d [4, 5, 6]` and a `contextNote` that ends *"…whose geometry the render task takes from the MCA branch set"* — it never states the v17 authored-course basis. The geometry no longer renders (suppressed), but the note is stale. (b) The **built-in** medial-group course in `src/geometry/vasculature-courses.ts` (`:334`, `:342`) calls `[2.83, 15.419, 27.537]` the "carotid terminus"; that built-in is **withdrawn and replaced** by the authored record at merge time (`2 replaced by authored`, rendered as the authored 6-waypoint / 44.0 mm course), whose own note describes the same point as the midpoint of the committed ACA A1-junction vertex and the ACA's most superior vertex — measured 0.474 au from the ACA mesh and **11.003 au = 13.2 mm** from the committed ICA-terminus vertex. So the shipped course is honest about its anchor and the stale wording survives only in the withdrawn built-in |
| **6** | **the posterior spinal artery is NOT authored** | No BP3D element carries it (checked against the archive's 272 concept→element mappings) and there is no committed envelope for it to hug. `PLAN.md` §2.4 records the omission; it is repeated here rather than filled with a guess |
| **7** | **the MCA M4 set is the brief's four named branches, not the plan's subset** | Deviations from `PLAN.md` §2.2, reported by the author rather than silently reconciled: the four brief-named M4 cortical branches (prefrontal / precentral / central / anterior-parietal) plus the two plan-named trunk records were authored, and one brief-named record the plan omitted (pontine perforators) was added. Each record's `anchorNote` states what the archive does and does not carry |
| **8** | **the drawn course stands on top of the baked parent body** | The v8 bake already merged 34 MCA elements (88,460 faces) and 26 PICA elements (8,080 faces) into their parent arteries, so a new branch tube is drawn over a body that already contains it. The mitigation is stated in `PLAN.md` §7.7: small radii (0.333–0.833 au) and distal waypoints moved **outward** onto the envelope so the tube stands proud at the cortex. Tier-3 (documented-course) vessels have no baked twin and are clean |
| **9** | **the achieved clearance is below the intended graze** | §2.4: 61/67 placed waypoints sit closer to the envelope than the intended `r + 0.15 au`; 42/67 put the tube's axis inside its own radius (worst ≈ half-buried, 0.812 au of a 1.666 au diameter). The plan's "graze instead of sinking" rationale is therefore **not fully met**, and the number is published rather than smoothed |
| **10** | **`verify:anatomy` (27/27) and `verify:imaging-fit` cannot run in this sandbox** | Both abort **before any verdict** on the documented sandbox boundary — `spawnSync powershell EPERM` at `anatomy-qa.mjs:294` and `spawnSync node.exe EPERM` at `imaging-fit.mjs:92` — red at base, in no v17 task's scope. The measurement `verify:anatomy` was blocked on was re-run **directly**: `src/assets/anatomy` = **14,566,178 B = 13.8914 MiB** (unchanged), so its own subject is measurable here even though the gate is not runnable |
| **11** | **browser claims** | §6. `verify:audit`, `verify:acceptance` and `verify:browser` were **not run and are not claimed** — Chrome cannot start in this sandbox |

---

## 6. Claim tiers — orchestrator-browser-verified versus non-browser-only

**Proven here, by execution (non-browser).** The 40 courses exist with 172 waypoints, all inside `CLIP_BOUNDS`; every id
is registered first (39/39, `vasc-*` + `kind:"vessel"`, parent resolves); the radius rule `r = calibreMm / 2.4` holds over
four stated calibres; 67 projected waypoints were re-derived from the **mesh bytes** by two independently written
readers; the mirror deviation is 1.480 au against a 1.6 au tolerance; the 3D pass admits exactly the vessel courses under
the vessel kind and the vasculature area (77 tubes; 0/40 in either ablation) and drops every course-bearing record from
the structure pass (**blobs 0**); the 2D **metas** exist and the shipped contour machinery slices the procedural parts
(2,581 loops, 0 non-finite); the payload is **unchanged to the byte** (138 parts · 14,486,228 B · 599,204 tris · 0 new
GLBs).

**Orchestrator-only (Chrome cannot start in this sandbox — every browser lane exits 4 with "no check was run").** That
the 3D scene actually **paints** the tubes; that the **two red blobs are gone on screen** (the gate proves the *decision*
to suppress them, never the pixels); that the Systems row's **Vessels** button and the **Cerebral vasculature** area
button show/hide exactly these tubes on screen; that the section and the PiP **paint** contours (and, per §5.2, they
currently cannot — the worker never receives the vessel geometry); that click-select works on a vessel tube; the
frame-time cost of ~103k extra procedural triangles. `verify:audit`'s **R3b** was re-pointed by `review-qa` from "the
Plates hash is invariant to the vessel toggle" to "the hash **changes** and round-trips" — that is the browser proof of
2D parity, and only the orchestrator can run it.

**Not claimed at all:** `verify:acceptance`, `verify:browser`, and the `verify:anatomy` 27 item verdicts.

---

## 7. The integrator's sweep — every gate, with its exit code and its printed tail

Run from the repo root on this tree (`84c666b` + the v17 slice) with the npm scripts wired as in §9, so **the wiring
itself is tested**. Command: the exact npm line in the left column.

| gate | exit | the tail it printed |
| --- | --- | --- |
| `npm run validate` | **0** | `taxonomy 287 registry entr(ies) (0 awaiting authored records)` · `kinds registry: nucleus 88 · tract 53 · ventricle 11 · surface 25 · vessel 53 · context 45 · nerve 12 (7 kinds) Σ 287` · `structures 20 file(s), 264 record(s)` · `tracts 23 record(s)` · `syndromes 26` · `plates 15` · `✔ Validation PASSED — 0 errors, 0 warning(s)` |
| `npm run check` | **0** | `tsc --noEmit` — silent (exit 0) |
| `npm run build` | **0** | `dist/assets/index-q_nCyWwi.js 1,882.69 kB │ gzip: 420.89 kB` · `✓ built in 9.96s` |
| `npm run verify:pipeline` | **0** | `plane z= 40 tris 210620 seg 1346 loops 8 parts 7/138` · `pipeline: 138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)` · `PASS section pipeline` |
| `npm run verify:plane` | **0** | `C. levels 17 anchors · nearestLevelTo + snapClipWrite + pickImageForPlane` · `✔ plane transform QA PASSED — 10827 assertions` |
| `npm run verify:anatomy` | **1** | `Error: spawnSync powershell EPERM … at scripts/verify/anatomy-qa.mjs:294:18` — **environment, 0 verdicts**; the blocked measurement re-run directly = **14,566,178 B** |
| `npm run verify:somatotopy` | **0** | `ok src/data/load.ts wires somatotopyTreeOrder into the tree child sort` · `45 passed · 0 failed` |
| `npm run verify:cortical-lobes` | **0** | `pipeline: 138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)` · `cortical-lobes: 564/564 assertions passed` · `PASS cortical-lobes` |
| `npm run verify:imaging-fit` | **1** | `recomputing with: node scripts/fit-imaging-affine.mjs --json` · `FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM` — **environment, 0 assertions** |
| `npm run verify:pip-contract` | **0** | `✔ simulated-section panel contract PASSED` (its "not observed here" list names pixels, real pointer drags, reload persistence — orchestrator lane) |
| `npm run verify:division-toggles` | **0** | `store instances imported: 2 (each re-runs the store's own load-time assertions)` · `251 assertions passed · 0 failed` |
| `npm run verify:view-filter-consistency` | **0** | `swept 138 parts · 264 structures · 23 tracts · 10 slots · 2 ghost shells · 7 regions × 7 kinds · 5 planes × 2 ribbons` · `548 cross-surface state comparisons` · `102/102 assertions passed` |
| `npm run verify:audit-checks` | **0** | `92 passed · 0 failed · 7 informational · 9 group(s)` · `✔ Node-only audit check mirror PASSED` |
| `npm run verify:closure-bite` | **0** | `✓ the shared tree is byte-identical: every mutation happened in the copy` · `✓ the restored copy re-runs green (92 passed · 0 failed)` · `7/7 mutations caught by the mirror` |
| `npm run verify:boundary-contract` | **0** | `ok the live-section boundary is layout-transparent (style={{ display: "contents" }})` · `22 passed · 0 failed` |
| `npm run verify:a11y-contract` | **0** | `ok favicon declared (/favicon.svg) and public/favicon.svg exists` · `38 passed · 0 failed` · `shipped bundle spot check: dist/assets` |
| `npm run verify:budget-report` | **0** | `part mix: nucleus 86 (119,232 tris) · context 17 (388,396 tris) · ventricle 5 (65,620 tris) · vessel 30 (25,956 tris)` · `Σ parts[].triCount = 599,204 · Σ stat(part.file) = 14,486,228 B (13.82 MiB)` · `whole committed asset tree: 13.89 MiB in 140 file(s)` · `5 passed · 0 failed` · `✔ budget report PASSED` |
| `npm run verify:cranial-nerves` | **0** | `assertions run 451 · passed 451 · failed 0` · `nerve records 12/12 (meshes:false 12/12, placed 12/12)` · `manifest parts added 0 (manifest still 138)` |
| `npm run verify:nerve-kind` | **0** | `manifest: 138 parts · 138 GLBs` · `79 passed · 0 failed` · `✔ NERVE-KIND GATE PASSED` |
| `npm run verify:cranial-nerve-courses` | **0** | `courses verified 12/12 · assertions run 220 · failures 0` · `491.78 au = 590.14 mm of authored path · all waypoints inside CLIP_BOUNDS (min clearance 6.00 au) · 12 tubes gated by kind "nerve" · 680 section contour loops the worker computes` |
| **`npm run verify:cranial-nerve-render`** | **1** | `nerve-render: 12 courses · 3D tubes 12/12 · 2D parts 12 · 121 contour loop(s) over 38 planes · **46/47 assertions**` · `FAIL partsForCanvas() is the committed parts plus the procedural ones — found 190` — **see §5.1; the only product-red gate, and it is a count-stale assertion, not a broken product** |
| **`npm run verify:vasc-courses`** *(new)* | **0** | `✔ vasc-courses PASSED — 2171 assertions, 0 failures` · `39 vessel records · 172 waypoints · 67 projected waypoints re-measured` · `39/39 courses satisfy \|tubeRadius × 2.4 − calibreMm\| < 0.03` · `52 mirrored projections · worst Δ 1.480 au = 1.78 mm` · `manifest parts 138 · anatomy directory 13.82 MiB of 14 MiB — this run adds 0 bytes (39 procedural courses)` |
| **`npm run verify:vessel-render`** *(new)* | **0** | `vessel-render: 40 courses (1 built-in surviving + 2 replaced by authored + 37 new authored) + 0 group(s) · 3D tubes 77 = 40 + 37 mirrored · vessel kind off → 0, vasculature area off → 0 · 2D parts 40 (77 worker parts) · 2581 contour loop(s) · blobs 0 · 75/75 assertions` · `PASS granular vessels render as courses in 3D and in the live section, and no vessel draws a placement blob` |
| `npm run verify:area-toggles` *(re-pointed by `review-qa`)* | **0** | `472 assertions passed · 0 failed` · lane 9 prints the canvas metas as terms (**138 + 12 + 40 = 190**), the worker registry as terms (**24 nerve = 12 + 12 mirrored · 77 vessel = 40 + 37 mirrored for 3 midline**), every mirrored twin proven the `x → −x` reflection, and `unchanged: the manifest still holds 138 parts, no nrv-*.glb exists and no committed GLB carries a granular course id — route (a) costs 0 bytes` |
| `npm run verify:plane-helper-extent` *(extra, in the tier list)* | **0** | `plane-helper-extent: 206 passed · 0 failed — exit 0` |
| `node scripts/verify-imaging-v4.mjs` | **0** | `imaging payload 9.02 MiB in 82 files (cap 10.00 MiB, AMENDMENT B)` · `v4-added assets 3.81 MiB in 28 files (cap 4.00 MiB)` · `✔ v4 imaging QA PASSED` |
| `node scripts/verify-imaging-v4b.mjs` | **0** | `deep decode: 22/22 raw source plates re-decoded through lib/jpeg-full.mjs` · `payload: cryosections = 1232904 B in 22 files (cap 1,750,000 B)` · `verify-imaging-v4b: OK — 22 NLM Visible Human cryosections, -52.20 … 34.04 au, credit verbatim in 5 records, anchors clear of every other transverse anchor by > 1.5 au` |

**Score over the 27 gate commands above: 24 green · 2 environment-red (`verify:anatomy`, `verify:imaging-fit`, both
red at base, 0 assertions run) · 1 product-red** (`verify:cranial-nerve-render`, 46/47, a count-stale identity —
§5.1). Assertions the Node lane executed on this tree: `validate` 0 errors / 0 warnings · `plane` 10,827 · `somatotopy` 45 · `cortical-lobes` 564 ·
`division-toggles` 251 · `view-filter-consistency` 102 · **`area-toggles` 472** · `audit-checks` 92 · `closure-bite`
7 mutations caught · `boundary-contract` 22 · `a11y-contract` 38 · `budget-report` 5 · `cranial-nerves` 451 ·
`nerve-kind` 79 · `cranial-nerve-courses` 220 · `cranial-nerve-render` 46 of 47 · **`vasc-courses` 2,171** ·
**`vessel-render` 75** · `plane-helper-extent` 206.

---

## 8. The gates that were red before this round

| item | state after this run |
| --- | --- |
| `verify:area-toggles` (the brief's "known-red" gate) | **exit 0 — 472 assertions · 0 failed · 14 groups.** `review-qa` re-pointed lane 9/§11 to v17's truth: the three stale literals are gone, replaced by sums of terms read from the shipped tables (canvas **138 + 12 + 40 = 190**, worker registry **24** nerve and **77** vessel), each asserted against `SECTION_PARTS` / `SECTION_NERVE_PARTS` / `SECTION_VESSEL_PARTS` and against `NERVE_COURSES` / `VESSEL_COURSES`. The product was **not** bent back to the stale expectation |
| the preset click sites in `verify:audit` | Already re-pointed at v13 (`restoreDefaultFraming`: areas-all-on + systems-all-on + Vasculature off) and kept honest by area-toggles §11's dead-click guard, which **executes `audit.mjs`'s own click sites** (`verify:audit-checks` 92/0). `verify:audit` itself needs Chrome — orchestrator lane |
| `verify:audit`'s vascular block | Its v8 `regionCount === 14` literal is now **derived from `src/data/taxonomy.json`** (53 rows in region `vasculature`, 53 of kind `vessel`), so the next content run cannot stale it out |
| the v14 note that `verify:cranial-nerve-render` was 47/47 | **Superseded:** it is **46/47** on this tree, for the count identity in §5.1 — the only gate this run leaves red, and the fix is one line in a file no v17 task owns |

---

## 9. `package.json` wiring (the integrator's file)

```diff
     "verify:cranial-nerve-courses": "node scripts/verify/cranial-nerve-courses.mjs",
-    "verify:cranial-nerve-render": "node scripts/verify/cranial-nerve-render.mjs"
+    "verify:cranial-nerve-render": "node scripts/verify/cranial-nerve-render.mjs",
+    "verify:vasc-courses": "node scripts/verify/vasc-courses.mjs",
+    "verify:vessel-render": "node scripts/verify/vessel-render.mjs"
```

Two lines **added at the end of the alphabetical block**, one trailing comma on the previously-last line; **nothing
pre-existing was renamed, reordered or removed**, and no other key in the file changed. Both new scripts were then
executed **through npm** in §7, so the wiring is tested rather than asserted. `verify:area-toggles` was already wired
(contrary to `PLAN.md` §7.12, which read the file before the v11 close-out).

---

## 10. Documentation updated by this task

| file | change |
| --- | --- |
| `README.md` | the vasculature section gains **"The granular vasculature layer (v17)"**: the granular record count (53 vessel records over 40 procedural courses), the four calibre classes, the projection method and its residuals, the blob fix, the zero-payload arithmetic, and an **honest-limits** entry stating that the granular branches are **AUTHORED course paths projected onto the derived surfaces, not segmented angiography**, with the payload reason. The v8 honest-limit bullets that said the lenticulostriate arteries render a placed ellipsoid are corrected by a `v17 update` note (history kept, current truth stated), the Features list gains a v17 bullet, the Scripts section gains the two gates, and the binding-gate list gains the v17 result |
| `README.zh-CN.md` | the same section in Chinese, mirroring the English structure 1:1 (granular layer, honest limits, evidence table, scripts) |
| `docs/CONTENT_INVENTORY.md` | **AMENDMENT E — v17, the granular vasculature**: the registry delta (248 → 287 rows, 14 → 53 `vessel` rows, 264 records in 20 files), the 39-record collection with its provenance (authored courses, measured origins, projected waypoints, procedural tubes, `0 B` of new payload), the blob retirement, the omitted records, and the four reviewer findings |
| `docs/VASC_INVENTORY.md` | **§8 — v17**: which archive elements the new records claim (28 distinct FJ ids / 46 mentions, with concept names), which elements moved from unclaimed to claimed (6), and **which BP3D elements are still unregistered** (8 files / 9,022 faces, each with its reason) |
| `docs/SWARM_V17_PLAN.md` | this file |

---

## 11. Carry-forward, with owners unnamed on purpose

1. **§5.1 — `scripts/verify/cranial-nerve-render.mjs:362`**: add `+ SECTION_VESSEL_PARTS.length` (and its import) so the
   section-parts identity names all three terms. One line; the file belongs to no v17 task.
2. **§5.2 — `src/components/section/SectionCanvas.tsx:2126`**: add `registryParts.push(...registryVesselParts())` so the
   live section and the PiP actually paint the granular vessel contours. One line; the worker machinery and the parts are
   already proven.
3. **§5.3 F1 — `vasc-pica-tonsillomedullary-segment.territory`**: replace `vent-choroid-plexus-lateral` with
   `vent-fourth-ventricle` (its own text already says the fourth ventricle, and its sibling already claims it).
4. **§5.4 F2 — `vasc-anterior-spinal-artery.territory`**: drop `ctx-pontine-fibers` (a pons structure on a medullary
   artery).
5. **§5.5 F3 — two stale texts**: the umbrella `vasc-lenticulostriate-arteries` `contextNote` (in
   `src/data/structures/vasculature.json`) should state the v17 authored-course basis and stop naming the MCA branch set
   as its geometry; the withdrawn built-in medial course in `src/geometry/vasculature-courses.ts:334,342` still calls the
   ACA junction point the "carotid terminus".
6. **§5.9 F4 — the placement offset**: use the **nearest-triangle normal** (or iterate once) so the achieved clearance
   matches `tubeRadius + 0.15`; 61/67 waypoints currently fall short and 42/67 put the tube axis inside its own radius.
7. **The mirror tolerance** (1.480 au against 1.6 au, §2.4) is a property of the two independently decimated hemisphere
   meshes; a paired course whose right side is not a reflection would need two records.
8. **`verify:anatomy` and `verify:imaging-fit`** need an environment where piped child stdio is permitted (both red at
   base, neither a product failure).
9. **All browser claims** (§6) — the orchestrator's lane, `verify:audit` R3b and the "blobs are gone on screen" verdict
   included.
