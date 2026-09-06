/**
 * Viewer3D — the R3F canvas hosting the atlas scene (plan §5, viewer3d task).
 *
 * Camera [30, 10, 55] looking at [0, −5, 0]; OrbitControls with damping;
 * ambient 0.7 + key/fill directional lights; the canvas is transparent so the
 * CSS radial-gradient backdrop (--bg-viewer) shows through; WebGL local
 * clipping is enabled for the sagittal/coronal/transverse planes shared by
 * every material. Mounts SceneLayers (all data-driven meshes), PlaneHelpers
 * (cut indicators), and the ClipControls / ExplodeSlider overlays.
 *
 * Exports: default Viewer3D plus the named pieces so integration (and tests)
 * can compose or mount them independently.
 */
import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useAtlasStore } from '../../state/store'
import SceneLayers from './SceneLayers'
import NucleusMesh from './NucleusMesh'
import TractTube from './TractTube'
import ClipControls from './ClipControls'
import ExplodeSlider from './ExplodeSlider'
import PlaneHelpers from './PlaneHelpers'
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

export default function Viewer3D() {
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  return (
    <div className="viewer3d-root">
      <div className="viewer3d-canvas">
        <Canvas
          dpr={[1, 2]}
          flat
          camera={{ position: [30, 10, 55], fov: 45, near: 0.5, far: 800 }}
          gl={{ alpha: true, antialias: true, localClippingEnabled: true }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true
          }}
          onPointerMissed={() => selectStructure(null)}
        >
          <ClipSync />
          <ambientLight intensity={0.7} />
          <directionalLight position={[40, 60, 40]} intensity={1.1} />
          <directionalLight position={[-40, 20, -40]} intensity={0.35} />
          <SceneLayers />
          <PlaneHelpers />
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
      <p className="viewer-hint">drag to orbit · scroll to zoom · right-drag to pan · click any structure</p>
    </div>
  )
}

/** Named re-exports for consumers that compose the pieces individually. */
export { SceneLayers, NucleusMesh, TractTube, ClipControls, ExplodeSlider, PlaneHelpers }
