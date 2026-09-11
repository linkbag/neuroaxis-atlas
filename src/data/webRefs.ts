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
