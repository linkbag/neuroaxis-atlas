/**
 * PlaneHelpers — optional visual cut indicators (plan §5 "show plane" toggle):
 * one translucent quad + one grid per clip axis, positioned at the current
 * plane offsets. Purely visual: raycast disabled, depthWrite false, drawn on
 * top (renderOrder 30+), and not clipped by the planes themselves.
 *
 * ── v10 `plane-helpers-extent`: the helpers span the WHOLE canonical box ────
 * Until v10 the quads were sized to the brainstem-era box (x ±48, y −55…+45,
 * z −56…+26) while the canonical box had grown twice (docs/TELENCEPHALON_PLAN
 * §2 AMENDMENT B): the sagittal/coronal sheet stopped 71 au below the vertex and
 * the transverse sheet missed 35 au anteriorly and 31 au posteriorly, so a user
 * cutting through the hemispheres saw no plane boundary where the cortex is.
 *
 * The rectangle of a helper is now the canonical box rectangle of its two
 * IN-PLANE axes, DERIVED — never typed:
 *
 *   CLIP_BOUNDS (./clipPlanes.ts) is THE single runtime declaration of the box.
 *     extent(axis) = CLIP_BOUNDS[axis].max − CLIP_BOUNDS[axis].min
 *     centre(axis) = (CLIP_BOUNDS[axis].min + CLIP_BOUNDS[axis].max) / 2
 *   AXIS_PAIR (../section/planeGeometry.ts) fixes which two axes are in-plane —
 *   y → (x, z) · x → (z, y) · z → (x, y) — the SAME pair the 2D canvas, the PiP
 *   camera and the backdrop sampler use, so the 3D helper rectangle and the 2D
 *   visible rect cannot drift apart.
 *
 * A second hardcoded box in this file is exactly the drift the project forbids,
 * so NO extent literal appears in the code below. `scripts/verify/plane-helper-
 * extent.mjs` measures the extents per axis, executes this component's render
 * path, and mutates `clipPlanes.ts` in a scratch copy to require these helpers
 * to follow it.
 *
 * ── grid spacing is constant in AU, not in line count ──────────────────────
 * `GRID_CELL_AU` pins one cell to ~4 canonical au on BOTH in-plane axes, so
 * `divisions = round(extent / GRID_CELL_AU)` grows with the box instead of the
 * pre-v10 20/24 fixed line counts stretching over a rectangle ~40 % taller (and
 * instead of the old grids, one of which overhung its own quad).
 *
 * ── cost: nothing is rebuilt per frame ────────────────────────────────────
 * The quad sizes, the division counts and the line geometry per axis are built
 * ONCE at module load (`SHEETS`). Dragging a clip slider re-renders the sheet
 * group's `position` only — `planeHelperGeometry(axis, value)` is pure
 * arithmetic, its size fields do not depend on `value`, and the JSX passes the
 * frozen `quadArgs` array and the frozen line geometry object, so react-three-
 * fiber sees no `args`/`geometry` change and never reallocates.
 */
import * as THREE from 'three'
import { CLIP_BOUNDS } from './clipPlanes'
import { AXIS_INDEX, AXIS_PAIR, PLANE_AXES } from '../section/planeGeometry'
import type { PlaneAxis } from '../section/contours'
import { useAtlasStore } from '../../state/store'

/** Helper colour — unchanged from the pre-v10 helper (visual contract). */
const HELPER_COLOR = '#38bdf8'

/** Quad material opacity — unchanged from the pre-v10 helper. */
const QUAD_OPACITY = 0.07

/** Grid material opacity — unchanged from the pre-v10 helper. */
const GRID_OPACITY = 0.22

/** renderOrder of the quad, and of its grid (drawn on top of its own quad). */
const QUAD_RENDER_ORDER = 30
const GRID_RENDER_ORDER = 31

/**
 * Grid cell size in canonical au — THE legibility rule (v10 §1). Constant in
 * AU, not in lines: `divisions = round(extent / GRID_CELL_AU)` per in-plane
 * axis, so a bigger canonical box adds grid lines instead of coarsening them.
 */
export const GRID_CELL_AU = 4

/**
 * The Euler triple each sheet is rotated by — the pre-v10 rotations, kept
 * EXACTLY. A rotation about either in-plane axis maps the quad's local plane
 * (local XY, the frame `THREE.PlaneGeometry` is built in) onto the world plane
 * the sheet spans (`cos(±90°) = 0`), and the grid below is built in that SAME
 * local frame, so quad and grid are coplanar and coextensive by construction:
 *
 *   local +X → the world u axis · local +Y → the world v axis   (AXIS_PAIR)
 */
const HELPER_ROTATION: Record<PlaneAxis, [number, number, number]> = {
  y: [-Math.PI / 2, 0, 0], // transverse sheet (u = x, v = z), parked at y = clip.y
  x: [0, Math.PI / 2, 0], // sagittal sheet (u = z, v = y), parked at x = clip.x
  z: [0, 0, 0], // coronal sheet (u = x, v = y), parked at z = clip.z
}

/** Purely visual: the helpers must never intercept a pointer ray. */
const noRaycast = () => null

/** One axis' helper geometry — the measurements the JSX consumes. */
export interface PlaneHelperGeometry {
  /** The plane axis the sheet is perpendicular to (the axis it cuts). */
  axis: PlaneAxis
  /** In-plane axes: u = the quad's local X, v = the quad's local Y. */
  uAxis: PlaneAxis
  vAxis: PlaneAxis
  /** Quad size in au: the canonical box rectangle of the two in-plane axes. */
  quadWidth: number
  quadHeight: number
  /** Grid line counts, from GRID_CELL_AU (never from a fixed number). */
  divisionsU: number
  divisionsV: number
  /** Resulting cell size in au (`quadWidth / divisionsU`, `quadHeight / divisionsV`). */
  cellU: number
  cellV: number
  /** Canonical extents of the two in-plane axes, for the record. */
  uMin: number
  uMax: number
  vMin: number
  vMax: number
  /** World centre of the quad: the plane axis at `value`, the others at their box midpoint. */
  center: [number, number, number]
  /** The Euler triple the sheet (quad AND grid) is rotated by. */
  rotation: [number, number, number]
}

/** Canonical extent of one axis: `CLIP_BOUNDS` is the only source (never typed). */
function boxExtent(axis: PlaneAxis): number {
  return CLIP_BOUNDS[axis].max - CLIP_BOUNDS[axis].min
}

/** Canonical midpoint of one axis — the quad is centred on it, not on 0. */
function boxCentre(axis: PlaneAxis): number {
  return (CLIP_BOUNDS[axis].min + CLIP_BOUNDS[axis].max) / 2
}

/**
 * planeHelperGeometry(axis, clipValue) — the helper rectangle of one plane
 * axis: the canonical box rectangle of its two in-plane axes, centred on the
 * box midpoint, parked at `clipValue` along its own axis.
 *
 * Pure and clip-INDEPENDENT in every size field, so the check can call it for
 * any plane position and the component can call it per render for the position
 * alone — there is exactly one derivation, and the gate and the render path
 * cannot disagree.
 */
export function planeHelperGeometry(axis: PlaneAxis, clipValue: number): PlaneHelperGeometry {
  const [uAxis, vAxis] = AXIS_PAIR[axis]
  const quadWidth = boxExtent(uAxis)
  const quadHeight = boxExtent(vAxis)
  const divisionsU = Math.max(1, Math.round(quadWidth / GRID_CELL_AU))
  const divisionsV = Math.max(1, Math.round(quadHeight / GRID_CELL_AU))
  const center: [number, number, number] = [0, 0, 0]
  center[AXIS_INDEX[axis]] = clipValue
  center[AXIS_INDEX[uAxis]] = boxCentre(uAxis)
  center[AXIS_INDEX[vAxis]] = boxCentre(vAxis)
  return {
    axis,
    uAxis,
    vAxis,
    quadWidth,
    quadHeight,
    divisionsU,
    divisionsV,
    cellU: quadWidth / divisionsU,
    cellV: quadHeight / divisionsV,
    uMin: CLIP_BOUNDS[uAxis].min,
    uMax: CLIP_BOUNDS[uAxis].max,
    vMin: CLIP_BOUNDS[vAxis].min,
    vMax: CLIP_BOUNDS[vAxis].max,
    center,
    rotation: [...HELPER_ROTATION[axis]] as [number, number, number],
  }
}

/**
 * The grid's line segments in the quad's LOCAL XY frame, as a flat
 * `[x0, y0, z0, x1, y1, z1, …]` triple list — the same frame `planeGeometry`
 * (three) is built in, so one rotation puts both in the sheet's world plane.
 *
 * Cells are `extent / divisions`, i.e. `GRID_CELL_AU` ± the rounding of the
 * division count, on both in-plane axes; the outermost lines are the quad's own
 * edges, so the grid covers the quad exactly (the pre-v10 transverse grid
 * overhung its quad by 7 au in z).
 */
export function planeHelperGridPositions(axis: PlaneAxis): Float32Array {
  const { quadWidth, quadHeight, divisionsU, divisionsV } = planeHelperGeometry(axis, 0)
  const halfU = quadWidth / 2
  const halfV = quadHeight / 2
  const stepU = quadWidth / divisionsU
  const stepV = quadHeight / divisionsV
  const out: number[] = []
  for (let i = 0; i <= divisionsU; i++) {
    const u = -halfU + i * stepU // a line parallel to local Y (the v axis)
    out.push(u, -halfV, 0, u, halfV, 0)
  }
  for (let j = 0; j <= divisionsV; j++) {
    const v = -halfV + j * stepV // a line parallel to local X (the u axis)
    out.push(-halfU, v, 0, halfU, v, 0)
  }
  return new Float32Array(out)
}

/** The frozen, module-scoped geometry of one sheet (built once, never per frame). */
interface HelperSheet {
  /** The quad's `planeGeometry` args — the same ARRAY object every render. */
  quadArgs: [number, number]
  /** The grid, built once from `planeHelperGridPositions`. */
  grid: THREE.BufferGeometry
  /** The sheet's rotation (quad and grid share it). */
  rotation: [number, number, number]
}

/**
 * One sheet per plane axis, built at MODULE LOAD — the "no per-frame geometry
 * rebuild" rule: the sizes and the line buffers are canonical-box constants,
 * and only the group `position` follows the clip sliders.
 */
const SHEETS: Record<PlaneAxis, HelperSheet> = buildSheets()

function buildSheets(): Record<PlaneAxis, HelperSheet> {
  const table = {} as Record<PlaneAxis, HelperSheet>
  for (const axis of PLANE_AXES) {
    const { quadWidth, quadHeight, rotation } = planeHelperGeometry(axis, 0)
    const grid = new THREE.BufferGeometry()
    grid.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(planeHelperGridPositions(axis), 3),
    )
    table[axis] = { quadArgs: [quadWidth, quadHeight], grid, rotation }
  }
  return table
}

/** One translucent quad + its au-spaced grid, parked at `value` on `axis`. */
function HelperSheetMesh({ axis, value }: { axis: PlaneAxis; value: number }) {
  const sheet = SHEETS[axis]
  // Per render: the POSITION only. Every size below is a frozen module constant,
  // so a slider drag cannot reallocate a geometry or a material.
  const { center } = planeHelperGeometry(axis, value)

  return (
    <group name={`clip-helper-${axis}`} position={center}>
      <mesh rotation={sheet.rotation} renderOrder={QUAD_RENDER_ORDER} raycast={noRaycast}>
        <planeGeometry args={sheet.quadArgs} />
        <meshBasicMaterial
          color={HELPER_COLOR}
          transparent
          opacity={QUAD_OPACITY}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/*
        `gridHelper` (three) only takes ONE divisions value and is always
        square, so it cannot span a 116 × 171 au rectangle with au-constant
        cells: it would silently ignore the second size, coarsen the y cells and
        overhang the quad. The grid is therefore the same lines, built in the
        quad's own local frame — identical material behaviour (LineBasicMaterial,
        transparent, opacity 0.22, on top of its quad), identical spacing rule.
        `dispose={null}` states the ownership: this geometry is module-scoped and
        shared, so mounting/unmounting the helper (the `showHelper` toggle) must
        not free it — the guarantee `THREE.GridHelper.dispose()` destroys, since
        it disposes the geometry it owns.
      */}
      <lineSegments
        geometry={sheet.grid}
        rotation={sheet.rotation}
        renderOrder={GRID_RENDER_ORDER}
        raycast={noRaycast}
        dispose={null}
      >
        <lineBasicMaterial
          color={HELPER_COLOR}
          transparent
          opacity={GRID_OPACITY}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  )
}

export default function PlaneHelpers() {
  const clip = useAtlasStore((s) => s.clip)
  if (!clip.showHelper) return null

  return (
    <group name="clip-plane-helpers">
      {PLANE_AXES.map((axis) => (
        <HelperSheetMesh key={axis} axis={axis} value={clip[axis]} />
      ))}
    </group>
  )
}
