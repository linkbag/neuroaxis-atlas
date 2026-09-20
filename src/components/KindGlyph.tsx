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
  // v13 (PLAN.md §2 item 7): the cranial nerves. A distinct mark from all six
  // above — the taxonomy tree, search hits and the info panel render it next to
  // a nerve row, where reusing the nucleus dot would read as a nucleus.
  nerve: '✦',
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
