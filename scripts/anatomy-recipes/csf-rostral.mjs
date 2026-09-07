/**
 * vent-third-ventricle — rostral CSF space (envelopes-rostral).
 *
 * Plan §5 checklist "CSF": third-ventricle slit — cyan translucent hint at
 * runtime (materialHint csf; the runtime owns materials). Pure sculpt (no
 * BP3D third-ventricle mesh exists — PROBE.md; the registered diencephalon
 * midline slab FJ1730 is a solid midline mass, not a cavity).
 *
 * Shape (task brief): midline slit x ∈ [−1, 1], y ∈ [24, 37], z ∈ [−2, 6]
 * (a rounded slot; half-width 0.96 so the fbm wobble keeps ≥ 0.14 au
 * clearance from the thalami's flat medial faces at |x| = 1.2), with:
 *   - optic recess: short tube rostro-ventral (lamina-terminalis corner);
 *   - infundibular recess: tube dipping ventrally toward the stalk region;
 *   - pineal recess: tube sweeping caudally toward the pineal stalk;
 *   - caudal taper toward the cerebral aqueduct inlet (the aqueduct itself is
 *     vent-cerebral-aqueduct, owned by the hindbrain task — NOT baked here;
 *     this mesh only tapers toward its registered inlet at y≈21.3, z≈−2.2).
 *
 * Watertight by construction: one closed SDF region → SurfaceNets emits a
 * closed manifold (verified by the kernel's closure check at bake time).
 */

import { capsule, displace, roundBox, smoothUnionAll, translate } from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';

export const slug = 'vent-third-ventricle';

const RES = 0.24;

const tissue = createFbm3(slug, { octaves: 3, frequency: 0.5, lacunarity: 2, gain: 0.5 });

// Main slit — rounded slot: total half-width 0.62 + 0.34 = 0.96 (< 1.0),
// y 24.2..37.0, z −2.1..5.9, centered on the midline.
const slit = translate(roundBox(0.62, 6.05, 3.65, 0.34), 0, 30.6, 1.9);

// Caudal taper toward the aqueduct inlet (registered aqueduct top y≈21.3, z≈−2.2).
const aqueductTaper = capsule(0, 24.4, -0.4, 0, 21.9, -1.9, 0.72);

// Recesses (cyan hint diverticula; each STARTS deep inside the lumen so the
// union is a clean through-junction — no tangency slivers — and stays clear
// of the thalami).
const opticRecess = capsule(0, 26.0, 2.6, 0, 25.4, 8.0, 0.8);        // rostro-ventral
const infundibularRecess = capsule(0, 25.0, 1.5, 0, 22.4, 3.2, 0.78); // ventral dip
const pinealRecess = capsule(0, 31.2, -0.8, 0, 24.2, -5.4, 0.78);     // caudal sweep

// v2b note: the hypothalamus envelope carries the diencephalon midline wall,
// whose sheet crosses part of the slit footprint — anatomically the
// interthalamic adhesion bridging the third ventricle (the v1
// ctx-thalamus-envelope record documents the adhesion in ~70% of brains).
// The slit is therefore kept SOLID here; the wall reads as a gray fin through
// the cyan lumen rather than the lumen being carved away around it.
const cavity = smoothUnionAll([slit, aqueductTaper, opticRecess, infundibularRecess, pinealRecess], 0.5);

// Gentle wall wobble (amp 0.1 keeps |x| ≤ 1.06 < 1.2 thalami faces).
const field = displace(cavity, tissue, 0.1);

export function bbox() {
  return { min: [-1.6, 20.9, -6.6], max: [1.6, 37.6, 9.2] };
}

export function sdf(x, y, z) {
  return field(x, y, z);
}

export const meshOpts = {
  resolution: RES,
  kind: 'ventricle',
  materialHint: 'csf',
  source: 'sculpt',
};
