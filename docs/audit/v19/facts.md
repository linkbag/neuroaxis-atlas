# NeuroAxis v19 — scientific fact-base audit (`audit-facts`)

**Task:** `audit-facts` · run `run-muf4frwh-rz8s` · auditor: Builder (findings-only).
**Product files changed:** none. Outputs: `docs/audit/v19/facts.findings.json` (70 findings) and this report.
**Reproduce:** every measurement below is a command, not an impression — see §9.

---

## 1. Verdict / severity summary

| area | n | ok | wrong | suspect | unverifiable | critical | major | minor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| vessels-nerves | 20 | 6 | 9 | 5 | 0 | 2 | 5 | 13 |
| brainstem | 14 | 5 | 0 | 9 | 0 | 0 | 2 | 12 |
| diencephalon | 10 | 1 | 5 | 4 | 0 | 0 | 1 | 9 |
| syndromes | 8 | 2 | 2 | 4 | 0 | 0 | 2 | 6 |
| telencephalon | 8 | 5 | 2 | 1 | 0 | 0 | 0 | 8 |
| tracts-plates | 10 | 5 | 4 | 1 | 0 | 1 | 2 | 7 |
| **TOTAL** | **70** | **24** | **22** | **24** | **0** | **3** | **12** | **55** |

Per-area counts sum to the findings total (70 = 20+14+10+8+8+10). No finding carries
`verdict: unverifiable-here`, because every item below either matched a shipped source or could be
measured against one; the three items whose basis is my own judgment are marked `judgment` and say so
(`FAC-BS-014`, `FAC-TEL-004`, `FAC-TR-002`'s fix direction).

**Schema note.** Each finding carries all 12 keys named in this run's brief *and* the v15 key
`recordId`, with `recordId === subject` for single-record findings and a list-valued `subject` for
census findings. A reader keyed on either name resolves every finding; only a strict
"exactly 12 keys" equality check would trip, and that check would also reject the v15 key.

**Coverage.** 264 structure records (20 files) · 23 tracts · 26 syndrome cards · 15 plate manifests +
15 SVGs · 12 nerve courses (`src/geometry/curves.ts`) · 39 authored vessel courses + 4 built-in
courses (`src/geometry/vasculature-courses.ts`) · `levels.json`, `taxonomy.json`,
`anatomy-manifest.json` (138 parts), `sectionImages.ts` and `planeGeometry.ts` as the convention
sources. 93 records could be matched to their own committed GLB bbox; 41 of them by marker position.

---

## 2. The three critical findings

| id | subject | what is wrong |
| --- | --- | --- |
| `FAC-VN-001` | `vasc-anterior-communicating-artery.supply[1]` = `"syn-tuberothalamic"` | The ACoA record's own `function` names only hypothalamic/septal/chiasmatic perforators, its `territory[]` contains 0 of the card's 3 structures, and the card's own `vascularTerritory` says the tuberothalamic artery comes from "the P1/posterior communicating junction". Same class as v15's VN-001. |
| `FAC-VN-002` | `vasc-pca-thalamogeniculate-arteries.supply[1]` = `"syn-tuberothalamic"` | The course's own text: "They are the arteries of the Déjérine-Roussy syndrome"; its territory is VPL/pulvinar/MGN/LGN/optic radiation/atrium - 0/3 of the tuberothalamic card's structures. |
| `FAC-TR-001` | `plate-thalamus-mid` orientation frame | The frame labels the TOP edge `A`, but the plate's own shapes place the most-posterior region (`nuc-pulvinar`, z = −5.5) at cy = 244 and the most-anterior (`nuc-ventromedial`, z = +6.0) at cy = 588: the drawing is anterior-DOWN. The frame contradicts the geometry it sits on (corr(SVG y, canonical z) = +0.79 over 48 shapes). |

---

## 3. Nomenclature (names, synonyms, identities)

* **14 synonym/name collisions** were found by scanning every record's `name` + `synonyms[]`
  (structures + tracts + taxonomy). Five are genuine defects, filed individually:
  `ctx-lenticular-nucleus` claims `"putamen"`/`"globus pallidus"` (`FAC-DI-001`);
  `ctx-caudate-nucleus` claims `"caudate head"`/`"caudate body"` (`FAC-DI-002`);
  `ctx-internal-capsule` claims the three capsular segments (`FAC-DI-003`);
  `nuc-ventral-striatum` and `nuc-accumbens` claim each other's identity, including `"NAc"`
  (`FAC-DI-004`); `ctx-a2` claims `"planum temporale"` while `surf-planum-temporale` exists
  (`FAC-TEL-002`). The taxonomy row of `vasc-lenticulostriate-arteries` additionally claims both v18
  group names (`FAC-VN-019`).
* **Duplicate identities for one structure** (three pairs, all filed): optic chiasm
  (`ctx-optic-chiasm` + `surf-optic-chiasm`, identical `origin3d` [0,14.5,19]) `FAC-DI-005`;
  optic nerve (`nrv-cn2-optic` + `tract-optic-nerve`, same synonyms, the tract record has no
  `bloodSupply`) `FAC-DI-006`; pineal (`nuc-pineal-gland` + `ctx-pineal`, anchors 5.9 au apart)
  `FAC-DI-007`.
* **Midline-vs-paired contract.** Four cranial-nerve nuclei are registered `midline`
  (`nuc-hypoglossal`, `nuc-oculomotor`, `nuc-trochlear`, `nuc-edinger-westphal`) against fourteen
  paired CN nuclei; `nuc-area-postrema` goes the other way. Because `SceneLayers.tsx:784` mirrors only
  `paired` records, this decides whether one body or two are drawn (`FAC-BS-001…005`). v15 filed these
  as `brainstem-015…019` and rejected them for cast reasons **without** adding the documented
  exception, so the defect persists with a stronger consequence now that v17 mirrors twins and four
  syndrome cards claim *ipsilateral* CN III deficits on a midline nucleus.
* **TA/FMA checks that passed:** CN foramina for ten of the twelve nerves (`FAC-VN-015`), the
  somatotopy segment names and their homuncular order (`FAC-TEL-003`), the hippocampal subfield names
  including the honest "historically labelled CA4" (`FAC-TEL-005`).

---

## 4. Clinical and vascular attribution (highest-risk class)

**4a. Artery ↔ syndrome ↔ territory, all 40 links measured.** `supply[]` is meant to be the clinical
face of `territory[]`. Measuring every `artery.supply[card]` against that artery's `territory[]`:

| artery → card | card structures present in the artery's territory |
| --- | --- |
| `vasc-anterior-communicating-artery` → `syn-tuberothalamic` | **0/3** (`FAC-VN-001`, critical) |
| `vasc-pca-thalamogeniculate-arteries` → `syn-tuberothalamic` | **0/3** (`FAC-VN-002`, critical) |
| `vasc-vertebral-artery` → `syn-medial-medullary` | **0/3** (ASA stand-in, `FAC-VN-006`) |
| `vasc-vertebral-artery` → `syn-central-horner` | **0/2** |
| `vasc-basilar-artery` → `syn-peduncular-hallucinosis` | **0/4** |
| `vasc-{ica,aca,acoa,pcoa,pca}` → `syn-hypothalamic` | **0/4** each (no artery lists the four hypothalamic nuclei) |
| `vasc-posterior-cerebral-artery` → `syn-weber` / `syn-benedikt` / `syn-claude` | **0/3** / **0/4** / **0/4** |
| `vasc-anterior-choroidal-artery` → `syn-hemiballismus` | **0/1** (`FAC-VN-005`, the STN record *does* name the AChA) |
| `vasc-vertebral-artery` → `syn-lateral-medullary` | 7/9; PICA 8/9; AICA → `syn-lateral-pontine` 12/13; basilar → locked-in 4/4 |
| `vasc-posterior-communicating-artery` → `syn-tuberothalamic`; PCA → `syn-dejerine-roussy`, `syn-percheron`, `syn-nothnagel`, `syn-parinaud` | 3/3, 2/2, 1/3, 2/4 - correct |

**4b. Syndrome-card integrity.** All 26 cards resolve; every `structures[]` id exists; the four
non-arterial cards (`syn-korsakoff`, `syn-pineal-region`, `syn-cpm`, `syn-parkinson`) are exactly the
documented "None - …" set (`FAC-SYN-006`). Crossed/uncrossed statements were checked card by card
against the decussation responsible (`FAC-SYN-007`). Two card defects stand out:

* `syn-claude.structures[]` contains **`nuc-dentate`** - a cerebellar nucleus that the card's own
  `cause` does not list and that no PCA branch supplies (`FAC-SYN-001`, the only such entry in 26
  cards).
* `syn-foville` omits the corticospinal tract while the classic description (the same refs the card
  cites) includes contralateral hemiplegia (`FAC-SYN-003`).
* `syn-medial-medullary` and the four CN III cards depend on ipsilateral deficits from
  registry-`midline` nuclei (`FAC-SYN-002/005`).

**4c. Course-table integrity.** The built-in `BUILT_IN_VESSEL_COURSES` table carries three `supply[]`
ids that are not cards at all (`lacunar-infarction-internal-capsule`, `striatocapsular-infarction`,
`recurrent-artery-of-heubner-territory-infarction`) - `FAC-VN-004`. The repo's own gate asserts that
every artery `supply[]` id is a real card, but it reads `vasculature.json` only, so the built-in table
is a gate blind spot.

---

## 5. Position and size (1 au = 1.2 mm, x = +patient-left, y = +superior, z = +anterior)

* **Marker vs the record's own committed mesh.** 93 records match a manifest part; **84 markers lie
  inside their own mesh bbox**; 9 do not. Eight are vessel records (`FAC-VN-007`), all displaced
  *upward*:

  | record | `origin3d` | its own mesh bbox | Δ |
  | --- | --- | --- | --- |
  | `vasc-anterior-communicating-artery` | [0,29,25] | y 11.9…12.4 | **+16.6 au = 20.0 mm** |
  | `vasc-posterior-communicating-artery` | [8,22.5,17] | y 5.4…8.2 | +14.3 au = 17.2 mm |
  | `vasc-internal-carotid-artery` | [24,22,26] | y −46.0…12.0 | +10.0 au = 12.0 mm |
  | `vasc-anterior-cerebral-artery` | [8,30,24] | y 10.6…23.1 | +6.9 au |
  | `vasc-superior-cerebellar-artery` | [12,8,−2] | y −4.1…1.8 | +6.2 au |
  | `vasc-anterior-choroidal-artery` | [16,20,12] | y 8.1…15.3 | +4.7 au |
  | `vasc-posterior-cerebral-artery` | [12,16,−2] | y 3.8…13.5 | +2.5 au |
  | `vasc-middle-cerebral-artery` | [26,24,16] | z 18.4…26.5 | −2.4 au (z) |

  GLB-backed records are placed by their baked coordinates (`NucleusMesh.tsx:170-183`), so this is a
  metadata/prose inconsistency today - not a moved pixel. It matters because prose and the audit
  checks key on `origin3d` (and because two vessel records have no mesh at all).
* **Mirrored-record near-midline cluster** (measured, part of `FAC-BS-001`…`005`): eight `paired`
  records sit at |x| ≤ 1.8 au (≤ 2.2 mm) - `nuc-abducens` 1.5, `tract-fasciculus-gracilis` 1.2,
  `nuc-nucleus-gracilis` 1.5, `nuc-solitarius-caudal` 1.5, `nuc-area-postrema` 1.2, `nuc-fastigial`
  1.8, `surf-cn4-exit` 1.5, `surf-facial-colliculus` 1.8 - so each v17 twin overlaps its own authored
  side.
* **`levels[]` vs `origin3d`:** with a 16 au window only two families disagree - the eight
  `ctx-m1-*`/`ctx-s1-*` segments (origin y 94.5-109.9 above the highest anchor, 78) and the
  `nrv-cn1/cn2` records (`FAC-BS-013` carries the tighter v15 `brainstem-014` measurement forward for
  15 brainstem records). `levels.json` is strictly increasing in y.
* **Duplicate anchors:** exactly one pair shares an `origin3d` to the au (`surf-optic-chiasm` and
  `ctx-optic-chiasm`, both [0,14.5,19]) - `FAC-DI-005`.

---

## 6. Plates (15 manifests + 15 SVGs)

| plate | frame letters (extracted with coordinates) | measured anterior direction from its own shapes |
| --- | --- | --- |
| `plate-thalamus-mid` | A top, R left, L right, P bottom | **anterior at the BOTTOM** (corr +0.79) → frame inverted (`FAC-TR-001`, critical) |
| `plate-midbrain-sc`, `-ic` | P top, A bottom, R left, L right | anterior at the bottom (corr +0.97 / +0.94) |
| `plate-pons-rostral`, `-middle`, `-caudal`, `plate-olivary`, `plate-sensory-decuss`, `plate-pyramid-decuss` | **corners**: R@(52,52), L@(748,52), P@(52,748), A@(748,748) | anterior at the bottom (corr +0.85…+0.96) → an unreadable frame (`FAC-TR-003`) |
| `plate-coronal-midbrain`, `-thalamus`, `plate-tel-coronal-fornix` | S top, I bottom, R left, L right | superior up (corr(cy, y3d) −0.57…−0.89) — matches the app convention |
| `plate-sagittal-midline`, `plate-tel-sagittal-hemisphere` | S top, I bottom, A / P on the two sides | matches the app convention |
| `plate-tel-axial-58` | P top, A bottom, R left, L right | only 2 anchored shapes - frame carried over from the group |

The app's own convention is documented in code: `planeGeometry.ts:397` "transverse — anterior up,
patient-left on image-RIGHT (radiological)", `:480` `y: { top: 'A', bottom: 'P', left: 'R', right: 'L' }`,
and `contours.ts:24` "u = x (patient-left → image right), v = z (anterior up)". **8 of the 9 transverse
plates are drawn 180° from that** (`FAC-TR-002`) - left/right is correct everywhere, so it is a
rotation, not a mirror (`FAC-TR-009`).

Plate integrity otherwise passed: all 360 region entries (15 manifests) resolve to records and appear
in their own SVG, all nine anchored `levelId`s equal their caption's y in `levels.json`, and no SVG
carries a slug its manifest does not list (`FAC-TR-004/005`).

---

## 7. Courses: nerves and vessels

* **Radii.** All 52 authored courses convert exactly as documented (`r = d_mm / 2.4`): CN III 3.0 → 1.25,
  CN V 4.5 → 1.88, CN VIII 2.8 → 1.17, CN XII 1.8 → 0.75, vessel branches 0.8 → 0.333 / 1.2 → 0.5 /
  2.0 → 0.833. Largest deviation anywhere: 0.005 au (CN XI, 0.625 rounded to 0.63) - `FAC-VN-012`.
* **Anchors.** Every "waypoint N of M" claim in the twelve nerve `anchorNote`s is the real index of the
  named landmark (`surf-cn*-exit` appears literally as that waypoint), so the claimed 0.000 au anchor
  deviation holds - `FAC-VN-014`. All vessel-course waypoints lie inside `CLIP_BOUNDS`, every `parent`
  resolves, and the claimed measured origins lie inside the named committed mesh bbox (`FAC-VN-016`).
* **Census.** Measured through the shipped merge function: **41 drawing courses** (39 authored + 2
  surviving built-ins), **38 paired**, **79 vessel parts**; nerves 12 + 12 = 24; both families 103. The
  README still says "40 authored courses … 77 drawn tubes" and the `area-toggles` header prose repeats
  77/40/37 while the same run prints 79/41/38 - `FAC-VN-013`. The extra course is the v18b built-in
  `vasc-posterior-medial-choroidal-artery` (`FAC-VN-017`), whose own record still advertises a
  "Mesh: `FJ1727`/`FJ1727M`, 880 faces each" that no manifest part or `.glb` backs.
* **`laterality` of courses.** 3 of 41 courses are unpaired: `vasc-sca-vermian-branches` and
  `vasc-anterior-spinal-artery` are genuinely midline, but `vasc-pontine-perforating-arteries` is a
  bilateral paramedian group registered `midline`, so only one tube is drawn for it (`FAC-VN-011`).
* **Tracts.** All 23 `tracts.json` records: decussation site and side verified (`FAC-TR-008`), waypoint
  direction consistent with the declared ascending/descending sense (0 flags in 23), every `levels[]`
  entry reachable by the waypoint y-range (`FAC-TR-010`). All 23 carry **no `bloodSupply`** while all 30
  tract-kind records in `structures/` do - the audit's largest completeness gap (`FAC-TR-006`).

---

## 8. What passed (24 `ok` findings, so the audit is falsifiable)

Papez-circuit and basal-ganglia loop directions (`FAC-DI-010`, `FAC-TEL-008`); hippocampal trisynaptic
circuit and subfield naming (`FAC-TEL-005`); pyramidal-decussation figures and cruciate paralysis
(`FAC-BS-008`); internal-arcuate side-flip (`FAC-BS-009`); spinal-trigeminal onion-skin and the
crossed pattern (`FAC-BS-010`); ambiguous-nucleus composition IX/X/XI (`FAC-BS-011`); CN IV as the only
dorsal exit and the only complete nuclear decussation (`FAC-BS-012`); the homunculus order and its
measured residuals (`FAC-TEL-003/004`); the four non-arterial syndrome cards and card resolution
(`FAC-SYN-006`); crossed/uncrossed card statements (`FAC-SYN-007`); nerve foramina, nerve-course
anchors, course radii, plate slug/label integrity and plate levelIds (`FAC-VN-012/014/015`,
`FAC-TR-004/005/009`); the chiasm's "about 53 %" crossing (`FAC-TEL-006`); the central-Horner
multi-artery linkage (`FAC-VN-018`).

---

## 9. How to re-run every measurement

The census, letter-collision, supply↔territory and plate-geometry checks were run as read-only
`node -` here-strings (PowerShell) with the logic summarised in each finding's `basis`. The two
load-bearing ones are reproduced verbatim; both are read-only and print the numbers quoted above.

**Marker vs the record's own committed mesh (93 matched / 9 outside, §5):**

```powershell
@'
const fs=require("fs");
const parts=JSON.parse(fs.readFileSync("src/assets/anatomy/anatomy-manifest.json","utf8")).parts;
const byId={};
for(const p of parts){for(const c of new Set([p.slug,p.slug.replace(/-[lr]$/,""),p.slug.replace(/-[mp][12]-[lr]$/,"")]))(byId[c]=byId[c]||[]).push(p);}
const all={};
for(const f of fs.readdirSync("src/data/structures").filter(f=>f.endsWith(".json")))for(const r of JSON.parse(fs.readFileSync("src/data/structures/"+f,"utf8")))all[r.id]=r;
let checked=0,out=0;
for(const id in all){const r=all[id];if(!r.origin3d||!byId[id])continue;checked++;
 let xa=1e9,xb=-1e9,ymin=1e9,ymax=-1e9,zmin=1e9,zmax=-1e9;
 for(const p of byId[id]){const mn=p.bbox.min,mx=p.bbox.max,mid=mn[0]<0&&mx[0]>0;
  xa=Math.min(xa,mid?0:Math.min(Math.abs(mn[0]),Math.abs(mx[0])));xb=Math.max(xb,Math.max(Math.abs(mn[0]),Math.abs(mx[0])));
  ymin=Math.min(ymin,mn[1]);ymax=Math.max(ymax,mx[1]);zmin=Math.min(zmin,mn[2]);zmax=Math.max(zmax,mx[2]);}
 const ax=Math.abs(r.origin3d[0]),y=r.origin3d[1],z=r.origin3d[2];
 const d=[ax<xa-2?ax-xa:ax>xb+2?ax-xb:0,y<ymin-2?y-ymin:y>ymax+2?y-ymax:0,z<zmin-2?z-zmin:z>zmax+2?z-zmax:0];
 if(d.some(v=>Math.abs(v)>0.1)){out++;console.log(id,JSON.stringify(r.origin3d),"d=",d.map(v=>v.toFixed(1)).join(","));}}
console.log("checked",checked,"outside",out);
'@ | node -
```

**Artery `supply[]` ↔ syndrome card ↔ `territory[]` (§4a):** the same pattern - load
`src/data/structures/vasculature.json` + `vasculature-courses.json`, `src/data/tracts.json` and the
three `src/data/syndromes/*.json` files, then for every `artery.supply[cardId]` print
`card.structures.filter(s => !artery.territory.includes(s))`.

**Course-table census (§7):** transpile `src/geometry/vasculature-courses.ts` with the bundled
esbuild, replace `import.meta.glob(…)` by the parsed `src/data/structures/vasculature-courses.json`,
and read the module's own exports - `VESSEL_COURSES.length` (41), `VESSEL_COURSE_SOURCES.replacedIds`
(2), `vesselTubeCount()` (`{authored:41, mirrored:38, total:79}`).

**Plate orientation (§6):** for each plate, extract
`data-structure="…"` shapes with their centres (`cx/cy`, or the bbox centre of `path[data-structure]`)
and the frame letters with their coordinates, then correlate the shape centres with the matching
records' `origin3d` (`cx↔x` is symmetric for paired structures and is not diagnostic; `cy↔z` on a
transverse plate is, and its sign is the anterior direction).

**Gates that corroborate this report (all green before the integration):**

```bash
npm run validate                               # 20 structure files / 264 records / 23 tracts / 26 cards / 15 plates
node scripts/verify/audit-facts.mjs            # 13 cross-file invariant groups (supply[]↔card, levels, plates)
node scripts/verify/area-toggles.mjs           # prints registryNerveParts [24], registryVesselParts [79],
                                               # "vessel 41 authored + 38 mirrored (midline 3) = 79"  -> exit 0
```


---

## 10. Limits of this audit (stated, not implied)

* This is a **model-based review of authored text, coordinates and code**, not a source-verified
  re-derivation of the literature. No finding was validated against imaging, a specimen or an
  external database; textbook bases name the book/chapter the records themselves cite, not a page
  I re-read.
* Coordinates were checked **structurally** (bbox containment, level-table windows, sign contracts).
  Where a finding depends on a vertex-level claim made by the data (the exact "most posterior committed
  vertex" identities in the vessel-course notes), only bbox containment was re-verified.
* I did **not** invent fixes for anything whose correct direction is a judgement call: the plate
  convention (`FAC-TR-002`), the tuberothalamic-vs-paramedian attribution (`FAC-VN-003`), the
  AChA/STN trilemma (`FAC-VN-005`) and the two "which side changes" cases are left to the integrator
  with both sides named. `FAC-BS-014` is explicitly labelled my own judgment.
* Browser-lane claims are not made: `verify:acceptance` / `verify:audit` / `verify:browser` cannot run
  in this sandbox, so no finding depends on rendered pixels. Where a finding has a rendering
  consequence it is derived from code paths (`SceneLayers.tsx:736-748`, `NucleusMesh.tsx:170-183`).
* Records whose only evidence is prose that no shipped artifact contradicts were left as `ok` even
  when a fuller source might disagree; the 24 `ok` findings name exactly what was verified.
