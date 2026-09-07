#!/usr/bin/env node
/**
 * NeuroAxis v2 — anatomy geometry build CLI (SDF kernel front door).
 *
 * Bakes recipe modules (scripts/anatomy-recipes/*.mjs) into committed GLBs
 * (src/assets/anatomy/<slug>.glb) and upserts src/assets/anatomy/
 * anatomy-manifest.json. Node-only, deterministic, zero dependencies —
 * see docs/GEOMETRY_PIPELINE.md for the author-facing contract.
 *
 * Usage:
 *   node scripts/build-anatomy-geometry.mjs --all           bake every non-demo recipe
 *   node scripts/build-anatomy-geometry.mjs --part <slug>   bake one recipe (demo- allowed)
 *   node scripts/build-anatomy-geometry.mjs --nuclei        bake every nucleus w/ containment QA
 *   node scripts/build-anatomy-geometry.mjs --manifest      rebuild the manifest from the
 *                                    committed GLBs + print the §2.7 budget report
 *   node scripts/build-anatomy-geometry.mjs --selftest      kernel round-trip self-test
 *   node scripts/build-anatomy-geometry.mjs --stats         in-memory stats table, no writes
 *   node scripts/build-anatomy-geometry.mjs --list          list discovered recipes
 *
 * Options:
 *   --resolution <au>   override every recipe's meshOpts.resolution
 *
 * Exit codes: 0 = pass · 1 = failure (bake/validation/self-test/containment) ·
 *             2 = usage error.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';

import { surfaceNets } from './lib/sdf/surfacenets.js';
import { meshReport, formatTable } from './lib/sdf/stats.js';
import { writeGLB } from './lib/sdf/glb.js';

/* ------------------------------------------------------------- CLI setup */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const RECIPES_DIR = join(repoRoot, 'scripts', 'anatomy-recipes');
const OUT_DIR = join(repoRoot, 'src', 'assets', 'anatomy');
const MANIFEST_PATH = join(OUT_DIR, 'anatomy-manifest.json');
const NUCLEI_REPORT_PATH = join(OUT_DIR, 'nuclei-report.json');
const SELFTEST_DIR = join(repoRoot, '.selftest');

const argv = process.argv.slice(2);
const flags = { part: null, resolution: null };
let mode = null;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--all') mode = 'all';
  else if (a === '--part') { mode = 'part'; flags.part = argv[++i] ?? null; }
  else if (a === '--nuclei') mode = 'nuclei';
  else if (a === '--manifest') mode = 'manifest';
  else if (a === '--selftest') mode = 'selftest';
  else if (a === '--stats') mode = 'stats';
  else if (a === '--list') mode = 'list';
  else if (a === '--resolution') flags.resolution = Number(argv[++i]);
  else {
    console.error(`Unknown argument: ${a}\n`);
    printUsage();
    process.exit(2);
  }
}
if (mode === null) { printUsage(); process.exit(2); }
if (flags.resolution !== null && !(flags.resolution > 0 && flags.resolution <= 4)) {
  console.error('--resolution must be a number in (0, 4] au');
  process.exit(2);
}

function printUsage() {
  console.log(`Usage:
  node scripts/build-anatomy-geometry.mjs --all           bake every non-demo recipe
  node scripts/build-anatomy-geometry.mjs --part <slug>   bake one recipe (demo- allowed)
  node scripts/build-anatomy-geometry.mjs --nuclei        bake every nucleus w/ containment QA
  node scripts/build-anatomy-geometry.mjs --manifest      rebuild manifest from committed GLBs + budget report
  node scripts/build-anatomy-geometry.mjs --selftest      kernel round-trip self-test
  node scripts/build-anatomy-geometry.mjs --stats         in-memory stats table, no writes
  node scripts/build-anatomy-geometry.mjs --list          list discovered recipes
Options:
  --resolution <au>   override every recipe's meshOpts.resolution`);
}

const isDemoSlug = (slug) => /^demo-/.test(slug);

/* --------------------------------------------------- nuclei registry API */

/**
 * scripts/anatomy-recipes/nuclei.mjs is a REGISTRY module (one module, one
 * entry per taxonomy nucleus slug) that also carries the containment-QA
 * helpers. Loaded lazily so kernel-only modes still run without it; a null
 * API means the module is missing/broken and nucleus parts fail loudly.
 */
let nucleiApiPromise = null;
function nucleiApi() {
  if (!nucleiApiPromise) {
    nucleiApiPromise = import('./anatomy-recipes/nuclei.mjs').catch(() => null);
  }
  return nucleiApiPromise;
}

/* -------------------------------------------------------- recipe loading */

/**
 * Discover and validate recipe modules. Throws with file + reason on any
 * contract violation (docs/GEOMETRY_PIPELINE.md §recipe contract).
 *
 * Two module shapes are supported:
 *   - single-part recipes: exports slug/bbox/sdf directly (envelope files);
 *   - registry modules (e.g. nuclei.mjs): export `recipes: [...]`, where
 *     every entry carries the same contract and is validated/flattened.
 */
async function loadRecipes() {
  if (!existsSync(RECIPES_DIR)) return [];
  const files = readdirSync(RECIPES_DIR).filter((f) => f.endsWith('.mjs')).sort();
  const recipes = [];
  for (const file of files) {
    const path = join(RECIPES_DIR, file);
    const mod = await import(pathToFileURL(path).href);
    if (Array.isArray(mod.recipes)) {
      for (const entry of mod.recipes) {
        validateRecipe(entry, `${file}#${entry.slug ?? '<missing slug>'}`);
        recipes.push({ mod: entry, file: `${file}#${entry.slug}`, slug: entry.slug });
      }
    } else {
      validateRecipe(mod, file);
      recipes.push({ mod, file, slug: mod.slug });
    }
  }
  const seen = new Set();
  for (const r of recipes) {
    if (seen.has(r.slug)) throw new Error(`duplicate recipe slug "${r.slug}" in ${r.file}`);
    seen.add(r.slug);
  }
  return recipes;
}

function validateRecipe(mod, file) {
  const fail = (msg) => { throw new Error(`recipe ${file}: ${msg}`); };
  if (typeof mod.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(mod.slug)) {
    fail(`export const slug must be a lowercase kebab string (got ${JSON.stringify(mod.slug)})`);
  }
  if (typeof mod.bbox !== 'function') fail('export function bbox() is required');
  if (typeof mod.sdf !== 'function') fail('export function sdf(x, y, z) is required');
  const box = mod.bbox();
  if (!box || !Array.isArray(box.min) || !Array.isArray(box.max)
    || box.min.length !== 3 || box.max.length !== 3
    || !box.min.every(Number.isFinite) || !box.max.every(Number.isFinite)) {
    fail('bbox() must return { min: [x,y,z], max: [x,y,z] } with finite numbers');
  }
  for (let a = 0; a < 3; a += 1) {
    if (box.max[a] <= box.min[a]) fail(`bbox max[${a}] must be > min[${a}]`);
  }
  // Spot-check the field: center + two opposite corners must be finite.
  const cx = (box.min[0] + box.max[0]) / 2;
  const cy = (box.min[1] + box.max[1]) / 2;
  const cz = (box.min[2] + box.max[2]) / 2;
  for (const [px, py, pz] of [[cx, cy, cz], box.min, box.max]) {
    const d = mod.sdf(px, py, pz);
    if (!Number.isFinite(d)) fail(`sdf(${px}, ${py}, ${pz}) must return a finite number`);
  }
  if (mod.meshOpts !== undefined) {
    const m = mod.meshOpts;
    if (typeof m !== 'object' || m === null) fail('meshOpts must be an object when present');
    if (m.resolution !== undefined && !(typeof m.resolution === 'number' && m.resolution > 0)) {
      fail('meshOpts.resolution must be a positive number');
    }
    if (m.kind !== undefined && typeof m.kind !== 'string') fail('meshOpts.kind must be a string');
    if (m.materialHint !== undefined && typeof m.materialHint !== 'string') {
      fail('meshOpts.materialHint must be a string');
    }
    if (m.source !== undefined && !['sculpt', 'bp3d+sculpt'].includes(m.source)) {
      fail('meshOpts.source must be "sculpt" or "bp3d+sculpt"');
    }
  }
}

/* -------------------------------------------------------------- baking */

/**
 * Mesh one recipe in memory. Nucleus entries (registry flag `nucleus: true`)
 * additionally run the plan §6 containment QA: ~200 surface samples vs the
 * region envelopes (margin +0.8 au) and auto-nudge of violators along the
 * SDF gradient (≤8 iterations). The nudged positions ARE the baked geometry.
 * @returns {object} { mesh, report, resolution, elapsedMs, qa }
 */
async function bakeInMemory(recipe, resolutionOverride) {
  const box = recipe.mod.bbox();
  const m = recipe.mod.meshOpts ?? {};
  const resolution = resolutionOverride ?? m.resolution ?? 0.35;
  const t0 = Date.now();
  let mesh = surfaceNets(recipe.mod.sdf, box, { resolution });
  const elapsedMs = Date.now() - t0;
  if (mesh.triCount === 0) {
    throw new Error(`recipe ${recipe.slug}: surface is empty inside bbox() — ` +
      'check the field sign convention (negative inside) and the bbox');
  }
  let qa = null;
  if (recipe.mod.nucleus === true) {
    const api = await nucleiApi();
    if (!api || typeof api.qaNucleus !== 'function') {
      throw new Error('nucleus recipe but scripts/anatomy-recipes/nuclei.mjs QA helpers unavailable');
    }
    qa = api.qaNucleus(recipe.slug, mesh);
    // QA translates the mesh (normals stay valid); when the AMENDMENT-A
    // scale rescue rebuilds the geometry, qa.mesh replaces the whole mesh.
    mesh = qa.mesh ?? { ...mesh, positions: qa.positions };
  }
  const report = meshReport(mesh.positions, mesh.indices);
  return { mesh, report, resolution, elapsedMs, qa };
}

/** Serialize + write a GLB and return its byte size. */
function writeGlbFile(slug, mesh) {
  const bytes = writeGLB(mesh, { name: slug, generator: 'scripts/build-anatomy-geometry.mjs (NeuroAxis SDF kernel)' });
  // Demo slugs are never committed assets — their GLBs go to .selftest/.
  const path = join(isDemoSlug(slug) ? SELFTEST_DIR : OUT_DIR, `${slug}.glb`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { path, bytes: bytes.byteLength };
}

/**
 * Upsert manifest entries by slug, preserving other entries untouched.
 * Demo slugs never touch the manifest (they are not committed assets).
 */
function upsertManifest(entries) {
  const committable = entries.filter((e) => !isDemoSlug(e.slug));
  if (committable.length === 0) return false;
  let manifest = { version: 2, generatedBy: 'scripts/build-anatomy-geometry.mjs', parts: [] };
  if (existsSync(MANIFEST_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
      if (parsed && Array.isArray(parsed.parts)) manifest = { ...manifest, ...parsed };
    } catch {
      console.warn(`warn: could not parse existing manifest at ${MANIFEST_PATH}; recreating it`);
    }
  }
  const bySlug = new Map(manifest.parts.map((p) => [p.slug, p]));
  for (const e of committable) bySlug.set(e.slug, e);
  manifest.version = 2;
  manifest.generatedBy = 'scripts/build-anatomy-geometry.mjs';
  manifest.parts = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  return true;
}

/** Bake + write + manifest-upsert one recipe. Returns a result row. */
async function bakeAndWrite(recipe, resolutionOverride) {
  const { mesh, report, resolution, elapsedMs, qa } = await bakeInMemory(recipe, resolutionOverride);
  const m = recipe.mod.meshOpts ?? {};
  const { path, bytes } = writeGlbFile(recipe.slug, mesh);
  const manifestUpdated = upsertManifest([{
    slug: recipe.slug,
    file: `${recipe.slug}.glb`,
    kind: m.kind ?? 'context',
    source: m.source ?? 'sculpt',
    materialHint: m.materialHint ?? 'context',
    triCount: mesh.triCount,
    centroid: report.centroid.map((v) => Number(v.toFixed(3))),
    bbox: {
      min: report.bbox.min.map((v) => Number(v.toFixed(3))),
      max: report.bbox.max.map((v) => Number(v.toFixed(3))),
    },
  }]);
  return { recipe, mesh, report, resolution, elapsedMs, qa, path, bytes, manifestUpdated };
}

/* --------------------------------------------------- nuclei QA reporting */

/**
 * Per-slug upsert into src/assets/anatomy/nuclei-report.json — the plan §6
 * containment record: { "<slug>": { tris, contained, nudged, samples,
 * envelope, scaled } } plus an "overall" block (pooled contained fraction,
 * gate check, tri/payload totals), sorted by slug. Rows are produced by the
 * nucleus QA bake path; other slugs' entries are preserved.
 */
function upsertNucleiReport(rows) {
  if (rows.length === 0) return false;
  let map = {};
  if (existsSync(NUCLEI_REPORT_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(NUCLEI_REPORT_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) map = parsed;
    } catch {
      console.warn(`warn: could not parse existing nuclei report at ${NUCLEI_REPORT_PATH}; recreating it`);
    }
  }
  for (const row of rows) {
    map[row.slug] = {
      tris: row.tris,
      contained: Number(row.contained.toFixed(4)),
      nudged: row.nudged.map((v) => Number(v.toFixed(3))),
      scaled: row.scaled === true,
      samples: row.samples,
      envelope: row.envelope,
    };
  }
  const sorted = Object.fromEntries(
    Object.entries(map).filter(([k]) => k !== 'overall').sort(([a], [b]) => a.localeCompare(b)),
  );
  // Explicit overall block (task contract: pooled contained fraction ≥ 0.98)
  // computed over EVERY reported slug, not just this run's rows.
  let overall = {
    generatedBy: 'scripts/build-anatomy-geometry.mjs + scripts/anatomy-recipes/nuclei.mjs (task nuclei-organic-v2b)',
    marginAu: 0.8,
    samplesPerNucleus: '~200 surface points',
    nuclei: 0,
    contained: 1,
    totalTris: 0,
    nudgedCount: 0,
    scaledCount: 0,
    scaleRescue: 'AMENDMENT A: size3d x/z × (1.2/0.7) about origin3d when nudging cannot contain a nucleus',
    gate: CONTAINMENT_GATE,
  };
  let samples = 0;
  let inside = 0;
  let tris = 0;
  for (const entry of Object.values(sorted)) {
    overall.nuclei += 1;
    const s = entry.samples ?? 0;
    samples += s;
    inside += Math.round((entry.contained ?? 1) * s);
    tris += entry.tris ?? 0;
    if ((entry.nudged ?? []).some((v) => v !== 0)) overall.nudgedCount += 1;
    if (entry.scaled) overall.scaledCount += 1;
  }
  overall.contained = samples > 0 ? Number((inside / samples).toFixed(4)) : 1;
  overall.totalTris = tris;
  sorted.overall = overall;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(NUCLEI_REPORT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  return true;
}

const CONTAINMENT_GATE = 0.98; // plan §6: overall contained fraction ≥ 98%

function nucleiSummaryText() {
  const lines = [];
  if (!existsSync(NUCLEI_REPORT_PATH)) {
    lines.push('nuclei: no src/assets/anatomy/nuclei-report.json yet — bake with --nuclei (or any --part <nucleus-slug>)');
    return lines;
  }
  let report;
  try {
    report = JSON.parse(readFileSync(NUCLEI_REPORT_PATH, 'utf8'));
  } catch {
    lines.push(`nuclei: report at ${NUCLEI_REPORT_PATH} is not valid JSON`);
    return lines;
  }
  const slugs = Object.keys(report).filter((k) => k !== 'overall');
  let tris = 0;
  let samples = 0;
  let inside = 0;
  let nudged = 0;
  let minContained = 1;
  for (const slug of slugs) {
    const row = report[slug] ?? {};
    tris += row.tris ?? 0;
    const s = row.samples ?? 0;
    samples += s;
    inside += Math.round((row.contained ?? 1) * s);
    if ((row.nudged ?? [0, 0, 0]).some((v) => v !== 0)) nudged += 1;
    if (typeof row.contained === 'number') minContained = Math.min(minContained, row.contained);
  }
  const pooled = samples > 0 ? inside / samples : 1;
  let payload = 0;
  let manifestNuclei = 0;
  if (existsSync(MANIFEST_PATH)) {
    try {
      const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
      for (const part of manifest.parts ?? []) {
        if (part.kind !== 'nucleus') continue;
        manifestNuclei += 1;
        const glb = join(OUT_DIR, part.file ?? '');
        if (part.file && existsSync(glb)) payload += statSync(glb).size;
      }
    } catch { /* manifest summary is best-effort */ }
  }
  lines.push('== nuclei summary (REALISM_PLAN §6 containment QA) ==');
  lines.push(`  parts        ${slugs.length} reported / ${manifestNuclei} in manifest`);
  lines.push(`  triangles    ${tris.toLocaleString('en-US')} (budget ≤ 200k)`);
  lines.push(`  glb payload  ${(payload / 1024).toFixed(0)} KiB (nuclei kind parts)`);
  lines.push(`  contained    pooled ${(pooled * 100).toFixed(2)}% · min per-nucleus ${(minContained * 100).toFixed(2)}% (margin +0.8 au, ${slugs.length ? '~200 surface pts each' : 'no samples'})`);
  lines.push(`  nudged       ${nudged}/${slugs.length} part(s) auto-nudged onto envelope interiors`);
  lines.push(`  gate         pooled containment ≥ ${CONTAINMENT_GATE * 100}% → ${(pooled >= CONTAINMENT_GATE ? 'PASS' : 'FAIL')}`);
  return lines;
}

function printNucleiSummary() {
  for (const line of nucleiSummaryText()) console.log(line);
}

function printBakeTable(results) {
  const rows = results.map((r) => [
    r.recipe.slug,
    r.mesh.triCount,
    r.mesh.vertexCount,
    `${r.resolution.toFixed(2)}`,
    `${(r.elapsedMs / 1000).toFixed(1)}s`,
    `${(r.bytes / 1024).toFixed(0)} KiB`,
    fmtRatio(r.report.edgeManifoldRatio),
    fmtRatio(r.report.degenerateFaceRatio),
  ]);
  console.log(formatTable(
    ['slug', 'tris', 'verts', 'res', 'bake', 'glb', 'manifold', 'degenerate'],
    rows,
  ));
}

const fmtRatio = (v) => v.toFixed(4);

/* --------------------------------------------------- tiny GLB read-back */

/**
 * Minimal GLB reader for the self-test (NO three import — parses the
 * binary straight per the glTF 2.0 container spec). Returns the decoded
 * mesh plus the parsed JSON chunk.
 */
function readGLB(bytes) {
  const assert = (cond, msg) => { if (!cond) throw new Error(`readGLB: ${msg}`); };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert(bytes.byteLength >= 20, 'file too small');
  assert(dv.getUint32(0, true) === 0x46546c67, 'bad magic (expected "glTF")');
  assert(dv.getUint32(4, true) === 2, 'bad version (expected 2)');
  const total = dv.getUint32(8, true);
  assert(total === bytes.byteLength, `header length ${total} != file length ${bytes.byteLength}`);

  let o = 12;
  const jsonLen = dv.getUint32(o, true);
  assert(dv.getUint32(o + 4, true) === 0x4e4f534a, 'first chunk is not JSON');
  assert(jsonLen % 4 === 0, 'JSON chunk length not 4-byte aligned');
  const json = JSON.parse(new TextDecoder().decode(
    bytes.subarray(o + 8, o + 8 + jsonLen),
  ));
  o += 8 + jsonLen;

  assert(o + 8 <= bytes.byteLength, 'missing BIN chunk');
  const binLen = dv.getUint32(o, true);
  assert(dv.getUint32(o + 4, true) === 0x004e4942, 'second chunk is not BIN');
  assert(binLen % 4 === 0, 'BIN chunk length not 4-byte aligned');
  const binStart = o + 8;
  assert(binStart + binLen === bytes.byteLength, 'BIN chunk does not end at file end');
  const bin = bytes.subarray(binStart, binStart + binLen);
  assert(json.buffers[0].byteLength === binLen, 'buffers[0].byteLength != BIN chunk length');

  const prim = json.meshes[0].primitives[0];
  // All components are 4-byte scalars: float32 for VEC3 attributes,
  // uint32 for the index buffer (the writer's documented limits).
  const viewRange = (attrName) => {
    const accIndex = attrName === 'indices' ? prim.indices : prim.attributes[attrName];
    const acc = json.accessors[accIndex];
    const view = json.bufferViews[acc.bufferView];
    const comps = acc.type === 'VEC3' ? 3 : 1;
    const len = acc.count * 4 * comps;
    const start = view.byteOffset ?? 0;
    assert(start % 4 === 0, `bufferView ${acc.bufferView} not 4-byte aligned`);
    assert(start + len <= bin.byteLength, `bufferView ${acc.bufferView} exceeds BIN chunk`);
    return { start, len };
  };
  const pos = viewRange('POSITION');
  const nrm = viewRange('NORMAL');
  const idx = viewRange('indices');
  assert(bin.byteOffset % 4 === 0, 'BIN chunk not 4-byte aligned in file');
  const positions = new Float32Array(bin.buffer, bin.byteOffset + pos.start, pos.len / 4);
  const normals = new Float32Array(bin.buffer, bin.byteOffset + nrm.start, nrm.len / 4);
  const indices = new Uint32Array(bin.buffer, bin.byteOffset + idx.start, idx.len / 4);
  return { json, positions, normals, indices };
}

/* ------------------------------------------------------------ manifest */

/**
 * Perf budgets (REALISM_PLAN §2 constraint 7, AMENDMENT A revision — the
 * binding integration gate): total rendered tris, committed GLB payload, and
 * per-kind part caps. `--manifest` prints a report against these and exits 1
 * when any is exceeded.
 */
const BUDGETS = {
  totalTris: 700_000,
  totalBytes: 8 * 1024 * 1024,
  partBytes: { context: 1.5 * 1024 * 1024, nucleus: 60 * 1024, ventricle: 0.8 * 1024 * 1024 },
  nucleusTotalBytes: 2.5 * 1024 * 1024,
};

const round3 = (v) => Number(v.toFixed(3));

/**
 * Rebuild src/assets/anatomy/anatomy-manifest.json from DISK TRUTH
 * (integration-v2): every committed non-demo GLB is parsed (structure +
 * triCount + centroid + bbox straight from the binary) and merged with the
 * recipe metadata (kind/source/materialHint from meshOpts). Manifest entries
 * whose GLB is missing are dropped with a warning; pre-existing entries
 * without a recipe are preserved as-is while their GLB exists. Finishes with
 * the §2.7 budget report; exit 0 = within budget, 1 = violation (or a
 * malformed GLB).
 */
async function runManifest() {
  const recipes = await loadRecipes();
  let manifest = { version: 2, generatedBy: 'scripts/build-anatomy-geometry.mjs', parts: [] };
  if (existsSync(MANIFEST_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
      if (parsed && Array.isArray(parsed.parts)) manifest = { ...manifest, ...parsed };
    } catch {
      console.warn(`warn: could not parse existing manifest at ${MANIFEST_PATH}; recreating it`);
    }
  }
  const bySlug = new Map(manifest.parts.map((p) => [p.slug, p]));
  // Drop entries whose GLB vanished (manifest must describe committed assets).
  const dropped = [];
  for (const [slug] of bySlug) {
    if (!existsSync(join(OUT_DIR, `${slug}.glb`))) {
      bySlug.delete(slug);
      dropped.push(slug);
    }
  }

  console.log(`\n== verifying ${recipes.length} recipe module(s) against src/assets/anatomy/ ==`);
  const rows = [];
  const malformed = [];
  let bakedCount = 0;
  for (const recipe of recipes) {
    if (isDemoSlug(recipe.slug)) continue;
    const m = recipe.mod.meshOpts ?? {};
    const glbPath = join(OUT_DIR, `${recipe.slug}.glb`);
    if (!existsSync(glbPath)) {
      console.warn(`  warn ${recipe.slug}: no committed GLB — manifest entry skipped`);
      continue;
    }
    const bytes = readFileSync(glbPath);
    let parsed;
    try {
      parsed = readGLB(bytes);
    } catch (err) {
      malformed.push(recipe.slug);
      console.error(`  FAIL ${recipe.slug}: malformed GLB — ${err.message}`);
      continue;
    }
    const positions = parsed.positions;
    let sx = 0; let sy = 0; let sz = 0;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]; const y = positions[i + 1]; const z = positions[i + 2];
      sx += x; sy += y; sz += z;
      if (x < min[0]) min[0] = x;
      if (x > max[0]) max[0] = x;
      if (y < min[1]) min[1] = y;
      if (y > max[1]) max[1] = y;
      if (z < min[2]) min[2] = z;
      if (z > max[2]) max[2] = z;
    }
    const n = positions.length / 3;
    bySlug.set(recipe.slug, {
      slug: recipe.slug,
      file: `${recipe.slug}.glb`,
      kind: m.kind ?? 'context',
      source: m.source ?? 'sculpt',
      materialHint: m.materialHint ?? 'context',
      triCount: parsed.indices.length / 3,
      centroid: [sx / n, sy / n, sz / n].map(round3),
      bbox: { min: min.map(round3), max: max.map(round3) },
    });
    rows.push([recipe.slug, parsed.indices.length / 3, n, `${(bytes.byteLength / 1024).toFixed(0)} KiB`]);
    bakedCount += 1;
  }

  manifest.version = 2;
  manifest.generatedBy = 'scripts/build-anatomy-geometry.mjs';
  manifest.parts = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest rebuilt from ${bakedCount} committed GLB(s): ${MANIFEST_PATH}`);
  if (dropped.length > 0) {
    console.warn(`dropped ${dropped.length} manifest entr(y/ies) with no GLB on disk: ${dropped.join(', ')}`);
  }
  if (rows.length > 0) {
    console.log(`\n${formatTable(['slug', 'tris', 'verts', 'glb'], rows)}`);
  }

  /* --------------------------------------------------- budget report */
  let totalTris = 0;
  let totalBytes = 0;
  let nucleusBytes = 0;
  const kindCount = {};
  const violations = [];
  for (const part of manifest.parts) {
    kindCount[part.kind] = (kindCount[part.kind] ?? 0) + 1;
    const size = statSync(join(OUT_DIR, part.file)).size;
    totalTris += part.triCount;
    totalBytes += size;
    if (part.kind === 'nucleus') nucleusBytes += size;
    const cap = BUDGETS.partBytes[part.kind];
    if (cap !== undefined && size > cap) {
      violations.push(`${part.slug}: ${size} B > ${part.kind} cap ${cap} B`);
    }
  }
  const fmtMiB = (b) => `${(b / (1024 * 1024)).toFixed(2)} MiB`;
  const pass = (ok) => (ok ? 'PASS' : 'FAIL');
  console.log('\n== anatomy budget report (REALISM_PLAN §2.7, AMENDMENT A revision) ==');
  console.log(`  parts        ${manifest.parts.length} (${Object.entries(kindCount).map(([k, v]) => `${k} ${v}`).join(' · ')})`);
  console.log(`  triangles    ${totalTris.toLocaleString('en-US')} / ≤ ${BUDGETS.totalTris.toLocaleString('en-US')}  → ${pass(totalTris <= BUDGETS.totalTris)}`);
  console.log(`  glb payload  ${totalBytes.toLocaleString('en-US')} B (${fmtMiB(totalBytes)}) / ≤ ${fmtMiB(BUDGETS.totalBytes)}  → ${pass(totalBytes <= BUDGETS.totalBytes)}`);
  console.log(`  nuclei total ${fmtMiB(nucleusBytes)} / ≤ ${fmtMiB(BUDGETS.nucleusTotalBytes)}  → ${pass(nucleusBytes <= BUDGETS.nucleusTotalBytes)}`);
  console.log(`  per-part     context ≤ ${fmtMiB(BUDGETS.partBytes.context)} · csf ≤ ${fmtMiB(BUDGETS.partBytes.ventricle)} · nucleus ≤ ${fmtMiB(BUDGETS.partBytes.nucleus)} → ${pass(violations.length === 0)}`);
  for (const v of violations) console.error(`    over budget: ${v}`);
  if (malformed.length > 0) {
    console.error(`\nMANIFEST FAILED — ${malformed.length} malformed GLB(s): ${malformed.join(', ')}`);
    process.exit(1);
  }
  if (totalTris > BUDGETS.totalTris || totalBytes > BUDGETS.totalBytes
    || nucleusBytes > BUDGETS.nucleusTotalBytes || violations.length > 0) {
    console.error('\nBUDGET NOT MET — re-bake the worst offenders coarser, e.g.');
    console.error('  node scripts/build-anatomy-geometry.mjs --part <slug> --resolution <au>');
    process.exit(1);
  }
  console.log('\nMANIFEST + BUDGET PASS');
  process.exit(0);
}

/* ------------------------------------------------------------ selftest */

/** The two selftest SDFs: a noise-displaced ellipsoid + a smooth-union. */
async function selftestParts() {
  const demoRecipe = (await loadRecipes()).find((r) => r.slug === 'demo-ellipsoid');
  if (!demoRecipe) {
    throw new Error('selftest requires scripts/anatomy-recipes/demo-ellipsoid.mjs');
  }
  const noiseEllipsoid = () => bakeInMemory(demoRecipe, undefined);

  // Smooth-union of primitives (sphere ∪ roundbox, minus a capsule bore,
  // plus a cone frustum) — exercises primitives + smooth ops + subtract.
  const { sphere, roundBox, capsule, cappedConeY, smoothUnion, smoothSubtract, translate } =
    await import('./lib/sdf/sdf.js');
  const f = smoothUnion(sphere(5.5), roundBox(4.5, 6.5, 3.5, 1.2), 2.0);
  const g = smoothSubtract(f, capsule(0, -10, 0, 0, 10, 0, 1.6), 1.2);
  const h = smoothUnion(g, translate(cappedConeY(4, 3.4, 1.6), 0, -5.5, 0), 1.5);
  const smoothUnionPart = () => bakeInMemory({
    slug: 'demo-smooth-union',
    mod: {
      slug: 'demo-smooth-union',
      bbox: () => ({ min: [-9, -12, -9], max: [9, 10, 9] }),
      sdf: h,
      meshOpts: { resolution: 0.35 },
    },
    file: '<inline>',
  }, undefined);

  return [
    { name: 'demo-noise-ellipsoid', bake: noiseEllipsoid },
    { name: 'demo-smooth-union', bake: smoothUnionPart },
  ];
}

async function runSelftest() {
  console.log('== NeuroAxis SDF kernel self-test ==\n');
  mkdirSync(SELFTEST_DIR, { recursive: true });
  const failures = [];
  const check = (name, cond, detail = '') => {
    if (cond) {
      console.log(`  ok   ${name}${detail ? ` — ${detail}` : ''}`);
    } else {
      console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
      failures.push(name);
    }
  };

  const parts = await selftestParts();
  const tableRows = [];

  for (const part of parts) {
    console.log(`\n[${part.name}]`);
    let baked;
    try {
      baked = await part.bake();
    } catch (err) {
      check('bake', false, err.message);
      continue;
    }
    const { mesh, report } = baked;

    // 1. bake -> .selftest/<name>.glb
    const glbPath = join(SELFTEST_DIR, `${part.name}.glb`);
    const bytes = writeGLB(mesh, { name: part.name, generator: 'scripts/build-anatomy-geometry.mjs --selftest' });
    writeFileSync(glbPath, bytes);
    check('bake + write GLB', true, `${mesh.triCount} tris -> ${glbPath}`);

    // 2. re-read the binary back and assert structure + counts
    try {
      const read = readGLB(bytes);
      check('GLB header/chunks/alignment', true,
        `json=${read.json.accessors.length} accessors, bin=${read.json.buffers[0].byteLength}B`);
      check('vertex count matches', read.positions.length / 3 === mesh.vertexCount,
        `${read.positions.length / 3} vs ${mesh.vertexCount}`);
      check('normal count matches', read.normals.length === read.positions.length);
      check('index count matches', read.indices.length === mesh.triCount * 3,
        `${read.indices.length} vs ${mesh.triCount * 3}`);
      const vc = read.positions.length / 3;
      let idxOk = true;
      for (let i = 0; i < read.indices.length; i += 1) {
        if (read.indices[i] >= vc) { idxOk = false; break; }
      }
      check('indices in range', idxOk);
      let finite = true;
      for (let i = 0; i < read.positions.length; i += 1) {
        if (!Number.isFinite(read.positions[i])) { finite = false; break; }
      }
      check('positions finite', finite);
      let normalsOk = true;
      for (let i = 0; i < read.normals.length; i += 3) {
        const l = Math.hypot(read.normals[i], read.normals[i + 1], read.normals[i + 2]);
        if (!(l > 0.5 && l < 1.5)) { normalsOk = false; break; }
      }
      check('normals normalized', normalsOk);
      const accessorPos = read.json.accessors[read.json.meshes[0].primitives[0].attributes.POSITION];
      const bb = report.bbox;
      const minOk = accessorPos.min.every((v, a) => v >= bb.min[a] - 1e-4 && v <= bb.max[a] + 1e-4);
      const maxOk = accessorPos.max.every((v, a) => v >= bb.min[a] - 1e-4 && v <= bb.max[a] + 1e-4);
      check('accessor min/max inside bbox', minOk && maxOk);
    } catch (err) {
      check('GLB read-back', false, err.message);
    }

    // 3. mesh quality + determinism (bake twice, byte-identical output)
    check('watertight (no boundary/odd edges)', report.watertight.closed === true,
      `boundary=${report.watertight.boundaryEdges} odd=${report.watertight.oddEdges} `
      + `(manifold ${fmtRatio(report.edgeManifoldRatio)})`);
    check('no degenerate faces', report.degenerateFaceRatio <= 0.001,
      fmtRatio(report.degenerateFaceRatio));
    check('outward winding (signed volume > 0)', report.signedVolume > 0,
      `${report.signedVolume.toFixed(0)} au³`);
    const glbOptions = { name: part.name, generator: 'scripts/build-anatomy-geometry.mjs --selftest' };
    try {
      const second = await part.bake();
      const a = writeGLB(second.mesh, glbOptions);
      let same = a.byteLength === bytes.byteLength;
      for (let i = 0; same && i < a.byteLength; i += 1) same = a[i] === bytes[i];
      check('determinism (two bakes byte-identical)', same);
    } catch (err) {
      check('determinism', false, err.message);
    }

    tableRows.push([
      part.name, mesh.triCount, mesh.vertexCount,
      `${report.edgeManifoldRatio.toFixed(4)}`,
      `${report.degenerateFaceRatio.toFixed(4)}`,
      `${report.signedVolume.toFixed(0)}`,
      `${(bytes.byteLength / 1024).toFixed(0)} KiB`,
    ]);
  }

  console.log(`\nstats:\n${formatTable(
    ['part', 'tris', 'verts', 'manifold', 'degenerate', 'volume', 'glb'],
    tableRows,
  )}`);

  if (failures.length > 0) {
    console.error(`\nSELF-TEST FAILED (${failures.length} check(s)):\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log('\nSELF-TEST PASSED');
  process.exit(0);
}

/* --------------------------------------------------------------- modes */

if (mode === 'manifest') {
  await runManifest();
} else if (mode === 'selftest') {
  await runSelftest();
} else {
  const recipes = await loadRecipes();
  console.log(`Found ${recipes.length} recipe module(s) in scripts/anatomy-recipes:`);
  for (const r of recipes) {
    console.log(`  - ${r.slug}${isDemoSlug(r.slug) ? '  (demo: excluded from --all/manifest)' : ''}`);
  }

  if (mode === 'list') {
    process.exit(0);
  }

  if (mode === 'stats') {
    console.log('\n== in-memory stats (no files written) ==\n');
    const selected = flags.part
      ? recipes.filter((r) => r.slug === flags.part)
      : recipes.filter((r) => !isDemoSlug(r.slug));
    if (selected.length === 0) {
      console.error(flags.part ? `No recipe with slug "${flags.part}"` : 'No non-demo recipes found.');
      process.exit(flags.part ? 1 : 0);
    }
    const rows = [];
    let failed = 0;
    for (const r of selected) {
      try {
        const { mesh, report, resolution, elapsedMs, qa } = await bakeInMemory(r, flags.resolution);
        const contain = qa ? ` ${fmtRatio(qa.contained)}` : '';
        rows.push([r.slug, mesh.triCount, mesh.vertexCount, `${resolution.toFixed(2)}`,
          `${(elapsedMs / 1000).toFixed(1)}s`, fmtRatio(report.edgeManifoldRatio),
          fmtRatio(report.degenerateFaceRatio) + contain,
          `${report.bbox.min.map((v) => v.toFixed(1))} .. ${report.bbox.max.map((v) => v.toFixed(1))}`]);
      } catch (err) {
        failed += 1;
        rows.push([r.slug, 'FAIL', '', '', '', '', '', err.message.slice(0, 60)]);
      }
    }
    console.log(formatTable(
      ['slug', 'tris', 'verts', 'res', 'bake', 'manifold', 'degenerate', 'bbox'],
      rows,
    ));
    console.log('');
    printNucleiSummary();
    process.exit(failed > 0 ? 1 : 0);
  }

  if (mode === 'part' || mode === 'all' || mode === 'nuclei') {
    let selected;
    if (mode === 'part') {
      // Registry aliases (e.g. nuc-inferior-olive → the two olivary parts).
      const api = await nucleiApi();
      const names = (api && api.aliases && Array.isArray(api.aliases[flags.part]))
        ? api.aliases[flags.part]
        : [flags.part];
      selected = names
        .map((name) => recipes.find((r) => r.slug === name))
        .filter(Boolean);
      const missing = names.filter((name) => !recipes.some((r) => r.slug === name));
      if (selected.length === 0) {
        console.error(`No recipe with slug "${flags.part}"${missing.length > 0 && missing[0] !== flags.part
          ? ` (alias target(s) missing: ${missing.join(', ')})`
          : ''} (see --list)`);
        process.exit(1);
      }
    } else if (mode === 'nuclei') {
      selected = recipes.filter((r) => r.mod.nucleus === true);
      if (selected.length === 0) {
        console.error('No nucleus recipes found (scripts/anatomy-recipes/nuclei.mjs registry).');
        process.exit(1);
      }
    } else {
      selected = recipes.filter((r) => !isDemoSlug(r.slug));
    }
    if (mode === 'all' && selected.length === 0) {
      console.log('\nNo non-demo recipes to bake yet — envelope/nuclei recipes are authored by'
        + ' the later pipeline tasks (REALISM_PLAN §7). Nothing to do; exiting 0.');
      process.exit(0);
    }
    console.log(`\n== baking ${selected.length} part(s) -> src/assets/anatomy/`
      + ' (demo-* parts -> .selftest/, nucleus parts get containment QA) ==\n');
    mkdirSync(OUT_DIR, { recursive: true });
    const results = [];
    const failures = [];
    for (const r of selected) {
      try {
        results.push(await bakeAndWrite(r, flags.resolution));
        const qa = results[results.length - 1].qa;
        if (qa) {
          console.log(`  nuclei QA ${r.slug}: contained ${(qa.contained * 100).toFixed(1)}%`
            + ` · nudged [${qa.nudged.map((v) => v.toFixed(2)).join(', ')}]`
            + `${qa.scaled ? ' · AMENDMENT-A scaled' : ''}`
            + ` · ${qa.samples} pts vs ${qa.envelope}`);
        }
      } catch (err) {
        failures.push({ slug: r.slug, err });
        console.error(`  FAIL ${r.slug}: ${err.message}`);
      }
    }
    if (results.length > 0) {
      console.log('');
      printBakeTable(results);
      const reportRows = results
        .filter((r) => r.qa)
        .map((r) => ({
          slug: r.recipe.slug,
          tris: r.mesh.triCount,
          contained: r.qa.contained,
          nudged: r.qa.nudged,
          scaled: r.qa.scaled === true,
          samples: r.qa.samples,
          envelope: r.qa.envelope,
        }));
      if (upsertNucleiReport(reportRows)) {
        console.log(`nuclei report upserted: ${NUCLEI_REPORT_PATH}`);
      }
      if (results.some((r) => r.manifestUpdated)) {
        console.log(`manifest upserted: ${MANIFEST_PATH}`);
      } else {
        console.log('\n(demo slugs only — manifest intentionally untouched)');
      }
      console.log('');
      printNucleiSummary();
    }
    if (failures.length > 0) {
      console.error(`\n${failures.length} part(s) FAILED`);
      process.exit(1);
    }
    if (mode === 'nuclei') {
      const summary = nucleiSummaryText().join('\n');
      if (!/→ PASS/.test(summary)) {
        console.error('\nCONTAINMENT GATE NOT MET (pooled contained < 98%) — see nuclei summary above');
        process.exit(1);
      }
    }
    console.log(`\nDONE — ${results.length} part(s) baked.`);
    process.exit(0);
  }
}

