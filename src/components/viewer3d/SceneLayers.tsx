/**
 * SceneLayers — maps the authored atlas data onto 3D (plan §5, viewer3d task;
 * realism plan render-pipeline + integration-v2 tasks):
 *  - translucent context envelopes: per slot, the committed v2 GLB from
 *    src/assets/anatomy (resolved via anatomyAssets.ts) when the manifest has
 *    the slug, otherwise the v1 parametric lathe/ellipsoid from
 *    src/geometry/envelope.ts (KEPT as the instant fallback — the app never
 *    blanks). Envelopes keep depthWrite false and renderOrder −1, and are
 *    gated by region + 'context' layers; since p1-identity they are also
 *    **pickable** (a click selects the record the slot resolves to, and each
 *    slot id is a real registry id) and use the central PBR material
 *    factory (src/geometry/materials.ts) so clipping planes and presets come
 *    from one place;
 *  - one NucleusMesh per structure record (paired records get a mirrored −x
 *    instance); each record passes its id as the manifest slug so NucleusMesh
 *    upgrades to the committed GLB when one exists and keeps the v1
 *    primitive (sphere or ventricle envelope override) otherwise;
 *  - one TractTube per tract record (region via the taxonomy registry) —
 *    tracts stay procedural (realism plan §7 tracts-upgrade);
 *  - v14: one TractTube per CRANIAL-NERVE COURSE, through the SAME component,
 *    the SAME sweep and the SAME `isTractVisible` gate — but keyed on the
 *    record's OWN registry kind (`nerve`), so the Systems row's "Cranial
 *    nerves" button controls exactly the twelve and the "Tracts" button
 *    controls exactly the 23 (`src/geometry/curves.ts` holds the courses);
 *  - v17: the same route for VESSEL COURSES (`src/geometry/vasculature-
 *    courses.ts`). A course-bearing artery renders as a procedural tube here
 *    and in the live section, is admitted by `isTractVisible` on its OWN
 *    registry kind (`vessel` + region `vasculature`), draws its mirror twin when
 *    the registry calls it `paired`, and stops drawing the schematic placement
 *    ellipsoid it used to fall back to — which is what removes the two red
 *    lenticulostriate blobs the user screenshotted. Zero payload: the tube is
 *    swept from the authored waypoints, exactly like a nerve's.
 *
 * Selection/hover dimming: the lit id set (open syndrome wins over a plain
 * selection — store.highlightIdSet) stays at full brightness/emissive while
 * every other mesh dims to 0.15 opacity. Explode is consumed inside
 * NucleusMesh (v2 meshes offset by manifest centroid) so tube geometries
 * never rebuild.
 */
import { Fragment, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { Region, StructureRecord } from '../../types'
import { getTaxonomyEntry, structures, tracts } from '../../data/load'
import { highlightIdSet, useAtlasStore } from '../../state/store'
import {
  createCerebellumEnvelopes,
  createHypothalamusEnvelope,
  createMedullaEnvelope,
  createMidbrainEnvelope,
  createPonsEnvelope,
  createThalamusEnvelopes,
  ventricleGeometryFor,
} from '../../geometry/envelope'
import { createContextMaterial, createGhostShellMaterial } from '../../geometry/materials'
import {
  anatomySlugsForRecord,
  isGhostOrContentOnly,
  useAnatomyAsset,
  RECORD_MATERIAL_OVERRIDES,
  TEL_HEMISPHERE_RECORD_IDS,
  TEL_HEMISPHERE_SHELLS,
} from '../../geometry/anatomyAssets'
import NucleusMesh from './NucleusMesh'
import SomatotopyOverlay from './SomatotopyOverlay'
import TractTube from './TractTube'
import { SOMATOTOPY_RECORD_IDS } from '../../geometry/somatotopy'
import { NERVE_COURSES, hasNerveCourse, type NerveCourseRecord } from '../../geometry/curves'
import {
  VESSEL_COURSES,
  hasVesselCourse,
  hasVesselCourseGroup,
  isPairedVessel,
  type VesselCourseRecord,
} from '../../geometry/vasculature-courses'

/** Envelope gray (plan §6 context palette) — fed to the factory material. */
const CONTEXT_COLOR = '#94a3b8'
const ENVELOPE_OPACITY = 0.16
const ENVELOPE_OPACITY_LIT = 0.45
/** Selection glow on envelopes, softer than the v1 0.4 (ACES + IBL read brighter). */
const ENVELOPE_EMISSIVE_LIT = 0.22

/* ------------------------------------------------- v7 telencephalon presets */

/**
 * Hue of the hemisphere ghost shell (docs/TELENCEPHALON_PLAN.md §5 "cortex ghost
 * by default"). Deliberately the SAME slate family as the existing context
 * envelopes so the ghost reads as the outer envelope it is, not as a new layer.
 */
const GHOST_SHELL_COLOR = '#9fb0c4'

/**
 * How faint the ghost gets when its record is in the active preset's `hidden`
 * set — §5's "Brainstem focus: cortex hidden except a faint outline". This is a
 * genuine silhouette, not an assertion: the mesh stays in the scene at this
 * opacity so the brain's outline frames the brainstem, while everything a click
 * can reach through it (the brainstem, diencephalon and cerebellum) reads
 * unobstructed.
 */
export const GHOST_OUTLINE_OPACITY = 0.05

/**
 * Which records the active preset emphasises (docs/TELENCEPHALON_PLAN.md §5
 * "Deep structures: ghost cortex + basal ganglia/limbic emphasised"). The
 * emissive lift itself is `NucleusMesh`'s `emphasised` prop (0.18, below the
 * hover value so an emphasis can never read as an interaction); this pass only
 * decides WHO gets it: opaque kinds, never the translucent envelopes.
 */

/**
 * A structure is "solid" when its kind renders opaque by default.
 *
 * v13 note — `nerve` needs no entry here, and that is a DECISION, not an
 * oversight: the predicate is "everything that is not one of the three
 * translucent kinds", and a cranial-nerve record is a solid schematic placement
 * the ordinary body pass draws. The whole nerve path is:
 *   • `isStructureVisible` admits it (region on, `nerve` kind on, not hidden,
 *     not in `TEL_CONTENT_ONLY_IDS`);
 *   • `anatomySlugsForRecord` has no link for an `nrv-*` id, so the slug handed
 *     to `NucleusMesh` is the record id itself — a manifest miss, which settles
 *     to `status: 'fallback'` and draws the shared unit sphere scaled by
 *     `size3d` at `origin3d` (exactly what `nuc-subiculum` does — v17 removed
 *     the other example this line used to give, `vasc-lenticulostriate-
 *     arteries`, whose fallback ellipsoid WAS the two red blobs the user
 *     screenshotted: it now has a course and is suppressed below);
 *   • `isSolidKind('nerve')` is true, so `emphasis` may lift it — which is
 *     correct for an opaque body and would be wrong for an envelope.
 * The v13 slice adds no pass, no manifest part and no GLB (PLAN.md §5); if a
 * nerve ever gets a baked body it becomes a `LINKS` entry, not a branch here.
 */
function isSolidKind(kind: StructureRecord['kind']): boolean {
  return kind !== 'context' && kind !== 'ventricle' && kind !== 'vessel'
}

/* ------------------------------------------------- v11 §2 — ONE decision */

/**
 * The layer state every 3D pass reads: the two layer SETS the area/system
 * toggles write (`store.layers.regions` / `.kinds`) plus the preset's
 * structure-level `hidden` set.
 */
export interface SceneLayerSets {
  regions: ReadonlySet<string>
  kinds: ReadonlySet<string>
  hidden: ReadonlySet<string>
}

/**
 * layersAdmit — THE region/kind decision of the 3D surface.
 *
 * Every pass below (context envelopes, the hemisphere ghost shells, the
 * structure bodies and the tract tubes) asks this ONE function, so "the area is
 * off" cannot mean different things in two passes: a new pass that forgets it is
 * visibly different in the source, and
 * `scripts/verify/view-filter-consistency.mjs` asserts that no other read of
 * `regions`/`kinds` remains in this file. The 2D surface's decision is
 * `SectionCanvas.isPartVisible` — the same two tests over the section's own
 * domain (draw bucket → taxonomy kind); the gate executes both and asserts they
 * agree part by part, which is what makes "one decision, two surfaces" a
 * measurement rather than a convention (PLAN.md §9 item 9).
 *
 * Pure and total: no store access, no geometry, no allocation.
 */
export function layersAdmit(
  layers: { regions: ReadonlySet<string>; kinds: ReadonlySet<string> },
  region: string,
  kind: string,
): boolean {
  return layers.regions.has(region) && layers.kinds.has(kind)
}

/**
 * Whether the STRUCTURE pass draws a record: its region and kind are on and the
 * active preset does not hide it. Records whose body another pass owns (the
 * context envelopes, the somatotopy patches) or that have no baked body at all
 * are excluded — that exclusion is about WHICH pass draws a body, never about
 * the area/system decision, which stays `layersAdmit`.
 */
export function isStructureVisible(record: StructureRecord, layers: SceneLayerSets): boolean {
  if (!layersAdmit(layers, record.region, record.kind)) return false
  // v7 preset `hidden` (plan C11): structure-level visibility that the
  // region/kind sets cannot express — §5's "cortex hidden" and
  // "deep structures only" presets are structure-level states.
  if (layers.hidden.has(record.id)) return false
  return !isGhostOrContentOnly(record.id)
}

/**
 * Whether the TRACT pass draws a tract — and, since v14, whether the
 * CRANIAL-NERVE pass draws a course. `TractRecord` carries no region, so the
 * taxonomy registry is authoritative (a tract with no entry is a medullary one,
 * the pre-v7 default) — and the tract whose telencephalic body belongs to a
 * hidden record is hidden too, or the preset would leak the very fibres it says
 * it hides.
 *
 * v14 §5 — THE KIND IS THE RECORD'S OWN, NOT THE LITERAL 'tract'.
 * This used to pass the hard-coded string `'tract'` to `layersAdmit`, which was
 * invisible for the 23 tracts (all `kind: 'tract'` in the registry) and
 * catastrophic for a `nerve`-kind course: the twelve cranial nerves would have
 * been shown and hidden by the wrong Systems-row button — the tract toggle —
 * while their own "Cranial nerves" toggle did nothing. Reading
 * `entry.kind` fixes it at the line that held the defect and keeps the 23-tract
 * behaviour byte-identical (`entry.kind === 'tract'` for each of them). The
 * `view-filter-consistency` gate's source assertion on this call site and the
 * call sites themselves are unchanged; only the kind argument moves.
 */
export function isTractVisible(tractId: string, layers: SceneLayerSets): boolean {
  const entry = getTaxonomyEntry(tractId)
  const kind = entry?.kind ?? 'tract'
  if (!layersAdmit(layers, entry ? entry.region : 'medulla', kind)) return false
  return !layers.hidden.has(tractId)
}

/**
 * The CRANIAL-NERVE pass's admission list — the twelve courses that survive the
 * one decision. Exported for the same reason `isTractVisible`,
 * `isStructureVisible` and `layersAdmit` are: a gate cannot mount the R3F
 * canvas, so the pass's decision is a pure function over (records, layer state)
 * and `scripts/verify/cranial-nerve-render.mjs` runs it instead of reading a
 * comment. The component calls this with `NERVE_COURSES`.
 *
 * The twelve are admitted by `isTractVisible`, i.e. on their OWN registry kind
 * (`nerve`), which is what makes the Systems row's "Cranial nerves" button
 * control exactly these and nothing else.
 */
export function nerveCoursesVisible(
  courses: readonly NerveCourseRecord[],
  layers: SceneLayerSets,
): NerveCourseRecord[] {
  return courses.filter((course) => isTractVisible(course.id, layers))
}

/**
 * The VESSEL-COURSE pass's admission list — the artery courses that survive the
 * one decision (v17, the vessel half of the same route).
 *
 * Exactly the nerve pass above, one table over: a vessel course resolves through
 * `getTaxonomyEntry` to `region: 'vasculature'` and `kind: 'vessel'`, so the
 * Areas row's **Vasculature** button and the Systems row's **vessel** button
 * gate it — and nothing else does. With the vessel kind off, 0 vessel courses
 * draw and no nerve or tract disappears; with the vasculature area off, the
 * same 0; with the TRACT kind off, the vessel courses stay (the kind is the
 * record's own, never a literal).
 *
 * Exported for the same reason the other predicates are: a gate cannot mount
 * the R3F canvas, so the pass's decision is a pure function over (courses, layer
 * state) and `scripts/verify/vessel-render.mjs` executes it and prints the
 * counts of every layer state.
 */
export function vesselCoursesVisible(
  courses: readonly VesselCourseRecord[],
  layers: SceneLayerSets,
): VesselCourseRecord[] {
  return courses.filter((course) => isTractVisible(course.id, layers))
}

/** Whether a context envelope slot is drawn (region on + the context kind on). */
export function isEnvelopeSlotVisible(
  slot: { region: string },
  layers: { regions: ReadonlySet<string>; kinds: ReadonlySet<string> },
): boolean {
  return layersAdmit(layers, slot.region, 'context')
}

/** Whether the hemisphere ghost shells are drawn — telencephalon + context. */
export function isGhostShellVisible(layers: {
  regions: ReadonlySet<string>
  kinds: ReadonlySet<string>
}): boolean {
  return layersAdmit(layers, 'telencephalon', 'context')
}

/**
 * The ordinary hemisphere opacity (§5's window is 0.12–0.18; the material
 * factory carries 0.14 as its own default, restated here because this pass
 * mutates opacity per frame and must restore the same number).
 */
const GHOST_SHELL_OPACITY = 0.14

/**
 * How far each hemisphere shell travels outward on ±x at `explode = 1`
 * (docs/TELENCEPHALON_PLAN.md §5 / plan step 6: "hemisphere shells separate
 * outward on ±x with a **documented, larger factor** than nuclei; keep the
 * nuclei rule untouched").
 *
 * The nucleus rule (`NucleusMesh`) is `explodeDirection(anchor) · explode · 6`,
 * so the largest nucleus offset is 6 au. A shell is ~110 au wide, 40 au deep and
 * shares its midline with its twin, so 6 au would not separate the pair at all —
 * it would read as a rendering jitter. 16 au is 2.67× the nucleus factor: at
 * `explode = 1` the two shells sit 32 au apart, the interhemispheric structures
 * (corpus callosum, fornix, ventricles) are exposed in the gap, and the shift
 * stays well inside the ±48 au canonical box (shell bbox ±56 au → ±72 au) so
 * nothing leaves the orbit/zoom envelope.
 *
 * Only the shells move: every other kind keeps exactly the v1 rule (`SceneLayers`
 * draws them at their canonical position, nuclei radially off their own anchor),
 * which is what "the nucleus rule is unchanged" means.
 */
const HEMISPHERE_EXPLODE_FACTOR = 16

/** One ghost material per shell — module singletons, like the envelope pass. */
const GHOST_SHELL_MATERIALS = TEL_HEMISPHERE_SHELLS.map(() =>
  createGhostShellMaterial(GHOST_SHELL_COLOR),
)

/** Shell slug → its module-singleton ghost material (stable, key-free). */
const GHOST_SHELL_MATERIAL_BY_SLUG = new Map<string, THREE.MeshPhysicalMaterial>(
  TEL_HEMISPHERE_SHELLS.map((shell, index) => [shell.slug, GHOST_SHELL_MATERIALS[index]]),
)

/**
 * One context-envelope slot: the record id it highlights under (`id`),
 * the manifest slug of its committed v2 GLB (`slug`), and the v1 fallback
 * geometry (envelope.ts parametric shape) shown until the GLB is ready — or
 * forever, when the slug has no GLB (REALISM_PLAN §2 constraint 6).
 */
interface EnvelopeSlot {
  id: string
  region: Region
  slug: string
  geometry: THREE.BufferGeometry
}

/** Schematic pineal body (v1 fallback for the ctx-pineal GLB slot). */
function createPinealFallback(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 24, 16)
  g.scale(1.8, 1.3, 2.4)
  g.translate(0, 20, -10.5)
  return g
}

/**
 * The envelope pass, v2 wiring (integration-v2): GLB slugs follow
 * anatomy-manifest.json; the fallback geometries are the exact v1 shapes so
 * the silhouette only ever improves.
 *
 * `id` is the **registry id the slot resolves to** — it is what a click,
 * hover and label use, and the P1 identity fix (`p1-identity`) replaced the
 * four internal `env-*` names that owned no record with the four new `ctx-*`
 * silhouette records registered in taxonomy.json (one slot per new record):
 *   env-medulla   → ctx-medulla-surface
 *   env-pons      → ctx-pons-surface
 *   env-midbrain  → ctx-midbrain-surface
 *   env-pineal    → ctx-pineal
 * Every slot id now exists in the registry, so no silhouette is unaddressable;
 * the pre-existing owners are unchanged (ctx-thalamus-envelope on the two
 * thalamus slots, ctx-hypothalamus-envelope, ctx-cerebellum on all three
 * cerebellar slots). Keep this table and `ENVELOPE_RECORD_IDS` in step with
 * the registry — the verifier asserts it.
 *
 * Exported (v11 §2) so `scripts/verify/view-filter-consistency.mjs` can execute
 * the envelope pass's OWN decision (`isEnvelopeSlotVisible`) over the real slot
 * list instead of a copy of it.
 */
export const ENVELOPE_SLOTS: EnvelopeSlot[] = [
  { id: 'ctx-medulla-surface', region: 'medulla', slug: 'ctx-medulla-surface', geometry: createMedullaEnvelope() },
  { id: 'ctx-pons-surface', region: 'pons', slug: 'ctx-pons-surface', geometry: createPonsEnvelope() },
  { id: 'ctx-midbrain-surface', region: 'midbrain', slug: 'ctx-midbrain-surface', geometry: createMidbrainEnvelope() },
  { id: 'ctx-thalamus-envelope', region: 'diencephalon', slug: 'ctx-thalamus-l', geometry: createThalamusEnvelopes()[0] },
  { id: 'ctx-thalamus-envelope', region: 'diencephalon', slug: 'ctx-thalamus-r', geometry: createThalamusEnvelopes()[1] },
  { id: 'ctx-hypothalamus-envelope', region: 'diencephalon', slug: 'ctx-hypothalamus-surface', geometry: createHypothalamusEnvelope() },
  { id: 'ctx-cerebellum', region: 'cerebellum', slug: 'ctx-cerebellum-l', geometry: createCerebellumEnvelopes()[0] },
  { id: 'ctx-cerebellum', region: 'cerebellum', slug: 'ctx-cerebellum-r', geometry: createCerebellumEnvelopes()[1] },
  { id: 'ctx-cerebellum', region: 'cerebellum', slug: 'ctx-cerebellar-vermis', geometry: createCerebellumEnvelopes()[2] },
  { id: 'ctx-pineal', region: 'diencephalon', slug: 'ctx-pineal', geometry: createPinealFallback() },
]

/**
 * Factory materials for the envelope pass — one per slot, created once at
 * module scope (scene lifetime = app lifetime, StrictMode-safe) so layer
 * toggles never rebuild or recompile them. Each already carries the shared
 * clipping planes from the factory.
 */
const ENVELOPE_MATERIALS: THREE.MeshPhysicalMaterial[] = ENVELOPE_SLOTS.map(() =>
  createContextMaterial(CONTEXT_COLOR),
)

/**
 * Records whose 3D body is the envelope pass instead of a per-record mesh.
 * Exported for the v11 §2 gate (see `ENVELOPE_SLOTS`).
 */
export const ENVELOPE_RECORD_IDS: ReadonlySet<string> = new Set([
  'ctx-thalamus-envelope',
  'ctx-hypothalamus-envelope',
  'ctx-cerebellum',
  // p1-identity: the four silhouettes that previously had no registry owner.
  // Without these the records would fall through to NucleusMesh and draw a
  // second, wrong v1 sphere on top of the envelope they describe.
  'ctx-medulla-surface',
  'ctx-pons-surface',
  'ctx-midbrain-surface',
  'ctx-pineal',
])

/* Ventricle envelope overrides are cached module-level (one instance each). */
const ventricleGeometryCache = new Map<string, THREE.BufferGeometry>()

function cachedVentricleGeometry(id: string): THREE.BufferGeometry | undefined {
  const cached = ventricleGeometryCache.get(id)
  if (cached) return cached
  const made = ventricleGeometryFor(id)
  if (made) {
    made.computeBoundingBox()
    ventricleGeometryCache.set(id, made)
  }
  return made
}

/** One envelope slot: v2 GLB when ready, v1 parametric geometry otherwise. */
function EnvelopeSlotMesh({
  slot,
  index,
  highlight,
}: {
  slot: EnvelopeSlot
  index: number
  highlight: Set<string> | null
}) {
  const regions = useAtlasStore((s) => s.layers.regions)
  const kinds = useAtlasStore((s) => s.layers.kinds)
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const asset = useAnatomyAsset(slot.slug)
  const geometry =
    asset.status === 'ready' && asset.geometry !== null ? asset.geometry : slot.geometry

  const visible = isEnvelopeSlotVisible(slot, { regions, kinds })
  const lit =
    (highlight !== null && highlight.has(slot.id)) ||
    hoveredId === slot.id ||
    selectedId === slot.id
  // The factory material reads opacity live (fresnel hook reuses the
  // `opacity` uniform), so mutating here matches the old JSX props.
  const material = ENVELOPE_MATERIALS[index]
  material.opacity = lit ? ENVELOPE_OPACITY_LIT : ENVELOPE_OPACITY
  material.emissiveIntensity = lit ? ENVELOPE_EMISSIVE_LIT : 0

  // Silhouettes are pickable (p1-identity, QUALITY_PLAN §2 item 8): a click
  // selects the registry record the slot stands for, exactly like
  // NucleusMesh.tsx. `ctx-thalamus-envelope` and `ctx-cerebellum` deliberately
  // own several slots each (both thalamic ovoids, the two hemispheres plus the
  // vermis bar) — a click anywhere on that body reports the single record that
  // describes it, which is the registry's own pairing.
  //
  // Click precedence still favours the real anatomy: R3F raycasts every hit
  // and dispatches nearest-first, so a nucleus inside the envelope is nearer to
  // the camera than the envelope surface that contains it and claims the click;
  // the envelope only answers clicks that miss every nucleus, which is exactly
  // the behaviour that was missing while the whole silhouette was inert. These
  // handlers never stopPropagation on a nucleus' behalf — stopPropagation here
  // only ends the event after this mesh has already won the pick.
  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(slot.id)
  }

  const handleOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (useAtlasStore.getState().hoveredId === slot.id) setHovered(null)
  }

  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    selectStructure(slot.id, { tab: null })
  }

  return (
    <mesh
      name={slot.slug}
      geometry={geometry}
      material={material}
      visible={visible}
      renderOrder={-1}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onPointerDown={handleDown}
    />
  )
}

function ContextEnvelopes({ highlight }: { highlight: Set<string> | null }) {
  // Module-level singletons: built once per session, never re-created or
  // disposed on remount (StrictMode-safe; scene lifetime = app lifetime).
  return (
    <group name="context-envelopes">
      {ENVELOPE_SLOTS.map((slot, index) => (
        <EnvelopeSlotMesh key={`${slot.slug}-${index}`} slot={slot} index={index} highlight={highlight} />
      ))}
    </group>
  )
}

/* ------------------------------------------- v7 hemisphere ghost shells */

/**
 * One hemisphere ghost shell (docs/TELENCEPHALON_PLAN.md §5, plan C9 step 3).
 *
 * This is a DEDICATED pass rather than an `ENVELOPE_SLOTS` entry because the
 * hemispheres need their own material preset (opacity ≈ 0.14, `depthWrite:false`,
 * front-face only — see `createGhostShellMaterial`) while every other context
 * silhouette keeps the shared 0.16 envelope material. Folding them into the
 * existing pass would have forced one opacity on both, which is exactly the
 * "cortex swamps the brainstem" risk §8 opens with.
 *
 * The shell answers clicks and hovers as `ctx-cerebral-cortex`, the record that
 * describes it; when that record is in the active preset's `hidden` set the
 * shell fades to `GHOST_OUTLINE_OPACITY` instead of disappearing, so the
 * brainstem-first framing keeps the brain's silhouette (§5 "cortex hidden
 * except a faint outline"). Its `renderOrder` is −2, in front of the context
 * envelopes' −1, so the largest and faintest surface is drawn first.
 */
function TelGhostShell({
  slug,
  side,
  highlight,
  outlineOnly,
}: {
  slug: string
  side: 'left' | 'right'
  highlight: Set<string> | null
  outlineOnly: boolean
}) {
  const regions = useAtlasStore((s) => s.layers.regions)
  const kinds = useAtlasStore((s) => s.layers.kinds)
  const explode = useAtlasStore((s) => s.explode)
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const asset = useAnatomyAsset(slug)
  // Before the GLB resolves there is no v1 stand-in at hemisphere scale (a
  // parametric hemisphere would be a lie about the shape), so the shell simply
  // is not drawn yet. §2 constraint 6 — "the app never blanks" — is satisfied by
  // the brainstem scene behind it, which is fully populated from its own parts.
  if (asset.status !== 'ready' || asset.geometry === null) return null

  const recordId = TEL_HEMISPHERE_RECORD_IDS[0]
  const visible = isGhostShellVisible({ regions, kinds })
  if (!visible) return null

  const lit =
    (highlight !== null && highlight.has(recordId)) ||
    hoveredId === recordId ||
    selectedId === recordId
  const material = GHOST_SHELL_MATERIAL_BY_SLUG.get(slug) ?? GHOST_SHELL_MATERIALS[0]
  material.opacity = lit ? ENVELOPE_OPACITY_LIT : outlineOnly ? GHOST_OUTLINE_OPACITY : GHOST_SHELL_OPACITY
  // The ghost is the outer envelope, so it never takes an emissive lift: at
  // hemisphere scale a lifted emissive would wash the brainstem out rather than
  // emphasise the cortex (unlike the nuclei, where an emissive lift reads as
  // "pay attention to me").
  material.emissiveIntensity = 0

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(recordId)
  }

  const handleOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (useAtlasStore.getState().hoveredId === recordId) setHovered(null)
  }

  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    selectStructure(recordId, { tab: null })
  }

  // §5 explode: outward on ±x only. +x is patient-left, so the left shell travels
  // that way and the right one mirrors it — the same sign convention the mirrored
  // left/right records use everywhere else in the scene.
  const offsetX = explode * HEMISPHERE_EXPLODE_FACTOR * (side === 'left' ? 1 : -1)

  return (
    <mesh
      name={slug}
      geometry={asset.geometry}
      material={material}
      position={[offsetX, 0, 0]}
      renderOrder={-2}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onPointerDown={handleDown}
    />
  )
}

/** The two hemisphere shells, drawn as the translucent cortical envelope. */
function TelGhostShells({ highlight, cortexHidden }: { highlight: Set<string> | null; cortexHidden: boolean }) {
  return (
    <group name="tel-hemisphere-ghosts">
      {TEL_HEMISPHERE_SHELLS.map((shell) => (
        <TelGhostShell
          key={shell.slug}
          slug={shell.slug}
          side={shell.side}
          highlight={highlight}
          outlineOnly={cortexHidden}
        />
      ))}
    </group>
  )
}

export default function SceneLayers() {
  const regions = useAtlasStore((s) => s.layers.regions)
  const kinds = useAtlasStore((s) => s.layers.kinds)
  const hidden = useAtlasStore((s) => s.layers.hidden)
  const emphasis = useAtlasStore((s) => s.layers.emphasis)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const syndromeId = useAtlasStore((s) => s.syndromeId)

  const highlight = useMemo(() => highlightIdSet({ selectedId, syndromeId }), [selectedId, syndromeId])

  /**
   * v11 §2 — the layer state, assembled ONCE so every pass below hands the SAME
   * object to the same decision (see `layersAdmit`). Memoized on the three store
   * sets, so a pass never closes over a stale layer state.
   */
  const layerSets = useMemo<SceneLayerSets>(
    () => ({ regions, kinds, hidden }),
    [regions, kinds, hidden],
  )

  const visibleStructures = useMemo(
    () => structures.filter((record) => isStructureVisible(record, layerSets)),
    [layerSets],
  )

  const visibleTracts = useMemo(
    () => tracts.filter((tract) => isTractVisible(tract.id, layerSets)),
    [layerSets],
  )

  /**
   * v14 §5 — the twelve cranial nerves as TUBES.
   *
   * A cranial nerve is the same object as a tract — a bundle that leaves the
   * brainstem at a root, crosses the cistern, traverses a named skull-base
   * foramen and reaches a target, i.e. a Catmull-Rom path with a radius — so it
   * renders through the SAME `<TractTube>` and the SAME gate as the 23 tracts,
   * and its own registry kind (`nerve`) decides visibility. The domains stay
   * separate: `src/data/tracts.json` is untouched by this run, so every
   * count-based gate that sweeps `tracts` (23) keeps its domain while this pass
   * covers the twelve.
   *
   * `visibleNerveCourses` is filtered by the one decision — `isTractVisible`,
   * which reads the record's own registry kind — so with `kinds.has('nerve')`
   * false all twelve disappear and the 23 tracts stay; with `kinds.has('tract')`
   * false the reverse. `scripts/verify/cranial-nerve-render.mjs` executes that
   * truth table rather than trusting this comment.
   */
  const visibleNerveCourses = useMemo(
    () => nerveCoursesVisible(NERVE_COURSES, layerSets),
    [layerSets],
  )

  /**
   * v17 §5 — the vessel courses as TUBES, the same pass one table over.
   *
   * An artery course is the same object a tract and a nerve are (a Catmull-Rom
   * path with a radius and a colour), so it renders through the SAME
   * `<TractTube>` and the SAME gate, and its own registry kind (`vessel`) plus
   * its own region (`vasculature`) decide visibility. The domains stay separate:
   * this pass adds COURSES beside the committed vessel dataset (owned by the
   * data tasks, untouched here), so every gate that sweeps the committed vessel
   * records keeps its domain while the granular branch tree is drawn as tubes.
   */
  const visibleVesselCourses = useMemo(
    () => vesselCoursesVisible(VESSEL_COURSES, layerSets),
    [layerSets],
  )

  return (
    <group name="scene-layers">
      <ContextEnvelopes highlight={highlight} />
      {/* §5 cortex ghost: the two hemisphere shells at their own material. */}
      <TelGhostShells highlight={highlight} cortexHidden={hidden.has(TEL_HEMISPHERE_RECORD_IDS[0])} />
      {/* v9 somatotopy: one oriented patch per M1/S1 segment, on the same ribbon.
          `SomatotopyOverlay` carries its own region+kind gate (and the same
          highlight/dimming contract), so it needs no props — only the records are
          filtered out of the structure pass above, so nothing is drawn twice. */}
      <SomatotopyOverlay />
      {visibleStructures.map((record) => {
        if (ENVELOPE_RECORD_IDS.has(record.id)) return null // envelope pass above
        // v9 (PLAN.md §5.1): the 16 somatotopic segment records have no GLB and no
        // placeholder ellipsoid of their own — their 3D body is the oriented patch
        // drawn by <SomatotopyOverlay> below, so the ordinary pass must skip them
        // rather than draw a second, wrong sphere on the same spot.
        if (SOMATOTOPY_RECORD_IDS.has(record.id)) return null
        // v14 §5 — a nerve that now has a COURSE must not also keep its
        // schematic placement ellipsoid: one record, one body.
        //
        // WHERE this suppression belongs is a decision, and this is the right
        // place: `isStructureVisible` is THE layer decision (its four-state
        // truth table is asserted by `view-filter-consistency`), so a
        // course-bearing nerve is still ADMITTED by the area/system predicate —
        // it simply is not drawn by this pass, exactly like the envelope and
        // somatotopy records above. Putting the suppression inside
        // `isStructureVisible` would have made "area off ⇒ hidden" stop being
        // the whole story there, and the gate caught it.
        //
        // What is suppressed is the ellipsoid only. The v13 slice drew every
        // `nrv-*` record as a unit sphere scaled by `size3d` at `origin3d` (the
        // fallback branch of `NucleusMesh`, since `anatomySlugsForRecord` has no
        // link for a nerve id) — that is the "blob" the user sees beside the
        // course. The record itself stays complete: `origin3d`, `size3d`,
        // `function`, `modality`, `course` and the clinical items are still read
        // by the InfoPanel, the content gates and the course anchor chain.
        // v18 — a record is suppressed when IT owns a course, or when it is the
        // GROUP HEAD of courses its children carry (the lenticulostriate parent
        // `vasc-lateral-lenticulostriate-arteries` owns no path itself — its four
        // children do — so without the group check the parent's schematic
        // ellipsoid kept rendering beside the children's tubes, which is exactly
        // the "blob" the user flagged).
        //
        // v18b MEASUREMENT — the blob that survived v17/v18 was NOT the
        // lenticulostriate record: `hasVesselCourse('vasc-lenticulostriate-
        // arteries')` is true (it is a drawing course), so it has drawn only a
        // tube since v17. The last schematic body on screen was
        // `vasc-posterior-medial-choroidal-artery`: it declares
        // `vasc-posterior-medial-choroidal-artery-{l,r}` in `ANATOMY_RECORD_LINKS`
        // but NEITHER slug is in the manifest, so `NucleusMesh` settled to its
        // unit-sphere fallback — a crimson 0.5-opacity sphere at origin3d
        // [14, 18, −6], size3d [4, 4, 6], drawn twice because the record is
        // `paired`. It is retired the same way as the lenticulostriate family:
        // by the COURSE it now owns in `vasculature-courses.ts` (measured from
        // the committed P2-l, ctx-midbrain-surface and ctx-choroid-plexus-l
        // meshes), which makes this line true for it. The invariant is
        // "one record, one body": a record's body is a committed `LINKS` GLB XOR
        // a course — never both, and never a declared-but-unbaked slug.
        // v19 (audit dc-01) — ONE guard, not two. A second, dedicated line
        // testing only the vessel predicate used to sit below this one and was
        // described as "the line that removes the two red lenticulostriate
        // blobs"; because this guard already tested the same predicate, that line
        // could never run. The vessel term lives here, where it is reachable, and
        // `hasVesselCourse` is true for exactly the ids the course table owns —
        // so the ellipsoid stops being drawn for those and ONLY those; the record
        // keeps its registry row, its `territory[]`, its `supply[]` syndrome links
        // and its InfoPanel page, and the body it keeps is the procedural tube
        // below ("one record, one body"). `verify:vessel-render` pinned the
        // deleted line's own source text; that pin now fails and must be
        // re-pointed at this guard (gate-flip handoff recorded in
        // docs/audit/v19/CORRECTIONS.md). The deleted line's text is deliberately
        // NOT quoted here: a comment must not be able to satisfy a source-reading
        // assertion.
        if (hasNerveCourse(record.id) || hasVesselCourse(record.id) || hasVesselCourseGroup(record.id)) return null
        // Ventricle records keep their parametric v1 shape as the fallback;
        // NucleusMesh upgrades to the committed GLB when the manifest has one.
        const override = record.kind === 'ventricle' ? cachedVentricleGeometry(record.id) : undefined
        // v7 (plan C9): every other record resolves its 3D body through
        // ANATOMY_RECORD_LINKS. Records with no baked body never reach here at
        // all — `isGhostOrContentOnly` filtered them above — so the
        // `anatomySlug` a record hands NucleusMesh is always either a real
        // committed GLB or the record id itself (which is a manifest slug for
        // the whole v1–v6 set, so nothing below y = +45 changes).
        //
        // v8: a record may now own MORE THAN ONE body per side (the MCA's
        // M1+M2, the PCA's P1+P2) and may name its right side explicitly
        // (`bodyRight`) where the two sides are not mirror images (every
        // artery). `anatomySlugsForRecord` answers both; a null right side is
        // the v1–v7 mirror, which is what every link that predates v8 returns.
        const sides = anatomySlugsForRecord(record.id)
        const leftSlugs = sides ? sides.left : [record.id]
        const rightSlugs = sides ? sides.right : null
        const hintOverride = RECORD_MATERIAL_OVERRIDES[record.id]
        const emphasised = emphasis.has(record.id) && isSolidKind(record.kind)
        const body = (slug: string, mirrored: boolean, key: string) => (
          <NucleusMesh
            key={key}
            record={record}
            mirrored={mirrored}
            highlight={highlight}
            geometry={override}
            anatomySlug={slug}
            materialHint={hintOverride}
            emphasised={emphasised}
          />
        )
        // Draw the right side when the record is paired OR when it named explicit
        // right bodies (the chiasm is `midline` in the registry — it is a crossing
        // — yet its two hemi-chiasm meshes are both real geometry).
        if (record.laterality === 'paired' || rightSlugs !== null) {
          return (
            <Fragment key={record.id}>
              {leftSlugs.map((slug) => body(slug, false, slug))}
              {(rightSlugs ?? leftSlugs).map((slug) => body(slug, rightSlugs === null, `${slug}::right`))}
            </Fragment>
          )
        }
        return <Fragment key={record.id}>{leftSlugs.map((slug) => body(slug, false, slug))}</Fragment>
      })}
      {visibleTracts.map((tract) => {
        // v17 — paired tracts draw their MIRROR-IMAGE twin (x → −x) so both sides
        // of a bilateral pathway are on screen. The authored chain is one side's
        // anatomy, and one-sided rendering is what made crossing
        // (ipsilateral → contralateral) hard to track. The twin selects, hovers
        // and highlights as the same record; only its geometry is mirrored.
        // Tracts registered `midline` (the decussations, the commissures) stay
        // single — mirroring those would duplicate the crossing itself.
        const paired = getTaxonomyEntry(tract.id)?.laterality === 'paired'
        return (
          <Fragment key={tract.id}>
            <TractTube tract={tract} highlight={highlight} />
            {paired && <TractTube tract={tract} highlight={highlight} mirrored />}
          </Fragment>
        )
      })}
      {/* v14 §5 — the twelve cranial-nerve courses, same tube, same gate, their
          OWN registry kind. Each is a `NerveCourseRecord`: a superset of
          `TractRecord` (waypoints + tubeRadius + direction + colour) carrying
          the `region` and `foramen` a nerve needs, so `TractTube` needs no
          branch and no new renderer exists. */}
      {visibleNerveCourses.map((course) => {
        // v17 — same mirror rule as the tracts above: a paired nerve draws its
        // twin on the other side, so a crossing can be followed from the
        // ipsilateral root to the contralateral target.
        const paired = getTaxonomyEntry(course.id)?.laterality === 'paired'
        return (
          <Fragment key={course.id}>
            <TractTube tract={course} highlight={highlight} />
            {paired && <TractTube tract={course} highlight={highlight} mirrored />}
          </Fragment>
        )
      })}
      {/* v17 §5 — the VESSEL courses: the same tube, the same gate, their OWN
          registry kind. Each is a `VesselCourseRecord` (a `TractRecord` superset
          carrying the parent artery, the hugged surface and the basis of the
          path), so `TractTube` needs no branch and no second renderer exists.
          `isPairedVessel` prefers the registry's own `laterality` and falls back
          to the record's, so a paired artery draws BOTH sides (`x → −x` twin)
          while a midline one (the anterior spinal artery, the vermian branches)
          stays single — mirroring a midline vessel would double it. */}
      {visibleVesselCourses.map((course) => {
        const paired = isPairedVessel(course, getTaxonomyEntry(course.id)?.laterality)
        return (
          <Fragment key={course.id}>
            <TractTube tract={course} highlight={highlight} variant="vessel" />
            {paired && <TractTube tract={course} highlight={highlight} mirrored variant="vessel" />}
          </Fragment>
        )
      })}
    </group>
  )
}
