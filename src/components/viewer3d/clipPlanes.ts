/**
 * clipPlanes.ts — shared THREE.Plane singletons for sagittal/coronal/transverse
 * clipping (ENGINEERING_PLAN §5 "Clipping", viewer3d task).
 *
 * Every material in the scene references ALL_CLIP_PLANES, so toggling or
 * dragging the sliders never rebuilds materials — only plane constants change.
 * A THREE.Plane keeps the half-space its normal points AWAY from, so with the
 * inward-facing normals below geometry is hidden on the +normal side
 * (sagittal keeps x < c, coronal keeps z < c, transverse keeps y < c), which
 * is exactly what the 2D↔3D plate sync needs: viewing a plate's level looks
 * down onto the cut face of the caudal remainder.
 */
import * as THREE from 'three'

/**
 * Canonical slider ranges — THE single declaration of the canonical box.
 * `docs/TELENCEPHALON_PLAN.md` §2 AMENDMENT B (task `tel-space`), corrected by
 * the v7 QA pass, which MEASURED the baked geometry — the pre-bake estimate
 * only covered the lobar/gyral parts and missed the cerebral white-matter cores:
 *
 *   x ∈ [−58, +58]  the baked hemisphere ribbon reaches ±56.1 au
 *                   (was ±48 — the shells extended 8.1 au past it).
 *   y ∈ [−55, +116] the ribbon reaches +113.7 au at the vertex
 *                   (was +85 — 28.8 au of cortex was unreachable by the slider).
 *   z ∈ [−76, +72]  −72.8 au (occipital pole) … +70.6 au (frontal pole)
 *                   (was −75…+55 — the frontal pole stuck out by 15.7 au).
 *
 * Every value carries ~2 au of margin beyond the measured geometry so a plane
 * can be parked just outside the surface.
 *
 * NOTHING BELOW y = +45 MOVES: every existing level anchor, plate, clip value
 * and imagery coordinate is unchanged, and the brainstem/diencephalon/cerebellum
 * experience is unchanged at the old planes (verified in the v7 QA: baked
 * brainstem GLB bboxes Δ 0.000 au, MRI/CT legacy-level slices max |Δ| 0 of 255).
 *
 * Consumers do not retype these numbers: `ClipControls` and `SectionSliderBar`
 * read the slider min/max from here, and `section/planeGeometry.ts` derives
 * `axisExtents`/`planeTransform` (the canvas, PiP and sampler mapping) from
 * them — see that module for the one transform.
 */
export const CLIP_BOUNDS = {
  x: { min: -58, max: 58 },
  y: { min: -55, max: 116 },
  z: { min: -76, max: 72 },
} as const

/**
 * Normals point toward the discarded half-space.
 *
 * The initial constants are the SAME rule `applyClipState` writes: three.js
 * clips the half-space a plane's normal points away from, so a plane with the
 * inward normal `−axis` and `constant = CLIP_BOUNDS[axis].max` keeps the whole
 * box (`n·x + c ≥ 0` ⇒ `x ≤ max`), i.e. "the full canonical extent" — the state
 * `store.clip` is in before the first slider touch or plate click. They are
 * DERIVED from `CLIP_BOUNDS` rather than typed in, so extending the box can
 * never leave a plane constant behind pointing at the old bound (the drift this
 * module exists to prevent). `ClipSync` then pushes the store's live values on
 * mount and on every clip change; `applyClipState` remains the only writer.
 */
export const SAGITTAL_PLANE = new THREE.Plane(
  new THREE.Vector3(-1, 0, 0),
  CLIP_BOUNDS.x.max,
)
export const CORONAL_PLANE = new THREE.Plane(
  new THREE.Vector3(0, 0, -1),
  CLIP_BOUNDS.z.max,
)
export const TRANSVERSE_PLANE = new THREE.Plane(
  new THREE.Vector3(0, -1, 0),
  CLIP_BOUNDS.y.max,
)

/** Stable array handed to every material's `clippingPlanes`. */
export const ALL_CLIP_PLANES: THREE.Plane[] = [SAGITTAL_PLANE, CORONAL_PLANE, TRANSVERSE_PLANE]

/** Off state: constant far outside the canonical box keeps every fragment. */
const OFF_CONSTANT = 1000

/** Push the store's clip slice into the shared planes (ClipSync calls this). */
export function applyClipState(clip: { x: number; z: number; y: number; enabled: boolean }): void {
  SAGITTAL_PLANE.constant = clip.enabled ? clip.x : OFF_CONSTANT
  CORONAL_PLANE.constant = clip.enabled ? clip.z : OFF_CONSTANT
  TRANSVERSE_PLANE.constant = clip.enabled ? clip.y : OFF_CONSTANT
}
