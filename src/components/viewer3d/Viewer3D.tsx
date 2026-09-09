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
 * persisted in localStorage under neuroaxis.sectionPip).
 *
 * Exports: default Viewer3D plus the named pieces so integration (and tests)
 * can compose or mount them independently.
 */
import { useEffect, useRef, useState } from 'react'
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
import { SectionPiP, SectionPiPPanel } from './SectionPiP'
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
}
