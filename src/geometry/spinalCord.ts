/**
 * spinalCord.ts — the PROCEDURAL spinal cord (docs/SPINAL_CORD_PLAN.md):
 * every spinal surface in NeuroAxis is swept/lofted here at runtime, the same
 * philosophy as the tracts (src/components/viewer3d/TractTube.tsx) and the
 * vessel courses (src/geometry/vasculature-courses.ts). Nothing is baked — the
 * anatomy GLB budget has 0.18 MiB headroom (cap 14 MiB,
 * scripts/verify/budget-report.mjs), so no new GLB may exist for the cord.
 *
 * Canonical space: x = +patient-left, y = +superior, z = +anterior, 1 au =
 * 1.2 mm. The cord spans y ≈ −383 (conus tip at vertebral L1/L2) to y ≈ −50
 * (cervicomedullary junction; the medulla floor at y ≈ −50.8 overlaps the cord
 * top so the sagittal profile is continuous across y = −50).
 *
 * ONE SOURCE OF TRUTH (plan §6): the 2D live section
 * (src/components/section/SectionCanvas.tsx) slices the geometries BUILT HERE —
 * the same BufferGeometry values feed SceneLayers (3D) and the contour worker
 * (2D), so a cross-section at any spinal level IS the 3D shape. Nothing in this
 * file draws; everything returns canonical-space geometry.
 *
 * Cross-sections drive off the per-level profile table (StatPearls NBK545206):
 * transverse diameter 13.3 mm (C5) → 8.3 mm (T8) → 9.4 mm (L3), antero-
 * posterior ≈ 0.85 × transverse. Two enlargements: cervical C5–T1 and lumbar
 * L2–S3. The conus medullaris tapers to ≈ 0 below the sacral segments and the
 * filum terminale continues as a thin thread to the clip floor (y = −390).
 *
 * Level conventions (segment centers, world y) live in SPINAL_SEGMENTS. Named
 * nuclei are level-restricted columns (Clarke's nucleus C8–L3, intermediolateral
 * T1–L2, sacral parasympathetic S2–S4) built from the same gray-matter
 * templates that shape the H — the templates are the teaching content
 * (Nolte §"The spinal cord", Blumenfeld Ch.5, Neuroscience Online Ch.3):
 * thin dorsal horn in thoracic, large ventral horn in the two enlargements,
 * lateral horn visible T1–L2 only, proportionally huge gray matter in sacral.
 */
import * as THREE from 'three'

/** Millimeters per canonical unit (the project-wide contract: 1 au = 1.2 mm). */
export const AU_TO_MM = 1.2
/** Millimeters → canonical units. */
export const mmToAu = (mm: number): number => mm / AU_TO_MM

/** The cord's region in the layer taxonomy (Area toggle "Spinal cord"). */
export const SPINAL_REGION = 'spinal' as never

/* ------------------------------------------------------------------ */
/* Level table                                                          */
/* ------------------------------------------------------------------ */

export interface SpinalSegment {
  /** Stable id, e.g. 'C5', 'T8', 'L3', 'S4', 'Co1'. */
  id: string
  /** World-y center of the segment. */
  y: number
}

/**
 * The 31 spinal segments (C1–C8, T1–T12, L1–L5, S1–S5, Co1) mapped onto the
 * cord's y span. ANCHORS ARE THE PLATFORM'S LEVEL TILES (src/data/levels.json
 * lvl-c1…lvl-co1 — each y is the center of its segment tile; tiles tile the
 * span EXACTLY [−50, −383] with block boundaries −159.89 (C/T), −303.08 (T/L),
 * −346.37 (L/S), −373.01 (S/Co)). The conus tip (Co1 tile) sits at y = −378…
 * −383; the platform's clip floor (y = −390) leaves room for the filum under.
 */
export const SPINAL_SEGMENTS: readonly SpinalSegment[] = [
  { id: 'C1', y: -57 }, { id: 'C2', y: -71 }, { id: 'C3', y: -84 }, { id: 'C4', y: -98 },
  { id: 'C5', y: -112 }, { id: 'C6', y: -126 }, { id: 'C7', y: -139 }, { id: 'C8', y: -153 },
  { id: 'T1', y: -166 }, { id: 'T2', y: -178 }, { id: 'T3', y: -190 }, { id: 'T4', y: -202 },
  { id: 'T5', y: -214 }, { id: 'T6', y: -226 }, { id: 'T7', y: -237 }, { id: 'T8', y: -249 },
  { id: 'T9', y: -261 }, { id: 'T10', y: -273 }, { id: 'T11', y: -285 }, { id: 'T12', y: -297 },
  { id: 'L1', y: -307 }, { id: 'L2', y: -316 }, { id: 'L3', y: -325 }, { id: 'L4', y: -333 },
  { id: 'L5', y: -342 },
  { id: 'S1', y: -349 }, { id: 'S2', y: -354 }, { id: 'S3', y: -360 }, { id: 'S4', y: -365 },
  { id: 'S5', y: -370 },
  { id: 'Co1', y: -378 },
]

/** Cord top (cervicomedullary junction) and conus tip, world y. */
export const CORD_TOP_Y = -50
export const CORD_TIP_Y = -383
/** Filum terminale descends from the conus tip to the clip floor. */
export const FILUM_TIP_Y = -390

/** Well-known segment boundary y values used by templates and gates. */
export const T1_Y = -166
export const T6_Y = -226
export const L2_Y = -316
export const C8_Y = -153
export const L3_Y = -325
export const S2_Y = -354
export const S4_Y = -365

export type SpinalZone = 'cervical' | 'thoracic' | 'lumbar' | 'sacral'

/** Zone of any world y along the cord (level-tile block boundaries). */
export function zoneAt(y: number): SpinalZone {
  if (y > -159.89) return 'cervical' // C8 (−153) … C1 (−57)
  if (y > -303.08) return 'thoracic' // T1 (−166) … T12 (−297)
  if (y > -346.37) return 'lumbar' // L1 (−307) … L5 (−342)
  return 'sacral' // S1 (−349) … Co1 (−378)
}

/* ------------------------------------------------------------------ */
/* Per-level profile (StatPearls NBK545206)                             */
/* ------------------------------------------------------------------ */

/**
 * Transverse diameter anchors (mm) at segment y. The cited values —
 * 13.3 mm at C5, 8.3 mm at T8, 9.4 mm at L3 — are exact anchors; everything
 * between is linear, which is all a teaching profile needs. Anteroposterior
 * diameter is AP_RATIO × transverse everywhere.
 */
const TRANSVERSE_PROFILE_MM: ReadonlyArray<readonly [number, number]> = [
  [-50, 9.2], [-57, 9.5], [-84, 11.2],
  [-112, 13.3], [-126, 13.2], [-139, 12.9], [-153, 12.2], // cervical enlargement (C5–T1), peak at C5
  [-166, 11.2], [-178, 10.2], [-202, 9.3], [-226, 8.7],
  [-249, 8.3], [-273, 8.35], [-297, 8.4], // thoracic minimum AT T8 (cited 8.3 — StatPearls)
  [-307, 8.5], [-316, 8.9], [-325, 9.4], [-333, 9.3], [-342, 8.9], // lumbar enlargement (L2–S3), peak at L3
  [-349, 8.0], [-354, 7.0], [-360, 5.8], [-365, 4.4], [-370, 3.2], [-378, 1.6], [-383, 0.35],
]

/** Anteroposterior diameter ≈ 0.85 × transverse (StatPearls NBK545206). */
export const AP_RATIO = 0.85

/**
 * Linear interpolation over a [y, value] anchor table. DIRECTION-AGNOSTIC:
 * the profile tables run rostral→caudal (DESCENDING y, −50 → −383), and the
 * first spinal-geometry gate run caught a version that assumed ascending y —
 * it returned the first anchor for every y below it (a uniform 9.2 mm tube).
 * Both directions now bracket the query the same way.
 */
function lerpTable(table: ReadonlyArray<readonly [number, number]>, y: number): number {
  const first = table[0]
  const last = table[table.length - 1]
  const ascending = first[0] <= last[0]
  if (ascending ? y <= first[0] : y >= first[0]) return first[1]
  if (ascending ? y >= last[0] : y <= last[0]) return last[1]
  for (let i = 1; i < table.length; i += 1) {
    const [y1, v1] = table[i]
    const [y0, v0] = table[i - 1]
    if (ascending ? y <= y1 : y >= y1) {
      return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0)
    }
  }
  return last[1]
}

/** Transverse (x) diameter of the cord at world y, in MILLIMETERS. */
export function transverseDiameterMm(y: number): number {
  return lerpTable(TRANSVERSE_PROFILE_MM, y)
}

/** Cross-section radii at world y (au): rx lateral, rz anteroposterior. */
export function cordRadiiAt(y: number): { rx: number; rz: number } {
  const rx = mmToAu(transverseDiameterMm(y)) / 2
  return { rx, rz: rx * AP_RATIO }
}

/**
 * Cord axis (centerline) at world y: gentle cervical lordosis and lumbar
 * curvature in the sagittal (z) plane, midline in x. Amplitudes are a few au —
 * the profile must read as curved without wandering from the brainstem above
 * (whose caudal face is at x ≈ 0, z ≈ 0).
 */
const CENTERLINE_Z: ReadonlyArray<readonly [number, number]> = [
  [-50, 0], [-97, 1.2], [-157, -0.8], [-247, -1.2], [-307, 1.0], [-383, 1.6],
]

export function cordCenterAt(y: number): { x: number; z: number } {
  return { x: 0, z: lerpTable(CENTERLINE_Z, y) }
}

/* ------------------------------------------------------------------ */
/* Gray-matter H templates                                              */
/* ------------------------------------------------------------------ */

/**
 * One zone's gray-matter template, in fractions of the local cord radii so the
 * H scales with the cord. The H is assembled from sub-columns (dorsal horn,
 * ventral horn, commissure halves, lateral horn) whose rings use these numbers,
 * so the 3D gray matter, the named nuclei and the funiculi's inner whitespace
 * all read from one table.
 */
export interface GrayTemplate {
  /** Half-width of the commissure bridge (× rx). */
  commissureHalfWidth: number
  /** Half-depth of the commissure bridge (× rz). */
  commissureHalfDepth: number
  /** Dorsal horn tip depth (z = −dorsalReach × rz). */
  dorsalReach: number
  /** Dorsal horn base half-width (× rx). */
  dorsalHalfWidth: number
  /** Dorsal horn tip half-width (× rx). */
  dorsalTipHalfWidth: number
  /** How far laterally the dorsal horn tip drifts from the commissure edge (× rx). */
  dorsalLateralShift: number
  /** Ventral horn tip depth (z = +ventralReach × rz). */
  ventralReach: number
  /** Ventral horn base half-width (× rx). */
  ventralHalfWidth: number
  /** Ventral horn tip half-width (× rx). */
  ventralTipHalfWidth: number
}

const GRAY_TEMPLATES: Record<SpinalZone, GrayTemplate> = {
  // Cervical: big ventral horn (the C5–T1 enlargement's motor columns), a
  // moderately sized dorsal horn, wide commissure.
  cervical: {
    commissureHalfWidth: 0.2, commissureHalfDepth: 0.11,
    dorsalReach: 0.62, dorsalHalfWidth: 0.1, dorsalTipHalfWidth: 0.045, dorsalLateralShift: 0.1,
    ventralReach: 0.55, ventralHalfWidth: 0.16, ventralTipHalfWidth: 0.09,
  },
  // Thoracic: thin dorsal horn, THIN ventral horn, small gray overall — the
  // classic "small H in a sea of white".
  thoracic: {
    commissureHalfWidth: 0.16, commissureHalfDepth: 0.09,
    dorsalReach: 0.68, dorsalHalfWidth: 0.075, dorsalTipHalfWidth: 0.035, dorsalLateralShift: 0.08,
    ventralReach: 0.42, ventralHalfWidth: 0.085, ventralTipHalfWidth: 0.05,
  },
  // Lumbar: large ventral horn again (L2–S3 enlargement), broad dorsal horn.
  lumbar: {
    commissureHalfWidth: 0.22, commissureHalfDepth: 0.12,
    dorsalReach: 0.58, dorsalHalfWidth: 0.12, dorsalTipHalfWidth: 0.055, dorsalLateralShift: 0.12,
    ventralReach: 0.58, ventralHalfWidth: 0.17, ventralTipHalfWidth: 0.1,
  },
  // Sacral: gray matter proportionally HUGE — both horns broad, little white.
  sacral: {
    commissureHalfWidth: 0.26, commissureHalfDepth: 0.14,
    dorsalReach: 0.55, dorsalHalfWidth: 0.16, dorsalTipHalfWidth: 0.07, dorsalLateralShift: 0.14,
    ventralReach: 0.52, ventralHalfWidth: 0.15, ventralTipHalfWidth: 0.09,
  },
}

function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
}

/** Blend width (au) around each zone boundary the templates fade across. */
const ZONE_BLEND = 10

/** The gray template at world y (smooth-blended across zone boundaries). */
export function grayTemplateAt(y: number): GrayTemplate {
  const zones: SpinalZone[] = ['cervical', 'thoracic', 'lumbar', 'sacral']
  const bounds = [-132, -253, -313]
  let a: GrayTemplate = GRAY_TEMPLATES[zoneAt(y)]
  let b: GrayTemplate = a
  let t = 0
  for (let i = 0; i < bounds.length; i += 1) {
    const bound = bounds[i]
    if (Math.abs(y - bound) <= ZONE_BLEND) {
      a = GRAY_TEMPLATES[zones[i]]
      b = GRAY_TEMPLATES[zones[i + 1]]
      t = smoothstep((y - (bound - ZONE_BLEND)) / (2 * ZONE_BLEND))
      break
    }
  }
  const mix = (k: keyof GrayTemplate): number => a[k] + (b[k] - a[k]) * t
  return {
    commissureHalfWidth: mix('commissureHalfWidth'),
    commissureHalfDepth: mix('commissureHalfDepth'),
    dorsalReach: mix('dorsalReach'),
    dorsalHalfWidth: mix('dorsalHalfWidth'),
    dorsalTipHalfWidth: mix('dorsalTipHalfWidth'),
    dorsalLateralShift: mix('dorsalLateralShift'),
    ventralReach: mix('ventralReach'),
    ventralHalfWidth: mix('ventralHalfWidth'),
    ventralTipHalfWidth: mix('ventralTipHalfWidth'),
  }
}

/**
 * Lateral horn presence 0..1 at world y: visible T1–L2 ONLY (the
 * intermediolateral nucleus / sacral parasympathetic column region), fading
 * out within a few au of the range so the loft closes cleanly. The teaching
 * point ("lateral horn exists T1–L2") is what the spinal-geometry gate
 * asserts at C5 / T6 / S3.
 */
export function lateralHornPresence(y: number): number {
  const lo = L2_Y - 6 // fade below L2
  const hi = T1_Y + 6 // fade above T1
  if (y <= lo || y >= hi) return 0
  return smoothstep((y - lo) / 8) * smoothstep((hi - y) / 8)
}

/** Central canal radius (au) at world y — 1.1 mm diameter at cervical, closing caudally. */
export function canalRadiusAt(y: number): number {
  return mmToAu(lerpTable([[-50, 1.1], [-247, 0.9], [-331, 0.6], [-383, 0.3]], y)) / 2
}

/* ------------------------------------------------------------------ */
/* Ring generators (local cross-section coords: x lateral, z anterior)   */
/* ------------------------------------------------------------------ */

type Pt = [number, number]

function ellipseRing(rx: number, rz: number, n: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < n; i += 1) {
    // Half-step phase: no vertex lands exactly on x = 0 (or z = 0). The
    // section slicer is vertex-exact by contract — a ring vertex ON the slice
    // plane degenerates the crossing segments and the slice paints nothing.
    const t = ((i + 0.5) / n) * Math.PI * 2
    pts.push([rx * Math.cos(t), rz * Math.sin(t)])
  }
  return pts
}

/** Dorsal-horn ring (patient-LEFT half, x ≥ 0), stretched along −z. */
function dorsalHornRing(y: number): Pt[] {
  const { rx, rz } = cordRadiiAt(y)
  const g = grayTemplateAt(y)
  const cx = g.commissureHalfWidth * rx
  const cz = g.commissureHalfDepth * rz
  const tipX = cx + g.dorsalLateralShift * rx
  const tipZ = -g.dorsalReach * rz
  const w0 = g.dorsalHalfWidth * rx
  const w1 = g.dorsalTipHalfWidth * rx
  // Simple hexagon: base at the commissure edge, tip drifting laterally as it
  // runs dorsal. Mirrored geometry provides the other side.
  return [
    [cx - w0 * 0.2, -cz * 0.9],
    [cx + w0, -cz - 0.04 * rz],
    [tipX + w1, tipZ + 0.16 * (cz - tipZ)],
    [tipX, tipZ],
    [tipX - w1, tipZ + 0.16 * (cz - tipZ)],
    [cx - w0 * 0.2, -cz - 0.1 * (cz - tipZ)],
  ]
}

/** Ventral-horn ring (patient-LEFT half, x ≥ 0), broad and rounded ventrally. */
function ventralHornRing(y: number): Pt[] {
  const { rx, rz } = cordRadiiAt(y)
  const g = grayTemplateAt(y)
  const cx = g.commissureHalfWidth * rx
  const cz = g.commissureHalfDepth * rz
  const tipZ = g.ventralReach * rz
  const w0 = g.ventralHalfWidth * rx
  const w1 = g.ventralTipHalfWidth * rx
  return [
    [cx - w0 * 0.2, cz * 0.9],
    [cx + w0 * 0.75, cz + 0.1 * (tipZ - cz)],
    [cx + w0, cz + 0.45 * (tipZ - cz)],
    [cx + w0 * 0.55 + w1 * 0.45, tipZ * 0.92],
    [cx + w1 * 0.8, tipZ],
    [cx + w1 * 0.15, tipZ * 0.97],
    [cx - w0 * 0.2, cz + 0.5 * (tipZ - cz)],
  ]
}

/** Commissure-half ring: the bridge beside the canal (|x| ≥ canal gap). */
function commissureHalfRing(y: number): Pt[] {
  const { rx, rz } = cordRadiiAt(y)
  const g = grayTemplateAt(y)
  const cw = g.commissureHalfWidth * rx
  const cz = g.commissureHalfDepth * rz
  const gap = canalRadiusAt(y) * 1.15
  return [
    [gap, -cz], [cw, -cz], [cw, cz], [gap, cz],
  ]
}

/** Lateral-horn ring (patient-LEFT half, x ≥ 0): a small bump between the horns. */
function lateralHornRing(y: number): Pt[] {
  const { rx, rz } = cordRadiiAt(y)
  const g = grayTemplateAt(y)
  const presence = lateralHornPresence(y)
  const cx = (g.commissureHalfWidth + 0.14) * rx * (1 + 0.2 * presence)
  const cz = -0.05 * rz
  const w = 0.06 * rx * presence
  const d = 0.1 * rz * presence
  return [
    [cx - w, cz - d], [cx + w, cz - d], [cx + w, cz + d], [cx - w, cz + d],
  ]
}

/* ------------------------------------------------------------------ */
/* Loft helper                                                          */
/* ------------------------------------------------------------------ */

/**
 * Loft a stack of same-length rings along y. `centers[i]` offsets ring i in
 * (x, z) — the cord axis curvature. Rings may degenerate to a point (the
 * conus tip, faded horns); the quads just collapse. Both ends are capped with
 * a center-vertex fan so axial sections (the sagittal profile) close into
 * paintable loops instead of dropped open chains.
 */
export function loftRings(
  rings: Pt[][],
  ys: number[],
  centers?: Array<{ x: number; z: number }>,
): THREE.BufferGeometry {
  const ringLen = rings[0].length
  const ringCount = rings.length
  const positions = new Float32Array((ringCount * ringLen + 2) * 3)
  const indices: number[] = []
  for (let r = 0; r < ringCount; r += 1) {
    const c = centers?.[r] ?? { x: 0, z: 0 }
    for (let i = 0; i < ringLen; i += 1) {
      const o = (r * ringLen + i) * 3
      positions[o] = rings[r][i][0] + c.x
      positions[o + 1] = ys[r]
      positions[o + 2] = rings[r][i][1] + c.z
    }
    if (r > 0) {
      for (let i = 0; i < ringLen; i += 1) {
        const j = (i + 1) % ringLen
        const a = (r - 1) * ringLen + i
        const b = (r - 1) * ringLen + j
        const c2 = r * ringLen + i
        const d = r * ringLen + j
        indices.push(a, c2, b, b, c2, d)
      }
    }
  }
  // Cap fans: one center vertex per end (ring centroid), triangles fanned to
  // the end ring. Winding mirrors the loft's outward orientation.
  const capTop = ringCount * ringLen
  const capBottom = capTop + 1
  for (const [cap, r, flip] of [[capTop, 0, true], [capBottom, ringCount - 1, false]] as const) {
    const c = centers?.[r] ?? { x: 0, z: 0 }
    let cx = 0
    let cz = 0
    for (let i = 0; i < ringLen; i += 1) {
      cx += rings[r][i][0]
      cz += rings[r][i][1]
    }
    const o = cap * 3
    positions[o] = cx / ringLen + c.x
    positions[o + 1] = ys[r]
    positions[o + 2] = cz / ringLen + c.z
    for (let i = 0; i < ringLen; i += 1) {
      const j = (i + 1) % ringLen
      const a = r * ringLen + i
      const b = r * ringLen + j
      if (flip) indices.push(cap, a, b)
      else indices.push(cap, b, a)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** y sampling for lofts: ~3.7 au steps, always hitting both ends. */
function sampleYs(yTop: number, yBottom: number, step = 3.7): number[] {
  const ys: number[] = []
  const n = Math.max(2, Math.round((yTop - yBottom) / step))
  for (let i = 0; i <= n; i += 1) ys.push(yTop + ((yBottom - yTop) * i) / n)
  return ys
}

/** Mirror canonical-space geometry to the other side (x → −x), fixing winding. */
export function mirrorGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geometry.clone()
  out.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1))
  const index = out.getIndex()
  if (index) {
    const arr = index.array
    for (let i = 0; i < arr.length; i += 3) {
      const t = arr[i + 1]
      arr[i + 1] = arr[i + 2]
      arr[i + 2] = t
    }
    index.needsUpdate = true
  }
  out.computeVertexNormals()
  return out
}

/* ------------------------------------------------------------------ */
/* Builders — cord body                                                 */
/* ------------------------------------------------------------------ */

const SHELL_SEGMENTS = 32

/** Outer cord surface (the translucent shell), conus taper included. */
export function buildCordSurface(): THREE.BufferGeometry {
  const ys = sampleYs(CORD_TOP_Y, CORD_TIP_Y)
  const rings = ys.map((y) => {
    const { rx, rz } = cordRadiiAt(y)
    return ellipseRing(rx, rz, SHELL_SEGMENTS)
  })
  return loftRings(rings, ys, ys.map(cordCenterAt))
}

/** Central canal: the CSF column the gray commissure surrounds (plan §3 "Gray commissure + central canal X"). */
export function buildCentralCanal(): THREE.BufferGeometry {
  const ys = sampleYs(CORD_TOP_Y, CORD_TIP_Y, 6)
  const rings = ys.map((y) => ellipseRing(canalRadiusAt(y), canalRadiusAt(y), 12))
  return loftRings(rings, ys, ys.map(cordCenterAt))
}

/** Filum terminale: the thin thread continuing past the conus to the clip floor. */
export function buildFilum(): THREE.BufferGeometry {
  const ys = sampleYs(CORD_TIP_Y + 0.5, FILUM_TIP_Y, 1.4)
  const rings = ys.map(() => ellipseRing(0.32, 0.32, 8))
  return loftRings(rings, ys, ys.map(cordCenterAt))
}

/* ------------------------------------------------------------------ */
/* Builders — gray matter                                               */
/* ------------------------------------------------------------------ */

function loftHalfColumn(ringFn: (y: number) => Pt[], yTop: number, yBottom: number): THREE.BufferGeometry {
  const ys = sampleYs(yTop, yBottom)
  return loftRings(ys.map(ringFn), ys, ys.map(cordCenterAt))
}

/** Dorsal horn column (patient-LEFT; mirrorGeometry supplies the right). */
export function buildDorsalHorn(): THREE.BufferGeometry {
  return loftHalfColumn(dorsalHornRing, CORD_TOP_Y, CORD_TIP_Y + 4)
}

/** Ventral horn column (patient-LEFT). */
export function buildVentralHorn(): THREE.BufferGeometry {
  return loftHalfColumn(ventralHornRing, CORD_TOP_Y, CORD_TIP_Y + 4)
}

/** Gray-commissure half (patient-LEFT; the pair leaves the canal gap in the middle). */
export function buildCommissureHalf(): THREE.BufferGeometry {
  return loftHalfColumn(commissureHalfRing, CORD_TOP_Y, CORD_TIP_Y + 4)
}

/** Lateral horn column (patient-LEFT) — T1–L2 only (see lateralHornPresence). */
export function buildLateralHorn(): THREE.BufferGeometry {
  return loftHalfColumn(lateralHornRing, T1_Y + 6, L2_Y - 6)
}

/* ------------------------------------------------------------------ */
/* Builders — white-matter funiculi                                     */
/* ------------------------------------------------------------------ */

/**
 * Funniculus zones fill the white matter under the gray H. Each zone is a solid
 * polar-sector prism from the axis to the cord surface, so together they tile
 * the whole cross-section and the gray matter (drawn over them) is what
 * produces the histology reading. Posterior is split into the medial GRACILIS
 * (all levels) and the lateral CUNEATUS (T6-and-above ONLY — the teaching
 * point the sections must show below T6).
 */
const WEDGE_SAMPLES = 26

interface WedgeSpec {
  /** Angle span in the (x, z) cross-section, radians; φ = 0 at +x, π/2 at +z (anterior). */
  phi0: number
  phi1: number
  /** Inner radius rule: 'axis' (solid wedge) or 'medial' / 'lateral' (split posterior). */
  split?: 'medial' | 'lateral'
}

/** Half-width of the gracilis stripe (× rx) inside the posterior sector. */
export const GRACILIS_HALF_WIDTH = 0.17

function wedgeRing(y: number, spec: WedgeSpec, radialSamples: number): Pt[] {
  const { rx, rz } = cordRadiiAt(y)
  const outer: Pt[] = []
  const inner: Pt[] = []
  const stripe = GRACILIS_HALF_WIDTH * rx
  for (let i = 0; i <= radialSamples; i += 1) {
    const t = i / radialSamples
    const phi = spec.phi0 + (spec.phi1 - spec.phi0) * t
    const cos = Math.cos(phi)
    const sin = Math.sin(phi)
    // Ellipse radius at phi.
    const rEll = (rx * rz) / Math.sqrt((rz * cos) ** 2 + (rx * sin) ** 2)
    // Stripe boundary along this ray: |r·cosφ| = stripe → r = stripe/|cosφ|.
    // Rays near the dorsal midline (cosφ ≈ 0) never leave the stripe.
    const edge = Math.abs(cos) < 1e-6 ? Infinity : stripe / Math.abs(cos)
    let rOut = rEll
    let rIn = 0
    if (spec.split === 'medial') {
      // Gracilis: axis → stripe boundary (solid fan toward the midline).
      rOut = Math.min(rEll, edge)
    } else if (spec.split === 'lateral') {
      // Cuneatus: stripe boundary → cord surface (zero width on the midline).
      rIn = Math.min(rEll, edge)
    }
    outer.push([rOut * cos, rOut * sin])
    inner.push([rIn * cos, rIn * sin])
  }
  // Closed ring: out along the outer arc, back along the inner arc.
  return [...outer, ...inner.reverse()]
}

function loftWedge(spec: WedgeSpec, yTop: number, yBottom: number): THREE.BufferGeometry {
  const ys = sampleYs(yTop, yBottom)
  const rings = ys.map((y) => wedgeRing(y, spec, WEDGE_SAMPLES))
  return loftRings(rings, ys, ys.map(cordCenterAt))
}

/** Gracilis (posterior-medial funiculus, all levels). */
export function buildGracilis(): THREE.BufferGeometry {
  return loftWedge({ phi0: (215 * Math.PI) / 180, phi1: (325 * Math.PI) / 180, split: 'medial' }, CORD_TOP_Y, CORD_TIP_Y + 4)
}

/**
 * Cuneatus (posterior-lateral funiculus) — present T6-AND-ABOVE ONLY. The
 * taper ring at T6 closes the wedge so nothing of it exists below (the
 * spinal-geometry gate asserts exactly this).
 */
export function buildCuneatus(): THREE.BufferGeometry {
  return loftWedge({ phi0: (215 * Math.PI) / 180, phi1: (325 * Math.PI) / 180, split: 'lateral' }, CORD_TOP_Y, T6_Y - 4)
}

/** Lateral funiculus (both side wedges in one zone mesh). */
export function buildLateralFuniculus(): THREE.BufferGeometry {
  const a = loftWedge({ phi0: (-35 * Math.PI) / 180, phi1: (35 * Math.PI) / 180 }, CORD_TOP_Y, CORD_TIP_Y + 4)
  const b = loftWedge({ phi0: (145 * Math.PI) / 180, phi1: (215 * Math.PI) / 180 }, CORD_TOP_Y, CORD_TIP_Y + 4)
  return mergeGeometries([a, b])
}

/** Anterior funiculus. */
export function buildAnteriorFuniculus(): THREE.BufferGeometry {
  return loftWedge({ phi0: (35 * Math.PI) / 180, phi1: (145 * Math.PI) / 180 }, CORD_TOP_Y, CORD_TIP_Y + 4)
}

/** Minimal geometry merge (positions + indices), enough for zone meshes. */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertexCount = 0
  let indexCount = 0
  for (const g of geometries) {
    vertexCount += g.getAttribute('position').count
    indexCount += g.getIndex()?.count ?? 0
  }
  const positions = new Float32Array(vertexCount * 3)
  const indices = new Uint32Array(indexCount)
  let vo = 0
  let io = 0
  for (const g of geometries) {
    const pos = g.getAttribute('position')
    positions.set(pos.array as Float32Array, vo * 3)
    const idx = g.getIndex()
    if (idx) {
      for (let i = 0; i < idx.count; i += 1) indices[io + i] = idx.array[i] + vo
      io += idx.count
    }
    vo += pos.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  out.setIndex(new THREE.BufferAttribute(indices, 1))
  out.computeVertexNormals()
  return out
}

/* ------------------------------------------------------------------ */
/* Builders — named gray nuclei (level-restricted columns)              */
/* ------------------------------------------------------------------ */

/** Where a named column sits in the local cross-section at world y. */
export interface NamedColumnSpec {
  /** Local (x, z) center; x is the patient-LEFT side (mirror supplies right). */
  at: (y: number) => Pt
  /** Column radius (au) at y. */
  radius: (y: number) => number
  yTop: number
  yBottom: number
}

function dorsalAxisPoint(y: number, t: number): Pt {
  const { rx, rz } = cordRadiiAt(y)
  const g = grayTemplateAt(y)
  const baseX = g.commissureHalfWidth * rx
  const baseZ = -g.commissureHalfDepth * rz
  const tipX = baseX + g.dorsalLateralShift * rx
  const tipZ = -g.dorsalReach * rz
  return [baseX + (tipX - baseX) * t, baseZ + (tipZ - baseZ) * t]
}

/** Thin column along y — the shape every named nucleus resolves to. */
export function buildNamedColumn(spec: NamedColumnSpec): THREE.BufferGeometry {
  const ys = sampleYs(spec.yTop, spec.yBottom, 3.7)
  const rings = ys.map((y) => {
    // Floor 0.18 au so every named column still paints where the cord tapers
    // (below this the vertex-exact slicer drops the loop as a sliver).
    const r = Math.max(spec.radius(y), 0.18)
    return ellipseRing(r, r, 10)
  })
  const centers = ys.map((y) => {
    const [x, z] = spec.at(y)
    const c = cordCenterAt(y)
    return { x: c.x + x, z: c.z + z }
  })
  return loftRings(rings, ys, centers)
}

/**
 * Named gray columns (plan §3, Nolte/Blumenfeld/Neuroscience Online Ch.3).
 * Keys are the record-id SLUG SUFFIXES the spinal-data teammate authors; the
 * record mapping (src/geometry/spinalParts.ts) matches ids alias-tolerantly.
 */
export const NAMED_GRAY_COLUMNS: Record<string, NamedColumnSpec> = {
  'marginal-zone': { // Rexed I — the superficial dorsal tip
    at: (y) => dorsalAxisPoint(y, 1.02),
    radius: (y) => 0.05 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
  'substantia-gelatinosa': { // Rexed II
    at: (y) => dorsalAxisPoint(y, 0.82),
    radius: (y) => 0.07 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
  'nucleus-proprius': { // Rexed III–IV
    at: (y) => dorsalAxisPoint(y, 0.55),
    radius: (y) => 0.09 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
  'rexed-v-vi': { // deep dorsal horn base
    at: (y) => dorsalAxisPoint(y, 0.3),
    radius: (y) => 0.08 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
  'clarkes-nucleus': { // C8–L3, base of the dorsal horn, medial
    at: (y) => {
      const { rx, rz } = cordRadiiAt(y)
      return [grayTemplateAt(y).commissureHalfWidth * rx * 0.7, -grayTemplateAt(y).commissureHalfDepth * rz - 0.1 * rz]
    },
    radius: (y) => 0.055 * cordRadiiAt(y).rx,
    yTop: C8_Y, yBottom: L3_Y - 4,
  },
  'intermediolateral': { // T1–L2 = the lateral horn column
    at: (y) => {
      const { rx, rz } = cordRadiiAt(y)
      return [(grayTemplateAt(y).commissureHalfWidth + 0.14) * rx * 1.2, -0.05 * rz]
    },
    radius: (y) => 0.055 * cordRadiiAt(y).rx * lateralHornPresence(y) + 0.01,
    yTop: T1_Y + 4, yBottom: L2_Y - 4,
  },
  'sacral-parasympathetic': { // S2–S4
    at: (y) => {
      const { rx, rz } = cordRadiiAt(y)
      return [(grayTemplateAt(y).commissureHalfWidth + 0.1) * rx, 0.05 * rz]
    },
    // Floor 0.25 au: the cord tapers caudally, and a sliver this thin would
    // collapse in the vertex-exact slicer and never paint (S2–S4 is a
    // teaching point — Onuf's nucleus must READ at S3).
    radius: (y) => Math.max(0.25, 0.06 * cordRadiiAt(y).rx),
    yTop: S2_Y + 4, yBottom: S4_Y - 4,
  },
  'intermediate-zone': { // Rexed VII between the horns
    at: (y) => {
      const { rx } = cordRadiiAt(y)
      return [(grayTemplateAt(y).commissureHalfWidth + 0.12) * rx, 0]
    },
    radius: (y) => 0.09 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
  'lmn-motor-columns': { // Rexed IX ventral motor columns
    at: (y) => {
      const { rx, rz } = cordRadiiAt(y)
      const g = grayTemplateAt(y)
      return [(g.commissureHalfWidth + g.ventralHalfWidth * 0.5) * rx, (g.ventralReach * 0.4) * rz]
    },
    radius: (y) => 0.08 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
  'rexed-viii': { // ventromedial intermediate zone
    at: (y) => {
      const { rx, rz } = cordRadiiAt(y)
      return [0.12 * rx, (grayTemplateAt(y).ventralReach * 0.25) * rz]
    },
    radius: (y) => 0.07 * cordRadiiAt(y).rx,
    yTop: CORD_TOP_Y, yBottom: CORD_TIP_Y + 6,
  },
}

/** Build one named column (returns null for unknown keys). */
export function buildNamedGrayColumn(key: string): THREE.BufferGeometry | null {
  const spec = NAMED_GRAY_COLUMNS[key]
  return spec ? buildNamedColumn(spec) : null
}

/* ------------------------------------------------------------------ */
/* Builders — roots                                                     */
/* ------------------------------------------------------------------ */

/** Local attachment of a root on the cord surface at world y (patient-LEFT). */
function rootAnchor(y: number, role: 'dorsal' | 'ventral'): THREE.Vector3 {
  const { rx, rz } = cordRadiiAt(y)
  const c = cordCenterAt(y)
  const zSign = role === 'dorsal' ? -1 : 1
  return new THREE.Vector3(c.x + 0.62 * rx, y, c.z + zSign * 0.42 * rz)
}

/**
 * One root stub for one segment and side: a short tube leaving the cord
 * laterally (dorsal roots angle dorsally, ventral roots ventrally). The
 * root-entry zone in the 2D section is these stubs crossing the plane.
 * `radius` lets record bodies sit slightly inside the root-bundle tubes
 * (default 0.34 au) so coincident surfaces never z-fight.
 */
export function buildRootStub(
  segmentId: string,
  role: 'dorsal' | 'ventral',
  radius = 0.34,
): THREE.BufferGeometry {
  const seg = SPINAL_SEGMENTS.find((s) => s.id === segmentId)
  if (!seg) return new THREE.BufferGeometry()
  const { rx } = cordRadiiAt(seg.y)
  const a = rootAnchor(seg.y, role)
  const zSign = role === 'dorsal' ? -1 : 1
  const end = new THREE.Vector3(
    a.x + 2.2 * rx + 6,
    seg.y + zSign * 1.2,
    a.z + zSign * 3.2,
  )
  const curve = new THREE.CatmullRomCurve3([
    a,
    new THREE.Vector3((a.x + end.x) / 2, (a.y + end.y) / 2, a.z + zSign * 1.6),
    end,
  ])
  return new THREE.TubeGeometry(curve, 8, radius, 8, false)
}

/**
 * A spinal-segment record's body: a thin inset band of the cord shell across
 * one segment tile (half-height derived from the neighbouring level anchors,
 * clamped 2…5.5 au), scaled 0.97 in x/z so it reads as a level marker UNDER
 * the translucent shell without z-fighting it.
 */
export function buildSegmentBand(segmentId: string): THREE.BufferGeometry | null {
  const idx = SPINAL_SEGMENTS.findIndex((s) => s.id === segmentId)
  if (idx < 0) return null
  const seg = SPINAL_SEGMENTS[idx]
  const yNext = idx + 1 < SPINAL_SEGMENTS.length ? SPINAL_SEGMENTS[idx + 1].y : seg.y - 8
  const yPrev = idx > 0 ? SPINAL_SEGMENTS[idx - 1].y : seg.y + 8
  const half = Math.max(2, Math.min(5.5, (yPrev - yNext) / 4))
  // A ring landing exactly on seg.y makes the transverse slice at the
  // segment's own level vertex-exact (the slicer is strict by contract) and
  // the band paints nothing there. Nudge any mid-grid ring clear of the plane.
  const ys = sampleYs(seg.y + half, seg.y - half, 2.5).map((y) =>
    Math.abs(y - seg.y) < 0.6 ? y + 0.6 : y,
  )
  const rings = ys.map((y) => {
    const { rx, rz } = cordRadiiAt(y)
    return ellipseRing(rx * 0.97, rz * 0.97, SHELL_SEGMENTS)
  })
  return loftRings(rings, ys, ys.map(cordCenterAt))
}

/**
 * Conus medullaris core: the tapered terminal column (below the lumbar
 * enlargement, y −343…−383) drawn inset (0.9×) under the cord shell, so the
 * conus record has its own clickable body without coincident surfaces.
 */
export function buildConusCore(): THREE.BufferGeometry {
  const ys = sampleYs(L3_Y + 3, CORD_TIP_Y, 3)
  const rings = ys.map((y) => {
    const { rx, rz } = cordRadiiAt(y)
    return ellipseRing(rx * 0.9, rz * 0.9, 12)
  })
  return loftRings(rings, ys, ys.map(cordCenterAt))
}

/**
 * Cauda equina: the lumbar and sacral roots (L2–S1 span) continuing caudally
 * alongside the conus — the coronal section's segmental-root pattern plus the
 * cauda-equina record. One merged thread bundle per side (mirror for the other).
 */
export function buildCaudaEquina(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (const seg of SPINAL_SEGMENTS) {
    if (seg.y > L2_Y + 4) continue
    if (seg.y < S4_Y) continue
    const { rx } = cordRadiiAt(seg.y)
    // Deterministic alternation: segments leave dorsally or ventrally by name.
    const role: 'dorsal' | 'ventral' = seg.id.length % 2 === 0 ? 'dorsal' : 'ventral'
    const a = rootAnchor(seg.y, role)
    const start = new THREE.Vector3(a.x + 0.4 * rx, seg.y, a.z)
    const end = new THREE.Vector3(start.x + 2.4, Math.max(seg.y - 46, FILUM_TIP_Y + 1), start.z + 0.8)
    const curve = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(start.x + 1.4, seg.y - 18, start.z + 0.4),
      end,
    ])
    parts.push(new THREE.TubeGeometry(curve, 10, 0.22, 6, false))
  }
  return mergeGeometries(parts)
}

/* ------------------------------------------------------------------ */
/* Cross-section probes (used by the gates and nothing else)             */
/* ------------------------------------------------------------------ */

/**
 * Measure the x extent (width) and z extent (depth) of a geometry's vertices
 * within ±halfWindow au of world y, in MILLIMETERS. Returns null when no
 * vertex is near the level.
 */
export function measureCrossSection(
  geometry: THREE.BufferGeometry,
  y: number,
  halfWindow = 1.6,
): { widthMm: number; depthMm: number; vertexCount: number } | null {
  const pos = geometry.getAttribute('position')
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let count = 0
  for (let i = 0; i < pos.count; i += 1) {
    const vy = pos.getY(i)
    if (Math.abs(vy - y) > halfWindow) continue
    count += 1
    minX = Math.min(minX, pos.getX(i))
    maxX = Math.max(maxX, pos.getX(i))
    minZ = Math.min(minZ, pos.getZ(i))
    maxZ = Math.max(maxZ, pos.getZ(i))
  }
  if (count === 0) return null
  return {
    widthMm: (maxX - minX) * AU_TO_MM,
    depthMm: (maxZ - minZ) * AU_TO_MM,
    vertexCount: count,
  }
}

/** Axis-aligned bounds of a geometry in canonical units. */
export function geometryBounds(geometry: THREE.BufferGeometry): {
  minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number
} {
  geometry.computeBoundingBox()
  const b = geometry.boundingBox!
  return {
    minX: b.min.x, maxX: b.max.x,
    minY: b.min.y, maxY: b.max.y,
    minZ: b.min.z, maxZ: b.max.z,
  }
}
