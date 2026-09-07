/**
 * NeuroAxis SDF kernel — triangle soup to signed-distance voxel grid.
 *
 * Pipeline (docs/GEOMETRY_PIPELINE.md §voxelize):
 *  1. UNSIGNED DISTANCE: every triangle is rasterized over the grid nodes
 *     inside its AABB expanded by the band; each node keeps the minimum
 *     point-triangle distance, clamped at the band radius.
 *  2. SIGN FILL: per column along +z, triangle crossings are collected
 *     (2D point-in-triangle in the xy projection), sorted, and walked to
 *     produce a winding number per node (`mode: 'winding'`) or a parity
 *     count (`mode: 'parity'`). `mode: 'auto'` (default) uses winding and
 *     falls back to parity per column when the crossing sequence looks
 *     leaky (odd crossing count).
 *  3. BAND DISTANCE TRANSFORM: a 26-neighbor chamfer sweep seeded from the
 *     rasterized nodes extends the exact band so no node near the surface
 *     keeps the clamp value (fills rasterization gaps, smooths quantization).
 *  4. Global sign normalization: if the majority of the boundary shell ends
 *     up "inside", the source mesh winding was inverted — flip and report.
 *
 * The result's `sdf(x, y, z)` (trilinear, clamped at the grid edge) plugs
 * straight into surfaceNets() and stats.containmentFraction().
 *
 * Plain Node ESM, zero dependencies.
 */

export const DEFAULT_RESOLUTION = 0.35;
export const DEFAULT_BAND_CELLS = 4;

/* --------------------------------------------------------------- helpers */

/** Tight AABB of a triangle soup (xyz triplets + index triplets). */
export function trianglesBounds(positions, triangles) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const triCount = triangles ? triangles.length / 3 : positions.length / 3;
  for (let tri = 0; tri < triCount; tri += 1) {
    for (let s = 0; s < 3; s += 1) {
      const vi = triangles ? 3 * triangles[3 * tri + s] : 3 * (3 * tri + s);
      const x = positions[vi], y = positions[vi + 1], z = positions[vi + 2];
      if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
      if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
      if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
    }
  }
  if (!Number.isFinite(min[0])) throw new Error('trianglesBounds: empty mesh');
  return { min, max };
}

/** Closest point on triangle (a,b,c) to p — Ericson, real-time collision. */
function closestPointOnTri(
  px, py, pz,
  ax, ay, az, bx, by, bz, cx, cy, cz,
) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return [ax, ay, az];

  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return [bx, by, bz];

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return [ax + abx * v, ay + aby * v, az + abz * v];
  }

  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return [cx, cy, cz];

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return [ax + acx * w, ay + acy * w, az + acz * w];
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return [bx + (cx - bx) * w, by + (cy - by) * w, bz + (cz - bz) * w];
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  return [ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w];
}

/* 26-neighbor chamfer offsets with Euclidean segment lengths. */
const CHAMFER = [];
for (let dz = -1; dz <= 1; dz += 1) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0 && dz === 0) continue;
      CHAMFER.push([dx, dy, dz, Math.sqrt(dx * dx + dy * dy + dz * dz)]);
    }
  }
}

/* ------------------------------------------------------------ main entry */

/**
 * Voxelize a triangle soup into a signed-distance grid.
 *
 * @param {Array|Float32Array} positions  xyz triplets
 * @param {Array|Uint32Array|null} triangles  index triplets; null/undefined
 *   treats positions as an unpadded triangle soup (0,1,2)(3,4,5)...
 * @param {object} [opts]
 * @param {{min:number[],max:number[]}} [opts.bbox]  defaults to the tight
 *   triangle bounds padded by (bandCells + 1) cells
 * @param {number} [opts.resolution=0.35]  grid step (au)
 * @param {number} [opts.bandCells=4]  signed-band half-width in cells
 * @param {'winding'|'parity'|'auto'} [opts.mode='auto']
 * @returns {SignedGrid}
 */
export function voxelizeTriangles(positions, triangles, opts = {}) {
  const t0 = Date.now();
  const h = opts.resolution ?? DEFAULT_RESOLUTION;
  const bandCells = opts.bandCells ?? DEFAULT_BAND_CELLS;
  if (!(h > 0)) throw new Error('voxelizeTriangles: resolution must be > 0');
  const band = bandCells * h;
  const mode = opts.mode ?? 'auto';

  const tight = trianglesBounds(positions, triangles ?? null);
  const pad = band + h;
  const min = opts.bbox ? [...opts.bbox.min] : tight.min.map((m) => m - pad);
  const max = opts.bbox ? [...opts.bbox.max] : tight.max.map((m) => m + pad);
  const cells = [0, 1, 2].map((a) => Math.max(1, Math.ceil((max[a] - min[a]) / h)));
  const n = cells.map((c) => c + 1);
  const [nx, ny, nz] = n;
  const N = nx * ny * nz;
  if (N > 96 * 1024 * 1024) {
    throw new Error(`voxelizeTriangles: grid too large (${n.join('x')}); ` +
      'coarsen the resolution or shrink the bbox');
  }

  const idxOf = (i, j, k) => i + nx * (j + ny * k);

  /* --- 1. unsigned distance rasterization (clamped at the band) --------- */

  const udist = new Float32Array(N).fill(band);
  const argTri = new Int32Array(N).fill(-1);
  const band2 = band * band;

  const triCount = triangles ? triangles.length / 3 : positions.length / 3;
  for (let tri = 0; tri < triCount; tri += 1) {
    const i0 = triangles ? 3 * triangles[3 * tri] : 3 * 3 * tri;
    const i1 = triangles ? 3 * triangles[3 * tri + 1] : i0 + 3;
    const i2 = triangles ? 3 * triangles[3 * tri + 2] : i0 + 6;
    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];

    // Triangle AABB (invariant across the rasterized nodes).
    const tx0 = Math.min(ax, bx, cx), tx1 = Math.max(ax, bx, cx);
    const ty0 = Math.min(ay, by, cy), ty1 = Math.max(ay, by, cy);
    const tz0 = Math.min(az, bz, cz), tz1 = Math.max(az, bz, cz);

    // Node-index AABB expanded by the band.
    const lo = [
      Math.max(0, Math.floor(((tx0 - band) - min[0]) / h)),
      Math.max(0, Math.floor(((ty0 - band) - min[1]) / h)),
      Math.max(0, Math.floor(((tz0 - band) - min[2]) / h)),
    ];
    const hi = [
      Math.min(nx - 1, Math.ceil(((tx1 + band) - min[0]) / h)),
      Math.min(ny - 1, Math.ceil(((ty1 + band) - min[1]) / h)),
      Math.min(nz - 1, Math.ceil(((tz1 + band) - min[2]) / h)),
    ];

    for (let k = lo[2]; k <= hi[2]; k += 1) {
      const z = min[2] + k * h;
      const rz0 = z < tz0 ? tz0 - z : (z > tz1 ? z - tz1 : 0);
      for (let j = lo[1]; j <= hi[1]; j += 1) {
        const y = min[1] + j * h;
        const ry0 = y < ty0 ? ty0 - y : (y > ty1 ? y - ty1 : 0);
        const ryy = rz0 * rz0 + ry0 * ry0;
        let idx = idxOf(lo[0], j, k);
        for (let i = lo[0]; i <= hi[0]; i += 1, idx += 1) {
          const x = min[0] + i * h;
          // cheap reject: squared distance from the node to the triangle AABB
          const rx0 = x < tx0 ? tx0 - x : (x > tx1 ? x - tx1 : 0);
          const aabbD2 = rx0 * rx0 + ryy;
          if (aabbD2 >= band2 && aabbD2 >= udist[idx] * udist[idx]) continue;

          const q = closestPointOnTri(x, y, z, ax, ay, az, bx, by, bz, cx, cy, cz);
          const dx = x - q[0], dy = y - q[1], dz2 = z - q[2];
          const d2 = dx * dx + dy * dy + dz2 * dz2;
          if (d2 < udist[idx] * udist[idx] || argTri[idx] < 0) {
            udist[idx] = Math.sqrt(d2);
            argTri[idx] = tri;
          }
        }
      }
    }
  }

  /* --- 2. sign fill via per-column winding / parity along +z ------------ */

  // Bin triangles into xy columns they overlap (their xy AABB).
  const columnTris = new Array(nx * ny).fill(null);
  for (let tri = 0; tri < triCount; tri += 1) {
    const i0 = triangles ? 3 * triangles[3 * tri] : 3 * 3 * tri;
    const i1 = triangles ? 3 * triangles[3 * tri + 1] : i0 + 3;
    const i2 = triangles ? 3 * triangles[3 * tri + 2] : i0 + 6;
    const tx0 = Math.min(positions[i0], positions[i1], positions[i2]);
    const tx1 = Math.max(positions[i0], positions[i1], positions[i2]);
    const ty0 = Math.min(positions[i0 + 1], positions[i1 + 1], positions[i2 + 1]);
    const ty1 = Math.max(positions[i0 + 1], positions[i1 + 1], positions[i2 + 1]);
    const iLo = Math.max(0, Math.floor((tx0 - min[0]) / h));
    const iHi = Math.min(nx - 1, Math.ceil((tx1 - min[0]) / h));
    const jLo = Math.max(0, Math.floor((ty0 - min[1]) / h));
    const jHi = Math.min(ny - 1, Math.ceil((ty1 - min[1]) / h));
    for (let j = jLo; j <= jHi; j += 1) {
      for (let i = iLo; i <= iHi; i += 1) {
        const c = i + nx * j;
        if (columnTris[c] === null) columnTris[c] = [];
        columnTris[c].push(tri);
      }
    }
  }

  const signArr = new Int8Array(N); // 1 = inside, 0 = outside
  let leakColumns = 0;
  const crossings = []; // reused per column: [z*, windingSign]
  const EPS2 = 1e-12;

  for (let j = 0; j < ny; j += 1) {
    const y = min[1] + j * h;
    for (let i = 0; i < nx; i += 1) {
      const x = min[0] + i * h;
      crossings.length = 0;
      const list = columnTris[i + nx * j];
      if (list !== null) {
        for (let li = 0; li < list.length; li += 1) {
          const tri = list[li];
          const i0 = triangles ? 3 * triangles[3 * tri] : 3 * 3 * tri;
          const i1 = triangles ? 3 * triangles[3 * tri + 1] : i0 + 3;
          const i2 = triangles ? 3 * triangles[3 * tri + 2] : i0 + 6;
          const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
          const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
          const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];

          // geometric normal n = e1 × e2 (winding orientation of the source)
          const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
          const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
          const nX = e1y * e2z - e1z * e2y;
          const nY = e1z * e2x - e1x * e2z;
          const nZ = e1x * e2y - e1y * e2x;
          if (Math.abs(nZ) < 1e-12) continue; // grazing the ray axis
          const s = nZ > 0 ? 1 : -1;

          // 2D point-in-triangle in the xy projection (orientation-normalized)
          const area2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
          if (Math.abs(area2) < EPS2) continue;
          const d = area2 > 0 ? 1 : -1;
          const f0 = d * ((bx - ax) * (y - ay) - (by - ay) * (x - ax));
          const f1 = d * ((cx - bx) * (y - by) - (cy - by) * (x - bx));
          const f2 = d * ((ax - cx) * (y - cy) - (ay - cy) * (x - cx));
          if (f0 < 0 || f1 < 0 || f2 < 0) continue;

          // plane crossing height at (x, y): n·(p - a) = 0
          const zHit = az - (nX * (x - ax) + nY * (y - ay)) / nZ;
          crossings.push([zHit, s]);
        }
      }
      if (crossings.length === 0) continue; // column never touches the mesh
      crossings.sort((a, b) => a[0] - b[0]);
      if (crossings.length % 2 !== 0) leakColumns += 1; // open/inconsistent

      const useParity = mode === 'parity' || (mode === 'auto' && crossings.length % 2 !== 0);
      let ptr = 0;
      let w = 0;
      let parity = 0;
      for (let k = 0; k < nz; k += 1) {
        const z = min[2] + k * h;
        while (ptr < crossings.length && crossings[ptr][0] < z) {
          w += crossings[ptr][1];
          parity ^= 1;
          ptr += 1;
        }
        const inside = useParity ? parity === 1 : w !== 0;
        if (inside) signArr[idxOf(i, j, k)] = 1;
      }
    }
  }

  // Global orientation normalization: the boundary shell must be "outside".
  let boundaryInside = 0;
  let boundaryTotal = 0;
  const bump = (i, j, k) => {
    boundaryTotal += 1;
    if (signArr[idxOf(i, j, k)] === 1) boundaryInside += 1;
  };
  for (let k = 0; k < nz; k += 1) {
    for (let j = 0; j < ny; j += 1) {
      bump(0, j, k); bump(nx - 1, j, k);
    }
  }
  for (let k = 0; k < nz; k += 1) {
    for (let i = 0; i < nx; i += 1) {
      bump(i, 0, k); bump(i, ny - 1, k);
    }
  }
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      bump(i, j, 0); bump(i, j, nz - 1);
    }
  }
  let flipped = false;
  if (boundaryTotal > 0 && boundaryInside * 2 > boundaryTotal) {
    flipped = true;
    for (let n2 = 0; n2 < N; n2 += 1) signArr[n2] ^= 1;
  }

  // Diagnostic: agreement between local orientation sign (nearest triangle
  // normal) and the column fill, over rasterized (in-band) nodes.
  let disagree = 0;
  let checked = 0;
  for (let n2 = 0; n2 < N; n2 += 1) {
    if (argTri[n2] < 0) continue;
    checked += 1;
    const tri = argTri[n2];
    const i0 = triangles ? 3 * triangles[3 * tri] : 3 * 3 * tri;
    const i1 = triangles ? 3 * triangles[3 * tri + 1] : i0 + 3;
    const i2 = triangles ? 3 * triangles[3 * tri + 2] : i0 + 6;
    const ax = positions[i0], ay = positions[i0 + 1], az = positions[i0 + 2];
    const bx = positions[i1], by = positions[i1 + 1], bz = positions[i1 + 2];
    const cx = positions[i2], cy = positions[i2 + 1], cz = positions[i2 + 2];
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const nX = e1y * e2z - e1z * e2y, nY = e1z * e2x - e1x * e2z, nZ = e1x * e2y - e1y * e2x;
    const k = Math.floor(n2 / (nx * ny));
    const rem = n2 - k * nx * ny;
    const j = Math.floor(rem / nx);
    const i = rem - j * nx;
    const x = min[0] + i * h, y = min[1] + j * h, z = min[2] + k * h;
    const q = closestPointOnTri(x, y, z, ax, ay, az, bx, by, bz, cx, cy, cz);
    const dotp = (x - q[0]) * nX + (y - q[1]) * nY + (z - q[2]) * nZ;
    // Inside ⟺ the vector to the nearest surface point opposes the outward
    // normal of that surface patch.
    const orientInside = dotp < 0 ? 1 : 0;
    if (orientInside !== signArr[n2]) disagree += 1;
  }

  /* --- 3. band distance transform (26-neighbor chamfer) ----------------- */

  const relaxNeighbors = (order) => {
    const [di, dj, dk] = order; // order: forward or reversed raster direction
    const iStart = di > 0 ? 0 : nx - 1, iEnd = di > 0 ? nx : -1;
    const jStart = dj > 0 ? 0 : ny - 1, jEnd = dj > 0 ? ny : -1;
    const kStart = dk > 0 ? 0 : nz - 1, kEnd = dk > 0 ? nz : -1;
    for (let kk = kStart; kk !== kEnd; kk += dk) {
      for (let jj = jStart; jj !== jEnd; jj += dj) {
        for (let ii = iStart; ii !== iEnd; ii += di) {
          const src = idxOf(ii, jj, kk);
          const u = udist[src];
          if (u >= band) continue; // only band seeds propagate
          for (let c = 0; c < CHAMFER.length; c += 1) {
            const oi = ii + CHAMFER[c][0], oj = jj + CHAMFER[c][1], ok = kk + CHAMFER[c][2];
            if (oi < 0 || oj < 0 || ok < 0 || oi >= nx || oj >= ny || ok >= nz) continue;
            const cand = u + CHAMFER[c][3] * h;
            if (cand >= band) continue; // clamped anyway — skip the write
            const dst = idxOf(oi, oj, ok);
            if (cand < udist[dst]) udist[dst] = cand;
          }
        }
      }
    }
  };
  relaxNeighbors([1, 1, 1]);
  relaxNeighbors([-1, -1, -1]);
  relaxNeighbors([1, 1, 1]);
  relaxNeighbors([-1, -1, -1]);

  /* --- 4. assemble the signed grid -------------------------------------- */

  const data = new Float32Array(N);
  for (let n2 = 0; n2 < N; n2 += 1) {
    data[n2] = signArr[n2] === 1 ? -udist[n2] : udist[n2];
  }

  const grid = {
    min, max, dims: n, spacing: h, band,
    data, signArr, argTri,
    triangleCount: triCount,
    sample(x, y, z) {
      // trilinear, clamped at the grid border
      const fx = Math.min(Math.max((x - min[0]) / h, 0), nx - 1);
      const fy = Math.min(Math.max((y - min[1]) / h, 0), ny - 1);
      const fz = Math.min(Math.max((z - min[2]) / h, 0), nz - 1);
      const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz);
      const i1 = Math.min(i0 + 1, nx - 1), j1 = Math.min(j0 + 1, ny - 1), k1 = Math.min(k0 + 1, nz - 1);
      const tx = fx - i0, ty = fy - j0, tz = fz - k0;
      const c000 = data[idxOf(i0, j0, k0)], c100 = data[idxOf(i1, j0, k0)];
      const c010 = data[idxOf(i0, j1, k0)], c110 = data[idxOf(i1, j1, k0)];
      const c001 = data[idxOf(i0, j0, k1)], c101 = data[idxOf(i1, j0, k1)];
      const c011 = data[idxOf(i0, j1, k1)], c111 = data[idxOf(i1, j1, k1)];
      const c00 = c000 + (c100 - c000) * tx, c10 = c010 + (c110 - c010) * tx;
      const c01 = c001 + (c101 - c001) * tx, c11 = c011 + (c111 - c011) * tx;
      const c0 = c00 + (c10 - c00) * ty, c1 = c01 + (c11 - c01) * ty;
      return c0 + (c1 - c0) * tz;
    },
    sdf(x, y, z) { return grid.sample(x, y, z); },
    diagnostics: {
      mode,
      nodes: N,
      leakColumns,
      flipped,
      signDisagreementRatio: checked > 0 ? disagree / checked : 0,
      elapsedMs: Date.now() - t0,
    },
  };
  return grid;
}
