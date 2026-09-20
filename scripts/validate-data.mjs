#!/usr/bin/env node
/**
 * NeuroAxis — data validator (docs/ENGINEERING_PLAN.md §9, plus the §6 SVG
 * authoring contract). Zero dependencies, plain Node ESM.
 *
 * Required inputs : src/data/taxonomy.json, src/data/levels.json.
 * Optional groups : structures/*.json, syndromes/*.json, tracts.json,
 *                   plates-*.json manifests (+ plates.json), plates/*.svg.
 *   A missing optional group is reported as "skipped", never as a failure,
 *   so the validator passes while authoring is still in progress.
 *
 * Exit codes: 0 = pass (warnings allowed) · 1 = validation failure.
 * On failure a numbered report (file + field per entry) is printed.
 *
 * Usage: node scripts/validate-data.mjs [--root <data-dir>]   (default src/data)
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------- CLI setup */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const argv = process.argv.slice(2);
let rootArg = 'src/data';
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--root') rootArg = argv[i + 1] || 'src/data';
}
const dataRoot = resolve(repoRoot, rootArg);

/** Absolute path -> repo-relative path with forward slashes (passthrough outside the repo). */
const relRepo = (p) => (p.startsWith(repoRoot) ? p.slice(repoRoot.length + 1) : p).split(sep).join('/');

/** id -> raw TaxonomyEntry, for authored-vs-registry cross-checks. */
const taxonomyById = new Map();

/* ----------------------------------------------------- contract constants */

/**
 * Structure/tract id slugs, plan §3: prefix by kind + lowercase kebab.
 *
 * v13 (PLAN.md §3) extends the FROZEN contract with `nrv-` for the `nerve` kind.
 * The alternative — reusing `ctx-` (the only prefix not already tied to a
 * matching kind) — was rejected because prefix-follows-kind is stated as a rule
 * in three places (here, docs/DATA_CONTRACT.md §3, docs/CONTENT_INVENTORY.md §3)
 * and twelve `ctx-` rows whose kind is `nerve` would be the one class of row
 * where the two disagree, an exception every future reader would have to carry.
 * Measured against the pre-v13 regex: `nrv-cn3-oculomotor`, `cn3-oculomotor`,
 * `nrv-CN3` and `nerve-cn3` were all rejected; with `nrv` added the first is
 * accepted and the other three stay rejected (see PREFIX_KIND below, which is
 * the same rule asserted rather than merely documented).
 */
const SLUG_RE = /^(nuc|tract|vent|surf|vasc|ctx|nrv)-[a-z0-9-]+$/;
/**
 * The prefix→kind rule the regex encodes, made executable: every registry row's
 * id prefix must name its own kind. Measured before adding it: all 236 rows
 * satisfied the rule with 0 violations, so this is an assertion the shipped data
 * already passes, and it is what keeps a future `nrv-…` row from silently being
 * classified as something else (or a nucleus from being mis-prefixed).
 */
const PREFIX_KIND = {
  nuc: 'nucleus',
  tract: 'tract',
  vent: 'ventricle',
  surf: 'surface',
  vasc: 'vessel',
  ctx: 'context',
  nrv: 'nerve',
};
const LEVEL_ID_RE = /^lvl-[a-z0-9-]+$/;
const PLATE_ID_RE = /^plate-[a-z0-9-]+$/;
/** Syndrome ids: lowercase kebab, no reserved prefix (syn- recommended). */
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-f]{6}$/;

const REGIONS = ['telencephalon', 'diencephalon', 'midbrain', 'pons', 'medulla', 'cerebellum', 'vasculature'];
const KINDS = ['nucleus', 'tract', 'ventricle', 'surface', 'vessel', 'context', 'nerve'];
const LATERALITIES = ['midline', 'paired'];
const DIRECTIONS = ['ascending', 'descending', 'mixed'];
const ORIENTATIONS = ['transverse', 'sagittal', 'coronal'];

/**
 * Canonical atlas-space bounds for authored records. AMENDMENT A (REALISM_PLAN
 * §3) set the brainstem/diencephalon extents; AMENDMENT B (TELENCEPHALON_PLAN
 * §2) widened them for the cerebral hemispheres, and the v7 QA pass corrected
 * the numbers from the BAKED geometry (the pre-bake estimate missed the cerebral
 * white-matter cores): the hemisphere ribbon reaches x ±56.1, y −6.8…+113.7,
 * z −72.8…+70.6 au. ~2 au of margin included.
 * Nothing below y = +45 moved — the brainstem contract is unchanged.
 * The runtime declaration is CLIP_BOUNDS in src/components/viewer3d/clipPlanes.ts;
 * keep the two in step (the v7 QA bounds check compares them).
 */
const AXIS_BOUNDS = [
  { axis: 'x', min: -58, max: 58 },
  { axis: 'y', min: -55, max: 116 },
  { axis: 'z', min: -76, max: 72 },
];

/* ---------------------------------------------------- diagnostics record */

const errors = [];
const warnings = [];
const err = (file, field, msg) => errors.push({ file, field, msg });
const warn = (file, field, msg) => warnings.push({ file, field, msg });

const counts = {
  levels: 0,
  taxonomy: 0,
  structureFiles: 0,
  structures: 0,
  tracts: 0,
  syndromeFiles: 0,
  syndromes: 0,
  plateManifests: 0,
  plates: 0,
  svgs: 0,
  registryOnly: 0,
  /** v13: kind -> row count on each side, so the Summary can print the census. */
  registryKinds: new Map(),
  authoredKinds: new Map(),
};

/** "nucleus 88 · tract 53 · … · nerve 12  (7 kinds)  Σ 248" — one axis. */
function census(histogram) {
  const parts = KINDS.map((kind) => `${kind} ${histogram.get(kind) ?? 0}`);
  const total = [...histogram.values()].reduce((sum, n) => sum + n, 0);
  const empty = KINDS.filter((kind) => (histogram.get(kind) ?? 0) === 0);
  return `${parts.join(' · ')}  (${KINDS.length} kinds${empty.length > 0 ? `, 0 rows: ${empty.join(', ')}` : ''})  Σ ${total}`;
}

/* ------------------------------------------------------- small checkers */

function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Required = field must exist; both cases demand a non-empty string. */
function checkString(file, field, value, required) {
  if (value === undefined || value === null) {
    if (required) err(file, field, 'missing required field');
    return false;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    err(file, field, required
      ? `required field must be a non-empty string, got ${JSON.stringify(value)}`
      : `optional field, when present, must be a non-empty string, got ${JSON.stringify(value)}`);
    return false;
  }
  return true;
}

function checkEnum(file, field, value, allowed, required = true) {
  if (value === undefined) {
    if (required) err(file, field, `missing required field (one of: ${allowed.join(' | ')})`);
    return;
  }
  if (!allowed.includes(value)) {
    err(file, field, `must be one of [${allowed.join(' | ')}], got ${JSON.stringify(value)}`);
  }
}

function checkHex(file, field, value, required = true) {
  if (value === undefined) {
    if (required) err(file, field, 'missing required color');
    return;
  }
  if (typeof value !== 'string' || !HEX_RE.test(value)) {
    err(file, field, `color must match ${HEX_RE} (e.g. "#d97706"), got ${JSON.stringify(value)}`);
  }
}

function checkNumber(file, field, value, required = true) {
  if (value === undefined) {
    if (required) err(file, field, 'missing required number');
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    err(file, field, `must be a finite number, got ${JSON.stringify(value)}`);
  }
}

function checkStringArray(file, field, value, required, allowEmpty = false) {
  if (value === undefined) {
    if (required) err(file, field, 'missing required array');
    return;
  }
  if (!Array.isArray(value)) {
    err(file, field, `must be an array of strings, got ${JSON.stringify(value)}`);
    return;
  }
  if (required && !allowEmpty && value.length === 0) {
    err(file, field, 'required array must not be empty');
  }
  value.forEach((s, i) => {
    if (typeof s !== 'string' || s.trim() === '') {
      err(file, `${field}[${i}]`, 'must be a non-empty string');
    }
  });
}

/** Canonical-space triple with plan §2 bounds; `positive` for size3d radii. */
function checkVec3(file, field, v, { required = false, positive = false } = {}) {
  if (v === undefined) {
    if (required) err(file, field, 'missing required field');
    return;
  }
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    err(file, field, `must be a numeric triple [x, y, z], got ${JSON.stringify(v)}`);
    return;
  }
  v.forEach((n, i) => {
    const b = AXIS_BOUNDS[i];
    if (n < b.min || n > b.max) {
      err(file, `${field}[${i}]`, `${b.axis}=${n} outside canonical bounds [${b.min}, ${b.max}] (plan §2)`);
    }
  });
  if (positive && !(v[0] > 0 && v[1] > 0 && v[2] > 0)) {
    err(file, field, 'ellipsoid radii must all be > 0');
  }
}

function checkWaypoints(file, field, wp) {
  if (wp === undefined || !Array.isArray(wp)) {
    err(file, field, 'missing required waypoints array');
    return;
  }
  if (wp.length < 2) {
    err(file, field, `needs ≥ 2 waypoints (Catmull-Rom control points), got ${wp.length}`);
  }
  wp.forEach((w, i) => {
    if (!Array.isArray(w) || w.length !== 3 || !w.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      err(file, `${field}[${i}]`, `must be a numeric triple [x, y, z], got ${JSON.stringify(w)}`);
      return;
    }
    AXIS_BOUNDS.forEach((b, axis) => {
      if (w[axis] < b.min || w[axis] > b.max) {
        warn(file, `${field}[${i}][${axis}]`,
          `${b.axis}=${w[axis]} outside canonical bounds [${b.min}, ${b.max}] — verify (tracts may intentionally exit the atlas box, but usually this is a swapped axis)`);
      }
    });
  });
}

function checkClinical(file, field, list, required) {
  if (list === undefined) {
    if (required) err(file, field, 'missing required clinical array');
    return;
  }
  if (!Array.isArray(list)) {
    err(file, field, 'must be an array of clinical items {syndrome, findings, vascular?, note?}');
    return;
  }
  if (required && list.length === 0) {
    err(file, field, 'required clinical array must not be empty');
  }
  list.forEach((c, i) => {
    const at = `${field}[${i}]`;
    if (!isObj(c)) {
      err(file, at, 'must be an object {syndrome, findings, vascular?, note?}');
      return;
    }
    checkString(file, `${at}.syndrome`, c.syndrome, true);
    checkString(file, `${at}.findings`, c.findings, true);
    if (c.vascular !== undefined) checkString(file, `${at}.vascular`, c.vascular, false);
    if (c.note !== undefined) checkString(file, `${at}.note`, c.note, false);
  });
}

function checkLevelIds(file, field, value, levelIds) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length === 0) {
    err(file, field, 'must be a non-empty array of level ids (or omit the field)');
    return;
  }
  value.forEach((id, i) => {
    if (typeof id !== 'string' || !levelIds.has(id)) {
      err(file, `${field}[${i}]`, `unknown level id ${JSON.stringify(id)} — must exist in levels.json (plan §2)`);
    }
  });
}

/* --------------------------------------------------------- file plumbing */

function walkFiles(dir, base = '') {
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...walkFiles(join(dir, d.name), rel));
    else if (d.isFile()) out.push(rel);
  }
  return out;
}

/** undefined = missing, null = unparseable, array = ok. */
function loadJsonArray(relPath) {
  const abs = join(dataRoot, relPath);
  if (!existsSync(abs)) return undefined;
  let data;
  try {
    data = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    err(relPath, '(parse)', `JSON parse failed: ${e.message}`);
    return null;
  }
  if (!Array.isArray(data)) {
    err(relPath, '(root)', 'top-level JSON must be an array of records');
    return null;
  }
  return data;
}

/* -------------------------------------------------------- group checkers */

function validateTaxonomy(list, file) {
  const ids = new Set();
  const nameSeen = new Map();
  const parentRefs = [];
  if (!Array.isArray(list)) return ids;

  list.forEach((e, i) => {
    const at = `[${i}]`;
    if (!isObj(e)) {
      err(file, at, 'must be a TaxonomyEntry object');
      return;
    }
    if (checkString(file, `${at}.id`, e.id, true)) {
      if (!SLUG_RE.test(e.id)) {
        err(file, `${at}.id`, `slug ${JSON.stringify(e.id)} must match ${SLUG_RE}`);
      }
      /* plan §3 "prefix by kind", asserted (v13): the prefix must NAME this row's
       * kind, so the registry can never hold an id whose prefix lies about it. */
      const prefix = e.id.split('-')[0];
      const prefixKind = PREFIX_KIND[prefix];
      if (prefixKind === undefined) {
        err(file, `${at}.id`, `unknown id prefix "${prefix}-" — allowed prefixes: ${Object.keys(PREFIX_KIND).join(' | ')} (plan §3)`);
      } else if (typeof e.kind === 'string' && prefixKind !== e.kind) {
        err(file, `${at}.id`, `prefix "${prefix}-" means kind "${prefixKind}" but the row declares kind "${e.kind}" (plan §3: prefix by kind)`);
      }
      if (ids.has(e.id)) err(file, `${at}.id`, `duplicate registry id "${e.id}"`);
      ids.add(e.id);
    }
    if (checkString(file, `${at}.name`, e.name, true)) {
      const key = e.name.trim();
      if (nameSeen.has(key)) {
        warn(file, `${at}.name`, `duplicate display name "${key}" (also ${nameSeen.get(key)}) — keep registry names unique for search`);
      } else {
        nameSeen.set(key, at);
      }
    }
    checkString(file, `${at}.subdivision`, e.subdivision, true);
    checkEnum(file, `${at}.region`, e.region, REGIONS);
    checkEnum(file, `${at}.kind`, e.kind, KINDS);
    checkEnum(file, `${at}.laterality`, e.laterality, LATERALITIES);
    checkHex(file, `${at}.color`, e.color);
    checkStringArray(file, `${at}.synonyms`, e.synonyms, false, true);
    if (e.parent !== undefined) {
      if (checkString(file, `${at}.parent`, e.parent, false)) {
        parentRefs.push({ at, parentId: e.parent, selfId: e.id });
      }
    }
  });

  parentRefs.forEach(({ at, parentId, selfId }) => {
    if (parentId === selfId) err(file, `${at}.parent`, 'an entry cannot be its own parent');
    else if (!ids.has(parentId)) err(file, `${at}.parent`, `unknown parent id "${parentId}" — must exist in the registry`);
  });

  return ids;
}

function validateLevels(list, file) {
  const ids = new Set();
  if (!Array.isArray(list)) return ids;

  list.forEach((l, i) => {
    const at = `[${i}]`;
    if (!isObj(l)) {
      err(file, at, 'must be a level object {id, name, y}');
      return;
    }
    if (checkString(file, `${at}.id`, l.id, true)) {
      if (!LEVEL_ID_RE.test(l.id)) {
        err(file, `${at}.id`, `level id ${JSON.stringify(l.id)} must match ${LEVEL_ID_RE} (plan §2)`);
      }
      if (ids.has(l.id)) err(file, `${at}.id`, `duplicate level id "${l.id}"`);
      ids.add(l.id);
    }
    checkString(file, `${at}.name`, l.name, true);
    checkNumber(file, `${at}.y`, l.y);
    const yBound = AXIS_BOUNDS.find((b) => b.axis === 'y');
    if (typeof l.y === 'number' && Number.isFinite(l.y) && (l.y < yBound.min || l.y > yBound.max)) {
      err(file, `${at}.y`, `y=${l.y} outside canonical y range [${yBound.min}, ${yBound.max}] (AMENDMENT A/B)`);
    }
  });

  return ids;
}

/**
 * Shared id/name ledgers across structures + tracts (plan §9: ids globally
 * unique, display names unique, registry ⊇ authored ids).
 */
const authored = new Map(); // id -> { file, at, name, region, kind, color, type }
const nameOwner = new Map(); // display name -> "file at"

function claimIdentity(file, at, rec, type) {
  if (!checkString(file, `${at}.id`, rec.id, true)) return;
  const id = rec.id;
  if (!SLUG_RE.test(id)) {
    err(file, `${at}.id`, `slug ${JSON.stringify(id)} must match ${SLUG_RE} (plan §3/§9)`);
  }
  /* The same prefix→kind rule as the registry side, applied to authored records
   * that carry a `kind` (StructureRecords do; TractRecords join the registry for
   * classification, so they are skipped — v13). */
  const prefixKind = PREFIX_KIND[id.split('-')[0]];
  if (prefixKind !== undefined && typeof rec.kind === 'string' && prefixKind !== rec.kind) {
    err(file, `${at}.id`, `prefix "${id.split('-')[0]}-" means kind "${prefixKind}" but the record declares kind "${rec.kind}" (plan §3: prefix by kind)`);
  }
  const seen = authored.get(id);
  if (seen) {
    err(file, `${at}.id`, `duplicate id "${id}" (first seen in ${seen.file} ${seen.at})`);
  } else {
    authored.set(id, { file, at, name: rec.name, region: rec.region, kind: rec.kind, color: rec.color, type });
  }
  if (typeof rec.name === 'string' && rec.name.trim() !== '') {
    const key = rec.name.trim();
    const owner = nameOwner.get(key);
    if (owner) err(file, `${at}.name`, `duplicate display name "${key}" (also ${owner}) — plan §9`);
    else nameOwner.set(key, `${file} ${at}`);
  }
}

function crossCheckRegistry(registryIds) {
  for (const [id, a] of authored) {
    if (!registryIds.has(id)) {
      err(a.file, `${a.at}.id`, `authored but unregistered: "${id}" must exist in taxonomy.json first (registry-first workflow, plan §10)`);
      continue;
    }
    const t = taxonomyById.get(id);
    if (!t) continue;
    if (typeof a.name === 'string' && t.name !== a.name) {
      warn(a.file, `${a.at}.name`, `name differs from registry ("${a.name}" vs "${t.name}") — taxonomy is authoritative for display`);
    }
    /* region/kind only exist on StructureRecord (plan §4) — TractRecord joins
     * to the registry for classification, so skip the comparison when the
     * authored record doesn't carry the field. */
    if (a.region !== undefined && t.region !== a.region) warn(a.file, `${a.at}.region`, `region "${a.region}" differs from registry "${t.region}"`);
    if (a.kind !== undefined && t.kind !== a.kind) warn(a.file, `${a.at}.kind`, `kind "${a.kind}" differs from registry "${t.kind}"`);
    if (t.color !== a.color) warn(a.file, `${a.at}.color`, `color "${a.color}" differs from registry "${t.color}" — SVG recoloring uses the taxonomy color`);
  }
  counts.registryOnly = [...registryIds].filter((id) => !authored.has(id)).length;
  /* v13: the authored-side kind census (StructureRecords carry `kind`; a
   * TractRecord joins the registry for classification, so its kind is read from
   * the registry row it is registered under — the same authority the rest of the
   * validator uses). */
  for (const a of authored.values()) {
    const kind = typeof a.kind === 'string' ? a.kind : taxonomyById.get(a.id)?.kind;
    if (typeof kind !== 'string') continue;
    counts.authoredKinds.set(kind, (counts.authoredKinds.get(kind) ?? 0) + 1);
  }
}

function validateStructure(rec, file, at, levelIds) {
  if (!isObj(rec)) {
    err(file, at, 'must be a StructureRecord object');
    return;
  }
  claimIdentity(file, at, rec, 'structure');
  checkString(file, `${at}.name`, rec.name, true);
  checkStringArray(file, `${at}.synonyms`, rec.synonyms, false, true);
  checkEnum(file, `${at}.region`, rec.region, REGIONS);
  checkString(file, `${at}.subdivision`, rec.subdivision, true);
  checkEnum(file, `${at}.kind`, rec.kind, KINDS);
  checkEnum(file, `${at}.laterality`, rec.laterality, LATERALITIES);
  checkHex(file, `${at}.color`, rec.color);
  checkString(file, `${at}.function`, rec.function, true);
  /* v13 (PLAN.md §4.2): the two fields the cranial-nerve records carry and no
   * other structure record does — the fibre modality and the course with its
   * skull-base foramen. Optional here (the six pre-v13 kinds do not use them),
   * but validated when present so a typo cannot hide in a JSON-only key that
   * tsc never sees. */
  if (rec.modality !== undefined) checkString(file, `${at}.modality`, rec.modality, false);
  if (rec.course !== undefined) checkString(file, `${at}.course`, rec.course, false);
  if (rec.connections !== undefined) {
    const c = rec.connections;
    if (!isObj(c)) {
      err(file, `${at}.connections`, 'must be an object {afferent?, efferent?}');
    } else {
      checkStringArray(file, `${at}.connections.afferent`, c.afferent, false, true);
      checkStringArray(file, `${at}.connections.efferent`, c.efferent, false, true);
    }
  }
  if (rec.bloodSupply !== undefined) checkString(file, `${at}.bloodSupply`, rec.bloodSupply, false);
  checkClinical(file, `${at}.clinical`, rec.clinical, false);
  checkLevelIds(file, `${at}.levels`, rec.levels, levelIds);
  checkVec3(file, `${at}.origin3d`, rec.origin3d);
  checkVec3(file, `${at}.size3d`, rec.size3d, { positive: true });
  checkStringArray(file, `${at}.refs`, rec.refs, false, true);
  if (rec.contextNote !== undefined) checkString(file, `${at}.contextNote`, rec.contextNote, false);
}

function validateTract(rec, file, at, levelIds) {
  if (!isObj(rec)) {
    err(file, at, 'must be a TractRecord object');
    return;
  }
  claimIdentity(file, at, rec, 'tract');
  checkString(file, `${at}.name`, rec.name, true);
  checkStringArray(file, `${at}.synonyms`, rec.synonyms, false, true);
  checkEnum(file, `${at}.direction`, rec.direction, DIRECTIONS);
  checkString(file, `${at}.modality`, rec.modality, true);
  checkString(file, `${at}.origin`, rec.origin, true);
  checkString(file, `${at}.target`, rec.target, true);
  checkString(file, `${at}.decussation`, rec.decussation, true);
  if (rec.somatotopy !== undefined) checkString(file, `${at}.somatotopy`, rec.somatotopy, false);
  checkString(file, `${at}.function`, rec.function, true);
  checkClinical(file, `${at}.clinical`, rec.clinical, true);
  checkWaypoints(file, `${at}.waypoints`, rec.waypoints);
  checkNumber(file, `${at}.tubeRadius`, rec.tubeRadius);
  if (typeof rec.tubeRadius === 'number' && Number.isFinite(rec.tubeRadius) && rec.tubeRadius <= 0) {
    err(file, `${at}.tubeRadius`, `must be > 0, got ${rec.tubeRadius}`);
  }
  checkHex(file, `${at}.color`, rec.color);
  checkLevelIds(file, `${at}.levels`, rec.levels, levelIds);
  checkStringArray(file, `${at}.refs`, rec.refs, false, true);
}

function validateSyndrome(rec, file, at, knownIds, idsSeen) {
  if (!isObj(rec)) {
    err(file, at, 'must be a SyndromeRecord object');
    return;
  }
  if (checkString(file, `${at}.id`, rec.id, true)) {
    if (!KEBAB_RE.test(rec.id)) {
      err(file, `${at}.id`, `syndrome id ${JSON.stringify(rec.id)} must be lowercase kebab-case ${KEBAB_RE} ("syn-" prefix recommended)`);
    }
    if (idsSeen.has(rec.id)) err(file, `${at}.id`, `duplicate syndrome id "${rec.id}"`);
    idsSeen.add(rec.id);
  }
  checkString(file, `${at}.name`, rec.name, true);
  if (rec.eponym !== undefined) checkString(file, `${at}.eponym`, rec.eponym, false);
  checkStringArray(file, `${at}.structures`, rec.structures, true);
  if (Array.isArray(rec.structures)) {
    rec.structures.forEach((id, i) => {
      if (typeof id !== 'string' || !knownIds.has(id)) {
        err(file, `${at}.structures[${i}]`, `unknown structure/tract id ${JSON.stringify(id)} (plan §9)`);
      }
    });
  }
  if (rec.vascularTerritory !== undefined) checkString(file, `${at}.vascularTerritory`, rec.vascularTerritory, false);
  checkString(file, `${at}.presentation`, rec.presentation, true);
  checkString(file, `${at}.cause`, rec.cause, true);
  checkStringArray(file, `${at}.refs`, rec.refs, false, true);
}

/* ------------------------------------------------------------- plates */

const svgRefs = new Map(); // svg abs path -> { rels:Set<string>, regionSlugs:Set<string>, plateLabel }

function validatePlate(rec, file, at, ctx, plateIdsSeen) {
  if (!isObj(rec)) {
    err(file, at, 'must be a PlateRecord object');
    return;
  }
  if (checkString(file, `${at}.id`, rec.id, true)) {
    if (!PLATE_ID_RE.test(rec.id)) {
      err(file, `${at}.id`, `plate id ${JSON.stringify(rec.id)} must match ${PLATE_ID_RE} (plan §3: plate-<level>, plate-sagittal-midline, plate-coronal-*)`);
    }
    if (plateIdsSeen.has(rec.id)) err(file, `${at}.id`, `duplicate plate id "${rec.id}" across manifests`);
    plateIdsSeen.add(rec.id);
  }
  checkString(file, `${at}.title`, rec.title, true);
  checkEnum(file, `${at}.orientation`, rec.orientation, ORIENTATIONS);
  checkEnum(file, `${at}.region`, rec.region, REGIONS);
  if (rec.orientation === 'transverse') {
    if (rec.levelId === undefined) {
      err(file, `${at}.levelId`, 'transverse plates require levelId (plan §4)');
    } else if (typeof rec.levelId !== 'string' || !ctx.levelIds.has(rec.levelId)) {
      err(file, `${at}.levelId`, `unknown level id ${JSON.stringify(rec.levelId)} — must exist in levels.json`);
    }
  } else if (rec.levelId !== undefined) {
    err(file, `${at}.levelId`, 'levelId is transverse-only (plan §4)');
  }

  if (checkString(file, `${at}.svg`, rec.svg, true)) {
    const abs = resolve(dataRoot, rec.svg);
    if (!abs.startsWith(dataRoot + sep)) {
      err(file, `${at}.svg`, `"${rec.svg}" escapes the data root`);
    } else if (!existsSync(abs)) {
      err(file, `${at}.svg`, `SVG file not found at src/data/${String(rec.svg).split('\\').join('/')}`);
    } else {
      if (!String(rec.svg).replace(/\\/g, '/').startsWith('plates/')) {
        warn(file, `${at}.svg`, `plate SVGs live under plates/ (got "${rec.svg}")`);
      }
      if (!svgRefs.has(abs)) svgRefs.set(abs, { rels: new Set(), regionSlugs: new Set(), plateLabel: `${file} ${at}` });
      svgRefs.get(abs).rels.add(rec.svg);
    }
  }

  if (rec.regions === undefined) {
    err(file, `${at}.regions`, 'missing required regions array');
    return;
  }
  if (!Array.isArray(rec.regions)) {
    err(file, `${at}.regions`, 'must be an array of PlateRegionMap {slug, label, labelPos}');
    return;
  }
  if (rec.regions.length === 0) {
    warn(file, `${at}.regions`, 'empty regions array — plates need 18–40 labeled regions when finished (plan §3.9)');
  }
  const slugs = new Set();
  rec.regions.forEach((r, i) => {
    const rat = `${at}.regions[${i}]`;
    if (!isObj(r)) {
      err(file, rat, 'must be a PlateRegionMap {slug, label, labelPos}');
      return;
    }
    if (checkString(file, `${rat}.slug`, r.slug, true)) {
      if (!ctx.registryIds.has(r.slug)) {
        err(file, `${rat}.slug`, `unknown id "${r.slug}" — must exist in taxonomy.json`);
      } else if (!ctx.authoredIds.has(r.slug)) {
        warn(file, `${rat}.slug`, `"${r.slug}" is registered but has no authored record yet (renderer selection will be a no-op until the data tasks land)`);
      }
      if (slugs.has(r.slug)) err(file, `${rat}.slug`, `duplicate region slug "${r.slug}" in this plate`);
      slugs.add(r.slug);
      const ref = rec.svg !== undefined ? svgRefs.get(resolve(dataRoot, rec.svg)) : undefined;
      if (ref) ref.regionSlugs.add(r.slug);
    }
    checkString(file, `${rat}.label`, r.label, true);
    if (r.labelPos !== undefined) {
      if (!Array.isArray(r.labelPos) || r.labelPos.length !== 2
        || !r.labelPos.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        err(file, `${rat}.labelPos`, `must be an [x, y] pair of numbers, got ${JSON.stringify(r.labelPos)}`);
      } else if (r.labelPos.some((n) => n < 0 || n > 800)) {
        warn(file, `${rat}.labelPos`, `[${r.labelPos.join(', ')}] lies outside the 800×800 viewBox`);
      }
    } else {
      err(file, `${rat}.labelPos`, 'missing labelPos [x, y]');
    }
  });
}

function scanSvg(abs, info, ctx) {
  const relPath = `src/data/${info.rels.values().next().value}`;
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch (e) {
    err(relPath, '(read)', `cannot read SVG: ${e.message}`);
    return;
  }
  if (!/<svg[\s>]/i.test(text)) {
    err(relPath, '(root)', 'no <svg> root element found');
  }

  const vb = text.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!vb) {
    err(relPath, '(viewBox)', 'SVG authoring contract (plan §6) requires viewBox="0 0 800 800"');
  } else {
    const nums = vb[1].trim().split(/[\s,]+/).map(Number);
    if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))
      || nums[0] !== 0 || nums[1] !== 0 || nums[2] !== 800 || nums[3] !== 800) {
      err(relPath, '(viewBox)', `must be "0 0 800 800", got "${vb[1]}"`);
    }
  }

  const attrRe = /data-structure\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = attrRe.exec(text)) !== null) {
    const id = m[1];
    if (!ctx.registryIds.has(id)) {
      err(relPath, `data-structure="${id}"`, 'does not resolve to a known id in taxonomy.json (plan §9)');
    } else if (!ctx.authoredIds.has(id)) {
      warn(relPath, `data-structure="${id}"`, 'registered but no authored record yet');
    }
  }

  const forRe = /data-for\s*=\s*["']([^"']+)["']/g;
  while ((m = forRe.exec(text)) !== null) {
    const id = m[1];
    if (!ctx.registryIds.has(id)) {
      err(relPath, `data-for="${id}"`, 'label group does not resolve to a known id (plan §9)');
    } else if (!info.regionSlugs.has(id)) {
      err(relPath, `data-for="${id}"`, 'label group does not match any region listed in this plate manifest (plan §6 label routing)');
    }
  }

  let styled = 0;
  for (const tag of text.matchAll(/<[a-zA-Z][^>]*\bdata-structure\s*=[^>]*>/g)) {
    if (/\s(?:fill|style)\s*=/.test(tag[0])) styled += 1;
  }
  if (styled > 0) {
    warn(relPath, '(inline styling)', `${styled} data-structure element(s) carry fill/style — plan §6 requires the renderer to control fills via CSS vars`);
  }
}

/* ------------------------------------------------------------- reporting */

function printReport(skippedGroups) {
  console.log(`NeuroAxis data validation — root: ${relRepo(dataRoot)}`);

  if (errors.length > 0) {
    console.log(`\n${errors.length} error(s):`);
    errors.forEach((e, i) => {
      console.log(`  [${i + 1}] ERROR ${e.file} :: ${e.field} — ${e.msg}`);
    });
  }
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s) (non-blocking):`);
    warnings.forEach((w, i) => {
      console.log(`  [W${i + 1}] WARN ${w.file} :: ${w.field} — ${w.msg}`);
    });
  }

  const skipped = new Set(skippedGroups);
  const line = (label, value) => console.log(`  ${label.padEnd(12)} ${value}`);
  const orSkipped = (groupName, value) => (skipped.has(groupName) ? 'absent — optional group skipped' : value);

  console.log('\nSummary');
  line('levels', `${counts.levels} level anchor(s)`);
  line('taxonomy', `${counts.taxonomy} registry entr(ies) (${counts.registryOnly} awaiting authored records)`);
  /* v13: the per-KIND census, printed for BOTH sides so a new kind (or a kind
   * whose records landed on one side only) is visible in this command's own
   * output instead of being inferable only from the error list. `nerve 0 · …`
   * and a registry-only count are what a half-landed slice looks like. */
  line('kinds', `registry: ${census(counts.registryKinds)}`);
  line('kinds/auth', `authored: ${census(counts.authoredKinds)}`);
  line('structures', orSkipped('structures', `${counts.structureFiles} file(s), ${counts.structures} record(s)`));
  line('tracts', orSkipped('tracts', `${counts.tracts} record(s)`));
  line('syndromes', orSkipped('syndromes', `${counts.syndromeFiles} file(s), ${counts.syndromes} record(s)`));
  line('plates', orSkipped('plates', `${counts.plateManifests} manifest(s), ${counts.plates} plate record(s), ${counts.svgs} svg file(s)`));

  console.log('');
  if (errors.length > 0) {
    console.log(`✖ Validation FAILED — ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exitCode = 1;
  } else {
    console.log(`✔ Validation PASSED — 0 errors, ${warnings.length} warning(s)`);
    process.exitCode = 0;
  }
}

/* ------------------------------------------------------------------ main */

function main() {
  if (!existsSync(dataRoot)) {
    err(relRepo(dataRoot), '(directory)', `data root not found — expected ${relRepo(dataRoot)}`);
    printReport([]);
    return;
  }

  const allFiles = walkFiles(dataRoot);
  const jsonFiles = allFiles.filter((f) => f.endsWith('.json'));
  const svgFiles = allFiles.filter((f) => f.endsWith('.svg'));
  counts.svgs = svgFiles.filter((f) => f.startsWith('plates/')).length;
  for (const f of svgFiles) {
    if (!f.startsWith('plates/')) warn(`src/data/${f}`, '(location)', 'plate SVG files belong under src/data/plates/');
  }

  /* Classify every JSON file under the data root. */
  const structureFiles = jsonFiles.filter((f) => f.startsWith('structures/'));
  const syndromeFiles = jsonFiles.filter((f) => f.startsWith('syndromes/'));
  const plateManifestFiles = jsonFiles.filter((f) => !f.includes('/') && /^plates(-[a-z0-9-]+)*\.json$/.test(f));
  const claimed = new Set(['taxonomy.json', 'levels.json', 'tracts.json', ...structureFiles, ...syndromeFiles, ...plateManifestFiles]);
  for (const f of jsonFiles) {
    if (!claimed.has(f)) {
      loadJsonArray(f); // still must parse
      warn(`src/data/${f}`, '(classification)', 'JSON file not in a known group (taxonomy/levels/tracts/structures//syndromes//plates-*.json) — parsed only');
    }
  }

  /* Required registries. */
  const taxonomy = loadJsonArray('taxonomy.json');
  const levels = loadJsonArray('levels.json');
  const registryIds = validateTaxonomy(taxonomy, 'src/data/taxonomy.json');
  counts.taxonomy = Array.isArray(taxonomy) ? taxonomy.length : 0;
  const levelIds = validateLevels(levels, 'src/data/levels.json');
  counts.levels = Array.isArray(levels) ? levels.length : 0;
  taxonomyById.clear();
  if (Array.isArray(taxonomy)) {
    for (const e of taxonomy) if (isObj(e) && typeof e.id === 'string') taxonomyById.set(e.id, e);
    for (const e of taxonomy) {
      if (!isObj(e) || typeof e.kind !== 'string') continue;
      counts.registryKinds.set(e.kind, (counts.registryKinds.get(e.kind) ?? 0) + 1);
    }
  }
  if (taxonomy === undefined) err('src/data/taxonomy.json', '(file)', 'missing required file — the registry must exist (plan §10, created first)');
  if (levels === undefined) err('src/data/levels.json', '(file)', 'missing required file — the level table must exist (plan §2)');

  const ctx = {
    levelIds,
    registryIds,
    authoredIds: new Set(),
  };

  /* Structures (optional group). */
  for (const f of structureFiles) {
    const list = loadJsonArray(f);
    counts.structureFiles += 1;
    if (!Array.isArray(list)) continue;
    list.forEach((rec, i) => validateStructure(rec, `src/data/${f}`, `[${i}]`, levelIds));
  }
  counts.structures = authored.size;

  /* Tracts (optional group). */
  const tracts = loadJsonArray('tracts.json');
  if (tracts !== undefined && Array.isArray(tracts)) {
    tracts.forEach((rec, i) => validateTract(rec, 'src/data/tracts.json', `[${i}]`, levelIds));
  }
  counts.structures = [...authored.values()].filter((a) => a.type === 'structure').length;
  counts.tracts = [...authored.values()].filter((a) => a.type === 'tract').length;
  for (const id of authored.keys()) ctx.authoredIds.add(id);

  /* Syndromes (optional group). Syndrome structures resolve against the
   * registry (the id contract, plan §9/§10) — like plates — so cross-region
   * references stay valid while other authors' files are still landing.
   * Authored-vs-registry drift is still caught by crossCheckRegistry. */
  if (syndromeFiles.length > 0) {
    const syndromeIds = new Set();
    for (const f of syndromeFiles) {
      const list = loadJsonArray(f);
      counts.syndromeFiles += 1;
      if (!Array.isArray(list)) continue;
      list.forEach((rec, i) => validateSyndrome(rec, `src/data/${f}`, `[${i}]`, ctx.registryIds, syndromeIds));
      counts.syndromes += list.length;
    }
  }

  /* Plate manifests + SVGs (optional group). */
  if (plateManifestFiles.length > 0) {
    const plateIdsSeen = new Set();
    for (const f of plateManifestFiles) {
      const list = loadJsonArray(f);
      counts.plateManifests += 1;
      if (!Array.isArray(list)) continue;
      list.forEach((rec, i) => validatePlate(rec, `src/data/${f}`, `[${i}]`, ctx, plateIdsSeen));
      counts.plates += list.length;
    }
    for (const [abs, info] of svgRefs) scanSvg(abs, info, ctx);
    const referenced = new Set([...svgRefs.keys()].map((a) => relRepo(a).replace(/^src\/data\//, '')));
    for (const f of svgFiles) {
      if (!referenced.has(f)) warn(`src/data/${f}`, '(manifest)', 'SVG file exists but no plate manifest references it');
    }
  }

  /* Cross-group integrity. */
  crossCheckRegistry(registryIds);

  const skipped = [];
  if (!existsSync(join(dataRoot, 'structures'))) skipped.push('structures');
  if (tracts === undefined) skipped.push('tracts');
  if (!existsSync(join(dataRoot, 'syndromes'))) skipped.push('syndromes');
  if (plateManifestFiles.length === 0) skipped.push('plates');

  printReport(skipped);
}

try {
  main();
} catch (e) {
  console.error(`Internal validator error: ${e && e.stack ? e.stack : e}`);
  process.exitCode = 1;
}
