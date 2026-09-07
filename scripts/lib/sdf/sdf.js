/**
 * NeuroAxis SDF kernel — signed-distance primitives and combinators.
 *
 * Field convention: an SDF is a pure function f(x, y, z) -> number with
 * f < 0 INSIDE the solid and f > 0 outside. Distances are in canonical
 * atlas units (au); the kernel itself is unit-agnostic.
 *
 * Every primitive/combinator returns a NEW closure built once. Recipes must
 * compose fields at module scope (cheap) — never inside the per-sample call
 * (which would allocate millions of closures; see docs/GEOMETRY_PIPELINE.md).
 *
 * Caveat carried from SDF practice: domain warps (elongate/bend/twist) and
 * displacement are Lipschitz-safe only within their stated bounds. They keep
 * the ZERO SET exact (which is all SurfaceNets needs) but may distort the
 * off-surface distance magnitude; keep bboxes padded (default mesher pad
 * covers this).
 *
 * Plain Node ESM, zero dependencies.
 */

/* ------------------------------------------------------------- primitives */

/** Sphere of radius r centered at the origin. */
export function sphere(r) {
  return function f(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z) - r;
  };
}

/**
 * Ellipsoid with radii (rx, ry, rz) at the origin. Uses the standard bounded
 * approximation k0*(k0-1)/k1: its zero set is EXACTLY the ellipsoid surface
 * (correct meshes); off-surface values are a conservative (under-)estimate.
 */
export function ellipsoid(rx, ry, rz) {
  const ix = 1 / rx, iy = 1 / ry, iz = 1 / rz;
  const ixx = ix * ix, iyy = iy * iy, izz = iz * iz;
  const minR = Math.min(rx, ry, rz);
  return function f(x, y, z) {
    const k0 = Math.sqrt(x * x * ixx + y * y * iyy + z * z * izz);
    if (k0 < 1e-9) return -minR; // deep inside, avoid 0/0
    const k1 = Math.sqrt(x * x * ixx * ixx + y * y * iyy * iyy + z * z * izz * izz);
    if (k1 < 1e-12) return -minR;
    return k0 * (k0 - 1) / k1;
  };
}

/**
 * Rounded box with half-extents (bx, by, bz) and corner radius r,
 * centered at the origin.
 */
export function roundBox(bx, by, bz, r) {
  return function f(x, y, z) {
    const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz;
    const ax = Math.max(qx, 0), ay = Math.max(qy, 0), az = Math.max(qz, 0);
    return Math.sqrt(ax * ax + ay * ay + az * az)
      + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
  };
}

/** Cylinder along the y axis: radius r, half-height h, centered at origin. */
export function cylinderY(r, h) {
  return function f(x, y, z) {
    const dx = Math.sqrt(x * x + z * z) - r;
    const dy = Math.abs(y) - h;
    const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
    return Math.min(Math.max(dx, dy), 0) + Math.sqrt(ox * ox + oy * oy);
  };
}

/** Capsule (rounded segment) from a=[ax,ay,az] to b=[bx,by,bz], radius r. */
export function capsule(ax, ay, az, bx, by, bz, r) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const ab2 = abx * abx + aby * aby + abz * abz;
  return function f(x, y, z) {
    const apx = x - ax, apy = y - ay, apz = z - az;
    let t = 0;
    if (ab2 > 0) t = Math.min(1, Math.max(0, (apx * abx + apy * aby + apz * abz) / ab2));
    const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  };
}

/**
 * Cone frustum along the y axis: radius r1 at y=-h, r2 at y=+h
 * (r1 = r2 gives a cylinder). Standard bounded IQ form.
 */
export function cappedConeY(h, r1, r2) {
  return function f(x, y, z) {
    const qx = Math.sqrt(x * x + z * z), qy = y;
    const k1x = r2, k1y = h;
    const k2x = r2 - r1, k2y = 2 * h;
    const cax = qx - Math.min(qx, qy < 0 ? r1 : r2);
    const cay = Math.abs(qy) - h;
    let cd = (k1x - qx) * k2x + (k1y - qy) * k2y;
    cd /= (k2x * k2x + k2y * k2y);
    const t = Math.min(1, Math.max(0, cd));
    const cbx = qx - k1x + k2x * t;
    const cby = qy - k1y + k2y * t;
    const s = (cbx < 0 && cay < 0) ? -1 : 1;
    return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
  };
}

/** Torus around the y axis (ring in the xz plane): major R, minor r. */
export function torusY(R, r) {
  return function f(x, y, z) {
    const dx = Math.sqrt(x * x + z * z) - R;
    const dy = y;
    return Math.sqrt(dx * dx + dy * dy) - r;
  };
}

/* ------------------------------------------------------- hard boolean ops */

/** Hard union: a ∪ b. */
export function union(f, g) {
  return (x, y, z) => Math.min(f(x, y, z), g(x, y, z));
}

/** Hard subtract: a − b (carve g out of f). */
export function subtract(f, g) {
  return (x, y, z) => Math.max(f(x, y, z), -g(x, y, z));
}

/** Hard intersect: a ∩ b. */
export function intersect(f, g) {
  return (x, y, z) => Math.max(f(x, y, z), g(x, y, z));
}

/* ----------------------------------------------------- smooth boolean ops */

/** Polynomial smooth-min of two scalars with blending radius k > 0. */
function smin(a, b, k) {
  const h = Math.min(Math.max(0.5 + 0.5 * (b - a) / k, 0), 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

/** Polynomial smooth-max (−smin of the negations). */
function smax(a, b, k) {
  const h = Math.min(Math.max(0.5 - 0.5 * (b - a) / k, 0), 1);
  return b * (1 - h) + a * h + k * h * (1 - h);
}

/**
 * Smooth union with blending radius k — each op carries its own k, so a
 * recipe can blend the pons into the midbrain broadly (large k) while
 * attaching small nuclei tightly (small k).
 */
export function smoothUnion(f, g, k) {
  return (x, y, z) => smin(f(x, y, z), g(x, y, z), k);
}

/** Smooth subtract: carve g out of f with fillet radius k. */
export function smoothSubtract(f, g, k) {
  return (x, y, z) => smax(f(x, y, z), -g(x, y, z), k);
}

/** Smooth intersect with blending radius k. */
export function smoothIntersect(f, g, k) {
  return (x, y, z) => smax(f(x, y, z), g(x, y, z), k);
}

/** n-ary union convenience: unionAll(f1, f2, ...). */
export function unionAll(...fields) {
  if (fields.length === 0) throw new Error('unionAll: at least one field required');
  if (fields.length === 1) return fields[0];
  let acc = fields[0];
  for (let i = 1; i < fields.length; i += 1) {
    const g = fields[i];
    const prev = acc;
    acc = (x, y, z) => Math.min(prev(x, y, z), g(x, y, z));
  }
  return acc;
}

/** n-ary smooth union convenience: every blend uses radius k. */
export function smoothUnionAll(fields, k) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('smoothUnionAll: array of fields required');
  }
  let acc = fields[0];
  for (let i = 1; i < fields.length; i += 1) {
    const g = fields[i];
    const prev = acc;
    acc = (x, y, z) => smin(prev(x, y, z), g(x, y, z), k);
  }
  return acc;
}

/* ------------------------------------------------------------- transforms */

/** Translate a field by (tx, ty, tz). */
export function translate(f, tx, ty, tz) {
  return (x, y, z) => f(x - tx, y - ty, z - tz);
}

/** Uniform scale a field by s (distance scales by s, so result stays an SDF). */
export function scaleU(f, s) {
  const inv = 1 / s;
  return (x, y, z) => f(x * inv, y * inv, z * inv) * s;
}

/** Invert a field (inside ↔ outside). */
export function invert(f) {
  return (x, y, z) => -f(x, y, z);
}

/* ------------------------------------------------------------ domain warps */

/**
 * Elongate along each axis by (ex, ey, ez): the shape is stretched by
 * holding the field constant inside the |e| box. Distance stays valid for
 * |f| < min(e). Pass 0 to leave an axis unchanged.
 */
export function elongate(f, ex, ey, ez) {
  return function f2(x, y, z) {
    const qx = x - Math.min(Math.max(x, -ex), ex);
    const qy = y - Math.min(Math.max(y, -ey), ey);
    const qz = z - Math.min(Math.max(z, -ez), ez);
    return f(qx, qy, qz);
  };
}

/**
 * Quadratic bend in x as a function of y (iq's odd bend): the material is
 * bowed sideways by k*y². k > 0 bows toward +x as |y| grows.
 */
export function bendY(f, k) {
  return (x, y, z) => f(x + k * y * y, y, z);
}

/**
 * Bounded sinusoidal bow: x' = x + amp * sin(pi * (y - y0) / (y1 - y0)),
 * clamped to 0 outside [y0, y1]. Useful for the gentle ventral midbrain
 * bow with exact control at the warp anchors (REALISM_PLAN §3.3).
 */
export function bowY(f, amp, y0, y1) {
  const span = y1 - y0;
  return function f2(x, y, z) {
    if (y <= y0 || y >= y1) return f(x, y, z);
    return f(x + amp * Math.sin(Math.PI * (y - y0) / span), y, z);
  };
}

/**
 * Twist around the y axis by angle = turnsPerUnit * y (radians per au).
 * Rotates the xz cross-section progressively with height.
 */
export function twistY(f, turnsPerUnit) {
  return function f2(x, y, z) {
    const a = turnsPerUnit * y;
    const c = Math.cos(a), s = Math.sin(a);
    return f(c * x - s * z, y, s * x + c * z);
  };
}

/**
 * Displacement combinator: f(p) + amplitude * g(p), where g is a bounded
 * noise function (e.g. createFbm3(seed) from ./noise.js) in ~[-1, 1].
 * This is the difference between "plastic primitive" and "tissue" — keep
 * amplitude ≈ 8–15% of the local feature radius (plan §6 default rule).
 */
export function displace(f, g, amplitude) {
  return (x, y, z) => f(x, y, z) + amplitude * g(x, y, z);
}
