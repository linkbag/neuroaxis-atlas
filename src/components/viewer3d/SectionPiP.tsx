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
 * ── PIP_FIX_PLAN hotfix (v3) ─────────────────────────────────────────────
 * WHY THE SHARED PLANES WERE THE BUG: this component used to build the
 * section from the SHARED plane singletons in `viewer3d/clipPlanes.ts`
 * (SAGITTAL/CORONAL/TRANSVERSE_PLANE). That module parks every constant at
 * OFF_CONSTANT (+1000) whenever `store.clip.enabled === false`, so with
 * "Enable clipping" unchecked the stencil parity passes clipped against a
 * plane at +1000 (no cut), the cap found no parity to fill, and the window
 * rendered empty even though the sliders were set. The design rule is:
 * SLIDERS ALONE DEFINE THE SECTION; `clip.enabled` only controls whether
 * the MAIN 3D model is visibly cut. Therefore (fix contract §1–4):
 *
 *   1. OWN PLANES — this module allocates its own per-axis THREE.Plane
 *      singletons (OWN_ACTIVE_PLANE below) and writes `constant` from the
 *      store slider values every frame, NEVER OFF_CONSTANT. The stencil
 *      parity passes clip with the OWN active plane; the cap plane is
 *      clipped by the OWN other-axis planes.
 *   2. ALWAYS-RENDER — content is never gated on `clip.enabled`. With the
 *      checkbox OFF the shared planes sit at OFF_CONSTANT (uncut main
 *      model), so the color pass briefly borrows the OWN planes for its
 *      single render (same length ⇒ no shader recompile; see the color-pass
 *      comment) and restores ALL_CLIP_PLANES afterwards — the user sees the
 *      section slice as if the plane were active, with the filled cap face.
 *      With the checkbox ON the color pass keeps the shared planes (their
 *      constants equal the slider values via ClipSync, so both states show
 *      the identical cut illustration). Materials NOT clip-registered
 *      (PlaneHelpers quads etc.) render uncut from the ortho view — the
 *      section stays meaningful regardless.
 *   3. MSAA/STENCIL ROBUSTNESS — the rig uses `samples: 4` only on a
 *      WebGL2-class context; a per-frame parity watchdog reads back a small
 *      center block right after the cap pass (fresh — three.js resolves
 *      multisample targets at the end of every render()) and, after 30
 *      consecutive zero-coverage frames, rebuilds the rig with
 *      `samples: 0` + `stencilBuffer: true` (always on) with a console
 *      note. False-positive cost is bounded: the PiP merely loses MSAA
 *      smoothing (e.g. slider parked outside every solid for ~½ s).
 *   4. ?pipdebug — the URL flag (read once) adds a DOM readout overlay in
 *      the panel window (PipDebugOverlay below): planeValue, own-plane
 *      constant, RT size × samples, last blit rect, gl.getError(), stencil
 *      frame counter, cap coverage %, watchdog state. Zero cost when off.
 *   5. FALLBACK DECISION (evidence-based): the GPU path stays the default —
 *      the reported failure is fully explained by the shared-plane root
 *      cause above, and the ?pipdebug overlay + parity watchdog now give
 *      ground truth to detect any residual GPU-path defect. The proven
 *      worker-contour SectionCanvas is NOT embedded unless diagnostics show
 *      a clean GPU render is impossible; nothing here gates on preference.
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
 *      clipped by the two INACTIVE OWN planes (as in the reference
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
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useAtlasStore } from '../../state/store'
import type { SectionAxis } from '../../state/store'
import { ALL_CLIP_PLANES, CLIP_BOUNDS } from './clipPlanes'
import {
  DEFAULT_SECTION_CAP_COLOR,
  firstSectionCapColor,
  registeredAnatomyMaterials,
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

/* ------------------------------------------------------------------ */
/* OWN live planes (PIP_FIX_PLAN §1 — the core fix)                    */
/*                                                                     */
/* These are PiP-private singletons, deliberately NOT the shared       */
/* SAGITTAL/CORONAL/TRANSVERSE_PLANE instances from clipPlanes.ts.     */
/* The shared ones park at OFF_CONSTANT (+1000) whenever               */
/* `store.clip.enabled === false` — correct for the main 3D clip, fatal */
/* for this panel: stencil passes clipped at +1000 produce no parity,  */
/* the cap fills nothing, and the window renders empty no matter where */
/* the sliders sit (the exact reported symptom). Their normals mirror  */
/* the shared planes (half-space the normal points AWAY from is kept), */
/* so slider semantics are identical: x keeps x < c (sagittal),        */
/* y keeps y < c (transverse), z keeps z < c (coronal).                */
/* ------------------------------------------------------------------ */

/** PiP-own plane per section axis — constant is rewritten from the sliders EVERY frame. */
const OWN_ACTIVE_PLANE: Record<SectionAxis, THREE.Plane> = {
  x: new THREE.Plane(new THREE.Vector3(-1, 0, 0), CLIP_BOUNDS.x.max),
  y: new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_BOUNDS.y.max),
  z: new THREE.Plane(new THREE.Vector3(0, 0, -1), CLIP_BOUNDS.z.max),
}

/** Stable one-element array per axis — avoids per-frame `[plane]` allocation. */
const OWN_ACTIVE_PLANE_LIST: Record<SectionAxis, THREE.Plane[]> = {
  x: [OWN_ACTIVE_PLANE.x],
  y: [OWN_ACTIVE_PLANE.y],
  z: [OWN_ACTIVE_PLANE.z],
}

/** The cap plane is clipped by the OTHER two OWN planes (three.js example). */
const OWN_OTHER_PLANES: Record<SectionAxis, THREE.Plane[]> = {
  x: [OWN_ACTIVE_PLANE.z, OWN_ACTIVE_PLANE.y],
  y: [OWN_ACTIVE_PLANE.x, OWN_ACTIVE_PLANE.z],
  z: [OWN_ACTIVE_PLANE.x, OWN_ACTIVE_PLANE.y],
}

/**
 * Stable three-plane array handed to scene materials for the color pass
 * while the checkbox is OFF (see the color-pass comment in SectionPiP).
 * Same length as ALL_CLIP_PLANES ⇒ swapping the reference in/out never
 * recompiles shaders (materials.ts updateClipping contract; three.js
 * WebGLClipping re-projects plane values per material per render anyway).
 */
const OWN_ALL_PLANES: THREE.Plane[] = [
  OWN_ACTIVE_PLANE.x,
  OWN_ACTIVE_PLANE.y,
  OWN_ACTIVE_PLANE.z,
]

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
/* Parity watchdog (PIP_FIX_PLAN §3)                                   */
/* ------------------------------------------------------------------ */

/** Side of the square center block read back after each cap pass. */
const PARITY_SAMPLE_BLOCK = 32
/** Consecutive zero-coverage stencil frames before MSAA is abandoned. */
const PARITY_ZERO_FRAME_LIMIT = 30

/**
 * r169 is WebGL2-only (multisampled render targets always available); the
 * optional isWebGL2 flag only guards a hypothetical three.js downgrade.
 */
function supportsMsaaTargets(gl: THREE.WebGLRenderer): boolean {
  const capabilities = gl.capabilities as { isWebGL2?: boolean }
  return capabilities.isWebGL2 !== false
}

/* ------------------------------------------------------------------ */
/* ?pipdebug diagnostics (PIP_FIX_PLAN §4)                             */
/* ------------------------------------------------------------------ */

/** Ground-truth readouts shared from the in-canvas renderer to the panel overlay. */
export interface SectionPipDiagnostics {
  /** Slider value of the active axis (au). */
  planeValue: number
  /** constant of the OWN active plane — proves the plane is live, never OFF_CONSTANT. */
  ownPlaneConstant: number
  /** Render-target size and MSAA sample count. */
  rtWidth: number
  rtHeight: number
  rtSamples: number
  /** Last blit rect actually set, logical CSS px, GL y-up origin bottom-left. */
  blitX: number
  blitY: number
  blitW: number
  blitH: number
  /** gl.getError() name after the passes ('off' while ?pipdebug is absent). */
  glErr: string
  /** Stencil-pass frame counter (frames where the parity passes ran). */
  frameCounter: number
  /** Cap coverage % of the sampled center block; −1 while the watchdog is idle. */
  capCoveragePct: number
  /** Consecutive zero-coverage frames (the watchdog's small counter). */
  parityZeroFrames: number
  /** True once the samples-0 fallback rig has been armed. */
  msaaFallback: boolean
}

/** Module-level singleton: the panel reads what the renderer writes. */
export const sectionPipDiagnostics: SectionPipDiagnostics = {
  planeValue: 0,
  ownPlaneConstant: 0,
  rtWidth: 0,
  rtHeight: 0,
  rtSamples: 0,
  blitX: 0,
  blitY: 0,
  blitW: 0,
  blitH: 0,
  glErr: 'off',
  frameCounter: 0,
  capCoveragePct: -1,
  parityZeroFrames: 0,
  msaaFallback: false,
}

/** '?pipdebug' or '?pipdebug=1' enables the overlay; '=0' explicitly disables. Read once. */
function readPipDebugFlag(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') return false
    const value = new URLSearchParams(window.location.search).get('pipdebug')
    return value !== null && value !== '0'
  } catch {
    return false
  }
}

const PIP_DEBUG_ENABLED = readPipDebugFlag()

function glErrorName(error: number): string {
  switch (error) {
    case 0x0000: return 'NO_ERROR'
    case 0x0500: return 'INVALID_ENUM'
    case 0x0501: return 'INVALID_VALUE'
    case 0x0502: return 'INVALID_OPERATION'
    case 0x0503: return 'STACK_OVERFLOW'
    case 0x0504: return 'STACK_UNDERFLOW'
    case 0x0505: return 'OUT_OF_MEMORY'
    case 0x0506: return 'INVALID_FRAMEBUFFER_OPERATION'
    case 0x9242: return 'CONTEXT_LOST_WEBGL'
    default: return `0x${error.toString(16)}`
  }
}

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
  // canvas needs none (capping renders PiP-only). stencilBuffer stays on
  // even at samples 0 — the fallback rig (PIP_FIX_PLAN §3) still needs the
  // parity trick, just without multisampling (driver-sensitive combination).
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
  // saturating). Only the OWN ACTIVE plane clips these passes — never the
  // shared singletons, never OFF_CONSTANT (see the OWN planes block).
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
  const gl = useThree((state) => state.gl)
  const quality = useAtlasStore((s) => s.quality)
  // MSAA policy (fix §3): samples 4 under 'high' on a WebGL2-class context,
  // 0 otherwise; a detected stencil-parity failure pins 0 for the session.
  const [msaaOverride, setMsaaOverride] = useState<number | null>(null)
  const msaaFallbackRef = useRef(false)
  // Rig depends on the tier only through MSAA samples; recreated on flips
  // (rare) and disposed through the effect cleanup.
  const rig = useMemo(() => {
    const base = quality === 'high' && supportsMsaaTargets(gl) ? 4 : 0
    return createPipRig(msaaOverride ?? base)
  }, [quality, gl, msaaOverride])
  useEffect(() => () => disposePipRig(rig), [rig])

  const scratch = useMemo(
    () => ({
      clearColor: new THREE.Color(),
      viewport: new THREE.Vector4(),
      scissor: new THREE.Vector4(),
    }),
    [],
  )

  // Watchdog scratch: one small RGBA block read back per stencil frame.
  const watch = useMemo(
    () => ({
      buffer: new Uint8Array(PARITY_SAMPLE_BLOCK * PARITY_SAMPLE_BLOCK * 4),
      zeroFrames: 0,
    }),
    [],
  )

  useFrame((state) => {
    const gl = state.gl
    const scene = state.scene
    const store = useAtlasStore.getState()
    const diag = sectionPipDiagnostics
    diag.msaaFallback = msaaFallbackRef.current

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
    // slider tick. THE SECTION DEFINITION IS THE SLIDERS (fix §1): the
    // checkbox only decides how the MAIN model is cut, never this panel.
    const axis: SectionAxis = store.sectionAxis
    const view = SECTION_VIEWS[axis]
    const planeValue = store.clip[axis]
    const highQuality = store.quality === 'high'
    const dpr = gl.getPixelRatio()

    /* ---- OWN live planes — constant = slider value, NEVER OFF_CONSTANT */
    OWN_ACTIVE_PLANE.x.constant = store.clip.x
    OWN_ACTIVE_PLANE.y.constant = store.clip.y
    OWN_ACTIVE_PLANE.z.constant = store.clip.z
    const activePlane = OWN_ACTIVE_PLANE[axis]

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

    /* ---- cap plane + stencil clipping planes from the OWN planes ----- */
    rig.capMaterial.clippingPlanes = OWN_OTHER_PLANES[axis]
    rig.capMaterial.color.copy(firstSectionCapColor() ?? FALLBACK_CAP_COLOR)
    const capMesh = rig.capMesh
    capMesh.position.copy(BOUNDS_CENTER)
    if (axis === 'x') capMesh.position.x = planeValue
    else if (axis === 'y') capMesh.position.y = planeValue
    else capMesh.position.z = planeValue
    capMesh.quaternion.setFromUnitVectors(PLUS_Z, view.cameraSide)
    rig.stencilBackMaterial.clippingPlanes = OWN_ACTIVE_PLANE_LIST[axis]
    rig.stencilFrontMaterial.clippingPlanes = OWN_ACTIVE_PLANE_LIST[axis]

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
      diag.frameCounter += 1

      /* ---- stencil parity watchdog (fix §3) ------------------------ */
      // Multisampled targets are driver-sensitive for the ±1 parity trick.
      // three.js resolves multisample buffers at the end of every render(),
      // so this readback sees the just-finished cap pass. 30 consecutive
      // zero-coverage stencil frames ⇒ broken parity ⇒ rebuild the rig at
      // samples 0 (stencilBuffer stays on). A slider parked outside every
      // solid can legitimately read 0 — the bounded false-positive cost is
      // losing MSAA smoothing only.
      if (rt.samples > 0 && !msaaFallbackRef.current) {
        const bw = Math.min(PARITY_SAMPLE_BLOCK, rt.width)
        const bh = Math.min(PARITY_SAMPLE_BLOCK, rt.height)
        const bx = Math.min(Math.max(0, ((rt.width - bw) / 2) | 0), rt.width - bw)
        const by = Math.min(Math.max(0, ((rt.height - bh) / 2) | 0), rt.height - bh)
        let covered = 0
        if (bw > 0 && bh > 0) {
          const pixels = watch.buffer
          gl.readRenderTargetPixels(rt, bx, by, bw, bh, pixels)
          const count = bw * bh
          for (let i = 0; i < count; i += 1) {
            const o = i * 4
            if (pixels[o] > 2 || pixels[o + 1] > 2 || pixels[o + 2] > 2) covered += 1
          }
        }
        const pct = (covered / (bw * bh)) * 100
        diag.capCoveragePct = Number.isFinite(pct) ? pct : 0
        if (covered === 0) {
          watch.zeroFrames += 1
          if (watch.zeroFrames >= PARITY_ZERO_FRAME_LIMIT) {
            msaaFallbackRef.current = true
            diag.msaaFallback = true
            console.warn(
              `[SectionPiP] stencil parity dead under ${rt.samples}×MSAA ` +
                `(cap coverage 0 across ${PARITY_ZERO_FRAME_LIMIT} stencil frames) — ` +
                'rebuilding the rig with samples 0, stencilBuffer stays on',
            )
            setMsaaOverride(0)
          }
        } else {
          watch.zeroFrames = 0
        }
        diag.parityZeroFrames = watch.zeroFrames
      } else {
        diag.capCoveragePct = -1
      }
    }

    /* ---- color pass (fix §1 + §2) ------------------------------------ */
    // Visual contract per checkbox state:
    //  - clip.enabled ON: shared planes already sit at the slider values
    //    (ClipSync) — keep them, so the PiP is bit-identical with the main
    //    view's cut.
    //  - clip.enabled OFF: shared planes park at OFF_CONSTANT (the original
    //    bug — uncut main model), yet the PiP must show the section as if
    //    the plane were active. The parity + cap passes above already used
    //    OWN planes; here the color pass borrows OWN_ALL_PLANES for this
    //    single render so the near half is removed and the cut illustration
    //    is complete (filled cap face, hollow beyond the active plane, cut
    //    by the other two sliders too). Only materials whose clippingPlanes
    //    IS ALL_CLIP_PLANES are swapped (reference equality — never shared
    //    Plane objects); unregistered materials render uncut from the ortho
    //    view, which stays a meaningful section. Same-length swap ⇒ no
    //    shader recompile; the swap is reverted before the frame ends, so
    //    the main view and ClipSync semantics are untouched.
    let restoreBorrowed: (() => void) | null = null
    if (!store.clip.enabled) {
      const borrowed: THREE.Material[] = []
      for (const material of registeredAnatomyMaterials()) {
        if (material.clippingPlanes === ALL_CLIP_PLANES) {
          material.clippingPlanes = OWN_ALL_PLANES
          borrowed.push(material)
        }
      }
      if (borrowed.length > 0) {
        restoreBorrowed = () => {
          for (const material of borrowed) material.clippingPlanes = ALL_CLIP_PLANES
        }
      }
    }
    try {
      gl.render(scene, pipCamera)
    } finally {
      if (restoreBorrowed !== null) restoreBorrowed()
    }

    gl.setClearColor(prevClearColor, prevClearAlpha)
    gl.setRenderTarget(prevTarget)
    gl.autoClear = prevAutoClear

    /* ---- diagnostics (fix §4) — writes are unconditional (nanoseconds);
            only the getError polling is gated on the URL flag ------------ */
    diag.planeValue = planeValue
    diag.ownPlaneConstant = activePlane.constant
    diag.rtWidth = rt.width
    diag.rtHeight = rt.height
    diag.rtSamples = rt.samples
    if (PIP_DEBUG_ENABLED) diag.glErr = glErrorName(gl.getContext().getError())

    /* ---- scissored blit into the panel viewport (fix §5) -------------- */
    // Rect is clamped into the canvas in CSS px first: a mid-resize frame,
    // a partially off-canvas panel, or a large/small toggle can never
    // produce a negative or oversized scissor. viewport + scissor are both
    // restored in a finally, even if the quad render throws.
    rig.blitQuad.scale.x = view.flipX ? -1 : 1
    const hostWidth = hostRect.width
    const hostHeight = hostRect.height
    const left = Math.min(Math.max(winRect.left - hostRect.left, 0), hostWidth)
    const bottom = Math.min(Math.max(hostRect.bottom - winRect.bottom, 0), hostHeight)
    const right = Math.min(Math.max(winRect.right - hostRect.left, 0), hostWidth)
    const top = Math.min(Math.max(hostRect.bottom - winRect.top, 0), hostHeight)
    const blitWidth = right - left
    const blitHeight = top - bottom
    if (blitWidth >= 1 && blitHeight >= 1) {
      // setViewport/setScissor take LOGICAL (CSS) px and multiply by the
      // renderer's pixel ratio INTERNALLY (r169 WebGLRenderer), so the
      // clamped CSS rect computed above is passed through as-is. The old
      // pre-multiplication by dpr double-scaled the blit on every HiDPI
      // display (dpr > 1), shoving the section off the panel — the same
      // in-bounds guarantee then broke again after the clamp.
      const x = left
      const y = bottom
      const w = blitWidth
      const h = blitHeight
      diag.blitX = x
      diag.blitY = y
      diag.blitW = w
      diag.blitH = h
      const prevScissorTest = gl.getScissorTest()
      const prevViewport = gl.getViewport(scratch.viewport)
      const prevScissor = gl.getScissor(scratch.scissor)
      try {
        gl.setScissorTest(true)
        gl.setViewport(x, y, w, h)
        gl.setScissor(x, y, w, h)
        gl.autoClear = false // never clear the main image under the quad
        gl.render(rig.blitScene, rig.blitCamera)
      } finally {
        // Restore EVERYTHING the blit touched — including autoClear, whose
        // sticky `false` would suppress the next frame's main-view clear.
        gl.autoClear = prevAutoClear
        gl.setViewport(prevViewport.x, prevViewport.y, prevViewport.z, prevViewport.w)
        gl.setScissor(prevScissor.x, prevScissor.y, prevScissor.z, prevScissor.w)
        gl.setScissorTest(prevScissorTest)
      }
    }
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

/**
 * ?pipdebug overlay (fix §4): DOM readout inside the panel window, fed by
 * the module-level sectionPipDiagnostics singleton through a rAF loop that
 * writes textContent directly — no React re-renders, zero cost when the
 * flag is absent (renders null and the effect no-ops).
 */
function PipDebugOverlay() {
  const ref = useRef<HTMLPreElement>(null)
  useEffect(() => {
    if (!PIP_DEBUG_ENABLED) return
    if (typeof requestAnimationFrame === 'undefined') return
    let raf = 0
    let stopped = false
    const tick = () => {
      if (stopped) return
      const node = ref.current
      if (node !== null) {
        const d = sectionPipDiagnostics
        node.textContent = [
          `plane   ${d.planeValue.toFixed(1)} au`,
          `own     ${d.ownPlaneConstant.toFixed(1)}`,
          `rt      ${d.rtWidth}×${d.rtHeight}×${d.rtSamples}`,
          `blit    ${d.blitX.toFixed(0)},${d.blitY.toFixed(0)} ${d.blitW.toFixed(0)}×${d.blitH.toFixed(0)}`,
          `glErr   ${d.glErr}`,
          `frame   ${d.frameCounter}`,
          d.capCoveragePct >= 0 ? `cap     ${d.capCoveragePct.toFixed(0)}%` : 'cap     n/a',
          `zero    ${d.parityZeroFrames}`,
          d.msaaFallback ? 'mode    MSAA→0 fallback' : 'mode    msaa',
        ].join('\n')
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [])
  if (!PIP_DEBUG_ENABLED) return null
  return <pre className="pip-debug" ref={ref} aria-hidden="true" />
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
        {/* Always-render (fix §2): this note is informational only and never
            gates the section — the canvas below always shows the slice that
            the sliders define, checkbox on or off. */}
        {clipEnabled ? null : (
          <span
            className="pip-offnote"
            title='Enable clipping cuts the main 3D model. The live section always follows the sliders.'
          >
            model not clipped — section synced to sliders
          </span>
        )}
        <PipDebugOverlay />
      </div>
    </div>
  )
}

export default SectionPiP
