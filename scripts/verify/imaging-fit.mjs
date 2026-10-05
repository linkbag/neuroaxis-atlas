/** Engineering checks, not anatomical certification. Replaces whole-head IoU
 * and frozen-byte acceptance, which do not establish anatomical registration.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { P_RAS_TO_CANON, P_RAS_TO_LPS, P_LPS_TO_CANON, apply4, mul4, invert4, toCanonicalMmAffine, mmToAuAffine } from '../lib/nifti.mjs'
import { buildGridSpec, composeCorrection, sha256, GRID_STEP } from '../lib/imaging-grid.mjs'
import { sampleSeriesAtLps } from '../lib/dicom-series.mjs'
register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href)
const { readSourceField, sourceFieldContains } = await import('../../src/components/section/sourceField.ts')
const json=p=>JSON.parse(readFileSync(p,'utf8'))
const config=json('scripts/imaging/registration.json'),spec=buildGridSpec()
const independent=json('docs/audit/2026-10-04-registration-candidate/measurements.json')
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`)
const arrays=(a,b,t=1e-6)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>close(v,b[i],t))}
arrays(apply4(P_LPS_TO_CANON,10,20,30),[10,30,-20])
arrays(apply4(P_RAS_TO_CANON,10,20,30),[-10,30,20])
arrays(mul4(P_LPS_TO_CANON,P_RAS_TO_LPS),P_RAS_TO_CANON)
arrays(toCanonicalMmAffine([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],{fromLps:true}),P_LPS_TO_CANON)
// Unequal physical steps: averaged-index sampling returns 10 at S=.75;
// actual-position interpolation must return 15, and bilinear sampling 18.
const slice=(s,v)=>({ipp:[0,0,s],projection:s,spacing:[1,1],rows:2,cols:2,data:new Uint16Array([v,v+2,v+4,v+6]),slope:1,intercept:0})
const series={normal:[0,0,1],rowDirection:[1,0,0],columnDirection:[0,1,0],slices:[slice(0,0),slice(.5,10),slice(1.5,30)]}
close(sampleSeriesAtLps(series,[0,0,.75]),15)
close(sampleSeriesAtLps(series,[.5,.5,.75]),18)
close(sampleSeriesAtLps(series,[0,0,1.5]),30)
for (const point of [[0,0,1.51],[-.1,0,.5]]) assert.ok(Number.isNaN(sampleSeriesAtLps(series,point)))
assert.ok(Number.isNaN(sampleSeriesAtLps(series,[0,0,.75],.6)),'Large gaps must remain no-data')
for (const modality of ['mri','ct']) {
  const m=json(`src/assets/imaging/${modality}-manifest.json`)
  const bytes=readFileSync(`src/assets/imaging/${modality==='mri'?'mri-t1':'ct'}.bin`)
  assert.equal(m.schemaVersion,2);assert.deepEqual(m.dims,spec.dims)
  arrays(m.originAu,spec.originAu);arrays(m.spacingAu,GRID_STEP,1e-12)
  assert.equal(bytes.length,spec.dims.reduce((a,b)=>a*b,1));assert.equal(sha256(bytes),m.dataSha256)
  assert.equal(sha256(bytes),independent.bakedHashes[modality.toUpperCase()],'Independent source check is stale')
  assert.equal(independent.sourceHashes[modality.toUpperCase()],config[modality].sourceSha256)
  assert.equal(independent.independentBakeChecks[modality.toUpperCase()].fractionWithinOneGrayLevel,1)
  const reg={...m.registration.constants};delete reg.composeOrder
  assert.deepEqual(reg,config[modality].candidate)
  assert.ok(!m.registration.display?.applied,'No extra per-plane correction may conceal the 3D fit')
  assert.equal(m.coverage.totalStations,bytes.length)
  close(m.coverage.fractionInsideFov,m.coverage.stationsInsideFov/bytes.length)
  assert.ok(m.coverage.fractionInsideFov>0)
  const record=json(config[modality].evidence)
  assert.deepEqual(record.candidate,config[modality].candidate)
  for (const r of record.observations) {
    const p=apply4(modality==='mri'?P_RAS_TO_CANON:P_LPS_TO_CANON,...r.sourcePointMm).map(v=>v/1.2)
    const q=apply4(composeCorrection(reg),...p)
    const d=Math.sqrt(r.componentMask.reduce((s,use,a)=>s+(use?(q[a]-r.targetAu[a])**2:0),0))
    close(d,r.candidateResidualAu,1e-5)
    assert.ok(['fit','holdout'].includes(r.split));assert.ok(r.uncertaintyAu>0)
  }
  console.log(`PASS ${modality.toUpperCase()}: hash, lattice, affine and ${record.observations.length} recorded observation residuals`)
  if (modality==='mri') {
    assert.equal(m.sourceGeometry.sha256,config.mri.sourceSha256)
    const forward=mul4(composeCorrection(reg),mmToAuAffine(toCanonicalMmAffine(m.sourceGeometry.voxelToRASmm)))
    arrays(m.sourceField.voxelFromAtlasAu,invert4(forward),1e-9)
    const field=readSourceField(m.sourceField)
    for (const x of [0,45,175]) for (const y of [0,100,279]) for (const z of [0,100,287]) assert.ok(sourceFieldContains(field,...apply4(forward,x,y,z)))
    for (const p of [[-.01,100,100],[100,280,100],[100,100,288]]) assert.equal(sourceFieldContains(field,...apply4(forward,...p)),false)
    assert.throws(()=>readSourceField({...m.sourceField,voxelFromAtlasAu:new Array(16).fill(0)}))
    assert.equal(m.registration.gridContinuity.stationLatticeUnchanged,true)
  } else {
    assert.equal(m.includedInApp,true)
    assert.equal(m.intensity.encoding,'prewindowed-grayscale')
    assert.deepEqual(m.windows,{brain:[-20,100]})
    assert.equal(m.intensity.noDataValue,0)
    assert.equal(m.sourceGeometry.aggregateGzipSha256,config.ct.sourceSha256)
    assert.equal(m.sourceGeometry.uniformSliceAffineUsed,false);assert.equal(m.sourceGeometry.sliceCount,463)
    assert.deepEqual(m.sourceGeometry.stepRangeMm,[.5,1.5])
    close(m.sourceGeometry.legacyAveragedPositionMaxErrorMm,1.45779220779221)
    const pp=m.sourceGeometry.physicalProjectionMm
    for (let i=1;i<pp.length;i++) assert.ok(pp[i]>pp[i-1])
    assert.equal(m.registration.reviewStatus,'provisional-owner-review')
  }
}
const reserved=json(config.mri.evidence).observations.filter(r=>r.split==='holdout')
assert.deepEqual(independent.geometryChangedSlugs,[],'Anatomy must not be reshaped to force one subject to fit')
assert.equal(independent.meshFieldChecks.length,138)
assert.equal(independent.cropOnlyExtension.stationsCompared,979371)
assert.equal(independent.cropOnlyExtension.changedStations,0)
assert.ok(reserved.length>=6 && new Set(reserved.map(r=>r.region)).size>=4)
assert.ok(reserved.some(r=>r.candidateResidualAu>r.baselineResidualAu),'Worsened observations must not be dropped')
const a=reserved.reduce((s,r)=>s+r.baselineResidualAu,0)/reserved.length,b=reserved.reduce((s,r)=>s+r.candidateResidualAu,0)/reserved.length
console.log(`MRI reserved observation mismatch: mean ${a.toFixed(2)} → ${b.toFixed(2)} au. Mixed component observations, NOT clinical registration error.`)
console.log('PASS axes, physical interpolation, source-field boundaries and candidate consistency. Owner review remains required.')
