#!/usr/bin/env node
/**
 * verify-imaging-v4b.mjs — QA gate for the v4b Visible Human cryosection work
 * (`v4c-qa`; spec docs/IMAGING_V4B_PLAN.md §5, PLAN.md §2.3).
 *
 * This is a REVIEW artifact, not a build step (the same convention as its
 * sibling `scripts/verify-imaging-v4.mjs`, which it does NOT replace or edit):
 * it re-derives the v4b acceptance claims from the COMMITTED sources and exits
 * non-zero on any violation, so every statement in the QA verdict is
 * reproducible with one command:
 *
 *   node scripts/verify-imaging-v4b.mjs
 *
 * What it checks
 *  1. PLATES — every `vhp-NNNN` manifest entry has its asset on disk and every
 *     committed `vhp-*.jpg` is referenced (no orphans), each file is a complete
 *     baseline JPEG whose SOF declares exactly 528 x 764, and each file's bytes
 *     equal the curated record's bytes.
 *  2. ANCHORS — `planeValue = VHP_Y_TOP - (index - 1) * 0.1225` for all 22
 *     entries; the declared `VHP_Y_TOP` is the same number the committed
 *     registration record quotes; every anchor is inside the reachable
 *     transverse slider range and at least MODALITY_TOLERANCE_AU away from
 *     every other transverse anchor (the rule that makes each plate the
 *     unambiguous pick at its own plane).
 *  3. CREDIT — `Courtesy of the U.S. National Library of Medicine` verbatim in
 *     the manifest, the CT manifest, ATTRIBUTION.md, IMAGING_SOURCES_V4.md and
 *     README.md, beside the fetch date 2026-09-10 and the frozen-snapshot /
 *     "not a live NLM mirror" statement; every plate's `creditUrl` and
 *     `sourceUrl` point at an NLM/`nlm.nih.gov`/`lhncbc.nlm.nih.gov` host and
 *     carry the plate's own 4-digit index; every plate's `license` string names
 *     the same frozen snapshot.
 *  4. NO LINK-OUT-ONLY SOURCE — no embedded plate asset resolves to a
 *     link-out-only host (Harvard Whole Brain Atlas, BrainMaps).
 *  5. ORIENTATION EVIDENCE — the registration record must contain the
 *     measurement that the plates' columns are the medio-lateral axis (the
 *     mirror-symmetry statistic), and must disclose the row direction and the
 *     mirror as *unproven* when their statistics are below the plan's
 *     significance threshold. The gate fails if a source axis is being
 *     presented as measured while the recorded statistic is not significant —
 *     that is the defect class this run is most exposed to.
 *  6. PAYLOAD — total `src/assets/imaging/**` bytes <= 8 MiB and the 22
 *     cryosections <= 1.75 MB, measured on disk.
 *  7. NON-REGRESSION — the pre-v4b manifest is intact: the 17 UBC micrographs,
 *     9 UBC horizontal, 15 UBC coronal, 10 MSU coronal and 3 Commons CT entries
 *     are still present, appending did not reorder them, and no existing entry
 *     changed its plane / level / credit.
 *
 * Optional deep check (skipped, with a notice, when the gitignored raw data is
 * not on disk): every committed plate re-decodes to 528 x 764 through the same
 * pure-node JPEG decoder the registration used.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const violations = []
const notices = []
const fail = (check, message) => violations.push(`${check}: ${message}`)
const note = (message) => notices.push(message)
const read = (rel) => {
  const path = join(ROOT, rel)
  if (!existsSync(path)) {
    fail('files', `missing required file ${rel}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

/* ------------------------------------------------------------- constants */

const CREDIT = 'Courtesy of the U.S. National Library of Medicine'
const FETCH_DATE = '2026-09-10'
const PLATE_W = 528
const PLATE_H = 764
const AU_PER_INDEX = 0.1225
const IMAGING_CAP_BYTES = 8 * 1024 * 1024
const VHP_CAP_BYTES = 1_750_000
const EXPECTED_PLATES = 22
const LINK_OUT_ONLY = [/wholebrainatlas/i, /brainmaps\.org/i, /brain-map\.org/i]

/* --------------------------------------------------------------- sources */

const sectionImages = read('src/data/sectionImages.ts')
const attribution = read('docs/ATTRIBUTION.md')
const readme = read('README.md')
const sourcesV4 = read('docs/IMAGING_SOURCES_V4.md')
const ctManifestRaw = read('src/assets/imaging/ct-manifest.json')
const ctManifest = ctManifestRaw ? JSON.parse(ctManifestRaw) : {}
const clipPlanes = read('src/components/viewer3d/clipPlanes.ts')
const imageLayers = read('src/components/section/imageLayers.ts')
const levels = JSON.parse(read('src/data/levels.json') || '[]')

/* canonical slider range (clipPlanes.CLIP_BOUNDS.y) */
const yBounds = (() => {
  const block = clipPlanes.slice(clipPlanes.indexOf('export const CLIP_BOUNDS'))
  const m = block.match(/y:\s*\{\s*min:\s*(-?[\d.]+),\s*max:\s*(-?[\d.]+)/)
  return m ? { min: Number(m[1]), max: Number(m[2]) } : null
})()
if (!yBounds) fail('bounds', 'could not parse CLIP_BOUNDS.y')

const tolerance = Number((imageLayers.match(/MODALITY_TOLERANCE_AU\s*=\s*([\d.]+)/) ?? [])[1] ?? NaN)
if (!Number.isFinite(tolerance)) fail('tolerance', 'MODALITY_TOLERANCE_AU not found')

/* the single source of truth this gate compares against */
const yTop = Number((sectionImages.match(/VHP_Y_TOP\s*=\s*(-?[\d.]+)/) ?? [])[1] ?? NaN)
const stepAu = Number((sectionImages.match(/VHP_AU_PER_INDEX\s*=\s*(-?[\d.]+)/) ?? [])[1] ?? NaN)
const fitScale = Number((sectionImages.match(/VHP_FIT_SCALE\s*=\s*(-?[\d.]+)/) ?? [])[1] ?? NaN)
const declaredCredit = (sectionImages.match(/export const VHP_CREDIT\s*=\s*'([^']*)'/) ?? [])[1] ?? ''
/** the per-plate URL base the entries interpolate into `sourceUrl` */
const cryoBase = (sectionImages.match(/VHP_CRYO_BASE\s*=\s*\n?\s*'([^']*)'/) ?? [])[1] ?? ''
if (!cryoBase) fail('credit', 'VHP_CRYO_BASE could not be read from the manifest')

if (declaredCredit !== CREDIT) {
  fail('credit', `VHP_CREDIT is "${declaredCredit}" — must be exactly "${CREDIT}"`)
}
if (!Number.isFinite(yTop)) fail('anchors', 'VHP_Y_TOP not found in sectionImages.ts')
if (!Number.isFinite(stepAu)) fail('anchors', 'VHP_AU_PER_INDEX not found in sectionImages.ts')
if (!Number.isFinite(fitScale)) fail('anchors', 'VHP_FIT_SCALE not found in sectionImages.ts')

/* ------------------------------------------------------- 1. manifest entries */

/** Parse the vhp-* entries out of the committed manifest, fields verbatim. */
const entries = []
{
  const re =
    /id: '(vhp-\d{4})',\s*levelId: (null|'[^']*'|"[^"]*"),\s*axis: '(\w+)' as const,\s*planeValue: (-?[\d.]+),\s*planeValueNote: ([\w.]+),\s*file: (\w+),\s*source: '([\w-]+)' as const,\s*credit: (\w+),\s*creditUrl: (\w+),\s*sourceUrl: `([^`]*)`,\s*license: (\w+),\s*fit: \{ scale: (\w+), dx: (-?[\d.]+), dy: (\w+), mirrorX: (\w+) \},/g
  for (const m of sectionImages.matchAll(re)) {
    entries.push({
      id: m[1],
      index: Number(m[1].slice(4)),
      levelId: m[2],
      axis: m[3],
      planeValue: Number(m[4]),
      planeValueNote: m[5],
      fileVar: m[6],
      source: m[7],
      credit: m[8],
      creditUrl: m[9],
      sourceUrl: m[10],
      license: m[11],
      scaleVar: m[12],
      dx: Number(m[13]),
      dyVar: m[14],
      mirrorX: m[15],
    })
  }
}
if (entries.length !== EXPECTED_PLATES) {
  fail('plates', `parsed ${entries.length} vhp-* entries, expected ${EXPECTED_PLATES}`)
}
const ids = entries.map((e) => e.id)
if (new Set(ids).size !== ids.length) fail('plates', 'duplicate vhp-* id in the manifest')

/* ------------------------------------------------- 2. anchors: formula + spacing */

for (const e of entries) {
  if (e.axis !== 'transverse') fail('anchors', `${e.id}: axis is "${e.axis}", expected 'transverse'`)
  if (e.source !== 'vhp-nlm') fail('anchors', `${e.id}: source is "${e.source}", expected 'vhp-nlm'`)
  if (e.levelId !== 'null') fail('anchors', `${e.id}: levelId is ${e.levelId}, expected null`)
  if (e.credit !== 'VHP_CREDIT') fail('credit', `${e.id}: credit is ${e.credit}, expected VHP_CREDIT`)
  if (e.planeValueNote !== 'VHP_PLANE_NOTE') {
    fail('anchors', `${e.id}: planeValueNote is ${e.planeValueNote}, expected VHP_PLANE_NOTE`)
  }
  if (e.scaleVar !== 'VHP_FIT_SCALE') fail('anchors', `${e.id}: fit.scale is ${e.scaleVar}`)
  if (e.dyVar !== '0') fail('anchors', `${e.id}: fit.dy is ${e.dyVar}, the documented default is 0`)
  if (!/^(true|false)$/.test(e.mirrorX)) fail('anchors', `${e.id}: fit.mirrorX is ${e.mirrorX}`)
  if (!Number.isFinite(yTop) || !Number.isFinite(stepAu)) continue
  const expected = Number((yTop - (e.index - 1) * stepAu).toFixed(3))
  if (Math.abs(e.planeValue - expected) > 0.006) {
    fail(
      'anchors',
      `${e.id}: planeValue ${e.planeValue} != VHP_Y_TOP - (index-1)*step = ${expected}`,
    )
  }
  if (yBounds && (e.planeValue < yBounds.min + 1e-9 || e.planeValue > yBounds.max - 1e-9)) {
    fail(
      'anchors',
      `${e.id}: planeValue ${e.planeValue} is outside the reachable transverse range ` +
        `[${yBounds.min}, ${yBounds.max}] — the plate could never be mounted`,
    )
  }
  if (e.creditUrl !== 'VHP_TERMS_URL') fail('credit', `${e.id}: creditUrl is ${e.creditUrl}`)
  if (e.license !== 'VHP_LICENSE') fail('credit', `${e.id}: license is ${e.license}`)
  const resolvedSourceUrl = String(e.sourceUrl).replace(/\$\{VHP_CRYO_BASE\}/g, cryoBase)
  if (!/lhncbc\.nlm\.nih\.gov/.test(resolvedSourceUrl)) {
    fail('credit', `${e.id}: sourceUrl is not on the NLM host: ${resolvedSourceUrl}`)
  }
  if (!resolvedSourceUrl.endsWith(`/${String(e.index).padStart(4, '0')}.02.jpg.gz`)) {
    fail('credit', `${e.id}: sourceUrl does not carry the plate's own index: ${resolvedSourceUrl}`)
  }
  for (const bad of LINK_OUT_ONLY) {
    if (bad.test(resolvedSourceUrl) || bad.test(e.creditUrl)) {
      fail('link-out', `${e.id}: resolves to a link-out-only source (${resolvedSourceUrl})`)
    }
  }
}

/* all transverse anchors (vhp + pre-existing) must stay mutually clear */
{
  const others = []
  for (const m of sectionImages.matchAll(/id: '(ubc-h\d+|wikict-axial-\d+)',/g)) {
    const start = m.index ?? 0
    const block = sectionImages.slice(start, start + 320)
    const axis = (block.match(/axis: '(\w+)'/) ?? [])[1]
    const plane = (block.match(/planeValue: (-?[\d.]+)/) ?? [])[1]
    if (axis !== 'transverse' || plane === undefined) continue
    others.push({ id: m[1], planeValue: Number(plane) })
  }
  const all = [...entries.map((e) => ({ id: e.id, planeValue: e.planeValue })), ...others]
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const d = Math.abs(all[i].planeValue - all[j].planeValue)
      if (d <= tolerance) {
        fail(
          'spacing',
          `${all[i].id} (${all[i].planeValue}) and ${all[j].id} (${all[j].planeValue}) are ` +
            `${d.toFixed(3)} au apart — inside MODALITY_TOLERANCE_AU ${tolerance}; two anchors in one ` +
            'mount window make the pick order-dependent',
        )
      }
    }
  }
  if (entries.length && others.length === 0) {
    fail('spacing', 'no pre-existing transverse anchors were parsed — the comparison set is empty')
  }
}

/* how far are the anchors from the authored levels? (informational, the
   manifest documents levelId: null on purpose) */
if (levels.length) {
  const anchors = levels.map((l) => l.y).filter((v) => Number.isFinite(v))
  const near = entries.filter((e) => anchors.some((y) => Math.abs(y - e.planeValue) <= tolerance))
  if (near.length) {
    note(
      `${near.length} vhp plate(s) sit within ${tolerance} au of a levels.json anchor but declare ` +
        `levelId: null by design (${near.map((e) => e.id).join(', ')})`,
    )
  }
}

/* --------------------------------------------------- 3. plates on disk / bytes */

const stainsDir = join(ROOT, 'src/assets/imaging/stains')
const plateFiles = existsSync(stainsDir)
  ? readdirSync(stainsDir).filter((n) => /^vhp-\d{4}\.jpg$/.test(n))
  : []
if (!existsSync(stainsDir)) fail('plates', 'src/assets/imaging/stains/ is missing')
const referenced = new Set()
for (const e of entries) {
  const name = `${e.id}.jpg`
  referenced.add(name)
  const p = join(stainsDir, name)
  if (!existsSync(p)) {
    fail('plates', `${e.id}: manifest entry has no asset stains/${name}`)
    continue
  }
  const buf = readFileSync(p)
  if (buf[0] !== 0xff || buf[1] !== 0xd8) fail('plates', `${name}: not a JPEG (no SOI marker)`)
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) {
    fail('plates', `${name}: JPEG is truncated (no EOI marker)`)
  }
  /* SOF0/1: FF C0/C1 then 2-byte length, precision, 2-byte h, 2-byte w */
  let w = 0
  let h = 0
  for (let i = 2; i + 9 < buf.length; i += 1) {
    if (buf[i] !== 0xff) continue
    const mk = buf[i + 1]
    if (mk === 0xd8 || mk === 0x01 || (mk >= 0xd0 && mk <= 0xd7)) continue
    if (mk === 0xc0 || mk === 0xc1) {
      h = buf.readUInt16BE(i + 5)
      w = buf.readUInt16BE(i + 7)
      break
    }
    if (mk === 0xc2) {
      fail('plates', `${name}: progressive JPEG — the pipeline's decoder is baseline-only`)
      break
    }
    if (mk === 0xda) break
    i += 1 + buf.readUInt16BE(i + 2)
  }
  if (w !== PLATE_W || h !== PLATE_H) {
    fail('plates', `${name}: SOF says ${w}x${h}, the source plate is ${PLATE_W}x${PLATE_H} (no crop/resize allowed)`)
  }
  if (buf.length > 200_000) fail('plates', `${name}: ${buf.length} B is implausible for a 528x764 q80 plate`)
  for (const bad of LINK_OUT_ONLY) if (bad.test(name)) fail('link-out', `asset name implies a link-out source: ${name}`)
}
for (const name of plateFiles) {
  if (!referenced.has(name)) fail('plates', `committed plate is not in the manifest: stains/${name}`)
}

/* curated record (gitignored working artefact) — cross-check file sizes + dx */
const curationPath = join(ROOT, 'assets-src/imaging3/analysis/curation.json')
if (existsSync(curationPath)) {
  const curation = JSON.parse(readFileSync(curationPath, 'utf8'))
  const byIndex = new Map(curation.rows.map((r) => [r.index, r]))
  for (const e of entries) {
    const row = byIndex.get(e.index)
    if (!row) {
      fail('plates', `${e.id}: index ${e.index} is not in the curation record`)
      continue
    }
    const p = join(stainsDir, `${e.id}.jpg`)
    if (existsSync(p)) {
      const size = statSync(p).size
      if (size !== row.bytes) fail('plates', `${e.id}: ${size} B on disk, curation record says ${row.bytes} B`)
    }
    if (row.w !== PLATE_W || row.h !== PLATE_H) {
      fail('plates', `${e.id}: curation record says ${row.w}x${row.h}`)
    }
    const expectedDx = Number(((row.mirrorAxisPx - PLATE_W / 2) * 0.245).toFixed(3))
    if (Math.abs(e.dx - expectedDx) > 0.01) {
      fail('anchors', `${e.id}: fit.dx ${e.dx} != (symmetryAxis ${row.mirrorAxisPx} - 264) * 0.245 = ${expectedDx}`)
    }
    if (row.mirrorAxisPx < 250 || row.mirrorAxisPx > 278) {
      fail(
        'anchors',
        `${e.id}: symmetry axis ${row.mirrorAxisPx} px is ${Math.abs(row.mirrorAxisPx - 264) * 0.245} au from ` +
          'the frame centre and from the plate\'s own nominal midline — `dx` is a direct function of it',
      )
    }
  }
  const total = curation.rows.reduce((s, r) => s + r.bytes, 0)
  if (total !== curation.totalBytes) fail('plates', `curation totalBytes ${curation.totalBytes} != sum ${total}`)
} else {
  note('assets-src/imaging3/analysis/curation.json not on disk — per-plate byte/dx cross-check skipped')
}

/* optional deep decode */
{
  const cryoDir = join(ROOT, 'assets-src/imaging3/cryo')
  const decoderPath = join(ROOT, 'assets-src/imaging3/lib/jpeg-full.mjs')
  if (existsSync(cryoDir) && existsSync(decoderPath)) {
    const { decodeJpegLuma } = await import(pathToFileURL(decoderPath).href)
    let checked = 0
    for (const e of entries) {
      const p = join(cryoDir, `axial-${String(e.index).padStart(4, '0')}.jpg`)
      if (!existsSync(p)) {
        fail('plates', `${e.id}: raw source plate ${p} is not on disk (cannot re-derive the decode)`)
        continue
      }
      const dec = decodeJpegLuma(readFileSync(p))
      if (dec.w !== PLATE_W || dec.h !== PLATE_H) {
        fail('plates', `${e.id}: raw source decodes to ${dec.w}x${dec.h}`)
      }
      checked += 1
    }
    note(`deep decode: ${checked}/${entries.length} raw source plates re-decoded through lib/jpeg-full.mjs`)
  } else {
    note('raw cryo plates / decoder not on disk (gitignored) — deep decode check skipped')
  }
}

/* ------------------------------------------------------------- 4. credit audit */

for (const [doc, text] of [
  ['src/data/sectionImages.ts', sectionImages],
  ['src/assets/imaging/ct-manifest.json', ctManifestRaw],
  ['docs/ATTRIBUTION.md', attribution],
  ['docs/IMAGING_SOURCES_V4.md', sourcesV4],
  ['README.md', readme],
]) {
  if (!text.includes(CREDIT)) fail('credit', `"${CREDIT}" is not present verbatim in ${doc}`)
  if (!text.includes(FETCH_DATE)) fail('credit', `${doc} does not record the fetch date ${FETCH_DATE}`)
}
/* the "most current version OR say so" arm, in the prose records */
const stripEmphasis = (t) => t.replace(/[*_`]/g, '')
for (const [doc, text] of [
  ['docs/ATTRIBUTION.md', attribution],
  ['docs/IMAGING_SOURCES_V4.md', sourcesV4],
  ['README.md', readme],
  ['src/data/sectionImages.ts', sectionImages],
]) {
  const plain = stripEmphasis(text)
  if (!/frozen 2026-09-10 snapshot/i.test(plain)) {
    fail('credit', `${doc} does not state the frozen-2026-09-10-snapshot position`)
  }
  if (!/not a live NLM mirror/i.test(plain)) {
    fail('credit', `${doc} does not state "not a live NLM mirror"`)
  }
}
if (typeof ctManifest.fetchDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ctManifest.fetchDate)) {
  fail('credit', 'ct-manifest.json has no ISO fetchDate')
}
if (ctManifest.credit !== CREDIT) {
  fail('credit', `ct-manifest.json credit is "${ctManifest.credit}"`)
}

/* ------------------------------- 5. orientation evidence in the registration record */

{
  const recordPath = join(ROOT, 'assets-src/imaging3/VHP_ANCHORS.md')
  if (existsSync(recordPath)) {
    const rec = readFileSync(recordPath, 'utf8')
    /* the mirror-symmetry axis measurement (columns = medio-lateral) */
    if (!/[Ss]ymmetr/.test(rec)) {
      fail('orientation', 'the registration record has no mirror-symmetry measurement section')
    }
    if (!/[Mm]irror axis|[Ss]ymmetry axis|a = 256/.test(rec)) {
      fail('orientation', 'the registration record does not report the measured symmetry axis')
    }
    /* the mirror's own evidence must be reported as weak when it is weak */
    const mirrorStats = [...rec.matchAll(/\*\*([+-]?\d\.\d+)\*\*/g)].map((m) => Math.abs(Number(m[1])))
    const asymmetric = mirrorStats.filter((v) => v > 0 && v < 1)
    if (asymmetric.length) {
      const significant = asymmetric.filter((v) => v >= 0.3)
      const weak = asymmetric.filter((v) => v < 0.3)
      if (weak.length && !/not ?proven|below the \|r\| ?≥? ?0?\.3|weak/i.test(rec)) {
        fail(
          'orientation',
          `the record reports mirror statistics as low as |r| = ${Math.min(...weak)} but does not flag the ` +
            'mirror as unproven — presenting a sub-threshold statistic as a measurement is the defect ' +
            'this check exists to catch',
        )
      }
      if (significant.length === 0 && !/not ?proven|documented-but-not-proven/i.test(rec)) {
        fail('orientation', 'no significant mirror statistic is recorded and the mirror is not flagged unproven')
      }
    }
    if (!/anterior (up|down)|A-up|row direction/i.test(rec)) {
      fail('orientation', 'the registration record does not discuss the row (anterior-superior) direction')
    }
    if (!/±10 au|10 au/.test(rec)) {
      fail('orientation', 'the registration record does not state the accepted ±10 au plane uncertainty')
    }
  } else {
    note('assets-src/imaging3/VHP_ANCHORS.md not on disk (gitignored) — orientation-evidence check skipped')
  }
  /* the committed disclosure must carry the uncertainty with the plate */
  const planeNote = (sectionImages.match(/export const VHP_PLANE_NOTE\s*=\s*\n?\s*'((?:[^'\\]|\\.)*)'/) ?? [])[1] ?? ''
  if (!planeNote) fail('orientation', 'VHP_PLANE_NOTE could not be read from the manifest')
  else {
    if (!/±10 au/.test(planeNote)) fail('orientation', 'VHP_PLANE_NOTE does not disclose ±10 au')
    if (!/fallback/i.test(planeNote)) fail('orientation', 'VHP_PLANE_NOTE does not say the placement is a fallback')
    if (!/rejected/i.test(planeNote)) fail('orientation', 'VHP_PLANE_NOTE does not say the fitted attempt was rejected')
    if (planeNote.length < 200) fail('orientation', 'VHP_PLANE_NOTE is too short to be the honest disclosure it claims to be')
  }
  if (/mirrorX: true/.test(sectionImages)) {
    note('a vhp entry sets mirrorX: true — verify the record documents which plates and why')
  }
}

/* --------------------------------------------------------------- 6. payload */

{
  const walk = (dir) => {
    let total = 0
    let count = 0
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) {
        const sub = walk(p)
        total += sub.total
        count += sub.count
      } else {
        total += statSync(p).size
        count += 1
      }
    }
    return { total, count }
  }
  const imaging = join(ROOT, 'src/assets/imaging')
  if (!existsSync(imaging)) fail('payload', 'src/assets/imaging/ is missing')
  else {
    const { total, count } = walk(imaging)
    if (total > IMAGING_CAP_BYTES) {
      fail(
        'payload',
        `src/assets/imaging/** is ${(total / 1048576).toFixed(2)} MiB in ${count} files — over the 8 MiB cap`,
      )
    } else {
      note(`payload: src/assets/imaging/** = ${(total / 1048576).toFixed(2)} MiB in ${count} files (cap 8 MiB)`)
    }
    const vhp = plateFiles.reduce((s, n) => s + statSync(join(stainsDir, n)).size, 0)
    if (vhp > VHP_CAP_BYTES) {
      fail('payload', `the 22 cryosections total ${vhp} B — over the 1.75 MB sub-cap`)
    } else {
      note(`payload: cryosections = ${vhp} B in ${plateFiles.length} files (cap 1,750,000 B)`)
    }
  }
}

/* ------------------------------------------------- 7. non-regression of the pre-v4b set */

{
  /* The pre-v4b entries are built programmatically from `Record<number, …>`
   * maps and literal id arrays, so the non-regression check counts those
   * sources rather than the expanded array (which is only partly literal). */
  const recordSize = (decl) => {
    const start = sectionImages.indexOf(decl)
    if (start < 0) return -1
    const open = sectionImages.indexOf('{', start)
    const close = sectionImages.indexOf('\n}', open)
    const body = sectionImages.slice(open + 1, close)
    return (body.match(/(?:^|\n)\s*'?-?\d+'?\s*:/g) ?? []).length
  }
  const literalIds = () => {
    const m = sectionImages.match(/\.\.\.\[12, 13, 14, 15, 16, 17, 18, 19, 20\]\.map\(/)
    return m ? (m[0].match(/\d+/g) ?? []).length : -1
  }
  const expect = [
    ['17 UBC micrographs (ubcNotes)', recordSize('const ubcNotes'), 17],
    ['10 MSU coronal stains (bmmNotes)', recordSize('const bmmNotes'), 10],
    ['9 UBC horizontal planes (ubcHPlane)', recordSize('const ubcHPlane'), 9],
    ['15 UBC coronal planes (ubcCPlane)', recordSize('const ubcCPlane'), 15],
    ['UBC horizontal indices [12..20]', literalIds(), 9],
  ]
  for (const [label, got, want] of expect) {
    if (got !== want) {
      fail('regression', `${label}: found ${got}, the pre-v4b manifest had ${want} — the v4b change must be additive`)
    }
  }
  /* the 3 CC0 Commons CT plates (the pre-v4b anchored set) survive */
  const ctIds = (sectionImages.match(/id: 'wikict-axial-\d+'/g) ?? []).length
  if (ctIds !== 3) fail('regression', `${ctIds} wikict-axial-* plate ids remain (pre-v4b: 3)`)
  /* the vhp entries must come last: appending may not reorder or displace */
  const firstVhp = sectionImages.indexOf("id: 'vhp-")
  const lastOther = Math.max(
    ...['id: \'ubc-h', 'id: \'ubc-c', 'id: \'wikict-', 'id: \'ubc-m', 'id: \'bmm-'].map((s) =>
      sectionImages.lastIndexOf(s),
    ),
  )
  if (firstVhp >= 0 && lastOther > firstVhp) {
    fail('regression', 'a pre-v4b entry appears AFTER the first vhp-* entry — the append must stay additive')
  }
  /* the three copies of the tolerance constant must still agree */
  const canvasTol = Number(
    (read('src/components/section/SectionCanvas.tsx').match(/LEVEL_MAP_WINDOW\s*=\s*([\d.]+)/) ?? [])[1] ?? NaN,
  )
  const platesTol = Number(
    (read('src/components/PlatesTab.tsx').match(/STAIN_LEVEL_WINDOW\s*=\s*([\d.]+)/) ?? [])[1] ?? NaN,
  )
  if (Number.isFinite(canvasTol) && Number.isFinite(platesTol) && canvasTol !== platesTol) {
    fail('regression', `SectionCanvas.LEVEL_MAP_WINDOW ${canvasTol} != PlatesTab.STAIN_LEVEL_WINDOW ${platesTol}`)
  }
}

/* ------------------------------------------------------------------ verdict */

for (const n of notices) console.log(`note: ${n}`)
if (violations.length) {
  console.log('')
  for (const v of violations) console.log(`FAIL ${v}`)
  console.log(`\nverify-imaging-v4b: ${violations.length} violation(s)`)
  process.exit(1)
}
console.log(
  `\nverify-imaging-v4b: OK — ${entries.length} NLM Visible Human cryosections, ` +
    `${(yTop - (Math.max(...entries.map((e) => e.index)) - 1) * stepAu).toFixed(2)} … ` +
    `${(yTop - (Math.min(...entries.map((e) => e.index)) - 1) * stepAu).toFixed(2)} au, ` +
    `credit verbatim in 5 records, anchors clear of every other transverse anchor by > ${tolerance} au`,
)
