# Content Inventory — NeuroAxis 3D Brainstem Atlas

**Single source of truth for all content tasks.** Every structure, tract, level, plate and syndrome id used anywhere in this app must appear here and resolve in `src/data/taxonomy.json` (± `src/data/levels.json`). If a builder needs a new id they must NOT invent one: add it here AND to `taxonomy.json`, then flag the reviewer.

**Refreshed 2026-09-10** against the data as committed: registry **137** entries (diencephalon 42 · midbrain 24 · pons 34 · medulla 32 · cerebellum 5); **26** syndrome records in 3 files; **19** authored tract records out of the 36 registry tracts; **12** plates. Every count below — the §2 registry line, the §2 context-layer identity table, the §3 region headings and rows, the §4 gap note, the §5 syndrome table and the §7 "Required" counts — was **recomputed from `src/data` on that date rather than copied**, and each §7 count now equals the number of distinct `data-structure` slugs actually present in that plate's SVG. The refresh was made against `taxonomy.json` as committed at `716896f` (137 entries, 11 `kind:"context"`), i.e. the state *before* `p1-identity` registers the four unowned `ctx-*` silhouettes; `integration-v6` re-reconciles the context table once that lands. Every count here is pinned to that revision: if a later run extends the registry or the level anchors, re-run this reconciliation instead of trusting the numbers (that is a content-run task, recorded in §4.1 for the tract gaps).

**Re-reconciled 2026-09-10 (second pass) — AMENDMENT B delta.** The pinned revision above was overtaken while this document was being verified: a concurrent v7 task landed `docs/TELENCEPHALON_PLAN.md` §2 (AMENDMENT B) in `src/data/taxonomy.json` and `src/data/levels.json` (checkpoint commit `d1cefef`), adding the **telencephalon** region. The committed data is therefore no longer the 137-entry/13-anchor revision reconciled above. Current, verified from `src/data` on 2026-09-10:

| what | pinned revision (`716896f`) | current revision (`d1cefef`) |
| --- | --- | --- |
| registry entries | 137 (42/24/34/32/5) | **179** — diencephalon **38** · telencephalon **46** · midbrain 24 · pons 34 · medulla 32 · cerebellum 5 |
| registry by kind | nucleus 71 · context 11 · tract 36 · ventricle 3 · surface 16 | nucleus **81** · tract **51** · surface **25** · context **12** · ventricle **10** |
| registry entries with an authored record | 137 | **137** — 42 telencephalon entries are **registry-only stubs awaiting content** |
| `levels.json` anchors | 13 | **17** (the 13 below + `lvl-tel-thalamostriate` +48, `lvl-tel-basal-ganglia` +58, `lvl-tel-centrum-semiovale` +68, `lvl-tel-convexity` +78) |
| plate SVGs | 12 | **12** (unchanged) |
| syndrome records | 24 → 26 with this run's additions | **26** (unchanged by AMENDMENT B) |

Nothing below was deleted, renumbered or silently restated. The §3–§7 tables remain the **authored brainstem/diencephalon/cerebellum reconciliation** — 42/24/34/32/5 rows, 122 plate slugs, 26 syndromes — and every count in them was re-checked against the current data and still holds for that set; the four places where AMENDMENT B changes a statement are called out in §1, §2 (*Registry conventions* and *Context layer identity*), §3.6 and §4.1. Authoring the 42 telencephalon registry stubs is the v7 run's task (`docs/TELENCEPHALON_PLAN.md` §7 task 6, `tel-content`, which owns the telencephalon content section of this file); this run does not author them.

**AMENDMENT C — v13, the twelve cranial nerves (2026-09-12, measured against the working tree at `a530dff` + the v13 slice).** The registry gained a **seventh kind, `nerve`**, and **twelve records**, one per cranial nerve. This is the only v13 content delta: 12 appended `taxonomy.json` rows (the sole changed pre-existing line is `ctx-s1-larynx` gaining a trailing comma), 12 authored records in **two new files** — `src/data/structures/telencephalon-cranial-nerves.json` (CN I, CN II) and `src/data/structures/brainstem-cranial-nerves.json` (CN III–XII) — and 12 curated web-reference entries in `src/data/webRefs.ts` (the automatic Wikipedia fallback would derive a title like "CN I Olfactory nerve", which resolves to nothing). No mesh, GLB, manifest part, plate, level, syndrome or bbox moved.

| what | pinned revision (`d1cefef`) | current revision (v13, measured `npm run validate`) |
| --- | --- | --- |
| registry entries | 179 | **248** — telencephalon **87** · diencephalon **39** · midbrain **27** · pons **39** · medulla **37** · cerebellum **5** · vasculature **14** |
| registry by kind | nucleus 81 · tract 51 · surface 25 · context 12 · ventricle 10 | nucleus **88** · tract **53** · surface **25** · context **45** · vessel **14** · ventricle **11** · **nerve 12** (**7 kinds**) |
| registry entries with an authored record | 137 (42 stubs) | **248 — 0 awaiting a record** (19 files / 225 records; 23 of them tracts) |
| id prefixes / `SLUG_RE` | `nuc- tract- vent- surf- vasc- ctx-` | **+ `nrv-`** → `/^(nuc\|tract\|vent\|surf\|vasc\|ctx\|nrv)-[a-z0-9-]+$/` (the validator also asserts `PREFIX_KIND.nrv === 'nerve'`, 0 contradictions over all 248 rows) |

The twelve ids, their TRUE region (the taxonomy is the authority: these are not one region) and their one grouping subdivision:

| # | id | name | region | subdivision | kind |
| --- | --- | --- | --- | --- | --- |
| CN I | `nrv-cn1-olfactory` | CN I Olfactory nerve | `telencephalon` | `Cranial nerves` | `nerve` |
| CN II | `nrv-cn2-optic` | CN II Optic nerve | `telencephalon` | `Cranial nerves` | `nerve` |
| CN III | `nrv-cn3-oculomotor` | CN III Oculomotor nerve | `midbrain` | `Cranial nerves` | `nerve` |
| CN IV | `nrv-cn4-trochlear` | CN IV Trochlear nerve | `midbrain` | `Cranial nerves` | `nerve` |
| CN V | `nrv-cn5-trigeminal` | CN V Trigeminal nerve | `pons` | `Cranial nerves` | `nerve` |
| CN VI | `nrv-cn6-abducens` | CN VI Abducens nerve | `pons` | `Cranial nerves` | `nerve` |
| CN VII | `nrv-cn7-facial` | CN VII Facial nerve | `pons` | `Cranial nerves` | `nerve` |
| CN VIII | `nrv-cn8-vestibulocochlear` | CN VIII Vestibulocochlear nerve | `pons` | `Cranial nerves` | `nerve` |
| CN IX | `nrv-cn9-glossopharyngeal` | CN IX Glossopharyngeal nerve | `medulla` | `Cranial nerves` | `nerve` |
| CN X | `nrv-cn10-vagus` | CN X Vagus nerve | `medulla` | `Cranial nerves` | `nerve` |
| CN XI | `nrv-cn11-accessory` | CN XI Accessory nerve | `medulla` | `Cranial nerves` | `nerve` |
| CN XII | `nrv-cn12-hypoglossal` | CN XII Hypoglossal nerve | `medulla` | `Cranial nerves` | `nerve` |

All twelve are `laterality: "paired"`, `color: "#14b8a6"` (the cranial-nerve teal, shared with the 15 `nuc-*` rows of subdivision `Cranial nerve nuclei`) and **`meshes: false`** with a sized schematic placement at their authored `origin3d`/`size3d` — no cranial-nerve mesh exists in this repo, and none may be added (the GLB budget has 0.18 MiB of headroom and `verify:anatomy` freezes the existing bboxes). The twelve nerves **do not replace** the rows that already described them: the **17** rows of `Cranial nerve nuclei` (15 nuclei + `tract-mesencephalic-v`, `tract-spinal-trigeminal`) and the ten `surf-cn3-exit` … `surf-cn12-exit` landmarks are untouched, and the committed CN II geometry stays on `tract-optic-nerve` / `ctx-optic-chiasm` / `tract-optic-tract` (CN II's new record links them instead of duplicating them). The ids are checked by `npm run verify:cranial-nerves` (451 assertions, 0 failed) and the whole kind contract by `npm run verify:nerve-kind` (79 assertions, 0 failed); the run's own closure is `docs/SWARM_V13_PLAN.md`.

**AMENDMENT D — v14, the twelve cranial-nerve COURSES (2026-09-12, measured against the working tree at `a530dff` + the v13 slice + the v14 slice).** v13 gave the twelve nerves **records**; v14 gives them **geometry** — an authored **course** per nerve, drawn as a tapered tube in the 3D scene *and* as a procedurally generated part in the 2D live section and the PiP. This adds a **new collection** and **no new registry entry**: `nrv-*` stays at 12 rows, `taxonomy.json` is not touched, and the twelve structures' `origin3d`/`size3d` are unchanged.

### Where the course geometry lives, and what stands behind it (provenance)

| item | value |
| --- | --- |
| the collection | `NERVE_COURSES: readonly NerveCourseRecord[]` in **`src/geometry/curves.ts`** — one record per nerve, a superset of `TractRecord` (`region`, `kind: 'nerve'`, `foramen`, `anchorId`, `anchorNote`, `calibreMm`, `tubeRadius`, `clinical`, `refs`). 12 records, **84 waypoints** |
| **not** in `src/data/tracts.json` | That file is **byte-identical to base** and still holds **23** tracts. Reusing the nerve ids there is a hard validator failure (24 errors: one id ledger across `structures/` and `tracts.json`), and a second table would have drawn every course twice while putting the nerves under the **Tracts** toggle, which does not reach them. The courses are a separate collection consumed directly by `SceneLayers` (3D) and by `sectionAssets.SECTION_NERVE_PARTS` (2D) |
| **the waypoints** | **AUTHORED**, not segmented: each chain traces root → cisternal segment → named skull-base foramen → target. **No skull-base, dural-sinus or orbit mesh is committed anywhere in this repo**, so every foramen position is authored from anatomy — said in each record's `anchorNote` (432–692 characters, asserted by the gate in both halves) |
| **what each chain is anchored on** | The committed **nucleus `origin3d`** the nerve names — 0.000 au for the ten nerves with a brainstem root (CN XI on `nuc-ambiguus`) — and the nerve's **own committed exit landmark** (`surf-cn3-exit` … `surf-cn12-exit`) carried as a **literal waypoint at 0.000 au** (tolerance 2 au). CN I has neither a root nor an exit landmark, so its chain runs epithelium **[11, 9, 66]** → bulb → and **ends** on its own committed `origin3d` **[8, 12, 48]**; CN II is anchored on the committed `tract-optic-nerve` waypoints (0.000 au at both ends, worst interior 6.595 au) |
| **the radius** | converted from a stated **cisternal-segment calibre** at 1 au = 1.2 mm: `r_au = d_mm / 2.4`, i.e. 1.7/4.0/3.0/1.0/4.5/1.9/1.9/2.8/2.0/2.4/1.5/1.8 mm → **0.71/1.67/1.25/0.42/1.88/0.79/0.79/1.17/0.83/1.00/0.63/0.75 au**. Non-uniform by 4.5× (CN IV to CN V), and the gate re-derives every one from its own `calibreMm` field |
| **the length** | **500.62 au = 600.74 mm** chord total (the published figure) · **508.20 au = 609.84 mm** drawn Catmull-Rom arc (the tube's real length; +1.5 %, per-nerve ratio 1.000–1.037). Per nerve: I 18.51 · II 42.42 · III 44.23 · IV 41.21 · V 30.64 · VI 51.85 · VII 52.94 · VIII 48.64 · IX 40.82 · X 44.31 · XI 48.93 · XII 36.11 au. All 84 waypoints inside `CLIP_BOUNDS`, minimum clearance **6.00 au** (CN I) |
| **what the 3D body is** | the project's existing `TractTube` sweep — 72 tubular × 10 radial = **803 verts / 1,440 tris per tube**, tapered (45–60 % end ratio) and elliptical (0.72–0.84 flatten), cached per id. 12 tubes = **9,636 verts / 17,280 tris**, procedural |
| **what the 2D body is** | **procedurally generated parts** (route *a*), not committed GLBs: `registryNerveParts()` hands the **same** `tubeGeometryFor(course)` output to the **existing** `registryPartFromGeometry(meta, geometry)` adapter, which the worker already accepted. Measured contour output: **38 planes → 121 closed loops, 0 non-finite**; the courses gate sweeps three plane sets per nerve and gets **576 crossing planes → 689 loops** |
| **new payload** | **0 bytes.** Manifest **138 parts / 599,204 tris** unchanged · `Σ stat(parts[].file)` **14,486,228 B = 13.8151 MiB** unchanged · `src/assets/anatomy/` **14,566,178 B = 13.8914 MiB in 140 files** unchanged · **0** `nrv-*` GLBs. (Baking the tubes was measured and rejected: 12 tubes = **0.3929 MiB raw / 0.1724 MiB quantized** against the binding **0.1086 MiB** directory headroom — 3.62× / 1.59× over, before any left/right duplication or JSON chunk) |
| **registry / toggle** | the canvas draws `partsForCanvas()` = **138 committed + 12 procedural = 150**; the *Cranial nerves* toggle flips exactly those 12 (on **12/12**, off **0/12**, committed admissions byte-identical). `SECTION_PARTS` itself is still **138** |
| **what replaced what** | the **schematic ellipsoid marker is retired** for any record that has a course: the shipped XOR table prints `tube = yes`, `marker would-draw = no`, `section part = yes` for all twelve. `hasNerveCourse(id)` is true for exactly the 12 course ids and false for a real tract |
| **the gates** | `npm run verify:cranial-nerve-courses` — **220 assertions · 0 failed** (records, anchors, radii, bounds, foramina, the twelve-row probe table, the 3D kind gating, the worker contour sweep) · `npm run verify:cranial-nerve-render` — **47/47** (3D tube list, the four-state toggle truth table, 12 section parts with worker-computed contours, XOR-with-the-marker, payload). Closures: `docs/SWARM_V14_PLAN.md` §2 (the twelve-row table) and §5–§6 (what shipped, what did not) |

**Correction of two v13 statements in this file and in the README.** v13 recorded that the nerve slice reached the **3D view + tree + Legend only**, and that `isPartVisible` returned the same 138 parts with the kind on and off. That was true at v13 and is **false at v14**: the 2D live section and the PiP now both carry the twelve nerve contours (measured above). `docs/SWARM_V14_PLAN.md` §5 has the surface-parity evidence.

**Open, carried forward (stated, not dropped).** (1) `nrv-cn2-optic` is the one nerve with committed meshes, so its authored tube **overlaps the baked `tract-optic-nerve-l` GLB** (26.2 / 1.9 / 36.8 au of overlap) and both bodies render. (2) The twelve records' own `contextNote` still describes the **retired** ellipsoid — the note was outside this run's write scope, and the authored-path statement ships in each course's `anchorNote` instead. (3) CN II's `anchorId` still names `surf-optic-chiasm`, which disagrees with the committed mesh by ~7 au and is **not** the anchor the gate measures. Details and owners-unnamed fixes: `docs/SWARM_V14_PLAN.md` §6 and §12.

**Conventions (from ENGINEERING_PLAN §2, §3, §6):**
- Transverse plates: dorsal at top, **patient LEFT on image RIGHT** (clinical convention). Sagittal: anterior left, superior top. Coronal: patient left on image right, superior top.
- Orientation badges L/R (transverse, coronal) and A/P/S/I (sagittal) drawn in the SVG.
- Every drawn region carries `data-structure="<slug>"`; labels in `<g class="plate-label" data-for="<slug>">`.
- Palette: nuclei amber `#d97706`; cranial-nerve nuclei teal `#14b8a6`; ascending tracts blue `#3b82f6`; descending tracts violet `#8b5cf6`; mixed/connection tracts `#a78bfa`; ventricles cyan `#06b6d4`; surface slate `#64748b`; context gray `#94a3b8`. **Named overrides**: red nucleus `#b91c1c`; substantia nigra pars compacta `#1f2937`; substantia nigra pars reticulata `#374151`; locus coeruleus `#1d4ed8`.
- In plate lists below: **Required** = must be drawn and labeled; **Optional** = draw and label only if your section artistically includes it — if drawn it MUST carry the slug. Required count per plate is 18–40 including optionals drawn.
- `tract-dcml` and `tract-auditory-pathway` are **composite pathway records** — never tag them on plates; tag their component structures (fasciculi/nuclei/arcuate/ML; trapezoid/SOC/LL).

---

## 1. Level table (`src/data/levels.json`) — 17 entries (13 brainstem/diencephalon + 4 telencephalic AMENDMENT B), authoritative y anchors

| id | name | y (au) |
| --- | --- | --- |
| `lvl-spinal-medulla` | Cervicomedullary junction | −50 |
| `lvl-pyramid-decuss` | Medulla — pyramidal decussation | −46 |
| `lvl-sensory-decuss` | Medulla — sensory (internal arcuate) decussation | −42 |
| `lvl-olivary` | Medulla — mid-olivary (open medulla) | −34 |
| `lvl-pontomedullary` | Pontomedullary junction (CN VI–VII exits) | −24 |
| `lvl-pons-caudal` | Pons — lower (CN VI, VII, VIII nuclei) | −18 |
| `lvl-pons-middle` | Pons — midpontine (CN V) | −8 |
| `lvl-pons-rostral` | Pons — upper (CN IV exit, ICP→SCP transition) | +2 |
| `lvl-midbrain-ic` | Midbrain — inferior colliculus | +8 |
| `lvl-midbrain-sc` | Midbrain — superior colliculus (CN III) | +14 |
| `lvl-post-comm` | Posterior commissure / pretectal | +19 |
| `lvl-thalamus-mid` | Diencephalon — mid-thalamus (mammillary bodies) | +28 |
| `lvl-thalamus-rostral` | Diencephalon — rostral thalamus / hypothalamus (optic chiasm) | +36 |
| `lvl-tel-thalamostriate` | Telencephalon — thalamostriate / body of lateral ventricle (AMENDMENT B) | +48 |
| `lvl-tel-basal-ganglia` | Telencephalon — basal ganglia + internal capsule (AMENDMENT B) | +58 |
| `lvl-tel-centrum-semiovale` | Telencephalon — centrum semiovale (AMENDMENT B) | +68 |
| `lvl-tel-convexity` | Telencephalon — high convexity (AMENDMENT B) | +78 |

The four `lvl-tel-*` anchors were added by AMENDMENT B (`docs/TELENCEPHALON_PLAN.md` §2); they extend the transverse navigation range into the hemispheres and have **no** transverse plate yet (that run plans an axial plate at +58, §6). The 13 anchors above them keep their exact y values — the brainstem/diencephalon contract is unchanged, and no plate, clip value or imagery coordinate moved.

Plate mapping: 9 transverse plates → `plate-pyramid-decuss`(lvl-pyramid-decuss), `plate-sensory-decuss`(lvl-sensory-decuss), `plate-olivary`(lvl-olivary), `plate-pons-caudal`(lvl-pons-caudal), `plate-pons-middle`(lvl-pons-middle), `plate-pons-rostral`(lvl-pons-rostral), `plate-midbrain-ic`(lvl-midbrain-ic), `plate-midbrain-sc`(lvl-midbrain-sc), `plate-thalamus-mid`(lvl-thalamus-mid). `lvl-spinal-medulla`, `lvl-pontomedullary`, `lvl-post-comm`, `lvl-thalamus-rostral` and the four `lvl-tel-*` anchors have **no** transverse plate; they exist for the 3D scene (envelopes, clipping) and the level ruler.

## 2. Registry conventions

- Region enum: `diencephalon | telencephalon | midbrain | pons | medulla | cerebellum` (`telencephalon` added by AMENDMENT B — see §3.6; the validator's `REGIONS` also carries `vasculature`). Kind enum: `nucleus | tract | ventricle | surface | vessel | context | nerve` (**`nerve` added by v13, AMENDMENT C** — the twelve cranial nerves). Laterality: `midline | paired`.
- Slug prefixes: `nuc-`, `tract-`, `vent-`, `surf-`, `vasc-` (none in v1 — vascular map is string fields only), `ctx-` (context), **`nrv-` (nerve, v13 AMENDMENT C)**. Regex: `^(nuc|tract|vent|surf|vasc|ctx|nrv)-[a-z0-9-]+$`. The prefix follows `kind` in every row (`nuc`→nucleus, `tract`→tract, `vent`→ventricle, `surf`→surface, `vasc`→vessel, `ctx`→context, **`nrv`→nerve**); the validator asserts that rule as `PREFIX_KIND` and reports **0 contradictions over all 248 rows**.
- **Current registry count (AMENDMENT B, `d1cefef`): 179 entries** — by region: diencephalon 38, telencephalon 46, midbrain 24, pons 34, medulla 32, cerebellum 5; by kind: nucleus 81, tract 51, surface 25, context 12, ventricle 10. **137 of the 179 carry an authored record** (118 structure + 19 tract); the remaining **42 are registry-only stubs** (all telencephalon — see §3.6). Registry count at the pinned revision below: 137 entries (by region field: diencephalon 42, midbrain 24, pons 34, medulla 32, cerebellum 5; by kind: nucleus 71, context 11, tract 36, ventricle 3, surface 16 — `vent-cerebral-aqueduct` carries region `diencephalon` per plan §3.1 CSF grouping; peduncle tracts carry their owning region: `tract-scp` midbrain, `tract-mcp` pons, `tract-icp` medulla). Two records are additions over the plan §3 list, both `kind:"context"`, added because the plate contract (§6) requires a `<slug>` for every region and §3.9 mandates "thalamus/hypothalamus blocks" on the sagittal plate: `ctx-thalamus-envelope`, `ctx-hypothalamus-envelope`. No group records were invented; tree grouping is region → subdivision → records. **v13 (AMENDMENT C): 248 entries** — by kind nucleus 88 · tract 53 · surface 25 · context 45 · vessel 14 · ventricle 11 · **nerve 12** (7 kinds); by region telencephalon 87 · diencephalon 39 · midbrain 27 · pons 39 · medulla 37 · cerebellum 5 · vasculature 14; **every one of the 248 has an authored record (0 stubs)**, 19 files / 225 records, 23 of them tracts.
- `parent` links (tree nesting to existing ids only): `nuc-edinger-westphal → nuc-oculomotor`, `nuc-pprf → nuc-pontine-reticular`.

### Context layer identity (documented 2026-09-10, against committed `taxonomy.json` @ `716896f`; AMENDMENT B row added the same day)

Twelve registry entries carry `kind:"context"` at the current revision (eleven at `716896f`; AMENDMENT B added `ctx-cerebral-cortex`), and the viewer bakes exactly ten `ctx-*` GLB silhouettes (`src/assets/anatomy/anatomy-manifest.json`: 10 context parts of 84). `SceneLayers.tsx` (`ENVELOPE_SLOTS`, `:77-88`) maps every rendered silhouette onto the record id it stands for, so each registered context id resolves as follows:

| registered context id | rendered mesh that represents it | why / where it otherwise lives |
| --- | --- | --- |
| `ctx-thalamus-envelope` | `ctx-thalamus-l` + `ctx-thalamus-r` (2 slots, slot id = `ctx-thalamus-envelope`) | The paired ovoid envelopes, mirrored at −x; both slots carry this record id (they become clickable when `p1-identity` lands the envelope-picking fix). |
| `ctx-hypothalamus-envelope` | `ctx-hypothalamus-surface` | Envelope wedge, slot id = `ctx-hypothalamus-envelope`. |
| `ctx-cerebellum` | `ctx-cerebellum-l` + `ctx-cerebellum-r` + `ctx-cerebellar-vermis` (3 slots) | Two hemispheres plus the vermis bar, all owned by the one context record. |
| `ctx-cerebral-cortex` | **none** (AMENDMENT B addition) | The cortical ribbon / hemisphere shell is not in the current bake: `docs/TELENCEPHALON_PLAN.md` §1 records that BP3D has no cortical gray-matter concept, so it must be *derived* (dilate the cerebral-white-matter SDF, subtract) by that run's `tel-geometry` task (§4). Until it lands, this id is a registry/plate context record with no 3D silhouette. |
| `ctx-internal-medullary-lamina` | **none** | Plate-2D context only: the Y-shaped lamina is tagged on `plate-thalamus-mid` and `plate-coronal-thalamus`; a myelin sheet has no standalone baked mesh and is not separable inside the thalamic envelope. |
| `ctx-fields-of-forel` | **none** | Plate-2D context only (H1/H2 fiber zones on `plate-thalamus-mid`, `plate-coronal-midbrain`, `plate-coronal-thalamus`); white-matter zones inside the subthalamic region, no GLB. |
| `ctx-corpus-callosum` | **none** | Sagittal-plate context silhouette only; the cerebral hemispheres lie outside the brainstem/diencephalon GLB set by design. Region reclassified diencephalon → telencephalon by AMENDMENT B. |
| `ctx-internal-capsule` | **none** | Plate-2D context only (sagittal, coronal and transverse plates); a fiber plane, not a renderable nucleus. Region reclassified diencephalon → telencephalon by AMENDMENT B. |
| `ctx-lenticular-nucleus` | **none** | Plate-2D context only (putamen/pallidum silhouette); telencephalic, outside the baked brainstem set. Region reclassified diencephalon → telencephalon by AMENDMENT B (subdivision `Basal ganglia`). |
| `ctx-caudate-nucleus` | **none** | Plate-2D context only (head/body at the anterior limb); telencephalic, outside the baked brainstem set. Region reclassified diencephalon → telencephalon by AMENDMENT B (subdivision `Basal ganglia`). |
| `ctx-pontine-nuclei` | **none** | Plate-2D context only: the gray of the basis pontis is part of the `ctx-pons-surface` envelope in 3D, and the baked envelope cannot separate gray from fibers. |
| `ctx-pontine-fibers` | **none** | Same reason as the pontine nuclei — the longitudinal/transverse fiber systems are drawn and tagged on the pontine plates but are not individually meshable inside the pons envelope. |

**Four rendered silhouettes had no registry owner at the pinned revision:** `ctx-midbrain-surface`, `ctx-pons-surface`, `ctx-medulla-surface` and `ctx-pineal` (slot ids `env-midbrain`, `env-pons`, `env-medulla`, `env-pineal` in `SceneLayers.tsx:78-80`, `:87`; at AMENDMENT B they are still unregistered). `p1-identity` owns the fix — 4 new `kind:"context"` records in `taxonomy.json` plus the matching authored records in `src/data/structures/context.json` — and `integration-v6` updates this table in close-out. Until then those four silhouettes render but are not addressable by id. The `ctx-cerebral-cortex` row above is the mirror case: registered, but not yet rendered.

---

## 3. Region tables (slug · name · subdivision · kind · function summary)

### 3.1 Diencephalon (42)

**Thalamus**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `nuc-thalamic-anterior` | Anterior thalamic nucleus | Thalamus | nucleus | Limbic/memory relay of the mammillothalamic tract to the cingulate; part of the Papez circuit. |
| `nuc-va` | Ventral anterior nucleus (VA) | Thalamus | nucleus | Motor gating: pallidal/SNr input to premotor & supplementary motor cortex; readiness-to-move. |
| `nuc-vl` | Ventral lateral nucleus (VL) | Thalamus | nucleus | Cerebellar/pallidal relay to motor cortex; tremor and voluntary movement gating. |
| `nuc-vpl` | Ventral posterolateral nucleus (VPL) | Thalamus | nucleus | Somatosensory relay (DCML + spinothalamic) to S1; somatotopic — leg lateral, arm medial, face at VPM border. |
| `nuc-vpm` | Ventral posteromedial nucleus (VPM) | Thalamus | nucleus | Face/head touch, pain and taste (VPMpc) to S1/insular cortex. |
| `nuc-lateral-dorsal` | Lateral dorsal nucleus | Thalamus | nucleus | Association relay of limbic/cingulate circuitry; memory-related gating. |
| `nuc-lateral-posterior` | Lateral posterior nucleus | Thalamus | nucleus | Parietal association relay; visuospatial integration with pulvinar. |
| `nuc-pulvinar` | Pulvinar | Thalamus | nucleus | Large posterior association nucleus; visual/attention and multimodal integration; visuomotor. |
| `nuc-md` | Mediodorsal nucleus (MD) | Thalamus | nucleus | Executive relay reciprocally connected to prefrontal cortex; attention, emotion, memory retrieval. |
| `nuc-intralaminar` | Centromedian-parafascicular nuclei | Thalamus | nucleus | Intralaminar activating system: striatal gating (CM), arousal, pain (PF). |
| `nuc-midline-thalamic` | Midline (paraventricular) thalamic nuclei | Thalamus | nucleus | Non-specific activation: arousal, stress response, autonomic/limbic relays. |
| `nuc-thalamic-reticular` | Thalamic reticular nucleus | Thalamus | nucleus | GABAergic shell gating all thalamic relay nuclei; spindle/wave generator for sleep. |
| `nuc-lgn` | Lateral geniculate nucleus (LGN) | Thalamus | nucleus | Visual relay: retina → V1; magno/parvo layers, eye segregation. |
| `nuc-mgn` | Medial geniculate nucleus (MGN) | Thalamus | nucleus | Auditory relay: inferior colliculus → primary auditory cortex; tonotopic. |
| `ctx-internal-medullary-lamina` | Internal medullary lamina | Thalamus | context | Y-shaped white-matter lamina separating the nuclear groups; carries intralaminar fibers. |
| `ctx-thalamus-envelope` | Thalamus (context envelope) | Thalamus | context | Envelope silhouette (paired ovoids) for plates/3D; not a nucleus — see the 15 nucleus records above. |

**Hypothalamus**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `nuc-preoptic` | Preoptic area | Hypothalamus | nucleus | Thermoregulation, sleep/arousal, reproductive neuroendocrine control (GnRH). |
| `nuc-suprachiasmatic` | Suprachiasmatic nucleus | Hypothalamus | nucleus | Circadian master clock; entrained by the retinohypothalamic tract. |
| `nuc-supraoptic` | Supraoptic nucleus | Hypothalamus | nucleus | Magnocellular vasopressin (ADH) production → posterior pituitary; water balance. |
| `nuc-paraventricular` | Paraventricular nucleus (hypothalamus) | Hypothalamus | nucleus | Neuroendocrine integrator: oxytocin/ADH, CRH, and descending autonomic (sympathetic) outflow. |
| `nuc-arcuate-hypothalamic` | Arcuate nucleus (hypothalamus) | Hypothalamus | nucleus | Appetite/energy balance (NPY/AgRP, POMC/CART); GHRH and tuberoinfundibular dopamine. |
| `nuc-ventromedial` | Ventromedial nucleus (hypothalamus) | Hypothalamus | nucleus | Satiety center: feeding suppression, autonomic and defensive behavior. |
| `nuc-dorsomedial` | Dorsomedial nucleus (hypothalamus) | Hypothalamus | nucleus | Rhythmic behavior and energy homeostasis; sympathetic outflow in stress. |
| `nuc-posterior-hypothalamus` | Posterior hypothalamic nucleus | Hypothalamus | nucleus | Heat conservation/pressor; wakefulness (histaminergic region). |
| `nuc-mammillary-body` | Mammillary body | Hypothalamus | nucleus | Memory relay of the Papez circuit; atrophic in Wernicke–Korsakoff. |
| `ctx-hypothalamus-envelope` | Hypothalamus (context envelope) | Hypothalamus | context | Envelope wedge silhouette for plates/3D; not a nucleus — see nucleus records above. |

**Epithalamus**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `nuc-pineal-gland` | Pineal gland | Epithalamus | nucleus | Melatonin rhythm; photoperiodic/circadian signaling; pineal region tumors cause Parinaud syndrome. |
| `nuc-habenula` | Habenular nuclei | Epithalamus | nucleus | Anti-reward/salience: lateral habenula relays limbic input to midbrain monoamines (aversion, pain expectation). |
| `tract-stria-medullaris` | Stria medullaris thalami | Epithalamus | tract | Afferent bundle (septal/preoptic/limbic) running to the habenula along the dorsal thalamic edge. |
| `tract-posterior-commissure` | Posterior commissure | Epithalamus | tract | Dorsal midline decussation at the pineal/pretectal region; vertical gaze coordination. |

**Subthalamus**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `nuc-subthalamic` | Subthalamic nucleus | Subthalamus | nucleus | Excitatory (glutamatergic) component of the indirect BG pathway to GPi; lesion → hemiballismus. |
| `nuc-zona-incerta` | Zona incerta | Subthalamus | nucleus | GABAergic multimodal gate: visceromotor, attention, BG/thalamic modulation. |
| `ctx-fields-of-forel` | Fields of Forel (H1/H2) | Subthalamus | context | White-matter fiber zones (lenticular fasciculus H2, thalamic fasciculus H1) between STN/GPi/RN. |

**Ventricular system / surfaces / hemisphere context**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `vent-third-ventricle` | Third ventricle | Ventricular system | ventricle | Midline CSF cavity between the thalami; choroid plexus; interventricular foramina. |
| `vent-cerebral-aqueduct` | Cerebral aqueduct | Ventricular system | ventricle | CSF conduit 3rd→4th ventricle; obstruction → non-communicating hydrocephalus. |
| `surf-optic-chiasm` | Optic chiasm | Surface landmarks | surface | Crossing of retinal nasal fibers; bitemporal hemianopia with sellar/parasellar lesions. |
| `surf-infundibulum` | Infundibulum (pituitary stalk) | Surface landmarks | surface | Hypothalamic–pituitary stalk; median eminence portal system and magnocellular axons. |
| `ctx-corpus-callosum` | Corpus callosum (context) | Hemisphere context | context | Sagittal-plate context silhouette only; external capsule of the cerebral hemispheres. |
| `ctx-internal-capsule` | Internal capsule (context) | Hemisphere context | context | Anterior limb/ genu / posterior limb white-matter plane between caudate–thalamus and lentiform. |
| `ctx-lenticular-nucleus` | Lentiform nucleus (context silhouette) | Hemisphere context | context | Putamen + globus pallidus silhouette for coronal/transverse plates. |
| `ctx-caudate-nucleus` | Caudate nucleus (context silhouette) | Hemisphere context | context | C-shaped striatal silhouette; head/body visible at the anterior limb of the internal capsule. |

**Descending pathways**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-hypothalamospinal` | Hypothalamospinal (sympathetic) tract | Descending pathways | tract | First-order sympathetic fibers from the paraventricular/perifornical hypothalamus descending through the lateral brainstem tegmentum to the intermediolateral column (T1–L2); its interruption gives a central Horner syndrome. |

### 3.2 Midbrain (24)

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `nuc-superior-colliculus` | Superior colliculus | Tectum | nucleus | Visual orienting: saccades, head/eye turning; tectospinal & tectobulbar; pupil-light reflex relay (pretectal). |
| `nuc-inferior-colliculus` | Inferior colliculus | Tectum | nucleus | Auditory integration and sound localization; tonotopic; brachium to MGN. |
| `nuc-pretectal` | Pretectal area | Tectum | nucleus | Pupillary light-reflex interneurons (retina → EW); lesion → Parinaud (light-near dissociation). |
| `nuc-pag` | Periaqueductal gray | Tegmentum | nucleus | Descending nociceptive modulation (analgesia), defensive reaction, autonomic/cardiac control. |
| `nuc-oculomotor` | Oculomotor nucleus (CN III) | Cranial nerve nuclei | nucleus | Innervates medial rectus, superior rectus, inferior rectus, inferior oblique; levator palpebrae. |
| `nuc-edinger-westphal` | Edinger-Westphal nucleus | Cranial nerve nuclei | nucleus | Parasympathetic preganglionics for pupillary constriction and accommodation. |
| `nuc-trochlear` | Trochlear nucleus (CN IV) | Cranial nerve nuclei | nucleus | Innervates superior oblique (pulley); dorsal exit, decussation, head-tilt/eye counter-roll. |
| `nuc-mesencephalic-v` | Mesencephalic trigeminal nucleus | Cranial nerve nuclei | nucleus | Jaw proprioception (masseter spindle afferents); unipolar pseudo-sensory cells; spans pons→midbrain. |
| `tract-mesencephalic-v` | Mesencephalic trigeminal tract | Cranial nerve nuclei | tract | Proprioceptive tract of CN V running the length of the midbrain/pons dorsolateral tegmentum. |
| `nuc-red-nucleus` | Red nucleus | Tegmentum | nucleus | Cerebellar → motor relay (dentatothalamic loop) and rubrospinal flexor facilitation (crosses ventromedially). |
| `nuc-snc` | Substantia nigra, pars compacta | Tegmentum | nucleus | Dopaminergic nigrostriatal + mesocorticolimbic; degenerate in Parkinson's disease. |
| `nuc-snr` | Substantia nigra, pars reticulata | Tegmentum | nucleus | GABAergic basal-ganglia output (like GPi); saccade gating via superior colliculus. |
| `tract-crus-cerebri` | Crus cerebri | Basis pedunculi | tract | Descending cortico-fugal bundle; somatotopy medial→lateral: frontopontine, corticobulbar, corticospinal, temporoparietooccipitopontine. |
| `tract-scp-decussation` | Superior cerebellar peduncle decussation | Tegmentum | tract | Crossed dentatothalamic fibers in the ventral midline of the caudal midbrain. |
| `tract-central-tegmental` | Central tegmental tract | Tegmentum | tract | Rubro-olivary + brainstem reticular fibers; motor-side-loop and olivo-olivo coordination. |
| `tract-mlf` | Medial longitudinal fasciculus (MLF) | Tegmentum | tract | Mixed internuclear bundle: vestibular ↔ ocular nuclei (and tectobulbar); conjugate gaze; spans medulla→midbrain. |
| `tract-scp` | Superior cerebellar peduncle | Cerebellar connections | tract | Efferent peduncle of the cerebellum (dentate → thalamus/RN); lesions → dystonia, hemiataxia, cerebellar tremor. |
| `nuc-dorsal-raphe` | Dorsal raphe nucleus | Reticular formation | nucleus | Serotonergic (5-HT): sleep-wake, antinociception, mood; largest rostral raphe group. |
| `nuc-cuneiform` | Cuneiform nucleus | Reticular formation | nucleus | Mesencephalic reticular formation (mesencephalic locomotor region); arousal; adjacent to pedunculopontine. |
| `surf-interpeduncular-fossa` | Interpeduncular fossa | Surface landmarks | surface | Ventral midline triangle between the cerebral peduncles; CN III rootlets and basilar apex landmarks. |
| `surf-cn3-exit` | Oculomotor nerve (CN III) exit | Surface landmarks | surface | CN III rootlets in the interpeduncular fossa, passing between PCA and SCA; Weber lesion territory. |
| `surf-cn4-exit` | Trochlear nerve (CN IV) exit | Surface landmarks | surface | CN IV dorsal exit below the inferior colliculus (superior medullary velum); longest intracranial course. |

**Descending pathways**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-rubrospinal` | Rubrospinal tract | Descending pathways | tract | Magnocellular red-nucleus output that crosses in the ventral tegmental decussation and descends to the contralateral cervical cord; facilitates flexor tone of the upper limb and feeds the rubro-olivary side-loop. |
| `tract-tectospinal` | Tectospinal tract | Descending pathways | tract | Superior-colliculus output crossing in the dorsal tegmental decussation to the contralateral cervical cord; turns the head and neck toward a seen or heard target. |

### 3.3 Pons (34)

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `ctx-pontine-nuclei` | Pontine nuclei | Basis pontis | context | Corticopontocerebellar relay neurons; ponto-cerebellar fibers cross to the contralateral cerebellum. |
| `ctx-pontine-fibers` | Longitudinal and transverse pontine fibers | Basis pontis | context | Basis-pontis fiber systems: longitudinal cortico-fugal + transverse pontocerebellar. |
| `nuc-trigeminal-motor` | Trigeminal motor nucleus (CN V) | Cranial nerve nuclei | nucleus | Jaw-closers/openers via V3; jaw-jerk reflex; masticatory pattern generators. |
| `nuc-principal-sensory-v` | Principal sensory trigeminal nucleus | Cranial nerve nuclei | nucleus | Tactile/discriminative face and tooth pulp; → ventral trigeminothalamic tract to VPM. |
| `nuc-abducens` | Abducens nucleus (CN VI) | Cranial nerve nuclei | nucleus | Lateral rectus (abduction); lesion → ipsilesional gaze palsy, diplopia. |
| `nuc-facial` | Facial nucleus (CN VII) | Cranial nerve nuclei | nucleus | All mimic musculature (upper face bilateral, lower face contralateral); genu wraps the abducens nucleus. |
| `nuc-superior-salivatory` | Superior salivatory nucleus | Cranial nerve nuclei | nucleus | Parasympathetic secretomotor: lacrimal (+ submandibular/sublingual) via CN VII. |
| `nuc-solitarius-rostral` | Nucleus solitarius (rostral gustatory part) | Cranial nerve nuclei | nucleus | First synapse of taste (VII/IX/X); gustatory part extends into the caudal pons. |
| `nuc-vestibular-superior` | Superior vestibular nucleus | Vestibular nuclei | nucleus | Vestibulo-ocular reflexes and head posture (Bechterew); rostral-most vestibular nucleus. |
| `nuc-vestibular-medial` | Medial vestibular nucleus | Vestibular nuclei | nucleus | Longest vestibular nucleus (medulla→midpons); VOR, eye hold (Schwalbe); MVST source. |
| `nuc-vestibular-lateral` | Lateral vestibular nucleus | Vestibular nuclei | nucleus | Deiters' nucleus: postural extensor tone via the lateral vestibulospinal tract. |
| `nuc-vestibular-inferior` | Inferior vestibular nucleus | Vestibular nuclei | nucleus | Descending vestibular division; vestibulocerebellar and descending (spinal) connections. |
| `nuc-cochlear-ventral` | Ventral cochlear nucleus | Auditory pathway | nucleus | First synapse of hearing (spiral ganglion); bushy cells → trapezoid body/SOC (binaural). |
| `nuc-cochlear-dorsal` | Dorsal cochlear nucleus | Auditory pathway | nucleus | Acoustic tubercle (on the ICP surface); spectral/vertical sound cues. |
| `nuc-superior-olivary` | Superior olivary complex | Auditory pathway | nucleus | Binaural coincidence detection (ITD/ILD) for sound localization; olivocochlear efferents. |
| `tract-trapezoid-body` | Trapezoid body | Auditory pathway | tract | Auditory decussation (ventral cochlear → SOC/LL) in the ventral tegmentum of the caudal pons. |
| `tract-lateral-lemniscus` | Lateral lemniscus | Auditory pathway | tract | Ascending auditory bundle (cochlear nuclei/SOC → inferior colliculus); tonotopic; subpial lateral tegmentum. |
| `tract-mcp` | Middle cerebellar peduncle | Cerebellar connections | tract | Massive afferent peduncle (pontocerebellar, brachium pontis); lesions → ipsilateral hemiataxia. |
| `nuc-locus-coeruleus` | Locus coeruleus | Tegmentum | nucleus | Noradrenergic: vigilance, arousal, attention; diffuse forebrain projections. |
| `nuc-pontine-reticular` | Pontine reticular formation (oral and caudal nuclei) | Reticular formation | nucleus | Sleep-wake, posture, locomotion; reticulospinal (medial descending system). |
| `nuc-pprf` | Paramedian pontine reticular formation (PPRF) | Reticular formation | nucleus | Horizontal gaze center: fires for ipsilateral saccades; commands CN VI → MLF → CN III. |
| `surf-cn5-exit` | Trigeminal nerve (CN V) exit | Surface landmarks | surface | V root at the mid-lateral pons (sensorry root + motor root to trigeminal ganglion). |
| `surf-cn6-exit` | Abducens nerve (CN VI) exit | Surface landmarks | surface | CN VI root at the ventromedial pontomedullary junction; long subarachnoid course. |
| `surf-cn7-exit` | Facial nerve (CN VII) exit | Surface landmarks | surface | CN VII at the cerebellopontine angle (with nervus intermedius). |
| `surf-cn8-exit` | Vestibulocochlear nerve (CN VIII) exit | Surface landmarks | surface | CN VIII at the CPA; vestibular + cochlear divisions. |
| `surf-facial-colliculus` | Facial colliculus | Surface landmarks | surface | Dorsal floor bulge produced by the facial nerve genu over the abducens nucleus. |
Note: `tract-spinal-trigeminal` and `nuc-spinal-trigeminal` are **owned by medulla** (region field) and are listed in §3.4; they are drawn on the pontine plates too — see §7.

**Ascending pathways**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-trigeminothalamic-ventral` | Ventral trigeminothalamic tract | Ascending pathways | tract | Crossed trigeminal lemniscus from the principal sensory and spinal trigeminal nuclei to contralateral VPM; carries face touch, pain and temperature. |
| `tract-trigeminothalamic-dorsal` | Dorsal trigeminothalamic tract | Ascending pathways | tract | Ipsilateral oral-facial mechanosensory route from the principal sensory nucleus to VPM — the uncrossed partner of the trigeminal lemniscus. |
| `tract-auditory-pathway` | Auditory pathway (cochlear nuclei to MGN) | Ascending pathways | tract | Composite central auditory route: cochlear nuclei → trapezoid body/SOC → lateral lemniscus → inferior colliculus → brachium → MGN; bilateral from the cochlear nuclei onwards. |

**Descending pathways**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-corticobulbar` | Corticobulbar tract | Descending pathways | tract | Corticonuclear fibers from motor and somatosensory cortex through the genu and basis pontis to the cranial-nerve motor nuclei; bilateral to most nuclei, crossed-dominant to the lower face and genioglossus. |
| `tract-corticopontine` | Corticopontine tract | Descending pathways | tract | Frontopontine (medial) and temporoparietooccipitopontine (lateral) fibers ending on the pontine nuclei — the first leg of the corticopontocerebellar route. |
| `tract-lateral-vestibulospinal` | Lateral vestibulospinal tract | Descending pathways | tract | Uncrossed descending bundle from Deiters' nucleus through the medulla to the ipsilateral ventrolateral funiculus; the main driver of antigravity extensor tone. |
| `tract-medial-vestibulospinal` | Medial vestibulospinal tract | Descending pathways | tract | Descends bilaterally within the MLF/interfascicular bundle from the medial vestibular nucleus to the cervical cord; positions the head and stabilizes gaze. |
| `tract-reticulospinal` | Reticulospinal tract (pontine and medullary) | Descending pathways | tract | The medial descending system: pontine (medial) reticulospinal fibers facilitate extensor and locomotor tone while medullary (lateral) fibers inhibit it; both descend in the ventromedial cord. |

### 3.4 Medulla (32)

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-pyramid` | Pyramid | Pyramids & decussations | tract | Corticospinal bundle on the ventral medulla; ~85–90% of fibers decussate at the pyramidal decussation. |
| `tract-pyramidal-decussation` | Pyramidal decussation | Pyramids & decussations | tract | Crossing of the majority of corticospinal fibers → lateral CST; interrupts the anterior median fissure. |
| `tract-fasciculus-gracilis` | Fasciculus gracilis | Dorsal column nuclei | tract | Ipsilateral ascending lower-limb/axial dorsal-column fibers (T6 and below) → nucleus gracilis. |
| `nuc-nucleus-gracilis` | Nucleus gracilis | Dorsal column nuclei | nucleus | First synapse of DCML for the lower limb; emits internal arcuate fibers. |
| `tract-fasciculus-cuneatus` | Fasciculus cuneatus | Dorsal column nuclei | tract | Ipsilateral ascending upper-limb/thoracic dorsal-column fibers (T6+) → nucleus cuneatus. |
| `nuc-nucleus-cuneatus` | Nucleus cuneatus | Dorsal column nuclei | nucleus | First synapse of DCML for the upper limb; kinesthesia; internal arcuate fibers. |
| `tract-internal-arcuate` | Internal arcuate fibers | Pyramids & decussations | tract | Sensory decussation: fibers arch ventromedially from the DC nuclei → contralateral medial lemniscus. |
| `nuc-inferior-olive-principal` | Principal inferior olivary nucleus | Olivary complex | nucleus | Olivocerebellar climbing-fiber source; movement-error/timing signal, cerebellar plasticity. |
| `nuc-inferior-olive-medial` | Medial accessory olivary nucleus | Olivary complex | nucleus | Accessory olive projecting to vermis/vestibulocerebellar regions (medial ACC midline). |
| `tract-medial-lemniscus` | Medial lemniscus | Tegmentum | tract | DCML continuation from the sensory decussation; in the medulla: lower-limb fibers lateral, upper-limb medial. |
| `tract-spinal-trigeminal` | Spinal trigeminal tract | Cranial nerve nuclei | tract | Pain/temperature tract of the face (V, VII, IX, X, XI) descending to the spinal trigeminal nucleus. |
| `nuc-spinal-trigeminal` | Spinal trigeminal nucleus | Cranial nerve nuclei | nucleus | Face pain/temperature; laminar structure (oralis/ interpolaris/ caudalis); onion-skin face maps. |
| `nuc-solitarius-caudal` | Nucleus solitarius (cardiorespiratory part) | Cranial nerve nuclei | nucleus | Visceral afferents (IX, X): baroreceptors, chemoreceptors, GI; cardiorespiratory and swallow reflexes. |
| `nuc-dmv` | Dorsal motor nucleus of the vagus (CN X) | Cranial nerve nuclei | nucleus | Parasympathetic preganglionics: heart (bradycardia), lungs, GI motility/secretion. |
| `nuc-ambiguus` | Nucleus ambiguus | Cranial nerve nuclei | nucleus | Branchiomotor (IX, X): soft palate, pharynx, larynx — phonation and swallow. |
| `nuc-hypoglossal` | Hypoglossal nucleus (CN XII) | Cranial nerve nuclei | nucleus | All tongue muscles except palatoglossus; lesion → ipsilateral wasting, deviation toward the weak side. |
| `nuc-area-postrema` | Area postrema | Ventricular system | nucleus | Chemoreceptor trigger zone (vomiting); circumventricular organ without a blood–brain barrier. |
| `tract-icp` | Inferior cerebellar peduncle | Cerebellar connections | tract | Afferent peduncle (restiform body): DC nuclei→cerebellum, olivocerebellar, spinocerebellar (PSCT). |
| `nuc-arcuate-medullary` | Arcuate nucleus (medulla) | Pyramids & decussations | nucleus | Ventral precerebellar relay nucleus at the medullary surface (over the pyramids/vicious olive region). |
| `nuc-medullary-reticular` | Medullary reticular formation | Reticular formation | nucleus | Gigantocellular/medial reticular: descending inhibition, autonomic/BP control, respiratory pattern generation, arousal. |
| `vent-fourth-ventricle` | Fourth ventricle | Ventricular system | ventricle | Tent-shaped CSF cavity over the open medulla and pons; choroid plexus; drains via foramina of Luschka/Magendie. |
| `surf-cn9-exit` | Glossopharyngeal nerve (CN IX) exit | Surface landmarks | surface | Postolivary sulcus rootlets; carotid-body chemoreceptor and swallowing afferents. |
| `surf-cn10-exit` | Vagus nerve (CN X) exit | Surface landmarks | surface | Postolivary sulcus rootlets; cardiopulmonary/GI motor and sensory. |
| `surf-cn11-exit` | Accessory nerve (CN XI) exit | Surface landmarks | surface | Cranial (postolivary) + spinal rootlets entering through the foramen magnum; SCM/trapezius. |
| `surf-cn12-exit` | Hypoglossal nerve (CN XII) exit | Surface landmarks | surface | Preolivary sulcus rootlets → hypoglossal canal; tongue motor. |
| `surf-obex` | Obex | Surface landmarks | surface | Caudal apex of the fourth ventricle; surgical landmark at the foramen magnum. |

**Ascending pathways**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-dcml` | Dorsal column-medial lemniscus pathway | Ascending pathways | tract | Composite conscious-mechanosensory pathway: dorsal-column fasciculi → gracile/cuneate nuclei → internal arcuate decussation → medial lemniscus → VPL → S1; its components are drawn and tagged individually on the plates. |
| `tract-spinothalamic` | Spinothalamic tract (anterolateral system) | Ascending pathways | tract | Crossed pain-temperature and crude-touch pathway ascending the ventrolateral brainstem to VPL; in the medulla it lies between the olive and the spinal trigeminal complex. |
| `tract-posterior-spinocerebellar` | Posterior spinocerebellar tract | Ascending pathways | tract | Uncrossed Clarke's-column fibers entering the inferior cerebellar peduncle at the upper medulla; unconscious lower-limb proprioception for the spinocerebellum. |
| `tract-anterior-spinocerebellar` | Anterior spinocerebellar tract | Ascending pathways | tract | Gowers' tract: crossed ventral spinocerebellar fibers ascending the lateral brainstem, to cross a second time in the superior cerebellar peduncle. |
| `tract-spinoreticular` | Spinoreticular tract | Ascending pathways | tract | Collateral anterolateral fibers ending in the medullary and pontine reticular formation; the arousal-affective (medial pain system) route to the intralaminar thalamus. |

**Descending pathways**

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `tract-corticospinal-lateral` | Corticospinal tract (lateral) | Descending pathways | tract | Crossed pyramidal fibers descending from the decussation in the lateral funiculus to the ventral horn; the principal voluntary motor pathway to the limbs. |

### 3.5 Cerebellum (5)

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `ctx-cerebellum` | Cerebellar hemispheres and vermis (context) | Cerebellar context | context | Envelope silhouette (two hemispheres + vermis bar); movement coordination, motor learning, balance. |
| `nuc-dentate` | Dentate nucleus | Deep cerebellar nuclei | nucleus | Largest efferent nucleus → SCP (dentatothalamocortical); motor planning; lesions → intention tremor. |
| `nuc-interposed` | Interposed nuclei (emboliform and globose) | Deep cerebellar nuclei | nucleus | Emboliform+globose; spinal-cerebellar limb correction; output via SCP. |
| `nuc-fastigial` | Fastigial nucleus | Deep cerebellar nuclei | nucleus | Vestibular/vermal output: axial posture, eye position/VOR; lesions → axial ataxia. |
| `surf-vermis` | Vermis | Surface landmarks | surface | Midline cerebellar surface; axial balance; midline tumors → truncal ataxia. |
| (peduncles) | `tract-scp` (midbrain owner) · `tract-icp` (medulla owner) · `tract-mcp` (pons owner) | | | |

### 3.6 Telencephalon (46 registry entries — AMENDMENT B; content owned by the v7 run)

AMENDMENT B (`docs/TELENCEPHALON_PLAN.md` §2-§3, commit `d1cefef`) added the `telencephalon` region to `taxonomy.json`: **42 new entries** plus **4 reclassified** legacy hemisphere-context records, for **46** entries total. By kind: nucleus 10, tract 15, surface 9, ventricle 7, context 5. By subdivision: Telencephalic white matter 14, Cerebral cortex 10, Basal ganglia 9, Lateral ventricles 7, Limbic system 6.

The four reclassified records are the ones previously tabulated under §3.1 ("Ventricular system / surfaces / hemisphere context"): `ctx-corpus-callosum` and `ctx-internal-capsule` (→ subdivision `Telencephalic white matter`), `ctx-lenticular-nucleus` and `ctx-caudate-nucleus` (→ `Basal ganglia`). That is why the §3.1 diencephalon table has 42 rows while the current registry's `diencephalon` region field counts 38: §3.1 is the authored brainstem/diencephalon grouping reconciled at `716896f`, and those four silhouettes are now region `telencephalon` in the registry. Neither number is stale — they describe different sets, and both are recomputed from the data.

**None of the 42 new telencephalon entries has an authored record yet** (they are the 42 registry-only stubs the validator reports), so no function-summary rows are authored here: writing them is the v7 run's task (`docs/TELENCEPHALON_PLAN.md` §7 task 6 `tel-content`, which owns this document's telencephalon section) and its geometry is `tel-geometry`'s. The four reclassified context records keep their existing authored records and their §3.1 rows. Recording the delta here — rather than inventing 42 rows — is the honest state of the data at `d1cefef`.

---

## 4. Tract index (every `kind:"tract"` in the registry; direction, course, span)

**Ascending**

| slug | name | course | span |
| --- | --- | --- | --- |
| `tract-dcml` | Dorsal column-medial lemniscus pathway | fascia gracilis/cuneatus → DC nuclei → internal arcuate → contralateral ML → VPL → S1 | composite; components drawn on plates |
| `tract-spinothalamic` | Spinothalamic tract (anterolateral system) | lateral funiculus → ventrolateral brainstem → VPL; crosses within 1–2 segments | medulla → diencephalon |
| `tract-trigeminothalamic-ventral` | Ventral trigeminothalamic tract | principal sensory V + spinal V → contralateral VPM (trigeminal lemniscus) | pons |
| `tract-trigeminothalamic-dorsal` | Dorsal trigeminothalamic tract | principal sensory V → ipsilateral VPM (ipsilateral mechanosensory route — note in UI) | pons |
| `tract-posterior-spinocerebellar` | Posterior (dorsal/lateral) spinocerebellar tract | Clarke's column → dorsal edge → joins the ICP (restiform body) | medulla (enters ICP at upper medulla) |
| `tract-anterior-spinocerebellar` | Anterior (ventral) spinocerebellar tract | ventrolateral surface → through pons → crosses via SCP near the decussation | medulla → pons → midbrain |
| `tract-auditory-pathway` | Auditory pathway (cochlear nuclei to MGN) | cochlear nuclei → trapezoid body/SOC → lateral lemniscus → IC → brachium → MGN | composite; components on plates |
| `tract-spinoreticular` | Spinoreticular tract | spinal cord → reticular formation → intralaminar thalamus (RAS arousal) | medulla → pons → midbrain |

**Descending**

| slug | name | course | span |
| --- | --- | --- | --- |
| `tract-corticospinal-lateral` | Corticospinal tract (lateral) | internal capsule → crus cerebri → basis pontis → pyramid → pyramidal decussation → lateral funiculus | diencephalon → spinal cord |
| `tract-corticobulbar` | Corticobulbar tract | internal capsule → crus (medial) → basis pontis → cranial nerve motor nuclei | diencephalon → pons/medulla |
| `tract-corticopontine` | Corticopontine tract | frontopontine (medial) + temporoparietooccipitopontine (lateral) → pontine nuclei | diencephalon → pons |
| `tract-rubrospinal` | Rubrospinal tract | red nucleus → decussates ventromedially at the RN level → contralateral ventrolateral cord | midbrain → spinal cord |
| `tract-tectospinal` | Tectospinal tract | superior colliculus → dorsal tegmental decussation → contralateral medial cord/neck | midbrain → spinal cord |
| `tract-lateral-vestibulospinal` | Lateral vestibulospinal tract | lateral vestibular nucleus → ipsilateral ventrolateral funiculus | pons → spinal cord |
| `tract-medial-vestibulospinal` | Medial vestibulospinal tract | medial vestibular nucleus → MLF/interfascicular bundle → neck and upper limb | pons → spinal cord |
| `tract-reticulospinal` | Reticulospinal tract (pontine and medullary) | pontine (medial) + medullary (lateral) reticular formation → ventromedial cord | pons/medulla → spinal cord |
| `tract-hypothalamospinal` | Hypothalamospinal (sympathetic) tract | hypothalamus → lateral tegmentum → intermediolateral column (T1–L2) | diencephalon → spinal cord |

**Mixed / interneuron / peduncular**

| slug | name | course | owner |
| --- | --- | --- | --- |
| `tract-mlf` | Medial longitudinal fasciculus (MLF) | vestibular ↔ CN III/IV/VI internuclear fibers + tectobulbar; paramedian, floor of the 4th ventricle | midbrain (spans medulla→midbrain) |
| `tract-central-tegmental` | Central tegmental tract | red nucleus → inferior olive (rubro-olivary) + ventral tegmental RF fibers | midbrain (spans pons/medulla) |
| `tract-scp` | Superior cerebellar peduncle | dentate/interposed/fastigial → decussation → VL/VA and RN | midbrain |
| `tract-mcp` | Middle cerebellar peduncle | pontine nuclei → contralateral cerebellar hemisphere | pons |
| `tract-icp` | Inferior cerebellar peduncle | DC nuclei / olive / PSCT → cerebellum (restiform body) | medulla |
| `tract-crus-cerebri` | Crus cerebri | cortico-fugal bundle (see §3.2 somatotopy) | midbrain |
| `tract-scp-decussation` | Superior cerebellar peduncle decussation | ventral midline crossing of the SCP at the caudal midbrain | midbrain |
| `tract-trapezoid-body` | Trapezoid body | ventral cochlear nuclei → SOC/contralateral LL | pons |
| `tract-lateral-lemniscus` | Lateral lemniscus | SOC/cochlear nuclei → inferior colliculus | pons → midbrain |
| `tract-stria-medullaris` | Stria medullaris thalami | limbic afferents → habenula | diencephalon |
| `tract-posterior-commissure` | Posterior commissure | transverse dorsal midline decussation (vertical gaze) | diencephalon |
| `tract-mesencephalic-v` | Mesencephalic trigeminal tract | jaw proprioception fibers of CN V | midbrain |
| `tract-fasciculus-gracilis` / `tract-fasciculus-cuneatus` | dorsal column fasciculi | see §3.4 | medulla |
| `tract-pyramid` / `tract-pyramidal-decussation` / `tract-internal-arcuate` / `tract-medial-lemniscus` / `tract-spinal-trigeminal` | | see §3.4 | medulla |

### 4.1 Recorded gap: tracts with no plate label (verified 2026-09-10)

The 12 plate SVGs carry **122** distinct `data-structure` slugs between them. Eight of the 19 authored tract records appear in none of them:

`tract-dcml` · `tract-trigeminothalamic-ventral` · `tract-trigeminothalamic-dorsal` · `tract-auditory-pathway` · `tract-spinoreticular` · `tract-lateral-vestibulospinal` · `tract-medial-vestibulospinal` · `tract-hypothalamospinal`

**This is a 2D discoverability gap, not a 3D one.** All 19 records carry complete, in-bounds path data (`waypoints` 5–8 points each, `tubeRadius`, `color`, `levels`) and every one of them renders as a tube through the existing `TractTube` path, so nothing is missing from the viewer — they simply cannot be found by eye on a plate yet. Measured per record on 2026-09-10 against the canonical bounds (`CLIP_BOUNDS`, `x ∈ [−48, 48]`, `y ∈ [−55, 45]`, `z ∈ [−56, 26]`): **every waypoint of every one of the 19 tracts is inside the box** (widest excursions across the set: x −6.5…+6.5, y −52…+40, z −7.5…+8), every `tubeRadius` is 0.4–0.9, every `color` is a palette hex (`#3b82f6` ascending, `#8b5cf6` descending, `#a78bfa` mixed), and every `levels[]` id resolves in `levels.json`. **No tract path field was added or edited in this run — which records were touched: none** — because there was nothing missing to fix; the eight below are exactly the eight that lack a plate label, and that is a plate-authoring gap. Two of the eight (`tract-dcml`, `tract-auditory-pathway`) are **composite pathway records that must never be plate-tagged** by the convention at the head of this document, so only six are genuinely taggable; giving them plate presence is a future content-run decision (it needs new SVG geometry, not just a label).

Separately, **17 of the 36 registry tracts at the pinned revision have no authored record at all** (`tract-pyramid`, `tract-scp`, `tract-mcp`, `tract-icp`, `tract-medial-lemniscus`, `tract-fasciculus-gracilis`, `tract-fasciculus-cuneatus`, `tract-internal-arcuate`, `tract-pyramidal-decussation`, `tract-spinal-trigeminal`, `tract-crus-cerebri`, `tract-scp-decussation`, `tract-mesencephalic-v`, `tract-stria-medullaris`, `tract-posterior-commissure`, `tract-trapezoid-body`, `tract-lateral-lemniscus`): they are 2D-label-only — registry entries with plate presence but no 3D tube and no `tracts.json` record. Authoring them is likewise a content-run decision, recorded here so the two different gaps are not conflated. **AMENDMENT B update:** the registry now carries **51** tract entries (15 telencephalic tracts were added, none with an authored record), so at the current revision the stub count is **32 of 51** — the 17 above plus those 15. The authored side is unchanged: still 19 `tracts.json` records, still the same 8 without a plate label.

---

## 5. Syndromes (`syndromes/*.json`, 26 records — §3.7)

`structures[]` ids below must resolve in `taxonomy.json` (they do — re-verified from the data on 2026-09-10). The table is **regenerated from the record files and reproduced verbatim** (id · name · `structures[]` · `vascularTerritory`; eponyms shown only where they add information). The previous revision listed 23 records and had drifted in four ways, all fixed here: it **omitted** `syn-lateral-pontine` and `syn-peduncular-hallucinosis`, it **claimed** a `syn-central-horner` that existed in no data file, it **abbreviated** the `structures[]` lists (e.g. row 1 omitted `tract-icp`), and it **miscounted** the total. `syn-one-and-a-half` and `syn-central-horner` were authored on 2026-09-10: the first was the audit's missing classic syndrome; the second **resolves the doc/data mismatch by authoring the record** (structures `tract-hypothalamospinal` + `nuc-medullary-reticular`, both of which resolve) rather than deleting the claim.

| # | id | name (eponym/alt) | structures[] | vascularTerritory |
| --- | --- | --- | --- | --- |
| 1 | `syn-dejerine-roussy` | Déjérine-Roussy thalamic pain syndrome | nuc-vpl, nuc-pulvinar | PCA — thalamogeniculate artery (inferolateral thalamic territory) |
| 2 | `syn-percheron` | Artery-of-Percheron paramedian thalamic infarction | nuc-intralaminar, nuc-md, nuc-midline-thalamic | PCA — paramedian thalamic (posterior thalamoperforating) territory supplied by a single artery of Percheron off one P1 segment |
| 3 | `syn-tuberothalamic` | Tuberothalamic artery syndrome (aphasia-plus) | nuc-thalamic-anterior, nuc-va, nuc-vl | PCA — tuberothalamic (anterior thalamoperforating) artery from the P1/posterior communicating junction |
| 4 | `syn-korsakoff` | Wernicke-Korsakoff syndrome | nuc-mammillary-body, nuc-thalamic-anterior, nuc-md | None — metabolic-toxic (thiamine deficiency), not a vascular territory |
| 5 | `syn-hypothalamic` | Hypothalamic syndrome — central DI, SIADH, and autonomic crises | nuc-supraoptic, nuc-paraventricular, nuc-preoptic, nuc-ventromedial | Circle-of-Willis hypothalamic perforators (anterior communicating/superior hypophyseal rostrally; posterior communicating and P1/PCA paramedially) — often sellar/suprasellar mass effect rather than stroke |
| 6 | `syn-pineal-region` | Pineal region tumor with gaze palsy | nuc-pineal-gland, nuc-pretectal, nuc-superior-colliculus, nuc-edinger-westphal | None — mass effect (pineal region tumor compressing the pretectal plate, posterior commissure and cerebral aqueduct) with obstructive hydrocephalus |
| 7 | `syn-hemiballismus` | Hemiballismus | nuc-subthalamic | Perforating branches of the posterior communicating artery and anterior choroidal artery to the subthalamic nucleus (classically a small lacunar infarct) |
| 8 | `syn-weber` | Weber syndrome | nuc-oculomotor, tract-crus-cerebri, tract-corticospinal-lateral, tract-corticobulbar | Paramedian branches of the posterior cerebral artery (posterior thalamoperforating / midbrain perforators) |
| 9 | `syn-benedikt` | Benedikt syndrome | nuc-oculomotor, nuc-edinger-westphal, nuc-red-nucleus, tract-medial-lemniscus | Paramedian branches of the posterior cerebral artery (posterior thalamoperforating / paramedian midbrain) |
| 10 | `syn-claude` | Claude syndrome | nuc-red-nucleus, nuc-oculomotor, nuc-dentate, tract-scp | Paramedian branches of the posterior cerebral artery |
| 11 | `syn-nothnagel` | Nothnagel syndrome | nuc-superior-colliculus, nuc-oculomotor, nuc-red-nucleus | Superior cerebellar artery and collicular/quadrigeminal branches of the posterior cerebral artery |
| 12 | `syn-parinaud` | Parinaud syndrome (dorsal midbrain) | nuc-pretectal, nuc-superior-colliculus, nuc-pineal-gland, nuc-edinger-westphal | Collicular/quadrigeminal branches of the posterior cerebral artery; pineal region masses cause the syndrome by mass effect rather than ischemia |
| 13 | `syn-ino` | Internuclear ophthalmoplegia (MLF) | tract-mlf, nuc-abducens, nuc-oculomotor | Paramedian branches of the basilar artery |
| 14 | `syn-parkinson` | Parkinson's disease (paralysis agitans) | nuc-snc, nuc-snr | None (degenerative alpha-synucleinopathy, not vascular) |
| 15 | `syn-peduncular-hallucinosis` | Peduncular hallucinosis (Lhermitte) | tract-crus-cerebri, nuc-snc, nuc-red-nucleus, nuc-md | Paramedian branches of the basilar tip / posterior cerebral artery (midbrain perforators and paramedian thalamic perforators, including artery-of-Percheron territory) |
| 16 | `syn-lateral-medullary` | Lateral medullary syndrome (Wallenberg) | nuc-spinal-trigeminal, tract-spinal-trigeminal, nuc-solitarius-caudal, nuc-ambiguus, nuc-dmv, tract-anterior-spinocerebellar, tract-icp, tract-spinothalamic, nuc-medullary-reticular | Posterior inferior cerebellar artery (PICA), usually occluded at its vertebral origin; occasionally the vertebral artery directly |
| 17 | `syn-medial-medullary` | Medial medullary syndrome (Déjerine anterior bulbar) | tract-pyramid, tract-medial-lemniscus, nuc-hypoglossal | Anterior spinal artery (paramedian branches of the vertebral artery) |
| 18 | `syn-hemimedullary` | Hemimedullary syndrome (Reinhold) | tract-pyramid, tract-medial-lemniscus, nuc-hypoglossal, nuc-spinal-trigeminal, nuc-ambiguus, nuc-dmv, tract-spinothalamic | Occlusion of the vertebral artery at the medullary foramina (conjoint ASA + PICA supply of one hemicord-half of the medulla) |
| 19 | `syn-millard-gubler` | Millard-Gubler syndrome | nuc-facial, nuc-abducens, nuc-pprf, tract-corticospinal-lateral, tract-corticobulbar | Basilar artery paramedian perforators, or the AICA territory at the caudal-ventral pons |
| 20 | `syn-foville` | Foville syndrome | nuc-facial, nuc-abducens, nuc-pprf, tract-medial-lemniscus, tract-lateral-lemniscus | Paramedian perforating branches of the basilar artery (dorsal caudal pons), sometimes AICA |
| 21 | `syn-locked-in` | Locked-in syndrome | tract-corticospinal-lateral, tract-corticobulbar, ctx-pontine-nuclei, ctx-pontine-fibers | Occlusion of the basilar artery (thrombotic or embolic) with sparing of the tegmentum |
| 22 | `syn-cpm` | Central pontine myelinolysis (osmotic demyelination syndrome) | tract-corticospinal-lateral, tract-corticobulbar, ctx-pontine-nuclei | None — osmotic (metabolic) demyelination of the central basis pontis, not a vascular territory |
| 23 | `syn-cerebellar` | Cerebellar syndrome (dentate/SCP) | nuc-dentate, nuc-interposed, nuc-fastigial, tract-scp | Superior cerebellar artery (SCA) for the dentate/SCP complex; AICA and PICA for the other deep-nucleus territories |
| 24 | `syn-lateral-pontine` | Lateral pontine syndrome (AICA syndrome) | nuc-facial, nuc-principal-sensory-v, nuc-spinal-trigeminal, tract-spinal-trigeminal, nuc-vestibular-superior, nuc-vestibular-medial, nuc-vestibular-lateral, nuc-vestibular-inferior, nuc-cochlear-ventral, nuc-cochlear-dorsal, surf-cn7-exit, surf-cn8-exit, tract-mcp | Anterior inferior cerebellar artery (AICA), including its internal auditory (labyrinthine) branches |
| 25 | `syn-one-and-a-half` | One-and-a-half syndrome (Fisher — PPRF/abducens plus ipsilateral MLF) | nuc-pprf, tract-mlf | Basilar artery paramedian perforators at the dorsal caudal pons (also small tegmental haemorrhage, tumour or demyelinating plaque) |
| 26 | `syn-central-horner` | Central Horner syndrome (first-order/central sympathetic paresis) | tract-hypothalamospinal, nuc-medullary-reticular | Posterior inferior cerebellar artery / vertebral artery in the dorsolateral medulla; basilar paramedian perforators in the pons; anterior spinal artery in the cervical cord |

---

## 5.1 Clinical-item coverage (`clinical[]` on structure and tract records)

**Post-state, 2026-09-10: 0 records without clinical content** (118 structure records + 19 tract records). Eleven records previously omitted `clinical` altogether — `nuc-cochlear-dorsal`, `nuc-superior-olivary`, `nuc-interposed`, `nuc-inferior-olive-medial`, `nuc-arcuate-medullary`, `nuc-nucleus-cuneatus`, `nuc-vestibular-inferior`, `tract-lateral-lemniscus`, `tract-trapezoid-body`, `tract-internal-arcuate`, `tract-fasciculus-cuneatus` — and all eleven now carry a first item. Fifteen further records that had exactly one item gained a second; the single-item population therefore went **51 → 47** (51 − 15 + 11). Note the last term: the eleven rescued records enter the population *as* single-item records, so the plan's stated target of "51 → 36" omits them and is an arithmetic slip in the plan, not a shortfall here — 47 is the correct post-state and is what the data shows.

**Selection rule for the fifteen second items** (data-derived, deterministic, evaluated on the *pre-change* state): score = 3 × (number of syndrome records whose `structures[]` lists the id) + 1 × (number of authored plate SVGs carrying a `data-structure` label for the id); single-item records are ranked by score descending, then by id ascending, and the **top fifteen** were taken (the brief caps this addition at fifteen). This is a pure rank cut, not a hand-picked list — re-running the score on the pre-change state reproduces the table below exactly, ids and order.

Note the honest boundary: **sixteen** single-item records clear a score of 5, so the cut is *rank 15*, not a score threshold. The sixteenth, `vent-fourth-ventricle` (0 syndrome references, 5 plate labels, score 5), was excluded solely because the brief fixes the count at fifteen; it is the single most-teachable record left with one item, and extending it is the obvious next increment if the cap is ever raised. Below it the score drops to 4 (`nuc-cochlear-ventral`, `nuc-fastigial`, `nuc-mesencephalic-v`), so nothing else is close.

| # | id | syndrome refs | plate labels | score |
| --- | --- | --- | --- | --- |
| 1 | `tract-medial-lemniscus` | 4 | 8 | 20 |
| 2 | `nuc-spinal-trigeminal` | 3 | 5 | 14 |
| 3 | `tract-spinal-trigeminal` | 2 | 5 | 11 |
| 4 | `tract-pyramid` | 2 | 4 | 10 |
| 5 | `nuc-ambiguus` | 2 | 3 | 9 |
| 6 | `tract-scp` | 2 | 3 | 9 |
| 7 | `ctx-pontine-fibers` | 1 | 5 | 8 |
| 8 | `nuc-dmv` | 2 | 2 | 8 |
| 9 | `nuc-hypoglossal` | 2 | 2 | 8 |
| 10 | `nuc-snr` | 1 | 3 | 6 |
| 11 | `nuc-midline-thalamic` | 1 | 2 | 5 |
| 12 | `nuc-vestibular-medial` | 1 | 2 | 5 |
| 13 | `nuc-vestibular-superior` | 1 | 2 | 5 |
| 14 | `nuc-vl` | 1 | 2 | 5 |
| 15 | `tract-icp` | 1 | 2 | 5 |
| — | *rank 16, below the cap — not taken*: `vent-fourth-ventricle` | 0 | 5 | 5 |
| — | *rank 17 (score drops to 4)*: `nuc-cochlear-ventral` | 1 | 1 | 4 |

Every new item keeps the existing `{ syndrome, findings, vascular?, note? }` shape and its neighbours' field style — a `findings` paragraph, a `vascular` territory where one applies, and a `note` teaching pearl where the point is worth stating — and every one is an original paraphrase. (Source citations are a **record-level** field, not an item field: all 26 authoring targets kept their existing top-level `refs[]` untouched — 136 of the 137 records carry a Blumenfeld / Patten / RadioGraphics citation, the one exception being `nuc-cochlear-dorsal`, which was authored with the two auditory-system sources it ships (Nolte; Duke brainstem sectional-anatomy lab) and keeps them. No authored item invents a new source.) `vascular` is present on **25 of the 26** authored items and omitted exactly once, where no arterial territory applies — `nuc-ambiguus` (progressive bulbar palsy, a motor-neuron degeneration); every item that has a territory names it.

---

## 6. Vascular map (§3.8 — string `bloodSupply` fields; no vessel records, no 3D vessels in v1)

| Artery | Supplies (structure ids / structures) | Syndrome association |
| --- | --- | --- |
| Anterior spinal artery (ASA) | tract-pyramid, tract-medial-lemniscus, nuc-hypoglossal | medial medullary |
| Posterior inferior cerebellar artery (PICA) | nuc-spinal-trigeminal, tract-spinal-trigeminal, nuc-solitarius-caudal, nuc-ambiguus, nuc-dmv, nuc-area-postrema, tract-anterior-spinocerebellar, tract-spinothalamic (dorsolateral/a lateral surface), nuc-medullary-reticular, tract-icp | lateral medullary |
| Vertebral artery | entire medulla (ASA + PICA) | hemimedullary |
| Basilar + paramedian perforators | tract-corticospinal-lateral, tract-corticobulbar, tract-medial-lemniscus, nuc-abducens, nuc-facial, nuc-pprf, tract-mlf, ctx-pontine-nuclei, ctx-pontine-fibers | Millard-Gubler, Foville, locked-in, INO |
| Anterior inferior cerebellar artery (AICA) | nuc-cochlear-ventral, nuc-cochlear-dorsal, nuc-vestibular-*, nuc-facial, surf-cn7-exit, surf-cn8-exit, nuc-principal-sensory-v (lower), nuc-spinal-trigeminal (upper part) | CPA/vestibulocochlear syndromes |
| Superior cerebellar artery (SCA) | ctx-cerebellum, nuc-dentate, nuc-interposed, nuc-fastigial, nuc-pontine-reticular (tegmentum), nuc-superior-colliculus (lateral collicular), nuc-red-nucleus (lateral), nuc-trigeminal-motor (upper) | cerebellar, Nothnagel |
| Posterior cerebral artery (PCA) — thalamogeniculate | nuc-vpl, nuc-vpm, nuc-lgn, nuc-pulvinar | Déjérine-Roussy |
| PCA — tuberothalamic | nuc-thalamic-anterior, nuc-va, nuc-vl | tuberothalamic aphasia-plus |
| PCA — paramedian thalamic (Artery of Percheron) | nuc-intralaminar, nuc-md, nuc-midline-thalamic | Percheron |
| PCA — collicular / quadrigeminal | nuc-superior-colliculus, nuc-inferior-colliculus, nuc-pretectal, nuc-pineal-gland | Parinaud (dorsal midbrain) |
| PCA/SCA — midbrain paramedian perforators | nuc-oculomotor, nuc-edinger-westphal, nuc-red-nucleus, tract-crus-cerebri | Weber, Benedikt, Claude |

---

## 7. Plates — per-plate region lists and layout guidance

Rules: transverse = dorsal top, patient LEFT on image right. Requirements below assume the standard textbook section conventions (Blumenfeld *Neuroanatomy through Clinical Cases* transverse level figures; Patten *Neurological Differential Diagnosis* brainstem plates). Every required slug MUST be drawn with `data-structure` and a label. Optional slugs: include only if the detail is in your drawing — when present they MUST also carry the slug and a label.

### 7.1 `plate-pyramid-decuss` — transverse @ `lvl-pyramid-decuss` (y = −46) — **closed medulla**

Section outline: rounded/scalloped square; gracile and cuneate tubercles at the dorsal edge; ventral pyramids interrupted midline by the cross. The 4th ventricle is NOT present (closed medulla). Ventral = pyramids/decussation; dorsal = DC nuclei.

Required (19 — recomputed from the plate SVG on 2026-09-10):

- **Dorsomedial pair (dorsal → deep)**: `tract-fasciculus-gracilis` — dorsal, most medial (column of Goll); `nuc-nucleus-gracilis` — its caudal pole, immediately deep/ventral to the fasciculus; `tract-fasciculus-cuneatus` — dorsal, just lateral to the gracile column; `nuc-nucleus-cuneatus` — deep to the cuneate fasciculus.
- **Dorsolateral margin**: `tract-spinal-trigeminal` — the long dorsolateral subpial bundle at the lateral border; `nuc-spinal-trigeminal` — deep (medial) to the tract; `tract-posterior-spinocerebellar` — small subpial oval at the dorsolateral edge, immediately lateral to the spinal V tract.
- **Ventrolateral margin**: `tract-anterior-spinocerebellar` — most lateral, subpial; `tract-spinothalamic` — slightly deeper, between the anterior SCT and the spinal V surface; `tract-corticospinal-lateral` — in the lateral funiculus, just dorsal to the spinothalamic (crossed fibers already in the lateral column at this level).
- **Ventral**: `tract-pyramid` — the small uncrossed pyramid remnants, ventrolateral; `tract-pyramidal-decussation` — the prominent midline crossing bundle; its diagonal fibers interrupt the anterior median fissure.
- **Central/tegmental**: `tract-internal-arcuate` — fine fibers already arching ventromedially from the DC nuclei toward the midline; the crossing is completed at the next level; `tract-mlf` — small midline paramedian bundle just ventral to the central gray (interfascicular bundle); `nuc-medullary-reticular` — large intermediate tegmentum area lateral to the MLF and central gray; `tract-reticulospinal` — descends in the ventrolateral tegmentum, intermingled with the lateral RF.
- **Ventral surface**: `nuc-arcuate-medullary` — tiny superficial nodules at the ventromedial surface beside the decussation.
- **Lateral surface**: `surf-cn11-exit` — the spinal/cranial accessory rootlets ascending along the lateral margin.

No optionals at this level: `nuc-ambiguus` — rostral pole only, deep in the lateral tegmentum at the superior edge of this section — **is drawn on the plate**, so it is counted in the 19 above.

### 7.2 `plate-sensory-decuss` — transverse @ `lvl-sensory-decuss` (y = −42) — **closed medulla, internal arcuate crossing**

Same closed outline; the crux is the white band crossing ventral to the central gray (sensory decussation), with the freshly formed medial lemniscus paramedian ventral. Pyramids now intact bilaterally at the ventromedial surface.

Required (22):

- **Dorsomedial**: `tract-fasciculus-gracilis` (small remnant), `nuc-nucleus-gracilis` (maximal here — the tubercle), `tract-fasciculus-cuneatus` (small), `nuc-nucleus-cuneatus` (the cuneate tubercle, dorsolateral).
- **Central crossing**: `tract-internal-arcuate` — the wide decussation band sweeping across the midline just ventral to the central gray (fibers from the DC nuclei); arrows/leader to the band.
- **Ventromedial**: `tract-medial-lemniscus` — freshly formed flattened paramedian band ventral to the decussation, hugging the pyramids: **lower-limb fibers lateral, upper-limb medial**; `tract-pyramid` — intact pyramids at the ventromedial surface (pre-decussation).
- **Dorsolateral margin**: `nuc-hypoglossal` — paired paramedian columns at the midline just ventral to the central gray; `nuc-dmv` — small nucleus immediately lateral to the hypoglossal nucleus; `nuc-solitarius-caudal` — dorsolateral, medial to the spinal V nucleus (with its tract along its lateral edge); `tract-spinal-trigeminal` / `nuc-spinal-trigeminal` — subpial bundle + nucleus, lateral; `tract-posterior-spinocerebellar` — dorsolateral edge; `tract-icp` **not yet** — ICP forms above this level.
- **Ventrolateral**: `tract-spinothalamic`, `tract-anterior-spinocerebellar`, `tract-corticospinal-lateral` — same relationships as plate 7.1.
- **Tegmentum**: `tract-mlf` (midline, just ventral to the central gray), `nuc-medullary-reticular`, `tract-reticulospinal`.
- **Lateral/surface**: `nuc-ambiguus` — deep tegmentum, between the spinal V complex and the olive region; `surf-cn11-exit`; `nuc-arcuate-medullary` — ventral surface, medial to the pyramids, near the midline.

### 7.3 `plate-olivary` — transverse @ `lvl-olivary` (y = −34) — **open medulla, mid-olive**

The classical open-medulla plate: dorsal = V-shaped 4th ventricle apex (obex) between the ICPs; ventral = olive + pyramid. The obex and area postrema sit at the dorsal apex.

Required (23):

- **Dorsal midline (floor → surface)**: `vent-fourth-ventricle` — V-shaped roof line (tela/choroid), apex at the obex; `nuc-area-postrema` — paired tiny blobs immediately lateral to the obex at the dorsal surface; `nuc-hypoglossal` — paired paramedian columns just beneath the floor; `nuc-dmv` — immediately lateral to the hypoglossal columns.
- **Dorsolateral**: `nuc-solitarius-caudal` — dorsolateral, medial to the spinal V nucleus; `tract-spinal-trigeminal` — subpial dorsolateral bundle; `nuc-spinal-trigeminal` — deep to it; `tract-icp` — the large dorsolateral bundle at the lateral margin (the medial-lateral shift: spinal V tract is medial to the ICP; posterior spinocerebellar fibers `tract-posterior-spinocerebellar` merge into the ICP here).
- **Ventromedial**: `tract-medial-lemniscus` — flattened paramedian band, dorsal to the pyramid; `tract-pyramid` — ventromedial at the surface; `nuc-inferior-olive-principal` — the large folded crescent ventrolateral, immediately lateral to the pyramid/ML; `nuc-inferior-olive-medial` — smaller paramedian fold between the pyramid and the principal olive.
- **Ventrolateral margin**: `tract-spinothalamic` — between olive and spinal V at the lateral surface; `tract-anterior-spinocerebellar` — the most lateral subpial bundle.
- **Tegmentum**: `tract-mlf` — paramedian midline just ventral to the hypoglossal nuclei; `nuc-ambiguus` — deep tegmentum lateral to the ML, medial to the spinal V/ICP territory; `nuc-medullary-reticular` — the large intermediate tegmentum; `tract-reticulospinal` — ventrolateral tegmentum.
- **Surface landmarks**: `surf-cn12-exit` — preolivary sulcus rootlets (medial to the olive); `surf-cn9-exit` and `surf-cn10-exit` — postolivary sulcus rootlets (lateral to the olive), CN IX uppermost; `nuc-arcuate-medullary` — ventromedial surface nodules.

Optional (2): `nuc-nucleus-gracilis`, `nuc-nucleus-cuneatus` — only if your section reaches the dorsal surface at the obex (they are at their rostral tips here); otherwise omit.

### 7.4 `plate-pons-caudal` — transverse @ `lvl-pons-caudal` (y = −18) — **lower pons (CN VI–VIII)**

Crux: the facial colliculus bulge over the abducens nucleus, the facial nucleus with the internal genu, the trapezoid body spanning the ventral tegmentum, and the cochlear nuclei at the lateral surface (cerebellopontine angle).

Required (30):

- **Dorsal midline (floor → deep)**: `vent-fourth-ventricle` — wide tent-shaped cavity; `surf-facial-colliculus` — the floor bulge over the abducens nucleus (draw the CN VII genu fibers shelling over it); `nuc-abducens` — paramedian, deep to the colliculus; `tract-mlf` — midline, at the floor; `nuc-pprf` — paramedian tegmentum lateral to the MLF, adjacent to (and projecting to) the abducens nucleus.
- **Dorsolateral floor**: `nuc-vestibular-medial` — paramedian, at the lateral part of the floor; `nuc-vestibular-lateral` — lateral (Deiters), at the lateral angle of the ventricle; `nuc-vestibular-inferior` — extends caudally, medial/dorsomedial, may be drawn at the caudal margin; `nuc-locus-coeruleus` **not at this level** (upper pons only).
- **Lateral surface**: `nuc-cochlear-ventral` — ventrolateral at the CP angle; `nuc-cochlear-dorsal` — posterolateral, on the dorsolateral surface over the ICP (acoustic tubercle); `tract-icp` — dorsolateral subpial bundle; `tract-mcp` — the lateral mass, dominating the lateral aspect; `tract-spinal-trigeminal` / `nuc-spinal-trigeminal` — at the dorsolateral border, lateral to the ventricular floor; `tract-lateral-lemniscus` — subpial lateral tegmentum adjacent to the MCP (lateral sound-ascending bundle).
- **Ventral tegmentum**: `tract-trapezoid-body` — the horizontal fiber band in the ventral tegmentum, just dorsal to the basis; `nuc-superior-olivary` — small lateral cluster embedded in the trapezoid band, medial to the LL; `tract-medial-lemniscus` — paramedian vertical band deep in the ventral tegmentum, medial to the trapezoid body; `tract-central-tegmental` — dorsolateral to the MLF/PPRF, lateral paramedian tegmentum.
- **Central tegmentum**: `nuc-facial` — ventrolateral tegmentum, deep to the pontine surface (draw its fibers arcing dorsomedially around the abducens nucleus = internal genu); `nuc-superior-salivatory` — small nucleus just dorsomedial to the facial nucleus; `nuc-solitarius-rostral` — dorsolateral tegmentum medial to the spinal V complex (gustatory part); `nuc-pontine-reticular` — tegmentum core, lateral to the MLF (the medullary reticular formation does not appear at this level).
- **Basis pontis**: `ctx-pontine-nuclei` — gray clusters amid the fibers; `ctx-pontine-fibers` — the longitudinal/transverse fiber systems; `tract-corticospinal-lateral` — central longitudinal bundles (pre-decussation; tag the basis CST); `tract-corticobulbar` — dorsal/medial edge of the longitudinal bundle.
- **Surface**: `surf-cn7-exit` — CPA, at the lateral surface; `surf-cn8-exit` — just behind/above CN VII at the CPA; `surf-cn6-exit` — ventromedial at the inferior margin (CN VI exits at the pontomedullary junction, the bottom edge of this section).

Optional (3): `tract-lateral-vestibulospinal` — ventrolateral tegmentum subpial; `tract-medial-vestibulospinal` — with the MLF/interfascicular fibers; `nuc-vestibular-superior` — upper edge only — likely omitted at this level.

### 7.5 `plate-pons-middle` — transverse @ `lvl-pons-middle` (y = −8) — **midpontine (CN V)**

Crux: the trigeminal nerve root at the mid-lateral surface; the motor nucleus dorsomedial in the tegmentum; the principal sensory nucleus at the root entry; the massive middle cerebellar peduncle.

Required (21):

- **Dorsal midline**: `vent-fourth-ventricle` — narrower, midline; `tract-mlf` — paramedian at the floor; `nuc-pontine-reticular` — tegmentum, lateral to the MLF; `tract-central-tegmental` — lateral paramedian tegmentum, adjacent to the MLF.
- **Dorsolateral floor**: `nuc-vestibular-superior` — at the lateral angle of the floor (adjacent to the SCP region); `nuc-vestibular-medial` — rostral extent, at the floor medial to the superior; may be drawn at the caudal margin.
- **Lateral (V root zone)**: `nuc-principal-sensory-v` — subpial at the lateral surface where the V root enters (root = `surf-cn5-exit`); `nuc-trigeminal-motor` — dorsomedial in the tegmentum, just lateral to the MLF/floor region; `tract-spinal-trigeminal` / `nuc-spinal-trigeminal` — continue at the dorsolateral margin, medial to the MCP; `nuc-mesencephalic-v` — small cell cluster at the dorsolateral border of the floor (lateral to the ventricle), with `tract-mesencephalic-v` alongside; `tract-mcp` — the lateral half, massive; `tract-lateral-lemniscus` — subpial at the lateral tegmentum, medial to the V root/MCP.
- **Ventral tegmentum**: `tract-medial-lemniscus` — paramedian vertical band deep in the ventral tegmentum.
- **Basis**: `ctx-pontine-nuclei`, `ctx-pontine-fibers`, `tract-corticospinal-lateral`, `tract-corticobulbar`, `tract-corticopontine` (longitudinal bundles + transverse ponto-cerebellar fibers intermingled; CST central, corticobulbar dorsal-medial, corticopontine lateral).

Optional (5): `nuc-superior-olivary` + `tract-trapezoid-body` — caudal margin only (the SOC/trapezoid zone ends near the lower border of this section); `nuc-locus-coeruleus` — lower pole at the dorsolateral border of the floor; `tract-lateral-vestibulospinal`, `tract-medial-vestibulospinal` — ventrolateral/medial tegmentum descending bundles.

### 7.6 `plate-pons-rostral` — transverse @ `lvl-pons-rostral` (y = +2) — **upper pons**

Crux: the superior cerebellar peduncle at the dorsolateral ventricle border, the locus coeruleus, and the mesencephalic V tract; the rostral end of the ventricular floor. ICP has entered the cerebellum below this level.

Required (19):

- **Dorsal midline**: `vent-fourth-ventricle` — narrow, high; `tract-mlf` — paramedian at the floor; `nuc-pontine-reticular` — tegmentum core, lateral to the MLF; `tract-central-tegmental` — lateral paramedian.
- **Dorsolateral**: `tract-scp` — the large dorsolateral bundle at the ventricle border (brachium conjunctivum); `nuc-locus-coeruleus` — dark small cluster at the ventrolateral margin of the floor, medial to the SCP; `nuc-vestibular-superior` — lateral angle of the floor below the SCP; `nuc-mesencephalic-v` + `tract-mesencephalic-v` — dorsolateral tegmentum at the aqueduct-floor border.
- **Lateral**: `tract-mcp` — still massive laterally, shrinking; `tract-lateral-lemniscus` — subpial lateral tegmentum, ascending; `tract-anterior-spinocerebellar` — lateral tegmentum, fibers moving dorsomedially toward the SCP (they cross near the SCP decussation above).
- **Ventral tegmentum**: `tract-medial-lemniscus` — paramedian deep band (now shifted laterally/ventrally, achieving its midbrain position).
- **Basis**: `ctx-pontine-nuclei`, `ctx-pontine-fibers`, `tract-corticospinal-lateral`, `tract-corticobulbar`, `tract-corticopontine`.
- **Surface**: `surf-cn4-exit` — dorsal midline at the superior medullary velum (the CN IV exit point just below the inferior colliculus; per plan §2 this level is the ICP→SCP transition — draw the trochlear roots at the dorsal midline).

Optional (3): `nuc-pprf` (rostral extent, paramedian adjacent to the MLF — likely omit), `tract-lateral-vestibulospinal`, `tract-medial-vestibulospinal` (descending bundles in the ventrolateral/medial tegmentum).

### 7.7 `plate-midbrain-ic` — transverse @ `lvl-midbrain-ic` (y = +8) — **inferior colliculus**

Crux: paired inferior colliculi forming the dorsal humps, aqueduct + PAG central, the SCP crossing in the ventral midline (decussation), the trochlear nucleus just lateral to the MLF. Ventral surface smooth (no crus cerebri yet).

Required (25 — recomputed from the plate SVG on 2026-09-10):

- **Dorsal**: `nuc-inferior-colliculus` — paired humps, dorsal; `surf-cn4-exit` — dorsal midline, immediately below the ICs (trochlear roots emerging).
- **Central**: `vent-cerebral-aqueduct` — central round CSF space; `nuc-pag` — gray ring around the aqueduct; `nuc-mesencephalic-v` + `tract-mesencephalic-v` — dorsolateral, at the PAG lateral border.
- **Dorsomedial tegmentum**: `nuc-trochlear` — paramedian at the ventrolateral margin of the PAG, adjacent to the MLF; `tract-mlf` — paramedian pair, just lateral to the midline.
- **Midline ventral**: `tract-scp-decussation` — the dense crossing band in the ventral midline tegmentum; `tract-scp` — the peduncles entering the decussation from the ventrolateral (fibers routed dorsomedially); `nuc-dorsal-raphe` — midline, between the MLFs ventral to PAG.
- **Lateral tegmentum**: `tract-lateral-lemniscus` — ascending laterally into the IC; `tract-central-tegmental` — just lateral/ventral to the MLF region; `tract-spinothalamic` — ventrolateral tegmentum, lateral to the ML; `tract-medial-lemniscus` — paramedian ventral band (smaller, near the midline, dorsal to the decussation).
- **Dorsal-lateral tegmentum**: `nuc-cuneiform` — lateral to the PAG, in the dorsal-lateral tegmentum.
- **Descending midline bundle**: `tract-tectospinal` — descending in the dorsal/intermediate tegmentum just lateral to the raphe.
- **Posterior**: `ctx-cerebellum` — the cerebellum (superior surface) behind the ICs; draw the outline and tag with the context record.
- **Ventral block at the inferior margin (caudal midbrain)**: `nuc-snc` + `nuc-snr` — the two substantia nigra tiers at the ventral surface; `tract-crus-cerebri` — the paired ventral bundles, with the crus somatotopy tagged individually (`tract-corticobulbar` medial, `tract-corticospinal-lateral` central, `tract-corticopontine` lateral); `surf-interpeduncular-fossa` — the midline cleft between the crura. This ventral block is what raises the plate's drawn count from 18 to 25.

### 7.8 `plate-midbrain-sc` — transverse @ `lvl-midbrain-sc` (y = +14) — **superior colliculus (CN III)**

Crux: the paired superior colliculi, the oculomotor complex in the midline, the red nucleus (large ovoid) and substantia nigra (dark ventral band) bilaterally; cerebral peduncles at the ventral surface with somatotopic subdivisions; interpeduncular fossa between them.

Required (24 — recomputed from the plate SVG on 2026-09-10):

- **Dorsal**: `nuc-superior-colliculus` — paired dorsal humps; `nuc-pretectal` — at the rostral margin of this section (dorsomedial, just rostral to the SC — tag if drawn at the top edge).
- **Central**: `vent-cerebral-aqueduct`; `nuc-pag`; `nuc-mesencephalic-v` + `tract-mesencephalic-v` (dorsolateral PAG border).
- **Dorsomedial tegmentum**: `nuc-oculomotor` — midline complex between the MLFs, ventromedial tegmentum; `nuc-edinger-westphal` — immediately dorsal/rostral to the CN III complex, midline; `tract-mlf` — paramedian pair just lateral to the CN III complex; `nuc-dorsal-raphe` — midline, dorsal to the CN III complex.
- **Ventrolateral tegmentum**: `nuc-red-nucleus` — large ovoid, ventrolateral; `tract-rubrospinal` — fibers leaving the RN ventromedially (decussating within/below this level); `tract-central-tegmental` — lateral to the RN/ML; `tract-spinothalamic` — lateral to the ML; `tract-medial-lemniscus` — paramedian ventral tegmentum just dorsal to the SN; `tract-tectospinal` — midline, dorsal to the MLF (post-decussation descent).
- **Ventral**: `nuc-snc` — dark dorsal band of the substantia nigra; `nuc-snr` — ventral band, between SNc and the crus; `tract-crus-cerebri` — the paired ventral bundles (somatotopy medial→lateral: frontopontine, corticobulbar, corticospinal, temporoparietooccipitopontine — the crus record covers the bundle; optional finer tags: `tract-corticobulbar`, `tract-corticospinal-lateral`, `tract-corticopontine`).
- **Ventral surface**: `surf-interpeduncular-fossa` — midline triangle between the crura; `surf-cn3-exit` — CN III rootlets emerging from the medial crura into the fossa.

Optional (4 listed; the 3 crus subdivisions **are** drawn and are therefore counted in the 24 above): `ctx-cerebellum` (posterior margin, only if the section includes cerebellar surface — not drawn at this level), `tract-corticobulbar`, `tract-corticospinal-lateral`, `tract-corticopontine` (only if the crus somatotopy is drawn in subdivisions).

### 7.9 `plate-thalamus-mid` — transverse @ `lvl-thalamus-mid` (y = +28) — **mid-thalamus (mammillary bodies)**

Crux: the paired thalamic masses around the slit-like 3rd ventricle, the Y-shaped internal medullary lamina, the mammillary bodies at the ventromedial, and the subthalamus (STN/zona incerta) lateral to the hypothalamus. Horizontal (transverse) brain section, dorsal top.

Required (26):

- **Midline (ventral → dorsal)**: `vent-third-ventricle` — slit-like midline; `nuc-midline-thalamic` — nuclei lining the ventricle wall; `nuc-intralaminar` (CM-PF) — just lateral to the midline, within the lamina region; `ctx-internal-medullary-lamina` — the Y-shaped white lamina splitting the mass (tag the lamina).
- **Thalamic nuclear groups (per side, medial → lateral)**: `nuc-md` — medial principal mass; `nuc-thalamic-anterior` — rostral/dorsal pole; `nuc-lateral-dorsal` — dorsolateral; `nuc-lateral-posterior` — lateral; `nuc-va` — anteroventral; `nuc-vl` — ventrolateral; `nuc-vpl` — posteroventral (leg lateral, arm medial); `nuc-vpm` — posteromedial (adjacent to the midline); `nuc-pulvinar` — caudal margin of the section; `nuc-thalamic-reticular` — thin lateral shell of the thalamus, deep to the internal capsule; `nuc-lgn` — caudolateral bulge; `nuc-mgn` — medial to the LGN, more caudal.
- **Lateral**: `ctx-internal-capsule` — the curved white band lateral to the thalamus/reticular nucleus; `ctx-caudate-nucleus` — anterior margin, head of the caudate at the anterior limb; `ctx-lenticular-nucleus` — lateral to the posterior limb (putamen/pallidum silhouette).
- **Ventral**: `nuc-mammillary-body` — paired ventromedial round nuclei at the inferior midline; `nuc-posterior-hypothalamus` — dorsal to the mammillary bodies, paramedian; `nuc-ventromedial` — anterolateral to the mammillary; `nuc-dorsomedial` — dorsal to the ventromedial.
- **Ventrolateral**: `nuc-subthalamic` — lentiform nucleus just dorsolateral to the SN territory, ventral to the zona incerta; `nuc-zona-incerta` — thin band dorsal to the STN; `ctx-fields-of-forel` — H1/H2 white matter medial to the zona incerta.

Optional (3): `nuc-snc` — inferior margin (caudal pole of the SN, only if the section includes the brainstem surface); `tract-crus-cerebri` / `tract-corticospinal-lateral` — the descending pathway at the inferior margin transitioning into the internal capsule. Note: prefer tagging the individual nuclei; use `ctx-thalamus-envelope` only if you draw the fused thalamic mass as one labeled block.

### 7.10 `plate-sagittal-midline` — sagittal, midline profile

Midline sagittal: corpus callosum above, thalamus + hypothalamus blocks, aqueduct and tectum, 4th ventricle, brainstem profile, pineal, mammillary bodies, optic chiasm. Anterior = left, superior = top. Draw the brainstem outline (`data-role="outline"`), the cerebellum block, and the diencephalic blocks.

Required (26 — recomputed from the plate SVG on 2026-09-10):

- **Dorsal**: `ctx-corpus-callosum` — the great arched white commissure; `nuc-pineal-gland` — behind/above the habenula, at the dorsal midline; `nuc-habenula` — small paramedian pair (drawn dotted at the midline just rostral to the pineal); `tract-stria-medullaris` — the fiber line running to the habenula along the dorsal thalamic edge; `tract-posterior-commissure` — small dorsal midline decussation just above the tectum.
- **Ventricular midline**: `vent-third-ventricle` — slit between corpus callosum and hypothalamus; `vent-cerebral-aqueduct` — the curved channel through the midbrain; `vent-fourth-ventricle` — tent-shaped cavity over the pons/medulla, apex at the obex.
- **Diencephalic blocks**: `ctx-thalamus-envelope` — the large thalamus block (tag the block; dotted nucleus silhouettes optional inside); `ctx-hypothalamus-envelope` — the hypothalamic wedge block; `nuc-mammillary-body` — two round dots at the wedge's caudal-ventral margin; `surf-optic-chiasm` — at the rostral-ventral margin; `surf-infundibulum` — the stalk descending from the tuberal region.
- **Tectum/midbrain**: `nuc-superior-colliculus` — dorsal hump above the aqueduct; `nuc-inferior-colliculus` — dorsal hump below the SC; `nuc-pag` — gray band around the aqueduct.
- **Brainstem profile**: `ctx-pontine-nuclei` — the ventral pontine block; `ctx-pontine-fibers` — the longitudinal fiber streak through it; `tract-pyramid` — the ventral medullary column continuing from the pons; `ctx-cerebellum` — the posterior block; `surf-vermis` — the vermis surface on the cerebellar block; `nuc-fastigial` — dotted deep-nucleus pair near the 4th ventricle roof (paramedian, drawn dashed on the midline); `surf-obex` — at the 4th ventricle caudal apex.

Optional (13 listed; 3 of them — `tract-mlf`, `nuc-dorsal-raphe`, `nuc-pretectal` — are drawn and therefore counted in the 26 above; the other 10 are dotted paramedian pairs/outlines that this SVG omits — label only with dotted-leader style): `nuc-thalamic-anterior`, `nuc-md`, `nuc-pulvinar`, `nuc-vpl` (dotted outlines inside the thalamus block), `nuc-paraventricular`, `nuc-arcuate-hypothalamic` (dotted, hypothalamus block), `tract-mlf` (dotted line along the dorsal brainstem), `nuc-dorsal-raphe` (midline dotted), `nuc-locus-coeruleus` (dotted, rostral pons floor), `nuc-pretectal` (dotted, rostral to the SC), `tract-scp` (dotted course from the dentate region to the decussation), `nuc-pontine-reticular` (dotted tegmentum), `nuc-hypoglossal` (dotted at the medullary floor).

### 7.11 `plate-coronal-midbrain` — coronal, through cerebral peduncles / red nucleus / substantia nigra

Coronal (frontal) section: patient left on image right, superior top. From superior to inferior: lentiform nucleus + internal capsule, subthalamus, midbrain (crus, SNc/SNr, RN, ML/MLF/CTT), then the rostral pons (basis + tegmentum) at the inferior margin.

Required (25 — recomputed from the plate SVG on 2026-09-10):

- **Superior lateral**: `ctx-internal-capsule` — vertical white columns; `ctx-lenticular-nucleus` — lateral to the capsule; `ctx-thalamus-envelope` — the caudal thalamic mass drawn at the superior margin of the section.
- **Subthalamic zone**: `nuc-subthalamic` — lens-shaped, lateral, just dorsal to the SN; `nuc-zona-incerta` — thin band dorsal to the STN; `ctx-fields-of-forel` — white fiber zones medial to the zona incerta.
- **Midbrain tegmentum**: `nuc-red-nucleus` — paired ovoids, medial superior; `tract-mlf` — midline vertical pair, dorsal to the RN; `tract-central-tegmental` — lateral to the MLF bundle; `tract-medial-lemniscus` — vertical paramedian band ventral to the RN; `tract-spinothalamic` — lateral to the ML.
- **Ventral midbrain**: `nuc-snc` — the dark dorsal nigral band; `nuc-snr` — ventral nigral band; `tract-crus-cerebri` — the large paired descending bundles (with internal somatotopy: `tract-corticobulbar` medial, `tract-corticospinal-lateral` central, `tract-corticopontine` lateral — tag subdivisions only if drawn); `surf-interpeduncular-fossa` — the midline cleft between the crura; `surf-cn3-exit` — rootlets at the medial crus edges.
- **Inferior margin (rostral pons)**: `ctx-pontine-nuclei` — the basis block; `ctx-pontine-fibers` — the longitudinal fiber streaks; `nuc-pontine-reticular` — the tegmentum core.

Optional (7 listed; 3 are drawn and therefore counted in the 25 above — `vent-third-ventricle`, `ctx-caudate-nucleus`, `tract-scp`; the remaining 4 — `nuc-mammillary-body`, `nuc-pag`, `vent-cerebral-aqueduct`, `nuc-dorsal-raphe` — do not reach this section plane): `nuc-mammillary-body` + `vent-third-ventricle` — superior medial margin (only if the section extends into the caudal diencephalon); `ctx-caudate-nucleus` — superior lateral tip; `tract-scp` — dashed bundle at the superior margin adjacent to the RN (dentatothalamic); `nuc-pag` + `vent-cerebral-aqueduct` — only if the section plane reaches the dorsal (posterior) midbrain; `nuc-dorsal-raphe` — midline, dorsal to the CN III region.

### 7.12 `plate-coronal-thalamus` — coronal, through thalamus / 3rd ventricle / LGN / MGN / pineal (+ cerebral peduncle slice below)

Coronal (frontal) section at the caudal diencephalon: patient left on image right, superior top. Superior: pineal/habenula; middle: the two thalami with nuclear groups around the 3rd ventricle; inferior: the cerebral peduncle slice (transition into the midbrain).

Required (31 — recomputed from the plate SVG on 2026-09-10):

- **Dorsal midline**: `nuc-pineal-gland` — midline, superior; `nuc-habenula` — paramedian pair, rostral-ventral to the pineal; `vent-third-ventricle` — the midline slit between the thalami; `nuc-midline-thalamic` — nuclei along the ventricle wall; `nuc-intralaminar` (CM-PF) — lateral to the midline; `ctx-internal-medullary-lamina` — the Y-shaped white lamina.
- **Thalamic masses (per side, medial → lateral / dorsal → ventral)**: `nuc-md` — medial; `nuc-thalamic-anterior` — dorsal pole; `nuc-lateral-dorsal` — dorsolateral; `nuc-lateral-posterior` — lateral; `nuc-pulvinar` — posterior mass (dominant at this caudal level); `nuc-va` — anteroventral; `nuc-vl` — ventrolateral; `nuc-vpl` — ventrolateral (leg lateral); `nuc-vpm` — ventromedial, adjacent to the midline; `nuc-thalamic-reticular` — thin lateral shell; `ctx-thalamus-envelope` — use to tag the fused mass outline IF drawn as a block (prefer individual nucleus tags when drawn separately).
- **Caudolateral**: `nuc-lgn` — lateral, below the pulvinar; `nuc-mgn` — medial to the LGN, dorsomedial to the cerebral peduncle.
- **Lateral**: `ctx-internal-capsule` — the vertical white bands; `ctx-lenticular-nucleus` — lateral to the capsule (upper part).
- **Inferior**: `nuc-subthalamic` — lens-shaped, above the peduncle slice; `nuc-zona-incerta` — dorsal to the STN; `ctx-fields-of-forel` — H1/H2 zones; `nuc-mammillary-body` — paired at the inferior midline; `tract-crus-cerebri` — the cerebral peduncle slice at the inferior margin (with somatotopy subdivisions `tract-corticobulbar`, `tract-corticospinal-lateral`, `tract-corticopontine` if drawn).

Optional (8 listed; 2 are drawn and therefore counted in the 31 above — `ctx-caudate-nucleus` and `tract-posterior-commissure`; the other 6 are omitted): `ctx-caudate-nucleus` (superolateral tip), `tract-posterior-commissure` (dorsal midline, dotted), `nuc-ventromedial`, `nuc-dorsomedial`, `nuc-arcuate-hypothalamic`, `nuc-supraoptic` (inferomedial hypothalamic margin, only if the section extends rostrally), `surf-optic-chiasm` (inferior margin, rostral-most sections), `nuc-paraventricular` (dotted at the 3rd ventricle wall).

---

## 8. Verification checklist for this document

Refreshed and re-verified **2026-09-10** (see the notes at the head of the file). Every item below was produced by a script run against `src/data` on that date, not by editing prose:

- [x] Every slug listed in §3/§4/§7 resolves exactly in `src/data/taxonomy.json`. The §3 tables were reconciled against the 137-entry pinned revision (`716896f`); the **current** registry is 179 entries (42 of them telencephalon stubs — §3.6), and all 12 plate SVGs, all 12 §7 counts, all 26 syndromes and all 19 `tracts.json` records were re-checked against the current data and are unchanged. The only non-registry ids in this document are `lvl-*` level anchors, which resolve in `levels.json` (17 of them).
- [x] All 12 plate ids match §3.9: 9 transverse + `plate-sagittal-midline` + `plate-coronal-midbrain` + `plate-coronal-thalamus`.
- [x] Required count per plate is 18–40 and equals the number of distinct `data-structure`/`data-for` slugs in that plate's SVG, verified plate-by-plate by id: `plate-pyramid-decuss` 19, `plate-sensory-decuss` 22, `plate-olivary` 23, `plate-pons-caudal` 30, `plate-pons-middle` 21, `plate-pons-rostral` 19, `plate-midbrain-ic` 25, `plate-midbrain-sc` 24, `plate-thalamus-mid` 26, `plate-sagittal-midline` 26, `plate-coronal-midbrain` 25, `plate-coronal-thalamus` 31 (122 distinct slugs in total); drawn optionals are named and the ones deliberately omitted are stated.
- [x] No slug or id was renamed. `ctx-thalamus-envelope` and `ctx-hypothalamus-envelope` remain the only registry additions flagged in §2 at the pinned revision; AMENDMENT B added `ctx-cerebral-cortex`, which is now the twelfth row of the §2 context-layer identity table, and the four unowned rendered `ctx-*` silhouettes are recorded there too.
- [x] §3 region headings and row counts agree with the authored groupings (42/24/34/32/5 = 137 rows) and §3.6 states the current registry split (diencephalon 38 / telencephalon 46); §5 lists **26** syndromes, all 26 rows reproduced verbatim from the records with every `structures[]` id resolving; §4.1 records both tract gaps (8 authored records with no plate label; 17 registry tracts without a record at the pinned revision, 32 of 51 at the current one).
- [x] §5.1 states the post-state of clinical coverage (0 records without clinical content; 51 single-item records → 47), the data-derived selection rule for the fifteen second items, and its 15-row ranked table — which a re-run of the rule on the pre-change baseline reproduces exactly, including the honest note that **16** records clear score 5 so the cut is rank-15, and that `vent-fourth-ventricle` is the record left out.
- [ ] Still open, owned by other tasks: the four unregistered `ctx-*` silhouettes (§2), the 42 telencephalon registry stubs and the telencephalon content section (§3.6), and the tract/plate gaps (§4.1) — all recorded here so the next content run has a starting list.

---

## 9. Telencephalon content (v7 run `tel-content`) — 46 registry ids, all authored

**Appended by the v7 `tel-content` task** (`docs/TELENCEPHALON_PLAN.md` §7 task 6). This is a new section added at the end of the document: §1–§8 above are the brainstem/diencephalon/cerebellum reconciliation and none of them was restructured, renumbered or restated. §3.6's "content owned by the v7 run" placeholder is discharged by the tables below, which are generated from the records themselves — including its sentence "**None of the 42 new telencephalon entries has an authored record yet**", which this task supersedes: all 42 now carry authored records (see the count table below).

What changed, recomputed from `src/data` after the edits (the registry/structure totals are the state **when this task's edits landed**; concurrent v6/v7 tasks keep registering ids, so re-measure rather than trusting them):

| what | before this task | after this task |
| --- | --- | --- |
| registry entries | 179 (telencephalon 46) | **179** (unchanged — no id was added or renamed by this task; a concurrent run has since taken the registry past 179) |
| registry entries **awaiting an authored record** | 42 (all telencephalon) | **0** |
| `structures/*.json` | 6 files, 118 records | **11 files, 156 records** (this task's 5 new files + 38 records; concurrent runs add more elsewhere) |
| `tracts.json` | 19 records | **23 records** |
| `npm run validate` | 0 errors, 0 warnings | **0 errors, 0 warnings** |

**42 new authored records:** 38 `StructureRecord`s in five new files plus 4 `TractRecord`s appended to `tracts.json`. The other 4 of the 46 telencephalon ids (`ctx-corpus-callosum`, `ctx-internal-capsule`, `ctx-lenticular-nucleus`, `ctx-caudate-nucleus`) already carried authored records in `src/data/structures/diencephalon-epithalamus-subthalamus.json` and were **not** re-authored (that would have been a duplicate id/name error). Every `id` below was read from `taxonomy.json`, never invented; kind, laterality, subdivision, colour and display name match the registry exactly (the validator's registry cross-check reports no drift).

Levels are given as the `y` anchors the record carries, so `+48` = `lvl-tel-thalamostriate`, `+58` = `lvl-tel-basal-ganglia`, `+68` = `lvl-tel-centrum-semiovale`, `+78` = `lvl-tel-convexity` (AMENDMENT B). All four new anchors are used.

### 9.1 Cerebral cortex (10) — `src/data/structures/telencephalon-cortex.json`

| slug | name | kind | levels (y) | geometry |
| --- | --- | --- | --- | --- |
| `ctx-cerebral-cortex` | Cerebral cortex (context envelope) | context | +19 +28 +36 +48 +58 +68 +78 | derived ribbon (tel-geometry §4); no `origin3d` by design |
| `surf-frontal-lobe` | Frontal lobe | surface | +36 +48 +58 +68 +78 | derived lobe envelope |
| `surf-parietal-lobe` | Parietal lobe | surface | +36 +48 +58 +68 +78 | derived lobe envelope |
| `surf-temporal-lobe` | Temporal lobe | surface | +8 +14 +19 +28 +36 | derived lobe envelope |
| `surf-occipital-lobe` | Occipital lobe | surface | +8 +14 +19 +28 +36 +48 | baked (BP3D occipital lobe FJ1791/FJ1792) |
| `surf-insula` | Insula | surface | +28 +36 +48 +58 | baked (BP3D insula FJ1748/FJ1749) |
| `surf-limbic-lobe` | Limbic lobe | surface | +14 +19 +28 +36 +48 +58 +68 +78 | derived ring (cingulate + parahippocampal) |
| `surf-cingulate-gyrus` | Cingulate gyrus | surface | +28 +36 +48 +58 +68 +78 | baked (BP3D cingulate FJ1739/FJ1740) |
| `surf-parahippocampal-gyrus` | Parahippocampal gyrus | surface | +8 +14 +19 | derived from the medial temporal gyri |
| `surf-planum-temporale` | Planum temporale | surface | +28 +36 | ellipsoid placeholder (`origin3d` [33, 34, 2], `size3d` [3, 3.5, 8]) — no BP3D concept exists |

### 9.2 Basal ganglia (7 new; 9 in the registry here) — `src/data/structures/telencephalon-basal-ganglia.json`

| slug | name | kind | levels (y) | geometry |
| --- | --- | --- | --- | --- |
| `nuc-caudate-head` | Caudate nucleus, head | nucleus | +36 +48 +58 | baked caudate cast (FJ1754/FJ1802), head region |
| `nuc-caudate-body` | Caudate nucleus, body | nucleus | +36 +48 +58 | baked caudate cast, body region |
| `nuc-caudate-tail` | Caudate nucleus, tail | nucleus | +19 +28 | baked caudate cast, tail region |
| `nuc-putamen` | Putamen | nucleus | +28 +36 +48 | baked (FJ1776/FJ1823) |
| `nuc-globus-pallidus-externus` | Globus pallidus, external segment | nucleus | +28 +36 | baked pallidal mesh (FJ1757/FJ1805), lateral segment |
| `nuc-globus-pallidus-internus` | Globus pallidus, internal segment | nucleus | +28 +36 | baked pallidal mesh, medial segment |
| `nuc-ventral-striatum` | Ventral striatum | nucleus | +28 +36 | ellipsoid placeholder (`origin3d` [12, 32, 29], `size3d` [3.5, 4, 4]) — no BP3D accumbens mesh |

The claustrum is **not** in the registry, so no claustrum record was authored (inventing an id would break the registry-first contract, `docs/DATA_CONTRACT.md` §3).

### 9.3 Limbic system (6) — `src/data/structures/telencephalon-limbic.json`

| slug | name | kind | levels (y) | geometry |
| --- | --- | --- | --- | --- |
| `nuc-hippocampus` | Hippocampus | nucleus | +8 +14 +19 | baked (FJ1759/FJ1807) |
| `nuc-dentate-gyrus` | Dentate gyrus | nucleus | +8 +14 +19 | ellipsoid placeholder (`origin3d` [16, 14, −2], `size3d` [1.6, 8, 14]) — BP3D folds it into the hippocampus |
| `nuc-amygdala` | Amygdala | nucleus | +8 +14 | baked (FJ1753/FJ1829) |
| `tract-fornix` | Fornix | tract (structure record) | +14 +19 +28 +36 | baked (FJ1756/FJ1804) |
| `tract-fornix-commissure` | Commissure of the fornix | tract (structure record) | +28 +36 | baked (FJ1741) |
| `tract-fimbria` | Fimbria of the hippocampus | tract (structure record) | +14 +19 | ellipsoid placeholder (`origin3d` [22, 21, −2], `size3d` [2.2, 3.5, 9]) — carried inside the fornix/hippocampus meshes |

### 9.4 Lateral ventricles (7) — `src/data/structures/telencephalon-ventricles.json`

| slug | name | kind | levels (y) | geometry |
| --- | --- | --- | --- | --- |
| `vent-lateral-ventricle` | Lateral ventricle | ventricle | +14 +19 +28 +36 +48 +58 | baked ventricular cast (FJ1767/FJ1814) |
| `vent-lateral-ventricle-frontal-horn` | Frontal horn of the lateral ventricle | ventricle | +36 +48 | region of the baked cast |
| `vent-lateral-ventricle-temporal-horn` | Temporal horn of the lateral ventricle | ventricle | +8 +14 | region of the baked cast |
| `vent-lateral-ventricle-occipital-horn` | Occipital horn of the lateral ventricle | ventricle | +19 +28 | region of the baked cast (measured y span 17.4–31.9 au ⇒ the +19 and +28 anchors only) |
| `vent-lateral-ventricle-atrium` | Atrium of the lateral ventricle | ventricle | +19 +28 +36 | region of the baked cast |
| `vent-choroid-plexus-lateral` | Choroid plexus of the lateral ventricle | ventricle | +14 +19 +28 +36 +48 | baked (FJ1755/FJ1803) |
| `vent-interventricular-foramen` | Interventricular foramen | ventricle | +36 +48 | ellipsoid placeholder (`origin3d` [3, 42, 12], `size3d` [1.2, 1.5, 1.5]) — a CSF channel, not a meshable surface |

### 9.5 Telencephalic white matter (8 new structure records + 4 tracts) — `src/data/structures/telencephalon-white-matter.json`

| slug | name | kind | levels (y) | geometry |
| --- | --- | --- | --- | --- |
| `tract-corpus-callosum-rostrum` | Rostrum of the corpus callosum | tract (structure record) | +36 | baked callosal mesh (FJ1742), rostrum region |
| `tract-corpus-callosum-genu` | Genu of the corpus callosum | tract (structure record) | +36 +48 | baked callosal mesh, genu region |
| `tract-corpus-callosum-body` | Body of the corpus callosum | tract (structure record) | +48 +58 | baked callosal mesh, body region |
| `tract-corpus-callosum-splenium` | Splenium of the corpus callosum | tract (structure record) | +28 +48 | baked callosal mesh, splenium region |
| `tract-internal-capsule-anterior-limb` | Internal capsule, anterior limb | tract (structure record) | +28 +36 +48 | baked capsule mesh (FJ1750/FJ1751), anterior region |
| `tract-internal-capsule-genu` | Internal capsule, genu | tract (structure record) | +36 +48 | baked capsule mesh, genu region |
| `tract-internal-capsule-posterior-limb` | Internal capsule, posterior limb | tract (structure record) | +28 +36 +48 | baked capsule mesh, posterior region |
| `tract-corona-radiata` | Corona radiata | tract (structure record) | +58 +68 +78 | ellipsoid placeholder (`origin3d` [19, 64, 4], `size3d` [7, 8, 12]) — a fibre fan inside the WM core, no separate mesh |

### 9.6 Authored association tracts (4) — `src/data/tracts.json` (now 23 records)

These four have **no BP3D mesh**: the `waypoints` polyline is the geometry, routed through the measured canonical white matter (see the table's "course" column). Measured spans are inside AMENDMENT B (`x ±48`, `y −55…+85`, `z −75…+55`): every waypoint of all four was bounds-checked.

| slug | name | direction | levels (y) | waypoint span (x · y · z) |
| --- | --- | --- | --- | --- |
| `tract-optic-radiation` | Optic radiation | ascending | +14 +19 +28 | LGN → retrolenticular capsule → Meyer loop → occipital pole; x 13…28, y 14…30, z −66…+12 |
| `tract-cingulum` | Cingulum | mixed | +19 +28 +36 +48 +58 +68 | subcallosal area → above the callosum → isthmus → parahippocampal cortex; x 4…14, y 14…68.5, z −38…+42 |
| `tract-uncinate-fasciculus` | Uncinate fasciculus | mixed | +14 +19 +28 +36 | temporal pole → hook at the limen insulae → orbital frontal cortex; x 14…35, y 12…36, z +26…+52 |
| `tract-superior-longitudinal-fasciculus` | Superior longitudinal fasciculus | mixed | +19 +28 +36 +48 +58 | inferior frontal → arc over the insula → supramarginal/angular → posterior temporal; x 24…36, y 18…62, z −34…+44 |

**Waypoint correction (second pass, evidence-based).** The four polylines were re-checked point-by-point against the *registered* canonical meshes (`assets-src/bp3d/canonical/tel-*.obj`, plus the LGN, thalamus and fornix casts) with an exact point-to-triangle distance oracle, because a waypoint that lies outside the white-matter core is outside the rendered brain. Five waypoints of the first pass sat 7.2–13.8 mm clear of every registered surface (they floated in the subarachnoid space / outside the hemisphere): the optic-radiation start (`[11, 23, −4.5]`, `[18, 32, −2]`), the uncinate's temporal-stem points (`[27, 13, 36]`, `[29, 18, 26]`, `[14, 34, 42]`) and the SLF's tail, which ended in the *anterior* temporal lobe (`[26, 18, 8]`) instead of the posterior superior temporal gyrus. They were re-routed onto the measured anatomy: the optic radiation now starts inside the lateral geniculate body (`[18, 16, −6]`, 0.03 au from the LGN mesh) and its dorsal bundle rises to the calcarine cortex; the uncinate now runs temporal-pole white matter → anterior temporal stem → hook at the limen insulae → orbitofrontal white matter; the SLF now arcs frontal operculum → centrum semiovale → supramarginal → posterior superior/middle temporal gyrus. After the correction **every waypoint of all four tracts is ≤ 3.2 au (≤ 3.8 mm) from a registered surface** (worst case: SLF at the parietal white matter), i.e. inside the brain envelope (cortical ribbon = 2.5–3.3 au thick), and the level lists were trimmed/extended to the levels each polyline actually spans (the optic radiation no longer claims +36/+48).

### 9.7 Web references and deliberate omissions

- `src/data/webRefs.ts` gained **curated entries for all 46** telencephalon ids (previously every one of them fell through to the auto-generated Wikipedia title, which produced imprecise labels such as "Globus pallidus external segment" or "Lateral ventricle frontal horn"). All **31 distinct Wikipedia titles** used (47 `wiki()` calls across the 46 entries) were verified to resolve through the MediaWiki API before being committed — re-verified afterwards with one `action=query&titles=` call, which returns all 31 with page ids and **nothing missing**; five journal sources were added (Alexander/DeLong/Strick 1986, Catani & ffytche 2005, Catani & Thiebaut de Schotten 2008, Scoville & Milner 1957, Damkier 2013), each with a DOI resolved and title-checked against Crossref (one `api.crossref.org/works?filter=doi:…` call returned all five with the titles cited here).
- **No id was deliberately left unrecorded:** all 46 telencephalon registry ids now have an authored record (`0 awaiting authored records` in the validator summary). The only telencephalon-shaped content that is *not* authored is content the registry does not contain — the claustrum and the plan §3 "optional" functional-anatomy context record (operculum) — and it was not invented here, per the registry-first contract.
- **Geometry rule applied to `origin3d`/`size3d`** (per the task contract): they appear only where no baked mesh in the `tel-geometry` manifest covers the record. Six of the 38 new structure records carry an ellipsoid placeholder (`nuc-ventral-striatum`, `nuc-dentate-gyrus`, `tract-fimbria`, `tract-corona-radiata`, `vent-interventricular-foramen`, `surf-planum-temporale`); every other new record, including the ventricular horns/atrium, the caudate and callosal sub-regions, the pallidal segments and the capsular limbs, gets its geometry from the parent baked mesh and therefore carries neither field.
- **Not touched by this task:** `src/data/taxonomy.json`, `src/data/levels.json`, `src/data/sectionImages.ts`, any plate manifest/SVG, and every existing brainstem/diencephalon/cerebellum record. Nothing below y = +45 changed coordinates; this task added content and level references only.
- **Verification run after the edits:** `npm run validate` → `0 awaiting authored records · tracts 23 record(s)`, **0 errors / 0 warnings**; `npm run check` (`tsc --noEmit`) exit 0 — both re-run after the waypoint correction, with the same result. The ad-hoc cross-checks (scratch harnesses, not committed) confirm: 46/46 telencephalon ids have both an authored record and a curated web-ref key; no `origin3d`/`size3d` or waypoint value falls outside the AMENDMENT B bounds (`x ±48`, `y −55…+85`, `z −75…+55`); every `levels[]` entry resolves in `levels.json`; every authored record carries a non-empty `function`, a `bloodSupply`, ≥ 1 complete `clinical` item (130 items across the 46, 73 of them naming an arterial territory), Blumenfeld-style `refs`, and `origin3d`/`size3d` only where no baked mesh exists; and the tract geometry check described in §9.6 (point-to-triangle distances to the registered meshes, ≤ 3.2 au worst case).

---

## 10. QA re-reconciliation (`v6b-qa`) — the CURRENT counts

Appended by `v6b-qa` on the closure tree `b5ab6f3`, exactly as this document's
preamble instructs ("if a later run extends the registry or the level anchors,
re-run this reconciliation instead of trusting the numbers"). **The §1–§9 tables
above are NOT edited**: they are the dated record of revision `716896f` /
`d1cefef` and they say so. This section is the current truth, measured from
`src/data`, `src/data/plates/` and `src/assets/anatomy/anatomy-manifest.json` with
`npm run validate` (0 errors / 0 warnings, exit 0) plus a scratch Node counter
(`.dsh-scratch/qa-bite/inventory-count.mjs`, uncommitted).

| Quantity | §2/§3/§4/§7 say (pinned revision) | Measured on `b5ab6f3` |
| --- | --- | --- |
| registry entries | 179 (137 at `716896f`) | **183** |
| by region | diencephalon 38 · tel 46 · midbrain 24 · pons 34 · medulla 32 · cerebellum 5 | diencephalon **39** · tel **46** · midbrain **25** · pons **35** · medulla **33** · cerebellum **5** |
| by kind | nucleus 81 · tract 51 · surface 25 · **context 12** · ventricle 10 | nucleus **81** · tract **51** · surface **25** · **context 16** · ventricle **10** |
| registry entries with an authored record | 137 (42 registry-only stubs) | **183 — 0 stubs** (`validate`: "0 awaiting authored records") |
| `structures/*.json` | 11 files, 156 records | 11 files, **160 records** |
| `tracts.json` | 23 records | **23** |
| registry tracts with no authored record | "32 of 51" | **0 of 51** |
| syndrome records | 26 in 3 files | **26** in 3 files |
| plate SVGs / plate records | 12 / 12 | **15 / 15** |
| distinct slugs across ALL plates | 122 (12 plates) | **156** (15 plates) — the 122 figure is still exactly right for the 12 non-telencephalon plates, whose per-plate counts are unchanged |
| authored tracts with no plate label | 8 of 19 | **9 of 23** (the same eight + `tract-uncinate-fasciculus`, v7) |
| `levels.json` anchors | 17 | **17** |
| records with an empty `clinical[]` | 0 (§5.1 "Post-state") | **4** — `ctx-pineal`, `ctx-medulla-surface`, `ctx-midbrain-surface`, `ctx-pons-surface`, all `kind:"context"` |
| records with exactly 1 clinical item | 47 | **47** |
| anatomy manifest | 84 parts (10 context) | **106 parts (15 context)**, `version: 2` |

Two integrity checks with no equivalent row above, run for the first time here:
every `plates.json` `regions[].slug` resolves to an authored record (**0
unresolved**), and every `plates.json` `levelId` resolves in `levels.json` (**0
unresolved**).

§5.1's authorship *history* cannot be re-measured — no pre-change baseline is
committed — so only its post-state is confirmable; that post-state (47
single-item records; `nuc-cochlear-dorsal` as the single citation exception among
183 records) **does** reproduce. The four empty `clinical[]` arrays are the one
§6 acceptance line the v6 closure did not close: they are registered
`kind:"context"` surface silhouettes, and authoring clinical items for a surface
shell is a content decision rather than a QA fix (see
`docs/QUALITY_PLAN.md §8.6` item 2).

---

## 11. v8 deep content (run `content-authoring`) — functional cortices, striatal depth, hippocampal subfields, optic pathway, ventricular segments, cerebral vasculature

**Appended by the v8 `content-authoring` task** (`docs/NEUROATLAS_V8_PLAN.md` §3, task #4 in §6). §1–§10 above are the dated v6/v7 reconciliations and **none of them was edited, renumbered or restated**; this section is the new state, measured from `src/data` after the edits. Where a number here differs from a number above, the number above is the older measurement, not an error.

### 11.1 Measured delta (recounted from `src/data`, not copied)

| quantity | before this task | after this task |
| --- | --- | --- |
| registry entries (`taxonomy.json`) | 183 (telencephalon 46) | **206** (telencephalon **69**) |
| registry entries awaiting an authored record | 0 of 183 | **0 of 206** |
| `structures/*.json` | 11 files, 160 records | **15 files, 183 records** |
| `tracts.json` | 23 records | **23** (one record enriched, none added) |
| `levels.json` anchors | 17 | **17** (unchanged — no new level was needed) |
| `npm run validate` | 0 errors, 0 warnings | **0 errors, 1 warning** while staged (the single warning was the intentionally staged vasculature file, §11.8) — **since §11.13: 0 errors, 0 warnings** |
| `npm run check` | exit 0 | **exit 0** |
| staged-but-not-loaded vessel records | 0 | **14** in `src/data/structures-pending/vasculature.json` — **0 since §11.13** (landed as `src/data/structures/vasculature.json`) |

**43 ids registered, 43 records authored or enriched**: 23 new registry rows for ids in regions the validator already accepts (`telencephalon`), and 14 vessel ids whose registry rows land with the `vasculature` region enum (§11.8). The 23 rows were appended by an append-only, idempotent script (`.dsh-scratch/v8-content/register-v8-ids.mjs`, scratch — not committed); it edits only the closing bracket of `taxonomy.json`, skips any id already present, and refuses to write if a display name would collide.

### 11.2 New record fields introduced by v8 (contract extension — `docs/DATA_CONTRACT.md` §2/§4 is the frozen v1 shape, and nothing in it was changed)

| field | applies to | meaning | validator impact |
| --- | --- | --- | --- |
| `anchors: { gyrus: string, mesh: string }` | the 12 cortical functional areas | the host gyrus the area occupies, plus the baked mesh that currently stands in for it | **none** — unknown fields are ignored by `validate-data.mjs`; a JSON-only field is deliberate (see the note below) |
| `meshes: false` | records the plan requires as record-only (hippocampal subfields, optic pathway, vessels, cortical areas) | explicit "no mesh of its own" | ignored |
| `territory: string[]` | the 14 vessel records | the structure ids the artery supplies (the highlight set when an artery is selected) | validated by the author's own check, not the schema validator |
| `supply: string[]` | the 14 vessel records | the **existing syndrome-card ids** whose arterial territory is this artery (e.g. `syn-lateral-pontine` for the AICA) | same |
| `contextNote` (existing field, now also used for placement) | every mesh-less v8 record | "Authored structure — schematic placement" plus the plane/coordinate the record is anchored at | already validated (optional non-empty string) |

Deliberate decision, recorded so the next task does not reinvent it: these fields are **JSON-only for now**, because `src/types.ts` is another task's write scope in this run and the v8 geometry is not yet landed. `npm run check` is unaffected (it does not type the JSON payloads — `load.ts` casts them), and the fields are additive, so typing them later is a non-breaking change. `anchors.mesh` is honest about the current bake: BodyParts3D has **no per-gyrus mesh** (no precentral/postcentral/calcarine/Heschl part exists in `anatomy-manifest.json`), and the cortical ribbon answers clicks as `ctx-cerebral-cortex` (`SceneLayers.tsx`, `TEL_HEMISPHERE_RECORD_IDS`). Every cortical-area `origin3d` was therefore probed from the baked `ctx-hemisphere-l` ribbon by the authoring run, not guessed.

### 11.3 Cortical functional areas — 12 (`src/data/structures/telencephalon-cortical-areas.json`, all `kind:"context"`, subdivision `Functional cortical areas`)

| slug | area | host gyrus (`anchors.gyrus`) | `origin3d` | levels (y) |
| --- | --- | --- | --- | --- |
| `ctx-v1` | Primary visual cortex (V1) | calcarine cortex (cuneus above, lingual gyrus below) | [9.5, 17, −60] | +19 +28 +36 +78 |
| `ctx-v2` | Secondary visual cortex (V2) | prestriate cortex around the striate area | [16.4, 33, −50] | +19 +28 +78 |
| `ctx-a1` | Primary auditory cortex (A1) | transverse temporal gyri of Heschl | [32, 29.5, −4] | +28 +36 +48 |
| `ctx-a2` | Secondary auditory cortex (A2) | planum temporale | [35, 33.5, 2] | +28 +36 +48 |
| `ctx-wernicke` | Wernicke's area | posterior superior temporal gyrus + temporoparietal junction | [43.6, 30, −28] | +28 +36 +48 |
| `ctx-broca` | Broca's area | posterior inferior frontal gyrus (pars opercularis/triangularis) | [36, 33.5, 42.5] | +36 +48 +58 |
| `ctx-m1` | Primary motor cortex (M1) | precentral gyrus | [43.2, 66.5, 19] | +58 +68 +78 |
| `ctx-s1` | Primary somatosensory cortex (S1) | postcentral gyrus | [42.4, 68.2, −1.7] | +58 +68 +78 |
| `ctx-premotor` | Premotor cortex | lateral precentral cortex anterior to the precentral gyrus | [38.6, 70.8, 34.2] | +58 +68 +78 |
| `ctx-sma` | Supplementary motor area (SMA) | medial superior frontal gyrus (mesial area 6) | [6, 82.8, 22.6] | +68 +78 |
| `ctx-entorhinal` | Entorhinal cortex | anterior parahippocampal gyrus (uncus + anterior cortex) | [21.7, 9.5, 20.5] | +8 +14 +19 |
| `ctx-frontal-eye-fields` | Frontal eye fields | posterior middle frontal gyrus (area 8) | [36, 71.3, 35.5] | +68 +78 |

Every record carries `function`, `connections.afferent/efferent`, `bloodSupply`, `clinical[]` and `refs[]` in the established v6/v7 style. The clinical content required by the brief is present verbatim where named: V1 lesion → **cortical blindness with macular sparing** and Anton syndrome; Wernicke → **fluent aphasia**; Broca → **non-fluent aphasia**; M1/S1 → motor/sensory deficits; A1 → cortical deafness (bilateral) and pure word deafness; entorhinal → **perforant path origin**, Alzheimer (Braak I–II) and HSV encephalitis. Blood supply follows the territory: V1/V2 = **PCA (calcarine branch, macular sparing)**, A1/A2/Wernicke/Broca/M1/S1/premotor/FEF = **MCA** (superior or inferior division as appropriate), SMA = **ACA (callosomarginal/pericallosal)**, entorhinal = **PCA (hippocampal branches)** with anterior choroidal at the uncal end.

### 11.4 Basal ganglia depth — 3 new records (`telencephalon-basal-ganglia.json`)

| slug | name | kind | `origin3d` / `size3d` | pathway role |
| --- | --- | --- | --- | --- |
| `nuc-accumbens` | Nucleus accumbens | nucleus | [12.5, 27, 30] / [3, 3, 4] | shell = unconditioned reward, core = cue-conditioned approach; limbic striatum |
| `nuc-ventral-pallidum` | Ventral pallidum | nucleus | [20.5, 23, 14] / [2.5, 2, 4] | limbic output nucleus: accumbens → MD thalamus / lateral hypothalamus; hedonic "liking" |
| `nuc-claustrum` | Claustrum | nucleus | [31, 36, 12] / [1, 4, 8] | cortico-cortical hub between putamen and insula (external / extreme capsules) |

**Deviation, stated plainly:** the plan and the task brief list **GPi, GPe and the nucleus accumbens** as new depth records. GPi and GPe already exist, authored and registered, as `nuc-globus-pallidus-internus` and `nuc-globus-pallidus-externus` (subdivision `Basal ganglia`), and *nothing* in the current data uses the short ids `nuc-gpi` / `nuc-gpe` — so authoring "GPi/GPe records" again would have produced four duplicate display names and two duplicate ids (a hard validator error). They were **not** duplicated: their `function`/`connections`/`clinical` already state the direct (GPi) and indirect (GPe) pathway roles and the hemiballismus association the brief asks for. Likewise the nucleus accumbens already had a broader concept record, `nuc-ventral-striatum`; the new `nuc-accumbens` is the plan's subregion record and says so in its `contextNote`, which points at the concept record so the two are not conflated. **Net effect for the task's five named structures: GPi ✓ (existing, verified), GPe ✓ (existing, verified), accumbens ✓ (new), ventral pallidum ✓ (new), claustrum ✓ (new).**

### 11.5 Hippocampal formation — 4 new records + 1 enriched (`telencephalon-hippocampal-subfields.json`)

| slug | field | `origin3d` | placement | key clinical |
| --- | --- | --- | --- | --- |
| `nuc-subiculum` | Subiculum | [20.7, 11.8, 0.6] | medial-concave surface of the hippocampal body | mesial temporal sclerosis (seizure-onset zone) |
| `nuc-ca1` | CA1 (Sommer sector) | [24.8, 13.8, −0.9] | dorsal-lateral body | **most vulnerable to hypoxia/ischaemia**; sclerosis |
| `nuc-ca2-ca3` | CA2 and CA3 fields | [28.1, 13, −4.1] | lateral convexity | mossy-fibre sprouting; CA2 = resistant sector |
| `nuc-ca4` | CA4 (hilus of the dentate gyrus) | [25.1, 12.7, −1.2] | core of the body | hilar cell loss → dentate gate failure |
| `nuc-dentate-gyrus` | Dentate gyrus (**existing** v7 record, enriched) | [16, 14, −2] | — | gained `meshes:false` + the placement note |

All four new records carry `meshes: false` **and** a `contextNote` beginning "Authored structure — schematic placement", which is the plan's §2.4/§5 honesty requirement; the pickable volume stays `nuc-hippocampus` in every case. The trisynaptic circuit is stated in the records: entorhinal (layer II) → **perforant path** → dentate granule cells → **mossy fibres** → CA3 → **Schaffer collaterals** → CA1 → subiculum → entorhinal/fornix, with the temporoammonic path noted as the trisynaptic-bypassing input to CA1. `nuc-dentate-gyrus` is **not** duplicated (it was already registered as `nuc-dentate-gyrus` and authored in v7; the brief's five names are covered by four new records plus this enrichment).

### 11.6 Optic pathway — 3 new records + 1 enriched

| slug | name | kind | where | anchor / course |
| --- | --- | --- | --- | --- |
| `tract-optic-nerve` | Optic nerve | tract (new) | `telencephalon-optic-pathway.json` | 5 waypoints, orbital/intracranial course to the chiasm (x≈11→2, y 19→23.5, z 33→23.5) |
| `ctx-optic-chiasm` | Optic chiasm (chiasmatic crossing) | context (new) | `telencephalon-optic-pathway.json` | midline [0, 23.5, 23.5]; deliberately distinct from the v6 **landmark** record `surf-optic-chiasm` (diencephalon) |
| `tract-optic-tract` | Optic tract | tract (new) | `telencephalon-optic-pathway.json` | 6 waypoints from the chiasm around the peduncle to `nuc-lgn` |
| `tract-optic-radiation` | Optic radiation (**existing** v7 record, enriched) | tract | `tracts.json` | `levels[]` extended to `lvl-thalamus-rostral`, `lvl-tel-thalamostriate`, `lvl-tel-convexity` so the radiation is reachable at every level it crosses |

Connections run **retina → optic nerve → chiasm → tract → LGN → optic radiation → V1**, and the clinical content covers **bitemporal hemianopia** (chiasm), **incongruous homonymous hemianopia** (tract, with the pupillary sign), and the **quadrantanopias** (Meyer loop = superior, dorsal bundle = inferior; complete radiation = congruent hemianopia). Note that the chiasm now has two ids by design: `surf-optic-chiasm` is the surface landmark used by the v6 sagittal plate, `ctx-optic-chiasm` is the crossing/fibre record — the registry keeps both, and no plate slug changed.

### 11.7 Ventricular segments — 1 new record + 4 with new plane anchors

| slug | record | `origin3d` | splitter plane documented in `contextNote` |
| --- | --- | --- | --- |
| `vent-lateral-ventricle-frontal-horn` | existing (enriched) | [7.2, 42.6, 31] | anterior to z = +25 |
| `vent-lateral-ventricle-body` | **new** (`telencephalon-ventricle-segments.json`) | [5.5, 50.2, 10.7] | z = +25 … z = −6 |
| `vent-lateral-ventricle-atrium` | existing (enriched) | [17.2, 32.5, −14.8] | z = −6 … z = −24, above y = +22 |
| `vent-lateral-ventricle-occipital-horn` | existing (enriched) | [18.7, 25.3, −34.2] | posterior to z = −24 |
| `vent-lateral-ventricle-temporal-horn` | existing (enriched) | [24.8, 15.4, −9.1] | below y = +22 |

All five anchors are the **measured centroids of the segments they name**, probed from the baked `tel-lateral-ventricle-l` cast (bbox x −0.03…32.3, y 5.6…59.3, z −53.2…37.5) by the authoring run; the splitter planes in the `contextNote`s are the geometry contract the bake must hit. Four of the five segments were already authored in v7 with full clinical content and were **enriched, not rewritten**; only the **body** segment was missing.

### 11.8 Cerebral vasculature — 14 records, **staged** (`src/data/structures-pending/vasculature.json`)

**Ids are aligned with `docs/VASC_INVENTORY.md` (task `vasc-acquire`), not invented here.** That document was produced in parallel with this task and its §3/§3.1 tables name the exact atlas record each group of extracted artery meshes belongs to (`vasc-…-artery` style). This task's first draft used shorter ids (`vasc-basilar`, `vasc-posterior-cerebral`, …); they were renamed to match, so that the registry row, the record, the render wiring and the bake all use one identifier per artery (`.dsh-scratch/v8-content/align-vasc-ids.mjs`, scratch). Two deliberate notes on that alignment:

- **The internal carotid artery keeps a record** (`vasc-internal-carotid-artery`) even though the inventory maps `FJ1682`/`FJ1682M` to "no atlas record": the inventory itself flags this as a content decision ("If the content task wants a `vasc-internal-carotid-artery` record, the verified mesh is already on disk"). The task brief asks for every Willis/major artery, the carotid is the feeding trunk of the whole anterior circulation and the commonest source of embolic stroke, so the record exists and its `contextNote` states exactly that.
- **The posterior choroidal record is named after the mesh that exists**: the archive carries one element pair for the posterior medial choroidal artery (`FJ1727`/`FJ1727M`, FMA 50630), not a separate lateral element, so the record id is `vasc-posterior-medial-choroidal-artery` and the record's `synonyms`/`function` still teach both medial and lateral branches. `vasc-lenticulostriate-arteries` is the same situation from the other side: BP3D has no lenticulostriate concept, the inventory files the anterolateral central branches as MCA support (`FJ1662`/`FJ1662M`, `FJ1663`/`FJ1663M`), and the record documents that in its `contextNote` rather than pretending to own a mesh.

| slug | artery | laterality | territory (ids) | `supply` (syndrome cards) |
| --- | --- | --- | --- | --- |
| `vasc-internal-carotid-artery` | Internal carotid artery | paired | 14 | weber, hypothalamic, tuberothalamic, hemiballismus |
| `vasc-vertebral-artery` | Vertebral artery | paired | 13 | lateral-medullary, medial-medullary, hemimedullary, central-horner |
| `vasc-basilar-artery` | Basilar artery | midline | 16 | locked-in, one-and-a-half, millard-gubler, foville, ino, peduncular-hallucinosis |
| `vasc-anterior-cerebral-artery` | Anterior cerebral artery | paired | 13 | hypothalamic |
| `vasc-anterior-communicating-artery` | Anterior communicating artery | midline | 7 | hypothalamic, tuberothalamic |
| `vasc-middle-cerebral-artery` | Middle cerebral artery | paired | 17 | parkinson, lateral-medullary |
| `vasc-posterior-communicating-artery` | Posterior communicating artery | paired | 8 | hemiballismus, tuberothalamic, hypothalamic, weber |
| `vasc-posterior-cerebral-artery` | Posterior cerebral artery | paired | 17 | dejérine-roussy, percheron, tuberothalamic, weber, benedikt, claude, nothnagel, parinaud, peduncular-hallucinosis |
| `vasc-superior-cerebellar-artery` | Superior cerebellar artery | paired | 12 | cerebellar, nothnagel |
| `vasc-anterior-inferior-cerebellar-artery` | Anterior inferior cerebellar artery | paired | 15 | lateral-pontine, millard-gubler, foville |
| `vasc-posterior-inferior-cerebellar-artery` | Posterior inferior cerebellar artery | paired | 13 | lateral-medullary, central-horner, hemimedullary |
| `vasc-lenticulostriate-arteries` | Lenticulostriate arteries | paired | 13 | hemiballismus, weber |
| `vasc-anterior-choroidal-artery` | Anterior choroidal artery | paired | 12 | hemiballismus |
| `vasc-posterior-medial-choroidal-artery` | Posterior medial choroidal artery | paired | 9 | dejérine-roussy |

Every record carries `region:"vasculature"`, `kind:"vessel"`, `subdivision` (Anterior circulation / Posterior circulation / Circle of Willis / Deep perforators), `laterality`, a crimson palette colour (`#b91c1c` trunks and midline links, `#dc2626` distal cortical/cerebellar branches, `#991b1b` deep perforators and the vertebral artery), `function`, `connections.afferent/efferent`, `bloodSupply`, `clinical[]` (what an infarct there causes), `territory[]`, `supply[]`, `levels[]`, `origin3d`/`size3d` and `refs[]`.

**Why staged, and exactly how they land.** **STATUS: LANDED (§11.13).** The staging this section describes is over — the three steps below were executed by the orchestrator after the run stopped, and `npm run validate` is now **0 errors, 0 warnings**. The text is kept verbatim because it is the record of *why* the records were staged and what landing them required. `region:"vasculature"` was not yet in the validator's `REGIONS`, in `types.ts` `Region`, or in `load.ts` `ALL_REGIONS`/`REGION_LABELS` ("Cerebral vasculature") — that enum work was the `vasc-region-platform` task's scope and this task was instructed not to touch `src/types.ts` or `scripts/validate-data.mjs`. A record file under `src/data/structures/` with an unknown region would therefore have been a **hard validation error**, so the records lived in `src/data/structures-pending/vasculature.json`, outside every validator group. Landing them was mechanically three steps, and nothing in the file needed editing:

1. `vasc-region-platform` adds `'vasculature'` to the three enums (`types.ts`, `load.ts` ×2, `validate-data.mjs` `REGIONS`) with the label **"Cerebral vasculature"**.
2. Register the 14 ids: `node .dsh-scratch/v8-content/register-v8-ids.mjs --with-vessels` (append-only, idempotent, skips ids another task already added — the registry rows carry exactly the names, colours, subdivisions and lateralities in the table above, so the validator's registry cross-check cannot report drift).
3. `git mv src/data/structures-pending/vasculature.json src/data/structures/telencephalon-vasculature.json` — the records then load through the existing `import.meta.glob('./structures/*.json')`.

`npm run validate` reported **1 warning** for the staged file while it was staged: `structures-pending/vasculature.json :: (classification) — JSON file not in a known group … parsed only`. It was genuinely non-blocking (the group is "parsed only", the file's JSON is valid, and the validator exited 0), and it disappeared the moment step 3 landed (§11.13). This was the **only** warning in the repository, and it was chosen over the alternatives deliberately: an undeclared `.json` inside `structures/` would warn the same way while also polluting the loaded group, and a file outside `src/data/` would not be where the brief requires it.

`docs/VASC_INVENTORY.md` was **not present** when this task began (the tree was scanned before it landed); the parallel `vasc-acquire` task published it during this run, and it is now the authoritative source for the artery list, the FMA/element ids and the record-id names — §3/§3.1 of that document is what the ids above were aligned to. Every artery here therefore has a verified BP3D mesh pair behind it: internal carotid `FJ1682`/`FJ1682M`, vertebral `FJ1725`/`FJ1725M`, basilar `FJ1672` (alt. `FJ1844`), anterior cerebral `FJ1654`/`FJ1654M`, anterior communicating `FJ1655`, middle cerebral (sphenoid `FJ1692`/`FJ1692M`, insular `FJ1660`/`FJ1660M`, `FJ1694`/`FJ1694M`, plus 34 terminal branch elements), posterior communicating `FJ1713`/`FJ1713M`, posterior cerebral (`P1` `FJ1723`/`FJ1723M`, `P2–P3` `FJ1714`/`FJ1714M`), superior cerebellar `FJ1726`/`FJ1726M` (+ lateral `FJ1683`/`FJ1683M`, medial `FJ1688`/`FJ1688M`), anterior inferior cerebellar `FJ1656`/`FJ1656M`, posterior inferior cerebellar (26 elements), anterior choroidal `FJ1658`/`FJ1658M`, posterior medial choroidal `FJ1727`/`FJ1727M`. The two exceptions are stated in each record's own `contextNote`: `vasc-lenticulostriate-arteries` (no BP3D concept; the anterolateral central branches `FJ1662`/`FJ1662M`, `FJ1663`/`FJ1663M` are filed by the inventory as MCA support) and `vasc-internal-carotid-artery` (the inventory maps those meshes to "no record" and explicitly leaves the record decision to the content task — taken here, with the reason recorded). No source material was invented: every syndrome name, territory id and FMA reference above resolves against the committed data or against `docs/VASC_INVENTORY.md`.

### 11.9 Web references — every new id curated (`src/data/webRefs.ts`)

43 curated entries were added: 12 cortical areas, 4 hippocampal subfields, 3 basal-ganglia records, 3 optic-pathway records, 1 ventricular segment, and 14 vessels — plus the pre-existing per-segment entries for the four lateral-ventricle segments that v7 had already curated (no duplicate keys; `npm run check` is exit 0, which is what catches a duplicated object key in TypeScript). **The vessel entries are load-bearing**: `getWebRefs()` deliberately emits *no* automatic Wikipedia fallback for `kind === 'vessel'`, so an uncurated artery would render an empty "learn more" panel. Journal-level entries were verified against Crossref/PubMed before being added: Felleman & Van Essen 1991 (visual areas), Amaral & Witter 1989 (hippocampal formation), Catani et al. 2005 (perisylvian language networks), Haber & Knutson 2010 (reward circuit), Schmahmann 2003 (vascular syndromes of the thalamus), plus the pre-existing Scoville & Milner 1957, Alexander/DeLong/Strick 1986, Catani & ffytche 2005, Catani & Thiebaut de Schotten 2008 and Damkier et al. 2013.

### 11.10 What this task deliberately did **not** do

- It did **not** touch `src/types.ts`, `scripts/validate-data.mjs`, `src/data/load.ts`, `plates.json`, any `plates/*.svg`, or any `src/components/**` file — all owned by other tasks in this run.
- It did **not** duplicate `nuc-globus-pallidus-internus` / `nuc-globus-pallidus-externus` / `nuc-dentate-gyrus` / `surf-optic-chiasm` (all pre-existing), and it did **not** invent `nuc-gpi` / `nuc-gpe` ids that no data, plate or code refers to.
- It did **not** author new meshes or GLBs (geometry is `tel-deep-geometry` / `vasc-register-bake`), and it did **not** claim any: every record that has no baked part says so in `meshes:false` + `contextNote`.
- It did **not** move anything below y = +45: no existing record's `origin3d`, level anchor, plate or clip value was changed. The only edits to pre-existing records were **additive** (`origin3d`/`size3d` added to four ventricular segments; `meshes`/`contextNote` added to `nuc-dentate-gyrus`; `levels[]` extended on `tract-optic-radiation`; `synonyms` extended on `nuc-dentate-gyrus`).

### 11.11 Verification performed (all non-browser gates)

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors, 1 warning (the staged vasculature file, §11.8), 206 registry entries (0 awaiting a record), 15 structure files / 183 records, 23 tracts, 26 syndromes, 15 plates |
| `npm run check` | **exit 0** (`tsc --noEmit`, catches the duplicate `webRefs` key class of error) |
| `.dsh-scratch/v8-content/check-v8-records.mjs` (scratch, author's own semantic gate) | **all passed** — every new id registered; no display-name or colour drift against the registry; every `anchors.mesh` is a real baked manifest part; every `supply` syndrome id and every `territory` structure id resolves; a curated webRef exists for every new id; every mesh-less v8 record is flagged; every `origin3d` inside the AMENDMENT B bounds (x ±58, y −55…116, z −76…72) |
| browser lanes (`verify:audit` / `verify:browser` / `verify:acceptance`) | **not run and not claimed** — Chrome is sandbox-denied for agents; the orchestrator owns that lane. What to check there: the new `ctx-*` areas appear in the Telencephalon tree under *Functional cortical areas*, selecting one shows its record and highlights the hemisphere ribbon (the current stand-in for the host gyrus), and the ventricles/hippocampal subfields are selectable from the tree. |

### 11.12 Independent re-verification of §11 (`verify-content-authoring.mjs`) — added in the resumed pass

§11.1–§11.11 were written by the run's first pass. The **resumed pass re-derived every claim in them from scratch** rather than trusting the earlier text, with a gate written *against the task brief* instead of against the author's own check (`.dsh-scratch/v8-content/verify-content-authoring.mjs`, scratch — **453 assertions, 0 failures**). It re-checks the per-category counts, the exact brief ids, `kind`/`subdivision`/`region` on every new record, the named clinical facts, level-id resolution, `territory`/`supply` id resolution, webRef coverage, and the registry state. Two findings worth recording:

1. **The validator warning is a property of the staged directory, not of the filename.** The resumed pass briefly renamed the file to `structures-pending/structures-vasculature.json` on the theory that the `structures-` prefix would satisfy the validator's group classifier, then reverted it (hash identical, `318ae8c0…`). `validate-data.mjs` classifies by *path* (`f.startsWith('structures/')`), so **no filename inside `src/data/structures-pending/` can avoid the warning** — moving the records out of `src/data` is the only alternative, and the brief requires them there. The warning therefore stays until `vasc-region-platform` lands the `vasculature` enum and `integration-v8` performs the `git mv` of §11.8 step 3, at which point it disappears with no further edit.
2. **"Nothing below y=+45 moved" is now machine-checked, not asserted.** Node cannot spawn `git` in the agent sandbox (`spawnSync git EPERM`), so `.dsh-scratch/v8-content/git-dump.ps1` + `split-head-records.mjs` dump the committed v1–v7 data (183 records from 12 files) as per-record JSON, and the verifier compares by id: every committed record still exists, **no committed numeric value changed** (this is the actual proof that no coordinate moved), `levels.json` anchors are unchanged in count and value, and every committed registry row is byte-identical (append-only). The only pre-existing records that gained anything are exactly the five disclosed in §11.7 and §11.5 — `nuc-dentate-gyrus` (`meshes`, `contextNote`) and the four ventricular horns/atrium (`origin3d`, `size3d`, `contextNote`) — plus `tract-optic-radiation`, whose `levels[]` was extended (§11.6). Every other pre-existing record is untouched.

| re-verification gate | result |
| --- | --- |
| `.dsh-scratch/v8-content/verify-content-authoring.mjs` (brief-shaped acceptance) | **exit 0 — 453 passed, 0 failed.** 12/12 cortical areas with `anchors.gyrus` + clinical + bloodSupply + levels + refs; GPi/GPe roles present on the existing ids and **no** duplicate `nuc-gpi`/`nuc-gpe` invented; 4 hippocampal subfields all `meshes:false` + schematic-placement note; 3 optic records + the enriched radiation with bitemporal hemianopia / quadrantanopia / retina→V1; all 5 ventricular segments with plane anchors + the interventricular foramen; 14 vessels with `region:"vasculature"`, `kind:"vessel"`, frozen-slug conformance, resolving `territory`/`supply`, laterality, levels and curated webRefs (PCA→Percheron/dejerine-roussy, AICA→lateral pontine, SCA→cerebellar all confirmed) |
| `.dsh-scratch/v8-content/check-v8-records.mjs` | **exit 0** after fixing a shadowed-reporter bug (the mesh-less honesty branch declared `const note` over the module-level `note()` reporter, so a mesh-less-without-flag failure would have been swallowed instead of reported; the message now also names the offending id) |
| `npm run verify:pipeline` | **exit 0** — unchanged v7 baseline **106/106 parts · 570,096 triangles · 329 loops · 0 problems** (this task authors no geometry, so any change here would have been a regression) |
| `git diff --check HEAD` | clean — no whitespace errors, and `git status` shows **no file outside this task's write scope modified** |

---

## 11.13 v8 closure — the orchestrator's landing, platform and render wiring

**Context.** The v8 run stopped with `vasc-acquire` and `vasc-register-bake` complete,
`content-authoring` failed on its own evidence contract (its work landed anyway — §11.1–§11.12 above), and
`vasc-region-platform` / `vasc-render` / `tel-deep-geometry` / `integration-v8` blocked and never dispatched.
The remaining work was executed directly by the orchestrator, with no swarm in the loop. This section is that
record: what landed, what it is wired to, what was verified, and what is deliberately still open.

### 11.13.1 Platform — the `vasculature` region is legal

| file | change |
| --- | --- |
| `src/types.ts` | `Region` gains `'vasculature'` |
| `src/data/load.ts` | `ALL_REGIONS` gains it; `REGION_LABELS` gains **"Cerebral vasculature"** |
| `scripts/validate-data.mjs` | `REGIONS` gains it (the enum the validator checks `record.region`/`entry.region` against) |
| `src/data/structures/vasculature.json` | the 14 staged records moved here from `src/data/structures-pending/` (plain move — `git mv` refused because the staged directory was untracked), so they load through the existing `import.meta.glob('./structures/*.json')` |
| `src/data/taxonomy.json` | **14 registry rows appended**, derived field-by-field from the records themselves (`.dsh-scratch/v8/vasc-registry.mjs`, scratch). Deriving rather than retyping is the point: the validator cross-checks registry against record, so a hand-copied name/colour/subdivision would have been a drift source with no upside. Append-only and idempotent, one object per line in the file's own style (no whole-file reformat). |

`npm run validate` → **exit 0, 0 errors, 0 warnings**, 220 registry entries (0 awaiting an authored record),
16 structure files / 197 records. **The repository's only warning is gone.**

### 11.13.2 Render — the arterial layer reaches the scene

| area | change |
| --- | --- |
| `src/geometry/materials.ts` | `MATERIAL_HINTS` gains `'vasculature'`; new **`createVesselMaterial`** (crimson, `roughness 0.34`, `clearcoat 0.3`, translucent 0.5, `DoubleSide` so a translucent tube shows no open interior, fresnel rim, section cut face in `VESSEL_CAP_COLOR #7f1d1d` instead of the shared tissue cap); `makeAnatomyMaterial` dispatches the hint. |
| `src/components/viewer3d/NucleusMesh.tsx` | `hintForKind('vessel')` → `'vasculature'`, so a vessel record with **no** manifest hint still gets the arterial material (the mesh-less ones). |
| `src/geometry/anatomyAssets.ts` | `AnatomyRecordLink` gains **`also`/`bodyRight`/`alsoRight`** + the **`anatomySlugsForRecord`** helper (per-side body lists; `right: null` = mirror, i.e. exactly the v1–v7 rule for every link that predates v8); **17 new links** — 14 vessel records + the 3 optic-pathway records; **`RECORD_MATERIAL_OVERRIDES`** restores the kind-implied hint for the optic parts the bake emitted with `materialHint:'vasculature'` (two tracts → `white-matter`, chiasm → `context`). |
| `src/components/viewer3d/SceneLayers.tsx` | the body pass now draws **every body of a record per side**: explicit right-side bodies where the two sides are not mirror images (arteries — the circle of Willis is asymmetric), and both segments of the MCA/PCA under the one record. A record that is `midline` but names a right body (the chiasm) draws both halves. |
| `src/components/section/sectionAssets.ts` | the section-worker slug table is derived from `anatomySlugsForRecord` instead of `link.body` alone. **This was a real bug, caught before it shipped:** the MCA's M2 and the PCA's P2 slugs were absent from the table, and a slug with no entry resolves to `region: null` — which the live-section canvas reads as "no region filter applies", so those two segments would have painted in the section view even with the vascular layer switched off. |
| `src/state/store.ts` | new **`vasculature` preset** (arterial cast: vessels + surface records + context envelopes, everything else layer-off by *kind*); **`brainstem-focus`** and **`cortex-only`** now use the non-vascular region set, so the overlay is hidden at default framing through the REGION layer rather than through 14 structure ids (which the presets' own region guard would have read as a statement about the telencephalon). The load-time assertion that every non-telencephalon record stays layer-on in the default is **amended to exempt the vascular region — and pays for it with three new assertions**: the vascular region layer is off in the default, no vessel is hidden at structure level, and *All* / *Whole brain* / *Vasculature* each carry both the region and the `vessel` kind with no vessel hidden (without which the overlay could be unreachable everywhere while every other check still passed). |
| `src/components/Header.tsx` | *Vasculature* added to the preset button order, next to *Whole brain*. |
| `src/components/Legend.tsx`, `src/styles/tokens.css` | a **Cerebral arteries** palette swatch and the `--kind-vessel` token; the region and kind layer toggles pick the new entries up automatically (`ALL_REGIONS`/`ALL_KINDS`). |

### 11.13.3 What v8 did **not** finish: per-segment geometry

`tel-deep-geometry` never ran, and the orchestrator did not attempt it. **GPi/GPe, the caudate's head/body/tail
and the lateral ventricle's horns/atrium/body are records that share their parent's committed mesh** — they are
selectable, annotated, tree-visible and painted by the live section under the parent body, but selecting GPe
highlights the pallidum rather than a separate outer segment. Carving them properly means an SDF/CSG split of a
committed solid (a shell for GPe around GPi; a plane-clipped caudate; horn-clipped ventricle casts), each of which
has to stay watertight, inside its per-part triangle cap and inside the parent's bounding box before it can be
committed — a geometry task with its own verification, and one that touches bodies whose bbox invariance is
asserted by `verify:anatomy`. It is recorded here, in the README's *Honest limits (v8)*, and in
`docs/NEUROATLAS_V8_PLAN.md` §9 as the first item of the remaining v8 work.

### 11.13.4 Verification (orchestrator run, after the wiring above)

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0 — 0 errors, 0 warnings** · 220 registry entries · 16 files / 197 records |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (15.9 s) |
| `npm run verify:pipeline` | **exit 0 — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems** |
| `npm run verify:plane` | **exit 0 — 10,827 assertions** |
| `npm run verify:anatomy` | **exit 0 — 27 passed · 0 failed** (brainstem envelope bboxes unchanged, MRI/CT legacy-level content `max |Δ| 0 of 255`, every baked part inside `CLIP_BOUNDS`, budgets: 599,204 ≤ 800k tris, GLB 13.89 MB ≤ 14 MB, imaging 8.71 MB ≤ 10 MB) |
| browser lanes | run by the orchestrator after this record was written; results in §11.14 |

### 11.14 Browser lanes (the orchestrator's own runs — the one lane agents cannot execute)

Both lanes drive real Chrome over CDP against a real dev server. They are the evidence for everything §11.13
claims about the *running app*, as opposed to the data and the geometry.

| lane | result |
| --- | --- |
| `npm run verify:acceptance` | **exit 0 — 9/9 checks passed.** PiP visible by default, hides on ×, the "Live section ▸" restore pill returns it, the hidden state survives a reload; the Plates-tab plane sliders are present with their canonical ranges (x −58…58, z −76…72, y −55…116); a slider move repaints the section (painted 901 → 901 with the MRI layer credited); no page exceptions. |
| `npm run verify:audit` | **exit 0 — 68 passed · 0 failed · 16 informational.** Includes the 12 new v8 checks below, and re-confirms the whole v4→v7 surface: modality sweep (CT / MRI / Photo / Simulated-only with each state's own reason), CT coverage honesty above y ≈ 36.25 au, the telencephalon tree and its 7 subdivisions, the +58 plate, the WebGL context-loss overlay and its documented terminal state, the `?panelfail` containment (exactly one armed boundary, Retry clears it, other panels keep rendering), zero unexpected runtime errors, zero failed requests, zero 4xx/5xx. |

**The 12 v8 checks (all `ok`)** — the vascular layer's DOM contract, end to end:

| # | check | reading |
| --- | --- | --- |
| 1 | the tree carries the vascular region | "Cerebral vasculature", count **14** |
| 2 | the default Brainstem-focus framing has the region layer **off** | hidden by region, not by structure |
| 3 | the legend agrees with the tree | region `vasculature` off, kind `vessel` on — one layer state, two surfaces |
| 4 | the palette documents the new family | "Cerebral arteries" row present |
| 5 | the *Vasculature* preset switches the region **on** | in the tree and the legend |
| 6 | it is the arterial cast, not "everything" | nuclei layer-off, vessels on |
| 7 | the region expands into its circulations | Anterior circulation · Circle of Willis · Deep perforators · Posterior circulation |
| 8 | an artery selected from the tree opens its record | "Posterior cerebral artery" |
| 9 | the record reports its **territory** | **17** selectable structures (V1, V2, occipital lobe, …) |
| 10 | the record names the **syndromes it causes** | **9** cards via the vessel→syndrome `supply` index (Déjérine-Roussy, Artery-of-Percheron, Tuberothalamic…) |
| 11 | it carries its clinical significance | what an infarct there causes |
| 12 | returning to Brainstem focus hides the layer again | the region toggle is the only switch (round trip) |

Checks 9–12 are the ones a missing semicolon had silently skipped on the first run of this block (they were
parsed into the previous ternary's never-evaluated alternate branch and reported nothing at all — 66 → **68**
after the fix; see `docs/NEUROATLAS_V8_PLAN.md` §9.4). Their absence was caught because the count did not
match the number of checks written, which is why the audit prints a count rather than only a verdict.

---

## 12. v9 — the somatotopic map, the cortical-division layer, and the imaging registration measurement

**Appended by the v9 `integrate-docs` task** (`docs/SWARM_V9_PLAN.md` §8, task 6 in that plan's §6 table;
the executable contract the run was verified against is `PLAN.md`, which is **gitignored** — a plan of record
in the working tree only). §1–§11 above are the dated v6/v7/v8 reconciliations and **none of them was edited,
renumbered or restated**. Every number here was recomputed from `src/data` / `src/assets` at close-out with
`npm run validate` and the gates named per row — not copied from a task report. Where a v9 task's own report
disagrees with the recomputation, the recomputation is what is written here.

### 12.1 Measured delta

| quantity | §11.13 (v8 closure) | v9 close-out | how |
| --- | --- | --- | --- |
| registry entries (`taxonomy.json`) | 220 | **236** | `npm run validate` |
| registry entries awaiting an authored record | 0 | **0** | `npm run validate` |
| by kind | — | nucleus · tract · surface · context · ventricle · **vessel** (unchanged counts per kind except `context` **+16**) | registry read |
| `structures/*.json` | 16 files / 197 records | **17 files / 213 records** | `npm run validate` |
| `tracts.json` | 23 | **23** (unchanged) | `npm run validate` |
| `levels.json` anchors | 17 | **17** (unchanged, values unchanged) | `npm run validate` |
| syndromes | 26 in 3 files | **26 in 3 files** (unchanged) | `npm run validate` |
| plates / plate SVGs | 15 / 15 | **15 / 15** (unchanged) | `npm run validate` |
| `npm run validate` | 0 errors, 0 warnings | **0 errors, 0 warnings** | gate |

**16 ids registered, 16 records authored** — the whole v9 content delta is one new file and one append-only
registry edit. No pre-existing record was edited, renamed or moved by v9.

### 12.2 The somatotopic map — 16 new records (`src/data/structures/telencephalon-somatotopy.json`)

All 16: `region: "telencephalon"` · `subdivision: "Functional cortical areas"` (existing — no new
subdivision) · `kind: "context"` · `laterality: "paired"` · `meshes: false` · `parent` = `ctx-m1` / `ctx-s1`
(both pre-existing) · 8 level anchors each · 2–3 `refs` · `synonyms` · `connections.afferent/efferent` ·
`function` · `clinical[]` · `contextNote`. Registry rows were appended **before** the records referenced them
(registry-first), and `npm run validate` reports 0 waiting and 0 drift.

| # | slug | body part | strip | order | `origin3d` (record) | measured outward normal | probe residual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `ctx-m1-toe` | toe | M1 | 0 | [7.46, 109.89, −11.91] | (−0.76, 0.63, 0.15) | 0.04 au (0.05 mm) |
| 2 | `ctx-m1-leg` | leg | M1 | 1 | [15.03, 108.00, −12.70] | (0.86, 0.19, −0.48) | 0.03 au (0.04 mm) |
| 3 | `ctx-m1-trunk` | trunk | M1 | 2 | [24.89, 102.10, −12.76] | (−0.72, 0.40, 0.57) | 0.16 au (0.19 mm) |
| 4 | `ctx-m1-arm` | arm | M1 | 3 | [30.70, 99.40, −8.45] | (−0.42, 0.69, 0.59) | 0.05 au (0.06 mm) |
| 5 | `ctx-m1-hand` | hand | M1 | 4 | [38.46, 93.20, −10.91] | (0.62, 0.25, −0.74) | 0.04 au (0.05 mm) |
| 6 | `ctx-m1-face` | face | M1 | 5 | [42.97, 80.14, −6.95] | (0.88, −0.28, −0.39) | 0.07 au (0.08 mm) |
| 7 | `ctx-m1-tongue` | tongue | M1 | 6 | [46.49, 68.50, −4.39] | (0.32, 0.66, 0.68) | 0.01 au (0.01 mm) |
| 8 | `ctx-m1-larynx` | larynx | M1 | 7 | [48.42, 58.23, −3.51] | (0.95, −0.24, 0.19) | 0.04 au (0.05 mm) |
| 9 | `ctx-s1-toe` | toe | S1 | 0 | [7.33, 108.57, −20.76] | (−0.32, 0.40, 0.86) | 1.00 au (1.20 mm) |
| 10 | `ctx-s1-leg` | leg | S1 | 1 | [15.69, 105.80, −17.75] | (−0.21, 0.26, 0.94) | **2.29 au (2.75 mm)** |
| 11 | `ctx-s1-trunk` | trunk | S1 | 2 | [23.50, 102.15, −16.99] | (−0.68, 0.67, 0.32) | 0.53 au (0.64 mm) |
| 12 | `ctx-s1-arm` | arm | S1 | 3 | [32.26, 94.48, −17.63] | (0.84, −0.41, −0.35) | 0.29 au (0.35 mm) |
| 13 | `ctx-s1-hand` | hand | S1 | 4 | [37.07, 91.24, −15.26] | (−0.26, 0.73, 0.63) | 0.78 au (0.94 mm) |
| 14 | `ctx-s1-face` | face | S1 | 5 | [40.36, 78.22, −16.43] | (0.84, −0.52, 0.17) | 0.53 au (0.64 mm) |
| 15 | `ctx-s1-tongue` | tongue | S1 | 6 | [46.37, 68.13, −14.62] | (0.58, 0.82, −0.04) | 0.41 au (0.49 mm) |
| 16 | `ctx-s1-larynx` | larynx | S1 | 7 | [50.86, 60.88, −9.24] | (0.87, 0.25, 0.42) | **2.20 au (2.64 mm)** |

**The placement method, measured (not guessed).** The probe
(`node .dsh-scratch/somatotopy-probe7b.mjs`, gitignored scratch, reported in the task report) reads the
committed `src/assets/anatomy/ctx-hemisphere-l.glb` — 1 mesh, **40,388 verts / 81,128 tris**, bbox
x [1.00, 55.47] y [−6.80, 113.70] z [−72.82, 70.59], **signed volume +301,371.7 au³** (so the winding is
CCW-outward and the vertex normals point away from tissue), mean edge 1.306 au. For each segment it takes an
authored anatomical landmark, projects it by exhaustive nearest-vertex search onto the ribbon, records the
residual between the landmark and the vertex it found, and takes the local surface normal. The committed table
lives in `src/geometry/somatotopy.ts` **with the rule that produced it**, so a re-run reproduces the 16 rows.

**Ordering evidence.** `npm run verify:somatotopy` (**45 assertions, exit 0**): `order` is 0…7 in somatotopic
sequence on both strips; **arc length strictly increasing** (M1 min gap 7.72 au = 9.26 mm, S1 min gap
6.27 au = 7.52 mm); **canonical x also strictly increasing** (M1 min gap 1.93 au, S1 3.29 au) — medial→lateral
in +x; **8/8 M1↔S1 pairing** by body part with the posterior offset printed per part (4.45–10.53 au); every
`origin3d`, every `origin3d ± size3d`, every normal-offset patch centre and every **mirrored (−x)** extent
inside `CLIP_BOUNDS` x[−58,58] y[−55,116] z[−76,72]; surface contact re-measured against the GLB — all 16
patch centres within 1 au of a ribbon vertex (worst 0.36 au) and the worst sampled rim point 3.05 au
(3.67 mm) at `ctx-s1-trunk` against a 3.5 au tolerance; patch footprint [3.80, 3.00, 3.00] au half-sizes, so
the strip reads as a band and the closest pair of centres (1.93 au apart, on M1) overlaps.

**Colour ramp.** One ramp, reproduced in the registry so the two cannot drift: anchors M1 `#446ff2 → #e14a55`
and S1 `#5b8fd9 → #d95b6e`, running face (0) → hand (0.2) → arm (0.4) → trunk (0.6) → leg (0.8) → toe (1).

**Honest limit, in the records themselves.** Every `contextNote` states that the placement is **schematic on
the derived `ctx-hemisphere-l` ribbon**, names the probe command and carries that segment's own measured
residual — the three least certain (`ctx-s1-leg` 2.29 au, `ctx-s1-larynx` 2.20 au, `ctx-s1-toe` 1.00 au) say
so explicitly. The 3D body-part labels render for the hovered/selected segment (two `label3d` nodes per
segment, one per hemisphere), so at rest the map reads by colour ramp only.

### 12.3 The cortical-division layer — method, fitted constants and residuals

Not a content addition (no id, no record): `src/components/section/corticalLobes.ts` is a **geometric
partition of the derived ribbon**, drawn by the 2D live section over the existing "Cerebral cortex" fill.
The file header carries the caveat **"THIS DIVIDES THE DERIVED RIBBON, NOT A GYRAL MAP"** and every boundary's
measurement and residual:

| boundary | fitted to | residual |
| --- | --- | --- |
| central sulcus (frontal \| parietal) | the measured dorsal-ridge notch (ridge 106 → 90 at x 20–26); `z_cs(y) = −57 − 11.5y` below the knee, `y ≥ 77` above it | **0.0 au at both measured endpoints**, 5.4 au at the hand-knob reach |
| lateral fissure (temporal \| frontal/parietal) | the measured MCA M1 junction (nearest ribbon vertex 3.13 au at [26.4, 15.2, 20.7]) and the M2 exit (5.93 au at [33.2, 36.6, 29.4]); `y_fis(z) = max(15, 30.7 − 0.46(z − 5))`, gated z ≤ 45 and x ≥ 18 + 0.055(z + 40) | **3.9 au at the M2 exit** |
| parieto-occipital / calcarine (occipital) | `z ≤ −50 − 0.15y` above y = −5, pinned to an **11.05 %** ribbon share at z ≤ −52 (PCA P2 z [−16.6, 12.4] reported) | pinned, not fitted |
| circular sulcus / insular limen (insula) | an ellipsoid at centre [29, 22, 17], radii (13, 16, 22) au = **15.6 × 19.2 × 26.4 mm**, holding **3.34 %** of ribbon vertices and **2.10 %** of reference-plane area | morphometric series 1.8–2.5 % |
| callosal/cingulate + collateral (limbic) | callosal band radii (20, 22) au about the measured callosum (y [19.4, 63.9], z [−34.8, 41.1]), cut at the splenium by `y + 0.45z ≥ 42`, x ≤ 24 — **3.4 au = 4.1 mm** of cingulate beyond the callosal surface — plus the medial temporal band (x ≤ 22, y ≤ 20, z [−20, 17]) | **4.1 mm** of cingulate beyond the callosum |

**Measured shares** (`npm run verify:cortical-lobes`, **200/200 assertions**, exit 0; the check prints the
per-plane table and each plane's absent divisions). Whole ribbon by vertex: frontal 44.30 %, parietal 21.63 %,
temporal 17.60 %, occipital 9.27 %, limbic 3.86 %, insula 3.34 %.

| division | share over the 13 reference planes | planes where it is present / absent |
| --- | --- | --- |
| frontal | **47.60 %** | present 9 · absent y = 0 |
| parietal | **27.30 %** | present 7 · absent y = 14, y = 78, z = 0 |
| temporal | **12.90 %** | present 6 · absent y = 68, y = 78, x = 6, z = 40 |
| occipital | **6.60 %** | present 7 · absent y = 78, z = 0, z = 40 |
| limbic | **3.50 %** | present 6 · absent y = 30, y = 68, y = 78, z = 40 |
| insula | **2.11 %** | present 3 · absent y = 0, 48, 58, 68, 78, x = 6, z = 40 |

**Honest limits, with their numbers.** (1) **Three of the 13 reference planes — y = −46, −24, −8 — miss the
ribbon entirely** (its inferior limit is y = −6.803) and carry no division. (2) The per-division absence list
above is the honest form of "each division is non-empty on the reference planes". (3) At the 0.5 au raster two
**sub-cell slivers** lose their last cell (parietal at z = 0 and limbic at z = 40 have run vertices but no
raster cell). (4) The derived ribbon has **no insular surface**: at y = 30 the Sylvian corridor is a gap
between z 21.5 and 24.9, so the insula ellipsoid paints the deepest available limen tissue, not real insular
cortex. (5) `limbic : rest = 1 : 26.8` against **1 : 8 – 1 : 20** in the literature — the band is the 1–2
gyrus strip the probe could measure, not the whole limbic lobe; the medial temporal band under-counts the
parahippocampal gyrus deliberately (lateral edge 22 vs hippocampal lateral edge 31.0).

### 12.4 The imaging registration measurement (`src/assets/imaging/registration-fit.json`, `plate-fit.json`)

Produced by the re-runnable fitter `node scripts/fit-imaging-affine.mjs --report` (deterministic coarse-to-fine
grid search, 3 stages, no RNG/clock/network; objective = minimise `1 − IoU(atlasBrainMask, imageMask ∘ T)` on a
512² uniform canonical grid in the plane frame). The **atlas mask** is 34 committed GLB parts read through the
section pipeline's own clipping; the **image mask** is each modality's own committed voxels/JPEG/PNG.

**Grid modalities — 8 reference planes each (y = −46, −24, −8, 0, 14, 30, x = 6, z = 0).** Search bounds
scale ×[0.75, 1.25] uniform, translation ±48 au; the ROI is the atlas mask's own in-plane bbox padded 30 %
per side (the image is a head, the atlas is a brain, so a global IoU is dominated by pixels no atlas brain can
cover — that is why the ROI figure is the one quoted).

| modality | image mask | mean ROI IoU before → **per-plane winners** | mean centroid residual | the ONE similarity that could ship | verdict |
| --- | --- | --- | --- | --- | --- |
| **CT** | `ct.bin` uint8 ≥ 8, `backgroundValue 0` excluded → **302,860 / 979,371 voxels kept (30.9 %)**; 350,001 no-data + 326,510 below floor rejected | 0.0569 → **0.1428** (8 improved · 0 worsened · 0 unchanged) | 18.09 → **10.64 au** (max 51.54 → 38.64) | su = sv = **0.75**, du **+8**, dv **+40 au** → mean ROI IoU 0.2575 but mean residual **20.39 au** (median 10.82 → **34.04**), worst single plane **+15.24 au**, improving **2/8** planes | **NOT APPLIED** (`applied: false`) |
| **MRI** | `mri-t1.bin` uint8 ≥ 40 → **832,843 / 979,371 voxels kept (85.0 %)** | 0.0675 → **0.1555** (8 improved · 0 worsened · 0 unchanged) | 9.40 → **6.93 au** (max 30.97 → 17.96) | su = sv **0.75**, du **+8**, dv **+40 au** → mean residual **17.75 au** (median 4.38 → **27.34**), worst single plane **+14.79 au**, improving **3/8** planes | **NOT APPLIED** (`applied: false`) |

**Why the "improvement" was rejected.** The atlas mask is a **brain** and the image mask is the **head's
soft-tissue envelope** — there is no brain segmenter in this repo and no dependency may be added — so only
**6.6 % (CT) / 8.0 % (MRI)** of the atlas lands on image mask (median extent ratio 1.04 × 1.26). A
translation/scale search is not comparing two views of one object, and the single similarity that maximises
the mean IoU **makes the centroid residual worse on the planes that matter**. The committed placement is kept
and the residual is reported rather than tuned away; both manifests carry the reason string with those
numbers, and `imageLayers.ts` prints it as the UI's alignment note.

**Photograph / stain plates — 24 measurable PNG plates.** Image mask = in-script PNG decode
(`node:zlib inflateSync` + PNG filters 0–4); tissue = luminance < (median of the 8-px border bands − 12).

| plate | ref plane | tissue % | ROI IoU before → after | Δ IoU | centroid residual before → after (au) | extent ratio to atlas before → after | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ubc-c07.png` | z = 0 | 50.1 | 0.0276 → 0.3485 | +0.3208 | 3.91 → 1.32 | 0.16×0.09 → 1.27×0.64 | applied |
| `ubc-c09.png` | z = 0 | 51.6 | 0.0292 → 0.3456 | +0.3164 | 3.76 → 8.51 | 0.17×0.09 → 1.15×0.57 | applied (extent repair) |
| `ubc-c11.png` | z = 0 | 58.4 | 0.0326 → 0.3616 | +0.3290 | 3.68 → 6.24 | 0.17×0.09 → 1.17×0.59 | applied (extent repair) |
| `ubc-c12.png` | z = 0 | — | — | — | — | — | applied |
| `ubc-c13.png` | z = 0 | 59.5 | 0.0319 → 0.3733 | +0.3413 | 3.69 → 8.55 | 0.17×0.09 → 1.10×0.55 | applied (extent repair) |
| `ubc-c14.png` | z = 0 | 57.4 | 0.0309 → 0.3669 | +0.3360 | 3.66 → 8.19 | 0.17×0.09 → 1.10×0.54 | applied (extent repair) |
| `ubc-c15.png` | z = 0 | 50.1 | 0.0259 → 0.3704 | +0.3445 | 4.45 → 8.70 | 0.17×0.09 → 1.13×0.60 | applied (extent repair) |
| `ubc-c16.png` | z = 0 | 51.5 | 0.0267 → 0.3724 | +0.3456 | 4.35 → 10.30 | 0.18×0.09 → 1.14×0.60 | applied (extent repair) |
| `ubc-c17.png` | z = 0 | 45.2 | 0.0221 → 0.3686 | +0.3465 | 4.50 → 11.55 | 0.14×0.09 → 1.39×0.78 | applied (extent repair) |
| `ubc-c18.png` | z = 0 | 45.9 | 0.0234 → 0.3703 | +0.3469 | 5.33 → 10.00 | 0.14×0.09 → 1.39×0.78 | applied (extent repair) |
| `ubc-c19.png` | z = 0 | 43.1 | 0.0222 → 0.3546 | +0.3324 | 4.32 → 11.11 | 0.13×0.09 → 1.36×0.78 | applied (extent repair) |
| `ubc-c20.png` | z = 0 | 43.2 | 0.0220 → 0.3680 | +0.3460 | 4.23 → 12.02 | 0.16×0.09 → 1.35×0.78 | applied (extent repair) |
| `ubc-c21.png` | z = 0 | 39.9 | 0.0196 → 0.3636 | +0.3440 | 4.35 → 8.85 | 0.16×0.09 → 1.39×0.81 | applied (extent repair) |
| `ubc-c22.png` | z = 0 | 42.0 | 0.0210 → 0.3593 | +0.3383 | 4.14 → 7.02 | 0.13×0.09 → 1.35×0.78 | applied (extent repair) |
| `ubc-c23.png` | z = 0 | 47.0 | 0.0238 → 0.3609 | +0.3372 | 3.91 → 8.26 | 0.17×0.09 → 1.32×0.74 | applied (extent repair) |
| `ubc-c24.png` | z = 0 | 47.1 | 0.0239 → 0.3658 | +0.3419 | 3.83 → 5.53 | 0.14×0.09 → 1.32×0.74 | applied (extent repair) |
| `ubc-h12.png` | y = 14 | 46.0 | 0.0901 → 0.3486 | +0.2585 | 16.26 → 11.47 | 0.23×0.24 → 0.94×0.95 | applied |
| `ubc-h13.png` | y = 0 | 46.1 | 0.0991 → 0.4140 | +0.3149 | 15.99 → 14.09 | 0.29×0.27 → 0.97×0.88 | applied |
| `ubc-h14.png` | y = 0 | 46.0 | 0.0948 → 0.4121 | +0.3173 | 16.27 → 14.44 | 0.25×0.27 → 0.96×0.88 | applied |
| `ubc-h15.png` | y = −8 | 53.0 | 0.1095 → 0.6242 | +0.5146 | 21.01 → 2.00 | 0.34×0.35 → 0.95×1.00 | applied |
| `ubc-h16.png` | y = −8 | 41.8 | 0.0910 → 0.6121 | +0.5212 | 21.48 → 3.84 | 0.32×0.33 → 1.02×1.07 | applied |
| `ubc-h17.png` | y = −24 | 44.5 | 0.0993 → 0.6994 | +0.6001 | 20.28 → 1.48 | 0.34×0.38 → 1.14×1.26 | applied |
| `ubc-h18.png` | y = −24 | 43.2 | 0.0948 → 0.7063 | +0.6116 | 19.96 → 2.77 | 0.35×0.38 → 1.02×1.09 | applied |
| `ubc-h19.png` | y = −46 | 42.9 | 0.3732 → 0.7262 | +0.3530 | 1.89 → 0.92 | 2.03×1.55 → 1.26×0.91 | applied (extent repair) |
| `ubc-h20.png` | y = −46 | 42.9 | 0.3432 → 0.7305 | +0.3873 | 2.28 → 0.80 | 2.15×1.76 → 1.24×0.91 | applied (extent repair) |

**Totals: 24 plates measured · 24 applied · 0 kept · 0 worsened · mean ROI IoU 0.0741 → 0.4468.** The
"extent repair" override is part of the shipped record and says so in each plate's own `applyReason`: where
the committed placement made the plate 0.13–0.18 × 0.09 the atlas cross-section (outside the 3× sanity
limit), the plate's tissue centroid is not a registration reference, so the centroid gate is overridden by
the extent repair — which is exactly the defect the user reported for the photographs.

**Not measured, with counts: 49 JPEG plates** (`vhp-*` 22, `ubc-m*` 17, `bmm-*` 10) are recorded
`unmeasurable: no-decoder` — no JPEG decoder exists in this repo and no dependency may be added — and keep
their committed placement. **3 plates** (`wikict-axial-*`) carry no committed `fit` and are `not-fittable`.
**Nothing about those 52 plates is claimed as measured.**

**Where the numbers live and what reads them.** `src/assets/imaging/registration-fit.json` (every plane,
bound, residual, candidate and gate) and `plate-fit.json` (per-plate rows) are the records;
`src/assets/imaging/ct-manifest.json` / `mri-manifest.json` carry the additive
`registration.display` block (`applied`, `reason`, parameters, gate, residuals, note); the corrected plate
affines travel as `fittedFit` in `src/data/sectionImages.ts` (4 map literals + the wiring that reads them),
and `src/components/section/imageLayers.ts` **prefers `fittedFit`** over the legacy `fit` — it is the single
place the layers are sampled.

**The frozen invariant held.** `ct.bin`, `mri-t1.bin` and both manifests' `dims`/`originAu`/`spacingAu` are
byte-identical to `HEAD` (the only manifest change is the additive `registration.display` block), so
`verify:anatomy`'s MRI/CT legacy-level invariant (`max |Δ| 0 of 255`) is untouched: the correction is
display-time only, never a re-bake.

**RED GATE, recorded rather than hidden.** `npm run verify:imaging-fit` **fails on the committed tree**, and
the failure was made measurable rather than merely reported: the committed gate re-runs the fitter as a
**piped child process**, which this sandbox denies, so the command itself stops at
`FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM` (exit 1, **no assertion runs**).
The fitter's `--json` output was therefore captured by redirection and fed to a byte-identical copy of the gate
with only that transport swapped (`.dsh-scratch/v9-imagingfit/imaging-fit.local.mjs`, gitignored scratch;
5 insertions / 9 deletions against the committed file), which completes: **289 assertions, 20 failures**.
**18 are real defects in the committed state** — 16 × *"the manifest stores this plane"* (the gate compares
every recomputed plane against `registration.display.planes`, and the committed manifests carry **no `planes`
array**: their `registration.display.residuals` holds only the aggregate keys
`planesFitted, improved, worsened, unchanged, roi, roiIouBefore, roiIouAfterPerPlaneWinners,
roiIouWithChosenCorrection, min/maxRoiIouBefore, mean/maxCentroidResidual{Before,AfterPerPlaneWinners,
WithChosenCorrection}Au, meanAtlasCoverage{Before,After}, toleranceIou, toleranceAu, note`) and 2 ×
*"`sectionImages.ts` carries the accepted correction"* (`ubc-c13`/`ubc-c14` ship the literal `3.108820` while
the gate builds `Math.round(scale × 1e6) / 1e6` = `3.10882` — equal numbers, different string). The other 2
failures are artifacts of the copy: inside `.dsh-scratch`, the gate's own
`git show HEAD:src/assets/imaging/*.bin` byte comparison cannot resolve, so `ct.bin`/`mri-t1.bin` report
*"cannot read HEAD"*; on the committed gate, from the repo root, those two bytes checks are the ones that pass.
Both real defects are in files owned by the `imaging-registration` task, so this document **records** them; the
fix is either to write `display.planes` from the fitter's own per-plane table (or drop the per-plane comparison
and keep the means) and to format/compare the `fittedFit` scale numerically.

### 12.5 Verification performed in this task (all non-browser)

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0 — 0 errors, 0 warnings** · 236 registry entries (0 awaiting a record) · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (9.15 s) |
| `npm run verify:pipeline` | **exit 0 — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems** |
| `npm run verify:plane` | **exit 0 — 10,827 assertions** |
| `npm run verify:somatotopy` | **exit 0 — 45 passed / 0 failed** |
| `npm run verify:cortical-lobes` | **exit 0 — 200/200 assertions** |
| `npm run verify:pip-contract` | **exit 0 — 83 passed / 0 failed**, and **5/5 mutations caught** in an isolated copy (guard removed, resizer removed, clamp window widened, retired GPU token restored, imagery scope not started) with the restored copy re-running green |
| `npm run verify:imaging-fit` | **exit 1 — NOT RUN AS ASSERTED in this sandbox** (the gate re-runs the fitter as a piped child: `spawnSync node EPERM`, no assertion runs); driven through a byte-identical copy with the captured fitter JSON it completes with **289 assertions / 20 failures = 18 real defects + 2 `HEAD` artifacts of the copy** (§12.4) |
| `npm run verify:audit-checks` | **exit 1 — 90 passed / 1 failed / 7 informational** — *"rows dimmed at default framing"* lists the 14 `vasc-*` rows, a pre-existing v8 condition (the brainstem-focus default hides the vasculature by design while the check only exempts the telencephalon); reproduced by three tasks against stashed `HEAD` files |
| `npm run verify:anatomy` | **not runnable in the agent sandbox** — `anatomy-qa.mjs:294` spawns PowerShell with piped stdio and the sandbox denies it (`spawnSync powershell EPERM`, errno −4048), so it aborts **before printing its verdict**. No agent may claim 27/27 from here; the orchestrator records it |
| browser lanes (`verify:audit` / `verify:acceptance` / `verify:browser`) | **not run and not claimed** — Chrome cannot start in the sandbox (exit 4, "no check was run"). Every behaviour claim that needs a page (the somatotopy patches and labels render, the cortical-division layer and legend paint, the corrected photographs look aligned, images-off paints only the simulated section, the panel paints the section and resizes/persists, no plane helper appears in it) is marked **orchestrator-verified only** |

---

## 13. v10 — display/UI round 2 (plane-helper extent, division visibility, four-corner PiP resize, cortical-division quality, the dropped cortex label)

**Appended by the v10 `integrate-docs` task** (`docs/SWARM_V10_PLAN.md` §8 is that run's closure). §1–§12 above
are the dated v6/v7/v8/v9 reconciliations and **none of them was edited, renumbered or restated**. Every number
here was recomputed from `src/data` and the shipped sources at close-out by the integrator's own sweep — not
copied from a task report. Where a task report disagreed with the recomputation, the recomputation is written here.

### 13.1 Measured delta — **no content record changed**

v10 is a **display, control and rule** run: it adds no structure, tract, level, plate, syndrome or registry entry,
and it renames/moves nothing.

| quantity | v9 close-out | v10 close-out | how |
| --- | --- | --- | --- |
| registry entries (`taxonomy.json`) | 236 | **236** (unchanged) | `npm run validate` |
| entries awaiting an authored record | 0 | **0** | `npm run validate` |
| `structures/*.json` | 17 files / 213 records | **17 files / 213 records** (unchanged) | `npm run validate` |
| tracts / syndromes / plates / levels | 23 / 26 / 15 / 17 | **23 / 26 / 15 / 17** (unchanged) | `npm run validate` |
| registry entries by region | — | diencephalon **39** · telencephalon **85** · midbrain **25** · pons **35** · medulla **33** · cerebellum **5** · vasculature **14** (= 236) | registry read (Node, this task) |
| registry entries of `kind:"context"` | 45 | **45** (1 of them, `ctx-cerebral-cortex`, loses its *canvas* text — §13.3; the record itself is unchanged) | registry read |
| `npm run validate` | 0 errors, 0 warnings | **0 errors, 0 warnings** | gate |

The only content-shaped artefacts v10 introduces are **UI controls and labels** (§13.2) and the **one suppressed
canvas label** (§13.3); the divisions themselves are a **grouping of the existing region taxonomy**, not new
content (§13.2).

### 13.2 The new control: a division-level visibility group (checkbox + solo per division)

The Legend's *Layer toggles* group gained a **Divisions** group — one row per division, built from the store's
`DIVISIONS` table (never a hand-typed list), each row carrying a real checkbox (`data-division-action="toggle"`)
and a real **Solo** button (`data-division-action="solo"`). The grouping is **over the taxonomy `region` field**,
so it divides exactly the 236 registry entries:

| division (`data-division`) | label shown | regions it contains | registry entries it groups |
| --- | --- | --- | --- |
| `prosencephalon` | Prosencephalon (forebrain) | telencephalon + diencephalon | 85 + 39 = **124** |
| `mesencephalon` | Mesencephalon (midbrain) | midbrain | **25** |
| `rhombencephalon` | Rhombencephalon (hindbrain) | pons + cerebellum + medulla | 35 + 5 + 33 = **73** |
| `vasculature` | Cerebral vasculature | vasculature (its own system, never folded into a division) | **14** |

The four divisions **partition** the seven regions — every registry entry belongs to exactly one division, and the
store asserts it at module load (a region added later cannot silently fall outside the control). The two actions:
the **checkbox** sets exactly its regions (all on when incomplete, all off when complete), the **Solo** button
leaves exactly its regions on and everything else off — measured values and the 7-state behaviour trace are in
`docs/SWARM_V10_PLAN.md` §8.3. Boot is unchanged: a fresh boot still reports the **`brainstem-focus`** preset with
the `vasculature` **region** off (the v8 rule) and the `vessel` **kind** on, so the four checkboxes boot
`[true, true, true, false]`. Nothing is persisted — a solo is a transient view filter, and there is no storage key
for it.

**Content-shaped limit.** This is a **display grouping over the taxonomy regions**, not an anatomical claim: the
grouping follows the reference figure's embryological three-vesicle scheme and the region field as committed. The
`vasculature` row is the vascular *system*, not a brain vesicle, which is why it is a peer row rather than a
member of a division.

### 13.3 The one suppressed canvas label — `ctx-cerebral-cortex`

| what | value |
| --- | --- |
| record | `ctx-cerebral-cortex` — **"Cerebral cortex (context envelope)"**, region `telencephalon`, subdivision *Cerebral cortex*, `kind:"context"`, colour `#94a3b8` (unchanged) |
| what is suppressed | **the canvas TEXT only** — both canvas label sites (selected + hover) and the `.section-structure-chip`, in the Plates canvas **and** in the simulated-section panel (it mounts the same component), and out of the canvas' accessibility subtree |
| what is kept | the record's **contour and fill** (`drawPart`), its tree/search/info-panel presence, its plate regions, and every other context label — **45 context records exist, 44 keep their canvas label** (thalamus envelope, level chips, division labels included) |
| proof | a real `react-dom` render in `npm run verify:cortical-lobes`: cortex selected ⇒ chip markup `""`; thalamus envelope selected ⇒ 102-char markup with `.section-structure-chip` present |
| **still carries the string** (recorded, not hidden) | the **info rail** and the **taxonomy tree** announce the record name; `PlateRenderer.tsx:106-108` injects an `<svg><title>` with `entry.name` onto the plate's `[data-structure="ctx-cerebral-cortex"]` group; and the three authored telencephalon plate SVGs draw their **own** hand-written labels — `plate-tel-axial-58.svg:53` *"Cerebral cortex / (cortical ribbon)"*, `plate-tel-coronal-fornix.svg:65` *"(envelope)"*, `plate-tel-sagittal-hemisphere.svg:58` *"Cerebral cortex (medial surface)"* |

The plate SVGs and `PlateRenderer` were outside every v10 task's write scope; this document records them as the
remaining surfaces rather than pretending the string is gone from the app.

### 13.4 The cortical-division content per plane (item 4's result, measured)

The division layer paints the **derived** cortical ribbon (`ctx-hemisphere-l/-r`); v10 changed the **run rule**,
not the classification (`CORTICAL_BOUNDARIES` was re-checked, not re-fitted). Floors, all documented in
`src/components/section/corticalLobes.ts`: **arc ≥ 10 au (12 mm)**, **drawn area ≥ 25 au²**,
**label area ≥ 25 au²**. Whole-ribbon vertex shares are unchanged from v9: frontal **44.30 %**, parietal **21.63 %**,
temporal **17.60 %**, occipital **9.27 %**, limbic **3.86 %**, insula **3.34 %**.

Runs per reference plane after the rule (the arcs and areas per division are tabulated in
`docs/SWARM_V10_PLAN.md` §8.5; `npm run verify:cortical-lobes` prints the same table):

| plane | loops | painted runs | raw spans | raw sub-threshold | dropped loops | division shares of the sampled cross-section |
| --- | --- | --- | --- | --- | --- | --- |
| y=0 | 3 | 3 | 8 | 5 | 1 | occipital 43.6 % · temporal 38.8 % · limbic 16.5 % · parietal 1.1 % |
| y=14 | 1 | 5 | 8 | 2 | 0 | temporal 53.2 % · occipital 17.5 % · insula 15.2 % · frontal 12.7 % · limbic 1.4 % |
| y=30 | 2 | 5 | 10 | 5 | 0 | temporal 43.6 % · parietal 25.8 % · occipital 14.0 % · frontal 13.3 % · insula 3.4 % |
| y=48 | 3 | 8 | 11 | 3 | 0 | parietal 38.2 % · frontal 32.1 % · temporal 16.4 % · occipital 7.2 % · limbic 6.1 % |
| y=58 | 2 | 5 | 7 | 2 | 0 | frontal 49.6 % · parietal 39.0 % · limbic 9.3 % · occipital 1.1 % · temporal 1.0 % |
| y=68 | 1 | 2 | 4 | 1 | 0 | frontal 55.1 % · parietal 44.8 % · occipital 0.1 % |
| y=78 | 4 | 2 | 4 | 2 | 2 | frontal 100.0 % |
| x=6 | 4 | 10 | 11 | 1 | 0 | frontal 60.7 % · parietal 27.6 % · occipital 10.5 % · limbic 1.2 % |
| z=0 | 2 | 5 | 7 | 2 | 0 | frontal 68.7 % · temporal 17.7 % · limbic 7.7 % · insula 6.0 % |
| z=40 | 1 | 2 | 2 | 0 | 0 | parietal 77.8 % · frontal 22.2 % |
| y=−46 / −24 / −8 | — | — | — | — | — | **miss the ribbon entirely** (ribbon y extent −6.8 … +113.7) |

Totals over the 13 reference planes: **13 → 10 planes carry a division**, **23 loops → 47 painted runs** (from 80
before the rule), **22 raw spans absorbed**, **3 whole loops dropped** (32 vertices, every one sub-threshold,
area ≤ 23.87 au²), and a sliver census that is **zero everywhere** — no painted run with `arc < 2 / < 5 / < 10 au`,
none with `area < 1 / < 10 au²`, none with a single own vertex. Over the 34-plane user grid: **548 → 265 runs**,
199 absorbed, 33 dropped loops, 174 labels, 0 painted division without a label-eligible run.

**Content-shaped limits (recorded).** The three reference planes y = −46/−24/−8 carry no division because the
ribbon does not reach them; the derived shell has **no insular surface**, so the insula paints the deepest
available limen tissue (2.11 % of sampled area, 3.34 % of vertices); absorption re-labels the absorbed stretch with
the **neighbour's** division along 10–25 au of contour; a whole loop that is a single sub-threshold stretch is
**unpainted** (3 of 13 reference planes, 33 of 49 user-grid planes); the committed gate samples **one** ribbon
while the canvas paints both; and **6 cases** over 218 planes × both ribbons were traced where an absorption
collapses a body that cleared both floors and a later pass hands it to a different division (the gate asserts
nothing about that class).

### 13.5 Verification performed in this task (all non-browser)

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0 — 0 errors, 0 warnings** · 236 registry entries (0 awaiting a record) · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (`✓ built in 10.88s`) |
| `npm run verify:pipeline` | **exit 0 — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems** |
| `npm run verify:plane` | **exit 0 — 10,827 assertions** |
| `npm run verify:plane-helper-extent` | **exit 0 — 196 passed / 0 failed** (new npm script, wired by this task) |
| `npm run verify:division-toggles` | **exit 0 — 250 passed / 0 failed** (new npm script, wired by this task) |
| `npm run verify:somatotopy` | **exit 0 — 45/45** |
| `npm run verify:cortical-lobes` | **exit 0 — 519/519 assertions** (was 200; prints §13.4's per-plane table and the zero-sliver census) |
| `npm run verify:pip-contract` | **exit 0 — 187 passed / 0 failed** (was 83; group F covers the four corners and their geometry, 6/6 mutations caught) |
| `npm run verify:audit-checks` | **exit 0 — 92 passed · 0 failed · 7 informational · 9 groups** — **green now**; the v9 note that this gate was red is superseded by the documented vascular exemption *plus* the assertion that pins it (see README's tier table) |
| `npm run verify:closure-bite` | **exit 0 — 7/7 mutations caught**, shared tree byte-identical, restored copy 92/0 |
| `npm run verify:boundary-contract` | **exit 0 — 22/22** |
| `npm run verify:a11y-contract` | **exit 0 — 38/38** |
| `npm run verify:budget-report` | **exit 0 — 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB**, all inside their caps |
| `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | **exit 0** — 9.02 MiB in 82 files (cap 10) · 22 cryosections −52.20 … 34.04 au |
| `npm run verify:anatomy` | **exit 1 — environment, not product**: `spawnSync powershell EPERM` before any verdict (the sandbox denies a child's piped stdio); red at base, no v10 task owns the file |
| `npm run verify:imaging-fit` | **exit 1 — environment, not product**: `FAIL the fitter could not be re-run: spawnSync node EPERM` (**0 assertions run**); red at base and unchanged by this run |
| browser lanes (`verify:audit` / `verify:acceptance` / `verify:browser`) | **not run and not claimed** — `verify:audit` prints its non-browser half here (`v10 source facts: CLIP_BOUNDS x[-58, 58] y[-55, 116] z[-76, 72] · declaration sites 1 · grid cell 4 au · division floors 10 au / 25 au2 (label 25 au2) · PiP clamp 224x170…880x640 px · suppressed canvas label ids [ctx-cerebral-cortex]`) and then exits **4** ("no check was run", Chrome dies in `mojo::PlatformChannel`). Every rendered-pixel claim of items 1–5 is therefore **orchestrator-verified only** |

## 14. v11 — the Areas + Systems toggle rows (a display grouping; **no content change**)

Spec: [`SWARM_V11_PLAN.md`](SWARM_V11_PLAN.md) (§7 is the run's closure). The run replaces the header's
view-preset row as the primary control with **two rows of on/off toggles** — big anatomical **Areas** and the
orthogonal **Systems** axis — that slice the existing content for the 3D view, the 2D live section and the PiP.

### 14.1 Measured delta — **no content record changed**

`npm run validate` (v11 integrator sweep, exit 0): **236 registry entries** (0 awaiting an authored record) ·
**17 files / 213 records** · **23 tracts** · **26 syndromes** · **15 plate records / 15 SVG** · **17 level
anchors** — *identical to the v10 close-out counts*, 0 errors / 0 warnings. No record, mesh, level, plate,
syndrome or citation was added, renamed, moved or re-scoped: v11 is **data slicing over what already exists**
(plan §4), which is exactly why the two rows could be built without touching `src/data/**` at all.

### 14.2 Content-shaped fact 1 — the Areas partition (every taxonomy entry lands in exactly one button)

`npm run verify:area-toggles` prints this table and asserts totality + disjointness over `ALL_REGIONS`
(7 regions, 236 entries). The rows are the **taxonomy** rows of each region, so this is the same content
accounting `npm run validate` performs, regrouped:

| header button (`data-area`) | taxonomy region(s) | registry entries | v10 division | a fresh boot |
| --- | --- | --- | --- | --- |
| Telencephalon | `telencephalon` | **85** | prosencephalon | on |
| Diencephalon | `diencephalon` | **39** | prosencephalon | on |
| Mesencephalon (midbrain) | `midbrain` | **25** | mesencephalon | on |
| Metencephalon (pons + cerebellum) | `pons` + `cerebellum` | **40** (registry rows: pons **35** + cerebellum **5** — §3.3's "(34)" is that table's own record count, not the number of registry rows) | rhombencephalon | on |
| Myelencephalon (medulla) | `medulla` | **33** | rhombencephalon | on |
| Cerebral vasculature | `vasculature` | **14** (the v8 arteries, still hidden by default) | vasculature | **off** |
| **Σ** | **7 regions, each owned exactly once** | **236** | — | 5 of 6 pressed |

The two hindbrain buttons together are the `rhombencephalon` division exactly, with the **medulla alone** in the
myelencephalon — asserted at module load in the shipped store (a mutation of the table makes the store exit 1
naming the defect), so a future region cannot be added to the taxonomy without landing in a button.

### 14.3 Content-shaped fact 2 — the Systems partition is the `kind` axis (`ALL_KINDS`)

| header button (`data-kind`) | registry entries | notes |
| --- | --- | --- |
| Nuclei | **88** | nucleus records |
| Tracts | **53** | includes the 23 `tracts.json` records |
| Ventricles | **11** | |
| Surface | **25** | **only 17 have a committed GLB and 0 have a section part** — the `surf-*` peripheral-nerve and lobe-surface records are content-only for the section, so switching Surface off changes the 3D view and nothing in the 2D canvas (measured, printed by `verify:view-filter-consistency`) |
| Vessels | **14** | the v8 arterial records |
| Context | **45** | context envelopes |
| **Σ** | **236** | total over `ALL_KINDS` by construction |

### 14.4 Content-shaped limits recorded by the run (all measurable, none hidden)

- **Four section parts have no 3D body of their own** — `ctx-caudate-l`, `ctx-caudate-r`,
  `ctx-choroid-plexus-l`, `ctx-choroid-plexus-r` (each sub-region's mesh is drawn by another record). The
  cross-surface join is therefore **137 of 138 parts**, and the row toggles still hide them on the section
  surface (measured).
- **One section part has no taxonomy entry at all** — `ctx-pineal`; it takes its region from the shipped
  override table in `sectionAssets.ts`, and its visibility decision is the same `isPartVisible` gate.
- **26 section parts carry `taxonomyKind: "vessel"` while their draw bucket is `nucleus`** — the Systems row
  reads `taxonomyKind`, so the bucket cannot leak an artery past the Vessels toggle (measured and printed).
- **The 3D surface also honours the structure-level `hidden` set** of the v7 presets (28 ids under
  *Brainstem focus*) which the 2D section does not. That is a *different* axis from areas/systems, measured and
  printed by the gate (lane C2), deliberately **not** unified with it in this run.
- **No content was regrouped at the taxonomy level**: the seven `Region` values, the six `Kind` values, the
  subdivisions and the v10 `DIVISIONS` are exactly as v10 shipped — the Areas row is derived from `DIVISIONS`,
  never a re-typing of it.

### 14.5 Verification performed in this task (all non-browser)

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0 — 0 errors, 0 warnings** · 236 registry entries · 17 files / 213 records · 23 tracts · 26 syndromes · 15 plates · 17 levels (inventory unchanged from v10) |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** (`✓ built in 9.40s`) |
| `npm run verify:pipeline` | **exit 0 — 138/138 parts · 599,204 triangles · 386 loops · 0 problems** |
| `npm run verify:area-toggles` | **exit 0 — 331 passed / 0 failed** (new npm script, wired by this task; prints §14.2/§14.3's tables) |
| `npm run verify:view-filter-consistency` | **exit 0 — 100/100** (new npm script; 138 parts · 213 records · 23 tracts · 10 slots · 2 ghost shells × 7 areas × 6 systems, 548 + 552 cross-surface comparisons, 0 disagreements) |
| `npm run verify:cortical-lobes` | **exit 0 — 564/564** (prints the two-ribbon `rule(l)` ∥ `rule(l+r)` table and reconciles the browser lane's 6 rows) |
| `npm run verify:plane-helper-extent` | **exit 0 — 206/0** (lane A2 settles the sagittal `u/v` convention: `AXIS_PAIR.x = [z, y]` → 148 × 171) |
| `npm run verify:division-toggles` / `verify:somatotopy` / `verify:pip-contract` | **exit 0 — 250/0 · 45/0 · 187/0** |
| `npm run verify:audit-checks` / `verify:closure-bite` | **exit 0 — 92/0 · 7/7 mutations caught** (the DEFAULT-framing mirror is byte-unchanged) |
| `npm run verify:boundary-contract` / `verify:a11y-contract` / `verify:budget-report` | **exit 0 — 22/0 · 38/0 · 599,204 tris / 13.82 MiB / 9.02 MiB** |
| `npm run verify:anatomy` / `verify:imaging-fit` | **exit 1 — environment, not product** (`spawnSync powershell EPERM` / `spawnSync node EPERM` before any verdict; 0 assertions run; unchanged from v10) |
| browser lanes (`verify:audit` / `verify:acceptance` / `verify:browser`) | **not run and not claimed** — `verify:audit` prints `v11 source facts: AREAS telencephalon→[telencephalon] · … · ALL_KINDS nucleus, tract, ventricle, surface, vessel, context · AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]} · AXIS_INDEX {"x":0,"y":1,"z":2}` and then exits **4**. Every claim about what a user **sees** (the rows rendering, a toggle repainting the scene or the section, keyboard/pointer use, and whether the v10 audit's 14 failures are gone) is **orchestrator-verified only** |



