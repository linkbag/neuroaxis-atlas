/**
 * ctx-thalamus-l — realistic LEFT thalamus envelope (task envelopes-rostral).
 *
 * REALISM_PLAN §5 "Diencephalon" checklist items implemented here (per side):
 *   - paired thalamic ovoid on the real registered BodyParts3D thalamus
 *     (ISA addendum FJ1782/FJ1827; thalamus-left.obj bbox
 *     [0.2, 16.7, -16.4]..[19.8, 43.9, 14.1], centroid [10.3, 29.7, -3.0]);
 *   - anterior tubercle: rostral-dorsal bump at the rostro-medial pole;
 *   - pulvinar posterior overhang: postero-inferior prominence reinforced
 *     over the midbrain (real mesh already overhangs to z −16.4 at y≈23);
 *   - lateral + medial geniculate bodies: the registered LGN element unioned
 *     at 1.0x into the ventro-lateral pulvinar face, the MGN element at 0.95x
 *     posteromedial to it (brief: "smooth-union lgn-*.obj and mgn-*.obj as
 *     ventrolateral/posterolateral eminences of the respective side"), in
 *     their registered sub-band position;
 *   - thalamic band trim (v2b brief): the registered pair spans
 *     y 16.7..43.9 while the canonical thalamic band is y∈[22,38] — overflow
 *     is trimmed by a rounded band cage (extent y ∈ [20.5, 39.5], k 2.5
 *     fillet), keeping the pulvinar posterior overhang (y≈24, inside the
 *     cage) and the anterior tubercle. A squeeze-warp clamp was tried first
 *     and rejected: queries past the compressed range keep sampling
 *     still-solid original slices, extruding the mesh to the ROI caps
 *     (baked bbox reached y 45.8); a trim removes the overflow outright.
 *   - medial face cut FLAT at x = ±1.2 against the third-ventricle slit
 *     (vent-third-ventricle occupies |x| ≤ 1.0 → 0.2+ au clearance);
 *   - gentle fbm tissue displacement.
 *
 * Sculpt-only fallback (plan §1): oblate ovoid rx 6.5 ry 7.5 rz 9.5 at
 * x ±5, y 30, z −1 per the task brief, with the same relief set.
 *
 * This module also exports buildThalamusField(side) + helpers so
 * thalamus-r.mjs (ctx-thalamus-r) bakes the mirrored side from the same
 * contract (extra named exports are ignored by the recipe CLI).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseOBJ } from '../lib/sdf/objio.js';
import { voxelizeTriangles } from '../lib/sdf/voxelize.js';
import {
  displace, ellipsoid, intersect, roundBox, smoothIntersect, smoothUnion,
  smoothUnionAll, translate,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { canonicalAvailable, canonicalBounds, loadCanonicalSdf } from './midbrain.mjs';

export const slug = 'ctx-thalamus-l';

const RES = 0.32;

// Half-width of the flat medial face (brief: "plane cut x=±1.2").
export const MEDIAL_FACE_X = 1.2;

export function thalamusAvailable() {
  return canonicalAvailable([
    'thalamus-left', 'thalamus-right',
    'lgn-left', 'lgn-right', 'mgn-left', 'mgn-right',
  ]);
}

/** Scale a field by s about a fixed anchor point (distance-preserving). */
function scaleAbout(field, cx, cy, cz, s) {
  return (x, y, z) => field(cx + (x - cx) / s, cy + (y - cy) / s, cz + (z - cz) / s) * s;
}

/**
 * Thalamic band cage (v2b brief): rounded slab keeping y ∈ [20.5, 39.5].
 * Intersecting the registered thalamus (y 16.7..43.9) with it trims the
 * band overflow; the k 2.5 fillet rounds the cut edges. Bounded on every
 * axis, so unlike a squeeze warp it cannot extrude past its faces.
 */
const BAND_CAGE = translate(roundBox(80, 7, 80, 2.5), 0, 30, 0);
const BAND_CAGE_K = 2.5;

/**
 * Build the sculpted thalamus field for one side.
 * @param {number} side +1 = left (x>0), −1 = right (x<0)
 * @returns {{ field: (x,y,z)=>number, bp3d: boolean }}
 */
export function buildThalamusField(side) {
  const hasBp3d = thalamusAvailable();
  // Per-side seeds keep the two slugs byte-independent but deterministic.
  const tissue = createFbm3(side > 0 ? 'ctx-thalamus-l' : 'ctx-thalamus-r',
    { octaves: 4, frequency: 0.16, lacunarity: 2, gain: 0.5 });

  const sx = (x) => side * x; // mirror helper for anchor placement

  let base;
  let lgnField = null;
  let mgnField = null;
  let lgnCentroid = null;
  if (hasBp3d) {
    // Thalamic band trim (see header): cage keeps y ∈ [20.5, 39.5], fillet k 2.5.
    base = smoothIntersect(
      loadCanonicalSdf([side > 0 ? 'thalamus-left' : 'thalamus-right'], RES),
      BAND_CAGE, BAND_CAGE_K,
    );
    const lgnName = side > 0 ? 'lgn-left' : 'lgn-right';
    // Registered LGN centroids (REGISTRATION.md §8): L [18.4, 14.7, -5.7], R [-16.4, 14.7, -7.2].
    // Full scale (1.0) so the bump genuinely overlaps the trimmed pulvinar
    // face; unioned AFTER the cage so it keeps its registered sub-band seat.
    lgnCentroid = side > 0 ? [18.4, 14.7, -5.7] : [-16.4, 14.7, -7.2];
    lgnField = scaleAbout(loadCanonicalSdf([lgnName], RES), ...lgnCentroid, 1.0);
    // Medial geniculate eminence (v2b brief): registered MGN bboxes
    // L [10.4,10.4,-10.2]..[16,18.3,-3.5] → centroid [13.2,14.35,-6.85];
    // R mirrored to x<0. Also unioned after the trim (registered position).
    const mgnName = side > 0 ? 'mgn-left' : 'mgn-right';
    mgnField = scaleAbout(loadCanonicalSdf([mgnName], RES), sx(13.2), 14.35, -6.85, 0.95);
  } else {
    // Fallback oblate ovoid (task brief): rx 6.5 ry 7.5 rz 9.5 at x ±5, y 30, z −1.
    base = translate(ellipsoid(6.5, 7.5, 9.5), sx(5), 30, -1);
  }

  // Pulvinar posterior overhang — postero-inferior reinforcement so the
  // caudal prominence over the midbrain reads clearly (target y≈24, z≈−8..−13).
  // Sized to REACH THE GENICULATES: the band cage trims the registered
  // pulvinar floor to y ≥ 20.5 while the LGN/MGN keep their registered seat
  // (y ≤ 18.4), which would leave them floating ~2 au off the envelope —
  // this bump (bottom y≈16.4, reaching x≈16.4, z −14.4..−7.6) re-bridges the
  // pulvinar to the geniculate eminences, as in real anatomy.
  const pulvinar = translate(ellipsoid(3.4, 3.0, 3.4), sx(13.0), 19.4, -11.0);
  // Anterior tubercle — rostral-dorsal bump at the rostro-medial pole.
  const tubercle = translate(ellipsoid(2.0, 2.0, 2.4), sx(3.4), 37.5, 10.6);

  const parts = [base, pulvinar, tubercle];
  if (lgnField) parts.push(lgnField);
  if (mgnField) parts.push(mgnField);
  const relieved = smoothUnionAll(parts, 1.2);

  // Organic displacement BEFORE the medial cut so the flat 3V wall stays exact
  // (slit clearance: face at |x|=1.2 vs CSF at |x|≤1.0).
  const displaced = displace(relieved, tissue, 0.26);

  // Hard medial cut against the 3V slit: keep the LATERAL bulk, trim everything
  // medial of |x| = 1.2 so the medial face lands exactly on the plane
  // (f < 0 kept per SDF convention → keep x·side ≥ MEDIAL_FACE_X).
  const field = intersect(displaced, (x) => MEDIAL_FACE_X - x * side);
  return { field, bp3d: hasBp3d, lgnCentroid };
}

/* ------------------------------ left side ------------------------------ */

const built = buildThalamusField(1);
const field = built.field;

// Region of interest: base bbox + relief extents (LGN bump hangs to y≈11.6),
// padded for the mesher. Falls back to the brief's schematic box when sculpt-only.
const ROI = (() => {
  if (built.bp3d) {
    // Band-trimmed extents (fixed by the cage): y ∈ [20.5, 39.5] +0.8 for
    // rounding/displacement; geniculates keep their registered seat down to
    // y ≈ 10.4 (blends +0.9); x to the LGN edge 21.7 (+1.2 blend); z to the
    // trimmed pulvinar −16.4 / tubercle blend +14.2.
    return { min: [MEDIAL_FACE_X - 0.6, 9.2, -17.6], max: [23.2, 40.6, 15.2] };
  }
  return { min: [MEDIAL_FACE_X - 0.6, 21.0, -11.5], max: [13.0, 39.0, 9.0] };
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
