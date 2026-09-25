/**
 * audit-facts.mjs — the v15 audit's *structural* assertions, as a committed gate.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * The v15 run (`run-mtze6lyq-t83x`) ended with one integrator editing 19 structure
 * files, `tracts.json`, three syndrome files, three plate SVGs, `levels.json`,
 * `taxonomy.json` and `src/geometry/curves.ts`. Six auditors had checked those
 * records against each other; nothing checked the CROSS-FILE invariants that the
 * edits could break — the ones this gate asserts. It is deliberately narrow: every
 * assertion below is one the audit itself relied on, so a future edit that breaks
 * one of them cannot silently invalidate the audit's conclusions.
 *
 * WHAT IT ASSERTS (17 groups, all against the shipped data, no re-typed table)
 * ────────────────────────────────────────────────────────────────────────────
 *   1  CLIP_BOUNDS is the single source, and every authored coordinate
 *      (`origin3d`, tract `waypoints`, `size3d`) lies inside it.
 *   2  the laterality sign contract: paired records sit on the +x side off the
 *      midline, midline records sit on it (the v15 C5 census, re-measured).
 *   3  every authored record has a taxonomy row, and the registry row's
 *      name/region/subdivision/kind/laterality agree with the record. (This is
 *      the assertion that catches "the record was corrected, the registry row
 *      was not" — the one live v15 defect this gate pins.)
 *   4  ids are unique, display names are unique across structures + tracts, and
 *      every id's prefix matches its declared kind.
 *   5  every `levels[]` id in structures, tracts and plate manifests resolves in
 *      levels.json, and the anchor table is strictly increasing in y.
 *   6  the syndrome ↔ artery link is two-sided: every artery `supply[]` id is a
 *      real card, and every card that names a vascular territory is supplied by
 *      at least one artery record (the four genuinely non-arterial cards are the
 *      named, documented exception).
 *   7  every syndrome `structures[]` id resolves to an authored record.
 *   8  every plate region slug resolves AND appears literally in its own SVG, and
 *      each manifest's levelId matches the plane it claims.
 *   9  every plate orientation letter is one of the two axes its plane allows
 *      (transverse → A/P + R/L, coronal → S/I + R/L, sagittal → S/I + A/P), and
 *      every frame holds exactly four letters; 9b pins the lateral pair on the
 *      transverse/coronal plates that cut both hemispheres.
 *  10  every nerve course in src/geometry/curves.ts has an anchorId that resolves,
 *      and its waypoints stay inside CLIP_BOUNDS with the documented 6.00 au
 *      minimum clearance.
 *  11  the committed manifest still holds 138 parts and no `nrv-*.glb` exists
 *      (route (a): the nerve courses cost zero GLB bytes) — the same contract
 *      `area-toggles.mjs` asserts, re-asserted here because the v15 audit moved
 *      three nerve landmarks.
 *  12  `docs/audit/v15/REPORT.md` exists and its summary counts are internally
 *      consistent with the six findings files (the audit's own arithmetic).
 *
 *  13–16 were ADDED AT v19 by the `final-review` task (plan §3.8 item 5) — the
 *      structural checks that run is required to name and wire, plus the pins for
 *      the v19 corrections that had no gate:
 *  13  cross-file reference integrity: every STRUCTURED reference (`parent`,
 *      `territory[]`, `supply[]`, `mesh[]`, `anchors.mesh`,
 *      `vesselCourse.parentArtery` / `.surface`, syndrome `structures[]`) resolves
 *      against the record/syndrome/level/plate/manifest-slug domain, and every
 *      id-shaped token in the free text of every structure, tract and syndrome
 *      resolves too — modulo a PINNED five-token prose allowlist that is itself
 *      asserted, so it cannot grow silently. This is the check that sees a renamed
 *      or deleted id left behind in a reference or a sentence.
 *  14  every vessel course starts on its parent artery: the parent must own a
 *      committed manifest body, and the first waypoint must either lie on that body
 *      (≤ 0.5 au from its bbox) or the course must DECLARE its provenance
 *      (`basis` + `waypointBasis[0]` + `anchorNote`). Covers the 39 authored JSON
 *      courses and the 4 `BUILT_IN_VESSEL_COURSES` chunks (symbolic first waypoints
 *      such as `M1_TAKEOFF` are resolved from the literal constant table in the
 *      same file). Measured, not assumed: the five off-parent courses are printed
 *      with their distances (max 56.31 au, the distal MCA branches that arise
 *      beyond the committed M1/M2 mesh).
 *  15  every structure kind and every manifest hint has a material preset:
 *      `KIND_OPACITY` covers exactly `ALL_KINDS`, every `MATERIAL_HINTS` value has
 *      a `case` in `makeAnatomyMaterial`, every manifest `materialHint` is a
 *      declared hint, and `hintForKind` returns only declared hints.
 *  16  the v19 corrections that had no gate now have one: the ACoA and
 *      thalamogeniculate `supply[]` de-links, the AChA `territory[]` addition, the
 *      `syn-claude` structure set, the single reachable ellipsoid-suppression guard
 *      in `SceneLayers` (the compensating assertion for the still-red
 *      `verify:vessel-render` §3 source pin — see docs/audit/v19/REPORT.md), and
 *      the two corrected plate frames.
 *
 * NOT OBSERVED HERE (requires a browser): rendered pixels, pointer/focus
 * interaction, and anything the browser lane alone can see. `verify:audit` exits
 * 4 in this environment ("no check was run").
 *
 * Wire-in: `npm run verify:audit-facts` — the `package.json` entry the v19 plan's
 * D5 required was added by `integrate-fixes` and this gate is now part of the run
 * sweep (it ran 68/68 at v19 close). `node scripts/verify/audit-facts.mjs` is the
 * direct form, and `AUDIT_FACTS_ROOT=<copy>` runs it against a mutated copy of the
 * tree, which is how groups 13–16 were bite-tested.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
/* An out-of-tree copy of the repository can be checked without touching the real
   tree: AUDIT_FACTS_ROOT=/some/copy node scripts/verify/audit-facts.mjs. Used to
   verify that a proposed one-line fix really clears the assertion it targets. */
const ROOT = process.env.AUDIT_FACTS_ROOT ?? join(HERE, '..', '..')
const P = (...p) => join(ROOT, ...p)
const read = (...p) => readFileSync(P(...p), 'utf8')
const json = (...p) => JSON.parse(read(...p))

/* ── the assertion runner (same shape as the other Node gates) ────────────── */
const results = []
let group = ''
const groups = []
function start(title) {
  group = title
  groups.push({ title, passed: 0, failed: 0 })
  console.log('\n── ' + title)
}
function record(pass, label, detail) {
  const g = groups[groups.length - 1]
  if (pass) g.passed++
  else g.failed++
  results.push({ group, pass, label, detail })
  console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? ' — ' + detail : ''}`)
}
const ok = (label, detail) => record(true, label, detail)
const bad = (label, detail) => record(false, label, detail)
const truthy = (label, value, detail) => record(Boolean(value), label, detail)
const equal = (label, actual, expected) =>
  record(
    JSON.stringify(actual) === JSON.stringify(expected),
    label,
    JSON.stringify(actual) === JSON.stringify(expected) ? '' : `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`,
  )
const info = (label) => console.log(`  ·  ${label}`)

/* ── the shipped data ────────────────────────────────────────────────────── */
const STRUCT_FILES = readdirSync(P('src/data/structures')).filter((n) => n.endsWith('.json'))
const structures = []
for (const f of STRUCT_FILES) {
  const j = json('src/data/structures', f)
  const arr = Array.isArray(j) ? j : (j.records ?? j.structures ?? [])
  for (const r of arr) structures.push({ ...r, __file: f })
}
const tractJson = json('src/data/tracts.json')
const tracts = Array.isArray(tractJson) ? tractJson : (tractJson.tracts ?? tractJson.records ?? [])
const syndromeFiles = readdirSync(P('src/data/syndromes')).filter((n) => n.endsWith('.json'))
const syndromes = []
for (const f of syndromeFiles) {
  const j = json('src/data/syndromes', f)
  const arr = Array.isArray(j) ? j : (j.syndromes ?? j.records ?? [])
  for (const s of arr) syndromes.push({ ...s, __file: f })
}
const taxJson = json('src/data/taxonomy.json')
const taxonomy = Array.isArray(taxJson) ? taxJson : (taxJson.entries ?? taxJson.records ?? [])
const levels = json('src/data/levels.json')
const plateJson = json('src/data/plates.json')
const plates = Array.isArray(plateJson) ? plateJson : (plateJson.plates ?? plateJson.manifests ?? [])
const manifest = json('src/assets/anatomy/anatomy-manifest.json')
const parts = manifest.parts ?? manifest

const RECORDS = [...structures, ...tracts]
const IDS = new Set(RECORDS.map((r) => r.id))
const LEVEL_IDS = new Set(levels.map((l) => l.id))
const SYNDROME_IDS = new Set(syndromes.map((s) => s.id))

/**
 * CLIP_BOUNDS is read from its single declaration site — the same discipline the
 * shipped store and sliders use. The module cannot be imported (it constructs
 * three.js planes at load), so its literal block is parsed and then asserted to
 * be the only declaration.
 */
const clipSrc = read('src/components/viewer3d/clipPlanes.ts')
const clipBlock = /export const CLIP_BOUNDS = \{([\s\S]*?)\} as const/.exec(clipSrc)?.[1] ?? ''
const CLIP = {}
for (const m of clipBlock.matchAll(/([xyz]):\s*\{\s*min:\s*(-?[\d.]+),\s*max:\s*(-?[\d.]+)\s*\}/g)) {
  CLIP[m[1]] = { min: Number(m[2]), max: Number(m[3]) }
}
const AXES = ['x', 'y', 'z']
const insideClip = (v, slack = 0) =>
  AXES.every((a) => v[AXES.indexOf(a)] >= CLIP[a].min - slack && v[AXES.indexOf(a)] <= CLIP[a].max + slack)

console.log('════════════════ NeuroAxis v15 audit facts ════════════════')
info(`data: ${structures.length} structure records in ${STRUCT_FILES.length} file(s) · ${tracts.length} tracts · ${syndromes.length} syndrome cards`)
info(`registries: ${taxonomy.length} taxonomy rows · ${levels.length} level anchors · ${plates.length} plate manifests · ${parts.length} manifest parts`)

/* ══════════════════════════ 1. CLIP_BOUNDS and coordinates ═══════════════ */
start('1. every authored coordinate is inside CLIP_BOUNDS (x[−58,58] y[−55,116] z[−76,72])')
equal('CLIP_BOUNDS has exactly three axes with a min and a max', Object.keys(CLIP).sort(), ['x', 'y', 'z'])
equal('CLIP_BOUNDS is x[−58,58] y[−55,116] z[−76,72]', CLIP, {
  x: { min: -58, max: 58 },
  y: { min: -55, max: 116 },
  z: { min: -76, max: 72 },
})
{
  const decls = (clipSrc.match(/export const CLIP_BOUNDS/g) ?? []).length
  equal('CLIP_BOUNDS has one declaration site in clipPlanes.ts', decls, 1)
  const outside = []
  for (const r of RECORDS) if (Array.isArray(r.origin3d) && !insideClip(r.origin3d)) outside.push(`${r.id} origin3d ${JSON.stringify(r.origin3d)}`)
  outside.length === 0
    ? ok(`every origin3d is inside the box (${RECORDS.filter((r) => Array.isArray(r.origin3d)).length} records carry one)`)
    : bad('origin3d outside CLIP_BOUNDS', outside.join(' · '))
  const badSize = []
  for (const r of structures) {
    if (!Array.isArray(r.size3d)) continue
    if (r.size3d.length !== 3 || r.size3d.some((v) => !(typeof v === 'number' && v > 0))) badSize.push(`${r.id} ${JSON.stringify(r.size3d)}`)
  }
  badSize.length === 0 ? ok('every size3d is three positive radii') : bad('malformed size3d', badSize.join(' · '))
  const badWp = []
  for (const r of tracts) {
    for (const p of r.waypoints ?? []) if (!Array.isArray(p) || p.length !== 3 || !insideClip(p)) badWp.push(`${r.id} ${JSON.stringify(p)}`)
  }
  badWp.length === 0
    ? ok(`every tract waypoint is a 3-vector inside the box (${tracts.reduce((n, t) => n + (t.waypoints?.length ?? 0), 0)} waypoints)`)
    : bad('tract waypoint outside CLIP_BOUNDS or malformed', badWp.join(' · '))
}

/* ══════════════════════════ 2. laterality sign contract ══════════════════ */
start('2. the laterality sign contract (paired = +x off midline, midline = on it)')
{
  const withOrigin = structures.filter((r) => Array.isArray(r.origin3d))
  const census = {}
  for (const r of structures) census[r.laterality ?? 'MISSING'] = (census[r.laterality ?? 'MISSING'] ?? 0) + 1
  info(`census: ${JSON.stringify(census)} over ${structures.length} records; ${withOrigin.length} carry origin3d`)
  const offMidline = withOrigin.filter((r) => r.laterality === 'midline' && Math.abs(r.origin3d[0]) > 1.0)
  const onMidline = withOrigin.filter((r) => r.laterality === 'paired' && Math.abs(r.origin3d[0]) < 1.0)
  const negative = withOrigin.filter((r) => r.laterality === 'paired' && r.origin3d[0] < 0)
  offMidline.length === 0
    ? ok('no midline record sits off the midline (|x| ≤ 1 au)')
    : bad('midline records with |x| > 1 au', offMidline.map((r) => `${r.id} x=${r.origin3d[0]}`).join(' · '))
  onMidline.length === 0
    ? ok('no paired record sits on the midline')
    : bad('paired records with |x| < 1 au', onMidline.map((r) => `${r.id} x=${r.origin3d[0]}`).join(' · '))
  negative.length === 0
    ? ok('no paired record is authored on the negative side (the canonical one-side convention)')
    : bad('paired records authored at x < 0', negative.map((r) => `${r.id} x=${r.origin3d[0]}`).join(' · '))
  const badLat = structures.filter((r) => r.laterality !== 'midline' && r.laterality !== 'paired')
  badLat.length === 0 ? ok('every record declares a laterality in {midline, paired}') : bad('invalid laterality', badLat.map((r) => r.id).join(' · '))
}

/* ══════════════════════════ 3. registry ↔ record agreement ═══════════════ */
start('3. every registry row agrees with the record it registers (v15 defect class)')
{
  const byId = new Map(taxonomy.map((t) => [t.id, t]))
  const missing = RECORDS.filter((r) => !byId.has(r.id))
  missing.length === 0
    ? ok(`every authored id has a taxonomy row (${RECORDS.length} authored, ${taxonomy.length} rows)`)
    : bad('authored ids with no taxonomy row', missing.map((r) => r.id).join(' · '))
  const mismatches = []
  for (const r of RECORDS) {
    const t = byId.get(r.id)
    if (!t) continue
    for (const f of ['name', 'region', 'subdivision', 'kind', 'laterality']) {
      if (r[f] === undefined || t[f] === undefined) continue
      if (r[f] !== t[f]) mismatches.push(`${r.id}.${f}: record "${r[f]}" vs registry "${t[f]}"`)
    }
  }
  mismatches.length === 0
    ? ok('name/region/subdivision/kind/laterality agree between every record and its registry row')
    : bad('record and registry row disagree', mismatches.join(' · '))
}
{
  const awaiting = taxonomy.filter((t) => !IDS.has(t.id) && t.region !== undefined && /^tract-/.test(t.id))
  info(`registry rows with no authored record: ${awaiting.length} (tract rows are authored in tracts.json; this is informational)`)
}

/* ══════════════════════════ 4. id and name integrity ═════════════════════ */
start('4. ids are unique, display names are unique, id prefixes match kinds')
{
  const seenId = new Map()
  for (const r of RECORDS) seenId.set(r.id, (seenId.get(r.id) ?? 0) + 1)
  const dup = [...seenId.entries()].filter(([, n]) => n > 1)
  dup.length === 0 ? ok(`no duplicate id across structures + tracts (${seenId.size} ids)`) : bad('duplicate ids', dup.map(([i, n]) => `${i}×${n}`).join(' · '))
  const seenName = new Map()
  for (const r of RECORDS) seenName.set(r.name, (seenName.get(r.name) ?? 0) + 1)
  const dupName = [...seenName.entries()].filter(([, n]) => n > 1)
  dupName.length === 0 ? ok(`no duplicate display name (${seenName.size} names)`) : bad('duplicate display names', dupName.map(([n, c]) => `${n}×${c}`).join(' · '))
  const KIND_PREFIX = {
    nucleus: ['nuc-', 'ctx-'],
    tract: ['tract-'],
    ventricle: ['vent-'],
    surface: ['surf-', 'ctx-'],
    vessel: ['vasc-'],
    context: ['ctx-'],
    nerve: ['nrv-'],
  }
  /* A tract record carries no `kind` of its own (tracts.json has no such field);
     its kind comes from the registry row — the same switch the shipped loader
     makes. So the prefix is checked against `record.kind ?? registry.kind`. */
  const kindById = new Map(taxonomy.map((t) => [t.id, t.kind]))
  const badPrefix = []
  for (const r of RECORDS) {
    const kind = r.kind ?? kindById.get(r.id)
    const allowed = KIND_PREFIX[kind]
    if (!allowed) { badPrefix.push(`${r.id} has unknown kind "${kind}"`); continue }
    if (!allowed.some((p) => r.id.startsWith(p))) badPrefix.push(`${r.id} (kind ${kind}, expected ${allowed.join('/')})`)
  }
  badPrefix.length === 0
    ? ok(`every id prefix matches its kind (${structures.length} records declare one, ${tracts.length} tracts inherit it from the registry)`)
    : bad('id prefix / kind mismatch', badPrefix.join(' · '))
}

/* ══════════════════════════ 5. levels[] resolve ═══════════════════════════ */
start('5. every levels[] id resolves, and the anchor table is strictly increasing in y')
{
  const badLevels = []
  for (const r of RECORDS) {
    if (!Array.isArray(r.levels)) { badLevels.push(`${r.id} has no levels[]`); continue }
    for (const l of r.levels) if (!LEVEL_IDS.has(l)) badLevels.push(`${r.id} → ${l}`)
  }
  for (const p of plates) {
    if (p.levelId !== undefined && p.levelId !== null && !LEVEL_IDS.has(p.levelId)) badLevels.push(`${p.id} → ${p.levelId}`)
  }
  badLevels.length === 0
    ? ok(`every level id in ${RECORDS.length} records and ${plates.length} plate manifests resolves against ${levels.length} anchors`)
    : bad('unresolved level ids', badLevels.join(' · '))
  const sorted = [...levels].sort((a, b) => a.y - b.y)
  const increasing = sorted.every((l, i) => i === 0 || l.y > sorted[i - 1].y)
  increasing
    ? ok(`the ${levels.length} anchors are strictly increasing in y (${sorted[0].y}…${sorted[sorted.length - 1].y})`)
    : bad('two level anchors collide or are out of order', sorted.map((l) => `${l.id}@${l.y}`).join(' · '))
  const dupIds = levels.length !== new Set(levels.map((l) => l.id)).size
  !dupIds ? ok('no duplicate level id') : bad('duplicate level id')
}

/* ══════════════════════════ 6. syndrome ↔ artery is two-sided ════════════ */
start('6. the syndrome ↔ artery link is two-sided')
{
  const NON_ARTERIAL = ['syn-korsakoff', 'syn-pineal-region', 'syn-cpm', 'syn-parkinson']
  const arteries = structures.filter((r) => r.id.startsWith('vasc-'))
  const suppliedBy = new Map()
  for (const a of arteries) for (const s of a.supply ?? []) {
    if (!suppliedBy.has(s)) suppliedBy.set(s, [])
    suppliedBy.get(s).push(a.id)
  }
  const synIds = new Set(syndromes.map((s) => s.id))
  const dangling = [...suppliedBy.keys()].filter((s) => !synIds.has(s))
  dangling.length === 0
    ? ok(`every artery supply[] id is a real card (${suppliedBy.size} linked of ${synIds.size})`)
    : bad('dangling artery supply[] ids', dangling.join(' · '))
  const namesTerritory = syndromes.filter((s) => typeof s.vascularTerritory === 'string' && !/^none\b/i.test(s.vascularTerritory.trim()))
  const unlinked = namesTerritory.filter((s) => !suppliedBy.has(s.id))
  unlinked.length === 0
    ? ok(`every card that names a vascular territory is linked from ≥1 artery record (${namesTerritory.length} cards)`)
    : bad('arterial cards with no artery link', unlinked.map((s) => `${s.id} "${s.vascularTerritory}"`).join(' · '))
  const nonArterial = syndromes.filter((s) => typeof s.vascularTerritory === 'string' && /^none\b/i.test(s.vascularTerritory.trim()))
  const unexplained = nonArterial.filter((s) => !NON_ARTERIAL.includes(s.id))
  nonArterial.length === NON_ARTERIAL.length && unexplained.length === 0
    ? ok(`the ${nonArterial.length} non-arterial cards are the documented ones (${NON_ARTERIAL.join(', ')})`)
    : bad('unexpected non-arterial card set', `declared ${nonArterial.length}, documented ${NON_ARTERIAL.length}; extra: ${unexplained.map((s) => s.id).join(', ') || 'none'}`)
  const linkedNonArterial = NON_ARTERIAL.filter((s) => suppliedBy.has(s))
  linkedNonArterial.length === 0
    ? ok('no documented non-arterial card carries an artery link')
    : bad('a non-arterial card is linked to an artery', linkedNonArterial.join(' · '))
  const noSupply = arteries.filter((a) => Array.isArray(a.supply) && a.supply.length === 0).map((a) => a.id)
  info(`arteries with an empty supply[]: ${noSupply.length ? noSupply.join(', ') : 'none'} (informational — a named syndrome may simply be documented in the record's clinical[] instead)`)
  const dupSupply = arteries.filter((a) => new Set(a.supply ?? []).size !== (a.supply ?? []).length).map((a) => a.id)
  dupSupply.length === 0 ? ok('no artery lists the same syndrome twice') : bad('duplicate syndrome id inside a supply[]', dupSupply.join(' · '))
}

/* ══════════════════════════ 7. syndrome structures[] resolve ═════════════ */
start('7. every syndrome names structures that exist')
{
  const dangling = []
  for (const s of syndromes) for (const id of s.structures ?? []) if (!IDS.has(id)) dangling.push(`${s.id} → ${id}`)
  dangling.length === 0
    ? ok(`every structures[] id resolves (${syndromes.reduce((n, s) => n + (s.structures?.length ?? 0), 0)} references over ${syndromes.length} cards)`)
    : bad('dangling syndrome structures[] ids', dangling.join(' · '))
  const noStructures = syndromes.filter((s) => !(s.structures ?? []).length).map((s) => s.id)
  noStructures.length === 0 ? ok('every card names at least one structure') : bad('cards with an empty structures[]', noStructures.join(' · '))
}

/* ══════════════════════════ 8. plate manifests ↔ SVGs ════════════════════ */
start('8. every plate region slug resolves and is present in its own SVG')
{
  const dangling = []
  const notInSvg = []
  const missingSvg = []
  const planeMismatch = []
  let regionCount = 0
  for (const p of plates) {
    const svgPath = String(p.svg ?? `${p.id}.svg`).replace(/^plates\//, '')
    const file = P('src/data/plates', svgPath)
    if (!existsSync(file)) { missingSvg.push(p.id); continue }
    const svg = readFileSync(file, 'utf8')
    for (const r of p.regions ?? []) {
      regionCount++
      const slug = r.slug ?? r.id
      if (!IDS.has(slug)) dangling.push(`${p.id} → ${slug}`)
      else if (!svg.includes(`data-structure="${slug}"`) && !svg.includes(`data-for="${slug}"`)) notInSvg.push(`${p.id} → ${slug}`)
    }
    if (p.orientation === 'transverse' && (p.levelId === undefined || p.levelId === null)) planeMismatch.push(`${p.id} is transverse with no levelId`)
    if (p.orientation !== 'transverse' && p.levelId !== undefined && p.levelId !== null) planeMismatch.push(`${p.id} is ${p.orientation} but carries ${p.levelId}`)
  }
  missingSvg.length === 0 ? ok(`all ${plates.length} plate SVGs exist`) : bad('manifest without its SVG', missingSvg.join(' · '))
  dangling.length === 0
    ? ok(`every plate region slug resolves to an authored record (${regionCount} labelled regions)`)
    : bad('dangling plate region slugs', dangling.join(' · '))
  notInSvg.length === 0
    ? ok(`every plate region slug is drawn or labelled in its own SVG (${regionCount} regions)`)
    : bad('region slug absent from its SVG', notInSvg.join(' · '))
  planeMismatch.length === 0
    ? ok('the 10 transverse plates carry a levelId and the 5 sagittal/coronal ones do not')
    : bad('manifest plane / levelId mismatch', planeMismatch.join(' · '))
}

/* ══════════════════════════ 9. plate orientation letters ═════════════════ */
start('9. every plate orientation letter belongs to its plane')
{
  const ALLOWED = {
    transverse: ['A', 'P', 'R', 'L'],
    coronal: ['S', 'I', 'R', 'L'],
    sagittal: ['S', 'I', 'A', 'P'],
  }
  const problems = []
  const summary = []
  const letterCounts = new Map()
  for (const p of plates) {
    const svgPath = String(p.svg ?? `${p.id}.svg`).replace(/^plates\//, '')
    const file = P('src/data/plates', svgPath)
    if (!existsSync(file)) continue
    const svg = readFileSync(file, 'utf8')
    const letters = [...svg.matchAll(/<text[^>]*>([APRLSI])<\/text>/g)].map((m) => m[1])
    const allowed = ALLOWED[p.orientation] ?? []
    const unexpected = letters.filter((l) => !allowed.includes(l))
    if (unexpected.length) problems.push(`${p.id} (${p.orientation}) carries ${unexpected.join(',')}`)
    summary.push(`${p.id}=${letters.join('')}`)
    const dup = letters.length !== new Set(letters).size
    if (dup) problems.push(`${p.id} repeats an orientation letter (${letters.join(',')})`)
    for (const l of letters) letterCounts.set(l, (letterCounts.get(l) ?? 0) + 1)
  }
  problems.length === 0
    ? ok(`each plate's frame letters are the two axes its plane allows (${summary.length} plates)`)
    : bad('plate orientation letter on the wrong axis', problems.join(' · '))
  info(`frames: ${summary.join(' · ')}`)
  /* A sagittal PLATE need not label the lateral axis — it is a single-hemisphere
     or midline view (plate-tel-sagittal-hemisphere, plate-sagittal-midline). A
     transverse or coronal plate does need both lateral letters, because left and
     right are the two halves it is cutting. */
  const lateralPlates = plates.filter((p) => p.orientation === 'transverse' || p.orientation === 'coronal')
  const withoutLateral = lateralPlates.filter((p) => {
    const svgPath = String(p.svg ?? `${p.id}.svg`).replace(/^plates\//, '')
    if (!existsSync(P('src/data/plates', svgPath))) return true
    const svg = readFileSync(P('src/data/plates', svgPath), 'utf8')
    const letters = [...svg.matchAll(/<text[^>]*>([APRLSI])<\/text>/g)].map((m) => m[1])
    return !(letters.includes('R') && letters.includes('L'))
  })
  withoutLateral.length === 0
    ? ok(`every transverse/coronal plate carries both lateral letters (${lateralPlates.length} plates; the ${plates.length - lateralPlates.length} sagittal plates are single-view and excluded by plane)`)
    : bad('a transverse/coronal plate is missing a lateral letter', withoutLateral.map((p) => p.id).join(' · '))
}
/* The letter census is printed, not asserted to a total: a plate's frame is the
   data, and pinning 60 would fail on a legitimate redraw. What IS pinned is that
   every plate has a frame of exactly four letters — the pre-v15 plates all do,
   and a dropped frame letter is the defect this reports. */
start('9b. every plate frame holds exactly four orientation letters')
{
  const bad = []
  for (const p of plates) {
    const svgPath = String(p.svg ?? `${p.id}.svg`).replace(/^plates\//, '')
    if (!existsSync(P('src/data/plates', svgPath))) continue
    const svg = readFileSync(P('src/data/plates', svgPath), 'utf8')
    const letters = [...svg.matchAll(/<text[^>]*>([APRLSI])<\/text>/g)].map((m) => m[1])
    if (letters.length !== 4) bad.push(`${p.id} has ${letters.length} (${letters.join('')})`)
  }
  bad.length === 0 ? ok(`all ${plates.length} plate frames hold exactly four letters`) : bad('plate frame with the wrong letter count', bad.join(' · '))
}

/* ══════════════════════════ 10. nerve courses ════════════════════════════ */
start('10. every nerve course anchors on a real landmark and clears the box by 6.00 au')
{
  const src = read('src/geometry/curves.ts')
  const block = src.slice(src.indexOf('export const NERVE_COURSES'), src.indexOf('export const NERVE_COURSE_IDS'))
  const chunks = block.split(/\n  \{\n/).slice(1)
  equal('src/geometry/curves.ts declares the 12 cranial-nerve courses', chunks.length, 12)
  const problems = []
  let minClear = Infinity
  let minId = ''
  const rows = []
  for (const ch of chunks) {
    const id = /id: '([^']+)'/.exec(ch)?.[1]
    const anchorId = /anchorId: '([^']+)'/.exec(ch)?.[1]
    const wps = /waypoints:\s*\[([\s\S]*?)\n\s{4}\]/.exec(ch)?.[1] ?? ''
    const pts = [...wps.matchAll(/\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])])
    if (!id) { problems.push('a course has no id'); continue }
    if (!IDS.has(id)) problems.push(`${id} is not an authored record`)
    if (anchorId && !IDS.has(anchorId) && !/^tract-/.test(anchorId)) problems.push(`${id} anchorId "${anchorId}" does not resolve`)
    if (pts.length < 2) problems.push(`${id} has ${pts.length} waypoints`)
    for (const p of pts) if (!insideClip(p)) problems.push(`${id} waypoint ${JSON.stringify(p)} is outside CLIP_BOUNDS`)
    for (const p of pts) {
      const clearance = Math.min(58 - Math.abs(p[0]), p[1] + 55, 116 - p[1], p[2] + 76, 72 - p[2])
      if (clearance < minClear) { minClear = clearance; minId = id }
      if (clearance < 6) problems.push(`${id} waypoint ${JSON.stringify(p)} clears the box by only ${clearance.toFixed(2)} au`)
    }
    rows.push(`${id}→${anchorId ?? '—'}`)
  }
  problems.length === 0
    ? ok(`all 12 courses have a resolving anchorId(a real record) and ≥6.00 au clearance (minimum ${minClear.toFixed(2)} au at ${minId})`)
    : bad('nerve-course problem', problems.join(' · '))
  info(`anchors: ${rows.join(' · ')}`)
}

/* ══════════════════════════ 11. nerve payload budget ════════════════════ */
start('11. the nerve courses still cost zero GLB bytes (route (a) unchanged)')
{
  equal(`the committed manifest still holds 138 parts`, parts.length, 138)
  const nrvGlb = parts.filter((p) => String(p.slug ?? p.id ?? '').startsWith('nrv-'))
  nrvGlb.length === 0 ? ok('no nrv-*.glb part in the manifest') : bad('a nerve record owns a manifest part', nrvGlb.map((p) => p.slug).join(' · '))
  const glbFiles = readdirSync(P('src/assets/anatomy')).filter((n) => n.endsWith('.glb'))
  const nrvFiles = glbFiles.filter((n) => n.startsWith('nrv-'))
  nrvFiles.length === 0 ? ok(`no nrv-*.glb committed (${glbFiles.length} GLBs on disk)`) : bad('an nrv-*.glb exists on disk', nrvFiles.join(' · '))
}

/* ══════════════════════════ 12. the audit's own arithmetic ═══════════════ */
start('12. the v15 audit output is present and its counts are self-consistent')
{
  const REPORT = P('docs/audit/v15/REPORT.md')
  truthy('docs/audit/v15/REPORT.md exists and is non-empty', existsSync(REPORT) && readFileSync(REPORT, 'utf8').trim().length > 0)
  const findingsFiles = readdirSync(P('docs/audit/v15')).filter((n) => n.endsWith('.findings.json'))
  equal('six auditor findings files are present', findingsFiles.length, 6)
  let total = 0
  const byVerdict = { ok: 0, wrong: 0, suspect: 0, 'unverifiable-here': 0 }
  const bySeverity = { critical: 0, major: 0, minor: 0 }
  const KEY_KEYS = ['id', 'area', 'recordId', 'field', 'claimed', 'expected', 'verdict', 'severity', 'basis', 'basisKind', 'suggestedFix', 'notes']
  const missingKeys = []
  for (const f of findingsFiles) {
    const j = json('docs/audit/v15', f)
    for (const x of j.findings ?? []) {
      total++
      byVerdict[x.verdict] = (byVerdict[x.verdict] ?? 0) + 1
      bySeverity[x.severity] = (bySeverity[x.severity] ?? 0) + 1
      for (const k of KEY_KEYS) if (x[k] === undefined) missingKeys.push(`${f}:${x.id}.${k}`)
      if (!['ok', 'wrong', 'suspect', 'unverifiable-here'].includes(x.verdict)) missingKeys.push(`${f}:${x.id} bad verdict "${x.verdict}"`)
      if (!['critical', 'major', 'minor'].includes(x.severity)) missingKeys.push(`${f}:${x.id} bad severity "${x.severity}"`)
      /* A finding's `recordId` is the thing the finding is ABOUT, which is not
         always a structure: a level anchor (`lvl-*`), a syndrome card (`syn-*`)
         and a record-set phrase are all legitimate. Only a claim naming an id
         that resolves to nothing at all is reported. */
      const rid = x.recordId === undefined || x.recordId === null ? null : String(x.recordId)
      if (rid !== null && !/^\(|^all |^the |^record-set|^both |^plate-|^every /.test(rid)) {
        /* Strip a trailing qualifier — "nuc-trigeminal-motor (linked by …)" and
           "a, b, c" both name real ids with prose around them. */
        /* Strip a trailing qualifier — "nuc-trigeminal-motor (linked by …)" and
           "a, b, c" both name real ids with prose around them. A head carrying a
           `…` is the auditor's own range shorthand ("ctx-s1-toe … ctx-s1-larynx")
           and names ids on both ends, so it is not a dangling reference. */
        const heads = rid
          .split(/\s+\(/)[0]
          .split(/\s*\+\s*/)[0]
          .split(/\s*,\s*/)
          .map((s) => s.trim())
          .filter(Boolean)
        const unknownHeads = heads.filter((h) => !h.includes('…') && !h.includes('...') && !IDS.has(h) && !LEVEL_IDS.has(h) && !SYNDROME_IDS.has(h))
        if (unknownHeads.length) missingKeys.push(`${f}:${x.id} recordId "${rid}" → ${unknownHeads.join(', ')} does not resolve`)
      }
    }
  }
  equal('the audit holds 517 findings (113 applied · 25 rejected · 4 open · 375 ok)', total, 517)
  equal('verdict census is ok 375 · wrong 71 · suspect 67 · unverifiable-here 4', byVerdict, { ok: 375, wrong: 71, suspect: 67, 'unverifiable-here': 4 })
  equal('severity census is critical 5 · major 44 · minor 468', bySeverity, { critical: 5, major: 44, minor: 468 })
  missingKeys.length === 0
    ? ok('every finding carries its 12 schema keys, a valid verdict and a valid severity')
    : bad('finding schema problem', missingKeys.slice(0, 8).join(' · ') + (missingKeys.length > 8 ? ` (+${missingKeys.length - 8})` : ''))
  const LEDGER = P('docs/audit/v15/CORRECTIONS.md')
  truthy('docs/audit/v15/CORRECTIONS.md exists', existsSync(LEDGER))
  const ledgerText = existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8') : ''
  /* Only the per-finding disposition cells carry `**applied**`; §1's legend table
     explains the word once in a `**applied**` cell of its own, hence the −1. */
  const appliedCells = (ledgerText.match(/\*\*applied\*\*/g) ?? []).length
  const applied = appliedCells - 1
  equal('the ledger still records 113 applied corrections', applied, 113)
  const rejected = (ledgerText.match(/NOT APPLIED/g) ?? []).length
  truthy('the ledger still records the rejected findings', rejected >= 20, `${rejected} rows`)
  const openRows = (ledgerText.match(/\| open \|/g) ?? []).length
  truthy('the ledger still records the open (unverifiable-here) rows', openRows >= 4, `${openRows} rows`)
  const reportText = existsSync(REPORT) ? readFileSync(REPORT, 'utf8') : ''
  truthy('REPORT.md states the unverifiable-here / rejected questions explicitly', /unverifiable-here/i.test(reportText) && /rejected/i.test(reportText))
  truthy('REPORT.md states what the audit cannot establish (no imaging, no specimen)', /not\s+(?:validated|verified)|no finding was validated|cannot establish/i.test(reportText))
}

/* ══════════════════════ 13. cross-file reference integrity ═══════════════ */
/* Added at v19 by the final-review task (plan §3.8 item 5). WHY: the v19
 * corrections pass renamed no id, but it DID re-point references (a syndrome card
 * dropped a structure, an artery gained a territory entry, a laterality flipped a
 * record from paired to midline, a vessel course's origin3d was moved onto its own
 * first waypoint). Nothing checked that every id NAMED anywhere in the data still
 * resolves — which is exactly the class of damage a rename or a deletion leaves
 * behind, and this project's known failure mode is a check that cannot see it.
 *
 * Two assertions:
 *   (a) STRUCTURED references must all resolve — `parent`, `territory[]`,
 *       `supply[]`, `vesselCourse.parentArtery`, `vesselCourse.surface`,
 *       `anchors.mesh`, and every syndrome `structures[]` entry. Domain: authored
 *       record ids ∪ syndrome ids ∪ level ids ∪ plate ids ∪ committed manifest
 *       slugs (a `LINKS` body is a legitimate reference target).
 *   (b) FREE TEXT is swept for id-shaped tokens: every `(nuc|tract|vent|surf|vasc|
 *       ctx|nrv|syn|lvl|plate)-…` token in every structure, tract and syndrome
 *       string must resolve, except for a PINNED, printed allowlist of five
 *       non-reference tokens. The allowlist is itself asserted, so it cannot grow
 *       silently — adding to it is a visible edit to this file. */
start('13. every id named anywhere in the data resolves (the orphaned-reference sweep)')
{
  const manifestSlugs = new Set(parts.map((p) => String(p.slug ?? p.id ?? '')))
  const REF_DOMAIN = new Set([...IDS, ...SYNDROME_IDS, ...LEVEL_IDS, ...plates.map((p) => p.id), ...manifestSlugs])
  const resolves = (v) => typeof v === 'string' && v !== '' && REF_DOMAIN.has(v)
  const unresolved = []
  const note = (where, field, value) => unresolved.push(`${where}.${field} → ${value}`)
  for (const r of structures) {
    if (r.parent !== undefined) note(r.id, 'parent', r.parent)
    for (const t of r.territory ?? []) note(r.id, 'territory[]', t)
    for (const s of r.supply ?? []) note(r.id, 'supply[]', s)
    for (const m of r.mesh ?? []) note(r.id, 'mesh[]', m)
    if (r.anchors !== undefined && r.anchors.mesh !== undefined) note(r.id, 'anchors.mesh', r.anchors.mesh)
    if (r.vesselCourse !== undefined) {
      if (r.vesselCourse.parentArtery !== undefined) note(r.id, 'vesselCourse.parentArtery', r.vesselCourse.parentArtery)
      if (r.vesselCourse.surface !== undefined && r.vesselCourse.surface !== null) note(r.id, 'vesselCourse.surface', r.vesselCourse.surface)
    }
  }
  for (const s of syndromes) for (const id of s.structures ?? []) note(s.id, 'structures[]', id)
  const dangling = unresolved.filter((entry) => !resolves(entry.split(' → ')[1]))
  const refCount =
    structures.reduce((n, r) => n + (r.territory?.length ?? 0) + (r.supply?.length ?? 0) + (r.mesh?.length ?? 0) + (r.parent === undefined ? 0 : 1), 0) +
    syndromes.reduce((n, s) => n + (s.structures?.length ?? 0), 0)
  dangling.length === 0
    ? ok(`every structured reference resolves (${refCount} reference value(s) over ${structures.length} records + ${syndromes.length} cards)`)
    : bad('a structured reference points at an id that does not exist', dangling.slice(0, 10).join(' · ') + (dangling.length > 10 ? ` (+${dangling.length - 10})` : ''))

  /* ── (b) the free-text sweep ─────────────────────────────────────────────── */
  /* These five tokens are prose, not references, and each names itself as such:
   *   plate-2                  — a finding alias in a plate contextNote
   *   vasc-course-probe        — a probe name in a course contextNote
   *   vasc-inventory/vasc-acquire — document/task stems, not records
   *   tract-level              — an adjective ("tract-level finding") in two tracts */
  const PROSE_ALLOWLIST = ['plate-2', 'tract-level', 'vasc-acquire', 'vasc-course-probe', 'vasc-inventory']
  const ID_SHAPED = /\b(?:nuc|tract|vent|surf|vasc|ctx|nrv|syn|lvl|plate)-[a-z0-9][a-z0-9-]*/g
  const orphans = new Map()
  const walkText = (node, where) => {
    if (typeof node === 'string') {
      for (const match of node.match(ID_SHAPED) ?? []) {
        const token = match.replace(/[.,;:)\]]+$/, '')
        if (REF_DOMAIN.has(token) || PROSE_ALLOWLIST.includes(token)) continue
        if (!orphans.has(token)) orphans.set(token, [])
        if (orphans.get(token).length < 3) orphans.get(token).push(where)
      }
      return
    }
    if (Array.isArray(node)) { node.forEach((entry, index) => walkText(entry, `${where}[${index}]`)); return }
    if (node !== null && typeof node === 'object') for (const [key, value] of Object.entries(node)) walkText(value, `${where}.${key}`)
  }
  for (const r of structures) walkText(r, `${r.__file}:${r.id}`)
  for (const t of tracts) walkText(t, `tracts.json:${t.id}`)
  for (const s of syndromes) walkText(s, `${s.__file}:${s.id}`)
  orphans.size === 0
    ? ok('no id-shaped token anywhere in the data text is unresolvable (a renamed or deleted id left behind would appear here)')
    : bad(
      'unresolvable id-shaped token(s) in the data text — either a stale reference or a new prose token to add to PROSE_ALLOWLIST',
      [...orphans.entries()].slice(0, 8).map(([token, where]) => `${token} (${where[0]})`).join(' · '),
    )
  equal('the prose allowlist is exactly the documented five tokens (it cannot grow silently)', [...PROSE_ALLOWLIST].sort(), PROSE_ALLOWLIST)
  info(`reference domain: ${IDS.size} record ids · ${SYNDROME_IDS.size} syndrome ids · ${LEVEL_IDS.size} level ids · ${plates.length} plate ids · ${manifestSlugs.size} manifest slugs`)
}

/* ═══════════════ 14. vessel courses start on their parent artery ═════════ */
/* Added at v19 by the final-review task (plan §3.8 item 5). WHY: the v19 pass
 * moved `vasc-sca-vermian-branches`'s origin3d ~30 au, from [5.2, 10.7, −13.6] to
 * its own documented first waypoint, and nothing asserted that a vessel course
 * STARTS anywhere near the artery it branches from. A course whose first waypoint
 * drifts off its parent is a silent anatomical error that no count catches.
 *
 * Measured two ways, because "near" is not one number:
 *   • the parent (`vesselCourse.parentArtery`, else the record's `parent`) must own
 *     at least one committed manifest body — a renamed parent fails here;
 *   • the first waypoint must either lie ON that body (≤ 0.5 au from its bbox) or
 *     the course must DECLARE its provenance (`basis` in {documented-course,
 *     bp3d-element} AND a `waypointBasis[0]` AND an `anchorNote`) — which is what
 *     the four distal MCA branches do: they arise beyond the committed M1/M2 mesh,
 *     on the cortex they were projected onto.
 * Covers both sources: the 39 authored JSON courses and the 4 `BUILT_IN_VESSEL_COURSES`
 * chunks in `src/geometry/vasculature-courses.ts` (their symbolic first waypoint —
 * `M1_TAKEOFF` … — is resolved from the literal constant table in the same file). */
start('14. every vessel course starts on its parent artery, or states its provenance')
{
  const manifestSlugs2 = parts
  const bodyOfParent = (parent) => manifestSlugs2.filter((p) => {
    const slug = String(p.slug ?? '')
    return slug === parent || slug.startsWith(`${parent}-`)
  })
  const distToBox = (point, box) => {
    let sum = 0
    for (let axis = 0; axis < 3; axis += 1) {
      const v = point[axis]
      const lo = box.min[axis]
      const hi = box.max[axis]
      const d = v < lo ? lo - v : v > hi ? v - hi : 0
      sum += d * d
    }
    return Math.sqrt(sum)
  }
  const courseSrc = read('src/geometry/vasculature-courses.ts')
  const literalConstants = new Map()
  for (const m of courseSrc.matchAll(/const ([A-Z0-9_]+)\s*:\s*[A-Za-z0-9_]+\s*=\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)) {
    literalConstants.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])])
  }
  const rows = []
  /* (a) the authored JSON courses */
  for (const r of structures) {
    const vc = r.vesselCourse
    if (vc === undefined || !Array.isArray(vc.waypoints)) continue
    rows.push({
      id: r.id,
      source: 'authored json',
      parent: vc.parentArtery ?? r.parent ?? null,
      first: vc.waypoints[0],
      basis: vc.basis ?? null,
      waypointBasis: Array.isArray(vc.waypointBasis) ? vc.waypointBasis : [],
      hasAnchorNote: typeof vc.anchorNote === 'string' && vc.anchorNote.trim().length > 0,
    })
  }
  /* (b) the TS built-in courses */
  const builtInBlock = courseSrc.slice(
    courseSrc.indexOf('export const BUILT_IN_VESSEL_COURSES'),
    courseSrc.indexOf('export const VESSEL_COURSES'),
  )
  const chunks = builtInBlock.split(/\n  \{\n/).slice(1)
  if (chunks.length === 0) bad('the BUILT_IN_VESSEL_COURSES block could not be split into records — this check would pass vacuously')
  for (const chunk of chunks) {
    const id = /id: '([^']+)'/.exec(chunk)?.[1]
    const raw = /waypoints:\s*\[([\s\S]*?)\]/.exec(chunk)?.[1] ?? ''
    const firstToken = raw.split(',')[0].trim().replace(/^\[/, '')
    let first = literalConstants.get(firstToken) ?? null
    if (first === null) {
      const nums = /(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/.exec(firstToken)
      if (nums !== null) first = [Number(nums[1]), Number(nums[2]), Number(nums[3])]
    }
    if (first === null) {
      const nums = /(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/.exec(raw)
      if (nums !== null) first = [Number(nums[1]), Number(nums[2]), Number(nums[3])]
    }
    rows.push({
      id: id ?? '(no id)',
      source: 'built-in ts',
      parent: /parent: '([^']+)'/.exec(chunk)?.[1] ?? null,
      first,
      basis: /basis: '([^']+)'/.exec(chunk)?.[1] ?? null,
      waypointBasis: [...chunk.matchAll(/waypointBasis:\s*\[([^\]]*)\]/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean)),
      hasAnchorNote: /anchorNote:\s*'/.test(chunk),
    })
  }
  equal('the check really read both course sources (39 authored JSON courses + 4 built-in chunks = 43 rows)', rows.length, 43)
  const unknownParent = rows.filter((row) => row.parent === null || bodyOfParent(row.parent).length === 0)
  unknownParent.length === 0
    ? ok(`every course's parent artery owns a committed manifest body (${rows.length} courses, ${new Set(rows.map((r) => r.parent)).size} distinct parents)`)
    : bad('course parent with no committed body (renamed parent?)', unknownParent.map((r) => `${r.id} → ${r.parent}`).join(' · '))
  const unparsed = rows.filter((row) => !Array.isArray(row.first) || row.first.length !== 3 || row.first.some((v) => !Number.isFinite(v)))
  unparsed.length === 0
    ? ok('every course\'s first waypoint was parsed to three finite numbers (no vacuous skip)')
    : bad('first waypoint could not be parsed', unparsed.map((r) => `${r.id} (${r.source})`).join(' · '))
  const measured = []
  const unfounded = []
  for (const row of rows) {
    if (unparsed.includes(row)) continue
    const bodies = bodyOfParent(row.parent)
    if (bodies.length === 0) continue
    const distance = Math.min(...bodies.map((body) => distToBox(row.first, body.bbox)))
    row.distance = distance
    measured.push(row)
    const onParent = distance <= 0.5
    const declaresProvenance =
      ['documented-course', 'bp3d-element'].includes(row.basis) &&
      row.waypointBasis.length > 0 &&
      row.hasAnchorNote
    if (!onParent && !declaresProvenance) unfounded.push(`${row.id} (${distance.toFixed(2)} au off ${row.parent})`)
  }
  unfounded.length === 0
    ? ok(`every course either starts on its parent's committed body or declares its provenance (${measured.filter((r) => r.distance <= 0.5).length} on-body, ${measured.filter((r) => r.distance > 0.5).length} declared-offset)`)
    : bad('course starts off its parent artery with no declared provenance', unfounded.join(' · '))
  const offsets = measured.filter((row) => row.distance > 0.5).sort((a, b) => b.distance - a.distance)
  info(
    `off-parent courses (measured distance from waypoint[0] to the parent body's bbox): ` +
      (offsets.length === 0 ? 'none' : offsets.map((row) => `${row.id} ${row.distance.toFixed(2)} au (${row.basis})`).join(' · ')) +
      ` · max on any course ${Math.max(...measured.map((row) => row.distance)).toFixed(2)} au`,
  )
  info(`sources: ${rows.filter((r) => r.source === 'authored json').length} authored JSON + ${rows.filter((r) => r.source === 'built-in ts').length} built-in TS`)
}

/* ═══════════ 15. every structure kind has a material preset ══════════════ */
/* Added at v19 by the final-review task (plan §3.8 item 5). WHY: `KIND_OPACITY`,
 * `hintForKind` and `makeAnatomyMaterial` are three tables that must agree — a kind
 * with no opacity entry renders `undefined`, a hint with no `case` falls through to
 * the nucleus preset silently, and a manifest `materialHint` outside the enum is
 * exactly the v19 `mat-2` finding (12 parts declare `gray-matter`, none renders
 * with it). Nothing connected the four lists to each other until now. */
start('15. every structure kind and every manifest hint has a material preset')
{
  const loadSrc = read('src/data/load.ts')
  const kindsRaw = /export const ALL_KINDS[^=]*=\s*\[([^\]]*)\]/.exec(loadSrc)?.[1] ?? ''
  const KINDS = [...kindsRaw.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
  const matSrc = read('src/geometry/materials.ts')
  const HINTS = [...(/export const MATERIAL_HINTS = \[([^\]]*)\]/.exec(matSrc)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
  const nucleusSrc = read('src/components/viewer3d/NucleusMesh.tsx')
  const opacityBlock = /export const KIND_OPACITY[^=]*=\s*\{([\s\S]*?)\n\}/.exec(nucleusSrc)?.[1] ?? ''
  const OPACITY_KEYS = [...opacityBlock.matchAll(/^\s*([a-z-]+)\s*:/gm)].map((m) => m[1])
  const dispatched = [...(/export function makeAnatomyMaterial[\s\S]*?\n\}/.exec(matSrc)?.[0] ?? '').matchAll(/case '([a-z-]+)'/g)].map((m) => m[1])
  const hintReturns = [...(/export function hintForKind[\s\S]*?\n\}/.exec(nucleusSrc)?.[0] ?? '').matchAll(/return '([a-z-]+)'/g)].map((m) => m[1])
  const hintBranches = [...(/export function hintForKind[\s\S]*?\n\}/.exec(nucleusSrc)?.[0] ?? '').matchAll(/kind === '([a-z-]+)'/g)].map((m) => m[1])
  truthy('the four tables were really parsed (a regex miss must fail, not pass)', KINDS.length === 7 && HINTS.length === 6 && OPACITY_KEYS.length > 0 && dispatched.length > 0,
    `${KINDS.length} kinds · ${HINTS.length} hints · ${OPACITY_KEYS.length} opacity keys · ${dispatched.length} dispatch cases`)
  equal('KIND_OPACITY covers exactly ALL_KINDS (a kind with no opacity renders undefined)', [...OPACITY_KEYS].sort(), [...KINDS].sort())
  const missingCase = HINTS.filter((hint) => !dispatched.includes(hint))
  missingCase.length === 0
    ? ok(`every MATERIAL_HINT has a factory preset in makeAnatomyMaterial (${HINTS.join(', ')})`)
    : bad('material hint with no factory case — it silently renders as the nucleus preset', missingCase.join(' · '))
  const hintManifest = [...new Set(parts.map((p) => String(p.materialHint ?? '')))].filter(Boolean)
  const unknownHints = hintManifest.filter((hint) => !HINTS.includes(hint))
  unknownHints.length === 0
    ? ok(`every manifest materialHint is a declared hint (${hintManifest.length} distinct over ${parts.length} parts: ${hintManifest.join(', ')})`)
    : bad('manifest part declares a materialHint outside MATERIAL_HINTS', unknownHints.join(' · '))
  const badReturns = hintReturns.filter((hint) => !HINTS.includes(hint))
  const uncoveredKinds = KINDS.filter((kind) => !hintBranches.includes(kind) && !hintReturns.includes('nucleus'))
  badReturns.length === 0 && uncoveredKinds.length === 0
    ? ok(`hintForKind returns only declared hints and covers every kind (${hintBranches.length} explicit branches + the default)`)
    : bad('hintForKind returns an undeclared hint or leaves a kind uncovered', `returns ${badReturns.join(', ') || 'ok'} · uncovered ${uncoveredKinds.join(', ') || 'none'}`)
  const opacity = Object.fromEntries([...opacityBlock.matchAll(/^\s*([a-z-]+)\s*:\s*([\d.]+)/gm)].map((m) => [m[1], Number(m[2])]))
  info(`kinds ${KINDS.join(', ')} · hints ${HINTS.join(', ')} · opacity ${KINDS.map((k) => `${k}=${opacity[k]}`).join(' ')} · hintForKind returns ${[...new Set(hintReturns)].join('/')}`)
}

/* ═══════════ 16. the v19 corrections that had no gate now have one ════════ */
/* Added at v19 by the final-review task. WHY: the corrections pass landed five
 * DATA changes and one CODE de-duplication whose only record was a prose row in
 * `docs/audit/v19/CORRECTIONS.md` — a claim with no gate, which is this project's
 * own definition of an untested claim. Each is pinned here at its post-fix value,
 * with the reason it is true (so a future editor can tell a regression from a
 * deliberate re-authoring). */
start('16. the v19 corrections are pinned (they had no gate before this one)')
{
  const byRecordId = new Map(structures.map((r) => [r.id, r]))
  const acoa = byRecordId.get('vasc-anterior-communicating-artery')
  equal(
    'vasc-anterior-communicating-artery.supply[] names the hypothalamus only (uc-19 FAC-VN-001: the ACoA is not the tuberothalamic supply)',
    acoa?.supply, ['syn-hypothalamic'],
  )
  const thalamogeniculate = byRecordId.get('vasc-pca-thalamogeniculate-arteries')
  equal(
    'vasc-pca-thalamogeniculate-arteries.supply[] names Dejerine-Roussy only (uc-19 FAC-VN-002: one perforator must not own two thalamic syndromes)',
    thalamogeniculate?.supply, ['syn-dejerine-roussy'],
  )
  const acha = byRecordId.get('vasc-anterior-choroidal-artery')
  truthy(
    'vasc-anterior-choroidal-artery.territory[] contains nuc-subthalamic (uc-19 FAC-VN-005: the artery that causes hemiballismus supplies its target)',
    Array.isArray(acha?.territory) && acha.territory.includes('nuc-subthalamic'),
    `${acha?.territory?.length ?? 0} territory entries`,
  )
  const claude = syndromes.find((s) => s.id === 'syn-claude')
  equal(
    'syn-claude.structures[] does not name the cerebellar dentate nucleus (uc-19 FAC-SYN-001: a paramedian PCA midbrain infarct cannot damage it)',
    claude?.structures, ['nuc-red-nucleus', 'nuc-oculomotor', 'tract-scp'],
  )
  /* The dc-01 de-duplication: the structure pass had TWO guards for the same
   * predicate, the second unreachable. This is the compensating assertion for
   * `verify:vessel-render`'s §3 source pin, which still expects the deleted line
   * (see docs/audit/v19/REPORT.md — that pin is outside the final-review write
   * scope). It pins the MERGED guard, so the render rule is still gate-protected. */
  const sceneSrc = read('src/components/viewer3d/SceneLayers.tsx')
  truthy(
    'the 3D structure pass suppresses an ellipsoid for a course-bearing nerve/vessel in ONE reachable guard (uc-19 dc-01)',
    /if \(hasNerveCourse\(record\.id\) \|\| hasVesselCourse\(record\.id\) \|\| hasVesselCourseGroup\(record\.id\)\) return null/.test(sceneSrc),
  )
  /* The two plate frame corrections (FAC-TR-001, plate-4). The letters are the
   * only part of a plate's frame a reader uses to orient it, so they are pinned:
   * plate-thalamus-mid draws anterior at the BOTTOM (its own artwork measures
   * corr(cy, z) = +0.78), and plate-tel-sagittal-hemisphere draws it on the RIGHT
   * (frontal lobe at cx 520, occipital at cx 194) — the same reading as
   * plate-sagittal-midline. */
  const withLetters = (id) => {
    const manifestEntry = plates.find((p) => p.id === id)
    const svgPath = String(manifestEntry?.svg ?? `${id}.svg`).replace(/^plates\//, '')
    const svg = read('src/data/plates', svgPath)
    const rows = [...svg.matchAll(/<circle cx="(\d+)" cy="(\d+)"[^>]*\/><text[^>]*>([APRLSI])<\/text>/g)]
      .map((m) => ({ x: Number(m[1]), y: Number(m[2]), letter: m[3] }))
    return rows
  }
  const thalamusLetters = withLetters('plate-thalamus-mid')
  const byY = [...thalamusLetters].sort((a, b) => a.y - b.y)
  equal('plate-thalamus-mid frame letters match its artwork: P at the top, A at the bottom (uc-19 FAC-TR-001)',
    [byY[0]?.letter, byY[byY.length - 1]?.letter], ['P', 'A'])
  const telSagittalLetters = withLetters('plate-tel-sagittal-hemisphere')
  const byX = [...telSagittalLetters].sort((a, b) => a.x - b.x)
  equal('plate-tel-sagittal-hemisphere frame letters match its artwork: P left, A right (uc-19 plate-4)',
    [byX[0]?.letter, byX[byX.length - 1]?.letter], ['P', 'A'])
  info(`plate frames read from ${thalamusLetters.length + telSagittalLetters.length} labelled circles: plate-thalamus-mid ${byY.map((r) => r.letter).join('')} · plate-tel-sagittal-hemisphere ${byX.map((r) => r.letter).join('')}`)
}

/* ── verdict ─────────────────────────────────────────────────────────────── */
const failed = results.filter((r) => !r.pass)
console.log('\n' + '─'.repeat(64))
for (const g of groups) {
  console.log(`  ${g.failed === 0 ? '✓' : '✗'} ${g.title.split('.')[0].padStart(2)} · ${g.passed} passed · ${g.failed} failed`)
}
console.log(`\n  ${results.length} assertions · ${results.length - failed.length} passed · ${failed.length} failed`)
if (failed.length) {
  console.log('\nFAILURES:')
  for (const f of failed) console.log(`  ✗ ${f.label}${f.detail ? ' — ' + f.detail : ''}`)
  console.log('')
  process.exit(1)
}
console.log('\n✔ v15 audit facts PASSED (structural assertions over the shipped data)\n')
process.exit(0)
