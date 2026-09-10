/**
 * SectionCanvas — 2D live-section canvas (SECTION_SYNC_PLAN §2.2 + §4 [G2],
 * section-canvas task; v4 real-first rendering, task `modality-layers`).
 *
 * Renders the simulated cross-section of every anatomy GLB at the current
 * clip plane: a worker (contourWorker.ts) slices the transferred geometry
 * registry, chains segments into closed loops and simplifies them; this
 * component draws those loops even-odd per slug with its taxonomy color,
 * and owns all interactions:
 *
 *  - world→canvas mapping per §2.2 orientation conventions (transverse:
 *    anterior up / patient-left right; sagittal: superior up / anterior
 *    right; coronal: superior up / patient-left right), extent = the
 *    canonical CLIP_BOUNDS of the two in-plane axes;
 *  - click inside the canvas writes the OTHER two clip sliders (crosshair
 *    placement) and pins sectionAxis to this canvas' axis;
 *  - crosshair lines are drawn at the current off-axis slider positions;
 *  - a nearest-plate chip appears within 3 au of a plate-backed level on the
 *    transverse axis and snaps the plane + opens the plate;
 *  - selection/hover: the selected group is drawn bright with a name label,
 *    hover identifies contours (shared store hoveredId → 3D sync);
 *  - real-imaging layers (v3 §2.3 + v4 §4): a window-level registry
 *    (window.sectionImageLayers.registerImageLayer) lets other modules
 *    register layers tagged with `modality` + `priority`. Each frame the
 *    canvas resolves the store's `sectionUnderlay.kind` to ONE real modality
 *    (resolveLayerFrame: 'auto' = anchored photo → CT → MRI), draws the
 *    registry in ascending priority, and renders the drawn layer's verbatim
 *    credit + source link bottom-left.
 *
 * v4 real-first draw order (plan §2 gap 1, §4):
 *   1. background + grid;
 *   2. the real base plate (store opacity) — or nothing, when no layer covers
 *      this plane or `kind` is the explicit 'none' ("simulated only");
 *   3. the simulated structure contours — translucent overlay over a real base
 *      (CONTOUR_OVERLAY_ALPHA, crisp outlines, selection unaffected), or the
 *      normal v3 rendering when the simulated section IS the base;
 *   4. labels (selected-structure name + hover), then crosshair, orientation
 *      badges and the plane readout.
 * When no real layer drew, an honest hint replaces the credit line in the same
 * bottom-left slot (imageryHint) — the panel is never silently blank.
 *
 * Performance: plane updates are quantized to 0.25 au and posted at
 * ≤ 15 Hz while dragging (trailing ack keeps the newest plane); draws are
 * rAF-coalesced; contour extraction happens ONLY in the worker — the main
 * thread never slices geometry (it just fills the transferred loops); the
 * worker result cache + bbox cull keep slicing cheap; stroke-only mode kicks
 * in when a slice produces > 4000 loops; painting is skipped entirely while
 * the tab is hidden (a visibilitychange listener redraws on return) and the
 * canvas backing store is capped at dpr 1.5. The worker is terminated on
 * unmount.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { getLevel, getTaxonomyEntry, levels, platesForLevel, shortLevelName } from '../../data/load'
import {
  highlightIdSet,
  useAtlasStore,
  type CtWindowPreset,
  type SectionUnderlayKind,
} from '../../state/store'
import { CLIP_BOUNDS } from '../viewer3d/clipPlanes'
import { pointInLoops, type PlaneAxis, type PlaneSpec } from './contours'
import type { SectionContourPart, SectionWorkerRequest, SectionWorkerResponse, WorkerRegistryPart } from './contourWorker'
import {
  SECTION_KIND_ALPHA,
  SECTION_KIND_ORDER,
  SECTION_PARTS,
  registryPartFromGeometry,
  useSectionGeometryStatus,
  type SectionPartMeta,
} from './sectionAssets'

/* ------------------------------------------------------------ constants */

/** 0.25 au quantization of plane updates sent to the worker (§2.2). */
const PLANE_QUANTIZE_STEP = 0.25

/** 15 Hz ceiling on worker plane posts while dragging. */
const POST_INTERVAL_MS = 1000 / 15

/** Stroke-only degradation threshold: closed loops per slice. */
const DEGRADE_LOOP_LIMIT = 4000

/** Backing-store cap (integration perf guard): device pixels per CSS px. */
const CANVAS_MAX_DPR = 1.5

/** Nearest-level window for the stain layer's levelId mapping (§2.3: ±1.5 au). */
const LEVEL_MAP_WINDOW = 1.5

/**
 * Real-first compositing (v4, plan §2 gap 1 + §4): when a real image drew and
 * `sectionUnderlay.realFirst` is on, the image is the section's BASE and the
 * simulated contours are painted over it as a translucent overlay —
 *
 *   fill   = SECTION_KIND_ALPHA[kind] × CONTOUR_OVERLAY_ALPHA   (65% strength)
 *   stroke = CONTOUR_OVERLAY_STROKE_ALPHA (outlines stay crisp over a photo)
 *   dim    = DIM_ALPHA (unchanged)
 *   selected = SECTION_KIND_ALPHA[kind] + 0.2, orange stroke, label (unaffected)
 *
 * With no real base (or `realFirst: false`) every one of those values is the
 * v3 one, i.e. the simulated section is drawn exactly as before.
 */
const CONTOUR_OVERLAY_ALPHA = 0.65

/** Stroke alpha for non-selected/non-hovered contour outlines in overlay mode. */
const CONTOUR_OVERLAY_STROKE_ALPHA = 0.9

/** Nearest-plate chip window (§2.2: ±3 au, plate-backed levels only). */
const PLATE_CHIP_WINDOW = 3

/** In-plane world-axis pairs per plane axis: [u (screen x), v (screen y)]. */
const AXIS_PAIR: Record<PlaneAxis, [PlaneAxis, PlaneAxis]> = {
  y: ['x', 'z'], // transverse: u = x, v = z
  x: ['z', 'y'], // sagittal:   u = z, v = y
  z: ['x', 'y'], // coronal:    u = x, v = y
}

const AXIS_CAPTION: Record<PlaneAxis, string> = {
  x: 'Sagittal section · x',
  y: 'Transverse section · y',
  z: 'Coronal section · z',
}

/** Orientation badges per §2.2 conventions (in-canvas corner labels). */
const DIRECTION_BADGES: Record<PlaneAxis, { top: string; bottom: string; left: string; right: string }> = {
  y: { top: 'A', bottom: 'P', left: 'R', right: 'L' },
  x: { top: 'S', bottom: 'I', left: 'P', right: 'A' },
  z: { top: 'S', bottom: 'I', left: 'R', right: 'L' },
}

/** Dim factor for parts outside the highlight set (matches 3D dimming). */
const DIM_ALPHA = 0.16

const BACKGROUND = '#0d1526'
const GRID_STROKE = 'rgba(148, 163, 184, 0.08)'
const CROSSHAIR_STROKE = 'rgba(56, 189, 248, 0.85)'
const SELECTION_STROKE = '#f59e0b'
const HOVER_STROKE = '#0ea5e9'

/** Section draw bucket → taxonomy kind gating for the store layer filters. */
const kindByTaxonomy: Record<string, string> = {
  context: 'context',
  ventricle: 'ventricle',
  nucleus: 'nucleus',
  surface: 'nucleus',
}

/* --------------------------------------- real-image layer registry (§4) */

export interface SectionView {
  axis: PlaneAxis
  /** Current plane position (au). */
  value: number
  /** Canvas size in CSS pixels. */
  width: number
  height: number
  /** Visible world extents (u/v = in-plane axes). */
  uRange: readonly [number, number]
  vRange: readonly [number, number]
  uToSx: (u: number) => number
  vToSy: (v: number) => number
  sxToU: (sx: number) => number
  syToV: (sy: number) => number
}

export interface SectionLayerContext {
  /** Store underlay opacity 0..1 — alpha of the real image (the section's
   *  BASE plate when real-first compositing is on). */
  opacity: number
  /** Nearest level id within ±1.5 au (stain level mapping), else null. */
  levelId: string | null
  /** Store-requested underlay kind: 'auto' | 'mri' | 'ct' | 'stain' | 'none'. */
  kind: SectionUnderlayKind
  /**
   * v4: the ONE real modality resolved for THIS frame — `kind` with 'auto'
   * already resolved through the plan §4 order (anchored photo → CT → MRI →
   * none) by this module's resolveLayerFrame() (the PiP backdrop sampler
   * resolves the same order through imageLayers.resolveSliceModality). A layer
   * paints only when this equals its own `modality`, so at most one real layer
   * draws per frame and the credit shown names the image actually drawn.
   * `'none'` means no real imagery at this plane (or an explicit "simulated
   * only" request).
   */
  modality: SectionLayerModality | 'none'
  windowMin: number
  windowMax: number
  /** v4: CT window preset from the store (ct-manifest.json `windows`). */
  ctWindowPreset: CtWindowPreset
}

/** Real modality a registered image layer paints (plan §4 layer registry). */
export type SectionLayerModality = 'mri' | 'ct' | 'stain'

/**
 * One registered real-image layer. Draw order: registered layers in ascending
 * `priority` (the real base plate) → simulated contours → overlay labels.
 * `draw` returns false when it painted nothing (its credit is then not shown).
 */
export interface SectionImageLayer {
  id: string
  /**
   * v4: which real modality this layer paints (plan §4). The canvas passes the
   * frame's resolved modality in `SectionLayerContext.modality` and a layer
   * must return false unless it matches.
   */
  modality?: SectionLayerModality
  /**
   * v4: draw priority (plan §4 "add `priority` so modality order is explicit").
   * Lower paints first; every registered layer paints before the simulated
   * contours and labels, so real imagery is always the BASE. Layers without a
   * priority sort last (DEFAULT_LAYER_PRIORITY).
   */
  priority?: number
  /** Whether this layer has content at the current plane/level. */
  appliesTo(plane: PlaneSpec, levelId: string | null): boolean
  /**
   * v4: readiness of a layer with async data (the MRI/CT grids, a photo still
   * decoding), queried BEFORE `draw` so the canvas can tell "still loading"
   * from "nothing here" when draw() paints nothing. Omitted = always 'ready'.
   * draw() is called even while 'loading', because that call starts the fetch.
   */
  dataStatus?(plane: PlaneSpec, levelId: string | null): 'ready' | 'loading' | 'unavailable'
  /** Paint this layer's real imagery in screen space; false = nothing drawn. */
  draw(
    ctx: CanvasRenderingContext2D,
    view: SectionView,
    plane: PlaneSpec,
    layerCtx: SectionLayerContext,
  ): boolean | void
  /** Verbatim attribution line (shown bottom-left whenever the layer drew). */
  credit: string
  sourceLink?: string
}

/** Sort key for layers that do not declare a priority (they paint last). */
export const DEFAULT_LAYER_PRIORITY = 50

export interface SectionImageLayerRegistry {
  registerImageLayer(layer: SectionImageLayer): void
  unregisterImageLayer(id: string): void
  list(): SectionImageLayer[]
}

const WINDOW_REGISTRY_KEY = 'sectionImageLayers'

function createLayerRegistry(): SectionImageLayerRegistry {
  const layers = new Map<string, SectionImageLayer>()
  return {
    registerImageLayer(layer) {
      layers.set(layer.id, layer)
    },
    unregisterImageLayer(id) {
      layers.delete(id)
    },
    list() {
      return Array.from(layers.values())
    },
  }
}

/**
 * The app-wide layer registry, installed on window as `sectionImageLayers`
 * (plan §4: G2 defines the API, G3 registers implementations). The registry
 * is a module-singleton so registrations survive HMR.
 */
export function getSectionImageLayerRegistry(): SectionImageLayerRegistry {
  const globalWindow = window as unknown as Record<string, unknown>
  let registry = globalWindow[WINDOW_REGISTRY_KEY] as SectionImageLayerRegistry | undefined
  if (registry === undefined) {
    registry = createLayerRegistry()
    Object.defineProperty(globalWindow, WINDOW_REGISTRY_KEY, {
      value: registry,
      writable: true,
      configurable: true,
    })
  }
  return registry
}

/** Convenience: register one layer; returns a disposer (imageLayers task). */
export function registerSectionImageLayer(layer: SectionImageLayer): () => void {
  const registry = getSectionImageLayerRegistry()
  registry.registerImageLayer(layer)
  return () => registry.unregisterImageLayer(layer.id)
}

/* ------------------------------------------- real-first layer resolution */

/**
 * Readiness of a layer BEFORE it draws, as reported by its optional
 * `dataStatus` hook: 'ready' = draw() will paint at this plane, 'loading' =
 * its async data is still on the way, 'unavailable' = there is nothing to
 * draw here (no data in this build, fetch failed, or no image mapped to this
 * plane). Only used to phrase the honest hint — draw() is always called even
 * while 'loading', because that call is what starts the fetch.
 */
export type LayerFrameStatus = 'ready' | 'loading' | 'unavailable'

/**
 * Modality precedence for `kind: 'auto'` (plan §4 "real-first default"):
 * an anchored photograph inside its tolerance window → else CT → else MRI →
 * else nothing. The canvas resolves this from the REGISTRY (each layer's own
 * `appliesTo` + `dataStatus`), not by importing the layer implementations:
 * src/components/section/imageLayers.ts registers itself on this module, so
 * importing it back would be a module cycle. imageLayers.resolveSliceModality()
 * is the PiP sampler's equivalent and implements the same documented order.
 */
export const AUTO_MODALITY_ORDER: readonly SectionLayerModality[] = ['stain', 'ct', 'mri']

/** Short labels for the modalities (hint text + credit badge). */
export const MODALITY_LABELS: Record<SectionLayerModality, string> = {
  stain: 'photograph',
  ct: 'CT',
  mri: 'MRI',
}

/** Credit shown bottom-left whenever a real layer drew (unchanged contract). */
export interface ImageryCredit {
  /** Verbatim attribution line — rendered character for character. */
  text: string
  /** Source page for the credit's "open source ↗" link (optional). */
  link?: string
  /** Which modality drew (rendered as a small badge before the credit text). */
  modality: SectionLayerModality
}

/** The layer frame this canvas paints: which modality, which layer, how ready. */
export interface LayerFrame {
  /** The real modality this frame shows; 'none' = simulated only. */
  modality: SectionLayerModality | 'none'
  /** Layer to draw, or null when no layer covers this modality. */
  layer: SectionImageLayer | null
  /** Readiness of `layer` measured before draw() (see LayerFrameStatus). */
  status: LayerFrameStatus
}

/**
 * Resolve the real layer for one frame (pure — exported for QA). `kind` is the
 * store request; 'auto' walks AUTO_MODALITY_ORDER and takes the first modality
 * that can actually draw (a grid whose fetch failed is skipped, so 'auto'
 * degrades to the next modality rather than to a blank panel). Explicit kinds
 * never fall through: a missing/inapplicable layer is reported with its own
 * status so the canvas can name the reason.
 */
export function resolveLayerFrame(
  layers: readonly SectionImageLayer[],
  kind: SectionUnderlayKind,
  plane: PlaneSpec,
  levelId: string | null,
): LayerFrame {
  if (kind === 'none') return { modality: 'none', layer: null, status: 'unavailable' }
  const find = (modality: SectionLayerModality): SectionImageLayer | null =>
    layers.find((layer) => layer.modality === modality) ?? null
  const statusOf = (layer: SectionImageLayer | null): LayerFrameStatus => {
    if (layer === null) return 'unavailable'
    if (!layer.appliesTo(plane, levelId)) return 'unavailable'
    return layer.dataStatus?.(plane, levelId) ?? 'ready'
  }
  if (kind === 'auto') {
    let fallback: LayerFrame | null = null
    for (const modality of AUTO_MODALITY_ORDER) {
      const layer = find(modality)
      const status = statusOf(layer)
      if (status !== 'unavailable') return { modality, layer, status }
      if (layer !== null && fallback === null) fallback = { modality, layer, status }
    }
    // Nothing can paint: keep the best candidate so the hint can name it.
    return fallback ?? { modality: 'none', layer: null, status: 'unavailable' }
  }
  const layer = find(kind)
  return { modality: kind, layer, status: statusOf(layer) }
}

/**
 * The honest one-line state shown whenever no real layer drew (plan §6: "no
 * real data at this plane" states are honest and never blank). Pure and
 * exported for QA. Returns null exactly when real imagery painted — then the
 * layer's verbatim credit is shown in the same bottom-left slot instead.
 */
export function imageryHint(
  kind: SectionUnderlayKind,
  modality: SectionLayerModality | 'none',
  status: LayerFrameStatus,
  drew: boolean,
): string | null {
  if (drew) return null
  if (kind === 'none') return 'simulated only — real imagery is switched off'
  if (status === 'loading' && modality !== 'none') {
    return `loading the real ${MODALITY_LABELS[modality]} imagery… showing the simulated section`
  }
  if (modality === 'stain') {
    return 'no photograph is anchored at this plane — showing the simulated section'
  }
  if (modality === 'ct' || modality === 'mri') {
    return `no real ${MODALITY_LABELS[modality]} imagery at this plane — showing the simulated section`
  }
  return 'no real imagery at this plane — showing the simulated section'
}

/** Registry layers in draw order: ascending priority (plan §4). */
export function layersInDrawOrder(layers: readonly SectionImageLayer[]): SectionImageLayer[] {
  return [...layers].sort(
    (a, b) => (a.priority ?? DEFAULT_LAYER_PRIORITY) - (b.priority ?? DEFAULT_LAYER_PRIORITY),
  )
}

/* --------------------------------------------------- mapping helpers */

function quantizePlane(value: number): number {
  return Math.round(value / PLANE_QUANTIZE_STEP) * PLANE_QUANTIZE_STEP
}

interface Transform {
  axis: PlaneAxis
  u0: number // world u at sx = 0
  v0: number // world v at sy = 0 (top)
  scale: number // css px per au
  width: number
  height: number
}

/** Aspect-fit world→screen mapping with the canonical bounds as extent. */
function computeTransform(axis: PlaneAxis, width: number, height: number): Transform {
  const [uAxis, vAxis] = AXIS_PAIR[axis]
  const uRange = CLIP_BOUNDS[uAxis]
  const vRange = CLIP_BOUNDS[vAxis]
  const uSpan = uRange.max - uRange.min
  const vSpan = vRange.max - vRange.min
  const scale = Math.max(1e-6, Math.min(width / uSpan, height / vSpan))
  return {
    axis,
    // Visible width/height in world units centered on the canonical bounds.
    u0: (uRange.min + uRange.max) / 2 - width / scale / 2,
    v0: (vRange.min + vRange.max) / 2 + height / scale / 2,
    scale,
    width,
    height,
  }
}

function makeView(transform: Transform, plane: PlaneSpec): SectionView {
  return {
    axis: transform.axis,
    value: plane.value,
    width: transform.width,
    height: transform.height,
    uRange: [transform.u0, transform.u0 + transform.width / transform.scale],
    vRange: [transform.v0 - transform.height / transform.scale, transform.v0],
    uToSx: (u) => (u - transform.u0) * transform.scale,
    vToSy: (v) => (transform.v0 - v) * transform.scale,
    sxToU: (sx) => transform.u0 + sx / transform.scale,
    syToV: (sy) => transform.v0 - sy / transform.scale,
  }
}

function samePlane(
  a: { axis: PlaneAxis; value: number } | null,
  b: { axis: PlaneAxis; value: number } | null,
): boolean {
  if (a === null || b === null) return a === b
  return a.axis === b.axis && a.value === b.value
}

function levelIdForPlane(axis: PlaneAxis, value: number): string | null {
  if (axis !== 'y') return null
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const level of levels) {
    const distance = Math.abs(level.y - value)
    if (distance < bestDistance) {
      bestDistance = distance
      best = level.id
    }
  }
  return best !== null && bestDistance <= LEVEL_MAP_WINDOW ? best : null
}

interface PlateChip {
  plateId: string
  levelId: string
  label: string
  distance: number
}

function plateChipFor(value: number): PlateChip | null {
  let best: PlateChip | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const level of levels) {
    const plate = platesForLevel(level.id)[0]
    if (plate === undefined) continue
    const distance = Math.abs(level.y - value)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { plateId: plate.id, levelId: level.id, label: shortLevelName(level.name), distance }
    }
  }
  return bestDistance <= PLATE_CHIP_WINDOW ? best : null
}

function formatValue(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`
}

function polygonAreaOf(path: number[]): number {
  const count = path.length / 2
  if (count < 3) return 0
  let sum = 0
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count
    sum += path[i * 2] * path[j * 2 + 1] - path[j * 2] * path[i * 2 + 1]
  }
  return Math.abs(sum) / 2
}

/* ------------------------------------------------------------ component */

/** Per-slug visibility gating shared by drawing and hit-testing. */
function isPartVisible(
  meta: SectionPartMeta,
  layers: { regions: Set<string>; kinds: Set<string> },
): boolean {
  if (meta.region !== null && !layers.regions.has(meta.region)) return false
  const taxonomyKind = meta.taxonomyKind ?? (kindByTaxonomy[meta.kind] ?? meta.kind)
  return layers.kinds.has(taxonomyKind)
}

/** Click/drag writes clamp to the canonical slider ranges (letterbox-safe). */
function clampToBounds(axis: PlaneAxis, value: number): number {
  const range = CLIP_BOUNDS[axis]
  return Math.min(range.max, Math.max(range.min, value))
}

export interface SectionCanvasProps {
  /**
   * Called after the plate chip snaps the plane and selects the authored
   * plate (§2.2 "one-click snap" — the host shows the plate, e.g. by
   * switching the Plates tab out of live mode). Optional.
   */
  onOpenPlate?: () => void
}

export default function SectionCanvas({ onOpenPlate }: SectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // React-side store reads (drive the overlay UI; the draw loop reads the
  // store imperatively so slider drags never re-render the component).
  const clip = useAtlasStore((s) => s.clip)
  const sectionAxis = useAtlasStore((s) => s.sectionAxis)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const hoveredId = useAtlasStore((s) => s.hoveredId)

  const geometryStatus = useSectionGeometryStatus()
  // The rAF draw loop outlives renders (stored store-subscribe closure), so
  // render-scoped values reach it through a ref.
  const geometryStatusRef = useRef(geometryStatus)
  geometryStatusRef.current = geometryStatus
  const [workerError, setWorkerError] = useState<string | null>(null)
  const [credit, setCredit] = useState<ImageryCredit | null>(null)
  const [hint, setHint] = useState<string | null>(null)

  // Imperative render state.
  const transformRef = useRef<Transform | null>(null)
  const contoursRef = useRef<Map<string, SectionContourPart>>(new Map())
  const loopsTotalRef = useRef(0)
  const hoverRef = useRef<{ slug: string; group: string; u: number; v: number } | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const workerAliveRef = useRef(false)
  const workerReadyRef = useRef(false)
  const registrySentRef = useRef(false)
  const seqRef = useRef(0)
  const lastPostRef = useRef(0)
  const inFlightRef = useRef<{ seq: number; axis: PlaneAxis; value: number } | null>(null)
  const pendingRef = useRef<{ axis: PlaneAxis; value: number } | null>(null)
  /** Plane of the contours currently held (last computed by the worker) —
   *  guards pumpPlane against re-posting a plane the worker already has. */
  const computedRef = useRef<{ axis: PlaneAxis; value: number } | null>(null)
  const postTimerRef = useRef(0)
  const rafRef = useRef(0)
  const drawNeededRef = useRef(false)
  const lastCreditRef = useRef<string | null>(null)
  const lastHintRef = useRef<string | null>(null)

  /* ------------------------------------------------------------- worker */

  useEffect(() => {
    // StrictMode remount: the worker is re-created, so the init handshake
    // must replay (registrySent goes stale across the cleanup below).
    registrySentRef.current = false
    workerReadyRef.current = false
    const worker = new Worker(new URL('./contourWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    workerAliveRef.current = true
    worker.onmessage = (event: MessageEvent<SectionWorkerResponse>) => {
      const message = event.data
      if (message.t === 'error') {
        workerAliveRef.current = false
        setWorkerError(message.message)
        return
      }
      if (message.t === 'ready') {
        workerReadyRef.current = true
        pumpPlane()
        scheduleDraw()
        return
      }
      if (message.t === 'contours') {
        // Ack: the in-flight request is settled; a trailing pending wins.
        if (inFlightRef.current !== null && inFlightRef.current.seq === message.seq) {
          inFlightRef.current = null
        }
        computedRef.current = { axis: message.axis, value: message.value }
        const next = new Map<string, SectionContourPart>()
        for (const part of message.parts) next.set(part.slug, part)
        contoursRef.current = next
        loopsTotalRef.current = message.loopCount
        pumpPlane()
        scheduleDraw()
      }
    }
    worker.onerror = () => {
      workerAliveRef.current = false
      setWorkerError('contour worker crashed')
    }
    worker.onmessageerror = () => {
      workerAliveRef.current = false
      setWorkerError('contour worker protocol error')
    }
    return () => {
      worker.terminate()
      workerRef.current = null
      workerAliveRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Worker loop: post the newest quantized plane, throttled to ≤15 Hz and
   *  trailing behind in-flight requests (coalesced in both directions). */
  function pumpPlane(): void {
    const state = useAtlasStore.getState()
    const axis = state.sectionAxis
    const value = quantizePlane(state.clip[axis])
    pendingRef.current = { axis, value }
    if (!workerReadyRef.current || !workerAliveRef.current) return
    // The worker already holds (or answered) this plane — nothing to post.
    if (samePlane(pendingRef.current, computedRef.current)) {
      pendingRef.current = null
      return
    }
    if (inFlightRef.current !== null) return // the ack re-pumps
    if (samePlane(pendingRef.current, inFlightRef.current)) {
      pendingRef.current = null
      return
    }
    const now = performance.now()
    const remaining = POST_INTERVAL_MS - (now - lastPostRef.current)
    // Wait only when a previous post happened within the 15 Hz window.
    if (remaining > 0 && lastPostRef.current !== 0) {
      if (postTimerRef.current !== 0) return
      postTimerRef.current = window.setTimeout(() => {
        postTimerRef.current = 0
        pumpPlane()
      }, remaining)
      return
    }
    postPlane(pendingRef.current)
  }

  function postPlane(plane: { axis: PlaneAxis; value: number }): void {
    const worker = workerRef.current
    if (worker === null || !workerReadyRef.current || !workerAliveRef.current) return
    const seq = ++seqRef.current
    inFlightRef.current = { seq, ...plane }
    lastPostRef.current = performance.now()
    pendingRef.current = null
    const message: SectionWorkerRequest = { t: 'plane', seq, axis: plane.axis, value: plane.value }
    worker.postMessage(message)
  }

  /** Reactive re-pump: any clip/sectionAxis change feeds the worker. */
  useEffect(() => {
    pumpPlane()
    scheduleDraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.x, clip.y, clip.z, sectionAxis, geometryStatus.readyCount])

  /* --------------------------------------------------------- draw loop */

  function scheduleDraw(): void {
    if (drawNeededRef.current) return
    drawNeededRef.current = true
    rafRef.current = requestAnimationFrame(() => {
      drawNeededRef.current = false
      draw()
    })
  }

  function draw(): void {
    // Perf guard: the tab is hidden — paint nothing (rAF is throttled to a
    // stop anyway; this also skips resize-driven and worker-result draws).
    // The visibilitychange listener below reschedules a draw on return.
    if (typeof document !== 'undefined' && document.hidden) return
    const canvas = canvasRef.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    const state = useAtlasStore.getState()
    const axis = state.sectionAxis
    const planeValue = state.clip[axis]
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width <= 2 || height <= 2) return
    const dpr = Math.min(window.devicePixelRatio || 1, CANVAS_MAX_DPR)
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const transform = computeTransform(axis, width, height)
    transformRef.current = transform
    const plane: PlaneSpec = { axis, value: planeValue }
    const view = makeView(transform, plane)

    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, width, height)

    drawGrid(ctx, view, transform)

    /* ---- real imagery: the section's BASE layer (v4 real-first, plan §4) ----
     * ONE modality per frame: `kind` is the store request, resolveLayerFrame()
     * turns it into a single layer (auto = anchored photo → CT → MRI — see
     * AUTO_MODALITY_ORDER) and the layers in turn paint only when
     * `layerCtx.modality` matches their own tag. Layers are visited in
     * ascending `priority`; the first one that reports having painted supplies
     * the credit shown bottom-left. */
    const underlay = state.sectionUnderlay
    const levelId = levelIdForPlane(axis, planeValue)
    const orderedLayers = layersInDrawOrder(getSectionImageLayerRegistry().list())
    const frame = resolveLayerFrame(orderedLayers, underlay.kind, plane, levelId)
    const layerCtx: SectionLayerContext = {
      opacity: underlay.opacity,
      levelId,
      kind: underlay.kind,
      modality: frame.modality,
      windowMin: underlay.windowMin,
      windowMax: underlay.windowMax,
      ctWindowPreset: underlay.ctWindowPreset,
    }
    let drewReal = false
    let drawnCredit: ImageryCredit | null = null
    if (underlay.kind !== 'none') {
      const paint = (
        layer: SectionImageLayer,
      ): { painted: boolean; credit: ImageryCredit | null } => {
        if (!layer.appliesTo(plane, levelId)) return { painted: false, credit: null }
        const painted = layer.draw(ctx, view, plane, layerCtx) !== false
        return {
          painted,
          credit: painted
            ? { text: layer.credit, link: layer.sourceLink, modality: layer.modality ?? 'stain' }
            : null,
        }
      }
      // v3 registrants predate the modality tag: they cannot be named by the
      // switcher, so they paint first (their own appliesTo/draw still gate
      // them) — the v3 registry contract keeps working unchanged. Then the
      // frame's resolved modality layer, in ascending priority order; the first
      // layer that reports a paint supplies the credit rendered bottom-left.
      const candidates: SectionImageLayer[] = [
        ...orderedLayers.filter((layer) => layer.modality === undefined),
        ...(frame.layer !== null ? [frame.layer] : []),
      ]
      for (const layer of candidates) {
        const result = paint(layer)
        if (!result.painted) continue
        drewReal = true
        if (drawnCredit === null) drawnCredit = result.credit
      }
    }
    if (lastCreditRef.current !== (drawnCredit === null ? '' : drawnCredit.text)) {
      lastCreditRef.current = drawnCredit === null ? '' : drawnCredit.text
      setCredit(drawnCredit)
    }
    // Real imagery is the base plate only when it actually painted AND the
    // real-first compositing is on; otherwise the simulated section IS the
    // base (v3 rendering, unchanged).
    const realBase = drewReal && underlay.realFirst
    const hint = imageryHint(underlay.kind, frame.modality, frame.status, drewReal)
    if (lastHintRef.current !== hint) {
      lastHintRef.current = hint
      setHint(hint)
    }

    /* ---- simulated contours: context → ventricle → nucleus ---- */
    const highlight = highlightIdSet({ selectedId: state.selectedId, syndromeId: state.syndromeId })
    const strokeOnly = loopsTotalRef.current > DEGRADE_LOOP_LIMIT
    const visibleParts = SECTION_PARTS.filter(
      (meta) => contoursRef.current.has(meta.slug) && isPartVisible(meta, state.layers),
    ).sort((a, b) => SECTION_KIND_ORDER.indexOf(a.kind) - SECTION_KIND_ORDER.indexOf(b.kind))

    for (const meta of visibleParts) {
      const part = contoursRef.current.get(meta.slug) as SectionContourPart
      const inHighlight = highlight === null || highlight.has(meta.group)
      drawPart(ctx, meta, part, transform, {
        strokeOnly,
        overlay: realBase,
        dim: highlight !== null && !inHighlight,
        selected: meta.group === state.selectedId,
        hovered: meta.group === state.hoveredId,
      })
    }

    /* ---- labels last: over the base plate AND the contour fills ---- */
    for (const meta of visibleParts) {
      if (meta.group !== state.selectedId) continue
      const part = contoursRef.current.get(meta.slug) as SectionContourPart
      if (part.loops.length > 0) drawSelectedLabel(ctx, meta, part, transform)
    }

    /* ---- crosshair at the other two sliders ---- */
    drawCrosshair(ctx, transform, axis, state.clip)

    /* ---- in-canvas overlays ---- */
    drawOrientation(ctx, axis, transform)
    drawReadout(ctx, axis, planeValue, transform)
    drawHoverLabel(ctx, transform)
    if (geometryStatusRef.current.readyCount < geometryStatusRef.current.total) {
      ctx.fillStyle = 'rgba(13, 21, 38, 0.72)'
      ctx.fillRect(0, height - 26, width, 26)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px system-ui, sans-serif'
      ctx.fillText(
        `Loading anatomy meshes ${geometryStatusRef.current.readyCount}/${geometryStatusRef.current.total}…`,
        10,
        height - 9,
      )
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, view: SectionView, transform: Transform): void {
    ctx.save()
    ctx.strokeStyle = GRID_STROKE
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let u = Math.ceil(view.uRange[0] / 10) * 10; u <= view.uRange[1]; u += 10) {
      const sx = Math.round(view.uToSx(u)) + 0.5
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx, transform.height)
    }
    for (let v = Math.ceil(view.vRange[0] / 10) * 10; v <= view.vRange[1]; v += 10) {
      const sy = Math.round(view.vToSy(v)) + 0.5
      ctx.moveTo(0, sy)
      ctx.lineTo(transform.width, sy)
    }
    ctx.stroke()
    ctx.restore()
  }

  interface DrawStyle {
    strokeOnly: boolean
    /** Real-first: a real image is the base, contours are a translucent overlay. */
    overlay: boolean
    dim: boolean
    selected: boolean
    hovered: boolean
  }

  function drawPart(
    ctx: CanvasRenderingContext2D,
    meta: SectionPartMeta,
    part: SectionContourPart,
    transform: Transform,
    style: DrawStyle,
  ): void {
    if (part.loops.length === 0) return
    // Overlay mode keeps the kind hierarchy (context < ventricle < nucleus) and
    // scales the whole contour layer down so the photo underneath stays the
    // primary content; the selected part is deliberately NOT scaled (plan §4
    // "selection highlight unaffected").
    const fillAlpha = style.dim
      ? DIM_ALPHA
      : style.selected
        ? Math.min(1, SECTION_KIND_ALPHA[meta.kind] + 0.2)
        : style.overlay
          ? SECTION_KIND_ALPHA[meta.kind] * CONTOUR_OVERLAY_ALPHA
          : SECTION_KIND_ALPHA[meta.kind]
    const strokeAlpha = style.dim
      ? 0.4
      : style.selected || style.hovered
        ? 1
        : style.overlay
          ? CONTOUR_OVERLAY_STROKE_ALPHA
          : 0.75
    const path = new Path2D()
    buildPartPath(path, part, transform)

    ctx.save()
    if (!style.strokeOnly) {
      ctx.globalAlpha = fillAlpha
      ctx.fillStyle = meta.color
      ctx.fill(path, 'evenodd')
    }
    ctx.globalAlpha = strokeAlpha
    ctx.strokeStyle = style.selected ? SELECTION_STROKE : style.hovered ? HOVER_STROKE : meta.color
    ctx.lineWidth = style.selected ? 2.2 : style.hovered ? 1.8 : 0.9
    ctx.stroke(path)
    ctx.restore()
    // Labels are drawn in a second pass over every part (see draw()), so a
    // later-painted fill can never cover the selected structure's name.
  }

  function buildPartPath(path: Path2D, part: SectionContourPart, transform: Transform): void {
    for (const loop of part.loops) {
      const count = loop.length / 2
      if (count < 3) continue
      path.moveTo((loop[0] - transform.u0) * transform.scale, (transform.v0 - loop[1]) * transform.scale)
      for (let i = 1; i < count; i++) {
        path.lineTo(
          (loop[i * 2] - transform.u0) * transform.scale,
          (transform.v0 - loop[i * 2 + 1]) * transform.scale,
        )
      }
      path.closePath()
    }
  }

  function drawSelectedLabel(
    ctx: CanvasRenderingContext2D,
    meta: SectionPartMeta,
    part: SectionContourPart,
    transform: Transform,
  ): void {
    let loop = part.loops[0]
    let bestArea = -1
    for (const candidate of part.loops) {
      const area = polygonAreaOf(candidate)
      if (area > bestArea) {
        bestArea = area
        loop = candidate
      }
    }
    let cx = 0
    let cy = 0
    const count = loop.length / 2
    for (let i = 0; i < count; i++) {
      cx += loop[i * 2]
      cy += loop[i * 2 + 1]
    }
    cx /= count
    cy /= count
    const sx = (cx - transform.u0) * transform.scale
    const sy = (transform.v0 - cy) * transform.scale
    const entry = getTaxonomyEntry(meta.group)
    const name = entry?.name ?? meta.group
    ctx.save()
    ctx.font = '600 11px system-ui, sans-serif'
    const textWidth = ctx.measureText(name).width
    const boxX = Math.max(2, Math.min(transform.width - textWidth - 12, sx - textWidth / 2 - 5))
    const boxY = Math.max(2, sy - 24)
    ctx.fillStyle = 'rgba(13, 21, 38, 0.85)'
    ctx.fillRect(boxX, boxY, textWidth + 10, 18)
    ctx.strokeStyle = SELECTION_STROKE
    ctx.lineWidth = 1
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, textWidth + 9, 17)
    ctx.fillStyle = '#fcd34d'
    ctx.fillText(name, boxX + 5, boxY + 13)
    ctx.restore()
  }

  function drawCrosshair(
    ctx: CanvasRenderingContext2D,
    transform: Transform,
    axis: PlaneAxis,
    clipState: { x: number; y: number; z: number },
  ): void {
    const [uAxis, vAxis] = AXIS_PAIR[axis]
    const uValue = clipState[uAxis]
    const vValue = clipState[vAxis]
    ctx.save()
    ctx.strokeStyle = CROSSHAIR_STROKE
    ctx.lineWidth = 1
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    const sx = Math.round((uValue - transform.u0) * transform.scale) + 0.5
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, transform.height)
    const sy = Math.round((transform.v0 - vValue) * transform.scale) + 0.5
    ctx.moveTo(0, sy)
    ctx.lineTo(transform.width, sy)
    ctx.stroke()
    ctx.restore()
  }

  function drawOrientation(ctx: CanvasRenderingContext2D, axis: PlaneAxis, transform: Transform): void {
    const badges = DIRECTION_BADGES[axis]
    const radius = 10
    const margin = 16
    const positions: Array<[string, number, number]> = [
      [badges.left, margin, margin],
      [badges.right, transform.width - margin, margin],
      [badges.top, transform.width / 2, margin],
      [badges.bottom, transform.width / 2, transform.height - margin],
    ]
    ctx.save()
    ctx.font = '600 10px system-ui, sans-serif'
    for (const [letter, x, y] of positions) {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(13, 21, 38, 0.75)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(letter, x, y + 0.5)
    }
    ctx.restore()
  }

  function drawReadout(ctx: CanvasRenderingContext2D, axis: PlaneAxis, value: number, transform: Transform): void {
    ctx.save()
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'
    const text = `${AXIS_CAPTION[axis]} — ${axis} = ${formatValue(value)} au`
    ctx.fillStyle = 'rgba(13, 21, 38, 0.75)'
    ctx.fillRect(8, transform.height - 68, 250, 20)
    ctx.fillStyle = '#cbd5e1'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 14, transform.height - 58)
    ctx.restore()
  }

  function drawHoverLabel(ctx: CanvasRenderingContext2D, transform: Transform): void {
    const hover = hoverRef.current
    if (hover === null || !contoursRef.current.has(hover.slug)) return
    const entry = getTaxonomyEntry(hover.group)
    const name = entry?.name ?? hover.group
    const sx = (hover.u - transform.u0) * transform.scale
    const sy = (transform.v0 - hover.v) * transform.scale
    ctx.save()
    ctx.font = '11px system-ui, sans-serif'
    const textWidth = ctx.measureText(name).width
    const x = Math.max(2, Math.min(transform.width - textWidth - 12, sx + 12))
    const y = Math.max(2, Math.min(transform.height - 22, sy - 22))
    ctx.fillStyle = 'rgba(13, 21, 38, 0.85)'
    ctx.fillRect(x, y, textWidth + 10, 18)
    ctx.fillStyle = '#e0f2fe'
    ctx.fillText(name, x + 5, y + 13)
    ctx.restore()
  }

  /* --------------------------------------------------------- init registry */

  useEffect(() => {
    if (registrySentRef.current || workerError !== null) return
    if (geometryStatus.readyCount < geometryStatus.total) return
    registrySentRef.current = true
    const worker = workerRef.current
    if (worker === null || !workerAliveRef.current) return
    const registryParts: WorkerRegistryPart[] = []
    for (const meta of SECTION_PARTS) {
      const geometry = geometryStatus.geometries.get(meta.slug) ?? null
      if (geometry === null) continue
      const part = registryPartFromGeometry(meta, geometry)
      if (part !== null) registryParts.push(part)
    }
    if (registryParts.length === 0) {
      setWorkerError('no anatomy geometry loaded')
      return
    }
    const transfer: Transferable[] = []
    for (const part of registryParts) {
      transfer.push(part.positions, part.indices)
    }
    const message: SectionWorkerRequest = { t: 'init', parts: registryParts }
    worker.postMessage(message, transfer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryStatus.readyCount, geometryStatus.total, workerError])

  /* --------------------------------------------------------- interactions */

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): { u: number; v: number } | null {
    const canvas = canvasRef.current
    const transform = transformRef.current
    if (canvas === null || transform === null) return null
    const rect = canvas.getBoundingClientRect()
    const sx = event.clientX - rect.left
    const sy = event.clientY - rect.top
    return { u: transform.u0 + sx / transform.scale, v: transform.v0 - sy / transform.scale }
  }

  function hitTest(u: number, v: number): { slug: string; group: string } | null {
    const state = useAtlasStore.getState()
    const candidates = SECTION_PARTS.filter(
      (meta) => contoursRef.current.has(meta.slug) && isPartVisible(meta, state.layers),
    ).sort((a, b) => SECTION_KIND_ORDER.indexOf(b.kind) - SECTION_KIND_ORDER.indexOf(a.kind))
    for (const meta of candidates) {
      const part = contoursRef.current.get(meta.slug) as SectionContourPart
      if (pointInLoops(part.loops, u, v)) return { slug: meta.slug, group: meta.group }
    }
    return null
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event)
    if (point === null) return
    const hit = hitTest(point.u, point.v)
    const group = hit === null ? null : hit.group
    const previous = hoverRef.current === null ? null : hoverRef.current.group
    if (group !== previous) {
      hoverRef.current = hit === null ? null : { slug: hit.slug, group: hit.group, u: point.u, v: point.v }
      const state = useAtlasStore.getState()
      if (group !== null && state.hoveredId !== group) state.setHovered(group)
      if (group === null && state.hoveredId !== null) state.setHovered(null)
      if (canvasRef.current !== null) {
        canvasRef.current.style.cursor = group === null ? 'crosshair' : 'pointer'
      }
    } else if (hit !== null) {
      hoverRef.current = { slug: hit.slug, group: hit.group, u: point.u, v: point.v }
    }
    scheduleDraw()
  }

  const handlePointerLeave = () => {
    hoverRef.current = null
    const state = useAtlasStore.getState()
    if (state.hoveredId !== null) state.setHovered(null)
    if (canvasRef.current !== null) canvasRef.current.style.cursor = 'crosshair'
    scheduleDraw()
  }

  const handleClick = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event)
    if (point === null) return
    const state = useAtlasStore.getState()
    const axis = state.sectionAxis
    // Click sets the OTHER two clip sliders (crosshair placement) and pins
    // the section axis to this canvas' axis. u/v are canonical world values
    // recovered through the SAME transform the canvas draws with (§2.2
    // mirrored mapping is baked into uToSx/vToSy, so the inverse needs no
    // extra sign flip); clamped to the slider ranges so letterbox clicks
    // cannot push a slider out of bounds.
    const partial: Partial<{ x: number; y: number; z: number }> =
      axis === 'y'
        ? { x: clampToBounds('x', point.u), z: clampToBounds('z', point.v) }
        : axis === 'x'
          ? { z: clampToBounds('z', point.u), y: clampToBounds('y', point.v) }
          : { x: clampToBounds('x', point.u), y: clampToBounds('y', point.v) }
    state.setClip(partial)
    state.setSectionAxis(axis)
  }

  /* --------------------------------------------------------- resize + store */

  useEffect(() => {
    const wrap = wrapRef.current
    if (wrap === null) return
    const observer = new ResizeObserver(() => scheduleDraw())
    observer.observe(wrap)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Any store change → redraw (crosshair/selection/underlay react live).
  useEffect(() => useAtlasStore.subscribe(() => scheduleDraw()), [])

  // Returning to the tab: repaint once (draws were skipped while hidden).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) scheduleDraw()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== 0) cancelAnimationFrame(rafRef.current)
      if (postTimerRef.current !== 0) window.clearTimeout(postTimerRef.current)
    }
  }, [])

  /* ------------------------------------------------------------- chip */

  const plateChip = useMemo(() => (sectionAxis === 'y' ? plateChipFor(clip.y) : null), [sectionAxis, clip.y])
  const hoveredEntry = hoveredId !== null ? getTaxonomyEntry(hoveredId) : null
  const selectedEntry = selectedId !== null ? getTaxonomyEntry(selectedId) : null
  const showHoveredEntry = hoveredEntry != null && hoveredEntry.id !== selectedId

  return (
    <div
      ref={wrapRef}
      className="section-canvas-wrap"
      role="img"
      aria-label={`Live 2D ${AXIS_CAPTION[sectionAxis]} synced to the clip slider`}
    >
      <canvas
        ref={canvasRef}
        className="section-canvas"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />
      {workerError !== null && (
        <div className="section-overlay-note is-error">Contour worker failed: {workerError}</div>
      )}
      {credit !== null && (
        <a
          className="section-credit"
          href={credit.link ?? undefined}
          target={credit.link !== undefined ? '_blank' : undefined}
          rel="noreferrer"
          title={
            credit.link !== undefined
              ? `Verbatim attribution of the imagery shown — open source in a new tab: ${credit.link}`
              : 'Verbatim attribution of the imagery shown'
          }
        >
          {/* Modality badge + the EXACT credit line, which stays verbatim and
              contiguous so it can be copied/checked character for character. */}
          <span className="section-credit-modality" style={{ color: '#94a3b8' }}>
            {MODALITY_LABELS[credit.modality]} ·{' '}
          </span>
          {credit.text}
          {credit.link !== undefined && <span aria-hidden="true"> ↗</span>}
        </a>
      )}
      {credit === null && hint !== null && (
        // Honest imagery state (plan §6): shown in the credit's bottom-left
        // slot whenever no real layer drew, so the panel is never blank about
        // why the simulated section is the only thing on screen.
        <div
          className="section-imagery-hint"
          role="note"
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            maxWidth: 'min(560px, 72%)',
            padding: '4px 8px',
            background: 'rgba(13, 21, 38, 0.82)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: '0.7rem',
            lineHeight: 1.35,
          }}
        >
          {hint}
        </div>
      )}
      {plateChip !== null && (
        <button
          type="button"
          className="section-plate-chip"
          onClick={() => {
            const state = useAtlasStore.getState()
            const level = getLevel(plateChip.levelId)
            if (level !== undefined) state.setClip({ y: level.y, showHelper: true })
            state.setPlate(plateChip.plateId)
            // §2.2 "— open": hand the plate open to the host (the Plates tab
            // switches to the authored-plate view); no-op when absent.
            onOpenPlate?.()
          }}
          title={`Snap the plane to “${plateChip.label}” and open its authored plate`}
        >
          <span className="dot" aria-hidden="true" />
          ≈ {plateChip.label} ({plateChip.distance.toFixed(1)} au) — open
        </button>
      )}
      {(selectedEntry != null || showHoveredEntry) && (
        <div className="section-structure-chip">
          {selectedEntry != null && <span className="is-selected">{selectedEntry.name}</span>}
          {showHoveredEntry && hoveredEntry != null && (
            <span className="is-hovered">{hoveredEntry.name}</span>
          )}
        </div>
      )}
    </div>
  )
}
