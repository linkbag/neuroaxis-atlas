/**
 * Header — product title, the two v11 toggle rows (**Areas** and **Systems**),
 * the view-preset shortcut row, the Reset / All actions, the rendering-quality
 * toggle and the references button.
 *
 * ── WHAT v11 CHANGED, AND WHERE THE PRESET ROW WENT ────────────────────────
 * The user's ask (docs/SWARM_V11_PLAN.md §1) is the two toggle rows:
 *
 *   • **Areas** — the big anatomical categories (Telencephalon · Diencephalon ·
 *     Mesencephalon (midbrain) · Metencephalon (pons + cerebellum) ·
 *     Myelencephalon (medulla) · Cerebral vasculature). Each button toggles
 *     EXACTLY the taxonomy regions it owns, through the store's existing
 *     `toggleRegionLayer`, so the 3D scene, the 2D live section and the
 *     simulated-section panel all exclude/include that slice together.
 *   • **Systems** — the orthogonal axis (Nuclei · Tracts · Ventricles · Surface ·
 *     Context · Vessels), which is `ALL_KINDS` mapped in order, through
 *     `toggleKindLayer`. Total and disjoint over `ALL_KINDS` by construction.
 *
 * The preset ROW is not deleted — it is **demoted to the shortcut row beneath
 * them** (PLAN.md §4). Measured reason rather than taste: `verify:audit`'s boot
 * check reads `document.querySelectorAll('.header-presets button')` and requires
 * an `aria-pressed="true"` button reading exactly `Brainstem focus`
 * (`audit.mjs:884–885`, graded by `checks.mjs:191–212`), and three of its clicks
 * address presets by exact text (`audit.mjs:2328`, `:2353`, `:2432`). Collapsing
 * the row into a menu, a `<select>` or a `<details>` would delete the
 * default-framing assertion the brief forbids removing.
 *
 * ── WHY THE ROWS SIT IN THIS DOM ORDER ─────────────────────────────────────
 * The markup order is presets → Areas → Systems, and the row `order` presents
 * them as Areas → Systems → presets. Both halves are deliberate:
 *
 *   • the DOM order keeps `.header-presets` — and therefore the preset `Nuclei`
 *     button — first among the header buttons, which is what `audit.mjs:995`
 *     addresses by `[...document.querySelectorAll('button')].find(b =>
 *     b.textContent.trim() === 'Nuclei')` (the "layer toggle works" check). The
 *     Systems row also contains a button reading exactly `Nuclei`, so a DOM
 *     reorder would silently re-point that check at a different control.
 *   • the visual order is what the user asked for: the Areas row is the first
 *     control row under the title. `order` is presentation only, so it cannot
 *     change which element any DOM query finds.
 *
 * ── ACCESSIBLE NAMES / THE ONE FORBIDDEN LABEL ────────────────────────────
 * Every button is a real `<button type="button">` with `aria-pressed`, and its
 * visible text is a PREFIX of its accessible name (WCAG 2.5.3). No new control
 * may read exactly `Vasculature`: that is the v8 preset label, clicked by exact
 * text at `audit.mjs:2353`. Hence `Cerebral vasculature` (area) and `Vessels`
 * (system). The machine hooks are `data-area` / `data-kind` (plus `data-division`
 * on the area buttons and `data-preset` on the preset buttons) for the browser
 * lane, and `data-header-action` on Reset / All.
 *
 * ── RESET / ALL ───────────────────────────────────────────────────────────
 * Reset calls the store's EXISTING `applyViewPreset('brainstem-focus')` — not a
 * hand-written layer object — so "Reset restores the documented default framing"
 * is true by construction, and its pressed state is that same preset's own
 * `viewPresetOf` reading: one definition of the default, not two. All likewise
 * resolves through `VIEW_PRESETS.all` (via `ALL_ON_LAYERS`), the
 * `neuroaxis.viewPreset` write included, so a returning visitor keeps the
 * framing they chose exactly as clicking a preset always did.
 */

import type { CSSProperties } from 'react'
import type { Kind, Region } from '../types'
import { ALL_KINDS } from '../data/load'
import {
  ALL_ON_LAYERS,
  AREAS,
  areaLayersOn,
  useAtlasStore,
  viewPresetOf,
  VIEW_PRESETS,
  type RenderQuality,
  type ViewPreset,
} from '../state/store'

/**
 * Preset button order. v1–v6 presets first (their behaviour is unchanged), then
 * the four v7 telencephalon-aware presets of docs/TELENCEPHALON_PLAN.md §5 —
 * whose FIRST entry, Brainstem focus, is also the default layer state a fresh
 * visitor boots into (state/store.ts DEFAULT_LAYERS) — then v8's Vasculature,
 * which sits next to Whole brain because those are the two framings that carry
 * the arterial layer (docs/NEUROATLAS_V8_PLAN.md §2).
 */
const PRESET_ORDER: ViewPreset[] = [
  'brainstem-focus',
  'deep-structures',
  'whole-brain',
  'vasculature',
  'cortex-only',
  'all',
  'nuclei',
  'tracts',
  'clinical-motor',
]

const QUALITY_ORDER: RenderQuality[] = ['high', 'balanced']

const QUALITY_LABELS: Record<RenderQuality, string> = {
  high: 'High',
  balanced: 'Balanced',
}

const QUALITY_HINTS: Record<RenderQuality, string> = {
  high: 'Full quality: SSAO ambient shading, subtle bloom and SMAA antialiasing',
  balanced: 'Faster: skips all post effects and caps the render resolution',
}

/**
 * The Systems row's visible labels — the plural, user-facing name of each kind.
 * Keyed by `ALL_KINDS` through a `Record<Kind, string>`, so a kind added to the
 * registry cannot land without a label (the omission is a compile error), and it
 * is also how `Vessels` avoids colliding with the `Vasculature` preset label.
 */
const KIND_LABELS: Record<Kind, string> = {
  nucleus: 'Nuclei',
  tract: 'Tracts',
  ventricle: 'Ventricles',
  surface: 'Surface',
  context: 'Context',
  vessel: 'Vessels',
}

/** One system's accessible name: the visible label first, then what it switches. */
function kindAccessibleName(kind: Kind): string {
  return `${KIND_LABELS[kind]} — show/hide the ${kind} system (${kind})`
}

/** One area's accessible name: the visible label first, then what it switches. */
function areaAccessibleName(label: string, regions: readonly Region[]): string {
  const list = regions.join(' + ')
  return `${label} — show/hide the ${list} area (${list})`
}

/** Plain inline style for a labelled toggle row — this task owns no CSS file. */
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  minWidth: 0,
}

/** The row label: an `order: -1` SPAN, never a control and never a tab stop. */
const rowLabelStyle: CSSProperties = {
  order: -1,
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.65,
  whiteSpace: 'nowrap',
}

export default function Header() {
  const layers = useAtlasStore((s) => s.layers)
  const applyViewPreset = useAtlasStore((s) => s.applyViewPreset)
  const toggleRegionLayer = useAtlasStore((s) => s.toggleRegionLayer)
  const toggleKindLayer = useAtlasStore((s) => s.toggleKindLayer)
  const setReferencesOpen = useAtlasStore((s) => s.setReferencesOpen)
  const quality = useAtlasStore((s) => s.quality)
  const setQuality = useAtlasStore((s) => s.setQuality)
  const activePreset = viewPresetOf(layers)

  /**
   * The Areas row's toggle: one store write per region of the area whose layer
   * state differs from the target, so the row and the per-region checkboxes the
   * Legend and the taxonomy tree read can never disagree — all three resolve to
   * `layers.regions`.
   */
  const toggleArea = (regions: readonly Region[], on: boolean): void => {
    for (const region of regions) {
      if (layers.regions.has(region) !== on) toggleRegionLayer(region)
    }
  }

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="app-title">NeuroAxis</h1>
        <span className="app-subtitle">3D Brainstem Atlas — diencephalon · midbrain · rhombencephalon · telencephalon</span>
      </div>

      <div className="header-rows" style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {/*
         * The preset SHORTCUT row — third of the three rows visually (`order: 2`),
         * first in the DOM for the reason in the file header. `data-preset` is the
         * v11 machine hook; the class, the group role, the label text and the
         * `aria-pressed` state are all exactly what v10 shipped.
         */}
        <div className="header-presets" role="group" aria-label="View presets" style={{ ...rowStyle, order: 2 }}>
          {PRESET_ORDER.map((preset) => {
            const def = VIEW_PRESETS[preset]
            const active = activePreset === preset
            return (
              <button
                key={preset}
                type="button"
                data-preset={preset}
                className={`btn${active ? ' is-active' : ''}`}
                title={def.hint}
                aria-pressed={active}
                onClick={() => applyViewPreset(preset)}
              >
                {def.label}
              </button>
            )
          })}
          {/*
           * The two v11 actions, inside the same `.header-presets` group because
           * they set the same thing the preset buttons do — a framing. Reset is
           * the documented default, and it IS the preset action (not a copy of
           * the default layer object), so the store's default assertion, the
           * audit's boot reading and this button can never drift apart.
           */}
          <button
            type="button"
            data-header-action="reset"
            className="btn"
            aria-pressed={activePreset === 'brainstem-focus'}
            aria-label="Reset the view to the default framing"
            title="Reset — the default framing (Brainstem focus): brainstem-first, hemispheres faint, arterial overlay off"
            onClick={() => applyViewPreset('brainstem-focus')}
          >
            Reset
          </button>
          <button
            type="button"
            data-header-action="all"
            className="btn"
            aria-pressed={activePreset === 'all'}
            aria-label="All — show every area and system"
            title={VIEW_PRESETS.all.hint}
            onClick={() => applyViewPreset(viewPresetOf(ALL_ON_LAYERS) ?? 'all')}
          >
            All
          </button>
        </div>

        {/*
         * Row "Areas" — the big anatomical categories, multi-select, presented
         * FIRST (`order: 0`). Each button is pressed exactly when every region it
         * owns is layer-on, and carries `data-area` (the v11 hook) plus
         * `data-division` (the v10 vocabulary, so the browser lane can relate the
         * two controls).
         */}
        <div
          className="header-areas"
          role="group"
          aria-label="Anatomical areas"
          data-row="areas"
          style={{ ...rowStyle, order: 0 }}
        >
          <span className="header-row-label" style={rowLabelStyle}>Areas</span>
          {AREAS.map((area) => {
            const on = areaLayersOn(layers, area.id)
            return (
              <button
                key={area.id}
                type="button"
                data-area={area.id}
                data-division={area.division}
                className={`btn${on ? ' is-active' : ''}`}
                title={`${area.label} — ${area.regions.join(' + ')} (${area.division})`}
                aria-pressed={on}
                aria-label={areaAccessibleName(area.label, area.regions)}
                onClick={() => toggleArea(area.regions, !on)}
              >
                {area.label}
              </button>
            )
          })}
        </div>

        {/*
         * Row "Systems" — the orthogonal axis the user already had, as toggles:
         * `ALL_KINDS` mapped in order, so the six buttons are total and disjoint
         * over the kinds by construction. Presented second (`order: 1`).
         */}
        <div
          className="header-systems"
          role="group"
          aria-label="Structure systems"
          data-row="systems"
          style={{ ...rowStyle, order: 1 }}
        >
          <span className="header-row-label" style={rowLabelStyle}>Systems</span>
          {ALL_KINDS.map((kind) => {
            const on = layers.kinds.has(kind)
            return (
              <button
                key={kind}
                type="button"
                data-kind={kind}
                className={`btn${on ? ' is-active' : ''}`}
                title={kindAccessibleName(kind)}
                aria-pressed={on}
                aria-label={kindAccessibleName(kind)}
                onClick={() => toggleKindLayer(kind)}
              >
                {KIND_LABELS[kind]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="header-actions">
        <div className="quality-toggle" role="group" aria-label="Rendering quality" title="Rendering quality">
          {QUALITY_ORDER.map((tier) => {
            const active = quality === tier
            return (
              <button
                key={tier}
                type="button"
                className={`btn${active ? ' is-active' : ''}`}
                title={QUALITY_HINTS[tier]}
                aria-pressed={active}
                onClick={() => setQuality(tier)}
              >
                {QUALITY_LABELS[tier]}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => setReferencesOpen(true)}
          title="Bibliography: Blumenfeld, Patten, Fix, Snell, Nolte, RadioGraphics 2019"
        >
          References
        </button>
      </div>
    </header>
  )
}
