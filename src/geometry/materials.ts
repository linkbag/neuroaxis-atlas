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
 *
 * v3 (SECTION_SYNC_PLAN §2.1/§4): the factory also carries the section-capping
 * hook — `enableSectionCapping(material, capColor)` records the cap-face color
 * a GPU cut-face pass would paint. It is RECORDED ONLY since v9 removed the
 * stencil rig (see the block comment at the section-capping registry below);
 * registering changes nothing about the material itself, and the shared
 * ALL_CLIP_PLANES / ClipSync path is untouched.
 */
import * as THREE from 'three'
import { ALL_CLIP_PLANES } from '../components/viewer3d/clipPlanes'
import { getStriationNormalTexture, getTissueNormalTexture } from './textures'

/* ------------------------------------------------------------------ */
/* Material-hint dispatch (anatomy-manifest.json §4)                   */
/* ------------------------------------------------------------------ */

export const MATERIAL_HINTS = ['gray-matter', 'white-matter', 'csf', 'nucleus', 'context', 'vasculature'] as const
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

/** Read-only snapshot of registered materials. v19 (audit dc-03): this had NO
 *  caller — the "audits, tests" it claimed do not exist — so it was deleted.
 *  Re-add it together with the consumer that needs it. */

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

/* v19 (audit dc-04): `updateAllClipping()` lived here. It had no caller in
 * src/ or scripts/, and the "GLB materials registered later re-clip through
 * here" path it documented does not exist — the shared ALL_CLIP_PLANES
 * constants are attached at factory time, which is why ClipSync alone
 * suffices. Deleted rather than kept as a claim with no consumer. */

/* ------------------------------------------------------------------ */
/* Section capping registry (v3 plan §2.1/§4 — section-pip task)       */
/* ------------------------------------------------------------------ */

/**
 * RETIRED AT v9 — RECORDED, NOT PAINTED.
 *
 * v19 (audit dc-02 / mat-5): this whole block is write-only. The registry has
 * exactly one writer (`enableSectionCapping`, called by the five preset
 * factories below) and NO reader: `grep -n "firstSectionCapColor\|sectionCapRegistry"
 * src/` finds no consumer, and the GPU stencil rig it was built for was removed
 * in v9 (`viewer3d/SectionPiP.tsx` states that the stencil passes are gone and
 * the PiP now paints the same node-based renderer as the Plates tab). The
 * cut-face color a user sees on the live section therefore comes from the
 * contour fill, NOT from here. Deleting the block would touch seven call sites
 * and three exported names that a future 3D cap pass may want, so the claims
 * are corrected instead of the code being removed — the two docstrings below
 * say what the code actually does.
 */
export const DEFAULT_SECTION_CAP_COLOR = '#d7a58f'

interface SectionCapEntry {
  color: THREE.Color
}

/** Materials opted into stencil capping → their registered cap-face color.
 *  Write-only since v9 (see the block comment above). */
const sectionCapRegistry = new Map<THREE.Material, SectionCapEntry>()

/**
 * Opt a material into section capping — a pure registry write that records the
 * cap-face color. It changes NO rendering: the material's own presets, clipping
 * planes and fresnel hook are untouched, and (since v9) nothing reads the
 * registry, so this call currently has no visible effect. It is kept as the
 * documented hook a future 3D cut-face pass would consume.
 *
 * Safe to call repeatedly: a later call just recolors the recorded entry.
 * Returns the same material for chaining.
 */
export function enableSectionCapping<T extends THREE.Material>(
  material: T,
  capColor: THREE.ColorRepresentation = DEFAULT_SECTION_CAP_COLOR,
): T {
  let entry = sectionCapRegistry.get(material)
  if (entry === undefined) {
    entry = { color: new THREE.Color() }
    sectionCapRegistry.set(material, entry)
    material.addEventListener('dispose', () => {
      sectionCapRegistry.delete(material)
    })
  }
  entry.color.set(capColor)
  return material
}

/**
 * The cap-face color of the FIRST capped material, or null when nothing has
 * opted in yet. NO CONSUMER since v9 (audit dc-02): the cut face a user sees on
 * the live section is painted by the contour fill, not from this registry. Kept
 * for the future 3D cap pass; per-material colors stay recorded here.
 */
export function firstSectionCapColor(): THREE.Color | null {
  for (const entry of sectionCapRegistry.values()) return entry.color
  return null
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
/**
 * v8 arterial family default (docs/NEUROATLAS_V8_PLAN.md §2 "artery color family
 * (crimson)"). Individual vessel records carry their own `color` — the trunks and
 * midline links `#b91c1c`, the distal cortical/cerebellar branches `#dc2626`, the
 * deep perforators and the vertebral artery `#991b1b` — so this is only the
 * fallback for a vessel record that carries none.
 */
export const VESSEL_COLOR = '#b91c1c'
/** Cut face of a sectioned artery: the arterial wall's own tone, not tissue. */
export const VESSEL_CAP_COLOR = '#7f1d1d'

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
  enableSectionCapping(material)
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
  enableSectionCapping(material)
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
  enableSectionCapping(material)
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
  enableSectionCapping(material)
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
  enableSectionCapping(material)
  return track(material)
}

/**
 * Hemisphere ghost shell: the translucent CORTICAL ENVELOPE of v7
 * (docs/TELENCEPHALON_PLAN.md §5 "Cortex ghost by default: hemispheres render
 * as a translucent shell (opacity ~0.12–0.18, depthWrite:false, back-face
 * culled) so the brainstem and diencephalon remain visible through it").
 *
 * It is a factory preset rather than an ad-hoc material for the same reason
 * every other material is: it must carry the shared clipping planes, record the
 * section-capping hook and keep the PBR look of the context envelope family.
 *
 * Two deliberate differences from `createContextMaterial`:
 *  - `side: FrontSide` — the shell is a closed watertight solid, so drawing both
 *    faces would double the fill rate on the largest meshes in the app (the two
 *    shells are ~78–80k tris each) and stack two translucent layers into a
 *    muddy interior. One front-facing layer is what makes the brainstem read
 *    THROUGH the cortex, which is the whole point of the preset.
 *  - `opacity: 0.14` — the low end of §5's 0.12–0.18 window, compared with the
 *    context envelopes' 0.16, because a hemisphere covers several times the
 *    screen area of any brainstem envelope.
 *
 * Callers may override opacity/depthWrite per instance (the "faint outline"
 * state of the Brainstem-focus preset) — the fresnel hook reads the live
 * `opacity` uniform, so mutating it keeps working exactly as it does for the
 * context/envelope presets.
 */
export function createGhostShellMaterial(color: string = '#9fb0c4'): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    sheen: 0.1,
    sheenColor: SHEEN_PINKISH,
    sheenRoughness: 0.9,
    clearcoat: 0,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    side: THREE.FrontSide,
    normalMap: getTissueNormalTexture(),
    envMapIntensity: 0.35,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  material.normalScale.set(0.04, 0.04)
  // A wide, soft rim: on a hemisphere-scale shell the fresnel term is what
  // draws the silhouette, which is the "faint outline" §5 asks for.
  applyFresnelOpacity(material, { boost: 1.8, power: 2.4 })
  enableSectionCapping(material)
  return track(material)
}

/**
 * v8 cerebral vasculature: the arterial cast (docs/NEUROATLAS_V8_PLAN.md §2).
 *
 * What makes an artery read as an artery rather than as one more gray blob:
 *  - **Smooth, glossy surface.** `roughness: 0.34` + `clearcoat 0.3` against the
 *    tissue presets' 0.85–0.95, so the vessels catch a specular streak while
 *    every parenchymal structure stays matte. That contrast is what lets the
 *    circle of Willis read as a cast sitting *inside* the brain.
 *  - **Crimson, emissive-bearing.** `emissive` is set to the record's own color
 *    at zero intensity, so `NucleusMesh`'s selection/syndrome/emphasis lift
 *    (which mutates `emissiveIntensity`) works exactly as it does for every
 *    other kind — an artery lights up when selected, its territory lights with
 *    it, and nothing here has to know about that contract.
 *  - **`DoubleSide`, so the lumen is closed.** `KIND_OPACITY.vessel` is 0.5, i.e.
 *    vessels are translucent in the viewer (they must be legible through the
 *    cortex and through the ghost shells), and a translucent open-ended tube
 *    shows its own interior. The bake produces watertight solids, so drawing both
 *    faces costs little and removes the "flat ribbon" look at grazing angles.
 *  - **`depthWrite: false`** for the same reason every other translucent preset
 *    in this file has it: `NucleusMesh` sets `depthWrite = KIND_OPACITY >= 1`, so
 *    the factory default only governs direct consumers, but it must agree with
 *    the viewer's rule or the same mesh would sort differently in two places.
 *
 * The cut face of a sectioned artery is painted `VESSEL_CAP_COLOR` (the arterial
 * wall's own tone) rather than the shared tissue cap: on the live-section PiP an
 * artery cut in the plane should not read as gray matter.
 */
export function createVesselMaterial(color: string = VESSEL_COLOR): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0.04,
    sheen: 0.3,
    sheenColor: SHEEN_PINKISH,
    sheenRoughness: 0.5,
    clearcoat: 0.3,
    clearcoatRoughness: 0.45,
    emissive: color,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
    normalMap: getTissueNormalTexture(),
    envMapIntensity: 0.7,
    clippingPlanes: ALL_CLIP_PLANES,
  })
  material.normalScale.set(0.02, 0.02)
  applyFresnelOpacity(material, { boost: 1.5, power: 2.6 })
  enableSectionCapping(material, VESSEL_CAP_COLOR)
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
    case 'vasculature':
      return createVesselMaterial(color ?? VESSEL_COLOR)
    case 'nucleus':
    default:
      return createNucleusMaterial(color ?? DEFAULT_NUCLEUS)
  }
}
