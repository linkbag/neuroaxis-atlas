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
 * cross-section of the actual anatomy meshes at the current clip plane — with
 * a toolbar: axis override (x/y/z); real-image underlay select with an opacity
 * slider; the MRI window sliders (store sectionUnderlay); "open source ↗" link
 * chips for the section's level (getLayerLinks); and the canvas' own verbatim
 * credit line whenever a layer drew. Importing section/imageLayers registers
 * its stain + MRI layers on the SectionCanvas registry (idempotent side
 * effect). The authored-plate UI stays the default and is untouched otherwise.
 *
 * ── v4 modality toolbar (IMAGING_V4_PLAN §4 + §6, task `integration-v4`) ────
 * The imagery group is now the REAL-FIRST MODALITY SWITCHER, driven by the
 * store's single `sectionUnderlay` request:
 *
 *   • `SECTION_UNDERLAY_KINDS` (Auto / MRI / CT / Photo / Simulated only) — the
 *     option list and labels come from the store, so the toolbar can never
 *     drift from what the layers actually implement. There is no separate
 *     "real-first" mode: **Auto IS the real-first default** (kind 'auto' = pick
 *     the best real modality at this plane, anchored photo → CT → MRI → none),
 *     and the explicit per-modality buttons sit beside it. The "simulated only"
 *     option was renamed from "No imagery" to its v4 label.
 *   • opacity slider — always shown (the real image is the section's BASE plate
 *     in real-first mode, so its alpha matters in every mode).
 *   • CT window preset select (brain / bone) — rendered from the manifest's own
 *     `windows` keys (imageLayers.ctWindowPresets()), and only while CT is the
 *     request; the CT grid is baked in HU, so the MRI uint8 window sliders are
 *     meaningless for it (see imageLayers.ctWindowForDraw).
 *   • the real-first compositing note + the always-visible credit + the
 *     "open source ↗" chips, which now also include the ACTIVE modality's own
 *     source page first (mri → OpenNeuro dataset, ct → NLM VHP landing page,
 *     stain → the mapped plate's page), on top of getLayerLinks()'s reference
 *     atlases. Harvard / BrainMaps stay link-out only, never embedded.
 *
 * HONESTY (plan §6: "no real data at this plane" states are honest): a
 * modality button is disabled exactly when the build cannot serve that modality
 * ANYWHERE along the current axis (`modalityUnavailableReason`, pure and
 * exported for QA), with the reason in its tooltip/title — e.g. "no embeddable
 * CT grid in this build — re-bake with: node scripts/build-ct-grid.mjs". A
 * merely empty plane inside a covered modality is NOT disabled: it is a normal
 * state the canvas explains in its own hint line. Photo is only disabled for
 * an axis that has no anchored photograph at all; on transverse the v3
 * level-mapped micrographs keep it live at every level.
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
import {
  CT_WINDOW_PRESETS,
  CT_WINDOW_PRESET_LABELS,
  SECTION_UNDERLAY_KIND_LABELS,
  SECTION_UNDERLAY_KINDS,
  useAtlasStore,
  type SectionAxis,
  type SectionUnderlayKind,
} from '../state/store'
import { sectionImagesForAxis, type SectionImage } from '../data/sectionImages'
// Static imports (Vite inlines the JSON): the toolbar's active-modality credit
// line is built from the SAME manifest fields imageLayers renders in-canvas, so
// the two can never disagree about what is being shown.
import mriManifestJson from '../assets/imaging/mri-manifest.json'
import ctManifestJson from '../assets/imaging/ct-manifest.json'
import PlateRenderer from './PlateRenderer'
import SectionCanvas from './section/SectionCanvas'
import SectionErrorBoundary from './section/SectionErrorBoundary'
// v5 (UX_FIXES_PLAN Feature 2): the plane sliders of the live section itself —
// same store slice (clip{x,y,z} + sectionAxis + snapToPlate) as the 3D dock.
import SectionSliderBar from './section/SectionSliderBar'
// The ONE photograph-selection rule + the anchor tolerance (planeGeometry),
// so the toolbar names exactly the plate the canvas and the PiP paint.
import { pickImageForPlane } from './section/planeGeometry'
// Module side effect: registers the 'stain' + 'mri' + 'ct' image layers on the
// section-canvas registry (plan §4); getLayerLinks feeds the source chips,
// ctWindowPresets() the CT window options and ctLayerStatus()/mriLayerStatus()
// the honest availability states.
import {
  ctLayerStatus,
  ctWindowPresets,
  getCtDataStatus,
  getLayerLinks,
  getMriDataStatus,
  mriLayerStatus,
  MODALITY_TOLERANCE_AU,
} from './section/imageLayers'

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

/** Section-plane kind of a section axis (mirrors imageLayers.sectionAxisOf). */
const AXIS_SECTION_KIND: Record<SectionAxis, SectionImage['axis']> = {
  y: 'transverse',
  x: 'sagittal',
  z: 'coronal',
}

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

/**
 * Per-button on-hover explanation of what the modality paints and where its
 * data comes from — shown in EVERY state, so a disabled button's reason reads
 * as the continuation of the same sentence rather than a bare error.
 */
const MODALITY_TITLES: Record<SectionUnderlayKind, string> = {
  auto:
    'Real-first (v4 default): draw the best real modality that actually covers this plane — ' +
    'an anchored photograph (±1.5 au) → else CT → else MRI — and fall back to the simulated ' +
    'section, with an honest hint, when nothing covers it',
  mri: 'Real T1w MRI (OpenNeuro ds007313, CC0) at every plane position on all three axes',
  ct: 'Real head CT volume (NLM Visible Human Project) at every plane position, with brain / bone window presets',
  stain:
    'Real photographs only: plane-anchored UBC plates (±1.5 au) and the v3 level-mapped micrographs on transverse planes',
  none: 'Simulated only — no real imagery is drawn, at any plane',
}

/** Live data-availability of the two continuous grids (read reactively). */
interface ModalityStatus {
  mri: boolean
  ct: boolean
}

/**
 * The embedded photographs per section axis, resolved ONCE from the static
 * manifest (sectionImages.ts is a .ts module of literals — nothing here can
 * change at runtime), so the toolbar's availability text and its credit lookup
 * are a short array walk instead of a re-filter on every plane tick.
 */
const IMAGES_BY_AXIS: Record<SectionAxis, SectionImage[]> = {
  y: sectionImagesForAxis('transverse'),
  x: sectionImagesForAxis('sagittal'),
  z: sectionImagesForAxis('coronal'),
}

/**
 * Why a modality cannot be served for this section axis, or null when it can.
 * Pure + exported for QA. "Cannot be served" means the BUILD has no data for it
 * on this axis — never merely "this particular plane is empty inside a covered
 * modality", which stays selectable and is explained by the canvas hint.
 */
export function modalityUnavailableReason(
  kind: SectionUnderlayKind,
  axis: SectionAxis,
  status: ModalityStatus,
): string | null {
  if (kind === 'none') return null
  if (kind === 'mri') {
    if (status.mri) return null
    if (mriLayerStatus() === 'available') {
      return 'unavailable right now — the MRI grid is still loading or its fetch failed; the section canvas reports the live state'
    }
    return 'no embeddable MRI grid in this build — re-bake with: node scripts/build-mri-grid.mjs'
  }
  if (kind === 'ct') {
    if (status.ct) return null
    if (ctLayerStatus() === 'available') {
      return 'unavailable right now — the CT grid is still loading or its fetch failed; the section canvas reports the live state'
    }
    return 'no embeddable CT grid in this build — re-bake with: node scripts/build-ct-grid.mjs (or choose MRI / Photo)'
  }
  if (kind === 'stain') {
    if (IMAGES_BY_AXIS[axis].length > 0) return null
    return axis === 'y'
      ? 'no photographed section is mapped to this build'
      : `no ${AXIS_SECTION_KIND[axis]} photograph is anchored in this build — switch to the transverse axis for the level-mapped micrographs`
  }
  if (!status.mri && !status.ct && IMAGES_BY_AXIS[axis].length === 0) {
    return 'no real modality covers this axis in this build — showing the simulated section'
  }
  return null
}

/**
 * Verbatim credit of the two continuous grids, assembled exactly the way
 * imageLayers does it (its `CT_CREDIT` / `MRI_CREDIT` are module-private):
 * the CT manifest's own `credit` field first, else its `attribution`, else
 * source + licence; the MRI keeps the 'OpenNeuro' provenance step. Both
 * strings are shown verbatim in the canvas bottom-left as well. The CT
 * manifest's `source` is a provenance OBJECT (accession/landingPage/credit),
 * hence the `unknown` hop before the structural read.
 */
function gridCredits(): {
  ct: { credit: string; sourceUrl?: string }
  mri: { credit: string; sourceUrl?: string }
} {
  const ctManifest = ctManifestJson as unknown as {
    credit?: string
    attribution?: string
    source?: unknown
    license?: string
  }
  const mriManifest = mriManifestJson as unknown as { source?: string; license?: string }
  const ctCredit =
    (typeof ctManifest.credit === 'string' && ctManifest.credit.length > 0 && ctManifest.credit) ||
    (typeof ctManifest.attribution === 'string' && ctManifest.attribution.length > 0 && ctManifest.attribution) ||
    `${typeof ctManifest.source === 'string' ? ctManifest.source : 'Visible Human Project CT'}, ${
      ctManifest.license ?? 'see docs/ATTRIBUTION.md'
    }`
  const mriCredit = `${mriManifest.source ?? 'OpenNeuro ds007313'}, OpenNeuro ${mriManifest.license ?? 'CC0'}`
  return {
    ct: { credit: ctCredit, sourceUrl: 'https://www.nlm.nih.gov/research/visible/getting_data.html' },
    mri: {
      credit: mriCredit,
      sourceUrl: 'https://openneuro.org/datasets/ds007313/versions/1.0.0',
    },
  }
}

const GRID_CREDITS = gridCredits()

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
  // The two grid fetches settle asynchronously and their state is not in the
  // store (imageLayers owns it), so the toolbar re-renders on a 1 s tick while
  // it is mounted: a button disabled as "still loading" enables itself as soon
  // as the volume lands. Cheap, and it stops as soon as the grid is ready.
  const [gridTick, setGridTick] = useState(0)

  const mriInstalled = mriLayerStatus() === 'available'
  const ctInstalled = ctLayerStatus() === 'available'
  const gridStatus: ModalityStatus = useMemo(
    () => ({ mri: mriInstalled, ct: ctInstalled }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mriInstalled, ctInstalled, gridTick],
  )
  const mriLoading = mriInstalled && getMriDataStatus() !== 'ready' && getMriDataStatus() !== 'failed'
  const ctLoading = ctInstalled && getCtDataStatus() !== 'ready' && getCtDataStatus() !== 'failed'

  useEffect(() => {
    if (!mriLoading && !ctLoading) return
    const timer = window.setInterval(() => setGridTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [mriLoading, ctLoading])

  // Live-section toolbar data: the source-link chips for the level under the
  // plane (§2.3), plus the active modality's own provenance.
  const stainLevelId = toolbarLevelId(sectionAxis, clip.y)
  const planeValue = clip[sectionAxis]
  const layerLinks = useMemo(() => getLayerLinks(stainLevelId), [stainLevelId])
  // The photograph the CANVAS would show at this plane: `pickImageForPlane` is
  // the ONE anchor-within-tolerance rule (with the v3 transverse level
  // fallback) that the layer registry and the PiP sampler also use, so this
  // toolbar can never name a different plate than the one that is painted.
  // Credit/link only — no drawing here.
  const photo = useMemo(
    () =>
      pickImageForPlane<SectionImage>(IMAGES_BY_AXIS[sectionAxis], sectionAxis, planeValue, MODALITY_TOLERANCE_AU, {
        levelId: sectionAxis === 'y' ? stainLevelId : null,
      })?.image,
    [sectionAxis, planeValue, stainLevelId],
  )
  /** Every CT window preset name the manifest bakes, in store display order. */
  const ctPresets = useMemo(() => {
    const available = new Set(ctWindowPresets())
    return CT_WINDOW_PRESETS.filter((preset) => available.has(preset))
  }, [])

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

  /**
   * The imagery the current request resolves to at THIS plane, as the canvas
   * will draw it, with its verbatim credit + source page. The two CT / MRI
   * grid credits come from imageLayers (the manifest's own `credit` field) and
   * the photograph entry from sectionImages.ts — so what the toolbar shows is
   * byte-identical to the line the canvas renders bottom-left.
   */
  const ctCredit = GRID_CREDITS.ct
  const activeCredit =
    sectionUnderlay.kind === 'ct'
      ? ctCredit
      : sectionUnderlay.kind === 'mri'
        ? GRID_CREDITS.mri
        : sectionUnderlay.kind === 'stain'
          ? photo !== undefined
            ? { credit: photo.credit, sourceUrl: photo.sourceUrl }
            : null
          : sectionUnderlay.kind === 'auto'
            ? photo !== undefined
              ? { credit: photo.credit, sourceUrl: photo.sourceUrl }
              : ctInstalled
                ? ctCredit
                : mriInstalled
                  ? GRID_CREDITS.mri
                  : null
            : null
  // The active modality's own page first, then the reference atlases.
  const sourceChips =
    activeCredit?.sourceUrl !== undefined
      ? [
          { label: 'Active imagery ↗', url: activeCredit.sourceUrl },
          ...layerLinks.filter((link) => link.url !== activeCredit.sourceUrl),
        ]
      : layerLinks

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
                {/* P0 (QUALITY_PLAN §1 item 2): the AUTHOR mode is a major
                    surface of its own — a throw while rendering a plate used to
                    blank the whole app, because the only boundary sat around
                    the live-section canvas in the OTHER mode. `key={plate.id}`
                    re-mounts the boundary per plate (same contract as the
                    renderer it wraps), so a failure on one plate does not
                    persist into the next one. */}
                <SectionErrorBoundary key={plate.id} name="Plate viewer">
                  <PlateRenderer plate={plate} />
                </SectionErrorBoundary>
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

            {/* v5 (UX_FIXES_PLAN Feature 2): continuous plane scrubbers for the
                live section, one row per axis, directly under the axis/modality
                controls they act on. Full toolbar row (flex-basis:100%) so the
                strip reads as one unit with them and wraps on narrow widths.
                Live mode only — the author-plate branch above is untouched. */}
            <SectionSliderBar />

            <div className="section-toolbar-group" role="group" aria-label="Imagery modality">
              <span className="section-toolbar-label">Imagery</span>
              {SECTION_UNDERLAY_KINDS.map((kind) => {
                const reason = modalityUnavailableReason(kind, sectionAxis, gridStatus)
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`btn${sectionUnderlay.kind === kind ? ' is-active' : ''}`}
                    aria-pressed={sectionUnderlay.kind === kind}
                    disabled={reason !== null}
                    title={reason !== null ? `${MODALITY_TITLES[kind]} — ${reason}` : MODALITY_TITLES[kind]}
                    onClick={() => setSectionUnderlay({ kind })}
                  >
                    {SECTION_UNDERLAY_KIND_LABELS[kind]}
                  </button>
                )
              })}

              <label className="section-opacity-slider">
                Opacity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sectionUnderlay.opacity}
                  onChange={(event) => setSectionUnderlay({ opacity: Number(event.target.value) })}
                  title="Alpha of the real image. In real-first mode (Auto) it is the section's base plate, not an underlay."
                />
                <output>{Math.round(sectionUnderlay.opacity * 100)}%</output>
              </label>
            </div>

            {(sectionUnderlay.kind === 'ct' || sectionUnderlay.kind === 'auto') && (
              <div className="section-toolbar-group" role="group" aria-label="CT window preset">
                <span className="section-toolbar-label">CT window</span>
                {ctPresets.length > 0 ? (
                  <select
                    className="section-select"
                    value={sectionUnderlay.ctWindowPreset}
                    disabled={!ctInstalled}
                    title={
                      ctInstalled
                        ? 'Display window for the CT modality (Hounsfield units, from ct-manifest.json) — ignored while MRI or a photograph is drawn'
                        : 'CT window presets need the CT grid: no embeddable CT volume in this build'
                    }
                    onChange={(event) =>
                      setSectionUnderlay({
                        ctWindowPreset: event.target.value as (typeof CT_WINDOW_PRESETS)[number],
                      })
                    }
                  >
                    {ctPresets.map((preset) => (
                      <option key={preset} value={preset}>
                        {CT_WINDOW_PRESET_LABELS[preset]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="hint">no CT window presets in this build</span>
                )}
                {sectionUnderlay.kind === 'auto' && (
                  <span className="hint">used when CT is the modality picked at this plane</span>
                )}
              </div>
            )}

            {sectionUnderlay.kind === 'mri' && (
              <div className="section-toolbar-group" role="group" aria-label="MRI intensity window">
                <span className="section-toolbar-label">MRI window</span>
                <label className="section-opacity-slider">
                  Low
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
                  High
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
              </div>
            )}

            <div className="section-toolbar-group section-link-chips" aria-label="Imaging sources">
              <span className="section-toolbar-label">Sources</span>
              {sourceChips.map((link) => (
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

            {activeCredit !== null ? (
              // Always-visible attribution of the modality the toolbar is
              // requesting (plan §4). Inline styles only — the credit caption is
              // laid out here rather than through a class, so it keeps working
              // independently of the section v5 slider-strip rules in
              // plates.css — and full text shown UNTRUNCATED: the credit lines
              // are verbatim and must stay readable, so the caption wraps onto
              // its own toolbar row instead of ellipsizing.
              <span
                className="section-credit-line"
                role="note"
                title={activeCredit.credit}
                style={{
                  flexBasis: '100%',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  lineHeight: 1.4,
                }}
              >
                <strong>{SECTION_UNDERLAY_KIND_LABELS[sectionUnderlay.kind]}</strong>
                {' · imagery credit: '}
                {activeCredit.credit}
              </span>
            ) : sectionUnderlay.kind !== 'none' ? (
              <span className="section-alignment-note" role="note">
                no real imagery resolves at this plane — the section canvas says so in place of a
                credit line; every embedded source stays listed above
              </span>
            ) : (
              <span className="section-alignment-note" role="note">
                simulated only — real imagery is switched off; nothing external is drawn
              </span>
            )}

            {sectionUnderlay.kind !== 'none' && (
              <span className="section-alignment-note" role="note">
                {sectionUnderlay.kind === 'auto'
                  ? 'real-first: the real slice is the base plate and the simulated contours are drawn over it at 65 %; '
                  : sectionUnderlay.kind === 'stain'
                    ? 'photographs are placed by a fixed per-plate fit (scale/midline offset), not registered to the contours; '
                    : 'approximate alignment — real imagery is placed by a fixed documented affine, not registered to the contours; '}
                photo coverage is per-plane (±{MODALITY_TOLERANCE_AU} au), so the plane between two
                photographs honestly shows the modality fallback instead
              </span>
            )}
          </div>
          <div className="section-live-stage">
            {/* Transparent wrapper (P0, QUALITY_PLAN §1 item 2): the boundary
                does not take a box, so the live canvas is still the flex child
                `.section-live-stage` sizes; a failure renders the shared
                "live section failed — Retry" card in its place. */}
            <SectionErrorBoundary style={{ display: 'contents' }}>
              <SectionCanvas onOpenPlate={() => setMode('author')} />
            </SectionErrorBoundary>
          </div>
        </>
      )}
    </section>
  )
}
