/**
 * vent-fourth-ventricle — fourth ventricle CSF space (envelopes-hindbrain-v2b).
 *
 * Base: AMENDMENT-A canonical fourth-ventricle.obj — the tent-shaped cavity
 * with rhomboid fossa and lateral recesses already in the registered BP3D
 * surface. Refinement: gentle fbm micro-displacement + plugs over the open
 * apertures (obex/caudal end, rostral aqueduct transition, lateral recess
 * tips) so the baked shell is watertight. Material hint: csf (cyan).
 */

import {
  displace,
  ellipsoid,
  smoothUnion,
  translate,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { loadCanonicalBase, roi } from './lib/hindbrain-common.mjs';

export const slug = 'vent-fourth-ventricle';

// Resolution split: grid 0.26 finer than the 0.32 mesh step — smooth
// sampling surface at ~half the first bake's tri count (slice-QA finding).
const GRID_RES = 0.26;
const MESH_RES = 0.32;
const base = loadCanonicalBase('fourth-ventricle', { resolution: GRID_RES });

// ---- aperture plugs (boundary rims measured on the canonical OBJ) ---------
// obex end + rostral aqueduct transition. (The lateral-recess tip plugs at
// x ±10.8 were removed: the real recess cavities end near |x| ~ 7.5, so the
// plugs floated clear of the tent as detached nodules — visible on a
// translucent CSF mesh; component analysis. The voxelize parity fill closes
// the recess rim ends.)
let field = base.sdf;
field = smoothUnion(field, translate(ellipsoid(2.2, 2.0, 2.4), 0, -29.6, -5.5), 0.6);   // obex end
field = smoothUnion(field, translate(ellipsoid(2.0, 1.8, 2.2), 0, 2.7, -5.4), 0.6);     // rostral end

// ---- micro tissue displacement (CSF boundary stays smooth) ----------------
const micro = createFbm3(`${slug}/micro`, { octaves: 3, frequency: 0.7, lacunarity: 2, gain: 0.5 });
field = displace(field, micro, 0.1);

// ---- the contract ---------------------------------------------------------

export function bbox() {
  return roi(base.tight, 1.0);
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
