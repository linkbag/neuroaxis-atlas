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
  arteriesForSyndrome,
  getLevel,
  getPlate,
  getSyndrome,
  platesForLevel,
  REGION_LABELS,
  taxonomy,
  territoryOf,
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
  /** v8: the arterial cast (docs/NEUROATLAS_V8_PLAN.md §2). */
  | 'vasculature'
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

/**
 * Button labels for the same order (real-first first, simulated-only last).
 *
 * ── v9 item 4 (`section-ux`): why `none` keeps the bare text ────────────────
 * The images-off state had to become legible, and the plan's first choice was to
 * relabel this entry `'Simulated only (no imagery)'`. That change was NOT made,
 * and the reason is measured rather than stylistic: four call sites in three
 * gate scripts match this button by its EXACT text, and two of those scripts are
 * owned by no task in the v9 plan (so nobody could repair them):
 *
 *   • scripts/verify/audit.mjs:656 — `/^(Auto \(real-first\)|MRI|CT|Photo|Simulated only)$/`
 *   • scripts/verify/audit.mjs:716 — clicks the button whose text is exactly `Simulated only`
 *   • scripts/verify/checks.mjs:523 — `if (requested === 'Simulated only')`
 *   • scripts/verify/browser-probe.mjs:274 — the same exact-text sweep
 *
 * A suffix makes the regex fail and the comparison fall through to
 * `unknown-modality`, i.e. `verify:audit` / `verify:browser` would report a
 * product failure that is really a relabelling. The legibility the user asked
 * for is delivered instead through the three surfaces that ARE in this task's
 * scope, all fed by ONE string (`SECTION_UNDERLAY_KIND_DESCRIPTIONS.none`):
 * the button's accessible name (`aria-label`), the live-section toolbar's state
 * line, and the panel's own imagery line. The accessible name still CONTAINS the
 * visible label, so WCAG 2.5.3 (label in name) holds.
 */
export const SECTION_UNDERLAY_KIND_LABELS: Record<SectionUnderlayKind, string> = {
  auto: 'Auto (real-first)',
  mri: 'MRI',
  ct: 'CT',
  stain: 'Photo',
  none: 'Simulated only',
}

/**
 * What each modality button actually DOES, in one sentence — the v9 item 4
 * "a label that says what it does" text, kept next to the short button label so
 * the two can never drift. Used as the button's accessible name / tooltip, in
 * the live-section toolbar's imagery state line and in the panel's imagery line.
 */
export const SECTION_UNDERLAY_KIND_DESCRIPTIONS: Record<SectionUnderlayKind, string> = {
  auto: 'Auto (real-first): draw the best real modality that covers this plane, else the simulated section',
  mri: 'MRI: draw the real T1w MRI slice at this plane',
  ct: 'CT: draw the real CT slice at this plane (brain / bone window)',
  stain: 'Photo: draw the real photographed section at this plane',
  none: 'Simulated only (no imagery): draw the simulated section and nothing external',
}

/**
 * The one images-off statement (v9 item 4). Renderers of the state use this
 * string VERBATIM instead of retyping it, so the toolbar, the panel and the
 * backdrop hint can never describe the same state three different ways. It says
 * what is switched off, not merely that no imagery was found: the whole point of
 * the item is that "off" and "unavailable" are different states.
 */
export const IMAGERY_OFF_STATEMENT =
  'real imagery is switched off — the simulated section is shown on its own'

/**
 * The panel's own statement (v9 item 5). The simulated-section panel never
 * paints a CT/MRI slice or a photograph, whatever the Plates tab's modality is,
 * so its line names the withholding rather than a coverage limit.
 */
export const PIP_IMAGERY_WITHHELD_STATEMENT =
  'real imagery is withheld in this panel — the simulated section is shown on its own; ' +
  'the Plates tab draws the overlay for the same plane'

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

/* ------------------------------------------- v9 §2/§4/§5: store additions */
/* (plan §6 table: `sectionLobes`, `sectionPipSize` — both owned by task      */
/*  `section-ux`; `SectionCanvas` already READS `sectionLobes` defensively,   */
/*  so landing the field here is what makes its own toggle authoritative.)    */

/**
 * localStorage key persisting the cortical-division layer toggle (v9 §2, plan
 * §6). `'1'`/`'0'`; absent means off. `SectionCanvas` reads the same key as its
 * fallback, so the layer works in either direction and the persisted preference
 * survives a hot update — see its `readLobeLayerFlag`.
 */
export const SECTION_LOBES_STORAGE_KEY = 'neuroaxis.sectionLobes'

/** localStorage key persisting the simulated-section panel's window size (v9 §5).
 *  JSON `{width, height}` in CSS px; clamped on read, never trusted. */
export const SECTION_PIP_SIZE_STORAGE_KEY = 'neuroaxis.sectionPipSize'

/**
 * The panel's window size (CSS px) — v9 §5 requirement 4: "the user can change
 * the panel's size; the choice persists across reloads".
 */
export interface SectionPipSize {
  width: number
  height: number
}

/**
 * The size window the panel clamps every size to. The bounds are the plan's
 * (§5.4 item 4, `[224, 880] × [170, 640]`): the minimum is the old `pip-small`
 * box — below it the section stops being readable — and the maximum is roughly
 * half the viewer pane on a 1440 px-wide window, so the panel can never swallow
 * the model it annotates.
 */
export const SECTION_PIP_SIZE_MIN: SectionPipSize = { width: 224, height: 170 }
export const SECTION_PIP_SIZE_MAX: SectionPipSize = { width: 880, height: 640 }
export const DEFAULT_SECTION_PIP_SIZE: SectionPipSize = { ...SECTION_PIP_SIZE_MIN }

/** The two named stops the `▴/▾` button cycles through (the older CSS presets). */
export const SECTION_PIP_SIZE_PRESETS: Record<'small' | 'large', SectionPipSize> = {
  small: { width: 224, height: 170 },
  large: { width: 348, height: 262 },
}

/**
 * Clamp one size into the window above. Pure, exported and total (any input,
 * including NaN/Infinity/negative/non-integer, comes back as an integer inside
 * the bounds) — it is applied on READ from localStorage as well as on every
 * drag frame, because `neuroaxis.sectionPipSize` is a user-writable value.
 */
export function clampSectionPipSize(size: Partial<SectionPipSize> | null | undefined): SectionPipSize {
  const bound = (value: unknown, min: number, max: number, fallback: number): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, Math.round(value)))
  }
  const source = size ?? {}
  return {
    width: bound(source.width, SECTION_PIP_SIZE_MIN.width, SECTION_PIP_SIZE_MAX.width, DEFAULT_SECTION_PIP_SIZE.width),
    height: bound(
      source.height,
      SECTION_PIP_SIZE_MIN.height,
      SECTION_PIP_SIZE_MAX.height,
      DEFAULT_SECTION_PIP_SIZE.height,
    ),
  }
}

/** True when `size` is byte-for-byte one of the named presets. */
export function sectionPipSizePresetOf(size: SectionPipSize): 'small' | 'large' | 'custom' {
  for (const name of ['small', 'large'] as const) {
    const preset = SECTION_PIP_SIZE_PRESETS[name]
    if (preset.width === size.width && preset.height === size.height) return name
  }
  return 'custom'
}

/**
 * The next stop of the `▴/▾` size button: small → large → small, and any custom
 * (dragged) size returns to the small stop. Pure, so the cycle is testable.
 */
export function nextSectionPipSize(size: SectionPipSize): SectionPipSize {
  return sectionPipSizePresetOf(size) === 'small'
    ? { ...SECTION_PIP_SIZE_PRESETS.large }
    : { ...SECTION_PIP_SIZE_PRESETS.small }
}

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

/**
 * v9 §2 — the cortical-division layer toggle. `'1'`/`'0'`; anything else (absent,
 * corrupt, storage disabled) is OFF, which is the plan's default (§6 table).
 */
function initialSectionLobes(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SECTION_LOBES_STORAGE_KEY)
      if (raw === '1') return true
      if (raw === '0') return false
    }
  } catch {
    /* private mode — the layer still works, it just does not stick */
  }
  return false
}

/** Persist the layer toggle in the same `'1'`/`'0'` form the canvas reads. */
function persistSectionLobes(on: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SECTION_LOBES_STORAGE_KEY, on ? '1' : '0')
    }
  } catch {
    /* storage unavailable — the toggle still applies for this session */
  }
}

/**
 * v9 §5 — the panel's window size. Parsed and CLAMPED on read (a stored value is
 * user-writable: a missing field, a string, NaN, a 10 000 px box or malformed
 * JSON must all resolve to a usable size rather than to a broken panel).
 */
function initialSectionPipSize(): SectionPipSize {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SECTION_PIP_SIZE_STORAGE_KEY)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object') {
          return clampSectionPipSize(parsed as Partial<SectionPipSize>)
        }
      }
    }
  } catch {
    /* private mode / malformed JSON — fall through to the default */
  }
  return { ...DEFAULT_SECTION_PIP_SIZE }
}

/** Persist the panel size (same best-effort contract as the other keys). */
function persistSectionPipSize(size: SectionPipSize): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SECTION_PIP_SIZE_STORAGE_KEY, JSON.stringify(size))
    }
  } catch {
    /* storage unavailable — the size still applies for this session */
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
  /** v9 §2 (plan §6): the cortical-division layer, on the 2D live section. */
  sectionLobes: boolean
  /** v9 §5 (plan §6): the simulated-section panel's window size, in CSS px. */
  sectionPipSize: SectionPipSize
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
  /**
   * v10 §2 — the division control (docs/SWARM_V10_PLAN.md §2). Three thin
   * actions over the pure functions above; each one writes ONLY `layers.regions`
   * and touches neither storage nor any other layer field. `toggleDivision` is
   * what the Legend's checkbox calls (all of the division on when it is
   * incomplete, all of it off when it is complete); `soloDivision` is the
   * one-click isolation the item is about.
   */
  applyDivision: (id: DivisionId) => void
  clearDivision: (id: DivisionId) => void
  toggleDivision: (id: DivisionId) => void
  soloDivision: (id: DivisionId) => void
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
  /**
   * v9 §2 — switch the cortical-division layer of the 2D live section and
   * persist it (`neuroaxis.sectionLobes`, `'1'`/`'0'`). `SectionCanvas` calls
   * this through the store when the field exists (its own fallback keeps the
   * toggle working if it does not).
   */
  setSectionLobes: (on: boolean) => void
  /**
   * v9 §5 — set the simulated-section panel's window size, clamped to
   * `[224, 880] × [170, 640]` and persisted (`neuroaxis.sectionPipSize`).
   */
  setSectionPipSize: (size: Partial<SectionPipSize>) => void
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

/* ------------------------------------------------- v8 cerebral vasculature */

/** Every vessel record id (the `vasculature` region of the registry). */
const VASCULAR_IDS: readonly string[] = taxonomy
  .filter((entry) => entry.region === 'vasculature')
  .map((entry) => entry.id)

/**
 * Every region except `vasculature` — the layer set of a preset that keeps the
 * vascular overlay OFF (docs/NEUROATLAS_V8_PLAN.md §2: the arteries are hidden in
 * the default Brainstem-focus and Cortex-only framings and visible in
 * Whole-brain and the Vasculature preset).
 *
 * The vascular layer is switched off through the REGION layer rather than
 * through 14 structure ids in `hidden`, and that is deliberate: `hidden` is what
 * the presets' region guard inspects ("a subdivision-derived preset may only hide
 * telencephalon records"), and hiding an artery is not a statement about the
 * telencephalon — it is a statement about the vascular LAYER, which is exactly
 * what a region set expresses. It also means the tree dims the vascular rows
 * through the same `layerOff()` rule the user sees for every other region.
 */
const NON_VASCULAR_REGIONS: readonly Region[] = ALL_REGIONS.filter((region) => region !== 'vasculature')

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
    regions: NON_VASCULAR_REGIONS,
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
    regions: NON_VASCULAR_REGIONS,
    kinds: ALL_KINDS,
    hidden: new Set(nonTelencephalonIds()),
  },
  /**
   * v8 (docs/NEUROATLAS_V8_PLAN.md §2) — the arterial cast.
   *
   * The circle of Willis and its trunks with the brain they supply kept as a
   * faint outline: vessels, the surface records and the context envelopes (which
   * is what draws the translucent brain the cast sits inside), and nothing else.
   * Every nucleus, tract and ventricle is layer-off by KIND, so "vessels alone"
   * needs no per-structure hiding and stays true as records are added.
   *
   * No `emphasis`: the emphasis lift marks a subject inside a fuller scene, and
   * in this preset the vessel layer IS the scene. (`isSolidKind` also excludes
   * `vessel` — vessels render translucent, so the solid-kind lift would not apply
   * anyway.)
   */
  vasculature: {
    label: 'Vasculature',
    hint:
      'The circle of Willis and the major cerebral arteries as an arterial cast, '
      + 'with the brain they supply as a faint outline',
    regions: ALL_REGIONS,
    kinds: ['vessel', 'surface', 'context'],
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
 *
 * ── v8 AMENDMENT: the vascular layer (docs/NEUROATLAS_V8_PLAN.md §2) ─────────
 * The loop below skips the `vasculature` region, and the block then asserts
 * exactly what that exemption is allowed to mean: the vascular REGION layer is
 * OFF in the default framing (§2's "hidden by default in Brainstem focus"), no
 * vessel is hidden at STRUCTURE level (so the region toggle is the only thing
 * holding it back), and `all` / `whole-brain` / `vasculature` each carry both the
 * region and the `vessel` kind with no vessel hidden — without which the overlay
 * could be invisible everywhere while every other assertion still passed.
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
    // v8 exempts the vascular overlay from this invariant — and pays for the
    // exemption with the assertions right below. The subject of this block is the
    // NEURAXIS PARENCHYMA: "the brainstem must stay visible at default framing"
    // is a statement about the anatomy the view is named for, and an artery is
    // not a brainstem nucleus. The vascular layer is a separate overlay system by
    // design (docs/NEUROATLAS_V8_PLAN.md §2) and hiding it by default is the
    // plan's own requirement, so it cannot also be a violation of this rule.
    if (entry.region === 'telencephalon' || entry.region === 'vasculature') continue
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

  /* v8 — what the vascular exemption is allowed to mean, asserted. -------------- */
  if (VASCULAR_IDS.length === 0) {
    throw new Error(
      'store: no `vasculature` region records in the registry — the vascular layer, its preset and ' +
        'this whole block would be asserting nothing (docs/NEUROATLAS_V8_PLAN.md §2)',
    )
  }
  // (a) OFF at default framing, through the REGION layer only. A structure-level
  //     hide would be the wrong mechanism (it would collide with the region
  //     guard below) and would also make the vascular region toggle inconsistent:
  //     the row would say "region on" while its meshes stayed hidden.
  if (DEFAULT_LAYERS.regions.has('vasculature')) {
    throw new Error(
      'store: the default preset turns the vasculature REGION layer on — the arterial overlay is ' +
        'hidden at default framing by region, not by structure, so this is the one switch that may ' +
        'express it (docs/NEUROATLAS_V8_PLAN.md §2)',
    )
  }
  for (const id of VASCULAR_IDS) {
    if (DEFAULT_LAYERS.hidden.has(id)) {
      throw new Error(
        `store: the default preset hides the vessel "${id}" at STRUCTURE level — vessels are hidden ` +
          'by the region layer, so a structure-level hide would keep hiding them after the user ' +
          'switches the vascular region on (docs/NEUROATLAS_V8_PLAN.md §2)',
      )
    }
  }
  // (b) ON in every preset whose declared subject includes the vasculature. This
  //     is the half that makes the exemption safe: a future edit that dropped
  //     either the region or the `vessel` kind from these presets would leave the
  //     vascular layer invisible EVERYWHERE (hidden by default, and hidden in the
  //     presets that promise it), which no other check in this file would notice.
  for (const id of ['all', 'whole-brain', 'vasculature'] as const) {
    const def = VIEW_PRESETS[id]
    if (!def.regions.includes('vasculature')) {
      throw new Error(`store: preset "${id}" excludes the vasculature REGION layer — the vascular overlay would be unreachable (docs/NEUROATLAS_V8_PLAN.md §2)`)
    }
    if (!def.kinds.includes('vessel')) {
      throw new Error(`store: preset "${id}" excludes the "vessel" KIND layer — the vascular overlay would be unreachable (docs/NEUROATLAS_V8_PLAN.md §2)`)
    }
    for (const vesselId of VASCULAR_IDS) {
      if (def.hidden?.has(vesselId)) {
        throw new Error(`store: preset "${id}" hides the vessel "${vesselId}" — a preset that carries the vascular layer may not hide vessels (docs/NEUROATLAS_V8_PLAN.md §2)`)
      }
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

/* =============== v10 §2 — DIVISION-level visibility (the reference figure) ===
 *
 * The user's item 2: "allow the user to turn on and off just telencephalon,
 * mesencephalon etc. (see division in the reference figure); right now
 * everything is on in the 3D/2D views, and can be too overwhelming."
 *
 * WHY THIS IS ADDITIVE ONLY. `regions`/`kinds`/`hidden`/`emphasis` ARE the whole
 * layer model (see `AtlasLayers` above) and every existing consumer — the 3D
 * scene, the plates, the tree's `layerOff()`, the boot assertions below,
 * `viewPresetOf`, the header — is written against exactly those four fields. A
 * division is therefore NOT a fifth field to be persisted and reconciled: it is a
 * *labelling of the seven existing regions*, and every division action resolves
 * to a plain region-set write. That is what makes the per-region toggles, the
 * presets and the browser audit keep working byte-for-byte.
 *
 * WHAT THE FOUR DIVISIONS ARE (docs/SWARM_V10_PLAN.md §2's table, and the
 * reference figure's own grouping — the standard embryological three-vesicle
 * scheme plus the vascular system):
 *
 *   prosencephalon (forebrain)  = telencephalon + diencephalon
 *   mesencephalon (midbrain)    = midbrain
 *   rhombencephalon (hindbrain) = pons + cerebellum (metencephalon)
 *                                 + medulla (myelencephalon)
 *   cerebral vasculature        = vasculature — its OWN system, never folded
 *                                 into a division (v8's rule: the arteries are a
 *                                 separate overlay, hidden by default)
 *
 * The four divisions PARTITION all seven regions of `ALL_REGIONS`: every region
 * belongs to exactly one, and the block after these functions asserts that at
 * module load, so a region added later can never be silently orphaned from the
 * control (that failure mode is invisible in the UI — the row simply would not
 * exist).
 *
 * NO PERSISTENCE, BY DESIGN. There is no storage key for a division and there
 * must not be one: a persisted solo would hand a returning visitor a tree in
 * which six of seven regions look switched off, which is exactly the v7 audit
 * failure mode documented at `initialLayers` above. A division choice is a
 * transient view filter, not a boot preference.
 */

/** The four divisions of the reference figure. */
export type DivisionId = 'prosencephalon' | 'mesencephalon' | 'rhombencephalon' | 'vasculature'

export const DIVISIONS: readonly { id: DivisionId; label: string; regions: readonly Region[] }[] = [
  {
    id: 'prosencephalon',
    label: 'Prosencephalon (forebrain)',
    regions: ['telencephalon', 'diencephalon'],
  },
  { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', regions: ['midbrain'] },
  {
    id: 'rhombencephalon',
    label: 'Rhombencephalon (hindbrain)',
    regions: ['pons', 'cerebellum', 'medulla'],
  },
  { id: 'vasculature', label: 'Cerebral vasculature', regions: ['vasculature'] },
]

/** The regions of one division, as a fresh array the caller may keep. */
export function divisionRegions(id: DivisionId): readonly Region[] {
  return DIVISIONS.find((division) => division.id === id)?.regions ?? []
}

/**
 * Every division a region belongs to — the inverse map the UI needs (a region row
 * can name its division) and the only place the "one region, one division" rule
 * is expressed for readers. Returns an empty array for a region no division
 * claims, which the load-time block below turns into a hard failure instead of a
 * silently missing control.
 */
export function divisionsOf(region: Region): readonly DivisionId[] {
  return DIVISIONS.filter((division) => division.regions.includes(region)).map(
    (division) => division.id,
  )
}

/**
 * Is every region of the division layer-on? This is the checkbox's `checked`
 * reading and the decision input of the UI's toggle, so "the box is ticked" and
 * "the division is on" are one fact rather than two guesses.
 */
export function divisionLayersOn(layers: AtlasLayers, id: DivisionId): boolean {
  const regions = divisionRegions(id)
  return regions.length > 0 && regions.every((region) => layers.regions.has(region))
}

/** The one field every division action writes: a new region set, nothing else. */
function withRegions(layers: AtlasLayers, regions: ReadonlySet<Region>): AtlasLayers {
  return { regions: new Set<Region>(regions), kinds: layers.kinds, hidden: layers.hidden, emphasis: layers.emphasis }
}

/**
 * The division's regions ON, everything else exactly as it was — a UNION, not an
 * assignment (the v10 §2 "checkbox path": a division row turns its own regions on
 * and never silently switches a user's other regions off).
 */
export function applyDivisionLayers(layers: AtlasLayers, id: DivisionId): AtlasLayers {
  const regions = new Set<Region>(layers.regions)
  for (const region of divisionRegions(id)) regions.add(region)
  return withRegions(layers, regions)
}

/** The division's regions OFF, everything else exactly as it was. */
export function clearDivisionLayers(layers: AtlasLayers, id: DivisionId): AtlasLayers {
  const regions = new Set<Region>(layers.regions)
  for (const region of divisionRegions(id)) regions.delete(region)
  return withRegions(layers, regions)
}

/**
 * Exactly the division's regions on and EVERY other region off — the solo
 * action, which is the point of item 2 ("everything on is too overwhelming").
 * `kinds`, `hidden` and `emphasis` are untouched: they belong to the preset
 * framing and to v8's vascular rule, and a view filter must not rewrite them.
 */
export function soloDivisionLayers(layers: AtlasLayers, id: DivisionId): AtlasLayers {
  return withRegions(layers, new Set<Region>(divisionRegions(id)))
}

/**
 * The checkbox toggle, as one pure function: all regions of the division on when
 * any of them is off, all off when the division is complete. Commutative and
 * idempotent per state — `toggle(toggle(layers))` restores the region set
 * exactly, which is what the committed check asserts.
 */
export function toggleDivisionLayers(layers: AtlasLayers, id: DivisionId): AtlasLayers {
  return divisionLayersOn(layers, id) ? clearDivisionLayers(layers, id) : applyDivisionLayers(layers, id)
}

/* ============ v11 §1 — the AREA partition (the header's "Areas" toggle row) ===
 *
 * The user's ask: "instead of divisions such as 'brainstem focus', simply use big
 * categories like telencephalon, mesencephalon etc. … and make them toggle buttons
 * so users can toggle on and off these brain areas (exclude from 3D/2D section
 * view when off, include when on)".
 *
 * WHAT AN AREA IS. Exactly what a division is (see the block above): a LABELLING
 * of the seven existing regions, not a fifth layer field. Every area toggle
 * resolves to the same region-set write the per-region checkboxes and the v10
 * division control already perform (`toggleRegionLayer`), so the 3D scene, the 2D
 * live section and the simulated-section panel follow it through the one rule
 * they already implement, and nothing needs persisting.
 *
 * WHAT CHANGES FROM v10 IS ONLY THE GRANULARITY. The v10 divisions group the
 * regions along the three-vesicle scheme — prosencephalon, mesencephalon,
 * rhombencephalon — which leaves the hindbrain as one four-region lump. v11 splits
 * exactly that lump along the vesicle boundary the store's own header already
 * documents (`store.ts` v10 block: "rhombencephalon (hindbrain) = pons +
 * cerebellum (metencephalon) + medulla (myelencephalon)"), so the row reads
 * Telencephalon · Diencephalon · Mesencephalon · Metencephalon · Myelencephalon ·
 * Cerebral vasculature — more precise where the user asked for more precision,
 * and identical everywhere else.
 *
 * DERIVED, NEVER RETYPED. `metencephalon` is `DIVISIONS.rhombencephalon` MINUS
 * `medulla` and `myelencephalon` IS `medulla`, both computed from
 * `divisionRegions()` at module load; the other four areas are their division's
 * regions verbatim. `DIVISIONS` itself is untouched (v11 §4: the v10 partition is
 * reused, not re-labelled), which is why the v10 block above still holds exactly
 * as written.
 */

/** The six areas of the header's "Areas" row (the v11 partition). */
export type AreaId =
  | 'telencephalon'
  | 'diencephalon'
  | 'mesencephalon'
  | 'metencephalon'
  | 'myelencephalon'
  | 'vasculature'

/**
 * The regions `DIVISIONS.rhombencephalon` names, as the store labels them. Read
 * from the division, not retyped; `HINDBRAIN_SPLIT_MEDULLA` is the ONE region the
 * metencephalon/myelencephalon boundary is drawn at, and the loop right below
 * fails the module load if the division stops containing it — so the derivation
 * can never quietly become the whole rhombencephalon.
 */
const HINDBRAIN_REGIONS: readonly Region[] = divisionRegions('rhombencephalon')
const HINDBRAIN_SPLIT_MEDULLA: Region = 'medulla'

/** One area: the label the button shows, its v10 division, and its own regions. */
export interface AreaDefinition {
  id: AreaId
  label: string
  /**
   * The v10 division this area belongs to (the `data-division` hook and the
   * browser lane's link between the two controls). `metencephalon` and
   * `myelencephalon` share `rhombencephalon`: they are one division seen at the
   * finer granularity the user asked for.
   */
  division: DivisionId
  regions: readonly Region[]
}

/**
 * The AREAS table: six buttons, seven regions, each region owned exactly once.
 * The load-time block after `areaLayersOn` proves that totality and disjointness,
 * and `scripts/verify/area-toggles.mjs` re-derives the same partition from
 * `DIVISIONS` and asserts this table equals it.
 */
/**
 * The AREAS table: five buttons, six regions, each region owned exactly once.
 *
 * v12: `vasculature` is NOT here. The user asked for the arterial system to sit
 * with the other SYSTEMS (it is a system of vessels, not a division of the
 * neuraxis), so its button moved to the header's Systems row, labelled
 * "Vasculature". The Areas row therefore partitions `ALL_REGIONS` minus
 * `vasculature`, and `SYSTEM_REGION_BUTTONS` below is that complement by
 * construction — `scripts/verify/area-toggles.mjs` asserts the two halves still
 * cover every region exactly once, so a future region cannot fall between them.
 */
export const AREAS: readonly AreaDefinition[] = [
  { id: 'telencephalon', label: 'Telencephalon', division: 'prosencephalon', regions: divisionRegions('prosencephalon').filter((region) => region === 'telencephalon') },
  { id: 'diencephalon', label: 'Diencephalon', division: 'prosencephalon', regions: divisionRegions('prosencephalon').filter((region) => region === 'diencephalon') },
  { id: 'mesencephalon', label: 'Mesencephalon (midbrain)', division: 'mesencephalon', regions: divisionRegions('mesencephalon') },
  { id: 'metencephalon', label: 'Metencephalon (pons + cerebellum)', division: 'rhombencephalon', regions: HINDBRAIN_REGIONS.filter((region) => region !== HINDBRAIN_SPLIT_MEDULLA) },
  { id: 'myelencephalon', label: 'Myelencephalon (medulla)', division: 'rhombencephalon', regions: HINDBRAIN_REGIONS.filter((region) => region === HINDBRAIN_SPLIT_MEDULLA) },
]

/**
 * v12 — the regions the Systems row owns as region-backed buttons (today just the
 * arterial system). Derived as the complement of `AREAS`, never a literal, so the
 * two rows cannot both claim a region or leave one unreachable.
 */
export const SYSTEM_REGION_BUTTONS: readonly { id: Region; label: string }[] = ALL_REGIONS
  .filter((region) => !AREAS.some((area) => area.regions.includes(region)))
  .map((region) => ({ id: region, label: region === 'vasculature' ? 'Vasculature' : REGION_LABELS[region] }))

/** The regions of one area, as a fresh array the caller may keep. */
export function areaRegions(id: AreaId): readonly Region[] {
  return AREAS.find((area) => area.id === id)?.regions ?? []
}

/** The one area a region belongs to (empty for a region no area claims). */
export function areasOf(region: Region): readonly AreaId[] {
  return AREAS.filter((area) => area.regions.includes(region)).map((area) => area.id)
}

/**
 * Is every region of the area layer-on? This is the button's `aria-pressed`
 * reading and the decision input of the "Areas" row's toggle, so "the button
 * reads on" and "the area is on" are one fact rather than two guesses — the same
 * contract `divisionLayersOn` gives the Legend's division checkbox.
 */
export function areaLayersOn(layers: AtlasLayers, id: AreaId): boolean {
  const regions = areaRegions(id)
  return regions.length > 0 && regions.every((region) => layers.regions.has(region))
}

/**
 * The "everything on" layer state, bound to `VIEW_PRESETS.all` rather than
 * hand-written, so the header's All action cannot invent a second definition of
 * "everything" (docs/SWARM_V11_PLAN.md §1c). Exported for the same reason
 * DEFAULT_LAYERS is: it is the definition a check can assert against.
 */
export const ALL_ON_LAYERS: AtlasLayers = layersFromPreset('all')

/**
 * Boot-time invariant of the division table (same contract as the blocks below:
 * asserted at module load, in Node and in the browser alike).
 *
 * The subject is the rule that makes the control complete: the four divisions
 * partition `ALL_REGIONS` — no region in two divisions (a "one division" row that
 * actually toggles another division's region is a silent, unexplainable state) and
 * none in no division (a region the control simply cannot reach). Vasculature is
 * asserted explicitly, because folding the arteries into the rhombencephalon is
 * exactly the error the item's wording warns against.
 */
{
  for (const region of ALL_REGIONS) {
    const owners = divisionsOf(region)
    if (owners.length !== 1) {
      throw new Error(
        `store: region "${region}" belongs to ${owners.length} divisions (${owners.join(', ') || 'none'}) ` +
          '— the four divisions must partition ALL_REGIONS exactly, or the division control cannot ' +
          'switch it (docs/SWARM_V10_PLAN.md §2)',
      )
    }
  }
  for (const division of DIVISIONS) {
    for (const region of division.regions) {
      if (!ALL_REGIONS.includes(region)) {
        throw new Error(
          `store: division "${division.id}" claims "${region}", which is not in ALL_REGIONS — the row ` +
            'would toggle a region no layer set can hold (docs/SWARM_V10_PLAN.md §2)',
        )
      }
    }
  }
  const vascularOwners = divisionsOf('vasculature')
  if (vascularOwners.length !== 1 || vascularOwners[0] !== 'vasculature') {
    throw new Error(
      `store: the vasculature region is grouped into ${vascularOwners.join(', ') || 'no division'} — the ` +
        'arterial system is its own division and is never swept into a brain division ' +
        '(docs/SWARM_V10_PLAN.md §2, docs/NEUROATLAS_V8_PLAN.md §2)',
    )
  }
}

/**
 * Boot-time invariant of the AREA table — total and disjoint over `ALL_REGIONS`,
 * asserted at module load in Node and in the browser alike (the same contract as
 * the division block above, and the reason both blocks exist twice).
 *
 * ── WHY THIS BLOCK RUNS AFTER THE DIVISION BLOCK, AND NOT BEFORE ────────────
 * The area table is DERIVED from `DIVISIONS`, so when the division table itself is
 * broken there are two true throwers and their order decides which one a caller
 * sees. `verify:division-toggles`' load-time bite mutates a division (`rhombencephalon`
 * → `vasculature` instead of `cerebellum`) and asserts the failure names the
 * DIVISION defect ("belongs to 0 divisions" / "is grouped into"). Running the
 * division block first keeps that documented diagnosis intact and still leaves the
 * area rule fully checked in every other case — including the v11 case it exists
 * for, a mutated area table (see `scripts/verify/area-toggles.mjs` §10, where the
 * same mutation is applied to the AREAS entry and this block is the one that fires).
 *
 * The failure modes this makes impossible are the silent ones: an area that
 * claims no region (a button that switches nothing), a region no area claims (a
 * slice of the atlas the row cannot exclude), a region claimed twice (one button
 * silently switching another area's data), and a table that drifts from the v10
 * divisions it is derived from (two labels for one region). A region added to the
 * taxonomy later can therefore not be orphaned from the header control.
 */
{
  const claimed = new Map<Region, AreaId[]>()
  for (const area of AREAS) {
    if (area.regions.length === 0) {
      throw new Error(
        `store: area "${area.id}" (${area.label}) claims no region — the button would switch ` +
          'nothing (docs/SWARM_V11_PLAN.md §1)',
      )
    }
    if (divisionsOf(area.regions[0])[0] !== area.division) {
      throw new Error(
        `store: area "${area.id}" declares the division "${area.division}", but its first region ` +
          `"${area.regions[0]}" belongs to "${divisionsOf(area.regions[0]).join(', ') || 'no division'}" ` +
          '— the header row and the Legend would disagree about the same region ' +
          '(docs/SWARM_V11_PLAN.md §1)',
      )
    }
    for (const region of area.regions) {
      if (!ALL_REGIONS.includes(region)) {
        throw new Error(
          `store: area "${area.id}" claims "${region}", which is not in ALL_REGIONS — the button would ` +
            'toggle a region no layer set can hold (docs/SWARM_V11_PLAN.md §1)',
        )
      }
      if (divisionsOf(region)[0] !== area.division) {
        throw new Error(
          `store: area "${area.id}" claims "${region}", which the v10 division table puts in ` +
            `"${divisionsOf(region).join(', ') || 'no division'}" — areas are the divisions at a finer ` +
            'granularity, never a re-grouping of them (docs/SWARM_V11_PLAN.md §1)',
        )
      }
      const owners = claimed.get(region) ?? []
      owners.push(area.id)
      claimed.set(region, owners)
    }
  }
  for (const region of ALL_REGIONS) {
    // v12: the two rows TOGETHER must still cover every region exactly once. The
    // Areas row owns the divisions of the neuraxis; the Systems row owns the
    // region-backed systems (today just `vasculature`), which the user asked to
    // sit with the other systems rather than with the areas. What matters is
    // unchanged: no region may be claimed twice (two buttons switching one slice)
    // and none may be claimed by nobody (a slice the UI cannot reach).
    const areaOwners = claimed.get(region) ?? []
    const systemOwners = SYSTEM_REGION_BUTTONS.filter((entry) => entry.id === region).map((entry) => `systems:${entry.id}`)
    const owners = [...areaOwners, ...systemOwners]
    if (owners.length !== 1) {
      throw new Error(
        `store: region "${region}" is claimed by ${owners.length} controls (${owners.join(', ') || 'none'}) ` +
          '— the Areas row plus the Systems row\'s region-backed buttons must partition ALL_REGIONS ' +
          'exactly, or a slice of the atlas is either unreachable or switched by two buttons ' +
          '(docs/SWARM_V11_PLAN.md §1, v12 amendment)',
      )
    }
  }
  // The hindbrain split, asserted rather than assumed: the two areas that share
  // the rhombencephalon must together be that division and must each hold the
  // vesicle the label names. Without this, editing the division would silently
  // hand one area the other's region while the partition rule above still passed.
  const hindbrain = divisionRegions('rhombencephalon')
  const met = [...areaRegions('metencephalon')]
  const myel = [...areaRegions('myelencephalon')]
  const merged = [...met, ...myel]
  const mergedCovers = merged.length === hindbrain.length && hindbrain.every((region) => merged.includes(region))
  if (!mergedCovers || myel.length !== 1 || myel[0] !== HINDBRAIN_SPLIT_MEDULLA || !met.includes('pons')) {
    throw new Error(
      `store: the rhombencephalon split is wrong — metencephalon [${met.join(', ')}] + ` +
        `myelencephalon [${myel.join(', ')}] must be exactly [${hindbrain.join(', ')}] with the medulla ` +
        'alone in the myelencephalon (docs/SWARM_V11_PLAN.md §1)',
    )
  }
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
  sectionLobes: initialSectionLobes(),
  sectionPipSize: initialSectionPipSize(),

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

  // v10 §2 — division actions. Deliberately NOT persisted (see the DIVISIONS
  // block above): a solo is a temporary view filter, and `set` publishes a new
  // layer object so every consumer (3D scene, plates, tree) follows through the
  // one field it already reads.
  applyDivision: (id) => set((s) => ({ layers: applyDivisionLayers(s.layers, id) })),

  clearDivision: (id) => set((s) => ({ layers: clearDivisionLayers(s.layers, id) })),

  toggleDivision: (id) => set((s) => ({ layers: toggleDivisionLayers(s.layers, id) })),

  soloDivision: (id) => set((s) => ({ layers: soloDivisionLayers(s.layers, id) })),

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

  setSectionLobes: (on) => {
    // Persist first (best effort), then publish: the canvas' own fallback reads
    // the same key, so a failed write must not block the toggle itself.
    persistSectionLobes(on)
    set({ sectionLobes: on })
  },

  setSectionPipSize: (size) =>
    set((s) => {
      // Field-wise merge with the CURRENT size (a partial write or a NaN from a
      // broken drag must never silently reset the other dimension), then clamp.
      const merged = clampSectionPipSize({
        width: isFiniteNumber(size.width) ? size.width : s.sectionPipSize.width,
        height: isFiniteNumber(size.height) ? size.height : s.sectionPipSize.height,
      })
      persistSectionPipSize(merged)
      return { sectionPipSize: merged }
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

/* ------------------------------------- v9 §5: the panel's imagery scope */

/**
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * v9 item 5 requires the simulated-section panel to show the simulated section
 * and NOTHING ELSE: "no CT/MRI slice or photograph ever, independently of the
 * Plates tab's modality". The panel's content is a `SectionCanvas` instance
 * (plan §0a — one renderer, no duplicated draw code), and `SectionCanvas` reads
 * `state.sectionUnderlay.kind` verbatim: it is task `cortical-lobes`' file and
 * takes no imagery prop. So the only way to have THAT instance resolve the
 * images-off state — without forking the renderer, without touching another
 * task's file, and without pretending the imagery is unavailable — is to hold
 * the store's imagery request in the images-off state while the panel's canvas
 * is mounted.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *  • it never calls `persistSectionUnderlay`, so `neuroaxis.sectionUnderlay`
 *    (the user's own choice, schemaVersion 2) is untouched on disk — a reload
 *    while the panel is up still restores the Plates tab's modality;
 *  • it is reference-counted and idempotent, so a StrictMode double-mount or a
 *    second panel instance cannot leak the override;
 *  • the release writes only the `kind` back onto whatever the live object is at
 *    that moment, so a write that happened WHILE the scope was held (an opacity
 *    or window change) is kept rather than clobbered by the saved snapshot.
 *
 * The scope is paired with an independent, unconditional pixel guard in
 * `viewer3d/PipSection.tsx` (no `drawImage` can reach the panel's canvas at
 * all), so the guarantee does not depend on this override being applied — it is
 * the difference between "the panel does not ask for imagery" and "the panel
 * cannot receive it".
 */
export const sectionPipImageryScope: {
  /** How many panel canvases currently hold the scope (0 = inactive). */
  depth: number
  /** The user's own underlay while the scope is held (null when inactive). */
  saved: SectionUnderlay | null
} = { depth: 0, saved: null }

/**
 * Hold the store in the images-off state until the returned disposer runs.
 * Returns a disposer that is safe to call more than once.
 */
export function beginSectionPipImageryScope(): () => void {
  if (sectionPipImageryScope.depth === 0) {
    const current = useAtlasStore.getState().sectionUnderlay
    sectionPipImageryScope.saved = current
    if (current.kind !== 'none') {
      // LIVE value only — no persistence (see the block comment above).
      useAtlasStore.setState({ sectionUnderlay: { ...current, kind: 'none' } })
    }
  }
  sectionPipImageryScope.depth += 1

  let released = false
  return () => {
    if (released) return
    released = true
    sectionPipImageryScope.depth = Math.max(0, sectionPipImageryScope.depth - 1)
    const saved = sectionPipImageryScope.saved
    if (sectionPipImageryScope.depth > 0 || saved === null) return
    sectionPipImageryScope.saved = null
    const live = useAtlasStore.getState().sectionUnderlay
    if (live.kind !== saved.kind) {
      // Only the field this scope wrote is restored.
      useAtlasStore.setState({ sectionUnderlay: { ...live, kind: saved.kind } })
    }
  }
}

/**
 * The id set that should stay lit while everything else dims: an open syndrome
 * wins over a plain selection (plan §1.1 feature 10).
 *
 * v8 additions (docs/NEUROATLAS_V8_PLAN.md §2 "selecting an artery highlights its
 * territory structures" and "the syndromes already map arteries → structures"):
 *  - opening a syndrome also lights the ARTERIES that name it in their `supply`
 *    (no syndrome card lists a vessel in `structures[]` — see load.ts), so the
 *    clinical card and the vessel it belongs to light each other;
 *  - selecting an artery also lights its `territory`, which is what makes an
 *    occlusion's footprint readable: select the PCA and the midbrain/thalamic
 *    structures it supplies come up with it, in 3D, on the plates and in the
 *    live section (all three read this one set).
 *
 * Both are additive: with no vessels in play the function returns exactly what it
 * returned before v8.
 */
export function highlightIdSet(state: Pick<AtlasState, 'selectedId' | 'syndromeId'>): Set<string> | null {
  if (state.syndromeId !== null) {
    const syndrome = getSyndrome(state.syndromeId)
    if (syndrome) {
      const ids = new Set(syndrome.structures)
      for (const arteryId of arteriesForSyndrome(state.syndromeId)) ids.add(arteryId)
      if (ids.size > 0) return ids
    }
  }
  if (state.selectedId !== null) {
    const territory = territoryOf(state.selectedId)
    return territory.length > 0
      ? new Set([state.selectedId, ...territory])
      : new Set([state.selectedId])
  }
  return null
}
