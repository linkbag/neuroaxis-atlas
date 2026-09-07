/**
 * ctx-cerebellar-vermis — vermis envelope (envelopes-hindbrain).
 *
 * Base: AMENDMENT-A canonical cerebellum-vermis.obj (the midline strip the
 * register fused from both hemispheres; open at the |x|~3 cut rails).
 * Sculpt: ventrodorsal-anisotropic ridged fbm folia + horizontal fissure;
 * the cut rails are sealed with smooth side slabs meeting the hemisphere
 * medial walls.
 */

import {
  displace,
  ellipsoid,
  intersect,
  smoothUnion,
  translate,
} from '../lib/sdf/sdf.js';
import { loadCanonicalBase, roi, signedRidged, horizontalFissureDent } from './lib/hindbrain-common.mjs';

export const slug = 'ctx-cerebellar-vermis';

// Resolution split (grid finer than mesh) — same rationale as the
// hemispheres: smooth trilinear sampling, no grid-aligned crinkle. Mesh 0.46
// keeps the folia at ~5 samples per crest; bbox pad 2.0 keeps the sealed
// surface clear of the mesher's sample boundary (pad 1.0 clipped the
// contour -> 306 boundary edges + fragment components, mesh analysis).
const GRID_RES = 0.38;
const MESH_RES = 0.46;
const base = loadCanonicalBase('cerebellum-vermis', { resolution: GRID_RES });
const [x0, y0, z0] = base.tight.min;
const [x1, y1, z1] = base.tight.max;

// ---- side seals over the split cut rails ----------------------------------
// Ovoid fit bounded by tight-bound slabs (|y|,|z| within tight + 0.8) so the
// seal stays inside the mesher ROI.
const cx = 0;
const cy = (y0 + y1) / 2;
const cz = (z0 + z1) / 2;
const hy = (y1 - y0) / 2;
const hz = (z1 - z0) / 2;
const ovoidAt = translate(
  ellipsoid((x1 - x0) / 2 + 2.0, hy + 2.5, hz + 2.5),
  cx, cy, cz,
);
const CUT_X = 3.6;
// Containment intersect (same rationale as the hemispheres): parity-fallback
// columns through the open rails leave clamped negative pillars standing to
// the grid top; clipping the raw base to tight+0.7 removes them, then the
// side walls seal the rails.
const MARGIN = 0.7;
const contain = (x, y, z) => Math.max(
  Math.abs(x - cx) - 3 - MARGIN,
  Math.abs(y - cy) - hy - MARGIN,
  Math.abs(z - cz) - hz - MARGIN,
);
const bounded = intersect(base.sdf, contain);
const sideWalls = (x, y, z) => Math.max(
  ovoidAt(x, y, z),
  Math.abs(x) - CUT_X,
  Math.abs(y - cy) - hy - 0.8,
  Math.abs(z - cz) - hz - 0.8,
);
let field = smoothUnion(bounded, sideWalls, 1.4);

// ---- folia: ridged fbm with crests elongated ventrodorsally ---------------
// Across-folia features ~2.8 au at a 0.4 au mesh (~7 samples) — the previous
// 0.9 frequency under-resolved into surface speckle (slice-QA finding).
const folia = signedRidged(slug, 'y');
field = displace(field, folia, 0.34);

// ---- horizontal fissure (continuous with the hemispheres) -----------------
// Surface-following displacement dent. A boolean slab — even shell-clipped —
// still cut a full-depth slit: the grid band clamp pins |base| near 2.5 au
// through the interior, defeating the shell test (slice-QA finding).
field = displace(field, horizontalFissureDent({}), 1.0);

// ---- the contract ---------------------------------------------------------

export function bbox() {
  return roi(base.tight, 2.0);
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
