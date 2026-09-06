/**
 * Header — product title, view presets (plan §1.1 feature 2), references
 * button (plan §1.1 feature 12). Rendered as the `.app-header` grid area;
 * the integration task places it inside `.app-shell`.
 */

import { useAtlasStore, viewPresetOf, VIEW_PRESETS, type ViewPreset } from '../state/store'

const PRESET_ORDER: ViewPreset[] = ['all', 'nuclei', 'tracts', 'clinical-motor']

export default function Header() {
  const layers = useAtlasStore((s) => s.layers)
  const applyViewPreset = useAtlasStore((s) => s.applyViewPreset)
  const setReferencesOpen = useAtlasStore((s) => s.setReferencesOpen)
  const activePreset = viewPresetOf(layers)

  return (
    <header className="app-header">
      <div className="brand">
        <h1 className="app-title">NeuroAxis</h1>
        <span className="app-subtitle">3D Brainstem Atlas — diencephalon · midbrain · rhombencephalon</span>
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
