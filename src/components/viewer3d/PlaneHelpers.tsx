/**
 * PlaneHelpers — optional visual cut indicators (plan §5 "show plane" toggle):
 * one translucent quad + grid per active clip axis, positioned at the current
 * plane offsets. Purely visual: raycast disabled, depthWrite false, drawn on
 * top (renderOrder 30+), and not clipped by the planes themselves. Quad sizes
 * cover the extended canonical bounds (REALISM_PLAN §3 AMENDMENT A: x ±48,
 * y −55…+45, z −56…+26).
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
      {/* Transverse cut — y = clip.y (spans x ±48, z −56…+26) */}
      <group position={[0, clip.y, 0]}>
        <mesh rotation-x={-Math.PI / 2} renderOrder={30} raycast={noRaycast}>
          <planeGeometry args={[96, 82]} />
          <meshBasicMaterial
            color={HELPER_COLOR}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <gridHelper
          args={[96, 24, HELPER_COLOR, HELPER_COLOR]}
          material-transparent
          material-opacity={0.22}
          renderOrder={31}
          raycast={noRaycast}
        />
      </group>

      {/* Sagittal cut — x = clip.x (spans z −56…+26, y −55…+45) */}
      <group position={[clip.x, -5, 0]}>
        <mesh rotation-y={Math.PI / 2} renderOrder={30} raycast={noRaycast}>
          <planeGeometry args={[82, 100]} />
          <meshBasicMaterial
            color={HELPER_COLOR}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <gridHelper
          args={[82, 20, HELPER_COLOR, HELPER_COLOR]}
          rotation-z={Math.PI / 2}
          material-transparent
          material-opacity={0.22}
          renderOrder={31}
          raycast={noRaycast}
        />
      </group>

      {/* Coronal cut — z = clip.z (spans x ±48, y −55…+45) */}
      <group position={[0, -5, clip.z]}>
        <mesh renderOrder={30} raycast={noRaycast}>
          <planeGeometry args={[96, 100]} />
          <meshBasicMaterial
            color={HELPER_COLOR}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <gridHelper
          args={[96, 24, HELPER_COLOR, HELPER_COLOR]}
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
