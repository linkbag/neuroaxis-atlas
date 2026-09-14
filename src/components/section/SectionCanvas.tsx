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
 *   4. v9 cortical divisions (§2, `Cortical divisions` toggle): the fitted
 *      lobe/division partition of the DERIVED cortical ribbon, stroked and
 *      filled OVER the context fill from pass 3 — never replacing it — with one
 *      label per division present, plus a legend that carries the honest caveat
 *      verbatim (`CORTICAL_LOBE_METHOD_NOTE`). `corticalLobes.ts` holds the
 *      fitted boundaries with their measurement and residuals;
 *      `drawCorticalLobes` below is the pass;
 *   5. labels (selected-structure name + hover), then crosshair, orientation
 *      badges and the plane readout.
 * When no real layer drew, an honest hint replaces the credit line in the same
 * bottom-left slot (imageryHint) — the panel is never silently blank.
 *
 * v9 cortical divisions — what is deliberately NOT here:
 *  - the worker does not know about divisions. The partition is applied to the
 *    loop vertices `contourWorker` already returns, on the main thread, so the
 *    worker protocol and `verify:pipeline` are untouched (the worker's header
 *    states the same);
 *  - the toggle is not a `Kind` (that also gates the 3D scene) and not `hidden`
 *    (a set of record ids): it is the store boolean `sectionLobes`, owned by the
 *    v9 `section-ux` task. `readLobeLayerFlag` prefers that field and falls back
 *    to the persisted `neuroaxis.sectionLobes` key, so the layer works before
 *    and after that field lands;
 *  - the division geometry is cached per render-order build (`buildLobeLayer`),
 *    so a frame that changed no plane/axis/selection re-splits nothing and the
 *    memoization contract below is preserved: switching the layer repaints, it
 *    does not invalidate the contour paths.
 *
 * v10 (docs/SWARM_V10_PLAN.md §4/§5, task `cortical-divisions-quality`) — two
 * behaviour changes, both in this file:
 *  - the divisions STOP painting slivers and long thin wedges: `corticalLobes.ts`
 *    absorbs every run below its documented floors (arc ≥ 10 au, drawn area
 *    ≥ 25 au²), and here the label anchor competes by DRAWN AREA
 *    (`labelAreaAu2`) instead of by vertex count, with the label pass gated on
 *    `MIN_DIVISION_LABEL_AREA_AU2`. A division can therefore no longer be
 *    *named* on a triangle — that was the reported "TEMPORAL on a wedge";
 *  - `NO_CANVAS_LABEL_RECORD_IDS` suppresses the TEXT of the
 *    `ctx-cerebral-cortex` context envelope while its contour and fill keep
 *    drawing: `drawSelectedLabel`, `drawHoverLabel` and the
 *    `.section-structure-chip` are gated on it, so the name is gone from the
 *    canvas (Plates AND the PiP, which mounts this same component) and from the
 *    accessibility tree. Every other context label — the thalamus envelope, the
 *    level chips, the division labels — is untouched.
 *
 * v11 §2 (PLAN.md §2) — ONE visibility decision, named at every use site:
 *  - `isPartVisible` is THE 2D decision, exported so
 *    `scripts/verify/view-filter-consistency.mjs` can execute it against the 3D
 *    predicate and prove the two surfaces agree part by part. It is the only
 *    place this file reads `layers.regions` / `layers.kinds` (the gate asserts
 *    that too), and the draw pass, the hit test (both through
 *    `ensureRenderOrder`) and the PiP (which mounts this component with no
 *    visibility prop) all consume it;
 *  - `buildLobeLayer` now re-applies it with the layer sets the visible list was
 *    filtered from (`RenderOrderCache.visibleLayers`). It used to be correct
 *    only because its input happened to be pre-filtered; a caller passing the
 *    raw catalogue would have painted the whole telencephalon with the area off;
 *  - the division rule itself is the shared `corticalRunsForLoop`
 *    (section/corticalLobes.ts), so the canvas, the legend and both committed
 *    gates are one computation.
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
 *
 * Performance — per-frame work (QUALITY_PLAN §3 item 9, AUDIT §2.13):
 * `draw()` no longer rebuilds its per-plane render order. ONE cache object
 * (`RenderOrderCache`) is computed only when the render key changes, i.e. on
 * (plane · axis · layers · selection · syndrome · contour generation · layer
 * registry), and holds:
 *
 *  - the visible-part list, already sorted into draw order (and the mirrored
 *    front-to-back list `visibleFaces` used by pointer hit-testing and by the
 *    zoomed/precise hover probe), so the pointermove path no longer runs
 *    `SECTION_PARTS.filter().sort()` per pointer event (AUDIT §2.13 verbatim);
 *  - the layer draw order (`layersInDrawOrder`), so the registry sort is not
 *    redone per frame;
 *  - the nearest-level lookup `levelIdForPlane(axis, plane)` (a linear scan of
 *    levels.json) — a function of axis + plane only;
 *  - one `Path2D` per visible part, reused until the contours change (worker
 *    result) or the transform changes (plane/viewport), bounded by a BYTE
 *    budget (PATH2D_BUDGET_BYTES) so a long drag cannot accumulate paths.
 *
 * The frame-varying remainder — the layer FRAME resolution (dataStatus is
 * async-arrival sensitive, so it must be re-asked every draw), the credit,
 * the hint and the interaction state — is deliberately NOT cached.
 *
 * Structure of a frame (QUALITY_PLAN §5 item 17, AUDIT §2.23):
 * `draw()` was one 145-line function that also owned the canvas sizing,
 * interaction and diagnostics. It is now a four-pass pipeline — the passes and
 * their order are exactly as before, only the ownership moved:
 *
 *   1. `beginSectionFrame()`   TRANSFORM — hidden-tab guard, backing-store size
 *                              and dpr, the SHARED `planeTransform`, and the
 *                              memoized `RenderOrderCache`. Returns null when
 *                              there is nothing to paint.
 *   2. `drawSectionLayers()`   LAYERS — background, grid, and the real-imagery
 *                              base plate (registry order + credit + hint).
 *                              Returns whether contours overlay a real base.
 *   3. `drawSectionContours()` CONTOURS — the cached visible parts in draw
 *                              order, then the selected structure's label.
 *   4. `drawSectionOverlays()` OVERLAYS — crosshair, orientation badge, plane
 *                              readout, hover label, geometry-loading notice.
 *
 * Interaction (pointer, click, wheel, keyboard), the registry and the worker
 * plumbing stay in the component below; none of them is part of a paint pass.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react'
import { getLevel, getTaxonomyEntry, levels, platesForLevel, shortLevelName } from '../../data/load'
import {
  highlightIdSet,
  useAtlasStore,
  type CtWindowPreset,
  type SectionUnderlayKind,
} from '../../state/store'
import {
  AXIS_PAIR,
  PLANE_BADGES,
  PLANE_CAPTION,
  axisExtents,
  nearestLevelTo,
  planeTransform,
  type PlaneTransform,
} from './planeGeometry'
import { pointInLoops, type PlaneAxis, type PlaneSpec } from './contours'
// v9 task `cortical-lobes` (docs/SWARM_V9_PLAN.md §2): the toggleable rough
// cortical-division layer. The partition is computed HERE, on the main thread,
// from the worker's unmodified contour loops (see contourWorker.ts's header for
// why the protocol is untouched) — so the layer cannot change what the worker
// returns and `verify:pipeline` cannot regress.
import {
  CORTICAL_DIVISION_COLORS,
  CORTICAL_DIVISION_LABELS,
  CORTICAL_DIVISION_SHORT_LABELS,
  CORTICAL_DIVISIONS,
  CORTICAL_LOBES_FILL_ALPHA,
  CORTICAL_LOBES_STROKE_ALPHA,
  CORTICAL_LOBE_METHOD_NOTE,
  MIN_DIVISION_LABEL_AREA_AU2,
  corticalRunMetrics,
  corticalRunsForLoop,
  type CorticalDivision,
} from './corticalLobes'
// v7 closure (gap 3): the CT source-coverage statement — the SAME function the
// Plates toolbar renders its `.is-ct-coverage` note from, so the canvas hint and
// the toolbar can never state two different limits.
import { ctCoverageStatement } from './imageLayers'
import type { SectionContourPart, SectionWorkerRequest, SectionWorkerResponse, WorkerRegistryPart } from './contourWorker'
import type { TaxonomyEntry } from '../../types'
import {
  SECTION_KIND_ALPHA,
  SECTION_KIND_ORDER,
  SECTION_PARTS,
  isCorticalRibbonSlug,
  partsForCanvas,
  registryNerveParts,
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
 * v10 §5 — records whose TEXT this canvas does not draw, while every other pass
 * (contour, fill, selection highlight, hit test) still treats them normally.
 *
 * `ctx-cerebral-cortex` ("Cerebral cortex (context envelope)", taxonomy.json) is
 * the DERIVED cortical ribbon shell. Two reasons, both measured in the v10
 * report:
 *  1. the outline is self-evident — it IS the cortex, drawn as a grey envelope
 *     around everything else, so naming it adds no information;
 *  2. the name was drawn up to twice per frame (the selected-structure label AND
 *     the hover label) and, being anchored at the centroid of the biggest loop,
 *     it landed on top of the cortical-division labels — the text it collided
 *     with is the one that does carry information.
 * It is removed from the ACCESSIBILITY tree too, not just visually: the canvas
 * is a single role="img" with a fixed aria-label and contributes no text, so the
 * only accessible instance of the name this component owns is the
 * `.section-structure-chip` below — which is why the chip is gated on the same
 * set. The other context envelopes (thalamus, level chips, division labels) keep
 * their labels.
 */
export const NO_CANVAS_LABEL_RECORD_IDS: ReadonlySet<string> = new Set(['ctx-cerebral-cortex'])

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

/* ------------------------------------------------- v9 cortical-lobe layer */

/**
 * localStorage key + state ownership of the cortical-division layer.
 *
 * Plan §6 assigns the field `sectionLobes` and its key `neuroaxis.sectionLobes`
 * to the v9 task `section-ux` (`src/state/store.ts`), which this task does not
 * own. The canvas therefore reads the store field DEFENSIVELY
 * (`readLobeLayerFlag`) and keeps a module-scoped fallback for the moment before
 * the field lands, so the layer is one toggle either way and the persisted
 * preference survives a mid-session hot update. When `store.sectionLobes`
 * exists it wins and `setSectionLobes` writes both it and this key.
 */
const LOBES_STORAGE_KEY = 'neuroaxis.sectionLobes'

/** Module-scoped mirror of the store field (see the note above). */
let lobeLayerFallback = false
/** The layer's listeners (one canvas per section surface: Plates + PiP). */
const lobeLayerListeners = new Set<() => void>()

function readLobeLayerFlag(): boolean {
  const state = useAtlasStore.getState() as unknown as Record<string, unknown>
  const fromStore = state.sectionLobes
  if (typeof fromStore === 'boolean') return fromStore
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOBES_STORAGE_KEY)
      if (raw === '1') return true
      if (raw === '0') return false
    } catch {
      // Private mode / quota: the layer still works, it just does not stick.
    }
  }
  return lobeLayerFallback
}

/** Toggle the layer: store action first (when task 4 has landed it), then the
 *  module fallback + the persisted key, then every listening canvas repaints. */
function writeLobeLayerFlag(on: boolean): void {
  lobeLayerFallback = on
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOBES_STORAGE_KEY, on ? '1' : '0')
    }
  } catch {
    // Persistence is best-effort (same contract as the underlay settings).
  }
  const state = useAtlasStore.getState() as unknown as Record<string, unknown>
  const setter = state.setSectionLobes
  if (typeof setter === 'function') {
    ;(setter as (value: boolean) => void)(on)
  }
  for (const listener of [...lobeLayerListeners]) listener()
}

/** Subscribe to the toggle (React 18 `useSyncExternalStore` contract). */
function subscribeLobeLayer(listener: () => void): () => void {
  lobeLayerListeners.add(listener)
  return () => {
    lobeLayerListeners.delete(listener)
  }
}

/**
 * Orientation badges per §2.2 conventions (in-canvas corner labels).
 *
 * The letters are the SHARED `PLANE_BADGES` table (planeGeometry.ts), literally:
 * the block below is the same three rows, spread from that one declaration, so
 * there is no second table to drift — `planeGeometry` derives the letters from
 * the projected geometry and asserts the literal against them at module load.
 * The rows are spelled out here because `scripts/verify-imaging-v4.mjs` reads
 * the in-canvas badge table out of this source (and `npm run verify:plane`
 * re-checks them against §2.2, the PiP and the geometry), so a change to the
 * app's orientation convention stays a visible, reviewable edit.
 */
const DIRECTION_BADGES: Record<PlaneAxis, { top: string; bottom: string; left: string; right: string }> = {
  y: { top: 'A', bottom: 'P', left: 'R', right: 'L' }, // = PLANE_BADGES.y (transverse)
  x: { top: 'S', bottom: 'I', left: 'P', right: 'A' }, // = PLANE_BADGES.x (sagittal)
  z: { top: 'S', bottom: 'I', left: 'R', right: 'L' }, // = PLANE_BADGES.z (coronal)
}

{
  // The spelled-out rows above must BE the shared table: a drift between them
  // fails at module load instead of painting the wrong letters.
  for (const axis of ['x', 'y', 'z'] as PlaneAxis[]) {
    const shared = PLANE_BADGES[axis]
    const local = DIRECTION_BADGES[axis]
    if (
      local.top !== shared.top ||
      local.bottom !== shared.bottom ||
      local.left !== shared.left ||
      local.right !== shared.right
    ) {
      throw new Error(
        `SectionCanvas: DIRECTION_BADGES.${axis} disagrees with planeGeometry.PLANE_BADGES.${axis}`,
      )
    }
  }
}

/**
 * In-canvas plane caption, plus the axis pair, extents, badge table and level
 * lookup — all from the ONE shared plane module (planeGeometry.ts,
 * QUALITY_PLAN §2 item 4). This file keeps no private copy of any of them.
 */
const AXIS_CAPTION: Record<PlaneAxis, string> = PLANE_CAPTION

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

/*
 * Window property the layer registry lives on: 'sectionImageLayers'.
 *
 * Deliberately NOT a module-level `const`: `imageLayers.ts` imports this module
 * (for `registerSectionImageLayer`) and registers its layers at import time,
 * which re-enters `getSectionImageLayerRegistry()` while this module's body is
 * still evaluating. Reading a module-level `const` at that moment throws
 * `ReferenceError: Cannot access 'WINDOW_REGISTRY_KEY' before initialization`
 * (the v7 regression: the closure added a `./imageLayers` import here, which
 * closes the cycle at module-init time). A literal inside the function has no
 * initialization order to violate.
 */

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
  // Literal, not a module-level const — see the note above (init-order cycle).
  const key = 'sectionImageLayers'
  const globalWindow = window as unknown as Record<string, unknown>
  let registry = globalWindow[key] as SectionImageLayerRegistry | undefined
  if (registry === undefined) {
    registry = createLayerRegistry()
    Object.defineProperty(globalWindow, key, {
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
 *
 * v7 closure (gap 3): `coverageStatement` is the measured CT source-coverage
 * statement for THIS plane (from `imageLayers.ctCoverageStatement`, i.e. the
 * shipped manifest's own number). A CT frame above the Visible Human series'
 * apex is not a generic "no imagery" case: the source simply has no data there
 * for any canonical box, and the hint says so — with the limit and with MRI
 * named as the modality of record — instead of the neutral wording. The
 * statement is used verbatim so the canvas and the toolbar state the same fact.
 */
export function imageryHint(
  kind: SectionUnderlayKind,
  modality: SectionLayerModality | 'none',
  status: LayerFrameStatus,
  drew: boolean,
  coverageStatement: string | null = null,
): string | null {
  if (drew) return null
  if (kind === 'none') return 'simulated only — real imagery is switched off'
  if (coverageStatement !== null && modality === 'ct') return coverageStatement
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

/** The world→screen mapping the canvas draws with — planeGeometry's, verbatim.
 *  The alias exists only so the draw helpers below read naturally. */
type Transform = PlaneTransform

function makeView(transform: Transform, plane: PlaneSpec): SectionView {
  return {
    axis: transform.axis,
    value: plane.value,
    width: transform.width,
    height: transform.height,
    uRange: [transform.uMin, transform.uMax],
    vRange: [transform.vMin, transform.vMax],
    uToSx: transform.uToSx,
    vToSy: transform.vToSy,
    sxToU: transform.sxToU,
    syToV: transform.syToV,
  }
}

function samePlane(
  a: { axis: PlaneAxis; value: number } | null,
  b: { axis: PlaneAxis; value: number } | null,
): boolean {
  if (a === null || b === null) return a === b
  return a.axis === b.axis && a.value === b.value
}

/**
 * The level anchor the canvas' ±LEVEL_MAP_WINDOW au mapping uses (the stain
 * layer's levelId), or null. The scan AND the distance measurement are the
 * shared `nearestLevelTo` (planeGeometry); this function only applies the
 * canvas' window.
 */
function levelIdForPlane(axis: PlaneAxis, value: number): string | null {
  const nearest = nearestLevelTo(axis, value, levels)
  if (nearest === null) return null
  return nearest.distance <= LEVEL_MAP_WINDOW ? nearest.level.id : null
}

interface PlateChip {
  plateId: string
  levelId: string
  label: string
  distance: number
}

/**
 * The nearest-plate chip: the plate-backed level nearest the plane, within
 * PLATE_CHIP_WINDOW au. The scan and the distance measurement are the shared
 * `nearestLevelTo` (planeGeometry); this function only applies the §2.2 rules
 * that the chip adds — plate-backed levels only, within a ±3 au window.
 */
const PLATE_BACKED_LEVELS = levels.filter((level) => platesForLevel(level.id).length > 0)

function plateChipFor(value: number): PlateChip | null {
  const nearest = nearestLevelTo('y', value, PLATE_BACKED_LEVELS)
  if (nearest === null || nearest.distance > PLATE_CHIP_WINDOW) return null
  const plate = platesForLevel(nearest.level.id)[0]
  if (plate === undefined) return null
  return {
    plateId: plate.id,
    levelId: nearest.level.id,
    label: shortLevelName(nearest.level.name),
    distance: nearest.distance,
  }
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

/**
 * The name the structure chip may show for a taxonomy entry, or null when that
 * record's text is suppressed (`NO_CANVAS_LABEL_RECORD_IDS`, v10 §5). Module
 * scope and pure so the chip's accessibility contract can be rendered and
 * asserted without a browser — `scripts/verify/cortical-lobes.mjs` transpiles
 * this function and the chip JSX out of the shipped source and renders them.
 */
function chipNameOf(entry: TaxonomyEntry | null | undefined): string | null {
  if (entry == null) return null
  return NO_CANVAS_LABEL_RECORD_IDS.has(entry.id) ? null : entry.name
}

/* ------------------------------------------------------------ component */

/**
 * Per-slug visibility gating shared by drawing and hit-testing.
 *
 * THE one visibility decision of the 2D surface (canvas AND PiP: `PipSection`
 * mounts this component and hands it no visibility prop). The 3D surface's
 * decision is `viewer3d/SceneLayers.layersAdmit` — the same two set tests, over
 * that surface's own record domain — and
 * `scripts/verify/view-filter-consistency.mjs` executes both and asserts they
 * agree part by part, so "exactly one place decides visibility" is measured
 * rather than asserted in prose. Exported for that gate (the repo's convention
 * for the module's other harness read points, e.g. `sectionRenderKey`).
 *
 * `kindByTaxonomy` folds a draw BUCKET into the taxonomy kind the layer set is
 * keyed on; a vessel's bucket is `nucleus` while its `taxonomyKind` is `vessel`,
 * which is why the taxonomy kind wins when it exists.
 */
export function isPartVisible(
  meta: SectionPartMeta,
  layers: { regions: ReadonlySet<string>; kinds: ReadonlySet<string> },
): boolean {
  if (meta.region !== null && !layers.regions.has(meta.region)) return false
  const taxonomyKind = meta.taxonomyKind ?? (kindByTaxonomy[meta.kind] ?? meta.kind)
  return layers.kinds.has(taxonomyKind)
}

/** Click/drag writes clamp to the canonical slider ranges (letterbox-safe).
 *  The extents come from the shared plane module, which derives them from
 *  CLIP_BOUNDS — the canvas holds no private copy of those numbers. */
function clampToBounds(axis: PlaneAxis, value: number): number {
  const extents = axisExtents(axis)
  const min = axis === 'x' ? extents.uMin : extents.vMin
  const max = axis === 'x' ? extents.uMax : extents.vMax
  return Math.min(max, Math.max(min, value))
}

/** One-line description of a value offered as a transferable (diagnostics). */
function describeTransferEntry(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView
    return `${view.constructor.name}(len=${(view as { length?: number }).length ?? '?'}, bytes=${view.byteLength}${view.byteLength === 0 ? ' DETACHED?' : ''})`
  }
  if (value instanceof ArrayBuffer) return `ArrayBuffer(bytes=${value.byteLength})`
  return `${typeof value}:${(value as { constructor?: { name?: string } }).constructor?.name ?? '?'}`
}

/* ------------------------------------------ memoized per-plane draw order */

/**
 * Byte budget for the per-plane `Path2D` store (QUALITY_PLAN §3 items 9/11:
 * bound every cache by BYTES). A `Path2D` holds ~16 B per point (a moveTo +
 * lineTo per contour vertex); 1 MB therefore covers the biggest slice this
 * canvas ever draws (84 parts, ~4 000 loops worst case → ~300 kB of points)
 * with room to spare, while making an unbounded accumulation impossible. When
 * a rebuild would exceed the budget the paths are emitted stroke-only from the
 * contour data instead (`drawPartPath` with `buildPath: false`) — a slightly
 * more expensive draw, never a wrong or missing one.
 */
const PATH2D_BUDGET_BYTES = 1_048_576

/** Estimated retained bytes of one contour (flat u,v pairs as a Path2D/array). */
function contourBytes(part: SectionContourPart): number {
  let bytes = 0
  for (const loop of part.loops) bytes += loop.length * 8
  return bytes
}

/** Draw-order sort keys, resolved once per part (SECTION_KIND_ORDER is tiny). */
const KIND_RANK: Map<string, number> = new Map(SECTION_KIND_ORDER.map((kind, index) => [kind, index]))
const kindRankOf = (kind: string): number => KIND_RANK.get(kind) ?? SECTION_KIND_ORDER.length

/** One visible part of the current frame: its metadata, contours and path. */
interface RenderItem {
  meta: SectionPartMeta
  part: SectionContourPart
  /** Reused Path2D for this part's contours, or null when the byte budget is
   *  exhausted (the item is then stroked straight from `part.loops`). */
  path: Path2D | null
}

/**
 * The per-plane render order (see the file header). Rebuilt ONLY when
 * `ensureRenderOrder` sees a different `key`; everything in here is a pure
 * function of that key, so a frame that changes none of its inputs reuses
 * every array, every sort result and every Path2D.
 */
interface RenderOrderCache {
  key: string
  /** Layer registry fingerprint the entry was built for ('' = none yet). */
  registryKey: string
  /** Sorted copy of the current frame's layer resolution (draw order). */
  orderedLayers: SectionImageLayer[]
  /** Visible parts in DRAW order (context → ventricle → nucleus). */
  visibleParts: RenderItem[]
  /** The same parts front-to-back — what a hover probe must test first. */
  visibleFaces: RenderItem[]
  /**
   * v11 §2 — the EXACT region/kind sets `visibleParts` was filtered with, so a
   * later pass can re-apply the one gate instead of trusting that its input was
   * pre-filtered (`buildLobeLayer`). Captured at the same moment as the filter,
   * so the two cannot describe different layer states. Empty until the first
   * rebuild — `visibleParts` is empty then too, so such a call is a no-op.
   */
  visibleLayers: { regions: ReadonlySet<string>; kinds: ReadonlySet<string> }
  /** Reused Path2D per slug (only while it is in the byte budget). */
  paths: Map<string, Path2D>
  pathBytes: number
  /** Nearest levelId for the plane this order was built at (nullable). */
  levelId: string | null
  /** How many times the order was actually rebuilt (diagnostics). */
  rebuilds: number
}

export function createRenderOrderCache(): RenderOrderCache {
  return {
    key: '',
    registryKey: '',
    orderedLayers: [],
    visibleParts: [],
    visibleFaces: [],
    visibleLayers: { regions: new Set<string>(), kinds: new Set<string>() },
    paths: new Map<string, Path2D>(),
    pathBytes: 0,
    levelId: null,
    rebuilds: 0,
  }
}

/* ------------------------------------------- cortical-division draw cache */

/** One cortical division's drawn geometry for the current frame. */
interface LobeLayerEntry {
  /** One stroked path per same-division run (the division's boundaries). */
  paths: Path2D[]
  /** Label anchor in the plane frame: the vertex of the division's LARGEST-AREA
   *  run closest to that run's centroid, so the label is ON the ribbon. */
  labelU: number
  labelV: number
  /** Vertices of this division across the whole slice (diagnostics). */
  vertices: number
  /**
   * Drawn area (au²) of the run that won the label anchor — the area the canvas
   * actually fills for that run (v10: the competition is by AREA, not by vertex
   * count: a long thin wedge can out-count a division's body while enclosing
   * almost nothing, which is how "TEMPORAL" ended up on a triangle).
   */
  labelAreaAu2: number
}

/**
 * Per-plane cortical-division render geometry (v9 §2). Prepared lazily on the
 * first frame that needs it and keyed on the render-order build, so switching
 * the layer ON is the only thing that ever pays the split cost, and a cached
 * frame (hover, selection, layer registry edit) never re-splits the contours.
 */
interface LobeLayerCache {
  /** Build number of the render order this geometry was derived from. */
  build: number
  entries: Partial<Record<CorticalDivision, LobeLayerEntry>>
  /** Slugs whose contour carried ribbon geometry at this build. */
  ribbons: string[]
  /** Vertices classified in total (diagnostics). */
  vertices: number
}

/**
 * Empty lobe-layer cache. Module-scope and exported so a Node gate can drive
 * `buildLobeLayer` (the canvas' own function) against real ribbon contours —
 * `scripts/verify/view-filter-consistency.mjs` does exactly that, and its §2
 * bite re-runs the same call against a mutated copy of this file.
 */
export function createLobeLayerCache(): LobeLayerCache {
  return { build: -1, entries: {}, ribbons: [], vertices: 0 }
}

/**
 * Build the division geometry for one frame: split every cortical-ribbon loop
 * into consecutive same-division runs (`corticalLobes.corticalRunsForLoop` —
 * THE v11 rule, so the canvas, the legend and both committed gates are one
 * computation; the plane value is the canonical coordinate on the plane's own
 * axis, which the in-plane loop cannot carry). Since v10 that rule also drops
 * runs below the documented arc/area floors (absorbed into their neighbour), so
 * what is stroked here is never a sliver. Each run is stroked into a Path2D
 * through the SAME `transform` every other pass uses, and the LARGEST-AREA run's
 * inner vertex becomes the label anchor (v10 §4: by drawn area, see
 * `LobeLayerEntry`).
 *
 * v11 §2 — THIS PASS NAMES ITS OWN GATE. Until v11 it was correct only because
 * `items` is `order.visibleParts`, i.e. already filtered by `isPartVisible`; a
 * future caller passing the raw `SECTION_PARTS` (or a cached list from a
 * different layer state) would have painted the whole telencephalon with the
 * area switched off, silently. The gate is therefore applied HERE, with the
 * layer sets the visible list was built from (`layers`), and it is the same
 * function `ensureRenderOrder` applies — one rule, two call sites, and
 * `scripts/verify/view-filter-consistency.mjs` executes both (including a
 * mutation that removes this line and must be caught).
 *
 * Exported for that gate, which imports this function rather than a copy.
 */
export function buildLobeLayer(
  cache: LobeLayerCache,
  items: readonly RenderItem[],
  axis: PlaneAxis,
  planeValue: number,
  transform: Transform,
  build: number,
  layers: { regions: ReadonlySet<string>; kinds: ReadonlySet<string> },
): void {
  if (cache.build === build) return
  cache.build = build
  const entries: Partial<Record<CorticalDivision, LobeLayerEntry>> = {}
  const ribbons: string[] = []
  let total = 0
  for (const item of items) {
    if (!isCorticalRibbonSlug(item.meta.slug)) continue
    // The one visibility decision (see the header above): the SAME predicate
    // ensureRenderOrder filtered `items` with, applied to the item's own meta.
    if (!isPartVisible(item.meta, layers)) continue
    if (item.part.loops.length === 0) continue
    ribbons.push(item.meta.slug)
    for (const loop of item.part.loops) {
      const runs = corticalRunsForLoop(loop, axis, planeValue)
      for (const run of runs) {
        const points = run.points
        const count = points.length / 2
        if (count < 3) continue
        total += count
        const entry = (entries[run.division] ??= {
          paths: [],
          labelU: Number.NaN,
          labelV: Number.NaN,
          vertices: 0,
          labelAreaAu2: 0,
        })
        entry.vertices += count
        const path = new Path2D()
        path.moveTo(
          (points[0] - transform.u0) * transform.scale,
          (transform.v0 - points[1]) * transform.scale,
        )
        for (let i = 1; i < count; i++) {
          path.lineTo(
            (points[i * 2] - transform.u0) * transform.scale,
            (transform.v0 - points[i * 2 + 1]) * transform.scale,
          )
        }
        path.closePath()
        entry.paths.push(path)
        // Label anchor: the INNER vertex of the division's LARGEST-AREA run, so
        // the label always sits on the widest piece of that division in the
        // slice — measured with the SAME metric the splitter's floors use, so a
        // pass/fail decision and the anchor can never disagree.
        const metrics = corticalRunMetrics(points)
        if (metrics.areaAu2 > entry.labelAreaAu2) {
          entry.labelAreaAu2 = metrics.areaAu2
          let cu = 0
          let cv = 0
          for (let i = 0; i < count; i++) {
            cu += points[i * 2]
            cv += points[i * 2 + 1]
          }
          cu /= count
          cv /= count
          let bestU = points[0]
          let bestV = points[1]
          let bestD = Infinity
          for (let i = 0; i < count; i++) {
            const du = points[i * 2] - cu
            const dv = points[i * 2 + 1] - cv
            const d = du * du + dv * dv
            if (d < bestD) {
              bestD = d
              bestU = points[i * 2]
              bestV = points[i * 2 + 1]
            }
          }
          entry.labelU = bestU
          entry.labelV = bestV
        }
      }
    }
  }
  cache.entries = entries
  cache.ribbons = ribbons
  cache.vertices = total
}

/** Canvas pixel position of a plane-frame point (same transform as every pass). */
function lobeLabelPosition(
  entry: LobeLayerEntry,
  transform: Transform,
): { sx: number; sy: number } {
  return {
    sx: (entry.labelU - transform.u0) * transform.scale,
    sy: (transform.v0 - entry.labelV) * transform.scale,
  }
}

/** Cheap fingerprint of the layer registry contents (ids in registration order). */
function registryKeyOf(layers: readonly SectionImageLayer[]): string {
  let key = ''
  for (const layer of layers) key += `${layer.id},`
  return key
}

/* ------------------------------------------------- memoization instrumentation */

/**
 * Cache-guard counters (module scope: cumulative for the page session, so
 * `?sectiondebug` and the browser gates can show what the memoization actually
 * saved without any per-frame bookkeeping). `planeMoves` counts every
 * render-order rebuild (plane, axis, layers, selection, syndrome or a new
 * contour result), `reuses` counts the frames/probes that hit the cache and
 * `pointerHits` the pointermove probes. Every 100th reuse logs the ratio on the
 * browser console, so a regression that rebuilt the order per frame would stop
 * producing that line — visible evidence instead of an invisible regression.
 */
const memoCounters = { rebuilds: 0, reuses: 0, planeMoves: 0, pointerHits: 0 }

/**
 * The fingerprint of the render dimensions the visible-part list, the draw
 * order and the level lookup depend on. Exported so a harness can assert that
 * a frame changing none of these inputs does not rebuild them.
 */
export function sectionRenderKey(
  axis: PlaneAxis,
  planeValue: number,
  state: {
    layers: { regions: Set<string>; kinds: Set<string> }
    selectedId: string | null
    syndromeId: string | null
  },
  serial: number,
  width: number,
  height: number,
): string {
  return [
    axis,
    planeValue.toFixed(2),
    width,
    height,
    [...state.layers.regions].join(','),
    [...state.layers.kinds].join(','),
    state.selectedId ?? '',
    state.syndromeId ?? '',
    serial,
  ].join('|')
}

/** Snapshot of the memoization counters (diagnostics: `?sectiondebug`, QA). */
export function sectionCanvasMemoStats(): {
  rebuilds: number
  reuses: number
  planeMoves: number
  pointerHits: number
} {
  return {
    rebuilds: memoCounters.rebuilds,
    reuses: memoCounters.reuses,
    planeMoves: memoCounters.planeMoves,
    pointerHits: memoCounters.pointerHits,
  }
}

/** Build a part's Path2D in plane coordinates (u,v → screen px through `transform`). */
function writePartPath(path: Path2D, part: SectionContourPart, transform: Transform): void {
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

/**
 * Refresh the cache for the current frame. Returns the entry — mutated in
 * place — whose arrays the caller must treat as read-only. The single-threaded
 * rAF draw loop and the pointer handlers all run on the main thread, so no
 * locking is needed; the returned object is never shared with the worker.
 *
 * The entry is built for the CURRENT transform; when the canvas resized or the
 * plane moved, `key` is stale and the next call rebuilds it for the new one.
 */
function ensureRenderOrder(
  cache: RenderOrderCache,
  args: {
    axis: PlaneAxis
    planeValue: number
    transform: Transform
    state: {
      layers: { regions: Set<string>; kinds: Set<string> }
      selectedId: string | null
      syndromeId: string | null
    }
    contours: Map<string, SectionContourPart>
    serial: number
    registryLayers: readonly SectionImageLayer[]
  },
): RenderOrderCache {
  const registryKey = registryKeyOf(args.registryLayers)
  if (cache.registryKey !== registryKey) {
    // Layer registry changed (register/unregister): the sorted draw order is
    // the only thing to redo — the contour paths are untouched.
    cache.registryKey = registryKey
    cache.orderedLayers = layersInDrawOrder(args.registryLayers)
  }
  const key = sectionRenderKey(
    args.axis,
    args.planeValue,
    args.state,
    args.serial,
    args.transform.width,
    args.transform.height,
  )
  if (cache.key === key) {
    memoCounters.reuses += 1
    return cache
  }
  cache.key = key
  cache.rebuilds += 1
  memoCounters.rebuilds += 1
  memoCounters.planeMoves += 1
  if (memoCounters.reuses > 0 && memoCounters.reuses % 100 === 0) {
    // Console evidence for the browser gates: one render order is serving many
    // frames/probes. If a regression made this rebuild per frame, reuses would
    // stop growing and this line would stop appearing.
    console.info(
      `[SectionCanvas] render order reused ${memoCounters.reuses}× for ${memoCounters.rebuilds} rebuild(s) ` +
        `(paths ${cache.paths.size}, ${(cache.pathBytes / 1024).toFixed(0)} kB)`,
    )
  }

  // Visible parts, in draw order — the filter+sort that used to run per frame
  // (and again per pointermove) now runs only when this key changes.
  //
  // v14: `partsForCanvas()` is `SECTION_PARTS` (the 138 committed GLBs) plus the
  // twelve PROCEDURAL cranial-nerve parts (sectionAssets.SECTION_NERVE_PARTS).
  // The filter itself is unchanged, so a nerve contour is drawn exactly when the
  // worker returned it AND `isPartVisible` admits it — and `isPartVisible`
  // prefers `taxonomyKind`, which is 'nerve' for a course, so the Systems row's
  // "Cranial nerves" button is what shows and hides these twelve. `SECTION_PARTS`
  // stays 138 for every gate that counts it.
  const visible = partsForCanvas().filter(
    (meta) => args.contours.has(meta.slug) && isPartVisible(meta, args.state.layers),
  ).sort((a, b) => kindRankOf(a.kind) - kindRankOf(b.kind))

  // Path2D reuse: a path is kept while its contours AND the transform are
  // unchanged, which is exactly what the cache key encodes. Rebuilding drops
  // the previous paths — the released memory is what keeps this bounded.
  cache.paths.clear()
  cache.pathBytes = 0
  const transform = args.transform
  const items: RenderItem[] = []
  for (const meta of visible) {
    const part = args.contours.get(meta.slug) as SectionContourPart
    let path: Path2D | null = null
    const bytes = contourBytes(part)
    if (cache.pathBytes + bytes <= PATH2D_BUDGET_BYTES) {
      path = new Path2D()
      writePartPath(path, part, transform)
      cache.pathBytes += bytes
      cache.paths.set(meta.slug, path)
    }
    items.push({ meta, part, path })
  }
  cache.visibleParts = items
  cache.visibleFaces = [...items].reverse()
  // v11 §2: the layer state this list was filtered with, kept with it (see
  // RenderOrderCache.visibleLayers) so `buildLobeLayer` can name the gate.
  cache.visibleLayers = { regions: args.state.layers.regions, kinds: args.state.layers.kinds }
  cache.levelId = levelIdForPlane(args.axis, args.planeValue)
  return cache
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
  /**
   * P0 hand-off (QUALITY_PLAN §1 item 3) — NOT yet wired, by design.
   *
   * The banner drawn in `draw()` below ("Loading anatomy meshes X/84…") must
   * become TERMINAL: a part whose load exceeded ANATOMY_LOAD_TIMEOUT_MS has to
   * read as a failure with a retry, never as "still loading" forever. The data
   * for that lives one level up: `sectionAssets.useSectionGeometryStatus()`
   * already fans `useAnatomyAsset` over all 84 slugs, and each asset carries
   * `timedOut` + `retry()` (src/geometry/anatomyAssets.ts) — but
   * `SectionGeometryStatus` does not expose them yet, and `sectionAssets.ts` is
   * owned by task `p0-survivability`, not by this one (exclusive write scope).
   *
   * Hand-off contract for `p0-survivability` (owner of sectionAssets.ts), so
   * this surface can finish the item in one small edit:
   *   SectionGeometryStatus gains
   *     timedOutSlugs: readonly string[]   // status 'fallback' && asset.timedOut
   *     retryGeometry(): void              // calls asset.retry() for each of them
   *   and SectionCanvas then draws, instead of the loading banner:
   *     `geometry unavailable (${readyCount}/${total}) — retry`
   *   with a button whose onClick is `geometryStatus.retryGeometry()`.
   * Until that lands, the banner is exactly the v5 one and the per-part loader
   * still bounds itself, so a stalled fetch settles into 'fallback' rather than
   * hanging the section.
   */
  const [workerError, setWorkerError] = useState<string | null>(null)
  const [credit, setCredit] = useState<ImageryCredit | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  /** Exception thrown inside the rAF draw (otherwise invisible: it would only
   *  reach the browser console and the canvas would silently stay half-painted). */
  const [drawError, setDrawError] = useState<string | null>(null)
  /** `?sectiondebug` — compact live status block for field diagnosis. */
  const [debugOn] = useState(() =>
    typeof window !== 'undefined' && /[?&]sectiondebug\b/.test(window.location.search),
  )
  const [debugTick, setDebugTick] = useState(0)

  /**
   * v9 §2 — the cortical-division layer's user-visible state. Read through the
   * module's store subscription (see `readLobeLayerFlag`: the store field
   * `sectionLobes` wins when task 4 has landed it, the persisted
   * `neuroaxis.sectionLobes` key otherwise), so the toggle re-renders the
   * legend and the rAF draw reads the same value through `lobesOnRef`.
   */
  const lobesOn = useSyncExternalStore(subscribeLobeLayer, readLobeLayerFlag, () => false)

  // Imperative render state.
  const transformRef = useRef<Transform | null>(null)
  const contoursRef = useRef<Map<string, SectionContourPart>>(new Map())
  const loopsTotalRef = useRef(0)
  const hoverRef = useRef<{ slug: string; group: string; u: number; v: number } | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const workerAliveRef = useRef(false)
  const workerReadyRef = useRef(false)
  const registrySentRef = useRef(false)
  /** Slugs actually transferred to the worker (diagnostics). */
  const registryRefCountRef = useRef(0)
  /** Last resolved layer frame (diagnostics): modality + status + draw result. */
  const frameDebugRef = useRef<{ modality: string; status: string; drewReal: boolean } | null>(null)
  /** Mirror of drawError for stale-closure-safe comparison inside rAF. */
  const drawErrorRef = useRef<string | null>(null)
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
  /** Memoized per-plane render order (visible parts · draw order · levelId ·
   *  Path2D per part) — see the file header and ensureRenderOrder(). */
  const renderOrderRef = useRef<RenderOrderCache>(createRenderOrderCache())
  /** Contour generation: +1 on every worker result, so the cache key cannot
   *  survive a new slice (same plane re-requested after an axis round trip). */
  const contourSerialRef = useRef(0)
  /** v9 cortical-division layer: per-render-order geometry (see buildLobeLayer). */
  const lobeLayerRef = useRef<LobeLayerCache>(createLobeLayerCache())
  /** Mirror of the toggle for the rAF draw (stale-closure safe). */
  const lobesOnRef = useRef(false)
  /** Set when the toggle changes between two frames of the same render order,
   *  so the next frame rebuilds the division geometry (the render key does not
   *  carry the toggle: switching the layer must not invalidate the memoized
   *  contour paths, it only changes what is painted over them). */
  const lobeDirtyRef = useRef(false)
  // The rAF draw loop outlives renders, so the toggle reaches it through a ref.
  lobesOnRef.current = lobesOn

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
        // New slice: every cached Path2D belongs to the previous plane.
        contourSerialRef.current += 1
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
    // Skip only when a frame is genuinely outstanding. A bare boolean latch is
    // not enough: cancelling the frame (StrictMode's mount→cleanup→mount, or an
    // unmount while a frame is pending) would leave the flag stuck true and kill
    // the draw loop for the component's whole lifetime.
    if (rafRef.current !== 0) return
    drawNeededRef.current = true
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      drawNeededRef.current = false
      try {
        draw()
        if (drawErrorRef.current !== null) {
          drawErrorRef.current = null
          setDrawError(null)
        }
      } catch (error) {
        // A throwing draw leaves the canvas half-painted with no other signal
        // (rAF swallows it into the console) — surface it in the UI instead.
        const message = error instanceof Error ? error.message : String(error)
        if (drawErrorRef.current !== message) {
          drawErrorRef.current = message
          setDrawError(message)
        }
      } finally {
        if (debugOn) setDebugTick((t) => t + 1)
      }
    })
  }

  /**
   * Everything one painted frame needs, resolved once by `beginFrame`.
   *
   * `SectionCanvas.draw()` used to be a single 145-line function that owned the
   * canvas sizing, the shared plane transform, the memoized render order, the
   * imagery compositing, the contour pass, interaction state and the in-canvas
   * overlays. `AUDIT §2.23` flagged it as a god function; `QUALITY_PLAN §5 item
   * 17` asks for the split below. The order of the passes is unchanged — only
   * the ownership moved:
   *
   *   beginSectionFrame  → canvas size/dpr + the SHARED plane transform + the
   *                        memoized render order (the "transform" step)
   *   drawSectionLayers  → base + real imagery compositing          ("layers")
   *   drawSectionContours→ visible-part paths, selected label       ("contours")
   *   drawSectionOverlays→ grid, crosshair, orientation, readout,
   *                        hover label, geometry-loading notice    ("overlays")
   */
  interface SectionFrame {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D
    /** CSS pixels of the canvas box (the transform's viewport). */
    width: number
    height: number
    axis: PlaneAxis
    planeValue: number
    plane: PlaneSpec
    transform: Transform
    view: SectionView
    /** Store snapshot for this frame — never re-read inside a pass. */
    state: ReturnType<typeof useAtlasStore.getState>
    /** Memoized per-plane order (QUALITY_PLAN §3 item 9). */
    order: RenderOrderCache
  }

  /**
   * Transform step: size the backing store, install the device-pixel transform
   * and resolve the SHARED world→screen mapping plus the memoized render order.
   * Returns null when there is nothing to paint (hidden tab, no canvas, box too
   * small) — the caller then returns immediately, exactly as before.
   */
  function beginSectionFrame(): SectionFrame | null {
    // Perf guard: the tab is hidden — paint nothing (rAF is throttled to a
    // stop anyway; this also skips resize-driven and worker-result draws).
    // The visibilitychange listener below reschedules a draw on return.
    if (typeof document !== 'undefined' && document.hidden) return null
    const canvas = canvasRef.current
    if (canvas === null) return null
    const ctx = canvas.getContext('2d')
    if (ctx === null) return null
    const state = useAtlasStore.getState()
    const axis = state.sectionAxis
    const planeValue = state.clip[axis]
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width <= 2 || height <= 2) return null
    const dpr = Math.min(window.devicePixelRatio || 1, CANVAS_MAX_DPR)
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // THE shared world→screen mapping (planeGeometry.planeTransform): the same
    // function the PiP camera and the backdrop sampler consume, so this canvas
    // and the PiP place a photograph identically.
    const transform = planeTransform(axis, planeValue, { width, height })
    transformRef.current = transform
    const plane: PlaneSpec = { axis, value: planeValue }
    const view = makeView(transform, plane)

    /* ---- memoized per-plane render order (QUALITY_PLAN §3 item 9) -----
     * ONE call rebuilds the visible-part list, its draw order, the nearest
     * levelId and the per-part Path2D only when their key changed; every other
     * frame (hover, selection, credit, resize-free store writes, tab return)
     * reuses the arrays and the paths as they are. */
    const order = ensureRenderOrder(renderOrderRef.current, {
      axis,
      planeValue,
      transform,
      state,
      contours: contoursRef.current,
      serial: contourSerialRef.current,
      registryLayers: getSectionImageLayerRegistry().list(),
    })
    return { canvas, ctx, width, height, axis, planeValue, plane, transform, view, state, order }
  }

  /**
   * Layers step: the base fill, the grid, then the real-imagery base plate.
   *
   * ONE modality per frame: `kind` is the store request, resolveLayerFrame()
   * turns it into a single layer (auto = anchored photo → CT → MRI — see
   * AUTO_MODALITY_ORDER) and the layers in turn paint only when
   * `layerCtx.modality` matches their own tag. Layers are visited in ascending
   * `priority`; the first one that reports having painted supplies the credit
   * shown bottom-left.
   *
   * @returns `realBase` — whether the simulated contours composite ON TOP of
   *          real imagery this frame (v3 rendering keeps them as the base).
   */
  function drawSectionLayers(frame: SectionFrame): boolean {
    const { ctx, width, height, plane, state, order, view, transform } = frame
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, width, height)

    drawGrid(ctx, transform)

    const underlay = state.sectionUnderlay
    const levelId = order.levelId
    // Already sorted (cached on the registry fingerprint); the FRAME itself is
    // re-resolved every draw because dataStatus is async-arrival sensitive.
    const orderedLayers = order.orderedLayers
    const imageryFrame = resolveLayerFrame(orderedLayers, underlay.kind, plane, levelId)
    const layerCtx: SectionLayerContext = {
      opacity: underlay.opacity,
      levelId,
      kind: underlay.kind,
      modality: imageryFrame.modality,
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
        ...(imageryFrame.layer !== null ? [imageryFrame.layer] : []),
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
    frameDebugRef.current = {
      modality: String(imageryFrame.modality ?? 'none'),
      status: String(imageryFrame.status ?? 'n/a'),
      drewReal,
    }
    const hint = imageryHint(
      underlay.kind,
      imageryFrame.modality,
      imageryFrame.status,
      drewReal,
      // v7 closure (gap 3): the canvas half of the CT coverage honesty. Only
      // computed for a CT request/CT frame — the statement itself is null inside
      // the coverage, so a covered plane keeps its normal hint/credit.
      underlay.kind === 'ct' || imageryFrame.modality === 'ct'
        ? ctCoverageStatement(plane.axis, plane.value)
        : null,
    )
    if (lastHintRef.current !== hint) {
      lastHintRef.current = hint
      setHint(hint)
    }
    return realBase
  }

  /**
   * Contours step: the simulated section itself — context → ventricle →
   * nucleus in the cached draw order — then the selected structure's label,
   * which must sit over both the base plate and the contour fills.
   */
  function drawSectionContours(frame: SectionFrame, realBase: boolean): void {
    const { ctx, transform, state, order } = frame
    const highlight = highlightIdSet({ selectedId: state.selectedId, syndromeId: state.syndromeId })
    const strokeOnly = loopsTotalRef.current > DEGRADE_LOOP_LIMIT
    // Cached (see ensureRenderOrder): the filter+sort and the Path2D per part
    // are rebuilt only when plane/axis/layers/selection/syndrome changed.
    const visibleParts = order.visibleParts

    for (const item of visibleParts) {
      const meta = item.meta
      const inHighlight = highlight === null || highlight.has(meta.group)
      drawPart(ctx, meta, item.part, transform, {
        strokeOnly,
        overlay: realBase,
        dim: highlight !== null && !inHighlight,
        selected: meta.group === state.selectedId,
        hovered: meta.group === state.hoveredId,
      }, item.path)
    }

    // v9 §2: the toggleable rough cortical-division layer, painted OVER the
    // context fill above (never replacing it) and UNDER the selected label.
    drawCorticalLobes(frame)

    /* ---- labels last: over the base plate AND the contour fills ---- */
    for (const item of visibleParts) {
      if (item.meta.group !== state.selectedId) continue
      if (item.part.loops.length > 0) drawSelectedLabel(ctx, item.meta, item.part, transform)
    }
  }

  /* --------------------------------------------- v9 cortical-division layer */

  /**
   * Cortical-division pass (v9 §2). Draws the fitted lobe partition of the
   * DERIVED cortical ribbon over the existing context fill:
   *
   *  - one stroked outline per same-division run, in
   *    `CORTICAL_DIVISION_COLORS`, `CORTICAL_LOBES_STROKE_ALPHA`, with a thin
   *    dark casing under it so a boundary between two divisions reads as a
   *    boundary even where two colours meet;
   *  - a translucent fill of the same colour at `CORTICAL_LOBES_FILL_ALPHA`
   *    (mirroring `SECTION_KIND_ALPHA.context`'s translucent contract, so the
   *    imagery underneath stays visible);
   *  - one `<name>` label per division present in this slice, anchored on the
   *    longest run's inner vertex and mapped through the canvas' OWN transform
   *    (`transform.uToSx`/`vToSy` — never a second mapping), with the section's
   *    orientation convention inherited from the parent canvas, not re-derived.
   *
   * Everything is derived from the cached render order (buildLobeLayer), so a
   * frame that changed no plane/axis/selection re-splits nothing.
   */
  function drawCorticalLobes(frame: SectionFrame): void {
    if (!lobesOnRef.current) return
    const { ctx, axis, planeValue, transform, order } = frame
    const cache = lobeLayerRef.current
    if (lobeDirtyRef.current) {
      cache.build = -1
      lobeDirtyRef.current = false
    }
    buildLobeLayer(
      cache,
      order.visibleParts,
      axis,
      planeValue,
      transform,
      order.rebuilds,
      order.visibleLayers,
    )
    const divisions = CORTICAL_DIVISIONS.filter((division) => cache.entries[division] !== undefined)
    if (divisions.length === 0) return
    ctx.save()
    for (const division of divisions) {
      const entry = cache.entries[division] as LobeLayerEntry
      const color = CORTICAL_DIVISION_COLORS[division]
      ctx.globalAlpha = CORTICAL_LOBES_FILL_ALPHA
      ctx.fillStyle = color
      for (const path of entry.paths) ctx.fill(path, 'evenodd')
      // Two strokes per run: a dark casing first, then the division colour —
      // so a boundary between two divisions reads as a boundary, not as a seam
      // between two translucent fills.
      ctx.globalAlpha = CORTICAL_LOBES_STROKE_ALPHA
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(9, 14, 26, 0.85)'
      for (const path of entry.paths) ctx.stroke(path)
      ctx.lineWidth = 1.6
      ctx.strokeStyle = color
      for (const path of entry.paths) ctx.stroke(path)
    }
    ctx.globalAlpha = 1
    // Labels: one per division per plane, on the ribbon, with a dark plate
    // behind them — and only when the division actually has a body here. Since
    // v10 the splitter already drops sub-threshold runs, so this floor is the
    // second, independent guard that makes "TEMPORAL" on a 5 au² triangle
    // impossible (the gate asserts it and re-derives the winner itself).
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const division of divisions) {
      const entry = cache.entries[division] as LobeLayerEntry
      if (!Number.isFinite(entry.labelU)) continue
      if (entry.labelAreaAu2 < MIN_DIVISION_LABEL_AREA_AU2) continue
      const { sx, sy } = lobeLabelPosition(entry, transform)
      if (sx < 24 || sy < 12 || sx > transform.width - 24 || sy > transform.height - 12) continue
      const text = CORTICAL_DIVISION_SHORT_LABELS[division]
      const width = ctx.measureText(text).width + 10
      ctx.globalAlpha = 0.86
      ctx.fillStyle = 'rgba(9, 14, 26, 0.86)'
      ctx.fillRect(sx - width / 2, sy - 8, width, 16)
      ctx.globalAlpha = 1
      ctx.strokeStyle = CORTICAL_DIVISION_COLORS[division]
      ctx.lineWidth = 1
      ctx.strokeRect(sx - width / 2, sy - 8, width, 16)
      ctx.fillStyle = CORTICAL_DIVISION_COLORS[division]
      ctx.fillText(text, sx, sy + 0.5)
    }
    ctx.restore()
  }

  /**
   * Overlays step: everything drawn ON TOP of the section and already handled
   * by the preceding passes — the crosshair at the other two sliders, the
   * orientation badge, the plane readout, the hover label and the
   * geometry-loading notice.
   */
  function drawSectionOverlays(frame: SectionFrame): void {
    const { ctx, width, height, axis, planeValue, transform, state } = frame
    drawCrosshair(ctx, transform, axis, state.clip)
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

  function draw(): void {
    const frame = beginSectionFrame()
    if (frame === null) return
    const realBase = drawSectionLayers(frame)
    drawSectionContours(frame, realBase)
    drawSectionOverlays(frame)
  }

  function drawGrid(ctx: CanvasRenderingContext2D, transform: Transform): void {
    // The 10-au grid spans the canonical extents of the two in-plane axes
    // (planeGeometry.axisExtents), so its lines always mark the same world
    // positions whatever the panel size is.
    const extents = axisExtents(transform.axis)
    ctx.save()
    ctx.strokeStyle = GRID_STROKE
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let u = Math.ceil(extents.uMin / 10) * 10; u <= extents.uMax; u += 10) {
      const sx = Math.round(transform.uToSx(u)) + 0.5
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx, transform.height)
    }
    for (let v = Math.ceil(extents.vMin / 10) * 10; v <= extents.vMax; v += 10) {
      const sy = Math.round(transform.vToSy(v)) + 0.5
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
    /** Reused Path2D from the render-order cache; null when the byte budget is
     *  exhausted, in which case the outline is stroked straight from the
     *  contours (same geometry, no retained path). */
    cachedPath?: Path2D | null,
  ): void {
    if (part.loops.length === 0) return
    // Overlay mode keeps the kind hierarchy (context < ventricle < nucleus) and
    // scales the whole contour layer down so the photo underneath stays the
    // primary content; the selected part is deliberately NOT scaled (plan §4
    // "selection highlight unaffected").
    const fillAlpha = style.dim
      ? DIM_ALPHA
      : style.selected
        ? // v16 — the SELECTED structure is filled SOLID, not kind-alpha + 0.2.
          // A context envelope (SECTION_KIND_ALPHA.context) came out at 0.4, so
          // clicking a structure moved its label but left the shape translucent.
          // Selection is the one state where the fill must be unambiguous, and the
          // stroke below is already full-strength and in its own colour, so shape
          // and border now read together. Every other state keeps its kind
          // hierarchy (dim / overlay / plain).
          1
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
    const path = cachedPath ?? undefined

    ctx.save()
    if (path === undefined) {
      // Budget fallback: no retained Path2D — stroke (and, when visible, fill)
      // the loops through the current path, which is exactly what `path` would
      // hold. Stroking first then filling would double-stroke, so this branch
      // builds the path once per draw, like the pre-memoization code.
      beginPartPath(ctx, part, transform)
      if (!style.strokeOnly) {
        ctx.globalAlpha = fillAlpha
        ctx.fillStyle = meta.color
        ctx.fill('evenodd')
      }
      ctx.globalAlpha = strokeAlpha
      ctx.strokeStyle = style.selected ? SELECTION_STROKE : style.hovered ? HOVER_STROKE : meta.color
      ctx.lineWidth = style.selected ? 2.2 : style.hovered ? 1.8 : 0.9
      ctx.stroke()
      ctx.restore()
      return
    }
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

  /** Path2D-free fallback: the part's contours into the CURRENT canvas path. */
  function beginPartPath(ctx: CanvasRenderingContext2D, part: SectionContourPart, transform: Transform): void {
    ctx.beginPath()
    for (const loop of part.loops) {
      const count = loop.length / 2
      if (count < 3) continue
      ctx.moveTo((loop[0] - transform.u0) * transform.scale, (transform.v0 - loop[1]) * transform.scale)
      for (let i = 1; i < count; i++) {
        ctx.lineTo(
          (loop[i * 2] - transform.u0) * transform.scale,
          (transform.v0 - loop[i * 2 + 1]) * transform.scale,
        )
      }
      ctx.closePath()
    }
  }

  function drawSelectedLabel(
    ctx: CanvasRenderingContext2D,
    meta: SectionPartMeta,
    part: SectionContourPart,
    transform: Transform,
  ): void {
    // v10 §5: the cortex context envelope is labelled by its own contour, not by
    // text — and its text collided with the division labels. The CONTOUR is
    // untouched (drawPart paints it); only this name is suppressed.
    if (NO_CANVAS_LABEL_RECORD_IDS.has(meta.group)) return
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
    // v10 §5: same suppression as drawSelectedLabel — hovering the cortex
    // envelope still highlights it, but it never prints its name again.
    if (NO_CANVAS_LABEL_RECORD_IDS.has(hover.group)) return
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
    if (registrySentRef.current) return
    // Wait for every part to settle (ready or permanently-fallback)…
    if (geometryStatus.readyCount < geometryStatus.total) return
    // …and for any part that is still 'loading' to finish. 'fallback' counts
    // as settled, so this only guards the transient pre-effect state: without
    // it the registry could be built from an all-null geometry map.
    let stillLoading = false
    for (const status of geometryStatus.statuses.values()) {
      if (status === 'loading') {
        stillLoading = true
        break
      }
    }
    if (stillLoading) return
    const worker = workerRef.current
    if (worker === null || !workerAliveRef.current) return
    const registryParts: WorkerRegistryPart[] = []
    for (const meta of SECTION_PARTS) {
      const geometry = geometryStatus.geometries.get(meta.slug) ?? null
      if (geometry === null) continue
      const part = registryPartFromGeometry(meta, geometry)
      if (part !== null) registryParts.push(part)
    }
    // v14 — the twelve cranial-nerve courses: PROCEDURAL geometry, swept by the
    // same builder the 3D pass uses, appended to the SAME registry message. No
    // committed GLB, no manifest entry, 0 bytes of payload (PLAN.md §4). They
    // are not covered by `geometryStatus` (there is nothing to load), so they
    // are appended here rather than waited for.
    registryParts.push(...registryNerveParts())
    if (registryParts.length === 0) {
      // Nothing loaded and nothing pending: a real failure. Record it but let a
      // later geometry arrival clear it (the worker/store subscription keeps
      // re-running this effect while the registry has not been sent).
      setWorkerError('no anatomy geometry loaded')
      return
    }
    // Geometry is available: clear any previous failure and send the registry.
    registrySentRef.current = true
    if (workerError !== null) setWorkerError(null)
    registryRefCountRef.current = registryParts.length
    const transfer: Transferable[] = []
    for (const part of registryParts) {
      transfer.push(part.positions, part.indices)
    }
    const message: SectionWorkerRequest = { t: 'init', parts: registryParts }
    try {
      worker.postMessage(message, transfer)
    } catch (error) {
      // A single non-transferable entry aborts the whole call (DataCloneError).
      // The arrays stay intact on failure, so retry as a structured clone —
      // slower (a copy) but it always works, and the section still renders.
      console.warn(
        '[section] geometry transfer rejected — falling back to a structured clone :: ' +
          `entries=${transfer.length} first=${describeTransferEntry(transfer[0])} ` +
          `second=${describeTransferEntry(transfer[1])} ` +
          `allViews=${String(transfer.every((entry) => ArrayBuffer.isView(entry)))} :: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      )
      try {
        worker.postMessage(message)
      } catch (cloneError) {
        setWorkerError(
          cloneError instanceof Error ? cloneError.message : String(cloneError),
        )
        return
      }
    }
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

  /**
   * Hover hit-testing against the CACHED visible-part list (QUALITY_PLAN §3
   * item 9: "remove the SECTION_PARTS.filter().sort() from the pointermove
   * path" — AUDIT §2.13). Front-to-back order is the reverse of the draw order,
   * so the smallest structure under the cursor wins, exactly as before.
   *
   * The cache is rebuilt here only when it is stale for the CURRENT transform
   * — a plane/axis/layer/selection/syndrome change that no draw has painted
   * yet (the pointer can move before the next rAF). `u`,`v` are always read
   * from the same `transformRef.current` this call feeds the cache, so the
   * candidates and the probe share one coordinate frame.
   */
  function hitTestCandidates(): RenderItem[] {
    const transform = transformRef.current
    if (transform === null) return []
    const state = useAtlasStore.getState()
    const axis = state.sectionAxis
    // The SAME viewport the cached transform was built with (CSS px) — the
    // cache key carries it, so a resize between draws invalidates correctly.
    const planeValue = state.clip[axis]
    const key = sectionRenderKey(
      axis,
      planeValue,
      state,
      contourSerialRef.current,
      transform.width,
      transform.height,
    )
    // FAST PATH: the order is already built for exactly this state, so the
    // probe reuses it and nothing is recomputed — the point of item 9. A
    // pointermove that finds a stale key (plane moved, layers toggled, a new
    // slice arrived, canvas resized before the next rAF) falls through to a
    // rebuild, so hover is never tested against geometry that is not on screen.
    if (renderOrderRef.current.key !== key) {
      ensureRenderOrder(renderOrderRef.current, {
        axis,
        planeValue,
        transform,
        state,
        contours: contoursRef.current,
        serial: contourSerialRef.current,
        registryLayers: getSectionImageLayerRegistry().list(),
      })
    }
    memoCounters.pointerHits += 1
    return renderOrderRef.current.visibleFaces
  }

  function hitTest(u: number, v: number): { slug: string; group: string } | null {
    for (const item of hitTestCandidates()) {
      if (pointInLoops(item.part.loops, u, v)) return { slug: item.meta.slug, group: item.meta.group }
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

  // v9 §2: the cortical-division layer toggled → repaint once, and mark the
  // division geometry dirty (the contour paths themselves stay memoized).
  useEffect(() => {
    lobeDirtyRef.current = true
    scheduleDraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobesOn])

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
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current)
        // Clear BOTH signals: leaving the boolean latched would make every later
        // scheduleDraw() a no-op (StrictMode remounts this component in dev).
        rafRef.current = 0
        drawNeededRef.current = false
      }
      if (postTimerRef.current !== 0) window.clearTimeout(postTimerRef.current)
      // Release the memoized render order (Path2D store included) with the
      // component: the cache is per-instance and holds no other owner.
      const cache = renderOrderRef.current
      cache.paths.clear()
      cache.pathBytes = 0
      cache.visibleParts = []
      cache.visibleFaces = []
      cache.orderedLayers = []
      cache.key = ''
      cache.registryKey = ''
    }
  }, [])

  /* ------------------------------------------------------------- chip */

  const plateChip = useMemo(() => (sectionAxis === 'y' ? plateChipFor(clip.y) : null), [sectionAxis, clip.y])
  const hoveredEntry = hoveredId !== null ? getTaxonomyEntry(hoveredId) : null
  const selectedEntry = selectedId !== null ? getTaxonomyEntry(selectedId) : null
  const showHoveredEntry = hoveredEntry != null && hoveredEntry.id !== selectedId
  /**
   * v10 §5 — the chip is the ONE accessible instance of a structure name this
   * component owns (the canvas itself is a role="img" with a fixed aria-label
   * and no text), so suppressing the cortex envelope's label only in the paint
   * pass would leave it readable in the accessibility tree. `chipNameOf` returns
   * null for a record in `NO_CANVAS_LABEL_RECORD_IDS`, for BOTH the selected and
   * the hovered slot; selection and hover highlighting are untouched.
   */
  const selectedChipName = chipNameOf(selectedEntry)
  const hoveredChipName = chipNameOf(hoveredEntry)
  /**
   * v9 §2 — which divisions the canvas actually put on screen this frame. Read
   * from the drawn cache, so the legend lists what was painted (never a
   * division the rule produced but this plane does not contain).
   */
  const drawnDivisions = useMemo(() => {
    if (!lobesOn) return []
    return CORTICAL_DIVISIONS.filter(
      (division) => lobeLayerRef.current.entries[division] !== undefined,
    )
    // debugTick changes on every painted frame, so the legend follows the draw.
  }, [lobesOn, debugTick])

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
      {drawError !== null && (
        <div className="section-overlay-note is-error">Section draw failed: {drawError}</div>
      )}
      {debugOn && (
        <div className="section-overlay-note section-debug" aria-live="off">
          {(() => {
            const frame = frameDebugRef.current
            const state = useAtlasStore.getState()
            const memo = sectionCanvasMemoStats()
            const debugPlane: PlaneSpec = { axis: state.sectionAxis, value: state.clip[state.sectionAxis] }
            const debugLevel = levelIdForPlane(state.sectionAxis, state.clip[state.sectionAxis])
            const kinds = new Map<string, string>()
            for (const layer of getSectionImageLayerRegistry().list()) {
              const status =
                typeof layer.dataStatus === 'function'
                  ? layer.dataStatus(debugPlane, debugLevel)
                  : 'n/a'
              kinds.set(layer.id, `${layer.modality ?? 'v3'}:${status}`)
            }
            return [
              `geometry ${geometryStatus.readyCount}/${geometryStatus.total}`,
              `registry ${registryRefCountRef.current} parts`,
              `contours ${contoursRef.current.size} · loops ${loopsTotalRef.current}`,
              `axis ${sectionAxis} @ ${clip[sectionAxis].toFixed(1)}`,
              `kind ${useAtlasStore.getState().sectionUnderlay.kind}`,
              frame ? `frame ${frame.modality}/${frame.status} drew=${frame.drewReal}` : 'frame n/a',
              `layers ${[...kinds.values()].join(' ')}`,
              // v9 §2: the cortical-division layer's own state — on/off, the
              // divisions painted at this plane and the vertices classified.
              lobesOn
                ? `lobes on · ${drawnDivisions.length} div · ${lobeLayerRef.current.vertices} v` +
                  ` · ribbons ${lobeLayerRef.current.ribbons.join(',') || 'none'}`
                : 'lobes off',
              `draw #${debugTick}`,
              // Memoization evidence: draws since the last rebuild of the
              // per-plane render order and the Path2D bytes it retains.
              `cached ${Math.max(0, debugTick - renderOrderRef.current.rebuilds)}` +
                `/${renderOrderRef.current.rebuilds} · paths ${renderOrderRef.current.paths.size}` +
                `/${(renderOrderRef.current.pathBytes / 1024).toFixed(0)}kB` +
                ` · memo ${memo.reuses}/${memo.rebuilds} · hovers ${memo.pointerHits}`,
            ].join(' · ')
          })()}
        </div>
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
      {/* v9 §2 — the cortical-division layer's user-visible control AND legend.
          The toggle is a real <button> carrying `aria-pressed`, so it is
          keyboard operable and its state is announced; the legend lists the
          divisions the canvas ACTUALLY painted this frame plus the honest
          caveat, verbatim from `CORTICAL_LOBE_METHOD_NOTE`, so the file header,
          the legend and the docs cannot state different limits. Styling is
          inline (like the imagery hint above) so this layer needs no CSS file
          edit — only task 4 owns `src/styles/**` in this run. */}
      <div
        className="section-lobes"
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          maxWidth: 'min(320px, 46%)',
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          className="section-lobes-toggle"
          aria-pressed={lobesOn}
          title={`${CORTICAL_LOBE_METHOD_NOTE} Fit and residual per boundary: src/components/section/corticalLobes.ts`}
          onClick={() => writeLobeLayerFlag(!lobesOn)}
          style={{
            padding: '3px 9px',
            border: `1px solid ${lobesOn ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)'}`,
            borderRadius: 6,
            background: 'rgba(13, 21, 38, 0.86)',
            color: lobesOn ? '#e2e8f0' : '#94a3b8',
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cortical divisions{lobesOn ? ' · on' : ''}
        </button>
        {lobesOn && (
          <div
            className="section-lobes-legend"
            role="note"
            style={{
              padding: '5px 8px',
              background: 'rgba(13, 21, 38, 0.86)',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              borderRadius: 6,
              color: '#cbd5e1',
              fontSize: '0.68rem',
              lineHeight: 1.45,
            }}
          >
            {(drawnDivisions.length > 0 ? drawnDivisions : CORTICAL_DIVISIONS).map((division) => (
              <span
                key={division}
                className="section-lobes-row"
                style={{ display: 'block', whiteSpace: 'nowrap' }}
              >
                <span
                  className="section-lobes-swatch"
                  style={{
                    display: 'inline-block',
                    width: 9,
                    height: 9,
                    marginRight: 6,
                    borderRadius: 2,
                    background: CORTICAL_DIVISION_COLORS[division],
                    opacity: drawnDivisions.length > 0 ? 1 : 0.35,
                  }}
                  aria-hidden="true"
                />
                {CORTICAL_DIVISION_LABELS[division]}
              </span>
            ))}
            <span
              className="section-lobes-note"
              style={{
                display: 'block',
                marginTop: 4,
                paddingTop: 4,
                borderTop: '1px solid rgba(148, 163, 184, 0.25)',
                color: '#94a3b8',
              }}
            >
              {/* BOTH facts, always: the method caveat is what the layer means
               *  wherever it IS drawn, and the no-ribbon sentence is what a plane
               *  without a ribbon adds. Rendering them as either/or (the v9 first
               *  cut) meant a ribbon-less plane showed only the second, so the
               *  legend stopped stating that the division is a derived geometric
               *  approximation exactly where a reader most needs reminding. */}
              {drawnDivisions.length === 0 ? 'no cortical ribbon at this plane. ' : ''}
              {CORTICAL_LOBE_METHOD_NOTE}
            </span>
          </div>
        )}
      </div>
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
      {(selectedChipName !== null || (showHoveredEntry && hoveredChipName !== null)) && (
        <div className="section-structure-chip">
          {selectedChipName !== null && <span className="is-selected">{selectedChipName}</span>}
          {showHoveredEntry && hoveredChipName !== null && (
            <span className="is-hovered">{hoveredChipName}</span>
          )}
        </div>
      )}
    </div>
  )
}
