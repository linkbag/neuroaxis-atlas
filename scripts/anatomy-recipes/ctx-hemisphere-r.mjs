/**
 * ctx-hemisphere-r — RIGHT cerebral hemisphere (cortical ribbon), derived.
 *
 * Mirror contract of ctx-hemisphere-l.mjs: same construction (derived ribbon,
 * min(wm − t, wm − 2t) with t = 2.9 au = 3.5 mm) built from the REGISTERED
 * right cerebral white-matter core (FJ1806, canonical bbox
 * [−52.8, −3.7, −69.3] … [−3.0, 110.6, 67.6], REGISTRATION.md §A.4) — it is a
 * separate bake, not a mirrored copy of the left mesh, because the registered
 * right core is not an exact mirror of the left (|x| max 52.8 vs 52.4, z max
 * 67.6 vs 67.5). The same fissure / Sylvian / ventricle carves apply, using
 * the right insula (FJ1749) and right lateral ventricle (FJ1814).
 *
 * Measured 83.0k tris at 1.4 au (cap 90k), watertight, no post-hoc decimation.
 */

import { hemisphereRecipe, slugForSide } from './lib/tel-common.mjs';

export const slug = 'ctx-hemisphere-r';

const recipe = hemisphereRecipe('right');

export function bbox() {
  return recipe.bbox();
}

const field = recipe.sdf;

export function sdf(x, y, z) {
  return field(x, y, z);
}

export const meshOpts = recipe.meshOpts;

/** Extra named export: the paired slug, for the CLI/report consumers. */
export const pairSlug = slugForSide('left');
