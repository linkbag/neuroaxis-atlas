# Brainstem, diencephalon, cerebellar context and syndrome audit

Date: 2026-10-04. Review branch only; no deployment.

## Scope and evidence

All **132** owned structure records and **26** syndrome records were inspected. **124** structures received substantive data changes, all 26 syndrome descriptions were revised, and 10 keyed CN III-XII course narrative proposals were saved. Every structure reference list was replaced with specific consulted source anchors. The machine-readable ledger records changed fields, evidence, uncertainty and coordinate metadata for each record.

The supplied books are Haines **8th edition (2012)**, title/copyright PDF5/6, and Blumenfeld **2nd edition (2010)**, title/copyright PDF5/6. Blumenfeld body printed p.N maps to PDF N+26; Haines body to N+14. References to unconsulted third editions and nonexistent diencephalon/brainstem chapter names were removed. Representative medullary, ocular nuclear and hypothalamic/chiasmal figures were visually inspected.

## High-impact corrections

- Gracile relay lesions cause ipsilateral pre-crossing lower-body sensory loss; medial lemniscal medullary leg/arm orientation differs from pons.
- CN III recti are tested vertically in abduction, inferior oblique in adduction. Oculomotor nuclear superior-rectus fibers cross and levator control is bilateral. Pupil sparing cannot exclude compression.
- Trochlear injury laterality depends on whether injury is before or after its dorsal decussation. Peripheral targets are ipsilateral to the exiting nerve.
- SCP-crossed midbrain output produces contralateral ataxia in Claude patterns; the lateral cerebellar limb-control loop ultimately affects the ipsilateral body. Medial cerebellar outputs have bilateral targets.
- Vertebral disease is more common than isolated PICA occlusion in lateral medullary syndrome. Pontine motor fibers are predecussation corticospinal fibers, distinct from the already crossed lateral spinal tract.
- Tuberothalamic/polar artery usually arises from PCoA. Pulvinar is an association complex, distinct from primary somatosensory VPL/VPM. Percheron midbrain involvement is variable and an optional V sign replaces the invented Y sign.
- Cardiac vagal parasympathetic neurons importantly involve ambiguus; DMV is particularly visceral/GI. Losing vagal outflow does not predict bradycardia/asystole. IX secretomotor origin is inferior salivatory, not DMV.
- Congenital central hypoventilation was separated from speculative isolated medullary arcuate loss. Fatal familial insomnia was separated from invented selective TRN/preoptic disorders.
- Human VMH rage/storm, DMH night-eating, posterior-nuclear Kleine-Levin/Shapiro localization rules were removed. Regional experimental functions do not establish a unique clinical nuclear diagnosis.
- Aqueduct region corrected to midbrain; ventricular cavities distinguished from adjacent tissue perfusion. Fourth ventricular inlet/outlets clarified; obstruction need not produce gaze palsy/ataxia.
- Chiari tonsillar descent is assessed against the foramen-magnum McRae line, not an obex line.
- Wernicke full triad, Korsakoff progression/confabulation and vascular syndrome combinations are variable. Hyperglycemic hemiballismus frequently involves striatum rather than STN.

## Spatial and evidentiary limits requiring review

**No exact coordinate, size or mesh shape is certified.** All numeric triples passed finite-value inspection. Broad anatomical relationships were compared with textbook serial sections and representative diagrams; no MNI/Talairach registration, specimen segmentation, morphometry or vertex-level ground truth was supplied. Existing conceptual geometry should remain labeled schematic.

Optic chiasm has midbrain-associated level selectors and y=14.5 despite being ventral anterior diencephalon. Rostral NTS data region is corrected to medulla and the caudal-pons selector is removed; its legacy numeric placement remains unvalidated. Numeric replacements were not fabricated. Aqueduct registry should be synchronized with its corrected midbrain region. Hypoglossal laterality and Edinger-Westphal label proposals are in the JSON ledger.

Major connections were checked, but detailed subnuclear projections, human/animal equivalence, exact perfusion boundaries and peripheral vasa nervorum remain partial. Selected sources support educational organization; they are not certification of every sentence or individual lesion prediction. Clinical entries are qualified teaching patterns, not treatment protocols. Cerebellar coverage currently comprises envelope, vermis, dentate/interposed/fastigial nuclei and all three peduncles; named cortex lobes are not separate validated parcels.

## Record-by-record review index

Per-field findings and exact anchors appear in [brainstem-diencephalon.json](brainstem-diencephalon.json).

| Structure ID | Substantive changed fields | Geometry |
|---|---|---|
| tract-pyramid | connections, bloodSupply, clinical | Not anatomically validated |
| tract-pyramidal-decussation | clinical | Not anatomically validated |
| tract-internal-arcuate | clinical, levels | Not anatomically validated |
| tract-fasciculus-gracilis | clinical | Not anatomically validated |
| nuc-nucleus-gracilis | clinical | Not anatomically validated |
| tract-fasciculus-cuneatus | clinical | Not anatomically validated |
| nuc-nucleus-cuneatus | function, connections, clinical | Not anatomically validated |
| nuc-inferior-olive-principal | function | Not anatomically validated |
| nuc-inferior-olive-medial | function, connections, clinical | Not anatomically validated |
| tract-medial-lemniscus | function, bloodSupply, clinical | Not anatomically validated |
| tract-spinal-trigeminal | function, connections, clinical | Not anatomically validated |
| nuc-spinal-trigeminal | clinical | Not anatomically validated |
| nuc-solitarius-caudal | clinical | Not anatomically validated |
| nuc-dmv | function, clinical | Not anatomically validated |
| nuc-ambiguus | function, connections, clinical | Not anatomically validated |
| nuc-hypoglossal | bloodSupply, clinical | Not anatomically validated |
| nuc-area-postrema | clinical | Not anatomically validated |
| tract-icp | connections, clinical | Not anatomically validated |
| nuc-arcuate-medullary | function, clinical | Not anatomically validated |
| nuc-medullary-reticular | clinical | Not anatomically validated |
| vent-fourth-ventricle | function, bloodSupply | Not anatomically validated |
| surf-cn9-exit | clinical | Not anatomically validated |
| surf-cn10-exit | clinical | Not anatomically validated |
| surf-cn11-exit | function | Not anatomically validated |
| surf-cn12-exit | clinical | Not anatomically validated |
| surf-obex | function, clinical | Not anatomically validated |
| ctx-cerebellum | function, connections, clinical | Not anatomically validated |
| nuc-dentate | connections, clinical | Not anatomically validated |
| nuc-interposed | connections, bloodSupply, clinical | Not anatomically validated |
| nuc-fastigial | function, connections | Not anatomically validated |
| surf-vermis | clinical | Not anatomically validated |
| ctx-medulla-surface | function | Not anatomically validated |
| ctx-pontine-nuclei | clinical | Not anatomically validated |
| ctx-pontine-fibers | clinical | Not anatomically validated |
| nuc-trigeminal-motor | clinical | Not anatomically validated |
| nuc-principal-sensory-v | connections | Not anatomically validated |
| nuc-abducens | Reference correction; core retained | Not anatomically validated |
| nuc-facial | clinical | Not anatomically validated |
| nuc-superior-salivatory | clinical | Not anatomically validated |
| nuc-solitarius-rostral | function, connections, clinical, region, bloodSupply, levels | Not anatomically validated |
| nuc-vestibular-superior | clinical | Not anatomically validated |
| nuc-vestibular-medial | clinical | Not anatomically validated |
| nuc-vestibular-lateral | function, clinical | Not anatomically validated |
| nuc-vestibular-inferior | function, clinical | Not anatomically validated |
| nuc-cochlear-ventral | bloodSupply, clinical | Not anatomically validated |
| nuc-cochlear-dorsal | clinical | Not anatomically validated |
| nuc-superior-olivary | clinical | Not anatomically validated |
| tract-trapezoid-body | clinical | Not anatomically validated |
| tract-lateral-lemniscus | clinical | Not anatomically validated |
| tract-mcp | connections, clinical | Not anatomically validated |
| nuc-locus-coeruleus | function | Not anatomically validated |
| nuc-pontine-reticular | clinical | Not anatomically validated |
| nuc-pprf | function, connections, clinical | Not anatomically validated |
| surf-cn5-exit | function, clinical | Not anatomically validated |
| surf-cn6-exit | function, clinical | Not anatomically validated |
| surf-cn7-exit | clinical | Not anatomically validated |
| surf-cn8-exit | clinical | Not anatomically validated |
| surf-facial-colliculus | function | Not anatomically validated |
| ctx-pons-surface | Reference correction; core retained | Not anatomically validated |
| nuc-superior-colliculus | Reference correction; core retained | Not anatomically validated |
| nuc-inferior-colliculus | Reference correction; core retained | Not anatomically validated |
| nuc-pretectal | function, clinical | Not anatomically validated |
| nuc-pag | clinical | Not anatomically validated |
| nuc-oculomotor | function, clinical | Not anatomically validated |
| nuc-edinger-westphal | name, synonyms, function, connections, clinical | Not anatomically validated |
| nuc-trochlear | clinical | Not anatomically validated |
| nuc-mesencephalic-v | clinical | Not anatomically validated |
| tract-mesencephalic-v | clinical | Not anatomically validated |
| nuc-red-nucleus | connections, clinical | Not anatomically validated |
| nuc-snc | function, connections, clinical | Not anatomically validated |
| nuc-snr | clinical | Not anatomically validated |
| tract-crus-cerebri | function | Not anatomically validated |
| tract-scp-decussation | function, clinical | Not anatomically validated |
| tract-scp | function, connections, clinical | Not anatomically validated |
| nuc-dorsal-raphe | function, clinical | Not anatomically validated |
| nuc-cuneiform | function, clinical | Not anatomically validated |
| surf-interpeduncular-fossa | clinical | Not anatomically validated |
| surf-cn3-exit | clinical | Not anatomically validated |
| surf-cn4-exit | clinical | Not anatomically validated |
| ctx-midbrain-surface | Reference correction; core retained | Not anatomically validated |
| nuc-thalamic-anterior | function, connections, bloodSupply | Not anatomically validated |
| nuc-va | clinical | Not anatomically validated |
| nuc-vl | function, bloodSupply | Not anatomically validated |
| nuc-vpl | function, clinical | Not anatomically validated |
| nuc-vpm | bloodSupply, clinical | Not anatomically validated |
| nuc-lateral-dorsal | Reference correction; core retained | Not anatomically validated |
| nuc-lateral-posterior | Reference correction; core retained | Not anatomically validated |
| nuc-pulvinar | function, connections, bloodSupply, clinical | Not anatomically validated |
| nuc-md | clinical | Not anatomically validated |
| nuc-intralaminar | function, connections, clinical | Not anatomically validated |
| nuc-midline-thalamic | clinical | Not anatomically validated |
| nuc-thalamic-reticular | function, clinical | Not anatomically validated |
| nuc-lgn | clinical | Not anatomically validated |
| nuc-mgn | clinical | Not anatomically validated |
| ctx-internal-medullary-lamina | function, clinical | Not anatomically validated |
| ctx-thalamus-envelope | function, bloodSupply, clinical | Not anatomically validated |
| nuc-preoptic | function, clinical | Not anatomically validated |
| nuc-suprachiasmatic | function, connections, clinical | Not anatomically validated |
| nuc-supraoptic | clinical | Not anatomically validated |
| nuc-paraventricular | clinical | Not anatomically validated |
| nuc-arcuate-hypothalamic | synonyms, function, clinical | Not anatomically validated |
| nuc-ventromedial | synonyms, function, clinical | Not anatomically validated |
| nuc-dorsomedial | clinical | Not anatomically validated |
| nuc-posterior-hypothalamus | function, clinical | Not anatomically validated |
| nuc-mammillary-body | function, clinical | Not anatomically validated |
| ctx-hypothalamus-envelope | clinical | Not anatomically validated |
| surf-optic-chiasm | function | Not anatomically validated |
| surf-infundibulum | synonyms, bloodSupply, clinical | Not anatomically validated |
| nuc-pineal-gland | function, connections | Not anatomically validated |
| ctx-pineal | Reference correction; core retained | Not anatomically validated |
| nuc-habenula | function, connections, clinical | Not anatomically validated |
| tract-stria-medullaris | connections, clinical | Not anatomically validated |
| tract-posterior-commissure | clinical | Not anatomically validated |
| nuc-subthalamic | clinical | Not anatomically validated |
| nuc-zona-incerta | function, clinical | Not anatomically validated |
| ctx-fields-of-forel | synonyms, function, contextNote, clinical | Not anatomically validated |
| vent-third-ventricle | bloodSupply | Not anatomically validated |
| vent-cerebral-aqueduct | region, function, bloodSupply, clinical | Not anatomically validated |
| ctx-corpus-callosum | clinical | Not anatomically validated |
| ctx-internal-capsule | function, connections | Not anatomically validated |
| ctx-lenticular-nucleus | clinical | Not anatomically validated |
| ctx-caudate-nucleus | connections | Not anatomically validated |
| nrv-cn3-oculomotor | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn4-trochlear | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn5-trigeminal | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn6-abducens | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn7-facial | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn8-vestibulocochlear | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn9-glossopharyngeal | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn10-vagus | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn11-accessory | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |
| nrv-cn12-hypoglossal | modality, course, function, connections, bloodSupply, clinical, contextNote | Not anatomically validated |

## Syndromes

| Syndrome ID | Main correction |
|---|---|
| syn-lateral-medullary | Corrected vertebral-versus-PICA hierarchy, posterior/ICP cerebellar pathway, included vestibular and descending sympathetic structures, and removed obligatory onion-skin/weakness-sparing/autonomic features. |
| syn-medial-medullary | Corrected anterior-spinal-versus-vertebral source confusion, reversed medullary lemniscal somatotopy, and removed misplaced pontine gaze involvement. |
| syn-hemimedullary | Removed invented medullary-foramina/hemicord vascular mechanism and unsupported severity ranking; distinguished ambiguus swallowing from DMV visceral function. |
| syn-millard-gubler | Removed required nuclear VI/gaze-palsy conflation, avoided labeling predecussation pontine fibers as lateral spinal CST, and acknowledged historically variable eponym. |
| syn-foville | Added missing contralateral motor component and removed obligatory eye-resting deviation and lateral auditory-tract localization. |
| syn-locked-in | Removed compulsory complete sensation/vertical-eye preservation, EEG-as-proof-of-awareness rule and sole pontine-gray basis; qualified variants and causes. |
| syn-cpm | Removed narrow vascular framing, mandatory time course and erroneous diffusion/ADC description; acknowledged extrapontine disease. |
| syn-cerebellar | Qualified side by lesion location/crossing and removed fixed deep-nuclear arterial supply and obligatory symptom combinations. |
| syn-lateral-pontine | Removed only-brainstem-deafness claim and fixed full syndrome; separated labyrinthine involvement from central nuclear supply. |
| syn-one-and-a-half | Removed required resting exotropia/convergence preservation and simplistic age-to-etiology rule. |
| syn-central-horner | Removed mandatory complete body anhidrosis, normal-reactivity/mydriatic test confusion and outdated pharmacologic localization rules. |
| syn-weber | Distinguished fascicular from nuclear palsy and qualified pupil/weakness distributions. |
| syn-benedikt | Removed deterministic red-nucleus-only tremor/rigidity mechanism and made motor weakness extent-dependent. |
| syn-claude | Corrected cerebellar-output injury before-versus-after decussation and qualified weakness exclusion. |
| syn-nothnagel | Removed unsupported invariant ataxia/hemianesthesia combination; named the diagnostic variability and crossing-dependent side. |
| syn-parinaud | Removed compulsory dilated pupils, progression sequence and aqueduct-obstruction equivalence. |
| syn-ino | Corrected level-dependent vascular supply and avoided mandatory convergence/age-specific cause rules. |
| syn-parkinson | Removed obligatory tremor/uniform progression and one-nucleus-only disease mechanism. |
| syn-peduncular-hallucinosis | Removed compulsory insight/pleasant content/intact cognition and overly settled neurochemical mechanism. |
| syn-dejerine-roussy | Corrected pulvinar-as-somatosensory-relay and compulsory temporal progression/symptom combinations. |
| syn-percheron | Corrected invented Y sign, required midbrain supply and mandatory clinical triad. |
| syn-tuberothalamic | Corrected PCoA rather than PCA/P1 source, removed VL-as-required territory and deterministic aphasia/tremor/gaze pattern. |
| syn-korsakoff | Removed mandatory triad/sequential phases/confabulation and conflation of acute signal changes with chronic mammillary atrophy. |
| syn-hypothalamic | Removed overly narrow storm-centered name, inevitable hypernatremia and unsupported specific nuclear diagnoses. |
| syn-pineal-region | Qualified mass-effect signs and corrected automatic germinoma-hCG/puberty claim. |
| syn-hemiballismus | Corrected nonketotic-hyperglycemia STN localization and sole-nucleus arterial/causal rule. |

## Coordinated course replacements

[cranial-nerve-course-proposals.json](cranial-nerve-course-proposals.json) replaces factual narrative fields for CN III-XII in `NERVE_COURSES`. It preserves waypoints, radius and display settings. Apply before considering these nerve corrections integrated; duplicate original prose otherwise remains.
