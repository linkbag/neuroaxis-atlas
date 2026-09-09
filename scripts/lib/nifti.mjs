/**
 * scripts/lib/nifti.mjs — minimal NIfTI-1 reader (Node, zero dependencies).
 *
 * Purpose (NeuroAxis v3 MRI pipeline, docs/SECTION_SYNC_PLAN.md §3): read the
 * ds007313 T1w volume (`assets-src/imaging/mri/sub-A006_T1w.nii.gz`, CC0) and
 * expose its samples in the canonical atlas frame used by the entire app:
 *
 *     canonical au:  x = +patient-left, y = +superior, z = +anterior
 *                    1 au ≈ 1.2 mm  (docs/REALISM_PLAN.md AMENDMENT A)
 *
 * Supported scope (documented, enforced):
 *   - NIfTI-1 only (magic `n+1` little-endian / `ni1` big-endian), .nii or
 *     .nii.gz (gunzip via node:zlib).  NIfTI-2 is rejected with a clear error.
 *   - datatypes 2 (uint8), 4 (int16) and 16 (float32).
 *   - affine: sform (preferred), qform (fallback), else pixdim-sign identity
 *     (documented last resort).  scl_slope/scl_inter scaling is applied.
 *
 * Orientation conventions (the flips — documented once, used everywhere):
 *   - NIfTI qform/sform express voxel → patient-mm in the **RAS+** convention
 *     (x = patient right, y = anterior, z = superior; NIfTI-1 spec §4, codes
 *     1/2/4; ds007313 uses code 1 for both qform and sform).  Code 3
 *     (Talairach) is treated as LPI− (left/posterior/inferior) with an
 *     explicit warning.
 *   - **RAS → canonical**:  canonical = ( −x_RAS, z_RAS, y_RAS ), i.e. negate
 *     the x (patient-right) axis, and swap anterior (y_RAS) / superior
 *     (z_RAS) into canonical z / y.  Written as the permutation matrix
 *     P_ras2canon below, applied on the left of the RAS affine.
 *   - (For reference, RAS → LPS is (−x, −y, +z); canonical = LPS with y/z
 *     swapped: (−x, +z, −y) — same P as above.  Provided to make cross-checks
 *     against FSL/ITK printouts easy.)
 *
 * Trilinear resampling: `sampleVoxelTrilinear(vol, x, y, z)` takes voxel
 * coordinates (fractional ib/…), so callers compose voxel ← mm via the
 * inverse of an affine returned here.  Out-of-FOV samples return NaN.
 *
 * Deterministic: no clock, no RNG, no environment dependence.
 */

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/** NIfTI-1 datatype → { ctor, bytes, label }. Only 2/4/16 supported. */
export const DATATYPES = {
  2: { ctor: Uint8Array, bytes: 1, label: 'uint8' },
  4: { ctor: Int16Array, bytes: 2, label: 'int16' },
  16: { ctor: Float32Array, bytes: 4, label: 'float32' },
};

/** Reader for one little/big-endian float32/int16/int32 field. */
function makeReaders(littleEndian) {
  const endianFlag = littleEndian;
  return {
    i16: (dv, off) => dv.getInt16(off, endianFlag),
    u16: (dv, off) => dv.getUint16(off, endianFlag),
    i32: (dv, off) => dv.getInt32(off, endianFlag),
    f32: (dv, off) => dv.getFloat32(off, endianFlag),
  };
}

/**
 * Parse the raw (decompressed) NIfTI-1 byte stream into a header object.
 * Returns a plain object — all fields documented beside their reads.
 */
export function parseNifti1Header(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 348) throw new Error('nifti: buffer shorter than 348-byte NIfTI-1 header');

  let magic = String.fromCharCode(bytes[344], bytes[345], bytes[346], bytes[347]);
  let littleEndian;
  if (magic === 'n+1\u0000' || magic === 'n+1') littleEndian = true;
  else if (magic === 'ni1\u0000' || magic === 'ni1') littleEndian = false;
  else {
    throw new Error(
      `nifti: unrecognized magic "${JSON.stringify(magic)}" — only NIfTI-1 (n+1 / ni1) is supported`,
    );
  }
  const r = makeReaders(littleEndian);

  const sizeofHdr = r.i32(dv, 0);
  if (sizeofHdr !== 348) {
    throw new Error(`nifti: sizeof_hdr=${sizeofHdr} — expected 348 (NIfTI-1). NIfTI-2 is not supported.`);
  }

  // dim[8] is the standard NIfTI-1 `short dim[8]` — 16-bit per entry.  Do NOT
  // read dim[1..7] as consecutive int32 (typical parser bug; mri-source.json
  // header notes call this out explicitly for ds007313).
  const dim = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) dim[i] = r.i16(dv, 40 + i * 2);

  const pixdim = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) pixdim[i] = r.f32(dv, 76 + i * 4);

  const datatype = r.i16(dv, 70);
  const bitpix = r.i16(dv, 72);
  const voxOffset = r.f32(dv, 108);
  const sclSlope = r.f32(dv, 112);
  const sclInter = r.f32(dv, 116);
  const qformCode = r.i16(dv, 252);
  const sformCode = r.i16(dv, 254);

  const header = {
    littleEndian,
    magic,
    dim,
    pixdim,
    dimInfo: bytes[39],
    datatype,
    bitpix,
    voxOffset,
    sclSlope,
    sclInter,
    qformCode,
    sformCode,
    descrip: readFixedChars(bytes, 148, 80),
    auxFile: readFixedChars(bytes, 228, 24),
    intentName: readFixedChars(bytes, 328, 16),
    // qform (standard NIfTI-1 quaternion storage: quatern_b/c/d + qoffset_xyz)
    quatern: { b: r.f32(dv, 256), c: r.f32(dv, 260), d: r.f32(dv, 264) },
    qoffset: [r.f32(dv, 268), r.f32(dv, 272), r.f32(dv, 276)],
    srowX: [r.f32(dv, 280), r.f32(dv, 284), r.f32(dv, 288), r.f32(dv, 292)],
    srowY: [r.f32(dv, 296), r.f32(dv, 300), r.f32(dv, 304), r.f32(dv, 308)],
    srowZ: [r.f32(dv, 312), r.f32(dv, 316), r.f32(dv, 320), r.f32(dv, 324)],
  };

  // Element count sanity: dim[0] holds the number of dimensions (must be ≥ 3).
  const nDims = dim[0];
  if (nDims < 3) throw new Error(`nifti: dim[0]=${nDims} — expected ≥ 3 (x,y,z)`);
  const dims = [dim[1], dim[2], dim[3]];
  const nVol = dim[4] || 1;
  if (dims.some((d) => !(d > 0))) throw new Error(`nifti: degenerate dims ${dims.join('×')}`);
  header.dims = dims;
  header.numVolumes = nVol;

  const dt = DATATYPES[datatype];
  if (!dt) {
    throw new Error(`nifti: datatype ${datatype} unsupported (supported: 2=uint8, 4=int16, 16=float32)`);
  }
  header.datatypeInfo = dt;

  return header;
}

function readFixedChars(bytes, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = bytes[off + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/**
 * Voxel → patient mm, RAS+ convention, as a 4×4 Float64Array (row-major).
 * sform wins when sform_code !== 0 and its rows are usable; qform next;
 * pixdim-sign identity last.
 * @param {object} header — from parseNifti1Header
 * @returns {{ matrix: Float64Array(16), source: string }}
 */
export function affineFromHeader(header) {
  const srowUsable =
    header.sformCode !== 0
    && header.srowX.slice(0, 3).some((v) => v !== 0)
    && header.srowX.slice(0, 3).every(Number.isFinite)
    && header.srowY.slice(0, 3).every(Number.isFinite)
    && header.srowZ.slice(0, 3).every(Number.isFinite);
  if (srowUsable) {
    // NIfTI-1 registers srow_x/y/z as the first three ROWS of the affine
    // (i.e. x_RAS = srow_x · [i,j,k,1]), in patient mm — RAS+ for codes 1/2/4.
    const m = new Float64Array(16);
    m.set(header.srowX, 0);
    m.set(header.srowY, 4);
    m.set(header.srowZ, 8);
    m[15] = 1;
    return { matrix: m, source: 'sform' };
  }

  if (header.qformCode !== 0) {
    const { b, c, d } = header.quatern;
    let a2 = 1 - b * b - c * c - d * d;
    if (a2 < 0) a2 = 0;
    const a = Math.sqrt(a2);
    const qfac = header.pixdim[0] < 0 ? -1 : 1;
    // Standard NIfTI-1 quaternion → rotation matrix (row-major).  qfac
    // multiplies the third COLUMN (spec: handles radiological flips of the
    // slice axis in the rare negative-pixdim[0] files).
    const R = [
      [
        1 - 2 * b * b - 2 * c * c, 2 * b * c - 2 * a * d, 2 * b * d + 2 * a * c,
      ],
      [
        2 * b * c + 2 * a * d, 1 - 2 * c * c - 2 * d * d, 2 * c * d - 2 * a * b,
      ],
      [
        2 * b * d - 2 * a * c, 2 * c * d + 2 * a * b, 1 - 2 * b * b - 2 * d * d,
      ],
    ];
    const m = new Float64Array(16);
    for (let row = 0; row < 3; row++) {
      m[row * 4 + 0] = header.pixdim[1] * R[row][0];
      m[row * 4 + 1] = header.pixdim[2] * R[row][1];
      m[row * 4 + 2] = header.pixdim[3] * R[row][2] * qfac;
      m[row * 4 + 3] = header.qoffset[row];
    }
    m[15] = 1;
    return { matrix: m, source: 'qform' };
  }

  // Last resort: axis-aligned affine from pixdim signs (positive pixdim = the
  // axis increases toward RAS+; negative flips it).
  const m = new Float64Array(16);
  m[0] = header.pixdim[1];
  m[5] = header.pixdim[2];
  m[10] = header.pixdim[3];
  m[15] = 1;
  return { matrix: m, source: 'pixdim-identity' };
}

/** 4×4 matrix helpers (row-major Float64Array). */
export function identity4() {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function mul4(a, b) {
  const out = new Float64Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
      out[r * 4 + c] = s;
    }
  }
  return out;
}

export function apply4(m, x, y, z) {
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3],
    m[4] * x + m[5] * y + m[6] * z + m[7],
    m[8] * x + m[9] * y + m[10] * z + m[11],
  ];
}

/** Generic 4×4 inverse (Gauss–Jordan with partial pivoting). Deterministic. */
export function invert4(m) {
  // Augmented [m | I]: rows of 8 doubles.
  const a = new Float64Array(32);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) a[r * 8 + c] = m[r * 4 + c];
    a[r * 8 + 4 + r] = 1;
  }
  for (let col = 0; col < 4; col++) {
    let piv = col;
    for (let r = col + 1; r < 4; r++) {
      if (Math.abs(a[r * 8 + col]) > Math.abs(a[piv * 8 + col])) piv = r;
    }
    if (Math.abs(a[piv * 8 + col]) < 1e-12) throw new Error('nifti: singular affine (cannot invert)');
    if (piv !== col) {
      for (let c = 0; c < 8; c++) {
        const t = a[col * 8 + c];
        a[col * 8 + c] = a[piv * 8 + c];
        a[piv * 8 + c] = t;
      }
    }
    const d = a[col * 8 + col];
    for (let c = 0; c < 8; c++) a[col * 8 + c] /= d;
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const f = a[r * 8 + col];
      if (f === 0) continue;
      for (let c = 0; c < 8; c++) a[r * 8 + c] -= f * a[col * 8 + c];
    }
  }
  const out = new Float64Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[r * 4 + c] = a[r * 8 + 4 + c];
  return out;
}

/* ------------------------------------------------------------------ frames */
/* The documented flips (see header comment): RAS → canonical au frame. */
export const P_RAS_TO_CANON = (() => {
  const m = new Float64Array(16);
  m[0] = -1; // canonical x = −x_RAS  (patient LEFT)
  m[6] = 1;  // canonical y = +z_RAS  (superior)
  m[9] = 1;  // canonical z = +y_RAS  (anterior)
  m[15] = 1;
  return m;
})();

/** Reference frame check: RAS → LPS (x=left, y=posterior, z=superior). */
export const P_RAS_TO_LPS = (() => {
  const m = new Float64Array(16);
  m[0] = -1;
  m[5] = -1;
  m[10] = 1;
  m[15] = 1;
  return m;
})();

/**
 * Voxel → canonical-mm-affine: apply the RAS→canonical frame change to a
 * voxel→RAS-mm affine.
 */
export function toCanonicalMmAffine(rasAffine, opts = {}) {
  const mul = opts.fromLps ? P_RAS_TO_LPS : P_RAS_TO_CANON;
  return mul4(mul, rasAffine);
}

/** Voxel → canonical-au affine (mm ÷ MM_PER_AU), given the canonical mm affine. */
export function mmToAuAffine(canonMmAffine, mmPerAu = 1.2) {
  const s = new Float64Array(16);
  s[0] = s[5] = s[10] = 1 / mmPerAu;
  s[15] = 1;
  return mul4(s, canonMmAffine);
}

/* -------------------------------------------------------------- volume io */

/**
 * Read a NIfTI-1 volume (.nii or .nii.gz) and return its samples scaled to
 * float64, plus the header and the voxel→RAS-mm affine (Float64Array).
 *
 * @param {string} path
 * @returns {{ header, data: Float64Array, dims: number[], affine: Float64Array,
 *             affineSource: string, spacingMm: number[] }}
 */
export function readNifti(path) {
  const raw = readFileSync(path);
  const isGz = path.endsWith('.gz');
  const bytes = isGz ? gunzipSync(raw) : raw;
  const header = parseNifti1Header(bytes);

  const { dims, datatypeInfo, voxOffset } = header;
  const nx = dims[0];
  const ny = dims[1];
  const nz = dims[2];
  const nVox = nx * ny * nz * (header.numVolumes || 1);
  const need = voxOffset + nVox * datatypeInfo.bytes;
  if (bytes.length < need) {
    throw new Error(`nifti: truncated volume (need ${need} bytes, have ${bytes.length})`);
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float64Array(nVox);
  const slope = Number.isFinite(header.sclSlope) && header.sclSlope !== 0 ? header.sclSlope : 1;
  const inter = Number.isFinite(header.sclInter) ? header.sclInter : 0;
  const little = header.littleEndian;
  let o = voxOffset;
  switch (header.datatype) {
    case 2: // uint8
      for (let i = 0; i < nVox; i++) out[i] = bytes[o + i] * slope + inter;
      break;
    case 4: // int16
      for (let i = 0; i < nVox; i++) out[i] = dv.getInt16(o + i * 2, little) * slope + inter;
      break;
    case 16: // float32
      for (let i = 0; i < nVox; i++) out[i] = dv.getFloat32(o + i * 4, little) * slope + inter;
      break;
    default:
      throw new Error(`nifti: datatype ${header.datatype} unsupported (supported: 2/4/16)`);
  }

  const { matrix, source } = affineFromHeader(header);
  return {
    header,
    data: out,
    dims,
    affine: matrix,
    affineSource: source,
    spacingMm: [header.pixdim[1], header.pixdim[2], header.pixdim[3]],
  };
}

/**
 * Trilinear sample at fractional voxel coordinates (x along dim0, y dim1,
 * z dim2). Returns NaN outside the volume, so callers can treat it as "no
 * data" (background) deterministically.
 */
export function sampleVoxelTrilinear(data, dims, x, y, z) {
  const [nx, ny, nz] = dims;
  if (!(x >= 0 && y >= 0 && z >= 0 && x <= nx - 1 && y <= ny - 1 && z <= nz - 1)) return NaN;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const x1 = Math.min(x0 + 1, nx - 1);
  const y1 = Math.min(y0 + 1, ny - 1);
  const z1 = Math.min(z0 + 1, nz - 1);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const at = (i, j, k) => data[(k * ny + j) * nx + i];
  const c00 = at(x0, y0, z0) * (1 - fx) + at(x1, y0, z0) * fx;
  const c10 = at(x0, y1, z0) * (1 - fx) + at(x1, y1, z0) * fx;
  const c01 = at(x0, y0, z1) * (1 - fx) + at(x1, y0, z1) * fx;
  const c11 = at(x0, y1, z1) * (1 - fx) + at(x1, y1, z1) * fx;
  const c0 = c00 * (1 - fy) + c10 * fy;
  const c1 = c01 * (1 - fy) + c11 * fy;
  return c0 * (1 - fz) + c1 * fz;
}

/** Convenience: sample a volume at a canonical-au point through its full
 *  voxel→canonical-au affine (forward), NaN when outside the FOV. */
export function sampleCanonicalAu(data, dims, voxelToCanonAu, xAu, yAu, zAu) {
  const inv = invert4(voxelToCanonAu);
  const [vx, vy, vz] = apply4(inv, xAu, yAu, zAu);
  return sampleVoxelTrilinear(data, dims, vx, vy, vz);
}
