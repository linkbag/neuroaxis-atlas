/**
 * SomatotopyOverlay — the 3D half of the v9 somatotopic map (PLAN.md §5.1).
 *
 * One oriented patch per segment of the two strips, drawn ON the cortical
 * ribbon, with the body-part name as a 3D label and the ONE
 * face → hand → arm → trunk → leg colour ramp so the somatotopic order is
 * legible at a glance. The 16 records themselves
 * (`src/data/structures/telencephalon-somatotopy.json`) carry the narrative, the
 * tree entry, the search hit and the info panel; this component draws the map.
 *
 * ── WHY A DEDICATED PATCH PASS RATHER THAN `NucleusMesh` ──────────────────
 * PLAN.md §5.1 and docs/SWARM_V9_PLAN.md §1 both ask which route was taken and
 * why. The answer is the dedicated pass, for three measured reasons:
 *  1. **Orientation.** A segment's placement is a ribbon vertex plus the
 *     ribbon's outward normal there (`src/geometry/somatotopy.ts`). `NucleusMesh`
 *     has no orientation input at all: it scales a unit sphere by `size3d` or
 *     draws a canonical-space GLB, so the patch could not be laid tangentially on
 *     the surface — it would read as 16 spheres floating on the cortex.
 *  2. **Colour.** `NucleusMesh` takes its colour from `record.color` and its
 *     preset from the kind; the one ramp would then have to be baked into 16
 *     taxonomy colours (it is — the records carry them — but the ramp's own
 *     table in `somatotopy.ts` would no longer be the runtime source, so the two
 *     could drift).
 *  3. **Labels.** `NucleusMesh` floats its label above the bounding box of the
 *     whole shape and shows it only for the hovered/selected record. The map
 *     needs the label anchored to its own patch, offset along the measured
 *     normal, so 16 labels read as a strip rather than as a pile.
 * What is NOT re-implemented: the material comes from the same factory
 * (`makeAnatomyMaterial('context', colour)`), the store contract (regions+kinds
 * gating, `hidden`, `highlightIdSet` dimming to 0.15, hover/select handlers,
 * `label3d` classes, `zIndexRange`) is NucleusMesh's, verbatim.
 *
 * ── LAYER GATING ──────────────────────────────────────────────────────────
 * The whole pass is drawn only when `regions.has('telencephalon') &&
 * kinds.has('context')` — the same condition that gates the hemisphere ghost
 * shells it sits on — so switching either layer off removes the map with the
 * cortex it belongs to. `hidden` (the v7 preset set) removes individual segments.
 *
 * ── HONESTY ───────────────────────────────────────────────────────────────
 * See `SOMATOTOPY_METHOD_NOTE` in `src/geometry/somatotopy.ts`: the placement is
 * schematic on the DERIVED ribbon (nearest-vertex residuals 0.01–0.16 au on M1 and
 * 0.29–2.29 au on S1, 1 au = 1.2 mm), the ribbon carries no central-sulcus
 * geometry and the atlas has no Brodmann map, so this is a strip position, not a
 * traced areal boundary.
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { highlightIdSet, useAtlasStore } from '../../state/store'
import { makeAnatomyMaterial } from '../../geometry/materials'
import {
  SOMATOTOPY_SEGMENTS,
  SOMATOTOPY_BODY_PART_LABELS,
  SOMATOTOPY_SURFACE_OFFSET_AU,
  somatotopyColor,
  type SomatotopySegment,
} from '../../geometry/somatotopy'

/**
 * Patch opacity: lit reads as a band on the cortex, unlit is the NucleusMesh
 * dimming value (0.15) so "selecting ctx-m1-hand dims the rest" is the same
 * statement the other 200 records make.
 */
const PATCH_OPACITY = 0.42
const PATCH_OPACITY_DIMMED = 0.15
/** Emissive lift on hover, the NucleusMesh hover value. */
const PATCH_EMISSIVE_HOVER = 0.16
/** Emissive lift on select, the NucleusMesh selected value. */
const PATCH_EMISSIVE_SELECTED = 0.38

/**
 * The patch disc: a unit-radius `CircleGeometry`, one shared instance for all 32
 * meshes (16 segments × 2 hemispheres). Its own normal is +Z and its first vertex
 * sits at +Y, which is what the tangent frame below assumes. 24 segments is the
 * smallest disc that still reads as a smooth patch at this scale — the whole
 * footprint is under 8 au (≈9 mm) across, so the polygon corners never show.
 */
function createPatchGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(1, 24)
  geometry.computeBoundingBox()
  return geometry
}

const PATCH_GEOMETRY = createPatchGeometry()

/** One material per segment (module singletons: never rebuilt on a layer toggle). */
const PATCH_MATERIALS: readonly THREE.MeshPhysicalMaterial[] = SOMATOTOPY_SEGMENTS.map((segment) =>
  makeAnatomyMaterial('context', somatotopyColor(segment)),
)

/**
 * Per-segment transform, computed once. The patch's local +Z is rotated onto the
 * segment's measured outward normal, and its local +Y onto the along-strip
 * tangent (the direction to the next more lateral segment, projected into the
 * tangent plane), so the five-vertex outline reads as a band whose long axis
 * follows the strip.
 */
interface PatchTransform {
  segment: SomatotopySegment
  /** canonical-space centre, already offset along the normal */
  center: readonly [number, number, number]
  quaternion: THREE.Quaternion
  color: string
  /** label anchor, further out along the normal than the patch centre */
  labelOffset: readonly [number, number, number]
}

const LOCAL_UP = new THREE.Vector3(0, 1, 0)

function buildTransforms(): PatchTransform[] {
  return SOMATOTOPY_SEGMENTS.map((segment) => {
    const normal = new THREE.Vector3(...segment.normal).normalize()
    // along-strip tangent: towards the next segment of the SAME strip (or, for the
    // last one, away from the previous one), projected into the tangent plane.
    const sameStrip = SOMATOTOPY_SEGMENTS.filter((other) => other.strip === segment.strip)
    const positionInStrip = sameStrip.findIndex((other) => other.id === segment.id)
    const next = sameStrip[Math.min(positionInStrip + 1, sameStrip.length - 1)]
    const previous = sameStrip[Math.max(positionInStrip - 1, 0)]
    const along = new THREE.Vector3(
      next.surfacePoint[0] - previous.surfacePoint[0],
      next.surfacePoint[1] - previous.surfacePoint[1],
      next.surfacePoint[2] - previous.surfacePoint[2],
    )
    if (along.lengthSq() < 1e-6) along.set(0, 1, 0)
    along.projectOnPlane(normal)
    if (along.lengthSq() < 1e-6) along.copy(LOCAL_UP).projectOnPlane(normal)
    along.normalize()

    // Basis: X = along-strip tangent, Y = normal × X (so the three stay
    // orthonormal), Z = the patch plane normal. `CircleGeometry`'s normal is +Z and
    // its first vertex sits at +Y, so the disc's local Y axis runs along the strip.
    const axisX = along.clone()
    const axisZ = normal.clone()
    const axisY = new THREE.Vector3().crossVectors(axisZ, axisX).normalize()
    const matrix = new THREE.Matrix4().makeBasis(axisX, axisY, axisZ)
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix)

    const center: [number, number, number] = [
      segment.surfacePoint[0] + normal.x * SOMATOTOPY_SURFACE_OFFSET_AU,
      segment.surfacePoint[1] + normal.y * SOMATOTOPY_SURFACE_OFFSET_AU,
      segment.surfacePoint[2] + normal.z * SOMATOTOPY_SURFACE_OFFSET_AU,
    ]
    const labelDistance = segment.size[0] + 1.6
    return {
      segment,
      center,
      quaternion,
      color: somatotopyColor(segment),
      labelOffset: [normal.x * labelDistance, normal.y * labelDistance, normal.z * labelDistance],
    }
  })
}

const TRANSFORMS: readonly PatchTransform[] = buildTransforms()

/** Index of a segment in the committed table (its material slot). */
const INDEX_BY_ID = new Map(TRANSFORMS.map((t, i) => [t.segment.id, i] as const))

/**
 * Mirror a patch onto −x. A rotation matrix R mirrors to `D·R·D` with
 * `D = diag(−1, 1, 1)` — the conjugation is exact for a rotation, so the mirrored
 * patch still has an orthonormal right-handed basis with determinant +1 (a plain
 * `scale.x = −1` would flip the winding and show the back face).
 */
const MIRROR = new THREE.Matrix4().makeScale(-1, 1, 1)
function mirroredQuaternion(transform: PatchTransform): THREE.Quaternion {
  const rotation = new THREE.Matrix4().makeRotationFromQuaternion(transform.quaternion)
  const mirrored = new THREE.Matrix4().multiplyMatrices(MIRROR, new THREE.Matrix4().multiplyMatrices(rotation, MIRROR))
  return new THREE.Quaternion().setFromRotationMatrix(mirrored)
}

interface SomatotopyPatchProps {
  transform: PatchTransform
  index: number
  mirrored: boolean
  highlight: Set<string> | null
  isSelected: boolean
  isHovered: boolean
  labelVisible: boolean
  onOver: (event: ThreeEvent<PointerEvent>) => void
  onOut: (event: ThreeEvent<PointerEvent>) => void
  onDown: (event: ThreeEvent<PointerEvent>) => void
}

function SomatotopyPatch({
  transform,
  index,
  mirrored,
  highlight,
  isSelected,
  isHovered,
  labelVisible,
  onOver,
  onOut,
  onDown,
}: SomatotopyPatchProps) {
  const { segment } = transform
  const dimmed = highlight !== null && !highlight.has(segment.recordId)
  const material = PATCH_MATERIALS[index]
  material.opacity = dimmed ? PATCH_OPACITY_DIMMED : PATCH_OPACITY
  material.depthWrite = false
  material.emissiveIntensity = isSelected
    ? PATCH_EMISSIVE_SELECTED
    : isHovered
      ? PATCH_EMISSIVE_HOVER
      : 0

  const position: [number, number, number] = mirrored
    ? [-transform.center[0], transform.center[1], transform.center[2]]
    : [transform.center[0], transform.center[1], transform.center[2]]
  const rotation = mirrored ? mirroredQuaternion(transform) : transform.quaternion
  const labelPosition: [number, number, number] = mirrored
    ? [-transform.labelOffset[0], transform.labelOffset[1], transform.labelOffset[2]]
    : [transform.labelOffset[0], transform.labelOffset[1], transform.labelOffset[2]]

  return (
    <mesh
      name={`somatotopy-${segment.id}${mirrored ? '-r' : '-l'}`}
      geometry={PATCH_GEOMETRY}
      material={material}
      position={position}
      quaternion={rotation}
      scale={[segment.size[0], segment.size[1], 1]}
      renderOrder={-1}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onPointerDown={onDown}
    >
      {labelVisible ? (
        <Html
          position={labelPosition}
          zIndexRange={[30, 10]}
          style={{ pointerEvents: 'none' }}
        >
          <span className={`label3d${isSelected ? ' is-selected' : isHovered ? ' is-hovered' : ''}`}>
            {SOMATOTOPY_BODY_PART_LABELS[segment.bodyPart]}
          </span>
        </Html>
      ) : null}
    </mesh>
  )
}

export default function SomatotopyOverlay() {
  const regions = useAtlasStore((s) => s.layers.regions)
  const kinds = useAtlasStore((s) => s.layers.kinds)
  const hidden = useAtlasStore((s) => s.layers.hidden)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const syndromeId = useAtlasStore((s) => s.syndromeId)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const highlight = useMemo(
    () => highlightIdSet({ selectedId, syndromeId }),
    [selectedId, syndromeId],
  )

  // The same gate the hemisphere ghost shell uses: the map belongs to the
  // telencephalon context layer, so turning either off removes it with the cortex.
  const visible = regions.has('telencephalon') && kinds.has('context')

  const visibleTransforms = useMemo(
    () => TRANSFORMS.filter((t) => !hidden.has(t.segment.recordId)),
    [hidden],
  )

  if (!visible) return null

  return (
    <group name="somatotopy-overlay">
      {visibleTransforms.map((transform) => {
        const { segment } = transform
        const index = INDEX_BY_ID.get(segment.id) ?? 0
        const isSelected = selectedId === segment.recordId
        const isHovered = hoveredId === segment.recordId
        const handlers = {
          onOver: (event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation()
            setHovered(segment.recordId)
          },
          onOut: (event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation()
            if (useAtlasStore.getState().hoveredId === segment.recordId) setHovered(null)
          },
          onDown: (event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation()
            selectStructure(segment.recordId, { tab: null })
          },
        }
        // Label only for an interaction (the NucleusMesh rule), so 16 labels do
        // not clutter the cortex at rest.
        const labelVisible = labelVisibility && (isSelected || isHovered)
        return [
          <SomatotopyPatch
            key={`${segment.id}-l`}
            transform={transform}
            index={index}
            mirrored={false}
            highlight={highlight}
            isSelected={isSelected}
            isHovered={isHovered}
            labelVisible={labelVisible}
            {...handlers}
          />,
          <SomatotopyPatch
            key={`${segment.id}-r`}
            transform={transform}
            index={index}
            mirrored
            highlight={highlight}
            isSelected={isSelected}
            isHovered={isHovered}
            labelVisible={labelVisible}
            {...handlers}
          />,
        ]
      })}
    </group>
  )
}
