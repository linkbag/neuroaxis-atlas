/**
 * NucleusMesh — one renderable structure record (plan §5 "Nuclei"):
 * a unit sphere (shared geometry) scaled by `size3d`, positioned at
 * `origin3d`; paired records are rendered twice by SceneLayers (mirrored at
 * −x). Materials are MeshStandardMaterial (roughness 0.55) with emissive glow
 * on hover/select, dimming while another record is highlighted, and the three
 * shared clipping planes. Ventricle records whose 3D shape is more than an
 * ellipsoid (aqueduct tube / 4th-ventricle tent / 3rd-ventricle slit) receive
 * their pre-built envelope geometry via the `geometry` prop.
 *
 * Explode (plan §1.1 feature 3): nucleus-kind records shift radially by the
 * normalized [x, z] direction of their (instance) origin × explode × 6; every
 * other kind stays put.
 */
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { StructureRecord } from '../../types'
import { useAtlasStore } from '../../state/store'
import { ALL_CLIP_PLANES } from './clipPlanes'
import { explodeDirection } from '../../geometry/curves'

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

export interface NucleusMeshProps {
  record: StructureRecord
  /** Mirrored instance of a paired record (position x → −x). */
  mirrored?: boolean
  /** Pre-built canonical-space geometry (envelope override); ignores origin/scale. */
  geometry?: THREE.BufferGeometry
  /** Ids kept lit while everything else dims (selection or open syndrome). */
  highlight: Set<string> | null
}

export default function NucleusMesh({ record, mirrored = false, geometry, highlight }: NucleusMeshProps) {
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)
  const explode = useAtlasStore((s) => s.explode)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  // Context meshes are passive backdrop (plan §11: envelopes non-pickable);
  // everything else is selectable directly in 3D.
  const pickable = record.kind !== 'context'

  const isSelected = selectedId === record.id
  const isHovered = hoveredId === record.id
  const syndromeLit = highlight !== null && highlight.has(record.id) && !isSelected
  const dimmed = highlight !== null && !highlight.has(record.id)

  // Position: origin3d of this instance (paired mirror flips x), nuclei of
  // kind 'nucleus' additionally shift radially with the explode factor.
  const origin = record.origin3d ?? [0, 0, 0]
  const x = mirrored ? -origin[0] : origin[0]
  const y = origin[1]
  const z = origin[2]
  const [dirX, dirZ] = record.kind === 'nucleus' ? explodeDirection([x, y, z]) : [0, 0]
  const position: [number, number, number] = geometry
    ? [0, 0, 0] // envelope override is already placed in canonical space
    : [x + dirX * explode * 6, y, z + dirZ * explode * 6]
  const scale: [number, number, number] = geometry ? [1, 1, 1] : (record.size3d ?? [1, 1, 1])

  const opacity = dimmed ? 0.15 : KIND_OPACITY[record.kind]
  const emissiveIntensity = isSelected ? 0.55 : syndromeLit ? 0.42 : isHovered ? 0.28 : 0

  // Label floats above the shape (bounding box for envelope overrides).
  const labelY = geometry
    ? (geometry.boundingBox?.max.y ?? 0) + 0.8
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
      geometry={geometry ?? SHARED_NUCLEUS_GEOMETRY}
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
      <meshStandardMaterial
        color={record.color}
        roughness={0.55}
        metalness={0.05}
        emissive={record.color}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={opacity}
        depthWrite={!dimmed && KIND_OPACITY[record.kind] >= 1}
        side={record.kind === 'ventricle' || record.kind === 'context' ? THREE.DoubleSide : THREE.FrontSide}
        clippingPlanes={ALL_CLIP_PLANES}
      />
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
