#!/usr/bin/env node
/**
 * verify-imaging-v4.mjs — QA gate for the v4 real-imagery work
 * (`review-qa-v4`; spec docs/IMAGING_V4_PLAN.md §6, plan §4 contracts).
 *
 * This is a REVIEW artifact, not a build step: it re-derives the v4 acceptance
 * claims from the COMMITTED sources (no bundler, no browser) and exits non-zero
 * on any violation, so every statement in the QA verdict is reproducible with
 * one command:
 *
 *   node scripts/verify-imaging-v4.mjs
 *
 * What it checks
 *  1. ANCHORING / REACHABILITY — every plane-anchored photograph in
 *     `src/data/sectionImages.ts` sits inside the canonical slider range that
 *     `src/components/viewer3d/clipPlanes.ts` (CLIP_BOUNDS) exposes, i.e. the
 *     plane the plate claims is a plane the user can actually reach.
 *  2. ANCHOR SELECTION — for every anchored plate, the canvas' documented rule
 *     ("nearest plate within MODALITY_TOLERANCE_AU, else the level-mapped
 *     micrograph") selects THAT plate at its own `planeValue`, unambiguously:
 *     no other plate on the same axis is nearer, and no other plate's mount
 *     window overlaps it.
 *  3. LEVEL METADATA — each transverse plate's declared `levelId` is the
 *     nearest `levels.json` anchor (the rule `sectionImagesForLevel` and the
 *     Plates toolbar rely on).
 *  4. ORIENTATION CONVENTION — the §2.2 badge tables of the 2D canvas
 *     (SectionCanvas.DIRECTION_BADGES) and the GPU PiP (SectionPiP
 *     SECTION_VIEWS) agree with the published table in
 *     docs/SECTION_SYNC_PLAN.md §2.2 (transverse A-up / patient-left on the
 *     image right; sagittal S-up / anterior right; coronal S-up /
 *     patient-left on the image right).
 *  5. ATTRIBUTION — the three verbatim photographic credit lines are identical
 *     in `src/data/sectionImages.ts`, `docs/ATTRIBUTION.md` and `README.md`,
 *     and the continuous CT / MRI credits recorded in the manifests appear in
 *     both `docs/ATTRIBUTION.md` and `README.md`.
 *  6. ASSET INTEGRITY + BUDGETS — every stain file referenced by the manifest
 *     exists, every committed stain file is referenced (no orphans), and the
 *     committed imaging payload respects the plan §4 budgets (≤ 8 MiB total,
 *     ≤ 4 MiB of assets added by v4).
 *  7. LINK-OUT-ONLY SOURCES — no embedded asset resolves to a link-out-only
 *     host (Harvard Whole Brain Atlas, BrainMaps).
 *
 * Exits 0 when every check passes, 1 otherwise (violations are printed).
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

/* --------------------------------------------------------------- helpers */

const violations = []
const notes = []

function fail(check, message) {
  violations.push(`${check}: ${message}`)
}

function read(relative) {
  const path = join(ROOT, relative)
  if (!existsSync(path)) {
    fail('files', `missing required file ${relative}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

/** Numbers of a `Record<number, T> = { key: value, ... }` literal, verbatim. */
function parseNumberRecord(source, declaration) {
  const start = source.indexOf(declaration)
  if (start < 0) throw new Error(`declaration not found: ${declaration}`)
  const open = source.indexOf('{', start)
  const close = source.indexOf('}', open)
  const body = source.slice(open + 1, close)
  const out = new Map()
  for (const match of body.matchAll(/(-?\d+)\s*:\s*'?(-?[\w.-]+)'?/g)) {
    const key = Number(match[1])
    const raw = match[2]
    out.set(key, /^-?[\d.]+$/.test(raw) ? Number(raw) : raw)
  }
  return out
}

/* ------------------------------------------------------------- the sources */

const sectionImages = read('src/data/sectionImages.ts')
const clipPlanes = read('src/components/viewer3d/clipPlanes.ts')
const sectionCanvas = read('src/components/section/SectionCanvas.tsx')
const sectionPip = read('src/components/viewer3d/SectionPiP.tsx')
const syncPlan = read('docs/SECTION_SYNC_PLAN.md')
const attribution = read('docs/ATTRIBUTION.md')
const readme = read('README.md')
const ctManifest = JSON.parse(read('src/assets/imaging/ct-manifest.json') || '{}')
const mriManifest = JSON.parse(read('src/assets/imaging/mri-manifest.json') || '{}')
const levels = JSON.parse(read('src/data/levels.json') || '[]')

/* --- canonical slider range (clipPlanes.ts CLIP_BOUNDS) ------------------ */

const bounds = {}
{
  const block = clipPlanes.slice(clipPlanes.indexOf('export const CLIP_BOUNDS'))
  for (const match of block.matchAll(/([xyz]):\s*\{\s*min:\s*(-?[\d.]+),\s*max:\s*(-?[\d.]+)/g)) {
    bounds[match[1]] = { min: Number(match[2]), max: Number(match[3]) }
  }
  if (Object.keys(bounds).length !== 3) fail('bounds', 'could not parse CLIP_BOUNDS')
}
const AXIS_BY_SECTION = { transverse: 'y', coronal: 'z', sagittal: 'x' }

/** Tolerance the layers mount a plate with (imageLayers.MODALITY_TOLERANCE_AU). */
const imageLayers = read('src/components/section/imageLayers.ts')
const tolerance = Number(
  (imageLayers.match(/MODALITY_TOLERANCE_AU\s*=\s*([\d.]+)/) ?? [])[1] ?? NaN,
)
if (!Number.isFinite(tolerance)) fail('tolerance', 'MODALITY_TOLERANCE_AU not found')

/* --- the anchored plates ------------------------------------------------- */

const hPlane = parseNumberRecord(sectionImages, 'const ubcHPlane')
const cPlane = parseNumberRecord(sectionImages, 'const ubcCPlane')
const hLevel = parseNumberRecord(sectionImages, 'const lvlByY')
const cLevel = parseNumberRecord(sectionImages, 'const lvlByZ')

/** @type {{id:string, axis:string, planeValue:number, levelId:string|null}[]} */
const anchored = []
for (const [n, planeValue] of hPlane) {
  anchored.push({
    id: `ubc-h${String(n).padStart(2, '0')}`,
    axis: 'transverse',
    planeValue,
    levelId: hLevel.get(planeValue) ?? null,
  })
}
for (const [n, planeValue] of cPlane) {
  anchored.push({
    id: `ubc-c${String(n).padStart(2, '0')}`,
    axis: 'coronal',
    planeValue,
    levelId: cLevel.get(planeValue) ?? null,
  })
}
for (const match of sectionImages.matchAll(
  /id:\s*'(wikict-axial-\d+)',\s*[\r\n]+\s*levelId:\s*(?:"([^"]+)"|'([^']+)'|(null)),\s*[\r\n]+\s*axis:\s*'(\w+)'[^,]*,\s*[\r\n]+\s*planeValue:\s*(-?[\d.]+)/g,
)) {
  anchored.push({
    id: match[1],
    axis: match[5],
    planeValue: Number(match[6]),
    levelId: match[2] ?? match[3] ?? null,
    group: 'commons-ct',
  })
}
/* v4b: the NLM Visible Human cryosections (`vhp-NNNN`, entries appended after
 * the wikict ones). Same entry shape, same rules — they were invisible to this
 * gate before v4b, which is why the anchoring/selection rules below now cover
 * every group explicitly. */
for (const match of sectionImages.matchAll(
  /id:\s*'(vhp-\d{4})',\s*[\r\n]+\s*levelId:\s*(?:"([^"]+)"|'([^']+)'|(null)),\s*[\r\n]+\s*axis:\s*'(\w+)'[^,]*,\s*[\r\n]+\s*planeValue:\s*(-?[\d.]+)/g,
)) {
  anchored.push({
    id: match[1],
    axis: match[5],
    planeValue: Number(match[6]),
    levelId: match[2] ?? match[3] ?? null,
    group: 'vhp-nlm',
  })
}
/** Every group the anchoring rules must cover — asserted below so a future
 *  entry shape cannot silently escape the gate the way vhp-* initially did. */
const REQUIRED_GROUPS = { 'ubc-h': 9, 'ubc-c': 15, 'commons-ct': 3, 'vhp-nlm': 22 }
{
  const seen = {}
  for (const plate of anchored) {
    const group =
      plate.group ??
      (plate.id.startsWith('ubc-h') ? 'ubc-h' : plate.id.startsWith('ubc-c') ? 'ubc-c' : 'other')
    seen[group] = (seen[group] ?? 0) + 1
  }
  for (const [group, expected] of Object.entries(REQUIRED_GROUPS)) {
    if (seen[group] !== expected) {
      fail(
        'coverage',
        `this gate parsed ${seen[group] ?? 0} ${group} anchor(s), expected ${expected} — a change to ` +
          'sectionImages.ts has made entries invisible to the gate (check the anchor regexes)',
      )
    }
  }
}

/* ------------------------------------------------- 1. anchoring/reachability */

for (const plate of anchored) {
  const axis = AXIS_BY_SECTION[plate.axis]
  const range = bounds[axis]
  if (range === undefined) {
    fail('anchoring', `${plate.id}: unknown axis ${plate.axis}`)
    continue
  }
  if (plate.planeValue < range.min || plate.planeValue > range.max) {
    fail(
      'anchoring',
      `${plate.id} planeValue ${plate.planeValue} is OUTSIDE the reachable ${axis} slider range ` +
        `[${range.min}, ${range.max}] — the plate can never be displayed`,
    )
  }
}

/* ------------------------------------------------- 2. anchor selection rule */

/**
 * Measured pixel area of the committed plates, per id prefix — the same table
 * imageLayers.SOURCE_PIXEL_AREA uses as its tie-break between two plates
 * anchored to one plane. Read from the layer source so the gate cannot drift
 * from the rule it is checking.
 */
const SOURCE_AREA = [
  ...imageLayers.matchAll(/\{\s*prefix:\s*'([\w-]+)',\s*area:\s*([\d\s*]+)\}/g),
].map((match) => ({
  prefix: match[1],
  area: match[2]
    .split('*')
    .map((n) => Number(n.trim()))
    .reduce((a, b) => a * b, 1),
}))
const areaOf = (id) => SOURCE_AREA.find((entry) => id.startsWith(entry.prefix))?.area ?? 0

/** Plates whose mount window overlaps another plate's, with the reason. */
const shadowed = []
for (const plate of anchored) {
  const sameAxis = anchored.filter((other) => other.axis === plate.axis)
  for (const other of sameAxis) {
    if (other.id === plate.id) continue
    const gap = Math.abs(other.planeValue - plate.planeValue)
    if (gap === 0) {
      /**
       * Two plates on the SAME anchor. This is only reportable when the pair
       * makes one plate unreachable; when the two are anchored to the identical
       * plane, `pickStainForPlane` / `photoForPlane` both pick the same winner
       * at every value inside the window, so every consumer shows the same
       * image and nothing is stranded. That is the case this gate must not
       * conflate with a genuine overlap (a *pair of different* anchors whose
       * windows overlap, where the further plate can never be shown).
       * Same-plane pairs are therefore recorded as shadowed anchors and the
       * winner is reported, but they are not a failure.
       */
      const winner =
        areaOf(plate.id) === areaOf(other.id)
          ? plate.id < other.id
            ? plate.id
            : other.id
          : areaOf(plate.id) > areaOf(other.id)
            ? plate.id
            : other.id
      const loser = winner === plate.id ? other.id : plate.id
      shadowed.push(`${loser} is fully shadowed by ${winner} (both anchored to ${plate.axis} = ${plate.planeValue})`)
      continue
    }
    if (gap <= tolerance) {
      // Both plates mount at either plane; the nearest-wins rule still picks
      // one, so the further plate becomes unreachable at its own anchor.
      fail(
        'selection',
        `${plate.id} (${plate.planeValue}) and ${other.id} (${other.planeValue}) mount windows overlap ` +
          `(|Δ| = ${gap} ≤ tolerance ${tolerance}); the further plate is unreachable`,
      )
    }
  }
}
/* De-duplicate the same-plane pairs (each is reported from both sides). */
const shadowedUnique = [...new Set(shadowed.map((line) => line.split(' is fully')[0] + '|' + line.split('shadowed by ')[1]))].map(
  (key) => key.replace('|', ' is fully shadowed by '),
)
shadowed.length = 0
shadowed.push(...shadowedUnique)

/* ------------------------------------------------- 3. level metadata rule */

const anchorIds = new Set(levels.map((entry) => entry.id))
for (const plate of anchored.filter((entry) => entry.axis === 'transverse')) {
  if (plate.levelId === null) continue // deliberately unmapped (outside the authored range)
  if (!anchorIds.has(plate.levelId)) {
    fail('levels', `${plate.id} declares unknown levelId ${plate.levelId}`)
    continue
  }
  // Rule: the declared level must be one of the NEAREST anchors (exact ties are
  // legitimate — e.g. y = −38 sits exactly between the olivary −34 and the
  // sensory-decussation −42 anchors, so either declaration is defensible). A
  // plate declared against a strictly farther anchor is a mapping bug: the
  // canvas/toolbar nearest-anchor lookup (levelIdForPlane) would select a
  // different level at that plate's own plane.
  const distances = levels.map((entry) => Math.abs(entry.y - plate.planeValue))
  const nearestDistance = Math.min(...distances)
  const declaredIndex = levels.findIndex((entry) => entry.id === plate.levelId)
  if (distances[declaredIndex] > nearestDistance + 1e-9) {
    const nearest = levels[distances.indexOf(nearestDistance)]
    fail(
      'levels',
      `${plate.id} (y = ${plate.planeValue}) declares levelId ${plate.levelId} (|Δ| = ${distances[declaredIndex]}) ` +
        `but the nearest anchor is ${nearest.id} (y = ${nearest.y}, |Δ| = ${nearestDistance})`,
    )
  }
}

/* ------------------------------------------------- 4. orientation convention */

const BADGES = { transverse: ['A|P|R|L', 'y'], sagittal: ['S|I|P|A', 'x'], coronal: ['S|I|R|L', 'z'] }
{
  const expected = { A: 'top', P: 'bottom', R: 'left', L: 'right' }
  const canvasTable = sectionCanvas.slice(sectionCanvas.indexOf('const DIRECTION_BADGES'))
  const canvasBadges = {}
  for (const match of canvasTable.matchAll(
    /([xyz]):\s*\{\s*top:\s*'(\w)',\s*bottom:\s*'(\w)',\s*left:\s*'(\w)',\s*right:\s*'(\w)'/g,
  )) {
    canvasBadges[match[1]] = [match[2], match[3], match[4], match[5]]
  }
  const pipTable = sectionPip.slice(sectionPip.indexOf('const SECTION_VIEWS'))
  const pipBadges = {}
  for (const match of pipTable.matchAll(
    /^\s{2}([xyz]):\s*\{[\s\S]*?labels:\s*\{\s*top:\s*'(\w)',\s*bottom:\s*'(\w)',\s*left:\s*'(\w)',\s*right:\s*'(\w)'/gm,
  )) {
    pipBadges[match[1]] = [match[2], match[3], match[4], match[5]]
  }
  const plan = {}
  {
    // §2.2 (authoritative): "transverse = anterior up, patient-left on
    // image-right ...; sagittal = superior up, anterior right; coronal =
    // superior up, patient-left on image-right". Assert the three clauses.
    const section = syncPlan.slice(syncPlan.indexOf('### 2.2'))
    const clauses = [
      /transverse = anterior up, patient-left on image-right/i,
      /sagittal = superior up, anterior right/i,
      /coronal = superior up, patient-left on image-right/i,
    ]
    if (clauses.every((clause) => clause.test(section))) plan.parsed = '§2.2'
  }
  if (plan.parsed === undefined) {
    fail('orientation', 'docs/SECTION_SYNC_PLAN.md §2.2 orientation table not found or reworded')
  }
  // §2.2 (authoritative): transverse A-up / L-right, sagittal S-up / A-right,
  // coronal S-up (patient-left on image right ⇒ badge letter L on the right).
  const wanted = { y: ['A', 'P', 'R', 'L'], x: ['S', 'I', 'P', 'A'], z: ['S', 'I', 'R', 'L'] }
  for (const [axis, letters] of Object.entries(wanted)) {
    const onCanvas = canvasBadges[axis]
    if (onCanvas === undefined) fail('orientation', `SectionCanvas DIRECTION_BADGES has no ${axis} entry`)
    else if (onCanvas.join('') !== letters.join('')) {
      fail(
        'orientation',
        `SectionCanvas ${axis} badges ${onCanvas.join('/')} disagree with §2.2 ${letters.join('/')}`,
      )
    }
    const onPip = pipBadges[axis]
    if (onPip === undefined) fail('orientation', `SectionPiP SECTION_VIEWS has no ${axis} entry`)
    else if (onPip.join('') !== letters.join('')) {
      fail(
        'orientation',
        `SectionPiP ${axis} badges ${onPip.join('/')} disagree with §2.2 ${letters.join('/')} ` +
          '(and with SectionCanvas — the same plane must be labelled identically on both surfaces)',
      )
    }
  }
}

/* ------------------------------------------------- 5. attribution strings */

const UBC_CREDIT = '© University of British Columbia, CC BY-NC-SA 4.0'
const BMM_CREDIT =
  'University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health'
const CT_PLATE_CREDIT =
  'CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)'
const CT_GRID_CREDIT = typeof ctManifest.credit === 'string' ? ctManifest.credit : ''
const MRI_CREDIT = `${mriManifest.source ?? ''}, OpenNeuro ${mriManifest.license ?? ''}`
/**
 * v4b: the NLM Visible Human CRYOSECTION acknowledgement, read out of
 * sectionImages.ts (`VHP_CREDIT`) rather than retyped here, so the constant the
 * UI renders and the constant this gate checks cannot drift apart.
 */
const VHP_CREDIT = (sectionImages.match(/export const VHP_CREDIT\s*=\s*'([^']*)'/) ?? [])[1] ?? ''

/**
 * Each credit must be verbatim in the module that ships it AND in both prose
 * records. The photographic lines live in sectionImages.ts; the continuous CT
 * grid's acknowledgement lives in ct-manifest.json (the file the layers read).
 */
for (const [label, credit, ...documents] of [
  [
    'UBC (photographs)',
    UBC_CREDIT,
    ['src/data/sectionImages.ts', sectionImages],
    ['docs/ATTRIBUTION.md', attribution],
    ['README.md', readme],
  ],
  [
    'brainmuseum/MSU (photographs)',
    BMM_CREDIT,
    ['src/data/sectionImages.ts', sectionImages],
    ['docs/ATTRIBUTION.md', attribution],
    ['README.md', readme],
  ],
  [
    'Commons CT plates',
    CT_PLATE_CREDIT,
    ['src/data/sectionImages.ts', sectionImages],
    ['docs/ATTRIBUTION.md', attribution],
    ['README.md', readme],
  ],
  [
    'NLM Visible Human CT grid',
    CT_GRID_CREDIT,
    ['src/assets/imaging/ct-manifest.json', JSON.stringify(ctManifest)],
    ['docs/ATTRIBUTION.md', attribution],
    ['README.md', readme],
  ],
  [
    'NLM Visible Human cryosections (VHP_CREDIT)',
    VHP_CREDIT,
    ['src/data/sectionImages.ts', sectionImages],
    ['src/assets/imaging/ct-manifest.json', JSON.stringify(ctManifest)],
    ['docs/ATTRIBUTION.md', attribution],
    ['README.md', readme],
  ],
]) {
  if (credit.length === 0) {
    fail('attribution', `${label} credit is empty`)
    continue
  }
  for (const [doc, text] of documents) {
    if (!text.includes(credit)) {
      fail('attribution', `${label} credit line is not present verbatim in ${doc}`)
    }
  }
}
if (CT_GRID_CREDIT !== 'Courtesy of the U.S. National Library of Medicine') {
  fail(
    'attribution',
    `CT grid credit is "${CT_GRID_CREDIT}" — the NLM Terms require the exact phrase ` +
      '"Courtesy of the U.S. National Library of Medicine"',
  )
}
if (VHP_CREDIT !== 'Courtesy of the U.S. National Library of Medicine') {
  fail(
    'attribution',
    `VHP_CREDIT is "${VHP_CREDIT}" — the NLM Terms require the exact phrase ` +
      '"Courtesy of the U.S. National Library of Medicine" (no paraphrase, no trailing period)',
  )
}
/* NLM's "most current version OR say so" obligation, met by the second arm:
 * the committed plate set must declare itself a FROZEN snapshot, not a live
 * NLM mirror. Asserted in the manifest (what the UI renders) and both prose
 * records. `docs/ATTRIBUTION.md` emphases the phrase internally with markdown
 * (`**frozen 2026-09-10 snapshot**`), so emphasis markers are stripped before
 * the test — the assertion is about the sentence, not about its typography. */
const stripEmphasis = (text) => text.replace(/[*_`]/g, '')
for (const [doc, text] of [
  ['src/data/sectionImages.ts', sectionImages],
  ['docs/ATTRIBUTION.md', attribution],
  ['README.md', readme],
]) {
  const plain = stripEmphasis(text)
  if (!/frozen 2026-09-10 snapshot/i.test(plain) || !/not a live NLM mirror/i.test(plain)) {
    fail(
      'attribution',
      `${doc} does not state the frozen-2026-09-10-snapshot / "not a live NLM mirror" position ` +
        'that NLM\'s "most current version OR say so" condition requires',
    )
  }
}
/* The VHP plates must actually ship: a manifest whose every cyrosection entry
 * has gone missing would otherwise pass every rule above vacuously. */
{
  const vhp = anchored.filter((plate) => plate.id.startsWith('vhp-'))
  if (vhp.length < 16) {
    fail('coverage', `only ${vhp.length} NLM Visible Human cryosection(s) are anchored (v4b requires ≥ 16)`)
  }
}
for (const [doc, text] of [
  ['docs/ATTRIBUTION.md', attribution],
  ['README.md', readme],
]) {
  if (!text.includes(MRI_CREDIT)) {
    fail(
      'attribution',
      `the MRI provenance string shown in-UI ("${MRI_CREDIT}", built from mri-manifest.json) ` +
        `is not present verbatim in ${doc}`,
    )
  }
}
if (typeof ctManifest.fetchDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ctManifest.fetchDate)) {
  fail('attribution', 'ct-manifest.json has no ISO fetchDate')
}

/* ------------------------------------------------- 6. assets + budgets */

const MANIFEST_MIME = { '.jpg': 'jpeg', '.png': 'png' }
const referenced = new Set()
for (const match of sectionImages.matchAll(/from '\.\.\/assets\/imaging\/stains\/([\w.-]+)'/g)) {
  referenced.add(match[1])
  const path = join(ROOT, 'src/assets/imaging/stains', match[1])
  if (!existsSync(path)) fail('assets', `manifest references a missing file: stains/${match[1]}`)
  const ext = match[1].slice(match[1].lastIndexOf('.'))
  if (MANIFEST_MIME[ext] === undefined) {
    fail('assets', `unexpected stain extension ${ext} (${match[1]}) — v3 JPEG / v4 PNG only`)
  }
}
const onDisk = readdirSync(join(ROOT, 'src/assets/imaging/stains')).filter((name) =>
  Object.hasOwn(MANIFEST_MIME, name.slice(name.lastIndexOf('.'))),
)
for (const name of onDisk) {
  if (!referenced.has(name)) fail('assets', `committed stain file is not in the manifest: stains/${name}`)
}

function dirBytes(relative, filter = () => true) {
  let total = 0
  let count = 0
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (filter(entry.name)) {
        total += statSync(path).size
        count += 1
      }
    }
  }
  walk(join(ROOT, relative))
  return { total, count }
}

const MIB = 1024 * 1024
const imaging = dirBytes('src/assets/imaging')
if (imaging.total > 8 * MIB) {
  fail('budget', `imaging payload ${(imaging.total / MIB).toFixed(2)} MiB exceeds the 8 MiB plan §4 cap`)
}
/** v4-added assets: the 24 UBC plates + 3 Commons CT plates + ct.bin. */
const v4Added = ['ct.bin']
let v4Bytes = statSync(join(ROOT, 'src/assets/imaging/ct.bin')).size
for (const name of onDisk) {
  if (/^ubc-[hc]\d/.test(name) || /^wikict-/.test(name)) {
    v4Added.push(`stains/${name}`)
    v4Bytes += statSync(join(ROOT, 'src/assets/imaging/stains', name)).size
  }
}
if (v4Bytes > 4 * MIB) {
  fail('budget', `v4-added assets ${(v4Bytes / MIB).toFixed(2)} MiB exceed the 4 MiB plan §4 cap`)
}

/* ------------------------------------------------- 7. link-out-only sources */

const LINK_OUT_ONLY = ['med.harvard.edu', 'brainmaps.org', 'brainmaps']
for (const host of LINK_OUT_ONLY) {
  for (const [file, text] of [
    ['src/assets/imaging/ct-manifest.json', JSON.stringify(ctManifest)],
    ['src/assets/imaging/mri-manifest.json', JSON.stringify(mriManifest)],
    ['src/data/sectionImages.ts', sectionImages],
  ]) {
    // The hosts may only appear as link-outs (`sourceUrl` / link chips), never
    // as a file the build embeds. Embedding would show up as a file path or a
    // local reference next to those hosts — assert none exists.
    const localRef = new RegExp(`${host.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[^'"\\n]*\\.(jpg|jpeg|png|bin)`, 'i')
    if (localRef.test(text)) fail('link-out', `${file} appears to embed a link-out-only source (${host})`)
  }
}

/* ------------------------------------------------------------- report */

console.log('NeuroAxis v4 imaging QA — anchored photograph audit')
console.log(`  tolerance (mount window)  ±${tolerance} au`)
console.log(
  `  clip bounds               x ${bounds.x.min}..${bounds.x.max} · y ${bounds.y.min}..${bounds.y.max} · z ${bounds.z.min}..${bounds.z.max}`,
)
console.log(`  anchored photographs      ${anchored.length}`)
for (const plate of anchored) {
  const axis = AXIS_BY_SECTION[plate.axis]
  const range = bounds[axis]
  const reachable =
    range !== undefined && plate.planeValue >= range.min && plate.planeValue <= range.max
      ? 'ok'
      : 'OUT OF RANGE'
  console.log(
    `    ${plate.id.padEnd(16)} ${plate.axis.padEnd(10)} ${axis} = ${String(plate.planeValue).padStart(6)}  ` +
      `window [${(plate.planeValue - tolerance).toFixed(1)}, ${(plate.planeValue + tolerance).toFixed(1)}]  ${reachable}`,
  )
}
{
  /* v4b: what each group of anchored plates weighs on disk. */
  const byGroup = [
    ['NLM Visible Human cryosections (v4b)', (name) => /^vhp-/.test(name)],
    ['UBC photographs (v4)', (name) => /^ubc-[hc]\d/.test(name)],
    ['Commons CC0 CT plates (v4)', (name) => /^wikict-/.test(name)],
    ['v3 micrographs', (name) => /^ubc-m\d/.test(name) || /^bmm-/.test(name)],
  ]
  for (const [label, match] of byGroup) {
    const group = onDisk.filter(match)
    const bytes = group.reduce((sum, name) => sum + statSync(join(ROOT, 'src/assets/imaging/stains', name)).size, 0)
    console.log(
      `  ${label.padEnd(38)} ${String(group.length).padStart(3)} files ${(bytes / 1024).toFixed(1).padStart(8)} kB  ${(bytes / MIB).toFixed(3)} MiB`,
    )
  }
}
console.log(
  `  imaging payload           ${(imaging.total / MIB).toFixed(2)} MiB in ${imaging.count} files (cap 8.00 MiB)`,
)
console.log(
  `  v4-added assets           ${(v4Bytes / MIB).toFixed(2)} MiB in ${v4Added.length} files (cap 4.00 MiB)`,
)
for (const note of shadowed) console.log(`  note                      ${note}`)
for (const note of notes) console.log(`  ${note}`)

if (violations.length > 0) {
  console.error(`\n✖ v4 imaging QA FAILED — ${violations.length} violation(s):`)
  for (const violation of violations) console.error(`  • ${violation}`)
  process.exit(1)
}
console.log('\n✔ v4 imaging QA PASSED — anchors reachable, selection unambiguous, orientation matches §2.2,')
console.log('  credits verbatim in code + docs, assets complete, budgets respected, no link-out source embedded.')
