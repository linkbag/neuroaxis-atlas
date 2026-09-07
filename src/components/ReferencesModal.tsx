/**
 * ReferencesModal — plan §1.1 feature 12: global bibliography. Combines a
 * fixed core textbook list (Blumenfeld editions, Patten, Fix, Snell, Nolte,
 * the RSNA RadioGraphics 2019 brainstem review with DOI link, and the
 * Duke/Neurotorium online references) with every refs entry authored in the
 * data files (deduplicated, alphabetical).
 */

import { useEffect } from 'react'
import { allReferences } from '../data/load'
import { useAtlasStore } from '../state/store'

interface CoreReference {
  title: string
  detail?: string
  url?: string
}

const CORE_REFERENCES: CoreReference[] = [
  {
    title: 'Blumenfeld — Neuroanatomy through Clinical Cases, 2nd ed. (Sinauer)',
    detail: 'Primary content authority; records cite chapter titles, e.g. Ch. “Diencephalon: Thalamus and Hypothalamus”.',
  },
  {
    title: 'Blumenfeld — Neuroanatomy through Clinical Cases, 3rd ed. (Oxford University Press)',
    detail: 'Current edition of the primary text.',
  },
  { title: 'Patten — Neurological Differential Diagnosis, 2nd ed.', detail: 'Brainstem level plates; lesion-localization strategy.' },
  { title: 'Fix — High-Yield Neuroanatomy', detail: 'Concise tract and nucleus review.' },
  { title: 'Snell — Clinical Neuroanatomy', detail: 'Clinical correlations per region.' },
  { title: 'Nolte — The Human Brain: An Introduction to Its Functional Anatomy', detail: 'Functional background.' },
  {
    title: 'Fiester et al. — “Midbrain, Pons, and Medulla: Anatomy and Syndromes”, RadioGraphics 2019',
    detail: 'Definitive modern review of the exact cross-section levels and syndromes in this atlas.',
    url: 'https://pubs.rsna.org/doi/10.1148/rg.2019180126',
  },
  {
    title: 'Duke University — Brainstem sectional anatomy (Lab 3)',
    detail: 'Level-by-level photographic sectional anatomy, used to sanity-check plate layouts.',
    url: 'https://brain.oit.duke.edu/lab03/lab03.html',
  },
  {
    title: 'Neurotorium — 3D Brain Atlas',
    detail: 'Interaction-design reference for hierarchical browsing and plane views (UX only; no content taken).',
    url: 'https://neurotorium.org/tool/brain-atlas/',
  },
]

export default function ReferencesModal() {
  const open = useAtlasStore((s) => s.referencesOpen)
  const setReferencesOpen = useAtlasStore((s) => s.setReferencesOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReferencesOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setReferencesOpen])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => setReferencesOpen(false)}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="References and bibliography"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>References &amp; bibliography</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close references"
            onClick={() => setReferencesOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="hint">
            Select any nucleus, tract, or region in the app and the <strong>Learn more</strong> section shows
            curated external links (Wikipedia + journal) specific to that structure — in addition to the
            scholarly citations below.
          </p>

          <section>
            <h3>Core bibliography</h3>
            <ul className="bib-list">
              {CORE_REFERENCES.map((reference) => (
                <li key={reference.title} className="bib-item">
                  {reference.url ? (
                    <a href={reference.url} target="_blank" rel="noreferrer">{reference.title}</a>
                  ) : (
                    <span className="bib-title">{reference.title}</span>
                  )}
                  {reference.detail && <span>{reference.detail}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Cited in records ({allReferences.length})</h3>
            {allReferences.length === 0 ? (
              <p className="hint">No authored record carries refs yet — chapter-level citations appear here as data tasks land.</p>
            ) : (
              <ol className="ref-list">
                {allReferences.map((reference, index) => (
                  <li key={index}>{reference}</li>
                ))}
              </ol>
            )}
          </section>

          <p className="modal-foot">
            All plate artwork and 3D geometry in NeuroAxis are original schematic content authored for this
            project — no external anatomy dataset is used. The works above are cited as the scholarly basis
            for the neuroanatomical descriptions.
          </p>
        </div>
      </div>
    </div>
  )
}
