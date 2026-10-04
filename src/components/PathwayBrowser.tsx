import { useState } from 'react'
import pathwayData from '../data/pathways.json'
import { getStructure } from '../data/load'
import { useAtlasStore } from '../state/store'
import type { FunctionalPathway } from '../types'

export const functionalPathways = pathwayData as FunctionalPathway[]

export default function PathwayBrowser() {
  const [category, setCategory] = useState('All')
  const [openId, setOpenId] = useState('path-cst')
  const select = useAtlasStore(s => s.selectStructure)
  const selected = useAtlasStore(s => s.selectedId)
  const tabs = useAtlasStore(s => s.setActiveTab)
  const categories = ['All', ...new Set(functionalPathways.map(p => p.category))]
  const visible = functionalPathways.filter(p => category === 'All' || p.category === category)
  return (
    <section className="knowledge-browser" aria-label="Functional pathways">
      <h2>Functional pathways</h2>
      <p className="hint">Follow major relays and crossings. Select a linked structure to read its anatomy and clinical context in the details panel.</p>
      <p className="knowledge-caveat">Routes summarize connections, including parallel and reciprocal branches. They are teaching diagrams, not measured fibre trajectories or complete wiring maps.</p>
      <div className="knowledge-filters" role="group" aria-label="Pathway categories">
        {categories.map(c => <button type="button" key={c} className={`btn${category === c ? ' is-active' : ''}`} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
      </div>
      {visible.map(path => (
        <article key={path.id} className="knowledge-card">
          <button type="button" className="knowledge-card-heading" aria-expanded={openId === path.id} aria-controls={`route-${path.id}`} onClick={() => setOpenId(openId === path.id ? '' : path.id)}>
            <span aria-hidden="true">{openId === path.id ? '▾' : '▸'}</span> {path.name}
            <span className="chip">{path.category}</span>
          </button>
          {openId === path.id && <div id={`route-${path.id}`} className="knowledge-card-body">
            <p>{path.summary}</p>
            <p className="knowledge-caveat">{path.organization}</p>
            <ol className="pathway-steps">
              {path.steps.map((step, index) => <li key={`${index}-${step.label}`}>
                {step.structureId && getStructure(step.structureId) ?
                  <button type="button" className={`chip${selected === step.structureId ? ' is-active' : ''}`} onClick={() => select(step.structureId!, { tab: null })}>{step.label}</button> : <strong>{step.label}</strong>}
                {step.note && <p className="hint">{step.note}</p>}
              </li>)}
            </ol>
            <h3>Clinical context</h3><p>{path.clinical}</p>
            <details><summary>Sources</summary><ul className="ref-list">{path.refs.map(ref => <li key={ref}>{ref}</li>)}</ul></details>
            {selected && <button type="button" className="btn" onClick={() => tabs('3d')}>View selected structure in 3D</button>}
          </div>}
        </article>
      ))}
    </section>
  )
}
