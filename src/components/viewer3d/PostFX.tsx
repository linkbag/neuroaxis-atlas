/**
 * PostFX — subtle physically-based post stack (realism plan §1 Layer 3
 * "Postprocessing", post-fx task): a soft SSAO for tissue contact shading, a
 * gentle bloom that only picks up bright selection/emissive tracts, and SMAA
 * for edge quality. Rendered inside the Viewer3D <Canvas> after the scene.
 *
 * Pin-specific notes (@react-three/postprocessing 2.16.3 + postprocessing
 * 6.36.7 — verified in docs/REALISM_RESEARCH_NOTES.md §3):
 * - SSAO requires the composer's normal pass (`enableNormalPass`); without it
 *   the wrapper logs an error and renders nothing.
 * - In postprocessing ≥ 6.36 the SSAO `radius` is a resolution-relative
 *   fraction of the buffer height (clamped [1e-6, 1], perspective-scaled in
 *   the shader), NOT raw world units. `0.11` ≈ 6 au at the canonical framing
 *   (fov 45°, ~65 au camera distance): worldRadius ≈ r · 2·tan(fov/2) · d
 *   ≈ 0.11 · 0.828 · 65 ≈ 6 au.
 * - `resolutionScale 0.5` renders the AO buffer at half resolution ("half-res
 *   samples") with a reduced sample budget — cheap and subtle.
 * - The composer turns the renderer's ACES tone mapping off while mounted, so
 *   an explicit ACES_FILMIC ToneMapping effect keeps `high` visually identical
 *   to `balanced` (plain canvas + renderer tone mapping).
 * - `multisampling 0` hands edge quality to SMAA (task contract).
 *
 * `balanced` never reaches the composer: the caller passes
 * `enabled={quality === 'high'}`, which renders null and leaves the plain
 * canvas (renderer AA + renderer tone mapping) untouched.
 */
import { EffectComposer, SSAO, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { RenderQuality } from '../../state/store'

export interface PostFXProps {
  /** Master switch — false renders nothing (plain canvas upstream). */
  enabled: boolean
  /** Sample budget knob; 'balanced' is expected to pass enabled={false}. */
  quality?: RenderQuality
}

export function PostFX({ enabled, quality = 'high' }: PostFXProps) {
  if (!enabled) return null

  const samples = quality === 'high' ? 16 : 10

  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SSAO
        samples={samples}
        rings={4}
        radius={0.11} // ≈ 6 au at the canonical framing — see header note
        intensity={1.1}
        luminanceInfluence={0.6}
        resolutionScale={0.5} // half-res AO buffer
        // World-unit (au) cutoffs; the 2.16.3 wrapper types these as required.
        // Distance: full AO radius across the whole orbit range (max 260 au),
        // fading out past ~360 au. Proximity: mirrors library defaults
        // (~0.4–1.2 au) to guard against self-occlusion banding up close.
        worldDistanceThreshold={300}
        worldDistanceFalloff={60}
        worldProximityThreshold={0.4}
        worldProximityFalloff={0.8}
      />
      <Bloom
        luminanceThreshold={0.85} // only hot pixels: selection/emissive tracts
        luminanceSmoothing={0.2}
        intensity={0.35}
        mipmapBlur
      />
      {/* Keep ACES parity with the plain-canvas (balanced) renderer path. */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  )
}

export default PostFX
