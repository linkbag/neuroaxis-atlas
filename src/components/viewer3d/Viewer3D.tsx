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
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useAtlasStore } from '../../state/store'
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

  return (
    <div className="viewer3d-root">
      <div className="viewer3d-canvas">
        <Canvas
          dpr={dpr}
          // Default framing ×1.15 (REALISM_PLAN §3 AMENDMENT A) for the
          // extended v2 bounds: the wider cerebellar envelope must fit.
          camera={{ position: [34.5, 11.5, 63.25], fov: 45, near: 0.5, far: 800 }}
          gl={{ alpha: true, antialias: true, localClippingEnabled: true }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.1
            gl.outputColorSpace = THREE.SRGBColorSpace
          }}
          onPointerMissed={() => selectStructure(null)}
        >
          <SceneEnvironment />
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
      <p className="viewer-hint">drag to orbit · scroll to zoom · right-drag to pan · click any structure</p>
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
