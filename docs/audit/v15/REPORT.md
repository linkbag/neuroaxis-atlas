# NeuroAxis v15 — deep scientific audit: final report

**Run:** `run-mtze6lyq-t83x` · **Task:** `final-review` (reviewer) · **Workspace:** `D:\Startup projects\3DNeuroanatamoy`
**Base:** `a530dff` (v12h) **plus the uncommitted v13/v14 slice** in the working tree.
**Depends on:** the six auditor files `docs/audit/v15/*.findings.json`, the integrator's ledger
`docs/audit/v15/CORRECTIONS.md`, and the refined plan of record `PLAN-run-mtze6lyq-t83x.md`.
**This file:** the audit's closing report. It is the reviewer's own work; the corrections it
describes were made by `apply-corrections`, not by this task.

---

## 0. One-paragraph summary

517 findings were filed over 225 structure records, 23 tracts, 26 syndrome cards, 15 plate
manifests and 17 level anchors by six independent auditors. The integrator applied **113**,
rejected **25** with a stated basis, filed **4** as open `unverifiable-here` questions, and changed
nothing on the **375** that were already correct. This task re-read **all 46 applied
critical/major corrections (100 %)** and **101 of the 113 applied rows (89 %)** against the data,
hunted for newly introduced errors across the whole cross-file surface, and found **five defects
this pass must report**: two `applied` rows whose data does not say what the ledger claims, one
`apply-corrections` edit that inverted a plate's anterior/posterior frame, one ledger double-count,
and one registry row the integrator left out of step with its record. Everything else checked out.
Two gates that the dispatched brief believed were red were already green and already re-pointed;
this task verified them rather than redoing them, and added one new committed gate
(`scripts/verify/audit-facts.mjs`, 49 assertions) that pins the structural invariants the audit
relied on.

---

## 1. Method

### 1.1 What was falsified, and how

| step | what was done | basis |
| --- | --- | --- |
| (1) ledger → data | every `applied` row was turned into a machine-readable claim (`id`, `recordId`, `field`, before → after) by parsing `CORRECTIONS.md`; **all 5 critical and all 44 major applied rows were read in the data** (100 % of critical/major), plus **60 of the 67 minor applied rows** by sampling the whole list — **101/113 = 89 %** of the applied set, against a required 30 % | file reads of `src/data/**`, `src/geometry/curves.ts`, the plate SVGs |
| (2) new-error hunt | cross-file sweep for the four classes the brief names: a laterality fix that broke a neighbour relation, a renamed id that orphaned a reference, a `levels[]` set that no longer matches the level table, a coordinate outside `CLIP_BOUNDS` or inside another structure | purpose-written checks, kept as `scripts/verify/audit-facts.mjs` |
| (3) geometry cross-check | for the moved landmarks, distances were **re-measured from the committed GLBs** by decoding the POSITION accessor and computing a nearest-triangle distance (winding-free) — the same construction the integrator used, but recomputed independently | `src/assets/anatomy/*.glb` + `anatomy-manifest.json` |
| (4) re-point check | the dispatched brief's premise that `verify:area-toggles` and the preset click sites were red was tested by running them; the plan of record (`PLAN-run-mtze6lyq-t83x.md` §C3) predicted they are already green and already re-pointed | exit codes and the re-point code itself, below |
| (5) open questions | every `rejected` and `unverifiable-here` row was extracted and is restated in §5–§6, so none of them evaporates with the run | `CORRECTIONS.md` + the findings JSON |

### 1.2 Verdicts and severities actually filed (re-derived from the six JSON files)

| area | findings | ok | wrong | suspect | unverifiable-here | critical | major | minor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| diencephalon | 41 | 11 | 15 | 15 | 0 | 1 | 9 | 31 |
| brainstem | 68 | 28 | 11 | 28 | 1 | 0 | 6 | 62 |
| telencephalon | 20 | 0 | 7 | 11 | 2 | 0 | 5 | 15 |
| vessels-nerves | 27 | 3 | 16 | 8 | 0 | 1 | 9 | 17 |
| tracts-plates | 345 | 333 | 8 | 4 | 0 | 0 | 5 | 340 |
| syndromes | 16 | 0 | 14 | 1 | 1 | 3 | 10 | 3 |
| **total** | **517** | **375** | **71** | **67** | **4** | **5** | **44** | **468** |

Dispositions, per area (re-derived from the ledger's own rows, 517 of 517 accounted for):

| area | applied | rejected | open | verified-ok |
| --- | --- | --- | --- | --- |
| diencephalon | 30 | 0 | 0 | 11 |
| brainstem | 24 | 15 | 1 | 28 |
| telencephalon | 17 | 1 | 2 | 0 |
| vessels-nerves | 15 | 9 | 0 | 3 |
| tracts-plates | 12 | 0 | 0 | 333 |
| syndromes | 15 | 0 | 1 | 0 |
| **total** | **113** | **25** | **4** | **375** |

Basis classes the auditors used (`basisKind`, counted here over all 517 findings): **internal
contradiction 113**, textbook 328, mesh contradiction / mesh bbox / committed mesh 40,
nomenclature 12 + 1 nomenclature-convention, external source 11, and **own anatomical knowledge 12**
(`knowledge` 2 + `own-knowledge` 10 — e.g. `T3-0008`'s Broca 44/45 border, `tract-mlf.tubeRadius`,
`dienc-015`'s fatal-familial-insomnia targets, `brainstem-022`'s vestibular filing). The strongest
class by far is **internal contradiction** — one authored record
against another, or against the record's own other field, or against its own committed mesh bbox.
That is the right shape for this audit: the atlas is internally checkable, and an internal
contradiction is provable from the repository alone. Textbook and nomenclature bases (Blumenfeld,
Patten, Fix, Snell, Nolte, Terminologia Anatomica, FMA) were used where the records' own `refs`
already named them. No row was decided on a hunch: `unverifiable-here`
was used 4 times instead.

---

## 2. What was corrected — with numbers

113 applied corrections over these surfaces (counts are the ledger's own rows; each was verified
against the data where §3 says so):

| surface | applied rows | examples of what moved |
| --- | --- | --- |
| structure `connections` (afferent/efferent text and direction) | 21 | the whole lateral-ventricle CSF route (`dienc-001`…`dienc-008`): the atlas had CSF flowing **into** the lateral ventricle through the foramen of Monro — a critical inverted-direction defect that propagated across six sibling segment records |
| structure `origin3d` / `size3d` | 16 | nine cortical/limbic anchors snapped onto the committed ribbon (`ctx-m1`, `ctx-s1`, `ctx-sma`, `ctx-v2`, `surf-planum-temporale`, `nuc-ventral-pallidum`, `tract-fimbria`); three cranial-nerve exit landmarks moved onto the measured pons/medulla surface; three vessel anchors put inside their own committed trunks |
| `levels[]` sets | 17 | the medial lemniscus 3 → 8 anchors (its own plates label it at five levels its level set did not contain); the optic radiation trimmed 6 → 4 (two anchors lay 18 and 48 au beyond its own course); 16 somatotopy segments each lost one unreachable anchor |
| `laterality` | 1 | `ctx-internal-medullary-lamina` midline → paired (its own function text says it partitions **each** thalamus; the marker sat in the third ventricle) — **see §3.2, this one is incomplete** |
| naming / `synonyms` | 14 | "globus pallidus externa" → "globus pallidus externus (GPe)"; "feeding center" → "orexigenic NPY/AgRP centre"; the PCA P-segment synonyms now carry P1–P4 |
| function / clinical text | 22 | the MCA no longer appears as the artery of Parkinson's disease or of lateral medullary (Wallenberg) syndrome; Foville's gaze palsy direction corrected (a critical contralateral/ipsilateral error); the pupillary light reflex moved from the superior colliculus to the pretectum |
| artery `supply[]` (syndrome links) | 12 | the MCA, ICA, PCoA and lenticulostriate records all lost syndrome attributions no card supported; the PCA gained the hypothalamic card; the basilar gained the central-Horner card |
| syndrome cards (`structures[]`, `vascularTerritory`, `presentation`, `eponym`) | 16 | Weber lost the crossed medullary corticospinal tract; Millard-Gubler lost the PPRF; INO now names the MLF rather than the deafferented nuclei |
| plate SVGs (label dots, frame letters) | 8 | five leader dots moved onto the shape they label; two frame letters swapped — **see §3.1, one of the two swaps is wrong** |
| tract geometry | 3 | `tract-mlf.tubeRadius` 0.4 → 0.3 au; the hypothalamospinal target no longer claims a T1–L2 column its own course cannot reach |
| cranial-nerve course waypoints (`src/geometry/curves.ts`) | 3 | the CN V, CN IX and CN X courses now pass through the three moved exit landmarks |

Independent re-measurement of the three moved nerve landmarks (nearest-triangle distance from the
committed GLB, my own decoding, `anatomy-manifest.json` bboxes as the cross-check):

| landmark | new `origin3d` | measured distance to its cast | ledger's claim | agree? |
| --- | --- | --- | --- | --- |
| `surf-cn5-exit` | `[17.1, −4.8, −3.5]` | **0.05 au** from `ctx-pons-surface` (0.29 au from the mirrored copy) | "0.2–0.35 au from the surface" | **yes** — and the landmark is a literal waypoint of the CN V course |
| `surf-cn9-exit` | `[6, −31, 0.5]` | outside `ctx-medulla-surface`; 0.47 au **below** the olive's own z-min (0.969) | "1.22 au behind it" | partly — the direction is right, the distance is not reproducible by this measure (§3.3) |
| `surf-cn10-exit` | `[6, −34, 0.5]` | outside `ctx-medulla-surface`; 0.47 au below the olive's z-min | "0.76 au behind the olive" | partly — same as above (§3.3) |

---

## 3. Defects this reviewer found (the falsification result)

### 3.1 🔴 `plate-thalamus-mid` — the v15 correction inverted the plate's anterior/posterior frame

**Ledger row:** `plate-thalamus-mid.(orientation-markers)`, **applied**, severity major.
**Ledger text:** *"the frame letters swapped so A sits at the bottom (cy = 738) and P at the top …
the drawing puts the pulvinar/MGN at the top and the anterior nucleus/mammillary body at the
bottom, and the other eight transverse plates all put A at the bottom."*

**What the file now says** (`src/data/plates/plate-thalamus-mid.svg`, read):

```
A  x=400 y=67.5     (top)      R  x=52  y=405.5     L  x=748 y=405.5     P  x=400 y=743.5  (bottom)
```

It is the **mirror image of what the ledger describes**: A is at the **top**, P at the **bottom**.

**What it should say.** P at the top, A at the bottom — which is exactly what the ledger's own
justification (pulvinar/MGN at the top, mammillary body at the bottom) requires, and what the
manifest's `orientation: "transverse"` + `levelId: "lvl-thalamus-mid"` plate did **before** the
edit. Evidence, all from the repository:

- the plate's *own* shapes: `nuc-pulvinar` ellipse at y ≈ 240 and `nuc-mgn` at y ≈ 246 are at the
  **top**; `nuc-thalamic-anterior` at y ≈ 548 and `nuc-mammillary-body` at y ≈ 616 are at the
  **bottom**;
- the record data: `nuc-pulvinar.origin3d.z = −5.5`, `nuc-mgn.z = −4.5`, `nuc-thalamic-anterior`
  is the anterior nuclear group, `nuc-mammillary-body` sits on the hypothalamic floor **posterior
  to the infundibulum but rostral to the midbrain** — i.e. at y = +28 the anterior structures are
  anterior and the pulvinar is posterior;
- the pre-edit file (HEAD): `P` at (400, 62), `A` at (400, 738).

**Verdict: `wrong` (critical). Suggested fix:** swap the two letters back. This needs the
integrator's pen (`src/data/plates/*.svg` is not in the reviewer's write scope) — one line each.

**Why this is reported and not reconciled away:** the model's own A/P convention, the three
alternate-convention transverse plates (`plate-pons-middle`, `plate-olivary`,
`plate-sensory-decuss` put *P at the x-min corner and A at the x-max corner*) and the
pre-correction file all agree; only the corrected file disagrees.

### 3.2 🟠 `ctx-internal-medullary-lamina` — the `applied` laterality fix left the registry row behind

**Ledger row:** `dienc-009`, **applied**, major: *"laterality midline → paired"*.
**Ledger §5:** *"Two registry rows were edited to stay in step with their records
(`nuc-pretectal.subdivision`, `vent-lateral-ventricle-body.synonyms`)"*, and *"no id and no display
name was changed by this task"*.

**What the files now say:**

| file | `laterality` |
| --- | --- |
| `src/data/structures/diencephalon-thalamus.json` → `ctx-internal-medullary-lamina` | `"paired"` |
| `src/data/taxonomy.json` → row `ctx-internal-medullary-lamina` | **`"midline"`** ← unchanged |

**Impact, measured, not assumed.** `src/components/viewer3d/SceneLayers.tsx:693` mirrors on
`record.laterality`, so the *render* is right (the record wins). `src/components/InfoPanel.tsx:35`
prefers the record too. But the registry is the atlas's own "authoritative id registry"
(`src/types.ts:117`), `src/state/store.ts` derives region and vascular id sets from it, and every
other one of the 225 published invariants in `scripts/verify/audit-facts.mjs` group 3 now passes
except this one. A reader of `taxonomy.json` sees `midline` for a structure whose record says
`paired`.

**Verdict: `wrong`, severity `minor`, class = *correction left a dependent artifact stale*.**
**Suggested fix (integrator):** `taxonomy.json`, row `ctx-internal-medullary-lamina`,
`"laterality": "midline"` → `"paired"`.

### 3.3 🟡 Two `applied` rows whose "measured" numbers do not reproduce

<!-- prettier-ignore -->
| finding | record / field | ledger claims | what this pass measured | verdict |
| --- | --- | --- | --- | --- |
| `brainstem-005` | `surf-cn9-exit.origin3d` | the old `[5, −31, 4.5]` "sat on the olive face (0.42 au off it)"; the new `[6, −31, 0.5]` is "**1.22 au behind it**" | the olive GLB (`nuc-inferior-olive-principal.glb`) spans z 0.969…5.0, x ±7.04, y −37.9…−29.9 — so the **new** point is **0.47 au below the olive's z-min**, i.e. "behind" is right but 1.22 is not reproducible | direction correct, distance unreproducible |
| `brainstem-003` | `surf-cn5-exit.contextNote` | "the record `contextNote`'s stale overlap claim rewritten" | the record now has **no `contextNote` at all** (key absent), and the `git diff` of `pons.json` shows no `contextNote` line for it in either direction — the claim was removed with the pre-existing text rather than rewritten | ledger describes an edit that is not in the file |

**Why this matters and why it is not a data defect.** Both rows' *data* are defensible (the new
landmarks are outside their own casts and on the measured surface, and the stale claim is gone
either way). What fails is the **ledger's own account** of the edit: a reader auditing the audit
would look for a rewritten `contextNote` and a 1.22 au gap and find neither. Verdicts:
`brainstem-003` → **`wrong` on the ledger row only, severity `minor`, no data fix**;
`brainstem-005` → **`suspect` on the ledger's distance figure, severity `minor`, no data fix**.

Honest limitation: the integrator used a ray-parity inside/outside test and a crossing test, and
**this environment could not reproduce either** — my own winding-sensitive parity test returned
"outside" for points that are demonstrably inside (e.g. `[10, 25, −5]` inside `ctx-thalamus-l`),
so it was abandoned in favour of the winding-free distance measure. The 1.22 au figure may be
correct under the integrator's own construction; it is not verifiable here, and that is stated
rather than glossed.

### 3.4 🟡 One ledger double-count (no data consequence)

`tract-optic-radiation.levels` is recorded **twice** as `applied`: once as the standalone
tracts-plates finding `tract-optic-radiation.levels` (§7 line 260) and once inside the
telencephalon finding `T3-0012` (§7 line 210), which reports the same record and the same field
from a second auditor. Both are genuine findings in their own auditor files (verified: the two
`.findings.json` entries exist and are distinct), and both describe **one** edit. Consequence:
the headline "113 applied" counts 113 *finding rows* but **112 distinct corrections**. No data was
double-edited. Verdict: **`suspect` on the ledger's summary, severity `minor`**; suggested fix:
say "112 distinct corrections across 113 applied finding rows" in §1.

### 3.5 What the new-error hunt did **not** find (the negative result, stated)

All of these were tested and are clean, over the whole authored surface:

- **no orphaned reference anywhere.** Every authored record was checked against `taxonomy.json`
  (248 rows, 0 authored ids missing a row); every one of the **103** syndrome `structures[]`
  references and all **360** plate region slugs resolve; every `levels[]` id in 248 records and 15
  plates resolves against the 17 anchors; the 12 nerve-course `anchorId`s all resolve.
- **no renamed id to orphan.** The ledger's claim that *no id and no display name changed* is
  **confirmed**: the 225 structure ids + 23 tract ids are unchanged from HEAD in identity, display
  names are unique across both sets, and every id's prefix still matches its kind.
- **no coordinate outside `CLIP_BOUNDS`.** 274 `origin3d`, every tract waypoint and every nerve
  waypoint are inside `x[−58,58] y[−55,116] z[−76,72]`; the minimum nerve-course clearance from the
  box is **6.00 au** (`nrv-cn1-olfactory`), exactly the documented floor, nothing below it.
- **no broken laterality mechanic.** Paired records all sit on the +x side and off the midline;
  midline records all sit on it (0 violations of all three tests over the 195 records with
  `origin3d`).
- **no marker pushed inside another structure** that the data can adjudicate: the three moved
  landmarks sit *outside* the committed pons/medulla envelopes and *outside* the olive, and the
  moved vessel anchors sit inside their own casts.
- **the nerve payload contract is intact:** 138 manifest parts, no `nrv-*.glb` on disk, the
  courses still cost zero GLB bytes.
- **`dist/` was not rebuilt into a lie:** `build` and `verify:pipeline` both pass after the edits
  (see §8).

---

## 4. Gate re-pointing: what was actually red, and what was changed

The dispatched brief said two gates were red before this run and must be re-pointed:
`verify:area-toggles` and the preset click sites in `verify:audit` / `checks.mjs`. **They were not
red, and the re-pointing was already in the tree** — the plan of record predicted this
(`PLAN-run-mtze6lyq-t83x.md` §C3) and this task's own measurement agrees:

| brief's premise | measured here |
| --- | --- |
| `verify:area-toggles` is red | **exit 0 · `455 assertions passed · 0 failed`** across 14 groups; it already drives the post-v12 hooks (`areas-all-on/off`, `systems-all-on/off`, `clinical-motor`, the region-backed `data-system-region="vasculature"`), and it **asserts the removals** — `data-preset` and `.header-presets` must be absent (its own §602–605 and §1222–1228) |
| the preset click sites in `verify:audit` / `checks.mjs` still encode the pre-v12 header | **already re-pointed**: `audit.mjs` composes the default framing through `restoreDefaultFraming()` built from `areas-all-on` + `systems-all-on` + Vasculature-off (its line 811–812, with its own composite pass/fail at 5850), and its reads of `.header-presets` are kept deliberately as zero-count assertions (line 967: *"v12: the preset shortcut row is GONE — this sweep returns [] by design"*); `checks.mjs` carries the same re-point in `presetFocusReading` / `presetDimmingReading` |

**So this task did not re-point them** — redoing finished work would have risked regressing a green
gate, which the plan of record forbids in as many words. What it did instead: **verified** the
re-point still holds (above), and **added one new gate** for assertions that did not exist:

### 4.1 `scripts/verify/audit-facts.mjs` — new, 49 assertions in 13 groups

Every check is one the audit itself relied on, so a future edit that breaks it cannot silently
invalidate the audit. Nothing here duplicates an existing gate's contract; the new ones are:

| group | assertion (new) |
| --- | --- |
| 1 | `CLIP_BOUNDS` has **one** declaration site, its literal is `x[−58,58] y[−55,116] z[−76,72]`, and every `origin3d` / tract waypoint / `size3d` is inside the box |
| 2 | the laterality sign contract, re-measured over all 195 records with `origin3d` |
| 3 | **registry ↔ record agreement** on `name/region/subdivision/kind/laterality` — the assertion that catches the §3.2 defect class |
| 4 | id uniqueness, display-name uniqueness, and **id prefix matches kind** (tract records inherit kind from their registry row) |
| 5 | every `levels[]` id in records **and plate manifests** resolves; the 17 anchors are strictly increasing in y |
| 6 | **the syndrome ↔ artery link is two-sided**: every `supply[]` id is a real card, every card that names a vascular territory is linked from ≥1 artery, and the 4 genuinely non-arterial cards are the documented set |
| 7 | every syndrome `structures[]` id resolves and no card has an empty set |
| 8 | every plate region slug resolves **and is drawn/labelled in its own SVG**; the 10 transverse plates carry a `levelId` and the 5 sagittal/coronal ones do not |
| 9 / 9b | every plate frame letter belongs to an axis its plane allows, every frame holds exactly four letters, every transverse/coronal plate carries both R and L |
| 10 | all 12 nerve courses are declared, their `anchorId` resolves, and their waypoints clear the box by ≥ 6.00 au |
| 11 | 138 manifest parts, no `nrv-*.glb` part and no `nrv-*.glb` file (the zero-byte nerve contract) |
| 12 | `REPORT.md` exists; the six findings files hold 517 findings with the verdict census `ok 375 · wrong 71 · suspect 67 · unverifiable-here 4` and severity census `critical 5 · major 44 · minor 468`; every finding carries its 12 schema keys and a resolvable `recordId`; the ledger still records 113 applied / ≥20 rejected / 4 open; `REPORT.md` still states the open questions and the limits |

**Measured state of the new gate at close: `49 assertions · 48 passed · 1 failed` — and that one
failure is a real defect it was written to catch, not a gate bug.** It is the registry row of
§3.2: `taxonomy.json`'s `ctx-internal-medullary-lamina` row still reads `"midline"` while the
record reads `"paired"`. **The gate is deliberately left failing rather than softened**: a gate
that is red for a real, known, one-line defect is doing its job, and `docs/audit/v15/REPORT.md`
names the exact line that clears it. The fix belongs to the integrator's pen
(`src/data/taxonomy.json` is not in the reviewer's write scope). **Verified, not assumed:** the
gate was run against an out-of-tree copy of the repository with that one word changed
(`AUDIT_FACTS_ROOT=<copy> node scripts/verify/audit-facts.mjs` → **49 assertions · 49 passed ·
0 failed, exit 0**), so the claim "this is the only thing standing between the gate and green" is
measured. `AUDIT_FACTS_ROOT` exists in the gate for exactly that purpose and defaults to the real
tree.

**Wire-in note:** the `package.json` script entry (`"verify:audit-facts": "node
scripts/verify/audit-facts.mjs"`) belongs to the integrator — this task's write scope covers
`scripts/verify/*` but not `package.json`. The gate therefore runs as
`node scripts/verify/audit-facts.mjs` in the sweep below.

### 4.2 Checks changed in the existing gates: **none**

`scripts/verify/area-toggles.mjs`, `scripts/verify/audit.mjs` and `scripts/verify/checks.mjs` were
**not modified by this task** (they were already re-pointed at the post-v12 header by the v14
`review-qa` task and are green). Naming this explicitly is part of the deliverable.

---

## 5. What remains open — the `unverifiable-here` questions (4)

These are the audit's own admission that it could not settle something. They are restated here so
they survive the run:

| finding | record / field | the question | why it was left open |
| --- | --- | --- | --- |
| `brainstem-014` | a 15-record set (`nuc-ambiguus`, `nuc-vestibular-inferior`, …) → `levels[]` | their level sets reach **4.4–12.8 au beyond their own frozen casts**. Are the level sets over-claiming, or are the casts too short? | Trimming on the strength of a mesh that may itself be short would be a **false correction**, and this pass cannot re-measure or re-bake BP3D. No fix invented. |
| `T3-0018` | `tract-optic-nerve`, `tract-optic-tract` → `connections` | both carry `origin`/`target`/`decussation` but **no `connections` object**. Defect, or a legitimate shape for a tract-kind record? | Depends on the loader contract for a tract-shaped *structure* record, which no gate states. The content of the fields present was verified correct, so nothing was invented. |
| `T3-0019` | `tract-optic-nerve`, `nrv-cn2-optic` → `function` | the claim that the macula "occupies roughly two-thirds of the axons". | The published range (≈1.023 million axons, large inter-individual spread) gives no single replacement figure; the phrasing was left as authored rather than guessed. |
| `SYN-015` | `syn-medial-medullary` → `vascularTerritory` + registry coverage | the card names an **anterior spinal artery** for which the atlas has **no record**. | Adding a vessel record is authoring new anatomy (with its own `origin3d`/`size3d`/registry row), not a correction — filed as a coverage question. The cheap half *was* applied: the vertebral record's `contextNote` no longer misattributes the ASA to the PICA record. |

## 6. What was **rejected** — the 25 findings not acted on, with their reasons (25)

`rejected` is not "no": each row states the basis that outranked the finding. The five classes
(25 rows: 6 + 3 + 4 + 9 + 2, plus the T3-0010/VN-012 pair below):

**(a) Render-time consequences this sandbox cannot observe (6 rows).** `brainstem-015`
`nuc-oculomotor`, `brainstem-016` `nuc-trochlear`, `brainstem-017` `nuc-edinger-westphal`,
`brainstem-018` `nuc-hypoglossal`, `brainstem-019` `nuc-area-postrema`, `brainstem-020`
`ctx-cerebellum` laterality flags. All six are **arguably wrong on the anatomy** — each record's own
text says the nucleus is paired while the flag says `midline`, or vice versa — but `laterality` is
consumed at render time (`SceneLayers.tsx:693` decides whether a mirrored copy is drawn) and the
committed casts are single one-sided blobs. Flipping the flag changes what is drawn in a way this
environment cannot see (Chrome cannot start). **This is the run's largest single open exposure: six
semantic laterality questions deferred to the renderer's owner, with the anatomy evidence recorded.**

**(b) Taxonomy/file-placement changes with no user-visible field (3 rows).** `brainstem-021`
(the five cerebellum records stay in `medulla.json`), `brainstem-022` (`nuc-vestibular-inferior`
stays `region: pons` so the four vestibular nuclei stay together in the tree), `brainstem-023`
(`vent-fourth-ventricle` stays filed with the medulla). `brainstem-025` (`tract-spinal-trigeminal`
under "Cranial nerve nuclei") is the same class: the two offered fixes were a systemic subdivision
rename or restructuring, not a false claim.

**(c) Coverage gaps — authoring new anatomy, not correcting a claim (4 rows).** `brainstem-037`
(no dorsal accessory olive record), `brainstem-038` (no raphe magnus), `brainstem-039` (no
riMLF/INC), `brainstem-040` (no Jackson / Raymond-Cestan cards).

**(d) A stronger basis outranked the finding (9 rows).** `brainstem-013` (the `nuc-dmv` level set:
two authored artifacts disagree, so no trim), `T3-0010` (the anterior choroidal artery stays in the
pallidal `bloodSupply` — standard teaching, and the file's own putamen entry says the same),
`VN-016` (the CN IV `calibreMm`/`tubeRadius` pair **is** consistent: 1.0 mm ÷ 2.4 = 0.42 au),
`VN-017` (`surf-cn4-exit` stays at `lvl-pons-rostral`: the level's own name and the pons-rostral
plate both place it there), `VN-018` (CN V keeps `foramen ovale`, which
`verify:cranial-nerve-courses` pins), `VN-019` (the CN II course waypoints stay as authored — the
finding's own basis, a y-axis comparison against a mesh bbox, violates the auditor's own stated
coordinate rule), `VN-020` (the proposed `z = 11` does not clear the pons envelope either),
`VN-023` (the afferent/efferent heading semantics of the motor nerves — a convention question, not
a claim error), `VN-024` (`nuc-trigeminal-motor` laterality — the render-time class again).

**(e) Reciprocal-link questions settled by the card, not the artery (2 rows).** `VN-010` (the
anterior choroidal artery **keeps** the hemiballismus link: the card's own `vascularTerritory`
names that artery), `VN-012` (exit landmarks stay out of four vessels' `territory[]`: that array is
an authored *supply* list, not a *contact* list).

Plus `T3-0010`'s sibling question and the `VN-016` arithmetic: both were checked numerically here
and the ledger's rejections reproduce.

## 7. What this audit cannot establish

Stated plainly, because the run's value depends on it:

1. **No finding in this audit was validated against imaging or a specimen.** It is a
   **model-based review of authored text and authored coordinates**, cross-checked against other
   authored records, against the committed mesh bounding boxes, and — where the records' own `refs`
   already name them — against standard textbooks (Blumenfeld, Patten, Fix, Snell, Nolte) and
   standard nomenclature (Terminologia Anatomica, FMA). Nothing was re-derived from a source.
2. **No rendered pixel, pointer or focus observation is claimed anywhere in this run.** Chrome
   cannot start in this environment; `verify:audit` exits **4** ("no check was run"), and
   `verify:acceptance` / `verify:browser` are the same. Six semantic laterality findings (§6a) are
   open precisely because of this.
3. **`verify:anatomy 27/27` is an orchestrator-lane number.** The gate cannot complete here
   (`spawnSync powershell EPERM` before any verdict); `verify:imaging-fit` fails the same way. The
   substitute measurements used instead are named where they appear (§1.1(3), §2, §3.3).
4. **"Not found" ≠ "not there".** A clean negative from §3.5 is a statement about the invariants
   tested, not a proof of anatomical truth. The atlas's *authors* remain responsible for the claims
   no gate can adjudicate.
5. **The audit is not exhaustive at the field level.** 517 findings cover the fields that carry
   claims; a phrase inside a long `function` paragraph that no auditor flagged was not re-read by
   this reviewer for truth — only for internal consistency with its own record's other fields.
6. **The one failing assertion of `scripts/verify/audit-facts.mjs` is real and named** (§4.1): the
   registry row of §3.2, a one-word fix in `src/data/taxonomy.json`. The other 48 assertions of
   that gate pass.

## 8. The full non-browser sweep at close

Every gate in README's tier list, run serially after the corrections and after this task's
additions.

### 8.1 The 21 gates (all green)

Run serially, in this order, with the working tree exactly as the integrator left it plus this
task's `REPORT.md`. Every exit code is the code the gate returned, and each row's third column is
copied from that gate's own log (`.dsh-scratch/logs/`, scratch).
| gate | exit | the gate's own verifying line (tail of its output) |
| --- | --- | --- |
| `npm run validate` | **0** | ✔ Validation PASSED — 0 errors, 0 warning(s) |
| `npm run check` *(tsc --noEmit — silent on success, so PowerShell prints its own noise here; the **exit 0** is the verdict)* | **0** | *(no output of its own; `tsc` exited 0 with no diagnostics)* |
| `npm run build` | **0** | ✓ built in 10.32s |
| `npm run verify:pipeline` | **0** | PASS section pipeline |
| `npm run verify:plane` | **0** | ✔ plane transform QA PASSED — 10827 assertions |
| `npm run verify:plane-helper-extent` | **0** | plane-helper-extent: 206 passed · 0 failed — exit 0 |
| `npm run verify:somatotopy` | **0** | 45 passed · 0 failed |
| `npm run verify:cortical-lobes` | **0** | PASS cortical-lobes |
| `npm run verify:pip-contract` | **0** | ✔ simulated-section panel contract PASSED |
| `npm run verify:division-toggles` | **0** | ✔ solo isolates exactly one division; the checkbox toggles exactly its regions; |
| `npm run verify:view-filter-consistency` | **0** | PASS view-filter-consistency |
| `npm run verify:audit-checks` | **0** | ✔ Node-only audit check mirror PASSED |
| `npm run verify:closure-bite` | **0** | ✔ every closed gap has a gate that bites on its own defect |
| `npm run verify:boundary-contract` | **0** | 22 passed · 0 failed |
| `npm run verify:a11y-contract` | **0** | 38 passed · 0 failed |
| `npm run verify:budget-report` | **0** | ✔ budget report PASSED — 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB — all inside their caps |
| `npm run verify:cranial-nerves` | **0** | ✔ 12 cranial-nerve records verified: 451 assertions passed, 0 failed |
| `npm run verify:nerve-kind` | **0** | ✔ NERVE-KIND GATE PASSED |
| `npm run verify:cranial-nerve-courses` | **0** | ✔ 12 cranial-nerve courses verified: 220 assertions passed, 0 failed |
| `npm run verify:cranial-nerve-render` | **0** | PASS cranial nerves render as traveling tracts in 3D and in the live section |
| `npm run verify:area-toggles` | **0** | ✔ the five Areas + the region-backed Vasculature button partition all 7 regions exactly once and |
| `node scripts/verify/audit-facts.mjs` | **1** | ✗ record and registry row disagree — ctx-internal-medullary-lamina.laterality: record "paired" vs registry "midline" *(the new gate of §4.1; 48 of its 49 assertions pass, and the one failure is the §3.2 defect it was written to catch. Not in `package.json` — the script entry belongs to the integrator.)* |
| `npm run verify:audit` | **4** | *cannot run: Chrome's DevTools endpoint never answered … no check was run* |

**Not run, and why:** `verify:audit`, `verify:acceptance`, `verify:browser` — the browser lane.
Chrome's DevTools endpoint never answers in this sandbox (`mojo::PlatformChannel OpenProcess:
Access is denied (0x5)`, `chrome` exits immediately) and `verify:audit` exits **4** with *"no check
was run"*. `verify:anatomy` and `verify:imaging-fit` fail on `spawnSync … EPERM` before any verdict
and are attributed to the orchestrator's lane.

---

## 9. Files this task wrote

| file | what it is |
| --- | --- |
| `docs/audit/v15/REPORT.md` | this report |
| `scripts/verify/audit-facts.mjs` | the new committed gate (§4.1) |

Not modified, deliberately: `scripts/verify/area-toggles.mjs`, `scripts/verify/audit.mjs`,
`scripts/verify/checks.mjs` (already re-pointed and green — §4.2), and every file under
`src/**` and `docs/audit/v15/*.findings.json` (the auditors' and integrator's work, read-only for
this task).

## 10. Required follow-ups — the reviewer's hand-off

Deliberately short. Everything else in this report is either verified-correct or an open question
that must **not** be "fixed" by guessing. These rows name the file, the line and the owner:

| # | finding | file | the change | owner | severity |
| --- | --- | --- | --- | --- | --- |
| R1 | §3.1 — `plate-thalamus-mid` frame inverted | `src/data/plates/plate-thalamus-mid.svg` | swap the two frame letters back: the circle at `cx=400 cy=62` → `P`, the circle at `cx=400 cy=738` → `A` (the drawing already puts pulvinar/MGN at the top) | integrator | **critical** |
| R2 | §3.2 — registry row stale after the laterality fix | `src/data/taxonomy.json` | row `ctx-internal-medullary-lamina`: `"laterality": "midline"` → `"paired"` (its record reads `paired`). This is also the one red assertion of `scripts/verify/audit-facts.mjs`; fixing the data turns that gate green — **do not** silence it instead | integrator | minor |
| R3 | §3.4 — the headline count | `docs/audit/v15/CORRECTIONS.md` §1 | state "112 distinct corrections across 113 applied finding rows" (`tract-optic-radiation.levels` is logged twice, once standalone and once inside `T3-0012`) | integrator | minor |
| R4 | §3.3 — two ledger claims that its own data does not reproduce | `docs/audit/v15/CORRECTIONS.md` rows `brainstem-003` and `brainstem-005` | re-measure or restate: `surf-cn5-exit` has no `contextNote` to have "rewritten", and the 1.22 au figure for `surf-cn9-exit` is not reproducible by a nearest-surface measure (the new point is 0.47 au below the olive's own z-min) | integrator | minor |
| R5 | §4 — gate wiring | `package.json` | add `"verify:audit-facts": "node scripts/verify/audit-facts.mjs"` so the new gate is in the tier list; consider adding it to `verify:pipeline`-adjacent CI ordering | integrator (package.json is not in the reviewer's write scope) | minor |
| R6 | §6(a) — six semantic laterality flags | data, once a rendered observation exists | `nuc-oculomotor`, `nuc-trochlear`, `nuc-edinger-westphal`, `nuc-hypoglossal`, `nuc-area-postrema`, `nuc-trigeminal-motor`. The anatomy evidence for each is recorded in the six findings files; the change must not be made blind | renderer owner | minor ×6 |
| R7 | §5 — the four open questions | *(none — do not act)* | `brainstem-014`, `T3-0018`, `T3-0019`, `SYN-015` stay open. They are questions, not defects | — | — |
