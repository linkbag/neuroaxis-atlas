/**
 * imageLayers.ts — real-image layers for the 2D section canvas AND the PiP
 * backdrop sampler (SECTION_SYNC_PLAN §2.3 + §4 [G3]; IMAGING_V4_PLAN §4,
 * tasks `pip-backdrop` + `modality-layers`).
 *
 * Implements the layer API that SectionCanvas.tsx (G2) defines: each layer is
 * registered on the app-wide window registry (`window.sectionImageLayers`,
 * see registerSectionImageLayer), and each carries `modality`
 * ('mri'|'ct'|'stain') + `priority` so the canvas can (a) resolve ONE real
 * modality per frame and (b) draw the registry in priority order. The canvas
 * calls `appliesTo` + `draw` per frame with the current plane, the nearest
 * levelId (±1.5 au, its own LEVEL_MAP_WINDOW) and the store `sectionUnderlay`
 * knobs, and shows the layer's `credit` / `sourceLink` bottom-left whenever
 * the layer painted. Draw order (real base → contours → labels) is the
 * canvas' concern.
 *
 * ── Modality switcher (plan §4, task `modality-layers`) ───────────────────
 * `store.sectionUnderlay.kind` is the single request — 'auto' (the v4 default)
 * | 'mri' | 'ct' | 'stain' | 'none'. The 2D canvas resolves it once per frame
 * from the layer REGISTRY (SectionCanvas.resolveLayerFrame: each layer's own
 * `appliesTo` + `dataStatus`), and the PiP backdrop sampler resolves it here
 * with resolveSliceModality(). Both implement the same documented order, so
 * the 2D canvas and the 3D PiP agree on which real slice a plane shows:
 *
 *   'auto'  → anchored photograph (≤ MODALITY_TOLERANCE_AU) → CT → MRI → none
 *   'stain' → anchored photograph, else nothing (never switches modality)
 *   'ct'    → the CT grid (store window preset), or nothing
 *   'mri'   → the MRI grid (store uint8 window), or nothing
 *   'none'  → nothing at all — the explicit "simulated only" mode
 *
 * (The canvas cannot import this module: these layers register themselves on
 * it, so a back-import would be a module cycle.) The resolved modality reaches
 * every layer as `layerCtx.modality`, and a layer paints only when its own
 * modality matches — so at most one real layer draws per frame and the credit
 * shown names the image actually drawn.
 *
 * ── Real-first compositing (plan §2 gap 1, §4) ────────────────────────────
 * When a real layer painted and `store.sectionUnderlay.realFirst` is true (the
 * default) the canvas treats that image as the section's BASE plate and paints
 * the simulated contours over it as a translucent overlay (65% fill strength,
 * crisp outlines, selection highlight unaffected — the constants live in
 * SectionCanvas). When nothing painted, the simulated section stays the base
 * and the canvas shows an honest hint ("no real imagery at this plane — showing
 * the simulated section", or the loading/unavailable state of a selected
 * grid). `realFirst: false` restores the v3 look: the real image is a subdued
 * underlay beneath the fully opaque simulated contours.
 *
 * Registered layers:
 *
 *  - 'stain' — photograph layer: plane-anchored plates plus the v3
 *    level-mapped micrographs. Which plate draws is decided by the pure,
 *    exported `pickStainForPlane()` (see its doc comment for the exact rule):
 *    entries whose `axis` matches the current section plane and whose
 *    `planeValue` lies within MODALITY_TOLERANCE_AU win by nearest plane
 *    (ties: fitted entries first → source resolution rank → manifest order);
 *    transverse planes with no anchored plate fall back to the level-mapped
 *    micrograph, exactly as in v3. Placement goes through `drawStainToView`:
 *    per-image `imageLayerOptions.stainFits` (legacy §2.3 two-point fit) wins,
 *    else the v4 manifest `fit` (sectionImages.ts: scale px/au, dx to the
 *    tissue midline, dy, mirrorX) places an anchored UBC horizontal/coronal
 *    photograph around the midline, else the default extent-box fit (full
 *    visible world rect → midline centered, anterior/superior up, §2.2). The
 *    EXACT per-entry credit line (plan §1) and per-entry source link are
 *    reflected onto the layer object right before each paint (the canvas reads
 *    `credit`/`sourceLink` immediately after `draw` returns), so the visible
 *    attribution always names the image actually shown.
 *
 *  - 'mri' — continuous T1 underlay for ANY plane/axis. Lazily fetches the
 *    baked uint8 grid (src/assets/imaging/mri-t1.bin, row-major, x fastest —
 *    mri-manifest.json `rowMajorAxesFastToSlow`) once, then renders the slice
 *    at the current plane: bilinear in-plane between the two flanking grid
 *    planes (trilinear at off-grid plane values), windowed to grayscale with
 *    the store window [windowMin, windowMax] (windowPercentiles in the
 *    manifest are raw NIfTI units already baked into uint8 at build time, so
 *    the full 0–255 range is the manifest-derived fallback). The slice is
 *    rendered into a small offscreen canvas (grid in-plane resolution ×
 *    `imageLayerOptions.mriUpsample`) and drawImage-scaled onto the grid's
 *    world rect, alpha = store opacity. Slices cache per quantized plane
 *    (0.25 au, the canvas' PLANE_QUANTIZE_STEP) + window + upsample.
 *
 *  - 'ct' — continuous CT over the SAME canonical box, from
 *    src/assets/imaging/ct.bin + ct-manifest.json (task `ct-grid`; NLM
 *    Visible Human "HARVARD 02" head CT). Identical sampling path as MRI, but
 *    the window comes from ct-manifest.json `windows` presets in HU
 *    (brain/bone) selected by `store.sectionUnderlay.ctWindowPreset`, NOT from
 *    the store's uint8 window (which is calibrated for the MRI percentiles) —
 *    see ctWindowForDraw()/setCtWindowPreset(). Registers disabled when the
 *    manifest status is not 'available'.
 *
 * `renderSliceToCanvas(canvas, spec, requested, options)` is the documented
 * canvas→texture path for the PiP backdrop (IMAGING_V4_PLAN §4): it renders
 * the active modality's real slice at {axis, value} into a caller-owned canvas
 * at the caller's pixel grid, reusing drawStainToView / drawGridToView, with
 * `'auto'` resolving anchored photo → CT → MRI → nothing. See its own doc
 * comment for the coordinate/orientation contract, which mirrors
 * SectionCanvas' AXIS_PAIR (§2.2) and adds an optional horizontal mirror for
 * the PiP's transverse/sagittal cameras.
 *
 * Preferences the store does not own are exported in `imageLayerOptions` for
 * integration to wire: per-image stain fits, per-level stain pick, MRI sample
 * resolution, uint8 window fallback, CT upsample + explicit HU window.
 * `getLayerLinks` provides the "open source ↗" link-outs (plan §2.3) for
 * integration to render as chips.
 *
 * Attribution sources (verbatim strings): docs/SECTION_SYNC_PLAN.md §1,
 * src/data/sectionImages.ts (UBC_CREDIT / BMM_CREDIT / COMMONS_CT_CREDIT),
 * mri-manifest.json (`source` / `license`, dataset CC0 — no attribution
 * required, provenance only) and ct-manifest.json (`credit`, NLM Visible Human
 * acknowledgement — the exact string is what CT_CREDIT carries). License
 * evidence: docs/IMAGING_SOURCES.md, docs/IMAGING_SOURCES_V4.md
 * (§5.2 documents the `fit` fields consumed here).
 */
import {
  registerSectionImageLayer,
  type SectionImageLayer,
  type SectionLayerModality,
  type SectionView,
} from './SectionCanvas'
import type { PlaneAxis, PlaneSpec } from './contours'
import {
  AXIS_INDEX,
  AXIS_PAIR,
  MODALITY_TOLERANCE_AU as PLANE_TOLERANCE_AU,
  nearestLevelTo,
  pickImageForPlane,
  planeTransform,
  samplerViewport,
} from './planeGeometry'
import {
  sectionImages,
  sectionImagesForLevel,
  type SectionImage,
} from '../../data/sectionImages'
import { levels } from '../../data/load'
import { useAtlasStore } from '../../state/store'
import mriManifestJson from '../../assets/imaging/mri-manifest.json'
import mriT1Url from '../../assets/imaging/mri-t1.bin?url'
import ctManifestJson from '../../assets/imaging/ct-manifest.json'
import ctGridUrl from '../../assets/imaging/ct.bin?url'

/* ------------------------------------------------------------- manifest */

/**
 * The subset of mri-manifest.json the layers consume. `status` is optional in
 * schema v1 (the mri-grid bake predates the field) — see mriLayerStatus().
 */
interface MriManifest {
  status?: string
  dims?: number[]
  originAu?: number[]
  spacingAu?: number[]
  source?: string
  license?: string
}

const mriManifest = mriManifestJson as unknown as MriManifest

/** Pinned dataset page (assets-src/imaging/mri-source.json `datasetPageUrl`;
 *  assets-src is gitignored, so the URL is pinned here instead of imported). */
const OPENNEURO_DATASET_URL = 'https://openneuro.org/datasets/ds007313/versions/1.0.0'

/** '<dataset citation>, OpenNeuro CC0' — built from the manifest fields. */
const MRI_CREDIT = `${mriManifest.source ?? 'OpenNeuro ds007313'}, OpenNeuro ${mriManifest.license ?? 'CC0'}`

/* --------------------------------------------------------- CT manifest */

/**
 * ct-manifest.json (task `ct-grid`). The same schema as the MRI manifest plus
 * the CT-specific bits: `windows` presets and an explicit `status`, which is
 * 'available' when the bake found an embeddable CT volume and 'unavailable'
 * otherwise (in that case the CT layer registers disabled and the sampler
 * reports "no CT data" instead of drawing anything).
 */
interface CtManifest extends GridManifest {
  modality?: string
  windows?: Record<string, number[]>
}

const ctManifest = ctManifestJson as unknown as CtManifest

/** Pinned NLM Visible Human landing page (same source as the manifest block). */
const VHP_LANDING_URL =
  'https://www.nlm.nih.gov/research/visible/getting_data.html'

/**
 * Verbatim credit for the CT grid: the manifest's own `credit` field when the
 * bake wrote one, else its `source.credit`, else the attribution sentence —
 * never a paraphrase (plan §4 "every embedded asset keeps a verbatim credit
 * line").
 */
const CT_CREDIT = (() => {
  const credit = ctManifest.credit
  if (typeof credit === 'string' && credit.length > 0) return credit
  const attribution = ctManifest.attribution
  if (typeof attribution === 'string' && attribution.length > 0) return attribution
  return `${ctManifest.source ?? 'Visible Human Project CT'}, ${ctManifest.license ?? 'see docs/ATTRIBUTION.md'}`
})()

/** The CT grid's own manifest window (HU at bake time; see manifests). */
const CT_MANIFEST_WINDOW: [number, number] = (() => {
  const window = ctManifest.windows?.brain
  if (Array.isArray(window) && window.length === 2) return [window[0], window[1]]
  return [-20, 100]
})()

/** Static-import asset URLs for the two baked uint8 grids. */
const MRI_BIN_URL = mriT1Url
const CT_BIN_URL = ctGridUrl

/* --------------------------------------------------- integration options */

/** World-rect (au) one stain image is stretched onto, in the canvas plane
 *  frame (u = screen x, v = screen y; §2.2). Replaces the default extent-box
 *  fit for that image (plan §2.3 per-image "two-point fit" constants). */
export interface StainFit {
  uMin: number
  uMax: number
  vMin: number
  vMax: number
  /** Mirror horizontally (source authored with the opposite laterality). */
  flipX?: boolean
}

/** Tuning knobs the store does not own — integration wires these if needed. */
export interface ImageLayerOptions {
  /** Per-image world fit overriding the default extent-view fit, keyed by
   *  sectionImages.ts entry id. */
  stainFits: Record<string, StainFit>
  /** Per-level image pick override (levelId → manifest image id); default is
   *  the first manifest entry for the level. */
  stainPreferred: Record<string, string>
  /** MRI slice render resolution = grid in-plane resolution × this factor. */
  mriUpsample: number
  /** uint8 window used when the store window values are not finite. The
   *  manifest's intensity percentiles were baked into the grid at build time
   *  (build-mri-grid.mjs: p1–p99.5 → 0..255), so the manifest-derived
   *  fallback is the full uint8 range. */
  mriWindowFallback: { min: number; max: number }
  /** CT slice render resolution = grid in-plane resolution × this factor. */
  ctUpsample: number
  /** CT window preset name, resolved against ct-manifest.json `windows` (the
   *  CT grid is baked in HU, so the MRI store window [60,180] is meaningless
   *  here — see setCtWindowPreset). */
  ctWindowPreset: string
  /** Caller-supplied window pair for CT; overrides ctWindowPreset when finite. */
  ctWindow: { min: number; max: number } | null
}

export const imageLayerOptions: ImageLayerOptions = {
  stainFits: {},
  stainPreferred: {},
  mriUpsample: 3,
  mriWindowFallback: { min: 0, max: 255 },
  ctUpsample: 6,
  ctWindowPreset: 'brain',
  ctWindow: null,
}

/* ----------------------------------------------- CT window preselection */

/** Live CT window (HU) — seeded from the manifest's default (brain) window. */
let ctWindow: [number, number] = [CT_MANIFEST_WINDOW[0], CT_MANIFEST_WINDOW[1]]

/** Preset names available on the CT manifest (brain / bone); exported for UI. */
export function ctWindowPresets(): string[] {
  return Object.keys(ctManifest.windows ?? {})
}

/**
 * Select the CT display window by preset name from ct-manifest.json `windows`
 * (unknown name → the manifest's default `brain` window), or pass an explicit
 * HU pair. The MRI store window [windowMin, windowMax] is deliberately NOT
 * used for CT: the CT grid is baked in HU, where the store's default 60–180
 * uint8 window selects a meaningless band (see imageLayerOptions.ctWindow).
 * The chosen window is returned so a caller can show it as a readout.
 *
 * Since v4 the CT window the layers actually paint with comes from
 * `store.sectionUnderlay.ctWindowPreset`, resolved per draw through
 * ctWindowForDraw(); this setter keeps the module-level fallback (used when no
 * preset is passed) in sync for callers that only have the string.
 */
export function setCtWindowPreset(preset: string): [number, number] {
  const window = windowForPreset(preset) ?? CT_MANIFEST_WINDOW
  ctWindow = [window[0], window[1]]
  return [ctWindow[0], ctWindow[1]]
}

/** The manifest window pair for a preset name, or null when it is unknown. */
function windowForPreset(preset: string): [number, number] | null {
  const windows = ctManifest.windows ?? {}
  const window = windows[preset]
  if (Array.isArray(window) && window.length === 2) return [window[0], window[1]]
  return null
}

/** Current CT window (HU) — [windowMin, windowMax] exactly as baked. */
export function getCtWindow(): [number, number] {
  return [ctWindow[0], ctWindow[1]]
}

/** Whether the CT modality has a grid to draw (manifest status or dims). */
export type CtLayerStatus = 'available' | 'unavailable'

export function ctLayerStatus(): CtLayerStatus {
  const declared = ctManifest.status
  if (typeof declared === 'string') return declared === 'available' ? 'available' : 'unavailable'
  const dims = ctManifest.dims
  const wellFormed =
    Array.isArray(dims) && dims.length === 3 && dims.every((n) => typeof n === 'number' && n > 0)
  return wellFormed ? 'available' : 'unavailable'
}

/* -------------------------------------------------------- layer ids/status */

export const STAIN_LAYER_ID = 'stain'
export const MRI_LAYER_ID = 'mri'
export const CT_LAYER_ID = 'ct'

/**
 * Modality tag of every registered layer (plan §4 "modality: 'mri'|'ct'|
 * 'stain'"). The canvas reads this tag off each layer to resolve the frame's
 * modality; the map is exported for integration/QA that needs the layer id →
 * modality pairing without importing each layer object.
 */
export const LAYER_MODALITIES: Record<string, SectionLayerModality> = {
  [STAIN_LAYER_ID]: 'stain',
  [MRI_LAYER_ID]: 'mri',
  [CT_LAYER_ID]: 'ct',
}

/**
 * Draw priority per layer (plan §4: "Add `priority` so modality order is
 * explicit"). The canvas visits registered layers in ASCENDING priority and
 * every one of them paints before the simulated contours and the labels, so
 * the real imagery is always the section's base. The relative order of the
 * three modalities only matters when more than one could paint — under the
 * switcher only the resolved modality paints (see LAYER_MODALITIES) — but the
 * numbers stay fixed so the registry order is explicit and stable.
 */
export const LAYER_PRIORITY: Record<string, number> = {
  [MRI_LAYER_ID]: 20,
  [CT_LAYER_ID]: 21,
  [STAIN_LAYER_ID]: 30,
}

export type MriLayerStatus = 'available' | 'unavailable'

/**
 * `SectionImageLayer` now carries the v4 registry tags itself (SectionCanvas'
 * interface: `modality?: SectionLayerModality`, `priority?: number`,
 * `dataStatus?()`), so the three layers below are declared with that public
 * type and the tags are optional-by-type / always-present-in-fact.
 */

/**
 * Whether the MRI layer has data to draw. A manifest that DECLARES `status`
 * must say 'available' (task contract: any other value → layer registers
 * disabled). Schema-v1 manifests carry no status field; the bake only writes
 * dims/origin/spacing for a successfully resampled grid, so a well-formed
 * dims triple means the committed grid is usable.
 */
export function mriLayerStatus(): MriLayerStatus {
  const declared = mriManifest.status
  if (typeof declared === 'string') return declared === 'available' ? 'available' : 'unavailable'
  const dims = mriManifest.dims
  const wellFormed =
    Array.isArray(dims) && dims.length === 3 && dims.every((n) => typeof n === 'number' && n > 0)
  return wellFormed ? 'available' : 'unavailable'
}

/* ------------------------------------------------------------- stain layer */

/**
 * Default anchoring tolerance for a plane-anchored photograph (au): a plate
 * mounts while the section plane is within this distance of its `planeValue`
 * (plan §4 "default 1.5 au").
 *
 * The number is spelled here because `scripts/verify-imaging-v4.mjs` reads this
 * declaration out of the source; planeGeometry declares the same value as
 * MODALITY_TOLERANCE_AU (the shared name every consumer uses) and
 * `npm run verify:plane` asserts the two are equal, so the value still has one
 * meaning even though the gate reads it here.
 */
export const MODALITY_TOLERANCE_AU = 1.5

/* Keep the shared declaration honest: a change on one side fails loudly. */
if (MODALITY_TOLERANCE_AU !== PLANE_TOLERANCE_AU) {
  throw new Error(
    `imageLayers: MODALITY_TOLERANCE_AU (${MODALITY_TOLERANCE_AU}) disagrees with ` +
      `planeGeometry.MODALITY_TOLERANCE_AU (${PLANE_TOLERANCE_AU})`,
  )
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** The stain image shown for a level (first manifest entry unless integration
 *  overrides via imageLayerOptions.stainPreferred). */
function pickStainImage(levelId: string): SectionImage | undefined {
  const entries = sectionImagesForLevel(levelId)
  if (entries.length === 0) return undefined
  const preferred = imageLayerOptions.stainPreferred[levelId]
  if (preferred !== undefined) {
    const match = entries.find((entry) => entry.id === preferred)
    if (match !== undefined) return match
  }
  return entries[0]
}

/** Section-plane kind ('transverse'|'coronal'|'sagittal') of a plane axis. */
export function sectionAxisOf(planeAxis: PlaneAxis): SectionImage['axis'] {
  return planeAxis === 'y' ? 'transverse' : planeAxis === 'x' ? 'sagittal' : 'coronal'
}

/**
 * Measured pixel area of the committed imaging files, per manifest id prefix.
 * Verified on disk (2026-09 bake, docs/IMAGING_SOURCES_V4.md §4.2):
 *   bmm-*    1050×700   ubc-m*  800×700   ubc-h*  400×350
 *   ubc-c*    400×300   wikict-* 323×234
 * Used ONLY as the last tie-break between two plates anchored to the SAME
 * plane, so a stale value can never move a plate to a wrong plane — it can
 * only change which of two same-plane plates is shown.
 */
const SOURCE_PIXEL_AREA: readonly { prefix: string; area: number }[] = [
  { prefix: 'bmm-', area: 1050 * 700 },
  { prefix: 'ubc-m', area: 800 * 700 },
  { prefix: 'ubc-h', area: 400 * 350 },
  { prefix: 'ubc-c', area: 400 * 300 },
  { prefix: 'wikict-', area: 323 * 234 },
]

function pixelAreaOf(image: SectionImage): number {
  for (const entry of SOURCE_PIXEL_AREA) {
    if (image.id.startsWith(entry.prefix)) return entry.area
  }
  return 0
}

/**
 * Tie-break between two plates anchored to the SAME plane (|Δplane| within
 * PLANE_TIE_EPSILON), in order:
 *  1. the entry that carries a v4 `fit` affine — it is placed in the canonical
 *     frame by the manifest instead of being stretched over the whole view;
 *  2. the larger source resolution (SOURCE_PIXEL_AREA, measured on disk);
 *  3. otherwise the incumbent stays, i.e. manifest order is the stable
 *     fallback.
 */
function beatsPlaneTie(candidate: SectionImage, incumbent: SectionImage): boolean {
  const candidateFitted = candidate.fit !== undefined
  const incumbentFitted = incumbent.fit !== undefined
  if (candidateFitted !== incumbentFitted) return candidateFitted
  const candidateArea = pixelAreaOf(candidate)
  const incumbentArea = pixelAreaOf(incumbent)
  if (candidateArea !== incumbentArea) return candidateArea > incumbentArea
  return false
}

/** How a plate was selected (diagnostics + the canvas' honesty hint). */
export interface StainPick {
  image: SectionImage
  /** 'plane' = anchored at its own `planeValue`; 'level' = v3 level proximity. */
  via: 'plane' | 'level'
  /** |planeValue − value| in au (0 for the level fallback, which has none). */
  distanceAu: number
}

/**
 * The photograph that belongs to this plane, or undefined when none does —
 * the single place the plate-selection rule lives (the canvas, the layer and
 * the PiP sampler all call it, so they can never disagree).
 *
 * The rule itself is `planeGeometry.pickImageForPlane` (QUALITY_PLAN §2 item 4),
 * which the Plates-tab toolbar reads too — one implementation, no drift:
 *  1. only entries whose `axis` matches the section plane's own anatomic axis
 *     are eligible (a coronal plate never mounts on a transverse plane);
 *  2. a plate mounts while the plane is within `tolerance` au of its
 *     `planeValue` (default MODALITY_TOLERANCE_AU);
 *  3. the SMALLEST |planeValue − value| wins;
 *  4. within PLANE_TIE_EPSILON of the nearest plane, beatsPlaneTie() decides:
 *     fitted entries → larger source resolution → manifest order;
 *  5. only when no plate is anchored: on the transverse axis (the only axis
 *     with levels.json anchors) the v3 level-mapped micrograph is used, so
 *     every v3 behaviour is preserved.
 *
 * Note on the MSU/Wisconsin coronal series in src/data/sectionImages.ts: those
 * 10 entries carry no `planeValue` (the source publishes no section position),
 * so they are not plane-anchorable and never win here — the anchored coronal
 * coverage comes from the UBC c-series, exactly as the v4 research recorded.
 */
export function pickStainForPlane(
  axis: PlaneAxis,
  value: number,
  levelId: string | null,
  tolerance = MODALITY_TOLERANCE_AU,
): StainPick | undefined {
  const pick = pickImageForPlane<SectionImage>(sectionImages, axis, value, tolerance, {
    levelId: axis === 'y' ? levelId : null,
    // Same tie order as before: a fitted plate beats an unfitted one, then the
    // measured source resolution, then manifest order (the incumbent stays).
    beatsTie: (candidate, incumbent) => beatsPlaneTie(candidate, incumbent),
    // The layer's own per-level override (imageLayerOptions.stainPreferred).
    pickLevelImage: (entries, id) => {
      const preferred = imageLayerOptions.stainPreferred[id]
      if (preferred !== undefined) {
        const match = entries.find((entry) => entry.id === preferred)
        if (match !== undefined) return match
      }
      return entries.find((entry) => entry.levelId === id)
    },
  })
  if (pick === undefined) return undefined
  return { image: pick.image, via: pick.via, distanceAu: pick.distanceAu }
}

/** Image cache keyed by manifest entry id (decoded lazily on first need). */
const stainImageCache = new Map<string, HTMLImageElement>()
const stainImageFailed = new Set<string>()

/**
 * P0 survivability (QUALITY_PLAN §1 item 3, AUDIT §2.3): every plate decode is
 * bounded. A photograph that neither loads nor errors (a stalled request, a
 * flaky CDN that never closes the response, an image the decoder never
 * finishes) used to leave the layer permanently in 'loading': the canvas hint
 * said "loading the photograph…" forever and no retry existed.
 *
 * The bound can therefore never be "just" a hint — a timed-out plate is a
 * DIFFERENT state ('could not be loaded', not 'still arriving'), and the
 * `retry` affordance below is what makes it recoverable.
 */
export const PLATE_LOAD_TIMEOUT_MS = 15_000

/** Timed-out plate ids (cleared on retry / on a late successful decode). */
const stainImageTimedOut = new Set<string>()

/** Armed deadline per in-flight plate id (cleared on load/error/timeout). */
const stainImageTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Why a plate is not paintable: still arriving vs. gave up (timeout/error). */
export type PlateLoadState = 'ready' | 'loading' | 'timed-out' | 'failed' | 'idle'

function clearPlateTimer(id: string): void {
  const timer = stainImageTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    stainImageTimers.delete(id)
  }
}

/** Public read of one plate's load state (QA + UI affordances). */
export function plateLoadState(id: string): PlateLoadState {
  if (stainImageFailed.has(id)) return 'failed'
  if (stainImageTimedOut.has(id)) return 'timed-out'
  const cached = stainImageCache.get(id)
  if (cached === undefined) return 'idle'
  return cached.complete && cached.naturalWidth > 0 ? 'ready' : 'loading'
}

/**
 * Drop the cached image/timer/failure state of one plate so the next draw
 * re-requests it. Idempotent; returns true when there was something to retry.
 * The previously decoded image (if any) stays valid for the caller holding it.
 */
export function retryPlateImage(id: string): boolean {
  const had = stainImageCache.has(id) || stainImageFailed.has(id) || stainImageTimedOut.has(id)
  clearPlateTimer(id)
  stainImageCache.delete(id)
  stainImageFailed.delete(id)
  stainImageTimedOut.delete(id)
  nudgeRedraw()
  return had
}

/** Returns the decoded Image, or undefined while loading / after a failure
 *  (the draw then paints nothing this frame; the onload nudge schedules a
 *  repaint — the canvas redraws on every store notification). */
function getStainImage(image: SectionImage): HTMLImageElement | undefined {
  const cached = stainImageCache.get(image.id)
  if (cached !== undefined) {
    return cached.complete && cached.naturalWidth > 0 ? cached : undefined
  }
  if (stainImageFailed.has(image.id) || stainImageTimedOut.has(image.id)) return undefined
  const img = new Image()
  stainImageCache.set(image.id, img)
  img.onload = () => {
    clearPlateTimer(image.id)
    // A late decode of a plate we had already given up on is a recovery:
    // clear the timeout flag so the layer reports 'ready' again.
    stainImageTimedOut.delete(image.id)
    nudgeRedraw()
  }
  img.onerror = () => {
    clearPlateTimer(image.id)
    stainImageFailed.add(image.id)
    // Visible state change: the canvas repaints and can say the plate failed.
    nudgeRedraw()
  }
  img.decoding = 'async'
  img.src = image.file
  // One deadline per image: on expiry the plate settles to the explicit
  // 'timed-out' state (never silently back to 'loading') and one repaint is
  // scheduled so the state change reaches the canvas without a store edit.
  stainImageTimers.set(
    image.id,
    setTimeout(() => {
      stainImageTimers.delete(image.id)
      if (stainImageCache.get(image.id)?.complete) return
      stainImageTimedOut.add(image.id)
      nudgeRedraw()
    }, PLATE_LOAD_TIMEOUT_MS),
  )
  return undefined
}

/**
 * Paint one decoded stain/photo plate into a SectionView (canvas space: u to
 * the right, v upward, top row = max v — §2.2). Shared by the registered
 * 'stain' layer and by renderSliceToCanvas(), so the PiP backdrop and the 2D
 * canvas can never drift apart.
 *
 * Three placement paths:
 *  - `imageLayerOptions.stainFits[id]` (legacy §2.3 two-point fit) wins: the
 *    world rect is taken verbatim from the option.
 *  - else, when the manifest entry carries a v4 `fit` AND the entry's own
 *    anatomic axis is the axis being drawn (`sectionAxisOf(view.axis) ===
 *    image.axis` — an anchored coronal plate is only ever placed on the
 *    coronal canvas), the photo is placed from that affine: `scale` is px per
 *    canonical au, so the plate's world size is naturalWidth/scale ×
 *    naturalHeight/scale; `dx` is the measured offset **from the image centre
 *    to the tissue symmetry axis** (docs/IMAGING_SOURCES_V4.md §5.2:
 *    `dx = (midlinePx − imageWidth/2)/scale`, + = midline right of centre), so
 *    the image centre is placed at `midline − dx` to put the plate's midline on
 *    the canonical midline; `dy` is the vertical offset from the view centre
 *    and `mirrorX` flips the plate. This is what makes the plane-anchored UBC
 *    horizontal/coronal photographs land on their `planeValue`.
 *  - else the default extent-box fit: the full visible world rect, which
 *    centers the midline and puts anterior/superior at the top.
 *
 * Returns false when nothing was painted (image still decoding, decode failed,
 * or the computed rect is degenerate). `stamp` (a SectionImageLayer) receives
 * the drawn entry's exact credit + source link before painting.
 */
function drawStainToView(
  ctx: CanvasRenderingContext2D,
  view: SectionView,
  image: SectionImage,
  opacity: number,
  stamp?: SectionImageLayer,
): boolean {
  const img = getStainImage(image)
  if (img === undefined) return false

  const legacy = imageLayerOptions.stainFits[image.id]
  const fit = legacy === undefined && image.axis === sectionAxisOf(view.axis) ? image.fit : undefined

  let sx: number
  let sy: number
  let width: number
  let height: number
  let flip = false
  if (legacy !== undefined) {
    sx = view.uToSx(legacy.uMin)
    sy = view.vToSy(legacy.vMax) // top row = max v (anterior/superior up)
    width = view.uToSx(legacy.uMax) - sx
    height = view.vToSy(legacy.vMin) - sy
    flip = legacy.flipX === true
  } else if (fit !== undefined) {
    // px per au → the image's world size (canonical au): `fit.scale` is the ONE
    // definition of the plate's world size, on every surface.
    const wAu = img.naturalWidth / Math.max(1e-6, fit.scale)
    const hAu = img.naturalHeight / Math.max(1e-6, fit.scale)
    // The visible rect's centre is the canonical midline on the transverse and
    // coronal axes (u = x, bounds symmetric about 0 — §2.2) and the bounds
    // midpoint on the others; `dx` measures how far the plate's own tissue
    // midline sits right of its image centre, so the image centre goes at `−dx`
    // from that midline. `dy` shifts the plate vertically from the view centre
    // (dy = 0 keeps it centred). Both surfaces reach this same world rect, which
    // is what the canvas/PiP agreement assertion in verify:plane proves.
    const uCenter = (view.uRange[0] + view.uRange[1]) / 2 - (fit.dx ?? 0)
    const vCenter = (view.vRange[0] + view.vRange[1]) / 2 + (fit.dy ?? 0)
    sx = view.uToSx(uCenter - wAu / 2)
    sy = view.vToSy(vCenter + hAu / 2)
    width = view.uToSx(uCenter + wAu / 2) - sx
    height = view.vToSy(vCenter - hAu / 2) - sy
    flip = fit.mirrorX === true
  } else {
    sx = view.uToSx(view.uRange[0])
    sy = view.vToSy(view.vRange[1])
    width = view.uToSx(view.uRange[1]) - sx
    height = view.vToSy(view.vRange[0]) - sy
  }
  if (!(width > 0.5 && height > 0.5)) return false

  if (stamp !== undefined) {
    stamp.credit = image.credit
    stamp.sourceLink = image.sourceUrl
  }
  ctx.save()
  ctx.globalAlpha = clamp01(opacity)
  ctx.imageSmoothingEnabled = true
  if (flip) {
    ctx.translate(sx + width, sy)
    ctx.scale(-1, 1)
    ctx.drawImage(img, 0, 0, width, height)
  } else {
    ctx.drawImage(img, sx, sy, width, height)
  }
  ctx.restore()
  return true
}

/** Whether the cached plate for an entry is decoded and ready to paint. */
function stainImageReady(image: SectionImage): boolean {
  if (stainImageFailed.has(image.id) || stainImageTimedOut.has(image.id)) return false
  const cached = stainImageCache.get(image.id)
  return cached !== undefined && cached.complete && cached.naturalWidth > 0
}

const stainLayer: SectionImageLayer = {
  id: STAIN_LAYER_ID,
  modality: LAYER_MODALITIES[STAIN_LAYER_ID],
  priority: LAYER_PRIORITY[STAIN_LAYER_ID],
  // Placeholder attribution used only until the first paint; draw() reflects
  // the drawn entry's EXACT credit + source link before painting (the canvas
  // reads them right after draw returns).
  credit: '© University of British Columbia, CC BY-NC-SA 4.0',
  sourceLink: 'https://www.neuroanatomy.ca/micrographs.html',

  // v4: any axis — a plane-anchored coronal/sagittal plate covers its own
  // plane, and the transverse axis keeps the v3 level-mapped micrographs.
  appliesTo(plane, levelId) {
    return pickStainForPlane(plane.axis, plane.value, levelId) !== undefined
  },

  dataStatus(plane, levelId) {
    const pick = pickStainForPlane(plane.axis, plane.value, levelId)
    if (pick === undefined) return 'unavailable'
    if (stainImageReady(pick.image)) return 'ready'
    // The decode is kicked off by draw(); dataStatus only reports its state, so
    // the first frames honestly read "loading the photograph…". A decode that
    // failed or exceeded PLATE_LOAD_TIMEOUT_MS is NOT 'loading' any more — the
    // canvas must be able to say "unavailable" and offer the retry.
    return stainImageFailed.has(pick.image.id) || stainImageTimedOut.has(pick.image.id)
      ? 'unavailable'
      : 'loading'
  },

  draw(ctx, view, plane, layerCtx) {
    if (layerCtx.modality !== 'stain') return false
    const pick = pickStainForPlane(plane.axis, plane.value, layerCtx.levelId)
    if (pick === undefined) return false
    // Reflect the exact per-entry attribution (plan §1 verbatim lines) BEFORE
    // painting; the canvas renders layer.credit/sourceLink on painted !== false.
    return drawStainToView(ctx, view, pick.image, layerCtx.opacity, this)
  },
}

/* -------------------------------------------------- grid data (MRI + CT) */

/**
 * One baked uint8 volume grid: MRI (src/assets/imaging/mri-t1.bin) and CT
 * (src/assets/imaging/ct.bin) share the exact same row-major x-fastest layout,
 * canonical origin/spacing and dims — both are emitted by the same bake
 * pipeline (scripts/build-mri-grid.mjs / scripts/build-ct-grid.mjs), so one
 * sampler, one trilinear resample and one slice renderer serve both.
 *
 * `id` keys the shared slice cache, so the two modalities never collide.
 */
interface SliceGrid {
  id: string
  data: Uint8Array
  dims: [number, number, number]
  origin: [number, number, number]
  spacing: [number, number, number]
}

/** The manifest fields a grid loader needs (mri + ct manifests agree on these). */
interface GridManifest {
  status?: string
  dims?: number[]
  originAu?: number[]
  spacingAu?: number[]
  windows?: Record<string, number[]>
  source?: string
  license?: string
  credit?: string
  attribution?: string
}

/**
 * Grid load status. 'timeout' is a FIRST-CLASS state, not a flavour of
 * 'failed' (QUALITY_PLAN §1 item 3): a request that never answered and a grid
 * the server refused are different stories, and only the timeout one is worth
 * offering an immediate retry for.
 */
export type MriDataStatus = 'idle' | 'loading' | 'ready' | 'failed' | 'timeout'

/**
 * Upper bound (ms) on one baked-grid fetch + decode before it settles to the
 * visible 'timeout'/'failed' state (exported for UI + QA so the number is
 * stated once). 15 s matches ANATOMY_LOAD_TIMEOUT_MS in anatomyAssets.ts — the
 * volume payload is ~0.5 MB, so anything slower than that is a stall, not a
 * slow link.
 */
export const GRID_LOAD_TIMEOUT_MS = 15_000

/** Resize/decode state of ONE grid; null until loadGrid() runs. */
interface GridEntry {
  status: MriDataStatus
  grid: SliceGrid | null
  fetch: Promise<void> | null
  /** Abort handle of the in-flight request (so retry can cancel it). */
  controller: AbortController | null
  /** True when the last attempt ended by exceeding GRID_LOAD_TIMEOUT_MS. */
  timedOut: boolean
}

function createGridEntry(): GridEntry {
  return { status: 'idle', grid: null, fetch: null, controller: null, timedOut: false }
}

const mriEntry = createGridEntry()
const ctEntry = createGridEntry()

/** Fetch/decode state of mri-t1.bin — integration can surface it as a hint. */
export function getMriDataStatus(): MriDataStatus {
  return mriEntry.status
}

/** Fetch/decode state of ct.bin (the same states as the MRI grid). */
export function getCtDataStatus(): MriDataStatus {
  return ctEntry.status
}

/** Whether the MRI grid settled as a timeout (the retryable failure). */
export function mriGridTimedOut(): boolean {
  return mriEntry.timedOut
}

/** Whether the CT grid settled as a timeout (the retryable failure). */
export function ctGridTimedOut(): boolean {
  return ctEntry.timedOut
}

/** Last failure/timeout message per grid id, or null (visible diagnostics). */
export const gridLoadError: { mri: string | null; ct: string | null } = { mri: null, ct: null }

/**
 * The canvas draw loop is store-driven (SectionCanvas subscribes to the whole
 * store), so when async data lands outside a store change we emit a no-op
 * store update — it reads/writes no state and just schedules one repaint.
 */
function nudgeRedraw(): void {
  useAtlasStore.setState({})
}

/**
 * Retry one grid fetch after a failure/timeout: cancels the in-flight request,
 * drops the entry back to 'idle' and re-runs the loader. Returns true when a
 * new attempt was started. Idempotent while an attempt is genuinely in flight
 * and has not timed out (nothing to retry yet).
 *
 * Declared before loadGrid and called from it through the hoisted function
 * declaration — see the ordering note on loadGrid.
 */
export function retryGridLoad(id: 'mri' | 'ct', onReady?: () => void): boolean {
  const entry = id === 'mri' ? mriEntry : ctEntry
  const manifest =
    id === 'mri' ? (mriManifest as unknown as GridManifest) : (ctManifest as unknown as GridManifest)
  const url = id === 'mri' ? MRI_BIN_URL : CT_BIN_URL
  if (entry.status === 'loading' && !entry.timedOut) return false
  entry.controller?.abort()
  entry.controller = null
  entry.fetch = null
  entry.status = 'idle'
  entry.timedOut = false
  entry.grid = null
  gridLoadError[id] = null
  void loadGrid(entry, id, manifest, url, onReady)
  return true
}

/**
 * Start (once) the fetch of a baked uint8 grid and decode it into a SliceGrid.
 * `onReady` runs after the grid lands — SectionPiP uses it to flag its backdrop
 * texture dirty so the real slice appears as soon as the volume arrives.
 *
 * P0 survivability: the request is bounded by `timeoutMs`. On expiry the
 * controller aborts the fetch and the entry settles to `status: 'timeout'`
 * (visible + retryable) instead of staying 'loading' forever. Every terminal
 * failure clears `entry.fetch`, so a later `loadGrid()` — e.g. the retry path —
 * starts a fresh attempt rather than awaiting a dead promise. The declared
 * `entry` parameter (rather than a closure over mriEntry/ctEntry) is what lets
 * `retryGridLoad` above drive both grids through one code path.
 */
function loadGrid(
  entry: GridEntry,
  id: string,
  manifest: GridManifest,
  url: string,
  onReady?: () => void,
  timeoutMs: number = GRID_LOAD_TIMEOUT_MS,
): Promise<void> {
  if (entry.fetch !== null) return entry.fetch
  entry.status = 'loading'
  entry.timedOut = false
  const errorKey: 'mri' | 'ct' | null = id === 'mri' ? 'mri' : id === 'ct' ? 'ct' : null
  const controller =
    typeof AbortController === 'undefined' ? null : new AbortController()
  entry.controller = controller
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | null = null
  if (typeof setTimeout === 'function' && timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true
      if (errorKey !== null) {
        gridLoadError[errorKey] = `${id} did not answer within ${Math.round(timeoutMs / 1000)} s`
      }
      controller?.abort()
    }, timeoutMs)
  }
  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  // The fetch itself rejects with AbortError once the timeout fires; a
  // non-abort rejection is an ordinary HTTP/network failure and is kept
  // distinct from the timeout in the entry's status.
  entry.fetch = fetch(url, controller !== null ? { signal: controller.signal } : undefined)
    .then((res) => {
      if (!res.ok) throw new Error(`${id} HTTP ${res.status}`)
      return res.arrayBuffer()
    })
    .then((buffer) => {
      const dims = manifest.dims
      const origin = manifest.originAu
      const spacing = manifest.spacingAu
      if (
        !Array.isArray(dims) || dims.length !== 3 ||
        !Array.isArray(origin) || origin.length !== 3 ||
        !Array.isArray(spacing) || spacing.length !== 3
      ) {
        throw new Error(`${id} manifest dims/originAu/spacingAu malformed`)
      }
      const expected = dims[0] * dims[1] * dims[2]
      if (buffer.byteLength !== expected) {
        throw new Error(`${id} is ${buffer.byteLength} B, manifest dims expect ${expected} B`)
      }
      entry.grid = {
        id,
        data: new Uint8Array(buffer),
        dims: [dims[0], dims[1], dims[2]],
        origin: [origin[0], origin[1], origin[2]],
        spacing: [spacing[0], spacing[1], spacing[2]],
      }
      entry.status = 'ready'
      entry.timedOut = false
      entry.controller = null
      clearTimer()
      nudgeRedraw()
      onReady?.()
    })
    .catch((error: unknown) => {
      // A settled attempt is never left in the map: a retry must be able to
      // start a fresh fetch instead of re-awaiting this one.
      clearTimer()
      entry.fetch = null
      entry.controller = null
      if (timedOut) {
        entry.status = 'timeout'
        entry.timedOut = true
        entry.grid = null
        console.warn(`[imageLayers] ${id} grid timed out after ${timeoutMs} ms — retry available`)
      } else {
        entry.status = 'failed'
        entry.timedOut = false
        entry.grid = null
        const message = error instanceof Error ? error.message : String(error)
        if (errorKey !== null) gridLoadError[errorKey] = message
      }
      // Repaint so the failure state is visible without a store edit.
      nudgeRedraw()
    })
  return entry.fetch
}

/** MRI: the v3 one-shot fetch (same contract as before, now via loadGrid). */
function loadMriGrid(): void {
  void loadGrid(mriEntry, 'mri', mriManifest, MRI_BIN_URL)
}

/** CT: same pipeline against ct-manifest.json + ct.bin. */
function loadCtGrid(onReady?: () => void): void {
  void loadGrid(ctEntry, 'ct', ctManifest as unknown as GridManifest, CT_BIN_URL, onReady)
}

/* --------------------------------------------------------- grid sampling */

/* AXIS_INDEX and AXIS_PAIR are the SHARED tables from planeGeometry — this
 * module keeps no private copy of the in-plane axis pair (§2.2 conventions). */

/** Grid world-extent rect of a slice's in-plane axes (au). */
function gridPlaneRect(
  grid: SliceGrid,
  axis: PlaneAxis,
): { uMin: number; uMax: number; vMin: number; vMax: number } {
  const uIdx = AXIS_INDEX[AXIS_PAIR[axis][0]]
  const vIdx = AXIS_INDEX[AXIS_PAIR[axis][1]]
  return {
    uMin: grid.origin[uIdx],
    uMax: grid.origin[uIdx] + (grid.dims[uIdx] - 1) * grid.spacing[uIdx],
    vMin: grid.origin[vIdx],
    vMax: grid.origin[vIdx] + (grid.dims[vIdx] - 1) * grid.spacing[vIdx],
  }
}

/**
 * Trilinear uint8 sample at canonical au coordinates (bilinear in-plane once
 * the slice axis is fixed). Returns -1 outside the grid extent.
 *
 * Allocation-free (QUALITY_PLAN §3 item 11, AUDIT §2.15): the ~1.5 M calls a
 * plane change makes no longer allocate three coordinate arrays, three base
 * arrays, six clamped indices and two closures PER SAMPLE. Out-of-range axes
 * short-circuit before any index is written, so a fully out-of-range sample
 * never departs from the documented -1. The caller supplies the preallocated
 * scratch: `coords` is the sample position (mutated in place per pixel) and
 * `base`/`frac` are the module-level Float64Array(3) scratch below.
 *
 * The third argument (the precomputed AXIS_INDEX of the slice axis) documents
 * which axis is fixed for this raster. It is deliberately NOT used to skip a
 * sample: an earlier revision broke out of the outermost blend loop when the
 * slice axis landed exactly on a grid plane, on the theory that a zero
 * fractional weight makes that plane's contribution vanish — it does not,
 * because the two flanking planes hold different values (the weight multiplies
 * a DIFFERENT sample, so it cannot be dropped: that revision shifted sampled
 * values by up to 248 of 255). The eight-neighbour blend is therefore evaluated
 * unconditionally, and `check-samplegrid.mjs` proves the rewritten reader is
 * bit-identical to the pre-change one — that bug is what it caught.
 */
function sampleGrid(
  grid: SliceGrid,
  coords: Float64Array,
  /** Slice axis index — documents the fixed axis; see the note below. */
  _axisIdx: number,
  base: Float64Array,
  frac: Float64Array,
  origin: readonly number[],
  spacing: readonly number[],
): number {
  void _axisIdx
  // Out-of-extent is a property of the position alone, so all three axes are
  // checked before any table lookup (pixel centers are never exactly at the
  // grid maximum for the in-plane axes, but the slice axis can be).
  for (let a = 0; a < 3; a++) {
    const f = (coords[a] - origin[a]) / spacing[a]
    if (!(f >= 0) || !(f <= grid.dims[a] - 1)) return -1
    const b = Math.floor(f)
    base[a] = b
    frac[a] = f - b
  }
  const nx = grid.dims[0]
  const ny = grid.dims[1]
  const nz = grid.dims[2]
  const ix1 = Math.min(base[0] + 1, nx - 1)
  const iy1 = Math.min(base[1] + 1, ny - 1)
  const iz1 = Math.min(base[2] + 1, nz - 1)
  const data = grid.data
  let sum = 0
  for (let ck = 0; ck < 2; ck++) {
    const wz = ck === 0 ? 1 - frac[2] : frac[2]
    const k = ck === 0 ? base[2] : iz1
    const plane = k * ny
    for (let cj = 0; cj < 2; cj++) {
      const wy = cj === 0 ? 1 - frac[1] : frac[1]
      const j = cj === 0 ? base[1] : iy1
      const row = plane + j
      const rowBase = row * nx
      for (let ci = 0; ci < 2; ci++) {
        const wx = ci === 0 ? 1 - frac[0] : frac[0]
        const i = ci === 0 ? base[0] : ix1
        sum += data[rowBase + i] * wx * wy * wz
      }
    }
  }
  return sum
}

/** Plane quantization for the slice cache (matches SectionCanvas). */
const MRI_PLANE_QUANTIZE = 0.25
/**
 * Byte budget of the slice cache (QUALITY_PLAN §3 item 11: bound the caches by
 * BYTES, not entries — AUDIT §2.15).
 *
 * WP-B11: the cache used to hold up to SLICE_CACHE_LIMIT = 32 entries
 * regardless of their size, i.e. ≈ 32 MB worst case for the MRI raster and up
 * to ≈ 128 MB once the CT raster (6× upsample) and the PiP's 512×512 backdrop
 * slices are in play, with no relationship to what the panel actually reuses.
 * The bound is now a counted budget: every entry is charged
 * `width × height × 4` bytes (one RGBA texel per pixel — the canvas backing
 * store, and the GPU texture it is uploaded into) and insertion evicts the
 * oldest entries until the total fits.
 *
 * The budget is 24 MB, i.e. ≈ 13 MRI slices at the live-section upsample (3 →
 * 339×321 = 435 kB each) or 12 backdrop slices at the PiP's RT resolution
 * (512×512 = 1 MB each) — a superset of what one plane change can reuse
 * (2 entry points × a handful of window/upsample variants), while the hard
 * ceiling is now a number the module can state.
 */
const SLICE_CACHE_BUDGET_BYTES = 24 * 1024 * 1024

/** Offscreen grayscale canvas per (axis, quantized plane, window, upsample). */
const sliceCache = new Map<string, { canvas: HTMLCanvasElement; bytes: number }>()
let sliceCacheBytes = 0

/**
 * Sampling scratch for renderGridSlice (module scope = allocated once, reused
 * by every slice render; the 2D canvas path is single-threaded). `sliceCoords`
 * is the floating sample position, mutated per output pixel.
 */
const sliceCoords = new Float64Array(3)
const sliceBase = new Float64Array(3)
const sliceFrac = new Float64Array(3)
const sliceRgb: [number, number, number] = [0, 0, 0]

/** Cache a slice canvas and evict oldest-first until the byte budget holds. */
function rememberSlice(key: string, canvas: HTMLCanvasElement): void {
  const bytes = canvas.width * canvas.height * 4
  const previous = sliceCache.get(key)
  if (previous !== undefined) sliceCacheBytes -= previous.bytes
  sliceCache.set(key, { canvas, bytes })
  sliceCacheBytes += bytes
  while (sliceCacheBytes > SLICE_CACHE_BUDGET_BYTES && sliceCache.size > 1) {
    const oldest = sliceCache.keys().next()
    if (oldest.done) break
    const evicted = sliceCache.get(oldest.value)
    sliceCache.delete(oldest.value)
    if (evicted !== undefined) sliceCacheBytes -= evicted.bytes
  }
  if (sliceCache.size === 1 && sliceCacheBytes > SLICE_CACHE_BUDGET_BYTES) {
    // A single entry larger than the whole budget: keep it (it is the slice
    // being drawn right now) but do not let it hide the budget breach.
    sliceCacheBytes = sliceCache.get(key)?.bytes ?? 0
  }
}

/** Diagnostics for `?sectiondebug` / QA: entries and bytes the cache holds. */
export function sliceCacheStats(): { entries: number; bytes: number; budgetBytes: number } {
  return { entries: sliceCache.size, bytes: sliceCacheBytes, budgetBytes: SLICE_CACHE_BUDGET_BYTES }
}

function windowMap(sample: number, wMin: number, wMax: number): number {
  const t = wMax > wMin ? (sample - wMin) / (wMax - wMin) : sample >= wMax ? 1 : 0
  return Math.round(clamp01(t) * 255)
}

/**
 * Render the slice at `value` along `axis` into an offscreen canvas sized
 * gridInPlane × upsample (capped at 512 px/side). Top row = max v, so the
 * drawImage target rect can map world v directly (vToSy is top-down).
 *
 * Grayscale path shared by MRI and CT; the cache key carries the grid id, the
 * axis, the quantized plane, the window AND the upsample factor, so a redraw
 * at a different resolution can never reuse a smaller raster.
 */
function renderGridSlice(
  grid: SliceGrid,
  axis: PlaneAxis,
  value: number,
  wMin: number,
  wMax: number,
  upsampleIn: number,
  colorize?: (sample: number, out: [number, number, number]) => void,
): HTMLCanvasElement | null {
  const quantized = Math.round(value / MRI_PLANE_QUANTIZE) * MRI_PLANE_QUANTIZE
  const upsample = Math.max(1, Math.min(4, Math.round(upsampleIn) || 1))
  const key =
    `${grid.id}|${axis}|${quantized.toFixed(2)}|${Math.round(wMin)}|${Math.round(wMax)}|${upsample}`
  const cached = sliceCache.get(key)
  if (cached !== undefined) return cached.canvas

  // Plane value off the grid extent → nothing to sample (e.g. sagittal
  // planes beyond the ±27 au grid while the canvas x extent is ±48 au).
  const aIdx = AXIS_INDEX[axis]
  const fAxis = (value - grid.origin[aIdx]) / grid.spacing[aIdx]
  if (!(fAxis >= 0) || !(fAxis <= grid.dims[aIdx] - 1)) return null

  const uIdx = AXIS_INDEX[AXIS_PAIR[axis][0]]
  const vIdx = AXIS_INDEX[AXIS_PAIR[axis][1]]
  const w = Math.max(1, Math.min(512, grid.dims[uIdx] * upsample))
  const h = Math.max(1, Math.min(512, grid.dims[vIdx] * upsample))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const c2d = canvas.getContext('2d')
  if (c2d === null) return null
  const imageData = c2d.createImageData(w, h)
  const pixels = imageData.data

  // Allocation-free sampling (QUALITY_PLAN §3 item 11): per-call scratch lives
  // in module scope (single-threaded 2D canvas work, no reentrancy) and the
  // per-axis origin/spacing/step terms are hoisted OUT of the pixel loop.
  const origin = grid.origin as unknown as readonly number[]
  const spacing = grid.spacing as unknown as readonly number[]
  const coords = sliceCoords
  coords[aIdx] = value
  const uOrigin = origin[uIdx]
  const vOrigin = origin[vIdx]
  const uStep = ((grid.dims[uIdx] - 1) * spacing[uIdx]) / w
  const vStep = ((grid.dims[vIdx] - 1) * spacing[vIdx]) / h
  let p = 0
  // Output-pixel centers map to fractional grid indices strictly inside
  // (0, dim-1): (px + 0.5) / w ∈ (0, 1) — no edge clamping needed. Top row
  // (py = 0) is max v, matching the canvas' vToSy (v grows upward).
  if (colorize === undefined) {
    for (let py = 0; py < h; py++) {
      coords[vIdx] = vOrigin + (h - 1 - py + 0.5) * vStep
      for (let px = 0; px < w; px++) {
        coords[uIdx] = uOrigin + (px + 0.5) * uStep
        const gray = windowMap(Math.max(0, sampleGrid(grid, coords, aIdx, sliceBase, sliceFrac, origin, spacing)), wMin, wMax)
        pixels[p] = gray
        pixels[p + 1] = gray
        pixels[p + 2] = gray
        pixels[p + 3] = 255
        p += 4
      }
    }
  } else {
    const rgb = sliceRgb
    for (let py = 0; py < h; py++) {
      coords[vIdx] = vOrigin + (h - 1 - py + 0.5) * vStep
      for (let px = 0; px < w; px++) {
        coords[uIdx] = uOrigin + (px + 0.5) * uStep
        const sample = Math.max(0, sampleGrid(grid, coords, aIdx, sliceBase, sliceFrac, origin, spacing))
        colorize(sample, rgb)
        pixels[p] = rgb[0]
        pixels[p + 1] = rgb[1]
        pixels[p + 2] = rgb[2]
        pixels[p + 3] = 255
        p += 4
      }
    }
  }
  c2d.putImageData(imageData, 0, 0)

  rememberSlice(key, canvas)
  return canvas
}

/**
 * Draw a grid slice (MRI or CT) into a SectionView at its canonical world
 * rect. Shared by the registered layers and by renderSliceToCanvas.
 */
function drawGridToView(
  ctx: CanvasRenderingContext2D,
  view: SectionView,
  plane: PlaneSpec,
  grid: SliceGrid,
  wMin: number,
  wMax: number,
  upsample: number,
  opacity: number,
  colorize?: (sample: number, out: [number, number, number]) => void,
): boolean {
  const slice = renderGridSlice(grid, plane.axis, plane.value, wMin, wMax, upsample, colorize)
  if (slice === null) return false

  const rect = gridPlaneRect(grid, plane.axis)
  const sx0 = view.uToSx(rect.uMin)
  const sy0 = view.vToSy(rect.vMax)
  const width = view.uToSx(rect.uMax) - sx0
  const height = view.vToSy(rect.vMin) - sy0
  if (!(width > 0.5 && height > 0.5)) return false

  ctx.save()
  ctx.globalAlpha = clamp01(opacity)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(slice, sx0, sy0, width, height)
  ctx.restore()
  return true
}

/**
 * CT display mapping bound to one HU window (ct-manifest.json presets): the CT
 * grid is baked in HU, so the `brain` preset maps −20 HU → black and 100 HU →
 * white. The measured skull sits far above the window top, which is exactly
 * what makes the bone rim read as a bright outline on the soft-tissue slice
 * (the manifest's own huInsideFov p99 is 805 HU). A very slight blue reduction
 * keeps the CT backdrop visually distinct from the grayscale MRI without
 * inventing contrast: R = G = g, B = 0.94·g.
 *
 * The mapper is memoized on the window pair (QUALITY_PLAN §3 item 11: hoist
 * closures out of the draw path) — only two presets exist, so the closure is
 * built once per preset instead of once per CT draw. The window values are
 * read from module state at CALL time, so a window change still takes effect
 * immediately on the next slice sample.
 */
let ctColorizeWindowKey = Number.NaN
let ctColorizeWindowMax = Number.NaN
let ctColorizeFn: ((sample: number, out: [number, number, number]) => void) | null = null

function ctColorizeFromWindow(window: [number, number]) {
  if (
    ctColorizeFn === null ||
    ctColorizeWindowKey !== window[0] ||
    ctColorizeWindowMax !== window[1]
  ) {
    ctColorizeWindowKey = window[0]
    ctColorizeWindowMax = window[1]
    ctColorizeFn = (sample: number, out: [number, number, number]): void => {
      const g = windowMap(sample, window[0], window[1])
      out[0] = g
      out[1] = g
      out[2] = Math.round(g * 0.94)
    }
  }
  return ctColorizeFn
}

const mriLayer: SectionImageLayer = {
  id: MRI_LAYER_ID,
  modality: LAYER_MODALITIES[MRI_LAYER_ID],
  priority: LAYER_PRIORITY[MRI_LAYER_ID],
  credit: MRI_CREDIT,
  sourceLink: OPENNEURO_DATASET_URL,

  // Continuous: any plane/axis has an MRI slice (when the layer is enabled).
  appliesTo(_plane, _levelId) {
    return mriLayerStatus() === 'available'
  },

  dataStatus() {
    if (mriLayerStatus() !== 'available') return 'unavailable'
    if (mriEntry.grid !== null) return 'ready'
    // 'idle' until draw() starts the fetch, 'loading' while it is in flight.
    // 'failed' AND 'timeout' are terminal: the layer must report 'unavailable'
    // (with the retry path) rather than claiming to still be loading.
    return mriEntry.status === 'failed' || mriEntry.status === 'timeout' ? 'unavailable' : 'loading'
  },

  draw(ctx, view, plane, layerCtx) {
    if (layerCtx.modality !== 'mri') return false
    if (mriLayerStatus() !== 'available') return false
    loadMriGrid()
    const grid = mriEntry.grid
    if (grid === null) return false // still loading, or the fetch failed

    const wMin = Number.isFinite(layerCtx.windowMin)
      ? layerCtx.windowMin
      : imageLayerOptions.mriWindowFallback.min
    const wMax = Number.isFinite(layerCtx.windowMax)
      ? layerCtx.windowMax
      : imageLayerOptions.mriWindowFallback.max
    return drawGridToView(
      ctx,
      view,
      plane,
      grid,
      wMin,
      wMax,
      imageLayerOptions.mriUpsample,
      layerCtx.opacity,
    )
  },
}

/**
 * CT layer (tasks `ct-grid` + `pip-backdrop` + `modality-layers`): the same
 * continuous-grid contract as MRI, against ct.bin, selectable as its own
 * modality by the store's `sectionUnderlay.kind === 'ct'` (and picked by
 * 'auto' when the manifest offers the grid). Its window comes from the CT
 * manifest presets — NEVER from the store's uint8 window, which is calibrated
 * for the MRI percentiles (see ctWindowForDraw / setCtWindowPreset) — and the
 * preset name itself comes from `store.sectionUnderlay.ctWindowPreset`
 * (brain/bone). Registers disabled when the bake found no embeddable volume
 * (ct-manifest.json status ≠ 'available').
 *
 * The 2D canvas and the PiP backdrop sampler (renderSliceToCanvas) both reach
 * this draw path, so both show the same window.
 */
const ctLayer: SectionImageLayer = {
  id: CT_LAYER_ID,
  modality: LAYER_MODALITIES[CT_LAYER_ID],
  priority: LAYER_PRIORITY[CT_LAYER_ID],
  credit: CT_CREDIT,
  sourceLink: VHP_LANDING_URL,

  appliesTo() {
    return ctLayerStatus() === 'available'
  },

  dataStatus() {
    if (ctLayerStatus() !== 'available') return 'unavailable'
    if (ctEntry.grid !== null) return 'ready'
    return ctEntry.status === 'failed' || ctEntry.status === 'timeout' ? 'unavailable' : 'loading'
  },

  draw(ctx, view, plane, layerCtx) {
    if (layerCtx.modality !== 'ct') return false
    if (ctLayerStatus() !== 'available') return false
    loadCtGrid()
    const grid = ctEntry.grid
    if (grid === null) return false
    const window = ctWindowForDraw(layerCtx.ctWindowPreset)
    return drawGridToView(
      ctx,
      view,
      plane,
      grid,
      window[0],
      window[1],
      imageLayerOptions.ctUpsample,
      layerCtx.opacity,
      ctColorizeFromWindow(window),
    )
  },
}

/**
 * The HU window the CT layer paints with, in precedence order:
 *  1. `imageLayerOptions.ctWindow` — an explicit pair set by integration;
 *  2. the requested preset name (`store.sectionUnderlay.ctWindowPreset` on the
 *     canvas path, the store value again on the sampler path) resolved against
 *     ct-manifest.json `windows`;
 *  3. `imageLayerOptions.ctWindowPreset`, then the module-level fallback kept
 *     by setCtWindowPreset() (seeded with the manifest's `brain` window).
 */
function ctWindowForDraw(preset?: string): [number, number] {
  const explicit = imageLayerOptions.ctWindow
  if (explicit !== null) {
    if (Array.isArray(explicit)) return [explicit[0], explicit[1]]
    return [explicit.min, explicit.max]
  }
  const resolved =
    windowForPreset(preset ?? imageLayerOptions.ctWindowPreset) ?? windowForPreset('brain')
  if (resolved !== null) return resolved
  return [ctWindow[0], ctWindow[1]]
}

/* -------------------------------------------------------------- link-outs */

/** One "open source ↗" chip for integration to render (plan §2.3). */
export interface LayerLink {
  label: string
  url: string
}

/** Link-out URLs pinned verbatim in docs/IMAGING_SOURCES.md §3. */
const LINK_NEUROANATOMY_MICROGRAPHS = 'https://www.neuroanatomy.ca/micrographs.html'
const LINK_MSU_HUMAN_SERIES = 'https://brains.anatomy.msu.edu/brains/human/coronal/montage.html'
const LINK_HARVARD_ATLAS = 'https://www.med.harvard.edu/aanlib/'
const LINK_BRAINMAPS = 'https://brainmaps.org/'

/**
 * Link-outs for the section under a level (optionally a selected structure):
 * the mapped image's own source page first, then the four permissive
 * reference atlases. `structureId` is reserved — Harvard/BrainMaps expose no
 * stable per-structure deep URLs, so it does not change the result yet.
 */
export function getLayerLinks(levelId: string | null, _structureId?: string | null): LayerLink[] {
  const links: LayerLink[] = []
  if (levelId !== null) {
    const image = pickStainImage(levelId)
    if (image !== undefined) {
      const site = image.source === 'ubc' ? 'neuroanatomy.ca' : 'brainmuseum.org'
      links.push({ label: `Source image — ${site}`, url: image.sourceUrl })
    }
  }
  links.push(
    { label: 'UBC micrographs', url: LINK_NEUROANATOMY_MICROGRAPHS },
    { label: 'MSU human brain series', url: LINK_MSU_HUMAN_SERIES },
    { label: 'Harvard Whole Brain Atlas', url: LINK_HARVARD_ATLAS },
    { label: 'BrainMaps.org', url: LINK_BRAINMAPS },
  )
  return links
}

/* --------------------------------------------------- slice sampler (PiP) */

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  renderSliceToCanvas — the documented canvas→texture path (IMAGING_V4_PLAN
 *  §4 "PiP backdrop", task `pip-backdrop`)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Why it exists: `SectionPiP` paints the REAL slice of the active modality into
 * its WebGLRenderTarget *behind* the GPU cut, so the panel reads like a real
 * section with the 3D structures composited over it. WebGL cannot run the
 * canvas-2D layer registry directly, so this function renders the requested
 * modality into a caller-owned 2D canvas — reusing the exact draw code paths
 * the live 2D canvas uses (drawStainToView / drawGridToView) — and the caller
 * wraps that canvas in a THREE.CanvasTexture.
 *
 * Coordinate contract (the part that is easy to get wrong):
 *  - the canvas is drawn in SectionCanvas space: u to the RIGHT, v UP, top row
 *    = max v, axis pair y→(u=x,v=z), x→(u=z,v=y), z→(u=x,v=y) (§2.2), so the
 *    image is laid out exactly like the live section canvas;
 *  - `spec.mirrorX: true` then mirrors the finished canvas horizontally, which
 *    is what the PiP needs for the transverse (y) and sagittal (x) cameras:
 *    those two RT space have u increasing toward −u of the canvas convention
 *    (verified numerically: a point at +x = patient-left projects to the LEFT
 *    half of the RT for y and x, the RIGHT half for z), and SectionPiP's final
 *    scissored blit mirrors x for exactly those two axes. Mirroring the image
 *    here therefore cancels the blit mirror and the backdrop lands on the same
 *    screen pixels as the 3D geometry drawn with the same camera;
 *  - drawing happens at `spec.width × spec.height` with `scale = width / (2·halfU)`
 *    (exactly SectionCanvas.computeTransform for a caller that passes
 *    width = RT width, halfU/halfV = the PiP's aspect-fitted ortho half-sizes),
 *    so the image and the 3D cut share one pixel grid at RT resolution.
 *
 * Modality resolution: `'auto'` picks the best available real modality at this
 * plane in the plan §4 order — a photographic plate anchored at this plane
 * (within `stainTolerance` au), else the level-mapped micrograph the live 2D
 * canvas shows for its ±1.5 au level window, else CT, else MRI, else nothing.
 * Explicit `'stain'`, `'ct'`, `'mri'` never fall through to another modality (a
 * missing modality reports its own reason), and `'none'` draws nothing at all:
 * the panel then shows the pure GPU cut, which is the honest "simulated only"
 * state.
 *
 * Cost: nothing but the canvas clear when the requested modality has no data
 * at this plane; the caller is expected to cache by (axis, rounded plane,
 * modality) — see SectionPiP's backdrop cache.
 */
export interface SliceViewSpec {
  /** Canonical axis of the slice. */
  axis: PlaneAxis
  /** Plane position (au) — the slider value, unrounded. */
  value: number
  /** Target canvas size in px (the PiP passes its render-target size). */
  width: number
  height: number
  /** In-plane world half-extents visible on the canvas (PiP ortho halfU/halfV). */
  halfU: number
  halfV: number
  /**
   * Mirror the finished canvas horizontally. Needed by the PiP for the
   * transverse/sagittal cameras (see the coordinate contract above) and false
   * for coronal; the 2D canvas path leaves it false.
   */
  mirrorX?: boolean
  /** Pre-resolved nearest level id (stain mapping). Computed here when absent. */
  levelId?: string | null
  /** Overlay alpha. The PiP backdrop uses 1 (it IS the base layer there). */
  opacity?: number
}

/**
 * Which real modality to paint: `'auto'` (real-first resolution) | `'stain'` |
 * `'ct'` | `'mri'` | `'none'` (simulated only) — the same union as the store's
 * `SectionUnderlayKind`, which is what the PiP passes in.
 */
export type SliceModality = 'auto' | 'stain' | 'ct' | 'mri' | 'none'

export interface SliceRenderOptions {
  /** Anchor tolerance for anchored photographs (au). Default 1.5 (§2.3). */
  stainTolerance?: number
  /** Grid upsampling for the sampled slice raster (default: the layer option). */
  upsample?: number
  /**
   * Colour the canvas is cleared to before drawing. The PiP passes its
   * tone-mapped clear colour so a plane with no data at all blends into the
   * panel instead of showing a previous frame's slice.
   */
  background?: string
}

export interface SliceRenderResult {
  /** True when this modality painted pixels at this plane. */
  drew: boolean
  /** Verbatim credit line of what was drawn (absent when nothing was drawn). */
  credit?: string
  /** Source page for the credit (open-source link). */
  sourceLink?: string
  /** The modality actually painted. */
  modality: SliceModality
}

/** Why a requested modality could not paint — surfaced in the ?pipdebug overlay. */
export type SliceMissReason = 'unavailable' | 'no-anchor' | 'loading'

export interface SliceResolution {
  modality: SliceModality
  image?: SectionImage
  reason?: SliceMissReason
}

/** Last resolution request issued by the sampler (for diagnostics/QA only). */
export const sliceSamplerState: { lastRequested: SliceModality; lastResolved: SliceModality } = {
  lastRequested: 'none',
  lastResolved: 'none',
}

/**
 * Nearest levels.json anchor within `tolerance` au on the transverse axis: the
 * shared `nearestLevelTo` scan AND distance (planeGeometry), plus this module's
 * window.
 */
function levelIdForPlane(axis: PlaneAxis, value: number, tolerance: number): string | null {
  const nearest = nearestLevelTo(axis, value, levels)
  if (nearest === null) return null
  return nearest.distance <= tolerance ? nearest.level.id : null
}

/**
 * Why a grid modality has nothing to paint yet: `'unavailable'` once the load
 * has terminally failed or timed out (the payload itself is fine — this
 * attempt is not), `'loading'` while an attempt is genuinely in flight.
 *
 * P0 survivability (QUALITY_PLAN §1 item 3): without this distinction a
 * timed-out grid kept the PiP hint saying "the real MRI imagery for this plane
 * is still loading" forever — the exact "hangs with no terminal state" failure
 * the item calls out. A dead grid must read as unavailable so the UI can offer
 * `retryGridLoad()`.
 */
function gridMissReason(entry: GridEntry): SliceMissReason {
  return entry.status === 'failed' || entry.status === 'timeout' ? 'unavailable' : 'loading'
}

/**
 * Which modality the PiP sampler can actually paint at this plane, in the plan
 * §4 order. This is the sampler's counterpart of SectionCanvas'
 * resolveLayerFrame(): that one reads the layer REGISTRY (the canvas cannot
 * import this module — the layers register on it), this one reads the
 * manifests and the photo pick directly, and the two are documented to
 * implement the SAME order so the 2D canvas and the PiP panel agree.
 *
 * The plate decision is `pickStainForPlane` (see its doc comment for the rule),
 * so 'auto' resolves exactly the plate the live canvas would paint.
 */
export function resolveSliceModality(
  axis: PlaneAxis,
  value: number,
  requested: SliceModality,
  levelId: string | null,
  tolerance = MODALITY_TOLERANCE_AU,
): SliceResolution {
  const stain = () => pickStainForPlane(axis, value, levelId, tolerance)?.image
  const mriReady = mriLayerStatus() === 'available'
  const ctReady = ctLayerStatus() === 'available'

  if (requested === 'none') return { modality: 'none' }
  if (requested === 'stain') {
    const image = stain()
    return image !== undefined
      ? { modality: 'stain', image }
      : { modality: 'stain', reason: 'no-anchor' }
  }
  if (requested === 'ct') {
    if (!ctReady) return { modality: 'ct', reason: 'unavailable' }
    return { modality: 'ct', reason: ctEntry.grid === null ? gridMissReason(ctEntry) : undefined }
  }
  if (requested === 'mri') {
    if (!mriReady) return { modality: 'mri', reason: 'unavailable' }
    return { modality: 'mri', reason: mriEntry.grid === null ? gridMissReason(mriEntry) : undefined }
  }
  // 'auto' — real-first default (plan §4): the closest-match real imagery first
  // (a plate anchored at this plane, else the level-mapped micrograph the live
  // 2D canvas would show), then the continuous CT / MRI grids.
  const image = stain()
  if (image !== undefined) return { modality: 'stain', image }
  if (ctReady) return { modality: 'ct', reason: ctEntry.grid === null ? gridMissReason(ctEntry) : undefined }
  if (mriReady) return { modality: 'mri', reason: mriEntry.grid === null ? gridMissReason(mriEntry) : undefined }
  return { modality: 'none', reason: 'unavailable' }
}

/** Kick off the grid fetches the sampler may need (idempotent, non-blocking). */
export function warmSliceModality(requested: SliceModality, onReady?: () => void): void {
  if (requested === 'ct' || requested === 'auto') loadCtGrid(onReady)
  if (requested === 'mri' || requested === 'auto') loadMriGrid()
}

/**
 * Draw the requested modality's slice into `canvas` (canvas → texture path for
 * the PiP backdrop). Returns what happened; never throws on missing data.
 */
export function renderSliceToCanvas(
  canvas: HTMLCanvasElement,
  spec: SliceViewSpec,
  requested: SliceModality = 'auto',
  options: SliceRenderOptions = {},
): SliceRenderResult {
  sliceSamplerState.lastRequested = requested
  const ctx = canvas.getContext('2d')
  if (ctx === null) {
    sliceSamplerState.lastResolved = 'none'
    return { drew: false, modality: 'none' }
  }
  // Deterministic starting state: an old frame's slice must never survive into
  // a plane/modality that has no imagery (the caller reuses one canvas).
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.fillStyle = options.background ?? '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const width = canvas.width
  const height = canvas.height
  if (width < 1 || height < 1) {
    sliceSamplerState.lastResolved = 'none'
    return { drew: false, modality: 'none' }
  }

  const tolerance = options.stainTolerance ?? 1.5
  const levelId =
    spec.levelId !== undefined ? spec.levelId : levelIdForPlane(spec.axis, spec.value, tolerance)
  const resolution = resolveSliceModality(spec.axis, spec.value, requested, levelId, tolerance)
  sliceSamplerState.lastResolved = resolution.modality

  // THE shared world→screen mapping (planeGeometry.planeTransform) — the same
  // function the live canvas and the PiP camera consume, so this sampler can
  // never place an image at a world position the 2D canvas would not use. The
  // caller defines the world window by its in-plane half-extents, and
  // `samplerViewport` turns that into the viewport whose aspect fit reproduces
  // exactly that window at this raster size.
  const halfU = spec.halfU > 0 ? spec.halfU : 1
  const halfV = spec.halfV > 0 ? spec.halfV : 1
  const transform = planeTransform(spec.axis, spec.value, samplerViewport({ width, height, halfU, halfV }))
  const view: SectionView = {
    axis: spec.axis,
    value: spec.value,
    width,
    height,
    uRange: [transform.uMin, transform.uMax],
    vRange: [transform.vMin, transform.vMax],
    uToSx: transform.uToSx,
    vToSy: transform.vToSy,
    sxToU: transform.sxToU,
    syToV: transform.syToV,
  }
  const plane: PlaneSpec = { axis: spec.axis, value: spec.value }
  const opacity = spec.opacity ?? 1

  let drew = false
  let credit: string | undefined
  let sourceLink: string | undefined

  if (resolution.modality === 'stain' && resolution.image !== undefined) {
    // The credit of what is drawn travels back through the return value; the
    // shared draw helper also stamps it here so future overlay passes can read
    // it off the same object (the canvas layer registry's convention).
    const stamp: SectionImageLayer = {
      id: STAIN_LAYER_ID,
      appliesTo: () => true,
      draw: () => false,
      credit: resolution.image.credit,
      sourceLink: resolution.image.sourceUrl,
    }
    drew = drawStainToView(ctx, view, resolution.image, opacity, stamp)
    credit = resolution.image.credit
    sourceLink = resolution.image.sourceUrl
  } else if (resolution.modality === 'mri') {
    if (mriEntry.grid !== null) {
      // Same window precedence as the 'mri' layer: the store's uint8 window
      // when finite, else the manifest fallback — the PiP backdrop must match
      // the live-section canvas, not a private look.
      const underlay = useAtlasStore.getState().sectionUnderlay
      const wMin = Number.isFinite(underlay.windowMin)
        ? underlay.windowMin
        : imageLayerOptions.mriWindowFallback.min
      const wMax = Number.isFinite(underlay.windowMax)
        ? underlay.windowMax
        : imageLayerOptions.mriWindowFallback.max
      drew = drawGridToView(
        ctx,
        view,
        plane,
        mriEntry.grid,
        wMin,
        wMax,
        options.upsample ?? imageLayerOptions.mriUpsample,
        opacity,
      )
      if (drew) {
        credit = MRI_CREDIT
        sourceLink = OPENNEURO_DATASET_URL
      }
    }
  } else if (resolution.modality === 'ct') {
    if (ctEntry.grid !== null) {
      // Same window precedence as the 'ct' layer: the store's CT preset
      // (brain/bone) resolved against ct-manifest.json, so the PiP backdrop and
      // the live-section canvas show the identical windowing.
      const window = ctWindowForDraw(useAtlasStore.getState().sectionUnderlay.ctWindowPreset)
      drew = drawGridToView(
        ctx,
        view,
        plane,
        ctEntry.grid,
        window[0],
        window[1],
        options.upsample ?? imageLayerOptions.ctUpsample,
        opacity,
        ctColorizeFromWindow(window),
      )
      if (drew) {
        credit = CT_CREDIT
        sourceLink = VHP_LANDING_URL
      }
    }
  }

  // Horizontal mirror for the PiP's transverse/sagittal cameras (see the
  // coordinate contract above). Applied to the finished canvas — image and any
  // future overlays — so it stays a pure presentation transform.
  if (spec.mirrorX === true && drew) {
    const copy = document.createElement('canvas')
    copy.width = width
    copy.height = height
    const copyCtx = copy.getContext('2d')
    if (copyCtx !== null) {
      copyCtx.drawImage(canvas, 0, 0)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(copy, 0, 0)
      ctx.restore()
    }
  }

  return { drew, credit, sourceLink, modality: resolution.modality }
}

/* ----------------------------------------------------------- registration */

/**
 * Register all three layers on the window registry (SectionCanvas §4 API).
 * Idempotent by id; returns a combined disposer. The mri and ct layers
 * register even when disabled (status ≠ 'available'): they then never paint,
 * and mriLayerStatus()/ctLayerStatus() let the integration UI hide their
 * toggles.
 */
export function registerImageLayers(): () => void {
  const disposeStain = registerSectionImageLayer(stainLayer)
  const disposeMri = registerSectionImageLayer(mriLayer)
  const disposeCt = registerSectionImageLayer(ctLayer)
  return () => {
    disposeStain()
    disposeMri()
    disposeCt()
  }
}

// Auto-register in the browser so the layers are live as soon as the module
// loads (integration may also call registerImageLayers() — idempotent).
if (typeof window !== 'undefined') {
  registerImageLayers()
}
