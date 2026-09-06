/**
 * PlaneHelpers — optional visual cut indicators (plan §5 "show plane" toggle):
 * one translucent quad + grid per active clip axis, positioned at the current
 * plane offsets. Purely visual: raycast disabled, depthWrite false, drawn on
 * top (renderOrder 30+), and not clipped by the planes themselves.
 */
import * as THREE from 'three'
import { useAtlasStore } from '../../state/store'

const HELPER_COLOR = '#38bdf8'

const noRaycast = () => null

export default function PlaneHelpers() {
  const clip = useAtlasStore((s) => s.clip)
  if (!clip.showHelper) return null

  return (
    <group name="clip-plane-helpers">
      {/* Transverse cut — y = clip.y */}
      <group position={[0, clip.y, 0]}>
        <mesh rotation-x={-Math.PI / 2} renderOrder={30} raycast={noRaycast}>
          <planeGeometry args={[44, 36]} />
          <meshBasicMaterial
            color={HELPER_COLOR}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <gridHelper
          args={[44, 22, HELPER_COLOR, HELPER_COLOR]}
          material-transparent
          material-opacity={0.22}
          renderOrder={31}
          raycast={noRaycast}
        />
      </group>

      {/* Sagittal cut — x = clip.x */}
      <group position={[clip.x, -5, 0]}>
        <mesh rotation-y={Math.PI / 2} renderOrder={30} raycast={noRaycast}>
          <planeGeometry args={[36, 100]} />
          <meshBasicMaterial
            color={HELPER_COLOR}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <gridHelper
          args={[36, 18, HELPER_COLOR, HELPER_COLOR]}
          rotation-z={Math.PI / 2}
          material-transparent
          material-opacity={0.22}
          renderOrder={31}
          raycast={noRaycast}
        />
      </group>

      {/* Coronal cut — z = clip.z */}
      <group position={[0, -5, clip.z]}>
        <mesh renderOrder={30} raycast={noRaycast}>
          <planeGeometry args={[44, 100]} />
          <meshBasicMaterial
            color={HELPER_COLOR}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <gridHelper
          args={[44, 22, HELPER_COLOR, HELPER_COLOR]}
          rotation-x={Math.PI / 2}
          material-transparent
          material-opacity={0.22}
          renderOrder={31}
          raycast={noRaycast}
        />
      </group>
    </group>
  )
}
