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
 *    parsed with three's GLTFLoader through a promise cache keyed by slug —
 *    every consumer of a slug shares one parsed BufferGeometry (plus a
 *    mirrored variant for the −x instance of paired records);
 *  - the useAnatomyPart / useAnatomyAsset hooks degrade gracefully: a slug
 *    that is missing from the manifest, has no GLB on disk, or fails to parse
 *    reports status 'fallback' and the caller renders the v1 primitive —
 *    the app never blanks (REALISM_PLAN §2 constraint 6).
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
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import manifestJson from '../assets/anatomy/anatomy-manifest.json'
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
const geometryCache = new Map<string, Promise<THREE.BufferGeometry | null>>()

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

function loadAnatomyGeometry(slug: string, mirrored = false): Promise<THREE.BufferGeometry | null> {
  const key = mirrored ? `${slug}#mirrored` : slug
  const cached = geometryCache.get(key)
  if (cached) return cached
  const promise = loadGlbUrl(slug)
    .then((url) => {
      if (url === null) return null
      return gltfLoader.loadAsync(url)
    })
    .then((gltf) => {
      const geometry = firstMeshGeometry(gltf, slug)
      if (!geometry) return null
      return mirrored ? mirrorGeometryX(geometry) : geometry
    })
    .catch(() => {
      // Transient failure (fetch/parse): drop the cached promise so a later
      // mount retries instead of pinning the v1 fallback forever.
      geometryCache.delete(key)
      return null
    })
  geometryCache.set(key, promise)
  return promise
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
}

const FALLBACK_ASSET: AnatomyAsset = { status: 'fallback', url: null, part: undefined, geometry: null }

/**
 * Reactive asset state for one slug. Status transitions: 'fallback' when the
 * manifest has no such slug (immediately — the caller renders the v1
 * primitive without any fetch), 'loading' while the GLB resolves/parses, and
 * 'ready' once the geometry is available; a failed fetch/parse lands back on
 * 'fallback' so the caller keeps the v1 primitive (§2 constraint 6).
 */
export function useAnatomyAsset(slug: string | undefined, mirrored = false): AnatomyAsset {
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
      : { status: 'loading', url: null, part: known, geometry: null }
  })

  useEffect(() => {
    if (!slug || !partBySlug.has(slug)) {
      setAsset(FALLBACK_ASSET)
      return
    }
    const part = partBySlug.get(slug)
    let alive = true
    setAsset({ status: 'loading', url: null, part, geometry: null })
    void Promise.all([loadGlbUrl(slug), loadAnatomyGeometry(slug, mirrored)]).then(
      ([url, geometry]) => {
        if (!alive) return
        if (url === null || geometry === null) {
          setAsset({ status: 'fallback', url: null, part, geometry: null })
        } else {
          setAsset({ status: 'ready', url, part, geometry })
        }
      },
    )
    return () => {
      alive = false
    }
  }, [slug, mirrored])

  return asset
}

/**
 * The loader-contract hook (REALISM_PLAN §4): `{ url, status }` for a slug.
 * status === 'fallback' means "render the v1 primitive" — either the slug is
 * not in the manifest or its GLB could not be resolved.
 */
export function useAnatomyPart(slug: string | undefined): { url: string | null; status: AnatomyAssetStatus } {
  const asset = useAnatomyAsset(slug)
  return { url: asset.url, status: asset.status }
}
