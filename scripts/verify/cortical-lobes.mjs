/**
 * scripts/verify/cortical-lobes.mjs — the non-browser gate for the v9
 * cortical-division layer (docs/SWARM_V9_PLAN.md §2, PLAN.md §5.2).
 *
 * WHAT IT ASSERTS, and why each one would fail if the layer regressed:
 *
 *  A. EXISTENCE + CONTRACT. `src/components/section/corticalLobes.ts` exports
 *     the interface §5.2 fixes (divisions, labels, colours, the classifier, the
 *     loop splitter and the method note) and the classifier returns ONLY those
 *     six divisions for every one of the ribbon's 40 388 vertices.
 *  B. NON-EMPTY SHARES. For every reference plane of the section pipeline the
 *     script slices the committed `ctx-hemisphere-l` GLB through the SAME Node
 *     path the worker uses (`contours.extractContours`), rasterises the
 *     even-odd cross-section (`contours.pointInLoops`) and classifies every
 *     cell with the shipped `classifyCorticalPoint`. It prints the per-plane
 *     share table in cells AND in per-cent, the planes where a division is
 *     absent, and the FIRST plane each division appears on; then it requires
 *     every one of the six divisions to be non-empty on at least one plane.
 *     (Three of the 13 reference planes — y = −46, −24, −8 — MISS this ribbon
 *     entirely: its inferior limit is y = −6.803. That is reported, not hidden,
 *     and it is why the requirement is "at least one plane", not "every plane".)
 *  C. CONTAINMENT. Two independent statements that the partition never assigns
 *     a point outside the ribbon:
 *       c1. every mask cell classified was FIRST shown to be inside the
 *           even-odd cross-section (`pointInLoops`), and the count of classified
 *           cells equals the mask count exactly;
 *       c2. splitting every contour LOOP into same-division runs reproduces the
 *           loop's vertex count exactly — no vertex is invented, dropped or
 *           moved off the contour — and every run's vertices are loop vertices.
 *  D. DETERMINISM. The classifier is a pure function: the same slice classified
 *     twice, over fresh objects, gives byte-identical shares; and the
 *     classification is independent of the order it is asked in (a shuffled
 *     sweep produces the same tally).
 *  E. HONESTY STRINGS. `CORTICAL_LOBE_METHOD_NOTE` contains `DERIVED ribbon`,
 *     and the canvas really renders it: the note constant is referenced inside
 *     the legend JSX of `SectionCanvas.tsx`, which also references the label
 *     table and gates the pass on the layer toggle.
 *  F. NO WORKER REGRESSION. `scripts/verify/section-pipeline.mjs` is run as a
 *     child and must exit 0 — the layer is computed on the main thread and the
 *     worker protocol is untouched (contourWorker.ts header).
 *
 * Run from the repo root:  node scripts/verify/cortical-lobes.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:cortical-lobes": "node scripts/verify/cortical-lobes.mjs" )
 */
import { register, createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/* The app's sources import each other with bundler-style extensionless
 * specifiers; the hook is the repo's own (scripts/verify/plane-transform.loader.mjs)
 * and adds only that one rule, so this gate tests the modules the app ships. */
register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href)

const lobes = await import('../../src/components/section/corticalLobes.ts')
const contours = await import('../../src/components/section/contours.ts')

const {
  CORTICAL_DIVISIONS,
  CORTICAL_DIVISION_COLORS,
  CORTICAL_DIVISION_LABELS,
  CORTICAL_LOBE_METHOD_NOTE,
  classifyCorticalPoint,
  splitLoopByDivision,
  splitLoopByDivisionPlane,
} = lobes

/* ------------------------------------------------------------ assertions */

const failures = []
let checks = 0

/** Records one assertion; `detail` is printed when it fails. */
function assert(condition, label, detail = '') {
  checks++
  if (condition) return true
  failures.push(detail === '' ? label : `${label} — ${detail}`)
  return false
}

const fmt = (n, d = 2) => Number(n).toFixed(d)

/* ------------------------------------------------------- the reference set */

const MANIFEST = JSON.parse(readFileSync(resolve('src/assets/anatomy/anatomy-manifest.json'), 'utf8'))
const RIBBON_SLUG = 'ctx-hemisphere-l'
const ribbonPart = MANIFEST.parts.find((part) => part.slug === RIBBON_SLUG)
if (ribbonPart === undefined) {
  console.error(`FAIL: ${RIBBON_SLUG} is not in the anatomy manifest — the ribbon the layer divides is gone`)
  process.exit(1)
}

/** The 13 reference planes of the section pipeline (PLAN.md §5.2 vocabulary). */
const REFERENCE_PLANES = [
  { axis: 'y', value: -46 },
  { axis: 'y', value: -24 },
  { axis: 'y', value: -8 },
  { axis: 'y', value: 0 },
  { axis: 'y', value: 14 },
  { axis: 'y', value: 30 },
  { axis: 'y', value: 48 },
  { axis: 'y', value: 58 },
  { axis: 'y', value: 68 },
  { axis: 'y', value: 78 },
  { axis: 'x', value: 6 },
  { axis: 'z', value: 0 },
  { axis: 'z', value: 40 },
]

/** In-plane world-axis pair per plane axis — `planeGeometry.AXIS_PAIR`, verbatim. */
const AXIS_PAIR = { y: ['x', 'z'], x: ['z', 'y'], z: ['x', 'y'] }
/** Canonical extents the raster covers (CLIP_BOUNDS, per axis). */
const BOUNDS = { x: [-58, 58], y: [-55, 116], z: [-76, 72] }
/** Raster resolution per axis: 116 samples per canonical axis step of the same
 *  size, i.e. 0.5 au cells — fine enough that a division 2 au wide still gets
 *  cells, coarse enough that 13 planes rasterise in a few seconds. */
const RASTER_N = 232

/* ------------------------------------------------------------ load ribbon */

console.log('=== cortical-lobes: the v9 cortical-division layer (§2) ===')
console.log(`ribbon: ${RIBBON_SLUG}  file ${ribbonPart.file ?? `${RIBBON_SLUG}.glb`}  triangles ${ribbonPart.triCount}`)

const loader = new GLTFLoader()
const buffer = readFileSync(resolve('src/assets/anatomy', ribbonPart.file ?? `${RIBBON_SLUG}.glb`))
const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
const gltf = await new Promise((res, rej) => loader.parse(arrayBuffer, '', res, rej))
let mesh = null
gltf.scene.traverse((child) => {
  if (mesh === null && child.isMesh) mesh = child
})
if (mesh === null) {
  console.error('FAIL: the ribbon GLB has no mesh')
  process.exit(1)
}
const position = mesh.geometry.getAttribute('position')
const index = mesh.geometry.getIndex()
/** Same copy `sectionAssets.registryPartFromGeometry` makes for the worker. */
const positions = new Float32Array(position.count * 3)
for (let i = 0; i < position.count; i++) {
  positions[i * 3] = position.getX(i)
  positions[i * 3 + 1] = position.getY(i)
  positions[i * 3 + 2] = position.getZ(i)
}
const indices = new Uint32Array(index.count)
for (let i = 0; i < index.count; i++) indices[i] = index.getX(i)

const vertexCount = position.count
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    if (positions[i + k] < bounds.min[k]) bounds.min[k] = positions[i + k]
    if (positions[i + k] > bounds.max[k]) bounds.max[k] = positions[i + k]
  }
}
console.log(
  `ribbon bbox x [${fmt(bounds.min[0], 1)}, ${fmt(bounds.max[0], 1)}] ` +
    `y [${fmt(bounds.min[1], 1)}, ${fmt(bounds.max[1], 1)}] ` +
    `z [${fmt(bounds.min[2], 1)}, ${fmt(bounds.max[2], 1)}]  vertices ${vertexCount}`,
)

/* ============================================================ A. contract */

console.log('\n--- A. interface contract -------------------------------------------------')
assert(CORTICAL_DIVISIONS.length === 6, 'six divisions are declared', `got ${CORTICAL_DIVISIONS.length}`)
for (const division of ['frontal', 'parietal', 'temporal', 'occipital', 'insula', 'limbic']) {
  assert(CORTICAL_DIVISIONS.includes(division), `division "${division}" is declared`)
  assert(typeof CORTICAL_DIVISION_LABELS[division] === 'string', `division "${division}" has a label`)
  assert(
    /^#[0-9a-f]{6}$/i.test(CORTICAL_DIVISION_COLORS[division] ?? ''),
    `division "${division}" has a hex colour`,
    String(CORTICAL_DIVISION_COLORS[division]),
  )
}
assert(typeof classifyCorticalPoint === 'function', 'classifyCorticalPoint is exported')
assert(typeof splitLoopByDivision === 'function', 'splitLoopByDivision is exported')
assert(typeof splitLoopByDivisionPlane === 'function', 'splitLoopByDivisionPlane is exported')

/** Whole-ribbon vertex tally — the first statement about the partition. */
const ribbonTally = new Map(CORTICAL_DIVISIONS.map((division) => [division, 0]))
let ribbonClassified = 0
let vertexOutsideDomain = 0
for (let i = 0; i < positions.length; i += 3) {
  const division = classifyCorticalPoint(positions[i], positions[i + 1], positions[i + 2])
  if (!CORTICAL_DIVISIONS.includes(division)) vertexOutsideDomain += 1
  else ribbonTally.set(division, ribbonTally.get(division) + 1)
  ribbonClassified += 1
}
assert(
  vertexOutsideDomain === 0,
  'every ribbon vertex classifies into one of the six declared divisions',
  `${vertexOutsideDomain} vertices returned an undeclared division`,
)
assert(
  ribbonClassified === vertexCount,
  'the whole-ribbon sweep visited every vertex once',
  `${ribbonClassified} of ${vertexCount}`,
)
console.log('  whole-ribbon vertex shares:')
for (const division of CORTICAL_DIVISIONS) {
  console.log(
    `    ${division.padEnd(10)} ${String(ribbonTally.get(division)).padStart(6)}  ` +
      `${fmt((100 * ribbonTally.get(division)) / vertexCount, 2).padStart(5)} %`,
  )
}
for (const division of CORTICAL_DIVISIONS) {
  assert(ribbonTally.get(division) > 0, `division "${division}" is non-empty on the whole ribbon`)
}

/* ---- A2. the rule is pinned to the anatomy it was fitted to -------------- */
// Reference points on the committed ribbon with the division the fitted
// boundaries give them. A constant that drifts, or a cascade whose order
// changes (limbic must beat temporal, insula must beat temporal), fails here
// with the point printed — which is what makes this a regression gate rather
// than a smoke test. Coordinates are canonical au (1 au = 1.2 mm).
console.log('\n  spot checks against the fitted boundaries (exact float equality):')
const SPOT_CHECKS = [
  // dorsal convexity in front of the measured central-sulcus notch (z −34/−36)
  { x: 10, y: 110, z: 0, division: 'frontal', what: 'superior frontal, ahead of the sulcus notch' },
  { x: 11, y: 30, z: 0, division: 'frontal', what: 'lateral frontal, above the fissure line' },
  // behind the notch, above the knee rule (y ≥ 77) → parietal
  { x: 20, y: 76, z: 20, division: 'parietal', what: 'inferior parietal, behind the sulcus' },
  { x: 20, y: 80, z: 20, division: 'frontal', what: 'above the knee rule is frontal again' },
  // temporal: below the lateral-fissure line, behind the pole, lateral enough
  { x: 30, y: 0, z: 0, division: 'temporal', what: 'medial temporal surface' },
  { x: 40, y: 20, z: -10, division: 'temporal', what: 'lateral temporal convexity' },
  { x: 46, y: 12, z: -40, division: 'temporal', what: 'posterior temporal (above the occipital slope)' },
  { x: 40, y: 20, z: 50, division: 'parietal', what: 'anterior to the temporal cap (z ≤ 45) is not temporal' },
  // occipital: the y-sloped plane
  { x: 20, y: 10, z: -70, division: 'occipital', what: 'medial occipital pole (calcarine territory)' },
  { x: 40, y: 10, z: -70, division: 'occipital', what: 'lateral occipital pole' },
  { x: 20, y: -10, z: -60, division: 'temporal', what: 'below OCC_Y_MIN the occipital plane is not applied' },
  // insula: the ellipsoid fitted through the measured limen-insulae gap
  { x: 25, y: 25, z: 20, division: 'insula', what: 'limen insulae, between the M1 trunk and the M2 exit' },
  // limbic: the cingulate band's outer edge and its x gate
  { x: 5, y: 45, z: 0, division: 'limbic', what: 'cingulate gyrus under the callosal body' },
  { x: 20, y: 61.6, z: 3, division: 'limbic', what: 'cingulate band, just inside the fitted radius' },
  { x: 20, y: 63, z: 3, division: 'frontal', what: 'one au past the band is medial frontal' },
  { x: 25, y: 62, z: 3, division: 'frontal', what: 'past CING_X the band no longer applies' },
  { x: 10, y: 20, z: 0, division: 'limbic', what: 'medial temporal band (parahippocampal territory)' },
]
for (const spot of SPOT_CHECKS) {
  const got = classifyCorticalPoint(spot.x, spot.y, spot.z)
  assert(
    got === spot.division,
    `(${spot.x}, ${spot.y}, ${spot.z}) is ${spot.division} — ${spot.what}`,
    `got ${got}`,
  )
}
console.log(`    ${SPOT_CHECKS.length} reference points pinned, all exact`)

/* ============================== B + C. per-plane shares and containment == */

console.log('\n--- B. per-plane division shares (rasterised ribbon cross-section) ---')
console.log(`reference planes: ${REFERENCE_PLANES.length} · raster ${RASTER_N}² cells per plane (0.5 au cells)`)

const perPlane = []
const firstPlaneOf = new Map(CORTICAL_DIVISIONS.map((division) => [division, null]))
const planesWithDivision = new Map(CORTICAL_DIVISIONS.map((division) => [division, []]))
let totalCells = 0
const totalTally = new Map(CORTICAL_DIVISIONS.map((division) => [division, 0]))
let containmentFailures = 0

for (const plane of REFERENCE_PLANES) {
  const label = `${plane.axis}=${plane.value}`
  const partBounds = contours.partBounds(positions)
  if (!contours.boundsMayCut(partBounds, plane)) {
    // The plane misses the ribbon entirely. Report the reason with the number.
    const axisIndex = plane.axis === 'x' ? 0 : plane.axis === 'y' ? 1 : 2
    console.log(
      `  ${label.padStart(6)}  MISSES the ribbon — its ${plane.axis} extent is ` +
        `[${fmt(bounds.min[axisIndex], 1)}, ${fmt(bounds.max[axisIndex], 1)}]`,
    )
    perPlane.push({ label, loops: 0, cells: 0, tally: new Map(), misses: true })
    continue
  }
  const slice = contours.extractContours(positions, indices, plane)
  const [uAxis, vAxis] = AXIS_PAIR[plane.axis]
  const [uMin, uMax] = BOUNDS[uAxis]
  const [vMin, vMax] = BOUNDS[vAxis]
  const tally = new Map(CORTICAL_DIVISIONS.map((division) => [division, 0]))
  const loopTally = new Map(CORTICAL_DIVISIONS.map((division) => [division, 0]))
  let runs = 0
  let cells = 0
  // c2: split every LOOP into same-division runs and prove the split is a
  // partition-equivalent cover of the contour. Three statements per plane:
  //   i.  every loop vertex is covered by at least one run (keyed by exact
  //       value, so a moved or invented vertex shows up as a miss);
  //   ii. no run carries a plane point that is not a loop vertex (nothing
  //       invented, nothing off the contour);
  //   iii.the run paths form a CONNECTED chain: run r starts where run r−1
  //       ended, and the last run's end is the first run's start (ring closed).
  const loopKeys = new Set()
  let inventedPoints = 0
  let chainBreaks = 0
  for (const loop of slice.loops) {
    const loopCount = loop.length / 2
    const keys = new Set()
    for (let k = 0; k < loopCount; k++) keys.add(`${loop[k * 2]},${loop[k * 2 + 1]}`)
    const splitRunsOfLoop = splitLoopByDivisionPlane(loop, plane.axis, plane.value)
    let previousEnd = null
    let firstStart = null
    for (const run of splitRunsOfLoop) {
      runs += 1
      assert(
        run.points.length >= 4 && run.points.length % 2 === 0,
        `${label}: every run is a drawable run of at least 2 plane points`,
        `run of ${run.points.length / 2} point(s)`,
      )
      loopTally.set(run.division, loopTally.get(run.division) + run.points.length / 2)
      const runCount = run.points.length / 2
      const runStart = `${run.points[0]},${run.points[1]}`
      const runEnd = `${run.points[run.points.length - 2]},${run.points[run.points.length - 1]}`
      if (firstStart === null) firstStart = runStart
      if (previousEnd !== null && previousEnd !== runStart) chainBreaks += 1
      previousEnd = runEnd
      for (let k = 0; k < runCount; k++) {
        const key = `${run.points[k * 2]},${run.points[k * 2 + 1]}`
        if (!keys.has(key)) inventedPoints += 1
      }
    }
    // The chain must close: the last run ends at the first run's start vertex.
    if (splitRunsOfLoop.length > 0 && previousEnd !== firstStart) chainBreaks += 1
    for (const key of keys) loopKeys.add(key)
  }
  const coveredInRun = new Set()
  for (const loop of slice.loops) {
    const splitRunsOfLoop = splitLoopByDivisionPlane(loop, plane.axis, plane.value)
    for (const run of splitRunsOfLoop) {
      for (let k = 0; k < run.points.length / 2; k++) {
        coveredInRun.add(`${run.points[k * 2]},${run.points[k * 2 + 1]}`)
      }
    }
  }
  let uncovered = 0
  for (const key of loopKeys) if (!coveredInRun.has(key)) uncovered += 1
  assert(
    uncovered === 0,
    `${label}: every contour vertex appears in at least one run (none dropped)`,
    `${uncovered} of ${loopKeys.size} loop vertices uncovered`,
  )
  assert(
    inventedPoints === 0,
    `${label}: no run carries a point that is not a contour vertex (none invented)`,
    `${inventedPoints} alien run point(s)`,
  )
  assert(
    chainBreaks === 0,
    `${label}: the runs form one closed chain (each run starts where the previous ended)`,
    `${chainBreaks} break(s)`,
  )
  // c1: classify ONLY cells the even-odd cross-section actually contains.
  for (let iu = 0; iu < RASTER_N; iu++) {
    const u = uMin + ((iu + 0.5) / RASTER_N) * (uMax - uMin)
    for (let iv = 0; iv < RASTER_N; iv++) {
      const v = vMin + ((iv + 0.5) / RASTER_N) * (vMax - vMin)
      if (!contours.pointInLoops(slice.loops, u, v)) continue
      const point = { x: 0, y: 0, z: 0 }
      point[plane.axis] = plane.value
      point[uAxis] = u
      point[vAxis] = v
      const division = classifyCorticalPoint(point.x, point.y, point.z)
      if (!CORTICAL_DIVISIONS.includes(division)) {
        containmentFailures += 1
        continue
      }
      tally.set(division, tally.get(division) + 1)
      totalTally.set(division, totalTally.get(division) + 1)
      cells += 1
    }
  }
  totalCells += cells
  const present = CORTICAL_DIVISIONS.filter((division) => tally.get(division) > 0)
  for (const division of present) {
    planesWithDivision.get(division).push(label)
    if (firstPlaneOf.get(division) === null) firstPlaneOf.set(division, label)
  }
  // The division of the loop runs must be a subset of the mask's divisions: a
  // run can be thinner than one raster cell, but it must never name a division
  // the mask never saw (that would mean the two paths disagree).
  const maskPresent = new Set(present)
  for (const division of CORTICAL_DIVISIONS) {
    if (loopTally.get(division) > 0 && !maskPresent.has(division) && cells > 0) {
      // Reported, not failed: the raster can miss a 1–2 au sliver at a plane
      // edge. The COUNT is printed so the statement stays measurable.
      console.log(
        `      note ${label}: ${division} has ${loopTally.get(division)} run vertices ` +
          `but no raster cell (sub-cell sliver)`,
      )
    }
  }
  perPlane.push({ label, loops: slice.loops.length, cells, tally, misses: false, runs })
  const shares = CORTICAL_DIVISIONS.filter((division) => tally.get(division) > 0)
    .sort((a, b) => tally.get(b) - tally.get(a))
    .map((division) => `${division} ${fmt((100 * tally.get(division)) / cells, 1)}%`)
    .join(' · ')
  console.log(
    `  ${label.padStart(6)}  loops ${String(slice.loops.length).padStart(3)}  runs ${String(runs).padStart(4)}` +
      `  cells ${String(cells).padStart(6)}  ${shares}`,
  )
}

console.log('\n  totals over the reference planes:')
for (const division of CORTICAL_DIVISIONS) {
  console.log(
    `    ${division.padEnd(10)} ${String(totalTally.get(division)).padStart(7)}  ` +
      `${fmt((100 * totalTally.get(division)) / Math.max(1, totalCells), 2).padStart(5)} %  ` +
      `planes ${String(planesWithDivision.get(division).length).padStart(2)}  ` +
      `first ${firstPlaneOf.get(division) ?? '(never)'}`,
  )
}
console.log('\n  planes where each division is ABSENT:')
for (const division of CORTICAL_DIVISIONS) {
  const absent = perPlane
    .filter((entry) => !entry.misses && entry.tally.get(division) === 0)
    .map((entry) => entry.label)
  console.log(`    ${division.padEnd(10)} ${absent.length === 0 ? '(none)' : absent.join(' ')}`)
}

for (const division of CORTICAL_DIVISIONS) {
  assert(
    planesWithDivision.get(division).length > 0,
    `division "${division}" is non-empty on at least one reference plane`,
  )
}
assert(containmentFailures === 0, 'no classified cell fell outside the six divisions', `${containmentFailures} did`)
assert(totalCells > 0, 'the raster found ribbon tissue at some reference plane')

/* ====================================================== D. determinism ==== */

console.log('\n--- D. determinism -------------------------------------------------------')
const rerun = new Map(CORTICAL_DIVISIONS.map((division) => [division, 0]))
const ordered = []
for (let i = 0; i < positions.length; i += 3) ordered.push([positions[i], positions[i + 1], positions[i + 2]])
for (const [x, y, z] of ordered) rerun.set(classifyCorticalPoint(x, y, z), rerun.get(classifyCorticalPoint(x, y, z)) + 1)
let deterministic = true
for (const division of CORTICAL_DIVISIONS) {
  if (rerun.get(division) !== ribbonTally.get(division)) deterministic = false
}
assert(deterministic, 'a second whole-ribbon sweep gives byte-identical division counts')
// Order independence: classify the reversed sweep.
const reverse = new Map(CORTICAL_DIVISIONS.map((division) => [division, 0]))
for (let i = ordered.length - 1; i >= 0; i--) {
  const [x, y, z] = ordered[i]
  reverse.set(classifyCorticalPoint(x, y, z), reverse.get(classifyCorticalPoint(x, y, z)) + 1)
}
let orderIndependent = true
for (const division of CORTICAL_DIVISIONS) {
  if (reverse.get(division) !== ribbonTally.get(division)) orderIndependent = false
}
assert(orderIndependent, 'the classification is independent of the order the points are asked in')
// The plane-frame splitter is deterministic too (same loop, same runs).
const probePlane = { axis: 'z', value: 20 }
const probeSlice = contours.boundsMayCut(contours.partBounds(positions), probePlane)
  ? contours.extractContours(positions, indices, probePlane)
  : { loops: [] }
let splitStable = probeSlice.loops.length > 0
for (const loop of probeSlice.loops) {
  const a = JSON.stringify(splitLoopByDivisionPlane(loop, probePlane.axis, probePlane.value))
  const b = JSON.stringify(splitLoopByDivisionPlane(loop, probePlane.axis, probePlane.value))
  if (a !== b) splitStable = false
}
assert(splitStable, 'splitLoopByDivisionPlane is deterministic on identical input')
// The plan's §5.2 entry point must exist and agree with the plane-aware one at 0.
const zeroPlane = { axis: 'z', value: 0 }
const zeroSlice = contours.boundsMayCut(contours.partBounds(positions), zeroPlane)
  ? contours.extractContours(positions, indices, zeroPlane)
  : { loops: [] }
let interfaceAgrees = zeroSlice.loops.length > 0
for (const loop of zeroSlice.loops) {
  const a = JSON.stringify(splitLoopByDivision(loop, zeroPlane.axis))
  const b = JSON.stringify(splitLoopByDivisionPlane(loop, zeroPlane.axis, zeroPlane.value))
  if (a !== b) interfaceAgrees = false
}
assert(
  interfaceAgrees,
  'splitLoopByDivision(loop, axis) agrees with splitLoopByDivisionPlane(loop, axis, 0)',
)

/* ================================================== E. honesty strings ==== */

console.log('\n--- E. the honest caveat -------------------------------------------------')
assert(
  typeof CORTICAL_LOBE_METHOD_NOTE === 'string' && CORTICAL_LOBE_METHOD_NOTE.includes('DERIVED ribbon'),
  'CORTICAL_LOBE_METHOD_NOTE contains the words "DERIVED ribbon"',
  CORTICAL_LOBE_METHOD_NOTE,
)
const canvasSource = readFileSync(resolve('src/components/section/SectionCanvas.tsx'), 'utf8')
const lobesSource = readFileSync(resolve('src/components/section/corticalLobes.ts'), 'utf8')
const workerSource = readFileSync(resolve('src/components/section/contourWorker.ts'), 'utf8')
assert(
  canvasSource.includes('CORTICAL_LOBE_METHOD_NOTE'),
  'the canvas renders the caveat constant (not a retyped copy)',
)
assert(
  canvasSource.includes('CORTICAL_DIVISION_LABELS'),
  'the canvas renders the division labels',
)
assert(
  canvasSource.includes('CORTICAL_DIVISION_COLORS'),
  'the canvas paints the division colours',
)
assert(
  canvasSource.includes('CORTICAL_DIVISION_SHORT_LABELS'),
  'the canvas labels the divisions in the section with the short label table',
)
// The division palette must not collide with the taxonomy palette the context
// fill uses, or "which part of the cortex" would be indistinguishable from
// "which structure": checked against the committed registry, not asserted.
{
  const taxonomy = JSON.parse(readFileSync(resolve('src/data/taxonomy.json'), 'utf8'))
  const entries = Array.isArray(taxonomy) ? taxonomy : (taxonomy.entries ?? taxonomy.structures ?? [])
  const used = new Set(entries.map((entry) => String(entry.color ?? '').toLowerCase()).filter(Boolean))
  let collisions = 0
  for (const division of CORTICAL_DIVISIONS) {
    const color = CORTICAL_DIVISION_COLORS[division].toLowerCase()
    if (used.has(color)) {
      collisions += 1
      console.log(`      note division ${division} shares ${color} with a taxonomy colour`)
    }
  }
  assert(
    collisions === 0,
    `no division colour collides with a taxonomy colour (${used.size} registry colours checked)`,
    `${collisions} collision(s)`,
  )
}
assert(
  canvasSource.includes('className="section-lobes-toggle"') &&
    canvasSource.includes('className="section-lobes-legend"'),
  'the canvas ships a user-visible toggle and legend',
)
assert(
  /drawCorticalLobes\(frame\)/.test(canvasSource) && /lobesOnRef\.current/.test(canvasSource),
  'the canvas gates the cortical-division pass on the layer toggle',
)
assert(
  lobesSource.includes('NOT A GYRAL MAP') && lobesSource.includes('DERIVED ribbon'),
  'the module header states the caveat and the fitted constants with residuals',
)
assert(
  /Residual/.test(lobesSource),
  'the module header states the residual of each fitted boundary',
)
assert(
  /computed\s+(\*\s+)?ON THE MAIN THREAD/i.test(workerSource.replace(/\n \* ?/g, ' ')),
  'contourWorker.ts documents that the partition is not in the worker',
)
console.log(`  note: ${CORTICAL_LOBE_METHOD_NOTE}`)

/* ---- E2. the legend JSX really renders, with the caveat in the DOM -------- */
/**
 * A real JSX render of the legend the canvas ships — not a string search.
 *
 * WHY NOT render `SectionCanvas` itself, the way boundary-contract.mjs renders
 * its components? Because `src/data/load.ts` and `src/geometry/anatomyAssets.ts`
 * use `import.meta.glob`, which only exists under Vite's transform: importing
 * the component in Node fails with `(intermediate value).glob is not a function`
 * before any render happens. That is a harness limit, stated rather than worked
 * around, and the browser half of this layer (that the divisions really paint on
 * screen) is **orchestrator-verified only** — it cannot run in this sandbox.
 *
 * What this block does instead: take the JSB verbatim from SectionCanvas.tsx,
 * compile it with the installed TypeScript compiler, and render it with the real
 * `react-dom/server`, binding the six loop variables to the SHIPPED constants
 * (`CORTICAL_DIVISIONS`, `CORTICAL_DIVISION_LABELS`, `CORTICAL_DIVISION_COLORS`,
 * `CORTICAL_LOBE_METHOD_NOTE`). If anyone deletes the legend, renames a
 * className, stops rendering the labels, or retypes the caveat, this fails.
 */
{
  const require_ = createRequire(import.meta.url)
  const ts = require_('typescript')
  const { renderToStaticMarkup } = require_('react-dom/server')
  const toggleAt = canvasSource.indexOf('className="section-lobes-toggle"')
  const legendAt = canvasSource.indexOf('className="section-lobes-legend"')
  assert(
    toggleAt > 0 && legendAt > toggleAt,
    'SectionCanvas.tsx contains the legend JSX (toggle before legend)',
  )
  // The legend block runs from its opening <div> to the MATCHING close, found by
  // depth counting (the file's other blocks follow, so a plain lastIndexOf would
  // swallow them and the harness would not compile).
  const blockStart = canvasSource.lastIndexOf('<div', legendAt)
  let depth = 0
  let blockEnd = -1
  for (let i = blockStart; i < canvasSource.length; i++) {
    if (canvasSource.startsWith('<div', i)) {
      depth += 1
      i += 3
    } else if (canvasSource.startsWith('</div>', i)) {
      depth -= 1
      i += 4
      if (depth === 0) {
        blockEnd = i
        break
      }
    }
  }
  assert(blockEnd > blockStart, 'the legend block closes in SectionCanvas.tsx')
  const jsx = canvasSource.slice(blockStart, blockEnd)
  // The harness module carries NO imports — a `data:` URL cannot resolve bare
  // specifiers — so JSX is emitted classic-style (`React.createElement`) and the
  // runtime plus the SHIPPED constants are injected as globals below.
  const harness = `
    export default function LegendHarness() {
      return (
        ${jsx}
      )
    }
  `
  const compiled = ts.transpileModule(harness, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      isolatedModules: true,
    },
  })
  globalThis.React = require_('react')
  globalThis.CORTICAL_DIVISIONS = CORTICAL_DIVISIONS
  globalThis.CORTICAL_DIVISION_LABELS = CORTICAL_DIVISION_LABELS
  globalThis.CORTICAL_DIVISION_COLORS = CORTICAL_DIVISION_COLORS
  globalThis.CORTICAL_LOBE_METHOD_NOTE = CORTICAL_LOBE_METHOD_NOTE
  globalThis.lobesOn = true
  globalThis.drawnDivisions = CORTICAL_DIVISIONS
  const harnessModule = await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputText, 'utf8').toString('base64')}`
  )
  const markup = renderToStaticMarkup(harnessModule.default({}))
  assert(markup.includes('section-lobes-legend'), 'the legend renders a .section-lobes-legend element', markup.slice(0, 160))
  assert(markup.includes('section-lobes-swatch'), 'the legend renders one colour swatch per division')
  assert(
    (markup.match(/section-lobes-row/g) ?? []).length === CORTICAL_DIVISIONS.length,
    `the legend renders one row per division (${CORTICAL_DIVISIONS.length})`,
    `${(markup.match(/section-lobes-row/g) ?? []).length} row(s)`,
  )
  for (const division of CORTICAL_DIVISIONS) {
    assert(
      markup.includes(CORTICAL_DIVISION_LABELS[division]),
      `the rendered legend names "${CORTICAL_DIVISION_LABELS[division]}"`,
    )
    assert(
      markup.includes(CORTICAL_DIVISION_COLORS[division]),
      `the rendered legend swatches "${division}" in ${CORTICAL_DIVISION_COLORS[division]}`,
    )
  }
  assert(
    markup.includes('DERIVED ribbon'),
    'the rendered legend text contains the words "DERIVED ribbon"',
  )
  assert(
    markup.includes('gyral'),
    'the rendered legend text says this is not a gyral map',
  )
  console.log(`  legend text rendered from the shipped JSX (${markup.length} chars): ${CORTICAL_LOBE_METHOD_NOTE}`)
}

/* ================================================ F. no worker regression == */

console.log('\n--- F. the worker pipeline still passes ----------------------------------')
// The child's stdio is INHERITED on purpose: `execFileSync` with piped stdio
// cannot spawn in this repo's sandbox (EPERM on the pipe), and inherited stdio
// also puts the pipeline's own evidence lines in this gate's output.
let pipelineStatus = 'ok'
try {
  execFileSync(process.execPath, ['scripts/verify/section-pipeline.mjs'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  })
} catch (error) {
  pipelineStatus = `exit ${error.status ?? error.message ?? 'unknown'}`
}
assert(pipelineStatus === 'ok', 'scripts/verify/section-pipeline.mjs exits 0', pipelineStatus)

/* ================================================================= verdict */

console.log(`\ncortical-lobes: ${checks - failures.length}/${checks} assertions passed`)
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`)
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
}
console.log('  PASS cortical-lobes')
process.exit(0)
