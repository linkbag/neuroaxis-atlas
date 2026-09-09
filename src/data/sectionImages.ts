/**
 * sectionImages.ts — level → real-imagery manifest (v3 "section sync" imaging).
 *
 * One entry per embedded real-image file (all in src/assets/imaging/stains/):
 * UBC brainstem/spinal-cord micrographs (m1..m17, embedded verbatim as JPEG
 * re-encodes at native 800×700, no crops) and MSU Human Brain Atlas coronal
 * cell stains (bmm-2240..3820, native 1050×700, JPEG re-encodes, no crops).
 *
 * Each `file` is a Vite-resolved asset URL (static import) — consumers can
 * use it directly as an <img src> or Image resource.
 *
 * Attribution policy (AUTHORITATIVE: docs/SECTION_SYNC_PLAN.md §1; per-source
 * evidence + fetch dates in docs/IMAGING_SOURCES.md, verbatim credit lines
 * documented in docs/ATTRIBUTION.md): the credit strings below are the EXACT
 * lines required by the plan and MUST be shown verbatim in-UI whenever the
 * corresponding real image is displayed. This software is non-commercial and
 * educational; UBC content is distributed under CC BY-NC-SA 4.0 (embedding an
 * unmodified copy — only resolution/encoding adapted — keeps the terms
 * trivially satisfied), brainmuseum content is embedded under the sites'
 * explicit permission policy with the required credit line (see the section
 * linked above for the outstanding permission-notification note).
 *
 * Level ids must match src/data/levels.json anchors. `levelId: null` entries
 * are reference crops not mappable to a transverse level (spinal-cord-only
 * micrographs, forebrain-level micrographs rostral to the top anchor, and all
 * coronal sections, which are a different axis).
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

export type ImageSource = 'ubc' | 'brainmuseum'
export type SectionAxis = 'transverse' | 'coronal'

/** One embedded real-image crop; `credit` MUST render verbatim with the image. */
export interface SectionImage {
  /** Stable manifest id, e.g. 'ubc-m05' or 'bmm-3440'. */
  id: string
  /** levels.json anchor id, or null when no transverse level matches. */
  levelId: string | null
  axis: SectionAxis
  /** Resolved asset URL (Vite static import). */
  file: string
  source: ImageSource
  /** EXACT credit line from SECTION_SYNC_PLAN §1 — render verbatim in-UI. */
  credit: string
  /** Permanent source page/direct-image URL for the "open source ↗" link. */
  sourceUrl: string
  license: string
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

const UBC_BASE = 'https://www.neuroanatomy.ca/micrographviewer/images/micrographs'
const BMM_BASE = 'https://brains.anatomy.msu.edu/brains/human/coronal'

function ubcUrl(n: number): string {
  return `${UBC_BASE}/m${n}/m${n}brain.png`
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

/** The manifest (see header comment; order: UBC rostro-caudal, then MSU). */
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
      sourceUrl: ubcUrl(n),
      license: 'CC BY-NC-SA 4.0',
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
      sourceUrl: `${BMM_BASE}/${lv}_cell.html`,
      license: BMM_LICENSE,
      note,
    }
  }),
]

/** All embedded stains for a levels.json anchor id (empty when unmapped). */
export function sectionImagesForLevel(levelId: string): SectionImage[] {
  return sectionImages.filter((img) => img.levelId === levelId)
}

/** All embedded stains with the given axis. */
export function sectionImagesForAxis(axis: SectionAxis): SectionImage[] {
  return sectionImages.filter((img) => img.axis === axis)
}
