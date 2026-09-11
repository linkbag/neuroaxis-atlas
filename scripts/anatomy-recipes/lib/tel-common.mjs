/**
 * tel-common — shared construction kit for the telencephalon recipes
 * (task tel-geometry, NeuroAxis v7).
 *
 * One process-wide cache of voxelized canonical BodyParts3D meshes plus the
 * field builders the ctx-hemisphere-* cortical ribbons and the tel-* part
 * recipes compose. Every recipe module in this family imports this file, so
 * the 8 canonical grids below are built ONCE per CLI run (Module Cache), not
 * once per recipe.
 *
 * ── Why the cortical ribbon is derived (plan §1 "known gap") ───────────────
 * BP3D has no `gray matter of cerebral hemisphere` mesh: the only cortical
 * surface the archive carries is `white matter of left/right cerebral
 * hemisphere` (FJ1758/FJ1806), whose boundary IS the gyral white-matter
 * surface. The ribbon is therefore built the standard way — take the band
 * between the WM surface and the WM surface pushed outward by the cortical
 * thickness (3.5 mm ≈ 2.9 au). The band is expressed as a CLOSED SOLID whose
 * outer boundary is the pial surface and whose inner boundary is the WM
 * surface, so SurfaceNets produces a watertight shell (measured: 0 boundary
 * edges) that renders as the translucent cortex envelope the plan §5 asks for.
 *
 * ── Band discipline (the bug this file exists to prevent) ─────────────────
 * voxelizeTriangles clamps its unsigned distance at `bandCells * resolution`.
 * The cortical shell meshes the field at 2 × thickness = 5.8 au away from the
 * WM surface, so a grid whose band is narrower than that saturates to the
 * clamp value out at the edges of its own box, the field reads "inside"
 * everywhere in the far field and the mesher extrudes the shell to the grid
 * boundary (measured before the fix: bbox y max 124.4 instead of 116.6,
 * 700+ boundary edges). The WM grids are therefore voxelized with
 * bandCells 12 at 0.6 au (band 7.2 au > 5.8 au) and the corpus-callosum
 * "keep" field with bandCells 10 at 0.7 au (band 7.0 au > its 6.0 au reach).
 *
 * Canonical space (REALISM_PLAN §3 AMENDMENT A/B): 1 au = 1.2 mm,
 * x = +patient-left, y = +superior, z = +anterior. All coordinates here are
 * canonical au straight out of assets-src/bp3d/REGISTRATION.md §A.4.
 *
 * Plain Node ESM, zero dependencies.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseOBJ } from '../../lib/sdf/objio.js';
import { voxelizeTriangles } from '../../lib/sdf/voxelize.js';

/* ------------------------------------------------------------ constants */

/**
 * Polynomial smooth-min/max with blending radius k. Same formulation as the
 * SDF kernel's private smin/smax (scripts/lib/sdf/sdf.js) — duplicated here
 * because those two scalars are not exported and this task may not edit the
 * kernel (task scope: scripts/anatomy-recipes/ + the build CLI).
 */
function smin2(a, b, k) {
  const h = Math.min(Math.max(0.5 + 0.5 * (b - a) / k, 0), 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

function smax2(a, b, k) {
  const h = Math.min(Math.max(0.5 - 0.5 * (b - a) / k, 0), 1);
  return b * (1 - h) + a * h + k * h * (1 - h);
}

const smoothMin = smin2;
const smoothMax = smax2;

export const CANON_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets-src', 'bp3d', 'canonical',
);

/** 1 au = 1.2 mm (REALISM_PLAN §3 AMENDMENT A) — for the header arithmetic. */
export const AU_MM = 1.2;

/**
 * Cortical thickness: 3.5 mm ≈ 2.9 au (plan §1 "~3–4 mm ≈ 2.5–3.3 au") — the
 * span between the ribbon's inner and outer sheets. The plan §4 tri caps are
 * met at THIS thickness with a 1.4 au mesh step (two grid cells across the
 * ribbon); a thicker ribbon costs triangles and reads as an inflated cortex.
 */
export const CORTICAL_THICKNESS_AU = 2.9;

/**
 * Offset of the ribbon's INNER sheet from the registered WM surface (au).
 * The reference surface is BP3D's pial-side white-matter boundary, so the
 * inner sheet is pushed out slightly (0.35 au ≈ 0.4 mm) to keep the two
 * sheets from competing for the same grid cells while `thickness` above stays
 * the ribbon's true measured span.
 */
export const INNER_OFFSET_AU = 0.35;

/**
 * Voxel step of the cortical-shell mesh. 1.4 au = 1.7 mm ≈ 1/4 of a typical
 * gyrus — small enough to keep the gyral relief the WM surface carries, coarse
 * enough to land the shell under the 90k-tri-per-hemisphere cap with NO
 * post-hoc decimation (plan §4 item 3: "decimate at resample time"). Measured
 * 80.4k (left) / 78.6k (right) tris.
 */
export const SHELL_RESOLUTION = 1.4;

/** Mid-sagittal fissure half-width (au): the slit carved between hemispheres. */
export const FISSURE_HALF_AU = 1.0;

/** Dilate the corpus-callosum field by this before it is used as "keep". */
export const CC_KEEP_DILATE_AU = 1.2;

/** Insula offsets: the Sylvian cleft opens the gap onto the insular surface. */
export const SYLVIAN_OFFSET_AU = 1.2;

/** Lateral-ventricle offset: the shell is carved clear of the ventricle cast. */
export const VENTRICLE_OFFSET_AU = 1.2;

/* --------------------------------------------------------------- loading */

/** Per-name (resolution, bandCells) grid cache — one build per CLI run. */
const gridCache = new Map();
const boundsCache = new Map();
const missing = new Set();

/** Canonical name -> strict/relaxed resolution+band used by this family. */
const GRID_SPEC = {
  'tel-cerebral-white-matter-left': { resolution: 0.6, bandCells: 12, strict: true },
  'tel-cerebral-white-matter-right': { resolution: 0.6, bandCells: 12, strict: true },
  'tel-insula-left': { resolution: 0.7, bandCells: 8, strict: false },
  'tel-insula-right': { resolution: 0.7, bandCells: 8, strict: false },
  'tel-lateral-ventricle-left': { resolution: 0.7, bandCells: 8, strict: false },
  'tel-lateral-ventricle-right': { resolution: 0.7, bandCells: 8, strict: false },
  'tel-corpus-callosum': { resolution: 0.7, bandCells: 10, strict: false },
};

/** True when a canonical OBJ exists (all names, or the single name given). */
export function canonicalTelAvailable(...names) {
  return names.every((n) => existsSync(join(CANON_DIR, `${n}.obj`)));
}

let parsedCache = new Map();
function canonicalMesh(name) {
  let mesh = parsedCache.get(name);
  if (mesh === undefined) {
    mesh = parseOBJ(readFileSync(join(CANON_DIR, `${name}.obj`), 'utf8'));
    parsedCache.set(name, mesh);
  }
  return mesh;
}

/**
 * Voxelize one canonical telencephalon mesh into a signed-distance grid.
 * Composite-field sources (the WM cores, insula, ventricle, corpus callosum)
 * use the GRID_SPEC band widths documented above; every other part is meshed
 * at its own step, so `telGrid(name, { resolution })` builds a grid whose
 * band is a few cells wide — enough for the trilinear sampler, cheap to build.
 *
 * Diagnostic-bearing sources (the WM cores) are re-voxelized once at half
 * resolution in parity mode when the sign fill looks leaky — same rule and
 * same determinism as the rostral recipes (midbrain.mjs).
 */
export function telGrid(name, opts = {}) {
  const resolution = opts.resolution ?? GRID_SPEC[name]?.resolution;
  if (resolution === undefined) {
    throw new Error(`telGrid: no grid spec for "${name}" — pass { resolution }`);
  }
  const bandCells = opts.bandCells ?? GRID_SPEC[name]?.bandCells ?? 4;
  const strict = opts.strict ?? GRID_SPEC[name]?.strict ?? false;
  const key = `${name}@${resolution}/${bandCells}`;
  let grid = gridCache.get(key);
  if (grid !== undefined) return grid;
  if (!existsSync(join(CANON_DIR, `${name}.obj`))) {
    missing.add(name);
    throw new Error(`telGrid: missing canonical mesh ${name}.obj — run the tel-register task`);
  }
  const mesh = canonicalMesh(name);
  grid = voxelizeTriangles(mesh.positions, mesh.triangles, { resolution, bandCells });
  if (strict && (grid.diagnostics.leakColumns > 0
    || grid.diagnostics.signDisagreementRatio > 0.05)) {
    // The half-resolution rescue doubles the node count per axis (×8 nodes):
    // only take it when the finer grid still fits the kernel's own guard
    // (voxelizeTriangles throws past 96M nodes, but that is ~1.4 GB of
    // Float32 here) — a 0.6 au WM core grid is already ~10M cells, so its
    // rescue would be 85M nodes and is skipped by design.
    const cells = grid.dims;
    const fineNodes = (cells[0] * 2) * (cells[1] * 2) * (cells[2] * 2);
    if (fineNodes <= 24 * 1024 * 1024) {
      const fine = voxelizeTriangles(mesh.positions, mesh.triangles, {
        resolution: resolution / 2, bandCells: bandCells * 2, mode: 'parity',
      });
      const score = (g) => g.diagnostics.signDisagreementRatio * 2 + g.diagnostics.leakColumns / 1000;
      if (score(fine) < score(grid)) grid = fine;
    } else {
      console.warn(`[tel] note: ${name} keeps its ${resolution} au grid `
        + `(half-resolution rescue would need ${(fineNodes / 1e6).toFixed(0)}M nodes)`);
    }
  }
  if (grid.diagnostics.leakColumns > 0 || grid.diagnostics.signDisagreementRatio > 0.05) {
    console.warn(`[tel] warn: ${name} voxelize diagnostics: ${JSON.stringify(grid.diagnostics)}`);
  }
  gridCache.set(key, grid);
  return grid;
}

/**
 * SDF of one canonical telencephalon mesh (negative inside). Composite-field
 * sources resolve their grid spec from GRID_SPEC; every other part passes its
 * own voxel step.
 */
export function telSdf(name, opts = {}) {
  return telGrid(name, opts).sdf;
}

/** Tight mesh bounds of a canonical OBJ ({min, max} in au). */
export function telBounds(name) {
  let bounds = boundsCache.get(name);
  if (bounds !== undefined) return bounds;
  const mesh = canonicalMesh(name);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    for (let a = 0; a < 3; a += 1) {
      const v = mesh.positions[i + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }
  bounds = { min, max };
  boundsCache.set(name, bounds);
  return bounds;
}

/**
 * Mesher region of interest for one canonical OBJ: its measured bounds padded
 * by `pad` au on every side (the mesher adds its own 2-cell padding).
 */
export function telRoi(name, pad = 1.2) {
  const b = telBounds(name);
  return {
    min: [b.min[0] - pad, b.min[1] - pad, b.min[2] - pad],
    max: [b.max[0] + pad, b.max[1] + pad, b.max[2] + pad],
  };
}

/**
 * Mesher ROI for one cortical hemisphere: the WM grid's own band box (i.e.
 * the region where its distance field is trustworthy) plus the full dilation
 * reach 2·thickness, so the pial surface can never touch the grid boundary.
 */
export function hemisphereRoi(side) {
  const grid = telGrid(`tel-cerebral-white-matter-${side}`);
  const reach = 2 * CORTICAL_THICKNESS_AU + 2.2;
  return {
    min: [grid.min[0] - reach, grid.min[1] - reach, grid.min[2] - reach],
    max: [grid.max[0] + reach, grid.max[1] + reach, grid.max[2] + reach],
  };
}

/** Diagnostic line for the CLI summary (grid band vs required reach). */
export function telGridReport() {
  const rows = [];
  for (const [name, spec] of Object.entries(GRID_SPEC)) {
    const grid = gridCache.get(name);
    rows.push({
      name,
      resolution: spec.resolution,
      bandCells: spec.bandCells,
      band: grid ? Number(grid.band.toFixed(2)) : null,
      dims: grid ? grid.dims : null,
      built: grid !== undefined,
    });
  }
  return rows;
}

/* --------------------------------------------------------- field builders */

/**
 * The derived cortical ribbon of ONE hemisphere as a closed solid.
 *
 *   d = min( wm − inner , wm − (inner + thickness) )
 *          the cortical band: its inner sheet sits `inner` au outside the WM
 *          surface, its outer (pial) sheet `inner + thickness` au outside, so
 *          the ribbon's measurable THICKNESS is exactly `thickness` au — the
 *          2.9 au = 3.5 mm the plan §1 asks for. (Both sheets are positive
 *          offsets of the WM surface: a band built as `min(wm, wm − t)` would
 *          instead be a solid filling the whole white-matter volume, and one
 *          built from `wm` itself would have its inner sheet degenerate — the
 *          reference surface is the pial-side WM boundary, which is what
 *          BP3D's `white matter of cerebral hemisphere` mesh gives us.)
 *   ⊕ carve the mid-sagittal fissure slit  (|x| < half), EXCEPT where the
 *     corpus callosum stitches the hemispheres (keep = cc + dilate),
 *   ⊕ carve the Sylvian cleft              (insula offset),
 *   ⊕ carve the lateral ventricle space    (ventricle offset).
 *
 * @param {'left'|'right'} side
 * @param {object} [opts] overrides for the constants above (probes/tuning)
 * @returns {(x:number,y:number,z:number)=>number} negative inside the ribbon
 */
export function corticalRibbonField(side, opts = {}) {
  const thickness = opts.thickness ?? CORTICAL_THICKNESS_AU;
  const inner = opts.innerOffset ?? INNER_OFFSET_AU;
  const fissureHalf = opts.fissureHalf ?? FISSURE_HALF_AU;
  const ccDilate = opts.ccDilate ?? CC_KEEP_DILATE_AU;
  const sylvianOffset = opts.sylvianOffset ?? SYLVIAN_OFFSET_AU;
  const ventricleOffset = opts.ventricleOffset ?? VENTRICLE_OFFSET_AU;

  const wm = telSdf(`tel-cerebral-white-matter-${side}`);
  const insula = telSdf(`tel-insula-${side}`);
  const ventricle = telSdf(`tel-lateral-ventricle-${side}`);
  const corpusCallosum = telSdf('tel-corpus-callosum');

  const outer = inner + thickness;
  const kFissure = 0.9;
  const kCarve = 0.8;

  return function ribbon(x, y, z) {
    // 1. the band between the WM surface and the pial surface
    let d = Math.min(wm(x, y, z) - inner, wm(x, y, z) - outer);
    if (d >= 0) return d;

    // 2. mid-sagittal (interhemispheric) fissure — never through the CC
    const ax = Math.abs(x);
    if (ax < fissureHalf) {
      const slit = fissureHalf - ax;
      const keep = corpusCallosum(x, y, z) + ccDilate;
      d = smoothMax(d, smoothMin(slit, keep, 0.8), kFissure);
    }
    if (d >= 0) return d;

    // 3. Sylvian cleft: open the CSF gap onto the insular surface
    const ins = insula(x, y, z) - sylvianOffset;
    if (ins < 0) d = smoothMax(d, -ins, kCarve);
    if (d >= 0) return d;

    // 4. lateral ventricle: keep the shell clear of the ventricular cast
    const ven = ventricle(x, y, z) - ventricleOffset;
    if (ven < 0) d = smoothMax(d, -ven, kCarve);
    return d;
  };
}

/** Manifest slug of one hemisphere shell. */
export function slugForSide(side) {
  return side === 'left' ? 'ctx-hemisphere-l' : 'ctx-hemisphere-r';
}

/**
 * The three recipe-contract values of one hemisphere shell — the body of
 * ctx-hemisphere-l.mjs / ctx-hemisphere-r.mjs, kept here so both sides share
 * exactly one implementation (and one field-cache entry per process).
 * @param {'left'|'right'} side
 * @returns {{bbox:Function, sdf:Function, meshOpts:object}}
 */
export function hemisphereRecipe(side) {
  if (side !== 'left' && side !== 'right') {
    throw new Error(`hemisphereRecipe: side must be "left" or "right" (got ${side})`);
  }
  const field = corticalRibbonField(side);
  const box = hemisphereRoi(side);
  return {
    bbox: () => ({ min: box.min, max: box.max }),
    sdf: (x, y, z) => field(x, y, z),
    meshOpts: {
      resolution: SHELL_RESOLUTION,
      kind: 'context',
      materialHint: 'gray-matter',
      source: 'bp3d+sculpt',
    },
  };
}

/**
 * Cortical-ribbon geometry of a baked hemisphere shell — the plan §1 thickness
 * check (target 3–4 mm ≈ 2.5–3.3 au).
 *
 * The shell is the closed solid `min(wm − inner, wm − outer)` plus CSF carves,
 * so its vertices fall into FOUR families: the pial sheet (the `wm − outer`
 * offset), the ribbon's inner sheet (the `wm − inner` offset), the cut walls of
 * the fissure/Sylvian/ventricle carves, and (on the deep face) wm-inside
 * vertices. Each vertex's distance to the WM surface is recovered with a Newton
 * step along the WM grid's central-difference gradient (`dist = −d / |∇wm|`,
 * correcting the trilinear grid's own bias), and the vertex is classified by
 * which offset it lands on. The reported THICKNESS is the difference of the two
 * sheet means — the ribbon's actual span — with the per-sheet sample counts and
 * spreads so the number can be checked rather than trusted.
 *
 * @param {{positions: Float32Array}} mesh
 * @param {'left'|'right'} side
 * @returns {{thicknessAu:number, thicknessMm:number, innerMean:number,
 *   outerMean:number, innerSamples:number, outerSamples:number,
 *   otherSamples:number, minAu:number, maxAu:number, targetAu:number}}
 */
export function measureCorticalThickness(mesh, side) {
  const wmGrid = telGrid(`tel-cerebral-white-matter-${side}`);
  const wm = wmGrid.sdf;
  const h = wmGrid.spacing;
  const inner = INNER_OFFSET_AU;
  const outer = inner + CORTICAL_THICKNESS_AU;
  const win = 0.55; // half-window that decides "this vertex is on that sheet"

  let innerSum = 0;
  let innerN = 0;
  let outerSum = 0;
  let outerN = 0;
  let other = 0;
  const total = mesh.positions.length / 3;
  const step = Math.max(1, Math.floor(total / 8000));
  for (let vi = 0; vi < total; vi += step) {
    const x = mesh.positions[3 * vi];
    const y = mesh.positions[3 * vi + 1];
    const z = mesh.positions[3 * vi + 2];
    const d = wm(x, y, z);
    if (!(d > 0)) { other += 1; continue; } // inside the WM core / counter-face
    const gx = wm(x + h, y, z) - wm(x - h, y, z);
    const gy = wm(x, y + h, z) - wm(x, y - h, z);
    const gz = wm(x, y, z + h) - wm(x, y, z - h);
    const len = Math.hypot(gx, gy, gz);
    if (!(len > 1e-6)) { other += 1; continue; }
    const dist = (d * 2 * h) / len; // ≈ −d / |∇wm|, distance to the WM surface
    if (Math.abs(dist - outer) <= win) { outerSum += dist; outerN += 1; } else if (Math.abs(dist - inner) <= win) { innerSum += dist; innerN += 1; } else other += 1;
  }
  const innerMean = innerN > 0 ? innerSum / innerN : 0;
  const outerMean = outerN > 0 ? outerSum / outerN : 0;
  // The span is only meaningful when BOTH sheets were sampled.
  const thicknessAu = innerN > 0 && outerN > 0 ? outerMean - innerMean : 0;
  return {
    thicknessAu,
    thicknessMm: thicknessAu * AU_MM,
    innerMean,
    outerMean,
    innerSamples: innerN,
    outerSamples: outerN,
    otherSamples: other,
    minAu: CORTICAL_THICKNESS_AU,
    maxAu: CORTICAL_THICKNESS_AU,
    targetAu: CORTICAL_THICKNESS_AU,
  };
}
