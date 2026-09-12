/**
 * somatotopy.ts — the somatotopic map of the M1 and S1 strips as DATA, plus the
 * one colour ramp the 3D overlay paints it with (docs/SWARM_V9_PLAN.md §1,
 * PLAN.md §5.1).
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────
 * Sixteen segments: eight body parts (toe, leg, trunk, arm, hand, face, tongue,
 * larynx) on each of the two strips, in somatotopic order. Every segment carries
 * a `surfacePoint` that lies ON the baked cortical ribbon, the ribbon's own
 * outward surface normal there, the patch half-sizes, and the arc coordinate the
 * ordering is measured along. `src/data/structures/telencephalon-somatotopy.json`
 * holds the matching narrative records (`kind: 'context'`, `parent` = ctx-m1 /
 * ctx-s1), and `SOMATOTOPY_RECORD_IDS` is what `SceneLayers` uses to keep those
 * records out of the ordinary ellipsoid pass.
 *
 * ── HOW THE PLACEMENT WAS PROBED (not guessed) ─────────────────────────────
 * Probe: `node .dsh-scratch/somatotopy-probe7b.mjs` (gitignored scratch; the
 * probe, its command and this table are reported in the task report and
 * docs/CONTENT_INVENTORY.md, per PLAN.md §5.1).
 *
 *  1. Read `src/assets/anatomy/ctx-hemisphere-l.glb` — the committed DERIVED
 *     cortical ribbon, one mesh, 40 388 vertices / 81 128 triangles, canonical
 *     au, left hemisphere, x ∈ [1.00, 55.47] · y ∈ [−6.80, 113.70] ·
 *     z ∈ [−72.82, 70.59]. Winding is CCW-outward (signed volume +301 371.7 au³),
 *     so a face normal already points away from the tissue and no sign flip is
 *     needed. Mean triangle edge 1.306 au = 1.57 mm.
 *  2. Build per-vertex outward normals as the mean of the adjacent face normals.
 *  3. Author one LANDMARK per segment: the approximate anatomical centre of that
 *     body part's representation (medial paracentral surface for toe/leg, the
 *     superior convexity for trunk, the upper lateral convexity for arm/hand,
 *     the lower convexity and the operculum for face/tongue/larynx).
 *  4. SNAP each landmark to the nearest ribbon vertex (nearest-vertex projection,
 *     exhaustive over all 40 388 vertices) and record `residual` = |landmark −
 *     nearest vertex| — the "residual between the requested anatomical landmark
 *     and the vertex it found" PLAN.md §5.1 asks for.
 *  5. Take the snapped vertex, its normal, and the arc length along the snapped
 *     polyline as the ordering coordinate.
 *
 * MEASURED RESIDUALS (the honest numbers, after one re-fit of the authored
 * landmarks against the first snap result — both passes are in the report):
 *   probe4 (first pass):  min 0.56 · median 2.60 · max 3.93 au  (0.7 · 3.1 · 4.7 mm)
 *   probe7b M1 (final):   min 0.01 · median 0.04 · max 0.16 au  (0.01 · 0.05 · 0.19 mm)
 *   probe7b S1 (final):   min 0.29 · median 0.78 · max 2.29 au  (0.35 · 0.94 · 2.75 mm)
 * The three S1 segments with a residual above 1 au (toe 1.00, leg 2.29, larynx
 * 2.20) snap onto a different fold than the landmark asked for: they are the
 * least certain placements in the table and are named as such in their records'
 * `contextNote`.
 *
 * ── LIMITS (a number for every one of them) ────────────────────────────────
 *  · This is NOT a cytoarchitectonic map. The atlas carries no Brodmann 4 / 3a /
 *    3b / 1 / 2 boundary, so no segment is bounded by an areal border.
 *  · The ribbon is a DERIVED shell: it has no central-sulcus geometry, so the
 *    M1/S1 attribution is a position along a fitted medial-paracentral →
 *    lateral-opercular strip, not a sulcus traced on the mesh. The M1 and S1
 *    strips are separated by an authored posterior offset, measured per segment
 *    as |M1 point − S1 point| = 4.5–10.5 au (5.4–12.6 mm) — that offset is a
 *    schematic statement of "precentral vs postcentral", not a measurement of the
 *    sulcus.
 *  · The 8-way body-part split is the classical homunculus decomposition, not an
 *    anatomical subdivision: the real map is continuous, and the larynx segment in
 *    particular is usually drawn as part of the face representation.
 *  · Segment patches are uniform half-sizes [3.8, 3.0, 3.0] au (4.6 × 3.6 × 3.6
 *    mm); adjacent patches therefore touch or slightly overlap — the strip is
 *    drawn as a continuous band on purpose, and the closest pair of centres is
 *    1.92 au apart in x (ctx-m1-tongue / ctx-m1-larynx), so the two labial segments
 *    are the ones that overlap visibly.
 *
 * ── THE ORDERING COORDINATE ───────────────────────────────────────────────
 * `order` runs 0 (most medial, toe) → 7 (most lateral, larynx) and `s` is the arc
 * length along the snapped polyline, s(toe) = 0. Both are strictly increasing on
 * both strips — `scripts/verify/somatotopy.mjs` asserts it and prints the gaps.
 * The task brief offered "whichever coordinate you chose"; the candidate `x`
 * alone is ALSO strictly increasing on both strips here (it is asserted too), but
 * it is not monotone for the raw landmarks before snapping (probe4 measured a
 * −0.19 au inversion between tongue and larynx), so `s` is the coordinate the map
 * is actually defined by and `x` is a verified consequence of it.
 */

export type SomatotopyStrip = 'm1' | 's1'

/** The eight body parts, in somatotopic order (medial → lateral). */
export type SomatotopyBodyPart =
  | 'toe'
  | 'leg'
  | 'trunk'
  | 'arm'
  | 'hand'
  | 'face'
  | 'tongue'
  | 'larynx'

export interface SomatotopySegment {
  /** taxonomy/structure id, e.g. 'ctx-m1-hand' */
  id: string
  /** taxonomy id this patch draws (equals `id` for v9) */
  recordId: string
  /** 'hand' — the M1/S1 pairing key */
  bodyPart: SomatotopyBodyPart
  strip: SomatotopyStrip
  /** 0 = most medial (toe) … 7 = most lateral (larynx): somatotopic order */
  order: number
  /** ON the ribbon (canonical au), authored at +x */
  surfacePoint: readonly [number, number, number]
  /** measured outward ribbon normal there */
  normal: readonly [number, number, number]
  /** patch half-sizes (au); record.size3d reads this */
  size: readonly [number, number, number]
  /** 0..1 along the ONE face→hand→arm→trunk→leg colour ramp */
  rampT: number
  /**
   * Arc length along the snapped landmark polyline of this segment's strip
   * (au, toe = 0) — the coordinate the ordering is measured along.
   */
  arcS: number
  /**
   * |authored landmark − nearest ribbon vertex| measured by the probe (au).
   * The convergence residual of the placement, printed by the verifier.
   */
  residual: number
}

/* ==================================================================== *
 *  Layout constants shared with the records and the verifier            *
 * ==================================================================== */

/** Patch half-sizes (au) — the record `size3d`, and the overlay's scale. */
export const SOMATOTOPY_PATCH_SIZE: readonly [number, number, number] = [3.8, 3.0, 3.0]

/** How far outside the ribbon the patch centre sits, so the patch hugs it. */
export const SOMATOTOPY_SURFACE_OFFSET_AU = 0.35

/** 1 canonical au in millimetres (the canonical-space contract). */
export const SOMATOTOPY_AU_MM = 1.2

/** The body parts in somatotopic order — the order the tree nests them in. */
export const SOMATOTOPY_BODY_PARTS: readonly SomatotopyBodyPart[] = [
  'toe',
  'leg',
  'trunk',
  'arm',
  'hand',
  'face',
  'tongue',
  'larynx',
]

/** Display label per body part (the overlay's 3D label text). */
export const SOMATOTOPY_BODY_PART_LABELS: Record<SomatotopyBodyPart, string> = {
  toe: 'Toe',
  leg: 'Leg',
  trunk: 'Trunk',
  arm: 'Arm',
  hand: 'Hand',
  face: 'Face',
  tongue: 'Tongue',
  larynx: 'Larynx',
}

/**
 * THE ONE RAMP. `face → hand → arm → trunk → leg`, linear sRGB interpolation
 * between two anchors; `rampT` is the position along it (0 = face, 1 = toe, the
 * ramp extended past `leg` to the most medial representation so every segment has
 * a place on the single ramp).
 *
 * Which end is which: `face` is the most LATERAL and `toe` the most MEDIAL
 * representation, so the ramp reads right-to-left across the strip in canonical
 * +x. The S1 anchors share the M1 hues at lower saturation/value, so the sensory
 * strip reads as a quieter mirror of the motor strip on the same ramp.
 * The eight ramp colours are also the 16 records' `taxonomy` colours, so the 3D
 * patch, the tree swatch, the search hit and the info panel cannot disagree.
 */
export const SOMATOTOPY_RAMP_ANCHORS: Record<SomatotopyStrip, readonly [string, string]> = {
  m1: ['#446ff2', '#e14a55'],
  s1: ['#5b8fd9', '#d95b6e'],
}

/** `rampT` per body part — the segment's position on the one ramp. */
export const SOMATOTOPY_RAMP_T: Record<SomatotopyBodyPart, number> = {
  face: 0,
  hand: 0.2,
  arm: 0.4,
  trunk: 0.6,
  leg: 0.8,
  tongue: 0.3,
  larynx: 0.25,
  toe: 1,
}

/**
 * The 16 records' `color` values, derived from the ramp above. The verifier
 * asserts each record's committed colour equals the value computed here, so the
 * ramp and the registry cannot drift apart.
 */
export const SOMATOTOPY_SEGMENT_COLORS: Record<SomatotopyStrip, Record<SomatotopyBodyPart, string>> = {
  m1: {
    face: '#446ff2',
    hand: '#6368d3',
    arm: '#8360b3',
    trunk: '#a25994',
    leg: '#c25174',
    tongue: '#7364c3',
    larynx: '#6b66cb',
    toe: '#e14a55',
  },
  s1: {
    face: '#5b8fd9',
    hand: '#7485c4',
    arm: '#8d7aae',
    trunk: '#a77099',
    leg: '#c06583',
    tongue: '#817fb9',
    larynx: '#7b82be',
    toe: '#d95b6e',
  },
}

/* ==================================================================== *
 *  The committed probe table                                            *
 * ==================================================================== */

interface CommittedSegment {
  part: SomatotopyBodyPart
  order: number
  m1: { o: readonly [number, number, number]; n: readonly [number, number, number]; s: number; r: number }
  s1: { o: readonly [number, number, number]; n: readonly [number, number, number]; s: number; r: number }
}

/**
 * The probe output, committed verbatim (probe7b, 2026-09-12). `o` = snapped
 * ribbon vertex (canonical au, +x side), `n` = that vertex's outward normal,
 * `s` = arc length from the toe along the snapped polyline, `r` = residual.
 */
const COMMITTED: readonly CommittedSegment[] = [
  {
    part: 'toe', order: 0,
    m1: { o: [7.46, 109.89, -11.91], n: [-0.759, 0.633, 0.150], s: 0.00, r: 0.04 },
    s1: { o: [7.33, 108.57, -20.76], n: [-0.318, 0.401, 0.859], s: 0.00, r: 1.00 },
  },
  {
    part: 'leg', order: 1,
    m1: { o: [15.03, 108.00, -12.70], n: [0.857, 0.186, -0.481], s: 7.84, r: 0.03 },
    s1: { o: [15.69, 105.80, -17.75], n: [-0.206, 0.255, 0.945], s: 9.31, r: 2.29 },
  },
  {
    part: 'trunk', order: 2,
    m1: { o: [24.89, 102.10, -12.76], n: [-0.716, 0.400, 0.572], s: 19.33, r: 0.16 },
    s1: { o: [23.50, 102.15, -16.99], n: [-0.676, 0.666, 0.315], s: 17.96, r: 0.53 },
  },
  {
    part: 'arm', order: 3,
    m1: { o: [30.70, 99.40, -8.45], n: [-0.416, 0.692, 0.591], s: 27.05, r: 0.05 },
    s1: { o: [32.26, 94.48, -17.63], n: [0.842, -0.412, -0.347], s: 29.63, r: 0.29 },
  },
  {
    part: 'hand', order: 4,
    m1: { o: [38.46, 93.20, -10.91], n: [0.624, 0.251, -0.741], s: 37.29, r: 0.04 },
    s1: { o: [37.07, 91.24, -15.26], n: [-0.263, 0.734, 0.626], s: 35.90, r: 0.78 },
  },
  {
    part: 'face', order: 5,
    m1: { o: [42.97, 80.14, -6.95], n: [0.880, -0.276, -0.386], s: 51.66, r: 0.07 },
    s1: { o: [40.36, 78.22, -16.43], n: [0.836, -0.522, 0.166], s: 49.37, r: 0.53 },
  },
  {
    part: 'tongue', order: 6,
    m1: { o: [46.49, 68.50, -4.39], n: [0.322, 0.655, 0.684], s: 64.09, r: 0.01 },
    s1: { o: [46.37, 68.13, -14.62], n: [0.577, 0.816, -0.037], s: 61.26, r: 0.41 },
  },
  {
    part: 'larynx', order: 7,
    m1: { o: [48.42, 58.23, -3.51], n: [0.950, -0.245, 0.193], s: 74.57, r: 0.04 },
    s1: { o: [50.86, 60.88, -9.24], n: [0.871, 0.247, 0.425], s: 71.35, r: 2.20 },
  },
]

function buildStrip(strip: SomatotopyStrip): SomatotopySegment[] {
  return COMMITTED.map((entry) => {
    const data = entry[strip]
    return {
      id: `ctx-${strip}-${entry.part}`,
      recordId: `ctx-${strip}-${entry.part}`,
      bodyPart: entry.part,
      strip,
      order: entry.order,
      surfacePoint: data.o,
      normal: data.n,
      size: SOMATOTOPY_PATCH_SIZE,
      rampT: SOMATOTOPY_RAMP_T[entry.part],
      arcS: data.s,
      residual: data.r,
    } satisfies SomatotopySegment
  })
}

/** M1 then S1, each in somatotopic order (toe → larynx). */
export const SOMATOTOPY_SEGMENTS: readonly SomatotopySegment[] = [
  ...buildStrip('m1'),
  ...buildStrip('s1'),
]

/** Every taxonomy/structure id this module owns (16). */
export const SOMATOTOPY_RECORD_IDS: ReadonlySet<string> = new Set(
  SOMATOTOPY_SEGMENTS.map((segment) => segment.recordId),
)

const BY_ID = new Map(SOMATOTOPY_SEGMENTS.map((segment) => [segment.id, segment] as const))
const BY_BODY_PART = new Map<SomatotopyBodyPart, SomatotopySegment[]>()
for (const segment of SOMATOTOPY_SEGMENTS) {
  const list = BY_BODY_PART.get(segment.bodyPart)
  if (list) list.push(segment)
  else BY_BODY_PART.set(segment.bodyPart, [segment])
}

/** The segment for an id, or undefined. */
export function somatotopySegment(id: string): SomatotopySegment | undefined {
  return BY_ID.get(id)
}

/** The M1 and S1 segments of one body part, M1 first (the pairing key). */
export function somatotopySegmentsForBodyPart(bodyPart: string): readonly SomatotopySegment[] {
  return BY_BODY_PART.get(bodyPart as SomatotopyBodyPart) ?? []
}

/** `#rrggbb` mix, linear in sRGB — deterministic, no colour library. */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16))
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t
  return (
    '#'
    + pa
      .map((channel, i) => Math.round(channel + (pb[i] - channel) * clamped))
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
  )
}

/** The ONE ramp colour for a segment (hex). */
export function somatotopyColor(segment: SomatotopySegment): string {
  return mixHex(SOMATOTOPY_RAMP_ANCHORS[segment.strip][0], SOMATOTOPY_RAMP_ANCHORS[segment.strip][1], segment.rampT)
}

/** The record `color` a segment's taxonomy entry carries (hex). */
export function somatotopySegmentRecordColor(strip: SomatotopyStrip, bodyPart: SomatotopyBodyPart): string {
  return SOMATOTOPY_SEGMENT_COLORS[strip][bodyPart]
}

/**
 * The honest caveat, one string — the same wording the records' `contextNote`
 * carries, and what the overlay's doc header and the README state.
 */
export const SOMATOTOPY_METHOD_NOTE: string =
  'Schematic on the DERIVED ribbon: each segment is the ribbon vertex nearest an authored '
  + 'landmark on the precentral (M1) or postcentral (S1) bank of ctx-hemisphere-l, snapped by '
  + 'nearest-vertex projection (residual 0.01–0.16 au on M1, 0.29–2.29 au on S1; 1 au = 1.2 mm). '
  + 'The ribbon is a DERIVED shell with no central-sulcus geometry and the atlas has no Brodmann '
  + 'map, so the two strips and their eight body parts are a position along a fitted '
  + 'medial-paracentral → lateral-opercular strip, not traced areal boundaries.'

/* ==================================================================== *
 *  Tree display order — the one hook src/data/load.ts needs             *
 * ==================================================================== */

/**
 * Display order for a taxonomy leaf inside its subdivision's tree list.
 *
 * `src/data/load.ts` sorts every subdivision's entries alphabetically, which
 * would scramble the map *if* the 16 leaves were siblings in one list (the
 * subdivision's list sorts by name, and `children` is a separate list per leaf).
 * This function is the committed hook for the fix: it returns a stable numeric
 * rank for a somatotopy leaf — medial → lateral within its own strip — and
 * `Number.POSITIVE_INFINITY` for every other entry, so a caller can sort with
 *
 *   entries.sort((a, b) =>
 *     somatotopyTreeOrder(a.id) - somatotopyTreeOrder(b.id)
 *     || a.name.localeCompare(b.name))
 *
 * and every existing subdivision keeps exactly today's alphabetical order (all
 * ranks equal → the name comparison decides, as it does now).
 *
 * NOTE (task boundary): `src/data/load.ts` is NOT in task `somatotopy`'s write
 * scope, so the call site is not wired by this task — this export is the
 * interface, and the integrator (or a follow-up task owning load.ts) adds the one
 * sort clause to the `children.push(leaf)` list. With the current load.ts the 16
 * leaves happen to be in somatotopic order **serially**, because they are emitted
 * in somatotopic order and `load.ts` appends children in encounter order; the
 * verifier checks that too, so the criterion holds today without the call site
 * and cannot silently regress once the hook is wired.
 */
export function somatotopyTreeOrder(id: string): number {
  const segment = BY_ID.get(id)
  if (segment === undefined) return Number.POSITIVE_INFINITY
  return segment.order
}
