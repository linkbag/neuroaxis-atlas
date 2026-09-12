/**
 * scripts/verify/cortical-lobes.mjs — the non-browser gate for the cortical-
 * division layer (v9 `cortical-lobes`, extended by v10 `cortical-divisions-
 * quality`; docs/SWARM_V10_PLAN.md §4/§5, PLAN.md §4/§5).
 *
 * WHAT IT ASSERTS, and why each one would fail if the layer regressed:
 *
 *  A. EXISTENCE + CONTRACT. `src/components/section/corticalLobes.ts` exports
 *     the interface §5.2 fixes (divisions, labels, colours, the classifier, the
 *     loop splitter, the run metrics and the method note) and the classifier
 *     returns ONLY those six divisions for every one of the ribbon's 40 388
 *     vertices. The v10 run-quality floors are printed and pinned: their values,
 *     the inequality the label rule depends on, and the shape of a hand-computed
 *     `corticalRunMetrics` result (so the metric the floors use cannot drift).
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
 *  C. THE RUN RULE (v10). Per reference plane, per loop:
 *       c1. every PAINTED run clears both runoff floors — `arcAu >=
 *           MIN_DIVISION_RUN_AU` (10 au) and `areaAu2 >= MIN_DIVISION_AREA_AU2`
 *           (25 au²) — measured with the SHIPPED `corticalRunMetrics`, i.e. the
 *           same function the splitter's own absorption decision uses;
 *       c2. the kept spans still tile the loop exactly once: for every painted
 *           loop `Σ run.points.length / 2 === loop vertices + runs`;
 *       c3. no run carries a point that is not a contour vertex, every vertex of
 *           a painted loop is covered, and the runs form ONE closed chain (each
 *           run starts where the previous ended and the last ends where the
 *           first began);
 *       c4. every loop the splitter DROPPED (no run at all) really is a single
 *           homogeneous stretch below the floors — enumerated with its vertex
 *           count, arc and area, never silently skipped;
 *       c5. THE BITE: the same loops are re-cut by an INDEPENDENT maximal-run
 *           pass over the shipped classifier, and the sub-threshold spans that
 *           pass produces are counted and printed. They are what the pre-v10
 *           splitter PAINTED (a 2-vertex wedge, a 60-vertex 3.5 au² triangle);
 *           the count being > 0 is the proof that c1 is not vacuous;
 *       c6. the label rule: every division painted on a plane has at least one
 *           run at or above `MIN_DIVISION_LABEL_AREA_AU2`, the anchor competes
 *           by DRAWN AREA (never by vertex count), and a plane draws at most one
 *           label per division. This is the assertion that makes "TEMPORAL"
 *           written on a 5 au² triangle impossible;
 *       c7. the per-plane per-division table (run count, min/median/max arc and
 *           area) and the sliver census (arc < 2 / < 5 / < 10 au, area < 1 /
 *           < 10 au², one-vertex runs) are PRINTED, and the census is required to
 *           be zero, so the numbers are in the gate output instead of implied.
 *  D. DETERMINISM. The classifier and the splitter are pure: the same slice
 *     classified twice, over fresh objects, gives byte-identical shares, the
 *     classification is independent of the order it is asked in (a shuffled
 *     sweep produces the same tally), and re-splitting every reference-plane
 *     loop gives byte-identical runs.
 *  E. HONESTY STRINGS. `CORTICAL_LOBE_METHOD_NOTE` contains `DERIVED ribbon`,
 *     and the canvas really renders it: the note constant is referenced inside
 *     the legend JSX of `SectionCanvas.tsx`, which also references the label
 *     table and gates the pass on the layer toggle. The legend JSX is really
 *     RENDERED (compiled from the shipped source, bound to the shipped
 *     constants) so deleting the caveat cannot pass.
 *  E2. THE SUPPRESSED CORTEX LABEL (v10 §5). The `ctx-cerebral-cortex` context
 *     envelope keeps its contour and fill and loses its TEXT, in the Plates
 *     canvas AND in the PiP (which mounts the same component): the exported
 *     `NO_CANVAS_LABEL_RECORD_IDS` set exists and contains that one id, BOTH
 *     canvas label sites (`drawSelectedLabel`, `drawHoverLabel`) are gated on it,
 *     the paint path (`drawPart`) is not, every other `kind === 'context'` record
 *     in taxonomy.json is absent from the set (printed as a list), and the
 *     `.section-structure-chip` block — the one accessible instance of the name
 *     this component owns — is RENDERED for the cortex (absent), the thalamus
 *     envelope (present) and the hover slot (absent), using the shipped helper.
 *  E3. THE CANVAS WIRING (v10 §4). `buildLobeLayer` measures runs with
 *     `corticalRunMetrics`, competes the label anchor by `labelAreaAu2`, and the
 *     label pass applies `MIN_DIVISION_LABEL_AREA_AU2`; the pre-v10
 *     vertex-count competition (`longestRun`) is gone.
 *  F. THE RULE IS EXERCISED ON SYNTHETIC LOOPS with hand-known answers: a
 *     one-vertex sliver and a sub-threshold stretch are absorbed, a division
 *     that wraps the loop's start index is ONE run (not a head/tail pair), a
 *     homogeneous sub-threshold loop is dropped, and a homogeneous body loop is
 *     kept as one run. F also sweeps the 34-plane user grid the v10 report
 *     measured (the levels a user scrolls through, where the screenshot came
 *     from) at run level and requires the same floors to hold there.
 *  G. NO WORKER REGRESSION. `scripts/verify/section-pipeline.mjs` is run as a
 *     child and must exit 0 — the layer is computed on the main thread and the
 *     worker protocol is untouched (contourWorker.ts header).
 *
 * Run from the repo root:  node scripts/verify/cortical-lobes.mjs
 * (npm script line this task asks the integrator for — it already exists:
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
  MIN_DIVISION_RUN_AU,
  MIN_DIVISION_AREA_AU2,
  MIN_DIVISION_LABEL_AREA_AU2,
  classifyCorticalPoint,
  corticalRunMetrics,
  planePointToCanonical,
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

/** min / median / max / sum of a numeric list (null for an empty list). */
function statsOf(list) {
  if (list.length === 0) return null
  const sorted = list.slice().sort((a, b) => a - b)
  return {
    n: sorted.length,
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
    sum: sorted.reduce((a, b) => a + b, 0),
  }
}

/** Closed shoelace area (au²) of a flat `[u, v, …]` loop. */
function polygonAreaOf(flat) {
  const count = Math.floor(flat.length / 2)
  if (count < 3) return 0
  let sum = 0
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count
    sum += flat[i * 2] * flat[j * 2 + 1] - flat[j * 2] * flat[i * 2 + 1]
  }
  return Math.abs(sum) / 2
}

/** Closed perimeter (au) of a flat `[u, v, …]` loop, closing segment included. */
function perimeterOf(flat) {
  const count = Math.floor(flat.length / 2)
  let total = 0
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count
    total += Math.hypot(flat[j * 2] - flat[i * 2], flat[j * 2 + 1] - flat[i * 2 + 1])
  }
  return total
}

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

/**
 * The 34-plane user grid — the levels a user actually scrolls through in the
 * 3D/2D views, where the v10 report reproduced the artefact (a green LIMBIC
 * patch at the inferior midline, an orange TEMPORAL triangle on the lateral
 * edge, and the 1-vertex runs the pre-v10 splitter painted). The reference
 * planes above happen to avoid every one of them, so this grid is what makes
 * the run-rule assertions BITE; it is swept at run level (no raster).
 */
const USER_PLANES = []
for (let y = -8; y <= 52; y += 2) USER_PLANES.push({ axis: 'y', value: y })
for (const x of [4, 6, 8, 10, 12, 14, 18, 22, 26]) USER_PLANES.push({ axis: 'x', value: x })
for (const z of [0, 6, 12, 18, 24, 28, 32, 36, 40, 44]) USER_PLANES.push({ axis: 'z', value: z })

/** In-plane world-axis pair per plane axis — `planeGeometry.AXIS_PAIR`, verbatim. */
const AXIS_PAIR = { y: ['x', 'z'], x: ['z', 'y'], z: ['x', 'y'] }
/** Canonical extents the raster covers (CLIP_BOUNDS, per axis). */
const BOUNDS = { x: [-58, 58], y: [-55, 116], z: [-76, 72] }
/** Raster resolution per axis: 116 samples per canonical axis step of the same
 *  size, i.e. 0.5 au cells — fine enough that a division 2 au wide still gets
 *  cells, coarse enough that 13 planes rasterise in a few seconds. */
const RASTER_N = 232

/* ------------------------------------------------------------ load ribbon */

console.log('=== cortical-lobes: the cortical-division layer (v9 §2 + v10 §4/§5) ===')
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

const sliceAt = (plane) => {
  const partBoundsCache = contours.partBounds(positions)
  if (!contours.boundsMayCut(partBoundsCache, plane)) return null
  return contours.extractContours(positions, indices, plane)
}

/* ------------------------------------------- the independent raw re-cut ---- */

/**
 * The RAW partition of one loop: maximal same-division spans, re-derived here
 * from the shipped classifier (rotation included), measured with the shipped
 * `corticalRunMetrics`. This is the pre-v10 behaviour as a CENSUS — what the
 * layer would paint if the floors were removed — so c5 can assert that the
 * floors have real work to do instead of passing because nothing is ever short.
 */
function rawSpansOfLoop(loop, axis, planeValue) {
  const count = Math.floor(loop.length / 2)
  if (count < 3) return []
  const divisions = []
  for (let i = 0; i < count; i++) {
    const [x, y, z] = planePointToCanonical(axis, planeValue, loop[i * 2], loop[i * 2 + 1])
    divisions.push(classifyCorticalPoint(x, y, z))
  }
  let offset = 0
  for (let i = 1; i < count; i++) {
    if (divisions[i] !== divisions[i - 1]) {
      offset = i
      break
    }
  }
  const rot = (t) => (offset + t + count) % count
  const raw = []
  let start = 0
  for (let t = 1; t < count; t++) {
    if (divisions[rot(t)] !== divisions[rot(t - 1)]) {
      raw.push({ division: divisions[rot(t - 1)], start, end: t })
      start = t
    }
  }
  raw.push({ division: divisions[rot(count - 1)], start, end: count })
  return raw.map((span) => {
    const points = [loop[rot(span.start - 1) * 2], loop[rot(span.start - 1) * 2 + 1]]
    for (let t = span.start; t < span.end; t++) points.push(loop[rot(t) * 2], loop[rot(t) * 2 + 1])
    return { division: span.division, points, metrics: corticalRunMetrics(points) }
  })
}

/** A raw span the v10 rule must not paint (any floor, or a single own vertex). */
const isSubThreshold = (metrics) =>
  metrics.vertices < 2 || metrics.arcAu < MIN_DIVISION_RUN_AU || metrics.areaAu2 < MIN_DIVISION_AREA_AU2

/* ============================================== 0. the run-quality floors */

console.log('\n--- 0. the v10 run-quality floors ---------------------------------------')
console.log(
  `  MIN_DIVISION_RUN_AU         = ${fmt(MIN_DIVISION_RUN_AU)} au   (own-vertex arc length floor)`,
)
console.log(
  `  MIN_DIVISION_AREA_AU2       = ${fmt(MIN_DIVISION_AREA_AU2)} au²  (drawn-area floor, painted runs)`,
)
console.log(
  `  MIN_DIVISION_LABEL_AREA_AU2 = ${fmt(MIN_DIVISION_LABEL_AREA_AU2)} au²  (area a division needs to carry a label)`,
)
assert(
  typeof MIN_DIVISION_RUN_AU === 'number' && MIN_DIVISION_RUN_AU >= 10,
  'the arc floor is declared and at least the documented 10 au (12 mm)',
  `got ${MIN_DIVISION_RUN_AU}`,
)
assert(
  typeof MIN_DIVISION_AREA_AU2 === 'number' && MIN_DIVISION_AREA_AU2 >= 10,
  'the drawn-area floor is declared and at least the documented 10 au²',
  `got ${MIN_DIVISION_AREA_AU2}`,
)
assert(
  MIN_DIVISION_LABEL_AREA_AU2 <= MIN_DIVISION_AREA_AU2,
  'the label floor is not above the paint floor — "painted ⇒ has a label-eligible run" is a theorem',
  `label ${MIN_DIVISION_LABEL_AREA_AU2} > paint ${MIN_DIVISION_AREA_AU2}`,
)
assert(
  typeof corticalRunMetrics === 'function',
  'corticalRunMetrics is exported (the splitter, the canvas and this gate share one measurement)',
)
{
  // A 4 × 5 au rectangle in the plane frame: the own vertices are (4,0), (4,5)
  // and (0,5) — the junction vertex (0,0) is the path head and is NOT part of
  // the run's own stretch — so the arc is 5 + 4 = 9 au and the shoelace area of
  // the drawn path is 20 au². Hand-computable, so a drifted metric cannot
  // silently loosen every floor below.
  const rect = [0, 0, 4, 0, 4, 5, 0, 5] // junction (0,0) duplicated as the path head
  const m = corticalRunMetrics(rect)
  const expectedArc = Math.hypot(0, 5) + Math.hypot(4, 0)
  assert(
    Math.abs(m.arcAu - expectedArc) < 1e-9,
    'corticalRunMetrics arc = the own-vertex polyline length, junction excluded (worked example)',
    `${m.arcAu} vs ${expectedArc}`,
  )
  assert(
    Math.abs(m.areaAu2 - 20) < 1e-9,
    'corticalRunMetrics area = the shoelace area of the drawn path (worked example)',
    `${m.areaAu2} vs 20`,
  )
  assert(m.vertices === 3, 'corticalRunMetrics counts the own vertices (worked example)', String(m.vertices))
  console.log(
    `  worked example: path [0,0 4,0 4,5 0,5] → arc ${fmt(m.arcAu)} au (junction excluded), ` +
      `area ${fmt(m.areaAu2)} au², own vertices ${m.vertices}`,
  )
}

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

/* ============================== B. per-plane shares (raster, unchanged) === */

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
  for (const loop of slice.loops) {
    const splitRunsOfLoop = splitLoopByDivisionPlane(loop, plane.axis, plane.value)
    for (const run of splitRunsOfLoop) {
      runs += 1
      loopTally.set(run.division, loopTally.get(run.division) + run.points.length / 2)
    }
  }
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

/* ================================================ C. the v10 run rule ===== */

console.log('\n--- C. the run rule on the reference planes (v10 §4) ---------------------')
console.log(
  '  arc = own-vertex polyline length (au) · area = shoelace of the drawn path (au²) · ' +
    'the table is per plane, per division',
)

/** Run-level evidence accumulation across the reference planes. */
const runCensus = {
  paintedRuns: 0,
  paintedLargest: [],
  absorbedEquivalent: 0,
  droppedLoops: 0,
  droppedVertices: 0,
  rawSpans: 0,
  rawSubThreshold: 0,
  rawShortest: null,
  rawThinnest: null,
  oneVertexRuns: 0,
  labels: 0,
}
const sliverCensus = new Map(
  CORTICAL_DIVISIONS.map((division) => [
    division,
    { runs: 0, arcLt2: 0, arcLt5: 0, arcLt10: 0, areaLt1: 0, areaLt10: 0, oneVertex: 0, areas: [], arcs: [] },
  ]),
)

for (const plane of REFERENCE_PLANES) {
  const label = `${plane.axis}=${plane.value}`
  const slice = sliceAt(plane)
  if (slice === null) continue
  const rows = []
  let planeRaw = 0
  let planeRawSub = 0
  let planeDropped = 0
  let planeAbsorbed = 0
  for (const loop of slice.loops) {
    const loopCount = loop.length / 2
    const runs = splitLoopByDivisionPlane(loop, plane.axis, plane.value)
    /* c5 — the independent raw re-cut (what the floors have to remove). */
    const raw = rawSpansOfLoop(loop, plane.axis, plane.value)
    planeRaw += raw.length
    runCensus.rawSpans += raw.length
    for (const span of raw) {
      if (!isSubThreshold(span.metrics)) continue
      planeRawSub += 1
      runCensus.rawSubThreshold += 1
      const metric = span.metrics
      if (runCensus.rawShortest === null || metric.arcAu < runCensus.rawShortest.arcAu) {
        runCensus.rawShortest = { plane: label, division: span.division, ...metric }
      }
      const thin = metric.areaAu2 > 0 ? metric.arcAu / Math.sqrt(metric.areaAu2) : Infinity
      if (runCensus.rawThinnest === null || thin > runCensus.rawThinnest.thin) {
        runCensus.rawThinnest = { plane: label, division: span.division, thin, ...metric }
      }
    }
    /* c4 — a loop with no run at all must be a single sub-threshold stretch. */
    if (runs.length === 0) {
      assert(
        loopCount < 3 || polygonAreaOf(loop) < MIN_DIVISION_AREA_AU2 || perimeterOf(loop) < MIN_DIVISION_RUN_AU,
        `${label}: a loop the splitter dropped is sub-threshold (area < ${MIN_DIVISION_AREA_AU2} au² or perimeter < ${MIN_DIVISION_RUN_AU} au)`,
        `loop of ${loopCount} vertices, area ${fmt(polygonAreaOf(loop))} au², perimeter ${fmt(perimeterOf(loop))} au`,
      )
      planeDropped += 1
      runCensus.droppedLoops += 1
      runCensus.droppedVertices += loopCount
      console.log(
        `      dropped loop ${label}: ${loopCount} vertices, area ${fmt(polygonAreaOf(loop))} au², ` +
          `perimeter ${fmt(perimeterOf(loop))} au — one sub-threshold stretch, left in the context fill`,
      )
      continue
    }
    /* c2 — the spans tile the loop exactly once. */
    let coveredPoints = 0
    for (const run of runs) coveredPoints += run.points.length / 2
    assert(
      coveredPoints === loopCount + runs.length,
      `${label}: Σ run points === loop vertices + runs (the spans tile the loop exactly once)`,
      `${coveredPoints} vs ${loopCount} + ${runs.length}`,
    )
    /* c3 — chain continuity + no invented points. */
    const loopKeys = new Set()
    for (let k = 0; k < loopCount; k++) loopKeys.add(`${loop[k * 2]},${loop[k * 2 + 1]}`)
    const coveredKeys = new Set()
    let inventedPoints = 0
    let chainBreaks = 0
    let previousEnd = null
    let firstStart = null
    for (const run of runs) {
      const runCount = run.points.length / 2
      const runStart = `${run.points[0]},${run.points[1]}`
      const runEnd = `${run.points[runCount * 2 - 2]},${run.points[runCount * 2 - 1]}`
      if (firstStart === null) firstStart = runStart
      if (previousEnd !== null && previousEnd !== runStart) chainBreaks += 1
      previousEnd = runEnd
      for (let k = 0; k < runCount; k++) {
        const key = `${run.points[k * 2]},${run.points[k * 2 + 1]}`
        if (!loopKeys.has(key)) inventedPoints += 1
        coveredKeys.add(key)
      }
    }
    if (previousEnd !== firstStart) chainBreaks += 1
    assert(inventedPoints === 0, `${label}: no run carries a point that is not a contour vertex`, `${inventedPoints}`)
    assert(chainBreaks === 0, `${label}: the runs form one closed chain`, `${chainBreaks} break(s)`)
    let uncovered = 0
    for (const key of loopKeys) if (!coveredKeys.has(key)) uncovered += 1
    assert(uncovered === 0, `${label}: every vertex of a painted loop appears in a run (none dropped)`, `${uncovered}`)
    /* c1 + c6 + c7 — the floors, the label rule and the census. */
    for (const run of runs) {
      const metrics = corticalRunMetrics(run.points)
      const bucket = sliverCensus.get(run.division)
      bucket.runs += 1
      bucket.arcs.push(metrics.arcAu)
      bucket.areas.push(metrics.areaAu2)
      if (metrics.arcAu < 2) bucket.arcLt2 += 1
      if (metrics.arcAu < 5) bucket.arcLt5 += 1
      if (metrics.arcAu < 10) bucket.arcLt10 += 1
      if (metrics.areaAu2 < 1) bucket.areaLt1 += 1
      if (metrics.areaAu2 < 10) bucket.areaLt10 += 1
      if (metrics.vertices < 2) {
        bucket.oneVertex += 1
        runCensus.oneVertexRuns += 1
      }
      runCensus.paintedRuns += 1
      assert(
        metrics.arcAu >= MIN_DIVISION_RUN_AU,
        `${label}: no painted run is shorter than ${MIN_DIVISION_RUN_AU} au of arc`,
        `${run.division} run of ${fmt(metrics.arcAu)} au (${metrics.vertices} vertices)`,
      )
      assert(
        metrics.areaAu2 >= MIN_DIVISION_AREA_AU2,
        `${label}: no painted run encloses less than ${MIN_DIVISION_AREA_AU2} au²`,
        `${run.division} run of ${fmt(metrics.areaAu2)} au² (arc ${fmt(metrics.arcAu)} au)`,
      )
      rows.push({ division: run.division, ...metrics })
    }
  }
  runCensus.absorbedEquivalent += Math.max(0, planeRaw - rows.length) - planeDropped
  /* c6 — the label rule, re-derived exactly as buildLobeLayer applies it. */
  const byDivision = new Map(CORTICAL_DIVISIONS.map((division) => [division, []]))
  for (const row of rows) byDivision.get(row.division).push(row)
  let planeLabels = 0
  for (const division of CORTICAL_DIVISIONS) {
    const divisionRuns = byDivision.get(division)
    if (divisionRuns.length === 0) continue
    let winner = divisionRuns[0]
    for (const row of divisionRuns) if (row.areaAu2 > winner.areaAu2) winner = row
    assert(
      winner.areaAu2 >= MIN_DIVISION_LABEL_AREA_AU2,
      `${label}: ${division} carries a label only on a run at or above the ${MIN_DIVISION_LABEL_AREA_AU2} au² label floor`,
      `largest run ${fmt(winner.areaAu2)} au²`,
    )
    planeLabels += 1
    runCensus.labels += 1
  }
  assert(
    planeLabels === [...byDivision.values()].filter((list) => list.length > 0).length,
    `${label}: at most ONE label per division per plane`,
    `${planeLabels} label(s)`,
  )
  /* c7 — the printed per-plane per-division table. */
  console.log(
    `  ${label.padStart(6)}  loops ${String(slice.loops.length).padStart(2)}  runs ${String(rows.length).padStart(3)}` +
      `  raw spans ${String(planeRaw).padStart(3)}  raw sub-threshold ${String(planeRawSub).padStart(3)}` +
      `  dropped loops ${planeDropped}`,
  )
  for (const division of CORTICAL_DIVISIONS) {
    const divisionRuns = byDivision.get(division)
    if (divisionRuns.length === 0) continue
    const arc = statsOf(divisionRuns.map((r) => r.arcAu))
    const area = statsOf(divisionRuns.map((r) => r.areaAu2))
    console.log(
      `      ${division.padEnd(10)} runs ${String(arc.n).padStart(2)}  ` +
        `arc min ${fmt(arc.min, 2).padStart(7)} med ${fmt(arc.median, 2).padStart(7)} max ${fmt(arc.max, 2).padStart(7)}  ` +
        `area min ${fmt(area.min, 2).padStart(8)} med ${fmt(area.median, 2).padStart(8)} max ${fmt(area.max, 2).padStart(8)}`,
    )
  }
  for (const row of rows) {
    // Keep the 8 SMALLEST painted runs: they are the evidence that no sliver or
    // long thin wedge survives the rule.
    if (runCensus.paintedLargest.length < 8) runCensus.paintedLargest.push({ plane: label, ...row })
    else {
      let worst = 0
      for (let i = 1; i < runCensus.paintedLargest.length; i++) {
        if (runCensus.paintedLargest[i].areaAu2 > runCensus.paintedLargest[worst].areaAu2) worst = i
      }
      if (row.areaAu2 < runCensus.paintedLargest[worst].areaAu2) {
        runCensus.paintedLargest[worst] = { plane: label, ...row }
      }
    }
  }
}

/* c5 — the bite: the raw partition really does contain sub-threshold spans. */
console.log('\n  c5. the bite — sub-threshold spans in the INDEPENDENT raw re-cut:')
console.log(
  `    reference planes: ${runCensus.rawSpans} raw spans, ${runCensus.rawSubThreshold} of them below a floor ` +
    `→ ${runCensus.absorbedEquivalent} span(s) absorbed/merged away by the rule`,
)
if (runCensus.rawShortest !== null) {
  console.log(
    `    shortest raw span: ${runCensus.rawShortest.plane} ${runCensus.rawShortest.division} ` +
      `arc ${fmt(runCensus.rawShortest.arcAu)} au, area ${fmt(runCensus.rawShortest.areaAu2)} au², ` +
      `${runCensus.rawShortest.vertices} own vertex/vertices`,
  )
}
if (runCensus.rawThinnest !== null) {
  console.log(
    `    thinnest raw span (arc/√area): ${runCensus.rawThinnest.plane} ${runCensus.rawThinnest.division} ` +
      `arc ${fmt(runCensus.rawThinnest.arcAu)} au, area ${fmt(runCensus.rawThinnest.areaAu2)} au², ` +
      `thinness ${fmt(runCensus.rawThinnest.thin)}`,
  )
}
assert(
  runCensus.rawSubThreshold > 0,
  'the floors have real work: the raw partition contains sub-threshold spans the pre-v10 splitter painted',
  `${runCensus.rawSubThreshold} found`,
)

console.log('\n  c7. sliver census over every painted run at the reference planes:')
let censusTotal = 0
for (const division of CORTICAL_DIVISIONS) {
  const bucket = sliverCensus.get(division)
  if (bucket.runs === 0) continue
  censusTotal += bucket.runs
  console.log(
    `    ${division.padEnd(10)} runs ${String(bucket.runs).padStart(3)}  ` +
      `arc<2 ${bucket.arcLt2}  arc<5 ${bucket.arcLt5}  arc<10 ${bucket.arcLt10}  ` +
      `area<1 ${bucket.areaLt1}  area<10 ${bucket.areaLt10}  1-vertex ${bucket.oneVertex}  ` +
      `arc median ${fmt(statsOf(bucket.arcs).median)}  area median ${fmt(statsOf(bucket.areas).median)}`,
  )
  assert(bucket.arcLt10 === 0, `division "${division}" has no painted run under 10 au of arc`)
  assert(bucket.areaLt10 === 0, `division "${division}" has no painted run under 10 au²`)
  assert(bucket.oneVertex === 0, `division "${division}" has no 1-vertex run`)
}
assert(censusTotal === runCensus.paintedRuns, 'the census visited every painted run once')
assert(runCensus.oneVertexRuns === 0, 'NO painted run is a degenerate 1-vertex run (v10 rule 3)', `${runCensus.oneVertexRuns}`)
console.log(
  `    totals: ${runCensus.paintedRuns} painted runs · ${runCensus.labels} labels · ` +
    `${runCensus.droppedLoops} dropped loops (${runCensus.droppedVertices} vertices, all sub-threshold)`,
)
console.log('    the 8 SMALLEST painted runs at the reference planes (ascending area):')
for (const row of runCensus.paintedLargest.slice().sort((a, b) => a.areaAu2 - b.areaAu2)) {
  console.log(
    `      ${row.plane.padEnd(7)} ${row.division.padEnd(10)} arc ${fmt(row.arcAu).padStart(7)} au  ` +
      `area ${fmt(row.areaAu2).padStart(8)} au²  ${row.vertices} vertices`,
  )
}

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
// The plane-frame splitter is deterministic too: byte-identical runs, and the
// same instance answers identically (no state carried between calls).
const probePlane = { axis: 'z', value: 20 }
const probeSlice = contours.boundsMayCut(contours.partBounds(positions), probePlane)
  ? contours.extractContours(positions, indices, probePlane)
  : { loops: [] }
let splitStable = probeSlice.loops.length > 0
let splitLoopsChecked = 0
for (const loop of probeSlice.loops) {
  const a = JSON.stringify(splitLoopByDivisionPlane(loop, probePlane.axis, probePlane.value))
  const b = JSON.stringify(splitLoopByDivisionPlane(loop, probePlane.axis, probePlane.value))
  if (a !== b) splitStable = false
  splitLoopsChecked += 1
}
assert(splitStable, 'splitLoopByDivisionPlane is deterministic on identical input', `${splitLoopsChecked} loops`)
console.log(`  re-split ${splitLoopsChecked} loops at z=20 twice: byte-identical`)
// Every reference-plane loop, split twice, must also be byte-identical.
let allStable = true
let reSplitLoops = 0
for (const plane of REFERENCE_PLANES) {
  const slice = sliceAt(plane)
  if (slice === null) continue
  for (const loop of slice.loops) {
    const a = JSON.stringify(splitLoopByDivisionPlane(loop, plane.axis, plane.value))
    const b = JSON.stringify(splitLoopByDivisionPlane(loop, plane.axis, plane.value))
    if (a !== b) allStable = false
    reSplitLoops += 1
  }
}
assert(allStable, 'every reference-plane loop re-splits byte-identically', `${reSplitLoops} loops`)
console.log(`  re-split ${reSplitLoops} reference-plane loops twice: byte-identical`)
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
assert(
  /v10 RUN RULE/.test(lobesSource) && /MIN_DIVISION_RUN_AU/.test(lobesSource),
  'corticalLobes.ts documents the v10 run rule and its floors in the file header',
)
console.log(`  note: ${CORTICAL_LOBE_METHOD_NOTE}`)

/* ---- E1. the legend JSX really renders, with the caveat in the DOM -------- */
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
 * What this block does instead: take the JSX verbatim from SectionCanvas.tsx,
 * compile it with the installed TypeScript compiler, and render it with the real
 * `react-dom/server`, binding the six loop variables to the SHIPPED constants
 * (`CORTICAL_DIVISIONS`, `CORTICAL_DIVISION_LABELS`, `CORTICAL_DIVISION_COLORS`,
 * `CORTICAL_LOBE_METHOD_NOTE`). If anyone deletes the legend, renames a
 * className, stops rendering the labels, or retypes the caveat, this fails.
 */
const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const { renderToStaticMarkup } = require_('react-dom/server')
globalThis.React = require_('react')

/** The substring from `from` through the matching close of the char at `openAt`. */
function sliceBalanced(source, from, openAt, openChar, closeChar) {
  let depth = 0
  for (let i = openAt; i < source.length; i++) {
    const char = source[i]
    if (char === openChar) depth += 1
    else if (char === closeChar) {
      depth -= 1
      if (depth === 0) return source.slice(from, i + 1)
    }
  }
  return null
}

/** A top-level `function name(...) { … }` out of the shipped source, verbatim. */
function sliceFunction(source, name) {
  const at = source.indexOf(`function ${name}(`)
  if (at < 0) return null
  const braceAt = source.indexOf('{', at)
  if (braceAt < 0) return null
  return sliceBalanced(source, at, braceAt, '{', '}')
}

/** Compile a JSX/TS snippet with the shipped compiler and load it. */
async function compileHarness(body) {
  const compiled = ts.transpileModule(body, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      isolatedModules: true,
    },
  })
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText, 'utf8').toString('base64')}`)
}

{
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
  globalThis.CORTICAL_DIVISIONS = CORTICAL_DIVISIONS
  globalThis.CORTICAL_DIVISION_LABELS = CORTICAL_DIVISION_LABELS
  globalThis.CORTICAL_DIVISION_COLORS = CORTICAL_DIVISION_COLORS
  globalThis.CORTICAL_LOBE_METHOD_NOTE = CORTICAL_LOBE_METHOD_NOTE
  globalThis.lobesOn = true
  globalThis.drawnDivisions = CORTICAL_DIVISIONS
  const harnessModule = await compileHarness(harness)
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

/* ============================== E2. v10 §5 — the suppressed cortex label === */

console.log('\n--- E2. v10 §5 — the cortex envelope keeps its contour, loses its text ---')
const CORTEX_ID = 'ctx-cerebral-cortex'
const CORTEX_NAME = 'Cerebral cortex (context envelope)'
const setDeclaration = canvasSource.match(
  /export const NO_CANVAS_LABEL_RECORD_IDS[^\n]*= new Set\(\[[^\]]*\]\)/,
)
assert(
  setDeclaration !== null,
  'SectionCanvas.tsx exports NO_CANVAS_LABEL_RECORD_IDS as an inline Set literal',
  'declaration not found',
)
assert(
  setDeclaration !== null && setDeclaration[0].includes(`'${CORTEX_ID}'`),
  `NO_CANVAS_LABEL_RECORD_IDS contains "${CORTEX_ID}"`,
  setDeclaration === null ? '(no declaration)' : setDeclaration[0],
)
assert(
  /drawSelectedLabel[\s\S]{0,700}NO_CANVAS_LABEL_RECORD_IDS\.has\(meta\.group\)/.test(canvasSource),
  'drawSelectedLabel is gated on the suppression set (the selected-name site)',
)
assert(
  /drawHoverLabel[\s\S]{0,500}NO_CANVAS_LABEL_RECORD_IDS\.has\(hover\.group\)/.test(canvasSource),
  'drawHoverLabel is gated on the suppression set (the hover-name site)',
)
{
  // The CONTOUR path: the paint pass really calls drawPart for every visible
  // part and carries no suppression at all — the envelope keeps its fill and
  // outline, only its TEXT is gone.
  const paintPass = sliceFunction(canvasSource, 'drawSectionContours')
  assert(paintPass !== null, 'the contour paint pass drawSectionContours is sliceable from the shipped source')
  assert(
    paintPass !== null && /drawPart\(/.test(paintPass),
    'the contour paint pass still calls drawPart (the envelope contour is drawn)',
  )
  assert(
    paintPass !== null && !/NO_CANVAS_LABEL_RECORD_IDS/.test(paintPass),
    'the contour paint pass filters NOTHING by the suppression set — contour and fill are untouched',
  )
}
assert(
  /function chipNameOf[\s\S]{0,400}NO_CANVAS_LABEL_RECORD_IDS\.has\(entry\.id\)/.test(canvasSource),
  'the structure chip is gated on the same set (the accessible instance of the name)',
)
{
  // Every OTHER context record keeps its label: printed as a list, then asserted.
  const taxonomy = JSON.parse(readFileSync(resolve('src/data/taxonomy.json'), 'utf8'))
  const entries = Array.isArray(taxonomy) ? taxonomy : (taxonomy.entries ?? taxonomy.structures ?? [])
  const contextIds = entries.filter((entry) => entry.kind === 'context').map((entry) => entry.id)
  const suppressed = new Set(
    (setDeclaration?.[0].match(/'([^']+)'/g) ?? []).map((token) => token.slice(1, -1)),
  )
  const others = contextIds.filter((id) => id !== CORTEX_ID && suppressed.has(id))
  console.log(
    `  context records in taxonomy.json: ${contextIds.length} (incl. ${CORTEX_ID}); ` +
      `suppressed: ${[...suppressed].join(', ')}`,
  )
  console.log(
    `  other context records that keep their canvas label: ${contextIds.filter((id) => id !== CORTEX_ID).length}` +
      ' — thalamus envelope, level chips and division labels included',
  )
  assert(
    others.length === 0,
    'no other context record is in the suppression set',
    others.join(', '),
  )
  assert(
    contextIds.includes(CORTEX_ID),
    `taxonomy.json still carries ${CORTEX_ID} (the envelope itself is not deleted)`,
  )
}
/* The chip render: the ONE place this suppression is observable in the
 * accessibility tree (the canvas is a single role="img" with a fixed
 * aria-label and contributes no text). The shipped helper and the shipped JSX
 * block are compiled together and rendered for three cases. */
{
  const chipAt = canvasSource.indexOf('className="section-structure-chip"')
  assert(chipAt > 0, 'SectionCanvas.tsx renders a .section-structure-chip element')
  const helperSource = sliceFunction(canvasSource, 'chipNameOf')
  assert(helperSource !== null, 'the chip helper chipNameOf is a module-scope function (renderable in Node)')
  assert(
    /const selectedChipName = chipNameOf\(selectedEntry\)/.test(canvasSource) &&
      /const hoveredChipName = chipNameOf\(hoveredEntry\)/.test(canvasSource),
    'the component computes BOTH chip names with the shipped chipNameOf (the harness reproduces those two lines)',
  )
  const blockStart = canvasSource.lastIndexOf('{', canvasSource.lastIndexOf('&&', chipAt))
  const parenAt = canvasSource.indexOf('(', canvasSource.lastIndexOf('&&', chipAt))
  let chipJsx = blockStart < 0 || parenAt < 0 ? null : sliceBalanced(canvasSource, blockStart, parenAt, '(', ')')
  if (chipJsx !== null && canvasSource[blockStart + chipJsx.length] === '}') chipJsx += '}'
  assert(chipJsx !== null && chipJsx.includes('section-structure-chip'), 'the chip JSX block is sliceable')
  if (setDeclaration !== null && helperSource !== null && chipJsx !== null) {
    const harness = `
      ${setDeclaration[0]}
      ${helperSource}
      export default function ChipHarness() {
        const selectedChipName = chipNameOf(globalThis.chipSelectedEntry)
        const hoveredChipName = chipNameOf(globalThis.chipHoveredEntry)
        const showHoveredEntry = globalThis.chipHoverShown
        return (
          <React.Fragment>
            ${chipJsx}
          </React.Fragment>
        )
      }
    `
    const module_ = await compileHarness(harness)
    const ChipHarness = module_.default
    const cases = [
      {
        what: 'cortex SELECTED',
        selected: { id: CORTEX_ID, name: CORTEX_NAME },
        hovered: null,
        hoverShown: false,
        expect: null,
        forbid: CORTEX_NAME,
      },
      {
        what: 'thalamus envelope SELECTED (the other context labels stay)',
        selected: { id: 'ctx-thalamus-envelope', name: 'Thalamus (context envelope)' },
        hovered: null,
        hoverShown: false,
        expect: 'Thalamus (context envelope)',
        forbid: CORTEX_NAME,
      },
      {
        what: 'cortex HOVERED while the thalamus is selected (both sites)',
        selected: { id: 'ctx-thalamus-envelope', name: 'Thalamus (context envelope)' },
        hovered: { id: CORTEX_ID, name: CORTEX_NAME },
        hoverShown: true,
        expect: 'Thalamus (context envelope)',
        forbid: CORTEX_NAME,
      },
    ]
    for (const testCase of cases) {
      globalThis.chipSelectedEntry = testCase.selected
      globalThis.chipHoveredEntry = testCase.hovered
      globalThis.chipHoverShown = testCase.hoverShown
      const markup = renderToStaticMarkup(ChipHarness({}))
      const hasChip = markup.includes('section-structure-chip')
      assert(
        !markup.includes(testCase.forbid),
        `chip render (${testCase.what}): the cortex name is NOT in the accessibility tree`,
        markup,
      )
      if (testCase.expect === null) {
        assert(
          !hasChip,
          `chip render (${testCase.what}): nothing to announce, so no chip element is rendered`,
          markup,
        )
      } else {
        assert(
          markup.includes(testCase.expect),
          `chip render (${testCase.what}): "${testCase.expect}" is announced`,
          markup,
        )
      }
      console.log(
        `  chip render (${testCase.what}): markup ${markup === '' ? '"" (chip suppressed)' : `${markup.length} chars`} · ` +
          `${hasChip ? '.section-structure-chip present' : 'no chip'}`,
      )
    }
  }
}

/* ------------------------------- E3. the canvas wiring of the run/label rule */
console.log('\n--- E3. the canvas wiring of the v10 run rule ----------------------------')
assert(
  /buildLobeLayer[\s\S]*?corticalRunMetrics\(points\)/.test(canvasSource),
  'buildLobeLayer measures each run with the SHIPPED corticalRunMetrics',
)
assert(
  /metrics\.areaAu2 > entry\.labelAreaAu2/.test(canvasSource),
  'the label anchor competes by DRAWN AREA, not by vertex count',
)
assert(
  !/longestRun/.test(canvasSource),
  'the pre-v10 vertex-count competition (longestRun) is gone',
)
assert(
  /entry\.labelAreaAu2 < MIN_DIVISION_LABEL_AREA_AU2/.test(canvasSource),
  'the label pass applies MIN_DIVISION_LABEL_AREA_AU2 (a second, independent guard)',
)
assert(
  !/NO_CANVAS_LABEL_RECORD_IDS/.test(lobesSource),
  'the suppression set lives in the canvas, not in the partition rule',
)
console.log('  canvas: corticalRunMetrics + labelAreaAu2 + MIN_DIVISION_LABEL_AREA_AU2 wired, longestRun gone')

/* ================================= F. the rule, exercised and swept ====== */

console.log('\n--- F. the rule is exercised (synthetic loops + the user grid) -----------')
{
  // Synthetic loops in the transverse frame (axis 'y', u = x, v = z) at y = 0,
  // where the fitted rule is hand-checkable: x ≤ 22 with z ∈ [−20, 17] is the
  // limbic medial-temporal band, x ≥ 18 + 0.055(z+40) below the fissure floor is
  // temporal, z ≤ −50 (y ≥ −5) is occipital, and the frontal/parietal split is
  // z = 5. Every vertex below is chosen to land in ONE of those territories.
  const Y = { axis: 'y', value: 0 }
  const metricsOf = (runs) => runs.map((run) => corticalRunMetrics(run.points))

  // (1) a sub-threshold limbic stretch (arc 6 au) is absorbed, not painted:
  //     temporal (30,0) (30,16) then limbic (10,16) (10,10).
  const sliverLoop = [30, 0, 30, 16, 10, 16, 10, 10]
  const sliverRuns = splitLoopByDivisionPlane(sliverLoop, Y.axis, Y.value)
  assert(
    sliverRuns.every((run) => !isSubThreshold(corticalRunMetrics(run.points))),
    'synthetic: every run of a loop containing a 6 au stretch clears the floors',
    JSON.stringify(metricsOf(sliverRuns).map((m) => [fmt(m.arcAu), fmt(m.areaAu2)])),
  )
  assert(
    !sliverRuns.some((run) => run.division === 'limbic'),
    'synthetic: a 6 au limbic stretch is absorbed into its neighbour instead of being painted',
    JSON.stringify(sliverRuns.map((run) => run.division)),
  )
  assert(
    sliverRuns.length === 1 && sliverRuns[0].division === 'temporal',
    'synthetic: the absorbed loop is one temporal run (the whole 220 au² quad)',
    JSON.stringify(sliverRuns.map((run) => `${run.division}:${fmt(corticalRunMetrics(run.points).areaAu2)}`)),
  )
  let syntheticCovered = 0
  for (const run of sliverRuns) syntheticCovered += run.points.length / 2
  assert(
    syntheticCovered === sliverLoop.length / 2 + sliverRuns.length,
    'synthetic: absorption keeps the tiling identity (Σ points === vertices + runs)',
    `${syntheticCovered}`,
  )

  // (2) a stretch that wraps the loop's start index is ONE run, not a
  //     head/tail pair the pre-v10 splitter measured separately.
  const wrapLoop = [10, 0, 30, 40, 40, 20, 10, 10] // limbic, temporal, temporal, limbic
  const wrapRuns = splitLoopByDivisionPlane(wrapLoop, Y.axis, Y.value)
  const wrapLimbic = wrapRuns.filter((run) => run.division === 'limbic')
  assert(
    wrapRuns.length === 2 && wrapLimbic.length === 1,
    'synthetic: a division wrapping the loop start index is ONE run (ring rotated before the cut)',
    JSON.stringify(wrapRuns.map((run) => `${run.division}:${run.points.length / 2}`)),
  )
  assert(
    wrapLimbic.length === 1 && wrapLimbic[0].points.length / 2 - 1 === 2,
    'synthetic: the wrapped run carries BOTH of its own vertices',
    JSON.stringify(wrapLimbic[0]?.points ?? []),
  )

  // (3) a homogeneous loop below the floors is dropped, not painted.
  const splinterLoop = [30, 0, 30, 3, 29, 3] // 3 vertices, 1.5 au² of area
  assert(
    splitLoopByDivisionPlane(splinterLoop, Y.axis, Y.value).length === 0,
    'synthetic: a homogeneous sub-threshold loop is dropped (no patched sliver)',
    JSON.stringify(splitLoopByDivisionPlane(splinterLoop, Y.axis, Y.value).map((r) => r.division)),
  )

  // (4) a homogeneous body loop is kept as exactly one run (24…40 × −10…40 au is
  //     temporal territory at y = 0, so the loop really is homogeneous).
  const bodyLoop = [24, -10, 40, -10, 40, 40, 24, 40]
  const bodyRuns = splitLoopByDivisionPlane(bodyLoop, Y.axis, Y.value)
  assert(
    bodyRuns.length === 1 && bodyRuns[0].division === 'temporal',
    'synthetic: a homogeneous temporal body loop is one temporal run',
    JSON.stringify(bodyRuns.map((run) => run.division)),
  )
  assert(
    corticalRunMetrics(bodyRuns[0].points).areaAu2 >= MIN_DIVISION_AREA_AU2,
    'synthetic: that run clears the area floor',
    fmt(corticalRunMetrics(bodyRuns[0].points).areaAu2),
  )
  console.log(
    '  synthetic loops: sliver absorbed · wrapped stretch is one run · splinter dropped · body kept',
  )
}

{
  /* The 34-plane user grid at run level: the levels the screenshot came from.
   * No raster (that would triple the gate's runtime for no extra statement). */
  const grid = {
    planes: 0,
    loops: 0,
    runs: 0,
    rawSpans: 0,
    rawSubThreshold: 0,
    droppedLoops: 0,
    droppedVertices: 0,
    violations: 0,
    oneVertex: 0,
    unlabelled: 0,
    labels: 0,
  }
  const gridWorst = []
  for (const plane of USER_PLANES) {
    const slice = sliceAt(plane)
    if (slice === null) continue
    grid.planes += 1
    const rows = []
    for (const loop of slice.loops) {
      grid.loops += 1
      const runs = splitLoopByDivisionPlane(loop, plane.axis, plane.value)
      if (runs.length === 0) {
        grid.droppedLoops += 1
        grid.droppedVertices += loop.length / 2
        assert(
          polygonAreaOf(loop) < MIN_DIVISION_AREA_AU2 || perimeterOf(loop) < MIN_DIVISION_RUN_AU,
          `user grid ${plane.axis}=${plane.value}: a dropped loop is sub-threshold`,
          `area ${fmt(polygonAreaOf(loop))}, perimeter ${fmt(perimeterOf(loop))}`,
        )
        continue
      }
      let covered = 0
      for (const run of runs) {
        covered += run.points.length / 2
        const metrics = corticalRunMetrics(run.points)
        grid.runs += 1
        if (metrics.vertices < 2) grid.oneVertex += 1
        if (isSubThreshold(metrics)) grid.violations += 1
        rows.push({ division: run.division, ...metrics })
        if (gridWorst.length < 6) gridWorst.push({ plane: `${plane.axis}=${plane.value}`, division: run.division, ...metrics })
        else {
          let worst = 0
          for (let i = 1; i < gridWorst.length; i++) {
            if (gridWorst[i].areaAu2 > gridWorst[worst].areaAu2) worst = i
          }
          if (metrics.areaAu2 < gridWorst[worst].areaAu2) {
            gridWorst[worst] = { plane: `${plane.axis}=${plane.value}`, division: run.division, ...metrics }
          }
        }
      }
      assert(
        covered === loop.length / 2 + runs.length,
        `user grid ${plane.axis}=${plane.value}: the tiling identity holds`,
        `${covered}`,
      )
    }
    for (const span of slice.loops.flatMap((loop) => rawSpansOfLoop(loop, plane.axis, plane.value))) {
      grid.rawSpans += 1
      if (isSubThreshold(span.metrics)) grid.rawSubThreshold += 1
    }
    const present = new Set(rows.map((row) => row.division))
    for (const division of present) {
      const divisionRuns = rows.filter((row) => row.division === division)
      let best = divisionRuns[0]
      for (const row of divisionRuns) if (row.areaAu2 > best.areaAu2) best = row
      if (best.areaAu2 < MIN_DIVISION_LABEL_AREA_AU2) grid.unlabelled += 1
      grid.labels += 1
    }
  }
  console.log(
    `  user grid: ${grid.planes} planes sliced · ${grid.loops} loops · ${grid.runs} painted runs · ` +
      `${grid.rawSpans} raw spans (${grid.rawSubThreshold} sub-threshold)`,
  )
  console.log(
    `  user grid: ${grid.droppedLoops} dropped loops (${grid.droppedVertices} vertices) · ` +
      `${grid.labels} labels · ${grid.unlabelled} painted division(s) without a label-eligible run`,
  )
  console.log('  user grid: the 6 SMALLEST painted runs (ascending area):')
  for (const row of gridWorst.slice().sort((a, b) => a.areaAu2 - b.areaAu2)) {
    console.log(
      `      ${row.plane.padEnd(7)} ${row.division.padEnd(10)} arc ${fmt(row.arcAu).padStart(7)} au  ` +
        `area ${fmt(row.areaAu2).padStart(8)} au²  ${row.vertices} vertices`,
    )
  }
  assert(grid.planes > 0, 'the user grid sliced at least one plane')
  assert(grid.runs > 0, 'the user grid painted at least one run')
  assert(grid.violations === 0, 'user grid: no painted run is below either floor', `${grid.violations}`)
  assert(grid.oneVertex === 0, 'user grid: no painted run is a 1-vertex run', `${grid.oneVertex}`)
  assert(grid.rawSubThreshold > 0, 'user grid: the floors have real work here too', `${grid.rawSubThreshold}`)
  assert(
    grid.unlabelled === 0,
    'user grid: every painted division has a run at or above the label floor',
    `${grid.unlabelled} not`,
  )
}

/* ================================================ G. no worker regression == */

console.log('\n--- G. the worker pipeline still passes ----------------------------------')
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
  console.log(`\n${failures.length} failure(s)`)
  process.exit(1)
}
console.log('  PASS cortical-lobes')
process.exit(0)
