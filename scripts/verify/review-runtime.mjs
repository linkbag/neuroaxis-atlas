/** Executes the geometry registries. It verifies integration, not anatomy. */
import assert from 'node:assert/strict'
import { registerHooks, createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(import.meta.url)
const ts = require('typescript')
registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith('file:') || !url.endsWith('.ts')) return nextLoad(url, context)
    const filename = fileURLToPath(url)
    let source = readFileSync(filename, 'utf8')
    if (filename.endsWith('vasculature-courses.ts')) {
      const directory = resolve(dirname(filename), '../data/structures')
      const modules = Object.fromEntries(readdirSync(directory).filter(p => /^vasculature-course.*\.json$/.test(p)).map(p => [p, JSON.parse(readFileSync(resolve(directory, p), 'utf8'))]))
      source = source.replace(/import\.meta\.glob\([\s\S]*?\)/, JSON.stringify(modules))
    }
    return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText }
  },
})
const nerves = await import(pathToFileURL(resolve('src/geometry/curves.ts')).href)
const vessels = await import(pathToFileURL(resolve('src/geometry/vasculature-courses.ts')).href)
assert.equal(nerves.NERVE_COURSES.length, 11, 'Eleven courses remain; misleading CN V course is withheld')
assert.ok(!nerves.NERVE_COURSES.some(r => r.id === 'nrv-cn5-trigeminal'))
const withheld = ['vasc-posterior-medial-choroidal-artery', 'vasc-pca-anterior-temporal-branches', 'vasc-pca-posterior-temporal-branches', 'vasc-mca-m4-precentral-branch', 'vasc-mca-m4-central-branch', 'vasc-pontine-perforating-arteries']
for (const id of withheld) assert.ok(!vessels.VESSEL_COURSES.some(r => r.id === id), `${id}: withheld course reached drawing registry`)
assert.equal(vessels.VESSEL_COURSES.find(r => r.id === 'vasc-sca-vermian-branches').laterality, 'paired')
const structures = readdirSync('src/data/structures').filter(p=>p.endsWith('.json')).flatMap(p=>JSON.parse(readFileSync(resolve('src/data/structures',p),'utf8')))
const byId = new Map(structures.map(r=>[r.id,r]))
for (const course of [...nerves.NERVE_COURSES, ...vessels.VESSEL_COURSES]) {
  const record = byId.get(course.id)
  assert.ok(record, `Missing authoritative record ${course.id}`)
  for (const field of ['name','function','clinical','refs']) assert.deepEqual(course[field], record[field], `${course.id}: duplicated semantic table drift in ${field}`)
}
console.log(`PASS: ${nerves.NERVE_COURSES.length} nerve and ${vessels.VESSEL_COURSES.length} vessel drawing courses execute; exclusions and authoritative semantics agree.`)
