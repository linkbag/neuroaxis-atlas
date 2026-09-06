/**
 * PlatesTab — plan §1.1 features 5 + 6: the 2D cross-section browser.
 * Orientation-filtered picker strip, selected-plate headline (level name +
 * rostro-caudal note), the embedded PlateRenderer, a label toggle, and a
 * "sync plane" indicator comparing the current 3D clip.y with the plate's
 * level (with a snap button). Selecting a plate automatically moves the 3D
 * transverse clipping plane to the plate's level.
 */

import { useEffect, useState } from 'react'
import type { PlateRecord } from '../types'
import {
  getPlate,
  getPlateLevel,
  levels,
  plates,
  REGION_LABELS,
  shortLevelName,
} from '../data/load'
import { useAtlasStore } from '../state/store'
import PlateRenderer from './PlateRenderer'

type OrientationFilter = 'all' | PlateRecord['orientation']

const FILTERS: { id: OrientationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'transverse', label: 'Transverse' },
  { id: 'sagittal', label: 'Sagittal' },
  { id: 'coronal', label: 'Coronal' },
]

function rostroCaudalNote(plate: PlateRecord): string {
  const level = getPlateLevel(plate)
  if (level === undefined) {
    return plate.orientation === 'sagittal'
      ? 'midline profile — anterior left, superior top'
      : 'coronal slice — patient left on image right, superior top'
  }
  const position = `y = ${level.y} au`
  const index = levels.findIndex((l) => l.id === level.id)
  if (index < 0) return position
  const rostral = index > 0 ? levels[index - 1] : undefined
  const caudal = index < levels.length - 1 ? levels[index + 1] : undefined
  if (rostral !== undefined && caudal !== undefined) {
    return `${position} · between “${shortLevelName(rostral.name)}” (rostral) and “${shortLevelName(caudal.name)}” (caudal)`
  }
  if (rostral === undefined) return `${position} · most rostral tabulated level`
  return `${position} · most caudal tabulated level`
}

export default function PlatesTab() {
  const plateId = useAtlasStore((s) => s.plateId)
  const setPlate = useAtlasStore((s) => s.setPlate)
  const clip = useAtlasStore((s) => s.clip)
  const setClip = useAtlasStore((s) => s.setClip)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)
  const setLabelVisibility = useAtlasStore((s) => s.setLabelVisibility)
  const [filter, setFilter] = useState<OrientationFilter>('all')

  const visiblePlates = filter === 'all' ? plates : plates.filter((p) => p.orientation === filter)
  const plate = getPlate(plateId)
  const level = plate !== undefined ? getPlateLevel(plate) : undefined
  const inSync = level !== undefined && Math.abs(clip.y - level.y) < 0.01

  // First visit with landed data: open the first plate in display order.
  useEffect(() => {
    if (plateId === null && plates.length > 0) setPlate(plates[0].id)
  }, [plateId, setPlate])

  if (plates.length === 0) {
    return (
      <section className="plates-tab">
        <p className="empty-note">
          No plate manifests have landed yet — the 12 cross-section plates appear here
          automatically as the plates-* tasks deliver src/data/plates-*.json + SVG files.
        </p>
      </section>
    )
  }

  return (
    <section className="plates-tab">
      <div className="plates-toolbar">
        <div className="plate-filter" role="group" aria-label="Orientation filter">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`btn${filter === option.id ? ' is-active' : ''}`}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="plate-toolbar-right">
          {level !== undefined && (
            <div className={`sync-pill${inSync ? ' is-synced' : ' is-off'}`}>
              <span className="dot" aria-hidden="true" />
              <span>
                {inSync
                  ? `3D clip plane synced (y = ${clip.y} au)`
                  : `3D clip plane at y = ${clip.y} au · plate level ${level.y} au`}
              </span>
              {!inSync && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setClip({ y: level.y })}
                  title="Move the 3D transverse clipping plane to this plate's level"
                >
                  Snap
                </button>
              )}
              {!clip.enabled && <span className="hint">plane hidden — enable it in the 3D controls</span>}
            </div>
          )}
          <label className="label-toggle">
            <input
              type="checkbox"
              checked={labelVisibility}
              onChange={(event) => setLabelVisibility(event.target.checked)}
            />
            Labels
          </label>
        </div>
      </div>

      <div className="plate-strip" aria-label="Plate picker">
        {visiblePlates.map((entry) => {
          const entryLevel = getPlateLevel(entry)
          const active = plate?.id === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              className={`plate-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => setPlate(entry.id)}
            >
              <span className="plate-chip-title">{entry.title}</span>
              <span className="plate-chip-sub">
                {entry.orientation}
                {entryLevel ? ` · y = ${entryLevel.y}` : ''}
              </span>
            </button>
          )
        })}
        {visiblePlates.length === 0 && (
          <span className="empty-note">No {filter} plates in the manifests yet.</span>
        )}
      </div>

      {plate !== undefined ? (
        <>
          <div className="plate-headline">
            <h2>{plate.title}</h2>
            <p className="meta">
              {REGION_LABELS[plate.region]} · {plate.orientation}
              {level !== undefined ? ` · ${level.name}` : ''} · {rostroCaudalNote(plate)}
            </p>
          </div>
          <div className="plate-stage">
            <PlateRenderer key={plate.id} plate={plate} />
          </div>
        </>
      ) : (
        <p className="empty-note">Select a plate from the strip above.</p>
      )}
    </section>
  )
}
