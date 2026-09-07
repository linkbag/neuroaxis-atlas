/**
 * SAMPLE RECIPE — demo-ellipsoid (NeuroAxis v2 geometry pipeline).
 *
 * This module pins the recipe contract consumed by
 * scripts/build-anatomy-geometry.mjs. It is a DEMO: slugs starting with
 * "demo-" are excluded from `--all` and from anatomy-manifest.json, so it
 * never pollutes committed assets. Bake it explicitly with:
 *
 *   node scripts/build-anatomy-geometry.mjs --part demo-ellipsoid
 *
 * Real per-part recipes (medulla, pons, ...) are authored by the envelope
 * tasks following this exact shape — see docs/GEOMETRY_PIPELINE.md.
 */

import { displace, ellipsoid, translate } from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';

// ---- build the field ONCE at module scope (never inside sdf()) ----------
export const slug = 'demo-ellipsoid';

// Determinism rule: every noise source is seeded from the slug string, so
// the baked GLB is byte-identical on every machine and every run.
const tissueNoise = createFbm3(slug, { octaves: 4, lacunarity: 2, gain: 0.5 });

const baseShape = translate(ellipsoid(8, 12, 9), 0, -2, 0);
// Organic displacement ≈ 10% of the mean radius (plan §6 default rule).
const field = displace(baseShape, tissueNoise, 1.0);

// ---- the contract --------------------------------------------------------

/** Region of interest in canonical space (au). The mesher pads this. */
export function bbox() {
  return { min: [-12, -16, -12], max: [12, 12, 12] };
}

/** Signed distance, negative inside (au). Must be pure + deterministic. */
export function sdf(x, y, z) {
  return field(x, y, z);
}

/** Bake options (all optional). */
export const meshOpts = {
  resolution: 0.35,      // au per grid step (kernel default 0.35)
  kind: 'context',       // manifest "kind" (context | nucleus | ...)
  materialHint: 'gray-matter', // manifest material hint
  source: 'sculpt',      // manifest source: 'sculpt' | 'bp3d+sculpt'
};
