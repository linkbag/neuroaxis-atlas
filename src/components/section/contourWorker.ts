/**
 * contourWorker.ts — mesh-plane contour extraction worker (SECTION_SYNC_PLAN
 * §2.2, section-canvas task).
 *
 * Receives a transferable geometry registry (one entry per anatomy GLB slug:
 * raw positions/indices + taxonomy color/kind/group) and answers plane
 * updates with simplified closed contour loops per slug. Behavior:
 *
 *  - bbox cull: a part whose bounding box does not contain the plane is
 *    skipped without touching its triangles;
 *  - 0.25 au quantization happens on the main thread (SectionCanvas); this
 *    worker additionally COALESCES: a plane update arriving while a slice is
 *    running replaces the queued job (only the newest plane is computed
 *    after the current one finishes) — dragging never queues a backlog;
 *  - an LRU result cache (24 planes) makes slider scrubbing back and forth
 *    instantaneous;
 *  - the worker is terminated on SectionCanvas unmount (no leaks while the
 *    authored-plate view is open).
 *
 * The worker imports only the pure math module (contours.ts) — no three.js,
 * no DOM — so its bundle stays tiny.
 *
 * v9 `cortical-lobes` — WHERE THE CORTICAL PARTITION LIVES (read this before
 * adding a field to the protocol). The rough cortical-division layer of the
 * live section (frontal / parietal / temporal / occipital / insula / limbic) is
 * computed ON THE MAIN THREAD by `corticalLobes.classifyCorticalPoint`, applied
 * to the contour vertices this worker already returns. It is deliberately NOT
 * here:
 *
 *   - the protocol below (`SectionContourPart = { slug, loops }`) is the
 *     contract `scripts/verify/section-pipeline.mjs` reproduces in Node, so a
 *     new field is regression risk for a gate that must stay exit 0;
 *   - the classification is O(1) per vertex with no geometry access, so moving
 *     it into the worker would buy nothing and would duplicate the boundary
 *     constants (the worker cannot import a module that imports nothing else
 *     without growing its bundle);
 *   - the canvas needs the per-division RUNS, not per-vertex tags, and it needs
 *     them in the plane frame it draws in — it builds them from `loops` with the
 *     shared `planeGeometry.AXIS_PAIR`.
 *
 * Consequence: `loops` and every other message in this file are UNCHANGED by
 * the v9 cortical-lobes task, and switching the layer on or off cannot change
 * what the worker computes.
 */
import { boundsMayCut, extractContours, partBounds } from './contours'
import type { PlaneAxis, PlaneSpec } from './contours'

/* ------------------------------------------------------------- protocol */

export interface WorkerRegistryPart {
  /** Manifest slug (GLB identity; unique). */
  slug: string
  /** Selection/highlight id the contour belongs to (taxonomy id). */
  group: string
  /** Region the part belongs to (null when no taxonomy record). */
  region: string | null
  /** Draw bucket: 'context' | 'ventricle' | 'nucleus'. */
  kind: string
  /** Taxonomy color (css hex) for the fill. */
  color: string
  positions: Float32Array
  indices: Uint32Array
}

export type SectionWorkerRequest =
  | { t: 'init'; parts: WorkerRegistryPart[] }
  | { t: 'plane'; seq: number; axis: PlaneAxis; value: number }

export interface SectionContourPart {
  slug: string
  /** Closed loops, each a flat [u0, v0, u1, v1, …] path in the plane frame. */
  loops: number[][]
}

export type SectionWorkerResponse =
  | { t: 'ready'; partCount: number }
  | {
      t: 'contours'
      seq: number
      axis: PlaneAxis
      value: number
      parts: SectionContourPart[]
      trianglesTested: number
      segmentCount: number
      loopCount: number
    }
  | { t: 'error'; message: string }

/* ------------------------------------------------------------- worker state */

interface WorkerPart {
  slug: string
  group: string
  region: string | null
  kind: string
  color: string
  positions: Float32Array
  indices: Uint32Array
  bounds: { min: number[]; max: number[] }
}

interface CachedSlice {
  seq: number
  axis: PlaneAxis
  value: number
  parts: SectionContourPart[]
  trianglesTested: number
  segmentCount: number
  loopCount: number
}

const CACHE_MAX = 24

let parts: WorkerPart[] | null = null
const planeCache = new Map<string, CachedSlice>()
let desired: { seq: number; axis: PlaneAxis; value: number } | null = null
let computing = false

const post = (message: SectionWorkerResponse): void => {
  ;(self as unknown as { postMessage(message: unknown): void }).postMessage(message)
}

function sliceKey(axis: PlaneAxis, value: number): string {
  return `${axis}:${value}`
}

function computeSlice(job: { seq: number; axis: PlaneAxis; value: number }): CachedSlice {
  const plane: PlaneSpec = { axis: job.axis, value: job.value }
  const outParts: SectionContourPart[] = []
  let trianglesTested = 0
  let segmentCount = 0
  let loopCount = 0
  for (const part of parts as WorkerPart[]) {
    if (!boundsMayCut(part.bounds, plane)) continue
    const result = extractContours(part.positions, part.indices, plane)
    trianglesTested += result.trianglesTested
    segmentCount += result.segmentCount
    loopCount += result.loops.length
    if (result.loops.length > 0) {
      outParts.push({ slug: part.slug, loops: result.loops })
    }
  }
  return {
    seq: job.seq,
    axis: job.axis,
    value: job.value,
    parts: outParts,
    trianglesTested,
    segmentCount,
    loopCount,
  }
}

function remember(cached: CachedSlice): void {
  const key = sliceKey(cached.axis, cached.value)
  planeCache.set(key, cached)
  if (planeCache.size > CACHE_MAX) {
    const oldest = planeCache.keys().next().value as string | undefined
    if (oldest !== undefined && oldest !== key) planeCache.delete(oldest)
  }
}

/** Run one queued plane if idle; coalesces newer updates (worker half of the
 *  15 Hz / 0.25 au throttle contract). */
function processQueue(): void {
  if (computing || parts === null || desired === null) return
  const job = desired
  desired = null
  computing = true
  try {
    const key = sliceKey(job.axis, job.value)
    let cached = planeCache.get(key)
    if (cached === undefined) {
      cached = computeSlice(job)
      remember(cached)
    } else {
      // Cache hit: keep the REQUESTED seq so the main thread can match the
      // response to its latest outstanding request.
      cached = { ...cached, seq: job.seq }
    }
    post({ t: 'contours', ...cached })
    computing = false
  } catch (error) {
    computing = false
    desired = null
    post({
      t: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
  // A newer plane may have arrived while we were slicing: compute it now.
  processQueue()
}

self.addEventListener('message', (event: MessageEvent<SectionWorkerRequest>) => {
  const message = event.data
  if (message.t === 'init') {
    try {
      parts = message.parts.map((entry) => ({
        slug: entry.slug,
        group: entry.group,
        region: entry.region,
        kind: entry.kind,
        color: entry.color,
        positions: entry.positions,
        indices: entry.indices,
        bounds: partBounds(entry.positions),
      }))
      planeCache.clear()
      post({ t: 'ready', partCount: parts.length })
    } catch (error) {
      parts = null
      post({ t: 'error', message: error instanceof Error ? error.message : String(error) })
      return
    }
    processQueue()
    return
  }
  if (message.t === 'plane') {
    desired = { seq: message.seq, axis: message.axis, value: message.value }
    processQueue()
  }
})
