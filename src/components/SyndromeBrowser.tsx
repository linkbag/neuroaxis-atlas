/**
 * SyndromeBrowser — plan §1.1 feature 10. Cards for the clinical syndromes;
 * opening a card sets the store's syndromeId so the 3D scene and plates dim
 * everything except the involved structures. Structure chips inside a card
 * select that structure while keeping the highlight active.
 */

import { getStructure, getTaxonomyEntry, isTractRecord, syndromes } from '../data/load'
import { useAtlasStore } from '../state/store'
import { KindGlyph } from './KindGlyph'

function StructureChip({ id }: { id: string }) {
  const selectStructure = useAtlasStore((s) => s.selectStructure)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const entry = getTaxonomyEntry(id)
  const record = getStructure(id)
  const label = entry?.name ?? record?.name ?? id
  return (
    <button
      type="button"
      className="chip"
      title={record ? (isTractRecord(record) ? `Tract: ${record.name}` : record.function) : `${label} (record pending)`}
      onClick={() => selectStructure(id, { tab: null, keepSyndrome: true })}
      onPointerEnter={() => setHovered(id)}
      onPointerLeave={() => setHovered(null)}
    >
      <KindGlyph kind={entry?.kind ?? 'context'} color={entry?.color} title={entry?.kind} />
      {label}
    </button>
  )
}

export default function SyndromeBrowser() {
  const syndromeId = useAtlasStore((s) => s.syndromeId)
  const openSyndrome = useAtlasStore((s) => s.openSyndrome)

  if (syndromes.length === 0) {
    return (
      <section className="syndrome-browser">
        <p className="empty-note">
          No syndrome records have landed yet — cards appear here as src/data/syndromes/*.json files are authored.
        </p>
      </section>
    )
  }

  return (
    <section className="syndrome-browser" aria-label="Clinical syndromes">
      <div className="syndrome-head">
        <h2 className="panel-title">Clinical syndromes — {syndromes.length} cards</h2>
        <p className="hint">
          Open a card to highlight the structures it involves in the 3D scene and on the plates; click a
          structure chip to read its full record.
        </p>
      </div>

      {syndromes.map((syndrome) => {
        const isOpen = syndromeId === syndrome.id
        return (
          <article key={syndrome.id} className={`syndrome-card${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="syndrome-card-header"
              aria-expanded={isOpen}
              onClick={() => openSyndrome(isOpen ? null : syndrome.id)}
            >
              <span className="chevron" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
              <span className="syndrome-name">{syndrome.name}</span>
              {syndrome.eponym && <span className="chip">{syndrome.eponym} syndrome</span>}
              <span className="tree-count">{syndrome.structures.length} structures</span>
            </button>

            {isOpen && (
              <div className="syndrome-body">
                <p className="syndrome-note">
                  Highlighting {syndrome.structures.length} structures in 3D and on the plates — all other
                  structures are dimmed until you close this card.
                </p>
                <section className="info-section">
                  <h3>Presentation</h3>
                  <p>{syndrome.presentation}</p>
                </section>
                <section className="info-section">
                  <h3>Cause</h3>
                  <p>{syndrome.cause}</p>
                </section>
                {syndrome.vascularTerritory && (
                  <section className="info-section">
                    <h3>Vascular territory</h3>
                    <p className="clin-vascular">{syndrome.vascularTerritory}</p>
                  </section>
                )}
                <section className="info-section">
                  <h3>Involved structures</h3>
                  <div className="chip-row">
                    {syndrome.structures.map((id) => (
                      <StructureChip key={id} id={id} />
                    ))}
                  </div>
                </section>
                {syndrome.refs && syndrome.refs.length > 0 && (
                  <section className="info-section">
                    <h3>References</h3>
                    <ol className="ref-list">
                      {syndrome.refs.map((ref, index) => (
                        <li key={index}>{ref}</li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}
