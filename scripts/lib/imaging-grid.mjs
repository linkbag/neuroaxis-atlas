/** Shared physical geometry for the MRI and archived CT bakers. */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { apply4, mul4 } from './nifti.mjs'

export const MM_PER_AU = 1.2
export const GRID_STEP = [54 / 44, 100 / 80, 82 / 66]
export const GRID_ANCHOR = [-27, -55, -56]
export const ATLAS_BOX = { x: [-58, 58], y: [-55, 116], z: [-76, 72] }
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
export const hashFile = path => sha256(readFileSync(path))

/** T · Rx · Ry · Rz · S, row-major matrices and column-vector points. */
export function composeCorrection(reg) {
  const [sx, sy, sz] = reg.scale
  const [tx, ty, tz] = reg.translateAu
  const angles = ['x', 'y', 'z'].map(a => reg.rotDeg[a] * Math.PI / 180)
  if (![sx, sy, sz, tx, ty, tz, ...angles].every(Number.isFinite) || Math.min(sx, sy, sz) <= 0) {
    throw new Error('Registration must be finite, with positive scales.')
  }
  const [x, y, z] = angles
  const rx = [1,0,0,0, 0,Math.cos(x),-Math.sin(x),0, 0,Math.sin(x),Math.cos(x),0, 0,0,0,1]
  const ry = [Math.cos(y),0,Math.sin(y),0, 0,1,0,0, -Math.sin(y),0,Math.cos(y),0, 0,0,0,1]
  const rz = [Math.cos(z),-Math.sin(z),0,0, Math.sin(z),Math.cos(z),0,0, 0,0,1,0, 0,0,0,1]
  const s = [sx,0,0,0, 0,sy,0,0, 0,0,sz,0, 0,0,0,1]
  const t = [1,0,0,tx, 0,1,0,ty, 0,0,1,tz, 0,0,0,1]
  return mul4(t, mul4(mul4(mul4(rx, ry), rz), s))
}

/** Extend by integer stations; never stretch a lattice to fit new bounds. */
export function buildGridSpec(box = ATLAS_BOX) {
  const ranges = ['x', 'y', 'z'].map(a => box[a])
  const originAu = ranges.map((r,a) => GRID_ANCHOR[a] - Math.ceil((GRID_ANCHOR[a] - r[0]) / GRID_STEP[a] - 1e-9) * GRID_STEP[a])
  const dims = ranges.map((r,a) => Math.ceil((r[1] - originAu[a]) / GRID_STEP[a] - 1e-9) + 1)
  return { dims, originAu, spacingAu: [...GRID_STEP], boundsAu: dims.map((n,a) => [originAu[a], originAu[a] + (n-1)*GRID_STEP[a]]) }
}

export function gridPoint(spec, i, j, k) {
  return [i,j,k].map((n,a) => spec.originAu[a] + n*spec.spacingAu[a])
}

/** FOV is geometric coverage, not segmented brain or anatomical agreement. */
export function affineBounds(matrix, dims) {
  const corners = []
  for (const i of [0, dims[0]-1]) for (const j of [0, dims[1]-1]) for (const k of [0, dims[2]-1]) corners.push(apply4(matrix,i,j,k))
  return [0,1,2].map(a => [Math.min(...corners.map(p => p[a])), Math.max(...corners.map(p => p[a]))])
}

export function gridManifest(spec) {
  return {
    schemaVersion: 2, dims: spec.dims, originAu: spec.originAu, spacingAu: spec.spacingAu,
    origin: spec.originAu, spacing: spec.spacingAu,
    rowMajorAxisOrder: 'xyz', axisOrder: 'xyz', rowMajorAxesFastToSlow: ['x','y','z'],
    unit: { auMm: MM_PER_AU, frame: 'x=+patient-left, y=+superior, z=+anterior' }, patientLeft: '+x',
    canonicalBox: { boxAu: ATLAS_BOX, boundsAu: Object.fromEntries(['x','y','z'].map((a,i) => [a,spec.boundsAu[i]])),
      lattice: 'Same station lattice as the previous bake, extended to current clipping bounds. Teaching levels between stations use interpolation.' },
  }
}

/** Deliberately small CLI: missing input fails before any output is touched. */
export function parseBakeArgs(argv) {
  const args = { write: true, registration: 'candidate', source: null, outDir: null }
  for (let i=0;i<argv.length;i++) {
    const key=argv[i]
    if (key==='--no-write' || key==='--probe') args.write=false
    else if (['--source','--out-dir','--registration'].includes(key)) {
      const value=argv[++i]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`)
      args[{ '--source':'source','--out-dir':'outDir','--registration':'registration' }[key]]=value
    } else throw new Error(`Unknown option: ${key}`)
  }
  if (!['candidate','baseline'].includes(args.registration)) throw new Error('Use --registration candidate or baseline')
  if (args.write && args.registration==='baseline' && !args.outDir) throw new Error('Baseline reconstruction requires --out-dir (protects candidate assets).')
  return args
}
