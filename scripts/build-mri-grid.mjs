#!/usr/bin/env node
/**
 * Bake the original OpenNeuro T1 into the atlas frame. Use --source for raw data
 * outside Git. This is a global teaching affine, not a patient registration.
 *
 * node scripts/build-mri-grid.mjs --source <sub-A006_T1w.nii.gz>
 * --registration baseline --out-dir <scratch> checks the crop-only extension.
 * --probe / --no-write never change output files. All QA precedes writes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readNifti, toCanonicalMmAffine, mmToAuAffine, apply4, invert4, mul4, sampleVoxelTrilinear } from './lib/nifti.mjs'
import { MM_PER_AU, buildGridSpec, gridPoint, composeCorrection, affineBounds, gridManifest, parseBakeArgs, hashFile, sha256 } from './lib/imaging-grid.mjs'

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const args=parseBakeArgs(process.argv.slice(2))
const path=resolve(args.source ?? join(ROOT,'assets-src/imaging/mri/sub-A006_T1w.nii.gz'))
if (!existsSync(path)) throw new Error('Missing original MRI. Pass --source <NIfTI>; no output was changed.')
const config=JSON.parse(readFileSync(join(ROOT,'scripts/imaging/registration.json'),'utf8')).mri
const sourceHash=hashFile(path)
if (sourceHash!==config.sourceSha256) throw new Error('This affine is tied to the audited source MRI; source hash differs. No output was changed.')
const vol=readNifti(path)
if (vol.header.numVolumes!==1) throw new Error('Only a single 3D T1 volume is supported.')
const base=mmToAuAffine(toCanonicalMmAffine(vol.affine),MM_PER_AU)
const registration=config[args.registration]
const voxelToAtlas=mul4(composeCorrection(registration),base)
const atlasToVoxel=invert4(voxelToAtlas)
const spec=buildGridSpec()
const [nx,ny,nz]=spec.dims

// Keep the PREVIOUS intensity mapping. Re-measure its original core stations
// under the baseline affine, rather than change contrast when alignment changes.
const oldInverse=invert4(mul4(composeCorrection(config.baseline),base))
const coreSpec={dims:[45,81,67],originAu:[-27,-55,-56],spacingAu:[54/44,100/80,82/66]}
const core=[]
for (let k=0;k<67;k++) for (let j=0;j<81;j++) for (let i=0;i<45;i++) {
  const p=gridPoint(coreSpec,i,j,k), q=apply4(oldInverse,...p)
  const v=sampleVoxelTrilinear(vol.data,vol.dims,...q)
  if (Number.isFinite(v)) core.push(v)
}
core.sort((a,b)=>a-b)
const percentile=p=>core[Math.max(0,Math.min(core.length-1,Math.ceil(p/100*core.length)-1))]
const window=[percentile(1),percentile(99.5)]
if (!window.every(Number.isFinite) || window[1]<=window[0]) throw new Error('Invalid raw intensity window; no files written.')
const grid=new Uint8Array(nx*ny*nz)
const rowInside=new Uint32Array(ny)
let inside=0
for (let k=0;k<nz;k++) for (let j=0;j<ny;j++) for (let i=0;i<nx;i++) {
  const p=gridPoint(spec,i,j,k), q=apply4(atlasToVoxel,...p)
  const v=sampleVoxelTrilinear(vol.data,vol.dims,...q)
  if (!Number.isFinite(v)) continue // No extrapolation or invented image tissue.
  inside++;rowInside[j]++
  grid[(k*ny+j)*nx+i]=Math.round(Math.max(0,Math.min(255,(v-window[0])*255/(window[1]-window[0]))))
}
if (!inside) throw new Error('No source coverage; no files written.')
const levels=JSON.parse(readFileSync(join(ROOT,'src/data/levels.json'),'utf8'))
const manifest={
  ...gridManifest(spec),status:'available',modality:'MRI',
  source:'ds007313 doi:10.18112/openneuro.ds007313.v1.0.0',license:'CC0',
  attribution:'OpenNeuro ds007313 v1.0.0 (CC0). Dataset authors: Landelle, Kinany, St-Onge, Lungu, Van De Ville, Misic, Marchand-Pauvert, De Leener, Doyon. sub-A006/anat/sub-A006_T1w.nii.gz. A single participant; not an atlas segmentation.',
  sourceGeometry:{filename:'sub-A006_T1w.nii.gz',sha256:sourceHash,dims:vol.dims,affineSource:vol.affineSource,voxelToRASmm:Array.from(vol.affine)},
  sourceField:{dims:vol.dims,voxelFromAtlasAu:Array.from(atlasToVoxel),boundsAu:affineBounds(voxelToAtlas,vol.dims)},
  coverage:{sourceFov:'Original NIfTI acquisition field. FOV coverage is not segmented brain agreement.',stationsInsideFov:inside,totalStations:grid.length,fractionInsideFov:inside/grid.length,
    outsideSourceDisplay:'Transparent; simulated contours may remain beyond coverage.',
    levelRowsAu:levels.map(l=>{const j=Math.round((l.y-spec.originAu[1])/spec.spacingAu[1]);return {level:l.id,yTarget:l.y,y:j>=0&&j<ny?spec.originAu[1]+j*spec.spacingAu[1]:null,present:j>=0&&j<ny,pct:j>=0&&j<ny?100*rowInside[j]/(nx*nz):0}})},
  intensity:{dtype:'uint8',windowRawValues:window,windowPercentiles:[1,99.5],backgroundValue:0,windowRegionAu:{x:[-27,27],y:[-55,45],z:[-56,26]},
    windowRegionNote:'Measured on the baseline affine and original core lattice; intensity mapping is unchanged by field expansion or refit. Zero can be dark tissue or background; sourceField determines actual acquisition coverage.'},
  registration:{frame:'NIfTI RAS+ → canonical L/S/A; 1 au = 1.2 mm',constants:{...registration,composeOrder:"p' = T · Rx·Ry·Rz · S · p (canonical au)"},
    appliedIn:'3D resampling, not a separate per-plane display warp',method:'Constrained diagonal affine from manual macroscopic observations; fixed zero rotation.',
    evidence:config.evidence,limitations:config.limitations,
    reviewStatus:args.registration==='baseline'?'baseline-reconstruction':'candidate-awaiting-owner-review',
    gridContinuity:{affineUnchanged:args.registration==='baseline',stationLatticeUnchanged:true,intensityWindowUnchanged:true,
      note:'Integer stations were added to the existing lattice. With the candidate affine, station positions are preserved but intensities intentionally change.'}},
  dataSha256:sha256(grid),generatedBy:'scripts/build-mri-grid.mjs',
}
console.log(`[mri-grid] ${args.registration}: ${spec.dims.join('×')} / ${grid.length} B; source coverage ${(100*inside/grid.length).toFixed(2)}%; window ${window.join(' / ')}`)
console.log(`[mri-grid] scales ${registration.scale.join('/')} / translation ${registration.translateAu.join('/')}; manual teaching alignment, not clinical certification`)
if (args.write) {
  const out=resolve(args.outDir ?? join(ROOT,'src/assets/imaging'))
  mkdirSync(out,{recursive:true})
  writeFileSync(join(out,'mri-t1.bin'),grid)
  writeFileSync(join(out,'mri-manifest.json'),JSON.stringify(manifest,null,2)+'\n')
  console.log(`[mri-grid] wrote ${out}`)
} else console.log('[mri-grid] no files written')
