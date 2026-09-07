/**
 * NeuroAxis SDF kernel — mesh statistics and QA samplers.
 *
 * Everything the plan's acceptance criteria need on a baked mesh
 * (REALISM_PLAN §6 containment rule: >= 98% of vertices with envelope
 * SDF(x) <= +0.8 au):
 *   - triangle/vertex counts, bbox
 *   - edge-manifold ratio (edges with exactly 2 incident faces / all edges)
 *   - degenerate-face ratio (zero-area faces and collapsed index triples)
 *   - containmentFraction: 'fraction of sample points with SDF(x) < margin'
 *
 * Plain Node ESM, zero dependencies.
 */

/** Number of triangles in an index buffer. */
export function triCount(indices) {
  return indices ? indices.length / 3 : 0;
}

/** Number of vertices in a position buffer (xyz triplets). */
export function vertexCount(positions) {
  return positions ? positions.length / 3 : 0;
}

/** Axis-aligned bounds -> {min, max, center, size} as plain arrays. */
export function bounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a += 1) {
      const v = positions[i + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  if (!Number.isFinite(min[0])) {
    return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], size: [0, 0, 0] };
  }
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return {
    min, max,
    center: [min[0] + size[0] / 2, min[1] + size[1] / 2, min[2] + size[2] / 2],
    size,
  };
}

/** Signed volume of a closed mesh (positive when triangles face outward). */
export function signedVolume(positions, indices) {
  let vol6 = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t], b = 3 * indices[t + 1], c = 3 * indices[t + 2];
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2];
    const e1x = positions[b] - ax, e1y = positions[b + 1] - ay, e1z = positions[b + 2] - az;
    const e2x = positions[c] - ax, e2y = positions[c + 1] - ay, e2z = positions[c + 2] - az;
    vol6 += ax * (e1y * e2z - e1z * e2y)
      + ay * (e1z * e2x - e1x * e2z)
      + az * (e1x * e2y - e1y * e2x);
  }
  return vol6 / 6;
}

/** Total surface area. */
export function surfaceArea(positions, indices) {
  let area = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t], b = 3 * indices[t + 1], c = 3 * indices[t + 2];
    const e1x = positions[b] - positions[a];
    const e1y = positions[b + 1] - positions[a + 1];
    const e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a];
    const e2y = positions[c + 1] - positions[a + 1];
    const e2z = positions[c + 2] - positions[a + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }
  return area;
}

/**
 * Edge-manifold ratio: share of undirected edges with exactly two incident
 * triangles. A fully closed mesh scores 1.0; boundary (1) and non-manifold
 * (>2) edges lower it. Note: SurfaceNets' ambiguous-face configuration
 * (alternating corner signs) yields index pairs shared by 4 quads, which
 * lowers this ratio without opening holes — judge closure with
 * watertightness() below.
 */
export function edgeManifoldRatio(positions, indices) {
  const vc = vertexCount(positions);
  if (vc === 0 || indices.length === 0) return 0;
  const counts = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e += 1) {
      const u = indices[t + e], v = indices[t + ((e + 1) % 3)];
      if (u === v) continue;
      const key = u < v ? u * vc + v : v * vc + u;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let manifold = 0;
  for (const c of counts.values()) if (c === 2) manifold += 1;
  return counts.size > 0 ? manifold / counts.size : 0;
}

/**
 * Watertightness: an index buffer is closed (no holes) when no edge has an
 * odd number of incident triangles (1 = boundary hole; 3 = pinch).
 * `boundaryEdges`/`oddEdges` quantify violations; `closed` is the pass flag.
 */
export function watertightness(positions, indices) {
  const vc = vertexCount(positions);
  if (vc === 0 || indices.length === 0) return { closed: false, boundaryEdges: 0, oddEdges: 0 };
  const counts = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e += 1) {
      const u = indices[t + e], v = indices[t + ((e + 1) % 3)];
      if (u === v) continue;
      const key = u < v ? u * vc + v : v * vc + u;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let boundary = 0;
  let odd = 0;
  for (const c of counts.values()) {
    if (c === 1) boundary += 1;
    if (c % 2 === 1) odd += 1;
  }
  return { closed: boundary === 0 && odd === 0, boundaryEdges: boundary, oddEdges: odd };
}

/**
 * Degenerate-face ratio: faces that are index-collapsed (repeated vertex)
 * or numerically zero-area (<= eps). Healthy SurfaceNets output is ~0.
 */
export function degenerateFaceRatio(positions, indices, eps = 1e-12) {
  const total = indices.length / 3;
  if (total === 0) return 0;
  let bad = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    if (a === b || b === c || a === c) { bad += 1; continue; }
    const pa = 3 * a, pb = 3 * b, pc = 3 * c;
    const e1x = positions[pb] - positions[pa];
    const e1y = positions[pb + 1] - positions[pa + 1];
    const e1z = positions[pb + 2] - positions[pa + 2];
    const e2x = positions[pc] - positions[pa];
    const e2y = positions[pc + 1] - positions[pa + 1];
    const e2z = positions[pc + 2] - positions[pa + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    if (nx * nx + ny * ny + nz * nz <= eps) bad += 1;
  }
  return bad / total;
}

/**
 * Containment sampler (REALISM_PLAN §6 QA): the fraction of sample points
 * with SDF(x) < margin. Samples the mesh's vertices by default.
 *
 * @param {(x,y,z)=>number} sdf  envelope signed distance (negative inside)
 * @param {Float32Array} positions  xyz triplets
 * @param {object} [opts] { margin = 0.8, stride = 1 }
 * @returns {{ fraction: number, samples: number, inside: number }}
 */
export function containmentFraction(sdf, positions, opts = {}) {
  const margin = opts.margin ?? 0.8;
  const stride = Math.max(1, opts.stride ?? 1);
  const vc = vertexCount(positions);
  let samples = 0;
  let inside = 0;
  for (let vi = 0; vi < vc; vi += stride) {
    const d = sdf(positions[3 * vi], positions[3 * vi + 1], positions[3 * vi + 2]);
    samples += 1;
    if (d < margin) inside += 1;
  }
  return { fraction: samples > 0 ? inside / samples : 1, samples, inside };
}

/**
 * One-call QA report for a baked mesh.
 * @returns {object} stats + optional containment
 */
export function meshReport(positions, indices, opts = {}) {
  const b = bounds(positions);
  const report = {
    vertexCount: vertexCount(positions),
    triCount: triCount(indices),
    bbox: { min: b.min, max: b.max },
    centroid: b.center,
    size: b.size,
    edgeManifoldRatio: edgeManifoldRatio(positions, indices),
    watertight: watertightness(positions, indices),
    degenerateFaceRatio: degenerateFaceRatio(positions, indices),
    surfaceArea: surfaceArea(positions, indices),
    signedVolume: signedVolume(positions, indices),
  };
  if (typeof opts.sdf === 'function') {
    report.containment = containmentFraction(opts.sdf, positions, opts);
  }
  return report;
}

/**
 * Format rows as an aligned ASCII table (CLI reports).
 * @param {string[]} columns
 * @param {Array<Array<*>>} rows
 * @returns {string}
 */
export function formatTable(columns, rows) {
  const widths = columns.map((c, i) => Math.max(
    c.length,
    ...rows.map((r) => String(r[i] ?? '').length),
  ));
  const line = (cells, pad) => cells
    .map((c, i) => (pad === -1 && i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i])))
    .join('  ');
  const header = line(columns, -1);
  const rule = '-'.repeat(header.length);
  return [header, rule, ...rows.map((r) => line(r, 1))].join('\n');
}
