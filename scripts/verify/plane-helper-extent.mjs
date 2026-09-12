/**
 * verify/plane-helper-extent.mjs — the gate for v10 item 1
 * (`docs/SWARM_V10_PLAN.md` §1, `PLAN.md` §1, task `plane-helpers-extent`).
 *
 * WHAT IT GATES. The 3D cut indicators (`src/components/viewer3d/PlaneHelpers
 * .tsx`) must span the WHOLE canonical box rectangle of their two in-plane axes,
 * so a user who cuts through the hemispheres sees a plane boundary where the
 * cortex actually is. Before v10 the quads were sized to the brainstem-era box
 * (transverse `[96, 82]` → x ±48, z ±41; sagittal/coronal `[.., 100]` → y
 * −55…+45) while the canonical box is x[−58, +58], y[−55, +116], z[−76, +72]:
 * the sagittal/coronal sheet stopped 71 au below the vertex, the transverse
 * sheet missed ~31 au posteriorly and ~35 au anteriorly, and one grid overhung
 * its own quad.
 *
 * HOW IT PROVES IT — four independent lanes, all of them executed:
 *
 *  A. DERIVATION. For each plane axis the shipped `planeHelperGeometry(axis,
 *     value)` must return the `CLIP_BOUNDS` extents of BOTH in-plane axes
 *     (1e-9) and their midpoint as the quad centre, and the grid must be built
 *     by `planeHelperGridPositions(axis)` with cells of `GRID_CELL_AU` (≈4 au)
 *     on both axes — a constant AU cell, not a fixed line count.
 *  B. RENDER PATH. The SHIPPED component is executed with the project's own
 *     TypeScript transpile + the repo's Node hook convention, and the element
 *     tree it returns is walked (function components are invoked directly, as a
 *     Node lane must — see the limitations below): per axis the
 *     `<planeGeometry args>`, the sheet `<group position>`, the grid
 *     `<lineSegments geometry>`, the materials (`#38bdf8`, 0.07 quad / 0.22
 *     grid), renderOrder 30/31, the disabled raycast and the `showHelper` gate
 *     are read off the elements — then the quad's four corners and EVERY grid
 *     vertex are transformed through the shipped rotation and must land exactly
 *     on the CLIP_BOUNDS rectangle (a swapped u/v pair, a wrong rotation or a
 *     short quad fails here, not just in a source grep).
 *  C. NO RETYPED BOX. The source's CODE (comments and string literals removed)
 *     must contain no extent literal at all — neither the current bounds
 *     (58/116/76/72/55, 30.5) nor the pre-v10 ones (96/82/100/48/45/41/56/26)
 *     — and must read `CLIP_BOUNDS` from `./clipPlanes`.
 *  D. THE BITE. `clipPlanes.ts` is copied into a gitignored scratch tree with
 *     x.max 58→70, y.max 116→130, z.min −76→−90; the copied `PlaneHelpers.tsx`
 *     is re-imported and its quad MUST follow the mutated box on every axis and
 *     both in-plane axes while the cell size stays ≈4 au (a literal box cannot
 *     follow it). The shipped `clipPlanes.ts` hash is printed before and after,
 *     so "the shared tree was not touched" is measured, not promised.
 *
 * The gate also cross-checks lane A against `planeGeometry.axisExtents` — the
 * derivation the 2D canvas and the PiP draw with — so the 3D helper rectangle
 * and the 2D visible rect are proven to be the SAME rectangle.
 *
 * WHAT IT CANNOT OBSERVE. Chrome is not available in this sandbox, so "the
 * helper now covers the cortex on screen" is an orchestrator claim: the pixels
 * are checked by `verify:acceptance` / `verify:audit`, not here. Lane B runs no
 * React reconciler and no WebGL context — it reads the props react-three-fiber
 * WOULD receive and the geometry objects it would draw, which is as far as a
 * Node lane can go. `PlaneHelpers` imports `useAtlasStore` for its
 * `clip.showHelper` selector; that ONE specifier is redirected to a synthetic
 * stub (below) so this lane can execute the render path without pulling the
 * data graph — every module the geometry actually travels through
 * (`PlaneHelpers.tsx`, `section/planeGeometry.ts`, `viewer3d/clipPlanes.ts`) is
 * imported from disk, unmodified, in every lane.
 *
 * Run:  node scripts/verify/plane-helper-extent.mjs   (or: npm run verify:plane-helper-extent)
 */
import { createRequire, registerHooks } from 'node:module'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')
const require_ = createRequire(import.meta.url)
const ts = require_('typescript')

/* ==================================================================== *
 *  MODULE LOADING — the repo's convention (scripts/verify/pip-contract.mjs,
 *  audit-checks.test.mjs): resolve the app's extensionless relative imports,
 *  transpile `.ts`/`.tsx` with the PROJECT'S OWN TypeScript, wrap JSON.
 * ==================================================================== */

const HELPER_FILE = 'src/components/viewer3d/PlaneHelpers.tsx'
const GEOMETRY_FILE = 'src/components/section/planeGeometry.ts'
const CLIP_FILE = 'src/components/viewer3d/clipPlanes.ts'

/** The one stubbed specifier (see the header): the zustand store selector. */
const STORE_STUB_URL = 'dsh-plane-helper-store-stub'
const STORE_STUB_SOURCE = `
export const useAtlasStore = (selector) =>
  selector({ clip: globalThis.__DSH_PLANE_HELPER_CLIP__ })
`

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/(?:^|\/)state\/store$/.test(specifier)) return { url: STORE_STUB_URL, shortCircuit: true }
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const directory = dirname(base)
      for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
        const candidate = resolve(directory, specifier + extension)
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === STORE_STUB_URL) {
      return { format: 'module', source: STORE_STUB_SOURCE, shortCircuit: true }
    }
    if (!url.startsWith('file:')) return nextLoad(url, context)
    if (url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: `export default ${JSON.stringify(parsed)}`, shortCircuit: true }
    }
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(url)) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const filePath = fileURLToPath(url)
      const { outputText } = ts.transpileModule(readFileSync(filePath, 'utf8'), {
        fileName: filePath,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      })
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

/* ------------------------------------------------------------ assertion log */

const failures = []
let checks = 0

/** Records one assertion; `detail` is printed with the failure. */
function assert(condition, label, detail = '') {
  checks++
  if (condition) return true
  failures.push(detail === '' ? label : `${label} — ${detail}`)
  return false
}

/** Absolute/relative equality for values that travel different code paths. */
function close(actual, expected, tolerance = 1e-9) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false
  return Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected))
}

const num = (value, digits = 3) => (Number.isFinite(value) ? value.toFixed(digits) : String(value))
const pad = (value, width) => String(value).padEnd(width)

/**
 * Tolerance for everything measured THROUGH the grid's vertex buffer: the lines
 * live in a `THREE.Float32BufferAttribute`, so a coordinate as large as ±85.5 au
 * carries ~5e-6 au of storage rounding and a difference of two of them ~1e-5.
 * 1e-4 au ≈ 0.12 µm — four orders of magnitude below anything visible, and it is
 * a property of the shipped buffer type, not a convenience margin. Quantities
 * computed in doubles (the quad args, the derivation, the centres) stay at 1e-9.
 */
const GRID_TOLERANCE = 1e-4

/* ==================================================================== *
 *  THE SHIPPED MODULES (imported from disk, unmodified)
 * ==================================================================== */

const THREE = await import('three')
const clipModule = await import(pathToFileURL(resolve(ROOT, CLIP_FILE)).href)
const geometryModule = await import(pathToFileURL(resolve(ROOT, GEOMETRY_FILE)).href)
const helperModule = await import(pathToFileURL(resolve(ROOT, HELPER_FILE)).href)

const { CLIP_BOUNDS } = clipModule
const { AXIS_PAIR, AXIS_INDEX, PLANE_AXES, axisExtents } = geometryModule
const { planeHelperGeometry, planeHelperGridPositions, GRID_CELL_AU } = helperModule
const PlaneHelpers = helperModule.default

/* The clip slice the stubbed store hands the component (see the header). */
globalThis.__DSH_PLANE_HELPER_CLIP__ = { x: 0, y: 0, z: 0, enabled: true, showHelper: true }

const AXES = ['x', 'y', 'z']
const indexOfAxis = (axis) => AXIS_INDEX[axis]

console.log('plane-helper-extent — the 3D cut indicators must span the canonical box')
console.log(
  `CLIP_BOUNDS (the single declaration): ` +
    AXES.map((a) => `${a}[${CLIP_BOUNDS[a].min}, ${CLIP_BOUNDS[a].max}]`).join(' · ') +
    `   · GRID_CELL_AU = ${GRID_CELL_AU}`,
)
console.log(
  'pre-v10 helper (history, not a target): transverse [96, 82] → x ±48, z ±41 · ' +
    'sagittal [82, 100] → z ±41, y −55…+45 · coronal [96, 100] → x ±48, y −55…+45',
)

/* ==================================================================== *
 *  A. THE DERIVATION — extents, centre, au-constant cells
 * ==================================================================== */

console.log('\n--- A. planeHelperGeometry(axis, clipValue) is the CLIP_BOUNDS rectangle ---')

/** One matrix per axis, built from the SHIPPED rotation triple. */
function rotationMatrix(rotation) {
  return new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2]),
  )
}

/** World AABB of the quad's four local corners through the shipped rotation. */
function quadWorldBounds(g) {
  const matrix = rotationMatrix(g.rotation)
  const halfU = g.quadWidth / 2
  const halfV = g.quadHeight / 2
  const corners = [
    [-halfU, -halfV, 0],
    [halfU, -halfV, 0],
    [halfU, halfV, 0],
    [-halfU, halfV, 0],
  ]
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const point = new THREE.Vector3()
  for (const corner of corners) {
    point.set(corner[0], corner[1], corner[2]).applyMatrix4(matrix)
    for (let a = 0; a < 3; a++) {
      const world = point.getComponent(a) + g.center[a]
      min[a] = Math.min(min[a], world)
      max[a] = Math.max(max[a], world)
    }
  }
  return { min, max }
}

/** World AABB of EVERY vertex of a grid BufferGeometry, same rotation + centre. */
function gridWorldBounds(grid, rotation, center) {
  const attribute = grid.getAttribute('position')
  const matrix = rotationMatrix(rotation)
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const point = new THREE.Vector3()
  for (let i = 0; i < attribute.count; i++) {
    point.set(attribute.getX(i), attribute.getY(i), attribute.getZ(i)).applyMatrix4(matrix)
    for (let a = 0; a < 3; a++) {
      const world = point.getComponent(a) + center[a]
      min[a] = Math.min(min[a], world)
      max[a] = Math.max(max[a], world)
    }
  }
  return { min, max, count: attribute.count }
}

/** Distinct coordinate values of one local axis, sorted — the grid line spacing. */
function distinctSteps(attribute, component) {
  const seen = new Set()
  for (let i = 0; i < attribute.count; i++) seen.add(Number(attribute.getComponent(i, component).toFixed(9)))
  const sorted = [...seen].sort((a, b) => a - b)
  const steps = sorted.slice(1).map((value, i) => value - sorted[i])
  return { values: sorted, steps }
}

/** The clip values the derivation is measured at (incl. the box edges). */
const CLIP_VALUES = { x: [-41.5, 0, 12.5, 58], y: [-55, 0, 45, 116], z: [-76, -2.25, 31, 72] }

const measured = {}
for (const axis of PLANE_AXES) {
  const [uAxis, vAxis] = AXIS_PAIR[axis]
  const base = planeHelperGeometry(axis, 0)
  measured[axis] = base

  assert(uAxis !== vAxis && uAxis !== axis && vAxis !== axis, `A ${axis}: AXIS_PAIR is not three distinct axes`)
  assert(
    close(base.quadWidth, CLIP_BOUNDS[uAxis].max - CLIP_BOUNDS[uAxis].min, 1e-9),
    `A ${axis}: quad width is not CLIP_BOUNDS.${uAxis} extent`,
    `width ${num(base.quadWidth)} vs extent ${num(CLIP_BOUNDS[uAxis].max - CLIP_BOUNDS[uAxis].min)}`,
  )
  assert(
    close(base.quadHeight, CLIP_BOUNDS[vAxis].max - CLIP_BOUNDS[vAxis].min, 1e-9),
    `A ${axis}: quad height is not CLIP_BOUNDS.${vAxis} extent`,
    `height ${num(base.quadHeight)} vs extent ${num(CLIP_BOUNDS[vAxis].max - CLIP_BOUNDS[vAxis].min)}`,
  )
  assert(
    close(base.center[indexOfAxis(uAxis)], (CLIP_BOUNDS[uAxis].min + CLIP_BOUNDS[uAxis].max) / 2, 1e-9) &&
      close(base.center[indexOfAxis(vAxis)], (CLIP_BOUNDS[vAxis].min + CLIP_BOUNDS[vAxis].max) / 2, 1e-9),
    `A ${axis}: the in-plane centre is not the CLIP_BOUNDS midpoint`,
    `centre ${base.center.map((v) => num(v)).join(', ')}`,
  )
  // The cells are a constant in AU on BOTH in-plane axes (the legibility rule).
  assert(
    base.divisionsU === Math.round(base.quadWidth / GRID_CELL_AU) &&
      base.divisionsV === Math.round(base.quadHeight / GRID_CELL_AU),
    `A ${axis}: divisions are not round(extent / GRID_CELL_AU)`,
    `${base.divisionsU}/${base.divisionsV} vs ${base.quadWidth / GRID_CELL_AU}/${base.quadHeight / GRID_CELL_AU}`,
  )
  assert(
    Math.abs(base.cellU - GRID_CELL_AU) <= 0.2 && Math.abs(base.cellV - GRID_CELL_AU) <= 0.2,
    `A ${axis}: grid cells are not ≈${GRID_CELL_AU} au`,
    `cells ${num(base.cellU, 4)} / ${num(base.cellV, 4)}`,
  )
  assert(
    base.divisionsU > 24 || base.divisionsV > 24,
    `A ${axis}: the grid still looks like a fixed line count`,
    `${base.divisionsU}/${base.divisionsV}`,
  )

  // ...for every clip value, and the SIZE must not follow the clip value.
  for (const value of CLIP_VALUES[axis]) {
    const g = planeHelperGeometry(axis, value)
    assert(
      g.quadWidth === base.quadWidth &&
        g.quadHeight === base.quadHeight &&
        g.divisionsU === base.divisionsU &&
        g.divisionsV === base.divisionsV,
      `A ${axis}@${value}: the quad size depends on the clip value (a geometry rebuild per frame)`,
      `${num(g.quadWidth)}×${num(g.quadHeight)} vs ${num(base.quadWidth)}×${num(base.quadHeight)}`,
    )
    assert(
      close(g.center[indexOfAxis(axis)], value, 1e-9),
      `A ${axis}@${value}: the sheet is not parked at the clip value on its own axis`,
      `centre.${axis} = ${num(g.center[indexOfAxis(axis)])}`,
    )
    const box = quadWorldBounds(g)
    assert(
      close(box.min[indexOfAxis(uAxis)], CLIP_BOUNDS[uAxis].min, 1e-9) &&
        close(box.max[indexOfAxis(uAxis)], CLIP_BOUNDS[uAxis].max, 1e-9),
      `A ${axis}@${value}: the quad's world ${uAxis} extent is not the canonical span`,
      `[${num(box.min[indexOfAxis(uAxis)])}, ${num(box.max[indexOfAxis(uAxis)])}] vs ` +
        `[${CLIP_BOUNDS[uAxis].min}, ${CLIP_BOUNDS[uAxis].max}]`,
    )
    assert(
      close(box.min[indexOfAxis(vAxis)], CLIP_BOUNDS[vAxis].min, 1e-9) &&
        close(box.max[indexOfAxis(vAxis)], CLIP_BOUNDS[vAxis].max, 1e-9),
      `A ${axis}@${value}: the quad's world ${vAxis} extent is not the canonical span`,
      `[${num(box.min[indexOfAxis(vAxis)])}, ${num(box.max[indexOfAxis(vAxis)])}] vs ` +
        `[${CLIP_BOUNDS[vAxis].min}, ${CLIP_BOUNDS[vAxis].max}]`,
    )
    assert(
      close(box.min[indexOfAxis(axis)], value, 1e-9) && close(box.max[indexOfAxis(axis)], value, 1e-9),
      `A ${axis}@${value}: the quad is not flat in its own plane`,
      `[${num(box.min[indexOfAxis(axis)])}, ${num(box.max[indexOfAxis(axis)])}]`,
    )
  }
}

/* ---- and the SAME rectangle the 2D canvas draws (axisExtents) ---------- */
for (const axis of PLANE_AXES) {
  const g = measured[axis]
  const extents = axisExtents(axis)
  assert(
    close(g.quadWidth, extents.uSpan, 1e-9) && close(g.quadHeight, extents.vSpan, 1e-9),
    `A ${axis}: the 3D helper rectangle differs from planeGeometry.axisExtents (2D canvas / PiP)`,
    `${num(g.quadWidth)}×${num(g.quadHeight)} vs ${num(extents.uSpan)}×${num(extents.vSpan)}`,
  )
  assert(
    close(g.center[indexOfAxis(extents.uAxis)], extents.centerU, 1e-9) &&
      close(g.center[indexOfAxis(extents.vAxis)], extents.centerV, 1e-9),
    `A ${axis}: the helper centre differs from axisExtents' midpoint`,
    `${g.center.map((v) => num(v)).join(', ')} vs u ${num(extents.centerU)} / v ${num(extents.centerV)}`,
  )
}

console.log(
  '     axis  plane  u/v      quad W × H (au)   world u rect            world v rect            cells u / v (au)',
)
for (const axis of PLANE_AXES) {
  const g = measured[axis]
  const box = quadWorldBounds(g)
  const u = indexOfAxis(g.uAxis)
  const v = indexOfAxis(g.vAxis)
  console.log(
    `     ${pad(axis, 5)} ${pad(axis, 6)} ${pad(`${g.uAxis}/${g.vAxis}`, 8)} ` +
      `${pad(`${num(g.quadWidth, 2)} × ${num(g.quadHeight, 2)}`, 17)} ` +
      `${pad(`${g.uAxis}[${num(box.min[u], 2)}, ${num(box.max[u], 2)}]`, 23)} ` +
      `${pad(`${g.vAxis}[${num(box.min[v], 2)}, ${num(box.max[v], 2)}]`, 23)} ` +
      `${num(g.cellU, 3)} / ${num(g.cellV, 3)}  (${g.divisionsU} × ${g.divisionsV} cells)`,
  )
}
console.log(
  `     ${checks} assertions so far · the pre-v10 helper missed 71.0 au of height at the vertex ` +
    '(y +45 → +116) and 35.0 / 31.0 au of the transverse sheet (z +41 → +72 / −76)',
)

/* ==================================================================== *
 *  B. THE RENDER PATH — execute the shipped component, walk its elements
 * ==================================================================== */

console.log('\n--- B. the shipped component’s render path (element tree) ---')

/**
 * Every HOST element in a rendered tree, depth-first. Function components are
 * not React-rendered here (no reconciler, no DOM): they are invoked once with
 * their props, which is what a plain function component IS — `HelperSheetMesh`
 * holds no hooks, and the only hook in the module is the store selector in
 * `PlaneHelpers`, which the stub answers. That is why this lane can read the
 * ACTUAL props react-three-fiber would receive.
 */
function collectElements(node, out = []) {
  if (node === null || node === undefined || typeof node === 'boolean') return out
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, out)
    return out
  }
  if (typeof node !== 'object' || node.props === undefined) return out
  if (typeof node.type === 'function') {
    collectElements(node.type(node.props), out)
    return out
  }
  out.push(node)
  collectElements(node.props.children, out)
  return out
}

const tree = PlaneHelpers()
assert(tree !== null && tree.props?.name === 'clip-plane-helpers', 'B the helper group is not rendered')

const elements = collectElements(tree)
const sheets = elements.filter((el) => typeof el.props.name === 'string' && el.props.name.startsWith('clip-helper-'))
assert(
  sheets.length === AXES.length,
  'B the component does not render exactly one sheet per plane axis',
  `found ${sheets.length}`,
)

const renderRows = []
for (const axis of PLANE_AXES) {
  const g = measured[axis]
  const sheet = sheets.find((el) => el.props.name === `clip-helper-${axis}`)
  assert(sheet !== undefined, `B no <group name="clip-helper-${axis}"> in the render tree`)
  if (sheet === undefined) continue

  const children = collectElements(sheet.props.children)
  const mesh = children.find((el) => el.type === 'mesh')
  const plane = children.find((el) => el.type === 'planeGeometry')
  const grid = children.find((el) => el.type === 'lineSegments')
  assert(mesh !== undefined && plane !== undefined && grid !== undefined, `B ${axis}: quad/grid elements missing`)
  if (mesh === undefined || plane === undefined || grid === undefined) continue

  // (B1) the quad args are the DERIVED rectangle, and the same array identity.
  const args = plane.props.args
  assert(
    Array.isArray(args) && close(args[0], g.quadWidth, 1e-9) && close(args[1], g.quadHeight, 1e-9),
    `B ${axis}: <planeGeometry args> is not the derived CLIP_BOUNDS rectangle`,
    `${JSON.stringify(args)} vs [${num(g.quadWidth)}, ${num(g.quadHeight)}]`,
  )
  // (B2) the group sits at the box centre, parked at the clip value.
  assert(
    Array.isArray(sheet.props.position) &&
      sheet.props.position.every((value, i) => close(value, g.center[i], 1e-9)),
    `B ${axis}: the sheet group position is not the derived centre`,
    `${JSON.stringify(sheet.props.position)} vs ${JSON.stringify(g.center)}`,
  )
  // (B3) quad and grid share one rotation (they cannot end up in different planes).
  assert(
    JSON.stringify(mesh.props.rotation) === JSON.stringify(g.rotation) &&
      JSON.stringify(grid.props.rotation) === JSON.stringify(g.rotation),
    `B ${axis}: quad and grid do not share the derived rotation`,
    `${JSON.stringify(mesh.props.rotation)} / ${JSON.stringify(grid.props.rotation)}`,
  )

  // (B4) the grid is a real BufferGeometry whose vertices cover the quad exactly.
  const gridGeometry = grid.props.geometry
  const attribute = gridGeometry?.getAttribute?.('position')
  assert(
    attribute !== undefined && attribute.count > 0,
    `B ${axis}: the grid element carries no position attribute`,
  )
  if (attribute === undefined) continue
  const localBox = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (let i = 0; i < attribute.count; i++) {
    for (let a = 0; a < 3; a++) {
      const value = attribute.getComponent(i, a)
      localBox.min[a] = Math.min(localBox.min[a], value)
      localBox.max[a] = Math.max(localBox.max[a], value)
    }
  }
  assert(
    close(localBox.min[0], -g.quadWidth / 2, GRID_TOLERANCE) && close(localBox.max[0], g.quadWidth / 2, GRID_TOLERANCE),
    `B ${axis}: the grid does not span the quad in its local u axis`,
    `[${num(localBox.min[0])}, ${num(localBox.max[0])}] vs ±${num(g.quadWidth / 2)}`,
  )
  assert(
    close(localBox.min[1], -g.quadHeight / 2, GRID_TOLERANCE) &&
      close(localBox.max[1], g.quadHeight / 2, GRID_TOLERANCE),
    `B ${axis}: the grid does not span the quad in its local v axis (the pre-v10 overhang defect)`,
    `[${num(localBox.min[1])}, ${num(localBox.max[1])}] vs ±${num(g.quadHeight / 2)}`,
  )
  assert(
    localBox.min[2] === 0 && localBox.max[2] === 0,
    `B ${axis}: the grid is not coplanar with the quad`,
    `z [${num(localBox.min[2])}, ${num(localBox.max[2])}]`,
  )

  // (B5) cells are GRID_CELL_AU on both in-plane axes — au-constant, not line-count.
  const uSteps = distinctSteps(attribute, 0)
  const vSteps = distinctSteps(attribute, 1)
  assert(
    uSteps.values.length === g.divisionsU + 1 && vSteps.values.length === g.divisionsV + 1,
    `B ${axis}: the grid line counts are not divisions + 1`,
    `${uSteps.values.length}/${vSteps.values.length} vs ${g.divisionsU + 1}/${g.divisionsV + 1}`,
  )
  const uniform = (steps) => steps.every((step) => Math.abs(step - steps[0]) <= GRID_TOLERANCE)
  assert(
    uniform(uSteps.steps) && Math.abs(uSteps.steps[0] - GRID_CELL_AU) <= 0.2,
    `B ${axis}: the u grid spacing is not a uniform ≈${GRID_CELL_AU} au`,
    `steps ${uSteps.steps.slice(0, 3).map((s) => num(s, 4)).join(', ')}…`,
  )
  assert(
    uniform(vSteps.steps) && Math.abs(vSteps.steps[0] - GRID_CELL_AU) <= 0.2,
    `B ${axis}: the v grid spacing is not a uniform ≈${GRID_CELL_AU} au`,
    `steps ${vSteps.steps.slice(0, 3).map((s) => num(s, 4)).join(', ')}…`,
  )
  assert(
    attribute.count === 2 * (g.divisionsU + 1 + g.divisionsV + 1),
    `B ${axis}: the grid is not one line per division per axis`,
    `${attribute.count} vertices`,
  )

  // (B6) every grid VERTEX lands on the canonical rectangle in world space.
  const gridBox = gridWorldBounds(gridGeometry, g.rotation, sheet.props.position)
  const u = indexOfAxis(g.uAxis)
  const v = indexOfAxis(g.vAxis)
  assert(
    close(gridBox.min[u], CLIP_BOUNDS[g.uAxis].min, GRID_TOLERANCE) &&
      close(gridBox.max[u], CLIP_BOUNDS[g.uAxis].max, GRID_TOLERANCE),
    `B ${axis}: the grid's world ${g.uAxis} extent is not the canonical span`,
    `[${num(gridBox.min[u])}, ${num(gridBox.max[u])}]`,
  )
  assert(
    close(gridBox.min[v], CLIP_BOUNDS[g.vAxis].min, GRID_TOLERANCE) &&
      close(gridBox.max[v], CLIP_BOUNDS[g.vAxis].max, GRID_TOLERANCE),
    `B ${axis}: the grid's world ${g.vAxis} extent is not the canonical span`,
    `[${num(gridBox.min[v])}, ${num(gridBox.max[v])}]`,
  )

  // (B7) the unchanged visual contract.
  const meshMaterial = collectElements(mesh.props.children).find((el) => el.type === 'meshBasicMaterial')
  const gridMaterial = collectElements(grid.props.children).find((el) => el.type === 'lineBasicMaterial')
  assert(
    mesh.props.renderOrder === 30 && grid.props.renderOrder === 31,
    `B ${axis}: renderOrder is not 30 (quad) / 31 (grid)`,
    `${mesh.props.renderOrder}/${grid.props.renderOrder}`,
  )
  assert(
    typeof mesh.props.raycast === 'function' &&
      mesh.props.raycast() === null &&
      typeof grid.props.raycast === 'function' &&
      grid.props.raycast() === null,
    `B ${axis}: the helpers are no longer raycast-transparent`,
  )
  assert(grid.props.dispose === null, `B ${axis}: the shared grid geometry is not protected from disposal`)
  assert(
    meshMaterial?.props.color === '#38bdf8' &&
      meshMaterial.props.transparent === true &&
      meshMaterial.props.opacity === 0.07 &&
      meshMaterial.props.depthWrite === false &&
      meshMaterial.props.side === THREE.DoubleSide,
    `B ${axis}: the quad material contract changed`,
    JSON.stringify({ ...meshMaterial?.props, children: undefined }),
  )
  assert(
    gridMaterial?.props.color === '#38bdf8' &&
      gridMaterial.props.transparent === true &&
      gridMaterial.props.opacity === 0.22 &&
      gridMaterial.props.depthWrite === false,
    `B ${axis}: the grid material contract changed`,
    JSON.stringify({ ...gridMaterial?.props, children: undefined }),
  )

  renderRows.push({
    axis,
    quad: `${num(args?.[0], 2)} × ${num(args?.[1], 2)}`,
    centre: sheet.props.position.map((value) => num(value)).join(', '),
    vertices: attribute.count,
    lines: `${g.divisionsU + 1}+${g.divisionsV + 1}`,
    cell: `${num(uSteps.steps[0], 3)} / ${num(vSteps.steps[0], 3)}`,
    roles: `${mesh.props.renderOrder}/${grid.props.renderOrder}`,
  })
}

console.log('     axis  quad args (au)     group centre            grid vertices  lines    cell u / v (au)  renderOrder')
for (const row of renderRows) {
  console.log(
    `     ${pad(row.axis, 5)} ${pad(row.quad, 17)} ${pad(row.centre, 23)} ${pad(row.vertices, 14)} ` +
      `${pad(row.lines, 8)} ${pad(row.cell, 16)} ${row.roles}`,
  )
}

/* ---- the store flag, and the per-frame rebuild rule ------------------- */
globalThis.__DSH_PLANE_HELPER_CLIP__ = { x: 3.5, y: 64, z: -20.5, enabled: true, showHelper: true }
const moved = PlaneHelpers()
const movedElements = collectElements(moved)
assert(moved !== null, 'B hiding/`showHelper` (true): the helper group is missing')
for (const axis of PLANE_AXES) {
  const before = sheets.find((el) => el.props.name === `clip-helper-${axis}`)
  const after = movedElements.find((el) => el.props.name === `clip-helper-${axis}`)
  assert(after !== undefined, `B ${axis}: the sheet disappeared when only the clip values moved`)
  if (after === undefined) continue
  const beforeArgs = collectElements(before.props.children).find((el) => el.type === 'planeGeometry')
  const afterArgs = collectElements(after.props.children).find((el) => el.type === 'planeGeometry')
  const beforeGrid = collectElements(before.props.children).find((el) => el.type === 'lineSegments')
  const afterGrid = collectElements(after.props.children).find((el) => el.type === 'lineSegments')
  assert(
    afterArgs?.props.args === beforeArgs?.props.args,
    `B ${axis}: dragging the slider creates a NEW args array (r3f reallocates the geometry)`,
  )
  assert(
    afterGrid?.props.geometry === beforeGrid?.props.geometry,
    `B ${axis}: dragging the slider creates a NEW grid geometry`,
  )
  assert(
    close(after.props.position[indexOfAxis(axis)], globalThis.__DSH_PLANE_HELPER_CLIP__[axis], 1e-9),
    `B ${axis}: the sheet did not follow the new clip value`,
    JSON.stringify(after.props.position),
  )
}
globalThis.__DSH_PLANE_HELPER_CLIP__ = { x: 0, y: 0, z: 0, enabled: false, showHelper: false }
assert(PlaneHelpers() === null, 'B `clip.showHelper === false` no longer hides the helpers')
globalThis.__DSH_PLANE_HELPER_CLIP__ = { x: 0, y: 0, z: 0, enabled: true, showHelper: true }
console.log(
  `     render path: ${sheets.length} sheets · args/geometry object identity stable across clip changes ` +
    '· `clip.showHelper === false` → null',
)

/* ==================================================================== *
 *  C. NO RETYPED BOX — the source's code, comments AND strings removed
 * ==================================================================== */

console.log('\n--- C. the source derives the box (no extent literal in code) ---')

/**
 * Strip comments — and, when `keepStrings` is false, the contents of string
 * literals too. Stricter than the repo's `codeOnly`: it also removes TRAILING
 * `//` comments, so a literal hidden in a comment cannot be mistaken for code,
 * and the two views are kept separate because a specifier
 * (`from './clipPlanes'`) is itself a string literal and must survive the
 * comment strip.
 */
function stripSource(text, { keepStrings }) {
  let out = ''
  let i = 0
  while (i < text.length) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end < 0 ? text.length : end + 2
      out += ' '
      continue
    }
    if (char === '/' && next === '/') {
      const end = text.indexOf('\n', i)
      i = end < 0 ? text.length : end
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      let j = i + 1
      while (j < text.length && text[j] !== char) {
        if (text[j] === '\\') j++
        j++
      }
      out += keepStrings ? text.slice(i, j + 1) : `${char}${char}`
      i = j + 1
      continue
    }
    out += char
    i++
  }
  return out
}

/** Comments removed, string literals intact (specifiers, colours). */
const source = readFileSync(resolve(ROOT, HELPER_FILE), 'utf8')
const code = stripSource(source, { keepStrings: true })
/** Comments AND string payloads removed — the numeric-literal view. */
const bare = stripSource(source, { keepStrings: false })

assert(code.length > 500, 'C comment stripping removed the whole file', `${code.length} code chars`)
assert(/from '\.\/clipPlanes'/.test(code), 'C the helper does not import from ./clipPlanes')
assert(/\bCLIP_BOUNDS\b/.test(bare), 'C the source never names CLIP_BOUNDS')
assert(!/CLIP_BOUNDS\s*[:=]\s*\{/.test(bare), 'C the helper declares a SECOND canonical box')

/** The pre-v10 sizes/box, plus the current bounds: none may appear in code. */
const PRE_V10 = [96, 82, 100, 48, 45, 41, 56, 26]
const CURRENT = [58, 116, 76, 72, 55, 30.5]
const forbidden = new Set([...PRE_V10, ...CURRENT])
const literals = [...bare.matchAll(/(?<![\w$.])(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]))
const banned = [...new Set(literals.filter((value) => forbidden.has(value)))].sort((a, b) => a - b)
assert(
  banned.length === 0,
  'C an extent literal is back in the code (derive it from CLIP_BOUNDS)',
  `found ${banned.join(', ')} in ${literals.length} numeric literals`,
)
assert(
  literals.includes(GRID_CELL_AU),
  `C GRID_CELL_AU (${GRID_CELL_AU}) is not a code literal any more (the au-constant cell rule)`,
)
// The geometry is built ONCE, at module load — not in the render path.
assert(
  (bare.match(/new THREE\.BufferGeometry\(\)/g) ?? []).length === 1,
  'C the file builds more (or fewer) than one BufferGeometry',
)
assert(
  (bare.match(/buildSheets\(\)/g) ?? []).length === 2 && /=\s*buildSheets\(\)/.test(bare),
  'C the sheet table is not built once at module load',
)
const meshBody = bare.slice(bare.indexOf('function HelperSheetMesh'), bare.indexOf('export default function PlaneHelpers'))
assert(
  meshBody.length > 200 && !/new THREE\./.test(meshBody) && !/new Float32Array/.test(meshBody),
  'C the render path constructs geometry (a rebuild per render)',
)
assert(
  /args=\{sheet\.quadArgs\}/.test(bare) && /geometry=\{sheet\.grid\}/.test(bare),
  'C the JSX does not pass the frozen quadArgs / grid geometry',
)
assert(
  /planeHelperGridPositions\(axis\)/.test(bare),
  'C the grid is not built from the exported pure line builder',
)
console.log(
  `     code: ${literals.length} numeric literals, none of {${[...forbidden].sort((a, b) => a - b).join(', ')}} ` +
    `· 1 BufferGeometry, built once · render path constructs no geometry`,
)

/* ==================================================================== *
 *  D. THE BITE — mutate clipPlanes.ts in a scratch copy; the helper must follow
 * ==================================================================== */

console.log('\n--- D. bite: clipPlanes.ts mutated in a scratch copy ---')

const SCRATCH = resolve(ROOT, '.dsh-scratch/v10-plane-helper')
const TREE = resolve(SCRATCH, 'tree')
const MUTATIONS = [
  { find: 'x: { min: -58, max: 58 },', to: 'x: { min: -58, max: 70 },' },
  { find: 'y: { min: -55, max: 116 },', to: 'y: { min: -55, max: 130 },' },
  { find: 'z: { min: -76, max: 72 },', to: 'z: { min: -90, max: 72 },' },
]

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12)
const shippedClipHash = sha(resolve(ROOT, CLIP_FILE))
const shippedHelperHash = sha(resolve(ROOT, HELPER_FILE))

rmSync(SCRATCH, { recursive: true, force: true })
mkdirSync(resolve(TREE, 'src/components/viewer3d'), { recursive: true })
mkdirSync(resolve(TREE, 'src/components/section'), { recursive: true })

let mutatedSource = readFileSync(resolve(ROOT, CLIP_FILE), 'utf8')
for (const { find, to } of MUTATIONS) {
  assert(mutatedSource.includes(find), `D the mutation anchor moved: "${find}" is not in clipPlanes.ts`)
  mutatedSource = mutatedSource.replace(find, to)
}
assert(mutatedSource !== readFileSync(resolve(ROOT, CLIP_FILE), 'utf8'), 'D the mutation did not change anything')
writeFileSync(resolve(TREE, CLIP_FILE), mutatedSource)
cpSync(resolve(ROOT, GEOMETRY_FILE), resolve(TREE, GEOMETRY_FILE))
cpSync(resolve(ROOT, HELPER_FILE), resolve(TREE, HELPER_FILE))

const mutatedClip = await import(pathToFileURL(resolve(TREE, CLIP_FILE)).href)
const mutatedHelper = await import(pathToFileURL(resolve(TREE, HELPER_FILE)).href)

const biteRows = []
for (const axis of PLANE_AXES) {
  const [uAxis, vAxis] = AXIS_PAIR[axis]
  const shipped = planeHelperGeometry(axis, 0)
  const mutated = mutatedHelper.planeHelperGeometry(axis, 0)
  const expectedU = mutatedClip.CLIP_BOUNDS[uAxis].max - mutatedClip.CLIP_BOUNDS[uAxis].min
  const expectedV = mutatedClip.CLIP_BOUNDS[vAxis].max - mutatedClip.CLIP_BOUNDS[vAxis].min
  assert(
    close(mutated.quadWidth, expectedU, 1e-9) && close(mutated.quadHeight, expectedV, 1e-9),
    `D ${axis}: the helper did NOT follow the mutated clipPlanes.ts (a literal box cannot)`,
    `${num(mutated.quadWidth)}×${num(mutated.quadHeight)} vs mutated ${num(expectedU)}×${num(expectedV)}`,
  )
  assert(
    Math.abs(mutated.quadWidth - shipped.quadWidth) > 1 && Math.abs(mutated.quadHeight - shipped.quadHeight) > 1,
    `D ${axis}: the mutation did not move BOTH in-plane extents (the lane proves nothing)`,
    `${num(shipped.quadWidth)}×${num(shipped.quadHeight)} → ${num(mutated.quadWidth)}×${num(mutated.quadHeight)}`,
  )
  assert(
    Math.abs(mutated.cellU - GRID_CELL_AU) <= 0.2 && Math.abs(mutated.cellV - GRID_CELL_AU) <= 0.2,
    `D ${axis}: the cells stopped being ≈${GRID_CELL_AU} au in the bigger box (line count, not au)`,
    `${num(mutated.cellU, 4)} / ${num(mutated.cellV, 4)}`,
  )
  assert(
    mutated.divisionsU > shipped.divisionsU || mutated.divisionsV > shipped.divisionsV,
    `D ${axis}: the line count did not grow with the box`,
    `${shipped.divisionsU}/${shipped.divisionsV} → ${mutated.divisionsU}/${mutated.divisionsV}`,
  )
  biteRows.push({ axis, uAxis, vAxis, shipped, mutated, expectedU, expectedV })
}

console.log(
  `     mutated clipPlanes.ts (x.max 58→70, y.max 116→130, z.min −76→−90): ` +
    AXES.map((a) => `${a}[${mutatedClip.CLIP_BOUNDS[a].min}, ${mutatedClip.CLIP_BOUNDS[a].max}]`).join(' · '),
)
console.log('     axis  u/v    shipped W × H        mutated W × H        cells shipped → mutated        lines shipped → mutated')
for (const row of biteRows) {
  console.log(
    `     ${pad(row.axis, 5)} ${pad(`${row.uAxis}/${row.vAxis}`, 6)} ` +
      `${pad(`${num(row.shipped.quadWidth, 2)} × ${num(row.shipped.quadHeight, 2)}`, 20)} ` +
      `${pad(`${num(row.mutated.quadWidth, 2)} × ${num(row.mutated.quadHeight, 2)}`, 20)} ` +
      `${pad(`${num(row.shipped.cellU, 3)}/${num(row.shipped.cellV, 3)} → ${num(row.mutated.cellU, 3)}/${num(row.mutated.cellV, 3)}`, 30)} ` +
      `${row.shipped.divisionsU}/${row.shipped.divisionsV} → ${row.mutated.divisionsU}/${row.mutated.divisionsV}`,
  )
}

// The shared tree was not touched: hashes, measured before and after.
const clipHashAfter = sha(resolve(ROOT, CLIP_FILE))
const helperHashAfter = sha(resolve(ROOT, HELPER_FILE))
assert(
  clipHashAfter === shippedClipHash && helperHashAfter === shippedHelperHash,
  'D the shared worktree changed while the bite ran',
  `${shippedClipHash}/${shippedHelperHash} → ${clipHashAfter}/${helperHashAfter}`,
)
rmSync(SCRATCH, { recursive: true, force: true })
console.log(
  `     shared tree untouched: ${CLIP_FILE} ${shippedClipHash} · ${HELPER_FILE} ${shippedHelperHash} ` +
    `(scratch ${SCRATCH.replace(ROOT, '.')} removed)`,
)

/* ----------------------------------------------------------------- summary */

console.log('\n--- E. the user-facing claim: every sheet with y in-plane reaches the vertex ---')
assert(measured.x !== undefined && measured.y !== undefined && measured.z !== undefined, 'E all three axes measured')
for (const axis of PLANE_AXES) {
  const g = measured[axis]
  const alongY = g.vAxis === 'y' ? 'v' : g.uAxis === 'y' ? 'u' : null
  if (alongY === null) continue
  const span = alongY === 'v' ? g.quadHeight : g.quadWidth
  const top = CLIP_BOUNDS.y.max
  const bottom = CLIP_BOUNDS.y.min
  assert(
    close(span, top - bottom, 1e-9),
    `E ${axis}: the sheet does not span y ${bottom}…${top} (the telencephalon top)`,
    `span ${num(span)} au`,
  )
  const box = quadWorldBounds(g)
  const yIndex = indexOfAxis('y')
  assert(
    close(box.max[yIndex], top, 1e-9) && close(box.min[yIndex], bottom, 1e-9),
    `E ${axis}: the sheet's measured world y extent is not ${bottom}…${top}`,
    `[${num(box.min[yIndex])}, ${num(box.max[yIndex])}]`,
  )
  console.log(
    `     ${pad(axis, 5)} ${alongY} = y : the sheet covers y[${bottom}, ${top}] — the vertex at +${top} is inside it ` +
      `(pre-v10 it stopped at +45: 71.0 au = 85.2 mm of the box, and 68.7 au = 82.4 mm of the measured ribbon top ` +
      '+113.7, were above the helper)',
  )
}

console.log('')
if (failures.length === 0) {
  console.log(`plane-helper-extent: ${checks} passed · 0 failed — exit 0`)
  process.exit(0)
}
console.log(`plane-helper-extent: ${checks - failures.length} passed · ${failures.length} failed`)
console.log('\nFAILURES:')
for (const failure of failures) console.log(`  · ${failure}`)
process.exit(1)
