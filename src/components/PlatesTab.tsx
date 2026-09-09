/**
 * PlatesTab — plan §1.1 features 5 + 6: the 2D cross-section browser.
 * Orientation-filtered picker strip, selected-plate headline (level name +
 * rostro-caudal note), the embedded PlateRenderer, a label toggle, and a
 * "sync plane" indicator comparing the current 3D clip.y with the plate's
 * level (with a snap button). Selecting a plate automatically moves the 3D
 * transverse clipping plane to the plate's level.
 *
 * v3 (SECTION_SYNC_PLAN §2.2 + §2.3): a mode toggle "Author plate | Live
 * section". "Live section" swaps the stage for the SectionCanvas — a 2D
 * cross-section of the actual anatomy meshes at the current clip plane —
 * with a toolbar: axis override (x/y/z); real-image underlay select
 * (none / stain / MRI) with an opacity slider, MRI window sliders
 * (store sectionUnderlay), "open source ↗" link chips for the section's
 * level (getLayerLinks), and the canvas' own verbatim credit line whenever
 * a layer drew. Importing section/imageLayers registers its stain + MRI
 * layers on the SectionCanvas registry (idempotent side effect). The
 * authored-plate UI stays the default and is untouched otherwise.
 */

import { useEffect, useMemo, useState } from 'react'
import type { PlateRecord } from '../types'
import {
  getPlate,
  getPlateLevel,
  levels,
  plates,
  REGION_LABELS,
  shortLevelName,
} from '../data/load'
import { useAtlasStore, type SectionAxis, type SectionUnderlayKind } from '../state/store'
import PlateRenderer from './PlateRenderer'
import SectionCanvas from './section/SectionCanvas'
// Module side effect: registers the 'stain' + 'mri' image layers on the
// section-canvas registry (plan §4); getLayerLinks feeds the source chips.
import { getLayerLinks, mriLayerStatus } from './section/imageLayers'

type OrientationFilter = 'all' | PlateRecord['orientation']
type SectionMode = 'author' | 'live'

const FILTERS: { id: OrientationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'transverse', label: 'Transverse' },
  { id: 'sagittal', label: 'Sagittal' },
  { id: 'coronal', label: 'Coronal' },
]

const SECTION_AXES: { id: SectionAxis; label: string }[] = [
  { id: 'y', label: 'y · transverse' },
  { id: 'x', label: 'x · sagittal' },
  { id: 'z', label: 'z · coronal' },
]

const UNDERLAY_KINDS: { id: SectionUnderlayKind; label: string }[] = [
  { id: 'none', label: 'No imagery' },
  { id: 'stain', label: 'Stain' },
  { id: 'mri', label: 'MRI' },
]

/** Stain-mapping window in au (§2.3) — mirrors SectionCanvas LEVEL_MAP_WINDOW. */
const STAIN_LEVEL_WINDOW = 1.5

/**
 * Nearest levels.json anchor within the stain-mapping window of the current
 * transverse plane, else null — the same levelId the canvas hands its image
 * layers, so the toolbar's source chips name the sources actually mapped
 * under the section.
 */
function toolbarLevelId(axis: SectionAxis, y: number): string | null {
  if (axis !== 'y') return null
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const level of levels) {
    const distance = Math.abs(level.y - y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = level.id
    }
  }
  return best !== null && bestDistance <= STAIN_LEVEL_WINDOW ? best : null
}

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
  const sectionAxis = useAtlasStore((s) => s.sectionAxis)
  const setSectionAxis = useAtlasStore((s) => s.setSectionAxis)
  const sectionUnderlay = useAtlasStore((s) => s.sectionUnderlay)
  const setSectionUnderlay = useAtlasStore((s) => s.setSectionUnderlay)
  const [filter, setFilter] = useState<OrientationFilter>('all')
  const [mode, setMode] = useState<SectionMode>('author')

  // Live-section toolbar data: MRI layer availability (the baked grid) and
  // the source-link chips for the level under the current plane (§2.3).
  const mriAvailable = useMemo(() => mriLayerStatus() === 'available', [])
  const stainLevelId = toolbarLevelId(sectionAxis, clip.y)
  const layerLinks = useMemo(() => getLayerLinks(stainLevelId), [stainLevelId])

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
        <div className="section-mode-toggle" role="group" aria-label="Plates view mode">
          <button
            type="button"
            className={`btn${mode === 'author' ? ' is-active' : ''}`}
            aria-pressed={mode === 'author'}
            onClick={() => setMode('author')}
          >
            Author plate
          </button>
          <button
            type="button"
            className={`btn${mode === 'live' ? ' is-active' : ''}`}
            aria-pressed={mode === 'live'}
            onClick={() => setMode('live')}
          >
            Live section
          </button>
        </div>

        {mode === 'author' && (
          <>
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
          </>
        )}
      </div>

      {mode === 'author' ? (
        <>
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
        </>
      ) : (
        <>
          <div className="section-toolbar">
            <div className="section-toolbar-group" role="group" aria-label="Section axis">
              <span className="section-toolbar-label">Axis</span>
              {SECTION_AXES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`btn${sectionAxis === option.id ? ' is-active' : ''}`}
                  aria-pressed={sectionAxis === option.id}
                  onClick={() => setSectionAxis(option.id)}
                  title={`Section along ${option.id} (${
                    option.id === 'y' ? 'transverse' : option.id === 'x' ? 'sagittal' : 'coronal'
                  }) — uses the same ${option.id} clip slider`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="section-toolbar-group" role="group" aria-label="Real-image underlay">
              <span className="section-toolbar-label">Imagery</span>
              {UNDERLAY_KINDS.map((option) => {
                const mriDisabled = option.id === 'mri' && !mriAvailable
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`btn${sectionUnderlay.kind === option.id ? ' is-active' : ''}`}
                    aria-pressed={sectionUnderlay.kind === option.id}
                    disabled={mriDisabled}
                    title={
                      mriDisabled
                        ? 'MRI grid unavailable — re-bake with: node scripts/build-mri-grid.mjs'
                        : option.id === 'stain'
                          ? 'Real stained micrograph underlay on levels that map one (±1.5 au)'
                          : option.id === 'mri'
                            ? 'Real T1 MRI underlay at every plane position'
                            : 'Simulated section only'
                    }
                    onClick={() => setSectionUnderlay({ kind: option.id })}
                  >
                    {option.label}
                  </button>
                )
              })}
              {sectionUnderlay.kind !== 'none' && (
                <label className="section-opacity-slider">
                  Opacity
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={sectionUnderlay.opacity}
                    onChange={(event) => setSectionUnderlay({ opacity: Number(event.target.value) })}
                  />
                  <output>{Math.round(sectionUnderlay.opacity * 100)}%</output>
                </label>
              )}
              {sectionUnderlay.kind === 'mri' && (
                <>
                  <label className="section-opacity-slider">
                    Window low
                    <input
                      type="range"
                      min={0}
                      max={255}
                      step={1}
                      value={Math.min(sectionUnderlay.windowMin, sectionUnderlay.windowMax - 1)}
                      onChange={(event) =>
                        setSectionUnderlay({
                          windowMin: Math.min(Number(event.target.value), sectionUnderlay.windowMax - 1),
                        })
                      }
                    />
                    <output>{sectionUnderlay.windowMin}</output>
                  </label>
                  <label className="section-opacity-slider">
                    Window high
                    <input
                      type="range"
                      min={0}
                      max={255}
                      step={1}
                      value={Math.max(sectionUnderlay.windowMax, sectionUnderlay.windowMin + 1)}
                      onChange={(event) =>
                        setSectionUnderlay({
                          windowMax: Math.max(Number(event.target.value), sectionUnderlay.windowMin + 1),
                        })
                      }
                    />
                    <output>{sectionUnderlay.windowMax}</output>
                  </label>
                </>
              )}
            </div>
            <div className="section-toolbar-group section-link-chips" aria-label="Imaging sources">
              <span className="section-toolbar-label">Sources</span>
              {layerLinks.map((link) => (
                <a
                  key={`${link.label} ${link.url}`}
                  className="section-link-chip"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`Open source in a new tab: ${link.url}`}
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
          <div className="section-live-stage">
            <SectionCanvas />
          </div>
        </>
      )}
    </section>
  )
}
