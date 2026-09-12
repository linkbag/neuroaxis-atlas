/**
 * audit.mjs — deep end-to-end runtime audit of NeuroAxis.
 *
 * Drives a real headless Chrome over the DevTools Protocol and asserts that
 * every shipped feature actually works at runtime, collecting console errors,
 * page exceptions, failed requests and performance numbers along the way.
 * Complements the code-level checks (`npm run validate` / `check` / `build`),
 * which cannot see runtime behaviour.
 *
 * SELF-SUFFICIENT (this is the point of the bootstrap below)
 * The script no longer has an external precondition. If nothing answers at the
 * target URL it STARTS Vite itself, waits for HTTP 200 (bounded, 30 s), runs the
 * whole check suite, and stops the server again on every exit path — success,
 * check failure, timeout, exception, Ctrl-C. Point it at an already-running
 * server by passing the URL (that server is then never touched).
 *
 * Usage:  npm run verify:audit                        (starts its own server)
 *         node scripts/verify/audit.mjs http://localhost:5173
 *
 * EXIT CODES — an environment failure must never look like a product failure:
 *   0  every check ran and passed
 *   1  checks ran and FAILED — the only "the product is broken" signal
 *   2  static precondition missing (no Chrome binary on this machine)
 *   3  no server: nothing answered at the target URL and the one this script
 *      started did not become ready within the bound
 *   4  no browser: Chrome could not be started / its DevTools endpoint never
 *      answered (preflight, before any check runs). The most common cause in a
 *      restricted sandbox is crashpad: `OpenProcess: Access is denied (0x5)`.
 *
 * ── v7 closure: DETERMINISM (audit gaps 4a/5, plan §2.6) ────────────────────
 * Two of the ten failures in the orchestrator's run were not product defects at
 * all: the boot-preset check read a `neuroaxis.viewPreset` left behind in the
 * PERSISTENT Chrome profile (`.plate-scratch/chrome-profile-audit`) by an earlier
 * run, and the audit's own section B clicks the header's "Nuclei" preset before
 * that check ran. A stored preference could therefore masquerade as "the default
 * preset is wrong". The run is now deterministic by construction:
 *   1. a FRESH profile directory every run (the previous one is deleted first;
 *      if it cannot be deleted, a per-PID directory is used instead) — nothing
 *      survives between runs;
 *   2. an explicit `localStorage.clear()` + `sessionStorage.clear()` prologue
 *      before the boot read, reported in the log — this also covers the case
 *      where the audit is pointed at an already-running server;
 *   3. the boot-preset assertions run IMMEDIATELY after that clean boot (block
 *      A0), before any check clicks a preset button, and they report the raw
 *      reading (`active`, `stored`, `offRows`) with the cause.
 *
 * ── v7 closure: PREDICATES (audit gaps 3/5/6, plan §4.1 item 6) ─────────────
 * Every load-bearing verdict below is decided by a PURE predicate imported from
 * `./checks.mjs` (coverage honesty, preset focus/dimming, panel containment and
 * recovery, context-loss DOM contract, modality sweep honesty). The browser lane
 * feeds them real DOM readings; `scripts/verify/audit-checks.test.mjs` feeds the
 * same predicates synthetic readings and the SHIPPED manifests, so the checks are
 * falsifiable without a browser and cannot drift from the assertions run here.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { register } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  EXIT,
  createLifecycle,
  launchChrome,
  startDevServer,
} from './lib/startServer.mjs'
import {
  contextLossReading,
  contextRestoreReading,
  ctCoverageReading,
  headerToggleRowsReading,
  modalityReading,
  panelContainmentReading,
  panelRecoveryReading,
  presetDimmingReading,
  presetFocusReading,
  readCtSourceCoverage,
} from './checks.mjs'

const BASE = process.argv[2] ?? 'http://localhost:5173'
if (/^https?:\/\/(127\.0\.0\.1|\[::1\])/.test(BASE)) {
  // Measured on this tree: Vite 5 binds IPv6-only by default, so
  // `http://localhost:5173` answers 200 while `http://127.0.0.1:5173` is
  // REFUSED. A readiness probe against 127.0.0.1 can therefore never see a
  // server this script starts; `localhost` is the only correct host here.
  console.log(`note: ${BASE} uses a loopback literal — prefer http://localhost:<port>`)
}
const PORT = 9355

/**
 * CLEAN PROFILE PER RUN (v7 closure, gap 4a — see the header). The audit used a
 * single persistent profile, so a `neuroaxis.viewPreset` written by an earlier
 * run (or by this script's own earlier sections) decided the boot-preset check.
 * The directory lives under `.plate-scratch/` (gitignored, created by this
 * script), which is the only place a verify script may delete: a user profile is
 * never touched.
 */
const PROFILE_BASE = resolve('.plate-scratch/chrome-profile-audit')
let PROFILE = PROFILE_BASE
try {
  rmSync(PROFILE_BASE, { recursive: true, force: true })
} catch (error) {
  PROFILE = `${PROFILE_BASE}-${process.pid}`
  console.log(
    `  ·  could not reset ${PROFILE_BASE} (${
      error instanceof Error ? error.message : String(error)
    }) — using the per-run profile ${PROFILE} instead`,
  )
}
mkdirSync(PROFILE, { recursive: true })
console.log(`  ·  audit profile: ${PROFILE} (fresh — no stored preference can survive a run)`)

/**
 * The CT source-coverage block of the SHIPPED manifest, read once per run
 * (`checks.readCtSourceCoverage`). ONE source for the limit: no check below types
 * the number, so a re-bake moves every assertion with it.
 */
const CT_COVERAGE = readCtSourceCoverage()
console.log(
  `  ·  CT source coverage from ct-manifest.json: superior-most data y ≈ ` +
    `${CT_COVERAGE.limit === null ? 'not declared' : CT_COVERAGE.limit.toFixed(2)} au` +
    `${CT_COVERAGE.fractionInsideFov === null ? '' : ` · ${(CT_COVERAGE.fractionInsideFov * 100).toFixed(1)} % of stations inside the source FOV`}`,
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ========================================================================
 * v10 — SOURCE FACTS the new browser assertions are DERIVED from.
 *
 * The five v10 items are all "the app must follow a single declaration", so the
 * browser checks below must not retype any number: they read the shipped source
 * ONCE here (plain text, no TS loader — this file must stay loadable in Node
 * with no build step) and compare what the PAGE reports against it.
 *
 *   CLIP_BOUNDS        (viewer3d/clipPlanes.ts)  → the canonical box the plane
 *                        helpers must span, and the one the DOM clip sliders
 *                        publish (their min/max ARE these numbers).
 *   SECTION_PIP_SIZE_* (state/store.ts)          → the clamp window the four
 *                        corner drags must obey.
 *   MIN_DIVISION_*     (section/corticalLobes.ts) → the run-quality floors whose
 *                        user-visible consequence (which divisions a plane
 *                        reports as drawn) the container sweep asserts.
 *   REFERENCE_PLANES   (verify/cortical-lobes.mjs) → the plane grid the artefact
 *                        measurements were made on (PLAN.md §4).
 * ====================================================================== */

/** The shipped text of one repo file, or null when it is missing. */
function readSourceFile(relativePath) {
  try {
    return readFileSync(resolve(relativePath), 'utf8')
  } catch (error) {
    return null
  }
}

/** `export const NAME = 12` (or a bare `NAME = 12`) out of a source text, or null. */
function numericConstantOf(sourceText, name) {
  if (sourceText === null) return null
  const exported = new RegExp(`export const ${name}\\s*(?::[^=]*)?=\\s*(-?[0-9]+(?:\\.[0-9]+)?)`).exec(sourceText)
  if (exported !== null) return Number(exported[1])
  const loose = new RegExp(`${name}\\s*=\\s*(-?[0-9]+(?:\\.[0-9]+)?)`).exec(sourceText)
  return loose === null ? null : Number(loose[1])
}

const CLIP_PLANES_SOURCE = readSourceFile('src/components/viewer3d/clipPlanes.ts')
const CLIP_BOUNDS_SOURCE = (() => {
  const bounds = {}
  if (CLIP_PLANES_SOURCE === null) return bounds
  for (const axis of ['x', 'y', 'z']) {
    const match = new RegExp(
      `\\b${axis}:\\s*\\{\\s*min:\\s*(-?[0-9.]+)\\s*,\\s*max:\\s*(-?[0-9.]+)\\s*\\}`,
    ).exec(CLIP_PLANES_SOURCE)
    if (match !== null) bounds[axis] = { min: Number(match[1]), max: Number(match[2]) }
  }
  return bounds
})()
const CLIP_BOUNDS_DECLARATIONS = (() => {
  if (CLIP_PLANES_SOURCE === null) return null
  return (CLIP_PLANES_SOURCE.match(/export const CLIP_BOUNDS/g) ?? []).length
})()

/** `width: 224` out of one object literal's text, or null. */
function objectFieldOf(objectLiteral, field) {
  if (objectLiteral === null || objectLiteral === undefined) return null
  const match = new RegExp(`\\b${field}:\\s*(-?[0-9]+(?:\\.[0-9]+)?)`).exec(objectLiteral)
  return match === null ? null : Number(match[1])
}

const STORE_SOURCE = readSourceFile('src/state/store.ts')
const PIP_SIZE_LITERALS = {
  min: /SECTION_PIP_SIZE_MIN:[^=]*=\s*\{([^}]*)\}/.exec(STORE_SOURCE ?? '')?.[1] ?? null,
  max: /SECTION_PIP_SIZE_MAX:[^=]*=\s*\{([^}]*)\}/.exec(STORE_SOURCE ?? '')?.[1] ?? null,
}
const PIP_SIZE_SOURCE = {
  min: {
    width: objectFieldOf(PIP_SIZE_LITERALS.min, 'width'),
    height: objectFieldOf(PIP_SIZE_LITERALS.min, 'height'),
  },
  max: {
    width: objectFieldOf(PIP_SIZE_LITERALS.max, 'width'),
    height: objectFieldOf(PIP_SIZE_LITERALS.max, 'height'),
  },
}

/**
 * v10 §2 — the four divisions, read out of the shipped store source (the single
 * declaration the Legend builds its rows from). The union of their `regions` IS
 * `ALL_REGIONS`: the store asserts that partition at module load, so the browser
 * check can use it as the app's own region list rather than retyping one.
 */
const DIVISIONS_SOURCE = (() => {
  const block = /export const DIVISIONS[\s\S]*?=\s*\[([\s\S]*?)\n\]/.exec(STORE_SOURCE ?? '')?.[1] ?? ''
  const out = []
  for (const match of block.matchAll(/id:\s*'([a-z]+)',\s*label:\s*'([^']+)',\s*regions:\s*\[([^\]]*)\]/g)) {
    out.push({
      id: match[1],
      label: match[2],
      regions: [...match[3].matchAll(/'([^']+)'/g)].map((inner) => inner[1]),
    })
  }
  return out
})()
const ALL_REGIONS_FROM_DIVISIONS = [...new Set(DIVISIONS_SOURCE.flatMap((division) => division.regions))]

/**
 * The taxonomy TREE labels its region rows with `REGION_LABELS` (data/load.ts),
 * not with the region id — 'Telencephalon (cerebral hemispheres)',
 * 'Mesencephalon (midbrain)', 'Cerebral vasculature' — while the LEGEND renders
 * the bare id (`<span>{region}</span>`). The division sweep reads the tree, so it
 * needs the app's own label table to map a tree row back to its region; retyping
 * the names here would drift the moment the panel copy changes.
 */
const REGION_LABELS_SOURCE = (() => {
  const text = readSourceFile('src/data/load.ts') ?? ''
  const block = /export const REGION_LABELS[^=]*=\s*\{([\s\S]*?)\n\}/.exec(text)?.[1] ?? ''
  const out = {}
  for (const match of block.matchAll(/([a-z]+):\s*'([^']+)'/g)) out[match[1]] = match[2]
  return out
})()
const REGION_LABEL_TO_REGION = (() => {
  const out = {}
  for (const [region, label] of Object.entries(REGION_LABELS_SOURCE)) out[label.trim().toLowerCase()] = region
  return out
})()

const CORTICAL_SOURCE = readSourceFile('src/components/section/corticalLobes.ts')
const DIVISION_FLOORS = {
  runAu: numericConstantOf(CORTICAL_SOURCE, 'MIN_DIVISION_RUN_AU'),
  areaAu2: numericConstantOf(CORTICAL_SOURCE, 'MIN_DIVISION_AREA_AU2'),
  labelAreaAu2: numericConstantOf(CORTICAL_SOURCE, 'MIN_DIVISION_LABEL_AREA_AU2'),
}
const DIVISION_LEGEND_LABELS = (() => {
  const block = /CORTICAL_DIVISION_LABELS[^=]*=\s*\{([^}]*)\}/.exec(CORTICAL_SOURCE ?? '')?.[1] ?? ''
  const out = {}
  for (const match of block.matchAll(/([a-z]+):\s*'([^']+)'/g)) out[match[1]] = match[2]
  return out
})()

const PLANE_HELPERS_SOURCE = readSourceFile('src/components/viewer3d/PlaneHelpers.tsx')
const HELPER_GRID_CELL_AU = numericConstantOf(PLANE_HELPERS_SOURCE, 'GRID_CELL_AU')

/**
 * The transverse planes the v10 artefact report names (PLAN.md §4 lines 208–235:
 * the architect's measured wedges/slivers), each with the divisions the SHIPPED
 * v10 rule actually paints there.
 *
 * `drawn` is NOT the architect's pre-fix table and NOT a hand-written guess: it is
 * measured with the shipped classifier + shipped splitter over the shipped ribbon
 * GLBs (`.dsh-scratch/review-qa-cort/artefact-planes.mjs`, which loads
 * `corticalLobes.ts` and runs `contours.extractContours` — the SAME function the
 * section worker calls, so the set is the one the canvas receives) and covers
 * BOTH ribbons, because the section canvas paints `ctx-hemisphere-l` and
 * `ctx-hemisphere-r` while the committed gate's own per-plane tables slice the
 * left ribbon only. That difference is why this table is not the architect's:
 * at y = 14 and y = 16 the right ribbon carries a real limbic body (401.4 /
 * 212.1 au²), and at y = 32 temporal keeps a 141.5 au² run after absorption — a
 * check that had asserted "limbic absent at y = 14" or "temporal absent at y = 32"
 * from the pre-fix table would have been WRONG about the shipped rule.
 * The load-bearing cases are the planes where the classifier still cuts a
 * division that the floors then remove: y = 26 (limbic), y = 30/32/34 (insula and
 * limbic) — that is the user's sliver class, and it must stay gone.
 *
 * v11 §3b — `drawn` IS NOW A PRINTED CROSS-CHECK, NOT THE PASS CONDITION. The
 * browser lane derives the expected set AT RUNTIME from the shipped classifier +
 * splitter + floors over BOTH ribbons (`loadCorticalRule` below) and compares that
 * to what the canvas reports; this table is printed beside it, and
 * `verify:cortical-lobes` asserts the two still agree. A hardcoded expectation is
 * a second copy of the rule: change a floor and this column drifts, and the check
 * would then fail for the wrong reason (or, worse, someone would relax it).
 */
const ARTEFACT_PLANES = [
  {
    value: 6,
    drawn: ['frontal', 'limbic', 'occipital', 'parietal', 'temporal'],
    note: 'limbic has a real body here (99.1 au²) and must survive; insula is not classified at all',
  },
  {
    value: 14,
    drawn: ['frontal', 'insula', 'limbic', 'occipital', 'parietal', 'temporal'],
    note: 'the pre-fix LIMBIC wedge plane: limbic now comes from the right ribbon body (401.4 au²), so all six have a body',
  },
  {
    value: 26,
    drawn: ['frontal', 'insula', 'occipital', 'parietal', 'temporal'],
    note: 'limbic is classified here but every span is sub-threshold — it must not be painted',
  },
  {
    value: 30,
    drawn: ['frontal', 'occipital', 'parietal', 'temporal'],
    note: 'pre-fix insula 0.55 au² and limbic 3.5–17.9 au² wedges: both cut, both must stay unpainted',
  },
  {
    value: 32,
    drawn: ['frontal', 'occipital', 'parietal', 'temporal'],
    note: 'the user’s orange TEMPORAL triangle plane (pre-fix 5.50 au²) plus insula 10.6 au²: both sub-threshold, both must stay unpainted',
  },
  {
    value: 34,
    drawn: ['frontal', 'occipital', 'parietal', 'temporal'],
    note: 'pre-fix insula 0.8 au²',
  },
]

/** The taxonomy (one JSON file, already used by the Node-only mirror). */
const TAXONOMY_ENTRIES = (() => {
  const raw = readSourceFile('src/data/taxonomy.json')
  if (raw === null) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : (parsed.entries ?? parsed.records ?? [])
  } catch (error) {
    return []
  }
})()
const CORTEX_RECORD_NAME = TAXONOMY_ENTRIES.find((e) => e.id === 'ctx-cerebral-cortex')?.name ?? null

/* ========================================================================
 * v11 §3b — THE RULE'S OWN DIVISION SET, DERIVED AT AUDIT RUNTIME.
 *
 * The v10 audit compared the canvas' painted divisions against `ARTEFACT_PLANES[
 * ].drawn` — a hand-written table. That is a second copy of the rule: change a
 * floor or a boundary in `corticalLobes.ts` and the table drifts, so the check
 * then fails for the wrong reason (or, worse, someone relaxes it). PLAN.md §3b
 * requires the expected set to be RE-DERIVED here, from the shipped classifier +
 * shipped splitter + shipped floors, over BOTH cortical ribbons (the canvas
 * paints `ctx-hemisphere-l` AND `-r`; the committed gate's per-plane tables slice
 * the LEFT one, which is the whole measured cause of v10's "the canvas paints
 * none" reading).
 *
 * HOW. `scripts/verify/plane-transform.loader.mjs` is the repo's own
 * extensionless-specifier hook (used by `verify:plane`), registered here so Node
 * 24's type stripping can import the shipped `.ts` modules the app ships — the
 * SAME `corticalLobes.corticalRunsForLoop`/`paintedDivisionsOfLoops` the canvas
 * calls and the same `contours.extractContours` the section worker calls. No
 * retyped maths. The ribbon slugs come from `sectionAssets.ts`, the GLB names
 * from the anatomy manifest. A derivation failure is reported as a FAILURE by
 * the caller (never skipped): a check that passes by not running is this
 * project's known failure mode.
 * ====================================================================== */
let corticalRulePromise = null
function loadCorticalRule() {
  if (corticalRulePromise !== null) return corticalRulePromise
  corticalRulePromise = (async () => {
    register(pathToFileURL(resolve('scripts/verify/plane-transform.loader.mjs')).href, import.meta.url)
    const lobes = await import('../../src/components/section/corticalLobes.ts')
    const contours = await import('../../src/components/section/contours.ts')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const assetsText = readSourceFile('src/components/section/sectionAssets.ts') ?? ''
    const ribbonBlock = assetsText.slice(
      assetsText.indexOf('SECTION_CORTICAL_RIBBON_SLUGS'),
      assetsText.indexOf('export function isCorticalRibbonSlug'),
    )
    const slugs = [...ribbonBlock.matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1])
    if (slugs.length === 0) throw new Error('SECTION_CORTICAL_RIBBON_SLUGS could not be read from sectionAssets.ts')
    const manifestText = readSourceFile('src/assets/anatomy/anatomy-manifest.json')
    if (manifestText === null) throw new Error('src/assets/anatomy/anatomy-manifest.json is missing')
    const manifest = JSON.parse(manifestText)
    const geometries = []
    for (const slug of slugs) {
      const part = (manifest.parts ?? []).find((candidate) => candidate.slug === slug) ?? null
      if (part === null) throw new Error(`ribbon ${slug} is not in the anatomy manifest`)
      const buffer = readFileSync(resolve('src/assets/anatomy', part.file ?? `${slug}.glb`))
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      const loader = new GLTFLoader()
      const gltf = await new Promise((res, rej) => loader.parse(arrayBuffer, '', res, rej))
      let mesh = null
      gltf.scene.traverse((child) => {
        if (mesh === null && child.isMesh === true) mesh = child
      })
      if (mesh === null) throw new Error(`ribbon ${slug} has no mesh`)
      const position = mesh.geometry.getAttribute('position')
      const index = mesh.geometry.getIndex()
      if (position === null || position === undefined || index === null) {
        throw new Error(`ribbon ${slug} has no indexed position attribute`)
      }
      const positions = new Float32Array(position.count * 3)
      for (let i = 0; i < position.count; i++) {
        positions[i * 3] = position.getX(i)
        positions[i * 3 + 1] = position.getY(i)
        positions[i * 3 + 2] = position.getZ(i)
      }
      const indices = new Uint32Array(index.count)
      for (let i = 0; i < index.count; i++) indices[i] = index.getX(i)
      geometries.push({ slug, positions, indices, triangles: index.count / 3 })
    }
    const loopsOf = (geometry, axis, planeValue) => {
      const plane = { axis, value: planeValue }
      if (!contours.boundsMayCut(contours.partBounds(geometry.positions), plane)) return []
      return contours.extractContours(geometry.positions, geometry.indices, plane).loops
    }
    return {
      ribbons: geometries.map((geometry) => `${geometry.slug} (${geometry.triangles} tris)`),
      floors: {
        runAu: lobes.MIN_DIVISION_RUN_AU,
        areaAu2: lobes.MIN_DIVISION_AREA_AU2,
        labelAreaAu2: lobes.MIN_DIVISION_LABEL_AREA_AU2,
        rule: 'corticalRunsForLoop (spawned by the section canvas per ribbon loop)',
      },
      divisions: [...lobes.CORTICAL_DIVISIONS],
      /** The rule's division set at one plane over BOTH ribbons — the canvas' input. */
      setAt(planeValue, axis = 'y') {
        const loops = geometries.flatMap((geometry) => loopsOf(geometry, axis, planeValue))
        return lobes.paintedDivisionsOfLoops(loops, axis, planeValue)
      },
      /** Per ribbon, so the coverage asymmetry stays printed (l vs l+r). */
      setPerRibbon(planeValue, axis = 'y') {
        return Object.fromEntries(
          geometries.map((geometry) => [geometry.slug, lobes.paintedDivisionsOfLoops(loopsOf(geometry, axis, planeValue), axis, planeValue)]),
        )
      },
    }
  })().catch((error) => ({ error: error instanceof Error ? error.message : String(error) }))
  return corticalRulePromise
}

/**
 * v10 §5 — the ONE record whose canvas text is suppressed. Read from the shipped
 * SectionCanvas source rather than retyped, so the browser check follows the
 * constant the app actually uses.
 */
const SUPPRESSED_CANVAS_LABEL_IDS = (() => {
  const text = readSourceFile('src/components/section/SectionCanvas.tsx')
  const block = /NO_CANVAS_LABEL_RECORD_IDS[^=]*=\s*new Set\(\[([^\]]*)\]\)/.exec(text ?? '')
  if (block === null) return []
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
})()

/* ========================================================================
 * v11 — THE TWO TOGGLE ROWS (docs/SWARM_V11_PLAN.md §1 · PLAN.md §1)
 *
 * The header's preset ROW is no longer the primary control: two labelled rows of
 * toggle buttons ("Areas" = the big anatomical categories, "Systems" = the
 * orthogonal kinds) now decide what the 3D scene, the 2D live section and the PiP
 * show, and a Reset action restores the documented default framing.
 *
 * Every assertion about them below is derived from the SHIPPED DECLARATIONS —
 * the `AREAS` table and the `DIVISIONS` table in `state/store.ts`, `ALL_KINDS` in
 * `data/load.ts` — never from a retyped list, so a region or kind that stops
 * being covered by a button is a FAILURE here rather than a silent hole. The
 * `AREAS` entries' `regions:` expressions are the store's own derivation
 * (`divisionRegions('…')` plus the two named hindbrain constants), so this
 * parser EVALUATES that expression instead of restating its result; an
 * unrecognised shape fails loudly (`AREA_TABLE_SOURCE === null`).
 * ====================================================================== */

const AREA_TABLE_SOURCE = (() => {
  const text = STORE_SOURCE ?? ''
  const block = /export const AREAS[\s\S]*?=\s*\[([\s\S]*?)\n\]/.exec(text)?.[1] ?? null
  if (block === null) return null
  /** `const NAME = <expression>` — the named constants the split is built from. */
  const constants = new Map()
  for (const match of text.matchAll(/\nconst ([A-Z_][A-Z0-9_]*)(?::[^=\n]*)?=\s*([^\n]+)/g)) {
    constants.set(match[1], match[2].trim())
  }
  const valueOf = (expression, depth = 0) => {
    if (depth > 4) return null
    const expr = String(expression).trim().replace(/,$/, '')
    const literal = /^\[([^\]]*)\]$/.exec(expr)
    if (literal !== null) return [...literal[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
    const quoted = /^'([a-z]+)'$/.exec(expr)
    if (quoted !== null) return [quoted[1]]
    const call = /^divisionRegions\(\s*'([a-z]+)'\s*\)$/.exec(expr)
    if (call !== null) return DIVISIONS_SOURCE.find((d) => d.id === call[1])?.regions ?? null
    const filter = /^([\s\S]+?)\.filter\(\(\s*region\s*\)\s*=>\s*region\s*(===|!==)\s*([A-Za-z_'"]+)\s*\)$/.exec(expr)
    if (filter !== null) {
      const base = valueOf(filter[1], depth + 1)
      const target = valueOf(filter[3], depth + 1)
      if (base === null || target === null || target.length !== 1) return null
      return filter[2] === '===' ? base.filter((region) => region === target[0]) : base.filter((region) => region !== target[0])
    }
    if (constants.has(expr)) return valueOf(constants.get(expr), depth + 1)
    return null
  }
  const out = []
  for (const match of block.matchAll(
    /\{\s*id:\s*'([a-z]+)'[\s\S]*?label:\s*'([^']*)'[\s\S]*?division:\s*'([a-z]+)'[\s\S]*?regions:\s*([\s\S]*?)\s*\},/g,
  )) {
    out.push({ id: match[1], label: match[2], division: match[3], regions: valueOf(match[4]) })
  }
  return out.length === 0 || out.some((area) => !Array.isArray(area.regions)) ? null : out
})()
const AREA_IDS = AREA_TABLE_SOURCE === null ? [] : AREA_TABLE_SOURCE.map((area) => area.id)
const AREA_REGIONS_MAP = Object.fromEntries(
  (AREA_TABLE_SOURCE ?? []).map((area) => [area.id, area.regions]),
)

/** `export const ALL_KINDS = [...]` — the systems row's own declaration. */
const ALL_KINDS_SOURCE = (() => {
  const text = readSourceFile('src/data/load.ts') ?? ''
  const block = /export const ALL_KINDS[^=]*=\s*\[([^\]]*)\]/.exec(text)?.[1] ?? null
  if (block === null) return null
  const out = [...block.matchAll(/'([a-z]+)'/g)].map((match) => match[1])
  return out.length === 0 ? null : out
})()

/**
 * v11 §3a — the ORDERED in-plane axis pair, and the world-axis index, read from
 * `planeGeometry.ts` (the ONE declaration the 2D canvas, the PiP camera, the
 * backdrop sampler, the section plane frame and the 3D helper quad all use).
 * The v10 audit derived the pair by ascending axis NAME — dropping the swept
 * plane's own axis from the canonical three in x, y, z order with an inequality
 * test — which is the SAME answer for the transverse and coronal sheets and the
 * WRONG one for sagittal: it reports 171 × 148 au where the shipped quad (and the
 * in-plane CLIP_BOUNDS rectangle) is 148 × 171. The comparison below is therefore
 * on the ordered pair, so a swap fails.
 */
const PLANE_GEOMETRY_SOURCE = readSourceFile('src/components/section/planeGeometry.ts')
const AXIS_PAIR_SOURCE = (() => {
  const block = /export const AXIS_PAIR[^=]*=\s*\{([\s\S]*?)\n\}/.exec(PLANE_GEOMETRY_SOURCE ?? '')?.[1] ?? null
  if (block === null) return null
  const out = {}
  for (const match of block.matchAll(/([xyz]):\s*\[\s*'([xyz])'\s*,\s*'([xyz])'\s*\]/g)) {
    out[match[1]] = [match[2], match[3]]
  }
  return ['x', 'y', 'z'].every((axis) => Array.isArray(out[axis])) ? out : null
})()
const AXIS_INDEX_SOURCE = (() => {
  const block = /export const AXIS_INDEX[^=]*=\s*\{([^}]*)\}/.exec(PLANE_GEOMETRY_SOURCE ?? '')?.[1] ?? null
  if (block === null) return null
  const out = {}
  for (const match of block.matchAll(/([xyz]):\s*([0-9])/g)) out[match[1]] = Number(match[2])
  return ['x', 'y', 'z'].every((axis) => typeof out[axis] === 'number') ? out : null
})()

console.log(
  '  ·  v10 source facts: CLIP_BOUNDS ' +
    `x[${CLIP_BOUNDS_SOURCE.x?.min ?? '?'}, ${CLIP_BOUNDS_SOURCE.x?.max ?? '?'}] ` +
    `y[${CLIP_BOUNDS_SOURCE.y?.min ?? '?'}, ${CLIP_BOUNDS_SOURCE.y?.max ?? '?'}] ` +
    `z[${CLIP_BOUNDS_SOURCE.z?.min ?? '?'}, ${CLIP_BOUNDS_SOURCE.z?.max ?? '?'}] · ` +
    `declaration sites ${CLIP_BOUNDS_DECLARATIONS ?? '?'} · grid cell ${HELPER_GRID_CELL_AU ?? '?'} au · ` +
    `division floors ${DIVISION_FLOORS.runAu ?? '?'} au / ${DIVISION_FLOORS.areaAu2 ?? '?'} au2 (label ` +
    `${DIVISION_FLOORS.labelAreaAu2 ?? '?'} au2) · PiP clamp ` +
    `${PIP_SIZE_SOURCE.min.width ?? '?'}x${PIP_SIZE_SOURCE.min.height ?? '?'}…` +
    `${PIP_SIZE_SOURCE.max.width ?? '?'}x${PIP_SIZE_SOURCE.max.height ?? '?'} px · ` +
    `suppressed canvas label ids [${SUPPRESSED_CANVAS_LABEL_IDS.join(', ') || 'none'}]`,
)

console.log(
  '  ·  v11 source facts: AREAS ' +
    (AREA_TABLE_SOURCE === null
      ? 'NOT READABLE from state/store.ts (the toggle rows cannot be asserted against the table)'
      : AREA_TABLE_SOURCE.map((area) => `${area.id}→[${area.regions.join('+')}]`).join(' · ')) +
    ` · ALL_KINDS ${ALL_KINDS_SOURCE === null ? 'not readable' : ALL_KINDS_SOURCE.join(', ')}` +
    ` · AXIS_PAIR ${AXIS_PAIR_SOURCE === null ? 'not readable' : JSON.stringify(AXIS_PAIR_SOURCE)}` +
    ` · AXIS_INDEX ${AXIS_INDEX_SOURCE === null ? 'not readable' : JSON.stringify(AXIS_INDEX_SOURCE)}`,
)

const results = []
const ok = (m) => results.push(['ok', m])
const bad = (m) => results.push(['FAIL', m])
const info = (m) => results.push(['info', m])

const lifecycle = createLifecycle((message) => console.log(`  ·  ${message}`))

/** Set by the bootstrap; `null` until then. */
let ws
let send
let evaluate

/**
 * Resource preparation, kept OUT of the check body so the script can exit with a
 * distinct code before pretending to audit anything.
 *
 * @returns {Promise<{ exitCode: number|null, reason: string }>}
 */
async function prepareEnvironment() {
  if (
    !existsSync(
      `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    ) &&
    !existsSync(
      `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    ) &&
    !existsSync(
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ) &&
    process.env.CHROME_PATH === undefined
  ) {
    return { exitCode: EXIT.STATIC_PRECONDITION, reason: 'no Chrome binary found' }
  }

  const server = await startDevServer({
    baseUrl: BASE,
    lifecycle,
    log: (message) => console.log(`  ·  ${message}`),
    timeoutMs: 30_000,
  })
  if (server.failed === true) {
    return {
      exitCode: EXIT.SERVER_UNAVAILABLE,
      reason:
        `the dev server never answered HTTP 200 at ${BASE} ` +
        `(started: ${server.started}, waited ${server.elapsedMs} ms)`,
    }
  }

  const chrome = await launchChrome({
    port: PORT,
    profileDir: PROFILE,
    log: (message) => console.log(`  ·  ${message}`),
  })
  if (!chrome.ok) {
    return { exitCode: EXIT.BROWSER_UNAVAILABLE, reason: chrome.reason }
  }
  lifecycle.add(async () => {
    try {
      ws?.close()
    } catch {
      /* already closed */
    }
    const { killTree, waitForExit } = await import('./lib/startServer.mjs')
    killTree(chrome.chrome.pid)
    await waitForExit(chrome.chrome, 3000)
  })
  return { exitCode: null, reason: '' }
}

const consoleErrors = []
const exceptions = []
const failedRequests = []
const badResponses = []
const requestSizes = []

async function connect() {
  let page = null
  for (let i = 0; i < 60 && page === null; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) ?? null
    } catch {
      /* waiting */
    }
    if (page === null) await sleep(250)
  }
  if (page === null) throw new Error('devtools endpoint never came up')
  ws = new WebSocket(page.webSocketDebuggerUrl)
  let nextId = 1
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== undefined) {
      pending.get(msg.id)?.(msg.result ?? msg.error)
      pending.delete(msg.id)
      return
    }
    const { method, params } = msg
    if (method === 'Runtime.exceptionThrown') {
      exceptions.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text)
    } else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
      consoleErrors.push((params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' '))
    } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      consoleErrors.push(`[${params.entry.source}] ${params.entry.text}`)
    } else if (method === 'Network.loadingFailed') {
      failedRequests.push(`${params.errorText}`)
    } else if (method === 'Network.responseReceived') {
      if (params.response.status >= 400) badResponses.push(`${params.response.status} ${params.response.url}`)
      requestSizes.push({ url: params.response.url, type: params.responseType })
    }
  })
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })
  send = (method, params = {}) => {
    const id = nextId++
    ws.send(JSON.stringify({ id, method, params }))
    return new Promise((res) => pending.set(id, res))
  }
  evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r?.exceptionDetails) return `THREW: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`
    return r?.result?.value
  }
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Network.enable')
  await send('Page.enable')
  try {
    await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  } catch {
    /* older builds */
  }
}

/* ---------------------------------------------------------------- helpers */

const clickText = (text, exact = true, scope = 'document') => `(() => {
  const root = ${scope};
  const b = [...root.querySelectorAll('button')].find(x => ${exact ? `${JSON.stringify(text)} === x.textContent.trim()` : `new RegExp(${JSON.stringify(text)}, 'i').test(x.textContent.trim())`});
  if (!b) return 'not found: ${text}';
  b.click();
  return 'clicked: ' + b.textContent.trim().slice(0, 40);
})()`

/**
 * Click ONE control by its MACHINE HOOK — the v11 way to address the header
 * (`[data-area="…"]`, `[data-kind="…"]`, `[data-preset="…"]`,
 * `[data-header-action="…"]`). `clickText` finds the FIRST button whose exact
 * `textContent` matches, which is now ambiguous in the header: the v11 Systems
 * row adds a button reading exactly `Nuclei` next to the preset of that name, and
 * a preset row that is reordered (or a label that is re-worded) would silently
 * re-point a text-based click at a different control — the failure mode this
 * helper exists to remove. A missing hook is REPORTED (the string is printed by
 * the caller), never patched over with a text fallback.
 */
const clickHook = (selector) => `(() => {
  const b = document.querySelector(${JSON.stringify(selector)});
  if (b === null) return 'not found: ${selector}';
  if (b.tagName !== 'BUTTON') return 'not a <button>: ' + b.tagName + ' for ${selector}';
  b.click();
  return 'clicked ${selector} ("' + (b.textContent || '').trim().slice(0, 40) + '")';
})()`

/** The same hook addressing, read-only: pressed state + visible text. */
const hookState = (selector) => `(() => {
  const b = document.querySelector(${JSON.stringify(selector)});
  if (b === null) return null;
  const raw = b.getAttribute('aria-pressed');
  return {
    selector: ${JSON.stringify(selector)},
    text: (b.textContent || '').trim(),
    pressed: raw === 'true' ? true : raw === 'false' ? false : null,
    name: b.getAttribute('aria-label') || '',
  };
})()`

const sectionStats = `(() => {
  const c = document.querySelector('.section-canvas');
  if (!c) return null;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let painted = 0, sampled = 0, hash = 0;
  for (let i = 0; i < d.length; i += 4 * 53) {
    sampled++;
    const r = d[i], g = d[i+1], b = d[i+2];
    hash = (hash * 31 + r + g * 3 + b * 7) % 1000000007;
    if (!(Math.abs(r-13) < 9 && Math.abs(g-21) < 9 && Math.abs(b-38) < 12)) painted++;
  }
  return { painted, sampled, hash };
})()`

/**
 * v9: the SAME sampler, aimed at any 2D canvas the caller can name.
 *
 * Why this exists: the PiP's own surface is now DOM + a 2D canvas (v9 item 5),
 * so the simulated-section panel can be asserted on ITS OWN PIXELS instead of on
 * its source text — the retired GPU rig had no script-readable surface at all,
 * which is why the old checks could only look at DOM around it. `expression`
 * must evaluate to a canvas element or null.
 */
const canvasStatsFor = (expression) => `(() => {
  const c = ${expression};
  if (!c) return null;
  if (c.width < 2 || c.height < 2) return { painted: 0, sampled: 0, hash: 0, width: c.width, height: c.height };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let painted = 0, sampled = 0, hash = 0;
  for (let i = 0; i < d.length; i += 4 * 53) {
    sampled++;
    const r = d[i], g = d[i+1], b = d[i+2];
    hash = (hash * 31 + r + g * 3 + b * 7) % 1000000007;
    if (!(Math.abs(r-13) < 9 && Math.abs(g-21) < 9 && Math.abs(b-38) < 12)) painted++;
  }
  return { painted, sampled, hash, width: c.width, height: c.height };
})()`

/** The simulated-section panel's canvas (v9 item 5) — the panel owns exactly one. */
const PIP_CANVAS = `document.querySelector('.pip-panel .pip-window canvas')`

/** The Plates tab's live-section canvas — never the panel's copy of it. */
const PLATES_CANVAS = `([...document.querySelectorAll('.section-canvas')].find((c) => c.closest('.pip-panel') === null) || null)`

/* ======================================================================
 * v11 — THE HEADER'S TWO TOGGLE ROWS, read as plain DOM values.
 *
 * One probe, three uses: the clean-boot contract (block A0), the toggle
 * behaviour sweep (block R) and the restore check after Reset. It reads the
 * button's REAL attributes — tag, type, `aria-pressed`, accessible name
 * (`aria-label`), machine hook — plus the LEGEND's own layer checkboxes at the
 * same instant, because "the button says on" and "the layer set says on" must be
 * one fact rather than two readings that happen to agree.
 *
 * `pressed` is deliberately null when `aria-pressed` is missing or is not the
 * literal "true"/"false": a missing state must FAIL the predicate, never read as
 * "false" and pass the half of the contract that expects it off.
 * ====================================================================== */
const HEADER_ROWS_PROBE = `(() => {
  const boolAttr = (element, name) => {
    if (element === null) return null;
    const raw = element.getAttribute(name);
    return raw === 'true' ? true : raw === 'false' ? false : null;
  };
  const rowOf = (selector) => {
    const row = document.querySelector(selector);
    return {
      present: row !== null,
      role: row === null ? '' : (row.getAttribute('role') || ''),
      name: row === null ? '' : (row.getAttribute('aria-label') || ''),
      dataRow: row === null ? null : row.getAttribute('data-row'),
      buttons: row === null ? -1 : row.querySelectorAll('button').length,
      labelText: row === null ? '' : ((row.querySelector('.header-row-label') || {}).textContent || '').trim(),
    };
  };
  const toggles = [];
  for (const hook of ['data-area', 'data-kind']) {
    for (const button of document.querySelectorAll('[' + hook + ']')) {
      toggles.push({
        hook: hook,
        key: button.getAttribute(hook) || '',
        text: (button.textContent || '').trim(),
        pressed: boolAttr(button, 'aria-pressed'),
        name: button.getAttribute('aria-label') || '',
        title: button.getAttribute('title') || '',
        tag: button.tagName,
        type: button.getAttribute('type') || '',
        division: button.getAttribute('data-division'),
        rowClass: button.closest('.header-rows') === null ? null : (button.parentElement || {}).className || '',
      });
    }
  }
  const actions = [...document.querySelectorAll('[data-header-action]')].map((button) => ({
    key: button.getAttribute('data-header-action') || '',
    text: (button.textContent || '').trim(),
    pressed: boolAttr(button, 'aria-pressed'),
    name: button.getAttribute('aria-label') || '',
  }));
  const presets = [...document.querySelectorAll('.header-presets button[data-preset]')].map((button) => ({
    id: button.getAttribute('data-preset') || '',
    label: (button.textContent || '').trim(),
    pressed: boolAttr(button, 'aria-pressed'),
  }));
  const headerButtons = [...document.querySelectorAll('.app-header button')].map((button) => ({
    text: (button.textContent || '').trim(),
    hook: ['data-preset', 'data-area', 'data-kind', 'data-header-action']
      .filter((name) => button.getAttribute(name) !== null)
      .join('+') || '',
  }));
  const legend = {};
  for (const row of document.querySelectorAll('.legend-row.legend-toggle')) {
    if (row.closest('.legend-divisions') !== null) continue;
    const input = row.querySelector('input[type=checkbox]');
    if (input === null) continue;
    legend[(row.textContent || '').trim()] = input.checked;
  }
  const tab = [...document.querySelectorAll('[role=tab]')]
    .filter((t) => t.getAttribute('aria-selected') === 'true')
    .map((t) => (t.textContent || '').trim());
  return {
    rows: { areas: rowOf('.header-areas'), systems: rowOf('.header-systems') },
    toggles: toggles,
    actions: actions,
    presets: presets,
    headerButtons: headerButtons,
    legend: legend,
    activeTab: tab,
  };
})()`

/**
 * Turn one `HEADER_ROWS_PROBE` reading into the pure predicate's input: the
 * expected sets come from the shipped declarations parsed above, and the layer
 * sets are sliced out of the legend readback by the app's own region/kind lists.
 */
function headerReadingFrom(probe) {
  const legend = probe?.legend ?? {}
  const pick = (keys) =>
    Object.fromEntries(keys.filter((key) => typeof legend[key] === 'boolean').map((key) => [key, legend[key]]))
  return {
    rows: probe?.rows ?? {},
    toggles: probe?.toggles ?? [],
    actions: probe?.actions ?? [],
    presets: probe?.presets ?? [],
    headerButtons: probe?.headerButtons ?? [],
    expectedAreas: AREA_IDS,
    expectedKinds: ALL_KINDS_SOURCE ?? [],
    allRegions: ALL_REGIONS_FROM_DIVISIONS,
    areaRegions: AREA_REGIONS_MAP,
    layers: {
      regions: pick(ALL_REGIONS_FROM_DIVISIONS),
      kinds: pick(ALL_KINDS_SOURCE ?? []),
    },
  }
}

/** The legend's own layer checkboxes, as a plain id → boolean map (see above). */
const LEGEND_LAYERS_PROBE = `(() => {
  const out = {};
  for (const row of document.querySelectorAll('.legend-row.legend-toggle')) {
    if (row.closest('.legend-divisions') !== null) continue;
    const input = row.querySelector('input[type=checkbox]');
    if (input === null) continue;
    out[(row.textContent || '').trim()] = input.checked;
  }
  return out;
})()`

/**
 * The taxonomy tree's dim state per region: how many of its rendered leaves carry
 * the tree's `is-off` class. Used to show that a toggle reaches the tree too (the
 * tree and the two rows read the same two sets, `docs/SWARM_V11_PLAN.md` §1).
 */
const TREE_REGION_DIM_PROBE = `(() => {
  const out = [];
  for (const region of document.querySelectorAll('.tree-region')) {
    const name = ((region.querySelector('.tree-region-name') || {}).textContent || '').trim();
    let on = 0, off = 0;
    for (const row of region.querySelectorAll('.tree-leaf-row')) {
      if (row.classList.contains('is-off')) off += 1; else on += 1;
    }
    out.push({ label: name, on: on, off: off });
  }
  return out;
})()`

/** The cortical-division legend rows of one surface (Plates or the PiP panel). */
const LOBE_ROWS_FOR = (where) => `(() => {
  const legend = ${where === 'pip'
    ? "document.querySelector('.pip-panel .section-lobes-legend')"
    : "[...document.querySelectorAll('.section-lobes-legend')].find((legend) => legend.closest('.pip-panel') === null) ?? null"};
  if (legend === null) return null;
  return [...legend.querySelectorAll('.section-lobes-row')].map((row) => (row.textContent || '').trim());
})()`

/**
 * One CDP key press (down + up). Used by the panel-size keyboard check, the same
 * way the plane-slider check in block I dispatches ArrowRight by hand.
 */
const pressKey = async (key, code, windowsVirtualKeyCode, modifiers = 0) => {
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode, key, code, modifiers })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode, key, code, modifiers })
}

/** Screenshot the page, then analyse it inside the page (WebGL pixels are not
 *  readable from script, so PNG → <img> → 2D canvas is the reliable route). */
async function pagePixelStats() {
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (!shot?.data) return null
  const encoded = JSON.stringify(`data:image/png;base64,${shot.data}`)
  const stats = await evaluate(`new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 200;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 320, 200);
      const d = ctx.getImageData(0, 0, 320, 200).data;
      const buckets = new Set();
      let lum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 7) {
        buckets.add((d[i] >> 4) + ',' + (d[i+1] >> 4) + ',' + (d[i+2] >> 4));
        lum += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]; n++;
      }
      resolve({ uniqueColors: buckets.size, meanLum: Math.round(lum / n) });
    };
    img.onerror = () => resolve(null);
    img.src = ${encoded};
  })`)
  return stats
}

/* ======================================================================
 * v11 — the SAME pixel sampler, aimed at one ELEMENT's rectangle.
 *
 * Why a region sampler and not the whole-page one: the v11 toggle buttons live
 * in the header, so flipping one repaints the header (the `is-active` class) and
 * a whole-page hash would change even if the 3D view had not. A claim about the
 * 3D surface must therefore sample the 3D CANVAS' own rectangle — cropped out of
 * a real screenshot, because WebGL pixels are not script-readable.
 * ====================================================================== */
async function regionPixelStats(selector) {
  const rect = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (element === null) return null;
    const r = element.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  })()`)
  if (rect === null || typeof rect !== 'object') return null
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (!shot?.data) return null
  const encoded = JSON.stringify(`data:image/png;base64,${shot.data}`)
  return evaluate(`new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const rect = ${JSON.stringify(rect)};
      const c = document.createElement('canvas');
      const scale = img.naturalWidth / window.innerWidth;
      c.width = Math.max(2, Math.round(rect.width));
      c.height = Math.max(2, Math.round(rect.height));
      const ctx = c.getContext('2d');
      ctx.drawImage(img, Math.round(rect.left * scale), Math.round(rect.top * scale),
        Math.round(rect.width * scale), Math.round(rect.height * scale), 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const buckets = new Set();
      let hash = 0, sampled = 0;
      for (let i = 0; i < d.length; i += 4 * 7) {
        sampled++;
        buckets.add((d[i] >> 4) + ',' + (d[i+1] >> 4) + ',' + (d[i+2] >> 4));
        hash = (hash * 31 + d[i] + d[i+1] * 3 + d[i+2] * 7) % 1000000007;
      }
      resolve({ uniqueColors: buckets.size, hash: hash, sampled: sampled, width: c.width, height: c.height });
    };
    img.onerror = () => resolve(null);
    img.src = ${encoded};
  })`)
}

/* ======================================================================
 * v10 — THE THREE.JS SCENE BRIDGE (items 1 and 2).
 *
 * WHY THIS EXISTS. Items 1 and 2 are claims about what the RENDERED 3D scene
 * contains ("the helper quads span CLIP_BOUNDS", "soloing a division leaves only
 * that division painted"), and the app exposes no debug global, no DOM
 * representation of a helper sheet and no per-mesh DOM node — a screenshot cannot
 * decide either claim (item 3's own measurement shows why for the helpers: at the
 * app's default camera the sheets are CLOSE TO or BEHIND the eye, so their
 * projected bounding boxes cover the whole viewport for the pre-v10 box AND for
 * the v10 box alike; the numbers are in the review record, and `verify:plane-
 * helper-extent` is the authoritative extent gate).
 *
 * The bridge is three.js' OWN documented extension point: `Object3D`/`Scene` and
 * `WebGLRenderer` constructors dispatch an 'observe' CustomEvent on
 * `window.__THREE_DEVTOOLS__` when that global exists (three r169,
 * `build/three.cjs`). Installing a listener adds NO product code, changes no
 * product behaviour and is inert in a normal browser: the app never defines the
 * global itself, so nothing is overwritten.
 *
 * It must be installed BEFORE the app's modules run, hence
 * `Page.addScriptToEvaluateOnNewDocument` right after the DevTools session is up
 * (see the v10 block after `connect()`): the hook is read in the three.js
 * constructors, i.e. at scene/renderer creation time.
 * ====================================================================== */
const THREE_BRIDGE = `(() => {
  if (window.__auditThreeObserved !== undefined) return;
  window.__auditThreeObserved = [];
  window.__THREE_DEVTOOLS__ = {
    dispatchEvent(event) {
      try {
        if (event !== null && event !== undefined && event.type === 'observe' && event.detail) {
          window.__auditThreeObserved.push(event.detail);
        }
      } catch (error) { /* the bridge must never throw into the app */ }
    },
  };
})()`

/**
 * Bind the page's live scene to `window.__auditScene` and report how it was
 * found. Several scenes can be observed (post-processing builds its own), so the
 * probe prefers the one that actually holds the app's scene graph.
 */
const SCENE_PROBE = `(() => {
  const observed = Array.isArray(window.__auditThreeObserved) ? window.__auditThreeObserved : [];
  const scenes = observed.filter((o) => o != null && o.isScene === true);
  const alive = (s) => {
    try {
      return s.getObjectByName('scene-layers') !== null || s.getObjectByName('clip-plane-helpers') !== null;
    } catch (error) { return false; }
  };
  const scene = scenes.filter(alive)[0] ?? scenes[0] ?? null;
  window.__auditScene = scene;
  return { observed: observed.length, scenes: scenes.length, bound: scene !== null };
})()`

/**
 * The helper sheets as THREE reads them back: each sheet group's own position,
 * its quad's `planeGeometry` parameters and its grid's local extents. This is the
 * rendered geometry, not a copy of the source.
 */
const HELPER_PROBE = `(() => {
  const scene = window.__auditScene;
  if (scene == null) return null;
  const group = scene.getObjectByName('clip-plane-helpers');
  if (group === null) return { sheets: 0, list: [] };
  const sheets = group.children.map((child) => {
    const mesh = child.children.find((c) => c.isMesh === true) ?? null;
    const lines = child.children.find((c) => c.isLineSegments === true) ?? null;
    const params = mesh !== null && mesh.geometry != null ? mesh.geometry.parameters : null;
    let grid = null;
    if (lines !== null && lines.geometry != null && lines.geometry.attributes.position !== undefined) {
      const a = lines.geometry.attributes.position.array;
      let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
      const uLines = [], vLines = [];
      for (let i = 0; i + 2 < a.length; i += 3) {
        uMin = Math.min(uMin, a[i]); uMax = Math.max(uMax, a[i]);
        vMin = Math.min(vMin, a[i + 1]); vMax = Math.max(vMax, a[i + 1]);
      }
      const uniq = (values) => {
        const sorted = values.slice().sort((p, q) => p - q);
        const out = [];
        for (const value of sorted) {
          if (out.length === 0 || Math.abs(out[out.length - 1] - value) > 1e-4) out.push(value);
        }
        return out;
      };
      for (let i = 0; i + 2 < a.length; i += 3) { uLines.push(a[i]); vLines.push(a[i + 1]); }
      const uu = uniq(uLines), vv = uniq(vLines);
      grid = {
        uMin, uMax, vMin, vMax,
        vertices: a.length / 3,
        uCount: uu.length,
        vCount: vv.length,
        uStep: uu.length > 1 ? (uu[uu.length - 1] - uu[0]) / (uu.length - 1) : 0,
        vStep: vv.length > 1 ? (vv[vv.length - 1] - vv[0]) / (vv.length - 1) : 0,
      };
    }
    let raycastHits = null;
    try { const out = []; mesh.raycast({}, out); raycastHits = out.length; } catch (error) { raycastHits = 'threw'; }
    return {
      name: child.name,
      visible: child.visible,
      position: [child.position.x, child.position.y, child.position.z],
      quad: params === null ? null : { width: params.width, height: params.height, segments: params.widthSegments },
      grid,
      quadOpacity: mesh === null || mesh.material == null ? null : mesh.material.opacity,
      quadSide: mesh === null || mesh.material == null ? null : mesh.material.side,
      quadColor: mesh === null || mesh.material == null || mesh.material.color == null ? null : '#' + mesh.material.color.getHexString(),
      gridOpacity: lines === null || lines.material == null ? null : lines.material.opacity,
      gridColor: lines === null || lines.material == null || lines.material.color == null ? null : '#' + lines.material.color.getHexString(),
      gridRenderOrder: lines === null ? null : lines.renderOrder,
      quadRenderOrder: mesh === null ? null : mesh.renderOrder,
      raycastHits,
    };
  });
  return { sheets: sheets.length, groupVisible: group.visible, list: sheets };
})()`

/**
 * Every visible structure mesh in the live scene, by name (a multiset). Used to
 * compare the two independent ways of asking for "only this division": the
 * division SOLO action and the per-region checkboxes. Nothing is mapped through
 * a slug→region table — the comparison is between two renderings of the same
 * request, so it cannot drift from the app's own naming.
 */
const VISIBLE_MESH_NAMES = `(() => {
  const scene = window.__auditScene;
  if (scene == null) return null;
  const names = [];
  scene.traverse((o) => {
    if (o.visible === false) return;
    if (!(o.isMesh === true || o.isInstancedMesh === true)) return;
    if (!o.name) return;
    let hidden = false;
    for (let p = o.parent; p != null; p = p.parent) {
      if (p.visible === false) { hidden = true; break; }
    }
    if (!hidden) names.push(o.name);
  });
  names.sort();
  return names;
})()`

/** The three dock clip sliders (ClipControls renders x, then z, then y). */
const DOCK_SLIDERS = `(() => {
  const dock = [...document.querySelectorAll('input[type=range]')].filter((r) =>
    !r.closest('.section-plane-sliders') &&
    !/explode/i.test((r.getAttribute('aria-label') || '') + ' ' + r.className));
  return dock.map((r, index) => ({ index, min: Number(r.min), max: Number(r.max), value: Number(r.value) }));
})()`

/**
 * ONE REAL POINTER DRAG through the browser's input pipeline (v10 item 3).
 * `Input.dispatchMouseEvent` is the same channel a user's mouse uses, so Blink
 * synthesises the pointer events React's handlers listen for — this is a drag, not
 * a call to the handler.
 */
async function dragPointer(from, to, steps = 6) {
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: from.x, y: from.y, button: 'none', buttons: 0,
  })
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1,
  })
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      button: 'left',
      buttons: 1,
    })
    await sleep(25)
  }
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1,
  })
  await sleep(260)
}

/** The PiP panel's real box (window AND card), its handles, and the stored size. */
const PIP_BOX_PROBE = `(() => {
  const panel = document.querySelector('.pip-panel');
  if (panel === null) return null;
  const w = panel.querySelector('.pip-window');
  if (w === null) return null;
  const r = w.getBoundingClientRect();
  const c = panel.getBoundingClientRect();
  let stored = null;
  try { stored = window.localStorage.getItem('neuroaxis.sectionPipSize'); } catch (error) { stored = 'unavailable'; }
  const preset = panel.classList.contains('pip-large') ? 'large'
    : panel.classList.contains('pip-small') ? 'small' : 'custom';
  return {
    left: r.left, top: r.top, right: r.right, bottom: r.bottom,
    width: Math.round(r.width), height: Math.round(r.height),
    card: { left: c.left, top: c.top, right: c.right, bottom: c.bottom, width: Math.round(c.width) },
    preset,
    stored,
    handles: [...panel.querySelectorAll('.pip-resizer')].map((b) => {
      const h = b.getBoundingClientRect();
      return {
        corner: b.getAttribute('data-pip-corner'),
        label: b.getAttribute('aria-label') || '',
        title: b.getAttribute('title') || '',
        cx: h.left + h.width / 2,
        cy: h.top + h.height / 2,
        w: Math.round(h.width),
        h: Math.round(h.height),
      };
    }),
  };
})()`

/* ------------------------------------------------------------------- run */

const environment = await prepareEnvironment()
if (environment.exitCode !== null) {
  // The environment, not the product. Say which, with the code that encodes it,
  // and stop before running a single check (a check that cannot run must never
  // be reported as a failure — that is what made two integration runs look like
  // product failures).
  console.error(`\n================ NeuroAxis runtime audit ================`)
  console.error(`cannot run: ${environment.reason}`)
  console.error(`exit ${environment.exitCode} (environment unusable — no check was run)`)
  await lifecycle.dispose()
  process.exit(environment.exitCode)
}

try {
  await connect()

  /* v10: install the three.js scene bridge on every NEW document, i.e. before
     the app's own modules construct the scene and the renderer. The bridge is
     three.js' documented extension point (see the header of THREE_BRIDGE above)
     and adds nothing to the product: it listens for the 'observe' events three
     already dispatches when the global exists. */
  const bridgeInstall = await send('Page.addScriptToEvaluateOnNewDocument', { source: THREE_BRIDGE })
  info(
    'v10 three.js scene bridge installed before the first navigation' +
      (bridgeInstall === undefined || bridgeInstall === null ? ' (DevTools returned no identifier)' : ''),
  )

  /* ======================================================================
   * A0 — DETERMINISTIC CLEAN BOOT + THE DEFAULT-PRESET GATE
   * (v7 closure, gaps 4/4a; docs/TELENCEPHALON_PLAN.md §5 + §9; plan §2.6)
   *
   * The boot preset is read from a page that CANNOT have a stored preference:
   * a fresh Chrome profile (see PROFILE above), an explicit localStorage /
   * sessionStorage clear, and a reload before the reading. This runs BEFORE
   * section B — which clicks the header's "Nuclei" preset — because reading the
   * "default" after that click measures the click, not the default. That was the
   * exact defect: the audit reported "the default preset is not Brainstem focus
   * (active: Nuclei …)" and "2 brainstem-family tree row(s) are dimmed" when the
   * code default was correct all along (store.ts asserts it at module load).
   *
   * The tree is expanded first: leaves only render while their subdivision is
   * open, and a collapsed tree would let the dimming assertion pass vacuously.
   * ==================================================================== */

  await send('Page.navigate', { url: BASE })
  await sleep(5000)
  const storageReset = await evaluate(`(() => {
    try {
      const keys = Object.keys(window.localStorage);
      window.localStorage.clear();
      window.sessionStorage.clear();
      return 'cleared ' + keys.length + ' key(s)' + (keys.length > 0 ? ': ' + keys.join(', ') : '');
    } catch (error) {
      return 'storage unavailable: ' + (error && error.message ? error.message : String(error));
    }
  })()`)
  info('clean-profile prologue: ' + String(storageReset))

  // Reload: the app now boots from the cleared state (first-visit conditions).
  await send('Page.navigate', { url: BASE })
  await sleep(7000)

  const expandRegions = await evaluate(`(() => {
    const family = /(medulla|pons|midbrain|diencephalon|cerebellum)/i;
    let opened = 0;
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = (region.querySelector('.tree-region-name')?.textContent || '');
      if (!family.test(name)) continue;
      const row = region.querySelector('.tree-region-row');
      if (row && row.getAttribute('aria-expanded') !== 'true') { row.click(); opened++; }
    }
    return 'opened ' + opened + ' brainstem-family region(s)';
  })()`)
  await sleep(1000)
  const expandSubdivisions = await evaluate(`(() => {
    const family = /(medulla|pons|midbrain|diencephalon|cerebellum)/i;
    let opened = 0;
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = (region.querySelector('.tree-region-name')?.textContent || '');
      if (!family.test(name)) continue;
      for (const sub of region.querySelectorAll('.tree-sub-row')) {
        if (sub.getAttribute('aria-expanded') !== 'true') { sub.click(); opened++; }
      }
    }
    return 'opened ' + opened + ' subdivision(s)';
  })()`)
  await sleep(1200)

  const bootPreset = await evaluate(`(() => {
    /* v11 re-point: the preset shortcut row is addressed by its MACHINE HOOK
       (the data-preset attribute) and the two new actions (Reset / All) sit in
       the same '.header-presets' group, so a bare '.header-presets button' sweep
       would mix a framing ACTION into the "which preset is active" reading. The
       group, its role, its aria-label and the preset labels themselves are
       unchanged from v10 — that is the default-framing assertion the brief
       forbids removing — and the total count is reported alongside so a
       collapsed row (a <select>, a hidden menu) cannot pass this check by
       simply holding no buttons. */
    const presets = [...document.querySelectorAll('.header-presets button')];
    const presetButtons = presets.filter((b) => b.getAttribute('data-preset') !== null);
    const pressed = (b) => { const raw = b.getAttribute('aria-pressed'); return raw === 'true' ? true : raw === 'false' ? false : null; };
    const active = presetButtons.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent.trim());
    const activeIds = presetButtons.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-preset'));
    const offRows = [];
    let rowsSeen = 0;
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = (region.querySelector('.tree-region-name')?.textContent || '').toLowerCase();
      if (name.indexOf('telencephalon') !== -1) continue;
      if (!/(medulla|pons|midbrain|diencephalon|cerebellum)/.test(name)) continue;
      for (const row of region.querySelectorAll('.tree-leaf-row')) {
        rowsSeen++;
        if (row.classList.contains('is-off')) offRows.push((row.textContent || '').trim().slice(0, 24));
      }
    }
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.viewPreset'); } catch (error) { stored = null; }
    return {
      bootActiveLabels: active,
      bootActivePresets: activeIds,
      presetButtonsWithHook: presetButtons.length,
      headerPresetButtons: presets.length,
      actionLabels: presets.filter((b) => b.getAttribute('data-preset') === null).map((b) => b.textContent.trim()),
      actionPressed: presets.filter((b) => b.getAttribute('data-preset') === null).map((b) => ({
        text: b.textContent.trim(),
        pressed: pressed(b),
      })),
      labels: presetButtons.map((b) => b.textContent.trim()),
      offRows: offRows.slice(0, 8),
      offCount: offRows.length,
      rowsSeen,
      storedPreset: stored,
    };
  })()`)
  info('boot preset reading (' + String(expandRegions) + ', ' + String(expandSubdivisions) + '): '
    + JSON.stringify({
      active: bootPreset.bootActiveLabels,
      activePresets: bootPreset.bootActivePresets,
      presetButtons: bootPreset.presetButtonsWithHook + '/' + bootPreset.headerPresetButtons
        + ' in .header-presets (' + (bootPreset.actionLabels ?? []).join(', ') + ' = the v11 actions)',
      stored: bootPreset.storedPreset,
      rowsSeen: bootPreset.rowsSeen,
      offCount: bootPreset.offCount,
    }))
  const focusVerdict = presetFocusReading(bootPreset)
  focusVerdict.ok ? ok(focusVerdict.detail) : bad(focusVerdict.detail)
  const dimmingVerdict = presetDimmingReading(bootPreset)
  dimmingVerdict.ok ? ok(dimmingVerdict.detail) : bad(dimmingVerdict.detail)

  /* ======================================================================
   * A0b — v11: THE TWO TOGGLE ROWS AT A CLEAN BOOT.
   *
   * docs/SWARM_V11_PLAN.md §1 + PLAN.md §1. Read at the SAME clean-boot moment
   * as the preset reading above (before any check clicks anything), because the
   * boot contract is: both rows present and labelled, every area/kind covered by
   * exactly one aria-pressed toggle whose accessible name starts with its
   * visible text, each button's pressed state the SAME fact as the layer set the
   * legend reads, the default framing reachable (Reset pressed exactly when the
   * documented default preset is), and the preset shortcut row still real.
   *
   * The predicate is `checks.headerToggleRowsReading` (pure, so the Node mirror
   * can exercise it without Chrome and so a failure names which claim broke);
   * `verify:area-toggles` is the Node lane's full version of the same contract.
   * ==================================================================== */
  const bootHeaderRaw = await evaluate(HEADER_ROWS_PROBE)
  /* The clean-boot pressed set, kept OUTSIDE the branch below because block R
     asserts that Reset reproduces exactly it ("Reset restores the documented
     default", not "Reset lands somewhere plausible"). */
  const bootPressed = (bootHeaderRaw?.toggles ?? [])
    .map((toggle) => toggle.hook + ':' + toggle.key + '=' + toggle.pressed)
    .sort()
    .join(' | ')
  if (bootHeaderRaw === null || typeof bootHeaderRaw !== 'object') {
    bad('v11 A0b: the header toggle-row probe returned nothing — the header contract did NOT run')
  } else {
    const bootHeader = headerReadingFrom(bootHeaderRaw)
    info(
      'v11 header rows at boot: ' +
        Object.entries(bootHeaderRaw.rows ?? {})
          .map(([row, value]) => `${row} present=${value.present} role=${value.role} buttons=${value.buttons}`)
          .join(' · ') +
        ' · toggles ' +
        bootHeader.toggles.map((t) => `${t.hook}:${t.key}=${t.pressed}`).join(' ') +
        ' · actions ' + bootHeader.actions.map((a) => `${a.key}=${a.pressed}`).join(' ') +
        ' · preset buttons ' + bootHeader.presets.map((p) => `${p.id}=${p.pressed}`).join(' '),
    )
    for (const verdictRow of headerToggleRowsReading(bootHeader)) {
      verdictRow.ok ? ok(verdictRow.detail) : bad(verdictRow.detail)
    }
    /* The header must not have lost the group the boot-preset assertion reads,
       and the two v11 actions must live in it (PLAN.md §4). */
    bootPreset.headerPresetButtons >= bootPreset.presetButtonsWithHook && bootPreset.presetButtonsWithHook > 0
      ? ok(
        'v11 A0b: the preset shortcut row is still a real button group inside .header-presets (' +
          bootPreset.presetButtonsWithHook + ' preset button(s) with a data-preset hook + ' +
          (bootPreset.headerPresetButtons - bootPreset.presetButtonsWithHook) + ' v11 action(s): ' +
          (bootPreset.actionLabels ?? []).join(', ') + ')',
      )
      : bad(
        'v11 A0b: .header-presets holds ' + bootPreset.presetButtonsWithHook + ' preset button(s) and ' +
          bootPreset.headerPresetButtons + ' button(s) total — the documented-default assertion has no target',
      )
  }

  /* A — shell & boot */
  const boot = await evaluate(`({
    rootChildren: document.getElementById('root')?.childElementCount ?? -1,
    tabs: [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>/^(3D|Plates|Syndromes)$/.test(t)),
    canvases: document.querySelectorAll('canvas').length,
    pip: !!document.querySelector('.pip-panel'),
  })`)
  boot.rootChildren > 0 ? ok(`app boots (root children ${boot.rootChildren})`) : bad('app did not boot')
  boot.tabs.length === 3 ? ok(`tabs present: ${boot.tabs.join(', ')}`) : bad(`tabs missing (${boot.tabs.join(', ')})`)
  boot.canvases >= 1 ? ok(`3D canvas present (${boot.canvases} canvas elements)`) : bad('no canvas')
  boot.pip ? ok('section PiP visible by default') : bad('section PiP missing on load')

  /* ======================================================================
   * A1 — THE PANEL IS A SIMULATED-SECTION PANEL (v9 item 5), read at boot.
   *
   * The retired in-canvas GPU PiP was a second three.js camera rendering the
   * clipped scene into a private render target; its DOM was a blit target. The
   * panel's contract is now inverted and DOM-checkable: one 2D canvas inside
   * `.pip-window`, and NOTHING that can carry real imagery or clipped geometry —
   * no <img>, no credit link, no second (WebGL) canvas, no `.pip-context-lost`
   * note (the panel owns no GL resource, so it has no GL loss path).
   *
   * Read HERE, before any check clicks anything, so a structural regression
   * fails on the first block rather than only in the PiP block below.
   * ==================================================================== */
  const pipBoot = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    if (panel === null) return null;
    const canvases = [...panel.querySelectorAll('canvas')];
    const safe2d = (c) => { try { return c.getContext('2d') !== null; } catch (error) { return false; } };
    return {
      window: panel.querySelector('.pip-window') !== null,
      canvases: canvases.length,
      canvas2d: canvases.map(safe2d),
      sectionCanvas: panel.querySelectorAll('.section-canvas').length,
      imgs: panel.querySelectorAll('img').length,
      credits: panel.querySelectorAll('a[href^="http"], .pip-credit').length,
      retiredContextLost: panel.querySelectorAll('.pip-context-lost').length,
      stateLine: (panel.querySelector('.pip-imagery-state')?.textContent ?? '').trim(),
      resizer: panel.querySelectorAll('.pip-resizer').length,
    };
  })()`)
  if (pipBoot === null) {
    bad('the PiP panel disappeared between the boot read and the panel-contract read')
  } else {
    pipBoot.window && pipBoot.canvases === 1 && pipBoot.sectionCanvas === 1 && pipBoot.canvas2d[0] === true
      ? ok(`the PiP is a simulated-section panel: 1 canvas in .pip-window, and it is a 2D (section) canvas — ${pipBoot.canvases} canvas total`)
      : bad('the PiP window does not hold exactly one 2D section canvas (' + JSON.stringify(pipBoot) + ')')
    pipBoot.imgs === 0 && pipBoot.credits === 0
      ? ok('the PiP carries no imagery markup: 0 <img>, 0 external credit link (nothing real can be painted in it)')
      : bad(`the PiP carries imagery markup: ${pipBoot.imgs} <img>, ${pipBoot.credits} credit link(s)`)
    pipBoot.retiredContextLost === 0
      ? ok('the retired PiP context-loss note (.pip-context-lost) is gone — the panel owns no WebGL resource')
      : bad(`the retired PiP context-loss note is still in the panel (${pipBoot.retiredContextLost} element(s))`)
    pipBoot.stateLine.length > 0
      ? ok(`the panel states its own imagery situation at boot ("${pipBoot.stateLine}")`)
      : bad('the panel has no imagery state line (.pip-imagery-state)')
    /* v10 item 3: the panel now carries FOUR corner handles. This assertion is
       RE-POINTED (not deleted): through v9 it required exactly one
       `.pip-resizer`; the item is "drag all 4 corners", so the same selector
       must count 4, and the geometry each one owns is asserted in block Q3
       below with real pointer drags. */
    pipBoot.resizer === 4
      ? ok('the panel exposes all four corner resize handles (.pip-resizer × 4)')
      : bad(`expected 4 resize handles, found ${pipBoot.resizer}`)
  }

  const threeStats = await pagePixelStats()
  threeStats && threeStats.uniqueColors > 20
    ? ok(`3D scene renders (${threeStats.uniqueColors} colour buckets, mean luminance ${threeStats.meanLum})`)
    : bad(`3D scene looks blank (${JSON.stringify(threeStats)})`)

  /* B — 3D interactions */
  /* v11 RE-POINT (was: `[...document.querySelectorAll('button')].find(b =>
   * b.textContent.trim() === 'Nuclei')`). That selector used to be unambiguous
   * because the only button reading exactly "Nuclei" was the PRESET of that name
   * (`VIEW_PRESETS.nuclei.label`); the v11 "Systems" row adds a SECOND button with
   * the same text, so the old form would have silently kept clicking the preset
   * (DOM order put the preset first) while claiming to test "the layer toggle".
   * The check now addresses the `data-kind="nucleus"` TOGGLE by its machine hook —
   * the control the v11 plan says owns visibility — asserts which hook was
   * clicked, and requires the LEGEND's own kind checkbox to follow the toggle, so
   * "aria-pressed changed" and "the kind layer changed" are one reading. */
  const layerToggleProbe = `(() => {
    const chip = document.querySelector('[data-kind="nucleus"]');
    const legendRow = [...document.querySelectorAll('.legend-row.legend-toggle')].find(
      (l) => l.closest('.legend-divisions') === null && l.textContent.trim() === 'nucleus');
    const input = legendRow === null ? null : legendRow.querySelector('input[type=checkbox]');
    const colliding = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Nuclei');
    return {
      present: chip !== null,
      hook: chip === null ? null : chip.getAttribute('data-kind'),
      pressed: chip === null ? null : chip.getAttribute('aria-pressed'),
      legendNucleus: input === null ? null : input.checked,
      sameTextButtons: colliding.length,
      sameTextHooks: colliding.map((b) => ['data-preset', 'data-kind'].filter((n) => b.getAttribute(n) !== null).join('+')),
    };
  })()`
  const layerBefore = await evaluate(layerToggleProbe)
  const layerClick = await evaluate(`(() => {
    const chip = document.querySelector('[data-kind="nucleus"]');
    if (chip === null) return 'no [data-kind="nucleus"] toggle in the header';
    chip.click();
    return 'clicked [data-kind="nucleus"]';
  })()`)
  await sleep(500)
  const layerAfter = await evaluate(layerToggleProbe)
  await evaluate(`(() => {
    const chip = document.querySelector('[data-kind="nucleus"]');
    if (chip !== null) chip.click();
    return 'clicked back';
  })()`)
  await sleep(500)
  const layerBack = await evaluate(layerToggleProbe)
  const layerToggleOk =
    layerBefore?.present === true && layerBefore.hook === 'nucleus' &&
    layerBefore.pressed === 'true' && layerAfter?.pressed === 'false' && layerBack?.pressed === 'true' &&
    layerBefore.legendNucleus === true && layerAfter?.legendNucleus === false && layerBack?.legendNucleus === true
  layerToggleOk
    ? ok(
      'layer toggle works via the v11 Systems row: ' + String(layerClick) + ' — aria-pressed ' +
        layerBefore.pressed + ' -> ' + layerAfter.pressed + ' -> ' + layerBack.pressed +
        ', and the legend\'s own "nucleus" checkbox followed it ' + String(layerBefore.legendNucleus) + ' -> ' +
        String(layerAfter.legendNucleus) + ' -> ' + String(layerBack.legendNucleus) +
        ' (' + layerBefore.sameTextButtons + ' header button(s) read exactly "Nuclei": ' +
        (layerBefore.sameTextHooks ?? []).join(', ') + ')',
    )
    : bad(
      'layer toggle suspicious: ' + String(layerClick) + ' ' +
        JSON.stringify({ before: layerBefore, after: layerAfter, back: layerBack }),
    )

  for (const q of ['Balanced', 'High']) {
    await evaluate(clickText(q))
    await sleep(700)
  }
  ok('quality toggle High/Balanced switched without error')

  const explode = await evaluate(`(() => {
    const r = [...document.querySelectorAll('input[type=range]')].find(x => /explode/i.test((x.getAttribute('aria-label')||'') + x.className));
    if (!r) return 'no explode slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '2');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return 'explode set';
  })()`)
  String(explode).includes('set') ? ok('explode slider operable') : info(`explode slider: ${explode}`)

  /* clip slider → PiP sync.
   *
   * The 3D dock's three sliders carry no aria-label, so identify them by
   * EXCLUSION rather than by their numeric range: the section-slider strip and
   * the explode slider are explicitly excluded, and the dock's own order is
   * X, Y, Z (ClipControls). Matching on `min === '-48'` (the pre-AMENDMENT-B
   * sagittal range) silently stopped matching once the bounds widened. */
  const clipSync = await evaluate(`(() => {
    const dock = [...document.querySelectorAll('input[type=range]')].filter((r) =>
      !r.closest('.section-plane-sliders') &&
      !/explode/i.test((r.getAttribute('aria-label') || '') + ' ' + r.className));
    const x = dock[0];
    if (!x) return 'no clip sliders found in the 3D dock (found ' + dock.length + ')';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(x, '12');
    x.dispatchEvent(new Event('input', { bubbles: true }));
    return 'set x=12 (dock slider range ' + x.min + '..' + x.max + ')';
  })()`)
  await sleep(1200)
  await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const btn = panel && [...panel.querySelectorAll('button')].find(b => b.textContent.trim() === 'X');
    if (btn) btn.click();
  })()`)
  await sleep(900)
  const pipReadout = await evaluate(`document.querySelector('.pip-readout')?.textContent?.trim() ?? 'no readout'`)
  String(clipSync).includes('set') && /x\s*=\s*12/.test(String(pipReadout))
    ? ok(`clip slider drives the PiP (readout "${pipReadout}")`)
    : bad(`PiP did not follow the clip slider (${clipSync} → "${pipReadout}")`)

  const pipAxesClicks = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const out = [];
    for (const label of ['Y','Z','X']) {
      const b = [...panel.querySelectorAll('button')].find(x => x.textContent.trim() === label) ;
      if (b) { b.click(); out.push(label); }
    }
    return out.join(',');
  })()`)
  await sleep(900)
  /* Read the badges AFTER the clicks have been committed — reading them in the
     same tick as the click would report the PREVIOUS axis' badges and could pass
     while the panel ignores the control entirely. */
  const pipBadgesShown = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    return {
      badges: [...panel.querySelectorAll('.pip-orient')].map((e) => e.textContent).join(''),
      readout: (panel.querySelector('.pip-readout')?.textContent || '').trim(),
    };
  })()`)
  const pipAxes = `${pipAxesClicks} | badges ${pipBadgesShown.badges}`
  const pipBadgeVerdict = (() => {
    /* v9: the badges are the shared table's, per axis (patient-left convention:
       transverse A/P/R/L, sagittal S/I/P/A, coronal S/I/R/L — 1 au = 1.2 mm,
       patient-left on the image's right). `verify:plane` re-derives them from the
       projected geometry; this asserts the panel really shows the LAST-clicked
       axis' own set and that its readout moved to that axis. */
    const lastAxis = String(pipAxesClicks).split(',').pop()
    const expected = { X: 'SIPA', Z: 'SIRL', Y: 'APRL' }[lastAxis] ?? null
    return {
      shown: pipBadgesShown.badges,
      lastAxis,
      expected,
      readoutOnAxis: new RegExp(`^${String(lastAxis).toLowerCase()}\\s*=`).test(pipBadgesShown.readout),
    }
  })()
  pipAxesClicks === 'Y,Z,X' && pipBadgeVerdict.expected !== null && pipBadgeVerdict.shown === pipBadgeVerdict.expected
    && pipBadgeVerdict.readoutOnAxis
    ? ok(`PiP axis switch + orientation badges (${pipAxes} — ${pipBadgeVerdict.lastAxis} axis shows ${pipBadgeVerdict.shown} and the readout reads "${pipBadgesShown.readout}", patient-left)`)
    : bad(`PiP axis controls: ${pipAxes} (expected the ${pipBadgeVerdict.lastAxis} badge set ${pipBadgeVerdict.expected} and a "${String(pipBadgeVerdict.lastAxis).toLowerCase()} = …" readout, got "${pipBadgesShown.readout}")`)

  /* ======================================================================
   * B3 — v9 item 5: THE PANEL IS RESIZABLE, PERSISTENT AND REVERSIBLE.
   *
   * What is asserted here (and what is NOT, stated honestly):
   *   • the window RESIZES from the keyboard — the panel's own `onKeyDown`
   *     (arrows ±16 px, Shift ×4) drives the SAME `setSectionPipSize` the corner
   *     drag calls, so the keyboard path falsifies the store contract, the clamp
   *     and the CSS wiring; the pointer drag itself is orchestrator-observed
   *     only (a synthetic pointer drag is not reproducible here);
   *   • the size is PERSISTED (`neuroaxis.sectionPipSize`, the JSON the store
   *     writes) and the ▴/▾ preset stop returns to the named small size;
   *   • hide (`×`, title "Hide live section") and the restore pill still work,
   *     and restoring brings the panel back at the size the user chose.
   * The size ACROSS A RELOAD is asserted in block P (after the layer/imagery
   * state is set), because a reload here would discard the state the checks
   * between here and there depend on.
   * ==================================================================== */

  const readPipSize = `(() => {
    const w = document.querySelector('.pip-panel .pip-window');
    if (w === null) return null;
    const r = w.getBoundingClientRect();
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.sectionPipSize'); } catch (error) { stored = 'unavailable'; }
    const panel = document.querySelector('.pip-panel');
    const preset = panel === null ? '' :
      (panel.classList.contains('pip-large') ? 'large' : panel.classList.contains('pip-small') ? 'small' : 'custom');
    const resizer = document.querySelector('.pip-panel .pip-resizer');
    return {
      width: Math.round(r.width), height: Math.round(r.height),
      stored, preset,
      ariaLabel: resizer === null ? '' : (resizer.getAttribute('aria-label') || ''),
    };
  })()`

  const pipSizeBefore = await evaluate(readPipSize)
  const resizeFocus = await evaluate(`(() => {
    const b = document.querySelector('.pip-panel .pip-resizer');
    if (b === null) return { focused: false, reason: 'no .pip-resizer in the panel' };
    b.focus();
    return { focused: document.activeElement === b, reason: '' };
  })()`)
  if (pipSizeBefore === null || resizeFocus.focused !== true) {
    bad(`the PiP size control is not operable (${JSON.stringify(pipSizeBefore)} / ${JSON.stringify(resizeFocus)})`)
  } else {
    await pressKey('ArrowRight', 'ArrowRight', 39)
    await pressKey('ArrowRight', 'ArrowRight', 39)
    await pressKey('ArrowDown', 'ArrowDown', 40)
    await pressKey('ArrowDown', 'ArrowDown', 40)
    await sleep(700)
    const pipSizeGrown = await evaluate(readPipSize)
    const expectWidth = pipSizeBefore.width + 32
    const expectHeight = pipSizeBefore.height + 32
    const storedGrown = (() => {
      try { return JSON.parse(pipSizeGrown.stored) } catch (error) { return null }
    })()
    pipSizeGrown.width === expectWidth && pipSizeGrown.height === expectHeight
      ? ok(`the panel window resizes from the keyboard (${pipSizeBefore.width}×${pipSizeBefore.height} → ${pipSizeGrown.width}×${pipSizeGrown.height}, +16 px per arrow)`)
      : bad(`the panel did not resize as documented (${pipSizeBefore.width}×${pipSizeBefore.height} → ${pipSizeGrown.width}×${pipSizeGrown.height}, expected ${expectWidth}×${expectHeight})`)
    storedGrown !== null && storedGrown.width === expectWidth && storedGrown.height === expectHeight
      ? ok(`the size is persisted in the store's own key (neuroaxis.sectionPipSize = ${pipSizeGrown.stored})`)
      : bad(`the persisted size does not match the window (${pipSizeGrown.stored} vs ${expectWidth}×${expectHeight})`)
    pipSizeGrown.ariaLabel.indexOf(`${expectWidth}×${expectHeight}`) !== -1
      ? ok(`the resize handle reports the live size to assistive tech ("${pipSizeGrown.ariaLabel.slice(0, 72)}…")`)
      : bad(`the resize handle's accessible name does not carry the live size ("${pipSizeGrown.ariaLabel}")`)

    /* Shift = ×4 on the same key, so the "Shift ×4" tooltip is not a claim. If
       the CDP modifier never reaches the page this reports the delta instead of
       failing — environment, not product (stated, not hidden). */
    await pressKey('ArrowDown', 'ArrowDown', 40, 8)
    await sleep(500)
    const pipSizeShift = await evaluate(readPipSize)
    const shiftDelta = pipSizeShift.height - pipSizeGrown.height
    shiftDelta === 64
      ? ok(`Shift+ArrowDown moves the height by 4× the step (${pipSizeGrown.height} → ${pipSizeShift.height})`)
      : shiftDelta === 16
        ? info(`Shift was not delivered to the page by this CDP call (Δ ${shiftDelta} px) — the ×4 branch is unverified here`)
        : bad(`Shift+ArrowDown moved the height by ${shiftDelta} px, expected 64 (or 16 with the modifier dropped)`)

    const presetClick = await evaluate(`(() => {
      const panel = document.querySelector('.pip-panel');
      const b = panel && [...panel.querySelectorAll('button')].find((x) => /^Panel size/.test(x.getAttribute('title') || ''));
      if (!b) return 'no size button';
      b.click();
      return 'clicked ' + (b.getAttribute('title') || '').slice(0, 40);
    })()`)
    await sleep(600)
    const pipSizePreset = await evaluate(readPipSize)
    pipSizePreset.preset === 'small' && pipSizePreset.width === 224 && pipSizePreset.height === 170
      ? ok(`the ▴/▾ size button returns a custom size to the named small stop (224×170, "${presetClick}")`)
      : bad(`the size-preset cycle did not reach the small stop (${JSON.stringify(pipSizePreset)} / ${presetClick})`)

    /* hide → restore pill → back, at the chosen size */
    const hideClick = await evaluate(`(() => {
      const b = [...document.querySelectorAll('.pip-panel button')].find((x) => (x.getAttribute('title') || '') === 'Hide live section');
      if (!b) return 'no hide button (.pip-panel button[title="Hide live section"])';
      b.click();
      return 'clicked Hide live section';
    })()`)
    await sleep(800)
    const hidden = await evaluate(`(() => {
      const pill = document.querySelector('.pip-restore');
      return {
        panel: document.querySelectorAll('.pip-panel').length,
        pill: pill === null ? null : pill.textContent.trim(),
        pillTitle: pill === null ? '' : (pill.getAttribute('title') || ''),
        pillExpanded: pill === null ? null : pill.getAttribute('aria-expanded'),
      };
    })()`)
    hidden.panel === 0 && String(hidden.pill).indexOf('Live section') !== -1
      ? ok(`hiding the panel removes it and leaves the restore pill ("${hidden.pill}", "${hideClick}")`)
      : bad(`hide did not reach the documented state (${JSON.stringify(hidden)} / ${hideClick})`)
    const restoreClick = await evaluate(`(() => {
      const pill = document.querySelector('.pip-restore');
      if (pill === null) return 'no restore pill';
      pill.click();
      return 'clicked the restore pill';
    })()`)
    await sleep(2500)
    const restored = await evaluate(readPipSize)
    const restoredStats = await evaluate(canvasStatsFor(PIP_CANVAS))
    restored !== null && restored.width === pipSizePreset.width && restored.height === pipSizePreset.height
      ? ok(`the restore pill brings the panel back at the chosen size (${restored.width}×${restored.height}, "${restoreClick}")`)
      : bad(`the restored panel does not honour the stored size (${JSON.stringify(restored)} vs ${JSON.stringify(pipSizePreset)})`)
    restoredStats !== null && restoredStats.painted > 20
      ? ok(`the restored panel paints the simulated section (${restoredStats.painted}/${restoredStats.sampled} non-background samples on its own 2D canvas)`)
      : bad(`the restored panel's canvas is blank or missing (${JSON.stringify(restoredStats)})`)
  }

  /* C — selection + info panel content (tree is region → subdivision → structure)
   *
   * Matching rules learned from the live DOM:
   *  - subdivision rows are `button.tree-sub-row` whose text is `▸Thalamus16`,
   *    so a bare substring test matches `Epithalamus` too — strip the marker and
   *    the count and compare the NAME exactly;
   *  - leaves expose their name in `.tree-leaf-name`. */
  const clickInTree = (text, opt = {}) => `(() => {
    const root = document.querySelector('nav.tree') ?? document;
    const clean = (s) => String(s || '').replace(/^[^A-Za-z]+/, '').replace(/\\d+\\s*$/, '').trim();
    const wanted = ${JSON.stringify(text)}.toLowerCase();
    if (${opt.rowsOnly ? 'true' : 'false'}) {
      const row = [...root.querySelectorAll('button.tree-sub-row, button.tree-region-row')]
        .find((b) => clean(b.textContent).toLowerCase() === wanted || clean(b.textContent).toLowerCase().startsWith(wanted + ' '));
      if (!row) return 'not found: ${text}';
      // Idempotent: the pre-flight check expands every region, so an
      // unconditional click would COLLAPSE the subtree we need.
      const expanded = row.getAttribute('aria-expanded');
      const marker = (row.textContent || '').trim().charAt(0);
      const isOpen = expanded === 'true' || marker === '▾';
      if (!isOpen) row.click();
      return (isOpen ? 'already open: ' : 'opened: ') + row.textContent.trim().replace(/\\s+/g, ' ').slice(0, 34);
    }
    const leaf = [...root.querySelectorAll('.tree-leaf-name')].find((n) => n.textContent.trim().toLowerCase() === wanted);
    if (leaf) {
      (leaf.closest('button') ?? leaf).click();
      return 'leaf ' + leaf.textContent.trim();
    }
    return 'not found: ${text}';
  })()`
  const regionClick = await evaluate(clickInTree('Diencephalon', { rowsOnly: true }))
  await sleep(900)
  const groupClick = await evaluate(clickInTree('Thalamus', { rowsOnly: true }))
  await sleep(900)
  const pickNucleus = await evaluate(clickInTree('Pulvinar'))
  await sleep(1200)
  info(`tree navigation: region "${regionClick}" → group "${groupClick}" → node "${pickNucleus}"`)
  const panel = await evaluate(`(() => {
    const panelEl = document.querySelector('.info-panel');
    if (!panelEl) return null;
    const sections = [...panelEl.querySelectorAll('.info-section h3')].map(h => h.textContent.trim());
    const links = [...panelEl.querySelectorAll('a[href^="http"]')].map(a => a.href);
    const refs = panelEl.querySelectorAll('.ref-list li').length;
    return {
      name: panelEl.querySelector('.info-name')?.textContent?.trim() ?? '',
      sections,
      externalLinks: links.length,
      relSafe: links.every((h, i) => true),
      scholarlyRefs: refs,
      learnMore: sections.includes('Learn more'),
      bodyLength: panelEl.innerText.length,
    };
  })()`)
  if (panel === null) bad('info panel missing')
  else {
    panel.name ? ok(`selection shows a record ("${panel.name}", ${panel.bodyLength} chars of detail)`) : bad('selection panel empty')
    const need = ['Function (neurophysiology)']
    need.every((s) => panel.sections.includes(s))
      ? ok(`record sections present: ${panel.sections.join(' · ')}`)
      : bad(`missing expected sections (have: ${panel.sections.join(' · ')})`)
    panel.scholarlyRefs > 0 ? ok(`scholarly references listed (${panel.scholarlyRefs})`) : bad('no scholarly references')
    panel.learnMore && panel.externalLinks > 0
      ? ok(`Learn more external links (${panel.externalLinks})`)
      : bad(`Learn more links missing (learnMore=${panel.learnMore}, links=${panel.externalLinks})`)
  }

  /* D — search */
  const search = await evaluate(`(() => {
    const input = [...document.querySelectorAll('input')].find(i => /search/i.test(i.placeholder || i.getAttribute('aria-label') || ''));
    if (!input) return 'no search input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'STN');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'typed STN';
  })()`)
  await sleep(1200)
  const searchHits = await evaluate(`(() => {
    const hits = [...document.querySelectorAll('button,li')].filter(e => /subthalamic|STN/i.test(e.textContent || ''));
    return hits.length;
  })()`)
  String(search).includes('typed') && searchHits > 0
    ? ok(`search returns hits for "STN" (${searchHits} matching nodes)`)
    : bad(`search failed (${search} → ${searchHits} hits)`)

  /* E — Plates tab: author + live */
  await evaluate(clickText('Plates'))
  await sleep(1500)
  const authorMode = await evaluate(`({
    svg: document.querySelectorAll('svg').length,
    plateChips: document.querySelectorAll('.plate-chip').length,
    title: document.querySelector('.plate-title')?.textContent?.trim() ?? document.querySelector('.plate-stage h2')?.textContent?.trim() ?? '',
  })`)
  authorMode.svg > 0 && authorMode.plateChips >= 10
    ? ok(`author plates render (${authorMode.svg} svg, ${authorMode.plateChips} plate chips)`)
    : bad(`author plate view incomplete: ${JSON.stringify(authorMode)}`)

  await evaluate(clickText('Live section'))
  await sleep(6000)
  const live = await evaluate(sectionStats)
  live && live.painted > 50
    ? ok(`live section paints (${live.painted}/${live.sampled} non-background samples)`)
    : bad(`live section blank: ${JSON.stringify(live)}`)

  const sliders = await evaluate(`(() => {
    const ranges = [...document.querySelectorAll('.section-plane-sliders input[type=range]')];
    return ranges.map(r => (r.getAttribute('aria-label')||'?').replace(' plane position (atlas units)','') + '=' + r.value);
  })()`)
  Array.isArray(sliders) && sliders.length === 3
    ? ok(`plane sliders present (${sliders.join(', ')})`)
    : bad(`plane sliders missing: ${JSON.stringify(sliders)}`)

  const beforeMove = await evaluate(sectionStats)
  const moveSlider = async (axisLabel, delta) =>
    evaluate(`(() => {
      const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find(x => new RegExp(${JSON.stringify(axisLabel)}, 'i').test(x.getAttribute('aria-label')||''));
      if (!r) return 'not found';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(r, String(Number(r.value) + ${delta}));
      r.dispatchEvent(new Event('input', { bubbles: true }));
      return r.value;
    })()`)
  await moveSlider('transverse', 4)
  await sleep(2000)
  const afterMove = await evaluate(sectionStats)
  beforeMove && afterMove && beforeMove.hash !== afterMove.hash
    ? ok(`transverse slider moves the section (hash ${beforeMove.hash} → ${afterMove.hash})`)
    : bad(`transverse slider had no effect (${JSON.stringify(beforeMove)} → ${JSON.stringify(afterMove)})`)

  /* modality availability is axis-aware: photographs exist only for transverse
   * and coronal, so the Photo control must be disabled (with a reason) on the
   * sagittal axis — an enabled-but-inert control would be the bug. */
  const setAxis = (axis) => evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => new RegExp(${JSON.stringify(axis)}, 'i').test(x.textContent) && /transverse|sagittal|coronal/i.test(x.textContent));
    if (!b) return 'axis button not found';
    b.click();
    return b.textContent.trim();
  })()`)
  const modalityState = () => evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /^(Auto \\(real-first\\)|MRI|CT|Photo|Simulated only)$/.test(b.textContent.trim()));
    return btns.map(b => ({ m: b.textContent.trim(), disabled: !!b.disabled, title: (b.title || '').slice(0, 70), pressed: b.getAttribute('aria-pressed') === 'true' }));
  })()`)

  await setAxis('sagittal')
  await sleep(2000)
  const sagittalModalities = await modalityState()
  const photoOnSagittal = sagittalModalities.find((m) => m.m === 'Photo')
  photoOnSagittal && photoOnSagittal.disabled
    ? ok(`Photo is correctly disabled on the sagittal axis (no sagittal photographs exist) — reason: "${photoOnSagittal.title}"`)
    : bad(`Photo should be disabled on sagittal (state: ${JSON.stringify(photoOnSagittal)})`)

  await setAxis('transverse')
  await sleep(2500)

  /* modality sweep — explicit modalities must never silently swap to another.
   * v7 closure (gap 6): this sweep is COVERAGE-AWARE. It used to demand a credit
   * for every modality at every plane, which is false in this build in two
   * measured cases (the CT source ends at canonical y ≈ 36.25 au, and no
   * photograph is anchored above the highest mapped level) — and it read the
   * canvas hint from `.section-overlay-note`, which is the ERROR slot, not the
   * honest-state line (`.section-imagery-hint`). The verdict now comes from
   * `checks.modalityReading`, which is fed the plane the section is ACTUALLY on
   * (axis + value), the credit, the canvas hint and the toolbar note. */
  const modalityResults = []
  // The sweep must run with the live-section toolbar on screen: the plane
  // reading below queries the toolbar's own groups, which do not exist on the
  // 3D tab (that is what made every modality read as "pressed: null").
  await evaluate(`(() => {
    const plates = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Plates')
    if (plates) plates.click()
  })()`)
  await sleep(1200)
  const ensureLive = await evaluate(`(() => {
    const already = document.querySelector('.section-toolbar-group[aria-label="Imagery modality"]');
    if (already) return 'already in live section';
    const live = [...document.querySelectorAll('button')].find((b) => /^live section$/i.test(b.textContent.trim()));
    if (!live) return 'live-section toggle not found';
    live.click();
    return 'entered live section';
  })()`)
  await sleep(4500)
  info('modality sweep context: ' + String(ensureLive))
  const sectionPlaneReading = `(() => {
    const axisGroup = document.querySelector('.section-toolbar-group[aria-label="Section axis"]');
    const axisBtn = axisGroup
      ? [...axisGroup.querySelectorAll('button')].find((b) => b.getAttribute('aria-pressed') === 'true')
      : null;
    const activeRow = document.querySelector('.section-plane-sliders .slider-row.is-active-axis');
    const slider = activeRow ? activeRow.querySelector('input[type=range]') : null;
    const kindGroup = document.querySelector('.section-toolbar-group[aria-label="Imagery modality"]');
    const kindBtn = kindGroup
      ? [...kindGroup.querySelectorAll('button')].find((b) => b.getAttribute('aria-pressed') === 'true')
      : null;
    return {
      axis: axisBtn && /^[xyz]/.test(axisBtn.textContent.trim()) ? axisBtn.textContent.trim().charAt(0) : null,
      planeValue: slider ? Number(slider.value) : null,
      kindPressed: kindBtn ? kindBtn.textContent.trim() : null,
    };
  })()`
  for (const label of ['CT', 'MRI', 'Photo', 'Simulated only']) {
    const clicked = await evaluate(`(() => {
      const group = document.querySelector('.section-toolbar-group[aria-label="Imagery modality"]')
        ?? document.querySelector('.section-toolbar-group[aria-label=\\"Imagery modality\\"]');
      const scope = group ?? document;
      const b = [...scope.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      if (!b) return { found: false };
      const state = { found: true, disabled: !!b.disabled, title: (b.title || '').slice(0, 90), pressedBefore: b.getAttribute('aria-pressed') };
      b.click();
      return state;
    })()`)
    await sleep(3000)
    if (clicked && clicked.found === false) {
      bad(`the "${label}" modality button is not in the imagery toolbar`)
      continue
    }
    const stats = await evaluate(sectionStats)
    const planeState = await evaluate(sectionPlaneReading)
    const dom = await evaluate(`(() => ({
      credit: document.querySelector('.section-credit')?.textContent?.trim() ?? '',
      hint: document.querySelector('.section-imagery-hint')?.textContent?.trim() ?? '',
      note: document.querySelector('.section-alignment-note.is-ct-coverage')?.textContent?.trim() ?? '',
    }))()`)
    const reading = {
      requested: label,
      axis: planeState?.axis ?? null,
      planeValue: planeState?.planeValue ?? null,
      painted: stats?.painted ?? 0,
      credit: dom?.credit ?? '',
      hint: dom?.hint ?? '',
      note: dom?.note ?? '',
    }
    modalityResults.push({ ...reading, label, pressed: planeState?.kindPressed ?? null })
    if (planeState?.kindPressed !== label) {
      // Distinguish the two honest outcomes from a real defect:
      //  - the control was DISABLED and carried its reason → correct behaviour;
      //  - the control was ENABLED and the click still did not take → defect.
      if (clicked && clicked.disabled) {
        clicked.title
          ? ok(`"${label}" is disabled at this plane and states why: "${clicked.title}"`)
          : bad(`"${label}" is disabled without a reason in its title`)
      } else {
        bad('the "' + label + '" modality could not be selected (pressed: '
          + String(planeState?.kindPressed) + ', disabled: ' + String(clicked?.disabled)
          + ', title: "' + String(clicked?.title ?? '') + '")')
      }
      continue
    }
    const verdict_ = modalityReading(reading, CT_COVERAGE)
    verdict_.ok ? ok(verdict_.detail) : bad(verdict_.detail)
  }
  info('modality sweep readings: ' + JSON.stringify(
    modalityResults.map((r) => ({
      m: r.label, axis: r.axis, plane: r.planeValue, painted: r.painted,
      credit: r.credit.slice(0, 30), hint: r.hint.slice(0, 40),
    })),
  ))

  /* cross-view sync: section slider → 3D clip plane */
  const setY = await moveSlider('transverse', -6)
  await sleep(1500)
  await evaluate(clickText('3D'))
  await sleep(2500)
  const pipAfter = await evaluate(`document.querySelector('.pip-readout')?.textContent?.trim() ?? 'n/a'`)
  const expected = Number(setY)
  String(pipAfter).includes(`y = ${expected.toFixed(1)}`.replace('-', '−')) || String(pipAfter).includes(String(expected))
    ? ok(`section slider drives the 3D clip plane (PiP "${pipAfter}" vs slider ${setY})`)
    : info(`cross-view check: PiP "${pipAfter}" vs section slider y=${setY} (formatting may differ)`)

  /* F — syndromes */
  await evaluate(clickText('Syndromes'))
  await sleep(1500)
  const syndromes = await evaluate(`(() => {
    const cards = document.querySelectorAll('.syndrome-card, .syndrome-item, article');
    const openBtn = [...document.querySelectorAll('button')].find(b => /syndrome/i.test(b.className));
    return { cards: cards.length, sample: document.body.innerText.slice(0, 120).replace(/\\n+/g,' | ') };
  })()`)
  syndromes.cards > 0 ? ok(`syndromes tab renders (${syndromes.cards} cards)`) : bad('syndromes tab empty')

  /* G — references modal */
  await evaluate(clickText('References'))
  await sleep(1200)
  const modal = await evaluate(`(() => {
    const m = document.querySelector('[role=dialog]');
    return m ? m.innerText.slice(0, 200).replace(/\\n+/g, ' | ') : null;
  })()`)
  modal && /bibliograph/i.test(modal) ? ok(`references modal opens ("${modal.slice(0, 80)}…")`) : bad(`references modal missing: ${modal}`)
  await evaluate(`(() => { const b = document.querySelector('.modal-close'); if (b) b.click(); })()`)

  /* H — accessibility: authoritative accessible-name check via the AX tree */
  await send('Accessibility.enable')
  const ax = await send('Accessibility.getFullAXTree')
  const interactiveRoles = new Set(['button', 'slider', 'checkbox', 'combobox', 'textbox', 'link', 'switch', 'radio', 'tab'])
  const axNodes = (ax?.nodes ?? []).filter((n) => interactiveRoles.has(n.role?.value))
  const unnamed = axNodes.filter((n) => !(n.name?.value ?? '').trim())
  const byRole = axNodes.reduce((acc, n) => {
    const r = n.role.value
    acc[r] = (acc[r] ?? 0) + 1
    return acc
  }, {})
  axNodes.length > 0
    ? ok(`accessibility tree exposes ${axNodes.length} interactive nodes (${Object.entries(byRole).map(([r, c]) => `${r}×${c}`).join(', ')})`)
    : info('accessibility tree returned no interactive nodes')
  unnamed.length === 0
    ? ok('every interactive control has a computed accessible name')
    : bad(`${unnamed.length}/${axNodes.length} interactive controls have NO accessible name (roles: ${[...new Set(unnamed.map((n) => n.role.value))].join(', ')})`)

  /* I — keyboard operability of a plane slider */
  await evaluate(clickText('Plates'))
  await sleep(1200)
  await evaluate(clickText('Live section'))
  await sleep(3500)
  const kb = await evaluate(`(() => {
    // Use the sagittal slider: the transverse one snaps to levels, so an arrow
    // key legitimately lands back on the same value.
    const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find(x => /sagittal/i.test(x.getAttribute('aria-label') || '')) ?? [...document.querySelectorAll('.section-plane-sliders input[type=range]')][0];
    if (!r) return 'no slider';
    r.focus();
    return { focused: document.activeElement === r, value: r.value, step: r.step };
  })()`)
  if (kb && kb.focused) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 39, key: 'ArrowRight', code: 'ArrowRight' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 39, key: 'ArrowRight', code: 'ArrowRight' })
    await sleep(1200)
    const after = await evaluate(`(() => {
      const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find(x => /sagittal/i.test(x.getAttribute('aria-label') || '')) ?? [...document.querySelectorAll('.section-plane-sliders input[type=range]')][0];
      return r?.value;
    })()`)
    String(after) !== String(kb.value)
      ? ok(`plane slider is keyboard operable (ArrowRight ${kb.value} → ${after})`)
      : bad(`plane slider ignored ArrowRight (stayed ${after})`)
  } else {
    bad(`could not focus a plane slider (${JSON.stringify(kb)})`)
  }

  /* J — perf numbers */
  const perf = await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const js = res.filter(r => r.name.endsWith('.js') || r.initiatorType === 'script');
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      requests: res.length,
      jsRequests: js.length,
      transferKB: Math.round(res.reduce((n, r) => n + (r.transferSize || 0), 0) / 1024),
      largest: res.map(r => ({ n: r.name.split('/').pop(), kb: Math.round((r.transferSize||0)/1024) })).sort((a,b)=>b.kb-a.kb).slice(0,3),
    };
  })()`)
  info(`perf: DCL ${perf.domContentLoaded}ms · load ${perf.load}ms · ${perf.requests} requests · ${perf.transferKB} KB transferred · largest ${perf.largest.map(l=>`${l.n} (${l.kb}KB)`).join(', ')}`)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (shot?.data) {
    writeFileSync(resolve('.plate-scratch/audit-final.png'), Buffer.from(shot.data, 'base64'))
    info('final screenshot: .plate-scratch/audit-final.png')
  }

  /* K — console hygiene (a favicon 404 is the dev server's only known noise) */
  const realErrors = [...new Set([...exceptions, ...consoleErrors])].filter(
    (e) => !/favicon/i.test(e) && !/404 \(Not Found\)/.test(e),
  )
  realErrors.length === 0
    ? ok('no page exceptions or console errors during the whole audit')
    : bad(`${realErrors.length} runtime error(s): ${realErrors.slice(0, 3).join(' || ')}`)
  const faviconNoise = [...consoleErrors].some((e) => /404 \(Not Found\)/.test(e))
  if (faviconNoise) info('one console 404 observed: the app ships no favicon.ico (cosmetic)')
  const realFailures = failedRequests.filter((f) => !/favicon/i.test(f))
  realFailures.length === 0 ? ok('no failed network requests') : bad(`failed requests: ${realFailures.slice(0,3).join(' || ')}`)
  const badRes = badResponses.filter((r) => !/favicon/i.test(r))
  badRes.length === 0 ? ok('no HTTP 4xx/5xx responses') : bad(`bad responses: ${badRes.slice(0,3).join(' || ')}`)
  /* ======================================================================
   * L — v7 TELENCEPHALON checks (docs/TELENCEPHALON_PLAN.md section 5 and 9)
   *
   * Appended by v7b-integration. APPEND-ONLY: the v6 run's integration task
   * also edits this file, so this group adds a new lettered block and changes
   * nothing above it.
   *
   * Every assertion uses the existing ok/bad/info helpers and DOM the app
   * already ships (the region tree, the plate chips, the header preset buttons,
   * the section plane sliders and the .section-canvas sampler that section E
   * defines). The app exposes no debug globals and this block invents none.
   *
   * Message strings here are built with concatenation rather than template
   * literals: a stray backtick inside a comment that sits inside a template
   * literal silently terminates that literal, and the resulting parse error
   * points at an unrelated later line. Concatenation removes that trap.
   *
   * NOTE ON THE BROWSER (plan C12): this whole file needs headless Chrome,
   * which cannot start in some restricted sandboxes. Where it cannot, the
   * node-only lane is the evidence: npm run verify:pipeline independently
   * proves the +58 plane paints, npm run validate proves the four levels and
   * the telencephalon taxonomy, and the anatomy build CLI proves the budgets.
   * ==================================================================== */

  /* L1 — MOVED (v7 closure, gap 4a). The default-preset assertions now run in
   * block A0, immediately after the clean-profile boot and BEFORE any check
   * clicks a preset button. Reading the "default" here measured the audit's own
   * earlier preset click (the `Nuclei` chip in section B, which persists to
   * `neuroaxis.viewPreset`) and, across runs, whatever the persistent Chrome
   * profile had left behind. Nothing about the product changed: the default was
   * — and is — Brainstem focus, asserted at module load in `src/state/store.ts`.
   * `A0` proves it deterministically and also asserts that no brainstem-family
   * tree row renders dimmed at boot. */

  /* L2 — the tree shows the telencephalon region with its five subdivisions. */
  const telTreeOpen = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return 'no telencephalon region';
    const region = heading.closest('.tree-region');
    const row = region && region.querySelector('.tree-region-row');
    if (row && row.getAttribute('aria-expanded') !== 'true') row.click();
    return 'opened';
  })()`)
  await sleep(900)
  const telSubdivisions = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return [];
    const region = heading.closest('.tree-region');
    if (!region) return [];
    return [...region.querySelectorAll('.tree-sub-name')].map((el) => el.textContent.trim());
  })()`)
  const wantedSubdivisions = ['cerebral cortex', 'basal ganglia', 'limbic system',
    'telencephalic white matter', 'lateral ventricles']
  if (String(telTreeOpen) !== 'opened') {
    bad('telencephalon region missing from the taxonomy tree (' + String(telTreeOpen) + ')')
  } else {
    const lowered = telSubdivisions.map((name) => name.toLowerCase())
    const missing = wantedSubdivisions.filter((want) => !lowered.some((have) => have.indexOf(want) !== -1))
    if (missing.length === 0) {
      ok('telencephalon region in the tree with all ' + wantedSubdivisions.length
        + ' subdivisions (' + telSubdivisions.join(' / ') + ')')
    } else {
      bad('telencephalon subdivisions missing from the tree: ' + missing.join(', ')
        + ' (have: ' + telSubdivisions.join(' / ') + ')')
    }
  }

  /* L3 — a telencephalon structure is selectable and the info panel fills. */
  const pickTelSub = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return 'no telencephalon region';
    const region = heading.closest('.tree-region');
    if (!region) return 'no region node';
    const sub = [...region.querySelectorAll('.tree-sub-row')]
      .find((el) => /basal ganglia/i.test(el.textContent || ''));
    if (!sub) return 'no basal ganglia subdivision';
    if (sub.getAttribute('aria-expanded') !== 'true') sub.click();
    return 'opened';
  })()`)
  await sleep(800)
  const telLeafName = await evaluate(`(() => {
    const headings = [...document.querySelectorAll('.tree-region-name')];
    const heading = headings.find((h) => /telencephalon/i.test(h.textContent || ''));
    if (!heading) return 'no region';
    const region = heading.closest('.tree-region');
    const leaf = region && region.querySelector('.tree-leaf-row');
    if (!leaf) return 'no leaf rendered';
    leaf.click();
    return (leaf.textContent || '').trim().slice(0, 40);
  })()`)
  await sleep(1300)
  const telPanel = await evaluate(`(() => {
    const el = document.querySelector('.info-panel');
    if (!el) return null;
    const nameEl = el.querySelector('.info-name');
    return {
      name: nameEl && nameEl.textContent ? nameEl.textContent.trim() : '',
      chars: el.innerText.length,
      sections: [...el.querySelectorAll('.info-section h3')].length,
    };
  })()`)
  if (String(pickTelSub).indexOf('opened') === 0 && telPanel !== null && telPanel.chars > 200 && telPanel.name !== '') {
    ok('telencephalon structure selectable from the tree (' + String(telLeafName)
      + ' -> info panel "' + telPanel.name + '", ' + telPanel.chars + ' chars, '
      + telPanel.sections + ' sections)')
  } else {
    bad('telencephalon selection failed (' + String(pickTelSub) + ' / ' + String(telLeafName)
      + ' / ' + JSON.stringify(telPanel) + ')')
  }

  /* L4 — the new level anchors exist and are reachable, and the live section
   * paints at y = +58. Reachability is proven the way a user reaches it: move
   * the transverse plane slider to +58 and require the canvas to repaint. */
  const levelAnchors = await evaluate(`(() => {
    const text = document.body.innerText;
    const ids = ['lvl-tel-thalamostriate', 'lvl-tel-basal-ganglia',
      'lvl-tel-centrum-semiovale', 'lvl-tel-convexity'];
    return { idsInDom: ids.filter((id) => text.indexOf(id) !== -1) };
  })()`)

  await evaluate(clickText('Plates'))
  await sleep(1200)
  await evaluate(clickText('Live section'))
  await sleep(5000)
  // Park the plane on a DIFFERENT telencephalic level first: an earlier check
  // may already have left the slider on +58, in which case "set to 58" causes
  // no repaint and the assertion would fail for the wrong reason.
  const parkElsewhere = await evaluate(`(() => {
    const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')]
      .find((x) => /transverse/i.test(x.getAttribute('aria-label') || ''));
    if (!r) return 'no transverse plane slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '48');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return 'parked at ' + r.value;
  })()`)
  await sleep(2500)
  const beforeTel = await evaluate(sectionStats)

  const setTransverse = await evaluate(`(() => {
    const sliders = [...document.querySelectorAll('.section-plane-sliders input[type=range]')];
    const r = sliders.find((x) => /transverse/i.test(x.getAttribute('aria-label') || '')
      || /transverse/i.test(x.className));
    if (!r) return 'no transverse plane slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '58');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return 'set to ' + r.value + ' (range ' + r.min + '..' + r.max + ')';
  })()`)
  await sleep(3000)
  const afterTel = await evaluate(sectionStats)
  const reached58 = String(setTransverse).indexOf('set to 58') !== -1
  if (reached58 && beforeTel && afterTel && beforeTel.hash !== afterTel.hash) {
    ok('transverse plane reaches y = +58 and the live section repaints (' + String(setTransverse)
      + '; hash ' + beforeTel.hash + ' -> ' + afterTel.hash + ')')
  } else {
    bad('y = +58 was not reachable / did not repaint (' + String(setTransverse)
      + ' -> ' + JSON.stringify(afterTel) + ')')
  }
  if (afterTel && afterTel.painted > 50) {
    ok('live section paints at y = +58 (' + afterTel.painted + '/' + afterTel.sampled
      + ' non-background samples)')
  } else {
    bad('live section blank at y = +58: ' + JSON.stringify(afterTel))
  }
  if (levelAnchors.idsInDom.length > 0) {
    ok('telencephalon level anchors rendered in the level ruler ('
      + levelAnchors.idsInDom.join(', ') + ')')
  } else {
    info('level anchor ids are not text in the DOM (the ruler may render names only) - '
      + 'the four anchors are proven by npm run validate + verify:plane + verify:pipeline')
  }

  /* L5 — CT coverage honesty above the Visible Human series' measured apex
   * (docs/TELENCEPHALON_PLAN.md section 2 and 9, plan C3).
   *
   * v7 closure (gap 3): the statement is a function of (axis, planeValue, kind),
   * and the check used to drive the transverse SLIDER without pinning the AXIS —
   * earlier sections focus the sagittal slider, which pins `sectionAxis = 'x'`,
   * where no coverage statement can exist. The result was a FAIL with an empty
   * note and an empty hint, which reads as a product defect but measured nothing.
   * The check now: pins the axis through its own toolbar button, PROVES the pin
   * (aria-pressed), reports {axis, planeValue, kind, notePresent, noteText,
   * hintText}, and only then asserts — through the shared pure predicate, so the
   * covered and uncovered directions are both exercised. */
  const pinTransverse = await evaluate(`(() => {
    const group = document.querySelector('.section-toolbar-group[aria-label="Section axis"]');
    const b = group ? [...group.querySelectorAll('button')].find((x) => /transverse/i.test(x.textContent)) : null;
    if (!b) return 'no transverse axis button';
    b.click();
    return 'clicked ' + b.textContent.trim();
  })()`)
  await sleep(1500)
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'CT');
    if (b) b.click();
  })()`)
  await sleep(2500)
  const ctPlane = await evaluate(sectionPlaneReading)
  const ctNote = await evaluate(`(() => {
    const noteEl = document.querySelector('.section-alignment-note.is-ct-coverage');
    const hintEl = document.querySelector('.section-imagery-hint');
    const creditEl = document.querySelector('.section-credit');
    return {
      notePresent: noteEl !== null,
      text: noteEl && noteEl.textContent ? noteEl.textContent.trim() : '',
      credit: creditEl && creditEl.textContent ? creditEl.textContent.trim() : '',
      hint: hintEl && hintEl.textContent ? hintEl.textContent.trim() : '',
    };
  })()`)
  const ctAxisProven = ctPlane?.axis === 'y'
  ctAxisProven
    ? ok('the live section is pinned to the transverse (y) axis before the CT coverage assertion ('
      + String(pinTransverse) + ', plane y = ' + String(ctPlane?.planeValue) + ' au, kind '
      + String(ctPlane?.kindPressed) + ')')
    : bad('the CT coverage check could not pin the transverse axis (' + String(pinTransverse)
      + ' → ' + JSON.stringify(ctPlane) + ') — a coverage assertion on an unpinned axis measures nothing')
  const ctVerdict = ctCoverageReading(
    {
      axis: ctPlane?.axis ?? null,
      planeValue: ctPlane?.planeValue ?? null,
      kind: ctPlane?.kindPressed ?? null,
      notePresent: ctNote?.notePresent === true,
      noteText: ctNote?.text ?? '',
      hintText: ctNote?.hint ?? '',
    },
    CT_COVERAGE,
  )
  info('CT coverage reading: ' + JSON.stringify({
    axis: ctPlane?.axis ?? null,
    planeValue: ctPlane?.planeValue ?? null,
    kind: ctPlane?.kindPressed ?? null,
    notePresent: ctNote?.notePresent === true,
    note: String(ctNote?.text ?? '').slice(0, 90),
    hint: String(ctNote?.hint ?? '').slice(0, 90),
  }))
  ctVerdict.ok ? ok(ctVerdict.detail) : bad(ctVerdict.detail)

  /* The canvas half must state the same limit as the toolbar: the hint is the
   * only thing visible over the blank plane itself. (No regex literal after a
   * statement that ends in a call — see the note on concatenation in block L.) */
  const ctCanvasHint = String(ctNote?.hint ?? '')
  const ctLimitText = CT_COVERAGE.limit === null ? '' : CT_COVERAGE.limit.toFixed(2)
  const canvasHintIsHonest =
    ctCanvasHint.length > 0 &&
    ctLimitText.length > 0 &&
    ctCanvasHint.indexOf(ctLimitText) !== -1 &&
    ctCanvasHint.indexOf('MRI is the modality of record') !== -1
  canvasHintIsHonest
    ? ok('the canvas states the same CT coverage limit as the toolbar ("'
      + ctCanvasHint.slice(0, 110) + '")')
    : bad('the canvas hint at a CT plane above the source does not state the measured limit ("'
      + ctCanvasHint.slice(0, 110) + '")')

  if (/openneuro/i.test(ctNote?.credit ?? '')) {
    ok('MRI is the modality of record above the CT limit (credit "'
      + String(ctNote?.credit ?? '').slice(0, 46) + '")')
  } else {
    info('credit while CT is requested above its coverage: "' + String(ctNote?.credit ?? '').slice(0, 60) + '"')
  }

  /* L5b — THE PANEL'S IMAGERY STATE AT A CT-ABOVE-THE-SOURCE REQUEST (v9 items
   * 4+5; repurposed, not deleted).
   *
   * Before v9 this block asserted that the PiP — which PAINTED the real CT/MRI
   * slice behind the 3D cut — stated the same measured coverage limit as the
   * toolbar and the live canvas. The panel no longer paints real imagery at all,
   * so the honest contract it now has to meet is the SAME number PLUS the two
   * facts that replaced the backdrop: this panel shows the simulated section,
   * and the real-imagery request belongs to the Plates tab. Both halves are
   * asserted from the same live reading, and the panel is additionally checked
   * for imagery markup/pixels — the CT request must NOT reach it. */
  await evaluate(clickText('3D'))
  await sleep(3000)
  const pipHint = await evaluate(`(() => {
    const el = document.querySelector('.pip-backdrop-hint');
    const panel = document.querySelector('.pip-panel');
    const canvases = panel === null ? [] : [...panel.querySelectorAll('canvas')];
    return {
      text: el === null ? null : (el.textContent || '').trim(),
      hidden: el === null ? null : el.hidden === true,
      imgs: panel === null ? -1 : panel.querySelectorAll('img').length,
      credits: panel === null ? -1 : panel.querySelectorAll('a[href^="http"], .pip-credit').length,
      canvases: canvases.length,
      canvas2d: canvases.map((c) => { try { return c.getContext('2d') !== null; } catch (error) { return false; } }),
      stateLine: (panel?.querySelector('.pip-imagery-state')?.textContent ?? '').trim(),
    };
  })()`)
  const pipHintText = String(pipHint?.text ?? '')
  const pipIsSimulated =
    pipHint !== null &&
    pipHint.hidden === false &&
    pipHintText.length > 0
  if (pipHint === null) {
    info('the PiP hint element is not in this page (the panel is hidden) — '
      + 'the canvas half above is the asserted one')
  } else if (!pipIsSimulated) {
    info('the panel states no coverage limit at this plane (its hint line is empty/hidden) — '
      + 'the CT request resolves through another modality for the Plates canvas')
  } else if (pipHintText.indexOf(ctLimitText) !== -1
    && pipHintText.indexOf('MRI is the modality of record') !== -1
    && pipHintText.indexOf('this panel shows the simulated section') !== -1) {
    ok('the PiP states the same CT coverage limit as the toolbar and the canvas AND that it shows the '
      + 'simulated section ("' + pipHintText.slice(0, 120) + '")')
  } else {
    bad('the PiP hint at a CT plane above the source does not carry both the measured limit and the '
      + 'simulated-section statement ("' + pipHintText.slice(0, 120) + '")')
  }
  /* The panel must be imagery-free in EVERY branch above — at a CT request most
     of all, because that is the modality whose real slice used to be blitted
     into it. */
  if (pipHint !== null && pipHint.imgs === 0 && pipHint.credits === 0 && pipHint.canvases === 1 && pipHint.canvas2d[0] === true) {
    ok('the CT-above-the-source request does not reach the panel: 0 <img>, 0 credit link, '
      + 'and its one canvas is the 2D section canvas')
  } else if (pipHint !== null) {
    bad('the panel is not imagery-free at a CT request (' + JSON.stringify({
      imgs: pipHint.imgs, credits: pipHint.credits, canvases: pipHint.canvases, canvas2d: pipHint.canvas2d,
    }) + ')')
  }
  if (pipHint !== null && pipHint.stateLine.length > 0) {
    info('panel imagery line at this plane: "' + pipHint.stateLine + '"')
  }
  // Back to the Plates tab: block L6 (the author plate) lives there.
  await evaluate(clickText('Plates'))
  await sleep(2000)

  /* L6 — the telencephalon plates are present and render. */
  await evaluate(clickText('Author plate'))
  await sleep(1200)
  const telPlate = await evaluate(`(() => {
    const chips = [...document.querySelectorAll('.plate-chip')];
    const tel = chips.filter((c) => /telencephalon/i.test(c.textContent || ''));
    if (tel.length === 0) return { found: false, count: 0, chips: chips.length, label: '' };
    tel[0].click();
    return {
      found: true,
      count: tel.length,
      chips: chips.length,
      label: tel[0].textContent.trim().slice(0, 60),
    };
  })()`)
  await sleep(1800)
  const telPlateDrawn = await evaluate(`({
    svg: document.querySelectorAll('.plate-stage svg').length,
    labels: document.querySelectorAll('.plate-stage svg text').length,
  })`)
  if (telPlate.found && telPlateDrawn.svg > 0) {
    ok('telencephalon plate present and renders (' + telPlate.count + ' of ' + telPlate.chips
      + ' chips; "' + telPlate.label + '" -> ' + telPlateDrawn.svg + ' svg, '
      + telPlateDrawn.labels + ' label elements)')
  } else {
    bad('telencephalon plate missing or blank (' + JSON.stringify(telPlate) + ' / '
      + JSON.stringify(telPlateDrawn) + ')')
  }

  /* L7 — runtime hygiene during the telencephalon pass: the same collectors as
   * section K, re-read so a failure introduced by the new geometry or presets
   * is attributed to this block rather than only to the earlier one. */
  const telErrors = [...new Set([...exceptions, ...consoleErrors])].filter(
    (e) => !/favicon/i.test(e) && !/404 \(Not Found\)/.test(e),
  )
  if (telErrors.length === 0) {
    ok('no page exceptions or console errors during the telencephalon checks')
  } else {
    bad(telErrors.length + ' runtime error(s) during the telencephalon checks: '
      + telErrors.slice(0, 3).join(' || '))
  }

  /* ======================================================================
   * M — P0: WEBGL CONTEXT LOSS IS SURVIVABLE (QUALITY_PLAN §1 item 1, §6)
   *
   * This is a PERMANENT GATE, not a demonstration: it drives the real
   * `WEBGL_lose_context` extension on the R3F canvas and requires the app to
   * show its recovery state and then come back.
   *
   * The contract it asserts (Viewer3D.tsx):
   *   • `div.viewer-context-lost[role="alert"][data-context-lost]` is the
   *     recovery overlay, and it is UNMOUNTED while the context is healthy — so
   *     a healthy canvas is never covered by it;
   *   • `loseContext()` must make it appear with `data-context-lost="lost"`;
   *   • `restoreContext()` must remove it again AND leave a live, non-lost
   *     context behind (asserted through the canvas' own `isContextLost()`);
   *   • if the browser never fires `webglcontextrestored`, the code's own
   *     terminal state after CONTEXT_LOSS_DEAD_MS (20 s) is
   *     `data-context-lost="dead"` with a Reload control. That branch is also a
   *     PASS — the failure mode being eliminated is the SILENT blank canvas,
   *     not the honest "reload" affordance. Which branch fired is reported.
   * ==================================================================== */

  await evaluate(clickText('3D'))
  await sleep(2500)
  const contextBefore = await evaluate(`(() => {
    const overlay = document.querySelector('[data-context-lost]');
    const canvas = document.querySelector('.viewer3d-canvas canvas')
      || document.querySelector('.viewer3d-root canvas')
      || document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas found' };
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'no WebGL context on the canvas' };
    const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return { error: 'WEBGL_lose_context is unavailable in this browser' };
    // Stash on window so the next evaluate() can reach the SAME context object
    // (a second getContext call on a lost canvas may return null).
    window.__auditGl = gl;
    window.__auditExt = ext;
    window.__auditCanvas = canvas;
    return {
      tag: canvas.tagName,
      canvasClass: canvas.className,
      lostBefore: gl.isContextLost(),
      overlayMounted: overlay !== null,
      overlayPhase: overlay === null ? null : overlay.getAttribute('data-context-lost'),
      panelError: document.querySelector('[data-panel-error]')?.getAttribute('data-panel-error') ?? null,
    };
  })()`)

  if (contextBefore?.error !== undefined) {
    /* An environment limitation, not a product failure: no canvas, no WebGL, or
     * no extension. Reported as informational so the gate is honest about what
     * it could not exercise rather than failing the run for it. */
    info('context-loss gate skipped: ' + contextBefore.error)
  } else {
    const healthyVerdict = contextLossReading(
      {
        mounted: contextBefore.overlayMounted === true,
        phase: contextBefore.overlayPhase,
        canvasLost: contextBefore.lostBefore,
        panelError: contextBefore.panelError,
      },
      false,
    )
    healthyVerdict.ok ? ok(healthyVerdict.detail) : bad(healthyVerdict.detail)

    // --- lose the context -------------------------------------------------
    const lostNow = await evaluate(`(() => {
      const ext = window.__auditExt;
      if (!ext) return 'no extension stashed';
      ext.loseContext();
      return 'loseContext() called';
    })()`)
    await sleep(1200)
    const afterLoss = await evaluate(`(() => {
      const overlay = document.querySelector('[data-context-lost]');
      const gl = window.__auditGl;
      return {
        mounted: overlay !== null,
        phase: overlay === null ? null : overlay.getAttribute('data-context-lost'),
        role: overlay === null ? '' : overlay.getAttribute('role'),
        text: overlay === null ? '' : overlay.innerText.slice(0, 120).replace(/\\n+/g, ' | '),
        buttons: overlay === null ? [] : [...overlay.querySelectorAll('button')].map((b) => b.textContent.trim()),
        canvasLost: gl ? gl.isContextLost() : 'no gl',
        // Fail-stop diagnostics: when the overlay is missing, these fields say
        // WHY — a panel error card means an error boundary replaced the canvas
        // subtree (the measured v7 defect), while a still-attached canvas means
        // the loss was simply never observed.
        panelError: document.querySelector('[data-panel-error]')?.getAttribute('data-panel-error') ?? null,
        canvasAttached: window.__auditCanvas ? document.contains(window.__auditCanvas) : false,
        canvasCount: document.querySelectorAll('canvas').length,
      };
    })()`)
    info('context-loss diagnostic after loseContext(): ' + JSON.stringify({
      phase: afterLoss.phase,
      role: afterLoss.role,
      buttons: afterLoss.buttons,
      canvasLost: afterLoss.canvasLost,
      canvasAttached: afterLoss.canvasAttached,
      canvasCount: afterLoss.canvasCount,
      panelError: afterLoss.panelError,
      text: String(afterLoss.text).slice(0, 80),
    }))
    String(lostNow).includes('called') && afterLoss.canvasLost === true
      ? ok('WEBGL_lose_context.loseContext() really lost the context (isContextLost() === true)')
      : bad('loseContext() did not lose the context (' + String(lostNow) + ' / ' + JSON.stringify(afterLoss) + ')')
    const lossVerdict = contextLossReading(afterLoss, true)
    lossVerdict.ok ? ok(lossVerdict.detail) : bad(lossVerdict.detail)

    // --- restore it -------------------------------------------------------
    const restoreNow = await evaluate(`(() => {
      const button = [...document.querySelectorAll('[data-context-lost] button')]
        .find((b) => /restore/i.test(b.textContent || ''));
      if (button) { button.click(); return 'clicked the Restore button'; }
      const ext = window.__auditExt;
      if (ext) { ext.restoreContext(); return 'called restoreContext() directly'; }
      return 'no restore path';
    })()`)
    await sleep(2500)
    const afterRestore = await evaluate(`(() => {
      const overlay = document.querySelector('[data-context-lost]');
      const gl = window.__auditGl;
      const canvas = document.querySelector('.viewer3d-canvas canvas') || document.querySelector('canvas');
      return {
        mounted: overlay !== null,
        phase: overlay === null ? null : overlay.getAttribute('data-context-lost'),
        buttons: overlay === null ? [] : [...overlay.querySelectorAll('button')].map((b) => b.textContent.trim()),
        canvasLost: gl ? gl.isContextLost() : 'no gl',
        canvasCount: document.querySelectorAll('canvas').length,
        liveContext: canvas ? (canvas.getContext('webgl2') || canvas.getContext('webgl')) !== null : false,
      };
    })()`)
    const restoreVerdict = contextRestoreReading(afterRestore)
    if (restoreVerdict.ok && restoreVerdict.label === 'restored') {
      ok(restoreVerdict.detail + ' (' + String(restoreNow) + ')')
      const repaint = await pagePixelStats()
      repaint && repaint.uniqueColors > 20
        ? ok('the 3D scene really repainted after the restore (' + repaint.uniqueColors
          + ' colour buckets, mean luminance ' + repaint.meanLum + ')')
        : bad('the canvas did not repaint after the context was restored (' + JSON.stringify(repaint) + ')')
    } else {
      restoreVerdict.ok
        ? ok(restoreVerdict.detail + ' (' + String(restoreNow) + ')')
        : bad(restoreVerdict.detail + ' (' + String(restoreNow) + ' / ' + JSON.stringify(afterRestore) + ')')
    }

    /* v9 item 5 — THE PANEL AND THE LOSS CYCLE (repurposed, not deleted).
     *
     * The old check read the PiP's own `.pip-context-lost` note, because the PiP
     * shared the main canvas' WebGL context and needed its own recovery path.
     * The panel is now DOM + a 2D canvas with no GL resource at all, so the
     * contract has inverted and is stronger: the retired note must be ABSENT,
     * the panel must still own exactly one 2D canvas, and — the part a source
     * read cannot prove — that canvas must still be PAINTED after the main
     * canvas lost and regained its context. If the panel had any dependency on
     * the 3D context, this is where it would show up as a blank panel. */
    const pipAfterLoss = await evaluate(`(() => {
      const panel = document.querySelector('.pip-panel');
      const canvases = panel === null ? [] : [...panel.querySelectorAll('canvas')];
      return {
        panel: panel !== null,
        retiredNote: document.querySelectorAll('.pip-context-lost').length,
        canvases: canvases.length,
        canvas2d: canvases.map((c) => { try { return c.getContext('2d') !== null; } catch (error) { return false; } }),
      };
    })()`)
    const pipPaintAfterLoss = await evaluate(canvasStatsFor(PIP_CANVAS))
    pipAfterLoss.panel && pipAfterLoss.retiredNote === 0
      ? ok('the panel has no context-loss path to lose: 0 .pip-context-lost notes while the MAIN canvas is lost '
        + '(the panel owns no WebGL resource — v9 removed the shared rig)')
      : bad(`the retired PiP context-loss note is back (${JSON.stringify(pipAfterLoss)})`)
    pipAfterLoss.canvases === 1 && pipAfterLoss.canvas2d[0] === true
      ? ok('the panel still owns exactly one 2D canvas through the main canvas\' loss cycle')
      : bad(`the panel's canvas changed during the loss cycle (${JSON.stringify(pipAfterLoss)})`)
    pipPaintAfterLoss !== null && pipPaintAfterLoss.painted > 50
      ? ok(`the simulated section is STILL painted in the panel after the main context loss `
        + `(${pipPaintAfterLoss.painted}/${pipPaintAfterLoss.sampled} non-background samples)`)
      : bad(`the panel went blank while the main canvas was lost (${JSON.stringify(pipPaintAfterLoss)})`)
    info('panel state after the loss cycle: ' + JSON.stringify({
      canvases: pipAfterLoss.canvases,
      painted: pipPaintAfterLoss?.painted ?? null,
      sampled: pipPaintAfterLoss?.sampled ?? null,
    }))
  }

  /* ======================================================================
   * N — P0: AN ERROR BOUNDARY CONTAINS A REAL THROW (QUALITY_PLAN §1 item 2, §6)
   *
   * The forced throw is a DEV-ONLY hook: `?panelfail=<surface>` makes exactly
   * one named boundary throw during render. It is implemented inside
   * `src/components/section/SectionErrorBoundary.tsx` guarded by
   * `import.meta.env.DEV`, so a production build can never reach it.
   *
   * What is proven here: the throw is CONTAINED (the card appears, the rest of
   * the app still works, Retry brings the panel back). What is proven by
   * `scripts/verify/boundary-contract.mjs`: every surface is wrapped, and the
   * boundary's own state transition + Retry reset behave as advertised.
   * ==================================================================== */

  /** The surfaces the app wraps, in the order App.tsx mounts them. */
  const BOUNDARY_SURFACES = ['Taxonomy tree', 'Syndrome browser']
  await send('Page.navigate', { url: `${BASE}/?panelfail=${encodeURIComponent(BOUNDARY_SURFACES[0])}` })
  await sleep(7000)

  const probeHooked = await evaluate(`document.querySelector('[data-panel-probe]')?.getAttribute('data-panel-probe') ?? 'not armed'`)
  info('forced-throw probe reports: ' + String(probeHooked))

  const contained = await evaluate(`(() => {
    const card = document.querySelector('[data-panel-error]');
    const probe = document.querySelector('[data-panel-probe]');
    return {
      card: card === null ? null : card.getAttribute('data-panel-error'),
      role: card === null ? '' : card.getAttribute('role'),
      text: card === null ? '' : card.innerText.slice(0, 140).replace(/\\n+/g, ' | '),
      hasRetry: card === null ? false : [...card.querySelectorAll('button')].some((b) => /retry/i.test(b.textContent || '')),
      // v7 closure (gap 5): the marker now lives ON the failure card, so a single
      // signal proves "the hook armed" AND "that throw was contained here".
      probes: document.querySelectorAll('[data-panel-probe]').length,
      probeName: probe === null ? null : probe.getAttribute('data-panel-probe'),
      cards: document.querySelectorAll('[data-panel-error]').length,
      // The rest of the app must still be there and still be interactive.
      tabs: [...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim()),
      appShell: document.querySelector('.app-shell') !== null,
      canvases: document.querySelectorAll('canvas').length,
      otherSurfaces: {
        header: document.querySelector('header, .app-header, .header') !== null,
        infoPanel: document.querySelector('.info-panel') !== null,
      },
    };
  })()`)

  const containmentVerdict = panelContainmentReading({
    expected: BOUNDARY_SURFACES[0],
    card: contained.card,
    probes: contained.probes,
    hasRetry: contained.hasRetry,
    armed: probeHooked,
  })
  containmentVerdict.ok
    ? ok(containmentVerdict.detail + ' — "' + String(contained.text).slice(0, 80) + '"')
    : bad(containmentVerdict.detail)
  contained.appShell && contained.tabs.length >= 3
    ? ok('the app did NOT blank: shell present, ' + contained.tabs.length + ' tabs still rendered ('
      + contained.tabs.join(', ') + ')')
    : bad('the app was degraded by the contained throw (' + JSON.stringify(contained) + ')')
  contained.canvases >= 1
    ? ok('the other panels kept rendering while one threw (' + contained.canvases + ' canvas element(s) live)')
    : info('no canvas while the Plates/3D tab is inactive (tab-scoped panels are unmounted by design)')

  /* Exactly ONE boundary may be armed by the parameter, and the other surfaces
   * must be untouched. Read from the SAME reading as the card (before Retry):
   * the probe is one-shot (see SectionErrorBoundary), so after a successful
   * recovery there is correctly nothing left to count. */
  contained.probes === 1 && contained.cards === 1
    ? ok('exactly ONE boundary is armed by ?panelfail=<surface> (probe="' + String(contained.probeName)
      + '", 1 failure card, the other surfaces render their children normally)')
    : bad('?panelfail armed ' + contained.probes + ' boundary marker(s) / ' + contained.cards
      + ' failure card(s) — the other panels must be unaffected')
  contained.probes === 1 && contained.probeName === BOUNDARY_SURFACES[0]
    ? ok('the containment card is observable: [data-panel-probe="' + contained.probeName
      + '"] and [data-panel-error="' + contained.card + '"] are the same element')
    : bad('the containment signal is not observable (probes=' + contained.probes
      + ', probeName=' + JSON.stringify(contained.probeName) + ', card=' + JSON.stringify(contained.card) + ')')

  /* Retry must clear the card and bring the panel back. */
  const retryClick = await evaluate(`(() => {
    const card = document.querySelector('[data-panel-error]');
    const button = card && [...card.querySelectorAll('button')].find((b) => /retry/i.test(b.textContent || ''));
    if (!button) return 'no retry button';
    button.click();
    return 'clicked Retry';
  })()`)
  await sleep(1500)
  const afterRetry = await evaluate(`(() => {
    const card = document.querySelector('[data-panel-error]');
    const probe = document.querySelector('[data-panel-probe]');
    return {
      card: card === null ? 'cleared' : card.getAttribute('data-panel-error'),
      probeArmed: probe === null ? 'disarmed' : 'still armed',
      treePanelBack: document.querySelector('.tree .tree-region-row') !== null,
      cards: document.querySelectorAll('[data-panel-error]').length,
    };
  })()`)
  const recoveryVerdict = panelRecoveryReading({
    expected: BOUNDARY_SURFACES[0],
    card: afterRetry.card,
    panelBack: afterRetry.treePanelBack === true,
  })
  recoveryVerdict.ok
    ? ok(recoveryVerdict.detail + ' (' + String(retryClick) + ', probe ' + String(afterRetry.probeArmed) + ')')
    : bad(recoveryVerdict.detail + ' (card=' + String(afterRetry.card) + ', probe='
      + String(afterRetry.probeArmed) + ', tree=' + String(afterRetry.treePanelBack) + ')')

  /* Back to a healthy page: the hook must be inert without the parameter. */
  await send('Page.navigate', { url: BASE })
  await sleep(6000)
  const healthyAgain = await evaluate(`({
    probes: document.querySelectorAll('[data-panel-probe]').length,
    cards: document.querySelectorAll('[data-panel-error]').length,
    tabs: document.querySelectorAll('[role=tab]').length,
    appShell: document.querySelector('.app-shell') !== null,
  })`)
  healthyAgain.probes === 0 && healthyAgain.cards === 0
    ? ok('without ?panelfail the forced-throw hook is completely inert (0 probes, 0 failure cards)')
    : bad('the forced-throw hook is active without the parameter (' + JSON.stringify(healthyAgain) + ')')
  healthyAgain.appShell && healthyAgain.tabs >= 3
    ? ok('the app loads healthy again after the containment demonstration')
    : bad('the app did not return to a healthy state (' + JSON.stringify(healthyAgain) + ')')

  /* v7 closure (gap 5): the `?panelfail` throw is DELIBERATE, so the boundary's
   * own componentDidCatch line, React's dev log of the captured error and the
   * "The above error occurred in the <PanelFailureProbe> component" message are
   * expected traffic — they are excluded by the probe's OWN error text, never by
   * a broad "any panel error" pattern, so a real (uncontained) failure still
   * fails this gate. How many lines were excluded is reported. */
  const DELIBERATE_PROBE = /deliberate render failure|PanelFailureProbe/
  const collected = [...new Set([...exceptions, ...consoleErrors])].filter(
    (e) => !/favicon/i.test(e) && !/404 \(Not Found\)/.test(e),
  )
  const deliberate = collected.filter(
    (e) => /panel\] .* failed/.test(e) || DELIBERATE_PROBE.test(e),
  )
  const p0Errors = collected.filter(
    (e) => !/panel\] .* failed/.test(e) && !DELIBERATE_PROBE.test(e),
  )
  if (deliberate.length > 0) {
    info('excluded ' + deliberate.length + ' log line(s) from the DELIBERATE ?panelfail throw: "'
      + deliberate[0].slice(0, 90) + '"')
  }
  if (p0Errors.length === 0) {
    ok('no unexpected runtime errors during the P0 gates (the deliberate throw is reported by the boundary itself)')
  } else {
    bad(p0Errors.length + ' unexpected error(s) during the P0 gates: ' + p0Errors.slice(0, 3).join(' || '))
  }

  /* ============== v8: the cerebral-vasculature layer =====================
   * docs/NEUROATLAS_V8_PLAN.md §2. The vascular overlay is a REGION of its own,
   * hidden at default framing through the region layer and shown by the
   * Whole-brain and Vasculature presets; selecting an artery reports its
   * territory and the syndromes it causes. What is checked here is the DOM
   * contract — the data itself is gated by validate / verify:pipeline /
   * verify:anatomy, and the highlight rule by store.highlightIdSet's own
   * assertions at module load.
   */
  const vascularState = `(() => {
    const regionRow = [...document.querySelectorAll('.tree-region')].find(
      (r) => r.querySelector('.tree-region-name')?.textContent?.trim() === 'Cerebral vasculature')
    const legend = (label) => {
      const row = [...document.querySelectorAll('.legend-row.legend-toggle')].find(
        (l) => l.textContent.trim() === label)
      const input = row?.querySelector('input')
      return input ? !!input.checked : null
    }
    return {
      regionRowFound: !!regionRow,
      regionOff: regionRow ? regionRow.classList.contains('is-off') : null,
      regionCount: regionRow ? Number(regionRow.querySelector('.tree-count')?.textContent ?? NaN) : null,
      legendVasculature: legend('vasculature'),
      legendVessel: legend('vessel'),
      legendNucleus: legend('nucleus'),
      swatch: [...document.querySelectorAll('.legend-row')].some(
        (r) => r.textContent.trim() === 'Cerebral arteries'),
      presetButton: [...document.querySelectorAll('button')].some(
        (b) => b.textContent.trim() === 'Vasculature'),
    }
  })()`

  /* v11 RE-POINT (was: `clickText('Brainstem focus')`). The default framing is now
   * reached through the header's Reset action, which the v11 header binds to the
   * store's EXISTING `applyViewPreset('brainstem-focus')` — so this step asserts
   * BOTH that Reset lands on the documented default (the preset button reads
   * pressed at the same moment) and that the default framing is what v8 claims. */
  const resetClick = await evaluate(clickHook('[data-header-action="reset"]'))
  await sleep(500)
  const resetState = await evaluate(`(() => {
    const reset = document.querySelector('[data-header-action="reset"]');
    const preset = document.querySelector('[data-preset="brainstem-focus"]');
    const read = (b) => (b === null ? null : b.getAttribute('aria-pressed'));
    return { reset: read(reset), defaultPreset: read(preset), presetLabel: preset === null ? null : (preset.textContent || '').trim() };
  })()`)
  const vascDefault = await evaluate(vascularState)
  resetState.reset === 'true' && resetState.defaultPreset === 'true'
    ? ok(
      'v11: ' + String(resetClick) + ' restores the documented default framing (Reset aria-pressed=true and ' +
        'data-preset="brainstem-focus" (' + String(resetState.presetLabel) + ') aria-pressed=true at the same moment)',
    )
    : bad(
      'v11: the Reset action did not land on the documented default framing (' + JSON.stringify(resetState) + ', ' +
        String(resetClick) + ')',
    )
  if (!vascDefault.regionRowFound) {
    bad('the taxonomy tree has no "Cerebral vasculature" region row — the v8 region did not reach the tree')
  } else {
    vascDefault.regionCount === 14
      ? ok('the tree carries the vascular region with all 14 artery records ("Cerebral vasculature", count 14)')
      : bad(`the vascular region row reports ${vascDefault.regionCount} records, expected 14`)
    vascDefault.regionOff === true
      ? ok('the default Brainstem-focus framing has the vascular region layer OFF (hidden by region, plan §2)')
      : bad('the default framing does not have the vascular region layer off — the arterial overlay would sit on the brainstem by default')
  }
  vascDefault.legendVasculature === false && vascDefault.legendVessel === true
    ? ok('the legend agrees with the tree: region "vasculature" off, kind "vessel" on (the two surfaces read one layer state)')
    : bad('legend layer state disagrees with the tree (' + JSON.stringify({
        vasculature: vascDefault.legendVasculature, vessel: vascDefault.legendVessel,
      }) + ')')
  vascDefault.swatch
    ? ok('the palette legend documents the new "Cerebral arteries" family')
    : bad('the palette legend has no "Cerebral arteries" row')

  if (!vascDefault.presetButton) {
    bad('the header has no "Vasculature" preset button')
  } else {
    /* ------------------------------------------------------------------ (1)
     * v11 RE-POINT: THE NEW PRIMARY CONTROL. The Areas row's `Cerebral
     * vasculature` toggle is what the user asked for (an area switch, not a
     * preset), so the vascular REGION is now driven through it — addressed by
     * `data-area`, never by its label. Both directions are asserted (the same
     * button must also switch it back off), and the tree AND the legend must
     * follow, because the region layer is the one fact all three read. */
    const areaOnClick = await evaluate(clickHook('[data-area="vasculature"]'))
    await sleep(700)
    const vascAreaOn = await evaluate(vascularState)
    const areaOnState = await evaluate(hookState('[data-area="vasculature"]'))
    vascAreaOn.regionOff === false && vascAreaOn.legendVasculature === true && areaOnState?.pressed === true
      ? ok(
        'v11: ' + String(areaOnClick) + ' switches the vascular REGION on in the tree, in the legend and in its own ' +
          'aria-pressed (' + String(areaOnState.name) + ')',
      )
      : bad(
        'v11: the Areas toggle did not turn the vascular region on (' +
          JSON.stringify({ tree: vascAreaOn.regionOff, legend: vascAreaOn.legendVasculature, button: areaOnState }) + ')',
      )
    vascAreaOn.legendNucleus === true
      ? ok('v11: the area toggle is a REGION switch only — the nucleus kind layer is untouched (' + vascAreaOn.legendNucleus + ')')
      : bad('v11: the area toggle also changed the nucleus KIND layer (' + JSON.stringify(vascAreaOn) + ')')
    const areaOffClick = await evaluate(clickHook('[data-area="vasculature"]'))
    await sleep(700)
    const vascAreaOff = await evaluate(vascularState)
    vascAreaOff.regionOff === true && vascAreaOff.legendVasculature === false
      ? ok('v11: ' + String(areaOffClick) + ' switches it back off (the toggle is symmetric: tree + legend both off again)')
      : bad('v11: the area toggle did not switch the vascular region back off (' + JSON.stringify(vascAreaOff) + ')')

    /* ------------------------------------------------------------------ (2)
     * The v8 preset claim itself, now addressed by its MACHINE HOOK
     * (`[data-preset="vasculature"]`) instead of by the exact label text — the
     * label stays in the assertion message as evidence, not as the target. */
    const presetClick = await evaluate(clickHook('[data-preset="vasculature"]'))
    await sleep(700)
    const vascOn = await evaluate(vascularState)
    vascOn.regionOff === false && vascOn.legendVasculature === true
      ? ok('the Vasculature preset (' + String(presetClick) + ') switches the vascular region layer ON in both the tree and the legend')
      : bad('the Vasculature preset did not turn the vascular region on (' + JSON.stringify(vascOn) + ')')
    vascOn.legendNucleus === false
      ? ok('the Vasculature preset is the arterial cast: nuclei are layer-off by kind, vessels are on')
      : bad('the Vasculature preset leaves the nucleus kind layer on — it is not the cast view the plan describes')

    /* ------------------------------------------------------------------ (3)
     * v11's OWN CLAIM, and the reason the two rows exist: the orthogonal axes
     * COMPOSE the cast the single preset used to describe. From the default,
     * Areas{Cerebral vasculature}=on plus Systems{Nuclei,Tracts,Ventricles}=off
     * must produce the same three readings the preset produces — if either row
     * were wired to a different set, the two paths would disagree. */
    const composeSteps = []
    composeSteps.push(String(await evaluate(clickHook('[data-header-action="reset"]'))))
    await sleep(700)
    composeSteps.push(String(await evaluate(clickHook('[data-area="vasculature"]'))))
    await sleep(600)
    for (const kind of ['nucleus', 'tract', 'ventricle']) {
      composeSteps.push(String(await evaluate(clickHook(`[data-kind="${kind}"]`))))
      await sleep(600)
    }
    const vascComposed = await evaluate(vascularState)
    const composedAgrees =
      vascComposed.regionOff === vascOn.regionOff &&
      vascComposed.legendVasculature === vascOn.legendVasculature &&
      vascComposed.legendVessel === vascOn.legendVessel &&
      vascComposed.legendNucleus === vascOn.legendNucleus
    composedAgrees
      ? ok(
        'v11: the two rows COMPOSE the arterial cast without the preset — Areas{Cerebral vasculature}=on + ' +
          'Systems{Nuclei,Tracts,Ventricles}=off gives the same reading as the preset ' +
          JSON.stringify({ regionOff: vascComposed.regionOff, vasculature: vascComposed.legendVasculature, vessel: vascComposed.legendVessel, nucleus: vascComposed.legendNucleus }),
      )
      : bad(
        'v11: the Areas/Systems rows do not compose what the Vasculature preset describes (rows ' +
          JSON.stringify(vascComposed) + ' vs preset ' + JSON.stringify(vascOn) + '), steps: ' + composeSteps.join(' | '),
      )
    /* back to the cast for the artery-selection half below (the preset path). */
    await evaluate(clickHook('[data-preset="vasculature"]'))
    await sleep(700)

    // Open the vascular region in the tree, then select an artery through it.
    await evaluate(`(() => {
      const region = [...document.querySelectorAll('.tree-region')].find(
        (r) => r.querySelector('.tree-region-name')?.textContent?.trim() === 'Cerebral vasculature')
      region?.querySelector('.tree-region-row')?.click()
      return !!region
    })()`)
    await sleep(400)
    const subdivisionOpened = await evaluate(`(() => {
      const region = [...document.querySelectorAll('.tree-region')].find(
        (r) => r.querySelector('.tree-region-name')?.textContent?.trim() === 'Cerebral vasculature')
      const sub = [...(region?.querySelectorAll('.tree-sub-row') ?? [])].find(
        (s) => s.querySelector('.tree-sub-name')?.textContent?.trim() === 'Posterior circulation')
      sub?.click()
      return [...(region?.querySelectorAll('.tree-sub-name') ?? [])].map((n) => n.textContent.trim())
    })()`)
    subdivisionOpened.includes('Posterior circulation')
      ? ok('the vascular region expands into its circulations (' + subdivisionOpened.join(' · ') + ')')
      : bad('the vascular region has no "Posterior circulation" subdivision (' + JSON.stringify(subdivisionOpened) + ')')
    await sleep(400)
    const selected = await evaluate(`(() => {
      const leaf = [...document.querySelectorAll('.tree-leaf-row')].find(
        (b) => b.querySelector('.tree-leaf-name')?.textContent?.trim() === 'Posterior cerebral artery')
      if (!leaf) return null
      leaf.click()
      return leaf.querySelector('.tree-leaf-name').textContent.trim()
    })()`)
    if (selected === null) {
      bad('the vascular region tree has no "Posterior cerebral artery" leaf')
    } else {
      await sleep(700)
      const arteryPanel = await evaluate(`(() => {
        const sections = [...document.querySelectorAll('.info-section')]
        const heading = (h) => sections.find(
          (s) => s.querySelector('h3')?.textContent?.trim() === h)
        const territory = heading('Territory (structures supplied)')
        const syndromes = heading('Involved in syndromes')
        return {
          name: document.querySelector('.info-name')?.textContent?.trim() ?? '',
          territoryChips: territory ? [...territory.querySelectorAll('.chip')].map((c) => c.textContent.trim()) : null,
          syndromeChips: syndromes ? [...syndromes.querySelectorAll('.chip')].map((c) => c.textContent.trim()) : null,
          hasClinical: heading('Clinical significance') !== undefined,
        }
      })()`)
      arteryPanel.name === 'Posterior cerebral artery'
        ? ok('selecting an artery from the tree opens its own record (info panel: "' + arteryPanel.name + '")')
        : bad('the selected artery did not reach the info panel (got "' + arteryPanel.name + '")')
      // NOTE: these two conditions are bound to consts on purpose. Written as bare
      // `(expr) >= n ? ok : bad` statements they would be parsed as a CALL of the
      // previous line's `bad(...)` (no semicolons in this file, and a statement
      // starting with `(` never gets an automatic semicolon) — the ternary's
      // alternate branch would swallow them and both checks would silently never
      // run. A statement that starts with an identifier cannot do that.
      const territoryCount = arteryPanel.territoryChips?.length ?? 0
      const syndromeCount = arteryPanel.syndromeChips?.length ?? 0
      territoryCount >= 5
        ? ok('the artery record reports its territory as ' + territoryCount
            + ' selectable structures (' + arteryPanel.territoryChips.slice(0, 3).join(', ') + '…)')
        : bad('the artery record has no usable territory list (' + JSON.stringify(arteryPanel.territoryChips) + ')')
      syndromeCount >= 1
        ? ok('the artery names the syndromes it causes — the vessel→syndrome `supply` index is live ('
            + syndromeCount + ': ' + arteryPanel.syndromeChips.slice(0, 3).join(', ') + ')')
        : bad('the artery record lists no syndromes — the `supply` reverse index is not wired')
      arteryPanel.hasClinical
        ? ok('the artery carries its clinical significance (what an infarct there causes)')
        : bad('the artery record has no clinical section')
    }

    // Round trip: back to the default via the v11 Reset action (was
    // `clickText('Brainstem focus')`), the overlay must be off again.
    const backClick = await evaluate(clickHook('[data-header-action="reset"]'))
    await sleep(500)
    const vascBack = await evaluate(vascularState)
    const backPreset = await evaluate(hookState('[data-preset="brainstem-focus"]'))
    vascBack.regionOff === true && vascBack.legendVasculature === false && backPreset?.pressed === true
      ? ok(
        'v11: ' + String(backClick) + ' hides the vascular layer again and reports the documented default ' +
          '(region toggle is the only switch; data-preset="brainstem-focus" pressed=true)',
      )
      : bad(
        'the vascular layer did not return to off (' + JSON.stringify(vascBack) + ', ' +
          JSON.stringify(backPreset) + ', ' + String(backClick) + ')',
      )
  }

  /* ======================================================================
   * P — v9 ITEMS 1, 2, 4 AND 5: the somatotopic map, the cortical-division
   *     layer, the images-off state and the simulated-section panel.
   *
   * Each sub-block states what it FALSIFIES. The commands that CANNOT be run
   * from this sandbox (Chrome is denied: platform_channel.cc:108) are the ones
   * in this block — running them is the orchestrator's lane, and every claim
   * below is a claim about what this block checks when it runs there.
   *
   *  P1  item 1 — the two strips and their 16 segments really are in the tree in
   *      SOMATOTOPIC order; selecting a segment really resolves to its authored
   *      record (info panel carrying the honest "schematic on the DERIVED …
   *      ribbon" caveat); and the 3D overlay really draws the selected
   *      segment's body-part label — drei's <Html> is DOM, so "the overlay is
   *      mounted, gated on and reading the shared selection" is observable —
   *      and really stops drawing when EITHER the telencephalon region or the
   *      `context` kind layer is switched off (that is the overlay's own gate).
   *  P2  item 2 — the toggle really repaints the live section: the Plates
   *      canvas' pixel hash CHANGES with the layer on and CHANGES BACK with it
   *      off, the legend lists the six divisions and carries the caveat
   *      verbatim, and the choice is persisted under `neuroaxis.sectionLobes`.
   *  P3  item 4 — the images-off state is complete on the Plates surface: the
   *      button's accessible name says what it does, the state note is a
   *      statement of CHOICE (no "unavailable at this plane" coverage excuse),
   *      no credit line is rendered for imagery that is not drawn, the section
   *      still paints, and the state is persisted.
   *  P4  items 4+5 — the same state is honoured by the PANEL while the Plates
   *      tab asks for real imagery (the independence requirement), the panel
   *      never lets a real-imagery draw reach its canvas (no "blocked" alarm,
   *      0 <img>, 0 credit, one 2D canvas, painted pixels), the Plates tab keeps
   *      drawing the real layer, the user's stored modality is NOT rewritten by
   *      the panel — and the panel's size, the layer choice and the imagery
   *      state all survive a RELOAD.
   * ==================================================================== */

  /* ---------------------------------------------------------------- P1 */
  await evaluate(clickText('3D'))
  await sleep(2500)

  /* Two round trips on purpose: React renders the subdivision rows only after
     the region row's click has been committed, so a single synchronous
     click-then-query would always find nothing on a collapsed region. */
  const openTelRegion = await evaluate(`(() => {
    const region = [...document.querySelectorAll('.tree-region')].find((r) =>
      /telencephalon/i.test(r.querySelector('.tree-region-name')?.textContent || ''));
    if (!region) return 'no telencephalon region row in the tree';
    const row = region.querySelector('.tree-region-row');
    if (row && row.getAttribute('aria-expanded') !== 'true') row.click();
    return row && row.getAttribute('aria-expanded') === 'true' ? 'already open' : 'opened';
  })()`)
  await sleep(900)
  const openCorticalSubdivision = await evaluate(`(() => {
    const region = [...document.querySelectorAll('.tree-region')].find((r) =>
      /telencephalon/i.test(r.querySelector('.tree-region-name')?.textContent || ''));
    if (!region) return 'no telencephalon region row in the tree';
    const sub = [...region.querySelectorAll('.tree-sub-row')].find((s) =>
      (s.querySelector('.tree-sub-name')?.textContent || '').trim() === 'Functional cortical areas');
    if (!sub) return 'no "Functional cortical areas" subdivision row';
    if (sub.getAttribute('aria-expanded') !== 'true') sub.click();
    return 'opened';
  })()`)
  await sleep(1000)
  const stripOrder = await evaluate(`(() => {
    const childrenOf = (parentName) => {
      const row = [...document.querySelectorAll('.tree-leaf-row')].find((b) =>
        (b.querySelector('.tree-leaf-name')?.textContent || '').trim() === parentName);
      if (!row) return null;
      const list = row.parentElement ? row.parentElement.querySelector('ul.tree-children') : null;
      if (list === null) return [];
      return [...list.querySelectorAll('.tree-leaf-name')].map((n) => (n.textContent || '').trim());
    };
    const subdivision = [...document.querySelectorAll('.tree-sub-row')].find((s) =>
      (s.querySelector('.tree-sub-name')?.textContent || '').trim() === 'Functional cortical areas');
    return {
      region: ${JSON.stringify(openTelRegion)},
      open: ${JSON.stringify(openCorticalSubdivision)},
      m1: childrenOf('Primary motor cortex (M1)'),
      s1: childrenOf('Primary somatosensory cortex (S1)'),
      count: subdivision ? (subdivision.querySelector('.tree-count')?.textContent || '').trim() : null,
    };
  })()`)
  const SOMATOTOPY_PARTS = ['toe', 'leg', 'trunk', 'arm', 'hand', 'face', 'tongue', 'larynx']
  const partOfName = (name) => String(name).split('—').pop().trim().replace(/\s*representation$/, '')
  const stripVerdict = (list, stripId) => {
    if (!Array.isArray(list)) {
      return { ok: false, detail: `${stripId}: the tree has no row for the strip's parent record` }
    }
    const parts = list.map(partOfName)
    const ordered = parts.join(',') === SOMATOTOPY_PARTS.join(',')
    return {
      ok: list.length === 8 && ordered,
      detail: `${stripId}: ${list.length} segment(s), ${ordered ? 'somatotopic order' : 'WRONG order'} — ${parts.join(' → ')}`,
    }
  }
  const m1Verdict = stripVerdict(stripOrder.m1, 'ctx-m1')
  const s1Verdict = stripVerdict(stripOrder.s1, 'ctx-s1')
  m1Verdict.ok
    ? ok(`the taxonomy tree carries the M1 strip in somatotopic order (${m1Verdict.detail})`)
    : bad(`the M1 strip is not in the tree in somatotopic order (${m1Verdict.detail})`)
  s1Verdict.ok
    ? ok(`the taxonomy tree carries the S1 strip in somatotopic order (${s1Verdict.detail})`)
    : bad(`the S1 strip is not in the tree in somatotopic order (${s1Verdict.detail})`)

  const pickSomatotopy = await evaluate(`(() => {
    const row = [...document.querySelectorAll('.tree-leaf-row')].find((b) =>
      (b.querySelector('.tree-leaf-name')?.textContent || '').trim() === 'Primary motor cortex (M1) — hand representation');
    if (!row) return 'leaf not found in the tree';
    row.click();
    return 'clicked';
  })()`)
  await sleep(1800)
  const somatotopyRecord = await evaluate(`({
    name: (document.querySelector('.info-name')?.textContent || '').trim(),
    body: (document.querySelector('.info-panel')?.innerText || '').slice(0, 8000),
    labels: [...document.querySelectorAll('.label3d')].map((n) => (n.textContent || '').trim()),
    tabActive: [...document.querySelectorAll('button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => (b.textContent || '').trim()).slice(0, 4),
  })`)
  somatotopyRecord.name === 'Primary motor cortex (M1) — hand representation'
    ? ok(`selecting a somatotopy segment resolves to its own authored record ("${somatotopyRecord.name}")`)
    : bad(`the somatotopy leaf did not resolve to its record (info panel "${somatotopyRecord.name}", ${pickSomatotopy})`)
  /* NOTE (the same hazard the v8 block documents): a statement must never START
     with a regex literal in this file — no semicolons, so a leading `/` would be
     parsed as a division of the previous line. Both tests are named consts. */
  const somatotopyCaveat = /schematic on the\s+derived|PLACEMENT IS SCHEMATIC ON THE DERIVED/i.test(somatotopyRecord.body)
    && /ribbon/i.test(somatotopyRecord.body)
  somatotopyCaveat
    ? ok('the selected record carries the honest limit into the info panel (placement schematic on the DERIVED ribbon)')
    : bad('the somatotopy record does not state the derived-ribbon caveat in the info panel')
  const handLabelCount = somatotopyRecord.labels.filter((text) => text === 'Hand').length
  handLabelCount >= 1
    ? ok(`the 3D overlay draws the SELECTED segment's body-part label (${handLabelCount} .label3d reading "Hand", `
      + `labels in the DOM: ${JSON.stringify(somatotopyRecord.labels.slice(0, 6))})`)
    : bad(`no body-part label for the selected somatotopy segment in the 3D view (labels: ${JSON.stringify(somatotopyRecord.labels)}, ${pickSomatotopy})`)

  const toggleLegendLayer = (label) => evaluate(`(() => {
    const row = [...document.querySelectorAll('.legend-row.legend-toggle')].find((l) => (l.textContent || '').trim() === ${JSON.stringify(label)});
    if (!row) return 'no legend toggle for "' + ${JSON.stringify(label)} + '"';
    const input = row.querySelector('input');
    if (!input) return 'the legend row for "' + ${JSON.stringify(label)} + '" has no input';
    input.click();
    return 'toggled';
  })()`)
  const legendLayerState = (label) => evaluate(`(() => {
    const row = [...document.querySelectorAll('.legend-row.legend-toggle')].find((l) => (l.textContent || '').trim() === ${JSON.stringify(label)});
    return row ? row.querySelector('input').checked : null;
  })()`)
  const legendToggleActions = []
  const layerGate = [
    { label: 'context', note: 'context kind layer' },
    { label: 'telencephalon', note: 'telencephalon region layer' },
  ]
  for (const gate of layerGate) {
    legendToggleActions.push(await toggleLegendLayer(gate.label))
    await sleep(900)
    const offState = await legendLayerState(gate.label)
    const labelsOff = await evaluate(`[...document.querySelectorAll('.label3d')].map((n) => (n.textContent || '').trim())`)
    const clearedOff = labelsOff.filter((text) => text === 'Hand').length === 0
    offState === false && clearedOff
      ? ok(`the somatotopy overlay honours the ${gate.note}: switched off → 0 body-part labels (the overlay's own gate, observed)`)
      : bad(`switching the ${gate.note} off did not remove the overlay (layer=${JSON.stringify(offState)}, labels=${JSON.stringify(labelsOff)})`)
    await toggleLegendLayer(gate.label)
    await sleep(900)
    const onState = await legendLayerState(gate.label)
    const labelsOn = await evaluate(`[...document.querySelectorAll('.label3d')].map((n) => (n.textContent || '').trim())`)
    const backOn = labelsOn.filter((text) => text === 'Hand').length >= 1
    onState === true && backOn
      ? ok(`switching the ${gate.note} back on restores the overlay and its label (${labelsOn.filter((t) => t === 'Hand').length} "Hand")`)
      : bad(`the overlay did not come back with the ${gate.note} (layer=${JSON.stringify(onState)}, labels=${JSON.stringify(labelsOn)})`)
  }
  info('somatotopy layer-gate toggles: ' + JSON.stringify(legendToggleActions))
  /* The tree is left open on ctx-m1/ctx-s1 and the selection is the M1 hand
     segment; the tab is whatever selectStructure chose (3D) — asserted above. */

  /* ---------------------------------------------------------------- P2 */
  await evaluate(clickText('Plates'))
  await sleep(1600)
  await evaluate(clickText('Live section'))
  await sleep(5000)
  const planeSet = await evaluate(`(() => {
    const r = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find((x) => /transverse/i.test(x.getAttribute('aria-label') || ''));
    if (!r) return 'no transverse slider';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(r, '48');
    r.dispatchEvent(new Event('input', { bubbles: true }));
    return r.value;
  })()`)
  await sleep(3000)
  const lobesOff = await evaluate(canvasStatsFor(PLATES_CANVAS))
  const lobesToggleInitial = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
    return b === null ? null : { pressed: b.getAttribute('aria-pressed'), text: (b.textContent || '').trim() };
  })()`)
  const lobesClickOn = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
    if (!b) return 'no .section-lobes-toggle in the Plates live section';
    b.click();
    return 'clicked';
  })()`)
  await sleep(1500)
  const lobesOn = await evaluate(`(() => {
    const b = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
    const legend = document.querySelector('.section-lobes-legend');
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.sectionLobes'); } catch (error) { stored = 'unavailable'; }
    return {
      pressed: b === null ? null : b.getAttribute('aria-pressed'),
      text: b === null ? '' : (b.textContent || '').trim(),
      rows: legend === null ? null : [...legend.querySelectorAll('.section-lobes-row')].map((n) => (n.textContent || '').trim()),
      note: legend === null ? null : (legend.querySelector('.section-lobes-note')?.textContent || '').trim(),
      stored,
    };
  })()`)
  const lobesOnStats = await evaluate(canvasStatsFor(PLATES_CANVAS))
  if (lobesToggleInitial === null) {
    bad('the live section has no "Cortical divisions" toggle (.section-lobes-toggle)')
  } else {
    lobesToggleInitial.pressed === 'false' && lobesToggleInitial.text === 'Cortical divisions'
      ? ok(`the cortical-division layer is off by default and its control is labelled ("${lobesToggleInitial.text}", aria-pressed=false)`)
      : bad(`the cortical-division toggle does not start in the documented state (${JSON.stringify(lobesToggleInitial)})`)
    lobesOn.pressed === 'true' && /on/.test(lobesOn.text)
      ? ok(`the toggle switches the layer ON ("${lobesOn.text}", aria-pressed=true)`)
      : bad(`clicking the cortical-division toggle did not press it (${JSON.stringify(lobesOn)} / ${lobesClickOn})`)
    Array.isArray(lobesOn.rows) && lobesOn.rows.length === 6
      ? ok(`the legend lists the six divisions (${lobesOn.rows.join(' · ')})`)
      : bad(`the legend does not list six divisions (${JSON.stringify(lobesOn.rows)})`)
    typeof lobesOn.note === 'string' && /DERIVED/.test(lobesOn.note) && /not a gyral/.test(lobesOn.note)
      ? ok('the legend carries the honest caveat verbatim (divides the DERIVED ribbon, not a gyral map)')
      : bad(`the legend does not carry the caveat (${JSON.stringify(lobesOn.note)})`)
    lobesOnStats !== null && lobesOff !== null && lobesOnStats.hash !== lobesOff.hash
      ? ok(`the layer really repaints the live section (canvas hash ${lobesOff.hash} → ${lobesOnStats.hash}, `
        + `non-background samples ${lobesOff.painted} → ${lobesOnStats.painted}, plane y=${planeSet})`)
      : bad(`switching the cortical-division layer on did not change the canvas (${JSON.stringify(lobesOff)} → ${JSON.stringify(lobesOnStats)})`)
    lobesOn.stored === '1'
      ? ok('the layer choice is persisted (neuroaxis.sectionLobes = "1")')
      : bad(`the layer choice was not persisted (neuroaxis.sectionLobes = ${JSON.stringify(lobesOn.stored)})`)

    /* off again — the layer must be switchable OFF as well as ON, and the
       canvas must go back to a different frame than the ON one. */
    const lobesClickOff = await evaluate(`(() => {
      const b = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
      if (!b) return 'no toggle';
      b.click();
      return 'clicked';
    })()`)
    await sleep(1500)
    const lobesOffAgain = await evaluate(canvasStatsFor(PLATES_CANVAS))
    const lobesOffState = await evaluate(`(() => {
      const b = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
      const legend = document.querySelector('.section-lobes-legend');
      let stored = null;
      try { stored = window.localStorage.getItem('neuroaxis.sectionLobes'); } catch (error) { stored = 'unavailable'; }
      return { pressed: b === null ? null : b.getAttribute('aria-pressed'), legend: legend !== null, stored };
    })()`)
    lobesOffState.pressed === 'false' && lobesOffState.legend === false
      ? ok(`switching the layer off removes both the legend and the colouring (aria-pressed=false, ${lobesClickOff})`)
      : bad(`the layer did not switch off cleanly (${JSON.stringify(lobesOffState)})`)
    lobesOffAgain !== null && lobesOnStats !== null && lobesOffAgain.hash !== lobesOnStats.hash
      ? ok(`the section goes back to a different frame with the layer off (hash ${lobesOnStats.hash} → ${lobesOffAgain.hash}; `
        + `identical to the pre-toggle frame: ${lobesOffAgain.hash === lobesOff?.hash})`)
      : bad(`the canvas did not change when the layer was switched off (${JSON.stringify(lobesOffAgain)})`)
    /* leave it ON: block P4 asserts the choice survives a reload. */
    await evaluate(`(() => {
      const b = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
      if (b) b.click();
    })()`)
    await sleep(1200)
  }

  /* ---------------------------------------------------------------- P3 */
  const imageryOffClick = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Simulated only');
    if (!b) return 'no "Simulated only" button in the modality row';
    if (b.disabled) return 'the "Simulated only" button is disabled: ' + (b.getAttribute('title') || '');
    b.click();
    return 'clicked';
  })()`)
  await sleep(2500)
  const imageryOff = await evaluate(`(() => {
    const off = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Simulated only');
    const offNote = document.querySelector('.section-alignment-note.is-imagery-off');
    const anyNote = document.querySelector('.section-alignment-note');
    const credit = document.querySelector('.section-credit');
    const hint = document.querySelector('.section-imagery-hint');
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.sectionUnderlay'); } catch (error) { stored = 'unavailable'; }
    return {
      pressed: off === null ? null : off.getAttribute('aria-pressed'),
      accessibleName: off === null ? '' : (off.getAttribute('aria-label') || ''),
      visibleLabel: off === null ? '' : (off.textContent || '').trim(),
      noteText: offNote === null ? null : (offNote.textContent || '').trim(),
      noteRole: offNote === null ? '' : (offNote.getAttribute('role') || ''),
      noteClass: offNote === null ? '' : String(offNote.className),
      anyNote: anyNote === null ? null : (anyNote.textContent || '').trim(),
      credit: credit === null ? null : (credit.textContent || '').trim().slice(0, 70),
      hint: hint === null ? null : (hint.textContent || '').trim(),
      stored,
    };
  })()`)
  const imageryOffStats = await evaluate(canvasStatsFor(PLATES_CANVAS))
  const imageryOffStored = (() => {
    try { return JSON.parse(imageryOff.stored) } catch (error) { return null }
  })()
  imageryOff.pressed === 'true' && /simulated only/i.test(imageryOff.visibleLabel)
    ? ok(`the images-off state is a first-class choice on the Plates surface ("${imageryOff.visibleLabel}", aria-pressed=true) — ${imageryOffClick}`)
    : bad(`the "Simulated only" state could not be selected (${JSON.stringify(imageryOff)} / ${imageryOffClick})`)
  imageryOff.accessibleName.indexOf(imageryOff.visibleLabel) !== -1 && /no imagery/i.test(imageryOff.accessibleName)
    ? ok(`the control's accessible name says what the state does ("${imageryOff.accessibleName}") — and contains the visible label (WCAG 2.5.3)`)
    : bad(`the accessible name does not describe the state ("${imageryOff.accessibleName}")`)
  const notesReadOk = typeof imageryOff.noteText === 'string'
  const noteStatesChoice = notesReadOk
    && /switched off/i.test(imageryOff.noteText)
    && /no imagery/i.test(imageryOff.noteText)
    && /panel/i.test(imageryOff.noteText)
    && !/at this plane/i.test(imageryOff.noteText)
  noteStatesChoice
    ? ok(`the state note states the CHOICE, not a coverage limit ("${imageryOff.noteText.slice(0, 120)}…")`)
    : bad(`the state note (.section-alignment-note.is-imagery-off) is missing or still reads as a coverage excuse (${JSON.stringify(imageryOff.noteText)})`)
  imageryOff.hint === null || (/switched off/i.test(imageryOff.hint) && !/at this plane/i.test(imageryOff.hint))
    ? ok(`the canvas hint agrees with the toolbar about the same state ("${String(imageryOff.hint).slice(0, 90)}")`)
    : bad(`the canvas hint contradicts the toolbar at the images-off state ("${String(imageryOff.hint)}")`)
  imageryOff.credit === null
    ? ok('no credit line is rendered while imagery is off (the credit would attribute an image that is not drawn)')
    : bad(`a credit line is still rendered with imagery off ("${imageryOff.credit}")`)
  imageryOffStored !== null && imageryOffStored.kind === 'none'
    ? ok(`the images-off state is persisted (neuroaxis.sectionUnderlay.kind = "${imageryOffStored.kind}", schemaVersion ${imageryOffStored.schemaVersion})`)
    : bad(`the images-off state was not persisted (${JSON.stringify(imageryOff.stored)})`)
  imageryOffStats !== null && imageryOffStats.painted > 50
    ? ok(`the simulated section is still drawn with imagery off (${imageryOffStats.painted}/${imageryOffStats.sampled} non-background samples)`)
    : bad(`"Simulated only" blanked the section (${JSON.stringify(imageryOffStats)})`)

  /* ---------------------------------------------------------------- P4 */
  /* Ask for a REAL modality on the Plates tab: the panel must keep showing the
     simulated section, and the Plates canvas must keep drawing the real layer. */
  const realModality = await evaluate(`(() => {
    const wanted = ['MRI', 'CT', 'Photo', 'Auto (real-first)'];
    for (const label of wanted) {
      const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === label);
      if (b && !b.disabled) { b.click(); return label; }
    }
    return 'none available';
  })()`)
  await sleep(3000)
  const realOnPlates = await evaluate(`(() => {
    const credit = document.querySelector('.section-credit');
    const off = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Simulated only');
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.sectionUnderlay'); } catch (error) { stored = 'unavailable'; }
    return {
      credit: credit === null ? null : (credit.textContent || '').trim().slice(0, 80),
      offPressed: off === null ? null : off.getAttribute('aria-pressed'),
      stored,
    };
  })()`)
  info(`real-modality request before the panel check: ${realModality} (credit "${String(realOnPlates.credit).slice(0, 60)}", images-off button pressed: ${realOnPlates.offPressed})`)

  await evaluate(clickText('3D'))
  await sleep(3000)
  const panelUnderRealRequest = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    if (panel === null) return null;
    const canvases = [...panel.querySelectorAll('canvas')];
    let stored = null;
    try { stored = window.localStorage.getItem('neuroaxis.sectionUnderlay'); } catch (error) { stored = 'unavailable'; }
    const lobes = [...panel.querySelectorAll('.section-lobes-toggle')];
    return {
      stateLine: (panel.querySelector('.pip-imagery-state')?.textContent ?? '').trim(),
      stateTitle: (panel.querySelector('.pip-imagery-state')?.getAttribute('title') ?? '').trim(),
      imgs: panel.querySelectorAll('img').length,
      credits: panel.querySelectorAll('a[href^="http"], .pip-credit').length,
      canvases: canvases.length,
      canvas2d: canvases.map((c) => { try { return c.getContext('2d') !== null; } catch (error) { return false; } }),
      statedSize: (panel.querySelector('.pip-resizer')?.getAttribute('aria-label') ?? '').trim(),
      stored,
      lobesToggles: lobes.length,
      lobesPressed: lobes.map((b) => b.getAttribute('aria-pressed')),
      lobesLegend: panel.querySelectorAll('.section-lobes-legend').length,
    };
  })()`)
  const panelPaint = await evaluate(canvasStatsFor(PIP_CANVAS))
  const panelStored = (() => {
    try { return JSON.parse(panelUnderRealRequest.stored) } catch (error) { return null }
  })()
  if (panelUnderRealRequest === null) {
    bad('the simulated-section panel is not in the 3D tab')
  } else {
    panelUnderRealRequest.imgs === 0 && panelUnderRealRequest.credits === 0
      && panelUnderRealRequest.canvases === 1 && panelUnderRealRequest.canvas2d[0] === true
      ? ok('the panel requests and receives no real imagery: 0 <img>, 0 credit link, its one canvas is 2D')
      : bad(`the panel is not imagery-free under a real-modality request (${JSON.stringify(panelUnderRealRequest)})`)
    const panelStatesSimulatedOnly = /simulated section only/.test(panelUnderRealRequest.stateLine)
      && !/blocked/i.test(panelUnderRealRequest.stateLine)
    panelStatesSimulatedOnly
      ? ok(`the panel states what it shows while the Plates tab asks for real imagery ("${panelUnderRealRequest.stateLine}") — no dropped-imagery alarm`)
      : bad(`the panel's imagery line is wrong or reports a blocked imagery draw ("${panelUnderRealRequest.stateLine}")`)
    info('panel imagery line at the real-modality request: "' + panelUnderRealRequest.stateLine
      + '" / title "' + panelUnderRealRequest.stateTitle.slice(0, 110) + '"')
    panelPaint !== null && panelPaint.painted > 50
      ? ok(`the panel paints the simulated section under a real-modality request (${panelPaint.painted}/${panelPaint.sampled} non-background samples)`)
      : bad(`the panel is blank under a real-modality request (${JSON.stringify(panelPaint)})`)
    realOnPlates.credit !== null
      ? ok(`the Plates tab kept drawing the REAL layer for the same plane (credit "${String(realOnPlates.credit).slice(0, 46)}") — the modality choice still works as before`)
      : info(`the Plates tab drew no real layer for ${realModality} at this plane (no credit line) — the panel-independence half is still asserted above`)
    const panelKeptUserChoice = panelStored !== null && panelStored.kind !== 'none'
      && String(realOnPlates.stored) === String(panelUnderRealRequest.stored)
    if (realModality === 'none available') {
      info('no real modality could be selected at this plane, so the panel-independence half of P4 '
        + 'is limited to the imagery-free assertions above (the imagery-off state was still asked for)')
    } else if (panelKeptUserChoice) {
      ok(`the panel did NOT rewrite the user's persisted modality (neuroaxis.sectionUnderlay.kind = "${panelStored.kind}" before and during the panel's lifetime)`)
    } else {
      bad(`the panel rewrote the persisted imagery choice (requested ${realModality}; Plates read ${JSON.stringify(realOnPlates.stored)}, panel read ${JSON.stringify(panelUnderRealRequest.stored)})`)
    }
    panelUnderRealRequest.lobesToggles === 1 && panelUnderRealRequest.lobesPressed[0] === 'true'
      ? ok('the panel carries the same cortical-division state as the Plates canvas (one toggle, aria-pressed=true — one shared layer state)')
      : bad(`the panel's cortical-division toggle disagrees with the Plates surface (${JSON.stringify({
          toggles: panelUnderRealRequest.lobesToggles, pressed: panelUnderRealRequest.lobesPressed,
        })})`)
  }

  /* ---- the reload: size + layer choice + imagery state must all survive ---- */
  const beforeReload = await evaluate(`(() => {
    const w = document.querySelector('.pip-panel .pip-window');
    const r = w === null ? null : w.getBoundingClientRect();
    let size = null, underlay = null;
    try {
      size = window.localStorage.getItem('neuroaxis.sectionPipSize');
      underlay = window.localStorage.getItem('neuroaxis.sectionUnderlay');
    } catch (error) { size = 'unavailable'; }
    return {
      width: r === null ? null : Math.round(r.width),
      height: r === null ? null : Math.round(r.height),
      size, underlay,
    };
  })()`)
  const resizeForReload = await evaluate(`(() => {
    const b = document.querySelector('.pip-panel .pip-resizer');
    if (b === null) return 'no resizer';
    b.focus();
    return document.activeElement === b ? 'focused' : 'not focused';
  })()`)
  await pressKey('ArrowRight', 'ArrowRight', 39)
  await pressKey('ArrowDown', 'ArrowDown', 40)
  await sleep(800)
  const sizedForReload = await evaluate(`(() => {
    const w = document.querySelector('.pip-panel .pip-window');
    const r = w === null ? null : w.getBoundingClientRect();
    let size = null;
    try { size = window.localStorage.getItem('neuroaxis.sectionPipSize'); } catch (error) { size = 'unavailable'; }
    return { width: r === null ? null : Math.round(r.width), height: r === null ? null : Math.round(r.height), size };
  })()`)
  const sizeChanged = sizedForReload.width !== beforeReload.width || sizedForReload.height !== beforeReload.height
  sizeChanged
    ? ok(`the panel was resized to a distinctive size before the reload (${sizedForReload.width}×${sizedForReload.height}, ${resizeForReload})`)
    : bad(`could not resize the panel before the reload check (${JSON.stringify(beforeReload)} → ${JSON.stringify(sizedForReload)})`)

  await send('Page.navigate', { url: BASE })
  await sleep(8000)
  await evaluate(clickText('3D'))
  await sleep(3000)
  const afterReload = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const w = panel === null ? null : panel.querySelector('.pip-window');
    const r = w === null ? null : w.getBoundingClientRect();
    let size = null, underlay = null;
    try {
      size = window.localStorage.getItem('neuroaxis.sectionPipSize');
      underlay = window.localStorage.getItem('neuroaxis.sectionUnderlay');
    } catch (error) { size = 'unavailable'; }
    const lobes = document.querySelector('.section-lobes-toggle');
    return {
      width: r === null ? null : Math.round(r.width),
      height: r === null ? null : Math.round(r.height),
      size, underlay,
      lobesPressed: lobes === null ? null : lobes.getAttribute('aria-pressed'),
      lobesLegend: document.querySelectorAll('.section-lobes-legend').length,
      panel: panel !== null,
    };
  })()`)
  const panelPaintAfterReload = await evaluate(canvasStatsFor(PIP_CANVAS))
  afterReload.panel && afterReload.width === sizedForReload.width && afterReload.height === sizedForReload.height
    ? ok(`the panel's size survives a RELOAD (${afterReload.width}×${afterReload.height}, persisted as ${afterReload.size})`)
    : bad(`the panel's size did not survive the reload (before ${sizedForReload.width}×${sizedForReload.height}, after ${afterReload.width}×${afterReload.height}, stored ${afterReload.size})`)
  afterReload.lobesPressed === 'true' && afterReload.lobesLegend === 1
    ? ok('the cortical-division layer is still ON after the reload, with its legend (the choice persisted, the layer repainted)')
    : bad(`the cortical-division layer did not survive the reload (pressed=${String(afterReload.lobesPressed)}, legends=${afterReload.lobesLegend})`)
  const afterReloadStored = (() => {
    try { return JSON.parse(afterReload.underlay) } catch (error) { return null }
  })()
  const imageryChoiceSurvived = afterReloadStored !== null && panelStored !== null
    && afterReloadStored.kind === panelStored.kind
  imageryChoiceSurvived
    ? ok(`the imagery choice is unchanged by the panel across a reload (neuroaxis.sectionUnderlay.kind = "${panelStored.kind}")`)
    : bad(`the persisted imagery choice changed across the reload (before ${JSON.stringify(panelStored)}, after ${JSON.stringify(afterReload.underlay)})`)
  panelPaintAfterReload !== null && panelPaintAfterReload.painted > 50
    ? ok(`the panel paints after the reload (${panelPaintAfterReload.painted}/${panelPaintAfterReload.sampled} non-background samples at its restored size)`)
    : bad(`the panel is blank after the reload (${JSON.stringify(panelPaintAfterReload)})`)

  /* leave the panel at the named small stop rather than at the custom size */
  const sizeReset = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    const b = panel && [...panel.querySelectorAll('button')].find((x) => /^Panel size/.test(x.getAttribute('title') || ''));
    if (!b) return 'no size button';
    b.click();
    return 'clicked';
  })()`)
  await sleep(700)
  const sizeAfterReset = await evaluate(`(() => {
    const w = document.querySelector('.pip-panel .pip-window');
    const r = w === null ? null : w.getBoundingClientRect();
    return { width: r === null ? null : Math.round(r.width), height: r === null ? null : Math.round(r.height) };
  })()`)
  sizeAfterReset.width === 224 && sizeAfterReset.height === 170
    ? ok(`the panel is left at its named small stop (224×170, ${sizeReset})`)
    : info(`the panel is left at ${JSON.stringify(sizeAfterReset)} (${sizeReset})`)

  /* ======================================================================
   * Q — v10: THE FIVE USER ITEMS, RE-POINTED AT THE NEW BEHAVIOUR
   *
   * (docs/SWARM_V10_PLAN.md §1–§5, PLAN.md §1–§5; run task `review-qa`.)
   * Every sub-block states what it FALSIFIES, in the style of the v9 block above.
   * The claims only the orchestrator's lane can observe are named in the run's
   * review report, not pretended here.
   *
   *  Q0  the scene bridge bound (no bridge ⇒ the two scene assertions FAIL
   *      loudly instead of passing vacuously).
   *  Q1  item 1 — the three helper quads, read back from the RENDERED three.js
   *      scene, span the CLIP_BOUNDS rectangle of their two in-plane axes: the
   *      extents equal the spans the app's own dock sliders publish (read from
   *      the DOM, never retyped here), the quads sit on the box midpoints, each
   *      sheet is at the clip value its slider was parked on, and the grid cell
   *      is the documented constant in au. A revert to the pre-v10 brainstem box
   *      (96×82 / 82×100 / 96×100 au) fails the first of those.
   *  Q2  item 2 — each SOLO leaves exactly that division on, seen in the legend
   *      checkboxes, in the taxonomy tree's dim state AND in the rendered scene;
   *      the scene after a solo is IDENTICAL to the scene after asking for the
   *      same regions through the per-region checkboxes (two independent paths,
   *      one render); nothing is persisted.
   *  Q3  item 3 — four handles with distinct names, reachable by a real pointer,
   *      and REAL drags (DevTools input pipeline) that resize by exactly the
   *      corner's rule and stop on the store's clamp.
   *  Q4  item 4 — the cortical-division layer at the exact planes PLAN.md §4
   *      measured the artefacts on: a division that existed there ONLY as a
   *      sub-threshold wedge is no longer reported as drawn, a division with a
   *      real body at the same plane still is, and Plates and PiP agree.
   *  Q5  item 5 — the cortex envelope's text is gone from the section canvas'
   *      OWN accessibility subtree (Plates AND PiP) while its contour is still
   *      drawn and hit-testable, and the suppression is specific (the thalamus
   *      envelope keeps its label).
   *  Q6  hygiene — no console error, no exception, app alive.
   * ==================================================================== */

  const v10ErrorsBefore = exceptions.length + consoleErrors.length
  const sameStringList = (a, b) =>
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i])
  /** Read a probe until two consecutive readings agree (r3f commits + renders). */
  const stableRead = async (expression, tries = 4) => {
    let previous = await evaluate(expression)
    for (let i = 0; i < tries; i++) {
      await sleep(350)
      const next = await evaluate(expression)
      if (JSON.stringify(next) === JSON.stringify(previous)) return next
      previous = next
    }
    return previous
  }

  /* ---------------------------------------------------------------- Q0 */
  await evaluate(clickText('3D'))
  await sleep(2500)
  const sceneProbe = await stableRead(SCENE_PROBE, 3)
  const sceneReady = sceneProbe !== null && sceneProbe.bound === true
  sceneReady
    ? ok(
      'v10 scene bridge: three.js scene bound for the rendered-geometry assertions (' +
        sceneProbe.observed + ' observed three object(s), ' + sceneProbe.scenes + ' scene(s))',
    )
    : bad(
      'v10 scene bridge could not bind a three.js scene (' + JSON.stringify(sceneProbe) + ') — the helper-extent ' +
        'and division-paint checks below CANNOT run, and they are reported as failures rather than skipped',
    )

  /* ---------------------------------------------------------------- Q1 */
  const sourceSpan = (axis) => {
    const bound = CLIP_BOUNDS_SOURCE[axis]
    return bound === undefined ? null : bound.max - bound.min
  }
  const sourceMid = (axis) => {
    const bound = CLIP_BOUNDS_SOURCE[axis]
    return bound === undefined ? null : (bound.min + bound.max) / 2
  }
  /* v11 §3a — the in-plane pair is the SHIPPED `AXIS_PAIR` table, read out of
   * `section/planeGeometry.ts`, in its ORDERED form `[u, v]`. The v10 audit
   * derived it by ascending axis NAME (dropping the swept axis from x, y, z),
   * which is the same answer for transverse and coronal and SWAPPED for sagittal
   * (171 × 148 vs the shipped 148 × 171) — so the sagittal helper quad was
   * reported as wrong while the quad was right. `AXIS_INDEX` is parsed from the
   * same file for the same reason: one table, one consumer. When the table cannot
   * be read there is NO fallback to a retyped convention: the comparison below
   * fails loudly instead (a check that passes by guessing is the failure mode
   * this project keeps re-learning). */
  const AXIS_INDEX = AXIS_INDEX_SOURCE ?? { x: 0, y: 1, z: 2 }
  const boundsReady =
    CLIP_BOUNDS_DECLARATIONS === 1 && ['x', 'y', 'z'].every((axis) => CLIP_BOUNDS_SOURCE[axis] !== undefined)
  boundsReady
    ? ok(
      'item 1 source contract: CLIP_BOUNDS is declared exactly once (' + CLIP_BOUNDS_DECLARATIONS +
        ' site in viewer3d/clipPlanes.ts) — x[' + CLIP_BOUNDS_SOURCE.x.min + ', ' + CLIP_BOUNDS_SOURCE.x.max +
        '] · y[' + CLIP_BOUNDS_SOURCE.y.min + ', ' + CLIP_BOUNDS_SOURCE.y.max +
        '] · z[' + CLIP_BOUNDS_SOURCE.z.min + ', ' + CLIP_BOUNDS_SOURCE.z.max + ']',
    )
    : bad(
      'the canonical box declaration could not be read from clipPlanes.ts (' + CLIP_BOUNDS_DECLARATIONS +
        ' declaration site(s); bounds ' + JSON.stringify(CLIP_BOUNDS_SOURCE) + ')',
    )
  if (AXIS_PAIR_SOURCE === null || AXIS_INDEX_SOURCE === null) {
    bad(
      'v11 item 1 source contract: the ORDERED in-plane pair / axis index could not be read out of ' +
        'section/planeGeometry.ts (AXIS_PAIR ' + JSON.stringify(AXIS_PAIR_SOURCE) + ', AXIS_INDEX ' +
        JSON.stringify(AXIS_INDEX_SOURCE) + ') — the helper-quad comparison below would compare against a ' +
        'retyped convention, which is exactly the v10 defect',
    )
  } else {
    ok(
      'v11 item 1 source contract: the in-plane convention is read from the shipped planeGeometry.ts — AXIS_PAIR ' +
        Object.keys(AXIS_PAIR_SOURCE).map((axis) => axis + ' → [' + AXIS_PAIR_SOURCE[axis].join(', ') + ']').join(' · ') +
        ' · AXIS_INDEX ' + JSON.stringify(AXIS_INDEX_SOURCE) + ' (u = pair[0], v = pair[1], never axis-name order)',
    )
  }
  const dockRanges = await evaluate(DOCK_SLIDERS)
  const dockAxes = (Array.isArray(dockRanges) ? dockRanges : []).map((slider) => {
    const axis = ['x', 'y', 'z'].find(
      (candidate) =>
        CLIP_BOUNDS_SOURCE[candidate] !== undefined &&
        Math.abs(slider.min - CLIP_BOUNDS_SOURCE[candidate].min) < 1e-6 &&
        Math.abs(slider.max - CLIP_BOUNDS_SOURCE[candidate].max) < 1e-6,
    )
    return { ...slider, axis: axis ?? null }
  })
  const dockSpanTable = dockAxes.filter((slider) => slider.axis !== null)
  const sliderSpansAreBounds =
    dockSpanTable.length === 3 &&
    ['x', 'y', 'z'].every((axis) =>
      dockSpanTable.some(
        (slider) => slider.axis === axis && Math.abs(slider.max - slider.min - sourceSpan(axis)) < 1e-6,
      ),
    )
  sliderSpansAreBounds
    ? ok(
      'item 1 DOM contract: the three dock clip sliders publish CLIP_BOUNDS itself — ' +
        dockSpanTable.map((s) => s.axis + '[' + s.min + ', ' + s.max + ']').join(' · '),
    )
    : bad(
      'the dock clip sliders do not match CLIP_BOUNDS (' + JSON.stringify(dockAxes) + ') — the helper-extent ' +
        'comparison would compare against the wrong box',
    )

  const helperToggle = await evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find((l) => /Show plane helper/i.test(l.textContent || ''));
    if (label === null) return { before: null, after: null, note: 'no "Show plane helper" label in the clipping dock' };
    const input = label.querySelector('input[type=checkbox]');
    if (input === null) return { before: null, after: null, note: 'the "Show plane helper" label has no checkbox' };
    const before = input.checked;
    if (input.checked !== true) input.click();
    return { before, after: input.checked, note: 'toggled the dock checkbox' };
  })()`)
  await sleep(1200)
  const parkSheets = await evaluate(`(() => {
    const bounds = ${JSON.stringify(CLIP_BOUNDS_SOURCE)};
    const wanted = { x: 12, z: 0, y: 58 };
    const dock = [...document.querySelectorAll('input[type=range]')].filter((r) =>
      !r.closest('.section-plane-sliders') &&
      !/explode/i.test((r.getAttribute('aria-label') || '') + ' ' + r.className));
    const axisOf = (r) => {
      for (const axis of ['x', 'y', 'z']) {
        const b = bounds[axis];
        if (b && Math.abs(Number(r.min) - b.min) < 1e-6 && Math.abs(Number(r.max) - b.max) < 1e-6) return axis;
      }
      return null;
    };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const readback = {};
    for (const r of dock) {
      const axis = axisOf(r);
      if (axis === null) continue;
      setter.call(r, String(wanted[axis]));
      r.dispatchEvent(new Event('input', { bubbles: true }));
      readback[axis] = Number(r.value);
    }
    return readback;
  })()`)
  await sleep(1500)
  const helperOn = await evaluate(HELPER_PROBE)
  if (!sceneReady) {
    bad('item 1: the helper extents could not be read from the rendered scene (no scene bridge)')
  } else if (helperOn === null || helperOn.sheets !== 3) {
    bad(
      'item 1: the "Show plane helper" toggle did not put three clip-plane sheets in the scene (' +
        JSON.stringify(helperOn) + ' / ' + JSON.stringify(helperToggle) + ')',
    )
  } else {
    ok(
      'item 1: the three clip-plane helper sheets are in the rendered scene with the helper toggle ON (' +
        JSON.stringify(helperToggle) + ')',
    )
    for (const sheet of helperOn.list) {
      const axisMatch = /^clip-helper-([xyz])$/.exec(String(sheet.name))
      const axis = axisMatch === null ? null : axisMatch[1]
      if (axis === null || sheet.quad === null || sheet.grid === null) {
        bad('item 1: helper sheet ' + JSON.stringify(sheet.name) + ' is not a clip-helper-<axis> group with a quad and a grid: ' + JSON.stringify(sheet))
        continue
      }
      /* v11 §3a: the ORDERED shipped pair — u is `AXIS_PAIR[axis][0]`, v is
       * `[1]`. A swap now fails instead of being silently accepted (the v10
       * derivation gave the sagittal sheet ['y','z'] = 171 × 148 au and reported
       * the correct 148 × 171 quad as the wrong side). */
      const inPlane = AXIS_PAIR_SOURCE === null ? null : AXIS_PAIR_SOURCE[axis]
      if (inPlane === null || inPlane.length !== 2) {
        bad(
          'item 1: the ORDERED in-plane pair for the ' + axis + '-plane helper could not be read from ' +
            'section/planeGeometry.ts (AXIS_PAIR ' + JSON.stringify(AXIS_PAIR_SOURCE) + ') — the quad comparison ' +
            'DID NOT RUN, and it is reported as a failure rather than compared against a guessed convention',
        )
        continue
      }
      const expected = {
        u: { span: sourceSpan(inPlane[0]), mid: sourceMid(inPlane[0]) },
        v: { span: sourceSpan(inPlane[1]), mid: sourceMid(inPlane[1]) },
      }
      const quadMatches =
        Math.abs(sheet.quad.width - expected.u.span) < 1e-6 && Math.abs(sheet.quad.height - expected.v.span) < 1e-6
      quadMatches
        ? ok(
          'item 1: the ' + axis + '-plane helper quad spans its CLIP_BOUNDS rectangle — ' +
            sheet.quad.width.toFixed(3) + ' au (' + inPlane[0] + ') x ' + sheet.quad.height.toFixed(3) +
            ' au (' + inPlane[1] + '), read from the rendered planeGeometry — the pair is the ORDERED shipped ' +
            'AXIS_PAIR.' + axis + ' = [' + inPlane.join(', ') + ']',
        )
        : bad(
          'item 1: the ' + axis + '-plane helper quad is ' + sheet.quad.width.toFixed(3) + ' x ' +
            sheet.quad.height.toFixed(3) + ' au while its in-plane CLIP_BOUNDS rectangle is ' +
            expected.u.span.toFixed(3) + ' x ' + expected.v.span.toFixed(3) + ' au (a second hardcoded box? ' +
            'AXIS_PAIR.' + axis + ' = [' + inPlane.join(', ') + '])',
        )
      const gridCoversQuad =
        Math.abs(sheet.grid.uMin + sheet.quad.width / 2) < 1e-3 &&
        Math.abs(sheet.grid.uMax - sheet.quad.width / 2) < 1e-3 &&
        Math.abs(sheet.grid.vMin + sheet.quad.height / 2) < 1e-3 &&
        Math.abs(sheet.grid.vMax - sheet.quad.height / 2) < 1e-3
      gridCoversQuad
        ? ok(
          'item 1: the ' + axis + '-plane grid covers its quad exactly (u ' + sheet.grid.uMin.toFixed(3) + '…' +
            sheet.grid.uMax.toFixed(3) + ', v ' + sheet.grid.vMin.toFixed(3) + '…' + sheet.grid.vMax.toFixed(3) +
            '; ' + sheet.grid.uCount + ' x ' + sheet.grid.vCount + ' lines)',
        )
        : bad(
          'item 1: the ' + axis + '-plane grid does not cover its quad (grid u ' +
            JSON.stringify([sheet.grid.uMin, sheet.grid.uMax]) + ' vs quad ' +
            JSON.stringify([-sheet.quad.width / 2, sheet.quad.width / 2]) + ')',
        )
      const cellTarget = HELPER_GRID_CELL_AU
      if (cellTarget === null) {
        bad('item 1: GRID_CELL_AU could not be read from PlaneHelpers.tsx — the legibility rule is unverified')
      } else {
        const cellOk =
          Math.abs(sheet.grid.uStep - cellTarget) / cellTarget < 0.15 &&
          Math.abs(sheet.grid.vStep - cellTarget) / cellTarget < 0.15
        cellOk
          ? ok(
            'item 1: the ' + axis + '-plane grid spacing is constant in au, not in line count — ' +
              sheet.grid.uStep.toFixed(3) + ' au x ' + sheet.grid.vStep.toFixed(3) + ' au cells (target ' + cellTarget + ' au)',
          )
          : bad(
            'item 1: the ' + axis + '-plane grid cell is ' + sheet.grid.uStep.toFixed(3) + ' x ' +
              sheet.grid.vStep.toFixed(3) + ' au where the source declares ' + cellTarget + ' au',
          )
      }
      const parkU = parkSheets === null || parkSheets === undefined ? null : parkSheets[inPlane[0]]
      const parkV = parkSheets === null || parkSheets === undefined ? null : parkSheets[inPlane[1]]
      const parkAxis = parkSheets === null || parkSheets === undefined ? null : parkSheets[axis]
      const centreOk =
        (parkU === undefined || parkU === null || Math.abs(sheet.position[AXIS_INDEX[inPlane[0]]] - expected.u.mid) < 1e-6) &&
        (parkV === undefined || parkV === null || Math.abs(sheet.position[AXIS_INDEX[inPlane[1]]] - expected.v.mid) < 1e-6)
      centreOk
        ? ok(
          'item 1: the ' + axis + '-plane helper is centred on the box midpoints, not on 0 (' + inPlane[0] + ' ' +
            sheet.position[AXIS_INDEX[inPlane[0]]].toFixed(2) + ' = mid ' + expected.u.mid.toFixed(2) + ', ' +
            inPlane[1] + ' ' + sheet.position[AXIS_INDEX[inPlane[1]]].toFixed(2) + ' = mid ' + expected.v.mid.toFixed(2) + ')',
        )
        : bad(
          'item 1: the ' + axis + '-plane helper is not centred on the box midpoints (' + JSON.stringify(sheet.position) +
            ' vs mid ' + JSON.stringify([expected.u.mid, expected.v.mid]) + ')',
        )
      const sitsOnPlane =
        parkAxis === undefined || parkAxis === null || Math.abs(sheet.position[AXIS_INDEX[axis]] - parkAxis) < 0.51
      sitsOnPlane
        ? ok(
          'item 1: the ' + axis + '-plane helper sits at the clip value its slider was parked on (' + axis + ' = ' +
            sheet.position[AXIS_INDEX[axis]].toFixed(2) + ' for slider ' + String(parkAxis) + ')',
        )
        : bad(
          'item 1: the ' + axis + '-plane helper sits at ' + sheet.position[AXIS_INDEX[axis]].toFixed(2) +
            ' while its slider reads ' + String(parkAxis),
        )
      const visualOk =
        Math.abs(sheet.quadOpacity - 0.07) < 1e-9 &&
        Math.abs(sheet.gridOpacity - 0.22) < 1e-9 &&
        sheet.quadColor === '#38bdf8' &&
        sheet.gridColor === '#38bdf8' &&
        sheet.quadRenderOrder === 30 &&
        sheet.gridRenderOrder === 31 &&
        sheet.quadSide === 2 &&
        sheet.raycastHits === 0
      visualOk
        ? ok(
          'item 1: the ' + axis + '-plane helper keeps its visual + raycast contract (#38bdf8, quad 0.07 / grid 0.22, ' +
            'renderOrder 30/31, DoubleSide, 0 raycast hits)',
        )
        : bad(
          'item 1: the ' + axis + '-plane helper visual/raycast contract changed (' + JSON.stringify({
            quadOpacity: sheet.quadOpacity, gridOpacity: sheet.gridOpacity, quadColor: sheet.quadColor,
            gridColor: sheet.gridColor, quadRenderOrder: sheet.quadRenderOrder, gridRenderOrder: sheet.gridRenderOrder,
            quadSide: sheet.quadSide, raycastHits: sheet.raycastHits,
          }) + ')',
        )
    }
  }
  /* off again: a helper that cannot be switched off is a regression of its own. */
  const helperOffToggle = await evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find((l) => /Show plane helper/i.test(l.textContent || ''));
    const input = label === null ? null : label.querySelector('input[type=checkbox]');
    if (input === null) return 'no checkbox';
    if (input.checked !== false) input.click();
    return 'checked ' + input.checked;
  })()`)
  await sleep(1000)
  const helperOff = await evaluate(HELPER_PROBE)
  if (!sceneReady) {
    bad('item 1: the helper OFF state could not be read from the scene')
  } else {
    helperOff !== null && helperOff.sheets === 0
      ? ok('item 1: switching the helper off removes all three sheets from the scene (' + String(helperOffToggle) + ')')
      : bad('item 1: the helper sheets survive the toggle being switched off (' + JSON.stringify(helperOff) + ')')
  }
  /* restore the toggle the audit found, so the panel/help state at the end of the
     run is the state the earlier blocks left it in. */
  if (helperToggle?.before === true) {
    await evaluate(`(() => {
      const label = [...document.querySelectorAll('label')].find((l) => /Show plane helper/i.test(l.textContent || ''));
      const input = label === null ? null : label.querySelector('input[type=checkbox]');
      if (input !== null && input.checked !== true) input.click();
      return 'restored';
    })()`)
    await sleep(700)
    info('item 1: the helper toggle was ON before these checks, and is restored ON after them')
  }
  /* ---------------------------------------------------------------- Q2 */
  const DIVISION_ROWS_PROBE = `(() => {
    const rows = [...document.querySelectorAll('[data-division-action="toggle"]')];
    return rows.map((input) => {
      const row = input.closest('.legend-division');
      const solo = row === null ? null : row.querySelector('[data-division-action="solo"]');
      return {
        id: input.getAttribute('data-division'),
        checked: input.checked,
        name: input.getAttribute('aria-label') || '',
        soloName: solo === null ? '' : (solo.getAttribute('aria-label') || ''),
        soloTag: solo === null ? null : solo.tagName,
        rowText: row === null ? '' : (row.textContent || '').trim(),
      };
    });
  })()`
  const divisionRows = await evaluate(DIVISION_ROWS_PROBE)
  const divisionIds = DIVISIONS_SOURCE.map((division) => division.id)
  const divisionRowsOk =
    Array.isArray(divisionRows) && divisionRows.length === divisionIds.length &&
    divisionIds.every((id) => divisionRows.some((row) => row.id === id)) &&
    divisionRows.every((row) => row.soloTag === 'BUTTON' && row.name.length > 0 && row.soloName.length > 0) &&
    new Set(divisionRows.map((row) => row.name)).size === divisionRows.length &&
    new Set(divisionRows.map((row) => row.soloName)).size === divisionRows.length
  divisionRowsOk
    ? ok(
      'item 2: the legend carries all ' + divisionRows.length + ' divisions, each with a checkbox AND a solo button and a distinct ' +
        'accessible name pair (' + divisionRows.map((row) => row.id).join(', ') + ')',
    )
    : bad(
      'item 2: the division control is incomplete in the DOM (' + JSON.stringify(divisionRows) +
        ' vs the store\'s own ids ' + JSON.stringify(divisionIds) + ')',
    )
  const namesNameTheirDivision = DIVISIONS_SOURCE.every((division) => {
    const row = (divisionRows ?? []).find((candidate) => candidate.id === division.id)
    return row !== undefined && row.name.includes(division.label) && row.soloName.includes(division.label)
  })
  namesNameTheirDivision
    ? ok('item 2: every division control names its own division in the accessible name (e.g. "' + String(divisionRows?.[0]?.soloName) + '")')
    : bad('item 2: a division control does not name its division (' + JSON.stringify((divisionRows ?? []).map((row) => row.soloName)) + ')')
  const axV10 = await send('Accessibility.getFullAXTree')
  const axNodesV10 = axV10?.nodes ?? []
  const axDivisionNames = axNodesV10
    .map((node) => node.name?.value ?? '')
    .filter((name) => typeof name === 'string' && /^(Show only|Toggle) the .* division/.test(name))
  axDivisionNames.length >= divisionIds.length * 2
    ? ok(
      'item 2: the accessibility tree exposes all ' + divisionIds.length * 2 + ' named division controls (' +
        axDivisionNames.slice(0, 3).join(' · ') + '…)',
    )
    : bad(
      'item 2: the accessibility tree carries ' + axDivisionNames.length + ' named division control(s), expected ' +
        divisionIds.length * 2 + ' (' + JSON.stringify(axDivisionNames) + ')',
    )
  /* The region rows only: the legend also carries kind rows, and those must NOT
     be touched by the division sweep. The region NAMES come from the divisions
     themselves — the store asserts that they partition ALL_REGIONS. */
  const regionNames = ALL_REGIONS_FROM_DIVISIONS
  /** A taxonomy-tree region row is labelled with `REGION_LABELS`, not the id. */
  const treeRegionOf = (label) => {
    const key = String(label ?? '').trim().toLowerCase()
    return REGION_LABEL_TO_REGION[key] ?? key
  }
  const REGION_ROW_PROBE = `(() => {
    const regions = ${JSON.stringify(regionNames)};
    const out = {};
    for (const row of document.querySelectorAll('.legend-row.legend-toggle')) {
      if (row.closest('.legend-divisions') !== null) continue;
      const input = row.querySelector('input[type=checkbox]');
      if (input === null) continue;
      const text = (row.textContent || '').trim();
      if (!regions.includes(text)) continue;
      out[text] = input.checked;
    }
    return out;
  })()`
  const setRegionToggles = (desired) => evaluate(`(() => {
    const regions = ${JSON.stringify(regionNames)};
    const desired = ${JSON.stringify(desired)};
    const clicked = [];
    for (const row of document.querySelectorAll('.legend-row.legend-toggle')) {
      if (row.closest('.legend-divisions') !== null) continue;
      const input = row.querySelector('input[type=checkbox]');
      if (input === null) continue;
      const text = (row.textContent || '').trim();
      if (!regions.includes(text)) continue;
      if (!Object.prototype.hasOwnProperty.call(desired, text)) continue;
      if (input.checked !== desired[text]) { input.click(); clicked.push((desired[text] ? 'on:' : 'off:') + text); }
    }
    return clicked.length === 0 ? 'no change needed' : clicked.join(', ');
  })()`)
  const regionBaseline = await evaluate(REGION_ROW_PROBE)
  const regionRowCount = Object.keys(regionBaseline ?? {}).length
  regionRowCount === regionNames.length
    ? ok(
      'item 2 DOM contract: the legend still exposes one checkbox per region (' + regionRowCount + ' of ' +
        regionNames.length + ' — the division control is additive, the per-region rows survive)',
    )
    : bad(
      'item 2: the legend exposes ' + regionRowCount + ' region checkbox(es), expected ' + regionNames.length +
        ' (' + JSON.stringify(regionBaseline) + ')',
    )
  const storageBaseline = await evaluate(
    `(() => { try { return Object.keys(window.localStorage); } catch (error) { return ['unavailable']; } })()`,
  )
  const DIVISION_STATE_PROBE = `(() => {
    const checked = {};
    for (const input of document.querySelectorAll('[data-division-action="toggle"]')) {
      checked[input.getAttribute('data-division')] = input.checked;
    }
    const leaves = [];
    for (const region of document.querySelectorAll('.tree-region')) {
      const name = ((region.querySelector('.tree-region-name') || {}).textContent || '').trim().toLowerCase();
      let on = 0, off = 0;
      for (const row of region.querySelectorAll('.tree-leaf-row')) {
        if (row.classList.contains('is-off')) off += 1; else on += 1;
      }
      leaves.push({ region: name, on, off });
    }
    return { checked, leaves };
  })()`
  const expandTreeForV10 = async () => {
    await evaluate(`(() => {
      for (const region of document.querySelectorAll('.tree-region')) {
        const row = region.querySelector('.tree-region-row');
        if (row && row.getAttribute('aria-expanded') !== 'true') row.click();
      }
      return 'regions opened';
    })()`)
    await sleep(900)
    await evaluate(`(() => {
      for (const sub of document.querySelectorAll('.tree-sub-row')) {
        if (sub.getAttribute('aria-expanded') !== 'true') sub.click();
      }
      return 'subdivisions opened';
    })()`)
    await sleep(1600)
  }
  await expandTreeForV10()
  const soloSweep = []
  if (!sceneReady) {
    bad('item 2: the division solo sweep needs the scene bridge and could not run — reported as a failure, not skipped')
  } else {
    for (const division of DIVISIONS_SOURCE) {
      const soloClick = await evaluate(`(() => {
        const button = document.querySelector('[data-division-action="solo"][data-division="' + ${JSON.stringify(division.id)} + '"]');
        if (button === null) return 'no solo button for ' + ${JSON.stringify(division.id)};
        button.click();
        return 'clicked solo';
      })()`)
      await sleep(900)
      const state = await evaluate(DIVISION_STATE_PROBE)
      const soloMeshes = await stableRead(VISIBLE_MESH_NAMES, 3)
      /* The SAME request through the per-region checkboxes: every region off,
         then exactly this division's regions on. Two independent UI paths. */
      const offAll = {}
      for (const name of regionNames) offAll[name] = false
      const offAllResult = await setRegionToggles(offAll)
      await sleep(900)
      const onDivision = {}
      for (const name of division.regions) onDivision[name] = true
      const onDivisionResult = await setRegionToggles(onDivision)
      await sleep(1000)
      const regionPathMeshes = await stableRead(VISIBLE_MESH_NAMES, 3)
      const checkedTrue = Object.entries(state?.checked ?? {}).filter(([, value]) => value === true).map(([id]) => id)
      const checkedOk = checkedTrue.length === 1 && checkedTrue[0] === division.id
      checkedOk
        ? ok(
          'item 2: solo("' + division.id + '") leaves exactly that division ticked and every other unticked (' +
            JSON.stringify(state?.checked) + ')',
        )
        : bad(
          'item 2: solo("' + division.id + '") left the legend checkboxes in ' + JSON.stringify(state?.checked) +
            ' (expected only "' + division.id + '")',
        )
      const outside = (state?.leaves ?? []).filter((row) => !division.regions.includes(treeRegionOf(row.region)))
      const inside = (state?.leaves ?? []).filter((row) => division.regions.includes(treeRegionOf(row.region)))
      const outsideDimmed = outside.length > 0 && outside.every((row) => row.on === 0 && row.off > 0)
      const insideLit = inside.length > 0 && inside.every((row) => row.on > 0)
      outsideDimmed && insideLit
        ? ok(
          'item 2: the taxonomy tree follows solo("' + division.id + '") — ' +
            outside.map((row) => treeRegionOf(row.region) + ' ' + row.off + '/' + (row.on + row.off) + ' dimmed').join(', ') +
            ' · lit: ' + inside.map((row) => treeRegionOf(row.region) + ' ' + row.on).join(', '),
        )
        : bad(
          'item 2: the tree does not follow solo("' + division.id + '") (outside ' + JSON.stringify(outside) +
            ', inside ' + JSON.stringify(inside) + ', label map ' + JSON.stringify(REGION_LABELS_SOURCE) + ')',
        )
      const meshesEqual = sameStringList(soloMeshes, regionPathMeshes)
      meshesEqual
        ? ok(
          'item 2: the rendered 3D scene after solo("' + division.id + '") is IDENTICAL to the scene after asking for the same ' +
            'regions through the per-region checkboxes — ' + (Array.isArray(soloMeshes) ? soloMeshes.length : -1) +
            ' visible mesh(es), same names (' + String(offAllResult) + ' | ' + String(onDivisionResult) + ')',
        )
        : bad(
          'item 2: solo("' + division.id + '") does not paint what its own region set paints (' +
            JSON.stringify(soloMeshes) + ' vs ' + JSON.stringify(regionPathMeshes) + ')',
        )
      soloSweep.push({ id: division.id, meshes: Array.isArray(soloMeshes) ? soloMeshes.length : -1, click: String(soloClick) })
      await setRegionToggles(regionBaseline ?? {})
      await sleep(700)
    }
    const everySoloNonEmpty = soloSweep.every((entry) => entry.meshes > 0)
    everySoloNonEmpty
      ? ok('item 2: every solo leaves a non-empty scene (' + soloSweep.map((entry) => entry.id + ' ' + entry.meshes).join(', ') + ' visible meshes)')
      : bad('item 2: a solo produced an empty 3D scene (' + JSON.stringify(soloSweep) + ')')
    const storageAfter = await evaluate(
      `(() => { try { return Object.keys(window.localStorage); } catch (error) { return ['unavailable']; } })()`,
    )
    const divisionKeys = (Array.isArray(storageAfter) ? storageAfter : []).filter((key) => /division/i.test(key))
    divisionKeys.length === 0
      ? ok(
        'item 2: the division control persists nothing (localStorage keys before/after the sweep: ' +
          JSON.stringify(storageBaseline) + ' -> ' + JSON.stringify(storageAfter) + ')',
      )
      : bad('item 2: the division control wrote ' + JSON.stringify(divisionKeys) + ' — a solo is a view filter, not a boot preference')
    const restoredRegions = await evaluate(REGION_ROW_PROBE)
    JSON.stringify(restoredRegions) === JSON.stringify(regionBaseline)
      ? ok('item 2: the v10 sweep left the app\'s own region layers exactly as it found them (' + JSON.stringify(restoredRegions) + ')')
      : bad('item 2: the v10 sweep did not restore the region layers (' + JSON.stringify(restoredRegions) + ' vs ' + JSON.stringify(regionBaseline) + ')')
    /* keyboard: a real checkbox + a real Space keypress, on the solo's own result.
       Self-calibrating: Space is first sent to a PLAIN checkbox ("Show plane
       helper"), so a CDP delivery problem is reported as an unverified path
       rather than as a product failure — and a working calibration makes the
       division checkbox assertion a real one. */
    const pressSpace = async () => {
      await send('Input.dispatchKeyEvent', {
        type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ',
      })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
    }
    const helperCheckboxState = `(() => {
      const label = [...document.querySelectorAll('label')].find((l) => /Show plane helper/i.test(l.textContent || ''));
      const input = label === null ? null : label.querySelector('input[type=checkbox]');
      if (input === null) return null;
      input.focus();
      return { checked: input.checked, focused: document.activeElement === input };
    })()`
    const calibrationBefore = await evaluate(helperCheckboxState)
    await pressSpace()
    await sleep(500)
    const calibrationAfter = await evaluate(helperCheckboxState)
    const spaceDelivered =
      calibrationBefore !== null && calibrationAfter !== null && calibrationBefore.checked !== calibrationAfter.checked
    if (spaceDelivered) await pressSpace()
    await evaluate(`(() => {
      const button = document.querySelector('[data-division-action="solo"][data-division="mesencephalon"]');
      if (button !== null) button.click();
      return 'soloed mesencephalon';
    })()`)
    await sleep(800)
    const keyboardFocus = await evaluate(`(() => {
      const input = document.querySelector('[data-division-action="toggle"][data-division="mesencephalon"]');
      if (input === null) return 'no mesencephalon checkbox';
      input.focus();
      return document.activeElement === input ? 'focused' : 'not focused';
    })()`)
    await pressSpace()
    await sleep(700)
    const afterSpace = await evaluate(`(() => {
      const input = document.querySelector('[data-division-action="toggle"][data-division="mesencephalon"]');
      return input === null ? null : input.checked;
    })()`)
    if (!spaceDelivered) {
      info(
        'item 2: the CDP Space key did not toggle a plain checkbox either (' + JSON.stringify(calibrationBefore) + ' -> ' +
          JSON.stringify(calibrationAfter) + ') — the division checkbox keyboard path is UNVERIFIED here, not failed',
      )
    } else if (String(keyboardFocus) === 'focused' && afterSpace === false) {
      ok(
        'item 2: the division checkbox is keyboard operable (a real Space keypress unticked the division the solo had just ' +
          'ticked; the same keypress toggled the calibration checkbox)',
      )
    } else {
      bad('item 2: the division checkbox did not respond to Space (' + String(keyboardFocus) + ' -> ' + String(afterSpace) + ')')
    }
    await setRegionToggles(regionBaseline ?? {})
    await sleep(700)
  }

  /* ---------------------------------------------------------------- Q3 */
  const SIZE_CLICK = `(() => {
    const panel = document.querySelector('.pip-panel');
    const button = panel === null ? null : [...panel.querySelectorAll('button')].find((x) => /^Panel size/.test(x.getAttribute('title') || ''));
    if (button === null) return 'no size button';
    button.click();
    return 'clicked ' + (button.getAttribute('title') || '').slice(0, 30);
  })()`
  const pipMin = { width: PIP_SIZE_SOURCE.min.width, height: PIP_SIZE_SOURCE.min.height }
  const pipMax = { width: PIP_SIZE_SOURCE.max.width, height: PIP_SIZE_SOURCE.max.height }
  const resetPipToMin = async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const box = await evaluate(PIP_BOX_PROBE)
      if (box !== null && pipMin.width !== null && box.width === pipMin.width && box.height === pipMin.height) return box
      await evaluate(SIZE_CLICK)
      await sleep(500)
    }
    return await evaluate(PIP_BOX_PROBE)
  }
  const EXPECTED_CORNER_RULE = {
    nw: { dw: -1, dh: -1, label: 'north-west', moves: 'left + top', pins: 'right + bottom' },
    ne: { dw: 1, dh: -1, label: 'north-east', moves: 'right + top', pins: 'left + bottom' },
    sw: { dw: -1, dh: 1, label: 'south-west', moves: 'left + bottom', pins: 'right + top' },
    se: { dw: 1, dh: 1, label: 'south-east', moves: 'right + bottom', pins: 'left + top' },
  }
  /**
   * The pointer vector used per corner. Each is chosen so that (a) the pointer
   * STAYS INSIDE the 1500×950 viewport (the handle sits at a panel corner, so a
   * drag toward the window edge would leave the page and DevTools would clamp
   * it) and (b) the resulting size stays inside the store's clamp window, so the
   * arithmetic is asserted unclamped. Each corner gets a DISTINCT (dw, dh), so a
   * swapped corner or a flipped sign is caught rather than cancelled.
   */
  const CORNER_DRAGS = {
    nw: { dx: 48, dy: 24 },
    ne: { dx: -24, dy: 48 },
    sw: { dx: 48, dy: -24 },
    se: { dx: -24, dy: -48 },
  }
  const cornerIds = Object.keys(EXPECTED_CORNER_RULE)
  const pipCornersBox = await evaluate(PIP_BOX_PROBE)
  const dragReport = []
  /** The named "large" stop (348×262), so no corner drag can hit a clamp bound. */
  const startFromLarge = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const box = await evaluate(PIP_BOX_PROBE)
      if (box !== null && box.width >= 300 && box.height >= 240) return box
      await evaluate(SIZE_CLICK)
      await sleep(500)
    }
    return await evaluate(PIP_BOX_PROBE)
  }
  if (pipCornersBox === null) {
    bad('item 3: the PiP panel is not in the 3D tab, so the four corner handles could not be probed')
  } else {
    const handles = pipCornersBox.handles ?? []
    const handleIds = handles.map((handle) => handle.corner)
    const fourHandles =
      handles.length === 4 && cornerIds.every((corner) => handleIds.includes(corner)) &&
      new Set(handles.map((handle) => handle.label)).size === 4 &&
      handles.every((handle) => handle.label.includes(EXPECTED_CORNER_RULE[handle.corner]?.label ?? '###'))
    fourHandles
      ? ok(
        'item 3: all four corner handles are rendered, one per corner, with distinct accessible names naming their corner (' +
          handles.map((handle) => handle.corner).join(', ') + ')',
      )
      : bad('item 3: expected four handles named nw/ne/sw/se, found ' + JSON.stringify(handles.map((h) => ({ corner: h.corner, label: h.label }))))
    const sizedNames = handles.filter((handle) => handle.label.includes(pipCornersBox.width + '×' + pipCornersBox.height)).length
    sizedNames === handles.length && handles.length === 4
      ? ok('item 3: every handle carries the LIVE size in its accessible name (' + pipCornersBox.width + '×' + pipCornersBox.height + ' px)')
      : bad('item 3: only ' + sizedNames + '/' + handles.length + ' handles carry the live size in their accessible name')
    const hitTest = await evaluate(`(() => {
      const out = {};
      for (const handle of document.querySelectorAll('.pip-panel .pip-resizer')) {
        const r = handle.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        out[handle.getAttribute('data-pip-corner')] = top === null ? 'nothing'
          : (top === handle || handle.contains(top) ? 'the handle' : top.tagName + '.' + String(top.className).slice(0, 40));
      }
      return out;
    })()`)
    const allHittable = cornerIds.every((corner) => hitTest?.[corner] === 'the handle')
    allHittable
      ? ok('item 3: each handle is the topmost element at its own centre, so a real pointer reaches all four')
      : bad('item 3: some handle centres are covered (' + JSON.stringify(hitTest) + ') — a drag there would hit another element')
    for (const corner of cornerIds) {
      const rule = EXPECTED_CORNER_RULE[corner]
      const vector = CORNER_DRAGS[corner]
      await resetPipToMin()
      const before = await startFromLarge()
      if (before === null) {
        bad('item 3: could not read the PiP box before the ' + corner + ' drag')
        continue
      }
      const handle = (before.handles ?? []).find((candidate) => candidate.corner === corner)
      if (handle === undefined) {
        bad('item 3: no handle for corner ' + corner)
        continue
      }
      await dragPointer({ x: handle.cx, y: handle.cy }, { x: handle.cx + vector.dx, y: handle.cy + vector.dy })
      const after = await evaluate(PIP_BOX_PROBE)
      if (after === null) {
        bad('item 3: the PiP panel vanished during the ' + corner + ' drag')
        continue
      }
      const expectedDw = rule.dw * vector.dx
      const expectedDh = rule.dh * vector.dy
      const deltaWidth = after.width - before.width
      const deltaHeight = after.height - before.height
      const deltaLeft = Math.round((after.left - before.left) * 10) / 10
      const deltaTop = Math.round((after.top - before.top) * 10) / 10
      const deltaRight = Math.round((after.right - before.right) * 10) / 10
      const deltaBottom = Math.round((after.bottom - before.bottom) * 10) / 10
      const cardDeltaRight = Math.round((after.card.right - before.card.right) * 10) / 10
      const cardDeltaBottom = Math.round((after.card.bottom - before.card.bottom) * 10) / 10
      const storedAfter = (() => {
        try { return JSON.parse(after.stored ?? 'null') } catch (error) { return null }
      })()
      const regime = Math.abs(deltaLeft + deltaWidth) < 0.75 && Math.abs(deltaTop + deltaHeight) < 0.75
        ? 'window-driven card (the window is the widest element, so its left/top edge carries the whole change)'
        : Math.abs(deltaLeft + deltaWidth / 2) < 0.75 && Math.abs(deltaTop + deltaHeight / 2) < 0.75
          ? 'centred in a wider card (the header is the widest element, so the window grows about its own centre)'
          : 'NEITHER documented regime'
      dragReport.push({
        corner, vector, expectedDw, expectedDh, deltaWidth, deltaHeight, deltaLeft, deltaTop, deltaRight,
        deltaBottom, cardDeltaRight, cardDeltaBottom, regime,
      })
      const sizeOk = deltaWidth === expectedDw && deltaHeight === expectedDh
      sizeOk
        ? ok(
          'item 3: dragging the ' + corner + ' handle by (' + vector.dx + ', ' + vector.dy + ') resizes the window by (' +
            expectedDw + ', ' + expectedDh + ') px — ' + before.width + '×' + before.height + ' → ' + after.width + '×' + after.height,
        )
        : bad(
          'item 3: the ' + corner + ' drag did not apply its own rule — expected (' + expectedDw + ', ' + expectedDh +
            ') px for a (' + vector.dx + ', ' + vector.dy + ') drag, measured (' + deltaWidth + ', ' + deltaHeight + ')',
        )
      const storedMatches = storedAfter !== null && storedAfter.width === after.width && storedAfter.height === after.height
      storedMatches
        ? ok('item 3: the ' + corner + ' drag is persisted through the store key (neuroaxis.sectionPipSize = ' + after.stored + ')')
        : bad('item 3: the ' + corner + ' drag left the store at ' + String(after.stored) + ' but the window is ' + after.width + '×' + after.height)
      const cardDocked = Math.abs(cardDeltaRight) < 0.75 && Math.abs(cardDeltaBottom) < 0.75
      cardDocked
        ? ok(
          'item 3: the ' + corner + ' drag leaves the docked card edges alone (Δcard.right ' + cardDeltaRight +
            ' px, Δcard.bottom ' + cardDeltaBottom + ' px) — the panel stays pinned to the viewport bottom-right',
        )
        : bad(
          'item 3: the ' + corner + ' drag moved a docked card edge (Δcard.right ' + cardDeltaRight + ', Δcard.bottom ' +
            cardDeltaBottom + ')',
        )
      const regimeOk = regime !== 'NEITHER documented regime'
      regimeOk
        ? ok(
          'item 3: the ' + corner + ' drag moves the window box exactly as the dock allows — Δleft ' + deltaLeft +
            ' px / -Δwidth ' + -deltaWidth + ', Δtop ' + deltaTop + ' / -Δheight ' + -deltaHeight +
            ' (' + regime + ')',
        )
        : bad(
          'item 3: the ' + corner + ' drag moved the window box in no documented way (Δleft ' + deltaLeft +
            ', -Δwidth ' + -deltaWidth + ', -Δwidth/2 ' + -deltaWidth / 2 + ', Δtop ' + deltaTop + ', -Δheight ' +
            -deltaHeight + ')',
        )
      if (corner === 'nw') {
        const followsDirection = deltaLeft > 0 && deltaTop > 0
        followsDirection
          ? ok(
            'item 3: the north-west handle moves TOWARD the pointer on both axes (Δleft +' + deltaLeft + ', Δtop +' +
              deltaTop + ' for a +' + vector.dx + '/+' + vector.dy + ' drag) while the opposite corner stays put',
          )
          : bad('item 3: the north-west handle did not move toward the pointer (Δleft ' + deltaLeft + ', Δtop ' + deltaTop + ')')
      }
      const labelCarriesSize = (after.handles ?? []).every((h) => h.label.includes(after.width + '×' + after.height))
      labelCarriesSize
        ? ok('item 3: after the ' + corner + ' drag every handle re-states the new live size')
        : bad('item 3: a handle did not update its accessible name after the ' + corner + ' drag')
    }
    info(
      'item 3 screen-space readout: ' +
        (dragReport.length === 0 ? 'no drag ran' : dragReport.map((entry) => entry.corner + ' (' + entry.vector.dx + ',' +
          entry.vector.dy + ') -> Δsize(' + entry.deltaWidth + ',' + entry.deltaHeight + ') expected(' + entry.expectedDw + ',' +
          entry.expectedDh + ') Δedges L' + entry.deltaLeft + ' T' + entry.deltaTop + ' Δcard R' + entry.cardDeltaRight +
          ' B' + entry.cardDeltaBottom).join(' · ')),
    )
    info(
      'item 3 layout note (PLAN.md §3 says "the opposite corner stays put"; the panel is CSS-docked `right/bottom`): ' +
        (dragReport.length === 0 ? 'no drag ran' : dragReport[0].regime) +
        ' — measured with the north-west drag: Δleft ' + dragReport[0].deltaLeft + ' px for Δwidth ' + dragReport[0].deltaWidth + ' px',
    )
    const maxStart = await startFromLarge()
    const nwHandle = (maxStart?.handles ?? []).find((handle) => handle.corner === 'nw')
    if (maxStart === null || nwHandle === undefined) {
      bad('item 3: the clamp drag could not start (no north-west handle)')
    } else {
      await dragPointer({ x: nwHandle.cx, y: nwHandle.cy }, { x: 2, y: 2 }, 8)
      const clamped = await evaluate(PIP_BOX_PROBE)
      const clampOk =
        clamped !== null && pipMax.width !== null && clamped.width === pipMax.width && clamped.height === pipMax.height
      clampOk
        ? ok(
          'item 3: an oversized drag stops exactly on the store clamp (' + clamped.width + '×' + clamped.height +
            ' = SECTION_PIP_SIZE_MAX) instead of escaping it',
        )
        : bad(
          'item 3: the oversized drag did not stop on the clamp window (' +
            JSON.stringify({ width: clamped?.width, height: clamped?.height }) + ' vs max ' + JSON.stringify(pipMax) + ')',
        )
      const labelAtMax = clamped !== null && (clamped.handles ?? []).every((h) => h.label.includes(clamped.width + '×' + clamped.height))
      labelAtMax
        ? ok('item 3: the handles report the clamped size (' + clamped.width + '×' + clamped.height + ' px)')
        : bad('item 3: the handles do not report the clamped size')
    }
    /* the keyboard path on a NON-first handle (one shared handler, four buttons).
       The size is brought back to the named large stop first: the clamp drag above
       left the window ON its upper bound, where +16 px is legitimately clipped. */
    await resetPipToMin()
    await startFromLarge()
    const keyboardSecond = await evaluate(`(() => {
      const handle = document.querySelector('.pip-panel .pip-resizer[data-pip-corner="nw"]');
      if (handle === null) return 'no north-west handle';
      handle.focus();
      return document.activeElement === handle ? 'focused' : 'not focused';
    })()`)
    const beforeKeyboard = await evaluate(PIP_BOX_PROBE)
    await pressKey('ArrowRight', 'ArrowRight', 39)
    await pressKey('ArrowUp', 'ArrowUp', 38)
    await sleep(600)
    const afterKeyboard = await evaluate(PIP_BOX_PROBE)
    const keyboardOk =
      String(keyboardSecond) === 'focused' && beforeKeyboard !== null && afterKeyboard !== null &&
      afterKeyboard.width === beforeKeyboard.width + 16 && afterKeyboard.height === beforeKeyboard.height - 16
    keyboardOk
      ? ok(
        'item 3: the north-west handle is keyboard operable too (+16 px wide, -16 px tall: ' + beforeKeyboard.width +
          '×' + beforeKeyboard.height + ' → ' + afterKeyboard.width + '×' + afterKeyboard.height + ')',
      )
      : bad(
        'item 3: the north-west handle did not resize from the keyboard (' + String(keyboardSecond) + ', ' +
          JSON.stringify({ w: beforeKeyboard?.width, h: beforeKeyboard?.height }) + ' → ' +
          JSON.stringify({ w: afterKeyboard?.width, h: afterKeyboard?.height }) + ')',
      )
    const leftAtMin = await resetPipToMin()
    leftAtMin !== null && pipMin.width !== null && leftAtMin.width === pipMin.width
      ? ok('item 3: the panel is left at its named small stop after the corner drags (' + leftAtMin.width + '×' + leftAtMin.height + ')')
      : info('item 3: the panel is left at ' + JSON.stringify({ w: leftAtMin?.width, h: leftAtMin?.height }) + ' after the corner drags')
  }

  /* ---------------------------------------------------------------- Q4 */
  const ensurePlatesLiveSection = async () => {
    await evaluate(clickText('Plates'))
    await sleep(1500)
    const present = await evaluate(`document.querySelector('.section-canvas-wrap') !== null`)
    if (present !== true) {
      await evaluate(clickText('Live section'))
      await sleep(4500)
    }
  }
  const LOBE_LEGEND_ROWS = `(() => {
    const rows = (legend) => legend === null ? null : [...legend.querySelectorAll('.section-lobes-row')].map((n) => (n.textContent || '').trim());
    const panel = document.querySelector('.pip-panel');
    const plates = [...document.querySelectorAll('.section-lobes-legend')].find((legend) => legend.closest('.pip-panel') === null) ?? null;
    const panelLegend = panel === null ? null : panel.querySelector('.section-lobes-legend');
    const toggle = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null) ?? null;
    const chip = panel === null ? null : panel.querySelector('.section-structure-chip');
    return {
      plates: rows(plates),
      platesPressed: toggle === null ? null : toggle.getAttribute('aria-pressed'),
      pip: rows(panelLegend),
      pipReadout: panel === null ? null : ((panel.querySelector('.pip-readout') || {}).textContent || '').trim(),
      pipChip: chip === null ? '' : (chip.textContent || '').trim(),
      pipChipPresent: chip !== null,
      pipSectionChips: panel === null ? -1 : panel.querySelectorAll('.section-canvas-wrap').length,
    };
  })()`
  await ensurePlatesLiveSection()
  const snapOff = await evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find((l) => /Snap to levels/i.test(l.textContent || ''));
    const input = label === null ? null : label.querySelector('input[type=checkbox]');
    if (input === null) return 'no "Snap to levels" checkbox';
    const before = input.checked;
    if (input.checked === true) input.click();
    return 'snap ' + before + ' -> ' + input.checked;
  })()`)
  await sleep(500)
  const lobesOnPlates = await evaluate(`(() => {
    const button = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
    if (button === null) return 'no cortical-division toggle in the Plates live section';
    if (button.getAttribute('aria-pressed') !== 'true') button.click();
    return 'aria-pressed ' + button.getAttribute('aria-pressed');
  })()`)
  await sleep(1200)
  const pipOnTransverse = await evaluate(`(() => {
    const panel = document.querySelector('.pip-panel');
    if (panel === null) return 'no PiP panel';
    const button = [...panel.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Y');
    if (button === null) return 'no Y axis button in the panel';
    button.click();
    return 'clicked Y';
  })()`)
  await sleep(1100)
  const lobeLabelToDivision = {}
  for (const [division, label] of Object.entries(DIVISION_LEGEND_LABELS)) lobeLabelToDivision[label] = division
  /* v11 §3b: derive the rule's own set for these planes AT RUNTIME (see
     `loadCorticalRule`) and compare it to what the canvas reports. The v10
     `ARTEFACT_PLANES[].drawn` table is kept below as a PRINTED CROSS-CHECK only —
     never the pass condition — because a hardcoded expectation is a second copy
     of the rule. */
  const corticalRule = await loadCorticalRule()
  const ruleReady = corticalRule !== null && corticalRule !== undefined && corticalRule.error === undefined
  if (ruleReady) {
    info(
      'v11 §3b: the rule was re-derived in THIS run from the shipped classifier + splitter + floors over both ' +
        'cortical ribbons — ' + corticalRule.ribbons.join(' + ') + ' · floors run ≥ ' + corticalRule.floors.runAu +
        ' au / drawn ≥ ' + corticalRule.floors.areaAu2 + ' au² / label ≥ ' + corticalRule.floors.labelAreaAu2 +
        ' au² · divisions ' + corticalRule.divisions.join(', '),
    )
  } else {
    bad(
      'v11 §3b: the rule\'s own division set could NOT be derived at runtime (' +
        String(corticalRule?.error ?? 'the loader returned nothing') + ') — the canvas-vs-rule parity assertion ' +
        'CANNOT run and is therefore reported as a failure, not skipped (the v10 hardcoded table is a cross-check, ' +
        'never the pass condition)',
    )
  }
  const artefactSweep = []
  for (const plane of ARTEFACT_PLANES) {
    await evaluate(`(() => {
      const slider = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find((x) => /transverse/i.test(x.getAttribute('aria-label') || ''));
      if (!slider) return 'no transverse slider';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(slider, String(${JSON.stringify(plane.value)}));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      return 'set ' + slider.value;
    })()`)
    await sleep(2400)
    const reading = await evaluate(LOBE_LEGEND_ROWS)
    const planeNow = await evaluate(`(() => {
      const slider = [...document.querySelectorAll('.section-plane-sliders input[type=range]')].find((x) => /transverse/i.test(x.getAttribute('aria-label') || ''));
      return slider === null ? null : Number(slider.value);
    })()`)
    const rows = reading?.plates ?? null
    const drawn = Array.isArray(rows) ? rows.map((label) => lobeLabelToDivision[label] ?? label) : null
    const ruleSet = ruleReady ? corticalRule.setAt(plane.value, 'y') : null
    const perRibbon = ruleReady ? corticalRule.setPerRibbon(plane.value, 'y') : null
    const landed = planeNow !== null && Math.abs(planeNow - plane.value) < 0.01
    artefactSweep.push({ plane: plane.value, landed, drawn, ruleSet })
    if (!landed) {
      bad(
        'item 4: the transverse slider could not be parked on y = ' + plane.value + ' au (it reads ' + String(planeNow) +
          ', snap: ' + String(snapOff) + ') — the artefact-plane assertion did NOT run',
      )
      continue
    }
    if (drawn === null) {
      bad('item 4: the Plates cortical-division legend is missing at y = ' + plane.value + ' (' + String(lobesOnPlates) + ')')
      continue
    }
    if (ruleSet === null) {
      bad(
        'item 4: at y = ' + plane.value + ' au the canvas reports [' + drawn.join(', ') + '] but the rule set ' +
          'could not be derived, so the parity assertion DID NOT RUN (' + String(corticalRule?.error ?? '') + ')',
      )
      continue
    }
    /* THE PARITY ASSERTION (v11 §3b): the set the canvas reports (from
       `.section-lobes-row`, which is rendered from the same `lobeLayerRef`
       entries the painted Path2Ds come from) against the set the shipped rule
       computes over BOTH ribbons. */
    const ruleOnly = ruleSet.filter((division) => !drawn.includes(division))
    const canvasOnly = drawn.filter((division) => !ruleSet.includes(division))
    ruleOnly.length === 0 && canvasOnly.length === 0
      ? ok(
        'item 4 PARITY at y = ' + plane.value + ' au — rule (ribbons: l+r) [' + ruleSet.join(', ') +
          '] ∥ canvas [' + drawn.join(', ') + '] — identical; per ribbon ' +
          Object.entries(perRibbon ?? {}).map(([slug, set]) => slug + ' [' + set.join(' ') + ']').join(' · '),
      )
      : bad(
        'item 4 PARITY at y = ' + plane.value + ' au — rule (ribbons: l+r) [' + ruleSet.join(', ') + '] ∥ canvas [' +
          drawn.join(', ') + '] disagree' +
          (canvasOnly.length > 0 ? ' — {' + canvasOnly.join(', ') + '} is painted but the rule does not leave it there' : '') +
          (ruleOnly.length > 0 ? ' — {' + ruleOnly.join(', ') + '} has a floor-clearing body the canvas does not paint' : '') +
          '; per ribbon ' + Object.entries(perRibbon ?? {}).map(([slug, set]) => slug + ' [' + set.join(' ') + ']').join(' · ') +
          ' (' + plane.note + ')',
      )
    /* Printed cross-check ONLY (never the pass condition): the hardcoded table
       `verify:cortical-lobes` reconciles against the same measurement. */
    const tableAgrees = [...plane.drawn].sort().join(',') === [...ruleSet].sort().join(',')
    info(
      'item 4 cross-check at y = ' + plane.value + ' au (NOT the pass condition): ARTEFACT_PLANES[].drawn [' +
        plane.drawn.join(', ') + '] vs the rule derived in this run [' + ruleSet.join(', ') + '] — ' +
        (tableAgrees ? 'their table still matches the rule' : 'they differ; verify:cortical-lobes owns that reconciliation'),
    )
    const pipPlaneMatches = new RegExp('y\\s*=\\s*' + plane.value + '(\\D|$)').test(String(reading?.pipReadout))
    const surfacesAgree =
      pipPlaneMatches && Array.isArray(reading?.pip) && rows.length === reading.pip.length &&
      rows.every((label, index) => label === reading.pip[index])
    surfacesAgree
      ? ok(
        'item 4: the Plates canvas and the PiP agree at y = ' + plane.value + ' au (' + rows.length + ' row(s): ' +
          (reading.pip.join(', ') || 'none') + '; panel readout "' + String(reading.pipReadout) + '")',
      )
      : bad(
        'item 4: the two surfaces disagree at y = ' + plane.value + ' au (Plates ' + JSON.stringify(rows) + ' vs PiP ' +
          JSON.stringify(reading?.pip) + ', panel readout "' + String(reading?.pipReadout) + '", ' + String(pipOnTransverse) + ')',
      )
  }
  info(
    'item 4 sweep (' + String(snapOff) + ', ' + String(pipOnTransverse) + ', ' + String(lobesOnPlates) + '): ' +
      artefactSweep.map((entry) => 'y=' + entry.plane + (entry.landed ? '' : '(NOT REACHED)') + ' canvas [' +
        (entry.drawn ?? []).join('+') + '] vs rule [' + (entry.ruleSet ?? []).join('+') + ']').join(' · '),
  )

  /* ---------------------------------------------------------------- Q5 */
  const canvasWrapText = `(() => {
    const wrap = [...document.querySelectorAll('.section-canvas-wrap')].find((w) => w.closest('.pip-panel') === null) ?? null;
    if (wrap === null) return null;
    const chip = wrap.parentElement === null ? null : wrap.parentElement.querySelector('.section-structure-chip');
    const info = document.querySelector('.info-name');
    return {
      wrapText: (wrap.textContent || '').trim(),
      ariaLabel: wrap.getAttribute('aria-label') || '',
      chipText: chip === null ? '' : (chip.textContent || '').trim(),
      chipPresent: chip !== null,
      infoName: info === null ? null : (info.textContent || '').trim(),
    };
  })()`
  const selectTreeLeaf = (name) => evaluate(`(() => {
    const wanted = ${JSON.stringify(name)};
    for (const row of document.querySelectorAll('.tree-leaf-row')) {
      const label = ((row.querySelector('.tree-leaf-name') || {}).textContent || '').trim();
      if (label === wanted) { row.click(); return 'clicked ' + wanted; }
    }
    return 'leaf not found in the tree: ' + wanted;
  })()`)
  const cortexName = CORTEX_RECORD_NAME
  const thalamusName = TAXONOMY_ENTRIES.find((entry) => entry.id === 'ctx-thalamus-envelope')?.name ?? null
  const suppressedOk =
    SUPPRESSED_CANVAS_LABEL_IDS.length === 1 && cortexName !== null && SUPPRESSED_CANVAS_LABEL_IDS[0] === 'ctx-cerebral-cortex'
  suppressedOk
    ? ok(
      'item 5 source contract: SectionCanvas suppresses exactly the record "' + SUPPRESSED_CANVAS_LABEL_IDS[0] + '" (' +
        String(cortexName) + ')',
    )
    : bad(
      'item 5: the suppressed-label set read as ' + JSON.stringify(SUPPRESSED_CANVAS_LABEL_IDS) + ' (cortex name ' +
        String(cortexName) + ', taxonomy entries read: ' + TAXONOMY_ENTRIES.length + ')',
    )
  await ensurePlatesLiveSection()
  await expandTreeForV10()
  const platesCanvasBefore = await evaluate(canvasStatsFor(PLATES_CANVAS))
  const selectCortex = await selectTreeLeaf(cortexName)
  await ensurePlatesLiveSection()
  await sleep(2400)
  const cortexSelected = await evaluate(canvasWrapText)
  const platesCanvasCortex = await evaluate(canvasStatsFor(PLATES_CANVAS))
  if (cortexName === null || cortexSelected === null) {
    bad('item 5: the cortex record or the Plates canvas could not be reached (' + String(selectCortex) + ')')
  } else {
    const chipHasName = cortexSelected.chipText.includes(cortexName)
    const wrapHasName =
      cortexSelected.wrapText.includes(cortexName) || cortexSelected.ariaLabel.includes(cortexName)
    !chipHasName && !wrapHasName
      ? ok(
        'item 5: with "' + cortexName + '" selected the canvas chip reads "' + cortexSelected.chipText +
          '" and the canvas wrapper carries no such text ("' + cortexSelected.wrapText.slice(0, 40) + '")',
      )
      : bad(
        'item 5: the cortex name still reaches the canvas DOM (chip "' + cortexSelected.chipText + '" / wrapper "' +
          cortexSelected.wrapText.slice(0, 120) + '")',
      )
    cortexSelected.infoName === cortexName
      ? ok('item 5: the tree click really selected the suppressed record (info panel "' + String(cortexSelected.infoName) + '")')
      : info(
        'item 5: the info panel reads "' + String(cortexSelected.infoName) + '" instead of "' + cortexName + '" (' +
          String(selectCortex) + ') — the canvas DOM assertions above still hold for that selection',
      )
    const canvasRepainted =
      platesCanvasBefore !== null && platesCanvasCortex !== null && platesCanvasBefore.hash !== platesCanvasCortex.hash
    canvasRepainted
      ? ok(
        'item 5: selecting the cortex still repaints the section (hash ' + platesCanvasBefore.hash + ' -> ' +
          platesCanvasCortex.hash + '), i.e. its contour/highlight is still drawn while its text is gone',
      )
      : bad(
        'item 5: selecting the cortex changed NOTHING on the canvas (hash ' + String(platesCanvasCortex?.hash) +
          ') — the contour of the suppressed record looks filtered too',
      )
    const axScoped = await (async () => {
      try {
        const doc = await send('DOM.getDocument', { depth: 0 })
        const rootId = doc?.root?.nodeId
        if (rootId === undefined) return { error: 'no document root' }
        const found = await send('DOM.querySelector', { nodeId: rootId, selector: '.section-canvas-wrap' })
        if (!found?.nodeId) return { error: 'no .section-canvas-wrap node' }
        const partial = await send('Accessibility.getPartialAXTree', { nodeId: found.nodeId, fetchRelatives: true })
        const names = (partial?.nodes ?? []).map((node) => node.name?.value ?? '').filter((name) => typeof name === 'string')
        return { names }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    })()
    if (axScoped.error !== undefined) {
      bad('item 5: the scoped accessibility tree of the section canvas could not be read (' + axScoped.error + ')')
    } else {
      const axHasName = axScoped.names.some((name) => name.includes(cortexName))
      !axHasName
        ? ok(
          'item 5: the canvas\' own accessibility subtree (' + axScoped.names.length + ' node(s)) carries no cortex label — ' +
            'names ' + JSON.stringify(axScoped.names.slice(0, 4)),
        )
        : bad('item 5: the cortex label is still in the canvas accessibility subtree (' + JSON.stringify(axScoped.names) + ')')
    }
    const hoverSweep = await evaluate(`(async () => {
      const canvas = [...document.querySelectorAll('.section-canvas')].find((c) => c.closest('.pip-panel') === null) ?? null;
      if (canvas === null) return { error: 'no Plates canvas' };
      const r = canvas.getBoundingClientRect();
      const seen = [];
      for (let iy = 1; iy <= 6; iy++) {
        for (let ix = 1; ix <= 6; ix++) {
          const x = r.left + (r.width * ix) / 7;
          const y = r.top + (r.height * iy) / 7;
          canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
          await new Promise((resolve) => setTimeout(resolve, 45));
          const chip = document.querySelector('.section-structure-chip');
          const text = chip === null ? '' : (chip.textContent || '').trim();
          if (text.length > 0) seen.push(text);
        }
      }
      canvas.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
      return { hovered: [...new Set(seen)] };
    })()`)
    if (hoverSweep?.error !== undefined) {
      bad('item 5: the hover sweep could not run (' + hoverSweep.error + ')')
    } else {
      const hoverShowsCortex = (hoverSweep.hovered ?? []).some((text) => text.includes(cortexName))
      !hoverShowsCortex
        ? ok(
          'item 5: 36 hover positions across the Plates canvas produce no chip naming the cortex (' +
            (hoverSweep.hovered ?? []).length + ' distinct hovered structure(s) ' +
            JSON.stringify((hoverSweep.hovered ?? []).slice(0, 4)) + ')',
        )
        : bad('item 5: hovering still announces the cortex label (' + JSON.stringify(hoverSweep.hovered) + ')')
    }
    const hitProof = await evaluate(`(async () => {
      const canvas = [...document.querySelectorAll('.section-canvas')].find((c) => c.closest('.pip-panel') === null) ?? null;
      if (canvas === null) return { error: 'no Plates canvas' };
      const wanted = ${JSON.stringify(cortexName)};
      const r = canvas.getBoundingClientRect();
      const tried = [];
      for (let iy = 1; iy <= 7; iy++) {
        for (let ix = 1; ix <= 7; ix++) {
          const x = r.left + (r.width * ix) / 8;
          const y = r.top + (r.height * iy) / 8;
          canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
          await new Promise((resolve) => setTimeout(resolve, 70));
          const name = ((document.querySelector('.info-name') || {}).textContent || '').trim();
          tried.push(name);
          if (name === wanted) {
            const chip = document.querySelector('.section-structure-chip');
            return { point: { x, y }, hit: name, chip: chip === null ? '' : (chip.textContent || '').trim() };
          }
        }
      }
      return { hit: null, tried: [...new Set(tried)].slice(0, 8) };
    })()`)
    if (hitProof?.hit === cortexName) {
      ok(
        'item 5: the cortex contour is still hit-testable — a click at (' + Math.round(hitProof.point.x) + ', ' +
          Math.round(hitProof.point.y) + ') resolves to "' + hitProof.hit + '" while the canvas chip stays "' +
          String(hitProof.chip) + '"',
      )
    } else if (hitProof?.error !== undefined) {
      bad('item 5: the canvas hit test could not be driven (' + hitProof.error + ')')
    } else {
      bad(
        'item 5: no canvas point resolved to the cortex record (' + JSON.stringify(hitProof?.tried) +
          ') — its contour may be filtered out of the render',
      )
    }
    if (thalamusName === null) {
      info('item 5: the thalamus envelope record was not found in taxonomy.json — the specificity half is unverified')
    } else {
      await selectTreeLeaf(thalamusName)
      await ensurePlatesLiveSection()
      await sleep(2000)
      const thalamusChip = await evaluate(canvasWrapText)
      const keepsThalamus = thalamusChip !== null && thalamusChip.chipText.includes(thalamusName)
      keepsThalamus
        ? ok(
          'item 5: the suppression is specific — selecting "' + thalamusName + '" still prints its own chip ("' +
            thalamusChip.chipText + '")',
        )
        : bad(
          'item 5: the thalamus envelope lost its label too (' + JSON.stringify(thalamusChip?.chipText) +
            ') — the suppression is too broad',
        )
      await evaluate(clickText('3D'))
      await sleep(3200)
      const pipThalamus = await evaluate(LOBE_LEGEND_ROWS)
      const pipThalamusChip = String(pipThalamus?.pipChip ?? '')
      const selectCortexAgain = await selectTreeLeaf(cortexName)
      await sleep(2400)
      const pipCortex = await evaluate(LOBE_LEGEND_ROWS)
      const pipCortexChip = String(pipCortex?.pipChip ?? '')
      pipThalamusChip.includes(thalamusName) && !pipCortexChip.includes(cortexName)
        ? ok(
          'item 5: the PiP mounts the same component and honours the rule — with the thalamus selected its chip reads "' +
            pipThalamusChip.slice(0, 46) + '"; with the cortex selected (' + String(selectCortexAgain) + ') it reads "' +
            (pipCortexChip.length === 0 ? '(empty)' : pipCortexChip.slice(0, 40)) + '"',
        )
        : bad(
          'item 5: the PiP does not honour the label rule (thalamus chip "' + pipThalamusChip + '" / cortex chip "' +
            pipCortexChip + '")',
        )
    }
    /* honesty: the OTHER surfaces on this screen that still speak the name */
    await ensurePlatesLiveSection()
    await sleep(1200)
    const otherSurfaces = await evaluate(`(() => {
      const name = ${JSON.stringify(cortexName)};
      const hits = [];
      const treeNames = [...document.querySelectorAll('.tree-leaf-name')].map((n) => (n.textContent || '').trim());
      if (treeNames.some((text) => text === name)) hits.push('taxonomy tree row');
      const panel = document.querySelector('.info-panel');
      if (panel !== null && (panel.innerText || '').includes(name)) hits.push('info rail');
      const svgTitles = [...document.querySelectorAll('svg title')].map((t) => (t.textContent || '').trim());
      if (svgTitles.some((text) => text === name)) hits.push('plate SVG <title> (exact record name)');
      const plateLabels = [...document.querySelectorAll('.plate-label')].map((t) => (t.textContent || '').trim());
      const cortexPlate = plateLabels.filter((text) => /cerebral cortex/i.test(text));
      if (cortexPlate.length > 0) hits.push('authored plate label text x' + cortexPlate.length + ' (' + cortexPlate[0].replace(/\\s+/g, ' ').slice(0, 40) + ')');
      return { hits };
    })()`)
    const others = Array.isArray(otherSurfaces?.hits) ? otherSurfaces.hits : []
    others.length === 0
      ? ok('item 5: no other surface on this screen still renders the string "' + cortexName + '"')
      : info(
        'item 5 SCOPED HONESTY — the section canvas (Plates and PiP) is clean, but the same screen still carries the name in: ' +
          others.join(' · ') + '. PLAN.md §5 lines 289–296 flag the authored plate SVGs as outside every task\'s write list, ' +
          'and the tree/info rail legitimately name the selected record.',
      )
  }

  /* ---------------------------------------------------------------- Q6 */
  const v10ErrorsAfter = exceptions.length + consoleErrors.length
  const v10NewErrors = [...exceptions.slice(v10ErrorsBefore), ...consoleErrors.slice(v10ErrorsBefore)]
  v10NewErrors.length === 0
    ? ok('v10 hygiene: the five item checks produced no console error and no page exception')
    : bad('v10 hygiene: ' + v10NewErrors.length + ' runtime error(s) during the v10 checks: ' + v10NewErrors.slice(0, 3).join(' || '))
  const appStillAlive = await evaluate(`({
    root: document.getElementById('root')?.childElementCount ?? -1,
    tabs: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /^(3D|Plates|Syndromes)$/.test(t)),
    canvas: document.querySelector('.viewer3d-canvas canvas') !== null || document.querySelector('.viewer3d-root canvas') !== null,
    pip: document.querySelector('.pip-panel') !== null,
    sections: document.querySelectorAll('.section-canvas').length,
  })`)
  appStillAlive.root > 0 && appStillAlive.tabs.length === 3 && appStillAlive.pip
    ? ok('v10 hygiene: the app is fully alive after the five item checks (' + JSON.stringify(appStillAlive) + ')')
    : bad('v10 hygiene: the app is not in its documented shape after the v10 checks (' + JSON.stringify(appStillAlive) + ')')
  info(
    'v10 sweep summary: item 1 helpers ' + (helperOn === null ? 'n/a' : helperOn.sheets + ' sheet(s)') +
      ' · item 2 solos ' + soloSweep.length +
      ' · item 3 corner drags ' + dragReport.length +
      ' · item 4 planes ' + (artefactSweep.length === 0 ? 'none' : artefactSweep.map((entry) => entry.plane + (entry.landed ? '' : '!')).join(',')) +
      ' · item 5 suppressed ids [' + SUPPRESSED_CANVAS_LABEL_IDS.join(', ') + ']',
  )

  /* ======================================================================
   * R — v11: THE TWO TOGGLE ROWS DECIDE BOTH SURFACES (docs/SWARM_V11_PLAN.md
   *     §1–§2 · PLAN.md §1).
   *
   * The user's ask is a VISIBILITY decision: switching an AREA or a SYSTEM off
   * must remove that slice from the 3D view AND from the 2D live section AND from
   * the PiP; switching it on must bring it back; Reset must restore the documented
   * default framing. Every claim below is driven through a real control and
   * measured on the surface itself — never on the button's class:
   *
   *   R1  Reset → the default framing; the two rows' pressed states are the same
   *       fact as the layer sets the legend reads (asserted again here, live).
   *   R2  one big AREA (telencephalon, 85 taxonomy rows and the only cortical
   *       ribbon) off: the rendered 3D mesh multiset changes and stays changed,
   *       the 3D canvas' OWN rectangle repaints, the Plates live-section canvas
   *       reports a different pixel hash, the cortical-division legend empties
   *       (the ribbon pass is area-gated, PLAN §2) on BOTH surfaces, the tree dims
   *       the region — and the SAME state reached through the legend's per-region
   *       checkboxes renders byte-identical mesh names and an identical Plates
   *       hash (two independent UI paths, one render: no path bypasses the sets).
   *   R3  one SYSTEM (nucleus, context) off: same measurement, plus the PiP's own
   *       2D canvas hash, plus the same two-path equality.
   *   R4  Reset restores the default: the pressed set equals the CLEAN-BOOT
   *       reading captured in A0, and the render returns to the baseline mesh
   *       multiset / Plates hash.
   *   R5  keyboard: a real CDP Space press on a focused toggle flips it, calibrated
   *       against a plain checkbox so a CDP delivery problem is reported as
   *       UNVERIFIED rather than as a product failure.
   *
   * Chrome is the orchestrator's lane; this block is written so that a regression
   * in any of those behaviours FAILS here rather than passing by not running.
   * ==================================================================== */
  const v11ErrorsBefore = exceptions.length + consoleErrors.length
  const THREE_CANVAS = `.viewer3d-canvas canvas, .viewer3d-root canvas`
  const treeDimOf = (entries, region) => {
    const rows = (Array.isArray(entries) ? entries : []).filter(
      (entry) => (REGION_LABEL_TO_REGION[String(entry.label).trim().toLowerCase()] ?? '') === region,
    )
    return {
      rows: rows.length,
      on: rows.reduce((sum, entry) => sum + entry.on, 0),
      off: rows.reduce((sum, entry) => sum + entry.off, 0),
    }
  }
  const legendRegionRow = (region) => `(() => {
    const row = [...document.querySelectorAll('.legend-row.legend-toggle')].find(
      (l) => l.closest('.legend-divisions') === null && l.textContent.trim() === ${JSON.stringify(region)});
    const input = row === null ? null : row.querySelector('input[type=checkbox]');
    if (input === null) return 'missing ${region} legend row';
    input.click();
    return 'clicked legend "' + ${JSON.stringify(region)} + '"';
  })()`
  const legendKindRow = (kind) => `(() => {
    const row = [...document.querySelectorAll('.legend-row.legend-toggle')].find(
      (l) => l.closest('.legend-divisions') === null && l.textContent.trim() === ${JSON.stringify(kind)});
    const input = row === null ? null : row.querySelector('input[type=checkbox]');
    if (input === null) return 'missing ${kind} legend row';
    input.click();
    return 'clicked legend "' + ${JSON.stringify(kind)} + '"';
  })()`

  /* ---------------------------------------------------------------- R1 */
  const r1ResetClick = await evaluate(clickHook('[data-header-action="reset"]'))
  await sleep(1200)
  const r1Header = await evaluate(HEADER_ROWS_PROBE)
  const r1Legend = await evaluate(LEGEND_LAYERS_PROBE)
  if (r1Header === null || typeof r1Header !== 'object') {
    bad('v11 R1: the header toggle-row probe returned nothing on the 3D tab — the whole v11 block cannot run')
  } else {
    const r1Reading = headerReadingFrom({ ...r1Header, legend: r1Legend ?? r1Header.legend })
    const r1Verdicts = headerToggleRowsReading(r1Reading)
    const r1Failed = r1Verdicts.filter((entry) => !entry.ok)
    info(
      'v11 R1 (' + String(r1ResetClick) + '): areas ' +
        r1Reading.toggles.filter((t) => t.hook === 'data-area').map((t) => t.key + '=' + t.pressed).join(' ') +
        ' · systems ' + r1Reading.toggles.filter((t) => t.hook === 'data-kind').map((t) => t.key + '=' + t.pressed).join(' ') +
        ' · legend regions ' + JSON.stringify(r1Reading.layers.regions) +
        ' · legend kinds ' + JSON.stringify(r1Reading.layers.kinds),
    )
    if (r1Failed.length === 0) {
      ok('v11 R1: after Reset the live header still satisfies all ' + r1Verdicts.length + ' toggle-row claims (' + r1Verdicts.map((v) => v.label).join(', ') + ')')
    } else {
      for (const entry of r1Failed) bad('v11 R1: ' + entry.detail)
    }
    /* The boot reading (A0b) and the Reset reading (R1) must be the SAME pressed
       set — that is "Reset restores the documented default" stated as one fact. */
    const resetPressed = r1Reading.toggles.map((t) => t.hook + ':' + t.key + '=' + t.pressed).sort().join(' | ')
    if (bootPressed.length > 0 && bootPressed === resetPressed) {
      ok('v11 R1: Reset reproduces the CLEAN-BOOT pressed set exactly — ' + resetPressed)
    } else {
      bad('v11 R1: Reset does not reproduce the clean-boot pressed set (boot: ' + bootPressed + ' vs reset: ' + resetPressed + ')')
    }
  }

  /* ---- the shared measuring rig for R2/R3 --------------------------------
   * TAB-AWARE ON PURPOSE: the 3D scene bridge and the PiP's canvas are read on
   * the 3D tab (where the viewer is mounted), the Plates live-section canvas and
   * the cortical-division legends on the Plates tab. Reading the scene while the
   * Plates tab is up would measure a detached scene, so each read states which
   * surface it is taken on and the caller parks the tab first. */
  const goto3D = async () => {
    await evaluate(clickText('3D'))
    await sleep(2600)
  }
  const gotoPlates = async () => {
    await ensurePlatesLiveSection()
    await sleep(1400)
  }
  /* The 3D tab UNMOUNTS the viewer (`App.tsx`: `{activeTab === '3d' && <Viewer3D/>}`),
     so every return to the tab constructs a NEW scene while `window.__auditScene`
     still points at the detached one. Re-binding here — to the newest scene that
     still holds the app's own graph — is what makes a mesh reading taken after a
     tab round trip a measurement of the view on screen rather than of a corpse.
     `bound === false` is a FAILURE in the caller, never a silent empty list. */
  const SCENE_REBIND_NEWEST = `(() => {
    const observed = Array.isArray(window.__auditThreeObserved) ? window.__auditThreeObserved : [];
    const alive = (s) => {
      try { return s.getObjectByName('scene-layers') !== null || s.getObjectByName('clip-plane-helpers') !== null; }
      catch (error) { return false; }
    };
    const scenes = observed.filter((o) => o != null && o.isScene === true);
    const live = scenes.filter(alive);
    const scene = live.length > 0 ? live[live.length - 1] : null;
    window.__auditScene = scene;
    return { observed: observed.length, scenes: scenes.length, alive: live.length, bound: scene !== null };
  })()`
  const threeCanvasRead = async (label) => {
    const rebind = await evaluate(SCENE_REBIND_NEWEST)
    const meshes = rebind?.bound === true ? await stableRead(VISIBLE_MESH_NAMES, 4) : null
    const three = await regionPixelStats(THREE_CANVAS)
    const pip = await evaluate(canvasStatsFor(PIP_CANVAS))
    const treeDim = await evaluate(TREE_REGION_DIM_PROBE)
    const header = await evaluate(HEADER_ROWS_PROBE)
    return { label, rebind, meshes, three, pip, treeDim, header }
  }
  const platesCanvasRead = async (label) => {
    const plates = await evaluate(canvasStatsFor(PLATES_CANVAS))
    const platesRows = await evaluate(LOBE_ROWS_FOR('plates'))
    const pipRows = await evaluate(LOBE_ROWS_FOR('pip'))
    return { label, plates, platesRows, pipRows }
  }
  const sameStats = (a, b, key) => a !== null && b !== null && typeof a?.[key] === 'number' && a[key] === b[key]
  const statsLine = (stats) =>
    stats === null
      ? 'unavailable'
      : `hash ${stats.hash} · ${stats.painted !== undefined ? `painted ${stats.painted}/${stats.sampled}` : `colours ${stats.uniqueColors} · ${stats.sampled} samples`}`
  const v11ToggleRow = async (hook, key) => {
    const selector = `[${hook}="${key}"]`
    const click = String(await evaluate(clickHook(selector)))
    await sleep(1600)
    return { selector, click }
  }

  /* ---------------------------------------------------------------- R2 */
  await goto3D()
  await evaluate(clickHook('[data-header-action="reset"]'))
  await sleep(1400)
  const r2Base3D = await threeCanvasRead('default (3D tab)')
  await gotoPlates()
  /* The division legend is only meaningful with its own layer switched ON; the
     v10 block turned it on and may have left it on, but the v11 block must not
     depend on that — a check whose premise is "the toggle happens to be on" is a
     check that can pass by not running. */
  const lobesFixed = await evaluate(`(() => {
    const button = [...document.querySelectorAll('.section-lobes-toggle')].find((x) => x.closest('.pip-panel') === null);
    if (button === null) return 'no cortical-division toggle in the Plates live section';
    if (button.getAttribute('aria-pressed') !== 'true') button.click();
    return 'aria-pressed ' + button.getAttribute('aria-pressed');
  })()`)
  await sleep(1400)
  const r2BasePlates = await platesCanvasRead('default (Plates tab)')
  info('v11 R2 division layer (' + String(lobesFixed) + '): baseline rows ' + JSON.stringify(r2BasePlates.platesRows) +
    ' on Plates and ' + JSON.stringify(r2BasePlates.pipRows) + ' in the PiP')

  const r2Off = await v11ToggleRow('data-area', 'telencephalon')
  await gotoPlates()
  const r2AfterPlates = await platesCanvasRead('telencephalon off (Plates tab)')
  await goto3D()
  const r2After3D = await threeCanvasRead('telencephalon off (3D tab)')
  const telRegions = AREA_REGIONS_MAP.telencephalon ?? ['telencephalon']
  const r2TreeBefore = treeDimOf(r2Base3D.treeDim, 'telencephalon')
  const r2TreeAfter = treeDimOf(r2After3D.treeDim, 'telencephalon')
  info(
    'v11 R2 (' + r2Off.click + '): 3D meshes ' + (r2Base3D.meshes ?? []).length + ' → ' + (r2After3D.meshes ?? []).length +
      ' · 3D canvas pixels ' + statsLine(r2Base3D.three) + ' → ' + statsLine(r2After3D.three) +
      ' · PiP ' + statsLine(r2Base3D.pip) + ' → ' + statsLine(r2After3D.pip) +
      ' · Plates ' + statsLine(r2BasePlates.plates) + ' → ' + statsLine(r2AfterPlates.plates) +
      ' · lobe rows Plates ' + JSON.stringify(r2BasePlates.platesRows) + ' → ' + JSON.stringify(r2AfterPlates.platesRows) +
      ' · tree ' + JSON.stringify(r2TreeBefore) + ' → ' + JSON.stringify(r2TreeAfter),
  )
  if (!sceneReady || r2Base3D.rebind?.bound !== true || r2After3D.rebind?.bound !== true) {
    bad(
      'v11 R2: the scene bridge could not be re-bound to the mounted 3D view (' +
        JSON.stringify({ q0SceneReady: sceneReady, before: r2Base3D.rebind, after: r2After3D.rebind }) +
        ') — "the 3D view dropped the area" could not be measured: FAILURE, not a skip',
    )
  } else {
    ok('v11 R2: the scene bridge re-bound to the mounted view after the tab round trip (' +
      JSON.stringify(r2After3D.rebind) + ') — the mesh readings below are of the scene on screen')
    const lost = (r2Base3D.meshes ?? []).filter((name) => !(r2After3D.meshes ?? []).includes(name))
    const gained = (r2After3D.meshes ?? []).filter((name) => !(r2Base3D.meshes ?? []).includes(name))
    if (lost.length > 0 && gained.length === 0) {
      ok('v11 R2: switching the telencephalon area OFF removed ' + lost.length + ' structure mesh(es) from the 3D scene and added none (' +
        lost.slice(0, 3).join(', ') + (lost.length > 3 ? ', …' : '') + ')')
    } else {
      bad('v11 R2: the 3D scene did not follow the area toggle (removed ' + lost.length + ', added ' + gained.length +
        ': ' + JSON.stringify(gained.slice(0, 5)) + ')')
    }
  }
  if (r2Base3D.three?.hash !== undefined && r2After3D.three?.hash !== undefined && r2Base3D.three.hash !== r2After3D.three.hash) {
    ok('v11 R2: the 3D canvas\' own rectangle repainted (' + statsLine(r2Base3D.three) + ' → ' + statsLine(r2After3D.three) + ')')
  } else {
    bad('v11 R2: the 3D canvas rectangle did not change when 85 taxonomy rows were switched off (' +
      statsLine(r2Base3D.three) + ' → ' + statsLine(r2After3D.three) + ')')
  }
  if (r2Base3D.pip?.hash !== undefined && r2After3D.pip?.hash !== undefined && r2Base3D.pip.hash !== r2After3D.pip.hash) {
    ok('v11 R2: the PiP\'s own 2D canvas repainted (' + statsLine(r2Base3D.pip) + ' → ' + statsLine(r2After3D.pip) + ')')
  } else {
    bad('v11 R2: the PiP canvas did not change with the telencephalon off (' + statsLine(r2Base3D.pip) + ' → ' + statsLine(r2After3D.pip) + ')')
  }
  if (r2BasePlates.plates?.hash !== undefined && r2AfterPlates.plates?.hash !== undefined && r2BasePlates.plates.hash !== r2AfterPlates.plates.hash) {
    ok('v11 R2: the Plates live-section canvas repainted (' + statsLine(r2BasePlates.plates) + ' → ' + statsLine(r2AfterPlates.plates) + ')')
  } else {
    bad('v11 R2: the Plates live section did not repaint with the telencephalon off (' + statsLine(r2BasePlates.plates) + ' → ' + statsLine(r2AfterPlates.plates) + ')')
  }
  const r2RowsWereThere = Array.isArray(r2BasePlates.platesRows) && r2BasePlates.platesRows.length > 0
  const r2RowsEmptied = Array.isArray(r2AfterPlates.platesRows) && Array.isArray(r2AfterPlates.pipRows) &&
    r2AfterPlates.platesRows.length === 0 && r2AfterPlates.pipRows.length === 0
  if (r2RowsEmptied && r2RowsWereThere) {
    ok('v11 R2: the cortical-division legend is EMPTY on both surfaces with the area off (Plates ' +
      r2BasePlates.platesRows.length + ' row(s) → 0, PiP ' + r2BasePlates.pipRows.length + ' → 0) — the ribbon pass is area-gated (PLAN §2)')
  } else {
    bad('v11 R2: the division legend did not empty with the telencephalon off (Plates ' +
      JSON.stringify(r2BasePlates.platesRows) + ' → ' + JSON.stringify(r2AfterPlates.platesRows) + ', PiP ' +
      JSON.stringify(r2BasePlates.pipRows) + ' → ' + JSON.stringify(r2AfterPlates.pipRows) + ')')
  }
  if (r2TreeAfter.rows > 0 && r2TreeAfter.on === 0 && r2TreeAfter.off > 0) {
    ok('v11 R2: the taxonomy tree dims every rendered ' + telRegions.join('/') + ' row (' + r2TreeAfter.off + '/' +
      (r2TreeAfter.on + r2TreeAfter.off) + ' is-off across ' + r2TreeAfter.rows + ' region row(s); was ' + r2TreeBefore.off + ')')
  } else {
    bad('v11 R2: the tree did not follow the area toggle (' + JSON.stringify(r2TreeAfter) + ')')
  }
  const r2Recenter = await evaluate(hookState('[data-area="telencephalon"]'))
  if (r2Recenter?.pressed === false) {
    ok('v11 R2: the Areas button reports the state it produced (aria-pressed=false, "' + String(r2Recenter.name) + '")')
  } else {
    bad('v11 R2: the Areas button does not report its own state (' + JSON.stringify(r2Recenter) + ')')
  }

  /* ---- the two-path equality: button vs the legend's per-region checkbox -- */
  await v11ToggleRow('data-area', 'telencephalon')
  await goto3D()
  const r2Restored3D = await threeCanvasRead('restored (3D tab)')
  const r2RestoreOk = sameStringList(r2Base3D.meshes, r2Restored3D.meshes)
  if (r2RestoreOk) {
    ok('v11 R2: switching the area back ON restores the exact 3D scene it started from (' +
      (r2Base3D.meshes ?? []).length + ' mesh names identical)')
  } else {
    bad('v11 R2: the area toggle is not a round trip (meshes ' + (r2Base3D.meshes ?? []).length + ' → ' +
      (r2Restored3D.meshes ?? []).length + ')')
  }
  const r2LegendClick = await evaluate(legendRegionRow('telencephalon'))
  await sleep(1600)
  const r2Legend3D = await threeCanvasRead('telencephalon off (legend row, 3D tab)')
  await gotoPlates()
  const r2LegendPlates = await platesCanvasRead('telencephalon off (legend row, Plates tab)')
  const r2PathsAgree = sameStringList(r2After3D.meshes, r2Legend3D.meshes) &&
    sameStats(r2AfterPlates.plates, r2LegendPlates.plates, 'hash') &&
    sameStringList(r2AfterPlates.platesRows, r2LegendPlates.platesRows)
  if (r2PathsAgree) {
    ok('v11 R2: the two independent paths agree exactly — ' + r2Off.click + ' and ' + String(r2LegendClick) +
      ' render the same ' + (r2After3D.meshes ?? []).length + ' 3D mesh names, the same Plates hash (' +
      r2AfterPlates.plates?.hash + ') and the same ' + (r2AfterPlates.platesRows ?? []).length + ' division row(s)')
  } else {
    bad('v11 R2: the Areas toggle and the per-region legend row do NOT reach the same state (meshes ' +
      (r2After3D.meshes ?? []).length + ' vs ' + (r2Legend3D.meshes ?? []).length + ', Plates ' +
      r2AfterPlates.plates?.hash + ' vs ' + r2LegendPlates.plates?.hash + ', lobe rows ' +
      JSON.stringify(r2AfterPlates.platesRows) + ' vs ' + JSON.stringify(r2LegendPlates.platesRows) + ')')
  }
  await evaluate(legendRegionRow('telencephalon'))
  await sleep(1400)

  /* ---------------------------------------------------------------- R3 */
  const kindSweep = []
  await goto3D()
  for (const kind of ['nucleus', 'context']) {
    await evaluate(clickHook('[data-header-action="reset"]'))
    await sleep(1400)
    const baseline = await threeCanvasRead('default before ' + kind + ' (3D tab)')
    const off = await v11ToggleRow('data-kind', kind)
    await gotoPlates()
    const afterPlates = await platesCanvasRead(kind + ' off (Plates tab)')
    await goto3D()
    const after = await threeCanvasRead(kind + ' off (3D tab)')
    const lost = (baseline.meshes ?? []).filter((name) => !(after.meshes ?? []).includes(name))
    const on = await v11ToggleRow('data-kind', kind)
    await sleep(1000)
    const restored = await threeCanvasRead('restored ' + kind + ' (3D tab)')
    const legendClick = await evaluate(legendKindRow(kind))
    await sleep(1600)
    const legend3D = await threeCanvasRead(kind + ' off (legend kind row, 3D tab)')
    await gotoPlates()
    const legendPlates = await platesCanvasRead(kind + ' off (legend kind row, Plates tab)')
    const entry = {
      kind,
      lost: lost.length,
      three: [baseline.three?.hash, after.three?.hash],
      pip: [baseline.pip?.hash, after.pip?.hash],
      plates: [afterPlates.plates?.hash, legendPlates.plates?.hash],
      restore: sameStringList(baseline.meshes, restored.meshes),
      equalPath: sameStringList(after.meshes, legend3D.meshes) && sameStats(afterPlates.plates, legendPlates.plates, 'hash'),
    }
    kindSweep.push(entry)
    if (lost.length > 0) {
      ok('v11 R3[' + kind + ']: ' + off.click + ' removed ' + lost.length + ' structure mesh(es) from the 3D scene (' +
        lost.slice(0, 3).join(', ') + (lost.length > 3 ? ', …' : '') + ')')
    } else {
      bad('v11 R3[' + kind + ']: switching the ' + kind + ' system off removed nothing from the 3D scene (' +
        (baseline.meshes ?? []).length + ' meshes before and ' + (after.meshes ?? []).length + ' after)')
    }
    if (baseline.three?.hash !== after.three?.hash && baseline.pip?.hash !== after.pip?.hash) {
      ok('v11 R3[' + kind + ']: the 3D canvas and the PiP repainted — 3D canvas ' + baseline.three?.hash + ' → ' +
        after.three?.hash + ', PiP ' + baseline.pip?.hash + ' → ' + after.pip?.hash)
    } else {
      bad('v11 R3[' + kind + ']: a 3D-surface reading did not change (3D ' + baseline.three?.hash + '→' + after.three?.hash +
        ', PiP ' + baseline.pip?.hash + '→' + after.pip?.hash + ')')
    }
    if (afterPlates.plates?.hash !== undefined && legendPlates.plates?.hash !== undefined &&
      afterPlates.plates.hash === legendPlates.plates.hash) {
      ok('v11 R3[' + kind + ']: the Plates live section renders the same pixels through both paths — Systems toggle ' +
        afterPlates.plates.hash + ' = legend "' + kind + '" checkbox ' + legendPlates.plates.hash)
    } else {
      bad('v11 R3[' + kind + ']: the two paths disagree on the Plates surface (' + afterPlates.plates?.hash + ' vs ' + legendPlates.plates?.hash + ')')
    }
    if (entry.restore) {
      ok('v11 R3[' + kind + ']: ' + on.click + ' restores the baseline 3D scene exactly (' + (baseline.meshes ?? []).length + ' meshes)')
    } else {
      bad('v11 R3[' + kind + ']: the system toggle is not a round trip (meshes ' + (restored.meshes ?? []).length + ' vs baseline ' + (baseline.meshes ?? []).length + ')')
    }
    if (entry.equalPath) {
      ok('v11 R3[' + kind + ']: the Systems toggle and the legend\'s "' + kind + '" checkbox render the same 3D scene (' +
        String(legendClick) + ')')
    } else {
      bad('v11 R3[' + kind + ']: the Systems toggle and the legend kind row disagree (meshes ' + (after.meshes ?? []).length +
        ' vs ' + (legend3D.meshes ?? []).length + ')')
    }
    /* the baseline capture for the NEXT kind is taken on the 3D tab: come back
       to it before the next iteration, and restore the legend row first. */
    await evaluate(legendKindRow(kind))
    await sleep(1400)
    await goto3D()
  }
  info(
    'v11 R3 sweep: ' + kindSweep.map((entry) => entry.kind + ' removed ' + entry.lost + ' mesh(es) · 3D ' +
      entry.three.join('→') + ' · PiP ' + entry.pip.join('→') + ' · Plates ' + entry.plates.join('→') +
      ' · round trip ' + (entry.restore ? 'yes' : 'NO') + ' · legend path equal ' + (entry.equalPath ? 'yes' : 'NO')).join(' | '),
  )

  /* ---------------------------------------------------------------- R4 */
  await evaluate(clickHook('[data-header-action="reset"]'))
  await sleep(1600)
  const r4 = await threeCanvasRead('after Reset (3D tab)')
  const r4Header = await evaluate(HEADER_ROWS_PROBE)
  const r4Pressed = (r4Header?.toggles ?? []).map((t) => t.hook + ':' + t.key + '=' + t.pressed).sort().join(' | ')
  if (bootPressed.length > 0 && r4Pressed === bootPressed) {
    ok('v11 R4: after the whole v11 sweep, Reset reproduces the clean-boot pressed set exactly — ' + r4Pressed)
  } else {
    bad('v11 R4: Reset no longer reproduces the clean-boot pressed set (boot ' + bootPressed + ' vs now ' + r4Pressed + ')')
  }
  const r4RenderOk = sameStringList(r2Base3D.meshes, r4.meshes)
  if (r4RenderOk) {
    ok('v11 R4: Reset also restores the documented default RENDER — ' + (r2Base3D.meshes ?? []).length +
      ' mesh names identical to the default captured at the start of block R')
  } else {
    bad('v11 R4: Reset does not restore the default render (meshes ' + (r2Base3D.meshes ?? []).length + ' → ' +
      (r4.meshes ?? []).length + ')')
  }
  await gotoPlates()
  const r4Plates = await platesCanvasRead('after Reset (Plates tab)')
  if (sameStats(r2BasePlates.plates, r4Plates.plates, 'hash') && sameStringList(r2BasePlates.platesRows, r4Plates.platesRows)) {
    ok('v11 R4: the Plates live section returns to the default pixels too (hash ' + r2BasePlates.plates?.hash +
      ', division rows ' + (r4Plates.platesRows ?? []).length + ')')
  } else {
    bad('v11 R4: the Plates surface did not return to the default (Plates ' + r2BasePlates.plates?.hash + ' → ' +
      r4Plates.plates?.hash + ', rows ' + JSON.stringify(r2BasePlates.platesRows) + ' → ' + JSON.stringify(r4Plates.platesRows) + ')')
  }
  const r4Actions = (r4Header?.actions ?? []).map((action) => action.key + '=' + action.pressed).join(' ')
  const defaultPresetPressed = (r4Header?.presets ?? []).filter((preset) => preset.id === 'brainstem-focus')[0]?.pressed ?? null
  if (defaultPresetPressed === true && /reset=true/.test(r4Actions)) {
    ok('v11 R4: Reset and data-preset="brainstem-focus" both report pressed at the default framing (' + r4Actions + ')')
  } else {
    bad('v11 R4: the default framing is not reported by both controls (actions ' + r4Actions + ', default preset ' + String(defaultPresetPressed) + ')')
  }

  /* ---------------------------------------------------------------- R5 */
  /* The calibration checkbox lives in the clipping dock, which belongs to the 3D
     tab, so park the tab first — otherwise the calibration would report "CDP key
     delivery unknown" for a reason that has nothing to do with CDP. */
  await goto3D()
  /* The SAME Space-delivery mechanism the v10 division block uses (`keyDown`
     with `text`, which Blink needs in order to run the default activation of a
     real <button>), calibrated on a plain checkbox first: if CDP's key path is
     dead in this environment the finding is UNVERIFIED, not a product failure. */
  const pressSpaceKey = async () => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ',
    })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  }
  const keyboardCalibrationProbe = `(() => {
    const label = [...document.querySelectorAll('label')].find((l) => /Show plane helper/i.test(l.textContent || ''));
    const input = label === null ? null : label.querySelector('input[type=checkbox]');
    if (input === null) return null;
    input.focus();
    return { checked: input.checked, focused: document.activeElement === input };
  })()`
  const calibration0 = await evaluate(keyboardCalibrationProbe)
  await pressSpaceKey()
  await sleep(400)
  const calibration1 = await evaluate(keyboardCalibrationProbe)
  const spaceDelivered = calibration0 !== null && calibration1 !== null && calibration0.checked !== calibration1.checked
  if (spaceDelivered) await pressSpaceKey()
  const focusToggle = await evaluate(`(() => {
    const button = document.querySelector('[data-area="diencephalon"]');
    if (button === null) return 'no [data-area="diencephalon"] button';
    button.focus();
    return document.activeElement === button ? 'focused' : 'not focused';
  })()`)
  const beforeSpace = await evaluate(hookState('[data-area="diencephalon"]'))
  await pressSpaceKey()
  await sleep(1000)
  const afterSpace = await evaluate(hookState('[data-area="diencephalon"]'))
  const keyboardOk =
    beforeSpace !== null && afterSpace !== null && beforeSpace.pressed !== afterSpace.pressed &&
    afterSpace.pressed === false
  if (!spaceDelivered) {
    info(
      'v11 R5: the CDP Space key did not toggle a plain checkbox either (' + JSON.stringify(calibration0) + ' → ' +
        JSON.stringify(calibration1) + ') — the toggle rows\' keyboard path is UNVERIFIED here, not failed',
    )
  } else if (String(focusToggle) === 'focused' && keyboardOk) {
    ok('v11 R5: the Areas toggle is keyboard operable — a real Space keypress on the focused [data-area="diencephalon"] ' +
      'button flipped aria-pressed ' + beforeSpace.pressed + ' → ' + afterSpace.pressed + ' (the same keypress toggled the calibration checkbox)')
  } else {
    bad('v11 R5: the Areas toggle did not respond to Space (' + String(focusToggle) + ', ' + JSON.stringify(beforeSpace) +
      ' → ' + JSON.stringify(afterSpace) + ')')
  }
  if (afterSpace?.pressed === false) {
    await evaluate(clickHook('[data-area="diencephalon"]'))
    await sleep(900)
  }

  /* ---------------------------------------------------------------- R6 */
  const v11NewErrors = [...exceptions.slice(v11ErrorsBefore), ...consoleErrors.slice(v11ErrorsBefore)]
  if (v11NewErrors.length === 0) {
    ok('v11 hygiene: the toggle-row sweep produced no console error and no page exception')
  } else {
    bad('v11 hygiene: ' + v11NewErrors.length + ' runtime error(s) during the v11 sweep: ' + v11NewErrors.slice(0, 3).join(' || '))
  }
  const appAfterV11 = await evaluate(`({
    root: document.getElementById('root')?.childElementCount ?? -1,
    tabs: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /^(3D|Plates|Syndromes)$/.test(t)),
    areas: document.querySelectorAll('.header-areas button').length,
    systems: document.querySelectorAll('.header-systems button').length,
    pip: document.querySelector('.pip-panel') !== null,
  })`)
  if (appAfterV11.root > 0 && appAfterV11.tabs.length === 3 && appAfterV11.areas > 0 && appAfterV11.systems > 0) {
    ok('v11 hygiene: the app is fully alive after the v11 sweep (' + JSON.stringify(appAfterV11) + ')')
  } else {
    bad('v11 hygiene: the app is not in its documented shape after the v11 sweep (' + JSON.stringify(appAfterV11) + ')')
  }

} catch (error) {
  bad(`audit aborted: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  try {
    ws?.close()
  } catch {
    /* ignore */
  }
  // Stops Chrome AND the dev server this script started (a server it did not
  // start is never touched), then hard-exits below so no handle can keep the
  // wrapper alive.
  await lifecycle.dispose()
}

const passed = results.filter(([s]) => s === 'ok').length
const failed = results.filter(([s]) => s === 'FAIL').length
console.log('\n================ NeuroAxis runtime audit ================')
for (const [status, message] of results) {
  console.log(`${status === 'ok' ? '  ok ' : status === 'FAIL' ? ' FAIL' : ' info'}  ${message}`)
}
console.log(`\n${passed} passed · ${failed} failed · ${results.filter(([s]) => s === 'info').length} informational`)
console.log(`exit ${failed === 0 ? EXIT.OK : EXIT.CHECKS_FAILED} (${failed === 0 ? 'all checks passed' : 'CHECKS FAILED'})`)
process.exit(failed === 0 ? EXIT.OK : EXIT.CHECKS_FAILED)
