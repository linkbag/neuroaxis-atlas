/**
 * sectionAssets.ts — geometry source for the 2D live-section canvas
 * (SECTION_SYNC_PLAN §2.2, section-canvas task).
 *
 * Maps every committed anatomy GLB (src/assets/anatomy/anatomy-manifest.json)
 * to a section-part descriptor: the slug whose BufferGeometry the loader
 * parses, the selection/highlight GROUP (taxonomy id — mirror GLBs like
 * ctx-thalamus-l share the ctx-thalamus-envelope group, matching the 3D
 * envelope pass in viewer3d/SceneLayers), region/kind/color from the
 * taxonomy registry, and a draw bucket that orders the canvas fills.
 *
 * The loader contract in src/geometry/anatomyAssets.ts is reused as-is
 * (useAnatomyAsset per slug — module-singleton promise cache, so these
 * fetches/parses are shared with the 3D viewer). Positions/indices are
 * COPIED out for the worker: the parsed BufferGeometries back the 3D scene
 * and must never have their attributes detached by transfer.
 */
import type { Region } from '../../types'
import { getTaxonomyEntry } from '../../data/load'
import {
  getManifest,
  useAnatomyAsset,
  ANATOMY_RECORD_LINKS,
  TEL_HEMISPHERE_RECORD_IDS,
  type AnatomyAssetStatus,
} from '../../geometry/anatomyAssets'
import type { AnatomyPart } from '../../geometry/generated'
import type { WorkerRegistryPart } from './contourWorker'

/** Draw buckets — lower is painted first (section canvases stack under
 *  envelopes → ventricles → nuclei, mirroring scene layering). */
export type SectionKind = 'context' | 'ventricle' | 'nucleus'

export const SECTION_KIND_ORDER: readonly SectionKind[] = ['context', 'ventricle', 'nucleus']

/** Fill opacity per draw bucket (2D section alpha of the even-odd fill). */
export const SECTION_KIND_ALPHA: Record<SectionKind, number> = {
  context: 0.3,
  ventricle: 0.5,
  nucleus: 0.8,
}

/** Fallback colors mirroring the §6 palette (taxonomy color wins when known). */
const FALLBACK_COLORS: Record<SectionKind, string> = {
  context: '#94a3b8',
  ventricle: '#06b6d4',
  nucleus: '#d97706',
}

export interface SectionPartMeta {
  /** Manifest slug (GLB identity, unique — the worker registry key). */
  slug: string
  /** Selection/highlight group (taxonomy id when one exists). */
  group: string
  region: Region | null
  kind: SectionKind
  /** Taxonomy kind when the group resolves to a registry entry. */
  taxonomyKind: string | null
  /** Fill color: taxonomy color of slug, then of the group, then kind default. */
  color: string
}

/**
 * GLB slugs without their own taxonomy record: map to the record id the 3D
 * scene highlights them under (mirror pairs share one envelope record) and
 * to a region. Everything else resolves straight through taxonomy by slug.
 *
 * v7 (plan C9): the telencephalon slugs are DERIVED from
 * `anatomyAssets.ANATOMY_RECORD_LINKS` — the same table `SceneLayers` reads to
 * decide which body draws which record. Before v7 a new manifest part without a
 * taxonomy entry of its own fell through with `region: null` and no taxonomy
 * colour, so the live section painted the whole telencephalon outside every
 * region filter. Deriving the overrides from the shared table means the two
 * consumers cannot disagree, and the individual entries are organised `body →
 * record` so a body that several records share (the corpus callosum, the
 * ventricular cast) resolves to the record that actually draws it.
 */
const TEL_SLUG_OVERRIDES: Record<string, { group: string; region: Region }> = (() => {
  const overrides: Record<string, { group: string; region: Region }> = {}
  const assign = (slug: string, group: string, region: Region): void => {
    // First writer wins: Object.entries preserves declaration order, and
    // ANATOMY_RECORD_LINKS is declared body-first (the record that draws a body
    // precedes the sub-regions that redirect to it).
    if (overrides[slug] === undefined) overrides[slug] = { group, region }
  }
  for (const [recordId, link] of Object.entries(ANATOMY_RECORD_LINKS)) {
    if (link.body === null) continue
    assign(link.body, recordId, link.region)
    // Paired bodies are committed as BOTH `…-l` and `…-r` GLBs, while
    // ANATOMY_RECORD_LINKS names only the `-l` mesh (SceneLayers mirrors that
    // one geometry into the right-hand slot). The section worker loads EVERY
    // committed GLB, so the `-r` twin needs the same override or its contours
    // would paint outside every region filter.
    if (link.body.endsWith('-l')) {
      assign(`${link.body.slice(0, -2)}-r`, recordId, link.region)
    }
  }
  // The hemisphere shells group under the cortex record — the same id the ghost
  // pass makes clickable — so a section contour of the shell highlights with the
  // 3D selection. `TEL_HEMISPHERE_RECORD_IDS` is the record; the two shell slugs
  // are the bodies (see TEL_HEMISPHERE_SHELLS).
  for (const shell of ['ctx-hemisphere-l', 'ctx-hemisphere-r']) {
    for (const recordId of TEL_HEMISPHERE_RECORD_IDS) {
      assign(shell, recordId, 'telencephalon')
    }
  }
  return overrides
})()

const GROUP_OVERRIDES: Record<string, { group: string; region: Region }> = {
  'ctx-thalamus-l': { group: 'ctx-thalamus-envelope', region: 'diencephalon' },
  'ctx-thalamus-r': { group: 'ctx-thalamus-envelope', region: 'diencephalon' },
  'ctx-cerebellum-l': { group: 'ctx-cerebellum', region: 'cerebellum' },
  'ctx-cerebellum-r': { group: 'ctx-cerebellum', region: 'cerebellum' },
  'ctx-cerebellar-vermis': { group: 'ctx-cerebellum', region: 'cerebellum' },
  'ctx-hypothalamus-surface': { group: 'ctx-hypothalamus-envelope', region: 'diencephalon' },
  'ctx-medulla-surface': { group: 'ctx-medulla-surface', region: 'medulla' },
  'ctx-pons-surface': { group: 'ctx-pons-surface', region: 'pons' },
  'ctx-midbrain-surface': { group: 'ctx-midbrain-surface', region: 'midbrain' },
  'ctx-pineal': { group: 'env-pineal', region: 'diencephalon' },
  ...TEL_SLUG_OVERRIDES,
}

function metaFor(part: AnatomyPart): SectionPartMeta {
  const override = GROUP_OVERRIDES[part.slug]
  const group = override?.group ?? part.slug
  const entry = getTaxonomyEntry(part.slug) ?? getTaxonomyEntry(group)
  const region = override?.region ?? entry?.region ?? null
  return {
    slug: part.slug,
    group,
    region,
    kind: part.kind === 'ventricle' ? 'ventricle' : part.kind === 'context' ? 'context' : 'nucleus',
    taxonomyKind: entry?.kind ?? null,
    color: entry?.color ?? FALLBACK_COLORS[part.kind === 'ventricle' ? 'ventricle' : part.kind === 'context' ? 'context' : 'nucleus'],
  }
}

/** Every committed GLB as a section part, in manifest order (stable). */
export const SECTION_PARTS: readonly SectionPartMeta[] = getManifest().parts.map(metaFor)

/** Copy positions + indices out of a parsed geometry as worker-owned
 *  transferables (detach-safe for the 3D scene's shared geometry).
 *
 *  The copies go into FRESH ArrayBuffers rather than `.slice()`: an attribute's
 *  `.array` is not guaranteed to be a plain Float32Array (a loader may hand
 *  back Float64Array/Uint16Array-backed, interleaved or shared views), and
 *  `worker.postMessage(msg, transfer)` throws DataCloneError for any transfer
 *  entry that is not a transferable ArrayBufferView. */
export function registryPartFromGeometry(
  meta: SectionPartMeta,
  geometry: import('three').BufferGeometry,
): WorkerRegistryPart | null {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return null
  const positions = new Float32Array(position.count * 3)
  const source = position.array as Float32Array | Float64Array | number[] | undefined
  if (source !== undefined && source.length >= positions.length) {
    positions.set(source.length === positions.length ? source : source.slice(0, positions.length))
  } else {
    // Unpacked / custom layout: read through the attribute accessors instead.
    for (let i = 0; i < position.count; i++) {
      positions[i * 3] = position.getX(i)
      positions[i * 3 + 1] = position.getY(i)
      positions[i * 3 + 2] = position.getZ(i)
    }
  }
  const sourceIndex = geometry.getIndex()
  let indices: Uint32Array
  if (sourceIndex !== null && sourceIndex.count > 0) {
    indices = new Uint32Array(sourceIndex.count)
    indices.set(sourceIndex.array as ArrayLike<number>)
  } else {
    indices = new Uint32Array(position.count)
    for (let i = 0; i < position.count; i++) indices[i] = i
  }
  return {
    slug: meta.slug,
    group: meta.group,
    region: meta.region,
    kind: meta.kind,
    color: meta.color,
    positions,
    indices,
  }
}

export interface SectionGeometryStatus {
  /** Per-slug loader state ('ready' means the geometry is available). */
  statuses: Map<string, AnatomyAssetStatus>
  /** Parsed BufferGeometry per slug (null while loading / on fallback). */
  geometries: Map<string, import('three').BufferGeometry | null>
  /** Ready or permanently-fallback parts the registry skips counting. */
  readyCount: number
  total: number
}

/**
 * Reactive geometry status for every section part, driven by the shared
 * anatomyAsset hooks (stable hook order — SECTION_PARTS is a module
 * constant). The canvas builds the worker registry once `ready` + `total`
 * match, so the first plane post happens after one full load pass.
 */
export function useSectionGeometryStatus(): SectionGeometryStatus {
  const statuses = new Map<string, AnatomyAssetStatus>()
  const geometries = new Map<string, import('three').BufferGeometry | null>()
  for (const part of SECTION_PARTS) {
    const asset = useAnatomyAsset(part.slug)
    statuses.set(part.slug, asset.status)
    geometries.set(part.slug, asset.geometry)
  }
  let readyCount = 0
  for (const status of statuses.values()) {
    if (status === 'ready' || status === 'fallback') readyCount += 1
  }
  return { statuses, geometries, readyCount, total: SECTION_PARTS.length }
}
