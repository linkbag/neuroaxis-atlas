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

/**
 * Translucency per kind; solid kinds stay opaque unless dimmed.
 *
 * Exported (v13) so `scripts/verify/nerve-kind.mjs` asserts the values from the
 * SHIPPED table rather than re-typing them: a `nerve` record is a schematic
 * placement like `nuc-subiculum` or `vasc-lenticulostriate-arteries`, so it must
 * be OPAQUE (1) — a translucent nerve would read as an envelope, and
 * `KIND_OPACITY[kind] >= 1` is also what turns depth writing on below.
 */
export const KIND_OPACITY: Record<StructureRecord['kind'], number> = {
  nucleus: 1,
  tract: 1,
  surface: 1,
  vessel: 0.5,
  ventricle: 0.42,
  context: 0.22,
  nerve: 1,
}

/**
 * Kind → factory preset when no manifest hint is supplied.
 *
 * Exported (v13) for the same reason as `KIND_OPACITY`. The `nerve` branch is
 * explicit even though the trailing default already returns `'nucleus'`: the
 * decision that a mesh-less nerve gets the gray-matter nucleus preset (not the
 * arterial `vasculature` cast the v8 vessel branch exists for) is worth being
 * visible, and `scripts/verify/nerve-kind.mjs` asserts it.
 */
export function hintForKind(kind: StructureRecord['kind']): MaterialHint {
  if (kind === 'ventricle') return 'csf'
  if (kind === 'context') return 'context'
  // v8: a vessel record with no manifest hint still gets the arterial cast
  // material rather than the gray-matter nucleus preset (the baked vessel parts
  // all declare `materialHint: 'vasculature'`; this covers the mesh-less ones).
  if (kind === 'vessel') return 'vasculature'
  // v13: a cranial-nerve record owns no mesh in this repo (PLAN.md §5) and
  // resolves no manifest part, so this branch is the one its schematic
  // ellipsoid takes.
  if (kind === 'nerve') return 'nucleus'
  return 'nucleus'
}

/**
 * v19 (audit FEA-015) — the radial travel (in au) a nucleus moves per unit of the
 * explode slider. It was an inline `6` on three lines, which is why the README's
 * "the nuclei's 6 au" statement had no symbol a gate could read; it is named and
 * exported here so a source-reading assertion can pin it the way
 * `audit-checks.test.mjs` pins `GHOST_SHELL_OPACITY`. The hemisphere shells'
 * counterpart is `HEMISPHERE_EXPLODE_FACTOR` (16) in SceneLayers.tsx.
 */
export const NUCLEUS_EXPLODE_AU = 6

/** Selection emphasis, softer than v1 (0.55/0.42/0.28) for ACES + IBL. */
const EMISSIVE_SELECTED = 0.38
const EMISSIVE_SYNDROME = 0.28
const EMISSIVE_HOVER = 0.16
/**
 * v7 preset emphasis lift (docs/TELENCEPHALON_PLAN.md §5 "basal ganglia/limbic
 * emphasised"). Deliberately below the hover value: it marks the subject of a
 * preset at rest, so it must be visible without being mistakable for an
 * interaction. `SceneLayers` decides WHICH records get it (preset `emphasis`,
 * opaque kinds only).
 */
const EMPHASIS_EMISSIVE = 0.18

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
  /**
   * v7 preset emphasis (docs/TELENCEPHALON_PLAN.md §5 "Deep structures: ghost
   * cortex + basal ganglia/limbic emphasised"): lift the material's emissive so
   * this structure reads as the subject of the current preset without changing
   * its geometry or its opacity. Only ever set for opaque kinds — the caller
   * checks — so the lift can never smear a translucent envelope.
   */
  emphasised?: boolean
  /** Ids kept lit while everything else dims (selection or open syndrome). */
  highlight: Set<string> | null
}

export default function NucleusMesh({
  record,
  mirrored = false,
  anatomySlug,
  geometry,
  materialHint,
  emphasised = false,
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

  // Context records are selectable since p1-identity (QUALITY_PLAN §2 item 8,
  // "every rendered silhouette must be selectable"). The silhouettes
  // themselves are drawn by SceneLayers' envelope pass, which carries the
  // registry id of the record it stands for; the records in
  // `ENVELOPE_RECORD_IDS` are filtered out of this component's list, so what
  // reaches this branch is either a nucleus/ventricle/surface/tract record or
  // a context record whose **3D body is the v1 placeholder ellipsoid**
  // (ctx-internal-capsule, ctx-lenticular-nucleus, ctx-caudate-nucleus,
  // ctx-pontine-nuclei, … — authored with origin3d/size3d for exactly this).
  // Those placeholders are real drawn meshes, so they answer clicks like every
  // other record; making them `raycast={() => null}` was what left the whole
  // context layer unaddressable. Click precedence still favours the real
  // anatomy: R3F dispatches nearest-hit-first and these ellipsoids sit inside
  // the envelope surface, so a nucleus in front always wins, and the
  // envelope/placeholder handlers never claim an event on a nucleus' behalf.

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
  // v19 (audit FEA-015) — the radial travel per unit of the explode slider is a
  // NAMED export rather than the inline literal `6` it used to be, so the number
  // README quotes ("the nuclei's 6 au", against the hemisphere shells' 16 au in
  // `SceneLayers.HEMISPHERE_EXPLODE_FACTOR`) can be read by a gate instead of
  // being a claim with nothing behind it.
  const position: [number, number, number] = glbGeometry
    ? [dirX * explode * NUCLEUS_EXPLODE_AU, 0, dirZ * explode * NUCLEUS_EXPLODE_AU]
    : [
        anchor[0] + dirX * explode * NUCLEUS_EXPLODE_AU,
        anchor[1],
        anchor[2] + dirZ * explode * NUCLEUS_EXPLODE_AU,
      ]
  const scale: [number, number, number] = glbGeometry || geometry ? [1, 1, 1] : (record.size3d ?? [1, 1, 1])

  material.opacity = dimmed ? 0.15 : KIND_OPACITY[record.kind]
  material.depthWrite = !dimmed && KIND_OPACITY[record.kind] >= 1
  // Selection/hover/syndrome intensity wins over the preset's emphasis lift, so
  // "emphasised" can never mask an interaction (the interactivity contract of
  // §5 is unchanged by the v7 presets).
  material.emissiveIntensity = isSelected
    ? EMISSIVE_SELECTED
    : syndromeLit
      ? EMISSIVE_SYNDROME
      : isHovered
        ? EMISSIVE_HOVER
        : emphasised
          ? EMPHASIS_EMISSIVE
          : 0

  // Label floats above the shape (bounding box for canonical-space geometry).
  const shownGeometry = glbGeometry ?? geometry
  const labelY = shownGeometry
    ? (shownGeometry.boundingBox?.max.y ?? 0) + 0.8
    : scale[1] + 0.8

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(record.id)
  }

  const handleOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (useAtlasStore.getState().hoveredId === record.id) setHovered(null)
  }

  const handleDown = (event: ThreeEvent<PointerEvent>) => {
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
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onPointerDown={handleDown}
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
