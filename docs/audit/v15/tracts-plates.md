# Audit — the 23 long tracts and the 15 plate labels

**Run:** `run-mtze6lyq-t83x` · **Task:** `audit-tracts-plates` (T5) · **Area:** `tracts-plates`
**Machine-readable companion:** `docs/audit/v15/tracts-plates.findings.json` (this document's counts are generated from it, so the two cannot drift).
**Auditors do not edit data.** Every correction below is a proposal for the integrator (`apply-corrections`, T7). Nothing in `src/**` was written by this task.

## 1. Scope and what was actually read

| surface | file(s) | records/objects | fields audited per record |
| --- | --- | --- | --- |
| long tracts | `src/data/tracts.json` | 23 | 14: name, synonyms, direction, modality, origin, target, decussation, somatotopy, function, clinical, waypoints, tubeRadius, levels, refs |
| 2D plates | `src/data/plates.json` + `src/data/plates/*.svg` | 15 plates, 360 labelled regions, 15 SVGs | manifest↔SVG slug/label/labelPos integrity, leader-dot geometry, plate-frame orientation markers, plane vs `levelId`, title vs caption vs content |

Supporting reads (never written): `src/data/levels.json` (17 anchors), `src/data/taxonomy.json`, the structure records needed for level/origin cross-checks, `src/assets/anatomy/anatomy-manifest.json` (138 committed parts with bboxes — frozen input, no re-bake), `src/types.ts`, `src/components/viewer3d/clipPlanes.ts`, `src/components/PlateRenderer.tsx`.

**Deviation from the dispatched brief, per the architect's plan of record.** The brief's scope line says "23 tract records in `src/data/tracts.json` **(+ the cranial-nerve courses added by run run-mtzc5coc-ug6z)**". `PLAN-run-mtze6lyq-t83x.md` §C2 establishes that the twelve nerve courses are `NERVE_COURSES` in `src/geometry/curves.ts`, that `tracts.json` is byte-identical to HEAD, and that nerve-course findings therefore belong to T4 (`audit-vessels-nerves`). This audit covers the 23 tracts and the 15 plates only; the nerve courses were not audited here.

**Method.** The model is a *model-based* review of authored text and authored coordinates, cross-checked against the atlas's own other records and the committed mesh bounding boxes. No imaging, specimen or browser observation underlies any finding, and no finding rests on a rendered pixel.

## 2. Summary

| verdict | all | critical | major | minor |
| --- | --- | --- | --- | --- |
| `ok` | **333** | 0 | 0 | 333 |
| `wrong` | **8** | 0 | 3 | 5 |
| `suspect` | **4** | 0 | 2 | 2 |
| `unverifiable-here` | **0** | 0 | 0 | 0 |
| **total** | **345** | **0** | **5** | **340** |

Findings by surface: **322** on the 23 tracts, **23** on the 15 plates. Severity is defined as: *critical* = a reader is actively misled about anatomy or the wrong artery; *major* = a real anatomical error that misleads a careful reader; *minor* = cosmetic or contested-certainty.

### The twelve non-`ok` findings, in one place

| # | id | field | verdict | severity | one-line |
| --- | --- | --- | --- | --- | --- |
| 1 | `tract-mlf.tubeRadius` | `tubeRadius` | `suspect` | minor | MLF authored at the same radius as tracts an order of magnitude larger |
| 2 | `tract-hypothalamospinal.target` | `target` | `suspect` | major | target (T1-L2) is unreachable by the record's own course and by the atlas |
| 3 | `tract-trigeminothalamic-dorsal.function` | `function` | `suspect` | minor | contested uncrossed dorsal trigeminothalamic route stated as the established explanation |
| 4 | `tract-optic-radiation.levels` | `levels` | `suspect` | major | level set claims anchors 18 and 48 au beyond the record's own drawn course |
| 5 | `plate-thalamus-mid.(orientation-markers)` | `svg plate-frame orientation markers (P at (400,62) / A at (400,738))` | `wrong` | major | MLF authored at the same radius as tracts an order of magnitude larger |
| 6 | `plate-sagittal-midline.(orientation-markers)` | `svg plate-frame orientation markers (A at (52,400) / P at (748,400))` | `wrong` | major | MLF authored at the same radius as tracts an order of magnitude larger |
| 7 | `plate-sagittal-midline.label.vent-cerebral-aqueduct` | `regions[label=vent-cerebral-aqueduct].leader-dot (526,550)` | `wrong` | major | leader dot misses its own structure and lands in a named neighbour |
| 8 | `plate-sagittal-midline.label.nuc-pag` | `regions[label=nuc-pag].leader-dot (520,543)` | `wrong` | minor | leader dot misses its own structure and lands in a named neighbour |
| 9 | `plate-sagittal-midline.label.nuc-dorsal-raphe` | `regions[label=nuc-dorsal-raphe].leader-dot (461,480)` | `wrong` | minor | leader dot misses its own structure and lands in a named neighbour |
| 10 | `plate-pons-rostral.label.surf-cn4-exit` | `regions[label=surf-cn4-exit].leader-dot (400,252)` | `wrong` | minor | leader dot misses its own structure and lands in a named neighbour |
| 11 | `plate-thalamus-mid.label.nuc-thalamic-anterior` | `regions[label=nuc-thalamic-anterior].leader-dot (342,556)` | `wrong` | minor | leader dot misses its own structure and lands in a named neighbour |
| 12 | `plate-coronal-thalamus.label.nuc-mammillary-body` | `regions[label=nuc-mammillary-body].leader-dot (430,586)` | `wrong` | minor | leader dot misses its own structure and lands in a named neighbour |

No `critical` finding was recorded in this area, and nothing was recorded as `unverifiable-here` — every claim in this file is either verified against the data or a suspicion with a stated basis. **Nothing was invented**: findings whose basis would have been a hunch are absent, not softened.

## 3. Tracts — what was checked and what it came out as

### 3.1 The four findings on tract records

#### `tract-mlf.tubeRadius` — suspect, minor

- **Record/field:** `tract-mlf` → `tubeRadius`
- **What the data says:** tubeRadius = 0.4 au → a 0.96 mm mid-tube diameter at 1 au = 1.2 mm
- **What it should say / be:** A value consistent with the MLF's real cross-section. The human MLF is a small paramedian bundle of roughly 1-2 mm; at 1 au = 1.2 mm a faithful mid-tube diameter is about 0.4-0.8 au, and in any case the MLF must be the THINNEST bundle in the set, clearly below the cortico-efferent tracts it currently sits level with
- **Basis (own-knowledge):** Own anatomical knowledge, labelled as such, plus an internal comparison of the record set: the MLF (r 0.4) is authored at the same radius as the tectospinal tract (0.4) and the medial vestibulospinal tract (0.4), and only 0.05 au below the rubrospinal, central tegmental and spinoreticular tracts, although the MLF is the smallest of those by an order of magnitude in the human brainstem
- **Suggested fix (integrator only):** If the integrator judges it worth a change: lower tract-mlf.tubeRadius to ~0.3 au (0.72 mm) so the paramedian bundle reads as the thinnest structure on the brainstem plates it is labelled on (plate-midbrain-sc, -ic, -pons-rostral, -pons-middle, -pons-caudal, -olivary, -sensory-decuss, -pyramid-decuss, -coronal-midbrain, -sagittal-midline). The renderer only needs a finite value > 0 (validate-data.mjs checkNumber + >0 assertion)
- **Notes:** Not reported as wrong: tube radius is an authored display parameter and every tract is deliberately schematic. Reported because a 0.96 mm MLF is the one value in the 23-tract set that is anatomically implausible on its own terms. The 23 radii span 0.4-0.9 au (0.96-2.16 mm); the spread is real and is NOT a defect.

#### `tract-hypothalamospinal.target` — suspect, major

- **Record/field:** `tract-hypothalamospinal` → `target`
- **What the data says:** target = "Intermediolateral cell column of the spinal cord (T1–L2), especially the ciliospinal center of Budge (C8–T2) for the oculosympathetics"
- **What it should say / be:** A target statement that matches what the record and the atlas can represent: the drawn course ends at the cervicomedullary junction (last waypoint [4,-52,0]; deepest declared level lvl-spinal-medulla y=-50) and no thoracic spinal-cord structure exists in the atlas, so neither T1-L2 nor the C8-T2 ciliospinal centre is reachable in this model
- **Basis (internal-contradiction):** Internal contradiction between the record's own `target` and its own `waypoints`/`levels`, plus the absence of any spinal-cord structure: the atlas's most caudal anchor is lvl-spinal-medulla (y=-50) and the caudal-most committed mesh is ctx-medulla-surface (y-min -50.795). Secondary (own anatomical knowledge, labelled as such): descending hypothalamic sympathetic fibres really do end in the intermediolateral column at T1-L2 with the oculosympathetic preganglionic cells at C8-T2, so the ANATOMY of the claim is right — it is the record's course/levels that cannot carry it
- **Suggested fix (integrator only):** Either (a) shorten the claim to the truth of the drawn course — "descends through the lateral brainstem tegmentum to the cervical cord, where the same pathway continues to the T1-L2 intermediolateral column (drawn only to the cervicomedullary junction in this atlas)" — or (b) add the cervicothoracic cord anchors if a future run adds cord geometry. Do not invent thoracic levels that do not exist
- **Notes:** Same shape as the architect's C1 note that the 30 origin3d-less records are represented by another field; here the limitation is the atlas's caudal extent, not the record. Reported as suspect, not wrong, because a reader who knows the model is brainstem-only is not misled about the anatomy.

#### `tract-trigeminothalamic-dorsal.function` — suspect, minor

- **Record/field:** `tract-trigeminothalamic-dorsal` → `function`
- **What the data says:** function = "A small uncrossed complement … Its existence explains why unilateral brainstem lesions may leave some ipsilateral oral touch intact and why the face has partial bilateral thalamic representation."  decussation = "None — uncrossed, ipsilateral ascent in the dorsolateral pontine tegmentum"
- **What it should say / be:** A statement flagged as contested: the classical uncrossed dorsal trigeminothalamic tract is described in older texts, but the modern consensus is that nearly all second-order trigeminal axons cross and the ipsilateral oral-touch sparing after a lateral pontine lesion is better attributed to the brainstem trigeminal complex itself (bilateral projections of the mesencephalic/principal nuclei and partial overlap of the crossed ventral tract). The record presents the ipsilateral route as the explanation without marking it as disputed
- **Basis (own-knowledge):** Own anatomical knowledge, labelled as such: the existence and size of a discrete uncrossed dorsal trigeminothalamic tract is contested in current literature, and the record's own `decussation` field hedges ("small uncrossed complement") while its `function` field states the explanatory role as fact. No internal contradiction and no external source consulted, so this is a suspicion about certainty, not a claim that the tract does not exist
- **Suggested fix (integrator only):** Soften `function` to mark the uncertainty, e.g. "a small ipsilateral component whose existence and size are debated; whatever the fate of the dorsally placed fibres, ipsilateral oral touch is partly preserved after a lateral pontine lesion because the brainstem trigeminal complex projects bilaterally." Keep the record — it is a legitimate teaching point — but do not state the disputed route as the established explanation
- **Notes:** The plate layer is unaffected: the dorsal tract is not drawn on any of the 15 plates (0 of 15 carry `tract-trigeminothalamic-dorsal`).

#### `tract-optic-radiation.levels` — suspect, major

- **Record/field:** `tract-optic-radiation` → `levels`
- **What the data says:** levels = 6 anchors: lvl-midbrain-sc(y14), lvl-post-comm(y19), lvl-thalamus-mid(y28), lvl-thalamus-rostral(y36), lvl-tel-thalamostriate(y48), lvl-tel-convexity(y78); the record's own waypoints span y 14…30 (z -66…12, x 13…28)
- **What it should say / be:** A level set whose highest anchor lies within (or within a few au of) the record's own course — i.e. at most lvl-thalamus-mid(y28)/lvl-thalamus-rostral(y36) — OR a course that actually ascends into the centrum semiovale/high convexity. y=48 is 18 au and y=78 is 48 au above the highest waypoint (y=30)
- **Basis (internal-contradiction):** Internal contradiction inside one record: `levels` and `waypoints` are fields of the SAME record. The architect review (PLAN-run-mtze6lyq-t83x.md §3 D2) reached the same verdict on the same pair of fields. Secondary: the record's own target is "Primary visual cortex (V1) around the calcarine fissure", and the model's own ctx-v1 origin is [9.5, 17, -60] — the last waypoint (13, 30, -66) is 14.7 au (17.7 mm) from it, so the course also stops short of the target it names
- **Suggested fix (integrator only):** Do NOT silently delete the two anchors if the record is meant to reach V1. Preferred fix: extend `waypoints` to the occipital pole/V1 (through the retrolenticular internal capsule, the parietal dorsal bundle and the tapetum, ending near ctx-v1 [9.5, 17, -60]) and keep the level set. If the short course is deliberate, trim `levels` to lvl-midbrain-sc, lvl-post-comm, lvl-thalamus-mid, lvl-thalamus-rostral and say in `function` that only the retrolenticular/transverse-temporal segment is drawn. Either way the two fields must stop contradicting each other
- **Notes:** AUDITORS DO NOT EDIT DATA — this is an integrator action. Any moved waypoint must stay inside CLIP_BOUNDS x[-58,58] y[-55,116] z[-76,72]; the current 10 au clearance at [13,30,-66] has room. The level anchors themselves are legitimate anatomy for an LGN→V1 radiation (the high convexity plate at y=78 shows the occipital ribbon); the defect is the mismatch, not the anatomy.

### 3.2 Mechanical checks over all 23 tracts (all clean unless stated)

| check | result |
| --- | --- |
| waypoints inside CLIP_BOUNDS | 23/23 — 0 waypoints outside x[-58,58] y[-55,116] z[-76,72] |
| minimum clearance of any tract waypoint to the clip box | 3.00 au (tract-corticospinal-lateral [−3,−52,−2], tract-lateral-vestibulospinal [3.5,−52,2], tract-hypothalamospinal [4,−52,0], tract-spinothalamic [3,−52,3]) — inside the box, and note the 6.00 au figure quoted in the brief belongs to the 12 nerve courses, not to these 23 |
| midline crossings | 9 of the 23 tracts cross x=0, and every crossing is one the record's own `decussation` field claims: corticospinal (y −47, pyramidal decussation), corticopontine (y −24, pontocerebellar crossing in the basis pontis), rubrospinal (y +7→+3, ventral tegmental decussation), tectospinal (y +4, dorsal tegmental decussation), DCML (y −42, internal arcuate fibres), ventral trigeminothalamic (y −24), anterior spinocerebellar (y +8, SCP decussation), auditory (y −19, trapezoid body). The other 14 tracts (corticobulbar, both vestibulospinal, reticulospinal, MLF, central tegmental, hypothalamospinal, spinothalamic, dorsal trigeminothalamic, posterior spinocerebellar, spinoreticular, optic radiation, cingulum, SLF, uncinate) cross x=0 nowhere, which is correct for every one of them: their crossing happened earlier (skin/orbit/retina/cord level) or never happens (the ipsilateral systems) |
| duplicate level ids in a tract `levels[]` | 0 across 23 records |
| level ids that do not resolve in levels.json | 0 across 23 records (matches the architect's reference-integrity measurement) |
| tube radius | 23 radii span 0.40–0.90 au = 0.96–2.16 mm at 1 au = 1.2 mm. The spread is real and is NOT a defect (the brief's "uniform radius" premise was retired by the architect in §C10/T4). One value is implausible on its own terms: tract-mlf at 0.96 mm — see §3.1 |
| cortical-origin endpoints (y = 36–40) on the cortico-efferent tracts | present and plausible: y=38–40 is the rostral thalamus/internal-capsule level (lvl-thalamus-rostral y=36) on the road to the corona radiata — verified against the committed ctx-corpus-callosum bbox (y 19.4–63.9) and ctx-hemisphere-l (y −6.8–113.7) |
| level sets vs the record's own course | 22 of 23 fit within a 4 au tolerance; 1 does not — tract-optic-radiation, whose two highest anchors sit 18 and 48 au above its own course (§3.1) |
| direction vs origin/target order | 23/23 consistent (descending = cortex → cord/nucleus in the record's own field order; ascending = receptor/nucleus → thalamus/cerebellum; mixed = the two intrahemispheric association systems plus the MLF, whose ascending internuclear and descending vestibulospinal limbs are both stated in its own `decussation` note) |

### 3.3 Decussation statements, tract by tract (the highest-risk claim class)

| tract | claimed decussation | crossing found in `waypoints[]` | verdict |
| --- | --- | --- | --- |
| `tract-corticospinal-lateral` | Pyramidal decussation at lvl-pyramid-decuss (cervicomedullary junction): ~85–90% of fibers cross to form the lateral CST; ~10% continue uncrossed as … | x 1.5→0 at y -45→-47; x 0→-3 at y -47→-52 | ok |
| `tract-corticobulbar` | No tract-level decussation — individual fibers project bilaterally to most cranial motor nuclei; exceptions dominated by contralateral innervation: t… | — (none) | ok |
| `tract-corticopontine` | Pontocerebellar fibers cross in the basis pontis to reach the contralateral middle cerebellar peduncle | x 1→-5.5 at y -20→-24 | ok |
| `tract-rubrospinal` | Ventral tegmental decussation (of Forel) immediately caudal to the red nucleus — fibers cross ventromedially and descend contralaterally | x 1.5→0 at y 10→7; x 0→-1.5 at y 7→3 | ok |
| `tract-tectospinal` | Dorsal tegmental decussation (of Meynert) in the caudal midbrain, dorsal to the medial lemniscus | x 0.5→-1 at y 7→4 | ok |
| `tract-lateral-vestibulospinal` | None — uncrossed; descends ipsilaterally in the ventral funiculus, anterior to the rubrospinal and spinocerebellar fibers | — (none) | ok |
| `tract-medial-vestibulospinal` | Predominantly uncrossed — descends bilaterally in the medial longitudinal fasciculus with a small decussating contingent | — (none) | ok |
| `tract-reticulospinal` | None — predominantly ipsilateral descent with bilateral terminal arborization through commissural reticular neurons | — (none) | ok |
| `tract-mlf` | Internuclear fibers decussate within the oculomotor/trochlear complexes for yoking of the contralateral medial rectus; no tract-level decussation — t… | — (none) | ok |
| `tract-central-tegmental` | No intrinsic decussation — the tract is an ipsilateral tegmental conduit within the Mollaret triangle | — (none) | ok |
| `tract-hypothalamospinal` | None — uncrossed; descends ipsilaterally through the lateral brainstem tegmentum | — (none) | ok |
| `tract-dcml` | Internal arcuate fibers — sensory decussation at lvl-sensory-decuss: second-order axons from the dorsal column nuclei arch ventromedially and cross c… | x 1→-0.5 at y -42→-41 | ok |
| `tract-spinothalamic` | Anterior white commissure of the spinal cord within 1–2 segments of entry; no further crossing in the brainstem (tract ascends contralateral to the b… | — (none) | ok |
| `tract-trigeminothalamic-ventral` | Second-order fibers cross at or shortly above their level of origin in the dorsal pons/rostral medulla, then ascend as the trigeminal lemniscus adjac… | x 0.5→-2 at y -24→-28 | ok |
| `tract-trigeminothalamic-dorsal` | None — uncrossed, ipsilateral ascent in the dorsolateral pontine tegmentum near the mesencephalic trigeminal tract/central gray region | — (none) | ok |
| `tract-posterior-spinocerebellar` | None — entirely uncrossed; fibers ascend ipsilaterally in the periphery of the lateral funiculus and join the inferior cerebellar peduncle in the upp… | — (none) | ok |
| `tract-anterior-spinocerebellar` | Double crossing: first in the spinal cord (anterior white commissure at the segment of origin), then recrossing within the superior cerebellar pedunc… | x 1.5→-4 at y 8.5→4 | ok |
| `tract-auditory-pathway` | Trapezoid body — the auditory decussation of the caudal pons (ventral cochlear nuclei → contralateral superior olivary complex/lateral lemniscus); re… | x 3→-3 at y -20→-18 | ok |
| `tract-spinoreticular` | Polysynaptic and predominantly bilateral — projections cross and recross diffusely within the reticular core rather than in a single commissure | — (none) | ok |
| `tract-optic-radiation` | None within the radiation: the crossing occurred at the optic chiasm (nasal retina) and again at the LGN relay, so each radiation carries the contral… | — (none) | ok |
| `tract-cingulum` | None — the cingulum is entirely intrahemispheric, which is why unilateral cingulate or parahippocampal lesions produce lateralized limbic and memory … | — (none) | ok |
| `tract-uncinate-fasciculus` | None — intrahemispheric throughout. The hook at the limen insulae is its defining feature (uncinate = hooked), and it is the ventral counterpart of t… | — (none) | ok |
| `tract-superior-longitudinal-fasciculus` | None — the SLF/arcuate system is entirely intrahemispheric; together with the uncinate it forms the dorsal-ventral pair of the perisylvian language n… | — (none) | ok |

## 4. Plates — what was checked and what it came out as

### 4.1 The ten findings on plates

#### `plate-thalamus-mid.(orientation-markers)` — wrong, major

- **Plate/field:** `plate-thalamus-mid` → `svg plate-frame orientation markers (P at (400,62) / A at (400,738))`
- **What the data says:** plate-thalamus-mid.svg draws "P" in the circle at cy=62 (top) and "A" in the circle at cy=738 (bottom)
- **What it should be:** On a transverse plate whose own manifest declares orientation "transverse" at a single level, and whose contents are a single horizontal slice through the thalamus, the vertical axis runs anterior(bottom)→posterior(top) iff the markers are inverted: the plate's own geometry places the PULVINAR/MGN at the top and the ANTERIOR NUCLEUS + mammillary body at the bottom, which is the model's own z order (nuc-pulvinar z=-5.5 and nuc-mgn z=-4.5 vs nuc-thalamic-anterior z=+4.0, nuc-mammillary-body z=+4.0). Every other transverse plate in the set — plate-midbrain-sc, -midbrain-ic, -pons-rostral, -pons-middle, -pons-caudal, -olivary, -sensory-decuss, -pyramid-decuss — puts the anterior marker at the BOTTOM and the posterior marker at the TOP (A at (748,748), P at (52,748))
- **Basis (internal-contradiction):** Two independent bases. (1) Internal contradiction: on this plate the pulvinar/MGN sit at pixel y=244 and the anterior nucleus at y=548 and the mammillary body at y=616, while the model says pulvinar/MGN are posterior (z -5.5/-4.5) and the anterior nucleus/mammillary body are anterior (z +4.0/+4.0) — so the top of the figure is posterior, i.e. the "P" is on the wrong end. (2) Consistency inside the plate set: the other eight transverse plates use the opposite convention for the same pair of letters.
- **Suggested fix (integrator only):** Swap the two letters in src/data/plates/plate-thalamus-mid.svg only: put "A" in the circle at cx=400 cy=62 and "P" in the circle at cx=400 cy=738. Do NOT move any shape, label, leader line or the dashed midline — the drawing itself is correct. Note that src/data/plates.json carries no orientation-marker field, so this is an SVG-only edit
- **Notes:** Verified as NOT a 180-degree rotation: the left/right markers are right (R at (52,400), L at (748,400)) and the bilateral structures are drawn symmetrically about the dashed midline at x=400 (e.g. nuc-pulvinar cx 322/478, nuc-subthalamic cx 280/520), so only the A/P letters are wrong. Consequence if left: a reader is told the thalamic pulvinar lies at the anterior end of the slice.

#### `plate-sagittal-midline.(orientation-markers)` — wrong, major

- **Plate/field:** `plate-sagittal-midline` → `svg plate-frame orientation markers (A at (52,400) / P at (748,400))`
- **What the data says:** plate-sagittal-midline.svg draws "A" in the circle at x=52 (image LEFT) and "P" in the circle at x=748 (image RIGHT)
- **What it should be:** The plate's own contents run anterior on the LEFT and posterior on the RIGHT, so the marker letters are 180°/90° transposed: "P" belongs at x=52 and "A" at x=748
- **Basis (internal-contradiction):** Internal contradiction with the plate's own drawn structures, which are ordered exactly as an anterior-left sagittal profile: surf-optic-chiasm centroid x=318 (anterior), surf-infundibulum x=362, nuc-mammillary-body x=446, nuc-pretectal x=462, nuc-dorsal-raphe x=452, nuc-pineal-gland x=543, ctx-cerebellum x=577 (most posterior). The model agrees: surf-optic-chiasm z=+10 and nuc-mammillary-body z=+4 against nuc-pineal-gland and ctx-cerebellum far posterior. Secondary: the other sagittal plate in the set, plate-tel-sagittal-hemisphere, puts "A" at x=52 with its frontal lobe at x=606 (image right, frontal cortex drawn on the right) — a different horizontal direction from this plate, which is why the letters cannot be right on both
- **Suggested fix (integrator only):** Swap the two letters in src/data/plates/plate-sagittal-midline.svg only: "A" into the circle at cx=52 cy=400 and "P" into the circle at cx=748 cy=400. Keep "S" at (400,62) and "I" at (400,738) — the vertical axis on this plate IS correct (corpus callosum y=249 above third ventricle y=409 above basis pontis y=655)
- **Notes:** This is the only sagittal/coronal plate in the set whose horizontal axis is anterior-right; the fix must be to the letters, not to the drawing, because the drawing is anatomically coherent with anterior-left.

#### `plate-sagittal-midline.label.vent-cerebral-aqueduct` — wrong, major

- **Plate/field:** `plate-sagittal-midline` → `regions[label=vent-cerebral-aqueduct].leader-dot (526,550)`
- **What the data says:** the plate-label group data-for="vent-cerebral-aqueduct" points its leader dot at (526,550), inside vent-fourth-ventricle (centroid (521,618)) and ctx-cerebellum (centroid (577,638)); 30 px outside its own shape
- **What it should be:** A leader dot on or inside the aqueduct path (centroid ~(467,513)), within a few px like the other labels on the same plate
- **Basis (internal-contradiction):** Parsed the committed SVG: the label group for vent-cerebral-aqueduct carries <circle cx="526" cy="550">, which is 30 px outside the aqueduct shape on this plate, while the aqueduct's own leader target should be within a few px of it (the plate-set median miss is 0 px, measured over all 360 labels). The dot instead sits in the fourth-ventricle/cerebellar field.
- **Suggested fix (integrator only):** Re-point the circle and the line end of the vent-cerebral-aqueduct label group in plate-sagittal-midline.svg to the aqueduct shape (approx (467,513) ± the same few-px offset used by the other labels on this plate).
- **Notes:** Found by parsing every plate SVG and testing each label dot against its own shape with an ellipse/circle point-inside test, then reporting which NAMED structure the dot actually lands in. The same pass found 0 of 360 labels whose labelPos disagrees with the SVG text position and 0 of 360 labelled shape ids without a label.

#### `plate-sagittal-midline.label.nuc-pag` — wrong, minor

- **Plate/field:** `plate-sagittal-midline` → `regions[label=nuc-pag].leader-dot (520,543)`
- **What the data says:** the plate-label group data-for="nuc-pag" points its leader dot at (520,543), inside ctx-cerebellum; 10 px outside its own shape
- **What it should be:** A leader dot on or inside the periaqueductal gray shape (centroid ~(468,514)), within a few px like the other labels on the same plate
- **Basis (internal-contradiction):** Parsed the committed SVG: the PAG leader dot is 10 px outside the PAG shape and inside the cerebellum outline, so on this plate the PAG label points at the cerebellum rather than at the gray matter around the aqueduct.
- **Suggested fix (integrator only):** As above: re-point the nuc-pag label circle/line end to the PAG shape.
- **Notes:** Found by parsing every plate SVG and testing each label dot against its own shape with an ellipse/circle point-inside test, then reporting which NAMED structure the dot actually lands in. The same pass found 0 of 360 labels whose labelPos disagrees with the SVG text position and 0 of 360 labelled shape ids without a label.

#### `plate-sagittal-midline.label.nuc-dorsal-raphe` — wrong, minor

- **Plate/field:** `plate-sagittal-midline` → `regions[label=nuc-dorsal-raphe].leader-dot (461,480)`
- **What the data says:** the plate-label group data-for="nuc-dorsal-raphe" points its leader dot at (461,480), inside ctx-hypothalamus-envelope; 4 px outside its own shape
- **What it should be:** A leader dot on or inside the dorsal raphe shape (centroid ~(452,486)), within a few px like the other labels on the same plate
- **Basis (internal-contradiction):** Parsed the committed SVG: the dorsal-raphe leader dot is 4 px outside its own shape and inside the hypothalamic envelope drawn on the same plate.
- **Suggested fix (integrator only):** Nudge the nuc-dorsal-raphe label circle onto the raphe shape.
- **Notes:** Found by parsing every plate SVG and testing each label dot against its own shape with an ellipse/circle point-inside test, then reporting which NAMED structure the dot actually lands in. The same pass found 0 of 360 labels whose labelPos disagrees with the SVG text position and 0 of 360 labelled shape ids without a label.

#### `plate-pons-rostral.label.surf-cn4-exit` — wrong, minor

- **Plate/field:** `plate-pons-rostral` → `regions[label=surf-cn4-exit].leader-dot (400,252)`
- **What the data says:** the plate-label group data-for="surf-cn4-exit" points its leader dot at (400,252), between the two ovals — 6 px outside both, i.e. on the midline rather than on either rootlet
- **What it should be:** A leader dot on or inside the two trochlear rootlet ovals at (391,254) r(3,9) and (409,254) r(3,9), within a few px like the other labels on the same plate
- **Basis (internal-contradiction):** Parsed the committed SVG: the leader dot sits on the midline x=400 between the two rootlet ovals, so it touches neither. Cosmetic: the label still reads unambiguously as the CN IV rootlets, which is why this is minor and not major.
- **Suggested fix (integrator only):** Move the dot to one of the two ovals, e.g. (391,254).
- **Notes:** Found by parsing every plate SVG and testing each label dot against its own shape with an ellipse/circle point-inside test, then reporting which NAMED structure the dot actually lands in. The same pass found 0 of 360 labels whose labelPos disagrees with the SVG text position and 0 of 360 labelled shape ids without a label.

#### `plate-thalamus-mid.label.nuc-thalamic-anterior` — wrong, minor

- **Plate/field:** `plate-thalamus-mid` → `regions[label=nuc-thalamic-anterior].leader-dot (342,556)`
- **What the data says:** the plate-label group data-for="nuc-thalamic-anterior" points its leader dot at (342,556), 3 px outside its own shape
- **What it should be:** A leader dot on or inside the ellipse at (320,548) r(20,16), within a few px like the other labels on the same plate
- **Basis (internal-contradiction):** Parsed the committed SVG: the dot is 3 px outside the anterior-nucleus ellipse (it lands in the gap between that nucleus and the internal medullary lamina). Same class of defect as the plate-sagittal-midline dots, an order of magnitude smaller.
- **Suggested fix (integrator only):** Move the dot to (320,548).
- **Notes:** Found by parsing every plate SVG and testing each label dot against its own shape with an ellipse/circle point-inside test, then reporting which NAMED structure the dot actually lands in. The same pass found 0 of 360 labels whose labelPos disagrees with the SVG text position and 0 of 360 labelled shape ids without a label.

#### `plate-coronal-thalamus.label.nuc-mammillary-body` — wrong, minor

- **Plate/field:** `plate-coronal-thalamus` → `regions[label=nuc-mammillary-body].leader-dot (430,586)`
- **What the data says:** the plate-label group data-for="nuc-mammillary-body" points its leader dot at (430,586), 3 px outside its own shape
- **What it should be:** A leader dot on or inside the mammillary-body shape, within a few px like the other labels on the same plate
- **Basis (internal-contradiction):** Parsed the committed SVG: the dot is 3 px outside the mammillary body on the coronal plate; this plate also flags nuc-mammillary-body as the only islanded shape (nearest neighbour ctx-fields-of-forel at 78 px), so the structure is drawn detached from the rest of the section.
- **Suggested fix (integrator only):** Move the dot onto the mammillary body; consider whether the mammillary body belongs on a coronal section taken at the pulvinar/pineal level at all (the model puts it at z=+4, well anterior of that plane).
- **Notes:** Found by parsing every plate SVG and testing each label dot against its own shape with an ellipse/circle point-inside test, then reporting which NAMED structure the dot actually lands in. The same pass found 0 of 360 labels whose labelPos disagrees with the SVG text position and 0 of 360 labelled shape ids without a label.

### 4.2 Plate inventory, plane, level and integrity (all 15)

| plate | orientation | levelId | level y | manifest regions | SVG labels | shapes | integrity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `plate-thalamus-mid` | transverse | lvl-thalamus-mid | 28 | 26 | 26 | 26 | ok |
| `plate-midbrain-sc` | transverse | lvl-midbrain-sc | 14 | 24 | 24 | 24 | ok |
| `plate-midbrain-ic` | transverse | lvl-midbrain-ic | 8 | 25 | 25 | 25 | ok |
| `plate-pons-rostral` | transverse | lvl-pons-rostral | 2 | 19 | 19 | 19 | ok |
| `plate-pons-middle` | transverse | lvl-pons-middle | -8 | 21 | 21 | 21 | ok |
| `plate-pons-caudal` | transverse | lvl-pons-caudal | -18 | 30 | 30 | 30 | ok |
| `plate-olivary` | transverse | lvl-olivary | -34 | 23 | 23 | 23 | ok |
| `plate-sensory-decuss` | transverse | lvl-sensory-decuss | -42 | 22 | 22 | 22 | ok |
| `plate-pyramid-decuss` | transverse | lvl-pyramid-decuss | -46 | 19 | 19 | 19 | ok |
| `plate-sagittal-midline` | sagittal | — (correct for this plane) | — | 26 | 26 | 26 | ok |
| `plate-coronal-midbrain` | coronal | — (correct for this plane) | — | 25 | 25 | 25 | ok |
| `plate-coronal-thalamus` | coronal | — (correct for this plane) | — | 31 | 31 | 31 | ok |
| `plate-tel-axial-58` | transverse | lvl-tel-basal-ganglia | 58 | 19 | 19 | 19 | ok |
| `plate-tel-sagittal-hemisphere` | sagittal | — (correct for this plane) | — | 25 | 25 | 25 | ok |
| `plate-tel-coronal-fornix` | coronal | — (correct for this plane) | — | 25 | 25 | 25 | ok |

Measured over the whole set: **360** manifest regions, **360** SVG label groups, **360** distinct labelled `data-structure` ids, **0** manifest slugs without an SVG label, **0** SVG labels outside the manifest, **0** labelled shape ids without a label group, **0** `labelPos`/SVG-text disagreements (max 0.0 px over 360 labels). The 10 transverse plates all carry a `levelId`; the 5 without one are exactly the 2 sagittal and 3 coronal plates, where a y-anchor is meaningless — **not** a defect (the architect retired that premise in §C9/T5).

### 4.3 Laterality and orientation conventions

- **Image-left = patient-right on the transverse and coronal plates.** Verified shape-by-shape on plate-thalamus-mid (R at (52,400)): ctx-lenticular-nucleus cx 206/594 outside ctx-internal-capsule cx 230/570 ✓; nuc-vpl |x−400| = 130 outside nuc-vpm 84 ✓; nuc-lgn 168 outside nuc-md 38 ✓. Verified again on plate-tel-coronal-fornix (nuc-putamen 127 outside nuc-globus-pallidus-externus 112 outside nuc-globus-pallidus-internus 83 ✓, nuc-amygdala 114 outside nuc-hippocampus 112 ✓) and on plate-tel-axial-58 (surf-insula outside the lentiform group outside the internal capsule ✓). **No laterality defect found on any plate.**
- **Anterior-up on the transverse plates, dorsal-up on the coronal plates.** Eight of the nine transverse plates draw the anterior marker at the bottom and the posterior marker at the top, and their contents agree (e.g. plate-pons-caudal: abducens nucleus (468,368) dorsal to pontine nuclei (500,585); plate-olivary: hypoglossal nucleus (428,348) dorsal to the inferior olive (507,528)). plate-thalamus-mid is the exception and its markers, not its drawing, are wrong (§4.1).
- **Superior-up on the coronal plates** (S at (400,62), I at (400,738)): plate-coronal-midbrain has the red nucleus at y=340 above the substantia nigra reticulata at y=465 ✓; plate-tel-coronal-fornix has the corpus callosum body at y=232 above the lateral ventricle at y=285 above the caudate head at y=318 above the amygdala at y=474 ✓.
- **Sagittal horizontal direction is not consistent across the two sagittal plates, and on the midline plate the letters contradict the drawing.** plate-tel-sagittal-hemisphere draws the frontal lobe on the image RIGHT (surf-frontal-lobe centroid x=606, genu x=515, occipital lobe x=194) with "A" at x=52 and "P" at x=748 — the letters match the drawing, so that plate is coherent however unusual the direction. plate-sagittal-midline draws an anterior-left profile (optic chiasm x=318, infundibulum x=362, mammillary body x=446, pretectum x=462, pineal gland x=543, cerebellum x=577, corroborated by the model's own z values) yet puts "A" at x=52 — so the letters are inverted there. The defect is reported on the midline plate only.

### 4.4 Titles vs content

Every plate title was read against its own SVG caption and its own drawn structures. **No plate title contradicts its content.** Two naming notes a reader should not mistake for defects: `plate-tel-axial-58` is titled "axial" while its manifest `orientation` is `transverse` (the same plane under two radiological names, and its `levelId` lvl-tel-basal-ganglia y=58 is correct); and `plate-pons-rostral` is titled "Pons - upper (SCP, CN IV)" while its own SVG caption adds "CN IV exit" — the trochlear rootlets are drawn at the top of that plate, which is what the caption says.

## 5. What this audit cannot establish

- It is a review of authored text and authored coordinates, not a source-verified re-derivation and not a comparison with imaging or a specimen. Every `ok` verdict means "no contradiction found against the atlas's own records, the committed mesh bboxes, or standard teaching" — not "confirmed by observation".
- Plate geometry was tested internally (each label dot against each shape) and against the model; no verdict rests on how the SVG renders in a browser. The browser lane cannot run in this sandbox at all, and no rendered-pixel claim is made anywhere in this file.
- Two claims in the tract set rest on contested anatomy rather than on a measurable contradiction, and are therefore reported as *suspect* rather than wrong: the explanatory role of the uncrossed dorsal trigeminothalamic route, and the MLF's authored calibre. Both carry a named basis so the integrator can reject them on the record.
- The tract `waypoints[]` were judged as polylines and control points, not as the Catmull-Rom spline that is finally swept: a 20 au segment (tract-uncinate-fasciculus waypoints 2→3) can overshoot its control polygon, and that cannot be measured without rendering.

## 6. Hand-off

The integrator (`apply-corrections`, T7) owns every change proposed here. In priority order:

1. `tract-optic-radiation` — resolve the `levels`↔`waypoints` contradiction (major; pick one of the two fixes named in §3.1 and say which).
2. `plate-thalamus-mid` and `plate-sagittal-midline` — swap the two orientation-marker letters in each SVG (major, two-character edits, no geometry moves).
3. `tract-hypothalamospinal.target` — reconcile the T1–L2 claim with the drawn course (major).
4. `plate-sagittal-midline` — re-point three leader dots to their own structures: `vent-cerebral-aqueduct` (lands 30 px away in the fourth-ventricle/cerebellar field), `nuc-pag` (10 px, in the cerebellum) and `nuc-dorsal-raphe` (4 px, in the hypothalamic envelope).
5. Three more leader-dot nudges of 3–6 px, which are cosmetic and may be rejected freely: `surf-cn4-exit` on plate-pons-rostral (dot on the midline between the two rootlet ovals), `nuc-thalamic-anterior` on plate-thalamus-mid and `nuc-mammillary-body` on plate-coronal-thalamus.
6. `tract-trigeminothalamic-dorsal.function` and `tract-mlf.tubeRadius` — minor; reject freely if the integrator judges the teaching value of the current text higher.

Nothing else in the 23 tracts or the 15 plates was found to be wrong. `docs/audit/v15/tracts-plates.findings.json` carries the same 345 findings with the full 11-key schema for every one of them.
