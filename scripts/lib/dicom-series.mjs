/** Limited reader for the NLM VHP CT: uncompressed explicit-VR little-endian,
 * unsigned 16-bit containers, parallel BIPED slices. Not a general DICOM SDK.
 * Samples in physical LPS using each slice's IOP/IPP, never an averaged z step.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { sha256 } from './imaging-grid.mjs'

const LONG=new Set(['OB','OD','OF','OL','OV','OW','SQ','UC','UR','UT','UN'])
const VR=new Set(['AE','AS','AT','CS','DA','DS','DT','FD','FL','IS','LO','LT','OB','OD','OF','OL','OV','OW','PN','SH','SL','SQ','SS','ST','SV','TM','UC','UI','UL','UN','UR','US','UT','UV'])
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0)
const near=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<=1e-5)

function parse(buf) {
  if (buf.length<132 || buf.toString('ascii',128,132)!=='DICM') throw new Error('Expected a DICOM Part 10 file.')
  const tags=new Map()
  let off=132
  while (off+8<=buf.length) {
    const g=buf.readUInt16LE(off), e=buf.readUInt16LE(off+2)
    const key=`${g.toString(16).padStart(4,'0')},${e.toString(16).padStart(4,'0')}`
    const vr=buf.toString('ascii',off+4,off+6)
    if (!VR.has(vr)) throw new Error('Only explicit-VR little-endian DICOM is supported.')
    const long=LONG.has(vr)
    if (long&&off+12>buf.length) throw new Error('Truncated DICOM element.')
    const len=long?buf.readUInt32LE(off+8):buf.readUInt16LE(off+6), start=off+(long?12:8)
    if (len===0xffffffff) throw new Error('Undefined-length sequences are unsupported by this limited reader.')
    if (start+len>buf.length) throw new Error('Truncated DICOM value.')
    if (!tags.has(key)) tags.set(key,{start,len})
    if (key==='7fe0,0010') break
    off=start+len
  }
  const str=key=>{const t=tags.get(key);return t?buf.toString('ascii',t.start,t.start+t.len).replace(/\0/g,'').trim():null}
  const nums=key=>str(key)?.split('\\').map(Number)
  const u16=key=>{const t=tags.get(key);return t?buf.readUInt16LE(t.start):null}
  return {tags,str,nums,u16}
}

export function readCtSeries(dir) {
  const files=readdirSync(dir).filter(f=>/^J\.\d{3}\.gz$/.test(f)).sort()
  if (!files.length) throw new Error('No J.###.gz CT slices; no output was changed.')
  const sourceHash=createHash('sha256')
  const slices=files.map(file=>{
    const compressed=readFileSync(join(dir,file));sourceHash.update(file);sourceHash.update(Buffer.from(sha256(compressed),'hex'))
    const buf=gunzipSync(compressed), p=parse(buf)
    if (p.str('0002,0010')!=='1.2.840.10008.1.2.1') throw new Error(`${file}: unsupported transfer syntax`)
    if (p.u16('0028,0100')!==16 || p.u16('0028,0103')!==0 || p.u16('0028,0002')!==1) throw new Error(`${file}: expected unsigned monochrome 16-bit storage`)
    const orientation=p.str('0010,2210')
    if (orientation && orientation!=='BIPED') throw new Error(`${file}: only BIPED patient geometry is supported`)
    const rows=p.u16('0028,0010'), cols=p.u16('0028,0011'), px=p.tags.get('7fe0,0010')
    const ipp=p.nums('0020,0032'), iop=p.nums('0020,0037'), spacing=p.nums('0028,0030')
    if (!rows || !cols || !px || px.len!==rows*cols*2 || ipp?.length!==3 || iop?.length!==6 || spacing?.length!==2 || ![...ipp,...iop,...spacing].every(Number.isFinite) || spacing.some(v=>v<=0)) throw new Error(`${file}: invalid CT geometry or pixels`)
    const slope=p.nums('0028,1053')?.[0]??1, intercept=p.nums('0028,1052')?.[0]??0
    if (!Number.isFinite(slope) || !Number.isFinite(intercept) || !slope) throw new Error(`${file}: invalid rescale`)
    const data=new Uint16Array(rows*cols)
    for (let i=0;i<data.length;i++) data[i]=buf.readUInt16LE(px.start+i*2)
    return {file,rows,cols,ipp,iop,spacing,slope,intercept,data,thickness:p.nums('0018,0050')?.[0]??null}
  })
  const s=slices[0], r=s.iop.slice(0,3), c=s.iop.slice(3,6)
  if (Math.abs(dot(r,r)-1)>1e-5 || Math.abs(dot(c,c)-1)>1e-5 || Math.abs(dot(r,c))>1e-5) throw new Error('IOP must define orthonormal in-plane axes.')
  const normal=[r[1]*c[2]-r[2]*c[1],r[2]*c[0]-r[0]*c[2],r[0]*c[1]-r[1]*c[0]]
  for (const slice of slices) {
    if (slice.rows!==s.rows || slice.cols!==s.cols || !near(slice.iop,s.iop) || !near(slice.spacing,s.spacing)) throw new Error('CT slices must have consistent dimensions, orientation and spacing.')
    slice.projection=dot(slice.ipp,normal)
  }
  slices.sort((a,b)=>a.projection-b.projection)
  for (let i=1;i<slices.length;i++) if (slices[i].projection-slices[i-1].projection<=1e-6) throw new Error('Duplicate CT slice positions are unsupported.')
  return {slices,normal,rowDirection:r,columnDirection:c,sourceSha256:sourceHash.digest('hex')}
}

/** Bilinear HU on one physical slice. Missing in-plane data returns NaN. */
function bilinear(slice,patient,r,c) {
  const delta=patient.map((v,i)=>v-slice.ipp[i])
  const x=dot(delta,r)/slice.spacing[1], y=dot(delta,c)/slice.spacing[0]
  if (!(x>=0&&y>=0&&x<=slice.cols-1&&y<=slice.rows-1)) return NaN
  const i=Math.floor(x), j=Math.floor(y), i1=Math.min(i+1,slice.cols-1), j1=Math.min(j+1,slice.rows-1), fx=x-i, fy=y-j
  const at=(x,y)=>slice.data[y*slice.cols+x]
  const raw=(at(i,j)*(1-fx)+at(i1,j)*fx)*(1-fy)+(at(i,j1)*(1-fx)+at(i1,j1)*fx)*fy
  return raw*slice.slope+slice.intercept
}

/** Interpolate by actual IPP distances. Large acquisition gaps are not filled.
 * At an exact physical slice, only that slice is used (including last slice).
 */
export function sampleSeriesAtLps(series,patient,maxGapMm=1.6) {
  const ss=series.slices, p=dot(patient,series.normal)
  if (p<ss[0].projection-1e-8 || p>ss.at(-1).projection+1e-8) return NaN
  let lo=0, hi=ss.length-1
  while (lo<hi) {const mid=(lo+hi)>>1;if(ss[mid].projection<p)lo=mid+1;else hi=mid}
  const upper=ss[lo]
  if (Math.abs(upper.projection-p)<1e-8) return bilinear(upper,patient,series.rowDirection,series.columnDirection)
  if (lo===0) return NaN
  const lower=ss[lo-1], gap=upper.projection-lower.projection
  if (gap>maxGapMm) return NaN
  const fraction=(p-lower.projection)/gap
  const v0=bilinear(lower,patient,series.rowDirection,series.columnDirection), v1=bilinear(upper,patient,series.rowDirection,series.columnDirection)
  return v0*(1-fraction)+v1*fraction
}
