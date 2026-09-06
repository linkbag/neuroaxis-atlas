# Content Inventory — NeuroAxis 3D Brainstem Atlas

**Single source of truth for all content tasks.** Every structure, tract, level, plate and syndrome id used anywhere in this app must appear here and resolve in `src/data/taxonomy.json` (± `src/data/levels.json`). If a builder needs a new id they must NOT invent one: add it here AND to `taxonomy.json`, then flag the reviewer.

**Conventions (from ENGINEERING_PLAN §2, §3, §6):**
- Transverse plates: dorsal at top, **patient LEFT on image RIGHT** (clinical convention). Sagittal: anterior left, superior top. Coronal: patient left on image right, superior top.
- Orientation badges L/R (transverse, coronal) and A/P/S/I (sagittal) drawn in the SVG.
- Every drawn region carries `data-structure="<slug>"`; labels in `<g class="plate-label" data-for="<slug>">`.
- Palette: nuclei amber `#d97706`; cranial-nerve nuclei teal `#14b8a6`; ascending tracts blue `#3b82f6`; descending tracts violet `#8b5cf6`; mixed/connection tracts `#a78bfa`; ventricles cyan `#06b6d4`; surface slate `#64748b`; context gray `#94a3b8`. **Named overrides**: red nucleus `#b91c1c`; substantia nigra pars compacta `#1f2937`; substantia nigra pars reticulata `#374151`; locus coeruleus `#1d4ed8`.
- In plate lists below: **Required** = must be drawn and labeled; **Optional** = draw and label only if your section artistically includes it — if drawn it MUST carry the slug. Required count per plate is 18–40 including optionals drawn.
- `tract-dcml` and `tract-auditory-pathway` are **composite pathway records** — never tag them on plates; tag their component structures (fasciculi/nuclei/arcuate/ML; trapezoid/SOC/LL).

---

## 1. Level table (`src/data/levels.json`) — 13 entries, authoritative y anchors

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

Plate mapping: 9 transverse plates → `plate-pyramid-decuss`(lvl-pyramid-decuss), `plate-sensory-decuss`(lvl-sensory-decuss), `plate-olivary`(lvl-olivary), `plate-pons-caudal`(lvl-pons-caudal), `plate-pons-middle`(lvl-pons-middle), `plate-pons-rostral`(lvl-pons-rostral), `plate-midbrain-ic`(lvl-midbrain-ic), `plate-midbrain-sc`(lvl-midbrain-sc), `plate-thalamus-mid`(lvl-thalamus-mid). `lvl-spinal-medulla`, `lvl-pontomedullary`, `lvl-post-comm`, `lvl-thalamus-rostral` have **no** transverse plate; they exist for the 3D scene (envelopes, clipping) and the level ruler.

## 2. Registry conventions

- Region enum: `diencephalon | midbrain | pons | medulla | cerebellum`. Kind enum: `nucleus | tract | ventricle | surface | vessel | context`. Laterality: `midline | paired`.
- Slug prefixes: `nuc-`, `tract-`, `vent-`, `surf-`, `vasc-` (none in v1 — vascular map is string fields only), `ctx-` (context). Regex: `^(nuc|tract|vent|surf|vasc|ctx)-[a-z0-9-]+$`.
- Registry count: **137 entries** (by region field: diencephalon 42, midbrain 24, pons 34, medulla 32, cerebellum 5; by kind: nucleus 71, context 11, tract 36, ventricle 3, surface 16 — `vent-cerebral-aqueduct` carries region `diencephalon` per plan §3.1 CSF grouping; peduncle tracts carry their owning region: `tract-scp` midbrain, `tract-mcp` pons, `tract-icp` medulla). Two records are additions over the plan §3 list, both `kind:"context"`, added because the plate contract (§6) requires a `<slug>` for every region and §3.9 mandates "thalamus/hypothalamus blocks" on the sagittal plate: `ctx-thalamus-envelope`, `ctx-hypothalamus-envelope`. No group records were invented; tree grouping is region → subdivision → records.
- `parent` links (tree nesting to existing ids only): `nuc-edinger-westphal → nuc-oculomotor`, `nuc-pprf → nuc-pontine-reticular`.

---

## 3. Region tables (slug · name · subdivision · kind · function summary)

### 3.1 Diencephalon (41)

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

### 3.2 Midbrain (22)

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

### 3.3 Pons (27)

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
| `tract-spinal-trigeminal` / `nuc-spinal-trigeminal` | (listed under medulla, owner = medulla; present in the pons too, see §7 plates) | | | |

### 3.4 Medulla (25)

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

### 3.5 Cerebellum (5)

| slug | name | subdivision | kind | function summary |
| --- | --- | --- | --- | --- |
| `ctx-cerebellum` | Cerebellar hemispheres and vermis (context) | Cerebellar context | context | Envelope silhouette (two hemispheres + vermis bar); movement coordination, motor learning, balance. |
| `nuc-dentate` | Dentate nucleus | Deep cerebellar nuclei | nucleus | Largest efferent nucleus → SCP (dentatothalamocortical); motor planning; lesions → intention tremor. |
| `nuc-interposed` | Interposed nuclei (emboliform and globose) | Deep cerebellar nuclei | nucleus | Emboliform+globose; spinal-cerebellar limb correction; output via SCP. |
| `nuc-fastigial` | Fastigial nucleus | Deep cerebellar nuclei | nucleus | Vestibular/vermal output: axial posture, eye position/VOR; lesions → axial ataxia. |
| `surf-vermis` | Vermis | Surface landmarks | surface | Midline cerebellar surface; axial balance; midline tumors → truncal ataxia. |
| (peduncles) | `tract-scp` (midbrain owner) · `tract-icp` (medulla owner) · `tract-mcp` (pons owner) | | | |

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

---

## 5. Syndromes (`syndromes/*.json`, 23 records — §3.7)

`structures[]` ids below must resolve in `taxonomy.json` (they do).

| # | id | name (eponym/alt) | structures[] | vascularTerritory |
| --- | --- | --- | --- | --- |
| 1 | `syn-lateral-medullary` | Lateral medullary (Wallenberg) | nuc-spinal-trigeminal, tract-spinal-trigeminal, nuc-solitarius-caudal, nuc-ambiguus, nuc-dmv, tract-anterior-spinocerebellar, tract-spinothalamic, nuc-medullary-reticular | PICA / vertebral |
| 2 | `syn-medial-medullary` | Medial medullary | tract-pyramid, tract-medial-lemniscus, nuc-hypoglossal | Anterior spinal artery |
| 3 | `syn-hemimedullary` | Hemimedullary (combined) | tract-pyramid, tract-medial-lemniscus, nuc-hypoglossal, nuc-spinal-trigeminal, nuc-ambiguus, nuc-dmv, tract-spinothalamic | Vertebral disease |
| 4 | `syn-millard-gubler` | Millard-Gubler | nuc-facial, nuc-abducens, nuc-pprf, tract-corticospinal-lateral, tract-corticobulbar | Basilar paramedian perforators / AICA |
| 5 | `syn-foville` | Foville (dorsal pontine) | nuc-facial, nuc-abducens, nuc-pprf, tract-medial-lemniscus, tract-lateral-lemniscus | Basilar paramedian / AICA |
| 6 | `syn-locked-in` | Locked-in (ventral pons) | tract-corticospinal-lateral, tract-corticobulbar, ctx-pontine-nuclei, ctx-pontine-fibers | Basilar occlusion |
| 7 | `syn-cpm` | Central pontine myelinolysis | tract-corticospinal-lateral, tract-corticobulbar, ctx-pontine-nuclei | None (osmotic demyelination) |
| 8 | `syn-weber` | Weber | nuc-oculomotor, tract-crus-cerebri, tract-corticospinal-lateral, tract-corticobulbar | PCA (mesencephalic/perforating) |
| 9 | `syn-benedikt` | Benedikt | nuc-oculomotor, nuc-edinger-westphal, nuc-red-nucleus, tract-medial-lemniscus | PCA (posterior thalamoperforating / paramedian) |
| 10 | `syn-claude` | Claude | nuc-red-nucleus, nuc-oculomotor, nuc-dentate, tract-scp | PCA paramedian |
| 11 | `syn-nothnagel` | Nothnagel | nuc-superior-colliculus, nuc-oculomotor, nuc-red-nucleus | SCA / PCA |
| 12 | `syn-parinaud` | Parinaud (dorsal midbrain) | nuc-pretectal, nuc-superior-colliculus, nuc-pineal-gland, nuc-edinger-westphal | Collicular/quadrigeminal (or pineal mass) |
| 13 | `syn-ino` | Internuclear ophthalmoplegia (MLF) | tract-mlf, nuc-abducens, nuc-oculomotor | Basilar paramedian perforators |
| 14 | `syn-central-horner` | Central Horner | tract-hypothalamospinal, nuc-medullary-reticular | Vertebral / PICA |
| 15 | `syn-dejerine-roussy` | Déjérine-Roussy thalamic pain | nuc-vpl, nuc-pulvinar | PCA — thalamogeniculate |
| 16 | `syn-percheron` | Artery-of-Percheron (paramedian thalamic) | nuc-intralaminar, nuc-md, nuc-midline-thalamic | PCA — paramedian thalamic (Percheron) |
| 17 | `syn-tuberothalamic` | Tuberothalamic aphasia-plus (optional record) | nuc-thalamic-anterior, nuc-va, nuc-vl | PCA — tuberothalamic |
| 18 | `syn-korsakoff` | Korsakoff (Wernicke-Korsakoff) | nuc-mammillary-body, nuc-thalamic-anterior, nuc-md | None (thiamine deficiency) |
| 19 | `syn-hypothalamic` | Hypothalamic — DI / SIADH / autonomic | nuc-supraoptic, nuc-paraventricular, nuc-preoptic, nuc-ventromedial | PCA / anterior choroidal (and sellar disease) |
| 20 | `syn-pineal-region` | Pineal region tumor gaze palsy | nuc-pineal-gland, nuc-pretectal, nuc-superior-colliculus, nuc-edinger-westphal | None (mass effect) |
| 21 | `syn-parkinson` | Parkinson's disease | nuc-snc, nuc-snr | None (degenerative) |
| 22 | `syn-hemiballismus` | Hemiballismus | nuc-subthalamic | PCA / anterior choroidal (STN) |
| 23 | `syn-cerebellar` | Cerebellar signs (dentate/SCP) | nuc-dentate, nuc-interposed, nuc-fastigial, tract-scp | SCA / AICA |

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

Required (18):

- **Dorsomedial pair (dorsal → deep)**: `tract-fasciculus-gracilis` — dorsal, most medial (column of Goll); `nuc-nucleus-gracilis` — its caudal pole, immediately deep/ventral to the fasciculus; `tract-fasciculus-cuneatus` — dorsal, just lateral to the gracile column; `nuc-nucleus-cuneatus` — deep to the cuneate fasciculus.
- **Dorsolateral margin**: `tract-spinal-trigeminal` — the long dorsolateral subpial bundle at the lateral border; `nuc-spinal-trigeminal` — deep (medial) to the tract; `tract-posterior-spinocerebellar` — small subpial oval at the dorsolateral edge, immediately lateral to the spinal V tract.
- **Ventrolateral margin**: `tract-anterior-spinocerebellar` — most lateral, subpial; `tract-spinothalamic` — slightly deeper, between the anterior SCT and the spinal V surface; `tract-corticospinal-lateral` — in the lateral funiculus, just dorsal to the spinothalamic (crossed fibers already in the lateral column at this level).
- **Ventral**: `tract-pyramid` — the small uncrossed pyramid remnants, ventrolateral; `tract-pyramidal-decussation` — the prominent midline crossing bundle; its diagonal fibers interrupt the anterior median fissure.
- **Central/tegmental**: `tract-internal-arcuate` — fine fibers already arching ventromedially from the DC nuclei toward the midline; the crossing is completed at the next level; `tract-mlf` — small midline paramedian bundle just ventral to the central gray (interfascicular bundle); `nuc-medullary-reticular` — large intermediate tegmentum area lateral to the MLF and central gray; `tract-reticulospinal` — descends in the ventrolateral tegmentum, intermingled with the lateral RF.
- **Ventral surface**: `nuc-arcuate-medullary` — tiny superficial nodules at the ventromedial surface beside the decussation.
- **Lateral surface**: `surf-cn11-exit` — the spinal/cranial accessory rootlets ascending along the lateral margin.

Optional (1): `nuc-ambiguus` — rostral pole only, deep in the lateral tegmentum at the superior edge of this section; omit if not drawn.

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

Required (18):

- **Dorsal**: `nuc-inferior-colliculus` — paired humps, dorsal; `surf-cn4-exit` — dorsal midline, immediately below the ICs (trochlear roots emerging).
- **Central**: `vent-cerebral-aqueduct` — central round CSF space; `nuc-pag` — gray ring around the aqueduct; `nuc-mesencephalic-v` + `tract-mesencephalic-v` — dorsolateral, at the PAG lateral border.
- **Dorsomedial tegmentum**: `nuc-trochlear` — paramedian at the ventrolateral margin of the PAG, adjacent to the MLF; `tract-mlf` — paramedian pair, just lateral to the midline.
- **Midline ventral**: `tract-scp-decussation` — the dense crossing band in the ventral midline tegmentum; `tract-scp` — the peduncles entering the decussation from the ventrolateral (fibers routed dorsomedially); `nuc-dorsal-raphe` — midline, between the MLFs ventral to PAG.
- **Lateral tegmentum**: `tract-lateral-lemniscus` — ascending laterally into the IC; `tract-central-tegmental` — just lateral/ventral to the MLF region; `tract-spinothalamic` — ventrolateral tegmentum, lateral to the ML; `tract-medial-lemniscus` — paramedian ventral band (smaller, near the midline, dorsal to the decussation).
- **Dorsal-lateral tegmentum**: `nuc-cuneiform` — lateral to the PAG, in the dorsal-lateral tegmentum.
- **Descending midline bundle**: `tract-tectospinal` — descending in the dorsal/intermediate tegmentum just lateral to the raphe.
- **Posterior**: `ctx-cerebellum` — the cerebellum (superior surface) behind the ICs; draw the outline and tag with the context record.

### 7.8 `plate-midbrain-sc` — transverse @ `lvl-midbrain-sc` (y = +14) — **superior colliculus (CN III)**

Crux: the paired superior colliculi, the oculomotor complex in the midline, the red nucleus (large ovoid) and substantia nigra (dark ventral band) bilaterally; cerebral peduncles at the ventral surface with somatotopic subdivisions; interpeduncular fossa between them.

Required (21):

- **Dorsal**: `nuc-superior-colliculus` — paired dorsal humps; `nuc-pretectal` — at the rostral margin of this section (dorsomedial, just rostral to the SC — tag if drawn at the top edge).
- **Central**: `vent-cerebral-aqueduct`; `nuc-pag`; `nuc-mesencephalic-v` + `tract-mesencephalic-v` (dorsolateral PAG border).
- **Dorsomedial tegmentum**: `nuc-oculomotor` — midline complex between the MLFs, ventromedial tegmentum; `nuc-edinger-westphal` — immediately dorsal/rostral to the CN III complex, midline; `tract-mlf` — paramedian pair just lateral to the CN III complex; `nuc-dorsal-raphe` — midline, dorsal to the CN III complex.
- **Ventrolateral tegmentum**: `nuc-red-nucleus` — large ovoid, ventrolateral; `tract-rubrospinal` — fibers leaving the RN ventromedially (decussating within/below this level); `tract-central-tegmental` — lateral to the RN/ML; `tract-spinothalamic` — lateral to the ML; `tract-medial-lemniscus` — paramedian ventral tegmentum just dorsal to the SN; `tract-tectospinal` — midline, dorsal to the MLF (post-decussation descent).
- **Ventral**: `nuc-snc` — dark dorsal band of the substantia nigra; `nuc-snr` — ventral band, between SNc and the crus; `tract-crus-cerebri` — the paired ventral bundles (somatotopy medial→lateral: frontopontine, corticobulbar, corticospinal, temporoparietooccipitopontine — the crus record covers the bundle; optional finer tags: `tract-corticobulbar`, `tract-corticospinal-lateral`, `tract-corticopontine`).
- **Ventral surface**: `surf-interpeduncular-fossa` — midline triangle between the crura; `surf-cn3-exit` — CN III rootlets emerging from the medial crura into the fossa.

Optional (3): `ctx-cerebellum` (posterior margin, only if the section includes cerebellar surface), `tract-corticobulbar`, `tract-corticospinal-lateral`, `tract-corticopontine` (only if the crus somatotopy is drawn in subdivisions).

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

Required (23):

- **Dorsal**: `ctx-corpus-callosum` — the great arched white commissure; `nuc-pineal-gland` — behind/above the habenula, at the dorsal midline; `nuc-habenula` — small paramedian pair (drawn dotted at the midline just rostral to the pineal); `tract-stria-medullaris` — the fiber line running to the habenula along the dorsal thalamic edge; `tract-posterior-commissure` — small dorsal midline decussation just above the tectum.
- **Ventricular midline**: `vent-third-ventricle` — slit between corpus callosum and hypothalamus; `vent-cerebral-aqueduct` — the curved channel through the midbrain; `vent-fourth-ventricle` — tent-shaped cavity over the pons/medulla, apex at the obex.
- **Diencephalic blocks**: `ctx-thalamus-envelope` — the large thalamus block (tag the block; dotted nucleus silhouettes optional inside); `ctx-hypothalamus-envelope` — the hypothalamic wedge block; `nuc-mammillary-body` — two round dots at the wedge's caudal-ventral margin; `surf-optic-chiasm` — at the rostral-ventral margin; `surf-infundibulum` — the stalk descending from the tuberal region.
- **Tectum/midbrain**: `nuc-superior-colliculus` — dorsal hump above the aqueduct; `nuc-inferior-colliculus` — dorsal hump below the SC; `nuc-pag` — gray band around the aqueduct.
- **Brainstem profile**: `ctx-pontine-nuclei` — the ventral pontine block; `ctx-pontine-fibers` — the longitudinal fiber streak through it; `tract-pyramid` — the ventral medullary column continuing from the pons; `ctx-cerebellum` — the posterior block; `surf-vermis` — the vermis surface on the cerebellar block; `nuc-fastigial` — dotted deep-nucleus pair near the 4th ventricle roof (paramedian, drawn dashed on the midline); `surf-obex` — at the 4th ventricle caudal apex.

Optional (dotted paramedian pairs — label only with dotted-leader style): `nuc-thalamic-anterior`, `nuc-md`, `nuc-pulvinar`, `nuc-vpl` (dotted outlines inside the thalamus block), `nuc-paraventricular`, `nuc-arcuate-hypothalamic` (dotted, hypothalamus block), `tract-mlf` (dotted line along the dorsal brainstem), `nuc-dorsal-raphe` (midline dotted), `nuc-locus-coeruleus` (dotted, rostral pons floor), `nuc-pretectal` (dotted, rostral to the SC), `tract-scp` (dotted course from the dentate region to the decussation), `nuc-pontine-reticular` (dotted tegmentum), `nuc-hypoglossal` (dotted at the medullary floor).

### 7.11 `plate-coronal-midbrain` — coronal, through cerebral peduncles / red nucleus / substantia nigra

Coronal (frontal) section: patient left on image right, superior top. From superior to inferior: lentiform nucleus + internal capsule, subthalamus, midbrain (crus, SNc/SNr, RN, ML/MLF/CTT), then the rostral pons (basis + tegmentum) at the inferior margin.

Required (21):

- **Superior lateral**: `ctx-internal-capsule` — vertical white columns; `ctx-lenticular-nucleus` — lateral to the capsule.
- **Subthalamic zone**: `nuc-subthalamic` — lens-shaped, lateral, just dorsal to the SN; `nuc-zona-incerta` — thin band dorsal to the STN; `ctx-fields-of-forel` — white fiber zones medial to the zona incerta.
- **Midbrain tegmentum**: `nuc-red-nucleus` — paired ovoids, medial superior; `tract-mlf` — midline vertical pair, dorsal to the RN; `tract-central-tegmental` — lateral to the MLF bundle; `tract-medial-lemniscus` — vertical paramedian band ventral to the RN; `tract-spinothalamic` — lateral to the ML.
- **Ventral midbrain**: `nuc-snc` — the dark dorsal nigral band; `nuc-snr` — ventral nigral band; `tract-crus-cerebri` — the large paired descending bundles (with internal somatotopy: `tract-corticobulbar` medial, `tract-corticospinal-lateral` central, `tract-corticopontine` lateral — tag subdivisions only if drawn); `surf-interpeduncular-fossa` — the midline cleft between the crura; `surf-cn3-exit` — rootlets at the medial crus edges.
- **Inferior margin (rostral pons)**: `ctx-pontine-nuclei` — the basis block; `ctx-pontine-fibers` — the longitudinal fiber streaks; `nuc-pontine-reticular` — the tegmentum core.

Optional (7): `nuc-mammillary-body` + `vent-third-ventricle` — superior medial margin (only if the section extends into the caudal diencephalon); `ctx-caudate-nucleus` — superior lateral tip; `tract-scp` — dashed bundle at the superior margin adjacent to the RN (dentatothalamic); `nuc-pag` + `vent-cerebral-aqueduct` — only if the section plane reaches the dorsal (posterior) midbrain; `nuc-dorsal-raphe` — midline, dorsal to the CN III region.

### 7.12 `plate-coronal-thalamus` — coronal, through thalamus / 3rd ventricle / LGN / MGN / pineal (+ cerebral peduncle slice below)

Coronal (frontal) section at the caudal diencephalon: patient left on image right, superior top. Superior: pineal/habenula; middle: the two thalami with nuclear groups around the 3rd ventricle; inferior: the cerebral peduncle slice (transition into the midbrain).

Required (29):

- **Dorsal midline**: `nuc-pineal-gland` — midline, superior; `nuc-habenula` — paramedian pair, rostral-ventral to the pineal; `vent-third-ventricle` — the midline slit between the thalami; `nuc-midline-thalamic` — nuclei along the ventricle wall; `nuc-intralaminar` (CM-PF) — lateral to the midline; `ctx-internal-medullary-lamina` — the Y-shaped white lamina.
- **Thalamic masses (per side, medial → lateral / dorsal → ventral)**: `nuc-md` — medial; `nuc-thalamic-anterior` — dorsal pole; `nuc-lateral-dorsal` — dorsolateral; `nuc-lateral-posterior` — lateral; `nuc-pulvinar` — posterior mass (dominant at this caudal level); `nuc-va` — anteroventral; `nuc-vl` — ventrolateral; `nuc-vpl` — ventrolateral (leg lateral); `nuc-vpm` — ventromedial, adjacent to the midline; `nuc-thalamic-reticular` — thin lateral shell; `ctx-thalamus-envelope` — use to tag the fused mass outline IF drawn as a block (prefer individual nucleus tags when drawn separately).
- **Caudolateral**: `nuc-lgn` — lateral, below the pulvinar; `nuc-mgn` — medial to the LGN, dorsomedial to the cerebral peduncle.
- **Lateral**: `ctx-internal-capsule` — the vertical white bands; `ctx-lenticular-nucleus` — lateral to the capsule (upper part).
- **Inferior**: `nuc-subthalamic` — lens-shaped, above the peduncle slice; `nuc-zona-incerta` — dorsal to the STN; `ctx-fields-of-forel` — H1/H2 zones; `nuc-mammillary-body` — paired at the inferior midline; `tract-crus-cerebri` — the cerebral peduncle slice at the inferior margin (with somatotopy subdivisions `tract-corticobulbar`, `tract-corticospinal-lateral`, `tract-corticopontine` if drawn).

Optional (8): `ctx-caudate-nucleus` (superolateral tip), `tract-posterior-commissure` (dorsal midline, dotted), `nuc-ventromedial`, `nuc-dorsomedial`, `nuc-arcuate-hypothalamic`, `nuc-supraoptic` (inferomedial hypothalamic margin, only if the section extends rostrally), `surf-optic-chiasm` (inferior margin, rostral-most sections), `nuc-paraventricular` (dotted at the 3rd ventricle wall).

---

## 8. Verification checklist for this document

- [ ] Every slug listed above resolves exactly in `src/data/taxonomy.json` (cross-checked with a Node script).
- [ ] All 12 plate ids match §3.9: 9 transverse + `plate-sagittal-midline` + `plate-coronal-midbrain` + `plate-coronal-thalamus`.
- [ ] Required count per plate is 18–40; optionals are clearly marked.
- [ ] No slug or id was renamed; new ids (`ctx-thalamus-envelope`, `ctx-hypothalamus-envelope`) are additions flagged in §2.
