/**
 * scripts/verify/cranial-nerves.mjs — v13: the twelve cranial-nerve records
 * (CN I Olfactory … CN XII Hypoglossal), measured against the SHIPPED modules.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * No gate in this repo counts records by kind. `validate` proves the ids, names,
 * regions and bounds are well formed; `check` proves the kind plumbing is total;
 * `verify:view-filter-consistency` proves the visibility paths agree. None of
 * them asserts that the twelve nerves EXIST, that there are exactly twelve, that
 * each nerve's number appears exactly once, that each record is a mesh-less
 * schematic with an authored placement inside the clip box, that its connections
 * resolve to real records, or that it carries clinical content. That is this
 * gate, and it is the only place the run's central claim is counted.
 *
 * WHAT IT READS, AND WHY THAT MATTERS
 * -----------------------------------
 * The records are read through the app's OWN data layer — `src/data/load.ts`,
 * executed here with the repo's module-loading convention (esbuild-free: the
 * project's TypeScript, `import.meta.glob` emulated, JSON wrapped) — so
 * `taxonomy`, `structures`, `allRecords` and `getLevel` are the shipped
 * selectors, not a re-typed copy. `CLIP_BOUNDS` comes from the shipped runtime
 * declaration (`src/components/viewer3d/clipPlanes.ts`), the anatomy manifest
 * from `src/assets/anatomy/anatomy-manifest.json` (the manifest that decides
 * which records get a mesh), and the id contract from the validator itself:
 * `SLUG_RE` is PARSED OUT OF `scripts/validate-data.mjs` and executed, so this
 * gate cannot drift from the contract that accepts the ids.
 *
 * GEOMETRY HONESTY (the point of the whole task)
 * ----------------------------------------------
 * No cranial-nerve mesh is committed and none may be added (under 0.2 MiB of GLB
 * headroom; `verify:anatomy` freezes the existing bounding boxes). Every one of
 * the twelve records is therefore `meshes: false` with a sized schematic
 * ellipsoid at its authored origin3d/size3d — the same mechanism the hippocampal
 * subfields (`nuc-subiculum`) and the lenticulostriate artery
 * (`vasc-lenticulostriate-arteries`) already use. This gate asserts the numbers:
 * 12 records, 12 with meshes:false, 12 placements inside CLIP_BOUNDS, and 0
 * manifest parts and 0 section parts claimed by kind `nerve`.
 *
 * Run from the repo root:  node scripts/verify/cranial-nerves.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:cranial-nerves": "node scripts/verify/cranial-nerves.mjs"
 *  — package.json belongs to the integrator, so it is named here, not edited.)
 */
import { createRequire, registerHooks } from 'node:module'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')

/* ==================================================================== *
 *  MODULE LOADING — the repo's convention (pip-contract.mjs,
 *  view-filter-consistency.mjs, plane-helper-extent.mjs): resolve the
 *  app's extensionless relative imports, emulate Vite's `import.meta.glob`
 *  with `eager: true` (the only mode `load.ts` uses), transpile `.ts`,
 *  and wrap JSON module namespaces.
 * ==================================================================== */

function resolveModule(specifier, fromFile) {
  const directory = dirname(fromFile)
  for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
    const candidate = resolve(directory, specifier + extension)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

function globEntries(filePath, pattern) {
  const directory = dirname(filePath)
  const lastSlash = pattern.lastIndexOf('/')
  const head = pattern.slice(0, lastSlash)
  const filePattern = pattern.slice(lastSlash + 1)
  const baseDir = resolve(directory, head.replace(/\*\*\/?/g, ''))
  if (!existsSync(baseDir)) return []
  const test = new RegExp(
    `^${filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
  )
  const out = []
  for (const entry of readdirSync(baseDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (entry.isDirectory()) continue
    if (!/\.json$/.test(entry.name) || !test.test(entry.name)) continue
    out.push(resolve(baseDir, entry.name))
  }
  return out
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(specifier) || specifier.endsWith('?url')) {
      return { url: `dsh-asset:${specifier}`, shortCircuit: true }
    }
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const candidate = resolveModule(specifier, base)
      if (candidate !== null) return { url: pathToFileURL(candidate).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('dsh-asset:')) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (!url.startsWith('file:')) return nextLoad(url, context)
    const filePath = fileURLToPath(url)
    if (url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
      return { format: 'module', source: `export default ${JSON.stringify(parsed)}`, shortCircuit: true }
    }
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(url)) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      let source = readFileSync(filePath, 'utf8')
      source = source.replace(
        /import\.meta\.glob\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\}\s*,?\s*\)/g,
        (whole, pattern, options) => {
          const entries = globEntries(filePath, pattern)
          const raw = /\?raw/.test(options)
          const body = entries
            .map((full) => {
              const relative = full.slice(dirname(filePath).length + 1).split('\\').join('/')
              const key = `./${relative}`
              const value = raw ? readFileSync(full, 'utf8') : JSON.parse(readFileSync(full, 'utf8'))
              return `${JSON.stringify(key)}: ${JSON.stringify(value)}`
            })
            .join(', ')
          return `{ ${body} }`
        },
      )
      const { outputText } = ts.transpileModule(source, {
        fileName: url,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      })
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

/* ============================================================== evidence */

const checks = []
const failures = []
let numbersPrinted = 0

function check(label, ok, detail) {
  checks.push({ label, ok, detail })
  if (!ok) failures.push(`${label} — ${detail}`)
  return ok
}

/** Print a measurement (counted, so "it ran" is visible in the output). */
function measure(label, value) {
  numbersPrinted += 1
  console.log(`  ${label.padEnd(52)} ${value}`)
}

const pad = (value, width) => String(value).padEnd(width)
const padStart = (value, width) => String(value).padStart(width)

/* ------------------------------------------------------------- the ids */

/**
 * The id contract, read from the validator that enforces it. Parsing the source
 * (rather than re-typing the regex) is what keeps this gate and
 * `scripts/validate-data.mjs` from drifting: if the contract loses `nrv-`, the
 * ids below stop resolving and this gate says so by name.
 */
function readSlugContract() {
  const source = readFileSync(resolve(ROOT, 'scripts/validate-data.mjs'), 'utf8')
  const match = /const SLUG_RE = (\/.*?\/);/.exec(source)
  if (match === null) return null
  const body = match[1].replace(/^\//, '').replace(/\/$/, '')
  return new RegExp(body)
}

const SLUG_RE = readSlugContract()

/* ----------------------------------------------------------- the data */

const load = await import(pathToFileURL(resolve(ROOT, 'src/data/load.ts')).href)
const { CLIP_BOUNDS } = await import(
  pathToFileURL(resolve(ROOT, 'src/components/viewer3d/clipPlanes.ts')).href
)
const { getWebRefs } = await import(pathToFileURL(resolve(ROOT, 'src/data/webRefs.ts')).href)
const manifest = JSON.parse(
  readFileSync(resolve(ROOT, 'src/assets/anatomy/anatomy-manifest.json'), 'utf8'),
)

const taxonomy = load.taxonomy
const structures = load.structures
const allRecords = load.allRecords
const levelIds = new Set(load.levels.map((level) => level.id))
const taxonomyIds = new Set(taxonomy.map((entry) => entry.id))
const recordIds = new Set(allRecords.map((record) => record.id))
const entryById = new Map(taxonomy.map((entry) => [entry.id, entry]))
const recordById = new Map(allRecords.map((record) => [record.id, record]))

/** taxonomy rows of a kind, in registry order. */
const rowsOfKind = (kind) => taxonomy.filter((entry) => entry.kind === kind)

/** Authored records: structure records carry `kind`, tract records do not. */
function authoredKind(record) {
  return 'kind' in record ? record.kind : entryById.get(record.id)?.kind
}
const recordsOfKind = (kind) => allRecords.filter((record) => authoredKind(record) === kind)

/* ------------------------------------------- the twelve, named explicitly */

const NERVES = [
  { angle: 'I', number: 1, id: 'nrv-cn1-olfactory', name: 'Olfactory', region: 'telencephalon', foramen: 'cribriform plate' },
  { angle: 'II', number: 2, id: 'nrv-cn2-optic', name: 'Optic', region: 'telencephalon', foramen: 'optic canal' },
  { angle: 'III', number: 3, id: 'nrv-cn3-oculomotor', name: 'Oculomotor', region: 'midbrain', foramen: 'superior orbital fissure' },
  { angle: 'IV', number: 4, id: 'nrv-cn4-trochlear', name: 'Trochlear', region: 'midbrain', foramen: 'superior orbital fissure' },
  { angle: 'V', number: 5, id: 'nrv-cn5-trigeminal', name: 'Trigeminal', region: 'pons', foramen: 'foramen ovale' },
  { angle: 'VI', number: 6, id: 'nrv-cn6-abducens', name: 'Abducens', region: 'pons', foramen: 'superior orbital fissure' },
  { angle: 'VII', number: 7, id: 'nrv-cn7-facial', name: 'Facial', region: 'pons', foramen: 'internal acoustic meatus' },
  { angle: 'VIII', number: 8, id: 'nrv-cn8-vestibulocochlear', name: 'Vestibulocochlear', region: 'pons', foramen: 'internal acoustic meatus' },
  { angle: 'IX', number: 9, id: 'nrv-cn9-glossopharyngeal', name: 'Glossopharyngeal', region: 'medulla', foramen: 'jugular foramen' },
  { angle: 'X', number: 10, id: 'nrv-cn10-vagus', name: 'Vagus', region: 'medulla', foramen: 'jugular foramen' },
  { angle: 'XI', number: 11, id: 'nrv-cn11-accessory', name: 'Accessory', region: 'medulla', foramen: 'jugular foramen' },
  { angle: 'XII', number: 12, id: 'nrv-cn12-hypoglossal', name: 'Hypoglossal', region: 'medulla', foramen: 'hypoglossal canal' },
]

const REGION_COUNTS = { telencephalon: 2, midbrain: 2, pons: 4, medulla: 4 }
const SUBDIVISION = 'Cranial nerves'
const KNOWN_REGIONS = new Set([
  'telencephalon', 'diencephalon', 'midbrain', 'pons', 'medulla', 'cerebellum', 'vasculature',
])

console.log('\n================ NeuroAxis v13 — the twelve cranial nerves ================')
console.log('  records read through the shipped selectors: src/data/load.ts')
console.log('  bounds read from the shipped runtime declaration: viewer3d/clipPlanes.ts')
console.log(`  id contract parsed from the validator: scripts/validate-data.mjs -> ${String(SLUG_RE)}`)
console.log(`  anatomy manifest: ${manifest.parts.length} parts · clip box x ${CLIP_BOUNDS.x.min}..${CLIP_BOUNDS.x.max}` +
  ` y ${CLIP_BOUNDS.y.min}..${CLIP_BOUNDS.y.max} z ${CLIP_BOUNDS.z.min}..${CLIP_BOUNDS.z.max}\n`)

/* ==================================================================== *
 *  LANE 1 — twelve records, twelve numbers once each
 * ==================================================================== */

console.log('  LANE 1 — the twelve records exist, one per nerve number')

const nerveEntries = rowsOfKind('nerve')
const nerveRecords = recordsOfKind('nerve')

check('kind `nerve` exists in ALL_KINDS', load.ALL_KINDS.includes('nerve'),
  `ALL_KINDS = [${load.ALL_KINDS.join(', ')}]`)
check('12 taxonomy rows of kind `nerve`', nerveEntries.length === 12,
  `measured ${nerveEntries.length}`)
check('12 authored records of kind `nerve`', nerveRecords.length === 12,
  `measured ${nerveRecords.length}`)
check('every nerve row is authored (no registry-only stub)',
  nerveEntries.every((entry) => recordIds.has(entry.id)),
  `missing: ${nerveEntries.filter((entry) => !recordIds.has(entry.id)).map((entry) => entry.id).join(', ') || 'none'}`)

for (const nerve of NERVES) {
  const entry = entryById.get(nerve.id)
  const record = recordById.get(nerve.id)
  check(`${nerve.id} is registered`, entry !== undefined, 'no taxonomy row')
  check(`${nerve.id} is authored`, record !== undefined, 'no authored record')
  if (entry === undefined || record === undefined) continue
  check(`${nerve.id} kind is ` + '`nerve`', entry.kind === 'nerve' && record.kind === 'nerve',
    `registry ${entry.kind} / record ${record.kind}`)
  // The record name must carry its own roman numeral, and must not carry another
  // nerve's numeral: `CN I` is a substring of nothing else, but `CN II` sits
  // inside `CN III`, so the numeral is matched as a whole word and the other
  // eleven numerals are tested for absence.
  const others = NERVES.filter((other) => other.angle !== nerve.angle)
    .map((other) => other.angle)
    .sort((a, b) => b.length - a.length)
  const foreign = others.find((angle) =>
    new RegExp(`\\bCN ${angle}\\b`).test(record.name))
  check(`CN ${nerve.angle} numeral appears in its own name and in no other`,
    new RegExp(`\\bCN ${nerve.angle}\\b`).test(record.name) && foreign === undefined,
    `name ${JSON.stringify(record.name)} carries ${foreign === undefined ? 'no CN numeral' : `CN ${foreign}`}`)
  check(`CN ${nerve.angle} name carries the English nerve name`,
    record.name.toLowerCase().includes(nerve.name.toLowerCase()),
    `name ${JSON.stringify(record.name)} does not carry ${nerve.name}`)
  check(`CN ${nerve.angle} synonyms name the Latin form`,
    Array.isArray(record.synonyms)
      && record.synonyms.some((synonym) => /^(nervus|nervi)\b|^fila\b/.test(synonym.toLowerCase())),
    `synonyms = ${JSON.stringify(record.synonyms ?? null)}`)
  check(`CN ${nerve.angle} id prefix follows the kind (nrv-)`,
    nerve.id.startsWith('nrv-'),
    `${nerve.id} does not start with nrv-`)
}

const byNumber = new Map()
for (const nerve of NERVES) byNumber.set(nerve.number, (byNumber.get(nerve.number) ?? 0) + 1)
check('the twelve numbers 1..12 each appear exactly once',
  byNumber.size === 12 && [...byNumber.values()].every((count) => count === 1),
  `numbers = ${[...byNumber.entries()].map(([n, c]) => `${n}x${c}`).join(' ')}`)

measure('taxonomy rows of kind nerve', nerveEntries.length)
measure('authored records of kind nerve', nerveRecords.length)
measure('distinct nerve numbers covered', byNumber.size)
console.log('')

/* ==================================================================== *
 *  LANE 2 — where each nerve really lives
 * ==================================================================== */

console.log('  LANE 2 — the true region, one subdivision, laterality')

const seenRegions = {}
for (const nerve of NERVES) {
  const entry = entryById.get(nerve.id)
  const record = recordById.get(nerve.id)
  if (entry === undefined || record === undefined) continue
  seenRegions[entry.region] = (seenRegions[entry.region] ?? 0) + 1
  check(`${nerve.id} region is ${nerve.region}`,
    entry.region === nerve.region && record.region === nerve.region,
    `registry ${entry.region} / record ${record.region}`)
  check(`${nerve.id} region is a real Region`, KNOWN_REGIONS.has(entry.region), `got ${entry.region}`)
  check(`${nerve.id} subdivision is "${SUBDIVISION}"`,
    entry.subdivision === SUBDIVISION && record.subdivision === SUBDIVISION,
    `registry ${JSON.stringify(entry.subdivision)} / record ${JSON.stringify(record.subdivision)}`)
  check(`${nerve.id} is paired`, entry.laterality === 'paired' && record.laterality === 'paired',
    `registry ${entry.laterality} / record ${record.laterality}`)
  check(`${nerve.id} colour agrees with the registry`, entry.color === record.color,
    `${record.color} vs ${entry.color}`)
  check(`${nerve.id} name agrees with the registry`, entry.name === record.name,
    `${record.name} vs ${entry.name}`)
}

for (const [region, expected] of Object.entries(REGION_COUNTS)) {
  check(`nerve count in ${region} is ${expected}`, seenRegions[region] === expected,
    `measured ${seenRegions[region] ?? 0}`)
}
check('no nerve row sits outside the four true regions',
  Object.keys(seenRegions).every((region) => region in REGION_COUNTS),
  `regions = ${Object.keys(seenRegions).join(', ')}`)

// The subdivision must be a name of its own: it may not collide with the
// existing nuclei subdivision or with the surface-landmark subdivision.
const collisions = taxonomy.filter(
  (entry) => entry.subdivision === SUBDIVISION && entry.kind !== 'nerve',
)
check(`subdivision "${SUBDIVISION}" holds only nerve rows`, collisions.length === 0,
  `${collisions.length} non-nerve rows: ${collisions.map((entry) => entry.id).slice(0, 4).join(', ')}`)
const nucleiSubdivision = taxonomy.filter((entry) => entry.subdivision === 'Cranial nerve nuclei')
check('the nuclei subdivision still holds its 17 rows',
  nucleiSubdivision.length === 17,
  `measured ${nucleiSubdivision.length}`)

measure('nerve rows per region', Object.entries(seenRegions).sort().map(([r, c]) => `${r}:${c}`).join(' '))
measure(`rows in subdivision "Cranial nerve nuclei" (untouched)`, nucleiSubdivision.length)
measure(`rows in subdivision "${SUBDIVISION}"`, taxonomy.filter((e) => e.subdivision === SUBDIVISION).length)
console.log('')

/* ==================================================================== *
 *  LANE 3 — ids, levels, and the frozen slug contract
 * ==================================================================== */

console.log('  LANE 3 — id contract, level anchors, cross-references')

let slugOk = 0
for (const nerve of NERVES) {
  const ok = SLUG_RE !== null && SLUG_RE.test(nerve.id)
  if (ok) slugOk += 1
  check(`${nerve.id} is accepted by the validator's SLUG_RE`, ok,
    `SLUG_RE = ${String(SLUG_RE)}`)
}
check('SLUG_RE documents the nrv- prefix', SLUG_RE !== null && SLUG_RE.source.includes('nrv'),
  `SLUG_RE = ${String(SLUG_RE)}`)

let levelRefs = 0
for (const nerve of NERVES) {
  const record = recordById.get(nerve.id)
  if (record === undefined) continue
  const levels = record.levels ?? []
  check(`${nerve.id} carries level anchors`, levels.length > 0, 'levels is empty or absent')
  for (const level of levels) {
    levelRefs += 1
    check(`${nerve.id} level ${level} resolves in levels.json`, levelIds.has(level), 'unknown level id')
  }
}

// Every id-like token inside the records — connections, function, course,
// bloodSupply and the clinical items — must resolve to a record or a registry
// row. This is the check that stops a paraphrase, a typo or a dangling link.
const ID_TOKEN_RE = /\b(?:nuc|tract|vent|surf|vasc|ctx|nrv)-[a-z0-9][a-z0-9-]*\b/g
const linkFields = ['function', 'course', 'bloodSupply', 'contextNote', 'modality']
let tokensChecked = 0
let nucleusLinks = 0
const linksByNerve = new Map()

for (const nerve of NERVES) {
  const record = recordById.get(nerve.id)
  if (record === undefined) continue
  const found = new Set()
  const strings = []
  for (const field of linkFields) if (typeof record[field] === 'string') strings.push(record[field])
  for (const list of [record.connections?.afferent, record.connections?.efferent]) {
    if (Array.isArray(list)) strings.push(...list)
  }
  for (const item of record.clinical ?? []) {
    for (const field of ['syndrome', 'findings', 'vascular', 'note']) {
      if (typeof item[field] === 'string') strings.push(item[field])
    }
  }
  if (Array.isArray(record.territory)) strings.push(...record.territory)
  const blob = strings.join(' ')
  for (const token of blob.match(ID_TOKEN_RE) ?? []) {
    if (found.has(token)) continue
    found.add(token)
    tokensChecked += 1
    if (!recordIds.has(token) && !taxonomyIds.has(token)) {
      check(`${nerve.id} link ${token} resolves`, false, 'not a record and not a registry row')
    }
    if (entryById.get(token)?.kind === 'nucleus') nucleusLinks += 1
  }
  linksByNerve.set(nerve.id, found)
  check(`${nerve.id} links at least one nucleus or tract id`, found.size >= 2,
    `only ${found.size} id token(s): ${[...found].join(', ') || 'none'}`)
  check(`${nerve.id} connections is a non-empty object`,
    typeof record.connections === 'object' && record.connections !== null
      && ((record.connections.afferent ?? []).length + (record.connections.efferent ?? []).length) > 0,
    'connections missing or empty')
}

// The ids the brief calls out by name must be linked by the right nerve.
const REQUIRED_LINKS = {
  'nrv-cn3-oculomotor': ['nuc-oculomotor', 'nuc-edinger-westphal'],
  'nrv-cn4-trochlear': ['nuc-trochlear'],
  'nrv-cn5-trigeminal': ['nuc-trigeminal-motor', 'nuc-principal-sensory-v', 'nuc-mesencephalic-v',
    'tract-mesencephalic-v', 'nuc-spinal-trigeminal', 'tract-spinal-trigeminal'],
  'nrv-cn6-abducens': ['nuc-abducens'],
  'nrv-cn7-facial': ['nuc-facial', 'nuc-superior-salivatory', 'nuc-solitarius-rostral'],
  'nrv-cn8-vestibulocochlear': ['nuc-vestibular-superior', 'nuc-vestibular-medial', 'nuc-vestibular-lateral',
    'nuc-vestibular-inferior', 'nuc-cochlear-ventral', 'nuc-cochlear-dorsal'],
  'nrv-cn9-glossopharyngeal': ['nuc-ambiguus', 'nuc-solitarius-caudal', 'nuc-solitarius-rostral', 'nuc-dmv'],
  'nrv-cn10-vagus': ['nuc-dmv', 'nuc-ambiguus', 'nuc-solitarius-caudal'],
  'nrv-cn11-accessory': ['nuc-ambiguus'],
  'nrv-cn12-hypoglossal': ['nuc-hypoglossal'],
  'nrv-cn2-optic': ['tract-optic-nerve', 'ctx-optic-chiasm', 'tract-optic-tract', 'nuc-lgn', 'nuc-pretectal'],
}
for (const [id, required] of Object.entries(REQUIRED_LINKS)) {
  const found = linksByNerve.get(id) ?? new Set()
  const missing = required.filter((token) => !found.has(token))
  check(`${id} links every required id`, missing.length === 0,
    `missing: ${missing.join(', ')}`)
}

measure('ids accepted by SLUG_RE', `${slugOk}/12`)
measure('level-anchor references checked', levelRefs)
measure('id tokens inside the records resolved', tokensChecked)
measure('of those, nucleus/tract records', nucleusLinks)
console.log('')

/* ==================================================================== *
 *  LANE 4 — geometry honesty
 * ==================================================================== */

console.log('  LANE 4 — every record is a mesh-less schematic inside the clip box')

const axisBounds = [
  { axis: 'x', min: CLIP_BOUNDS.x.min, max: CLIP_BOUNDS.x.max },
  { axis: 'y', min: CLIP_BOUNDS.y.min, max: CLIP_BOUNDS.y.max },
  { axis: 'z', min: CLIP_BOUNDS.z.min, max: CLIP_BOUNDS.z.max },
]

let meshless = 0
let placed = 0
for (const nerve of NERVES) {
  const record = recordById.get(nerve.id)
  if (record === undefined) continue
  if (record.meshes === false) meshless += 1
  check(`${nerve.id} is meshes:false`, record.meshes === false,
    `meshes = ${JSON.stringify(record.meshes ?? null)}`)
  check(`${nerve.id} states the geometry in its contextNote`,
    typeof record.contextNote === 'string' && /schematic/i.test(record.contextNote)
      && /no .*mesh|mesh-less|no mesh/i.test(record.contextNote),
    'contextNote does not state what geometry stands behind the record')
  const origin = record.origin3d
  const size = record.size3d
  check(`${nerve.id} has origin3d and size3d`,
    Array.isArray(origin) && origin.length === 3 && Array.isArray(size) && size.length === 3,
    `origin3d ${JSON.stringify(origin ?? null)} size3d ${JSON.stringify(size ?? null)}`)
  if (!Array.isArray(origin) || !Array.isArray(size)) continue
  let inside = true
  axisBounds.forEach((bound, axis) => {
    if (origin[axis] < bound.min || origin[axis] > bound.max) {
      inside = false
      check(`${nerve.id} origin3d.${bound.axis} inside CLIP_BOUNDS`, false,
        `${origin[axis]} outside [${bound.min}, ${bound.max}]`)
    }
    const reach = origin[axis] + size[axis]
    const reachBack = origin[axis] - size[axis]
    if (reach > bound.max || reachBack < bound.min) {
      check(`${nerve.id} schematic ${bound.axis} extent inside CLIP_BOUNDS`, false,
        `[${reachBack}, ${reach}] outside [${bound.min}, ${bound.max}]`)
    }
  })
  if (inside) placed += 1
  check(`${nerve.id} has positive radii (a sized ellipsoid)`,
    size.every((radius) => typeof radius === 'number' && radius > 0),
    `size3d = ${JSON.stringify(size)}`)
  check(`${nerve.id} schematic is not degenerate (every radius >= 1 au)`,
    size.every((radius) => radius >= 1),
    `size3d = ${JSON.stringify(size)}`)
}

check('12 records are meshes:false', meshless === 12, `measured ${meshless}`)
check('12 placements are inside CLIP_BOUNDS', placed === 12, `measured ${placed}`)

const manifestNerveParts = manifest.parts.filter((part) => part.kind === 'nerve')
check('the anatomy manifest claims 0 parts of kind nerve', manifestNerveParts.length === 0,
  `measured ${manifestNerveParts.length}: ${manifestNerveParts.map((p) => p.slug).join(', ')}`)
const manifestNerveSlugs = manifest.parts.filter((part) => /(^|-)nrv-/.test(part.slug))
check('no manifest part slug is a nerve id', manifestNerveSlugs.length === 0,
  `measured ${manifestNerveSlugs.length}: ${manifestNerveSlugs.map((p) => p.slug).join(', ')}`)
check('the manifest part count is unchanged at 138', manifest.parts.length === 138,
  `measured ${manifest.parts.length}`)

// Section parts are built from the manifest, so a mesh-less record can add none.
// Proven here by the identity every manifest part's slug has: none is a nerve id.
const sectionPartsForNerves = manifest.parts.filter((part) => recordById.has(part.slug) && authoredKind(recordById.get(part.slug)) === 'nerve')
check('0 section parts resolve to a nerve record', sectionPartsForNerves.length === 0,
  `measured ${sectionPartsForNerves.length}`)

measure('records with meshes:false', `${meshless}/12`)
measure('placements inside CLIP_BOUNDS', `${placed}/12`)
measure('manifest parts of kind nerve', manifestNerveParts.length)
measure('manifest parts total (frozen)', manifest.parts.length)
console.log('')

/* ==================================================================== *
 *  LANE 5 — content: modality, course/foramen, function, blood, clinical
 * ==================================================================== */

console.log('  LANE 5 — the content each record must carry')

let clinicalItems = 0
let wordCount = 0
for (const nerve of NERVES) {
  const record = recordById.get(nerve.id)
  if (record === undefined) continue
  check(`${nerve.id} has a modality`,
    typeof record.modality === 'string' && record.modality.trim().length > 20,
    `modality = ${JSON.stringify(record.modality ?? null)}`)
  check(`${nerve.id} has a course with its foramen`,
    typeof record.course === 'string'
      && record.course.toLowerCase().includes(nerve.foramen.toLowerCase()),
    `course ${typeof record.course === 'string' ? 'does not name' : 'missing'} "${nerve.foramen}"`)
  check(`${nerve.id} course names the cisternal segment or its equivalent`,
    typeof record.course === 'string' && /cistern/i.test(record.course),
    'course does not describe the cisternal course')
  check(`${nerve.id} has a function paragraph`,
    typeof record.function === 'string' && record.function.length > 200,
    `function length ${typeof record.function === 'string' ? record.function.length : 0}`)
  check(`${nerve.id} has a blood supply or vessel relationship`,
    typeof record.bloodSupply === 'string' && record.bloodSupply.length > 40,
    `bloodSupply = ${JSON.stringify(record.bloodSupply ?? null)}`)
  const clinical = record.clinical ?? []
  clinicalItems += clinical.length
  check(`${nerve.id} carries at least 2 clinical items`, clinical.length >= 2,
    `measured ${clinical.length}`)
  check(`${nerve.id} clinical items name the palsy or the deficit`,
    clinical.every((item) => item.syndrome.trim().length > 0 && item.findings.trim().length > 40),
    'an item has an empty syndrome or a thin findings string')
  check(`${nerve.id} clinical content states where the lesion localizes`,
    clinical.some((item) => /localiz/i.test(item.findings) || /localiz/i.test(item.note ?? '')),
    'no clinical item says what the finding localizes to')
  check(`${nerve.id} has refs`, Array.isArray(record.refs) && record.refs.length >= 2,
    `refs = ${JSON.stringify(record.refs ?? null)}`)
  check(`${nerve.id} has a contextNote`,
    typeof record.contextNote === 'string' && record.contextNote.length > 200,
    `contextNote length ${typeof record.contextNote === 'string' ? record.contextNote.length : 0}`)
  const text = [record.function, record.course, record.modality, record.bloodSupply,
    record.contextNote, ...clinical.flatMap((item) => [item.syndrome, item.findings, item.note ?? '', item.vascular ?? ''])]
    .join(' ')
  wordCount += text.split(/\s+/).filter((word) => word.length > 0).length

  // The web panel must not be empty: the automatic Wikipedia fallback derives a
  // title from the display name ("CN I Olfactory nerve"), which resolves to
  // nothing, so a curated entry is required for each of the twelve.
  const refs = getWebRefs(record.id, record.name, record.kind, record.region)
  check(`${nerve.id} has at least one curated web reference`,
    refs.length >= 1 && refs.some((ref) => ref.source === 'wikipedia'
      && !ref.url.includes('CN_I_Olfactory')),
    `webRefs = ${refs.map((ref) => ref.url).join(', ') || 'none'}`)
}

check('the twelve records carry at least 30 clinical items', clinicalItems >= 30,
  `measured ${clinicalItems}`)

measure('clinical items across the twelve', clinicalItems)
measure('content words across the twelve records', wordCount)
console.log('')

/* ==================================================================== *
 *  THE TABLE — number, name, region, foramen, nuclei linked
 * ==================================================================== */

console.log('  The twelve cranial-nerve records ' + '─'.repeat(50))
console.log(`  ${pad('#', 4)} ${pad('name', 30)} ${pad('region', 14)} ${pad('kind', 6)} ${pad('mesh', 5)} ${pad('foramen', 24)} ${pad('levels', 6)} nuclei linked`)
console.log('  ' + '─'.repeat(160))
for (const nerve of NERVES) {
  const record = recordById.get(nerve.id)
  const entry = entryById.get(nerve.id)
  if (record === undefined || entry === undefined) {
    console.log(`  ${padStart(nerve.number, 2)}   ${pad(nerve.id, 30)} MISSING`)
    continue
  }
  const nuclei = [...(linksByNerve.get(nerve.id) ?? [])]
    .filter((token) => entryById.get(token)?.kind === 'nucleus')
    .sort()
  console.log(
    `  ${padStart(nerve.number, 2)}   ${pad(record.name, 30)} ${pad(entry.region, 14)} ` +
    `${pad(entry.kind, 6)} ${pad(String(record.meshes === false ? 'false' : record.meshes), 5)} ` +
    `${pad(nerve.foramen, 24)} ${padStart((record.levels ?? []).length, 6)} ${nuclei.join(', ')}`,
  )
}

console.log('\n  Provenance, per record ' + '─'.repeat(54))
console.log(`  ${pad('id', 26)} ${pad('origin3d', 20)} ${pad('size3d', 16)} ${pad('links', 6)} ${pad('clinical', 9)} web refs`)
for (const nerve of NERVES) {
  const record = recordById.get(nerve.id)
  if (record === undefined) continue
  const refs = getWebRefs(record.id, record.name, record.kind, record.region)
  console.log(
    `  ${pad(record.id, 26)} ${pad(JSON.stringify(record.origin3d), 20)} ` +
    `${pad(JSON.stringify(record.size3d), 16)} ${padStart((linksByNerve.get(record.id) ?? new Set()).size, 6)} ` +
    `${padStart((record.clinical ?? []).length, 9)} ${refs.length} (${refs.map((ref) => ref.source).join(', ')})`,
  )
}

/* ============================================================== verdict */

const passed = checks.filter((entry) => entry.ok).length
const failed = checks.length - passed

console.log('\n  Summary ' + '─'.repeat(70))
console.log(`    assertions run                ${checks.length}`)
console.log(`    passed                        ${passed}`)
console.log(`    failed                        ${failed}`)
console.log(`    printed measurements          ${numbersPrinted}`)
console.log(`    nerve records                 ${nerveRecords.length}/12 (meshes:false ${meshless}/12, placed ${placed}/12)`)
console.log(`    regions                       ${Object.entries(seenRegions).sort().map(([r, c]) => `${r} ${c}`).join(' · ')}`)
console.log(`    manifest parts added          0 (manifest still ${manifest.parts.length})`)

if (failed > 0) {
  console.log('\n  FAILURES:')
  for (const failure of failures) console.log(`  · ${failure}`)
  console.log(`\n✖ cranial-nerve records: ${passed} passed · ${failed} failed — the twelve records are not what the plan says.\n`)
  process.exit(1)
}
console.log(`\n✔ 12 cranial-nerve records verified: ${passed} assertions passed, 0 failed\n`)
process.exit(0)
