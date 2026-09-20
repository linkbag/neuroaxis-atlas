# Brainstem scientific audit — midbrain, pons, medulla (and the cerebellum records filed with them)

**Task:** `audit-brainstem` (T2) · **Run:** `run-mtze6lyq-t83x` · **Auditor:** builder agent, read-only over `src/**`
**Machine-readable findings:** `docs/audit/v15/brainstem.findings.json` (68 findings)
**Records audited:** 80 — `src/data/structures/midbrain.json` (21), `pons.json` (27), `medulla.json` (32, including the
5 cerebellum records `ctx-cerebellum`, `surf-vermis`, `nuc-dentate`, `nuc-interposed`, `nuc-fastigial`; plan §C6)
**No data file was modified.** Only the two files of this task's write scope were created.

---

## 1. Method (what was actually read, and how positions were judged)

* Every one of the 80 records was read in full: `id, name, synonyms, region, subdivision, kind, laterality, function,
  connections, bloodSupply, clinical, levels, origin3d, size3d, contextNote, refs`.
* Cross-read against: `taxonomy.json` (region/subdivision/laterality per id), `levels.json` (17 anchors),
  `plates.json` (15 manifests, 10 with a `levelId` and 360 labelled slugs), `tracts.json` (23 tracts, incl. `tract-mlf`,
  `tract-scp`, `tract-anterior-spinocerebellar`, `tract-central-tegmental`, `tract-hypothalamospinal`),
  `anatomy-manifest.json` (138 parts: bbox + centroid), the 26 syndrome cards, and
  `src/geometry/curves.ts` (`NERVE_COURSES` — the twelve nerve courses are anchored on the `surf-cn*-exit`
  landmarks and on nucleus `origin3d`, so a landmark error is not a cosmetic error).
* **Position method.** For each record that owns a committed GLB the marker was compared with that mesh's bbox and
  centroid. For the three envelope meshes and the inferior olive the test was stronger: the committed triangle soup was
  parsed out of the GLB and the point tested by ray parity (Möller–Trumbore, unit rays in +x/+y/+z, majority of three),
  plus the distance to the nearest surface vertex. That is what turns "the landmark looks medial" into
  "the CN X landmark is **inside** the inferior olive's own mesh".
* **Coordinate frame, established from the meshes rather than assumed:** `x` mediolateral (paired records use `x > 0`),
  `y` the `levels.json` transverse axis (rostral positive), `z` dorsoventral with **dorsal negative**
  (colliculus mesh `z −10.4…−5.6`, crus cerebri marker `z +9`, fourth-ventricle mesh `z −19.7…−0.7`).
  Dorsoventral relations inside a level are therefore carried by `z`, and rostrocaudal relations by `y`.
* **What was *not* treated as a defect** (measured during this audit, per plan §C1/C4/C5):
  `size3d ≪` own mesh bbox is the documented marker fallback and is not reported; the 30 records with no
  `origin3d`/`size3d` (12 `nrv-*` nerves, 14 `vasc-*` vessels and 4 context/surface records) are
  not reported as "missing geometry"; there are **0** laterality/sign contradictions vs `origin3d`, **0** dangling
  id-shaped references inside these 80 records, and **80/80** records agree with their `taxonomy.json` row on
  region, subdivision and laterality.
* The browser lane cannot run in this sandbox, so **no finding here rests on a rendered pixel**. Nothing was
  validated against imaging or a specimen.

## 2. Summary table (counts as printed from `brainstem.findings.json`)

| verdict | critical | major | minor | total |
| --- | --- | --- | --- | --- |
| wrong | 0 | 6 | 5 | **11** |
| suspect | 0 | 0 | 28 | **28** |
| unverifiable-here | 0 | 0 | 1 | **1** |
| ok | 0 | 0 | 28 | **28** |
| **total** | **0** | **6** | **62** | **68** |

`ok` rows carry severity `minor` because the schema requires a severity on every row; they are verifications, not
defects (they include every positional exemplar the dispatch brief demanded — see §4). **No `critical` row was found in
the brainstem set**: every incorrect claim located here is a coordinate, a level set or a local text defect, not a wrong
localising sign. The 26 syndrome cards' own laterality/artery claims were cross-read but belong to T6.

## 3. The six major findings (all `wrong`, all evidenced against frozen geometry)

| id | record · field | what the data says | what it should say | basis |
| --- | --- | --- | --- | --- |
| 001 | `nuc-snc.origin3d` | `[6.5, 10.5, 2.5]` | `z ≈ 8.5` | its own GLB occupies `z 7.4…9.4` — the marker is 4.9 au (≈6 mm) **dorsal** of its own nigra |
| 002 | `nuc-snr.origin3d` | `[6.5, 9.5, 3.5]` | `z ≈ 9.0` | its own GLB occupies `z 7.9…9.7` — same defect, 4.4 au |
| 003 | `surf-cn5-exit.origin3d` | `[7, -8, 6]` | ≈ `[15.5, -6, 0]`, the lateral mid-pons surface | the point is **inside** `ctx-pons-surface.glb` (parity 1/1/1, 6.66 au from the nearest surface vertex) while the lateral surface at that level is at `\|x\| = 17.3…17.9`; the CN V course in `curves.ts` is anchored on it |
| 004 | `surf-cn10-exit.origin3d` | `[5, -34, 4.5]` | the post-olivary sulcus, ≈ `[6, -34, 0.5]` | the point is **inside `nuc-inferior-olive-principal.glb`** (parity 1/1/1, 0.39 au from the olive surface); the derived CN X course runs through the olive |
| 005 | `surf-cn9-exit.origin3d` | `[5, -31, 4.5]` | the post-olivary sulcus, ≈ `[6, -31, 0.5]` | rests on the olive's surface (0.42 au) and its course segment passes through the olive (`[4.8,-31,2.9]` is inside, parity 1/1/1); contradicts its own sibling `surf-cn11-exit` (`z = 2`) and `surf-cn12-exit` (`z = 6.5`) |
| 006 | `tract-medial-lemniscus.levels` | 3 anchors (decussation → pontomedullary) | the same 3 **plus** `lvl-pons-caudal`, `lvl-pons-middle`, `lvl-pons-rostral`, `lvl-midbrain-ic`, `lvl-midbrain-sc` | `plates.json` labels this tract at five levels its own `levels` says it is not visible at |

Items 003–005 are the same failure mode — a "surface landmark" placed inside the structure it is named for — and they
propagate into the rendered nerve courses, which is why they are major. `curves.ts` is the integrator's file (plan §C2);
if a landmark moves, the course recipe must be re-run.

## 4. What was verified correct (28 `ok` rows — the brief's own checklist)

Positions, checked against the committed meshes or the sibling records:

* **oculomotor nucleus ventral to the PAG and dorsal to the MLF** (`nuc-oculomotor` mesh `z −5.4…−2.2` vs PAG `z −7.9…−4.1`; MLF waypoint `[1.5,14,−3.5]`) — brainstem-041;
* **trochlear caudal and marginally dorsal to the oculomotor** (`y 6.9…9.0` vs `12.6…15.4`) — 042;
* **abducens in the caudal pons under the facial colliculus** (`z −4` vs landmark `z −6`), and its MLF direction claims agree with `tract-mlf` — 043, 063;
* **facial nucleus ventrolateral, fibres looping dorsomedially around the abducens** (x 4 vs 1.5, z −2 vs −4) — 044;
* **hypoglossal medial and dorsal to the MLF** (x 0 vs 1.2, z −4 vs −3.5) — 045;
* **inferior olive ventrolateral between pyramid and restiform body** (x 5 > pyramid 3, z 3 < pyramid 8, z 3 > ICP −3), medial accessory olive medial/dorsal to it — 046;
* **cerebellum: vermis midline, deep nuclei deep and in the order fastigial < interposed < dentate** (all inside their own meshes, `z ≈ −11` against the vermal surface `z −16.5`) — 047, 048;
* **DMV under the vagal trigone** (0.29 au from the medullary envelope's surface) — 049; **CN XII landmark in the pre-olivary sulcus** (outside the olive, between pyramid and olive) — 050; **CN III and CN IV exit landmarks on their envelope surface** (0.53 / 0.26 au) — 051; **CN VI exit outside the ventral surface, CN VII at the CPA corner anterior to CN VIII** — 052, 053.
* Coherence: **80/80** record↔registry agreement (054) and **0** dangling id references (055).

Clinical/eponym checks that passed: Weber, Benedikt, Claude and Holmes tremor with their PCA/perforator attributions
(056); PPRF horizontal gaze palsy and one-and-a-half syndrome, including which eye keeps which movement (057);
central Horner in Wallenberg (058); the onion-skin pattern and the crossed face/body dissociation (059); the crossed
patterns of Déjerine / Millard-Gubler / Weber with face sparing (060); crossed cerebellar output via the SCP and the
double-cross argument for ipsilateral ataxia (061); the ICP afferent-gateway direction (062); the branchiomotor target
set of the nucleus ambiguus via IX, X and the cranial root of XI (064); fastigial output through the ICP (065).

## 5. The 28 `suspect` rows, by theme

* **Level sets vs `plates.json`** (5): `nuc-pretectal`, `tract-crus-cerebri`, `surf-interpeduncular-fossa`,
  `nuc-mesencephalic-v`/`tract-mesencephalic-v`, `ctx-cerebellum` — each is a level the atlas's own plate labels but the
  record's `levels` omits (or the reverse). One of the two artifacts must move; the plate side is T5's.
* **Laterality semantics** (6): `nuc-oculomotor`, `nuc-trochlear`, `nuc-edinger-westphal`, `nuc-hypoglossal` are all
  `midline` although each is a paired nucleus and each record's own clinical text describes an *ipsilateral* deficit;
  `nuc-area-postrema` is `paired` although its mesh is one midline blob; `ctx-cerebellum` is `midline` although its own
  name and `contextNote` say "two hemispheres plus vermis". **Each row carries the rendering caveat**: the committed
  GLBs of the four CN nuclei are single paramedian blobs, so flipping the flag mirrors one blob into two. The integrator
  may legitimately keep the value and document the convention instead.
* **Region/subdivision filing** (5): the five cerebellum records authored in `medulla.json` (plan D3); the inferior
  vestibular nucleus filed as `pons` although its own levels and clinical text are medullary; the fourth ventricle filed
  as `medulla` although three of its five levels and most of its mesh are pontine; `nuc-pretectal` filed under
  `Tectum`; the spinal trigeminal **tract** filed under `Cranial nerve nuclei` (with `tract-mesencephalic-v`).
* **Function/connection wording or content** (7): the superior colliculus credited with relaying the pupillary light
  reflex (its own pretectal record relays it); the SCP's afferent list omitting the anterior spinocerebellar tract, the
  one cerebellar afferent that enters through it (contradicting the atlas's own `tract-anterior-spinocerebellar`);
  "dental pulp sensation" in the principal sensory nucleus (contradicting its own clinical line); the dorsal cochlear
  nucleus restricted to "high-frequency fibers"; the medullary reticular formation's synonyms collapsing its
  subdivisions; and two local text defects (`nuc-pontine-reticular`'s coma sentence; `nuc-dentate`'s "metronomic
  injury").
* **Text/name defects (wrong, minor)** (5): "tonotopically" for the gracile nucleus; the inverted climbing-fibre
  mechanism in the medial accessory olive's palatal-tremor entry; the misspelling `ambiguityus`; `nuc-area-postrema`'s
  pontomedullary level; `nuc-dmv`'s sensory-decussation level (the last two against their own mesh and against the obex
  position this atlas itself commits).
* **One shared superlative** (1): `surf-cn6-exit` and `surf-cn4-exit` both claim "the longest intracranial subarachnoid
  course of any cranial nerve" — at most one can hold it.

## 6. Filed as `unverifiable-here` (1) and not settled here

* **brainstem-014** — one pattern finding covering 15 records whose `levels` reach **4.4–12.8 au** beyond their own
  frozen mesh (worst: `nuc-ambiguus` 12.2 below, `nuc-fastigial` 12.5 above). For six of them (`nuc-ambiguus`,
  `nuc-vestibular-inferior`, `nuc-vestibular-medial`, `nuc-hypoglossal`, `nuc-spinal-trigeminal`, the three deep
  cerebellar nuclei) standard anatomy supports the *level set* and the mesh looks short — and moving a mesh is out of
  scope here. **No fix is proposed**: trimming a level set on the strength of a mesh that may itself be short would be a
  false correction. The two cases where anatomy does decide are filed separately (012, 013).
* **Not settled:** the medullary somatotopy of the medial lemniscus ("leg lateral, arm medial" in
  `tract-medial-lemniscus` and in `syn-medial-medullary`). Both artifacts agree, so there is no internal contradiction
  to cite, and this auditor will not call a textbook statement wrong on recollection alone.
* **Not settled:** the Nothnagel content — `syn-nothnagel` (PCA collicular + SCA, ipsilateral cerebellar ataxia, no
  sensory loss) and the CN III nerve record in `brainstem-cranial-nerves.json` (*"ipsilateral cerebellar ataxia of the
  limbs plus contralateral hemianesthesia"*) describe different syndromes. **No brainstem record carries Nothnagel**, so
  this could not be read from this file's own set: it is a hand-off to T4 (nerve records) and T6 (cards), not a T2 row.
* **Out of scope, seen but not filed** (a mesh change would be needed): four `midline` CN-nucleus meshes are baked
  off-centre to the left (`nuc-edinger-westphal` spans `x −1.5…−0.3`, `nuc-trochlear` `x −1.1…0.0`), and several
  deep/medullary meshes are shorter than the structure they represent (first bullet above).

## 7. Coverage gaps (no record, no registry row — `suspect`, filed against the nearest owning record)

`nuc-inferior-olive-dorsal` (the dorsal accessory olive — the complex has three parts, two are authored) ·
`nuc-raphe-magnus` / `pallidus` / `obscurus` (named in the PAG and dorsal-raphe records, authored nowhere) ·
the rostral interstitial nucleus of the MLF and the interstitial nucleus of Cajal (named in four records, authored
nowhere) · the subcuneiform nucleus, the inferior salivatory nucleus and the nucleus prepositus hypoglossi appear as
prose only · Jackson syndrome and Raymond–Cestan syndrome are absent from both the cards and the records although the
dispatch brief lists them (the medial medullary card already describes Jackson's pattern under Déjerine's eponym).

## 8. Honest statement of limits

This is a model-based review of authored text and authored coordinates, cross-checked against other authored records,
the plate manifests and the committed mesh geometry (bbox, centroid and — for the envelope and olive meshes —
ray-parity inside/outside tests). It is **not** a source-verified re-derivation, no finding was validated against
imaging or a specimen, and the browser lane cannot run in this sandbox. `verify:anatomy 27/27` is an orchestrator-lane
number and was not reproduced here. Where the evidence did not decide, the verdict is `suspect` or
`unverifiable-here`; nothing was invented, and no data file was touched.
