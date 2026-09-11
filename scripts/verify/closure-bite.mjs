/**
 * closure-bite.mjs — the MUTATION PROOF of the v7 closure gates (plan §4.2).
 *
 * WHY THIS FILE EXISTS
 * A gate that always passes is not a gate. The v7 closure claims five product
 * gaps are fixed (context-loss overlay, PostFX composer guard, CT coverage
 * honesty, brainstem-focus default + region guard, `?panelfail` containment) plus
 * one audit-artifact fix — and every one of those claims is decided by
 * `scripts/verify/audit-checks.test.mjs` (the Tier-1 mirror of the browser
 * audit). This script proves those verdicts can FAIL: for each gap it
 * re-introduces the exact defect, re-runs the mirror on a mutated copy of the
 * tree, and requires a non-zero exit with the expected failure text.
 *
 * The mutation is never applied to the shared worktree. The copy lives in
 * `.plate-scratch/bite/tree` (gitignored) and gets `src/`, `scripts/` and a
 * junction to the real `node_modules`. The six mutated files' hashes are printed
 * before and after, so "the shared tree was not touched" is measured, not
 * promised.
 *
 * Sandbox note: this environment blocks PIPED child stdio
 * (`spawnSync(..., {stdio: 'pipe'})` → EPERM), so the mirror's output is captured
 * through real file descriptors. Nothing here needs a browser, a server or the
 * network.
 *
 * Run:  node scripts/verify/closure-bite.mjs     (exit 0 = every gap's gate bit)
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const WORK = resolve(ROOT, '.plate-scratch/bite')
const TREE = resolve(WORK, 'tree')
const LOG = resolve(WORK, 'mirror.log')
const MIRROR = 'scripts/verify/audit-checks.test.mjs'

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12)

/* ------------------------------------------------------------- the fixture */

function buildTree() {
  rmSync(TREE, { recursive: true, force: true })
  mkdirSync(TREE, { recursive: true })
  for (const entry of ['src', 'scripts']) {
    cpSync(resolve(ROOT, entry), resolve(TREE, entry), { recursive: true })
  }
  for (const file of ['package.json', 'tsconfig.json']) {
    if (existsSync(resolve(ROOT, file))) cpSync(resolve(ROOT, file), resolve(TREE, file))
  }
  symlinkSync(resolve(ROOT, 'node_modules'), resolve(TREE, 'node_modules'), 'junction')
}

/** The mirror's own failure list (printed under "FAILURES:"). */
function failureLines(output) {
  const at = output.indexOf('FAILURES:')
  if (at < 0) return []
  return output
    .slice(at)
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('·'))
    .map((line) => line.replace(/^·\s*/, ''))
}

/** The tail of a crashed run (the store's load assertion aborts before the summary). */
function crashLine(output) {
  const line = output
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('Error: '))
    .pop()
  return line === undefined ? null : line.slice(0, 120)
}

/** Run the mirror inside the copy; stdout+stderr are captured through a file. */
function runMirror() {
  const fd = openSync(LOG, 'w')
  const result = spawnSync(process.execPath, [MIRROR], {
    cwd: TREE,
    stdio: ['ignore', fd, fd],
  })
  closeSync(fd)
  const output = existsSync(LOG) ? readFileSync(LOG, 'utf8') : ''
  const failedMatch = /(\d+) passed · (\d+) failed/.exec(output)
  return {
    status: result.status,
    error: result.error?.code ?? null,
    output,
    passed: failedMatch === null ? null : Number(failedMatch[1]),
    failed: failedMatch === null ? null : Number(failedMatch[2]),
  }
}

/* ------------------------------------------------------------- mutations */

/**
 * One per closed gap. `from` must appear exactly once in the file (verified),
 * `to` re-introduces the pre-fix defect, and `expect` is the text the mirror
 * must print when it catches it.
 */
const MUTATIONS = [
  {
    gap: '(1) context-loss overlay',
    file: 'src/components/viewer3d/Viewer3D.tsx',
    what: 'drop the data-context-lost attribute from the recovery card',
    from: '      data-context-lost={phase}\n',
    to: '',
    expect: 'data-context-lost',
    note: 'the audit queries [data-context-lost]; without it the overlay is unreachable',
  },
  {
    gap: '(2) PostFX composer guard',
    file: 'src/components/viewer3d/PostFX.tsx',
    what: 'let the composer mount while the context is lost (the alpha crash)',
    from: '  if (contextLost) return null\n',
    to: '',
    expect: 'PostFX',
    note: 'postprocessing reads getContextAttributes().alpha, which is null on a lost context',
  },
  {
    gap: '(3) CT coverage honesty',
    file: 'src/components/section/imageLayers.ts',
    what: 'keep the limit but drop the "MRI is the modality of record" sentence',
    from: 'MRI is the modality of record at this level.',
    to: 'No source imagery is available at this level.',
    expect: 'CT',
    note: 'the honest statement must name the measured limit AND the modality of record',
  },
  {
    gap: '(4a) brainstem-focus default: no diencephalon row hidden',
    file: 'src/state/store.ts',
    what: 'make the default preset hide a diencephalon record (the audit-named row)',
    from: '    hidden: new Set(CORTEX_PRESET_IDS),',
    to: "    hidden: new Set([...CORTEX_PRESET_IDS, 'ctx-thalamus-envelope']),",
    expect: 'hides "ctx-thalamus-envelope"',
    note: 'the default-framing assertion must throw at module load, before anything renders',
  },
  {
    gap: '(4b) preset region guard (every preset, not just the default)',
    file: 'src/state/store.ts',
    what: 'make a NON-default preset hide a telencephalon record it does not own',
    from: '    hidden: new Set(nonTelencephalonIds()),',
    to: "    hidden: new Set([...nonTelencephalonIds(), 'ctx-cerebral-cortex']),",
    expect: 'preset "cortex-only" hides the telencephalon record',
    note: 'only the per-preset guard added by this closure can catch this row',
  },
  {
    gap: '(5) ?panelfail containment signal',
    file: 'src/components/section/SectionErrorBoundary.tsx',
    what: 'render the failure card without its probe marker (the pre-fix DOM)',
    from: "      {...(armed ? { 'data-panel-probe': name } : {})}\n",
    to: '',
    expect: 'data-panel-probe',
    note: 'arming and containment must be one observable fact, not two guesses',
  },
  {
    gap: '(6) audit artifact: coverage-aware CT sweep',
    file: 'scripts/verify/checks.mjs',
    what: 'ignore the CT source limit in the modality sweep (demand a credit that cannot exist)',
    from: '  const aboveCt = ctBeyondCoverage(reading, coverage)',
    to: '  const aboveCt = false && ctBeyondCoverage(reading, coverage)',
    expect: 'no CT here',
    note: 'the pre-fix audit demanded a CT credit above the Visible Human source',
  },
]

/* ----------------------------------------------------------------- driver */

console.log('\n================ NeuroAxis v7 closure — mutation proof ================')
console.log('  isolated copy: .plate-scratch/bite/tree (src/ + scripts/ + node_modules junction)')
console.log('  gate under test: node scripts/verify/audit-checks.test.mjs\n')

buildTree()
const touchedFiles = [...new Set(MUTATIONS.map((mutation) => mutation.file))]
const hashBefore = Object.fromEntries(
  touchedFiles.map((file) => [file, sha(resolve(ROOT, file))]),
)

const baseline = runMirror()
console.log(
  `  baseline (unmutated copy): exit ${String(baseline.status)} · ` +
    `${baseline.passed ?? '?'} passed · ${baseline.failed ?? '?'} failed`,
)
if (baseline.status !== 0 || baseline.failed !== 0) {
  console.log('\n  the mirror does not pass on an unmutated copy — nothing below would mean anything.')
  console.log(baseline.output.split('\n').slice(-25).join('\n'))
  process.exit(1)
}

const rows = []
let toothless = 0
for (const mutation of MUTATIONS) {
  const target = resolve(TREE, mutation.file)
  const pristine = readFileSync(resolve(ROOT, mutation.file), 'utf8')
  const occurrences = pristine.split(mutation.from).length - 1
  if (occurrences !== 1) {
    rows.push({
      gap: mutation.gap,
      what: mutation.what,
      status: 'ANCHOR',
      detail: `the mutation anchor appears ${occurrences}× in ${mutation.file} — fix this script`,
      bit: false,
    })
    toothless += 1
    continue
  }
  writeFileSync(target, pristine.replace(mutation.from, mutation.to))
  const run = runMirror()
  writeFileSync(target, pristine) // restore immediately: the copy never keeps a defect
  const caught = run.status !== 0 && run.output.includes(mutation.expect)
  if (!caught) toothless += 1
  const caughtBy = failureLines(run.output)[0] ?? crashLine(run.output) ?? '(no named check)'
  rows.push({
    gap: mutation.gap,
    what: mutation.what,
    status: run.status === null ? `ERROR ${String(run.error)}` : `exit ${run.status}`,
    detail:
      (run.failed === null ? 'no summary line (the gate threw)' : `${run.failed} failed`) +
      (caught ? ` · caught: "${mutation.expect}"` : ` · EXPECTED "${mutation.expect}" — NOT FOUND`),
    caughtBy: caughtBy.length > 118 ? `${caughtBy.slice(0, 115)}…` : caughtBy,
    bit: caught,
  })
}

const restored = runMirror()
console.log('\n  mutation table ' + '─'.repeat(64))
for (const row of rows) {
  console.log(`\n  ${row.bit ? '✓' : '✗'} ${row.gap} — ${row.what}`)
  console.log(`      ${row.status} · ${row.detail}`)
  console.log(`      caught by: ${row.caughtBy}`)
}
console.log('\n  restore check ' + '─'.repeat(66))
const hashAfter = Object.fromEntries(
  touchedFiles.map((file) => [file, sha(resolve(ROOT, file))]),
)
const unchanged = touchedFiles.every((file) => hashBefore[file] === hashAfter[file])
for (const file of touchedFiles) {
  console.log(`    ${hashBefore[file] === hashAfter[file] ? '·' : '✗'} ${file} ${hashBefore[file]}`)
}
unchanged
  ? console.log('  ✓ the shared tree is byte-identical: every mutation happened in the copy')
  : console.log('  ✗ THE SHARED TREE CHANGED — mutations leaked out of the copy')
console.log(
  `  ${restored.status === 0 && restored.failed === 0 ? '✓' : '✗'} the restored copy re-runs green ` +
    `(${restored.passed ?? '?'} passed · ${restored.failed ?? '?'} failed) — no lie is left behind`,
)

const clean = toothless === 0 && unchanged && restored.status === 0
console.log(
  `\n  ${MUTATIONS.length - toothless}/${MUTATIONS.length} mutations caught by the mirror · ` +
    `shared tree ${unchanged ? 'untouched' : 'TOUCHED'}\n`,
)
if (!clean) {
  console.log('MUTATION PROOF FAILED — a gate above is toothless.\n')
  process.exit(1)
}
console.log('✔ every closed gap has a gate that bites on its own defect\n')
process.exit(0)
