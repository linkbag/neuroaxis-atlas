/**
 * SearchBox — plan §1.1 feature 7. Case-insensitive substring search over
 * names + synonyms (via searchAll), dropdown results with full keyboard
 * support (↑/↓ move, Enter selects the highlighted or first hit, Escape
 * clears). Selecting a hit activates the 3D tab and shows the record in the
 * info panel.
 *
 * ── A11Y: a complete combobox (QUALITY_PLAN §4 item 15 / AUDIT §2.19) ──────
 * The input already carried `role="combobox"` + `aria-expanded` +
 * `aria-controls`, but the active option was conveyed by `aria-selected` on the
 * <li>s ONLY. In an ARIA combobox the DOM focus never leaves the text field, so
 * `aria-selected` alone tells assistive tech nothing — the pattern requires the
 * input to point at the active option with `aria-activedescendant`. Every
 * option therefore has a stable id (`searchbox-option-<structure id>`, derived
 * from the data id, not the index, so it survives re-ranking as the user types)
 * and the input names the active one; `aria-controls` resolves while the listbox
 * is rendered, and the attribute is omitted when it is not (the results list
 * only exists for a non-empty query), so it can never dangle.
 */

import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { searchAll, type SearchHit } from '../data/load'
import { useAtlasStore } from '../state/store'
import { KindGlyph } from './KindGlyph'

const MAX_RESULTS = 12
const LISTBOX_ID = 'searchbox-results'
const optionId = (hit: SearchHit) => `searchbox-option-${hit.id}`

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const hits = useMemo(() => searchAll(query), [query])
  const visible = hits.slice(0, MAX_RESULTS)
  const trimmed = query.trim()
  const listOpen = open && trimmed !== ''
  // The active option's id, or undefined when no option is rendered (the id
  // must never point at a node that does not exist).
  const activeHit = listOpen ? visible[activeIndex] : undefined
  const activeOptionId = activeHit !== undefined ? optionId(activeHit) : undefined

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const choose = (hit: SearchHit) => {
    selectStructure(hit.id) // fresh browsing → default '3d' tab, clears syndrome highlight
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, Math.max(visible.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      const hit = visible[activeIndex] ?? visible[0]
      if (hit) choose(hit)
    } else if (event.key === 'Escape') {
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div className="searchbox">
      <input
        className="searchbox-input"
        type="search"
        placeholder="Search nuclei, tracts, synonyms…"
        aria-label="Search structures by name or synonym"
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listOpen ? LISTBOX_ID : undefined}
        aria-autocomplete="list"
        // A11Y-CONTRACT (item 15): the input keeps DOM focus; the active option
        // is announced through aria-activedescendant. Omitted when no option is
        // rendered, so the id can never point at a missing node.
        aria-activedescendant={activeOptionId}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />

      {listOpen && (
        <ul className="searchbox-results" id={LISTBOX_ID} role="listbox" aria-label="Search results">
          {visible.length === 0 && (
            /* v19 (audit ux-015) — a listbox owns only `option` (or `group`)
             * children: these two informational rows were announced as an empty
             * listbox (or dropped). They stay in the DOM for sighted readers and
             * are marked presentational so the listbox's children are all
             * options. */
            <li className="searchbox-empty" role="presentation">No structure matches “{trimmed}” — try a synonym (e.g. “STN”, “MLF”, “PICA”).</li>
          )}
          {visible.map((hit, index) => (
            <li
              key={hit.id}
              id={optionId(hit)}
              role="option"
              aria-selected={index === activeIndex}
              className={`searchbox-item${index === activeIndex ? ' is-active' : ''}`}
              // mousedown fires before the input's blur, keeping the click usable
              onMouseDown={(event) => {
                event.preventDefault()
                choose(hit)
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onPointerEnter={() => useAtlasStore.getState().setHovered(hit.id)}
              onPointerLeave={() => useAtlasStore.getState().setHovered(null)}
            >
              <KindGlyph kind={hit.kind} color={hit.color} title={hit.kind} />
              <span className="searchbox-name">{hit.name}</span>
              {!hit.authored && <span className="chip chip--pending">pending</span>}
              {hit.matchedVia === 'synonym' && (
                <span className="searchbox-via" title={`Matched synonym: ${hit.matchedText}`}>
                  via “{hit.matchedText}”
                </span>
              )}
            </li>
          ))}
          {hits.length > visible.length && (
            <li className="searchbox-more" role="presentation">Showing {visible.length} of {hits.length} — keep typing to narrow.</li>
          )}
        </ul>
      )}
    </div>
  )
}
