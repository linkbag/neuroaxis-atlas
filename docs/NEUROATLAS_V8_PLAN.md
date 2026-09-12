# NeuroAtlas Plan — NeuroAxis v8 (functional telencephalon, subcortical depth, vascular system)

Goal: raise the telencephalon to the **same granularity as the brainstem/midbrain** — every key nucleus, cortical functional area, ventricular segment and major artery present, named, selectable and clinically annotated — and add the **cerebral vasculature** (circle of Willis + major cerebral arteries) as its own layer.

**Headline research result: ~80% of the new geometry is already inside the archive we own** (BodyParts3D 4.0, CC BY 4.0, `assets-src/bp3d/isa_BP3D_4.0_obj_99.zip`), including the **complete circle of Willis** and the **full retino-geniculate pathway**. The rest (functional areas, hippocampal subfields, fiber tracts) is authored content per the established v7 pattern.

Companion findings: `docs/IMAGING_SOURCES_V4.md` (licences) · `docs/TELENCEPHALON_PLAN.md` (AMENDMENT B space contract) · `docs/AUDIT_REPORT.md` (quality bar).

---

## 1. Data — verified availability (BP3D 4.0, archive we own)

### 1a. The cerebral vasculature (NEW modality: `vessel` kind, `vasc-` prefix)
Verified present with per-artery meshes (99 % decimated, perfect for thin translucent tubes):

| Artery | FMA | role in the atlas |
| --- | --- | --- |
| internal carotid artery (L/R) | 3947/3949/4062 | feeding trunk |
| vertebral artery (L/R) | 3956/3958/3966 | feeding trunk |
| basilar artery | 50542 (BP6340) | posterior circulation trunk |
| anterior cerebral artery (L/R) | 50028/50029/50030 | ACA territory |
| anterior communicating artery | 50169 (BP6365) | the Willis cross-link |
| middle cerebral artery (L/R, sphenoid/insular parts) | 50080/50081/50365-50370 | MCA territory |
| posterior communicating artery (L/R) | 50084/50085/50086 | the Willis cross-link |
| posterior cerebral artery | (present; PCA) | PCA territory |
| superior cerebellar artery | 50573+ (BP9290/9291) | SCA |
| anterior inferior cerebellar artery | 50544 (BP8560+) | AICA |
| posterior inferior cerebellar artery | 50518 (BP7797) | PICA |
| lenticulostriate / choroidal branches | several | deep perforators |

The syndrome cards already cite ACA/MCA/PCA/SCA/AICA/PICA/basilar territories — the arteries make those associations **visible** (select a syndrome → its arteries light up).

### 1b. The visual pathway (complete)
optic nerve L/R (BP5707/5708/5709), optic chiasm (BP5710), optic tract L/R (BP5706/10451/10467), LGN L/R (BP10429/10443), MGN, optic radiation (authored in v4 with waypoints).

### 1c. Ventricles & CSF
lateral ventricle L/R (FJ1767/1814), fourth ventricle, cerebral aqueduct (all baked in v7); third ventricle (baked). Remaining: segment the lateral-ventricle cast into **frontal horn / body / atrium / occipital horn / temporal horn** at bake time (geometric subdivision by position — no new data), plus interventricular foramen (authored context).

### 1d. Basal ganglia & striatum depth
caudate/putamen/globus pallidus L/R already baked. Remaining: **GPi/GPe split** (geometric split of the pallidum by an internal lamina), **caudate head/body/tail** (positional segmentation of the cast), **nucleus accumbens / ventral striatum** and **claustrum** as authored record-only structures at documented planes (BP3D has no meshes).

### 1e. Functional cortices (records anchored to existing gyri meshes)
V1 (calcarine/cuneus/lingual territory), V2, A1 (transverse temporal/Heschl), A2/planum temporale, Broca (opercular/triangular inferior frontal), Wernicke (posterior superior temporal), entorhinal (anterior parahippocampal), premotor/S1/M1 (precentral/postcentral). BP3D has **no dedicated functional-area meshes** — each area becomes a **record anchored to its host gyrus mesh + level + plate anchors** (rendered by making the host gyrus selectable/highlightable, exactly like the context-layer identity pattern from v6).

### 1f. Hippocampal subfields (records only)
subiculum, CA1–CA4, dentate gyrus as **authored record-only structures** positioned along the hippocampal body (plane-anchored, no meshes; the hippocampus mesh stays the pickable volume). The granular reality of these subfields makes record-level granularity the honest choice.

---

## 2. Platform changes (small but cross-cutting)

1. **`Region` gains `'vasculature'`** — `types.ts`, `load.ts` (`ALL_REGIONS`, `REGION_LABELS`: "Cerebral vasculature"), validator `REGIONS`, tree grouping, legend, filters. The circle of Willis spans every existing region, so it needs its own region row rather than being filed under one.
2. **Levels**: no change required (the vascular and cortical structures live inside the existing AMENDMENT B box; the level ruler already reaches +78).
3. **`vessel` kind rendering** (`imageLayers`/`SceneLayers`/materials): arteries render as **translucent red tubes/meshes** (`materialHint: 'vasculature'`), hidden by default in the Brainstem-focus preset, visible in Whole-brain and a new **Vasculature** preset. Selecting an artery shows its territory + the syndromes it names.
4. **Mesh-less records stay first-class**: the v6 identity work proved record-only slugs are selectable everywhere; each new mesh-less record carries `planes/levels/gyri anchor` metadata so search/tree/plates still find it.

## 3. Content to author (~65 records + arteries)

- **Cortical functional areas (12)**: V1 (primary visual, calcarine), V2, A1 (Heschl), A2/planum temporale, Wernicke, Broca, M1, S1, premotor, SMA, entorhinal, frontal eye fields — each anchored to its host gyrus mesh with its function/clinical (e.g. V1 lesion → cortical blindness; A1 → cortical deafness; Broca vs Wernicke aphasias).
- **Basal ganglia depth (6)**: GPi, GPe, nucleus accumbens, ventral pallidum, claustrum, subthalamic nucleus *connections refresh* (STN record exists).
- **Hippocampal formation (5)**: subiculum, CA1, CA2/CA3, CA4, dentate gyrus (+ perforant path note).
- **Optic pathway (4)**: optic nerve, chiasm, tract, radiation (the last authored with waypoints) + LGN/MGN already present.
- **Ventricular segments (5)**: lateral ventricle frontal horn/body/atrium/occipital horn/temporal horn + interventricular foramen.
- **Vasculature (14–18)**: the Willis ring + major trunks in §1a, each with its territory, clinical syndrome mapping (ACA/MCA/PCA/SCA/AICA/PICA/Percheron), and the exact `vessel` meshes.
- **Fiber tracts to add (2–4)**: mammillotegmental tract, stria terminalis (BP6563 exists!), stria medullaris refresh.
- Every record carries: `function`, `connections`, `bloodSupply`, `clinical`, `levels`, `refs`, curated `webRefs.ts` entry, and (where the data exists) an anchored mesh.

## 4. Geometry pipeline

1. **Extract** the new FJ meshes (arteries, optic pathway, hippocampus details) into `assets-src/bp3d/raw-vasc/` from the owned ISA archive.
2. **Register** them in `scripts/lib/register.mjs` (same dual-source resolver, same affine; nothing moves).
3. **Bake** with tight tri caps (arteries ≤2k each — they are thin tubes; optic pathway ≤3k each) so the vascular layer stays cheap (~30–60k tris for the whole Willis + pathway).
4. **GPi/GPe + caudate segmentation**: split the baked pallidum/caudate casts by a documented lamina plane at bake time (two-output recipes).
5. **Lateral-ventricle horns**: split the ventricular cast by y/z planes into horn segments (positions documented from the ventricular anatomy; residuals reported).

## 5. Rendering & UX

- **Vasculature layer**: new layer/preset (hidden in Brainstem focus, visible in Whole brain/Vasculature), artery color family (crimson) with `vasculature` label; selecting an artery highlights its **territory structures** (the syndromes already map arteries → structures).
- **Cortical-area emphasis**: selecting V1/A1/Broca highlights the host gyrus and shows the area's record (the record is the functional area; the gyrus mesh is its representation — the v6 identity pattern).
- **Mesh-less structures** render a small pinned marker at their anchored plane so they are discoverable without geometry.
- **Records**: mesh-less is explicitly flagged ("authored structure — schematic placement") to stay honest.

## 6. Swarm DAG (7 tasks)

| # | Task | Role | Deps | Owns |
| --- | --- | --- | --- | --- |
| 1 | `vasc-acquire` | architect | — | extract artery + optic + remaining meshes into `assets-src/bp3d/raw-vasc/`, `VASC_INVENTORY.md`, ids table |
| 2 | `vasc-register-bake` | architect | 1 | `register.mjs` inputs, baked artery/optic GLBs + manifest parts |
| 3 | `tel-deep-geometry` | builder | 1 | GPi/GPe split, caudate head/body/tail, ventricle horns, accumbens/claustrum SDF volumes |
| 4 | `content-authoring` | builder | 2, 3 | taxonomy additions (vasculature region + ~65 ids), ~65 authored records, `webRefs.ts`, inventory doc section |
| 5 | `vasc-render` | builder | 2, 4 | vessel material + layer/preset, territory-highlight wiring, mesh-less pinned markers |
| 6 | `integration-v8` | integrator | 3, 4, 5 | wiring, budgets, README, gates incl. extended audit, commit |
| 7 | `review-qa-v8` | reviewer | 6 | independent verification (licence audit, territory correctness, budgets, regression, verdict) |

Non-browser gates are the evidence (`validate/check/build/verify:pipeline/verify:plane/verify:anatomy/verify:acceptance`); the orchestrator runs the browser lane + `verify:audit` itself afterwards (agents cannot launch Chrome in their sandbox — documented).

## 7. Budgets
Rendered tris ≤ 800k total (arteries ~40–60k, deep structures ~30k); anatomy GLB ≤ 18 MB; imaging unchanged. Committed only processed outputs; raw stays gitignored.

## 8. Acceptance
- Vasculature layer: every named Willis/major artery visible, selectable, territory-highlighted, credited.
- Functional cortices (V1/A1/entorhinal/Broca/Wernicke/…) selectable with full records; host gyri highlight.
- Hippocampal subfields and striatal depth present as records with honest schematic placement.
- All previous features regression-free; gates green; budgets held; README/ATTRIBUTION updated.

## 9. Closure — what shipped, how it was verified, what is left

**How v8 was executed.** The swarm run stopped with `vasc-acquire` and `vasc-register-bake` complete,
`content-authoring` failed on its own evidence contract (its records and docs landed anyway), and
`vasc-region-platform` / `vasc-render` / `tel-deep-geometry` / `integration-v8` never dispatched. The
remaining work was done **directly by the orchestrator, with no swarm in the loop** — which is also why this
section exists: DAG rows 3–6 of §6 are the work recorded here.

### 9.1 Shipped

| Plan section | State | Evidence |
| --- | --- | --- |
| §1a/§1b acquisition (§6 row 1) | **done by the run** — 122 OBJ elements extracted, inventory + per-mesh FMA/element table | `docs/VASC_INVENTORY.md`, `assets-src/bp3d/raw-vasc/vasc-inventory.json` |
| §4 registration + bake (§6 row 2) | **done by the run** — 32 canonical OBJs registered (13/13 axis checks), 32 parts baked, the 53 pre-existing canonical OBJs byte-identical | `.dsh-swarm/task-vasc-register-bake.json`; manifest now 138 parts |
| §2 platform: the `vasculature` region | **done** — `types.ts` / `load.ts` (`ALL_REGIONS`, `REGION_LABELS` "Cerebral vasculature") / `validate-data.mjs`; the 14 staged records moved into `src/data/structures/`; 14 registry rows appended **from the records themselves** | `npm run validate` → **0 errors, 0 warnings** (220 entries) |
| §2 rendering: vessel material, layer, preset | **done** — `createVesselMaterial` + the `'vasculature'` hint + `hintForKind('vessel')`; `also`/`bodyRight`/`alsoRight` and `anatomySlugsForRecord` in the record→mesh table; per-side body drawing in `SceneLayers` (arteries are not mirror images); a `Vasculature` preset; the region hidden at default framing and asserted **both ways** at module load | `verify:audit` v8 block (12 checks) |
| §2 territory highlight / mesh-less markers | **done** — `territory`/`supply`/`meshes` are typed fields now; `load.ts` builds the reverse vessel→syndrome index; `highlightIdSet` lights a selected artery's territory and an opened syndrome's arteries; `InfoPanel` renders the territory as selectable chips; mesh-less records keep a sized schematic placement and say so | audit: territory + syndrome checks; `.dsh-scratch/v8/vessel-semantics.mjs` (all 14 vessels' territory/supply ids resolve; 23 of 26 syndrome cards reachable through a `supply` link) |
| §3 content (§6 row 4) | **done by the run** — 43 ids registered, 43 records authored/enriched (12 cortical areas, 4 hippocampal subfields, 3 optic-pathway, ventricular segments, striatal depth, 14 vessels), curated `webRefs.ts` | `docs/CONTENT_INVENTORY.md` §11 and §11.13 |
| §6 row 6 integration + QA | **done** — README v8 section, this closure, browser lanes re-run by the orchestrator | gate table in §9.3 |

### 9.2 Not shipped (and why)

**§4's per-segment geometry (the plan's `tel-deep-geometry` row) did not run.** GPi/GPe, the caudate's
head/body/tail and the lateral ventricle's horns/atrium/body are **records over one shared mesh**: selectable,
annotated, tree-visible and painted by the live section under the parent body — but selecting GPe highlights
the pallidum, not a separate outer segment. This is a geometry task, not a content task: each segment needs an
SDF/CSG split of a committed solid (a *shell* for GPe around GPi, a *plane-clipped* caudate, *horn-clipped*
ventricle casts), and each result has to stay watertight, inside its per-part triangle cap and inside the
parent's bounding box — the last of which `verify:anatomy` asserts for exactly those bodies. It is left as the
next step rather than attempted at the end of a long session; the records it will point at are already in
place, and the limitation is stated in the README (*Honest limits (v8)*) and CONTENT_INVENTORY §11.13.3.

Also unchanged by v8: **no vascular imaging** is layered into the section view (the committed modalities are
tissue — MRI, CT, cryosections; no MRA/CTA dataset is committed), and the artery meshes are the BodyParts3D
elements, not a subject-specific angiogram.

### 9.3 Gate evidence (orchestrator, after the wiring)

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0 — 0 errors, 0 warnings** (220 registry entries, 0 awaiting a record; 16 structure files / 197 records; 23 tracts; 26 syndromes; 15 plates) |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** |
| `npm run verify:pipeline` | **exit 0 — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems** |
| `npm run verify:plane` | **exit 0 — 10,827 assertions** |
| `npm run verify:anatomy` | **exit 0 — 27 passed · 0 failed** (brainstem envelope bboxes unchanged, MRI/CT legacy-level content `max |Δ| 0 of 255`, every baked part inside `CLIP_BOUNDS`; 599,204 ≤ 800k tris · GLB 13.89 MB ≤ 14 MB · imaging 8.71 MB ≤ 10 MB) |
| `npm run verify:acceptance` | **exit 0 — 9/9** |
| `npm run verify:audit` | **exit 0 — 68 passed · 0 failed · 16 informational** (66 + the 2 checks a missing-semicolon parse had silently skipped — §9.4) |

### 9.4 Two defects the closure work found and fixed

1. **The live section would have painted the MCA's M2 and the PCA's P2 segments with the vascular layer
   off.** The section worker's slug→(group, region) table is derived from the record→mesh links, and it took
   only `link.body` (plus its `-l`→`-r` twin). The two new per-side segment lists (`also`/`alsoRight`) were
   therefore missing from it, and a slug missing from that table resolves to `region: null` — which the canvas
   reads as "no region filter applies to me". Fixed by deriving from `anatomySlugsForRecord`, the same helper
   `SceneLayers` uses, so the 3D pass and the section pass cannot disagree about which record a mesh is.
2. **Two of the new audit checks never ran.** They were written as bare `(expr) >= n ? ok : bad` statements;
   with no semicolons in that file, a statement starting with `(` is folded into the previous ternary's
   alternate branch — which that ternary never evaluated. No check reported a false pass; they reported
   *nothing*, which is the failure mode worth naming. The audit's count went 66 → **68** after the fix; both
   conditions are now bound to `const`s and the hazard is flagged in the source.

