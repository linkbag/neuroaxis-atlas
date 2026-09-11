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
  taxonomy,
} from '../data/load'
// The canonical slider ranges — the single declaration of the canonical box
// (AMENDMENT B, docs/TELENCEPHALON_PLAN.md §2). Imported for the load-time
// invariant check on DEFAULT_CLIP below, so "the defaults never moved" and "the
// defaults are inside every bound" are enforced rather than asserted in prose.
import { CLIP_BOUNDS } from '../components/viewer3d/clipPlanes'

export type ActiveTab = '3d' | 'plates' | 'syndromes'
/**
 * View presets (plan §1.1 feature 2 + docs/TELENCEPHALON_PLAN.md §5).
 *
 * `all` / `nuclei` / `tracts` / `clinical-motor` are the v1–v6 set and keep
 * their exact meaning; `brainstem-focus` / `deep-structures` / `whole-brain` /
 * `cortex-only` are the v7 telencephalon-aware additions.
 */
export type ViewPreset =
  | 'all'
  | 'nuclei'
  | 'tracts'
  | 'clinical-motor'
  | 'brainstem-focus'
  | 'deep-structures'
  | 'whole-brain'
  | 'cortex-only'
/** Rendering-quality tier (realism plan §1 Layer 3 post section, post-fx task). */
export type RenderQuality = 'high' | 'balanced'

/** localStorage key persisting the rendering-quality toggle. */
export const RENDER_QUALITY_STORAGE_KEY = 'neuroaxis.quality'

/**
 * localStorage key persisting the chosen view preset (v7). Written by
 * `applyViewPreset` and read once at boot, exactly like the quality toggle —
 * the preset is a user preference, not a session value, so a returning visitor
 * gets their own framing back rather than the fresh-visitor default.
 */
export const VIEW_PRESET_STORAGE_KEY = 'neuroaxis.viewPreset'

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

/**
 * What the live-section canvas paints as real imagery (v3 SECTION_SYNC_PLAN
 * §2.3 + v4 IMAGING_V4_PLAN §4 "real-first default", task `modality-layers`).
 *
 *  - `'auto'`  — **v4 default**: real-first. Draw the best real modality that
 *                actually covers this plane: an anchored photograph inside its
 *                tolerance window → else CT (when the grid is available) →
 *                else MRI (when available) → else nothing, in which case the
 *                simulated section stays and the canvas says so honestly.
 *  - `'stain'` — embedded photographs only (level-mapped or plane-anchored);
 *                a plane with no anchored plate falls back to the simulated
 *                section with a hint (it never silently switches modality).
 *  - `'ct'`    — the continuous CT grid only, windowed by `ctWindowPreset`.
 *  - `'mri'`   — the continuous T1 grid only, windowed by
 *                `windowMin`/`windowMax` (uint8).
 *  - `'none'`  — explicit **"simulated only"**: no real imagery is ever drawn.
 *
 * v3 stored `'none' | 'stain' | 'mri'`; the two new values are additive, so a
 * v3 payload still parses (see initialSectionUnderlay).
 */
export type SectionUnderlayKind = 'auto' | 'mri' | 'ct' | 'stain' | 'none'

/** Modality-switcher button order for the UI (integration wires the buttons). */
export const SECTION_UNDERLAY_KINDS: readonly SectionUnderlayKind[] = [
  'auto',
  'mri',
  'ct',
  'stain',
  'none',
]

/** Button labels for the same order (real-first first, simulated-only last). */
export const SECTION_UNDERLAY_KIND_LABELS: Record<SectionUnderlayKind, string> = {
  auto: 'Auto (real-first)',
  mri: 'MRI',
  ct: 'CT',
  stain: 'Photo',
  none: 'Simulated only',
}

/** CT display-window presets baked into `ct-manifest.json` → `windows`. */
export type CtWindowPreset = 'brain' | 'bone'

/** Preset names the CT window selector offers, in display order. */
export const CT_WINDOW_PRESETS: readonly CtWindowPreset[] = ['brain', 'bone']

export const CT_WINDOW_PRESET_LABELS: Record<CtWindowPreset, string> = {
  brain: 'Brain (soft tissue)',
  bone: 'Bone',
}

/**
 * Real-imaging settings for the 2D section canvas (plan §2.3 + §4).
 * `kind` picks which modality draws; the registry layers (see
 * src/components/section/imageLayers.ts) own the actual painting.
 * windowMin/windowMax are the uint8 grayscale window of the MRI grid layer;
 * CT is windowed in HU through `ctWindowPreset` instead, because the CT grid
 * is baked in Hounsfield units.
 */
export interface SectionUnderlay {
  kind: SectionUnderlayKind
  /** 0..1 — alpha of the real image (the section's BASE plate in real-first mode). */
  opacity: number
  windowMin: number
  windowMax: number
  /**
   * v4 real-first compositing (plan §4): when true (default) a drawn real
   * image is the section's BASE layer and the simulated structure contours are
   * painted over it as a translucent overlay (~65% of their normal fill
   * strength, outlines kept crisp, selection highlight unaffected). When false
   * the v3 look returns: the real image is a subdued underlay *beneath* the
   * simulated contours. It has no effect when no real layer drew (the
   * simulated section is then the base either way).
   */
  realFirst: boolean
  /** v4: CT window preset name, resolved against ct-manifest.json `windows`. */
  ctWindowPreset: CtWindowPreset
}

/** localStorage key persisting underlay prefs (same pattern as quality). */
export const SECTION_UNDERLAY_STORAGE_KEY = 'neuroaxis.sectionUnderlay'

/**
 * Version stamped into the persisted payload. A payload without it was written
 * by v3 (kind/opacity/windowMin/windowMax only) and is migrated once — see
 * initialSectionUnderlay.
 */
const SECTION_UNDERLAY_SCHEMA_VERSION = 2

/** The two v3 defaults a stored payload may simply never have touched. */
const V3_DEFAULT_KIND: SectionUnderlayKind = 'none'
const V3_DEFAULT_OPACITY = 0.6

/**
 * v4 real-first defaults (plan §4). Two values change from v3 on purpose:
 *  - `kind: 'auto'` — real imagery is the default look, with an honest hint
 *    when a plane has none;
 *  - `opacity: 1` — the image is now the section's BASE plate, not a subdued
 *    underlay beneath opaque contour fills, so it renders at full strength by
 *    default. (v3's 0.6 was calibrated for the underlay role.)
 * A persisted value still wins over both (see initialSectionUnderlay).
 */
export const DEFAULT_SECTION_UNDERLAY: SectionUnderlay = {
  kind: 'auto',
  opacity: 1,
  windowMin: 60,
  windowMax: 180,
  realFirst: true,
  ctWindowPreset: 'brain',
}

function isUnderlayKind(value: unknown): value is SectionUnderlayKind {
  return (
    value === 'auto' ||
    value === 'mri' ||
    value === 'ct' ||
    value === 'stain' ||
    value === 'none'
  )
}

function isCtWindowPreset(value: unknown): value is CtWindowPreset {
  return value === 'brain' || value === 'bone'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Persisted settings win **field by field**, so a v3 payload (no
 * `schemaVersion`, no `realFirst`, no `ctWindowPreset`) restores its own values
 * and takes the v4 defaults for the fields that did not exist yet. The single
 * exception is a v3 payload that still holds both v3 defaults unchanged
 * (`kind: 'none'`, `opacity: 0.6`): that is indistinguishable from "never
 * touched the toggle", and the plan requires real-first to be the default
 * experience, so it is migrated to the v4 defaults. Any other v3 value — e.g. a
 * deliberate `kind: 'mri'` — is restored verbatim.
 */
function initialSectionUnderlay(): SectionUnderlay {
  const next: SectionUnderlay = { ...DEFAULT_SECTION_UNDERLAY }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SECTION_UNDERLAY_STORAGE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object') {
          const record = parsed as Record<string, unknown>
          const kind = isUnderlayKind(record.kind) ? record.kind : null
          const opacity = isFiniteNumber(record.opacity) ? record.opacity : null
          const isV3Payload = record.schemaVersion !== SECTION_UNDERLAY_SCHEMA_VERSION
          const untouchedV3Defaults =
            isV3Payload && kind === V3_DEFAULT_KIND && opacity === V3_DEFAULT_OPACITY
          if (!untouchedV3Defaults) {
            if (kind !== null) next.kind = kind
            if (opacity !== null) next.opacity = Math.min(1, Math.max(0, opacity))
            if (isFiniteNumber(record.windowMin)) next.windowMin = record.windowMin
            if (isFiniteNumber(record.windowMax)) next.windowMax = record.windowMax
            if (typeof record.realFirst === 'boolean') next.realFirst = record.realFirst
            if (isCtWindowPreset(record.ctWindowPreset)) next.ctWindowPreset = record.ctWindowPreset
          }
        }
      }
    }
  } catch {
    /* private-mode / storage disabled or malformed JSON — use defaults */
  }
  return next
}

/** Persist the merged settings under one key (quality-toggle pattern). */
function persistSectionUnderlay(settings: SectionUnderlay): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        SECTION_UNDERLAY_STORAGE_KEY,
        JSON.stringify({ ...settings, schemaVersion: SECTION_UNDERLAY_SCHEMA_VERSION }),
      )
    }
  } catch {
    /* storage unavailable — the settings still apply for this session */
  }
}

export interface AtlasLayers {
  regions: Set<Region>
  kinds: Set<Kind>
  /**
   * ── v7 structure-level visibility (docs/TELENCEPHALON_PLAN.md §5, plan C11) ─
   *
   * `regions`/`kinds` are the v1–v6 layer model and can only express
   * region-or-kind granularity. §5's presets are STRUCTURE-level statements —
   * "Brainstem focus: cortex hidden except a faint outline", "Deep structures:
   * ghost cortex + basal ganglia/limbic emphasised" — which that model cannot
   * represent: the cortex spans a whole region, and the basal ganglia/limbic
   * sets cut across the `nucleus` kind.
   *
   * So the two new sets are additive and OPTIONAL in behaviour: an empty set
   * means "behave exactly as v6 did", which is why the region/kind toggles in
   * the Legend and the existing presets keep working untouched. Record ids, not
   * slugs — the same ids the tree, search, plates and 3D selection all use.
   */
  hidden: ReadonlySet<string>
  emphasis: ReadonlySet<string>
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
  /**
   * v3/v4: merge real-imagery settings and persist them
   * (neuroaxis.sectionUnderlay), mirroring the quality-toggle persistence
   * pattern. Accepts any subset: modality (`kind`), opacity, the MRI uint8
   * window, the v4 `realFirst` compositing flag and the CT `ctWindowPreset`
   * (brain/bone).
   */
  setSectionUnderlay: (partial: Partial<SectionUnderlay>) => void
  /** Level-ruler / level-chip navigation: cut the plane + open the level's plate. */
  gotoLevel: (levelId: string) => void
}

export type AtlasStore = AtlasState & AtlasActions

/* ------------------------------------------------------- v7 view presets */

/** Record ids of one telencephalon subdivision (the taxonomy is authoritative). */
function telSubdivisionIds(subdivision: string): string[] {
  return taxonomy
    .filter((entry) => entry.region === 'telencephalon' && entry.subdivision === subdivision)
    .map((entry) => entry.id)
}

/** Every record id outside the telencephalon — the brainstem + cerebellum set. */
function nonTelencephalonIds(): string[] {
  return taxonomy.filter((entry) => entry.region !== 'telencephalon').map((entry) => entry.id)
}

const CORTEX_IDS = telSubdivisionIds('Cerebral cortex')
const BASAL_GANGLIA_IDS = telSubdivisionIds('Basal ganglia')
const LIMBIC_IDS = telSubdivisionIds('Limbic system')

/**
 * The telencephalon subdivisions that make up §5's "cortex" for the purposes of
 * the presets: the cortical surface records, the underlying white matter and the
 * ventricular system. The basal ganglia and the limbic structures are NOT part
 * of it — they are the "deep structures" the Deep-structures preset emphasises
 * and the Brainstem-focus preset keeps visible.
 */
const CORTEX_PRESET_IDS = [
  ...CORTEX_IDS,
  ...telSubdivisionIds('Telencephalic white matter'),
  ...telSubdivisionIds('Lateral ventricles'),
]

/** One preset's definition: layer sets plus the v7 structure-level extras. */
export interface ViewPresetDefinition {
  label: string
  hint: string
  regions: readonly Region[]
  kinds: readonly Kind[]
  /** Structure ids hidden under this preset (optional — absent = none). */
  hidden?: ReadonlySet<string>
  /** Structure ids lifted by `NucleusMesh`'s emphasis (optional). */
  emphasis?: ReadonlySet<string>
}

export const VIEW_PRESETS: Record<ViewPreset, ViewPresetDefinition> = {
  all: { label: 'All', hint: 'Every region and structure kind', regions: ALL_REGIONS, kinds: ALL_KINDS },
  nuclei: { label: 'Nuclei', hint: 'Gray-matter nuclei only, all regions', regions: ALL_REGIONS, kinds: ['nucleus'] },
  tracts: { label: 'Tracts', hint: 'Fiber tracts only, all regions', regions: ALL_REGIONS, kinds: ['tract'] },
  'clinical-motor': {
    label: 'Clinical motor',
    hint: 'Brainstem motor nuclei + descending motor pathways',
    regions: ['midbrain', 'pons', 'medulla'],
    kinds: ['nucleus', 'tract'],
  },
  /**
   * §5's first preset and the v7 DEFAULT: the brainstem/diencephalon stays the
   * visual subject while the hemispheres read as a faint outline. The four
   * ventricular / white-matter / cortical subdivisions are structure-hidden, so
   * the ghost shell (keyed to `ctx-cerebral-cortex`) drops to
   * `GHOST_OUTLINE_OPACITY` in SceneLayers instead of disappearing.
   *
   * Why the region set is the non-telencephalon one as well: §5 says "cortex
   * hidden except a faint outline", i.e. the cortex should NOT be part of the
   * lit layer stack — but the outline must remain. Keeping `telencephalon` OUT
   * of `regions` would take the ghost shell with it (the shell is gated on the
   * region layer), so `telencephalon` stays IN and the hiding is done at
   * structure level, which is exactly what the new `hidden` set is for.
   */
  'brainstem-focus': {
    label: 'Brainstem focus',
    hint:
      'Brainstem-first default: the hemispheres stay as a faint translucent outline '
      + 'while the brainstem, diencephalon and cerebellum carry the view',
    regions: ALL_REGIONS,
    kinds: ALL_KINDS,
    hidden: new Set(CORTEX_PRESET_IDS),
  },
  /** §5: ghost cortex + basal ganglia/limbic emphasised. */
  'deep-structures': {
    label: 'Deep structures',
    hint:
      'Ghost cortex with the basal ganglia, limbic structures and lateral ventricles '
      + 'emphasised — the subcortical telencephalon',
    regions: ALL_REGIONS,
    kinds: ALL_KINDS,
    emphasis: new Set([...BASAL_GANGLIA_IDS, ...LIMBIC_IDS]),
  },
  /** §5: the whole brain, nothing hidden and nothing lifted. */
  'whole-brain': {
    label: 'Whole brain',
    hint: 'Every structure at its own material — hemispheres, deep structures and brainstem together',
    regions: ALL_REGIONS,
    kinds: ALL_KINDS,
  },
  /** §5: the cortical envelope alone (the hemispheres and their surfaces). */
  'cortex-only': {
    label: 'Cortex only',
    hint: 'The cerebral cortex and its hemispheres, with the deep and brainstem structures hidden',
    regions: ALL_REGIONS,
    kinds: ALL_KINDS,
    hidden: new Set(nonTelencephalonIds()),
  },
}

/**
 * The layer state a fresh visitor boots into: **Brainstem focus** (§5's
 * "the default view must stay brainstem-centric", plan step 4). Built from
 * `VIEW_PRESETS['brainstem-focus']` rather than hand-written, so the default
 * and the preset button can never mean two different things — the assertion
 * below proves the correspondence.
 */
function defaultLayers(): AtlasLayers {
  return layersFromPreset('brainstem-focus')
}

/** The layer state one preset describes (fresh mutable sets). */
function layersFromPreset(preset: ViewPreset): AtlasLayers {
  const def = VIEW_PRESETS[preset]
  return {
    regions: new Set<Region>(def.regions),
    kinds: new Set<Kind>(def.kinds),
    hidden: new Set<string>(def.hidden ?? []),
    emphasis: new Set<string>(def.emphasis ?? []),
  }
}

/**
 * Persisted preset choice wins; otherwise the v7 default. A stored value is
 * validated against the preset table, so a stale/corrupt key falls back to the
 * default instead of throwing. This is the same contract as the quality toggle:
 * a returning visitor's own choice is never silently overridden.
 */
function initialLayers(): AtlasLayers {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(VIEW_PRESET_STORAGE_KEY)
      if (stored !== null && Object.prototype.hasOwnProperty.call(VIEW_PRESETS, stored)) {
        return layersFromPreset(stored as ViewPreset)
      }
    }
  } catch {
    /* private-mode / storage disabled — fall through to the default */
  }
  return defaultLayers()
}

export const DEFAULT_LAYERS: AtlasLayers = defaultLayers()

/**
 * Boot-time invariants of the default framing (plan §5/§9, step 4). Both are
 * asserted rather than documented because both are acceptance items:
 *
 *  1. the default preset reports itself as `brainstem-focus` through
 *     `viewPresetOf` (so the header shows the right button pressed);
 *  2. **the default preset does not hide the brainstem** — no record outside
 *     the telencephalon may appear in its `hidden` set. The plan's wording is
 *     "assert brainstem structures remain visible/selectable at default
 *     framing", and this is that assertion at the earliest possible moment;
 *  3. **v7 closure (gap 4) — the default preset does not DIM the brainstem
 *     either.** The audit measured two diencephalon rows rendered with the
 *     taxonomy tree's `is-off` class at what it believed was default framing
 *     ("Internal medullary lamina", "Thalamus (context envelope)"). The cause was
 *     a non-default preset (the audit's own earlier preset click, persisted to
 *     `neuroaxis.viewPreset`), because those rows are neither hidden nor
 *     layer-off under `brainstem-focus`. This loop asserts the whole rule rather
 *     than the symptom: for every non-telencephalon record the default layers
 *     must have BOTH its region and its kind layer on, which is exactly the
 *     condition `TaxonomyTree`'s `layerOff()` uses to emit `is-off`. A future
 *     edit that narrowed the default's `kinds` (e.g. to `['nucleus']`) would dim
 *     brainstem rows silently; it now fails at module load instead.
 */
{
  const preset = viewPresetOf(DEFAULT_LAYERS)
  if (preset !== 'brainstem-focus') {
    throw new Error(
      `store: the default layers do not report the brainstem-focus preset (got ${String(preset)}) — ` +
        'docs/TELENCEPHALON_PLAN.md §5 makes it the default framing',
    )
  }
  for (const entry of taxonomy) {
    if (entry.region === 'telencephalon') continue
    if (DEFAULT_LAYERS.hidden.has(entry.id)) {
      throw new Error(
        `store: the default preset hides "${entry.id}" (${entry.region}) — the brainstem must stay ` +
          'visible/selectable at default framing (docs/TELENCEPHALON_PLAN.md §5/§9)',
      )
    }
    // (3) The dimming half: TaxonomyTree renders `is-off` exactly when the row's
    // region OR kind layer is off (TaxonomyTree.tsx `layerOff`). Both must hold
    // for every brainstem-family record under the default preset.
    if (!DEFAULT_LAYERS.regions.has(entry.region) || !DEFAULT_LAYERS.kinds.has(entry.kind)) {
      throw new Error(
        `store: the default preset turns off the ${entry.region}/${entry.kind} layer of "${entry.id}" ` +
          '— that row would render dimmed (is-off) at default framing, where the brainstem must be ' +
          'the visual focus (docs/TELENCEPHALON_PLAN.md §5/§9)',
      )
    }
  }
}

/**
 * v7 closure (gap 4b) — the REGION GUARD, asserted for EVERY preset.
 *
 * The boot block above proves the *default* framing keeps the brainstem whole.
 * This block proves the rule that makes that provable at all: a preset may only
 * ever hide records of the region it is about. The audit's two dimmed rows
 * (`ctx-thalamus-envelope`, `ctx-internal-medullary-lamina`) were diencephalon
 * records, so the failure mode this guards against is real: `telSubdivisionIds`
 * originally filtered on `subdivision` alone, and a subdivision-name collision
 * would have let `Brainstem focus` hide a diencephalon record *silently* — the
 * default's own assertion cannot see that, because it only inspects the default.
 *
 * Two directions, one per kind of preset (asserted, not documented):
 *   • subdivision-derived presets (`brainstem-focus`) hide ONLY telencephalon
 *     records — the region guard on `telSubdivisionIds`;
 *   • `cortex-only` is the one preset whose declared purpose is hiding the deep
 *     and brainstem family, so it must hide ZERO telencephalon records.
 * Plus, for every preset: every id it hides or emphasises must exist in the
 * taxonomy (a typo would otherwise hide nothing and fail open).
 */
{
  const regionById = new Map(taxonomy.map((entry) => [entry.id, entry.region]))
  /** Presets built from telencephalon subdivision names. */
  const subdivisionDerived: ViewPreset[] = ['brainstem-focus']

  for (const id of Object.keys(VIEW_PRESETS) as ViewPreset[]) {
    const preset = VIEW_PRESETS[id]
    for (const structureId of preset.hidden ?? []) {
      const region = regionById.get(structureId)
      if (region === undefined) {
        throw new Error(
          `store: preset "${id}" hides unknown structure "${structureId}" — a stale id hides nothing ` +
            'and fails open (docs/TELENCEPHALON_PLAN.md §5)',
        )
      }
      if (subdivisionDerived.includes(id) && region !== 'telencephalon') {
        throw new Error(
          `store: preset "${id}" hides "${structureId}" (${region}) — a subdivision-derived preset may ` +
            'only hide telencephalon records, otherwise the brainstem disappears from a view whose ' +
            'whole point is the brainstem (docs/TELENCEPHALON_PLAN.md §5/§9)',
        )
      }
      if (id === 'cortex-only' && region === 'telencephalon') {
        throw new Error(
          `store: preset "cortex-only" hides the telencephalon record "${structureId}" — that preset ` +
            'hides the deep/brainstem family, never its own subject ' +
            '(docs/TELENCEPHALON_PLAN.md §5)',
        )
      }
    }
    for (const structureId of preset.emphasis ?? []) {
      if (!regionById.has(structureId)) {
        throw new Error(
          `store: preset "${id}" emphasises unknown structure "${structureId}" — a stale id lifts ` +
            'nothing and fails open (docs/TELENCEPHALON_PLAN.md §5)',
        )
      }
    }
  }
}

function sameSet<T>(reference: readonly T[], actual: ReadonlySet<T>): boolean {
  if (reference.length !== actual.size) return false
  return reference.every((value) => actual.has(value))
}

/**
 * Which header preset (if any) the current layer combination equals.
 *
 * v7: the comparison covers `hidden` and `emphasis` as well. Without that, the
 * four new presets would be indistinguishable from `all` (they share its
 * regions/kinds) and the header would light up the wrong button — or none.
 */
export function viewPresetOf(layers: AtlasLayers): ViewPreset | null {
  for (const id of Object.keys(VIEW_PRESETS) as ViewPreset[]) {
    const preset = VIEW_PRESETS[id]
    if (!sameSet(preset.regions, layers.regions)) continue
    if (!sameSet(preset.kinds, layers.kinds)) continue
    if (!sameSet([...(preset.hidden ?? [])], layers.hidden)) continue
    if (!sameSet([...(preset.emphasis ?? [])], layers.emphasis)) continue
    return id
  }
  return null
}

const DEFAULT_LEVEL = getLevel('lvl-olivary')
/**
 * Default clip state — the AMENDMENT A values, deliberately untouched by the
 * AMENDMENT B space extension (docs/TELENCEPHALON_PLAN.md §2, task `tel-space`).
 *
 * The rule the plan makes binding is "nothing below y = +45 may move": the
 * default transverse plane stays exactly where a v1–v6 visitor finds it today —
 * the olivary anchor from levels.json (whose 13 original y values are unchanged;
 * the four telencephalic anchors +48/+58/+68/+78 are purely additive) — and the
 * sagittal/coronal defaults stay 0 (the mid-sagittal plane and the coronal plane
 * through the brainstem centre). None of them was ever a fraction of the box, so
 * no default scales with the new bounds and no stored click target shifts.
 *
 * What DID change is only the RANGE the sliders expose, and that is read from
 * `CLIP_BOUNDS` (viewer3d/clipPlanes.ts) — x ∈ [−48, 48], y ∈ [−55, 85],
 * z ∈ [−75, 55] — never restated here. The load-time block below asserts the
 * two invariants that keeps true: every default is inside every bound, and the
 * default transverse plane is still the same anchor the old bounds had.
 */
const DEFAULT_CLIP: ClipState = {
  x: 0,
  y: DEFAULT_LEVEL ? DEFAULT_LEVEL.y : -34,
  z: 0,
  enabled: false,
  showHelper: false,
}

{
  // (1) AMENDMENT B never moves a default: the transverse default is still the
  //     olivary anchor (levels.json `lvl-olivary`, y = −34 — below +45, so
  //     inside the OLD box too), and x/z stay 0.
  if (DEFAULT_CLIP.y >= 45 || DEFAULT_CLIP.x !== 0 || DEFAULT_CLIP.z !== 0) {
    throw new Error(
      `store: the default clip state moved with AMENDMENT B (clip ${JSON.stringify(DEFAULT_CLIP)}) — ` +
        'nothing below y = +45 may move (docs/TELENCEPHALON_PLAN.md §2)',
    )
  }
  // (2) Every default is inside the canonical slider ranges the UI exposes, so
  //     the sliders can never mount with a thumb outside their own min/max.
  for (const axis of ['x', 'y', 'z'] as const) {
    const bound = CLIP_BOUNDS[axis]
    if (DEFAULT_CLIP[axis] < bound.min || DEFAULT_CLIP[axis] > bound.max) {
      throw new Error(
        `store: default clip.${axis} = ${DEFAULT_CLIP[axis]} is outside CLIP_BOUNDS ` +
          `[${bound.min}, ${bound.max}]`,
      )
    }
  }
}

export const useAtlasStore = create<AtlasStore>()((set) => ({
  selectedId: null,
  hoveredId: null,
  activeTab: '3d',
  plateId: null,
  clip: { ...DEFAULT_CLIP },
  snapToPlate: true,
  explode: 0,
  layers: initialLayers(),
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

  applyViewPreset: (preset) => {
    // Persisted like the quality toggle (v7, plan step 4): the preset is a user
    // preference, so a returning visitor gets their own framing back. A failed
    // write (private mode) must never block the switch itself.
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(VIEW_PRESET_STORAGE_KEY, preset)
      }
    } catch {
      /* storage unavailable — the preset still applies for this session */
    }
    set(() => ({ layers: layersFromPreset(preset) }))
  },

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
      const previous = s.sectionUnderlay
      // Field-by-field merge: an explicitly `undefined` field can never wipe a
      // stored value, and the CT preset / real-first flag are validated here so
      // a UI typo cannot put the store into an unrenderable state.
      const merged: SectionUnderlay = {
        kind: isUnderlayKind(partial.kind) ? partial.kind : previous.kind,
        opacity: Math.min(
          1,
          Math.max(0, isFiniteNumber(partial.opacity) ? partial.opacity : previous.opacity),
        ),
        windowMin: isFiniteNumber(partial.windowMin) ? partial.windowMin : previous.windowMin,
        windowMax: isFiniteNumber(partial.windowMax) ? partial.windowMax : previous.windowMax,
        realFirst:
          typeof partial.realFirst === 'boolean' ? partial.realFirst : previous.realFirst,
        ctWindowPreset: isCtWindowPreset(partial.ctWindowPreset)
          ? partial.ctWindowPreset
          : previous.ctWindowPreset,
      }
      persistSectionUnderlay(merged)
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
