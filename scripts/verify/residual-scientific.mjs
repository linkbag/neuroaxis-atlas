/** Guards previously corrected content relationships; does not certify anatomy. */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
const json = p => JSON.parse(readFileSync(p, 'utf8'))
const records = [...readdirSync('src/data/structures').filter(p => p.endsWith('.json')).flatMap(p => json(`src/data/structures/${p}`)), ...json('src/data/tracts.json')]
const byId = new Map(records.map(r => [r.id, r]))
const audit = json('docs/audit/2026-10-05-residual/coverage.json')
assert.equal(audit.baselineCommit, '7baa2d63d2e01dc0f36bd94a49abfa2812287d0b')
assert.equal(new Set(audit.recordIds).size, audit.recordIds.length, 'Duplicate review assignments')
assert.deepEqual([...audit.recordIds].sort(), [...byId.keys()].sort(), 'Current records need complete residual-review coverage')
const syndromes = readdirSync('src/data/syndromes').filter(p => p.endsWith('.json')).flatMap(p => json(`src/data/syndromes/${p}`))
assert.deepEqual([...audit.syndromeIds].sort(), syndromes.map(s => s.id).sort())
assert.deepEqual([...audit.pathwayIds].sort(), json('src/data/pathways.json').map(p => p.id).sort())
assert.deepEqual([...audit.plateIds].sort(), json('src/data/plates.json').map(p => p.id).sort())

assert.ok(!byId.get('nuc-dentate-gyrus').synonyms.some(s => /CA5/i.test(s)), 'Dentate is not a CA5 field')
assert.ok(!byId.get('ctx-s1-hand').synonyms.some(s => /hand knob/i.test(s)), 'Precentral motor landmark is not an S1 identity')
for (const id of ['nuc-hippocampus', 'nuc-dentate-gyrus', 'nuc-subiculum', 'nuc-ca1', 'nuc-ca2-ca3', 'nuc-ca4']) {
  assert.match(byId.get(id).anatomicalClass, /hippocampal/, `${id}: laminated tissue needs an anatomical class distinct from its rendering group`)
}
for (const id of ['nuc-hypoglossal', 'nuc-trochlear', 'ctx-internal-medullary-lamina']) {
  assert.equal(byId.get(id).anatomicalLaterality, 'paired', `${id}: anatomy is paired despite compressed schematic marker`)
}
assert.ok(!byId.get('vasc-middle-cerebral-artery').connections.efferent.some(s => /anterior choroidal/i.test(s)), 'ICA sibling is not an MCA efferent')
assert.ok(!byId.get('vasc-vertebral-artery').connections.afferent.some(s => /muscular|radicular/i.test(s)), 'Vertebral branches are not ordinary inflow')
assert.ok(!byId.get('vasc-sca-lateral-branch').supply.includes('syn-nothnagel'))
assert.ok(!byId.get('vasc-pica-telovelotonsillar-segment').supply.includes('syn-lateral-medullary'))

const plates = json('src/data/plates.json')
for (const plate of plates) {
  const svg = readFileSync(`src/data/${plate.svg}`, 'utf8')
  const frame = svg.match(/<g class="plate-frame">([\s\S]*?)<\/g>/)?.[1]
  assert.ok(frame, `${plate.id}: missing orientation frame`)
  const markers = Object.fromEntries([...frame.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([A-Z])<\/text>/g)].map(m => [m[3], { x: Number(m[1]), y: Number(m[2]) }]))
  if (plate.orientation === 'sagittal') {
    assert.ok(markers.A.x < markers.P.x, `${plate.id}: drawn frontal/pontine anatomy is anterior on image-left`)
    assert.ok(markers.S.y < markers.I.y)
  } else if (plate.orientation === 'transverse') {
    assert.ok(markers.P.y < markers.A.y, `${plate.id}: dorsal/posterior anatomy is at diagram-top`)
    assert.ok(markers.R.x < markers.L.x)
  } else {
    assert.ok(markers.S.y < markers.I.y)
    assert.ok(markers.R.x < markers.L.x)
  }
}
for (const [id, slug] of [['plate-sensory-decuss', 'tract-corticospinal-lateral'], ['plate-pyramid-decuss', 'tract-internal-arcuate']]) {
  const plate = plates.find(p => p.id === id)
  assert.ok(!plate.regions.some(r => r.slug === slug), `${id}: incorrect section overlay returned`)
  assert.ok(!readFileSync(`src/data/${plate.svg}`, 'utf8').includes(`data-structure="${slug}"`))
}
console.log(`PASS: residual-review coverage for ${records.length} records, ${syndromes.length} syndromes, ${audit.pathwayIds.length} pathways and ${plates.length} plates; corrected anatomical relationships and orientation frames retained.`)
