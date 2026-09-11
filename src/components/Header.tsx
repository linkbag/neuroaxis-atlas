/**
 * Header — product title, view presets (plan §1.1 feature 2), rendering
 * quality toggle (realism plan §1 Layer 3 post-fx task), references button
 * (plan §1.1 feature 12). Rendered as the `.app-header` grid area; the
 * integration task places it inside `.app-shell`.
 */

import { useAtlasStore, viewPresetOf, VIEW_PRESETS, type RenderQuality, type ViewPreset } from '../state/store'

/**
 * Preset button order. v1–v6 presets first (their behaviour is unchanged), then
 * the four v7 telencephalon-aware presets of docs/TELENCEPHALON_PLAN.md §5 —
 * whose FIRST entry, Brainstem focus, is also the default layer state a fresh
 * visitor boots into (state/store.ts DEFAULT_LAYERS).
 */
const PRESET_ORDER: ViewPreset[] = [
  'brainstem-focus',
  'deep-structures',
  'whole-brain',
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

export default function Header() {
  const layers = useAtlasStore((s) => s.layers)
  const applyViewPreset = useAtlasStore((s) => s.applyViewPreset)
  const setReferencesOpen = useAtlasStore((s) => s.setReferencesOpen)
  const quality = useAtlasStore((s) => s.quality)
  const setQuality = useAtlasStore((s) => s.setQuality)
  const activePreset = viewPresetOf(layers)

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="app-title">NeuroAxis</h1>
        <span className="app-subtitle">3D Brainstem Atlas — diencephalon · midbrain · rhombencephalon · telencephalon</span>
      </div>

      <div className="header-presets" role="group" aria-label="View presets">
        {PRESET_ORDER.map((preset) => {
          const def = VIEW_PRESETS[preset]
          const active = activePreset === preset
          return (
            <button
              key={preset}
              type="button"
              className={`btn${active ? ' is-active' : ''}`}
              title={def.hint}
              aria-pressed={active}
              onClick={() => applyViewPreset(preset)}
            >
              {def.label}
            </button>
          )
        })}
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
