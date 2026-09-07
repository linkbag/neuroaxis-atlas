/**
 * ctx-pineal — realistic epithalamus / pineal body (envelopes-rostral).
 *
 * Plan §5 checklist: pineal sitting between the rostral colliculi, piriform
 * body with the stalk toward the habenular/commissural region.
 *
 * Base geometry: the real registered BodyParts3D pineal (FJ1795; canonical
 * bbox [-2.5, 14.8, -20.1]..[2.7, 23.1, -9.1], centroid [-0.1, 18.8, -15.0],
 * REGISTRATION.md §8) — a piriform gland whose wide end faces dorso-rostral
 * (y 20-23, z −9..−13) and whose apex points caudo-ventrally (y 15-16,
 * z −16.5..−20.1), apex ≈ 6.5 au posterior of the aqueduct midpoint
 * (registration Class B "pineal tip": achieved [0.2, 15.8, −20.1]).
 *
 * Tilt note (task brief asks this be documented): the brief asks for a
 * "slight leftward tilt" of the piriform tip. The registered data is
 * essentially midline (centroid x = −0.1 au, |x| ≤ 1.5 midline gate per
 * registration Class A), so the tilt is applied as a subtle quadratic
 * leftward (+x) tip shift of at most 0.6 au — visible but well inside the
 * midline conformance gate, and it leaves the stalk attachment midline.
 *
 * Sculpt: habenula ridge union (the real registered habenula element — the
 * brief's "habenula ridge smooth-union"; it nearly touches the pineal,
 * probe gap 0.09 au), pineal stalk capsule, distal tip firming, subtle fbm
 * tissue on the pineal body only (the thin habenula ribbon stays raw so fbm
 * cannot perforate it).
 * Sculpt-only fallback (plan §1): piriform ellipsoid rz 3.2 at (0, 21.5, −7)
 * with a caudo-ventral tapering tip per the task brief.
 */

import { capsule, displace, ellipsoid, smoothUnion, smoothUnionAll, translate } from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { canonicalAvailable, canonicalBounds, loadCanonicalSdf } from './midbrain.mjs';

export const slug = 'ctx-pineal';

const RES = 0.18;
const HAS_BP3D = canonicalAvailable(['pineal', 'habenula']);

const tissue = createFbm3(slug, { octaves: 4, frequency: 0.4, lacunarity: 2, gain: 0.5 });

let base;
let stalk;      // pineal stalk toward the habenular commissure
let tipFirm;    // keeps the caudo-ventral apex full and piriform
let habenulaField = null;
if (HAS_BP3D) {
  base = loadCanonicalSdf(['pineal'], RES);
  stalk = capsule(0, 19.8, -11.8, -0.3, 22.4, -8.6, 0.75);
  tipFirm = translate(ellipsoid(1.7, 1.6, 2.2), 0, 15.9, -18.2);
  habenulaField = loadCanonicalSdf(['habenula'], RES);
} else {
  base = translate(ellipsoid(2.4, 2.8, 3.2), 0, 21.5, -7);
  stalk = capsule(0, 21.0, -8.5, 0, 17.5, -12.5, 1.2);
  tipFirm = translate(ellipsoid(1.2, 1.6, 1.6), 0, 17.0, -13.5);
}

// fbm on the pineal body only; the habenula ribbon unions in afterwards,
// undisplaced (a thin raw scan ribbon + fbm would pinhole).
const displacedBody = displace(smoothUnionAll([base, stalk, tipFirm], 0.6), tissue, 0.12);

// Slight leftward (+x) tip tilt, at most 0.6 au at the apex (t=1 at z≈−20.1),
// zero at/rostral of the stalk face z=−9 — midline attachment preserved.
const TILT = 0.6;
const tilted = (x, y, z) => {
  const t = Math.min(Math.max((-z - 9) / 11.1, 0), 1);
  return displacedBody(x - TILT * t * t, y, z);
};

const field = habenulaField ? smoothUnion(tilted, habenulaField, 0.5) : tilted;

/* ------------------------------------------------------------------ */

const ROI = (() => {
  if (HAS_BP3D) {
    const b = canonicalBounds(['pineal', 'habenula']);
    return {
      min: [b.min[0] - 0.8, b.min[1] - 0.8, b.min[2] - 0.8],
      max: [b.max[0] + 0.8 + TILT, b.max[1] + 0.8, b.max[2] + 0.8],
    };
  }
  return { min: [-4.0, 14.5, -16.0], max: [4.6, 25.0, -4.5] };
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
  source: HAS_BP3D ? 'bp3d+sculpt' : 'sculpt',
};
