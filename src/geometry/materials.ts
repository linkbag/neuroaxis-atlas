/**
 * materials.ts — central PBR material factory for the anatomy scene
 * (plan §1 Layer 3, §2 constraint 3: "Clipping planes apply to ALL new
 * materials", §7 task render-pipeline).
 *
 * Every material in the scene is created here so that:
 *  1. clipping planes are attached from ONE place (the shared ALL_CLIP_PLANES
 *     singletons from clipPlanes.ts — mutating their constants, as
 *     Viewer3D's ClipSync already does, updates every material for free);
 *  2. every created material is tracked in a registry, so future materials
 *     (GLB envelope/nucleus meshes from anatomy-manifest.json) can be
 *     re-clipped or audited with a single call;
 *  3. the PBR presets stay consistent: translucent fresnel-weighted gray
 *     matter, striated white matter, matte nuclei, cyan CSF, neutral context.
 *
 * Translucency is faked WITHOUT transmission (plan §8 "transmission avoided"):
 * an onBeforeCompile hook re-weights gl_FragColor.a toward the silhouette
 * (fresnel term), reading the live `opacity` uniform so consumers can keep
 * mutating material.opacity exactly like the v1 JSX materials.
 *
 * Materials are plain THREE objects (no R3F JSX): consumers own disposal —
 * the registry self-cleans through the material 'dispose' event.
 */
import * as THREE from 'three'
import { ALL_CLIP_PLANES } from '../components/viewer3d/clipPlanes'
import { getStriationNormalTexture, getTissueNormalTexture } from './textures'

/* ------------------------------------------------------------------ */
/* Material-hint dispatch (anatomy-manifest.json §4)                   */
/* ------------------------------------------------------------------ */

export const MATERIAL_HINTS = ['gray-matter', 'white-matter', 'csf', 'nucleus', 'context'] as const
export type MaterialHint = (typeof MATERIAL_HINTS)[number]

/* ------------------------------------------------------------------ */
/* Registry + clipping plumbing                                        */
/* ------------------------------------------------------------------ */

/** Every factory-created material still alive (weak to dispose events). */
const materialRegistry = new Set<THREE.Material>()

/** Enter a material into the registry (auto-removed on dispose). */
function track<T extends THREE.Material>(material: T): T {
  materialRegistry.add(material)
  material.addEventListener('dispose', () => {
    materialRegistry.delete(material)
  })
  return material
}

/** Read-only snapshot of registered materials (audits, tests). */
export function registeredAnatomyMaterials(): THREE.Material[] {
  return Array.from(materialRegistry)
}

/**
 * Apply a plane set to explicit materials. Safe to call repeatedly: the
 * shader only re-compiles when the plane COUNT changes (0 → n), never when
 * the same-length array is swapped or its Plane constants mutate.
 */
export function updateClipping(materials: Iterable<THREE.Material>, planes: THREE.Plane[]): void {
  for (const material of materials) {
    const before = material.clippingPlanes?.length ?? 0
    if (material.clippingPlanes !== planes) material.clippingPlanes = planes
    if (before !== planes.length) material.needsUpdate = true
  }
}

/**
 * Apply a plane set to EVERY registered material in one call (defaults to the
 * shared ALL_CLIP_PLANES). Returns the number of materials updated. The v1
 * ClipSync path keeps working without this — it mutates the shared Plane
 * constants — but GLB materials registered later re-clip through here.
 */
export function updateAllClipping(planes: THREE.Plane[] = ALL_CLIP_PLANES): number {
  updateClipping(materialRegistry, planes)
  return materialRegistry.size
}

/* ------------------------------------------------------------------ */
/* Fresnel-weighted opacity (onBeforeCompile, no transmission)         */
/* ------------------------------------------------------------------ */

interface FresnelOptions {
  /** Opacity multiplier at the silhouette (1 disables the rim boost). */
  boost: number
  /** Fresnel exponent — higher tightens the rim. */
  power: number
}

/**
 * Re-weight alpha toward the silhouette after tonemapping. Reads the built-in
 * `opacity` uniform, so mutating material.opacity at runtime keeps working.
 * The hook is a single shared function → all fresnel materials share one
 * program cache entry; per-material uniform VALUES come from each
 * onBeforeCompile invocation.
 */
function applyFresnelOpacity(material: THREE.MeshPhysicalMaterial, options: FresnelOptions): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFresnelBoost = { value: options.boost }
    shader.uniforms.uFresnelPower = { value: options.power }
    shader.fragmentShader = `uniform float uFresnelBoost;\nuniform float uFresnelPower;\n${shader.fragmentShader}`
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      [
        '#include <dithering_fragment>',
        '{',
        '  float viewAlign = abs(dot(normalize(vViewPosition), normalize(normal)));',
        '  float rim = pow(1.0 - clamp(viewAlign, 0.0, 1.0), uFresnelPower);',
        '  float rimOpacity = min(opacity * uFresnelBoost, 1.0);',
        '  gl_FragColor.a = clamp(mix(opacity, rimOpacity, rim), 0.0, 1.0);',
        '}',
      ].join('\n'),
    )
  }
  // Mark transparent-style output so the fresnel term is meaningful even when
  // a consumer leaves opacity at 1.
  material.transparent = true
}

/* ------------------------------------------------------------------ */
/* Shared defaults                                                     */
/* ------------------------------------------------------------------ */

/** Pinkish-white sheen tint shared by tissue materials (plan §1 Layer 3). */
const SHEEN_PINKISH = new THREE.Color('#f3ded9')
/** Off-white base of white-matter tracts (tinted per direction color). */
export const TRACT_BASE_COLOR = new THREE.Color('#eae5db')
/** Fallback colors when a caller passes none. */
export const DEFAULT_GRAY_MATTER = '#b7a8a4'
export const DEFAULT_NUCLEUS = '#c08497'
export const CSF_COLOR = '#06b6d4'
export const CONTEXT_COLOR = '#94a3b8'

/* ------------------------------------------------------------------ */
/* The factory                                                         */
/* ------------------------------------------------------------------ */

/**
 * Gray-matter envelope: translucent MeshPhysicalMaterial (roughness 0.62,
 * pinkish sheen 0.35, clearcoat 0.04, opacity 0.42, depthWrite false) with a
 * fresnel-weighted rim and fine tissue micro-noise. No transmission.
 */
export function createEnvelopeMaterial(color: string = DEFAULT_GRAY_MATTER): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.35,
    sheenColor: SHEEN_PINKISH,
    sheenRoughness: 0.5,
    clearcoat: 0.04,
    clearcoatRoughness: 0.55,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
    normalMap: getTissueNormalTexture(),
    envMapIntensity: 0.65,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  material.normalScale.set(0.1, 0.1)
  applyFresnelOpacity(material, { boost: 2.2, power: 2.5 })
  return track(material)
}

export interface TractMaterialOptions {
  /** Direction family for tint strength (mixed tracts take less tint). */
  direction?: 'ascending' | 'descending' | 'mixed'
  /** Overrides the derived base tint entirely. */
  color?: string
}

/**
 * White-matter tract: off-white base tinted toward the pathway's direction
 * color, fiber striation normal map along the tangent, faint emissive so
 * tracts read through the translucent envelopes. Consumers animate
 * emissiveIntensity for the selected-pulse (tracts-upgrade task).
 */
export function createTractMaterial(color: string, options: TractMaterialOptions = {}): THREE.MeshPhysicalMaterial {
  const tint = new THREE.Color(color)
  const base = options.color ? new THREE.Color(options.color) : TRACT_BASE_COLOR.clone()
  base.lerp(tint, options.direction === 'mixed' ? 0.3 : 0.45)
  const material = new THREE.MeshPhysicalMaterial({
    color: base,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.08,
    clearcoatRoughness: 0.4,
    sheen: 0.1,
    sheenColor: SHEEN_PINKISH,
    sheenRoughness: 0.6,
    emissive: tint,
    emissiveIntensity: 0.06,
    transparent: true,
    opacity: 1,
    side: THREE.FrontSide,
    normalMap: getStriationNormalTexture(),
    envMapIntensity: 0.7,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  material.normalScale.set(0.22, 0.22)
  return track(material)
}

/**
 * Gray-matter nucleus: matte (roughness 0.8), tinted per structure color,
 * subtle sheen 0.15, whisper of tissue noise. Emissive follows the tint so
 * selection/hover only needs to move emissiveIntensity.
 */
export function createNucleusMaterial(color: string = DEFAULT_NUCLEUS): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.8,
    metalness: 0,
    sheen: 0.15,
    sheenColor: SHEEN_PINKISH,
    sheenRoughness: 0.7,
    emissive: color,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 1,
    side: THREE.FrontSide,
    normalMap: getTissueNormalTexture(),
    envMapIntensity: 0.55,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  material.normalScale.set(0.08, 0.08)
  return track(material)
}

/**
 * CSF: cyan (#06b6d4), wet (low roughness), fresnel-weighted opacity with
 * depthWrite false so ventricles glow through the brainstem. DoubleSide —
 * aqueduct tube / ventricle tent are open surfaces.
 */
export function createCsfMaterial(color: string = CSF_COLOR): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.25,
    metalness: 0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.3,
    emissive: color,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.9,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  applyFresnelOpacity(material, { boost: 2.6, power: 2.2 })
  return track(material)
}

/**
 * Context backdrop: neutral gray translucent, fresnel-weighted, depthWrite
 * false, DoubleSide. Base opacity matches the v1 envelope pass (0.16).
 */
export function createContextMaterial(color: string = CONTEXT_COLOR): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    sheen: 0.1,
    sheenColor: SHEEN_PINKISH,
    sheenRoughness: 0.8,
    emissive: color,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    normalMap: getTissueNormalTexture(),
    envMapIntensity: 0.4,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  material.normalScale.set(0.05, 0.05)
  applyFresnelOpacity(material, { boost: 2.0, power: 2.8 })
  return track(material)
}

/* ------------------------------------------------------------------ */
/* Manifest-hint dispatch                                              */
/* ------------------------------------------------------------------ */

/**
 * Build the material for one anatomy-manifest part from its `materialHint`
 * (plan §4 schema). Unknown hints fall back to the nucleus preset so a
 * manifest extension can never blank a mesh. All returned materials already
 * carry the shared clipping planes.
 */
export function makeAnatomyMaterial(hint: MaterialHint | string, color?: string): THREE.MeshPhysicalMaterial {
  switch (hint) {
    case 'gray-matter':
      return createEnvelopeMaterial(color ?? DEFAULT_GRAY_MATTER)
    case 'white-matter':
      return createTractMaterial(color ?? '#e2e8f0')
    case 'csf':
      return createCsfMaterial(color ?? CSF_COLOR)
    case 'context':
      return createContextMaterial(color ?? CONTEXT_COLOR)
    case 'nucleus':
    default:
      return createNucleusMaterial(color ?? DEFAULT_NUCLEUS)
  }
}
