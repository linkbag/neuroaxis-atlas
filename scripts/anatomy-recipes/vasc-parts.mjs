/**
 * vasc-parts — REGISTRY MODULE: the v8 cerebral-vasculature and optic-pathway
 * geometry (NEUROATLAS_V8_PLAN §1a/§1b, §4 items 1–3).
 *
 * One module, one entry per manifest slug, exactly like `nuclei.mjs` and
 * `tel-parts.mjs`: the CLI (scripts/build-anatomy-geometry.mjs) validates every
 * entry against the recipe contract and flattens the list. Each entry is a straight
 * voxelize → SurfaceNets bake of the REGISTERED canonical mesh — no post-hoc
 * decimation, so the committed GLB is exactly what the recipe reproduces and the
 * CLI's `--stats` / staleness checks stay meaningful.
 *
 * ── Where the geometry comes from ────────────────────────────────────────────
 * `scripts/lib/register.mjs` (task vasc-register-bake, step 1) registers the
 * BodyParts3D 4.0 elements listed in `docs/VASC_INVENTORY.md` §3/§5.1 into
 * `assets-src/bp3d/canonical/`. The file → record mapping is that document's
 * `atlas record` column, so every slug below is `<atlas record id>-<left|right>`
 * for a paired element and `<atlas record id>` for an unpaired midline one — the
 * same suffix rule the telencephalon family already follows (one GLB per paired
 * structure and side).
 *
 * ── How the voxel step was chosen (measured, not guessed) ────────────────────
 * A cerebral artery is a TUBE 2–5 au across, so a surface-nets bake of one has a
 * hard resolution FLOOR: as soon as the voxel step approaches the vessel's
 * caliber the tube stops being resolved and the mesh either disappears
 * (0 triangles — seen for the anterior communicating, posterior communicating,
 * anterior choroidal, PICA, SCA, AICA and PCA-P1 elements at coarse steps) or
 * opens boundary edges. Above that floor the triangle count falls roughly as
 * 1/h². The steps below are therefore the fineness the vessel actually needs,
 * measured per part by sweeping h and keeping the coarsest step that still
 * produces a watertight surface:
 *
 *   part                                    step  tris/side  source faces  caliber floor
 *   vasc-internal-carotid-artery-{l,r}       1.0   1,760       1,272         0.8 (cervical crop)
 *   vasc-vertebral-artery-{l,r}              0.8   1,524         800         0.8 (cervical crop)
 *   vasc-basilar-artery                      0.9     592         262         0.9
 *   vasc-anterior-communicating-artery       0.7      76          80         0.9 (thin cross-link)
 *   vasc-posterior-communicating-artery-{l,r} 0.8    192         204         0.9
 *   vasc-anterior-cerebral-artery-{l,r}      1.0     432         400         1.4
 *   vasc-middle-cerebral-artery-m1-{l,r}     1.0     676         800         1.4
 *   vasc-middle-cerebral-artery-m2-{l,r}     0.8     444       1,154         1.2
 *   vasc-posterior-cerebral-artery-p1-{l,r}  0.8     248         282         1.4
 *   vasc-posterior-cerebral-artery-p2-{l,r}  0.8     788         544         1.4
 *   vasc-superior-cerebellar-artery-{l,r}    0.8     680         406         1.6
 *   vasc-anterior-inferior-cerebellar-{l,r}  0.8     488         766         1.6
 *   vasc-posterior-inferior-cerebellar-{l,r} 0.7     544       4,040         0.9 (13 fused elements)
 *   vasc-anterior-choroidal-artery-{l,r}     0.7     476         418         1.0
 *   tract-optic-nerve-{l,r}                  0.9   2,204       2,376         none ≥ 1.8
 *   ctx-optic-chiasm-{l,r}                   0.6     888         898         none ≥ 1.8
 *   tract-optic-tract-{l,r}                  0.9   2,080       2,336         none ≥ 1.8
 *
 * Measured totals (the header of `lib/vasc-budget.mjs --stats` prints the same
 * numbers from the committed manifest): **vasculature 17,364 tris**, optic
 * pathway 16,264, i.e. 33,628 tris for the whole v8 layer — inside the plan §4.3
 * per-part caps (artery ≤ 2,000, optic ≤ 3,000) and inside the run-level ≤ 40,000
 * cap for the vascular layer. Every part bakes watertight (0 boundary edges,
 * 0 degenerate faces); measured with `.dsh-scratch/vasc-register/final-check.mjs`.
 * The two optic nerves and tracts sit at step 0.9 rather than at their measured
 * floor because they are the two biggest payload contributors of the family and
 * the run's committed-GLB cap (≤ 14 MiB, shared with every other layer) is the
 * binding one: 0.9 keeps both watertight at 2,204 / 2,080 tris and 53 / 51 KiB
 * instead of 2,852 / 2,712 tris and 68 / 64 KiB.
 *
 * ── Cervical crop ────────────────────────────────────────────────────────────
 * The two feeding TRUNKS are the only parts that need one. BodyParts3D ships the
 * internal carotid and vertebral elements with their full cervical course
 * (canonical y −71.5 and −97.3 respectively — up to 47 au BELOW the atlas floor
 * `lvl-spinal-medulla` at y = −50). This is a brain atlas: an unbranched artery
 * hanging that far below the cervicomedullary junction reads as an artefact, and
 * it would put vessel geometry outside every section plane the atlas has. Both are
 * therefore meshed with the documented horizontal crop at y = −45 au (5 au above
 * the atlas floor; `CERVICAL_CUT_Y` in lib/vasc-common.mjs), which removes the
 * neck course and keeps the whole Willis-relevant part — the carotid siphon and
 * the intracranial vertebral segment are both far above the cut. The crop is a
 * MESHER-side operation only: the registered canonical mesh keeps the complete
 * source geometry (REGISTRATION.md §B.4), so nothing is lost from the pipeline.
 *
 * ── materialHint ─────────────────────────────────────────────────────────────
 * Every artery carries `materialHint: 'vasculature'` (plan §2 item 3: translucent
 * red tubes). `src/geometry/materials.ts` has no such preset yet — its
 * `makeAnatomyMaterial` falls back to the nucleus preset for unknown hints, so the
 * manifest extension cannot blank a mesh — and task `vasc-render` adds the preset.
 * The manifest records the hint either way, which is what that task consumes.
 */

import { CERVICAL_CUT_Y, vascRoi, vascSdf } from './lib/vasc-common.mjs';
import { ARTERY_TRI_CAP, OPTIC_TRI_CAP } from './lib/vasc-budget.mjs';

/** Vessel material hint (plan §2 item 3) — wired to a preset by task `vasc-render`. */
export const VESSEL_MATERIAL_HINT = 'vasculature';

/** Anatomy kind of a vessel/optic part. `vessel` is a legal DATA_CONTRACT kind. */
export const VESSEL_KIND = 'vessel';
/** The optic chiasm is a midline commissure, not a tube: `context` like the rest of the tract-family blocks. */
export const OPTIC_CHIASM_KIND = 'context';

/**
 * The measured voxel step per canonical base name (see the header table), and the
 * cervical crop where the source element carries one.
 */
const STEP = {
  'vasc-internal-carotid-artery': { step: 1.0, crop: CERVICAL_CUT_Y },
  'vasc-vertebral-artery': { step: 0.8, crop: CERVICAL_CUT_Y },
  'vasc-basilar-artery': { step: 0.9 },
  'vasc-anterior-communicating-artery': { step: 0.7 },
  'vasc-posterior-communicating-artery': { step: 0.8 },
  'vasc-anterior-cerebral-artery': { step: 1.0 },
  'vasc-middle-cerebral-artery-m1': { step: 1.0 },
  'vasc-middle-cerebral-artery-m2': { step: 0.8 },
  'vasc-posterior-cerebral-artery-p1': { step: 0.8 },
  'vasc-posterior-cerebral-artery-p2': { step: 0.8 },
  'vasc-superior-cerebellar-artery': { step: 0.8 },
  'vasc-anterior-inferior-cerebellar-artery': { step: 0.8 },
  'vasc-posterior-inferior-cerebellar-artery': { step: 0.7 },
  'vasc-anterior-choroidal-artery': { step: 0.7 },
  'tract-optic-nerve': { step: 0.9 },
  'ctx-optic-chiasm': { step: 0.6 },
  'tract-optic-tract': { step: 0.9 },
};

/**
 * One registry row: the canonical registered mesh basename (`assets-src/bp3d/canonical/
 * <canonical>-<left|right>.obj`; the side suffix is omitted for a midline part),
 * the manifest slug, the atlas record id it belongs to, and the part class.
 * `midline: true` marks the parts the archive ships as ONE element.
 */
const PARTS = [
  // --- anterior circulation trunks -------------------------------------------
  { canonical: 'vasc-internal-carotid-artery', slug: 'vasc-internal-carotid-artery', record: 'vasc-internal-carotid-artery', subdivision: 'Anterior circulation', segment: 'intracranial course (cervical cropped at y = −45 au)' },
  // --- posterior circulation trunks ------------------------------------------
  { canonical: 'vasc-vertebral-artery', slug: 'vasc-vertebral-artery', record: 'vasc-vertebral-artery', subdivision: 'Posterior circulation', segment: 'intracranial segment (cervical cropped at y = −45 au)' },
  { canonical: 'vasc-basilar-artery', slug: 'vasc-basilar-artery', record: 'vasc-basilar-artery', subdivision: 'Posterior circulation', midline: true, segment: 'whole trunk (pontomedullary junction → interpeduncular fossa)' },
  // --- circle of Willis ------------------------------------------------------
  { canonical: 'vasc-anterior-communicating-artery', slug: 'vasc-anterior-communicating-artery', record: 'vasc-anterior-communicating-artery', subdivision: 'Circle of Willis', midline: true, segment: 'the whole cross-link' },
  { canonical: 'vasc-posterior-communicating-artery', slug: 'vasc-posterior-communicating-artery', record: 'vasc-posterior-communicating-artery', subdivision: 'Circle of Willis', segment: 'the whole cross-link (ICA → PCA)' },
  // --- anterior circulation --------------------------------------------------
  { canonical: 'vasc-anterior-cerebral-artery', slug: 'vasc-anterior-cerebral-artery', record: 'vasc-anterior-cerebral-artery', subdivision: 'Anterior circulation', segment: 'precommunicating + postcommunicating cast' },
  { canonical: 'vasc-middle-cerebral-artery-m1', slug: 'vasc-middle-cerebral-artery-m1', record: 'vasc-middle-cerebral-artery', subdivision: 'Anterior circulation', segment: 'M1 — sphenoid part' },
  { canonical: 'vasc-middle-cerebral-artery-m2', slug: 'vasc-middle-cerebral-artery-m2', record: 'vasc-middle-cerebral-artery', subdivision: 'Anterior circulation', segment: 'M2 — insular part' },
  // --- posterior circulation -------------------------------------------------
  { canonical: 'vasc-posterior-cerebral-artery-p1', slug: 'vasc-posterior-cerebral-artery-p1', record: 'vasc-posterior-cerebral-artery', subdivision: 'Posterior circulation', segment: 'P1 — precommunicating part' },
  { canonical: 'vasc-posterior-cerebral-artery-p2', slug: 'vasc-posterior-cerebral-artery-p2', record: 'vasc-posterior-cerebral-artery', subdivision: 'Posterior circulation', segment: 'P2–P3 — postcommunicating part' },
  { canonical: 'vasc-superior-cerebellar-artery', slug: 'vasc-superior-cerebellar-artery', record: 'vasc-superior-cerebellar-artery', subdivision: 'Posterior circulation', segment: 'main trunk (the lateral/medial branches stay source-only)' },
  { canonical: 'vasc-anterior-inferior-cerebellar-artery', slug: 'vasc-anterior-inferior-cerebellar-artery', record: 'vasc-anterior-inferior-cerebellar-artery', subdivision: 'Posterior circulation', segment: 'whole element' },
  { canonical: 'vasc-posterior-inferior-cerebellar-artery', slug: 'vasc-posterior-inferior-cerebellar-artery', record: 'vasc-posterior-inferior-cerebellar-artery', subdivision: 'Posterior circulation', segment: '13 fused segment elements per side (one registered cast)' },
  // --- deep perforators ------------------------------------------------------
  { canonical: 'vasc-anterior-choroidal-artery', slug: 'vasc-anterior-choroidal-artery', record: 'vasc-anterior-choroidal-artery', subdivision: 'Deep perforators', segment: 'whole element' },
  // --- optic pathway (plan §1b) ----------------------------------------------
  { canonical: 'tract-optic-nerve', slug: 'tract-optic-nerve', record: 'tract-optic-nerve', subdivision: 'Optic pathway', lateralityKind: 'tract', optic: true, segment: 'the larger of the two decimations the archive ships per side (includes more of the orbital course)' },
  { canonical: 'ctx-optic-chiasm', slug: 'ctx-optic-chiasm', record: 'ctx-optic-chiasm', subdivision: 'Optic pathway', lateralityKind: 'context', optic: true, chiasm: true, segment: 'the archive ships the chiasm as two half-elements that meet at the midline' },
  { canonical: 'tract-optic-tract', slug: 'tract-optic-tract', record: 'tract-optic-tract', subdivision: 'Optic pathway', lateralityKind: 'tract', optic: true, segment: 'chiasm → LGN (the whole tract element)' },
];

/**
 * Memoized `vascSdf` per canonical base name (one grid per process — the same
 * process-wide cache discipline `tel-common.mjs` uses for the telencephalon).
 */
const sdfCache = new Map();
function sdfOf(canonical, spec) {
  let f = sdfCache.get(canonical);
  if (f === undefined) {
    f = vascSdf(canonical, { resolution: spec.step, cropBelowY: spec.crop });
    sdfCache.set(canonical, f);
  }
  return f;
}

/**
 * Side-suffixed manifest slug / canonical mesh name for one entry.
 * Midline parts keep the bare name (the archive ships one element for them); every
 * other part is registered and baked per side.
 */
function namesFor(part) {
  if (part.midline) return [{ slug: part.slug, canonical: part.canonical, side: 'midline' }];
  return [
    { slug: `${part.slug}-l`, canonical: `${part.canonical}-left`, side: 'left' },
    { slug: `${part.slug}-r`, canonical: `${part.canonical}-right`, side: 'right' },
  ];
}

/** Plan §4.3 tri cap for a part (artery 2,000 / optic pathway 3,000). */
function capFor(part) {
  return part.optic ? OPTIC_TRI_CAP : ARTERY_TRI_CAP;
}

export const recipes = PARTS.flatMap((part) => namesFor(part).map(({ slug, canonical, side }) => {
  const spec = STEP[part.canonical];
  if (spec === undefined) {
    throw new Error(`vasc-parts: no measured voxel step for "${part.canonical}" — add it to STEP (see the header table)`);
  }
  // ROI: the registered mesh's measured bounds + 1.5·step per side (never less than
  // 1.5 au) so the SurfaceNets surface can never reach the grid boundary; a cropped
  // part's ROI floor is the crop plane, so no cell is spent on the removed neck.
  const pad = Math.max(1.5, 1.5 * spec.step);
  const box = vascRoi(canonical, pad);
  if (spec.crop !== undefined) box.min[1] = Math.max(box.min[1], spec.crop);
  return {
    slug,
    laterality: side === 'midline' ? 'midline' : side,
    gap: 1,
    bbox: () => ({ min: box.min, max: box.max }),
    // LAZY on purpose: the CLI validates `sdf` by CALLING it (spot check at the box
    // centre and two corners), and it also imports every recipe module for `--list`
    // / `--manifest`. Building the voxel grid at import time would therefore run a
    // full voxelization per part for a command that only wants the slug list; the
    // grid is built on first call instead (and cached per process by vasc-common).
    sdf: (x, y, z) => sdfOf(canonical, spec)(x, y, z),
    meshOpts: {
      resolution: spec.step,
      kind: part.optic && part.chiasm ? OPTIC_CHIASM_KIND : VESSEL_KIND,
      materialHint: VESSEL_MATERIAL_HINT,
      source: 'bp3d+sculpt',
    },
    /** Non-contract metadata consumed by the CLI's vasculature summary. */
    vascMeta: {
      canonical,
      side,
      record: part.record,
      subdivision: part.subdivision,
      segment: part.segment,
      triCap: capFor(part),
      cervicalCropY: spec.crop ?? null,
    },
  };
}));
