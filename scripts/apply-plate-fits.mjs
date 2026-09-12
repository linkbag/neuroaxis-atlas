/**
 * scripts/apply-plate-fits.mjs — write the fitter's ACCEPTED plate corrections into
 * `src/data/sectionImages.ts`.
 *
 * WHY THIS IS A SEPARATE, COMMITTED STEP (v9 orchestrator). The fitter measures and
 * decides; it does not rewrite a TypeScript source file. The task that produced the
 * measurement kept its applier in `.dsh-scratch/` (gitignored), so the accepted
 * corrections never reached the shipped data and `scripts/verify/imaging-fit.mjs`
 * failed with "sectionImages.ts carries the accepted correction — expected to find
 * `  12: { scale: 3.32688,`…". This script is that step, committed and idempotent.
 *
 * CONTRACT
 *  - Input: `src/assets/imaging/plate-fit.json` (the fitter's record) — nothing else
 *    is read, and the numbers are never edited by hand here.
 *  - Only plates whose gate verdict is `improved` AND that carry an accepted
 *    `proposedFit` are written; every other plate's `fittedFit` is left OUT (so it
 *    keeps drawing its committed baseline placement), which is what the gate asserts.
 *  - Only the two `ubcHFittedFit` / `ubcCFittedFit` table BODIES are rewritten, in
 *    the file's own one-entry-per-line style, sorted by plate index. Everything else
 *    in `sectionImages.ts` is untouched — byte-for-byte outside those two ranges.
 *  - Idempotent: running it twice produces an identical file. Run it after
 *    `node scripts/fit-imaging-affine.mjs --report`.
 *
 * HOW THE FIELDS MAP (measured → committed)
 *  - `scale`  = the plate's own world scale in px per au, as the fitter's
 *               `proposedFit.scale` states it (the same unit as `UBC_C_FIT_SCALE`).
 *  - `dx`,`dy`= the fitted in-plane offsets in au, from `proposedFit`.
 *  - `residualAu` = the measured centroid residual AFTER the correction;
 *    `iouBefore`/`iouAfter` = the ROI overlap the gate compared.
 *
 * Usage: node scripts/apply-plate-fits.mjs           (writes; prints a per-plate table)
 *        node scripts/apply-plate-fits.mjs --dry     (prints, writes nothing)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PLATE_RECORD_PATH = 'src/assets/imaging/plate-fit.json'
const SECTION_IMAGES_PATH = 'src/data/sectionImages.ts'
const DRY = process.argv.includes('--dry')

const record = JSON.parse(readFileSync(resolve(PLATE_RECORD_PATH), 'utf8'))
const measured = Array.isArray(record.measured) ? record.measured : []

/** `ubc-h12` / `ubc-c07` → { series: 'h'|'c', index: number }, else null. */
function plateKey(id) {
  const m = /^ubc-([hc])(\d+)$/.exec(String(id))
  return m === null ? null : { series: m[1], index: Number(m[2]) }
}

/** The accepted correction of one plate, or null when the gate kept the baseline. */
function acceptedFit(row) {
  if (row?.status !== 'improved') return null
  const p = row.proposedFit
  if (p === undefined || p === null) return null
  for (const field of ['scale', 'dx', 'dy']) {
    if (!Number.isFinite(p[field])) return null
  }
  const after = row.centroidResidualAfterAu
  if (!Number.isFinite(after)) return null
  if (!Number.isFinite(row.iouBefore) || !Number.isFinite(row.iouAfter)) return null
  return { scale: p.scale, dx: p.dx, dy: p.dy, residualAu: after, iouBefore: row.iouBefore, iouAfter: row.iouAfter }
}

const accepted = { h: new Map(), c: new Map() }
const refused = []
for (const row of measured) {
  const key = plateKey(row.id ?? row.file?.replace(/\.[a-z]+$/i, ''))
  if (key === null) { refused.push(`${row.id ?? row.file}: not a ubc-h/ubc-c plate`); continue }
  const fit = acceptedFit(row)
  if (fit === null) { refused.push(`${row.id}: ${row.status ?? 'no status'} — ${String(row.applyReason ?? 'kept').slice(0, 110)}`); continue }
  accepted[key.series].set(key.index, fit)
}

/** One number in the source's own style.
 *
 *  This must round to 6 decimals and then stringify — NOT `toFixed(6)`. The gate
 *  builds its expectation as `` `  ${index}: { scale: ${Math.round(v * 1e6) / 1e6},` ``
 *  (`scripts/verify/imaging-fit.mjs`), so a value that survives rounding with a
 *  trailing zero (`3.108820`) fails a text search for `3.10882` even though the
 *  number is identical. Formatting it the gate's way keeps the two in step. */
function num(value, decimals = 6) {
  const factor = 10 ** decimals
  return String(Math.round(value * factor) / factor)
}

/** One table body line, in the file's existing style and numeric precision. */
function line(index, fit) {
  return `  ${index}: { scale: ${num(fit.scale)}, dx: ${num(fit.dx)}, dy: ${num(fit.dy)}, residualAu: ${num(fit.residualAu)}, iouBefore: ${num(fit.iouBefore)}, iouAfter: ${num(fit.iouAfter)} },`
}

function body(map) {
  return [...map.keys()].sort((a, b) => a - b).map((i) => line(i, map.get(i))).join('\n')
}

const source = readFileSync(resolve(SECTION_IMAGES_PATH), 'utf8')

/** Replace the entries between a table's declaration line and its closing `}` at column 0.
 *
 *  The declaration line is matched as "const <name> … {" to the end of the LINE
 *  rather than by pattern-matching the type annotation: the annotation itself
 *  contains braces (`Record<number, { scale: number; … }>`), so a `[^}]*`-style
 *  pattern stops at the first inner `}` and never matches. Line endings are matched
 *  as `\r?\n` because this repository's working copies are CRLF. */
function replaceTable(text, tableName, entries) {
  const head = new RegExp(`(const ${tableName}\\b[^\\r\\n]*\\{[\\r]?\\n)`, 'm')
  const match = head.exec(text)
  if (match === null) throw new Error(`could not find the ${tableName} declaration in ${SECTION_IMAGES_PATH}`)
  const start = match.index + match[1].length
  const tail = /\r?\n\}\r?\n/.exec(text.slice(start))
  if (tail === null) throw new Error(`could not find the end of ${tableName}`)
  const end = start + tail.index
  const before = text.slice(start, end)
  const after = entries.length === 0 ? '' : `${entries}`
  return { text: text.slice(0, start) + after + text.slice(end), before, after }
}

const h = replaceTable(source, 'ubcHFittedFit', body(accepted.h))
const c = replaceTable(h.text, 'ubcCFittedFit', body(accepted.c))

console.log(`plate-fit.json: ${measured.length} measured plate(s)`)
console.log(`accepted: ${accepted.h.size} horizontal (h), ${accepted.c.size} coronal (c)`)
for (const series of ['h', 'c']) {
  for (const [index, fit] of [...accepted[series].entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ubc-${series}${String(index).padStart(2, '0')}  scale ${fit.scale.toFixed(4)} px/au  d(${fit.dx}, ${fit.dy}) au  residual ${fit.residualAu.toFixed(2)} au  IoU ${fit.iouBefore.toFixed(3)} → ${fit.iouAfter.toFixed(3)}`)
  }
}
if (refused.length > 0) {
  console.log(`\nkept at the committed baseline (${refused.length}) — every one with its own measured reason:`)
  for (const r of refused) console.log(`  ${r}`)
}

const changedH = h.before !== h.after
const changedC = c.before !== c.after
if (!changedH && !changedC) {
  console.log('\nnothing to write — the committed tables already match the measurement')
  process.exit(0)
}
if (DRY) {
  console.log('\ndry run — nothing written')
  process.exit(0)
}
writeFileSync(resolve(SECTION_IMAGES_PATH), c.text)
console.log(`\nwrote ${SECTION_IMAGES_PATH}: ubcHFittedFit ${changedH ? 'updated' : 'unchanged'}, ubcCFittedFit ${changedC ? 'updated' : 'unchanged'}`)
console.log('verify with: node scripts/verify/imaging-fit.mjs')
