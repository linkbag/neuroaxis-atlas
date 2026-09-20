# NeuroAxis v14 — cranial nerves as traveling tracts: research, author course geometry, render in 3D and 2D sections

**Authority.** The run's executable contract is [`PLAN.md`](../PLAN.md) at the repo root (written by the
architect before any edit; every base measurement in it was produced in this checkout at `a530dff`). This file
is the run's archived plan **and closure**: §1–§4 record the contract's decisions where the closure needs them,
and **§5–§12 are the closure**, written by the integrator after the full non-browser sweep in §8. Nothing in
this file is a browser observation unless it says so, and every number in it was printed by a command run
here — the two numbers the integrator measured independently of the builders are marked **[integrator]**.

**The ask.** The twelve cranial nerves were records with `meshes: false` and schematic ellipsoid placement
markers — which is why the user saw *blobs*. A cranial nerve is a bundle that **leaves the brainstem at a
root point, crosses the cistern, traverses a named skull-base foramen and reaches its target**: that is a
Catmull-Rom path with a radius, i.e. the project's existing `TractRecord` / `TractTube` mechanism, not an
ellipsoid. v14 gives the twelve **real course geometry** and makes it show up in the 3D view **and** the 2D
live section (and therefore the PiP).

**What existed before this run (verified, not re-invented).** The twelve `nrv-*` records (v13) with their
regions, functions, clinical items and refs; the cranial-nerve **nuclei** with authored `origin3d`
(`nuc-oculomotor`, `nuc-trochlear`, `nuc-trigeminal-motor`, `nuc-abducens`, `nuc-facial`, `nuc-ambiguus`,
`nuc-hypoglossal`, `nuc-spinal-trigeminal`, `nuc-solitary`/`nuc-dmv` groups); the **exit landmarks**
`surf-cn3-exit` … `surf-cn12-exit` (10 records — there is no `surf-cn1-exit` and no `surf-cn2-exit`); CN II's
committed v8 meshes (`tract-optic-nerve` / `ctx-optic-chiasm` / `tract-optic-tract`); `src/data/tracts.json`
(23 tracts), `src/geometry/curves.ts` (`toCatmullRom`), `src/components/viewer3d/TractTube.tsx` (tapered
elliptical tube, 72 × 10 sweep, cached per tract id), and `sectionAssets.ts` +
`contourWorker.ts` (commit-bed GLB parts, `registryPartFromGeometry(meta, geometry)` already accepting an
arbitrary `BufferGeometry`).

**The run.** architect contract → two parallel builders (`cranial-nerve-courses`: the gate + the probe table;
`cranial-nerve-render`: the courses, the 3D tube pass, the procedural section parts) → adversarial review
(`review-qa`: re-pointed three gates that went stale on v14 and falsified four builder claims) → this
integration (npm wiring, documentation with measured numbers, full non-browser sweep). Commit at base:
`a530dff` (v12h) plus the uncommitted v13 slice.

---

## 1. Where the courses live, and why not where the brief said

The brief named `src/data/tracts.json` as the course container. The `course-author` task **built that first
and withdrew it on measurement** (reported in `.dsh-swarm/task-cranial-nerve-courses.json`):

| attempt | what the measurement said |
| --- | --- |
| reuse the nerve ids (`nrv-cn3-oculomotor`, …) as tract ids | **24 validator errors** — `validate-data.mjs` `claimIdentity` keeps **one** id ledger across `structures/` and `tracts.json`, so the second record is a duplicate id *and* a duplicate display name |
| give the courses their own ids (`tract-cn*-course`) | needs 12 new registry rows **and still draws every course twice**, because the courses already ship once in `src/geometry/curves.ts` (`NERVE_COURSES`), which the 3D pass and the 2D `SECTION_NERVE_PARTS` both import; it would also put the nerves in the **Tracts** collection, where the Systems row's *Cranial nerves* toggle does not reach them |

**Shipped location:** `src/geometry/curves.ts`, `NERVE_COURSES: readonly NerveCourseRecord[]` — a superset of
`TractRecord` (`region`, `kind: 'nerve'`, `foramen`, `anchorId`, `anchorNote`, `calibreMm`, `clinical`,
`refs`). `src/data/tracts.json` is **byte-identical to base** (`git diff` empty) and still holds **23** tracts;
the 12 courses are a **separate collection**, so `view-filter-consistency`'s 23-tract assertions stay valid.
The migration point (`NerveCourseRecord` → `src/types.ts`, `NERVE_COURSES` → `src/data/structures/nerve-courses.json`,
`load.ts` exporting `nerveCourses`) is documented in the file header and in `.dsh-swarm/_regen-curves.mjs`.

---

## 2. The twelve-row anatomy table (printed by `npm run verify:cranial-nerve-courses`, 220/0)

Every number below was printed by the gate; **`len au` is the published CHORD length** (the sum of straight
segments between waypoints) and **`drawn au` is the Catmull-Rom arc length the tube actually integrates** —
[integrator] re-measured with the shipped `toCatmullRom` (centripetal, tension 0.5; `.dsh-scratch/length-reconcile.mjs`).
The `root au` column is the course's **first waypoint**: for ten nerves that is the committed nucleus
`origin3d` (CN XI starts on `nuc-ambiguus`), for CN I it is the epithelium and for CN II the orbital end of
the committed optic-nerve chain.

| nerve | root au (1st waypoint) | anchored on (deviation) | foramen | target | wp | len au | len mm | drawn au | drawn mm | r au | calibre mm (source) | min clearance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **CN I** Olfactory `nrv-cn1-olfactory` | [11, 9, 66] | record `origin3d` [8, 12, 48] — **chain END**, 0.000 au | cribriform plate | olfactory bulb → tract → primary olfactory cortex | 5 | 18.51 | 22.2 | 18.52 | 22.2 | **0.71** | 1.7 (fila-olfactoria bundle complex) | 6.00 |
| **CN II** Optic `nrv-cn2-optic` | [26, 16, 57] | committed `tract-optic-nerve` first [11, 19, 33] and last [2, 23.5, 23.5], each 0.000 au; interior worst 6.595 au (bound 8) | optic canal | optic chiasm → optic tract → LGN | 5 | 42.42 | 50.9 | 42.69 | 51.2 | **1.67** | 4.0 (3.5–4.5 mm range) | 15.00 |
| **CN III** Oculomotor `nrv-cn3-oculomotor` | [0, 14, −4] | `nuc-oculomotor` origin3d 0.000 au; `surf-cn3-exit` [2, 9.5, 8.5] = waypoint 3, 0.000 au | superior orbital fissure | superior/medial/inferior recti, inferior oblique, levator palpebrae; ciliary ganglion | 6 | 44.23 | 53.1 | 44.63 | 53.6 | **1.25** | 3.0 (range 2.6–3.5) | 34.00 |
| **CN IV** Trochlear `nrv-cn4-trochlear` | [0, 8, −5] | `nuc-trochlear` 0.000 au; `surf-cn4-exit` [1.5, 7.5, −8] = waypoint 3, 0.000 au | superior orbital fissure | contralateral superior oblique | 7 | 41.21 | 49.5 | 42.10 | 50.5 | **0.42** | 1.0 (range < 1 mm) | 35.00 |
| **CN V** Trigeminal `nrv-cn5-trigeminal` | [4, −8, 4] | `nuc-trigeminal-motor` 0.000 au; `surf-cn5-exit` [7, −8, 6] = waypoint 2, 0.000 au | foramen ovale | face and anterior scalp (sensory); muscles of mastication, tensor tympani, mylohyoid, anterior digastric | 7 | 30.64 | 36.8 | 30.85 | 37.0 | **1.88** | 4.5 (range 4–5) | 34.00 |
| **CN VI** Abducens `nrv-cn6-abducens` | [1.5, −18, −4] | `nuc-abducens` 0.000 au; `surf-cn6-exit` [2.5, −24, 7.5] = waypoint 3, 0.000 au | superior orbital fissure | lateral rectus | 8 | 51.85 | 62.2 | 52.44 | 62.9 | **0.79** | 1.9 (range 1.4–2.5) | 31.00 |
| **CN VII** Facial `nrv-cn7-facial` | [4, −19, −2] | `nuc-facial` 0.000 au; `surf-cn7-exit` [6.5, −23, −3] = waypoint 2, 0.000 au | internal acoustic meatus | muscles of facial expression, stapedius, stylohyoid, posterior digastric; taste | 8 | 52.94 | 63.5 | 54.88 | 65.9 | **0.79** | 1.9 (range 1.3–2.6) | 31.00 |
| **CN VIII** Vestibulocochlear `nrv-cn8-vestibulocochlear` | [3.5, −14, −5.5] | `nuc-vestibular-medial` 0.000 au; `surf-cn8-exit` [6.8, −22, −4.5] = waypoint 3, 0.000 au | internal acoustic meatus | cochlear nuclei (ventral and dorsal) and the four vestibular nuclei | 8 | 48.64 | 58.4 | 49.56 | 59.5 | **1.17** | 2.8 (range 2.5–3.1) | 29.00 |
| **CN IX** Glossopharyngeal `nrv-cn9-glossopharyngeal` | [3.5, −31, −4] | `nuc-ambiguus` 0.000 au; `surf-cn9-exit` [5, −31, 4.5] = waypoint 2, 0.000 au | jugular foramen | stylopharyngeus, parotid gland, carotid body and sinus; taste | 7 | 40.82 | 49.0 | 41.56 | 49.9 | **0.83** | 2.0 (range 1.8–2.3) | 24.00 |
| **CN X** Vagus `nrv-cn10-vagus` | [2, −32, −7] | `nuc-dmv` 0.000 au; `surf-cn10-exit` [5, −34, 4.5] = waypoint 3, 0.000 au | jugular foramen | pharyngeal and laryngeal muscles, thoracic and abdominal viscera | 8 | 44.31 | 53.2 | 44.95 | 53.9 | **1.00** | 2.4 (range 2.0–2.9) | 21.00 |
| **CN XI** Accessory `nrv-cn11-accessory` | [3.5, −31, −4] | `nuc-ambiguus` 0.000 au; `surf-cn11-exit` [6, −43, 2] = waypoint 3, 0.000 au | jugular foramen | sternocleidomastoid and trapezius | 8 | 48.93 | 58.7 | 49.57 | 59.5 | **0.63** | 1.5 (range 1.0–2.0) | 12.00 |
| **CN XII** Hypoglossal `nrv-cn12-hypoglossal` | [0, −31, −4] | `nuc-hypoglossal` 0.000 au; `surf-cn12-exit` [3.5, −32, 6.5] = waypoint 3, 0.000 au | hypoglossal canal | all intrinsic tongue muscles and genioglossus, hyoglossus, styloglossus | 7 | 36.11 | 43.3 | 36.44 | 43.7 | **0.75** | 1.8 (range 1.4–2.4) | 13.00 |
| **TOTAL** | 84 waypoints | 10/10 exit landmarks at **0.000 au** (tolerance 2.0) | 12/12 name a foramen | 12/12 inside `CLIP_BOUNDS` | **84** | **500.62** | **600.7** | **508.20** | **609.8** | 0.42–1.88 | r = d_mm ÷ 2.4 at 1 au = 1.2 mm | **min 6.00 au** |

**The radius conversion, stated once.** 1 au = 1.2 mm, so `r_au = (d_mm / 2) / 1.2 = d_mm / 2.4`. The gate
re-derives every radius from its own `calibreMm` field and asserts equality with the §3.4 table
(3.0/1.0/4.5/1.9/1.9/2.8/2.0/2.4/1.5/1.8/1.7/4.0 mm → 1.25/0.42/1.88/0.79/0.79/1.17/0.83/1.00/0.63/0.75/0.71/1.67 au).
The mm figures are **cisternal-segment calibres** (dissection / high-resolution-MRI ranges, `PLAN.md` §3.4);
the range is printed beside each in the table above so the choice inside it is auditable. The set is genuinely
non-uniform — CN IV 0.42 au against CN V 1.88 au, a 4.5× spread.

**One datum to be honest about:** `PLAN.md` §3.4 lists **1.9 mm for both CN VI and CN VII**, though the ranges
it prints beside them are 1.4–2.5 mm and 1.3–2.6 mm. The shipped table follows the plan's point values, and
the gate asserts that agreement; the two nerves therefore share `r = 0.79 au`. It is a plan-level rounding
choice, not a fabrication, and it is stated here rather than silently normalised.

**The one measurement discrepancy in the run, kept visible.** The gate prints and this table publishes the
**chord** sum **500.62 au = 600.74 mm**; the drawn Catmull-Rom tube is **508.20 au = 609.84 mm** — a **1.5 %**
understatement (per-nerve ratio 1.000 … 1.037, worst CN VII). Both figures are in the table; the `PLAN.md`
§3.3 estimate of 475.79 au was also a chord reading and was lower still because the chains grew during
authoring. **[integrator]**, measured with the shipped curve object at the default arc-length divisions and
re-checked at 2,000 divisions (508.22 au — converged).

---

## 3. What changed, file by file (the two builders' combined delta)

| file | change |
| --- | --- |
| `src/geometry/curves.ts` | **+`NERVE_COURSES`** — the twelve `NerveCourseRecord`s (84 waypoints, `foramen`, `anchorId`/`anchorNote`, `calibreMm`, `tubeRadius`, clinical, refs); `NERVE_COURSE_IDS`, `nerveCourseById`, `hasNerveCourse`. `toCatmullRom` unchanged |
| `src/components/viewer3d/TractTube.tsx` | `buildTractGeometry` and `tubeGeometryFor` **exported** (no behaviour change), so the 2D registry sweeps the *same* geometry the 3D scene draws |
| `src/components/viewer3d/SceneLayers.tsx` | **the toggle defect, fixed at the line that held it**: `isTractVisible` now passes the record's **own registry kind** (`const kind = entry?.kind ?? 'tract'`) instead of the literal `'tract'` — the mis-gating the brief warned about (**the brief's `kinds.has('tract')` inside `visibleTracts` does not exist**; `PLAN.md` §2.1 corrected it). Added `nerveCoursesVisible(courses, layers)` and the nerve-course pass, one `<TractTube>` per course. The structure pass returns `null` for `hasNerveCourse(record.id)` — **the blob is retired, one record one body** |
| `src/components/section/sectionAssets.ts` | `SECTION_NERVE_PARTS` (12 meta rows, `taxonomyKind: 'nerve'` so `isPartVisible` gates them), `partsForCanvas()` = `SECTION_PARTS` (**still 138**) + `SECTION_NERVE_PARTS`, `registryNerveParts()` = the 12 tubes through the **existing** `registryPartFromGeometry(meta, tubeGeometryFor(course))` |
| `src/components/section/SectionCanvas.tsx` | the two call sites read `partsForCanvas()` (visible list) and append `registryNerveParts()` to the worker registry message. `PipSection` mounts `<SectionCanvas />` with no props, so the PiP inherits it |
| `src/components/Header.tsx` · `Legend.tsx` · `KindGlyph.tsx` · `NucleusMesh.tsx` · `styles/tokens.css` · `src/types.ts` · `src/data/load.ts` · `scripts/validate-data.mjs` | **the v13 kind slice, already in the tree at base** (`nerve` as the seventh kind, `nrv-` prefix, `KIND_LABELS.nerve = 'Cranial nerves'`, glyph `✦`, `--kind-nerve: #14b8a6`) — this run consumes it and adds no declaration site |
| `scripts/verify/cranial-nerve-courses.mjs` **(new)** | 220 assertions · 0 failed — the record/anchor/radius/bounds/foramen gate **and the probe table** |
| `scripts/verify/cranial-nerve-render.mjs` **(new)** | 47 assertions · 0 failed — the 3D tube list, the kind gating truth table, the 2D registry parts, the worker-computed contours, XOR-with-the-blob, payload |

---

## 4. The section mechanism: procedural (route a), with the payload arithmetic

**Route (b) — bake the tubes into GLB parts — is rejected by measurement, not taste.**

| reading | value |
| --- | --- |
| one tube at `TractTube`'s parameters (72 tubular × 10 radial) | **803 verts / 1,440 tris** per nerve |
| **12 tubes raw** (position + normal + uv + Uint32 indices) | **412,032 B = 402.4 KiB = 0.3929 MiB** |
| **12 tubes quantized** (16-bit position, 8-bit octahedral normal, 16-bit uv, 16-bit indices) | **180,768 B = 176.5 KiB = 0.1724 MiB** |
| 24 tubes (baked left **and** right) quantized | **0.3448 MiB** |
| **the binding budget** — `src/assets/anatomy/` directory, `140` files | **14,566,178 B = 13.8914 MiB**; cap 14 MiB ⇒ **headroom 113,886 B = 0.1086 MiB** |
| the manifest reading — `Σ stat(parts[].file)`, `138` parts | 14,486,228 B = 13.8151 MiB ⇒ headroom **0.1849 MiB** |
| **verdict, 12 tubes quantized** | **1.59× the binding headroom** → DOES NOT FIT |
| **verdict, 12 tubes raw** | **3.62×** → DOES NOT FIT |
| **verdict, 24 tubes quantized** | **3.17×** → DOES NOT FIT |
| **route (a), procedural** | **0 B** — the payload stays byte-identical |

**[integrator]** — measured with the shipped `tubeGeometryFor` over the shipped `NERVE_COURSES`
(`.dsh-scratch/bake-probe.mjs`), and the budget measured on disk (`verify:budget-report` agrees: 13.82 MiB of
parts, 13.89 MiB of tree, 140 files). The architect's estimate (34.5 KiB raw / 21.6 KiB quantized per tube ⇒
24 tubes = 0.809 / 0.506 MiB, i.e. 4.7× / 2.3×) and this measurement bracket the same answer: the bake misses
by **1.6× at best**, before the second manifest part, the JSON chunk, or any left/right duplication.

**Route (a) chosen, and it is honest here** because `registryPartFromGeometry(meta, geometry)` already takes
an arbitrary `BufferGeometry` — the worker was never promised *committed* GLB geometry, it is handed
positions + indices and asked for contours. The 3D tube and the 2D contour therefore come from **one**
`tubeGeometryFor` call site pair, so the section slices exactly the geometry on screen. Costs: **0 bytes on
disk**, 12 extra registry entries per worker message, 9,636 verts / 17,280 tris of procedural geometry
(cache-shared with the 3D pass). `SECTION_PARTS` stays **138** and no committed GLB, manifest row or bbox moved
(`git status --porcelain -- src/assets/anatomy` is empty; `verify:anatomy`'s nine frozen `BRAINSTEM_GLBS` are
untouched).

---

## 5. Surface parity — the evidence for 3D and for 2D

**3D (`verify:cranial-nerve-render` §1–§2, `verify:cranial-nerve-courses` §8).** 12 tubes are mounted, one per
course. The kind-gating truth table is executed through the **shipped** `isTractVisible`:

| layer state | tracts shown | nerve courses shown |
| --- | --- | --- |
| everything on | 23/23 | **12/12** |
| tract kind **off** | 0/23 | **12/12** |
| nerve kind **off** | 23/23 | **0/12** |
| both off | 0/23 | 0/12 |
| midbrain area off | 19/23 | 10/12 |
| a preset-hidden id | — | 11/12 |

That is the exact "wrong toggle" defect the brief named, proven fixed in both directions: the *Tracts* toggle
no longer reaches the nerves, and the *Cranial nerves* toggle reaches **exactly** the twelve and nothing else.

**2D live section and PiP (`verify:cranial-nerve-render` §3, `verify:cranial-nerve-courses` §9).** The section
registry gains **12 parts** (803 verts / 1,440 tris each, `maxIndex 802 < 803`). The **shipped worker
machinery** — `partBounds`, `boundsMayCut`, `extractContours` from `contours.ts` — was run over the parts:
**38 planes, 121 closed loops, 0 malformed or non-finite values, ≥ 1 crossing plane with ≥ 1 loop for every
nerve.** The courses gate sweeps three orthogonal plane sets per nerve: **576 crossing planes → 689 contour
loops** (per nerve: CN I 27 planes/21 loops … CN VII 54/76; per-axis tables printed). `partsForCanvas()` = 138
committed + 12 procedural = **150**, and the nerve toggle flips exactly those 12 (`verify:area-toggles` §11;
**455 assertions · 0 failed**, including that the committed 138 admissions are byte-identical with the toggle
on and off).

**One body per nerve.** The XOR table prints `tube(3D) = yes` **and** `marker would-draw = no` **and**
`section part = yes` for all twelve, and `hasNerveCourse(id)` is true for exactly the 12 course ids and false
for a real tract.

---

## 6. What did **not** ship, and why — stated, not dropped

| # | item | the honest statement |
| --- | --- | --- |
| 1 | **CN II draws a second optic nerve** | `nrv-cn2-optic` is the one nerve with committed meshes: its authored tube (AABB x[0.3, 27.7] y[14.3, 25.2] z[21.8, 58.7], measured by `review-qa`) overlaps the baked `tract-optic-nerve-l` GLB (x[0.8, 27.0] y[−5.1, 16.2] z[16.7, 63.2]) by **26.2 / 1.9 / 36.8 au**. The brief says CN II "keeps its existing treatment"; the shipped course gives it a tube, and the mesh belongs to a **different** record (`tract-optic-nerve`), so both bodies render. **This is the one place where v14's own duplicate-body rule is not satisfied**, and the fix is a data decision (drop CN II's tube and let the committed mesh stand, or retire the pathway record's role in this view) that needs a unit whose write scope covers `curves.ts`. |
| 2 | **the twelve `contextNote`s still describe the retired ellipsoid** | Each record's `contextNote` still reads "the ellipsoid at `origin3d` … is a SCHEMATIC placement" — geometry that **no longer renders**. `src/data/structures/*-cranial-nerves.json` was outside every v14 write scope, so this is reported, not silently edited. The *data model* it describes is still true (`meshes: false`, sized placement, no manifest part) and the **authored-path honesty statement does ship** — in each course's `anchorNote` (432–692 chars), asserted in both halves by the courses gate ("nothing behind … is a segmented scan" / "are NOT authored"). |
| 3 | **the published length understates the drawn tube by 1.5 %** | The gate prints the chord sum 500.62 au; the drawn tube is 508.20 au (§2). Both are now published together. |
| 4 | **CN I has no brainstem root and no exit landmark** | Its chain runs anterior → posterior: epithelium **[11, 9, 66]** → bulb/tract → and **ends** on its own committed `origin3d` **[8, 12, 48]** at 0.000 au. Nothing behind the anterior end is committed geometry — the gate says so out loud rather than pretending an anchor exists. |
| 5 | **CN II's declared anchor is not the anchor it is measured against** | `anchorId` names `surf-optic-chiasm` [0, 29, 10], which disagrees with the committed mesh by ~7 au (`PLAN.md` §2.7); the gate therefore measures the chain against the committed `tract-optic-nerve` waypoints (0.000 au at both ends, worst interior 6.595 au) and prints that distinction. The stale `anchorId` is a one-field data fix outside this run's scope. |
| 6 | **`verify:anatomy` 27/27 and `verify:imaging-fit` cannot run here** | Both die on the documented sandbox boundary — `spawnSync powershell EPERM` at `anatomy-qa.mjs:294` and `spawnSync node.exe EPERM` at `imaging-fit.mjs:92`, **before any verdict**, red at base. The blocked anatomy measurement was re-run **directly** and returns **14,566,178 B**, i.e. the gate's own subject is measurable and unchanged; the 27 item verdicts are **not** claimed. |
| 7 | **the four stale copies of the frozen slug regex** | `docs/DATA_CONTRACT.md:90` (and its stale bounds table `:106-108`), `docs/CONTENT_INVENTORY.md:59` (updated this run — AMENDMENT D), `docs/ENGINEERING_PLAN.md:229`, `docs/SWARM_V9_PLAN.md:40` still state the six-prefix contract. `DATA_CONTRACT`/`ENGINEERING_PLAN`/`SWARM_V9_PLAN` were outside this task's exclusive write scope; carried forward. |
| 8 | **browser-visible behaviour** | Not claimed by any gate in this run — see §7. |

---

## 7. Claim tiers — orchestrator-browser-verified versus non-browser-only

**Proven here, by execution (non-browser).** The twelve records: waypoints ≥ 3, finite positive
`tubeRadius` equal to `calibreMm / 2.4`, the exit landmark carried as a **literal waypoint at 0.000 au**,
the documented foramen named **and present in the record's own course sentence**, every waypoint inside
`CLIP_BOUNDS` with a printed minimum clearance (6.00 au), no duplicate ids, and all required
direction/modality/origin/target/decussation/function/clinical/levels/refs content. The 3D pass: `SceneLayers`
filters the courses through the **same** `isTractVisible`, which reads the record's **own** kind, and the
structure pass drops a record that has a course. The 2D pass: the registry part exists per nerve and the
**worker's own** contour machinery computes its loops on the crossing planes. The payload: unchanged.

**Orchestrator-only (Chrome cannot start in this sandbox — exit 4, "no check was run").** That the 3D scene
actually **paints** the twelve tubes; that the Systems row's *Cranial nerves* button shows/hides exactly them
**on screen**; that the live section and the PiP **paint** the nerve contours; that click-select works on both
surfaces; the frame-time cost of 17,280 extra triangles. `verify:audit` **R3b** was deliberately re-pointed by
`review-qa` from "the Plates hash is invariant to the nerve toggle" (true through v13) to "the hash **changes**
and round-trips" — that assertion is the browser proof of 2D parity and only the orchestrator can run it.

**Not claimed at all:** `verify:acceptance`, `verify:browser`, and the `verify:anatomy` 27 item verdicts.

---

## 8. The integrator's sweep — every gate, with its exit code and its printed tail

Run from the repo root on this tree (base `a530dff` + the v13 slice + v14). Commands are the exact npm lines
from the brief; the two new gates are quoted through their **new npm scripts**, which is also the proof that
the wiring in §10 works.

| gate | exit | the tail it printed |
| --- | --- | --- |
| `npm run validate` | **0** | `kinds registry: nucleus 88 · tract 53 · ventricle 11 · surface 25 · vessel 14 · context 45 · nerve 12 (7 kinds) Σ 248` · `structures 19 file(s), 225 record(s)` · `tracts 23 record(s)` · `✔ Validation PASSED — 0 errors, 0 warning(s)` |
| `npm run check` | **0** | `tsc --noEmit` — silent, exit 0 (the exhaustive `Record<Kind, …>` maps are the coverage proof) |
| `npm run build` | **0** | `dist/assets/index-C4e4m6MI.js 1,653.41 kB │ gzip: 376.86 kB` · `✓ built in 9.08s` |
| `npm run verify:pipeline` | **0** | `plane z= 40 tris 210620 seg 1346 loops 8 parts 7/138` · `pipeline: 138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)` · `PASS section pipeline` |
| `npm run verify:plane` | **0** | `C. levels 17 anchors · nearestLevelTo + snapClipWrite + pickImageForPlane` · `✔ plane transform QA PASSED — 10827 assertions` |
| `npm run verify:anatomy` | **1** | `### 3. BUDGETS` then `Error: spawnSync powershell EPERM … at scripts/verify/anatomy-qa.mjs:294:18` — **environment, 0 verdicts**; the blocked command re-run directly returns `14566178` |
| `npm run verify:somatotopy` | **0** | `ok src/data/load.ts wires somatotopyTreeOrder into the tree child sort` · `45 passed · 0 failed` |
| `npm run verify:cortical-lobes` | **0** | `pipeline: 138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)` · `cortical-lobes: 564/564 assertions passed` |
| `npm run verify:imaging-fit` | **1** | `recomputing with: node scripts/fit-imaging-affine.mjs --json` · `FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM` — **environment, 0 assertions** |
| `npm run verify:pip-contract` | **0** | `✔ simulated-section panel contract PASSED` (its "not claimed" list names pixels, real pointer drags, reload persistence — orchestrator lane) |
| `npm run verify:division-toggles` | **0** | `store instances imported: 2 (each re-runs the store's own load-time assertions)` · `251 assertions passed · 0 failed` |
| `npm run verify:view-filter-consistency` | **0** | `swept 138 parts · 225 structures · 23 tracts · 10 slots · 2 ghost shells · 7 regions × 7 kinds · 5 planes × 2 ribbons` · `548 cross-surface state comparisons` · `102/102 assertions passed` |
| `npm run verify:area-toggles` | **0** | `the manifest still holds 138 parts and no nrv-*.glb exists — route (a) costs 0 bytes` · **exit 0** — see §9 |
| `npm run verify:audit-checks` | **0** | `92 passed · 0 failed · 7 informational · 9 group(s)` · `✔ Node-only audit check mirror PASSED` |
| `npm run verify:closure-bite` | **0** | `✓ the shared tree is byte-identical: every mutation happened in the copy` · `✓ the restored copy re-runs green (92 passed · 0 failed)` · `7/7 mutations caught` |
| `npm run verify:boundary-contract` | **0** | `the live-section boundary is layout-transparent (style={{ display: "contents" }})` · `22 passed · 0 failed` |
| `npm run verify:a11y-contract` | **0** | `favicon declared (/favicon.svg) … the last console 404 is gone` · `38 passed · 0 failed` · `shipped bundle spot check: dist/assets` |
| `npm run verify:budget-report` | **0** | `Σ parts[].triCount = 599,204 triangles · largest ctx-hemisphere-r 81,448` · `Σ stat(part.file) = 14,486,228 B (13.82 MiB)` · `whole committed asset tree: 13.89 MiB in 140 file(s)` · `5 passed · 0 failed` · `✔ budget report PASSED` |
| `npm run verify:cranial-nerves` | **0** | `passed 451 · failed 0 · printed measurements 16` · `nerve records 12/12 (meshes:false 12/12, placed 12/12)` · `manifest parts added 0 (manifest still 138)` |
| `npm run verify:nerve-kind` | **0** | `manifest: 138 parts · 138 GLBs` · `79 passed · 0 failed` · `✔ NERVE-KIND GATE PASSED` |
| **`npm run verify:cranial-nerve-courses`** *(new)* | **0** | `courses verified 12/12 · assertions run 220 · failures 0` · `500.62 au = 600.74 mm of authored path · all waypoints inside CLIP_BOUNDS (min clearance 6.00 au) · 12 tubes gated by kind "nerve" · 689 section contour loops the worker computes` |
| **`npm run verify:cranial-nerve-render`** *(new)* | **0** | `nerve-render: 12 courses · 3D tubes 12/12 (nerve kind off 0, tract kind off 0 tracts hidden) · 2D parts 12 · 121 contour loop(s) over 38 planes · 47/47 assertions` · `PASS cranial nerves render as traveling tracts in 3D and in the live section` |
| `npm run verify:plane-helper-extent` *(extra, in the tier list)* | **0** | `plane-helper-extent: 206 passed · 0 failed — exit 0` |

**All 22 gates — the brief's 20 plus the 2 new ones — plus one extra (`verify:plane-helper-extent`, which is in
the README tier list): 23 green · 2 environment-red (`verify:anatomy`, `verify:imaging-fit`) · 0 product-red.** Total assertions the Node
lane executed on this tree: `validate` (0 errors) · `plane` 10,827 · `somatotopy` 45 · `cortical-lobes` 564 ·
`division-toggles` 251 · `view-filter-consistency` 102 · `area-toggles` 455 · `audit-checks` 92 · `closure-bite`
7 (mutations caught) · `boundary-contract` 22 · `a11y-contract` 38 · `budget-report` 5 · `cranial-nerves` 451 ·
`nerve-kind` 79 · `cranial-nerve-courses` 220 · `cranial-nerve-render` 47 · `plane-helper-extent` 206.

---

## 9. The gates that were known-red before this round

| item | state after this run |
| --- | --- |
| `verify:area-toggles` | **exit 0 — 455 assertions · 0 failed · 14 groups.** The brief's "known-red" note was **stale even at base**: `review-qa` re-pointed §11 to v14's truth (canvas = 138 committed + 12 procedural; nerve toggle on 12/12, off 0/12; committed admissions byte-identical) and added a dead-click guard (4/4 mutated variants caught). The 25 pre-v12 header failures are gone, and the product was **not** bent back to the stale expectation. |
| the four preset click sites in `verify:audit` | Re-pointed at v13 through `restoreDefaultFraming()` and now **guarded** by the area-toggles dead-click guard; `verify:audit` itself needs Chrome and stays orchestrator-only. |
| the v11 item-4 divergence (canvas paints divisions the rule excludes at y = 6/26/30/32) | **Closed with numbers — parity 6/6.** Executing the canvas' own `buildLobeLayer` over **both** committed ribbons gives, for all four named planes, `rule == canvas`, e.g. `y=6 [frontal limbic occipital parietal temporal]` on both sides. The v11 reading had sliced the left ribbon only; the product was not changed. |

---

## 10. `package.json` wiring (the integrator's file)

```diff
-    "verify:closure-bite": "node scripts/verify/closure-bite.mjs"
+    "verify:closure-bite": "node scripts/verify/closure-bite.mjs",
+    "verify:cranial-nerves": "node scripts/verify/cranial-nerves.mjs",
+    "verify:nerve-kind": "node scripts/verify/nerve-kind.mjs",
+    "verify:cranial-nerve-courses": "node scripts/verify/cranial-nerve-courses.mjs",
+    "verify:cranial-nerve-render": "node scripts/verify/cranial-nerve-render.mjs"
```

Four lines **added to the end of the alphabetical block**, one trailing comma on the previously-last
`closure-bite` line; **nothing pre-existing was renamed, reordered or removed**, and no other key in the file
changed. Both new scripts were then executed **through npm** (§8) so the wiring itself is tested, not asserted.

---

## 11. Documentation updated by this task

| file | change |
| --- | --- |
| `README.md` | new **v14 — the cranial nerves as traveling tracts** section: the twelve-row table, the 3D/2D parity evidence, the payload arithmetic, and an **honest-limits** entry stating that the courses are **authored paths through documented landmarks** (root → cistern → foramen → target), **not segmented scans**, with CN I and CN II stated separately. The Features bullets and the v13 honest-limit that said "the 2D live section and the PiP do not react to this toggle" are corrected — that statement is now false. |
| `docs/CONTENT_INVENTORY.md` | **AMENDMENT D** — the twelve course records as a *new* collection (with the provenance of every geometry number: authored waypoints, the committed anchors, the procedural tube, `0 B` of new payload), plus the correction of the two v13 lines that said the nerve slice reaches neither the 2D section nor the PiP. |
| `docs/SWARM_V14_PLAN.md` | this file |

---

## 12. Carry-forward, with owners unnamed on purpose

1. **CN II duplicate body** (§6.1) — a `curves.ts`-scope data decision.
2. **The twelve stale ellipsoid `contextNote`s** (§6.2) — a structures-JSON-scope edit; the replacement text
   should say what the tube is, what the committed mesh is, and repeat the authored-path sentence.
3. **CN II's stale `anchorId`** (§6.5) — one field.
4. **The chord/drawn length pair** (§2, §6.3) — either print both from the gate or publish the drawn figure;
   the number currently in `PLAN.md` §3.3 (475.79 au) is superseded by 500.62 au chord / 508.20 au drawn.
5. **`docs/DATA_CONTRACT.md:90` + `:106-108`, `docs/ENGINEERING_PLAN.md:229`, `docs/SWARM_V9_PLAN.md:40`** —
   the remaining stale `nrv-`/bounds copies (§6.7).
6. **`verify:anatomy` and `verify:imaging-fit`** need an environment where piped child stdio is permitted
   (both are red at base and neither is a product failure).
7. **All browser claims** (§7) — the orchestrator's lane, `verify:audit` R3b included.
