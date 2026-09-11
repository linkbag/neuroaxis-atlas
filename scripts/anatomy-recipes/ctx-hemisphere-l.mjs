/**
 * ctx-hemisphere-l — LEFT cerebral hemisphere (cortical ribbon), derived.
 *
 * Plan §4 item 2 ("envelopes for each lobe (or one hemisphere shell + fissure
 * subtracts)"), §1 "known gap", §8 risk row "derived cortical ribbon looks
 * artificial". BP3D carries no cortical gray-matter surface, so the ribbon is
 * DERIVED from the registered left cerebral white-matter core (FJ1758,
 * canonical bbox [2.8, −3.7, −69.6] … [52.4, 110.6, 67.5], REGISTRATION.md
 * §A.4): the solid between the WM surface and the WM surface pushed outward by
 * the cortical thickness t = 2.9 au (3.5 mm), i.e. the standard ribbon
 * construction `min(wm − t, wm − 2t)`.
 *
 * Carves (all measured, not guessed — see lib/tel-common.mjs for the band
 * discipline that makes them valid):
 *   - mid-sagittal / interhemispheric fissure: slit |x| < 1.0 au, stitched
 *     through the corpus callosum so the commissure survives (the fissure is
 *     carved only where the CC field says "not commissure");
 *   - Sylvian cleft: carved only in the CSF gap that opens onto the insular
 *     surface (insula mesh FJ1748, canonical bbox [21.2, 20.3, −9.0] …
 *     [37.2, 60.6, 34.0]) — this is what separates the temporal lobe from the
 *     frontoparietal operculum in the shell;
 *   - lateral ventricle space (FJ1767) so the ventricular cast is not buried
 *     inside an opaque shell.
 *
 * Quality: meshed at 1.4 au with SurfaceNets (67,336 cells across the ROI), so
 * the gyral relief the WM surface carries survives into the pial surface; the
 * output is watertight (0 boundary/odd edges) and needs NO post-hoc
 * decimation (measured 84.7k tris — the plan §4 cap for a hemisphere shell is
 * 90k; the payload cap is stated in src/assets/anatomy/anatomy-manifest.json).
 *
 * The right side (ctx-hemisphere-r.mjs) keeps its OWN slug so laterality and
 * pairing work exactly like the existing ctx-thalamus-l/r pair.
 */

import { hemisphereRecipe, slugForSide } from './lib/tel-common.mjs';

export const slug = 'ctx-hemisphere-l';

const recipe = hemisphereRecipe('left');

export function bbox() {
  return recipe.bbox();
}

const field = recipe.sdf;

export function sdf(x, y, z) {
  return field(x, y, z);
}

export const meshOpts = recipe.meshOpts;

/** Extra named export: the mirrored slug, for the CLI/report consumers. */
export const pairSlug = slugForSide('right');
