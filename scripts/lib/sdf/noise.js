/**
 * NeuroAxis SDF kernel — deterministic seeded noise.
 *
 * Everything here is pure and reproducible: no Math.random, no Date.now, no
 * shared mutable state. A field built with the same seed string always
 * produces bit-identical values on every run (the determinism rule enforced
 * on recipes — see docs/GEOMETRY_PIPELINE.md).
 *
 * Provides:
 *   hashString(str)            -> 32-bit uint (stable string -> seed)
 *   mulberry32(seed)           -> () in [0,1)
 *   createSimplex3(seed)       -> (x,y,z) in ~[-1,1]
 *   createFbm3(seed, opts)     -> (x,y,z) in ~[-1,1], fractal sum
 *   createRidgedFbm3(seed,opts)-> (x,y,z) in ~[0,1], sharp ridges (folia)
 *
 * Plain Node ESM, zero dependencies.
 */

/* --------------------------------------------------------------- seeding */

/** Stable 32-bit string hash (cyrb53 family, reduced to uint32). */
export function hashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) ^ (h1 >>> 0);
}

/** Small, fast, well-distributed seeded PRNG -> values in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Accepts a seed string ("slug") or a number. */
function toSeed(seed) {
  return typeof seed === 'string' ? hashString(seed) : seed >>> 0;
}

/* ----------------------------------------------------- simplex noise (3D) */

const GRAD3 = new Int8Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
  1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
  0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

const F3 = 1 / 3;
const G3 = 1 / 6;

/**
 * Seeded 3D simplex noise (Gustavson-style). Returns a pure function
 * (x, y, z) -> value in ~[-1, 1]. `seed` may be a string (recommended:
 * the recipe slug, so each structure gets independent, reproducible noise)
 * or a 32-bit number.
 */
export function createSimplex3(seed) {
  const rand = mulberry32(toSeed(seed));

  // Seeded permutation of 0..255, doubled to avoid index masking.
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) p[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  return function simplex3(xin, yin, zin) {
    // Skew input space to determine the containing simplex cell.
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);

    // Rank the coordinates to pick the simplex (tetrahedron) corner order.
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0)      { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else               { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0)       { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0)  { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else               { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    const x1 = x0 - i1 + G3,     y1 = y0 - j1 + G3,     z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3,  y3 = y0 - 1 + 3 * G3,  z3 = z0 - 1 + 3 * G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;
    const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
    const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
    const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
    const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;

    let n = 0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { t0 *= t0; n += t0 * t0 * (GRAD3[gi0] * x0 + GRAD3[gi0 + 1] * y0 + GRAD3[gi0 + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { t1 *= t1; n += t1 * t1 * (GRAD3[gi1] * x1 + GRAD3[gi1 + 1] * y1 + GRAD3[gi1 + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { t2 *= t2; n += t2 * t2 * (GRAD3[gi2] * x2 + GRAD3[gi2 + 1] * y2 + GRAD3[gi2 + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { t3 *= t3; n += t3 * t3 * (GRAD3[gi3] * x3 + GRAD3[gi3 + 1] * y3 + GRAD3[gi3 + 2] * z3); }
    return 32 * n;
  };
}

/* ------------------------------------------------------------ fractal sums */

/**
 * Fractal Brownian motion over seeded simplex3: sum of octaves with
 * geometrically growing frequency and decaying amplitude, normalized to
 * ~[-1, 1].
 *
 * opts: { octaves = 4, frequency = 1, lacunarity = 2, gain = 0.5 }
 */
export function createFbm3(seed, opts = {}) {
  const noise = createSimplex3(seed);
  const octaves = Math.max(1, opts.octaves | 0 || 4);
  const frequency = opts.frequency ?? 1;
  const lacunarity = opts.lacunarity ?? 2;
  const gain = opts.gain ?? 0.5;

  // Precompute per-octave amplitude and normalization (deterministic).
  let norm = 0;
  const amps = new Float64Array(octaves);
  let amp = 1;
  for (let o = 0; o < octaves; o += 1) { amps[o] = amp; norm += amp; amp *= gain; }

  return function fbm3(x, y, z) {
    let sum = 0;
    let freq = frequency;
    for (let o = 0; o < octaves; o += 1) {
      sum += amps[o] * noise(x * freq, y * freq, z * freq);
      freq *= lacunarity;
    }
    return sum / norm;
  };
}

/**
 * Ridged fbm (Musgrave-style): produces sharp, ridge-like creases — the
 * basis for cerebellar folia striation (REALISM_PLAN §6). Returns ~[0, 1]
 * with ridges approaching 1.
 *
 * opts: { octaves = 4, frequency = 1, lacunarity = 2, gain = 0.5 }
 */
export function createRidgedFbm3(seed, opts = {}) {
  const noise = createSimplex3(seed);
  const octaves = Math.max(1, opts.octaves | 0 || 4);
  const frequency = opts.frequency ?? 1;
  const lacunarity = opts.lacunarity ?? 2;
  const gain = opts.gain ?? 0.5;

  let norm = 0;
  const amps = new Float64Array(octaves);
  let amp = 1;
  for (let o = 0; o < octaves; o += 1) { amps[o] = amp; norm += amp; amp *= gain; }

  return function ridged3(x, y, z) {
    let sum = 0;
    let freq = frequency;
    let weight = 1;
    for (let o = 0; o < octaves; o += 1) {
      let n = 1 - Math.abs(noise(x * freq, y * freq, z * freq));
      n *= n;          // sharpen the ridge crest
      n *= weight;     // spectral weighting by previous octave
      weight = Math.min(Math.max(n * 2, 0), 1);
      sum += n * amps[o];
      freq *= lacunarity;
    }
    return sum / norm;
  };
}
