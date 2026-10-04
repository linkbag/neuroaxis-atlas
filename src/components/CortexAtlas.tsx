import { useState } from 'react'
import { structures } from '../data/load'
import { useAtlasStore } from '../state/store'

const subdivisions = new Set(['Cerebral cortex', 'Cortical gyri and lobules', 'Functional cortical areas', 'Cortical somatotopy'])
const corticalRecords = structures.filter(r => r.region === 'telencephalon' && subdivisions.has(r.subdivision))

export default function CortexAtlas() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')
  const selected = useAtlasStore(s => s.selectedId)
  const select = useAtlasStore(s => s.selectStructure)
  const categories = ['All', ...new Set(corticalRecords.map(r => r.subdivision))]
  const visible = corticalRecords.filter(r => (group === 'All' || r.subdivision === group) && `${r.name} ${(r.synonyms ?? []).join(' ')} ${r.function}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="knowledge-browser" aria-label="Cortical region atlas">
    <h2>Cortical region atlas</h2>
    <p className="hint">Browse lobes, gyri, functional areas and broad sensorimotor representations. Select a region for functions, connections, clinical context and sources.</p>
    <p className="knowledge-caveat">Anatomical gyri, cytoarchitectonic areas and functional networks are different classifications. Their borders vary. This atlas does not provide a registered Brodmann or surface parcellation; host surfaces and homunculus anchors are schematic.</p>
    <label className="knowledge-search">Find a cortical region<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. angular, premotor, visual" /></label>
    <div className="knowledge-filters" role="group" aria-label="Cortical classifications">{categories.map(c => <button type="button" key={c} className={`btn${group === c ? ' is-active' : ''}`} aria-pressed={group === c} onClick={() => setGroup(c)}>{c}</button>)}</div>
    <p className="hint">{visible.length} regions</p>
    <div className="cortex-grid">{visible.map(record => <article key={record.id} className={`knowledge-card${selected === record.id ? ' is-selected' : ''}`}>
      <button type="button" className="knowledge-card-heading" onClick={() => select(record.id, { tab: null })} aria-pressed={selected === record.id}>{record.name}</button>
      <div className="knowledge-card-body"><span className="chip">{record.subdivision}</span><p>{record.function}</p><p className="hint">{record.meshes === false ? 'No independently validated 3D boundary.' : 'Teaching region; displayed geometry is schematic.'}</p></div>
    </article>)}</div>
    {visible.length === 0 && <p>No matching cortical regions.</p>}
  </section>
}
