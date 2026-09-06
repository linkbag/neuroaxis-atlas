/**
 * curves.ts — curve + mirroring helpers shared by the 3D viewer
 * (ENGINEERING_PLAN §5, §8: src/geometry/curves.ts).
 *
 * All points are triples in the canonical atlas space of plan §2:
 *   x ∈ [-22, 22]  medial→lateral, +x = patient LEFT
 *   y ∈ [-55, 45]  inferior→superior
 *   z ∈ [-18, 18]  posterior→anterior (+z = ventral)
 */
import * as THREE from 'three'
import type { Vec3 } from '../types'

/** Convert authored waypoint triples to THREE.Vector3 (no mutation of inputs). */
export function toVector3s(waypoints: readonly Vec3[]): THREE.Vector3[] {
  return waypoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
}

/**
 * Smooth Catmull-Rom curve through the authored waypoints, in canonical space.
 * Used by TractTube (TubeGeometry) and by parametric envelope sweeps.
 */
export function toCatmullRom(waypoints: readonly Vec3[], closed = false): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(toVector3s(waypoints), closed, 'catmullrom', 0.5)
}

/** Mirror one canonical point across the mid-sagittal plane (x → −x). */
export function mirrorPoint(p: Vec3): Vec3 {
  return [-p[0], p[1], p[2]]
}

/**
 * Mirrored copy of a waypoint list for paired structures: every x flips sign and
 * the point order is reversed so the parametric direction (e.g. ascending flow)
 * is preserved on the mirrored instance.
 */
export function mirroredWaypoints(waypoints: readonly Vec3[]): Vec3[] {
  return [...waypoints].reverse().map(mirrorPoint)
}

/** Radial explode direction of a structure origin, per plan §5 (normalized xz). */
export function explodeDirection(origin: Vec3): [number, number] {
  const len = Math.hypot(origin[0], origin[2])
  if (len < 1e-4) return [0, 0]
  return [origin[0] / len, origin[2] / len]
}
