/**
 * ReferencesModal — plan §1.1 feature 12: global bibliography. Combines a
 * fixed core textbook list (Blumenfeld editions, Patten, Fix, Snell, Nolte,
 * the RSNA RadioGraphics 2019 brainstem review with DOI link, and the
 * Duke/Neurotorium online references) with every refs entry authored in the
 * data files (deduplicated, alphabetical).
 *
 * ── A11Y: real dialog behaviour (QUALITY_PLAN §4 item 15 / AUDIT §2.19) ────
 * The dialog already declared `role="dialog"` + `aria-modal`, but it opened
 * with focus left wherever it was (so the first Tab landed on the page BEHIND
 * the overlay), Tab could walk out of the dialog into that page, and closing it
 * dropped focus on <body> — the user lost their place in a long info panel.
 * A11Y-CONTRACT:
 *  1. on open, focus moves into the dialog — the close button if it is
 *     focusable, else the dialog itself (`tabindex={-1}`, a programmatic-only
 *     focus target);
 *  2. Tab/Shift+Tab cycle inside the dialog (focus trap) — the page behind an
 *     `aria-modal` dialog is not reachable while it is open;
 *  3. on close (button, Escape or backdrop click) focus returns to the element
 *     that opened it, captured when the dialog opened and only if it is still
 *     connected to the document;
 *  4. Escape closes it (kept from the previous revision, now handled inside the
 *     dialog's own key listener so it shares the trap's element list).
 * The close button is the autofocus target (`autoFocus`), which also gives the
 * audit's AX-tree pass a named `button` node exactly as before.
 */

import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
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

/** Everything the browser will let a Tab press land on inside the dialog. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

export default function ReferencesModal() {
  const open = useAtlasStore((s) => s.referencesOpen)
  const setReferencesOpen = useAtlasStore((s) => s.setReferencesOpen)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  // A11Y-CONTRACT 1/3: capture the opener when the dialog mounts and give
  // focus back to it when the dialog unmounts (never to a detached node).
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (dialog !== null && !dialog.contains(document.activeElement)) {
      const close = dialog.querySelector<HTMLElement>('.modal-close')
      const first = close ?? focusableIn(dialog)[0] ?? dialog
      first.focus({ preventScroll: true })
    }
    return () => {
      const opener = openerRef.current
      openerRef.current = null
      if (opener !== null && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      setReferencesOpen(false)
      return
    }
    if (event.key !== 'Tab') return

    // A11Y-CONTRACT 2: the trap. It re-queries on every Tab press, so it keeps
    // working if the bibliography grows, and it wraps in both directions.
    const dialog = dialogRef.current
    if (dialog === null) return
    const nodes = focusableIn(dialog)
    if (nodes.length === 0) {
      event.preventDefault()
      dialog.focus({ preventScroll: true })
      return
    }
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !dialog.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => setReferencesOpen(false)}
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="References and bibliography"
        tabIndex={-1}
        onKeyDown={onDialogKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>References &amp; bibliography</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close references"
            autoFocus
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
