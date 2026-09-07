/**
 * ctx-midbrain-surface — realistic midbrain envelope (task envelopes-rostral).
 *
 * REALISM_PLAN §5 "Midbrain" checklist this recipe implements:
 *   - two distinct cerebral peduncles (crura) with flat-ish ventral faces,
 *     separated by an interpeduncular fossa carved between them;
 *   - corpora quadrigemina dorsally (inferior colliculi slightly larger and
 *     lower than the superior colliculi);
 *   - dorsal median groove over the aqueduct region + intercollicular groove;
 *   - trochlear decussation ridge at the dorsocaudal edge;
 *   - subtle fbm tissue displacement (amplitude 0.15 au per task brief).
 *
 * Base geometry: canonical BodyParts3D midbrain (FJ1770+FJ1817, registered by
 * scripts/lib/register.mjs, AMENDMENT-A scale) with the four colliculus
 * elements re-unioned at 1.16x so the quadrigeminal bumps read clearly.
 * Sculpt-only fallback (plan §1 fallback contract): an elliptical tube
 * (r≈5, z half-width ≈4.4) with the ventral bow plus the same relief set,
 * used only when the canonical OBJs are absent (mode: sculpt-only).
 *
 * All coordinates are canonical au (x=+left, y=+superior, z=+anterior), taken
 * from the registered canonical meshes (assets-src/bp3d/REGISTRATION.md §8):
 * midbrain bbox [-12.3, 2.8, -14.3]..[12.2, 20.3, 11.8]; SC apices y≈14.7,
 * IC apices y≈8.9; ventral crus faces z≈8.6..10.4 at y 10-14 with the
 * midline recessed to z≈6.7-7.7 (the BP3D interpeduncular relief, deepened
 * here by the fossa carve).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseOBJ } from '../lib/sdf/objio.js';
import { voxelizeTriangles } from '../lib/sdf/voxelize.js';
import {
  bowY, capsule, displace, elongate, ellipsoid, intersect, roundBox,
  smoothSubtract, smoothUnion, smoothUnionAll, translate, unionAll,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';

export const slug = 'ctx-midbrain-surface';

/* ------------------------------------------------------------------ */
/* Canonical BP3D loader (cached; shared by the rostral recipe files)  */
/* ------------------------------------------------------------------ */

const CANON_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets-src', 'bp3d', 'canonical',
);
const gridCache = new Map();

/** True when every named canonical OBJ is present (bp3d mode) — else sculpt-only. */
export function canonicalAvailable(names) {
  return names.every((n) => existsSync(join(CANON_DIR, `${n}.obj`)));
}

/** Quality score for a voxelized grid — lower is better. */
function signQuality(grid) {
  return grid.diagnostics.signDisagreementRatio * 2 + grid.diagnostics.leakColumns / 1000;
}

/**
 * Voxelize the named canonical OBJ(s) once per (name, resolution) and return a
 * composed signed-distance function (min-union across names). Negative inside.
 *
 * Thin-sheet sources (e.g. the diencephalon midline wall: ~1 au curved sheet)
 * sign-fill poorly at coarse resolutions (leaky columns, orientation
 * disagreement → phantom bubbles). When diagnostics are bad the mesh is
 * RE-VOXELIZED at half resolution in parity mode and the better grid wins
 * (deterministic: same inputs → same choice).
 */
export function loadCanonicalSdf(names, resolution) {
  const grids = names.map((name) => {
    const key = `${name}@${resolution}`;
    let grid = gridCache.get(key);
    if (!grid) {
      const mesh = parseOBJ(readFileSync(join(CANON_DIR, `${name}.obj`), 'utf8'));
      grid = voxelizeTriangles(mesh.positions, mesh.triangles, { resolution });
      if (grid.diagnostics.leakColumns > 0 || grid.diagnostics.signDisagreementRatio > 0.1) {
        const fine = voxelizeTriangles(mesh.positions, mesh.triangles, {
          resolution: resolution / 2,
          mode: 'parity',
        });
        if (signQuality(fine) < signQuality(grid)) grid = fine;
      }
      if (grid.diagnostics.leakColumns > 0 || grid.diagnostics.signDisagreementRatio > 0.1) {
        // surface-noise diagnostics (GEOMETRY_PIPELINE §voxelize) — visible in --stats runs
        console.warn(`[recipe] warn: ${name} voxelize diagnostics: ${JSON.stringify(grid.diagnostics)}`);
      }
      gridCache.set(key, grid);
    }
    return grid;
  });
  if (grids.length === 1) return grids[0].sdf;
  return (x, y, z) => {
    let d = Infinity;
    for (const g of grids) { const v = g.sdf(x, y, z); if (v < d) d = v; }
    return d;
  };
}

/** Combined grid bbox for a set of canonical names (for bbox() padding). */
export function canonicalBounds(names) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const name of names) {
    const key = `${name}@bounds`;
    if (!gridCache.has(key)) {
      const mesh = parseOBJ(readFileSync(join(CANON_DIR, `${name}.obj`), 'utf8'));
      const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      for (let i = 0; i < mesh.positions.length; i += 3) {
        for (let a = 0; a < 3; a += 1) {
          const v = mesh.positions[i + a];
          if (v < b.min[a]) b.min[a] = v;
          if (v > b.max[a]) b.max[a] = v;
        }
      }
      gridCache.set(key, b);
    }
    const b = gridCache.get(key);
    for (let a = 0; a < 3; a += 1) {
      if (b.min[a] < min[a]) min[a] = b.min[a];
      if (b.max[a] > max[a]) max[a] = b.max[a];
    }
  }
  return { min, max };
}

/* ------------------------------------------------------------------ */
/* Field construction (module scope — never inside sdf())              */
/* ------------------------------------------------------------------ */

const RES = 0.36; // payload discipline (v2b): 0.30 baked 70.9k tris / 1.66 MB;
                  // 0.36 keeps every relief feature ≥2 grid cells while fitting
                  // the repo-wide 2.5 MB GLB budget (GEOMETRY_PIPELINE §7)

const BP3D_NAMES = [
  'midbrain',
  'superior-colliculus-left', 'superior-colliculus-right',
  'inferior-colliculus-left', 'inferior-colliculus-right',
];
const HAS_BP3D = canonicalAvailable(BP3D_NAMES);

// Determinism rule: noise seeded from the part slug.
const tissue = createFbm3(slug, { octaves: 4, frequency: 0.32, lacunarity: 2, gain: 0.5 });

/** Scale a field by s about a fixed anchor point (distance-preserving). */
function scaleAbout(field, cx, cy, cz, s) {
  return (x, y, z) => field(cx + (x - cx) / s, cy + (y - cy) / s, cz + (z - cz) / s) * s;
}

// Registered colliculus centroids (REGISTRATION.md §8) — anchors for the bump boost.
const SC_CENTROIDS = [[3.6, 15.1, -9.5], [-3.3, 14.6, -9.7]];
const IC_CENTROIDS = [[3.8, 7.0, -10.0], [-3.5, 7.5, -9.5]];
const SC_NAMES = ['superior-colliculus-left', 'superior-colliculus-right'];
const IC_NAMES = ['inferior-colliculus-left', 'inferior-colliculus-right'];

let base;
if (HAS_BP3D) {
  const parts = [loadCanonicalSdf(['midbrain'], RES)];
  // Re-union the colliculi so the corpora quadrigemina read as four distinct
  // bumps: IC at 1.16x, SC at 1.08x — inferior colliculi slightly larger and
  // lower than the superior pair (plan §5 'Midbrain'; IC apex y≈8.9 vs SC
  // apex y≈14.7 in the registered data).
  SC_NAMES.forEach((n, i) => parts.push(scaleAbout(loadCanonicalSdf([n], RES), ...SC_CENTROIDS[i], 1.08)));
  IC_NAMES.forEach((n, i) => parts.push(scaleAbout(loadCanonicalSdf([n], RES), ...IC_CENTROIDS[i], 1.16)));
  const fused = smoothUnionAll(parts, 0.7);
  // Midline seam weld: the registered halves abut at x≈0 leaving a sub-voxel
  // seam sheet (|f| ≤ 0.3 along the whole midline plane — probe
  // .bp3d-probe/rostral-probe5.mjs). fbm displacement would flip the sheet
  // sign locally and pinhole the surface open (visible on the sagittal
  // midline clip). The weld is intersected with a 0.6-au dilation of the body
  // itself, so it can protrude at most ~0.6 au anywhere (no flat box poking
  // out of the rostral tectum) while still swallowing the seam sheet.
  const weldBox = translate(roundBox(0.55, 8.9, 11.35, 0.7), 0, 11.6, -2.45);
  const dilatedBody = (x, y, z) => fused(x, y, z) + 0.6;
  const welded = smoothUnion(fused, intersect(weldBox, dilatedBody), 0.9);
  // Re-carve the cerebral aqueduct channel through the weld, tracking the
  // registered lumen (probe: air at [0,11,−8] and [0,6,−7] before welding).
  // Kept open for the hindbrain task's vent-cerebral-aqueduct tube; this
  // recipe does NOT bake the aqueduct GLB.
  const aqueductChannel = unionAll(
    capsule(0, 3.5, -8.8, 0, 11.0, -7.6, 1.05),
    capsule(0, 11.0, -7.6, 0, 21.0, -2.6, 1.05),
  );
  base = smoothSubtract(welded, aqueductChannel, 0.8);
} else {
  // Sculpt-only fallback: elliptical tube r≈5 / z half ≈4.4 across the midbrain
  // band with the gentle ventral bow, plus ellipsoid colliculi at the same
  // registered anchors. Silhouette-correct; surface relief carried by the
  // shared sculpt stage below.
  const tube = bowY(
    translate(elongate(ellipsoid(5.2, 8.2, 4.4), 0, 1.6, 0), 0, 11.5, 3.0),
    1.2, 3, 20,
  );
  const bumps = [];
  SC_CENTROIDS.forEach(([cx, cy, cz]) => bumps.push(translate(ellipsoid(3.1, 2.8, 2.5), cx, cy, cz)));
  IC_CENTROIDS.forEach(([cx, cy, cz]) => bumps.push(translate(ellipsoid(3.2, 3.4, 2.9), cx, cy, cz)));
  base = smoothUnionAll([tube, ...bumps], 0.7);
}

// --- surface relief (shared by bp3d and fallback paths) ---------------------
// Interpeduncular fossa: midline carve between the crura (CN III exit region;
// v1 record surf-interpeduncular-fossa y≈9). Anchored to the MEASURED midline
// ventral face of the registered midbrain (probe: z 6.7@y10 … 8.0@y16) — each
// segment axis sits ~0.55 au anterior of the local face with r 1.5, so the
// tool crosses the surface transversally (no tangent slivers) and bites
// ~0.95 au deep, ~2.8 au wide — re-opening the crevice between the crus
// prisms after their k 1.4 blend.
const fossa = unionAll(
  capsule(0, 5.0, 9.05, 0, 10.0, 7.25, 1.5),
  capsule(0, 10.0, 7.25, 0, 16.0, 8.55, 1.5),
);
// Dorsal median groove over the rostral tectum / aqueduct region — threads the
// SC pair midline, axis just outside the face so it bites ~0.5 au deep.
const medianGroove = capsule(0, 12.4, -12.6, 0, 17.4, -13.2, 0.9);
// Transverse intercollicular groove separating SC (y≥11.9) from IC (y≤11).
const intercollicularGroove = capsule(-4.8, 11.2, -12.9, 4.8, 11.2, -12.9, 0.8);
// Trochlear decussation ridge — low transverse crest at the dorsocaudal edge
// (superior medullary velum, CN IV exit; record surf-cn4-exit y≈7.5), half
// embedded in the tectal face so it crests ~0.6 au.
const trochlearRidge = capsule(-3.6, 4.2, -12.9, 3.6, 4.2, -12.9, 0.7);

// Cerebral peduncles: paired ventrolateral prism crura (task brief) with flat
// ventral faces at z≈10 (box face 8.9 + radius 1.5 ≈ 10.4 after rounding),
// flanking the midline from x ±1.4..9.4 across y 2.5..16.5.
const crusL = translate(roundBox(2.5, 5.5, 1.1, 1.5), 5.4, 9.5, 7.4);
const crusR = translate(roundBox(2.5, 5.5, 1.1, 1.5), -5.4, 9.5, 7.4);

const sculpted = smoothSubtract(
  smoothSubtract(
    smoothUnion(
      smoothUnion(base, unionAll(crusL, crusR), 1.4),
      trochlearRidge, 0.5,
    ),
    fossa, 1.0,
  ),
  unionAll(medianGroove, intercollicularGroove),
  0.45,
);

// Organic "tissue" displacement — subtle per task brief (amp 0.15 au).
const field = displace(sculpted, tissue, 0.15);

/* ------------------------------------------------------------------ */
/* Recipe contract                                                     */
/* ------------------------------------------------------------------ */

// Tight region of interest = base surface bbox + relief extents, padded for
// the mesher (it adds 2 more cells per side). Data-driven when BP3D is present.
const ROI = (() => {
  if (HAS_BP3D) {
    const b = canonicalBounds(['midbrain', ...SC_NAMES, ...IC_NAMES]);
    return {
      min: [b.min[0] - 0.8, b.min[1] - 0.8, b.min[2] - 0.8],
      max: [b.max[0] + 0.8, b.max[1] + 0.8, b.max[2] + 0.8],
    };
  }
  return { min: [-7.5, 1.0, -15.0], max: [7.5, 21.6, 8.4] };
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
