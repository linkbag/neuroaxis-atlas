/**
 * tel-parts — REGISTRY MODULE: every telencephalon part that is NOT the
 * cortical ribbon (plan §4 item 2: "the WM cores, corpus callosum, lateral
 * ventricles, basal ganglia nuclei, hippocampus/amygdala/fornix").
 *
 * One module, one entry per manifest slug, exactly like nuclei.mjs — the CLI
 * (scripts/build-anatomy-geometry.mjs) validates every entry against the
 * recipe contract and flattens the list. Each entry is a straight voxelize →
 * SurfaceNets bake of the REGISTERED canonical mesh, at a voxel size chosen so
 * the result lands inside the plan §4 tri caps with no post-hoc decimation.
 *
 * Measured at those steps (tri count / committed GLB bytes — bytes bind, see
 * the CLI's --stats telencephalon summary):
 *
 *   slug                        canonical source (FMA)      step   tris    bytes
 *   tel-white-matter-l/r        FJ1758 / FJ1806 (174 cm³)    3.0   13,524   313 KiB
 *   ctx-corpus-callosum         FJ1742 (FMA 86464)           1.2   16,512   388 KiB
 *   tel-lateral-ventricle-l/r   FJ1767 / FJ1814 (FMA 78448)  1.4    ~7.8k   187 KiB
 *   ctx-caudate-l/r             FJ1754 / FJ1802 (FMA 61833)  1.6    3,152    75 KiB
 *   ctx-putamen-l/r             FJ1776 / FJ1823 (FMA 61834)  1.6    2,340    56 KiB
 *   ctx-globus-pallidus-l/r     FJ1757 / FJ1805 (FMA 61835)  1.4    1,884    46 KiB
 *   ctx-hippocampus-l/r         FJ1759 / FJ1807 (FMA 62493)  1.2    2,024    48 KiB
 *   ctx-amygdala-l/r            FJ1753 / FJ1829 (FMA 61841)  1.2    1,184    29 KiB
 *   ctx-fornix-l/r              FJ1756 / FJ1804 (FMA 61965)  1.2    2,160    51 KiB
 *   ctx-fornix-commissure       FJ1741 (FMA 61970)           1.4    1,416    34 KiB
 *   ctx-choroid-plexus-l/r      FJ1755 / FJ1803 (FMA 61934)  1.4    ~1.5k    36 KiB
 *
 * The two hemispheres keep separate slugs per structure, so laterality and
 * pairing behave exactly like the existing ctx-thalamus-l/r pair
 * (sectionAssets.ts GROUP_OVERRIDES keys off the slug).
 *
 * Tri-cap compliance is asserted by scripts/anatomy-recipes/lib/tel-budget.mjs
 * against the plan §4 caps (hemisphere 90k · corpus callosum 25k · ventricle
 * 20k · basal ganglia 8k · hippocampus/amygdala 6k) in the CLI --stats summary.
 */

import { telRoi, telSdf } from './lib/tel-common.mjs';
import { TEL_TRI_CAPS } from './lib/tel-budget.mjs';

/** Steps chosen from the measured tri/byte-vs-resolution curves (see header). */
const STEP = {
  'tel-cerebral-white-matter-left': 3.0,
  'tel-cerebral-white-matter-right': 3.0,
  'tel-corpus-callosum': 1.2,
  'tel-lateral-ventricle-left': 1.4,
  'tel-lateral-ventricle-right': 1.4,
  'tel-caudate-left': 1.6,
  'tel-caudate-right': 1.6,
  'tel-putamen-left': 1.6,
  'tel-putamen-right': 1.6,
  'tel-globus-pallidus-left': 1.4,
  'tel-globus-pallidus-right': 1.4,
  'tel-hippocampus-left': 1.2,
  'tel-hippocampus-right': 1.2,
  'tel-amygdala-left': 1.2,
  'tel-amygdala-right': 1.2,
  'tel-fornix-left': 1.2,
  'tel-fornix-right': 1.2,
  'tel-fornix-commissure': 1.4,
  'tel-choroid-plexus-left': 1.4,
  'tel-choroid-plexus-right': 1.4,
};

/**
 * One registry row: canonical OBJ name, manifest slug, kind, material hint.
 * `canonical` is the key into tel-common's grid cache (lower-cased side).
 */
const PARTS = [
  // --- telencephalic white matter (plan §3 subdivision 4) ---
  { canonical: 'tel-cerebral-white-matter-left', slug: 'tel-white-matter-l', kind: 'context', materialHint: 'white-matter', laterality: 'left' },
  { canonical: 'tel-cerebral-white-matter-right', slug: 'tel-white-matter-r', kind: 'context', materialHint: 'white-matter', laterality: 'right' },
  { canonical: 'tel-corpus-callosum', slug: 'ctx-corpus-callosum', kind: 'context', materialHint: 'white-matter', laterality: 'midline' },

  // --- lateral ventricles (plan §3 subdivision 5) ---
  { canonical: 'tel-lateral-ventricle-left', slug: 'tel-lateral-ventricle-l', kind: 'ventricle', materialHint: 'csf', laterality: 'left' },
  { canonical: 'tel-lateral-ventricle-right', slug: 'tel-lateral-ventricle-r', kind: 'ventricle', materialHint: 'csf', laterality: 'right' },

  // --- basal ganglia (plan §3 subdivision 2) ---
  { canonical: 'tel-caudate-left', slug: 'ctx-caudate-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-caudate-right', slug: 'ctx-caudate-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },
  { canonical: 'tel-putamen-left', slug: 'ctx-putamen-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-putamen-right', slug: 'ctx-putamen-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },
  { canonical: 'tel-globus-pallidus-left', slug: 'ctx-globus-pallidus-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-globus-pallidus-right', slug: 'ctx-globus-pallidus-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },

  // --- limbic system (plan §3 subdivision 3) ---
  { canonical: 'tel-hippocampus-left', slug: 'ctx-hippocampus-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-hippocampus-right', slug: 'ctx-hippocampus-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },
  { canonical: 'tel-amygdala-left', slug: 'ctx-amygdala-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-amygdala-right', slug: 'ctx-amygdala-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },
  { canonical: 'tel-fornix-left', slug: 'ctx-fornix-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-fornix-right', slug: 'ctx-fornix-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },
  { canonical: 'tel-fornix-commissure', slug: 'ctx-fornix-commissure', kind: 'nucleus', materialHint: 'nucleus', laterality: 'midline' },
  { canonical: 'tel-choroid-plexus-left', slug: 'ctx-choroid-plexus-l', kind: 'nucleus', materialHint: 'nucleus', laterality: 'left' },
  { canonical: 'tel-choroid-plexus-right', slug: 'ctx-choroid-plexus-r', kind: 'nucleus', materialHint: 'nucleus', laterality: 'right' },
];

/** Plan §4 tri caps live in ONE place: lib/tel-budget.mjs (which also prints
 *  the CLI's telencephalon summary). Re-exported here for recipe consumers. */
export { TEL_TRI_CAPS as TRI_CAPS } from './lib/tel-budget.mjs';

export const recipes = PARTS.map((part) => {
  const resolution = STEP[part.canonical];
  // ROI: measured canonical bounds + 1.4 au (≥ 1.15 × step) so the SurfaceNets
  // surface never reaches the grid box. Computed from the OBJ at load time.
  const box = telRoi(part.canonical, Math.max(1.4, 1.15 * resolution));
  return {
    slug: part.slug,
    laterality: part.laterality,
    gap: 1,
    bbox: () => ({ min: box.min, max: box.max }),
    sdf: telSdf(part.canonical, { resolution }),
    meshOpts: {
      resolution,
      kind: part.kind,
      materialHint: part.materialHint,
      source: 'bp3d+sculpt',
    },
    /** Non-contract metadata consumed by the tel-budget CLI summary. */
    telMeta: {
      canonical: part.canonical,
      laterality: part.laterality,
      triCap: TEL_TRI_CAPS[part.slug],
      subdivision: subdivisionOf(part.slug),
    },
  };
});

/** Coarse subdivision label used by the telencephalon stats summary. */
function subdivisionOf(slug) {
  if (slug.startsWith('ctx-hemisphere')) return 'Cerebral cortex';
  if (slug.startsWith('tel-white-matter') || slug === 'ctx-corpus-callosum') {
    return 'Telencephalic white matter';
  }
  if (slug.startsWith('tel-lateral-ventricle') || slug.startsWith('ctx-choroid-plexus')) {
    return 'Lateral ventricles';
  }
  if (slug.startsWith('ctx-caudate') || slug.startsWith('ctx-putamen')
    || slug.startsWith('ctx-globus-pallidus')) return 'Basal ganglia';
  return 'Limbic system';
}
