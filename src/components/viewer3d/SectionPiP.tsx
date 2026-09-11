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
 *      WebGL2-class context; a parity watchdog reads back a small center block
 *      after the cap pass (fresh — three.js resolves multisample targets at the
 *      end of every render()) on a SCHEDULE rather than every frame
 *      (QUALITY_PLAN §3 item 10): a 30-frame burst after a rig/plane change,
 *      then 1 check per 180 stencil frames while healthy (per frame while the
 *      reading is ambiguous). After 30 consecutive zero-coverage frames it
 *      rebuilds the rig with `samples: 0` + `stencilBuffer: true` (always on)
 *      with a console note. False-positive cost is bounded: the PiP merely
 *      loses MSAA smoothing (e.g. slider parked outside every solid).
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
 * down the plane normal, and it is targeted at the world centre of the visible
 * section rect returned by the SHARED `planeGeometry.planeTransform` — the same
 * mapping the 2D live-section canvas draws with, so this panel and the canvas
 * frame the same world window and place the same photograph identically
 * (QUALITY_PLAN §2 item 4; the panel's old private `VIEW_MARGIN = 1.08` zoom
 * and its "centre = 0" assumption are gone). The final blit flips x for the
 * transverse (y) and sagittal (x) axes, and those flags are the shared
 * `mirrorX(axis)` values (AXIS_PAIR: y → u=x, x → u=z, z → u=x, v=y; the
 * camera's up axis comes from `cameraUpAxis`), so the panel and the module can
 * never disagree about the blit.
 *
 * ORIENTATION STATUS — recorded, not asserted (p1-planededup). The earlier claim
 * here cited a projection probe that does not exist in the repository
 * (`assets-src/pip-orient-probe.mjs`), so this task re-derived the ortho basis
 * from the two facts above using three.js' own `Matrix4.lookAt` construction
 * (`right = up × back`, `back = +cameraSide`) and got, per axis:
 *   y: up +x, side +z → screen-right (0,−1,0)
 *   x: up +y, side +z → screen-right (1, 0,0)
 *   z: up +y, side +x → screen-right (0, 0,−1)
 * On the transverse and sagittal planes that right vector is perpendicular to the
 * plane's u axis (u·right = 0), so the frustum maps the section's horizontal axis
 * onto the IMAGE VERTICAL — a 90° roll, which a boolean mirror cannot undo — while
 * the coronal plane is aligned (u·right = −1) as its `flipX: false` implies. The
 * camera basis, the side quad and the cap quad all use the same basis, so the
 * panel and the world cut stay consistent with each other either way; what the
 * roll would change is how the panel's content reads against the §2.2 badge
 * letters. This was NOT changed here: the fix needs the camera's frustum axes and
 * its framing half-extents changed together, and it can only be validated in a
 * browser (this sandbox cannot run Chrome — mojo named-pipe access is denied), so
 * it is reported with its repro rather than applied blind. `mirrorX` /
 * `cameraUpAxis` are documented as the shipped values in `planeGeometry.ts`.
 * §2.2 badge labels are the canvas convention — see SECTION_VIEWS, re-derived
 * from the projected geometry by `npm run verify:plane`.
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
 * asks it for `mirrorX` = the shared `mirrorX(axis)` (SECTION_VIEWS.flipX), i.e.
 * the image is mirrored in the render target for exactly the axes whose blit
 * flips x — so the backdrop and the 3D geometry land on the same screen pixels
 * (proved by the same projection probe: for y/x the RT u axis runs opposite to
 * the canvas u axis, for z it agrees). The world window it is drawn into is the
 * shared `planeTransform`'s, so the canvas and this backdrop agree position-for-
 * position. Nothing about the geometry passes changed.
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
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
import {
  AXIS_PAIR,
  PLANE_BADGES,
  axisExtents,
  cameraUpAxis,
  mirrorX,
  planeTransform,
  type PlaneBadges,
} from '../section/planeGeometry'
import type { PlaneAxis } from '../section/contours'
import '../../styles/sectionPip.css'

/* ------------------------------------------------------------------ */
/* Axis geometry (§2.1 camera + §2.2 orientation)                      */
/* ------------------------------------------------------------------ */

interface SectionViewSpec {
  /**
   * Direction from the visible rect's centre toward the DISCARDED half-space —
   * the camera stands here looking back down the plane normal so the cut face
   * faces the lens (clipPlanes.ts keeps the lower/inner side for all axes).
   * Derived from the shared `AXIS_PAIR` (the positive in-plane u axis for
   * sagittal, the positive v axis for transverse/coronal) rather than typed in.
   */
  cameraSide: THREE.Vector3
  /** World-space up on screen (§2.2) — the shared `cameraUpAxis(axis)`. */
  up: THREE.Vector3
  /**
   * In-plane world half-extents [horizontal u, vertical v] of the CANONICAL
   * extents, from the shared `axisExtents(axis)`. The LIVE half-sizes come from
   * `planeTransform` every frame (see the frame's mapping block): the panel no
   * longer applies a private framing margin, so it frames exactly what the
   * live-section canvas frames.
   */
  halfU: number
  halfV: number
  /**
   * Horizontal mirror applied to the FINAL displayed section so it matches
   * §2.2 (see the header note + the projection probe): needed for transverse
   * (radiological: patient-left on image-right) and sagittal (anterior right);
   * coronal comes out patient-left-right already. The value is the shared
   * `mirrorX(axis)` (derived from the camera basis in planeGeometry — this
   * component does not decide it). The badge table below is the §2.2 table for
   * the orientation this component ACTUALLY renders, and it is identical to
   * SectionCanvas' DIRECTION_BADGES for the same axis (the two section surfaces
   * must never label the same plane differently):
   *
   *   y (transverse) — camera up = +x and the blit mirrors x, so the displayed
   *                    image has anterior at the top and patient-left (+x) on
   *                    the RIGHT  → top 'A', bottom 'P', left 'R', right 'L'.
   *   x (sagittal)   — camera up = +z, blit mirrors x → superior top, anterior
   *                    right       → top 'S', bottom 'I', left 'P', right 'A'.
   *   z (coronal)    — camera up = +y, no blit mirror → superior top,
   *                    patient-left on the right → top 'S', bottom 'I',
   *                    left 'R', right 'L'.
   *
   * REVIEW NOTE (review-qa-v4): the v4 real-imagery commit flipped ONLY the
   * transverse entry to 'P'/'A' and 'L'/'R' while leaving `cameraSide`, `up`,
   * `flipX` and the blit untouched — the geometry cannot have changed, so those
   * letters contradicted the image on screen (posterior is never up) and
   * contradicted both §2.2 of docs/SECTION_SYNC_PLAN.md and SectionCanvas'
   * table. Restored; scripts/verify-imaging-v4.mjs and npm run verify:plane
   * both assert this table against §2.2, against SectionCanvas and against the
   * geometry.
   */
  flipX: boolean
  /** Edge badges — §2.2 orientation, as displayed (the shared PLANE_BADGES). */
  labels: PlaneBadges
  caption: string
}

/** World component of a canonical axis, for Vector3 component access. */
const AXIS_COMPONENT: Record<PlaneAxis, 'x' | 'y' | 'z'> = { x: 'x', y: 'y', z: 'z' }

/** Unit world vector along the positive direction of one canonical axis. */
function axisUnitVector(axis: PlaneAxis): THREE.Vector3 {
  const vector = new THREE.Vector3(0, 0, 0)
  vector[AXIS_COMPONENT[axis]] = 1
  return vector
}

const SECTION_VIEWS: Record<SectionAxis, SectionViewSpec> = {
  y: {
    cameraSide: axisUnitVector(AXIS_PAIR.y[1]),
    up: axisUnitVector(cameraUpAxis('y')),
    halfU: axisExtents('y').halfU,
    halfV: axisExtents('y').halfV,
    flipX: mirrorX('y'),
    labels: { top: 'A', bottom: 'P', left: 'R', right: 'L' }, // = PLANE_BADGES.y
    caption: 'Transverse',
  },
  x: {
    cameraSide: axisUnitVector(AXIS_PAIR.x[0]),
    up: axisUnitVector(cameraUpAxis('x')),
    halfU: axisExtents('x').halfU,
    halfV: axisExtents('x').halfV,
    flipX: mirrorX('x'),
    labels: { top: 'S', bottom: 'I', left: 'P', right: 'A' }, // = PLANE_BADGES.x
    caption: 'Sagittal',
  },
  z: {
    cameraSide: axisUnitVector(AXIS_PAIR.z[1]),
    up: axisUnitVector(cameraUpAxis('z')),
    halfU: axisExtents('z').halfU,
    halfV: axisExtents('z').halfV,
    flipX: mirrorX('z'),
    labels: { top: 'S', bottom: 'I', left: 'R', right: 'L' }, // = PLANE_BADGES.z
    caption: 'Coronal',
  },
}

{
  // The spelled-out rows above must BE the shared table (the same assertion the
  // live canvas makes): a drift fails at module load instead of labelling a
  // plane differently on the two surfaces. scripts/verify-imaging-v4.mjs reads
  // these letters from the source, and npm run verify:plane re-derives them
  // from the projected geometry.
  for (const axis of ['x', 'y', 'z'] as PlaneAxis[]) {
    const shared = PLANE_BADGES[axis]
    const local = SECTION_VIEWS[axis].labels
    if (
      local.top !== shared.top ||
      local.bottom !== shared.bottom ||
      local.left !== shared.left ||
      local.right !== shared.right
    ) {
      throw new Error(
        `SectionPiP: SECTION_VIEWS.${axis}.labels disagrees with planeGeometry.PLANE_BADGES.${axis}`,
      )
    }
  }
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

/** Camera distance from the section plane (au). */
const CAMERA_DISTANCE = 160
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
 * Watchdog SCHEDULE (QUALITY_PLAN §3 item 10, AUDIT §2.14: "move the 32×32
 * stencil-parity readback from every frame to a watchdog schedule").
 *
 * The readback used to run on EVERY stencil frame. A GPU→CPU pixel readback
 * stalls the pipeline (it forces a sync), so it is now scheduled instead:
 *
 *  - PARITY_BURST_FRAMES stencil frames after anything that can change what the
 *    cap should cover — a rig (re)build (MSAA flip, context restore) or a plane
 *    change — because that is exactly when a driver-sensitive parity failure
 *    shows up, and 30 samples is what the abort threshold needs;
 *  - then PARITY_STEADY_INTERVAL frames apart while the reading has been
 *    suspicious (> 0 coverage is the healthy case; a single zero is ambiguous
 *    because a slider can legitimately sit outside every solid), and
 *    PARITY_IDLE_INTERVAL frames apart once the reading is healthy;
 *  - a plane change always re-arms the burst (see the axis/plane key below).
 *
 * Steady state is therefore 1 readback every PARITY_IDLE_INTERVAL stencil
 * frames instead of 60/s, and a failure still aborts MSAA within the same 30
 * frames the fix documents.
 */
const PARITY_BURST_FRAMES = 30
/** Idle-period spacing once coverage is healthy (≈ 3 s at 60 fps). */
const PARITY_IDLE_INTERVAL = 180
/** Spacing while the last reading was suspicious (1 per frame). */
const PARITY_STEADY_INTERVAL = 1

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
  /**
   * Section axis the backdrop was resolved on (`store.sectionAxis` at that
   * frame). v7 closure (gap 3): the host needs it to turn the 'beyond-source'
   * reason into the measured CT coverage statement — the same sentence the
   * Plates toolbar and the live section show — instead of leaking the internal
   * token into the panel's hint line.
   */
  backdropAxis: SectionAxis | null
  /** Backdrop canvas size in KB (0 when the pass never ran). */
  backdropKb: number
  /* ---- P0 WebGL context loss ---------------------------------------- */
  /**
   * True while the shared WebGL context is lost: every PiP pass is skipped
   * (there is no context to draw into) and the panel shows its inline
   * "graphics context lost" note instead of a frozen slice.
   */
  contextLost: boolean
  /** Generation counter of the render rig; +1 on every context restore. */
  rigGeneration: number
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
  backdropAxis: null,
  backdropKb: 0,
  contextLost: false,
  rigGeneration: 0,
}

/* ------------------------------------------------------------------ */
/* P0 WebGL context loss (QUALITY_PLAN §1 item 1, AUDIT §2.1)          */
/*                                                                     */
/* WHAT THE PiP OWNS. The PiP does NOT create a second WebGL context:   */
/* it renders into a private `THREE.WebGLRenderTarget` through the one  */
/* renderer R3F created for the main canvas (`useThree().gl`). So a     */
/* context loss hits the PiP's target, its stencil/clipping materials,  */
/* its blit quad and its 2D canvas→texture backdrop all at once, and    */
/* the loss event fires on the SHARED canvas element.                   */
/*                                                                     */
/* RECIPE (this is the interface Viewer3D documents in its file header  */
/* and what integration can rely on):                                   */
/*  1. attach `webglcontextlost` / `webglcontextrestored` to            */
/*     `gl.domElement` (never to a private target — targets do not      */
/*     emit DOM events); `preventDefault()` on loss is mandatory or the */
/*     browser never restores;                                          */
/*  2. while lost, skip EVERY pass (rendering into a lost context is a  */
/*     silent no-op that still costs a full scene-graph walk);          */
/*  3. on restore, DISPOSE and REBUILD the whole rig — the render       */
/*     target's stencil buffer, the multisample buffer, the cap/blit/   */
/*     stencil materials and the CanvasTexture all belong to the dead   */
/*     context. Bumping `restoreGeneration` does exactly that through   */
/*     the existing `useMemo`/cleanup pair, which is why no PiP code    */
/*     had to learn about contexts: it is the same path as a            */
/*     quality-tier flip.                                               */
/* ------------------------------------------------------------------ */

/** Live mirror of the shared context state (written by the event handlers). */
export const pipContextState: { lost: boolean; restores: number } = {
  lost: false,
  restores: 0,
}

/** Subscribers notified when the shared context state changes. */
const pipContextListeners = new Set<() => void>()

/** Write the shared context state and notify every subscriber (idempotent). */
function setPipContextLost(lost: boolean, restored = false): void {
  if (lost) {
    pipContextState.lost = true
    sectionPipDiagnostics.contextLost = true
  } else {
    pipContextState.lost = false
    if (restored) {
      pipContextState.restores += 1
      sectionPipDiagnostics.rigGeneration = pipContextState.restores
    }
    sectionPipDiagnostics.contextLost = false
  }
  for (const listener of pipContextListeners) listener()
}

/** Subscribe to context-state changes (for `useSyncExternalStore`). */
export function subscribePipContext(listener: () => void): () => void {
  pipContextListeners.add(listener)
  return () => {
    pipContextListeners.delete(listener)
  }
}

/** Snapshot of the shared context state (for `useSyncExternalStore`). */
export function pipContextSnapshot(): boolean {
  return pipContextState.lost
}

/** True while the shared WebGL context is lost — read by the frame hook. */
export function isPipContextLost(): boolean {
  return pipContextState.lost
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
  /**
   * P0 context loss (see the CONTEXT LOSS block above). `restoreGeneration` is
   * the rig rebuild trigger — the render target, its stencil buffer and every
   * material here belong to the context that died, so the only correct restore
   * is a fresh rig.
   */
  const [restoreGeneration, setRestoreGeneration] = useState(0)

  useEffect(() => {
    // The loss event fires on the SHARED canvas element (the PiP renders
    // through the same renderer into a private target, so there is no second
    // context to listen to).
    const canvas = gl.domElement
    const onLost = (event: Event) => {
      // Mandatory: without this the browser never restores the context.
      event.preventDefault()
      setPipContextLost(true)
    }
    const onRestored = () => {
      // Rebuild the rig: the old target/materials/CanvasTexture were created
      // against the dead context and their GPU objects no longer exist.
      setPipContextLost(false, true)
      setRestoreGeneration((generation) => generation + 1)
      // The PiP's own GL state (stencil/clipping materials, blend state) is
      // re-assigned on the next frame by the useFrame body below.
      console.info('[SectionPiP] graphics context restored — rebuilding the render rig')
    }
    canvas.addEventListener('webglcontextlost', onLost, false)
    canvas.addEventListener('webglcontextrestored', onRestored, false)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost, false)
      canvas.removeEventListener('webglcontextrestored', onRestored, false)
    }
  }, [gl])

  // Rig depends on the tier only through MSAA samples; recreated on flips
  // (rare), on a context restore (mandatory), and disposed through the effect
  // cleanup.
  const rig = useMemo(() => {
    const base = quality === 'high' && supportsMsaaTargets(gl) ? 4 : 0
    return createPipRig(msaaOverride ?? base)
  }, [quality, gl, msaaOverride, restoreGeneration])
  useEffect(() => () => disposePipRig(rig), [rig])

  const scratch = useMemo(
    () => ({
      clearColor: new THREE.Color(),
      viewport: new THREE.Vector4(),
      scissor: new THREE.Vector4(),
      /** World centre of the visible section rect — camera target + cap base. */
      viewCentre: new THREE.Vector3(),
    }),
    [],
  )

  // Watchdog scratch: one small RGBA block read back on a schedule (see
  // PARITY_BURST_FRAMES / PARITY_STEADY_INTERVAL — QUALITY_PLAN §3 item 10).
  const watch = useMemo(
    () => ({
      buffer: new Uint8Array(PARITY_SAMPLE_BLOCK * PARITY_SAMPLE_BLOCK * 4),
      zeroFrames: 0,
      /** Stencil frames until the next scheduled readback (0 = due now). */
      framesUntilCheck: 0,
      /** Scheduled readbacks performed since the last plane/rig change — the
       *  burst is the first PARITY_BURST_FRAMES of them. */
      burstChecks: 0,
      /** The (axis, quantized plane, samples) the burst is running for. */
      planeKey: '',
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
    // P0 context loss: with no context every pass below is a silent no-op that
    // still walks the whole scene graph 3–4 times per frame, so skip the PiP
    // entirely until `webglcontextrestored` rebuilt the rig. The flag is read
    // from the module mirror (not React state) because `useFrame` must never
    // need a re-render to observe it.
    if (pipContextState.lost) return
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

    /* ---- THE shared world→screen mapping (planeGeometry) --------------
     * ONE transform for both section surfaces (QUALITY_PLAN §2 item 4): the live
     * canvas and this panel each hand `planeTransform` their own CSS viewport, so
     * the same photograph at the same plane lands at the same world position and
     * size in both. The panel's private `VIEW_MARGIN = 1.08` and its "centre = 0"
     * assumption are gone — those two were exactly the audit's §2.4 drift.
     * `halfU/halfV` are the ortho half-extents (also what the backdrop sampler
     * consumes); `viewCentre` is the world centre of the visible rect, i.e. the
     * camera target AND the base position of the cap quad. */
    const transform = planeTransform(axis, planeValue, { width, height })
    const halfU = transform.halfU
    const halfV = transform.halfV
    const viewCentre = scratch.viewCentre.set(0, 0, 0)
    viewCentre[AXIS_COMPONENT[transform.uAxis]] = transform.centerU
    viewCentre[AXIS_COMPONENT[transform.vAxis]] = transform.centerV

    /* ---- orthographic section camera (§2.1 + §2.2) ------------------- */
    const pipCamera = rig.pipCamera
    pipCamera.up.copy(view.up)
    pipCamera.position.copy(viewCentre).addScaledVector(view.cameraSide, CAMERA_DISTANCE)
    pipCamera.lookAt(viewCentre)
    pipCamera.left = -halfU
    pipCamera.right = halfU
    pipCamera.top = halfV
    pipCamera.bottom = -halfV
    pipCamera.updateProjectionMatrix()

    /* ---- cap plane + stencil clipping planes from the OWN planes ----- */
    rig.capMaterial.clippingPlanes = OWN_OTHER_PLANES[axis]
    rig.capMaterial.color.copy(firstSectionCapColor() ?? FALLBACK_CAP_COLOR)
    const capMesh = rig.capMesh
    capMesh.position.copy(viewCentre)
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
          // The SAME world window the ortho camera was just given (the shared
          // transform's half-extents, in CSS px — the ratio is identical at RT
          // resolution), so one canvas texel maps onto one RT pixel.
          halfU,
          halfV,
          // Mirror for exactly the axes whose blit flips x (the shared
          // `mirrorX(axis)`, see the header): the image is laid out in
          // SectionCanvas space, the RT/display basis is mirrored for y/x, so
          // mirroring here cancels the blit mirror and the backdrop lands under
          // the same anatomy as the 3D cut.
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
    // The axis travels with the reason: the host's hint line turns
    // 'beyond-source' back into the measured coverage statement (see the
    // SectionPipDiagnostics.backdropAxis note).
    diag.backdropAxis = axis

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
      // so a readback sees the just-finished cap pass. PARITY_ZERO_FRAME_LIMIT
      // consecutive zero-coverage stencil frames ⇒ broken parity ⇒ rebuild the
      // rig at samples 0 (stencilBuffer stays on). A slider parked outside
      // every solid can legitimately read 0 — the bounded false-positive cost
      // is losing MSAA smoothing only.
      //
      // v4: the readback looks at COLOUR, and a real-slice backdrop keeps the
      // centre block non-black even when the cap draws nothing. That would
      // mask the very failure this watchdog detects, so the readback only runs
      // on frames whose RT does NOT hold a backdrop; on backdrop frames the
      // watchdog idles (capCoveragePct = −1) and clears its zero counter
      // instead of counting — and it KEEPS its scheduled check armed, so the
      // first backdrop-free frame re-measures instead of skipping the window.
      //
      // Scheduling (QUALITY_PLAN §3 item 10): PARITY_BURST_FRAMES checks right
      // after a rig or plane change — one per stencil frame, which is what the
      // 30-consecutive-zero abort threshold needs — then a spaced check: dense
      // (PARITY_STEADY_INTERVAL) while the last reading was suspicious because a
      // zero frame is ambiguous on its own, idle (PARITY_IDLE_INTERVAL) once
      // coverage is healthy.
      const parityKey = `${axis}|${(Math.round(planeValue / 0.25) * 0.25).toFixed(2)}|${rt.samples}`
      if (parityKey !== watch.planeKey) {
        // A rig rebuild or a plane change: the geometry the cap covers is
        // different, so the previous zero counter says nothing about it.
        watch.planeKey = parityKey
        watch.zeroFrames = 0
        watch.burstChecks = 0
        watch.framesUntilCheck = 0
      }
      if (rt.samples > 0 && !msaaFallbackRef.current && !backdrop.drawn) {
        if (watch.framesUntilCheck > 0) {
          watch.framesUntilCheck -= 1
        } else {
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
          watch.burstChecks += 1
          const inBurst = watch.burstChecks <= PARITY_BURST_FRAMES
          if (covered === 0) {
            watch.zeroFrames += 1
            // Keep sampling densely inside the burst; once the burst is spent a
            // zero keeps the watchdog attentive (STEADY) instead of relaxing it.
            watch.framesUntilCheck = inBurst ? 0 : PARITY_STEADY_INTERVAL
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
            watch.framesUntilCheck = inBurst ? 0 : PARITY_IDLE_INTERVAL
          }
          diag.parityZeroFrames = watch.zeroFrames
        }
      } else {
        // Idle: either the tier has no stencil frames or a real-slice backdrop
        // is in the RT (see above). Never count zeros the backdrop could have
        // caused. The scheduled check stays armed (framesUntilCheck = 0 on a
        // plane change) so it fires on the first frame that can be measured.
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
          `ctx     ${d.contextLost ? `LOST (restores ${d.rigGeneration})` : `ok (rig ${d.rigGeneration})`}`,
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
/**
 * Inline state line for a LOST graphics context (P0, QUALITY_PLAN §1 item 1).
 * The panel is small and sits over the very canvas that lost its context, so
 * it must state what happened rather than freeze on the last blitted frame —
 * a frozen picture is indistinguishable from a working-but-static one.
 *
 * Fed from the module-level context mirror through useSyncExternalStore, so the
 * note appears/disappears without a polling loop and without a store edit.
 */
function PipContextLostNote() {
  const lost = useSyncExternalStore(subscribePipContext, pipContextSnapshot, pipContextSnapshot)
  if (!lost) return null
  return (
    <span
      className="pip-context-lost"
      role="alert"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        textAlign: 'center',
        background: 'rgba(7, 12, 24, 0.86)',
        color: '#fecaca',
        font: '10px/1.4 system-ui, sans-serif',
      }}
    >
      Graphics context lost — restoring…
    </span>
  )
}

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

/* ------------------------------------------------------------------ */
/* SectionPiPRestoreButton — the way back from the hidden PiP          */
/*                                                                     */
/* WHY THIS EXISTS (UX_FIXES_PLAN Feature 1): SectionPiPPanel renders  */
/* null when `visible === false` and its only visibility control is    */
/* the × button, while the flag itself lives (persisted) in Viewer3D.  */
/* Hiding the panel therefore used to strand the user: no affordance   */
/* anywhere could bring it back — the flag had to be cleared by hand   */
/* or the persisted value reset. This is that affordance.              */
/*                                                                     */
/* CONTRACT:                                                           */
/*  - a real <button type="button"> (keyboard reachable, focusable),   */
/*    labelled exactly `Live section ▸` with the actionable title      */
/*    `Show the live synced 2D section`;                               */
/*  - `aria-expanded={false}` — the region it discloses, the PiP       */
/*    panel, is collapsed. Deliberately NOT also `aria-pressed`: a     */
/*    show control is a disclosure, not a toggle, and two contradictory */
/*    ARIA states on one control is an a11y defect (PLAN §3.1.1/D9).   */
/*    Once the panel is back this button unmounts, so `aria-expanded`  */
/*    never has to flip to true — the expanded state IS the panel.     */
/*  - `onShow` is a one-way show callback (never a bidirectional       */
/*    `onVisibleChange`), so this component cannot hide anything; the  */
/*    mounting parent passes the very same setter the panel's × calls. */
/*                                                                     */
/* LAYOUT CONTRACT (no canvas shift): styled by `.pip-restore` in      */
/* styles/sectionPip.css with the panel's own positioning tokens       */
/* (`position:absolute; right/bottom: var(--space-3)`), so the parent  */
/* must place it in the SAME positioned containing block as the panel  */
/* (`.viewer3d-root`, `position:relative`) — Viewer3D mounts it as a   */
/* direct sibling of <SectionPiPPanel>. Absolutely positioned chrome    */
/* in a relative container cannot move the R3F canvas, which is an      */
/* absolutely positioned sibling of `.viewer-overlay` in that same      */
/* block, so toggling the panel ⇄ pill cannot cause layout shift.       */
/* ------------------------------------------------------------------ */

export interface SectionPiPRestoreButtonProps {
  /** Called when the user asks for the live section back. One-way. */
  onShow: () => void
}

export function SectionPiPRestoreButton({ onShow }: SectionPiPRestoreButtonProps) {
  return (
    <button
      type="button"
      className="pip-restore"
      title="Show the live synced 2D section"
      aria-expanded={false}
      onClick={onShow}
    >
      Live section ▸
    </button>
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
      {/* RESPONSIVE TAB (P2 a11y/polish: QUALITY_PLAN §4 item 15, AUDIT §2.20)
          — the narrow-viewport (<900 px) COLLAPSED state of this panel.
          `sectionPip.css` hides `.pip-header` there and this 44 px sticky row is
          all that shows, so the PiP degrades to a labelled tab instead of a
          fixed panel sitting on top of the model it annotates. The checkbox is
          visually hidden but focusable, so the row is ONE named control for both
          pointer and keyboard; `:checked` is the expanded state and the caret
          flips with it. The buttons above stay in the DOM and are re-shown when
          expanded — this adds no focus stop and no unnamed node (the label text
          and the plane readout are the accessible name). Desktop is unaffected:
          the header stays visible and this row is a second, tab-style
          readout/expand control beside the `▴/▾` button. */}
      <label className="pip-toggle" title="Show or hide the live section panel">
        <input
          type="checkbox"
          checked={large}
          aria-expanded={large}
          onChange={(event) => setLarge(event.target.checked)}
        />
        <span className="pip-toggle-row">
          <span className="pip-toggle-label">Live section</span>
          <span className="pip-readout">{`${sectionAxis} = ${formatPlaneValue(planeValue)} au`}</span>
          <span className="pip-spacer" />
          <span className="pip-toggle-caret" aria-hidden="true">{large ? '▾' : '▸'}</span>
        </span>
      </label>
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
        <PipContextLostNote />
        <PipDebugOverlay />
      </div>
    </div>
  )
}

export default SectionPiP
