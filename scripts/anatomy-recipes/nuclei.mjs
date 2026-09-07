/**
 * nuclei.mjs — organic nucleus meshes, clipped inside envelopes + containment
 * QA (task nuclei-organic; REALISM_PLAN §6 shaping rules, §4 slugs/paths).
 *
 * REGISTRY MODULE — unlike the one-part recipe files, this module exports a
 * `recipes` array with ONE ENTRY PER TAXONOMY NUCLEUS SLUG (every
 * kind:"nucleus" record in src/data/taxonomy.json, 71 slugs) plus QA helpers
 * consumed by scripts/build-anatomy-geometry.mjs. The CLI validates each
 * entry with the same recipe contract (slug / bbox / sdf / meshOpts), so
 * `--part <slug>`, `--all` and `--stats` work per nucleus.
 *
 * Shaping (plan §6, per family):
 *   default                   fbm-displaced ellipsoid from origin3d/size3d
 *                             (size3d are radii — v1 scales a unit sphere by
 *                             them), amplitude ≈ 12% mean radius, seeded by
 *                             slug, mirrored for `laterality:"paired"`.
 *   inferior olive principal  corrugated purse: shell (outer ovoid minus a
 *                             medially-offset cavity = hilum opening
 *                             medially) with sine ridges running along the
 *                             mediolateral axis.
 *   inferior olive medial     folded lens plate (two offset ovoids
 *                             intersected).
 *   substantia nigra c/r      crescent band hugging the crus arc — the arc is
 *                             SAMPLED from the midbrain envelope's ventral
 *                             surface (surface-following capsule chain);
 *                             compacta seated deeper (dorsal) than
 *                             reticulata.
 *   red nucleus               ovoid with a smooth medial depression.
 *   thalamic nuclei (14)      soft-Voronoi partition cells: cell = the
 *                             nearest-seed region (SDF max over bisector
 *                             planes = min over bisector half-spaces), each
 *                             nucleus = displaced cell ∩ thalamic envelope
 *                             SDF — anatomically plausible packing, no
 *                             floating ellipsoids. Seeds are the records'
 *                             origin3d; the right side evaluates the mirrored
 *                             point against the same construction.
 *   CN columns (ambiguus,     tapered fbm tubes at the sulcus / floor
 *   dmv, solitarius,          positions from the data.
 *   hypoglossal, spinal V,
 *   mesencephalic V, reticular formation)
 *   locus coeruleus / area    thin flattened surface-hugging plaques.
 *   postrema / arcuate
 *
 * Containment (plan §6 QA):
 *   Every shape is CLIPPED against its region's envelope SDFs
 *   (smooth-intersect with the envelope dilated by +0.3 au, so clipped faces
 *   keep a skin inside the wall) and CARVED away from the CSF cavities it
 *   must not enter (vent-fourth-ventricle for the floor columns — locus
 *   coeruleus, vestibular complex, solitarius, DMV, hypoglossal, ambiguus,
 *   area postrema, abducens, facial, superior salivatory, cochlear — and
 *   vent-third-ventricle for the midline diencephalic nuclei), after seeds
 *   that sit outside the registered envelopes (schematic v1 data vs
 *   AMENDMENT-A registration — offsets measured in
 *   .bp3d-probe/nuclei-probe.mjs) are PROJECTED onto the envelope interior
 *   along the SDF gradient. `--nuclei` (CLI) additionally samples ~200
 *   surface points per baked mesh, reports the fraction with
 *   min-envelope-SDF ≤ +0.8 au, auto-nudges violators along the gradient in
 *   ≤8 iterations, and — AMENDMENT A scale rescue — when violators persist,
 *   rebuilds the nucleus with size3d scaled by 1.2/0.7 ≈ 1.71 in x/z about
 *   origin3d (the registered envelopes are ~1.7× the schematic v1 envelopes)
 *   before re-nudging; `scaled` lands in nuclei-report.json.
 *
 * Envelope SDF sources: the envelope recipes export sdf() and are imported
 * directly (they are in the same directory / CLI scan). If a recipe module
 * cannot be imported, containment falls back to voxelize of the BAKED GLB
 * (src/assets/anatomy/<envelope-slug>.glb) via a tiny GLB reader matching the
 * documented lib/sdf/glb.js writer format. If both are unavailable the
 * builders degrade to unclipped schematic shapes (plan §1 fallback
 * philosophy — bakes still succeed).
 *
 * Plain Node ESM, zero dependencies beyond the stdlib. All randomness is
 * seeded from the part slug (docs/GEOMETRY_PIPELINE.md §2 determinism rule).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  capsule, displace, ellipsoid, intersect, smoothIntersect, smoothSubtract,
  smoothUnionAll, subtract, translate,
} from '../lib/sdf/sdf.js';
import { createFbm3 } from '../lib/sdf/noise.js';
import { voxelizeTriangles } from '../lib/sdf/voxelize.js';
import { surfaceNets } from '../lib/sdf/surfacenets.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const ASSETS_DIR = join(ROOT, 'src', 'assets', 'anatomy');

/* ------------------------------------------------------------ frozen data */

/**
 * id → { origin3d, size3d, laterality, region, subdivision } for every
 * kind:"nucleus" record. Read-only consumption of the frozen inputs
 * (src/data/taxonomy.json + src/data/structures/*.json).
 */
function loadNucleusRecords() {
  const taxonomy = JSON.parse(readFileSync(join(ROOT, 'src/data/taxonomy.json'), 'utf8'));
  const byId = new Map();
  for (const rec of taxonomy) {
    if (rec.kind !== 'nucleus') continue;
    byId.set(rec.id, {
      id: rec.id,
      laterality: rec.laterality,
      region: rec.region,
      subdivision: rec.subdivision,
      origin3d: null,
      size3d: null,
    });
  }
  const structuresDir = join(ROOT, 'src/data/structures');
  for (const f of readdirSync(structuresDir).filter((n) => n.endsWith('.json'))) {
    const list = JSON.parse(readFileSync(join(structuresDir, f), 'utf8'));
    for (const rec of list) {
      const entry = byId.get(rec.id);
      if (!entry) continue;
      entry.origin3d = rec.origin3d;
      entry.size3d = rec.size3d;
    }
  }
  const missing = [...byId.values()].filter((r) => !r.origin3d || !r.size3d);
  if (missing.length > 0) {
    throw new Error(`nuclei.mjs: nucleus records without origin3d/size3d: ${missing.map((m) => m.id).join(', ')}`);
  }
  return [...byId.values()];
}

const RECORDS = loadNucleusRecords();
const RECORD_BY_ID = new Map(RECORDS.map((r) => [r.id, r]));

/* ------------------------------------------------------- envelope access */

/** Envelope recipe modules (same directory) keyed by envelope part slug. */
const ENV_MODULES = [
  ['ctx-midbrain-surface', './midbrain.mjs'],
  ['ctx-pons-surface', './pons.mjs'],
  ['ctx-medulla-surface', './medulla.mjs'],
  ['ctx-thalamus-l', './thalamus.mjs'],
  ['ctx-thalamus-r', './thalamus-r.mjs'],
  ['ctx-hypothalamus-surface', './hypothalamus.mjs'],
  ['ctx-pineal', './epithalamus.mjs'],
  ['ctx-cerebellum-l', './cerebellum-l.mjs'],
  ['ctx-cerebellum-r', './cerebellum-r.mjs'],
  ['ctx-cerebellar-vermis', './cerebellum-vermis.mjs'],
  // CSF cavities enter the clip as negated (exclusion) fields — floor/midline
  // nuclei must hug the CSF wall without entering the lumen.
  ['vent-fourth-ventricle', './csf-fourth-ventricle.mjs'],
  ['vent-third-ventricle', './csf-rostral.mjs'],
];

const envCache = new Map();     // slug -> sdf | null (null = unavailable)
const envModuleCache = new Map(); // slug -> recipe module | null

/**
 * Tiny GLB reader matching the documented lib/sdf/glb.js writer layout
 * (single mesh primitive, POSITION+NORMAL float32 VEC3, uint32 indices,
 * JSON chunk then BIN chunk) — the writer's format, read back. Used ONLY
 * when an envelope recipe module cannot be imported: containment is
 * reconstructed by voxelize of the baked envelope GLB.
 */
function envelopeSdfFromGlb(slug) {
  const path = join(ASSETS_DIR, `${slug}.glb`);
  if (!existsSync(path)) return null;
  try {
    const bytes = readFileSync(path);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67) return null;
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
    const binHead = 20 + jsonLen;
    const binLen = dv.getUint32(binHead, true);
    const bin = bytes.subarray(binHead + 8, binHead + 8 + binLen);
    const prim = json.meshes[0].primitives[0];
    const range = (accIndex) => {
      const acc = json.accessors[accIndex];
      const view = json.bufferViews[acc.bufferView];
      const comps = acc.type === 'VEC3' ? 3 : 1;
      return { start: view.byteOffset ?? 0, len: acc.count * 4 * comps };
    };
    const pos = range(prim.attributes.POSITION);
    const idx = range(prim.indices);
    const positions = new Float32Array(bin.buffer, bin.byteOffset + pos.start, pos.len / 4);
    const indices = new Uint32Array(bin.buffer, bin.byteOffset + idx.start, idx.len / 4);
    return voxelizeTriangles(positions, indices, { resolution: 0.45 }).sdf;
  } catch {
    return null;
  }
}

async function loadEnvelope(slug, moduleFile) {
  if (envCache.has(slug)) return envCache.get(slug);
  let mod = null;
  try {
    mod = await import(moduleFile);
  } catch {
    mod = null;
  }
  const sdf = (mod && typeof mod.sdf === 'function' ? mod.sdf : null)
    ?? envelopeSdfFromGlb(slug);
  envModuleCache.set(slug, mod);
  envCache.set(slug, sdf);
  return sdf;
}

// Envelope recipe modules are also CLI-scanned recipe files, so the CLI's
// import pass loads them anyway; resolving them here (top-level await) keeps
// every builder below synchronous and the module graph single-instance.
await Promise.all(ENV_MODULES.map(([slug, file]) => loadEnvelope(slug, file)));

/** Resolve an envelope lazily (QA runner may ask for non-preloaded slugs). */
export async function ensureEnvelope(slug) {
  if (envCache.has(slug)) return envCache.get(slug);
  const found = ENV_MODULES.find(([s]) => s === slug);
  return found ? loadEnvelope(slug, found[1]) : envelopeSdfFromGlb(slug);
}

function envByKey(slug) {
  return envCache.get(slug) ?? null;
}

/** Min-union over the available SDFs of `keys` (null when none resolve). */
function envUnion(keys) {
  const fns = keys.map(envByKey).filter(Boolean);
  if (fns.length === 0) return null;
  if (fns.length === 1) return fns[0];
  return (x, y, z) => {
    let d = Infinity;
    for (let i = 0; i < fns.length; i += 1) {
      const v = fns[i](x, y, z);
      if (v < d) d = v;
    }
    return d;
  };
}

/** Which envelope parts contain/clip each nucleus (region → parts). */
export function envelopeKeysFor(slug) {
  const rec = RECORD_BY_ID.get(slug);
  if (!rec) return [];
  if (slug === 'nuc-pineal-gland') return ['ctx-pineal'];
  if (slug === 'nuc-habenula') return ['ctx-thalamus-l', 'ctx-thalamus-r'];
  switch (rec.region) {
    case 'diencephalon':
      if (rec.subdivision === 'Thalamus') return ['ctx-thalamus-l', 'ctx-thalamus-r'];
      if (rec.subdivision === 'Subthalamus') {
        return ['ctx-thalamus-l', 'ctx-thalamus-r', 'ctx-hypothalamus-surface'];
      }
      return ['ctx-hypothalamus-surface']; // Hypothalamus (and Epithalamus default)
    case 'midbrain': return ['ctx-midbrain-surface', 'ctx-pons-surface'];
    case 'pons': return ['ctx-pons-surface', 'ctx-medulla-surface'];
    case 'medulla': return ['ctx-medulla-surface', 'ctx-pons-surface'];
    case 'cerebellum': return ['ctx-cerebellum-l', 'ctx-cerebellum-r', 'ctx-cerebellar-vermis'];
    default: return [];
  }
}

/**
 * CSF cavities each nucleus must stay out of (negated in the clip/QA):
 * the fourth-ventricle floor columns (locus coeruleus, vestibular complex,
 * solitarius, DMV, hypoglossal, ambiguus, area postrema, abducens, facial,
 * superior salivatory, cochlear) and the third-ventricle slit for the
 * midline diencephalic nuclei.
 */
const FLOOR_COLUMNS = new Set([
  'nuc-locus-coeruleus', 'nuc-vestibular-superior', 'nuc-vestibular-medial',
  'nuc-vestibular-lateral', 'nuc-vestibular-inferior', 'nuc-solitarius-rostral',
  'nuc-abducens', 'nuc-facial', 'nuc-superior-salivatory', 'nuc-cochlear-ventral',
  'nuc-cochlear-dorsal', 'nuc-solitarius-caudal', 'nuc-dmv', 'nuc-hypoglossal',
  'nuc-ambiguus', 'nuc-area-postrema',
]);

/** Region envelopes (solid) + CSF cavities (void) for one nucleus. */
export function envelopeGroupsFor(slug) {
  const rec = RECORD_BY_ID.get(slug);
  if (!rec) return { solid: [], void: [] };
  const voids = [];
  if (FLOOR_COLUMNS.has(slug)) voids.push('vent-fourth-ventricle');
  if (rec.region === 'diencephalon' && rec.subdivision !== 'Subthalamus'
    && Math.abs(rec.origin3d[0]) < 1e-9) {
    voids.push('vent-third-ventricle');
  }
  return { solid: envelopeKeysFor(slug), void: voids };
}

/**
 * Carve the CSF cavities out of a shape: smooth-subtract the ventricle
 * solids grown by `gap`, so floor/midline nuclei hug the CSF wall without
 * entering the lumen. No-op when a cavity field is unavailable.
 */
function carveVentricles(field, keys, { gap = 0.15, k = 0.35 } = {}) {
  let out = field;
  for (const key of keys) {
    const env = envByKey(key);
    if (!env) continue;
    out = smoothSubtract(out, (x, y, z) => env(x, y, z) + gap, k);
  }
  return out;
}

/* -------------------------------------------------- field helpers (shared) */

const smoothstep = (a, b, t) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** Envelope SDF gradient (central differences). */
function envGrad(env, x, y, z, eps = 0.18) {
  return [
    (env(x + eps, y, z) - env(x - eps, y, z)) / (2 * eps),
    (env(x, y + eps, z) - env(x, y - eps, z)) / (2 * eps),
    (env(x, y, z + eps) - env(x, y, z - eps)) / (2 * eps),
  ];
}

/**
 * Project a seed onto the envelope interior: march along −∇SDF until the
 * field reads ≤ −depth (≤0.35 au steps, ≤16 iterations).
 */
function projectSeed(env, seed, depth = 0.6) {
  const p = seed.slice();
  if (!env) return p;
  for (let i = 0; i < 16; i += 1) {
    const d = env(p[0], p[1], p[2]);
    if (d <= -depth) break;
    const g = envGrad(env, p[0], p[1], p[2]);
    const len = Math.hypot(g[0], g[1], g[2]);
    if (len < 1e-6) break;
    const step = Math.min(0.35, Math.max(0.05, d + depth));
    p[0] -= (g[0] / len) * step;
    p[1] -= (g[1] / len) * step;
    p[2] -= (g[2] / len) * step;
  }
  return p;
}

/** Clip a shape into the envelope (keep a `grow` skin inside the wall). */
function clipToEnvelope(field, keys, { grow = 0.3, k = 0.5 } = {}) {
  const env = envUnion(keys);
  if (!env) return field;
  return smoothIntersect(field, (x, y, z) => env(x, y, z) + grow, k);
}

/** Mirror-union for `laterality:"paired"` records (the runtime renders the
 *  same canonical-space GLB for both instances → the GLB carries both sides). */
function bilateral(field, paired) {
  if (!paired) return field;
  return (x, y, z) => Math.min(field(x, y, z), field(-x, y, z));
}

/* --------------------------------------------------------- shape builders */
/* Every builder returns { field, box, resolution } — box is the TIGHT recipe
 * bbox (the mesher pads ~2 cells itself). All noise is slug-seeded.        */

function displacedEllipsoid(slug, rec, opts = {}) {
  const scale = opts.scale ?? 0.95;
  const flat = opts.flat ?? 1; // multiplies the z radius (surface plaques)
  const depth = opts.depth ?? 0.6;
  const scaleXZ = opts.scaleXZ ?? 1; // AMENDMENT-A rescue factor (x/z about origin)
  const paired = rec.laterality === 'paired';
  const groups = envelopeGroupsFor(rec.id);
  const env = envUnion(groups.solid);
  const seed = projectSeed(env, rec.origin3d, depth);
  const r = rec.size3d.map((v, i) => v * scale * (i === 1 ? 1 : scaleXZ));
  r[2] *= flat;
  const meanR = (r[0] + r[1] + r[2]) / 3;
  const amp = opts.amp ?? Math.min(0.3, Math.max(0.08, 0.12 * meanR));
  // Frequency kept low vs the mesh step (≥ ~4.5 samples per noise feature)
  // — higher frequencies only alias into crinkle and inflate tri counts.
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 3, frequency: 0.55, lacunarity: 2, gain: 0.5 });
  const base = translate(ellipsoid(r[0], r[1], r[2]), seed[0], seed[1], seed[2]);
  let field = displace(base, fbm, amp);
  field = bilateral(field, paired);
  if (!opts.noCarve) field = carveVentricles(field, groups.void);
  field = clipToEnvelope(field, groups.solid);
  const pad = amp + 1.0;
  return {
    field,
    box: {
      min: [seed[0] - r[0] - pad, seed[1] - r[1] - pad, seed[2] - r[2] - pad],
      max: [seed[0] + r[0] + pad, seed[1] + r[1] + pad, seed[2] + r[2] + pad],
    },
    resolution: opts.resolution ?? 0.34,
  };
}

/** Tapered fbm tube along the column's y extent (cranial-nerve columns). */
function columnNucleus(slug, rec, opts = {}) {
  const paired = rec.laterality === 'paired';
  const groups = envelopeGroupsFor(rec.id);
  const env = envUnion(groups.solid);
  const scaleXZ = opts.scaleXZ ?? 1; // AMENDMENT-A rescue factor (x/z about origin)
  const seed = projectSeed(env, rec.origin3d, opts.depth ?? 0.55);
  const rBase = Math.min(rec.size3d[0], rec.size3d[2]) * (opts.scale ?? 0.95) * scaleXZ;
  const halfY = rec.size3d[1] * 0.92;
  const segs = Math.max(3, Math.min(6, Math.round((2 * halfY) / 3)));
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 3, frequency: 0.5, lacunarity: 2, gain: 0.5 });
  const wobble = createFbm3(`${slug}/wobble`, { octaves: 2, frequency: 0.35, lacunarity: 2, gain: 0.5 });
  const caps = [];
  for (let s = 0; s < segs; s += 1) {
    const t0 = s / segs;
    const t1 = (s + 1) / segs;
    const y0 = seed[1] - halfY + 2 * halfY * t0;
    const y1 = seed[1] - halfY + 2 * halfY * t1;
    // Taper toward the caudal (lower-y) end; gentle wobble keeps it organic.
    const r0 = rBase * (1 - 0.28 * (1 - t0));
    const r1 = rBase * (1 - 0.28 * (1 - t1));
    const z0 = seed[2] + 0.3 * wobble(seed[0], y0, seed[2]);
    const z1 = seed[2] + 0.3 * wobble(seed[0], y1, seed[2]);
    caps.push(capsule(seed[0], y0, z0, seed[0], y1, z1, (r0 + r1) / 2));
  }
  let field = smoothUnionAll(caps, rBase * 0.5);
  field = displace(field, fbm, Math.min(0.3, 0.16 * rBase));
  field = bilateral(field, paired);
  if (!opts.noCarve) field = carveVentricles(field, groups.void);
  field = clipToEnvelope(field, groups.solid);
  const pad = rBase + 1.1;
  return {
    field,
    box: {
      min: [seed[0] - pad, seed[1] - halfY - 1.0, seed[2] - pad],
      max: [seed[0] + pad, seed[1] + halfY + 1.0, seed[2] + pad],
    },
    resolution: opts.resolution ?? 0.3,
  };
}

/**
 * Inferior olive, principal nucleus: a corrugated purse — shell (outer ovoid
 * minus a cavity offset toward the midline; the medial opening is the hilum)
 * with sine ridges running along the mediolateral axis (plan §6).
 */
function olivePurse(slug, rec, opts = {}) {
  const groups = envelopeGroupsFor(rec.id);
  const env = envUnion(groups.solid);
  const seed = projectSeed(env, rec.origin3d, 0.7);
  const scaleXZ = opts.scaleXZ ?? 1; // AMENDMENT-A rescue factor (x/z about origin)
  const rx = rec.size3d[0] * 0.98 * scaleXZ;
  const ry = rec.size3d[1] * 0.9;
  const rz = rec.size3d[2] * 0.98 * scaleXZ;
  const outer = translate(ellipsoid(rx, ry, rz), seed[0], seed[1], seed[2]);
  const cavity = translate(
    ellipsoid(rx * 0.55, ry * 0.6, rz * 0.55),
    seed[0] - rx * 0.62, seed[1], seed[2], // hilum opens medially (toward x=0)
  );
  const shell = subtract(outer, cavity);
  // Corrugation: crests run along x (mediolateral), phase stacked over y with
  // a slight z twist; fades toward the hilum so the opening stays open.
  const ridges = (x, y, z) => {
    const local = (x - (seed[0] - rx * 0.62)) / rx; // 0 at the hilum
    const fade = smoothstep(-0.1, 0.75, local);
    const phase = (2 * Math.PI * 3.5 * (y - seed[1])) / (2 * ry)
      + 0.9 * Math.sin((2 * Math.PI * (z - seed[2])) / (2.2 * Math.max(rz, 0.5)));
    return Math.sin(phase) * fade;
  };
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 3, frequency: 0.6, lacunarity: 2, gain: 0.5 });
  let field = displace(shell, (x, y, z) => (ridges(x, y, z) + 0.4 * fbm(x, y, z)) / 1.4, 0.26);
  field = bilateral(field, true);
  if (!opts.noCarve) field = carveVentricles(field, groups.void);
  field = clipToEnvelope(field, groups.solid);
  const pad = 1.2;
  return {
    field,
    box: {
      min: [seed[0] - rx - pad, seed[1] - ry - pad, seed[2] - rz - pad],
      max: [seed[0] + rx + pad, seed[1] + ry + pad, seed[2] + rz + pad],
    },
    resolution: 0.34,
  };
}

/** Medial accessory olive: folded lens plate (two offset ovoids intersected). */
function olivePlate(slug, rec, opts = {}) {
  const groups = envelopeGroupsFor(rec.id);
  const env = envUnion(groups.solid);
  const seed = projectSeed(env, rec.origin3d, 0.7);
  const scaleXZ = opts.scaleXZ ?? 1; // AMENDMENT-A rescue factor (x/z about origin)
  const rx = rec.size3d[0] * 0.92 * scaleXZ;
  const ry = rec.size3d[1] * 0.9;
  const rz = rec.size3d[2] * 0.85 * scaleXZ;
  const a = translate(ellipsoid(rx, ry, rz), seed[0], seed[1], seed[2]);
  const b = translate(ellipsoid(rx, ry, rz), seed[0] - rx * 0.45, seed[1] + ry * 0.12, seed[2] - rz * 0.2);
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 3, frequency: 0.6, lacunarity: 2, gain: 0.5 });
  let field = displace(intersect(a, b), fbm, 0.16);
  field = bilateral(field, true);
  if (!opts.noCarve) field = carveVentricles(field, groups.void);
  field = clipToEnvelope(field, groups.solid);
  const pad = 1.1;
  return {
    field,
    box: {
      min: [seed[0] - rx - pad, seed[1] - ry - pad, seed[2] - rz - pad],
      max: [seed[0] + rx + pad, seed[1] + ry + pad, seed[2] + rz + pad],
    },
    resolution: 0.28,
  };
}

/** Red nucleus: ovoid with a smooth medial depression. */
function redNucleus(slug, rec, opts = {}) {
  const groups = envelopeGroupsFor(rec.id);
  const env = envUnion(groups.solid);
  const seed = projectSeed(env, rec.origin3d, 0.6);
  const scaleXZ = opts.scaleXZ ?? 1; // AMENDMENT-A rescue factor (x/z about origin)
  const r = rec.size3d.map((v, i) => v * 0.95 * (i === 1 ? 1 : scaleXZ));
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 4, frequency: 0.55, lacunarity: 2, gain: 0.5 });
  const base = translate(ellipsoid(r[0], r[1], r[2]), seed[0], seed[1], seed[2]);
  // Medial depression: carve toward the midline face (rubro-olivary hilum).
  const dimple = translate(
    ellipsoid(r[0] * 0.42, r[1] * 0.55, r[2] * 0.42),
    seed[0] - r[0] * 0.72, seed[1] + r[1] * 0.1, seed[2],
  );
  let field = displace(smoothSubtract(base, dimple, 0.5), fbm, 0.26);
  field = bilateral(field, true);
  if (!opts.noCarve) field = carveVentricles(field, groups.void);
  field = clipToEnvelope(field, groups.solid);
  const pad = 1.1;
  return {
    field,
    box: {
      min: [seed[0] - r[0] - pad, seed[1] - r[1] - pad, seed[2] - r[2] - pad],
      max: [seed[0] + r[0] + pad, seed[1] + r[1] + pad, seed[2] + r[2] + pad],
    },
    resolution: 0.3,
  };
}

/**
 * Substantia nigra pars compacta/reticulata: a crescent band hugging the crus
 * cerebri arc. The arc is SAMPLED from the midbrain envelope's ventral
 * surface: at each station along the crus, march +z→−z for the first solid
 * crossing, then seat the band `inset` au inside that face — compacta deeper
 * (dorsal), reticulata shallower (ventral) and slightly thicker.
 */
function snCrescent(slug, rec, opts) {
  const env = envByKey('ctx-midbrain-surface');
  const scaleXZ = opts.scaleXZ ?? 1; // AMENDMENT-A rescue factor (band thickness)
  const yc = rec.origin3d[1];
  const halfY = rec.size3d[1] * 0.5;
  const tubeR = opts.tubeR * scaleXZ;
  const stations = 7;
  const pts = [];
  let lastFace = opts.fallbackFaceZ;
  for (let i = 0; i < stations; i += 1) {
    const t = i / (stations - 1);
    const x = opts.x0 + (opts.x1 - opts.x0) * t;
    let face = lastFace;
    if (env) {
      for (let z = 12; z > -16; z -= 0.12) {
        if (env(x, yc, z) < 0) { face = z; break; }
      }
    }
    lastFace = face;
    const inset = opts.inset0 + (opts.inset1 - opts.inset0) * t;
    pts.push([x, yc, face - inset]);
  }

  const caps = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const taperA = i === 0 ? 0.8 : 1;
    const taperB = i === pts.length - 2 ? 0.8 : 1;
    caps.push(capsule(
      pts[i][0], pts[i][1], pts[i][2],
      pts[i + 1][0], pts[i + 1][1], pts[i + 1][2],
      tubeR * (taperA + taperB) / 2,
    ));
  }
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 3, frequency: 0.6, lacunarity: 2, gain: 0.5 });
  let field = displace(smoothUnionAll(caps, 0.3), fbm, 0.09);
  field = bilateral(field, true); // built on the +x side; mirrored to −x
  field = clipToEnvelope(field, ['ctx-midbrain-surface']);

  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of pts) {
    zMin = Math.min(zMin, p[2] - tubeR);
    zMax = Math.max(zMax, p[2] + tubeR);
  }
  const pad = tubeR + 1.0;
  return {
    field,
    box: {
      min: [-opts.x1 - pad, yc - halfY - tubeR - 0.8, zMin - pad],
      max: [opts.x1 + pad, yc + halfY + tubeR + 0.8, zMax + pad],
    },
    resolution: 0.19,
  };
}

/* ---------------------------------------------------- thalamic Voronoi cells */

const THALAMIC_SLUGS = RECORDS
  .filter((r) => r.region === 'diencephalon' && r.subdivision === 'Thalamus')
  .map((r) => r.id)
  .sort();

/**
 * Nearest-seed cell field: max over the bisector half-spaces (the plan's
 * "soft Voronoi via SDF min over bisector planes"). Negative inside the cell.
 */
function bisectorCellField(seedIdx, seeds) {
  const mine = seeds[seedIdx];
  const planes = [];
  for (let j = 0; j < seeds.length; j += 1) {
    if (j === seedIdx) continue;
    const other = seeds[j];
    const d = [other[0] - mine[0], other[1] - mine[1], other[2] - mine[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) continue;
    planes.push({
      dx: d[0] / len, dy: d[1] / len, dz: d[2] / len,
      mx: (mine[0] + other[0]) / 2,
      my: (mine[1] + other[1]) / 2,
      mz: (mine[2] + other[2]) / 2,
    });
  }
  return (x, y, z) => {
    let f = -Infinity;
    for (let i = 0; i < planes.length; i += 1) {
      const p = planes[i];
      const v = p.dx * (x - p.mx) + p.dy * (y - p.my) + p.dz * (z - p.mz);
      if (v > f) f = v;
    }
    return f;
  };
}

/**
 * Conservative cell bbox: coarse scan of the cell field over the envelope
 * ROI (step 0.7 au) and tight bbox of the cell∩envelope solid, padded.
 * Robust (no interval algebra), deterministic, and cheap (~40k samples).
 */
function cellBox(seedIdx, seeds, envBox, cellFn, envFn) {
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  const step = 0.7;
  for (let x = envBox.min[0]; x <= envBox.max[0] + 1e-9; x += step) {
    for (let y = envBox.min[1]; y <= envBox.max[1] + 1e-9; y += step) {
      for (let z = envBox.min[2]; z <= envBox.max[2] + 1e-9; z += step) {
        if (cellFn(x, y, z) > 0) continue;
        if (envFn && envFn(x, y, z) > 0) continue;
        for (let a = 0; a < 3; a += 1) {
          const p = [x, y, z][a];
          if (p < lo[a]) lo[a] = p;
          if (p > hi[a]) hi[a] = p;
        }
      }
    }
  }
  if (!Number.isFinite(lo[0])) {
    // Degenerate (seed cell empty in the envelope) — fall back to a small
    // box around the seed so the recipe contract stays valid.
    lo = seeds[seedIdx].slice();
    hi = seeds[seedIdx].slice();
  }
  const pad = 0.9;
  return {
    min: [lo[0] - pad, lo[1] - pad, lo[2] - pad],
    max: [hi[0] + pad, hi[1] + pad, hi[2] + pad],
  };
}

/**
 * One thalamic nucleus = displaced Voronoi cell ∩ thalamic envelope. The cell
 * is built once from the left-side seed set; the right hemiside evaluates the
 * mirrored point (the right envelope is the mirror of the left). The midline
 * seed (x=0) participates in the set, so its mesh is the bilateral pair of
 * medial-rim strips the ±1.2 envelope cut allows.
 */
function thalamicCell(slug, rec) {
  const envL = envByKey('ctx-thalamus-l');
  const envR = envByKey('ctx-thalamus-r');
  if (!envL && !envR) {
    // Fallback: unclipped displaced ellipsoid (sculpt-only mode).
    return displacedEllipsoid(slug, rec, { resolution: 0.34 });
  }
  const seeds = THALAMIC_SLUGS.map((id) => RECORD_BY_ID.get(id).origin3d);
  const seedIdx = THALAMIC_SLUGS.indexOf(slug);
  const cell = bisectorCellField(seedIdx, seeds);
  const fbm = createFbm3(`${slug}/tissue`, { octaves: 3, frequency: 0.45, lacunarity: 2, gain: 0.5 });
  const displaced = displace(cell, fbm, 0.05);
  const clipEnv = envL ?? envR;
  // +0.15 wall skin: clipped faces sit just INSIDE the envelope wall, so the
  // +0.8 containment margin holds even with the voxel-grid sampling error.
  const clipped = smoothIntersect(displaced, (x, y, z) => clipEnv(x, y, z) + 0.15, 0.3);
  // Midline rims keep out of the third-ventricle slit (envelopeGroupsFor
  // attaches the 3V void to nuc-midline-thalamic only).
  const carved = carveVentricles(clipped, envelopeGroupsFor(slug).void);
  const field = (x, y, z) => Math.min(carved(x, y, z), carved(-x, y, z));

  const boxMod = envModuleCache.get('ctx-thalamus-l') ?? envModuleCache.get('ctx-thalamus-r');
  const envBox = (boxMod && typeof boxMod.bbox === 'function')
    ? boxMod.bbox()
    : { min: [1.2, 10, -17], max: [22, 40, 15] };
  // bbox from the raw cell (pre-displacement — displacement adds only ±0.05,
  // inside the pad), constrained to the envelope solid when available. The
  // field always evaluates both ±x (bilateral mesh), so mirror the x reach.
  const raw = cellBox(seedIdx, seeds, envBox, cell, clipEnv);
  const reach = Math.max(Math.abs(raw.min[0]), Math.abs(raw.max[0]));
  // Size-adaptive resolution: big partition chunks stay within the tri
  // budget (tris ∝ res⁻²) while small cells keep enough grid to exist.
  let maxDim = 1;
  for (let a = 0; a < 3; a += 1) maxDim = Math.max(maxDim, raw.max[a] - raw.min[a]);
  const resolution = Math.min(0.9, Math.max(0.52, 0.52 * Math.sqrt(maxDim / 10)));
  return {
    field,
    box: {
      min: [-reach, raw.min[1], raw.min[2]],
      max: [reach, raw.max[1], raw.max[2]],
    },
    resolution,
  };
}

/* ------------------------------------------------------------- family map */

// Elongated sulcus/floor-hugging tubes (plan §6 "cranial-nerve columns" and
// the large reticular formations). The tall columns carry per-slug coarser
// resolutions (tri budget: surface area scales with column length).
const COLUMNS = new Set([
  'nuc-ambiguus', 'nuc-dmv', 'nuc-solitarius-caudal', 'nuc-hypoglossal',
  'nuc-spinal-trigeminal', 'nuc-mesencephalic-v', 'nuc-medullary-reticular',
  'nuc-pontine-reticular',
]);
const COLUMN_RES = {
  'nuc-spinal-trigeminal': 0.5,
  'nuc-medullary-reticular': 0.56,
  'nuc-pontine-reticular': 0.52,
  'nuc-ambiguus': 0.38,
};
// Tiny nuclei need finer grids to read as smooth organic bodies at all.
const FINE_RES = {
  'nuc-pineal-gland': 0.22,
  'nuc-edinger-westphal': 0.2,
  'nuc-trochlear': 0.22,
  'nuc-oculomotor': 0.26,
};
// Thin surface-hugging plaques (4th-ventricle floor / ventral medullary face).
const PLAQUES = new Set(['nuc-locus-coeruleus', 'nuc-area-postrema', 'nuc-arcuate-medullary']);

/**
 * Cheap emptiness probe: a coarse grid over the box must contain at least
 * one point clearly INSIDE the field. Guards the CSF carve — for a few
 * floor nuclei (locus coeruleus, dorsal cochlear) the grown fourth-ventricle
 * cavity fills their whole pocket, and an unconditional carve would bake an
 * EMPTY surface; those fall back to the envelope clip only.
 */
function fieldHasSurface(field, box, samples = 6) {
  for (let i = 0; i <= samples; i += 1) {
    const x = box.min[0] + ((box.max[0] - box.min[0]) * i) / samples;
    for (let j = 0; j <= samples; j += 1) {
      const y = box.min[1] + ((box.max[1] - box.min[1]) * j) / samples;
      for (let k = 0; k <= samples; k += 1) {
        const z = box.min[2] + ((box.max[2] - box.min[2]) * k) / samples;
        if (field(x, y, z) < -0.05) return true;
      }
    }
  }
  return false;
}

function buildRecipe(slug, opts = {}) {
  const rec = RECORD_BY_ID.get(slug);

  const build = (o) => {
    if (rec.region === 'diencephalon' && rec.subdivision === 'Thalamus') {
      return thalamicCell(slug, rec);
    }
    switch (slug) {
      case 'nuc-inferior-olive-principal':
        return olivePurse(slug, rec, o);
      case 'nuc-inferior-olive-medial':
        return olivePlate(slug, rec, o);
      case 'nuc-red-nucleus':
        return redNucleus(slug, rec, o);
      case 'nuc-snc':
        return snCrescent(slug, rec, {
          tubeR: 0.58, inset0: 1.05, inset1: 1.5, x0: 3.1, x1: 9.3,
          fallbackFaceZ: 9.9, ...o,
        });
      case 'nuc-snr':
        return snCrescent(slug, rec, {
          tubeR: 0.68, inset0: 0.55, inset1: 1.0, x0: 3.2, x1: 9.2,
          fallbackFaceZ: 9.9, ...o,
        });
      default:
        break;
    }
    if (COLUMNS.has(slug)) {
      return columnNucleus(slug, rec, COLUMN_RES[slug] ? { resolution: COLUMN_RES[slug], ...o } : o);
    }
    if (PLAQUES.has(slug)) {
      return displacedEllipsoid(slug, rec, { depth: 0.45, flat: 0.72, resolution: 0.3, ...o });
    }
    if (FINE_RES[slug]) {
      return displacedEllipsoid(slug, rec, { resolution: FINE_RES[slug], ...o });
    }
    return displacedEllipsoid(slug, rec, o);
  };

  const built = build(opts);
  // Safe carve: if the CSF carve wiped the whole shape, retry without it
  // (the envelope clip alone still guarantees containment; QA then nudges).
  if (!opts.noCarve && !opts.scaleXZ && !fieldHasSurface(built.field, built.box)) {
    const fallback = build({ ...opts, noCarve: true });
    if (fieldHasSurface(fallback.field, fallback.box)) return fallback;
  }
  return built;
}

/* --------------------------------------------------------- the registry */

/**
 * Measured tri-budget fit (plan §2.7 amendment: nucleus ≤ 60 KB ⇒ ≤ ~2400
 * tris; nuclei total ≤ 200k tris / ≤ 2.5 MB). Analytic resolution guesses
 * undershoot for wavy shapes (Voronoi cells, wobbling columns), so each part
 * is meshed ONCE at construction and its resolution corrected — deterministically —
 * until it fits the per-part cap and the per-slug target band. The stored
 * resolution is what the CLI bakes with, so measurement and bake agree.
 */
const TRI_CAP = 2400;
const TRI_TARGET_DEFAULT = 1300;
const TRI_TARGET_HERO = 2100;
const HERO_BUDGET = new Set([
  'nuc-inferior-olive-principal', 'nuc-snc', 'nuc-snr', 'nuc-red-nucleus',
  'nuc-dentate', 'nuc-pulvinar',
]);
function fitResolution(slug, field, box, startRes) {
  const target = HERO_BUDGET.has(slug) ? TRI_TARGET_HERO : TRI_TARGET_DEFAULT;
  let res = startRes;
  let mesh = surfaceNets(field, box, { resolution: res });
  for (let steps = 0; steps < 5; steps += 1) {
    if (mesh.triCount > TRI_CAP) {
      // hard per-part cap (60 KB GLB) — coarsen, at most ×1.5 per step
      res *= Math.min(1.5, Math.sqrt(mesh.triCount / (TRI_CAP * 0.92)));
    } else if (mesh.triCount > target * 1.3 && res <= 1.0) {
      // payload headroom — only while the grid stays reasonably fine; giant
      // partition cells that would need res > 1 keep the cap-fitted detail
      res *= Math.min(1.35, Math.sqrt(mesh.triCount / target));
    } else if (mesh.triCount < target * 0.55 && res > 0.45) {
      // overshot into coarseness — refine back toward the target band
      res *= Math.max(0.75, Math.sqrt(mesh.triCount / target));
    } else break;
    res = Math.min(2.0, res);
    mesh = surfaceNets(field, box, { resolution: res });
  }
  return { resolution: res, tris: mesh.triCount };
}

export const recipes = RECORDS
  .map((rec) => rec.id)
  .sort()
  .map((slug) => {
    const built = buildRecipe(slug);
    const paired = RECORD_BY_ID.get(slug).laterality === 'paired';
    const box = {
      min: built.box.min.slice(),
      max: built.box.max.slice(),
    };
    if (paired) {
      // Bilateral fields carry both mirrored lobes — extend the box across
      // x so the mesher sees the −x lobe too.
      const reach = Math.max(Math.abs(box.min[0]), Math.abs(box.max[0]));
      box.min[0] = -reach;
      box.max[0] = reach;
    }
    // Measured tri-budget fit (see fitResolution): adjusts meshOpts.resolution
    // so every part bakes inside the per-part cap and the payload budget.
    const fit = fitResolution(slug, built.field, box, built.resolution);
    return {
      slug,
      bbox: () => ({ min: box.min.slice(), max: box.max.slice() }),
      sdf(x, y, z) { return built.field(x, y, z); },
      meshOpts: {
        resolution: fit.resolution,
        kind: 'nucleus',
        materialHint: 'nucleus',
        source: 'sculpt',
      },
      nucleus: true, // CLI flag → bake through the containment-QA path
    };
  });

/** Evidence exemplar `--part nuc-inferior-olive` resolves to the two olivary
 *  complex parts (the taxonomy splits the complex; plan §6 shapes it as one
 *  "inferior olivary complex"). */
export const aliases = {
  'nuc-inferior-olive': ['nuc-inferior-olive-principal', 'nuc-inferior-olive-medial'],
};

export function nucleusSlugs() {
  return recipes.map((r) => r.slug);
}

/* ------------------------------------------------------- containment QA */

export const QA = {
  margin: 0.8,
  maxIterations: 8,
  step: 0.4,
  targetSamples: 200,
  scaleRescue: 1.2 / 0.7, // AMENDMENT A: registered envelopes ≈ 1.7× the schematic v1 ones
};

/**
 * Containment QA + auto-nudge for one baked nucleus mesh (plan §6): sample
 * ~200 surface points; a point is inside when min(relevant envelope SDFs,
 * with CSF cavities negated) ≤ +0.8 au; violators are nudged toward the
 * envelope interior along the SDF gradient (whole-mesh translation, ≤8
 * iterations). Translation keeps normals valid, so the nudged positions can
 * be written without re-meshing — the QA'd samples ARE the baked geometry.
 *
 * AMENDMENT A scale rescue: when violators persist after the nudge budget
 * (v1 size3d authored against the smaller schematic envelopes), the nucleus
 * is REBUILT with size3d scaled ×1.2/0.7 in x/z about origin3d, re-meshed at
 * the recipe resolution, and re-nudged; the returned `mesh` then replaces
 * the baked geometry and `scaled` records the rescue for the report.
 *
 * @param {string} slug nucleus slug
 * @param {{positions: Float32Array, normals: Float32Array, indices: Uint32Array}} mesh
 * @returns {{positions: Float32Array, mesh?: object, nudged: number[],
 *            contained: number, samples: number, inside: number,
 *            iterations: number, envelope: string, scaled: boolean}}
 */
export function qaNucleus(slug, mesh) {
  const groups = envelopeGroupsFor(slug);
  const solid = envUnion(groups.solid);
  const voids = groups.void.map(envByKey).filter(Boolean);
  // Containment value: min over the solid envelopes and the NEGATED cavities
  // (a point inside a ventricle is as much a violator as one outside the wall).
  const containment = (x, y, z) => {
    let c = Infinity;
    if (solid) { const v = solid(x, y, z); if (v < c) c = v; }
    for (const f of voids) { const v = -f(x, y, z); if (v < c) c = v; }
    return solid || voids.length > 0 ? c : 0;
  };
  const hasEnvelopes = Boolean(solid) || voids.length > 0;
  const envelopeLabel = groups.solid.length > 0
    ? groups.solid.join('+') + (groups.void.length > 0 ? ` − ${groups.void.join('+')}` : '')
    : 'none';
  const report = {
    positions: Float32Array.from(mesh.positions),
    nudged: [0, 0, 0],
    contained: 1,
    samples: 0,
    inside: 0,
    iterations: 0,
    envelope: envelopeLabel,
    scaled: false,
  };
  if (!hasEnvelopes) return report; // no envelopes resolvable — nothing to check

  const sampleIdxFor = (positions) => {
    const vc = positions.length / 3;
    const stride = Math.max(1, Math.round(vc / QA.targetSamples));
    const idx = [];
    for (let vi = 0; vi < vc; vi += stride) idx.push(vi);
    return idx;
  };

  /** Translate the whole mesh along the mean violator gradient, ≤8 iters. */
  const nudgePass = (positions) => {
    const sampleIdx = sampleIdxFor(positions);
    let iter = 0;
    let violators = [];
    for (const vi of sampleIdx) {
      const d = containment(positions[3 * vi], positions[3 * vi + 1], positions[3 * vi + 2]);
      if (d >= QA.margin) violators.push(vi);
    }
    while (violators.length > 0 && iter < QA.maxIterations) {
      let gx = 0;
      let gy = 0;
      let gz = 0;
      for (const vi of violators) {
        const g = envGrad(containment, positions[3 * vi], positions[3 * vi + 1], positions[3 * vi + 2]);
        const len = Math.hypot(g[0], g[1], g[2]);
        if (len > 1e-6) {
          gx += g[0] / len;
          gy += g[1] / len;
          gz += g[2] / len;
        }
      }
      const glen = Math.hypot(gx, gy, gz);
      if (glen < 1e-6) break;
      gx /= glen;
      gy /= glen;
      gz /= glen;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] -= gx * QA.step;
        positions[i + 1] -= gy * QA.step;
        positions[i + 2] -= gz * QA.step;
      }
      report.nudged[0] -= gx * QA.step;
      report.nudged[1] -= gy * QA.step;
      report.nudged[2] -= gz * QA.step;
      iter += 1;
      violators = [];
      for (const vi of sampleIdx) {
        const d = containment(positions[3 * vi], positions[3 * vi + 1], positions[3 * vi + 2]);
        if (d >= QA.margin) violators.push(vi);
      }
    }
    report.iterations += iter;
    return sampleIdx;
  };

  let sampleIdx = nudgePass(report.positions);
  if (report.iterations >= QA.maxIterations && !THALAMIC_SLUG_SET.has(slug)) {
    // AMENDMENT A scale rescue: grow size3d x/z by 1.2/0.7 about origin3d
    // (real envelopes are ~1.7× the schematic v1 envelopes), rebuild, re-nudge.
    const rebuilt = rebuildScaled(slug, QA.scaleRescue);
    if (rebuilt) {
      report.positions = Float32Array.from(rebuilt.mesh.positions);
      report.mesh = { ...rebuilt.mesh, positions: report.positions };
      report.scaled = true;
      report.nudged = [0, 0, 0];
      report.iterations = 0;
      sampleIdx = nudgePass(report.positions);
    }
  }

  let inside = 0;
  for (const vi of sampleIdx) {
    const d = containment(report.positions[3 * vi], report.positions[3 * vi + 1], report.positions[3 * vi + 2]);
    if (d < QA.margin) inside += 1;
  }
  report.inside = inside;
  report.samples = sampleIdx.length;
  report.contained = sampleIdx.length > 0 ? inside / sampleIdx.length : 1;
  return report;
}

const THALAMIC_SLUG_SET = new Set(THALAMIC_SLUGS);

/**
 * AMENDMENT-A rescue path: rebuild a nucleus mesh with size3d scaled by
 * `factor` in x/z about origin3d at the recipe resolution. Returns null for
 * thalamic partition cells (defined by the envelope packing, not by size3d)
 * or when the rebuilt surface is empty.
 */
function rebuildScaled(slug, factor) {
  if (THALAMIC_SLUG_SET.has(slug)) return null;
  const built = buildRecipe(slug, { scaleXZ: factor });
  if (!built) return null;
  const paired = RECORD_BY_ID.get(slug)?.laterality === 'paired';
  const box = { min: built.box.min.slice(), max: built.box.max.slice() };
  if (paired) {
    const reach = Math.max(Math.abs(box.min[0]), Math.abs(box.max[0]));
    box.min[0] = -reach;
    box.max[0] = reach;
  }
  const recipe = recipes.find((r) => r.slug === slug);
  const mesh = surfaceNets(built.field, box, {
    resolution: recipe ? recipe.meshOpts.resolution : built.resolution,
  });
  if (mesh.triCount === 0) return null;
  return { mesh };
}
