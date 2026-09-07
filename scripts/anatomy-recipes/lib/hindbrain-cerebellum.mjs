/**
 * Hindbrain recipes — cerebellum envelope builder (L/R hemispheres).
 *
 * Shared by cerebellum-l.mjs / cerebellum-r.mjs (envelopes-hindbrain).
 * Base = AMENDMENT-A canonical hemisphere OBJ; sculpt = anisotropic ridged
 * fbm folia (mediolateral crests), medial-wall seal over the vermis-split
 * cut rails, peduncle-cut plug + ICP/MCP/SCP stumps toward the brainstem,
 * horizontal-fissure groove on the posterior half.
 */

import {
  capsule,
  displace,
  ellipsoid,
  intersect,
  smoothUnion,
  translate,
} from '../../lib/sdf/sdf.js';
import { loadCanonicalBase, signedRidged, horizontalFissureDent } from './hindbrain-common.mjs';

/**
 * @param {string} slug  recipe slug (seeds the folia noise)
 * @param {1|-1} side  +1 = left hemisphere, -1 = right hemisphere
 */
export function buildCerebellumHemisphere(slug, side) {
  // Resolution split: voxelize grid FINER than the mesh step, so SurfaceNets
  // samples a smooth trilinear field. The hemisphere surface is genuinely
  // large (OBJ area ~5.7k au²); 0.55 mesh + reduced folia amplitude keep the
  // bake inside the brief's <=90k tri band (~78k) at a sane GLB payload.
  // bandCells 6 keeps the clamped plateau (2.5 au) clear of the total
  // displacement amplitude (~1.6 au).
  const GRID_RES = 0.42;
  const MESH_RES = 0.55;
  const base = loadCanonicalBase(side > 0 ? 'cerebellum-left' : 'cerebellum-right', {
    resolution: GRID_RES,
    bandCells: 6,
  });
  const s = side;
  const [x0, y0, z0] = base.tight.min;
  const [, y1, z1] = base.tight.max;

  // Medial-wall seal: the register split hemispheres from the vermis strip
  // (|x| < 3 au), leaving open rails at the cut. Close them with a smooth
  // medial wall (half-space at the cut plane, bounded by a fitted ovoid AND
  // tight-bound slabs so the seal can never poke past the ROI axially).
  const cx = (x0 + base.tight.max[0]) / 2;
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  const ovoidAt = translate(
    ellipsoid(
      Math.abs(base.tight.max[0] - base.tight.min[0]) / 2 + 2.5,
      (y1 - y0) / 2 + 2.5,
      (z1 - z0) / 2 + 2.5,
    ),
    cx, cy, cz,
  );
  const CUT_X = 3.4;
  const hy = (y1 - y0) / 2;
  const hz = (z1 - z0) / 2;
  const hx = Math.abs(base.tight.max[0] - base.tight.min[0]) / 2;
  // Containment intersect: sign-fill columns through the OPEN cut rails read
  // "inside" all the way to the grid top (parity fallback on odd crossings),
  // leaving clamped negative pillars standing above the mesh that no union
  // can remove (they rim the mesher ROI — the watertightness FAIL). Clipping
  // the raw base to tight+0.7 kills every pillar; the wall union below then
  // seals the rails themselves.
  const MARGIN = 0.7;
  const contain = (x, y, z) => Math.max(
    Math.abs(x - cx) - hx - MARGIN,
    Math.abs(y - cy) - hy - MARGIN,
    Math.abs(z - cz) - hz - MARGIN,
  );
  const bounded = intersect(base.sdf, contain);
  const wall = (x, y, z) => Math.max(
    ovoidAt(x, y, z),
    s > 0 ? x - CUT_X : -x - CUT_X,
    Math.abs(x - cx) - hx - 0.8,
    Math.abs(y - cy) - hy - 0.8,
    Math.abs(z - cz) - hz - 0.8,
  );
  const sealed = smoothUnion(bounded, wall, 1.2);

  // Folia: ridged fbm, crests elongated along the mediolateral folial axis.
  // Across-folia features ~2.8 au at a 0.45 au mesh (~6 samples) — the
  // previous 0.9 frequency under-resolved into surface speckle (slice QA).
  // Faded near the medial wall; the wall is re-applied after so the seal
  // stays glassy.
  const folia = signedRidged(slug, 'x');
  const smooth = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  let field = displace(sealed, (x, y, z) => folia(x, y, z) * smooth((s * x - 5) / 3), 0.42);
  field = smoothUnion(field, wall, 0.8);

  // Horizontal fissure: shallow groove along the y=-7.2 line, posterior of
  // the peduncle attachment zone (z < -6). Carved as a surface-following
  // displacement dent: a boolean slab — even shell-clipped — still cut a
  // full-depth slit, because the grid's band clamp pins |base| at ~2.5 au
  // in the interior and defeats the shell test (slice-QA finding). The dent
  // cannot cut through the lobe by construction (plan §5: fissure *hint*).
  field = displace(field, horizontalFissureDent({}), 1.0);

  // Peduncle side: the BP3D hemisphere was cut off the brainstem — plug the
  // cut face and grow ICP/MCP/SCP stumps toward their brainstem ends.
  const pedunclePlug = translate(ellipsoid(5.6, 4.6, 3.4), s * 13.2, -19.6, -5.2);
  const mcp = capsule(s * 9.0, -14.5, -1.5, s * 13.6, -12.2, -6.8, 3.0);
  const icp = capsule(s * 8.6, -22.8, -4.2, s * 6.4, -27.6, -0.6, 2.1);
  const scp = capsule(s * 7.2, -8.6, -5.6, s * 4.6, -3.4, -1.6, 1.8);
  field = smoothUnion(field, pedunclePlug, 1.4);
  field = smoothUnion(field, mcp, 1.9);
  field = smoothUnion(field, icp, 1.4);
  field = smoothUnion(field, scp, 1.2);

  // ROI: tight bounds + 1 au, with the anterior face extended to +7.5 so the
  // MCP/ICP stump zero sets (and their chained smooth-union fillets, which
  // measured out to z ~ 6.5) stay well inside the sampled region
  // (AMENDMENT A: cerebellum context may reach x in [-48, 48], z >= -56;
  // core z cap is +26).
  const roiBox = {
    min: [x0 - 1, y0 - 1, z0 - 1],
    max: [base.tight.max[0] + 1, y1 + 1, 7.5],
  };

  return {
    slug,
    bbox: () => roiBox,
    sdf: (x, y, z) => field(x, y, z),
    meshOpts: {
      resolution: MESH_RES,
      kind: 'context',
      materialHint: 'gray-matter',
      source: 'bp3d+sculpt',
    },
    diagnostics: base.diagnostics,
  };
}
