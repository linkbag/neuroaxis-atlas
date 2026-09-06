/**
 * Small shared glyphs for structure kinds and tract directions, used by the
 * taxonomy tree, search results, info panel, and legend.
 */

import type { Kind, TractRecord } from '../types'

export const KIND_GLYPH: Record<Kind, string> = {
  nucleus: '●',
  tract: '↕',
  ventricle: '◌',
  surface: '▢',
  vessel: '✚',
  context: '◻',
}

export const DIRECTION_GLYPH: Record<TractRecord['direction'], string> = {
  ascending: '↑',
  descending: '↓',
  mixed: '↕',
}

export function KindGlyph({ kind, color, title }: {
  kind: Kind
  color?: string
  title?: string
}) {
  return (
    <span
      className="kind-glyph"
      style={color ? { color } : undefined}
      title={title ?? kind}
      aria-hidden={title === undefined ? true : undefined}
    >
      {KIND_GLYPH[kind]}
    </span>
  )
}
