# Scientific audit — diencephalon (thalamus, hypothalamus, epithalamus/subthalamus) and the ventricular system

**Task:** `audit-diencephalon` (phase 1, builder) · **Run:** `run-mtze6lyq-t83x` · **Base:** `a530dff` + the uncommitted v13/v14 slice
**Findings file (machine-readable, the hand-off):** `docs/audit/v15/diencephalon.findings.json` (41 findings, 12 required keys each)
**Auditor writes:** this file and the findings JSON only. **No data file was edited.**

---

## 1. What was audited

| file | records |
| --- | --- |
| `src/data/structures/diencephalon-thalamus.json` | 16 |
| `src/data/structures/diencephalon-hypothalamus.json` | 12 |
| `src/data/structures/diencephalon-epithalamus-subthalamus.json` | 14 |
| `src/data/structures/telencephalon-ventricles.json` | 7 |
| `src/data/structures/telencephalon-ventricle-segments.json` | 1 |
| **total** | **50** |

Every record was read in full and every one of its fields considered: `name`, `synonyms`, `region`, `subdivision`,
`kind`, `laterality`, `color`, `function`, `connections.afferent/efferent`, `bloodSupply`, `clinical[]`,
`contextNote`, `levels[]`, `origin3d`, `size3d`, `refs`.

Cross-checked against: `src/data/taxonomy.json` (all 50 registry rows diffed field-by-field), `src/data/levels.json`
(17 anchors), `src/assets/anatomy/anatomy-manifest.json` (138 committed parts — `bbox`/`centroid` used as the
frozen geometric ground truth), `src/data/syndromes/diencephalon.json` (7 cards), `src/geometry/anatomyAssets.ts`
+ `src/components/viewer3d/SceneLayers.tsx` (which records own a committed body, and how `origin3d`/`size3d` are
consumed), `src/data/plates.json` (the plate tags the records' own `contextNote`s assert), `src/data/tracts.json`
(the mammillothalamic/hypothalamospinal routes).

Method: reads plus `node -e` probes over the JSON/manifest; **no gate was run except `npm run validate`**
(`✔ Validation PASSED — 0 errors, 0 warning(s)`); no `src/**` write, no re-bake, no browser lane.

## 2. Summary of verdicts and severities

| | critical | major | minor | **total** |
| --- | --- | --- | --- | --- |
| **wrong** | 1 | 9 | 5 | **15** |
| **suspect** | 0 | 0 | 15 | **15** |
| **unverifiable-here** | 0 | 0 | 0 | **0** |
| **ok** (checked exemplars) | 0 | 0 | 11 | **11** |
| **total** | **1** | **9** | **31** | **41** |

- findings: **41** · records audited: **50** · records with a non-`ok` finding: **23** · distinct records cited: **30**
- highest-severity item: `dienc-001` (CSF flow direction inverted in the parent lateral-ventricle record, plus the
  non-existent temporal-horn → fourth-ventricle route), which propagates to six sibling records.
- `basisKind` over the 30 non-`ok` findings: internal-contradiction 20 · own-knowledge 6 · mesh-bbox 2 ·
  nomenclature 2. Over the 11 `ok` exemplars: mesh-bbox 6 · internal-contradiction 4 · textbook 1.
  (Counted from the file: every non-`ok` finding rests on a contradiction with another record, with a committed
  mesh bbox, or on a named standard, or is explicitly labelled as own knowledge — no finding rests on a hunch, and
  nothing is filed as `wrong` on own knowledge alone.)

## 3. The findings, by theme

Each row is a real entry in the JSON; `basisKind` and the full basis text are there. This list is the reading order.

### 3.1 CSF-flow direction and route — the largest defect cluster (8 findings, 1 critical)

The lateral-ventricle group teaches CSF flowing **from** the third ventricle **into** the lateral ventricle and
draining **from the atrium through the temporal horn to the fourth ventricle**. Both halves are wrong: the flow is
lateral ventricle → foramen of Monro → third ventricle → aqueduct → fourth ventricle, and the temporal and
occipital horns are blind recesses. The two sibling records that state it correctly — `vent-third-ventricle`
("the interventricular foramina of Monro drain both lateral ventricles into it") and `vent-interventricular-foramen`
(afferent = the lateral ventricle, efferent = the third ventricle) — are what makes this an *internal
contradiction*, not a judgement call.

| id | record | field | verdict/severity |
| --- | --- | --- | --- |
| dienc-001 | `vent-lateral-ventricle` | `connections.afferent[0]` (reversed) | wrong / **critical** |
| dienc-002 | `vent-lateral-ventricle` | `function` (reversed + temporal-horn route) | wrong / major |
| dienc-003 | `vent-lateral-ventricle-frontal-horn` | `connections` | wrong / major |
| dienc-004 | `vent-lateral-ventricle-body` | `connections` | wrong / major |
| dienc-005 | `vent-lateral-ventricle-temporal-horn` | `connections` | wrong / major |
| dienc-006 | `vent-lateral-ventricle-occipital-horn` | `connections` | wrong / major |
| dienc-007 | `vent-lateral-ventricle-atrium` | `connections.efferent[0]` | wrong / major |
| dienc-008 | `vent-choroid-plexus-lateral` | `connections.efferent[0]` (parenthetical) | wrong / minor |

### 3.2 Position, laterality and the level table (5 findings)

| id | record | what the data says | what it should say | verdict/severity |
| --- | --- | --- | --- | --- |
| dienc-009 | `ctx-internal-medullary-lamina` | `laterality: "midline"`, `origin3d [0, 28.5, 0.5]`, `size3d [4.5, 5.5, 5.5]` | the lamina is a sheet inside **each** thalamus: `paired`, offset laterally. As authored it draws a 9×11×11 au v1 ellipsoid centred in the third ventricle (whose committed mesh is x −1.1…1.0) | wrong / major |
| dienc-010 | `surf-optic-chiasm` | `origin3d [0, 29, 10]` | must agree with the committed chiasm (`ctx-optic-chiasm-l/r`: y 10.4…18.6, z 14.3…23.5) and with the sibling record `ctx-optic-chiasm` `[0, 23.5, 23.5]` — the same structure is currently registered twice, Δy 5.5 au / Δz 13.5 au (14.6 au Euclidean) apart. `PLAN.md` §2.7/§8.2 already recorded this and concluded the record is the thing to fix | wrong / major |
| dienc-011 | `surf-optic-chiasm` | `levels ["lvl-thalamus-rostral"]` | the level that actually contains it (`lvl-thalamus-mid`, y = 28 vs the record's 29), coupled to dienc-010/012 | suspect / minor |
| dienc-012 | `lvl-thalamus-rostral` (`levels.json`) | `y = 36`, named "… (optic chiasm)" | every other level is anchored on the landmark it names (mammillary-body level y 28 = mesh centroid 28.0; SC level y 14 = `nuc-superior-colliculus` y 14); nothing named at +36 is at +36 — the structures there are the rostral hypothalamic group (PVN 35.5, preoptic 34) | suspect / minor |
| dienc-013 | `nuc-mgn` | `[8, 22.5, −4.5]` vs `nuc-lgn [11, 23, −4.5]` | medial offset is right (8 < 11) but the "MGN inferior to LGN" relation is only 0.6 mm and the assigned meshes invert the pair; lower the marker to y ≈ 20.5 (still inside its own mesh, y 20.7…24.5) | suspect / minor |

### 3.3 Clinical and vascular claims (2 findings)

| id | record | claimed | expected | verdict/severity |
| --- | --- | --- | --- | --- |
| dienc-014 | `nuc-pulvinar` | `bloodSupply` "…; angular (MCA) branches supply the lateral pole" | the pulvinar is PCA territory (thalamogeniculate + lateral posterior choroidal); the MCA never supplies the thalamus — the record's own two `clinical` items say so | wrong / major |
| dienc-015 | `nuc-thalamic-reticular` | "Prion degeneration targeting **anterior and reticular** thalamic nuclei" | fatal familial insomnia targets the **anteroventral (AV) and mediodorsal (MD)** nuclei (± the inferior olive); the reticular nucleus is the *mechanism* of spindle loss, not the reported target | suspect / minor |

### 3.4 Nomenclature (9 findings)

| id | record | claimed | expected | verdict/severity |
| --- | --- | --- | --- | --- |
| dienc-017 | `nuc-subthalamic` | "globus pallidus **externa**" (×2) | "globus pallidus externus (GPe)" — the atlas's own canonical row and `telencephalon-basal-ganglia.json` use *externus* | wrong / minor |
| dienc-018 | `ctx-caudate-nucleus` | "globus pallidus **externa**" | same fix | wrong / minor |
| dienc-016 | `nuc-intralaminar` | name "Centromedian-parafascicular nuclei" with synonym "intralaminar nuclei" | CM-PF are the *caudal* pair; the rostral group (central lateral, paracentral, central medial) — and CL's ARAS role the record itself describes — is absent from the atlas | suspect / minor |
| dienc-019 | `ctx-fields-of-forel` | name "Fields of Forel (H1/H2)" | the fields of Forel are conventionally H1, H2 **and H3** (prerubral field) | suspect / minor |
| dienc-020 | `nuc-preoptic` | synonym "median preoptic nucleus" | MnPO is one *component* of the area, as the record's own sentence says | suspect / minor |
| dienc-021 | `nuc-arcuate-hypothalamic` | synonym "feeding center" | the classical feeding centre is the **lateral** hypothalamic area; the arcuate is the infundibular nucleus (the VMH/"satiety centre" pairing in this atlas is correct) | suspect / minor |
| dienc-022 | `nuc-posterior-hypothalamus` | synonym "lateral hypothalamic area (caudal)" | the LHA and the posterior nucleus are distinct zones | suspect / minor |
| dienc-023 | `vent-lateral-ventricle` | synonym "lateral ventricle (body)" | conflates the whole ventricle with a segment that has its own record; the third synonym "paracoele" is **unverifiable here** and is not asserted to be wrong | suspect / minor |
| dienc-025 | `ctx-thalamus-envelope` | contextNote "(see the 15 individual thalamic nucleus records)" | 14 nucleus-kind records (+2 context records) | suspect / minor |

### 3.5 Registry/record and documentation drift (3 findings)

| id | record | claimed | expected | verdict/severity |
| --- | --- | --- | --- | --- |
| dienc-024 | `vent-lateral-ventricle-body` | registry row lacks the record's synonym "cellula media" | sync — search reads the **registry** (`load.ts:419-433`), so the record-only synonym is unreachable; `validate-data.mjs` cross-checks only `name`/`color`, so this drift is unchecked | suspect / minor |
| dienc-029 | `vent-lateral-ventricle-atrium` | contextNote: split at "z = −6 … z = −24 **and above y = +22**", extent "y 11.2…54.6" | a segment defined above y = +22 cannot start at y 11.2, and it overlaps the temporal horn's documented extent; no cast split exists in the shipped geometry at all (no horn GLB, no splitter in the bake script) | wrong / minor |
| dienc-030 | `vent-lateral-ventricle-body` | contextNote: splitter "z = +25" reproduces extent "z −6…27.9" | the plane and the extent contradict each other, and the body's z-max overlaps the frontal horn's z-min (25.2) across that very plane | wrong / minor |

### 3.6 Function/connection precision (3 findings)

| id | record | claimed | expected | verdict/severity |
| --- | --- | --- | --- | --- |
| dienc-026 | `nuc-thalamic-anterior` | afferent "Hippocampal formation via the circuit of Papez (fornix, subiculum)" | the defining relay is the mammillary body via the mammillothalamic tract (which the record also lists); a **direct** hippocampo-anterior-thalamic projection is experimental and contested, and the record's own function sentence routes the signal through the mammillary bodies | suspect / minor |
| dienc-027 | `nuc-preoptic` | "GnRH neurons generate the reproductive hormone pulse" | the pulse generator is currently attributed to the arcuate KNDy/kisspeptin network; preoptic GnRH neurons are its output — and `nuc-arcuate-hypothalamic.efferent` omits kisspeptin entirely | suspect / minor |
| dienc-028 | `nuc-suprachiasmatic` | "retinohypothalamic glutamate/melanopsin input" | melanopsin is the ipRGC **photopigment**, not a transmitter; the RHT transmitter is glutamate with PACAP | suspect / minor |

## 4. Specimens checked and found correct (`ok`, 11 findings)

These are deliverables too: they record what a later reviewer must not "correct".

1. **`nuc-vpl` vs `nuc-vpm`** — VPL lateral to VPM (x 10 vs 7), and the whole ventral tier orders correctly
   (VA 5.5 / VL 8.5 / VPL 10 / VPM 7 in x; VA 5 / VL 2.5 / VPL −2 / VPM −3 in z). VPL's somatotopy ("leg lateral, arm medial") is textbook-correct. `dienc-031`
2. **`nuc-pulvinar`** — posterior (mesh z −16.2…−3.9 is the most posterior thalamic part) and lateral, medial to the LGN marker as anatomy requires. `dienc-032`
3. **`nuc-subthalamic`** — dorsal to the substantia nigra, decisively: STN mesh y 21.0…23.1 vs SNc 9.9…11.2 / SNr 8.7…10.2. The mediolateral "medial to SN" relation is **not resolvable** — both sculpts are bilateral (x ±9), so it is neither asserted nor corrected. `dienc-033`
4. **`nuc-mammillary-body`** — on the hypothalamic floor, posterior to the infundibulum (chiasm z 10 > infundibulum 7 > mammillary 4) and the lowest of the 12 hypothalamic markers (y 28); its mesh centroid (28.0) coincides with the level the table names "mammillary bodies". `dienc-034`
5. **`vent-third-ventricle`** — midline between the paired thalami (mesh x ±1.1 vs thalamic x 4…11.5) with the correct CSF direction. `dienc-035`
6. **`ctx-pineal`** — `origin3d`/`size3d` reproduce the committed mesh bbox centre (within 0.28 au) and its **half-extents** (within 0.03 au); the contextNote's "no plate carries this tag" claim verifies over all 15 manifests. `dienc-036`
7. **`nuc-midline-thalamic`** — genuinely midline: the committed sculpt is a single midline body (x −3.0…2.9). `dienc-037`
8. **The mammillothalamic chain** — fornix → mammillary body → mammillothalamic tract → anterior thalamic nucleus is stated in the correct direction in `nuc-mammillary-body`, `nuc-thalamic-anterior` and the two syndrome cards; no efferent/afferent inversion, and `tract-hypothalamospinal` (descending, PVN → IML) agrees with `nuc-paraventricular.efferent`. `dienc-038`
9. **`vent-lateral-ventricle-temporal-horn.levels`** — the documented extent y 5.6…22 brackets `lvl-midbrain-ic` (8) and `lvl-midbrain-sc` (14), and the marker sits inside the hippocampus sculpt. `dienc-039`
10. **`vent-interventricular-foramen`** — the record that contradicts dienc-001…008: correct direction, correct fornix/thalamic-tubercle anatomy, plausible 1.2–1.5 au marker. `dienc-040`
11. **`nuc-lgn.function`** — laminar eye-segregation (2/3/5 ipsilateral, 1/4/6 contralateral), M/P/K streams, retrolenticular radiations, spared light reflex: all four statements verified against the textbook and against the sibling optic records. `dienc-041`

Also verified and left alone (no finding filed, because the basis would have been weaker than the marker
convention this file demonstrably uses):

- **`nuc-preoptic` `laterality: "midline"`** — its committed mesh *is* a single near-midline body (x −2.3…0.5), so the assignment matches the geometry; not a defect.
- **`nuc-va` (z = 5) vs `nuc-thalamic-anterior` (z = 4)** — the anterior nucleus forms the anterior tubercle, so VA being 1 au in front is arguably inverted, **but** the committed meshes share the inversion (VA centroid z 7.8 vs ANT 6.9) and the difference is ~1.2 mm: reported here as a residual observation rather than a finding, so that a reviewer cannot call it a false positive later.
- **`nuc-supraoptic` / `nuc-suprachiasmatic`** — their `levels []` contains only `lvl-thalamus-rostral` (y 36) while both records and their meshes sit at y 27.8–31. Folded into `dienc-011`/`dienc-012` rather than filed twice.
- **`nuc-mgn.bloodSupply`** "anterior choroidal contributions to the medial pole" — could not be settled here; **not** filed as wrong (no hunch-based findings).
- **Plate tags asserted in the records' `contextNote`s** — verified for `ctx-internal-medullary-lamina` (plate-thalamus-mid, plate-coronal-thalamus), `ctx-fields-of-forel` (+plate-coronal-thalamus), `ctx-internal-capsule` (+plate-coronal-midbrain), `ctx-lenticular-nucleus`, `ctx-caudate-nucleus`, `ctx-hypothalamus-envelope`, `ctx-thalamus-envelope`, `ctx-pineal` ("no plate carries this tag"). Three notes are *incomplete* (they omit a plate they also appear on) but none is false, so none is a finding.
- **Syndrome cards** — all 7 diencephalic cards name structures and territories that agree with the corresponding records (`syn-dejerine-roussy` ↔ VPL/pulvinar + thalamogeniculate; `syn-percheron` ↔ MD/intralaminar/midline-thalamic + paramedian/Percheron; `syn-tuberothalamic` ↔ ANT/VA/VL + tuberothalamic; `syn-korsakoff`, `syn-pineal-region`, `syn-hemiballismus`, `syn-hypothalamic`). No contradiction found; card-internal claims remain the syndrome auditor's.

## 5. Deviations from the plan of record, and what this audit cannot establish

1. **The plan's C1 breakdown of the 30 `origin3d`-less records is wrong.** C1 says they are "the 12 `nrv-*` nerves,
   the 14 `vasc-*` vessels, and 4 context/surface records". Measured: **all 12 `nrv-*` and all 14 `vasc-*` records
   carry `origin3d`+`size3d`**. The real 30 are 1 context (`ctx-cerebral-cortex`), 8 nuclei (caudate head/body/tail,
   putamen, GPe, GPi, hippocampus, amygdala), 8 cortical surfaces, 11 tracts (fornix ×2, optic nerve/tract, corpus
   callosum ×4, internal capsule ×3) and 2 ventricles — **including two of this audit's records:
   `vent-lateral-ventricle` and `vent-choroid-plexus-lateral`**, which is why "no `origin3d`" there is a deliberate
   shape (both own a committed body through `anatomyAssets.ts` LINKS) and not a defect.
2. **C4's scope rule therefore needed re-deriving, not just applying.** "A `size3d` finding is in scope only for the
   114 records with no mesh" is arithmetically fine but wrong in spirit: the binding question is whether a record
   owns a **body**, and three of this file's "mesh-less" records (the thalamic and hypothalamic envelopes, the
   pineal context) do own one through `SceneLayers.tsx` slots or a LINKS alias. Every `size3d` statement in this
   audit was gated on "no committed body", and the only one audited in detail (`ctx-internal-medullary-lamina`)
   turned out to be the laterality defect itself.
3. **The brief's laterality premise is half right.** There is **no** sign-mechanics defect (C5 confirmed), and the
   semantic midline/paired question has exactly **one** real instance in these 50 records:
   `ctx-internal-medullary-lamina` (dienc-009). `nuc-midline-thalamic`, `nuc-preoptic`, the pineal records, the
   third ventricle, the aqueduct and the posterior commissure are all legitimately midline.
4. **`verify:anatomy` was not run and no mesh was re-baked.** All geometry statements here are reads of
   `anatomy-manifest.json`; `27/27` is an orchestrator-lane number.
5. **No browser lane.** No rendered-pixel, pointer, picking or focus observation is claimed anywhere in this audit,
   including for the v1 marker ellipsoids described in dienc-009.
6. **Nothing here is validated against imaging or a specimen.** This is a model-based review of authored text and
   authored coordinates, cross-checked against other authored records and the committed mesh bboxes.
7. **Open question handed to the integrator (not resolvable here):** the optic-chiasm divergence (dienc-010) has two
   defensible resolutions with opposite costs — moving `surf-optic-chiasm` to the committed geometry satisfies the
   mesh but puts the chiasm at the superior-colliculus level (`lvl-midbrain-sc`, y 14) and breaks its relation to
   `surf-infundibulum` (y 27); keeping the record keeps the anatomy but leaves two registered chiasm records 14.6 au
   apart. The frozen-mesh rule forbids changing the geometry, so someone must choose, and the choice should be
   recorded in the record's `contextNote` either way.
