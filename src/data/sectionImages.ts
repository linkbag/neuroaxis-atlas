/** MRI/CT candidate build. Archived photograph catalogs remain in Git history
 * and the full-imagery branch; no photograph asset is imported by this module.
 * Types remain for compatibility with the generic section renderer.
 */
export type ImageSource = 'ubc' | 'commons-ct' | 'vhp-nlm'
export type SectionAxis = 'transverse' | 'coronal' | 'sagittal'
export type SectionPlaneAxisLetter = 'x' | 'y' | 'z'
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
export interface SectionImageRegistration {
  status: string
  dyAu: number
  reason?: string
  method?: string
  residualAu?: number
  mirrorX?: string
  note?: string
  evidence?: Record<string, number | undefined>
}
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
  /** Level evidence: site's own title / viewer overlay labels. */
  note: string
}
export const sectionImages: SectionImage[] = []
export function sectionImagesForLevel(levelId: string): SectionImage[] {
  return sectionImages.filter(image => image.levelId === levelId)
}
export function sectionImagesForAxis(axis: SectionAxis): SectionImage[] {
  return sectionImages.filter(image => image.axis === axis)
}
export function sectionImagesNearPlane(axis: SectionAxis, planeValue: number, tolerance = 1.5): SectionImage[] {
  return sectionImages.filter(image => image.axis === axis && image.planeValue !== undefined && Math.abs(image.planeValue - planeValue) <= tolerance)
}
