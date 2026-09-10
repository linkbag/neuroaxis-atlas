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
 * down the plane normal. The final blit flips x for the transverse (y) and
 * sagittal (x) axes — exactly the axes whose own-plane camera basis comes out
 * mirrored relative to the SectionCanvas display convention (AXIS_PAIR:
 * y → u=x, x → u=z, z → u=x, v=y). This was verified numerically rather than
 * assumed (three.js projection math, `assets-src/pip-orient-probe.mjs`): a
 * point at +x = patient-left projects to the LEFT half of the render target
 * for y and x (so the flip restores patient-left-on-image-right) and to the
 * RIGHT half for z (so coronal needs no flip). §2.2 badge labels follow from
 * the same table — see SECTION_VIEWS.
 *
 * ── v4 REAL-SLICE BACKDROP (IMAGING_V4_PLAN §2 gap 4 + §4, task
 *    `pip-backdrop`) ──────────────────────────────────────────────────────
 * The panel now paints the REAL image of the active modality — the anchored
 * photographic plate when one is within its anchor tolerance, else the
 * continuous CT grid, else the MRI grid — into the top of its render target,
 * BEFORE the stencil/cap/color passes, so the 3D cut anatomy composites over
 * real imagery instead of over black.
 *
 * COMPOSITING ORDER inside the private render target (per frame; the RT is the
 * same one the bfeceb0 fix established, nothing about the existing passes
 * changed):
 *   0. `gl.autoClear = false`; the RT is ALWAYS entered with explicit clears:
 *        (a) backdrop cache REDRAWN → `gl.clear(color|depth|stencil)` wipes the
 *            whole target (background = the sampler's fill colour, tone-mapped
 *            so it matches the old black clear);
 *        (b) cache HIT → `gl.clearDepth()` + `gl.clearStencil()` only: the real
 *            slice painted last time has to survive, so the backdrop is never
 *            wiped between frames (this is the "the RT clear must not wipe the
 *            backdrop" requirement of the task);
 *   1. BACKDROP PASS — one PlaneGeometry quad carrying a CanvasTexture, placed
 *      exactly in the PiP camera's own view plane (position/rotation/scale
 *      copied from the camera each frame) and drawn with depthTest +
 *      depthWrite OFF, so the depth buffer stays cleared for pass 3 and the
 *      quad can never occlude anatomy. Skipped entirely when the modality has
 *      no data at this plane (the sampler reports `drew: false`) or when a
 *      previous plane's backdrop is still in the RT;
 *   2. STENCIL PARITY + CAP passes (unchanged, high quality only): override
 *      materials → cap plane at the active plane, clipped by the other two
 *      OWN planes. These write depth/stencil and their *colour* output lands
 *      over the backdrop, which is intended: the cut face is anatomy;
 *   3. COLOUR PASS (`gl.render(scene, pipCamera)`, with the OWN-plane borrow
 *      when `clip.enabled` is false) — the 3D scene draws over the backdrop
 *      through normal depth-tested compositing;
 *   4. scissored BLIT into the panel viewport (unchanged).
 *
 * Texture update policy (task 3): the sampled canvas is redrawn at most once
 * per plane change / modality change / RT resize / data arrival — never per
 * frame — through a cache keyed by `${axis}|${rounded plane}|${modality}` plus
 * the RT pixel size; a redraw sets `texture.needsUpdate = true`. Rounded plane
 * = 0.25 au, the quantization the 2D canvas uses. Cost when the PiP is hidden
 * or the modality has no data: nothing at all (the backdrop pass returns
 * before touching GL state).
 *
 * ORIENTATION: the sampler renders in SectionCanvas space and this component
 * asks it for `mirrorX = view.flipX`, i.e. the image is mirrored in the render
 * target for exactly the axes whose blit flips x — so the backdrop and the 3D
 * geometry land on the same screen pixels (proved by the same projection probe:
 * for y/x the RT u axis runs opposite to the canvas u axis, for z it agrees).
 * Nothing about the geometry passes changed.
 *
 * FALLBACK (task 5, evidence-based): NOT taken. The risks the task names —
 * depth ordering and the cap pass — are handled structurally rather than by
 * hope: the backdrop pass writes no depth and no stencil, the depth/stencil
 * buffers are cleared before it, and the cap pass is a stencil test that the
 * backdrop cannot influence (MeshBasicMaterial defaults to stencilWrite
 * false). The only pass that must observe an unchanged RT is the MSAA parity
 * watchdog, and that is handled explicitly: with a backdrop present the
 * watchdog cannot distinguish "cap drew" from "backdrop only", so it idles
 * (capCoveragePct = −1) and the zero-coverage counter is reset instead of
 * counting. The GPU cut therefore keeps its full bfeceb0 behaviour, with the
 * real slice underneath it.
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
import {
  renderSliceToCanvas,
  resolveSliceModality,
  warmSliceModality,
  type SliceMissReason,
  type SliceModality,
} from '../section/imageLayers'
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
   * Horizontal mirror applied to the FINAL displayed section so it matches
   * §2.2 (see the header note + the projection probe): needed for transverse
   * (radiological: patient-left on image-right) and sagittal (anterior right);
   * coronal already comes out patient-left-right. The badge table below is the
   * §2.2 table AFTER that mirror — i.e. the letters a viewer actually sees on
   * each edge. Before the v4 backdrop work these two axes were labelled with
   * the pre-mirror letters (y showed 'A' top / 'L' right, x showed 'A' right),
   * which contradicted the geometry; the geometry is authoritative and
   * unchanged, so the badges were corrected to match it.
   */
  flipX: boolean
  /** Edge badges — §2.2 orientation, as displayed. */
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
    labels: { top: 'P', bottom: 'A', left: 'L', right: 'R' },
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
/* the shared planes; three.js keeps the side the normal points TOWARD */
/* (fragments with negative signed distance n·p + c are discarded), so */
/* slider semantics are identical: x keeps x < c (sagittal), y keeps   */
/* y < c (transverse), z keeps z < c (coronal).                        */
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
  /* ---- v4 real-slice backdrop (?pipdebug readouts) ------------------ */
  /** Modality asked for at this plane ('auto' | 'stain' | 'ct' | 'mri' | 'none'). */
  backdropRequested: SliceModality
  /** Modality that actually painted (or 'none'). */
  backdropModality: SliceModality
  /** Cache key of the backdrop texture currently in the RT ('' = none). */
  backdropKey: string
  /** True when the backdrop was redrawn on the last frame (cache miss). */
  backdropRedraw: boolean
  /** Verbatim credit line of the painted slice ('' when nothing painted). */
  backdropCredit: string
  /** Why the requested modality could not paint ('' = it did, or 'none'). */
  backdropReason: SliceMissReason | ''
  /** Backdrop canvas size in KB (0 when the pass never ran). */
  backdropKb: number
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
  backdropRequested: 'none',
  backdropModality: 'none',
  backdropKey: '',
  backdropRedraw: false,
  backdropCredit: '',
  backdropReason: '',
  backdropKb: 0,
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
  /* ---- v4 real-slice backdrop (pass 1 of the compositing order) ---- */
  backdropScene: THREE.Scene
  backdropQuad: THREE.Mesh
  backdropMaterial: THREE.MeshBasicMaterial
  backdropTexture: THREE.CanvasTexture
  backdropCanvas: HTMLCanvasElement
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

  /* ---- v4 real-slice backdrop ----------------------------------------- */
  // The backdrop is a canvas rendered by imageLayers.renderSliceToCanvas (the
  // documented canvas→texture path) wrapped in a CanvasTexture. The quad lives
  // in the PiP camera's own view plane: every frame it copies the camera's
  // position/rotation and is scaled to the aspect-fitted ortho extents, so one
  // texel of the canvas maps 1:1 onto RT pixels. depthTest/depthWrite are OFF
  // (the quad is painted FIRST, behind everything: it must not write depth and
  // must not be occluded), toneMapped false (the canvas already holds display
  // colours and the RT pass must not tone-map them a second time).
  const backdropCanvas = document.createElement('canvas')
  backdropCanvas.width = 2
  backdropCanvas.height = 2
  // Warm the 2D context once and let the browser keep it CPU-side: the sampler
  // reads the pixels back into a GPU texture on every redraw, so a
  // GPU-resident canvas would force a readback stall each time.
  backdropCanvas.getContext('2d', { willReadFrequently: true })
  const backdropTexture = new THREE.CanvasTexture(backdropCanvas)
  backdropTexture.colorSpace = THREE.SRGBColorSpace
  backdropTexture.minFilter = THREE.LinearFilter
  backdropTexture.magFilter = THREE.LinearFilter
  backdropTexture.generateMipmaps = false
  backdropTexture.needsUpdate = true
  const backdropMaterial = new THREE.MeshBasicMaterial({
    map: backdropTexture,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
    // No stencil interaction: the ±1 parity of the cap pass must observe only
    // scene geometry (three.js only writes stencil when stencilWrite is set).
    stencilWrite: false,
  })
  const backdropQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial)
  backdropQuad.frustumCulled = false
  backdropQuad.renderOrder = -1
  const backdropScene = new THREE.Scene()
  backdropScene.add(backdropQuad)

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
    backdropScene,
    backdropQuad,
    backdropMaterial,
    backdropTexture,
    backdropCanvas,
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
  rig.backdropMaterial.dispose()
  rig.backdropTexture.dispose()
  rig.backdropQuad.geometry.dispose()
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

  /**
   * v4 backdrop cache (task 3: redraw at most once per plane/modality change).
   * `key` is the plane+modality+size key that was last SAMPLED — a cache hit
   * means there is nothing new to sample (and, with `drawn` true, that the RT
   * holds this slice, so the frame must not clear colour over it). `drawn` is
   * false while the resolved modality has not painted yet (e.g. a photographic
   * plate still decoding, or a grid still fetching); that pending state is
   * deliberately sticky so the sampler is not run once per frame while an
   * image loads, and it is re-armed when the plane, axis, modality or data
   * availability changes. `key === null` means no backdrop is in the RT.
   */
  const backdrop = useMemo(
    () => ({
      key: null as string | null,
      drawn: false,
      modality: 'none' as SliceModality,
      credit: '',
      redraws: 0,
      skipped: 0,
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

    /* ---- PASS 1: the real slice backdrop (v4, IMAGING_V4_PLAN §4) ----
     * What to paint: the store's underlay kind decides. 'none' is the explicit
     * "simulated only" mode, which keeps the panel as the pre-v4 pure GPU cut
     * and is therefore the honest state while the store still defaults to
     * 'none'; 'auto'/'stain'/'ct'/'mri' paint real imagery, and 'auto' is the
     * real-first resolution (anchored photo → CT → MRI). The store's
     * SectionUnderlayKind is frozen to 'none'|'stain'|'mri' by this task's
     * write scope, so 'auto'/'ct' arrive when `modality-layers` widens it —
     * the panel handles all four from the first frame (see the cast below).
     * Cache key: axis + 0.25-au-rounded plane + modality + RT pixel size —
     * a redraw happens ONLY when one of those changes (task 3), never per
     * frame, and the data-arrival callback below invalidates it once when a
     * grid finishes loading.
     */
    const rawKind = (store.sectionUnderlay as { kind?: unknown }).kind
    const requested: SliceModality =
      rawKind === 'stain' || rawKind === 'mri' || rawKind === 'ct' || rawKind === 'none'
        ? rawKind
        : 'auto' // 'auto' and anything unknown → real-first resolution
    const backdropKey =
      requested === 'none'
        ? null
        : `${axis}|${(Math.round(planeValue / 0.25) * 0.25).toFixed(2)}|${requested}|${rtWidth}x${rtHeight}`
    let backdropPainted = false
    diag.backdropRequested = requested
    diag.backdropRedraw = false
    const canvas = rig.backdropCanvas
    if (canvas.width !== rtWidth || canvas.height !== rtHeight) {
      // The RT was resized (panel resize, quality flip, dpr change): the canvas
      // must match it 1:1 and whatever is cached is stale by definition.
      canvas.width = rtWidth
      canvas.height = rtHeight
      backdrop.key = null
      backdrop.drawn = false
    }
    // A pending backdrop (resolved, not yet painted — a plate still decoding or
    // a grid still fetching) is re-sampled only when something that can change
    // the answer changes, never once per frame.
    const mustSample =
      backdropKey !== null &&
      (backdropKey !== backdrop.key || (backdrop.key !== null && !backdrop.drawn))
    if (mustSample) {
      // Snapshot what an unchanged frame must observe, so a *changed* frame
      // can compare against it explicitly.
      const previousModality = backdrop.modality
      const previousCredit = backdrop.credit
      const wasDrawn = backdrop.drawn

      const result = renderSliceToCanvas(
        canvas,
        {
          axis,
          value: planeValue,
          width: rtWidth,
          height: rtHeight,
          // Aspect-fit extents exactly as the ortho camera below — one canvas
          // texel then maps onto one RT pixel.
          halfU,
          halfV,
          // Mirror for exactly the axes whose blit flips x (see the header):
          // the image is laid out in SectionCanvas space, the RT/display basis
          // is mirrored for y/x, so mirroring here cancels the blit mirror and
          // the backdrop lands under the same anatomy as the 3D cut.
          mirrorX: view.flipX,
          opacity: 1,
        },
        requested,
        { background: `#${CLEAR_COLOR.getHexString()}`, upsample: 4 },
      )
      backdrop.key = backdropKey
      backdrop.drawn = result.drew
      backdrop.modality = result.modality
      backdrop.credit = result.credit ?? ''
      backdrop.redraws += 1
      backdropPainted = result.drew
      // Upload only when what is displayed actually changed.
      if (
        !wasDrawn && result.drew ||
        previousModality !== backdrop.modality ||
        previousCredit !== backdrop.credit
      ) {
        rig.backdropTexture.needsUpdate = true
      }
      // Warm the continuous grids once so a later plane/modality switch can
      // paint immediately instead of waiting for the first fetch. The callback
      // drops the cache only when the arriving grid is the one we wanted.
      warmSliceModality(requested, () => {
        if (!backdrop.drawn) backdrop.key = null
      })
    } else if (backdropKey !== null) {
      backdrop.skipped += 1
    } else {
      // 'simulated only' or the slider left the modality's coverage: drop the
      // stamp so the attribution chip cannot keep naming an image that is no
      // longer on screen.
      backdrop.key = null
      backdrop.drawn = false
      backdrop.modality = 'none'
      backdrop.credit = ''
    }
    diag.backdropModality = backdrop.modality
    diag.backdropKey = backdrop.drawn ? backdropKey ?? '' : ''
    diag.backdropCredit = backdrop.drawn ? backdrop.credit : ''
    diag.backdropRedraw = backdropPainted
    // Why nothing was painted — honest states, never a blank panel mystery
    // (plan §6: "'no real data at this plane' states are honest").
    diag.backdropReason =
      requested === 'none' || backdrop.drawn
        ? ''
        : (resolveSliceModality(axis, planeValue, requested, null).reason ?? 'unavailable')

    if (backdropPainted) {
      // Depth + stencil are cleared first and the backdrop quad writes neither
      // of them, so pass 2/3 still see a clean depth buffer AND a clean parity
      // buffer. Colour is NOT cleared here — that is the whole point: the
      // backdrop quad paints over the previous frame's RT contents.
      gl.clearDepth()
      gl.clearStencil()
      const quad = rig.backdropQuad
      quad.position.copy(pipCamera.position)
      quad.quaternion.copy(pipCamera.quaternion)
      quad.scale.set(halfU * 2, halfV * 2, 1)
      quad.updateMatrixWorld(true)
      gl.render(rig.backdropScene, pipCamera)
    } else if (backdrop.drawn) {
      // Cache hit: the RT already holds this slice. Only depth/stencil are
      // reset for the passes below.
      gl.clearDepth()
      gl.clearStencil()
    } else {
      // No real imagery at this plane, or 'simulated only' (kind 'none'), or
      // the plane moved somewhere the modality does not cover: the panel shows
      // the pure GPU cut on the same black the pre-v4 rig used, and the frame
      // must FULLY clear so a slice from a previous plane/modality cannot
      // linger. This is the steady state while nothing is drawn, one clear per
      // frame.
      gl.clear(true, true, true)
    }
    diag.backdropKb = (rig.backdropCanvas.width * rig.backdropCanvas.height * 4) / 1024

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
      //
      // v4: the readback looks at COLOUR, and a real-slice backdrop keeps the
      // centre block non-black even when the cap draws nothing. That would
      // mask the very failure this watchdog detects, so it only runs on frames
      // whose RT does NOT hold a backdrop; on backdrop frames it idles
      // (capCoveragePct = −1) and clears its zero counter instead of counting.
      if (rt.samples > 0 && !msaaFallbackRef.current && !backdrop.drawn) {
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
        // Idle: either the tier has no stencil frames or a real-slice backdrop
        // is in the RT (see above). Never count zeros the backdrop could have
        // caused.
        diag.capCoveragePct = -1
        if (backdrop.drawn) {
          watch.zeroFrames = 0
          diag.parityZeroFrames = 0
        }
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
          `back    ${d.backdropModality}${d.backdropKey === '' ? ` (none${d.backdropReason === '' ? '' : `: ${d.backdropReason}`})` : ''}`,
          `bkey    ${d.backdropKey === '' ? '—' : d.backdropKey}`,
          `bredraw ${d.backdropRedraw ? 'yes' : 'no'} ${d.backdropKb.toFixed(0)}KB`,
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

/**
 * Live credit line of the slice the panel is currently showing (v4: "the
 * active modality's credit renders always visible in the section view",
 * IMAGING_V4_PLAN §4). Fed from `sectionPipDiagnostics.backdropCredit`, which
 * the renderer writes from the sampler's result — the string is the modality's
 * VERBATIM credit line straight out of imageLayers (UBC CC BY-NC-SA line, NLM
 * Visible Human acknowledgement, OpenNeuro ds007313 provenance). The element
 * stays empty while no real slice is painted — that state is honest: the panel
 * is showing the pure GPU cut alone. Inline styles keep this file's write scope
 * (styles/sectionPip.css belongs to other tasks) and the box sits over the
 * bottom-left corner of the section window, the same corner the 2D canvas uses
 * for the same purpose.
 */
function PipAttribution() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') return
    // The rAF loop is always created while the panel is mounted (the same
    // pattern as PipDebugOverlay): a plain textContent read costs nothing, and
    // unlike a store subscription it cannot re-render React at 60 fps. The
    // string is only ASSIGNED when it changes, so the browser is never asked to
    // do layout work for an unchanged credit line.
    let raf = 0
    let stopped = false
    const tick = () => {
      if (stopped) return
      const node = ref.current
      if (node !== null) {
        const text = sectionPipDiagnostics.backdropCredit
        if (node.textContent !== text) node.textContent = text
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [])
  return (
    <span
      className="pip-credit"
      ref={ref}
      title="Real-imagery source for the slice shown behind the 3D cut"
      style={{
        position: 'absolute',
        left: 4,
        bottom: 4,
        maxWidth: 'calc(100% - 8px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '1px 4px',
        borderRadius: 3,
        background: 'rgba(13, 21, 38, 0.78)',
        color: '#94a3b8',
        font: '9px/1.35 system-ui, sans-serif',
        pointerEvents: 'none',
      }}
    />
  )
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
        <PipAttribution />
        <PipDebugOverlay />
      </div>
    </div>
  )
}

export default SectionPiP
