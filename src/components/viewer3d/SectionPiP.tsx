/**
 * SectionPiP — the 3D tab's **simulated-section panel** (v9 items 4 + 5).
 *
 * WHAT THE PANEL IS NOW. A docked bottom-right panel whose window contains the
 * SIMULATED 2D section — the same renderer the Plates tab mounts
 * (`section/SectionCanvas`: the Web-Worker contour clip, taxonomy fills, labels
 * and the cortical-division layer), for the same plane and axis the 3D sliders
 * define. It contains no 3D scene, no clipped geometry, no plane helper and no
 * real imagery: the window's only child is `<PipSection>`, which owns both
 * guarantees that keep it simulated-only (`viewer3d/PipSection.tsx` explains the
 * store scope and the `drawImage`/`putImageData` pixel guard, with the
 * per-call-site evidence from `imageLayers.ts`).
 *
 * WHAT THE CHROME IS. Everything the user still needs and nothing that only
 * served the retired renderer (PLAN §5.4 requirement 5):
 *
 *   • the plane readout in the `y = −24.0 au` format (`scripts/verify/audit.mjs`
 *     clicks the plane slider and reads THIS element: `.pip-readout` must stay
 *     the first one in the panel and keep the `x = 12.0 au` shape);
 *   • the `X` / `Y` / `Z` axis override buttons with `aria-pressed` (the audit
 *     clicks them by exact text and then reads the four `.pip-orient` badges);
 *   • the four `.pip-orient` L/R/A/P/S/I badges, patient-left convention, from
 *     the shared `planeGeometry.PLANE_BADGES` (asserted per axis at load below);
 *   • `×` (hide, `title="Hide live section"`) and the restore pill
 *     (`SectionPiPRestoreButton`, `Live section ▸`), unchanged;
 *   • the narrow-viewport `.pip-toggle` label — the a11y gate reads the literal
 *     `"pip-toggle"` within 120 characters of
 *     `"Show or hide the live section panel"`, which is why that pair stays
 *     spelled exactly like this in the JSX below;
 *   • **NEW — a resizable window** (`▴/▾` preset cycle + a corner drag handle +
 *     arrow keys), persisted as `neuroaxis.sectionPipSize` in the store;
 *   • **NEW — the imagery state line** inside the window, stating in words that
 *     this panel is simulated-only and where the real imagery lives (item 4's
 *     legibility requirement applied to this surface).
 *
 * ── WHAT WAS RETIRED, AND WHY (the deliberate removal the plan asks for) ─────
 * The previous version of this file was a ~1,700-line GPU rig: a private
 * orthographic camera (the recorded second basis, `planeGeometry.ts:52–65`), a
 * private `WebGLRenderTarget`, the three.js stencil parity + cap passes, an MSAA
 * fallback watchdog, a `?pipdebug` readout overlay, a scissored blit into the
 * panel's viewport rect and — since v4 — a real-slice backdrop sampler that
 * painted CT/MRI/photographs into the same target. Everything in that list
 * existed ONLY to render the clipped 3D scene into the panel, which is exactly
 * what the user asked to stop showing. It was therefore deleted, not parked
 * behind a toggle (PLAN §5.4.5 records that the "keep the GPU cut behind a
 * toggle" fallback was explicitly rejected). Grep-checked before deletion: no
 * other module referenced `SectionPiP` (the in-canvas renderer), `createPipRig`,
 * `disposePipRig`, `supportsMsaaTargets`, the `OWN_*_PLANES` table, the
 * `PARITY_*` constants, `pipContextState`/`subscribePipContext` or the backdrop
 * sampler — `viewer3d/Viewer3D.tsx` was the only consumer, and it mounted the
 * renderer inside its `<Canvas>`.
 *
 * Consequences of the removal, stated so they are not discovered later:
 *   • the panel no longer touches WebGL at all, so it no longer needs — and no
 *     longer has — its own context-loss path (`.pip-context-lost`); the MAIN
 *     canvas' recovery overlay is untouched and is still asserted by the audit
 *     (block M) and by `scripts/verify/closure-bite.mjs`;
 *   • `src/geometry/materials.ts` keeps `DEFAULT_SECTION_CAP_COLOR`,
 *     `firstSectionCapColor` and `registeredAnatomyMaterials` (that file is not
 *     in this task's write scope, and the cap colour is still exported for the
 *     3D materials); this file simply no longer imports them;
 *   • the recorded coronal camera-basis degeneracy (`verify:plane` prints it and
 *     does not fail on it) no longer affects anything the user can see: there is
 *     no second camera left. The three frozen facts the gate still reads out of
 *     `SECTION_VIEWS` (`up`, `cameraSide`, `flipX`) are kept as DECLARED FACTS of
 *     that retired camera — see the table's own comment.
 *
 * ── HONESTY: WHAT IS VERIFIED WHERE ─────────────────────────────────────────
 * Node-verifiable and verified here: the markup contract (a `section-canvas`
 * inside `.pip-window`, no `<img>`, no `.pip-credit`, no `.pip-backdrop-hint`,
 * no `.pip-context-lost`), the a11y/`verify:plane` source literals this file must
 * keep, the size clamp and the preset cycle, and the retirement itself (the
 * deleted machinery does not appear in the source any more).
 * **Orchestrator-verified only** (Chrome cannot run in the agent sandbox): that
 * the panel really paints the simulated section, that the resizer really moves
 * the box and survives a reload, that the guard really drops imagery pixels in a
 * live page, and that no plane helper is on screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import {
  IMAGERY_OFF_STATEMENT,
  PIP_IMAGERY_WITHHELD_STATEMENT,
  SECTION_UNDERLAY_KIND_DESCRIPTIONS,
  SECTION_UNDERLAY_KIND_LABELS,
  SECTION_PIP_SIZE_MAX,
  SECTION_PIP_SIZE_MIN,
  clampSectionPipSize,
  nextSectionPipSize,
  sectionPipSizePresetOf,
  sectionPipImageryScope,
  useAtlasStore,
  type SectionAxis,
  type SectionPipSize,
  type SectionUnderlayKind,
} from '../../state/store'
import { levels } from '../../data/load'
import {
  ctLayerStatus,
  getCtDataStatus,
  getMriDataStatus,
  mriLayerStatus,
  resolveSliceModality,
  type SliceMissReason,
  type SliceModality,
} from '../section/imageLayers'
import {
  AXIS_PAIR,
  MODALITY_TOLERANCE_AU,
  PLANE_BADGES,
  cameraUpAxis,
  mirrorX,
  nearestLevelTo,
  planeTransform,
  type PlaneBadges,
} from '../section/planeGeometry'
import type { PlaneAxis } from '../section/contours'
import PipSection, { pipSectionGuard } from './PipSection'
import '../../styles/sectionPip.css'

/* ------------------------------------------------------------------ */
/* Axis geometry (the section's declared orientation facts)            */
/* ------------------------------------------------------------------ */

interface SectionViewSpec {
  /**
   * Direction from the visible rect's centre toward the DISCARDED half-space —
   * the side the RETIRED section camera stood on so the cut face pointed at the
   * lens. Derived from the shared `AXIS_PAIR` (the positive in-plane u axis for
   * sagittal, the positive v axis for transverse/coronal).
   *
   * KEPT AS A DECLARED FACT, not as live geometry: the panel renders no 3D scene
   * any more, so nothing here positions a camera. `npm run verify:plane` (§B6)
   * reads this value, `up` and `flipX` out of this table and asserts them against
   * the shared module's rule (`mirrorX(axis) === (cameraUpAxis(axis) === uAxis)`,
   * the up axis always in-plane, never the plane normal) — the frozen gate is
   * what keeps them, and deleting them would delete an assertion instead of a
   * behaviour. Their standing: recorded, cross-checked, no longer used to draw.
   */
  cameraSide: readonly [number, number, number]
  /** Declared up axis of the retired camera — the shared `cameraUpAxis(axis)`. */
  up: readonly [number, number, number]
  /**
   * The retired blit's horizontal mirror — the shared `mirrorX(axis)`. The panel
   * no longer blits a render target: its content is a `SectionCanvas`, which maps
   * world→screen with the shared `planeTransform` and therefore needs no flip at
   * all. Recorded + gate-checked for the same reason as `cameraSide`.
   */
  flipX: boolean
  /** Edge badges — §2.2 orientation, as displayed (the shared PLANE_BADGES). */
  labels: PlaneBadges
  caption: string
}

/** Component index of a canonical axis, for tuple component access. */
const AXIS_COMPONENT: Record<PlaneAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 }

/**
 * Unit world vector along the positive direction of one canonical axis, as a
 * bare tuple: this module draws no 3D scene, so it deliberately depends on no
 * 3D library. `x = +patient-left, y = +superior, z = +anterior` is the canonical
 * convention (docs/SWARM_V9_PLAN.md §0).
 */
function axisUnitVector(axis: PlaneAxis): readonly [number, number, number] {
  const vector: [number, number, number] = [0, 0, 0]
  vector[AXIS_COMPONENT[axis]] = 1
  return vector
}

const SECTION_VIEWS: Record<SectionAxis, SectionViewSpec> = {
  y: {
    cameraSide: axisUnitVector(AXIS_PAIR.y[1]),
    up: axisUnitVector(cameraUpAxis('y')),
    flipX: mirrorX('y'),
    labels: { top: 'A', bottom: 'P', left: 'R', right: 'L' }, // = PLANE_BADGES.y
    caption: 'Transverse',
  },
  x: {
    cameraSide: axisUnitVector(AXIS_PAIR.x[0]),
    up: axisUnitVector(cameraUpAxis('x')),
    flipX: mirrorX('x'),
    labels: { top: 'S', bottom: 'I', left: 'P', right: 'A' }, // = PLANE_BADGES.x
    caption: 'Sagittal',
  },
  z: {
    cameraSide: axisUnitVector(AXIS_PAIR.z[1]),
    up: axisUnitVector(cameraUpAxis('z')),
    flipX: mirrorX('z'),
    labels: { top: 'S', bottom: 'I', left: 'R', right: 'L' }, // = PLANE_BADGES.z
    caption: 'Coronal',
  },
}

{
  // The spelled-out rows above must BE the shared table (the same assertion the
  // live canvas makes): a drift fails at module load instead of labelling a
  // plane differently on the two surfaces. `scripts/verify-imaging-v4.mjs` reads
  // these letters from THIS source, and `npm run verify:plane` re-derives them
  // from the projected geometry — both stay bound to the table below.
  for (const axis of ['x', 'y', 'z'] as PlaneAxis[]) {
    const shared = PLANE_BADGES[axis]
    const local = SECTION_VIEWS[axis].labels
    if (
      local.top !== shared.top ||
      local.bottom !== shared.bottom ||
      local.left !== shared.left ||
      local.right !== shared.right
    ) {
      throw new Error(
        `SectionPiP: SECTION_VIEWS.${axis}.labels disagrees with planeGeometry.PLANE_BADGES.${axis}`,
      )
    }
  }
}

/* ------------------------------------------------------------------ */
/* Diagnostics for the panel's host (Viewer3D.SectionPipHint)           */
/* ------------------------------------------------------------------ */

/**
 * The panel's published state. Deliberately LEAN (PLAN §5.4.3): the retired rig
 * fields (`rtWidth`/`rtSamples`/`blit*`/`glErr`/`frameCounter`/`capCoveragePct`/
 * `parityZeroFrames`/`msaaFallback`/`ownPlaneConstant`/`backdropKey`/
 * `backdropCredit`/`backdropKb`/`contextLost`/`rigGeneration`) are gone with the
 * machinery that produced them; `Viewer3D.SectionPipHint` reads exactly the five
 * fields below.
 *
 * The values describe the REAL-IMAGERY REQUEST, not the panel's content: the
 * panel always shows the simulated section, and the hint says so, while the
 * modality/reason fields let it state the same coverage limit the Plates canvas
 * and toolbar state for the same plane (`beyond-source` on the CT grid above the
 * Visible Human series' apex — the audit's L5b block asserts that sentence).
 */
export interface SectionPipDiagnostics {
  /** Slider value of the active axis (au). */
  planeValue: number
  /** Section axis the request was resolved on (`store.sectionAxis`). */
  backdropAxis: SectionAxis | null
  /** Modality the USER asked for ('none' = the images-off state, item 4). */
  backdropRequested: SliceModality
  /** Modality that would actually paint on the Plates canvas at this plane. */
  backdropModality: SliceModality
  /** Why it would not paint ('' = it would, or the request is 'none'). */
  backdropReason: SliceMissReason | ''
}

/** Module-level singleton: the panel publishes, the host's hint reads. */
export const sectionPipDiagnostics: SectionPipDiagnostics = {
  planeValue: 0,
  backdropAxis: null,
  backdropRequested: 'none',
  backdropModality: 'none',
  backdropReason: '',
}

/**
 * The level anchor the imagery resolution uses on the transverse axis: the
 * nearest `levels.json` anchor within the shared anchor tolerance. This is a thin
 * WINDOW over the shared scan — the scan itself (and the distance it measures)
 * lives only in `planeGeometry.nearestLevelTo`, exactly as `verify:plane`'s A0
 * delegation check requires.
 */
function sectionLevelId(axis: SectionAxis, value: number): string | null {
  const nearest = nearestLevelTo(axis, value, levels)
  return nearest !== null && nearest.distance <= MODALITY_TOLERANCE_AU ? nearest.level.id : null
}

/**
 * Refresh the published state from the store (pure reads, no drawing).
 *
 * `sectionPipImageryScope.saved` wins over the live value on purpose: while the
 * panel's canvas is mounted the store holds the images-off state (the panel's
 * own scope, see `PipSection`), and the hint's job is to describe what the PLATES
 * canvas would draw — i.e. the user's own choice — plus the fact that this panel
 * withholds it. Publishing the scope's own `'none'` instead would make the audit's
 * CT-coverage sentence disappear from the panel's hint and read as "no imagery
 * anywhere", which would be false.
 */
export function publishSectionPipDiagnostics(): void {
  const state = useAtlasStore.getState()
  const axis = state.sectionAxis
  const value = state.clip[axis]
  const requested = (sectionPipImageryScope.saved?.kind ??
    state.sectionUnderlay.kind) as SliceModality
  const resolution = resolveSliceModality(axis, value, requested, sectionLevelId(axis, value))
  sectionPipDiagnostics.planeValue = value
  sectionPipDiagnostics.backdropAxis = axis
  sectionPipDiagnostics.backdropRequested = requested
  sectionPipDiagnostics.backdropModality = resolution.modality
  sectionPipDiagnostics.backdropReason = resolution.reason ?? ''
}

/* ------------------------------------------------------------------ */
/* Size + world-window helpers (pure, exported for the task's check)    */
/* ------------------------------------------------------------------ */

/** `'−24.0'` — one decimal, typographic minus (plan §2.1 readout format). */
function formatPlaneValue(value: number): string {
  return value.toFixed(1).replace('-', '−')
}

/** The panel's own window box in canonical world units, through the ONE shared
 *  transform — the same mapping the canvas draws with, so the readout describes
 *  the box the section is actually fitted into (no second geometry). */
export function pipWorldWindow(
  axis: SectionAxis,
  planeValue: number,
  size: SectionPipSize,
): { uMin: number; uMax: number; vMin: number; vMax: number; pixelsPerAu: number } {
  const transform = planeTransform(axis, planeValue, { width: size.width, height: size.height })
  return {
    uMin: transform.uMin,
    uMax: transform.uMax,
    vMin: transform.vMin,
    vMax: transform.vMax,
    pixelsPerAu: transform.scale,
  }
}

/**
 * The panel's imagery state line (item 4 legibility, applied to this surface).
 * Pure and exported so the wording is checkable without a browser.
 *
 * `requested` is the user's own modality request; `blockedDraws` is
 * `PipSection`'s guard counter, printed whenever it is non-zero so a future
 * imagery route that the guard had to drop reports itself.
 */
export function pipImageryStateText(
  requested: SectionUnderlayKind,
  blockedDraws: number,
): string {
  const base =
    requested === 'none'
      ? 'simulated section only · real imagery off'
      : `simulated section only · real imagery kept in the Plates tab (${SECTION_UNDERLAY_KIND_LABELS[requested]})`
  return blockedDraws > 0 ? `${base} · ${blockedDraws} image draw(s) blocked` : base
}

/** The same state, in full, for the line's `title` (never truncated). */
export function pipImageryStateTitle(requested: SectionUnderlayKind): string {
  return requested === 'none'
    ? `${SECTION_UNDERLAY_KIND_DESCRIPTIONS.none} — ${IMAGERY_OFF_STATEMENT}`
    : `${SECTION_UNDERLAY_KIND_DESCRIPTIONS[requested]} — ${PIP_IMAGERY_WITHHELD_STATEMENT}`
}

/**
 * The panel's window size for the size button's next stop, clamped exactly like
 * the store does. Exported so the clamp and the cycle are unit-testable without
 * a DOM (the store owns the canonical `clampSectionPipSize`; this is the panel's
 * one-line use of it, kept total for a corrupted stored value).
 */
export function pipSizeAfterCycle(current: SectionPipSize): SectionPipSize {
  return clampSectionPipSize(nextSectionPipSize(clampSectionPipSize(current)))
}

/* ------------------------------------------------------------------ */
/* SectionPiPPanel — the dockable DOM panel                            */
/* ------------------------------------------------------------------ */

export interface SectionPiPPanelProps {
  /** Prop-driven visibility (§2.1 toggle); false renders nothing. */
  visible: boolean
  /** Hide button — wired by the mounting parent. */
  onVisibleChange?: (visible: boolean) => void
  /**
   * Ref that receives the window div. The panel no longer blits anything into
   * it (that renderer is gone); it is kept because the resize handle measures the
   * REAL box from it — the CSS narrow-viewport rule can force `width: 100 %`, so
   * the drag baseline must come from the element, not from the stored size.
   */
  windowRef?: RefObject<HTMLDivElement>
}

const AXIS_ORDER: SectionAxis[] = ['x', 'y', 'z']

/** Keyboard resize step (CSS px); Shift multiplies it by four. */
const RESIZE_KEY_STEP = 16

/**
 * Below this window width the header switches to its COMPACT form
 * (`pip-compact` in `sectionPip.css`): the axis caption is dropped and the gaps
 * tighten, so the header's own natural width stays at or below the window's.
 *
 * WHY IT MATTERS: the panel card is `align-items: center` + shrink-to-fit, so
 * its width is `max(header, window)` — which is how the card hugs the viewport
 * instead of showing a lopsided strip beside it now that the window carries a
 * real background (it used to be transparent). A header that could not fit
 * inside the smallest window (224 px, the clamp's floor and the `small` preset)
 * would make the card wider than the window at every small size. The threshold
 * is measured from the shipped metrics, not guessed: the non-compact header is
 * caption (~76 px) + readout (~70 px) + three 24 px axis buttons + a 24 px size
 * button + a 24 px hide button + five 6 px gaps + 16 px padding ≈ 306 px, and the
 * compact form removes the caption and the wide gaps (~217 px).
 */
const PIP_COMPACT_WIDTH = 320

export function SectionPiPPanel({ visible, onVisibleChange, windowRef }: SectionPiPPanelProps) {
  const sectionAxis = useAtlasStore((s) => s.sectionAxis)
  const setSectionAxis = useAtlasStore((s) => s.setSectionAxis)
  const clipEnabled = useAtlasStore((s) => s.clip.enabled)
  const planeValue = useAtlasStore((s) => s.clip[s.sectionAxis])
  const size = useAtlasStore((s) => s.sectionPipSize)
  const setSectionPipSize = useAtlasStore((s) => s.setSectionPipSize)
  /**
   * The imagery REQUEST the line below describes. `sectionUnderlay.kind` is
   * subscribed (not read imperatively) because the images-off scope and the
   * Plates toolbar both write it; `sectionPipImageryScope.saved` — the user's own
   * choice, held while this panel's canvas is mounted — wins when it is set, so
   * the line can name the modality the Plates tab keeps.
   */
  const underlayKind = useAtlasStore((s) => s.sectionUnderlay.kind)
  /**
   * Narrow-viewport disclosure (<900 px): the panel collapses to a labelled tab
   * and this is its expand/collapse state. It is deliberately NOT the size
   * control any more — the size lives in the store and persists, while this is a
   * per-viewport disclosure that resets with the page (see `sectionPip.css`).
   */
  const [expanded, setExpanded] = useState(false)
  /** Live drag state (pointer id + the baseline box the drag started from). */
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    width: number
    height: number
  } | null>(null)

  /* ---- publish the lean diagnostics while the panel is on screen ---- */
  useEffect(() => {
    if (!visible) return undefined
    let timer = 0
    const stop = () => {
      if (timer !== 0) {
        window.clearInterval(timer)
        timer = 0
      }
    }
    /**
     * The imagery data (the CT/MRI grids) arrives without any store write, so a
     * store subscription alone would leave the published reason stuck on
     * 'loading' — the exact defect QUALITY_PLAN §1 item 3 fixed. The refresh is
     * therefore also armed on a 1 s tick, and it STOPS itself as soon as both
     * grids have reached a terminal state (the same bounded-tick shape PlatesTab
     * uses). Published on a store change too, so a slider drag is instant.
     */
    const gridsSettled = (): boolean => {
      const settled = (status: string): boolean =>
        status === 'ready' || status === 'failed' || status === 'timeout'
      const mriDone = mriLayerStatus() !== 'available' || settled(getMriDataStatus())
      const ctDone = ctLayerStatus() !== 'available' || settled(getCtDataStatus())
      return mriDone && ctDone
    }
    const publish = () => {
      publishSectionPipDiagnostics()
      if (gridsSettled()) stop()
    }
    const arm = () => {
      publishSectionPipDiagnostics()
      if (!gridsSettled() && timer === 0) timer = window.setInterval(publish, 1000)
    }
    arm()
    const unsubscribe = useAtlasStore.subscribe(arm)
    return () => {
      unsubscribe()
      stop()
    }
  }, [visible])

  /* ---- resize: corner drag (pointer) + arrow keys ---- */
  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const rect = windowRef?.current?.getBoundingClientRect() ?? null
      const box =
        rect !== null && rect.width > 0 && rect.height > 0
          ? { width: rect.width, height: rect.height }
          : size
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: box.width,
        height: box.height,
      }
      event.preventDefault()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        /* pointer capture is an optimisation: the drag still tracks without it */
      }
    },
    [size, windowRef],
  )
  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (drag === null || drag.pointerId !== event.pointerId) return
      setSectionPipSize({
        width: drag.width + (event.clientX - drag.startX),
        height: drag.height + (event.clientY - drag.startY),
      })
    },
    [setSectionPipSize],
  )
  const onResizePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released (or never captured) — nothing to undo */
    }
  }, [])
  const onResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? RESIZE_KEY_STEP * 4 : RESIZE_KEY_STEP
      const delta =
        event.key === 'ArrowLeft'
          ? { width: -step, height: 0 }
          : event.key === 'ArrowRight'
            ? { width: step, height: 0 }
            : event.key === 'ArrowUp'
              ? { width: 0, height: -step }
              : event.key === 'ArrowDown'
                ? { width: 0, height: step }
                : null
      if (delta === null) return
      event.preventDefault()
      // ABSOLUTE, not a delta. `setSectionPipSize` merges what it is given into the
      // current size and clamps the result, so passing `{ height: 64 }` used to mean
      // "make the panel 64 px tall" — below SECTION_PIP_SIZE_MIN.height, so the clamp
      // put it straight back and the key did nothing at all (the browser audit read
      // exactly that: "moved the height by 0 px"). The drag handler next door has
      // always added its movement to the starting size; the keyboard must do the same.
      setSectionPipSize({
        width: size.width + delta.width,
        height: size.height + delta.height,
      })
    },
    [setSectionPipSize, size.height, size.width],
  )

  const windowTitle = useMemo(() => {
    const window_ = pipWorldWindow(sectionAxis, planeValue, size)
    return (
      `${sectionAxis} = ${formatPlaneValue(planeValue)} au — the window shows ` +
      `${window_.uMin.toFixed(1)}…${window_.uMax.toFixed(1)} au × ` +
      `${window_.vMin.toFixed(1)}…${window_.vMax.toFixed(1)} au of the simulated section ` +
      `(${window_.pixelsPerAu.toFixed(2)} px/au)`
    )
  }, [sectionAxis, planeValue, size])

  if (!visible) return null

  const view = SECTION_VIEWS[sectionAxis]
  const preset = sectionPipSizePresetOf(size)
  const requestedKind: SectionUnderlayKind = sectionPipImageryScope.saved?.kind ?? underlayKind
  // `blockedDraws` is read at render time (it is written from the canvas' draw
  // path, so it is not a React state): the panel re-renders on every plane tick,
  // and a non-zero count is a "should never happen" alarm — see PipSection.
  const imageryText = pipImageryStateText(requestedKind, pipSectionGuard.blockedDraws)

  return (
    <div
      className={`pip-panel pip-${preset}${size.width < PIP_COMPACT_WIDTH ? ' pip-compact' : ''}`}
      role="group"
      aria-label="Simulated section panel — the 2D section synced to the clip sliders"
    >
      <div className="pip-header">
        <span className="pip-title">{view.caption}</span>
        <span className="pip-readout" title={windowTitle}>{`${sectionAxis} = ${formatPlaneValue(planeValue)} au`}</span>
        <span className="pip-spacer" />
        <span className="pip-axis-group" title="Section axis (manual override)">
          {AXIS_ORDER.map((axis) => (
            <button
              key={axis}
              type="button"
              className="pip-btn"
              aria-pressed={axis === sectionAxis}
              onClick={() => setSectionAxis(axis)}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </span>
        <button
          type="button"
          className="pip-btn"
          aria-pressed={preset === 'large'}
          title={
            `Panel size — ${size.width}×${size.height} px (drag the corner handle for any size; ` +
            'the choice is remembered)'
          }
          onClick={() => setSectionPipSize(pipSizeAfterCycle(size))}
        >
          {preset === 'large' ? '▾' : '▴'}
        </button>
        <button
          type="button"
          className="pip-btn"
          title="Hide live section"
          onClick={() => onVisibleChange?.(false)}
        >
          ×
        </button>
      </div>
      {/* RESPONSIVE TAB (P2 a11y/polish: QUALITY_PLAN §4 item 15, AUDIT §2.20)
          — the narrow-viewport (<900 px) COLLAPSED state of this panel.
          `sectionPip.css` hides `.pip-header` there and this 44 px sticky row is
          all that shows, so the PiP degrades to a labelled tab instead of a
          fixed panel sitting on top of the model it annotates. The checkbox is
          visually hidden but focusable, so the row is ONE named control for both
          pointer and keyboard; `:checked` is the expanded state and the caret
          flips with it. The buttons above stay in the DOM and are re-shown when
          expanded — this adds no focus stop and no unnamed node (the label text
          and the plane readout are the accessible name). Desktop is unaffected:
          the header stays visible and this row is a second, tab-style
          readout/expand control beside the `▴/▾` button. */}
      <label className="pip-toggle" title="Show or hide the live section panel">
        <input
          type="checkbox"
          checked={expanded}
          aria-expanded={expanded}
          onChange={(event) => setExpanded(event.target.checked)}
        />
        <span className="pip-toggle-row">
          <span className="pip-toggle-label">Live section</span>
          <span className="pip-readout">{`${sectionAxis} = ${formatPlaneValue(planeValue)} au`}</span>
          <span className="pip-spacer" />
          <span className="pip-toggle-caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </span>
      </label>
      {/* `.pip-window` is the panel's viewport. Its size comes from the store
          through CUSTOM PROPERTIES (not a `width`/`height` declaration), so the
          narrow-viewport media query can still override it — an inline `width`
          would win over every stylesheet rule and break the ≤900 px layout. The
          `pip-small`/`pip-large` classes remain the CSS-only fallback. */}
      <div
        className="pip-window"
        ref={windowRef}
        style={
          {
            '--pip-window-width': `${size.width}px`,
            '--pip-window-height': `${size.height}px`,
          } as CSSProperties
        }
      >
        <span className="pip-orient pip-orient-n">{view.labels.top}</span>
        <span className="pip-orient pip-orient-s">{view.labels.bottom}</span>
        <span className="pip-orient pip-orient-w">{view.labels.left}</span>
        <span className="pip-orient pip-orient-e">{view.labels.right}</span>
        {/* THE CONTENT: the simulated 2D section (worker-clipped contours and
            fills), and nothing else — no 3D scene, no plane helper, no real
            imagery. `PipSection` owns the store scope and the pixel guard. */}
        <PipSection />
        {/* Always-render (fix §2): this note is informational only and never
            gates the section — the canvas always shows the slice that the
            sliders define, checkbox on or off. */}
        {clipEnabled ? null : (
          <span
            className="pip-offnote"
            title="Enable clipping cuts the main 3D model. This panel always follows the sliders."
          >
            model not clipped — section synced to sliders
          </span>
        )}
        {/* Item 4, on this surface: the images-off state stated in words, in the
            slot the retired real-slice credit line used to occupy. */}
        <span
          className="pip-imagery-state"
          role="note"
          title={pipImageryStateTitle(requestedKind)}
        >
          {imageryText}
        </span>
        {/* Resizable window (item 5 requirement 4): a real button, so the size is
            keyboard-operable (arrows, Shift = ×4) as well as draggable, and it is
            the element that carries the control's accessible name. */}
        <button
          type="button"
          className="pip-resizer"
          aria-label={`Resize the simulated-section panel (${size.width}×${size.height} px, ${SECTION_PIP_SIZE_MIN.width}–${SECTION_PIP_SIZE_MAX.width} wide, ${SECTION_PIP_SIZE_MIN.height}–${SECTION_PIP_SIZE_MAX.height} tall)`}
          title={`Drag to resize · arrow keys move by ${RESIZE_KEY_STEP} px (Shift ×4) · remembered across reloads`}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          onKeyDown={onResizeKeyDown}
        >
          <span aria-hidden="true">◢</span>
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* SectionPiPRestoreButton — the way back from the hidden PiP          */
/*                                                                     */
/* WHY THIS EXISTS (UX_FIXES_PLAN Feature 1): SectionPiPPanel renders  */
/* null when `visible === false` and its only visibility control is    */
/* the × button, while the flag itself lives (persisted) in Viewer3D.  */
/* Hiding the panel therefore used to strand the user: no affordance   */
/* anywhere could bring it back — the flag had to be cleared by hand   */
/* or the persisted value reset. This is that affordance.              */
/*                                                                     */
/* CONTRACT:                                                           */
/*  - a real <button type="button"> (keyboard reachable, focusable),   */
/*    labelled exactly `Live section ▸` with the actionable title      */
/*    `Show the live synced 2D section`;                               */
/*  - `aria-expanded={false}` — the region it discloses, the PiP       */
/*    panel, is collapsed. Deliberately NOT also `aria-pressed`: a     */
/*    show control is a disclosure, not a toggle, and two contradictory */
/*    ARIA states on one control is an a11y defect (PLAN §3.1.1/D9).   */
/*    Once the panel is back this button unmounts, so `aria-expanded`  */
/*    never has to flip to true — the expanded state IS the panel.     */
/*  - `onShow` is a one-way show callback (never a bidirectional       */
/*    `onVisibleChange`), so this component cannot hide anything; the  */
/*    mounting parent passes the very same setter the panel's × calls. */
/*                                                                     */
/* LAYOUT CONTRACT (no canvas shift): styled by `.pip-restore` in      */
/* styles/sectionPip.css with the panel's own positioning tokens       */
/* (`position:absolute; right/bottom: var(--space-3)`), so the parent  */
/* must place it in the SAME positioned containing block as the panel  */
/* (`.viewer3d-root`, `position:relative`) — Viewer3D mounts it as a   */
/* direct sibling of <SectionPiPPanel>. Absolutely positioned chrome   */
/* in a relative container cannot move the R3F canvas, which is an     */
/* absolutely positioned sibling of `.viewer-overlay` in that same     */
/* block, so toggling the panel ⇄ pill cannot cause layout shift.       */
/* ------------------------------------------------------------------ */

export interface SectionPiPRestoreButtonProps {
  /** Called when the user asks for the live section back. One-way. */
  onShow: () => void
}

export function SectionPiPRestoreButton({ onShow }: SectionPiPRestoreButtonProps) {
  return (
    <button
      type="button"
      className="pip-restore"
      title="Show the live synced 2D section"
      aria-expanded={false}
      onClick={onShow}
    >
      Live section ▸
    </button>
  )
}

/**
 * Compatibility note for the retired in-canvas renderer.
 *
 * The default export used to BE that renderer (the component mounted inside
 * Viewer3D's `<Canvas>`). It is gone, and this module deliberately has NO default
 * export any more: a stale `import SectionPiP from './SectionPiP'` fails
 * `npm run check` instead of silently mounting nothing. `Viewer3D` imports only
 * the named pieces above.
 */
