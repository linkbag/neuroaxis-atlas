#!/usr/bin/env node
/**
 * NeuroAxis SDF kernel — minimal typed-array vec3 helpers.
 *
 * Conventions:
 *  - A "vector" is any indexable triple: Float32Array(3), Float64Array(3) or
 *    a plain [x, y, z] array. Every function writes into an `out` triple and
 *    returns it, so callers control allocation (hot loops reuse scratch).
 *  - No allocation inside the math itself; no side effects.
 *
 * Plain Node ESM, zero dependencies (docs/GEOMETRY_PIPELINE.md).
 */

export function vec3() {
  return new Float64Array(3);
}

/** out = [x, y, z] */
export function set(out, x, y, z) {
  out[0] = x; out[1] = y; out[2] = z;
  return out;
}

/** out = a */
export function copy(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2];
  return out;
}

/** out = a + b */
export function add(out, a, b) {
  out[0] = a[0] + b[0]; out[1] = a[1] + b[1]; out[2] = a[2] + b[2];
  return out;
}

/** out = a - b */
export function sub(out, a, b) {
  out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2];
  return out;
}

/** out = a * s */
export function scale(out, a, s) {
  out[0] = a[0] * s; out[1] = a[1] * s; out[2] = a[2] * s;
  return out;
}

/** out = a + b * s (fused multiply-add, avoids a temporary) */
export function addScaled(out, a, b, s) {
  out[0] = a[0] + b[0] * s;
  out[1] = a[1] + b[1] * s;
  out[2] = a[2] + b[2] * s;
  return out;
}

/** out = a lerped toward b by t in [0, 1] */
export function lerp(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}

/** a · b */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** out = a × b */
export function cross(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

/** Euclidean length */
export function length(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

/** Squared length (cheaper for comparisons). */
export function lengthSq(a) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
}

/** out = a / |a| (returns out; a zero vector stays zero). */
export function normalize(out, a) {
  const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  if (l > 0) {
    out[0] = a[0] / l; out[1] = a[1] / l; out[2] = a[2] / l;
  } else {
    out[0] = 0; out[1] = 0; out[2] = 0;
  }
  return out;
}

/** Euclidean distance between points a and b. */
export function distance(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** out = componentwise min(a, b) */
export function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]); out[1] = Math.min(a[1], b[1]); out[2] = Math.min(a[2], b[2]);
  return out;
}

/** out = componentwise max(a, b) */
export function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]); out[1] = Math.max(a[1], b[1]); out[2] = Math.max(a[2], b[2]);
  return out;
}
