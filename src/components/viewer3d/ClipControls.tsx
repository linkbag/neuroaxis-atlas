/**
 * ClipControls — floating panel over the 3D canvas (plan §1.1 feature 4,
 * plan §5 "Clipping"): sagittal/coronal/transverse sliders over the full
 * canonical ranges, "enable clipping" and "show plane helper" toggles, and a
 * transverse section that names the nearest levels.json level, optionally
 * snaps the slider to plate levels, and jumps to that level's plate with a
 * "Snap to plate" button. Slider drags write store.clip; the scene applies
 * the planes to every material via clipPlanes.applyClipState.
 */
import { useMemo } from 'react'
import type { LevelAnchor } from '../../data/load'
import { levels, platesForLevel, shortLevelName } from '../../data/load'
import { useAtlasStore } from '../../state/store'
import { CLIP_BOUNDS } from './clipPlanes'

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

function formatValue(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(value % 1 === 0 ? 0 : 1)}`
}

export default function ClipControls() {
  const clip = useAtlasStore((s) => s.clip)
  const snapToPlate = useAtlasStore((s) => s.snapToPlate)
  const setClip = useAtlasStore((s) => s.setClip)
  const setSnapToPlate = useAtlasStore((s) => s.setSnapToPlate)
  const setPlate = useAtlasStore((s) => s.setPlate)

  const nearestLevel = useMemo(() => nearestLevelTo(clip.y), [clip.y])
  const nearestPlate = useMemo(
    () => (nearestLevel ? (platesForLevel(nearestLevel.id)[0] ?? null) : null),
    [nearestLevel],
  )

  const onTransverseInput = (raw: number) => {
    if (snapToPlate && nearestLevel !== null) {
      setClip({ y: nearestLevel.y })
      return
    }
    setClip({ y: raw })
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
        <div className="slider-row">
          <label htmlFor="clip-sagittal">Sagittal · x</label>
          <output htmlFor="clip-sagittal">{formatValue(clip.x)}</output>
          <input
            id="clip-sagittal"
            type="range"
            min={CLIP_BOUNDS.x.min}
            max={CLIP_BOUNDS.x.max}
            step={0.5}
            value={clip.x}
            onChange={(event) => setClip({ x: Number(event.target.value) })}
          />
        </div>

        <div className="slider-row">
          <label htmlFor="clip-coronal">Coronal · z</label>
          <output htmlFor="clip-coronal">{formatValue(clip.z)}</output>
          <input
            id="clip-coronal"
            type="range"
            min={CLIP_BOUNDS.z.min}
            max={CLIP_BOUNDS.z.max}
            step={0.5}
            value={clip.z}
            onChange={(event) => setClip({ z: Number(event.target.value) })}
          />
        </div>

        <div className="slider-row">
          <label htmlFor="clip-transverse">Transverse · y</label>
          <output htmlFor="clip-transverse">{formatValue(clip.y)}</output>
          <input
            id="clip-transverse"
            type="range"
            min={CLIP_BOUNDS.y.min}
            max={CLIP_BOUNDS.y.max}
            step={snapToPlate ? 1 : 0.5}
            value={clip.y}
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
