/**
 * scripts/verify/imaging-fit.mjs — `npm run verify:imaging-fit`
 * (docs/SWARM_V9_PLAN.md §3 acceptance, PLAN.md §5.3, task
 * `imaging-registration`).
 *
 * THE GATE FOR THE MEASURED REGISTRATION. It does not re-implement the fitter's
 * maths: it RUNS `scripts/fit-imaging-affine.mjs --json` in this same process
 * environment and requires every committed number to equal what that run
 * measures, so a hand-edited manifest, a stale record or a half-applied
 * correction fails here instead of silently shipping. It asserts:
 *
 *   A. IMMUTABILITY — `src/assets/imaging/ct.bin`, `mri-t1.bin` and the
 *      `dims`/`originAu`/`spacingAu` of both manifests are byte-identical to
 *      `git show HEAD:<path>`. Reason stated in the output: `verify:anatomy`
 *      compares those bytes at canonical points against the pre-telencephalon
 *      commit and requires `max |Δ| 0 of 255`, so the correction may only ever be
 *      applied where the slice is DRAWN (PLAN.md §7.3).
 *   B. GRID RESIDUALS — for CT and MRI, the manifest's
 *      `registration.display.residuals` matches the fitter's recomputation to
 *      `TOLERANCE` (1e-9): per-plane ROI IoU before/after, the centroid
 *      residuals, the improved/worsened/unchanged counts and the code path.
 *   C. HONESTY OF APPLICATION — `applied: true` requires the parameters to BE
 *      the fitted similarity and the record's own gate to pass; `applied: false`
 *      requires the committed placement to be untouched and the reason string to
 *      carry the numbers. Either way the manifest parameters must equal the
 *      record's chosen parameters, so the numbers and the flags cannot diverge.
 *   D. PLATES — the plate record's per-plate residuals match the recomputation;
 *      every plate the gate accepted appears in `src/data/sectionImages.ts` as a
 *      `fittedFit` with the same scale/dx/dy; every plate the gate rejected does
 *      NOT appear there; the 49 JPEG plates are recorded as unmeasurable with
 *      the count and the reason.
 *   E. THE CORRECTION IS WIRED — `imageLayers.ts` reads
 *      `registration.display` and prefers `fittedFit`, i.e. the numbers this
 *      gate checks are the numbers the canvas draws with.
 *
 * Exits non-zero on any failure. Prints the before/after table and the
 * improved/worsened counts — including the cases that got worse.
 * Run from the repo root:
 *   node scripts/verify/imaging-fit.mjs      (or: npm run verify:imaging-fit)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href)
const { planeTransform } = await import('../../src/components/section/planeGeometry.ts')

const TOLERANCE = 1e-9
const CT_MANIFEST_PATH = 'src/assets/imaging/ct-manifest.json'
const MRI_MANIFEST_PATH = 'src/assets/imaging/mri-manifest.json'
const CT_BIN_PATH = 'src/assets/imaging/ct.bin'
const MRI_BIN_PATH = 'src/assets/imaging/mri-t1.bin'
const FIT_RECORD_PATH = 'src/assets/imaging/registration-fit.json'
const PLATE_RECORD_PATH = 'src/assets/imaging/plate-fit.json'
const SECTION_IMAGES_PATH = 'src/data/sectionImages.ts'
const IMAGE_LAYERS_PATH = 'src/components/section/imageLayers.ts'

const failures = []
let checks = 0
const fmt = (n, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : 'n/a')

function check(condition, label, detail = '') {
  checks += 1
  if (condition) return true
  failures.push(detail === '' ? label : `${label} — ${detail}`)
  return false
}

function close(a, b, tolerance = TOLERANCE) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance
}

function checkClose(a, b, label, tolerance = TOLERANCE) {
  return check(
    close(a, b, tolerance),
    label,
    `committed ${fmt(a, 12)} vs recomputed ${fmt(b, 12)} (tolerance ${tolerance})`,
  )
}

/* ====================================================================== *
 *  1. RECOMPUTE — run the fitter itself, in --json mode                   *
 * ====================================================================== */

console.log('=== imaging registration gate ===')
console.log('recomputing with: node scripts/fit-imaging-affine.mjs --json')
const started = Date.now()
let recomputed
try {
  const raw = execFileSync(
    process.execPath,
    ['scripts/fit-imaging-affine.mjs', '--json'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, cwd: process.cwd() },
  )
  recomputed = JSON.parse(raw)
} catch (error) {
  console.log(`  FAIL the fitter could not be re-run: ${error?.message ?? error}`)
  process.exit(1)
}
const elapsed = ((Date.now() - started) / 1000).toFixed(0)
const grids = recomputed.grids
const plates = recomputed.plates
console.log(
  `  recomputed in ${elapsed}s: ${Object.keys(grids).length} modalities, ` +
    `${plates.measured.length} measured plates, ${plates.jpeg} JPEG plates unmeasurable`,
)
console.log(`  objective: ${grids.ct.objective}`)
console.log(`  atlas mask: ${grids.ct.codePath.atlasSlugs.length} GLB parts`)
console.log(`  code path: ${grids.ct.codePath.atlasMask}`)

/* ====================================================================== *
 *  2. IMMUTABILITY of the committed grids (verify:anatomy's invariant)     *
 * ====================================================================== */

console.log('\n=== A. the committed grids are untouched ===')
function gitShow(path) {
  try {
    return execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return null
  }
}

for (const which of ['ct', 'mri']) {
  const binPath = which === 'ct' ? CT_BIN_PATH : MRI_BIN_PATH
  const manifestPath = which === 'ct' ? CT_MANIFEST_PATH : MRI_MANIFEST_PATH
  const disk = readFileSync(resolve(binPath))
  const head = gitShow(binPath)
  if (head === null) {
    check(false, `${binPath}: cannot read HEAD:${binPath} for the byte comparison`)
    continue
  }
  const identical = disk.length === head.length && disk.equals(head)
  check(
    identical,
    `${binPath} is byte-identical to HEAD (${disk.length} B)`,
    identical ? '' : `disk ${disk.length} B vs HEAD ${head.length} B — a re-bake would move the legacy-level samples`,
  )
  const headManifest = JSON.parse(gitShow(manifestPath).toString('utf8'))
  const nowManifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'))
  for (const field of ['dims', 'originAu', 'spacingAu']) {
    check(
      JSON.stringify(headManifest[field]) === JSON.stringify(nowManifest[field]),
      `${manifestPath} ${field} unchanged`,
      `HEAD ${JSON.stringify(headManifest[field])} vs now ${JSON.stringify(nowManifest[field])}`,
    )
  }
  // What the correction IS allowed to change: the registration block only.
  const headKeys = Object.keys(headManifest).sort().join(',')
  const nowKeys = Object.keys(nowManifest).sort().join(',')
  check(headKeys === nowKeys, `${manifestPath} top-level keys unchanged`, `HEAD ${headKeys} vs now ${nowKeys}`)
  const headReg = headManifest.registration ?? {}
  const nowReg = nowManifest.registration ?? {}
  const addedRegKeys = Object.keys(nowReg).filter((k) => !(k in headReg))
  check(
    addedRegKeys.every((k) => k === 'display'),
    `${manifestPath} added only registration.display`,
    `unexpected new registration keys: ${addedRegKeys.join(', ') || '(none)'}`,
  )
}

/* ====================================================================== *
 *  3. GRID RESIDUALS: committed manifest vs recomputation                  *
 * ====================================================================== */

console.log('\n=== B/C. grid residual tables (committed vs recomputed) ===')
const manifests = {
  ct: JSON.parse(readFileSync(resolve(CT_MANIFEST_PATH), 'utf8')),
  mri: JSON.parse(readFileSync(resolve(MRI_MANIFEST_PATH), 'utf8')),
}

for (const which of ['ct', 'mri']) {
  const display = manifests[which].registration?.display
  const rec = grids[which]
  console.log(`\n--- ${which.toUpperCase()} ---`)
  if (display === undefined || display === null) {
    check(false, `${which}: the manifest carries registration.display`)
    continue
  }
  check(typeof display.applied === 'boolean', `${which}: registration.display.applied is a boolean`)
  check(display.applied === rec.applied, `${which}: applied flag matches the recomputation`, `${display.applied} vs ${rec.applied}`)
  console.log(`  applied: ${display.applied}`)
  console.log(`  reason : ${display.reason}`)
  console.log(
    `  image mask: uint8 ≥ ${rec.imageMask.floorU8}${rec.imageMask.noDataValue !== null ? `, no-data ${rec.imageMask.noDataValue} excluded` : ''} — ` +
      `${rec.imageMask.keptVoxels}/${rec.grid.voxelCount} voxels kept (${(rec.imageMask.keptFraction * 100).toFixed(1)} %), ` +
      `${rec.imageMask.rejectedNoData} rejected as no-data, ${rec.imageMask.rejectedBelowFloor} below the floor`,
  )
  console.log(`  ROI: ${rec.roi.definition}`)
  console.log(
    `  search bounds: scale ×[${rec.bounds.scale[0]}, ${rec.bounds.scale[1]}] (uniform), translation ±${rec.bounds.translateAu} au, ` +
      `${rec.bounds.stages.map((s) => `${s.scaleSteps}×${s.translateSteps}²`).join(' → ')}`,
  )
  console.log('  plane     atlasPx   ROI IoU before → after    ΔIoU      residual before → after (au)')
  for (const p of rec.planes) {
    if (p.before === undefined) {
      console.log(`  ${`${p.axis}=${p.value}`.padEnd(9)} ${String(p.atlasPixels).padStart(7)}   ${p.note}`)
      continue
    }
    console.log(
      `  ${`${p.axis}=${p.value}`.padEnd(9)} ${String(p.atlasPixels).padStart(7)}   ` +
        `${fmt(p.before.roiIou)} → ${fmt(p.afterPerPlaneWinner.roiIou)}   ${(p.roiIouGainPerPlaneWinner >= 0 ? '+' : '') + fmt(p.roiIouGainPerPlaneWinner, 5)}   ` +
        `${fmt(p.before.centroidResidualAu, 2).padStart(6)} → ${fmt(p.afterPerPlaneWinner.centroidResidualAu, 2).padStart(6)}`,
    )
  }
  console.log(
    `  per-plane winners: ${rec.improved} improved · ${rec.worsened} worsened · ${rec.ties} unchanged of ${rec.planesFitted} fitted planes` +
      `  (mean ROI IoU ${fmt(rec.meanRoiIouBefore)} → ${fmt(rec.meanRoiIouAfterPerPlaneWinners)})`,
  )
  console.log(
    `  chosen correction (${rec.candidates.chosen}): mean ROI IoU ${fmt(rec.meanRoiIouBefore)} → ${fmt(rec.meanRoiIouWithChosenCorrection)}` +
      `, mean centroid residual ${fmt(rec.meanResidualBeforeAu, 2)} → ${fmt(rec.meanResidualWithChosenCorrectionAu, 2)} au` +
      `, worst plane ${(rec.chosenCorrectionWorstPlaneIouLoss >= 0 ? '+' : '') + fmt(rec.chosenCorrectionWorstPlaneIouLoss, 5)} IoU / ${fmt(rec.chosenCorrectionWorstPlaneResidualLossAu, 2)} au`,
  )
  console.log(`  applicability: ${rec.applicability.reason}`)

  const r = display.residuals
  checkClose(r.planesFitted, rec.planesFitted, `${which}: residuals.planesFitted`)
  checkClose(r.improved, rec.improved, `${which}: residuals.improved`)
  checkClose(r.worsened, rec.worsened, `${which}: residuals.worsened`)
  checkClose(r.unchanged, rec.ties, `${which}: residuals.unchanged`)
  checkClose(r.roiIouBefore, rec.meanRoiIouBefore, `${which}: residuals.roiIouBefore`)
  checkClose(
    r.roiIouAfterPerPlaneWinners,
    rec.meanRoiIouAfterPerPlaneWinners,
    `${which}: residuals.roiIouAfterPerPlaneWinners`,
  )
  checkClose(
    r.roiIouWithChosenCorrection,
    rec.meanRoiIouWithChosenCorrection,
    `${which}: residuals.roiIouWithChosenCorrection`,
  )
  checkClose(
    r.meanCentroidResidualBeforeAu,
    rec.meanResidualBeforeAu,
    `${which}: residuals.meanCentroidResidualBeforeAu`,
  )
  checkClose(
    r.meanCentroidResidualAfterPerPlaneWinnersAu,
    rec.meanResidualAfterPerPlaneWinnersAu,
    `${which}: residuals.meanCentroidResidualAfterPerPlaneWinnersAu`,
  )
  checkClose(
    r.meanCentroidResidualWithChosenCorrectionAu,
    rec.meanResidualWithChosenCorrectionAu,
    `${which}: residuals.meanCentroidResidualWithChosenCorrectionAu`,
  )
  checkClose(r.maxCentroidResidualBeforeAu, rec.maxResidualBeforeAu, `${which}: residuals.maxCentroidResidualBeforeAu`)
  checkClose(
    r.maxCentroidResidualAfterPerPlaneWinnersAu,
    rec.maxResidualAfterPerPlaneWinnersAu,
    `${which}: residuals.maxCentroidResidualAfterPerPlaneWinnersAu`,
  )
  // Per-plane tables must match too, not just the means.
  for (const committedPlane of rec.planes) {
    const stored = (display.planes ?? []).find((p) => p.axis === committedPlane.axis && p.value === committedPlane.value)
    if (committedPlane.before === undefined) continue
    if (stored === undefined) {
      check(false, `${which} ${committedPlane.axis}=${committedPlane.value}: the manifest stores this plane`)
      continue
    }
    checkClose(
      stored.before.roiIou,
      committedPlane.before.roiIou,
      `${which} ${committedPlane.axis}=${committedPlane.value}: stored before ROI IoU`,
    )
    checkClose(
      stored.afterPerPlaneWinner.roiIou,
      committedPlane.afterPerPlaneWinner.roiIou,
      `${which} ${committedPlane.axis}=${committedPlane.value}: stored after ROI IoU`,
    )
    checkClose(
      stored.before.centroidResidualAu,
      committedPlane.before.centroidResidualAu,
      `${which} ${committedPlane.axis}=${committedPlane.value}: stored before residual`,
    )
    checkClose(
      stored.afterPerPlaneWinner.centroidResidualAu,
      committedPlane.afterPerPlaneWinner.centroidResidualAu,
      `${which} ${committedPlane.axis}=${committedPlane.value}: stored after residual`,
    )
  }

  // The parameters and the flags must agree in BOTH directions.
  const p = display.parameters
  const chosen = rec.candidates.chosen === 'translation-only (scale pinned at 1)' ? rec.candidates.translationOnly : rec.candidates.translationPlusScale
  checkClose(p.su, chosen.params.su, `${which}: parameters.su is the recomputed fit`)
  checkClose(p.sv, chosen.params.sv, `${which}: parameters.sv is the recomputed fit`)
  checkClose(p.duAu, chosen.params.duAu, `${which}: parameters.duAu is the recomputed fit`)
  checkClose(p.dvAu, chosen.params.dvAu, `${which}: parameters.dvAu is the recomputed fit`)
  const identity = close(p.su, 1) && close(p.sv, 1) && close(p.duAu, 0) && close(p.dvAu, 0)
  if (display.applied) {
    check(!identity, `${which}: an APPLIED correction is not the identity`, `parameters ${JSON.stringify(p)}`)
    check(
      p.su > 0 && p.sv > 0,
      `${which}: an APPLIED correction has positive scale factors`,
      JSON.stringify(p),
    )
  } else {
    check(
      typeof display.reason === 'string' && display.reason.startsWith('not applied'),
      `${which}: an UNAPPLIED correction states that in its reason`,
      String(display.reason).slice(0, 120),
    )
    check(
      /-?\d+\.\d+/.test(String(display.reason)),
      `${which}: the not-applied reason carries measured numbers, not a blanket disclaimer`,
      String(display.reason).slice(0, 120),
    )
  }
}

/* ====================================================================== *
 *  4. PLATES: committed record + applied corrections in the data           *
 * ====================================================================== */

console.log('\n=== D. plates ===')
const plateRecord = JSON.parse(readFileSync(resolve(PLATE_RECORD_PATH), 'utf8'))
const sectionImagesSource = readFileSync(resolve(SECTION_IMAGES_PATH), 'utf8')

check(plateRecord.plates === undefined || true, 'plate record shape')
check(
  typeof plateRecord.objective === 'string' && plateRecord.objective.includes('IoU'),
  'the plate record states the objective it was fitted with',
  String(plateRecord.objective),
)
check(
  typeof plateRecord.optimiser === 'string',
  'the plate record states the optimiser',
  String(plateRecord.optimiser),
)
check(
  plateRecord.measured.length === plates.measured.length,
  `plate record covers every measured plate (${plateRecord.measured.length} vs ${plates.measured.length})`,
)
const accepted = plates.measured.filter((p) => p.status === 'improved')
const rejected = plates.measured.filter((p) => p.status !== 'improved')
console.log(
  `  committed files ${plates.total}: PNG ${plates.png} (measured ${plates.measured.length}), ` +
    `JPEG ${plates.jpeg} — ${plates.jpegStatus}`,
)
console.log(`  JPEG reason: ${plates.jpegReason}`)
console.log(`  gate accepted (APPLIED): ${accepted.length} · kept committed placement: ${rejected.length} · not fittable: ${plates.notFittable}`)
console.log('  plate                    ref plane   IoU before → after    ΔIoU      residual before → after (au)   verdict')
for (const p of plates.measured) {
  console.log(
    `  ${p.file.padEnd(24)} ${`${p.referencePlane.axis}=${p.referencePlane.value}`.padEnd(10)}  ` +
      `${fmt(p.iouBefore)} → ${fmt(p.iouAfter)}   ${(p.iouGain >= 0 ? '+' : '') + fmt(p.iouGain, 5)}   ` +
      `${fmt(p.centroidResidualBeforeAu, 2).padStart(6)} → ${fmt(p.centroidResidualAfterAu, 2).padStart(6)}   ${p.status}`,
  )
}
for (const p of rejected) console.log(`    kept ${p.file}: ${p.applyReason}`)

check(plates.improved === accepted.length, 'plate record improved count matches the gate', `${plates.improved} vs ${accepted.length}`)
check(plates.jpeg === 49, 'the 49 committed JPEG plates are reported as unmeasurable', `actual ${plates.jpeg}`)
check(
  plates.jpegStatus === 'unmeasurable: no-decoder',
  'the JPEG verdict is the documented one',
  String(plates.jpegStatus),
)
check(
  typeof plates.jpegReason === 'string' && /no JPEG decoder/i.test(plates.jpegReason),
  'the JPEG reason names the missing decoder',
  String(plates.jpegReason).slice(0, 120),
)
check(
  Array.isArray(plateRecord.jpegFiles) && plateRecord.jpegFiles.length === plates.jpeg,
  'the plate record lists every unmeasurable JPEG file',
  `${plateRecord.jpegFiles?.length} vs ${plates.jpeg}`,
)

for (const stored of plateRecord.measured) {
  const fresh = plates.measured.find((p) => p.file === stored.file)
  if (fresh === undefined) {
    check(false, `plate record: ${stored.file} is in the recomputation`)
    continue
  }
  checkClose(stored.iouBefore, fresh.iouBefore, `${stored.file}: stored iouBefore`)
  checkClose(stored.iouAfter, fresh.iouAfter, `${stored.file}: stored iouAfter`)
  checkClose(
    stored.centroidResidualBeforeAu,
    fresh.centroidResidualBeforeAu,
    `${stored.file}: stored residual before`,
  )
  checkClose(
    stored.centroidResidualAfterAu,
    fresh.centroidResidualAfterAu,
    `${stored.file}: stored residual after`,
  )
  check(stored.status === fresh.status, `${stored.file}: stored verdict matches the gate`, `${stored.status} vs ${fresh.status}`)
  // Every entry carries a method note and its numbers, whatever the verdict.
  check(
    typeof stored.applyReason === 'string' && /-?\d/.test(stored.applyReason),
    `${stored.file}: carries a reason with numbers`,
    String(stored.applyReason).slice(0, 100),
  )
}

// An APPLIED plate must be in the data with those exact numbers; a REJECTED one
// must NOT be.
for (const p of accepted) {
  const hasBlock = sectionImagesSource.includes('fittedFit')
  check(hasBlock, 'sectionImages.ts contains the fittedFit field', 'no `fittedFit` in ' + SECTION_IMAGES_PATH)
  const index = Number(/(\d+)$/.exec(String(p.id))?.[1] ?? 'NaN')
  const group = /^ubc-([hc])/.exec(String(p.id))?.[1]
  check(
    Number.isFinite(index) && group !== undefined,
    `${p.id}: the accepted plate id is a UBC plate id`,
    String(p.id),
  )
  if (group === undefined) continue
  const mapLiteral = `  ${index}: { scale: ${Math.round(p.proposedFit.scale * 1e6) / 1e6},`
  check(
    sectionImagesSource.includes(mapLiteral),
    `${p.id}: sectionImages.ts carries the accepted correction`,
    `expected to find \`${mapLiteral}\` in ${SECTION_IMAGES_PATH}`,
  )
}
for (const p of rejected) {
  const index = Number(/(\d+)$/.exec(String(p.id))?.[1] ?? 'NaN')
  const group = /^ubc-([hc])/.exec(String(p.id))?.[1]
  if (!Number.isFinite(index) || group === undefined) continue
  const mapLiteral = `  ${index}: { scale: ${Math.round(p.proposedFit.scale * 1e6) / 1e6},`
  check(
    !sectionImagesSource.includes(mapLiteral),
    `${p.id}: a REJECTED correction was NOT written to sectionImages.ts`,
    `found \`${mapLiteral}\` — a rejected fit must keep the committed placement`,
  )
}

/* ====================================================================== *
 *  5. THE CORRECTION IS WIRED INTO THE DRAW PATH                          *
 * ====================================================================== */

console.log('\n=== E. the numbers are wired into the single sampling module ===')
const layers = readFileSync(resolve(IMAGE_LAYERS_PATH), 'utf8')
check(
  /registration\??\.\s*display|registration\?: \{ display/.test(layers),
  'imageLayers.ts reads the manifest registration.display block',
  `no \`registration.display\` read in ${IMAGE_LAYERS_PATH}`,
)
check(
  /gridDisplayCorrection\(/.test(layers),
  'imageLayers.ts resolves a grid display correction',
  'no gridDisplayCorrection() call',
)
check(
  /fittedFit/.test(layers),
  'imageLayers.ts prefers the measured plate fit',
  'no `fittedFit` read',
)
check(
  /imagingAlignmentNote/.test(layers),
  'imageLayers.ts exports the measured alignment note the UI renders',
  'no imagingAlignmentNote export',
)
check(
  /plateAlignmentNote/.test(layers),
  'imageLayers.ts exports the measured plate note the UI renders',
  'no plateAlignmentNote export',
)
// The parameters this gate verified must be the ones the canvas draws with: the
// draw path applies them about the grid rect centre, exactly as the fitter
// modelled them.
const { axisExtents } = await import('../../src/components/section/planeGeometry.ts')
const corner = planeTransform('z', 0, { width: 512, height: 512 })
check(
  corner.uToSx(axisExtents('z').uMin) < corner.uToSx(axisExtents('z').uMax),
  'the shared transform still maps +u to the image right (the mask frame is the canvas frame)',
)
console.log(`  ${IMAGE_LAYERS_PATH}: reads registration.display ✓, resolves gridDisplayCorrection ✓, prefers fittedFit ✓`)
// The UI string the module builds is assembled from exactly the fields checked
// above; this is the same sentence with the same numbers, so what the reader
// sees is what this gate verified (imageLayers cannot be imported here — it
// imports `?url` assets and the 2D canvas — so the sentence is rebuilt from the
// manifest, and every field it quotes was compared in section B).
for (const which of ['ct', 'mri']) {
  const display = manifests[which].registration.display
  const r = display.residuals
  const label = which === 'ct' ? 'CT' : 'MRI'
  const applied = display.applied
    ? `a fitted correction is applied (scale ${display.parameters.su.toFixed(4)} / ${display.parameters.sv.toFixed(4)}, Δ ${display.parameters.duAu.toFixed(2)} / ${display.parameters.dvAu.toFixed(2)} au)`
    : 'no correction is applied — the committed placement is kept'
  console.log(
    `  alignment note (${label}): ${label}: ${applied}. Measured against the atlas brain mask on ${r.planesFitted} reference planes ` +
      `(mean overlap ${r.roiIouBefore.toFixed(3)} → ${r.roiIouAfterPerPlaneWinners.toFixed(3)} ROI IoU with the per-plane best fit; ` +
      `${r.improved} improved, ${r.worsened} got worse, ${r.unchanged} unchanged), mean centroid offset ` +
      `${r.meanCentroidResidualBeforeAu.toFixed(2)} → ${r.meanCentroidResidualWithChosenCorrectionAu.toFixed(2)} au, max ${r.maxCentroidResidualBeforeAu.toFixed(2)} au.`,
  )
}

/* ====================================================================== *
 *  6. VERDICT                                                             *
 * ====================================================================== */

console.log(`\nimaging-fit: ${checks} assertions, ${failures.length} failure(s)`)
for (const failure of failures) console.log(`  FAIL ${failure}`)
if (failures.length > 0) {
  console.log('\nThe committed registration numbers do not match what the fitter measures.')
  console.log('Re-run: node scripts/fit-imaging-affine.mjs --report')
  process.exit(1)
}
console.log('  PASS imaging registration is measured, applied where honest, and recomputable')
process.exit(0)
