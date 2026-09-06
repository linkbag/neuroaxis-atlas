/**
 * PlateRenderer — plan §6: renders one SVG cross-section plate.
 *
 * - SVG text is inlined at build time via import.meta.glob('?raw') and
 *   injected with dangerouslySetInnerHTML (the files are our own validated
 *   content — see scripts/validate-data.mjs).
 * - After injection, every [data-structure] node is wired: pointerenter/
 *   leave → store hover, click → store select (staying on the plates tab);
 *   fills are recolored from the taxonomy ONLY where the SVG has no fill of
 *   its own (plan §6: renderer controls fills, files carry no critical
 *   styling); a native <title> child gives a hover tooltip.
 * - State classes: .is-selected / .is-hovered / .is-highlight (in the open
 *   syndrome's structure set) keep regions lit while .is-dim dims the rest —
 *   an open syndrome takes precedence over a plain selection.
 * - .plate-label groups (leader line + text, authored in the SVG) toggle via
 *   the root .labels-hidden class; the region's label lights up with it.
 * - Orientation badges (L/R/A/P/S/I) come from the SVG itself, untouched.
 */

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { PlateRecord } from '../types'
import { getPlateSvg, getTaxonomyEntry } from '../data/load'
import { highlightIdSet, useAtlasStore } from '../state/store'

function wireRegions(root: HTMLElement): () => void {
  const cleanups: Array<() => void> = []

  const regions = Array.from(root.querySelectorAll<SVGElement>('[data-structure]'))
  for (const el of regions) {
    const id = el.getAttribute('data-structure') ?? ''
    el.classList.add('plate-region')

    const entry = getTaxonomyEntry(id)
    if (entry) {
      const ownFill = el.getAttribute('fill') ?? el.style.getPropertyValue('fill')
      if (ownFill === '') el.style.fill = entry.color
      if (entry.name) {
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
        title.textContent = entry.name
        el.appendChild(title)
      }
    }

    const onEnter = () => useAtlasStore.getState().setHovered(id)
    const onLeave = () => useAtlasStore.getState().setHovered(null)
    const onClick = () =>
      useAtlasStore.getState().selectStructure(id, { tab: 'plates', keepSyndrome: true })

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('click', onClick)
    cleanups.push(() => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('click', onClick)
    })
  }

  // Leader-line labels are clickable too and route to the same selection.
  const labels = Array.from(root.querySelectorAll<SVGGElement>('.plate-label[data-for]'))
  for (const label of labels) {
    const id = label.getAttribute('data-for') ?? ''
    const onClick = () =>
      useAtlasStore.getState().selectStructure(id, { tab: 'plates', keepSyndrome: true })
    label.addEventListener('click', onClick)
    cleanups.push(() => label.removeEventListener('click', onClick))
  }

  return () => cleanups.forEach((fn) => fn())
}

export default function PlateRenderer({ plate }: { plate: PlateRecord }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const raw = getPlateSvg(plate.svg)

  const selectedId = useAtlasStore((s) => s.selectedId)
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const syndromeId = useAtlasStore((s) => s.syndromeId)
  const labelVisibility = useAtlasStore((s) => s.labelVisibility)

  const highlight = useMemo(
    () => highlightIdSet({ selectedId, syndromeId }),
    [selectedId, syndromeId],
  )

  // Wire events + recolor once per injected SVG.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (root === null || raw === undefined) return
    return wireRegions(root)
  }, [raw])

  // Reflect store state onto regions + labels (runs after wiring).
  useLayoutEffect(() => {
    const root = rootRef.current
    if (root === null || raw === undefined) return

    root.classList.toggle('labels-hidden', !labelVisibility)

    for (const el of Array.from(root.querySelectorAll<SVGElement>('[data-structure]'))) {
      const id = el.getAttribute('data-structure') ?? ''
      const isSelected = id === selectedId
      const isHovered = id === hoveredId
      const inHighlight = highlight?.has(id) ?? false
      el.classList.toggle('is-selected', isSelected)
      el.classList.toggle('is-hovered', isHovered)
      el.classList.toggle('is-highlight', inHighlight && !isSelected)
      el.classList.toggle('is-dim', highlight !== null && !inHighlight && !isSelected && !isHovered)
    }

    for (const label of Array.from(root.querySelectorAll<SVGGElement>('.plate-label[data-for]'))) {
      const id = label.getAttribute('data-for') ?? ''
      const hot =
        id === selectedId || id === hoveredId || (highlight?.has(id) ?? false)
      label.classList.toggle('is-hot', hot)
      label.classList.toggle('is-dim', highlight !== null && !hot)
    }
  }, [raw, selectedId, hoveredId, highlight, labelVisibility])

  if (raw === undefined) {
    return (
      <div className="plate-root plate-missing">
        The SVG for “{plate.id}” has not landed yet
        (expected <code>src/data/{plate.svg}</code>). It will render here as soon as the
        plates task delivers it.
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="plate-root"
      role="img"
      aria-label={`Cross-section plate: ${plate.title}`}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  )
}
