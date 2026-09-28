/**
 * v20 gate — GEOMETRY: the procedural spinal cord matches its cited numbers,
 * its teaching points, and the clip contract.
 *
 * Run from the repo root:  node scripts/verify/spinal-geometry.mjs
 * (npm script line this task asks the integrator for:
 *   "verify:spinal-geometry": "node scripts/verify/spinal-geometry.mjs"
 *  — package.json is the integrator's file, so it is named here, not edited.)
 *
 * ── WHAT THIS GATE PROVES, AND HOW ────────────────────────────────────────
 * It EXECUTES the shipped modules (never a re-typed copy): the same
 * node:module `registerHooks` loader `vessel-render.mjs` uses resolves the
 * app's extensionless imports, emulates Vite's `import.meta.glob`, transpiles
 * `.ts`/`.tsx` with the PROJECT'S OWN TypeScript and answers asset specifiers.
 * Every number below is printed, so no assertion can pass by not running.
 *
 *   1. THE SEGMENT TABLE IS THE PLATFORM'S. All 31 anchors (C1…Co1) are
 *      compared one by one against the VERBATIM level ids in
 *      `src/data/levels.json` (lvl-c1…lvl-co1), exact y equality.
 *   2. THE CITED CROSS-SECTIONS. StatPearls NBK545206: transverse diameter
 *      13.3 mm at C5, 8.3 mm at T8, 9.4 mm at L3; anteroposterior ≈ 0.85 ×
 *      transverse. Asserted twice: the shipped profile table, AND the built
 *      cord-surface mesh measured with the shipped `measureCrossSection`
 *      (1 au = 1.2 mm).
 *   3. ENLARGEMENTS + CONUS. Cervical peak at C5, thoracic minimum at T8,
 *      lumbar peak at L3, monotone caudal taper to ≈ 0 at the conus tip;
 *      filum tip exactly on the clip floor.
 *   4. THE GRAY H READS AT EVERY LEVEL. Horn orientation scans (dorsal horn
 *      all −z, ventral all +z, commissure central, patient-left x ≥ 0) at
 *      C5/T8/L3/S3; the LATERAL HORN is present at T8 and ABSENT at C5, L3,
 *      S3 (T1–L2 only); named columns sit at their textbook extents
 *      (Clarke C8–L3, IML T1–L2, sacral parasympathetic S2–S4).
 *   5. THE FUNICULI TEACHING POINTS. Gracilis is a medial stripe
 *      (|x| ≤ 0.2 rx), cuneatus is lateral (|x| ≥ 0.15 rx) and EXISTS ONLY
 *      T6-AND-ABOVE (no vertex below T6 − 4), while gracilis spans to the
 *      conus.
 *   6. CLIP + CONTINUITY. Every part (+ mirror twin) stays inside the
 *      contract box x[−58, 58] × y[−390, 116] × z[−76, 72]; the cord top
 *      overlaps the procedural medulla envelope at y = −50 (no gap at the
 *      cervicomedullary junction).
 *   7. THE PART TABLE + ID MAPPING. Every part builds non-empty geometry;
 *      alias-tolerant record mapping hits every real spinal id and — with
 *      teeth — NEVER swallows the look-alike brainstem/telencephalon ids
 *      (tract-fasciculus-gracilis, nuc-nucleus-cuneatus, nuc-caudate-head,
 *      tract-posterior-commissure, nuc-dorsal-root-ganglion …).
 *
 * ── WHAT ONLY THE ORCHESTRATOR CAN CONFIRM (Chrome cannot run in this
 *    sandbox — no claim below is made by this gate) ────────────────────────
 *   • that the scene actually PAINTS the cord, the H and the funiculi;
 *   • that clicking a funiculus/nucleus/segment body selects its record and
 *     that the highlight reads on screen;
 *   • the frame-time cost of ~73 procedural meshes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire, registerHooks } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require_ = createRequire(import.meta.url)
const ts = require_('typescript')
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..')

/* ==================================================================== *
 *  MODULE LOADING — the repo's convention (see the file header)
 * ==================================================================== */

function resolveModule(specifier, fromFile) {
  const directory = dirname(fromFile)
  for (const extension of ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx']) {
    const candidate = resolve(directory, specifier + extension)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

class Path2DStub {
  moveTo() {}
  lineTo() {}
  closePath() {}
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(specifier) || specifier.endsWith('?url')) {
      return { url: `dsh-asset:${specifier}`, shortCircuit: true }
    }
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      const base = context.parentURL === undefined ? ROOT : fileURLToPath(context.parentURL)
      const candidate = resolveModule(specifier, base)
      if (candidate !== null) return { url: pathToFileURL(candidate).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('dsh-asset:')) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (!url.startsWith('file:')) return nextLoad(url, context)
    if (url.endsWith('.json')) {
      const parsed = JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
      return { format: 'module', source: `export default ${JSON.stringify(parsed)}`, shortCircuit: true }
    }
    if (/\.(bin|glb|css|png|jpg|svg)(\?|$)/i.test(url)) {
      return { format: 'module', source: 'export default "/src/assets/asset-url"', shortCircuit: true }
    }
    if (!/\.(ts|tsx)$/.test(url)) return nextLoad(url, context)
    const filePath = fileURLToPath(url)
    let source = readFileSync(filePath, 'utf8')
    source = source.replace(
      /import\.meta\.glob\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\}\s*,?\s*\)/g,
      (whole, pattern, options) => {
        const directory = resolve(filePath, '..')
        const lastSlash = pattern.lastIndexOf('/')
        const head = pattern.slice(0, lastSlash)
        const recursive = head.includes('**')
        const baseDir = resolve(directory, head.replace(/\*\*\/?/g, ''))
        const filePattern = pattern.slice(lastSlash + 1)
        if (!existsSync(baseDir)) return '{}'
        const test = new RegExp(`^${filePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
        const raw = /\?raw/.test(options)
        const wantedExtension = (filePattern.match(/\*(\.[A-Za-z0-9]+)$/) ?? [])[1]?.toLowerCase() ?? null
        const walk = (dir, prefix) => {
          const out = []
          for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
            if (entry.isDirectory()) {
              if (recursive) out.push(...walk(resolve(dir, entry.name), relative))
              continue
            }
            if (wantedExtension !== null && !entry.name.toLowerCase().endsWith(wantedExtension)) continue
            if (!test.test(entry.name)) continue
            out.push(relative)
          }
          return out
        }
        const entries = walk(baseDir, '').map((relative) => {
          const full = resolve(baseDir, relative)
          const key = `${head.replace(/\*\*\/?/g, '')}${relative}`
          if (!raw && !/eager:\s*true/.test(options)) {
            return `${JSON.stringify(key)}: () => Promise.resolve(${JSON.stringify(relative)})`
          }
          const value = raw ? readFileSync(full, 'utf8') : JSON.parse(readFileSync(full, 'utf8'))
          return `${JSON.stringify(key)}: ${JSON.stringify(value)}`
        })
        return `{ ${entries.join(', ')} }`
      },
    )
    const { outputText } = ts.transpileModule(source, {
      fileName: url,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        isolatedModules: true,
      },
    })
    return { format: 'module', source: outputText, shortCircuit: true }
  },
})

globalThis.Path2D = Path2DStub

/* ==================================================================== *
 *  assertions
 * ==================================================================== */

let checks = 0
const failures = []

function assert(condition, label, detail = '') {
  checks += 1
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

function ms(label, value, extra = '') {
  console.log(`  ${String(label).padEnd(58)} ${String(value).padStart(10)}  ${extra}`)
}

/** au → mm at the project's 1 au = 1.2 mm. */
const mm = (au) => au * 1.2

/* ==================================================================== *
 *  SHIPPED MODULES
 * ==================================================================== */

const moduleUrl = (rel) => pathToFileURL(resolve(ROOT, rel)).href
const cord = await import(moduleUrl('src/geometry/spinalCord.ts'))
const parts = await import(moduleUrl('src/geometry/spinalParts.ts'))
const envelope = await import(moduleUrl('src/geometry/envelope.ts'))

const {
  AU_TO_MM, AP_RATIO, SPINAL_SEGMENTS, CORD_TOP_Y, CORD_TIP_Y, FILUM_TIP_Y,
  T1_Y, T6_Y, L2_Y, C8_Y, L3_Y, S2_Y, S4_Y,
  zoneAt, transverseDiameterMm, cordRadiiAt, cordCenterAt,
  buildCordSurface, buildCentralCanal, buildFilum,
  buildDorsalHorn, buildVentralHorn, buildCommissureHalf, buildLateralHorn,
  buildGracilis, buildCuneatus, buildLateralFuniculus, buildAnteriorFuniculus,
  buildNamedGrayColumn, buildSegmentBand, buildConusCore, buildRootStub, buildCaudaEquina,
  measureCrossSection,
} = cord

const { SPINAL_PARTS, spinalGeometry, spinalRegistrySlugs, spinalRecordPart, segmentFromRecordId } = parts

/** Local vertex scan — independent of any helper the geometry may change. */
function scanBounds(geometry) {
  const pos = geometry.attributes.position.array
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < pos.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const v = pos[i + c]
      if (v < min[c]) min[c] = v
      if (v > max[c]) max[c] = v
    }
  }
  return { min, max, count: pos.length / 3 }
}

/** Vertices within ±halfWindow of world y: per-axis min/max + count. */
function windowScan(geometry, y, halfWindow = 1.6) {
  const pos = geometry.attributes.position.array
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let count = 0
  for (let i = 0; i < pos.length; i += 3) {
    if (Math.abs(pos[i + 1] - y) > halfWindow) continue
    count += 1
    for (let c = 0; c < 3; c++) {
      const v = pos[i + c]
      if (v < min[c]) min[c] = v
      if (v > max[c]) max[c] = v
    }
  }
  return { min, max, count }
}

/* ==================================================================== *
 *  0. CONTRACT CONSTANTS + CLIP BOUNDS
 * ==================================================================== */

console.log('\n── 0. units, contract box, clip state ─────────────────────────────')
assert(AU_TO_MM === 1.2, '1 au = 1.2 mm (canonical)', `got ${AU_TO_MM}`)
ms('AP_RATIO (cited 0.85)', AP_RATIO)

const clipSrc = readFileSync(resolve(ROOT, 'src/components/viewer3d/clipPlanes.ts'), 'utf8')
const clip = {}
for (const axis of ['x', 'y', 'z']) {
  const m = clipSrc.match(new RegExp(`${axis}:\\s*\\{\\s*min:\\s*(-?[\\d.]+),\\s*max:\\s*(-?[\\d.]+)`))
  clip[axis] = m ? { min: Number(m[1]), max: Number(m[2]) } : null
}
ms('CLIP_BOUNDS.x', JSON.stringify(clip.x))
ms('CLIP_BOUNDS.y', JSON.stringify(clip.y))
ms('CLIP_BOUNDS.z', JSON.stringify(clip.z))
assert(clip.x && clip.y && clip.z, 'CLIP_BOUNDS scraped from clipPlanes.ts')
// The hard contract the geometry is authored against (brief). The runtime clip
// may lag; the note below reports its state instead of silently trusting it.
const CONTRACT = { x: [-58, 58], y: [-390, 116], z: [-76, 72] }
ms('contract box', 'x[−58,58] y[−390,116] z[−76,72]')
assert(
  clip.y !== null && clip.y.min <= CORD_TIP_Y,
  'runtime clip floor reaches the conus (y.min ≤ −383)',
  `CLIP_BOUNDS.y.min = ${clip.y?.min}`,
)
assert(FILUM_TIP_Y >= CONTRACT.y[0], 'filum tip inside contract floor', `FILUM_TIP_Y = ${FILUM_TIP_Y}`)

/* ==================================================================== *
 *  1. SEGMENT TABLE ↔ PLATFORM LEVELS (verbatim lvl-c1…lvl-co1)
 * ==================================================================== */

console.log('\n── 1. 31 segment anchors vs src/data/levels.json ──────────────────')
const levels = JSON.parse(readFileSync(resolve(ROOT, 'src/data/levels.json'), 'utf8'))
const levelById = new Map(levels.map((row) => [row.id, row]))
assert(SPINAL_SEGMENTS.length === 31, 'SPINAL_SEGMENTS has exactly 31 rows', `got ${SPINAL_SEGMENTS.length}`)
let levelMismatches = 0
for (const seg of SPINAL_SEGMENTS) {
  const levelId = `lvl-${seg.id.toLowerCase()}`
  const row = levelById.get(levelId)
  if (row === undefined || row.y !== seg.y) {
    levelMismatches += 1
    failures.push(`anchor ${seg.id}: levels.json ${levelId} = ${row?.y ?? 'MISSING'}, geometry = ${seg.y}`)
    console.log(`  FAIL anchor ${seg.id} — ${levelId} y=${row?.y ?? 'MISSING'} vs geometry y=${seg.y}`)
    continue
  }
  console.log(`  ok   ${levelId.padEnd(12)} y = ${String(seg.y).padStart(5)}  (${zoneAt(seg.y)})`)
}
checks += 31
assert(levelMismatches === 0, 'every anchor equals its platform level y', `${levelMismatches} mismatch(es)`)
const monotone = SPINAL_SEGMENTS.every((s, i) => i === 0 || s.y < SPINAL_SEGMENTS[i - 1].y)
assert(monotone, 'anchors strictly rostral→caudal (y descending)')
assert(CORD_TOP_Y === -50 && CORD_TIP_Y === -383, 'cord spans y −50 … −383', `${CORD_TOP_Y} … ${CORD_TIP_Y}`)
ms('block boundaries (zoneAt)', `${zoneAt(-159.89 + 0.01)}|${zoneAt(-159.89 - 0.01)} … ${zoneAt(-303.08 + 0.01)}|${zoneAt(-303.08 - 0.01)} … ${zoneAt(-346.37 + 0.01)}|${zoneAt(-346.37 - 0.01)}`)
assert(zoneAt(-159.89 + 0.01) === 'cervical' && zoneAt(-159.89 - 0.01) === 'thoracic', 'C/T boundary at −159.89')
assert(zoneAt(-303.08 + 0.01) === 'thoracic' && zoneAt(-303.08 - 0.01) === 'lumbar', 'T/L boundary at −303.08')
assert(zoneAt(-346.37 + 0.01) === 'lumbar' && zoneAt(-346.37 - 0.01) === 'sacral', 'L/S boundary at −346.37')
assert(T1_Y === -166 && T6_Y === -226 && L2_Y === -316 && L3_Y === -325, 'derived constants follow the anchors')

/* ==================================================================== *
 *  2. CITED CROSS-SECTIONS (StatPearls NBK545206)
 * ==================================================================== */

console.log('\n── 2. cited diameters — profile table AND built mesh ──────────────')
const ANCHORS = [
  { id: 'C5', y: -112, transverseMm: 13.3 },
  { id: 'T8', y: -249, transverseMm: 8.3 },
  { id: 'L3', y: -325, transverseMm: 9.4 },
]
const surface = buildCordSurface()
for (const a of ANCHORS) {
  const tableMm = transverseDiameterMm(a.y)
  const radii = cordRadiiAt(a.y)
  ms(`${a.id} transverse (table)`, `${tableMm.toFixed(3)} mm`, `cited ${a.transverseMm} mm`)
  assert(Math.abs(tableMm - a.transverseMm) <= 0.02, `${a.id}: table = cited ${a.transverseMm} mm`, `got ${tableMm}`)
  assert(Math.abs(radii.rz / radii.rx - AP_RATIO) <= 0.01, `${a.id}: AP = 0.85 × transverse (radii)`, `rz/rx = ${(radii.rz / radii.rx).toFixed(4)}`)
  const measured = measureCrossSection(surface, a.y, 1.6)
  ms(`${a.id} transverse (mesh)`, measured ? `${measured.widthMm.toFixed(3)} mm` : 'NULL', measured ? `${measured.vertexCount} verts` : '')
  assert(measured !== null, `${a.id}: cord-surface mesh has rings near y = ${a.y}`)
  if (measured !== null) {
    assert(Math.abs(measured.widthMm - a.transverseMm) <= 0.5, `${a.id}: mesh width = cited ${a.transverseMm} mm ± 0.5`, `got ${measured.widthMm.toFixed(3)}`)
    assert(Math.abs(measured.depthMm - AP_RATIO * a.transverseMm) <= 0.6, `${a.id}: mesh depth = 0.85 × transverse ± 0.6`, `got ${measured.depthMm.toFixed(3)}`)
  }
}

/* ==================================================================== *
 *  3. ENLARGEMENTS + CONUS TAPER
 * ==================================================================== */

console.log('\n── 3. enlargements, conus taper, filum ────────────────────────────')
const dC4 = transverseDiameterMm(-98)
const dC5 = transverseDiameterMm(-112)
const dC6 = transverseDiameterMm(-126)
const dT4 = transverseDiameterMm(-202)
const dT8 = transverseDiameterMm(-249)
const dT12 = transverseDiameterMm(-297)
const dL2 = transverseDiameterMm(-316)
const dL3 = transverseDiameterMm(-325)
const dL5 = transverseDiameterMm(-342)
ms('C4 / C5 / C6 (mm)', `${dC4.toFixed(1)} / ${dC5.toFixed(1)} / ${dC6.toFixed(1)}`, 'cervical enlargement')
ms('T4 / T8 / T12 (mm)', `${dT4.toFixed(1)} / ${dT8.toFixed(1)} / ${dT12.toFixed(1)}`, 'thoracic minimum')
ms('L2 / L3 / L5 (mm)', `${dL2.toFixed(1)} / ${dL3.toFixed(1)} / ${dL5.toFixed(1)}`, 'lumbar enlargement')
assert(dC5 > dC4 && dC5 >= dC6, 'cervical enlargement peaks at C5 (C5–T1)')
assert(dT8 <= dT4 && dT8 <= dT12, 'thoracic cord thinnest at/near T8')
assert(dL3 > dL2 && dL3 > dL5, 'lumbar enlargement peaks at L3 (L2–S3)')
const taper = [-360, -365, -370, -375, -380, -383].map((y) => transverseDiameterMm(y))
ms('taper S3→tip (mm)', taper.map((v) => v.toFixed(2)).join(' → '))
assert(taper.every((v, i) => i === 0 || v <= taper[i - 1]), 'profile non-increasing below S3')
const tipMeasure = measureCrossSection(surface, CORD_TIP_Y, 1.5)
ms('conus tip width (mesh)', tipMeasure ? `${tipMeasure.widthMm.toFixed(3)} mm` : 'NULL')
assert(tipMeasure !== null && tipMeasure.widthMm < 1.0, 'conus tip ≈ 0 (< 1 mm wide)')
const conus = buildConusCore()
const conusB = scanBounds(conus)
assert(conusB.min[1] <= CORD_TIP_Y + 0.1 && conusB.max[1] >= L3_Y, 'conus core spans L3→tip', `y ${conusB.min[1].toFixed(1)} … ${conusB.max[1].toFixed(1)}`)
const filum = buildFilum()
const filumB = scanBounds(filum)
ms('filum y span', `${filumB.min[1].toFixed(2)} … ${filumB.max[1].toFixed(2)}`)
assert(filumB.min[1] >= FILUM_TIP_Y - 0.05 && filumB.max[1] <= CORD_TIP_Y + 1, 'filum runs conus tip → clip floor')
const filumM = measureCrossSection(filum, -386, 2)
ms('filum diameter', filumM ? `${filumM.widthMm.toFixed(2)} mm` : 'NULL')
assert(filumM !== null && filumM.widthMm < 1.5, 'filum is a thin thread (< 1.5 mm)')

/* ==================================================================== *
 *  4. GRAY H-SHAPE
 * ==================================================================== */

console.log('\n── 4. the gray H at C5 / T8 / L3 / S3 ────────────────────────────')
const dorsal = buildDorsalHorn()
const ventral = buildVentralHorn()
const commissure = buildCommissureHalf()
const lateralHorn = buildLateralHorn()
for (const y of [-112, -249, -325, -360]) {
  const rz = cordRadiiAt(y).rz
  // Orientation is LOCAL to the cord centre — the gentle neuraxis curvature
  // (cordCenterAt) shifts world z by up to ~1.6 au, which is not anatomy.
  const cz = cordCenterAt(y).z
  const d = windowScan(dorsal, y)
  const v = windowScan(ventral, y)
  const c = windowScan(commissure, y)
  assert(d.count > 0, `y=${y}: dorsal horn present`, `${d.count} verts`)
  assert(v.count > 0, `y=${y}: ventral horn present`, `${v.count} verts`)
  assert(c.count > 0, `y=${y}: gray commissure present`, `${c.count} verts`)
  if (d.count > 0) {
    assert(d.max[2] - cz < 0 && d.min[0] >= -0.05, `y=${y}: dorsal horn dorsal (z<0) + patient-left (x≥0)`, `local z ${(d.min[2] - cz).toFixed(2)}…${(d.max[2] - cz).toFixed(2)} x ${d.min[0].toFixed(2)}`)
  }
  if (v.count > 0) {
    assert(v.min[2] - cz > 0 && v.min[0] >= -0.05, `y=${y}: ventral horn ventral (z>0) + patient-left`, `local z ${(v.min[2] - cz).toFixed(2)}…${(v.max[2] - cz).toFixed(2)}`)
  }
  if (c.count > 0) {
    assert(Math.abs(c.min[2] - cz) <= 0.3 * rz && Math.abs(c.max[2] - cz) <= 0.3 * rz, `y=${y}: commissure central (|z| ≤ 0.3 rz)`, `local z ${(c.min[2] - cz).toFixed(2)}…${(c.max[2] - cz).toFixed(2)} rz=${rz.toFixed(2)}`)
  }
}
// Lateral horn: T1–L2 ONLY (teaching point — the Horner localisation).
const lhT8 = windowScan(lateralHorn, -249, 2)
const lhC5 = windowScan(lateralHorn, -112, 2)
const lhL3 = windowScan(lateralHorn, -325, 2)
const lhS3 = windowScan(lateralHorn, -360, 2)
ms('lateral horn verts @ T8 / C5 / L3 / S3', `${lhT8.count} / ${lhC5.count} / ${lhL3.count} / ${lhS3.count}`)
assert(lhT8.count > 0, 'lateral horn PRESENT at T8')
assert(lhC5.count === 0 && lhL3.count === 0 && lhS3.count === 0, 'lateral horn ABSENT at C5, L3, S3 (T1–L2 only)')
const lhRx = cordRadiiAt(-249).rx
if (lhT8.count > 0) {
  assert(lhT8.max[0] > 0.45 * lhRx, 'lateral horn is lateral (> 0.45 rx)', `max x ${lhT8.max[0].toFixed(2)} rx ${lhRx.toFixed(2)}`)
}
// Named columns at their textbook extents.
const CLARKE = scanBounds(buildNamedGrayColumn('clarkes-nucleus'))
const IML = scanBounds(buildNamedGrayColumn('intermediolateral'))
const SACRAL = scanBounds(buildNamedGrayColumn('sacral-parasympathetic'))
ms('Clarke y span', `${CLARKE.min[1].toFixed(1)} … ${CLARKE.max[1].toFixed(1)}`, 'cited C8–L3')
ms('IML y span', `${IML.min[1].toFixed(1)} … ${IML.max[1].toFixed(1)}`, 'cited T1–L2')
ms('sacral parasym. y span', `${SACRAL.min[1].toFixed(1)} … ${SACRAL.max[1].toFixed(1)}`, 'cited S2–S4')
assert(CLARKE.min[1] >= L3_Y - 6 && CLARKE.max[1] <= C8_Y + 1, 'Clarke stays within C8–L3')
assert(IML.min[1] >= L2_Y - 5 && IML.max[1] <= T1_Y + 5, 'IML stays within T1–L2', `y ${IML.min[1].toFixed(1)} … ${IML.max[1].toFixed(1)}`)
assert(SACRAL.min[1] >= S4_Y - 5 && SACRAL.max[1] <= S2_Y + 5, 'sacral parasympathetic stays within S2–S4', `y ${SACRAL.min[1].toFixed(1)} … ${SACRAL.max[1].toFixed(1)}`)

/* ==================================================================== *
 *  5. FUNICULI: stripe geometry + the T6 teaching point
 * ==================================================================== */

console.log('\n── 5. funiculi zones ─────────────────────────────────────────────')
const gracilis = buildGracilis()
const cuneatus = buildCuneatus()
const lateralF = buildLateralFuniculus()
const anteriorF = buildAnteriorFuniculus()
const rxT8 = cordRadiiAt(-249).rx
const rxC5 = cordRadiiAt(-112).rx
const gT8 = windowScan(gracilis, -249)
const cC5 = windowScan(cuneatus, -112)
// The funiculi zones are MIDLINE-CROSSING teaching meshes (the whole posterior
// stripe / the two lateral strips / the anterior zone), so the assertions are
// symmetric in x — NOT patient-left halves like the gray columns.
const gAbs = gT8.count ? Math.max(Math.abs(gT8.min[0]), Math.abs(gT8.max[0])) : Infinity
const cAbsMin = cC5.count ? Math.min(Math.abs(cC5.min[0]), Math.abs(cC5.max[0])) : 0
ms('gracilis |x|max @ T8', gAbs.toFixed(2), `rx ${rxT8.toFixed(2)} (stripe 0.17 rx)`)
assert(gT8.count > 0 && gAbs <= 0.2 * rxT8, 'gracilis is the MEDIAL stripe (|x| ≤ 0.2 rx)')
ms('cuneatus |x|min @ C5', cAbsMin.toFixed(2), `rx ${rxC5.toFixed(2)}`)
assert(cC5.count > 0 && cAbsMin >= 0.15 * rxC5, 'cuneatus is LATERAL of the stripe (|x| ≥ 0.15 rx)')
const cuneatusB = scanBounds(cuneatus)
const gracilisB = scanBounds(gracilis)
ms('cuneatus y-min', cuneatusB.min[1].toFixed(2), `T6 = ${T6_Y}, closes at T6−4`)
assert(cuneatusB.min[1] >= T6_Y - 4 - 0.05, 'cuneatus ABSENT below T6 (teaching point)', `y-min ${cuneatusB.min[1].toFixed(2)}`)
assert(cuneatusB.max[1] <= CORD_TOP_Y + 0.5, 'cuneatus reaches the junction')
ms('gracilis y-min', gracilisB.min[1].toFixed(2))
assert(gracilisB.min[1] <= CORD_TIP_Y + 6, 'gracilis spans all levels to the conus')
for (const [name, g] of [['lateral funiculus', lateralF], ['anterior funiculus', anteriorF]]) {
  const b = scanBounds(g)
  ms(`${name} y span`, `${b.min[1].toFixed(1)} … ${b.max[1].toFixed(1)}`)
  assert(b.min[1] <= CORD_TIP_Y + 6 && b.max[1] >= CORD_TOP_Y - 0.5, `${name} spans the full cord`)
}

/* ==================================================================== *
 *  6. ROOTS, SEGMENT BANDS, CLIP BOX, JUNCTION OVERLAP
 * ==================================================================== */

console.log('\n── 6. roots, segment bands, clip box, junction overlap ───────────')
const dorsalRoots = scanBounds(spinalGeometry('spinal-dorsal-roots'))
const ventralRoots = scanBounds(spinalGeometry('spinal-ventral-roots'))
ms('dorsal root bundle y', `${dorsalRoots.min[1].toFixed(1)} … ${dorsalRoots.max[1].toFixed(1)}`)
ms('ventral root bundle y', `${ventralRoots.min[1].toFixed(1)} … ${ventralRoots.max[1].toFixed(1)}`)
assert(dorsalRoots.min[1] < -370 && dorsalRoots.max[1] > -60, 'dorsal roots span the segments')
assert(ventralRoots.min[1] < -370 && ventralRoots.max[1] > -60, 'ventral roots span the segments')
const stub = buildRootStub('C5', 'dorsal', 0.3)
assert(scanBounds(stub).count > 0, 'per-segment root stub builds')

// Segment bands: 31 parts, each inside its own tile ± 6.
let bandProblems = 0
for (const seg of SPINAL_SEGMENTS) {
  const band = buildSegmentBand(seg.id)
  if (band === null) { bandProblems += 1; continue }
  const b = scanBounds(band)
  if (b.count === 0 || b.min[1] < seg.y - 6 || b.max[1] > seg.y + 6) bandProblems += 1
}
assert(bandProblems === 0, 'all 31 segment bands build inside their tile ± 6', `${bandProblems} problem(s)`)
checks += 31

// EVERY part + mirror inside the contract box.
let outOfBox = 0
for (const slug of spinalRegistrySlugs()) {
  const geometry = spinalGeometry(slug)
  if (geometry === null) { outOfBox += 1; failures.push(`${slug}: no geometry`); continue }
  const b = scanBounds(geometry)
  const outside =
    b.min[0] < CONTRACT.x[0] || b.max[0] > CONTRACT.x[1] ||
    b.min[1] < CONTRACT.y[0] || b.max[1] > CONTRACT.y[1] ||
    b.min[2] < CONTRACT.z[0] || b.max[2] > CONTRACT.z[1]
  if (outside) {
    outOfBox += 1
    console.log(`  FAIL ${slug} outside contract box — x ${b.min[0].toFixed(1)}…${b.max[0].toFixed(1)} y ${b.min[1].toFixed(1)}…${b.max[1].toFixed(1)} z ${b.min[2].toFixed(1)}…${b.max[2].toFixed(1)}`)
  }
  checks += 1
}
assert(outOfBox === 0, `all ${spinalRegistrySlugs().length} part geometries (+ mirrors) inside the contract box`, `${outOfBox} outside`)

// The cord top overlaps the medulla envelope: no gap at y = −50.
const medullaRaw = envelope.createMedullaEnvelope()
const medulla = medullaRaw && medullaRaw.isBufferGeometry ? medullaRaw : medullaRaw?.geometry
assert(medulla !== undefined && medulla !== null, 'createMedullaEnvelope() returns geometry')
if (medulla) {
  const mb = scanBounds(medulla)
  ms('medulla envelope y', `${mb.min[1].toFixed(1)} … ${mb.max[1].toFixed(1)}`)
  assert(mb.min[1] <= CORD_TOP_Y + 2, 'medulla envelope reaches below the junction (overlap ≥ ~2 au)', `y-min ${mb.min[1].toFixed(1)}`)
  const envM = measureCrossSection(medulla, CORD_TOP_Y, 3.5)
  const cordM = measureCrossSection(surface, CORD_TOP_Y, 2)
  ms('junction widths (medulla / cord)', `${envM ? envM.widthMm.toFixed(1) : 'n/a'} / ${cordM ? cordM.widthMm.toFixed(1) : 'n/a'} mm`)
  if (envM !== null && cordM !== null) {
    const ratio = envM.widthMm / cordM.widthMm
    ms('junction width ratio', ratio.toFixed(2))
    assert(ratio >= 0.5 && ratio <= 3.0, 'junction widths commensurate (ratio 0.5–3.0)')
  } else {
    console.log('  note medulla/cord junction width not both measurable at y = −50 (sampling) — printed above')
    checks += 1
    assert(cordM !== null, 'cord top measurable at y = −50')
  }
}

/* ==================================================================== *
 *  7. PART TABLE + RECORD-ID MAPPING (alias collisions have teeth)
 * ==================================================================== */

console.log('\n── 7. part table + record-id mapping ─────────────────────────────')
const segmentParts = SPINAL_PARTS.filter((p) => p.slug.startsWith('spinal-segment-'))
assert(segmentParts.length === 31, 'exactly 31 segment-band parts', `got ${segmentParts.length}`)
const slugs = spinalRegistrySlugs()
assert(new Set(slugs).size === slugs.length, 'registry slugs unique', `${slugs.length} slugs`)
const expectedSlugs = SPINAL_PARTS.length + SPINAL_PARTS.filter((p) => p.paired).length
ms('parts / paired / registry slugs', `${SPINAL_PARTS.length} / ${SPINAL_PARTS.filter((p) => p.paired).length} / ${slugs.length}`)
assert(slugs.length === expectedSlugs, 'registry = parts + paired mirror twins')
let emptyParts = 0
for (const part of SPINAL_PARTS) {
  const geometry = spinalGeometry(part.slug)
  if (geometry === null || geometry.attributes.position.count === 0) {
    emptyParts += 1
    failures.push(`part ${part.slug} builds EMPTY geometry`)
    console.log(`  FAIL part ${part.slug} builds empty geometry`)
  }
  checks += 1
}
assert(emptyParts === 0, 'every part builds non-empty geometry', `${emptyParts} empty`)

const SHOULD_MAP = [
  ['ctx-spinal-cord', 'spinal-cord-surface'],
  ['ctx-conus-medullaris', 'spinal-conus'],
  ['ctx-filum-terminale', 'spinal-filum'],
  ['vent-central-canal', 'spinal-central-canal'],
  ['ctx-dorsal-horn', 'spinal-dorsal-horn'],
  ['ctx-ventral-horn', 'spinal-ventral-horn'],
  ['ctx-lateral-horn', 'spinal-lateral-horn'],
  ['nuc-gray-commissure', 'spinal-gray-commissure'],
  ['nuc-rexed-lamina-i', 'spinal-nucleus-marginal-zone'],
  ['nuc-rexed-lamina-ii', 'spinal-nucleus-substantia-gelatinosa'],
  ['nuc-nucleus-proprius', 'spinal-nucleus-nucleus-proprius'],
  ['nuc-rexed-lamina-v', 'spinal-nucleus-rexed-v-vi'],
  ['nuc-rexed-lamina-vi', 'spinal-nucleus-rexed-v-vi'],
  ['nuc-rexed-lamina-vii', 'spinal-nucleus-intermediate-zone'],
  ['nuc-rexed-lamina-viii', 'spinal-nucleus-rexed-viii'],
  ['nuc-rexed-lamina-ix', 'spinal-nucleus-lmn-motor-columns'],
  ['nuc-lmn-medial-column', 'spinal-nucleus-lmn-motor-columns'],
  ['nuc-lmn-lateral-column', 'spinal-nucleus-lmn-motor-columns'],
  ['nuc-clarke', 'spinal-nucleus-clarkes-nucleus'],
  ['nuc-intermediolateral', 'spinal-nucleus-intermediolateral'],
  ['nuc-sacral-parasympathetic', 'spinal-nucleus-sacral-parasympathetic'],
  ['nuc-onuf', 'spinal-nucleus-sacral-parasympathetic'],
  ['tract-posterior-funiculus', 'spinal-gracilis'],
  ['tract-lateral-funiculus', 'spinal-lateral-funiculus'],
  ['tract-anterior-funiculus', 'spinal-anterior-funiculus'],
  ['tract-dorsal-rootlets', 'spinal-dorsal-roots'],
  ['tract-ventral-rootlets', 'spinal-ventral-roots'],
  ['ctx-cauda-equina', 'spinal-cauda-equina'],
  ['ctx-seg-c5', 'spinal-segment-c5'],
  ['ctx-seg-t8', 'spinal-segment-t8'],
  ['ctx-seg-co1', 'spinal-segment-co1'],
]
for (const [id, slug] of SHOULD_MAP) {
  const hit = spinalRecordPart(id)
  const ok = hit !== null && hit.slug === slug
  if (!ok) {
    console.log(`  FAIL map ${id} → ${hit?.slug ?? 'null'} (expected ${slug})`)
    failures.push(`record map ${id} → ${hit?.slug ?? 'null'}, expected ${slug}`)
  }
  checks += 1
}
console.log(`  ${SHOULD_MAP.length} positive id mappings checked (see FAIL lines if any)`)
assert(
  SHOULD_MAP.every(([id, slug]) => spinalRecordPart(id)?.slug === slug),
  'every real spinal record id maps to its part',
)

// LOOK-ALIKE IDS MUST NOT MAP — the brainstem bodies keep rendering.
const MUST_NOT_MAP = [
  'tract-fasciculus-gracilis', // MEDULLA dorsal column
  'tract-fasciculus-cuneatus', // MEDULLA dorsal column
  'nuc-nucleus-gracilis', // MEDULLA nucleus
  'nuc-nucleus-cuneatus', // MEDULLA nucleus
  'nuc-caudate-head', // TELENCHEPHALON
  'nuc-caudate-body',
  'nuc-caudate-tail',
  'tract-posterior-commissure', // DIENCEPHALON
  'tract-fornix-commissure', // TELENCHEPHALON
  'tract-anterior-white-commissure', // its own spinal record (fallback body)
  'nuc-dorsal-root-ganglion', // its own record (fallback body)
  'nuc-phrenic-nucleus', // its own record (fallback body)
  'nuc-spinal-accessory-nucleus', // its own record (fallback body)
  'tract-anterior-corticospinal', // its own record (course/tract task)
]
let leaked = 0
for (const id of MUST_NOT_MAP) {
  const hit = spinalRecordPart(id)
  if (hit !== null) {
    leaked += 1
    console.log(`  FAIL look-alike ${id} maps to ${hit.slug} (must stay unmapped)`)
    failures.push(`look-alike ${id} swallowed by ${hit.slug}`)
  }
  checks += 1
}
assert(leaked === 0, 'no brainstem/telencephalon/own-record id is swallowed by a spinal part', `${leaked} leaked`)
assert(segmentFromRecordId('ctx-seg-c5') === 'C5', 'segmentFromRecordId reads ctx-seg-* ids')
assert(segmentFromRecordId('nuc-clarke') === null, 'segmentFromRecordId rejects non-segment ids')

/* ==================================================================== */

console.log(`\n${'─'.repeat(72)}`)
console.log(`spinal-geometry: ${checks - failures.length}/${checks} checks passed`)
if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const f of failures) console.log(`  • ${f}`)
  console.log('\nWHAT ONLY THE ORCHESTRATOR CAN CONFIRM (not claimed here):')
  console.log('  • that the 3D scene PAINTS the cord / H / funiculi on screen;')
  console.log('  • that click → selection → highlight reads correctly;')
  console.log('  • frame-time cost of the procedural spinal meshes.')
  process.exitCode = 1
} else {
  console.log('\nAll geometry assertions green. NOT claimed here (no browser): that')
  console.log('the scene paints the cord/H/funiculi, that click→highlight reads, or')
  console.log('the frame-time cost of the procedural meshes.')
}
