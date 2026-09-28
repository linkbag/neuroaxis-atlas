/**
 * spinalParts.ts — the ONE part table for the spinal cord (plan
 * docs/SPINAL_CORD_PLAN.md §3–§6). Everything that renders the cord — the 3D
 * pass (src/components/viewer3d/SceneLayers.tsx), the 2D section
 * (src/components/section/sectionAssets.ts + SectionCanvas.tsx) and both new
 * gates (scripts/verify/spinal-geometry.mjs, spinal-sections.mjs) — resolves
 * geometry through this module, so "the same geometry feeds 2D and 3D" is true
 * by construction: `spinalGeometry(slug)` is memoized, so a slug has exactly
 * one BufferGeometry per session.
 *
 * A part is one renderable teaching body: cord surface, conus, filum, central
 * canal, the gray-matter H columns, the named gray nuclei (level-restricted),
 * the white-matter funiculi zones (gracilis / cuneatus / lateral / anterior),
 * the root bundles and the cauda equina. Paired parts are authored for the
 * patient-LEFT side (x ≥ 0, canonical space: x = +patient-left) and mirrored
 * to `${slug}#mirror`, the same twin convention the vessel courses use
 * (src/geometry/vasculature-courses.ts `mirrorVesselCourse`).
 *
 * Record mapping is ALIAS-TOLERANT: teammate `spinal-data` authors the exact
 * ids for the ~90 spinal records (region `spinal`, slugs nuc-/tract-/surf- per
 * the plan; the exact id table is not pinned in the plan doc), so
 * `spinalRecordMatchers` matches by well-known slug fragments and the
 * integration step joins the rest. A record that maps here gets this geometry
 * as its body (and must be suppressed from the ellipsoid fallback pass — one
 * record, one body); an unmapped record keeps the ordinary NucleusMesh
 * origin3d/size3d fallback, so nothing can go unrendered while ids settle.
 */
import * as THREE from 'three'
import {
  buildAnteriorFuniculus,
  buildCaudaEquina,
  buildCentralCanal,
  buildCommissureHalf,
  buildConusCore,
  buildCordSurface,
  buildCuneatus,
  buildDorsalHorn,
  buildFilum,
  buildGracilis,
  buildLateralFuniculus,
  buildLateralHorn,
  buildNamedGrayColumn,
  buildRootStub,
  buildSegmentBand,
  buildVentralHorn,
  mergeGeometries,
  mirrorGeometry,
  SPINAL_SEGMENTS,
  type SpinalSegment,
} from './spinalCord'

/** 2D draw bucket — SECTION_KIND_ORDER paints context → ventricle → nucleus, so
 * gray matter (nucleus) lands OVER the white zones (context): the histology
 * reading the plan asks for. */
export type SpinalBucket = 'context' | 'ventricle' | 'nucleus'

export interface SpinalPart {
  /** Worker-registry slug and section meta slug. */
  slug: string
  /** Taxonomy group label (plan §2 subdivisions). */
  group: string
  /** Primary record id this body stands for (best guess; see module doc). */
  recordId: string
  /** Alias patterns matched against lower-cased record ids. */
  aliases: readonly RegExp[]
  /** 2D draw bucket (paint order). */
  bucket: SpinalBucket
  /** Layer-taxonomy kind used to gate this part (falls back when the record's
   * own taxonomy entry says otherwise — resolved at the two mount sites). */
  taxonomyKind: string
  /** Material hint for src/geometry/materials.ts `makeAnatomyMaterial`. */
  materialHint: 'gray-matter' | 'white-matter' | 'csf' | 'nucleus' | 'context' | 'vasculature'
  /** Paint color (2D section) and material tint (3D). */
  color: string
  /** Authored for patient-left; a mirrored twin is mounted/registered too. */
  paired: boolean
  /** Canonical-space geometry builder (patient-LEFT side when paired). */
  build: () => THREE.BufferGeometry
}

const GRAY = '#b7a8a4'
const NUCLEUS = '#c08497'
const CSF = '#06b6d4'
const CONTEXT = '#94a3b8'

/**
 * THE part table. Order is irrelevant to painting (the bucket decides) but
 * keeps the table readable: shell → canal → gray → named nuclei → white.
 * Segment-band rows are appended (see `segmentParts`).
 */
const SPINAL_PARTS_CORE: readonly SpinalPart[] = [
  {
    slug: 'spinal-cord-surface',
    group: 'Spinal cord',
    recordId: 'ctx-spinal-cord',
    aliases: [/^surf-.*spinal-cord/, /spinal-cord(?!-)/, /^surf-cord$/, /^ctx-spinal-cord$/],
    bucket: 'context',
    taxonomyKind: 'surface',
    materialHint: 'context',
    color: CONTEXT,
    paired: false,
    build: () => buildCordSurface(),
  },
  {
    slug: 'spinal-conus',
    group: 'Spinal segments',
    recordId: 'ctx-conus-medullaris',
    aliases: [/conus-medullaris/, /conus-terminalis/, /surf-conus-medullaris/],
    bucket: 'context',
    taxonomyKind: 'surface',
    materialHint: 'context',
    color: CONTEXT,
    paired: false,
    // The conus record's body is the tapered terminal column inset (0.9×)
    // under the cord shell — buildConusCore — so it is a separate, clickable
    // surface without coincident faces.
    build: () => buildConusCore(),
  },
  {
    slug: 'spinal-filum',
    group: 'Roots & meninges',
    recordId: 'ctx-filum-terminale',
    aliases: [/filum/],
    bucket: 'context',
    taxonomyKind: 'surface',
    materialHint: 'nucleus',
    color: '#d7cfc4',
    paired: false,
    build: () => buildFilum(),
  },
  {
    slug: 'spinal-central-canal',
    group: 'Gray matter',
    recordId: 'vent-central-canal',
    aliases: [/central-canal/, /canal(?!-)/],
    bucket: 'ventricle',
    taxonomyKind: 'ventricle',
    materialHint: 'csf',
    color: CSF,
    paired: false,
    build: () => buildCentralCanal(),
  },
  /* ---------------- gray matter: the H columns ---------------- */
  {
    slug: 'spinal-dorsal-horn',
    group: 'Gray matter',
    recordId: 'ctx-dorsal-horn',
    aliases: [/dorsal-horn/, /horn.*dorsal/],
    bucket: 'nucleus',
    taxonomyKind: 'nucleus',
    materialHint: 'nucleus',
    color: GRAY,
    paired: true,
    build: () => buildDorsalHorn(),
  },
  {
    slug: 'spinal-ventral-horn',
    group: 'Gray matter',
    recordId: 'ctx-ventral-horn',
    aliases: [/ventral-horn/, /horn.*ventral/],
    bucket: 'nucleus',
    taxonomyKind: 'nucleus',
    materialHint: 'nucleus',
    color: GRAY,
    paired: true,
    build: () => buildVentralHorn(),
  },
  {
    slug: 'spinal-lateral-horn',
    group: 'Gray matter',
    recordId: 'ctx-lateral-horn',
    aliases: [/lateral-horn/, /horn.*lateral/],
    bucket: 'nucleus',
    taxonomyKind: 'nucleus',
    materialHint: 'nucleus',
    color: GRAY,
    paired: true,
    build: () => buildLateralHorn(),
  },
  {
    slug: 'spinal-gray-commissure',
    group: 'Gray matter',
    recordId: 'nuc-gray-commissure',
    // NO bare /commissure/ alias: it would swallow tract-posterior-commissure
    // (diencephalon), tract-fornix-commissure (telencephalon) and
    // tract-anterior-white-commissure (its own spinal record, fallback body).
    aliases: [/gray-commissure/, /commissura-grisea/],
    bucket: 'nucleus',
    taxonomyKind: 'nucleus',
    materialHint: 'nucleus',
    color: GRAY,
    paired: true,
    build: () => buildCommissureHalf(),
  },
  /* ---------------- named gray nuclei (level-restricted) ---------------- */
  ...namedColumnParts(),
  /* ---------------- white matter: the funiculi zones ---------------- */
  {
    slug: 'spinal-gracilis',
    group: 'White matter',
    // ONE posterior-funiculus record covers both stripes (gracilis medial,
    // cuneatus T6+ lateral). NEVER bind the medulla records
    // tract-fasciculus-gracilis / nuc-nucleus-gracilis here — their brainstem
    // bodies must keep rendering.
    recordId: 'tract-posterior-funiculus',
    aliases: [/posterior-funiculus/, /dorsal-funiculus/],
    bucket: 'context',
    taxonomyKind: 'tract',
    materialHint: 'white-matter',
    color: '#e0d3ad',
    paired: false,
    build: () => buildGracilis(),
  },
  {
    slug: 'spinal-cuneatus',
    group: 'White matter',
    // Shares tract-posterior-funiculus with the gracilis stripe (the record is
    // the whole dorsal column). No /cuneat/ alias — that swallows the MEDULLA
    // records tract-fasciculus-cuneatus / nuc-nucleus-cuneatus.
    recordId: 'tract-posterior-funiculus',
    aliases: [],
    bucket: 'context',
    taxonomyKind: 'tract',
    materialHint: 'white-matter',
    color: '#d2bd91',
    paired: false,
    // T6-and-ABOVE only — the absence below T6 is a teaching point the
    // sections must show (buildCuneatus closes at T6 − 4).
    build: () => buildCuneatus(),
  },
  {
    slug: 'spinal-lateral-funiculus',
    group: 'White matter',
    recordId: 'tract-lateral-funiculus',
    aliases: [/lateral-funic/, /funiculus-lateral/],
    bucket: 'context',
    taxonomyKind: 'tract',
    materialHint: 'white-matter',
    color: '#c3b2d6',
    paired: false,
    build: () => buildLateralFuniculus(),
  },
  {
    slug: 'spinal-anterior-funiculus',
    group: 'White matter',
    recordId: 'tract-anterior-funiculus',
    aliases: [/anterior-funic/, /funiculus-anterior/],
    bucket: 'context',
    taxonomyKind: 'tract',
    materialHint: 'white-matter',
    color: '#aec4d4',
    paired: false,
    build: () => buildAnteriorFuniculus(),
  },
  /* ---------------- roots & meninges ---------------- */
  {
    slug: 'spinal-dorsal-roots',
    group: 'Roots & meninges',
    recordId: 'tract-dorsal-rootlets',
    // /dorsal-rootlet/ only: bare /dorsal-root/ swallows nuc-dorsal-root-ganglion.
    aliases: [/dorsal-rootlet/, /dorsal-roots$/],
    bucket: 'context',
    taxonomyKind: 'nerve',
    materialHint: 'nucleus',
    color: '#d9c9b6',
    paired: true,
    build: () => buildRootBundle('dorsal'),
  },
  {
    slug: 'spinal-ventral-roots',
    group: 'Roots & meninges',
    recordId: 'tract-ventral-rootlets',
    aliases: [/ventral-rootlet/, /ventral-roots$/],
    bucket: 'context',
    taxonomyKind: 'nerve',
    materialHint: 'nucleus',
    color: '#d9c9b6',
    paired: true,
    build: () => buildRootBundle('ventral'),
  },
  {
    slug: 'spinal-cauda-equina',
    group: 'Roots & meninges',
    recordId: 'ctx-cauda-equina',
    // /cauda-equina/ only: bare /cauda/ swallows nuc-caudate-head/body/tail.
    aliases: [/cauda-equina/],
    bucket: 'context',
    taxonomyKind: 'nerve',
    materialHint: 'nucleus',
    color: '#d9c9b6',
    paired: true,
    build: () => buildCaudaEquina(),
  },
]

/**
 * One band per spinal segment (C1…Co1), addressed to the platform's
 * `ctx-seg-*` records (taxonomy.json). Bands render statically — one per
 * segment — so every segment has a body whether or not its structure record
 * has landed yet; the SceneLayers suppression then hides any duplicate.
 */
function segmentParts(): SpinalPart[] {
  return SPINAL_SEGMENTS.map((s: SpinalSegment) => ({
    slug: `spinal-segment-${s.id.toLowerCase()}`,
    group: 'Spinal segments',
    recordId: `ctx-seg-${s.id.toLowerCase()}`,
    aliases: [new RegExp(`(?:^|[-_])${s.id.toLowerCase()}(?:$|[-_])`)],
    bucket: 'context' as const,
    taxonomyKind: 'context',
    materialHint: 'context' as const,
    color: CONTEXT,
    paired: false,
    build: () => {
      const made = buildSegmentBand(s.id)
      return made ?? new THREE.BufferGeometry()
    },
  }))
}

export const SPINAL_PARTS: readonly SpinalPart[] = [...SPINAL_PARTS_CORE, ...segmentParts()]

/** Named-gray-column parts (plan §3 names) derived from NAMED_GRAY_COLUMNS. */
function namedColumnParts(): SpinalPart[] {
  // recordId = the real id landed in src/data/structures/spinal-gray-matter.json;
  // aliases stay tolerant (\b so lamina-i never swallows lamina-ii etc.).
  const rows: Array<{ key: string; recordId: string; aliases: RegExp[]; group?: string }> = [
    { key: 'marginal-zone', recordId: 'nuc-rexed-lamina-i', aliases: [/\brexed-lamina-i\b/, /marginal/] },
    { key: 'substantia-gelatinosa', recordId: 'nuc-rexed-lamina-ii', aliases: [/\brexed-lamina-ii\b/, /gelatinosa/] },
    { key: 'nucleus-proprius', recordId: 'nuc-nucleus-proprius', aliases: [/proprius/, /laminae-iii-iv/] },
    {
      key: 'rexed-v-vi', recordId: 'nuc-rexed-lamina-v',
      aliases: [/\brexed-lamina-v\b/, /\brexed-lamina-vi\b/, /rexed-v-vi/, /rexed-5/, /rexed-6/],
    },
    {
      key: 'clarkes-nucleus', recordId: 'nuc-clarke',
      aliases: [/clarke/, /dorsal-nucleus-of-clarke/, /nuc-clarkes-nucleus/],
    },
    {
      key: 'intermediolateral', recordId: 'nuc-intermediolateral',
      aliases: [/intermediolateral/, /iml/],
    },
    {
      key: 'sacral-parasympathetic', recordId: 'nuc-sacral-parasympathetic',
      aliases: [/sacral-parasympathetic/, /parasympathetic/, /onuf/],
    },
    {
      key: 'intermediate-zone', recordId: 'nuc-rexed-lamina-vii',
      aliases: [/\brexed-lamina-vii\b/, /intermediate-zone/],
    },
    {
      key: 'lmn-motor-columns', recordId: 'nuc-lmn-medial-column',
      aliases: [/lmn-medial/, /lmn-lateral/, /\brexed-lamina-ix\b/, /motor-column/, /lmn-motor/],
    },
    { key: 'rexed-viii', recordId: 'nuc-rexed-lamina-viii', aliases: [/\brexed-lamina-viii\b/, /rexed-8/] },
  ]
  return rows.map(({ key, recordId, aliases, group }) => ({
    slug: `spinal-nucleus-${key}`,
    group: group ?? 'Gray matter',
    recordId,
    aliases,
    bucket: 'nucleus' as const,
    taxonomyKind: 'nucleus',
    materialHint: 'nucleus' as const,
    color: NUCLEUS,
    paired: true,
    build: () => {
      const made = buildNamedGrayColumn(key)
      return made ?? new THREE.BufferGeometry()
    },
  }))
}

/** Root bundle across the 31 segments, patient-LEFT side. */
function buildRootBundle(role: 'dorsal' | 'ventral'): THREE.BufferGeometry {
  return mergeGeometries(
    SPINAL_SEGMENTS.map((s: SpinalSegment) => buildRootStub(s.id, role)),
  )
}

/* ------------------------------------------------------------------ */
/* Memoized geometry — one BufferGeometry per slug per session          */
/* ------------------------------------------------------------------ */

const geometryCache = new Map<string, THREE.BufferGeometry>()

/** The canonical-space geometry for a part slug (memoized; mirrored on demand). */
export function spinalGeometry(slug: string): THREE.BufferGeometry | null {
  if (slug.endsWith('#mirror')) {
    const base = slug.slice(0, -'#mirror'.length)
    const key = `${base}#mirror`
    const cached = geometryCache.get(key)
    if (cached) return cached
    const source = spinalGeometry(base)
    if (!source) return null
    const mirrored = mirrorGeometry(source)
    mirrored.computeBoundingBox()
    geometryCache.set(key, mirrored)
    return mirrored
  }
  const cached = geometryCache.get(slug)
  if (cached) return cached
  const part = SPINAL_PARTS.find((p) => p.slug === slug)
  if (!part) return null
  const made = part.build()
  made.computeBoundingBox()
  geometryCache.set(slug, made)
  return made
}

/** Every registered slug including mirror twins (worker registry order). */
export function spinalRegistrySlugs(): string[] {
  const slugs: string[] = []
  for (const part of SPINAL_PARTS) {
    slugs.push(part.slug)
    if (part.paired) slugs.push(`${part.slug}#mirror`)
  }
  return slugs
}

/* ------------------------------------------------------------------ */
/* Record mapping (alias-tolerant)                                      */
/* ------------------------------------------------------------------ */

/** Segment referenced in a record id ('C5', 'T8', 'L3', 'S4', 'Co1', …) or null. */
export function segmentFromRecordId(recordId: string): string | null {
  const m = recordId.toLowerCase().match(/(?:^|[-_])(co|c|t|l|s)(\d{1,2})(?:$|[-_])/)
  if (!m) return null
  const id = `${m[1] === 'co' ? 'Co' : m[1].toUpperCase()}${m[2]}`
  return SPINAL_SEGMENTS.some((s) => s.id === id) ? id : null
}

/** The spinal part a record id maps to, or null (record keeps its fallback). */
export function spinalRecordPart(recordId: string): SpinalPart | null {
  const id = recordId.toLowerCase()
  for (const part of SPINAL_PARTS) {
    if (part.recordId.toLowerCase() === id) return part
    for (const alias of part.aliases) {
      if (alias.test(id)) return part
    }
  }
  return null
}

/**
 * Extra per-record bodies the part table cannot express statically (today:
 * per-root records addressed to ONE segment get that segment's stub; segment
 * bands are static parts already). Returns null for ids with no procedural
 * body — the NucleusMesh ellipsoid fallback covers them.
 */
export function spinalRecordPartGeometry(recordId: string): THREE.BufferGeometry | null {
  const id = recordId.toLowerCase()
  const segment = segmentFromRecordId(recordId)
  if (segment && /root/.test(id)) {
    const role: 'dorsal' | 'ventral' = /ventral/.test(id) ? 'ventral' : 'dorsal'
    return buildRootStub(segment, role, 0.3)
  }
  return null
}

/** Ids of records with a procedural spinal body (suppress their fallback pass). */
export function spinalRecordIds(ids: readonly string[]): string[] {
  return ids.filter((id) => spinalRecordPart(id) !== null || spinalRecordPartGeometry(id) !== null)
}
