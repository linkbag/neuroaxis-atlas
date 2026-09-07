/**
 * Hindbrain recipes — shared canonical-base helpers.
 *
 * Owned by envelopes-hindbrain-v2b (REALISM_PLAN §7 task 5). Consumed by the
 * hindbrain recipe modules in this directory; NOT scanned by the CLI (it only
 * reads top-level *.mjs files).
 *
 * Provides:
 *   loadCanonicalBase(name, opts) -> { sdf, tight, diagnostics, source }
 *   roi(tight, pad)               -> recipe bbox() value
 *   signedRidged(seed, opts)      -> ~[-1,1] anisotropic ridged fbm (folia)
 *
 * Every base is the AMENDMENT-A re-baked canonical OBJ (s = 1/1.2 au/mm)
 * voxelized to a signed-distance grid at bake time — extents are read from
 * the files, never hardcoded (docs/REALISM_PLAN.md §3 amendment).
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseOBJ } from '../../lib/sdf/objio.js';
import { trianglesBounds, voxelizeTriangles } from '../../lib/sdf/voxelize.js';
import { createRidgedFbm3 } from '../../lib/sdf/noise.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CANONICAL_DIR = resolve(HERE, '..', '..', '..', 'assets-src', 'bp3d', 'canonical');

const warned = new Set();

/**
 * Load one canonical OBJ and voxelize it into a signed grid.
 *
 * @param {string} name  canonical file stem, e.g. 'medulla'
 * @param {object} [opts]
 * @param {number} [opts.resolution=0.35]  grid step in au (keep == mesh res)
 * @param {number} [opts.bandCells=4]      signed band half-width in cells
 * @param {number} [opts.pad=2]            extra grid padding in au beyond the
 *                                         tight bounds (covers mesher padding)
 * @returns {{
 *   sdf: (x,y,z)=>number,                 // trilinear sampled signed distance
 *   tight: {min:number[], max:number[]},  // tight OBJ bounds in au
 *   diagnostics: object,                  // voxelize diagnostics
 *   source: 'bp3d+sculpt'
 * }}
 */
export function loadCanonicalBase(name, opts = {}) {
  const resolution = opts.resolution ?? 0.35;
  const bandCells = opts.bandCells ?? 4;
  const pad = opts.pad ?? 2;

  const text = readFileSync(join(CANONICAL_DIR, `${name}.obj`), 'utf8');
  const { positions, triangles } = parseOBJ(text);
  const tight = trianglesBounds(positions, triangles);

  const band = bandCells * resolution;
  const gridBbox = {
    min: tight.min.map((v) => v - pad - band),
    max: tight.max.map((v) => v + pad + band),
  };
  const grid = voxelizeTriangles(positions, triangles, {
    bbox: gridBbox,
    resolution,
    bandCells,
  });

  const d = grid.diagnostics;
  // docs/GEOMETRY_PIPELINE.md: investigate leakColumns > 0 or
  // signDisagreementRatio > 0.15 (open / inconsistently wound source).
  // Investigated for all hindbrain bases: the BP3D L/R pair fusions and the
  // register's vermis/hemisphere split leave open seams — repaired in field
  // space by the recipes (weld boxes / medial-wall seals / rim plugs).
  // Warnings are opt-in so CLI evidence runs keep clean exit codes.
  if (process.env.HINDBRAIN_BASE_DIAG === '1'
    && (d.leakColumns > 0 || d.signDisagreementRatio > 0.15)
    && !warned.has(name)) {
    warned.add(name);
    console.warn(
      `[hindbrain-common] canonical/${name}.obj voxelize diagnostics: `
      + `leakColumns=${d.leakColumns} signDisagreementRatio=${d.signDisagreementRatio.toFixed(3)}`,
    );
  }

  return { sdf: grid.sdf, tight, diagnostics: d, source: 'bp3d+sculpt' };
}

/**
 * Region of interest for a recipe: tight canonical bounds padded by `pad`
 * au. The mesher adds ~2 cells on top of this, which stays well inside the
 * voxelize grid produced by loadCanonicalBase (pad + band >= 2.6 au).
 * Sculpt features must keep their zero set inside roi(tight, pad).
 */
export function roi(tight, pad = 1.0) {
  return {
    min: tight.min.map((v) => v - pad),
    max: tight.max.map((v) => v + pad),
  };
}

/**
 * Anisotropic signed ridged fbm for cerebellar folia: broad ridge bulges
 * separated by sharp clefts, crests elongated along `axis` ('x' for the
 * mediolateral hemisphere folia, 'y' for the ventrodorsal vermis pattern),
 * signed to ~[-1, 1] so displacement neither systematically grows nor
 * shrinks the base. Deterministic (slug-seeded).
 *
 * Frequencies are kept LOW on purpose: field features need >= ~5 mesh steps
 * or the mesher aliases them into crinkle/speckle (slice QA: eff freq 0.6+
 * at 0.4-0.45 au meshes inflated tri counts 4-5x). Defaults give ~4.5 au
 * across-folia features (~2.2 au crest spacing) and ~4.5x elongation along
 * the folial axis — visible striation at atlas scale, cleanly resolved.
 */
export function signedRidged(slug, axis, opts = {}) {
  const ridged = createRidgedFbm3(`${slug}/folia`, {
    octaves: 2,
    frequency: opts.frequency ?? 0.37,
    lacunarity: 2,
    gain: 0.5,
  });
  const ax = axis === 'x' ? 0.3 : 0.6;   // stretched along the folial axis
  const ay = axis === 'x' ? 0.6 : 0.3;
  const az = 0.6;
  return function folia(x, y, z) {
    return (ridged(x * ax, y * ay, z * az) - 0.5) * 2;
  };
}

/**
 * Midline seam healer. BP3D ships the brainstem as L/R element pairs whose
 * meshes leave hairline crevices along x=0 (internal slits confirmed by
 * field sampling). All samples with |x| < `floor` evaluate the base at
 * |x| = floor — a shell of solid tissue just outside the slit — so the
 * midline slit is never sampled at all. (Earlier warp variants kept a thin
 * positive membrane near |x| ~ 0.16 that shed ~30 tiny detached mesh blobs;
 * component analysis.) Identity for |x| >= floor, so lateral detail is
 * untouched; the real midline sulci (anterior median fissure, basilar
 * sulcus) are carved AFTER healing. The native dorsal median sulcus loses
 * only its innermost ~1.8 au (still ~2 au deep at the floor shell).
 */
export function seamHeal(base, floor = 0.9) {
  return function healed(x, y, z) {
    if (x >= floor || x <= -floor) return base(x, y, z);
    return x >= 0 ? base(floor, y, z) : base(-floor, y, z);
  };
}

/**
 * Surface-following groove displacement for the cerebellar horizontal
 * fissure: carves INWARD (positive field shift) wherever the surface passes
 * through the y-band, so the groove wraps the posterior half at mid-height
 * instead of slicing the lobe apart (a boolean slab cut a full-depth slit —
 * caught by slice QA; REALISM_PLAN §5 asks for a fissure *hint*).
 */
export function horizontalFissureDent({ yCenter = -7.2, halfWidth = 1.3, depth = 1.15, zStart = -6, zFade = 6 } = {}) {
  const smooth = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  return function dent(x, y, z) {
    const t = (y - yCenter) / halfWidth;
    if (t >= 1 || t <= -1) return 0;
    if (z > zStart) return 0;
    const band = 1 - t * t;
    return depth * band * band * smooth((zStart - z) / zFade);
  };
}
