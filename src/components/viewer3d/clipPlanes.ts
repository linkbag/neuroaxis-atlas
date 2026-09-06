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

/** Canonical slider ranges (plan §2 axis ranges). */
export const CLIP_BOUNDS = {
  x: { min: -22, max: 22 },
  y: { min: -55, max: 45 },
  z: { min: -18, max: 18 },
} as const

/** Normals point toward the discarded half-space. */
export const SAGITTAL_PLANE = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 22)
export const CORONAL_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 18)
export const TRANSVERSE_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 45)

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
