/**
 * TractTube — one ascending/descending pathway (realism plan §1 Layer 3
 * "Tracts" + §7 tracts-upgrade; render-pipeline factory in materials.ts).
 *
 * Geometry is swept manually from the record's authored waypoints via
 * CatmullRomCurve3 (src/geometry/curves.ts) instead of the v1 constant-radius
 * TubeGeometry:
 *  - TAPER — fascicles narrow toward both ends, down to a per-tract 45–60% of
 *    the mid radius (deterministic hash of the tract id), held near full
 *    radius through the middle via a sin^0.55 profile;
 *  - ELLIPTICAL SECTION — flattened along the frame normal (white-matter
 *    ribbons), minor/major ratio 0.72–0.84 per tract;
 *  - GRADIENT — a subtle value gradient (0.9→1.0, sRGB-authored) along the
 *    curve parameter via a vertex-color attribute (material.vertexColors).
 *
 * The material comes from the central factory createTractMaterial(color, dir):
 * off-white tinted toward the pathway's direction color, fiber-striation
 * normal map aligned to the tube tangent (our UVs keep the TubeGeometry
 * convention u = along tube, v = around), anisotropy 4, and an around-axis
 * repeat that scales with tubeRadius so striation density stays
 * scale-consistent across tracts (quantized to whole periods — the loop seam
 * must sample the same texture phase). Clipping planes ride in on the factory
 * material, so updateClipping/ClipSync keeps working unchanged.
 *
 * Selection/hover keep the store-driven emissive with a per-frame lerp
 * (softer targets than v1 — ACES + IBL read brighter); dimming (open
 * syndrome highlight) lerps opacity toward the v1 end states. Tubes are
 * clickable exactly like nuclei (click → selectStructure(tract.id)).
 *
 * Per-frame cost (QUALITY_PLAN §3 item 10, AUDIT §2.14): the emissive/opacity
 * lerp used to run in ONE `useFrame` callback PER TUBE (19 registrations, each
 * a separate closure into R3F's frame loop). Every mounted tube now publishes
 * its animation state into the module-level `tractFrameRegistry`, and exactly
 * ONE of them claims the frame driver (the first to commit) which advances the
 * whole registry in insertion order — the same order R3F called the old
 * callbacks in. The remaining tubes' callbacks are a single null check. The
 * targets are still computed from each component's own props, so the behaviour
 * is identical, the striation/selection-pulse logic is untouched, and the
 * material handed to the pass is the same instance the mesh uses.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { TractRecord } from '../../types'
import { useAtlasStore } from '../../state/store'
import { toCatmullRom } from '../../geometry/curves'
import { createTractMaterial } from '../../geometry/materials'
import { getStriationNormalTexture } from '../../geometry/textures'

/* ------------------------------------------------------------------ */
/* Sweep parameters (tracts-upgrade caps + profiles)                   */
/* ------------------------------------------------------------------ */

/** 72 tubular × 10 radial segments per tract (task cap; thin tubes). */
const TUBULAR_SEGMENTS = 72
const RADIAL_SEGMENTS = 10
const RADIAL_VERTS = RADIAL_SEGMENTS + 1

/** End radius as a fraction of the mid radius — real fascicles taper. */
const END_RATIO_MIN = 0.45
const END_RATIO_MAX = 0.6
/** Minor/major axis ratio — ribbons flattened along the frame normal. */
const FLATTEN_MIN = 0.72
const FLATTEN_MAX = 0.84
/** Along-length vertex-color value range (authored in sRGB). */
const VALUE_MIN = 0.9
const VALUE_MAX = 1.0

/** Exponent shaping the taper: >1 hugs full radius through the middle. */
const TAPER_EXPONENT = 0.55

/**
 * Median authored tubeRadius (src/data/tracts.json). The striation texture is
 * authored for the v1 look at (1,3) — 18 fibers × 3 periods around a r=0.5
 * tube — so the around-axis repeat scales linearly from that reference.
 */
const STRIATION_REF_RADIUS = 0.5
const STRIATION_REF_REPEAT = 3

/* ------------------------------------------------------------------ */
/* Deterministic per-tract variation (no Math.random — seeded style)   */
/* ------------------------------------------------------------------ */

/** FNV-1a over the tract id — same texture-seeding discipline as textures.ts. */
function hashId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Pick a deterministic value in [min, max] from one byte of the id hash. */
function hashRange(hash: number, byte: number, min: number, max: number): number {
  const unit = (hash >>> (byte * 8)) & 0xff
  return min + (unit / 0xff) * (max - min)
}

/* ------------------------------------------------------------------ */
/* Tapered, elliptical tube geometry (cached per tract id)             */
/* ------------------------------------------------------------------ */

/** Tube geometries are cached module-level so layer toggles never rebuild. */
const tubeCache = new Map<string, THREE.BufferGeometry>()

/**
 * Sweep the tract's Catmull-Rom centerline into a tapered, slightly
 * elliptical tube. Frames come from curve.computeFrenetFrames — the same
 * source TubeGeometry uses — sampled at uniform arc length (getPointAt), so
 * segment density is length-independent. UVs keep the TubeGeometry layout
 * (u along the tube, v around) so the striation normal map traces the fibers.
 *
 * v14 EXPORT (PLAN.md §4 route (a), section-nerve): this is THE swept-tube
 * builder. `tubeGeometryFor` below is the cached entry point and is what the 2D
 * live-section registry calls for a cranial-nerve course
 * (`sectionAssets.registryNerveParts`), so the 3D tube and the 2D contour are
 * the SAME geometry by construction — not two sweeps that happen to agree
 * today. Baking the twelve tubes to GLB instead was measured and rejected:
 * 0.809 MiB raw / 0.506 MiB quantized against a 0.1086 MiB directory headroom.
 * PLAN.md §4 puts this builder in a new `src/geometry/tubeGeometry.ts`; that
 * file was not in this task's write scope, so it stays here, exported, and
 * `TractTube` remains its only 3D consumer.
 */
export function buildTractGeometry(tract: TractRecord): THREE.BufferGeometry {
  const curve = toCatmullRom(tract.waypoints)
  const frames = curve.computeFrenetFrames(TUBULAR_SEGMENTS, false)

  const hash = hashId(tract.id)
  const endRatio = hashRange(hash, 0, END_RATIO_MIN, END_RATIO_MAX)
  const flatten = hashRange(hash, 1, FLATTEN_MIN, FLATTEN_MAX)

  const vertexCount = (TUBULAR_SEGMENTS + 1) * RADIAL_VERTS
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const colors = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices: number[] = []

  const point = new THREE.Vector3()
  const color = new THREE.Color()

  for (let i = 0; i <= TUBULAR_SEGMENTS; i++) {
    const t = i / TUBULAR_SEGMENTS
    curve.getPointAt(t, point)
    const frameN = frames.normals[i]
    const frameB = frames.binormals[i]

    // Radius profile: endRatio at t=0/1, full tubeRadius through the middle.
    const taper = endRatio + (1 - endRatio) * Math.pow(Math.sin(Math.PI * t), TAPER_EXPONENT)
    const semiMajor = tract.tubeRadius * taper // along the frame binormal
    const semiMinor = semiMajor * flatten // along the frame normal (ribbon)

    // Subtle value gradient along the length, authored in sRGB space.
    color.setRGB(
      VALUE_MIN + (VALUE_MAX - VALUE_MIN) * t,
      VALUE_MIN + (VALUE_MAX - VALUE_MIN) * t,
      VALUE_MIN + (VALUE_MAX - VALUE_MIN) * t,
      THREE.SRGBColorSpace,
    )

    for (let j = 0; j < RADIAL_VERTS; j++) {
      const theta = (j / RADIAL_SEGMENTS) * Math.PI * 2
      const cosTheta = Math.cos(theta)
      const sinTheta = Math.sin(theta)
      const v = i * RADIAL_VERTS + j

      // Ellipse point: B·(a·cosθ) + N·(b·sinθ).
      const bx = frameB.x * cosTheta * semiMajor
      const by = frameB.y * cosTheta * semiMajor
      const bz = frameB.z * cosTheta * semiMajor
      const nx = frameN.x * sinTheta * semiMinor
      const ny = frameN.y * sinTheta * semiMinor
      const nz = frameN.z * sinTheta * semiMinor
      positions[v * 3] = point.x + bx + nx
      positions[v * 3 + 1] = point.y + by + ny
      positions[v * 3 + 2] = point.z + bz + nz

      // Outward normal of the ellipse: B·(cosθ/a) + N·(sinθ/b), normalized.
      let gx = frameB.x * (cosTheta / semiMajor) + frameN.x * (sinTheta / semiMinor)
      let gy = frameB.y * (cosTheta / semiMajor) + frameN.y * (sinTheta / semiMinor)
      let gz = frameB.z * (cosTheta / semiMajor) + frameN.z * (sinTheta / semiMinor)
      const invLen = 1 / Math.hypot(gx, gy, gz)
      normals[v * 3] = gx * invLen
      normals[v * 3 + 1] = gy * invLen
      normals[v * 3 + 2] = gz * invLen

      colors[v * 3] = color.r
      colors[v * 3 + 1] = color.g
      colors[v * 3 + 2] = color.b
      uvs[v * 2] = t
      uvs[v * 2 + 1] = j / RADIAL_SEGMENTS
    }
  }

  // Quad grid → triangles, wound CCW seen from outside. Note: this is the
  // MIRROR of TubeGeometry's (a,b,d),(b,c,d) — three parameterizes its rings
  // with cos = −cos(v) (opposite sweep direction), so with this ring
  // parameterization (θ from +B toward +N) the outward-facing order is
  // (a,d,c),(a,c,b). Verified empirically across all 19 tracts (winding
  // agrees with authored normals everywhere; the authored
  // trigeminothalamic-ventral hairpin folds any swept tube — the v1
  // primitive folded 3× more triangles there).
  for (let i = 0; i < TUBULAR_SEGMENTS; i++) {
    for (let j = 0; j < RADIAL_SEGMENTS; j++) {
      const a = i * RADIAL_VERTS + j
      const b = i * RADIAL_VERTS + j + 1
      const c = (i + 1) * RADIAL_VERTS + j + 1
      const d = (i + 1) * RADIAL_VERTS + j
      indices.push(a, d, c, a, c, b)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(indices)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * Cached tube geometry for a waypoint-bearing record — the entry point shared
 * by this component and by the 2D section registry (see `buildTractGeometry`).
 * The cache is keyed on the record id, so twelve nerve courses add twelve
 * entries and a layer toggle never re-sweeps anything.
 */
export function tubeGeometryFor(tract: TractRecord, cacheKey: string = tract.id): THREE.BufferGeometry {
  const cached = tubeCache.get(cacheKey)
  if (cached) return cached
  const geometry = buildTractGeometry(tract)
  tubeCache.set(cacheKey, geometry)
  return geometry
}

/* ------------------------------------------------------------------ */
/* Striation texture clones (repeat quantized per tubeRadius)          */
/* ------------------------------------------------------------------ */

/**
 * Whole-period around-axis repeat for a tube radius. The striation density
 * stays scale-consistent because the repeat scales with the circumference;
 * quantizing to whole periods keeps the closed loop's seam on one texture
 * phase (a fractional repeat would visibly misalign the fibers there).
 */
function striationRepeatFor(tubeRadius: number): number {
  return THREE.MathUtils.clamp(
    Math.round((STRIATION_REF_REPEAT * tubeRadius) / STRIATION_REF_RADIUS),
    2,
    6,
  )
}

/** One texture clone per distinct repeat (shared across tracts; ~5 total). */
const striationClones = new Map<number, THREE.DataTexture>()

function striationTextureFor(repeat: number): THREE.DataTexture {
  const cached = striationClones.get(repeat)
  if (cached) return cached
  const texture = getStriationNormalTexture().clone()
  texture.repeat.set(1, repeat)
  texture.anisotropy = 4
  texture.needsUpdate = true
  striationClones.set(repeat, texture)
  return texture
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface TractTubeProps {
  tract: TractRecord
  /** Ids kept lit while everything else dims (selection or open syndrome). */
  highlight: Set<string> | null
  /**
   * v17 — sweep the MIRROR-IMAGE course (x → −x) for paired structures: the
   * authored chain is one side's anatomy, and the renderer draws exactly one tube
   * per record, so paired nerves and tracts appeared on one side only. The twin
   * selects, hovers, labels and highlights as the SAME record (every id-based
   * read stays `tract.id`); only the geometry cache and the frame-driver slot are
   * keyed with a suffix, because two instances sharing one cache entry (or one
   * driver slot) is the collision that would make the twin draw unmirrored.
   */
  mirrored?: boolean
}

/**
 * Emissive targets, softer than v1 (0.45±0.3 / 0.35 / 0.28 / 0.08): ACES tone
 * mapping + IBL read emissive brighter, so the selected pulse rides lower
 * (plan §1 Layer 3 "softer emissive, selected-pulse retained").
 */
const EMISSIVE_SELECTED_BASE = 0.3
const EMISSIVE_SELECTED_PULSE = 0.16
const EMISSIVE_SYNDROME = 0.22
const EMISSIVE_HOVER = 0.14
const EMISSIVE_IDLE = 0.05

/* ------------------------------------------------------------------ */
/* Shared frame driver (QUALITY_PLAN §3 item 10)                       */
/* ------------------------------------------------------------------ */

/**
 * The per-tube frame state, published by each mounted TractTube. Everything
 * the old per-instance `useFrame` closure read is here — including the
 * already-resolved boolean/target values, so a React re-render (selection,
 * hover, syndrome, label visibility) is enough to retarget a tube and the
 * driver itself never needs to re-render.
 */
interface TractFrameEntry {
  /** The mesh's own material instance (the driver mutates it per frame). */
  material: THREE.MeshStandardMaterial
  isSelected: boolean
  syndromeLit: boolean
  isHovered: boolean
  dimmed: boolean
}

/** Insertion-ordered (a Map), so the frame pass visits tubes in mount order —
 *  exactly the order R3F ran the previous per-tube callbacks in. */
const tractFrameRegistry = new Map<string, TractFrameEntry>()

/** The shared frame pass' signature (see stepAllTracts). */
type TractFrameStep = (time: number, delta: number) => void

/** One call per tube, identical maths to the pre-consolidation callback. */
function stepTractFrame(entry: TractFrameEntry, time: number, delta: number): void {
  const { material } = entry
  const alpha = Math.min(1, delta * 8)
  const emissiveTarget = entry.isSelected
    ? EMISSIVE_SELECTED_BASE + EMISSIVE_SELECTED_PULSE * Math.sin(time * 4)
    : entry.syndromeLit
      ? EMISSIVE_SYNDROME
      : entry.isHovered
        ? EMISSIVE_HOVER
        : EMISSIVE_IDLE
  material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, emissiveTarget, alpha)
  material.opacity = THREE.MathUtils.lerp(material.opacity, entry.dimmed ? 0.15 : 1, alpha)
  material.depthWrite = material.opacity > 0.99
}

/**
 * THE single active `useFrame` for every tract tube — whichever mounted
 * instance owns the driver token. Renders nothing.
 *
 * It is hosted by the tubes themselves because that keeps the change inside
 * this module: exactly ONE mounted tube subscribes a callback that steps the
 * whole registry, and the token is handed over on unmount (see the effect in
 * TractTube). Before the effect commits `driverRef.current` is null and the
 * frame pass is a no-op, so the first frame after mount is simply not animated.
 */
function useTractFrameDriver(): MutableRefObject<TractFrameStep | null> {
  const driverRef = useRef<TractFrameStep | null>(null)
  useFrame((state, delta) => {
    const driver = driverRef.current
    if (driver === null) return
    driver(state.clock.elapsedTime, delta)
  })
  return driverRef
}

/** The one function every mounted tube's callback dispatches to. */
function stepAllTracts(time: number, delta: number): void {
  if (tractFrameRegistry.size === 0) return
  for (const entry of tractFrameRegistry.values()) stepTractFrame(entry, time, delta)
}

/** Diagnostics: how many tubes currently animate through the shared driver. */
export function tractFrameRegistrySize(): number {
  return tractFrameRegistry.size
}

export default function TractTube({ tract, highlight, mirrored = false }: TractTubeProps) {
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  /**
   * v17 — the mirrored twin sweeps x → −x. Every id-based read (selection,
   * hover, highlight, click, label) stays on the REAL record id, so clicking
   * either side selects the same record; only the geometry cache key and the
   * frame-driver slot are suffixed, because two instances sharing one cache
   * entry (or one driver slot) is the collision that would make the twin draw
   * unmirrored geometry over the authored side.
   */
  const instanceKey = mirrored ? `${tract.id}#mirror` : tract.id
  const effectiveTract = useMemo<TractRecord>(
    () =>
      mirrored
        ? { ...tract, waypoints: tract.waypoints.map(([x, y, z]) => [-x, y, z] as [number, number, number]) }
        : tract,
    [mirrored, tract],
  )

  const isSelected = selectedId === tract.id
  const isHovered = hoveredId === tract.id
  const syndromeLit = highlight !== null && highlight.has(tract.id) && !isSelected
  const dimmed = highlight !== null && !highlight.has(tract.id)

  // Geometry is memoized per instance key (module cache — layer toggles reuse
  // it); the mirrored twin sweeps its own negated-waypoint geometry.
  const geometry = useMemo(() => tubeGeometryFor(effectiveTract, instanceKey), [effectiveTract, instanceKey])

  // Factory material per instance (direction-tinted white matter with the
  // tangent striation normal map); vertex colors enable the length gradient,
  // and the normal-map clone gets the radius-scaled repeat + anisotropy.
  // three re-acquires disposed materials, so the StrictMode
  // setup→cleanup→setup cycle is safe (same pattern as NucleusMesh).
  const material = useMemo(() => {
    const created = createTractMaterial(tract.color, { direction: tract.direction })
    created.vertexColors = true
    created.needsUpdate = true
    created.normalMap = striationTextureFor(striationRepeatFor(tract.tubeRadius))
    return created
  }, [tract])
  useEffect(() => () => material.dispose(), [material])

  // Selected tubes breathe; dimming fades opacity. Both lerp toward the
  // store-driven targets every frame (softer plan §1 Layer 3 emphasis);
  // depthWrite flips off while translucent so dimmed tubes never occlude.
  //
  // Published to the shared frame pass instead of registering a private
  // useFrame per tube (QUALITY_PLAN §3 item 10, AUDIT §2.14): the entry is
  // refreshed on every render, so the pass always sees the current selection/
  // hover/syndrome state, and it is withdrawn on unmount. The FIRST tube to
  // commit claims the driver token; the one-frame gap between two instances'
  // effects is harmless because the pass reads the registry, not the token
  // owner — and a tube is never left stale.
  const frameDriverRef = useTractFrameDriver()
  useEffect(() => {
    tractFrameRegistry.set(instanceKey, {
      material,
      isSelected,
      syndromeLit,
      isHovered,
      dimmed,
    })
    if (frameDriverRef.current === null) frameDriverRef.current = stepAllTracts
    return () => {
      tractFrameRegistry.delete(instanceKey)
      if (frameDriverRef.current === stepAllTracts) frameDriverRef.current = null
    }
  }, [instanceKey, material, isSelected, syndromeLit, isHovered, dimmed, frameDriverRef])

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
    const p = toCatmullRom(effectiveTract.waypoints).getPoint(0.5)
    return [p.x, p.y, p.z] as [number, number, number]
  }, [effectiveTract])

  return (
    <mesh
      geometry={geometry}
      material={material}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onPointerDown={handleDown}
    >
      {labelVisibility && (isSelected || isHovered) ? (
        <Html position={midpoint} zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
          <span className={`label3d${isSelected ? ' is-selected' : ' is-hovered'}`}>{tract.name}</span>
        </Html>
      ) : null}
    </mesh>
  )
}
