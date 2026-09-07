/**
 * vent-cerebral-aqueduct — cerebral aqueduct CSF tube (envelopes-hindbrain-v2b).
 *
 * Base: AMENDMENT-A canonical cerebral-aqueduct.obj (midline tube, y 3..21.3,
 * between the 4th ventricle below and the 3rd ventricle above — hindbrain
 * ownership of this slug per task brief; the rostral task must NOT bake it).
 * Refinement: end plugs over the open rims + very fine mesh (0.14 au) to keep
 * the thin lumen watertight; material hint: csf.
 */

import {
  displace,
  ellipsoid,
  smoothUnion,
  translate,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { loadCanonicalBase, roi } from './lib/hindbrain-common.mjs';

export const slug = 'vent-cerebral-aqueduct';

// Resolution split: grid 0.13 finer than the 0.16 mesh step — the thin
// lumen stays fully resolved while the mesh sheds ~30% of its tris.
const GRID_RES = 0.13;
const MESH_RES = 0.16;
const base = loadCanonicalBase('cerebral-aqueduct', { resolution: GRID_RES, bandCells: 5 });

// ---- end plugs (open rims at both tube ends) -------------------------------
let field = base.sdf;
field = smoothUnion(field, translate(ellipsoid(1.5, 1.2, 1.7), 0, 3.1, -5.6), 0.5);   // caudal (4th ventricle) end
field = smoothUnion(field, translate(ellipsoid(1.5, 1.2, 1.7), 0, 21.0, -2.5), 0.5);  // rostral (3rd ventricle) end

// ---- micro displacement ----------------------------------------------------
const micro = createFbm3(`${slug}/micro`, { octaves: 3, frequency: 1.0, lacunarity: 2, gain: 0.5 });
field = displace(field, micro, 0.06);

// ---- the contract ---------------------------------------------------------

export function bbox() {
  // Wider pad than the default: the end plugs + their smooth-union fillets
  // reach ~1.5 au past the tight rim, and the zero set must stay inside the
  // sampled region (ROI + 2 cells).
  return roi(base.tight, 1.8);
}

export function sdf(x, y, z) {
  return field(x, y, z);
}

export const meshOpts = {
  resolution: MESH_RES,
  kind: 'ventricle',
  materialHint: 'csf',
  source: 'bp3d+sculpt',
};
