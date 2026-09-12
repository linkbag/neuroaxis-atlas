/**
 * NeuroAxis — data loader and typed selectors (plan §4 "Loader", §7 UI inputs).
 *
 * The two required registries (taxonomy.json, levels.json) are static imports;
 * every optional group (structures/*.json, tracts.json, syndromes/*.json,
 * plates-*.json, plates.json, plates/*.svg) is gathered with import.meta.glob
 * so the app degrades gracefully while authoring tasks land: a glob pattern
 * that matches nothing contributes zero records and every selector keeps
 * working on whatever data exists (docs/DATA_CONTRACT.md §1).
 *
 * Merging enforces the plan §9 identity rule: duplicate ids throw at startup.
 */

import type {
  Kind,
  PlateRecord,
  Region,
  StructureRecord,
  SyndromeRecord,
  TaxonomyEntry,
  TractRecord,
} from '../types'
import taxonomyJson from './taxonomy.json'
import levelsJson from './levels.json'

export interface LevelAnchor { id: string; name: string; y: number }

/** Authored record — either kind; `getStructure(id)` searches both. */
export type AtlasRecord = StructureRecord | TractRecord

export type PlateOrientation = PlateRecord['orientation']
export type TractDirection = TractRecord['direction']

/* ------------------------------------------------- raw module collections */

const structureModules: Record<string, unknown> = import.meta.glob(
  './structures/*.json',
  { eager: true, import: 'default' },
)
const tractModules: Record<string, unknown> = import.meta.glob(
  './tracts.json',
  { eager: true, import: 'default' },
)
const syndromeModules: Record<string, unknown> = import.meta.glob(
  './syndromes/*.json',
  { eager: true, import: 'default' },
)
/** Manifest fragments now + the final merged plates.json at integration. */
const plateManifestModules: Record<string, unknown> = {
  ...import.meta.glob('./plates-*.json', { eager: true, import: 'default' }),
  ...import.meta.glob('./plates.json', { eager: true, import: 'default' }),
}
/** Raw SVG text per plate file, keyed './plates/<id>.svg' (see getPlateSvg). */
const plateSvgModules: Record<string, unknown> = import.meta.glob(
  './plates/*.svg',
  { query: '?raw', import: 'default', eager: true },
)

/* --------------------------------------------------------- merge plumbing */

function collectArrays(modules: Record<string, unknown>, label: string): unknown[] {
  const out: unknown[] = []
  for (const path of Object.keys(modules).sort()) {
    const mod = modules[path]
    if (!Array.isArray(mod)) {
      throw new Error(`[data/load] ${label} group: module ${path} did not default-export a JSON array`)
    }
    out.push(...mod)
  }
  return out
}

/** Plan §9: ids are globally unique; a collision is a hard data error. */
function dedupeById<T extends { id: string }>(items: readonly T[], label: string): T[] {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`[data/load] duplicate ${label} id "${item.id}" — ids must be globally unique (plan §9)`)
    }
    seen.add(item.id)
  }
  return items as T[]
}

/* -------------------------------------------------------------- registries */

export const taxonomy: TaxonomyEntry[] = dedupeById(
  taxonomyJson as unknown as TaxonomyEntry[],
  'registry',
)

export const levels: LevelAnchor[] = (levelsJson as unknown as LevelAnchor[])
  .slice()
  .sort((a, b) => b.y - a.y) // rostro-caudal display order: rostral (y max) first

export const structures: StructureRecord[] = dedupeById(
  collectArrays(structureModules, 'structure') as StructureRecord[],
  'structure',
)

export const tracts: TractRecord[] = dedupeById(
  collectArrays(tractModules, 'tract') as TractRecord[],
  'tract',
)

/** All authored records — ids unique across structures + tracts (plan §9). */
export const allRecords: AtlasRecord[] = dedupeById(
  [...structures, ...tracts] as AtlasRecord[],
  'structure/tract',
)

/** Authored records for one region; tracts join the registry for their region. */
export function byRegion(region: Region): AtlasRecord[] {
  return allRecords.filter((record) =>
    'region' in record ? record.region === region : getTaxonomyEntry(record.id)?.region === region,
  )
}

export const syndromes: SyndromeRecord[] = dedupeById(
  collectArrays(syndromeModules, 'syndrome') as SyndromeRecord[],
  'syndrome',
)
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))

const ORIENTATION_ORDER: Record<PlateOrientation, number> = {
  transverse: 0,
  sagittal: 1,
  coronal: 2,
}

export const plates: PlateRecord[] = dedupeById(
  collectArrays(plateManifestModules, 'plate') as PlateRecord[],
  'plate',
)
  .slice()
  .sort((a, b) =>
    ORIENTATION_ORDER[a.orientation] - ORIENTATION_ORDER[b.orientation]
    || plateRank(a) - plateRank(b)
    || a.id.localeCompare(b.id),
  )

/* ------------------------------------------------------------ lookup maps */

const taxonomyById = new Map(taxonomy.map((e) => [e.id, e] as const))
const levelById = new Map(levels.map((l) => [l.id, l] as const))
const recordById = new Map(allRecords.map((r) => [r.id, r] as const))
const plateById = new Map(plates.map((p) => [p.id, p] as const))

const syndromesByStructure = new Map<string, SyndromeRecord[]>()
for (const syndrome of syndromes) {
  for (const id of syndrome.structures) {
    const list = syndromesByStructure.get(id)
    if (list) list.push(syndrome)
    else syndromesByStructure.set(id, [syndrome])
  }
}

/**
 * v8 — the REVERSE index: a record's own `supply` field names the syndrome cards
 * whose arterial territory it is (docs/NEUROATLAS_V8_PLAN.md §1a).
 *
 * The forward map above can only answer "which syndromes list this structure?",
 * and no syndrome record lists an artery: the syndrome cards were authored long
 * before the vessels existed and their `structures[]` are the structures an
 * occlusion damages. An artery therefore declares the relationship from its own
 * side (`vasc-posterior-cerebral-artery.supply` includes `syn-dejerine-roussy`),
 * and this index makes the link bidirectional — the artery's panel lists those
 * syndromes, and opening one of them lights the artery that causes it.
 */
const syndromesBySupply = new Map<string, SyndromeRecord[]>()
for (const record of structures) {
  const supply = record.supply
  if (!Array.isArray(supply)) continue
  for (const syndromeId of supply) {
    const syndrome = syndromes.find((s) => s.id === syndromeId)
    if (syndrome === undefined) continue
    const list = syndromesBySupply.get(record.id)
    if (list) {
      if (!list.includes(syndrome)) list.push(syndrome)
    } else {
      syndromesBySupply.set(record.id, [syndrome])
    }
  }
}

const svgByText = new Map<string, string>()
for (const [key, value] of Object.entries(plateSvgModules)) {
  if (typeof value === 'string') svgByText.set(key.replace(/^\.\//, ''), value)
}

function plateRank(plate: PlateRecord): number {
  // NOTE(viewer3d task): must NOT read `levelById` here — this runs during the
  // module-init `plates` sort above, before the lookup maps are initialized
  // (TDZ ReferenceError crashed every import of load.ts). `levels` (declared
  // earlier) is the same source of truth and is safe at this point.
  const level = plate.levelId ? levels.find((l) => l.id === plate.levelId) : undefined
  // transverse: rostral→caudal; sagittal/coronal sort after all transverse
  return level ? -level.y : Number.POSITIVE_INFINITY
}

/* ------------------------------------------------------------------ enums */

export const ALL_REGIONS: readonly Region[] = [
  'telencephalon',
  'diencephalon',
  'midbrain',
  'pons',
  'medulla',
  'cerebellum',
  'vasculature',
]
export const ALL_KINDS: readonly Kind[] = ['nucleus', 'tract', 'ventricle', 'surface', 'vessel', 'context']

export const REGION_LABELS: Record<Region, string> = {
  telencephalon: 'Telencephalon (cerebral hemispheres)',
  diencephalon: 'Diencephalon',
  midbrain: 'Mesencephalon (midbrain)',
  pons: 'Pons',
  medulla: 'Medulla',
  cerebellum: 'Cerebellum',
  vasculature: 'Cerebral vasculature',
}

/* -------------------------------------------------------------- selectors */

export function isTractRecord(record: AtlasRecord): record is TractRecord {
  return 'waypoints' in record
}

export function getStructure(id: string): AtlasRecord | undefined {
  return recordById.get(id)
}

export function getTaxonomyEntry(id: string): TaxonomyEntry | undefined {
  return taxonomyById.get(id)
}

export function getLevel(id: string): LevelAnchor | undefined {
  return levelById.get(id)
}

export function getPlate(id: string | null): PlateRecord | undefined {
  return id === null ? undefined : plateById.get(id)
}

export function getSyndrome(id: string | null): SyndromeRecord | undefined {
  return id === null ? undefined : syndromes.find((s) => s.id === id)
}

/**
 * Syndromes a record participates in: the cards that list it as a structure, plus
 * (v8) the cards its own `supply` field names. Deduplicated by id, forward list
 * first, so an artery whose supply names a syndrome that ALSO lists it as a
 * structure appears once.
 */
export function syndromesForStructure(id: string): SyndromeRecord[] {
  const forward = syndromesByStructure.get(id)
  const reverse = syndromesBySupply.get(id)
  if (reverse === undefined) return forward ?? []
  if (forward === undefined) return reverse
  return [...forward, ...reverse.filter((s) => !forward.includes(s))]
}

/**
 * v8 — the arteries whose supply includes this syndrome (the reverse of
 * `syndromesForStructure`), so opening a syndrome card can light the artery that
 * causes it. Ordered by record-id order for a stable highlight set.
 */
export function arteriesForSyndrome(syndromeId: string): string[] {
  const out: string[] = []
  for (const [recordId, list] of syndromesBySupply) {
    if (list.some((s) => s.id === syndromeId)) out.push(recordId)
  }
  return out.sort()
}

/** v8 — the territory (structure ids) a record supplies, or an empty array. */
export function territoryOf(recordId: string): string[] {
  const record = recordById.get(recordId)
  const territory = record && 'territory' in record ? record.territory : undefined
  return Array.isArray(territory) ? territory : []
}

export function platesForLevel(levelId: string): PlateRecord[] {
  return plates.filter((p) => p.orientation === 'transverse' && p.levelId === levelId)
}

export function getPlateLevel(plate: PlateRecord): LevelAnchor | undefined {
  return plate.levelId ? levelById.get(plate.levelId) : undefined
}

/** Plate SVG raw text for a manifest `svg` field ('plates/plate-x.svg'). */
export function getPlateSvg(svgField: string): string | undefined {
  const normalized = svgField.replace(/^\.?\//, '')
  return svgByText.get(normalized) ?? svgByText.get(`plates/${normalized}`)
}

/** "Medulla — mid-olivary (open medulla)" → "mid-olivary (open medulla)". */
export function shortLevelName(name: string): string {
  const dash = name.indexOf('—')
  const short = dash >= 0 ? name.slice(dash + 1).trim() : name.trim()
  return short.length > 0 ? short : name
}

/* -------------------------------------------------------------- tree model */

export interface TreeLeaf {
  entry: TaxonomyEntry
  record: AtlasRecord | undefined
  children: TreeLeaf[]
}

export interface TreeSubdivision {
  name: string
  leaves: TreeLeaf[]
}

export interface TreeRegion {
  region: Region
  label: string
  subdivisions: TreeSubdivision[]
  count: number
}

function buildTree(): TreeRegion[] {
  const byRegion = new Map<Region, Map<string, TaxonomyEntry[]>>()
  for (const entry of taxonomy) {
    let subdivisions = byRegion.get(entry.region)
    if (!subdivisions) {
      subdivisions = new Map()
      byRegion.set(entry.region, subdivisions)
    }
    const list = subdivisions.get(entry.subdivision)
    if (list) list.push(entry)
    else subdivisions.set(entry.subdivision, [entry])
  }

  const regions: TreeRegion[] = []
  for (const region of ALL_REGIONS) {
    const subdivisionMap = byRegion.get(region)
    if (!subdivisionMap) continue
    const subdivisions: TreeSubdivision[] = [...subdivisionMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, entries]) => {
        const sorted = entries.slice().sort((a, b) => a.name.localeCompare(b.name))
        const leafById = new Map(
          sorted.map((entry) => [entry.id, {
            entry,
            record: recordById.get(entry.id),
            children: [] as TreeLeaf[],
          } as TreeLeaf]),
        )
        const leaves: TreeLeaf[] = []
        for (const leaf of leafById.values()) {
          const parent = leaf.entry.parent ? leafById.get(leaf.entry.parent) : undefined
          if (parent) parent.children.push(leaf)
          else leaves.push(leaf)
        }
        return { name, leaves }
      })
    let count = 0
    for (const sub of subdivisions) {
      for (const leaf of sub.leaves) count += 1 + leaf.children.length
    }
    regions.push({ region, label: REGION_LABELS[region], subdivisions, count })
  }
  return regions
}

export const tree: TreeRegion[] = buildTree()

/* ----------------------------------------------------------------- search */

export interface SearchHit {
  id: string
  name: string
  region: Region
  subdivision: string
  kind: Kind
  color: string
  /** false = registry-only entry, authored record has not landed yet */
  authored: boolean
  matchedVia: 'name' | 'synonym'
  matchedText: string
  score: number
}

/** Case-insensitive substring search over names + synonyms, ranked. */
export function searchAll(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []
  const hits: SearchHit[] = []
  for (const entry of taxonomy) {
    const name = entry.name.toLowerCase()
    let score: number | null = null
    let matchedVia: SearchHit['matchedVia'] = 'name'
    let matchedText = entry.name
    if (name === needle) score = 0
    else if (name.startsWith(needle)) score = 1
    else if (name.includes(needle)) score = 2
    if (score === null) {
      for (const synonym of entry.synonyms ?? []) {
        const s = synonym.toLowerCase()
        if (s === needle) {
          score = 3; matchedVia = 'synonym'; matchedText = synonym; break
        }
        if (s.startsWith(needle)) {
          score = 4; matchedVia = 'synonym'; matchedText = synonym; break
        }
        if (s.includes(needle)) {
          score = 5; matchedVia = 'synonym'; matchedText = synonym; break
        }
      }
    }
    if (score === null) continue
    hits.push({
      id: entry.id,
      name: entry.name,
      region: entry.region,
      subdivision: entry.subdivision,
      kind: entry.kind,
      color: entry.color,
      authored: recordById.has(entry.id),
      matchedVia,
      matchedText,
      score,
    })
  }
  return hits.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
}

/* ----------------------------------------------------------- bibliography */

/** Every refs entry across structures, tracts, and syndromes (deduped, sorted). */
export const allReferences: string[] = (() => {
  const set = new Set<string>()
  for (const record of allRecords) {
    for (const ref of record.refs ?? []) set.add(ref)
  }
  for (const syndrome of syndromes) {
    for (const ref of syndrome.refs ?? []) set.add(ref)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})()

/** Load-state summary for empty states / graceful degradation UI. */
export const dataStatus = {
  registry: taxonomy.length,
  levels: levels.length,
  structures: structures.length,
  tracts: tracts.length,
  syndromes: syndromes.length,
  plates: plates.length,
} as const
