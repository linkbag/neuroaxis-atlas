/**
 * TaxonomyTree — plan §1.1 feature 7: region → subdivision → structure
 * browsing built from the registry (taxonomy.json) via the load.ts tree
 * model. Rows sync with the global store: click selects (and activates the
 * 3D tab), hover previews; rows whose kind/region layer is toggled off are
 * dimmed, the selected row is marked. Registry entries without an authored
 * record yet still appear (tagged) so the tree is complete from day one.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Kind, Region } from '../types'
import { getSyndrome, getTaxonomyEntry, tree, type TreeLeaf } from '../data/load'
import { useAtlasStore, type AtlasLayers } from '../state/store'
import { KindGlyph } from './KindGlyph'

function toggleSetValue<T>(previous: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(previous)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function layerOff(layers: AtlasLayers, region: Region, kind: Kind): boolean {
  return !layers.regions.has(region) || !layers.kinds.has(kind)
}

function LeafRow({ leaf, selectedId, hoveredId, layers, syndromeSet }: {
  leaf: TreeLeaf
  selectedId: string | null
  hoveredId: string | null
  layers: AtlasLayers
  syndromeSet: ReadonlySet<string> | null
}) {
  const selectStructure = useAtlasStore((s) => s.selectStructure)
  const setHovered = useAtlasStore((s) => s.setHovered)
  const entry = leaf.entry
  const selected = selectedId === entry.id
  const inSyndrome = syndromeSet?.has(entry.id) ?? false
  const off = layerOff(layers, entry.region, entry.kind)

  return (
    <li>
      <button
        type="button"
        className={[
          'tree-leaf-row',
          selected ? 'is-selected' : '',
          inSyndrome && !selected ? 'is-in-syndrome' : '',
          hoveredId === entry.id ? 'is-hovered' : '',
          off ? 'is-off' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => selectStructure(entry.id)}
        onPointerEnter={() => setHovered(entry.id)}
        onPointerLeave={() => setHovered(null)}
        title={leaf.record ? entry.name : `${entry.name} — authored record pending`}
      >
        <KindGlyph kind={entry.kind} color={entry.color} title={entry.kind} />
        <span className="tree-leaf-name">{entry.name}</span>
        {inSyndrome && <span className="chip chip--syndrome" title="Involved in the open syndrome">syn</span>}
        {!leaf.record && <span className="chip chip--pending">pending</span>}
      </button>
      {leaf.children.length > 0 && (
        <ul className="tree-children">
          {leaf.children.map((child) => (
            <LeafRow
              key={child.entry.id}
              leaf={child}
              selectedId={selectedId}
              hoveredId={hoveredId}
              layers={layers}
              syndromeSet={syndromeSet}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function TaxonomyTree() {
  const [openRegions, setOpenRegions] = useState<ReadonlySet<Region>>(() => new Set())
  const [openSubdivisions, setOpenSubdivisions] = useState<ReadonlySet<string>>(() => new Set())
  const selectedId = useAtlasStore((s) => s.selectedId)
  const hoveredId = useAtlasStore((s) => s.hoveredId)
  const layers = useAtlasStore((s) => s.layers)
  const syndromeId = useAtlasStore((s) => s.syndromeId)

  // Structure ids involved in the open syndrome card — lit everywhere (plan §1.1 feature 10).
  const syndromeSet = useMemo<ReadonlySet<string> | null>(() => {
    if (syndromeId === null) return null
    const syndrome = getSyndrome(syndromeId)
    return syndrome && syndrome.structures.length > 0 ? new Set(syndrome.structures) : null
  }, [syndromeId])

  // Keep the tree navigable when a selection arrives from 3D, plates, search…
  useEffect(() => {
    if (selectedId === null) return
    const entry = getTaxonomyEntry(selectedId)
    if (!entry) return
    setOpenRegions((previous) => new Set(previous).add(entry.region))
    setOpenSubdivisions((previous) => new Set(previous).add(`${entry.region}::${entry.subdivision}`))
  }, [selectedId])

  if (tree.length === 0) {
    return <p className="empty-note">Taxonomy registry has not loaded — the tree appears once src/data/taxonomy.json exists.</p>
  }

  return (
    <nav className="tree" aria-label="Structure taxonomy">
      {tree.map((regionNode) => {
        const regionOpen = openRegions.has(regionNode.region)
        return (
          <div
            key={regionNode.region}
            className={`tree-region${layers.regions.has(regionNode.region) ? '' : ' is-off'}`}
          >
            <button
              type="button"
              className="tree-region-row"
              aria-expanded={regionOpen}
              onClick={() => setOpenRegions((previous) => toggleSetValue(previous, regionNode.region))}
            >
              <span className="chevron" aria-hidden="true">{regionOpen ? '▾' : '▸'}</span>
              <span className="tree-region-name">{regionNode.label}</span>
              <span className="tree-count">{regionNode.count}</span>
            </button>

            {regionOpen && regionNode.subdivisions.map((subdivision) => {
              const key = `${regionNode.region}::${subdivision.name}`
              const subOpen = openSubdivisions.has(key)
              const count = subdivision.leaves.reduce((n, leaf) => n + 1 + leaf.children.length, 0)
              return (
                <div key={key} className="tree-subdivision">
                  <button
                    type="button"
                    className="tree-sub-row"
                    aria-expanded={subOpen}
                    onClick={() => setOpenSubdivisions((previous) => toggleSetValue(previous, key))}
                  >
                    <span className="chevron" aria-hidden="true">{subOpen ? '▾' : '▸'}</span>
                    <span className="tree-sub-name">{subdivision.name}</span>
                    <span className="tree-count">{count}</span>
                  </button>
                  {subOpen && (
                    <ul className="tree-leaves">
                      {subdivision.leaves.map((leaf) => (
                        <LeafRow
                          key={leaf.entry.id}
                          leaf={leaf}
                          selectedId={selectedId}
                          hoveredId={hoveredId}
                          layers={layers}
                          syndromeSet={syndromeSet}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}
