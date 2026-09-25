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
  AREAS,
  areaLayersOn,
  SYSTEM_REGION_BUTTONS,
  useAtlasStore,
  viewPresetOf,
  VIEW_PRESETS,
  type RenderQuality,
} from '../state/store'

/*
 * v12 — the preset shortcut row is GONE (the user's ask: it overlapped the Areas
 * and Systems rows). Two things it carried are kept, because they are not
 * duplicated anywhere else:
 *   • `clinical-motor` survives as a category button in the Systems row — it is
 *     the one framing that is not expressible as a single area or kind, so it
 *     stays reachable and still comes from `VIEW_PRESETS` (no second definition);
 *   • the default framing is still reachable at boot, and the All on / All off
 *     module replaced the old Reset / All pair.
 * `VIEW_PRESETS` and `viewPresetOf` therefore stay imported and authoritative.
 */

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
  // v13 (PLAN.md §2 item 4, §6): the twelve cranial nerves. The label is the
  // Systems-row button's visible text, so it must stay a PREFIX of the accessible
  // name `kindAccessibleName` builds below ("Cranial nerves — show/hide the nerve
  // system (nerve)") for WCAG 2.5.3, exactly like the six labels above it.
  nerve: 'Cranial nerves',
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

  /**
   * v19 — ONE button for the arterial system. The Systems row used to list both
   * "Vessels" (the `vessel` KIND toggle) and "Vasculature" (the `vasculature`
   * REGION toggle) — two controls for one system, verified to address exactly the
   * same 53 records in both directions (the kind set and the region set are
   * identical), so the user saw redundancy and the two toggles could disagree.
   * "Vasculature" (the system name) stays and now carries BOTH layers: one
   * button, one coherent state, read identically by the 3D scene, the live
   * section, the PiP and the tree's dimming rule.
   */
  const toggleVasculature = (on: boolean): void => {
    toggleArea(['vasculature'], on)
    // Asymmetric on purpose. Turning the system ON also puts its KIND layer on,
    // so the arterial system stays reachable after a preset (e.g. Clinical
    // motor) left the `vessel` kind off. Turning it OFF deliberately leaves the
    // kind axis alone: the default framing's own state is "vascular region off,
    // vessel kind ON" (DEFAULT_LAYERS), and the composition contract
    // (areas-all-on + systems-all-on + vascular-off == DEFAULT_LAYERS) must keep
    // reproducing it exactly — a symmetric toggle would silently break that.
    if (on && !layers.kinds.has('vessel')) toggleKindLayer('vessel')
  }

  /**
   * v12d — ONE helper for the two All modules: set exactly the given layer slice
   * to `on`, through the same per-region/per-kind toggles the two rows use. Both
   * modules are thin wrappers over it, so neither can invent a layer state the
   * rows could not have produced themselves (and the empty slice is `[]`, i.e.
   * "this module does not touch that axis").
   */
  const setSlice = (regions: readonly Region[], kinds: readonly Kind[], on: boolean): void => {
    for (const region of regions) {
      if (layers.regions.has(region) !== on) toggleRegionLayer(region)
    }
    for (const kind of kinds) {
      if (layers.kinds.has(kind) !== on) toggleKindLayer(kind)
    }
  }

  /** Every region the Areas row owns (the areas' own regions, nothing else). */
  const areaRegions = AREAS.flatMap((area) => [...area.regions])
  /** Every layer the Systems row owns: its region-backed buttons plus ALL_KINDS. */
  const systemRegions = SYSTEM_REGION_BUTTONS.map((entry) => entry.id)

  /** All areas on / all areas off — the Areas module's two pressed readings. */
  const allAreasOn = areaRegions.length > 0 && areaRegions.every((region) => layers.regions.has(region))
  const allAreasOff = areaRegions.every((region) => !layers.regions.has(region))
  /** All systems on / all systems off — the Systems module's two readings. */
  const allSystemsOn =
    systemRegions.every((region) => layers.regions.has(region)) && ALL_KINDS.every((kind) => layers.kinds.has(kind))
  const allSystemsOff =
    systemRegions.every((region) => !layers.regions.has(region)) && ALL_KINDS.every((kind) => !layers.kinds.has(kind))

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="app-title">NeuroAxis</h1>
        <span className="app-subtitle">3D Brainstem Atlas — diencephalon · midbrain · rhombencephalon · telencephalon</span>
      </div>

      {/*
       * v12b — the rows flow in ONE wrapping flex line instead of a column.
       * v19 (audit ux-033) — the comment used to claim the grouping is enforced
       * by layout ("the Areas row is given `flexBasis: 100%` … the module pushed
       * to the right (`marginLeft: 'auto'`)"). It is not, and measuring the
       * shipped styles shows `flexBasis` and `marginLeft` appear nowhere in this
       * file: the four children carry `order` 0/1/2/3 and wrap by content width,
       * so which controls share a line is a function of the viewport, not of the
       * code. What actually says which axis a module acts on is the module's own
       * accessible name (`aria-label="Show or hide all areas"`) plus its
       * `data-header-action` / `data-row` hooks. Enforcing the line grouping is a
       * layout change that only a browser can verify, so it is left as the
       * measured state rather than claimed.
       */}
      <div
        className="header-rows"
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 4, minWidth: 0, flex: 1 }}
      >
        {/*
         * v12e — TWO All modules, one per axis, each on ITS OWN group's line:
         * the Areas module shares the Areas row's line (order 1) and the Systems
         * module shares the Systems row's line (order 3).
         * v19 (audit ux-002, WCAG 2.5.3 Label in Name) — the accessible name now
         * BEGINS with the visible text: the button reads "All on" and is named
         * "All on — every area", so `name.includes("All on")` holds and a
         * speech-input user saying the words on the button activates it. The old
         * names ("All areas on — show every area") failed that test — the defect
         * this file carried from v12e and that `verify:area-toggles` pinned.
         * The axis still lives in the name's tail and in the data hook
         * (areas-all-on/off, systems-all-on/off), because two buttons both
         * reading "All on" would be ambiguous for a screen reader.
         */}
        <div
          className="header-all-module"
          role="group"
          aria-label="Show or hide all areas"
          data-row="all-areas"
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            order: 1,
            padding: '3px 6px',
            border: '1px solid var(--border, rgba(148, 163, 184, 0.35))',
            borderRadius: 8,
          }}
        >
          <button
            type="button"
            data-header-action="areas-all-on"
            className={`btn${allAreasOn ? ' is-active' : ''}`}
            aria-pressed={allAreasOn}
            aria-label="All on — every area"
            title="All on — display every area of the neuraxis. Switches the AREA layers only: the v7 structure-level framing set (cerebral cortex, telencephalic white matter, lateral ventricles) is a separate axis — the Clinical motor button is what changes it."
            onClick={() => setSlice(areaRegions, [], true)}
          >
            All on
          </button>
          <button
            type="button"
            data-header-action="areas-all-off"
            className={`btn${allAreasOff ? ' is-active' : ''}`}
            aria-pressed={allAreasOff}
            aria-label="All off — every area"
            title="All off — remove every area from the 3D and section views"
            onClick={() => setSlice(areaRegions, [], false)}
          >
            All off
          </button>
        </div>
        <div
          className="header-all-module"
          role="group"
          aria-label="Show or hide all systems"
          data-row="all-systems"
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            order: 3,
            padding: '3px 6px',
            border: '1px solid var(--border, rgba(148, 163, 184, 0.35))',
            borderRadius: 8,
          }}
        >
          <button
            type="button"
            data-header-action="systems-all-on"
            className={`btn${allSystemsOn ? ' is-active' : ''}`}
            aria-pressed={allSystemsOn}
            aria-label="All on — every system"
            title="All on — display every structure system. Switches the SYSTEM layers (kinds + the region-backed Vasculature button) only: the v7 structure-level framing set is a separate axis — the Clinical motor button is what changes it."
            onClick={() => setSlice(systemRegions, ALL_KINDS, true)}
          >
            All on
          </button>
          <button
            type="button"
            data-header-action="systems-all-off"
            className={`btn${allSystemsOff ? ' is-active' : ''}`}
            aria-pressed={allSystemsOff}
            aria-label="All off — every system"
            title="All off — remove every structure system"
            onClick={() => setSlice(systemRegions, ALL_KINDS, false)}
          >
            All off
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
         * `ALL_KINDS` mapped in order, so the buttons are total and disjoint over
         * the kinds by construction, with ONE deliberate omission: `vessel` has no
         * button of its own, because the region-backed "Vasculature" button below
         * covers exactly the same records (the kind `vessel` and region
         * `vasculature` sets are the same 53 rows, verified both ways) and
         * carries both layers — one system, one button, so the row cannot show
         * two controls for one system. `nerve` (v13) needs no special case here —
         * the map emits its `data-kind`, label and `aria-pressed` like every other
         * kind. Presented second (`order: 2`).
         */}
        <div
          className="header-systems"
          role="group"
          aria-label="Structure systems"
          data-row="systems"
          style={{ ...rowStyle, order: 2 }}
        >
          <span className="header-row-label" style={rowLabelStyle}>Systems</span>
          {ALL_KINDS.filter((kind) => kind !== 'vessel').map((kind) => {
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
          {/*
           * v12 — the region-backed system buttons. Today that is just the arterial
           * system, moved here from the Areas row at the user's request and labelled
           * "Vasculature": it is a system of vessels rather than a division of the
           * neuraxis, and the store derives this list as the complement of AREAS so
           * the two rows cannot both claim a region or leave one unreachable.
           */}
          {SYSTEM_REGION_BUTTONS.map((entry) => {
            // v19 — the vascular button carries BOTH layers (see toggleVasculature),
            // so it reads ON only when both are: a preset that leaves the `vessel`
            // kind off must not render this button lit while nothing draws.
            const on = entry.id === 'vasculature'
              ? layers.regions.has('vasculature') && layers.kinds.has('vessel')
              : layers.regions.has(entry.id)
            return (
              <button
                key={entry.id}
                type="button"
                data-region={entry.id}
                data-system-region={entry.id}
                className={`btn${on ? ' is-active' : ''}`}
                title={`${entry.label} — show/hide the ${entry.id} system (a system, not a division of the neuraxis)`}
                aria-pressed={on}
                aria-label={`${entry.label} — show/hide the ${entry.id} system`}
                onClick={() => (entry.id === 'vasculature' ? toggleVasculature(!on) : toggleArea([entry.id], !on))}
              >
                {entry.label}
              </button>
            )
          })}
          {/*
           * v12 — Clinical motor, the one framing that is not a single area or
           * kind, kept as a category in this row (the user asked for exactly this
           * one to survive the preset row's removal). It is still the store's own
           * `clinical-motor` preset — no second definition — and switching it off
           * returns to the all-on framing rather than to an undefined state.
           */}
          <button
            type="button"
            data-header-action="clinical-motor"
            className={`btn${activePreset === 'clinical-motor' ? ' is-active' : ''}`}
            aria-pressed={activePreset === 'clinical-motor'}
            aria-label="Clinical motor — brainstem motor nuclei and the descending motor pathways"
            title={VIEW_PRESETS['clinical-motor'].hint}
            onClick={() => applyViewPreset(activePreset === 'clinical-motor' ? 'all' : 'clinical-motor')}
          >
            Clinical motor
          </button>
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
