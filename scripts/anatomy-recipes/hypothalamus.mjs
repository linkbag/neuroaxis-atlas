/**
 * ctx-hypothalamus-surface — realistic hypothalamus envelope (envelopes-rostral).
 *
 * REALISM_PLAN §5 "Diencephalon" checklist items implemented:
 *   - mammillary bodies: PAIRED spheres (r 1.8) on the inferior face — visible
 *     as two distinct bumps with a midline cleft;
 *   - tuber / infundibulum: median recess carved into the inferior face where
 *     the stalk attaches (median eminence → infundibulum);
 *   - optic chiasm ridge: transverse ridge on the rostro-ventral edge;
 *   - hypothalamic sulcus: gentle bilateral groove along the superior
 *     thalamus-facing boundary;
 *   - fbm tissue displacement.
 *
 * Base geometry (v2b brief): fuse of the two registered BodyParts3D
 * hypothalamus element pairs per side (FJ1760+FJ1780 L, FJ1808+FJ1828 R;
 * canonical bboxes y 6.4..28, z 7.9..23.4, x ±7.2 — REGISTRATION.md §8) PLUS
 * the diencephalon-midline slab's ventral parts (FJ1730 L/R, clipped to
 * z ≥ −4 with a hard halfspace intersect — the slab's rostral wall forms the
 * third-ventricle floor/lamina-terminalis region; its caudal tail behind
 * z −4 is epithalamic midline mass and is dropped). The BP3D mesh carries no
 * mammillary detail (PROBE.md §"What recipes must sculpt" item 4), so the
 * mammillary bodies are sculpted at the AMENDMENT-A landmark:
 *   - mammillary pair r 1.8 at (±2.7, 28, 5.5): the binding review target is
 *     [0, 28, +10] with ±3 au (y) / ±5 au (x,z) tolerance, so the apex at
 *     [±2.7, 28, 7.3] passes while the pair hugs the registered midline wall
 *     (probe: wall material at [−2.2, 28, 4] solid, [0, 28, 6] within 0.33 au
 *     — the k=1.3 blend bridges the left sphere's ~0.9 au gap; the brief's
 *     schematic z≈4 anchor is 6 au off the binding target and would also
 *     detach from the registered surface). The frozen nuc-mammillary-body
 *     records (±2.5, 28, 4 ±0.8) stay inside the bumps for the §6 containment
 *     check.
 *   - optic ridge at (0, 12.3, 22.6): rostro-ventral edge (z max 23.4).
 * Sculpt-only fallback (plan §1): hypothalamic wedge y∈[26,38], z∈[3,9] with
 * the brief's schematic feature anchors.
 */

import { capsule, displace, elongate, ellipsoid, intersect, roundBox, smoothSubtract, smoothUnion, smoothUnionAll, translate, unionAll } from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { canonicalAvailable, canonicalBounds, loadCanonicalSdf } from './midbrain.mjs';

export const slug = 'ctx-hypothalamus-surface';

const RES = 0.32; // 0.28 baked 89.7k tris (over the 8k–80k band) once the
                  // midline wall landed; 0.32 keeps r≥1 features ≥3 cells
const HAS_BP3D = canonicalAvailable([
  'hypothalamus-left', 'hypothalamus-right',
  'diencephalon-midline-left', 'diencephalon-midline-right',
]);

// fbm amplitude 0.09: the midline slab is a THIN (≈1 au) curved wall — a
// stronger displacement would pinhole through it (probe: wall |f| ≤ 0.4).
const tissue = createFbm3(slug, { octaves: 4, frequency: 0.3, lacunarity: 2, gain: 0.5 });

let base;
let mammillary;   // paired spheres
let opticRidge;   // transverse rostro-ventral ridge
let tuberNotch;   // infundibulum carve
let sulcus;       // superior boundary groove (bilateral)
if (HAS_BP3D) {
  const boundNames = [
    'hypothalamus-left', 'hypothalamus-right',
    'diencephalon-midline-left', 'diencephalon-midline-right',
  ];
  const fused = loadCanonicalSdf(boundNames, RES);
  // Containment box: the midline slab is an OPEN shell whose leaky voxelize
  // columns keep the "inside" sign out to the sample-grid caps (baked holes
  // clustered at the z cap — .bp3d-probe/hypo-holes.mjs). Clamping the fused
  // field to the true mesh bbox (+0.3 au) removes every border artifact; the
  // box faces sit ≥1.4 au clear of the real surface, so the zero set is
  // untouched.
  const b = canonicalBounds(boundNames);
  const M = 0.3;
  const boundBox = translate(
    roundBox(
      (b.max[0] - b.min[0]) / 2 + M,
      (b.max[1] - b.min[1]) / 2 + M,
      (b.max[2] - b.min[2]) / 2 + M,
      0,
    ),
    (b.min[0] + b.max[0]) / 2,
    (b.min[1] + b.max[1]) / 2,
    (b.min[2] + b.max[2]) / 2,
  );
  // Keep the midline slab's VENTRAL parts only: halfspace NEGATIVE for
  // z > −4 (SDF keep-convention, same as the thalamic medial-face cut), so
  // the caudal epithalamic tail of the slab is trimmed away and the cut face
  // closes watertight.
  base = intersect(intersect(fused, boundBox), (x, y, z) => -z - 4);
  // Mammillary bodies — paired, r 1.8, at the AMENDMENT-A landmark band
  // (see header); 0.6+ au midline cleft between the two domes.
  mammillary = unionAll(
    translate(ellipsoid(1.8, 1.8, 1.8), 2.7, 28.0, 5.5),
    translate(ellipsoid(1.8, 1.8, 1.8), -2.7, 28.0, 5.5),
  );
  // Optic chiasm ridge — low transverse ridge, rostro-ventral edge.
  opticRidge = translate(ellipsoid(3.2, 1.1, 1.6), 0, 12.3, 22.6);
  // Tuber/infundibulum recess — median notch where the V3 floor funnels into
  // the stalk (probe: surface passes [0,19.2,15.2]; the earlier y≈4.6-5.2
  // anchor floated ~1.2 au below the registered inferior face).
  tuberNotch = capsule(0, 19.6, 15.6, 0, 19.0, 16.6, 0.95);
  // Hypothalamic sulcus — bilateral groove along the superior boundary,
  // anchored to the MEASURED top face along x=±2.5 (probe: y 23.4@z12 →
  // 25.8@z15 → 27.2@z18.5): axis inset 0.25 au below the local face with
  // r 1.0 so the tool crosses the surface everywhere (bite ≈ 0.75 au,
  // softened by the k 0.7 blend — no tangent slivers).
  sulcus = unionAll(
    capsule(2.5, 23.15, 12.0, 2.5, 26.95, 18.5, 1.0),
    capsule(-2.5, 23.05, 12.0, -2.5, 26.15, 18.5, 1.0),
  );
} else {
  // Sculpt-only fallback wedge (task brief schematic frame).
  base = translate(elongate(ellipsoid(5.5, 6.0, 4.5), 0, 1.2, 0.8), 0, 32, 6);
  mammillary = unionAll(
    translate(ellipsoid(1.8, 1.8, 1.8), 2.2, 28.5, 4.2),
    translate(ellipsoid(1.8, 1.8, 1.8), -2.2, 28.5, 4.2),
  );
  opticRidge = translate(ellipsoid(3.0, 1.0, 1.2), 0, 35.5, 8.2);
  tuberNotch = capsule(0, 26.2, 5.2, 0, 25.8, 6.4, 1.0);
  sulcus = unionAll(
    capsule(2.2, 36.5, 4.0, 2.4, 34.0, 7.0, 0.7),
    capsule(-2.2, 36.5, 4.0, -2.4, 34.0, 7.0, 0.7),
  );
}

const sculpted = smoothSubtract(
  smoothSubtract(
    // k=1.3 (was 0.9): bridges the left mammillary sphere over its ~0.9 au
    // gap to the midline wall (probe: wall leans to x ≤ 0.7 at y 26-28).
    smoothUnionAll([base, mammillary, opticRidge], 1.3),
    // Hypothalamic sulcus is a CARVE (groove), not a ridge: smoothSubtract
    // (unioning the tool raised a tangent fin and left 63 non-manifold seams).
    sulcus, 0.7,
  ),
  tuberNotch,
  0.7,
);

const field = displace(sculpted, tissue, 0.09);

/* ------------------------------------------------------------------ */

const ROI = (() => {
  if (HAS_BP3D) {
    const b = canonicalBounds([
      'hypothalamus-left', 'hypothalamus-right',
      'diencephalon-midline-left', 'diencephalon-midline-right',
    ]);
    // z min: the slab is hard-clipped at z ≥ −4 (+0.8 pad); y max: the slab
    // wall reaches y 38 (diencephalon roof) (+0.8 pad).
    return {
      min: [b.min[0] - 0.8, b.min[1] - 0.8, -4.8],
      max: [b.max[0] + 0.8, Math.min(b.max[1], 38) + 0.8, Math.max(b.max[2], 24.2) + 0.8],
    };
  }
  return { min: [-7.5, 24.5, 0.5], max: [7.5, 39.5, 10.5] };
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
