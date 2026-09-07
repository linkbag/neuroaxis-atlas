/**
 * SceneLayers — maps the authored atlas data onto 3D (plan §5, viewer3d task;
 * realism plan render-pipeline + integration-v2 tasks):
 *  - translucent context envelopes: per slot, the committed v2 GLB from
 *    src/assets/anatomy (resolved via anatomyAssets.ts) when the manifest has
 *    the slug, otherwise the v1 parametric lathe/ellipsoid from
 *    src/geometry/envelope.ts (KEPT as the instant fallback — the app never
 *    blanks). Envelopes are non-pickable, depthWrite false, renderOrder −1,
 *    gated by region + 'context' layers, and use the central PBR material
 *    factory (src/geometry/materials.ts) so clipping planes and presets come
 *    from one place;
 *  - one NucleusMesh per structure record (paired records get a mirrored −x
 *    instance); each record passes its id as the manifest slug so NucleusMesh
 *    upgrades to the committed GLB when one exists and keeps the v1
 *    primitive (sphere or ventricle envelope override) otherwise;
 *  - one TractTube per tract record (region via the taxonomy registry) —
 *    tracts stay procedural (realism plan §7 tracts-upgrade).
 *
 * Selection/hover dimming: the lit id set (open syndrome wins over a plain
 * selection — store.highlightIdSet) stays at full brightness/emissive while
 * every other mesh dims to 0.15 opacity. Explode is consumed inside
 * NucleusMesh (v2 meshes offset by manifest centroid) so tube geometries
 * never rebuild.
 */
import { Fragment, useMemo } from 'react'
import * as THREE from 'three'
import type { Region } from '../../types'
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
import { createContextMaterial } from '../../geometry/materials'
import { useAnatomyAsset } from '../../geometry/anatomyAssets'
import NucleusMesh from './NucleusMesh'
import TractTube from './TractTube'

/** Envelope gray (plan §6 context palette) — fed to the factory material. */
const CONTEXT_COLOR = '#94a3b8'
const ENVELOPE_OPACITY = 0.16
const ENVELOPE_OPACITY_LIT = 0.45
/** Selection glow on envelopes, softer than the v1 0.4 (ACES + IBL read brighter). */
const ENVELOPE_EMISSIVE_LIT = 0.22

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
 */
const ENVELOPE_SLOTS: EnvelopeSlot[] = [
  { id: 'env-medulla', region: 'medulla', slug: 'ctx-medulla-surface', geometry: createMedullaEnvelope() },
  { id: 'env-pons', region: 'pons', slug: 'ctx-pons-surface', geometry: createPonsEnvelope() },
  { id: 'env-midbrain', region: 'midbrain', slug: 'ctx-midbrain-surface', geometry: createMidbrainEnvelope() },
  { id: 'ctx-thalamus-envelope', region: 'diencephalon', slug: 'ctx-thalamus-l', geometry: createThalamusEnvelopes()[0] },
  { id: 'ctx-thalamus-envelope', region: 'diencephalon', slug: 'ctx-thalamus-r', geometry: createThalamusEnvelopes()[1] },
  { id: 'ctx-hypothalamus-envelope', region: 'diencephalon', slug: 'ctx-hypothalamus-surface', geometry: createHypothalamusEnvelope() },
  { id: 'ctx-cerebellum', region: 'cerebellum', slug: 'ctx-cerebellum-l', geometry: createCerebellumEnvelopes()[0] },
  { id: 'ctx-cerebellum', region: 'cerebellum', slug: 'ctx-cerebellum-r', geometry: createCerebellumEnvelopes()[1] },
  { id: 'ctx-cerebellum', region: 'cerebellum', slug: 'ctx-cerebellar-vermis', geometry: createCerebellumEnvelopes()[2] },
  { id: 'env-pineal', region: 'diencephalon', slug: 'ctx-pineal', geometry: createPinealFallback() },
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

/** Records whose 3D body is the envelope pass instead of a per-record mesh. */
const ENVELOPE_RECORD_IDS = new Set(['ctx-thalamus-envelope', 'ctx-hypothalamus-envelope', 'ctx-cerebellum'])

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

  const asset = useAnatomyAsset(slot.slug)
  const geometry =
    asset.status === 'ready' && asset.geometry !== null ? asset.geometry : slot.geometry

  const visible = regions.has(slot.region) && kinds.has('context')
  const lit =
    (highlight !== null && highlight.has(slot.id)) ||
    hoveredId === slot.id ||
    selectedId === slot.id
  // The factory material reads opacity live (fresnel hook reuses the
  // `opacity` uniform), so mutating here matches the old JSX props.
  const material = ENVELOPE_MATERIALS[index]
  material.opacity = lit ? ENVELOPE_OPACITY_LIT : ENVELOPE_OPACITY
  material.emissiveIntensity = lit ? ENVELOPE_EMISSIVE_LIT : 0
  return (
    <mesh
      name={slot.slug}
      geometry={geometry}
      material={material}
      visible={visible}
      renderOrder={-1}
      raycast={() => null}
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

export default function SceneLayers() {
  const regions = useAtlasStore((s) => s.layers.regions)
  const kinds = useAtlasStore((s) => s.layers.kinds)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const syndromeId = useAtlasStore((s) => s.syndromeId)

  const highlight = useMemo(() => highlightIdSet({ selectedId, syndromeId }), [selectedId, syndromeId])

  const visibleStructures = useMemo(
    () => structures.filter((record) => regions.has(record.region) && kinds.has(record.kind)),
    [regions, kinds],
  )

  const visibleTracts = useMemo(() => {
    if (!kinds.has('tract')) return []
    return tracts.filter((tract) => {
      // TractRecord carries no region; the taxonomy registry is authoritative.
      const entry = getTaxonomyEntry(tract.id)
      return entry ? regions.has(entry.region) : true
    })
  }, [regions, kinds])

  return (
    <group name="scene-layers">
      <ContextEnvelopes highlight={highlight} />
      {visibleStructures.map((record) => {
        if (ENVELOPE_RECORD_IDS.has(record.id)) return null // envelope pass above
        // Ventricle records keep their parametric v1 shape as the fallback;
        // NucleusMesh upgrades to the committed GLB when the manifest has one.
        const override = record.kind === 'ventricle' ? cachedVentricleGeometry(record.id) : undefined
        if (record.laterality === 'paired') {
          return (
            <Fragment key={record.id}>
              <NucleusMesh record={record} highlight={highlight} geometry={override} anatomySlug={record.id} />
              <NucleusMesh record={record} mirrored highlight={highlight} geometry={override} anatomySlug={record.id} />
            </Fragment>
          )
        }
        return (
          <NucleusMesh key={record.id} record={record} highlight={highlight} geometry={override} anatomySlug={record.id} />
        )
      })}
      {visibleTracts.map((tract) => (
        <TractTube key={tract.id} tract={tract} highlight={highlight} />
      ))}
    </group>
  )
}
