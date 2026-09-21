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
  anatomySlugsForRecord,
  ANATOMY_RECORD_LINKS,
  TEL_HEMISPHERE_RECORD_IDS,
  type AnatomyAssetStatus,
} from '../../geometry/anatomyAssets'
import type { AnatomyPart } from '../../geometry/generated'
import { NERVE_COURSES, type NerveCourseRecord } from '../../geometry/curves'
import { tubeGeometryFor } from '../viewer3d/TractTube'
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
    // v8: iterate the record's ACTUAL body list per side rather than `link.body`
    // alone. A record may now own several meshes per side (the MCA's M1+M2, the
    // PCA's P1+P2 through `also`/`alsoRight`) and may name its right side
    // explicitly (`bodyRight`). Every one of those slugs is a committed GLB the
    // section worker loads, and a slug missing from this table resolves to
    // `region: null` — which the canvas reads as "no region filter applies to
    // me", i.e. it would paint the MCA's M2 segment even with the vascular layer
    // switched off. Deriving from the same helper `SceneLayers` uses keeps the 3D
    // pass and the section pass from disagreeing about which record a mesh is.
    const sides = anatomySlugsForRecord(recordId)
    if (sides === null) continue
    for (const slug of sides.left) {
      assign(slug, recordId, link.region)
      // Paired bodies are committed as BOTH `…-l` and `…-r` GLBs, while
      // ANATOMY_RECORD_LINKS names only the `-l` mesh (SceneLayers mirrors that
      // one geometry into the right-hand slot). The section worker loads EVERY
      // committed GLB, so the `-r` twin needs the same override or its contours
      // would paint outside every region filter.
      if (slug.endsWith('-l')) {
        assign(`${slug.slice(0, -2)}-r`, recordId, link.region)
      }
    }
    for (const slug of sides.right ?? []) assign(slug, recordId, link.region)
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

/* ------------------------------------------- v14 cranial-nerve courses */

/**
 * THE PROBLEM THIS SOLVES (PLAN.md §4). The live section paints committed GLB
 * parts: `SECTION_PARTS` is *exactly* `getManifest().parts.map(metaFor)`, the
 * canvas builds its worker registry from that list alone, and the worker
 * protocol carries raw positions/indices. Tube geometry is PROCEDURAL — it is
 * swept in the browser by `TractTube` and exists nowhere on disk — so before
 * v14 **no tract and no cranial nerve could appear in the 2D section by any
 * code path**, and the user's twelve nerves were invisible in the live section
 * and in the PiP that mounts the same canvas.
 *
 * ROUTE (a), procedural, CHOSEN — and (b), baked GLBs, rejected by measurement:
 * one tube at `TractTube`'s parameters is 803 verts / 1440 tris, i.e. ~34.5 KiB
 * raw and ~21.6 KiB quantized per tube; the twelve nerves are 24 tubes because
 * every nerve record is `paired`, so baking costs **0.809 MiB raw / 0.506 MiB
 * quantized** (0.404 / 0.253 one-sided). The anatomy DIRECTORY — the reading
 * `verify:anatomy` and `verify:budget-report` take — has **0.1086 MiB** of
 * headroom against the 14 MiB cap, so even the one-sided quantized case is 2.3×
 * the budget. Route (a) costs **0 bytes on disk**: the tube is swept at runtime
 * through the very same `tubeGeometryFor` the 3D pass uses, so the 2D contour is
 * the intersection of the SAME geometry the user sees in 3D — one builder, one
 * cache, by construction rather than by coincidence.
 *
 * `SECTION_PARTS` itself is UNCHANGED (138 entries, byte-identical), so every
 * count-based gate that sweeps it — `view-filter-consistency`'s 102/102,
 * `cranial-nerves.mjs`'s and `audit.mjs`'s `138` assertions — keeps its domain.
 * Only the canvas's own two call sites move to `partsForCanvas()`.
 */

/** Where a nerve course sits in the draw order — the solid-body bucket. */
const NERVE_SECTION_KIND: SectionKind = 'nucleus'

/**
 * The procedural section part for one course. `slug` and `group` are both the
 * course id (the same `nrv-*` id the 3D scene selects by, and the same id
 * `isPartVisible`'s taxonomy lookup resolves), `region` comes from the course,
 * and `taxonomyKind: 'nerve'` is what makes the Systems row's "Cranial nerves"
 * button gate the nerve contours — `isPartVisible` prefers `taxonomyKind` over
 * the draw bucket, so no change to that predicate is needed.
 */
function nerveCourseMeta(course: NerveCourseRecord): SectionPartMeta {
  const entry = getTaxonomyEntry(course.id)
  return {
    slug: course.id,
    group: course.id,
    region: course.region,
    kind: NERVE_SECTION_KIND,
    taxonomyKind: entry?.kind ?? course.kind,
    color: entry?.color ?? course.color,
  }
}

/**
 * One section part per cranial-nerve course, in course order (stable — the
 * registry key is the slug, and the canvas's Path2D cache is keyed the same
 * way). Twelve entries; nothing here touches the manifest.
 */
export const SECTION_NERVE_PARTS: readonly SectionPartMeta[] = NERVE_COURSES.map(nerveCourseMeta)

/**
 * What the live section draws: the committed GLB parts followed by the
 * procedural cranial-nerve parts. The canvas's visible-list filter and its
 * worker registry both read THIS, so a nerve is drawn iff its contours came
 * back from the worker — which cannot happen unless the worker was handed its
 * geometry, which is why the registry below is the only other change.
 */
export function partsForCanvas(): readonly SectionPartMeta[] {
  return [...SECTION_PARTS, ...SECTION_NERVE_PARTS]
}

/**
 * The cranial-nerve part of the worker registry: the tube geometry the 3D pass
 * renders, copied into worker-owned transferable arrays by the same adapter the
 * committed parts use (`registryPartFromGeometry`), which already accepts an
 * arbitrary `BufferGeometry`.
 *
 * Copied, not shared: `registryPartFromGeometry` builds FRESH `Float32Array` /
 * `Uint32Array` views, so transferring these to the worker cannot detach an
 * attribute the 3D scene is still drawing (the parsed GLB geometries have the
 * same constraint and get the same treatment).
 *
 * A course whose sweep yields no positions returns null and is skipped — the
 * canvas then simply has no contour entry for that slug, exactly as it does for
 * a GLB that failed to load.
 */
export function registryNerveParts(): WorkerRegistryPart[] {
  const parts: WorkerRegistryPart[] = []
  for (const course of NERVE_COURSES) {
    const part = registryPartFromGeometry(nerveCourseMeta(course), tubeGeometryFor(course))
    if (part !== null) parts.push(part)
    // v17 — paired nerves sweep their MIRROR-IMAGE course as well, so the 2D
    // section shows both sides exactly as the 3D pass does (SceneLayers renders
    // the same twin). The mirrored part keeps the record id as its GROUP — so a
    // contour on either side selects/highlights the same record — and gets a
    // suffixed slug so it cannot collide with the authored side in the worker
    // registry. Nerves the registry does not call `paired` stay one-sided.
    if (getTaxonomyEntry(course.id)?.laterality !== 'paired') continue
    const mirroredCourse: NerveCourseRecord = {
      ...course,
      waypoints: course.waypoints.map(([x, y, z]) => [-x, y, z] as [number, number, number]),
    }
    const mirrored = registryPartFromGeometry(nerveCourseMeta(mirroredCourse), tubeGeometryFor(mirroredCourse))
    if (mirrored !== null) parts.push({ ...mirrored, slug: `${mirrored.slug}#mirror` })
  }
  return parts
}

/* ------------------------------------------------- v9 cortical-lobe layer */

/**
 * The two cortical-ribbon GLBs the rough lobe partition re-colours
 * (corticalLobes.ts, docs/SWARM_V9_PLAN.md §2). These are the DERIVED
 * hemisphere shells — the same slugs `TEL_HEMISPHERE_SHELLS` names — and they
 * are the only section parts whose contours carry a cortical ribbon: every
 * other part is a nucleus, a tract, a ventricle or a deep surface, which has no
 * lobe to belong to. The layer is drawn OVER their existing context fill, so
 * the partition never replaces the taxonomy colouring.
 */
export const SECTION_CORTICAL_RIBBON_SLUGS: ReadonlySet<string> = new Set([
  'ctx-hemisphere-l',
  'ctx-hemisphere-r',
])

/**
 * Whether a section part's contour is a piece of the cortical ribbon the
 * cortical-division layer may re-colour. Pure slug test (no geometry, no
 * taxonomy read) so the canvas can call it per part per frame.
 */
export function isCorticalRibbonSlug(slug: string): boolean {
  return SECTION_CORTICAL_RIBBON_SLUGS.has(slug)
}

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
