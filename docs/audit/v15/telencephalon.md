# T3 — Scientific audit: telencephalon

**Run** `run-mtze6lyq-t83x` · **Task** `audit-telencephalon` (builder) · **Plan of record** `PLAN-run-mtze6lyq-t83x.md` §T3
**Output** `docs/audit/v15/telencephalon.findings.json` (machine-readable) + this file.
**No data file was edited.** Auditors do not edit data; only the integrator writes corrections.

---

## 1. What was audited, and how

| | |
| --- | --- |
| Records | **71** structure records across 9 files: `telencephalon-cortex.json` (10), `telencephalon-cortical-areas.json` (12), `telencephalon-somatotopy.json` (16), `telencephalon-basal-ganglia.json` (10), `telencephalon-limbic.json` (6), `telencephalon-hippocampal-subfields.json` (4), `telencephalon-white-matter.json` (8), `telencephalon-optic-pathway.json` (3), `telencephalon-cranial-nerves.json` (2) |
| Geometry cross-check | `src/assets/anatomy/anatomy-manifest.json` (138 parts) and the committed GLBs read directly: `ctx-hemisphere-l` (40,388 verts), `ctx-putamen-l`, `ctx-globus-pallidus-l`, `ctx-caudate-l`, `ctx-hippocampus-l`, `ctx-amygdala-l`, `ctx-corpus-callosum`, `ctx-fornix-l`, `tel-lateral-ventricle-l` |
| Fields | `name`, `synonyms`, `function`, `contextNote`, `connections.afferent/efferent`, `bloodSupply`, `clinical[]`, `origin3d`, `size3d`, `laterality`, `levels`, `anchors`, `region`/`subdivision`, registry row in `taxonomy.json` |
| Position method | every `origin3d` measured, never eyeballed: nearest-vertex projection onto the committed mesh with a signed test against the vertex normal; for the deep structures also ray-parity inside/outside tests along six directions and coronal bounding boxes at each level; somatotopy ordering tested as a monotone sequence |
| Left to other auditors | plate/SVG labels (tracts-plates auditor); every `tracts.json` row except `tract-optic-radiation`; the syndrome cards except where a telencephalic structure is named |

**What this audit cannot establish.** It is a model-based review of authored text and authored
coordinates, cross-checked against other authored records and the committed (frozen) meshes. Nothing here
was validated against imaging, a specimen, or a segmented scan. Where a numerical claim had no
internal or textbook basis it is filed as `unverifiable-here`, never as `wrong`. The one web citation used
is marked `basisKind: external` in the JSON (the optic-nerve axon-count/macular-fibre figure).

**Freezing respected.** No GLB was re-baked and no mesh was changed; every `origin3d` finding is about the
record's own marker, which drives the 3D marker, the tree and the plate anchors, not baked geometry. Every
suggested coordinate is inside `CLIP_BOUNDS` (x[−58,58] y[−55,116] z[−76,72]).

---

## 2. Summary — counts by verdict and severity

| verdict | critical | major | minor | Σ |
| --- | ---: | ---: | ---: | ---: |
| `wrong` | 0 | 4 | 3 | **7** |
| `suspect` | 0 | 1 | 10 | **11** |
| `unverifiable-here` | 0 | 0 | 2 | **2** |
| `ok` (findings) | 0 | 0 | 0 | **0** |
| **Σ** | **0** | **5** | **15** | **20** |

| severity | count |
| --- | ---: |
| critical | 0 |
| major | 5 |
| minor | 15 |

**Best of the rest (verified sound, no finding raised).** 11 `verifiedClaims` entries in the JSON cover,
among others: the whole somatotopic ordering on both strips; the Brodmann assignments of V1/V2/A1/M1/S1/
premotor/SMA/FEF/entorhinal; the direction of the trisynaptic circuit and of the ventral striatopallidal
loop across five records; the putamen/globus pallidus/internal-capsule/insula lateral relations; the
claustrum between putamen and insula; the callosal parts, the internal capsule limbs and the corona
radiata; the olfactory and optic-nerve courses; and the registry/laterality census (**0** of 195
`origin3d`-bearing records contradicts its `laterality` sign, matching the architect's C5 — no padding
findings were written for it).

---

## 3. The five major findings

1. **`ctx-m1.origin3d` = [43.2, 66.5, 19] is 23.7 au from its own somatotopy strip** (`wrong`, major).
   `ctx-m1` is the taxonomy parent of `ctx-m1-toe … ctx-m1-larynx`, the eight measured precentral segments
   (each on a `ctx-hemisphere-l` vertex, residual ≤ 0.01 au). The parent's z = 19 is 22.4 au anterior to the
   strip's anterior limit (z = −3.51); the marker volume (z 12…26) and every child patch (z −12.8…−3.5) are
   disjoint. Offset from the strip centroid: 38.2 au = 45.9 mm.
2. **`ctx-s1.origin3d` = [42.4, 68.2, −1.7] is 13.5 au from its own strip** (`wrong`, major), and it inverts
   the one ordering the atlas asserts — the S1 anchor is anterior to *every* M1 child, while all eight S1
   segments are correctly 4.23–10.23 au **behind** their M1 counterparts in z (total offset 4.45–10.53 au).
3. **`ctx-sma.origin3d` = [6, 82.8, 22.6]** (`wrong`, major). Its own function text puts it "in front of the
   medial M1 foot representation"; measured, it is 27.1 au below and 34.5 au (41 mm) from `ctx-m1-toe`, and
   30.9 au below the measured medial apex (y = 113.6).
4. **`tract-optic-nerve.levels` reaches y = 48 while its own waypoints stop at y = 23.5** (`wrong`, major) —
   the level chip opens a plane 24.5 au = 29.4 mm above the course. Same defect class as the architect's D2.
5. **`tract-optic-radiation.levels` claims y = 48 and y = 78 against waypoints that span y 14…30**
   (`suspect`, major) while the record's stated target is V1 at the calcarine cortex. Architect D2,
   re-measured from the file and confirmed; the choice (extend the course, or drop the two levels) is the
   integrator's.

## 4. The minor findings, by theme

**Nomenclature** — the eight `ctx-s1-*` anchors call the S1 strip "precentral gyrus" (copy-paste from the
M1 texts; the geometry is right, only the label is wrong) · `ctx-a2` equates "A2" with both Brodmann 42
(Heschl's gyrus) and the planum temporale, whose 2.1 au-away surface record already exists · `ctx-broca`
presents "Brodmann areas 44 **and** 45" as an identity · `nuc-ca4`'s "CA4/endfolium" name is retained with
its contested status unstated · `nuc-caudate-head` "filling the wall of the frontal horn" should be "the
lateral wall".

**Function / connections** — `nuc-ca2-ca3` lumps entorhinal **layer II** with hilar mossy cells as one
CA2+CA3 afferent (the sibling records state the layers correctly) · the pallidal records attribute the
ventral/posterior pallidum to the anterior choroidal artery, which the same file attributes to the putamen
and which the textbook gives to the posterior limb and optic radiation.

**Position (measured, minor)** — `ctx-v2` sits 5.56 au **inside** the ribbon while the other ten
ribbon-anchored areas sit within 1.2 au · `surf-planum-temporale` floats 2.41 au **outside** the ribbon ·
`nuc-ventral-pallidum` [20.5, 23, 14] is outside both the pallidal and the putamen cast although its own
note says it was "placed on the baked globus-pallidus cast" · `tract-fimbria` [22, 21, −2] is 6.31 au from
the hippocampal surface it is defined as fringing · `ctx-optic-chiasm` [0, 23.5, 23.5] is 6.7 au above the
committed chiasm meshes it names.

**Text vs its own number** — `nuc-dentate-gyrus`'s note quotes "(x ≈ 21.5, y ≈ 12, z ≈ −9)" against the
committed `origin3d` [16, 14, −2] (the committed value is the right one; fix the note) ·
`ctx-m1-toe … ctx-s1-larynx` all carry the same four-level set, so a segment whose own extent is y 107…113
offers a chip at y = 48.

**Open questions, not corrections** — `tract-optic-nerve` and `tract-optic-tract` are the only two of the
71 records with no `connections` object (do the two optic records have the correct shape for the contract?);
the "macula ≈ two-thirds of the axons" figure has no basis I could establish here (external search gives
1.023 million axons mean, with the macular share reported anywhere from a large fraction to ~90 % of the
papillomacular bundle).

---

## 5. Self-consistency of this deliverable

* Every finding carries the 12 required keys; `verdict ∈ {ok, wrong, suspect, unverifiable-here}` and
  `severity ∈ {critical, major, minor}`; ids `T3-0001 … T3-0020` are unique.
* The tables above are re-derived from `findings` by `.dsh-scratch/tel/check-findings.mjs`, which prints
  `wrong 7 · suspect 11 · unverifiable-here 2`, `major 5 · minor 15`, `findings 20` — identical to §2.
* The evidence contract's parse check (`node -e "…findings.length…"`) prints `findings 20` and exits 0, and
  `npm run validate` still prints `✔ Validation PASSED — 0 errors, 0 warning(s)` (no data file touched).
