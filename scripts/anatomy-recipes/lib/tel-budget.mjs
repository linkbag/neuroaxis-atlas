/**
 * tel-budget — telencephalon summary for the geometry CLI (task tel-geometry,
 * plan §4 item 3/4): part count, triangles, bytes and per-part tri-cap checks
 * for the v7 telencephalon family (cortical ribbon shells + the subcortical
 * parts registry).
 *
 * This module is the ONE place that knows which slugs belong to the
 * telencephalon family and what the plan §4 caps are; the CLI imports it for
 * `--stats`, `--part`/`--all` and `--manifest` and prints its lines. It reads
 * the committed manifest and the committed GLBs (disk truth) and never writes.
 *
 * Plan §4 caps: hemisphere shell ≤ 90k · corpus callosum ≤ 25k · lateral
 * ventricle ≤ 20k · basal ganglia ≤ 8k · hippocampus/amygdala/fornix/choroid
 * ≤ 6k · WM cores ≤ 25k (carried for the payload, not a plan cap).
 *
 * Plain Node ESM, zero dependencies.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ANATOMY_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'assets', 'anatomy',
);
export const TEL_MANIFEST_PATH = join(ANATOMY_DIR, 'anatomy-manifest.json');

/** Slug → the plan §4 tri cap that applies to it. */
export const TEL_TRI_CAPS = {
  'ctx-hemisphere-l': 90_000,
  'ctx-hemisphere-r': 90_000,
  'ctx-corpus-callosum': 25_000,
  'tel-lateral-ventricle-l': 20_000,
  'tel-lateral-ventricle-r': 20_000,
  'ctx-caudate-l': 8_000,
  'ctx-caudate-r': 8_000,
  'ctx-putamen-l': 8_000,
  'ctx-putamen-r': 8_000,
  'ctx-globus-pallidus-l': 8_000,
  'ctx-globus-pallidus-r': 8_000,
  'ctx-hippocampus-l': 6_000,
  'ctx-hippocampus-r': 6_000,
  'ctx-amygdala-l': 6_000,
  'ctx-amygdala-r': 6_000,
  'ctx-fornix-l': 6_000,
  'ctx-fornix-r': 6_000,
  'ctx-fornix-commissure': 6_000,
  'ctx-choroid-plexus-l': 6_000,
  'ctx-choroid-plexus-r': 6_000,
  'tel-white-matter-l': 25_000,
  'tel-white-matter-r': 25_000,
};

/** Subdivision label per slug (matches the plan §3 taxonomy subdivisions). */
export const TEL_SUBDIVISION = {
  'ctx-hemisphere-l': 'Cerebral cortex',
  'ctx-hemisphere-r': 'Cerebral cortex',
  'tel-white-matter-l': 'Telencephalic white matter',
  'tel-white-matter-r': 'Telencephalic white matter',
  'ctx-corpus-callosum': 'Telencephalic white matter',
  'tel-lateral-ventricle-l': 'Lateral ventricles',
  'tel-lateral-ventricle-r': 'Lateral ventricles',
  'ctx-choroid-plexus-l': 'Lateral ventricles',
  'ctx-choroid-plexus-r': 'Lateral ventricles',
  'ctx-caudate-l': 'Basal ganglia',
  'ctx-caudate-r': 'Basal ganglia',
  'ctx-putamen-l': 'Basal ganglia',
  'ctx-putamen-r': 'Basal ganglia',
  'ctx-globus-pallidus-l': 'Basal ganglia',
  'ctx-globus-pallidus-r': 'Basal ganglia',
  'ctx-hippocampus-l': 'Limbic system',
  'ctx-hippocampus-r': 'Limbic system',
  'ctx-amygdala-l': 'Limbic system',
  'ctx-amygdala-r': 'Limbic system',
  'ctx-fornix-l': 'Limbic system',
  'ctx-fornix-r': 'Limbic system',
  'ctx-fornix-commissure': 'Limbic system',
};

/** Every slug in the telencephalon family (the CLI summary's filter). */
export const TEL_SLUGS = Object.keys(TEL_TRI_CAPS);

export const isTelSlug = (slug) => Object.prototype.hasOwnProperty.call(TEL_TRI_CAPS, slug);

/** Read the committed manifest; returns [] when absent/unreadable. */
export function readManifestParts() {
  if (!existsSync(TEL_MANIFEST_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(TEL_MANIFEST_PATH, 'utf8'));
    return Array.isArray(parsed.parts) ? parsed.parts : [];
  } catch {
    return [];
  }
}

/** Committed GLB byte size for a slug (0 when the file is missing). */
export function glbBytes(slug) {
  const path = join(ANATOMY_DIR, `${slug}.glb`);
  return existsSync(path) ? statSync(path).size : 0;
}

/**
 * Telencephalon rows: slug, subdivision, tris, bytes, tri cap, pass flag.
 *
 * @param {Array<{slug:string, triCount:number}>} [overrides] in-memory bake
 *   results (`--stats`); when omitted, the committed manifest + GLBs are read.
 * @returns {Array<{slug:string, subdivision:string, tris:number, bytes:number,
 *   cap:number, ok:boolean, committed:boolean}>}
 */
export function telRows(overrides) {
  if (Array.isArray(overrides) && overrides.length > 0) {
    return overrides
      .filter((row) => isTelSlug(row.slug))
      .map((row) => ({
        slug: row.slug,
        subdivision: TEL_SUBDIVISION[row.slug] ?? 'Telencephalon',
        tris: row.triCount ?? 0,
        bytes: glbBytes(row.slug),
        cap: TEL_TRI_CAPS[row.slug],
        ok: (row.triCount ?? 0) <= TEL_TRI_CAPS[row.slug],
        committed: existsSync(join(ANATOMY_DIR, `${row.slug}.glb`)),
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }
  return readManifestParts()
    .filter((part) => isTelSlug(part.slug))
    .map((part) => ({
      slug: part.slug,
      subdivision: TEL_SUBDIVISION[part.slug] ?? 'Telencephalon',
      tris: part.triCount ?? 0,
      bytes: glbBytes(part.slug),
      cap: TEL_TRI_CAPS[part.slug],
      ok: (part.triCount ?? 0) <= TEL_TRI_CAPS[part.slug],
      committed: true,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Group rows by subdivision, preserving a stable order. */
export function telBySubdivision(rows) {
  const order = ['Cerebral cortex', 'Basal ganglia', 'Limbic system',
    'Lateral ventricles', 'Telencephalic white matter', 'Telencephalon'];
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.subdivision)) groups.set(row.subdivision, []);
    groups.get(row.subdivision).push(row);
  }
  return [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

/**
 * The telencephalon summary block: part count, triangles (with the per-part cap
 * verdict), bytes, the biggest parts and the subdivision breakdown. Additive
 * only — the CLI prints these lines after its existing tables.
 *
 * @param {object} [opts]
 * @param {Array<{slug:string,triCount:number}>} [opts.overrides] in-memory results
 * @param {number} [opts.sceneTris] total scene tris (sum of every manifest part)
 * @param {number} [opts.sceneCap] the rendered-tris cap to compare against
 * @returns {string[]} printable lines
 */
export function telSummaryText(opts = {}) {
  const rows = telRows(opts.overrides);
  const lines = ['== telencephalon summary (TELENCEPHALON_PLAN §4) =='];
  if (rows.length === 0) {
    lines.push('  parts        0 — no telencephalon recipes baked yet');
    lines.push('  bake with    node scripts/build-anatomy-geometry.mjs --part ctx-hemisphere-l');
    return lines;
  }
  const tris = rows.reduce((a, r) => a + r.tris, 0);
  const bytes = rows.reduce((a, r) => a + r.bytes, 0);
  const over = rows.filter((r) => !r.ok);
  const missing = rows.filter((r) => !r.committed);
  const fmt = (b) => `${(b / 1024).toFixed(0)} KiB`;
  lines.push(`  parts        ${rows.length}`);
  lines.push(`  triangles    ${tris.toLocaleString('en-US')} across ${rows.length} part(s)`
    + ` · largest ${rows.reduce((a, r) => Math.max(a, r.tris), 0).toLocaleString('en-US')}`
    + `${over.length === 0 ? '' : ` · ${over.length} over cap`}`);
  lines.push(`  glb payload  ${bytes.toLocaleString('en-US')} B (${(bytes / (1024 * 1024)).toFixed(2)} MiB)`
    + `${missing.length > 0 ? ` · ${missing.length} part(s) with no committed GLB` : ''}`);
  for (const [group, list] of telBySubdivision(rows)) {
    const gt = list.reduce((a, r) => a + r.tris, 0);
    const gb = list.reduce((a, r) => a + r.bytes, 0);
    lines.push(`  ${group.padEnd(26)} ${String(list.length).padStart(2)} part(s)`
      + ` ${gt.toLocaleString('en-US').padStart(8)} tris  ${fmt(gb).padStart(9)}`);
  }
  lines.push(`  tri caps     ${over.length === 0 ? 'PASS' : 'FAIL'}`
    + ` (hemisphere ≤ 90k · corpus callosum ≤ 25k · ventricle ≤ 20k`
    + ` · basal ganglia ≤ 8k · limbic ≤ 6k)`);
  for (const row of over) {
    lines.push(`    over cap   ${row.slug}: ${row.tris} > ${row.cap}`);
  }
  const biggest = [...rows].sort((a, b) => b.tris - a.tris).slice(0, 6);
  lines.push(`  biggest      ${biggest.map((r) => `${r.slug} ${r.tris.toLocaleString('en-US')}`).join(' · ')}`);
  if (typeof opts.sceneTris === 'number' && typeof opts.sceneCap === 'number') {
    // Informational in --stats: the projection mixes committed parts with
    // in-memory bakes, and an uncommitted recipe that is larger than the GLB
    // on disk (an in-flight task's re-bake) would otherwise look like a
    // budget failure that this task cannot fix. The binding scene check is
    // `--manifest`, which reads disk truth.
    lines.push(`  scene total  ${opts.sceneTris.toLocaleString('en-US')} / ≤ `
      + `${opts.sceneCap.toLocaleString('en-US')} rendered tris → `
      + `${opts.sceneTris <= opts.sceneCap ? 'PASS' : 'FAIL'}`
      + `${opts.sceneNote ? `  (${opts.sceneNote})` : ''}`);
  }
  return lines;
}

/** Print the summary block (thin console wrapper for the CLI). */
export function printTelSummary(opts = {}) {
  for (const line of telSummaryText(opts)) console.log(line);
}

/* --------------------------------------------- committed-GLB cross-checks */

/**
 * Compare every committed telencephalon GLB with what its recipe would bake
 * (tri count + bbox) and check the per-part tri/byte caps. This is the "is the
 * committed asset the recipe's output?" gate: without it a recipe can be
 * edited and the stale GLB keeps shipping (the manifest is written by the
 * bake, not verified against it).
 *
 * @param {Array<{slug:string, mod:object}>} recipes the CLI's loaded recipes
 * @param {(recipe:object)=>Promise<{mesh:object, report:object}>} bake bake
 *   helper (the CLI's bakeInMemory bound to no resolution override)
 * @returns {string[]} printable lines; the caller decides the exit code
 */
export async function telVerifyText(recipes, bake) {
  const lines = ['== telencephalon committed-GLB cross-check =='];
  const wanted = recipes.filter((r) => isTelSlug(r.slug));
  if (wanted.length === 0) {
    lines.push('  no telencephalon recipes loaded');
    return lines;
  }
  let failures = 0;
  let tris = 0;
  let bytes = 0;
  for (const recipe of wanted) {
    const cap = TEL_TRI_CAPS[recipe.slug];
    let baked;
    try {
      baked = await bake(recipe);
    } catch (err) {
      lines.push(`  FAIL ${recipe.slug}: bake failed — ${err.message}`);
      failures += 1;
      continue;
    }
    const glbPath = join(ANATOMY_DIR, `${recipe.slug}.glb`);
    if (!existsSync(glbPath)) {
      lines.push(`  FAIL ${recipe.slug}: no committed GLB`);
      failures += 1;
      continue;
    }
    const size = statSync(glbPath).size;
    const triOk = baked.mesh.triCount <= cap;
    const committed = committedTriCount(glbPath);
    const matches = committed === baked.mesh.triCount;
    tris += baked.mesh.triCount;
    bytes += size;
    if (!triOk || !matches) failures += 1;
    lines.push(`  ${triOk && matches ? 'ok  ' : 'FAIL'} ${recipe.slug.padEnd(24)}`
      + ` recipe ${String(baked.mesh.triCount).padStart(6)} tris`
      + ` · committed ${String(committed).padStart(6)}`
      + ` · ${(size / 1024).toFixed(0)} KiB`
      + ` · cap ${cap.toLocaleString('en-US')}`
      + `${matches ? '' : ' · STALE (re-bake with --part)'}`);
  }
  lines.push(`  totals       ${tris.toLocaleString('en-US')} tris · `
    + `${bytes.toLocaleString('en-US')} B (${(bytes / (1024 * 1024)).toFixed(2)} MiB)`
    + ` · ${failures === 0 ? 'ALL MATCH' : `${failures} failure(s)`}`);
  return lines;
}

/**
 * Triangle count of a committed GLB, straight from its binary (no three.js,
 * no dependency on the manifest). Returns -1 when the file is not a readable
 * single-primitive GLB.
 */
export function committedTriCount(glbPath) {
  try {
    const bytes = readFileSync(glbPath);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67) return -1;
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
    const prim = json.meshes?.[0]?.primitives?.[0];
    if (!prim) return -1;
    return (json.accessors[prim.indices]?.count ?? 0) / 3;
  } catch {
    return -1;
  }
}

/* ------------------------------------------------- cortical ribbon checks */

/**
 * Ribbon geometry checks for the two hemisphere shells (plan §1 "dilate the
 * WM SDF by ~3–4 mm ≈ 2.5–3.3 au" + §4 tri caps):
 *
 *  - measured cortical thickness = the span between the ribbon's inner and
 *    outer sheets, recovered per vertex along the WM field gradient (target
 *    window 2.5–3.3 au = 3.0–4.0 mm);
 *  - tri cap per shell;
 *  - watertightness (a shell with boundary edges would leak under the
 *    translucent material and break the section contour fill);
 *  - pial extent in canonical au, so the AMENDMENT B bound can be checked.
 *
 * @param {Array<{side:'left'|'right', slug:string, mesh:object, report:object,
 *   thickness:object}>} shells
 * @returns {string[]} printable lines
 */
export function telRibbonCheckText(shells) {
  const lines = ['== cortical ribbon checks (TELENCEPHALON_PLAN §1/§4) =='];
  for (const shell of shells) {
    const box = shell.report.bbox;
    const th = shell.thickness ?? null;
    const wt = shell.report.watertight ?? { closed: false, boundaryEdges: -1, oddEdges: -1 };
    const cap = TEL_TRI_CAPS[shell.slug] ?? 90_000;
    const inWindow = th !== null
      && th.thicknessAu >= 2.5 && th.thicknessAu <= 3.3;
    lines.push(`  ${shell.slug}: ${shell.mesh.triCount.toLocaleString('en-US')} tris`
      + ` (cap ${cap.toLocaleString('en-US')} → ${shell.mesh.triCount <= cap ? 'PASS' : 'FAIL'})`
      + ` · watertight ${wt.closed ? 'yes' : `NO (${wt.boundaryEdges} boundary edges)`}`);
    lines.push(`    thickness   ${th === null ? 'not measured'
      : `${th.thicknessAu.toFixed(2)} au = ${th.thicknessMm.toFixed(2)} mm`
        + ` (target ${th.targetAu.toFixed(2)} au)`
        + ` · sheets: inner ${th.innerMean.toFixed(2)} au (${th.innerSamples} pts)`
        + ` / outer ${th.outerMean.toFixed(2)} au (${th.outerSamples} pts)`
        + ` · ${th.otherSamples} carved/counter vertices`
        + ` → ${inWindow ? 'IN the 2.5–3.3 au window' : 'OUTSIDE 2.5–3.3 au'}`}`);
    lines.push(`    extent      x ${box.min[0].toFixed(1)}..${box.max[0].toFixed(1)}`
      + ` · y ${box.min[1].toFixed(1)}..${box.max[1].toFixed(1)}`
      + ` · z ${box.min[2].toFixed(1)}..${box.max[2].toFixed(1)} au`);
  }
  return lines;
}
