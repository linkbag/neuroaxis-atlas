/**
 * NeuroAxis — global UI state (plan §7): selection, tabs, plates, clipping
 * planes, explode, region/kind layers, labels, syndrome highlight, references.
 *
 * The store holds no domain data — records are read through src/data/load.ts
 * selectors — only ids and view configuration, so any surface (3D scene,
 * plates, tree, info panel) reacts to the same selection.
 */

import { create } from 'zustand'
import type { Kind, Region } from '../types'
import {
  ALL_KINDS,
  ALL_REGIONS,
  getLevel,
  getPlate,
  getSyndrome,
  platesForLevel,
} from '../data/load'

export type ActiveTab = '3d' | 'plates' | 'syndromes'
export type ViewPreset = 'all' | 'nuclei' | 'tracts' | 'clinical-motor'

export interface ClipState {
  x: number // sagittal plane position (medial→lateral, +x = patient LEFT)
  y: number // transverse plane position (inferior→superior, snaps to levels)
  z: number // coronal plane position (posterior→anterior)
  enabled: boolean
  showHelper: boolean
}

export interface AtlasLayers {
  regions: Set<Region>
  kinds: Set<Kind>
}

export interface SelectOptions {
  /** Tab to activate; omit for the '3d' default, null to stay on the current tab. */
  tab?: ActiveTab | null
  /** Keep an open syndrome highlight despite the new selection (syndrome chips, plate clicks). */
  keepSyndrome?: boolean
}

export interface AtlasState {
  selectedId: string | null
  hoveredId: string | null
  activeTab: ActiveTab
  plateId: string | null
  clip: ClipState
  snapToPlate: boolean
  explode: number
  layers: AtlasLayers
  labelVisibility: boolean
  syndromeId: string | null
  referencesOpen: boolean
}

export interface AtlasActions {
  selectStructure: (id: string | null, opts?: SelectOptions) => void
  setHovered: (id: string | null) => void
  setActiveTab: (tab: ActiveTab) => void
  /** Select a plate; transverse plates also move the 3D clip plane to their level. */
  setPlate: (id: string | null) => void
  setClip: (partial: Partial<ClipState>) => void
  setSnapToPlate: (value: boolean) => void
  setExplode: (value: number) => void
  toggleRegionLayer: (region: Region) => void
  toggleKindLayer: (kind: Kind) => void
  applyViewPreset: (preset: ViewPreset) => void
  setLabelVisibility: (value: boolean) => void
  /** Open (or close) a syndrome card; opening also highlights its structures everywhere. */
  openSyndrome: (id: string | null) => void
  setReferencesOpen: (value: boolean) => void
  /** Level-ruler / level-chip navigation: cut the plane + open the level's plate. */
  gotoLevel: (levelId: string) => void
}

export type AtlasStore = AtlasState & AtlasActions

export const VIEW_PRESETS: Record<
  ViewPreset,
  { label: string; hint: string; regions: readonly Region[]; kinds: readonly Kind[] }
> = {
  all: { label: 'All', hint: 'Every region and structure kind', regions: ALL_REGIONS, kinds: ALL_KINDS },
  nuclei: { label: 'Nuclei', hint: 'Gray-matter nuclei only, all regions', regions: ALL_REGIONS, kinds: ['nucleus'] },
  tracts: { label: 'Tracts', hint: 'Fiber tracts only, all regions', regions: ALL_REGIONS, kinds: ['tract'] },
  'clinical-motor': {
    label: 'Clinical motor',
    hint: 'Brainstem motor nuclei + descending motor pathways',
    regions: ['midbrain', 'pons', 'medulla'],
    kinds: ['nucleus', 'tract'],
  },
}

function sameSet<T>(reference: readonly T[], actual: ReadonlySet<T>): boolean {
  if (reference.length !== actual.size) return false
  return reference.every((value) => actual.has(value))
}

/** Which header preset (if any) the current layer combination equals. */
export function viewPresetOf(layers: AtlasLayers): ViewPreset | null {
  for (const id of Object.keys(VIEW_PRESETS) as ViewPreset[]) {
    const preset = VIEW_PRESETS[id]
    if (sameSet(preset.regions, layers.regions) && sameSet(preset.kinds, layers.kinds)) return id
  }
  return null
}

const DEFAULT_LEVEL = getLevel('lvl-olivary')
const DEFAULT_CLIP: ClipState = {
  x: 0,
  y: DEFAULT_LEVEL ? DEFAULT_LEVEL.y : -34,
  z: 0,
  enabled: false,
  showHelper: false,
}

export const useAtlasStore = create<AtlasStore>()((set) => ({
  selectedId: null,
  hoveredId: null,
  activeTab: '3d',
  plateId: null,
  clip: { ...DEFAULT_CLIP },
  snapToPlate: true,
  explode: 0,
  layers: { regions: new Set<Region>(ALL_REGIONS), kinds: new Set<Kind>(ALL_KINDS) },
  labelVisibility: true,
  syndromeId: null,
  referencesOpen: false,

  selectStructure: (id, opts) =>
    set((s) => ({
      selectedId: id,
      activeTab:
        id === null || opts?.tab === null ? s.activeTab : (opts?.tab ?? '3d'),
      syndromeId: id !== null && opts?.keepSyndrome !== true ? null : s.syndromeId,
    })),

  setHovered: (id) => set({ hoveredId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPlate: (id) =>
    set((s) => {
      const plate = getPlate(id)
      const level = plate?.levelId ? getLevel(plate.levelId) : undefined
      return {
        plateId: id,
        // 2D→3D sync (plan §1.1 feature 6): a transverse plate moves the clip
        // plane to its level and reveals the plane helper so the cut is visible.
        clip: level ? { ...s.clip, y: level.y, showHelper: true } : s.clip,
      }
    }),

  setClip: (partial) => set((s) => ({ clip: { ...s.clip, ...partial } })),

  setSnapToPlate: (value) => set({ snapToPlate: value }),

  setExplode: (value) => set({ explode: value }),

  toggleRegionLayer: (region) =>
    set((s) => {
      const regions = new Set(s.layers.regions)
      if (regions.has(region)) regions.delete(region)
      else regions.add(region)
      return { layers: { ...s.layers, regions } }
    }),

  toggleKindLayer: (kind) =>
    set((s) => {
      const kinds = new Set(s.layers.kinds)
      if (kinds.has(kind)) kinds.delete(kind)
      else kinds.add(kind)
      return { layers: { ...s.layers, kinds } }
    }),

  applyViewPreset: (preset) =>
    set(() => {
      const def = VIEW_PRESETS[preset]
      return {
        layers: { regions: new Set<Region>(def.regions), kinds: new Set<Kind>(def.kinds) },
      }
    }),

  setLabelVisibility: (value) => set({ labelVisibility: value }),

  openSyndrome: (id) =>
    set((s) => ({
      syndromeId: id,
      activeTab: id !== null ? 'syndromes' : s.activeTab,
    })),

  setReferencesOpen: (value) => set({ referencesOpen: value }),

  gotoLevel: (levelId) =>
    set((s) => {
      const level = getLevel(levelId)
      if (!level) return s
      const plate = platesForLevel(levelId)[0]
      return {
        clip: { ...s.clip, y: level.y, showHelper: true },
        plateId: plate ? plate.id : null,
        activeTab: 'plates',
      }
    }),
}))

/**
 * The id set that should stay lit while everything else dims: an open syndrome
 * wins over a plain selection (plan §1.1 feature 10).
 */
export function highlightIdSet(state: Pick<AtlasState, 'selectedId' | 'syndromeId'>): Set<string> | null {
  if (state.syndromeId !== null) {
    const syndrome = getSyndrome(state.syndromeId)
    if (syndrome && syndrome.structures.length > 0) return new Set(syndrome.structures)
  }
  if (state.selectedId !== null) return new Set([state.selectedId])
  return null
}
