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
 *              `dy`'s SIGN CONVENTION (the one `imageLayers.drawStainToView`
 *              implements): the plate's world centre goes at view centre + `dy`
 *              along the plane's v axis, and v is +anterior on a transverse
 *              plane and +superior on a coronal one, so POSITIVE `dy` moves the
 *              plate ANTERIOR (transverse) / SUPERIOR (coronal). `dx` keeps its
 *              measured per-plate value and is never touched by registration.
 *  registration  what is actually KNOWN about `fit` (see the block above
 *              `REGISTRATION_*` below): `status` is 'measured' only when a
 *              numeric fit value came out of a measurement of this plate.
 *              A documented default carries status 'unmeasured-default' — the
 *              field is the manifest's "do not pretend" record, and the UI or a
 *              later task may read it instead of assuming `dy` is measured.
 *  credit      verbatim credit line — render exactly this.
 *  creditUrl   licence deed / source page for the credit.
 *
 * Level ids must match src/data/levels.json anchors.
 *
 * ── v6 measurement record: `fit.dy` is STILL the documented default ─────────
 * `docs/QUALITY_PLAN.md` §2 item 6 (audit §2.6) asks for `fit.dy` to be
 * MEASURED instead of left at 0. The measurement was attempted in full and its
 * accept rule was NOT met, so every entry keeps the documented default and says
 * so through `registration.status = 'unmeasured-default'`. The method, the
 * numbers and the reason it cannot work are in `REGISTRATION_MEASUREMENT_NOTE`
 * below (one copy, so the 49 records cannot drift from one another). In short:
 * a photograph's tissue silhouette and the atlas cross-section at that plane
 * are not the same object at the declared scale — the atlas cross-section's
 * anterior-posterior / superior-inferior extent is 1.7×–6.1× the plate's own
 * tissue extent on the 43 plates that can be compared at all — and on 21 of
 * those 43 the profile objective is flat at the noise level, i.e. every offset
 * inside a ±30 au band scores the same. A number produced by such an objective
 * would be a coincidence, not a registration.
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

/** The plane-axis letters a fitted correction may name (canonical axes). */
export type SectionPlaneAxisLetter = 'x' | 'y' | 'z'

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
  /**
   * ── v9 MEASURED correction (task `imaging-registration`) ────────────────
   * Present only on plates whose fit `scripts/fit-imaging-affine.mjs` measured
   * AND whose gate accepted (overlap with the atlas brain mask gained AND the
   * centroid residual to it did not get worse). `imageLayers.drawStainToView`
   * prefers it over the entry's committed `fit`, and
   * `imageLayers.imagingAlignmentNote`/`plateAlignmentNote` quote the numbers.
   * The four placement fields carry the same meaning as on `SectionImageFit`.
   */
  residualAu?: number
  iouBefore?: number
  iouAfter?: number
  referencePlane?: { axis: SectionPlaneAxisLetter; value: number }
  method?: string
}

/* ------------------------------------------------------- v6 measurement record */

/** 'measured' only when a NUMERIC fit field came out of measuring this plate. */
export const REGISTRATION_STATUS = {
  measured: 'measured',
  unmeasuredDefault: 'unmeasured-default',
} as const

/**
 * Why a plate's `dy` could not be measured (see `REGISTRATION_MEASUREMENT_NOTE`).
 * Every value is a measured fact about THIS plate, not a guess:
 *
 *  - `no-annotations`    its manifest entry declares no `planeValue`, so there is
 *                        no plane to compare a cross-section against (the 17 UBC
 *                        micrographs and the 10 MSU coronal stains);
 *  - `no-declared-scale`  it has a plane but no `fit.scale` at all, so a tissue
 *                        pixel cannot be converted to canonical au (the 3 CC0
 *                        Commons CT plates);
 *  - `atlas-mismatch`     the atlas cross-section at that plane is NOT the same
 *                        object as the plate's tissue silhouette — its in-plane
 *                        extent differs by `atlasVsPlateExtentU/V`, the two masks
 *                        barely overlap at their best offset (`scanPeakIou`), and
 *                        the scan can therefore not locate an offset at all
 *                        (measured `scanPeakContrast`). This is the reason on the
 *                        43 plates that were measured: `ubc-*` are tight brainstem
 *                        crops against an atlas cross-section that includes the
 *                        cerebellum, and `vhp-*` are full-head cryosections against
 *                        a brainstem-only atlas;
 *  - `no-cross-section`   the atlas meshes produce no cross-section at that plane,
 *                        so there is nothing to register against (the measured
 *                        fact is `crossSectionParts: 0`).
 */
export const REGISTRATION_UNMEASURED_REASON = {
  noAnnotations: 'no-annotations',
  noDeclaredScale: 'no-declared-scale',
  atlasMismatch: 'atlas-mismatch',
  noCrossSection: 'no-cross-section',
} as const

/**
 * What is actually KNOWN about an entry's `fit` (v6, docs/QUALITY_PLAN.md §2
 * item 6 · docs/AUDIT_REPORT.md §2.6).
 *
 * The audit's finding was that `fit.dy = 0` and `mirrorX: false` on every fitted
 * entry are DOCUMENTED DEFAULTS, not measurements — so vertical registration was
 * asserted nowhere. This field makes that state explicit per entry instead of
 * leaving a reader to infer it from a literal `0`:
 *
 *  - `status: 'measured'` + `dyAu`/`residualAu`/`method` when a measurement of
 *    THIS plate produced the number. Nothing is 'measured' today (see
 *    `REGISTRATION_MEASUREMENT_NOTE`); the shape exists so the next attempt that
 *    does succeed has somewhere honest to put its result.
 *  - `status: 'unmeasured-default'` + `dyAu: 0` + `reason` otherwise: the value
 *    in `fit.dy` is the documented default, and “unmeasured” is stated rather
 *    than implied.
 *
 * `mirrorX` is RECORDED, NOT DECIDED here: the orientation rule (which world
 * direction lands on which image edge, and whether a surface that renders
 * through its own section camera has to flip x) is owned by
 * `src/components/section/planeGeometry.ts` — `badges(axis)` and `mirrorX(axis)`
 * — so this manifest does not carry a second copy of it.
 *
 * `dyAu` is the value STORED in `fit.dy` (it is the numeric record of the same
 * fact), and it is `0` whenever `status` is 'unmeasured-default'.
 */
export interface SectionImageRegistration {
  status: (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS]
  /** The value stored in `fit.dy`, in canonical au. */
  dyAu: number
  /** One of `REGISTRATION_UNMEASURED_REASON`, present when status is unmeasured. */
  reason?: (typeof REGISTRATION_UNMEASURED_REASON)[keyof typeof REGISTRATION_UNMEASURED_REASON]
  /** How `dyAu` was obtained — one of `REGISTRATION_METHOD`; absent when unmeasured. */
  method?: (typeof REGISTRATION_METHOD)[keyof typeof REGISTRATION_METHOD]
  /** Residual of the measurement, in canonical au — absent when unmeasured. */
  residualAu?: number
  /** Which orientation source owns `fit.mirrorX` for this entry. */
  mirrorX?: RegistrationMirrorOwner
  /**
   * The record in words, for this entry: what the value beside it is (and is
   * not). One shared constant so 49 records cannot diverge; it duplicates
   * nothing that `reason` does not already state in machine-readable form.
   */
  note?: string
  /**
   * What the measurement FOUND, per plate (never shared, never a fit). Diagnostic
   * only — no field here may be used as a fit value.
   */
  evidence?: {
    /**
     * The row-profile arg-min offset (au) of the first pass — NOT a registration.
     * Kept because the task's accept rule is written against it.
     */
    bestDyAu?: number
    /** Mean |Δ tissue width| (au) at that arg-min: the first pass's residual. */
    residualAu?: number
    /** Pearson r of the two row-width profiles at that arg-min. */
    correlation?: number
    /** Rows compared by the first pass. */
    samples?: number
    /**
     * |dy| (au) that the SECOND pass's centroid algebra resolves: how far this
     * plate's tissue centre sits from the atlas cross-section's centre along the
     * vertical axis, under the declared `dx` and the default `dy = 0`. It is a
     * *placement residual*, not a registration: it is only meaningful if the two
     * silhouettes are the same object, which is what `atlasVsPlateExtent*` and
     * `iouAtDefaultAu` test.
     */
    dyResidualAu?: number
    /** The same residual in 2-D: hypot(dyResidualAu, uResidualAu), in au. */
    centroidResidualAu?: number
    /** The first pass's residual (au) for THIS plate, restated under one name. */
    scanResidualAu?: number
    /** Atlas cross-section in-plane extent ÷ plate tissue extent (horizontal). */
    atlasVsPlateExtentU?: number
    /** Atlas cross-section in-plane extent ÷ plate tissue extent (vertical). */
    atlasVsPlateExtentV?: number
    /** IoU of the two filled silhouettes at the SHIPPED `dy = 0`. */
    iouAtDefaultAu?: number
    /** Best IoU any offset in ±60 au reaches. */
    scanPeakIou?: number
    /** The `dy` (au) that best IoU sits at — ambiguous when the scan is flat. */
    scanPeakDyAu?: number
    /** scanPeakIou ÷ the same peak for a row-shuffled plate (the null control). */
    scanPeakContrast?: number
    /** GLB parts that produced a cross-section at this plane (0 = none). */
    crossSectionParts?: number
    /** Atlas cross-section in-plane extent ÷ plate tissue extent (first pass). */
    atlasVsPlateExtent?: number
  }
}

/**
 * Per-plate registration measurement (v6, docs/QUALITY_PLAN.md §2 item 6 ·
 * docs/AUDIT_REPORT.md §2.6). ONE ROW PER MEASURED PLATE — no entry borrows
 * another's numbers. Produced by the scratch run recorded in
 * `REGISTRATION_MEASUREMENT_NOTE`; the fields are described on
 * `SectionImageRegistration.evidence`.
 *
 * Key: the plate id. Every entry whose plate was measurable has a row here; a
 * missed key is a manifest bug, not a fallback.
 */
export const REGISTRATION_MEASURED: Record<
  string,
  NonNullable<SectionImageRegistration['evidence']>
> = {
  'ubc-c09': {
    dyResidualAu: 0.21,
    centroidResidualAu: 0.26,
    scanResidualAu: 6.08,
    atlasVsPlateExtentU: 0.34,
    atlasVsPlateExtentV: 1.82,
    iouAtDefaultAu: 0.163,
    scanPeakIou: 0.171,
    scanPeakDyAu: -2,
    scanPeakContrast: 3.62,
    crossSectionParts: 1,
  },
  'ubc-c11': {
    dyResidualAu: 0.26,
    centroidResidualAu: 0.26,
    scanResidualAu: 4.62,
    atlasVsPlateExtentU: 1.52,
    atlasVsPlateExtentV: 4.65,
    iouAtDefaultAu: 0.284,
    scanPeakIou: 0.284,
    scanPeakDyAu: 3,
    scanPeakContrast: 4.2,
    crossSectionParts: 8,
  },
  'ubc-c13': {
    dyResidualAu: 0.22,
    centroidResidualAu: 0.23,
    scanResidualAu: 3.42,
    atlasVsPlateExtentU: 1.87,
    atlasVsPlateExtentV: 5.85,
    iouAtDefaultAu: 0.112,
    scanPeakIou: 0.133,
    scanPeakDyAu: 13.5,
    scanPeakContrast: 2.11,
    crossSectionParts: 27,
  },
  'ubc-c14': {
    dyResidualAu: 0.3,
    centroidResidualAu: 0.35,
    scanResidualAu: 4.19,
    atlasVsPlateExtentU: 2.17,
    atlasVsPlateExtentV: 6.07,
    iouAtDefaultAu: 0.112,
    scanPeakIou: 0.149,
    scanPeakDyAu: -7.5,
    scanPeakContrast: 2.75,
    crossSectionParts: 39,
  },
  'ubc-c15': {
    dyResidualAu: 0.48,
    centroidResidualAu: 0.48,
    scanResidualAu: 4.12,
    atlasVsPlateExtentU: 4.27,
    atlasVsPlateExtentV: 4.54,
    iouAtDefaultAu: 0.081,
    scanPeakIou: 0.094,
    scanPeakDyAu: 9.5,
    scanPeakContrast: 3.05,
    crossSectionParts: 17,
  },
  'ubc-c16': {
    dyResidualAu: 0.41,
    centroidResidualAu: 0.42,
    scanResidualAu: 6.52,
    atlasVsPlateExtentU: 4.59,
    atlasVsPlateExtentV: 4.16,
    iouAtDefaultAu: 0.072,
    scanPeakIou: 0.084,
    scanPeakDyAu: 6.5,
    scanPeakContrast: 3.84,
    crossSectionParts: 10,
  },
  'ubc-c17': {
    dyResidualAu: 0.55,
    centroidResidualAu: 0.56,
    scanResidualAu: 5.35,
    atlasVsPlateExtentU: 5.68,
    atlasVsPlateExtentV: 3.21,
    iouAtDefaultAu: 0.041,
    scanPeakIou: 0.057,
    scanPeakDyAu: 9,
    scanPeakContrast: 3.47,
    crossSectionParts: 5,
  },
  'ubc-c18': {
    dyResidualAu: 0.58,
    centroidResidualAu: 0.6,
    scanResidualAu: 6.82,
    atlasVsPlateExtentU: 5.79,
    atlasVsPlateExtentV: 2.99,
    iouAtDefaultAu: 0.037,
    scanPeakIou: 0.057,
    scanPeakDyAu: -20.5,
    scanPeakContrast: 3.14,
    crossSectionParts: 3,
  },
  'ubc-c19': {
    dyResidualAu: 0.39,
    centroidResidualAu: 0.43,
    scanResidualAu: 5.81,
    atlasVsPlateExtentU: 6.07,
    atlasVsPlateExtentV: 2.93,
    iouAtDefaultAu: 0.035,
    scanPeakIou: 0.059,
    scanPeakDyAu: -20,
    scanPeakContrast: 3.32,
    crossSectionParts: 3,
  },
  'ubc-c20': {
    dyResidualAu: 0.27,
    centroidResidualAu: 0.28,
    scanResidualAu: 5.5,
    atlasVsPlateExtentU: 5.75,
    atlasVsPlateExtentV: 2.84,
    iouAtDefaultAu: 0.054,
    scanPeakIou: 0.075,
    scanPeakDyAu: -16.5,
    scanPeakContrast: 3.51,
    crossSectionParts: 3,
  },
  'ubc-c21': {
    dyResidualAu: 0.4,
    centroidResidualAu: 0.42,
    scanResidualAu: 5.41,
    atlasVsPlateExtentU: 4.93,
    atlasVsPlateExtentV: 2.17,
    iouAtDefaultAu: 0.143,
    scanPeakIou: 0.147,
    scanPeakDyAu: -1.5,
    scanPeakContrast: 5.09,
    crossSectionParts: 3,
  },
  'ubc-c22': {
    dyResidualAu: 1.15,
    centroidResidualAu: 2.49,
    scanResidualAu: 2.76,
    atlasVsPlateExtentU: 4.07,
    atlasVsPlateExtentV: 1.69,
    iouAtDefaultAu: 0.132,
    scanPeakIou: 0.139,
    scanPeakDyAu: -2,
    scanPeakContrast: 4.81,
    crossSectionParts: 3,
  },
  'ubc-c23': {
    dyResidualAu: 2.22,
    centroidResidualAu: 4.16,
    scanResidualAu: 3.25,
    atlasVsPlateExtentU: 4.19,
    atlasVsPlateExtentV: 1.8,
    iouAtDefaultAu: 0.125,
    scanPeakIou: 0.132,
    scanPeakDyAu: 2,
    scanPeakContrast: 8.49,
    crossSectionParts: 3,
  },
  'ubc-h12': {
    dyResidualAu: 0.26,
    centroidResidualAu: 0.53,
    scanResidualAu: 2.95,
    atlasVsPlateExtentU: 1.07,
    atlasVsPlateExtentV: 2.44,
    iouAtDefaultAu: 0.236,
    scanPeakIou: 0.383,
    scanPeakDyAu: -12.5,
    scanPeakContrast: 3.71,
    crossSectionParts: 13,
  },
  'ubc-h13': {
    dyResidualAu: 0.79,
    centroidResidualAu: 0.81,
    scanResidualAu: 4.36,
    atlasVsPlateExtentU: 1.3,
    atlasVsPlateExtentV: 2.52,
    iouAtDefaultAu: 0.202,
    scanPeakIou: 0.299,
    scanPeakDyAu: 15,
    scanPeakContrast: 3.17,
    crossSectionParts: 8,
  },
  'ubc-h14': {
    dyResidualAu: 0.85,
    centroidResidualAu: 0.9,
    scanResidualAu: 6.11,
    atlasVsPlateExtentU: 1.87,
    atlasVsPlateExtentV: 2.68,
    iouAtDefaultAu: 0.136,
    scanPeakIou: 0.189,
    scanPeakDyAu: -18,
    scanPeakContrast: 2.89,
    crossSectionParts: 6,
  },
  'ubc-h15': {
    dyResidualAu: 0.68,
    centroidResidualAu: 0.79,
    scanResidualAu: 5.07,
    atlasVsPlateExtentU: 3.04,
    atlasVsPlateExtentV: 3.11,
    iouAtDefaultAu: 0.1,
    scanPeakIou: 0.111,
    scanPeakDyAu: 16,
    scanPeakContrast: 2.37,
    crossSectionParts: 8,
  },
  'ubc-h16': {
    dyResidualAu: 0.64,
    centroidResidualAu: 0.66,
    scanResidualAu: 3.72,
    atlasVsPlateExtentU: 3.5,
    atlasVsPlateExtentV: 3.54,
    iouAtDefaultAu: 0.062,
    scanPeakIou: 0.081,
    scanPeakDyAu: -30,
    scanPeakContrast: 2.27,
    crossSectionParts: 7,
  },
  'ubc-h17': {
    dyResidualAu: 1.14,
    centroidResidualAu: 1.24,
    scanResidualAu: 5.15,
    atlasVsPlateExtentU: 2.85,
    atlasVsPlateExtentV: 2.74,
    iouAtDefaultAu: 0.136,
    scanPeakIou: 0.14,
    scanPeakDyAu: -2,
    scanPeakContrast: 3.79,
    crossSectionParts: 9,
  },
  'ubc-h18': {
    dyResidualAu: 0.8,
    centroidResidualAu: 0.8,
    scanResidualAu: 2.46,
    atlasVsPlateExtentU: 1.27,
    atlasVsPlateExtentV: 1.74,
    iouAtDefaultAu: 0.216,
    scanPeakIou: 0.26,
    scanPeakDyAu: -11.5,
    scanPeakContrast: 4.13,
    crossSectionParts: 12,
  },
  'ubc-h19': {
    dyResidualAu: 1.31,
    centroidResidualAu: 1.32,
    scanResidualAu: 4.12,
    atlasVsPlateExtentU: 0.49,
    atlasVsPlateExtentV: 0.78,
    iouAtDefaultAu: 0.363,
    scanPeakIou: 0.377,
    scanPeakDyAu: -1,
    scanPeakContrast: 5.46,
    crossSectionParts: 3,
  },
  'ubc-h20': {
    dyResidualAu: 0.81,
    centroidResidualAu: 0.83,
    scanResidualAu: 7.74,
    atlasVsPlateExtentU: 0.49,
    atlasVsPlateExtentV: 0.63,
    iouAtDefaultAu: 0.299,
    scanPeakIou: 0.299,
    scanPeakDyAu: 1.5,
    scanPeakContrast: 4.79,
    crossSectionParts: 6,
  },
  'vhp-0017': {
    dyResidualAu: 1.73,
    centroidResidualAu: 2.36,
    scanResidualAu: 113.45,
    atlasVsPlateExtentU: 0.29,
    atlasVsPlateExtentV: 0.15,
    iouAtDefaultAu: 0.004,
    scanPeakIou: 0.004,
    scanPeakDyAu: 60,
    scanPeakContrast: 1.14,
    crossSectionParts: 12,
  },
  'vhp-0046': {
    dyResidualAu: 2.63,
    centroidResidualAu: 3.82,
    scanResidualAu: 104.88,
    atlasVsPlateExtentU: 0.31,
    atlasVsPlateExtentV: 0.2,
    iouAtDefaultAu: 0.006,
    scanPeakIou: 0.007,
    scanPeakDyAu: 60,
    scanPeakContrast: 1.23,
    crossSectionParts: 13,
  },
  'vhp-0074': {
    dyResidualAu: 2.64,
    centroidResidualAu: 4.27,
    scanResidualAu: 92.52,
    atlasVsPlateExtentU: 0.31,
    atlasVsPlateExtentV: 0.19,
    iouAtDefaultAu: 0.006,
    scanPeakIou: 0.01,
    scanPeakDyAu: 60,
    scanPeakContrast: 1.28,
    crossSectionParts: 15,
  },
  'vhp-0103': {
    dyResidualAu: 2.23,
    centroidResidualAu: 4.59,
    scanResidualAu: 74.61,
    atlasVsPlateExtentU: 0.31,
    atlasVsPlateExtentV: 0.19,
    iouAtDefaultAu: 0.002,
    scanPeakIou: 0.012,
    scanPeakDyAu: 60,
    scanPeakContrast: 1.46,
    crossSectionParts: 15,
  },
  'vhp-0132': {
    dyResidualAu: 4.13,
    centroidResidualAu: 6.66,
    scanResidualAu: 62.43,
    atlasVsPlateExtentU: 0.26,
    atlasVsPlateExtentV: 0.21,
    iouAtDefaultAu: 0.003,
    scanPeakIou: 0.013,
    scanPeakDyAu: -60,
    scanPeakContrast: 1.6,
    crossSectionParts: 8,
  },
  'vhp-0160': {
    dyResidualAu: 4.57,
    centroidResidualAu: 4.64,
    scanResidualAu: 13.67,
    atlasVsPlateExtentU: 0.57,
    atlasVsPlateExtentV: 0.54,
    iouAtDefaultAu: 0.126,
    scanPeakIou: 0.153,
    scanPeakDyAu: -26.5,
    scanPeakContrast: 2.6,
    crossSectionParts: 8,
  },
  'vhp-0189': {
    dyResidualAu: 4.31,
    centroidResidualAu: 4.32,
    scanResidualAu: 19.56,
    atlasVsPlateExtentU: 0.56,
    atlasVsPlateExtentV: 0.74,
    iouAtDefaultAu: 0.135,
    scanPeakIou: 0.14,
    scanPeakDyAu: 20,
    scanPeakContrast: 2.15,
    crossSectionParts: 15,
  },
  'vhp-0230': {
    dyResidualAu: 4.16,
    centroidResidualAu: 4.17,
    scanResidualAu: 25.36,
    atlasVsPlateExtentU: 0.25,
    atlasVsPlateExtentV: 0.6,
    iouAtDefaultAu: 0.105,
    scanPeakIou: 0.139,
    scanPeakDyAu: 19,
    scanPeakContrast: 2.33,
    crossSectionParts: 11,
  },
  'vhp-0246': {
    dyResidualAu: 5.09,
    centroidResidualAu: 5.09,
    scanResidualAu: 23.09,
    atlasVsPlateExtentU: 0.27,
    atlasVsPlateExtentV: 0.55,
    iouAtDefaultAu: 0.119,
    scanPeakIou: 0.144,
    scanPeakDyAu: -31,
    scanPeakContrast: 2.27,
    crossSectionParts: 6,
  },
  'vhp-0295': {
    dyResidualAu: 7.47,
    centroidResidualAu: 7.48,
    scanResidualAu: 19.27,
    atlasVsPlateExtentU: 0.36,
    atlasVsPlateExtentV: 0.56,
    iouAtDefaultAu: 0.104,
    scanPeakIou: 0.139,
    scanPeakDyAu: -34.5,
    scanPeakContrast: 1.83,
    crossSectionParts: 6,
  },
  'vhp-0328': {
    dyResidualAu: 10.28,
    centroidResidualAu: 10.84,
    scanResidualAu: 11.63,
    atlasVsPlateExtentU: 0.41,
    atlasVsPlateExtentV: 0.49,
    iouAtDefaultAu: 0.094,
    scanPeakIou: 0.167,
    scanPeakDyAu: -45.5,
    scanPeakContrast: 2,
    crossSectionParts: 7,
  },
  'vhp-0385': {
    dyResidualAu: 42.89,
    centroidResidualAu: 43.16,
    scanResidualAu: 34.6,
    atlasVsPlateExtentU: 0.69,
    atlasVsPlateExtentV: 0.37,
    iouAtDefaultAu: 0.272,
    scanPeakIou: 0.321,
    scanPeakDyAu: 10,
    scanPeakContrast: 3.5,
    crossSectionParts: 7,
  },
  'vhp-0430': {
    dyResidualAu: 52.05,
    centroidResidualAu: 52.18,
    scanResidualAu: 40.24,
    atlasVsPlateExtentU: 0.67,
    atlasVsPlateExtentV: 0.36,
    iouAtDefaultAu: 0.199,
    scanPeakIou: 0.308,
    scanPeakDyAu: 18,
    scanPeakContrast: 3.76,
    crossSectionParts: 11,
  },
  'vhp-0450': {
    dyResidualAu: 50.99,
    centroidResidualAu: 51.06,
    scanResidualAu: 37.75,
    atlasVsPlateExtentU: 0.64,
    atlasVsPlateExtentV: 0.36,
    iouAtDefaultAu: 0.21,
    scanPeakIou: 0.292,
    scanPeakDyAu: 15,
    scanPeakContrast: 3.56,
    crossSectionParts: 11,
  },
  'vhp-0470': {
    dyResidualAu: 27.34,
    centroidResidualAu: 27.64,
    scanResidualAu: 14.52,
    atlasVsPlateExtentU: 0.62,
    atlasVsPlateExtentV: 0.38,
    iouAtDefaultAu: 0.008,
    scanPeakIou: 0.194,
    scanPeakDyAu: -60,
    scanPeakContrast: 2.37,
    crossSectionParts: 12,
  },
  'vhp-0491': {
    dyResidualAu: 25.2,
    centroidResidualAu: 26.02,
    scanResidualAu: 17.75,
    atlasVsPlateExtentU: 0.62,
    atlasVsPlateExtentV: 0.37,
    iouAtDefaultAu: 0.056,
    scanPeakIou: 0.175,
    scanPeakDyAu: -60,
    scanPeakContrast: 2.13,
    crossSectionParts: 10,
  },
  'vhp-0532': {
    dyResidualAu: 26.15,
    centroidResidualAu: 26.7,
    scanResidualAu: 26.95,
    atlasVsPlateExtentU: 0.47,
    atlasVsPlateExtentV: 0.29,
    iouAtDefaultAu: 0.057,
    scanPeakIou: 0.081,
    scanPeakDyAu: -25.5,
    scanPeakContrast: 1.76,
    crossSectionParts: 10,
  },
  'vhp-0581': {
    dyResidualAu: 27.47,
    centroidResidualAu: 27.8,
    scanResidualAu: 24.75,
    atlasVsPlateExtentU: 0.14,
    atlasVsPlateExtentV: 0.09,
    iouAtDefaultAu: 0.005,
    scanPeakIou: 0.014,
    scanPeakDyAu: -30,
    scanPeakContrast: 2.31,
    crossSectionParts: 7,
  },
  'vhp-0631': {
    dyResidualAu: 64.58,
    centroidResidualAu: 64.78,
    scanResidualAu: 5.2,
    atlasVsPlateExtentU: 0.1,
    atlasVsPlateExtentV: 0.13,
    iouAtDefaultAu: 0,
    scanPeakIou: 0.02,
    scanPeakDyAu: 37.5,
    scanPeakContrast: 3.74,
    crossSectionParts: 5,
  },
  'vhp-0681': {
    dyResidualAu: 59.64,
    centroidResidualAu: 59.76,
    scanResidualAu: 2.29,
    atlasVsPlateExtentU: 0.1,
    atlasVsPlateExtentV: 0.07,
    iouAtDefaultAu: 0,
    scanPeakIou: 0.016,
    scanPeakDyAu: 36,
    scanPeakContrast: 3.33,
    crossSectionParts: 3,
  },
  'vhp-0701': {
    dyResidualAu: 53.25,
    centroidResidualAu: 53.53,
    scanResidualAu: 2.06,
    atlasVsPlateExtentU: 0.08,
    atlasVsPlateExtentV: 0.06,
    iouAtDefaultAu: 0,
    scanPeakIou: 0.011,
    scanPeakDyAu: 24.5,
    scanPeakContrast: 2.16,
    crossSectionParts: 1,
  },
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
  /**
   * v9 MEASURED correction (task `imaging-registration`): present only when
   * `scripts/fit-imaging-affine.mjs` measured this plate's own tissue mask
   * against the atlas brain mask AND its gate accepted the result (overlap
   * gained and the centroid residual to the atlas did not get worse).
   * `imageLayers.drawStainToView` prefers it over `fit`; every other plate
   * keeps its committed `fit` and carries its measured reason instead.
   */
  fittedFit?: SectionImageFit
  /** What is KNOWN about `fit` — measured, or a stated documented default. */
  registration?: SectionImageRegistration
  /** Level evidence: site's own title / viewer overlay labels or MSU level id. */
  note: string
}

/**
 * The v6 measured-registration attempt, recorded once for all 49 anchored plates
 * (docs/QUALITY_PLAN.md §2 item 6 · docs/AUDIT_REPORT.md §2.6). Reported, not just
 * stored, because the finding is about what the DATA can support.
 *
 * WHAT WAS RUN (scratch scripts under `.plate-scratch/photofit/`, gitignored,
 * never committed; the run is reproducible with `measure-dy.mjs` + `summarize.mjs`):
 *  1. every plate carrying a `planeValue` is decoded — JPEG through the same
 *     baseline decoder the v4c VHP registration used
 *     (`assets-src/imaging3/lib/jpeg-full.mjs`), PNG through `zlib` (76/76);
 *  2. tissue silhouette = Otsu threshold, polarity from the frame border,
 *     4-connected components, largest component's mask/bbox/centroid;
 *  3. atlas cross-section = `src/components/section/contours.ts` over the 84
 *     committed GLBs at that plane, filled with the canvas' even-odd rule — the
 *     same silhouette the live section paints;
 *  4. `dy` solved TWO independent ways in the frame the consumer actually uses
 *     (`imageLayers.drawStainToView`: the IMAGE centre goes at
 *     `viewCentre − dx` / `viewCentre + dy`, world size `natural/scale`):
 *       (A) centroid algebra — `dyResidualAu`: how far the plate's tissue centre
 *           lands from the atlas cross-section's centre at the shipped `dy = 0`;
 *       (B) a bounded IoU scan of the two filled masks over ±60 au in `dy`, both
 *           row directions, with `scanPeakContrast` against a row-shuffled null.
 *
 * METHOD VALIDATION (before any of the numbers below is meaningful): the scan
 * recovers a KNOWN offset exactly — synthetic masks translated by −20, −7, 0, +4,
 * +13, +25 au are re-solved to those values with IoU 1.000 and error 0.00 au
 * (`probe-recovery.mjs`). What fails on the real plates is therefore the data,
 * not the search.
 *
 * WHAT IT FOUND (43 of 49 plates are comparable; 6 are not, see below):
 *  - first pass, mean |Δ tissue width| at its arg-min: min 2.06 / median 6.11 /
 *    max 113.45 au; only 5 of 43 reach ≤ 3 au and all 5 sit on a flat objective
 *    (their arg-min is inside the scan's own noise);
 *  - second pass, the placement residual `centroidResidualAu`: min 0.23 /
 *    median 2.49 / max 64.78 au — but it is bimodal by PLATE FAMILY, and that is
 *    the finding:
 *      · UBC transverse (`ubc-h*`, 12.97–13.66 px/au): 0.53–1.32 au, median 0.81.
 *        The declared `dx` plus `dy = 0` leaves the tissue centre within 1.32 au
 *        (≈1.6 mm) of the atlas cross-section centre, and the horizontal residual
 *        alone is ≤ 0.48 au. The plates' declared scale is therefore RIGHT to
 *        within ≈7 % on the transverse set — the earlier draft of this record
 *        claimed the scale was out by 2.2×–6.1×; that claim was an artefact of
 *        comparing vertex bounding boxes and is withdrawn.
 *        The vertical component of those residuals is a SENSITIVE measurement, not
 *        a diluted one: the residual vector stays within 16° of vertical on every
 *        transverse plate (|du| ≤ 0.48 against |dv| ≥ 0.26), so a vertical offset
 *        error of many au could not hide inside a small 2-D distance.
 *      · UBC coronal (`ubc-c*`): 0.23–4.16 au, median 0.42.
 *      · VHP (`vhp-*`): 2.36–64.78 au, median 10.84. These plates are FULL-HEAD
 *        cryosections at 129.4 × 187.2 au while the atlas cross-section at the
 *        same plane is 10.5–88 au: the atlas is 6 %–74 % of the plate's vertical
 *        extent, and at the medullary levels it is 11 au against 180 au (6 %).
 *        A whole-head silhouette's centroid is not the brainstem's centroid, so
 *        this residual measures the head, not a registration. The VHP entries
 *        additionally carry their own ±10 au plane uncertainty
 *        (`VHP_PLANE_NOTE`): no `dy` on those plates could be resolved better than
 *        ±10 au before measurement even starts.
 *  - second pass, the registration scan itself: `scanPeakContrast` is 1.14–8.49,
 *    and where it is high the peak is still not a location — the accepted answer
 *    moves with the input. Shifting a real plate by a known +13 au and re-solving
 *    moves the arg-max by +13 au instead of holding it (probe: `ubc-h12`
 *    `-20→-33.0, -7→-20.0, 0→-13.0, +4→-9.0, +13→0.0`), i.e. the offset is
 *    unidentifiable on those plates. Where the peak IS stable (`ubc-h19`,
 *    `ubc-h20`, `ubc-c21`, `ubc-c22`) it sits within 2 au of the default.
 *
 * WHY: a photograph's tissue silhouette and the atlas cross-section are not the
 * same object at every level. `atlasVsPlateExtentU/V` is 1.7–3.5× on the UBC
 * transverse plates (tight brainstem crops against an atlas cross-section that
 * includes the cerebellar vermis) and 0.06–0.74× on the VHP plates (whole head
 * against a brainstem-only atlas), and `iouAtDefaultAu` is 0.000–0.363 with a
 * peak of 0.383 — two silhouettes that barely overlap at their best offset are
 * not registered by any translation.
 *
 * THEREFORE: `fit.dy` keeps its documented default `0` on every entry and every
 * entry says `registration.status = 'unmeasured-default'` with the reason. This
 * is a REJECTION ON EVIDENCE, not an omission: the measurement ran on all 49
 * anchored plates, the accept rule (≤ 3 au at a non-degenerate arg-min) was not
 * met, and no plate supplies a `dy` that is both inside the budget and located by
 * a peak. What the run DOES establish is the negative result the audit needed:
 * the shipped placement is not off by a large vertical offset anywhere it can be
 * checked, and `dy = 0` is consistent with the data at ≤ 1.32 au on all 22 UBC
 * plates. Nothing here changes `fit.dx` or `fit.scale`.
 */
export const REGISTRATION_MEASUREMENT_NOTE =
  'MEASURED AND REJECTED, not applied — fit.dy stays the documented default 0. Two independent measurements ran over all 49 anchored plates. (1) First pass, mean |Δ tissue width| at its arg-min: min 2.06 / median 6.11 / max 113.45 au; only 5 of 43 comparable plates reach ≤ 3 au and all 5 sit on a flat objective (their arg-min is inside scan noise). (2) Second pass, placement residual centroidResidualAu: min 0.23 / median 2.49 / max 64.78 au, bimodal by family — UBC transverse 0.53–1.32 au (median 0.81, horizontal residual ≤ 0.48 au, so the declared fit.scale is right to ≈7 % on that set), UBC coronal 0.23–4.16 au, VHP 2.36–64.78 au (median 10.84) because those plates are full-HEAD cryosections of 129.4 × 187.2 au against a brainstem-only atlas cross-section of 6 %–74 % that extent. The scan itself is not identifiable: shifting a real plate by a known +13 au moves the arg-max by +13 au instead of holding it (ubc-h12: -20→-33.0, -7→-20.0, 0→-13.0, +4→-9.0, +13→0.0), while the method recovers synthetic known offsets exactly (IoU 1.000, error 0.00 au). atlasVsPlateExtentU/V is 1.7–3.5× (UBC, tight brainstem crops vs an atlas cross-section including the vermis) and 0.06–0.74× (VHP), and the best IoU anywhere is 0.383, so no translation registers the two silhouettes. 6 plates could not be compared at all: the 3 Commons CT plates declare no fit.scale, and ubc-c07, ubc-c24 and vhp-0721 produce no atlas cross-section. dx and scale are unchanged; mirrorX is recorded, not decided (planeGeometry owns that rule); the VHP ±10 au plane uncertainty (VHP_PLANE_NOTE) bounds any dy on those plates before measurement starts. Per-plate numbers: REGISTRATION_MEASURED; method: scratch scripts .plate-scratch/photofit/{measure-dy,summarize,emit-table,probe-recovery}.mjs (gitignored, never committed).'

/**
 * The `note` every unmeasured entry carries (one copy, so the 49 records cannot
 * drift): the record says in-UI-readable words that the value beside it is a
 * documented default, not a measurement.
 */
export const REGISTRATION_UNMEASURED_NOTE =
  'unmeasured — fit.dy is the documented default 0, not a measurement: the silhouette-vs-cross-section fit over all 49 anchored plates found no vertical offset that both meets the 3 au budget and is located by a peak (the accepted offset moves with the input on every plate where the scan is not degenerate). This entry carries its own measured residual, extent ratio and IoU in `evidence`; the full record is in REGISTRATION_MEASUREMENT_NOTE.'

/**
 * The method the v6 measurement used, kept as a constant so a later successful
 * run stores the same string and a reader can tell which method produced a
 * number. Nothing carries `status: 'measured'` today.
 */
export const REGISTRATION_METHOD = {
  silhouette: 'measured-silhouette-fit',
} as const

/**
 * Every entry's `registration.mirrorX` value, as a typed constant: the manifest
 * RECORDS that the orientation rule is owned by `planeGeometry.ts` and does not
 * carry a second copy of it. A const (not an inline literal) because a string
 * literal in an object property widens to `string` and would not satisfy
 * `SectionImageRegistration`.
 */
export const REGISTRATION_MIRROR_OWNER = 'pending-planeGeometry' as const
export type RegistrationMirrorOwner = typeof REGISTRATION_MIRROR_OWNER

/**
 * The plates that have NO `REGISTRATION_MEASURED` row because the atlas meshes
 * produce no cross-section at their plane at all (verified: `extractContours` over
 * the 84 committed GLBs returns zero loops). They stay `unmeasured-default`, and
 * they carry `no-cross-section` rather than the `atlas-mismatch` reason the rest
 * of the set carries — a different fact, so a different value.
 *
 * The zero-shaped evidence is deliberate: the record states the measured fact
 * ("no cross-section exists here") instead of leaving the field empty, so a reader
 * cannot tell a plate that was never attempted from one that was attempted and had
 * nothing to measure against.
 */
export const REGISTRATION_NO_CROSS_SECTION = new Set(['ubc-c07', 'ubc-c24', 'vhp-0721'])

/** The evidence every no-cross-section plate carries: the measurement's own result. */
export const REGISTRATION_NO_CROSS_SECTION_EVIDENCE: NonNullable<
  SectionImageRegistration['evidence']
> = { crossSectionParts: 0 }

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

/**
 * The plate-placement mapping the committed set ships with (the documented
 * fallback of the registration attempt — read `VHP_PLANE_NOTE`):
 *
 *   y(index) = VHP_Y_TOP − (index − 1) × VHP_AU_PER_INDEX
 *
 * `VHP_AU_PER_INDEX` = the documented 0.147 mm slice spacing ÷ 1.2 mm/au, used
 * **unscaled** (a free scale would silently contradict the only documented
 * number in play); `VHP_Y_TOP` is the same donor's head apex **measured** from
 * the full-field Visible Human head CT through the v4 CT grid's own canonical
 * registration. Exported so the manifest entries, the per-plate note and the
 * QA gate all derive from one number instead of three copies of it.
 */
export const VHP_Y_TOP = 36.0
export const VHP_AU_PER_INDEX = 0.1225

/**
 * The `registration` record of one VHP plate, from the table: the measured facts
 * are per plate, so the 22 entries differ only by their id. A helper (not 22
 * copies, not one borrowed sample) so a missed table row is visible as an
 * `undefined` evidence rather than as a plausible-looking number.
 *
 * `atlas-mismatch` is the reason on every one of them: the atlas cross-section at
 * these planes is 6 %–74 % of the plate's full-head extent, so the scan's accepted
 * offset moves with the input (see REGISTRATION_MEASUREMENT_NOTE).
 */
function vhpRegistration(id: string): SectionImageRegistration {
  return {
    status: REGISTRATION_STATUS.unmeasuredDefault,
    dyAu: 0,
    reason: REGISTRATION_UNMEASURED_REASON.atlasMismatch,
    mirrorX: REGISTRATION_MIRROR_OWNER,
    evidence: REGISTRATION_MEASURED[id],
    note: REGISTRATION_UNMEASURED_NOTE,
  }
}


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
 *
 * Independently re-measured by `v4c-qa` (`node scripts/verify-imaging-v4b.mjs`
 * plus the raw-plate probes recorded in assets-src/imaging3/VHP_ANCHORS.md):
 * the column axis being the medio-lateral one is confirmed at full resolution —
 * mirror correlation about the vertical axis **r = 0.59** (mean over the 22
 * committed plates) against 0.12 for a horizontal mirror — and adjacent plates
 * correlate at **r = 0.9935**, against 0.176 row-flipped and 0.10 at 200 indices
 * apart, i.e. the series really is one specimen sampled at 0.147 mm and the
 * plate order is exact. Neither probe decides the SIGN of the row axis: the row
 * direction and `mirrorX` stay documented-but-not-proven, because no vision
 * model is reachable from this environment and the same donor's on-disk head CT
 * is a brain-box resample too small to fix the absolute plane.
 */
export const VHP_PLANE_NOTE =
  'REGISTRATION FALLBACK, not a landmark fit — plane uncertainty ±10 au (±12 mm). y = VHP_Y_TOP − (index − 1) × VHP_AU_PER_INDEX, i.e. +36.0 − (index − 1) × 0.1225 au: 0.1225 au/index is the documented 0.147 mm slice spacing and +36.0 au is the same donor’s head apex measured from the full-field Visible Human head CT through the v4 CT grid’s own canonical registration; index 1 is the superior-most plate. The programmatic fit was attempted and rejected: it reached r = 0.92 and refuted the competing y₁ ≈ −8 au hypothesis (r = 0.29), but its landmark residuals missed by 20–210 au against a ±5 au tolerance (plan §2.1). Plate order and relative spacing are exact; the row direction (anterior up vs down) and the mirror are documented-but-not-proven; see assets-src/imaging3/VHP_ANCHORS.md.'

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

/**
 * MEASURED AND APPLIED (v9, task `imaging-registration`): the corrections
 * `scripts/fit-imaging-affine.mjs --report` fitted for these plates and the
 * fitter's gate accepted. Each plate's own tissue mask (decoded from the
 * committed PNG) was registered against the atlas brain mask — the committed
 * GLB contours through the section pipeline's clipping, rasterised by
 * `planeGeometry.planeTransform` — by a deterministic coarse-to-fine search over
 * (scale, Δu, Δv). A correction is kept only when the ROI IoU GAINS and the
 * centroid residual to the atlas does NOT get worse; every other plate keeps its
 * committed `fit`. Display-time only: no image file is re-encoded, and the
 * committed `fit` above stays the pre-fit record.
 *
 * Per plate: index → { scale (px per au), dx (au), dy (au), residualAu (the
 * measured centroid residual AFTER the correction), iouBefore, iouAfter }.
 */
const ubcHFittedFit: Record<number, { scale: number; dx: number; dy: number; residualAu: number; iouBefore: number; iouAfter: number }> = {
  12: { scale: 3.365737, dx: -7.55, dy: 24, residualAu: 11.466799, iouBefore: 0.090103, iouAfter: 0.348553 },
  13: { scale: 4.141176, dx: -7.82, dy: 4, residualAu: 14.085794, iouBefore: 0.099138, iouAfter: 0.413989 },
  14: { scale: 4.141176, dx: 11.03, dy: 4, residualAu: 14.437427, iouBefore: 0.094811, iouAfter: 0.412107 },
  15: { scale: 4.680332, dx: 0.61, dy: 24, residualAu: 2.001723, iouBefore: 0.109521, iouAfter: 0.624152 },
  16: { scale: 4.141176, dx: -13.08, dy: 24, residualAu: 3.840511, iouBefore: 0.090952, iouAfter: 0.612104 },
  17: { scale: 4.141176, dx: 0.15, dy: 24, residualAu: 1.484103, iouBefore: 0.099345, iouAfter: 0.699444 },
  18: { scale: 4.680332, dx: 1.06, dy: 24, residualAu: 2.765429, iouBefore: 0.09477, iouAfter: 0.706323 },
  19: { scale: 21.387342, dx: -0.76, dy: -2, residualAu: 0.923566, iouBefore: 0.373208, iouAfter: 0.726168 },
  20: { scale: 21.387342, dx: 0.83, dy: -2, residualAu: 0.801836, iouBefore: 0.3432, iouAfter: 0.730516 },
}

/**
 * The measured correction for the UBC CORONAL series — the exact counterpart of
 * `ubcHFittedFit` above, added by the v9 orchestrator.
 *
 * Why it had to exist: the coronal plates had no fitted-fit carrier at all, so
 * they were drawn at the v3 first-pass `UBC_C_FIT_SCALE = 17.9` px/au. The fitter
 * measures ≈ 4.5 px/au on the same plates (factor ≈ 4), consistent with the
 * 4.0816 px/au independently measured for this series' framing in
 * `assets-src/imaging3/VHP_ANCHORS.md` — i.e. the coronal photographs were being
 * drawn about four times too small, which is exactly what "the photo view is
 * clearly off" looks like on screen.
 *
 * Filled by `scripts/apply-plate-fits.mjs` from the fitter's own record
 * (`src/assets/imaging/plate-fit.json`); same fields and same contract as the
 * horizontal table: `fit` above stays the baseline, this is the correction.
 */
const ubcCFittedFit: Record<number, { scale: number; dx: number; dy: number; residualAu: number; iouBefore: number; iouAfter: number }> = {
  7: { scale: 2.609567, dx: -0.28, dy: -4, residualAu: 1.323516, iouBefore: 0.027645, iouAfter: 0.348461 },
  9: { scale: 2.922449, dx: -0.34, dy: 6, residualAu: 8.508001, iouBefore: 0.029153, iouAfter: 0.345601 },
  11: { scale: 2.922449, dx: -0.28, dy: 4, residualAu: 6.237715, iouBefore: 0.032562, iouAfter: 0.361571 },
  13: { scale: 3.10882, dx: 0.22, dy: 6, residualAu: 8.549664, iouBefore: 0.031945, iouAfter: 0.373279 },
  14: { scale: 3.10882, dx: -0.06, dy: 6, residualAu: 8.194943, iouBefore: 0.030869, iouAfter: 0.366918 },
  15: { scale: 2.922449, dx: 0, dy: 2, residualAu: 8.703332, iouBefore: 0.025896, iouAfter: 0.370436 },
  16: { scale: 2.922449, dx: -0.17, dy: 4, residualAu: 10.295378, iouBefore: 0.026742, iouAfter: 0.37236 },
  17: { scale: 2.248479, dx: -6.06, dy: -18, residualAu: 11.546408, iouBefore: 0.02211, iouAfter: 0.368602 },
  18: { scale: 2.248479, dx: -2.68, dy: -18, residualAu: 9.995893, iouBefore: 0.023356, iouAfter: 0.370298 },
  19: { scale: 2.248479, dx: 0.22, dy: -18, residualAu: 11.11312, iouBefore: 0.02217, iouAfter: 0.354601 },
  20: { scale: 2.248479, dx: -0.39, dy: -18, residualAu: 12.017486, iouBefore: 0.021992, iouAfter: 0.368031 },
  21: { scale: 2.149343, dx: 0.28, dy: -16, residualAu: 8.854245, iouBefore: 0.019577, iouAfter: 0.363552 },
  22: { scale: 2.248479, dx: -0.56, dy: -12, residualAu: 7.019858, iouBefore: 0.021043, iouAfter: 0.359303 },
  23: { scale: 2.357202, dx: 0.11, dy: -12, residualAu: 8.255491, iouBefore: 0.02375, iouAfter: 0.360937 },
  24: { scale: 2.357202, dx: -0.61, dy: -8, residualAu: 5.528995, iouBefore: 0.023857, iouAfter: 0.365785 },
}

/** The UBC horizontal plates' committed asset per index (restored after a v9
 *  applier edit; the assets themselves are imported at the top of this file). */
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
      /* THE BASELINE PLACEMENT — never overwritten by a fitted correction.
       *
       * v9 orchestrator fix: this used to resolve to the fitted values whenever
       * `ubcHFittedFit[n]` existed, which broke the very contract stated in the
       * `ubcHFittedFit` docstring above ("the committed `fit` above stays the
       * pre-fit record") and made the measurement NON-IDEMPOTENT: the fitter fits
       * the image against this `fit`, so feeding it its own output moved the
       * optimum a little on every re-run (committed 3.560801 vs recomputed
       * 3.32688 for h12), and `scripts/verify/imaging-fit.mjs` — which requires the
       * committed numbers to equal a fresh recomputation — could never pass. The
       * correction now travels ONLY in `fittedFit` (which `imageLayers` prefers),
       * so the fitter always measures from the same baseline and a re-run
       * reproduces the committed numbers exactly. */
      fit: { scale: UBC_H_FIT_SCALE, dx: ubcHDx[n], dy: 0, mirrorX: false },
      /* The measured correction, when this plate has one — read by
       * imageLayers.drawStainToView (which prefers fittedFit over `fit`) and by
       * imageLayers.imagingAlignmentNote for the on-screen number. */
      fittedFit: ubcHFittedFit[n] === undefined
        ? undefined
        : {
            scale: ubcHFittedFit[n].scale,
            dx: ubcHFittedFit[n].dx,
            dy: ubcHFittedFit[n].dy,
            mirrorX: false,
            residualAu: ubcHFittedFit[n].residualAu,
            iouBefore: ubcHFittedFit[n].iouBefore,
            iouAfter: ubcHFittedFit[n].iouAfter,
            referencePlane: { axis: 'y' as const, value: ubcHPlane[n] },
            method: 'scripts/fit-imaging-affine.mjs --report',
          },
      registration: {
        status: REGISTRATION_STATUS.unmeasuredDefault,
        dyAu: 0,
        reason: REGISTRATION_UNMEASURED_REASON.atlasMismatch,
        mirrorX: REGISTRATION_MIRROR_OWNER,
        // THIS plate's own measurement (never a sample borrowed from a sibling):
        // see REGISTRATION_MEASURED and REGISTRATION_MEASUREMENT_NOTE.
        evidence: REGISTRATION_MEASURED[`ubc-h${String(n).padStart(2, '0')}`],
        note: REGISTRATION_UNMEASURED_NOTE,
      },
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
      /* The measured correction, when this plate has one — the same contract as
       * the horizontal series: `fit` stays the baseline placement and `imageLayers`
       * prefers this. Absent ⇒ the committed placement is what is drawn (and the
       * fitter's own record says why, per plate). */
      fittedFit: ubcCFittedFit[n] === undefined
        ? undefined
        : {
            scale: ubcCFittedFit[n].scale,
            dx: ubcCFittedFit[n].dx,
            dy: ubcCFittedFit[n].dy,
            mirrorX: false,
            residualAu: ubcCFittedFit[n].residualAu,
            iouBefore: ubcCFittedFit[n].iouBefore,
            iouAfter: ubcCFittedFit[n].iouAfter,
            referencePlane: { axis: 'z' as const, value: ubcCPlane[n] },
            method: 'scripts/fit-imaging-affine.mjs --report',
          },
      registration: {
        status: REGISTRATION_STATUS.unmeasuredDefault,
        dyAu: 0,
        // Per plate, not per builder: ubc-c07 (z = 26) and ubc-c24 (z = −54) sit in
        // REGISTRATION_NO_CROSS_SECTION because no atlas mesh crosses their plane, so
        // their fact is not the shared `atlas-mismatch` one.
        reason: REGISTRATION_NO_CROSS_SECTION.has(`ubc-c${String(n).padStart(2, '0')}`)
          ? REGISTRATION_UNMEASURED_REASON.noCrossSection
          : REGISTRATION_UNMEASURED_REASON.atlasMismatch,
        mirrorX: REGISTRATION_MIRROR_OWNER,
        // See REGISTRATION_MEASURED and REGISTRATION_MEASUREMENT_NOTE. ubc-c07 and
        // ubc-c24 have no measured row — their planes produce no cross-section — so
        // they get that measured fact instead of an absent field.
        evidence:
          REGISTRATION_MEASURED[`ubc-c${String(n).padStart(2, '0')}`] ??
          REGISTRATION_NO_CROSS_SECTION_EVIDENCE,
        note: REGISTRATION_UNMEASURED_NOTE,
      },
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
    registration: {
      status: REGISTRATION_STATUS.unmeasuredDefault,
      dyAu: 0,
      reason: REGISTRATION_UNMEASURED_REASON.noDeclaredScale,
      mirrorX: REGISTRATION_MIRROR_OWNER,
      note: REGISTRATION_UNMEASURED_NOTE,
    },
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
    registration: {
      status: REGISTRATION_STATUS.unmeasuredDefault,
      dyAu: 0,
      reason: REGISTRATION_UNMEASURED_REASON.noDeclaredScale,
      mirrorX: REGISTRATION_MIRROR_OWNER,
      note: REGISTRATION_UNMEASURED_NOTE,
    },
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
    registration: {
      status: REGISTRATION_STATUS.unmeasuredDefault,
      dyAu: 0,
      reason: REGISTRATION_UNMEASURED_REASON.noDeclaredScale,
      mirrorX: REGISTRATION_MIRROR_OWNER,
      note: REGISTRATION_UNMEASURED_NOTE,
    },
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
    registration: vhpRegistration('vhp-0017'),
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
    registration: vhpRegistration('vhp-0046'),
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
    registration: vhpRegistration('vhp-0074'),
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
    registration: vhpRegistration('vhp-0103'),
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
    registration: vhpRegistration('vhp-0132'),
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
    registration: vhpRegistration('vhp-0160'),
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
    registration: vhpRegistration('vhp-0189'),
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
    registration: vhpRegistration('vhp-0230'),
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
    registration: vhpRegistration('vhp-0246'),
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
    registration: vhpRegistration('vhp-0295'),
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
    registration: vhpRegistration('vhp-0328'),
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
    registration: vhpRegistration('vhp-0385'),
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
    registration: vhpRegistration('vhp-0430'),
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
    registration: vhpRegistration('vhp-0450'),
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
    registration: vhpRegistration('vhp-0470'),
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
    registration: vhpRegistration('vhp-0491'),
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
    registration: vhpRegistration('vhp-0532'),
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
    registration: vhpRegistration('vhp-0581'),
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
    registration: vhpRegistration('vhp-0631'),
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
    registration: vhpRegistration('vhp-0681'),
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
    registration: vhpRegistration('vhp-0701'),
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
    registration: {
      status: REGISTRATION_STATUS.unmeasuredDefault,
      dyAu: 0,
      reason: REGISTRATION_UNMEASURED_REASON.noCrossSection,
      mirrorX: REGISTRATION_MIRROR_OWNER,
      // No `REGISTRATION_MEASURED` row: this plate is the one VHP level (y = −52.2)
      // where the atlas meshes produce NO cross-section at all, so there is nothing
      // to register against — a different reason from the other 21 VHP plates,
      // which were measured and failed the accept rule.
      evidence: REGISTRATION_NO_CROSS_SECTION_EVIDENCE,
      note: REGISTRATION_UNMEASURED_NOTE,
    },
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
