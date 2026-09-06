/**
 * SceneLayers — maps the authored atlas data onto 3D (plan §5, viewer3d task):
 *  - translucent context envelopes from src/geometry/envelope.ts (non-pickable,
 *    depthWrite false, renderOrder −1, gated by region + 'context' layers);
 *  - one NucleusMesh per structure record (paired records get a mirrored −x
 *    instance); ventricle records with parametric shapes use their envelope
 *    geometry override;
 *  - one TractTube per tract record (region via the taxonomy registry).
 *
 * Selection/hover dimming: the lit id set (open syndrome wins over a plain
 * selection — store.highlightIdSet) stays at full brightness/emissive while
 * every other mesh dims to 0.15 opacity. Explode is consumed inside
 * NucleusMesh so tube geometries never rebuild.
 */
import { Fragment, useMemo } from 'react'
import * as THREE from 'three'
import { getTaxonomyEntry, structures, tracts } from '../../data/load'
import { highlightIdSet, useAtlasStore } from '../../state/store'
import { buildContextEnvelopes, ventricleGeometryFor } from '../../geometry/envelope'
import NucleusMesh from './NucleusMesh'
import TractTube from './TractTube'
import { ALL_CLIP_PLANES } from './clipPlanes'

/** Envelope gray (plan §6 context palette). */
const CONTEXT_COLOR = '#94a3b8'
const ENVELOPE_OPACITY = 0.16
const ENVELOPE_OPACITY_LIT = 0.45

/** Parametric context envelopes, built once per session (module singleton). */
const CONTEXT_ENVELOPE_PARTS = buildContextEnvelopes()

/** Records whose 3D body is the parametric envelope instead of an ellipsoid. */
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

function ContextEnvelopes({ highlight }: { highlight: Set<string> | null }) {
  const regions = useAtlasStore((s) => s.layers.regions)
  const kinds = useAtlasStore((s) => s.layers.kinds)
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)

  // Module-level singleton: built once per session, never re-created or
  // disposed on remount (StrictMode-safe; scene lifetime = app lifetime).
  return (
    <group name="context-envelopes">
      {CONTEXT_ENVELOPE_PARTS.map((part, index) => {
        const visible = regions.has(part.region) && kinds.has('context')
        const lit =
          (highlight !== null && highlight.has(part.id)) ||
          hoveredId === part.id ||
          selectedId === part.id
        return (
          <mesh
            key={`${part.id}-${index}`}
            geometry={part.geometry}
            visible={visible}
            renderOrder={-1}
            raycast={() => null}
          >
            <meshStandardMaterial
              color={CONTEXT_COLOR}
              roughness={1}
              metalness={0}
              emissive={CONTEXT_COLOR}
              emissiveIntensity={lit ? 0.4 : 0}
              transparent
              opacity={lit ? ENVELOPE_OPACITY_LIT : ENVELOPE_OPACITY}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={ALL_CLIP_PLANES}
            />
          </mesh>
        )
      })}
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
        if (ENVELOPE_RECORD_IDS.has(record.id)) return null // parametric envelope pass
        const override = record.kind === 'ventricle' ? cachedVentricleGeometry(record.id) : undefined
        if (record.laterality === 'paired') {
          return (
            <Fragment key={record.id}>
              <NucleusMesh record={record} highlight={highlight} geometry={override} />
              <NucleusMesh record={record} mirrored highlight={highlight} geometry={override} />
            </Fragment>
          )
        }
        return <NucleusMesh key={record.id} record={record} highlight={highlight} geometry={override} />
      })}
      {visibleTracts.map((tract) => (
        <TractTube key={tract.id} tract={tract} highlight={highlight} />
      ))}
    </group>
  )
}
