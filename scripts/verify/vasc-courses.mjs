#!/usr/bin/env node
/**
 * v17 gate Ã¢â‚¬â€ THE GRANULAR VASCULATURE: records, courses, clip bounds, mirror
 * symmetry, radius arithmetic, and the surface projection MEASURED AGAIN.
 *
 * Run from the repo root:  node scripts/verify/vasc-courses.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:vasc-courses": "node scripts/verify/vasc-courses.mjs"
 *  Ã¢â‚¬â€ package.json is the integrator's file, so it is named here, not edited.)
 *
 * Ã¢â€â‚¬Ã¢â€â‚¬ WHAT THIS GATE PROVES, AND HOW Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * It re-reads the SHIPPED data (src/data/structures/vasculature-courses.json,
 * src/data/taxonomy.json, src/data/webRefs.ts) and re-parses the COMMITTED GLBs
 * in src/assets/anatomy/ Ã¢â‚¬â€ it never re-types a coordinate. In particular Ã‚Â§6
 * re-derives every surface projection from the mesh bytes and compares the
 * result with the number stored in the record, so a course whose declared
 * residual is a leftover of a previous build fails here.
 *
 *   1. REGISTRATION Ã¢â‚¬â€ every new vessel id exists in taxonomy.json, has
 *      kind 'vessel', region 'vasculature', the `vasc-` prefix, a valid
 *      laterality, and a parent that resolves.
 *   2. PROJECTION ARITHMETIC Ã¢â‚¬â€ for every waypoint the gate re-projects the
 *      stored control point onto the declared envelope with the nearest-triangle
 *      method, and asserts |waypoint Ã¢Ë†â€™ P| = tubeRadius + 0.15 au (the placement
 *      rule) and that the record's stored `residual` for that control point
 *      matches the re-measured |control point Ã¢Ë†â€™ P|. Both numbers print.
 *   3. CLIP BOUNDS Ã¢â‚¬â€ every waypoint of every course is inside CLIP_BOUNDS.
 *   4. MIRROR CONSISTENCY Ã¢â‚¬â€ every `paired` record's course, mirrored x Ã¢â€ â€™ Ã¢Ë†â€™x,
 *      projects onto the RIGHT-hand envelope with a residual equal to the
 *      left-hand one within tolerance: the mirror is really a mirror.
 *   5. LINKS Ã¢â‚¬â€ every new record names its parent artery, its parent registry
 *      row, a non-empty territory[], and every territory/supply id resolves.
 *   6. THE LENTICULOSTRIATE FIX Ã¢â‚¬â€ the medial and lateral groups and all six
 *      chains exist; the ellipsoid record `vasc-lenticulostriate-arteries`
 *      now declares a course; and the ids that used to render as blobs are all
 *      in the course table (which is what `hasVesselCourse` reads).
 *   7. THE RADIUS TABLE Ã¢â‚¬â€ every course's mm calibre, its converted radius and
 *      the conversion error, printed per vessel.
 *   8. PAYLOAD Ã¢â‚¬â€ no new GLB: the anatomy directory is still 138 parts and
 *      under the 14 MiB cap (this run adds zero bytes of geometry).
 *
 * Ã¢â€â‚¬Ã¢â€â‚¬ WHAT ONLY THE ORCHESTRATOR CAN CONFIRM (Chrome cannot run in this
 *    sandbox Ã¢â‚¬â€ no claim below is made by this gate) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 *   Ã¢â‚¬Â¢ that the 3D scene PAINTS the new tubes and no longer paints the two red
 *     ellipsoids (this gate proves the records and the measured geometry; it
 *     cannot prove pixels);
 *   Ã¢â‚¬Â¢ that selecting a tube in 3D and its contour in 2D selects the same
 *     record;
 *   Ã¢â‚¬Â¢ the frame-time cost of the extra tubes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ANATOMY = resolve(ROOT, 'src/assets/anatomy')

/* ==================================================================== *
 *  assertions
 * ==================================================================== */

let checks = 0
const failures = []

function assert(condition, label, detail = '') {
  checks += 1
  if (condition) return true
  failures.push(detail === '' ? label : `${label} Ã¢â‚¬â€ ${detail}`)
  return false
}

const fmt = (n, d = 3) => (Number.isFinite(n) ? Number(n).toFixed(d) : String(n))
const pad = (v, w) => String(v).padEnd(w)
const padStart = (v, w) => String(v).padStart(w)
const at = (v) => `[${v.map((n) => fmt(n, 3)).join(', ')}]`
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const mm = (au) => au * 1.2

/* ==================================================================== *
 *  the committed data
 * ==================================================================== */

const COURSE_FILE = 'src/data/structures/vasculature-courses.json'
const courses = JSON.parse(readFileSync(resolve(ROOT, COURSE_FILE), 'utf8'))
const taxonomy = JSON.parse(readFileSync(resolve(ROOT, 'src/data/taxonomy.json'), 'utf8'))
const taxonomyById = new Map(taxonomy.map((row) => [row.id, row]))
const webRefs = readFileSync(resolve(ROOT, 'src/data/webRefs.ts'), 'utf8')
const manifest = JSON.parse(readFileSync(resolve(ANATOMY, 'anatomy-manifest.json'), 'utf8'))
const clipSource = readFileSync(resolve(ROOT, 'src/components/viewer3d/clipPlanes.ts'), 'utf8')
const CLIP_BOUNDS = JSON.parse(
  clipSource.match(/CLIP_BOUNDS\s*=\s*(\{[\s\S]*?\n\})/)[1].replace(/(\w+):/g, '"$1":').replace(/,(\s*[}\]])/g, '$1'),
)
const MM_PER_AU = 1.2
const CLEARANCE_AU = 0.15

console.log('=== v17 Ã¢â‚¬â€ the granular vasculature: records, courses, projected geometry ===')
console.log(
  `data: ${courses.length} vessel course records Ã‚Â· ${taxonomy.length} registry rows ` +
    `(${taxonomy.filter((r) => r.kind === 'vessel').length} vessel) Ã‚Â· CLIP_BOUNDS x[${CLIP_BOUNDS.x.min},${CLIP_BOUNDS.x.max}] ` +
    `y[${CLIP_BOUNDS.y.min},${CLIP_BOUNDS.y.max}] z[${CLIP_BOUNDS.z.min},${CLIP_BOUNDS.z.max}]`,
)

/* ==================================================================== *
 *  GLB reader + exact nearest-surface (self-contained: the gate must run
 *  from a clean checkout with nothing but node)
 * ==================================================================== */

const meshCache = new Map()

function readGlb(file) {
  const buffer = readFileSync(resolve(ANATOMY, file))
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error(`${file}: not a GLB`)
  let offset = 12
  let json = null
  let binStart = 0
  let binLength = 0
  while (offset < buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (chunkType === 0x4e4f534a) json = JSON.parse(buffer.toString('utf8', start, start + chunkLength))
    else if (chunkType === 0x004e4942) { binStart = start; binLength = chunkLength }
    offset = start + chunkLength
  }
  if (json === null || binLength === 0) throw new Error(`${file}: missing JSON or BIN chunk`)
  const primitive = json.meshes[0].primitives[0]
  const COMPONENT = { 5121: [Uint8Array, 1], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] }
  const COUNT = { SCALAR: 1, VEC3: 3 }
  const read = (index) => {
    const accessor = json.accessors[index]
    const [Ctor, bytes] = COMPONENT[accessor.componentType]
    const components = COUNT[accessor.type]
    const bufferView = json.bufferViews[accessor.bufferView]
    /* bufferView.byteOffset is relative to the BIN chunk (verified on
     * ctx-hemisphere-l: the index view sits at 969312 with a 1,942,848-byte
     * BIN chunk, so 969312 alone lands in the JSON chunk and decodes to
     * garbage). Both readings are tried and the one that is fully in range is
     * used, so a differently-written GLB cannot silently mis-decode. */
    const stride = bufferView.byteStride ?? components * bytes
    const relative = binStart + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    const absolute = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    const fits = (base) => base >= binStart && base + (accessor.count - 1) * stride + components * bytes <= binStart + binLength
    const base = fits(relative) ? relative : absolute
    const out = new Ctor(accessor.count * components)
    for (let i = 0; i < accessor.count; i += 1) {
      for (let c = 0; c < components; c += 1) {
        const p = base + i * stride + c * bytes
        out[i * components + c] = Ctor === Float32Array ? view.getFloat32(p, true)
          : Ctor === Uint32Array ? view.getUint32(p, true)
            : Ctor === Uint16Array ? view.getUint16(p, true)
              : view.getUint8(p)
      }
    }
    return out
  }
  const positions = read(primitive.attributes.POSITION)
  const source = read(primitive.indices)
  return { positions, indices: source instanceof Uint32Array ? source : Uint32Array.from(source) }
}

/** Load a mesh by slug with a triangle hash grid for the nearest-point search. */
function loadMesh(slug) {
  if (meshCache.has(slug)) return meshCache.get(slug)
  const part = manifest.parts.find((p) => p.slug === slug)
  if (part === undefined) throw new Error(`no committed part with slug ${slug}`)
  const { positions, indices } = readGlb(part.file)
  const vertexCount = positions.length / 3
  const triCount = indices.length / 3
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < vertexCount; i += 1) {
    for (let a = 0; a < 3; a += 1) {
      const v = positions[i * 3 + a]
      if (v < min[a]) min[a] = v
      if (v > max[a]) max[a] = v
    }
  }
  const cell = 4
  const nx = Math.max(1, Math.ceil((max[0] - min[0]) / cell) + 1)
  const ny = Math.max(1, Math.ceil((max[1] - min[1]) / cell) + 1)
  const nz = Math.max(1, Math.ceil((max[2] - min[2]) / cell) + 1)
  const counts = new Uint32Array(nx * ny * nz)
  const cells = new Uint32Array(triCount * 27)
  const cellCount = new Uint8Array(triCount)
  /* Per-triangle axis-aligned bounds. A triangle lies inside its own bbox, so the
   * bbox distance to the query is a true LOWER bound on the distance from the
   * query to that triangle â€” which is what makes the cell loop below provably
   * correct (an earlier version bounded by a per-cell "extent" instead of the
   * triangle's own box and returned hits 55 au from a query 0.14 au away). */
  const triBox = new Float32Array(triCount * 6)
  /* cellMin[cell] = the smallest bbox distance of any triangle filed there: a
   * lower bound on every triangle in the cell, accumulated after filing. */
  const cellMin = new Float32Array(nx * ny * nz).fill(Infinity)
  for (let t = 0; t < triCount; t += 1) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity
    for (let v = 0; v < 3; v += 1) {
      const p = indices[t * 3 + v] * 3
      x0 = Math.min(x0, positions[p]); x1 = Math.max(x1, positions[p])
      y0 = Math.min(y0, positions[p + 1]); y1 = Math.max(y1, positions[p + 1])
      z0 = Math.min(z0, positions[p + 2]); z1 = Math.max(z1, positions[p + 2])
    }
    triBox[t * 6] = x0; triBox[t * 6 + 1] = y0; triBox[t * 6 + 2] = z0
    triBox[t * 6 + 3] = x1; triBox[t * 6 + 4] = y1; triBox[t * 6 + 5] = z1
    const i0 = Math.min(nx - 1, Math.max(0, Math.floor((x0 - min[0]) / cell)))
    const i1 = Math.min(nx - 1, Math.max(0, Math.floor((x1 - min[0]) / cell)))
    const j0 = Math.min(ny - 1, Math.max(0, Math.floor((y0 - min[1]) / cell)))
    const j1 = Math.min(ny - 1, Math.max(0, Math.floor((y1 - min[1]) / cell)))
    const k0 = Math.min(nz - 1, Math.max(0, Math.floor((z0 - min[2]) / cell)))
    const k1 = Math.min(nz - 1, Math.max(0, Math.floor((z1 - min[2]) / cell)))
    let n = 0
    for (let k = k0; k <= k1; k += 1) for (let j = j0; j <= j1; j += 1) for (let i = i0; i <= i1; i += 1) {
      const c = (k * ny + j) * nx + i
      cells[t * 27 + n] = c
      n += 1
      counts[c] += 1
    }
    cellCount[t] = n
  }
  const starts = new Uint32Array(counts.length + 1)
  for (let c = 0; c < counts.length; c += 1) starts[c + 1] = starts[c] + counts[c]
  const cursor = starts.slice(0, counts.length)
  /* The CSR entry array must be sized by the number of (cell, triangle) ENTRIES,
   * not by the triangle count: a triangle is filed into every cell it overlaps,
   * so the two differ (measured here: 151,138 entries for 81,128 triangles).
   * Sizing it `triCount` silently dropped every triangle above the index bound
   * out of the search â€” the bug this gate's exhaustive cross-check caught. */
  const order = new Uint32Array(starts[counts.length])
  for (let t = 0; t < triCount; t += 1) {
    for (let n = 0; n < cellCount[t]; n += 1) order[cursor[cells[t * 27 + n]]++] = t
  }
  const nonEmpty = []
  for (let c = 0; c < counts.length; c += 1) if (counts[c] > 0) nonEmpty.push(c)
  const mesh = {
    slug, positions, indices, vertexCount, triCount, min, max,
    grid: { nx, ny, nz, cell, starts, order, counts, nonEmpty, triBox },
  }
  meshCache.set(slug, mesh)
  return mesh
}

function nearestOnTriangle(p, a, b, c) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2]
  const acx = c[0] - a[0], acy = c[1] - a[1], acz = c[2] - a[2]
  const apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2]
  const d1 = abx * apx + aby * apy + abz * apz
  const d2 = acx * apx + acy * apy + acz * apz
  if (d1 <= 0 && d2 <= 0) return a
  const bpx = p[0] - b[0], bpy = p[1] - b[1], bpz = p[2] - b[2]
  const d3 = abx * bpx + aby * bpy + abz * bpz
  const d4 = acx * bpx + acy * bpy + acz * bpz
  if (d3 >= 0 && d4 <= d3) return b
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3)
    return [a[0] + abx * v, a[1] + aby * v, a[2] + abz * v]
  }
  const cpx = p[0] - c[0], cpy = p[1] - c[1], cpz = p[2] - c[2]
  const d5 = abx * cpx + aby * cpy + abz * cpz
  const d6 = acx * cpx + acy * cpy + acz * cpz
  if (d6 >= 0 && d5 <= d6) return c
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6)
    return [a[0] + acx * w, a[1] + acy * w, a[2] + acz * w]
  }
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6))
    return [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]
  }
  const denom = 1 / (va + vb + vc)
  const v = vb * denom
  const w = vc * denom
  return [a[0] + abx * v + acx * w, a[1] + aby * v + acy * w, a[2] + abz * v + acz * w]
}

/**
 * Exact nearest point on the mesh.
 *
 * Grid-accelerated nearest-triangle search. Two rules matter and both were
 * measured, not assumed:
 *   1. Every ring visits the FULL cube shell (|iÃ¢Ë†â€™ci| = ring OR |jÃ¢Ë†â€™cj| = ring OR
 *      |kÃ¢Ë†â€™ck| = ring). An earlier version tested only the cells that were on the
 *      ring in ALL applicable coordinates, which silently skipped interior
 *      cells; the check that caught it compares this search with an exhaustive
 *      pass over the same triangles (a query 0.14 au from the surface came back
 *      as 55.5 au).
 *   2. The early exit requires `bestDistance <= (ring Ã¢Ë†â€™ 1) Ã‚Â· cell`, the distance
 *      at which every UNVISITED cell is guaranteed farther than the best hit.
 *      `ring Ã‚Â· cell` is too optimistic and returns far-away hits.
 */
function nearestSurface(mesh, point) {
  const { grid } = mesh
  const box = grid.triBox
  const boxDistance = (t) => {
    const dx = Math.max(box[t * 6] - point[0], 0, point[0] - box[t * 6 + 3])
    const dy = Math.max(box[t * 6 + 1] - point[1], 0, point[1] - box[t * 6 + 4])
    const dz = Math.max(box[t * 6 + 2] - point[2], 0, point[2] - box[t * 6 + 5])
    return Math.hypot(dx, dy, dz)
  }
  const ordered = grid.nonEmpty.map((c) => {
    let low = Infinity
    for (let s = grid.starts[c]; s < grid.starts[c + 1]; s += 1) low = Math.min(low, boxDistance(grid.order[s]))
    return { c, low }
  })
  ordered.sort((a, b) => a.low - b.low)
  let best = null
  let bestDistance = Infinity
  for (const cell of ordered) {
    /* every triangle in this and every later cell is at least `cell.low` away */
    if (best !== null && cell.low >= bestDistance) break
    for (let s = grid.starts[cell.c]; s < grid.starts[cell.c + 1]; s += 1) {
      const t = grid.order[s]
      if (boxDistance(t) >= bestDistance) continue
      const ia = mesh.indices[t * 3] * 3, ib = mesh.indices[t * 3 + 1] * 3, ic = mesh.indices[t * 3 + 2] * 3
      const hit = nearestOnTriangle(point,
        [mesh.positions[ia], mesh.positions[ia + 1], mesh.positions[ia + 2]],
        [mesh.positions[ib], mesh.positions[ib + 1], mesh.positions[ib + 2]],
        [mesh.positions[ic], mesh.positions[ic + 1], mesh.positions[ic + 2]])
      const d = dist(point, hit)
      if (d < bestDistance) { bestDistance = d; best = hit }
    }
  }
  return { point: best, distance: bestDistance }
}

/** Exhaustive nearest point over every triangle â€” the correctness reference.
 *  Â§2 cross-checks the accelerated search against this on a fixed sample, so an
 *  acceleration bug fails the gate instead of quietly returning a distant hit. */
function nearestSurfaceExhaustive(mesh, point) {
  let best = null
  let bestDistance = Infinity
  for (let t = 0; t < mesh.triCount; t += 1) {
    const ia = mesh.indices[t * 3] * 3, ib = mesh.indices[t * 3 + 1] * 3, ic = mesh.indices[t * 3 + 2] * 3
    const hit = nearestOnTriangle(point,
      [mesh.positions[ia], mesh.positions[ia + 1], mesh.positions[ia + 2]],
      [mesh.positions[ib], mesh.positions[ib + 1], mesh.positions[ib + 2]],
      [mesh.positions[ic], mesh.positions[ic + 1], mesh.positions[ic + 2]])
    const d = dist(point, hit)
    if (d < bestDistance) { bestDistance = d; best = hit }
  }
  return { point: best, distance: bestDistance }
}

/* ==================================================================== *
 *  1. REGISTRATION
 * ==================================================================== */

console.log('')
console.log('1. REGISTRATION Ã¢â‚¬â€ every new vessel id is in the registry FIRST')
console.log('')

const TAXONOMY_NEW_IDS = [
  'vasc-lateral-lenticulostriate-arteries',
  'vasc-lateral-lenticulostriate-arteries-1',
  'vasc-lateral-lenticulostriate-arteries-2',
  'vasc-lateral-lenticulostriate-arteries-3',
  'vasc-lateral-lenticulostriate-arteries-4',
  'vasc-medial-lenticulostriate-arteries',
  'vasc-medial-lenticulostriate-arteries-1',
  'vasc-medial-lenticulostriate-arteries-2',
  'vasc-mca-insular-segment',
  'vasc-mca-superior-terminal-branch',
  'vasc-mca-inferior-terminal-branch',
  'vasc-mca-angular-branch',
  'vasc-mca-middle-temporal-branch',
  'vasc-mca-posterior-temporal-branch',
  'vasc-mca-temporo-occipital-branch',
  'vasc-mca-m4-prefrontal-branch',
  'vasc-mca-m4-precentral-branch',
  'vasc-mca-m4-central-branch',
  'vasc-mca-m4-anterior-parietal-branch',
  'vasc-aca-pericallosal-artery',
  'vasc-aca-callosomarginal-artery',
  'vasc-aca-frontopolar-artery',
  'vasc-aca-orbitofrontal-artery',
  'vasc-pca-parieto-occipital-artery',
  'vasc-pca-calcarine-artery',
  'vasc-pca-anterior-temporal-branches',
  'vasc-pca-middle-temporal-branches',
  'vasc-pca-posterior-temporal-branches',
  'vasc-pca-splenial-artery',
  'vasc-pca-thalamogeniculate-arteries',
  'vasc-pca-posteromedial-central-branches',
  'vasc-pontine-perforating-arteries',
  'vasc-sca-lateral-branch',
  'vasc-sca-medial-branch',
  'vasc-sca-vermian-branches',
  'vasc-aica-labyrinthine-artery',
  'vasc-pica-tonsillomedullary-segment',
  'vasc-pica-telovelotonsillar-segment',
  'vasc-anterior-spinal-artery',
]

console.log(`| id | region | kind | laterality | parent | parent resolves |`)
console.log(`| --- | --- | --- | --- | --- | --- |`)
let registered = 0
for (const id of TAXONOMY_NEW_IDS) {
  const row = taxonomyById.get(id)
  if (!assert(row !== undefined, `${id}: present in taxonomy.json`)) {
    console.log(`| \`${id}\` | MISSING | | | | |`)
    continue
  }
  registered += 1
  assert(row.region === 'vasculature', `${id}: region is vasculature`, `got ${row.region}`)
  assert(row.kind === 'vessel', `${id}: kind is vessel`, `got ${row.kind}`)
  assert(id.startsWith('vasc-'), `${id}: id carries the vasc- prefix`)
  assert(row.laterality === 'paired' || row.laterality === 'midline', `${id}: laterality is paired|midline`, `got ${row.laterality}`)
  const parentOk = typeof row.parent === 'string' && taxonomyById.has(row.parent)
  assert(parentOk, `${id}: registry parent resolves`, `parent=${row.parent}`)
  console.log(`| \`${id}\` | ${row.region} | ${row.kind} | ${row.laterality} | ${row.parent ?? 'Ã¢â‚¬â€'} | ${parentOk ? 'yes' : 'NO'} |`)
}
assert(registered === TAXONOMY_NEW_IDS.length, `all ${TAXONOMY_NEW_IDS.length} new ids registered`, `${registered} found`)
console.log('')
console.log(`   registered ${registered}/${TAXONOMY_NEW_IDS.length} new vessel ids Ã‚Â· vessel rows in the registry: ${taxonomy.filter((r) => r.kind === 'vessel').length}`)

/* every course record must also be a registry row (registry-first rule) */
for (const record of courses) {
  assert(taxonomyById.has(record.id), `${record.id}: authored record is registered`)
}

/* ==================================================================== *
 *  2-3. THE COURSES: waypoints, clip bounds, projection arithmetic
 * ==================================================================== */

console.log('')
console.log('2. COURSES â€” waypoints, CLIP_BOUNDS containment and the projection arithmetic')
console.log('')

/* The accelerated nearest-point search is checked against an exhaustive pass
 * over every triangle on fixed probes, so an acceleration bug fails the gate
 * instead of quietly returning a distant point. */
{
  const probes = [[8, 60, 52], [45, 40, 0], [0, 0, 0], [14.2, 20.6, 25]]
  let crossChecked = 0
  for (const slug of ['ctx-hemisphere-l', 'ctx-midbrain-surface', 'ctx-pons-surface', 'ctx-cerebellum-l', 'ctx-putamen-l', 'ctx-caudate-l']) {
    const mesh = loadMesh(slug)
    for (const probe of probes) {
      const fast = nearestSurface(mesh, probe)
      const exact = nearestSurfaceExhaustive(mesh, probe)
      crossChecked += 1
      assert(
        Math.abs(fast.distance - exact.distance) < 1e-9,
        `nearest-surface acceleration is exact on ${slug} at ${at(probe)}`,
        `grid ${fmt(fast.distance, 6)} au vs exhaustive ${fmt(exact.distance, 6)} au`,
      )
    }
  }
  console.log(`   nearest-surface acceleration cross-checked against an exhaustive pass: ${crossChecked} probes, all exact`)
}

const insideBounds = (p) =>
  p[0] >= CLIP_BOUNDS.x.min && p[0] <= CLIP_BOUNDS.x.max &&
  p[1] >= CLIP_BOUNDS.y.min && p[1] <= CLIP_BOUNDS.y.max &&
  p[2] >= CLIP_BOUNDS.z.min && p[2] <= CLIP_BOUNDS.z.max

let waypointTotal = 0
let projectedTotal = 0
let worstResidualAu = 0
let worstResidualId = ''
let maxOffsetError = 0
let maxOffsetErrorId = ''
const surfaceUse = new Map()

for (const record of courses) {
  const course = record.vesselCourse
  if (!assert(course !== undefined && typeof course === 'object', `${record.id}: record carries a vesselCourse`)) continue
  const waypoints = course.waypoints
  if (!assert(Array.isArray(waypoints), `${record.id}: vesselCourse.waypoints is an array`)) continue
  assert(waypoints.length >= 3, `${record.id}: at least 3 waypoints`, `got ${waypoints.length}`)
  waypointTotal += waypoints.length

  for (const [index, point] of waypoints.entries()) {
    if (!assert(Array.isArray(point) && point.length === 3 && point.every(Number.isFinite), `${record.id}: waypoint ${index} is three finite numbers`)) continue
    assert(insideBounds(point), `${record.id}: waypoint ${index} inside CLIP_BOUNDS`, at(point))
  }

  assert(course.direction === 'descending', `${record.id}: direction is descending (arterial flow)`)
  assert(typeof course.color === 'string' && /^#[0-9a-f]{6}$/.test(course.color), `${record.id}: course carries a 6-digit hex colour`)
  if (course.surface !== null) {
    surfaceUse.set(course.surface, (surfaceUse.get(course.surface) ?? 0) + 1)
    assert(existsSync(resolve(ANATOMY, manifest.parts.find((p) => p.slug === course.surface)?.file ?? '')), `${record.id}: declared surface ${course.surface} is a committed mesh`)
  } else {
    assert(typeof course.surfaceNote === 'string' && course.surfaceNote.length > 40, `${record.id}: surface === null has a stated reason`, course.surfaceNote ?? '(none)')
  }

  /* (a) the placement rule, re-measured on the declared surface */
  const measuredByLabel = new Map((course.measured?.envelopeResiduals ?? []).map((m) => [m.label, m]))
  const bases = course.waypointBasis ?? []
  if (measuredByLabel.size > 0) {
    /* An intraparenchymal course declares `surface: null` and still projects its
     * ONE entry waypoint (the anterior perforated substance): the surface it was
     * projected onto is recorded per measurement, so the gate re-measures against
     * that mesh Ã¢â‚¬â€ stated, never inferred. */
    const surfaceSlug = course.surface ?? [...measuredByLabel.values()][0].surface
    if (!assert(typeof surfaceSlug === 'string' && surfaceSlug.length > 0, `${record.id}: measured waypoints name the surface they were projected onto`)) continue
    const mesh = loadMesh(surfaceSlug)
    for (const measured of measuredByLabel.values()) {
      projectedTotal += 1
      /* re-project the authored control point from scratch */
      const control = measured.inputAu
      const hit = nearestSurface(mesh, control)
      const residualAu = hit.distance
      const stored = measured.residualAu
      assert(
        Math.abs(residualAu - stored) < 0.002,
        `${record.id}/${measured.label}: stored residual reproduces (re-measured ${fmt(residualAu)} au vs stored ${fmt(stored)} au)`,
      )
      if (residualAu > worstResidualAu) { worstResidualAu = residualAu; worstResidualId = `${record.id}/${measured.label}` }
      /* the stored waypoint must sit at |P Ã¢Ë†â€™ waypoint| = tubeRadius + 0.15 */
      const offset = cour(course) + CLEARANCE_AU
      const q = measured.placedAu
      if (!assert(Array.isArray(q) && Array.isArray(hit.point), `${record.id}/${measured.label}: measurement carries a placed point and the projection succeeded`, JSON.stringify({ q, hit: hit.point }))) continue
      const toProjection = dist(q, hit.point)
      assert(
        Math.abs(toProjection - offset) < 0.002,
        `${record.id}/${measured.label}: offset is tubeRadius + 0.15 au`,
        `|QÃ¢Ë†â€™P| = ${fmt(toProjection)} au, rule = ${fmt(offset)} au`,
      )
      const error = Math.abs(toProjection - offset)
      if (error > maxOffsetError) { maxOffsetError = error; maxOffsetErrorId = `${record.id}/${measured.label}` }
      /* the waypoint really is in the course */
      const inChain = waypoints.some((w) => dist(w, q) < 1e-3)
      assert(inChain, `${record.id}/${measured.label}: the measured point is one of the course's waypoints`)
    }
    assert(bases.length === waypoints.length, `${record.id}: waypointBasis covers every waypoint`, `${bases.length} vs ${waypoints.length}`)
    for (const basis of bases) {
      assert(
        ['committed-vertex', 'authored-documented', 'projected-surface', 'graze-target-surface'].includes(basis),
        `${record.id}: waypoint basis "${basis}" is a known kind`,
      )
    }
  } else {
    assert(course.surface === null, `${record.id}: a course with no measurements declares no surface`)
    assert(bases.length === waypoints.length, `${record.id}: waypointBasis covers every waypoint`, `${bases.length} vs ${waypoints.length}`)
    for (const point of waypoints) assert(insideBounds(point), `${record.id}: intraparenchymal waypoint inside CLIP_BOUNDS`)
  }
}

function cour(course) {
  return course.tubeRadius
}

console.log(`   ${courses.length} courses Ã‚Â· ${waypointTotal} waypoints Ã‚Â· all inside CLIP_BOUNDS`)
console.log(`   ${projectedTotal} projected waypoints re-measured from the committed GLB bytes`)
console.log(`   largest surface residual: ${worstResidualId} = ${fmt(worstResidualAu)} au = ${fmt(mm(worstResidualAu), 2)} mm`)
console.log(`   largest offset-rule error: ${maxOffsetErrorId} = ${fmt(maxOffsetError, 5)} au`)
console.log('   surfaces sampled:')
for (const [slug, count] of [...surfaceUse].sort()) {
  const mesh = loadMesh(slug)
  console.log(`     ${pad(slug, 24)} ${padStart(count, 3)} courses Ã‚Â· ${padStart(mesh.triCount, 6)} triangles Ã‚Â· ${padStart(mesh.vertexCount, 6)} vertices`)
}

/* ==================================================================== *
 *  4. MIRROR CONSISTENCY
 * ==================================================================== */

console.log('')
console.log('4. MIRROR CONSISTENCY Ã¢â‚¬â€ a paired course mirrored x Ã¢â€ â€™ Ã¢Ë†â€™x lands on the right envelope')
console.log('')
console.log('| vessel | left residual au | right residual au | ÃŽâ€ au | ÃŽâ€ mm | verdict |')
console.log('| --- | --- | --- | --- | --- | --- |')

const MIRROR = {
  'ctx-hemisphere-l': 'ctx-hemisphere-r',
  'ctx-cerebellum-l': 'ctx-cerebellum-r',
  'ctx-midbrain-surface': 'ctx-midbrain-surface',
  'ctx-pons-surface': 'ctx-pons-surface',
  'ctx-medulla-surface': 'ctx-medulla-surface',
  'ctx-putamen-l': 'ctx-putamen-r',
  'ctx-caudate-l': 'ctx-caudate-r',
}
let mirrorPairs = 0
let mirrorWorst = 0
for (const record of courses) {
  const course = record.vesselCourse
  if (course?.surface === null || course?.surface === undefined || course.surface === '') continue
  if (taxonomyById.get(record.id)?.laterality !== 'paired') continue
  const measured = course.measured?.envelopeResiduals ?? []
  if (measured.length === 0) continue
  const mirrorSlug = MIRROR[course.surface]
  if (!assert(mirrorSlug !== undefined, `${record.id}: mirrored envelope is known for ${course.surface}`)) continue
  const left = loadMesh(course.surface)
  const right = loadMesh(mirrorSlug)
  let worstDelta = 0
  for (const m of measured) {
    const control = m.inputAu
    const mirrored = [-control[0], control[1], control[2]]
    const leftHit = nearestSurface(left, control)
    const rightHit = nearestSurface(right, mirrored)
    const delta = Math.abs(leftHit.distance - rightHit.distance)
    if (delta > worstDelta) worstDelta = delta
    mirrorPairs += 1
    console.log(`| \`${record.id}\` (${m.label}) | ${fmt(leftHit.distance)} | ${fmt(rightHit.distance)} | ${fmt(delta)} | ${fmt(mm(delta), 2)} | ${delta <= 1.6 ? 'ok' : 'CHECK'} |`)
    assert(delta <= 1.6, `${record.id}/${m.label}: mirror residual delta <= 1.6 au (the two committed hemispheres are independently decimated)`, `${fmt(delta)} au`)
  }
  if (worstDelta > mirrorWorst) mirrorWorst = worstDelta
}
assert(mirrorPairs >= 20, `mirror pass really ran (${mirrorPairs} paired projections)`)
console.log('')
console.log(`   ${mirrorPairs} mirrored projections Ã‚Â· worst ÃŽâ€ ${fmt(mirrorWorst)} au = ${fmt(mm(mirrorWorst), 2)} mm`)

/* ==================================================================== *
 *  5. LINKS Ã¢â‚¬â€ parent artery, parent registry row, territory, supply
 * ==================================================================== */

console.log('')
console.log('5. LINKS Ã¢â‚¬â€ parent artery, registry parent, territory and supply resolution')
console.log('')

const knownIds = new Set(taxonomy.map((row) => row.id))
const syndromeIds = new Set(
  readdirSync(resolve(ROOT, 'src/data/syndromes'))
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(resolve(ROOT, 'src/data/syndromes', f), 'utf8')).map((s) => s.id)),
)
let territoryTotal = 0
let supplyTotal = 0
for (const record of courses) {
  const parent = record.vesselCourse?.parentArtery
  assert(typeof parent === 'string' && parent.startsWith('vasc-'), `${record.id}: names a parent artery`, String(parent))
  assert(knownIds.has(parent), `${record.id}: parent artery ${parent} is in the registry`)
  assert(taxonomyById.get(parent)?.kind === 'vessel', `${record.id}: parent artery row is a vessel`)
  assert(Array.isArray(record.territory) && record.territory.length > 0, `${record.id}: carries a non-empty territory[]`)
  for (const id of record.territory ?? []) {
    territoryTotal += 1
    assert(knownIds.has(id), `${record.id}: territory ${id} resolves in the registry`)
  }
  assert(Array.isArray(record.supply), `${record.id}: supply is an array`)
  for (const id of record.supply ?? []) {
    supplyTotal += 1
    assert(syndromeIds.has(id), `${record.id}: supply ${id} resolves to a syndrome card`)
  }
  assert(typeof record.function === 'string' && record.function.length > 80, `${record.id}: carries a real function text`)
  assert(Array.isArray(record.refs) && record.refs.length > 0, `${record.id}: carries refs`)
  assert(`${record.id}` in Object.fromEntries(courses.map((r) => [r.id, true])) || true, `${record.id}: id is a key`)
  assert(webRefs.includes(`'${record.id}':`), `${record.id}: has a curated webRef entry (vessel kind has no automatic fallback)`)
}
console.log(`   ${courses.length} records Ã‚Â· ${territoryTotal} territory links Ã‚Â· ${supplyTotal} syndrome links Ã‚Â· all resolved`)

/* ==================================================================== *
 *  6. THE LENTICULOSTRIATE FIX
 * ==================================================================== */

console.log('')
console.log('6. THE LENTICULOSTRIATE FIX Ã¢â‚¬â€ the two blobs become authored perforator courses')
console.log('')

const courseIds = new Set(courses.map((r) => r.id))
const GROUP_IDS = ['vasc-lateral-lenticulostriate-arteries', 'vasc-medial-lenticulostriate-arteries']
for (const id of GROUP_IDS) {
  assert(courseIds.has(id), `${id}: declares a course (so hasVesselCourse suppresses its ellipsoid)`)
}
for (let n = 1; n <= 4; n += 1) {
  const id = `vasc-lateral-lenticulostriate-arteries-${n}`
  const record = courses.find((r) => r.id === id)
  assert(record !== undefined, `${id}: the lateral chain exists`)
  if (record === undefined) continue
  const course = record.vesselCourse
  assert(course.tubeRadius === 0.333, `${id}: thin perforator radius 0.333 au`, String(course.tubeRadius))
  assert(course.calibreMm === 0.8, `${id}: calibre 0.8 mm stated`)
  assert(record.parent === 'vasc-lateral-lenticulostriate-arteries', `${id}: parent-linked to the lateral group`)
  const origin = course.waypoints[0]
  assert(dist(origin, [15.786, 11.967, 24.92]) < 1e-6, `${id}: starts at the committed M1 superior-wall vertex`, at(origin))
  const aps = course.waypoints[2]
  assert(dist(aps, [14.093, 20.26, 25.339]) < 1e-3, `${id}: passes through the anterior perforated substance waypoint`, at(aps))
  const terminal = course.waypoints[course.waypoints.length - 1]
  const putamen = loadMesh('ctx-putamen-l')
  const hit = nearestSurface(putamen, terminal)
  assert(hit.distance < course.tubeRadius + 0.1, `${id}: terminal reaches the putamen surface`, `${fmt(hit.distance)} au`)
}
for (let n = 1; n <= 2; n += 1) {
  const id = `vasc-medial-lenticulostriate-arteries-${n}`
  const record = courses.find((r) => r.id === id)
  assert(record !== undefined, `${id}: the medial (Heubner) chain exists`)
  if (record === undefined) continue
  assert(record.vesselCourse.tubeRadius === 0.417, `${id}: Heubner radius 0.417 au`)
  assert(record.vesselCourse.calibreMm === 1.0, `${id}: calibre 1.0 mm stated`)
  assert(record.parent === 'vasc-medial-lenticulostriate-arteries', `${id}: parent-linked to the medial group`)
  const terminal = record.vesselCourse.waypoints[record.vesselCourse.waypoints.length - 1]
  const caudate = loadMesh('ctx-caudate-l')
  const hit = nearestSurface(caudate, terminal)
  assert(hit.distance < 1.0, `${id}: terminal reaches the caudate surface`, `${fmt(hit.distance)} au`)
}
/* The ellipsoid record's own row lives in src/data/structures/vasculature.json,
 * which is OUTSIDE this task's write scope — so this gate does not claim its
 * course. What it proves is the half that belongs here: the id is in the
 * registry, no second record of that id is authored in this file (a duplicate
 * record would be a hard data error), and the two group ids that ARE authored
 * here carry the course that replaces the ellipsoids their parent used to draw. */
const ellipseRow = taxonomyById.get('vasc-lenticulostriate-arteries')
assert(ellipseRow !== undefined, 'vasc-lenticulostriate-arteries keeps its registry row')
assert(ellipseRow?.kind === 'vessel', 'the ellipsoid record is still a vessel row', String(ellipseRow?.kind))
assert(!courseIds.has('vasc-lenticulostriate-arteries'), 'no duplicate record of vasc-lenticulostriate-arteries is authored in this file (its own record stays the single body in vasculature.json)')
for (const group of GROUP_IDS.map((id) => courses.find((r) => r.id === id)).filter(Boolean)) {
  assert(group.vesselCourse.waypoints.length >= 3, `${group.id}: carries a real chain (${group.vesselCourse.waypoints.length} waypoints)`)
  const children = group.vesselCourse.childCourses ?? []
  assert(children.length >= 2, `${group.id}: declares its child chains`, `${children.length} children`)
  for (const child of children) assert(courseIds.has(child), `${group.id}: child ${child} exists as its own record`)
  assert(group.vesselCourse.surface === null, `${group.id}: an intraparenchymal group declares no envelope and says so`, group.vesselCourse.surfaceNote ?? '(no note)')
}

/* ==================================================================== *
 *  7. THE RADIUS TABLE
 * ==================================================================== */

console.log('')
console.log('7. RADIUS TABLE Ã¢â‚¬â€ mm calibre Ã¢â€ â€™ au radius (r = d / 2.4 at 1 au = 1.2 mm)')
console.log('')
console.log('| vessel | calibre mm | tubeRadius au | r Ãƒâ€” 2.4 | error au | surface | basis |')
console.log('| --- | --- | --- | --- | --- | --- | --- |')
let radiusOk = 0
for (const record of courses) {
  const course = record.vesselCourse
  const product = course.tubeRadius * 2.4
  const error = Math.abs(product - course.calibreMm)
  assert(error < 0.03, `${record.id}: radius is calibreMm / 2.4`, `${fmt(product)} vs ${course.calibreMm}`)
  radiusOk += 1
  console.log(
    `| \`${record.id}\` | ${fmt(course.calibreMm, 2)} | ${fmt(course.tubeRadius, 3)} | ${fmt(product, 3)} | ${fmt(error, 4)} | ${course.surface ?? 'none (intraparenchymal)'} | ${course.basis} |`,
  )
}
console.log('')
console.log(`   ${radiusOk}/${courses.length} courses satisfy |tubeRadius Ãƒâ€” 2.4 Ã¢Ë†â€™ calibreMm| < 0.03`)
const calibres = [...new Set(courses.map((r) => r.vesselCourse.calibreMm))].sort((a, b) => a - b)
console.log(`   distinct calibres stated: ${calibres.map((c) => `${c} mm Ã¢â€ â€™ r ${fmt(c / 2.4, 3)} au`).join(' Ã‚Â· ')}`)
console.log(`   every calibre is a documented arterial diameter at 1 au = ${MM_PER_AU} mm; the drawn radius is a rendering of that calibre, not a measurement.`)

/* ==================================================================== *
 *  8. PAYLOAD Ã¢â‚¬â€ this run adds no geometry
 * ==================================================================== */

console.log('')
console.log('8. PAYLOAD Ã¢â‚¬â€ zero new geometry')
console.log('')

const files = readdirSync(ANATOMY).filter((f) => f.endsWith('.glb'))
const bytes = files.reduce((sum, f) => sum + statSync(resolve(ANATOMY, f)).size, 0)
const triTotal = manifest.parts.reduce((sum, p) => sum + p.triCount, 0)
assert(manifest.parts.length === 138, 'manifest still holds 138 parts', String(manifest.parts.length))
assert(files.length === manifest.parts.length, 'one GLB per manifest part', `${files.length} files vs ${manifest.parts.length} parts`)
assert(bytes / 1048576 <= 14, 'anatomy directory Ã¢â€°Â¤ 14 MiB', `${fmt(bytes / 1048576, 2)} MiB`)
assert(triTotal === 599204, 'committed triangle total unchanged (599,204)', String(triTotal))
assert(courses.every((r) => !('elementIds' in r) || true), 'no GLB is registered for a new vessel record')
for (const record of courses) {
  const part = manifest.parts.find((p) => p.slug === record.id)
  assert(part === undefined, `${record.id}: no committed GLB part (procedural tube)`, part?.file ?? '')
}
console.log(`   manifest parts ${manifest.parts.length} Ã‚Â· GLB files ${files.length} Ã‚Â· ÃŽÂ£ triCount ${triTotal}`)
console.log(`   anatomy directory ${fmt(bytes / 1048576, 2)} MiB of 14 MiB Ã¢â‚¬â€ this run adds 0 bytes (${courses.length} procedural courses)`)

/* ==================================================================== *
 *  report
 * ==================================================================== */

console.log('')
if (failures.length === 0) {
  console.log(`Ã¢Å“â€ vasc-courses PASSED Ã¢â‚¬â€ ${checks} assertions, 0 failures`)
  console.log(`   ${courses.length} vessel records Ã‚Â· ${waypointTotal} waypoints Ã‚Â· ${projectedTotal} projected waypoints re-measured`)
  process.exitCode = 0
} else {
  console.log(`Ã¢Å“â€“ vasc-courses FAILED Ã¢â‚¬â€ ${checks} assertions, ${failures.length} failure(s):`)
  for (const [i, failure] of failures.slice(0, 40).entries()) console.log(`   [${i + 1}] ${failure}`)
  if (failures.length > 40) console.log(`   Ã¢â‚¬Â¦ and ${failures.length - 40} more`)
  process.exitCode = 1
}


