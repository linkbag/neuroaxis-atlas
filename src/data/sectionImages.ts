/**
 * sectionImages.ts — real-imagery manifest (v3 "section sync" + v4 "real
 * imagery" additions).
 *
 * One entry per embedded real-image file (all in src/assets/imaging/stains/):
 *  • v3 — 17 UBC brainstem/spinal-cord micrographs (`ubc-m01..m17`) and 10 MSU
 *    Human Brain Atlas coronal cell stains (`bmm-*`). These entries are
 *    UNCHANGED by v4: same ids, same files, same credits.
 *  • v4 — 9 UBC horizontal (transverse) section photographs (`ubc-h*`) and 15
 *    UBC coronal section photographs (`ubc-c*`) from the same CC BY-NC-SA 4.0
 *    site, plus CC0 CT slices from Wikimedia Commons (`wikict-*`).
 *  • v4b — 22 NLM **Visible Human Project** axial cryosection photographs
 *    (`vhp-NNNN`, full-colour cadaver sections of the head, 0.294 mm/px,
 *    0.147 mm slice spacing) spanning canonical y −52.2 … +34.0 au with extra
 *    density through medulla/pons/midbrain. Licence: NLM Terms and Conditions
 *    (2019), redistribution permitted with the verbatim acknowledgement in
 *    `VHP_CREDIT`; the committed set is a **frozen 2026-09-10 snapshot, not a
 *    live NLM mirror** (docs/ATTRIBUTION.md). Their `planeValue` comes from the
 *    documented fallback of the registration attempt — read `VHP_PLANE_NOTE`.
 *    Registration record: assets-src/imaging3/VHP_ANCHORS.md (working artefact).
 *
 * Each `file` is a Vite-resolved asset URL (static import) — consumers can use
 * it directly as an <img src> or Image resource.
 *
 * ── Attribution policy (AUTHORITATIVE: docs/SECTION_SYNC_PLAN.md §1; per-source
 * evidence + fetch dates in docs/IMAGING_SOURCES.md and
 * docs/IMAGING_SOURCES_V4.md; verbatim credit lines in docs/ATTRIBUTION.md):
 * the credit strings below are the EXACT lines required by the sources and MUST
 * be shown verbatim in-UI whenever the corresponding real image is displayed.
 * This software is non-commercial and educational; UBC content is distributed
 * under CC BY-NC-SA 4.0, brainmuseum content under the site's explicit
 * permission policy, and the Wikimedia CT slices are CC0 (no attribution
 * required — credited anyway for provenance).
 *
 * ── v4 field semantics (all optional on the v3 entries, so they keep working):
 *  axis        'transverse' | 'coronal' | 'sagittal' — the anatomic plane the
 *              photograph shows. Transverse = axial/horizontal.
 *  levelId     levels.json anchor id, or null when the image is a different
 *              axis or sits outside the authored level range.
 *  planeValue  canonical atlas units for the plane this image belongs to:
 *              transverse → y (canonical = +superior), coronal → z (+anterior),
 *              sagittal → x (+patient-left). Omitted when unanchored.
 *  planeValueNote  how planeValue was derived and how much to trust it.
 *  fit         first-pass image→canonical affine, documented defaults:
 *                scale   pixels per canonical au (isotropic)
 *                dx      signed offset in canonical au from the image centre
 *                        to the tissue symmetry axis (+ = midline right of
 *                        centre)
 *                dy      vertical offset in canonical au (0 = centred)
 *                mirrorX false for every embedded source: each plate already
 *                        shows patient-left on image-right, the same
 *                        radiological convention as the section canvas
 *              Consumers must treat `fit` as a STARTING point: it is derived
 *              from per-image tissue measurements (documented in
 *              docs/IMAGING_SOURCES_V4.md §5), not from a landmark fit.
 *  credit      verbatim credit line — render exactly this.
 *  creditUrl   licence deed / source page for the credit.
 *
 * Level ids must match src/data/levels.json anchors.
 */

// ---- UBC micrographs (www.neuroanatomy.ca, embedded verbatim) ----
import ubc01 from '../assets/imaging/stains/ubc-m01.jpg'
import ubc02 from '../assets/imaging/stains/ubc-m02.jpg'
import ubc03 from '../assets/imaging/stains/ubc-m03.jpg'
import ubc04 from '../assets/imaging/stains/ubc-m04.jpg'
import ubc05 from '../assets/imaging/stains/ubc-m05.jpg'
import ubc06 from '../assets/imaging/stains/ubc-m06.jpg'
import ubc07 from '../assets/imaging/stains/ubc-m07.jpg'
import ubc08 from '../assets/imaging/stains/ubc-m08.jpg'
import ubc09 from '../assets/imaging/stains/ubc-m09.jpg'
import ubc10 from '../assets/imaging/stains/ubc-m10.jpg'
import ubc11 from '../assets/imaging/stains/ubc-m11.jpg'
import ubc12 from '../assets/imaging/stains/ubc-m12.jpg'
import ubc13 from '../assets/imaging/stains/ubc-m13.jpg'
import ubc14 from '../assets/imaging/stains/ubc-m14.jpg'
import ubc15 from '../assets/imaging/stains/ubc-m15.jpg'
import ubc16 from '../assets/imaging/stains/ubc-m16.jpg'
import ubc17 from '../assets/imaging/stains/ubc-m17.jpg'

// ---- MSU Human Brain Atlas coronal cell stains (brainmuseum.org series) ----
import bmm2240 from '../assets/imaging/stains/bmm-2240.jpg'
import bmm2390 from '../assets/imaging/stains/bmm-2390.jpg'
import bmm2500 from '../assets/imaging/stains/bmm-2500.jpg'
import bmm2660 from '../assets/imaging/stains/bmm-2660.jpg'
import bmm2800 from '../assets/imaging/stains/bmm-2800.jpg'
import bmm3270 from '../assets/imaging/stains/bmm-3270.jpg'
import bmm3440 from '../assets/imaging/stains/bmm-3440.jpg'
import bmm3600 from '../assets/imaging/stains/bmm-3600.jpg'
import bmm3710 from '../assets/imaging/stains/bmm-3710.jpg'
import bmm3820 from '../assets/imaging/stains/bmm-3820.jpg'

// ---- v4: UBC horizontal (transverse) section photographs -------------------
import ubcH12 from '../assets/imaging/stains/ubc-h12.png'
import ubcH13 from '../assets/imaging/stains/ubc-h13.png'
import ubcH14 from '../assets/imaging/stains/ubc-h14.png'
import ubcH15 from '../assets/imaging/stains/ubc-h15.png'
import ubcH16 from '../assets/imaging/stains/ubc-h16.png'
import ubcH17 from '../assets/imaging/stains/ubc-h17.png'
import ubcH18 from '../assets/imaging/stains/ubc-h18.png'
import ubcH19 from '../assets/imaging/stains/ubc-h19.png'
import ubcH20 from '../assets/imaging/stains/ubc-h20.png'

// ---- v4: UBC coronal section photographs -----------------------------------
import ubcC07 from '../assets/imaging/stains/ubc-c07.png'
import ubcC09 from '../assets/imaging/stains/ubc-c09.png'
import ubcC11 from '../assets/imaging/stains/ubc-c11.png'
import ubcC13 from '../assets/imaging/stains/ubc-c13.png'
import ubcC14 from '../assets/imaging/stains/ubc-c14.png'
import ubcC15 from '../assets/imaging/stains/ubc-c15.png'
import ubcC16 from '../assets/imaging/stains/ubc-c16.png'
import ubcC17 from '../assets/imaging/stains/ubc-c17.png'
import ubcC18 from '../assets/imaging/stains/ubc-c18.png'
import ubcC19 from '../assets/imaging/stains/ubc-c19.png'
import ubcC20 from '../assets/imaging/stains/ubc-c20.png'
import ubcC21 from '../assets/imaging/stains/ubc-c21.png'
import ubcC22 from '../assets/imaging/stains/ubc-c22.png'
import ubcC23 from '../assets/imaging/stains/ubc-c23.png'
import ubcC24 from '../assets/imaging/stains/ubc-c24.png'

// ---- v4: Wikimedia Commons CC0 CT slices -----------------------------------
import ctAxial10 from '../assets/imaging/stains/wikict-axial-10.png'
import ctAxial14 from '../assets/imaging/stains/wikict-axial-14.png'
import ctAxial18 from '../assets/imaging/stains/wikict-axial-18.png'

// ---- v4b: NLM Visible Human Project axial cryosection photographs -----------
// 22 plates spanning canonical y -52.2 .. +34.0, curated for medulla / pons /
// midbrain density. See VHP_PLANE_NOTE below for the registration provenance and
// assets-src/imaging3/VHP_ANCHORS.md (working artefact) for the fit record.
import vhp0017 from '../assets/imaging/stains/vhp-0017.jpg'
import vhp0046 from '../assets/imaging/stains/vhp-0046.jpg'
import vhp0074 from '../assets/imaging/stains/vhp-0074.jpg'
import vhp0103 from '../assets/imaging/stains/vhp-0103.jpg'
import vhp0132 from '../assets/imaging/stains/vhp-0132.jpg'
import vhp0160 from '../assets/imaging/stains/vhp-0160.jpg'
import vhp0189 from '../assets/imaging/stains/vhp-0189.jpg'
import vhp0230 from '../assets/imaging/stains/vhp-0230.jpg'
import vhp0246 from '../assets/imaging/stains/vhp-0246.jpg'
import vhp0295 from '../assets/imaging/stains/vhp-0295.jpg'
import vhp0328 from '../assets/imaging/stains/vhp-0328.jpg'
import vhp0385 from '../assets/imaging/stains/vhp-0385.jpg'
import vhp0430 from '../assets/imaging/stains/vhp-0430.jpg'
import vhp0450 from '../assets/imaging/stains/vhp-0450.jpg'
import vhp0470 from '../assets/imaging/stains/vhp-0470.jpg'
import vhp0491 from '../assets/imaging/stains/vhp-0491.jpg'
import vhp0532 from '../assets/imaging/stains/vhp-0532.jpg'
import vhp0581 from '../assets/imaging/stains/vhp-0581.jpg'
import vhp0631 from '../assets/imaging/stains/vhp-0631.jpg'
import vhp0681 from '../assets/imaging/stains/vhp-0681.jpg'
import vhp0701 from '../assets/imaging/stains/vhp-0701.jpg'
import vhp0721 from '../assets/imaging/stains/vhp-0721.jpg'

export type ImageSource = 'ubc' | 'brainmuseum' | 'commons-ct' | 'vhp-nlm'
export type SectionAxis = 'transverse' | 'coronal' | 'sagittal'

/** First-pass image→canonical affine (see the header: documented defaults). */
export interface SectionImageFit {
  /** Pixels per canonical atlas unit (isotropic). */
  scale: number
  /** Offset in canonical au from the image centre to the tissue midline. */
  dx: number
  /** Vertical offset in canonical au (0 = tissue centred vertically). */
  dy: number
  /** True when the plate is stored mirrored relative to the canvas. */
  mirrorX?: boolean
}

/** One embedded real-image plate; `credit` MUST render verbatim with the image. */
export interface SectionImage {
  /** Stable manifest id, e.g. 'ubc-m05', 'ubc-h16' or 'wikict-axial-20'. */
  id: string
  /** levels.json anchor id, or null when no transverse level matches. */
  levelId: string | null
  axis: SectionAxis
  /** Canonical plane position: transverse→y, coronal→z, sagittal→x (au). */
  planeValue?: number
  /** How `planeValue` was derived, and how much to trust it. */
  planeValueNote?: string
  /** Resolved asset URL (Vite static import). */
  file: string
  source: ImageSource
  /** EXACT credit line required by the source — render verbatim in-UI. */
  credit: string
  /** Licence deed / credit page matching `credit`. */
  creditUrl: string
  /** Permanent source page/direct-image URL for the "open source ↗" link. */
  sourceUrl: string
  license: string
  /** First-pass image→canonical affine; see the header for the defaults. */
  fit?: SectionImageFit
  /** Level evidence: site's own title / viewer overlay labels or MSU level id. */
  note: string
}

/** EXACT credit line (plan §1); verbatim copyright notice, not paraphrased. */
export const UBC_CREDIT = '© University of British Columbia, CC BY-NC-SA 4.0'

/** EXACT credit line (plan §1) — verbatim, re-copyrighting not permitted. */
export const BMM_CREDIT =
  'University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health'

export const BMM_LICENSE =
  'Site permission for educational/research use — see docs/IMAGING_SOURCES.md §2'

export const UBC_LICENSE = 'CC BY-NC-SA 4.0'
export const UBC_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'

/**
 * Wikimedia Commons "CT of a normal brain" series — CC0 1.0 (public domain
 * dedication). No attribution is legally required; this line is shown anyway so
 * the provenance of the CT plates stays visible in-UI.
 */
export const COMMONS_CT_CREDIT =
  'CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)'

export const COMMONS_CT_LICENSE = 'CC0 1.0'
export const COMMONS_CT_LICENSE_URL = 'https://creativecommons.org/publicdomain/zero/1.0/'

/* ------------------------------------------- v4b: NLM Visible Human (VHP) */

/**
 * EXACT acknowledgement the NLM Terms and Conditions require (verified verbatim
 * at source on 2026-09-10 by the `vhp-acquire` task; see
 * assets-src/imaging3/VHP_INVENTORY.md §1.1 and docs/ATTRIBUTION.md):
 *
 *   "Users of the data agree to: […] acknowledge NLM as the source of the data
 *    by including the phrase "Courtesy of the U.S. National Library of Medicine"
 *    in a clear and conspicuous manner, […] not indicate or imply that NLM has
 *    endorsed its products/services/applications."
 *
 * Character for character — no trailing period, no paraphrase, never reworded.
 */
export const VHP_CREDIT = 'Courtesy of the U.S. National Library of Medicine'

/** NLM Terms and Conditions (2019) — the licence deed for the VHP data. */
export const VHP_TERMS_URL = 'https://www.nlm.nih.gov/databases/download/terms_and_conditions.html'

/**
 * Licence + the "most current version OR say so" obligation, met by the second
 * arm exactly as the CT grid's stanza already does (docs/ATTRIBUTION.md): a
 * committed plate set is a FROZEN 2026-09-10 snapshot, not a live NLM mirror.
 */
export const VHP_LICENSE =
  'NLM Terms and Conditions (2019) — redistribution permitted with acknowledgement; frozen 2026-09-10 snapshot, not a live NLM mirror'

/**
 * `fit.scale` is PIXELS PER CANONICAL AU, matching `SectionImageFit` and
 * `imageLayers.drawStainToView` (`wAu = naturalWidth / fit.scale`).
 *
 *   scale = 528 px · 1.2 mm/au ÷ 155.232 mm field of view = 4.0816 px/au
 *
 * The plate is 0.294 mm/px = 0.245 **au per px** (VHP_INVENTORY.md §3.1 — the
 * corrected figure; 0.147 mm/px would be a 2× error). 4.0816 is its reciprocal
 * in the right units; writing 0.245 here would render the plate 16.7× too large.
 * World size follows: 528/4.0816 = 129.4 au × 764/4.0816 = 187.2 au.
 */
export const VHP_FIT_SCALE = 4.0816

/** Per-plate source URL base (VHP_INVENTORY.md §2: `.02` is part of the name,
 *  indices are 4-digit zero-padded 0001..1477, `0000`/`1478` answer HTTP 403). */
export const VHP_CRYO_BASE =
  'https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Additional-Head-Images/cryo/jpeg/halfSize/axial'

/**
 * How each cryosection's `planeValue` was obtained, and how far to trust it.
 * This is the honest disclosure the manifest carries into the UI: the
 * programmatic registration was ATTEMPTED and its accept rule was NOT met, so
 * the plates are placed on the documented fallback, with the residual
 * uncertainty in au stated rather than implied away.
 *
 * Evidence (full record: assets-src/imaging3/VHP_ANCHORS.md):
 *  - the spatial step 0.1225 au/index is the DOCUMENTED 0.147 mm slice spacing
 *    ÷ 1.2 mm/au, so it is used unscaled;
 *  - index 1 is the superior-most plate (VHP_INVENTORY.md §4.1) and the series
 *    runs 1477 × 0.147 mm = 217.1 mm inferiorly;
 *  - the anchor y(1) = +36.0 au is MEASURED, not assumed: the same donor's
 *    full-field head CT DICOM series, mapped into canonical au by the v4 CT
 *    bake's own published registration (scripts/build-ct-grid.mjs), carries its
 *    topmost head cross-section at y = +33.3 … +35.8 au, tapering smoothly to
 *    zero (analysis/ct-full-profile.json).
 *  - the profile fit against that reference reached r = 0.92 (forward direction)
 *    and rejected the competing calibration hypothesis (r = 0.29) by a wide
 *    margin, but its LANDMARK residuals missed by 20–210 au against a ±5 au
 *    tolerance, so per PLAN.md §2.1 step 2 the fit is REJECTED and the fallback
 *    is used. The plate-to-atlas correspondence is therefore a documented
 *    placement, not a landmark-verified registration.
 *
 * Residual uncertainty: ±10 au (≈ ±12 mm) in the absolute plane of every plate;
 * the ORDER of the plates and their relative spacing are exact (documented
 * spacing), and the lateral placement is measured per plate (see each `fit.dx`,
 * the plate's own left–right symmetry axis, mean mirror correlation r = 0.51).
 */
export const VHP_PLANE_NOTE =
  'REGISTRATION FALLBACK, not a landmark fit — plane uncertainty ±10 au (±12 mm). y = +36.0 − (index − 1) × 0.1225 au: 0.1225 au/index is the documented 0.147 mm slice spacing and +36.0 au is the same donor’s head apex measured from the full-field Visible Human head CT through the v4 CT grid’s own canonical registration; index 1 is the superior-most plate. The programmatic fit was attempted and rejected: it reached r = 0.92 and refuted the competing y₁ ≈ −8 au hypothesis (r = 0.29), but its landmark residuals missed by 20–210 au against a ±5 au tolerance (plan §2.1). Plate order and relative spacing are exact; see assets-src/imaging3/VHP_ANCHORS.md.'

const UBC_BASE = 'https://www.neuroanatomy.ca/micrographviewer/images/micrographs'
const UBC_H_BASE = 'https://www.neuroanatomy.ca/horizontalviewer/images/horizontal_slices'
const UBC_C_BASE = 'https://www.neuroanatomy.ca/coronalviewer/images/coronal_slices'
const BMM_BASE = 'https://brains.anatomy.msu.edu/brains/human/coronal'
const COMMONS_BASE = 'https://commons.wikimedia.org/wiki/File:'

function ubcUrl(n: number): string {
  return `${UBC_BASE}/m${n}/m${n}brain.png`
}

/** Wikimedia Commons File: page for a CT slice ("axial"|"coronal"|"sagittal"). */
function ctUrl(plane: string, n: number): string {
  return `${COMMONS_BASE}${encodeURIComponent(`CT of a normal brain, ${plane} ${n}.png`)}`
}

/** UBC micrograph level evidence (site-baked title + viewer overlay labels). */
const ubcNotes: Record<number, string> = {
  1: 'Site title "SPINAL CORD" — cervical spinal cord (fasciculus gracilis/cuneatus, anterior+lateral corticospinal tracts, spinocerebellar and spinothalamic tracts); no brainstem structures.',
  2: 'Site title "CAUDAL MEDULLA" — pyramidal decussation; fasciculi gracilis/cuneatus, spinal nucleus & tract of CN V, spinothalamic tract.',
  3: 'Site title "MEDULLA" — nucleus gracilis & cuneatus appear (fasciculi still labeled); internal arcuate fibers not yet labeled (crossing shown in m04); just rostral to the pyramidal decussation.',
  4: 'Site title "MEDULLA" — internal arcuate (sensory) decussation: nuclei gracilis/cuneatus + crossing fibers + pyramid; spinal tract/nucleus CN V.',
  5: 'Site title "ROSTRAL/OPEN MEDULLA" — inferior olive, hypoglossal + dorsal motor CN X nuclei, medial lemniscus, MLF, pyramid, inferior cerebellar peduncle, lateral cuneate nucleus, solitary fasciculus/nucleus.',
  6: 'Site title "ROSTRAL MEDULLA & CEREBELLUM" — fourth ventricle, vestibular + ventral cochlear nuclei, inferior medullary velum, cerebellar nuclei (dentate/fastigial/globose/emboliform), vermis, ICP/SCP.',
  7: 'Site title "CAUDAL PONS & CEREBELLUM" — abducens nerve & nucleus, facial motor nucleus & nerve, lateral lemniscus, superior cerebellar peduncle, vestibular nuclei, vermis.',
  8: 'Site title "ROSTRAL PONS & CEREBELLUM" — trigeminal nerve (CN V) entry, mesencephalic nucleus & tract, spinal lemniscus, superior cerebellar peduncle, corticospinal fibers.',
  9: 'Site title "ROSTRAL PONS/CAUDAL MIDBRAIN" — isthmus: trochlear nerve (CN IV) exit, pontocerebellar fibers, superior cerebellar peduncle, locus coeruleus, cerebral aqueduct.',
  10: 'Site title "ROSTRAL PONS/CAUDAL MIDBRAIN" — inferior colliculus, cerebral aqueduct, central gray matter, raphe nuclei, trochlear nerve, SCP, lateral/medial lemnisci.',
  11: 'Site title "ROSTRAL MIDBRAIN" — superior colliculus, oculomotor + Edinger-Westphal nuclei, red nucleus, substantia nigra, VTA, medial geniculate body, medial lemniscus.',
  12: 'Site title "DIENCEPHALON/BASAL GANGLIA" — mammillary body, subthalamic nucleus, substantia nigra, dorsal-medial + ventral-lateral thalamic nuclei, globus pallidus, putamen, third ventricle, optic tract.',
  13: 'Site title "DIENCEPHALON/BASAL GANGLIA" — mammillary body + hypothalamus, anterior/medial thalamic nuclei, fornix, mammillothalamic tract, globus pallidus, putamen.',
  14: 'Site title "DIENCEPHALON/BASAL GANGLIA" — hypothalamus, optic tract, mammillothalamic tract, ansa lenticularis, medial thalamic nucleus, corpus callosum, lateral ventricle.',
  15: 'Site title "DIENCEPHALON/BASAL GANGLIA" — anterior commissure, anterior + ventral-anterior thalamic nuclei, hypothalamus, optic tract, globus pallidus medial/lateral, internal capsule.',
  16: 'Site title "ANTERIOR DIENCEPHALON" — anterior commissure, column of fornix, hypothalamus, optic tract, head of caudate, globus pallidus, third ventricle.',
  17: 'Site title "DIENCEPHALON" — basal forebrain/striatal level: corpus callosum body + rostrum, head of caudate, anterior limb of internal capsule, anterior horn of lateral ventricle, septum pellucidum; rostral to the atlas\u2019s rostralmost transverse anchor (optic chiasm).',
}

/** UBC mN → levels.json anchor (evidence in ubcNotes; see IMAGING_SOURCES.md). */
const ubcLevels: Record<number, string | null> = {
  1: null, // spinal cord only (reference entry)
  2: 'lvl-pyramid-decuss',
  3: 'lvl-sensory-decuss',
  4: 'lvl-sensory-decuss',
  5: 'lvl-olivary',
  6: 'lvl-pontomedullary',
  7: 'lvl-pons-caudal',
  8: 'lvl-pons-middle',
  9: 'lvl-pons-rostral',
  10: 'lvl-midbrain-ic',
  11: 'lvl-midbrain-sc',
  12: 'lvl-thalamus-mid',
  13: 'lvl-thalamus-mid',
  14: 'lvl-thalamus-rostral',
  15: 'lvl-thalamus-rostral',
  16: 'lvl-thalamus-rostral',
  17: null, // striatum/basal forebrain — beyond the top transverse anchor
}

/** MSU coronal section number → visual assessment (cell stain montage review). */
const bmmNotes: Record<number, string> = {
  2240: 'MSU Human Brain Atlas coronal level 2240, cell stain — anterior diencephalon / basal ganglia, lateral ventricles.',
  2390: 'MSU Human Brain Atlas coronal level 2390, cell stain — diencephalon (thalamus), basal ganglia.',
  2500: 'MSU Human Brain Atlas coronal level 2500, cell stain — midbrain (superior colliculus, cerebral peduncles), temporal lobes, cerebellum.',
  2660: 'MSU Human Brain Atlas coronal level 2660, cell stain — midbrain/diencephalon, temporal lobes, cerebellum.',
  2800: 'MSU Human Brain Atlas coronal level 2800, cell stain — midbrain, cerebellum, pons emerging.',
  3270: 'MSU Human Brain Atlas coronal level 3270, cell stain — pons, cerebellum.',
  3440: 'MSU Human Brain Atlas coronal level 3440, cell stain — pons, cerebellum.',
  3600: 'MSU Human Brain Atlas coronal level 3600, cell stain — pons–medulla junction, cerebellum.',
  3710: 'MSU Human Brain Atlas coronal level 3710, cell stain — medulla (lower), cerebellum.',
  3820: 'MSU Human Brain Atlas coronal level 3820, cell stain — medulla (low), cerebellum.',
}

/* ------------------------------------------------------------------ v4 data */

/**
 * UBC horizontal (transverse) section photographs.
 *
 * The site's own viewer metadata (`/horizontalviewer/util/slicesInfo.js`) names
 * one landmark per slice — those labels are the sole positional evidence, so
 * `planeValue` is an ESTIMATE built from two anchors inside our canonical
 * y range and a 6 au step (docs/IMAGING_SOURCES_V4.md §5):
 *   h16 "Basilar Pons"     → y = −14 (the lower pontine body: between
 *                                   lvl-pons-middle −8 and lvl-pons-caudal −18)
 *   h17 "Dentate Nucleus"  → y = −26 (cerebellar dentate, just caudal to the pons)
 * The step is 6 au from h12 through h20 with ONE 12 au gap between h16 and h17
 * (the dentate label jumps straight from the pons to the deep cerebellum); the
 * values are inside the canonical box y ∈ [−55, 45] by construction.
 */
const ubcHPlane: Record<number, number> = {
  12: 10,
  13: 4,
  14: -2,
  15: -8,
  16: -14,
  17: -26,
  18: -32,
  19: -38,
  20: -44,
}
const UBC_H_PLANE_NOTE =
  'Estimated from the site viewer label for this slice plus the h16 "Basilar Pons" = y −14 and h17 "Dentate Nucleus" = y −26 anchors (step 6 au); the source states no numeric section position.'
const UBC_H_FIT_SCALE = 13.2

/** Slice number → overlay labels (site viewer metadata, verbatim). */
const ubcHLabels: Record<number, string> = {
  12: 'Anterior Cerebral Artery (Branch)',
  13: 'Anterior Cerebral Artery (Branch)',
  14: 'Basilar Artery',
  15: 'Cerebellum',
  16: 'Basilar Pons',
  17: 'Dentate Nucleus',
  18: 'Cerebellar Tonsil',
  19: 'Cerebellar Tonsil',
  20: 'Cerebellar Tonsil',
}

/** Midline offsets (canonical au) measured per slice — see IMAGING_SOURCES_V4 §5. */
const ubcHDx: Record<number, number> = {
  12: 0.45,
  13: -1.82,
  14: 3.03,
  15: 0.61,
  16: -5.08,
  17: 0.15,
  18: 1.06,
  19: -0.76,
  20: 0.83,
}

const ubcHFiles: Record<number, string> = {
  12: ubcH12,
  13: ubcH13,
  14: ubcH14,
  15: ubcH15,
  16: ubcH16,
  17: ubcH17,
  18: ubcH18,
  19: ubcH19,
  20: ubcH20,
}

/**
 * UBC coronal section photographs.
 *
 * Anchors from the site viewer metadata: c14–c17 are labelled "Basilar Pons"
 * and c20–c22 "Cerebellar Tonsil". `planeValue` interpolates between the pons
 * centre (c16 → z = −14, matching the atlas pons) and the foramen-magnum
 * tonsillar level (c21 → z = −46, next to lvl-spinal-medulla) with a constant
 * 5 au step through c13–c18; outside that brainstem run the step widens to
 * 7–10 au (c18→c19 −8, c19→c20 −7, c20→c21 −7, c21..c24 −3/−2/−3, c13→c11
 * −10). Every value is clamped into the canonical box z ∈ [−56, 26]:
 *   • c07 was 31 in the first pass — OUTSIDE the reachable coronal slider
 *     range [−56, 26] (CLIP_BOUNDS.z), so the plate could never be displayed
 *     (found by `scripts/verify-imaging-v4.mjs`, review-qa-v4). It is clamped
 *     to the anterior limit 26, which keeps the rostro-caudal ordering
 *     (c07 remains the most anterior plate, 5 au rostral to c09) and makes the
 *     plate reachable. c07's absolute plane is an estimate as before.
 */
const ubcCPlane: Record<number, number> = {
  7: 26,
  9: 21,
  11: 11,
  13: 1,
  14: -4,
  15: -9,
  16: -14,
  17: -19,
  18: -24,
  19: -32,
  20: -39,
  21: -46,
  22: -49,
  23: -51,
  24: -54,
}
const UBC_C_PLANE_NOTE =
  'Estimated from the site viewer label for this slice plus the c16 "Basilar Pons" = z −14 and c21 "Cerebellar Tonsil" = z −46 anchors (step 5 au); the source states no numeric section position.'
const UBC_C_FIT_SCALE = 17.9

const ubcCLabels: Record<number, string> = {
  7: 'Caudate Nucleus',
  9: 'Caudate Nucleus',
  11: 'Amygdala',
  13: 'Caudate Nucleus',
  14: 'Basilar Pons',
  15: 'Basilar Pons',
  16: 'Basilar Pons',
  17: 'Basilar Pons',
  18: 'Cingulate Gyrus',
  19: 'Cingulate Gyrus',
  20: 'Cerebellar Tonsil',
  21: 'Cerebellar Tonsil',
  22: 'Cerebellar Tonsil',
  23: 'Calcarine Fissure',
  24: 'Calcarine Fissure',
}

const ubcCDx: Record<number, number> = {
  7: -0.28,
  9: -0.34,
  11: -0.28,
  13: 0.22,
  14: -0.06,
  15: 0,
  16: -0.17,
  17: -0.06,
  18: -2.68,
  19: 0.22,
  20: -0.39,
  21: 0.28,
  22: -0.56,
  23: 0.11,
  24: -0.61,
}

const ubcCFiles: Record<number, string> = {
  7: ubcC07,
  9: ubcC09,
  11: ubcC11,
  13: ubcC13,
  14: ubcC14,
  15: ubcC15,
  16: ubcC16,
  17: ubcC17,
  18: ubcC18,
  19: ubcC19,
  20: ubcC20,
  21: ubcC21,
  22: ubcC22,
  23: ubcC23,
  24: ubcC24,
}

/** The manifest (order: v3 UBC micrographs, v3 MSU coronals, v4 additions). */
export const sectionImages: SectionImage[] = [
  ...Object.entries(ubcNotes).map(([nStr, note]) => {
    const n = Number(nStr)
    const files = [
      ubc01, ubc02, ubc03, ubc04, ubc05, ubc06, ubc07, ubc08, ubc09, ubc10,
      ubc11, ubc12, ubc13, ubc14, ubc15, ubc16, ubc17,
    ]
    return {
      id: `ubc-m${String(n).padStart(2, '0')}`,
      levelId: ubcLevels[n],
      axis: 'transverse' as const,
      file: files[n - 1],
      source: 'ubc' as const,
      credit: UBC_CREDIT,
      creditUrl: UBC_LICENSE_URL,
      sourceUrl: ubcUrl(n),
      license: UBC_LICENSE,
      note,
    }
  }),
  ...Object.entries(bmmNotes).map(([lvStr, note]) => {
    const lv = lvStr
    const files = [bmm2240, bmm2390, bmm2500, bmm2660, bmm2800, bmm3270, bmm3440, bmm3600, bmm3710, bmm3820]
    const idx = ['2240', '2390', '2500', '2660', '2800', '3270', '3440', '3600', '3710', '3820'].indexOf(lv)
    return {
      id: `bmm-${lv}`,
      levelId: null, // coronal axis — not mappable to transverse levels.json anchors
      axis: 'coronal' as const,
      file: files[idx],
      source: 'brainmuseum' as const,
      credit: BMM_CREDIT,
      creditUrl: 'https://brains.anatomy.msu.edu/copyright.html',
      sourceUrl: `${BMM_BASE}/${lv}_cell.html`,
      license: BMM_LICENSE,
      note,
    }
  }),
  // ---- v4: UBC horizontal (transverse) section photographs ----------------
  ...[12, 13, 14, 15, 16, 17, 18, 19, 20].map((n) => {
    const lvlByY: Record<number, string> = {
      10: 'lvl-midbrain-ic',
      4: 'lvl-pons-rostral',
      '-2': 'lvl-pons-rostral',
      '-8': 'lvl-pons-middle',
      '-14': 'lvl-pons-caudal',
      '-26': 'lvl-pontomedullary',
      '-32': 'lvl-olivary',
      '-38': 'lvl-olivary',
      '-44': 'lvl-sensory-decuss',
    }
    return {
      id: `ubc-h${String(n).padStart(2, '0')}`,
      levelId: lvlByY[ubcHPlane[n]] ?? null,
      axis: 'transverse' as const,
      planeValue: ubcHPlane[n],
      planeValueNote: UBC_H_PLANE_NOTE,
      file: ubcHFiles[n],
      source: 'ubc' as const,
      credit: UBC_CREDIT,
      creditUrl: UBC_LICENSE_URL,
      sourceUrl: `${UBC_H_BASE}/h${n}/h${n}brain.png`,
      license: UBC_LICENSE,
      fit: { scale: UBC_H_FIT_SCALE, dx: ubcHDx[n], dy: 0, mirrorX: false },
      note: `UBC Functional Neuroanatomy horizontal section h${n} — real transverse plate of the head; the site viewer labels one landmark: "${ubcHLabels[n]}". Tissue-verbatim copy (alpha flattened onto white, lossless PNG re-encode, no crop).`,
    }
  }),
  // ---- v4: UBC coronal section photographs --------------------------------
  ...[7, 9, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((n) => {
    const lvlByZ: Record<number, string> = {
      1: 'lvl-thalamus-mid',
      '-4': 'lvl-thalamus-rostral',
      '-14': 'lvl-pons-caudal',
      '-46': 'lvl-spinal-medulla',
    }
    return {
      id: `ubc-c${String(n).padStart(2, '0')}`,
      levelId: lvlByZ[ubcCPlane[n]] ?? null,
      axis: 'coronal' as const,
      planeValue: ubcCPlane[n],
      planeValueNote: UBC_C_PLANE_NOTE,
      file: ubcCFiles[n],
      source: 'ubc' as const,
      credit: UBC_CREDIT,
      creditUrl: UBC_LICENSE_URL,
      sourceUrl: `${UBC_C_BASE}/c${n}/c${n}brain.png`,
      license: UBC_LICENSE,
      fit: { scale: UBC_C_FIT_SCALE, dx: ubcCDx[n], dy: 0, mirrorX: false },
      note: `UBC Functional Neuroanatomy coronal section c${n} — real coronal plate of the head; the site viewer labels one landmark: "${ubcCLabels[n]}". Tissue-verbatim copy (alpha flattened onto white, lossless PNG re-encode, no crop).`,
    }
  }),
  // ---- v4: Wikimedia Commons CC0 CT slices --------------------------------
  {
    id: 'wikict-axial-10',
    levelId: 'lvl-pons-rostral',
    axis: 'transverse' as const,
    planeValue: 2,
    planeValueNote:
      'Radiological slice index (4 mm thick, 1-based) placed on the canonical y range by pro-rating the series: index 10 of 40 superior→inferior over the head, ×2 au per slice on the brainstem (see IMAGING_SOURCES_V4.md §5). Unverified — refine visually.',
    file: ctAxial10,
    source: 'commons-ct' as const,
    credit: COMMONS_CT_CREDIT,
    creditUrl: COMMONS_CT_LICENSE_URL,
    sourceUrl: ctUrl('axial', 10),
    license: COMMONS_CT_LICENSE,
    note: 'Head CT, axial plane, 4 mm slice thickness, no intravenous contrast (CC0 series "CT of a normal brain", 18-year-old male). Half-scale lossless PNG re-encode, no crop.',
  },
  {
    id: 'wikict-axial-14',
    levelId: 'lvl-pons-middle',
    axis: 'transverse' as const,
    planeValue: -6,
    planeValueNote:
      'Radiological slice index (4 mm thick, 1-based) placed on the canonical y range by pro-rating the series: index 14 of 40 superior→inferior over the head, ×2 au per slice on the brainstem (see IMAGING_SOURCES_V4.md §5). Unverified — refine visually.',
    file: ctAxial14,
    source: 'commons-ct' as const,
    credit: COMMONS_CT_CREDIT,
    creditUrl: COMMONS_CT_LICENSE_URL,
    sourceUrl: ctUrl('axial', 14),
    license: COMMONS_CT_LICENSE,
    note: 'Head CT, axial plane, 4 mm slice thickness, no intravenous contrast (CC0 series "CT of a normal brain"). Half-scale lossless PNG re-encode, no crop.',
  },
  {
    id: 'wikict-axial-18',
    levelId: 'lvl-pons-caudal',
    axis: 'transverse' as const,
    planeValue: -14,
    planeValueNote:
      'Radiological slice index (4 mm thick, 1-based) placed on the canonical y range by pro-rating the series: index 18 of 40 superior→inferior over the head, ×2 au per slice on the brainstem (see IMAGING_SOURCES_V4.md §5). Unverified — refine visually.',
    file: ctAxial18,
    source: 'commons-ct' as const,
    credit: COMMONS_CT_CREDIT,
    creditUrl: COMMONS_CT_LICENSE_URL,
    sourceUrl: ctUrl('axial', 18),
    license: COMMONS_CT_LICENSE,
    note: 'Head CT, axial plane, 4 mm slice thickness, no intravenous contrast (CC0 series "CT of a normal brain"). Half-scale lossless PNG re-encode, no crop.',
  },
  // ---- v4b: NLM Visible Human Project axial cryosection photographs --------
  // Content-verbatim full-colour photographs (re-encoded JPEG q80, no crop, no
  // rotation, no annotation). `levelId: null` is deliberate: appending after
  // every existing entry means `pickStainImage(levelId)` can never let a
  // cryosection displace a v4-QA-verified UBC micrograph for a level, and the
  // plane-anchored path (`pickStainForPlane`) does not consult `levelId` at all.
  {
    id: 'vhp-0017',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 34.04,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0017,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0017.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -1.47, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0017 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 34.04 au; specimen symmetry axis 258 px against the frame centre 264 => dx -1.47 au.',
  },
  {
    id: 'vhp-0046',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 30.488,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0046,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0046.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -1.715, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0046 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 30.488 au; specimen symmetry axis 257 px against the frame centre 264 => dx -1.715 au.',
  },
  {
    id: 'vhp-0074',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 27.058,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0074,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0074.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.98, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0074 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 27.058 au; specimen symmetry axis 260 px against the frame centre 264 => dx -0.98 au.',
  },
  {
    id: 'vhp-0103',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 23.505,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0103,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0103.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.49, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0103 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 23.505 au; specimen symmetry axis 262 px against the frame centre 264 => dx -0.49 au.',
  },
  {
    id: 'vhp-0132',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 19.953,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0132,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0132.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -1.96, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0132 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 19.953 au; specimen symmetry axis 256 px against the frame centre 264 => dx -1.96 au.',
  },
  {
    id: 'vhp-0160',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 16.523,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0160,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0160.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0160 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 16.523 au; specimen symmetry axis 263 px against the frame centre 264 => dx -0.245 au.',
  },
  {
    id: 'vhp-0189',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 12.97,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0189,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0189.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0189 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 12.97 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0230',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 7.948,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0230,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0230.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0230 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 7.948 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0246',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: 5.988,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0246,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0246.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0246 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y 5.988 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0295',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -0.015,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0295,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0295.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0295 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -0.015 au; specimen symmetry axis 264 px against the frame centre 264 => dx 0 au.',
  },
  {
    id: 'vhp-0328',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -4.057,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0328,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0328.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0328 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -4.057 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0385',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -11.04,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0385,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0385.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0385 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -11.04 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0430',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -16.553,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0430,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0430.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0430 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -16.553 au; specimen symmetry axis 264 px against the frame centre 264 => dx 0 au.',
  },
  {
    id: 'vhp-0450',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -19.002,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0450,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0450.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0450 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -19.002 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0470',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -21.453,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0470,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0470.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: 0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0470 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -21.453 au; specimen symmetry axis 265 px against the frame centre 264 => dx 0.245 au.',
  },
  {
    id: 'vhp-0491',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -24.025,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0491,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0491.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0491 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -24.025 au; specimen symmetry axis 263 px against the frame centre 264 => dx -0.245 au.',
  },
  {
    id: 'vhp-0532',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -29.047,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0532,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0532.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.245, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0532 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -29.047 au; specimen symmetry axis 263 px against the frame centre 264 => dx -0.245 au.',
  },
  {
    id: 'vhp-0581',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -35.05,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0581,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0581.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.98, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0581 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -35.05 au; specimen symmetry axis 260 px against the frame centre 264 => dx -0.98 au.',
  },
  {
    id: 'vhp-0631',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -41.175,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0631,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0631.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.98, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0631 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -41.175 au; specimen symmetry axis 260 px against the frame centre 264 => dx -0.98 au.',
  },
  {
    id: 'vhp-0681',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -47.3,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0681,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0681.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.98, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0681 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -47.3 au; specimen symmetry axis 260 px against the frame centre 264 => dx -0.98 au.',
  },
  {
    id: 'vhp-0701',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -49.75,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0701,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0701.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.98, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0701 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -49.75 au; specimen symmetry axis 260 px against the frame centre 264 => dx -0.98 au.',
  },
  {
    id: 'vhp-0721',
    levelId: null,
    axis: 'transverse' as const,
    planeValue: -52.2,
    planeValueNote: VHP_PLANE_NOTE,
    file: vhp0721,
    source: 'vhp-nlm' as const,
    credit: VHP_CREDIT,
    creditUrl: VHP_TERMS_URL,
    sourceUrl: `${VHP_CRYO_BASE}/0721.02.jpg.gz`,
    license: VHP_LICENSE,
    fit: { scale: VHP_FIT_SCALE, dx: -0.98, dy: 0, mirrorX: false },
    note: 'NLM Visible Human Project cryosection, axial index 0721 of 1477 (528x764 px, 0.294 mm/px, 0.147 mm slice spacing) — content-verbatim re-encode (JPEG q80, no crop, no rotation, no annotation, full colour). Fitted canonical y -52.2 au; specimen symmetry axis 260 px against the frame centre 264 => dx -0.98 au.',
  },
]

/** All embedded plates for a levels.json anchor id (empty when unmapped). */
export function sectionImagesForLevel(levelId: string): SectionImage[] {
  return sectionImages.filter((img) => img.levelId === levelId)
}

/** All embedded plates with the given axis. */
export function sectionImagesForAxis(axis: SectionAxis): SectionImage[] {
  return sectionImages.filter((img) => img.axis === axis)
}

/** Plates whose anchor plane lies within `tolerance` au of `planeValue`. */
export function sectionImagesNearPlane(
  axis: SectionAxis,
  planeValue: number,
  tolerance = 1.5,
): SectionImage[] {
  return sectionImages.filter(
    (img) =>
      img.axis === axis &&
      img.planeValue !== undefined &&
      Math.abs(img.planeValue - planeValue) <= tolerance,
  )
}
