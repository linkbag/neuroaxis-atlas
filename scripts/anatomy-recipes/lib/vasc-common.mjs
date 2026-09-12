/**
 * vasc-common — shared construction kit for the cerebral-vasculature and optic
 * recipes (task `vasc-register-bake`, NeuroAxis v8; docs/NEUROATLAS_V8_PLAN.md
 * §1a/§1b, §4 items 1–3).
 *
 * Sibling of `tel-common.mjs` for the v8 vessel family, with the one structural
 * difference the source geometry forces: a TELENCEPHALON part is a solid volume
 * (caudate, ventricle, WM core), so it is voxelized once on its own grid and
 * meshed directly. A VESSEL is a THIN TUBE — often barely 2–3 au across — so
 * this module fixes the voxel step from the structure's own measured caliber
 * and keeps the tube's inner lumen from closing.
 *
 * ── Why there is no decimation stage (plan §4.3 "tight tri caps") ───────────
 * The CLI contract is `sdf` → SurfaceNets → GLB, and `--stats` re-derives the
 * tri count from `sdf` alone: a post-hoc decimator would make the committed GLB
 * unreproducible from the recipe and would defeat `--tel-verify`-style
 * staleness checks. The tri budget is therefore met by CHOOSING THE VOXEL STEP
 * (measured per part in the registry module's STEP table, see the recipe
 * header), exactly the discipline tel-parts.mjs established — not by editing
 * triangles after the fact.
 *
 * ── Why the grid is padded so generously ───────────────────────────────────
 * `voxelizeTriangles` clamps its unsigned distance at `bandCells * resolution`.
 * For a closed tube every node inside the lumen is farther from the source
 * surface than half the caliber, so a band narrower than the largest inradius
 * makes the interior read "outside", the sign fill leaks and SurfaceNets emits
 * a hollow shell with boundary edges. `bandCells` is therefore derived from the
 * structure's own bounding box (the max inradius is bounded by half the
 * smallest box axis) with a floor of 4 cells, and `assertClosedBand` aborts the
 * bake loudly if the band cannot cover it.
 *
 * Canonical space (REALISM_PLAN §3 AMENDMENT A/B): 1 au = 1.2 mm,
 * x = +patient-left, y = +superior, z = +anterior. Names resolve to
 * `assets-src/bp3d/canonical/<name>.obj` written by `scripts/lib/register.mjs`.
 *
 * Plain Node ESM, zero dependencies.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseOBJ } from '../../lib/sdf/objio.js';
import { voxelizeTriangles } from '../../lib/sdf/voxelize.js';

/** 1 au = 1.2 mm (REALISM_PLAN §3 AMENDMENT A). */
export const AU_MM = 1.2;

/** Directory holding the registered canonical meshes. */
export const CANON_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets-src', 'bp3d', 'canonical',
);

/** Band-cell floor: below this a 1-cell-thin tube cannot be sign-filled. */
export const MIN_BAND_CELLS = 4;

/* --------------------------------------------------------------- loading */

const parsedCache = new Map();
const boundsCache = new Map();
const statsCache = new Map();

/** True when every named canonical OBJ exists. */
export function canonicalVascAvailable(...names) {
  return names.every((n) => existsSync(join(CANON_DIR, `${n}.obj`)));
}

function canonicalMesh(name) {
  let mesh = parsedCache.get(name);
  if (mesh === undefined) {
    const path = join(CANON_DIR, `${name}.obj`);
    if (!existsSync(path)) {
      throw new Error(`vasc-common: missing canonical mesh ${name}.obj in ${CANON_DIR} — `
        + 'run `node scripts/lib/register.mjs` (task vasc-register-bake step 1)');
    }
    mesh = parseOBJ(readFileSync(path, 'utf8'));
    parsedCache.set(name, mesh);
  }
  return mesh;
}

/** Tight mesh bounds of a canonical OBJ ({min, max} in au). */
export function vascBounds(name) {
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

/** Vertex/face counts of a canonical OBJ (provenance reporting). */
export function vascSourceStats(name) {
  let stats = statsCache.get(name);
  if (stats === undefined) {
    const mesh = canonicalMesh(name);
    stats = {
      vertices: mesh.positions.length / 3,
      faces: mesh.triangles.length / 3,
      bbox: vascBounds(name),
    };
    statsCache.set(name, stats);
  }
  return stats;
}

/** Mesher region of interest: the measured bounds padded by `pad` au per side. */
export function vascRoi(name, pad = 1.5) {
  const b = vascBounds(name);
  return {
    min: [b.min[0] - pad, b.min[1] - pad, b.min[2] - pad],
    max: [b.max[0] + pad, b.max[1] + pad, b.max[2] + pad],
  };
}

/**
 * Union ROI of several canonical meshes — the mesher box for a part that is
 * fused from more than one element (a stitched MCA tree, a two-element optic
 * nerve). Each name contributes its own padded box; the union is what the
 * grid must cover.
 */
export function vascRoiUnion(names, pad = 1.5) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const n of names) {
    const b = vascBounds(n);
    for (let a = 0; a < 3; a += 1) {
      if (b.min[a] - pad < min[a]) min[a] = b.min[a] - pad;
      if (b.max[a] + pad > max[a]) max[a] = b.max[a] + pad;
    }
  }
  return { min, max };
}

/**
 * bandCells that provably covers a part's largest inradius. The largest
 * inradius of any solid inside a box is ≤ half its SHORTEST axis; using that
 * bound (rounded up, floor MIN_BAND_CELLS) guarantees every interior node is
 * inside the rasterized band, so the sign fill cannot leak.
 */
export function bandCellsFor(name, resolution) {
  const b = vascBounds(name);
  const shortestHalf = Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2;
  return Math.max(MIN_BAND_CELLS, Math.ceil(shortestHalf / resolution) + 2);
}

/** Same rule for a multi-element part. */
export function bandCellsForUnion(names, resolution) {
  let shortestHalf = Infinity;
  for (const n of names) {
    const b = vascBounds(n);
    shortestHalf = Math.min(
      shortestHalf,
      Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2,
    );
  }
  return Math.max(MIN_BAND_CELLS, Math.ceil(shortestHalf / resolution) + 2);
}

/* ----------------------------------------------------------- field build */

const gridCache = new Map();

/**
 * Voxelize one canonical mesh and return its SignedGrid. Cached per
 * (name, resolution, bandCells) so a process that bakes the whole vessel
 * family builds each grid once.
 */
export function vascGrid(name, opts = {}) {
  const resolution = opts.resolution ?? 1.2;
  const bandCells = opts.bandCells ?? bandCellsFor(name, resolution);
  const useParity = opts.mode === 'parity';
  const key = `${name}@${resolution}/${bandCells}${useParity ? '/parity' : ''}`;
  let grid = gridCache.get(key);
  if (grid !== undefined) return grid;
  const mesh = canonicalMesh(name);
  grid = voxelizeTriangles(mesh.positions, mesh.triangles, {
    resolution,
    bandCells,
    ...(useParity ? { mode: 'parity' } : {}),
  });
  if (grid.diagnostics.leakColumns > 0 || grid.diagnostics.signDisagreementRatio > 0.02) {
    console.warn(`[vasc] note: ${name} voxelize diagnostics ${JSON.stringify(grid.diagnostics)}`
      + ` (res ${resolution}, band ${bandCells} cells)`);
  }
  gridCache.set(key, grid);
  return grid;
}

/**
 * SDF (negative inside) of one canonical mesh at the given voxel step.
 *
 * `opts.cropBelowY` applies the cervical crop (see `cropBelowY` below): the two
 * feeding trunks BodyParts3D ships with their full cervical course are cut at a
 * documented horizontal plane so the baked vessel layer stays inside the atlas
 * box. The crop is a MESHER-side operation only — the registered canonical mesh
 * keeps the complete source geometry (registration summary §B.4).
 */
export function vascSdf(name, opts = {}) {
  const base = vascGrid(name, opts).sdf;
  if (opts.cropBelowY === undefined || opts.cropBelowY === null) return base;
  return cropBelowY(base, opts.cropBelowY);
}

/**
 * The mesher-side cervical crop. Returns `f` unchanged above `yCut`, and a
 * constant positive plane field below it, so the level set `d = 0` of the
 * result is exactly `min(f, 0)` — the vessel's surface above the cut plus a
 * flat cap in the cut plane. The field stays continuous, so SurfaceNets emits
 * a closed solid with the cap filled (measured watertight; see the recipe
 * header table).
 *
 * Why a crop at all: the internal-carotid elements carry the cervical course
 * (BP3D z 1434.5–1537.7 mm ⇒ canonical y −71.5…+12.2) and the vertebral
 * elements the full neck course (y −97.3…−19.3), i.e. up to 47 au BELOW the
 * atlas floor `lvl-spinal-medulla` (y = −50). The atlas models the brain, not
 * the neck: an unbranched artery hanging half a metre-millimetre count below
 * the cervicomedullary junction reads as an artefact, and it would put a
 * vasc- record's pickable geometry outside every section plane the atlas has.
 * Cropping keeps the whole Willis-relevant course (the carotid siphon and the
 * intracranial vertebral segment are both far above the cut) and nothing else.
 */
export function cropBelowY(field, yCut) {
  return (x, y, z) => (y >= yCut ? field(x, y, z) : Math.min(0, yCut - y));
}

/** Default crop plane (au): 5 au above the atlas floor `lvl-spinal-medulla` (−50). */
export const CERVICAL_CUT_Y = -45;

/** Signed min of several fields — the fused SDF of a multi-element part. */
export function fuseFields(fields) {
  if (fields.length === 1) return fields[0];
  return (x, y, z) => {
    let d = fields[0](x, y, z);
    for (let i = 1; i < fields.length; i += 1) {
      const b = fields[i](x, y, z);
      if (b < d) d = b;
    }
    return d;
  };
}

/**
 * Materialise the union SDF of several canonical meshes: each is voxelized on
 * the SAME grid box and step, then the fields are min-combined. The grids are
 * built over the union ROI so a fused part meshes as one closed solid.
 */
export function vascUnionSdf(names, opts = {}) {
  const resolution = opts.resolution ?? 1.2;
  const box = opts.box ?? vascRoiUnion(names, opts.pad ?? 1.5);
  const bandCells = opts.bandCells ?? bandCellsForUnion(names, resolution);
  const fields = names.map((n) => {
    const mesh = canonicalMesh(n);
    return voxelizeTriangles(mesh.positions, mesh.triangles, { resolution, bandCells, bbox: box }).sdf;
  });
  return fuseFields(fields);
}

/** Diagnostics for the CLI/summary: the grids this process actually built. */
export function vascGridReport() {
  return [...gridCache.entries()].map(([key, grid]) => ({
    key,
    dims: grid.dims,
    bandAu: Number(grid.band.toFixed(2)),
    leakColumns: grid.diagnostics.leakColumns,
    signDisagreementRatio: Number(grid.diagnostics.signDisagreementRatio.toFixed(4)),
  }));
}
