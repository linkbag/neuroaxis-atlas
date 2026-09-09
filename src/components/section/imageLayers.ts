/**
 * imageLayers.ts — real-image underlay layers for the 2D section canvas
 * (SECTION_SYNC_PLAN §2.3 + §4 [G3], image-layers task).
 *
 * Implements the layer API that SectionCanvas.tsx (G2) defines: each layer is
 * registered on the app-wide window registry (`window.sectionImageLayers`,
 * see registerSectionImageLayer); the canvas calls `appliesTo` + `draw` per
 * frame with the current plane, the nearest levelId (±1.5 au, its own
 * LEVEL_MAP_WINDOW) and the store `sectionUnderlay` knobs, and shows the
 * layer's `credit` / `sourceLink` bottom-left whenever the layer painted.
 * Draw order (underlay → contours → overlays) is the canvas' concern.
 *
 * Registered layers:
 *
 *  - 'stain' — level-mapped histology underlay. Applies to transverse planes
 *    whose levelId maps in src/data/sectionImages.ts. Draws the level's JPEG
 *    through an Image cache, fitted to the canvas view: DEFAULT = extent-box
 *    fit (the full visible world rect → midline centered, anterior/superior
 *    up, matching §2.2 conventions). The manifest currently ships no per-image
 *    fit constants (plan §2.3 "two-point fit"); when they land, integration
 *    can wire them via `imageLayerOptions.stainFits` — no code change here.
 *    The EXACT per-entry credit line (plan §1) and per-entry source link are
 *    reflected onto the layer object right before each paint (the canvas
 *    reads `credit`/`sourceLink` immediately after `draw` returns), so the
 *    visible attribution always names the image actually shown.
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
 *    (0.25 au, the canvas' PLANE_QUANTIZE_STEP) + window.
 *
 * Both layers self-gate on `SectionLayerContext.kind`: the canvas iterates
 * EVERY registered layer whenever the store underlay kind ≠ 'none', so each
 * layer draws only for its own kind. If mri-manifest.json `status` exists and
 * is not 'available', the mri layer still registers but disabled (appliesTo
 * → false, draw → false); see mriLayerStatus().
 *
 * This module never edits state/store.ts or SectionCanvas.tsx. Preferences
 * the store does not own are exported in `imageLayerOptions` for integration
 * to wire: per-image stain fits, per-level stain pick, MRI sample resolution,
 * uint8 window fallback. `getLayerLinks` provides the "open source ↗"
 * link-outs (plan §2.3) for integration to render as chips.
 *
 * Attribution sources (verbatim strings): docs/SECTION_SYNC_PLAN.md §1,
 * src/data/sectionImages.ts (UBC_CREDIT / BMM_CREDIT), mri-manifest.json
 * (`source` / `license`, dataset CC0 — no attribution required, provenance
 * only). License evidence: docs/IMAGING_SOURCES.md.
 */
import {
  registerSectionImageLayer,
  type SectionImageLayer,
} from './SectionCanvas'
import type { PlaneAxis } from './contours'
import { sectionImagesForLevel, type SectionImage } from '../../data/sectionImages'
import { useAtlasStore } from '../../state/store'
import mriManifestJson from '../../assets/imaging/mri-manifest.json'
import mriT1Url from '../../assets/imaging/mri-t1.bin?url'

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
}

export const imageLayerOptions: ImageLayerOptions = {
  stainFits: {},
  stainPreferred: {},
  mriUpsample: 3,
  mriWindowFallback: { min: 0, max: 255 },
}

/* -------------------------------------------------------- layer ids/status */

export const STAIN_LAYER_ID = 'stain'
export const MRI_LAYER_ID = 'mri'

export type MriLayerStatus = 'available' | 'unavailable'

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

/** Image cache keyed by manifest entry id (decoded lazily on first need). */
const stainImageCache = new Map<string, HTMLImageElement>()
const stainImageFailed = new Set<string>()

/** Returns the decoded Image, or undefined while loading / after a failure
 *  (the draw then paints nothing this frame; the onload nudge schedules a
 *  repaint — the canvas redraws on every store notification). */
function getStainImage(image: SectionImage): HTMLImageElement | undefined {
  const cached = stainImageCache.get(image.id)
  if (cached !== undefined) {
    return cached.complete && cached.naturalWidth > 0 ? cached : undefined
  }
  if (stainImageFailed.has(image.id)) return undefined
  const img = new Image()
  stainImageCache.set(image.id, img)
  img.onload = () => nudgeRedraw()
  img.onerror = () => stainImageFailed.add(image.id)
  img.decoding = 'async'
  img.src = image.file
  return undefined
}

const stainLayer: SectionImageLayer = {
  id: STAIN_LAYER_ID,
  // Non-optional per the §4 contract; draw() reflects the drawn entry's EXACT
  // credit + source link before painting (the canvas reads them right after).
  credit: '© University of British Columbia, CC BY-NC-SA 4.0',
  sourceLink: 'https://www.neuroanatomy.ca/micrographs.html',

  appliesTo(plane, levelId) {
    if (plane.axis !== 'y' || levelId === null) return false
    return pickStainImage(levelId) !== undefined
  },

  draw(ctx, view, _plane, layerCtx) {
    if (layerCtx.kind !== 'stain') return false
    if (layerCtx.levelId === null) return false
    const image = pickStainImage(layerCtx.levelId)
    if (image === undefined) return false
    const img = getStainImage(image)
    if (img === undefined) return false

    // Default: extent-box fit — the full visible world rect of the canvas
    // view (uRange × vRange), which centers the midline (bounds symmetric in
    // x) and puts anterior/superior at the top (canvas v grows upward).
    const fit = imageLayerOptions.stainFits[image.id]
    const uMin = fit !== undefined ? fit.uMin : view.uRange[0]
    const uMax = fit !== undefined ? fit.uMax : view.uRange[1]
    const vMin = fit !== undefined ? fit.vMin : view.vRange[0]
    const vMax = fit !== undefined ? fit.vMax : view.vRange[1]

    const sx = view.uToSx(uMin)
    const sy = view.vToSy(vMax) // top row = max v (anterior/superior up)
    const w = view.uToSx(uMax) - sx
    const h = view.vToSy(vMin) - sy
    if (!(w > 0.5 && h > 0.5)) return false

    // Reflect the exact per-entry attribution (plan §1 verbatim lines) BEFORE
    // painting; the canvas renders layer.credit/sourceLink on painted !== false.
    this.credit = image.credit
    this.sourceLink = image.sourceUrl

    ctx.save()
    ctx.globalAlpha = clamp01(layerCtx.opacity)
    ctx.imageSmoothingEnabled = true
    if (fit?.flipX === true) {
      ctx.translate(sx + w, sy)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, w, h)
    } else {
      ctx.drawImage(img, sx, sy, w, h)
    }
    ctx.restore()
    return true
  },
}

/* ----------------------------------------------------------- MRI grid data */

interface MriGrid {
  data: Uint8Array
  dims: [number, number, number]
  origin: [number, number, number]
  spacing: [number, number, number]
}

const MRI_BIN_URL = mriT1Url

export type MriDataStatus = 'idle' | 'loading' | 'ready' | 'failed'

let mriDataStatus: MriDataStatus = 'idle'
let mriGrid: MriGrid | null = null

/** Fetch/decode state of mri-t1.bin — integration can surface it as a hint. */
export function getMriDataStatus(): MriDataStatus {
  return mriDataStatus
}

/**
 * The canvas draw loop is store-driven (SectionCanvas subscribes to the whole
 * store), so when async data lands outside a store change we emit a no-op
 * store update — it reads/writes no state and just schedules one repaint.
 */
function nudgeRedraw(): void {
  useAtlasStore.setState({})
}

/** Start the one-shot fetch of the baked uint8 grid (arraybuffer). */
function loadMriGrid(): void {
  if (mriDataStatus !== 'idle') return
  mriDataStatus = 'loading'
  fetch(MRI_BIN_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`mri-t1.bin HTTP ${res.status}`)
      return res.arrayBuffer()
    })
    .then((buffer) => {
      const dims = mriManifest.dims
      const origin = mriManifest.originAu
      const spacing = mriManifest.spacingAu
      if (
        !Array.isArray(dims) || dims.length !== 3 ||
        !Array.isArray(origin) || origin.length !== 3 ||
        !Array.isArray(spacing) || spacing.length !== 3
      ) {
        throw new Error('mri-manifest.json dims/originAu/spacingAu malformed')
      }
      const expected = dims[0] * dims[1] * dims[2]
      if (buffer.byteLength !== expected) {
        throw new Error(`mri-t1.bin is ${buffer.byteLength} B, manifest dims expect ${expected} B`)
      }
      mriGrid = {
        data: new Uint8Array(buffer),
        dims: [dims[0], dims[1], dims[2]],
        origin: [origin[0], origin[1], origin[2]],
        spacing: [spacing[0], spacing[1], spacing[2]],
      }
      mriDataStatus = 'ready'
      nudgeRedraw()
    })
    .catch(() => {
      mriDataStatus = 'failed'
    })
}

/* --------------------------------------------------------- MRI sampling */

const AXIS_INDEX: Record<PlaneAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 }

/** In-plane world-axis pairs per plane axis: [u (screen x), v (screen y)] —
 *  mirrors SectionCanvas AXIS_PAIR (§2.2 orientation conventions). */
const AXIS_PAIR: Record<PlaneAxis, [PlaneAxis, PlaneAxis]> = {
  y: ['x', 'z'], // transverse: u = x, v = z
  x: ['z', 'y'], // sagittal:   u = z, v = y
  z: ['x', 'y'], // coronal:    u = x, v = y
}

/** Grid world-extent rect of a slice's in-plane axes (au). */
function gridPlaneRect(
  grid: MriGrid,
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
 */
function sampleGrid(grid: MriGrid, x: number, y: number, z: number): number {
  const coords = [x, y, z]
  const base = [0, 0, 0]
  const frac = [0, 0, 0]
  for (let a = 0; a < 3; a++) {
    const f = (coords[a] - grid.origin[a]) / grid.spacing[a]
    if (!(f >= 0) || !(f <= grid.dims[a] - 1)) return -1
    base[a] = Math.floor(f)
    frac[a] = f - base[a]
  }
  const nx = grid.dims[0]
  const ny = grid.dims[1]
  const nz = grid.dims[2]
  const clampI = (i: number, n: number): number => (i < 0 ? 0 : i > n - 1 ? n - 1 : i)
  const ix0 = clampI(base[0], nx)
  const ix1 = clampI(base[0] + 1, nx)
  const iy0 = clampI(base[1], ny)
  const iy1 = clampI(base[1] + 1, ny)
  const iz0 = clampI(base[2], nz)
  const iz1 = clampI(base[2] + 1, nz)
  const data = grid.data
  const at = (i: number, j: number, k: number): number => data[(k * ny + j) * nx + i]
  let sum = 0
  for (let ck = 0; ck < 2; ck++) {
    const wz = ck === 0 ? 1 - frac[2] : frac[2]
    const k = ck === 0 ? iz0 : iz1
    for (let cj = 0; cj < 2; cj++) {
      const wy = cj === 0 ? 1 - frac[1] : frac[1]
      const j = cj === 0 ? iy0 : iy1
      for (let ci = 0; ci < 2; ci++) {
        const wx = ci === 0 ? 1 - frac[0] : frac[0]
        const i = ci === 0 ? ix0 : ix1
        sum += at(i, j, k) * wx * wy * wz
      }
    }
  }
  return sum
}

/** Plane quantization for the slice cache (matches SectionCanvas). */
const MRI_PLANE_QUANTIZE = 0.25
const SLICE_CACHE_LIMIT = 32

/** Offscreen grayscale canvas per (axis, quantized plane, window). */
const sliceCache = new Map<string, HTMLCanvasElement>()

function windowMap(sample: number, wMin: number, wMax: number): number {
  const t = wMax > wMin ? (sample - wMin) / (wMax - wMin) : sample >= wMax ? 1 : 0
  return Math.round(clamp01(t) * 255)
}

/**
 * Render the slice at `value` along `axis` into an offscreen canvas sized
 * gridInPlane × mriUpsample (capped at 512 px/side). Top row = max v, so the
 * drawImage target rect can map world v directly (vToSy is top-down).
 */
function renderMriSlice(
  grid: MriGrid,
  axis: PlaneAxis,
  value: number,
  wMin: number,
  wMax: number,
): HTMLCanvasElement | null {
  const quantized = Math.round(value / MRI_PLANE_QUANTIZE) * MRI_PLANE_QUANTIZE
  const key = `${axis}|${quantized.toFixed(2)}|${Math.round(wMin)}|${Math.round(wMax)}`
  const cached = sliceCache.get(key)
  if (cached !== undefined) return cached

  // Plane value off the grid extent → nothing to sample (e.g. sagittal
  // planes beyond the ±27 au grid while the canvas x extent is ±48 au).
  const aIdx = AXIS_INDEX[axis]
  const fAxis = (value - grid.origin[aIdx]) / grid.spacing[aIdx]
  if (!(fAxis >= 0) || !(fAxis <= grid.dims[aIdx] - 1)) return null

  const upsample = Math.max(1, Math.min(4, Math.round(imageLayerOptions.mriUpsample) || 1))
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

  const coords = [0, 0, 0]
  coords[aIdx] = value
  let p = 0
  // Output-pixel centers map to fractional grid indices strictly inside
  // (0, dim-1): (px + 0.5) / w ∈ (0, 1) — no edge clamping needed. Top row
  // (py = 0) is max v, matching the canvas' vToSy (v grows upward).
  for (let py = 0; py < h; py++) {
    coords[vIdx] =
      grid.origin[vIdx] + ((h - 1 - py + 0.5) / h) * (grid.dims[vIdx] - 1) * grid.spacing[vIdx]
    for (let px = 0; px < w; px++) {
      coords[uIdx] =
        grid.origin[uIdx] + ((px + 0.5) / w) * (grid.dims[uIdx] - 1) * grid.spacing[uIdx]
      const sample = Math.max(0, sampleGrid(grid, coords[0], coords[1], coords[2]))
      const gray = windowMap(sample, wMin, wMax)
      pixels[p] = gray
      pixels[p + 1] = gray
      pixels[p + 2] = gray
      pixels[p + 3] = 255
      p += 4
    }
  }
  c2d.putImageData(imageData, 0, 0)

  sliceCache.set(key, canvas)
  if (sliceCache.size > SLICE_CACHE_LIMIT) {
    const oldest = sliceCache.keys().next()
    if (!oldest.done) sliceCache.delete(oldest.value)
  }
  return canvas
}

const mriLayer: SectionImageLayer = {
  id: MRI_LAYER_ID,
  credit: MRI_CREDIT,
  sourceLink: OPENNEURO_DATASET_URL,

  // Continuous: any plane/axis has an MRI slice (when the layer is enabled).
  appliesTo(_plane, _levelId) {
    return mriLayerStatus() === 'available'
  },

  draw(ctx, view, plane, layerCtx) {
    if (layerCtx.kind !== 'mri') return false
    if (mriLayerStatus() !== 'available') return false
    loadMriGrid()
    const grid = mriGrid
    if (grid === null) return false // still loading, or the fetch failed

    const wMin = Number.isFinite(layerCtx.windowMin)
      ? layerCtx.windowMin
      : imageLayerOptions.mriWindowFallback.min
    const wMax = Number.isFinite(layerCtx.windowMax)
      ? layerCtx.windowMax
      : imageLayerOptions.mriWindowFallback.max
    const slice = renderMriSlice(grid, plane.axis, plane.value, wMin, wMax)
    if (slice === null) return false

    const rect = gridPlaneRect(grid, plane.axis)
    const sx0 = view.uToSx(rect.uMin)
    const sy0 = view.vToSy(rect.vMax)
    const w = view.uToSx(rect.uMax) - sx0
    const h = view.vToSy(rect.vMin) - sy0
    if (!(w > 0.5 && h > 0.5)) return false

    ctx.save()
    ctx.globalAlpha = clamp01(layerCtx.opacity)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(slice, sx0, sy0, w, h)
    ctx.restore()
    return true
  },
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

/* ----------------------------------------------------------- registration */

/**
 * Register both layers on the window registry (SectionCanvas §4 API).
 * Idempotent by id; returns a combined disposer. The mri layer registers even
 * when disabled (status ≠ 'available'): it then never paints, and
 * mriLayerStatus() lets the integration UI hide/disable its toggle.
 */
export function registerImageLayers(): () => void {
  const disposeStain = registerSectionImageLayer(stainLayer)
  const disposeMri = registerSectionImageLayer(mriLayer)
  return () => {
    disposeStain()
    disposeMri()
  }
}

// Auto-register in the browser so the layers are live as soon as the module
// loads (integration may also call registerImageLayers() — idempotent).
if (typeof window !== 'undefined') {
  registerImageLayers()
}
