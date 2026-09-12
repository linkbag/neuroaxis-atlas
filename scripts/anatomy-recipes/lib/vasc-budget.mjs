/**
 * scripts/anatomy-recipes/lib/vasc-budget.mjs
 *
 * v8 vasculature/optic bake-budget measurement + the CLI summary block.
 *
 * `measure()` is the instrument the recipe STEP table in
 * `scripts/anatomy-recipes/vasc-parts.mjs` was derived from: it meshes one
 * canonical mesh at a ladder of voxel steps and prints, per step, the tri
 * count, watertightness and the measured extent — so the resolution that lands
 * inside the plan §4.3 caps is a MEASUREMENT, not a guess, and can be re-derived
 * on any machine with:
 *
 *   node scripts/anatomy-recipes/lib/vasc-budget.mjs [--ladder 0.8,1.0,1.2]
 *
 * `summaryText()` is the additive CLI block (same shape as the telencephalon
 * summary) that prints parts / triangles / payload / per-part caps / scene total
 * for the v8 vessel + optic families, reading the committed manifest (disk
 * truth) and never writing.
 *
 * Plan §4.3 caps (docs/NEUROATLAS_V8_PLAN.md): every artery ≤ 2,000 tris, the
 * whole vascular layer ≤ 40,000, every optic-pathway part ≤ 3,000.
 *
 * Plain Node ESM, zero dependencies.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { surfaceNets } from '../../lib/sdf/surfacenets.js';
import { meshReport } from '../../lib/sdf/stats.js';
import { vascRoi, vascSdf, vascSourceStats } from './vasc-common.mjs';

export const ANATOMY_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'assets', 'anatomy',
);
export const VASC_MANIFEST_PATH = join(ANATOMY_DIR, 'anatomy-manifest.json');

/** Per-artery tri cap (plan §4.3). */
export const ARTERY_TRI_CAP = 2_000;
/** Per-optic-pathway-part tri cap (plan §4.3). */
export const OPTIC_TRI_CAP = 3_000;
/** Whole-layer cap: plan §4.3 "~30–60k tris" reported against the brief's ≤40k. */
export const VASCULAR_LAYER_TRI_CAP = 40_000;

/** slug → layer of the v8 vessel/optic family. */
export const VASC_CAPS = {
  // --- cerebral vasculature (plan §1a) ---
  'vasc-internal-carotid-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-internal-carotid-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-vertebral-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-vertebral-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-basilar-artery': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-anterior-cerebral-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-anterior-cerebral-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-anterior-communicating-artery': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Circle of Willis' },
  'vasc-middle-cerebral-artery-m1-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-middle-cerebral-artery-m1-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-middle-cerebral-artery-m2-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-middle-cerebral-artery-m2-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Anterior circulation' },
  'vasc-posterior-communicating-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Circle of Willis' },
  'vasc-posterior-communicating-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Circle of Willis' },
  'vasc-posterior-cerebral-artery-p1-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-posterior-cerebral-artery-p1-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-posterior-cerebral-artery-p2-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-posterior-cerebral-artery-p2-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-superior-cerebellar-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-superior-cerebellar-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-anterior-inferior-cerebellar-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-anterior-inferior-cerebellar-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-posterior-inferior-cerebellar-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-posterior-inferior-cerebellar-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Posterior circulation' },
  'vasc-anterior-choroidal-artery-l': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Deep perforators' },
  'vasc-anterior-choroidal-artery-r': { layer: 'vasculature', cap: ARTERY_TRI_CAP, subdivision: 'Deep perforators' },
  // --- optic pathway (plan §1b) ---
  'tract-optic-nerve-l': { layer: 'optic', cap: OPTIC_TRI_CAP, subdivision: 'Optic pathway' },
  'tract-optic-nerve-r': { layer: 'optic', cap: OPTIC_TRI_CAP, subdivision: 'Optic pathway' },
  'ctx-optic-chiasm-l': { layer: 'optic', cap: OPTIC_TRI_CAP, subdivision: 'Optic pathway' },
  'ctx-optic-chiasm-r': { layer: 'optic', cap: OPTIC_TRI_CAP, subdivision: 'Optic pathway' },
  'tract-optic-tract-l': { layer: 'optic', cap: OPTIC_TRI_CAP, subdivision: 'Optic pathway' },
  'tract-optic-tract-r': { layer: 'optic', cap: OPTIC_TRI_CAP, subdivision: 'Optic pathway' },
};

export const VASC_SLUGS = Object.keys(VASC_CAPS);
export const isVascSlug = (slug) => Object.prototype.hasOwnProperty.call(VASC_CAPS, slug);

/** Read the committed manifest; [] when absent/unreadable. */
export function readVascManifestParts() {
  if (!existsSync(VASC_MANIFEST_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(VASC_MANIFEST_PATH, 'utf8'));
    return Array.isArray(parsed.parts) ? parsed.parts : [];
  } catch {
    return [];
  }
}

/** Committed GLB byte size of a slug (0 when missing). */
export function vascGlbBytes(slug) {
  const path = join(ANATOMY_DIR, `${slug}.glb`);
  return existsSync(path) ? statSync(path).size : 0;
}

/**
 * One row per vessel/optic part: tris, bytes, cap, verdict + the layer totals.
 *
 * @param {Array<{slug:string, triCount:number}>} [overrides] in-memory bake rows
 * @returns {{rows:Array<object>, layerTris:number, vascularTris:number, opticTris:number,
 *   bytes:number, over:Array<object>, missing:Array<object>}}
 */
export function vascRows(overrides) {
  const source = Array.isArray(overrides) && overrides.length > 0
    ? overrides
      .filter((r) => isVascSlug(r.slug))
      .map((r) => ({
        slug: r.slug,
        tris: r.triCount ?? 0,
        bytes: vascGlbBytes(r.slug),
        committed: existsSync(join(ANATOMY_DIR, `${r.slug}.glb`)),
      }))
    : readVascManifestParts()
      .filter((p) => isVascSlug(p.slug))
      .map((p) => ({ slug: p.slug, tris: p.triCount ?? 0, bytes: vascGlbBytes(p.slug), committed: true }));
  const rows = source
    .map((r) => ({ ...r, ...VASC_CAPS[r.slug], ok: r.tris <= VASC_CAPS[r.slug].cap }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const layerTris = (layer) => rows.filter((r) => r.layer === layer).reduce((a, r) => a + r.tris, 0);
  return {
    rows,
    layerTris: rows.reduce((a, r) => a + r.tris, 0),
    vascularTris: layerTris('vasculature'),
    opticTris: layerTris('optic'),
    bytes: rows.reduce((a, r) => a + r.bytes, 0),
    over: rows.filter((r) => !r.ok),
    missing: rows.filter((r) => !r.committed),
  };
}

/**
 * The additive CLI summary block for the v8 vasculature + optic families.
 *
 * @param {object} [opts]
 * @param {Array<{slug:string,triCount:number}>} [opts.overrides] in-memory bakes
 * @param {number} [opts.sceneTris] total scene tris (committed manifest sum)
 * @param {number} [opts.sceneCap] rendered-tri cap
 * @param {string} [opts.sceneNote]
 * @returns {string[]} printable lines
 */
export function vascSummaryText(opts = {}) {
  const s = vascRows(opts.overrides);
  const lines = ['== vasculature + optic summary (NEUROATLAS_V8_PLAN §4.3) =='];
  if (s.rows.length === 0) {
    lines.push('  parts        0 — no vessel/optic recipes baked yet');
    lines.push('  bake with    node scripts/build-anatomy-geometry.mjs --part vasc-basilar-artery');
    return lines;
  }
  const fmt = (b) => `${(b / 1024).toFixed(0)} KiB`;
  const worst = [...s.rows].sort((a, b) => b.tris - a.tris)[0];
  lines.push(`  parts        ${s.rows.length}`
    + ` (vasculature ${s.rows.filter((r) => r.layer === 'vasculature').length}`
    + ` · optic ${s.rows.filter((r) => r.layer === 'optic').length})`);
  lines.push(`  triangles    ${s.layerTris.toLocaleString('en-US')} total`
    + ` · vasculature ${s.vascularTris.toLocaleString('en-US')} / ≤ ${VASCULAR_LAYER_TRI_CAP.toLocaleString('en-US')}`
    + ` → ${s.vascularTris <= VASCULAR_LAYER_TRI_CAP ? 'PASS' : 'FAIL'}`
    + ` · optic ${s.opticTris.toLocaleString('en-US')}`
    + ` · largest ${worst.slug} ${worst.tris.toLocaleString('en-US')}`);
  lines.push(`  glb payload  ${s.bytes.toLocaleString('en-US')} B (${(s.bytes / (1024 * 1024)).toFixed(2)} MiB)`
    + `${s.missing.length > 0 ? ` · ${s.missing.length} part(s) with no committed GLB` : ''}`);
  lines.push(`  tri caps     ${s.over.length === 0 ? 'PASS' : 'FAIL'}`
    + ` (artery ≤ ${ARTERY_TRI_CAP.toLocaleString('en-US')} · optic part ≤ ${OPTIC_TRI_CAP.toLocaleString('en-US')})`);
  for (const row of s.over) lines.push(`    over cap   ${row.slug}: ${row.tris} > ${row.cap}`);
  for (const sub of ['Circle of Willis', 'Anterior circulation', 'Posterior circulation', 'Deep perforators', 'Optic pathway']) {
    const list = s.rows.filter((r) => r.subdivision === sub);
    if (list.length === 0) continue;
    lines.push(`  ${sub.padEnd(26)} ${String(list.length).padStart(2)} part(s)`
      + ` ${list.reduce((a, r) => a + r.tris, 0).toLocaleString('en-US').padStart(7)} tris`
      + `  ${fmt(list.reduce((a, r) => a + r.bytes, 0)).padStart(9)}`);
  }
  if (typeof opts.sceneTris === 'number' && typeof opts.sceneCap === 'number') {
    lines.push(`  scene total  ${opts.sceneTris.toLocaleString('en-US')} / ≤ `
      + `${opts.sceneCap.toLocaleString('en-US')} rendered tris → `
      + `${opts.sceneTris <= opts.sceneCap ? 'PASS' : 'FAIL'}`
      + `${opts.sceneNote ? `  (${opts.sceneNote})` : ''}`);
  }
  return lines;
}

/** Print the block (thin console wrapper). */
export function printVascSummary(opts) {
  for (const line of vascSummaryText(opts)) console.log(line);
}

/* ------------------------------------------------------- measuring tool */

/**
 * Mesh one canonical mesh over a ladder of voxel steps and report the tri
 * count, watertightness, degenerate ratio and measured extent per step.
 *
 * @param {string} name canonical OBJ name
 * @param {number[]} ladder voxel steps in au
 * @returns {Array<object>}
 */
export function measureLadder(name, ladder) {
  const rows = [];
  const src = vascSourceStats(name);
  for (const resolution of ladder) {
    const box = vascRoi(name, Math.max(1.5, 1.5 * resolution));
    const t0 = Date.now();
    let mesh;
    try {
      mesh = surfaceNets(vascSdf(name, { resolution }), box, { resolution });
    } catch (err) {
      rows.push({ name, resolution, error: err.message });
      continue;
    }
    const report = meshReport(mesh.positions, mesh.indices);
    rows.push({
      name,
      sourceVertices: src.vertices,
      sourceFaces: src.faces,
      resolution,
      tris: mesh.triCount,
      verts: mesh.vertexCount,
      closed: report.watertight.closed,
      boundaryEdges: report.watertight.boundaryEdges,
      oddEdges: report.watertight.oddEdges,
      degenerateRatio: report.degenerateFaceRatio,
      elapsedMs: Date.now() - t0,
      bbox: report.bbox.min.map((v, i) => `${v.toFixed(1)}..${report.bbox.max[i].toFixed(1)}`).join(' '),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ CLI */

const DEFAULT_LADDER = [0.7, 0.9, 1.1, 1.3, 1.6];

/** Candidate canonical meshes the v8 vessel/optic recipes draw from. */
export const PROBE_MESHES = [
  // vasculature — the hardest cases first (thinnest tubes, largest trees)
  'vasc-internal-carotid-artery-left',
  'vasc-vertebral-artery-left',
  'vasc-basilar-artery',
  'vasc-anterior-cerebral-artery-left',
  'vasc-anterior-communicating-artery',
  'vasc-middle-cerebral-artery-m1-left',
  'vasc-middle-cerebral-artery-m2-left',
  'vasc-posterior-communicating-artery-left',
  'vasc-posterior-cerebral-artery-p1-left',
  'vasc-posterior-cerebral-artery-p2-left',
  'vasc-superior-cerebellar-artery-left',
  'vasc-anterior-inferior-cerebellar-artery-left',
  'vasc-posterior-inferior-cerebellar-artery-left',
  'vasc-anterior-choroidal-artery-left',
  // optic pathway
  'tract-optic-nerve-left',
  'ctx-optic-chiasm-left',
  'tract-optic-tract-left',
];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.find((a) => a.startsWith('--ladder='));
  const ladder = arg ? arg.slice('--ladder='.length).split(',').map(Number) : DEFAULT_LADDER;
  const only = process.argv.find((a) => a.startsWith('--mesh='));
  const names = only ? [only.slice('--mesh='.length)] : PROBE_MESHES;
  console.log(`== v8 vessel/optic bake-budget ladder (voxel step au → tris) ==`);
  console.log(`   ladder: ${ladder.join(', ')} au · cap: artery ${ARTERY_TRI_CAP} / optic ${OPTIC_TRI_CAP}\n`);
  const header = ['canonical mesh', 'src faces', ...ladder.map((h) => `h=${h}`), 'closed@largest', 'sec'];
  const rows = [];
  for (const name of names) {
    if (!existsSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets-src', 'bp3d', 'canonical', `${name}.obj`))) {
      rows.push([name, 'MISSING', ...ladder.map(() => ''), '', '']);
      continue;
    }
    const measured = measureLadder(name, ladder);
    const byH = new Map(measured.map((r) => [r.resolution, r]));
    const smallest = measured[measured.length - 1];
    rows.push([
      name,
      smallest.sourceFaces,
      ...ladder.map((h) => (byH.get(h)?.tris ?? 'ERR')),
      smallest.error ? `ERR ${smallest.error.slice(0, 24)}` : `${smallest.closed ? 'yes' : `NO(${smallest.boundaryEdges})`}`,
      (measured.reduce((a, r) => a + (r.elapsedMs ?? 0), 0) / 1000).toFixed(1),
    ]);
  }
  const width = (i) => Math.max(...rows.map((r) => String(r[i]).length), header[i].length);
  const w = header.map((_, i) => width(i));
  const line = (cells) => cells.map((c, i) => (i <= 1 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  ');
  console.log(line(header));
  console.log('-'.repeat(w.reduce((a, b) => a + b, 0) + 2 * (w.length - 1)));
  for (const r of rows) console.log(line(r));
}
