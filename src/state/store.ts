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
/** Rendering-quality tier (realism plan §1 Layer 3 post section, post-fx task). */
export type RenderQuality = 'high' | 'balanced'

/** localStorage key persisting the rendering-quality toggle. */
export const RENDER_QUALITY_STORAGE_KEY = 'neuroaxis.quality'

/**
 * Balanced fallback for weak setups (post-fx guard): no WebGL2 (the post
 * composer requires it), or a >2.5 devicePixelRatio phone-class screen.
 */
function detectDefaultQuality(): RenderQuality {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 'high'
    const probe = document.createElement('canvas')
    const gl2 = probe.getContext('webgl2')
    if (gl2 === null) return 'balanced'
    // Release the probe context immediately; it was only a capability check.
    const lose = gl2.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()
    const dpr = window.devicePixelRatio || 1
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 640
    if (smallScreen && dpr > 2.5) return 'balanced'
  } catch {
    return 'balanced'
  }
  return 'high'
}

/** Persisted value wins; otherwise detect a device-appropriate default. */
function initialQuality(): RenderQuality {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(RENDER_QUALITY_STORAGE_KEY)
      if (stored === 'high' || stored === 'balanced') return stored
    }
  } catch {
    /* private-mode / storage disabled — fall through to detection */
  }
  return detectDefaultQuality()
}

export interface ClipState {
  x: number // sagittal plane position (medial→lateral, +x = patient LEFT)
  y: number // transverse plane position (inferior→superior, snaps to levels)
  z: number // coronal plane position (posterior→anterior)
  enabled: boolean
  showHelper: boolean
}

/* --------------------------------------------- v3 2D live-section (G2) */

/** Which canonical axis the live-section canvas cuts along. Default 'y'
 *  (transverse) matches the authored-plate focus (plan §2.2). */
export type SectionAxis = 'x' | 'y' | 'z'

export type SectionUnderlayKind = 'none' | 'stain' | 'mri'

/**
 * Real-imaging underlay settings for the 2D section canvas (plan §2.3).
 * `kind` picks which registered layer draws (G3 implements layer draws;
 * the store only owns the knobs). windowMin/windowMax are the uint8
 * grayscale window of the MRI grid layer.
 */
export interface SectionUnderlay {
  kind: SectionUnderlayKind
  /** 0..1 — blend of the real image under the simulated contours. */
  opacity: number
  windowMin: number
  windowMax: number
}

/** localStorage key persisting underlay prefs (same pattern as quality). */
export const SECTION_UNDERLAY_STORAGE_KEY = 'neuroaxis.sectionUnderlay'

const DEFAULT_SECTION_UNDERLAY: SectionUnderlay = {
  kind: 'none',
  opacity: 0.6,
  windowMin: 60,
  windowMax: 180,
}

function isUnderlayKind(value: unknown): value is SectionUnderlayKind {
  return value === 'none' || value === 'stain' || value === 'mri'
}

/** Persisted value wins; anything malformed falls back to the defaults. */
function initialSectionUnderlay(): SectionUnderlay {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SECTION_UNDERLAY_STORAGE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object') {
          const record = parsed as Record<string, unknown>
          const kind = record.kind
          const num = (value: unknown): number | null =>
            typeof value === 'number' && Number.isFinite(value) ? value : null
          const opacity = num(record.opacity)
          const windowMin = num(record.windowMin)
          const windowMax = num(record.windowMax)
          if (isUnderlayKind(kind) && opacity !== null && windowMin !== null && windowMax !== null) {
            return {
              kind,
              opacity: Math.min(1, Math.max(0, opacity)),
              windowMin,
              windowMax,
            }
          }
        }
      }
    }
  } catch {
    /* private-mode / storage disabled or malformed JSON — use defaults */
  }
  return { ...DEFAULT_SECTION_UNDERLAY }
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
  /** Rendering-quality tier: 'high' mounts the post FX composer, 'balanced' renders the plain canvas. */
  quality: RenderQuality
  /** v3: axis the live-section canvas cuts along ('y' = transverse default). */
  sectionAxis: SectionAxis
  /** v3: real-imaging underlay knobs for the section canvas (plan §2.3). */
  sectionUnderlay: SectionUnderlay
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
  /** Switch the rendering-quality tier and persist it (neuroaxis.quality). */
  setQuality: (quality: RenderQuality) => void
  /** v3: switch the live-section axis; the canvas follows the plane value on
   *  the same clip slider (sectionAxis stays the single source of truth). */
  setSectionAxis: (axis: SectionAxis) => void
  /** v3: merge underlay settings and persist them (neuroaxis.sectionUnderlay),
   *  mirroring the quality-toggle persistence pattern. */
  setSectionUnderlay: (partial: Partial<SectionUnderlay>) => void
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
  quality: initialQuality(),
  sectionAxis: 'y',
  sectionUnderlay: initialSectionUnderlay(),

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

  setQuality: (quality) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(RENDER_QUALITY_STORAGE_KEY, quality)
      }
    } catch {
      /* storage unavailable — the tier still applies for this session */
    }
    set({ quality })
  },

  setSectionAxis: (axis) => set({ sectionAxis: axis }),

  setSectionUnderlay: (partial) =>
    set((s) => {
      const merged: SectionUnderlay = {
        ...s.sectionUnderlay,
        ...partial,
        opacity: Math.min(1, Math.max(0, partial.opacity ?? s.sectionUnderlay.opacity)),
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(SECTION_UNDERLAY_STORAGE_KEY, JSON.stringify(merged))
        }
      } catch {
        /* storage unavailable — the settings still apply for this session */
      }
      return { sectionUnderlay: merged }
    }),

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
