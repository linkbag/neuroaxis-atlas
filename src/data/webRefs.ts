/**
 * webRefs.ts — per-structure web references (v2.1 "learn more" feature).
 *
 * Keyed by taxonomy slug. Each entry is a curated, stable, authoritative
 * link (Wikipedia + a small set of high-confidence academic sources). For
 * slugs without a curated entry, a safe automatic Wikipedia link is derived
 * from the record's display name (parentheticals/qualifiers stripped).
 * Context silhouette tags (vessel/context envelopes) are skipped or pointed
 * at the parent structure's page.
 *
 * Scholarly "refs" (Blumenfeld chapter citations) are separate and live in
 * the data JSONs; this module is purely external, clickable links.
 */

export interface WebRef {
  /** Short, human-readable link text, e.g. "Wikipedia — Pulvinar nuclei". */
  label: string
  /** Absolute URL (https). */
  url: string
  /** Where the link points. */
  source: 'wikipedia' | 'journal' | 'reference'
}

/** En.wikipedia.org URL from a title (spaces → underscores, URL-encoded). */
function wiki(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.trim().replace(/\s+/g, '_'))}`
}

/**
 * High-confidence academic sources for the telencephalon (v7). Each DOI was
 * resolved and title-checked against Crossref before being listed here.
 */
const BG_LOOPS: WebRef = {
  source: 'journal',
  label: 'Alexander, DeLong & Strick 1986 — Parallel organization of functionally segregated circuits linking basal ganglia and cortex (Annu Rev Neurosci)',
  url: 'https://doi.org/10.1146/annurev.ne.09.030186.002041',
}

const DISCONNECTION: WebRef = {
  source: 'journal',
  label: 'Catani & ffytche 2005 — The rises and falls of disconnection syndromes (Brain)',
  url: 'https://doi.org/10.1093/brain/awh622',
}

const TRACTOGRAPHY_ATLAS: WebRef = {
  source: 'journal',
  label: 'Catani & Thiebaut de Schotten 2008 — A diffusion tensor imaging tractography atlas for virtual in vivo dissections (Cortex)',
  url: 'https://doi.org/10.1016/j.cortex.2008.05.004',
}

const HIPPOCAMPAL_LESION: WebRef = {
  source: 'journal',
  label: 'Scoville & Milner 1957 — Loss of recent memory after bilateral hippocampal lesions (J Neurol Neurosurg Psychiatry)',
  url: 'https://doi.org/10.1136/jnnp.20.1.11',
}

const CSF_SECRETION: WebRef = {
  source: 'journal',
  label: 'Damkier, Brown & Praetorius 2013 — Cerebrospinal fluid secretion by the choroid plexus (Physiol Rev)',
  url: 'https://doi.org/10.1152/physrev.00004.2013',
}

/**
 * v9 somatotopy sources. The two DOIs are the primary evidence for the map the
 * 16 segment records describe: Penfield & Boldrey's electrical-stimulation
 * series is where the homunculus comes from, and the fMRI papers are where its
 * modern (and partly revised) form comes from. All three DOIs were resolved.
 */
const PENFIELD_BOLDREY: WebRef = {
  source: 'journal',
  label: 'Penfield & Boldrey 1937 — Somatic motor and sensory representation in the cerebral cortex of man as studied by electrical stimulation (Brain)',
  url: 'https://doi.org/10.1093/brain/60.4.389',
}

const FLESHER_HAND_KNOB: WebRef = {
  source: 'journal',
  label: 'Yousry et al. 1997 — Localization of the motor hand area to a knob on the precentral gyrus: a new landmark (Brain)',
  url: 'https://doi.org/10.1093/brain/120.1.141',
}

const KAAS_SOMATOSENSORY: WebRef = {
  source: 'journal',
  label: 'Kaas 1993 — The functional organization of somatosensory cortex in primates (Ann Anat)',
  url: 'https://doi.org/10.1016/S0940-9602(11)80212-8',
}

/** Curated map: slug → web refs. Titles are the exact Wikipedia article titles. */
const curated: Record<string, WebRef[]> = {
  // ---- Diencephalon: Thalamus ----
  'nuc-thalamic-anterior': [{ source: 'wikipedia', label: 'Wikipedia — Anterior nuclei of thalamus', url: wiki('Anterior nuclei of thalamus') }],
  'nuc-va': [{ source: 'wikipedia', label: 'Wikipedia — Ventral anterior nucleus', url: wiki('Ventral anterior nucleus') }],
  'nuc-vl': [{ source: 'wikipedia', label: 'Wikipedia — Ventral lateral nucleus', url: wiki('Ventral lateral nucleus') }],
  'nuc-vpl': [{ source: 'wikipedia', label: 'Wikipedia — Ventral posterolateral nucleus', url: wiki('Ventral posterolateral nucleus') }],
  'nuc-vpm': [{ source: 'wikipedia', label: 'Wikipedia — Ventral posteromedial nucleus', url: wiki('Ventral posteromedial nucleus') }],
  'nuc-lateral-dorsal': [{ source: 'wikipedia', label: 'Wikipedia — Lateral dorsal nucleus of thalamus', url: wiki('Lateral dorsal nucleus of thalamus') }],
  'nuc-lateral-posterior': [{ source: 'wikipedia', label: 'Wikipedia — Lateral posterior nucleus of thalamus', url: wiki('Lateral posterior nucleus of thalamus') }],
  'nuc-pulvinar': [{ source: 'wikipedia', label: 'Wikipedia — Pulvinar nuclei', url: wiki('Pulvinar nuclei') }],
  'nuc-md': [{ source: 'wikipedia', label: 'Wikipedia — Mediodorsal nucleus', url: wiki('Mediodorsal nucleus') }],
  'nuc-intralaminar': [{ source: 'wikipedia', label: 'Wikipedia — Intralaminar nuclei of thalamus', url: wiki('Intralaminar nuclei of thalamus') }],
  'nuc-midline-thalamic': [{ source: 'wikipedia', label: 'Wikipedia — Midline nuclear group', url: wiki('Midline nuclear group') }],
  'nuc-thalamic-reticular': [{ source: 'wikipedia', label: 'Wikipedia — Reticular nucleus of thalamus', url: wiki('Reticular nucleus of thalamus') }],
  'nuc-lgn': [{ source: 'wikipedia', label: 'Wikipedia — Lateral geniculate nucleus', url: wiki('Lateral geniculate nucleus') }],
  'nuc-mgn': [{ source: 'wikipedia', label: 'Wikipedia — Medial geniculate nucleus', url: wiki('Medial geniculate nucleus') }],
  'ctx-thalamus-envelope': [{ source: 'wikipedia', label: 'Wikipedia — Thalamus', url: wiki('Thalamus') }],
  'ctx-internal-medullary-lamina': [{ source: 'wikipedia', label: 'Wikipedia — Internal medullary lamina', url: wiki('Internal medullary lamina') }],

  // ---- Diencephalon: Hypothalamus ----
  'nuc-preoptic': [{ source: 'wikipedia', label: 'Wikipedia — Preoptic area', url: wiki('Preoptic area') }],
  'nuc-suprachiasmatic': [{ source: 'wikipedia', label: 'Wikipedia — Suprachiasmatic nucleus', url: wiki('Suprachiasmatic nucleus') }],
  'nuc-supraoptic': [{ source: 'wikipedia', label: 'Wikipedia — Supraoptic nucleus', url: wiki('Supraoptic nucleus') }],
  'nuc-paraventricular': [{ source: 'wikipedia', label: 'Wikipedia — Paraventricular nucleus of hypothalamus', url: wiki('Paraventricular nucleus of hypothalamus') }],
  'nuc-arcuate-hypothalamic': [{ source: 'wikipedia', label: 'Wikipedia — Arcuate nucleus (hypothalamus)', url: wiki('Arcuate nucleus (hypothalamus)') }],
  'nuc-ventromedial': [{ source: 'wikipedia', label: 'Wikipedia — Ventromedial nucleus of hypothalamus', url: wiki('Ventromedial nucleus of hypothalamus') }],
  'nuc-dorsomedial': [{ source: 'wikipedia', label: 'Wikipedia — Dorsomedial nucleus of hypothalamus', url: wiki('Dorsomedial nucleus of hypothalamus') }],
  'nuc-posterior-hypothalamus': [{ source: 'wikipedia', label: 'Wikipedia — Posterior nucleus of hypothalamus', url: wiki('Posterior nucleus of hypothalamus') }],
  'nuc-mammillary-body': [{ source: 'wikipedia', label: 'Wikipedia — Mammillary body', url: wiki('Mammillary body') }],
  'ctx-hypothalamus-envelope': [{ source: 'wikipedia', label: 'Wikipedia — Hypothalamus', url: wiki('Hypothalamus') }],

  // ---- Diencephalon: Epithalamus / Subthalamus ----
  'nuc-pineal-gland': [{ source: 'wikipedia', label: 'Wikipedia — Pineal gland', url: wiki('Pineal gland') }],
  'nuc-habenula': [{ source: 'wikipedia', label: 'Wikipedia — Habenula', url: wiki('Habenula') }],
  'tract-stria-medullaris': [{ source: 'wikipedia', label: 'Wikipedia — Stria medullaris of thalamus', url: wiki('Stria medullaris of thalamus') }],
  'tract-posterior-commissure': [{ source: 'wikipedia', label: 'Wikipedia — Posterior commissure', url: wiki('Posterior commissure') }],
  'nuc-subthalamic': [{ source: 'wikipedia', label: 'Wikipedia — Subthalamic nucleus', url: wiki('Subthalamic nucleus') }],
  'nuc-zona-incerta': [{ source: 'wikipedia', label: 'Wikipedia — Zona incerta', url: wiki('Zona incerta') }],

  // ---- Ventricles + diencephalon surfaces ----
  'vent-third-ventricle': [{ source: 'wikipedia', label: 'Wikipedia — Third ventricle', url: wiki('Third ventricle') }],
  'vent-cerebral-aqueduct': [{ source: 'wikipedia', label: 'Wikipedia — Cerebral aqueduct', url: wiki('Cerebral aqueduct') }],
  'surf-optic-chiasm': [{ source: 'wikipedia', label: 'Wikipedia — Optic chiasm', url: wiki('Optic chiasm') }],
  'surf-infundibulum': [{ source: 'wikipedia', label: 'Wikipedia — Pituitary stalk (infundibulum)', url: wiki('Pituitary stalk') }],

  // ---- Midbrain ----
  'nuc-superior-colliculus': [{ source: 'wikipedia', label: 'Wikipedia — Superior colliculus', url: wiki('Superior colliculus') }],
  'nuc-inferior-colliculus': [{ source: 'wikipedia', label: 'Wikipedia — Inferior colliculus', url: wiki('Inferior colliculus') }],
  'nuc-pretectal': [{ source: 'wikipedia', label: 'Wikipedia — Pretectal area', url: wiki('Pretectal area') }],
  'nuc-pag': [{ source: 'wikipedia', label: 'Wikipedia — Periaqueductal gray', url: wiki('Periaqueductal gray') }],
  'nuc-oculomotor': [{ source: 'wikipedia', label: 'Wikipedia — Oculomotor nucleus', url: wiki('Oculomotor nucleus') }],
  'nuc-edinger-westphal': [{ source: 'wikipedia', label: 'Wikipedia — Edinger–Westphal nucleus', url: wiki('Edinger–Westphal nucleus') }],
  'nuc-trochlear': [{ source: 'wikipedia', label: 'Wikipedia — Trochlear nucleus', url: wiki('Trochlear nucleus') }],
  'nuc-mesencephalic-v': [{ source: 'wikipedia', label: 'Wikipedia — Mesencephalic nucleus of trigeminal nerve', url: wiki('Mesencephalic nucleus of trigeminal nerve') }],
  'tract-mesencephalic-v': [{ source: 'wikipedia', label: 'Wikipedia — Mesencephalic nucleus of trigeminal nerve', url: wiki('Mesencephalic nucleus of trigeminal nerve') }],
  'nuc-red-nucleus': [{ source: 'wikipedia', label: 'Wikipedia — Red nucleus', url: wiki('Red nucleus') }],
  'nuc-snc': [{ source: 'wikipedia', label: 'Wikipedia — Substantia nigra', url: wiki('Substantia nigra') }],
  'nuc-snr': [{ source: 'wikipedia', label: 'Wikipedia — Substantia nigra', url: wiki('Substantia nigra') }],
  'tract-crus-cerebri': [{ source: 'wikipedia', label: 'Wikipedia — Cerebral crus', url: wiki('Cerebral crus') }],
  'tract-scp-decussation': [{ source: 'wikipedia', label: 'Wikipedia — Superior cerebellar peduncle', url: wiki('Superior cerebellar peduncle') }],
  'tract-central-tegmental': [{ source: 'wikipedia', label: 'Wikipedia — Central tegmental tract', url: wiki('Central tegmental tract') }],
  'tract-mlf': [{ source: 'wikipedia', label: 'Wikipedia — Medial longitudinal fasciculus', url: wiki('Medial longitudinal fasciculus') }],
  'tract-scp': [{ source: 'wikipedia', label: 'Wikipedia — Superior cerebellar peduncle', url: wiki('Superior cerebellar peduncle') }],
  'nuc-dorsal-raphe': [{ source: 'wikipedia', label: 'Wikipedia — Dorsal raphe nucleus', url: wiki('Dorsal raphe nucleus') }],
  'nuc-cuneiform': [{ source: 'wikipedia', label: 'Wikipedia — Cuneiform nucleus', url: wiki('Cuneiform nucleus') }],

  // ---- Pons ----
  'ctx-pontine-nuclei': [{ source: 'wikipedia', label: 'Wikipedia — Pontine nuclei', url: wiki('Pontine nuclei') }],
  'nuc-trigeminal-motor': [{ source: 'wikipedia', label: 'Wikipedia — Trigeminal motor nucleus', url: wiki('Trigeminal motor nucleus') }],
  'nuc-principal-sensory-v': [{ source: 'wikipedia', label: 'Wikipedia — Principal sensory nucleus of trigeminal nerve', url: wiki('Principal sensory nucleus of trigeminal nerve') }],
  'nuc-abducens': [{ source: 'wikipedia', label: 'Wikipedia — Abducens nucleus', url: wiki('Abducens nucleus') }],
  'nuc-facial': [{ source: 'wikipedia', label: 'Wikipedia — Facial motor nucleus', url: wiki('Facial motor nucleus') }],
  'nuc-superior-salivatory': [{ source: 'wikipedia', label: 'Wikipedia — Superior salivatory nucleus', url: wiki('Superior salivatory nucleus') }],
  'nuc-solitarius-rostral': [{ source: 'wikipedia', label: 'Wikipedia — Solitary nucleus', url: wiki('Solitary nucleus') }],
  'nuc-vestibular-superior': [{ source: 'wikipedia', label: 'Wikipedia — Superior vestibular nucleus', url: wiki('Superior vestibular nucleus') }],
  'nuc-vestibular-medial': [{ source: 'wikipedia', label: 'Wikipedia — Medial vestibular nucleus', url: wiki('Medial vestibular nucleus') }],
  'nuc-vestibular-lateral': [{ source: 'wikipedia', label: 'Wikipedia — Lateral vestibular nucleus', url: wiki('Lateral vestibular nucleus') }],
  'nuc-vestibular-inferior': [{ source: 'wikipedia', label: 'Wikipedia — Inferior vestibular nucleus', url: wiki('Inferior vestibular nucleus') }],
  'nuc-cochlear-ventral': [{ source: 'wikipedia', label: 'Wikipedia — Ventral cochlear nucleus', url: wiki('Ventral cochlear nucleus') }],
  'nuc-cochlear-dorsal': [{ source: 'wikipedia', label: 'Wikipedia — Dorsal cochlear nucleus', url: wiki('Dorsal cochlear nucleus') }],
  'nuc-superior-olivary': [{ source: 'wikipedia', label: 'Wikipedia — Superior olivary complex', url: wiki('Superior olivary complex') }],
  'tract-trapezoid-body': [{ source: 'wikipedia', label: 'Wikipedia — Trapezoid body', url: wiki('Trapezoid body') }],
  'tract-lateral-lemniscus': [{ source: 'wikipedia', label: 'Wikipedia — Lateral lemniscus', url: wiki('Lateral lemniscus') }],
  'tract-mcp': [{ source: 'wikipedia', label: 'Wikipedia — Middle cerebellar peduncle', url: wiki('Middle cerebellar peduncle') }],
  'nuc-locus-coeruleus': [{ source: 'wikipedia', label: 'Wikipedia — Locus coeruleus', url: wiki('Locus coeruleus') }],
  'nuc-pontine-reticular': [{ source: 'wikipedia', label: 'Wikipedia — Pontine reticular formation', url: wiki('Pontine reticular formation') }],
  'nuc-pprf': [{ source: 'wikipedia', label: 'Wikipedia — Paramedian pontine reticular formation', url: wiki('Paramedian pontine reticular formation') }],

  // ---- Medulla ----
  'tract-pyramid': [{ source: 'wikipedia', label: 'Wikipedia — Medullary pyramids', url: wiki('Medullary pyramids') }],
  'tract-pyramidal-decussation': [{ source: 'wikipedia', label: 'Wikipedia — Pyramidal decussation', url: wiki('Pyramidal decussation') }],
  'tract-internal-arcuate': [{ source: 'wikipedia', label: 'Wikipedia — Internal arcuate fibers', url: wiki('Internal arcuate fibers') }],
  'tract-fasciculus-gracilis': [{ source: 'wikipedia', label: 'Wikipedia — Fasciculus gracilis', url: wiki('Fasciculus gracilis') }],
  'nuc-nucleus-gracilis': [{ source: 'wikipedia', label: 'Wikipedia — Nucleus gracilis', url: wiki('Nucleus gracilis') }],
  'tract-fasciculus-cuneatus': [{ source: 'wikipedia', label: 'Wikipedia — Fasciculus cuneatus', url: wiki('Fasciculus cuneatus') }],
  'nuc-nucleus-cuneatus': [{ source: 'wikipedia', label: 'Wikipedia — Nucleus cuneatus', url: wiki('Nucleus cuneatus') }],
  'nuc-inferior-olive-principal': [{ source: 'wikipedia', label: 'Wikipedia — Inferior olivary nucleus', url: wiki('Inferior olivary nucleus') }],
  'nuc-inferior-olive-medial': [{ source: 'wikipedia', label: 'Wikipedia — Inferior olivary nucleus', url: wiki('Inferior olivary nucleus') }],
  'tract-medial-lemniscus': [{ source: 'wikipedia', label: 'Wikipedia — Medial lemniscus', url: wiki('Medial lemniscus') }],
  'tract-spinal-trigeminal': [{ source: 'wikipedia', label: 'Wikipedia — Spinal trigeminal tract', url: wiki('Spinal trigeminal tract') }],
  'nuc-spinal-trigeminal': [{ source: 'wikipedia', label: 'Wikipedia — Spinal trigeminal nucleus', url: wiki('Spinal trigeminal nucleus') }],
  'nuc-solitarius-caudal': [{ source: 'wikipedia', label: 'Wikipedia — Solitary nucleus', url: wiki('Solitary nucleus') }],
  'nuc-dmv': [{ source: 'wikipedia', label: 'Wikipedia — Dorsal nucleus of vagus nerve', url: wiki('Dorsal nucleus of vagus nerve') }],
  'nuc-ambiguus': [{ source: 'wikipedia', label: 'Wikipedia — Nucleus ambiguus', url: wiki('Nucleus ambiguus') }],
  'nuc-hypoglossal': [{ source: 'wikipedia', label: 'Wikipedia — Hypoglossal nucleus', url: wiki('Hypoglossal nucleus') }],
  'nuc-area-postrema': [{ source: 'wikipedia', label: 'Wikipedia — Area postrema', url: wiki('Area postrema') }],
  'tract-icp': [{ source: 'wikipedia', label: 'Wikipedia — Inferior cerebellar peduncle', url: wiki('Inferior cerebellar peduncle') }],
  'tract-dcml': [{ source: 'wikipedia', label: 'Wikipedia — Dorsal column–medial lemniscus pathway', url: wiki('Dorsal column–medial lemniscus pathway') }],
  'vent-fourth-ventricle': [{ source: 'wikipedia', label: 'Wikipedia — Fourth ventricle', url: wiki('Fourth ventricle') }],
  'surf-obex': [{ source: 'wikipedia', label: 'Wikipedia — Obex', url: wiki('Obex') }],

  // ---- Cerebellum ----
  'ctx-cerebellum': [{ source: 'wikipedia', label: 'Wikipedia — Cerebellum', url: wiki('Cerebellum') }],
  'nuc-dentate': [{ source: 'wikipedia', label: 'Wikipedia — Dentate nucleus', url: wiki('Dentate nucleus') }],
  'nuc-interposed': [{ source: 'wikipedia', label: 'Wikipedia — Interposed nucleus', url: wiki('Interposed nucleus') }],
  'nuc-fastigial': [{ source: 'wikipedia', label: 'Wikipedia — Fastigial nucleus', url: wiki('Fastigial nucleus') }],
  'surf-vermis': [{ source: 'wikipedia', label: 'Wikipedia — Cerebellar vermis', url: wiki('Cerebellar vermis') }],

  // ---- Major tracts ----
  'tract-spinothalamic': [{ source: 'wikipedia', label: 'Wikipedia — Spinothalamic tract', url: wiki('Spinothalamic tract') }],
  'tract-trigeminothalamic-ventral': [{ source: 'wikipedia', label: 'Wikipedia — Ventral trigeminothalamic tract', url: wiki('Ventral trigeminothalamic tract') }],
  'tract-trigeminothalamic-dorsal': [{ source: 'wikipedia', label: 'Wikipedia — Dorsal trigeminothalamic tract', url: wiki('Dorsal trigeminothalamic tract') }],
  'tract-posterior-spinocerebellar': [{ source: 'wikipedia', label: 'Wikipedia — Posterior spinocerebellar tract', url: wiki('Posterior spinocerebellar tract') }],
  'tract-anterior-spinocerebellar': [{ source: 'wikipedia', label: 'Wikipedia — Anterior spinocerebellar tract', url: wiki('Anterior spinocerebellar tract') }],
  'tract-auditory-pathway': [{ source: 'wikipedia', label: 'Wikipedia — Auditory system', url: wiki('Auditory system') }],
  'tract-spinoreticular': [{ source: 'wikipedia', label: 'Wikipedia — Spinoreticular tract', url: wiki('Spinoreticular tract') }],
  'tract-corticospinal-lateral': [{ source: 'wikipedia', label: 'Wikipedia — Corticospinal tract', url: wiki('Corticospinal tract') }],
  'tract-corticobulbar': [{ source: 'wikipedia', label: 'Wikipedia — Corticobulbar tract', url: wiki('Corticobulbar tract') }],
  'tract-corticopontine': [{ source: 'wikipedia', label: 'Wikipedia — Corticopontine fibers', url: wiki('Corticopontine fibers') }],
  'tract-rubrospinal': [{ source: 'wikipedia', label: 'Wikipedia — Rubrospinal tract', url: wiki('Rubrospinal tract') }],
  'tract-tectospinal': [{ source: 'wikipedia', label: 'Wikipedia — Tectospinal tract', url: wiki('Tectospinal tract') }],
  'tract-lateral-vestibulospinal': [{ source: 'wikipedia', label: 'Wikipedia — Lateral vestibulospinal tract', url: wiki('Lateral vestibulospinal tract') }],
  'tract-medial-vestibulospinal': [{ source: 'wikipedia', label: 'Wikipedia — Medial vestibulospinal tract', url: wiki('Medial vestibulospinal tract') }],
  'tract-reticulospinal': [{ source: 'wikipedia', label: 'Wikipedia — Reticulospinal tract', url: wiki('Reticulospinal tract') }],
  'tract-hypothalamospinal': [{ source: 'wikipedia', label: 'Wikipedia — Hypothalamospinal tract', url: wiki('Hypothalamospinal tract') }],

  // ---- Telencephalon: cerebral cortex (ribbon, lobes, gyri) ----
  'ctx-cerebral-cortex': [{ source: 'wikipedia', label: 'Wikipedia — Cerebral cortex', url: wiki('Cerebral cortex') }],
  'surf-frontal-lobe': [{ source: 'wikipedia', label: 'Wikipedia — Frontal lobe', url: wiki('Frontal lobe') }],
  'surf-parietal-lobe': [{ source: 'wikipedia', label: 'Wikipedia — Parietal lobe', url: wiki('Parietal lobe') }],
  'surf-temporal-lobe': [{ source: 'wikipedia', label: 'Wikipedia — Temporal lobe', url: wiki('Temporal lobe') }],
  'surf-occipital-lobe': [{ source: 'wikipedia', label: 'Wikipedia — Occipital lobe', url: wiki('Occipital lobe') }],
  'surf-insula': [{ source: 'wikipedia', label: 'Wikipedia — Insular cortex', url: wiki('Insular cortex') }],
  'surf-limbic-lobe': [{ source: 'wikipedia', label: 'Wikipedia — Limbic lobe', url: wiki('Limbic lobe') }],
  'surf-cingulate-gyrus': [{ source: 'wikipedia', label: 'Wikipedia — Cingulate cortex', url: wiki('Cingulate cortex') }],
  'surf-parahippocampal-gyrus': [{ source: 'wikipedia', label: 'Wikipedia — Parahippocampal gyrus', url: wiki('Parahippocampal gyrus') }],
  'surf-planum-temporale': [{ source: 'wikipedia', label: 'Wikipedia — Planum temporale', url: wiki('Planum temporale') }],

  // ---- Telencephalon: basal ganglia ----
  'ctx-lenticular-nucleus': [{ source: 'wikipedia', label: 'Wikipedia — Lentiform nucleus', url: wiki('Lentiform nucleus') }],
  'ctx-caudate-nucleus': [{ source: 'wikipedia', label: 'Wikipedia — Caudate nucleus', url: wiki('Caudate nucleus') }],
  'nuc-caudate-head': [
    { source: 'wikipedia', label: 'Wikipedia — Caudate nucleus', url: wiki('Caudate nucleus') },
    { ...BG_LOOPS },
  ],
  'nuc-caudate-body': [{ source: 'wikipedia', label: 'Wikipedia — Caudate nucleus', url: wiki('Caudate nucleus') }],
  'nuc-caudate-tail': [{ source: 'wikipedia', label: 'Wikipedia — Caudate nucleus', url: wiki('Caudate nucleus') }],
  'nuc-putamen': [
    { source: 'wikipedia', label: 'Wikipedia — Putamen', url: wiki('Putamen') },
    { ...BG_LOOPS },
  ],
  'nuc-globus-pallidus-externus': [{ source: 'wikipedia', label: 'Wikipedia — Globus pallidus', url: wiki('Globus pallidus') }],
  'nuc-globus-pallidus-internus': [
    { source: 'wikipedia', label: 'Wikipedia — Globus pallidus', url: wiki('Globus pallidus') },
    { ...BG_LOOPS },
  ],
  'nuc-ventral-striatum': [
    { source: 'wikipedia', label: 'Wikipedia — Ventral striatum', url: wiki('Ventral striatum') },
    { source: 'wikipedia', label: 'Wikipedia — Nucleus accumbens', url: wiki('Nucleus accumbens') },
    { ...BG_LOOPS },
  ],

  // ---- Telencephalon: limbic system ----
  'nuc-hippocampus': [
    { source: 'wikipedia', label: 'Wikipedia — Hippocampus', url: wiki('Hippocampus') },
    { ...HIPPOCAMPAL_LESION },
  ],
  'nuc-dentate-gyrus': [{ source: 'wikipedia', label: 'Wikipedia — Dentate gyrus', url: wiki('Dentate gyrus') }],
  'nuc-amygdala': [{ source: 'wikipedia', label: 'Wikipedia — Amygdala', url: wiki('Amygdala') }],
  'tract-fornix': [{ source: 'wikipedia', label: 'Wikipedia — Fornix (neuroanatomy)', url: wiki('Fornix (neuroanatomy)') }],
  'tract-fornix-commissure': [{ source: 'wikipedia', label: 'Wikipedia — Fornix and hippocampal commissure', url: wiki('Fornix (neuroanatomy)') }],
  'tract-fimbria': [{ source: 'wikipedia', label: 'Wikipedia — Hippocampus anatomy (fimbria)', url: wiki('Hippocampus anatomy') }],

  // ---- Telencephalon: lateral ventricles and CSF spaces ----
  'vent-lateral-ventricle': [
    { source: 'wikipedia', label: 'Wikipedia — Lateral ventricles', url: wiki('Lateral ventricles') },
    { ...CSF_SECRETION },
  ],
  'vent-lateral-ventricle-frontal-horn': [{ source: 'wikipedia', label: 'Wikipedia — Lateral ventricles (frontal horn)', url: wiki('Lateral ventricles') }],
  'vent-lateral-ventricle-temporal-horn': [{ source: 'wikipedia', label: 'Wikipedia — Lateral ventricles (temporal horn)', url: wiki('Lateral ventricles') }],
  'vent-lateral-ventricle-occipital-horn': [{ source: 'wikipedia', label: 'Wikipedia — Lateral ventricles (occipital horn)', url: wiki('Lateral ventricles') }],
  'vent-lateral-ventricle-atrium': [{ source: 'wikipedia', label: 'Wikipedia — Lateral ventricles (atrium/trigone)', url: wiki('Lateral ventricles') }],
  'vent-choroid-plexus-lateral': [
    { source: 'wikipedia', label: 'Wikipedia — Choroid plexus', url: wiki('Choroid plexus') },
    { ...CSF_SECRETION },
  ],
  'vent-interventricular-foramen': [{ source: 'wikipedia', label: 'Wikipedia — Interventricular foramina (neuroanatomy)', url: wiki('Interventricular foramina (neuroanatomy)') }],

  // ---- Telencephalon: white matter (commissural, projection, association) ----
  'ctx-corpus-callosum': [{ source: 'wikipedia', label: 'Wikipedia — Corpus callosum', url: wiki('Corpus callosum') }],
  'tract-corpus-callosum-rostrum': [{ source: 'wikipedia', label: 'Wikipedia — Corpus callosum (rostrum)', url: wiki('Corpus callosum') }],
  'tract-corpus-callosum-genu': [{ source: 'wikipedia', label: 'Wikipedia — Corpus callosum (genu)', url: wiki('Corpus callosum') }],
  'tract-corpus-callosum-body': [{ source: 'wikipedia', label: 'Wikipedia — Corpus callosum (body)', url: wiki('Corpus callosum') }],
  'tract-corpus-callosum-splenium': [{ source: 'wikipedia', label: 'Wikipedia — Corpus callosum (splenium)', url: wiki('Corpus callosum') }],
  'ctx-internal-capsule': [{ source: 'wikipedia', label: 'Wikipedia — Internal capsule', url: wiki('Internal capsule') }],
  'tract-internal-capsule-anterior-limb': [{ source: 'wikipedia', label: 'Wikipedia — Internal capsule (anterior limb)', url: wiki('Internal capsule') }],
  'tract-internal-capsule-genu': [{ source: 'wikipedia', label: 'Wikipedia — Internal capsule (genu)', url: wiki('Internal capsule') }],
  'tract-internal-capsule-posterior-limb': [{ source: 'wikipedia', label: 'Wikipedia — Internal capsule (posterior limb)', url: wiki('Internal capsule') }],
  'tract-corona-radiata': [{ source: 'wikipedia', label: 'Wikipedia — Corona radiata', url: wiki('Corona radiata') }],
  'tract-optic-radiation': [{ source: 'wikipedia', label: 'Wikipedia — Optic radiation', url: wiki('Optic radiation') }],
  'tract-cingulum': [
    { source: 'wikipedia', label: 'Wikipedia — Cingulum (brain)', url: wiki('Cingulum (brain)') },
    { ...DISCONNECTION },
  ],
  'tract-uncinate-fasciculus': [
    { source: 'wikipedia', label: 'Wikipedia — Uncinate fasciculus', url: wiki('Uncinate fasciculus') },
    { ...TRACTOGRAPHY_ATLAS },
  ],
  'tract-superior-longitudinal-fasciculus': [
    { source: 'wikipedia', label: 'Wikipedia — Superior longitudinal fasciculus', url: wiki('Superior longitudinal fasciculus') },
    { ...TRACTOGRAPHY_ATLAS },
    { ...DISCONNECTION },
  ],

  // ---- v8: functional cortical areas (anchored to their host gyri) ----
  // Each area carries its own Wikipedia article plus one journal entry: the
  // classical hierarchy paper for the visual areas (Felleman & Van Essen 1991,
  // which defines V1/V2 and the dorsal-ventral streams) and the canonical
  // hippocampal-formation review for the entorhinal cortex, which is the
  // anatomical origin of the perforant path described in that record.
  'ctx-v1': [
    { source: 'wikipedia', label: 'Wikipedia — Visual cortex', url: wiki('Visual cortex') },
    { source: 'journal', label: 'Felleman & Van Essen 1991 — Distributed hierarchical processing in the primate cerebral cortex (Cereb Cortex)', url: 'https://doi.org/10.1093/cercor/1.1.1' },
  ],
  'ctx-v2': [
    { source: 'wikipedia', label: 'Wikipedia — Visual cortex (V2)', url: wiki('Visual cortex') },
    { source: 'journal', label: 'Felleman & Van Essen 1991 — Distributed hierarchical processing in the primate cerebral cortex (Cereb Cortex)', url: 'https://doi.org/10.1093/cercor/1.1.1' },
  ],
  'ctx-a1': [
    { source: 'wikipedia', label: 'Wikipedia — Auditory cortex', url: wiki('Auditory cortex') },
    { source: 'wikipedia', label: "Wikipedia — Heschl's gyrus", url: wiki("Heschl's gyrus") },
  ],
  'ctx-a2': [
    { source: 'wikipedia', label: 'Wikipedia — Planum temporale', url: wiki('Planum temporale') },
    { source: 'wikipedia', label: 'Wikipedia — Auditory cortex', url: wiki('Auditory cortex') },
  ],
  'ctx-wernicke': [
    { source: 'wikipedia', label: "Wikipedia — Wernicke's area", url: wiki("Wernicke's area") },
    { source: 'wikipedia', label: 'Wikipedia — Receptive aphasia', url: wiki('Receptive aphasia') },
    { ...DISCONNECTION },
  ],
  'ctx-broca': [
    { source: 'wikipedia', label: "Wikipedia — Broca's area", url: wiki("Broca's area") },
    { source: 'wikipedia', label: 'Wikipedia — Expressive aphasia', url: wiki('Expressive aphasia') },
    { source: 'journal', label: 'Catani et al. 2005 — Perisylvian language networks of the human brain (Ann Neurol)', url: 'https://doi.org/10.1002/ana.20319' },
  ],
  'ctx-m1': [
    { source: 'wikipedia', label: 'Wikipedia — Primary motor cortex', url: wiki('Primary motor cortex') },
    { source: 'wikipedia', label: 'Wikipedia — Corticospinal tract', url: wiki('Corticospinal tract') },
  ],
  'ctx-s1': [
    { source: 'wikipedia', label: 'Wikipedia — Postcentral gyrus', url: wiki('Postcentral gyrus') },
    { source: 'wikipedia', label: 'Wikipedia — Somatosensory system', url: wiki('Somatosensory system') },
  ],
  'ctx-premotor': [
    { source: 'wikipedia', label: 'Wikipedia — Premotor cortex', url: wiki('Premotor cortex') },
    { source: 'wikipedia', label: 'Wikipedia — Apraxia', url: wiki('Apraxia') },
  ],
  'ctx-sma': [
    { source: 'wikipedia', label: 'Wikipedia — Supplementary motor area', url: wiki('Supplementary motor area') },
    { source: 'wikipedia', label: 'Wikipedia — Alien hand syndrome', url: wiki('Alien hand syndrome') },
  ],
  'ctx-entorhinal': [
    { source: 'wikipedia', label: 'Wikipedia — Entorhinal cortex', url: wiki('Entorhinal cortex') },
    { source: 'wikipedia', label: 'Wikipedia — Perforant path', url: wiki('Perforant path') },
    { source: 'journal', label: 'Amaral & Witter 1989 — The three-dimensional organization of the hippocampal formation: a review of anatomical data (Neuroscience)', url: 'https://doi.org/10.1016/0306-4522(89)90424-7' },
  ],
  'ctx-frontal-eye-fields': [
    { source: 'wikipedia', label: 'Wikipedia — Frontal eye fields', url: wiki('Frontal eye fields') },
    { source: 'wikipedia', label: 'Wikipedia — Saccade', url: wiki('Saccade') },
  ],

  // ---- v8: basal ganglia depth ----
  'nuc-accumbens': [
    { source: 'wikipedia', label: 'Wikipedia — Nucleus accumbens', url: wiki('Nucleus accumbens') },
    { source: 'wikipedia', label: 'Wikipedia — Reward system', url: wiki('Reward system') },
    { ...BG_LOOPS },
  ],
  'nuc-ventral-pallidum': [
    { source: 'wikipedia', label: 'Wikipedia — Ventral pallidum', url: wiki('Ventral pallidum') },
    { source: 'wikipedia', label: 'Wikipedia — Substantia innominata', url: wiki('Substantia innominata') },
    { source: 'journal', label: 'Haber & Knutson 2010 — The reward circuit: linking primate anatomy and human imaging (Neuropsychopharmacology)', url: 'https://doi.org/10.1038/npp.2009.129' },
  ],
  'nuc-claustrum': [
    { source: 'wikipedia', label: 'Wikipedia — Claustrum', url: wiki('Claustrum') },
    { source: 'wikipedia', label: 'Wikipedia — Extreme capsule', url: wiki('Extreme capsule') },
  ],

  // ---- v8: hippocampal formation (record-only subfields) ----
  'nuc-subiculum': [
    { source: 'wikipedia', label: 'Wikipedia — Subiculum', url: wiki('Subiculum') },
    { source: 'journal', label: 'Amaral & Witter 1989 — The three-dimensional organization of the hippocampal formation: a review of anatomical data (Neuroscience)', url: 'https://doi.org/10.1016/0306-4522(89)90424-7' },
  ],
  'nuc-ca1': [
    { source: 'wikipedia', label: 'Wikipedia — Hippocampus anatomy (CA fields)', url: wiki('Hippocampus anatomy') },
    { source: 'wikipedia', label: 'Wikipedia — Hypoxic ischemic encephalopathy (selective neuronal necrosis)', url: wiki('Hypoxic-ischemic encephalopathy') },
    { ...HIPPOCAMPAL_LESION },
  ],
  'nuc-ca2-ca3': [
    { source: 'wikipedia', label: 'Wikipedia — Hippocampus anatomy (CA fields)', url: wiki('Hippocampus anatomy') },
    { source: 'wikipedia', label: 'Wikipedia — Mossy fiber (hippocampus)', url: wiki('Mossy fiber (hippocampus)') },
    { ...HIPPOCAMPAL_LESION },
  ],
  'nuc-ca4': [
    { source: 'wikipedia', label: 'Wikipedia — Dentate gyrus', url: wiki('Dentate gyrus') },
    { source: 'wikipedia', label: 'Wikipedia — Temporal lobe epilepsy', url: wiki('Temporal lobe epilepsy') },
    { source: 'journal', label: 'Amaral & Witter 1989 — The three-dimensional organization of the hippocampal formation: a review of anatomical data (Neuroscience)', url: 'https://doi.org/10.1016/0306-4522(89)90424-7' },
  ],

  // ---- v8: optic pathway ----
  'tract-optic-nerve': [
    { source: 'wikipedia', label: 'Wikipedia — Optic nerve', url: wiki('Optic nerve') },
    { source: 'wikipedia', label: 'Wikipedia — Optic neuritis', url: wiki('Optic neuritis') },
  ],
  'ctx-optic-chiasm': [
    { source: 'wikipedia', label: 'Wikipedia — Optic chiasm', url: wiki('Optic chiasm') },
    { source: 'wikipedia', label: 'Wikipedia — Bitemporal hemianopsia', url: wiki('Bitemporal hemianopsia') },
  ],
  'tract-optic-tract': [
    { source: 'wikipedia', label: 'Wikipedia — Optic tract', url: wiki('Optic tract') },
    { source: 'wikipedia', label: 'Wikipedia — Lateral geniculate nucleus', url: wiki('Lateral geniculate nucleus') },
  ],

  // ---- v8: ventricular segments of the lateral ventricle ----
  // The five segments were already curated above (frontal horn, atrium,
  // occipital horn, temporal horn in the v7 telencephalon block); only the body
  // segment is new here, and it carries the same article as its four siblings
  // with the CSF-secretion review rather than a duplicated wiki target.
  'vent-lateral-ventricle-body': [
    { source: 'wikipedia', label: 'Wikipedia — Lateral ventricles (body)', url: wiki('Lateral ventricles') },
    { source: 'wikipedia', label: 'Wikipedia — Thalamostriate vein', url: wiki('Thalamostriate vein') },
    { ...CSF_SECRETION },
  ],

  // ---- v8: cerebral vasculature (circle of Willis + major trunks) ----
  // These are the only curated entries the vessel records rely on: getWebRefs()
  // deliberately emits no automatic Wikipedia fallback for `vessel` kind, so
  // every artery must appear here to keep the "learn more" panel honest.
  'vasc-internal-carotid-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Internal carotid artery', url: wiki('Internal carotid artery') },
    { source: 'wikipedia', label: 'Wikipedia — Carotid artery dissection', url: wiki('Carotid artery dissection') },
  ],
  'vasc-vertebral-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Vertebral artery', url: wiki('Vertebral artery') },
    { source: 'wikipedia', label: 'Wikipedia — Vertebral artery dissection', url: wiki('Vertebral artery dissection') },
  ],
  'vasc-basilar-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Basilar artery', url: wiki('Basilar artery') },
    { source: 'wikipedia', label: 'Wikipedia — Locked-in syndrome', url: wiki('Locked-in syndrome') },
  ],
  'vasc-anterior-cerebral-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Anterior cerebral artery', url: wiki('Anterior cerebral artery') },
    { source: 'wikipedia', label: 'Wikipedia — Anterior cerebral artery syndrome', url: wiki('Anterior cerebral artery syndrome') },
  ],
  'vasc-anterior-communicating-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Anterior communicating artery', url: wiki('Anterior communicating artery') },
    { source: 'wikipedia', label: 'Wikipedia — Subarachnoid hemorrhage', url: wiki('Subarachnoid hemorrhage') },
  ],
  'vasc-middle-cerebral-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Middle cerebral artery', url: wiki('Middle cerebral artery') },
    { source: 'wikipedia', label: 'Wikipedia — Middle cerebral artery syndrome', url: wiki('Middle cerebral artery syndrome') },
  ],
  'vasc-posterior-communicating-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Posterior communicating artery', url: wiki('Posterior communicating artery') },
    { source: 'wikipedia', label: 'Wikipedia — Posterior communicating artery aneurysm (third-nerve palsy)', url: wiki('Oculomotor nerve palsy') },
  ],
  'vasc-posterior-cerebral-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Posterior cerebral artery', url: wiki('Posterior cerebral artery') },
    { source: 'wikipedia', label: 'Wikipedia — Posterior cerebral artery syndrome', url: wiki('Posterior cerebral artery syndrome') },
    { source: 'journal', label: 'Schmahmann 2003 — Vascular syndromes of the thalamus (Stroke)', url: 'https://doi.org/10.1161/01.STR.0000087786.38997.9E' },
  ],
  'vasc-superior-cerebellar-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Superior cerebellar artery', url: wiki('Superior cerebellar artery') },
    { source: 'wikipedia', label: 'Wikipedia — Cerebellar stroke syndrome', url: wiki('Cerebellar stroke syndrome') },
  ],
  'vasc-anterior-inferior-cerebellar-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Anterior inferior cerebellar artery', url: wiki('Anterior inferior cerebellar artery') },
    { source: 'wikipedia', label: 'Wikipedia — Lateral pontine syndrome', url: wiki('Lateral pontine syndrome') },
  ],
  'vasc-posterior-inferior-cerebellar-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Posterior inferior cerebellar artery', url: wiki('Posterior inferior cerebellar artery') },
    { source: 'wikipedia', label: 'Wikipedia — Lateral medullary syndrome', url: wiki('Lateral medullary syndrome') },
  ],
  'vasc-lenticulostriate-arteries': [
    { source: 'wikipedia', label: 'Wikipedia — Lenticulostriate arteries', url: wiki('Lenticulostriate arteries') },
    { source: 'wikipedia', label: 'Wikipedia — Lacunar stroke', url: wiki('Lacunar stroke') },
  ],
  'vasc-anterior-choroidal-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Anterior choroidal artery', url: wiki('Anterior choroidal artery') },
    { source: 'wikipedia', label: 'Wikipedia — Internal capsule', url: wiki('Internal capsule') },
  ],
  'vasc-posterior-medial-choroidal-artery': [
    { source: 'wikipedia', label: 'Wikipedia — Posterior choroidal arteries', url: wiki('Posterior choroidal artery') },
    { source: 'wikipedia', label: 'Wikipedia — Choroid plexus', url: wiki('Choroid plexus') },
    { ...CSF_SECRETION },
  ],

  // ---- v9: the somatotopic map of the M1 / S1 strips ----
  // Every one of the 16 segment ids is curated. They all resolve to `'context'`
  // kind, and getWebRefs() skips the automatic Wikipedia fallback for `'vessel'`
  // ONLY — context silhouettes are given a fallback like any other kind — so a
  // fallback here would have produced 16 links to a machine-cleaned display name
  // ("Primary motor cortex (M1) — hand representation" → a non-existent article).
  // Curating them is therefore required, not optional. The two stripes point at
  // their parent area's page, every segment points at the shared homunculus /
  // somatotopy pages, and the journals are the stimulation and imaging sources
  // for the map itself (all four DOIs resolved).
  'ctx-m1-toe': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Paracentral lobule', url: wiki('Paracentral lobule') },
    { ...PENFIELD_BOLDREY },
  ],
  'ctx-m1-leg': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Paracentral lobule', url: wiki('Paracentral lobule') },
    { ...PENFIELD_BOLDREY },
  ],
  'ctx-m1-trunk': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Somatotopic arrangement', url: wiki('Somatotopic arrangement') },
    { ...PENFIELD_BOLDREY },
  ],
  'ctx-m1-arm': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Corticospinal tract', url: wiki('Corticospinal tract') },
    { ...PENFIELD_BOLDREY },
  ],
  'ctx-m1-hand': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Primary motor cortex', url: wiki('Primary motor cortex') },
    { ...PENFIELD_BOLDREY },
    { ...FLESHER_HAND_KNOB },
  ],
  'ctx-m1-face': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Corticobulbar tract', url: wiki('Corticobulbar tract') },
    { ...PENFIELD_BOLDREY },
  ],
  'ctx-m1-tongue': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Hypoglossal nerve', url: wiki('Hypoglossal nerve') },
    { ...PENFIELD_BOLDREY },
  ],
  'ctx-m1-larynx': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Primary motor cortex', url: wiki('Primary motor cortex') },
    { source: 'journal', label: 'Simonyan & Horwitz 2011 — Laryngeal motor cortex and control of speech in humans (Neuroscientist)', url: 'https://doi.org/10.1177/1073858410386727' },
  ],
  'ctx-s1-toe': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Postcentral gyrus', url: wiki('Postcentral gyrus') },
    { ...KAAS_SOMATOSENSORY },
  ],
  'ctx-s1-leg': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Dorsal column–medial lemniscus pathway', url: wiki('Dorsal column–medial lemniscus pathway') },
    { ...KAAS_SOMATOSENSORY },
  ],
  'ctx-s1-trunk': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Somatotopic arrangement', url: wiki('Somatotopic arrangement') },
    { ...KAAS_SOMATOSENSORY },
  ],
  'ctx-s1-arm': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Posterior column–medial lemniscus pathway', url: wiki('Dorsal column–medial lemniscus pathway') },
    { ...KAAS_SOMATOSENSORY },
  ],
  'ctx-s1-hand': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Two-point discrimination', url: wiki('Two-point discrimination') },
    { ...KAAS_SOMATOSENSORY },
    { ...FLESHER_HAND_KNOB },
  ],
  'ctx-s1-face': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Postcentral gyrus', url: wiki('Postcentral gyrus') },
    { ...KAAS_SOMATOSENSORY },
  ],
  'ctx-s1-tongue': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Taste', url: wiki('Taste') },
    { ...KAAS_SOMATOSENSORY },
  ],
  'ctx-s1-larynx': [
    { source: 'wikipedia', label: 'Wikipedia — Cortical homunculus', url: wiki('Cortical homunculus') },
    { source: 'wikipedia', label: 'Wikipedia — Postcentral gyrus', url: wiki('Postcentral gyrus') },
    { ...KAAS_SOMATOSENSORY },
  ],

  /*
   * v13 — the twelve cranial nerves, curated rather than left to the automatic
   * Wikipedia fallback. The fallback derives a title from the display name
   * ("CN I Olfactory nerve"), which resolves to nothing, so a `kind: 'nerve'`
   * record would have shown an empty panel without these entries. Every title
   * below is a real English Wikipedia article; the Skull article carries the
   * foramina the twelve records name in `course`.
   */
  'nrv-cn1-olfactory': [{ source: 'wikipedia', label: 'Wikipedia — Olfactory nerve', url: wiki('Olfactory nerve') }],
  'nrv-cn2-optic': [{ source: 'wikipedia', label: 'Wikipedia — Optic nerve', url: wiki('Optic nerve') }],
  'nrv-cn3-oculomotor': [{ source: 'wikipedia', label: 'Wikipedia — Oculomotor nerve', url: wiki('Oculomotor nerve') }],
  'nrv-cn4-trochlear': [{ source: 'wikipedia', label: 'Wikipedia — Trochlear nerve', url: wiki('Trochlear nerve') }],
  'nrv-cn5-trigeminal': [{ source: 'wikipedia', label: 'Wikipedia — Trigeminal nerve', url: wiki('Trigeminal nerve') }],
  'nrv-cn6-abducens': [{ source: 'wikipedia', label: 'Wikipedia — Abducens nerve', url: wiki('Abducens nerve') }],
  'nrv-cn7-facial': [{ source: 'wikipedia', label: 'Wikipedia — Facial nerve', url: wiki('Facial nerve') }],
  'nrv-cn8-vestibulocochlear': [{ source: 'wikipedia', label: 'Wikipedia — Vestibulocochlear nerve', url: wiki('Vestibulocochlear nerve') }],
  'nrv-cn9-glossopharyngeal': [{ source: 'wikipedia', label: 'Wikipedia — Glossopharyngeal nerve', url: wiki('Glossopharyngeal nerve') }],
  'nrv-cn10-vagus': [{ source: 'wikipedia', label: 'Wikipedia — Vagus nerve', url: wiki('Vagus nerve') }],
  'nrv-cn11-accessory': [{ source: 'wikipedia', label: 'Wikipedia — Accessory nerve', url: wiki('Accessory nerve') }],
  'nrv-cn12-hypoglossal': [{ source: 'wikipedia', label: 'Wikipedia — Hypoglossal nerve', url: wiki('Hypoglossal nerve') }],
}

/** Authoritative journal overview for the brainstem regions (RSNA RadioGraphics 2019). */
const RSNA_BRAINSTEM: WebRef = {
  source: 'journal',
  label: 'RadioGraphics 2019 — Midbrain, Pons, and Medulla: Anatomy and Syndromes',
  url: 'https://doi.org/10.1148/rg.2019180126',
}

/** Region-level academic refs attached to region-context slugs. */
const regionAcademic: Record<string, WebRef[]> = {
  diencephalon: [{ ...RSNA_BRAINSTEM }],
  midbrain: [{ ...RSNA_BRAINSTEM }],
  pons: [{ ...RSNA_BRAINSTEM }],
  medulla: [{ ...RSNA_BRAINSTEM }],
}

/** Strip disambiguation/qualifier text from a display name to make a Wikipedia title. */
function cleanTitle(name: string): string {
  let t = name
    .replace(/\s*\([^)]*\)/g, ' ')               // remove "(VA)", "(CN III)", "(context envelope)"
    .replace(/\b(context|envelope|silhouette|exit|region)\b/gi, ' ')   // qualifier words
    .replace(/[–—]/g, '')                        // mdash/ndash in names like E-W / dorsal column–medial
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) t = name.trim()
  return t
}

/**
 * Resolve the web references for a structure/tract record.
 * @param id   taxonomy slug (e.g. "nuc-pulvinar")
 * @param name display name (fallback Wikipedia title source)
 * @param kind 'nucleus' | 'tract' | 'ventricle' | 'surface' | 'context' | 'vessel'
 * @param region optional region id for regional journal refs
 */
export function getWebRefs(id: string, name: string, kind?: string, region?: string): WebRef[] {
  const out: WebRef[] = []
  const c = curated[id]
  if (c && c.length) out.push(...c)
  else if (kind !== 'vessel') {
    // Automatic, safe fallback: a Wikipedia page for the cleaned name.
    const title = cleanTitle(name)
    out.push({ source: 'wikipedia', label: `Wikipedia — ${title}`, url: wiki(title) })
  }
  if (region && regionAcademic[region]) out.push(...regionAcademic[region])
  return out
}
