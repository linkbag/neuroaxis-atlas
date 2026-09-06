/**
 * TractTube — one ascending/descending pathway (plan §5 "Tracts"):
 * TubeGeometry(CatmullRomCurve3(waypoints), 64, tubeRadius, 10) with the
 * record's direction color (ascending blue family, descending violet, mixed
 * light violet — authored per tract in tracts.json). Slight emissive tint;
 * the selected tract pulses its emissiveIntensity via a useFrame lerp.
 * Tubes are clickable exactly like nuclei and share the clipping planes.
 */
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { TractRecord } from '../../types'
import { useAtlasStore } from '../../state/store'
import { toCatmullRom } from '../../geometry/curves'
import { ALL_CLIP_PLANES } from './clipPlanes'

/** Tube geometries are cached module-level so layer toggles never rebuild. */
const tubeCache = new Map<string, THREE.TubeGeometry>()

/** 64 tubular segments × 10 radial segments per plan §5. */
const TUBULAR_SEGMENTS = 64
const RADIAL_SEGMENTS = 10

function tubeGeometryFor(tract: TractRecord): THREE.TubeGeometry {
  const cached = tubeCache.get(tract.id)
  if (cached) return cached
  const curve = toCatmullRom(tract.waypoints)
  const geometry = new THREE.TubeGeometry(curve, TUBULAR_SEGMENTS, tract.tubeRadius, RADIAL_SEGMENTS, false)
  tubeCache.set(tract.id, geometry)
  return geometry
}

export interface TractTubeProps {
  tract: TractRecord
  /** Ids kept lit while everything else dims (selection or open syndrome). */
  highlight: Set<string> | null
}

export default function TractTube({ tract, highlight }: TractTubeProps) {
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const geometry = useMemo(() => tubeGeometryFor(tract), [tract])
  // If this component ever unmounts permanently the cache still holds the
  // geometry for the next mount — disposal happens only at tube replacement,
  // which the cache guards against. Nothing to clean per-mount.

  const isSelected = selectedId === tract.id
  const isHovered = hoveredId === tract.id
  const syndromeLit = highlight !== null && highlight.has(tract.id) && !isSelected
  const dimmed = highlight !== null && !highlight.has(tract.id)

  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  // Selected tubes breathe: emissiveIntensity lerps toward an oscillating
  // target every frame (plan §5 hover/selection emphasis).
  useFrame((state, delta) => {
    const material = materialRef.current
    if (!material) return
    const time = state.clock.elapsedTime
    const target = isSelected
      ? 0.45 + 0.3 * Math.sin(time * 4)
      : syndromeLit
        ? 0.35
        : isHovered
          ? 0.28
          : 0.08
    material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, target, Math.min(1, delta * 8))
  })

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(tract.id)
  }

  const handleOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (useAtlasStore.getState().hoveredId === tract.id) setHovered(null)
  }

  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    selectStructure(tract.id, { tab: null })
  }

  const midpoint = useMemo(() => {
    const p = toCatmullRom(tract.waypoints).getPoint(0.5)
    return [p.x, p.y, p.z] as [number, number, number]
  }, [tract])

  return (
    <mesh
      geometry={geometry}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onPointerDown={handleDown}
    >
      <meshStandardMaterial
        ref={materialRef}
        color={tract.color}
        roughness={0.5}
        metalness={0.1}
        emissive={tract.color}
        emissiveIntensity={0.08}
        transparent
        opacity={dimmed ? 0.15 : 1}
        depthWrite={!dimmed}
        clippingPlanes={ALL_CLIP_PLANES}
      />
      {labelVisibility && (isSelected || isHovered) ? (
        <Html position={midpoint} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
          <span className={`label3d${isSelected ? ' is-selected' : ' is-hovered'}`}>{tract.name}</span>
        </Html>
      ) : null}
    </mesh>
  )
}

/** Test/inspection hook: number of cached tube geometries. */
export function tubeCacheSize(): number {
  return tubeCache.size
}

/** Dispose every cached tube geometry (host app teardown only). */
export function disposeTubeCache(): void {
  for (const geometry of tubeCache.values()) geometry.dispose()
  tubeCache.clear()
}
