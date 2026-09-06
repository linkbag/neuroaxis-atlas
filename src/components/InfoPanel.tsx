/**
 * InfoPanel — plan §1.1 feature 8 (+9 for tracts). Shows the selected
 * record: overview chips, neurophysiological function, connections,
 * clinical items with vascular tags, blood supply, level chips (click →
 * plate + clipped 3D plane), derived "involved in syndromes" list, and
 * references. Tracts additionally show direction/modality/origin→target/
 * decussation/somatotopy. The empty state is real help, not filler.
 * On phones (≤640px) the panel becomes a bottom sheet (styles in layout.css).
 */

import { useState } from 'react'
import {
  dataStatus,
  getPlate,
  getStructure,
  getSyndrome,
  getTaxonomyEntry,
  isTractRecord,
  REGION_LABELS,
  shortLevelName,
  syndromesForStructure,
  levels as allLevels,
  platesForLevel,
  type AtlasRecord,
} from '../data/load'
import { useAtlasStore } from '../state/store'
import { DIRECTION_GLYPH, KindGlyph } from './KindGlyph'
import type { StructureRecord, TaxonomyEntry, TractRecord } from '../types'

function MetaChips({ record, entry }: { record?: AtlasRecord; entry?: TaxonomyEntry }) {
  const region = record && 'region' in record ? record.region : entry?.region
  const subdivision = record && 'subdivision' in record ? record.subdivision : entry?.subdivision
  const kind = record && 'kind' in record ? record.kind : entry?.kind
  const laterality = record && 'laterality' in record ? record.laterality : entry?.laterality
  return (
    <div className="info-chips">
      {region && <span className="chip">{REGION_LABELS[region]}</span>}
      {subdivision && <span className="chip">{subdivision}</span>}
      {kind && (
        <span className="chip">
          <KindGlyph kind={kind} title={kind} /> {kind}
        </span>
      )}
      {laterality && <span className="chip">{laterality}</span>}
      {!record && <span className="chip chip--pending">registry entry</span>}
    </div>
  )
}

function LevelChips({ record }: { record: AtlasRecord }) {
  const gotoLevel = useAtlasStore((s) => s.gotoLevel)
  const levelIds = record.levels ?? []
  if (levelIds.length === 0) return null
  const known = levelIds
    .map((id) => allLevels.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
  if (known.length === 0) return null
  return (
    <section className="info-section">
      <h3>Levels (click to open plate + cut plane)</h3>
      <div className="chip-row">
        {known.map((level) => (
          <button
            key={level.id}
            type="button"
            className="chip"
            title={`${level.name} — y = ${level.y} au${platesForLevel(level.id).length > 0 ? '' : ' (no plate yet)'}`}
            onClick={() => gotoLevel(level.id)}
          >
            {shortLevelName(level.name)} <span className="mono">y={level.y}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function SyndromeLinks({ recordId }: { recordId: string }) {
  const openSyndrome = useAtlasStore((s) => s.openSyndrome)
  const list = syndromesForStructure(recordId)
  if (list.length === 0) return null
  return (
    <section className="info-section">
      <h3>Involved in syndromes</h3>
      <div className="chip-row">
        {list.map((syndrome) => (
          <button
            key={syndrome.id}
            type="button"
            className="chip"
            title={syndrome.presentation}
            onClick={() => openSyndrome(syndrome.id)}
          >
            {syndrome.name}
          </button>
        ))}
      </div>
    </section>
  )
}

function ClinicalList({ items }: { items: StructureRecord['clinical'] }) {
  if (!items || items.length === 0) return null
  return (
    <section className="info-section">
      <h3>Clinical significance</h3>
      {items.map((item, index) => (
        <article key={index} className="clin-item">
          <h4>{item.syndrome}</h4>
          <p>{item.findings}</p>
          {item.vascular && <p className="clin-vascular">Vascular: {item.vascular}</p>}
          {item.note && <p className="clin-note">{item.note}</p>}
        </article>
      ))}
    </section>
  )
}

function RefList({ refs }: { refs?: string[] }) {
  if (!refs || refs.length === 0) return null
  return (
    <section className="info-section">
      <h3>References</h3>
      <ol className="ref-list">
        {refs.map((ref, index) => (
          <li key={index}>{ref}</li>
        ))}
      </ol>
    </section>
  )
}

function StructureDetails({ record }: { record: StructureRecord }) {
  const connections = record.connections
  return (
    <>
      <section className="info-section">
        <h3>Function (neurophysiology)</h3>
        <p>{record.function}</p>
      </section>

      {connections && ((connections.afferent?.length ?? 0) > 0 || (connections.efferent?.length ?? 0) > 0) && (
        <section className="info-section">
          <h3>Connections</h3>
          {connections.afferent && connections.afferent.length > 0 && (
            <>
              <p className="hint">Afferent</p>
              <ul className="conn-list">
                {connections.afferent.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {connections.efferent && connections.efferent.length > 0 && (
            <>
              <p className="hint">Efferent</p>
              <ul className="conn-list">
                {connections.efferent.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <ClinicalList items={record.clinical} />

      {record.bloodSupply && (
        <section className="info-section">
          <h3>Blood supply</h3>
          <p>{record.bloodSupply}</p>
        </section>
      )}

      <LevelChips record={record} />
      <SyndromeLinks recordId={record.id} />

      {record.contextNote && (
        <section className="info-section">
          <h3>Context note</h3>
          <p>{record.contextNote}</p>
        </section>
      )}

      <RefList refs={record.refs} />
    </>
  )
}

function TractDetails({ record }: { record: TractRecord }) {
  const directionToken =
    record.direction === 'ascending'
      ? 'var(--kind-ascending)'
      : record.direction === 'descending'
        ? 'var(--kind-descending)'
        : 'var(--kind-mixed)'
  return (
    <>
      <div className="chip-row">
        <span className="direction-pill" style={{ color: directionToken }}>
          {DIRECTION_GLYPH[record.direction]} {record.direction}
        </span>
      </div>

      <section className="info-section">
        <h3>Path</h3>
        <dl className="tract-fact">
          <dt>Modality</dt>
          <dd>{record.modality}</dd>
          <dt>Origin</dt>
          <dd>{record.origin}</dd>
          <dt>Target</dt>
          <dd>{record.target}</dd>
          <dt>Decussation</dt>
          <dd>{record.decussation}</dd>
          {record.somatotopy && (
            <>
              <dt>Somatotopy</dt>
              <dd>{record.somatotopy}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="info-section">
        <h3>Function (neurophysiology)</h3>
        <p>{record.function}</p>
      </section>

      <ClinicalList items={record.clinical} />
      <LevelChips record={record} />
      <SyndromeLinks recordId={record.id} />
      <RefList refs={record.refs} />
    </>
  )
}

function EmptyState() {
  return (
    <div className="info-help">
      <h2>Nothing selected</h2>
      <p>
        Click any nucleus or tract — in the 3D viewer, the taxonomy tree, a search result, or
        directly on a 2D plate — and its full record appears here: function, connections, blood
        supply, clinical syndromes, and references.
      </p>
      <ul>
        <li><strong>Search</strong> — type a name or abbreviation (“STN”, “MLF”, “pulvinar”).</li>
        <li><strong>Taxonomy tree</strong> — browse region → subdivision → structure.</li>
        <li><strong>Level ruler</strong> — jump to a cross-section level; the 3D clip plane follows.</li>
        <li><strong>Plates tab</strong> — interactive 2D sections synced with the 3D plane.</li>
        <li><strong>Syndromes tab</strong> — clinical cards that highlight the structures they involve.</li>
      </ul>
      <p className="muted">
        Loaded: {dataStatus.structures} structure records · {dataStatus.tracts} tracts ·{' '}
        {dataStatus.syndromes} syndromes · {dataStatus.plates} plates · {dataStatus.registry} registry
        entries. Groups still being authored light up automatically as their data files land.
      </p>
    </div>
  )
}

export default function InfoPanel() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const selectedId = useAtlasStore((s) => s.selectedId)
  const record = selectedId !== null ? getStructure(selectedId) : undefined
  const entry = selectedId !== null ? getTaxonomyEntry(selectedId) : undefined
  const name = record?.name ?? entry?.name ?? selectedId ?? ''
  const color = record?.color ?? entry?.color
  const syndrome = useAtlasStore((s) => s.syndromeId)
  const activeSyndrome = syndrome !== null ? getSyndrome(syndrome) : undefined
  const openPlate = useAtlasStore((s) => s.plateId)
  const plate = getPlate(openPlate)

  return (
    <aside className={`info-panel ${sheetOpen ? 'is-open' : 'is-collapsed'}`}>
      <div className="info-panel-bar">
        <h2 className="panel-title">Selection details</h2>
        <button
          type="button"
          className="sheet-toggle"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen((open) => !open)}
        >
          <span className="chevron" aria-hidden="true">{sheetOpen ? '▾' : '▴'}</span>
          <span className="sheet-toggle-label">{selectedId === null ? 'Info' : name}</span>
        </button>
      </div>

      <div className="info-scroll">
        {selectedId === null ? (
          <EmptyState />
        ) : (
          <>
            <div className="info-head">
              <div className="info-name-row">
                <span className="info-dot" style={{ background: color ?? 'var(--text-muted)' }} aria-hidden="true" />
                <h2 className="info-name">{name}</h2>
              </div>
              {entry?.synonyms && entry.synonyms.length > 0 && (
                <p className="info-synonyms">Also: {entry.synonyms.join(' · ')}</p>
              )}
              <MetaChips record={record} entry={entry} />
            </div>

            {activeSyndrome && (
              <p className="syndrome-note">
                Syndrome highlight active: <strong>{activeSyndrome.name}</strong> — involved structures are
                lit in 3D and on plate {plate ? `“${plate.title}”` : ''}; everything else is dimmed.
              </p>
            )}

            {record === undefined && (
              <p className="pending-note">
                Registry entry only — the authored record for this id has not landed yet. It is already
                selectable everywhere; its function, connections, and clinical details appear as soon as the
                data task delivers it.
              </p>
            )}

            {record !== undefined && (isTractRecord(record)
              ? <TractDetails record={record} />
              : <StructureDetails record={record} />)}
          </>
        )}
      </div>
    </aside>
  )
}
