/**
 * SectionPiP — GPU live-section picture-in-picture (SECTION_SYNC_PLAN §2.1,
 * section-pip task). Two cooperating pieces are exported:
 *
 *  - `SectionPiP` (default) — mounted inside the Viewer3D <Canvas>. Renders
 *    THE SAME scene from a second orthographic camera aligned to the active
 *    section plane — store `sectionAxis` ('x'|'y'|'z', default 'y') plus the
 *    matching live clip value, the same single source of truth ClipSync
 *    feeds to the 3D clip planes — into a private WebGLRenderTarget, then
 *    blits that texture into the DOM panel's viewport rect through a
 *    scissored viewport. At most one render per frame, and only while the
 *    panel is visible (the component unmounts otherwise, handing the frame
 *    back to R3F's auto-render).
 *
 *  - `SectionPiPPanel` — the dockable bottom-right panel: plane readout in
 *    the `y = −24.0 au` format, §2.2 orientation labels (transverse:
 *    anterior up / patient-left on image-right; sagittal: superior up /
 *    anterior right; coronal: superior up / patient-left right — the same
 *    badge table SectionCanvas uses), manual axis override buttons (§2.1),
 *    a small/large toggle and a hide button. Visibility is prop-driven so
 *    integration can wire it to any switch.
 *
 * Stencil capping (§2.1 "cut surfaces render filled"): the canonical three.js
 * clipping_stencil technique, run inside the PiP render target only, so the
 * main 3D view, ALL_CLIP_PLANES, ClipSync and updateAllClipping behave
 * exactly as before:
 *   1. two override-material passes count the scene's back/front faces
 *      relative to the ACTIVE clip plane (Increment/DecrementWrap stencil
 *      ops; color + depth writes off, depth test off);
 *   2. a full-size cap plane at the plane position draws only where the
 *      stencil ≠ 0 — inside the clipped solids — with `stencilRef 0` and
 *      Replace ops, so it clears the buffer as it draws. It is itself
 *      clipped by the two INACTIVE shared planes (as in the reference
 *      example), so cuts from the other sliders stay hollow.
 * The net ±1 parity marks "the viewing ray starts inside a solid at the
 * plane" — the cut face — without touching any scene material; materials opt
 * in through enableSectionCapping() (src/geometry/materials.ts, called by all
 * five factory presets). Capping is skipped under quality 'balanced' (plan
 * §6 perf guard), where the target also drops to half resolution.
 *
 * View geometry note (§2.2 vs. the camera): the camera always sits on the
 * DISCARDED side of the plane so the cut face is visible, looking straight
 * down the plane normal. Coronal then matches the §2.2 radiological
 * convention naturally; transverse and sagittal would come out mirrored, so
 * the final blit flips x for those axes — exactly the display mapping
 * SectionCanvas encodes (AXIS_PAIR: y → u=x, x → u=z).
 */
import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useAtlasStore } from '../../state/store'
import type { SectionAxis } from '../../state/store'
import {
  CLIP_BOUNDS,
  CORONAL_PLANE,
  SAGITTAL_PLANE,
  TRANSVERSE_PLANE,
} from './clipPlanes'
import {
  DEFAULT_SECTION_CAP_COLOR,
  firstSectionCapColor,
} from '../../geometry/materials'
import '../../styles/sectionPip.css'

/* ------------------------------------------------------------------ */
/* Axis geometry (§2.1 camera + §2.2 orientation)                      */
/* ------------------------------------------------------------------ */

interface SectionViewSpec {
  /**
   * Direction from the bounds center toward the DISCARDED half-space — the
   * camera stands here looking back down the plane normal so the cut face
   * faces the lens (clipPlanes.ts keeps the lower/inner side for all axes).
   */
  cameraSide: THREE.Vector3
  /** World-space up on screen (§2.2). */
  up: THREE.Vector3
  /** In-plane world half-extents [horizontal u, vertical v]. */
  halfU: number
  halfV: number
  /**
   * Horizontal mirror so the displayed section matches §2.2 (see header
   * note): needed for transverse (radiological) and sagittal (anterior
   * right); coronal is naturally patient-left-right.
   */
  flipX: boolean
  /** Edge badges — same table as SectionCanvas DIRECTION_BADGES. */
  labels: { top: string; bottom: string; left: string; right: string }
  caption: string
}

const SECTION_VIEWS: Record<SectionAxis, SectionViewSpec> = {
  y: {
    cameraSide: new THREE.Vector3(0, 1, 0),
    up: new THREE.Vector3(0, 0, 1),
    halfU: (CLIP_BOUNDS.x.max - CLIP_BOUNDS.x.min) / 2,
    halfV: (CLIP_BOUNDS.z.max - CLIP_BOUNDS.z.min) / 2,
    flipX: true,
    labels: { top: 'A', bottom: 'P', left: 'R', right: 'L' },
    caption: 'Transverse',
  },
  x: {
    cameraSide: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    halfU: (CLIP_BOUNDS.z.max - CLIP_BOUNDS.z.min) / 2,
    halfV: (CLIP_BOUNDS.y.max - CLIP_BOUNDS.y.min) / 2,
    flipX: true,
    labels: { top: 'S', bottom: 'I', left: 'P', right: 'A' },
    caption: 'Sagittal',
  },
  z: {
    cameraSide: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    halfU: (CLIP_BOUNDS.x.max - CLIP_BOUNDS.x.min) / 2,
    halfV: (CLIP_BOUNDS.y.max - CLIP_BOUNDS.y.min) / 2,
    flipX: false,
    labels: { top: 'S', bottom: 'I', left: 'R', right: 'L' },
    caption: 'Coronal',
  },
}

/** Shared plane singletons per section axis (never mutated here). */
const ACTIVE_PLANE: Record<SectionAxis, THREE.Plane> = {
  x: SAGITTAL_PLANE,
  y: TRANSVERSE_PLANE,
  z: CORONAL_PLANE,
}

/** The cap plane is clipped by the OTHER two planes (three.js example). */
const OTHER_PLANES: Record<SectionAxis, THREE.Plane[]> = {
  x: [CORONAL_PLANE, TRANSVERSE_PLANE],
  y: [SAGITTAL_PLANE, CORONAL_PLANE],
  z: [SAGITTAL_PLANE, TRANSVERSE_PLANE],
}

/** Canonical bounds center — camera target and cap-plane base position. */
const BOUNDS_CENTER = new THREE.Vector3(
  (CLIP_BOUNDS.x.min + CLIP_BOUNDS.x.max) / 2,
  (CLIP_BOUNDS.y.min + CLIP_BOUNDS.y.max) / 2,
  (CLIP_BOUNDS.z.min + CLIP_BOUNDS.z.max) / 2,
)

const CAMERA_DISTANCE = 160
/** Slight framing margin around the canonical bounds. */
const VIEW_MARGIN = 1.08
/** PlaneHelpers group name — its in-plane quads must skip the stencil passes. */
const HELPERS_OBJECT_NAME = 'clip-plane-helpers'

const PLUS_Z = new THREE.Vector3(0, 0, 1)
const CLEAR_COLOR = new THREE.Color(0x000000)
const FALLBACK_CAP_COLOR = new THREE.Color(DEFAULT_SECTION_CAP_COLOR)

/* ------------------------------------------------------------------ */
/* PiP render rig (created once per quality tier)                      */
/* ------------------------------------------------------------------ */

interface PipRig {
  renderTarget: THREE.WebGLRenderTarget
  pipCamera: THREE.OrthographicCamera
  capScene: THREE.Scene
  capMesh: THREE.Mesh
  capMaterial: THREE.MeshBasicMaterial
  stencilBackMaterial: THREE.MeshBasicMaterial
  stencilFrontMaterial: THREE.MeshBasicMaterial
  blitScene: THREE.Scene
  blitQuad: THREE.Mesh
  blitMaterial: THREE.MeshBasicMaterial
  blitCamera: THREE.OrthographicCamera
}

function createPipRig(samples: number): PipRig {
  // The capping parity lives in this target's stencil buffer; the main
  // canvas needs none (capping renders PiP-only).
  const renderTarget = new THREE.WebGLRenderTarget(2, 2, {
    depthBuffer: true,
    stencilBuffer: true,
    samples,
  })

  const pipCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE * 2)

  // Filled cut face: draws only where the stencil parity ≠ 0, replacing the
  // stencil with 0 as it goes (plus an explicit clear onAfterRender).
  const capMaterial = new THREE.MeshBasicMaterial({
    color: DEFAULT_SECTION_CAP_COLOR,
    side: THREE.DoubleSide,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.ReplaceStencilOp,
    stencilZFail: THREE.ReplaceStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
  })
  const capMesh = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), capMaterial)
  capMesh.frustumCulled = false
  capMesh.onAfterRender = (renderer) => renderer.clearStencil()
  const capScene = new THREE.Scene()
  capScene.add(capMesh)

  // Stencil parity passes: whole scene under an override material, back
  // faces increment / front faces decrement (wrap keeps the counters from
  // saturating). Only the ACTIVE plane clips these passes.
  const stencilBackMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilFail: THREE.IncrementWrapStencilOp,
    stencilZFail: THREE.IncrementWrapStencilOp,
    stencilZPass: THREE.IncrementWrapStencilOp,
  })
  const stencilFrontMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilFail: THREE.DecrementWrapStencilOp,
    stencilZFail: THREE.DecrementWrapStencilOp,
    stencilZPass: THREE.DecrementWrapStencilOp,
  })

  // Blit quad: renders the RT texture into the panel's scissored viewport.
  // The scene pass already tone-mapped (RT holds tonemapped linear values);
  // toneMapped=false here avoids double tone mapping — the renderer's sRGB
  // output transform still applies on the final quad.
  const blitMaterial = new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    // DoubleSide: flipX mirrors the quad via a negative x scale.
    side: THREE.DoubleSide,
  })
  const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMaterial)
  blitQuad.frustumCulled = false
  const blitScene = new THREE.Scene()
  blitScene.add(blitQuad)
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2)
  blitCamera.position.set(0, 0, 1)

  return {
    renderTarget,
    pipCamera,
    capScene,
    capMesh,
    capMaterial,
    stencilBackMaterial,
    stencilFrontMaterial,
    blitScene,
    blitQuad,
    blitMaterial,
    blitCamera,
  }
}

function disposePipRig(rig: PipRig): void {
  rig.renderTarget.dispose()
  rig.capMaterial.dispose()
  rig.stencilBackMaterial.dispose()
  rig.stencilFrontMaterial.dispose()
  rig.blitMaterial.dispose()
  rig.capMesh.geometry.dispose()
  rig.blitQuad.geometry.dispose()
}

/* ------------------------------------------------------------------ */
/* SectionPiP — the in-canvas renderer                                 */
/* ------------------------------------------------------------------ */

export interface SectionPiPProps {
  /**
   * Prop-driven visibility (§2.1 toggle). False skips every pass; the
   * mounting parent is expected to unmount the component entirely so R3F's
   * auto-render takes the frame back, but the prop is honored either way.
   */
  visible: boolean
  /** DOM viewport rect the section is blitted into (SectionPiPPanel owns it). */
  windowRef: RefObject<HTMLDivElement>
}

/**
 * Render priority 2: runs after the PostFX composer (priority 1) has
 * presented the main view, so the scissored blit lands on the final image.
 * Registering any priority > 0 hook disables R3F's auto-render, so under
 * quality 'balanced' (PostFX unmounted) this hook reproduces the plain
 * canvas pass first — same renderer settings, visually identical.
 */
export function SectionPiP({ visible, windowRef }: SectionPiPProps) {
  const quality = useAtlasStore((s) => s.quality)
  // Rig depends on the tier only through MSAA samples; recreated on flips
  // (rare) and disposed through the effect cleanup.
  const rig = useMemo(() => createPipRig(quality === 'high' ? 4 : 0), [quality])
  useEffect(() => () => disposePipRig(rig), [rig])

  const scratch = useMemo(
    () => ({
      clearColor: new THREE.Color(),
      viewport: new THREE.Vector4(),
      scissor: new THREE.Vector4(),
    }),
    [],
  )

  useFrame((state) => {
    const gl = state.gl
    const scene = state.scene
    const store = useAtlasStore.getState()

    // 'balanced' has no PostFX: this hook owns the plain-canvas pass.
    if (store.quality !== 'high') {
      gl.render(scene, state.camera)
    }
    if (!visible) return

    // Pixel window = the panel's viewport rect relative to the canvas.
    const win = windowRef.current
    if (win === null || !win.isConnected) return
    const hostRect = gl.domElement.getBoundingClientRect()
    const winRect = win.getBoundingClientRect()
    const width = winRect.width
    const height = winRect.height
    if (width < 2 || height < 2) return
    if (winRect.right <= hostRect.left || winRect.left >= hostRect.right) return
    if (winRect.bottom <= hostRect.top || winRect.top >= hostRect.bottom) return

    // Live plane state straight from the store — no React re-render per
    // slider tick (the same slice ClipSync pushes into the shared planes).
    const axis: SectionAxis = store.sectionAxis
    const view = SECTION_VIEWS[axis]
    const plane = ACTIVE_PLANE[axis]
    const planeValue = store.clip[axis]
    const highQuality = store.quality === 'high'
    const dpr = gl.getPixelRatio()

    /* ---- orthographic section camera (§2.1 + §2.2) ------------------- */
    const pipCamera = rig.pipCamera
    pipCamera.up.copy(view.up)
    pipCamera.position.copy(BOUNDS_CENTER).addScaledVector(view.cameraSide, CAMERA_DISTANCE)
    pipCamera.lookAt(BOUNDS_CENTER)
    // Aspect-fit the canonical bounds into the panel (same rule as
    // SectionCanvas.computeTransform): nothing is ever cropped.
    let halfU = view.halfU * VIEW_MARGIN
    let halfV = view.halfV * VIEW_MARGIN
    const aspect = width / height
    if (halfU / halfV > aspect) halfV = halfU / aspect
    else halfU = halfV * aspect
    pipCamera.left = -halfU
    pipCamera.right = halfU
    pipCamera.top = halfV
    pipCamera.bottom = -halfV
    pipCamera.updateProjectionMatrix()

    /* ---- cap plane + stencil clipping planes for this frame ---------- */
    rig.capMaterial.clippingPlanes = OTHER_PLANES[axis]
    rig.capMaterial.color.copy(firstSectionCapColor() ?? FALLBACK_CAP_COLOR)
    const capMesh = rig.capMesh
    capMesh.position.copy(BOUNDS_CENTER)
    if (axis === 'x') capMesh.position.x = planeValue
    else if (axis === 'y') capMesh.position.y = planeValue
    else capMesh.position.z = planeValue
    capMesh.quaternion.setFromUnitVectors(PLUS_Z, view.cameraSide)
    rig.stencilBackMaterial.clippingPlanes = [plane]
    rig.stencilFrontMaterial.clippingPlanes = [plane]

    /* ---- render-target sizing (half-res under 'balanced') ------------ */
    const rt = rig.renderTarget
    const rtScale = (highQuality ? 1 : 0.5) * dpr
    const rtWidth = Math.max(2, Math.round(width * rtScale))
    const rtHeight = Math.max(2, Math.round(height * rtScale))
    if (rt.width !== rtWidth || rt.height !== rtHeight) rt.setSize(rtWidth, rtHeight)

    /* ---- section passes into the private target ---------------------- */
    const prevAutoClear = gl.autoClear
    const prevTarget = gl.getRenderTarget()
    const prevClearColor = gl.getClearColor(scratch.clearColor)
    const prevClearAlpha = gl.getClearAlpha()

    gl.autoClear = false
    gl.setRenderTarget(rt)
    gl.setClearColor(CLEAR_COLOR, 0)
    gl.clear(true, true, true)

    if (highQuality) {
      // The clip-plane helper quads sit exactly IN the section planes and
      // would poison the ±1 parity — they skip the stencil passes.
      const helpers = scene.getObjectByName(HELPERS_OBJECT_NAME)
      const helpersWereVisible = helpers !== undefined && helpers.visible
      if (helpers !== undefined) helpers.visible = false

      scene.overrideMaterial = rig.stencilBackMaterial
      gl.render(scene, pipCamera)
      scene.overrideMaterial = rig.stencilFrontMaterial
      gl.render(scene, pipCamera)
      scene.overrideMaterial = null

      if (helpers !== undefined) helpers.visible = helpersWereVisible

      // Filled cut face where stencil ≠ 0 (its onAfterRender clears the
      // stencil for the color pass).
      gl.render(rig.capScene, pipCamera)
    }

    // Color pass — the same scene with the same shared clipping planes.
    gl.render(scene, pipCamera)

    gl.setClearColor(prevClearColor, prevClearAlpha)
    gl.setRenderTarget(prevTarget)
    gl.autoClear = prevAutoClear

    /* ---- scissored blit into the panel viewport ---------------------- */
    rig.blitQuad.scale.x = view.flipX ? -1 : 1
    const prevScissorTest = gl.getScissorTest()
    const prevViewport = gl.getViewport(scratch.viewport)
    const prevScissor = gl.getScissor(scratch.scissor)
    const x = (winRect.left - hostRect.left) * dpr
    const y = (hostRect.bottom - winRect.bottom) * dpr
    const blitWidth = width * dpr
    const blitHeight = height * dpr

    gl.setScissorTest(true)
    gl.setViewport(x, y, blitWidth, blitHeight)
    gl.setScissor(x, y, blitWidth, blitHeight)
    gl.autoClear = false // never clear the main image under the quad
    gl.render(rig.blitScene, rig.blitCamera)
    gl.autoClear = prevAutoClear

    gl.setViewport(prevViewport.x, prevViewport.y, prevViewport.z, prevViewport.w)
    gl.setScissor(prevScissor.x, prevScissor.y, prevScissor.z, prevScissor.w)
    gl.setScissorTest(prevScissorTest)
  }, 2)

  return null
}

/* ------------------------------------------------------------------ */
/* SectionPiPPanel — the dockable DOM panel                            */
/* ------------------------------------------------------------------ */

export interface SectionPiPPanelProps {
  /** Prop-driven visibility (§2.1 toggle); false renders nothing. */
  visible: boolean
  /** Hide button — wired by the mounting parent. */
  onVisibleChange?: (visible: boolean) => void
  /** Ref that receives the viewport div — shared with <SectionPiP>. */
  windowRef: RefObject<HTMLDivElement>
}

const AXIS_ORDER: SectionAxis[] = ['x', 'y', 'z']

/** '−24.0' — one decimal, typographic minus (plan §2.1 readout format). */
function formatPlaneValue(value: number): string {
  return value.toFixed(1).replace('-', '−')
}

export function SectionPiPPanel({ visible, onVisibleChange, windowRef }: SectionPiPPanelProps) {
  const sectionAxis = useAtlasStore((s) => s.sectionAxis)
  const setSectionAxis = useAtlasStore((s) => s.setSectionAxis)
  const clipEnabled = useAtlasStore((s) => s.clip.enabled)
  const planeValue = useAtlasStore((s) => s.clip[s.sectionAxis])
  const [large, setLarge] = useState(false)

  if (!visible) return null

  const view = SECTION_VIEWS[sectionAxis]

  return (
    <div
      className={`pip-panel ${large ? 'pip-large' : 'pip-small'}`}
      role="group"
      aria-label="Live section picture-in-picture"
    >
      <div className="pip-header">
        <span className="pip-title">{view.caption}</span>
        <span className="pip-readout">{`${sectionAxis} = ${formatPlaneValue(planeValue)} au`}</span>
        <span className="pip-spacer" />
        <span className="pip-axis-group" title="Section axis (manual override)">
          {AXIS_ORDER.map((axis) => (
            <button
              key={axis}
              type="button"
              className="pip-btn"
              aria-pressed={axis === sectionAxis}
              onClick={() => setSectionAxis(axis)}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </span>
        <button
          type="button"
          className="pip-btn"
          aria-pressed={large}
          title={large ? 'Shrink panel' : 'Enlarge panel'}
          onClick={() => setLarge((value) => !value)}
        >
          {large ? '▾' : '▴'}
        </button>
        <button
          type="button"
          className="pip-btn"
          title="Hide live section"
          onClick={() => onVisibleChange?.(false)}
        >
          ×
        </button>
      </div>
      <div className="pip-window" ref={windowRef} aria-hidden="true">
        <span className="pip-orient pip-orient-n">{view.labels.top}</span>
        <span className="pip-orient pip-orient-s">{view.labels.bottom}</span>
        <span className="pip-orient pip-orient-w">{view.labels.left}</span>
        <span className="pip-orient pip-orient-e">{view.labels.right}</span>
        {clipEnabled ? null : <span className="pip-offnote">clipping off</span>}
      </div>
    </div>
  )
}

export default SectionPiP
