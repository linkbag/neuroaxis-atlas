/**
 * SpinalBodyMesh — one pickable spinal body in the 3D scene (plan
 * docs/SPINAL_CORD_PLAN.md §5).
 *
 * The spinal cord is entirely PROCEDURAL (no GLB budget is left for baked
 * meshes), so every spinal body — the cord surface, a funiculus, a gray-matter
 * column, a root bundle, or the per-record extras a spinal record maps to —
 * is a `THREE.BufferGeometry` built by `src/geometry/spinalCord.ts` and routed
 * through the one part table `src/geometry/spinalParts.ts`. The SAME geometry
 * is handed to the 2D section worker by `registrySpinalParts()`, so a section
 * contour is the plane cut of the very mesh the user sees here — one builder,
 * one cache, the route v14/v17 established for tubes.
 *
 * Interaction follows `EnvelopeSlotMesh` (SceneLayers.tsx) and `NucleusMesh`:
 * the mesh is pickable, a click selects the registry record the body stands
 * for (`selectStructure(recordId, { tab: null })`), hover sets the hovered id,
 * and selection/hover/highlight lift the material's `emissiveIntensity` (every
 * factory preset in `src/geometry/materials.ts` seeds `emissive` with its own
 * colour and starts at intensity 0, so intensity is the whole selection hook).
 * Materials are module-level singletons keyed by slug (scene lifetime = app
 * lifetime, StrictMode-safe — the same rule as ENVELOPE_MATERIALS).
 *
 * Visibility is decided by the PARENT (SceneLayers' single `layersAdmit`
 * decision) before this component is mounted — this file never reads the
 * layer sets, so `verify:view-filter-consistency`'s "one decision" rule keeps
 * holding across the whole viewer3d surface.
 */
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useAtlasStore } from '../../state/store'
import { makeAnatomyMaterial } from '../../geometry/materials'

/** Selection/hover/highlight lift — below NucleusMesh's 0.38 selected pulse,
 *  above its 0.18 emphasis floor (see SceneLayers' envelope lit value 0.22). */
const EMISSIVE_LIT = 0.22

const MATERIALS = new Map<string, THREE.MeshPhysicalMaterial>()

function materialFor(
  slug: string,
  hint: string,
  color: string,
): THREE.MeshPhysicalMaterial {
  const cached = MATERIALS.get(slug)
  if (cached) return cached
  const made = makeAnatomyMaterial(hint, color)
  MATERIALS.set(slug, made)
  return made
}

export interface SpinalBodyMeshProps {
  /** Part slug (`spinal-*`) or record id for per-record extras; mesh name and
   *  material key. Mirrored twins use the `#mirror` suffixed slug. */
  slug: string
  /** The registry record this body selects/highlights as. */
  recordId: string
  geometry: THREE.BufferGeometry
  materialHint: string
  color: string
  /** highlightIdSet for the selected/syndrome records (may be null). */
  highlight: Set<string> | null
}

export default function SpinalBodyMesh({
  slug,
  recordId,
  geometry,
  materialHint,
  color,
  highlight,
}: SpinalBodyMeshProps) {
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const material = materialFor(slug, materialHint, color)
  const lit =
    (highlight !== null && highlight.has(recordId)) ||
    hoveredId === recordId ||
    selectedId === recordId
  // Same live-mutation pattern as EnvelopeSlotMesh: the factory material is a
  // shared singleton, and selection is a per-frame intensity move.
  material.emissiveIntensity = lit ? EMISSIVE_LIT : 0

  // Pickable (QUALITY_PLAN §2 item 8): a click selects the record the body
  // stands for. Raycast precedence stays nearest-first, so nuclei inside the
  // cord shell claim clicks that hit them first (SceneLayers' EnvelopeSlotMesh
  // comment documents the same contract); stopPropagation only ends the event
  // after this mesh has already won the pick.
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

  return (
    <mesh
      name={slug}
      geometry={geometry}
      material={material}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onPointerDown={handleDown}
    />
  )
}
