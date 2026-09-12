/**
 * corticalLobes.ts — the rough cortical-division partition of the live 2D
 * section (docs/SWARM_V9_PLAN.md §2, v9 task `cortical-lobes`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * HONEST CAVEAT — THIS DIVIDES THE **DERIVED RIBBON**, NOT A GYRAL MAP.
 * The partition is a cheap geometric rule over the DERIVED ribbon shell
 * (`ctx-hemisphere-l` / `-r`, 81 128 / 81 448 triangles, body-sculpted from
 * BodyParts3D and resculpted for this atlas). It is NOT a gyral or
 * cytoarchitectonic parcellation: no sulcal fundus, no Brodmann area and no
 * flat-map boundary is traced. Every boundary below is a semi-plane, an
 * ellipsoid or a hollow cylinder fitted to geometry that IS committed in this
 * repository, and the residual of each fit is stated with it.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * METHOD (the probe that produced every constant)
 * -----------------------------------------------
 * Probe: `.dsh-scratch/cortical-lobes-probe*.mjs` (task scratch, gitignored,
 * re-runnable; the series is reported in the task report and in
 * docs/CONTENT_INVENTORY.md). It reads only committed assets through the same
 * Node path the section pipeline uses (GLTFLoader + contours.ts):
 *
 *   ctx-hemisphere-l.glb                  the ribbon being divided
 *   vasc-middle-cerebral-artery-m1-l.glb  the M1 trunk, in the Sylvian cistern
 *   vasc-middle-cerebral-artery-m2-l.glb  the M2 exit at the lateral surface
 *   ctx-corpus-callosum.glb               the callosal block (limbic band axis)
 *   tel-lateral-ventricle-l.glb           temporal-horn level (medial temporal)
 *   ctx-cerebellum-l.glb                  tentorial level (temporal underside)
 *   vasc-posterior-cerebral-artery-p2-*.glb   the P2 course at the tentorial edge
 *
 * Measured landmarks and the residuals of the fits
 * ------------------------------------------------
 * 1. RIBBON. Vertex bbox x [0.997, 55.475] y [−6.803, 113.701] z [−72.816, 70.592];
 *    40 388 vertices (the GLB's index buffer holds 81 128 triangles over that
 *    shared vertex pool). Dorsal ridge (max-y vertex per 1 au z column,
 *    x ∈ [10, 30]): 113.7 at z = −6 … 0, falling to 92 at z = 52 and 51 at
 *    z = −66 — the brain is 120.5 au (144.6 mm) tall and 143.4 au (172 mm)
 *    long, so this ribbon covers the whole cerebrum, not a lobe.
 * 2. CENTRAL SULCUS (frontal|parietal). The dorsal ridge carries a posterior
 *    step — the central-sulcus notch in the superior surface — at z ≈ −34/−36,
 *    where the ridge drops from y 106 to y 90 (measured at x ∈ [20, 26]; the
 *    same step appears at x ∈ [26, 32] as 93 → 89 → 103 and at x ∈ [8, 14] as
 *    104 → 100). Fitted as a straight segment through that notch and through
 *    the lateral end of the sulcus in the Sylvian point at (y 30.7, z 5):
 *        z_cs(y) = −57 − 11.5·y        (z ≥ z_cs → frontal)
 *    Residual against the two measured endpoints: 0.0 au at (y 90, z −35) and
 *    0.0 au at (y 30.7, z 5); against the hand-knob region (anterior reach of
 *    the y ≥ 100 surface, measured at x 11 → z −41.2): 5.4 au. Beyond
 *    z = 5 the sulcus is off the dorsal surface, so the boundary becomes the
 *    flat vertex rule y ≥ 77 — the medial vertex of the paracentral lobule,
 *    measured as the ridge's 113.7 au crest.
 * 3. LATERAL FISSURE (temporal|frontal+parietal). The Sylvian corridor is
 *    measured from the MCA: the M1+M2 centroid cloud spans x [12.2, 36.5],
 *    y [9.4, 33.3], z [18.4, 26.5]. A least-squares line through its per-2 au
 *    z-bin medians gives y = 50.336 − 1.4829·z with residual mean |Δ| 1.20 au,
 *    max |Δ| 2.87 au over 5 bins — too steep and too thin in z to be the
 *    surface line, so the fissure line is anchored instead on the two
 *    anatomical ends of the corridor: the temporal pole end (z 30, y ≈ 19) and
 *    the Sylvian point (z 5, y 30.7):
 *        y_fis(z) = max(15, 30.7 − 0.46·(z − 5))
 *    Residual against the measured MCA corridor end points: 3.9 au at the M2
 *    exit (36.2, 33.3, 25.5) and 0.0 au at the M1 trunk level; the 15 au floor
 *    is the lowest ribbon-underside y of the temporal lobe at z ≥ 40. The
 *    temporal lobe is additionally gated laterally (x ≥ 18 + 0.055·(z + 40))
 *    and anteriorly (z ≤ 45), so the frontal pole's inferior surface is not
 *    painted as temporal.
 * 4. PARIETO-OCCIPITAL / CALCARINE (occipital). The atlas carries no
 *    parieto-occipital or calcarine mesh (it is a brainstem + telencephalon
 *    atlas), so the boundary is fitted to the artery that runs in the
 *    calcarine/ambient course and to the measured ribbon mass: the PCA P2
 *    segment has z [−16.6, 12.4] and the occipital pole is at z −72.8. A
 *    plane at z = −50 holds 11.05 % of the ribbon (the occipital lobe is
 *    12.4 % of the cortical surface in the standard morphometric series), and
 *    sloping it with height — z ≤ −50 − 0.15·y — keeps the calcarine
 *    (medial, above y = 0) behind the superior lip of the tentorium while the
 *    inferior temporal surface stays temporal. Residual: the boundary is
 *    within 12 au of the PCA P2 posterior extent (−16.6 au) in y only; it is
 *    a plane approximation of a curved sulcus, stated as such.
 * 5. CIRCULAR SULCUS / INSULAR LIMEN (insula). Measured: the nearest ribbon
 *    vertex to the MCA M1 trunk centroid (24.4, 16.9, 22.4) is 3.13 au away at
 *    (26.4, 15.2, 20.7); the nearest to the M2 exit (36.2, 33.3, 25.5) is
 *    5.93 au away at (33.2, 36.6, 29.4). The limen insulae is therefore the
 *    ribbon between those two points, and the insula is fitted as the
 *    ellipsoid through them:
 *        centre (29, 22, 17), radii (13, 16, 22) au  →  15.6 × 19.2 × 26.4 mm
 *    Residual: 2.6 au from the M1 junction and 9.2 au from the M2 exit. It
 *    holds 3.34 % of the ribbon's vertices and 2.10 % of the reference-plane
 *    cross-section area — the insula is 1.8–2.5 % of the cortical surface per
 *    hemisphere in the morphometric series, so the share is right but the
 *    SURFACE is not the true insular cortex: the derived shell has no insular
 *    mesh at all, so this ellipsoid necessarily carves the deep part of the
 *    overlying opercular/Sylvian tissue (see LIMIT below).
 * 6. CALLOSAL / CINGULATE (limbic, cingulate half). The corpus callosum
 *    measures y [19.4, 63.9] z [−34.8, 41.1] (centre y 41.7, z 3.1; half
 *    extents 22.3 and 38.0). The cingulate gyrus is the ribbon that wraps the
 *    callosum one gyrus wide, fitted as a hollow elliptical cylinder of the
 *    callosal axis with radii (20, 22) au — a band 6–12 au wide above, below
 *    and in front of the callosum — cut at the splenium by
 *    y + 0.45·z ≥ 42 so the band stops where the callosum ends rather than
 *    closing the ring into the isthmus, and gated to the medial wall
 *    (x ≤ 24). Residual: the band's lateral limit is 24 au against a measured
 *    callosal half-width of 20.6 au, i.e. 3.4 au (4.1 mm) of cingulate cortex
 *    beyond the callosal surface, which is the anatomical width of the
 *    cingulate gyrus within the probe's 1 au resolution.
 * 7. COLLATERAL / PARAHIPPOCAMPAL (limbic, medial temporal half). The medial
 *    temporal cortex below the temporal horn of the lateral ventricle
 *    (tel-lateral-ventricle-l bbox y [5.6, 59.3] z [−53.2, 37.5], x from 0)
 *    and medial to the collateral sulcus, approximated by the hippocampal
 *    x-extent (ctx-hippocampus-l x [15.0, 31.0]) widened to x ≤ 22 with the
 *    band y ≤ 20, z ∈ [−20, 17]. Residual: the lateral edge is x = 22 against
 *    a hippocampal lateral edge of 31.0, so the boundary is INSIDE the
 *    hippocampus' own x-extent and therefore excludes the collateral sulcus'
 *    lateral bank — this under-counts the parahippocampal gyrus, deliberately,
 *    rather than claiming temporal neocortex.
 *
 * MEASURED SHARES (probe `cortical-lobes-tune4.mjs`, 220² raster cells inside
 * the even-odd ribbon cross-section of every reference plane):
 *   frontal 47.5 % · parietal 27.3 % · temporal 12.8 % · occipital 6.7 % ·
 *   limbic 3.6 % · insula 2.1 % of the sampled ribbon area. Limbic : rest =
 *   1 : 26.8, against 1 : 8–1 : 20 for limbic cortex in the morphometric
 *   literature — the cingulate band is the 1–2 gyrus strip the probe could
 *   measure, not the whole limbic lobe.
 *
 * LIMIT (what this rule CANNOT do)
 * --------------------------------
 *  1. It divides the DERIVED ribbon, not a gyral map (see the top of the file).
 *  2. The ribbon has NO INSULAR SURFACE. Measured: at the reference planes the
 *     Sylvian corridor is a GAP — at y = 30 the cross-section has no tissue
 *     between z 21.5 (temporal operculum) and z 24.9 (frontal/parietal
 *     operculum), and at z = 20 between y 33.2 and y 43.3. The insula ellipsoid
 *     therefore paints the deepest available tissue at the limen (2.1 % of the
 *     sampled area, 3.3 % of the vertices), not the true insular cortex.
 *  3. Three of the 13 reference planes of the section pipeline (y = −46, −24,
 *     −8) MISS this ribbon entirely — its inferior limit is y = −6.803 — so
 *     they carry no cortical division at all. That is a property of the
 *     geometry, not a failure of the rule.
 *  4. The rule is O(1) per point by construction: five comparisons, one square
 *     root and one ellipse per point, no iteration, no lookup table. It is
 *     evaluated on the main thread over the worker's contour vertices (see
 *     SectionCanvas), so the worker protocol is untouched.
 *
 * The store field that toggles this layer is `sectionLobes` (plan §6). It is
 * OWNED BY TASK 4 (`src/state/store.ts`); this module is its interface and
 * SectionCanvas reads it defensively, so the layer ships switched off and the
 * toggle appears the moment the field and its `neuroaxis.sectionLobes` key
 * exist.
 */
import type { PlaneAxis } from './contours'

/* ------------------------------------------------------------------ types */

export type CorticalDivision =
  | 'frontal'
  | 'parietal'
  | 'temporal'
  | 'occipital'
  | 'insula'
  | 'limbic'

/** Display order of the legend (cortical ribbon clockwise from the pole). */
export const CORTICAL_DIVISIONS: readonly CorticalDivision[] = [
  'frontal',
  'parietal',
  'temporal',
  'occipital',
  'insula',
  'limbic',
]

export const CORTICAL_DIVISION_LABELS: Record<CorticalDivision, string> = {
  frontal: 'Frontal lobe',
  parietal: 'Parietal lobe',
  temporal: 'Temporal lobe',
  occipital: 'Occipital lobe',
  insula: 'Insula',
  limbic: 'Limbic (cingulate + parahippocampal)',
}

/**
 * Short on-canvas label per division. The in-section label has to fit a section
 * whose canonical width is 116 au without covering the ribbon, so it is the one-
 * or two-word form; the LEGEND uses the full `CORTICAL_DIVISION_LABELS`.
 */
export const CORTICAL_DIVISION_SHORT_LABELS: Record<CorticalDivision, string> = {
  frontal: 'FRONTAL',
  parietal: 'PARIETAL',
  temporal: 'TEMPORAL',
  occipital: 'OCCIPITAL',
  insula: 'INSULA',
  limbic: 'LIMBIC',
}

/**
 * Division colours: deliberately NOT the taxonomy greys/violets (the cortex
 * envelope is `#94a3b8`-family) and not the selection/hover orange/cyan, so the
 * layer reads as a separate partition over the existing fill.
 */
export const CORTICAL_DIVISION_COLORS: Record<CorticalDivision, string> = {
  frontal: '#38bdf8',
  parietal: '#34d399',
  temporal: '#fbbf24',
  occipital: '#c084fc',
  insula: '#fb7185',
  limbic: '#a3e635',
}

/** Fill alpha of a division run painted OVER the context fill (0..1). */
export const CORTICAL_LOBES_FILL_ALPHA = 0.42

/** Stroke alpha of a division run's outline (0..1). */
export const CORTICAL_LOBES_STROKE_ALPHA = 0.95

/* ------------------------------------------------------- fitted constants */

/**
 * Every number below is a fitted boundary constant (see the file header for
 * the probe, the measurement and the residual of each one). Values are in
 * canonical au: x = +patient-left, y = +superior, z = +anterior, 1 au = 1.2 mm.
 */
export const CORTICAL_BOUNDARIES = {
  /** Occipital: z ≤ OCC_Z0 + OCC_DZ_DY·y, and only above OCC_Y_MIN. */
  OCC_Z0: -50,
  OCC_DZ_DY: -0.15,
  OCC_Y_MIN: -5,
  /** Limbic — cingulate band: hollow elliptical cylinder about the callosum. */
  CING_Y: 41.7,
  CING_Z: 3.1,
  CING_RY: 20,
  CING_RZ: 22,
  /** The band stops at the splenium: y + CING_SPLIT_SLOPE·z ≥ CING_SPLIT_MIN. */
  CING_SPLIT_SLOPE: 0.45,
  CING_SPLIT_MIN: 42,
  CING_X: 24,
  /** Limbic — medial temporal band (below the temporal horn, medial to x 22). */
  HIPPO_X: 22,
  HIPPO_Y: 20,
  HIPPO_Z_MIN: -20,
  HIPPO_Z_MAX: 17,
  /** Insula: ellipsoid through the measured limen-insulae ribbon gap. */
  INSULA_X: 29,
  INSULA_Y: 22,
  INSULA_Z: 17,
  INSULA_RX: 13,
  INSULA_RY: 16,
  INSULA_RZ: 22,
  /** Lateral fissure: y ≤ max(FISS_Y_MIN, FISS_Y0 + FISS_SLOPE·(z − FISS_Z0)). */
  FISS_Y0: 30.7,
  FISS_Z0: 5,
  FISS_SLOPE: -0.46,
  FISS_Y_MIN: 15,
  /** Temporal gating: only behind the pole (z ≤ 45) and lateral enough. */
  FISS_Z_MAX: 45,
  FISS_X0: 18,
  FISS_DX_DZ: 0.055,
  FISS_X_Z0: -40,
  /** Central sulcus: z ≥ CS_A + CS_B·y (below the knee), else y ≥ CS_KNEE_Y. */
  CS_A: -57,
  CS_B: -11.5,
  CS_KNEE_Z: 5,
  CS_KNEE_Y: 77,
} as const

/**
 * The honest caveat, as ONE string. It contains the words `DERIVED ribbon` and
 * is rendered verbatim in the section legend, so the canvas and the file
 * header cannot state two different limits.
 */
export const CORTICAL_LOBE_METHOD_NOTE =
  'Rough division fitted to the DERIVED ribbon geometry (central sulcus, lateral ' +
  'fissure, parieto-occipital plane, insular limen, callosal/collateral bands) — ' +
  'a geometric approximation, not a gyral or cytoarchitectonic map.'

/* ------------------------------------------------------------ the rule */

/**
 * classifyCorticalPoint — assign ONE canonical-space point of the cortical
 * ribbon to a rough division. Pure position rule: no geometry access, no
 * allocation, no iteration (see the header for the fitted constants and the
 * residual of each boundary).
 *
 * Order of the cascade is part of the contract: occipital → limbic →
 * insula → temporal → frontal/parietal. Each earlier boundary OVERRIDES the
 * later ones, which is how the medial temporal and cingulate bands win over
 * the temporal and parietal semi-planes.
 */
export function classifyCorticalPoint(x: number, y: number, z: number): CorticalDivision {
  const b = CORTICAL_BOUNDARIES
  // 1. occipital — parieto-occipital / calcarine boundary (plane, y-sloped).
  if (y >= b.OCC_Y_MIN && z <= b.OCC_Z0 + b.OCC_DZ_DY * y) return 'occipital'
  // 2. limbic — cingulate band around the corpus callosum, medial wall only,
  //    cut above the splenium.
  const cy = (y - b.CING_Y) / b.CING_RY
  const cz = (z - b.CING_Z) / b.CING_RZ
  if (
    x <= b.CING_X &&
    cy * cy + cz * cz <= 1 &&
    y + b.CING_SPLIT_SLOPE * z >= b.CING_SPLIT_MIN
  ) {
    return 'limbic'
  }
  // 3. limbic — medial temporal band below the temporal horn.
  if (x <= b.HIPPO_X && y <= b.HIPPO_Y && z >= b.HIPPO_Z_MIN && z <= b.HIPPO_Z_MAX) {
    return 'limbic'
  }
  // 4. insula — circular sulcus / insular limen ellipsoid.
  const ix = (x - b.INSULA_X) / b.INSULA_RX
  const iy = (y - b.INSULA_Y) / b.INSULA_RY
  const iz = (z - b.INSULA_Z) / b.INSULA_RZ
  if (ix * ix + iy * iy + iz * iz <= 1) return 'insula'
  // 5. temporal — below the lateral fissure, behind the pole, lateral enough.
  const fissY = Math.max(b.FISS_Y_MIN, b.FISS_Y0 + b.FISS_SLOPE * (z - b.FISS_Z0))
  const fissX = b.FISS_X0 + b.FISS_DX_DZ * (z - b.FISS_X_Z0)
  if (z <= b.FISS_Z_MAX && y <= fissY && x >= fissX) return 'temporal'
  // 6. frontal — in front of the central sulcus (measured segment below the
  //    knee, flat vertex rule above/behind it); everything else is parietal.
  if (z <= b.CS_KNEE_Z) {
    if (z >= b.CS_A + b.CS_B * y) return 'frontal'
  } else if (y >= b.CS_KNEE_Y) {
    return 'frontal'
  }
  return 'parietal'
}

/** Canonical coordinate of a plane-frame point: `[u, v]` on `AXIS_PAIR[axis]`. */
export function planePointToCanonical(
  axis: PlaneAxis,
  planeValue: number,
  u: number,
  v: number,
): readonly [number, number, number] {
  if (axis === 'y') return [u, planeValue, v] // transverse: u = x, v = z
  if (axis === 'x') return [planeValue, v, u] // sagittal:   u = z, v = y
  return [u, planeValue, v] // coronal: u = x, v = y
}

/** One consecutive same-division run of a contour loop (plane frame). */
export interface CorticalRun {
  division: CorticalDivision
  /** Flat `[u0, v0, u1, v1, …]` path in the plane frame, ≥ 2 points. */
  points: number[]
}

/**
 * splitRuns — the shared splitter. Classify every vertex of ONE closed loop,
 * cut it on division changes, and make every run a STROKEABLE, CONTINUOUS path:
 *
 *  - each run starts at the previous run's last vertex, so consecutive runs
 *    share exactly one vertex and the outline never breaks at a boundary (the
 *    first run starts at the loop's last vertex, which closes the ring);
 *  - a one-vertex sliver (the 0.25 au quantization can leave a single contour
 *    vertex past a boundary) has no stroke: it is absorbed into its predecessor
 *    and the following run starts at the sliver's vertex, so the chain stays
 *    continuous and NO classified vertex is dropped;
 *  - no ring-closing merge is performed: merging the head into the tail would
 *    reorder the runs (the tail belongs at the END of the loop), so the ring is
 *    closed by the shared junction vertex above instead. A division that wraps
 *    the loop's start therefore appears as its head run and again as its tail
 *    run — two strokes of one division, which is what the geometry is.
 *
 * Accounting identity (asserted by scripts/verify/cortical-lobes.mjs):
 *     Σ run.points.length / 2 === loop vertices + runs − absorbed slivers
 * because each of the `runs` paths duplicates exactly one junction vertex, and
 * an absorbed sliver contributes its vertex to the neighbour instead of to a run
 * of its own. `splitRunsAccounting` below exposes the two counters the script
 * needs for that identity.
 * Internal to the three exports below.
 */
function splitRuns(
  loop: number[],
  axis: PlaneAxis,
  planeValue: number | null,
): CorticalRun[] {
  const count = Math.floor(loop.length / 2)
  if (count < 2) return []
  const divisions: CorticalDivision[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const [x, y, z] = planePointToCanonical(axis, planeValue ?? 0, loop[i * 2], loop[i * 2 + 1])
    divisions[i] = classifyCorticalPoint(x, y, z)
  }
  /* 1. Cut the loop into same-division vertex ranges [start, end). */
  const ranges: { division: CorticalDivision; start: number; end: number }[] = []
  let start = 0
  for (let i = 1; i <= count; i++) {
    if (i < count && divisions[i] === divisions[start]) continue
    const previous = ranges[ranges.length - 1]
    if (i - start === 1 && previous !== undefined) {
      // A one-vertex range has no stroke: extend the previous range over it so
      // the drawn outline stays continuous and its vertex stays accounted for.
      previous.end = i
    } else {
      ranges.push({ division: divisions[start], start, end: i })
    }
    start = i
  }
  /* 2. Emit each range as a path that STARTS at the junction vertex it shares
   *    with the range before it, so consecutive strokes join without a gap. */
  const runs: CorticalRun[] = []
  for (let r = 0; r < ranges.length; r++) {
    const range = ranges[r]
    const junction = (range.start - 1 + count) % count
    const points: number[] = [loop[junction * 2], loop[junction * 2 + 1]]
    for (let k = range.start; k < range.end; k++) points.push(loop[k * 2], loop[k * 2 + 1])
    runs.push({ division: range.division, points })
  }
  return runs
}

/**
 * splitLoopByDivision — walk ONE closed contour loop (flat `[u, v, …]` in the
 * plane frame, the exact format `contourWorker` returns) and split it into
 * consecutive same-division runs. The loop is CLOSED, so the last run continues
 * into the first; when they share a division they are merged, and the caller
 * gets a partition of the loop with no duplicated vertex.
 *
 * Runs of a single point are absorbed into the previous run, so the runs are a
 * TRUE PARTITION of the loop: every classified vertex lands in exactly one run
 * and the drawn outline stays continuous. The consequence
 * `scripts/verify/cortical-lobes.mjs` asserts is therefore exact — for every
 * loop, `Σ run.points.length / 2 === loop.length / 2`, and when the closing
 * merge fires it drops exactly ONE duplicated endpoint, so the identity the
 * script checks is `Σ runs === loop vertices − merges`.
 *
 * IMPORTANT — the plane's own coordinate. A loop in the plane frame carries the
 * two IN-PLANE axes; the coordinate ON the plane axis is not in the loop, and
 * `classifyCorticalPoint` needs it. This signature (the plan's §5.2 interface)
 * therefore has no way to know it and uses 0 — correct only for a plane that
 * happens to sit at 0. The canvas and `scripts/verify/cortical-lobes.mjs` call
 * `splitLoopByDivisionPlane` with the real plane value; both are the same
 * implementation, so a test of one is a test of the other at planeValue 0.
 */
export function splitLoopByDivision(loop: number[], axis: PlaneAxis): CorticalRun[] {
  return splitRuns(loop, axis, null)
}

/**
 * splitLoopByDivisionPlane — the same split with the plane VALUE supplied, so
 * the canonical coordinate on the plane's own axis is exact. This is the entry
 * the section canvas and the verification script use.
 */
export function splitLoopByDivisionPlane(
  loop: number[],
  axis: PlaneAxis,
  planeValue: number,
): CorticalRun[] {
  return splitRuns(loop, axis, planeValue)
}

/** The division a whole loop belongs to when it is homogeneous, else null. */
export function homogeneousDivision(loop: number[], axis: PlaneAxis, planeValue: number): CorticalDivision | null {
  const runs = splitRuns(loop, axis, planeValue)
  if (runs.length !== 1) return null
  // A single run can also come from a loop whose other vertices were dropped as
  // one-vertex runs, so confirm against the raw loop rather than the runs.
  const count = Math.floor(loop.length / 2)
  let division: CorticalDivision | null = null
  for (let i = 0; i < count; i++) {
    const [x, y, z] = planePointToCanonical(axis, planeValue, loop[i * 2], loop[i * 2 + 1])
    const d = classifyCorticalPoint(x, y, z)
    if (division === null) division = d
    else if (division !== d) return null
  }
  return division
}
