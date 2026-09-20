# v15 scientific audit — cerebral vasculature (14 arteries) and the twelve cranial nerves

Task `audit-vessels-nerves` · area `vessels-nerves` · machine-readable companion: `docs/audit/v15/vessels-nerves.findings.json` (27 findings).

## 1. What was audited, and how

| | |
| --- | --- |
| Vessels | all **14** records in `src/data/structures/vasculature.json` (`vasc-internal-carotid-artery` … `vasc-posterior-medial-choroidal-artery`), each checked for origin/branching text, segment nomenclature, `territory[]`, `supply[]`, `connections`, `bloodSupply`, `clinical[]`, `origin3d`, `size3d`, `levels[]` |
| Cranial nerves | all **12** `nrv-cn*` records (`telencephalon-cranial-nerves.json` for I and II, `brainstem-cranial-nerves.json` for III–XII), plus the twelve course geometry records in `src/geometry/curves.ts` (`NERVE_COURSES`: `waypoints`, `tubeRadius`, `calibreMm`, `foramen`, `anchorId`, `anchorNote`) added by run `run-mtzc5coc-ug6z` |
| Linked nuclei / landmarks | the `nuc-*` and `surf-cn*-exit` records the twelve nerves name, read from `pons.json`, `medulla.json`, `midbrain.json`, `diencephalon-*.json`, `taxonomy.json` and `levels.json` |
| Syndrome cards | all **26** cards in `src/data/syndromes/*.json` — every `supply` id resolved, every named structure resolved, and each card's `vascularTerritory` text compared with the artery that claims it |
| Geometry | the bounding boxes of the **138 committed GLBs** in `src/assets/anatomy/` read straight out of the binary (GLTF `accessors[POSITION].min/max`) — **not re-baked, not modified** |

**Coordinate rules used (this is the load-bearing part of the method).** Canonical space is `x = +patient-left`, `y = +superior`, `z = +anterior`, `1 au = 1.2 mm` (`docs/VASC_INVENTORY.md` §2). At registration the **x and z axes were kept uniform at 1 au = 1.2 mm while y was piecewise-linearly warped onto the `levels.json` anchors** (`scripts/lib/register.mjs` §3.2; knots `1220.63→−50, 1251.04→−24, 1274.79→+4, 1287.71→+20, 1300.57→+38` from `assets-src/bp3d/canonical/registration-summary.json`). Therefore:

* a record's **x or z** may be compared directly with its committed mesh bbox — any finding of that kind below is exact;
* a record's **y** may **not** be compared with a mesh bbox, because the mesh's y is the warped stretch of the same anatomy (the pons mesh spans 30 au of y where the record space spans 15). No finding in this audit claims a y error from a mesh bbox alone. Instead `origin3d.y` and `levels[]` were checked against the `levels.json` anchors and against the level sets of the structures the same record claims to supply.

**Verification tooling actually run** (all read-only): a whole-registry id-resolution pass (every `territory[]` and `supply[]` id resolves — 0 unresolved); an artery-levels ∩ territory-levels test; a syndrome-textual-mention ↔ `supply[]` cross-check; a per-record origin3d-vs-mesh-bbox clearance table; a surface-sampled distance test between each nerve's schematic ellipsoid and its own exit landmark; an independent re-derivation of the `tubeRadius = calibreMm / 2.4` invariant for all twelve courses; and an independent re-measurement of all twelve course anchors (root + landmark) against the records they name. `npm run validate` exits 0 (the data was not touched).

## 2. Summary

| verdict | count |
| --- | --- |
| ok | 3 |
| wrong | 16 |
| suspect | 8 |
| unverifiable-here | 0 |
| **total** | **27** |

| severity | count |
| --- | --- |
| critical | 1 |
| major | 9 |
| minor | 17 |

| verdict × severity | critical | major | minor |
| --- | --- | --- | --- |
| wrong | 1 | 7 | 8 |
| suspect | 0 | 2 | 6 |
| ok | 0 | 0 | 3 |

Per record: **vessels** — MCA (2 findings, includes the single critical), basilar (2), PComA (1), AICA (1), SCA (2), PCA (1), ICA (2), PICA (1), anterior choroidal (1), posterior medial choroidal (2). **Nerves** — CN II (1), CN IV (2), CN V (2), CN VI (1), CN III (1), CN VII (1), plus 3 `ok` sweeps (the twelve foramina, the twelve root/landmark anchors, CN XI's two-root description) covering all twelve.

## 3. Findings

### 3.1 Critical

**VN-001 — `vasc-middle-cerebral-artery.supply` contains `syn-lateral-medullary` (wrong, critical).**
The MCA is credited with the lateral medullary (Wallenberg) syndrome. That card's own `vascularTerritory` reads *"Posterior inferior cerebellar artery (PICA), usually occluded at its vertebral origin; occasionally the vertebral artery directly"*, and all nine of its `structures[]` are medullary (`nuc-spinal-trigeminal`, `nuc-ambiguus`, `nuc-dmv`, `nuc-solitarius-caudal`, `tract-icp`, `tract-spinothalamic`, `nuc-medullary-reticular`, …). The MCA's own `territory[]` contains no medullary structure, and the card text never mentions the MCA — the record's `contextNote` asserts the card *"cites the MCA among its alternatives"*, which is false. Because `load.ts` builds a **reverse** index (`syndromesBySupply` → `arteriesForSyndrome`), opening the Wallenberg card highlights the middle cerebral artery. Fix: delete the entry. This is the exact defect class the dispatch called critical.

### 3.2 Major

**VN-002 — `vasc-middle-cerebral-artery.supply` contains `syn-parkinson` (wrong, major).** `syn-parkinson.vascularTerritory` is *"None (degenerative alpha-synucleinopathy, not vascular)"*; its structures are `nuc-snc`/`nuc-snr`, whose own `bloodSupply` names the PCA/paramedian midbrain perforators. No other vessel declares this card, so the atlas currently teaches that the MCA causes Parkinson's disease. Same fix.

**VN-003 — `vasc-basilar-artery.origin3d` (wrong, major).** `[0, −12, 6]`: z = 6 is **5.3 au = 6.4 mm posterior** to the committed trunk's most posterior point (`vasc-basilar-artery.glb` bbox z `[11.3, 16.8]`), i.e. the anchor sits inside the pons rather than in the prepontine cistern its own `function` text describes. z is uniform-scaled, so the comparison is exact. Suggested: z ≈ 14. The same posterior bias recurs on the AICA (z = −4 vs mesh z `[−5.9, 14.2]`) and the PComA (z = 8 vs mesh z `[11.6, 22.3]`).

**VN-004 — `vasc-posterior-communicating-artery.origin3d` (wrong, major).** `[14, 22.5, 8]` is outside its own mesh on **both** uniform axes: the mesh spans x `[6.0, 10.8]` (record 3.2 au too lateral) and z `[11.6, 22.3]` (record 3.6 au too posterior). Suggested `[8, 7, 17]`. The y value is left alone deliberately: it is warped, and 22.5 correctly centres the record inside its own level span (`lvl-midbrain-sc` +14 … `lvl-thalamus-mid` +28).

**VN-006 — `vasc-superior-cerebellar-artery.levels` (wrong, major).** The record's levels are `[lvl-midbrain-ic +8, lvl-midbrain-sc +14, lvl-post-comm +19]`, but five of its twelve `territory[]` entries live nowhere near them: `ctx-cerebellum`, `surf-vermis` (levels `lvl-olivary … lvl-pons-rostral`), `nuc-dentate`, `nuc-interposed`, `nuc-fastigial` (levels `lvl-pontomedullary … lvl-pons-middle`). Not one of those level ids appears in the artery's own `levels[]`, so the SCA vanishes from every level on which its lesion is taught — including the dentate nucleus its own `clinical[0]` names. Suggested `[lvl-pons-middle, lvl-pons-rostral, lvl-midbrain-ic, lvl-midbrain-sc]`.

**VN-007 — `vasc-posterior-medial-choroidal-artery.levels` (wrong, major).** `territory[]` includes `vent-lateral-ventricle-body` (levels `lvl-thalamus-rostral`, `lvl-tel-thalamostriate`, `lvl-tel-basal-ganglia`) while the artery's levels stop at `lvl-thalamus-mid`: the record claims to supply the ventricle body and simultaneously declares itself invisible there. Its own `function` text (*"the lateral posterior choroidal artery … supplies the choroid plexus of the body"*) makes this a self-contradiction.

**VN-009 — `vasc-internal-carotid-artery.connections.efferent` (wrong, major).** *"medial and lateral lenticulostriate perforators … arise from the proximal segments"* attributes both groups to the carotid. The lenticulostriate record says the lateral group comes from the **MCA M1** and the medial group (Heubner) from the **ACA A1** — the single most common student error this atlas exists to prevent.

**VN-016 — `nrv-cn4-trochlear` radius (wrong, major).** The repository's own invariant is `r_au = d_mm / 2.4` at 1 au = 1.2 mm (`docs/CONTENT_INVENTORY.md` p.58, `docs/SWARM_V14_PLAN.md` §3.4, and the gate `scripts/verify/cranial-nerve-courses.mjs`). Applied to the twelve declared calibres 1.7/4.0/3.0/**1.0**/4.5/1.9/1.9/2.8/2.0/2.4/1.5/1.8 mm it reproduces the stored radii for **eleven** courses; CN IV stores **0.42 au where the formula gives 0.83 au**, a factor of two. The record's own note asserts the identity it breaks (*"1.0 mm calibre … gives tubeRadius 0.42 au"*). External check: high-resolution 3D MR measures the cisternal trochlear nerve at a mean **0.54 mm** diameter ([AJNR 2010, PMC7963936](https://pmc.ncbi.nlm.nih.gov/articles/PMC7963936/)), so the *rendered* 1.01 mm is already generous — the integrator should fix the label/field pair rather than blindly double the tube. Flagged major because the dispatch asked specifically whether a uniform radius across the twelve is a defect: it is not (spread 0.42→1.88 au is correct in direction), but this one conversion is internally inconsistent.

**VN-018 — `nrv-cn5-trigeminal.foramen` (suspect, major).** The machine-readable foramen is `"foramen ovale"` alone, while the same record's course sentence correctly names all three openings (V1 superior orbital fissure, V2 foramen rotundum, V3 foramen ovale). CN V is the only nerve with three skull-base exits, so the single-valued field answers a three-part question with one third of the answer and any foramen-keyed view files CN V with the mandibular division. The gate only requires a non-empty substring, so it passes.

**VN-019 — `nrv-cn2-optic` course waypoints vs the committed optic-nerve meshes (wrong, major).** `tract-optic-nerve-{l,r}.glb` span x `[0.4, 27.0]`/`[−26.9, −0.4]`, y `[−5.1, 16.2]`, z `[16.7, 63.2]`. All five CN II waypoints are inside in x and z, but the meshes **top out at y = 16.2** while the chain runs up to y = 23.5 — it leaves the committed geometry after its first point and floats ~8 mm above the real nerve at its anterior end, and the `anchorNote` that claims the chain *"follows the committed optic-nerve mesh"* quantifies the agreement on z only. The discrepancy is inherited from the source record: `tract-optic-nerve.waypoints[0] = [11, 19, 33]`, which its own baked meshes contradict by ~2.8 au in y. **This needs no new mesh** (frozen by `verify:anatomy` 27/27) — the authored numbers are what move.

### 3.3 Minor — vessels

* **VN-005** AICA `origin3d.z = −4` sits at the most posterior point of an element that spans z `[−5.9, 14.2]`, 18 au from the basilar origin its own afferent text names (wrong, minor).
* **VN-008** basilar `levels[]` stops at `lvl-midbrain-ic` while `territory[]` names `surf-interpeduncular-fossa` (registered at `lvl-midbrain-sc`); the record's own function text puts the basilar at the fossa (suspect, minor).
* **VN-010** anterior choroidal `supply` includes `syn-hemiballismus`, but its own `territory[]` and connections never mention the subthalamic nucleus; the card lists the PComA first and the AChA second, so the entry rests on the card's hedge rather than on this record (suspect, minor).
* **VN-011** PICA's efferent list names the 3rd and 4th of the five standard segments (*"tonsillomedullary and telovelotonsillar"*) while its afferent text describes the 1st/2nd (the olive-level origin) — the anterior and lateral medullary segments, which give the medullary perforators the record attributes to the tonsillomedullary segment, are missing (suspect, minor). [Radiopaedia](https://radiopaedia.org/articles/posterior-inferior-cerebellar-artery), [Lister et al., PubMed 7070615](https://pubmed.ncbi.nlm.nih.gov/7070615/).
* **VN-012** SCA names the trigeminal nerve in its `bloodSupply` and its clinical text but does not carry `surf-cn5-exit` in `territory[]`, although the basilar record does carry `surf-interpeduncular-fossa`, so the convention exists (suspect, minor). Same gap for PICA↔`surf-cn9-exit`, MCA↔`surf-cn6-exit`.
* **VN-013** PCA synonyms are *"P1/P2/P3 segments"* — the PCA has **four** segments (P1 precommunicating, P2 ambient, P3 quadrigeminal, P4 cortical), and the record's own clinical text describes the calcarine (P3/P4) branch (wrong, minor). The MCA's analogue correctly reads M1–M4.
* **VN-014** `refs` duplicated verbatim on the ICA and MCA (wrong, minor).
* **VN-015** the record named *"Posterior medial choroidal artery"* carries *"lateral posterior choroidal artery"* among its **synonyms** although its own text treats the lateral artery as a separate vessel with a separate origin and target — which is also what produces VN-007's level gap (wrong, minor).

### 3.4 Minor — nerves

* **VN-017** `surf-cn4-exit` is registered at `[lvl-pons-rostral +2, lvl-midbrain-ic +8]` although its `origin3d.y = 7.5` is the inferior-colliculus level (`lvl-midbrain-ic`); no midbrain structure carries `lvl-pons-rostral`, so a CN IV rootlet marker appears on a pontine section where the nerve does not exist (wrong, minor). The *course* record's two-level set is defensible (its cisternal chain does descend to the pontomesencephalic junction); the *landmark* is a point.
* **VN-020** CN VI's schematic ellipsoid spans z `[3, 7]` while the committed pons reaches z = 16.7 ventrally and the basilar trunk occupies z `[11.3, 16.8]` — the body sits inside the pons rather than in the prepontine cistern beside the artery that its own `bloodSupply` says compresses it (wrong, minor). Its own course waypoints already run at z ≈ 11–13, so the schematic and the course disagree with each other.
* **VN-021** CN V's contextNote claims the ellipsoid *"overlaps at its anterior end"* the landmark `surf-cn5-exit`. It does not: the landmark is inside the ellipsoid's bounding box but outside the ellipsoid (which reaches only z = 3.5; the landmark sits at z = 6). Surface-sampled distance from each nerve's schematic to its own landmark across the ten landmarked nerves: **CN V 2.90 au (3.5 mm), CN VII 2.09, CN IV 1.97, CN III 1.88, CN VI 1.81, CN IX 1.27, CN X 1.09, CN XII 0.26, CN XI 0.18, CN VIII 0.08** — CN V is the worst of the ten and the only one whose prose asserts contact (suspect, minor). Moving it to `[6, −8.5, 4]` makes the claim true.
* **VN-022** CN III's note places the pupillomotor fibres on the *"superficial dorsomedial surface"*; the depth rule (parasympathetic superficial, somatic deep) is the load-bearing fact and is correct, but the compass direction is contested — the standard description is superomedial ([StatPearls, CN III](https://www.ncbi.nlm.nih.gov/books/NBK537126/)) (suspect, minor). The sentence is repeated verbatim in the CN III course record and the PComA card.
* **VN-023** CN VII (and CN V) place a motor nucleus under `connections.afferent` while the same nucleus's fibres appear under `efferent`; seven of the twelve records state explicitly that the nerve carries no afferents, so the heading is being used as "central structures linked" — a schema-semantics defect the dispatch's own rule ("an efferent listed as afferent is a defect") catches (suspect, minor).
* **VN-024** `nuc-trigeminal-motor` (CN V's named origin and course anchor) declares `laterality: "paired"` with `origin3d.x = 4` while its committed mesh `nuc-trigeminal-motor.glb` spans x `[−5.8, 5.9]` — a single bilateral body (`scripts/anatomy-recipes/nuclei.mjs` mirrors only when `laterality === 'paired'`), so the runtime draws it at +x and −x and renders four half-nuclei instead of two. `nuc-principal-sensory-v`, `nuc-vestibular-medial`, `nuc-cochlear-ventral` share the pattern; `nuc-spinal-trigeminal` uses the opposite convention (wrong, minor).

### 3.5 Verified `ok`

* **VN-025** CN XI: correctly *two roots with two different origins and two different foramina* — branchial motor from the nucleus ambiguus to the larynx via the vagus/recurrent laryngeal nerve, somatic motor from the C1–C5/6 anterior horn through the **foramen magnum** to sternocleidomastoid and trapezius, with the common trunk through the jugular foramen. Confirmed against [StatPearls, CN XI](https://www.ncbi.nlm.nih.gov/books/NBK507722/). CN I is likewise correctly a **central tract** (fila → cribriform plate → bulb → tract, no thalamic relay), and CN VII is correctly **mixed** with its nervus intermedius components.
* **VN-026** all twelve `foramen` values are the correct skull-base openings, with CN IX correctly in the **pars nervosa** and CN X/XI in the **pars vascularis** of the jugular foramen. No nerve is routed through a wrong opening. The only multi-foramen nerve is reported as VN-018.
* **VN-027** all twelve courses **do** start on their own committed root and **do** carry their own exit landmark as a literal waypoint — independently re-measured, not read from the gate: CN III `[0,14,−4]`=`nuc-oculomotor.origin3d` and `[2,9.5,8.5]`=`surf-cn3-exit` (0.000 au), CN IV `[0,8,−5]`/`[1.5,7.5,−8]`, CN V `[4,−8,4]`/`[7,−8,6]`, CN VI `[1.5,−18,−4]`/`[2.5,−24,7.5]`, CN VII `[4,−19,−2]`/`[6.5,−23,−3]`, CN VIII root `[3.5,−14,−5.5]`/`[6.8,−22,−4.5]`, CN IX `[3.5,−31,−4]`/`[5,−31,4.5]`, CN X `[2,−32,−7]`/`[5,−34,4.5]`, CN XI `[3.5,−31,−4]`/`[6,−43,2]`, CN XII `[0,−31,−4]`/`[3.5,−32,6.5]` — all exact. CN I legitimately has no landmark (its chain *ends* on its own `origin3d`), CN II anchors on `tract-optic-nerve`'s committed waypoints (reported in VN-019). Laterality is uniform (+x chain rendered mirrored for the 11 paired nerves) and consistent with the paired GLB meshes; every waypoint lies inside `CLIP_BOUNDS`. Recorded as `ok` so the integrator can see the verified half of the position check alongside the failures.

## 4. Explicit statement of what did *not* turn up

The dispatch named several specific defects as the ones to hunt. They were looked for and **not** found; recording the negative result matters as much as the findings:

* **no artery claims a territory outside its own system** other than VN-001/VN-002 (the `supply[]` failures). The AICA record does **not** claim the medial medulla; the PICA record does **not** claim the lateral pons; the SCA does not claim the medulla. Every `territory[]` id resolves, and the artery-by-artery territory audit matches the Blumenfeld/Patten/Fix conventions the records cite (ICA trunk → MCA+ACA+striatum; ACA → medial surface/leg/SMA/callosum/Heubner; MCA → lateral surface+insula+deep perforators; PCA → occipital + medial temporal + posterior thalamus + colliculi; SCA → superior vermis/hemisphere + dentate/interposed/fastigial + SCP; AICA → MCP + flocculus + anteroinferior hemisphere + labyrinth; PICA → inferior vermis/hemisphere + dorsolateral medulla; PComA → premammillary/tuberothalamic perforators; AChA → capsular triad + uncus/amygdala/hippocampus + temporal-horn plexus; posterior choroidal → plexus + pulvinar/MGN/habenula).
* **no wrong skull-base opening** (VN-026) and **no wrong laterality** for any nerve or landmark (all twelve paired on +x with the mirror convention).
* **no uniform radius across the twelve** — the spread 0.42 → 1.88 au is a real conversion of real calibres and is non-uniform exactly where the anatomy is non-uniform; only CN IV's declaration is internally inconsistent (VN-016).
* **no `supply[]` id that fails to resolve** anywhere in the 14 records, and no syndrome card whose named structures fail to resolve (all 26 checked).
* **the plates carry no vessel labels at all.** `plate-coronal-midbrain.svg` (CN III rootlets, correctly at the medial crus edge beside the interpeduncular fossa), `plate-midbrain-sc.svg` (CN III rootlets, correctly citing the exit between the PCA and SCA), `plate-midbrain-ic.svg` (CN IV rootlets + trochlear nucleus, correct level and laterality), `plate-olivary.svg` (CN IX rootlets + hypoglossal nucleus) were the only plate facts inside this area and they are correct; the 15 manifests and their `data-structure` anchors are otherwise the plate auditor's scope and were not re-audited here.

## 5. Notes for the integrator

1. **Nothing in this file requires a different mesh.** Every position finding is a record-field correction; `origin3d`, `size3d`, `levels[]`, `supply[]`, `synonyms` and prose are the fields that move. The two frozen facts to respect are `verify:anatomy` 27/27 and the y-warp (do not "fix" a record's `origin3d.y` to make it match a mesh bbox — the mesh y is warped, the record y is the level anchor).
2. **The three level findings (VN-006, VN-007, VN-008) are one class** and can be re-checked mechanically after the fix with the test described in §1: for every vessel, `artery.levels ∩ (union of its territory records' levels) ≠ ∅`. Before the fix that test fails on exactly three records; after it, on none.
3. **VN-016 needs a decision, not a blind edit.** Doubling `tubeRadius` to satisfy `r = d/2.4` makes the thinnest cranial nerve 1.9 mm thick, which is worse anatomy than the current 1.0 mm. The defensible repair is to keep the rendered size and correct the declared value (`calibreMm` 0.5 mm with a note that the field is the cisternal radius for this one course), or to change the invariant to `r = d/2.4` with `d` re-stated per nerve — but the gate's expected table (`scripts/verify/cranial-nerve-courses.mjs`) must be changed in the same commit either way.
4. **Findings VN-010, VN-011, VN-012, VN-018, VN-021, VN-022, VN-023, VN-024 are `suspect` by design.** Each carries a concrete basis and a concrete repair, but none can be closed as `wrong` from the repository + standard references alone; they should be resolved deliberately rather than deleted.
