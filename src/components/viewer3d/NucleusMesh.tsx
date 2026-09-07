/**
 * NucleusMesh — one renderable structure record (plan §5 "Nuclei"; realism
 * plan render-pipeline + integration-v2 tasks): geometry comes, in priority
 * order, from
 *   1. the committed v2 GLB for `anatomySlug` (src/geometry/anatomyAssets.ts,
 *      canonical-space geometry from anatomy-manifest.json; the manifest
 *      `materialHint` picks the factory preset and the manifest `centroid`
 *      drives the explode offset — §2 constraints 4/6), or
 *   2. the `geometry` prop (parametric envelope override — kept as the v1
 *      fallback while a GLB loads or when no GLB exists), or
 *   3. the shared unit sphere scaled by `size3d` at `origin3d` (v1 primitive).
 * Materials come from the central factory (src/geometry/materials.ts), so
 * clipping planes and PBR presets are applied in one place; the manifest
 * `materialHint` can be forced via the `materialHint` prop, otherwise it is
 * derived from the record kind (ventricle → csf, context → context, else
 * nucleus). Emissive glow on hover/select is preserved but softer (ACES + IBL
 * read brighter than the v1 raw output), dimming while another record is
 * highlighted. Paired records are rendered twice by SceneLayers (mirrored at
 * −x; the GLB variant mirrors the parsed geometry).
 *
 * Explode (plan §1.1 feature 3): nucleus-kind records shift radially — GLB
 * meshes by the normalized [x, z] direction of their MANIFEST CENTROID, v1
 * primitives by their (instance) origin — × explode × 6; every other kind
 * stays put.
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { StructureRecord } from '../../types'
import { useAtlasStore } from '../../state/store'
import { explodeDirection } from '../../geometry/curves'
import { useAnatomyAsset } from '../../geometry/anatomyAssets'
import { makeAnatomyMaterial, type MaterialHint } from '../../geometry/materials'

/** One shared unit sphere for every ellipsoid record (plan §5). */
export const SHARED_NUCLEUS_GEOMETRY = new THREE.SphereGeometry(1, 24, 16)

/** Translucency per kind; solid kinds stay opaque unless dimmed. */
const KIND_OPACITY: Record<StructureRecord['kind'], number> = {
  nucleus: 1,
  tract: 1,
  surface: 1,
  vessel: 0.5,
  ventricle: 0.42,
  context: 0.22,
}

/** Kind → factory preset when no manifest hint is supplied. */
function hintForKind(kind: StructureRecord['kind']): MaterialHint {
  if (kind === 'ventricle') return 'csf'
  if (kind === 'context') return 'context'
  return 'nucleus'
}

/** Selection emphasis, softer than v1 (0.55/0.42/0.28) for ACES + IBL. */
const EMISSIVE_SELECTED = 0.38
const EMISSIVE_SYNDROME = 0.28
const EMISSIVE_HOVER = 0.16

export interface NucleusMeshProps {
  record: StructureRecord
  /** Mirrored instance of a paired record (position x → −x). */
  mirrored?: boolean
  /** Manifest slug of the committed v2 GLB (falls back to v1 primitives). */
  anatomySlug?: string
  /** Pre-built canonical-space geometry (envelope override); ignores origin/scale. */
  geometry?: THREE.BufferGeometry
  /** Overrides the kind-derived factory preset (anatomy-manifest materialHint). */
  materialHint?: MaterialHint
  /** Ids kept lit while everything else dims (selection or open syndrome). */
  highlight: Set<string> | null
}

export default function NucleusMesh({
  record,
  mirrored = false,
  anatomySlug,
  geometry,
  materialHint,
  highlight,
}: NucleusMeshProps) {
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)
  const explode = useAtlasStore((s) => s.explode)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  // v2 GLB for this slug (manifest entry + parsed geometry); degrades to
  // 'fallback' for unknown slugs / failed loads — the v1 shape keeps showing.
  const asset = useAnatomyAsset(anatomySlug, mirrored)
  const glbGeometry = asset.status === 'ready' ? asset.geometry : null

  // Context meshes are passive backdrop (plan §11: envelopes non-pickable);
  // everything else is selectable directly in 3D.
  const pickable = record.kind !== 'context'

  const isSelected = selectedId === record.id
  const isHovered = hoveredId === record.id
  const syndromeLit = highlight !== null && highlight.has(record.id) && !isSelected
  const dimmed = highlight !== null && !highlight.has(record.id)

  // Factory material, one per mesh instance (selection mutates emissive
  // intensity per instance). three re-acquires disposed materials, so the
  // StrictMode setup→cleanup→setup cycle is safe. The GLB's manifest
  // materialHint wins over the kind-derived preset once the mesh is ready.
  const hint: MaterialHint =
    materialHint ?? (glbGeometry && asset.part ? asset.part.materialHint : undefined) ?? hintForKind(record.kind)
  const material = useMemo(
    () => makeAnatomyMaterial(hint, record.color),
    [hint, record],
  )
  useEffect(() => () => material.dispose(), [material])

  // Position: GLB meshes are baked in canonical space (origin), everything
  // else sits at origin3d of this instance (paired mirror flips x). Nuclei of
  // kind 'nucleus' additionally shift radially with the explode factor — from
  // the manifest centroid for GLB meshes (§2 constraint 4), from the record
  // origin for v1 primitives.
  const origin = record.origin3d ?? [0, 0, 0]
  const centroid = asset.part?.centroid
  const anchor: [number, number, number] = glbGeometry && centroid
    ? [mirrored ? -centroid[0] : centroid[0], centroid[1], centroid[2]]
    : [mirrored ? -origin[0] : origin[0], origin[1], origin[2]]
  const [dirX, dirZ] = record.kind === 'nucleus' ? explodeDirection(anchor) : [0, 0]
  const position: [number, number, number] = glbGeometry
    ? [dirX * explode * 6, 0, dirZ * explode * 6]
    : [anchor[0] + dirX * explode * 6, anchor[1], anchor[2] + dirZ * explode * 6]
  const scale: [number, number, number] = glbGeometry || geometry ? [1, 1, 1] : (record.size3d ?? [1, 1, 1])

  material.opacity = dimmed ? 0.15 : KIND_OPACITY[record.kind]
  material.depthWrite = !dimmed && KIND_OPACITY[record.kind] >= 1
  material.emissiveIntensity = isSelected
    ? EMISSIVE_SELECTED
    : syndromeLit
      ? EMISSIVE_SYNDROME
      : isHovered
        ? EMISSIVE_HOVER
        : 0

  // Label floats above the shape (bounding box for canonical-space geometry).
  const shownGeometry = glbGeometry ?? geometry
  const labelY = shownGeometry
    ? (shownGeometry.boundingBox?.max.y ?? 0) + 0.8
    : scale[1] + 0.8

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    if (!pickable) return
    event.stopPropagation()
    setHovered(record.id)
  }

  const handleOut = (event: ThreeEvent<PointerEvent>) => {
    if (!pickable) return
    event.stopPropagation()
    if (useAtlasStore.getState().hoveredId === record.id) setHovered(null)
  }

  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    if (!pickable) return
    event.stopPropagation()
    selectStructure(record.id, { tab: null })
  }

  return (
    <mesh
      name={anatomySlug ?? record.id}
      geometry={shownGeometry ?? SHARED_NUCLEUS_GEOMETRY}
      material={material}
      position={position}
      scale={scale}
      renderOrder={record.kind === 'context' || record.kind === 'ventricle' ? -1 : 0}
      {...(pickable
        ? {
            onPointerOver: handleOver,
            onPointerOut: handleOut,
            onPointerDown: handleDown,
          }
        : { raycast: () => null })}
    >
      {labelVisibility && (isSelected || isHovered) ? (
        <Html
          position={[0, labelY, 0]}
          zIndexRange={[30, 10]}
          style={{ pointerEvents: 'none' }}
        >
          <span className={`label3d${isSelected ? ' is-selected' : ' is-hovered'}`}>{record.name}</span>
        </Html>
      ) : null}
    </mesh>
  )
}
