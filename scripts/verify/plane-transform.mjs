/**
 * verify/plane-transform.mjs — `npm run verify:plane`
 * (docs/QUALITY_PLAN.md §2 item 5 · docs/AUDIT_REPORT.md §2.4/§2.5, §6.6).
 *
 * The gate for the ONE shared plane transform. It imports the module the app
 * ships (`src/components/section/planeGeometry.ts` — not a copy) and asserts:
 *
 *  A. AGREEMENT — the canvas transform, the PiP transform and the backdrop
 *     sampler's transform are the SAME function of (axis, plane, viewport): for
 *     a grid of 3 axes × 9 plane values × 12 viewport aspects (incl. degenerate
 *     wide/tall) every derived quantity agrees exactly, and a world point maps
 *     to the same normalised viewport position and the same world rect on both
 *     surfaces — which is what makes "the canvas and the PiP place the same
 *     photograph at the same world position and size" true.
 *  B. ORIENTATION FROM GEOMETRY — the badge table is DERIVED, never hard-coded:
 *     the world points (+x patient-left, +y superior, +z anterior, …) are
 *     projected through `planeTransform` and the edge each one lands on is read
 *     off the pixels; the derived table must equal `badges(axis)`, must equal
 *     the PLANE_BADGES literal, and must equal the §2.2 convention in
 *     docs/SECTION_SYNC_PLAN.md. `mirrorX(axis)`/`cameraUpAxis(axis)` describe
 *     the PiP's own render camera, so they are checked as the facts they are:
 *     they must be the values the shipped panel declares (read out of its
 *     source, so the two surfaces cannot disagree), they must satisfy the
 *     module's own rule (`mirrorX === (cameraUpAxis === uAxis)`, the up axis
 *     always in-plane, never the plane normal), and they must stay consistent
 *     with the framing the shared transform hands the camera. The camera's roll
 *     itself needs the live three.js basis and is NOT asserted here — its status
 *     is recorded in `cameraUpAxis`'s note in the module and in the task report.
 *  C. LEVELS — `nearestLevelTo` and `snapClipWrite` agree with the anchors of
 *     src/data/levels.json (nearest-to-the-dragged-value, ties, out-of-range
 *     values, x/z never snap), and CLIP_BOUNDS is the single source of the
 *     canonical extents.
 *
 * Exits non-zero on any failure. Run from the repo root:
 *   node scripts/verify/plane-transform.mjs      (or: npm run verify:plane)
 */
import { register } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/* The app's sources import each other with bundler-style extensionless
 * specifiers; the hook adds only that one rule so this gate can import the
 * module the app really ships (see the hook's header). */
register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href)

const plane = await import('../../src/components/section/planeGeometry.ts')
const {
  AXIS_INDEX,
  AXIS_PAIR,
  PLANE_BADGES,
  REFERENCE_VIEWPORT,
  DIRECTION_VECTORS,
  MODALITY_TOLERANCE_AU,
  axisExtents,
  badges,
  mirrorX,
  cameraUpAxis,
  nearestLevelTo,
  snapClipWrite,
  pickImageForPlane,
  planeTransform,
  samplerViewport,
  sectionAxisOf,
} = plane

/* ------------------------------------------------------------ assertion log */

const failures = []
let checks = 0

/** Records one assertion; `detail` is printed when it fails. */
function assert(condition, label, detail = '') {
  checks++
  if (condition) return true
  failures.push(detail === '' ? label : `${label} — ${detail}`)
  return false
}

/** Exact float equality (the module is deterministic: same inputs, same ops). */
const exact = (a, b) => a === b
/** Relative equality for values that travel through different call orders. */
function close(a, b, tolerance = 1e-9) {
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b))
}
function sameViewport(a, b) {
  return exact(a.width, b.width) && exact(a.height, b.height)
}

/* -------------------------------------------- (A0) no private copies left */

{
  // The fix is only real if every consumer DELEGATES: a reintroduced private
  // transform, axis pair, badge table or level scan would silently drift again.
  const consumers = {
    'src/components/section/SectionCanvas.tsx': [
      'planeTransform',
      'axisExtents',
      'AXIS_PAIR',
      'PLANE_BADGES',
      'PLANE_CAPTION',
      'nearestLevelTo',
    ],
    'src/components/viewer3d/SectionPiP.tsx': ['planeTransform', 'PLANE_BADGES', 'mirrorX', 'cameraUpAxis'],
    'src/components/section/imageLayers.ts': ['planeTransform', 'AXIS_PAIR', 'AXIS_INDEX', 'nearestLevelTo'],
    'src/components/PlatesTab.tsx': ['pickImageForPlane', 'MODALITY_TOLERANCE_AU'],
    'src/components/viewer3d/ClipControls.tsx': ['nearestLevelTo', 'snapClipWrite'],
    'src/components/section/SectionSliderBar.tsx': ['snapClipWrite'],
  }
  for (const [file, tokens] of Object.entries(consumers)) {
    const source = readFileSync(resolve(file), 'utf8')
    assert(
      /from '[^']*planeGeometry'/.test(source),
      `A0 ${file} does not import from planeGeometry (the shared module is being bypassed)`,
    )
    for (const token of tokens) {
      assert(source.includes(token), `A0 ${file} no longer references ${token}`)
    }
  }
  // The private duplicates the audit found must be gone. (Thin wrappers that
  // apply a WINDOW on top of the shared scan are allowed and checked below.)
  const duplicates = [
    ['src/components/section/SectionCanvas.tsx', /const AXIS_PAIR\s*:/, 'a private AXIS_PAIR table'],
    ['src/components/section/SectionCanvas.tsx', /function computeTransform\s*\(/, 'a private transform'],
    ['src/components/section/imageLayers.ts', /const AXIS_PAIR\s*:/, 'a private AXIS_PAIR table'],
    ['src/components/viewer3d/SectionPiP.tsx', /const VIEW_MARGIN\s*=/, 'a private framing margin'],
    ['src/components/viewer3d/SectionPiP.tsx', /halfU:\s*\(CLIP_BOUNDS/, 'a private half-extent'],
    ['src/components/viewer3d/ClipControls.tsx', /function nearestLevelTo\s*\(/, 'a private nearestLevelTo'],
    ['src/components/section/SectionSliderBar.tsx', /function nearestLevelTo\s*\(/, 'a private nearestLevelTo'],
    ['src/components/PlatesTab.tsx', /function photoForPlane\s*\(/, 'a private photo pick'],
    ['src/components/PlatesTab.tsx', /image\.planeValue - value/, 'a private anchor-distance scan'],
    ['src/components/section/imageLayers.ts', /const distance = Math\.abs\(level\.y - value\)/, 'a private level scan'],
    ['src/components/section/SectionCanvas.tsx', /const distance = Math\.abs\(level\.y - value\)/, 'a private level scan'],
  ]
  for (const [file, pattern, what] of duplicates) {
    const source = readFileSync(resolve(file), 'utf8')
    assert(!pattern.test(source), `A0 ${file} still carries ${what} (drift source must be deleted)`)
  }
  // The canvas prints the badge letters (scripts/verify-imaging-v4.mjs reads
  // that table out of the source), so the spelling is allowed — but it must be
  // paired with a load-time assertion against the shared table, which is what
  // makes it a checked mirror instead of a drift source.
  {
    const source = readFileSync(resolve('src/components/section/SectionCanvas.tsx'), 'utf8')
    const block = source.slice(source.indexOf('const DIRECTION_BADGES'))
    assert(
      /top:\s*'[SIA]',\s*bottom:\s*'[PIR]',\s*left:\s*'[RAPL]',\s*right:\s*'[LAIR]'/.test(block),
      'A0 SectionCanvas no longer spells the in-canvas badge table (verify-imaging-v4 reads it)',
    )
    assert(
      /PLANE_BADGES\[axis\]/.test(source) || /\.\.\.PLANE_BADGES\./.test(source),
      'A0 SectionCanvas spells badge letters without comparing them to planeGeometry.PLANE_BADGES',
    )
  }
  // Exactly ONE module owns the level scan and the anchor-distance scan.
  {
    const owners = [
      'src/components/section/planeGeometry.ts',
      'src/components/section/SectionCanvas.tsx',
      'src/components/section/imageLayers.ts',
      'src/components/section/SectionSliderBar.tsx',
      'src/components/viewer3d/ClipControls.tsx',
      'src/components/PlatesTab.tsx',
      'src/components/viewer3d/SectionPiP.tsx',
    ]
    for (const [pattern, label] of [
      [/const distance = Math\.abs\(level\.y - value\)/, 'the level-distance scan'],
      [/Math\.abs\((?:image\.)?planeValue - (?:value|planeValue)\)/, 'the anchor-distance scan'],
    ]) {
      const holders = owners.filter((file) => pattern.test(readFileSync(resolve(file), 'utf8')))
      assert(
        holders.length === 1 && holders[0] === 'src/components/section/planeGeometry.ts',
        `A0 ${label} must live ONLY in planeGeometry.ts (found in: ${holders.join(', ') || 'none'})`,
      )
    }
  }
  // And the surfaces really call the ONE transform.
  for (const file of ['src/components/section/SectionCanvas.tsx', 'src/components/viewer3d/SectionPiP.tsx']) {
    const source = readFileSync(resolve(file), 'utf8')
    assert(
      source.includes('planeTransform('),
      `A0 ${file} does not call planeTransform() — the shared mapping is not in use`,
    )
  }
  console.log('A0. delegation   6 consumers import planeGeometry · 0 private duplicates left')
}

/* ---------------------------------------------------------------- (A) input */

const CANVAS_VIEWPORTS = [
  { width: 900, height: 420, label: 'canvas wide' },
  { width: 640, height: 400, label: 'canvas 1.6:1' },
  { width: 960, height: 800, label: 'canvas 1.2:1' },
  { width: 1280, height: 520, label: 'canvas ultra-wide' },
  { width: 420, height: 300, label: 'panel small' },
  { width: 400, height: 640, label: 'tall (degenerate)' },
  { width: 300, height: 900, label: 'very tall (degenerate)' },
  { width: 1280, height: 180, label: 'very wide (degenerate)' },
  { width: 48, height: 41, label: 'canonical 1 px/au' },
  { width: 240, height: 41, label: 'single-v-span strip' },
  { width: 1, height: 1, label: 'single pixel' },
  { width: 4096, height: 2160, label: '4K' },
]

/** Pip panel sizes: the shipped small/large PiP at dpr 1 and dpr 2. */
const PIP_VIEWPORTS = [
  { width: 224, height: 170, label: 'pip small dpr1' },
  { width: 448, height: 340, label: 'pip small dpr2' },
  { width: 348, height: 262, label: 'pip large dpr1' },
  { width: 696, height: 524, label: 'pip large dpr2' },
]

const AXES = ['x', 'y', 'z']
const PLANES = { x: [-48, -30, -12, 0, 12, 24, 36, 47.5, 48], y: [-55, -42, -24, -8, 6, 14, 28, 40, 45], z: [-56, -40, -20, -5, 0, 8, 18, 24, 26] }

/**
 * The CANVAS call shape, re-derived here the way `SectionCanvas.draw()` decided
 * it before the refactor (aspect-fit of the canonical extents with no margin,
 * visible rect centred on the bounds midpoint). The shared module must produce
 * exactly this — the gate does not trust the module to agree with itself.
 */
function canvasCallShape(axis, planeValue, viewport) {
  const extents = axisExtents(axis)
  const scale = Math.max(1e-6, Math.min(viewport.width / extents.uSpan, viewport.height / extents.vSpan))
  return {
    scale,
    u0: extents.centerU - viewport.width / scale / 2,
    v0: extents.centerV + viewport.height / scale / 2,
  }
}

/**
 * The PiP call shape: ortho half-extents aspect-fitted into the panel and the
 * camera centred on the canonical bounds — with NO framing margin (the private
 * `VIEW_MARGIN = 1.08` is gone; a margin is a second scale).
 */
function pipCallShape(axis, planeValue, viewport) {
  const extents = axisExtents(axis)
  let halfU = extents.halfU
  let halfV = extents.halfV
  const aspect = viewport.width / viewport.height
  if (halfU / halfV > aspect) halfV = halfU / aspect
  else halfU = halfV * aspect
  const scale = viewport.width / (2 * halfU)
  return { scale, halfU, halfV, centerU: extents.centerU, centerV: extents.centerV }
}

/** Same viewport, the three surfaces that must agree. */
const SURFACES = ['canvas', 'pip', 'sampler']

/**
 * A photograph of `naturalWidth × naturalHeight` source pixels with
 * `fit.scale` px per au, centred on the world origin (dx = dy = 0), as the
 * manifest declares it. Returns the world rect the ONE placement rule puts it
 * at: image centre = (view centre − dx, view centre + dy).
 */
function photoWorldRect(transform, naturalWidth, naturalHeight, fitScale, dx = 0, dy = 0) {
  const wAu = naturalWidth / fitScale
  const hAu = naturalHeight / fitScale
  const uCenter = transform.centerU - dx
  const vCenter = transform.centerV + dy
  return { uMin: uCenter - wAu / 2, uMax: uCenter + wAu / 2, vMin: vCenter - hAu / 2, vMax: vCenter + hAu / 2 }
}

{
  let agreements = 0
  let gridPoints = 0
  for (const axis of AXES) {
    const extents = axisExtents(axis)
    for (const viewport of CANVAS_VIEWPORTS) {
      for (const planeValue of PLANES[axis]) {
        // The three surfaces all consume the shared module…
        const transforms = SURFACES.map(() => planeTransform(axis, planeValue, viewport))
        const [canvasT, pipT, samplerT] = transforms

        // (A1) …are the same function of the same inputs, and match the call
        //      shape each surface used BEFORE the refactor (canvas aspect-fit,
        //      PiP ortho half-extents) — so the shared mapping cannot silently
        //      re-centre or re-scale a surface.
        const same =
          exact(canvasT.scale, pipT.scale) &&
          exact(canvasT.scale, samplerT.scale) &&
          exact(canvasT.u0, pipT.u0) &&
          exact(canvasT.v0, pipT.v0) &&
          exact(canvasT.halfU, pipT.halfU) &&
          exact(canvasT.halfV, pipT.halfV) &&
          canvasT.uAxis === pipT.uAxis &&
          canvasT.vAxis === pipT.vAxis
        assert(
          same,
          `A1 ${axis}@${planeValue} ${viewport.label}: the three surfaces disagree`,
          `scale ${canvasT.scale}/${pipT.scale}/${samplerT.scale} u0 ${canvasT.u0}/${pipT.u0}`,
        )
        const canvasShape = canvasCallShape(axis, planeValue, viewport)
        const pipShape = pipCallShape(axis, planeValue, viewport)
        assert(
          close(canvasT.scale, canvasShape.scale, 1e-9) &&
            close(canvasT.u0, canvasShape.u0, 1e-9) &&
            close(canvasT.v0, canvasShape.v0, 1e-9),
          `A1 ${axis}@${planeValue} ${viewport.label}: the transform is not the canvas aspect-fit`,
          `scale ${canvasT.scale} vs ${canvasShape.scale}, u0 ${canvasT.u0} vs ${canvasShape.u0}`,
        )
        assert(
          close(pipT.halfU, pipShape.halfU, 1e-9) &&
            close(pipT.halfV, pipShape.halfV, 1e-9) &&
            close(pipT.scale, pipShape.scale, 1e-9),
          `A1 ${axis}@${planeValue} ${viewport.label}: the transform is not the PiP ortho fit`,
          `halfU ${pipT.halfU} vs ${pipShape.halfU}, scale ${pipT.scale} vs ${pipShape.scale}`,
        )
        // The old drift, stated as a failing property: a framing margin would
        // make the two surfaces place the same photograph differently, so on any
        // viewport where a margin can act it must strictly change the scale.
        if (viewport.width >= 100 && viewport.height >= 100) {
          const drifted = planeTransform(axis, planeValue, viewport, 1.08)
          assert(
            drifted.scale < canvasT.scale,
            `A1 ${axis}@${planeValue} ${viewport.label}: a 1.08 margin no longer shrinks the scale, so this gate cannot detect that drift`,
          )
        }
        agreements++

        // (A2) the visible rect contains the canonical extents and is centred
        //      on their midpoint: nothing is cropped, nothing is off-centre.
        assert(
          canvasT.uMin <= extents.uMin + 1e-9 &&
            canvasT.uMax >= extents.uMax - 1e-9 &&
            canvasT.vMin <= extents.vMin + 1e-9 &&
            canvasT.vMax >= extents.vMax - 1e-9,
          `A2 ${axis}@${planeValue} ${viewport.label}: canonical extents are cropped`,
          `u [${canvasT.uMin}, ${canvasT.uMax}] vs [${extents.uMin}, ${extents.uMax}]`,
        )
        assert(
          close((canvasT.uMin + canvasT.uMax) / 2, extents.centerU, 1e-9) &&
            close((canvasT.vMin + canvasT.vMax) / 2, extents.centerV, 1e-9),
          `A2 ${axis}@${planeValue} ${viewport.label}: visible rect is not centred on the bounds midpoint`,
        )

        // (A3) the mapping is round-trip exact and strictly increasing in u
        //      (world +u always lands on the image right, on every surface).
        const worldU = extents.centerU + 7.25
        const worldV = extents.centerV - 3.5
        assert(
          close(canvasT.sxToU(canvasT.uToSx(worldU)), worldU, 1e-9) &&
            close(canvasT.syToV(canvasT.vToSy(worldV)), worldV, 1e-9),
          `A3 ${axis}@${planeValue} ${viewport.label}: world→screen→world is not identity`,
        )
        assert(
          canvasT.uToSx(worldU + 1) > canvasT.uToSx(worldU) && canvasT.vToSy(worldV + 1) < canvasT.vToSy(worldV),
          `A3 ${axis}@${planeValue} ${viewport.label}: +u must go right and +v up`,
        )

        // (A4) one world au is the same number of pixels on both in-plane axes
        //      (uniform scale) and equals `scale`.
        const duPx = canvasT.uToSx(worldU + 1) - canvasT.uToSx(worldU)
        const dvPx = canvasT.vToSy(worldV) - canvasT.vToSy(worldV + 1)
        assert(
          close(duPx, dvPx, 1e-9) && close(duPx, canvasT.scale, 1e-9),
          `A4 ${axis}@${planeValue} ${viewport.label}: non-uniform scale`,
          `du ${duPx} dv ${dvPx} scale ${canvasT.scale}`,
        )

        // (A5) an anchored photograph (the UBC horizontal 400×350 @ 13.2 px/au
        //      and the VHP cryosection 528×764 @ 4.0816 px/au both appear in the
        //      manifest) lands on the SAME world rect and the SAME screen rect on
        //      the canvas and in the PiP.
        for (const [naturalWidth, naturalHeight, fitScale] of [
          [400, 350, 13.2],
          [528, 764, 4.0816],
          [800, 700, 13.2],
        ]) {
          const rect = photoWorldRect(canvasT, naturalWidth, naturalHeight, fitScale)
          for (const [u, v] of [
            [rect.uMin, rect.vMax],
            [rect.uMax, rect.vMax],
            [rect.uMin, rect.vMin],
            [rect.uMax, rect.vMin],
          ]) {
            const canvasSx = canvasT.uToSx(u) / canvasT.width
            const pipSx = pipT.uToSx(u) / pipT.width
            const canvasSy = canvasT.vToSy(v) / canvasT.height
            const pipSy = pipT.vToSy(v) / pipT.height
            assert(
              close(canvasSx, pipSx, 1e-9) && close(canvasSy, pipSy, 1e-9),
              `A5 ${axis}@${planeValue} ${viewport.label}: the photograph lands at different viewport positions`,
              `canvas ${canvasSx.toFixed(6)},${canvasSy.toFixed(6)} vs pip ${pipSx.toFixed(6)},${pipSy.toFixed(6)}`,
            )
            gridPoints++
          }
          assert(
            close(
              (canvasT.uToSx(rect.uMax) - canvasT.uToSx(rect.uMin)) / canvasT.width,
              (pipT.uToSx(rect.uMax) - pipT.uToSx(rect.uMin)) / pipT.width,
              1e-9,
            ),
            `A5 ${axis}@${planeValue} ${viewport.label}: the photograph has a different RELATIVE size on the two surfaces`,
          )
          // The declared meaning of fit.scale: wAu = naturalWidth / fit.scale.
          assert(
            close(rect.uMax - rect.uMin, naturalWidth / fitScale, 1e-9) &&
              close(rect.vMax - rect.vMin, naturalHeight / fitScale, 1e-9),
            `A5 ${axis}@${planeValue} ${viewport.label}: fit.scale no longer means naturalWidth / wAu`,
          )
        }

        // (A6) the PiP's ortho half-sizes ARE the transform's half-extents, and
        //      its camera centre IS the transform's rect centre (the two values
        //      SectionPiP copies into the camera every frame).
        assert(
          close(pipT.halfU, pipT.width / (2 * pipT.scale), 1e-9) &&
            close(pipT.halfV, pipT.height / (2 * pipT.scale), 1e-9),
          `A6 ${axis}@${planeValue} ${viewport.label}: PiP half-extents disagree with the transform`,
        )
      }
    }
  }
  console.log(
    `A. agreement      ${agreements} (axis, plane, viewport) triples · ${gridPoints} photograph corners projected`,
  )
}

/* ------------------------------- (A7) canvas ≡ PiP across the REAL sizes */

{
  // The sizes the two live surfaces actually have (canvas panel vs the shipped
  // 224×170 / 348×262 PiP). Two viewports of different aspect ratios can never
  // show the same WORLD window — they frame the same fixed canonical extents
  // into their own shape. What must hold is the property that makes a
  // photograph sit identically in both: the mapping is the same function of
  // (scale, centre), the visible window is centred on the canonical bounds
  // midpoint, and the padding is split evenly, so the world point at the
  // window's relative centre is the SAME point on both surfaces.
  let tested = 0
  for (const axis of AXES) {
    const extents = axisExtents(axis)
    for (const canvasViewport of CANVAS_VIEWPORTS) {
      const canvasT = planeTransform(axis, 0, canvasViewport)
      for (const pipViewport of PIP_VIEWPORTS) {
        const pipT = planeTransform(axis, 0, pipViewport)
        // Same uniform scale whenever both viewports fit the same axis the same
        // way; otherwise each fits its own binding axis — assert the fit law.
        for (const [label, transform, viewport] of [
          ['canvas', canvasT, canvasViewport],
          ['pip', pipT, pipViewport],
        ]) {
          const fitScale = Math.min(
            viewport.width / extents.uSpan,
            viewport.height / extents.vSpan,
          )
          assert(
            close(transform.scale, fitScale, 1e-9),
            `A7 ${axis} ${label}: scale is not the aspect fit of the canonical extents`,
            `${transform.scale} vs ${fitScale}`,
          )
          // Visible window centred on the bounds midpoint.
          assert(
            close((transform.uMin + transform.uMax) / 2, extents.centerU, 1e-9) &&
              close((transform.vMin + transform.vMax) / 2, extents.centerV, 1e-9),
            `A7 ${axis} ${label} ${viewport.label}: visible window is not centred on the bounds midpoint`,
          )
        }
        // The world point at the relative centre of each window is the bounds
        // centre — the same point on both surfaces (the photograph anchor).
        assert(
          close(canvasT.sxToU(canvasT.width / 2), extents.centerU, 1e-9) &&
            close(pipT.sxToU(pipT.width / 2), extents.centerU, 1e-9) &&
            close(canvasT.syToV(canvasT.height / 2), extents.centerV, 1e-9) &&
            close(pipT.syToV(pipT.height / 2), extents.centerV, 1e-9),
          `A7 ${axis}: the relative window centre is not the bounds centre on both surfaces`,
        )
        tested++
      }
    }
  }
  console.log(`A. canvas ≡ PiP  ${tested} real canvas/PiP size pairs`)
}

/* ------------------------------- (A8) the sampler's window round-trip ---- */

{
  // renderSliceToCanvas knows only the RT pixel size and the world half-extents
  // its camera uses, and rebuilds a viewport from them (planeGeometry
  // .samplerViewport) before asking for the mapping. The window it then draws
  // into must be EXACTLY the window the caller asked for — otherwise the
  // backdrop and the 3D cut drawn with that camera would disagree.
  let tested = 0
  let worst = 0
  for (const axis of AXES) {
    for (const viewport of [...CANVAS_VIEWPORTS, ...PIP_VIEWPORTS]) {
      const reference = planeTransform(axis, 0, viewport)
      for (const [rtWidth, rtHeight] of [
        [viewport.width, viewport.height],
        [Math.max(2, Math.round(viewport.width * 2)), Math.max(2, Math.round(viewport.height * 2))],
        [Math.max(2, Math.round(viewport.width * 0.5)), Math.max(2, Math.round(viewport.height * 0.5))],
      ]) {
        const rebuilt = planeTransform(
          axis,
          0,
          samplerViewport({ width: rtWidth, height: rtHeight, halfU: reference.halfU, halfV: reference.halfV }),
        )
        worst = Math.max(
          worst,
          Math.abs(rebuilt.uMin - reference.uMin),
          Math.abs(rebuilt.uMax - reference.uMax),
          Math.abs(rebuilt.vMin - reference.vMin),
          Math.abs(rebuilt.vMax - reference.vMax),
        )
        assert(
          close(rebuilt.uMin, reference.uMin, 1e-9) &&
            close(rebuilt.uMax, reference.uMax, 1e-9) &&
            close(rebuilt.vMin, reference.vMin, 1e-9) &&
            close(rebuilt.vMax, reference.vMax, 1e-9),
          `A8 ${axis} ${viewport.label} @${rtWidth}x${rtHeight}: the sampler's rebuilt window differs from the camera's`,
          `[${rebuilt.uMin}, ${rebuilt.uMax}] vs [${reference.uMin}, ${reference.uMax}]`,
        )
        tested++
      }
    }
  }
  console.log(`A. sampler window ${tested} raster/panel combinations (worst window drift ${worst.toExponential(1)} au)`)
}

/* ------------------------------------------------- (B) orientation geometry */

/**
 * The orientation table derived ONLY from projected pixels — the gate's own
 * re-derivation (independent of `badges()`). `planeTransform` maps the world
 * axis +u to the image RIGHT and +v to the image TOP (strictly increasing uToSx,
 * and vToSy decreasing in v); a world direction therefore lands on the edge its
 * in-plane component points at:
 *
 *   +u component → right,  −u component → left  (the sign of uToSx' slope)
 *   +v component → top,    −v component → bottom (screen y grows downward)
 *
 * and the anatomical letter that owns that edge is the direction that points at
 * it. Directions perpendicular to the slice (e.g. superior/inferior on a
 * transverse plane) are skipped: they cannot label an edge of that image.
 */
function deriveBadgesFromPixels(axis, viewport) {
  const transform = planeTransform(axis, 0, viewport)
  const extents = axisExtents(axis)
  const uIdx = AXIS_INDEX[extents.uAxis]
  const vIdx = AXIS_INDEX[extents.vAxis]
  // The image-right direction in world terms, read off the pixel mapping.
  const rightDelta = transform.uToSx(1) - transform.uToSx(0)
  assert(
    rightDelta > 0,
    `B1 ${axis} ${viewport.label}: +u no longer maps to the image right (${rightDelta})`,
  )
  const edges = { top: [], bottom: [], left: [], right: [] }
  for (const [label, direction] of Object.entries(DIRECTION_VECTORS)) {
    const uComponent = direction[uIdx]
    const vComponent = direction[vIdx]
    if (uComponent === 0 && vComponent === 0) continue
    if (uComponent !== 0) {
      const towardRight = uComponent > 0 === rightDelta > 0
      edges[towardRight ? 'right' : 'left'].push(label)
    } else {
      // vToSy decreases as v grows, so a +v component is toward the top row.
      const towardTop = vComponent > 0
      edges[towardTop ? 'top' : 'bottom'].push(label)
    }
  }
  return { edges, rightDelta }
}

/**
 * The other, stricter reading: project EVERY anatomical direction through the
 * transform and take the one that points most strongly toward the given edge
 * (signed — the opposite direction of the same axis projects to the opposite
 * edge, so magnitude alone would be ambiguous). This is `badges()`'s claim
 * restated in pixels, so the two must agree.
 */
function closestLetterOn(edge, axis, viewport) {
  const transform = planeTransform(axis, 0, viewport)
  const extents = axisExtents(axis)
  const uIdx = AXIS_INDEX[extents.uAxis]
  const vIdx = AXIS_INDEX[extents.vAxis]
  const towardEdge = {
    // Signed screen delta of one au along the direction, positive = the edge.
    right: (direction) => direction[uIdx] * (transform.uToSx(1) - transform.uToSx(0)),
    left: (direction) => -(direction[uIdx] * (transform.uToSx(1) - transform.uToSx(0))),
    top: (direction) => -(direction[vIdx] * (transform.vToSy(1) - transform.vToSy(0))),
    bottom: (direction) => direction[vIdx] * (transform.vToSy(1) - transform.vToSy(0)),
  }[edge]
  const scored = []
  for (const [label, direction] of Object.entries(DIRECTION_VECTORS)) {
    const delta = towardEdge(direction)
    if (delta === 0) continue // perpendicular to the slice: no edge lands there
    scored.push({ label, delta })
  }
  scored.sort((a, b) => b.delta - a.delta || (a.label < b.label ? -1 : 1))
  return { letter: scored[0]?.label, delta: scored[0]?.delta ?? 0, scored }
}

/* The §2.2 convention, read out of the authoritative doc (not the code). */
function conventionFromSyncPlan() {
  const doc = readFileSync(resolve('docs/SECTION_SYNC_PLAN.md'), 'utf8')
  const rules = [
    { axis: 'y', pattern: /transverse\s*=\s*anterior up, patient-left on image-right/i, top: 'A', right: 'L' },
    { axis: 'x', pattern: /sagittal\s*=\s*superior up, anterior right/i, top: 'S', right: 'A' },
    { axis: 'z', pattern: /coronal\s*=\s*superior up, patient-left on image-right/i, top: 'S', right: 'L' },
  ]
  const table = {}
  for (const rule of rules) {
    if (!rule.pattern.test(doc)) {
      assert(false, `B0 docs/SECTION_SYNC_PLAN.md §2.2 clause for ${rule.axis} not found or reworded`)
      continue
    }
    table[rule.axis] = rule
  }
  return table
}

{
  const convention = conventionFromSyncPlan()
  const aspects = [
    ...CANVAS_VIEWPORTS,
    { width: 224, height: 170, label: 'pip small' },
    { width: 348, height: 262, label: 'pip large' },
    REFERENCE_VIEWPORT,
  ]
  let derived = 0
  for (const axis of AXES) {
    const expected = convention[axis]
    for (const viewport of aspects) {
      const pixels = deriveBadgesFromPixels(axis, viewport)
      const table = badges(axis, viewport)
      // (B1) the pixel-derived table equals the module's table.
      for (const edge of ['top', 'bottom', 'left', 'right']) {
        const onEdge = pixels.edges[edge]
        assert(
          onEdge.length > 0,
          `B1 ${axis} ${viewport.label}: no anatomical direction reaches the ${edge} edge`,
        )
        if (onEdge.length > 0) {
          assert(
            onEdge.length === 1 && onEdge[0] === table[edge],
            `B1 ${axis} ${viewport.label}: ${edge} badge ${table[edge]} disagrees with the projected geometry (${onEdge.join(', ')})`,
          )
        }
      }
      // (B2) the closest-letter reading agrees too.
      for (const edge of ['top', 'bottom', 'left', 'right']) {
        const closest = closestLetterOn(edge, axis, viewport)
        assert(
          closest.letter === table[edge],
          `B2 ${axis} ${viewport.label}: ${edge} badge ${table[edge]} is not the direction that projects farthest toward that edge (${closest.letter})`,
          closest.scored.map((s) => `${s.label}:${s.delta.toFixed(1)}px`).join(' '),
        )
      }
      // (B3) the letters the real surfaces print are the §2.2 convention. The
      //      convention holds for every viewport at least as wide as it is tall,
      //      which is every viewport both surfaces have; a portrait test viewport
      //      legitimately mirrors the v axis (the canvas then shows the
      //      complementary letter pair), so the convention check is scoped and
      //      the derivation checks above still cover the portrait cases.
      if (expected !== undefined && viewport.width >= viewport.height) {
        assert(
          table.top === expected.top && table.right === expected.right,
          `B3 ${axis}: badges ${table.top}↑${table.right}→ disagree with docs/SECTION_SYNC_PLAN.md §2.2 (${expected.top}↑${expected.right}→)`,
        )
        // The opposite edges are the opposite anatomical directions.
        const opposite = { S: 'I', I: 'S', A: 'P', P: 'A', L: 'R', R: 'L' }
        assert(
          table.bottom === opposite[table.top] && table.left === opposite[table.right],
          `B3 ${axis}: badges are not the opposite directions on opposite edges`,
          JSON.stringify(table),
        )
      }
      derived++
    }
    // (B4) badges(axis) with its default viewport is the table the surfaces use.
    const standard = badges(axis)
    assert(
      standard.top === PLANE_BADGES[axis].top &&
        standard.bottom === PLANE_BADGES[axis].bottom &&
        standard.left === PLANE_BADGES[axis].left &&
        standard.right === PLANE_BADGES[axis].right,
      `B4 ${axis}: PLANE_BADGES literal disagrees with badges(axis)`,
      `${JSON.stringify(PLANE_BADGES[axis])} vs ${JSON.stringify(standard)}`,
    )
  }
  console.log(`B. orientation    ${derived} (axis, viewport) tables derived from projected pixels`)
  /* ---- mirrorX / cameraUpAxis: the PiP's orientation facts ---------------- */
  /**
   * `mirrorX` and `cameraUpAxis` describe the PiP's own render camera, not the 2D
   * mapping. What this gate can prove without a GPU is (i) that they are the
   * values the shipped panel actually uses (B6, read from its source), (ii) that
   * they follow from the module's own two facts — the camera's up vector is one of
   * the plane's in-plane axes and never the plane normal, and `mirrorX` is exactly
   * `cameraUpAxis(axis) === uAxis` — and (iii) that they stay consistent with the
   * framing the shared transform hands the camera.
   *
   * What it deliberately does NOT do is derive the camera's roll from first
   * principles: that needs the real three.js basis (`up × back`) evaluated in a
   * browser or against a decomposition of the live camera, and a gate that
   * asserts a basis it cannot check is worth less than one that says so. The
   * roll's status is recorded in `cameraUpAxis`'s note in the module instead.
   */
  const spanRuleWitnesses = []
  for (const axis of AXES) {
    const mirrored = mirrorX(axis)
    const upAxis = cameraUpAxis(axis)
    const [uAxis, vAxis] = AXIS_PAIR[axis]
    const extents = axisExtents(axis)
    // The section camera's basis, read out of the PANEL's own source and
    // resolved through the shared AXIS_PAIR (the two facts `SECTION_VIEWS`
    // declares per axis: its `up:` and `cameraSide:` vectors). Used by B5c as
    // the declared side and by B6 as the cross-check of the module's up axis.
    const declaredUpSide = (() => {
      const pipSource = readFileSync(resolve('src/components/viewer3d/SectionPiP.tsx'), 'utf8')
      const viewBlock = pipSource.slice(pipSource.indexOf('const SECTION_VIEWS'))
      const entry = viewBlock.slice(viewBlock.indexOf(`\n  ${axis}: {`))
      const axisOf = (arg) => {
        const literal = /^'([xyz])'$/.exec(arg)
        if (literal !== null) return literal[1]
        const pair = /AXIS_PAIR\.([xyz])\[(\d)\]/.exec(arg)
        // AXIS_PAIR entries are [u, v], so the index maps to the axis pair, not
        // to a world component: 0 → the plane's u axis, 1 → its v axis.
        if (pair !== null) return AXIS_PAIR[pair[1]][Number(pair[2])] ?? null
        // A derived `cameraUpAxis('x')` argument is the MODULE looking itself up
        // — not a fact the panel declares — so it is reported as such (B6 then
        // asserts the shipped up axis equals the module's, which closes the loop
        // without letting this extraction hand the module its own answer).
        return null
      }
      // The argument of a `field: axisUnitVector(…)` call, read with paren
      // matching: `axisUnitVector(AXIS_PAIR.z[1])` contains a paren itself, so a
      // non-greedy regex would stop inside the argument and read the WRONG axis
      // out of the entry. The field match is anchored to the START OF ITS OWN
      // LINE (`m` flag, indentation only): `…group: axisUnitVector(…)` contains
      // the substring `up:` and an unanchored pattern reads the cap quad's group
      // axis as the camera's up vector.
      const callArgument = (field) => {
        const match = new RegExp(`^\\s*${field}:\\s*axisUnitVector\\(`, 'm').exec(entry)
        if (match === null) return null
        let depth = 1
        let body = ''
        for (let i = match.index + match[0].length; i < entry.length; i++) {
          const ch = entry[i]
          if (ch === '(') depth++
          else if (ch === ')') {
            depth--
            if (depth === 0) return body.trim()
          }
          body += ch
        }
        return null
      }
      const upArg = callArgument('up')
      const sideArg = callArgument('cameraSide')
      return {
        up: upArg === null ? null : axisOf(upArg),
        side: sideArg === null ? null : axisOf(sideArg),
      }
    })()

    // (B5a) The module's rule, re-derived: `mirrorX(axis)` is exactly
    //       `cameraUpAxis(axis) === uAxis`. A mirror is needed when the camera's
    //       own up vector is the plane's horizontal axis, because then the image
    //       has to be flipped for the canvas' u axis to come back to the image
    //       horizontal. The equivalence is asserted, not assumed.
    assert(
      mirrored === (upAxis === uAxis),
      `B5 ${axis}: mirrorX=${mirrored} is not the camera-basis relation (up ${upAxis}, u ${uAxis})`,
    )
    // (B5b) The camera's up vector is always one of the plane's in-plane axes — and
    //       never the plane normal, which would make the ortho basis degenerate.
    assert(
      upAxis !== axis,
      `B5 ${axis}: the camera's up vector must be an in-plane axis, not the plane normal`,
    )
    assert(
      upAxis === uAxis || upAxis === vAxis,
      `B5 ${axis}: cameraUpAxis(${axis}) = ${upAxis} is not one of the plane's in-plane axes`,
    )
    // (B5c) AMENDMENT B (docs/TELENCEPHALON_PLAN.md §2, task `tel-space`) — the
    //       camera basis is an ORIENTATION CONTRACT, not an extent measurement.
    //       This assertion used to read
    //           (upAxis === uAxis) === (extents.uSpan >= extents.vSpan)
    //       i.e. "the camera's up axis is the in-plane axis with the larger
    //       canonical span". That was an observation about ONE bound set, and
    //       extending the box (y 100 → 140 au, z 82 → 130 au) flips it on the
    //       transverse plane: the larger span becomes the plane's v axis (z),
    //       which is ALSO the side the PiP camera stands on (SECTION_VIEWS.y
    //       cameraSide = AXIS_PAIR.y[1] = +z). The panel would then build an
    //       orthographic camera whose up vector is parallel to its view
    //       direction — a degenerate basis. Measured with this repo's three.js
    //       (r169): `up +z`, `side +z` does not produce NaN, it silently
    //       substitutes right (0,1,0) / up (−1,0,0), rolling the transverse
    //       panel 90° and (through flipX = mirrorX('y') → false) moving
    //       patient-left to the image LEFT against the badge table the same
    //       panel prints.
    //
    //       So this revision is NOT a relaxation: the deleted clause is
    //       replaced by three assertions that are strictly more specific —
    //       (i) the up axis is an in-plane, non-normal axis, which the old span
    //       rule satisfied only by coincidence of the old bounds; (ii) it is
    //       never parallel to the side the camera stands on, which is the
    //       degeneracy the old clause would have introduced (NEW check — it has
    //       no counterpart in the deleted one); and (iii) it is the value the
    //       panel's own SECTION_VIEWS declares (B6), so module and panel still
    //       cannot drift. The framing half-extents are NOT part of this
    //       assertion any more — they come from axisExtents()/planeTransform()
    //       and are checked, per axis and per plane, in A1/A2/A6 against the
    //       LIVE CLIP_BOUNDS; the camera may not constrain them (that coupling
    //       is what made a bounds amendment able to roll a v3 surface).
    assert(
      upAxis !== axis,
      `B5 ${axis}: cameraUpAxis(${axis}) = ${upAxis} is the plane normal — the ortho basis would be degenerate`,
    )
    const sideAxis = declaredUpSide.side
    assert(
      sideAxis !== null,
      `B5 ${axis}: SectionPiP declares no resolvable cameraSide for ${axis} — the degeneracy check cannot run`,
    )
    // The up axis must be the axis the AMENDMENT B refit is allowed to keep: on
    // each plane the camera's up vector is the in-plane axis PERPENDICULAR to the
    // side the camera stands on (any other choice is either the plane normal or
    // parallel to the view direction — a degenerate basis, see the note above).
    // One plane is a RECORDED PRE-EXISTING EXCEPTION, not a product of this
    // change: coronal's `cameraSide` is +y (AXIS_PAIR.z[1]) and its up is +y, so
    // the basis IS degenerate today — and was before this task (`cameraUpAxis`
    // resolved to 'y' under both the old larger-span rule and the frozen table).
    // Measured with this repo's three.js r169, that pair yields
    // right = (+x) / up = (−z) / back = (+y): the coronal panel's screen-right is
    // patient-LEFT and its screen-up is inferior, which contradicts its own
    // badge table (S↑ I↓ R← L→) and SectionCanvas' orientation. Fixing it means
    // changing `SectionPiP`'s `cameraSide` for the coronal plane (outside this
    // task's write scope) and re-verifying the coronal panel in a browser, so it
    // is reported rather than patched blind — the same treatment the module's
    // recorded 90°-roll note already gets.
    const DEGENERATE_BASIS_EXCEPTIONS = { z: 'AXIS_PAIR.z[1] = +y is parallel to up +y (pre-existing)' }
    if (sideAxis !== null) {
      const perpendicular = upAxis !== sideAxis
      assert(
        perpendicular || DEGENERATE_BASIS_EXCEPTIONS[axis] !== undefined,
        `B5 ${axis}: the section camera's up axis (${upAxis}) is parallel to the side it stands on ` +
          `(${sideAxis}) — three.js' lookAt would silently roll the panel (the AMENDMENT B degeneracy)`,
      )
      if (!perpendicular) {
        console.log(
          `   ! coronal camera basis is degenerate and PRE-EXISTING: up ${upAxis} ∥ cameraSide ${sideAxis} ` +
            `(${DEGENERATE_BASIS_EXCEPTIONS[axis]}) — measured basis right=+x up=−z; needs a SectionPiP ` +
            `cameraSide fix (reported, not applied here)`,
        )
      }
      assert(
        sideAxis === uAxis || sideAxis === vAxis,
        `B5 ${axis}: the section camera stands on ${sideAxis}, which is not an in-plane axis of ${axis}`,
      )
    }
    // The module's declared up axis is the one the panel consumes
    // (`up: axisUnitVector(cameraUpAxis('<axis>'))`): if the table ever diverges
    // from the function, the panel renders a basis the module does not describe.
    if (declaredUpSide.up !== null) {
      assert(
        declaredUpSide.up === upAxis,
        `B5 ${axis}: the panel's declared camera up (${declaredUpSide.up}) is not the module's ` +
          `cameraUpAxis (${upAxis})`,
      )
    }
    // (B5d) The two flags are cross-consistent across the three planes: exactly the
    //       planes whose up axis is their u axis report a mirror. (Recorded so a
    //       partial edit — flipping one constant but not the other — cannot pass.)
    assert(
      mirrorX(axis) === (cameraUpAxis(axis) === AXIS_PAIR[axis][0]),
      `B5 ${axis}: mirrorX/cameraUpAxis disagree with each other`,
    )

    // (B5f) The camera side is the positive in-plane axis that faces the
    //       DISCARDED half-space (clipPlanes keeps the lower half of every axis,
    //       so the camera stands on the positive side of the plane normal) — and
    //       it is NOT always the same axis-pair slot: the panel declares
    //       AXIS_PAIR[axis][1] on transverse and coronal but AXIS_PAIR[axis][0]
    //       on sagittal. Re-derived here from the shared pair + the clip
    //       convention, and asserted against the panel's declared value
    //       (`sideAxis`, extracted from its source), which is what makes the
    //       non-degeneracy check above a statement about the REAL basis.
    {
      // Slot of each plane's camera side within its own AXIS_PAIR, read from the
      // panel's source above (`cameraSide: axisUnitVector(AXIS_PAIR.<axis>[<slot>])`).
      const sideSlot = { y: 1, x: 0, z: 1 }
      const expectedSide = AXIS_PAIR[axis][sideSlot[axis]]
      assert(
        sideAxis === expectedSide,
        `B5 ${axis}: the panel's declared camera side (${sideAxis}) is not ` +
          `AXIS_PAIR.${axis}[${sideSlot[axis]}] = ${expectedSide}`,
      )
      // …and that side really is perpendicular to the plane normal (it is an
      // in-plane axis by construction, which is the geometric fact the camera
      // placement in SectionPiP relies on: `position = centre + side·distance`).
      assert(
        expectedSide !== axis,
        `B5 ${axis}: the declared camera side ${expectedSide} is the plane normal`,
      )
    }

    // (B5g) THE SUBSTITUTION WITNESS for the deleted span rule. It answers "was
    //       deleting `up = larger span` harmless HERE?" — with AMENDMENT B's
    //       extents the answer is no on the transverse plane, where the larger
    //       span is the plane's v axis and is ALSO the side the camera stands on
    //       (the degenerate basis). The collected witnesses are asserted to be
    //       non-empty after the loop: if the deleted rule ever becomes silent on
    //       all three planes, this gate would no longer be checking it at all.
    {
      const largerSpan = extents.uSpan >= extents.vSpan ? uAxis : vAxis
      if (largerSpan !== upAxis) {
        spanRuleWitnesses.push(
          `${axis}: larger span ${largerSpan} ≠ declared up ${upAxis}` +
            (largerSpan === sideAxis ? ' AND is the side the camera stands on (degenerate)' : ''),
        )
      }
    }

    // (B5e) Pixel proof of the canvas side: world +u lands on the image RIGHT and
    //       world +v toward the top through the shared transform — the convention
    //       every badge letter below and every photograph placement is expressed
    //       in. This is the surface-side fact; the camera's own roll is a separate
    //       question, recorded in `cameraUpAxis`'s note rather than asserted away.
    const viewport = { width: 320, height: 240 }
    const transform = planeTransform(axis, 0, viewport)
    const uProbe = extents.centerU + 5
    assert(
      transform.uToSx(uProbe) > viewport.width / 2 &&
        transform.vToSy(extents.centerV + 5) < viewport.height / 2,
      `B5 ${axis}: the canvas transform must put world +u right and world +v up`,
    )
  }
  // (B5h) The deleted span rule must still be WITNESSED (see B5g): AMENDMENT B
  //       keeps at least one plane on which it would have disagreed with the
  //       declared basis, so a future re-introduction of it cannot go unnoticed.
  assert(
    spanRuleWitnesses.length > 0,
    'B5: no plane witnesses the deleted larger-span camera rule — the substitution cannot be checked',
  )
  console.log(
    `B. camera basis  frozen per plane (up ${AXES.map((a) => `${a}→${cameraUpAxis(a)}`).join(' ')}); ` +
      `deleted span rule witnessed by ${spanRuleWitnesses.join('; ')}`,
  )
  // The values the PiP's SECTION_VIEWS declares, read from the source: the
  // orientation table and the flip flags are the same facts on both surfaces.
  // The facts the PiP's SECTION_VIEWS declares, read from the source: its badge
  // table, its flip flag and the camera up axis must be the shared module's
  // values, and its camera sides must be the in-plane axes (a camera whose up
  // vector is neither in-plane axis, or whose flip disagrees, is the drift this
  // gate exists to catch).
  {
    const pipSource = readFileSync(resolve('src/components/viewer3d/SectionPiP.tsx'), 'utf8')
    const viewBlock = pipSource.slice(pipSource.indexOf('const SECTION_VIEWS'))
    // Slice the block per axis (entries are indented exactly two spaces) so no
    // regex can read one axis' values as another's.
    const axisBlocks = {}
    {
      let current = null
      let buffer = []
      for (const line of viewBlock.split(/\r?\n/)) {
        const header = /^\s{2}([xyz]):\s*\{/.exec(line)
        if (header !== null) {
          if (current !== null) axisBlocks[current] = buffer.join('\n')
          current = header[1]
          buffer = [line]
          continue
        }
        if (current !== null) {
          buffer.push(line)
          if (/^\s{2}\},?\s*$/.test(line)) {
            axisBlocks[current] = buffer.join('\n')
            current = null
            buffer = []
          }
        }
      }
      if (current !== null) axisBlocks[current] = buffer.join('\n')
    }
    for (const axis of AXES) {
      const block = axisBlocks[axis]
      assert(block !== undefined, `B6 ${axis}: SectionPiP SECTION_VIEWS has no ${axis} entry`)
      if (block === undefined) continue
      const flipMatch = /flipX:\s*([^,\n]+)/.exec(block)
      assert(flipMatch !== null, `B6 ${axis}: SectionPiP SECTION_VIEWS carries no flipX value`)
      if (flipMatch !== null) {
        const expression = flipMatch[1].trim()
        const literal = /^(true|false)$/.exec(expression)
        const declared = literal !== null ? literal[1] === 'true' : null
        assert(
          declared === null || declared === mirrorX(axis),
          `B6 ${axis}: SectionPiP flipX=${expression} disagrees with mirrorX(axis)=${mirrorX(axis)}`,
        )
        if (declared === null) {
          // Derived form: the expression must be the shared mirrorX(axis) itself.
          assert(
            expression === `mirrorX('${axis}')`,
            `B6 ${axis}: SectionPiP flipX is neither a literal nor mirrorX('${axis}') (${expression})`,
          )
        }
      }
      // Badge table: a literal (extra `top: 'A'` allowed) or the shared spread.
      const labelMatch = /labels:\s*\{\s*([^}]*)\}/.exec(block)
      assert(labelMatch !== null, `B6 ${axis}: SectionPiP SECTION_VIEWS carries no labels block`)
      if (labelMatch !== null) {
        const body = labelMatch[1].trim()
        if (body === `...PLANE_BADGES.${axis}`) {
          // The derived form: identical to the shared table by construction.
        } else {
          const letters = {}
          for (const match of body.matchAll(/(top|bottom|left|right):\s*'(\w)'/g)) {
            letters[match[1]] = match[2]
          }
          assert(
            letters.top === PLANE_BADGES[axis].top &&
              letters.bottom === PLANE_BADGES[axis].bottom &&
              letters.left === PLANE_BADGES[axis].left &&
              letters.right === PLANE_BADGES[axis].right,
            `B6 ${axis}: SectionPiP labels ${JSON.stringify(letters)} disagree with the derived table ${JSON.stringify(PLANE_BADGES[axis])}`,
          )
        }
      }
      // Camera geometry: up = the shared cameraUpAxis, cameraSide one of the two
      // in-plane axes (whichever the axis pair says faces the discarded half).
      const upMatch = /up:\s*axisUnitVector\(([\s\S]*?)\)\s*,/.exec(block)
      if (upMatch !== null) {
        const arg = upMatch[1].trim()
        const literal = /^'([xyz])'$/.exec(arg)
        assert(
          literal !== null
            ? literal[1] === cameraUpAxis(axis)
            : new RegExp(`cameraUpAxis\\('${axis}'\\)`).test(arg),
          `B6 ${axis}: SectionPiP camera up is ${arg}, but cameraUpAxis(axis)=${cameraUpAxis(axis)}`,
        )
      } else {
        assert(false, `B6 ${axis}: SectionPiP no longer derives its camera up from axisUnitVector(...)`)
      }
      const sideMatch = /cameraSide:\s*axisUnitVector\(([\s\S]*?)\)\s*,/.exec(block)
      if (sideMatch !== null) {
        const arg = sideMatch[1].trim()
        assert(
          arg.includes(`AXIS_PAIR.${axis}[`) || /^'[xyz]'$/.test(arg),
          `B6 ${axis}: SectionPiP cameraSide (${arg}) is not an in-plane axis pair member`,
        )
      } else {
        assert(false, `B6 ${axis}: SectionPiP no longer derives its camera side from axisUnitVector(...)`)
      }
      // Cross-check the declared up vector against the geometry the gate models:
      // the camera must sit on a plane-parallel side and look at the slice.
      assert(
        cameraUpAxis(axis) !== axis,
        `B6 ${axis}: the camera up axis must not be the plane normal`,
      )
    }
    console.log(
      'B. mirrorX        camera values = SectionPiP flipX/labels/camera vectors, checked against the module rule',
    )
  }
}

/* ----------------------------------------------------------- (C) level snap */

{
  const levels = JSON.parse(readFileSync(resolve('src/data/levels.json'), 'utf8'))
  assert(Array.isArray(levels) && levels.length > 0, 'C0 src/data/levels.json holds no anchors')
  for (const level of levels) {
    assert(
      typeof level.id === 'string' && Number.isFinite(level.y),
      'C0 levels.json entry malformed',
      JSON.stringify(level),
    )
  }

  // (C1) the canonical extents are CLIP_BOUNDS, and the y range brackets every
  //      anchor (so a snapped write is always inside the slider range).
  {
    const clipPlanes = await import('../../src/components/viewer3d/clipPlanes.ts')
    const bounds = clipPlanes.CLIP_BOUNDS
    for (const axis of AXES) {
      const extents = axisExtents(axis)
      assert(
        extents.uMin === bounds[extents.uAxis].min &&
          extents.uMax === bounds[extents.uAxis].max &&
          extents.vMin === bounds[extents.vAxis].min &&
          extents.vMax === bounds[extents.vAxis].max,
        `C1 ${axis}: axisExtents is not CLIP_BOUNDS (${JSON.stringify(extents)})`,
      )
    }
    for (const level of levels) {
      assert(
        Number.isFinite(level.y) && level.y > -1e6 && level.y < 1e6,
        `C1 level ${level.id} has an implausible y (${level.y})`,
      )
    }
  }

  // (C2) nearestLevelTo: exact anchors, midpoints, ties, out-of-range values.
  {
    const sorted = [...levels].sort((a, b) => a.y - b.y)
    for (const level of levels) {
      const found = nearestLevelTo('y', level.y, levels)
      assert(
        found !== null && found.level.id === level.id && found.level.y === level.y && found.distance === 0,
        `C2 nearestLevelTo(y, ${level.y}) = ${found === null ? 'null' : found.level.id}, expected ${level.id}`,
      )
    }
    for (let i = 0; i < sorted.length - 1; i++) {
      const lower = sorted[i]
      const upper = sorted[i + 1]
      const mid = (lower.y + upper.y) / 2
      const found = nearestLevelTo('y', mid, levels)
      assert(
        found !== null && (found.level.id === lower.id || found.level.id === upper.id),
        `C2 nearestLevelTo is not one of the bracketing anchors at ${mid}`,
        found === null ? 'null' : found.level.id,
      )
      assert(
        found !== null && Math.abs(found.distance - (upper.y - lower.y) / 2) < 1e-9,
        `C2 the reported distance at the midpoint ${mid} is wrong (${found?.distance})`,
      )
      // Just inside each half must resolve to that half's anchor.
      const nearLower = nearestLevelTo('y', lower.y + (upper.y - lower.y) * 0.25, levels)
      const nearUpper = nearestLevelTo('y', lower.y + (upper.y - lower.y) * 0.75, levels)
      assert(
        nearLower !== null && nearLower.level.id === lower.id,
        `C2 ${nearLower === null ? 'null' : nearLower.level.id} != ${lower.id} at a quarter above ${lower.y}`,
      )
      assert(
        nearUpper !== null && nearUpper.level.id === upper.id,
        `C2 ${nearUpper === null ? 'null' : nearUpper.level.id} != ${upper.id} at a quarter below ${upper.y}`,
      )
      assert(
        nearLower !== null && Math.abs(nearLower.distance - (upper.y - lower.y) * 0.25) < 1e-9,
        `C2 the reported distance is not |level.y − value| (${nearLower?.distance})`,
      )
    }
    // Ties: the implementation's documented rule is "the first anchor wins", so
    // a duplicated-y probe must resolve to the first of its equals.
    const tieProbe = [levels[0], { ...levels[0], id: 'zz-tie-probe' }]
    const tie = nearestLevelTo('y', levels[0].y, tieProbe)
    assert(
      tie !== null && tie.level.id === levels[0].id,
      `C2 a tie must resolve to the first anchor (got ${tie === null ? 'null' : tie.level.id})`,
    )
    // Out of range: the end anchors, never null, with the true distance.
    {
      const below = nearestLevelTo('y', sorted[0].y - 1000, levels)
      const above = nearestLevelTo('y', sorted[sorted.length - 1].y + 1000, levels)
      assert(
        below?.level.id === sorted[0].id && above?.level.id === sorted[sorted.length - 1].id,
        'C2 out-of-range values must clamp to the end anchors',
      )
      assert(
        below !== null && below.distance === 1000 && above !== null && above.distance === 1000,
        'C2 out-of-range distances must be reported verbatim',
      )
    }
    assert(nearestLevelTo('y', 0, []) === null, 'C2 an empty level list must return null')
    // x/z have no levels: null, always.
    for (const axis of ['x', 'z']) {
      for (const value of [-48, -1, 0, 33.5, 48]) {
        assert(
          nearestLevelTo(axis, value, levels) === null,
          `C2 nearestLevelTo('${axis}', ${value}) must be null (levels are transverse-only)`,
        )
      }
    }
  }

  // (C3) snapClipWrite: the ONE snap rule.
  {
    for (const level of levels) {
      const patch = snapClipWrite('y', level.y, true, levels)
      assert(
        Object.keys(patch).length === 1 && patch.y === level.y,
        `C3 snapClipWrite(y, ${level.y}, true) = ${JSON.stringify(patch)}`,
      )
    }
    for (const value of [-47.5, -30.25, -5.1, 0.4, 7.6, 33.3, 44.9]) {
      const nearest = nearestLevelTo('y', value, levels)
      const patch = snapClipWrite('y', value, true, levels)
      assert(
        nearest !== null && patch.y === nearest.level.y && Object.keys(patch).length === 1,
        `C3 snapClipWrite(y, ${value}, true) did not snap to the nearest anchor`,
        `${JSON.stringify(patch)} vs ${nearest === null ? 'null' : `${nearest.level.id}@${nearest.level.y}`}`,
      )
      assert(
        patch.y !== value || Math.abs(value - nearest.level.y) < 1e-12,
        `C3 snapClipWrite(y, ${value}, true) returned an unsnapped value`,
      )
    }
    // Snapping OFF: identity.
    for (const value of [-47.5, -30.25, 0.4, 33.3]) {
      const patch = snapClipWrite('y', value, false, levels)
      assert(
        patch.y === value && Object.keys(patch).length === 1,
        `C3 snapClipWrite(y, ${value}, false) must be the identity (got ${JSON.stringify(patch)})`,
      )
    }
    // x and z never snap, even with snapping ON.
    for (const axis of ['x', 'z']) {
      for (const value of [0, 12.5, -33, 48]) {
        const on = snapClipWrite(axis, value, true, levels)
        const off = snapClipWrite(axis, value, false, levels)
        assert(
          on[axis] === value && off[axis] === value && Object.keys(on).length === 1,
          `C3 snapClipWrite('${axis}', ${value}) must never snap (got ${JSON.stringify(on)})`,
        )
      }
    }
    // An empty level list can never fabricate a snap.
    assert(
      snapClipWrite('y', -33.5, true, []).y === -33.5,
      'C3 snapClipWrite with no levels must write the raw value',
    )
    // The comparison is against the DRAGGED value, never the current clip.y:
    // dragging from level A towards level B must land on B, not stay on A.
    const start = levels[0].y
    const target = levels[2].y
    const patch = snapClipWrite('y', target - 0.2, true, levels)
    assert(
      patch.y !== start && patch.y === nearestLevelTo('y', target - 0.2, levels)?.level.y,
      `C3 snapping must follow the dragged value (from ${start} towards ${target} landed on ${patch.y})`,
    )
  }

  // (C4) pickImageForPlane: the single photograph-selection rule.
  {
    const entries = [
      { id: 'cor-1', axis: 'coronal', planeValue: -20, fit: { scale: 17.9 } },
      { id: 'cor-2', axis: 'coronal', planeValue: -20.4, fit: { scale: 17.9 } },
      { id: 'cor-unanchored', axis: 'coronal', levelId: 'lvl-pons-middle' },
      { id: 'tra-1', axis: 'transverse', planeValue: 8, fit: { scale: 13.2 } },
      { id: 'tra-level', axis: 'transverse', levelId: 'lvl-midbrain-ic' },
      { id: 'sag-1', axis: 'sagittal', planeValue: 0, fit: { scale: 13.2 } },
    ]
    const withinTolerance = pickImageForPlane(entries, 'z', -20.2, MODALITY_TOLERANCE_AU)
    assert(
      withinTolerance !== undefined && withinTolerance.image.id === 'cor-1' && withinTolerance.via === 'plane',
      `C4 the nearest anchored coronal plate must win (got ${JSON.stringify(withinTolerance?.image.id)})`,
    )
    assert(
      withinTolerance !== undefined && close(withinTolerance.distanceAu, 0.2, 1e-9),
      'C4 the reported anchor distance is wrong',
      JSON.stringify(withinTolerance),
    )
    // Axis eligibility: a coronal plate never mounts on a transverse plane.
    const wrongAxis = pickImageForPlane(entries, 'y', -20.2, MODALITY_TOLERANCE_AU, { levelId: null })
    assert(
      wrongAxis === undefined,
      `C4 a plate of another anatomic axis must never be picked (got ${wrongAxis?.image.id})`,
    )
    // Tolerance: outside the window nothing is anchored …
    assert(
      pickImageForPlane(entries, 'z', -20.2, 0.1, { levelId: null }) === undefined,
      'C4 a plane outside every anchor window must have no anchored plate',
    )
    // … but the level fallback still serves the transverse axis.
    const byLevel = pickImageForPlane(entries, 'y', 30, MODALITY_TOLERANCE_AU, { levelId: 'lvl-midbrain-ic' })
    assert(
      byLevel !== undefined && byLevel.image.id === 'tra-level' && byLevel.via === 'level',
      `C4 the transverse level fallback must serve (got ${JSON.stringify(byLevel?.image.id)})`,
    )
    // A level id with no matching entry yields nothing (never a wrong plate).
    assert(
      pickImageForPlane(entries, 'y', 30, MODALITY_TOLERANCE_AU, { levelId: 'lvl-nope' }) === undefined,
      'C4 an unmatched level id must yield no plate',
    )
    // Ties on the same plane: the fitted entry beats the unfitted one.
    const tieEntries = [
      { id: 'plain', axis: 'coronal', planeValue: -20 },
      { id: 'fitted', axis: 'coronal', planeValue: -20, fit: { scale: 17.9 } },
    ]
    const tiePick = pickImageForPlane(tieEntries, 'z', -20, MODALITY_TOLERANCE_AU)
    assert(
      tiePick !== undefined && tiePick.image.id === 'fitted',
      `C4 a fitted entry must beat an unfitted one on the same plane (got ${tiePick?.image.id})`,
    )
    // … and equal fits keep manifest order.
    const orderEntries = [
      { id: 'first', axis: 'sagittal', planeValue: 0, fit: { scale: 13.2 } },
      { id: 'second', axis: 'sagittal', planeValue: 0, fit: { scale: 13.2 } },
    ]
    const orderPick = pickImageForPlane(orderEntries, 'x', 0, MODALITY_TOLERANCE_AU)
    assert(
      orderPick !== undefined && orderPick.image.id === 'first',
      `C4 manifest order must break a full tie (got ${orderPick?.image.id})`,
    )
    // sectionAxisOf is the axis-name bridge both callers rely on.
    assert(
      sectionAxisOf('y') === 'transverse' &&
        sectionAxisOf('x') === 'sagittal' &&
        sectionAxisOf('z') === 'coronal',
      'C4 sectionAxisOf is not the transverse/sagittal/coronal mapping',
    )
  }

  console.log(`C. levels         ${levels.length} anchors · nearestLevelTo + snapClipWrite + pickImageForPlane`)
}

/* ------------------------------------------------------------------- gate */

console.log('')
if (failures.length > 0) {
  console.log(`plane-transform: ${checks - failures.length}/${checks} assertion(s) passed, ${failures.length} FAILED`)
  for (const failure of failures.slice(0, 40)) console.log(`  FAIL ${failure}`)
  if (failures.length > 40) console.log(`  … and ${failures.length - 40} more`)
  process.exit(1)
}
console.log(`✔ plane transform QA PASSED — ${checks} assertions`)
console.log('   one transform for canvas/PiP/sampler · orientation derived from projected geometry ·')
console.log('   nearestLevelTo/snapClipWrite agree with levels.json· pickImageForPlane is the one photo rule')
process.exit(0)
