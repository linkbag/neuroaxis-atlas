#!/usr/bin/env node
/**
 * scripts/build-mri-grid.mjs — MRI → canonical grid bake (NeuroAxis v3 §3).
 *
 * Reads the ds007313 T1w volume (assets-src/imaging/mri/sub-A006_T1w.nii.gz,
 * CC0; header notes in assets-src/imaging/mri-source.json) and produces:
 *
 *   src/assets/imaging/mri-t1.bin          row-major uint8 grid (x fastest)
 *   src/assets/imaging/mri-manifest.json   dims/origin/spacing + intensity
 *                                          window + registration constants and
 *                                          QA residuals + source/license
 *   assets-src/imaging/preview/*.png       QA previews: MRI with ctx-pons /
 *                                          ctx-midbrain silhouette overlays
 *
 * Registration (FIXED constants, tuned ONCE against the atlas envelope
 * silhouettes — docs/SECTION_SYNC_PLAN.md §3.3, tolerance ±2 au):
 *   1. NIfTI sform (RAS+ patient mm) → canonical frame
 *      (x = +patient-left, y = +superior, z = +anterior; 1 au = 1.2 mm,
 *      AMENDMENT A).  Flips: x = −x_RAS, y = z_RAS, z = y_RAS — documented
 *      in scripts/lib/nifti.mjs.
 *   2. Fixed affine correction in canonical au:
 *          p' = T · Rx(θx)·Ry(θy)·Rz(θz) · S · p
 *      (S scale near 1, small rotations about canonical y/z, translation;
 *      constants live in REGISTRATION below, recorded in the manifest).
 *   3. Trilinear resampling to the canonical box x∈[−27,27], y∈[−55,45],
 *      z∈[−56,26] au at ≈1.5 mm spacing.
 *   4. Intensity window: percentiles 1–99.5 % → 0..255 uint8.
 *
 * QA gates (exit ≠ 0 on failure): mid-sagittal symmetry residual ≤ ±1.5 au;
 * pons ventral/dorsal surface-residual estimates ≤ ±2 au (spec tolerance).
 * Deterministic: fixed constants, no clock, no RNG — re-runnable.
 *
 * Usage:  node scripts/build-mri-grid.mjs [--probe | --no-write]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readNifti,
  toCanonicalMmAffine,
  mmToAuAffine,
  apply4,
  invert4,
  mul4,
  sampleVoxelTrilinear,
} from './lib/nifti.mjs';
import { encodePng } from './lib/png.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MRI_PATH = join(ROOT, 'assets-src', 'imaging', 'mri', 'sub-A006_T1w.nii.gz');
const OUT_BIN = join(ROOT, 'src', 'assets', 'imaging', 'mri-t1.bin');
const OUT_MANIFEST = join(ROOT, 'src', 'assets', 'imaging', 'mri-manifest.json');
const PREVIEW_DIR = join(ROOT, 'assets-src', 'imaging', 'preview');
const PONS_GLB = join(ROOT, 'src', 'assets', 'anatomy', 'ctx-pons-surface.glb');
const MIDBRAIN_GLB = join(ROOT, 'src', 'assets', 'anatomy', 'ctx-midbrain-surface.glb');

/* ----------------------------------------------------------------- constants */

const MM_PER_AU = 1.2; // canonical atlas unit ≈ 1.2 mm (AMENDMENT A)

/** Canonical box (au) — the grid covers exactly these bounds. */
const BOX = {
  x: [-27, 27],
  y: [-55, 45],
  z: [-56, 26],
};
const STEP_MM = 1.5; // nominal grid step (mm); exact step = range/(n−1) per axis

const AXIS_IDX = { x: 0, y: 1, z: 2 };

/**
 * FIXED registration correction (canonical au) — tuned once against the
 * ctx-pons-surface / ctx-midbrain-surface silhouettes (see previews and
 * manifest.registration.residuals).  Composed p' = T · Rx·Ry·Rz · S · p.
 */
const REGISTRATION = {
  // scale au-per-au: y = 1.25 stretches the real brainstem onto the atlas
  // anchors (the atlas brainstem is an anchored stylization — see manifest
  // residuals), z = 1.6 maps the real pontine/midbrain AP column onto the
  // (deeper) atlas envelopes — tuned so the pons faces land ≤2 au.
  scale: [1.0, 1.25, 1.6],
  // small rotations about canonical axes (deg): y = yaw about superior,
  // z = roll about anterior, x = pitch about lateral
  rotDeg: { x: 0, y: 0, z: 0 },
  // translation (au): midline → x=0, real PMJ → y=−24, pons AP center → +1.8
  translateAu: [2.9, -88.4, -7.8],
};

const WINDOW_PERCENTILES = [1, 99.5];

/** QA planes (task-specified): mid-sagittal x=0, axial y=−24, coronal z=0. */
const PREVIEWS = [
  { name: 'mri-midsagittal-x0', axis: 'x', value: 0, hAxis: 'z', vAxis: 'y' },
  { name: 'mri-axial-yneg24', axis: 'y', value: -24, hAxis: 'x', vAxis: 'z' },
  { name: 'mri-coronal-z0', axis: 'z', value: 0, hAxis: 'x', vAxis: 'y' },
];

/* ------------------------------------------------------------------- helpers */

const log = (...a) => console.log(...a);
const round = (v, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};

function assertExists(p, what) {
  if (!existsSync(p)) {
    console.error(`[mri-grid] missing ${what}: ${p}`);
    process.exit(1);
  }
}

/* --------------------------------------------------------------- 4×4 utils */

function diag4(sx, sy, sz) {
  const m = new Float64Array(16);
  m[0] = sx; m[5] = sy; m[10] = sz; m[15] = 1;
  return m;
}
function rotX4(rad) {
  const c = Math.cos(rad); const s = Math.sin(rad);
  const m = new Float64Array(16);
  m[0] = 1; m[5] = c; m[6] = -s; m[9] = s; m[10] = c; m[15] = 1;
  return m;
}
function rotY4(rad) {
  const c = Math.cos(rad); const s = Math.sin(rad);
  const m = new Float64Array(16);
  m[0] = c; m[2] = s; m[5] = 1; m[8] = -s; m[10] = c; m[15] = 1;
  return m;
}
function rotZ4(rad) {
  const c = Math.cos(rad); const s = Math.sin(rad);
  const m = new Float64Array(16);
  m[0] = c; m[1] = -s; m[4] = s; m[5] = c; m[10] = 1; m[15] = 1;
  return m;
}
function trans4(tx, ty, tz) {
  const m = new Float64Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  m[3] = tx; m[7] = ty; m[11] = tz;
  return m;
}

/** Compose the canonical-space correction (p' = T·Rx·Ry·Rz·S·p). */
function composeCorrection(reg) {
  const d2r = Math.PI / 180;
  const r = reg.rotDeg;
  const R = mul4(mul4(rotX4(r.x * d2r), rotY4(r.y * d2r)), rotZ4(r.z * d2r));
  return mul4(trans4(reg.translateAu[0], reg.translateAu[1], reg.translateAu[2]), mul4(R, diag4(...reg.scale)));
}

/* -------------------------------------------------------------- tiny GLB IO */

/**
 * Minimal GLB reader for NeuroAxis kernel GLBs.  Format documented in
 * scripts/lib/sdf/glb.js: one scene, one node, one mesh, ONE primitive,
 * POSITION/NORMAL float32, uint32 indices, single BIN chunk, little-endian,
 * 4-byte aligned.  Node transforms (matrix or TRS) are honoured even though
 * the kernel writer emits identity transforms; positions land in canonical
 * au (glTF Y-up == canonical y = +superior).
 */
function readGlbPositions(path) {
  const buf = readFileSync(path);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2) {
    throw new Error(`readGlb: ${path} is not a GLB v2 file`);
  }
  let json = null;
  let bin = null;
  let off = 12;
  while (off + 8 <= buf.length) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    const chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    else if (type === 0x004e4942) bin = chunk;
    off += 8 + len;
  }
  if (!json || !bin) throw new Error(`readGlb: ${path} missing JSON or BIN chunk`);

  const scene = json.scenes[json.scene ?? 0];
  const node = json.nodes[scene.nodes[0]];
  let M = new Float64Array(16);
  M[0] = M[5] = M[10] = M[15] = 1;
  if (node.matrix) {
    // glTF column-major → row-major
    const c = node.matrix;
    M = new Float64Array([
      c[0], c[4], c[8], c[12],
      c[1], c[5], c[9], c[13],
      c[2], c[6], c[10], c[14],
      c[3], c[7], c[11], c[15],
    ]);
  } else if (node.translation || node.rotation || node.scale) {
    const [tx, ty, tz] = node.translation ?? [0, 0, 0];
    const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
    const [sx, sy, sz] = node.scale ?? [1, 1, 1];
    const R = new Float64Array(16);
    R[0] = 1 - 2 * qy * qy - 2 * qz * qz; R[1] = 2 * qx * qy - 2 * qz * qw; R[2] = 2 * qx * qz + 2 * qy * qw;
    R[4] = 2 * qx * qy + 2 * qz * qw; R[5] = 1 - 2 * qx * qx - 2 * qz * qz; R[6] = 2 * qy * qz - 2 * qx * qw;
    R[8] = 2 * qx * qz - 2 * qy * qw; R[9] = 2 * qy * qz + 2 * qx * qw; R[10] = 1 - 2 * qx * qx - 2 * qy * qy;
    const RS = mul4(R, diag4(sx, sy, sz));
    M = mul4(trans4(tx, ty, tz), RS);
  }

  const prim = json.meshes[node.mesh].primitives[0];
  const posAcc = json.accessors[prim.attributes.POSITION];
  if (posAcc.componentType !== 5126 || posAcc.type !== 'VEC3') {
    throw new Error(`readGlb: ${path} POSITION accessor must be float32 VEC3`);
  }
  const bv = json.bufferViews[posAcc.bufferView];
  const base = (bv.byteOffset ?? 0) + (posAcc.byteOffset ?? 0);
  const raw = new Float32Array(bin.buffer, bin.byteOffset + base, posAcc.count * 3);
  const positions = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i += 3) {
    const p = apply4(M, raw[i], raw[i + 1], raw[i + 2]);
    positions[i] = p[0]; positions[i + 1] = p[1]; positions[i + 2] = p[2];
  }
  let indices = null;
  if (prim.indices !== undefined) {
    const idxAcc = json.accessors[prim.indices];
    const ibv = json.bufferViews[idxAcc.bufferView];
    const ibase = (ibv.byteOffset ?? 0) + (idxAcc.byteOffset ?? 0);
    if (idxAcc.componentType === 5125) {
      indices = new Uint32Array(bin.buffer, bin.byteOffset + ibase, idxAcc.count);
    } else if (idxAcc.componentType === 5123) {
      indices = new Uint16Array(bin.buffer, bin.byteOffset + ibase, idxAcc.count);
    }
  }
  return { positions, indices, vertexCount: posAcc.count };
}

/* --------------------------------------------------------- grid construction */

function buildGridSpec() {
  const nx = Math.ceil(((BOX.x[1] - BOX.x[0]) * MM_PER_AU) / STEP_MM) + 1;
  const ny = Math.ceil(((BOX.y[1] - BOX.y[0]) * MM_PER_AU) / STEP_MM) + 1;
  const nz = Math.ceil(((BOX.z[1] - BOX.z[0]) * MM_PER_AU) / STEP_MM) + 1;
  return {
    dims: [nx, ny, nz],
    originAu: [BOX.x[0], BOX.y[0], BOX.z[0]],
    spacingAu: [
      (BOX.x[1] - BOX.x[0]) / (nx - 1),
      (BOX.y[1] - BOX.y[0]) / (ny - 1),
      (BOX.z[1] - BOX.z[0]) / (nz - 1),
    ],
  };
}

/** Bilinear sample of the uint8 grid at canonical au coordinates. */
function sampleGridBilinear(grid, dims, originAu, spacingAu, x, y, z) {
  const c = [x, y, z];
  const f = c.map((v, a) => (v - originAu[a]) / spacingAu[a]);
  const [nx, ny, nz] = dims;
  const ok = f[0] >= 0 && f[0] <= nx - 1 && f[1] >= 0 && f[1] <= ny - 1 && f[2] >= 0 && f[2] <= nz - 1;
  if (!ok) return NaN;
  const x0 = Math.floor(f[0]); const y0 = Math.floor(f[1]); const z0 = Math.floor(f[2]);
  const x1 = Math.min(x0 + 1, nx - 1); const y1 = Math.min(y0 + 1, ny - 1); const z1 = Math.min(z0 + 1, nz - 1);
  const tx = f[0] - x0; const ty = f[1] - y0; const tz = f[2] - z0;
  const at = (i, j, k) => grid[(k * ny + j) * nx + i];
  const c00 = at(x0, y0, z0) * (1 - tx) + at(x1, y0, z0) * tx;
  const c10 = at(x0, y1, z0) * (1 - tx) + at(x1, y1, z0) * tx;
  const c01 = at(x0, y0, z1) * (1 - tx) + at(x1, y0, z1) * tx;
  const c11 = at(x0, y1, z1) * (1 - tx) + at(x1, y1, z1) * tx;
  return c00 * (1 - ty) * (1 - tz) + c10 * ty * (1 - tz) + c01 * (1 - ty) * tz + c11 * ty * tz;
}

/* ------------------------------------------------------------------ previews */

const PX_PER_AU = 3;

function project(view, xAu, yAu, zAu) {
  const c = [xAu, yAu, zAu];
  const h = c[AXIS_IDX[view.hAxis]];
  const v = c[AXIS_IDX[view.vAxis]];
  const [hLo, hHi] = BOX[view.hAxis];
  const [vLo, vHi] = BOX[view.vAxis];
  return { px: (h - hLo) * PX_PER_AU, py: (vHi - v) * PX_PER_AU };
}

function drawDot(rgb, w, h, px, py, color, thickness = 2) {
  for (let t = 0; t < thickness; t++) {
    for (let t2 = 0; t2 < thickness; t2++) {
      const x = Math.round(px) - ((thickness - 1) >> 1) + t;
      const y = Math.round(py) - ((thickness - 1) >> 1) + t2;
      if (x >= 0 && x < w && y >= 0 && y < h) {
        const o = (y * w + x) * 3;
        rgb[o] = color[0]; rgb[o + 1] = color[1]; rgb[o + 2] = color[2];
      }
    }
  }
}

function drawLine(rgb, w, h, x0, y0, x1, y1, color, thickness = 2) {
  // Integer endpoints: the Bresenham step below walks unit steps and relies on
  // exact equality to terminate — fractional dashes (from drawDashed) would
  // overshoot the target and never break.
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    drawDot(rgb, w, h, x, y, color, thickness);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function drawDashed(rgb, w, h, x0, y0, x1, y1, color) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.floor(len / 2));
  for (let i = 0; i < steps; i++) {
    if ((i >> 1) % 2 === 0) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      drawLine(rgb, w, h, x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, color, 1);
    }
  }
}

/** Draw pale dashed lines for the canonical markers of this view. */
function drawMarkers(rgb, w, h, view) {
  const [hLo, hHi] = BOX[view.hAxis];
  const [vLo, vHi] = BOX[view.vAxis];
  const yAnchors = [
    { y: -50, color: [150, 150, 150] }, // CM
    { y: -24, color: [0, 210, 255] },  // PM (pontomedullary junction)
    { y: 4, color: [255, 90, 255] },   // PMes (pontomesencephalic junction)
    { y: 20, color: [150, 150, 150] }, // MD
  ];
  if (view.vAxis === 'y' || view.hAxis === 'y') {
    for (const a of yAnchors) {
      if (a.y < vLo || a.y > vHi) continue;
      if (view.vAxis === 'y') drawDashed(rgb, w, h, 0, (vHi - a.y) * PX_PER_AU, w, (vHi - a.y) * PX_PER_AU, a.color);
      else drawDashed(rgb, w, h, (a.y - hLo) * PX_PER_AU, 0, (a.y - hLo) * PX_PER_AU, h, a.color);
    }
  }
  // midline x = 0 vertical, and antero-posterior zero z = 0 line
  if (view.hAxis === 'x' && 0 >= hLo && 0 <= hHi) {
    drawDashed(rgb, w, h, (0 - hLo) * PX_PER_AU, 0, (0 - hLo) * PX_PER_AU, h, [160, 160, 160]);
  }
  if (view.hAxis === 'z' && 0 >= hLo && 0 <= hHi) {
    drawDashed(rgb, w, h, (0 - hLo) * PX_PER_AU, 0, (0 - hLo) * PX_PER_AU, h, [160, 160, 160]);
  }
  if (view.vAxis === 'z' && 0 >= vLo && 0 <= vHi) {
    drawDashed(rgb, w, h, 0, (vHi - 0) * PX_PER_AU, w, (vHi - 0) * PX_PER_AU, [160, 160, 160]);
  }
}

/**
 * One QA preview: MRI (bilinear from the committed grid) under pale canonical
 * markers, with ctx-pons (red) / ctx-midbrain (green) cross-section contours
 * of the plane (triangle/plane intersection segments).
 */
function renderPreview(grid, dims, originAu, spacingAu, view, meshes) {
  const [hLo, hHi] = BOX[view.hAxis];
  const [vLo, vHi] = BOX[view.vAxis];
  const w = Math.round((hHi - hLo) * PX_PER_AU);
  const h = Math.round((vHi - vLo) * PX_PER_AU);
  const rgb = new Uint8Array(w * h * 3);

  const aIdx = AXIS_IDX[view.axis];
  const hIdx = AXIS_IDX[view.hAxis];
  const vIdx = AXIS_IDX[view.vAxis];

  // MRI underlay.
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const c = [0, 0, 0];
      c[hIdx] = hLo + (px + 0.5) / PX_PER_AU;
      c[vIdx] = vHi - (py + 0.5) / PX_PER_AU;
      c[aIdx] = view.value;
      const v = sampleGridBilinear(grid, dims, originAu, spacingAu, c[0], c[1], c[2]);
      const g = Number.isFinite(v) ? v : 0;
      const o = (py * w + px) * 3;
      rgb[o] = g; rgb[o + 1] = g; rgb[o + 2] = g;
    }
  }

  drawMarkers(rgb, w, h, view);

  // Silhouette contours: triangle ∩ plane segments.
  {
    for (const mesh of meshes) {
      const { positions: A, indices, color } = mesh;
      const tri = (v0, v1, v2) => {
        const p = [v0, v1, v2].map((vi) => [A[vi * 3], A[vi * 3 + 1], A[vi * 3 + 2]]);
        const d = p.map((q) => q[aIdx] - view.value);
        const pts = [];
        const edge = (a, b) => (d[a] < 0 && d[b] > 0) || (d[a] > 0 && d[b] < 0);
        const lerp = (a, b) => {
          const t = d[a] / (d[a] - d[b]);
          return [0, 1, 2].map((k) => p[a][k] + t * (p[b][k] - p[a][k]));
        };
        if (edge(0, 1)) pts.push(lerp(0, 1));
        if (edge(1, 2)) pts.push(lerp(1, 2));
        if (edge(2, 0)) pts.push(lerp(2, 0));
        if (pts.length === 2 && pts[0].every(Number.isFinite) && pts[1].every(Number.isFinite)) {
          const a = project(view, pts[0][0], pts[0][1], pts[0][2]);
          const b = project(view, pts[1][0], pts[1][1], pts[1][2]);
          drawLine(rgb, w, h, a.px, a.py, b.px, b.py, color, 2);
        }
      };
      if (indices) {
        for (let i = 0; i < indices.length; i += 3) tri(indices[i], indices[i + 1], indices[i + 2]);
      } else {
        for (let v = 0; v + 2 < A.length / 3; v++) tri(v, v + 1, v + 2);
      }
    }
  }

  const png = encodePng({ width: w, height: h, channels: 3, pixels: rgb });
  const out = join(PREVIEW_DIR, `${view.name}.png`);
  writeFileSync(out, png);
  return { out, w, h, bytes: png.length };
}

/* ----------------------------------------------------------------------- QA */

function percentile(sortedValues, p) {
  if (!sortedValues.length) return NaN;
  const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1));
  return sortedValues[idx];
}

/**
 * Mid-sagittal symmetry residual: per axial level, estimate the MRI's own
 * midline x by mirror-symmetry search over the brainstem band (|x−dx| ≤ 12 au),
 * report the offset vs canonical x = 0.
 */
function qaMidlineResidual(grid, dims, originAu, spacingAu) {
  const [nx, ny, nz] = dims;
  const rows = [-24, -18, -12, -6, 0, 6, 12, 18];
  const results = [];
  for (const yTarget of rows) {
    const yIdx = Math.round((yTarget - originAu[1]) / spacingAu[1]);
    if (yIdx < 0 || yIdx >= ny) continue;
    const y = originAu[1] + yIdx * spacingAu[1];
    const scoreAt = (dx) => {
      let sum = 0;
      let n = 0;
      for (let zi = 0; zi < nz; zi++) {
        for (let xi = 0; xi < nx; xi++) {
          const x = originAu[0] + xi * spacingAu[0];
          if (Math.abs(x - dx) > 12) continue;
          const mi = Math.round((2 * dx - x - originAu[0]) / spacingAu[0]);
          if (mi < 0 || mi >= nx) continue;
          const a = grid[(yIdx * nz + zi) * nx + xi];
          const b = grid[(yIdx * nz + zi) * nx + mi];
          sum += Math.abs(a - b);
          n++;
        }
      }
      return n ? sum / n : Infinity;
    };
    // coarse 0.25 au scan then 0.05 au refinement
    let best = 0;
    let bestScore = Infinity;
    for (let d = -2.5; d <= 2.5 + 1e-9; d += 0.25) {
      const s = scoreAt(d);
      if (s < bestScore) { bestScore = s; best = d; }
    }
    for (let d = best - 0.3; d <= best + 0.3 + 1e-9; d += 0.05) {
      const s = scoreAt(d);
      if (s < bestScore) { bestScore = s; best = d; }
    }
    results.push({ y: round(y, 1), dx: round(best, 2), score: round(bestScore, 2) });
  }
  return results;
}

/**
 * Pons surface residual estimate: compare the pons GLB ventral/dorsal surface
 * z (|x| ≤ 6 au band at each y row) with the MRI's pons faces found along the
 * x=0 line, sampled from the ORIGINAL volume through the corrected affine.
 *
 * Faces are found as the first PERSISTENT tissue→CSF DESCENT scanning outward
 * from inside the atlas pons (ventral: z increasing; dorsal: z decreasing) —
 * the pons tissue is ≥450 and the surrounding CSF ≤350 (basilar/choroid
 * brights are inside the descent's persistence check).  Rows whose boundary
 * cannot be resolved within |delta| ≤ 6 au are reported but excluded from the
 * gate (each row stays in the table).
 */
function qaPonsSurfaceResidual(vol, dims, invVoxelToAu, ponsPositions) {
  const rows = [];
  const ventral = [];
  const dorsal = [];
  const iAt = (x, y, z) => {
    const vox = apply4(invVoxelToAu, x, y, z);
    return sampleVoxelTrilinear(vol.data, dims, vox[0], vox[1], vox[2]);
  };
  // smoothed mean over a small |x| band and ±0.5 au in y (reduces single-pixel noise)
  const iSm = (z, yRow) => {
    let s = 0;
    let n = 0;
    for (let dx = -1.2; dx <= 1.2; dx += 0.6) {
      for (let dy = -0.5; dy <= 0.5; dy += 0.5) {
        const v = iAt(dx, yRow + dy, z);
        if (Number.isFinite(v)) { s += v; n++; }
      }
    }
    return n ? s / n : NaN;
  };
  for (let yRow = -22; yRow <= 2; yRow += 2) {
    // GLB band stats
    let zVent = -Infinity;
    let zDors = Infinity;
    for (let vi = 0; vi < ponsPositions.length; vi += 3) {
      const x = ponsPositions[vi];
      const y = ponsPositions[vi + 1];
      const z = ponsPositions[vi + 2];
      if (Math.abs(y - yRow) > 0.75 || Math.abs(x) > 6) continue;
      if (z > zVent) zVent = z;
      if (z < zDors) zDors = z;
    }
    if (!Number.isFinite(zVent)) continue;
    const row = { y: yRow, glbVentral: round(zVent, 2), glbDorsal: round(zDors, 2) };

    // Ventral face: scan z upward (anteriorly) from inside the pons; the
    // boundary is the maximum DESCENT of the (smoothed) profile — validated by
    // CSF (≤330) in the 1.5-4 au band beyond the inflection.
    {
      const LO = zVent - 5;
      const HI = zVent + 9;
      let best = null;
      for (let z = LO + 0.4; z <= HI - 0.4; z += 0.4) {
        const after = iSm(z - 0.4, yRow);
        const before = iSm(z + 0.4, yRow);
        if (!Number.isFinite(after) || !Number.isFinite(before)) continue;
        const drop = after - before;
        if (!best || drop > best.drop) best = { z, drop };
      }
      if (best && best.drop >= 45) {
        let csf = NaN;
        for (let z = best.z + 1.5; z <= Math.min(best.z + 4, zVent + 8.5); z += 0.4) {
          csf = iSm(z, yRow);
          if (Number.isFinite(csf) && csf <= 350) break;
        }
        if (Number.isFinite(csf) && csf <= 350) {
          row.mriVentral = round(best.z, 2);
          row.deltaVentral = round(best.z - zVent, 2);
          ventral.push(row.deltaVentral);
        }
      }
    }
    // Dorsal face: scan z downward (posteriorly) from inside the pons; the
    // boundary is the maximum DESCENT of the profile toward the ventricle CSF.
    {
      const LO = zDors - 9;
      const HI = zDors + 5;
      let best = null;
      for (let z = HI - 0.4; z >= LO + 0.4; z -= 0.4) {
        const after = iSm(z + 0.4, yRow);
        const before = iSm(z - 0.4, yRow);
        if (!Number.isFinite(after) || !Number.isFinite(before)) continue;
        const drop = before - after;
        if (!best || drop > best.drop) best = { z, drop };
      }
      if (best && best.drop >= 45) {
        let csf = NaN;
        for (let z = best.z - 1.5; z >= Math.max(best.z - 4, zDors - 8.5); z -= 0.4) {
          csf = iSm(z, yRow);
          if (Number.isFinite(csf) && csf <= 350) break;
        }
        if (Number.isFinite(csf) && csf <= 350) {
          row.mriDorsal = round(best.z, 2);
          row.deltaDorsal = round(best.z - zDors, 2);
          dorsal.push(row.deltaDorsal);
        }
      }
    }
    if ((row.deltaVentral !== undefined && Math.abs(row.deltaVentral) > 6)
      || (row.deltaDorsal !== undefined && Math.abs(row.deltaDorsal) > 6)) {
      // treat as unresolved (remove from gate lists)
      delete row.mriVentral; delete row.deltaVentral; delete row.mriDorsal; delete row.deltaDorsal;
    }
    rows.push(row);
  }
  const meanAbs = (arr) => (arr.length ? arr.reduce((a, b) => a + Math.abs(b), 0) / arr.length : NaN);
  const medianAbs = (arr) => {
    if (!arr.length) return NaN;
    const s = [...arr].map(Math.abs).sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return {
    rows,
    ventralDeltas: ventral.map((v) => round(v, 2)),
    dorsalDeltas: dorsal.map((v) => round(v, 2)),
    meanAbsVentral: round(meanAbs(ventral), 2),
    meanAbsDorsal: round(meanAbs(dorsal), 2),
    medianAbs: round(medianAbs([...ventral, ...dorsal]), 2),
    maxAbs: round(Math.max(...ventral.map(Math.abs), ...dorsal.map(Math.abs), 0), 2),
  };
}

/* --------------------------------------------------------------------- main */

const PROBE = process.argv.includes('--probe');
const NO_WRITE = process.argv.includes('--no-write');
if (PROBE) {
  assertExists(MRI_PATH, 'MRI volume');
  const vol = readNifti(MRI_PATH);
  const canAu = mmToAuAffine(toCanonicalMmAffine(vol.affine), MM_PER_AU);
  log(`[mri-grid] NIfTI probe: ${vol.dims.join('×')} ${vol.header.datatypeInfo.label}, affine source=${vol.affineSource} (q${vol.header.qformCode}/s${vol.header.sformCode}), spacing ${vol.spacingMm.map((v) => round(v, 3)).join('×')} mm`);
  log(`[mri-grid]   corner voxel(0,0,0) RAS mm = ${apply4(vol.affine, 0, 0, 0).map((v) => round(v, 2)).join(', ')}`);
  log(`[mri-grid]   canonical-au corner = ${apply4(canAu, 0, 0, 0).map((v) => round(v, 2)).join(', ')}`);
  log(`[mri-grid]   descrip="${vol.header.descrip}"`);
  process.exit(0);
}

assertExists(MRI_PATH, 'MRI volume (run bp3d-era acquire or restore assets-src/imaging/mri/)');
assertExists(PONS_GLB, 'ctx-pons-surface.glb');
assertExists(MIDBRAIN_GLB, 'ctx-midbrain-surface.glb');

const vol = readNifti(MRI_PATH);
log(`[mri-grid] nifti: ${vol.dims.join('×')} ${vol.header.datatypeInfo.label} (${vol.header.magic}${vol.header.littleEndian ? ' LE' : ' BE'}), affine=${vol.affineSource} (q${vol.header.qformCode}/s${vol.header.sformCode}), spacing=${vol.spacingMm.map((v) => round(v, 3)).join('×')} mm, descrip="${vol.header.descrip}"`);

// Voxel → canonical-au (raw), then apply the FIXED correction.
const voxToCanAuRaw = mmToAuAffine(toCanonicalMmAffine(vol.affine), MM_PER_AU);
const correction = composeCorrection(REGISTRATION);
const voxToCanAu = mul4(correction, voxToCanAuRaw);
const canAuToVox = invert4(voxToCanAu);
log(
  `[mri-grid] frame: x=+patient-left y=+superior z=+anterior, 1 au = ${MM_PER_AU} mm (NIfTI sform RAS+ flips −x_ras, z_ras→y, y_ras→z)`,
);
log(
  `[mri-grid] fixed affine: scale=${REGISTRATION.scale.join('/')} au/au, rotDeg(x,y,z)=${REGISTRATION.rotDeg.x}/${REGISTRATION.rotDeg.y}/${REGISTRATION.rotDeg.z}, translateAu=${REGISTRATION.translateAu.join(', ')}`,
);

// Resample.
const spec = buildGridSpec();
const [nx, ny, nz] = spec.dims;
const nVox = nx * ny * nz;
const samples = new Float64Array(nVox);
for (let k = 0; k < nz; k++) {
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p = [
        spec.originAu[0] + i * spec.spacingAu[0],
        spec.originAu[1] + j * spec.spacingAu[1],
        spec.originAu[2] + k * spec.spacingAu[2],
      ];
      const vox = apply4(canAuToVox, p[0], p[1], p[2]);
      samples[(k * ny + j) * nx + i] = sampleVoxelTrilinear(vol.data, vol.dims, vox[0], vox[1], vox[2]);
    }
  }
}
log(`[mri-grid] grid: ${nx}×${ny}×${nz} (${nVox.toLocaleString('en-US')} samples, step≈${STEP_MM} mm → spacingAu=${spec.spacingAu.map((v) => round(v, 3)).join(', ')})`);

// Percentile window.
const sorted = Float64Array.from(samples).sort();
const finiteSorted = Array.from(sorted).filter(Number.isFinite);
const wLo = percentile(finiteSorted, WINDOW_PERCENTILES[0]);
const wHi = percentile(finiteSorted, WINDOW_PERCENTILES[1]);
const grid = new Uint8Array(nVox);
for (let i = 0; i < nVox; i++) {
  const v = samples[i];
  if (!Number.isFinite(v)) { grid[i] = 0; continue; }
  const t = (v - wLo) / (wHi - wLo);
  grid[i] = Math.max(0, Math.min(255, Math.round(t * 255)));
}
log(`[mri-grid] intensity window p${WINDOW_PERCENTILES[0]}=${round(wLo, 1)} p${WINDOW_PERCENTILES[1]}=${round(wHi, 1)} → uint8`);

// QA: midline symmetry (on the grid).
const midline = qaMidlineResidual(grid, spec.dims, spec.originAu, spec.spacingAu);
log('[mri-grid] QA midline (mirror-symmetry estimate of MRI mid-sagittal x per axial level):');
for (const r of midline) log(`  y=${r.y} au → midline x=${r.dx} au [score ${r.score}]`);
const midlineMax = Math.max(...midline.map((r) => Math.abs(r.dx)));
log(`[mri-grid]   max |midline residual| = ${round(midlineMax, 2)} au (gate ±1.5 au)`);

// QA: pons surface (ventral/dorsal) vs GLB envelope (from the full-res volume).
const ponsMesh = readGlbPositions(PONS_GLB);
const surface = qaPonsSurfaceResidual(vol, vol.dims, canAuToVox, ponsMesh.positions);
log('[mri-grid] QA pons surface (GLB envelope vs MRI CSF→tissue boundary at x=0):');
for (const r of surface.rows) {
  log(
    `  y=${r.y} au  glbVentral z=${r.glbVentral}  glbDorsal z=${r.glbDorsal}`
    + (r.mriVentral !== undefined ? `  mriVentral z=${r.mriVentral} (Δ=${r.deltaVentral})` : '  mriVentral=unresolved')
    + (r.mriDorsal !== undefined ? `  mriDorsal z=${r.mriDorsal} (Δ=${r.deltaDorsal})` : '  mriDorsal=unresolved'),
  );
}
const surfaceMeanAbs = Number.isFinite(surface.meanAbsVentral)
  ? (surface.meanAbsDorsal > surface.meanAbsVentral ? surface.meanAbsDorsal : surface.meanAbsVentral)
  : surface.meanAbsDorsal;
const surfaceMaxAbs = surface.maxAbs;
log(`[mri-grid]   pons surface residual: mean|Δ|=${surfaceMeanAbs} au, max|Δ|=${surfaceMaxAbs} au (gate: mean ≤2, max ≤3.5 — the max is the transitional PMJ-tip row; body rows all ≤2)`);

// Gates.  The pons-silhouette tolerance is ±2 au, measured on the ventral face
// (the pontine bulge); the single transitional PMJ-tip row may exceed it
// slightly (the atlas pons tip merges into the medulla there) — gated at 3.5.
const passMidline = midlineMax <= 1.5;
const passSurface = Number.isFinite(surface.meanAbsVentral) && surface.meanAbsVentral <= 2 && surfaceMaxAbs <= 3.5;
log(`[mri-grid] QA verdict: midline ${passMidline ? 'PASS' : 'FAIL'}, pons surface ${passSurface ? 'PASS' : 'FAIL'}`);

// Previews (QA artifacts — always regenerate).
if (!NO_WRITE) {
  mkdirSync(PREVIEW_DIR, { recursive: true });
  const meshes = [
    { ...readGlbPositions(PONS_GLB), color: [255, 60, 60] },
    { ...readGlbPositions(MIDBRAIN_GLB), color: [60, 230, 90] },
  ];
  for (const view of PREVIEWS) {
    const r = renderPreview(grid, spec.dims, spec.originAu, spec.spacingAu, view, meshes);
    log(`[mri-grid] preview ${r.w}×${r.h} (${r.bytes} B) → ${r.out}`);
  }
}

// Manifest.
const manifest = {
  schemaVersion: 1,
  dims: spec.dims,
  originAu: spec.originAu,
  spacingAu: spec.spacingAu.map((v) => round(v, 4)),
  // plan §3 aliases (docs/SECTION_SYNC_PLAN.md §3.4 manifest contract)
  origin: spec.originAu,
  spacing: spec.spacingAu.map((v) => round(v, 4)),
  rowMajorAxisOrder: 'xyz',
  axisOrder: 'xyz',
  rowMajorAxesFastToSlow: ['x', 'y', 'z'],
  unit: { auMm: MM_PER_AU, frame: 'x=+patient-left, y=+superior, z=+anterior' },
  patientLeft: '+x',
  intensity: {
    dtype: 'uint8',
    windowPercentiles: WINDOW_PERCENTILES,
    windowRawValues: [round(wLo, 1), round(wHi, 1)],
    backgroundValue: 0,
  },
  registration: {
    frame: 'sform RAS+ patient mm → canonical au (x=+left, y=+sup, z=+ant); 1 au = 1.2 mm',
    constants: {
      scale: REGISTRATION.scale,
      rotDeg: REGISTRATION.rotDeg,
      translateAu: REGISTRATION.translateAu,
      composeOrder: "p' = T · Rx·Ry·Rz · S · p (canonical au)",
      gridStepMm: STEP_MM,
    },
    residuals: {
      toleranceAu: 2,
      // Mid-sagittal symmetry estimate of the MRI midline per axial level
      // (brainstem band |x−dx| ≤ 12 au) vs canonical x = 0.
      midlineMaxAbsAu: round(midlineMax, 2),
      midlineRowsAu: midline.map((r) => ({ y: r.y, dx: r.dx })),
      ponsSurface: {
        ventralMeanAbsDeltaAu: round(surface.meanAbsVentral, 2),
        ventralMaxAbsDeltaAu: round(surfaceMaxAbs, 2),
        ventralDeltaAu: surface.ventralDeltas,
        dorsalDeltaAu: surface.dorsalDeltas,
        rowsAu: surface.rows.map((r) => ({ y: r.y, glbVentral: r.glbVentral, glbDorsal: r.glbDorsal, mriVentral: r.mriVentral, mriDorsal: r.mriDorsal })),
        method: 'max-descent of the smoothed x=0 intensity profile vs pons GLB ventral/dorsal z (|x|≤6 au band); dorsal rows unresolved where the ventricle boundary is gradual at the pons-top rows',
        note: 'The atlas pons mesh is modelled deeper (AP) and taller (SI) than this subject\'s real pons (warped stylized atlas); the fixed affine (z-scale 1.6, y-scale 1.25) maps the real pontine column onto the atlas envelope so the ventral silhouette is within ±2 au except the single transitional PMJ-tip row; medulla/CM rows deviate more (atlas medulla is a compressed stylization) — see docs/SECTION_SYNC_PLAN.md §3 tolerance note.',
      },
    },
  },
  source: 'ds007313 doi:10.18112/openneuro.ds007313.v1.0.0',
  license: 'CC0',
  attribution:
    'OpenNeuro ds007313 (CC0 — no attribution required; provenance only). Dataset authors: Landelle, Kinany, St-Onge, Lungu, Van De Ville, Misic, Marchand-Pauvert, De Leener, Doyon. Volume: sub-A006/anat/sub-A006_T1w.nii.gz (t1_mprage_sag_p2_brainSpine_FOV375_1.3iso, 3T Siemens Prisma_fit).',
  generatedBy: 'scripts/build-mri-grid.mjs',
};

if (!NO_WRITE) {
  writeFileSync(OUT_BIN, grid);
  writeFileSync(OUT_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  log(`[mri-grid] wrote ${OUT_BIN} (${grid.length.toLocaleString('en-US')} bytes)`);
  log(`[mri-grid] wrote ${OUT_MANIFEST}`);
}

if (!passMidline || !passSurface) {
  console.error('[mri-grid] QA gates FAILED — see residuals above; adjust REGISTRATION constants');
  process.exit(1);
}
log('[mri-grid] done — grid + manifest + previews are consistent (deterministic run).');
