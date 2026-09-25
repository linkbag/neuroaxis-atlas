/**
 * vasculature-courses.ts — THE vessel-course registry of NeuroAxis v17
 * (PLAN.md §5.1/§5.4, run "vasculature depth").
 *
 * ## What this module is
 *
 * The v14 run shipped the twelve cranial nerves as **traveling tracts**: a
 * `NerveCourseRecord` (a `TractRecord` superset) swept by `TractTube`'s
 * `tubeGeometryFor`, gated by the record's OWN registry `kind`, painted in the
 * live section through `sectionAssets`' procedural part registry, and kept out
 * of the ordinary ellipsoid pass by `hasNerveCourse`. v17 generalizes exactly
 * that route to ARTERIES: this module is the vessel half of the shared COURSE
 * route (`VesselCourseRecord` here; the sweep, the `registryPartFromGeometry`
 * section adapter and the `isTractVisible` gate are unchanged and shared), so a
 * course-bearing vessel renders as a procedural tube in 3D AND in the 2D
 * section, and stops rendering its schematic placement ellipsoid.
 *
 * ## Why the table lives here and not in `curves.ts`
 *
 * PLAN.md §5.1 puts `VesselCourseRecord` + `VESSEL_COURSES` in
 * `src/geometry/curves.ts`, beside `NERVE_COURSES`, and §7.1 argues against a
 * new file. The dispatch's exclusive write scopes put `curves.ts` in NO task's
 * list and this file in THIS task's list, so the table lives here and the two
 * modules stay one contract: the *shape* is the nerve shape (this interface is a
 * structural superset of `TractRecord`, exactly like `NerveCourseRecord`), the
 * *sweep* is the same exported `tubeGeometryFor`, and the *section adapter* is
 * the same `registryPartFromGeometry`. Nothing downstream can tell the two
 * families apart except the two fields that must differ — `region` and `kind`.
 *
 * ## Zero payload (the constraint that decided the architecture)
 *
 * The anatomy directory is 13.89 MiB of a hard 14 MiB cap (`npm run
 * verify:budget-report`: Σ parts[].file = 14,486,228 B = 13.82 MiB, headroom
 * 0.18 MiB). Baking the BP3D branch elements this run draws needs 0.3–1.4 MiB
 * even decimated, so it does not fit. A course costs **0 bytes on disk**: the
 * tube is swept in the browser from `waypoints` + `tubeRadius`.
 *
 * ## Two sources, one table — and BOTH body shapes a vessel course can have
 *
 * The AUTHORED course content of this run is the sibling task's file
 * `src/data/structures/vasculature-courses.json` (its exclusive write scope).
 * It is picked up here with `import.meta.glob` — the project's own
 * graceful-degradation pattern (`src/data/load.ts`: "a glob pattern that
 * matches nothing contributes zero records and every selector keeps working on
 * whatever data exists"). Each authored entry is a full `StructureRecord` whose
 * `vesselCourse` block carries the geometry; the merge is BY ID with the
 * authored record winning, so the authored content REPLACES the built-in
 * fallback rather than doubling it.
 *
 * A vessel course record comes in two shapes, and both must be suppressed or a
 * blob survives:
 *
 *  1. `VesselCourseRecord` — a record with a PATH (waypoints + radius): it draws
 *     its own procedural tube, mirrored when `paired`.
 *  2. `VesselCourseGroup` — a record that declares the `vesselCourse` block but
 *     has NO path of its own (the authored lateral/medial lenticulostriate GROUP
 *     records are exactly this): its body is its CHILD courses — the spray of
 *     perforators — so it draws no tube of its own and must NOT fall back to the
 *     schematic ellipsoid either. `hasVesselCourse(id)` is true for both shapes,
 *     which is what makes "one record, one body" hold for the whole family.
 *
 * ## Honesty (the run's anatomy rule)
 *
 * Every record carries its `basis` (`'bp3d-element'` = a committed BP3D element
 * backs the path, `'documented-course'` = authored from the documented anatomy
 * because the archive has no such element), its `anchorNote` (what stands
 * behind the path), its `elementIds` (the archive ids, or `[]`), and an explicit
 * `surface` (`null` when the vessel is intraparenchymal or has no committed
 * envelope — and then `surfaceNote`/`anchorNote` says why, greppable rather
 * than inferable). A course the sources do not support is not authored here.
 *
 * ## v18b — the blob that outlived v17, and one colour per family
 *
 * The v17 pass removed the two lenticulostriate ellipsoids and its gate has
 * printed `blobs 0` ever since, yet one crimson translucent sphere remained on
 * screen. A sweep of EVERY record the structure pass mounts, resolving each
 * declared `ANATOMY_RECORD_LINKS` slug against the manifest instead of merely
 * checking that the link exists, found exactly one such record in the atlas:
 * `vasc-posterior-medial-choroidal-artery`, whose two declared body slugs were
 * never registered or baked. It is now the third shape above — a record with a
 * body that never existed — and it is retired the same way as the other two: by
 * the measured course it owns in `BUILT_IN_VESSEL_COURSES`. The invariant the
 * sweep enforces: a record's body is a COMMITTED `LINKS` GLB **XOR** a course.
 *
 * The same pass closed the last 3D↔2D colour disagreement. The 2D section part
 * takes its colour from the taxonomy row (`sectionAssets.registryPartFromCourse`)
 * while the 3D tube takes it from this table, and the three built-in records used
 * to carry `#b91c1c` where their own registry row, their own structure record and
 * their 2D part all say `#991b1b`. One vessel family, one colour: every built-in
 * here now matches its taxonomy row, so the colour census over the merged table
 * reads 41/41 (it read 39/40 before).
 *
 * Canonical space (PLAN.md §1): x = +patient-LEFT, y = +superior, z = +anterior,
 * 1 au = 1.2 mm; CLIP_BOUNDS x[−58,58] y[−55,116] z[−76,72].
 */
import type { ClinicalItem, Region, Vec3 } from '../types'

/* ==================================================================== *
 *  The records
 * ==================================================================== */

/** How the authored path is grounded — printed by the gate, per record. */
export type VesselCourseBasis = 'bp3d-element' | 'documented-course'

/** The fields both shapes share — everything `hasVesselCourse` and the UI read. */
export interface VesselCourseHead {
  /** The `vasc-*` id of the vessel's StructureRecord — ONE record, two views. */
  id: string
  name: string
  /** Registry region — always 'vasculature'; the Areas row's Vasculature toggle. */
  region: Region
  /** Always 'vessel' — the Systems row's vessel button is keyed on this kind. */
  kind: 'vessel'
  /** The registry laterality, carried so the record is self-describing; the
   *  taxonomy lookup in `isPairedVessel` remains authoritative when it exists. */
  laterality: 'midline' | 'paired'
  /** The parent ARTERY record id (`vasc-*`), which must exist in the registry. */
  parent: string
  /** The committed envelope this course hugs; `null` = none, and then
   *  `surfaceNote`/`anchorNote` must state why (intraparenchymal, or none). */
  surface: string | null
  /** Why `surface` is null (or which envelope and with what residual). */
  surfaceNote?: string
  /** How the path is grounded. */
  basis: VesselCourseBasis
  /**
   * The BP3D element ids behind the path (`[]` when no archive element names
   * it). A `'documented-course'` path may still NAME a source-only element the
   * inventory maps to this record but that was never registered, meshed or
   * baked — `vasc-posterior-medial-choroidal-artery` is exactly that case — and
   * then `anchorNote` must state that no baked body is claimed for it.
   */
  elementIds: string[]
  /** What stands behind the path — the honesty statement, per vessel. */
  anchorNote: string
  /** The territory the vessel supplies (structure ids) — the v8 field. */
  territory: string[]
  /** The syndrome cards whose arterial territory this vessel IS — the v8 field. */
  supply: string[]
  color: string
  levels?: string[]
  synonyms?: string[]
  clinical: ClinicalItem[]
  refs: string[]
}

/**
 * One artery as a COURSE — the vessel half of the shared course route.
 *
 * A structural superset of `TractRecord` (see `src/types.ts`): every field
 * `TractTube` and `tubeGeometryFor` read (`id`, `waypoints`, `tubeRadius`,
 * `color`, `direction`) is here with the same meaning, so the 3D pass mounts
 * the SAME component for a vessel course as for a tract, and `direction` cannot
 * be forgotten (it is required, so omitting it is a compile error rather than a
 * runtime surprise).
 */
export interface VesselCourseRecord extends VesselCourseHead {
  /** `TractRecord.direction`: arterial flow runs away from the heart. */
  direction: 'ascending' | 'descending' | 'mixed'
  /** `TractRecord.modality` — for an artery, what it carries. */
  modality: string
  /** Where the vessel comes from, in one clause. */
  origin: string
  /** Where it ends, in one clause. */
  target: string
  /** Crossing behaviour: an artery does not decussate; the ring it joins does. */
  decussation: string
  /** Physiology / territory in 1–3 sentences (the InfoPanel's own field). */
  function: string
  /** Catmull-Rom control points, canonical space: origin → course → target. */
  waypoints: Vec3[]
  /** Mid-segment radius in au (calibreMm / 2.4 — the v14 conversion rule). */
  tubeRadius: number
  /** The calibre in mm the radius was converted from. */
  calibreMm: number
}

/**
 * A record whose BODY IS ITS CHILDREN'S COURSES: it declares the course block
 * (basis, anchor, elements, the hugged surface) but owns no path of its own, so
 * it draws no tube — and it must not draw the schematic ellipsoid either, or the
 * blob this run exists to remove comes back on the group record instead of the
 * perforator. The authored lenticulostriate group records are this shape
 * (PLAN.md §3.2: "the parent record owns the selection, territory and clinical
 * content and its children are parent-linked to it").
 */
export interface VesselCourseGroup extends VesselCourseHead {
  /** The drawing courses that ARE this record's body (its perforator spray). */
  childIds: string[]
}

/* ==================================================================== *
 *  The built-in authored table (PLAN.md §2.1 Tier 1 / §3.2 / §3.3)
 * ==================================================================== */

/**
 * The lenticulostriate group — the PLAN.md §2.1 Tier-1 ids, and precisely the
 * set whose schematic ellipsoids are the two red blobs the user screenshotted.
 *
 * The built-in table is deliberately small and always in force: this task owns
 * the RENDER route, and the granular tier (MCA/PCA/SCA/ACA branches, the
 * perforator fan) is the authored-content task's domain, which arrives through
 * `src/data/structures/vasculature-courses.json` and replaces these records by
 * id. What cannot be delegated is the BLOB REMOVAL, so the record that owns the
 * two ellipsoids is here and is never dependent on a sibling task landing.
 *
 * The three landmarks below are the MEASURED ones of PLAN.md §3.1/§3.2 — the M1
 * superior-wall take-off is a literal committed vertex of
 * `vasc-middle-cerebral-artery-m1-l`, and the anterior perforated substance
 * waypoint is the projected point on the committed `ctx-hemisphere-l` envelope.
 * Radii are PLAN.md §3.3: `tubeRadius = calibreMm / 2.4` (0.8 mm → 0.333 au for
 * the lateral group, 1.0 mm → 0.417 au for Heubner) — a hairline, no
 * exaggeration factor.
 *
 * `surface: null` on all of them is the PLAN §4.1 decision, not an omission:
 * perforators pierce the anterior perforated substance and run INSIDE the brain,
 * so projecting them onto an envelope would be the eyeballed-coordinate error
 * the run forbids. Their only surface constraint is the entry point, and that
 * waypoint is the projected one.
 */
const M1_TAKEOFF: Vec3 = [15.786, 11.967, 24.92]
const M1_APS_MID: Vec3 = [15.2, 15.5, 25.15]
const APS_ENTRY: Vec3 = [14.157, 19.519, 25.214]
const HEUBNER_ORIGIN: Vec3 = [2.83, 15.419, 27.537]

const LENTICULOSTRIATE_SURFACE_NOTE =
  'Intraparenchymal course: the perforators pierce the anterior perforated substance and run inside the basal ganglia, ' +
  'so no committed envelope is hugged and `surface` is null by design (PLAN.md §4.1). The entry waypoint is the ' +
  'projected one: the anterior perforated substance point lies 0.507 au (0.61 mm) from the committed ctx-hemisphere-l ' +
  'envelope.'

/** Shared clinical content of the lenticulostriate group (mirrors the v8 records). */
const LENTICULOSTRIATE_CLINICAL: ClinicalItem[] = [
  {
    syndrome: 'Lacunar infarction of the internal capsule',
    findings:
      'The lateral lenticulostriate arteries are the classic site of hypertensive lacunar infarction: a single perforator ' +
      'occludes and produces a pure motor or pure sensory deficit, or an ataxic hemiparesis, without cortical signs — ' +
      'because the territory is the internal capsule and the deep grey matter, not the cortex.',
    vascular: 'Lateral lenticulostriate arteries (MCA M1 perforators)',
  },
  {
    syndrome: 'Striatocapsular infarction',
    findings:
      'Occlusion of several lenticulostriate arteries together infarcts the putamen, the caudate head, the internal ' +
      'capsule and the adjacent corona radiata — a striatocapsular infarct whose size tracks the number of perforators ' +
      'lost, and which may spare the cortex entirely.',
    vascular: 'Lenticulostriate arteries (group)',
  },
  {
    syndrome: 'Recurrent artery of Heubner territory infarction',
    findings:
      'The recurrent artery of Heubner supplies the caudate head, the anterior putamen and the anterior limb of the ' +
      'internal capsule; its occlusion causes a contralateral face and arm weakness with dysarthria, and it is at risk ' +
      'during anterior communicating artery surgery because it runs with the ACA.',
    vascular: 'Medial lenticulostriate arteries (recurrent artery of Heubner)',
  },
]

const LENTICULOSTRIATE_REFS: string[] = [
  'Rhoton, A. L. (2002). The supratentorial arteries. Neurosurgery, 51(4 Suppl), S53–S120.',
  'Tatu, L., et al. (2001). Arterial territories of the human brain. In Neuroanatomy (3rd ed.).',
  'Blumenfeld, H. (2nd ed.). Neuroanatomy through Clinical Cases — cerebrovascular disease.',
]

export const BUILT_IN_VESSEL_COURSES: readonly VesselCourseRecord[] = [
  {
    id: 'vasc-lenticulostriate-arteries',
    name: 'Lenticulostriate arteries (shared M1 trunk of the lateral group)',
    region: 'vasculature',
    kind: 'vessel',
    laterality: 'paired',
    parent: 'vasc-middle-cerebral-artery',
    surface: null,
    surfaceNote: LENTICULOSTRIATE_SURFACE_NOTE,
    basis: 'documented-course',
    elementIds: [],
    anchorNote:
      'AUTHORED PATH (documented-course basis): BP3D carries no lenticulostriate element, so no element id is claimed. ' +
      'This is the UMBRELLA record of the family, and its body is the shared M1 → anterior-perforated-substance trunk of ' +
      'the LATERAL group — the segment every lateral perforator traverses — authored from the measured landmarks of ' +
      'PLAN.md §3.1/§3.2: the M1 superior-wall take-off [15.786, 11.967, 24.92] (a literal committed vertex of ' +
      'vasc-middle-cerebral-artery-m1-l) → the corridor point [15.2, 15.5, 25.15] → the anterior perforated substance ' +
      '[14.157, 19.519, 25.214] (0.507 au = 0.61 mm from the committed ctx-hemisphere-l envelope). There is no single ' +
      'trunk for the whole family — the MEDIAL group (the recurrent artery of Heubner) arises from the anterior cerebral ' +
      'artery — so the umbrella record draws the lateral trunk and its child courses carry each group’s fan. ' +
      LENTICULOSTRIATE_SURFACE_NOTE +
      ' 0.8 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.333 au; the drawn radius is the stated calibre, not a measurement.',
    territory: ['nuc-putamen', 'nuc-caudate-head', 'ctx-internal-capsule', 'nuc-globus-pallidus-externus'],
    // v19 (audit FAC-VN-004) — was ['lacunar-infarction-internal-capsule',
    // 'striatocapsular-infarction']: neither id is a card in
    // `src/data/syndromes/*.json` (all 26 cards are `syn-*`), so the reverse
    // artery→syndrome index built by `load.ts` pointed at nothing and the two
    // clinical entities were unreachable. Every other course record carries its
    // clinical content in `clinical[]` and an empty `supply[]`; this record does
    // the same (LENTICULOSTRIATE_CLINICAL below names both entities by name).
    // Adding the two cards is a registry-first content decision, recorded as an
    // open item in docs/audit/v19/CORRECTIONS.md.
    supply: [],
    direction: 'descending',
    modality: 'Arterial blood (oxygenated) — end-artery perforators of the MCA',
    origin: 'Superior wall of the M1 segment of the middle cerebral artery, at the anterior perforated substance',
    target: 'Putamen and the anterior limb of the internal capsule (lateral group of lenticulostriate arteries)',
    decussation:
      'No crossing: each lenticulostriate group supplies its own hemisphere. Their parent trunks do cross the midline in the circle of Willis.',
    function:
      'The lateral lenticulostriate arteries are the end-artery perforators of the M1 segment: they pierce the anterior ' +
      'perforated substance and supply the putamen, the lateral globus pallidus, the caudate head and the anterior limb of ' +
      'the internal capsule. They are the most clinically consequential perforators in the brain — the lenticulostriate ' +
      'territory is where hypertensive lacunar infarction and striatocapsular infarction occur.',
    waypoints: [M1_TAKEOFF, M1_APS_MID, APS_ENTRY],
    tubeRadius: 0.333,
    calibreMm: 0.8,
    color: '#991b1b',
    synonyms: ['Lateral lenticulostriate arteries', 'Anterolateral central arteries'],
    clinical: LENTICULOSTRIATE_CLINICAL,
    refs: LENTICULOSTRIATE_REFS,
  },
  {
    id: 'vasc-lateral-lenticulostriate-arteries',
    name: 'Lateral lenticulostriate arteries',
    region: 'vasculature',
    kind: 'vessel',
    laterality: 'paired',
    parent: 'vasc-middle-cerebral-artery',
    surface: null,
    surfaceNote: LENTICULOSTRIATE_SURFACE_NOTE,
    basis: 'documented-course',
    elementIds: [],
    anchorNote:
      'AUTHORED PATH (documented-course basis): BP3D has no lenticulostriate concept of any kind, so no element id is ' +
      'claimed. The chain is the measured PLAN.md §3.2 arborisation — M1 superior-wall take-off [15.786, 11.967, 24.92] → ' +
      'anterior perforated substance [14.157, 19.519, 25.214] → the putamen corridor → arborisation target [22.0, 31.5, 13.0] ' +
      '(0.76 au from the committed ctx-putamen-l mesh), a chord arc of 24.1 au = 28.9 mm inside the documented 25–35 mm ' +
      'M1→putamen course. ' +
      LENTICULOSTRIATE_SURFACE_NOTE +
      ' 0.8 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.333 au.',
    territory: ['nuc-putamen', 'nuc-globus-pallidus-externus', 'ctx-internal-capsule'],
    // v19 (audit FAC-VN-004) — see the umbrella record above: the ids were not
    // syndrome cards. This record is withdrawn from the drawn set by the v18
    // authored replacement of the same id, so the array was dead data as well.
    supply: [],
    direction: 'descending',
    modality: 'Arterial blood (oxygenated) — end-artery perforators of the MCA',
    origin: 'M1 segment of the middle cerebral artery (superior wall), at the anterior perforated substance',
    target: 'Putamen, lateral globus pallidus and the anterior limb of the internal capsule',
    decussation: 'No crossing: the lateral group supplies its own hemisphere only.',
    function:
      'The lateral lenticulostriate arteries are the larger of the two lenticulostriate groups. They enter the brain ' +
      'through the anterior perforated substance and fan laterally and superiorly through the putamen to the internal ' +
      'capsule. Their occlusion is the anatomical basis of the lacunar syndrome and of striatocapsular infarction.',
    waypoints: [M1_TAKEOFF, M1_APS_MID, APS_ENTRY, [18.5, 25.5, 19.4], [22.0, 31.5, 13.0]],
    tubeRadius: 0.333,
    calibreMm: 0.8,
    color: '#991b1b',
    clinical: LENTICULOSTRIATE_CLINICAL,
    refs: LENTICULOSTRIATE_REFS,
  },
  {
    id: 'vasc-medial-lenticulostriate-arteries',
    name: 'Medial lenticulostriate arteries (recurrent artery of Heubner)',
    region: 'vasculature',
    kind: 'vessel',
    laterality: 'paired',
    parent: 'vasc-anterior-cerebral-artery',
    surface: null,
    surfaceNote: LENTICULOSTRIATE_SURFACE_NOTE,
    basis: 'documented-course',
    elementIds: [],
    anchorNote:
      'AUTHORED PATH (documented-course basis): no BP3D element names a medial lenticulostriate or Heubner artery, so no ' +
      'element id is claimed. The chain is the PLAN.md §3.2 Heubner course — anterior cerebral artery at the internal ' +
      'carotid terminus [2.83, 15.419, 27.537] → anterior perforated substance → the subcallosal corridor → the caudate ' +
      'head target [10.5, 38.0, 24.0] (1.17 au from the committed ctx-caudate-l mesh), a chord arc of ≈ 34.8 au = 41.8 mm. ' +
      LENTICULOSTRIATE_SURFACE_NOTE +
      ' Heubner is the largest of the group: 1.0 mm calibre at 1 au = 1.2 mm gives tubeRadius 0.417 au.',
    territory: ['nuc-caudate-head', 'nuc-putamen', 'ctx-internal-capsule'],
    // v19 (audit FAC-VN-004) — see the umbrella record above: this record is
    // withdrawn from the drawn set by the v18 authored replacement.
    supply: [],
    direction: 'descending',
    modality: 'Arterial blood (oxygenated) — the largest medial perforator of the ACA',
    origin: 'Anterior cerebral artery at the internal carotid terminus, anterior to the anterior communicating artery',
    target: 'Caudate head, anterior putamen and the anterior limb of the internal capsule',
    decussation: 'No crossing: the recurrent artery of Heubner supplies its own hemisphere.',
    function:
      'The recurrent artery of Heubner is the largest and most constant of the medial lenticulostriate arteries. It ' +
      'leaves the ACA near the anterior communicating artery, runs anteriorly and laterally into the anterior perforated ' +
      'substance and supplies the caudate head, the anterior putamen and the anterior limb of the internal capsule.',
    waypoints: [HEUBNER_ORIGIN, [8.3, 17.2, 26.9], [12.3, 19.254, 25.518], [11.8, 25.5, 25.4], [10.5, 38.0, 24.0]],
    tubeRadius: 0.417,
    calibreMm: 1.0,
    color: '#991b1b',
    synonyms: ['Recurrent artery of Heubner', 'Medial striate artery'],
    clinical: LENTICULOSTRIATE_CLINICAL,
    refs: LENTICULOSTRIATE_REFS,
  },
  {
    /**
     * v18b — THE LAST SCHEMATIC BLOB, retired by the course it now owns.
     *
     * `verify:vessel-render`'s `blobs 0` line was green while this record still
     * drew a crimson translucent sphere, because the gate modelled "has a baked
     * body" as "has a `LINKS` entry" (`anatomyAssets.ts`) instead of "has a
     * COMMITTED GLB". This record is the one entry in the whole atlas where the
     * two disagree: it declared
     * `vasc-posterior-medial-choroidal-artery-{l,r}` and neither slug has ever
     * been registered, canonically meshed or baked (the archive element pair
     * `FJ1727`/`FJ1727M`, 880 faces, FMA 50630, names the concept and is
     * source-only). `NucleusMesh` therefore settled to its unit-sphere fallback —
     * one sphere scaled by `size3d` [4, 4, 6] at `origin3d` [14, 18, −6], drawn
     * twice because the record is `paired` — which is the red translucent blob
     * left in the vasculature view after v17 removed the lenticulostriate pair.
     *
     * The measured path below is the replacement body (PLAN.md §5 E3): every
     * waypoint is a vertex of a mesh this tree has already committed, and the
     * residual of each rule is quoted in `anchorNote`. With the record in the
     * table, `hasVesselCourse` returns true for it and `SceneLayers` stops
     * mounting the ellipsoid — the same route, and the same "one record, one
     * body" rule, the lenticulostriate family already travels.
     */
    id: 'vasc-posterior-medial-choroidal-artery',
    name: 'Posterior medial choroidal artery',
    region: 'vasculature',
    kind: 'vessel',
    laterality: 'paired',
    parent: 'vasc-posterior-cerebral-artery',
    surface: 'ctx-midbrain-surface',
    surfaceNote:
      'The cisternal segment hugs the committed `ctx-midbrain-surface` envelope (the same surface the three SCA courses ' +
      'declare): its middle waypoint is a literal vertex of it, 0.000 au from the surface. The TERMINAL is the opposite ' +
      'relation — a choroidal artery ends ON the plexus — so it is a deliberate graze on the committed ' +
      '`ctx-choroid-plexus-l` mesh (a literal plexus vertex), 12.664 au (15.20 mm) from the P2 take-off, which is the ' +
      'cisternal + choroidal-fissure interval the path crosses.',
    basis: 'documented-course',
    elementIds: ['FJ1727', 'FJ1727M'],
    anchorNote:
      'MEASURED PATH (documented-course basis): the archive element pair `FJ1727`/`FJ1727M` (880 faces each, FMA 50630) ' +
      'names this artery, but it is neither registered in scripts/lib/register.mjs nor canonically meshed nor baked — ' +
      'no GLB for it exists in the manifest — so the element ids are named here and NO baked body is claimed. All three ' +
      'waypoints are instead measured on committed meshes (1 au = 1.2 mm): ' +
      'ORIGIN [10.363, 13.456, −16.527] is the most posterior committed vertex of `vasc-posterior-cerebral-artery-p2-l` ' +
      '(the distal, quadrigeminal end of the P2 segment — where this artery leaves the PCA); the nearest committed ' +
      '`ctx-midbrain-surface` vertex is 6.583 au (7.90 mm) away, the cisternal interval at the take-off. ' +
      'MIDDLE [5.244, 14.752, −12.595] IS that midbrain vertex — the collicular (tectal) surface the artery runs ' +
      'medially above, which is the record’s own words. ' +
      'TERMINAL [18.832, 22.802, −17.664] is the `ctx-choroid-plexus-l` vertex nearest the take-off: the plexus at the ' +
      'atrium (its glomus), 12.664 au (15.20 mm) from the origin, i.e. a graze — the artery ends ON the plexus. ' +
      'Chord arc 23.18 au = 27.8 mm, the cisternal + fissure segment. The intraventricular continuation along the ' +
      'plexus body toward the interventricular foramen, and the medial branch’s velum-interpositum run, are documented ' +
      'in this record’s own `territory[]` and `function` and are NOT drawn as a second tube: one record, one body. ' +
      'Calibre stated as 0.8 mm (the small-artery figure this table uses) → tubeRadius 0.333 au (r = d / 2.4).',
    territory: [
      'vent-choroid-plexus-lateral',
      'vent-lateral-ventricle-atrium',
      'vent-lateral-ventricle-body',
      'vent-third-ventricle',
      'nuc-pulvinar',
      'nuc-mgn',
      'nuc-habenula',
      'tract-fornix',
      'nuc-thalamic-reticular',
    ],
    supply: [],
    direction: 'descending',
    modality: 'Arterial blood (oxygenated) — choroidal branches of the posterior cerebral artery',
    origin: 'P2 segment of the posterior cerebral artery, in the ambient and quadrigeminal cistern',
    target: 'Choroid plexus of the lateral ventricle (body, atrium/glomus and temporal horn) and of the third ventricle',
    decussation: 'No crossing: each posterior choroidal artery supplies its own hemisphere.',
    function:
      'The choroidal supply of the posterior circulation: the medial posterior choroidal artery arises from the P2 ' +
      'segment of the posterior cerebral artery and runs medially above the tectum to the third ventricle and the ' +
      'interventricular foramen region, while the lateral posterior choroidal artery arises more distally and runs ' +
      'laterally into the lateral ventricle to supply the choroid plexus of the body, the atrium (its glomus) and the ' +
      'temporal horn. Together they supply the choroid plexus of the lateral and third ventricles, the posterior ' +
      'thalamus and habenula region, and the adjacent fornix and pulvinar — the territory that makes the plexus a ' +
      'vascular as well as a CSF structure.',
    waypoints: [
      [10.363, 13.456, -16.527],
      [5.244, 14.752, -12.595],
      [18.832, 22.802, -17.664],
    ],
    tubeRadius: 0.333,
    calibreMm: 0.8,
    color: '#991b1b',
    levels: ['lvl-midbrain-sc', 'lvl-post-comm', 'lvl-thalamus-mid', 'lvl-thalamus-rostral', 'lvl-tel-thalamostriate'],
    synonyms: [
      'arteria choroidea posterior medialis',
      'medial posterior choroidal artery',
      'posterior choroidal arteries (medial and lateral — this record documents both branches)',
    ],
    clinical: [
      {
        syndrome: 'Choroid plexus tumour supply',
        findings:
          'Choroid plexus papillomas and carcinomas, and intraventricular meningiomas of the trigone, are fed by the ' +
          'posterior choroidal arteries (and the anterior choroidal artery anteriorly); recognizing the pedicle is what ' +
          'makes embolization and surgical control possible.',
        vascular: 'Posterior choroidal arteries (with the anterior choroidal artery)',
      },
      {
        syndrome: 'Posterior choroidal territory infarction',
        findings:
          'Occlusion produces infarction of the posterior thalamus and the adjacent plexus, adding hemisensory loss, ' +
          'visual field defects and memory disturbance to the picture of a posterior cerebral artery infarct; isolated ' +
          'occlusion is uncommon because the artery arises from the PCA itself.',
        vascular: 'Posterior cerebral artery (posterior choroidal branches)',
      },
      {
        syndrome: 'Intraventricular haemorrhage from the choroidal vessels',
        findings:
          'The choroidal arteries are the source of intraventricular haemorrhage in the premature (germinal matrix) and ' +
          'of blood in the ventricles in adults with hypertension or vascular malformation; blood in the ventricle is ' +
          'what produces hydrocephalus.',
        vascular: 'Choroidal arteries (with the germinal matrix in neonates)',
      },
    ],
    refs: [
      'Blumenfeld, H. (2nd ed.). Neuroanatomy through Clinical Cases — Brain and Environs: Cranium, Ventricles, and Meninges.',
      'Blumenfeld, H. (2nd ed.). Neuroanatomy through Clinical Cases — Cerebral Hemispheres and Vascular Supply.',
    ],
  },
]

/* ==================================================================== *
 *  The authored source (src/data/structures/vasculature-courses.json)
 * ==================================================================== */

/**
 * The authored course file of this run's content task. `import.meta.glob` (not
 * a static import) is deliberate: a static import of a file that does not exist
 * yet fails `npm run check` and `npm run build`, while a glob that matches
 * nothing contributes zero records — the pattern `src/data/load.ts` documents
 * for every optional authoring group.
 *
 * The pattern is `vasculature-course*.json` rather than one literal name so a
 * companion file (`vasculature-courses.json`, `vasculature-course.json`) is
 * picked up too; every match is normalized and merged by id, and the gate prints
 * which files contributed and how many records each one yielded.
 */
const AUTHORED_COURSE_MODULES: Record<string, unknown> = import.meta.glob(
  '../data/structures/vasculature-course*.json',
  { eager: true, import: 'default' },
)

/** The source file the authored content task writes (named for diagnostics). */
export const VESSEL_COURSE_SOURCE_PATH = 'src/data/structures/vasculature-courses.json'

export interface AuthoredCourseSource {
  /** Module path → number of usable DRAWING records read from it. */
  files: Map<string, number>
  /** Module path → number of GROUP records read from it. */
  groupFiles: Map<string, number>
  /** How many entries the authored files offered in total. */
  offered: number
  /** Entries that were neither a path nor a course group (printed, not silent). */
  rejected: string[]
  /** Field aliases the normalizer had to fall back to, per record id. */
  aliases: Map<string, string[]>
  /** Top-level keys of a file whose shape was not recognized (diagnostics). */
  unrecognized: string[]
}

/**
 * The arrays inside an authored module. Accepts the shapes an authoring task
 * realistically ships — a bare array (the shape `data/load.ts` requires of
 * `structures/*.json`), `{ courses: [...] }`, `{ records: [...] }` — and reports
 * anything else instead of silently reading nothing.
 */
function arraysFromModule(module: unknown, path: string, report: AuthoredCourseSource): unknown[] {
  if (Array.isArray(module)) return module
  if (module !== null && typeof module === 'object') {
    const holder = module as Record<string, unknown>
    for (const key of ['courses', 'records', 'vessels', 'vesselCourses']) {
      const value = holder[key]
      if (Array.isArray(value)) return value
    }
    report.unrecognized.push(`${path}: {${Object.keys(holder).join(', ')}}`)
    return []
  }
  report.unrecognized.push(`${path}: ${typeof module}`)
  return []
}

/** Read one `[x, y, z]` triple, or null when it is not three finite numbers. */
function readVec3(value: unknown): Vec3 | null {
  if (!Array.isArray(value) || value.length < 3) return null
  const [x, y, z] = value as unknown[]
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null
  return [x, y, z]
}

/** The nested course block an authored StructureRecord carries, if any. */
function courseBlock(record: Record<string, unknown>): Record<string, unknown> {
  const block = record.vesselCourse
  return block !== null && typeof block === 'object' ? (block as Record<string, unknown>) : {}
}

/**
 * Read a string field from the course block, then the record, then aliases.
 * A hit on a NON-CANONICAL key is REPORTED, so a drift between the two modules
 * is visible in the gate output instead of producing a course with silent
 * defaults. Reading a canonical key from the record rather than from the course
 * block is the documented shape of an authored entry (the record IS a
 * StructureRecord and owns its own name/laterality/color), so that is not a
 * drift and is not reported.
 */
function readString(
  sources: readonly Record<string, unknown>[],
  keys: readonly string[],
  id: string,
  report: AuthoredCourseSource,
): string | undefined {
  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const value = sources[sourceIndex][keys[keyIndex]]
      if (typeof value === 'string' && value.length > 0) {
        if (keyIndex > 0) {
          report.aliases.set(id, [...(report.aliases.get(id) ?? []), `${keys[0]}←${keys[keyIndex]}`])
        }
        return value
      }
    }
  }
  return undefined
}

/** The first finite number among the aliases (course block first); aliases reported. */
function readNumber(
  sources: readonly Record<string, unknown>[],
  keys: readonly string[],
  id: string,
  report: AuthoredCourseSource,
): number | undefined {
  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const value = sources[sourceIndex][keys[keyIndex]]
      if (typeof value === 'number' && Number.isFinite(value)) {
        if (keyIndex > 0) {
          report.aliases.set(id, [...(report.aliases.get(id) ?? []), `${keys[0]}←${keys[keyIndex]}`])
        }
        return value
      }
    }
  }
  return undefined
}

/** A string-array field (or a single string) across the sources, else []. */
function readStringArray(
  sources: readonly Record<string, unknown>[],
  keys: readonly string[],
): string[] {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
      if (typeof value === 'string' && value.length > 0) return [value]
    }
  }
  return []
}

/** Everything both shapes share, read from `[courseBlock, record]`. */
function readHead(
  record: Record<string, unknown>,
  block: Record<string, unknown>,
  id: string,
  report: AuthoredCourseSource,
): VesselCourseHead {
  const sources = [block, record]
  const surfaceValue = block.surface ?? record.surface
  const parent =
    readString(sources, ['parentArtery', 'parentArteryId', 'parent', 'parentId'], id, report) ?? ''
  return {
    id,
    name: readString(sources, ['name'], id, report) ?? id,
    region: 'vasculature',
    kind: 'vessel',
    laterality:
      (readString(sources, ['laterality', 'side'], id, report) ?? record.laterality) === 'midline'
        ? 'midline'
        : 'paired',
    parent,
    surface: typeof surfaceValue === 'string' && surfaceValue.length > 0 ? surfaceValue : null,
    surfaceNote: readString(sources, ['surfaceNote'], id, report),
    basis: (block.basis ?? record.basis) === 'bp3d-element' ? 'bp3d-element' : 'documented-course',
    elementIds: readStringArray(sources, ['elementIds', 'elements', 'fjIds', 'elementId']),
    anchorNote: readString(sources, ['anchorNote', 'courseNote', 'note'], id, report) ?? '',
    territory: readStringArray(sources, ['territory']),
    supply: readStringArray(sources, ['supply']),
    color: readString(sources, ['color'], id, report) ?? '#b91c1c',
    levels: readStringArray(sources, ['levels']).length > 0 ? readStringArray(sources, ['levels']) : undefined,
    synonyms:
      readStringArray(sources, ['synonyms']).length > 0 ? readStringArray(sources, ['synonyms']) : undefined,
    clinical: Array.isArray(record.clinical) ? (record.clinical as ClinicalItem[]) : [],
    refs: readStringArray(sources, ['refs']),
  }
}

/**
 * Normalize one authored entry into a drawing course or a group.
 *
 * Returns `null` for an entry that is neither (no id, no course block and no
 * usable path) — a plain structure record that happens to live in this file is
 * not a course and must not be suppressed, so it is neither.
 */
function normalizeAuthoredEntry(
  value: unknown,
  index: number,
  path: string,
  report: AuthoredCourseSource,
): VesselCourseRecord | VesselCourseGroup | null {
  if (value === null || typeof value !== 'object') {
    report.rejected.push(`${path}[${index}] (not an object)`)
    return null
  }
  const record = value as Record<string, unknown>
  const block = courseBlock(record)
  const hasBlock = Object.keys(block).length > 0
  const id = typeof record.id === 'string' && record.id.length > 0 ? record.id : `${path}[${index}]`
  // The path keys, in the order they are looked for, and in BOTH places: the
  // course block (the authored shape of this run) and the record itself (a
  // record written as a plain course).
  const PATH_KEYS = ['waypoints', 'path', 'course', 'points', 'chain'] as const
  let pathKey: string | undefined
  let rawPath: unknown
  for (const source of [block, record]) {
    for (const key of PATH_KEYS) {
      if (source[key] !== undefined) {
        pathKey = key
        rawPath = source[key]
        break
      }
    }
    if (pathKey !== undefined) break
  }
  if (pathKey !== undefined && pathKey !== 'waypoints') {
    report.aliases.set(id, [...(report.aliases.get(id) ?? []), `waypoints←${pathKey}`])
  }
  const waypoints = (Array.isArray(rawPath) ? rawPath : [])
    .map(readVec3)
    .filter((point): point is Vec3 => point !== null)

  if (waypoints.length >= 2) {
    const head = readHead(record, block, id, report)
    const calibreMm = readNumber([block, record], ['calibreMm', 'calibre', 'diameterMm'], id, report)
    const tubeRadius =
      readNumber([block, record], ['tubeRadius', 'radius'], id, report) ??
      (calibreMm !== undefined ? calibreMm / 2.4 : 0.333)
    const direction = readString([block, record], ['direction'], id, report) ?? 'descending'
    return {
      ...head,
      direction: direction === 'ascending' || direction === 'mixed' ? direction : 'descending',
      modality:
        readString([block, record], ['modality'], id, report) ?? 'Arterial blood (oxygenated)',
      origin:
        readString([block, record], ['origin'], id, report) ??
        (head.parent === '' ? '' : `Parent artery: ${head.parent}`),
      target: readString([block, record], ['target'], id, report) ?? '',
      decussation:
        readString([block, record], ['decussation'], id, report) ??
        'No crossing: an artery supplies its own side; the ring it joins is the crossing structure.',
      function: readString([block, record], ['function'], id, report) ?? '',
      waypoints,
      tubeRadius,
      calibreMm: calibreMm ?? tubeRadius * 2.4,
    }
  }

  // No usable path. A record that DECLARED a path key but whose value cannot be
  // read is a broken course, not a group — it is rejected by name so the defect
  // is visible instead of becoming a silently body-less record.
  if (pathKey !== undefined) {
    report.rejected.push(
      `${id} (\`${pathKey}\` is present but not a usable path: ` +
        `${Array.isArray(rawPath) ? `${waypoints.length} finite point(s)` : typeof rawPath})`,
    )
    return null
  }

  // A record that declares a course block and names no path is a GROUP: its body
  // is its child courses, and it must be suppressed exactly like a drawing one.
  if (hasBlock) {
    return { ...readHead(record, block, id, report), childIds: [] }
  }
  report.rejected.push(`${id} (no vesselCourse block and no path)`)
  return null
}

/**
 * Read + normalize the authored course files. Pure (the only side effect is the
 * returned report), so the gate prints exactly what was read.
 */
export function readAuthoredVesselCourses(
  modules: Record<string, unknown> = AUTHORED_COURSE_MODULES,
): {
  courses: VesselCourseRecord[]
  groups: VesselCourseGroup[]
  report: AuthoredCourseSource
} {
  const report: AuthoredCourseSource = {
    files: new Map(),
    groupFiles: new Map(),
    offered: 0,
    rejected: [],
    aliases: new Map(),
    unrecognized: [],
  }
  const courses: VesselCourseRecord[] = []
  const groups: VesselCourseGroup[] = []
  for (const path of Object.keys(modules).sort()) {
    const entries = arraysFromModule(modules[path], path, report)
    let usedCourses = 0
    let usedGroups = 0
    for (let index = 0; index < entries.length; index += 1) {
      const entry = normalizeAuthoredEntry(entries[index], index, path, report)
      if (entry === null) continue
      if ('waypoints' in entry) {
        courses.push(entry)
        usedCourses += 1
      } else {
        groups.push(entry)
        usedGroups += 1
      }
    }
    report.offered += entries.length
    report.files.set(path, usedCourses)
    report.groupFiles.set(path, usedGroups)
  }
  // A group's body is the drawing courses named below it: the authored
  // `-1`, `-2`, … children, which is the plan's own parent→child convention.
  for (const group of groups) {
    group.childIds = courses
      .filter((course) => course.id.startsWith(`${group.id}-`))
      .map((course) => course.id)
      .sort()
  }
  return { courses, groups, report }
}

/* ==================================================================== *
 *  The merged table — authored wins, by id, and a group can take an id
 * ==================================================================== */

export interface VesselCourseTable {
  courses: readonly VesselCourseRecord[]
  groups: readonly VesselCourseGroup[]
  /** Built-in drawing records that survived the merge. */
  builtInIds: readonly string[]
  /** Authored-only drawing records that joined the table. */
  authoredIds: readonly string[]
  /** Built-in ids an authored record took over (drawing course or group). */
  replacedIds: readonly string[]
  /**
   * Built-in drawing records that became GROUPS because the authored file
   * declares children under them (`<id>-1`, `<id>-2`, …). The authored ladder
   * wins: the parent record's body is its children's spray, so the parent's own
   * built-in tube is withdrawn rather than drawn over its children.
   */
  groupedIds: readonly string[]
  report: AuthoredCourseSource
}

/**
 * Merge by id, authored first. Deterministic and inspectable: a built-in
 * drawing record keeps its table position unless the authored file declares the
 * same id — as a drawing course (which replaces it), as a GROUP (which replaces
 * it too: the group's children are the body then), or as a LADDER of children
 * under it (`<id>-1` …), in which case the built-in record becomes a group and
 * its own tube is withdrawn.
 */
export function mergeVesselCourses(
  builtIn: readonly VesselCourseRecord[] = BUILT_IN_VESSEL_COURSES,
  authored: readonly VesselCourseRecord[] = readAuthoredVesselCourses().courses,
  authoredGroups: readonly VesselCourseGroup[] = readAuthoredVesselCourses().groups,
): VesselCourseTable {
  const authoredById = new Map<string, VesselCourseRecord>()
  for (const course of authored) authoredById.set(course.id, course)
  const groupIds = new Set(authoredGroups.map((group) => group.id))
  const authoredIdsAll = authored.map((course) => course.id)
  const courses: VesselCourseRecord[] = []
  const groups: VesselCourseGroup[] = [...authoredGroups]
  const builtInIds: string[] = []
  const replacedIds: string[] = []
  const groupedIds: string[] = []
  for (const course of builtIn) {
    const authoredCourse = authoredById.get(course.id)
    if (authoredCourse !== undefined) {
      courses.push(authoredCourse)
      replacedIds.push(course.id)
      authoredById.delete(course.id)
      continue
    }
    if (groupIds.has(course.id)) {
      // The authored GROUP is the record's body now: its children draw.
      replacedIds.push(course.id)
      continue
    }
    // Does the authored file declare a LADDER under this record? Then the
    // record is a group too — its built-in tube must not be drawn beside the
    // children it would duplicate.
    const children = authoredIdsAll.filter((id) => id.startsWith(`${course.id}-`)).sort()
    if (children.length > 0) {
      groupedIds.push(course.id)
      groups.push({
        id: course.id,
        name: course.name,
        region: course.region,
        kind: course.kind,
        laterality: course.laterality,
        parent: course.parent,
        surface: course.surface,
        surfaceNote: course.surfaceNote,
        basis: course.basis,
        elementIds: course.elementIds,
        anchorNote: course.anchorNote,
        territory: course.territory,
        supply: course.supply,
        color: course.color,
        levels: course.levels,
        synonyms: course.synonyms,
        clinical: course.clinical,
        refs: course.refs,
        childIds: children,
      })
      continue
    }
    courses.push(course)
    builtInIds.push(course.id)
  }
  const authoredIds: string[] = []
  for (const [id, course] of authoredById) {
    courses.push(course)
    authoredIds.push(id)
  }
  return {
    courses,
    groups,
    builtInIds,
    authoredIds,
    replacedIds,
    groupedIds,
    report: readAuthoredVesselCourses().report,
  }
}

const TABLE: VesselCourseTable = mergeVesselCourses()

/** The DRAWING courses: built-in ∪ authored, id-keyed, every one with a path. */
export const VESSEL_COURSES: readonly VesselCourseRecord[] = TABLE.courses

/** The GROUP records: no path of their own, their children are their body. */
export const VESSEL_COURSE_GROUPS: readonly VesselCourseGroup[] = TABLE.groups

/** The merge, exported so the gate prints it instead of inferring it. */
export const VESSEL_COURSE_SOURCES: VesselCourseTable = TABLE

export const VESSEL_COURSE_IDS: readonly string[] = VESSEL_COURSES.map((course) => course.id)
export const VESSEL_COURSE_GROUP_IDS: readonly string[] = VESSEL_COURSE_GROUPS.map((group) => group.id)

/**
 * Every id the ordinary structure pass must stop drawing an ellipsoid for:
 * the drawing courses (their own tube is the body) AND the groups (their
 * children's tubes are the body). This is THE suppression key.
 */
const VESSEL_COURSE_ID_SET: ReadonlySet<string> = new Set([
  ...VESSEL_COURSE_IDS,
  ...VESSEL_COURSE_GROUP_IDS,
])

/**
 * Whether the ordinary structure pass must stop drawing this record's schematic
 * placement ellipsoid — true for a course-bearing vessel of EITHER shape, and
 * true for nothing else. A `Set`, because `SceneLayers` asks once per registry
 * record per render, exactly like `hasNerveCourse`.
 */
export function hasVesselCourse(id: string): boolean {
  return VESSEL_COURSE_ID_SET.has(id)
}

/** Whether the id is a group record (declares a course, owns no path). */
export function hasVesselCourseGroup(id: string): boolean {
  return VESSEL_COURSE_GROUPS.some((group) => group.id === id)
}

/** The drawing course for one `vasc-*` id, or undefined. */
export function vesselCourseById(id: string): VesselCourseRecord | undefined {
  return VESSEL_COURSES.find((course) => course.id === id)
}

/** The group record for one `vasc-*` id, or undefined. */
export function vesselCourseGroupById(id: string): VesselCourseGroup | undefined {
  return VESSEL_COURSE_GROUPS.find((group) => group.id === id)
}

/**
 * Whether a course draws a MIRROR twin (`x → −x`).
 *
 * The registry's own `laterality` is authoritative when the id has a taxonomy
 * row (that is the field the Areas/Systems UI and the audit read); the record's
 * own `laterality` is the fallback for a course whose row has not landed yet.
 * Pure and total, so the 3D pass, the 2D registry and the gate all decide
 * identically — the two surfaces cannot disagree about a side.
 */
export function isPairedVessel(
  course: { laterality: 'midline' | 'paired' },
  registryLaterality?: string | null,
): boolean {
  return (registryLaterality ?? course.laterality) === 'paired'
}

/** Mirror one canonical point across the mid-sagittal plane (x → −x). */
export function mirrorVesselWaypoints(waypoints: readonly Vec3[]): Vec3[] {
  return waypoints.map(([x, y, z]) => [-x, y, z] as Vec3)
}

/**
 * The mirrored twin of a course: the SAME record (id, group, colour, radius) on
 * the other side, so it selects, hovers and highlights as one structure — only
 * the geometry is mirrored, exactly like `<TractTube mirrored>`.
 */
export function mirrorVesselCourse(course: VesselCourseRecord): VesselCourseRecord {
  return { ...course, waypoints: mirrorVesselWaypoints(course.waypoints) }
}

/**
 * The number of tubes the 3D pass draws: one per drawing course, plus one twin
 * per paired course. Exported so the gate prints the two terms rather than a
 * bare product (PLAN.md §7.14).
 */
export function vesselTubeCount(
  courses: readonly VesselCourseRecord[] = VESSEL_COURSES,
  lateralityOf: (course: VesselCourseRecord) => string | null | undefined = (course) => course.laterality,
): { authored: number; mirrored: number; total: number } {
  let mirrored = 0
  for (const course of courses) if (isPairedVessel(course, lateralityOf(course))) mirrored += 1
  return { authored: courses.length, mirrored, total: courses.length + mirrored }
}
