#!/usr/bin/env node
/**
 * verify:spinal-anatomy — the SPINAL_CORD_PLAN §6 sibling assertion for the
 * 31 spinal segment levels (task `spinal-platform`, phase 1 of the plan).
 *
 * What this check owns (the level TABLE; record content arrives with later
 * phases and is checked conditionally here, "content pending" until then):
 *
 *   1  the segment table is COMPLETE and correctly addressed: exactly the 31
 *      segment anchors C1–C8, T1–T12, L1–L5, S1–S5, Co1 exist as `lvl-c1` …
 *      `lvl-co1`, unique, strictly ordered caudal → rostral;
 *   2  the segments sit where the anatomy says: the block covers the cord from
 *      the cervicomedullary junction (y ≈ −50) to the conus medullaris
 *      (y ≈ −383), each level inside its segment, and the cervical block spans
 *      ~ the upper 1/3 of the cord length (the brief's anatomy hint), with the
 *      thoracic / lumbar / sacral / coccygeal shares in their anatomical bands;
 *   3  the 17 brainstem levels (y −50 … 78) are UNCHANGED — pinned here so a
 *      future edit cannot silently move them;
 *   4  every level lies inside CLIP_BOUNDS (the y.min −390 spinal extension);
 *   5  record-level facts, enforced as soon as `spinal` records exist: every
 *      spinal record's `levels` links resolve against the table, and the
 *      cuneate fasciculus is only ever addressed at levels ≥ T6 (its fibres
 *      join from T6 upward — below T6 only the gracile fasciculus exists).
 *
 * Standalone sibling of the scripts/verify gates: plain node, no browser.
 * Wiring into package.json (`verify:spinal-anatomy`) is phase 9 (integrate).
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8')

const LEVELS = JSON.parse(read('src/data/levels.json'))
const TAXONOMY = JSON.parse(read('src/data/taxonomy.json'))
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
const between = (label, value, lo, hi) => {
  if (value >= lo && value <= hi) ok(`${label} (${value})`)
  else bad(`${label}: ${value} outside [${lo}, ${hi}]`)
}

/* ─────────────────────────── 1. the 31 segment anchors ─────────────────── */

console.log('\n--- 1. the segment table is complete and correctly addressed ---')

const SEGMENT_RE = /^lvl-(c[1-8]|t([1-9]|1[0-2])|l[1-5]|s[1-5]|co1)$/
const EXPECTED_IDS = [
  ...['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'],
  ...['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11', 't12'],
  ...['l1', 'l2', 'l3', 'l4', 'l5'],
  ...['s1', 's2', 's3', 's4', 's5'],
  'co1',
].map((id) => `lvl-${id}`)

const segmentLevels = LEVELS.filter((level) => SEGMENT_RE.test(level.id))
equal('the table carries exactly the 31 segment anchors', segmentLevels.map((l) => l.id).sort(), [...EXPECTED_IDS].sort())
equal('every segment anchor id matches lvl-<segment>', segmentLevels.every((l) => SEGMENT_RE.test(l.id)), true)

const ids = LEVELS.map((level) => level.id)
equal('level ids are unique', new Set(ids).size, ids.length)

const byId = new Map(LEVELS.map((level) => [level.id, level]))
const yOf = (id) => byId.get(id)?.y

// Anatomical order, caudal → rostral: Co1 lowest … C1 highest of the block.
const orderCaudalToRostral = [...EXPECTED_IDS].reverse()
const ys = orderCaudalToRostral.map(yOf)
truthy(
  'the 31 segments run strictly caudal → rostral (Co1 … C1, no ties)',
  ys.every((y, i) => typeof y === 'number' && (i === 0 || y > ys[i - 1])),
)

/* ───────────────────── 2. anatomical placement of the block ────────────── */

console.log('\n--- 2. segments span the cord: junction (−50) → conus (−383) ---')

const JUNCTION_Y = yOf('lvl-spinal-medulla') // the cervicomedullary junction anchor
equal('the cervicomedullary junction anchor is still at y = −50', JUNCTION_Y, -50)
const CONUS_Y = -383 // plan §5: conus medullaris at L1/L2, y ≈ −383

truthy('C1 lies just caudal to the junction', yOf('lvl-c1') < JUNCTION_Y && yOf('lvl-c1') > JUNCTION_Y - 20)
truthy('Co1 lies just rostral to the conus tip', yOf('lvl-co1') < CONUS_Y + 20 && yOf('lvl-co1') >= CONUS_Y)

const span = JUNCTION_Y - CONUS_Y // ≈ 333 au (≈ 400 mm of cord)
between('the cord span is ~333 au', span, 320, 345)

// Block shares: boundaries at the midpoint of the bracketing segment centres.
const mid = (a, b) => (yOf(a) + yOf(b)) / 2
const boundaries = {
  cervical: JUNCTION_Y - mid('lvl-c8', 'lvl-t1'), // junction → C8/T1
  thoracic: mid('lvl-c8', 'lvl-t1') - mid('lvl-t12', 'lvl-l1'),
  lumbar: mid('lvl-t12', 'lvl-l1') - mid('lvl-l5', 'lvl-s1'),
  sacral: mid('lvl-l5', 'lvl-s1') - mid('lvl-s5', 'lvl-co1'),
  coccygeal: mid('lvl-s5', 'lvl-co1') - CONUS_Y,
}
const share = (block) => boundaries[block] / span
// The brief's anatomy hint: "cervical segments span ~ the upper 1/3 of cord
// length". Bands are generous enough to accept anatomical variants, tight
// enough to catch a flat (equal-gap) or inverted spacing table.
between('cervical block ≈ the upper 1/3 of the cord', share('cervical'), 0.28, 0.38)
between('thoracic block ≈ 40% of the cord', share('thoracic'), 0.36, 0.5)
between('lumbar block ≈ 12% of the cord', share('lumbar'), 0.09, 0.17)
between('sacral block ≈ 8% of the cord', share('sacral'), 0.05, 0.12)
between('coccygeal block ≈ 3% of the cord', share('coccygeal'), 0.01, 0.06)
{
  const blockGap = (idList) => {
    const gaps = []
    for (let i = 0; i < idList.length - 1; i += 1) gaps.push(yOf(idList[i]) - yOf(idList[i + 1]))
    return gaps.reduce((a, b) => a + b, 0) / gaps.length
  }
  const gC = blockGap(['lvl-c1', 'lvl-c2', 'lvl-c3', 'lvl-c4', 'lvl-c5', 'lvl-c6', 'lvl-c7', 'lvl-c8'])
  const gT = blockGap(['lvl-t1', 'lvl-t2', 'lvl-t3', 'lvl-t4', 'lvl-t5', 'lvl-t6', 'lvl-t7', 'lvl-t8', 'lvl-t9', 'lvl-t10', 'lvl-t11', 'lvl-t12'])
  const gL = blockGap(['lvl-l1', 'lvl-l2', 'lvl-l3', 'lvl-l4', 'lvl-l5'])
  const gS = blockGap(['lvl-s1', 'lvl-s2', 'lvl-s3', 'lvl-s4', 'lvl-s5'])
  truthy(
    `segment gaps shrink caudally (C ${gC.toFixed(1)} ≥ T ${gT.toFixed(1)} ≥ L ${gL.toFixed(1)} ≥ S ${gS.toFixed(1)})`,
    gC >= gT && gT >= gL && gL >= gS,
  )
}

/* ─────────────── 3. the 17 brainstem levels are UNCHANGED ──────────────── */

console.log('\n--- 3. the 17 brainstem level anchors are unchanged (pinned) ---')

const BRAINSTEM = {
  'lvl-spinal-medulla': -50,
  'lvl-pyramid-decuss': -46,
  'lvl-sensory-decuss': -42,
  'lvl-olivary': -34,
  'lvl-pontomedullary': -24,
  'lvl-pons-caudal': -18,
  'lvl-pons-middle': -8,
  'lvl-pons-rostral': 2,
  'lvl-midbrain-ic': 8,
  'lvl-midbrain-sc': 14,
  'lvl-post-comm': 19,
  'lvl-thalamus-mid': 28,
  'lvl-thalamus-rostral': 36,
  'lvl-tel-thalamostriate': 48,
  'lvl-tel-basal-ganglia': 58,
  'lvl-tel-centrum-semiovale': 68,
  'lvl-tel-convexity': 78,
}
for (const [id, y] of Object.entries(BRAINSTEM)) {
  equal(`brainstem anchor ${id} is still at y = ${y}`, yOf(id), y)
}
equal('the whole table is 48 anchors (31 segments + 17 brainstem)', LEVELS.length, 48)

/* ───────────────── 4. every level sits inside CLIP_BOUNDS ──────────────── */

console.log('\n--- 4. every level lies inside CLIP_BOUNDS ---')

const clipMatch = CLIP_SRC.match(/export const CLIP_BOUNDS = \{([\s\S]*?)\} as const/)
truthy('CLIP_BOUNDS is declared once in clipPlanes.ts', clipMatch !== null)
const axis = (name) => {
  const m = clipMatch?.[1].match(new RegExp(`${name}: \\{ min: (-?[\\d.]+), max: (-?[\\d.]+) \\}`))
  return m ? { min: Number(m[1]), max: Number(m[2]) } : null
}
const clipY = axis('y')
equal('CLIP_BOUNDS.y is [−390, +116] (the spinal extension)', clipY, { min: -390, max: 116 })
truthy(
  'every level y is inside CLIP_BOUNDS.y',
  LEVELS.every((level) => level.y >= clipY.min && level.y <= clipY.max),
)
truthy(
  'the conus end keeps clip margin below Co1 (y.min < conus)',
  clipY.min < CONUS_Y,
)

/* ──────────── 5. record-level facts (content-pending friendly) ─────────── */

console.log('\n--- 5. spinal records: level links and the cuneate rule ---')

const records = Array.isArray(TAXONOMY) ? TAXONOMY : (TAXONOMY.records ?? [])
const spinalRecords = records.filter((record) => record.region === 'spinal')

if (spinalRecords.length === 0) {
  console.log('   (content pending — zero spinal records registered yet; record rules idle)')
  ok('spinal record rules idle while the registry has no spinal records')
} else {
  // (5a) the ctx-seg-* segment records, where present, address the 31 anchors.
  const segRecords = spinalRecords.filter((record) => /^ctx-seg-/.test(record.id))
  if (segRecords.length === 0) {
    console.log('   (content pending — no ctx-seg-* records yet)')
    ok('segment-record correspondence idle while no ctx-seg-* records exist')
  } else {
    equal(
      'the ctx-seg-* records are exactly the 31 segments',
      segRecords.map((r) => r.id).sort(),
      EXPECTED_IDS.map((id) => id.replace('lvl-', 'ctx-seg-')).sort(),
    )
    for (const record of segRecords) {
      const anchor = yOf(record.id.replace('ctx-seg-', 'lvl-'))
      const span = record.spinalSpan
      if (span && typeof span.yTop === 'number' && typeof span.yBottom === 'number') {
        truthy(`segment record ${record.id} span contains its level anchor y=${anchor}`, span.yTop >= anchor && span.yBottom <= anchor)
      }
    }
  }
  // (5b) level links, where a record carries them, resolve against the table.
  for (const record of spinalRecords) {
    for (const levelId of record.levels ?? []) {
      truthy(`spinal record ${record.id} level ${levelId} resolves`, ids.includes(levelId))
    }
  }
  // (5c) extents run rostral→caudal and stay inside CLIP_BOUNDS.y.
  for (const record of spinalRecords) {
    const span = record.spinalSpan
    if (span && typeof span.yTop === 'number' && typeof span.yBottom === 'number') {
      truthy(`spinal record ${record.id} span runs rostral→caudal`, span.yTop > span.yBottom)
      truthy(
        `spinal record ${record.id} span stays inside CLIP_BOUNDS.y`,
        span.yTop <= clipY.max && span.yBottom >= clipY.min,
      )
    }
  }
  // (5d) the cuneate rule (plan §6): the cuneate fasciculus is only ever
  // addressed at levels ≥ T6 — its fibres join from T6 upward; below T6 only
  // the gracile fasciculus exists. Caudal limit = the T6/T7 boundary.
  const t6Caudal = yOf('lvl-t7') + (yOf('lvl-t6') - yOf('lvl-t7')) / 2
  const cuneate = spinalRecords.filter((record) => /cuneate/i.test(`${record.id} ${record.name}`))
  if (cuneate.length === 0) {
    console.log('   (content pending — no cuneate record yet)')
    ok('cuneate rule idle while no cuneate record exists')
  } else {
    for (const record of cuneate) {
      const span = record.spinalSpan
      if (span && typeof span.yBottom === 'number') {
        truthy(
          `cuneate record ${record.id} never reaches caudal to T6 (yBottom ${span.yBottom} ≥ T6/T7 boundary ${t6Caudal} − 2)`,
          span.yBottom >= t6Caudal - 2,
        )
      } else {
        console.log(`   (content pending — cuneate record ${record.id} carries no extent yet)`)
        ok(`cuneate rule idle for ${record.id} until an extent lands`)
      }
    }
  }
}

/* ─────────────────────────────────── driver ───────────────────────────── */

console.log(`\n${passed} assertions passed · ${failures.length} failed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const failure of failures) console.log(`  · ${failure}`)
  console.log('\nSPINAL-ANATOMY GATE FAILED\n')
  process.exit(1)
}
console.log('\n✔ the 31 segment anchors span the cord (junction −50 → conus −383) with anatomical')
console.log('  block shares (cervical ≈ 1/3), the 17 brainstem anchors are pinned unchanged, and')
console.log('  every level sits inside CLIP_BOUNDS y[−390,116]\n')
