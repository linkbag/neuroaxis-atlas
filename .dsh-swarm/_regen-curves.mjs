/**
 * Scratch build tool (cranial-nerve-render / task id `cranial-nerve-render`).
 *
 * NOT SHIPPED and not referenced by any gate — it is the recipe that produced
 * the shipped `src/geometry/curves.ts`, kept so the file can be regenerated
 * deterministically and so its provenance is auditable:
 *
 *   node .dsh-swarm/_regen-curves.mjs
 *
 * Inputs: `.dsh-swarm/_curves-helpers.txt` (the module's original helpers,
 * byte-identical to the pre-v14 file plus the ClinicalItem import),
 * `.dsh-swarm/_curves-block.txt` (the twelve authored course records) and each
 * nerve record's own `clinical` + `refs` in `src/data/structures/`.
 * Output: `src/geometry/curves.ts`, idempotently.
 *
 * Read `src/geometry/curves.ts` itself, not this file: it is the artifact.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const TARGET = 'src/geometry/curves.ts'
const HELPERS = `.dsh-swarm/_curves-helpers.txt`
const BLOCK = `.dsh-swarm/_curves-block.txt`

const read = (f) => JSON.parse(readFileSync(f, 'utf8'))
const nerves = new Map(
  [
    ...read('src/data/structures/brainstem-cranial-nerves.json'),
    ...read('src/data/structures/telencephalon-cranial-nerves.json'),
  ].map((nerve) => [nerve.id, nerve]),
)

/** `'…'` with the three escapes TypeScript needs, and nothing JSON-specific. */
const quote = (value) =>
  `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

const objectBlock = (items, indent) => {
  const pad = ' '.repeat(indent)
  if (items.length === 0) return '[]'
  const lines = items.map((item) => {
    // Two shapes reach here: a ClinicalItem object and a plain reference
    // string. Object.entries on a string would spread it character by
    // character (a literal `{ 0: 'B', 1: 'l', … }`), which is exactly the bug
    // this branch exists to prevent.
    if (typeof item === 'string') return `${pad}  ${quote(item)},`
    return (
      `${pad}  {\n` +
      Object.entries(item)
        .map(([key, value]) => `${pad}    ${key}: ${quote(value)},`)
        .join('\n') +
      `\n${pad}  },`
    )
  })
  return `[\n${lines.join('\n')}\n${pad}]`
}

let block = readFileSync(BLOCK, 'utf8').replace(/\s*$/, '\n')
let injected = 0

for (const [id, nerve] of nerves) {
  const idLine = `    id: '${id}',`
  const at = block.indexOf(idLine)
  if (at < 0) throw new Error(`course entry not found for ${id}`)
  const end = block.indexOf('\n  },\n', at)
  if (end < 0) throw new Error(`course entry end not found for ${id}`)
  const head = block.slice(0, at)
  const entry = block.slice(at, end)
  const tail = block.slice(end)
  const anchor = entry.lastIndexOf('\n    calibreMm:')
  if (anchor < 0) throw new Error(`calibreMm anchor not found for ${id}`)
  const clinical = nerve.clinical ?? []
  const refs = nerve.refs ?? []
  const inserted =
    `\n    clinical: ${objectBlock(clinical, 4)},` +
    `\n    refs: ${objectBlock(refs, 4)},`
  block = head + entry.slice(0, anchor) + inserted + entry.slice(anchor) + tail
  injected += 1
}

const helpers = readFileSync(HELPERS, 'utf8').replace(/\s*$/, '\n')
writeFileSync(TARGET, `${helpers}\n${block.replace(/^\n+/, '')}`, 'utf8')

const written = readFileSync(TARGET, 'utf8')
console.log(
  `curves.ts regenerated: ${written.length} bytes, ${written.split('\n').length} lines, ` +
    `${injected} course entries carrying clinical+refs, ` +
    `hasNerveCourse=${written.includes('export function hasNerveCourse')}`,
)
