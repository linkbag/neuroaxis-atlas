# NeuroAxis scientific and clinical content audit

**Review date:** 2026-10-04

**Branch:** `audit/scientific-content-2026-10-04`

**Published baseline:** `26b5d4f72fbb38c415044a078397c1e34a00f7ba`

**Release state:** Review only. The audit changes have not been merged into master or deployed.

## Repository reconciliation

GitHub's default branch is **master**. At the start of this audit, master and `mri-simulated-live-2026-10-03` already pointed to the published baseline above. No baseline merge was required. The public defaults are retained: a direct Plates visit opens Live section, y/transverse, MRI, with Snap off on initial load. MRI and Simulated only are the available imagery options. CT/photo files are now excluded from the review build, including static photograph imports and the CT volume. Historical source assets remain in Git history/repository; they are not distributed by this build. Direct Plates entry preserves the user's plane position, opacity and window choices. Level-ruler navigation intentionally opens the selected authored plate.

## Coverage and method

| Dataset | Inspected | Result |
|---|---:|---|
| Original structure and tract records | 287 | Every authored record inspected and included in a domain ledger |
| Brainstem/diencephalon/cerebellar context | 132 | Names, functions, laterality, clinical context, connections, perfusion and location reviewed |
| Original telencephalic records | 71 | Cortex, basal ganglia, limbic, white matter, anterior visual pathway and CN I/II reviewed |
| Vascular/lateral-ventricular records | 61 | 53 vessel records and 8 cavity/plexus records reviewed |
| Main tract courses | 23 | Origins, targets, decussations, function, clinical descriptions and curves reviewed |
| Syndrome cards | 26 | Descriptions and structure links reviewed and revised |
| Cortical additions | 23 | Searchable source-based anatomical/functional concepts; no invented 3D boundaries |
| Arcuate fasciculus addition | 1 | Separate concept entry, with no invented streamlines |
| Functional pathway summaries | 19 | Source anchors and linked relays checked; independently reread for crossing/laterality |
| Structure spatial metadata | 264 original records | 234 origins/dimensions inspected; exact anatomical fidelity remains unvalidated |
| Cranial nerve/vessel courses | 12 / 43 declared | Geometry inspected; duplicate narrative tables synchronized; six vessel courses withheld |
| Committed GLB / SVG plates | 138 / 15 | File integrity, labels and wiring checked; gross relationships sampled against textbook diagrams |

The review branch contains **311 structure/tract records**, **26 syndrome cards**, and **19 pathways**. Comparing the final authored data against the published baseline gives **305 existing records with non-reference/content changes** (includes syndrome cards), and **1625 changed fields**. This change count includes cautionary rewrites and metadata changes; it is not a count of proven scientific errors. All 24 new concepts have no assigned quantitative geometry.

Every record's existing fields were inspected. Text support, internal data/geometry consistency, gross spatial relationships and exact shape validation are separate assessments. Sources are supplied-book pages/figures plus selected primary studies; some fine-grained human connectivity, vessel territory and isolated-lesion claims remain uncertain and were qualified or removed. Replacing references is not proof that every granular field is established independently. Cross-domain reviewers reread all new pathways and the 23 tract narratives. This is an evidence-supported editorial audit, not an independent clinical peer review or a certification of the whole model.

## Important corrections

| Topic | Correction | Evidence / ledger |
|---|---|---|
| Dorsal-column sensory laterality | Gracile relay lesions are ipsilateral before crossing; medial-lemniscal somatotopy rotates through the brainstem | Blumenfeld 2nd ed., Chapter 7; brainstem and tract ledgers |
| Ocular motor nuclei and nerves | Nuclear superior-rectus crossing and bilateral levator control distinguished from ipsilateral peripheral CN III; vertical rectus testing uses abduction; pupil sparing cannot exclude compression | Blumenfeld 2nd ed., Chapter 13; brainstem ledger |
| Cerebellar output | Crossing location and net body laterality distinguished; Claude patterns and lateral cerebellar loops corrected | Blumenfeld 2nd ed., Chapter 15; brainstem/tract ledgers |
| Ventral/anterior spinocerebellar course | Cerebellar recrossing separated from caudal-midbrain SCP efferent decussation; misleading old 3D tube withheld | Blumenfeld printed p.710, PDF736, Figure15.11; tract ledger |
| CN I / CN II | First-order olfactory fila separated from CNS bulb/tract; prechiasmal optic nerve is monocular, postchiasmal tract represents the opposite hemifield | Blumenfeld Chapters11/12/18; telencephalic/nerve-course ledgers |
| Visual pathways | Normal Wilbrand-knee claim removed; Meyer-loop superior-field logic and individual variability corrected; macular sparing and Anton phenomena qualified | [Horton1997](https://pubmed.ncbi.nlm.nih.gov/9440188/), [Yogarajah2009](https://pubmed.ncbi.nlm.nih.gov/19460796/); telencephalic/tract ledgers |
| Cortex and language | Gyral, cytoarchitectonic and functional labels separated; Broca/Wernicke labels treated as shorthand for distributed networks; arcuate distinguished from the entire SLF | Blumenfeld Chapter19; telencephalic ledger |
| Human/animal extrapolation | Rigid rubrospinal posturing, hypothalamic nuclear syndromes, basal-ganglia rate rules and isolated connectivity claims softened or removed | Supplied textbooks and record-specific studies; domain ledgers |
| Vascular territories | ACA orbital/FEF conflation, angular-vs-pure alexia, cuneus visual-field orientation, tuberothalamic origin and vessel-wall/CSF claims corrected; arterial variation emphasized | Haines vascular/section figures, Blumenfeld Chapter10; vascular/brainstem ledgers |
| Ventricles | Ex-vacuo temporal-horn enlargement corrected; cavity communication distinguished from perfusion of surrounding tissue; fourth-ventricle inlet/outlets clarified | Blumenfeld Chapters5/18; vascular/brainstem ledgers |
| Medial posterior choroidal artery | Old course ended on lateral atrial plexus; spatial representation withheld rather than replacing it with guessed coordinates | Vascular and geometry ledgers |
| Teaching plates | CN IV exit removed from rostral-pontine plate, retained on existing caudal-midbrain plate; false thalamic mammillary-level wording removed | Haines section/surface figures; geometry ledger |
| References | Consulted editions/pages verified; invented chapter titles and unconsulted third-edition references replaced; RSNA article attribution corrected to Sciacca et al. | Reference lists and domain ledgers |

## Cortex atlas and pathways

The **Cortex** view provides anatomical gyri/lobules, functional areas and broad sensorimotor representations. Additions include pre/postcentral and paracentral regions; frontal gyri; angular, supramarginal, superior parietal and precuneus; temporal gyri, fusiform, cuneus and lingual; retrosplenial, prefrontal subdivisions, S2, gustatory and primary olfactory concepts. These entries add reliable navigable descriptions, not a validated cortical surface parcellation. Existing broad lobes and homunculus anchors remain schematic.

The **Pathways** view covers corticospinal, corticobulbar, DCML, anterolateral, trigeminal, visual, auditory, vestibulo-ocular, corticopontocerebellar, spinocerebellar and cerebellar output routes; hippocampal/Papez connections; basal-ganglia direct, indirect and hyperdirect circuits; dominant language connections; oculosympathetic and visceral autonomic reflexes. Numbered relays simplify branched, parallel and reciprocal networks. Text-only relays explicitly name structures that have no dedicated model. Detailed laminar/rapid hyperdirect evidence from macaque studies is identified as animal evidence.

## Residual limitations for review

| Priority | Issue | Present handling / needed next step |
|---|---|---|
| High | Exact coordinates, dimensions and mesh shapes have no validated subject/MNI/Talairach or AC-PC registration | Persistent teaching-model notice and per-record caveats. A registered segmented dataset and landmark/section-based expert validation are needed before spatial precision claims |
| High | MRI overlay has an approximate affine fit; anatomy contours are not registered to that MRI | Visible alignment caution. Do not interpret overlap as patient anatomy or a validated section match |
| High | 41 cortical marker/level metadata flags | Flags are arithmetic warnings, not proof that anatomical sections are wrong; markers and listed pedagogical levels are not volumetric boundaries. Do not invent coordinates to satisfy this arithmetic |
| High | Known spatial mismatches | Eight routes withheld: ASCT; CN V; medial posterior choroidal; two PCA temporal; two MCA sensorimotor branches; pontine perforator abstraction. Internal-capsule whole-white-matter association removed. Corrected text remains available |
| Medium | Derived cortical/vascular surface routes and gyral boundaries | Broad illustrations only. Branch count/calibre/course and cortical boundary maps need empirical validation; precentral/central MCA endpoints are not aligned with validated functional M1/S1 landmarks |
| Medium | Fine nuclei, vascular territories, connectivity and clinical patterns vary | Deterministic statements replaced with qualified descriptions; consult record-specific remaining limitations. Territory links mean partial tissue relationships, not perfused ventricular cavities or voxel territories |
| Medium | Coverage is major-system coverage | No complete cerebellar lobular atlas, full cerebral venous/sinus atlas, complete small-nucleus inventory or exhaustive connection graph is claimed |
| Review gate | Clinical/editorial review | A neuroanatomist/clinician should review the critical corrections and educational wording before release. Automated ID/build checks cannot verify scientific truth |

## Sources and provenance

- **Duane E. Haines**, Neuroanatomy: An Atlas of Structures, Sections, and Systems, **8th edition, 2012**, supplied PDF. Printed body p.N → physical PDF page N+14.
- **Hal Blumenfeld**, Neuroanatomy through Clinical Cases, **2nd edition, 2010**, supplied PDF. Printed body p.N → physical PDF page N+26.
- Primary human anatomy, imaging, clinical series and experimental tracing/physiology are linked in individual references. Human/animal and direct evidence/inference are distinguished where material.
- Textbook files, extracted text and rendered textbook images are kept in local scratch only. No textbook excerpts or figure pixels were added to the repository.
- The historical docs describing earlier versions are implementation history. Their measured-course and clinical-accuracy wording should not be used as current scientific validation.

## Verification and review files

`review-index.json` provides the final record census and exact authored before/after differences relative to the published baseline. Domain JSON files contain field assessments/source anchors/remaining limitations. `geometry.json` documents file/coordinate/course/plate inspection. `pathways-tracts-independent-review.json` records the independent read and `integration.json` records its resolutions. `VERIFICATION.md` contains final test and browser observations.

To review: open the local preview; examine Cortex and Pathways; confirm direct Plates defaults and MRI/Simulated-only controls; inspect the critical corrections and residual limitations above; search the standalone HTML report by structure or clinical term. Audit changes remain on the review branch until the owner approves a release.
