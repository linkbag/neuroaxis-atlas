/**
 * textures.ts — deterministic procedural normal maps for the PBR materials
 * (plan §1 Layer 3 "Procedural textures").
 *
 * Every texture is generated at first use from a seeded, integer-lattice PRNG
 * and cached as a module singleton: no Math.random, no canvas, no downloads —
 * the same build always produces bit-identical data. Height fields are made
 * tileable by wrapping the value-noise lattice at each octave's period, which
 * is what keeps THREE.RepeatWrapping seamless.
 *
 * Three shared tangent-space RGBA DataTextures:
 *  - tissue    512×512    fine isotropic tissue micro-noise (gray matter)
 *  - folia     1024×256   cerebellar ridges, ridge frequency along U
 *  - striation 256×1024   fiber striation, stripes running along U (fiber
 *                         direction), varying across V — matches R3F
 *                         TubeGeometry UVs (u = along tube, v = around)
 *                         when repeated along v.
 *
 * Textures are shared singletons: assign them to material.normalMap but do not
 * dispose them; callers that need custom `repeat` should `texture.clone()`.
 */
import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/* Seeded PRNG + tileable value noise                                  */
/* ------------------------------------------------------------------ */

/** Integer lattice hash → [0, 1). Math.imul keeps it 32-bit deterministic. */
function lattice(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b9)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/**
 * Tileable 2D value noise: lattice corners wrap at `period` cells, so the
 * field repeats seamlessly with period `period` in both axes.
 */
function valueNoiseTileable(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx) // smoothstep fade
  const sy = fy * fy * (3 - 2 * fy)
  const wrap = (v: number): number => ((v % period) + period) % period
  const ix0 = wrap(x0)
  const iy0 = wrap(y0)
  const ix1 = wrap(x0 + 1)
  const iy1 = wrap(y0 + 1)
  const v00 = lattice(ix0, iy0, seed)
  const v10 = lattice(ix1, iy0, seed)
  const v01 = lattice(ix0, iy1, seed)
  const v11 = lattice(ix1, iy1, seed)
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v00 - v10 - v01 + v11) * sx * sy
}

/** Tileable fBm: `basePeriod` cells across the unit square, doubling per octave. */
function fbmTileable(
  u: number, // 0..1 across the texture width
  v: number, // 0..1 across the texture height
  basePeriod: number,
  octaves: number,
  seed: number,
): number {
  let amplitude = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    const cells = basePeriod * (1 << o)
    sum += amplitude * valueNoiseTileable(u * cells, v * cells, cells, seed + o * 101)
    norm += amplitude
    amplitude *= 0.5
  }
  return sum / norm // 0..1
}

/* ------------------------------------------------------------------ */
/* Height field → tangent-space normal map (DataTexture)               */
/* ------------------------------------------------------------------ */

/** One RGBA byte per texel; alpha 255. */
function normalsFromHeight(height: Float32Array, width: number, h: number, strength: number): Uint8Array {
  const data = new Uint8Array(width * h * 4)
  const at = (x: number, y: number): number => height[((y % h) + h) % h * width + ((x % width) + width) % width]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      const dhdx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dhdy = (at(x, y + 1) - at(x, y - 1)) * strength
      // Unnormalized tangent-space normal (-dh/dx, -dh/dy, 1).
      const nx = -dhdx
      const ny = -dhdy
      const nz = 1
      const invLen = 1 / Math.hypot(nx, ny, nz)
      const i = (y * width + x) * 4
      data[i] = Math.round((nx * invLen * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  return data
}

function makeNormalTexture(data: Uint8Array, width: number, height: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/* ------------------------------------------------------------------ */
/* The three procedural textures (lazy singletons)                     */
/* ------------------------------------------------------------------ */

/** Fixed seeds — change these deliberately, never per call. */
const SEED_TISSUE = 0x5eed01
const SEED_FOLIA = 0x5eed02
const SEED_STRIATION = 0x5eed03

let tissueTexture: THREE.DataTexture | null = null
let foliaTexture: THREE.DataTexture | null = null
let striationTexture: THREE.DataTexture | null = null

/**
 * Fine tissue micro-noise, 512×512, isotropic multi-octave value noise.
 * Default repeat (2, 2) — subtle detail on ellipsoid/lathe UVs.
 */
export function getTissueNormalTexture(): THREE.DataTexture {
  if (tissueTexture) return tissueTexture
  const size = 512
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      height[y * size + x] = fbmTileable(u, v, 8, 5, SEED_TISSUE)
    }
  }
  tissueTexture = makeNormalTexture(normalsFromHeight(height, size, size, 8), size, size)
  tissueTexture.repeat.set(2, 2)
  return tissueTexture
}

/**
 * Cerebellar folia ridges, 1024×256. Ridge frequency runs along U (24 ridges
 * per U period, crests sharpened), with tileable fBm wobbling the ridge phase
 * along V so the striation reads organic rather than corrugated. Repeat is
 * left at (1, 1) — GLB recipes set their own repeat on a clone.
 */
export function getFoliaNormalTexture(): THREE.DataTexture {
  if (foliaTexture) return foliaTexture
  const width = 1024
  const height = 256
  const ridges = 24
  const field = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width
      const v = y / height
      const wobble = (fbmTileable(u, v, 4, 3, SEED_FOLIA) - 0.5) * 0.55
      const crest = 0.5 + 0.5 * Math.sin((u + wobble / ridges) * Math.PI * 2 * ridges)
      const ridged = Math.pow(crest, 1.7) // sharp crest, rounded sulcus
      const grain = fbmTileable(u, v, 16, 3, SEED_FOLIA + 7) * 0.18
      field[y * width + x] = ridged * 0.82 + grain
    }
  }
  foliaTexture = makeNormalTexture(normalsFromHeight(field, width, height, 2.8), width, height)
  return foliaTexture
}

/**
 * White-matter fiber striation, 256×1024. Fine parallel fibers run along U
 * (the fiber direction) and vary across V, so on R3F TubeGeometry UVs
 * (u along the tube, v around it) the stripes trace the tract. ~18 fibers per
 * V period; baked repeat (1, 3) wraps three periods around a tube.
 */
export function getStriationNormalTexture(): THREE.DataTexture {
  if (striationTexture) return striationTexture
  const width = 256
  const height = 1024
  const fibers = 18
  const field = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width
      const v = y / height
      // Fiber bands vary across V; a slow U-wander keeps them from looking stamped.
      const wander = (fbmTileable(u, v, 4, 3, SEED_STRIATION) - 0.5) * 0.25
      const band = 0.5 + 0.5 * Math.sin((v + wander / fibers) * Math.PI * 2 * fibers)
      const fiberProfile = 0.35 + 0.65 * Math.pow(band, 1.4)
      const grain = fbmTileable(u, v, 24, 2, SEED_STRIATION + 11) * 0.22
      field[y * width + x] = fiberProfile * 0.8 + grain
    }
  }
  striationTexture = makeNormalTexture(normalsFromHeight(field, width, height, 4), width, height)
  striationTexture.repeat.set(1, 3)
  return striationTexture
}

/** Dispose the singleton textures (host app teardown / tests only). */
export function disposeProceduralTextures(): void {
  tissueTexture?.dispose()
  foliaTexture?.dispose()
  striationTexture?.dispose()
  tissueTexture = null
  foliaTexture = null
  striationTexture = null
}
