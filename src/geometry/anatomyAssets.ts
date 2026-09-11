/**
 * anatomyAssets.ts — runtime loader for the committed anatomy GLBs
 * (REALISM_PLAN §1 Layer 1/2 assets + §4 loader contract, integration-v2).
 *
 * The build pipeline (scripts/build-anatomy-geometry.mjs) commits one GLB per
 * slug into src/assets/anatomy/ plus anatomy-manifest.json. This module is the
 * ONLY place the viewer touches them:
 *
 *  - the manifest JSON is imported statically and exposed via getManifest() /
 *    getAnatomyPart() — the source of truth for "does this slug have a v2
 *    mesh?" and for material hints / centroids;
 *  - GLB assets are resolved through a vite `?url` glob (eager: false, so the
 *    URLs are lazily resolved and the binaries only fetch on demand) and
 *    parsed with three's GLTFLoader through a per-slug in-flight cache —
 *    every concurrent consumer of a slug shares one parse (plus a mirrored
 *    variant for the −x instance of paired records);
 *  - the useAnatomyPart / useAnatomyAsset hooks degrade gracefully: a slug
 *    that is missing from the manifest, has no GLB on disk, fails to parse,
 *    or does not resolve inside ANATOMY_LOAD_TIMEOUT_MS reports status
 *    'fallback' and the caller renders the v1 primitive — the app never
 *    blanks (REALISM_PLAN §2 constraint 6).
 *
 * ── P0 survivability: bounded loads + a retry path (QUALITY_PLAN §1 item 3,
 *    AUDIT §2.3) ──────────────────────────────────────────────────────────
 * Before this, `useAnatomyAsset` had no abort/timeout: a stalled GLB fetch
 * (flake, proxy, suspended tab, driver-stalled GPU upload) never resolved, so
 * the hook stayed 'loading' forever and the live-section canvas sat on its
 * "Loading anatomy meshes X/84…" banner with no failure state and no retry.
 * Now EVERY load is bounded by `ANATOMY_LOAD_TIMEOUT_MS` (15 s, exported so
 * the UI can name the same number):
 *
 *  - on timeout the hook settles to `status: 'fallback'` AND sets
 *    `timedOut: true` — a DISTINCT flag, because 'fallback' alone cannot be
 *    told apart from "this slug was never in the manifest" and the UI must be
 *    able to say "geometry unavailable — retry" rather than "loading";
 *  - `retry()` drops the slug's cached url/in-flight entries and re-runs the
 *    load; it is safe to call from a button, is idempotent while a retry is
 *    already in flight, and never leaks the timed-out attempt into the cache
 *    (a late-arriving stale parse is ignored — the attempt counter below);
 *  - the timeout is per-slug and starts when the effect runs, so a caller
 *    that mounts 84 hooks in one pass gets 84 independent bounds rather than
 *    one global deadline.
 *
 * The bound is deliberately a *settle* bound, not an abort of the underlying
 * transport: the vite `?url` module load and three's GLTFLoader both resolve
 * through the browser cache/fetch layer, and what the UI needs is a terminal
 * state it can render and retry — not a cancelled promise it must watch.
 *
 * Parsed geometries live in canonical atlas space already (the GLB writer
 * stores positions as-is), so consumers render them untransformed at the
 * scene origin and explode offsets come from the manifest centroid
 * (REALISM_PLAN §2 constraint 4).
 *
 * Cache lifetime = app lifetime (module singletons, StrictMode-safe): the
 * geometries back scene meshes that are rebuilt on every layer toggle, so
 * they are intentionally never disposed. Materials are NOT owned here —
 * every consumer creates per-instance materials from the central factory
 * (src/geometry/materials.ts), which also attaches the shared clipping planes
 * (REALISM_PLAN §2 constraint 3).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import manifestJson from '../assets/anatomy/anatomy-manifest.json'
import type { Region } from '../types'
import type { AnatomyManifest, AnatomyPart } from './generated'

/* ------------------------------------------------------------- manifest */

/** The statically-imported manifest (build-time data, no Host references). */
const anatomyManifest = manifestJson as AnatomyManifest

const partBySlug = new Map(anatomyManifest.parts.map((part) => [part.slug, part]))

/** The manifest, typed (REALISM_PLAN §4: source of truth for runtime + QA). */
export function getManifest(): AnatomyManifest {
  return anatomyManifest
}

/** Manifest entry for a slug, or undefined when the viewer must fall back. */
export function getAnatomyPart(slug: string): AnatomyPart | undefined {
  return partBySlug.get(slug)
}

/** Whether a committed v2 mesh exists for the slug. */
export function hasAnatomyPart(slug: string): boolean {
  return partBySlug.has(slug)
}

/* ------------------------------------------------- anatomy record contract */

/**
 * ── THE TELENCEPHALON RECORD → BAKED-BODY CONTRACT (v7, plan C9/C10) ────────
 *
 * Before v7 the manifest slug and the registry record id were assumed to be the
 * SAME string: `SceneLayers` passed `anatomySlug={record.id}` and `partBySlug`
 * was an exact map, so a record whose id is not a manifest slug silently fell
 * back to the v1 primitive.
 *
 * The telencephalon breaks that assumption in both directions and this table is
 * the single place that reconciles them:
 *
 *  - **many records, one body.** `nuc-caudate-head/body/tail` are the three
 *    parts of ONE caudate mesh (FJ1754/FJ1802); the ventricular horn/atrium
 *    records are regions of ONE ventricular cast; the claustral and capsule
 *    context records describe parts of the white-matter / basal-ganglia bodies.
 *    Pointing them all at the same GLB is the registry's own pairing rule
 *    (`ctx-thalamus-l`/`-r` → `ctx-thalamus-envelope`), applied at hemisphere
 *    scale.
 *  - **one record, several bodies.** The four corpus-callosum tract records
 *    (genu / rostrum / body / splenium) are the traditional subdivisions of the
 *    ONE corpus-callosum mesh, and the cortical surface records are regions of
 *    the two hemisphere shells.
 *
 * Mirrored parts of a paired record share one mesh: `SceneLayers` renders the
 * `-l` geometry twice (the second instance mirrored on x), exactly as it does
 * for every other paired record in the app, so a body is never baked twice just
 * to fill a right-hand slot.
 *
 * `region` is carried here as well because the live-section registry
 * (`section/sectionAssets.ts` GROUP_OVERRIDES) needs the same answer for
 * region grouping and taxonomy colour: one table, two consumers, no drift
 * — the failure mode plan C9 identified.
 */
export type AnatomyRender = 'body' | 'ghost' | 'none'

export interface AnatomyRecordLink {
  /** Manifest slug of the committed GLB (null = region has no baked body). */
  body: string | null
  /** Canonical region of the record (the taxonomy's own answer). */
  region: Region
  /** Whether the record is drawn twice (mirrored on −x). */
  paired: boolean
  /**
   * How the record reaches the 3D scene:
   *  - `body`  — an ordinary pickable mesh (`SceneLayers` → `NucleusMesh`);
   *  - `ghost` — the translucent hemisphere shell pass (its own material, §5);
   *  - `none`  — content-only: selectable from the tree/search/plates and
   *              painted by the live section, but deliberately NOT drawn as a v1
   *              placeholder (see `TEL_CONTENT_ONLY_IDS`).
   */
  render: AnatomyRender
}

/**
 * The two hemisphere shells' owning records. They are `ghost` links on purpose:
 * §5 requires the hemispheres to render as a translucent envelope at their OWN
 * opacity/depthWrite, which the shared context-envelope pass cannot express —
 * so `SceneLayers` draws them in a dedicated pass and these ids are excluded
 * from the ordinary body loop.
 */
export const TEL_HEMISPHERE_RECORD_IDS = ['ctx-cerebral-cortex'] as const

/** The hemisphere shell slugs (ghost pass), left first. */
export const TEL_HEMISPHERE_SHELLS: readonly { slug: string; side: 'left' | 'right' }[] = [
  { slug: 'ctx-hemisphere-l', side: 'left' },
  { slug: 'ctx-hemisphere-r', side: 'right' },
]

/**
 * Telencephalon records that must NOT be drawn as a v1 placeholder ellipsoid.
 *
 * Plan C10 measured this before v7: 32 of the 38 telencephalon records carried
 * neither a baked GLB nor `origin3d`/`size3d`, so `NucleusMesh` fell through to
 * the shared unit sphere at `[0, 0, 0]` — a stack of 1 au balls at the origin,
 * visually wrong AND a picking hazard at exactly the framing §5 makes the
 * default. Every record below is either a cortex record (whose body IS the
 * ghost shell) or a redirection to a body that a neighbouring record already
 * draws.
 *
 * They stay **fully selectable**: the taxonomy tree, the search index, the
 * plates and their syndromes all read the registry, not this table, and the live
 * section paints their region through the redirect above. What they lose is only
 * a duplicate v1 sphere they should never have had. This mirrors the existing
 * `ENVELOPE_RECORD_IDS` precedent.
 */
export const TEL_CONTENT_ONLY_IDS: ReadonlySet<string> = new Set<string>([
  // Cortex: each region of the two hemisphere shells. The shells themselves are
  // drawn by the ghost pass under `ctx-cerebral-cortex`.
  'surf-cingulate-gyrus',
  'surf-frontal-lobe',
  'surf-insula',
  'surf-limbic-lobe',
  'surf-occipital-lobe',
  'surf-parahippocampal-gyrus',
  'surf-parietal-lobe',
  'surf-temporal-lobe',
  // Sub-regions of a body another record already draws: the caudate's three
  // parts, the pallidal segments, the ventricular horns/atrium and the
  // choroid-plexus record whose mesh belongs to the ventricular cast.
  'nuc-caudate-body',
  'nuc-caudate-head',
  'nuc-caudate-tail',
  'nuc-globus-pallidus-externus',
  'vent-lateral-ventricle-atrium',
  'vent-lateral-ventricle-frontal-horn',
  'vent-lateral-ventricle-occipital-horn',
  'vent-lateral-ventricle-temporal-horn',
  'vent-choroid-plexus-lateral',
  // Corpus-callosum subdivisions: the fibres of the ONE callosal mesh, which
  // `ctx-corpus-callosum` and `tract-corpus-callosum-body` already draw.
  'tract-corpus-callosum-genu',
  'tract-corpus-callosum-rostrum',
  'tract-corpus-callosum-splenium',
  // Internal-capsule subdivisions: parts of the capsule body drawn by
  // `ctx-internal-capsule`.
  'tract-internal-capsule-anterior-limb',
  'tract-internal-capsule-genu',
  'tract-internal-capsule-posterior-limb',
  // Authored as placements with their own origin3d/size3d: the v1 primitive IS
  // their body (the four the v7 plan measured as already placed), so they keep
  // it rather than being hidden.
  //  nuc-ventral-striatum · surf-planum-temporale · nuc-dentate-gyrus
  //  tract-fimbria · vent-interventricular-foramen · tract-corona-radiata
])

const LINKS: Record<string, AnatomyRecordLink> = {
  /* --- cerebral cortex: the two ghost shells ---------------------------- */
  'ctx-cerebral-cortex': { body: null, region: 'telencephalon', paired: true, render: 'ghost' },

  /* --- telencephalic white matter --------------------------------------- */
  'ctx-corpus-callosum': { body: 'ctx-corpus-callosum', region: 'telencephalon', paired: false, render: 'body' },
  'tract-corpus-callosum-body': { body: 'ctx-corpus-callosum', region: 'telencephalon', paired: false, render: 'none' },
  'tract-corpus-callosum-genu': { body: 'ctx-corpus-callosum', region: 'telencephalon', paired: false, render: 'none' },
  'tract-corpus-callosum-rostrum': { body: 'ctx-corpus-callosum', region: 'telencephalon', paired: false, render: 'none' },
  'tract-corpus-callosum-splenium': { body: 'ctx-corpus-callosum', region: 'telencephalon', paired: false, render: 'none' },
  'ctx-internal-capsule': { body: 'tel-white-matter-l', region: 'telencephalon', paired: true, render: 'body' },

  /* --- basal ganglia ---------------------------------------------------- */
  'nuc-caudate-head': { body: 'ctx-caudate-l', region: 'telencephalon', paired: true, render: 'body' },
  'nuc-caudate-body': { body: 'ctx-caudate-l', region: 'telencephalon', paired: true, render: 'none' },
  'nuc-caudate-tail': { body: 'ctx-caudate-l', region: 'telencephalon', paired: true, render: 'none' },
  'nuc-putamen': { body: 'ctx-putamen-l', region: 'telencephalon', paired: true, render: 'body' },
  'nuc-globus-pallidus-internus': { body: 'ctx-globus-pallidus-l', region: 'telencephalon', paired: true, render: 'body' },
  'nuc-globus-pallidus-externus': { body: 'ctx-globus-pallidus-l', region: 'telencephalon', paired: true, render: 'none' },
  'ctx-lenticular-nucleus': { body: 'ctx-putamen-l', region: 'telencephalon', paired: false, render: 'body' },

  /* --- limbic system ---------------------------------------------------- */
  'nuc-hippocampus': { body: 'ctx-hippocampus-l', region: 'telencephalon', paired: true, render: 'body' },
  'nuc-amygdala': { body: 'ctx-amygdala-l', region: 'telencephalon', paired: true, render: 'body' },
  'tract-fornix': { body: 'ctx-fornix-l', region: 'telencephalon', paired: true, render: 'body' },
  'tract-fornix-commissure': { body: 'ctx-fornix-commissure', region: 'telencephalon', paired: false, render: 'body' },

  /* --- lateral ventricles ----------------------------------------------- */
  'vent-lateral-ventricle': { body: 'tel-lateral-ventricle-l', region: 'telencephalon', paired: true, render: 'body' },
  'vent-lateral-ventricle-frontal-horn': { body: 'tel-lateral-ventricle-l', region: 'telencephalon', paired: true, render: 'none' },
  'vent-lateral-ventricle-occipital-horn': { body: 'tel-lateral-ventricle-l', region: 'telencephalon', paired: true, render: 'none' },
  'vent-lateral-ventricle-temporal-horn': { body: 'tel-lateral-ventricle-l', region: 'telencephalon', paired: true, render: 'none' },
  'vent-lateral-ventricle-atrium': { body: 'tel-lateral-ventricle-l', region: 'telencephalon', paired: true, render: 'none' },
  'vent-choroid-plexus-lateral': { body: 'ctx-choroid-plexus-l', region: 'telencephalon', paired: true, render: 'none' },
}

/**
 * The record → baked-body links that are actually DRAWN (render 'body'/'ghost').
 * `sectionAssets` and `SceneLayers` both consume this, so the region a record
 * paints under and the mesh it highlights under are one fact.
 */
export const ANATOMY_RECORD_LINKS: Readonly<Record<string, AnatomyRecordLink>> = LINKS

/** Link for a record id, or undefined when the record owns no telencephalic body. */
export function anatomyLinkFor(recordId: string): AnatomyRecordLink | undefined {
  return LINKS[recordId]
}

/** The manifest slug a record's 3D body comes from, or null when it has none. */
export function anatomySlugForRecord(recordId: string): string | null {
  return LINKS[recordId]?.body ?? null
}

/**
 * Records the ordinary body pass must skip: the ghost shells (drawn by their own
 * pass) and the content-only ids above. Returns true for every record in
 * {@link TEL_CONTENT_ONLY_IDS} plus the hemisphere owners.
 */
export function isGhostOrContentOnly(recordId: string): boolean {
  if (TEL_CONTENT_ONLY_IDS.has(recordId)) return true
  return LINKS[recordId]?.render === 'ghost'
}

/* ------------------------------------------------------------ load bound */

/**
 * Upper bound (ms) on one slug's GLB resolve+parse before the hook settles to
 * the visible 'fallback' + `timedOut` state. Exported so the UI can say the
 * same thing the loader enforces ("geometry unavailable — retry"), and so a
 * test can reason about the bound without duplicating the number.
 *
 * 15 s is the QUALITY_PLAN §1 item 3 default: long enough for a 90 KB GLB on a
 * slow link, short enough that "Loading anatomy meshes X/84" can never look
 * like a permanent state.
 */
export const ANATOMY_LOAD_TIMEOUT_MS = 15_000

/**
 * Outcome of a bounded load: either the producer's value or a timeout marker.
 * A discriminated union (not `T | 'timeout'`) because T here is itself a tuple
 * containing nulls — `null` cannot double as the timeout signal.
 */
type Bounded<T> = { timedOut: false; value: T } | { timedOut: true }

/** Resolve `{ timedOut: true }` when `promise` has not settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<Bounded<T>> {
  if (!(ms > 0) || !Number.isFinite(ms)) {
    return promise.then((value) => ({ timedOut: false as const, value }))
  }
  return new Promise<Bounded<T>>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({ timedOut: true })
    }, ms)
    promise.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ timedOut: false, value })
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        // A rejected producer is a failure, not a timeout. Settle as an
        // ordinary (null) value and never rethrow: a throw inside this
        // callback would create an unhandled rejection, which the browser
        // reports as a console error and which no consumer could observe.
        // loadGlbUrl/loadAnatomyGeometry already convert their own failures to
        // null, so this is a defensive path.
        resolve({ timedOut: false, value: null as unknown as T })
      },
    )
  })
}

/* ------------------------------------------------------- GLB url + parse */

/** vite ?url glob over the committed GLBs — lazy: values are URL loaders. */
const glbUrlLoaders = import.meta.glob('../assets/anatomy/*.glb', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>

const glbPathFor = (slug: string): string => `../assets/anatomy/${slug}.glb`

/** Resolved asset URLs, cached per slug (one promise each, ever). */
const urlCache = new Map<string, Promise<string | null>>()

function loadGlbUrl(slug: string): Promise<string | null> {
  const cached = urlCache.get(slug)
  if (cached) return cached
  const loader = glbUrlLoaders[glbPathFor(slug)]
  const promise = loader
    ? loader().catch(() => {
        // Transient failure: drop the cached promise so a later mount retries
        // (a permanently missing GLB module never enters the cache).
        urlCache.delete(slug)
        return null
      })
    : Promise.resolve(null)
  urlCache.set(slug, promise)
  return promise
}

/** Module-singleton GLTFLoader (stateless between parses). */
const gltfLoader = new GLTFLoader()

/**
 * Extract the single mesh geometry from a parsed GLTF scene. The writer
 * emits exactly one node/mesh/primitive (already named with the slug);
 * naming the mesh/geometry with the slug again keeps per-slug mesh
 * picking/inspection possible straight from the scene graph.
 */
function firstMeshGeometry(gltf: { scene: THREE.Group } | null, slug: string): THREE.BufferGeometry | null {
  if (gltf === null) return null
  let found: THREE.Mesh | null = null
  gltf.scene.traverse((child) => {
    const asMesh = child as THREE.Mesh
    if (found === null && asMesh.isMesh) found = asMesh
  })
  const mesh = found as THREE.Mesh | null
  if (mesh === null) return null
  mesh.name = slug
  const geometry = mesh.geometry
  geometry.name = slug
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Parsed geometries per slug (+ '#mirrored' variants), cached forever. */
const geometryCache = new Map<string, THREE.BufferGeometry>()

/**
 * In-flight parses per slug (+ '#mirrored'). Kept separate from the GEOMETRY
 * cache on purpose: a settled geometry stays cached even while a retry is in
 * flight, and a timed-out attempt can be dropped from this map without
 * discarding a geometry another attempt already produced.
 */
const inFlightLoads = new Map<string, Promise<THREE.BufferGeometry | null>>()

/**
 * Mirror a geometry across the mid-sagittal plane (x → −x) for the mirrored
 * instance of paired records: negate x positions + normals and flip triangle
 * winding, keeping the baked smooth normals.
 */
function mirrorGeometryX(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const mirrored = source.clone()
  const pos = mirrored.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setX(i, -pos.getX(i))
  pos.needsUpdate = true
  const nrm = mirrored.getAttribute('normal') as THREE.BufferAttribute
  if (nrm) {
    for (let i = 0; i < nrm.count; i++) nrm.setX(i, -nrm.getX(i))
    nrm.needsUpdate = true
  }
  const index = mirrored.getIndex()
  if (index !== null) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, b)
    }
    index.needsUpdate = true
  }
  mirrored.computeBoundingBox()
  mirrored.computeBoundingSphere()
  return mirrored
}

/** Cache key of one slug's geometry (mirrored variants are separate entries). */
function geometryKeyOf(slug: string, mirrored: boolean): string {
  return mirrored ? `${slug}#mirrored` : slug
}

function loadAnatomyGeometry(slug: string, mirrored = false): Promise<THREE.BufferGeometry | null> {
  const key = geometryKeyOf(slug, mirrored)
  const cached = geometryCache.get(key)
  if (cached !== undefined) return Promise.resolve(cached)
  const inFlight = inFlightLoads.get(key)
  if (inFlight !== undefined) return inFlight
  const promise = loadGlbUrl(slug)
    .then((url) => {
      if (url === null) return null
      return gltfLoader.loadAsync(url)
    })
    .then((gltf) => {
      const geometry = firstMeshGeometry(gltf, slug)
      if (!geometry) return null
      const result = mirrored ? mirrorGeometryX(geometry) : geometry
      geometryCache.set(key, result)
      inFlightLoads.delete(key)
      return result
    })
    .catch(() => {
      // Transient failure (fetch/parse): drop the in-flight entry so a later
      // mount/retry starts a fresh attempt instead of pinning the v1 fallback.
      inFlightLoads.delete(key)
      return null
    })
  inFlightLoads.set(key, promise)
  return promise
}

/**
 * Drop every cached artefact of one slug so the next load attempt starts from
 * scratch: a resolved (but unusable) url, the in-flight parse, and any
 * geometry a previous attempt produced. Safe to call at any time; the
 * previously handed-out BufferGeometry objects keep rendering (they are owned
 * by the scene until it is rebuilt), so this never blanks a live frame.
 */
export function clearAnatomyAssetCache(slug?: string, mirrored = false): void {
  if (slug === undefined) {
    urlCache.clear()
    inFlightLoads.clear()
    geometryCache.clear()
    return
  }
  urlCache.delete(slug)
  for (const key of [geometryKeyOf(slug, mirrored), geometryKeyOf(slug, !mirrored)]) {
    inFlightLoads.delete(key)
    geometryCache.delete(key)
  }
}

/* ----------------------------------------------------------------- hooks */

/** Load state of one slug's committed mesh. */
export type AnatomyAssetStatus = 'loading' | 'ready' | 'fallback'

export interface AnatomyAsset {
  status: AnatomyAssetStatus
  /** Resolved GLB URL once ready (null before that / on fallback). */
  url: string | null
  /** Manifest entry (present whenever the slug is known to the manifest). */
  part: AnatomyPart | undefined
  /** Parsed geometry (mirrored when requested); null until ready. */
  geometry: THREE.BufferGeometry | null
  /**
   * True when the LAST attempt ended because it exceeded
   * ANATOMY_LOAD_TIMEOUT_MS (as opposed to a missing slug or a failed
   * parse). The UI must render this as a visible failure with a retry,
   * never as "still loading".
   */
  timedOut: boolean
  /** Re-run the load for this slug after a failure/timeout. Idempotent. */
  retry: () => void
}

const NO_RETRY = (): void => {}

const FALLBACK_ASSET: AnatomyAsset = {
  status: 'fallback',
  url: null,
  part: undefined,
  geometry: null,
  timedOut: false,
  retry: NO_RETRY,
}

function fallbackAsset(part: AnatomyPart | undefined, timedOut: boolean, retry: () => void): AnatomyAsset {
  return { status: 'fallback', url: null, part, geometry: null, timedOut, retry }
}

/* ------------------------------------------------- app-wide failure state */

/**
 * Slugs whose LAST attempt exceeded ANATOMY_LOAD_TIMEOUT_MS, keyed by geometry
 * key (`slug` / `slug#mirrored`). This is the app-wide answer to "is any
 * geometry unavailable because a load timed out?" — the viewer surfaces it as a
 * visible, retryable state instead of leaving a panel that quietly lost 40 of
 * its 84 meshes.
 */
const timedOutKeys = new Set<string>()

/** Subscribers to the app-wide timeout state (the anatomy-status notice). */
const timeoutListeners = new Set<() => void>()

/** Subscribers to the app-wide retry generation (every mounted asset hook). */
const retryListeners = new Set<() => void>()

/** Snapshot revision: changes whenever the timeout set changes. */
let timeoutRevision = 0

/** Retry generation: bumped by the global retry so mounted hooks re-run. */
let retryGeneration = 0

/** Snapshot reader for `useSyncExternalStore` (retry generation). */
export function anatomyRetryGeneration(): number {
  return retryGeneration
}

/** Subscribe to the retry generation (Set add/delete; no polling). */
function subscribeRetries(listener: () => void): () => void {
  retryListeners.add(listener)
  return () => {
    retryListeners.delete(listener)
  }
}

function notifyTimeoutChange(): void {
  timeoutRevision += 1
  for (const listener of timeoutListeners) listener()
}

function notifyRetryChange(): void {
  retryGeneration += 1
  for (const listener of retryListeners) listener()
}

/** How many slugs are currently in the timed-out state (0 = healthy). */
export function timedOutAnatomyCount(): number {
  return timedOutKeys.size
}

/** Revision of the timeout state (a `useSyncExternalStore` snapshot). */
export function anatomyTimeoutRevision(): number {
  return timeoutRevision
}

/** Subscribe to timeout-state changes (for `useSyncExternalStore`). */
export function subscribeAnatomyTimeouts(listener: () => void): () => void {
  timeoutListeners.add(listener)
  return () => {
    timeoutListeners.delete(listener)
  }
}

/**
 * Global retry: drop every cached artefact of every slug that timed out and
 * re-run the affected hooks. Returns how many slugs were retried (0 = nothing
 * to retry). Safe to call from a button; a retry already in flight for a slug
 * is restarted, not duplicated, and no live geometry is disposed.
 */
export function retryTimedOutAnatomyAssets(): number {
  if (timedOutKeys.size === 0) return 0
  const keys = [...timedOutKeys]
  timedOutKeys.clear()
  for (const key of keys) {
    const [slug, suffix] = key.split('#')
    clearAnatomyAssetCache(slug, suffix === 'mirrored')
  }
  notifyTimeoutChange()
  notifyRetryChange()
  return keys.length
}

/**
 * Reactive asset state for one slug. Status transitions: 'fallback' when the
 * manifest has no such slug (immediately — the caller renders the v1
 * primitive without any fetch), 'loading' while the GLB resolves/parses, and
 * 'ready' once the geometry is available; a failed fetch/parse — or one that
 * exceeds ANATOMY_LOAD_TIMEOUT_MS — lands back on 'fallback' (with
 * `timedOut` telling the two apart) so the caller keeps the v1 primitive
 * (§2 constraint 6) and can offer `retry()`.
 *
 * The hook is StrictMode-safe: the first effect run's `alive = false` on
 * cleanup only suppresses its own setState; the shared caches are untouched,
 * so the second mount resolves from them (or from the in-flight parse).
 */
export function useAnatomyAsset(
  slug: string | undefined,
  mirrored = false,
  timeoutMs: number = ANATOMY_LOAD_TIMEOUT_MS,
): AnatomyAsset {
  /** Attempt counter: bumped by retry() to re-run the load effect. */
  const [attempt, setAttempt] = useState(0)

  // Lazy initial state: a slug the manifest knows starts as 'loading', NOT
  // 'fallback'. Consumers that treat 'fallback' as "permanently unavailable"
  // (e.g. SectionCanvas deciding the contour registry is complete) would
  // otherwise see every part as settled on the very first render — before any
  // effect ran — and conclude that no geometry exists at all.
  const [asset, setAsset] = useState<AnatomyAsset>(() => {
    if (slug === undefined) return FALLBACK_ASSET
    const known = partBySlug.get(slug)
    return known === undefined
      ? FALLBACK_ASSET
      : { status: 'loading', url: null, part: known, geometry: null, timedOut: false, retry: NO_RETRY }
  })

  const retry = useCallback(() => {
    if (slug === undefined) return
    clearAnatomyAssetCache(slug, mirrored)
    timedOutKeys.delete(geometryKeyOf(slug, mirrored))
    notifyTimeoutChange()
    setAttempt((value) => value + 1)
  }, [slug, mirrored])

  /**
   * The app-wide retry generation. Subscribing here is what makes
   * `retryTimedOutAnatomyAssets()` reach EVERY mounted consumer (SceneLayers,
   * NucleusMesh, the section canvas' 84-part fan-out). The value itself is not
   * used as a plain dependency — that would re-run every load in the app — it
   * only re-renders the hook so the `needsRetry` comparison below can re-run
   * the effect for the slugs that actually timed out.
   */
  const retryGeneration = useSyncExternalStore(
    subscribeRetries,
    anatomyRetryGeneration,
    anatomyRetryGeneration,
  )

  /**
   * Retry trigger for THIS hook. The global retry bumps `retryGeneration`
   * exactly once per click, so comparing it against the last generation this
   * hook consumed gives a single re-run per retry. It is deliberately NOT
   * derived from `timedOutKeys` membership: that set also changes when THIS
   * hook's own attempt times out, and flipping the flag on timeout would make
   * the effect re-run itself immediately — an endless retry loop instead of a
   * settled failure.
   */
  const consumedRetryRef = useRef(retryGeneration)
  const pendingRetry = consumedRetryRef.current !== retryGeneration
  const needsRetry =
    pendingRetry && slug !== undefined && timedOutKeys.has(geometryKeyOf(slug, mirrored))

  useEffect(() => {
    if (!slug || !partBySlug.has(slug)) {
      setAsset(FALLBACK_ASSET)
      return
    }
    const part = partBySlug.get(slug)
    const key = geometryKeyOf(slug, mirrored)
    let alive = true
    // This hook has now consumed the current retry generation: recording it
    // here (not in render) keeps the retry signal one-shot per click.
    consumedRetryRef.current = retryGeneration
    setAsset({ status: 'loading', url: null, part, geometry: null, timedOut: false, retry })
    void withTimeout(
      Promise.all([loadGlbUrl(slug), loadAnatomyGeometry(slug, mirrored)]),
      timeoutMs,
    ).then(
      (outcome) => {
        if (!alive) return
        if (outcome.timedOut) {
          // The attempt is abandoned: drop its in-flight parse so a retry
          // starts a fresh fetch rather than re-awaiting a hung promise, and
          // record the slug in the app-wide timeout set so the viewer can
          // surface "geometry unavailable — retry" for it.
          clearAnatomyAssetCache(slug, mirrored)
          timedOutKeys.add(key)
          notifyTimeoutChange()
          setAsset(fallbackAsset(part, true, retry))
          return
        }
        const [url, geometry] = outcome.value
        if (url === null || geometry === null) {
          setAsset(fallbackAsset(part, false, retry))
        } else {
          timedOutKeys.delete(key)
          setAsset({ status: 'ready', url, part, geometry, timedOut: false, retry })
        }
      },
      () => {
        // A producer rejected (fetch/parse). loadAnatomyGeometry already
        // swallows its own failures, so this is a defensive terminal state.
        if (!alive) return
        setAsset(fallbackAsset(part, false, retry))
      },
    )
    return () => {
      alive = false
    }
    // `needsRetry` is the app-wide retry signal for THIS slug: when
    // retryTimedOutAnatomyAssets() clears the timeout set, only the affected
    // hooks flip it to false and re-run here against the cleared caches.
  }, [slug, mirrored, attempt, timeoutMs, retry, needsRetry])

  return asset
}

/**
 * The loader-contract hook (REALISM_PLAN §4): `{ url, status }` for a slug.
 * status === 'fallback' means "render the v1 primitive" — either the slug is
 * not in the manifest or its GLB could not be resolved (in time or at all).
 */
export function useAnatomyPart(slug: string | undefined): { url: string | null; status: AnatomyAssetStatus } {
  const asset = useAnatomyAsset(slug)
  return { url: asset.url, status: asset.status }
}
