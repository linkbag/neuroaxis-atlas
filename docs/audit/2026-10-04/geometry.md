# Geometry and anatomical relationships audit — 2026-10-04

All structure record coordinates/dimensions/levels, all current tract/cranial nerve/vessel courses, every committed manifest GLB, and record-to-mesh semantics. This is a comprehensive field inspection and relational model audit, not a scientific validation of all 3D shapes.

Coverage: **264 structure records**, **234 origins and 234 dimensions**, **23 tract courses**, **12 cranial nerve courses**, **43 declared vessel courses**, and **138 committed GLBs**. Built-in/authored overlapping vessel IDs are inspected separately; declared counts include overlapping built-in/authored IDs and are not unique-artery counts.

## What was checked

- Every stored origin/size/level field: finite values, clip-frame bounds, positive dimensions, laterality metadata, mesh lookup and available surrounding relationships.
- Every tract/nerve/vessel waypoint chain: finite values, bounds, duplicated controls, artificial closure, sign changes and source/target interpretation.
- Every manifest GLB: binary parse, POSITION data, finite vertices, triangle count, actual bounds against manifest, file existence and transforms.
- Record-to-mesh specificity: whole-structure mesh reuse versus purported substructure and material/laterality conventions.
- Gross regional ordering in thalamus, midbrain, medulla, pons, cerebellum and ventricular system; the JSON lists each comparison and sources.

**Limit:** All exact spatial fidelity, segmentation boundaries, curve positions, dimensions and anatomical shape are **unvalidated**. Numerical consistency does not establish anatomical correctness. MRI-to-model registration has not been demonstrated. The declared display frame (+x patient left, +y superior, +z anterior; 1 au=1.2 mm) is not a verified MNI/Talairach/AC-PC transformation.

## Internal integrity results

All 138 GLBs parsed, their vertex values were finite, actual bounds agreed with manifest to 0.01 au, and triangle counts agreed. All stored origins and course points were inside declared clip bounds; dimensions were positive. These checks concern model integrity only. Checked gross ordering agrees in the sampled relational comparisons; a motor-V ventral-order suspicion was withdrawn after visual review because the reliable relation is medial, not a universal centroid z order.

## Findings and concrete rendering advice

### GEO-001: scientific display limit

**Status:** open unvalidated.

138 committed GLBs and authored ellipsoid/curve placeholders use a canonical display frame. Mesh presence, numerical agreement, BP3D source labels and manual sculpting do not validate anatomy, exact shape or coordinate registration. MRI registration is not established.

**Action:** Keep model/sections explicitly schematic and avoid claims of MNI/Talairach coordinates, stereotaxic accuracy or patient localization. Independent expert validation/segmentation and matched MRI registration are required for precise geometry.

Location: `src/assets/anatomy/anatomy-manifest.json`. Records: `ALL`.

### GEO-002: semantic mesh mismatch

**Status:** advisory to root.

ctx-internal-capsule is linked to tel-white-matter-l, the whole cerebral white-matter shell, rather than an isolated internal capsule. Selecting it can highlight far more tissue than the claimed structure.

**Action:** Relabel the rendered shell as cerebral white matter, or remove capsule body mapping and keep an explicitly approximate capsule marker until a segmented capsule mesh exists.

Location: `src/geometry/anatomyAssets.ts`:243. Records: `ctx-internal-capsule`.

### GEO-003: segmentation limit

**Status:** open schematic.

These subdivisions reuse a whole caudate/pallidal/callosal/ventricular cast. Content-only links and cut/segment markers do not provide separately validated substructure boundaries.

**Action:** Describe subdivisions as text/approximate markers; do not imply that selecting a named subregion isolates a verified mesh. Use validated labels/segmentation before claiming exact subregion geometry.

Location: `src/geometry/anatomyAssets.ts`:246. Records: `nuc-caudate-head`, `nuc-caudate-body`, `nuc-caudate-tail`, `nuc-globus-pallidus-internus`, `nuc-globus-pallidus-externus`, `tract-corpus-callosum-body`, `tract-corpus-callosum-genu`, `tract-corpus-callosum-rostrum`, `tract-corpus-callosum-splenium`, `vent-lateral-ventricle-frontal-horn`, `vent-lateral-ventricle-temporal-horn`, `vent-lateral-ventricle-occipital-horn`, `vent-lateral-ventricle-atrium`.

### GEO-004: course semantic mismatch

**Status:** suppression recommended to root.

Built-in medial posterior choroidal route ends at lateral atrial/glomus plexus [18.832,22.802,-17.664], a lateral-group target. Semantic record now distinguishes medial third-ventricular supply and does not justify this lateral tube as medial.

**Action:** Suppress this course/body with explicit reason pending a source-backed medial placement, while keeping corrected text available. Do not invent a medial coordinate path. A future separate lateral posterior choroidal dataset can represent the lateral route.

Location: `src/geometry/vasculature-courses.ts`. Records: `vasc-posterior-medial-choroidal-artery`.

### GEO-005: named branch order

**Status:** open landmark review.

In the declared +z-anterior frame, anterior-temporal terminal z=-44.242 is posterior to posterior-temporal terminal z=-40.318. The ordinal labels conflict with this display ordering; scalar agreement with a surface is not anatomical validation.

**Action:** Withhold or clearly mark these routes pending landmark placement against inferior temporal cortical anatomy. Review whole route/branch origins rather than blindly swapping labels or changing one arbitrary point.

Location: `src/data/structures/vasculature-courses.json`. Records: `vasc-pca-anterior-temporal-branches`, `vasc-pca-posterior-temporal-branches`.

### GEO-006: territory endpoint mismatch

**Status:** open landmark review.

Precentral/central course terminals at z about +35/+26 are substantially anterior to the model sensorimotor strip landmarks (roughly z -4 to -15). This is an internal course-versus-territory mismatch, not a validated human metric error.

**Action:** Review parent takeoff and complete terminal course against central/precentral sulcal landmarks. Retain text territory; avoid using these curves for exact localization until source-backed placement exists.

Location: `src/data/structures/vasculature-courses.json`. Records: `vasc-mca-m4-precentral-branch`, `vasc-mca-m4-central-branch`.

### GEO-007: branch group laterality

**Status:** advisory to root.

Single tubes marked midline stand for variable bilateral branch groups. SCA vermian curve begins off midline on one SCA (x about .961) and terminates off midline (x about 5.35). Pontine perforator curve is near median (x .532,.386,1.79,-.002) but real paramedian branches form bilateral groups, usually respecting the midline.

**Action:** For vermian branches, declare paired representative routes and mirror the existing one only as a schematic depiction of origins from either SCA. For pontine group, simply mirroring a near-midline tube makes overlapping twins and does not establish true branches; use separately reviewed ipsilateral representative branches or suppress exact-route implication and label bilateral group abstraction. Never change laterality only because the target is medial.

Location: `src/data/taxonomy.json`. Records: `vasc-sca-vermian-branches`, `vasc-pontine-perforating-arteries`.

### GEO-008: decussation interpretation

**Status:** paired crossing retained correctly.

Seven current tract waypoint chains cross x sign. Rendering the chain and mirrored counterpart can correctly represent bilateral sources each projecting contralaterally. An old count of eight or blanket request to remove mirrored crossing chains is unsupported by current data.

**Action:** Keep paired mirroring for CST, rubrospinal, tectospinal, DCML and ventral trigeminothalamic bilateral source routes. Mark auditory as a selected schematic route through a genuinely bilateral mixed network. Crossings and endpoints require source-specific checks; exact positions remain unvalidated.

Location: `src/components/viewer3d/SceneLayers.tsx`:808. Records: `tract-corticospinal-lateral`, `tract-rubrospinal`, `tract-tectospinal`, `tract-dcml`, `tract-trigeminothalamic-ventral`, `tract-anterior-spinocerebellar`, `tract-auditory-pathway`.

### GEO-009: decussation location

**Status:** root corrected route reviewed.

Earlier route recrossed near y+7 in the caudal midbrain, conflating anterior spinocerebellar entry/recrossing within or near cerebellum with the cerebellar efferent SCP decussation. Current root edit removes that falsely placed recross, leaving one sign change.

**Action:** Keep cerebellar recrossing documented in text and leave exact second-crossing position unrendered until the cerebellar course is adequately modeled. Mirrored routes can still represent bilateral spinal sources.

Location: `src/data/tracts.json`. Records: `tract-anterior-spinocerebellar`.

### GEO-010: nerve course limit

**Status:** advisory to root.

CN IV starts on midline nucleus coordinates then stays on one side; the named nuclear-to-contralateral-root crossing is not explicit. CN V root-to-final endpoint goes posterior (-z) beyond lateral exit although trigeminal ganglion/divisions proceed toward anterior skull targets. No skull/orbit/temporal-bone mesh grounds nerve foramen or terminal target coordinates.

**Action:** For CN IV distinguish nuclear source from crossed cisternal route and do not assign ipsilateral nuclear origin to a midline group. For CN V label selected division/course and review rostral/anterior ganglion target before changing coordinates. Keep all skull/orbit endpoints explicitly authored and unvalidated; use proper V1/V2/V3 foramina and VII canal entry/exit in text.

Location: `src/geometry/curves.ts`:208. Records: `nrv-cn4-trochlear`, `nrv-cn5-trigeminal`, `nrv-cn3-oculomotor`, `nrv-cn6-abducens`, `nrv-cn7-facial`.

### GEO-011: duplicate semantic tables

**Status:** advisory to root.

Runtime course tables duplicate function, clinical and refs independently of StructureRecord data. Stale nerve muscle-examination, pupil, foraminal and syndromic assertions and stale lenticulostriate/choroidal territory text can survive a record audit.

**Action:** Prefer a single authoritative semantic record and enrich the rendering table from it. Geometry tables should supply controls and schematic provenance, not a second clinical source. Root has the specific clinical advisories.

Location: `src/geometry/curves.ts`:139. Records: `nrv-cn3-oculomotor`, `nrv-cn4-trochlear`, `nrv-cn5-trigeminal`, `nrv-cn7-facial`, `vasc-lenticulostriate-arteries`, `vasc-lateral-lenticulostriate-arteries`, `vasc-medial-lenticulostriate-arteries`, `vasc-posterior-medial-choroidal-artery`.

### GEO-012: internal model artifact

**Status:** corrected in owned data.

M2 controls returned to their first point and formed an artificial loop. Repeated consecutive controls in some other courses introduced zero-length segments.

**Action:** Removed final M2 return-to-origin and repeated controls using stored points; waypointBasis remapped to retained controls. This is a rendering artifact correction only.

Location: `src/data/structures/vasculature-courses.json`. Records: `vasc-mca-insular-segment`.

### GEO-013: display anchor consistency

**Status:** corrected in owned data.

Fallback/selection metadata origins did not match their own committed mesh centroids. Canonical-space GLBs render without applying these origins; metadata can nevertheless mislead anchors and fallback geometry.

**Action:** 12 origins now match their own mesh centroids. This does not validate vessel location in a brain; original/final points are preserved in the vascular ledger.

Location: `src/data/structures/vasculature.json`. Records: `vasc-internal-carotid-artery`, `vasc-vertebral-artery`, `vasc-basilar-artery`, `vasc-anterior-cerebral-artery`, `vasc-anterior-communicating-artery`, `vasc-middle-cerebral-artery`, `vasc-posterior-communicating-artery`, `vasc-posterior-cerebral-artery`, `vasc-superior-cerebellar-artery`, `vasc-anterior-inferior-cerebellar-artery`, `vasc-posterior-inferior-cerebellar-artery`, `vasc-anterior-choroidal-artery`.

### GEO-014: ventricular relationship review

**Status:** gross topology reviewed exact shape unvalidated.

Stored display anchors agree with checked gross ventricular ordering (frontal anterior, occipital posterior, temporal inferior/anterior to atrium; third-aqueduct-fourth rostral-to-caudal). Segment extents, walls, foraminal continuity and dimensions are not validated by the shared cast or centroid.

**Action:** Keep exact locations/shape/segment cut planes schematic; refer to Haines 8 p66 fig4-10 and Blumenfeld 2 pp132-137/215-216. Aqueduct category in diencephalon is a navigation grouping; anatomically it is midbrain. Owner notified to clarify.

Location: `src/data/structures/telencephalon-ventricles.json`. Records: `vent-lateral-ventricle`, `vent-lateral-ventricle-frontal-horn`, `vent-lateral-ventricle-body`, `vent-lateral-ventricle-atrium`, `vent-lateral-ventricle-occipital-horn`, `vent-lateral-ventricle-temporal-horn`, `vent-interventricular-foramen`, `vent-third-ventricle`, `vent-cerebral-aqueduct`, `vent-fourth-ventricle`.

## Source-specific relational checks

- VPM is medial to VPL: [7, 10] in model axis x. Haines 8 pp152, 166; thalamic sections. Exact spatial fidelity remains unvalidated.
- VA is anterior to VL: [5, 2.5] in model axis z. Haines 8 pp158-160. Exact spatial fidelity remains unvalidated.
- Anterior thalamic group is anterior to pulvinar: [4, -5.5] in model axis z. Haines 8 pp148, 156, 158. Exact spatial fidelity remains unvalidated.
- MGN is medial to LGN: [8, 11] in model axis x. Haines 8 p150 fig6-29A. Exact spatial fidelity remains unvalidated.
- Mediodorsal nucleus is medial to reticular shell: [4.2, 11.5] in model axis x. Haines 8 pp154-158. Exact spatial fidelity remains unvalidated.
- Zona incerta is dorsal to STN: [23.5, 20] in model axis y. Haines 8 pp154-158. Exact spatial fidelity remains unvalidated.
- Superior colliculus is rostral/superior to inferior colliculus: [14, 8] in model axis y. Haines 8 pp138-141. Exact spatial fidelity remains unvalidated.
- Tectum is posterior to red nucleus: [-8, 0] in model axis z. Haines 8 pp138-141. Exact spatial fidelity remains unvalidated.
- SN is ventral/anterior to red nucleus: [8.5, 0] in model axis z. Haines 8 pp138-141. Exact spatial fidelity remains unvalidated.
- Gracile nucleus is medial to cuneate: [1.5, 3.5] in model axis x. Haines 8 pp114-119. Exact spatial fidelity remains unvalidated.
- Hypoglossal is medial to ambiguus: [0, 3.5] in model axis x. Haines 8 pp120-127. Exact spatial fidelity remains unvalidated.
- Medial accessory olive lies medial to principal olive: [2.5, 5] in model axis x. Haines 8 pp120-127. Exact spatial fidelity remains unvalidated.
- Abducens nucleus is medial to facial nucleus: [1.5, 4] in model axis x. Haines 8 pp128-133. Exact spatial fidelity remains unvalidated.
- Abducens nucleus is dorsal/posterior to facial nucleus: [-4, -2] in model axis z. Haines 8 pp128-133. Exact spatial fidelity remains unvalidated.
- Trigeminal motor nucleus is medial to principal sensory: [4, 5] in model axis x. Haines 8 p130 fig6-19A; visual inspection. Exact spatial fidelity remains unvalidated.
- Fastigial is medial to interposed: [1.8, 4] in model axis x. Haines 8 pp122, 124 figs6-15A/6-16A; Blumenfeld 2 p702. Exact spatial fidelity remains unvalidated.
- Interposed is medial to dentate: [4, 6] in model axis x. Haines 8 pp122, 124 figs6-15A/6-16A; Blumenfeld 2 p702. Exact spatial fidelity remains unvalidated.
- Frontal horn is anterior to atrium: [31, -14.8] in model axis z. Haines 8 p66 fig4-10. Exact spatial fidelity remains unvalidated.
- Occipital horn extends posteriorly from atrium: [-34.2, -14.8] in model axis z. Haines 8 p66 fig4-10. Exact spatial fidelity remains unvalidated.
- Temporal horn descends from atrium: [15.4, 32.5] in model axis y. Haines 8 p66 fig4-10. Exact spatial fidelity remains unvalidated.
- Temporal horn turns anteriorly from atrium: [-9.1, -14.8] in model axis z. Haines 8 p66 fig4-10. Exact spatial fidelity remains unvalidated.
- Aqueduct links third rostrally with fourth caudally: [29, 8] in model axis y. Haines 8 p66 fig4-10. Exact spatial fidelity remains unvalidated.
- Aqueduct is rostral to fourth ventricle: [8, -21] in model axis y. Haines 8 p66 fig4-10. Exact spatial fidelity remains unvalidated.

## Mirroring and crossing summary

`SceneLayers.tsx:808–809` and `TractTube.tsx:436–442` render a paired course and its x-negated counterpart. This is appropriate for bilateral sources of crossing pathways. Remove a mirrored course only when the biological pathway truly is one unpaired structure. For a midline target reached by paired vessels, target location alone is not a reason to create an unpaired median trunk. Exact source labels, crossing level and nerve nuclear versus cisternal portions require separate anatomical checks.

## Completeness and follow-up

The cortex patches, tiny nuclei and many nerve/vessel routes remain authored approximations. Whole meshes reused for divisions are not separately segmented. No venous circulation or separately reviewed lateral posterior choroidal course is included. A validated quantitative atlas requires expert segmentation review, documented registration to imagery and independent spatial comparison; this audit has not claimed that result.

## Authored SVG plate audit

Inspected all **15 authored SVG teaching plates** for parse validity, title/caption, `data-structure`/`data-for` identities and metadata label wiring. These are authored diagram shapes. A full pixel-level comparison of every contour with textbook sections is not claimed. Live 2D contours derive from the same schematic 3D mesh/course data; synchronization is not independent textbook validation or MRI registration.

### plate-thalamus-mid

Diencephalon - mid-thalamus (mammillary bodies). Caption: Diencephalon - mid-thalamus level, mammillary bodies (y = +28).

Shape IDs: 26. Label IDs: 26. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-midbrain-sc

Midbrain - superior colliculus (CN III). Caption: Midbrain - superior colliculus level, CN III (y = +14).

Shape IDs: 24. Label IDs: 24. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-midbrain-ic

Midbrain - inferior colliculus. Caption: Midbrain - inferior colliculus level (y = +8).

Shape IDs: 25. Label IDs: 25. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-pons-rostral

Pons - upper (SCP, CN IV). Caption: Pons - upper pons level, CN IV exit (y = +2).

Shape IDs: 19. Label IDs: 19. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-pons-middle

Pons - mid (CN V). Caption: Pons - midpontine level, CN V (y = -8).

Shape IDs: 21. Label IDs: 21. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-pons-caudal

Pons - lower (CN VI-VIII). Caption: Pons - lower pons level, CN VI-VIII (y = -18).

Shape IDs: 30. Label IDs: 30. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-olivary

Medulla - mid-olivary (open). Caption: Medulla - mid-olivary level, open fourth ventricle (y = -34).

Shape IDs: 23. Label IDs: 23. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-sensory-decuss

Medulla - sensory decussation. Caption: Medulla - sensory (internal arcuate) decussation (y = -42).

Shape IDs: 22. Label IDs: 22. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-pyramid-decuss

Medulla - pyramidal decussation. Caption: Medulla - pyramidal decussation (y = -46).

Shape IDs: 19. Label IDs: 19. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-sagittal-midline

Midline sagittal - brainstem profile. Caption: Midline sagittal - diencephalon and brainstem profile.

Shape IDs: 26. Label IDs: 26. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-coronal-midbrain

Coronal - cerebral peduncles. Caption: Coronal - cerebral peduncles, red nucleus, substantia nigra.

Shape IDs: 25. Label IDs: 25. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-coronal-thalamus

Coronal - pulvinar and pineal. Caption: Coronal - pulvinar, pineal gland, third ventricle.

Shape IDs: 31. Label IDs: 31. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-tel-axial-58

Telencephalon - axial at the basal ganglia and lateral ventricles (y = +58). Caption: Telencephalon — axial at the basal ganglia and lateral ventricles (y = +58).

Shape IDs: 19. Label IDs: 19. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-tel-sagittal-hemisphere

Telencephalon - sagittal hemisphere with brainstem and cerebellum. Caption: Telencephalon — sagittal hemisphere with brainstem and cerebellum.

Shape IDs: 25. Label IDs: 25. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

### plate-tel-coronal-fornix

Coronal - amygdala, hippocampus and basal ganglia (fornix level, z = +12). Caption: Telencephalon - coronal at the amygdala, hippocampus and basal ganglia (fornix level, z = +12).

Shape IDs: 25. Label IDs: 25. Unknown IDs: []. Metadata without shape: []. Shapes without metadata: []. Labels without shapes: [].

**Flagged to root:** rostral-pontine title/caption and CN IV root exit localization; mammillary-body mid-thalamic title/caption. These do not change the underlying authored y values.

## Authored plate corrections applied

Both mid-thalamic and rostral-pontine titles/captions were corrected. CN IV exit shapes, label and plate metadata were removed from the upper-pontine SVG; the existing inferior-colliculus midbrain exit remains. No replacement coordinates or contours were invented. All 15 SVGs parse, all structure IDs resolve, and metadata/shape/label wiring is internally consistent. This is a wiring/caption check, not textbook validation of all contours. Before/after evidence is retained in `geometry.json`.
