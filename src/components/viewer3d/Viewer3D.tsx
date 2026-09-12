/**
 * Viewer3D — the R3F canvas hosting the atlas scene (plan §5 viewer3d task,
 * realism plan §1 Layer 3 render-pipeline task).
 *
 * Camera [48.3, 18.1, 88.55] (default framing ×1.4, AMENDMENT B — the v2
 * AMENDMENT A offset [34.5, 11.5, 63.25] scaled by 1.4) looking at [0, −5, 0];
 * OrbitControls with damping;
 * image-based lighting from three's bundled RoomEnvironment through a
 * PMREMGenerator (no network/CDN), plus a soft warm key and a cool fill
 * directional (no shadow maps yet); ACESFilmic tone mapping at exposure 1.1
 * with sRGB output. The canvas stays transparent so the CSS radial-gradient
 * backdrop (--bg-viewer) shows through. WebGL local clipping is enabled for
 * the sagittal/coronal/transverse planes shared by every material — v2
 * materials receive those same planes from src/geometry/materials.ts.
 *
 * Mounts SceneLayers (all data-driven meshes), PlaneHelpers (cut indicators),
 * the ClipControls / ExplodeSlider overlays, the PostFX composer
 * (realism plan §1 Layer 3 post-fx task) when quality is 'high', and the
 * simulated-section panel (v9 items 4+5, `SectionPiP.tsx`) — the dockable
 * bottom-right panel beside the canvas (visible by default; hidden via the
 * panel's hide button and persisted in localStorage under
 * neuroaxis.sectionPip), plus the v5 restore
 * control (`SectionPiPRestoreButton`, UX_FIXES_PLAN Feature 1) that takes the
 * panel's place in that same bottom-right corner whenever the flag is false —
 * so the hidden state is reversible instead of stranding the feature behind a
 * cleared localStorage.
 *
 * v9 REMOVAL NOTE: this file used to mount `SectionPiP` (default export) INSIDE
 * the `<Canvas>`: a second orthographic camera rendering the clipped 3D scene
 * into a private render target, blitted into the panel's viewport rect. That
 * renderer is gone (see `SectionPiP.tsx`'s header for the full retirement
 * record), so the `<Canvas>` subtree now contains no PiP work at all and the
 * panel is pure DOM + a 2D canvas.
 *
 * Exports: default Viewer3D plus the named pieces so integration (and tests)
 * can compose or mount them independently.
 *
 * ── P0 survivability: WebGL context loss (QUALITY_PLAN §1 item 1, AUDIT
 *    §2.1) ────────────────────────────────────────────────────────────────
 * Before this, the app had ZERO `webglcontextlost` handling (`grep` found no
 * occurrence anywhere): on a GPU reset, a driver crash, a tab suspend or an
 * out-of-memory reset the canvas went black permanently with no overlay, no
 * message and no way back — the only recovery was a page reload the user had
 * no reason to know about.
 *
 * The contract implemented here:
 *
 *  1. `webglcontextlost` on the R3F canvas element (`gl.domElement`):
 *     `event.preventDefault()` FIRST — without it the browser never fires the
 *     restore event and the canvas is dead for good — then flip `contextLost`,
 *     which freezes the R3F frame loop (`setFrameloop('never')`, so no render
 *     pass or `useFrame` callback is scheduled while there is no context) and
 *     paints the recovery overlay.
 *  2. `webglcontextrestored`: rebuild everything the lost context invalidated —
 *     the PMREM environment (remounted through `envGeneration`), three's
 *     internal GL state (`gl.resetState()`), the renderer settings
 *     (`localClippingEnabled`, ACES tone mapping + exposure, sRGB output) — then
 *     force exactly one frame and resume the loop. GL state owned by the scene is
 *     re-applied by its owner on that frame (ClipSync re-runs the store's clip
 *     planes), which is why a forced frame is part of the restore recipe.
 *     v9: the PiP no longer has a share of this recipe — the panel it names today
 *     is DOM + a 2D canvas and owns no GL resource at all (SectionPiP.tsx).
 *  3. The overlay is `role="alert"`, says "Graphics context lost — restoring…",
 *     and carries a click-to-restore button that requests restoration through
 *     `WEBGL_lose_context.restoreContext()`. It is unmounted unless a loss is
 *     ACTIVE, so a healthy canvas is never covered (this also keeps the audit's
 *     screenshot/pixel-bucket check honest).
 *  4. If the browser never restores the context (a hard device loss cannot be
 *     recovered in-page), the overlay switches after `CONTEXT_LOSS_DEAD_MS` to a
 *     terminal "could not be restored — reload" message with a Reload button.
 *     The failure mode is a stated state, never a silent black rectangle.
 *  5. **v7 closure — the overlay is not hostage to the canvas subtree.** The
 *     measured defect (audit gap 1+2) was that the overlay never appeared even
 *     though `isContextLost()` was true: the PostFX composer threw
 *     `TypeError: … reading 'alpha'` while the context was lost (see PostFX's
 *     header for the exact chain), R3F's internal boundary re-threw that error in
 *     the DOM tree, and the app's "3D viewer" panel boundary unmounted this whole
 *     component — overlay included. Two independent fixes: PostFX is not mounted
 *     while `contextPhase !== null`, and every R3F child is wrapped in
 *     `CanvasSceneBoundary` (fallback `null`, DOM notice below), so a throw in
 *     the scene or the post stack is contained in-canvas and this
 *     component keeps rendering.
 *
 * ── v9 items 4+5: the panel's honest state line (task `section-ux`) ───────
 * The bottom-right panel is now a SIMULATED-SECTION panel: it shows the same
 * worker-clipped 2D section the Plates tab computes, never the 3D cut, never a
 * plane helper and never real imagery (see `SectionPiP.tsx` and
 * `PipSection.tsx`). What this file still surfaces, because the panel itself is
 * deliberately quiet about imagery, is the imagery REQUEST's state:
 * `SectionPipHint` below reads the panel's lean published diagnostics
 * (`sectionPipDiagnostics`: planeValue / backdropAxis / backdropRequested /
 * backdropModality / backdropReason, written by the panel on store changes and
 * on a self-stopping 1 s tick while the grids load) and shows, only while the
 * PiP is visible, one line under the panel saying BOTH halves of the truth:
 * what the panel is showing (the simulated section) and what the active
 * modality request has at this plane on the Plates canvas.
 *   • requested 'none' — the v9 images-off state: the line states that real
 *     imagery is switched off (never a coverage excuse for a state the user
 *     chose).
 *   • 'unavailable' — the modality has no data in this build at all: the hint
 *     names the Plates tab, where the modality buttons are disabled with the
 *     same reason.
 *   • 'loading'     — the volume/plate is still arriving; the hint says so and
 *     disappears on its own when the data lands.
 *   • 'no-anchor'   — a requested photograph has no plate anchored at this
 *     plane; the hint states it rather than leaving the line unexplained.
 *   • 'beyond-source' — a CT plane above the Visible Human series' measured
 *     apex: the line carries the SAME `ctCoverageStatement` the Plates toolbar
 *     and the live canvas show, verbatim (one number, one sentence, three
 *     surfaces).
 * The element is fed through requestAnimationFrame with a textContent compare
 * and a `hidden` flip, so it costs no React render and never touches the GL
 * frame. It is empty (and unpainted) whenever the imagery request resolves at
 * this plane — the panel's own in-window line ("simulated section only · real
 * imagery kept in the Plates tab (CT)") covers the steady state.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, type RootState } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { IMAGERY_OFF_STATEMENT, useAtlasStore } from '../../state/store'
import {
  retryTimedOutAnatomyAssets,
  subscribeAnatomyTimeouts,
  timedOutAnatomyCount,
} from '../../geometry/anatomyAssets'
import SceneLayers from './SceneLayers'
import ClipControls from './ClipControls'
import ExplodeSlider from './ExplodeSlider'
import PlaneHelpers from './PlaneHelpers'
import PostFX from './PostFX'
import CanvasSceneBoundary from './CanvasSceneBoundary'
import {
  SectionPiPPanel,
  SectionPiPRestoreButton,
  sectionPipDiagnostics,
} from './SectionPiP'
import { applyClipState } from './clipPlanes'
// v7 closure (gap 3): the PiP's hint line states the SAME measured CT coverage
// limit as the Plates toolbar and the live section — one function, one number.
import { ctCoverageStatement } from '../section/imageLayers'

/**
 * Keeps the shared THREE.Plane constants in lockstep with store.clip without
 * re-rendering the scene graph on every slider tick.
 */
export function ClipSync(): null {
  useEffect(() => {
    applyClipState(useAtlasStore.getState().clip)
    return useAtlasStore.subscribe((state, previous) => {
      if (state.clip !== previous.clip) applyClipState(state.clip)
    })
  }, [])
  return null
}

/* ------------------------------------- v3 live-section PiP persistence */

/** localStorage key persisting the live-section PiP visibility — same
 *  pattern as the quality toggle's RENDER_QUALITY_STORAGE_KEY. */
export const SECTION_PIP_STORAGE_KEY = 'neuroaxis.sectionPip'

/** Persisted value wins; default is VISIBLE (plan §2.1 "visible by default"). */
function initialSectionPipVisible(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(SECTION_PIP_STORAGE_KEY)
      if (stored === 'visible') return true
      if (stored === 'hidden') return false
    }
  } catch {
    /* private-mode / storage disabled — fall through to the default */
  }
  return true
}

/**
 * PBR environment (realism plan §1 Layer 3): bakes three's bundled
 * RoomEnvironment into a PMREM texture once and assigns it as scene
 * environment — soft studio IBL with zero network dependency. All factory
 * materials modulate it through envMapIntensity; scene.environmentIntensity
 * keeps the overall IBL contribution subtle next to the direct lights.
 */
function SceneEnvironment(): null {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const renderTarget = pmrem.fromScene(room, 0.04)
    scene.environment = renderTarget.texture
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      renderTarget.dispose()
      room.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

/* ------------------------------------------------- WebGL context loss (P0) */

/**
 * How long (ms) a canvas may stay in the lost state before the overlay stops
 * promising a restore and switches to the terminal "reload" message. A real
 * device loss never restores in-page, so pretending otherwise forever would be
 * the same silent-failure bug in a nicer colour.
 */
export const CONTEXT_LOSS_DEAD_MS = 20_000

/** The two overlay states a lost canvas can be in. */
export type ContextLossPhase = 'lost' | 'dead'

/** Sentence shown while the browser is expected to bring the context back. */
export const CONTEXT_LOST_TEXT = 'Graphics context lost — restoring…'

/** Sentence shown once no restore event has arrived within the bound. */
export const CONTEXT_LOST_DEAD_TEXT =
  'Graphics context lost — it could not be restored automatically. Reload the page to rebuild the 3D view.'

/**
 * Read three's live WebGL context off a renderer without touching internals:
 * `getContext()` is part of the public three.js API and returns the
 * `WebGLRenderingContext` / `WebGL2RenderingContext` the canvas is using.
 */
export function webglContextOf(gl: { getContext: () => unknown }): WebGLRenderingContext | null {
  const context = gl.getContext() as WebGLRenderingContext | undefined
  return context ?? null
}

/**
 * Ask the browser to restore a lost context through the standard
 * `WEBGL_lose_context` extension (`restoreContext()`). Returns false when the
 * extension is unavailable — the caller then keeps the "reload" affordance,
 * which is the only honest remaining path.
 */
export function requestContextRestore(gl: { getContext: () => unknown }): boolean {
  const context = webglContextOf(gl)
  if (context === null) return false
  const extension = context.getExtension('WEBGL_lose_context') as
    | { restoreContext?: () => void }
    | null
  if (!extension || typeof extension.restoreContext !== 'function') return false
  try {
    extension.restoreContext()
    return true
  } catch {
    return false
  }
}

interface CanvasContextRecoveryProps {
  /** True while the canvas has no live WebGL context. */
  contextLost: boolean
  /**
   * The R3F root state captured in `onCreated`. Held in a ref because it is a
   * stable object identity, not reactive state.
   */
  stateRef: { current: RootState | null }
  /** Bumped when a context came back, so the environment rebuilds. */
  envGeneration: number
}

/**
 * Freezes the R3F frame loop while the context is gone and forces exactly one
 * frame when it comes back.
 *
 * Why the loop must be frozen: with no context every draw call is a no-op and
 * three's renderer would keep walking the whole scene graph (84 meshes) on every
 * animation frame, for nothing. `setFrameloop
 * ('never')` is R3F's own supported way to stop scheduling frames, and
 * `advance(timestamp, true)` is its supported way to force one by hand.
 *
 * The first-mount branch exists because this effect is also responsible for
 * putting the loop back where the Canvas started it: `frameloop` is 'always'
 * unless a mounted `useFrame` consumer with priority > 0 takes rendering over
 * (PostFX at priority 1, and the retired PiP renderer at priority 2 — v9 removed
 * that second consumer, see SectionPiP.tsx), and that does not change
 * `state.frameloop`, so restoring 'always' is always correct.
 */
function CanvasContextRecovery({
  contextLost,
  stateRef,
  envGeneration,
}: CanvasContextRecoveryProps): null {
  const mountedRef = useRef(false)
  useEffect(() => {
    const state = stateRef.current
    if (state === null) return
    if (contextLost) {
      state.setFrameloop('never')
      mountedRef.current = true
      return
    }
    // Restore path. `setFrameloop` restarts the clock, so the first frame after
    // a loss cannot see a huge delta.
    state.setFrameloop('always')
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    // Exactly one synchronous-ish frame, so the restore is visible even before
    // the next animation frame: it re-runs every registered `useFrame` (PostFX's
    // present) and redraws the main view.
    state.advance(performance.now(), true)
    state.invalidate(2)
  }, [contextLost, stateRef, envGeneration])
  return null
}

/**
 * The visible recovery state of a lost canvas. Renders NOTHING while the
 * context is healthy (so it can never cover a working canvas or perturb a
 * screenshot-based check); while lost it is a `role="alert"` card with a
 * click-to-restore action, and after `CONTEXT_LOSS_DEAD_MS` it becomes the
 * terminal reload state. The card is positioned by the parent (`.viewer3d-root`
 * is the positioned ancestor) so it can sit over the canvas without moving it.
 */
function ContextLossOverlay({
  phase,
  onRestore,
}: {
  phase: ContextLossPhase
  onRestore: () => void
}): ReactElement {
  return (
    <div
      className="viewer-context-lost"
      role="alert"
      data-context-lost={phase}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        textAlign: 'center',
        background: 'rgba(7, 12, 24, 0.82)',
        backdropFilter: 'blur(2px)',
        color: '#e2e8f0',
        font: '13px/1.5 system-ui, sans-serif',
      }}
    >
      <p style={{ margin: 0, maxWidth: 460 }}>
        {phase === 'lost' ? CONTEXT_LOST_TEXT : CONTEXT_LOST_DEAD_TEXT}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={onRestore}>
          {phase === 'lost' ? 'Restore graphics context' : 'Try to restore again'}
        </button>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    </div>
  )
}

/* --------------------------- geometry unavailable (P0 load timeouts) */

/**
 * Visible, retryable state for the anatomy-GLB loader's deadline (QUALITY_PLAN
 * §1 item 3, AUDIT §2.3). A timed-out slug keeps rendering the v1 primitive, so
 * the scene is never blank — but silence would be dishonest: the viewer would
 * be showing less than the manifest promises. This notice names what is
 * missing and re-runs every timed-out load in one click.
 *
 * Renders NOTHING while nothing has timed out (the healthy state costs one
 * subscription and no DOM), and lives in the bottom-left corner `.viewer3d-root`
 * already reserves for chrome, so it never covers the canvas centre.
 */
export function GeometryUnavailableNotice(): ReactElement | null {
  const timedOut = useSyncExternalStore(
    subscribeAnatomyTimeouts,
    timedOutAnatomyCount,
    timedOutAnatomyCount,
  )
  if (timedOut === 0) return null
  return (
    <p
      className="viewer-geometry-unavailable"
      role="alert"
      data-geometry-unavailable={timedOut}
      style={{
        position: 'absolute',
        left: 'var(--space-3, 12px)',
        bottom: 44,
        zIndex: 7,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: 0,
        padding: '6px 10px',
        border: '1px solid rgba(248, 113, 113, 0.45)',
        borderRadius: 4,
        background: 'rgba(13, 21, 38, 0.9)',
        color: '#fecaca',
        font: '11px/1.4 system-ui, sans-serif',
      }}
    >
      <span>
        {`geometry unavailable for ${timedOut} structure${timedOut === 1 ? '' : 's'} — the simplified shape is shown instead`}
      </span>
      <button
        type="button"
        className="viewer-geometry-retry btn"
        title="Retry loading the missing anatomy meshes (each attempt gets a fresh 15 s deadline)"
        onClick={() => retryTimedOutAnatomyAssets()}
      >
        Retry
      </button>
    </p>
  )
}

/* --------------------------- canvas-subtree failure (P0 containment) */

/**
 * The visible half of a `CanvasSceneBoundary` failure (v7 closure, gap 1).
 *
 * Why a DOM notice and not an in-canvas card: the boundary lives inside the R3F
 * reconciler, whose fallback can only be THREE-safe (`null`). This element is the
 * sibling OUTSIDE the canvas, so the failure is still stated in words — "the
 * §1 item 2 rule" (a failed surface must say so and offer recovery) applied to
 * the one subtree that cannot draw its own error state.
 *
 * It is the reason the WebGL context-loss overlay can no longer disappear: a
 * throw in the scene or the post-processing stack is now contained HERE, so
 * `Viewer3D` keeps rendering and `[data-context-lost]` stays reachable.
 */
export function CanvasSceneFailureNotice({
  surface,
  message,
  onRetry,
}: {
  surface: string
  message: string
  onRetry: () => void
}): ReactElement {
  return (
    <p
      className="viewer-canvas-failure"
      role="alert"
      data-canvas-scene-error={surface}
      style={{
        position: 'absolute',
        left: 'var(--space-3, 12px)',
        bottom: 76,
        zIndex: 7,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 'min(560px, 70%)',
        margin: 0,
        padding: '6px 10px',
        border: '1px solid rgba(248, 113, 113, 0.45)',
        borderRadius: 4,
        background: 'rgba(13, 21, 38, 0.9)',
        color: '#fecaca',
        font: '11px/1.4 system-ui, sans-serif',
      }}
    >
      <span>
        {`${surface} failed${message.length > 0 ? `: ${message}` : ''} — the rest of the viewer is still live`}
      </span>
      <button
        type="button"
        className="viewer-canvas-retry btn"
        title={`Re-mount the ${surface} (a fresh subtree, not a resumed broken one)`}
        onClick={onRetry}
      >
        Retry
      </button>
    </p>
  )
}

/* ------------------------------- v9 panel: imagery-request state hint */

/** Modality names for the hint sentence (indexed by the sampler's union). */
const MODALITY_WORDS: Record<string, string> = {
  auto: 'real',
  mri: 'MRI',
  ct: 'CT',
  stain: 'photograph',
  none: '',
}

/**
 * What the panel itself is showing, on every branch below. Stated in one place
 * because the panel's content no longer depends on the modality at all: since
 * v9 it is always the simulated 2D section (items 4+5).
 */
const PANEL_SUBJECT = 'this panel shows the simulated section'

/** Live input for the hint: exactly the fields the panel publishes. */
export interface PipBackdropState {
  /** Modality the store asked for ('none' = the images-off state, item 4). */
  requested: string
  /** Modality that WOULD paint on the Plates canvas at this plane. */
  modality: string
  /** '' = it would paint; 'unavailable' | 'no-anchor' | 'loading' | 'beyond-source' otherwise. */
  reason: string
}

/**
 * The honest one-line state of the imagery REQUEST under the panel, or null when
 * there is nothing to explain (the request resolves at this plane, or the panel
 * is hidden). Pure and exported so QA can check every branch without a GL
 * context — this is the PiP-side counterpart of SectionCanvas' `imageryHint`.
 *
 * Rewritten for v9 items 4+5. Before this, the line described the real-slice
 * BACKDROP the panel painted behind the 3D cut; that backdrop is gone, so every
 * branch now states what this panel shows (the simulated section) as well as the
 * state of the request — and the images-off state, which used to return null
 * ("nothing to explain"), is now stated in words, because "the user switched
 * imagery off" is exactly the state item 4 requires to be legible.
 *
 * It is deliberately NOT a permanent "see the Plates tab" banner: with the
 * request resolving at this plane the line is empty and the panel's own window
 * line carries the steady state. See the file header.
 */
export function pipBackdropHint(
  state: PipBackdropState,
  coverageStatement: string | null = null,
): string | null {
  if (state.requested === 'none') {
    // Item 4: the images-off state. Never a coverage excuse — the imagery is
    // switched off, which is a choice, not a missing dataset.
    return `${IMAGERY_OFF_STATEMENT} — ${PANEL_SUBJECT}; the Plates tab keeps every modality`
  }
  if (!(state.reason.length > 0)) return null
  // `modality` is what the resolution RESOLVED even when it could not paint, so
  // 'auto' can still name the modality it was waiting on.
  const resolved = state.modality !== 'none' ? state.modality : state.requested
  const word = MODALITY_WORDS[resolved] ?? resolved
  if (state.reason === 'loading') {
    return resolved === 'auto'
      ? `real imagery for this plane is still loading — ${PANEL_SUBJECT}`
      : `the real ${word} imagery for this plane is still loading — ${PANEL_SUBJECT}`
  }
  if (state.reason === 'no-anchor') {
    return `no photograph is anchored at this plane — ${PANEL_SUBJECT}; the Plates tab lists the anchored series and the other modalities`
  }
  if (state.reason === 'unavailable') {
    // The grid/plate data is not in this build at all: the Plates tab is where
    // the embedded modalities are listed (disabled buttons carry the same
    // reason) and where the live section renders.
    return resolved === 'auto'
      ? `no embeddable real imagery in this build — ${PANEL_SUBJECT}; the Plates tab lists the modality list and the live section`
      : `no embeddable ${word} imagery in this build — ${PANEL_SUBJECT}; the Plates tab lists the modalities that are embedded`
  }
  if (state.reason === 'beyond-source') {
    // v7 closure (gap 3): a CT plane above the Visible Human series' measured
    // apex. The grid is loaded and healthy — the SOURCE has no data there for any
    // canonical box — so the line states the measured limit (the same sentence
    // the Plates toolbar and the live section show) rather than the internal
    // token, and that sentence is included VERBATIM so the three surfaces cannot
    // state different numbers.
    const coverage =
      coverageStatement ??
      `no real ${word} imagery at this plane — see the Plates tab for the coverage limit and the other modalities`
    return `${coverage} — ${PANEL_SUBJECT}`
  }
  return `real imagery unavailable at this plane (${state.reason}${resolved === 'auto' ? '' : `; ${word}`}) — ${PANEL_SUBJECT}`
}

/**
 * Renders `pipBackdropHint()` under the panel, live. Reads the module-level
 * diagnostics singleton the in-canvas renderer writes every frame (no store
 * round-trip, no React render): one textContent compare per animation frame,
 * and the node stays `hidden` — zero layout work — while real imagery shows.
 */
function SectionPipHint({ visible }: { visible: boolean }): ReactElement | null {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const node = ref.current
    if (node === null) return
    if (!visible) {
      node.hidden = true
      return
    }
    if (typeof requestAnimationFrame === 'undefined') return
    let raf = 0
    let stopped = false
    // The coverage statement is a pure function of (axis, plane) and this tick
    // runs every animation frame while the hint is up — cache it per plane.
    let coverageKey = ''
    let coverageText: string | null = null
    const tick = () => {
      if (stopped) return
      const d = sectionPipDiagnostics
      const key = `${String(d.backdropAxis)}|${String(d.planeValue)}`
      if (d.backdropReason === 'beyond-source') {
        if (key !== coverageKey) {
          coverageKey = key
          coverageText =
            d.backdropAxis === null ? null : ctCoverageStatement(d.backdropAxis, d.planeValue)
        }
      } else if (coverageText !== null) {
        coverageText = null
        coverageKey = key
      }
      const hint = pipBackdropHint(
        {
          requested: d.backdropRequested,
          modality: d.backdropModality,
          reason: d.backdropReason,
        },
        coverageText,
      )
      const text = hint ?? ''
      if (node.textContent !== text) node.textContent = text
      if (node.hidden !== (hint === null)) node.hidden = hint === null
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [visible])
  if (!visible) return null
  return (
    <p
      className="pip-backdrop-hint"
      ref={ref}
      role="note"
      hidden
      style={{
        margin: '4px 6px 0',
        fontSize: '0.68rem',
        lineHeight: 1.35,
        color: '#94a3b8',
      }}
    />
  )
}

/**
 * Default framing distance (au) — the AMENDMENT B value.
 *
 * The v2 camera sat at `[34.5, 11.5, 63.25]` with the target `[0, −5, 0]`, so its
 * offset was `[34.5, 16.5, 63.25]` and |offset| = √(34.5² + 16.5² + 63.25²) =
 * **73.9125 au** (the AMENDMENT A "default framing camera distance ×1.15" of
 * REALISM_PLAN §3). The telencephalon extension raises the canonical box from
 * y ≤ +45 to y ≤ +85 and z −56…+26 to z −75…+55
 * (docs/TELENCEPHALON_PLAN.md §2), so the plan's rule is "camera default
 * distance ×1.4": 73.9125 × 1.4 = **103.4775 au**.
 *
 * The framing DIRECTION is deliberately preserved exactly (that is what "×1.4"
 * means — the same view, further back), and that includes its asymmetry: the
 * default view stays brainstem-centric rather than re-aimed at the new box
 * centre (the coronal centre moves +15 au, the transverse centre −10 au), which
 * is the §5 legibility rule — "the cortex is 4–5× the brainstem in every
 * dimension; the default view must stay brainstem-centric". Scaling the same
 * offset reproduces the previous framing exactly, 1.4× larger, so a viewer of
 * the old default sees the brainstem+diencephalon+cerebellum block unchanged in
 * composition and the hemispheres in frame around it.
 *
 * `camera.position = target + 1.4 × offset`:
 *   x: 0 + 1.4·34.5  = 48.3        y: −5 + 1.4·16.5 = 18.1
 *   z: 0 + 1.4·63.25 = 88.55
 * (|offset| = 103.4775 au — asserted at module load below, so the position and
 * this derivation cannot drift apart silently. The OrbitControls
 * `minDistance`/`maxDistance` and the explode range are intentionally
 * unchanged: the new box is reachable by orbiting and zooming, and the explode
 * factor's semantics are per-mesh, not per-box.)
 */
export const DEFAULT_CAMERA_TARGET: readonly [number, number, number] = [0, -5, 0]

/** AMENDMENT A distance 73.9125 au × the plan's AMENDMENT B factor 1.4. */
export const DEFAULT_CAMERA_DISTANCE = 103.4775

/** The v2 (AMENDMENT A) camera offset, scaled by the AMENDMENT B factor. */
export const DEFAULT_CAMERA_POSITION: readonly [number, number, number] = [
  DEFAULT_CAMERA_TARGET[0] + 1.4 * 34.5, // 48.3
  DEFAULT_CAMERA_TARGET[1] + 1.4 * 16.5, // 18.1
  DEFAULT_CAMERA_TARGET[2] + 1.4 * 63.25, // 88.55
]

{
  // The default framing IS the ×1.4 rule: assert both readings of it so a later
  // edit cannot move the camera without restating the distance (or vice versa).
  const [dx, dy, dz] = [
    DEFAULT_CAMERA_POSITION[0] - DEFAULT_CAMERA_TARGET[0],
    DEFAULT_CAMERA_POSITION[1] - DEFAULT_CAMERA_TARGET[1],
    DEFAULT_CAMERA_POSITION[2] - DEFAULT_CAMERA_TARGET[2],
  ]
  const distance = Math.hypot(dx, dy, dz)
  if (Math.abs(distance - DEFAULT_CAMERA_DISTANCE) > 1e-3) {
    throw new Error(
      `Viewer3D: default camera distance ${distance.toFixed(3)} au disagrees with ` +
        `DEFAULT_CAMERA_DISTANCE ${DEFAULT_CAMERA_DISTANCE} (the AMENDMENT B ×1.4 framing)`,
    )
  }
  if (Math.abs(dx - 1.4 * 34.5) > 1e-9 || Math.abs(dy - 1.4 * 16.5) > 1e-9 || Math.abs(dz - 1.4 * 63.25) > 1e-9) {
    throw new Error('Viewer3D: the default camera offset is not the v2 offset × 1.4 (AMENDMENT B)')
  }
}

export default function Viewer3D() {
  const selectStructure = useAtlasStore((s) => s.selectStructure)
  // Quality tier (post-fx task): 'high' runs the post composer at dpr ≤ 2;
  // 'balanced' renders the plain canvas at dpr ≤ 1.5 with no composer.
  const quality = useAtlasStore((s) => s.quality)
  const dpr: [number, number] = quality === 'high' ? [1, 2] : [1, 1.5]

  // v3 live-section PiP (plan §2.1): visible by default, persisted in
  // localStorage (neuroaxis.sectionPip) alongside the quality toggle; the
  // panel's hide button flips the state and the choice survives reloads.
  const [sectionPipVisible, setSectionPipVisible] = useState(initialSectionPipVisible)
  const sectionPipWindowRef = useRef<HTMLDivElement>(null)

  /* ---- WebGL context loss (P0, see the file header) ------------------- */
  const [contextPhase, setContextPhase] = useState<ContextLossPhase | null>(null)
  /**
   * The 3D canvas element the listeners attach to. Assigned by a CALLBACK REF
   * (not by the `onCreated` callback): the commit phase runs callback refs
   * before effects, which is what lets the listener effect below bind to the
   * canvas on the very first mount — the context-loss wiring must exist before
   * the first frame, not one render later.
   */
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
  /** R3F root state captured in onCreated (stable identity, not reactive). */
  const rootStateRef = useRef<RootState | null>(null)
  /** Live renderer, so the restore button can reach the extension. */
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  /** Bumped on every successful restore: remounts the PMREM environment. */
  const [envGeneration, setEnvGeneration] = useState(0)
  /**
   * v7 closure (gap 1): a throw INSIDE the canvas subtree must not take the
   * viewer — and with it the context-loss overlay — down. `CanvasSceneBoundary`
   * contains it in-canvas (fallback `null`), and this is the DOM-side report.
   * `sceneGeneration` is the reset key: the Retry button below, and a successful
   * context restore, both bump it so the failed subtree is rebuilt.
   */
  const [sceneFailure, setSceneFailure] = useState<{ surface: string; message: string } | null>(null)
  const [sceneGeneration, setSceneGeneration] = useState(0)
  const onSceneError = useCallback((surface: string, error: Error) => {
    setSceneFailure({ surface, message: error.message })
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          SECTION_PIP_STORAGE_KEY,
          sectionPipVisible ? 'visible' : 'hidden',
        )
      }
    } catch {
      /* storage unavailable — the setting still applies for this session */
    }
  }, [sectionPipVisible])

  /**
   * Re-apply the renderer settings the lost context discarded. Called on the
   * restore event: three keeps these as plain properties, but the CONTEXT they
   * apply to is a new object, so every GL-level flag is re-established here and
   * `resetState()` clears three's cached GL state so the next frame re-uploads
   * it instead of trusting stale bindings.
   */
  const restoreRenderer = useCallback(() => {
    const gl = rendererRef.current
    if (gl === null) return
    gl.resetState()
    gl.localClippingEnabled = true
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.1
    gl.outputColorSpace = THREE.SRGBColorSpace
    // The shared clip planes are module constants; re-pushing the store's
    // current values makes the very next frame clip exactly as before.
    applyClipState(useAtlasStore.getState().clip)
  }, [])

  useEffect(() => {
    const canvas = canvasEl
    if (canvas === null) return undefined

    const onLost = (event: Event) => {
      // MANDATORY: without preventDefault the browser never fires
      // webglcontextrestored and the canvas stays black for good.
      event.preventDefault()
      setContextPhase('lost')
    }
    const onRestored = () => {
      restoreRenderer()
      setEnvGeneration((generation) => generation + 1)
      // v7 closure: the canvas subtree was rebuilt against a NEW context, so any
      // failure recorded against the dead one is stale — clear it and remount.
      setSceneFailure(null)
      setSceneGeneration((generation) => generation + 1)
      setContextPhase(null)
    }

    canvas.addEventListener('webglcontextlost', onLost, false)
    canvas.addEventListener('webglcontextrestored', onRestored, false)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost, false)
      canvas.removeEventListener('webglcontextrestored', onRestored, false)
    }
  }, [restoreRenderer, canvasEl])

  /**
   * Terminal-state timer: after CONTEXT_LOSS_DEAD_MS in the lost state the
   * overlay stops promising an automatic restore. Not a retry loop — the
   * browser owns restoration, and a second context creation would fight the
   * one the UA is already trying.
   */
  useEffect(() => {
    if (contextPhase !== 'lost') return undefined
    const timer = setTimeout(() => setContextPhase('dead'), CONTEXT_LOSS_DEAD_MS)
    return () => clearTimeout(timer)
  }, [contextPhase])

  const onRestoreRequested = useCallback(() => {
    const gl = rendererRef.current
    if (gl !== null && requestContextRestore(gl)) return
    // No WEBGL_lose_context extension: the browser has not restored the context
    // and we cannot ask it to. Say so instead of appearing to do something.
    setContextPhase('dead')
  }, [])

  return (
    <div className="viewer3d-root">
      <div className="viewer3d-canvas">
        <Canvas
          ref={setCanvasEl}
          dpr={dpr}
          // Default framing ×1.4 (docs/TELENCEPHALON_PLAN.md §2 AMENDMENT B, task
          // tel-space) for the extended telencephalic bounds: the v2 camera
          // offset 1.4× larger along the SAME direction, so the default view
          // stays brainstem-centric (plan §5). See DEFAULT_CAMERA_* above for
          // the derivation and the load-time assertion.
          camera={{
            position: [
              DEFAULT_CAMERA_POSITION[0],
              DEFAULT_CAMERA_POSITION[1],
              DEFAULT_CAMERA_POSITION[2],
            ],
            fov: 45,
            near: 0.5,
            far: 800,
          }}
          gl={{ alpha: true, antialias: true, localClippingEnabled: true }}
          onCreated={(state) => {
            const { gl } = state
            gl.localClippingEnabled = true
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.1
            gl.outputColorSpace = THREE.SRGBColorSpace
            // Context-loss wiring: the root state (for setFrameloop/advance/
            // invalidate) and the renderer (for the restore request) are only
            // reachable here; the canvas ELEMENT arrives through the ref above.
            rendererRef.current = gl
            rootStateRef.current = state
          }}
          onPointerMissed={() => selectStructure(null)}
        >
          {/* Keyed by envGeneration: a restored context has no PMREM target, so
              the environment is rebuilt (its cleanup disposes the old one).
              Wrapped like the rest of the GPU work: `PMREMGenerator.fromScene`
              is a real render pass, and a failure there must not take the
              overlay down with it (v7 closure, gap 1). */}
          <CanvasSceneBoundary
            key={`env-${envGeneration}-${sceneGeneration}`}
            name="Image-based lighting"
            onError={onSceneError}
          >
            <SceneEnvironment key={envGeneration} />
          </CanvasSceneBoundary>
          <CanvasContextRecovery
            contextLost={contextPhase !== null}
            stateRef={rootStateRef}
            envGeneration={envGeneration}
          />
          <ClipSync />
          {/* Soft key + fill over the IBL base (plan §1 Layer 3). Shadow
              maps are intentionally off until the post-fx task. */}
          <ambientLight intensity={0.22} />
          <hemisphereLight args={['#dfe7f2', '#2b2f38', 0.35]} />
          <directionalLight position={[40, 60, 40]} intensity={1.35} color="#fff3e2" castShadow={false} />
          <directionalLight position={[-45, 20, -35]} intensity={0.45} color="#d8e6f8" />
          {/* v7 closure (gap 1): the canvas subtree is contained locally, so a
              throw in the scene or in the post stack can no longer be re-thrown
              by R3F's own boundary into the DOM tree — which is what unmounted
              Viewer3D (and the context-loss overlay with it) during the audit's
              context-loss gate. The key is the Retry reset only: the scene
              deliberately keeps the pre-existing restore semantics (three
              re-uploads its own resources), so a context restore does NOT remount
              the whole model. PostFX, which owns render targets, IS rebuilt on
              restore — see its key below. */}
          <CanvasSceneBoundary
            key={`scene-${sceneGeneration}`}
            name="3D scene"
            onError={onSceneError}
          >
            <SceneLayers />
            <PlaneHelpers />
          </CanvasSceneBoundary>
          {/* Post FX (realism plan §1 Layer 3): SSAO + subtle bloom + SMAA,
              mounted after the scene; skipped entirely on 'balanced' AND while
              the WebGL context is lost (PostFX's header documents the measured
              `getContextAttributes().alpha` crash that the guard removes). The
              envGeneration in the key rebuilds the composer against the NEW
              context after a restore. */}
          <CanvasSceneBoundary
            key={`postfx-${envGeneration}-${sceneGeneration}`}
            name="Post-processing"
            onError={onSceneError}
          >
            <PostFX enabled={quality === 'high'} quality={quality} contextLost={contextPhase !== null} />
          </CanvasSceneBoundary>
          {/* v9 (items 4+5): the panel is pure DOM + a 2D canvas and is mounted
              OUTSIDE this <Canvas> (see the panel markup below), so the canvas
              subtree now contains no PiP work at all. The retired in-canvas
              renderer (`SectionPiP`, a second orthographic camera + private
              render target + stencil/MSAA rig + real-slice backdrop) is deleted
              rather than hidden behind a toggle — its retirement record is in
              SectionPiP.tsx, and the panel's DOM sibling below is what the user
              sees. */}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            target={[
              DEFAULT_CAMERA_TARGET[0],
              DEFAULT_CAMERA_TARGET[1],
              DEFAULT_CAMERA_TARGET[2],
            ]}
            minDistance={20}
            maxDistance={260}
          />
        </Canvas>
      </div>

      <div className="viewer-overlay">
        <ClipControls />
      </div>
      <ExplodeSlider />
      {/* v9 items 4+5: the simulated-section panel. `windowRef` is the panel's
          viewport element, which the resize handle measures for its drag
          baseline (nothing is blitted into it any more). */}
      <SectionPiPPanel
        visible={sectionPipVisible}
        onVisibleChange={setSectionPipVisible}
        windowRef={sectionPipWindowRef}
      />
      {/* v5 UX_FIXES_PLAN Feature 1 — restore control. A DIRECT sibling of the
          panel in `.viewer3d-root` (position:relative), which is what makes it
          land in the panel's own corner and, because it is absolutely
          positioned chrome, guarantees no layout shift of the R3F canvas when
          the panel and the pill swap (the canvas lives in `.viewer3d-canvas`,
          also absolutely positioned in this block; nothing here is in flow).
          Deliberately NOT inside `.viewer-overlay`: that is ClipControls'
          top-right flex dock. No "has been hidden before" state — it renders on
          `sectionPipVisible === false` alone, so it is also discoverable when a
          persisted 'hidden' value is loaded on a first visit, and it disappears
          the moment the panel is visible again (the spec's rule). `onShow` is
          the very same setter the panel's × calls with `false`. */}
      {sectionPipVisible ? null : (
        <SectionPiPRestoreButton onShow={() => setSectionPipVisible(true)} />
      )}
      {/* v9: the imagery-request state line under the panel — empty whenever the
          request resolves at this plane, and stating the images-off state in
          words when imagery is switched off (item 4). Nothing renders in the
          steady state; see the file header. */}
      <SectionPipHint visible={sectionPipVisible} />
      {/* P0: visible, retryable state for timed-out anatomy loads. Renders
          nothing at all while every slug resolved (the healthy case). */}
      <GeometryUnavailableNotice />
      {/* v7 closure (gap 1): the DOM half of a contained canvas-subtree throw.
          Renders nothing while the scene and the post stack are healthy. */}
      {sceneFailure !== null ? (
        <CanvasSceneFailureNotice
          surface={sceneFailure.surface}
          message={sceneFailure.message}
          onRetry={() => {
            setSceneFailure(null)
            setSceneGeneration((generation) => generation + 1)
          }}
        />
      ) : null}
      <p className="viewer-hint">drag to orbit · scroll to zoom · right-drag to pan · click any structure</p>
      {/* P0: the recovery overlay. Mounted ONLY while a loss is active, so a
          healthy canvas is never covered (and the audit's screenshot check
          keeps seeing the real 3D image). */}
      {contextPhase !== null ? (
        <ContextLossOverlay phase={contextPhase} onRestore={onRestoreRequested} />
      ) : null}
    </div>
  )
}
