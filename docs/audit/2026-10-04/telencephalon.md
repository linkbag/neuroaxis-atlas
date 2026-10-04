# Telencephalon scientific and clinical audit

Review date: 2026-10-04. This review covers **71 pre-existing records**, adds **23 cortical-region concepts** and adds a separate **arcuate fasciculus concept** (95 records in total). The machine-readable ledger is [telencephalon.json](telencephalon.json); it lists checked fields, concrete source pages/URLs, field changes, gross location/shape findings and unresolved geometry limitations for every record. Changes are for user review and have not been deployed.

## Source editions and method

The supplied Haines PDF is the **8th edition (2012)**, confirmed from its title/copyright pages; printed anatomical pages cited here are PDF page +14. The supplied Blumenfeld PDF is the **2nd edition (2010)**, confirmed from title/copyright pages; cited chapter pages are PDF page +26. The old records often cited a third edition and unspecific chapter titles; those references have been replaced with checked evidence from the supplied editions. Source citations describe evidence for the prose, not a registration of the renderer geometry.

Text was checked against the supplied chapter pages and coronal sections. Haines printed p.15/PDF29 Figure 2-7 was visually inspected for medial/lateral homuncular organization and upper/lower calcarine visual fields; Blumenfeld printed p.833/PDF859 Figure 18.10 was visually inspected for hippocampal/dentate/fimbrial geometry. No textbook image or chapter was copied into the repository.

## Higher-risk findings corrected

1. **Anterior vision and occipital localization:** an optic nerve carries one eye's retinal output, not a contralateral binocular hemifield. Temporal Meyer's-loop fibres carry the **superior** visual field. Occipital infarction can spare central vision, but it is not obligatory. Cortical blindness does not invariably cause Anton syndrome and does not preserve normal optokinetic responses. Blumenfeld, 2nd ed., pp.465-475/PDF491-501 and p.914/PDF940 support these corrections. The old optic-tract record called an afferent pupillary asymmetry the Riddoch phenomenon; the latter concerns residual motion perception.
2. **Chiasmal fibre claims:** the normal human chiasm should not be taught as requiring Wilbrand's knee. Horton found the classic loop after monocular enucleation and not in intact primate preparations; the junctional field pattern does not establish that loop or one pathognomonic tumor. [Horton, 1997](https://pubmed.ncbi.nlm.nih.gov/9440188/).
3. **Capsular pathways and laterality:** the posterior limb conventionally places motor fibres more anteriorly and somatosensory fibres more posteriorly; the old motor-posterior-third claim was reversed. Retrolenticular optic and sublenticular auditory radiations are distinct adjacent subdivisions. Ataxic hemiparesis from a hemispheric lesion affects the **contralateral body side**, with ataxia and weakness on that same affected side. Blumenfeld pp.232-234/PDF258-260 and pp.395-398/PDF421-424.
4. **Cortical language and auditory maps:** Broca/Wernicke labels denote traditional dominant perisylvian regions within wider reciprocal networks. Left and right should not be equated with dominant/nondominant in every individual. A2, planum temporale and Wernicke area are not synonyms; A1 receives bilateral information through MGN rather than direct inferior-collicular commissural input. Blumenfeld pp.519-522/PDF545-548 and pp.885-897/PDF911-923.
5. **Basal-ganglia causality:** caudate body is at the ventricular lateral wall, and striatal/pallidal territories differ. Direct/indirect loops are useful models with important incompleteness; an isolated GPe rate claim cannot establish dystonia, and successful GPi stimulation does not prove simple GPi silencing. Deterministic artery-symptom/outcome statements were removed. Blumenfeld pp.742-752/PDF768-778 and Haines pp.74-79/PDF88-93.
6. **Hippocampal circuit/field distinctions:** CA2 and CA3 are distinct fields despite one display record. CA4 is a historical label within the hilus, not every hilar cell. The subiculum is a major output field; Schaffer collaterals are principally the CA3-to-CA1 route. Fornix contains returning septal afferents and direct anterior-thalamic projections in addition to the mammillary route. CA1 hypoxic vulnerability is not evidence that its marker occupies a fixed arterial watershed. Blumenfeld pp.830-837/PDF856-863 and p.842/PDF868; [ILAE hippocampal-sclerosis consensus](https://www.ilae.org/files/dmfile/International-consensus-classification-hippocampal-sclerosisBlumcke-2013-Epilepsia.pdf). CA2 social-memory experimental results are explicitly animal evidence, not human psychiatric localization: [Hitti and Siegelbaum, 2014](https://www.nature.com/articles/nature13028).
7. **Emotion and adult neurogenesis:** amygdala injury does not abolish every form of fear; a small human study demonstrated CO2-evoked fear/panic after bilateral damage. [Feinstein et al., 2013](https://www.nature.com/articles/nn.3323). Adult dentate neurogenesis has conflicting histological findings and newer supportive molecular evidence; a fixed rate, exact functional benefit or exercise/treatment promise is not established by this atlas. [Sorrells et al., 2018](https://www.nature.com/articles/nature25975), [Moreno-Jimenez et al., 2019](https://www.nature.com/articles/s41591-019-0375-9), [Disouky et al., 2026](https://www.nature.com/articles/s41586-026-10169-4).

## Cortical breakdown added

Anatomical gyri/lobules: precentral, postcentral, paracentral, superior/middle/inferior frontal, superior parietal, angular, supramarginal, precuneus, superior/middle/inferior temporal, fusiform, cuneus, lingual and retrosplenial regions.

Functional concepts: dorsolateral prefrontal, orbitofrontal, ventromedial prefrontal, secondary somatosensory, gustatory and primary olfactory cortex. Existing visual/auditory/language/motor/entorhinal/eye-field records were corrected alongside them. Each new concept is `meshes:false` without invented coordinates or volumes. The separate arcuate record also has no invented tractography or path geometry.

This is a **source-based cortical teaching breakdown**, not HCP, Brodmann, Desikan or another registered parcellation. A true cortical atlas requires a compatible segmented surface/volume and a validated transform. Glasser's multimodal cortical atlas illustrates the need for independent areal evidence; those parcels are not implemented here. [Glasser et al., 2016](https://www.nature.com/articles/nature18933).

## Location, shape and coordinates: limits of this review

The ledger provides an expected gross anatomical relationship for every structure, e.g. the C-shaped caudate, pallidal wedges, thin claustral sheet, curved laminated hippocampus, arch-shaped fornix, fan-shaped corona radiata and flattened chiasm. These concepts differ materially from an isolated ellipsoid or cylinder. The project frame is custom (positive x toward patient left, y superior, z anterior); its numbers are not presented as MNI/Talairach or patient millimeters.

The derived hemisphere ribbon cannot validate cortical thickness, central-sulcal landmarks, gyri, functional patches or microscopic hippocampal fields. Original numerical coordinates/dimensions/routes were retained and are explicitly labeled unvalidated. A small anchor-to-host-mesh residual verifies only rendering proximity. It does not prove that a motor/sensory sector or subfield is in its real biological location.

The homuncular patches are schematic. Foot/leg are broadly medial and face/tongue inferolateral, but representations overlap; axial/orofacial outputs have bilateral contributions, and laryngeal control is especially poorly represented by one fixed sector. Interleaved motor action-network findings make a uniform strip insufficient as a functional parcellation. [Gordon et al., 2023](https://doi.org/10.1038/s41586-023-05964-2). The unvalidated derived patches no longer claim a true anatomical hand-knob landmark.

Many named `levels` memberships do not fall within their own point/ellipsoid y-span (see each ledger flag). For example, the V1 marker at y17 with size-y4 includes named levels at y28, y36 and y78. That does not measure the true extent of the host surface, and it demonstrates that those memberships cannot be treated as independently checked literal transverse-section intersections. No guessed coordinate correction was made. A separate empirical validation should compare transformed segmented anatomy and actual section intersections before shape/location accuracy is claimed.

## Functional pathways proposed

[pathway-proposals.json](pathway-proposals.json) supplies evidence-based visual, auditory, hippocampal intrinsic, Papez, basal direct/indirect and perisylvian language routes. It distinguishes axon bundle from synaptic relay, includes bilateral/branched routes and states that circuits are summaries, not measured streamlines. The cortical navigation can link to source-based concepts without pretending unmodeled relays have a mesh.

## Record-by-record findings

| Record | Correction/review finding |
|---|---|
| `ctx-cerebral-cortex` | Corrected all-cortex six-layer assertion; removed fixed thickness and guaranteed watershed pattern. Derived ribbon cannot supply validated gyral or laminar boundaries. |
| `surf-frontal-lobe` | Removed strict leg sparing and preserved comprehension; frontopontine crus fractions and SNc-as-major-cortical-input claims were unnecessary overprecision. |
| `surf-parietal-lobe` | Added ACA medial-parietal supply; removed automatic right=nondominant/left=dominant identity and rigid cortical sensory dissociation. |
| `surf-temporal-lobe` | Corrected Meyer's loop inferior-field error; removed automatic hemianopia/amnesia conjunction and fixed arterial endpoint mapping. |
| `surf-occipital-lobe` | Corrected obligatory macular sparing and Anton; removed congruity as definitive tract-versus-cortex test. |
| `surf-insula` | Removed nearly-every-MCA-occlusion and right-insula-sudden-death determinism; corrected lenticulostriate origin conflation and VMpo as proven primary relay. |
| `surf-limbic-lobe` | Separated morphological limbic lobe from isolated emotion circuit; removed anti-NMDAR as stereotyped medial-temporal limbic encephalitis and proof language. |
| `surf-cingulate-gyrus` | Corrected two-part affective-versus-cognitive split and unilateral cingulate lesion automatically causing leg weakness; avoided treatment-efficacy assertions. |
| `surf-parahippocampal-gyrus` | Replaced rodent postrhinal term with human parahippocampal cortex; removed Meyer-loop/PCA automatic superior quadrantanopia and definitive HSV olfactory route. |
| `surf-planum-temporale` | Removed A2=planum=Wernicke identity and dyslexia-asymmetry biomarker; corrected corticofugal description as projection rather than brachium target. |
| `ctx-v1` | Corrected obligatory macular sparing, obligatory Anton syndrome and false normal-OKN claim; documented retinotopic upper/lower inversion. |
| `ctx-v2` | Removed V2 as unique blind-spot filling-in source and incomplete-V1-map claim; avoided assigning V4/MT syndromes to V2. |
| `ctx-a1` | Separated direct callosal cortical connections from inferior-collicular commissure; removed fixed low-to-high map and forced bilateral word-deafness rule. |
| `ctx-a2` | Removed A2/planum/Wernicke equivalence and asymmetry diagnosing dyslexia; language pathways presented as multiple reciprocal connections. |
| `ctx-wernicke` | Removed single-node meaning storage, exact prevalence without primary citation, obligatory anosognosia and pure arcuate-disconnection theory. |
| `ctx-broca` | Corrected prose inferior-division MCA contradiction; removed Broca lesion as proof of articulation-only model and direct exclusive corticobulbar efferent. |
| `ctx-m1` | Corrected Betz-cells-as-all-output implication and rigid homuncular localization; removed accompanying aphasia/gaze as intrinsic M1 signs. |
| `ctx-s1` | Removed guaranteed preserved crude touch/no weakness and assigning all cortical discrimination exclusively to S1. |
| `ctx-premotor` | Removed apraxia as invariably contralateral/proximal and cortical lesion equated with lacunar ataxic hemiparesis; removed incorrect lateral-third frontopontine route. |
| `ctx-sma` | Removed obligatory transient/recovery timeline and alien-limb ownership stereotype; distinguished SMA from broader medial-frontal syndrome. |
| `ctx-entorhinal` | Replaced rodent postrhinal terminology; corrected transentorhinal early tau staging and removed deterministic causal/HSV-route claims. |
| `ctx-frontal-eye-fields` | Corrected fixed human BA8 label and pontine laterality conflation; removed direction as definitive localizer and exact midbrain-crossing claim. |
| `nuc-caudate-head` | Removed fixed anterior-third and mandatory ACA concurrence; Huntington degeneration not confined to head/body or a fixed onset site. |
| `nuc-caudate-body` | Corrected floor-versus-lateral-wall relationship and removed focal hemi-motor/hemi-sensory implication without capsule involvement. |
| `nuc-caudate-tail` | Removed tail-as-limbic-striatal-bridge and unsupported epilepsy-automatisms causal chain; separated territorial triad from caudate-tail function. |
| `nuc-putamen` | Removed putamenal DBS as routine therapy and fixed leg-face map; motor stroke signs qualified for capsular extension. |
| `nuc-globus-pallidus-externus` | Corrected STN input from minor to important; removed rate-model explanation for dystonia and universal toxin-selective-necrosis claim. |
| `nuc-globus-pallidus-internus` | Removed DBS-as-silencing/proof and fixed GPi output efficacy claims; separated thalamic intralaminar projection from descending path. |
| `nuc-ventral-striatum` | Removed shell/core classification of whole ventral striatum, mandatory infarct manifestations and claimed depression DBS efficacy. |
| `nuc-accumbens` | Removed humanized rodent shell/core functional dichotomy, presumed cavernous sinus drainage and universal DBS benefit. |
| `nuc-ventral-pallidum` | Removed animal taste-reaction result as human clinical certainty and categorical extended-amygdala membership. |
| `nuc-claustrum` | Preserved external/extreme capsule ordering; removed consciousness coordination as demonstrated lesion conclusion and majority-MCA-infarct assertion. |
| `nuc-hippocampus` | Separated hippocampus proper versus formation; removed surgery-as-universal-cure, H.M. selective lesion/infarct conflation and deterministic remote-memory preservation. |
| `nuc-dentate-gyrus` | Removed dentate major direct fornix/septal efferent, obligatory hemianopia/never-isolated language and unqualified adult-neurogenesis/exercise-treatment claims. |
| `nuc-amygdala` | Removed fast-threat-route as settled universal human pathway and amygdala destruction abolishing every fear response; qualified Klüver-Bucy. |
| `tract-fornix` | Added afferent direction and direct anterior thalamic route; removed dense-amnesia guarantee, colloid-cyst guaranteed reversibility/death and universal thiamine lesion involvement. |
| `tract-fornix-commissure` | Separated hippocampal commissure from splenial callosal transfer and rodent ventral-commissure extrapolation; removed callosotomy as proof of hippocampal-commissure seizure mechanism. |
| `tract-fimbria` | Removed efferent-only isolation claim and never-isolated/always-hemianopia assertion; retained choroidal fissure relationship. |
| `tract-corpus-callosum-rostrum` | Corrected rostrum position description relative to commissure; removed compulsory absence/high-riding ventricle in all agenesis patterns. |
| `tract-corpus-callosum-genu` | Removed busiest-region superlative and hand tactile transfer confused with anterior-only callosum. |
| `tract-corpus-callosum-body` | Removed unsupported majority-of-axons estimate/evolutionary layer claim, mandatory alien hand and prevention-of-all-generalization claim. |
| `tract-corpus-callosum-splenium` | Removed hippocampal commissural fibres as splenial efferent; qualified strict pure-alexia mechanism and guaranteed reversible splenial lesions. |
| `tract-internal-capsule-anterior-limb` | Corrected corticopontine crossing explanation and ataxia laterality; removed fixed anterior-half versus posterior-half blood supply. |
| `tract-internal-capsule-genu` | Removed narrowest-disproportionate-disability assertion and clumsy-but-never-weak rule; broadened syndrome localization. |
| `tract-internal-capsule-posterior-limb` | Corrected motor posterior-third error, posterior-limb/retrolenticular conflation, ataxia laterality and complete capsular triad determinism. |
| `tract-corona-radiata` | Corrected centrum-semiovale equivalence, fixed artery overlap and unsupported recovery-superiority claim. |
| `tract-optic-nerve` | Corrected monocular versus hemifield semantics, fixed macular-fibre fraction and temporal-crescent retinal inversion; removed optic-neuritis commonest-MS-first-symptom and diagnostic certainty. |
| `ctx-optic-chiasm` | Removed Wilbrand knee as normal anatomy, exact 53 percent crossing and junctional scotoma as pathognomonic; retained nasal crossing/temporal uncrossed rule. |
| `tract-optic-tract` | Removed Riddoch mislabel, tract congruity as definitive localization and SCN as distal optic-tract target. |
| `ctx-m1-toe` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-m1-leg` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-m1-trunk` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-m1-arm` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-m1-hand` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. Removed anatomical hand-knob synonym because the derived ribbon does not validate a patient hand-knob landmark. |
| `ctx-m1-face` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-m1-tongue` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-m1-larynx` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. The single most-lateral laryngeal patch is particularly uncertain: vocal control is distributed and has more than one motor representation. |
| `ctx-s1-toe` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-s1-leg` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-s1-trunk` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-s1-arm` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-s1-hand` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. Removed anatomical hand-knob synonym because the derived ribbon does not validate a patient hand-knob landmark. |
| `ctx-s1-face` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-s1-tongue` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. |
| `ctx-s1-larynx` | Removed fixed pyramid somatotopy, guaranteed Jacksonian next-segment march and lesion-as-leading-artery inference. Broad homuncular sequence retained only as schematic; bilateral axial/orofacial organization qualified. The single most-lateral laryngeal patch is particularly uncertain: vocal control is distributed and has more than one motor representation. |
| `nuc-subiculum` | Removed model-specific bursting-as-direct-cause and isolated syndrome certainty; subiculum properly described as principal hippocampal output field. |
| `nuc-ca1` | Removed CA1 vulnerability attributed to fixed watershed, universally most severe sclerosis and most-common seizure-onset claim. |
| `nuc-ca2-ca3` | Separated CA2 and CA3 functions/inputs; removed universal resistant-sector and mossy-fibre-sprouting as self-sufficient seizure generator. |
| `nuc-ca4` | Corrected CA4=entire-hilus equivalence and major fornix output claim; removed universal causal epilepsy chain and independent memory-preservation rule. |
| `nrv-cn1-olfactory` | Separated first-order fila from CNS bulb/second-order tract, removed centrifugal epithelium projection and same-first-order claim; removed structural-until-proven/partial-at-best prognostic rules. |
| `nrv-cn2-optic` | Corrected contralateral hemifield in nerve modality and ganglion cells called first-order; distinguished retinal from optic-nerve vascular disease, removed irreversible-trauma guarantee. |
| `tract-arcuate-fasciculus` | Added separate arcuate concept to avoid equating all SLF with temporal-frontal language pathway; no invented geometry. |
| `ctx-precentral-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-postcentral-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-paracentral-lobule` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-superior-frontal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-middle-frontal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-inferior-frontal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-superior-parietal-lobule` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-angular-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-supramarginal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-precuneus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-superior-temporal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-middle-temporal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-inferior-temporal-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-fusiform-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-cuneus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-lingual-gyrus` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-retrosplenial-cortex` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-dl-prefrontal` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-orbitofrontal` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-vm-prefrontal` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-s2` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-gustatory` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |
| `ctx-primary-olfactory` | Added source-based cortical concept; no dedicated mesh or invented quantitative coordinates. Function and clinical association apply to overlapping networks, not one diagnostic point. |

## Final source QA additions

CA4 is labeled **CA4 (hilar field)** and no longer uses the whole dentate hilus as an exact synonym. Preferential entorhinal laminar projections have an explicit primary monkey tracer source, with other-layer contributions retained: [Witter and Amaral, 1991](https://pubmed.ncbi.nlm.nih.gov/1713237/). The entorhinal tau-staging statement cites the original 83-brain pathological series, not the hippocampal circuit pages alone: [Braak and Braak, 1991](https://pubmed.ncbi.nlm.nih.gov/1759558/). Delayed hippocampal DWI visibility in transient global amnesia is supported by a small imaging series with timing-dependent detection; it is described as possible, not obligatory: [Weon et al., 2008](https://pubmed.ncbi.nlm.nih.gov/18451087/). Human dentate pattern-separation evidence is additionally supported by [a primary 7-T fMRI study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6705559/); it does not validate the displayed subfield marker.
