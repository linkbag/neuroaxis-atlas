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
 * v10 RUN RULE (the sliver/triangle fix; docs/SWARM_V10_PLAN.md §4, PLAN.md §4)
 * --------------------------------------------------------------------------
 * A *run* is a maximal stretch of ONE loop carrying ONE classification. Painting
 * a short stretch — or a long thin one — is what put a green LIMBIC patch at
 * the inferior midline and an orange TEMPORAL triangle on the lateral edge: the
 * fitted boundaries cross the ribbon at a shallow angle there, so a run can be
 * 2 vertices long, or 60 vertices long and still enclose 3.5 au².
 *
 *   MIN_DIVISION_RUN_AU         = 10   own-vertex ARC LENGTH floor, au (= 12 mm)
 *   MIN_DIVISION_AREA_AU2       = 25   DRAWN-area floor, au² — the polygon the
 *                                      canvas actually fills and strokes
 *   MIN_DIVISION_LABEL_AREA_AU2 = 25   the area a division must clear to carry
 *                                      a label; DELIBERATELY equal to the paint
 *                                      floor, so "painted ⇒ has a label-eligible
 *                                      run" is a theorem (paint ≥ label), not a
 *                                      census. The gate asserts the inequality.
 *
 * A run below EITHER floor is ABSORBED into the neighbour it was cut from (or,
 * for the first span of the ring, deferred into the next one), so the spans
 * still tile the loop exactly once and no vertex is dropped. The splitter
 * iterates to a FIXPOINT: absorption changes the drawn polygon of the span that
 * grew, and a single pass can therefore leave a new sub-threshold span behind.
 *
 * WHY 10 au of arc. Measured (`.dsh-scratch/v10-arch/runs-probe.mjs`): run arc
 * medians are 25.98 (temporal) / 30.30 (frontal) / 45.17 (occipital) au and the
 * artefact population sits at 0.00–9.99 au, so 10 au (12 mm) is narrower than
 * one gyrus on this ribbon — nothing a reader would name is lost.
 *
 * WHY 25 au² of DRAWN area, and not the 10 au² PLAN.md §4 first proposed. The
 * wedge probe (`.dsh-scratch/v10-arch/wedge-probe.mjs`) showed the worst
 * artefact is not short at all: y = 32 temporal is 65.5 au of arc for 5.50 au²
 * of drawn area. A 10 au² floor removes those, but it still leaves divisions
 * painted whose best run is 11–24 au² — measured on this build (probe
 * `.dsh-scratch/v10-cdq/probe.mjs`): 2 plane/division cases at the 13 reference
 * planes plus 9 over the 34-plane user grid. That is the small-patch class the
 * user reported, and with a 25 au² label floor those cases would be painted but
 * unlabelled. Both floors are therefore 25 au².
 *
 * MEASURED EFFECT of this rule (`.dsh-scratch/v10-cdq/probe.mjs`, reference
 * planes / the 34-plane user grid, this build): 80 → 47 runs and 548 → 265 runs;
 * 22 / 199 spans absorbed; 3 / 33 whole loops dropped as sub-threshold; 0 painted
 * runs below either floor; 0 painted division without a label-eligible run. A
 * whole loop that is ONE division stretch below the floors has no neighbour to
 * absorb into, so it is not painted at all and stays in the context fill: every
 * such loop measured has a drawn area ≤ 23.87 au² (< the 25 au² floor), vertex
 * count 3–14 and arc 0.60–18.51 au, i.e. a splinter of the cross-section, not a
 * territory. The pre-v10 splitter painted runs of a single own vertex (arc
 * 0.00 au, stroke invisible) — 9 of them over the 34-plane user grid, 0 at the
 * 13 reference planes — because its one-vertex absorption could not fire on the
 * FIRST range of a loop.
 *
 * NOTHING IN `CORTICAL_BOUNDARIES` MOVED (v10, re-checked, not re-fitted). The
 * fit is not the cause of the wedges: each one is a fitted boundary crossing the
 * ribbon at a shallow angle, and re-fitting the same semi-plane/ellipsoid/plane
 * primitives cannot remove the resulting 2–4 vertex stretches. The evidence is
 * in the gate: with the classification untouched, 23 of the 72 maximal spans at
 * the 13 reference planes (210 of 497 over the user grid) are below a floor, and
 * absorbing exactly those leaves 47 runs that all clear it. The 17 boundary spot
 * checks in `scripts/verify/cortical-lobes.mjs` still pin the same divisions at
 * the same coordinates, to exact float equality.
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
 *  5. A whole loop that is ONE sub-threshold stretch is not painted (v10 run
 *     rule): the layer paints territories, not splinters. Its vertices stay in
 *     the taxonomy context fill, so a plane where the ribbon is cut into a
 *     12 au² fragment shows that fragment uncoloured — measured, 3 of the 13
 *     reference planes and 33 of 34 user-grid planes have such a fragment.
 *  6. Absorption re-labels the absorbed stretch with the NEIGHBOUR's division.
 *     Where a boundary crosses the ribbon at a shallow angle the colour is
 *     therefore the neighbour's along 10–25 au of contour, which is the same
 *     approximation the fitted boundaries already make, stated rather than
 *     hidden.
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

/* ------------------------------------------------------ v10 run-quality floors */

/**
 * Minimum ARC LENGTH of a run's own vertices, in au (1 au = 1.2 mm), for the run
 * to be painted at all. 10 au = 12 mm, narrower than one gyrus on this ribbon
 * (run arc medians measured: 25.98 temporal / 30.30 frontal / 45.17 occipital);
 * the whole sliver population the v10 report measured sits at 0.00–9.99 au.
 */
export const MIN_DIVISION_RUN_AU = 10

/**
 * Minimum DRAWN AREA of a run, in au² — the shoelace area of the polygon the
 * canvas fills and strokes (`run.points`, closed: the shared junction vertex
 * plus the run's own vertices). This is the floor that removes the long thin
 * wedges: y = 32 temporal is 65.5 au of arc and only 5.50 au² of area, so an
 * arc floor alone cannot see it. PLAN.md §4 first proposed 10 au² here; the
 * measurement that moved it to 25 is in the file header (v10 run rule).
 */
export const MIN_DIVISION_AREA_AU2 = 25

/**
 * Minimum drawn area (au²) for a division to carry its name in the section.
 * DELIBERATELY EQUAL to `MIN_DIVISION_AREA_AU2`: because every painted run
 * clears the paint floor, "this division is painted ⇒ it has a run at or above
 * the label floor" is then a theorem rather than a hope, which is exactly what
 * makes "TEMPORAL written on a triangle" impossible. The gate asserts the
 * inequality, so changing one number alone cannot silently break it.
 */
export const MIN_DIVISION_LABEL_AREA_AU2 = 25

/** A loop with fewer vertices than this cannot carry a polygon at all. */
const MIN_LOOP_VERTICES = 3

/** Measured quality of ONE run path — the numbers the floors are applied to. */
export interface CorticalRunMetrics {
  /**
   * Arc length (au) of the run's OWN vertices — the shared junction vertex is
   * excluded, so this is the stretch the run contributes, not its neighbour's
   * last segment. A run of one own vertex has arc 0 (the pre-v10 degenerate
   * "run" was exactly that: an invisible stroke).
   */
  arcAu: number
  /** Shoelace area (au²) of the drawn path (junction + own vertices, closed). */
  areaAu2: number
  /** Own vertices (`points.length / 2 − 1`). */
  vertices: number
}

/**
 * corticalRunMetrics — the ONE measurement of a run path, exported so the
 * splitter's own floors and `scripts/verify/cortical-lobes.mjs` cannot disagree
 * about what "too short" or "too thin" means. Pure, allocation-free.
 */
export function corticalRunMetrics(points: readonly number[]): CorticalRunMetrics {
  const count = Math.floor(points.length / 2)
  let arcAu = 0
  for (let i = 2; i < count; i++) {
    arcAu += Math.hypot(
      points[i * 2] - points[(i - 1) * 2],
      points[i * 2 + 1] - points[(i - 1) * 2 + 1],
    )
  }
  let areaAu2 = 0
  if (count >= 3) {
    let sum = 0
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count
      sum += points[i * 2] * points[j * 2 + 1] - points[j * 2] * points[i * 2 + 1]
    }
    areaAu2 = Math.abs(sum) / 2
  }
  return { arcAu, areaAu2, vertices: Math.max(0, count - 1) }
}

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

/** One maximal same-division stretch of the loop, in ROTATED local indices. */
interface RunSpan {
  division: CorticalDivision
  /** First own vertex (local index). */
  start: number
  /** One past the last own vertex (local index). */
  end: number
}

/**
 * splitRuns — the shared splitter (v10: with the run-quality floors).
 *
 * 1. Classify every vertex of ONE closed loop and cut it into MAXIMAL
 *    same-division spans. The ring is rotated to start at a division change
 *    first, so the loop's head and tail are never the same division: a stretch
 *    that crosses the loop's start index is one span, not two half-stretches
 *    that both look too short.
 * 2. Absorb every span below the floors (`corticalRunMetrics`: arc <
 *    MIN_DIVISION_RUN_AU, drawn area < MIN_DIVISION_AREA_AU2, or fewer than two
 *    own vertices) into the neighbour it was cut from — the predecessor, or the
 *    successor when the span opens the ring. Absorption only ever MERGES two
 *    adjacent spans, so the kept spans still tile the loop exactly once and no
 *    vertex is lost or moved off the contour.
 * 3. Iterate to a FIXPOINT, merging spans that absorption made adjacent and
 *    same-division, and re-measuring after each merge: the drawn polygon of a
 *    span changes when its boundaries move (the closing chord changes), so one
 *    pass can leave a fresh sub-threshold span behind. Every merge removes one
 *    span, so `spans.length + 1` passes are provably enough.
 * 4. A loop that reduces to ONE span which is still below the floors is
 *    DROPPED (no run at all): it is a single homogeneous stretch with no
 *    neighbour to absorb into, i.e. a splinter of the cross-section rather than
 *    a territory. It keeps its taxonomy context fill; the gate counts every
 *    dropped loop and asserts it really is sub-threshold.
 * 5. Emit each kept span as a strokeable, CONTINUOUS path: a run starts at the
 *    vertex before its own first vertex (the junction it shares with the run
 *    before it) and continues through its own vertices in loop order, so
 *    consecutive runs join without a gap and the ring closes.
 *
 * Accounting identity (asserted by scripts/verify/cortical-lobes.mjs), per
 * PAINTED loop:  Σ run.points.length / 2 === loop vertices + runs,
 * because the spans partition the loop's vertices exactly once and each run
 * path duplicates exactly one junction vertex.
 */
function splitRuns(
  loop: number[],
  axis: PlaneAxis,
  planeValue: number | null,
): CorticalRun[] {
  const count = Math.floor(loop.length / 2)
  if (count < MIN_LOOP_VERTICES) return []
  const divisions: CorticalDivision[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const [x, y, z] = planePointToCanonical(axis, planeValue ?? 0, loop[i * 2], loop[i * 2 + 1])
    divisions[i] = classifyCorticalPoint(x, y, z)
  }
  /* 1. Rotate the ring to a division change, then cut maximal spans. */
  let offset = 0
  for (let i = 1; i < count; i++) {
    if (divisions[i] !== divisions[i - 1]) {
      offset = i
      break
    }
  }
  /** Loop index of rotated local index `t` (t = −1 is the vertex before t = 0). */
  const rot = (t: number): number => (offset + t + count) % count
  const spans: RunSpan[] = []
  let start = 0
  for (let t = 1; t < count; t++) {
    const previous = divisions[rot(t - 1)]
    if (divisions[rot(t)] !== previous) {
      spans.push({ division: previous, start, end: t })
      start = t
    }
  }
  spans.push({ division: divisions[rot(count - 1)], start, end: count })
  /** The path the canvas paints for a span: junction + own vertices. */
  const spanPath = (span: RunSpan): number[] => {
    const junction = rot(span.start - 1)
    const points: number[] = [loop[junction * 2], loop[junction * 2 + 1]]
    for (let t = span.start; t < span.end; t++) {
      const i = rot(t)
      points.push(loop[i * 2], loop[i * 2 + 1])
    }
    return points
  }
  const undersized = (span: RunSpan): boolean => {
    const metrics = corticalRunMetrics(spanPath(span))
    return (
      metrics.vertices < 2 ||
      metrics.arcAu < MIN_DIVISION_RUN_AU ||
      metrics.areaAu2 < MIN_DIVISION_AREA_AU2
    )
  }
  /* 2 + 3. Absorb to a fixpoint. */
  const maxPasses = spans.length + 1
  for (let pass = 0; pass < maxPasses; pass++) {
    for (let k = 1; k < spans.length; ) {
      if (spans[k].division === spans[k - 1].division) {
        // Absorption can make two spans of one division adjacent: paint them as
        // ONE run, else a boundary stroke would be drawn inside a division.
        spans[k - 1].end = spans[k].end
        spans.splice(k, 1)
      } else {
        k += 1
      }
    }
    let victim = -1
    for (let k = 0; k < spans.length; k++) {
      if (undersized(spans[k])) {
        victim = k
        break
      }
    }
    if (victim < 0) break
    /* 4. One span left and still too small: nothing to absorb into. */
    if (spans.length === 1) return []
    if (victim === 0) {
      // The span that opens the ring has no predecessor inside the loop: defer
      // it into the next span (the pre-v10 bug was to keep it as a "run").
      spans[1].start = spans[0].start
      spans.splice(0, 1)
    } else {
      spans[victim - 1].end = spans[victim].end
      spans.splice(victim, 1)
    }
  }
  /* 5. Emit. */
  return spans.map((span) => ({ division: span.division, points: spanPath(span) }))
}

/**
 * splitLoopByDivision — walk ONE closed contour loop (flat `[u, v, …]` in the
 * plane frame, the exact format `contourWorker` returns) and split it into
 * consecutive same-division runs that clear the v10 run-quality floors. The loop
 * is CLOSED, so it is rotated to begin at a division change before it is cut;
 * a division that wraps the original start index is therefore ONE run, not a
 * head/tail pair that each look too short.
 *
 * The kept spans tile the loop exactly once, so for every PAINTED loop the
 * accounting is exact: `Σ run.points.length / 2 === loop vertices + runs`
 * (each run path duplicates exactly one junction vertex). A loop that reduces to
 * a single sub-threshold span returns `[]` — see the v10 run rule in the header;
 * `scripts/verify/cortical-lobes.mjs` enumerates those loops and asserts each
 * one really is below the floors.
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

/**
 * The division a whole loop belongs to when it is homogeneous, else null.
 *
 * Derived from the RAW loop, not from the runs: since v10 a homogeneous loop
 * below the run-quality floors is painted as nothing, and whether the layer
 * paints it must not change what the geometry says the loop is.
 */
export function homogeneousDivision(loop: number[], axis: PlaneAxis, planeValue: number): CorticalDivision | null {
  const count = Math.floor(loop.length / 2)
  if (count < MIN_LOOP_VERTICES) return null
  let division: CorticalDivision | null = null
  for (let i = 0; i < count; i++) {
    const [x, y, z] = planePointToCanonical(axis, planeValue, loop[i * 2], loop[i * 2 + 1])
    const d = classifyCorticalPoint(x, y, z)
    if (division === null) division = d
    else if (division !== d) return null
  }
  return division
}
