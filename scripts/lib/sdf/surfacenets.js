/**
 * NeuroAxis SDF kernel — block-wise SurfaceNets mesher.
 *
 * Meshes a scalar field (SDF, negative inside) over a boxed grid with the
 * dual-contouring variant known as Surface Nets (S.F. Gibson; the classic
 * cube_edges/edge_table formulation): one vertex per sign-changing cell,
 * placed at the average of its edge crossings, and one quad emitted once per
 * crossing edge from the four cells incident to that edge. Because quad
 * emission is edge-driven, the output index buffer is watertight (every
 * edge shared by exactly two faces) for any well-sampled field whose
 * surface stays inside the grid box — callers pad the bbox, see `padding`.
 *
 * The pass is streaming/block-wise: only two z-layers of field samples and
 * two layers of cell-vertex ids are alive at any moment, so peak memory is
 * O(nx·ny) instead of O(nx·ny·nz). This is what keeps 0.35 au bakes inside
 * the per-part time budget (docs/GEOMETRY_PIPELINE.md).
 *
 * Normals: per-vertex central-difference gradient of the field (accurate
 * "analytic-ish" normals), falling back to accumulated face normals for any
 * vertex whose gradient is degenerate.
 *
 * Plain Node ESM, zero dependencies.
 */

export const DEFAULT_RESOLUTION = 0.35;

/* ------------------------------------------- topology tables (module init) */

// 12 cube edges as 24 corner indices; corner c sits at (c&1, (c>>1)&1, (c>>2)&1).
const CUBE_EDGES = new Int32Array(24);
// 256-entry table: bit e set <=> edge e crosses for that corner-sign mask.
const EDGE_TABLE = new Int32Array(256);
{
  let k = 0;
  for (let i = 0; i < 8; i += 1) {
    for (let j = 1; j <= 4; j <<= 1) {
      const p = i ^ j;
      if (i <= p) { CUBE_EDGES[k++] = i; CUBE_EDGES[k++] = p; }
    }
  }
  for (let mask = 0; mask < 256; mask += 1) {
    let em = 0;
    for (let e = 0; e < 24; e += 2) {
      const a = !!(mask & (1 << CUBE_EDGES[e]));
      const b = !!(mask & (1 << CUBE_EDGES[e + 1]));
      if (a !== b) em |= 1 << (e >> 1);
    }
    EDGE_TABLE[mask] = em;
  }
}

// Scratch for the 8 corner values of the cell being processed (no per-cell
// allocation in the hot loop).
const cornerVals = new Float64Array(8);

/**
 * Mesh `field` over `bounds`.
 *
 * @param {(x,y,z)=>number} field  scalar field, negative inside
 * @param {{min:number[], max:number[]}} bounds  region of interest (au)
 * @param {object} [opts]
 * @param {number} [opts.resolution=0.35]  grid step in au
 * @param {number} [opts.padding=2]  extra cells added on every side so the
 *   surface never touches the grid boundary (keeps the mesh closed)
 * @param {number} [opts.normalEps]  finite-difference step (default h/2)
 * @param {number} [opts.maxSamples]  hard guard on total sample count
 * @returns {{
 *   positions: Float32Array, normals: Float32Array, indices: Uint32Array,
 *   vertexCount: number, triCount: number, resolution: number,
 *   dims: number[], gridMin: number[], gridMax: number[],
 *   missingVertexQuads: number, faceNormalFallbacks: number,
 *   samples: number
 * }}
 */
export function surfaceNets(field, bounds, opts = {}) {
  if (typeof field !== 'function') throw new Error('surfaceNets: field must be a function');
  const min = bounds && bounds.min;
  const max = bounds && bounds.max;
  if (!min || !max || min.length !== 3 || max.length !== 3) {
    throw new Error('surfaceNets: bounds must be {min:[x,y,z], max:[x,y,z]}');
  }

  const h = opts.resolution ?? DEFAULT_RESOLUTION;
  if (!(h > 0)) throw new Error('surfaceNets: resolution must be > 0');
  const padCells = opts.padding ?? 2;

  // Grid geometry: cell counts from the padded box; sample rows = cells + 1.
  const cells = [
    Math.max(1, Math.ceil((max[0] - min[0]) / h) + 2 * padCells),
    Math.max(1, Math.ceil((max[1] - min[1]) / h) + 2 * padCells),
    Math.max(1, Math.ceil((max[2] - min[2]) / h) + 2 * padCells),
  ];
  const n = [cells[0] + 1, cells[1] + 1, cells[2] + 1];
  const totalSamples = n[0] * n[1] * n[2];
  if (totalSamples > (opts.maxSamples ?? 64 * 1024 * 1024)) {
    throw new Error(`surfaceNets: grid too large (${n.join('x')} samples); ` +
      'coarsen the resolution or shrink the bounds');
  }
  const origin = [min[0] - padCells * h, min[1] - padCells * h, min[2] - padCells * h];
  const gridMax = [
    origin[0] + cells[0] * h,
    origin[1] + cells[1] * h,
    origin[2] + cells[2] * h,
  ];

  /* ------------------------------------------------------------ buffers */

  const nx = n[0], ny = n[1];
  const bufW = cells[0];
  const layerCells = bufW * cells[1];
  // Rolling z-layers of field samples (z = k and z = k + 1).
  let layerA = new Float32Array(nx * ny);
  let layerB = new Float32Array(nx * ny);
  // Cell -> vertex id, stored +1 so 0 means "this cell has no vertex yet".
  const vbuf = new Int32Array(2 * layerCells);

  const positions = []; // flat xyz
  const indices = [];   // flat triangle indices
  let missingVertexQuads = 0;

  const fillLayer = (k, out) => {
    const z = origin[2] + k * h;
    let idx = 0;
    for (let j = 0; j < ny; j += 1) {
      const y = origin[1] + j * h;
      for (let i = 0; i < nx; i += 1, idx += 1) {
        out[idx] = field(origin[0] + i * h, y, z);
      }
    }
  };

  /** vbuf index for cell (ci, cj, czLayer) where czLayer is k (cur) or k-1. */
  const cellIdx = (ci, cj, zLayer) =>
    (zLayer === 0 ? 0 : layerCells) + ci + bufW * cj;

  /* ------------------------------------------------------- streaming pass */

  fillLayer(0, layerA);
  let bufNo = 0; // vbuf layer holding vertex ids for cell-z = k

  for (let k = 0; k < cells[2]; k += 1) {
    fillLayer(k + 1, layerB);
    const layerSize = nx * ny;

    for (let j = 0; j < cells[1]; j += 1) {
      for (let i = 0; i < cells[0]; i += 1) {
        const base = i + nx * j;

        // Corner values: c = cx | cy<<1 | cz<<2; z=0 row in layerA, z=1 in layerB.
        cornerVals[0] = layerA[base];          // (0,0,0)
        cornerVals[1] = layerA[base + 1];      // (1,0,0)
        cornerVals[2] = layerA[base + nx];     // (0,1,0)
        cornerVals[3] = layerA[base + nx + 1]; // (1,1,0)
        cornerVals[4] = layerB[base];          // (0,0,1)
        cornerVals[5] = layerB[base + 1];      // (1,0,1)
        cornerVals[6] = layerB[base + nx];     // (0,1,1)
        cornerVals[7] = layerB[base + nx + 1]; // (1,1,1)

        let mask = 0;
        for (let c = 0; c < 8; c += 1) if (cornerVals[c] < 0) mask |= 1 << c;
        if (mask === 0 || mask === 0xff) continue; // no surface in this cell

        // Vertex = average of the cell's edge-crossing points.
        const edgeMask = EDGE_TABLE[mask];
        let vx = 0, vy = 0, vz = 0, cnt = 0;
        for (let e = 0; e < 12; e += 1) {
          if (!(edgeMask & (1 << e))) continue;
          const ca = CUBE_EDGES[2 * e], cb = CUBE_EDGES[2 * e + 1];
          const va = cornerVals[ca], vb = cornerVals[cb];
          const t = va / (va - vb); // in [0,1]: the pair straddles zero
          const ax = ca & 1, ay = (ca >> 1) & 1, az = (ca >> 2) & 1;
          const bx = cb & 1, by = (cb >> 1) & 1, bz = (cb >> 2) & 1;
          vx += ax + (bx - ax) * t;
          vy += ay + (by - ay) * t;
          vz += az + (bz - az) * t;
          cnt += 1;
        }
        const vid = positions.length / 3;
        positions.push(
          origin[0] + (i + vx / cnt) * h,
          origin[1] + (j + vy / cnt) * h,
          origin[2] + (k + vz / cnt) * h,
        );
        vbuf[bufNo * layerCells + i + bufW * j] = vid + 1;

        // One quad per crossing corner-0 edge, from the 4 incident cells.
        // Backward neighbors only, so each quad is emitted exactly once.
        for (let a = 0; a < 3; a += 1) {
          if (!(edgeMask & (1 << a))) continue;

          // Bounds: the quad needs neighbors in -u and -v directions.
          if (a === 0) {        // edge along x: neighbors at -y, -z
            if (j === 0 || k === 0) continue;
          } else if (a === 1) { // edge along y: neighbors at -z, -x
            if (k === 0 || i === 0) continue;
          } else {              // edge along z: neighbors at -x, -y
            if (i === 0 || j === 0) continue;
          }

          const cur = bufNo * layerCells;
          const prev = (1 - bufNo) * layerCells;
          // q0: this cell; q1: -u; q2: -u-v; q3: -v. Cells at z=k live in
          // bufNo's layer; cells at z=k-1 in the other layer.
          const q0 = vbuf[cur + i + bufW * j];
          let q1 = 0, q2 = 0, q3 = 0;
          if (a === 0) { // -y, -y-z, -z
            q1 = vbuf[cur + i + bufW * (j - 1)];
            q2 = vbuf[prev + i + bufW * (j - 1)];
            q3 = vbuf[prev + i + bufW * j];
          } else if (a === 1) { // -z, -z-x, -x
            q1 = vbuf[prev + i + bufW * j];
            q2 = vbuf[prev + (i - 1) + bufW * j];
            q3 = vbuf[cur + (i - 1) + bufW * j];
          } else { // -x, -x-y, -y
            q1 = vbuf[cur + (i - 1) + bufW * j];
            q2 = vbuf[cur + (i - 1) + bufW * (j - 1)];
            q3 = vbuf[cur + i + bufW * (j - 1)];
          }
          if (q0 === 0 || q1 === 0 || q2 === 0 || q3 === 0) {
            // Unreachable for cells containing a crossing edge (each of the
            // four cells contains that edge, hence a sign change, hence a
            // vertex); counted defensively instead of corrupting topology.
            missingVertexQuads += 1;
            continue;
          }
          const A = q0 - 1, B = q1 - 1, C = q2 - 1, D = q3 - 1;
          if (mask & 1) {
            // corner-0 sample inside -> A,B,C,D is the outward winding
            indices.push(A, B, C, A, C, D);
          } else {
            indices.push(A, D, C, A, C, B);
          }
        }
      }
    }

    // Roll the layers: layerB (z=k+1) becomes layerA for the next slice;
    // the old layerA array is recycled as the next layerB (fully refilled).
    const t = layerA; layerA = layerB; layerB = t;
    bufNo = 1 - bufNo;
    // The new current vbuf layer still holds ids from z = k-1 — stale.
    vbuf.fill(0, bufNo * layerCells, (bufNo + 1) * layerCells);
  }

  /* ------------------------------------------------------------- normals */

  const vertexCount = positions.length / 3;
  const pos = Float32Array.from(positions);
  const idx = Uint32Array.from(indices);
  const nrm = new Float32Array(positions.length);
  const normalEps = opts.normalEps ?? h * 0.5;
  let fallbacks = 0;

  for (let vi = 0; vi < vertexCount; vi += 1) {
    const px = pos[3 * vi], py = pos[3 * vi + 1], pz = pos[3 * vi + 2];
    const gx = field(px + normalEps, py, pz) - field(px - normalEps, py, pz);
    const gy = field(px, py + normalEps, pz) - field(px, py - normalEps, pz);
    const gz = field(px, py, pz + normalEps) - field(px, py, pz - normalEps);
    const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
    if (len > 1e-9 && Number.isFinite(len)) {
      // Gradient of a negative-inside SDF points outward — exactly the
      // surface normal direction three.js expects.
      nrm[3 * vi] = gx / len; nrm[3 * vi + 1] = gy / len; nrm[3 * vi + 2] = gz / len;
    } else {
      fallbacks += 1; // left zeroed; face-normal pass below fills it
    }
  }
  if (fallbacks > 0) {
    for (let t = 0; t < idx.length; t += 3) {
      const ia = idx[t], ib = idx[t + 1], ic = idx[t + 2];
      const ax = pos[3 * ia], ay = pos[3 * ia + 1], az = pos[3 * ia + 2];
      const e1x = pos[3 * ib] - ax, e1y = pos[3 * ib + 1] - ay, e1z = pos[3 * ib + 2] - az;
      const e2x = pos[3 * ic] - ax, e2y = pos[3 * ic + 1] - ay, e2z = pos[3 * ic + 2] - az;
      const fnx = e1y * e2z - e1z * e2y;
      const fny = e1z * e2x - e1x * e2z;
      const fnz = e1x * e2y - e1y * e2x;
      for (let s = 0; s < 3; s += 1) {
        const vi = idx[t + s];
        if (nrm[3 * vi] === 0 && nrm[3 * vi + 1] === 0 && nrm[3 * vi + 2] === 0) {
          nrm[3 * vi] += fnx; nrm[3 * vi + 1] += fny; nrm[3 * vi + 2] += fnz;
        }
      }
    }
    for (let vi = 0; vi < vertexCount; vi += 1) {
      const gx = nrm[3 * vi], gy = nrm[3 * vi + 1], gz = nrm[3 * vi + 2];
      const len = Math.sqrt(gx * gx + gy * gy + gz * gz);
      if (len > 1e-9) {
        nrm[3 * vi] = gx / len; nrm[3 * vi + 1] = gy / len; nrm[3 * vi + 2] = gz / len;
      } else {
        nrm[3 * vi] = 0; nrm[3 * vi + 1] = 1; nrm[3 * vi + 2] = 0;
      }
    }
  }

  return {
    positions: pos,
    normals: nrm,
    indices: idx,
    vertexCount,
    triCount: idx.length / 3,
    resolution: h,
    dims: n,
    gridMin: origin,
    gridMax,
    missingVertexQuads,
    faceNormalFallbacks: fallbacks,
    samples: totalSamples,
  };
}
