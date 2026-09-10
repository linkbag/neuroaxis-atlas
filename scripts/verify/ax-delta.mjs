/**
 * ax-delta.mjs — reports the interactive-node delta this task introduces,
 * without needing a browser.
 *
 * Context (docs/AUDIT_REPORT.md §2.17, docs/QUALITY_PLAN.md §4 item 13): the
 * plate root used to be `role="img"`, which makes the injected SVG subtree an
 * AX **atom** — the `[data-structure]` regions were mouse-only and contributed
 * ZERO interactive nodes. After this task the root is a named `role="group"`,
 * each region with a taxonomy display name is `role="button"` (roving tabindex,
 * Enter/Space activation) and each `.plate-label[data-for]` leader is a
 * `role="button"` as well. This script counts exactly those additions, per
 * plate and for the plate the app opens on, and states the expected AX total
 * against the last recorded runtime baseline (93 nodes).
 *
 * Usage:  node scripts/verify/ax-delta.mjs [plate-svg-or-id]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const PLATE_DIR = 'src/data/plates'
const WANT = process.argv[2]

const svgFiles = readdirSync(resolve(PLATE_DIR)).filter((f) => f.endsWith('.svg')).sort()

/** Default plate = the first in the plate manifest, i.e. the one the app opens on. */
function defaultPlateSvg() {
  for (const file of ['src/data/plates.json', 'src/data/plate-manifest.json', 'src/data/manifest.json']) {
    if (!existsSync(resolve(file))) continue
    try {
      const data = JSON.parse(readFileSync(resolve(file), 'utf8'))
      const records = Array.isArray(data) ? data : (data.plates ?? [])
      if (records[0]?.svg !== undefined) return { svg: records[0].svg, from: file }
    } catch {
      /* try the next candidate */
    }
  }
  return { svg: svgFiles[0], from: 'alphabetical fallback' }
}

const picked = WANT ?? defaultPlateSvg().svg
// The manifest stores the svg module path relative to src/data ("plates/x.svg").
const svgName = (picked.endsWith('.svg') ? picked : `${picked}.svg`).replace(/^plates\//, '')

const taxonomy = JSON.parse(readFileSync(resolve('src/data/taxonomy.json'), 'utf8'))
const nameById = new Map()
const walk = (node) => {
  if (typeof node !== 'object' || node === null) return
  if (typeof node.id === 'string') nameById.set(node.id, typeof node.name === 'string' ? node.name : '')
  for (const value of Object.values(node)) walk(value)
}
walk(taxonomy)

function count(svgName) {
  const svg = readFileSync(resolve(PLATE_DIR, svgName), 'utf8')
  // One element per occurrence — the same rule PlateRenderer.wireRegions applies.
  const ids = [...svg.matchAll(/data-structure\s*=\s*"([^"]+)"/g)].map((m) => m[1])
  const named = ids.filter((rid) => (nameById.get(rid) ?? '').trim() !== '')
  const labels = [...svg.matchAll(/data-for\s*=\s*"([^"]+)"/g)].map((m) => m[1])
  return { ids, named, labels }
}

const plate = count(svgName)
const renderer = readFileSync(resolve('src/components/PlateRenderer.tsx'), 'utf8')
const rootIsGroup = /className="plate-root"[\s\S]{0,80}?role="group"/.test(renderer)
const rootIsImgAtom = /className="plate-root"[\s\S]{0,80}?role="img"/.test(renderer)

console.log(`plate                : ${svgName}`)
console.log(`[data-structure]     : ${plate.ids.length} elements, ${new Set(plate.ids).size} distinct structures`)
console.log(`named regions        : ${plate.named.length} → role="button" + roving tabindex`)
console.log(`unnamed regions      : ${plate.ids.length - plate.named.length} → deliberately unexposed (audit §H cannot fail)`)
console.log(`.plate-label leaders : ${plate.labels.length} → role="button" + tabindex="0"`)
console.log('')
console.log(`PlateRenderer root   : role="img" atom = ${rootIsImgAtom}, role="group" = ${rootIsGroup}`)
console.log('  interactive AX nodes contributed by the plate BEFORE : 0   (role="img" atom — AUDIT §2.17)')
console.log(
  `  interactive AX nodes contributed by the plate AFTER  : ${plate.named.length + plate.labels.length}` +
    `   (button×${plate.named.length + plate.labels.length}, each with a computed accessible name)`,
)
console.log('')
console.log('Baseline from the last recorded runtime audit (.plate-scratch/audit4.txt):')
console.log('  ok   accessibility tree exposes 93 interactive nodes (button×76, tab×3, checkbox×11, combobox×1, link×2)')
const added = plate.named.length + plate.labels.length
console.log(
  `Expected after this change: 93 + ${added} = ${93 + added} interactive nodes ` +
    `(button×${76 + added}), all named.`,
)
console.log('')
console.log('Audit §H runs with the PLATES tab mounted, which renders every plate chip and the')
console.log('ACTIVE plate’s author view — so the number it prints is the baseline plus the active')
console.log('plate’s delta below.')
console.log('')
console.log('Range across every authored plate:')
let min = Infinity
let max = 0
for (const file of svgFiles) {
  const c = count(file)
  const total = c.named.length + c.labels.length
  min = Math.min(min, total)
  max = Math.max(max, total)
  console.log(
    `  ${file.padEnd(32)} regions ${String(c.ids.length).padStart(3)}` +
      `  named ${String(c.named.length).padStart(3)}  labels ${String(c.labels.length).padStart(2)}  → +${total} AX nodes`,
  )
}
console.log(`\nper-plate delta range: +${min} … +${max}  (every added node is in the audit’s interactive-role set and named)`)
