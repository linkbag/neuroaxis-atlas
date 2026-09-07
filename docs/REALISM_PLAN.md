# Realism Upgrade Plan — NeuroAxis v2 (realistic 3D anatomy)

Goal: replace the v1 primitive look (ellipsoid "blobs", lathe envelopes) with **anatomically faithful, realistically rendered 3D models** of the brainstem, diencephalon and cerebellum — while preserving every v1 feature (selection, layers, clipping, explode, 2D↔3D plate sync) and the canonical coordinate system.

Companion research: `docs/REALISM_RESEARCH_NOTES.md`. This document is the authoritative spec for the v2 swarm run.

---

## 1. Strategy — three stacked realism layers

### Layer 1 — Real gross-anatomy surfaces (BodyParts3D 4.0, CC BY 4.0)
License verified directly at the source (2025-02-27 update): **CC Attribution 4.0 International** — free redistribution AND derivative works with the attribution string *"BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International."* Download: `partof_BP3D_4.0_obj_99.zip` (62 MB, PART-OF tree, 99% decimated) from `https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/`.

Meshes confirmed present in the parts list (FMA id → BP3D obj id):

| Structure | FMA | OBJ |
| --- | --- | --- |
| Midbrain | 61993 | BP5695 |
| Peduncle of midbrain | 62394 | BP6560 |
| Superior colliculus | 62403 | BP5690 |
| Inferior colliculus | 62404 | BP5691 |
| Pons | 67943 | BP6545 |
| Medulla oblongata | 62004 | BP5693 |
| Thalamus | 62007 | BP6495 |
| Hypothalamus | 62008 | BP6496 |
| Pineal body | 62033 | BP5525 |
| Cerebellum | 67944 | BP5696 |
| (optional) brachium of SC/IC, stria medullaris | 72417 / 71114 / 62080 | BP6568 / BP6571 / BP6564 |

The acquire task must ALSO grep the full `isa_parts_list_e.txt` / `partof_element_parts.txt` (already in `.bp3d-probe/`) for further fine parts (red nucleus, substantia nigra, olivary complex, mammillary body, pyramid, cerebral aqueduct, 4th ventricle) and use whatever exists. Internal nuclei are NOT expected — Layer 2 covers them.

**Fallback contract**: if the 62 MB download is infeasible after honest retries, `assets-src/bp3d/PROBE.md` declares `mode: sculpt-only` and every downstream recipe runs its pure-SDF sculpt path. The upgrade still ships — procedurally sculpted, no real-scan base.

### Layer 2 — Organic geometry kernel (SDF sculpt + resample)
A deterministic Node pipeline (`scripts/`, no browser APIs) that:
1. **Parses** BP3D OBJs → voxelizes to signed-distance fields in canonical space.
2. **Registers** BP3D mm/Z-up coordinates into our canonical space (see §3).
3. **Sculpts**: smooth-min union/subtract/intersect with anatomical primitives; carves CSF spaces (interpeduncular fossa, 4th ventricle, aqueduct); reinforces surface landmarks (ventral pyramid ridges, olivary eminences, gracile/cuneate tubercles, pontine bulge + MCP flare, colliculi bumps, pineal, mammillary bodies, thalamic pulvinar overhang, cerebellar folia via ridged fbm displacement along folial axes).
4. **Organic displacement**: low-amplitude simplex/fbm noise displacement + smooth normals — the difference between "plastic primitive" and "tissue".
5. **Meshes** via SurfaceNets (or dual contouring) with analytic-ish normals; writes minimal **GLB** (positions/normals/indices; no materials — runtime owns materials).
6. **Organic nuclei**: per-nucleus generated meshes from the existing `structures/*.json` `origin3d/size3d`, shaped per type (see §6), and **clipped inside envelopes** with a containment check (violations auto-nudged, report in stats).

Everything is generated at build time into **committed** assets: `src/assets/anatomy/<slug>.glb` + `src/assets/anatomy/anatomy-manifest.json`. Raw downloads stay in gitignored `assets-src/`.

### Layer 3 — Physically-based rendering + post FX
- **Lighting**: PMREM environment from three's bundled `RoomEnvironment` (no network/CDN), ACESFilmic tone mapping (exposure ≈ 1.1), soft key + fill directionals with shadow maps only for ground contact (cheap).
- **Materials module** (`src/geometry/materials.ts`): central factory so clipping planes apply everywhere. MeshPhysicalMaterial presets — gray-matter envelope (translucent, sheen 0.35 pinkish, roughness 0.62, clearcoat 0.04), white-matter tract (off-white, tangent striation via procedural normal map), nucleus (matte, tinted per structure color: SN dark melanin, red nucleus rubrous, locus coeruleus bluish), CSF (cyan, fresnel-weighted opacity, depthWrite false), context (neutral gray translucent).
- **Procedural textures**: seeded canvas-generated noise normal maps (tissue micro-detail, folia striation, fiber striation) — deterministic, zero downloads.
- **Postprocessing**: `@react-three/postprocessing@2.16.3` (peers verified compatible: react≥18, three≥0.138, fiber≥8): **SSAO** (subtle, radius ~6au), **N8AO** optional if quality insufficient (peers postprocessing≥6.30, three≥0.137 — compatible), gentle **Bloom** on selection emissive + tracts, **SMAA**. Quality toggle High/Balanced (persisted); Balanced disables AO/bloom, dpr cap 1.5.
- **Tracts**: keep authored waypoint curves; add taper, tangent-striation normal map, gradient along length, softer emissive, selected-pulse retained.

## 2. Non-negotiable compatibility constraints
1. Canonical space & level table unchanged (2D↔3D sync keeps working).
2. Selection raycast per structure id unchanged (GLB per slug maps 1:1).
3. Clipping planes (sagittal/coronal/transverse + snap-to-plate) apply to ALL new materials.
4. Explode offsets computed from manifest centroids (nuclei fan out; tracts stay).
5. Layers/filters UI unchanged; quality toggle added to Header.
6. Loader falls back to v1 primitives for any slug lacking a GLB (app never blank).
7. Perf budget (AMENDMENT A revision): total rendered tris ≤ 700k; committed anatomy GLB payload ≤ **8 MB total** with per-part caps — envelope/context part ≤ 1.5 MB, CSF part ≤ 0.8 MB, nucleus ≤ 60 KB (nuclei total ≤ 2.5 MB); first paint < 2.5 s on mid-tier GPU; dpr ≤ 2. (Rationale: real-scan envelope fidelity at 0.3 au meshing outweighs the original 2.5 MB cap; HTTP gzip typically halves transfer.)

## 3. Registration: BP3D → canonical space

> **AMENDMENT A (orchestrator, post-registration-review) — scale correction + bounds extension.**
> The first registration run used s = 1/0.7 au/mm uniformly, which overflows the schematic
> v1 bounds in x/z (cerebellum z −90.9 au, hypothalamus z +40.1 au) — v1's bounds were
> schematic, not metric. Corrected contract, binding for ALL downstream tasks:
> - **Uniform x/z scale: s = 1/1.2 au/mm** (1 au ≈ 1.2 mm). y stays anchor-warped to levels.json (unchanged).
> - **Extended canonical bounds** (data/UI change, not axis semantics): core brainstem/diencephalon x ∈ [−27, 27], z ∈ [−56, +26]; cerebellum context layer may extend x ∈ [−48, 48], z ≥ −56.
> - **ClipControls slider ranges** (integration-v2 owns): sagittal x slider [−48, +48]; transverse z slider [−56, +26]; coronal y unchanged [−55, +45]. Default framing camera distance ×1.15. These are the ONLY UI range changes allowed.
> - **Corrected landmark targets** (review-qa must use these, not the first-run table): pineal tip [0, 20, −11] (apex ≈13 mm posterior of tectal plane); SC apex [0, 14, −11]; IC apex [0, 8, −12] (slightly more posterior/inferior than SC); mammillary [0, 28, +10]; inferior olive [±4.3, −34, +4]; pyramid ventral face [±4.3, −37, +7.5]; cerebellar centroid [0, −16, −30]. Tolerance ±3 au on y; ±5 au on x/z (real-vs-schematic residual).
> - Canonical OBJs are RE-BAKED by the orchestrator with s = 1/1.2 + thalamus/geniculate inputs (see `assets-src/bp3d/SCALE_MEMO.md`). Recipes must read extents from the canonical files at bake time, never hardcode first-run bboxes.
> - The first-run REGISTRATION.md §7 flags are superseded by this table; §2 axis remap, §3 junction detection, §4 warp knots (inputs re-scaled), §5 straightening method all remain valid and were verified.

BP3D is millimeter, Z-up, whole-body origin (per human-atlas attribution notes). Steps (implemented in `scripts/lib/register.mjs`, cached to `assets-src/bp3d/canonical/*.obj`):
1. **Axis remap** mm→au (1 au ≈ 0.7 mm): BP3D (X, Y, Z_up) → canonical (x=+left, y=+superior, z=+anterior) via fixed permutation + sign; verify against known asymmetries (optic chiasm ventral-rostral, cerebellum dorsal).
2. **Global scale** from brainstem span: fit BP3D brainstem extent to our y∈[−50, +20] with uniform scale, then **piecewise-linear y-warp** so anatomical junctions land on level-table anchors (cervicomedullary −50, pontomedullary −24, pontomesencephalic +4, midbrain–diencephalon +20).
3. **Centerline straightening**: extract per-slice (y) centroids of the brainstem stack; rigidly recenter x/z per slice (bounded smoothing) so the BP3D brainstem's natural curvature becomes our near-vertical axis with the gentle ventral midbrain bow.
4. **Thalamus pair split**: BP3D thalamus is one mesh → split at x=0 into L/R ovoids (largest connected components per side), nudged to our thalamic band y∈[22,38].
5. **Landmark residuals report**: REGISTRATION.md records per-part landmarks (pineal tip, colliculi apex, mammillary, olive, pyramid) with canonical-space targets vs achieved positions (tolerance ±3 au; adjust warp anchors where exceeded).

## 4. Build-time pipeline & repo layout

```
scripts/
  lib/sdf/            # kernel (plain .mjs, Node-only)
    vec.js sdf.js noise.js surfacenets.js objio.js glb.js voxelize.js stats.js
  lib/register.mjs    # BP3D → canonical (§3)
  anatomy-recipes/    # one recipe per envelope part (imports kernel + register)
    medulla.mjs pons.mjs cerebellum.mjs midbrain.mjs diencephalon-thalamus.mjs
    diencephalon-hypothalamus.mjs epithalamus.mjs csf.mjs nuclei.mjs
  build-anatomy-geometry.mjs   # CLI: --all | --part <slug> | --selftest | --stats
assets-src/bp3d/      # gitignored: zip, extracted OBJs, canonical cache, PROBE.md
src/assets/anatomy/   # COMMITTED output: <slug>.glb + anatomy-manifest.json
src/geometry/
  anatomyAssets.ts    # runtime loader (manifest + GLB ?url glob + GLTFLoader + cache + fallback)
  materials.ts        # material factory (clipping-aware)
  generated.ts        # types for manifest
src/components/viewer3d/  # render-pipeline + post-fx + tracts-upgrade edits
```

**anatomy-manifest.json schema** (source of truth for runtime + QA):
```json
{ "version": 2, "generatedBy": "scripts/build-anatomy-geometry.mjs",
  "parts": [ { "slug": "ctx-medulla-surface", "file": "ctx-medulla-surface.glb",
      "kind": "context", "source": "bp3d+sculpt" | "sculpt",
      "materialHint": "gray-matter|white-matter|csf|nucleus|context",
      "triCount": 41230, "centroid": [0,-37,2], "bbox": { "min": [-8,-50,-7], "max": [8,-24,8] } } ] }
```

Envelope slugs (v1 context records reused): `ctx-medulla-surface, ctx-pons-surface, ctx-midbrain-surface, ctx-thalamus-l/r, ctx-hypothalamus-surface, ctx-pineal, ctx-cerebellum-l/r (+ctx-cerebellar-vermis), vent-fourth-ventricle, vent-cerebral-aqueduct, vent-third-ventricle` — plus every `kind:"nucleus"` structure slug from `taxonomy.json`.

## 5. Envelope fidelity checklist (acceptance criteria)
Silhouette features that must be recognizable after the upgrade (review-qa checks against textbook conventions — Blumenfeld Fig. 5.x/brainstem surface plates, RSNA 2019):
- **Medulla**: ventral pyramids (paired ridges flanking anterior median fissure), pyramidal decussation taper, olivary eminences, gracile/cuneate tubercles dorsal, open/closed medulla transition at lvl-olivary.
- **Pons**: anterior bulge (basis) with transverse fiber ridges, MCP flaring laterally into cerebellum, pontomedullary sulcus.
- **Midbrain**: cerebral peduncles (two distinct crura), interpeduncular fossa between them, corpora quadrigemina (inferior colliculi slightly larger/lower than superior), pineal between rostral colliculi, trochlear decussation dorsal groove.
- **Diencephalon**: paired thalamic ovoids with anterior tubercle + pulvinar posterior overhang, mammillary bodies, tuber/infundibulum, optic chiasm ridge, pineal+habenular trigone, third ventricle slit.
- **Cerebellum**: two hemispheres + vermis, horizontal fissure hint, folia striation (procedural ridges), peduncle stumps (ICP/MCP/SCP) meeting brainstem.
- **CSF**: 4th ventricle tent with rhomboid fossa, aqueduct tube, 3rd ventricle slit — cyan translucent.

## 6. Nuclei organic shaping rules
From `structures/*.json` (`origin3d`, `size3d`, `kind`, region): generate noise-displaced organic meshes with per-type overrides:
- Inferior olivary complex: corrugated sheet folded into a purse (sine ridges along mediolateral axis, amputated hilum facing medially).
- Substantia nigra: crescent band hugging crus cerebri (sweep arc, compacta dorsally darker).
- Red nucleus: ovoid with slight medial depression.
- Thalamic nuclei: partition cells — Voronoi-like cells inside the thalamic envelope (SDF intersect), each nucleus = its cell ∩ thalamus SDF, guaranteeing anatomically-plausible packing (no floating ellipsoids).
- Cranial-nerve columns (solitarius, ambiguus, hypoglossal, dorsal motor X): elongated sulcus-hugging tubes.
- Locus coeruleus: thin blue-gray band at 4th-ventricle floor.
- Default: displaced ellipsoid (fbm amplitude ≈ 12% of mean radius), 3–6k tris each.
Containment QA: ≥98% of each nucleus's vertices inside (nearest envelope SDF ≤ +0.8 au margin); violations auto-nudged toward local envelope centroid and reported.

## 7. Swarm DAG (11 tasks)

| # | Task | Role | Deps | Owns (writes) |
| --- | --- | --- | --- | --- |
| 1 | `sdf-kernel` | architect | — | scripts/lib/sdf/*, build-anatomy-geometry.mjs (CLI + selftest), docs/GEOMETRY_PIPELINE.md |
| 2 | `render-pipeline` | builder | — | src/geometry/materials.ts, viewer3d/{Viewer3D,SceneLayers,NucleusMesh}.tsx updates, environment/tonemapping/lights |
| 3 | `bp3d-acquire` | architect | — | assets-src/bp3d/** (zip, OBJs, parts-report.json, PROBE.md), docs/ATTRIBUTION.md edit |
| 4 | `bp3d-register` | architect | 3 | scripts/lib/register.mjs, assets-src/bp3d/canonical/*, assets-src/bp3d/REGISTRATION.md |
| 5 | `envelopes-hindbrain` | builder | 1, 4 | anatomy-recipes/{medulla,pons,cerebellum,csf-hindbrain}.mjs, baked ctx-*/vent-* GLBs (their slugs) |
| 6 | `envelopes-rostral` | builder | 1, 4 | anatomy-recipes/{midbrain,thalamus,hypothalamus,epithalamus,csf-rostral}.mjs + their GLBs |
| 7 | `nuclei-organic` | builder | 1, 5, 6 | anatomy-recipes/nuclei.mjs + all nucleus GLBs + containment report |
| 8 | `post-fx` | builder | 2 | package.json (deps), viewer3d/PostFX.tsx + Viewer3D integration, quality toggle store+Header UI |
| 9 | `tracts-upgrade` | builder | 2 | viewer3d/TractTube.tsx + tract material/texture code |
| 10 | `integration-v2` | integrator | 5–9 | src/geometry/anatomyAssets.ts + generated.ts, SceneLayers GLB wiring + fallback, manifest finalization, README/ATTRIBUTION, gates + dev smoke + budget report, git commit |
| 11 | `review-qa-v2` | reviewer | 10 | spot-fixes; §5 checklist verification, containment re-run, perf budget check, gates, verdict |

Evidence contracts use EXACT paths above; every task additionally keeps `npm run check` green (kernel tasks: also `node scripts/build-anatomy-geometry.mjs --selftest`). Downloads/validation scripts must print human-readable reports.

## 8. Risks & mitigations
| Risk | Mitigation |
| --- | --- |
| 62 MB download slow/blocked | PROBE.md fallback mode: sculpt-only path fully specified; app never regresses |
| BP3D Z-up axis guess wrong | Registration report verifies against 5+ known landmarks; centerline straightening is data-driven |
| GLB writer bugs | Minimal spec (one mesh, POS+NORMAL, uint32 indices); `--selftest` round-trips via three GLTFLoader in a Node-import harness (three runs in Node for parsing) comparing counts |
| SurfaceNets performance in Node | 0.35 au grid, per-part bounding boxes, typed arrays; budget < 90 s per part; --part flag allows incremental bakes |
| Realistic materials tank fps | Quality toggle; dpr caps; transmission avoided (fresnel-faked translucency); AO half-res |
| Selection/clip regressions | materials.ts single factory receives clippingPlanes; integration runs the v1 feature checklist end-to-end |
| Bundle bloat | committed GLBs ≤ 2.5 MB total; vite reports; review-qa enforces |

## 9. Definition of done (v2)
All v1 gates green (validate/check/build) + dev server 200; §5 silhouette checklist verified by reviewer; anatomy-manifest.json with ≥ 12 envelope parts + all nucleus slugs; containment ≥ 98%; total tris ≤ 700k; quality toggle works; ATTRIBUTION.md carries the exact CC BY 4.0 attribution; README updated with a "Realistic rendering" section.
