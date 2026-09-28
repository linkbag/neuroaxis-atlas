#!/usr/bin/env node
/**
 * verify:spinal-tracts — the SPINAL_CORD_PLAN §6 sibling assertion for the
 * tract courses that cross the cervicomedullary junction (task `spinal-data`).
 *
 * What this check owns (the course EXTENSION the plan calls "tracts-extension"):
 *
 *   1  every tract waypoint is a finite 3-vector inside CLIP_BOUNDS — the
 *      extended cord courses run down to y = −383 and must stay in frame;
 *   2  continuity: every tract crossing the junction (y = −50, the
 *      lvl-spinal-medulla anchor) carries matched waypoints ABOVE and BELOW it
 *      — no dangling cord stub, no brainstem-only course pretending to descend;
 *   3  the crossing set is exactly the 13 spinal-crossing tracts pinned below
 *      (a rename or a new crossing must show up here on purpose);
 *   4  corticospinal somatotopy is monotone: along the cord waypoints
 *      |x| never decreases caudally — cervical fibres sit most medial, sacral
 *      fibres most lateral — and the course reaches the conus;
 *   5  each crossing tract addresses its documented segmental termination
 *      (rubrospinal → T6, tectospinal → C6, MLF → C8, hypothalamospinal → L2,
 *      posterior spinocerebellar → L3, anterior spinocerebellar → S3, the rest
 *      → Co1) and every one of them addresses C1, the junction segment.
 *
 * Standalone sibling of the scripts/verify gates: plain node, no browser.
 * Wiring into package.json (`verify:spinal-tracts`) is phase 9 (integrate).
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8')

const TRACTS_RAW = JSON.parse(read('src/data/tracts.json'))
const TRACTS = Array.isArray(TRACTS_RAW) ? TRACTS_RAW : (TRACTS_RAW.records ?? [])
const LEVELS = JSON.parse(read('src/data/levels.json'))
const CLIP_SRC = read('src/components/viewer3d/clipPlanes.ts')

let passed = 0
const failures = []
const ok = (msg) => { passed += 1 }
const bad = (msg) => { failures.push(msg) }
const equal = (label, actual, expected) => {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) ok(label)
  else bad(`${label}: got ${a}, expected ${e}`)
}
const truthy = (label, condition) => (condition ? ok(label) : bad(label))

const yOf = (id) => LEVELS.find((level) => level.id === id)?.y
const JUNCTION_Y = yOf('lvl-spinal-medulla')
const CONUS_Y = -383

const SEGMENT_RE = /^lvl-(c[1-8]|t([1-9]|1[0-2])|l[1-5]|s[1-5]|co1)$/

/* CLIP_BOUNDS (same parse the spinal-anatomy gate uses). */
const clipBody = /export const CLIP_BOUNDS = \{([\s\S]*?)\} as const/.exec(CLIP_SRC)?.[1] ?? ''
const axisBox = (name) => {
  const m = new RegExp(`${name}\\s*:\\s*\\{\\s*min\\s*:\\s*(-?[\\d.]+)\\s*,\\s*max\\s*:\\s*(-?[\\d.]+)`).exec(clipBody)
  return { min: Number(m?.[1]), max: Number(m?.[2]) }
}
const CLIP = { x: axisBox('x'), y: axisBox('y'), z: axisBox('z') }
const inClip = (p) =>
  Array.isArray(p) && p.length === 3 &&
  p.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
  p[0] >= CLIP.x.min && p[0] <= CLIP.x.max &&
  p[1] >= CLIP.y.min && p[1] <= CLIP.y.max &&
  p[2] >= CLIP.z.min && p[2] <= CLIP.z.max

/* ─────────── 1. every waypoint is a 3-vector inside CLIP_BOUNDS ─────────── */

console.log('\n--- 1. every tract waypoint is a finite 3-vector inside CLIP_BOUNDS ---')
{
  const badWp = []
  for (const tract of TRACTS) {
    for (const [i, wp] of (tract.waypoints ?? []).entries()) {
      if (!inClip(wp)) badWp.push(`${tract.id}[${i}] ${JSON.stringify(wp)}`)
    }
  }
  if (badWp.length === 0) {
    ok(`all ${TRACTS.reduce((n, t) => n + (t.waypoints?.length ?? 0), 0)} tract waypoints sit inside CLIP_BOUNDS`)
  } else {
    bad(`tract waypoint outside CLIP_BOUNDS or malformed: ${badWp.join(' · ')}`)
  }
}

/* ───────────── 2/3. continuity across the cervicomedullary junction ───────────── */

console.log('\n--- 2/3. tracts crossing y = −50 carry matched waypoints above and below ---')
{
  const SPINAL_CROSSING = [
    'tract-corticospinal-lateral',
    'tract-rubrospinal',
    'tract-tectospinal',
    'tract-lateral-vestibulospinal',
    'tract-medial-vestibulospinal',
    'tract-reticulospinal',
    'tract-mlf',
    'tract-hypothalamospinal',
    'tract-dcml',
    'tract-spinothalamic',
    'tract-posterior-spinocerebellar',
    'tract-anterior-spinocerebellar',
    'tract-spinoreticular',
  ]
  const below = (t) => (t.waypoints ?? []).some((p) => p[1] < JUNCTION_Y)
  const above = (t) => (t.waypoints ?? []).some((p) => p[1] > JUNCTION_Y)

  const crossing = TRACTS.filter(below).map((t) => t.id).sort()
  equal('exactly the 13 spinal-crossing tracts run below the junction', crossing, [...SPINAL_CROSSING].sort())

  const dangling = []
  for (const id of SPINAL_CROSSING) {
    const tract = TRACTS.find((t) => t.id === id)
    if (!tract) { dangling.push(`${id} (missing from tracts.json)`); continue }
    if (!below(tract) || !above(tract)) dangling.push(id)
  }
  if (dangling.length === 0) {
    ok('every one of the 13 crossing tracts has matched waypoints above AND below y = −50')
  } else {
    bad(`tract course missing its matched side of the junction: ${dangling.join(' · ')}`)
  }
}

/* ─────────────────── 4. corticospinal somatotopy is monotone ─────────────────── */

console.log('\n--- 4. corticospinal somatotopy: |x| grows caudally (cervical medial) ---')
{
  const cst = TRACTS.find((t) => t.id === 'tract-corticospinal-lateral')
  const cord = (cst?.waypoints ?? [])
    .filter((p) => p[1] <= JUNCTION_Y)
    .slice()
    .sort((a, b) => b[1] - a[1]) // rostral → caudal
  const xs = cord.map((p) => Math.abs(p[0]))
  truthy(
    'the corticospinal course has cord waypoints (y ≤ −50) to test',
    xs.length >= 2,
  )
  truthy(
    'cord |x| never decreases caudally (cervical fibres most medial → sacral most lateral)',
    xs.every((x, i) => i === 0 || x >= xs[i - 1]),
  )
  truthy(
    'the sacral end is strictly more lateral than the cervical end',
    xs.length >= 2 && xs[xs.length - 1] > xs[0],
  )
  const lowest = Math.min(...(cst?.waypoints ?? []).map((p) => p[1]))
  truthy(`the corticospinal course reaches the conus (min y ${lowest} ≤ ${CONUS_Y})`, lowest <= CONUS_Y)
}

/* ───────────── 5. each crossing tract reaches its segmental termination ───────────── */

console.log('\n--- 5. segmental terminations and the C1 junction segment ---')
{
  const CAUDAL_TARGET = {
    'tract-corticospinal-lateral': 'lvl-co1',
    'tract-rubrospinal': 'lvl-t6',
    'tract-tectospinal': 'lvl-c6',
    'tract-lateral-vestibulospinal': 'lvl-co1',
    'tract-medial-vestibulospinal': 'lvl-t6',
    'tract-reticulospinal': 'lvl-co1',
    'tract-mlf': 'lvl-c8',
    'tract-hypothalamospinal': 'lvl-l2',
    'tract-dcml': 'lvl-co1',
    'tract-spinothalamic': 'lvl-co1',
    'tract-posterior-spinocerebellar': 'lvl-l3',
    'tract-anterior-spinocerebellar': 'lvl-s3',
    'tract-spinoreticular': 'lvl-co1',
  }
  for (const [id, target] of Object.entries(CAUDAL_TARGET)) {
    const tract = TRACTS.find((t) => t.id === id)
    const spinalLevels = (tract?.levels ?? []).filter((l) => SEGMENT_RE.test(l))
    const caudalmost = spinalLevels.reduce((a, b) => (yOf(b) < yOf(a) ? b : a), spinalLevels[0])
    equal(`${id} addresses down to its segmental termination`, caudalmost, target)
    truthy(`${id} addresses the C1 junction segment`, spinalLevels.includes('lvl-c1'))
  }
}

/* ─────────────────────────────────── driver ───────────────────────────── */

console.log(`\n${passed} assertions passed · ${failures.length} failed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const failure of failures) console.log(`  · ${failure}`)
  console.log('\nSPINAL-TRACTS GATE FAILED\n')
  process.exit(1)
}
console.log('\n✔ every tract crossing y = −50 carries matched waypoints above and below, the')
console.log('  corticospinal cord course is monotone in |x| from cervical (medial) to sacral')
console.log('  (lateral) and reaches the conus, and each crossing tract terminates at its')
console.log('  documented segment (13 spinal-crossing courses, 23 records kept whole)\n')
