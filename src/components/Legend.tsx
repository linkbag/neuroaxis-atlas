/**
 * Legend — the §6 palette conventions (kind colors; structure colors from
 * the taxonomy win at runtime) plus quick layer toggles that mirror the
 * store's region/kind layer sets used by the 3D scene, tree, and plates.
 */

import type { Kind, Region } from '../types'
import { ALL_KINDS, ALL_REGIONS, dataStatus } from '../data/load'
import { useAtlasStore } from '../state/store'

const KIND_SWATCHES: { label: string; token: string }[] = [
  { label: 'Nuclei', token: 'var(--kind-nucleus)' },
  { label: 'Cranial-nerve nuclei', token: 'var(--kind-cn-nucleus)' },
  { label: 'Ascending tracts', token: 'var(--kind-ascending)' },
  { label: 'Descending tracts', token: 'var(--kind-descending)' },
  { label: 'Mixed tracts', token: 'var(--kind-mixed)' },
  { label: 'Ventricles / CSF', token: 'var(--kind-ventricle)' },
  { label: 'Surface landmarks', token: 'var(--kind-surface)' },
  { label: 'Context envelopes', token: 'var(--kind-context)' },
]

export default function Legend() {
  const layers = useAtlasStore((s) => s.layers)
  const toggleKindLayer = useAtlasStore((s) => s.toggleKindLayer)
  const toggleRegionLayer = useAtlasStore((s) => s.toggleRegionLayer)

  return (
    <div className="legend">
      <div className="legend-group">
        <p className="panel-title">Palette (kind / direction)</p>
        {KIND_SWATCHES.map((swatch) => (
          <span key={swatch.label} className="legend-row" title={`Palette convention — ${swatch.label}`}>
            <span className="legend-swatch" style={{ background: swatch.token }} aria-hidden="true" />
            <span>{swatch.label}</span>
          </span>
        ))}
      </div>

      <div className="legend-group">
        <p className="panel-title">Layer toggles</p>
        {ALL_KINDS.map((kind: Kind) => (
          <label key={kind} className={`legend-row legend-toggle${layers.kinds.has(kind) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={layers.kinds.has(kind)} onChange={() => toggleKindLayer(kind)} />
            <span>{kind}</span>
          </label>
        ))}
        {ALL_REGIONS.map((region: Region) => (
          <label key={region} className={`legend-row legend-toggle${layers.regions.has(region) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={layers.regions.has(region)} onChange={() => toggleRegionLayer(region)} />
            <span>{region}</span>
          </label>
        ))}
      </div>

      <p className="legend-note">
        Individual structure colors come from the taxonomy and win over these defaults.
        {' '}{dataStatus.registry} registry entries indexed.
      </p>
    </div>
  )
}
