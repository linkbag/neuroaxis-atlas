import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const catalog = readFileSync('src/data/sectionImages.ts', 'utf8')
assert.match(catalog, /sectionImages: SectionImage\[\] = \[\]/, 'Photograph catalog must be empty')
assert.doesNotMatch(catalog, /import.*assets\/imaging\/stains/, 'Photograph import in public module')
const layers = readFileSync('src/components/section/imageLayers.ts', 'utf8')
assert.match(layers, /import.*ct\.bin\?url/, 'Corrected CT volume must be imported')
assert.match(layers, /ctManifest\.includedInApp === true/, 'CT availability must follow its manifest')
const state = readFileSync('src/state/store.ts', 'utf8')
assert.ok(/export const SECTION_UNDERLAY_KINDS[^=]*=\s*\[\s*'mri',\s*'ct',\s*'none',?\s*\]/.test(state), 'MRI/CT/simulated choices only')
assert.ok(/platesMode: 'live', sectionAxis: 'y'/.test(state), 'Live transverse Plates default')
assert.ok(/snapToPlate:\s*false/.test(state), 'Snap default must be off')
assert.ok(/CT_WINDOW_PRESETS[^=]*=\s*\['brain'\]/.test(state), 'Prewindowed CT cannot offer a bone preset')
const ct = JSON.parse(readFileSync('src/assets/imaging/ct-manifest.json', 'utf8'))
assert.equal(ct.includedInApp, true)
assert.equal(ct.intensity.encoding, 'prewindowed-grayscale')
assert.deepEqual(ct.windows, { brain: [-20, 100] })
assert.equal(ct.intensity.noDataValue, 0)
assert.equal(ct.credit, 'Courtesy of the U.S. National Library of Medicine')
assert.equal(ct.registration.reviewStatus, 'provisional-owner-review')
assert.doesNotMatch(layers, /ctColorizeFromWindow/, 'Do not window grayscale bytes as raw HU')
const rights = readFileSync('src/components/RightsModal.tsx', 'utf8')
assert.ok(rights.includes(ct.credit) && rights.includes(ct.termsUrl), 'CT source credit and terms are required')
if (process.argv.includes('--dist')) {
  assert.ok(existsSync('dist/assets'), 'Build required for asset inspection')
  const assets = readdirSync('dist/assets')
  const forbidden = assets.filter(name => /^(?:ubc-|vhp-|msu-|wikict-)/i.test(name))
  assert.deepEqual(forbidden, [], 'Photograph assets shipped in dist')
  for (const modality of ['mri', 'ct']) {
    const manifest = JSON.parse(readFileSync(`src/assets/imaging/${modality}-manifest.json`, 'utf8'))
    const prefix = modality === 'mri' ? 'mri-t1-' : 'ct-'
    const bins = assets.filter(name => name.startsWith(prefix) && name.endsWith('.bin'))
    assert.equal(bins.length, 1, `${modality} grid missing or duplicated in dist`)
    const hash = createHash('sha256').update(readFileSync(`dist/assets/${bins[0]}`)).digest('hex')
    assert.equal(hash, manifest.dataSha256, `${modality} production bytes differ from reviewed grid`)
  }
  console.log(`PASS: ${assets.length} built assets inspected; MRI and corrected CT present, photos absent; hashes match.`)
} else console.log('PASS: candidate imagery is MRI/CT/simulated only; credits, fixed CT brain window and requested defaults preserved.')
