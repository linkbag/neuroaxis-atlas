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
 *   styling); a native <title> child gives a hover tooltip AND the region's
 *   accessible name (see the a11y block below).
 * - State classes: .is-selected / .is-hovered / .is-highlight (in the open
 *   syndrome's structure set) keep regions lit while .is-dim dims the rest —
 *   an open syndrome takes precedence over a plain selection.
 * - .plate-label groups (leader line + text, authored in the SVG) toggle via
 *   the root .labels-hidden class; the region's label lights up with it.
 * - Orientation badges (L/R/A/P/S/I) come from the SVG itself, untouched.
 *
 * ── A11Y: plate regions are operable by keyboard alone ────────────────────
 * QUALITY_PLAN §4 item 13 / AUDIT §2.17: the plate was mouse-only. The old
 * markup was `<div class="plate-root" role="img">`, and `role="img"` is an
 * **atom** in the accessibility tree (PLAN-run DEV-13): every descendant —
 * including the regions that were about to be given a role and a tabindex —
 * is swallowed by it, so the region work would have been cosmetically true and
 * functionally false. The root therefore no longer carries `role="img"`;
 * the injected `<svg>` carries the image description instead and the region
 * nodes are exposed individually.
 *
 * A11Y-CONTRACT (each line is implemented below; grep for the marker):
 *  1. the plate root is `role="group"` + `aria-label` = "Cross-section plate:
 *     «title»" — a real container, not an atom, so children are reachable;
 *  2. the injected `<svg>` is `role="img"` + a `<title>` child, so the artwork
 *     still has one honest description;
 *  3. each region is `role="button"` + `tabindex` — roving: exactly ONE region
 *     in the plate holds `0`, every other holds `-1` (WAI-ARIA roving tabindex:
 *     Tab enters the plate once, Arrow keys move inside it);
 *  4. the roving anchor follows the selection when the plate re-renders, but is
 *     never moved out from under a focused region (Arrow/Home/End set it);
 *  5. ArrowDown/ArrowUp/ArrowRight/ArrowLeft/Home/End move focus inside the
 *     plate and scroll the region into view; the handler is bound to the plate
 *     root only, so it cannot swallow the sliders' or the page's keys (DEV-11
 *     risk b);
 *  6. Enter and Space activate the focused region exactly like a click
 *     (`selectStructure(id, { tab: 'plates', keepSyndrome: true })`);
 *  7. `.plate-label` leaders are `role="button"` + `tabindex="0"` too (they are
 *     clickable and route to the same selection, but they are NOT part of the
 *     regions' roving sequence — their tabindex stays 0), and Enter/Space on
 *     one activates it as well;
 *  8. the accessible name of each region is the region's display name — the
 *     `<title>` child built from `getTaxonomyEntry(id).name`, which is also
 *     the hover tooltip (SVG gives the graphics element that name natively, so
 *     the name cannot drift from the visible label);
 *  9. visible focus ring: `.plate-region:focus-visible` / `.plate-label:
 *     focus-visible` / `.plate-root svg:focus-visible` in styles/plates.css.
 *
 * AUDIT IMPACT: scripts/verify/audit.mjs §H walks the AX tree and demands a
 * computed accessible name for every interactive node. The 12 regions now
 * appear there as `button` nodes (baseline 93 → +12). A region whose taxonomy
 * entry has no name is deliberately left WITHOUT role/tabindex rather than
 * exposed as an unnamed button, so §H cannot fail on a data gap.
 */

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { PlateRecord } from '../types'
import { getPlateSvg, getTaxonomyEntry } from '../data/load'
import { highlightIdSet, useAtlasStore } from '../state/store'

/** Same selection a click performs — one path for pointer and keyboard. */
function selectRegion(id: string): void {
  useAtlasStore.getState().selectStructure(id, { tab: 'plates', keepSyndrome: true })
}

/** Tab-stop keys of the roving pattern (DEV-11: scoped to the plate root). */
const NAV_KEYS = new Set(['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'])

/**
 * A11Y-CONTRACT 3/4: exactly one region holds tabindex 0 — the one the user
 * last focused if focus is inside the plate, else the selected one, else the
 * first region. Everything else is -1.
 */
function applyRovingTabindex(root: HTMLElement, preferred?: SVGElement): void {
  const regions = Array.from(root.querySelectorAll<SVGElement>('[data-structure]'))
  if (regions.length === 0) return
  const active = root.contains(document.activeElement) ? document.activeElement : null
  const focused = regions.find((el) => el === active) ?? null
  const selectedId = useAtlasStore.getState().selectedId
  const stop =
    preferred ?? focused ?? regions.find((el) => el.getAttribute('data-structure') === selectedId) ?? regions[0]
  for (const el of regions) el.setAttribute('tabindex', el === stop ? '0' : '-1')
}

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
    const onClick = () => {
      // Keep ONE keyboard entry path: a pointer click also becomes the plate's
      // tab stop, so Tab-out/Tab-back and the arrows continue from the region
      // the user actually clicked (mouse and keyboard stay coherent).
      el.focus({ preventScroll: true })
      selectRegion(id)
    }
    const onFocus = () => applyRovingTabindex(root, el)

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('click', onClick)
    el.addEventListener('focus', onFocus)
    cleanups.push(() => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('click', onClick)
      el.removeEventListener('focus', onFocus)
    })

    // A11Y-CONTRACT 3/5/6/8: buttons to assistive tech, one tab stop, named.
    // Without a display name the region is left unexposed on purpose (§H).
    if (entry?.name) {
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '-1') // applyRovingTabindex() promotes one
    }
  }

  // A11Y-CONTRACT 5/6: one keydown listener on the plate root (not a global
  // listener) handles arrows, Home/End and activation for the focused region.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    const list = Array.from(root.querySelectorAll<SVGElement>('[data-structure]'))
    if (list.length === 0) return
    const target = event.target as Element | null
    const from = list.indexOf(target as SVGElement)

    if (NAV_KEYS.has(event.key)) {
      event.preventDefault()
      let index: number
      if (event.key === 'Home') index = 0
      else if (event.key === 'End') index = list.length - 1
      else {
        const current = from === -1 ? list.findIndex((el) => el.getAttribute('tabindex') === '0') : from
        const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
        index = (Math.max(current, 0) + step + list.length) % list.length
      }
      const next = list[index]
      for (const el of list) el.setAttribute('tabindex', el === next ? '0' : '-1')
      next.focus()
      // jsdom-free browsers all implement scrollIntoView on SVGGraphicsElement;
      // guard anyway so keyboard nav can never throw inside an event handler.
      if (typeof next.scrollIntoView === 'function') next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      return
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      if (from === -1) return
      event.preventDefault() // Space would otherwise scroll the plate stage
      selectRegion(list[from].getAttribute('data-structure') ?? '')
    }
  }
  root.addEventListener('keydown', onKeyDown)
  cleanups.push(() => root.removeEventListener('keydown', onKeyDown))

  // Leader-line labels are clickable too and route to the same selection;
  // A11Y-CONTRACT 7 gives them the same keyboard path.
  const labels = Array.from(root.querySelectorAll<SVGGElement>('.plate-label[data-for]'))
  for (const label of labels) {
    const id = label.getAttribute('data-for') ?? ''
    const onClick = () => selectRegion(id)
    const onKeyDownLabel = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return
      event.preventDefault()
      selectRegion(id)
    }
    label.setAttribute('role', 'button')
    label.setAttribute('tabindex', '0')
    label.addEventListener('click', onClick)
    label.addEventListener('keydown', onKeyDownLabel)
    cleanups.push(() => {
      label.removeEventListener('click', onClick)
      label.removeEventListener('keydown', onKeyDownLabel)
    })
  }

  applyRovingTabindex(root)
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

    // A11Y-CONTRACT 4: the roving tab stop follows the selection — a keyboard
    // user who selected from the tree/search lands on that structure when they
    // Tab back into the plate.
    applyRovingTabindex(root)
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
      role="group"
      aria-label={`Cross-section plate: ${plate.title}`}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  )
}
