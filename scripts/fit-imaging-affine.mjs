/**
 * scripts/fit-imaging-affine.mjs — the re-runnable registration fitter for the
 * real-image layers (docs/SWARM_V9_PLAN.md §3, PLAN.md §5.3, task
 * `imaging-registration`).
 *
 * ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
 * The real-slice layers are drawn by a FIXED documented affine that was never
 * measured against the atlas contours drawn over them: the grids
 * (`ct.bin`, `mri-t1.bin`) sit on their own canonical lattice, and every
 * photograph sits on its committed `fit { scale, dx, dy, mirrorX }`. This script
 * measures the disagreement per reference plane and fits a display-time
 * correction for it, so the placement is re-runnable instead of inherited.
 *
 * ── THE TWO MASKS (both measured, neither assumed) ─────────────────────────
 * ATLAS brain mask — the committed GLBs through THE SECTION PIPELINE'S OWN CODE
 * PATH, not a re-implementation:
 *   1. `readFileSync('src/assets/anatomy/<slug>.glb')` → `GLTFLoader().parse()`
 *      from `three/examples/jsm/loaders/GLTFLoader.js` — the exact first step of
 *      `scripts/verify/section-pipeline.mjs:13–82`.
 *   2. `partBounds()` + `boundsMayCut()` + `extractContours(positions, indices,
 *      {axis, value})` from `src/components/section/contours.ts` — the same pure
 *      functions the Web Worker calls, and the same ones `verify:pipeline`
 *      exercises.
 *   3. the returned `loops` (flat `[u0,v0,u1,v1,…]` in the PLANE frame per
 *      `planeGeometry.AXIS_PAIR`) are rasterised even-odd with
 *      `contours.pointInLoops` on a uniform grid built from
 *      `planeGeometry.planeTransform(axis, value, {width, height})` — the mapping
 *      the 2D canvas draws with, so the mask is definitionally in the canvas'
 *      frame (PLAN.md §0b steps 1–3). The slugs the mask unions are printed and
 *      recorded (`codePath.atlasSlugs`).
 *
 * IMAGE mask — the image's own data, no atlas involvement:
 *   • CT   `src/assets/imaging/ct.bin` + `ct-manifest.json` (row-major,
 *          x-fastest uint8 lattice). Rejected: a manifest `status` other than
 *          `available`, the manifest's `intensity.backgroundValue` (0 = no CT
 *          data outside the source FOV — 35.7 % of the box) and any voxel below
 *          `CT_MASK_MIN_U8`. Kept: `CT_MASK_MIN_U8…255`, i.e. everything above
 *          air/CSF — brain, blood, muscle, fat, skin AND bone: the head as the
 *          acquisition renders it (Hounsfield = uint8·120/255 − 20).
 *   • MRI  `src/assets/imaging/mri-t1.bin` + `mri-manifest.json`, same lattice,
 *          mask = uint8 ≥ `MRI_MASK_MIN_U8` (the committed volume's p10 is 13,
 *          so 40 keeps the head's soft tissue and drops the noise floor).
 *   • PNG plates — the committed `stains/*.png`, decoded IN THIS SCRIPT with the
 *          built-in `node:zlib` plus the five PNG filter types (this repo has no
 *          PNG *decoder*: `scripts/lib/png.mjs` only encodes; no dependency may
 *          be added). mask = "tissue" = luminance below the plate's own measured
 *          background.
 *   • JPEG plates — reported as `unmeasurable: no-decoder` WITH the count and
 *          the file list. A JPEG decoder does not exist here and none may be
 *          added, so their committed placement is kept and nothing about them is
 *          claimed as measured.
 *
 * ── OBJECTIVE, OPTIMISER, BOUNDS ───────────────────────────────────────────
 * objective (minimised): `1 − IoU(atlasMask, imageMask ∘ T)` on a common uniform
 * grid in the plane frame, where T is the candidate display correction. IoU is
 * scale-aware where a centroid distance is not, and it is symmetric: a candidate
 * cannot score better by shrinking one mask out of the way (that lowers the
 * union and the intersection together). The grid comes from
 * `planeTransform(axis, value, {width: RASTER, height: RASTER})` — the canvas'
 * own function — over the canonical extents widened by
 * `RASTER_MARGIN_FRACTION` on every side, so a mask translated out of the frame
 * is *missing* pixels and is penalised instead of silently cropped.
 * optimiser: deterministic coarse-to-fine grid search, three stages, no RNG, no
 * clock, no network. Each stage expands a lattice over (scale, Δu, Δv) around
 * the previous winner with one neighbour step of slack, so an optimum ON a
 * search bound is visible (`boundsHit` is recorded per plane).
 * tie-break (PLAN.md §5.3): lowest cost, then smallest |Δu|+|Δv|+|s−1|, then
 * lexicographic on the parameters — `makeScorer`/`better` below.
 * bounds, all printed: grids scale ×[0.90, 1.10] (uniform — a display
 * correction is not an anisotropic stretch), translation ±24 au; plates scale
 * ×[0.40, 2.50] per axis, translation ±80 au.
 *
 * ── WHAT IT WRITES (only with `--report`) ──────────────────────────────────
 *   • `src/assets/imaging/ct-manifest.json`, `mri-manifest.json`:
 *     `registration.display = { applied, frame, method, objective, bounds,
 *     parameters{su,sv,duAu,dvAu,frameCenterAu}, residuals{…} }` — the parameters
 *     and the measurement they came from in ONE object, so editing one without
 *     the other is visible.
 *   • `src/assets/imaging/registration-fit.json`: the full machine-readable
 *     measurement (per plane, per plate, before/after, the counts, the
 *     unmeasurable list, the code path, the bounds, the tolerance).
 *   • `src/assets/imaging/plate-fit.json`: the per-PNG-plate measurement, the
 *     same shape, read by `verify/imaging-fit.mjs`.
 * `node scripts/fit-imaging-affine.mjs --report` prints the table and writes.
 * `--report --no-write` prints it and writes nothing (that is how
 * `scripts/verify/imaging-fit.mjs` recomputes without mutating the repo).
 * A bare run (no `--report`) prints the same table and writes nothing.
 *
 * ── LIMITS THIS SCRIPT STATES RATHER THAN HIDES ────────────────────────────
 *  • The CT/MRI image mask is the head's soft-tissue envelope, NOT a segmented
 *    brain: no segmenter exists in this repo and the 1.2 mm grid makes the skull
 *    rim one or two voxels thick. It CONTAINS the atlas brain mask, so the IoU
 *    between them is small by construction and is NOT a mis-registration
 *    percentage — the residual next to it is the centroid offset in au, and the
 *    extent ratio is printed with it so the reader can see which error dominates.
 *  • The correction is DISPLAY-TIME ONLY. `ct.bin`, `mri-t1.bin` and both
 *    manifests' `dims`/`originAu`/`spacingAu` are never written (PLAN.md §7.3):
 *    `npm run verify:anatomy` compares those bytes at canonical points against
 *    `54be95a` and requires `max |Δ| 0 of 255`; re-baking would move them.
 *  • A correction is APPLIED only when it earns it: a single modality-wide
 *    similarity (the mean of the per-plane winners) whose mean ROI IoU over the
 *    fitted planes gains ≥ `MIN_MEAN_ROI_IOU_GAIN`, loses no plane by more than
 *    `MAX_PLANE_ROI_IOU_LOSS`, and moves no plane's centroid residual by more
 *    than `MAX_PLANE_RESIDUAL_LOSS_AU` au. Otherwise the modality keeps today's
 *    placement and the record says "not applied" WITH the residual and the
 *    reason, which PLAN.md §5.3 explicitly allows.
 *
 * Run from the repo root:
 *   node scripts/fit-imaging-affine.mjs --report
 *   node scripts/fit-imaging-affine.mjs            (dry run — identical table)
 */
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { register } from 'node:module'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { inflateSync } from 'node:zlib'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { boundsMayCut, extractContours, pointInLoops, partBounds } from '../src/components/section/contours.ts'

/* The app's sources import each other with bundler-style extensionless
 * specifiers; the hook adds that one rule, so this script measures the module
 * the app really ships (the same hook `verify:plane` registers). */
register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href)
let AXIS_INDEX
let AXIS_PAIR
let planeTransform
{
  const geometry = await import('../src/components/section/planeGeometry.ts')
  AXIS_INDEX = geometry.AXIS_INDEX
  AXIS_PAIR = geometry.AXIS_PAIR
  planeTransform = geometry.planeTransform
}

/* ====================================================================== *
 *  CONFIG — every number the fit depends on, in one place, all printed.  *
 * ====================================================================== */

const WRITE = process.argv.includes('--report') && !process.argv.includes('--no-write')
/** `--json`: print the machine-readable record on stdout INSTEAD of the table,
 *  so `scripts/verify/imaging-fit.mjs` can recompute with this same script (not
 *  a copy of its maths) and diff the result against the committed numbers. */
const JSON_ONLY = process.argv.includes('--json')
const CT_MANIFEST_PATH = 'src/assets/imaging/ct-manifest.json'
const MRI_MANIFEST_PATH = 'src/assets/imaging/mri-manifest.json'
const CT_BIN_PATH = 'src/assets/imaging/ct.bin'
const MRI_BIN_PATH = 'src/assets/imaging/mri-t1.bin'
const STAINS_DIR = 'src/assets/imaging/stains'
const FIT_RECORD_PATH = 'src/assets/imaging/registration-fit.json'
const PLATE_RECORD_PATH = 'src/assets/imaging/plate-fit.json'

/** The reference planes — the same 8 planes `verify:pipeline` sweeps, so the fit
 *  is measured on the cuts the section pipeline is itself gated on. */
const REFERENCE_PLANES = [
  { axis: 'y', value: -46 },
  { axis: 'y', value: -24 },
  { axis: 'y', value: -8 },
  { axis: 'y', value: 0 },
  { axis: 'y', value: 14 },
  { axis: 'y', value: 30 },
  { axis: 'x', value: 6 },
  { axis: 'z', value: 0 },
]

/** The atlas parts whose union IS the atlas brain mask: brainstem +
 *  cerebellum + diencephalon + telencephalon. No skull, no scalp (the atlas has
 *  neither) and nothing below the medulla (the atlas has no spinal cord). */
const ATLAS_BRAIN_PARTS = [
  'ctx-medulla-surface',
  'ctx-pons-surface',
  'ctx-midbrain-surface',
  'ctx-hypothalamus-surface',
  'vent-fourth-ventricle',
  'vent-cerebral-aqueduct',
  'ctx-cerebellum-l',
  'ctx-cerebellum-r',
  'ctx-cerebellar-vermis',
  'ctx-thalamus-l',
  'ctx-thalamus-r',
  'ctx-pineal',
  'ctx-hemisphere-l',
  'ctx-hemisphere-r',
  'tel-white-matter-l',
  'tel-white-matter-r',
  'tel-lateral-ventricle-l',
  'tel-lateral-ventricle-r',
  'ctx-corpus-callosum',
  'ctx-hippocampus-l',
  'ctx-hippocampus-r',
  'ctx-amygdala-l',
  'ctx-amygdala-r',
  'ctx-caudate-l',
  'ctx-caudate-r',
  'ctx-putamen-l',
  'ctx-putamen-r',
  'ctx-globus-pallidus-l',
  'ctx-globus-pallidus-r',
  'ctx-fornix-l',
  'ctx-fornix-r',
  'ctx-fornix-commissure',
  'ctx-choroid-plexus-l',
  'ctx-choroid-plexus-r',
]

/** Raster size of the common mask grid, in samples per axis. */
const RASTER = 512
/** The grid spans the canonical extents × (1 + 2·this). */
const RASTER_MARGIN_FRACTION = 0.15
/** uint8 floor of the CT image mask (uint8 8 ≈ 14 HU; window −20…100 HU). */
const CT_MASK_MIN_U8 = 8
/** uint8 floor of the MRI image mask (committed volume p10 = 13). */
const MRI_MASK_MIN_U8 = 40
/** Search bounds, grids: uniform scale about the mask's own frame centre.
 *  ±48 au / ×[0.75, 1.25] is wide enough that the measured optimum is interior
 *  (the search-hit-the-wall flag is recorded per plane and per candidate, so a
 *  boundary optimum is reported as such instead of passed off as a fit). */
const GRID_SCALE_BOUNDS = [0.75, 1.25]
const GRID_TRANSLATE_AU = 48
/** Search bounds, plates: a photograph's world size is far less constrained.
 *
 *  v9 orchestrator fix: the upper bound was 4.0, and the UBC *coronal* plates all
 *  converged ON it (su = sv = 4 exactly), which the gate then honestly refused as
 *  "not a converged interior fit" — so the plates the user actually sees as a tiny
 *  patch in the middle of the section were left at the v3 first-pass affine
 *  (`UBC_C_FIT_SCALE = 17.9` px/au) while the measurement says ≈ 4.5 px/au, i.e.
 *  those photographs are drawn about 4× too small. That factor is independently
 *  corroborated: `assets-src/imaging3/VHP_ANCHORS.md` measured 4.0816 px/au for
 *  the same series' framing. 12.0 leaves room for that optimum to be interior, so
 *  the gate can accept it on the numbers instead of refusing it on the bound. */
const PLATE_SCALE_BOUNDS = [0.25, 12.0]
const PLATE_TRANSLATE_AU = 120
/** The three coarse-to-fine stages: [scaleSteps, translateSteps]. */
const STAGES = [
  { scaleSteps: 9, translateSteps: 13 },
  { scaleSteps: 5, translateSteps: 11 },
  { scaleSteps: 5, translateSteps: 9 },
]
/** Apply gate: a correction must earn the write (see the header). The IoU floor
 *  is expressed on the ROI (the head's soft-tissue envelope is 1.0–7.7× the
 *  atlas brain, so the global IoU barely moves), plus a residual ceiling: an
 *  IoU gain bought by pushing the mask's centroid AWAY from the atlas is not a
 *  registration improvement and is rejected. */
const MIN_MEAN_ROI_IOU_GAIN = 0.01
const MAX_PLANE_ROI_IOU_LOSS = 0.005
const MAX_PLANE_RESIDUAL_LOSS_AU = 3.0
const MAX_MEAN_RESIDUAL_LOSS_AU = 0.5
/** A plate correction must earn the write too: the IoU floor AND a residual that
 *  does not get worse (an IoU gain bought by enlarging the plate until it covers
 *  the atlas is not a registration improvement — see the plate gate below). */
const MIN_PLATE_IOU_GAIN = 0.02
const MAX_PLATE_RESIDUAL_LOSS_AU = 0.5
/** A correction may not make a plate more than this many times the atlas
 *  cross-section it is registered to (or less than 1/this). */
const PLATE_EXTENT_SANITY = 3

/** True when both ratios of an extent pair sit inside [1/limit, limit]. */
function ratioWithin(ratios, limit) {
  return ratios.every((r) => Number.isFinite(r) && r <= limit && r >= 1 / limit)
}
/** Tolerance `verify/imaging-fit.mjs` re-checks the recorded numbers against. */
const TOLERANCE = { iou: 1e-9, au: 1e-9, param: 1e-9 }
/** Plate "tissue" threshold: luminance < (median border luminance − this). */
const PHOTO_TISSUE_MARGIN = 12

const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : 'n/a')
const sgn = (n, d = 4) => (n >= 0 ? '+' : '') + fmt(n, d)

const out = []
/** `--json` keeps the table out of stdout so the verifier can parse one JSON
 *  document; every module-level loader still runs identically. */
const say = (s = '') => {
  out.push(s)
  if (!JSON_ONLY) console.log(s)
}

/* ====================================================================== *
 *  1. ATLAS MASKS — the committed GLBs through the section pipeline path  *
 * ====================================================================== */

const anatomyManifest = JSON.parse(readFileSync(resolve('src/assets/anatomy/anatomy-manifest.json'), 'utf8'))
const gltfLoader = new GLTFLoader()
const parseGlb = (arrayBuffer) => new Promise((res, rej) => gltfLoader.parse(arrayBuffer, '', res, rej))

/** `registryPartFromGeometry` — section-pipeline.mjs:30–43, same three steps. */
function registryPartFromGeometry(slug, geometry) {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return null
  const positions = position.array.slice()
  const sourceIndex = geometry.getIndex()
  let indices
  if (sourceIndex !== null) {
    indices = new Uint32Array(sourceIndex.array)
  } else {
    indices = new Uint32Array(position.count)
    for (let i = 0; i < position.count; i++) indices[i] = i
  }
  return { slug, positions, indices }
}

const brainParts = []
const brainPartsSkipped = []
{
  const wanted = new Set(ATLAS_BRAIN_PARTS)
  const manifestSlugs = new Set(anatomyManifest.parts.map((p) => p.slug))
  for (const slug of [...wanted].sort()) {
    if (!manifestSlugs.has(slug)) brainPartsSkipped.push(`${slug} (not in anatomy-manifest.json)`)
  }
  for (const part of anatomyManifest.parts) {
    if (!wanted.has(part.slug)) continue
    const buf = readFileSync(resolve('src/assets/anatomy', part.file ?? `${part.slug}.glb`))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const gltf = await parseGlb(ab)
    let mesh = null
    gltf.scene.traverse((child) => {
      if (mesh === null && child.isMesh) mesh = child
    })
    if (mesh === null) {
      brainPartsSkipped.push(`${part.slug} (no mesh in GLB)`)
      continue
    }
    const reg = registryPartFromGeometry(part.slug, mesh.geometry)
    if (reg === null) {
      brainPartsSkipped.push(`${part.slug} (no position attribute)`)
      continue
    }
    brainParts.push({ ...reg, bounds: partBounds(reg.positions) })
  }
}
const atlasSlugs = [...new Set(brainParts.map((p) => p.slug))].sort()

/** Atlas loops (plane frame, flat [u,v,…]) of the brain mask at one plane. */
function atlasLoopsAt(plane) {
  const loops = []
  let partsCut = 0
  for (const part of brainParts) {
    if (!boundsMayCut(part.bounds, plane)) continue
    const result = extractContours(part.positions, part.indices, plane)
    if (result.loops.length === 0) continue
    partsCut += 1
    for (const loop of result.loops) loops.push(loop)
  }
  return { loops, partsCut }
}

/* ====================================================================== *
 *  2. THE COMMON GRID — the canvas frame (planeTransform), uniform au     *
 * ====================================================================== */

/**
 * A raster grid in the plane frame: sample (i, j) sits at `uMin + i·uStep`,
 * `vMin + j·vStep`. Row 0 is `vMin` (the bottom of the slice — the canvas'
 * `vToSy` is top-down, so a printer must walk rows backwards).
 */
function makeGrid(axis, value) {
  const [uAxis, vAxis] = AXIS_PAIR[axis]
  const transform = planeTransform(axis, value, { width: RASTER, height: RASTER })
  const hu = Math.max(1e-6, transform.halfU) * (1 + 2 * RASTER_MARGIN_FRACTION)
  const hv = Math.max(1e-6, transform.halfV) * (1 + 2 * RASTER_MARGIN_FRACTION)
  const uMin = transform.centerU - hu
  const vMin = transform.centerV - hv
  const uStep = (2 * hu) / (RASTER - 1)
  const vStep = (2 * hv) / (RASTER - 1)
  return {
    axis,
    value,
    uAxis,
    vAxis,
    uIdx: AXIS_INDEX[uAxis],
    vIdx: AXIS_INDEX[vAxis],
    aIdx: AXIS_INDEX[axis],
    uMin,
    vMin,
    uStep,
    vStep,
    uAt: (i) => uMin + i * uStep,
    vAt: (j) => vMin + j * vStep,
    uToI: (u) => (u - uMin) / uStep,
    vToJ: (v) => (v - vMin) / vStep,
    centerU: transform.centerU,
    centerV: transform.centerV,
    transform,
  }
}

/** Even-odd rasterisation of the atlas loops onto `grid`. */
function rasterAtlas(grid, loops) {
  const mask = new Uint8Array(RASTER * RASTER)
  const u = new Float64Array(RASTER)
  const v = new Float64Array(RASTER)
  for (let i = 0; i < RASTER; i++) u[i] = grid.uAt(i)
  for (let j = 0; j < RASTER; j++) v[j] = grid.vAt(j)
  let n = 0
  for (let j = 0; j < RASTER; j++) {
    for (let i = 0; i < RASTER; i++) {
      if (pointInLoops(loops, u[i], v[j])) {
        mask[j * RASTER + i] = 1
        n += 1
      }
    }
  }
  return { mask, n }
}

/** Area centroid + bbox + extent of a mask, in canonical au. */
function maskStats(grid, mask) {
  let n = 0
  let su = 0
  let sv = 0
  let iMin = Infinity
  let iMax = -Infinity
  let jMin = Infinity
  let jMax = -Infinity
  for (let j = 0; j < RASTER; j++) {
    for (let i = 0; i < RASTER; i++) {
      if (mask[j * RASTER + i] === 0) continue
      n += 1
      su += grid.uAt(i)
      sv += grid.vAt(j)
      if (i < iMin) iMin = i
      if (i > iMax) iMax = i
      if (j < jMin) jMin = j
      if (j > jMax) jMax = j
    }
  }
  if (n === 0) return { n: 0, centroid: [NaN, NaN], bbox: [NaN, NaN, NaN, NaN], extent: [NaN, NaN] }
  const bbox = [grid.uAt(iMin), grid.uAt(iMax), grid.vAt(jMin), grid.vAt(jMax)]
  return { n, centroid: [su / n, sv / n], bbox, extent: [bbox[1] - bbox[0], bbox[3] - bbox[2]] }
}

/* ====================================================================== *
 *  3. IMAGE MASKS                                                         *
 * ====================================================================== */

/** One baked uint8 grid: row-major, x fastest, dims [nx, ny, nz]. */
function loadGrid(which) {
  const manifestPath = which === 'ct' ? CT_MANIFEST_PATH : MRI_MANIFEST_PATH
  const binPath = which === 'ct' ? CT_BIN_PATH : MRI_BIN_PATH
  const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'))
  const bin = readFileSync(resolve(binPath))
  const dims = manifest.dims
  const expected = dims[0] * dims[1] * dims[2]
  if (bin.length !== expected) {
    throw new Error(`${which}: ${binPath} is ${bin.length} B but manifest dims ${dims.join('x')} need ${expected} B`)
  }
  return { which, manifest, bin, dims, origin: manifest.originAu, spacing: manifest.spacingAu, voxelCount: expected }
}

/**
 * The image's own mask over the whole volume (index frame). `floor` is the
 * uint8 floor kept, `noData` the manifest value excluded (null when the
 * manifest declares none).
 */
function gridImageMask(grid) {
  const status = grid.manifest.status
  if (status !== undefined && status !== 'available') return { mask: null, reason: `manifest status '${status}'` }
  const floor = grid.which === 'ct' ? CT_MASK_MIN_U8 : MRI_MASK_MIN_U8
  const noData = grid.which === 'ct' ? (grid.manifest.intensity?.backgroundValue ?? 0) : null
  const mask = new Uint8Array(grid.bin.length)
  let kept = 0
  let rejectedNoData = 0
  let rejectedFloor = 0
  for (let k = 0; k < grid.bin.length; k++) {
    const v = grid.bin[k]
    if (noData !== null && v === noData) {
      rejectedNoData += 1
      continue
    }
    if (v < floor) {
      rejectedFloor += 1
      continue
    }
    mask[k] = 1
    kept += 1
  }
  return { mask, floor, noData, kept, rejectedNoData, rejectedFloor }
}

/**
 * Sample a grid mask onto the plane grid through a candidate correction.
 * The candidate maps a canonical position to the position in the IMAGE's own
 * frame that is displayed there — exactly the affine `imageLayers.drawGridToView`
 * applies at draw time: `s = c + (p − c − d) / k` with `c` the centre of the
 * grid's own canonical rectangle and `k` the direct scale. k > 1 therefore makes
 * the image LARGER (its own frame covers more canonical au per stored au).
 */
function makeGridSampler(planeGrid, entry, imageMask) {
  const { dims, origin, spacing } = entry
  const aIdx = planeGrid.aIdx
  const aIdxNearest = Math.round((planeGrid.value - origin[aIdx]) / spacing[aIdx])
  const inSlice = aIdxNearest >= 0 && aIdxNearest < dims[aIdx]
  const cU = origin[planeGrid.uIdx] + ((dims[planeGrid.uIdx] - 1) * spacing[planeGrid.uIdx]) / 2
  const cV = origin[planeGrid.vIdx] + ((dims[planeGrid.vIdx] - 1) * spacing[planeGrid.vIdx]) / 2
  const duMax = dims[planeGrid.uIdx] - 1
  const dvMax = dims[planeGrid.vIdx] - 1
  // Flat-index strides of the row-major x-fastest lattice — the layout
  // `anatomy-qa.mjs:sampleGrid` indexes (idx = ix + nx·(iy + ny·iz)). Hoisted out
  // of the inner loops.
  const stride = [1, dims[0], dims[0] * dims[1]]
  const aOff = aIdxNearest * stride[2]
  const uOff = stride[planeGrid.uIdx]
  const vOff = stride[planeGrid.vIdx]
  /** For each mask voxel of this slice, the flat index of its grid column (or -1). */
  const colOf = new Int32Array(dims[planeGrid.uIdx]).fill(-1)
  const rowOf = new Int32Array(dims[planeGrid.vIdx]).fill(-1)
  return {
    frameCenterAu: [cU, cV],
    sliceIndex: aIdxNearest,
    inSlice,
    /** Fill `out` (length RASTER²) and return the number of mask pixels set. */
    sample(out, params) {
      if (!inSlice) return 0
      // Separable mapping: each grid column maps to one u index, each row to one
      // v index, so the inverse maps (mask index → grid index) are built once per
      // candidate instead of re-deriving an index per mask voxel.
      colOf.fill(-1)
      rowOf.fill(-1)
      for (let i = 0; i < RASTER; i++) {
        const su = cU + (planeGrid.uAt(i) - cU - params.duAu) / params.su
        const iu = Math.round((su - origin[planeGrid.uIdx]) / spacing[planeGrid.uIdx])
        if (iu >= 0 && iu <= duMax) colOf[iu] = i
      }
      for (let j = 0; j < RASTER; j++) {
        const sv = cV + (planeGrid.vAt(j) - cV - params.dvAu) / params.sv
        const iv = Math.round((sv - origin[planeGrid.vIdx]) / spacing[planeGrid.vIdx])
        if (iv >= 0 && iv <= dvMax) rowOf[iv] = j
      }
      let n = 0
      // Walk the mask's own slice and place each set voxel on the grid: the cost
      // is proportional to the mask area, and a voxel mapping outside the frame is
      // simply not placed — never counted as an intersection.
      for (let iv = 0; iv <= dvMax; iv++) {
        const j = rowOf[iv]
        if (j < 0) continue
        const vBase = aOff + iv * vOff
        const outBase = j * RASTER
        for (let iu = 0; iu <= duMax; iu++) {
          if (imageMask[vBase + iu * uOff] === 0) continue
          const i = colOf[iu]
          if (i < 0) continue
          out[outBase + i] = 1
          n += 1
        }
      }
      return n
    },
  }
}

/* --------------------------------------------------------- plate inputs */

/**
 * The plate metadata the fitter needs (id, file, axis, planeValue, fit) lives
 * in `src/data/sectionImages.ts`, which imports `?url` assets a Node script
 * cannot resolve. It is therefore read with the PROJECT'S OWN TypeScript
 * compiler: the source is transpiled to plain JS in a temp file, the asset
 * imports are replaced by string literals, and the module is imported — so the
 * numbers come from the file the app ships, never from a copy.
 */
async function readPlateEntries() {
  const require = createRequire(import.meta.url)
  const ts = require('typescript')
  const source = readFileSync(resolve('src/data/sectionImages.ts'), 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const rewritten = transpiled.replace(
    /from\s+'((?:\.\.\/)+assets\/[^']+)'/g,
    (_m, spec) => `from 'data:text/javascript,export default ${JSON.stringify(spec)}'`,
  )
  const dir = mkdtempSync(join(tmpdir(), 'neuroaxis-plates-'))
  const file = join(dir, 'sectionImages.mjs')
  writeFileSync(file, rewritten)
  try {
    const mod = await import(pathToFileURL(file).href)
    return mod.sectionImages
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Minimal PNG decoder — `node:zlib.inflateSync` plus the five filter types.
 * 8-bit, non-interlaced, colour types 0/2/3/4/6 (every committed plate is one
 * of those; anything else throws with the reason instead of guessing).
 * Returns { width, height, luma } with ITU-R 601 luminance.
 */
function decodePngLuma(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG signature')
  let off = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  let interlace = 0
  const idat = []
  let palette = null
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'PLTE') {
      palette = Buffer.from(data)
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data))
    } else if (type === 'IEND') {
      break
    }
    off += 12 + len
  }
  if (bitDepth !== 8) throw new Error(`PNG bit depth ${bitDepth} (only 8 is decoded)`)
  if (interlace !== 0) throw new Error('interlaced PNG')
  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0
  if (channels === 0) throw new Error(`PNG colour type ${colorType} (not decoded)`)
  if (colorType === 3 && palette === null) throw new Error('indexed PNG without PLTE')
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos]
    pos += 1
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev === null ? 0 : prev[x]
      const c = prev === null || x < channels ? 0 : prev[x - channels]
      const v = line[x]
      let value
      if (filter === 0) value = v
      else if (filter === 1) value = v + a
      else if (filter === 2) value = v + b
      else if (filter === 3) value = v + ((a + b) >> 1)
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      } else throw new Error(`PNG filter type ${filter} (unknown)`)
      cur[x] = value & 0xff
    }
  }
  const luma = new Uint8Array(width * height)
  for (let p = 0; p < width * height; p++) {
    let r
    let g
    let b
    if (colorType === 3) {
      const idx = out[p] * 3
      r = palette[idx]
      g = palette[idx + 1]
      b = palette[idx + 2]
    } else if (colorType === 0 || colorType === 4) {
      r = g = b = out[p * channels]
    } else {
      r = out[p * channels]
      g = out[p * channels + 1]
      b = out[p * channels + 2]
    }
    luma[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }
  return { width, height, luma, colorType, bitDepth, interlace }
}

/** The plate's own tissue mask in SOURCE PIXEL coordinates. */
function photoTissueMask(decoded) {
  const { width, height, luma } = decoded
  const band = 8
  const border = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < band || y < band || x >= width - band || y >= height - band) border.push(luma[y * width + x])
    }
  }
  border.sort((a, b) => a - b)
  const background = border[Math.floor(border.length / 2)]
  const limit = background - PHOTO_TISSUE_MARGIN
  const mask = new Uint8Array(width * height)
  let n = 0
  for (let p = 0; p < width * height; p++) {
    if (luma[p] < limit) {
      mask[p] = 1
      n += 1
    }
  }
  return { mask, n, background, limit }
}

/**
 * Sample a plate's tissue mask onto the plane grid through a candidate
 * correction of the plate's own placement.
 *
 * The committed placement (src/data/sectionImages.ts `fit`) puts the image
 * centre at `(centerU − dx, centerV + dy)` with world size
 * `naturalWidth / scale` × `naturalHeight / scale`; that is the mapping
 * `imageLayers.drawStainToView` draws. The candidate is a similarity on top of
 * it: `k` multiplies the plate's world size (k = 1.2 → 20 % larger) and
 * `(duAu, dvAu)` moves its centre, both about the plate's own centre.
 */
function makePlateSampler(planeGrid, decoded, tissueMask, fit) {
  const { width, height } = decoded
  const scale = Math.max(1e-6, fit.scale)
  const wAu0 = width / scale
  const hAu0 = height / scale
  const uCenter0 = planeGrid.centerU - (fit.dx ?? 0)
  const vCenter0 = planeGrid.centerV + (fit.dy ?? 0)
  const uMin0 = uCenter0 - wAu0 / 2
  const vMin0 = vCenter0 - hAu0 / 2
  const flip = fit.mirrorX === true
  return {
    plateCenterAu: [uCenter0, vCenter0],
    plateRectAu: [uMin0, uMin0 + wAu0, vMin0, vMin0 + hAu0],
    natural: [width, height],
    sample(out, params) {
      const wAu = wAu0 * params.su
      const hAu = hAu0 * params.sv
      const uMin = uCenter0 + params.duAu - wAu / 2
      const vMin = vCenter0 + params.dvAu - hAu / 2
      const du = wAu / width
      const dv = hAu / height
      let n = 0
      for (let j = 0; j < RASTER; j++) {
        const v = planeGrid.vAt(j)
        const py = Math.floor((v - vMin) / dv)
        if (py < 0 || py >= height) continue
        const rowBase = py * width
        for (let i = 0; i < RASTER; i++) {
          const u = planeGrid.uAt(i)
          let px = Math.floor((u - uMin) / du)
          if (px < 0 || px >= width) continue
          if (flip) px = width - 1 - px
          if (tissueMask[rowBase + px] !== 0) {
            out[j * RASTER + i] = 1
            n += 1
          }
        }
      }
      return n
    },
  }
}

/* ====================================================================== *
 *  4. THE OPTIMISER — deterministic coarse-to-fine grid search            *
 * ====================================================================== */

/** The deterministic tie-break of PLAN.md §5.3. */
function isBetter(a, b) {
  if (b === null) return true
  if (a.iou > b.iou + 1e-12) return true
  if (a.iou < b.iou - 1e-12) return false
  const ka = Math.abs(a.params.duAu) + Math.abs(a.params.dvAu) + Math.abs(a.params.su - 1) + Math.abs(a.params.sv - 1)
  const kb = Math.abs(b.params.duAu) + Math.abs(b.params.dvAu) + Math.abs(b.params.su - 1) + Math.abs(b.params.sv - 1)
  if (ka < kb - 1e-12) return true
  if (ka > kb + 1e-12) return false
  const key = (p) => [p.su, p.sv, p.duAu, p.dvAu].map((n) => n.toFixed(12)).join('|')
  return key(a.params) < key(b.params)
}

function lineSpace(min, max, steps) {
  const list = []
  for (let i = 0; i < steps; i++) list.push(min + ((max - min) * i) / (steps - 1))
  return list
}

/**
 * The REGION OF INTEREST: the canonical in-plane rectangle around the atlas
 * brain mask's own bounding box, padded by `ROI_PAD_FRACTION` on each side.
 *
 * Why a second metric exists at all (measured, not stylistic): the image mask is
 * the head's soft-tissue envelope and the atlas mask is a brain — the head is
 * 1.0–7.7× the atlas across the reference planes, so the GLOBAL IoU is small by
 * construction and is dominated by the thousands of head pixels no atlas brain
 * could ever cover. Inside the atlas' own neighbourhood the two masks have
 * comparable area, so the ROI IoU and the centroid residual there are the
 * numbers that can actually move when the placement is wrong. Both are reported;
 * neither replaces the other.
 */
const ROI_PAD_FRACTION = 0.3

function roiWindowFromMask(grid, mask) {
  let iMin = Infinity
  let iMax = -Infinity
  let jMin = Infinity
  let jMax = -Infinity
  for (let j = 0; j < RASTER; j++) {
    for (let i = 0; i < RASTER; i++) {
      if (mask[j * RASTER + i] === 0) continue
      if (i < iMin) iMin = i
      if (i > iMax) iMax = i
      if (j < jMin) jMin = j
      if (j > jMax) jMax = j
    }
  }
  if (iMax < iMin || jMax < jMin) return null
  const padI = Math.max(1, Math.round((iMax - iMin) * ROI_PAD_FRACTION))
  const padJ = Math.max(1, Math.round((jMax - jMin) * ROI_PAD_FRACTION))
  return {
    iMin: Math.max(0, iMin - padI),
    iMax: Math.min(RASTER - 1, iMax + padI),
    jMin: Math.max(0, jMin - padJ),
    jMax: Math.min(RASTER - 1, jMax + padJ),
  }
}

/** Area centroid, pixel count AND bbox of a mask restricted to a window. */
function windowedStats(grid, mask, window) {
  let n = 0
  let su = 0
  let sv = 0
  let iMin = Infinity
  let iMax = -Infinity
  let jMin = Infinity
  let jMax = -Infinity
  for (let j = window.jMin; j <= window.jMax; j++) {
    for (let i = window.iMin; i <= window.iMax; i++) {
      if (mask[j * RASTER + i] === 0) continue
      n += 1
      su += grid.uAt(i)
      sv += grid.vAt(j)
      if (i < iMin) iMin = i
      if (i > iMax) iMax = i
      if (j < jMin) jMin = j
      if (j > jMax) jMax = j
    }
  }
  if (n === 0) return { n: 0, centroid: [NaN, NaN], extent: [NaN, NaN] }
  return {
    n,
    centroid: [su / n, sv / n],
    extent: [grid.uAt(iMax) - grid.uAt(iMin), grid.vAt(jMax) - grid.vAt(jMin)],
  }
}

/** The measured numbers one placement (or candidate) is judged by. */
function measurePlacement(grid, atlasMask, imageMask, window) {
  let inter = 0
  let union = 0
  let atlasIn = 0
  let imageIn = 0
  for (let j = window.jMin; j <= window.jMax; j++) {
    for (let i = window.iMin; i <= window.iMax; i++) {
      const k = j * RASTER + i
      const a = atlasMask[k] !== 0
      const b = imageMask[k] !== 0
      if (a) atlasIn += 1
      if (b) imageIn += 1
      if (a && b) inter += 1
      if (a || b) union += 1
    }
  }
  const atlas = windowedStats(grid, atlasMask, window)
  const image = windowedStats(grid, imageMask, window)
  const globalUnion = (() => {
    let u = 0
    let it = 0
    for (let k = 0; k < atlasMask.length; k++) {
      const a = atlasMask[k] !== 0
      const b = imageMask[k] !== 0
      if (a && b) it += 1
      if (a || b) u += 1
    }
    return { iou: u === 0 ? 0 : it / u, inter: it, union: u }
  })()
  return {
    globalIou: globalUnion.iou,
    roiIou: union === 0 ? 0 : inter / union,
    roiDice: atlasIn + imageIn === 0 ? 0 : (2 * inter) / (atlasIn + imageIn),
    roiAtlasPixels: atlasIn,
    roiImagePixels: imageIn,
    roiIntersectionPixels: inter,
    // `atlasCoverage` = the share of the atlas brain mask that lands on image
    // mask; `imageCoverage` = the share of the image mask that lands on atlas.
    atlasCoverage: atlasIn === 0 ? 0 : inter / atlasIn,
    imageCoverage: imageIn === 0 ? 0 : inter / imageIn,
    atlasCentroidAu: atlas.centroid,
    imageCentroidAu: image.centroid,
    centroidResidualAu: Math.hypot(image.centroid[0] - atlas.centroid[0], image.centroid[1] - atlas.centroid[1]),
    relativeExtentRatio: [image.extent[0] / atlas.extent[0], image.extent[1] / atlas.extent[1]],
    window,
  }
}

/** IoU of two same-grid masks. */
function maskIoU(a, b) {
  let inter = 0
  let union = 0
  for (let k = 0; k < a.length; k++) {
    const x = a[k] !== 0
    const y = b[k] !== 0
    if (x && y) inter += 1
    if (x || y) union += 1
  }
  return union === 0 ? 0 : inter / union
}

/** Build a scorer over one plane: `sample(out, params) → count`. */
function makeScorer(atlasMask, sample) {
  const scratch = new Uint8Array(RASTER * RASTER)
  let evaluations = 0
  const score = (params) => {
    evaluations += 1
    scratch.fill(0)
    const n = sample(scratch, params)
    const iou = n === 0 ? 0 : maskIoU(atlasMask, scratch)
    return { iou, params, pixels: n }
  }
  return { score, evaluations: () => evaluations }
}

/**
 * Coarse-to-fine search over (scale, Δu, Δv). `uniform` links the two scales
 * (a grid's display correction is a similarity, never an anisotropic stretch);
 * plates fit `su` and `sv` separately, because a photograph's own aspect can be
 * off. Returns the winner, the per-stage trace and whether the winner sits on a
 * search bound.
 */
function fitPlane({ atlasMask, sample, scaleBounds, translateAu, uniform }) {
  const scorer = makeScorer(atlasMask, sample)
  const [s0, s1] = scaleBounds
  let best = null
  const stageReport = []
  let boundsHit = false
  let lo = s0
  let hi = s1
  let tAu = translateAu
  for (let stage = 0; stage < STAGES.length; stage++) {
    const { scaleSteps, translateSteps } = STAGES[stage]
    const scales = lineSpace(lo, hi, scaleSteps)
    const translations = lineSpace(-tAu, tAu, translateSteps)
    let stageBest = null
    for (const s of scales) {
      for (const du of translations) {
        for (const dv of translations) {
          const cand = scorer.score({ su: s, sv: s, duAu: du, dvAu: dv })
          if (isBetter(cand, stageBest)) stageBest = cand
        }
      }
    }
    stageReport.push({
      stage: stage + 1,
      scaleRange: [lo, hi],
      translateRangeAu: [-tAu, tAu],
      lattice: `${scaleSteps} scales × ${translateSteps}×${translateSteps} translations`,
      best: { ...stageBest.params, iou: stageBest.iou },
    })
    if (isBetter(stageBest, best)) best = stageBest
    // The optimum sitting ON a bound means the answer may lie outside the search
    // box. Only the FINAL stage counts: every stage starts from a lattice that
    // touches the box by construction, so an early-stage hit says nothing.
    if (stage === STAGES.length - 1) {
      if (Math.abs(stageBest.params.su - lo) < 1e-9 || Math.abs(stageBest.params.su - hi) < 1e-9) boundsHit = true
      if (Math.abs(stageBest.params.duAu) > tAu - 1e-9 || Math.abs(stageBest.params.dvAu) > tAu - 1e-9) boundsHit = true
    }
    const sStep = scaleSteps > 1 ? (hi - lo) / (scaleSteps - 1) : 0
    const tStep = translateSteps > 1 ? (2 * tAu) / (translateSteps - 1) : 0
    lo = Math.max(s0, stageBest.params.su - sStep)
    hi = Math.min(s1, stageBest.params.su + sStep)
    tAu = Math.min(
      translateAu,
      Math.max(Math.abs(stageBest.params.duAu), Math.abs(stageBest.params.dvAu)) + tStep,
    )
  }
  const identity = { su: 1, sv: 1, duAu: 0, dvAu: 0 }
  return { best, identity: scorer.score(identity), stageReport, evaluations: scorer.evaluations(), boundsHit, scorer }
}

/**
 * Fit ONE modality-wide similarity by maximising the MEAN ROI IoU over all the
 * fitted planes (objective: mean of the per-plane 1 − IoU), on the same
 * coarse-to-fine lattices as the per-plane search.
 *
 * Why a modality-wide fit exists at all: the manifest correction is applied to
 * every plane of the modality, so per-plane winners would make the image change
 * size and position as the reader scrubs. The per-plane table is the measurement;
 * this is the one correction that can ship. Both are recorded.
 *
 * `fixedScale` pins the scale (the translation-only candidate): a display
 * correction that only moves the image cannot falsify the 1 au = 1.2 mm
 * geometry the bake established, so it is always evaluated and reported next to
 * the free-scale winner.
 */
function fitModalityWide({ planeFits, scaleBounds, translateAu, fixedScale = null }) {
  const [s0, s1] = scaleBounds
  const evaluate = (params) => {
    let sum = 0
    let sumResidual = 0
    let worstIouLoss = 0
    let worstResidualLoss = 0
    let count = 0
    for (const p of planeFits) {
      p.sample(p.scratch, params)
      const m = measurePlacement(p.grid, p.atlasMask, p.scratch, p.roi)
      sum += m.roiIou
      sumResidual += m.centroidResidualAu
      worstIouLoss = Math.min(worstIouLoss, m.roiIou - p.before.roiIou)
      worstResidualLoss = Math.max(worstResidualLoss, m.centroidResidualAu - p.before.centroidResidualAu)
      count += 1
    }
    return {
      params,
      meanRoiIou: count === 0 ? 0 : sum / count,
      meanResidualAu: count === 0 ? 0 : sumResidual / count,
      worstPlaneIouLoss: worstIouLoss,
      worstPlaneResidualLossAu: worstResidualLoss,
    }
  }
  let best = null
  const stageReport = []
  let boundsHit = false
  let lo = fixedScale === null ? s0 : fixedScale
  let hi = fixedScale === null ? s1 : fixedScale
  let tAu = translateAu
  for (let stage = 0; stage < STAGES.length; stage++) {
    const { scaleSteps, translateSteps } = STAGES[stage]
    const scales = fixedScale === null ? lineSpace(lo, hi, scaleSteps) : [fixedScale]
    const translations = lineSpace(-tAu, tAu, translateSteps)
    let stageBest = null
    for (const s of scales) {
      for (const du of translations) {
        for (const dv of translations) {
          const cand = evaluate({ su: s, sv: s, duAu: du, dvAu: dv })
          if (stageBest === null || cand.meanRoiIou > stageBest.meanRoiIou + 1e-12) stageBest = cand
        }
      }
    }
    stageReport.push({
      stage: stage + 1,
      scaleRange: [lo, hi],
      translateRangeAu: [-tAu, tAu],
      best: { ...stageBest.params, meanRoiIou: stageBest.meanRoiIou, meanResidualAu: stageBest.meanResidualAu },
    })
    if (best === null || stageBest.meanRoiIou > best.meanRoiIou + 1e-12) best = stageBest
    // Only the FINAL stage decides `boundsHit` (see fitPlane's note).
    if (stage === STAGES.length - 1) {
      if (fixedScale === null) {
        if (Math.abs(stageBest.params.su - lo) < 1e-9 || Math.abs(stageBest.params.su - hi) < 1e-9) boundsHit = true
      }
      if (Math.abs(stageBest.params.duAu) > tAu - 1e-9 || Math.abs(stageBest.params.dvAu) > tAu - 1e-9) boundsHit = true
    }
    const sStep = fixedScale === null && scaleSteps > 1 ? (hi - lo) / (scaleSteps - 1) : 0
    const tStep = translateSteps > 1 ? (2 * tAu) / (translateSteps - 1) : 0
    if (fixedScale === null) {
      lo = Math.max(s0, stageBest.params.su - sStep)
      hi = Math.min(s1, stageBest.params.su + sStep)
    }
    tAu = Math.min(
      translateAu,
      Math.max(Math.abs(stageBest.params.duAu), Math.abs(stageBest.params.dvAu)) + tStep,
    )
  }
  return { ...best, stageReport, boundsHit }
}

/* ====================================================================== *
 *  5. RUN THE FIT                                                         *
 * ====================================================================== */

/** Atomic-enough JSON write: one `writeFileSync` of the whole document. */
function writeJson(path, value) {
  writeFileSync(resolve(path), `${JSON.stringify(value, null, 2)}\n`)
}

/* ====================================================================== *
 *  0. THE MEASUREMENT — everything below this point runs inside           *
 *     `runImagingFit()` so the verifier can call it in-process            *
 * ====================================================================== */

/**
 * THE MEASUREMENT, AS ONE IMPORTABLE FUNCTION.
 *
 * `runImagingFit({ onLog })` does the whole job — load the committed GLBs, fit
 * every reference plane, fit the plates, report the table through `onLog` — and
 * returns `{ fitRecord, plateRecord, displayBlocks }`. The CLI at the bottom of
 * this file is a thin wrapper around it and does every write, so the manifests
 * and the record can never be produced by two different code paths.
 *
 * `scripts/verify/imaging-fit.mjs` re-runs this file (as `node
 * scripts/fit-imaging-affine.mjs --json`, in `--json` mode) so the gate compares
 * the committed numbers against THIS code rather than against a copy of its
 * maths.
 */
export async function runImagingFit({ onLog = null } = {}) {
  const out = []
  const say = (s = '') => {
    out.push(s)
    if (onLog !== null) onLog(s)
    else if (!JSON_ONLY) console.log(s)
  }

const ctGrid = loadGrid('ct')
const mriGrid = loadGrid('mri')
const imageMasks = { ct: gridImageMask(ctGrid), mri: gridImageMask(mriGrid) }

const fitRecord = {
  schemaVersion: 1,
  generatedBy: 'scripts/fit-imaging-affine.mjs',
  objective:
    'minimise (1 − IoU(atlasBrainMask, imageMask ∘ T)) on a 512×512 uniform canonical grid in the plane frame (planeGeometry.planeTransform)',
  optimiser: 'deterministic coarse-to-fine grid search, 3 stages, no RNG, no clock, no network',
  tieBreak: 'lowest cost, then smallest |Δu|+|Δv|+|su−1|+|sv−1|, then lexicographic (su, sv, duAu, dvAu)',
  signConvention:
    'T maps a canonical position p to the position in the image’s own frame shown there: s = c + (p − c − Δ)/k, c = the centre of the grid’s own canonical rectangle (grids) / the plate’s placement centre (plates). k > 1 enlarges the image.',
  tolerance: TOLERANCE,
  referencePlanes: REFERENCE_PLANES,
  raster: { size: RASTER, marginFraction: RASTER_MARGIN_FRACTION },
  applyGate: {
    minMeanRoiIouGain: MIN_MEAN_ROI_IOU_GAIN,
    maxPlaneRoiIouLoss: MAX_PLANE_ROI_IOU_LOSS,
    maxPlaneResidualLossAu: MAX_PLANE_RESIDUAL_LOSS_AU,
    minPlateIouGain: MIN_PLATE_IOU_GAIN,
    maxPlateResidualLossAu: MAX_PLATE_RESIDUAL_LOSS_AU,
  },
  codePath: {
    atlasMask:
      'readFileSync(src/assets/anatomy/<slug>.glb) → GLTFLoader().parse() → contours.partBounds/boundsMayCut/extractContours(positions, indices, {axis, value}) → even-odd rasterisation with contours.pointInLoops on planeGeometry.planeTransform(axis, value, {width:512, height:512})',
    atlasSlugs,
    atlasSlugsSkipped: brainPartsSkipped,
    atlasPartsLoaded: brainParts.length,
    gridImageMask: {
      ct: `ct.bin uint8 ≥ ${CT_MASK_MIN_U8}, excluding ct-manifest.json intensity.backgroundValue 0 (no CT data outside the source FOV)`,
      mri: `mri-t1.bin uint8 ≥ ${MRI_MASK_MIN_U8}`,
    },
    plateImageMask:
      'stains/*.png decoded in-script (node:zlib inflateSync + PNG filters 0–4); tissue = luminance < (median of the 8-px border bands − ' +
      `${PHOTO_TISSUE_MARGIN})`,
    plateMetadata: 'src/data/sectionImages.ts transpiled with the project’s typescript, asset imports rewritten — the shipped file, not a copy',
    jpeg: 'NOT measured — no JPEG decoder exists in this repo and no dependency may be added',
  },
  grids: {},
  plates: {},
  unmeasurable: [],
}

say('fit-imaging-affine — re-runnable registration of the real-image layers')
say(`  objective : ${fitRecord.objective}`)
say(`  optimiser : ${fitRecord.optimiser}`)
say(`  tie-break : ${fitRecord.tieBreak}`)
say(`  atlas mask: ${brainParts.length} GLB parts → ${atlasSlugs.length} slugs (brainstem + cerebellum + diencephalon + telencephalon)`)
for (const s of brainPartsSkipped) say(`    ! skipped ${s}`)
say(`  code path : ${fitRecord.codePath.atlasMask}`)
say(
  `  raster    : ${RASTER}×${RASTER} samples/plane over the canonical extents × ${(1 + 2 * RASTER_MARGIN_FRACTION).toFixed(2)} ` +
    '(margin so a mask translated out of frame is penalised, not cropped)',
)

for (const which of ['ct', 'mri']) {
  const entry = which === 'ct' ? ctGrid : mriGrid
  const image = imageMasks[which]
  const planesOut = []
  const planeLive = []
  let sumBefore = 0
  let sumAfter = 0
  let improved = 0
  let worsened = 0
  let ties = 0
  for (const plane of REFERENCE_PLANES) {
    const planeGrid = makeGrid(plane.axis, plane.value)
    const { loops, partsCut } = atlasLoopsAt(plane)
    const atlas = rasterAtlas(planeGrid, loops)
    if (atlas.n === 0) {
      planesOut.push({
        axis: plane.axis,
        value: plane.value,
        atlasPartsCut: partsCut,
        atlasPixels: 0,
        note: 'no atlas brain cross-section at this plane — not fittable',
      })
      continue
    }
    const identity = { su: 1, sv: 1, duAu: 0, dvAu: 0 }
    const sampler = makeGridSampler(planeGrid, entry, image.mask)
    const fit = fitPlane({
      atlasMask: atlas.mask,
      sample: (outScratch, params) => sampler.sample(outScratch, params),
      scaleBounds: GRID_SCALE_BOUNDS,
      translateAu: GRID_TRANSLATE_AU,
      uniform: true,
    })
    const window = roiWindowFromMask(planeGrid, atlas.mask)
    const scratch = new Uint8Array(RASTER * RASTER)
    sampler.sample(scratch, identity)
    const before = measurePlacement(planeGrid, atlas.mask, scratch, window)
    sampler.sample(scratch, fit.best.params)
    const after = measurePlacement(planeGrid, atlas.mask, scratch, window)
    const atlasStats = maskStats(planeGrid, atlas.mask)
    const gain = after.roiIou - before.roiIou
    sumBefore += before.roiIou
    sumAfter += after.roiIou
    if (gain > 1e-9) improved += 1
    else if (gain < -1e-9) worsened += 1
    else ties += 1
    // Live references for the modality-wide fit (not serialised).
    planeLive.push({
      grid: planeGrid,
      atlasMask: atlas.mask,
      scratch: new Uint8Array(RASTER * RASTER),
      roi: window,
      before,
      sample: (outScratch, p) => sampler.sample(outScratch, p),
      axis: plane.axis,
      value: plane.value,
    })
    planesOut.push({
      axis: plane.axis,
      value: plane.value,
      atlasPartsCut: partsCut,
      atlasPixels: atlas.n,
      atlasCentroidAu: atlasStats.centroid,
      atlasExtentAu: atlasStats.extent,
      nearestGridSliceIndex: sampler.sliceIndex,
      roi: window,
      before,
      afterPerPlaneWinner: after,
      perPlaneWinner: fit.best.params,
      roiIouGainPerPlaneWinner: gain,
      centroidResidualGainPerPlaneWinnerAu: before.centroidResidualAu - after.centroidResidualAu,
      boundsHit: fit.boundsHit,
      evaluations: fit.evaluations,
      stageReport: fit.stageReport,
    })
  }
  const fitted = planesOut.filter((p) => p.before !== undefined)
  const n = fitted.length
  const meanRoiBefore = n > 0 ? sumBefore / n : 0
  const meanRoiAfter = n > 0 ? sumAfter / n : 0
  const meanResidualBefore = n > 0 ? fitted.reduce((a, p) => a + p.before.centroidResidualAu, 0) / n : 0
  const meanResidualAfter = n > 0 ? fitted.reduce((a, p) => a + p.afterPerPlaneWinner.centroidResidualAu, 0) / n : 0
  // The arithmetic mean of the per-plane winners — REPORTED ONLY, never applied:
  // applying it would move the image per plane as the reader scrubs.
  const perPlaneMeanParams =
    n > 0
      ? {
          su: fitted.reduce((a, p) => a + p.perPlaneWinner.su, 0) / n,
          sv: fitted.reduce((a, p) => a + p.perPlaneWinner.sv, 0) / n,
          duAu: fitted.reduce((a, p) => a + p.perPlaneWinner.duAu, 0) / n,
          dvAu: fitted.reduce((a, p) => a + p.perPlaneWinner.dvAu, 0) / n,
        }
      : { su: 1, sv: 1, duAu: 0, dvAu: 0 }
  // ONE similarity for the modality, fitted on the MEAN of the per-plane ROI IoU.
  const planeFits = planeLive
  const wideFree = fitModalityWide({ planeFits, scaleBounds: GRID_SCALE_BOUNDS, translateAu: GRID_TRANSLATE_AU })
  const wideTranslationOnly = fitModalityWide({
    planeFits,
    scaleBounds: GRID_SCALE_BOUNDS,
    translateAu: GRID_TRANSLATE_AU,
    fixedScale: 1,
  })
  // The candidate that ships: the better mean ROI IoU, then (tie) the simpler one.
  const chosen =
    wideTranslationOnly.meanRoiIou >= wideFree.meanRoiIou - 1e-12 ? wideTranslationOnly : wideFree
  const params = chosen.params
  // Per-plane detail of the chosen correction (what the manifest applies).
  let singleRoi = 0
  let singleImproved = 0
  const residualBeforeValues = []
  const residualAfterValues = []
  for (const plane of REFERENCE_PLANES) {
    const p = fitted.find((q) => q.axis === plane.axis && q.value === plane.value)
    if (p === undefined) continue
    const planeGrid = makeGrid(plane.axis, plane.value)
    const { loops } = atlasLoopsAt(plane)
    const atlas = rasterAtlas(planeGrid, loops)
    const sampler = makeGridSampler(planeGrid, entry, image.mask)
    const scratch = new Uint8Array(RASTER * RASTER)
    sampler.sample(scratch, params)
    const measured = measurePlacement(planeGrid, atlas.mask, scratch, p.roi)
    p.chosen = measured
    singleRoi += measured.roiIou
    if (measured.roiIou > p.before.roiIou + 1e-9) singleImproved += 1
    residualBeforeValues.push(p.before.centroidResidualAu)
    residualAfterValues.push(measured.centroidResidualAu)
  }
  const singleMeanRoi = chosen.meanRoiIou
  const singleMeanResidual = chosen.meanResidualAu
  const singleWorstIouLoss = chosen.worstPlaneIouLoss
  const singleWorstResidualLoss = chosen.worstPlaneResidualLossAu
  const median = (values) => {
    const s = [...values].sort((a, b) => a - b)
    return s.length === 0 ? 0 : s[(s.length - 1) >> 1]
  }
  const residualMedianBefore = median(residualBeforeValues)
  const residualMedianAfter = median(residualAfterValues)
  // THE REALITY CHECK, reported whatever the verdict is: is the atlas brain
  // actually INSIDE the image's mask? A similarity can only be trusted after a
  // brain-region-to-brain-region mapping exists, and that needs a segmenter this
  // repo does not have (see the header's limits). `atlasCoverage` = the share of
  // the atlas brain mask that already lands on image mask; `relativeExtent` = the
  // image's mask extent / the atlas extent, per in-plane axis.
  const coverageBefore = n > 0 ? fitted.reduce((a, p) => a + p.before.atlasCoverage, 0) / n : 0
  const relativeExtents = fitted.map((p) => p.before.relativeExtentRatio)
  const medianRelativeU = median(relativeExtents.map((r) => r[0]))
  const medianRelativeV = median(relativeExtents.map((r) => r[1]))
  const applicability = {
    imageMaskIsBrain: false,
    medianRelativeExtent: [medianRelativeU, medianRelativeV],
    meanAtlasCoverageBefore: coverageBefore,
    reason:
      'the image mask is the head’s soft-tissue envelope (no brain segmenter exists in this repo and this task may add no dependency), and the atlas mask is a brain: the atlas is 1/medianRelativeExtent of the image mask in extent and only ' +
      `${fmt(coverageBefore * 100, 1)} % of it lands on image mask, so a translation/scale search is not comparing two views of the same object`,
  }
  const applied =
    singleMeanRoi - meanRoiBefore >= MIN_MEAN_ROI_IOU_GAIN &&
    singleWorstIouLoss >= -MAX_PLANE_ROI_IOU_LOSS &&
    singleWorstResidualLoss <= MAX_PLANE_RESIDUAL_LOSS_AU &&
    singleMeanResidual <= meanResidualBefore + MAX_MEAN_RESIDUAL_LOSS_AU
  // A correction is only trustworthy when the two masks describe the same
  // object. They do not here (see `applicability`), so `applied` stays false and
  // the reason below names that, not just the gate arithmetic.
  const applicabilityBlocksFit =
    !applicability.imageMaskIsBrain &&
    (applicability.medianRelativeExtent[0] > 1.4 ||
      applicability.medianRelativeExtent[1] > 1.4 ||
      applicability.meanAtlasCoverageBefore < 0.5)
  const candidateName = chosen === wideTranslationOnly ? 'translation-only (scale pinned at 1)' : 'translation + uniform scale'
  fitRecord.grids[which] = {
    modality: which,
    grid: { dims: entry.dims, originAu: entry.origin, spacingAu: entry.spacing, voxelCount: entry.voxelCount },
    imageMask: {
      floorU8: image.floor,
      noDataValue: image.noData,
      keptVoxels: image.kept,
      rejectedNoData: image.rejectedNoData,
      rejectedBelowFloor: image.rejectedFloor,
      keptFraction: image.kept / entry.voxelCount,
    },
    roi: {
      definition: `the atlas brain mask's own in-plane bounding box padded by ${ROI_PAD_FRACTION * 100}% per side, in the plane frame (au)`,
      padFraction: ROI_PAD_FRACTION,
    },
    bounds: { scale: GRID_SCALE_BOUNDS, translateAu: GRID_TRANSLATE_AU, uniformScale: true, stages: STAGES },
    applicability,
    candidates: {
      translationOnly: {
        params: wideTranslationOnly.params,
        meanRoiIou: wideTranslationOnly.meanRoiIou,
        meanResidualAu: wideTranslationOnly.meanResidualAu,
        worstPlaneIouLoss: wideTranslationOnly.worstPlaneIouLoss,
        worstPlaneResidualLossAu: wideTranslationOnly.worstPlaneResidualLossAu,
        boundsHit: wideTranslationOnly.boundsHit,
        stageReport: wideTranslationOnly.stageReport,
      },
      translationPlusScale: {
        params: wideFree.params,
        meanRoiIou: wideFree.meanRoiIou,
        meanResidualAu: wideFree.meanResidualAu,
        worstPlaneIouLoss: wideFree.worstPlaneIouLoss,
        worstPlaneResidualLossAu: wideFree.worstPlaneResidualLossAu,
        boundsHit: wideFree.boundsHit,
        stageReport: wideFree.stageReport,
      },
      chosen: candidateName,
      rule: 'the candidate with the higher mean ROI IoU over the fitted planes wins; a tie goes to the translation-only candidate, which cannot falsify the 1 au = 1.2 mm geometry the bake established',
    },
    params,
    applied: applied && !applicabilityBlocksFit,
    applicationReason:
      applicabilityBlocksFit && applied
        ? `not applied although the gate arithmetic passes: ${applicability.reason}. Fitting a similarity between a brain mask and a whole-head mask maximises overlap by moving mass, not by registering anatomy (measured: the winning candidate raises ROI IoU by ${sgn(singleMeanRoi - meanRoiBefore, 5)} while moving the mean centroid residual ${fmt(meanResidualBefore)} → ${fmt(singleMeanResidual)} au). The committed placement is kept and the measured residual is reported instead.`
        : applied
          ? `applied (${candidateName}): mean ROI IoU over the ${n} fitted planes ${fmt(meanRoiBefore, 4)} → ${fmt(singleMeanRoi, 4)} (${sgn(singleMeanRoi - meanRoiBefore, 5)}, gate ≥ +${MIN_MEAN_ROI_IOU_GAIN}); no plane worsens by more than ${fmt(-singleWorstIouLoss, 5)} ROI IoU (gate ≤ ${MAX_PLANE_ROI_IOU_LOSS}); mean centroid residual ${fmt(meanResidualBefore)} → ${fmt(singleMeanResidual)} au, worst single-plane change ${sgn(singleWorstResidualLoss)} au (gate ≤ +${MAX_PLANE_RESIDUAL_LOSS_AU} au).`
          : `not applied: the fitted similarity does not clear the gate — mean ROI IoU would change by ${sgn(singleMeanRoi - meanRoiBefore, 5)} (gate ≥ +${MIN_MEAN_ROI_IOU_GAIN}), worst single plane ${sgn(singleWorstIouLoss, 5)} ROI IoU (gate ≥ −${MAX_PLANE_ROI_IOU_LOSS}), mean centroid residual ${fmt(meanResidualBefore)} → ${fmt(singleMeanResidual)} au (gate ≤ +${MAX_MEAN_RESIDUAL_LOSS_AU} au of the before value), worst single-plane residual change ${sgn(singleWorstResidualLoss)} au (gate ≤ +${MAX_PLANE_RESIDUAL_LOSS_AU} au). The committed placement is kept unchanged and this residual is reported rather than tuned away.`,
    planes: planesOut,
    planesFitted: n,
    improved,
    worsened,
    ties,
    meanRoiIouBefore: meanRoiBefore,
    meanRoiIouAfterPerPlaneWinners: meanRoiAfter,
    meanRoiIouWithChosenCorrection: singleMeanRoi,
    roiIouGainChosen: singleMeanRoi - meanRoiBefore,
    chosenCorrectionImprovedPlanes: singleImproved,
    chosenCorrectionWorstPlaneIouLoss: singleWorstIouLoss,
    chosenCorrectionWorstPlaneResidualLossAu: singleWorstResidualLoss,
    meanResidualBeforeAu: meanResidualBefore,
    meanResidualAfterPerPlaneWinnersAu: meanResidualAfter,
    meanResidualWithChosenCorrectionAu: singleMeanResidual,
    medianResidualBeforeAu: residualMedianBefore,
    medianResidualWithChosenCorrectionAu: residualMedianAfter,
    maxResidualBeforeAu: n > 0 ? Math.max(...fitted.map((p) => p.before.centroidResidualAu)) : 0,
    maxResidualAfterPerPlaneWinnersAu: n > 0 ? Math.max(...fitted.map((p) => p.afterPerPlaneWinner.centroidResidualAu)) : 0,
    meanAtlasCoverageBefore: n > 0 ? fitted.reduce((a, p) => a + p.before.atlasCoverage, 0) / n : 0,
    meanAtlasCoverageAfter: n > 0 ? fitted.reduce((a, p) => a + p.afterPerPlaneWinner.atlasCoverage, 0) / n : 0,
    meanAtlasCoverageWithChosenCorrection:
      n > 0 ? fitted.reduce((a, p) => a + (p.chosen?.atlasCoverage ?? NaN), 0) / n : 0,
  }
  const g = fitRecord.grids[which]
  say('')
  say(`=== ${which.toUpperCase()} — ${entry.dims.join('×')} uint8 lattice, mask uint8 ≥ ${image.floor}` +
    `${image.noData !== null ? `, backgroundValue ${image.noData} excluded` : ''} ===`)
  say(
    `  image mask: ${image.kept} of ${entry.voxelCount} voxels kept (${(g.imageMask.keptFraction * 100).toFixed(1)} %); ` +
      `rejected ${image.rejectedNoData} no-data + ${image.rejectedBelowFloor} below floor`,
  )
  say(`  ROI: atlas bbox padded ${ROI_PAD_FRACTION * 100}% per side (the head is larger than the atlas, so a global IoU is dominated by pixels no atlas brain can cover)`)
  say(`  bounds: scale ×[${GRID_SCALE_BOUNDS[0]}, ${GRID_SCALE_BOUNDS[1]}] uniform, translation ±${GRID_TRANSLATE_AU} au, stages ${STAGES.map((s) => `${s.scaleSteps}×${s.translateSteps}²`).join(' → ')}`)
  say('  plane     atlasPx  imgPx(ROI)  ROI IoU before → after    ΔIoU     residual before → after (au)   atlasCoverage before → after')
  for (const p of planesOut) {
    if (p.before === undefined) {
      say(`  ${`${p.axis}=${p.value}`.padEnd(9)}${String(p.atlasPixels).padStart(8)}             ${p.note}`)
      continue
    }
    say(
      `  ${`${p.axis}=${p.value}`.padEnd(9)}${String(p.atlasPixels).padStart(8)}${String(p.before.roiImagePixels).padStart(12)}   ` +
        `${fmt(p.before.roiIou, 4)} → ${fmt(p.afterPerPlaneWinner.roiIou, 4)}   ${sgn(p.roiIouGainPerPlaneWinner, 5)}   ` +
        `${fmt(p.before.centroidResidualAu).padStart(6)} → ${fmt(p.afterPerPlaneWinner.centroidResidualAu).padStart(6)}   ` +
        `${fmt(p.before.atlasCoverage, 3)} → ${fmt(p.afterPerPlaneWinner.atlasCoverage, 3)}`,
    )
  }
  say(
    `  per-plane winners: improved ${improved} · worsened ${worsened} · unchanged ${ties} of ${n} fitted planes` +
      `  (mean ROI IoU ${fmt(meanRoiBefore, 4)} → ${fmt(meanRoiAfter, 4)})`,
  )
  say(
    `  the mean of those winners (reported, NOT applied — it would move the image per plane): su=${fmt(perPlaneMeanParams.su, 5)} ` +
      `du=${sgn(perPlaneMeanParams.duAu, 3)} au dv=${sgn(perPlaneMeanParams.dvAu, 3)} au`,
  )
  say('  the correction that can ship is ONE similarity, fitted on the MEAN ROI IoU over all fitted planes:')
  for (const [label, cand] of [
    ['translation-only (scale = 1)', wideTranslationOnly],
    ['translation + uniform scale', wideFree],
  ]) {
    say(
      `    ${label.padEnd(30)} su=${fmt(cand.params.su, 5)} du=${sgn(cand.params.duAu, 3)} au dv=${sgn(cand.params.dvAu, 3)} au` +
        ` → mean ROI IoU ${fmt(cand.meanRoiIou, 4)} (${sgn(cand.meanRoiIou - meanRoiBefore, 5)}), mean residual ${fmt(cand.meanResidualAu)} au` +
        `, worst plane ${sgn(cand.worstPlaneIouLoss, 5)} IoU / ${sgn(cand.worstPlaneResidualLossAu)} au${cand.boundsHit ? ' [BOUND HIT]' : ''}`,
    )
  }
  say(`    chosen: ${candidateName}`)
  say(
    `  that chosen correction: improves ${singleImproved}/${n} planes, mean ROI IoU ${fmt(meanRoiBefore, 4)} → ${fmt(singleMeanRoi, 4)}, ` +
      `mean residual ${fmt(meanResidualBefore)} → ${fmt(singleMeanResidual)} au (median ${fmt(residualMedianBefore)} → ${fmt(residualMedianAfter)} au)`,
  )
  say(
    `  residual: mean centroid offset ${fmt(meanResidualBefore)} au → ${fmt(meanResidualAfter)} au (per-plane winners); ` +
      `max ${fmt(g.maxResidualBeforeAu)} → ${fmt(g.maxResidualAfterPerPlaneWinnersAu)} au`,
  )
  say(
    `  atlas coverage (share of the atlas brain mask landing on image mask): ${fmt(g.meanAtlasCoverageBefore, 3)} → ${fmt(g.meanAtlasCoverageAfter, 3)}` +
      ` (per-plane winners) / ${fmt(g.meanAtlasCoverageWithChosenCorrection, 3)} (chosen correction)`,
  )
  say(
    `  applicability: the atlas mask is the BRAIN and the image mask is the HEAD — median extent ratio ${fmt(applicability.medianRelativeExtent[0])}×${fmt(applicability.medianRelativeExtent[1])}, ` +
      `only ${fmt(applicability.meanAtlasCoverageBefore * 100, 1)} % of the atlas lands on image mask`,
  )
  say(`  VERDICT: ${g.applied ? 'APPLIED — written into the manifest’s registration.display block' : 'NOT APPLIED — the committed placement is kept unchanged'}`)
  say(`           ${g.applicationReason}`)
}

/* ====================================================================== *
 *  6. PLATES — the committed PNG photographs                              *
 * ====================================================================== */

const stainFiles = readdirSync(resolve(STAINS_DIR)).sort()
const pngFiles = stainFiles.filter((f) => f.toLowerCase().endsWith('.png'))
const jpegFiles = stainFiles.filter((f) => /\.jpe?g$/i.test(f))

say('')
say(`=== PLATES (${STAINS_DIR}) ===`)
say(`  committed files: ${stainFiles.length} — PNG ${pngFiles.length} (decodable here), JPEG ${jpegFiles.length} (NOT decodable here)`)
say(`  JPEG verdict: unmeasurable: no-decoder — no JPEG decoder exists in this repo (no sharp/jimp/canvas in node_modules,`)
say(`                scripts/lib/png.mjs only ENCODES) and this task may add no dependency, so those ${jpegFiles.length} plates keep`)
say(`                their committed placement and NOTHING about them is claimed as measured.`)

const plateEntries = await readPlateEntries()
const plateByFile = new Map()
for (const entry of plateEntries) {
  const name = String(entry.file).split('/').pop()
  plateByFile.set(name, entry)
}

const plateOut = []
const plateDecoded = []
for (const file of pngFiles) {
  const entry = plateByFile.get(file)
  if (entry === undefined) {
    plateOut.push({ file, status: 'not-in-manifest', note: 'the file is committed but no sectionImages.ts entry references it' })
    continue
  }
  let decoded
  try {
    decoded = decodePngLuma(readFileSync(resolve(STAINS_DIR, file)))
  } catch (error) {
    plateOut.push({ file, id: entry.id, status: 'decode-failed', note: String(error?.message ?? error) })
    continue
  }
  plateDecoded.push({ file, entry, decoded })
}

fitRecord.plates = {
  dir: STAINS_DIR,
  total: stainFiles.length,
  png: pngFiles.length,
  jpeg: jpegFiles.length,
  jpegStatus: 'unmeasurable: no-decoder',
  jpegFiles,
  jpegReason: fitRecord.codePath.jpeg,
  measured: [],
  unmeasured: [],
}

let platesImproved = 0
let platesWorsened = 0
let platesUnchanged = 0
let platesNotFittable = 0
for (const { file, entry, decoded } of plateDecoded) {
  const tissue = photoTissueMask(decoded)
  const axis = entry.axis === 'transverse' ? 'y' : entry.axis === 'sagittal' ? 'x' : 'z'
  const planeValue = Number.isFinite(entry.planeValue) ? entry.planeValue : null
  const fit = entry.fit
  const base = {
    file,
    id: entry.id,
    axis,
    planeValue,
    naturalWidth: decoded.width,
    naturalHeight: decoded.height,
    tissuePixels: tissue.n,
    tissueFraction: tissue.n / (decoded.width * decoded.height),
    backgroundLuma: tissue.background,
    tissueLimit: tissue.limit,
    committedFit: fit ?? null,
  }
  if (fit === undefined || fit === null || planeValue === null) {
    platesNotFittable += 1
    fitRecord.plates.unmeasured.push({
      ...base,
      status: 'not-fittable',
      note:
        fit === undefined || fit === null
          ? 'the entry carries no committed `fit`, so there is no placement to correct'
          : 'the entry carries no anchored `planeValue`, so it is not placed on a measurable plane',
    })
    continue
  }
  // Choose the reference plane of the same axis nearest to this plate's anchor.
  const candidates = REFERENCE_PLANES.filter((p) => p.axis === axis)
  const plane = candidates.reduce((a, b) =>
    Math.abs(b.value - planeValue) < Math.abs(a.value - planeValue) ? b : a,
  )
  const planeGrid = makeGrid(plane.axis, plane.value)
  const { loops, partsCut } = atlasLoopsAt(plane)
  const atlas = rasterAtlas(planeGrid, loops)
  if (atlas.n === 0) {
    platesNotFittable += 1
    fitRecord.plates.unmeasured.push({
      ...base,
      status: 'no-atlas-cross-section',
      referencePlane: plane,
      note: 'no atlas brain mesh crosses this plate’s reference plane, so no mask overlap exists to maximise',
    })
    continue
  }
  const atlasStats = maskStats(planeGrid, atlas.mask)
  const sampler = makePlateSampler(planeGrid, decoded, tissue.mask, fit)
  const fitResult = fitPlane({
    atlasMask: atlas.mask,
    sample: (outScratch, params) => sampler.sample(outScratch, params),
    scaleBounds: PLATE_SCALE_BOUNDS,
    translateAu: PLATE_TRANSLATE_AU,
    uniform: false,
  })
  const before = fitResult.identity
  const after = fitResult.best
  const gain = after.iou - before.iou
  const scratch = new Uint8Array(RASTER * RASTER)
  sampler.sample(scratch, before.params)
  const imgBefore = maskStats(planeGrid, scratch)
  scratch.fill(0)
  sampler.sample(scratch, after.params)
  const imgAfter = maskStats(planeGrid, scratch)
  const extentRatioBefore = [
    imgBefore.extent[0] / atlasStats.extent[0],
    imgBefore.extent[1] / atlasStats.extent[1],
  ]
  const extentRatioAfter = [
    imgAfter.extent[0] / atlasStats.extent[0],
    imgAfter.extent[1] / atlasStats.extent[1],
  ]
  const residualBefore = Math.hypot(
    imgBefore.centroid[0] - atlasStats.centroid[0],
    imgBefore.centroid[1] - atlasStats.centroid[1],
  )
  const residualAfter = Math.hypot(
    imgAfter.centroid[0] - atlasStats.centroid[0],
    imgAfter.centroid[1] - atlasStats.centroid[1],
  )
  // THE PLATE GATE. A photograph is a different head from the atlas (the UBC
  // plates are whole-brain cross-sections, the atlas mask here is the brain), so
  // maximising IoU alone is not trustworthy: an enlarged plate can buy
  // intersection without any real alignment, and it can drift the centroid while
  // the IoU rises. A plate correction is therefore applied only when the IoU
  // gains AND the centroid residual does not get worse. Reported either way.
  const residualOk = residualAfter <= residualBefore + MAX_PLATE_RESIDUAL_LOSS_AU
  // SANITY GATE: a correction that shrinks or inflates a plate by more than
  // `PLATE_EXTENT_SANITY` in either axis against the atlas cross-section it is
  // registering to is not a registration, whatever the IoU says, and one whose
  // optimum sits on the final-stage bound is not even converged. Both are
  // reported, neither is applied.
  const extentOkBefore = ratioWithin(extentRatioBefore, PLATE_EXTENT_SANITY)
  const extentOkAfter = ratioWithin(extentRatioAfter, PLATE_EXTENT_SANITY)
  /**
   * EXTENT REPAIR (v9 orchestrator amendment) — the one case where the centroid
   * criterion may not veto, and the reason it exists:
   *
   * A plate whose COMMITTED placement is itself outside the extent band has no
   * meaningful centroid reference. The UBC *coronal* plates are drawn at
   * 0.14× / 0.09× the atlas cross-section — a small patch in the middle of the
   * section — so their tissue centroid happens to sit near the atlas centroid by
   * accident of being tiny (3.8 au), and the correction that fixes the size
   * (1.32× / 0.74×, i.e. the ≈4× enlargement the committed 17.9 px/au should have
   * been, corroborated independently by the 4.0816 px/au measured for this series
   * in `assets-src/imaging3/VHP_ANCHORS.md`) moves that accidental centroid by
   * 1.7–7.8 au. Refusing it on `MAX_PLATE_RESIDUAL_LOSS_AU = 0.5 au` — against a
   * documented absolute plane uncertainty of ±10 au for these plates — would keep
   * the photograph four times too small in the name of a metric that cannot see
   * the difference between "aligned" and "so small it cannot be misaligned".
   *
   * So: repairing a placement that the gate's OWN sanity check already rejects is
   * allowed to override the centroid criterion, and nothing else is. The override
   * is recorded in the plate's `applyReason`, so the accepted correction says so.
   */
  const extentRepair = !extentOkBefore && extentOkAfter
  const applied =
    gain >= MIN_PLATE_IOU_GAIN && (residualOk || extentRepair) && extentOkAfter && !fitResult.boundsHit
  if (applied) platesImproved += 1
  else if (gain < -1e-9) platesWorsened += 1
  else platesUnchanged += 1
  const holdReason =
    fitResult.boundsHit
      ? `not applied: the optimum sits on the final search lattice's own bound (${JSON.stringify(after.params)}), so it is not a converged interior fit`
      : !extentOkAfter
        ? `not applied: the best correction would make the plate ${fmt(extentRatioAfter[0])}× / ${fmt(extentRatioAfter[1])}× the atlas cross-section it is registered to (sanity limit ${PLATE_EXTENT_SANITY}× — outside that the "gain" is the plate covering the atlas, not registering to it; the committed placement is already ${fmt(extentRatioBefore[0])}× / ${fmt(extentRatioBefore[1])}×)`
        : gain < MIN_PLATE_IOU_GAIN
          ? `not applied: the best correction found gains only ${sgn(gain)} IoU (gate ≥ +${MIN_PLATE_IOU_GAIN})`
          : `not applied: the IoU gain of ${sgn(gain)} is bought by moving the plate's tissue centroid ${sgn(residualAfter - residualBefore)} au AWAY from the atlas centroid (gate ≤ +${MAX_PLATE_RESIDUAL_LOSS_AU} au) — not a registration improvement`
  const record = {
    ...base,
    status: applied ? 'improved' : 'kept-committed-placement',
    applyReason: applied
      ? `applied: ROI IoU gains ${sgn(gain)} (gate ≥ +${MIN_PLATE_IOU_GAIN}), the centroid residual moves ${sgn(residualAfter - residualBefore)} au (gate ≤ +${MAX_PLATE_RESIDUAL_LOSS_AU} au)${extentRepair ? ` — OVERRIDDEN by the extent repair: the committed placement was ${fmt(extentRatioBefore[0])}× / ${fmt(extentRatioBefore[1])}× the atlas cross-section (outside the ${PLATE_EXTENT_SANITY}× sanity limit, so its centroid is not a registration reference) and the correction brings it to ${fmt(extentRatioAfter[0])}× / ${fmt(extentRatioAfter[1])}×, inside it` : ''}, the corrected extent ratio ${fmt(extentRatioAfter[0])}× / ${fmt(extentRatioAfter[1])}× is inside the ${PLATE_EXTENT_SANITY}× sanity limit${extentOkBefore ? '' : ` (the committed ${fmt(extentRatioBefore[0])}× / ${fmt(extentRatioBefore[1])}× was not)`}, and no final-stage bound is hit`
      : holdReason,
    referencePlane: plane,
    planeDistanceAu: Math.abs(plane.value - planeValue),
    atlasPartsCut: partsCut,
    atlasPixels: atlas.n,
    atlasCentroidAu: atlasStats.centroid,
    atlasExtentAu: atlasStats.extent,
    plateRectAuCommitted: sampler.plateRectAu,
    plateCentreAuCommitted: sampler.plateCenterAu,
    maskPixelsBefore: imgBefore.n,
    maskPixelsAfter: imgAfter.n,
    extentBeforeAu: imgBefore.extent,
    extentAfterAu: imgAfter.extent,
    extentRatioToAtlasBefore: extentRatioBefore,
    extentRatioToAtlasAfter: extentRatioAfter,
    centroidResidualBeforeAu: residualBefore,
    centroidResidualAfterAu: residualAfter,
    iouBefore: before.iou,
    iouAfter: after.iou,
    iouGain: gain,
    best: after.params,
    boundsHit: fitResult.boundsHit,
    evaluations: fitResult.evaluations,
    // What the correction would become in the committed `fit` vocabulary
    // (imageLayers.drawStainToView): scale is px per canonical au, dx the offset
    // from the image centre to the tissue midline, dy the vertical offset.
    proposedFit: {
      scale: fit.scale / after.params.sv,
      dx: fit.dx + after.params.duAu,
      dy: (fit.dy ?? 0) - after.params.dvAu,
      mirrorX: fit.mirrorX === true,
    },
    stageReport: fitResult.stageReport,
  }
  fitRecord.plates.measured.push(record)
  plateOut.push(record)
}

if (fitRecord.plates.measured.length > 0) {
  say('')
  say('  plate                    ref plane   tissue%   IoU before → after     ΔIoU      residual before → after (au)   extent ratio to atlas        verdict')
  for (const p of plateOut) {
    if (p.iouBefore === undefined) {
      say(`  ${p.file.padEnd(24)} ${p.status}${p.note !== undefined ? ` — ${p.note}` : ''}`)
      continue
    }
    say(
      `  ${p.file.padEnd(24)} ${`${p.referencePlane.axis}=${p.referencePlane.value}`.padEnd(10)}  ` +
        `${fmt(p.tissueFraction * 100, 1).padStart(5)}   ` +
        `${fmt(p.iouBefore, 4)} → ${fmt(p.iouAfter, 4)}   ${sgn(p.iouGain)}   ` +
        `${fmt(p.centroidResidualBeforeAu).padStart(6)} → ${fmt(p.centroidResidualAfterAu).padStart(6)}   ` +
        `${fmt(p.extentRatioToAtlasBefore[0])}×${fmt(p.extentRatioToAtlasBefore[1])} → ${fmt(p.extentRatioToAtlasAfter[0])}×${fmt(p.extentRatioToAtlasAfter[1])}   ` +
        `${p.status}`,
    )
  }
}
say(
  `  plates measured ${fitRecord.plates.measured.length} · APPLIED ${platesImproved} · kept committed placement ${platesUnchanged + platesWorsened} · ` +
    `not fittable ${platesNotFittable} · JPEG unmeasurable ${jpegFiles.length}`,
)
for (const p of fitRecord.plates.measured) {
  if (p.status !== 'improved') say(`    kept ${p.file}: ${p.applyReason}`)
}
const plateMeanBefore =
  fitRecord.plates.measured.length > 0
    ? fitRecord.plates.measured.reduce((a, p) => a + p.iouBefore, 0) / fitRecord.plates.measured.length
    : 0
const plateMeanAfter =
  fitRecord.plates.measured.length > 0
    ? fitRecord.plates.measured.reduce((a, p) => a + p.iouAfter, 0) / fitRecord.plates.measured.length
    : 0
fitRecord.plates.meanIouBefore = plateMeanBefore
fitRecord.plates.meanIouAfterPerPlateWinners = plateMeanAfter
fitRecord.plates.improved = platesImproved
fitRecord.plates.worsened = platesWorsened
fitRecord.plates.unchanged = platesUnchanged
fitRecord.plates.notFittable = platesNotFittable
say(`  plate mean IoU ${fmt(plateMeanBefore, 4)} → ${fmt(plateMeanAfter, 4)} with the per-plate winners`)

/* ====================================================================== *
 *  7. THE DISPLAY BLOCK — what goes into the manifest                      *
 * ====================================================================== */


/**
 * The manifest's `registration.display` block for one modality.
 *
 * Pure: it only READS the measurement this run produced, so the CLI can build it
 * and then decide whether to write it. `main()` returns it as
 * `{ fitRecord, plateRecord, displayBlocks }` and the CLI does every write, in
 * one place, after the whole measurement has finished.
 */
function displayBlock(which) {
    const g = fitRecord.grids[which]
    const summary = {
      applied: g.applied,
      reason: g.applicationReason,
      frame: 'plane frame (u = AXIS_PAIR[axis][0], v = AXIS_PAIR[axis][1]); 1 au = 1.2 mm',
      method:
        're-runnable fitter: node scripts/fit-imaging-affine.mjs --report (see src/assets/imaging/registration-fit.json for every plane, bound and residual)',
      objective: fitRecord.objective,
      optimiser: fitRecord.optimiser,
      tieBreak: fitRecord.tieBreak,
      signConvention: fitRecord.signConvention,
      searchBounds: g.bounds,
      raster: fitRecord.raster,
      applyGate: fitRecord.applyGate,
      frameCenterAu: {
        note:
          'the centre of the grid’s own canonical rectangle, in the plane frame — the reference point the parameters are relative to; imageLayers.drawGridToView recomputes it from dims/originAu/spacingAu, so the parameters survive a lattice change',
      },
      parameters: {
        su: g.params.su,
        sv: g.params.sv,
        duAu: g.params.duAu,
        dvAu: g.params.dvAu,
      },
      /**
       * The PER-PLANE measurement, stored in the manifest (v9 orchestrator).
       *
       * `scripts/verify/imaging-fit.mjs` asserts, for every reference plane, that
       * the manifest carries what this run measured there ("the manifest stores
       * this plane"); without this table the gate failed 16 times on CT and MRI
       * whatever the verdicts were. It is also the honest record a reader needs:
       * the per-plane before/after overlap and centroid residual, the per-plane
       * best-fit parameters, and whether that plane's optimum sat on a search bound
       * (i.e. is not a converged fit). Stored for the planes that have a `before`
       * row — the others produce no atlas cross-section at all, which `unmeasurable`
       * states separately.
       */
      planes: g.planes
        .filter((p) => p.before !== undefined && p.afterPerPlaneWinner !== undefined)
        .map((p) => ({
          axis: p.axis,
          value: p.value,
          atlasPartsCut: p.atlasPartsCut,
          atlasPixels: p.atlasPixels,
          before: {
            roiIou: p.before.roiIou,
            centroidResidualAu: p.before.centroidResidualAu,
            imageCentroidAu: p.before.imageCentroidAu,
            atlasCentroidAu: p.before.atlasCentroidAu,
            extentRatioToAtlas: p.before.relativeExtentRatio,
          },
          afterPerPlaneWinner: {
            roiIou: p.afterPerPlaneWinner.roiIou,
            centroidResidualAu: p.afterPerPlaneWinner.centroidResidualAu,
            imageCentroidAu: p.afterPerPlaneWinner.imageCentroidAu,
            extentRatioToAtlas: p.afterPerPlaneWinner.relativeExtentRatio,
          },
          perPlaneWinner: p.perPlaneWinner,
          boundsHit: p.boundsHit === true,
          applied: false,
          note:
            'measured for this reference plane only; the applied correction is the single one in `parameters` (or none, when `applied` is false). A per-plane best fit is NOT applied: moving each plane by its own optimum would shear the volume, which is not a rigid placement of one subject in one frame.',
        })),
      residuals: {
        planesFitted: g.planesFitted,
        improved: g.improved,
        worsened: g.worsened,
        unchanged: g.ties,
        roi: g.roi.definition,
        roiIouBefore: g.meanRoiIouBefore,
        roiIouAfterPerPlaneWinners: g.meanRoiIouAfterPerPlaneWinners,
        roiIouWithChosenCorrection: g.meanRoiIouWithChosenCorrection,
        roiIouGainSingle: g.roiIouGainSingle,
        minRoiIouBefore: Math.min(...g.planes.filter((p) => p.before !== undefined).map((p) => p.before.roiIou)),
        maxRoiIouBefore: Math.max(...g.planes.filter((p) => p.before !== undefined).map((p) => p.before.roiIou)),
        meanCentroidResidualBeforeAu: g.meanResidualBeforeAu,
        meanCentroidResidualAfterPerPlaneWinnersAu: g.meanResidualAfterPerPlaneWinnersAu,
        meanCentroidResidualWithChosenCorrectionAu: g.meanResidualWithChosenCorrectionAu,
        maxCentroidResidualBeforeAu: g.maxResidualBeforeAu,
        maxCentroidResidualAfterPerPlaneWinnersAu: g.maxResidualAfterPerPlaneWinnersAu,
        meanAtlasCoverageBefore: g.meanAtlasCoverageBefore,
        meanAtlasCoverageAfter: g.meanAtlasCoverageAfter,
        toleranceIou: TOLERANCE.iou,
        toleranceAu: TOLERANCE.au,
        note:
          `Both masks are measured, never assumed. ATLAS: the union of ${fitRecord.codePath.atlasSlugs.length} committed GLB parts through the section pipeline's own clipping (${fitRecord.codePath.atlasMask}). ` +
          `IMAGE (${which.toUpperCase()}): ${which === 'ct' ? `ct.bin uint8 ≥ ${CT_MASK_MIN_U8} with the manifest backgroundValue 0 (no CT data) excluded` : `mri-t1.bin uint8 ≥ ${MRI_MASK_MIN_U8}`}, ` +
          'i.e. the head\u2019s soft-tissue envelope as the acquisition renders it \u2014 there is no brain segmenter in this repo, so it CONTAINS the atlas brain and the GLOBAL IoU is small by construction: it is not a mis-registration percentage. ' +
          `The ROI IoU is measured inside the atlas' own in-plane bounding box padded ${ROI_PAD_FRACTION * 100}%, where the two masks have comparable area; the residual that carries the units is the centroid offset in au ` +
          `(mean ${fmt(g.meanResidualBeforeAu)} au before, ${fmt(g.meanResidualAfterPerPlaneWinnersAu)} au after the per-plane winners; max ${fmt(g.maxResidualBeforeAu)} \u2192 ${fmt(g.maxResidualAfterPerPlaneWinnersAu)} au).`,
      },
    }
    return summary
}

/* ====================================================================== *
 *  7b. THE RECORDS THIS RUN PRODUCED — returned, not yet written           *
 * ====================================================================== */

const plateRecord = {
  schemaVersion: 1,
  generatedBy: 'scripts/fit-imaging-affine.mjs',
  objective: fitRecord.objective,
  optimiser: fitRecord.optimiser,
  tieBreak: fitRecord.tieBreak,
  signConvention: fitRecord.signConvention,
  tolerance: TOLERANCE,
  bounds: { scale: PLATE_SCALE_BOUNDS, translateAu: PLATE_TRANSLATE_AU, stages: STAGES, uniformScale: false },
  tissueRule: fitRecord.codePath.plateImageMask,
  total: fitRecord.plates.total,
  png: fitRecord.plates.png,
  jpeg: fitRecord.plates.jpeg,
  jpegStatus: fitRecord.plates.jpegStatus,
  jpegFiles: fitRecord.plates.jpegFiles,
  jpegReason: fitRecord.plates.jpegReason,
  minPlateIouGain: MIN_PLATE_IOU_GAIN,
  maxPlateResidualLossAu: MAX_PLATE_RESIDUAL_LOSS_AU,
  measured: fitRecord.plates.measured,
  unmeasured: fitRecord.plates.unmeasured,
  improved: fitRecord.plates.improved,
  worsened: fitRecord.plates.worsened,
  unchanged: fitRecord.plates.unchanged,
  notFittable: fitRecord.plates.notFittable,
  meanIouBefore: fitRecord.plates.meanIouBefore,
  meanIouAfterPerPlateWinners: fitRecord.plates.meanIouAfterPerPlateWinners,
}

const displayBlocks = { ct: displayBlock('ct'), mri: displayBlock('mri') }

return { fitRecord, plateRecord, displayBlocks }
}

/* ====================================================================== *
 *  8. CLI                                                                 *
 * ====================================================================== */

const { fitRecord: fit, plateRecord: plates, displayBlocks: blocks } = await runImagingFit()

if (JSON_ONLY) {
  // The record the verifier diffs: the fitter's own measurement, produced by the
  // same code that writes the manifests.
  //
  // ORCHESTRATOR FIX (v9 closure) — the payload used to be `{ grids, plates }`,
  // which silently dropped the SHARED metadata: `objective`, `optimiser`,
  // `tieBreak`, `signConvention`, `applyGate`, `raster` and above all `codePath`
  // (the atlas-mask provenance the gate PRINTS so a reader can see how the mask
  // was measured). The gate reads those fields PER MODALITY —
  // `recomputed.grids.ct.objective`, `…grids.ct.codePath.atlasSlugs` — so it
  // crashed with `TypeError: Cannot read properties of undefined (reading
  // 'atlasSlugs')` at its own line 110, before checking a single number. That is
  // what kept this task from ever closing: its evidence command could not run.
  //
  // The shared fields are now attached to EACH modality entry as well as kept at
  // the top level, so both readings work. This is safe for every existing
  // consumer because the gate compares field by field (`display.applied ===
  // rec.applied`, per-plane residuals, JSON.stringify of the parameter object) and
  // never by whole-object equality — extra keys cannot make a comparison pass.
  const shared = {
    objective: fit.objective,
    optimiser: fit.optimiser,
    tieBreak: fit.tieBreak,
    signConvention: fit.signConvention,
    applyGate: fit.applyGate,
    raster: fit.raster,
    codePath: fit.codePath,
  }
  const gridsForJson = Object.fromEntries(
    Object.entries(fit.grids).map(([which, grid]) => [which, { ...grid, ...shared }]),
  )
  process.stdout.write(`${JSON.stringify({ ...shared, grids: gridsForJson, plates })}\n`)
  process.exit(0)
}

if (!WRITE) {
  console.log('')
  console.log('dry run — nothing was written. Re-run with --report to commit the corrections.')
  process.exit(0)
}

for (const which of ['ct', 'mri']) {
  const path = which === 'ct' ? CT_MANIFEST_PATH : MRI_MANIFEST_PATH
  const manifest = JSON.parse(readFileSync(resolve(path), 'utf8'))
  // Never touch dims/originAu/spacingAu (the verify:anatomy legacy-level
  // invariant): the correction is display-time only (PLAN.md §7.3).
  manifest.registration = manifest.registration ?? {}
  manifest.registration.display = blocks[which]
  writeJson(path, manifest)
}
writeJson(FIT_RECORD_PATH, fit)
writeJson(PLATE_RECORD_PATH, plates)
console.log('')
console.log(`wrote ${CT_MANIFEST_PATH} (registration.display), ${MRI_MANIFEST_PATH} (registration.display)`)
console.log(`wrote ${FIT_RECORD_PATH} and ${PLATE_RECORD_PATH}`)
console.log('verify with: node scripts/verify/imaging-fit.mjs')
process.exit(0)
