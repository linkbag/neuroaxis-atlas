/**
 * PipSection — the CONTENT of the 3D tab's simulated-section panel (v9 §5,
 * item 5: "only show the simulated sections … don't overlap any real photos").
 *
 * WHAT THIS FILE IS. A thin container. It renders the SAME renderer the Plates
 * tab renders — `SectionCanvas`, i.e. the Web-Worker contour clip + taxonomy
 * fills + labels, one code path, nothing duplicated (PLAN.md §0a) — inside its
 * own `SectionErrorBoundary`, and it owns the two guarantees that make the
 * panel's contract structural rather than a convention:
 *
 *   1. NO REAL IMAGERY IS ASKED FOR. `SectionCanvas` resolves its imagery from
 *      the store's `sectionUnderlay.kind` and takes no prop for it (that file
 *      belongs to task `cortical-lobes`), so this component holds the store in
 *      the images-off state for as long as the panel's canvas exists
 *      (`beginSectionPipImageryScope`, src/state/store.ts): the LIVE value only
 *      — the user's own persisted choice is never overwritten, and the scope is
 *      reference-counted and released on unmount. The panel therefore resolves
 *      exactly the state item 4 introduces, which is also why its canvas shows
 *      the section at full strength and states "real imagery is switched off"
 *      instead of a coverage excuse.
 *
 *   2. NO REAL IMAGERY CAN ARRIVE ANYWAY. The scope is a store write, and a
 *      guarantee that depends on a store write is only as strong as the next
 *      edit to the store. So the canvas is ALSO guarded at the pixel chokepoint:
 *      every real-imagery paint path in `section/imageLayers.ts` ends in exactly
 *      two 2D calls — `ctx.drawImage` (stain plates lines 789/791, the CT/MRI
 *      grid blit line 1365, the copy path lines 1928/1934) and `ctx.putImageData`
 *      (line 1331, on the grid's own offscreen raster which is then blitted with
 *      `drawImage`) — and `guardSimulatedOnlyCanvas` shadows both on THIS
 *      canvas' context only, counting what it dropped. The simulated section
 *      itself (contours, fills, the cortical-division layer, labels, grid,
 *      crosshair) draws with paths and text and never calls either, so the guard
 *      cannot touch it.
 *
 * HONEST LIMITS OF THE GUARD (measured, not implied):
 *  • it is a JS-level shadow on one context instance, not a browser policy: a
 *    layer that painted imagery by another route (a `createPattern` fill, a
 *    WebGL canvas) would not be seen. Today there is no such route — the claim
 *    is checked against the source by `scripts/verify-imaging-v4.mjs`-style
 *    text reads and by `.dsh-scratch/section-ux-probe.mjs`, which greps
 *    `imageLayers.ts` for the imagery call sites on every run;
 *  • `pipSectionGuard.blockedDraws` is the visible half: the panel prints it
 *    whenever it is non-zero, so a future route that starts painting imagery
 *    reports itself instead of silently appearing;
 *  • the guard cannot be observed from the agent sandbox (no Chrome): that it
 *    really drops pixels in a live page is **orchestrator-verified only**.
 *
 * WHY NOT a dedicated renderer: PLAN.md §0a is binding — `SectionCanvas`'
 * draw helpers are module-private inside the component body, so a second
 * renderer would have to re-implement the worker pump, the draw order, the
 * labels and the cortical-division layer, i.e. exactly the drift the shared
 * module exists to prevent.
 */
import { useEffect, useRef } from 'react'
import SectionCanvas from '../section/SectionCanvas'
import SectionErrorBoundary from '../section/SectionErrorBoundary'
import { beginSectionPipImageryScope } from '../../state/store'

/**
 * Live state of the panel's imagery guard. Read by the panel's own honesty line
 * and asserted by the task's Node probe; a plain mutable singleton because it is
 * written from an effect and read from a render, with no re-render contract.
 */
export const pipSectionGuard: {
  /** Guarded canvases currently mounted (0 = no panel canvas). */
  armed: number
  /** Real-imagery 2D calls the guard dropped since the page loaded. */
  blockedDraws: number
} = { armed: 0, blockedDraws: 0 }

/**
 * The two 2D calls that can place a real image on a section canvas — see the
 * file header for the per-call-site evidence in `imageLayers.ts`.
 */
const IMAGERY_2D_CALLS = ['drawImage', 'putImageData'] as const

/**
 * Shadow the imagery 2D calls on ONE canvas' context.
 *
 * The context object is the canvas' own (`getContext('2d')` returns the same
 * object on every call, which is what makes this work: `SectionCanvas` asks for
 * it again in its draw loop and receives the guarded instance). The shadow is an
 * own property on the context, so the prototype — and therefore every other
 * canvas in the app — is untouched; the disposer deletes it and the prototype
 * method is back.
 *
 * Returns a disposer that is safe to call twice, and a no-op disposer when the
 * canvas has no 2D context (a 0×0 or already-lost canvas): the panel then simply
 * relies on the store scope.
 */
export function guardSimulatedOnlyCanvas(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext('2d')
  if (context === null) return () => {}
  const target = context as unknown as Record<string, unknown>
  const shadowed: Array<{ name: string; original: unknown }> = []
  for (const name of IMAGERY_2D_CALLS) {
    const original = target[name]
    if (typeof original !== 'function') continue
    shadowed.push({ name, original })
    target[name] = function imageryBlockedByPipSection(): void {
      pipSectionGuard.blockedDraws += 1
    }
  }
  pipSectionGuard.armed += 1
  let released = false
  return () => {
    if (released) return
    released = true
    pipSectionGuard.armed = Math.max(0, pipSectionGuard.armed - 1)
    for (const { name, original } of shadowed) {
      // Deleting the own property restores the prototype method — the very
      // function that was shadowed (asserted in the task's Node probe with a
      // context double, and in the browser by the guard's own counter).
      delete target[name]
      if (target[name] !== original) target[name] = original
    }
  }
}

/**
 * The panel's content: the simulated 2D section, nothing else.
 *
 * No props: the plane, the axis, the underlay state, the layer visibility, the
 * selection and the cortical-division toggle all come from the store, through
 * the same `SectionCanvas` the Plates tab mounts. That is deliberate — a prop
 * surface here would be a second, silently divergent source of truth for the
 * section's framing.
 */
export default function PipSection() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // (1) The imagery scope. Effects run on commit, i.e. before the canvas' first
  //     rAF draw, so the panel never paints a frame of real imagery first.
  useEffect(() => beginSectionPipImageryScope(), [])

  // (2) The pixel guard, on the canvas this component just mounted.
  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas') ?? null
    if (canvas === null) return
    return guardSimulatedOnlyCanvas(canvas)
  }, [])

  return (
    <div className="pip-section" ref={containerRef}>
      {/* `display: contents` keeps the boundary layout-transparent while the
          panel is healthy (the same wrapper shape PlatesTab uses), so
          `.section-canvas-wrap` stays the flex child of `.pip-window`. A
          failure renders the shared "panel failed — Retry" card in its place;
          it can no longer take the panel's chrome down with it. */}
      <SectionErrorBoundary name="Simulated section panel" style={{ display: 'contents' }}>
        <SectionCanvas />
      </SectionErrorBoundary>
    </div>
  )
}
