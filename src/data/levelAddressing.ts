/**
 * NeuroAxis — the ONE shared expansion for spinal level addressing.
 *
 * Lead contract call #1 (SPINAL_CORD_PLAN §5 run): every record must carry
 * machine-resolvable level addressing in exactly one of two authoring forms —
 *
 *   (a) `levels[]` — explicit level-anchor ids, as the brainstem records do;
 *   (b) `spinalSpan` — the named segment extent (`segments: 'T1-L2'` …), whose
 *       EXPANSION into concrete level ids is computed by this module.
 *
 * The expansion is resolved at load (src/data/load.ts), so downstream code —
 * the section machinery, the level ruler, the gates — only ever sees `levels[]`
 * and never has to know about spans. Where both forms are present they must
 * agree (the load throws otherwise, and scripts/verify/audit-facts.mjs pins the
 * same agreement).
 *
 * This module is deliberately PURE — no data imports, no side effects — so the
 * app (Vite) and every Node gate (dynamic import via file URL) run the exact
 * same expansion code. `SpinalSpan` itself is typed in src/types.ts (the field
 * contract home, v8/v13 precedent); only the type is imported here.
 */

import type { SpinalSpan } from '../types'

/**
 * The 31 spinal segment level anchors, rostral → caudal (C1 … Co1), matching
 * src/data/levels.json (`lvl-c1` … `lvl-co1`, the SPINAL_CORD_PLAN §5 table).
 */
export const SPINAL_SEGMENT_LABELS: readonly string[] = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
  'L1', 'L2', 'L3', 'L4', 'L5',
  'S1', 'S2', 'S3', 'S4', 'S5',
  'Co1',
]

/** `lvl-c1` … `lvl-co1` — derived from the labels so the two cannot drift. */
export const SPINAL_SEGMENT_IDS: readonly string[] = SPINAL_SEGMENT_LABELS.map(
  (label) => `lvl-${label.toLowerCase()}`,
)

const SEGMENT_RE = /^(C[1-8]|T(?:[1-9]|1[0-2])|L[1-5]|S[1-5]|Co1)$/

function segmentIndex(label: string): number {
  const index = SPINAL_SEGMENT_LABELS.indexOf(label)
  if (index === -1) throw new Error(`levelAddressing: unknown spinal segment "${label}"`)
  return index
}

/** One `segments` token: a single segment (`C3`) or an inclusive range (`T1-L2`). */
function expandToken(token: string): string[] {
  const parts = token.split('-').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 1) {
    if (!SEGMENT_RE.test(parts[0])) throw new Error(`levelAddressing: bad segment token "${token}"`)
    return [parts[0]]
  }
  if (parts.length === 2 && SEGMENT_RE.test(parts[0]) && SEGMENT_RE.test(parts[1])) {
    const a = segmentIndex(parts[0])
    const b = segmentIndex(parts[1])
    const [lo, hi] = a <= b ? [a, b] : [b, a] // authoring direction is free
    return SPINAL_SEGMENT_LABELS.slice(lo, hi + 1)
  }
  throw new Error(`levelAddressing: bad segment token "${token}"`)
}

/**
 * Expand `spinalSpan.segments` into the concrete level-anchor ids it addresses.
 *
 * Grammar: `'all'` | token (',' token)*, where token = segment | segment '-' segment.
 * Known forms in the data: 'all', 'T1-L2', 'C8-L3', 'S2-S4', 'C3-C5', 'C1-C5',
 * 'C5-T1, L2-S3' (disjoint ranges, comma-separated).
 *
 * Returns ids in ROSTRAL → CAUDAL canonical order (the label table order),
 * deduplicated. The `yTop`/`yBottom` fields are descriptive rendering extents
 * ("y mapping is schematic" in the data) and are NOT used for expansion —
 * `segments` is the authoritative named extent.
 */
export function expandSpinalSpan(span: SpinalSpan): string[] {
  const raw = span?.segments
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`levelAddressing: spinalSpan.segments must be a non-empty string (got ${JSON.stringify(raw)})`)
  }
  const text = raw.trim()
  const labels = text.toLowerCase() === 'all'
    ? [...SPINAL_SEGMENT_LABELS]
    : text.split(',').flatMap((token) => expandToken(token.trim()))
  const seen = new Set<number>()
  for (const label of labels) seen.add(segmentIndex(label))
  return [...seen]
    .sort((a, b) => a - b)
    .map((index) => `lvl-${SPINAL_SEGMENT_LABELS[index].toLowerCase()}`)
}
