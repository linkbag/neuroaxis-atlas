/**
 * Viewer3D — the R3F canvas hosting the atlas scene (plan §5 viewer3d task,
 * realism plan §1 Layer 3 render-pipeline task).
 *
 * Camera [34.5, 11.5, 63.25] (default framing ×1.15, AMENDMENT A) looking at
 * [0, −5, 0]; OrbitControls with damping;
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
 * SectionPiP GPU live-section picture-in-picture (v3 plan §2.1) — the
 * in-canvas renderer inside the Canvas, the dockable bottom-right panel
 * beside it (visible by default; hidden via the panel's hide button and
 * persisted in localStorage under neuroaxis.sectionPip), plus the v5 restore
 * control (`SectionPiPRestoreButton`, UX_FIXES_PLAN Feature 1) that takes the
 * panel's place in that same bottom-right corner whenever the flag is false —
 * so the hidden state is reversible instead of stranding the feature behind a
 * cleared localStorage.
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
 * The contract implemented here (and mirrored by the PiP, see
 * `SectionPiP.tsx` — this file's recipe is what that panel applies):
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
 *     force exactly one frame and resume the loop. Clipping planes and stencil
 *     state are re-applied by their owners on that frame (ClipSync re-runs the
 *     store's planes; the PiP re-assigns its own stencil/clipping materials from
 *     `useFrame`), which is why a forced frame is part of the restore recipe.
 *  3. The overlay is `role="alert"`, says "Graphics context lost — restoring…",
 *     and carries a click-to-restore button that requests restoration through
 *     `WEBGL_lose_context.restoreContext()`. It is unmounted unless a loss is
 *     ACTIVE, so a healthy canvas is never covered (this also keeps the audit's
 *     screenshot/pixel-bucket check honest).
 *  4. If the browser never restores the context (a hard device loss cannot be
 *     recovered in-page), the overlay switches after `CONTEXT_LOSS_DEAD_MS` to a
 *     terminal "could not be restored — reload" message with a Reload button.
 *     The failure mode is a stated state, never a silent black rectangle.
 *
 * ── v4 PiP real-imagery state (IMAGING_V4_PLAN §2 gap 4 + §4, task
 *    `integration-v4`) ─────────────────────────────────────────────────────
 * `pip-backdrop` DID land the GPU backdrop path (the evidence-based decision is
 * documented in SectionPiP's header and in the FALLBACK section below), so the
 * plan §4 fallback — "PiP unchanged + a note in the panel that the real-imagery
 * view lives in the Plates tab" — is not the shipping path and there is no
 * permanent "see the Plates tab" banner on a healthy build.
 *
 * What this file DOES surface is the honest state of that backdrop, because the
 * panel is otherwise silent about it: `SectionPipHint` below reads the live
 * diagnostics (`sectionPipDiagnostics.backdropReason`, written by the renderer
 * every frame) and shows, only while the PiP is visible and only while the
 * active modality genuinely cannot paint at the current plane, one line under
 * the panel saying what the panel is showing instead — the pure GPU cut.
 *   • 'unavailable' — an explicit modality with no data in this build (e.g. a
 *     CT grid that was never baked): the hint names the Plates tab, where the
 *     modality buttons are disabled with the same reason and the live-section
 *     canvas renders the full-resolution real slice for every modality that IS
 *     embedded.
 *   • 'loading'     — the volume/plate is still arriving; the hint says so and
 *     disappears on its own when the sampler's next redraw paints it.
 *   • 'no-anchor'   — a requested photograph has no plate anchored at this
 *     plane; the hint states it rather than leaving an unexplained black panel.
 * The element is fed through requestAnimationFrame with a textContent compare
 * and a `hidden` flip, so it costs no React render and never touches the GL
 * frame; it is empty (and unpainted) in the steady state, where the real slice
 * IS in the render target and the panel's own credit line is the visible
 * attribution (SectionPiPPanel's PipAttribution).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, type RootState } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useAtlasStore } from '../../state/store'
import {
  retryTimedOutAnatomyAssets,
  subscribeAnatomyTimeouts,
  timedOutAnatomyCount,
} from '../../geometry/anatomyAssets'
import SceneLayers from './SceneLayers'
import NucleusMesh from './NucleusMesh'
import TractTube from './TractTube'
import ClipControls from './ClipControls'
import ExplodeSlider from './ExplodeSlider'
import PlaneHelpers from './PlaneHelpers'
import PostFX from './PostFX'
import {
  SectionPiP,
  SectionPiPPanel,
  SectionPiPRestoreButton,
  sectionPipDiagnostics,
} from './SectionPiP'
import { applyClipState } from './clipPlanes'

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
 * three's renderer would keep walking the whole scene graph (84 meshes, the
 * PiP's extra passes) on every animation frame, for nothing. `setFrameloop
 * ('never')` is R3F's own supported way to stop scheduling frames, and
 * `advance(timestamp, true)` is its supported way to force one by hand.
 *
 * The first-mount branch exists because this effect is also responsible for
 * putting the loop back where the Canvas started it: `frameloop` is 'always'
 * unless a mounted `useFrame` consumer with priority > 0 takes rendering over
 * (PostFX at priority 1, the PiP at priority 2), and neither of those changes
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
    // the next animation frame: it re-runs every registered `useFrame` (the PiP
    // re-assigns its own clipping/stencil materials there) and redraws the
    // main view.
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

/* ------------------------------- v4 PiP real-imagery state hint */

/** Modality names for the hint sentence (indexed by the sampler's union). */
const MODALITY_WORDS: Record<string, string> = {
  auto: 'real',
  mri: 'MRI',
  ct: 'CT',
  stain: 'photograph',
  none: '',
}

/** Live input for the hint: exactly the fields the renderer publishes. */
export interface PipBackdropState {
  /** Modality the store asked for ('none' = "simulated only"). */
  requested: string
  /** Modality that actually painted ('none' when nothing did). */
  modality: string
  /** '' = painted (or 'none'); 'unavailable' | 'no-anchor' | 'loading' otherwise. */
  reason: string
}

/**
 * The honest one-line state of the PiP backdrop, or null when the panel is
 * showing real imagery (or is explicitly in "simulated only" mode). Pure and
 * exported so QA can check every branch without a GL context — this is the
 * PiP-side counterpart of SectionCanvas' `imageryHint`.
 *
 * It is deliberately NOT a permanent "see the Plates tab" banner: the panel
 * carries the real slice whenever a modality covers the plane, and a banner in
 * that state would be the opposite of honest. See the file header for the
 * fallback decision.
 */
export function pipBackdropHint(state: PipBackdropState): string | null {
  if (!(state.reason.length > 0)) return null
  if (state.requested === 'none') return null
  // `modality` is what the sampler RESOLVED even when it could not paint, so
  // 'auto' can still name the modality it was waiting on.
  const resolved = state.modality !== 'none' ? state.modality : state.requested
  const word = MODALITY_WORDS[resolved] ?? resolved
  if (state.reason === 'loading') {
    return resolved === 'auto'
      ? 'real imagery for this plane is still loading'
      : `the real ${word} imagery for this plane is still loading`
  }
  if (state.reason === 'no-anchor') {
    return 'no photograph is anchored at this plane — see the Plates tab for the anchored series and the other modalities'
  }
  if (state.reason === 'unavailable') {
    // The grid/plate data is not in this build at all: the panel is showing the
    // pure GPU cut, the Plates tab is where the embedded modalities are listed
    // (disabled buttons carry the same reason) and the live section renders.
    return resolved === 'auto'
      ? 'no embeddable real imagery in this build — see the Plates tab for the modality list and the live section'
      : `no embeddable ${word} imagery in this build — see the Plates tab for the modalities that are embedded`
  }
  return `real imagery unavailable at this plane (${state.reason}${resolved === 'auto' ? '' : `; ${word}`})`
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
    const tick = () => {
      if (stopped) return
      const d = sectionPipDiagnostics
      const hint = pipBackdropHint({
        requested: d.backdropRequested,
        modality: d.backdropModality,
        reason: d.backdropReason,
      })
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
          // Default framing ×1.15 (REALISM_PLAN §3 AMENDMENT A) for the
          // extended v2 bounds: the wider cerebellar envelope must fit.
          camera={{ position: [34.5, 11.5, 63.25], fov: 45, near: 0.5, far: 800 }}
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
              the environment is rebuilt (its cleanup disposes the old one). */}
          <SceneEnvironment key={envGeneration} />
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
          <SceneLayers />
          <PlaneHelpers />
          {/* Post FX (realism plan §1 Layer 3): SSAO + subtle bloom + SMAA,
              mounted after the scene; skipped entirely on 'balanced'. */}
          <PostFX enabled={quality === 'high'} quality={quality} />
          {/* GPU live-section PiP (v3 plan §2.1): renders the scene from the
              section-aligned orthographic camera after PostFX presents, and
              only while the panel below is visible. */}
          {sectionPipVisible ? (
            <SectionPiP visible={sectionPipVisible} windowRef={sectionPipWindowRef} />
          ) : null}
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            target={[0, -5, 0]}
            minDistance={20}
            maxDistance={260}
          />
        </Canvas>
      </div>

      <div className="viewer-overlay">
        <ClipControls />
      </div>
      <ExplodeSlider />
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
      {/* v4: the panel's own honest state line — only painted while the active
          modality genuinely has nothing to paint at this plane (see the file
          header). Nothing renders in the steady state. */}
      <SectionPipHint visible={sectionPipVisible} />
      {/* P0: visible, retryable state for timed-out anatomy loads. Renders
          nothing at all while every slug resolved (the healthy case). */}
      <GeometryUnavailableNotice />
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

/** Named re-exports for consumers that compose the pieces individually. */
export {
  SceneLayers,
  NucleusMesh,
  TractTube,
  ClipControls,
  ExplodeSlider,
  PlaneHelpers,
  PostFX,
  SectionPiP,
  SectionPiPPanel,
  SectionPiPRestoreButton,
  SectionPipHint,
}
