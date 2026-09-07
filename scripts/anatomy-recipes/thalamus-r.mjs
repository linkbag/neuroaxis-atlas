/**
 * ctx-thalamus-r — realistic RIGHT thalamus envelope (task envelopes-rostral).
 *
 * Mirrored sibling of thalamus.mjs (ctx-thalamus-l): identical sculpt contract
 * (band trim, anterior tubercle, pulvinar overhang, LGN+MGN eminences, flat
 * medial face at |x| = 1.2, fbm tissue displacement) applied to the real
 * registered BodyParts3D right thalamus (FJ1827) + right LGN (FJ1813) +
 * right MGN (FJ1816), with x mirrored. Shares the field builder so the pair
 * stays geometrically consistent.
 *
 * The extra recipe file exists because the pipeline contract is one slug per
 * module (docs/GEOMETRY_PIPELINE.md §3) while plan §4 lists BOTH ctx-thalamus-l
 * and ctx-thalamus-r as envelope slugs.
 */

import { MEDIAL_FACE_X, buildThalamusField, thalamusAvailable } from './thalamus.mjs';

export const slug = 'ctx-thalamus-r';

const RES = 0.32;
const built = buildThalamusField(-1);
const field = built.field;

const ROI = (() => {
  if (built.bp3d) {
    // Band-trimmed extents (fixed by the cage; mirror of thalamus.mjs):
    // y ∈ [20.5, 39.5] +0.8; geniculates to y ≈ 10.4; x to LGN −21.7 (−1.2).
    return { min: [-23.2, 9.2, -17.6], max: [-MEDIAL_FACE_X + 0.6, 40.6, 15.2] };
  }
  return { min: [-13.0, 21.0, -11.5], max: [-MEDIAL_FACE_X + 0.6, 39.0, 9.0] };
})();

export function bbox() {
  return { min: ROI.min, max: ROI.max };
}

export function sdf(x, y, z) {
  return field(x, y, z);
}

export const meshOpts = {
  resolution: RES,
  kind: 'context',
  materialHint: 'gray-matter',
  source: built.bp3d ? 'bp3d+sculpt' : 'sculpt',
};

// Re-exported for tooling symmetry with thalamus.mjs (ignored by the CLI).
export { thalamusAvailable };
