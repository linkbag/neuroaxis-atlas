/**
 * envelope.ts — parametric context envelopes for the 3D viewer
 * (ENGINEERING_PLAN §5, §8: src/geometry/envelope.ts).
 *
 * Every factory returns fresh THREE.BufferGeometry positioned directly in the
 * canonical atlas space of plan §2 (x ∈ [-22,22] +x = patient LEFT, y ∈ [-55,45]
 * superior, z ∈ [-18,18] ventral), so the scene can add meshes with no extra
 * transform. Y anchors follow src/data/levels.json.
 *
 * The brainstem axis carries a gentle ventral bow at the midbrain flexure
 * (~+3 z at y ≈ 12, returning to z ≈ 0 at the thalamus, plan §2); the same
 * axisZ() displacement is applied to every axial envelope so nuclei, tracts
 * (whose waypoints are authored in the same space) and envelopes stay aligned.
 *
 * Original/schematic geometry only — no external anatomy datasets.
 */
import * as THREE from 'three'
import type { Region } from '../types'
import { toCatmullRom } from './curves'

/* ------------------------------------------------------------------ */
/* Ventral bow of the brainstem axis                                   */
/* ------------------------------------------------------------------ */

/** Peak ventral offset of the axis at the midbrain flexure (plan §2). */
const FLEXURE_Z = 3

/** (y, z) anchors of the axis bow, cosine-eased between neighbors. */
const BOW_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [-60, 0],
  [2, 0],
  [12, FLEXURE_Z],
  [22, 0],
  [60, 0],
]

/** Ventral (＋z) offset of the brainstem axis at height y. */
export function axisZ(y: number): number {
  if (y <= BOW_ANCHORS[0][0]) return BOW_ANCHORS[0][1]
  const last = BOW_ANCHORS[BOW_ANCHORS.length - 1]
  if (y >= last[0]) return last[1]
  for (let i = 0; i < BOW_ANCHORS.length - 1; i++) {
    const [y0, z0] = BOW_ANCHORS[i]
    const [y1, z1] = BOW_ANCHORS[i + 1]
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0)
      const e = 0.5 - 0.5 * Math.cos(Math.PI * t) // cosine ease in-out
      return z0 + (z1 - z0) * e
    }
  }
  return 0
}

/** Displace every vertex by the axis bow at its height; normals recomputed. */
function applyAxisBow(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + axisZ(pos.getY(i)))
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/* ------------------------------------------------------------------ */
/* Small geometry helpers                                              */
/* ------------------------------------------------------------------ */

/** Unit sphere scaled to radii (rx, ry, rz) and centered at (cx, cy, cz). */
function ellipsoid(
  rx: number,
  ry: number,
  rz: number,
  cx: number,
  cy: number,
  cz: number,
  widthSegments = 32,
  heightSegments = 22,
): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, widthSegments, heightSegments)
  g.scale(rx, ry, rz)
  g.translate(cx, cy, cz)
  return g
}

/** Mirrored copy across the mid-sagittal plane (x → −x) with corrected winding. */
function mirrorGeometryX(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const mirrored = geometry.clone()
  const pos = mirrored.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setX(i, -pos.getX(i))
  pos.needsUpdate = true
  const index = mirrored.getIndex()
  if (index !== null) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, b)
    }
    index.needsUpdate = true
  }
  mirrored.computeVertexNormals()
  return mirrored
}

/* ------------------------------------------------------------------ */
/* Region context envelopes (plan §5)                                  */
/* ------------------------------------------------------------------ */

/**
 * Medulla — tapered lathe tube, y ∈ [-50, -24] (cervicomedullary junction to
 * pontomedullary junction), radius 5 → 7 au.
 */
export function createMedullaEnvelope(): THREE.BufferGeometry {
  const yBottom = -50
  const yTop = -24
  const stations = 12
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= stations; i++) {
    const t = i / stations
    const y = yBottom + (yTop - yBottom) * t
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t)
    const r = 5 + (7 - 5) * ease
    profile.push(new THREE.Vector2(r, y))
  }
  const lathe = new THREE.LatheGeometry(profile, 36)
  return applyAxisBow(lathe)
}

/**
 * Pons — the big ventral bulge between pontomedullary junction (−24) and the
 * midbrain (＋4): a sphere scaled to ≈11 (transverse) × ~13 (to span the
 * junction range) × 8 (flattened z, plan §5 "r≈11 flattened z"), centered
 * slightly ventral of the axis.
 */
export function createPonsEnvelope(): THREE.BufferGeometry {
  const g = ellipsoid(11, 13, 8, 0, -10, 1.5, 40, 28)
  return applyAxisBow(g)
}

/** Midbrain — tube y ∈ [4, 20], radius ≈ 7 au, following the flexure bow. */
export function createMidbrainEnvelope(): THREE.BufferGeometry {
  const yBottom = 4
  const yTop = 20
  const radius = 7
  const stations = 10
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= stations; i++) {
    const t = i / stations
    const y = yBottom + (yTop - yBottom) * t
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t)
    profile.push(new THREE.Vector2(radius * (0.94 + 0.06 * ease), y))
  }
  const lathe = new THREE.LatheGeometry(profile, 36)
  return applyAxisBow(lathe)
}

/**
 * Thalamus — paired ovoids (≈6.5 × 8 × 8.5) spanning y ∈ [22, 38], centered
 * (±7, 30, 0) — matching the ctx-thalamus-envelope record extent. Returns
 * [+x side, −x side].
 */
export function createThalamusEnvelopes(): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const right = ellipsoid(6.5, 8, 8.5, 7, 30, 0, 36, 24)
  return [right, mirrorGeometryX(right)]
}

/**
 * Hypothalamus — ventral wedge below/rostral to the thalamus, centered on the
 * ctx-hypothalamus-envelope record (0, 31.5, 7); tapers toward the optic
 * chiasm (＋z) to read as a wedge rather than an egg.
 */
export function createHypothalamusEnvelope(): THREE.BufferGeometry {
  const g = ellipsoid(5, 4.5, 4, 0, 31.5, 7, 32, 22)
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getZ(i) - 3) / 8, 0, 1) // 0 dorsal → 1 ventral/rostral
    pos.setX(i, pos.getX(i) * (1.28 - 0.68 * t))
    const yCentered = pos.getY(i) - 31.5
    pos.setY(i, 31.5 + yCentered * (1 - 0.18 * t)) // taper height toward the chiasm
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

/**
 * Cerebellum — two hemisphere ovoids + midline vermis bar behind the
 * brainstem, y ∈ ≈[-38.5, -6.5], dorsal at z ≈ −13.5 (ctx-cerebellum extent).
 * Returns [right hemisphere, left hemisphere, vermis].
 */
export function createCerebellumEnvelopes(): [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry] {
  const right = ellipsoid(8, 16, 6.5, 6.5, -22.5, -13.5, 36, 24)
  const left = mirrorGeometryX(right)
  const vermis = ellipsoid(2.8, 13, 4.5, 0, -21, -15.5, 24, 18)
  return [right, left, vermis]
}

/* ------------------------------------------------------------------ */
/* Ventricle envelopes (plan §5: vent-* records + tube + tent + slit)  */
/* ------------------------------------------------------------------ */

/**
 * Cerebral aqueduct — narrow midline tube connecting the 3rd ventricle
 * (y ≈ 19.5) through the midbrain flexure to the tent of the 4th ventricle
 * (y ≈ −13), riding the axis bow.
 */
export function createCerebralAqueductGeometry(): THREE.BufferGeometry {
  const curve = toCatmullRom([
    [0, 19.5, -0.8],
    [0, 14, -2.2],
    [0, 7, -2.6],
    [0, 0, -3.2],
    [0, -7, -4.2],
    [0, -13, -5.6],
  ])
  return new THREE.TubeGeometry(curve, 48, 0.75, 10, false)
}

/**
 * Fourth ventricle — dorsal "tent" behind the pons/open medulla: a flattened
 * rhomboid cavity (x-radius 4.5, z-radius 1.9 at z ≈ −7.2) with a midline
 * ridge rising toward the fastigium.
 */
export function createFourthVentricleTentGeometry(): THREE.BufferGeometry {
  const cx = 0
  const cy = -21
  const cz = -7.2
  const rx = 4.5
  const ry = 11
  const rz = 1.9
  const g = ellipsoid(rx, ry, rz, cx, cy, cz, 30, 22)
  const pos = g.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const yLocal = (pos.getY(i) - cy) / ry
    if (yLocal > 0) {
      const across = 1 - Math.min(1, Math.abs(pos.getX(i) - cx) / rx)
      pos.setY(i, pos.getY(i) + 1.8 * across * yLocal)
    }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

/**
 * Third ventricle — narrow midline slit between the thalami (x-radius ≈ 1),
 * matching the vent-third-ventricle record extent (y 23→35, z ±5 around 0.5).
 */
export function createThirdVentricleSlitGeometry(): THREE.BufferGeometry {
  return ellipsoid(1.1, 6, 5, 0, 29, 0.5, 28, 22)
}

/* ------------------------------------------------------------------ */
/* Scene-facing bundle                                                 */
/* ------------------------------------------------------------------ */

/** One renderable envelope part with the record/region it belongs to. */
export interface ContextEnvelopePart {
  /** Linked record id (ctx-*) or a synthetic env-* id for pure context. */
  id: string
  region: Region
  geometry: THREE.BufferGeometry
}

/**
 * All translucent context envelopes for SceneLayers, already positioned in
 * canonical space. Pure context shapes (no authored record) use synthetic
 * `env-*` ids; the thalamus/hypothalamus/cerebellum silhouettes carry the ids
 * of their ctx-* records so layer filters and selection highlighting apply.
 */
export function buildContextEnvelopes(): ContextEnvelopePart[] {
  const [thalamusRight, thalamusLeft] = createThalamusEnvelopes()
  const [cerebRight, cerebLeft, vermis] = createCerebellumEnvelopes()
  return [
    { id: 'env-medulla', region: 'medulla', geometry: createMedullaEnvelope() },
    { id: 'env-pons', region: 'pons', geometry: createPonsEnvelope() },
    { id: 'env-midbrain', region: 'midbrain', geometry: createMidbrainEnvelope() },
    { id: 'ctx-thalamus-envelope', region: 'diencephalon', geometry: thalamusRight },
    { id: 'ctx-thalamus-envelope', region: 'diencephalon', geometry: thalamusLeft },
    { id: 'ctx-hypothalamus-envelope', region: 'diencephalon', geometry: createHypothalamusEnvelope() },
    { id: 'ctx-cerebellum', region: 'cerebellum', geometry: cerebRight },
    { id: 'ctx-cerebellum', region: 'cerebellum', geometry: cerebLeft },
    { id: 'ctx-cerebellum', region: 'cerebellum', geometry: vermis },
  ]
}

/**
 * Geometry overrides for authored records whose 3D shape is more than an
 * ellipsoid: the three ventricle records render as their parametric envelopes
 * (slit / tube / tent). Returns undefined for any other id — callers fall back
 * to the record's origin3d/size3d ellipsoid.
 */
export function ventricleGeometryFor(id: string): THREE.BufferGeometry | undefined {
  switch (id) {
    case 'vent-third-ventricle':
      return createThirdVentricleSlitGeometry()
    case 'vent-cerebral-aqueduct':
      return createCerebralAqueductGeometry()
    case 'vent-fourth-ventricle':
      return createFourthVentricleTentGeometry()
    default:
      return undefined
  }
}
