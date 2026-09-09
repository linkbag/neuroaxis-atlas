/**
 * contours.ts — pure mesh-plane contour extraction (SECTION_SYNC_PLAN §2.2,
 * section-canvas task).
 *
 * Given a triangle mesh (positions + indices in canonical atlas space) and a
 * plane {axis, value}, extract the closed 2D loops where the mesh surface
 * crosses the plane:
 *
 *   1. plane-band filter: a triangle participates only when its vertices
 *      straddle the band around the plane (|d| <= PLANE_BAND counts as
 *      "on the plane"),
 *   2. per-triangle segment-plane intersection: each crossing triangle
 *      contributes one 2D segment in the plane frame,
 *   3. chaining: quantized-endpoint hashing joins segments into closed loops,
 *   4. Douglas–Peucker simplification (default epsilon 0.15 au) so the
 *      polygon path stays light for the 2D canvas.
 *
 * This module is intentionally dependency-free (no three.js, no DOM): it
 * runs verbatim inside the section worker (contourWorker.ts) and inside the
 * Node smoke test (scripts/section-contour-smoke.mjs) that proves the
 * chaining math on a synthetic cube before integration.
 *
 * Coordinate frames (plan §2.2 orientation conventions):
 *   transverse (plane y): u = x (patient-left → image right), v = z (anterior up)
 *   sagittal   (plane x): u = z (anterior right),               v = y (superior up)
 *   coronal    (plane z): u = x (patient-left → image right),   v = y (superior up)
 *
 * Units: atlas units (au ≈ 1.2 mm). All outputs are flat `[u0, v0, u1, v1, …]`
 * arrays so the worker can post them with structured clone without per-point
 * object churn.
 */

export type PlaneAxis = 'x' | 'y' | 'z'

export interface PlaneSpec {
  axis: PlaneAxis
  /** Plane position along the axis, in atlas units. */
  value: number
}

/**
 * Half-width of the plane band treated as "on the plane" (au). Strictly ZERO:
 * only vertices lying exactly on the plane (d === 0, exact in f64 for
 * quantized plane values) count as touching. A positive band would treat
 * near-plane vertices as endpoints, and the segments terminating at DIFFERENT
 * near-plane vertices disagree by up to the band width — fragmenting every
 * loop that crosses a vertex-neighborhood (measured on the pons mesh:
 * ~0.005 au gaps breaking the slice into open chains).
 */
export const PLANE_BAND = 0

/** Default Douglas–Peucker simplification tolerance (au). */
export const DEFAULT_SIMPLIFY_EPSILON = 0.15

const AXIS_INDEX: Record<PlaneAxis, number> = { x: 0, y: 1, z: 2 }

/** Plane-frame world-axis indices: [u, v] per plane axis (see file header). */
const PLANE_FRAME: Record<PlaneAxis, [number, number]> = {
  y: [0, 2],
  x: [2, 1],
  z: [0, 1],
}

export interface Segment2 {
  /** [u, v] in the plane frame. */
  a: [number, number]
  b: [number, number]
}

/** Axis-aligned bounds of a parts vertices (used for bbox culling). */
export interface PartBounds {
  min: number[]
  max: number[]
}

/** Scan a positions array once and return per-axis min/max. */
export function partBounds(positions: Float32Array, count = positions.length / 3): PartBounds {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (let i = 0; i < count; i++) {
    const o = i * 3
    for (let c = 0; c < 3; c++) {
      const value = positions[o + c]
      if (value < min[c]) min[c] = value
      if (value > max[c]) max[c] = value
    }
  }
  return { min, max }
}

/** Whether a plane can intersect a bbox (cull a part before slicing it). */
export function boundsMayCut(bounds: PartBounds, plane: PlaneSpec): boolean {
  const index = AXIS_INDEX[plane.axis]
  return plane.value >= bounds.min[index] && plane.value <= bounds.max[index]
}

/**
 * Per-triangle plane intersection: returns the 2D segment for every triangle
 * that straddles the plane band. Triangles entirely inside the band are
 * skipped (coplanar faces would otherwise produce spurious rings), and
 * "touching" vertices (|d| <= band) terminate a segment exactly.
 */
export function sliceToSegments(
  positions: Float32Array,
  indices: Uint32Array,
  plane: PlaneSpec,
  band = PLANE_BAND,
): Segment2[] {
  const axisIndex = AXIS_INDEX[plane.axis]
  const [uIndex, vIndex] = PLANE_FRAME[plane.axis]
  const value = plane.value
  const segments: Segment2[] = []

  const count = indices.length
  for (let t = 0; t < count; t += 3) {
    const i0 = indices[t] * 3
    const i1 = indices[t + 1] * 3
    const i2 = indices[t + 2] * 3
    const d0 = positions[i0 + axisIndex] - value
    const d1 = positions[i1 + axisIndex] - value
    const d2 = positions[i2 + axisIndex] - value

    // Fast reject: all three strictly on one side.
    if ((d0 >= band && d1 >= band && d2 >= band) || (d0 <= -band && d1 <= -band && d2 <= -band)) {
      continue
    }
    // Coplanar triangle (entirely within the band): no stable cross-section.
    if (d0 >= -band && d0 <= band && d1 >= -band && d1 <= band && d2 >= -band && d2 <= band) {
      continue
    }

    // Classify each vertex: +1 above, -1 below, 0 within the band.
    const sign = (d: number): number => (d > band ? 1 : d < -band ? -1 : 0)
    const s0 = sign(d0)
    const s1 = sign(d1)
    const s2 = sign(d2)

    const points: [number, number][] = []
    const offsets = [i0, i1, i2] as const
    const dists = [d0, d1, d2] as const
    const signs = [s0, s1, s2] as const

    for (let e = 0; e < 3; e++) {
      const p = offsets[e]
      const q = offsets[(e + 1) % 3]
      const dp = dists[e]
      const dq = dists[(e + 1) % 3]
      const sp = signs[e]
      const sq = signs[(e + 1) % 3]
      let point: [number, number] | null = null
      if (sp * sq < 0) {
        // Strict crossing: linear interpolation at the plane.
        const t0 = dp / (dp - dq)
        const ax = positions[p + uIndex]
        const ay = positions[p + vIndex]
        point = [ax + t0 * (positions[q + uIndex] - ax), ay + t0 * (positions[q + vIndex] - ay)]
      } else if (sp === 0 && sq !== 0) {
        point = [positions[p + uIndex], positions[p + vIndex]]
      } else if (sq === 0 && sp !== 0) {
        point = [positions[q + uIndex], positions[q + vIndex]]
      }
      if (point !== null) points.push(point)
    }

    if (points.length >= 2) {
      // Degenerate zero-length segment (two touches at the same vertex):
      // drop it — chaining dedupe would discard it anyway.
      const [a, b] = points
      const du = b[0] - a[0]
      const dv = b[1] - a[1]
      if (du * du + dv * dv > 1e-12) segments.push({ a, b })
    }
  }
  return segments
}

/* ------------------------------------------------------------------ */
/* Chaining                                                            */
/* ------------------------------------------------------------------ */

/** Quantization cell for endpoint hashing (au ≈ 0.12 µm — far below mesh
 *  resolution, far above float64 interpolation noise). */
export const CHAIN_QUANT = 1e-4

function quantize(value: number): number {
  return Math.round(value / CHAIN_QUANT)
}

function keyOf(qu: number, qv: number): number {
  // Both quadrants fit in ±1e6 cells; one combined integer key per point.
  return (qu + 1000000) * 4000001 + (qv + 1000000)
}

/** Quantized endpoint cells of one segment (for join lookups). */
interface SegCells {
  quA: number
  qvA: number
  quB: number
  qvB: number
}

/**
 * Join segments into closed loops. Segments that fail to close (numerical
 * artifacts in open meshes) are discarded; the count is returned for stats.
 */
export function chainSegments(
  segments: readonly Segment2[],
): { loops: [number, number][][]; openChainCount: number } {
  const loops: [number, number][][] = []
  const n = segments.length
  if (n === 0) return { loops, openChainCount: 0 }

  // Dedupe geometrically identical segments: voxel meshes carry duplicated
  // vertices along seams, so one crossing edge is emitted twice (once per
  // face using it). Keeping both makes the walk bounce back along its own
  // path, fragmenting the loop into slivers — so only the first copy runs.
  // (String keys: a single integer key for two cells exceeds 2^53 and would
  // collide distinct pairs.)
  const seenPairs = new Set<string>()
  const kept: Segment2[] = []
  for (const seg of segments) {
    const qa = [quantize(seg.a[0]), quantize(seg.a[1])]
    const qb = [quantize(seg.b[0]), quantize(seg.b[1])]
    const lo = qa[0] < qb[0] || (qa[0] === qb[0] && qa[1] < qb[1]) ? qa : qb
    const hi = lo === qa ? qb : qa
    const pair = `${lo[0]},${lo[1]}|${hi[0]},${hi[1]}`
    if (seenPairs.has(pair)) continue
    seenPairs.add(pair)
    kept.push(seg)
  }
  if (kept.length < n) {
    return chainSegments(kept) // retry on the deduped set
  }

  // Exact-cell index plus per-segment cell records.
  const endIndex = new Map<number, number[]>()
  const cellsOf: SegCells[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const seg = segments[i]
    const qa = { qu: quantize(seg.a[0]), qv: quantize(seg.a[1]) }
    const qb = { qu: quantize(seg.b[0]), qv: quantize(seg.b[1]) }
    cellsOf[i] = { quA: qa.qu, qvA: qa.qv, quB: qb.qu, qvB: qb.qv }
    const keyA = keyOf(qa.qu, qa.qv)
    const keyB = keyOf(qb.qu, qb.qv)
    let list = endIndex.get(keyA)
    if (!list) endIndex.set(keyA, (list = []))
    list.push(i)
    if (keyA !== keyB) {
      let listB = endIndex.get(keyB)
      if (!listB) endIndex.set(keyB, (listB = []))
      listB.push(i)
    }
  }

  const used = new Uint8Array(n)
  let openChainCount = 0

  /** Find an unused segment with an endpoint in the exact cell, falling back
   *  to the 8 neighboring cells (shared corners rounded to adjacent cells).
   *  Returns the segment plus which endpoint to APPEND (the far endpoint); a
   *  match at `a` appends `b` (index 1) and vice versa. */
  function findNext(qu: number, qv: number): { segment: number; append: 0 | 1 } | null {
    const cells: Array<[number, number]> = [[qu, qv]]
    for (let du = -1; du <= 1; du++) {
      for (let dv = -1; dv <= 1; dv++) {
        if (du === 0 && dv === 0) continue
        cells.push([qu + du, qv + dv])
      }
    }
    for (const [cu, cv] of cells) {
      const list = endIndex.get(keyOf(cu, cv))
      if (!list) continue
      for (const candidate of list) {
        if (used[candidate]) continue
        const c = cellsOf[candidate]
        if (c.quA === cu && c.qvA === cv) return { segment: candidate, append: 1 }
        if (c.quB === cu && c.qvB === cv) return { segment: candidate, append: 0 }
      }
    }
    return null
  }

  for (let start = 0; start < n; start++) {
    if (used[start]) continue
    used[start] = 1
    const seg = segments[start]
    const startQu = cellsOf[start].quA
    const startQv = cellsOf[start].qvA

    // Seed with both endpoints of the starting segment; junction points are
    // the far endpoints of joined segments, so the initial `b` must be here.
    const loop: [number, number][] = [seg.a, seg.b]
    let currentQu = cellsOf[start].quB
    let currentQv = cellsOf[start].qvB
    let closed = currentQu === startQu && currentQv === startQv

    // At most one append per segment, so n iterations close every loop.
    for (let guard = 0; guard < n && !closed; guard++) {
      const next = findNext(currentQu, currentQv)
      if (next === null) break
      used[next.segment] = 1
      const segN = segments[next.segment]
      // `append` is the index of the segment's far endpoint (the one we move
      // to); the near endpoint is where we currently stand.
      const far = next.append === 1 ? segN.b : segN.a
      currentQu = quantize(far[0])
      currentQv = quantize(far[1])
      if (currentQu === startQu && currentQv === startQv) {
        closed = true
        break
      }
      loop.push(far)
    }
    if (closed && loop.length >= 3) {
      loops.push(loop)
    } else {
      openChainCount += 1
    }
  }

  return { loops, openChainCount }
}

/* ------------------------------------------------------------------ */
/* Douglas–Peucker (closed-loop aware)                                 */
/* ------------------------------------------------------------------ */

/** Squared distance from point p to segment a-b. */
function pointSegmentDistSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const lenSq = abx * abx + aby * aby
  let t = lenSq > 0 ? (apx * abx + apy * aby) / lenSq : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const cx = ax + t * abx
  const cy = ay + t * aby
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy
}

/**
 * Iterative Douglas–Peucker on an open polyline; keeps first/last points.
 */
function simplifyPolyline(
  points: readonly [number, number][],
  epsilon: number,
  keep: boolean[],
): void {
  // stack of [start, end] index ranges to process
  const stack: Array<[number, number]> = [[0, points.length - 1]]
  keep[0] = true
  keep[points.length - 1] = true
  const epsSq = epsilon * epsilon
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number]
    if (end - start < 2) continue
    const ax = points[start][0]
    const ay = points[start][1]
    const bx = points[end][0]
    const by = points[end][1]
    let maxDist = -1
    let maxIndex = -1
    for (let i = start + 1; i < end; i++) {
      const d = pointSegmentDistSq(points[i][0], points[i][1], ax, ay, bx, by)
      if (d > maxDist) {
        maxDist = d
        maxIndex = i
      }
    }
    if (maxDist > epsSq) {
      keep[maxIndex] = true
      stack.push([start, maxIndex] as [number, number])
      stack.push([maxIndex, end] as [number, number])
    }
  }
}

/**
 * Simplify a closed loop: split at two far-apart pivot points so the closing
 * edge participates, then DP each half. Returns the simplified loop without
 * the duplicated closing point (the caller closes via closePath()).
 */
export function simplifyLoop(
  points: readonly [number, number][],
  epsilon = DEFAULT_SIMPLIFY_EPSILON,
): [number, number][] {
  const n = points.length
  if (n <= 3) return points.map((p) => [p[0], p[1]] as [number, number])

  let i1 = 1
  let bestD = -1
  for (let i = 1; i < n; i++) {
    const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2
    if (d > bestD) {
      bestD = d
      i1 = i
    }
  }
  let i2 = 0
  bestD = -1
  for (let i = 0; i < n; i++) {
    if (i === i1) continue
    const d = (points[i][0] - points[i1][0]) ** 2 + (points[i][1] - points[i1][1]) ** 2
    if (d > bestD) {
      bestD = d
      i2 = i
    }
  }

  // Polyline A: i1 → i2 (wrapping forward); Polyline B: i2 → i1 (wrapping).
  const chainA: [number, number][] = []
  const chainB: [number, number][] = []
  let i = i1
  while (true) {
    chainA.push(points[i])
    if (i === i2) break
    i = (i + 1) % n
  }
  i = i2
  while (true) {
    chainB.push(points[i])
    if (i === i1) break
    i = (i + 1) % n
  }

  const keepA = new Array<boolean>(chainA.length).fill(false)
  const keepB = new Array<boolean>(chainB.length).fill(false)
  simplifyPolyline(chainA, epsilon, keepA)
  simplifyPolyline(chainB, epsilon, keepB)

  const out: [number, number][] = []
  for (let k = 0; k < chainA.length; k++) if (keepA[k]) out.push(chainA[k])
  for (let k = 1; k < chainB.length - 1; k++) if (keepB[k]) out.push(chainB[k])
  return out
}

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

export interface SectionSliceResult {
  /** Closed loops per part, each a flat [u0, v0, u1, v1, …] path. */
  loops: number[][]
  trianglesTested: number
  segmentCount: number
  openChainCount: number
}

/**
 * Full contour extraction for one part: slice → chain → simplify.
 * The plane frame is documented at the top of the file; `loops` entries are
 * flat number arrays (u0, v0, u1, v1, …) ready for canvas Path2D use.
 */
export function extractContours(
  positions: Float32Array,
  indices: Uint32Array,
  plane: PlaneSpec,
  options: { epsilon?: number; band?: number } = {},
): SectionSliceResult {
  const segments = sliceToSegments(positions, indices, plane, options.band)
  const { loops, openChainCount } = chainSegments(segments)
  const epsilon = options.epsilon ?? DEFAULT_SIMPLIFY_EPSILON
  const flat: number[][] = []
  for (const loop of loops) {
    const simplified = simplifyLoop(loop, epsilon)
    // A sliver loop can collapse to 1–2 points (zero-area artifacts, e.g.
    // where the plane grazes a tangent surface): not drawable — drop it.
    if (simplified.length < 3) continue
    const path: number[] = new Array(simplified.length * 2)
    for (let k = 0; k < simplified.length; k++) {
      path[k * 2] = simplified[k][0]
      path[k * 2 + 1] = simplified[k][1]
    }
    flat.push(path)
  }
  return {
    loops: flat,
    trianglesTested: indices.length / 3,
    segmentCount: segments.length,
    openChainCount,
  }
}

/** Signed shoelace area of a flat [u0,v0,…] path (absolute value). */
export function polygonArea(path: readonly number[]): number {
  const count = path.length / 2
  if (count < 3) return 0
  let sum = 0
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count
    sum += path[i * 2] * path[j * 2 + 1] - path[j * 2] * path[i * 2 + 1]
  }
  return Math.abs(sum) / 2
}

/**
 * Even-odd point-in-polygon test across a set of flat loops of one part.
 * A point is inside the part when it lies inside an odd number of its loops
 * (the same rule the canvas uses for its even-odd fill).
 */
export function pointInLoops(loops: readonly number[][], px: number, py: number): boolean {
  let inside = false
  for (const path of loops) {
    const count = path.length / 2
    for (let i = 0, j = count - 1; i < count; j = i++) {
      const xi = path[i * 2]
      const yi = path[i * 2 + 1]
      const xj = path[j * 2]
      const yj = path[j * 2 + 1]
      const crosses = yi > py !== yj > py
      if (crosses) {
        const xCross = xi + ((py - yi) * (xj - xi)) / (yj - yi)
        if (xCross > px) inside = !inside
      }
    }
  }
  return inside
}
