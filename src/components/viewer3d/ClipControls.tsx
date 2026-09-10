/**
 * ClipControls — floating panel over the 3D canvas (plan §1.1 feature 4,
 * plan §5 "Clipping"): sagittal/coronal/transverse sliders over the full
 * canonical ranges, "enable clipping" and "show plane helper" toggles, and a
 * transverse section that names the nearest levels.json level, optionally
 * snaps the slider to plate levels, and jumps to that level's plate with a
 * "Snap to plate" button. Slider drags write store.clip; the scene applies
 * the planes to every material via clipPlanes.applyClipState.
 *
 * v3 section sync (SECTION_SYNC_PLAN §2.1): touching any slider — dragging it
 * or focusing it for keyboard input — pins store.sectionAxis to that slider's
 * axis, so the GPU live-section PiP and the 2D section canvas always follow
 * the last-touched plane. The active axis row carries an "is-active-axis"
 * marker; the PiP's own axis buttons can still override it manually.
 */
import { useMemo } from 'react'
import { levels, platesForLevel, shortLevelName } from '../../data/load'
import { useAtlasStore, type SectionAxis } from '../../state/store'
import { nearestLevelTo, snapClipWrite } from '../section/planeGeometry'
import { CLIP_BOUNDS } from './clipPlanes'

function formatValue(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(value % 1 === 0 ? 0 : 1)}`
}

export default function ClipControls() {
  const clip = useAtlasStore((s) => s.clip)
  const snapToPlate = useAtlasStore((s) => s.snapToPlate)
  const setClip = useAtlasStore((s) => s.setClip)
  const setSnapToPlate = useAtlasStore((s) => s.setSnapToPlate)
  const setPlate = useAtlasStore((s) => s.setPlate)
  // v3 section sync: the live-section surfaces follow the last-touched plane.
  const sectionAxis = useAtlasStore((s) => s.sectionAxis)
  const setSectionAxis = useAtlasStore((s) => s.setSectionAxis)

  /** Pin the live-section axis to this slider's plane (drag or focus). */
  const touchAxis = (axis: SectionAxis) => () => {
    if (useAtlasStore.getState().sectionAxis !== axis) setSectionAxis(axis)
  }

  const nearest = useMemo(() => nearestLevelTo('y', clip.y, levels), [clip.y])
  const nearestLevel = nearest?.level ?? null
  const nearestPlate = useMemo(
    () => (nearestLevel ? (platesForLevel(nearestLevel.id)[0] ?? null) : null),
    [nearestLevel],
  )

  const onTransverseInput = (raw: number) => {
    // ONE snap rule (planeGeometry.snapClipWrite): the transverse plane snaps to
    // the plate level nearest the DRAGGED value — never to the current `clip.y`,
    // or the slider would snap back to the level it starts on — while x and z
    // never snap at all.
    setClip(snapClipWrite('y', raw, snapToPlate, levels))
  }

  const onAxisInput = (axis: SectionAxis, raw: number) => {
    setClip(snapClipWrite(axis, raw, snapToPlate, levels))
  }

  return (
    <section className="viewer-panel" aria-label="Clipping planes">
      <h3>Clipping planes</h3>

      <div className="panel-section">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={clip.enabled}
            onChange={(event) => setClip({ enabled: event.target.checked })}
          />
          Enable clipping
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={clip.showHelper}
            onChange={(event) => setClip({ showHelper: event.target.checked })}
          />
          Show plane helper
        </label>
      </div>

      <div className="panel-section">
        <div className={`slider-row${sectionAxis === 'x' ? ' is-active-axis' : ''}`}>
          <label
            htmlFor="clip-sagittal"
            title="Drag or focus to make the live-section views follow the sagittal plane"
          >
            Sagittal · x
          </label>
          <output htmlFor="clip-sagittal">{formatValue(clip.x)}</output>
          <input
            id="clip-sagittal"
            type="range"
            min={CLIP_BOUNDS.x.min}
            max={CLIP_BOUNDS.x.max}
            step={0.5}
            value={clip.x}
            onPointerDown={touchAxis('x')}
            onFocus={touchAxis('x')}
            onChange={(event) => onAxisInput('x', Number(event.target.value))}
          />
        </div>

        <div className={`slider-row${sectionAxis === 'z' ? ' is-active-axis' : ''}`}>
          <label
            htmlFor="clip-coronal"
            title="Drag or focus to make the live-section views follow the coronal plane"
          >
            Coronal · z
          </label>
          <output htmlFor="clip-coronal">{formatValue(clip.z)}</output>
          <input
            id="clip-coronal"
            type="range"
            min={CLIP_BOUNDS.z.min}
            max={CLIP_BOUNDS.z.max}
            step={0.5}
            value={clip.z}
            onPointerDown={touchAxis('z')}
            onFocus={touchAxis('z')}
            onChange={(event) => onAxisInput('z', Number(event.target.value))}
          />
        </div>

        <div className={`slider-row${sectionAxis === 'y' ? ' is-active-axis' : ''}`}>
          <label
            htmlFor="clip-transverse"
            title="Drag or focus to make the live-section views follow the transverse plane"
          >
            Transverse · y
          </label>
          <output htmlFor="clip-transverse">{formatValue(clip.y)}</output>
          <input
            id="clip-transverse"
            type="range"
            min={CLIP_BOUNDS.y.min}
            max={CLIP_BOUNDS.y.max}
            step={snapToPlate ? 1 : 0.5}
            value={clip.y}
            onPointerDown={touchAxis('y')}
            onFocus={touchAxis('y')}
            onChange={(event) => onTransverseInput(Number(event.target.value))}
          />
        </div>

        <div className="clip-level-note">
          <span className="clip-level-name" title={nearestLevel ? nearestLevel.name : undefined}>
            {nearestLevel ? shortLevelName(nearestLevel.name) : 'no levels loaded'}
          </span>
          <button
            type="button"
            className="btn-snap"
            disabled={nearestPlate === null}
            onClick={() => {
              if (nearestPlate !== null) setPlate(nearestPlate.id)
            }}
            title={
              nearestPlate
                ? `Open ${nearestPlate.id} at y = ${nearestLevel?.y}`
                : nearestLevel
                  ? `${shortLevelName(nearestLevel.name)} has no transverse plate`
                  : undefined
            }
          >
            Snap to plate
          </button>
        </div>

        <label className="toggle-row" title="While on, the transverse slider jumps between plate levels">
          <input
            type="checkbox"
            checked={snapToPlate}
            onChange={(event) => setSnapToPlate(event.target.checked)}
          />
          Snap slider to levels
        </label>
      </div>
    </section>
  )
}
