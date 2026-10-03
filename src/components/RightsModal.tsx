import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

const ACKNOWLEDGEMENT_KEY = 'neuroaxis.rights.v1'
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function acknowledgementStored(): boolean {
  try {
    return window.localStorage.getItem(ACKNOWLEDGEMENT_KEY) === 'acknowledged'
  } catch {
    return false
  }
}

export function saveAcknowledgement(): void {
  try {
    window.localStorage.setItem(ACKNOWLEDGEMENT_KEY, 'acknowledged')
  } catch {
    // The dialog can still be dismissed for this visit when storage is unavailable.
  }
}

interface RightsModalProps {
  open: boolean
  required: boolean
  onAcknowledge: () => void
  onClose: () => void
}

export default function RightsModal({ open, required, onAcknowledge, onClose }: RightsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initialFocus = required
      ? dialog?.querySelector<HTMLElement>('[data-acknowledge]')
      : dialog?.querySelector<HTMLElement>('.modal-close')
    ;(initialFocus ?? dialog)?.focus({ preventScroll: true })

    return () => {
      const opener = openerRef.current
      openerRef.current = null
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open, required])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (!required) onClose()
      return
    }
    if (event.key !== 'Tab') return

    const dialog = dialogRef.current
    if (!dialog) return
    const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.getClientRects().length > 0,
    )
    if (nodes.length === 0) {
      event.preventDefault()
      dialog.focus({ preventScroll: true })
      return
    }
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop rights-backdrop" role="presentation" onClick={() => { if (!required) onClose() }}>
      <div
        ref={dialogRef}
        className="modal-dialog rights-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rights-title"
        aria-describedby="rights-intro"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="rights-title">Rights, credits &amp; use terms</h2>
          {!required && (
            <button type="button" className="modal-close" aria-label="Close rights and credits" onClick={onClose}>✕</button>
          )}
        </div>

        <div className="modal-body rights-body">
          <p id="rights-intro">
            Please recognize the creators and source terms for material in NeuroAxis before using the atlas.
            This is an educational reference, not a clinical diagnostic tool.
          </p>

          <section>
            <h3>Project and contact</h3>
            <p>© 2026 Webster Wang. All rights reserved. Contact: <a href="mailto:websterwangai@gmail.com">websterwangai@gmail.com</a>.</p>
            <p>The repository code is available under its <a href="https://github.com/linkbag/neuroaxis-atlas/blob/master/LICENSE" target="_blank" rel="noreferrer">MIT License</a>. This copyright notice does not replace that license or the separate rights of third-party creators.</p>
          </section>

          <section>
            <h3>Third-party credits</h3>
            <ul className="rights-list">
              <li><strong>3D surface anatomy:</strong> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. The surfaces were adapted for this atlas. <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">Source and license</a>.</li>
              <li><strong>Section photographs:</strong> © University of British Columbia, CC BY-NC-SA 4.0. Copies were resized or re-encoded; reuse requires attribution, noncommercial use, and ShareAlike for adaptations. <a href="https://www.neuroanatomy.ca/" target="_blank" rel="noreferrer">Source</a> · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">License</a>.</li>
              <li><strong>Visible Human CT and cryosections:</strong> Courtesy of the U.S. National Library of Medicine. These are frozen September 2026 teaching snapshots and may not reflect the most current or accurate data available from NLM. NLM does not endorse NeuroAxis. <a href="https://www.nlm.nih.gov/databases/download/terms_and_conditions.html" target="_blank" rel="noreferrer">NLM terms</a>.</li>
              <li><strong>MRI and CT imagery:</strong> OpenNeuro ds007313 MRI-derived grid and Mikael Häggström, M.D.'s CT images via Wikimedia Commons, both from CC0 sources. <a href="https://openneuro.org/datasets/ds007313/versions/1.0.0" target="_blank" rel="noreferrer">OpenNeuro</a> · <a href="https://commons.wikimedia.org/wiki/Category:Computed_tomography_of_normal_brain_in_axial_plane_(case_1)" target="_blank" rel="noreferrer">Wikimedia Commons</a>.</li>
            </ul>
          </section>

          <section>
            <h3>Recognition of use terms</h3>
            <p>Use each asset under its stated license or source terms. Credit its creator, keep required notices with redistributed copies, and check the full conditions before republishing. The MSU brain images are not included in this public build.</p>
            <p>For per-image provenance and scholarly sources, read the <a href="https://github.com/linkbag/neuroaxis-atlas/blob/master/docs/ATTRIBUTION.md" target="_blank" rel="noreferrer">attribution record</a> and the app’s References panel.</p>
          </section>
        </div>

        <div className="rights-actions">
          <span>Your acknowledgement is remembered in this browser.</span>
          <button type="button" className="btn is-active" data-acknowledge onClick={onAcknowledge}>
            I acknowledge these credits and terms
          </button>
        </div>
      </div>
    </div>
  )
}
