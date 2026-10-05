/** Review integrity, not a scientific-accuracy certification. */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const fragments = readdirSync('src/data/structures').filter(p => p.endsWith('.json'))
const structures = fragments.flatMap(p => json(join('src/data/structures', p)))
const tracts = json('src/data/tracts.json')
const records = [...structures, ...tracts]
const byId = new Map(records.map(r => [r.id, r]))
assert.equal(byId.size, records.length, 'Duplicate authored record ID')
const taxonomy = json('src/data/taxonomy.json')
const registry = new Map(taxonomy.map(r => [r.id, r]))
for (const r of structures) {
  const entry = registry.get(r.id)
  assert.ok(entry, `${r.id}: missing taxonomy`)
  for (const field of ['name', 'region', 'subdivision', 'kind', 'laterality']) assert.equal(entry[field], r[field], `${r.id}: registry drift in ${field}`)
  for (const field of ['anatomicalClass', 'anatomicalLaterality']) assert.equal(entry[field], r[field], `${r.id}: registry drift in ${field}`)
}
for (const r of records) {
  assert.ok(r.refs?.length, `${r.id}: no evidence reference`)
  assert.ok(r.refs.some(s => /pp?\.|Figure|https:\/\//.test(s)), `${r.id}: lacks traceable page/figure or publication URL`)
  assert.ok(!r.refs.some(s => /Fiester|3rd ed.*Blumenfeld|Blumenfeld.*3rd ed/.test(s)), `${r.id}: unaudited/misattributed source`)
}
const pathways = json('src/data/pathways.json')
assert.equal(new Set(pathways.map(p => p.id)).size, pathways.length)
const categories = new Set(['Motor', 'Sensory', 'Cerebellar', 'Memory and limbic', 'Autonomic', 'Association'])
for (const p of pathways) {
  assert.match(p.id, /^path-[a-z0-9-]+$/)
  assert.ok(categories.has(p.category), `${p.id}: unknown category`)
  for (const k of ['name', 'summary', 'organization', 'clinical']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id}: missing ${k}`)
  assert.ok(p.refs?.length && p.steps?.length >= 3, `${p.id}: missing sources/route`)
  for (const step of p.steps) {
    assert.ok(step.label?.trim(), `${p.id}: unnamed step`)
    if (step.structureId) assert.ok(byId.has(step.structureId), `${p.id}: dangling relay ${step.structureId}`)
  }
}
const dir = 'docs/audit/2026-10-04'
const ledgers = ['brainstem-diencephalon.json', 'telencephalon.json', 'vascular-ventricular.json', 'tracts.json']
const reviewed = new Set()
for (const file of ledgers) {
  assert.ok(existsSync(join(dir, file)), `Missing audit ledger: ${file}`)
  const data = json(join(dir, file))
  const entries = Array.isArray(data) ? data : data.records ?? data.structures
  assert.ok(Array.isArray(entries), `${file}: records ledger missing`)
  for (const r of entries) {
    assert.ok(!reviewed.has(r.id), `Record audited in multiple domain ledgers: ${r.id}`)
    reviewed.add(r.id)
  }
}
for (const r of records) assert.ok(reviewed.has(r.id), `Record omitted from scientific review: ${r.id}`)
const brainstem = json(join(dir, 'brainstem-diencephalon.json'))
const reviewedSyndromes = new Set(brainstem.syndromes.map(s => s.id))
const syndromes = readdirSync('src/data/syndromes').filter(p => p.endsWith('.json')).flatMap(p => json(join('src/data/syndromes', p)))
for (const s of syndromes) {
  assert.ok(reviewedSyndromes.has(s.id), `${s.id}: syndrome omitted from review`)
  for (const id of s.structures ?? []) assert.ok(byId.has(id), `${s.id}: dangling syndrome structure ${id}`)
}
assert.equal(byId.get('tract-anterior-spinocerebellar').meshes, false, 'Known incorrect midbrain crossing must not render')
assert.match(readFileSync('src/components/viewer3d/SceneLayers.tsx', 'utf8'), /tract\.meshes !== false/)
assert.equal(byId.get('vasc-posterior-medial-choroidal-artery').meshes, false, 'Incorrect choroidal route must not render')
assert.match(readFileSync('src/geometry/vasculature-courses.ts', 'utf8'), /if \(course\.meshes === false\) continue/)
assert.equal(byId.get('ctx-internal-capsule').meshes, false, 'Whole white matter is not an isolated capsule')
console.log(`PASS: ${records.length} authored records and ${syndromes.length} syndromes covered; ${pathways.length} sourced pathways have valid relays. Geometry remains schematic and unvalidated.`)
