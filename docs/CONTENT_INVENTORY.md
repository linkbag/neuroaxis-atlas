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

- Region enum: `diencephalon | telencephalon | midbrain | pons | medulla | cerebellum` (`telencephalon` added by AMENDMENT B — see §3.6). Kind enum: `nucleus | tract | ventricle | surface | vessel | context`. Laterality: `midline | paired`.
- Slug prefixes: `nuc-`, `tract-`, `vent-`, `surf-`, `vasc-` (none in v1 — vascular map is string fields only), `ctx-` (context). Regex: `^(nuc|tract|vent|surf|vasc|ctx)-[a-z0-9-]+$`.
- **Current registry count (AMENDMENT B, `d1cefef`): 179 entries** — by region: diencephalon 38, telencephalon 46, midbrain 24, pons 34, medulla 32, cerebellum 5; by kind: nucleus 81, tract 51, surface 25, context 12, ventricle 10. **137 of the 179 carry an authored record** (118 structure + 19 tract); the remaining **42 are registry-only stubs** (all telencephalon — see §3.6). Registry count at the pinned revision below: 137 entries (by region field: diencephalon 42, midbrain 24, pons 34, medulla 32, cerebellum 5; by kind: nucleus 71, context 11, tract 36, ventricle 3, surface 16 — `vent-cerebral-aqueduct` carries region `diencephalon` per plan §3.1 CSF grouping; peduncle tracts carry their owning region: `tract-scp` midbrain, `tract-mcp` pons, `tract-icp` medulla). Two records are additions over the plan §3 list, both `kind:"context"`, added because the plate contract (§6) requires a `<slug>` for every region and §3.9 mandates "thalamus/hypothalamus blocks" on the sagittal plate: `ctx-thalamus-envelope`, `ctx-hypothalamus-envelope`. No group records were invented; tree grouping is region → subdivision → records.
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
