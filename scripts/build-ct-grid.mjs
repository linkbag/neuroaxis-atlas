#!/usr/bin/env node
/** Archived CT only: correct LPS axes and actual physical slice interpolation.
 * node scripts/build-ct-grid.mjs --source <directory of J.###.gz>
 * Raw source data stays outside Git. --probe / --no-write perform no writes.
 * Public build still excludes CT. The gross atlas affine remains provisional.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCanonicalMmAffine, mmToAuAffine, apply4, invert4, mul4 } from './lib/nifti.mjs'
import { composeCorrection, buildGridSpec, gridPoint, gridManifest, parseBakeArgs, sha256 } from './lib/imaging-grid.mjs'
import { readCtSeries, sampleSeriesAtLps } from './lib/dicom-series.mjs'

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const args=parseBakeArgs(process.argv.slice(2))
if (args.registration!=='candidate') throw new Error('Historical CT uses the archived audit script; this baker only writes corrected physical geometry.')
const dir=resolve(args.source ?? join(ROOT,'assets-src/imaging2/vhp-ct'))
if (!existsSync(dir)) throw new Error('Missing CT source. Pass --source <directory>; no output was changed.')
const config=JSON.parse(readFileSync(join(ROOT,'scripts/imaging/registration.json'),'utf8')).ct
const series=readCtSeries(dir), ss=series.slices
if (series.sourceSha256!==config.sourceSha256) throw new Error('This affine is tied to the audited source CT; source hash differs. No output was changed.')
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
const patientToAtlas=mul4(composeCorrection(config.candidate),mmToAuAffine(toCanonicalMmAffine(identity,{fromLps:true})))
const atlasToPatient=invert4(patientToAtlas)
const spec=buildGridSpec(),[nx,ny,nz]=spec.dims,grid=new Uint8Array(nx*ny*nz)
const window=[-20,100], maxGapMm=1.6, rowInside=new Uint32Array(ny)
let inside=0
for (let k=0;k<nz;k++) for (let j=0;j<ny;j++) for (let i=0;i<nx;i++) {
  const patient=apply4(atlasToPatient,...gridPoint(spec,i,j,k))
  const hu=sampleSeriesAtLps(series,patient,maxGapMm)
  if (!Number.isFinite(hu)) continue
  inside++;rowInside[j]++
  // 0 means no acquisition support. 1 can still be air, not brain tissue.
  grid[(k*ny+j)*nx+i]=Math.max(1,Math.round(Math.max(0,Math.min(255,(hu-window[0])*255/(window[1]-window[0])))))
}
if (!inside) throw new Error('No CT acquisition support; no files written.')
const gaps=ss.slice(1).map((s,i)=>({from:ss[i].file,to:s.file,stepMm:s.projection-ss[i].projection}))
const meanStep=(ss.at(-1).projection-ss[0].projection)/(ss.length-1)
const oldPositionError=Math.max(...ss.map((s,i)=>Math.abs(s.projection-ss[0].projection-i*meanStep)))
const levels=JSON.parse(readFileSync(join(ROOT,'src/data/levels.json'),'utf8'))
const manifest={
  ...gridManifest(spec),status:'available',modality:'CT',publiclyAvailable:false,
  source:'NLM Visible Human Project — Additional Head Images CT',license:'NLM Terms and Conditions',
  sourceUrl:'https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Additional-Head-Images/MR_CT_DICOM/CAT/',
  termsUrl:'https://www.nlm.nih.gov/databases/download/terms_and_conditions.html',
  credit:'Courtesy of the U.S. National Library of Medicine',
  attribution:'Courtesy of the U.S. National Library of Medicine. Historical CT source for an archived teaching review; NLM does not endorse NeuroAxis.',
  sourceGeometry:{aggregateGzipSha256:series.sourceSha256,sliceCount:ss.length,dims:[ss[0].cols,ss[0].rows,ss.length],
    imageOrientationPatient:ss[0].iop,pixelSpacingMm:ss[0].spacing,anatomicalOrientation:'BIPED (default when absent)',
    slicePositionsPatientMm:ss.map(s=>s.ipp),physicalProjectionMm:ss.map(s=>s.projection),
    stepRangeMm:[Math.min(...gaps.map(g=>g.stepMm)),Math.max(...gaps.map(g=>g.stepMm))],
    nonNominalSteps:gaps.filter(g=>Math.abs(g.stepMm-.5)>1e-5),nominalSliceThicknessMm:ss[0].thickness,
    uniformSliceAffineUsed:false,legacyAveragedPositionMaxErrorMm:oldPositionError},
  sampling:{method:'Bilinear HU within each physical IOP/IPP plane, linear interpolation between actual slice projections.',
    maxInterpolationGapMm:maxGapMm,outsideSupport:'No extrapolation. Gaps above the limit and outside the source field remain no-data (0).',
    patientLpsToAtlasAu:Array.from(patientToAtlas)},
  coverage:{sourceFov:'Acquisition support, not brain tissue segmentation or anatomical agreement.',stationsInsideFov:inside,totalStations:grid.length,fractionInsideFov:inside/grid.length,
    levelRowsAu:levels.map(l=>{const j=Math.round((l.y-spec.originAu[1])/spec.spacingAu[1]);return {level:l.id,yTarget:l.y,y:j>=0&&j<ny?spec.originAu[1]+j*spec.spacingAu[1]:null,pct:j>=0&&j<ny?100*rowInside[j]/(nx*nz):0}})},
  intensity:{dtype:'uint8',window,backgroundValue:0,minimumInsideValue:1,note:'Low-HU air also maps to 1; nonzero does not establish brain tissue.'},windows:{brain:window,bone:[-500,1500]},
  registration:{frame:'DICOM LPS → canonical L/S/A = (+LPS x, +LPS z, -LPS y) / 1.2',constants:config.candidate,
    appliedIn:'3D physical resampling; no per-plane display warp',reviewStatus:'provisional-archive-only',evidence:config.evidence,limitations:config.limitations,
    residuals:{coverageNote:'CT remains excluded from the public app. Physical orientation and interpolation are corrected; gross placement is provisional, with source artifacts and unresolved fine structures.'}},
  dataSha256:sha256(grid),generatedBy:'scripts/build-ct-grid.mjs',
}
console.log(`[ct-grid] ${ss.length} physical slices; steps ${manifest.sourceGeometry.stepRangeMm.join('…')} mm; former uniform-step error ${oldPositionError.toFixed(6)} mm`)
console.log(`[ct-grid] ${spec.dims.join('×')} / ${grid.length} B; source support ${(100*inside/grid.length).toFixed(2)}%. Provisional archive; CT is excluded from public views.`)
if (args.write) {
  const out=resolve(args.outDir ?? join(ROOT,'src/assets/imaging'))
  mkdirSync(out,{recursive:true});writeFileSync(join(out,'ct.bin'),grid);writeFileSync(join(out,'ct-manifest.json'),JSON.stringify(manifest,null,2)+'\n')
  console.log(`[ct-grid] wrote ${out}`)
} else console.log('[ct-grid] no files written')
