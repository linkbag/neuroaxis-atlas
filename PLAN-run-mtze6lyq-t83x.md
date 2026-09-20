# NeuroAxis v15 — deep scientific audit: refined task DAG

**Run:** `run-mtze6lyq-t83x` · **Plan file:** `PLAN-run-mtze6lyq-t83x.md` · **Workspace:** `D:\Startup projects\3DNeuroanatamoy`
**Role:** `architect-review` (review + refine of the dispatched proposal, not a from-scratch plan).
**Base:** `a530dff` (v12h) **plus the uncommitted v13/v14 slice** in the working tree. Every number below was
printed in this checkout during this review; the probe scripts that printed them are in `.dsh-scratch/arch-check-*.mjs`
(scratch, not deliverables — delete or ignore).

---

## 0. Verdict on the proposal

The proposal's **method, task partitioning, verdict enum, owned-file discipline and evidence contract are all
sound** and are kept. Its **scope census, its file map and its two "red gate" premises are factually wrong
against the live tree**, and those errors would have sent two auditors to audit the wrong file and one
reviewer to redo already-finished work. Six corrections (§1) and four pre-existing defects (§3) are folded in
below. One consolidation was already satisfied: the proposal is a single 8-task DAG, not split runs — kept.

---

## 1. Verified corrections to the proposal (do these instead)

### C1 — Structure census: 225 records, not 197

`npm run validate` prints `structures 19 file(s), 225 record(s)`; an independent walk of
`src/data/structures/*.json` confirms **225**. The proposal's "197" matches neither the file count nor the
record count and is retired.

| file | records | | file | records |
| --- | --- | --- | --- | --- |
| `medulla.json` | 32 | | `telencephalon-basal-ganglia.json` | 10 |
| `pons.json` | 27 | | `telencephalon-cortex.json` | 10 |
| `midbrain.json` | 21 | | `brainstem-cranial-nerves.json` | 10 |
| `diencephalon-thalamus.json` | 16 | | `telencephalon-white-matter.json` | 8 |
| `telencephalon-somatotopy.json` | 16 | | `telencephalon-ventricles.json` | 7 |
| `diencephalon-epithalamus-subthalamus.json` | 14 | | `telencephalon-limbic.json` | 6 |
| `vasculature.json` | 14 | | `telencephalon-hippocampal-subfields.json` | 4 |
| `diencephalon-hypothalamus.json` | 12 | | `telencephalon-optic-pathway.json` | 3 |
| `telencephalon-cortical-areas.json` | 12 | | `telencephalon-cranial-nerves.json` | 2 |
| | | | `telencephalon-ventricle-segments.json` | 1 |

Field census over those 225 records (this is what "per record, per field" must cover):

| field | records | note |
| --- | --- | --- |
| `id name synonyms region subdivision kind laterality color function clinical levels refs` | 225 | present on **every** record |
| `connections` | 208 | 17 records have none (vessels, some surfaces) |
| `bloodSupply` | 207 | |
| `origin3d` + `size3d` | **195** | the other 30 carry neither |
| `contextNote` | 86 · `meshes` | `meshes` is **absent on all 225** (see C4) |
| `anchors` | 28 · `rampT` 16 | somatotopy/plate anchors |
| `modality` 14 · `territory` 14 · `supply` 14 | 14 | the vasculature file |
| `course` | 12 | the cranial nerves — a **string** field, see C2 |
| `waypoints`/`tubeRadius`/`direction`/`origin`/`target`/`decussation` | 2 or 23 | 23 in `tracts.json`, 2 in `telencephalon-optic-pathway.json` |

The **30 records with no `origin3d`/`size3d`** are: the 12 `nrv-*` nerves, the 14 `vasc-*` vessels, and 4
context/surface records. Auditors must not report a missing `origin3d` on those as a defect — they are
geometrically represented by `course`/`waypoints`/mesh instead, and this is a deliberate shape.

### C2 — The cranial-nerve courses are NOT in `tracts.json`

The proposal's scope line says "23 tract records in `src/data/tracts.json` **(+ the cranial-nerve courses added
by run `run-mtzc5coc-ug6z`)**". That is false and self-contradicting (its own task brief later admits the
courses live in `src/geometry/curves.ts`).

Measured:

- `git diff --name-only HEAD -- src/data/tracts.json` → **empty. `tracts.json` is byte-identical to HEAD.**
- 23 tracts; `npm run verify:cranial-nerve-courses` prints *"src/data/tracts.json still holds 23 committed
  tracts · no tract record is a nerve course (ids disjoint)"*.
- The twelve courses are `NERVE_COURSES: readonly NerveCourseRecord[]` in **`src/geometry/curves.ts`** (line 139),
  consumed by the 3D tube pass and by `sectionAssets.SECTION_NERVE_PARTS`. `src/data/structures/nerve-courses.json`
  does **not** exist.
- `docs/SWARM_V14_PLAN.md` §1 records *why*: reusing the `nrv-*` ids as tract ids produced 24 validator errors,
  and giving them tract ids drew every course twice.

**Consequence that changes the DAG:** any nerve-course finding (waypoints, `tubeRadius`, `calibreMm`,
`foramen`, `anchorId`) is a finding about `src/geometry/curves.ts`, which is **outside every write scope the
proposal declared**. The integrator's scope is therefore extended by `src/geometry/curves.ts` (§2, task 7).

The regeneration path exists and is deterministic: `.dsh-swarm/_regen-curves.mjs` rebuilds `curves.ts`
idempotently from `.dsh-swarm/_curves-block.txt` + `.dsh-swarm/_curves-helpers.txt` + each nerve record's own
`clinical`/`refs`. Verified: all **50** clinical-item titles across the 12 nerve records are present verbatim in
`curves.ts` (0 drift). So a `clinical`/`refs` edit to a nerve record does **not** propagate to `curves.ts` by
itself — the integrator must re-run the recipe. A geometry edit goes into `_curves-block.txt` first, then re-run.

### C3 — The two "red BEFORE this run" gates are not red, and the fix is done

The brief's closing rule ("`verify:area-toggles` and the preset click sites in `verify:audit` … are red BEFORE
this run") **does not reproduce at this base**:

| claim | measured |
| --- | --- |
| `verify:area-toggles` is red | **exit 0 — `455 assertions passed · 0 failed`**, all 14 groups green, and it already prints the post-v12 partition (`areas-all-on` / `systems-all-on`, Vasculature moved to the Systems row) |
| the preset click sites in `verify:audit` / `checks.mjs` still encode the pre-v12 header | **already re-pointed**, uncommitted, by the v14 `review-qa` task: `audit.mjs` carries the `restoreDefaultFraming()` helper built from `areas-all-on` + `systems-all-on` + Vasculature-off, with its own composite pass/fail so a missing hook cannot silently pass; `area-toggles.mjs` §11 refuses any `clickHook(...)` call site naming a hook the shipped Header no longer renders; §13 parses every static probe |

**So: `final-review` must NOT re-point those gates.** Redoing finished work risks regressing a green gate.
The reviewer re-points only what is actually red (C3b) and otherwise *verifies* the existing re-point still
holds. The v12 header genuinely has no `.header-presets` row and no `[data-header-action="reset"]`; the
current hooks are `areas-all-on` / `areas-all-off` / `systems-all-on` / `systems-all-off` / `clinical-motor` /
`data-system-region="vasculature"`.

### C3b — The gates that ARE red, and their real cause

Full sweep at base (all exit codes printed, logs in `%TEMP%\gate_*.log`):

```
validate 0 · check 0 · build 0 · verify:pipeline 0 · verify:plane 0 · verify:plane-helper-extent 0
verify:somatotopy 0 · verify:cortical-lobes 0 · verify:pip-contract 0 · verify:division-toggles 0
verify:area-toggles 0 · verify:view-filter-consistency 0 · verify:audit-checks 0 · verify:closure-bite 0
verify:boundary-contract 0 · verify:a11y-contract 0 · verify:budget-report 0
verify:cranial-nerves 0 · verify:nerve-kind 0 · verify:cranial-nerve-courses 0 · verify:cranial-nerve-render 0
verify-imaging-v4 0 · verify-imaging-v4b 0 · build-anatomy-geometry --manifest 0
verify:imaging-fit  1   ← FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM
verify:anatomy      1   ← Error: spawnSync powershell EPERM   (anatomy-qa.mjs:294, before ANY verdict)
verify:audit        4   ← correct and expected: Chrome cannot start (mojo::PlatformChannel OpenProcess 0x5)
```

Both red gates are **environment, not product**, and the cause is now pinned to one line each:

- `scripts/verify/anatomy-qa.mjs:294–297` shells out twice — `execFileSync('powershell', …, {encoding:'utf8'})`
  — to sum directory sizes. Piped `child_process` stdio is denied in this sandbox; `stdio:'inherit'` is not.
- `scripts/verify/imaging-fit.mjs` re-runs `scripts/fit-imaging-affine.mjs` as a piped child for the same reason.

`README.md` tier 2 already classifies both as *"recorded, not asserted"*. Two acceptable dispositions, and the
reviewer picks one and **states which**: (a) leave them recorded with this exact reason, matching README tier 2;
or (b) make the two gates runnable by replacing the `powershell` child with a Node `fs` directory walk in
`anatomy-qa.mjs` (a three-line change, no product impact) and re-running the fitter in-process or accepting its
captured JSON — then check whether the *verdict* underneath the EPERM is actually green. **Do not** report
`verify:anatomy 27/27` as a sandbox result; it is an orchestrator-lane number.

### C4 — `size3d` is a marker radius, not the structure's diameter; and `meshes` is absent

`src/types.ts:50` — `size3d?: Vec3; // ellipsoid radii`. `NucleusMesh.tsx:184` uses it **only when the record
has no GLB geometry**: `const scale = glbGeometry || geometry ? [1,1,1] : (record.size3d ?? [1,1,1])`.

Consequence for the audit: **`size3d ≪ committed mesh bbox` is by design, not a defect**, for the **81**
records whose id equals a committed mesh slug (e.g. `nuc-pulvinar` mesh y-extent 13.8 au vs `size3d` 3.0).
A `size3d` finding is only in scope for the **114** records that have no mesh — for those it *is* the placed
marker and must be plausible at 1 au = 1.2 mm. The proposal's "is `size3d` plausible for the real structure" is
kept, with this qualifier; reporting the mesh/size3d gap as a defect would be a false positive.

Also: the proposal's "Cross-check … against the committed meshes where a GLB exists" is **supported** —
`src/assets/anatomy/anatomy-manifest.json` carries `{slug, file, kind, triCount, centroid, bbox}` for **138**
parts (86 nucleus, 30 vessel, 17 context, 5 ventricle). 81 of them are id-for-id with a structure record. That
is a strong, inexpensive bbox cross-check and every positional auditor should use it.

### C5 — The laterality defect the proposal predicted does not exist

The proposal says *"the records treat some as midline that are paired — that is a defect"*. Measured over all
**195** records with `origin3d`:

- `laterality: 'midline'` with `|x| > 1.0` → **0**
- `laterality: 'paired'` with `|x| < 1.0` → **0**
- `laterality: 'paired'` with `x < 0` (violating the canonical one-side convention, `types.ts:49`) → **0**

Census: 212 paired / 36 midline. So the *mechanical* laterality/sign contract is clean. The audit question
narrows to the **semantic** one — is the assignment itself right (e.g. is the interposed nucleus "paired",
is the field of Forel "midline", is the atrium "paired") — and auditors must not pad the findings file with
sign complaints that the data already satisfies.

### C6 — The cerebellum is filed under `medulla.json`, and the region exists

The proposal's brainstem task guesses "read the tree to find where cerebellum records live … telencephalon/…".
They live in **`medulla.json`**, and the `cerebellum` region has 5 taxonomy rows:

| id | taxonomy region/subdivision | authored in |
| --- | --- | --- |
| `ctx-cerebellum` | cerebellum / Cerebellar context / `midline` | `medulla.json` |
| `surf-vermis` | cerebellum / Surface landmarks / `midline` | `medulla.json` |
| `nuc-dentate` | cerebellum / Deep cerebellar nuclei / `paired` | `medulla.json` |
| `nuc-interposed` | cerebellum / Deep cerebellar nuclei / `paired` | `medulla.json` |
| `nuc-fastigial` | cerebellum / Deep cerebellar nuclei / `paired` | `medulla.json` |

`tract-scp` (midbrain) and `tract-icp` (medulla) carry cerebellar subdivisions too. "Is a record filed in the
wrong region or subdivision" is therefore a live question here — but the audited surface is `region`/
`subdivision` *values*, not which JSON file an author happened to use, unless the taxonomy row itself is wrong.

---

## 2. The refined task DAG (8 tasks, 3 phases)

```
phase 1 (parallel, 6 auditors, READ-ONLY on src/**)
  T1 audit-diencephalon ─┐
  T2 audit-brainstem ────┤
  T3 audit-telencephalon ┤
  T4 audit-vessels-nerves┤
  T5 audit-tracts-plates ┤
  T6 audit-syndromes ────┘
                          │  blockedBy: all six (the ledger must integrate the whole set at once)
phase 2
  T7 apply-corrections  ←┤  (integrator)
                          │  blockedBy: T7
phase 3
  T8 final-review       ←┘  (reviewer; falsifies T7, writes REPORT.md)
```

**Every phase-1 task is safe to run concurrently with every other.** Auditors are *read-only over the entire
repository* and write only their own two files in `docs/audit/v15/`. No two tasks share a write path, no
auditor writes `src/**`, and no auditor runs a gate that mutates state — but see the concurrency rules in §4
for the two scripts that are not concurrency-safe.

### T1 · `audit-diencephalon` — builder
- **Writes (exclusive):** `docs/audit/v15/diencephalon.findings.json`, `docs/audit/v15/diencephalon.md`
- **Reads:** `diencephalon-thalamus.json` (16), `diencephalon-hypothalamus.json` (12),
  `diencephalon-epithalamus-subthalamus.json` (14), `telencephalon-ventricles.json` (7),
  `telencephalon-ventricle-segments.json` (1) = **50 records**; `taxonomy.json` rows; `levels.json`;
  `anatomy-manifest.json` bboxes.
- **Focus:** thalamic nuclear groups and their naming (VA/VL/VPL/VPM, pulvinar, MGN/LGN, intralaminar,
  midline, ANT, MD, reticular, internal medullary lamina); epithalamus (habenula, pineal, stria medullaris,
  posterior commissure); subthalamus (STN, zona incerta, fields of Forel); hypothalamic nuclei and the
  tuberal/mammillary groups; the ventricular segments and their boundaries against thalamus, caudate,
  corpus callosum, fornix. Function/connection *direction* (thalamocortical vs corticothalamic, hypothalamic
  afferent vs efferent, mammillothalamic, hypothalamospinal). Clinical: tuberothalamic / paramedian /
  thalamogeniculate / inferolateral territories, Déjérine-Roussy, Percheron, tuberothalamic aphasia.
- **Position exemplars that must be checked:** VPL lateral to VPM; pulvinar posterior and lateral; MGN
  inferior to LGN; STN dorsomedial to the substantia nigra in its own meshes; mammillary bodies on the
  hypothalamic floor **posterior** to the infundibulum; ventricle segment boundaries.
- **Baselines handed to it:** `tract-optic-radiation` and the ventricular `levels[]` sets (see §3).

### T2 · `audit-brainstem` — builder
- **Writes (exclusive):** `docs/audit/v15/brainstem.findings.json`, `docs/audit/v15/brainstem.md`
- **Reads:** `midbrain.json` (21), `pons.json` (27), `medulla.json` (32) = **80 records**, *including* the
  5 cerebellum records (C6); `anatomy-manifest.json` bboxes for 86 nucleus parts.
- **Focus:** colliculi, tectum/tegmentum usage, red nucleus, SNc/SNr, PAG, MLF, PPRF, riMLF, INC/Cajal,
  cuneiform/subcuneiform, locus coeruleus, raphe groups, pontine nuclei, SCP/MCP/ICP, the CN nuclei and their
  columns, inferior olive + accessory olives, dorsal column nuclei, nucleus ambiguus, reticular formation
  naming; region/subdivision filing (C6); direction of every afferent/efferent claim (crossed cerebellar
  output via the SCP, uncrossed ventral spinocerebellar path, MLF role, tectospinal/reticulospinal origins);
  the full eponym list (Weber, Benedikt, Claude, Nothnagel, Parinaud, Millard-Gubler, Foville, Raymond-Cestan,
  Wallenberg, Déjerine, Jackson, hemimedullary, locked-in, one-and-a-half, INO, central Horner) with its artery;
  dorsoventral/mediolateral position of each nucleus at its level; cerebellum positioning (vermis midline,
  hemispheres lateral, deep nuclei deep).
- **Extra:** `surf-facial-colliculus` for the abducens/facial-colliculus relation; `nuc-spinal-trigeminal`
  carries `size3d` y = 15 au and its mesh y-extent is 28.6 au — check the marker, not the mesh (C4).

### T3 · `audit-telencephalon` — builder
- **Writes (exclusive):** `docs/audit/v15/telencephalon.findings.json`, `docs/audit/v15/telencephalon.md`
- **Reads:** `telencephalon-cortex.json` (10), `telencephalon-cortical-areas.json` (12),
  `telencephalon-somatotopy.json` (16), `telencephalon-basal-ganglia.json` (10),
  `telencephalon-limbic.json` (6), `telencephalon-hippocampal-subfields.json` (4),
  `telencephalon-white-matter.json` (8), `telencephalon-optic-pathway.json` (3),
  `telencephalon-cranial-nerves.json` (2) = **71 records**; plus `ctx-hemisphere-l` / `tel-white-matter-l` /
  `ctx-corpus-callosum` / `tel-lateral-ventricle-l` bboxes.
- **Focus:** Brodmann assignments; Wernicke/Broca and modern boundaries; CA1/CA2/CA3/CA4/subiculum/dentate;
  caudate head/body/tail, putamen, GPe/GPi, substantia innominata, ventral striatum/pallidum, accumbens,
  claustrum; limbic naming; corpus callosum parts, internal capsule limbs, corona radiata; optic pathway
  names and laterality. Function/connections: corticostriatal and thalamocortical loops, perforant path →
  mossy fibres → Schaffer collaterals direction, fornix direction. Clinical: bitemporal hemianopia,
  quadrantanopia, macular sparing, hemiballismus (+ nucleus and artery), language syndromes and handedness.
- **Position — highest risk area:** every cortical area's `origin3d` against the derived hemisphere ribbon;
  somatotopic ordering toe/leg medial → face/tongue lateral along precentral and postcentral; putamen lateral
  to globus pallidus, which is lateral to the posterior limb of the internal capsule; caudate head anterior
  and lateral to thalamus; caudate tail in the temporal-lobe roof; amygdala anteromedial; hippocampus medial
  temporal with dentate medial to CA fields; claustrum between putamen and insula.
- **Note:** `ctx-v1` / `ctx-v2` `levels[]` reach `lvl-tel-convexity` (y = 78) while `ctx-hemisphere-l` spans
  y −6.8…113.7, so V1/V2 at the occipital pole is *not* automatically a level defect — but the same level set
  on `tract-optic-radiation` **is** (§3).

### T4 · `audit-vessels-nerves` — builder
- **Writes (exclusive):** `docs/audit/v15/vessels-nerves.findings.json`, `docs/audit/v15/vessels-nerves.md`
- **Reads:** `vasculature.json` (14 arteries) + **`src/geometry/curves.ts` `NERVE_COURSES`** (12 courses,
  the real home — C2) + `brainstem-cranial-nerves.json` (10) + `telencephalon-cranial-nerves.json` (2) +
  the `surf-cn*-exit` landmarks + the 30 `vasc-*` manifest parts.
- **Focus — arteries:** origin/branching (ICA segments, ACA/AComA, MCA M1–M4 + lenticulostriate, PComA,
  PCA P1–P4, SCA, AICA, PICA segments, vertebral, basilar, anterior and posterior choroidal); the `territory`
  list; the `supply[]` syndrome ids resolve **and** each named syndrome truly belongs to that artery
  (cross-check the other direction with T6). **Critical exemplar:** `vasc-middle-cerebral-artery` lists
  `syn-lateral-medullary` (§3).
- **Focus — nerves:** number/name/modality (VII + nervus intermedius, XI as cranial + spinal root, I as a
  central tract), the foramen each traverses (III/IV/V1 → SOF, V2 → rotundum, V3 → ovale, VI → SOF/Dorello,
  VII/VIII → IAM, IX/X/XI → jugular foramen, XII → hypoglossal canal, I → cribriform, II → optic canal),
  the nuclei each links, laterality, and position — does each course start at its **own** exit landmark and
  pass its **own** foramen.
- **On the uniform-radius question:** the proposal expected "uniform radius across all twelve" to be a defect.
  Measured: radii are **already non-uniform, 0.42 → 1.88 au (4.5×)**, each derived in `curves.ts` from its own
  `calibreMm` at `r_au = d_mm / 2.4` (1 au = 1.2 mm): 3.0/1.0/4.5/1.9/1.9/2.8/2.0/2.4/1.5/1.8/1.7/4.0 mm. Audit
  the **calibre choice** (is 4.5 mm right for CN V, is 1.0 mm right for CN IV, are the 1.9/1.9 mm values for
  VI and VII honest given the ranges printed beside them in `docs/SWARM_V14_PLAN.md` §2), not uniformity.
  Also: `WAYPOINTS` are all inside `CLIP_BOUNDS` with **min clearance 6.00 au** — any proposed waypoint move
  must be checked against that clearance.

### T5 · `audit-tracts-plates` — builder
- **Writes (exclusive):** `docs/audit/v15/tracts-plates.findings.json`, `docs/audit/v15/tracts-plates.md`
- **Reads:** `tracts.json` (**23**, byte-identical to HEAD), `src/data/plates.json` (**15** manifests,
  **360** labelled regions) + the **15** SVGs in `src/data/plates/` (**439** `<text>` elements total, so
  ~79 are titles/axis labels, not region labels), `levels.json`.
- **Focus — tracts:** direction; origin/target and their order; decussation statement and level
  (corticospinal at the pyramidal decussation; DCML at the internal arcuate fibres; SCP crossing at the
  decussation of the SCP); somatotopy; `waypoints[]` as a continuous course that does not jump the midline or
  leave the box; `tubeRadius` against real size at 1 au = 1.2 mm (the 23 radii are already spread
  0.4–0.9 au, so again audit the *values*, not the spread); `levels[]`.
- **Focus — plates:** every labelled region points at the structure actually present at that level and plane;
  laterality convention (patient-left on image right for transverse; superior up for coronal/sagittal);
  manifest `levelId` matches the plane the SVG depicts. **Correct premise:** the 10 transverse plates all
  carry a `levelId`; the **5** plates with `levelId: undefined` are exactly `plate-sagittal-midline`,
  `plate-coronal-midbrain`, `plate-coronal-thalamus`, `plate-tel-sagittal-hemisphere`,
  `plate-tel-coronal-fornix` — and all five are `sagittal`/`coronal`, where a y-anchor is meaningless. That is
  **not** a defect; do not report it as one. (`plate-tel-axial-58` is transverse despite its "axial" title and
  correctly carries `lvl-tel-basal-ganglia`.)
- **Reference integrity is already proven clean** (so a finding here would need a different basis): 0 of 360
  plate `slug`s dangling, 0 of 26 syndrome `structures` dangling, 0 bad `levels[]` ids in tracts or structures.

### T6 · `audit-syndromes` — builder
- **Writes (exclusive):** `docs/audit/v15/syndromes.findings.json`, `docs/audit/v15/syndromes.md`
- **Reads:** `syndromes/diencephalon.json` (7) + `hindbrain.json` (11) + `midbrain.json` (8) = **26 cards**;
  every card's `structures[]` against `taxonomy.json`; `vascularTerritory` against `vasculature.json`
  `supply[]` and `territory`.
- **Schema to audit:** `{ id, name, eponym, structures[], vascularTerritory, presentation, cause, refs }`.
- **Two-way link check, with the real numbers:** 23 distinct syndrome ids appear in some artery's `supply[]`;
  **3 do not** — `syn-korsakoff`, `syn-pineal-region`, `syn-cpm` — and all three are legitimately
  non-arterial (Wernicke-Korsakoff, pineal tumour, osmotic demyelination). **0** artery `supply[]` entries
  dangle. So the *referential* check is clean and the *anatomical* check is where the work is: e.g.
  `vasc-middle-cerebral-artery.supply` contains `syn-lateral-medullary` (§3), and the reviewer of this plan
  has not attempted to judge the other 22 attributions.
- Also: duplicate/near-duplicate cards, cards whose named structures do not exist, eponyms better known under
  another name, and any `presentation` that reads as a deficit on the wrong side.

### T7 · `apply-corrections` — integrator · **blockedBy T1–T6**
- **Writes (exclusive):** `src/data/**` **minus** `load.ts` / `webRefs.ts` / `sectionImages.ts`;
  **plus `src/geometry/curves.ts`** (C2 — the nerve-course geometry); `docs/audit/v15/CORRECTIONS.md`;
  `package.json`.
- **Must not touch:** the six `docs/audit/v15/*.findings.json`/`*.md`; `scripts/verify/**`; `src/components/**`;
  `src/state/**`; `src/types.ts`; `.dsh-swarm/**`.
- **Preserve the uncommitted v14 slice.** `src/data/taxonomy.json` (14 lines), `src/data/load.ts`,
  `src/data/webRefs.ts` and `src/geometry/curves.ts` all carry v13/v14 edits that are **not** in HEAD. The
  integrator edits **on top of** them and must never `git checkout` a data file. The two new untracked
  structure files (`brainstem-cranial-nerves.json`, `telencephalon-cranial-nerves.json`) are v13 deliverables.
- Ledger rules (unchanged from the proposal, and good): one row per finding with a final disposition —
  `applied` (before → after) or `rejected` (reason); nothing silently dropped; `unverifiable-here` filed as an
  open question, never invented into a fix; conflicts between auditors resolved in the ledger with the
  stronger basis class winning (internal contradiction or named textbook > assertion).
- **Display-time changes must be declared.** `origin3d`/`size3d`/`levels`/`laterality` drive the 3D markers,
  the tree, the plate anchors and the somatotopy overlay — not any baked geometry. The committed GLBs and
  their bboxes are **frozen** (`verify:anatomy 27/27`, nothing below y = +45 may move); **no re-bake is in
  scope**. Every changed coordinate must be re-checked to lie inside `CLIP_BOUNDS`
  (`x[−58,58] y[−55,116] z[−76,72]`, `src/components/viewer3d/clipPlanes.ts:41`) and, for a nerve or tract,
  against the **6.00 au minimum clearance**.
- **Registry-first, and there is a live count to protect:** `taxonomy.json` has **248** rows = 225 authored +
  23 tract rows; `validate` prints `248 registry entr(ies) (0 awaiting authored records)`. Any new/renamed id
  needs its registry row first; the slug regex is frozen; display names are unique across `structures/` **and**
  `tracts.json` (the v14 plan records 24 validator errors from violating exactly this).
- **If a nerve record's `clinical`/`refs` changes, re-run `node .dsh-swarm/_regen-curves.mjs`** (C2), or
  `curves.ts` silently keeps the old text. If a nerve *course* changes, edit `.dsh-swarm/_curves-block.txt`
  then re-run it.
- **Gates to re-run after every edit:** `npm run validate` (must end **0 errors, 0 warnings** — it currently
  prints `✔ Validation PASSED — 0 errors, 0 warning(s)`), `check`, `build`, `verify:pipeline`,
  `verify:cranial-nerve-courses` (220 assertions), `verify:cranial-nerve-render` (47), `verify:nerve-kind`,
  `verify:somatotopy`, `verify:cortical-lobes`, `verify:view-filter-consistency`, `verify:audit-checks`.

### T8 · `final-review` — reviewer · **blockedBy T7**
- **Writes (exclusive):** `docs/audit/v15/REPORT.md`; `scripts/verify/area-toggles.mjs`;
  `scripts/verify/audit.mjs`; `scripts/verify/checks.mjs`; `scripts/verify/audit-facts.mjs` (if created);
  **plus `scripts/verify/anatomy-qa.mjs` and `scripts/verify/imaging-fit.mjs`** if it takes C3b option (b).
- **(1) Falsify the ledger:** for every `applied` row, read the file and confirm the data now says what the
  ledger claims; spot-check ≥ 30 %, and **every** critical/major row. Report every disagreement.
- **(2) Hunt for newly introduced errors:** a laterality fix that broke a neighbour relation; a renamed id
  that orphaned a reference (grep every structures/tracts/syndromes/plates file for the old id); a `levels[]`
  set that no longer matches the level table; a coordinate outside `CLIP_BOUNDS`; a nerve waypoint inside the
  6.00 au clearance; `curves.ts` drifted from the nerve records (C2).
- **(3) Re-state what could not be settled:** every `unverifiable-here` and `rejected` finding appears in
  `REPORT.md`, so the open questions survive the run.
- **(4) `docs/audit/v15/REPORT.md`:** method, per-area counts by verdict and severity, what was corrected with
  numbers, what remains open, and an explicit statement of what this audit **cannot** establish — a
  model-based review of authored text and coordinates, not a source-verified re-derivation, with no finding
  validated against imaging or a specimen.
- **(5) Add only genuinely new structural assertions** it can actually test — e.g. every syndrome's artery link
  is two-sided or explicitly justified as non-arterial; every renamed id is referenced nowhere; every
  coordinate is inside `CLIP_BOUNDS` — and **name every check it changed**. It must **not** re-point
  `area-toggles.mjs` / the preset click sites: that work is already in the tree and green (C3).
- **(6) Full non-browser sweep**, pasting the tail of each gate, and an explicit statement that the browser
  lane cannot run here (`verify:audit` exits **4**, "no check was run" — reproduced during this review).

---

## 3. Pre-existing defects already found at base (hand these to the auditors as starting points)

These four were found while verifying the proposal. They are **not** a substitute for the auditors' work —
each auditor must still cover its full record set — but they are real, they are evidenced, and two of them
directly contradict a premise in the proposal.

| # | id + field | what the data says | what it should say | basis | verdict | severity | owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **D1** | `vasculature.json` → `vasc-middle-cerebral-artery.supply` | `[syn-parkinson, syn-lateral-medullary]` | Lateral medullary (Wallenberg) syndrome is PICA/vertebral territory; the MCA supplies the lateral cerebral convexity. MCA territory never includes the medulla | **Internal contradiction** — the same `syn-lateral-medullary` card is correctly listed on `vasc-posterior-inferior-cerebellar-artery` and `vasc-vertebral-artery`; a lesion cannot be in two non-overlapping territories | wrong | **critical** | T6 (find), T4 (artery side) |
| **D2** | `tracts.json` → `tract-optic-radiation.levels` | `[lvl-midbrain-sc, lvl-post-comm, lvl-thalamus-mid, lvl-thalamus-rostral, lvl-tel-thalamostriate(y48), lvl-tel-convexity(y78)]` while the record's own `waypoints[]` span **y 14…30** (z −66…12) | y = 48 and y = 78 are **>18 au outside the record's own course**. Either the course is truncated (an LGN→V1 radiation should reach the occipital pole, near `tel-lateral-ventricle-l` y-max 59.3 and `ctx-hemisphere-l` y-max 113.7) or the level set over-claims by two anchors | **Internal contradiction** — `levels` and `waypoints` are fields of the *same record* | suspect (wrong if the audit confirms the radiation is meant to reach V1) | major | T5 |
| **D3** | 5 cerebellum records filed in `medulla.json` | `nuc-dentate`, `nuc-interposed`, `nuc-fastigial`, `surf-vermis`, `ctx-cerebellum` carry `region: cerebellum` in taxonomy but are authored in the medulla structure file | Filing location is consistent with `region`: cerebellum | **Internal contradiction (weak — file placement is not a rendered field)**. Report as `suspect`, not `wrong`; the taxonomy rows themselves may be the thing to judge | suspect | minor | T2 |
| **D4** | `taxonomy.json` → `ctx-cerebellum.laterality` | `midline`, name `"Cerebellar hemispheres and vermis (context)"` | A record that is explicitly "hemispheres **and** vermis" cannot be `midline`-only | **Internal contradiction with its own name.** Check whether the renderer treats it as a single midline context mesh (then `midline` is defensible and this becomes `ok`, documented) | suspect | minor | T2 |

Not defects, measured so no auditor wastes a finding on them:

- 0 of 195 `laterality`/`origin3d` sign contradictions (C5).
- 0 dangling ids: 360 plate slugs, 26 syndrome structures, all tract and structure `levels[]` ids resolve.
- 0 of 225 records missing `levels`; 12 records have a >14 au gap in their level set, and **all 12 are
  coherent** (vessels and CN I run through the telencephalon at y 36→58; `nuc-accumbens` 36→58 is correct;
  `tract-corpus-callosum-splenium` 28→48 is correct; `ctx-v1`/`ctx-v2` reach the occipital pole, which the
  hemisphere mesh really does occupy).
- The 5 plates with `levelId: undefined` are all sagittal/coronal (legitimate).
- The 30 records with no `origin3d`/`size3d` are geometrically represented by `course`/`waypoints`/mesh (C1).
- `size3d` smaller than a committed mesh bbox, on the 81 records that own a mesh, is the documented marker
  fallback (C4).

---

## 4. Concurrency, and the rules that keep it safe

- **Auditors are read-only on the repository.** Their ONLY writes are their two files under `docs/audit/v15/`.
  No `src/**` write, no `scripts/**` write, no `package.json`. This is what lets six of them run at once
  without clobbering each other or the atlas, and it is non-negotiable.
- **`docs/audit/v15/` does not exist yet.** Each auditor creates it (`mkdir -p`) — `mkdirSync(…, {recursive:true})`
  or an equivalent is idempotent, so concurrent creation is safe.
- **Do not run these concurrently:** `verify:pipeline` / `verify:cortical-lobes` (both shell through the section
  pipeline) and the `build`/`vite` steps. They are CPU- and disk-heavy and write to `dist/` and scratch dirs.
  Auditors should prefer `npm run validate`, `npm run check`, and direct `read`s of the JSON; the heavy sweep
  belongs to T7's and T8's serial phases.
- **Do not re-bake geometry.** No `node scripts/build-anatomy-geometry.mjs` without `--manifest`, no
  `build-mri-grid` / `build-ct-grid` / `apply-plate-fits`. The GLBs and their bboxes are frozen input, not an
  output. (`--manifest` alone is read-only and safe.)
- **`.dsh-scratch/`** holds this review's probe scripts. They are scratch; nothing depends on them.
- **T7 is a single writer for a reason.** Six auditors produce six files that frequently touch the *same*
  record from different angles (e.g. T4 and T6 both own the MCA↔Wallenberg link; T1 and T3 both own the
  ventricle/caudate relation). Only one agent may reconcile those, or the corrections will fight.
- **T8 owns `scripts/verify/**` alone**, and T7 must not touch it, so the reviewer can change a gate without a
  write conflict.

---

## 5. Verification plan (what proves the run is done)

Per-task:

| phase | gate |
| --- | --- |
| T1–T6 | their two files exist and are non-empty; the `.findings.json` **parses** and every object carries all 11 required keys (`id, area, recordId, field, claimed, expected, verdict, severity, basis, basisKind, suggestedFix, notes`); `verdict ∈ {ok, wrong, suspect, unverifiable-here}`; `severity ∈ {critical, major, minor}`; the counts in the `.md` equal the counts in the `.json` (a self-consistency check any auditor can run in 5 lines) |
| T7 | `npm run validate` → **0 errors, 0 warnings**; `check`; `build`; `verify:pipeline`; `verify:cranial-nerve-courses` (220) and `verify:cranial-nerve-render` (47); every `applied` row's before/after is present in `CORRECTIONS.md`; every `origin3d` inside `CLIP_BOUNDS`; no `nrv-*` GLB; `SECTION_PARTS` count still 138 |
| T8 | `docs/audit/v15/REPORT.md` exists; ≥30 % of `applied` rows falsified by reading the file, 100 % of critical/major; every `unverifiable-here`/`rejected` restated; the full non-browser sweep pasted with exit codes |

Run-level, at close (all must be green, with the two documented exceptions):

```
validate 0/0 · check · build · verify:pipeline · verify:plane · verify:plane-helper-extent
verify:anatomy 27/27 · verify:somatotopy · verify:cortical-lobes · verify:imaging-fit
verify:pip-contract · verify:division-toggles · verify:view-filter-consistency · verify:audit-checks
verify:closure-bite · verify:boundary-contract · verify:a11y-contract · verify:budget-report
verify:cranial-nerves · verify:nerve-kind · verify:cranial-nerve-courses · verify:cranial-nerve-render
verify:area-toggles
```

**Honest statement of what this run cannot prove here:**

- The browser lane is unavailable. `verify:audit` exits **4** — *"no check was run"* — with
  `mojo::PlatformChannel OpenProcess: Access is denied (0x5)`. `verify:acceptance` and `verify:browser` are
  the same. No agent in this run may claim a rendered-pixel, pointer or focus observation.
- `verify:anatomy` and `verify:imaging-fit` cannot complete in this sandbox (`spawnSync … EPERM` before any
  verdict). The orchestrator runs them in its own environment; **`verify:anatomy 27/27` is an
  orchestrator-lane number and must be attributed as such.**
- No finding in this audit is validated against imaging or a specimen. It is a model-based review of authored
  text and authored coordinates, cross-checked against other authored records and the committed mesh bboxes.

---

## 6. Summary of deviations from the dispatched proposal

| # | proposal said | refined to | why |
| --- | --- | --- | --- |
| 1 | "197 structure records" | **225** across 19 files; 195 with `origin3d` | `npm run validate` and an independent walk both print 225 |
| 2 | "23 tract records in `src/data/tracts.json` (+ the cranial-nerve courses added by run `run-mtzc5coc-ug6z`)" | `tracts.json` = **23, byte-identical to HEAD**; the 12 courses are `NERVE_COURSES` in **`src/geometry/curves.ts`** | `git diff` is empty; `verify:cranial-nerve-courses` asserts the disjointness; `docs/SWARM_V14_PLAN.md` §1 |
| 3 | integrator writes `src/data/`, `docs/audit/v15/CORRECTIONS.md`, `package.json` | **+ `src/geometry/curves.ts`**, and explicitly **not** `src/data/load.ts` / `webRefs.ts` / `sectionImages.ts` | otherwise nerve-course findings have no writer (deviation 2); the three excluded files carry uncommitted v14 edits |
| 4 | "TWO gates are red BEFORE this run … must be re-pointed by the final reviewer: `verify:area-toggles` and the preset click sites" | `verify:area-toggles` is **green (455/0)**; the preset click sites were **already re-pointed** by v14's `review-qa` and are in the tree. The reviewer **verifies** them and must **not** redo them | measured exit 0; the re-point helper and guard are present in the uncommitted `audit.mjs` / `area-toggles.mjs` |
| 5 | (no statement about the actually-red gates) | the red gates are `verify:anatomy` and `verify:imaging-fit`, both `spawnSync … EPERM`, and the reviewer picks one of two named dispositions and says which | full sweep exit codes; `README.md` tier 2 |
| 6 | "is `size3d` plausible for the real structure"; "cross-check … mesh bboxes" | `size3d` is the **marker radius fallback**, used only when a record has no GLB — so only the **114** mesh-less records can carry a `size3d` finding; the **81** id-matched mesh records are a legitimate cross-check surface | `src/types.ts:50`, `NucleusMesh.tsx:184` |
| 7 | "the records treat some as midline that are paired — that is a defect" | measured **0** such contradictions; the audit question is the *semantic* assignment, not sign mechanics | 195-record probe |
| 8 | brainstem auditor guesses "read the tree to find where cerebellum records live … telencephalon/…" | they are in **`medulla.json`** (5 records), region `cerebellum` | counted |
| 9 | "any plate whose `levelId` mismatches the plane" (implied defect) | the **5** `levelId: undefined` plates are all sagittal/coronal and that is **correct**; the 10 transverse plates all carry a `levelId` | counted |
| 10 | "uniform radius across all twelve is a defect" | radii are **already 0.42–1.88 au (4.5×)**, each from its own `calibreMm`; audit the calibre values instead | `src/geometry/curves.ts` |
| 11 | one gate list, no concurrency rules | added: which scripts are **not** concurrency-safe (`verify:pipeline`, `verify:cortical-lobes`, `build`), and the auditors' read-only rule | the six auditors run in one phase |

Unchanged and endorsed from the proposal: the 8-task shape and its roles, the evidence-discipline rules, the
`ok|wrong|suspect|unverifiable-here` verdict enum, the `critical|major|minor` severity enum, the per-finding
JSON schema and one-file-per-auditor output, "auditors do not edit the data", the integrator's ledger
dispositions including conflict arbitration, the reviewer's ≥30 % / 100 %-of-critical falsification duty, and
the explicit exclusion of the browser lane.
