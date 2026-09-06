/**
 * SearchBox — plan §1.1 feature 7. Case-insensitive substring search over
 * names + synonyms (via searchAll), dropdown results with full keyboard
 * support (↑/↓ move, Enter selects the highlighted or first hit, Escape
 * clears). Selecting a hit activates the 3D tab and shows the record in the
 * info panel.
 */

import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { searchAll, type SearchHit } from '../data/load'
import { useAtlasStore } from '../state/store'
import { KindGlyph } from './KindGlyph'

const MAX_RESULTS = 12

export default function SearchBox() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectStructure = useAtlasStore((s) => s.selectStructure)

  const hits = useMemo(() => searchAll(query), [query])
  const visible = hits.slice(0, MAX_RESULTS)

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

  const trimmed = query.trim()

  return (
    <div className="searchbox">
      <input
        className="searchbox-input"
        type="search"
        placeholder="Search nuclei, tracts, synonyms…"
        aria-label="Search structures by name or synonym"
        role="combobox"
        aria-expanded={open && trimmed !== ''}
        aria-controls="searchbox-results"
        aria-autocomplete="list"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />

      {open && trimmed !== '' && (
        <ul className="searchbox-results" id="searchbox-results" role="listbox" aria-label="Search results">
          {visible.length === 0 && (
            <li className="searchbox-empty">No structure matches “{trimmed}” — try a synonym (e.g. “STN”, “MLF”, “PICA”).</li>
          )}
          {visible.map((hit, index) => (
            <li
              key={hit.id}
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
            <li className="searchbox-more">Showing {visible.length} of {hits.length} — keep typing to narrow.</li>
          )}
        </ul>
      )}
    </div>
  )
}
