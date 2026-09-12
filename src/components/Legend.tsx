/**
 * Legend — the §6 palette conventions (kind colors; structure colors from
 * the taxonomy win at runtime) plus quick layer toggles that mirror the
 * store's region/kind layer sets used by the 3D scene, tree, and plates.
 *
 * v10 §2 adds the DIVISION control at the top of that toggle group: the
 * reference figure's four-way grouping (Prosencephalon / Mesencephalon /
 * Rhombencephalon / Cerebral vasculature) with an on-off checkbox and a SOLO
 * action per division. It lives here rather than in the header because the
 * header is preset-driven and outside this task's write scope — and because the
 * Legend is already the panel that says what is on screen.
 *
 * Both controls resolve to the SAME store field the per-region checkboxes use
 * (`layers.regions`), so 3D, the plates and the taxonomy tree follow a solo
 * through the rule they already implement (`layerOff()` dims a row whose region
 * is off) with no new state anywhere.
 */

import type { Kind, Region } from '../types'
import { ALL_KINDS, ALL_REGIONS, dataStatus } from '../data/load'
import { DIVISIONS, useAtlasStore } from '../state/store'
// v11 §1 — the header's "Areas" row, read here only to NAME the finer rows this
// division resolves to. This second import statement is deliberate: the line above
// is matched by an exact-string mutation anchor in `verify:division-toggles`
// (its behaviour probe rewrites exactly that text in an isolated copy), so it must
// stay byte-identical. No state, no new field: the areas are a labelling of the
// same seven regions, and every control below still writes `layers.regions` alone.
import { AREAS as HEADER_AREAS, type AreaDefinition } from '../state/store'

const KIND_SWATCHES: { label: string; token: string }[] = [
  { label: 'Nuclei', token: 'var(--kind-nucleus)' },
  { label: 'Cranial-nerve nuclei', token: 'var(--kind-cn-nucleus)' },
  { label: 'Ascending tracts', token: 'var(--kind-ascending)' },
  { label: 'Descending tracts', token: 'var(--kind-descending)' },
  { label: 'Mixed tracts', token: 'var(--kind-mixed)' },
  { label: 'Ventricles / CSF', token: 'var(--kind-ventricle)' },
  { label: 'Surface landmarks', token: 'var(--kind-surface)' },
  { label: 'Context envelopes', token: 'var(--kind-context)' },
  // v8 (docs/NEUROATLAS_V8_PLAN.md §2): the arterial family. Each vessel record
  // carries its own crimson shade (trunks and midline links #b91c1c, distal
  // cortical/cerebellar branches #dc2626, deep perforators and the vertebral
  // artery #991b1b); this swatch is the family's base tone.
  { label: 'Cerebral arteries', token: 'var(--kind-vessel)' },
]

/** "telencephalon + diencephalon" — the regions a division actually switches. */
function regionList(regions: readonly Region[]): string {
  return regions.join(' + ')
}

/**
 * v11 §1 — the divisions' RELATIONSHIP to the header's Areas row, printed per
 * row so the two controls are legible as one partition at two granularities
 * (prosencephalon {telencephalon, diencephalon}; rhombencephalon {pons,
 * cerebellum, medulla} → metencephalon {pons, cerebellum} + myelencephalon
 * {medulla}). Pure text: no state, no second source of truth — every control in
 * this panel still reads and writes `layers.regions` alone.
 */
function areasOfDivision(regions: readonly Region[], areas: readonly AreaDefinition[]): string {
  return areas
    .filter((area) => area.regions.every((region) => regions.includes(region)))
    .map((area) => area.label)
    .join(' + ')
}

export default function Legend() {
  const layers = useAtlasStore((s) => s.layers)
  const toggleKindLayer = useAtlasStore((s) => s.toggleKindLayer)
  const toggleRegionLayer = useAtlasStore((s) => s.toggleRegionLayer)
  // v10 §2 — the two division paths. The checkbox reads "every region of the
  // division layer-on" and writes that decision through the store's own toggle
  // (all of it on when incomplete, all of it off when complete); solo writes
  // exactly the division's region set. Both are keyboard-reachable because they
  // are a real <input type="checkbox"> and a real <button>, and both carry the
  // accessible name AND the data-division hook the gate and the browser lane
  // address them by.
  const toggleDivision = useAtlasStore((s) => s.toggleDivision)
  const soloDivision = useAtlasStore((s) => s.soloDivision)

  /** A division reads as on only when ALL of its regions are layer-on. */
  const divisionOn = (regions: readonly Region[]): boolean =>
    regions.every((region) => layers.regions.has(region))

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

        {/*
         * v11 §1 — the same region sets, named twice on purpose. The header's
         * "Areas" row is this partition at the finer vesicle granularity
         * (prosencephalon → telencephalon + diencephalon; rhombencephalon →
         * metencephalon + myelencephalon), and this row is the v10 grouping the
         * audit and `verify:division-toggles` are written against. Both write
         * `layers.regions` and nothing else, so the two controls and the
         * per-region checkboxes below cannot disagree — a division here is
         * exactly the union of its areas in the header.
         */}
        <div className="legend-divisions" role="group" aria-label="Divisions">
          {DIVISIONS.map((division) => {
            const on = divisionOn(division.regions)
            return (
              <div key={division.id} className="legend-division" data-division={division.id}>
                <label
                  className={`legend-row legend-toggle${on ? ' is-on' : ''}`}
                  title={`${division.label} — ${regionList(division.regions)} · header areas: ${areasOfDivision(division.regions, HEADER_AREAS)}`}
                >
                  {/*
                   * The checkbox is a genuine region-set control, so it carries
                   * the checkbox role and a name that says what it does. A
                   * division that is only partly on reads as unticked rather
                   * than as a third click outcome: `checked` and the store are
                   * one fact (`divisionLayersOn`), never two.
                   */}
                  <input
                    type="checkbox"
                    data-division={division.id}
                    data-division-action="toggle"
                    aria-label={`Toggle the ${division.label} division (${regionList(division.regions)})`}
                    checked={on}
                    onChange={() => toggleDivision(division.id)}
                  />
                  <span>{division.label}</span>
                </label>
                <button
                  type="button"
                  className="legend-solo"
                  data-division={division.id}
                  data-division-action="solo"
                  // Solo is the point of v10 item 2: one action that leaves this
                  // division alone on screen, so the view stops being everything
                  // at once.
                  aria-label={`Show only the ${division.label} division (${regionList(division.regions)})`}
                  title={`Solo ${division.label} — switch every other region off`}
                  onClick={() => soloDivision(division.id)}
                >
                  Solo
                </button>
              </div>
            )
          })}
        </div>

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