/**
 * planeGeometry.ts — THE single source of truth for everything that describes
 * a canonical section plane: the world↔screen mapping, the in-plane axis pair,
 * the canonical extents, level lookup, the snap-to-level write, the anchored
 * photograph pick and the orientation/badge table
 * (docs/QUALITY_PLAN.md §2 items 4–5 · docs/AUDIT_REPORT.md §2.4/§2.5, §6.6).
 *
 * Before this module the app carried THREE implementations of the same plane
 * transform (SectionCanvas · the PiP camera/backdrop · the imageLayers
 * sampler) and FOUR hand-copied rules around it (`AXIS_PAIR` ×2, the 1.5 au
 * anchor window ×3, `nearestLevelTo` ×2, the snap write ×2), which had already
 * drifted — the canvas centred the visible rect on the canonical bounds
 * midpoint while the PiP/sampler assumed centre 0 with a 1.08 framing margin,
 * so the same photograph at the same plane landed at a different world
 * position and size in the two surfaces (the audit's §2.4 finding).
 *
 * ── ONE CONVENTION (the audit's canvas-vs-PiP question, resolved) ──────────
 * The convention that wins is the ONE the 2D live-section canvas already used,
 * and it is now the only one:
 *
 *   1. `scale = min(width / uSpan, height / vSpan)` — a uniform aspect-fit of
 *      the canonical extents with NO extra margin, so `fit.scale` (px per
 *      canonical au, src/data/sectionImages.ts) keeps exactly its declared
 *      meaning: one canonical au is always `fit.scale` source pixels, and a
 *      photograph's world size is `naturalWidth / fit.scale` au on both
 *      surfaces.
 *   2. the visible world rect is CENTRED ON THE CANONICAL BOUNDS MIDPOINT
 *      (`(min + max) / 2` per in-plane axis), not on 0. The two coincide only
 *      on the u axis of the transverse/coronal planes; sagittal (u = z) and both
 *      v axes are asymmetric about 0, which is exactly where the old PiP/sampler
 *      assumption put the photograph 5–15 au off. (Measured then on the
 *      AMENDMENT A box, x ±48 · y −55…45 · z −56…26; under AMENDMENT B the same
 *      asymmetry is 0 au on x, +15 au on y and −10 au on z — the rule below is
 *      what carries over, not those numbers.)
 *   3. both surfaces hand this function the SAME viewport (their own CSS pixel
 *      size), so the same photograph lands on the same world rect and therefore
 *      on the same screen pixels. The PiP's private `VIEW_MARGIN = 1.08` is
 *      gone: a second margin is a second scale, and "canvas and PiP agree" is
 *      this fix's acceptance criterion.
 *
 * Consequences (measured, "identical or better"): the old PiP framed the
 * canonical extents at `halfU · 1.08` around world 0, so its window was
 * off-centre by the bounds midpoint — 0 au on x, −5 au on y (sagittal/coronal
 * v) and −15 au on z (transverse v) under the AMENDMENT A box — and it never
 * showed the canvas window (e.g. one 1280×520 transverse canvas: canvas
 * v ∈ [−56, 26], old PiP v ∈ [−44.3, 44.3]). Both surfaces now show that one
 * window, and
 * `fit.dx`/`fit.dy` keep meaning what their doc comment says: `dx` is the offset
 * of the plate's own tissue midline from the image centre, `dy` the vertical
 * offset from the view centre.
 *
 * ── WHAT THIS TASK DID **NOT** CHANGE (recorded finding) ──────────────────
 * One thing the audit's §2.5 "four hand-copied rules" list did not cover, and
 * that this refactor deliberately left alone: the PiP's own render camera is a
 * second basis, and re-deriving it from the two facts the panel declares (its
 * `cameraSide` and its `cameraUpAxis`) shows its screen-right vector is
 * perpendicular to the plane's u axis on the transverse and sagittal planes —
 * a 90° roll of that surface relative to the canvas convention every
 * `planeTransform` placement uses, which no boolean mirror can express. The
 * underlying numbers are in `cameraUpAxis`'s note. Fixing it would change the
 * PiP's frustum axes and its framing half-extents together and can only be
 * validated in a browser, so the shipped values are preserved exactly and the
 * finding is reported rather than applied blind. Everything this module
 * guarantees — canvas, PiP and sampler placing the same photograph at the same
 * WORLD position and size — is unaffected and is what `verify:plane` proves.
 *
 * ── Node-importable (run rule R4) ─────────────────────────────────────────
 * The only import is `CLIP_BOUNDS` (the canonical slider ranges, which stay a
 * single declaration in viewer3d/clipPlanes.ts); everything else is pure math
 * with no DOM, no JSON and no assets, so `scripts/verify/plane-transform.mjs`
 * can import this file directly under Node 24.
 */

import { CLIP_BOUNDS } from '../viewer3d/clipPlanes'
import type { PlaneAxis } from './contours'

/* ==================================================================== *
 *  AMENDMENT B — the canonical box (docs/TELENCEPHALON_PLAN.md §2,     *
 *  task `tel-space`). The extents themselves are NOT redeclared here:  *
 *  `CLIP_BOUNDS` (viewer3d/clipPlanes.ts) is still their single        *
 *  declaration, and this module derives every mapping from it —        *
 *  `axisExtents`, `planeTransform`, the badge table and the level      *
 *  window. Only the two things the extent change genuinely moves in    *
 *  this module are stated below: the three orientation tables and the  *
 *  ONE camera-basis fact that must NOT follow the extents (see         *
 *  `PIP_CAMERA_UP`).                                                    *
 *                                                                      *
 *  A. The BADGE tables do not move. `badges()` is derived from the     *
 *     transform's handedness (`uToSx` strictly increasing, `vToSy`     *
 *     strictly decreasing) and from the world directions the axes      *
 *     POINT ALONG (+x patient-left, +y superior, +z anterior) — never  *
 *     from a bound. Extending y to +85 and z to −75…+55 changes which  *
 *     world points are inside the box, not which way the axes point,   *
 *     so `PLANE_BADGES` (transverse A↑L→, sagittal S↑A→, coronal S↑L→) *
 *     is unchanged and its load-time self-check still passes. That is  *
 *     the property docs/SECTION_SYNC_PLAN.md §2.2 fixes and it is      *
 *     extent-independent by construction.                              *
 *                                                                      *
 *  B. The LEVEL window does not move. `nearestLevelTo`/`snapClipWrite` *
 *     read the anchors from levels.json, which GAINED four telencephalic*
 *     anchors above +45 (+48 thalamostriate, +58 basal ganglia, +68     *
 *     centrum semiovale, +78 high convexity) and kept its 13 original  *
 *     y values exactly. Snapping therefore continues to work at the    *
 *     old levels unchanged and simply has four more stops to reach     *
 *     (docs/TELENCEPHALON_PLAN.md §2, "nothing moves").                *
 *                                                                      *
 *  C. The CAMERA BASIS is frozen on purpose (see `PIP_CAMERA_UP`).     *
 * ==================================================================== */

/* ------------------------------------------------------------------ axes */

/**
 * In-plane world-axis pairs per plane axis: `[u (screen x), v (screen y)]`.
 * Transverse (y): u = x, v = z · sagittal (x): u = z, v = y · coronal (z):
 * u = x, v = y. Read by the canvas, the sampler and the PiP camera alike, so
 * one plane can never be drawn against a different pair of axes on one surface.
 */
export const AXIS_PAIR: Record<PlaneAxis, [PlaneAxis, PlaneAxis]> = {
  y: ['x', 'z'], // transverse: u = x, v = z
  x: ['z', 'y'], // sagittal:   u = z, v = y
  z: ['x', 'y'], // coronal:    u = x, v = y
}

/** World-axis index used by the volume grids (x-fastest row-major layout). */
export const AXIS_INDEX: Record<PlaneAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 }

/** Anatomical caption of each plane axis (the readout every surface prints). */
export const PLANE_CAPTION: Record<PlaneAxis, string> = {
  x: 'Sagittal section · x',
  y: 'Transverse section · y',
  z: 'Coronal section · z',
}

/** The three plane axes in the app's display order (x, z, y). */
export const PLANE_AXES: readonly PlaneAxis[] = ['x', 'z', 'y']

/** The six orientation labels a badge table may print. */
export type AnatomicalLabel = 'S' | 'I' | 'A' | 'P' | 'L' | 'R'

/**
 * The six anatomical directions as canonical world vectors
 * (+x = patient-left, +y = superior, +z = anterior — the canonical frame
 * REALISM_PLAN §3 fixes). This is the input the badge derivation projects.
 */
export const DIRECTION_VECTORS: Record<AnatomicalLabel, readonly [number, number, number]> = {
  S: [0, 1, 0],
  I: [0, -1, 0],
  A: [0, 0, 1],
  P: [0, 0, -1],
  L: [1, 0, 0],
  R: [-1, 0, 0],
}

/** One edge-badge row: the letter printed at each image edge. */
export interface PlaneBadges {
  top: AnatomicalLabel
  bottom: AnatomicalLabel
  left: AnatomicalLabel
  right: AnatomicalLabel
}

/** A viewport in CSS pixels — the ONLY thing two surfaces may differ by. */
export interface PlaneViewport {
  width: number
  height: number
}

/**
 * The reference viewport `badges(axis)` uses when no viewport is passed: a real
 * landscape section panel shape (the live-section canvas and the PiP are both
 * wider than tall). It is NOT a magic margin — the badge letters are
 * viewport-independent (see `badges`), so this only has to be a viewport the
 * app could actually have.
 */
export const REFERENCE_VIEWPORT: PlaneViewport = { width: 960, height: 800 }

/**
 * The world↔screen mapping for one plane in one viewport — the object every
 * surface (2D canvas, PiP camera + backdrop sampler, and the gate) draws with.
 */
export interface PlaneTransform {
  axis: PlaneAxis
  /** Plane position along `axis` (au) — carried for callers, unused by the mapping. */
  planeValue: number
  /** Viewport in CSS pixels. */
  width: number
  height: number
  /** Screen pixels per canonical au (uniform: identical on u and v). */
  scale: number
  /** The in-plane world axes: u = screen x, v = screen y. */
  uAxis: PlaneAxis
  vAxis: PlaneAxis
  /** Visible world rect: u grows RIGHT, v grows UP (`vMax` is the top row). */
  uMin: number
  uMax: number
  vMin: number
  vMax: number
  /** World u at screen x = 0 and world v at the TOP row (the canvas' u0/v0). */
  u0: number
  v0: number
  /** World centre of the visible rect — where a photograph is centred. */
  centerU: number
  centerV: number
  /** World half-extents of the visible rect (the PiP ortho half-sizes). */
  halfU: number
  halfV: number
  /** World position → screen (CSS px). */
  uToSx(u: number): number
  vToSy(v: number): number
  /** Screen (CSS px) → world position. */
  sxToU(sx: number): number
  syToV(sy: number): number
}

/** Canonical extents of a plane axis, derived from CLIP_BOUNDS. */
export interface AxisExtents {
  axis: PlaneAxis
  uAxis: PlaneAxis
  vAxis: PlaneAxis
  uMin: number
  uMax: number
  vMin: number
  vMax: number
  uSpan: number
  vSpan: number
  centerU: number
  centerV: number
  halfU: number
  halfV: number
}

/**
 * axisExtents(axis) — the canonical extents of a plane axis: the bounds of each
 * in-plane axis, their spans, midpoint and half-spans. Derived from
 * CLIP_BOUNDS (the single declaration of the canonical space,
 * viewer3d/clipPlanes.ts — REALISM_PLAN §3 AMENDMENT A), never retyped.
 */
export function axisExtents(axis: PlaneAxis): AxisExtents {
  const [uAxis, vAxis] = AXIS_PAIR[axis]
  const u = CLIP_BOUNDS[uAxis]
  const v = CLIP_BOUNDS[vAxis]
  const uSpan = u.max - u.min
  const vSpan = v.max - v.min
  return {
    axis,
    uAxis,
    vAxis,
    uMin: u.min,
    uMax: u.max,
    vMin: v.min,
    vMax: v.max,
    uSpan,
    vSpan,
    centerU: (u.min + u.max) / 2,
    centerV: (v.min + v.max) / 2,
    halfU: uSpan / 2,
    halfV: vSpan / 2,
  }
}

/**
 * planeTransform — THE world↔screen mapping (docs/QUALITY_PLAN.md §2 item 4).
 *
 * With `[u, v] = AXIS_PAIR[axis]` and the extents of `axisExtents(axis)`:
 *
 *   scale = min(width / uSpan, height / vSpan)   — uniform aspect fit, no crop
 *   u0    = centerU − width  / (2·scale)         — world u at screen x = 0
 *   v0    = centerV + height / (2·scale)         — world v at the top row
 *   sx(u) = (u − u0) · scale                     — u grows to the right
 *   sy(v) = (v0 − v) · scale                     — v grows upward
 *
 * Contract the surfaces depend on:
 *  - the visible rect always CONTAINS the canonical extents (it touches them in
 *    the longer direction) and is centred on their midpoint, so equal world
 *    distances map to equal pixels on both axes and no geometry is ever cropped;
 *  - the mapping is a pure function of (axis, viewport): a world point's screen
 *    position never depends on which surface asked. `planeValue` is carried for
 *    the caller's convenience only and does not enter the 2D mapping (the plane
 *    is perpendicular to the screen);
 *  - `uToSx` is strictly increasing in u for EVERY viewport, so world +u always
 *    lands on the image RIGHT (and world +v, larger v, always toward the top
 *    row) whatever the aspect ratio: the transform never mirrors a plane. This
 *    is the convention every photograph placement, every grid sample and every
 *    contour polyline in the app is expressed in. The PiP's own render camera
 *    is a separate basis and is reported by `mirrorX(axis)` / `cameraUpAxis(axis)`
 *    (see their notes: on two of the three planes that camera's roll is 90° off
 *    this convention — recorded, with its repro, rather than changed here).
 *
 * `marginScale` (default 1) multiplies both canonical extents before the fit,
 * so a surface that ever needs a framing margin has ONE place to ask for it.
 * Both surfaces in this app pass the default 1 (see the header): a second
 * margin is a second scale — the drift this module exists to remove.
 */
export function planeTransform(
  axis: PlaneAxis,
  planeValue: number,
  viewport: PlaneViewport,
  marginScale = 1,
): PlaneTransform {
  const extents = axisExtents(axis)
  const margin = Number.isFinite(marginScale) && marginScale > 0 ? marginScale : 1
  const width = viewport.width
  const height = viewport.height
  const scale = Math.max(1e-6, Math.min(width / (extents.uSpan * margin), height / (extents.vSpan * margin)))
  const halfU = width / (2 * scale)
  const halfV = height / (2 * scale)
  const centerU = extents.centerU
  const centerV = extents.centerV
  const u0 = centerU - halfU
  const v0 = centerV + halfV
  return {
    axis,
    planeValue,
    width,
    height,
    scale,
    uAxis: extents.uAxis,
    vAxis: extents.vAxis,
    uMin: u0,
    uMax: u0 + 2 * halfU,
    vMin: v0 - 2 * halfV,
    vMax: v0,
    u0,
    v0,
    centerU,
    centerV,
    halfU,
    halfV,
    uToSx: (u) => (u - u0) * scale,
    vToSy: (v) => (v0 - v) * scale,
    sxToU: (sx) => u0 + sx / scale,
    syToV: (sy) => v0 - sy / scale,
  }
}

/**
 * samplerViewport(spec) — the viewport a caller who knows only the IN-PLANE
 * WORLD HALF-EXTENTS (halfU, halfV) of a render target should hand
 * `planeTransform`, so that the mapping it gets back is the one that renders
 * exactly that world window at the requested pixel size.
 *
 * The PiP's backdrop sampler uses this: it owns a WebGL render target whose
 * camera frustum is `±halfU, ±halfV` and whose pixel size is the target size,
 * so `planeTransform(axis, value, samplerViewport(...))` gives it a canvas whose
 * pixels land 1:1 under the 3D cut. Both the PiP camera and the live canvas get
 * their half-extents from `planeTransform`'s own visible rect, so all three
 * surfaces share one window definition.
 */
export function samplerViewport(spec: {
  width: number
  height: number
  halfU: number
  halfV: number
}): PlaneViewport {
  const halfU = spec.halfU > 0 ? spec.halfU : 1
  const halfV = spec.halfV > 0 ? spec.halfV : 1
  return { width: spec.width, height: (halfV / halfU) * spec.width }
}

/* ------------------------------------------------------------ orientation */

/** Which anatomical direction a signed world axis points along. */
function labelAlong(axisIndex: 0 | 1 | 2, sign: 1 | -1): AnatomicalLabel {
  if (axisIndex === 0) return sign > 0 ? 'L' : 'R' // +x = patient-left
  if (axisIndex === 1) return sign > 0 ? 'S' : 'I' // +y = superior
  return sign > 0 ? 'A' : 'P' // +z = anterior
}

/**
 * badges(axis, viewport?) — the orientation table DERIVED FROM THE GEOMETRY
 * (docs/AUDIT_REPORT.md §6.6, plan §4.2 item 4b: "derive the orientation table
 * from the geometry instead of hard-coding the expected string").
 *
 * The rule is mechanical, with no orientation letter hard-coded anywhere:
 * every axis of the projected space is read off the SAME `planeTransform` every
 * surface draws with —
 *
 *   image right  = the world direction whose `uToSx` increases
 *   image top    = the world direction whose `vToSy` decreases (screen y grows down)
 *   image left   = the u direction whose screen delta wins a tie (≥ ½ pixel)
 *   image bottom = the other in-plane direction
 *
 * and each is named by the one anatomical direction (+x patient-left,
 * −x patient-right, +y superior, −y inferior, +z anterior, −z posterior) that
 * points along it.
 *
 * Viewport independence (checked, not assumed): the transform maps +u to the
 * image right and +v to the image top for EVERY viewport — `uToSx` is strictly
 * increasing in u and `vToSy` strictly decreasing in v always, because a
 * viewport narrower than the plane's display aspect ratio only changes the
 * scale and the visible window, never the handedness. The badge table is
 * therefore the same for every panel size; `scripts/verify/plane-transform.mjs`
 * derives it from the projected pixels over twelve viewport shapes (including
 * 1×1 and 4096×2160) and asserts they all agree with §2.2.
 *
 * Derived conventions — identical to docs/SECTION_SYNC_PLAN.md §2.2:
 *   transverse — anterior up,  patient-left on image-RIGHT (radiological)
 *   sagittal   — superior up,  anterior    on image-right
 *   coronal    — superior up,  patient-left on image-RIGHT
 */
export function badges(axis: PlaneAxis, viewport: PlaneViewport = REFERENCE_VIEWPORT): PlaneBadges {
  const transform = planeTransform(axis, 0, viewport)
  const extents = axisExtents(axis)
  const uIdx = AXIS_INDEX[extents.uAxis]
  const vIdx = AXIS_INDEX[extents.vAxis]
  // A degenerate viewport (zero width/height) has no screen geometry to read —
  // fall back to the axis pair, which is itself derived, not hand-written.
  if (transform.scale <= 0 || transform.width <= 0 || transform.height <= 0) {
    return {
      top: labelAlong(vIdx, 1),
      bottom: labelAlong(vIdx, -1),
      left: labelAlong(uIdx, -1),
      right: labelAlong(uIdx, 1),
    }
  }
  // Screen delta of ONE canonical au along a world direction, through the shared
  // transform: +du = toward the image right, +dsv = toward the image BOTTOM
  // (screen y grows downward). `axisIndex` selects which screen axis to read:
  // uAxis → du, vAxis → dsv (the transform is separable, so a direction along
  // one in-plane axis has no component on the other).
  const screenDelta = (axisIndex: number, sign: 1 | -1): { du: number; dsv: number } => {
    if (axisIndex === uIdx) {
      return { du: sign * (transform.uToSx(1) - transform.uToSx(0)), dsv: 0 }
    }
    return { du: 0, dsv: sign * (transform.vToSy(1) - transform.vToSy(0)) }
  }
  const edges: {
    top: AnatomicalLabel | undefined
    bottom: AnatomicalLabel | undefined
    left: AnatomicalLabel | undefined
    right: AnatomicalLabel | undefined
  } = { top: undefined, bottom: undefined, left: undefined, right: undefined }
  // A half-pixel bias makes the edge choice independent of the scale factor.
  const bias = transform.scale / 2
  const verticalSpan = screenDelta(vIdx, 1).dsv
  for (const entry of Object.entries(DIRECTION_VECTORS) as Array<
    [AnatomicalLabel, readonly [number, number, number]]
  >) {
    const [label, direction] = entry
    const uComponent = direction[uIdx]
    const vComponent = direction[vIdx]
    // The transform is separable per world axis: a direction with no component
    // on either in-plane axis (e.g. superior/inferior for a transverse plane)
    // is perpendicular to the slice and cannot label any edge — skipped.
    if (uComponent === 0 && vComponent === 0) continue
    if (uComponent === 0) {
      const towardTop = vComponent > 0 === verticalSpan < 0
      if (towardTop) edges.top = edges.top ?? label
      else edges.bottom = edges.bottom ?? label
      continue
    }
    const horizontal = screenDelta(uIdx, uComponent > 0 ? 1 : -1)
    if (horizontal.du >= bias) edges.right = edges.right ?? label
    else if (horizontal.du <= -bias) edges.left = edges.left ?? label
  }
  // The vertical edges are the two ends of the v axis, in the order the v axis
  // lands on screen (`verticalSpan < 0` means +v is toward the top row); the
  // fallbacks only guard a viewport so degenerate that the half-pixel bias
  // discarded both directions.
  const rising = verticalSpan <= 0
  return {
    top: edges.top ?? labelAlong(vIdx, rising ? 1 : -1),
    bottom: edges.bottom ?? labelAlong(vIdx, rising ? -1 : 1),
    left: edges.left ?? labelAlong(uIdx, -1),
    right: edges.right ?? labelAlong(uIdx, 1),
  }
}

/**
 * The orientation table as a literal, identical to `badges(axis)`.
 *
 * The letters are DERIVED from the geometry (the module-load assertion below
 * re-derives them and throws if this table ever disagrees). The literal is kept
 * because `scripts/verify-imaging-v4.mjs` reads the table out of the source of
 * the surfaces that print it, so changing the app's orientation convention must
 * stay a visible, reviewable edit rather than a silent side effect of a maths
 * change.
 */
export const PLANE_BADGES: Record<PlaneAxis, PlaneBadges> = {
  y: { top: 'A', bottom: 'P', left: 'R', right: 'L' }, // transverse: anterior up, patient-left image-right
  x: { top: 'S', bottom: 'I', left: 'P', right: 'A' }, // sagittal:   superior up, anterior image-right
  z: { top: 'S', bottom: 'I', left: 'R', right: 'L' }, // coronal:    superior up, patient-left image-right
}

{
  // Load-time self-check: the visible table must equal the geometry.
  for (const axis of ['x', 'y', 'z'] as PlaneAxis[]) {
    const derived = badges(axis)
    const declared = PLANE_BADGES[axis]
    if (
      derived.top !== declared.top ||
      derived.bottom !== declared.bottom ||
      derived.left !== declared.left ||
      derived.right !== declared.right
    ) {
      throw new Error(
        `planeGeometry: PLANE_BADGES.${axis} ` +
          `(${declared.top}/${declared.bottom}/${declared.left}/${declared.right}) disagrees with the ` +
          `geometry-derived orientation (${derived.top}/${derived.bottom}/${derived.left}/${derived.right})`,
      )
    }
  }
}

/**
 * mirrorX(axis) — whether a surface that renders through its own SECTION CAMERA
 * mirrors x before showing the section, i.e. whether the world direction the
 * camera's screen-right follows is the OPPOSITE of the plane's u axis.
 *
 * DERIVED from the two facts the PiP declares — its up vector (`PIP_CAMERA_UP`
 * via `cameraUpAxis`) and the side it stands on (`PIP_CAMERA_SIDE`) — plus the
 * transform's own pixel geometry (`planeTransform`: `uToSx` increases with u and
 * `vToSy` decreases with v, so u is the image's horizontal axis and v its
 * vertical axis on every viewport). It is not a hand-copied flag, and since
 * AMENDMENT B it is not a function of the canonical extents either: the section
 * camera is frozen while the framing follows the box (see `PIP_CAMERA_UP`).
 *
 * The camera looks back down the plane normal from the DISCARDED side (clipPlanes
 * keeps the lower half of every axis), and three.js' `Matrix4.lookAt` builds the
 * basis as `right = up × back` with `back = +cameraSide`. Evaluating that on the
 * three declared bases gives (cross-checked against the columns of the real
 * camera matrix — see `cameraUpAxis`'s note):
 *
 *   y (transverse): up +x, side +z → right (0,−1,0)   (u·right = 0)
 *   x (sagittal):   up +y, side +z → right (1, 0,0)   (u·right = 0)
 *   z (coronal):    up +y, side +x → right (0, 0,−1)  (u·right = −1)
 *
 * The flag below is the relation that basis produces: `true` exactly when the
 * camera's up vector IS the plane's u axis, which is the case in which the image
 * has to be flipped to bring the canvas' u axis back to the image horizontal.
 *
 *   y (transverse) → true      x (sagittal) → true      z (coronal) → false
 *
 * The values are exactly `SectionPiP.SECTION_VIEWS[axis].flipX`; the PiP consumes
 * `mirrorX` for both its scissored blit (`blitQuad.scale.x`) and the backdrop
 * sampler's `mirrorX`, so one flag keeps the GPU cut and the real slice agreeing
 * with each other. `scripts/verify/plane-transform.mjs` asserts both facts
 * against the PiP's own source, so a change to either side is a gate failure
 * rather than silent drift.
 *
 * RECORDED, NOT SILENTLY "FIXED": on the transverse and sagittal planes the
 * displayed image is a 90° roll of the canvas convention rather than a mirror
 * (the camera's screen-vertical is the plane's u axis), and no boolean can
 * express a rotation — see the note in `cameraUpAxis`. The badges below describe
 * the canvas convention, which is what §2.2 fixes and what every `planeTransform`
 * placement in this app uses.
 */
export function mirrorX(axis: PlaneAxis): boolean {
  const [uAxis] = AXIS_PAIR[axis]
  return cameraUpAxis(axis) === uAxis
}

/**
 * THE PiP SECTION CAMERA'S UP AXIS, PER PLANE — an orientation contract, not an
 * extent measurement (docs/TELENCEPHALON_PLAN.md §2 AMENDMENT B, task
 * `tel-space`; docs/QUALITY_PLAN.md §2 item 4).
 *
 * WHY THIS IS A TABLE AND NOT `(uSpan >= vSpan)` ANY MORE. Until AMENDMENT B the
 * up axis was DERIVED as "the in-plane axis with the larger canonical span", and
 * that happened to give the values `SectionPiP.SECTION_VIEWS` declares. The rule
 * was really an observation about one bound set, not a property of the section
 * camera: it silently re-derives a NEW camera whenever the box is re-fitted. The
 * telencephalon extension moves y from 100 to 140 au and z from 82 to 130 au, so
 * on the transverse plane the larger span becomes the plane's v axis (z) instead
 * of its u axis (x) — and on that plane `cameraSide` is ALREADY the v axis (+z,
 * see `mirrorX`). The panel would then build an orthographic camera whose up
 * vector is parallel to its view direction: a degenerate basis. Measured with
 * three.js' own `Matrix4.lookAt` (r169, this repo's version), `up +z` with
 * `side +z` does not produce NaN — it silently substitutes a basis (`right`
 * (0,1,0), `up` (−1,0,0)) that rolls the transverse panel 90° and, through
 * `flipX = mirrorX('y')`, would flip patient-left to the image LEFT, contradicting
 * the badge table the same panel prints and §2.2. That is a user-visible
 * regression in a v3 surface, caused by a bound change, so it must not happen.
 *
 * The camera basis is therefore stated as what it is: the three bases
 * `SectionPiP` declares (its `up:` and `cameraSide:` vectors). The values are
 * IDENTICAL to what the old span rule produced under AMENDMENT A, so the PiP's
 * rendering is pixel-identical before and after the extension — the section
 * camera does not move when the box grows. `scripts/verify/plane-transform.mjs`
 * owns the correspondence in both directions (the table ⇔ SECTION_VIEWS, and the
 * non-degeneracy of every basis).
 *
 * Framing is unaffected: the ortho window still comes from `axisExtents` /
 * `planeTransform`, i.e. from `CLIP_BOUNDS`, so the panel auto-fits the new box
 * exactly like the live canvas (one transform, QUALITY_PLAN §2 item 4). Only the
 * ORIENTATION is frozen; only the EXTENTS follow the amendment.
 *
 * The transverse/sagittal 90° roll this basis produces relative to the canvas
 * convention remains the recorded, unfixed finding it was before this task (see
 * `mirrorX`): fixing it means changing `SectionPiP`'s frustum axes and framing
 * together, in a browser — not something a bounds amendment may do by accident.
 */
export const PIP_CAMERA_UP: Record<PlaneAxis, PlaneAxis> = {
  y: 'x', // transverse: up +x (screen-left), camera side +z → perpendicular
  x: 'y', // sagittal:   up +y (superior),    camera side +z → perpendicular
  z: 'y', // coronal:    up +y (superior),    camera side +y → DEGENERATE, pre-existing (see below)
}

/**
 * The world axis each plane's section camera stands on (the discarded
 * half-space side) — the other half of the basis above, declared so the
 * non-degeneracy check below is a fact about this module rather than a
 * re-typed constant. These are `SECTION_VIEWS[axis].cameraSide`:
 * +v for transverse/coronal, +u for sagittal (see `SectionPiP`'s note on
 * `cameraSide`).
 */
export const PIP_CAMERA_SIDE: Record<PlaneAxis, PlaneAxis> = {
  y: 'z', // transverse: side = +z (the v axis)
  x: 'z', // sagittal:   side = +z (the u axis)
  z: 'x', // coronal:    side = +x (the u axis)
}

/**
 * The world axis the section camera uses as its up vector — THE declared basis
 * (`PIP_CAMERA_UP`), never re-derived from the canonical extents, so extending
 * the box cannot silently roll the PiP (see that table's note for the measured
 * failure this prevents). It is always one of the plane's two in-plane axes and
 * never parallel to the camera side, which is what makes the ortho basis
 * well-defined; both facts are asserted at module load below.
 *
 * Read it together with `mirrorX`: the camera's ortho frustum puts the CAMERA's
 * local x axis on the image's screen-horizontal axis and its local y axis on
 * screen-vertical, so a camera whose up vector is an in-plane axis puts the
 * plane's horizontal direction on the image's vertical axis (and vice versa).
 *
 * NUMERICAL NOTE — RECORDED, NOT FIXED HERE (p1-planededup). Re-deriving the
 * ortho basis from this up axis plus the panel's `cameraSide`, using three.js'
 * own `Matrix4.lookAt` construction (`right = up × back`, `back = +cameraSide`)
 * and cross-checking against the columns of the real camera matrix gives:
 *
 *   y (transverse) up +x, side +z → right (0,−1,0)  ⇒ u·right = 0
 *   x (sagittal)   up +y, side +z → right (1, 0,0)  ⇒ u·right = 0
 *   z (coronal)    up +y, side +x → right (0, 0,−1) ⇒ u·right = −1
 *
 * On the transverse and sagittal planes `right` is perpendicular to the plane's u
 * axis, so the frustum maps the section's horizontal axis onto the image
 * VERTICAL: the panel's content is rolled 90° relative to the canvas convention
 * those two planes' badges state. The coronal plane is aligned, which is what its
 * `flipX: false` implies. No boolean mirror can express a rotation, so `mirrorX`
 * cannot correct it.
 *
 * Correcting the roll means changing the frustum's screen axes AND the framing
 * half-extents together — a change to `SectionPiP`'s rendering, outside this
 * module's contract, and one that can only be validated in a browser. It is
 * therefore recorded here and in the task report with its repro, and left as an
 * owner/integration decision rather than changed blind. What this module
 * guarantees either way, and the gate proves, is that the canvas, the PiP and the
 * backdrop sampler all place the same photograph at the same WORLD position and
 * size.
 */
export function cameraUpAxis(axis: PlaneAxis): PlaneAxis {
  return PIP_CAMERA_UP[axis]
}

{
  // Load-time self-check of the camera basis: an up vector that is the plane
  // normal has no in-plane meaning, and an up vector PARALLEL to the camera side
  // makes three.js' lookAt basis degenerate (measured: a silent substitution —
  // see `PIP_CAMERA_UP`).
  //
  // WHY THE PARALLEL CASE DOES NOT THROW. The transverse plane is the case this
  // task exists to prevent: there `side` is +z, and the AMENDMENT B extents make
  // the larger in-plane span +z too, so a span-derived up axis would have been
  // parallel to the camera side and the panel would have rolled. `PIP_CAMERA_UP.y`
  // is +x, which is perpendicular — checked below, and a violation IS a
  // construction error worth failing on.
  //
  // One plane is a RECORDED PRE-EXISTING DEFECT rather than a construction
  // error of this table, and it must NOT take the app down: coronal's camera
  // side is +y (`AXIS_PAIR.z[1]`, `SectionPiP.SECTION_VIEWS.z.cameraSide`) and its
  // up axis is +y as well. Rotating that camera side by a right angle — the
  // actual fix — re-aims the panel's whole frustum and can only be validated in a
  // browser, which is a `SectionPiP` change outside this module's contract (the
  // same reason `mirrorX`'s recorded 90°-roll note was not "fixed" blind).
  // Throwing here would blank the entire app (this module is on the import path
  // of the 3D viewer, the section canvas and the PiP), which would be a far worse
  // regression than the rolled panel it would be reporting. So it warns, names
  // the fix's owner, and `scripts/verify/plane-transform.mjs` prints the same
  // finding as a gate note.
  const PRE_EXISTING_DEGENERATE_BASIS: Record<string, string> = {
    z:
      'SectionPiP.SECTION_VIEWS.z.cameraSide is AXIS_PAIR.z[1] = +y, which is parallel to its up axis ' +
      '+y: three.js then substitutes right=(+x) / up=(−z), so the coronal panel shows patient-left on ' +
      'the image LEFT and inferior at the top, contradicting its own badge table (S↑ I↓ R← L→). ' +
      'Pre-existing (cameraUpAxis(z) = y under both the old larger-span rule and this table); ' +
      'fix belongs with SectionPiP.cameraSide, in a browser.',
  }
  for (const axis of ['x', 'y', 'z'] as PlaneAxis[]) {
    const [uAxis, vAxis] = AXIS_PAIR[axis]
    const up = PIP_CAMERA_UP[axis]
    const side = PIP_CAMERA_SIDE[axis]
    if (up !== uAxis && up !== vAxis) {
      throw new Error(
        `planeGeometry: PIP_CAMERA_UP.${axis} = ${up} is not one of the plane's in-plane axes ` +
          `(${uAxis}, ${vAxis}) — the section camera would be degenerate`,
      )
    }
    if (side !== uAxis && side !== vAxis) {
      throw new Error(
        `planeGeometry: PIP_CAMERA_SIDE.${axis} = ${side} is not an in-plane axis of ${axis} ` +
          `(${uAxis}, ${vAxis})`,
      )
    }
    if (up === side) {
      if (PRE_EXISTING_DEGENERATE_BASIS[axis] === undefined) {
        throw new Error(
          `planeGeometry: PIP_CAMERA_UP.${axis} (${up}) is parallel to PIP_CAMERA_SIDE.${axis} ` +
            `(${side}) — three.js would silently roll the section camera`,
        )
      }
      console.warn(
        `planeGeometry: ${axis} section-camera basis is degenerate — ${PRE_EXISTING_DEGENERATE_BASIS[axis]}`,
      )
    }
  }
}

/* ----------------------------------------------------------------- levels */

/** One levels.json anchor: an id, a display name and its transverse position. */
export interface LevelLike {
  id: string
  name?: string
  y: number
}

/** The anchor nearest to a value, with the distance that selected it. */
export interface NearestLevel<T extends LevelLike> {
  level: T
  /** |level.y − value| in au. */
  distance: number
}

/**
 * nearestLevelTo(axis, value, levels) — the level anchor nearest to `value`
 * along the transverse axis, with the distance that selected it, or null when
 * there are no anchors.
 *
 * Contract (preserved exactly from the two hand-copied versions it replaces):
 *  - only the transverse axis has levels, so `axis !== 'y'` returns null and no
 *    caller may offer snapping for x or z;
 *  - the distance is measured to the value being DRAWN OR DRAGGED, never to the
 *    current `clip.y` (see `snapClipWrite`);
 *  - the first anchor wins a tie (strict `<`, as before);
 *  - the nearest anchor is returned regardless of distance — the caller's
 *    window decides whether it is close enough to use, and the distance is
 *    handed back so every caller applies the SAME measurement
 *    (`levelIdForPlane` in SectionCanvas and imageLayers, the dock's readout).
 */
export function nearestLevelTo<T extends LevelLike>(
  axis: PlaneAxis,
  value: number,
  levels: readonly T[],
): NearestLevel<T> | null {
  if (axis !== 'y') return null
  let best: T | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const level of levels) {
    const distance = Math.abs(level.y - value)
    if (distance < bestDistance) {
      bestDistance = distance
      best = level
    }
  }
  return best === null ? null : { level: best, distance: bestDistance }
}

/** A clip patch: the one axis this write touches. */
export type ClipPatch = Partial<Record<PlaneAxis, number>>

/**
 * snapClipWrite(axis, value, snapToPlate, levels) — THE snap rule, one copy.
 *
 * Returns the clip patch to hand to `store.setClip`:
 *  - transverse (y) with `snapToPlate` ON → `{ y: nearestLevel.y }`, or
 *    `{ y: value }` when there are no anchors at all;
 *  - every other case (x, z, or snapping OFF) → `{ [axis]: value }` unchanged:
 *    sagittal and coronal planes NEVER snap.
 *
 * The comparison is against the DRAGGED value, never the current `clip.y`:
 * snapping against the current value would pin the slider to the level it
 * started on (docs/UX_FIXES_PLAN.md Feature 2 · PLAN §3.2.8). Callers keep
 * writing through the single `setClip` store action — this function only
 * computes what to write.
 */
export function snapClipWrite<T extends LevelLike>(
  axis: PlaneAxis,
  value: number,
  snapToPlate: boolean,
  levels: readonly T[],
): ClipPatch {
  if (axis !== 'y' || !snapToPlate) return { [axis]: value }
  const nearest = nearestLevelTo(axis, value, levels)
  return { y: nearest !== null ? nearest.level.y : value }
}

/* ------------------------------------------------------------- photographs */

/** Anatomic axis of a section plate ('transverse' | 'sagittal' | 'coronal'). */
export type SectionAxisName = 'transverse' | 'sagittal' | 'coronal'

/** Section-plane name of a canonical plane axis. */
export function sectionAxisOf(planeAxis: PlaneAxis): SectionAxisName {
  return planeAxis === 'y' ? 'transverse' : planeAxis === 'x' ? 'sagittal' : 'coronal'
}

/** The v4 placement affine, as the pick needs it (structural subset of
 *  `SectionImageFit` in src/data/sectionImages.ts). */
export interface PlateFitLike {
  /** Source pixels per canonical au. */
  scale: number
  dx?: number
  dy?: number
  mirrorX?: boolean
}

/**
 * A candidate photograph: a structural subset of `SectionImage`
 * (src/data/sectionImages.ts), so this module stays free of data/asset imports
 * and therefore Node-importable (run rule R4).
 */
export interface SectionImageLike {
  id: string
  axis: SectionAxisName
  /** Anchor position (au) on the plane of its own `axis`; undefined = not anchorable. */
  planeValue?: number
  fit?: PlateFitLike
  /** Present on the real manifest; not required by the pick. */
  levelId?: string | null
}

/** Two anchored plates closer than this count as the same plane (tie). */
export const PLANE_TIE_EPSILON = 0.01

/** Default plane-anchor tolerance (au) — plan §4 "default 1.5 au". */
export const MODALITY_TOLERANCE_AU = 1.5

/** How a photograph was selected (diagnostics and the canvas' honesty hints). */
export interface PlaneImagePick<T> {
  image: T
  /** 'plane' = anchored at its own `planeValue`; 'level' = level-matched plate. */
  via: 'plane' | 'level'
  /** |planeValue − value| in au (0 for a level match, which has no plane). */
  distanceAu: number
}

/** Options for `pickImageForPlane`; the defaults are the app's documented rule. */
export interface PlaneImagePickOptions<T extends SectionImageLike> {
  /** Level anchor id the caller resolved (`levelIdForPlane`); null = no level match. */
  levelId?: string | null
  /** Tie-break between plates anchored to the SAME plane: return true for the
   *  better candidate. Default: an entry carrying a v4 `fit` beats one without,
   *  then manifest order (the incumbent stays). */
  beatsTie?: (candidate: T, incumbent: T) => boolean
  /** The plate to use for a level match (the layer's `stainPreferred` override).
   *  Default: the first candidate carrying that `levelId`. */
  pickLevelImage?: (entries: readonly T[], levelId: string) => T | undefined
}

/**
 * pickImageForPlane(entries, axis, planeValue, toleranceAu, options) — the ONE
 * photograph-selection rule (docs/QUALITY_PLAN.md §2 item 4). It replaces
 * `imageLayers.pickStainForPlane`'s anchor walk and `PlatesTab.photoForPlane`,
 * which had drifted into two nearly-identical implementations of the same
 * "nearest anchor in the window" rule.
 *
 * Rule:
 *  1. only entries whose `axis` is the plane's own anatomic axis are eligible
 *     (a coronal plate never mounts on a transverse plane — the filter is
 *     applied here as well as by the caller, so a mixed pool cannot leak one);
 *  2. only entries carrying a `planeValue` within `toleranceAu` are anchorable;
 *  3. the SMALLEST |plate.planeValue − planeValue| wins;
 *  4. an entry within PLANE_TIE_EPSILON of the nearest anchor is decided by
 *     `options.beatsTie` (default: a v4 `fit` beats no fit, then manifest order);
 *  5. only when NO plate is anchored: a level match through `options.levelId`
 *     and `options.pickLevelImage` — the v3 level-mapped micrographs, which
 *     exist on the transverse axis only (the only axis with levels.json
 *     anchors), so every v3 behaviour is preserved.
 *
 * `entries` should already be the candidate pool for this axis (the callers
 * pass `sectionImagesForAxis(...)` or the pre-computed slab of it).
 */
export function pickImageForPlane<T extends SectionImageLike>(
  entries: readonly T[],
  axis: PlaneAxis,
  planeValue: number,
  toleranceAu: number = MODALITY_TOLERANCE_AU,
  options: PlaneImagePickOptions<T> = {},
): PlaneImagePick<T> | undefined {
  const wanted = sectionAxisOf(axis)
  const beatsTie =
    options.beatsTie ??
    ((candidate: T, incumbent: T): boolean =>
      candidate.fit !== undefined && incumbent.fit === undefined)

  let best: T | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const image of entries) {
    if (image.axis !== wanted || image.planeValue === undefined) continue
    const distance = Math.abs(image.planeValue - planeValue)
    if (!(distance <= toleranceAu)) continue
    if (best === undefined || distance < bestDistance - PLANE_TIE_EPSILON) {
      best = image
      bestDistance = distance
      continue
    }
    if (distance <= bestDistance + PLANE_TIE_EPSILON && beatsTie(image, best)) {
      best = image
      bestDistance = Math.min(bestDistance, distance)
    }
  }
  if (best !== undefined) return { image: best, via: 'plane', distanceAu: bestDistance }

  const levelId = options.levelId ?? null
  if (levelId !== null) {
    const pickLevel = options.pickLevelImage
    const levelImage =
      pickLevel !== undefined
        ? pickLevel(entries, levelId)
        : entries.find((image) => image.axis === wanted && image.levelId === levelId)
    if (levelImage !== undefined) return { image: levelImage, via: 'level', distanceAu: 0 }
  }
  return undefined
}
