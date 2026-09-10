/**
 * SectionSliderBar — v5 UX fix (docs/UX_FIXES_PLAN.md Feature 2): the plane
 * sliders that belong to the LIVE SECTION itself, mounted in the Plates tab's
 * live-section toolbar right next to the axis/modality group.
 *
 * Before this strip existed the Plates tab could only click level chips and the
 * axis buttons; the only continuous plane scrubber lived in the 3D tab's
 * CLIPPING PLANES dock (viewer3d/ClipControls.tsx). This component is that dock's
 * section-side twin and deliberately reuses its semantics rather than inventing
 * a second mechanism:
 *
 *   • ranges come from CLIP_BOUNDS (viewer3d/clipPlanes.ts — REALISM_PLAN §3
 *     AMENDMENT A: x ∈ [−48, 48], z ∈ [−56, 26], y ∈ [−55, 45]), never retyped;
 *   • step 0.5, except transverse = `snapToPlate ? 1 : 0.5` (ClipControls:150);
 *   • writes go to the ONE store slice every surface already consumes,
 *     `useAtlasStore.setClip` → `SectionCanvas` repaints through its own
 *     `subscribe → scheduleDraw` and `ClipSync` keeps moving the shared 3D
 *     planes. This file adds NO subscription, timer, ref or sync path;
 *   • "Snap to levels" is the SAME `snapToPlate` flag + action the dock binds
 *     (store.ts `setSnapToPlate`), and the transverse write reproduces
 *     ClipControls' `onTransverseInput` exactly: nearest level to the DRAGGED
 *     value, x/z never snap;
 *   • touching a slider (drag or keyboard focus) pins `sectionAxis`, the app's
 *     documented v3 rule "the live-section surfaces follow the last-touched
 *     plane" (ClipControls.touchAxis) — so the row that lights up is always the
 *     plane the canvas is actually cutting;
 *   • emphasis reuses viewer.css's `.slider-row.is-active-axis` (accent label +
 *     "● live" marker); only the range-input layout and the strip's own wrapping
 *     are added in plates.css, because viewer.css scopes that rule to
 *     `.viewer-panel`.
 *
 * Consistency with the canvas' click-to-set gesture (SectionCanvas handleClick):
 * a click writes the OTHER two axes and pins `sectionAxis`; this strip reads and
 * writes exactly the same `clip.x|y|z` + `sectionAxis`, so slider and crosshair
 * can never disagree — no glue code, no double source of truth.
 */
import type { LevelAnchor } from '../../data/load'
import { levels } from '../../data/load'
import { useAtlasStore, type SectionAxis } from '../../state/store'
import { CLIP_BOUNDS } from '../viewer3d/clipPlanes'

/**
 * Nearest plate level to a transverse position, identical to ClipControls'
 * helper of the same name: distance is measured to the value being dragged,
 * never to the current `clip.y` (a snap against the current value would pin the
 * slider to the level it started on).
 */
function nearestLevelTo(y: number): LevelAnchor | null {
  let best: LevelAnchor | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const level of levels) {
    const distance = Math.abs(level.y - y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = level
    }
  }
  return best
}

/**
 * Plane readout, matching the spec's literal `−42.0 au` style: one decimal,
 * typographic minus U+2212 and an explicit `+` for positives. (ClipControls'
 * own `formatValue` prints ASCII minus and drops the decimal on integers; the
 * spec's example is the later, more precise form — see PLAN §6 D2.)
 */
export function formatSliderValue(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1).replace('-', '−')} au`
}

interface SliderSpec {
  axis: SectionAxis
  /** Visible row label; the aria-label prefixes it with the plane word. */
  label: string
  id: string
}

/**
 * Row order and label text mirror ClipControls, so one selector vocabulary
 * ("Sagittal · x", "Transverse · y") works across both docks. `aria-label`
 * starts with the visible label text but names the axis unambiguously without
 * the middot, so lookups by "Sagittal plane position" resolve too.
 */
const SLIDERS: readonly SliderSpec[] = [
  { axis: 'x', label: 'Sagittal · x', id: 'section-slider-sagittal' },
  { axis: 'z', label: 'Coronal · z', id: 'section-slider-coronal' },
  { axis: 'y', label: 'Transverse · y', id: 'section-slider-transverse' },
]

export default function SectionSliderBar() {
  const clip = useAtlasStore((s) => s.clip)
  const setClip = useAtlasStore((s) => s.setClip)
  const snapToPlate = useAtlasStore((s) => s.snapToPlate)
  const setSnapToPlate = useAtlasStore((s) => s.setSnapToPlate)
  // v3 section sync: the live-section surfaces follow the last-touched plane.
  const sectionAxis = useAtlasStore((s) => s.sectionAxis)
  const setSectionAxis = useAtlasStore((s) => s.setSectionAxis)

  /** Pin the live-section axis to this slider's plane (drag or keyboard focus). */
  const touchAxis = (axis: SectionAxis) => () => {
    if (useAtlasStore.getState().sectionAxis !== axis) setSectionAxis(axis)
  }

  const onAxisInput = (axis: SectionAxis, raw: number) => {
    // Only the transverse plane has levels to snap to, exactly as in the 3D
    // dock; x and z always move continuously.
    if (axis === 'y' && snapToPlate) {
      const level = nearestLevelTo(raw)
      setClip({ y: level !== null ? level.y : raw })
      return
    }
    setClip({ [axis]: raw })
  }

  return (
    <div
      className="section-plane-sliders"
      role="group"
      aria-label="Live section plane position"
    >
      {SLIDERS.map((slider) => {
        const value = clip[slider.axis]
        const isActive = sectionAxis === slider.axis
        return (
          <div
            key={slider.axis}
            className={`slider-row section-slider${isActive ? ' is-active-axis' : ''}`}
          >
            <label
              htmlFor={slider.id}
              title="Drag or focus to make the live-section views follow this plane"
            >
              {slider.label}
            </label>
            <output htmlFor={slider.id}>{formatSliderValue(value)}</output>
            <input
              id={slider.id}
              type="range"
              min={CLIP_BOUNDS[slider.axis].min}
              max={CLIP_BOUNDS[slider.axis].max}
              // The transverse slider quantises to plate levels while snapping
              // is on — same step rule as ClipControls, so the thumb can only
              // land where the write path is allowed to land.
              step={slider.axis === 'y' && snapToPlate ? 1 : 0.5}
              value={value}
              aria-label={`${slider.label} plane position (atlas units)`}
              onPointerDown={touchAxis(slider.axis)}
              onFocus={touchAxis(slider.axis)}
              onChange={(event) => onAxisInput(slider.axis, Number(event.target.value))}
            />
          </div>
        )
      })}

      <label
        className="toggle-row section-slider-snap"
        title="While on, the transverse slider jumps between the plate levels (the same setting as the 3D clipping dock)"
      >
        <input
          type="checkbox"
          checked={snapToPlate}
          onChange={(event) => setSnapToPlate(event.target.checked)}
        />
        Snap to levels
      </label>
    </div>
  )
}

export { SectionSliderBar }
