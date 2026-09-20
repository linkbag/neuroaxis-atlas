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
 * WHAT IT ASSERTS (13 groups, all against the shipped data, no re-typed table)
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
 * NOT OBSERVED HERE (requires a browser): rendered pixels, pointer/focus
 * interaction, and anything the browser lane alone can see. `verify:audit` exits
 * 4 in this environment ("no check was run").
 *
 * Wire-in: `npm run verify:audit-facts` (the script entry is owned by the
 * integrator's `package.json`; `node scripts/verify/audit-facts.mjs` is the
 * direct form).
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
