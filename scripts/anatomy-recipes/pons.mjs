/**
 * ctx-pons-surface — pons envelope (envelopes-hindbrain-v2b).
 *
 * Base: AMENDMENT-A canonical pons.obj (bp3d+sculpt). Sculpt (§5 Pons row):
 *   - anterior basis bulge with transverse fiber ridging (sinusoidal bands
 *     arcing across the ventral face)
 *   - MCP flare posterolaterally toward the cerebellum (+ ICP stub)
 *   - shallow median basilar sulcus
 *   - fbm tissue displacement
 * Repair: the BP3D L/R halves leave a midline seam crack (ventral, caudal)
 * and open axial cut rims (pontomedullary / pontomesencephalic) — sealed by
 * a midline weld box + cut-face plugs; the basilar sulcus is re-cut after.
 */

import {
  capsule,
  displace,
  ellipsoid,
  roundBox,
  smoothSubtract,
  smoothUnion,
  translate,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { loadCanonicalBase, roi, seamHeal } from './lib/hindbrain-common.mjs';

export const slug = 'ctx-pons-surface';

// Resolution split: voxelize grid (0.36) finer than the mesh step (0.4) —
// smooth trilinear sampling for the mesher (first bake at grid==mesh 0.41
// crinkled to ~84k tris; slice-QA finding).
const GRID_RES = 0.36;
const MESH_RES = 0.4;
const base = loadCanonicalBase('pons', { resolution: GRID_RES });

// ---- seam heal + cut-face plugs (before sculpting) ------------------------
// Midline seam heal: BP3D halves gape along x=0 (hairline slits confirmed by
// field sampling) — closed by the sampling warp, which preserves the y/z
// surface profile; the real basilar sulcus is re-cut below. The weld box
// stays as belt-and-braces for the wider ventral crack, kept anterior of the
// ventricle floor (z >= -4.5). (The pontomedullary/pontomesencephalic
// cut-face plug ellipsoids were removed: wider than the tapering solid, they
// shed detached blobs — component analysis; the voxelize parity fill closes
// the rims.)
const weld = translate(roundBox(1.0, 13.8, 8.2, 0.8), 0, -8.8, 4.5);
let sealed = smoothUnion(seamHeal(base.sdf), weld, 0.8);

// ---- organic tissue --------------------------------------------------------
// fbm frequency 0.6 keeps tissue features ~1.7 au — ~4-5 mesh samples at
// 0.4 (higher frequencies aliased into crinkle in the first bake).
const tissue = createFbm3(`${slug}/tissue`, { octaves: 4, frequency: 0.6, lacunarity: 2, gain: 0.5 });
let field = displace(sealed, tissue, 0.22);

// ---- MCP flare + ICP stub toward the cerebellum ---------------------------
const mcpL = capsule(7.0, -15.0, 3.0, 13.8, -12.0, -6.5, 4.0);
const mcpR = capsule(-7.0, -15.0, 3.0, -13.8, -12.0, -6.5, 4.0);
const icpL = capsule(6.5, -20.5, -2.0, 8.5, -22.5, -7.5, 2.1);
const icpR = capsule(-6.5, -20.5, -2.0, -8.5, -22.5, -7.5, 2.1);
field = smoothUnion(field, mcpL, 2.4);
field = smoothUnion(field, mcpR, 2.4);
field = smoothUnion(field, icpL, 1.5);
field = smoothUnion(field, icpR, 1.5);

// ---- transverse pontine fiber ridging on the ventral face -----------------
// Bands run mediolateral (along x), stacked along y, arching down laterally
// with the basis; masked to the ventral half (z) and the basis window (y).
function smoothstep(e0, e1, v) {
  const t = Math.min(Math.max((v - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}
const ridgeAmplitude = 0.34;
function pontineRidges(x, y, z) {
  const arch = y - 1.1 * Math.max(0, 1 - (x * x) / 256); // bands dip laterally
  // wavelength ~2.1 au — >= 5 samples at the 0.4 au mesh step
  const wave = Math.sin(arch * 3.0);
  const ventral = smoothstep(4, 10, z);
  const yWindow = smoothstep(-21, -18, y) * (1 - smoothstep(1, 4, y));
  const xFade = 1 - smoothstep(11, 15, Math.abs(x));
  return wave * ventral * yWindow * xFade;
}
field = displace(field, pontineRidges, ridgeAmplitude);

// ---- median basilar sulcus (re-cut through weld + ridges) -----------------
const basilarSulcus = capsule(0, -21, 12.6, 0, 1, 15.2, 0.6);
field = smoothSubtract(field, basilarSulcus, 0.5);

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
