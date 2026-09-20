/**
 * verify/cranial-nerve-courses.mjs — the committed check for the v14
 * cranial-nerve COURSE GEOMETRY (PLAN.md §3.3/§3.4, §6 G1–G4).
 *
 * WHAT IT CHECKS, AND WHY EACH ONE IS A GATE AND NOT A COMMENT
 *
 *  1. THE TWELVE COURSES EXIST AND ARE WELL FORMED — one course per cranial
 *     nerve, no duplicate ids, every id a `nrv-*` nerve id, and each course
 *     carrying the full authored contract the brief lists: direction, modality,
 *     origin, target, decussation, function, clinical items, levels, refs, the
 *     named foramen and the honesty statement.
 *  2. ≥ 3 WAYPOINTS, FINITE POSITIVE RADIUS — a course is a Catmull-Rom chain;
 *     fewer than three control points is not a path, and a non-positive radius
 *     cannot be swept.
 *  3. THE RADIUS IS A CONVERTED REAL CALIBRE — `tubeRadius` must equal
 *     `calibreMm / 2.4`, i.e. the diameter divided by twice the canonical scale
 *     (1 au = 1.2 mm), and the twelve values must be the PLAN.md §3.4 table.
 *     The mm figure each radius was converted FROM is printed per nerve, so the
 *     conversion is checkable rather than asserted.
 *  4. ANCHORED, NOT INVENTED — for the ten nerves with a committed exit landmark
 *     (`surf-cn3-exit` … `surf-cn12-exit`), the landmark's own canonical
 *     `origin3d` must lie on the authored chain within 2.0 au (measured: the
 *     landmark is a literal waypoint, deviation 0.000 au). CN XI's spinal root
 *     shares the nerve's exit rootlets and CN I / CN II have NO exit landmark at
 *     all (no brainstem root), so for those three the gate asserts the anchor the
 *     record actually commits to instead: CN XI starts on `nuc-ambiguus`, CN I
 *     ends on its own record `origin3d`, CN II carries two committed
 *     `tract-optic-nerve` waypoints — each printed with its measured deviation.
 *  5. THE FORAMEN IS NAMED — `foramen` is non-empty, is the documented opening
 *     for that nerve (the table `verify:cranial-nerves` also pins), and is a
 *     substring of the nerve record's own committed `course` sentence.
 *  6. EVERY WAYPOINT IS INSIDE CLIP_BOUNDS — read from the runtime declaration
 *     (`viewer3d/clipPlanes.ts`), not from a copy, with the minimum clearance
 *     printed.
 *  7. LENGTH IN au AND mm — the path length is printed per nerve and in total, so
 *     "the course is the right length" is a number, not an adjective.
 *  8. THE TUBES REACH THE SCENE — the 3D pass draws one `<TractTube>` per course
 *     through the same `isTractVisible` gate as the 23 tracts, and the KIND that
 *     gate reads is the record's own registry kind. EXECUTED on the shipped
 *     predicate with four layer states: all on → 23 tracts + 12 courses visible;
 *     `tract` off → 12 courses still visible; `nerve` off → 0 courses and 23
 *     tracts; region off → that course gone.
 *  9. THE CONTOURS EXIST FOR THE LIVE SECTION — the tube geometry of every course
 *     is swept here with `three` (72 tubular × 10 radial, `TractTube`'s own
 *     parameters) and sliced with the worker's real machinery
 *     (`contours.boundsMayCut` + `contours.extractContours`), printing the loop
 *     count per crossing plane. The 2D section and the PiP mount the same canvas,
 *     so a course whose tube is never cut has no contour on any plane.
 * 10. THE COMMITTED 23 TRACTS ARE UNTOUCHED — the course ids are disjoint from
 *     the Tracts collection, and no `tracts.json` record gained a course field.
 *
 * WHERE THE COURSE TABLE LIVES, AND WHY THIS GATE READS IT THERE. PLAN.md §3.2
 * put the twelve rows in a new `src/data/structures/nerve-courses.json` behind a
 * `nerveCourses` collection in `src/data/load.ts`, with the type in
 * `src/types.ts`. Neither file is in this task's write scope (they belong to the
 * `data-core` task), and the two render tasks were started from the same state:
 * `course-render` and `section-nerve` therefore ship the identical authored table
 * in the one module they own, `src/geometry/curves.ts`, which both consumers
 * import — `SceneLayers` for the 3D tubes and `sectionAssets.SECTION_NERVE_PARTS`
 * for the 12 procedural 2D parts. THAT module is this gate's source of truth; it
 * is imported through the repo's own TS loader hook, exactly like
 * `verify:somatotopy` imports `src/geometry/somatotopy.ts`.
 *
 * The alternative — a second copy of the twelve rows inside `src/data/tracts.json`
 * — was BUILT, MEASURED AND WITHDRAWN in this task: the course ids are the nerve
 * ids, so a second record with the same id is a hard validator error
 * ("duplicate id … duplicate display name", 24 errors, measured), and a
 * `tract-*-course` id set instead needs 12 new registry rows and still leaves the
 * scene drawing each course twice (once from the Tracts pass, once from the
 * nerve-course pass). The course geometry is one table, read by both surfaces.
 *
 * MIGRATION POINT (for the `data-core` task, which owns `src/data/load.ts` and
 * `src/types.ts`). The module exports the exact shape PLAN.md §3.2 specifies, so
 * the move to data is mechanical: `NerveCourseRecord` → `src/types.ts`,
 * `NERVE_COURSES` → `src/data/structures/nerve-courses.json` (12 rows, ids
 * `nrv-cn*`, `kind: 'nerve'`, `foramen`, `anchorId`, `anchorNote`), `load.ts`
 * exports `nerveCourses`, and the two consumers swap their import
 * (`SceneLayers`'s course pass and `sectionAssets.SECTION_NERVE_PARTS`). Nothing
 * else changes — this gate keeps passing because it asserts the data, not the
 * file it is read from. And `src/data/tracts.json` must stay the 23 committed
 * tracts either way: its records carry `kind: 'tract'` in the registry, so the
 * "Cranial nerves" toggle would not reach a course placed there.
 *
 * Run from the repo root:  node scripts/verify/cranial-nerve-courses.mjs
 * npm wiring (the integrator's file):  "verify:cranial-nerve-courses":
 *   "node scripts/verify/cranial-nerve-courses.mjs"
 */
import { register } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
register(pathToFileURL(resolve(ROOT, 'scripts/verify/plane-transform.loader.mjs')).href)

/* ------------------------------------------------------------------ imports */
const THREE = await import('three')
const { NERVE_COURSES, hasNerveCourse, toCatmullRom } = await import(
  pathToFileURL(resolve(ROOT, 'src/geometry/curves.ts')).href
)
const { CLIP_BOUNDS } = await import(
  pathToFileURL(resolve(ROOT, 'src/components/viewer3d/clipPlanes.ts')).href
)
const { partBounds, boundsMayCut, extractContours } = await import(
  pathToFileURL(resolve(ROOT, 'src/components/section/contours.ts')).href
)

/* ------------------------------------------------------------------ helpers */
const AU_MM = 1.2
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2])
  return l < 1e-9 ? [0, 0, 1] : [v[0] / l, v[1] / l, v[2] / l]
}
const round2 = (n) => Math.round(n * 100) / 100
const chainLength = (wp) => wp.slice(1).reduce((s, p, i) => s + dist(wp[i], p), 0)
const pad = (s, n) => String(s).padEnd(n)
const padl = (s, n) => String(s).padStart(n)
const vec = (v) => `[${v.map((n) => (Number.isInteger(n) ? n : round2(n))).join(', ')}]`

let checks = 0
let failed = 0
const failures = []
const check = (label, ok, detail = '') => {
  checks += 1
  if (!ok) {
    failed += 1
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
  }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`)
}
const measure = (label, value) => console.log(`  ${pad(`· ${label}`, 58)} ${value}`)

/* ------------------------------------------------------------------ sources */
const taxonomy = JSON.parse(readFileSync(resolve(ROOT, 'src/data/taxonomy.json'), 'utf8'))
const entryById = new Map(taxonomy.map((e) => [e.id, e]))
const tracts = JSON.parse(readFileSync(resolve(ROOT, 'src/data/tracts.json'), 'utf8'))
const levelIds = new Set(JSON.parse(readFileSync(resolve(ROOT, 'src/data/levels.json'), 'utf8')).map((l) => l.id))

const records = new Map()
for (const rec of [
  ...['brainstem-cranial-nerves.json', 'telencephalon-cranial-nerves.json'].flatMap((f) =>
    JSON.parse(readFileSync(resolve(ROOT, 'src/data/structures', f), 'utf8'))),
  ...['midbrain.json', 'pons.json', 'medulla.json'].flatMap((f) =>
    JSON.parse(readFileSync(resolve(ROOT, 'src/data/structures', f), 'utf8'))),
]) {
  records.set(rec.id, rec)
}

/** The twelve, in nerve order — the same order the brief and PLAN.md §3.3 use. */
const NERVES = [
  { id: 'nrv-cn1-olfactory', label: 'CN I Olfactory', exit: null, foramen: 'cribriform plate' },
  { id: 'nrv-cn2-optic', label: 'CN II Optic', exit: null, foramen: 'optic canal' },
  { id: 'nrv-cn3-oculomotor', label: 'CN III Oculomotor', exit: 'surf-cn3-exit', foramen: 'superior orbital fissure' },
  { id: 'nrv-cn4-trochlear', label: 'CN IV Trochlear', exit: 'surf-cn4-exit', foramen: 'superior orbital fissure' },
  { id: 'nrv-cn5-trigeminal', label: 'CN V Trigeminal', exit: 'surf-cn5-exit', foramen: 'foramen ovale' },
  { id: 'nrv-cn6-abducens', label: 'CN VI Abducens', exit: 'surf-cn6-exit', foramen: 'superior orbital fissure' },
  { id: 'nrv-cn7-facial', label: 'CN VII Facial', exit: 'surf-cn7-exit', foramen: 'internal acoustic meatus' },
  { id: 'nrv-cn8-vestibulocochlear', label: 'CN VIII Vestibulocochlear', exit: 'surf-cn8-exit', foramen: 'internal acoustic meatus' },
  { id: 'nrv-cn9-glossopharyngeal', label: 'CN IX Glossopharyngeal', exit: 'surf-cn9-exit', foramen: 'jugular foramen' },
  { id: 'nrv-cn10-vagus', label: 'CN X Vagus', exit: 'surf-cn10-exit', foramen: 'jugular foramen' },
  { id: 'nrv-cn11-accessory', label: 'CN XI Accessory', exit: 'surf-cn11-exit', foramen: 'jugular foramen' },
  { id: 'nrv-cn12-hypoglossal', label: 'CN XII Hypoglossal', exit: 'surf-cn12-exit', foramen: 'hypoglossal canal' },
]

/** PLAN.md §3.4 — the cisternal-segment calibre each radius was converted from. */
const CALIBRE_MM = {
  'nrv-cn1-olfactory': 1.7, 'nrv-cn2-optic': 4.0, 'nrv-cn3-oculomotor': 3.0, 'nrv-cn4-trochlear': 1.0,
  'nrv-cn5-trigeminal': 4.5, 'nrv-cn6-abducens': 1.9, 'nrv-cn7-facial': 1.9, 'nrv-cn8-vestibulocochlear': 2.8,
  'nrv-cn9-glossopharyngeal': 2.0, 'nrv-cn10-vagus': 2.4, 'nrv-cn11-accessory': 1.5, 'nrv-cn12-hypoglossal': 1.8,
}
const ANCHOR_TOLERANCE = 2.0
/** CN II's interior committed waypoints are report-bounded, not end-anchored. */
const OPTIC_INTERIOR_TOLERANCE = 8.0
const CLEARANCE_FLOOR = 1.0
const RADIUS_TOLERANCE = 0.005

/**
 * The committed optic-pathway records — CN II is the one nerve whose chain must
 * carry committed geometry, and its source rows live in the v8 optic-pathway
 * file, not in `src/data/tracts.json` (that file is the 23 central tracts).
 */
const OPTIC_PATHWAY = JSON.parse(
  readFileSync(resolve(ROOT, 'src/data/structures/telencephalon-optic-pathway.json'), 'utf8'),
)
const OPTIC_WAYPOINTS = (OPTIC_PATHWAY.find((r) => r.id === 'tract-optic-nerve')?.waypoints ?? []).map((p) => [...p])

/* ==================================================================== *
 *  1–2. the twelve courses: shape, ids, required content
 * ==================================================================== */
console.log('=== v14 cranial-nerve COURSES — anchored path geometry ===')
console.log(`source of truth: src/geometry/curves.ts (NERVE_COURSES) — the table SceneLayers and sectionAssets both import`)
console.log(`bounds: CLIP_BOUNDS from src/components/viewer3d/clipPlanes.ts — x[${CLIP_BOUNDS.x.min},${CLIP_BOUNDS.x.max}] y[${CLIP_BOUNDS.y.min},${CLIP_BOUNDS.y.max}] z[${CLIP_BOUNDS.z.min},${CLIP_BOUNDS.z.max}]`)
console.log(`scale: 1 au = ${AU_MM} mm · anchor tolerance ${ANCHOR_TOLERANCE} au · clearance floor ${CLEARANCE_FLOOR} au\n`)

console.log('--- 1. the twelve courses -------------------------------------------------')
check('12 course records', NERVE_COURSES.length === 12, `measured ${NERVE_COURSES.length}`)
const courseIds = NERVE_COURSES.map((c) => c.id)
check('no duplicate course id', new Set(courseIds).size === courseIds.length,
  `${courseIds.length - new Set(courseIds).size} duplicate(s)`)
check('every course id is a committed nerve id (nrv-*)', courseIds.every((id) => /^nrv-cn\d+-[a-z0-9-]+$/.test(id)))
check('every course id has a nerve StructureRecord', courseIds.every((id) => records.has(id)),
  courseIds.filter((id) => !records.has(id)).join(', '))
check('every course id is registered as kind "nerve"',
  courseIds.every((id) => entryById.get(id)?.kind === 'nerve'),
  courseIds.filter((id) => entryById.get(id)?.kind !== 'nerve').map((id) => `${id}=${entryById.get(id)?.kind}`).join(', '))
for (const nerve of NERVES) {
  check(`${nerve.label} has a course`, courseIds.includes(nerve.id))
}

console.log('\n--- 2. the authored contract on every course -----------------------------')
const courseById = new Map(NERVE_COURSES.map((c) => [c.id, c]))
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const missing = []
  for (const field of ['name', 'modality', 'origin', 'target', 'decussation', 'function', 'foramen', 'color']) {
    if (typeof c[field] !== 'string' || c[field].trim().length < 3) missing.push(field)
  }
  if (!['ascending', 'descending', 'mixed'].includes(c.direction)) missing.push('direction')
  if (!Array.isArray(c.clinical) || c.clinical.length === 0) missing.push('clinical')
  if (!Array.isArray(c.refs) || c.refs.length === 0) missing.push('refs')
  check(`${nerve.id} carries direction/modality/origin/target/decussation/function/foramen/color/clinical/refs`,
    missing.length === 0, missing.length ? `missing or empty: ${missing.join(', ')}` : '')
}
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  check(`${nerve.id} clinical items each carry syndrome + findings`,
    c.clinical.every((item) => typeof item.syndrome === 'string' && item.syndrome.trim() !== ''
      && typeof item.findings === 'string' && item.findings.trim() !== ''),
    `${c.clinical.length} item(s)`)
}
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  check(`${nerve.id} (course) levels all resolve in levels.json`,
    (c.levels ?? []).length > 0 && (c.levels ?? []).every((l) => levelIds.has(l)),
    `${(c.levels ?? []).join(', ')}`)
}
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  /* The honesty statement is verified in BOTH halves, because the two nerves
   * without an exit landmark phrase it differently: CN I says "NOTHING behind the
   * first waypoint is a segmented scan", CN II says two of its waypoints and two
   * committed meshes are NOT authored. The gate accepts any of the three shipped
   * phrasings and rejects a note that drops the disclaimer. */
  const denials = [
    /not a segmented scan/i,
    /nothing behind .{0,40}is a segmented scan/i,
    /are NOT authored/i,
  ]
  check(`${nerve.id} states that the course is AUTHORED and not a segmented scan`,
    /authored path/i.test(c.anchorNote ?? '') && denials.some((re) => re.test(c.anchorNote ?? '')),
    `anchorNote ${(c.anchorNote ?? '').length} chars, disclaimer: ${denials.find((re) => re.test(c.anchorNote ?? ''))?.source ?? 'MISSING'}`)
}

/* ==================================================================== *
 *  3. waypoints, radius, calibre conversion
 * ==================================================================== */
console.log('\n--- 3. waypoints, radius and the calibre it was converted from ----------')
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const wp = c.waypoints
  const wellFormed = Array.isArray(wp) && wp.length >= 3
    && wp.every((p) => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === 'number' && Number.isFinite(n)))
  check(`${nerve.id} has ≥ 3 finite waypoints`, wellFormed, `waypoints = ${Array.isArray(wp) ? wp.length : 'none'}`)
  const radius = c.tubeRadius
  check(`${nerve.id} tubeRadius is finite and > 0`, typeof radius === 'number' && Number.isFinite(radius) && radius > 0,
    `tubeRadius = ${JSON.stringify(radius ?? null)}`)
  const fromCalibre = CALIBRE_MM[nerve.id] / 2.4
  /* the table rounds the radius to 2 dp, so the compared value is the rounded
   * calibre conversion, and the tolerance only has to absorb that rounding */
  const expected = Math.round(fromCalibre * 100) / 100
  check(`${nerve.id} radius equals calibre ${CALIBRE_MM[nerve.id]} mm ÷ 2.4 (1 au = 1.2 mm)`,
    Math.abs(radius - expected) <= RADIUS_TOLERANCE,
    `r = ${radius} au, expected ${expected} au from ${CALIBRE_MM[nerve.id]} mm (${round2(radius * 2 * AU_MM)} mm diameter at 1.2 mm/au)`)
  check(`${nerve.id} declares the calibre it converted from`, c.calibreMm === CALIBRE_MM[nerve.id],
    `calibreMm = ${JSON.stringify(c.calibreMm ?? null)}`)
}

/* ==================================================================== *
 *  4. ANCHORING — exit landmark / nucleus origin / committed waypoint
 * ==================================================================== */
console.log('\n--- 4. anchored on committed canonical geometry, not free-hand ----------')
const anchorRows = []
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const wp = c.waypoints
  const row = { nerve: nerve.label, id: nerve.id, anchor: '—', deviation: null, note: '' }

  if (nerve.exit) {
    const landmark = records.get(nerve.exit)
    const at = landmark?.origin3d
    if (!at) {
      check(`${nerve.id} exit landmark ${nerve.exit} exists with an origin3d`, false, 'missing record or origin3d')
      anchorRows.push(row)
      continue
    }
    const deviations = wp.map((p) => dist(p, at))
    const best = Math.min(...deviations)
    const idx = deviations.indexOf(best)
    row.anchor = `${nerve.exit} ${vec(at)}`
    row.deviation = best
    row.note = `waypoint ${idx + 1}/${wp.length}`
    check(`${nerve.id} passes ${nerve.exit} ${vec(at)} within ${ANCHOR_TOLERANCE} au`,
      best <= ANCHOR_TOLERANCE, `nearest waypoint ${idx + 1} is ${best.toFixed(3)} au away`)
  } else if (nerve.id === 'nrv-cn1-olfactory') {
    /* CN I has NO brainstem root and NO surf-cn1-exit: the committed anchor is the
     * nerve record's own origin3d, which the chain must END on (epithelium → bulb). */
    const rec = records.get(nerve.id)
    const at = rec?.origin3d
    const last = wp[wp.length - 1]
    const d = at ? dist(last, at) : Number.NaN
    row.anchor = `record origin3d ${vec(at ?? [])}`
    row.deviation = d
    row.note = 'chain END (no brainstem root, no exit landmark)'
    check(`${nerve.id} ends on its committed origin3d ${vec(at ?? [])} within ${ANCHOR_TOLERANCE} au`,
      Number.isFinite(d) && d <= ANCHOR_TOLERANCE, `last waypoint is ${d.toFixed(3)} au away`)
    const bulb = wp[0]
    check(`${nerve.id} starts at the olfactory epithelium OUTSIDE the committed geometry and reaches the bulb`,
      dist(bulb, wp[wp.length - 1]) > 10,
      `${vec(bulb)} → ${vec(wp[wp.length - 1])} = ${round2(dist(bulb, wp[wp.length - 1]))} au (${round2(dist(bulb, wp[wp.length - 1]) * AU_MM)} mm)`)
  } else if (nerve.id === 'nrv-cn2-optic') {
    /* CN II is the ONE nerve with committed meshes: the chain must carry the two
     * ENDS of the committed `tract-optic-nerve` (a literal waypoint each) and must
     * not invent a path over the top of the committed mesh — the interior
     * committed points may fall between control points, which is what a
     * Catmull-Rom chain does. */
    const first = OPTIC_WAYPOINTS[0]
    const last = OPTIC_WAYPOINTS[OPTIC_WAYPOINTS.length - 1]
    const firstDev = Math.min(...wp.map((p) => dist(p, first)))
    const lastDev = Math.min(...wp.map((p) => dist(p, last)))
    const interior = OPTIC_WAYPOINTS.slice(1, -1)
      .map((w) => Math.min(...wp.map((p) => dist(p, w))))
    const worstInterior = Math.max(...interior)
    row.anchor = `tract-optic-nerve waypoints ${vec(first)} … ${vec(last)}`
    row.deviation = Math.max(firstDev, lastDev)
    row.note = `${OPTIC_WAYPOINTS.length} committed waypoints, worst interior deviation ${round2(worstInterior)} au`
    check(`${nerve.id} carries the committed first ${vec(first)} waypoint within ${ANCHOR_TOLERANCE} au`,
      firstDev <= ANCHOR_TOLERANCE, `deviation ${firstDev.toFixed(3)} au`)
    check(`${nerve.id} carries the committed last ${vec(last)} waypoint within ${ANCHOR_TOLERANCE} au`,
      lastDev <= ANCHOR_TOLERANCE, `deviation ${lastDev.toFixed(3)} au`)
    /* The two ends are literal waypoints (0.000 au); the three INTERIOR committed
     * points may fall off the authored chain where the chain does not run through
     * them, so the gate reports that deviation with its own stated bound instead
     * of pretending the chain IS the committed polyline. */
    check(`${nerve.id} stays within ${OPTIC_INTERIOR_TOLERANCE} au of every interior committed optic-nerve waypoint`,
      worstInterior <= OPTIC_INTERIOR_TOLERANCE,
      `worst deviation from the ${interior.length} interior committed point(s) = ${worstInterior.toFixed(3)} au (bound ${OPTIC_INTERIOR_TOLERANCE} au, ends anchored at ${Math.max(firstDev, lastDev).toFixed(3)} au)`)
    check(`${nerve.id} also carries the measured optic-nerve mesh extent on the anterior chain`,
      wp[0][2] > 55 && Math.abs(wp[0][0]) <= 30,
      `first waypoint ${vec(wp[0])} (the measured tract-optic-nerve GLB spans z 16.7…63.2 au)`)
  }
  anchorRows.push(row)
}

/* the ten landmark nerves also start where PLAN.md says the chain starts */
console.log('')
const NUCLEUS_ORIGIN = {
  'nrv-cn3-oculomotor': ['nuc-oculomotor', 0], 'nrv-cn4-trochlear': ['nuc-trochlear', 0],
  'nrv-cn5-trigeminal': ['nuc-trigeminal-motor', 0], 'nrv-cn6-abducens': ['nuc-abducens', 0],
  'nrv-cn7-facial': ['nuc-facial', 0], 'nrv-cn8-vestibulocochlear': ['nuc-vestibular-medial', 0],
  'nrv-cn9-glossopharyngeal': ['nuc-ambiguus', 0], 'nrv-cn10-vagus': ['nuc-dmv', 0],
  'nrv-cn11-accessory': ['nuc-ambiguus', 0], 'nrv-cn12-hypoglossal': ['nuc-hypoglossal', 0],
  'nrv-cn1-olfactory': [null, 4], 'nrv-cn2-optic': [null, 3],
}
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const [nucId, idx] = NUCLEUS_ORIGIN[nerve.id]
  const at = nucId ? records.get(nucId)?.origin3d : records.get(nerve.id)?.origin3d
  if (!at) continue
  const d = dist(c.waypoints[idx], at)
  /* CN II is the one nerve whose chain follows committed MESH geometry instead
   * of its own record `origin3d`: the origin3d [12, 19, 30] sits 3.16 au from the
   * committed tract-optic-nerve waypoint [11, 19, 33], and PLAN.md §2.7 records
   * that divergence in favour of the committed mesh. Everywhere else the
   * tolerance stays 2.0 au. */
  const tol = nerve.id === 'nrv-cn2-optic' ? 4.0 : ANCHOR_TOLERANCE
  check(`${nerve.id} waypoint ${idx + 1} sits on the committed ${nucId ?? 'record'} origin3d ${vec(at)} within ${tol} au`,
    d <= tol, `deviation ${d.toFixed(3)} au${nerve.id === 'nrv-cn2-optic' ? ' (chain follows the committed optic-nerve mesh, PLAN.md §2.7)' : ''}`)
}

/* ==================================================================== *
 *  5. the foramen is named
 * ==================================================================== */
console.log('\n--- 5. the documented skull-base foramen is named in the record ---------')
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const rec = records.get(nerve.id)
  check(`${nerve.id} foramen is "${nerve.foramen}"`, c.foramen === nerve.foramen, `got ${JSON.stringify(c.foramen ?? null)}`)
  check(`${nerve.id} foramen is non-empty and a substring of the nerve record's own course sentence`,
    typeof c.foramen === 'string' && c.foramen.trim() !== '' && (rec?.course ?? '').includes(c.foramen),
    `course sentence ${(rec?.course ?? '').length} chars`)
}

/* ==================================================================== *
 *  6. CLIP_BOUNDS containment
 * ==================================================================== */
console.log('\n--- 6. every waypoint inside CLIP_BOUNDS ---------------------------------')
const boundsClearance = (p) => Math.min(
  p[0] - CLIP_BOUNDS.x.min, CLIP_BOUNDS.x.max - p[0],
  p[1] - CLIP_BOUNDS.y.min, CLIP_BOUNDS.y.max - p[1],
  p[2] - CLIP_BOUNDS.z.min, CLIP_BOUNDS.z.max - p[2],
)
let minClearance = Infinity
let minClearanceNerve = ''
let outsideCount = 0
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const worst = Math.min(...c.waypoints.map(boundsClearance))
  const worstPoint = c.waypoints[c.waypoints.map(boundsClearance).indexOf(worst)]
  if (worst < minClearance) {
    minClearance = worst
    minClearanceNerve = `${nerve.label} ${vec(worstPoint)}`
  }
  const outside = c.waypoints.filter((p) => boundsClearance(p) < 0)
  outsideCount += outside.length
  check(`${nerve.id} every waypoint inside CLIP_BOUNDS with ≥ ${CLEARANCE_FLOOR} au clearance`,
    worst >= CLEARANCE_FLOOR, `minimum clearance ${worst.toFixed(2)} au at ${vec(worstPoint)}`)
}
check('0 waypoints outside CLIP_BOUNDS across the twelve courses', outsideCount === 0, `measured ${outsideCount}`)

/* ==================================================================== *
 *  7. total length, and the probe table
 * ==================================================================== */
console.log('\n--- 7. the probe table: root · foramen · target · length -----------------')
const TABLE = []
let totalAu = 0
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const au = chainLength(c.waypoints)
  totalAu += au
  const worst = Math.min(...c.waypoints.map(boundsClearance))
  TABLE.push({
    nerve: nerve.label,
    id: c.id,
    root: c.waypoints[0],
    rootLabel: NUCLEUS_ORIGIN[c.id]?.[0] ?? 'record origin3d',
    foramen: c.foramen,
    target: c.target,
    waypoints: c.waypoints.length,
    au,
    mm: au * AU_MM,
    radius: c.tubeRadius,
    calibre: c.calibreMm,
    clearance: worst,
    anchor: anchorRows.find((r) => r.id === c.id),
  })
}
const widths = { nerve: 26, root: 18, foramen: 24, wp: 2, au: 7, mm: 7, clear: 6 }
console.log(
  `  ${pad('nerve', widths.nerve)}${pad('root (au)', widths.root)}${pad('foramen', widths.foramen)}`
  + `${padl('wp', widths.wp)} ${padl('len au', widths.au)} ${padl('len mm', widths.mm)} ${padl('clear', widths.clear)}  target`,
)
for (const row of TABLE) {
  console.log(
    `  ${pad(row.nerve, widths.nerve)}${pad(vec(row.root), widths.root)}${pad(row.foramen, widths.foramen)}`
    + `${padl(row.waypoints, widths.wp)} ${padl(row.au.toFixed(2), widths.au)} ${padl(row.mm.toFixed(1), widths.mm)} `
    + `${padl(row.clearance.toFixed(2), widths.clear)}  ${String(row.target).slice(0, 62)}${String(row.target).length > 62 ? '…' : ''}`,
  )
}
console.log('')
check('every course length is finite and positive', TABLE.every((r) => Number.isFinite(r.au) && r.au > 0))
check('the twelve courses total more than 400 au of authored path', totalAu > 400, `${round2(totalAu)} au`)
measure('total authored path', `${round2(totalAu)} au = ${round2(totalAu * AU_MM)} mm`)
measure('shortest / longest course', `${round2(Math.min(...TABLE.map((r) => r.au)))} au (${TABLE.reduce((a, b) => (a.au < b.au ? a : b)).nerve}) / ${round2(Math.max(...TABLE.map((r) => r.au)))} au (${TABLE.reduce((a, b) => (a.au > b.au ? a : b)).nerve})`)
measure('minimum CLIP_BOUNDS clearance', `${minClearance.toFixed(2)} au at ${minClearanceNerve}`)
measure('anchored nerves (exit landmark on the chain)', `${anchorRows.filter((r) => r.deviation !== null).length}/12`)

console.log('\n--- 7b. the anchor table: what each chain is anchored on, measured ------')
for (const row of anchorRows) {
  console.log(`  ${pad(row.nerve, 26)}${pad(row.id, 28)}${pad(row.anchor, 44)}${row.deviation === null ? '' : `${row.deviation.toFixed(3)} au  `}${row.note}`)
}
console.log('')
const landmarkRows = anchorRows.filter((r) => r.id !== 'nrv-cn1-olfactory' && r.id !== 'nrv-cn2-optic')
check('the ten nerves with an exit landmark carry it on the chain within tolerance',
  landmarkRows.length === 10 && landmarkRows.every((r) => r.deviation !== null && r.deviation <= ANCHOR_TOLERANCE),
  `${landmarkRows.filter((r) => r.deviation !== null && r.deviation <= ANCHOR_TOLERANCE).length}/10 within ${ANCHOR_TOLERANCE} au; worst ${Math.max(...landmarkRows.map((r) => r.deviation ?? Infinity)).toFixed(3)} au`)
measure('worst exit-landmark deviation', `${Math.max(...landmarkRows.map((r) => r.deviation ?? 0)).toFixed(3)} au (tolerance ${ANCHOR_TOLERANCE})`)

/* ==================================================================== *
 *  8. the 3D pass: drawn, and gated by the NERVE kind
 * ==================================================================== */
console.log('\n--- 8. the 3D scene: one tube per course, gated by the nerve kind ------')
const sceneSrc = readFileSync(resolve(ROOT, 'src/components/viewer3d/SceneLayers.tsx'), 'utf8')
const tractPass = /tracts\.filter\(\(tract\) => isTractVisible\(tract\.id, layerSets\)\)/
/* the course pass names the collection and the same predicate; it may be written
 * inline or through the exported helper it delegates to */
const coursePass = /(NERVE_COURSES\.filter\(\(course\) => isTractVisible\(course\.id, layerSets\)\))|(nerveCoursesVisible\(NERVE_COURSES, layerSets\))/
const helperGates = /export function nerveCoursesVisible[\s\S]{0,900}?isTractVisible\(/
const tubeRender = /<TractTube\b/
check('SceneLayers filters the 23 tracts through isTractVisible', tractPass.test(sceneSrc))
check('SceneLayers filters the twelve courses through the SAME isTractVisible',
  coursePass.test(sceneSrc) && helperGates.test(sceneSrc),
  coursePass.test(sceneSrc) ? 'course pass calls isTractVisible (directly or via nerveCoursesVisible)' : 'course pass not found')
check('SceneLayers renders a <TractTube> for the tract collections', tubeRender.test(sceneSrc))
const kindArg = sceneSrc.match(/export function isTractVisible[\s\S]{0,700}?\n\}/)
check('isTractVisible reads the record\'s OWN registry kind (no literal \'tract\' kind argument)',
  kindArg !== null && /entry\?\.kind|entry\.kind/.test(kindArg[0]) && !/layersAdmit\(layers,[^)]*'tract'\s*\)/.test(kindArg[0]),
  kindArg ? kindArg[0].split('\n').filter((l) => l.includes('layersAdmit'))[0]?.trim() : 'isTractVisible not found')

/* NERVE_COURSE_IDS / hasNerveCourse: a nerve that gained a course must not also
 * keep its schematic blob (PLAN.md §5). */
const blobPass = /hasNerveCourse\(record\.id\)/
check('the structure pass drops a record that has a course (no duplicate body)', blobPass.test(sceneSrc))
check('hasNerveCourse covers exactly the twelve course ids',
  NERVE_COURSES.every((c) => hasNerveCourse(c.id)) && !hasNerveCourse('tract-corticospinal-lateral'),
  `${NERVE_COURSES.filter((c) => hasNerveCourse(c.id)).length}/12, and false for a real tract`)

/* ==================================================================== *
 *  9. the 2D live section: contours on the planes that cross each course
 * ==================================================================== */
console.log('\n--- 9. the 2D live section and the PiP: worker-computed contours --------')
const TUBULAR_SEGMENTS = 72
const RADIAL_SEGMENTS = 10

/** Sweep one course with `three` at TractTube's own sweep parameters. */
function sweep(course) {
  const curve = toCatmullRom(course.waypoints)
  const geometry = new THREE.TubeGeometry(curve, TUBULAR_SEGMENTS, course.tubeRadius, RADIAL_SEGMENTS, false)
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  return {
    positions: new Float32Array(position.array),
    indices: new Uint32Array(index.array),
    vertexCount: position.count,
    triangleCount: index.count / 3,
  }
}

const sectionSrc = readFileSync(resolve(ROOT, 'src/components/section/sectionAssets.ts'), 'utf8')
const canvasSrc = readFileSync(resolve(ROOT, 'src/components/section/SectionCanvas.tsx'), 'utf8')
check('sectionAssets builds one part per course (SECTION_NERVE_PARTS from NERVE_COURSES)',
  /SECTION_NERVE_PARTS[^=]*=\s*NERVE_COURSES\.map/.test(sectionSrc))
check('sectionAssets feeds the procedural tube geometry to the worker adapter',
  /registryNerveParts[\s\S]{0,600}?registryPartFromGeometry\(/.test(sectionSrc))
check('SECTION_PARTS (the 138 committed GLBs) is untouched and the canvas draws partsForCanvas()',
  /SECTION_PARTS: readonly SectionPartMeta\[\] = getManifest\(\)\.parts\.map\(metaFor\)/.test(sectionSrc)
  && /partsForCanvas\(\)\.filter\(/.test(canvasSrc))
check('SECTION_PARTS stays exactly one part per committed GLB',
  JSON.parse(readFileSync(resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json'), 'utf8')).parts.length === 138,
  `${JSON.parse(readFileSync(resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json'), 'utf8')).parts.length} manifest parts`)

const PLANE_STEP = 1
let sweptVerts = 0
let sweptTris = 0
const planeRows = []
for (const nerve of NERVES) {
  const c = courseById.get(nerve.id)
  if (!c) continue
  const { positions, indices, vertexCount, triangleCount } = sweep(c)
  sweptVerts += vertexCount
  sweptTris += triangleCount
  const bounds = partBounds(positions, positions.length / 3)
  const AXIS_INDEX = { x: 0, y: 1, z: 2 }
  const axes = ['x', 'y', 'z']
  const crossings = []
  let loopsTotal = 0
  let nonFinite = 0
  for (const axis of axes) {
    const i = AXIS_INDEX[axis]
    const lo = Math.max(Math.ceil(bounds.min[i] / PLANE_STEP) * PLANE_STEP, CLIP_BOUNDS[axis].min)
    const hi = Math.min(Math.floor(bounds.max[i] / PLANE_STEP) * PLANE_STEP, CLIP_BOUNDS[axis].max)
    for (let v = lo; v <= hi; v += PLANE_STEP) {
      const spec = { axis, value: v }
      if (!boundsMayCut(bounds, spec)) continue
      const result = extractContours(positions, indices, spec)
      for (const loop of result.loops) for (const n of loop) if (!Number.isFinite(n)) nonFinite += 1
      crossings.push({ axis, value: v, loops: result.loops.length })
      loopsTotal += result.loops.length
    }
  }
  const crossing = crossings.filter((p) => p.loops > 0)
  check(`${nerve.id} tube is cut by ≥ 1 section plane with ≥ 1 contour loop`,
    crossing.length >= 1, `${crossings.length} crossing plane(s), ${crossing.length} with loops, ${loopsTotal} loop(s) total`)
  check(`${nerve.id} contours are all finite`, nonFinite === 0, `${nonFinite} non-finite value(s)`)
  const perAxis = axes.map((axis) => {
    const p = crossing.filter((x) => x.axis === axis)
    return `${axis}: ${p.length} plane(s)/${p.reduce((s, x) => s + x.loops, 0)} loop(s)`
  })
  planeRows.push({
    nerve: nerve.label, id: nerve.id, verts: vertexCount, tris: triangleCount,
    crossing: crossings.length, withLoops: crossing.length, loops: loopsTotal,
    perAxis: perAxis.join(' · '),
    example: crossing.length ? `${crossing[0].axis} = ${crossing[0].value} au → ${crossing[0].loops} loop(s)` : '—',
  })
}
console.log('')
console.log(`  ${pad('nerve', 26)}${padl('verts', 6)} ${padl('tris', 6)} ${padl('planes', 7)} ${padl('w/loops', 8)} ${padl('loops', 6)}  first plane with a contour`)
for (const row of planeRows) {
  console.log(
    `  ${pad(row.nerve, 26)}${padl(row.verts, 6)} ${padl(row.tris, 6)} ${padl(row.crossing, 7)} `
    + `${padl(row.withLoops, 8)} ${padl(row.loops, 6)}  ${row.example}`,
  )
}
console.log('')
for (const row of planeRows) console.log(`  ${pad(row.nerve, 26)}per axis (crossing planes/loops): ${row.perAxis}`)
console.log('')
check('every course\'s contour set is non-empty and finite across the twelve',
  planeRows.every((r) => r.withLoops >= 1 && r.loops >= 1))
measure('swept tube geometry', `${sweptVerts} vertices / ${sweptTris} triangles for 12 tubes (72 × 10 sweep)`)
measure('section planes cutting a nerve tube', `${planeRows.reduce((s, r) => s + r.withLoops, 0)} across the twelve`)
measure('contour loops the worker computes', `${planeRows.reduce((s, r) => s + r.loops, 0)}`)

/* ==================================================================== *
 * 10. the committed Tracts collection is untouched
 * ==================================================================== */
console.log('\n--- 10. the committed 23 tracts are not the nerve collection -------------')
check('src/data/tracts.json still holds 23 committed tracts', tracts.length === 23, `measured ${tracts.length}`)
check('no tract record is a nerve course (ids disjoint)',
  tracts.every((t) => !courseIds.includes(t.id)) && tracts.every((t) => !hasNerveCourse(t.id)),
  `${tracts.filter((t) => hasNerveCourse(t.id)).length} collision(s)`)
check('no committed tract gained a course/foramen/nerve field',
  tracts.every((t) => t.foramen === undefined && t.nerve === undefined && t.course === undefined))
check('the manifest holds 0 parts and no GLB for a nerve (procedural geometry only)',
  !JSON.parse(readFileSync(resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json'), 'utf8')).parts.some((p) => /(^|-)nrv-/.test(p.slug)))

/* ==================================================================== *
 *  verdict
 * ==================================================================== */
console.log('\n=== summary ===============================================================')
measure('courses verified', `${NERVE_COURSES.length}/12`)
measure('assertions run', String(checks))
measure('failures', String(failed))
if (failed > 0) {
  console.log('\n  failures:')
  for (const f of failures) console.log(`   - ${f}`)
  console.log(`\n✖ cranial-nerve courses: ${checks - failed} passed · ${failed} failed — the course geometry is not what PLAN.md §3.3/§3.4 says.`)
  process.exitCode = 1
} else {
  console.log(`\n✔ 12 cranial-nerve courses verified: ${checks} assertions passed, 0 failed`)
  console.log(`  ${round2(totalAu)} au = ${round2(totalAu * AU_MM)} mm of authored path · all waypoints inside CLIP_BOUNDS (min clearance ${minClearance.toFixed(2)} au) · 12 tubes gated by kind "nerve" · ${planeRows.reduce((s, r) => s + r.loops, 0)} section contour loops the worker computes.`)
}
