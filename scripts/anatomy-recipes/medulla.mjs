/**
 * ctx-medulla-surface — medulla oblongata envelope (envelopes-hindbrain-v2b).
 *
 * Base: AMENDMENT-A canonical medulla.obj (bp3d+sculpt) voxelized at bake
 * time. Sculpt (REALISM_PLAN §5 Medulla row):
 *   - ventral paired pyramid ridges flanking the anterior median fissure
 *   - pyramidal decussation convergence/taper toward the cervicomedullary end
 *   - olivary eminences (ventral-lateral, olivary level)
 *   - gracile (medial) + cuneate (lateral) tubercles dorsal
 *   - dorsal median sulcus; anterior median fissure groove
 *   - low-amplitude fbm tissue displacement (amp ~0.25 au, freq ~1.2/au)
 * Repair (BP3D L/R halves never fully weld): caudal tip + rostral cut plugs.
 */

import {
  capsule,
  displace,
  ellipsoid,
  smoothSubtract,
  smoothUnion,
  translate,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { loadCanonicalBase, roi, seamHeal } from './lib/hindbrain-common.mjs';

export const slug = 'ctx-medulla-surface';

// Resolution split: voxelize grid (0.3) finer than the mesh step (0.32) so
// SurfaceNets samples a smooth trilinear field — avoids the grid-aligned
// crinkle that inflated the first bake to ~83k tris (slice-QA finding).
const GRID_RES = 0.3;
const MESH_RES = 0.32;
const base = loadCanonicalBase('medulla', { resolution: GRID_RES });

// ---- organic tissue pass on the registered base --------------------------
// Heal the BP3D L/R midline seam slits first (sampling warp, zero surface
// distortion); the real midline sulci are re-carved below. fbm frequency
// 0.55 keeps tissue features ~1.8 au — ~5.5 samples at the 0.32 mesh step
// (mesher aliasing above that inflated the first bake 3-4x).
const tissue = createFbm3(`${slug}/tissue`, { octaves: 4, frequency: 0.55, lacunarity: 2, gain: 0.5 });
let field = displace(seamHeal(base.sdf), tissue, 0.25);

// ---- ventral pyramids (paired ridges on the sloping ventral face) --------
// Ventral face rises from z~8 (y=-44) to z~11.5 (y=-26); axis rides ~0.4 au
// deep so the ridge protrudes ~1 au and fades toward the decussation.
const pyramidL = capsule(2.7, -45.8, 5.8, 2.9, -25.8, 11.6, 1.5);
const pyramidR = capsule(-2.7, -45.8, 5.8, -2.9, -25.8, 11.6, 1.5);
field = smoothUnion(field, pyramidL, 0.9);
field = smoothUnion(field, pyramidR, 0.9);

// anterior median fissure: midline groove between the pyramids — axis rides
// ~0.7 au inside the ventral face so the cut stays ~0.7-1.0 au deep under
// any fbm phase (a shallower r=0.42 tool went tangent after the tissue
// retune and stopped carving below the base surface).
const amfGroove = capsule(0, -44, 7.2, 0, -25.5, 10.8, 0.6);
field = smoothSubtract(field, amfGroove, 0.4);

// ---- pyramidal decussation: converging mass at the caudal taper ----------
const decussation = translate(ellipsoid(3.4, 3.0, 2.4), 0, -46.6, 4.6);
field = smoothUnion(field, decussation, 1.6);

// ---- olivary eminences (ventral-lateral, y within [-38, -29]) ------------
// review-qa (task review-qa-v2): the k=1.3 / rx 3.1 sculpt was swallowed by the
// base surface's rostral widening — zero-crossing profile showed no local peak at
// the olive belly. Widened rx 3.1→3.6, center x 5.1→5.5, blend k 1.3→0.9 so the
// eminence reads as a distinct lateral silhouette bulge (verified by profile).
const oliveL = translate(ellipsoid(3.8, 4.4, 2.9), 5.6, -33.6, 4.6);
const oliveR = translate(ellipsoid(3.8, 4.4, 2.9), -5.6, -33.6, 4.6);
field = smoothUnion(field, oliveL, 0.8);
field = smoothUnion(field, oliveR, 0.8);

// ---- dorsal column tubercles ---------------------------------------------
// gracile (medial, to y~-40) and cuneate (lateral, y in [-44, -41]).
// Centers sit ~0.3 au INSIDE the measured local dorsal surface (V-shaped:
// midline ~-1.0, x~1.8 ~-4.8, x~4.6 ~-2.4 at these levels — profile-probed)
// so each bump protrudes ~0.8 au on a solid neck instead of floating.
const gracileL = translate(ellipsoid(1.7, 2.2, 1.1), 1.8, -39.4, -5.05);
const gracileR = translate(ellipsoid(1.7, 2.2, 1.1), -1.8, -39.4, -5.05);
const cuneateL = translate(ellipsoid(1.9, 1.7, 1.0), 4.6, -42.2, -2.65);
const cuneateR = translate(ellipsoid(1.9, 1.7, 1.0), -4.6, -42.2, -2.65);
field = smoothUnion(field, gracileL, 0.7);
field = smoothUnion(field, gracileR, 0.7);
field = smoothUnion(field, cuneateL, 0.7);
field = smoothUnion(field, cuneateR, 0.7);

// dorsal median sulcus: the canonical base already carries a native V-shaped
// midline dorsal sulcus (measured: z -0.9 at (0, -40) vs -4.9 at x=1.8) —
// no carve needed; an earlier subtract at z -5..-6 was carving thin air.

// ---- weld plugs for the unwelded BP3D halves (open rims) ------------------
// caudal tip rim (y -48..-50.2) and rostral cut face (y ~ -20).
// (Lateral x±10.8 plugs removed: they sat outside the tapering rostral solid
// and shed detached mesh blobs — component analysis, 31 components -> few.)
field = smoothUnion(field, translate(ellipsoid(4.2, 1.8, 4.6), 0, -49.0, -0.4), 1.0);
field = smoothUnion(field, translate(ellipsoid(2.4, 1.4, 2.4), 0, -20.1, -1.5), 0.8);

// ---- the contract ---------------------------------------------------------

export function bbox() {
  return roi(base.tight, 1.0);
}

export function sdf(x, y, z) {
  return field(x, y, z);
}

export const meshOpts = {
  resolution: MESH_RES,
  kind: 'context',
  materialHint: 'gray-matter',
  source: 'bp3d+sculpt',
};
