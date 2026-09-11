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
 *
 * ── v7 CLOSURE: the composer MUST NOT be mounted while the WebGL context is
 *    lost (QUALITY_PLAN §1 item 1, audit gap 2) ───────────────────────────
 * Measured defect (`FAIL 3 unexpected error(s) during the P0 gates: TypeError:
 * Cannot read properties of null (reading 'alpha')`, sourced to this file):
 *   1. `webglcontextlost` fires, `Viewer3D` flips its loss state, and React
 *      re-renders the R3F tree (R3F v8's `Canvas` re-renders its root in a
 *      layout effect with no dependency array — `react-three-fiber.esm.js`
 *      `useIsomorphicLayoutEffect` around line 258).
 *   2. `@react-three/postprocessing`'s `EffectComposer` re-adds every pass in a
 *      layout effect whose deps include the `children` ARRAY IDENTITY
 *      (`EffectComposer.js:77-115`) — a fresh array on every render — so
 *      `composer.addPass(pass)` runs on that very re-render.
 *   3. `postprocessing@6.36.7` reads the context attributes in `addPass`
 *      (`build/index.js:1002`, and `:864` in `setRenderer`):
 *      `renderer.getContext().getContextAttributes().alpha` — and per the WebGL
 *      spec `getContextAttributes()` returns **null** while the context is lost.
 *      Hence the TypeError, thrown during React's commit phase.
 *   4. R3F's internal error boundary catches it and RE-THROWS it in the DOM tree
 *      (`Canvas`: `if (error) throw error`), so the app-level panel boundary for
 *      the 3D viewer unmounted the whole `Viewer3D` — taking the context-loss
 *      OVERLAY with it, which is why the audit saw `isContextLost() === true`
 *      with no `[data-context-lost]` element at the same moment.
 *
 * The fix is the third switch below: while the context is lost the composer is
 * never mounted (props → `contextLost`), so there is no pass to re-add, and it
 * is mounted again after `webglcontextrestored` (the caller also bumps
 * `envGeneration`, so the composer is rebuilt against the NEW context instead of
 * holding render targets that belong to the dead one).
 */
import { EffectComposer, SSAO, Bloom, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { RenderQuality } from '../../state/store'

export interface PostFXProps {
  /** Master switch — false renders nothing (plain canvas upstream). */
  enabled: boolean
  /** Sample budget knob; 'balanced' is expected to pass enabled={false}. */
  quality?: RenderQuality
  /**
   * True while the WebGL context is lost. Renders nothing: the composer's
   * constructor/`addPass` read `getContextAttributes().alpha`, which is null on
   * a lost context (see the header note). The caller unmounts this subtree for
   * the duration of the loss and remounts it on restore.
   */
  contextLost?: boolean
}

export function PostFX({ enabled, quality = 'high', contextLost = false }: PostFXProps) {
  if (!enabled) return null
  // No context → no composer. Not a visual downgrade: there is nothing to render
  // into, and the loss overlay is what the user must see.
  if (contextLost) return null

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
