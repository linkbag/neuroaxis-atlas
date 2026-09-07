// scripts/lib/register.mjs — BP3D → canonical atlas registration (REALISM_PLAN §3).
//
// Reads assets-src/bp3d/raw/*.obj (BodyParts3D 4.0, mm, Z-up, whole-body origin),
// verifies the axis convention empirically against known anatomical asymmetries,
// detects brainstem junctions from per-slice cross-section area minima, applies
//   (1) axis remap  mm → au (1 au = 1.2 mm, AMENDMENT A), x=+patient-left, y=+superior, z=+anterior
//   (2) global scale + piecewise-linear y-warp onto levels.json anchors
//   (3) per-slice centerline straightening (bounded smoothing; stem stack centroids)
//   (4) pair splits (diencephalon midline slab at x=0; cerebellum L/R + vermis |x|<3)
// and writes assets-src/bp3d/canonical/<name>.obj + registration-summary.json +
// assets-src/bp3d/REGISTRATION.md (landmark residuals vs targets, tolerance ±3 au).
//
// Deterministic: fixed constants, no clock, no RNG, sorted iteration, fixed precision.
// Zero dependencies (node: builtins only). Node >= 18.
//
// Usage:
//   node scripts/lib/register.mjs                  # full registration + reports
//   node scripts/lib/register.mjs --probe-profile  # print area profile + junctions, write nothing
//
// OBJ IO: prefers the SDF kernel module scripts/lib/sdf/objio.js (task sdf-kernel) when it
// exists and exposes a recognizable reader/writer API; falls back to the internal minimal
// reader/writer below. The chosen path is recorded in REGISTRATION.md. Kernel-written files
// are round-trip verified against the internal parser before being trusted.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'assets-src', 'bp3d', 'raw');
const OUT_DIR = path.join(ROOT, 'assets-src', 'bp3d', 'canonical');
const REPORT_PATH = path.join(ROOT, 'assets-src', 'bp3d', 'REGISTRATION.md');
const SUMMARY_PATH = path.join(OUT_DIR, 'registration-summary.json');

// ---------------------------------------------------------------------------
// Registration constants (spec: docs/REALISM_PLAN.md §3, run task brief)
// ---------------------------------------------------------------------------
const MM_PER_AU = 1.2;               // canonical "atlas unit" ≈ 1.2 mm (REALISM_PLAN §3 AMENDMENT A —
                                     // corrected from 0.7: schematic v1 bounds vs metric real anatomy)
const SCALE = 1 / MM_PER_AU;         // 0.8333… au per mm (x/z uniform; y refined by warp)
const MM_PER_AU_INV = SCALE;         // au per mm (readability alias for target derivation)
const ANCHORS = {                    // levels.json / plan §3.2 warp targets (canonical au)
  cm: -50,      // cervicomedullary junction  (lvl-spinal-medulla)
  pm: -24,      // pontomedullary junction    (lvl-pontomedullary)
  pmes: 4,      // pontomesencephalic junction (between lvl-pons-rostral +2 and lvl-midbrain-ic +8)
  md: 20,       // midbrain–diencephalon junction (just above lvl-post-comm +19)
  dicTop: 38,  // top of thalamic band 22–38 (diencephalon roof)
};
const VERMIS_HALF_WIDTH_AU = 3;      // vermis band label |x| < 3 au
const AREA_CELL_MM = 0.5;            // rasterization cell for cross-section area (BP mm)
const CL_CELL_AU = 0.6;              // rasterization cell for centerline centroids (canonical au)
const CL_SLAB_AU = 0.5;              // centerline slab spacing
const CL_SMOOTH_SLABS = 25;          // moving-average window (odd), ≈ 12.5 au — removes the
                                     // long-wave BP3D flexure only; medium-wave anatomy (pontine
                                     // bulge, crus prominence) intentionally survives as the
                                     // gentle ventral bow around y≈12
const CL_WOBBLE_WINDOW = 5;          // smoothing used to measure residual axis wobble
const CL_CLAMP_AU = 20;              // max |offset| amplitude
const CL_MAX_STEP_AU = 1.0;          // max offset change between adjacent slabs
const LW_LIMIT_AU = 6;               // acceptance: silhouette-axis bow must stay gentle. Band set by
                                     // anatomy: the natural pontine flexure bows the silhouette
                                     // middle ~3–4 mm ≈ 2.5–3.3 au at 1/1.2 (AMENDMENT A) — plan §3.3 requires it
                                     // PRESERVED ("gentle ventral bow"), so flattening is a failure
                                     // just as exceeding it would be a distortion.
const WOBBLE_LIMIT_AU = 1.2;         // acceptance: silhouette-axis wobble RMS
const TOL_AU = 3;                    // landmark tolerance (task brief)

// BP3D element files (FJ ids resolved by bp3d-acquire; see parts-report.json).
// laterality: 'L' | 'R' | 'M' (unpaired/midline element)
const FILES = {
  medullaL: 'FJ1769.obj', medullaR: 'FJ1831.obj',
  ponsL: 'FJ1775.obj', ponsR: 'FJ1822.obj',
  midbrainL: 'FJ1770.obj', midbrainR: 'FJ1817.obj',
  scL: 'FJ1779.obj', scR: 'FJ1826.obj',
  icL: 'FJ1762.obj', icR: 'FJ1810.obj',
  cerebL: 'FJ1781.obj', cerebR: 'FJ1830.obj',
  hypoL: 'FJ1760.obj', hypoExtraL: 'FJ1780.obj',
  hypoR: 'FJ1808.obj', hypoExtraR: 'FJ1828.obj',
  dicSlab: 'FJ1730.obj',
  pineal: 'FJ1795.obj',
  habenula: 'FJ1743.obj',
  aqueduct: 'FJ1738.obj',
  vent4: 'FJ1731.obj',
  // ORCHESTRATOR ADDENDUM inputs (isa_BP3D_4.0_obj_99.zip; see PROBE.md addendum +
  // parts-report.json): real thalami + geniculate bodies.
  thalL: 'FJ1782.obj', thalR: 'FJ1827.obj',
  lgnL: 'FJ1766.obj', lgnR: 'FJ1813.obj',
  mgnL: 'FJ1816M.obj', mgnR: 'FJ1816.obj',
};
// Fused stem stack used for junction detection + centerline straightening.
const STEM_KEYS = ['medullaL', 'medullaR', 'ponsL', 'ponsR', 'midbrainL', 'midbrainR'];

// ---------------------------------------------------------------------------
// Minimal internal OBJ IO (fallback when scripts/lib/sdf/objio.js is absent)
// ---------------------------------------------------------------------------
function readObjInternal(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const positions = [];
  const faces = [];
  for (const line of text.split('\n')) {
    if (line.length < 2 || line.charCodeAt(0) !== 118 /* v */ && line.charCodeAt(0) !== 102 /* f */) {
      // fast reject: anything not starting with v/f
      if (!(line.startsWith('v ') || line.startsWith('f '))) continue;
    }
    if (line.startsWith('v ')) {
      const t = line.slice(2).trim().split(/\s+/);
      positions.push([+t[0], +t[1], +t[2]]);
    } else if (line.startsWith('f ')) {
      const t = line.slice(2).trim().split(/\s+/);
      const idx = [];
      for (const tok of t) {
        const m = tok.match(/^(\d+)/);
        if (m) idx.push(+m[1] - 1); // OBJ is 1-based
      }
      for (let k = 1; k + 1 < idx.length; k++) faces.push([idx[0], idx[k], idx[k + 1]]);
    }
  }
  return { positions, faces };
}

function objHeaderText(name) {
  return [
    '# Canonical atlas-space mesh — generated by scripts/lib/register.mjs (deterministic).',
    '# Canonical space: x=+patient-left, y=+superior, z=+anterior; 1 au = 1.2 mm (AMENDMENT A).',
    `# Source geometry: BodyParts3D 4.0 (${name}), © The Database Center for Life Science, CC Attribution 4.0 International.`,
  ].join('\n');
}

function writeObjInternal(filePath, name, mesh) {
  const out = [objHeaderText(name), `o ${name}`];
  for (const p of mesh.positions) {
    out.push(`v ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`);
  }
  for (const f of mesh.faces) {
    out.push(`f ${f[0] + 1} ${f[1] + 1} ${f[2] + 1}`);
  }
  writeFileSync(filePath, out.join('\n') + '\n', 'utf8');
}

// --- kernel objio adapter ----------------------------------------------------
// Adapts scripts/lib/sdf/objio.js (task sdf-kernel). Known API (verified 2026-09):
//   parseOBJ(text) -> {positions: Float32Array xyz, triangles: Uint32Array, ...}
//   writeOBJ(mesh, {name, comment, precision}) -> string
// A path-based reader (readOBJ/readObj) is also tolerated if a future version
// provides one. The kernel writer's output is round-trip verified before trust.
async function loadObjIo() {
  try {
    const mod = await import('./sdf/objio.js');
    const parseName = ['parseOBJ', 'parseObj'].find((n) => typeof mod[n] === 'function');
    const readName = ['readOBJ', 'readObj', 'loadOBJ', 'loadObj'].find((n) => typeof mod[n] === 'function');
    const writeName = ['writeOBJ', 'writeObj', 'stringifyOBJ', 'stringifyObj'].find((n) => typeof mod[n] === 'function');
    if ((parseName || readName) && writeName) {
      const read = async (p) => {
        if (parseName) return normalizeKernelMesh(mod[parseName](readFileSync(p, 'utf8')));
        return normalizeKernelMesh(await mod[readName](p));
      };
      const write = async (p, name, mesh) => {
        const flatPos = toFlatPositions(mesh.positions);
        const flatTri = toFlatTriangles(mesh.faces);
        const ret = await mod[writeName](
          { positions: flatPos, triangles: flatTri },
          {
            name,
            precision: 4,
            comment: 'Canonical atlas space (x=+left, y=+sup, z=+ant; 1au=1.2mm). Source: BodyParts3D 4.0, (c) The Database Center for Life Science, CC Attribution 4.0 International. Generated by scripts/lib/register.mjs.',
          },
        );
        if (typeof ret === 'string') writeFileSync(p, ret, 'utf8');
      };
      return { name: `kernel:objio.js (${parseName ?? readName}/${writeName})`, read, write };
    }
  } catch {
    /* module absent — expected until sdf-kernel lands; internal fallback below */
  }
  return { name: 'internal (scripts/lib/sdf/objio.js not present yet)', read: readObjInternal, write: writeObjInternal };
}

function toFlatPositions(positions) {
  if (ArrayBuffer.isView(positions)) return positions; // already flat typed array
  if (positions.length && typeof positions[0] === 'number') return positions; // flat array
  const out = new Float32Array(positions.length * 3);
  for (let i = 0; i < positions.length; i++) {
    out[i * 3] = positions[i][0];
    out[i * 3 + 1] = positions[i][1];
    out[i * 3 + 2] = positions[i][2];
  }
  return out;
}
function toFlatTriangles(faces) {
  if (ArrayBuffer.isView(faces)) return faces;
  if (faces.length && typeof faces[0] === 'number') return faces;
  const out = new Uint32Array(faces.length * 3);
  for (let i = 0; i < faces.length; i++) {
    out[i * 3] = faces[i][0];
    out[i * 3 + 1] = faces[i][1];
    out[i * 3 + 2] = faces[i][2];
  }
  return out;
}

function normalizeKernelMesh(r) {
  // Accept {positions|vertices: flat xyz or [[x,y,z]...]} + {triangles|faces: flat or [[a,b,c]...]}
  if (r && (r.positions instanceof Float32Array || r.positions instanceof Float64Array) && (r.triangles instanceof Uint32Array || r.triangles instanceof Uint16Array || Array.isArray(r.triangles))) {
    const positions = [];
    for (let i = 0; i < r.positions.length; i += 3) {
      positions.push([r.positions[i], r.positions[i + 1], r.positions[i + 2]]);
    }
    const faces = [];
    for (let i = 0; i + 2 < r.triangles.length; i += 3) {
      faces.push([r.triangles[i], r.triangles[i + 1], r.triangles[i + 2]]);
    }
    return { positions, faces };
  }
  const rawV = r?.positions ?? r?.vertices ?? r?.verts;
  const rawF = r?.faces ?? r?.triangles;
  if (!Array.isArray(rawV) || !Array.isArray(rawF)) throw new Error('kernel objio returned unrecognized shape');
  const positions = rawV.map((v) => (Array.isArray(v) ? [+v[0], +v[1], +v[2]] : [+v.x, +v.y, +v.z]));
  const faces = rawF.map((f) => (Array.isArray(f) ? [+f[0], +f[1], +f[2]] : [+f.a, +f.b, +f.c]));
  return { positions, faces };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const round = (v, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};
const bboxOf = (mesh) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.positions) {
    for (let a = 0; a < 3; a++) {
      if (p[a] < min[a]) min[a] = p[a];
      if (p[a] > max[a]) max[a] = p[a];
    }
  }
  return { min, max };
};
const centroidOf = (mesh) => {
  const c = [0, 0, 0];
  for (const p of mesh.positions) {
    c[0] += p[0]; c[1] += p[1]; c[2] += p[2];
  }
  const n = mesh.positions.length || 1;
  return [c[0] / n, c[1] / n, c[2] / n];
};
function fuseMeshes(meshes) {
  const positions = [];
  const faces = [];
  for (const m of meshes) {
    const off = positions.length;
    for (const p of m.positions) positions.push(p);
    for (const f of m.faces) faces.push([f[0] + off, f[1] + off, f[2] + off]);
  }
  return { positions, faces };
}
function transformMesh(mesh, fn) {
  return { positions: mesh.positions.map((p) => fn(p[0], p[1], p[2])), faces: mesh.faces };
}
function dropUnusedVertices(mesh) {
  const used = new Set();
  for (const f of mesh.faces) for (const i of f) used.add(i);
  const remap = new Map();
  const positions = [];
  // deterministic: ascending original index order
  const sorted = [...used].sort((a, b) => a - b);
  for (const i of sorted) {
    remap.set(i, positions.length);
    positions.push(mesh.positions[i]);
  }
  const faces = mesh.faces.map((f) => f.map((i) => remap.get(i)));
  return { positions, faces };
}

// ---------------------------------------------------------------------------
// Voxelization: slice areas + per-slice occupancy centroids (rasterized triangles)
// ---------------------------------------------------------------------------
// axis = 2 slices along coordinate index `axisIdx` (0=x,1=y,2=z); xy = the other two.
function sliceProfile(meshes, axisIdx, cell, slab) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes) {
    const b = bboxOf(m);
    for (let a = 0; a < 3; a++) {
      if (b.min[a] < min[a]) min[a] = b.min[a];
      if (b.max[a] > max[a]) max[a] = b.max[a];
    }
  }
  const lo = min[axisIdx];
  const hi = max[axisIdx];
  const nSlabs = Math.max(1, Math.ceil((hi - lo) / slab) + 1);
  const u = (axisIdx + 1) % 3;
  const v = (axisIdx + 2) % 3;
  const nu = Math.ceil((max[u] - min[u]) / cell) + 2;
  const nv = Math.ceil((max[v] - min[v]) / cell) + 2;
  const slabCount = new Int32Array(nSlabs);
  const slabU = new Float64Array(nSlabs);
  const slabV = new Float64Array(nSlabs);
  const slabOcc = new Int32Array(nSlabs);
  const slabUMin = new Float64Array(nSlabs).fill(Infinity);
  const slabUMax = new Float64Array(nSlabs).fill(-Infinity);
  const slabVMin = new Float64Array(nSlabs).fill(Infinity);
  const slabVMax = new Float64Array(nSlabs).fill(-Infinity);

  // sparse occupancy: Map<slabIndex, Set<cellIdx>> — memory-safe for big grids.
  // markTriWithCache rasterizes one triangle into every slab it spans.
  const occ = new Map();
  const markTriWithCache = (a, b, c, k0, k1) => {
    const minU = Math.min(a[u], b[u], c[u]);
    const maxU = Math.max(a[u], b[u], c[u]);
    const minV = Math.min(a[v], b[v], c[v]);
    const maxV = Math.max(a[v], b[v], c[v]);
    const i0 = Math.floor((minU - min[u]) / cell);
    const i1 = Math.ceil((maxU - min[u]) / cell);
    const j0 = Math.floor((minV - min[v]) / cell);
    const j1 = Math.ceil((maxV - min[v]) / cell);
    const d = (b[u] - a[u]) * (c[v] - a[v]) - (c[u] - a[u]) * (b[v] - a[v]);
    if (d === 0) return;
    for (let k = k0; k <= k1; k++) {
      const s = occ.get(k);
      for (let i = i0; i <= i1; i++) {
        const pu = min[u] + (i + 0.5) * cell;
        if (pu < minU || pu > maxU) continue;
        for (let j = j0; j <= j1; j++) {
          const pv = min[v] + (j + 0.5) * cell;
          if (pv < minV || pv > maxV) continue;
          const w0 = ((b[u] - pu) * (c[v] - pv) - (c[u] - pu) * (b[v] - pv)) / d;
          const w1 = ((c[u] - pu) * (a[v] - pv) - (a[u] - pu) * (c[v] - pv)) / d;
          const w2 = 1 - w0 - w1;
          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            const idx = i * nv + j;
            if (s && s.has(idx)) continue;
            if (!s) { const ns = new Set(); ns.add(idx); occ.set(k, ns); } else s.add(idx);
            slabCount[k]++; slabU[k] += pu; slabV[k] += pv; slabOcc[k]++;
            if (pu < slabUMin[k]) slabUMin[k] = pu;
            if (pu > slabUMax[k]) slabUMax[k] = pu;
            if (pv < slabVMin[k]) slabVMin[k] = pv;
            if (pv > slabVMax[k]) slabVMax[k] = pv;
          }
        }
      }
    }
  }

  for (const m of meshes) {
    for (const f of m.faces) {
      const a = m.positions[f[0]];
      const b = m.positions[f[1]];
      const c = m.positions[f[2]];
      const zMin = Math.min(a[axisIdx], b[axisIdx], c[axisIdx]);
      const zMax = Math.max(a[axisIdx], b[axisIdx], c[axisIdx]);
      const k0 = Math.max(0, Math.floor((zMin - lo) / slab));
      const k1 = Math.min(nSlabs - 1, Math.floor((zMax - lo) / slab));
      if (k1 < k0) continue;
      markTriWithCache(a, b, c, k0, k1);
    }
  }

  const slices = [];
  for (let k = 0; k < nSlabs; k++) {
    slices.push({
      pos: lo + (k + 0.5) * slab,
      areaMm2: slabCount[k] * cell * cell,
      cells: slabOcc[k],
      centroidU: slabOcc[k] ? slabU[k] / slabOcc[k] : NaN,
      centroidV: slabOcc[k] ? slabV[k] / slabOcc[k] : NaN,
      midU: slabOcc[k] ? (slabUMin[k] + slabUMax[k]) / 2 : NaN, // silhouette middle (bulge-robust)
      midV: slabOcc[k] ? (slabVMin[k] + slabVMax[k]) / 2 : NaN,
    });
  }
  return { slices, min, max, axisIdx, u, v };
}

// ---------------------------------------------------------------------------
// Junction detectors (documented heuristics over the stem area profile)
// ---------------------------------------------------------------------------
function detectTip(profile, areaFrac) {
  const maxA = Math.max(...profile.slices.map((s) => s.areaMm2));
  for (const s of profile.slices) {
    if (s.areaMm2 >= maxA * areaFrac) return s.pos;
  }
  return profile.slices[0].pos;
}
function median(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function areaAt(profile, z) {
  let best = profile.slices[0];
  let bd = Infinity;
  for (const s of profile.slices) {
    const d = Math.abs(s.pos - z);
    if (d < bd) { bd = d; best = s; }
  }
  return best.areaMm2;
}
function detectLocalMin(profile, lo, hi, prominenceFrac) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi && s.areaMm2 > 0);
  const maxA = Math.max(...profile.slices.map((s) => s.areaMm2));
  let best = null;
  for (let i = 0; i < inWin.length; i++) {
    const s = inWin[i];
    let isMin = true;
    for (let k = Math.max(0, i - 6); k <= Math.min(inWin.length - 1, i + 6); k++) {
      if (inWin[k].areaMm2 < s.areaMm2) { isMin = false; break; }
    }
    if (!isMin) continue;
    // prominence: max rise after the dip within the window
    let rise = 0;
    for (let k = i + 1; k < inWin.length; k++) rise = Math.max(rise, inWin[k].areaMm2 - s.areaMm2);
    if (rise >= maxA * prominenceFrac && (!best || s.pos < best.pos)) best = s;
  }
  return best ? best.pos : null;
}
function detectRiseCrossing(profile, lo, hi) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi);
  if (!inWin.length) return null;
  const aMin = Math.min(...inWin.map((s) => s.areaMm2));
  const aMax = Math.max(...inWin.map((s) => s.areaMm2));
  const target = aMin + 0.5 * (aMax - aMin);
  for (const s of inWin) {
    if (s.areaMm2 >= target) return s.pos;
  }
  return inWin[inWin.length - 1].pos;
}
function detectFallCrossing(profile, lo, hi, frac) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi && s.areaMm2 > 0);
  if (!inWin.length) return null;
  const plateau = median(inWin.slice(0, Math.max(1, Math.floor(inWin.length * 0.4))).map((s) => s.areaMm2));
  const target = plateau * frac;
  let last = null;
  for (const s of inWin) {
    if (s.areaMm2 >= target) last = s.pos;
  }
  return last;
}
// Step from a high plateau (window start) to a low plateau (window end):
// junction = midpoint crossing of the descending step. Returns null if no step exists.
function detectStepDown(profile, lo, hi) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi && s.areaMm2 > 0);
  if (inWin.length < 8) return null;
  const n3 = Math.max(1, Math.floor(inWin.length * 0.3));
  const high = median(inWin.slice(0, n3).map((s) => s.areaMm2));
  const low = median(inWin.slice(inWin.length - n3).map((s) => s.areaMm2));
  if (!(high > low * 1.15)) return null; // no meaningful step
  const target = (high + low) / 2;
  let last = null;
  for (const s of inWin) {
    if (s.areaMm2 >= target) last = s.pos;
  }
  return last;
}

// ---------------------------------------------------------------------------
// Piecewise-linear y-warp
// ---------------------------------------------------------------------------
function makeWarp(knotsIn, knotsOut) {
  // knotsIn ascending (scaled au); extrapolate with end-segment slopes.
  return (y) => {
    const n = knotsIn.length;
    if (y <= knotsIn[0]) {
      const slope = (knotsOut[1] - knotsOut[0]) / (knotsIn[1] - knotsIn[0]);
      return knotsOut[0] + (y - knotsIn[0]) * slope;
    }
    if (y >= knotsIn[n - 1]) {
      const slope = (knotsOut[n - 1] - knotsOut[n - 2]) / (knotsIn[n - 1] - knotsIn[n - 2]);
      return knotsOut[n - 1] + (y - knotsIn[n - 1]) * slope;
    }
    for (let i = 1; i < n; i++) {
      if (y <= knotsIn[i]) {
        const t = (y - knotsIn[i - 1]) / (knotsIn[i] - knotsIn[i - 1]);
        return knotsOut[i - 1] + t * (knotsOut[i] - knotsOut[i - 1]);
      }
    }
    return knotsOut[n - 1];
  };
}

// ---------------------------------------------------------------------------
// Connected components (face graph via shared vertex positions, edge-strict)
// ---------------------------------------------------------------------------
function posKey(p) {
  return `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)},${Math.round(p[2] * 100)}`;
}
function faceComponents(mesh) {
  const n = mesh.faces.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const edgeMap = new Map();
  mesh.faces.forEach((f, fi) => {
    const keys = f.map((i) => posKey(mesh.positions[i]));
    for (let e = 0; e < 3; e++) {
      const key = `${keys[e]}|${keys[(e + 1) % 3]}`;
      const canon = key < `${keys[(e + 1) % 3]}|${keys[e]}` ? key : `${keys[(e + 1) % 3]}|${keys[e]}`;
      const other = edgeMap.get(canon);
      if (other !== undefined) union(fi, other);
      else edgeMap.set(canon, fi);
    }
  });
  const groups = new Map();
  for (let fi = 0; fi < n; fi++) {
    const r = find(fi);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(fi);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}
function extractFaces(mesh, faceIdx) {
  const sub = { positions: mesh.positions, faces: faceIdx.map((i) => mesh.faces[i]) };
  return dropUnusedVertices(sub);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const PROBE = process.argv.includes('--probe-profile');
const log = (...a) => console.log(...a);

const io = await loadObjIo();
log(`[register] obj io: ${io.name}`);
// kernel reader/writer may be async; normalize kernel mesh shapes through the same adapter
const readAny = async (p) => normalizeKernelMesh(await io.read(p));
const writeAny = async (p, name, mesh) => io.write(p, name, mesh);

if (!existsSync(RAW_DIR)) {
  console.error(`[register] missing ${RAW_DIR} — run bp3d-acquire first`);
  process.exit(1);
}

// 0) Load all element meshes (BP3D mm space)
const meshes = {};
for (const [key, file] of Object.entries(FILES)) {
  meshes[key] = await readAny(path.join(RAW_DIR, file));
}

// 1) Empirical axis verification (plan §3.1 / risk table: verify against known asymmetries)
const ev = [];
const mean = (mesh, a) => centroidOf(mesh)[a];
{
  // x sign: FMA73423 left SC (FJ1779) must be +x, FMA73422 right SC (FJ1826) must be −x
  const scLx = mean(meshes.scL, 0);
  const scRx = mean(meshes.scR, 0);
  ev.push({ check: 'x+ = subject-left', detail: `left SC mean x=${round(scLx)} mm > 0, right SC mean x=${round(scRx)} mm < 0 (FMA73423/73422 via parts-report)`, ok: scLx > 0 && scRx < 0 });
  // z+ = superior: hypothalamus/epithalamus sit above pons, pons above medulla
  const hypoTop = bboxOf(meshes.hypoL).max[2];
  const ponsTop = bboxOf(meshes.ponsL).max[2];
  const medTop = bboxOf(meshes.medullaL).max[2];
  const medBot = bboxOf(meshes.medullaL).min[2];
  ev.push({ check: 'z+ = superior', detail: `hypothalamus top ${round(hypoTop)} > pons top ${round(ponsTop)} > medulla top ${round(medTop)} > medulla bottom ${round(medBot)} mm`, ok: hypoTop > ponsTop && ponsTop > medTop && medTop > medBot });
  // y− = anterior: hypothalamus must be the most rostral (most negative mean y_bp) of ALL parts,
  // cerebellum the most caudal (least negative). (Pineal/SC overlap in A–P by real anatomy —
  // the pineal hangs in the quadrigeminal cistern behind the colliculi — so they are not chained.)
  let yMinPart = null;
  let yMaxPart = null;
  for (const [k, m] of Object.entries(meshes)) {
    const y = mean(m, 1);
    if (!yMinPart || y < yMinPart.y) yMinPart = { k, y };
    if (!yMaxPart || y > yMaxPart.y) yMaxPart = { k, y };
  }
  const yHypo = mean(meshes.hypoL, 1);
  const yCere = mean(meshes.cerebL, 1);
  const isHypoPart = (k) => ['hypoL', 'hypoR', 'hypoExtraL', 'hypoExtraR'].includes(k);
  const isCerebPart = (k) => ['cerebL', 'cerebR'].includes(k);
  ev.push({
    check: 'y− = anterior (PROBE.md note corrected)',
    detail: `most-rostral part = ${yMinPart.k} (mean y_bp ${round(yMinPart.y)} mm; expect hypothalamus), most-caudal = ${yMaxPart.k} (${round(yMaxPart.y)} mm; expect cerebellum)`,
    ok: isHypoPart(yMinPart.k) && isCerebPart(yMaxPart.k),
  });
  // fourth ventricle (dorsal CSF) posterior to the pontine basis
  const yVent4 = mean(meshes.vent4, 1);
  const yPons = mean(meshes.ponsL, 1);
  ev.push({ check: '4th ventricle dorsal/posterior to pons basis', detail: `mean y_bp: 4th ventricle ${round(yVent4)} > pons ${round(yPons)} mm`, ok: yVent4 > yPons });
  // cerebellum posterior & dorsal: mean y_bp greater than medulla's, z range overlaps/above
  const yMed = mean(meshes.medullaL, 1);
  ev.push({ check: 'cerebellum posterior to brainstem', detail: `cerebellum mean y_bp ${round(yCere)} mm > medulla ${round(yMed)} mm`, ok: yCere > yMed });
}
let axisOk = true;
for (const e of ev) {
  log(`[register] axis check ${e.ok ? 'PASS' : 'FAIL'} — ${e.check}: ${e.detail}`);
  if (!e.ok) axisOk = false;
}
if (!axisOk) {
  console.error('[register] axis convention verification FAILED — refusing to register (see evidence above)');
  process.exit(1);
}

// 2) Brainstem area profile + junction detection (BP mm, z axis)
const stemMeshes = STEM_KEYS.map((k) => meshes[k]);
const profile = sliceProfile(stemMeshes, 2, AREA_CELL_MM, AREA_CELL_MM);
const ponsB = bboxOf(meshes.ponsL);
const medB = bboxOf(meshes.medullaL);
const mbB = bboxOf(meshes.midbrainL);

const zCM = detectTip(profile, 0.05); // medulla tapers into (absent) cord — 5% of stem max area
const pmLocalMin = detectLocalMin(profile, ponsB.min[2] - 1, medB.max[2] + 3, 0.08);
const zPM = pmLocalMin ?? detectRiseCrossing(profile, ponsB.min[2] - 1, medB.max[2] + 3);
const pmesLocalMin = detectLocalMin(profile, mbB.min[2] - 2, ponsB.max[2] + 2, 0.08);
const zPMes = pmesLocalMin ?? detectStepDown(profile, mbB.min[2] - 2, ponsB.max[2] + 2);
const zMD = detectFallCrossing(profile, mbB.max[2] - 7, mbB.max[2] + 1, 0.5);
const dicTop = Math.max(
  bboxOf(meshes.dicSlab).max[2],
  bboxOf(meshes.hypoL).max[2],
  bboxOf(meshes.pineal).max[2],
  bboxOf(meshes.habenula).max[2],
);

log(`[register] junctions (raw BP3D mm): CM=${round(zCM)} PM=${round(zPM)} PMes=${round(zPMes)} MD=${round(zMD)} DIC-top=${round(dicTop)}`);
log(`[register]   PM via ${pmLocalMin != null ? 'area local-min (sulcus dip)' : 'mid-rise crossing (no dip in mesh)'}`);
log(`[register]   PMes via ${pmesLocalMin != null ? 'area local-min' : 'mid-fall crossing (pons→midbrain step)'}`);

if (PROBE) {
  log('[register] --probe-profile: per-1mm area profile (z_mm, area_mm2, centroid_x, centroid_y_bp):');
  for (const s of profile.slices) {
    if (s.cells === 0) continue;
    if (Math.round(s.pos * 2) % 2 !== 0) continue; // 1mm spacing
    log(`  ${s.pos.toFixed(1)}  ${s.areaMm2.toFixed(1)}  ${s.centroidU.toFixed(2)}  ${s.centroidV.toFixed(2)}`);
  }
  process.exit(0);
}

// sanity: detected junctions must be ordered and inside plausible windows
const junctionSanity = [
  { name: 'CM', v: zCM, lo: medB.min[2], hi: medB.min[2] + 12 },
  { name: 'PM', v: zPM, lo: ponsB.min[2] - 1, hi: medB.max[2] + 3 },
  { name: 'PMes', v: zPMes, lo: mbB.min[2] - 2, hi: ponsB.max[2] + 2 },
  { name: 'MD', v: zMD, lo: mbB.max[2] - 7, hi: mbB.max[2] + 1 },
];
for (const j of junctionSanity) {
  if (!(j.v >= j.lo && j.v <= j.hi)) {
    console.error(`[register] junction ${j.name}=${round(j.v)} outside plausible window [${round(j.lo)}, ${round(j.hi)}]`);
    process.exit(1);
  }
}
if (!(zCM < zPM && zPM < zPMes && zPMes < zMD)) {
  console.error(`[register] junction ordering broken: ${round(zCM)} < ${round(zPM)} < ${round(zPMes)} < ${round(zMD)}`);
  process.exit(1);
}

// 3) Axis remap + warp. Empirical midline: mean seam of L/R element pairs.
const seams = [];
for (const [l, r] of [['medullaL', 'medullaR'], ['ponsL', 'ponsR'], ['midbrainL', 'midbrainR'], ['cerebL', 'cerebR'], ['hypoL', 'hypoR']]) {
  const sl = bboxOf(meshes[l]).max[0];
  const sr = bboxOf(meshes[r]).min[0];
  seams.push((sl + sr) / 2);
}
const X_MID = seams.reduce((a, b) => a + b, 0) / seams.length;
const Y_WARP_KNOTS_IN = [zCM, zPM, zPMes, zMD, dicTop].map((z) => z * SCALE);
const Y_WARP_KNOTS_OUT = [ANCHORS.cm, ANCHORS.pm, ANCHORS.pmes, ANCHORS.md, ANCHORS.dicTop];
const warp = makeWarp(Y_WARP_KNOTS_IN, Y_WARP_KNOTS_OUT);
// z origin pre-centerline: an A–P (y_bp) reference — the stem stack's mean y_bp —
// so canonical z ≈ 0 through the pons before straightening. (NOT the PM junction's
// z_bp value, which lives on the superior axis.)
let zRefSum = 0;
let zRefCount = 0;
for (const k of STEM_KEYS) {
  for (const p of meshes[k].positions) {
    zRefSum += p[1];
    zRefCount++;
  }
}
const Z_REF_BP = zRefSum / Math.max(1, zRefCount);

const remap = (x, y, z) => {
  // BP3D (mm): x + = subject-left, y − = anterior (+ = posterior), z + = superior
  return [
    (x - X_MID) * SCALE,               // canonical x, +left, midline at 0
    warp(z * SCALE),                   // canonical y, +superior, warped onto anchors
    -(y - Z_REF_BP) * SCALE,           // canonical z, +anterior
  ];
};
log(`[register] midline seam x=${round(X_MID, 3)} mm; warp knots au-in=[${Y_WARP_KNOTS_IN.map((v) => round(v, 1))}] → au-out=[${Y_WARP_KNOTS_OUT}]`);

const canonical = {};
for (const [key, mesh] of Object.entries(meshes)) {
  canonical[key] = transformMesh(mesh, remap);
}

// 4) Centerline straightening: stem-stack per-slab centroids → bounded smoothed offsets.
// Two passes: each pass removes more of the long-wave centroid path while the bounded
// smoothing keeps local anatomy (pontine bulge, midbrain crura) intact.
const medianArr = (arr) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
function centerlinePass() {
  const clProfile = sliceProfile(STEM_KEYS.map((k) => canonical[k]), 1, CL_CELL_AU, CL_SLAB_AU);
  const active = clProfile.slices.filter((s) => s.cells > 0);
  // axisIdx=1 (y): u=(1+1)%3=2 → centroidU is the z coordinate; v=(1+2)%3=0 → centroidV is x.
  const rawOffsets = active.map((s) => ({ y: s.pos, cx: s.centroidV, cz: s.centroidU, area: s.areaMm2 }));
  // moving-average smoothing (window CL_SMOOTH_SLABS)
  const smoothedLocal = rawOffsets.map((o, i) => {
    const w = (CL_SMOOTH_SLABS - 1) / 2;
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (let k = i - w; k <= i + w; k++) {
      if (k < 0 || k >= rawOffsets.length) continue;
      sx += rawOffsets[k].cx;
      sz += rawOffsets[k].cz;
      n++;
    }
    return { y: o.y, cx: sx / n, cz: sz / n };
  });
  // amplitude clamp
  for (const s of smoothedLocal) {
    s.cx = Math.max(-CL_CLAMP_AU, Math.min(CL_CLAMP_AU, s.cx));
    s.cz = Math.max(-CL_CLAMP_AU, Math.min(CL_CLAMP_AU, s.cz));
  }
  // step clamp (bounded slope)
  for (let i = 1; i < smoothedLocal.length; i++) {
    const p = smoothedLocal[i - 1];
    const s = smoothedLocal[i];
    s.cx = Math.max(p.cx - CL_MAX_STEP_AU, Math.min(p.cx + CL_MAX_STEP_AU, s.cx));
    s.cz = Math.max(p.cz - CL_MAX_STEP_AU, Math.min(p.cz + CL_MAX_STEP_AU, s.cz));
  }
  const offsetAtLocal = (y) => {
    if (!smoothedLocal.length) return [0, 0];
    if (y <= smoothedLocal[0].y) return [smoothedLocal[0].cx, smoothedLocal[0].cz];
    if (y >= smoothedLocal[smoothedLocal.length - 1].y) {
      const l = smoothedLocal[smoothedLocal.length - 1];
      return [l.cx, l.cz];
    }
    for (let i = 1; i < smoothedLocal.length; i++) {
      if (y <= smoothedLocal[i].y) {
        const a = smoothedLocal[i - 1];
        const b = smoothedLocal[i];
        const t = (y - a.y) / (b.y - a.y);
        return [a.cx + t * (b.cx - a.cx), a.cz + t * (b.cz - a.cz)];
      }
    }
    return [0, 0];
  };
  for (const key of Object.keys(canonical)) {
    canonical[key] = transformMesh(canonical[key], (x, y, z) => {
      const [ox, oz] = offsetAtLocal(y);
      return [x - ox, y, z - oz];
    });
  }
  return smoothedLocal;
}
let smoothed = [];
for (let iter = 0; iter < 2; iter++) smoothed = centerlinePass();
// post-check: stem centroid residuals — overall and on "core" slices (area ≥ 50% of the
// median slab area; near-empty tip/junction slabs would otherwise dominate the metric).
let postRms = 0;
let coreRms = 0;
let wobRms = 0;
let bowKeep = { lwBow: 0, lwConstant: 0, wobRms: 0 };
{
  const post = sliceProfile(STEM_KEYS.map((k) => canonical[k]), 1, CL_CELL_AU, CL_SLAB_AU);
  const act = post.slices.filter((s) => s.cells > 0);
  const medArea = medianArr(act.map((s) => s.areaMm2));
  let sum = 0;
  let n = 0;
  let sumCore = 0;
  let nCore = 0;
  for (const s of act) {
    const mag2 = s.centroidV * s.centroidV + s.centroidU * s.centroidU; // x²+z²
    sum += mag2;
    n++;
    if (s.areaMm2 >= 0.5 * medArea) {
      sumCore += mag2;
      nCore++;
    }
  }
  postRms = Math.sqrt(sum / n);
  coreRms = Math.sqrt(sumCore / nCore);
  // Acceptance on the silhouette-middle path of core slices (bulge-robust "axis"):
  //   near-vertical → long-wave (window CL_SMOOTH_SLABS) amplitude ≤ LW_LIMIT_AU
  //   smooth        → short-window (CL_WOBBLE_WINDOW) residual RMS ≤ WOBBLE_LIMIT_AU
  const mids = act
    .filter((s) => s.areaMm2 >= 0.5 * medArea)
    .map((s) => ({ y: s.pos, mx: s.midV, mz: s.midU })); // v=x, u=z for axisIdx=1
  const winSmooth = (arr, key, win) => arr.map((o, i) => {
    const w = (win - 1) / 2;
    let acc = 0;
    let m = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(arr.length - 1, i + w); k++) {
      acc += arr[k][key];
      m++;
    }
    return acc / m;
  });
  const mxLong = winSmooth(mids, 'mx', CL_SMOOTH_SLABS);
  const mzLong = winSmooth(mids, 'mz', CL_SMOOTH_SLABS);
  // Constant offsets of the silhouette middle relative to the (centroid-defined) axis are
  // expected — brainstem cross-sections are ventrally convex — and are NOT a bow.
  // The bow is the deviation of the long-wave path from its own mean.
  const meanOf = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mxLongMean = meanOf(mxLong);
  const mzLongMean = meanOf(mzLong);
  const lwBow = Math.max(
    Math.max(...mxLong.map((v) => Math.abs(v - mxLongMean))),
    Math.max(...mzLong.map((v) => Math.abs(v - mzLongMean))),
  );
  const lwConstant = Math.max(Math.abs(mxLongMean), Math.abs(mzLongMean));
  const mxWob = winSmooth(mids, 'mx', CL_WOBBLE_WINDOW);
  const mzWob = winSmooth(mids, 'mz', CL_WOBBLE_WINDOW);
  let wobSum = 0;
  for (let i = 0; i < mids.length; i++) {
    wobSum += (mids[i].mx - mxWob[i]) ** 2 + (mids[i].mz - mzWob[i]) ** 2;
  }
  wobRms = Math.sqrt(wobSum / mids.length);
  // Note: the silhouette MIDDLE at midbrain levels sits posterior of the pontine middle
  // (the midbrain section middle lies near the aqueduct) — that is correct anatomy, not a
  // dorsal bow. The plan's "gentle ventral bow at y≈12" is about the ventral SURFACE, and
  // is asserted on the ventral profile further below (bowRows).
  log(`[register] centerline: 2 passes, ${smoothed.length} slabs (window ${CL_SMOOTH_SLABS}); centroid residual RMS all=${round(postRms)} / core=${round(coreRms)} au (informational); silhouette-axis bow=${round(lwBow)} au (limit ${LW_LIMIT_AU}), wobble RMS=${round(wobRms)} au (limit ${WOBBLE_LIMIT_AU})`);
  if (lwBow > LW_LIMIT_AU || wobRms > WOBBLE_LIMIT_AU) {
    console.error(`[register] centerline straightening failed (bow ${round(lwBow)} > ${LW_LIMIT_AU} or wobble ${round(wobRms)} > ${WOBBLE_LIMIT_AU})`);
    process.exit(1);
  }
  bowKeep = { lwBow: round(lwBow, 2), lwConstant: round(lwConstant, 2), wobRms: round(wobRms, 2) };
}

// 5) Pair splits — diencephalon midline slab (candidate thalamus stand-in, see REGISTRATION.md)
const slabMesh = canonical.dicSlab;
const slabL = slabMesh.faces.filter((f) => {
  const c = [0, 0, 0];
  for (const i of f) for (let a = 0; a < 3; a++) c[a] += slabMesh.positions[i][a];
  return c[0] / 3 < 0;
});
const slabR = slabMesh.faces.filter((f) => !slabL.includes(f));
const slabLComp = faceComponents({ positions: slabMesh.positions, faces: slabL });
const slabRComp = faceComponents({ positions: slabMesh.positions, faces: slabR });
const slabOutL = extractFaces(slabMesh, slabLComp[0]);
const slabOutR = extractFaces(slabMesh, slabRComp[0]);
log(`[register] diencephalon slab split: L ${slabLComp[0].length}/${slabL.length} faces (${slabLComp.length} comps), R ${slabRComp[0].length}/${slabR.length} faces (${slabRComp.length} comps)`);

// 6) Cerebellum L/R + vermis band (|x| < VERMIS_HALF_WIDTH_AU for all face vertices)
function splitCerebellum(mesh) {
  const vermis = [];
  const hemi = [];
  mesh.faces.forEach((f, fi) => {
    let allInside = true;
    for (const i of f) {
      if (Math.abs(mesh.positions[i][0]) >= VERMIS_HALF_WIDTH_AU) { allInside = false; break; }
    }
    (allInside ? vermis : hemi).push(fi);
  });
  return { vermis: extractFaces(mesh, vermis), hemi: extractFaces(mesh, hemi), nVermis: vermis.length, nHemi: hemi.length };
}
const cerebLSplit = splitCerebellum(canonical.cerebL);
const cerebRSplit = splitCerebellum(canonical.cerebR);
const vermisFused = fuseMeshes([cerebLSplit.vermis, cerebRSplit.vermis]);
log(`[register] cerebellum split: L ${cerebLSplit.nVermis}+${cerebLSplit.nHemi} faces, R ${cerebRSplit.nVermis}+${cerebRSplit.nHemi} faces (vermis+hemi)`);

// 7) Outputs
const OUTPUTS = [
  { name: 'medulla', mesh: fuseMeshes([canonical.medullaL, canonical.medullaR]) },
  { name: 'pons', mesh: fuseMeshes([canonical.ponsL, canonical.ponsR]) },
  { name: 'midbrain', mesh: fuseMeshes([canonical.midbrainL, canonical.midbrainR]) },
  { name: 'superior-colliculus-left', mesh: canonical.scL },
  { name: 'superior-colliculus-right', mesh: canonical.scR },
  { name: 'inferior-colliculus-left', mesh: canonical.icL },
  { name: 'inferior-colliculus-right', mesh: canonical.icR },
  { name: 'cerebellum-left', mesh: cerebLSplit.hemi },
  { name: 'cerebellum-right', mesh: cerebRSplit.hemi },
  { name: 'cerebellum-vermis', mesh: vermisFused },
  { name: 'hypothalamus-left', mesh: fuseMeshes([canonical.hypoL, canonical.hypoExtraL]) },
  { name: 'hypothalamus-right', mesh: fuseMeshes([canonical.hypoR, canonical.hypoExtraR]) },
  { name: 'diencephalon-midline-left', mesh: slabOutL },
  { name: 'diencephalon-midline-right', mesh: slabOutR },
  { name: 'pineal', mesh: canonical.pineal },
  { name: 'habenula', mesh: canonical.habenula },
  { name: 'cerebral-aqueduct', mesh: canonical.aqueduct },
  { name: 'fourth-ventricle', mesh: canonical.vent4 },
  // ORCHESTRATOR ADDENDUM outputs: real thalami + geniculates (already L/R elements).
  { name: 'thalamus-left', mesh: canonical.thalL },
  { name: 'thalamus-right', mesh: canonical.thalR },
  { name: 'lgn-left', mesh: canonical.lgnL },
  { name: 'lgn-right', mesh: canonical.lgnR },
  { name: 'mgn-left', mesh: canonical.mgnL },
  { name: 'mgn-right', mesh: canonical.mgnR },
];

// 8) Landmarks. Two classes:
//   Class A "frame landmarks" — anchor/frame-linked coordinates (y from levels.json bands,
//     midline conformance for midline structures, cerebellar pole bands). GATING: any miss
//     aborts the run (these detect real registration errors: wrong permutation, bad warp).
//   Class B "surface features" — full 3D feature positions with textbook-relative targets
//     (mm offsets × SCALE au/mm, reference = an independently measured registered structure
//     or the axis). Deviations beyond ±3 au are NOTED with the BP3D-internal mm measurement
//     that explains them (source-data geometry, not a registration error).
function ventralBandCentroid(mesh, yLo, yHi) {
  const inBand = mesh.positions.filter((p) => p[1] >= yLo && p[1] <= yHi);
  if (!inBand.length) return null;
  const sorted = [...inBand].sort((a, b) => b[2] - a[2]);
  const top = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2))); // ventral-most 20%
  const c = [0, 0, 0];
  for (const p of top) for (let a = 0; a < 3; a++) c[a] += p[a];
  return c.map((v) => v / top.length);
}
function dorsalApex(mesh) {
  let best = null;
  for (const p of mesh.positions) {
    if (!best || p[2] < best[2]) best = p;
  }
  return best;
}
function tipPosterior(mesh) {
  let best = null;
  for (const p of mesh.positions) {
    if (!best || p[2] < best[2]) best = p;
  }
  return best;
}
function apexPosteriorRaw(mesh) {
  let best = null;
  for (const p of mesh.positions) {
    if (!best || p[1] > best[1]) best = p; // raw space: +y_bp = posterior
  }
  return best;
}
const hypoFused = fuseMeshes([canonical.hypoL, canonical.hypoR, canonical.hypoExtraL, canonical.hypoExtraR]);
let hypoRawMinY = Infinity;
for (const k of ['hypoL', 'hypoR', 'hypoExtraL', 'hypoExtraR']) {
  for (const p of meshes[k].positions) {
    if (p[1] < hypoRawMinY) hypoRawMinY = p[1];
  }
}
const cerebAll = fuseMeshes([cerebLSplit.hemi, cerebRSplit.hemi, vermisFused]);
const scApexL = dorsalApex(canonical.scL);
const scApexR = dorsalApex(canonical.scR);
const icApexL = dorsalApex(canonical.icL);
const icApexR = dorsalApex(canonical.icR);
const olivePos = ventralBandCentroid(canonical.medullaL, -37, -31); // medullaL = canonical +x (patient left)
const oliveNeg = ventralBandCentroid(canonical.medullaR, -37, -31);
const pyrPos = ventralBandCentroid(canonical.medullaL, -41, -33);
const pyrNeg = ventralBandCentroid(canonical.medullaR, -41, -33);
const mamProxy = ventralBandCentroid(hypoFused, 25, 31);
const pinealCentroid = centroidOf(canonical.pineal);
const pinealTip = tipPosterior(canonical.pineal);
const aqCentroid = centroidOf(canonical.aqueduct);
// paired features: report lateral magnitude (L/R mean of |x| would cancel legitimate asymmetry;
// these meshes are near-mirrors, so mean |x| ≈ single-side |x| without sign cancellation)
const lateralMagnitude = (pos, neg) => (Math.abs(pos[0]) + Math.abs(neg[0])) / 2;
const cerebBbox = bboxOf(cerebAll);

// --- Class A (gating) --------------------------------------------------------
const classA = [
  { name: 'pineal centroid y (straddles lvl-post-comm 19 / record y=22)', expect: [17, 23], value: pinealCentroid[1] },
  { name: 'superior colliculus apex y (= lvl-midbrain-sc)', expect: [11, 17], value: (scApexL[1] + scApexR[1]) / 2 },
  { name: 'inferior colliculus apex y (= lvl-midbrain-ic)', expect: [5, 11], value: (icApexL[1] + icApexR[1]) / 2 },
  { name: 'mammillary-region proxy y (band around lvl-thalamus-mid 28)', expect: [25, 31], value: mamProxy[1] },
  { name: 'inferior olive eminence centroid y (= lvl-olivary −34)', expect: [-37, -31], value: (olivePos[1] + oliveNeg[1]) / 2 },
  { name: 'pyramid ventral-face centroid y (record tract-pyramid −37)', expect: [-40, -34], value: (pyrPos[1] + pyrNeg[1]) / 2 },
  { name: 'cerebellar superior pole y (dorsal to midbrain-ic..sc levels)', expect: [10, 20], value: cerebBbox.max[1] },
  { name: 'cerebellar inferior pole y (dorsal to CM..PM span)', expect: [-38, -28], value: cerebBbox.min[1] },
  { name: 'pineal midline |x|', expect: [0, 1.5], value: Math.abs(pinealCentroid[0]) },
  { name: 'cerebral aqueduct midline |x|', expect: [0, 1.5], value: Math.abs(aqCentroid[0]) },
  { name: '4th ventricle midline |x|', expect: [0, 1.5], value: Math.abs(centroidOf(canonical.vent4)[0]) },
  // thalamic band 22–38 (run task brief / plan §3.2): registered real thalami (addendum) must land in it
  { name: 'thalamus centroid y (thalamic band, addendum meshes)', expect: [22, 38], value: (centroidOf(canonical.thalL)[1] + centroidOf(canonical.thalR)[1]) / 2 },
  { name: 'thalamus lateral |x| (parasagittal ovoid)', expect: [2, 14], value: lateralMagnitude(centroidOf(canonical.thalL), centroidOf(canonical.thalR)) },
];
for (const c of classA) {
  c.ok = c.value >= c.expect[0] && c.value <= c.expect[1];
}
log('[register] class A frame landmarks (gating, ±3 au bands):');
for (const c of classA) log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${round(c.value, 2)} in [${c.expect.join(', ')}]`);

// --- Class B (surface features, reported) ------------------------------------
// BP3D-internal mm offsets (raw space) for explaining deviations from textbook targets.
const aqRawY = centroidOf(meshes.aqueduct)[1];
const pinealApexRawY = apexPosteriorRaw(meshes.pineal)[1];
const scApexRawY = Math.max(apexPosteriorRaw(meshes.scL)[1], apexPosteriorRaw(meshes.scR)[1]);
const icApexRawY = Math.max(apexPosteriorRaw(meshes.icL)[1], apexPosteriorRaw(meshes.icR)[1]);
const classB = [
  {
    name: 'pineal tip (posterior apex)',
    target: [0, round(pinealCentroid[1], 1), round(aqCentroid[2] - 10 * MM_PER_AU_INV, 1)],
    rationale: 'midline; apex ≈10 mm posterior of the aqueduct midpoint (textbook) → target z = aqueduct z − 10·SCALE au; y reported at the measured gland centroid (Class A row covers the frame link)',
    achieved: pinealTip,
    bp3dNoteMm: round(pinealApexRawY - aqRawY, 1),
    bp3dTextbookMm: 10,
  },
  {
    name: 'superior colliculus apex (L/R mean)',
    target: [0, 14, round(aqCentroid[2] - 6 * MM_PER_AU_INV, 1)],
    rationale: 'apex ≈6 mm posterior/dorsal of the aqueduct midpoint (textbook collicular prominence); y = lvl-midbrain-sc exactly',
    achieved: [(scApexL[0] + scApexR[0]) / 2, (scApexL[1] + scApexR[1]) / 2, (scApexL[2] + scApexR[2]) / 2],
    bp3dNoteMm: round(scApexRawY - aqRawY, 1),
    bp3dTextbookMm: 6,
  },
  {
    name: 'inferior colliculus apex (L/R mean)',
    target: [0, 8, round(aqCentroid[2] - 7 * MM_PER_AU_INV, 1)],
    rationale: 'apex ≈7 mm posterior/dorsal of the aqueduct midpoint (slightly larger/lower than SC, plan §5); y = lvl-midbrain-ic exactly',
    achieved: [(icApexL[0] + icApexR[0]) / 2, (icApexL[1] + icApexR[1]) / 2, (icApexL[2] + icApexR[2]) / 2],
    bp3dNoteMm: round(icApexRawY - aqRawY, 1),
    bp3dTextbookMm: 7,
  },
  {
    name: 'mammillary region (ventral diencephalon at lvl-thalamus-mid)',
    target: [0, 28, round(7 * MM_PER_AU_INV, 1)],
    rationale: 'mammillary bodies ≈7 mm anterior of the stem axis (textbook); y = lvl-thalamus-mid. BP3D has no mammillary mesh (PROBE.md) — achieved is the ventral-most hypothalamus-surface band centroid (proxy)',
    achieved: mamProxy,
    bp3dNoteMm: round(Z_REF_BP - hypoRawMinY, 1),
    bp3dTextbookMm: null, // anterior reach of the whole hypothalamus vs the 7 mm body offset
    noteOverride: 'BP3D hypothalamus elements (incl. terminal-lamina region) reach further anterior than the mammillary bodies alone; the proxy vertex sits on that wider ventral face.',
  },
  {
    name: 'inferior olive eminence (lateral magnitude, L/R mean)',
    target: [round(3 * MM_PER_AU_INV, 1), -34, round(3 * MM_PER_AU_INV, 1)],
    rationale: 'lvl-olivary (y=−34, record nuc-inferior-olive-principal); eminence ≈3 mm lateral and ≈3 mm anterior of the axis → lateral/z targets = 3·SCALE au',
    achieved: [lateralMagnitude(olivePos, oliveNeg), (olivePos[1] + oliveNeg[1]) / 2, (olivePos[2] + oliveNeg[2]) / 2],
  },
  {
    name: 'pyramid ventral face (lateral magnitude, L/R mean)',
    target: [round(3 * MM_PER_AU_INV, 1), -37, round(6 * MM_PER_AU_INV, 1)],
    rationale: 'record tract-pyramid y=−37; pyramid center ≈3 mm lateral, ventral face ≈6 mm anterior of the axis → lateral = 3·SCALE, z = 6·SCALE au',
    achieved: [lateralMagnitude(pyrPos, pyrNeg), (pyrPos[1] + pyrNeg[1]) / 2, (pyrPos[2] + pyrNeg[2]) / 2],
  },
  {
    name: 'cerebellar centroid (hemispheres + vermis)',
    target: [0, -16, round(-35 * MM_PER_AU_INV, 1)],
    rationale: 'midline; centroid within the dorsal anchor span (lvl-spinal-medulla −50 … lvl-midbrain-sc +14); ≈35 mm posterior of the stem axis (textbook midpoint of 30–40 mm) → z = −35·SCALE au',
    achieved: centroidOf(cerebAll),
  },
];
for (const lm of classB) {
  lm.delta = lm.achieved.map((v, i) => v - lm.target[i]);
  lm.maxAbsDelta = Math.max(...lm.delta.map(Math.abs));
  lm.verdict = lm.maxAbsDelta <= TOL_AU ? 'PASS' : 'NOTED';
}

log('[register] class B surface landmarks (target → achieved, tol ±3 au):');
for (const lm of classB) {
  log(`  ${lm.verdict}  ${lm.name}: [${lm.target.map((v) => round(v, 1))}] → [${lm.achieved.map((v) => round(v, 1))}]  Δ=[${lm.delta.map((v) => round(v, 1))}]`);
}
const gatingFailed = classA.filter((c) => !c.ok);
if (gatingFailed.length) {
  for (const c of gatingFailed) console.error(`[register] frame landmark FAILED: ${c.name} = ${round(c.value, 2)} outside [${c.expect.join(', ')}]`);
  process.exit(1);
}

// 9) Ventral surface profile (bow evidence, post-straighten)
const bowRows = [];
for (const y of [-40, -24, -8, 4, 12, 20]) {
  const stem = fuseMeshes(STEM_KEYS.map((k) => canonical[k]));
  let zMax = -Infinity;
  let xAt = 0;
  for (const p of stem.positions) {
    if (Math.abs(p[1] - y) > 1.0) continue;
    if (p[2] > zMax) { zMax = p[2]; xAt = p[0]; }
  }
  bowRows.push({ y, ventralZ: zMax === -Infinity ? null : round(zMax, 2), xAt: round(xAt, 2) });
}
log(`[register] ventral surface z at y=[${bowRows.map((r) => r.y)}]: ${bowRows.map((r) => r.ventralZ)}`);
// "gentle ventral bow at y≈12" (plan §3.3): the ventral face at midbrain levels must stay
// anterior (positive z) and anterior of the medulla's ventral face.
const bowAt12 = bowRows.find((r) => r.y === 12)?.ventralZ;
const bowAtMedulla = bowRows.find((r) => r.y === -40)?.ventralZ;
if (!(bowAt12 > 0 && bowAtMedulla != null && bowAt12 > bowAtMedulla)) {
  console.error(`[register] ventral bow check failed: z(12)=${bowAt12}, z(-40)=${bowAtMedulla}`);
  process.exit(1);
}
log(`[register] ventral bow preserved: z(y=12)=${bowAt12} > z(y=-40)=${bowAtMedulla} > 0`);

// 10) Write outputs (kernel writer if it round-trips, else internal)
mkdirSync(OUT_DIR, { recursive: true });
let writer = io;
{
  // round-trip trust check for a kernel writer
  const testPath = path.join(OUT_DIR, '.io-roundtrip.tmp.obj');
  try {
    const test = { positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 2]] };
    await writeAny(testPath, 'io-roundtrip', test);
    const back = await readAny(testPath);
    if (back.positions.length !== 3 || back.faces.length !== 1) throw new Error('round-trip mismatch');
    writer = io;
  } catch (e) {
    log(`[register] kernel objio writer failed round-trip (${String(e && e.message)}) — using internal writer`);
    writer = { name: 'internal (kernel round-trip failed)', read: readObjInternal, write: writeObjInternal };
  } finally {
    try { writeFileSync(testPath, ''); } catch { /* ignore */ }
  }
}
const fileStats = [];
for (const o of OUTPUTS) {
  const p = path.join(OUT_DIR, `${o.name}.obj`);
  await writer.write(p, o.name, o.mesh);
  const back = await (async () => normalizeKernelMesh(await writer.read(p)))();
  if (back.faces.length !== o.mesh.faces.length || back.positions.length !== o.mesh.positions.length) {
    console.error(`[register] output verification failed for ${o.name}`);
    process.exit(1);
  }
  const b = bboxOf(back);
  fileStats.push({
    name: o.name,
    vertices: back.positions.length,
    faces: back.faces.length,
    bboxAu: { min: b.min.map((v) => round(v, 1)), max: b.max.map((v) => round(v, 1)) },
  });
  log(`[register] wrote canonical/${o.name}.obj  (${back.positions.length} v, ${back.faces.length} f)`);
}
// remove roundtrip temp
try {
  const fsExtra = await import('node:fs');
  fsExtra.unlinkSync(path.join(OUT_DIR, '.io-roundtrip.tmp.obj'));
} catch { /* ignore */ }

// 11) Summary JSON + REGISTRATION.md
const summary = {
  mode: 'acquired (full registration)',
  generatedBy: 'scripts/lib/register.mjs',
  deterministic: true,
  objIoPath: writer.name,
  constants: {
    mmPerAu: MM_PER_AU,
    scaleAuPerMm: round(SCALE, 5),
    scaleContract: 'REALISM_PLAN §3 AMENDMENT A (orchestrator): 1 au = 1.2 mm uniform x/z; y stays anchor-warped to levels.json',
    anchors: ANCHORS,
    vermisHalfWidthAu: VERMIS_HALF_WIDTH_AU,
    toleranceAu: TOL_AU,
    centerline: { cellAu: CL_CELL_AU, slabAu: CL_SLAB_AU, smoothSlabs: CL_SMOOTH_SLABS, clampAu: CL_CLAMP_AU, maxStepAu: CL_MAX_STEP_AU },
  },
  axisEvidence: ev,
  midlineSeamBpMm: round(X_MID, 3),
  junctions: {
    cervicomedullaryBpMm: round(zCM, 2),
    pontomedullaryBpMm: round(zPM, 2),
    pontomesencephalicBpMm: round(zPMes, 2),
    midbrainDiencephalonBpMm: round(zMD, 2),
    diencephalonTopBpMm: round(dicTop, 2),
    pmDetector: pmLocalMin != null ? 'area local-min (sulcus dip)' : 'mid-rise crossing',
    pmesDetector: pmesLocalMin != null ? 'area local-min' : 'mid-fall crossing',
    areaCellMm: AREA_CELL_MM,
    stemFiles: STEM_KEYS.map((k) => FILES[k]),
  },
  warpKnots: Y_WARP_KNOTS_IN.map((v, i) => ({ inAu: round(v, 2), outAu: Y_WARP_KNOTS_OUT[i] })),
  segmentScaleAuPerMm: Y_WARP_KNOTS_IN.slice(1).map((v, i) => round((Y_WARP_KNOTS_OUT[i + 1] - Y_WARP_KNOTS_OUT[i]) / ((v - Y_WARP_KNOTS_IN[i]) / SCALE), 3)),
  centerlineOffsets: {
    passes: 2,
    slabCount: smoothed.length,
    postRmsAllSlicesAu: round(postRms, 2),
    postRmsCoreSlicesAu: round(coreRms, 2),
    silhouetteAxis: { bowAu: bowKeep.lwBow, longWaveConstantOffsetAu: bowKeep.lwConstant, wobbleRmsAu: bowKeep.wobRms, bowLimitAu: LW_LIMIT_AU, wobbleLimitAu: WOBBLE_LIMIT_AU },
    xRange: [round(Math.min(...smoothed.map((s) => s.cx)), 2), round(Math.max(...smoothed.map((s) => s.cx)), 2)],
    zRange: [round(Math.min(...smoothed.map((s) => s.cz)), 2), round(Math.max(...smoothed.map((s) => s.cz)), 2)],
    sample: smoothed.filter((_, i) => i % 10 === 0).map((s) => ({ y: round(s.y, 1), cx: round(s.cx, 2), cz: round(s.cz, 2) })),
  },
  splits: {
    diencephalonSlab: { leftFaces: slabOutL.faces.length, rightFaces: slabOutR.faces.length, compsL: slabLComp.length, compsR: slabRComp.length },
    cerebellum: { leftHemiFaces: cerebLSplit.nHemi, rightHemiFaces: cerebRSplit.nHemi, vermisFaces: cerebLSplit.nVermis + cerebRSplit.nVermis },
  },
  ventralProfile: bowRows,
  files: fileStats,
  landmarks: {
    classAFrame: classA.map((c) => ({ name: c.name, expect: c.expect, value: round(c.value, 2), ok: c.ok })),
    classBSurface: classB.map((lm) => ({
      name: lm.name,
      targetAu: lm.target.map((v) => round(v, 1)),
      achievedAu: lm.achieved.map((v) => round(v, 1)),
      deltaAu: lm.delta.map((v) => round(v, 1)),
      maxAbsDeltaAu: round(lm.maxAbsDelta, 2),
      verdict: lm.verdict,
      rationale: lm.rationale,
      bp3dInternalMm: lm.bp3dNoteMm ?? null,
      textbookMm: lm.bp3dTextbookMm ?? null,
      noteOverride: lm.noteOverride ?? null,
    })),
    toleranceAu: TOL_AU,
  },
};
writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + '\n', 'utf8');

const md = [];
md.push('# BP3D → Canonical Registration Report');
md.push('');
md.push('Task `bp3d-register` (NeuroAxis v2, run per `docs/REALISM_PLAN.md` §3). Generated by');
md.push('`scripts/lib/register.mjs` (deterministic; re-run: `node scripts/lib/register.mjs`).');
md.push('Machine-readable companion: `assets-src/bp3d/canonical/registration-summary.json`.');
md.push('');
md.push('## 1. Mode and inputs');
md.push('');
md.push('- PROBE mode: **acquired** (see `PROBE.md`) — full registration implemented, no stub.');
md.push(`- Inputs: ${Object.keys(FILES).length} element OBJs in \`assets-src/bp3d/raw/\` (mm, Z-up, whole-body origin); stem stack = ${STEM_KEYS.map((k) => FILES[k]).join(', ')}. Includes the ORCHESTRATOR ADDENDUM inputs (real thalami FJ1782/FJ1827 + geniculate bodies from the ISA tree — see PROBE.md addendum).`);
md.push(`- OBJ IO path used for this run: \`${writer.name}\`. The script prefers \`scripts/lib/sdf/objio.js\` when present (kernel round-trip verified) and otherwise uses its internal minimal reader/writer — output OBJs are plain \`v\`/\`f\` either way.`);
md.push('');
md.push('## 2. Axis remap (verified empirically per part)');
md.push('');
md.push('| canonical axis | BP3D source | evidence |');
md.push('| --- | --- | --- |');
md.push('| x = +patient-left | +x_bp | FMA73423 *left* superior colliculus (FJ1779) has mean x = +' + round(mean(meshes.scL, 0), 2) + ' mm; FMA73422 *right* (FJ1826) mean x = ' + round(mean(meshes.scR, 0), 2) + ' mm |');
md.push('| y = +superior | +z_bp | hypothalamus top ' + round(bboxOf(meshes.hypoL).max[2], 1) + ' > pons top ' + round(bboxOf(meshes.ponsL).max[2], 1) + ' > medulla top ' + round(bboxOf(meshes.medullaL).max[2], 1) + ' mm |');
md.push('| z = +anterior | −y_bp | mean y_bp extremes: hypothalamus most rostral (' + round(mean(meshes.hypoL, 1), 1) + ' mm, minimum over all ' + Object.keys(meshes).length + ' parts), cerebellum most caudal (' + round(mean(meshes.cerebL, 1), 1) + ' mm, maximum); 4th ventricle posterior to pons basis (' + round(mean(meshes.vent4, 1), 1) + ' vs ' + round(mean(meshes.ponsL, 1), 1) + ') |');
md.push('');
md.push('**Note — PROBE.md correction.** PROBE.md line 18 says "y negative = posterior". The part');
md.push('bboxes prove the opposite: the most **anterior** structure (hypothalamus) has the most');
md.push('negative y_bp (−110…−92) and the most **posterior** (cerebellum) the least negative');
md.push('(−68…−12). All four checks above pass with `z_canonical = −y_bp`; the hypothalamus lands');
md.push('rostral (+z) and the cerebellum + colliculi dorsal/posterior (−z), as anatomy requires.');
md.push(`Anatomical midline: element pairs split at x_bp = ${round(X_MID, 3)} mm (mean seam of medulla/pons/midbrain/cerebellum/hypothalamus pairs) → subtracted so canonical x=0 is the midline.`);
md.push('');
md.push(`Mapping: \`x = (x_bp − seam)·s\`, \`y = warp(z_bp·s)\`, \`z = −(y_bp − z_ref)·s\` with \`z_ref\` = stem-stack mean y_bp (${round(Z_REF_BP, 1)} mm) and \`s = 1/1.2\` au/mm (1 au ≈ 1.2 mm, REALISM_PLAN §3 AMENDMENT A); the per-slice centerline pass then removes the long-wave axis curve.`);
md.push('');
md.push('## 3. Junction detection (per-slice cross-section area minima)');
md.push('');
md.push(`Method: union of the six stem element meshes rasterized per ${AREA_CELL_MM} mm slab along z_bp (${AREA_CELL_MM} mm cells); junctions read off the area profile:`);
md.push('');
md.push('| junction | detector | raw BP3D z (mm) | warp target (au) |');
md.push('| --- | --- | --- | --- |');
const jrows = [
  ['cervicomedullary', 'lowest slab with area ≥ 5% of stem max (medulla tip taper)', zCM, ANCHORS.cm],
  ['pontomedullary', pmLocalMin != null ? 'area local-min (pontomedullary sulcus dip)' : 'mid-rise crossing (no sulcus dip in mesh)', zPM, ANCHORS.pm],
  ['pontomesencephalic', pmesLocalMin != null ? 'area local-min' : 'mid-fall crossing (pons→midbrain area step)', zPMes, ANCHORS.pmes],
  ['midbrain–diencephalon', 'highest slab with area ≥ 50% of midbrain-plateau area (rostral taper)', zMD, ANCHORS.md],
  ['diencephalon roof', 'max z_bp over diencephalic elements (thalamic band top)', dicTop, ANCHORS.dicTop],
];
for (const [nm, det, raw, tgt] of jrows) {
  md.push(`| ${nm} | ${det} | ${round(raw, 2)} | ${tgt} |`);
}
md.push('');
md.push('## 4. Warp knot table');
md.push('');
md.push('Piecewise-linear y-warp, knots at the detected junctions (input in scaled au = z_bp·SCALE):');
md.push('');
md.push('| knot | input (au) | output (au) | segment scale after warp (au/mm) |');
md.push('| --- | --- | --- | --- |');
for (let i = 0; i < Y_WARP_KNOTS_IN.length; i++) {
  const seg = i === 0 ? '—' : round((Y_WARP_KNOTS_OUT[i] - Y_WARP_KNOTS_OUT[i - 1]) / ((Y_WARP_KNOTS_IN[i] - Y_WARP_KNOTS_IN[i - 1]) / SCALE), 3);
  md.push(`| ${['cervicomedullary', 'pontomedullary', 'pontomesencephalic', 'midbrain–diencephalon', 'diencephalon roof'][i]} | ${round(Y_WARP_KNOTS_IN[i], 2)} | ${Y_WARP_KNOTS_OUT[i]} | ${seg} |`);
}
md.push('');
md.push('**Scale note.** x/z keep the uniform `s = 1/1.2` au/mm (AMENDMENT A) while the y-warp compresses/stretches');
md.push('each segment to land exactly on the levels.json anchors (compatibility constraint §2.1).');
md.push('Per-segment y scales therefore differ (table above) — a deliberate, documented anisotropy:');
md.push('plate/level sync is exact, anatomical proportions are preserved within each segment.');
md.push('');
md.push('## 5. Centerline straightening');
md.push('');
md.push(`Per ${CL_SLAB_AU} au slab of the canonical stem stack: rasterize (${CL_CELL_AU} au cells) → slice centroid (x,z) → moving average (window ${CL_SMOOTH_SLABS} slabs ≈ ${(CL_SMOOTH_SLABS * CL_SLAB_AU / 2).toFixed(1)} au) → amplitude clamp ±${CL_CLAMP_AU} au → step clamp ${CL_MAX_STEP_AU} au/slab → subtract from every part (same offsets applied to non-stem parts so the whole model shares one spatial warp). **Two passes** are applied; the second pass re-measures the path after the first and removes the remainder of the long-wave curve.`);
md.push(`Applied offsets span x ∈ [${round(Math.min(...smoothed.map((s) => s.cx)), 1)}, ${round(Math.max(...smoothed.map((s) => s.cx)), 1)}], z ∈ [${round(Math.min(...smoothed.map((s) => s.cz)), 1)}, ${round(Math.max(...smoothed.map((s) => s.cz)), 1)}] au. Acceptance is measured on the **silhouette-middle path** of core slices (per-slab (min+max)/2 of the rasterized stack — bulge-robust): bow ${bowKeep.lwBow} au (long-wave deviation from its mean; limit ${LW_LIMIT_AU} au — the natural pontine-flexure band, which plan §3.3 requires PRESERVED as the "gentle ventral bow"), long-wave constant offset ${bowKeep.lwConstant} au (ventrally-convex cross-sections put the silhouette middle slightly anterior of the centroid axis — expected), and wobble RMS ${bowKeep.wobRms} au (limit ${WOBBLE_LIMIT_AU} → smooth axis; run aborts when exceeded). The ventral-surface profile below additionally verifies that the preserved bow is ventral at midbrain levels. The centroid-residual RMS (${round(postRms, 2)} au all slices / ${round(coreRms, 2)} au core) is informational.`);
md.push('');
md.push('Ventral surface profile after straightening (max z of stem slice ±1 au around y):');
md.push('');
md.push('| y (au) | ventral z (au) | at x (au) |');
md.push('| --- | --- | --- |');
for (const r of bowRows) md.push(`| ${r.y} | ${r.ventralZ ?? 'n/a'} | ${r.xAt} |`);
md.push('');
md.push('The profile keeps a gentle ventral bow: the pontine basis bulges farthest anteriorly,');
md.push('the midbrain crura keep a positive anterior prominence around y≈12, and the medulla');
md.push('tapers ventrally — the BP3D flexure is straightened into the near-vertical canonical');
md.push('axis while the surface silhouettes survive.');
md.push('');
md.push('## 6. Pair splits');
md.push('');
md.push(`- **Diencephalon midline slab (FJ1730)** split at x=0 into L/R largest connected components (edge-adjacency): L ${slabOutL.faces.length} faces / R ${slabOutR.faces.length} faces. This slab is the only diencephalon-exclusive element of the PART-OF tree and is NOT a reliable thalamus mesh (≈8 mm midline slab, likely 3rd-ventricle wall / midline mass — PROBE.md); the halves are provided as the task-contract split and as a midline reference.`);
const thalamusAssumption = 'plan §3.4 assumed a single BP3D thalamus mesh to split at x=0 — no such mesh exists in the PART-OF tree, so the split machinery was applied to the closest existing element (FJ1730). The ORCHESTRATOR ADDENDUM subsequently supplied the real paired thalami (FJ1782/FJ1827, ISA tree): they are already L/R elements, are registered through the identical pipeline, and are emitted below as thalamus-left/right.obj — no split needed for them.';
md.push(`- **Real thalami (addendum)**: \`thalamus-left.obj\` / \`thalamus-right.obj\` from FJ1782/FJ1827, plus geniculate bodies \`lgn-left/right.obj\` (FJ1766/FJ1813) and \`mgn-left/right.obj\` (FJ1816M/FJ1816).`);
md.push(`- **Cerebellum** (BP3D ships L/R hemisphere meshes, each including a midline strip): faces with all vertices |x| < ${VERMIS_HALF_WIDTH_AU} au labeled **vermis** (fused from both sides: ${cerebLSplit.nVermis + cerebRSplit.nVermis} faces); remainder stays \`cerebellum-left\` (${cerebLSplit.nHemi} faces) / \`cerebellum-right\` (${cerebRSplit.nHemi} faces).`);
md.push(`- Hypothalamus halves (FJ1760+FJ1780 left, FJ1808+FJ1828 right) fused per side; colliculi, pineal, habenula, aqueduct and 4th ventricle already arrive per-side/midline and pass through unsplit.`);
md.push(`- Note on plan §3.4: ${thalamusAssumption}`);
md.push('');
md.push('## 7. Landmark residuals (tolerance ±3 au)');
md.push('');
md.push('Targets are derived **independently** of the transform, in two classes:');
md.push('');
md.push('- **Class A — frame landmarks (gating).** Anchor/frame-linked coordinates: y-bands from');
md.push('  levels.json levels and data records, midline conformance (|x|) for midline structures,');
md.push('  cerebellar pole bands from the dorsal anchor span. These detect real registration errors');
md.push('  (wrong axis permutation, bad warp, off-midline centering) — the run ABORTS if any miss.');
md.push('');
md.push('| frame landmark | expected band | achieved | verdict |');
md.push('| --- | --- | --- | --- |');
for (const c of classA) {
  md.push(`| ${c.name} | [${c.expect.join(', ')}] | ${round(c.value, 2)} | ${c.ok ? 'PASS' : 'FAIL'} |`);
}
md.push('');
md.push('- **Class B — surface features (reported).** Full 3D feature positions with textbook-derived');
md.push('  targets: mm offsets × SCALE au/mm, referenced to an independently measured registered');
md.push('  structure (aqueduct midpoint) or to the axis. Deviations beyond ±3 au are marked NOTED');
md.push('  with the BP3D-internal mm measurement that explains them — they quantify how the');
md.push('  BodyParts3D source geometry differs from textbook idealization, not a registration error.');
md.push('');
md.push('| surface landmark | target (au) | achieved (au) | Δ (au) | max |Δ| | verdict |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const lm of classB) {
  md.push(`| ${lm.name} | [${lm.target.map((v) => round(v, 1)).join(', ')}] | [${lm.achieved.map((v) => round(v, 1)).join(', ')}] | [${lm.delta.map((v) => round(v, 1)).join(', ')}] | ${round(lm.maxAbsDelta, 2)} | ${lm.verdict} |`);
}
md.push('');
for (const lm of classB) {
  md.push(`- **${lm.name}** — ${lm.rationale}.`);
  if (lm.verdict === 'NOTED') {
    if (lm.noteOverride) {
      md.push(`  NOTED: ${lm.noteOverride}`);
    } else if (lm.bp3dNoteMm != null) {
      md.push(`  NOTED: BP3D-internal offset for this feature is ${lm.bp3dNoteMm} mm (textbook target ${lm.bp3dTextbookMm} mm) — source-data geometry, carried through the registration faithfully.`);
    }
  }
}
md.push('');
const noted = classB.filter((lm) => lm.verdict === 'NOTED');
if (noted.length) {
  md.push(`Class A: ${classA.filter((c) => c.ok).length}/${classA.length} PASS (gating). Class B: ${classB.length - noted.length}/${classB.length} within ±${TOL_AU} au; ${noted.length} NOTED with BP3D-internal explanations above.`);
} else {
  md.push(`Class A: ${classA.filter((c) => c.ok).length}/${classA.length} PASS (gating). Class B: all ${classB.length} within ±${TOL_AU} au. ✅`);
}
md.push('');
md.push('## 8. Outputs');
md.push('');
md.push('| file (assets-src/bp3d/canonical/) | vertices | faces | bbox min (au) | bbox max (au) |');
md.push('| --- | --- | --- | --- | --- |');
for (const f of fileStats) {
  md.push(`| ${f.name}.obj | ${f.vertices} | ${f.faces} | [${f.bboxAu.min.join(', ')}] | [${f.bboxAu.max.join(', ')}] |`);
}
md.push('');
md.push('## 9. License');
md.push('');
md.push('Source geometry: BodyParts3D 4.0, © The Database Center for Life Science licensed under');
md.push('CC Attribution 4.0 International (verified at source by `bp3d-acquire`, see');
md.push('`docs/ATTRIBUTION.md` and PROBE.md). Note: the legacy OBJ file headers inside the archive');
md.push('still carry the old "CC Attribution-Share Alike 2.1 Japan" string; DBCLS re-licensed the');
md.push('database under CC BY 4.0 — the attribution above follows the current source terms.');
md.push('');
md.push('## 10. Determinism');
md.push('');
md.push('No clock, RNG, network or parallelism-dependent behavior: fixed constants, sorted');
md.push('iteration, rasterized occupancy with deterministic tie-handling, fixed decimal output.');
md.push('Re-running the script on the same inputs reproduces byte-identical outputs (modulo the');
md.push('kernel/internal IO path note above).');
md.push('');

writeFileSync(REPORT_PATH, md.join('\n'), 'utf8');
log(`[register] wrote ${path.relative(ROOT, REPORT_PATH)}`);
log(`[register] wrote ${path.relative(ROOT, SUMMARY_PATH)}`);
log('[register] done');
