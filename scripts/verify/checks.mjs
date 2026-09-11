/**
 * checks.mjs — the audit's load-bearing predicates, extracted so that the
 * BROWSER lane (`scripts/verify/audit.mjs`) and a NODE-ONLY lane
 * (`scripts/verify/audit-checks.test.mjs`) assert the SAME text.
 *
 * WHY THIS FILE EXISTS
 * The runtime audit needs headless Chrome, which cannot start in every sandbox
 * (measured on this machine: `crashpad_client_win.cc OpenProcess: Access is
 * denied (0x5)`, Chrome's DevTools endpoint never answers → `exit 4`, no check
 * run). A gate that cannot run must never be a gate that cannot fail, so the
 * predicates that decide the v7 closure checks live here as pure functions:
 * the browser lane feeds them REAL DOM readings, and a Node test feeds them
 * synthetic readings plus the SHIPPED manifests. Both consume one
 * implementation, so the two lanes cannot drift apart.
 *
 * DESIGN RULES
 *   • Pure: every predicate takes a plain reading object and returns a plain
 *     verdict `{ ok, label, detail }`. No DOM, no window, no timers.
 *   • No literals that can drift: the CT limit is READ from the shipped
 *     `ct-manifest.json` (`readCtSourceCoverage`), never typed twice.
 *   • Labels are stable identifiers (they are what a Node test asserts on),
 *     `detail` is the human sentence the audit prints.
 *
 * Node-only entry point (no browser, no server, no precondition):
 *   node -e "import('./scripts/verify/checks.mjs').then(m=>console.log(m.readCtSourceCoverage()))"
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Build one verdict. `label` is the stable machine-facing outcome. */
function verdict(ok, label, detail) {
  return { ok, label, detail }
}

/* ------------------------------------------------------- shipped manifests */

/**
 * The CT source-coverage block of the SHIPPED manifest
 * (`intensity.sourceCoverage`), or null when this build declares none.
 *
 * The path is resolved relative to this file, so the reader works from any cwd
 * and never needs an argument. Returns `{ limit, fractionInsideFov,
 * stationsInsideFov, totalStations, coverageNote, levelRows }`.
 */
export function readCtSourceCoverage(manifestUrl = new URL('../../src/assets/imaging/ct-manifest.json', import.meta.url)) {
  const raw = JSON.parse(readFileSync(fileURLToPath(manifestUrl), 'utf8'))
  const coverage = raw?.intensity?.sourceCoverage ?? null
  const limit = coverage?.superiorMostDataYAu
  const note = raw?.registration?.residuals?.coverageNote
  return {
    limit: typeof limit === 'number' && Number.isFinite(limit) ? limit : null,
    fractionInsideFov:
      typeof coverage?.fractionInsideFov === 'number' ? coverage.fractionInsideFov : null,
    stationsInsideFov: typeof coverage?.stationsInsideFov === 'number' ? coverage.stationsInsideFov : null,
    totalStations: typeof coverage?.totalStations === 'number' ? coverage.totalStations : null,
    levelRows: Array.isArray(coverage?.levelRowsAu) ? coverage.levelRowsAu : [],
    coverageNote: typeof note === 'string' && note.length > 0 ? note : null,
  }
}

/** The MRI manifest's own coverage block (`coverage.fractionInsideFov`). */
export function readMriSourceCoverage(manifestUrl = new URL('../../src/assets/imaging/mri-manifest.json', import.meta.url)) {
  const raw = JSON.parse(readFileSync(fileURLToPath(manifestUrl), 'utf8'))
  const coverage = raw?.coverage ?? null
  return {
    fractionInsideFov: typeof coverage?.fractionInsideFov === 'number' ? coverage.fractionInsideFov : null,
    stationsInsideFov: typeof coverage?.stationsInsideFov === 'number' ? coverage.stationsInsideFov : null,
    totalStations: typeof coverage?.totalStations === 'number' ? coverage.totalStations : null,
  }
}

/* ------------------------------------------------------- (3) CT coverage */

/**
 * Is this plane beyond the CT SOURCE (as opposed to merely empty inside it)?
 * Mirrors the shipped rule in `src/components/section/imageLayers.ts`
 * (`beyondCtSourceCoverage`): the transverse axis only, above the measured
 * apex. The limit comes from the manifest, so a re-bake moves this predicate
 * with it.
 */
export function ctBeyondCoverage(reading, coverage) {
  if (coverage?.limit === null || coverage?.limit === undefined) return false
  if (reading?.axis !== 'y') return false
  if (typeof reading?.planeValue !== 'number' || !Number.isFinite(reading.planeValue)) return false
  return reading.planeValue > coverage.limit
}

/** True when `text` names the measured limit AND names MRI as the modality of record. */
export function namesCtLimit(text, coverage) {
  if (typeof text !== 'string' || text.length === 0) return false
  if (coverage?.limit === null || coverage?.limit === undefined) return false
  const limit = coverage.limit.toFixed(2)
  return text.includes(limit) && /MRI is the modality of record/i.test(text)
}

/**
 * The v7 CT coverage-honesty check (TELENCEPHALON_PLAN §9 / plan C3).
 *
 * Reading: `{ axis, planeValue, kind, notePresent, noteText, hintText }` — the
 * DOM state of the live-section toolbar note (`.is-ct-coverage`) and the canvas
 * hint (`.section-imagery-hint`) at ONE proven plane.
 *
 * The check is coverage-aware in BOTH directions:
 *   • above the measured limit, with CT requested: a statement naming the limit
 *     and MRI is REQUIRED (toolbar note) and the canvas hint must repeat it —
 *     a blank panel above the CT source is the defect v7 exists to remove;
 *   • inside the coverage: no statement may be demanded (and none is required
 *     to be absent — a covered plane has real imagery and shows a credit).
 */
export function ctCoverageReading(reading, coverage = readCtSourceCoverage()) {
  const axis = reading?.axis ?? '?'
  const planeValue = typeof reading?.planeValue === 'number' ? reading.planeValue : Number.NaN
  // Case-insensitive: the browser lane reads the modality from the toolbar
  // button's own label ("CT"), the Node lane passes the store's kind ("ct").
  const kind = String(reading?.kind ?? '?')
  const where = `axis ${axis} at ${Number.isFinite(planeValue) ? planeValue.toFixed(1) : '?'} au (kind ${kind})`
  const above = ctBeyondCoverage(reading, coverage)

  if (!above) {
    return verdict(
      true,
      'inside-coverage',
      `CT coverage check not applicable — ${where} is inside the CT source ` +
        `(limit ${coverage.limit === null ? 'not declared' : coverage.limit.toFixed(2)} au); ` +
        'no coverage statement is required here',
    )
  }

  const statementRequired = kind.toLowerCase() === 'ct' || kind.toLowerCase() === 'auto'
  if (!statementRequired) {
    return verdict(
      true,
      'not-requested',
      `CT coverage check not applicable — ${where} is above the limit but CT is not the requested modality`,
    )
  }

  if (reading?.notePresent !== true) {
    return verdict(
      false,
      'note-missing',
      `CT coverage statement missing at ${where} — the plane is above the measured limit ` +
        `${coverage.limit.toFixed(2)} au and the toolbar shows no .is-ct-coverage note ` +
        `(hint: "${String(reading?.hintText ?? '').slice(0, 60)}")`,
    )
  }
  if (!namesCtLimit(reading.noteText, coverage)) {
    return verdict(
      false,
      'note-vague',
      `CT coverage statement at ${where} does not name the measured limit and MRI as the modality of ` +
        `record: "${String(reading?.noteText ?? '').slice(0, 120)}"`,
    )
  }
  if (!namesCtLimit(reading.hintText, coverage)) {
    return verdict(
      false,
      'hint-not-coverage-aware',
      `the canvas hint at ${where} does not repeat the CT coverage limit (it must say the plane is ` +
        `above ${coverage.limit.toFixed(2)} au and that MRI is the modality of record): ` +
        `"${String(reading?.hintText ?? '').slice(0, 120)}"`,
    )
  }
  const fraction =
    coverage.fractionInsideFov === null
      ? ''
      : ` · ${(coverage.fractionInsideFov * 100).toFixed(1)} % of stations inside the source FOV`
  return verdict(
    true,
    'coverage-honest',
    `CT states its measured coverage limit above the source at ${where} — "${String(reading.noteText).slice(0, 120)}"${fraction}`,
  )
}

/* ------------------------------------------- (4) default preset / focus */

/**
 * The boot-preset check (TELENCEPHALON_PLAN §5/§9: "Brainstem focus" is the
 * first-time default).
 *
 * Reading: `{ bootActiveLabels, storedPreset }` — the header preset buttons
 * reporting `aria-pressed="true"` at a CLEAN boot, plus the stored
 * `neuroaxis.viewPreset` value read at the same moment.
 *
 * `storedPreset` is reported so the two causes can never be confused: a
 * non-default active preset that matches a stored key is a returning visitor's
 * preference (a CHECK defect if the check demanded the default), not a product
 * defect. The lane therefore boots from a clean profile — see `audit.mjs`'s
 * A0 block.
 */
export function presetFocusReading(reading) {
  const active = Array.isArray(reading?.bootActiveLabels) ? reading.bootActiveLabels : []
  const stored = reading?.storedPreset ?? null
  const focused = active.some((label) => /brainstem focus/i.test(String(label)))
  const cause =
    stored !== null && stored !== ''
      ? `active preset came from the STORED preference "${stored}" (the check must run from a clean profile)`
      : 'no stored preference — this is the code default'

  if (!focused) {
    return verdict(
      false,
      'not-brainstem-focus',
      `the boot preset is not Brainstem focus (active: ${active.join(', ') || 'none'}; ${cause})`,
    )
  }
  return verdict(
    true,
    'default-brainstem-focus',
    `default preset is Brainstem focus (header reports "${active.join(', ')}"; ${cause})`,
  )
}

/**
 * The dimming half of the same check: at default framing no
 * brainstem/diencephalon/cerebellum tree row may carry the tree's `is-off`
 * class (TaxonomyTree `layerOff` = region layer off OR kind layer off).
 *
 * Reading: `{ offRows, rowsSeen, storedPreset }`. `rowsSeen === 0` is a FAILURE,
 * not a pass: the tree renders leaves only while a subdivision is open, so a
 * collapsed tree must not be able to make this assertion pass vacuously.
 */
export function presetDimmingReading(reading) {
  const off = Array.isArray(reading?.offRows) ? reading.offRows : []
  const rowsSeen = typeof reading?.rowsSeen === 'number' ? reading.rowsSeen : -1
  const stored = reading?.storedPreset ?? null
  const cause =
    stored !== null && stored !== ''
      ? `the active preset came from the STORED preference "${stored}"`
      : 'no stored preference — this is the code default'

  if (rowsSeen === 0) {
    return verdict(
      false,
      'no-rows-observed',
      'no brainstem-family tree row was rendered, so the dimming assertion would pass vacuously ' +
        `(the tree must be expanded before reading it; ${cause})`,
    )
  }
  if (off.length > 0) {
    return verdict(
      false,
      'brainstem-rows-dimmed',
      `${off.length} brainstem-family tree row(s) are dimmed at default framing: ${off.join(', ')} ` +
        `(the default preset must keep every non-telencephalon structure at full strength; ${cause})`,
    )
  }
  return verdict(
    true,
    'no-brainstem-rows-dimmed',
    `no brainstem/diencephalon/cerebellum tree row is layer-off at default framing ` +
      `(${rowsSeen} row(s) inspected; ${cause})`,
  )
}

/* ------------------------------------- (5) error-boundary containment */

/** The `?panelfail` containment reading (QUALITY_PLAN §1 item 2 / §6). */
export function panelContainmentReading(reading) {
  const expected = reading?.expected ?? null
  const card = reading?.card ?? null
  const probes = typeof reading?.probes === 'number' ? reading.probes : -1
  const hasRetry = reading?.hasRetry === true

  if (card === null) {
    return verdict(
      false,
      'card-missing',
      `the forced throw in "${expected}" produced no [data-panel-error] card — the surface is either ` +
        `unwrapped or the throw escaped past its boundary (probes=${probes}, armed=${String(reading?.armed ?? '')})`,
    )
  }
  if (expected !== null && card !== expected) {
    return verdict(
      false,
      'wrong-surface',
      `the forced throw in "${expected}" was contained by the wrong boundary (card="${card}")`,
    )
  }
  if (probes !== 1) {
    return verdict(
      false,
      'probe-missing',
      `the containment card for "${expected}" carries no single [data-panel-probe] marker ` +
        `(found ${probes}) — the armed surface's failure is not observable, so a missing card ` +
        'could be mistaken for a passing check',
    )
  }
  if (!hasRetry) {
    return verdict(false, 'no-retry', `the containment card for "${expected}" offers no Retry action`)
  }
  return verdict(
    true,
    'contained',
    `a throw inside "${expected}" is CONTAINED: [data-panel-error="${card}"] with ` +
      '[data-panel-probe] and a Retry action',
  )
}

/** The recovery half: Retry must clear the card and give the panel back. */
export function panelRecoveryReading(reading) {
  const expected = reading?.expected ?? null
  const card = reading?.card ?? 'still shown'
  const panelBack = reading?.panelBack === true
  if (card !== 'cleared') {
    return verdict(
      false,
      'retry-ineffective',
      `Retry did not clear the "${expected}" failure card (card=${card})`,
    )
  }
  if (!panelBack) {
    return verdict(
      false,
      'panel-not-remounted',
      `the "${expected}" card cleared but the panel did not render again — containment must be ` +
        'recoverable, not a permanent hole',
    )
  }
  return verdict(true, 'recovered', `Retry cleared the "${expected}" card and the panel is back`)
}

/* ------------------------------------------- (1)+(2) context loss DOM */

/**
 * The DOM contract of the WebGL context-loss overlay (`Viewer3D.tsx`).
 *
 * Reading: `{ mounted, phase, role, buttons, canvasLost, panelError }` — what the
 * page shows at the SAME moment the browser reports a lost context. The
 * `panelError` field is the fail-stop diagnostic: when the overlay is missing,
 * a non-null `[data-panel-error]` value proves the throw was swallowed by an
 * error boundary (i.e. the canvas subtree was unmounted) instead of the loss
 * simply not being observed.
 */
export function contextLossReading(reading, expectLost = true) {
  const mounted = reading?.mounted === true
  const phase = reading?.phase ?? null
  const canvasLost = reading?.canvasLost
  const panelError = reading?.panelError ?? null

  if (!expectLost) {
    return mounted
      ? verdict(
          false,
          'overlay-covers-healthy-canvas',
          `the recovery overlay is mounted while the context is healthy (phase ${phase}) — a live ` +
            'canvas must never be covered',
        )
      : verdict(true, 'overlay-unmounted', 'the context-loss overlay is UNMOUNTED while the context is healthy')
  }

  if (!mounted) {
    return verdict(
      false,
      'overlay-missing',
      `no [data-context-lost] overlay while isContextLost() === ${String(canvasLost)} — ` +
        (panelError === null
          ? 'the loss was never observed by the app'
          : `the canvas subtree was replaced by the "${panelError}" error boundary, which took the ` +
            'overlay with it'),
    )
  }
  if (phase !== 'lost') {
    return verdict(
      false,
      'phase-not-lost',
      `the overlay is mounted with data-context-lost="${phase}" after a real loss (expected "lost")`,
    )
  }
  if (reading?.role !== 'alert') {
    return verdict(
      false,
      'not-an-alert',
      `the loss overlay is not a role="alert" region (role="${String(reading?.role ?? '')}") — a ` +
        'silent recovery state is the failure mode this gate exists to remove',
    )
  }
  const buttons = Array.isArray(reading?.buttons) ? reading.buttons.map((b) => String(b)) : []
  const hasRestore = buttons.some((b) => /restore/i.test(b))
  const hasReload = buttons.some((b) => /reload/i.test(b))
  if (!hasRestore || !hasReload) {
    return verdict(
      false,
      'controls-missing',
      `the loss overlay offers no ${hasRestore ? '' : 'Restore '}${!hasRestore && !hasReload ? 'and ' : ''}` +
        `${hasReload ? '' : 'Reload '}control (buttons: ${buttons.join(' / ') || 'none'})`,
    )
  }
  return verdict(
    true,
    'loss-visible-and-recoverable',
    `recovery overlay appears on loss (data-context-lost="lost", role=alert, buttons: ` +
      `${buttons.join('/')})`,
  )
}

/**
 * The post-loss reading: either the overlay is gone AND the context is live, or
 * the app honestly reached its terminal `dead` state with a Reload control (the
 * browser never fired `webglcontextrestored` — common under SwiftShader).
 */
export function contextRestoreReading(reading) {
  const mounted = reading?.mounted === true
  const phase = reading?.phase ?? null
  const canvasLost = reading?.canvasLost
  const buttons = Array.isArray(reading?.buttons) ? reading.buttons.map((b) => String(b)) : []

  if (!mounted && canvasLost === false) {
    return verdict(true, 'restored', 'context restored: overlay unmounted and the canvas holds a live context')
  }
  if (phase === 'dead' && buttons.some((b) => /reload/i.test(b))) {
    return verdict(
      true,
      'terminal-dead-state',
      'restore never arrived, so the code took its documented terminal state (data-context-lost="dead") ' +
        'with a Reload control — not a silent blank canvas',
    )
  }
  if (phase === 'lost' && canvasLost === false) {
    return verdict(
      true,
      'live-one-frame-behind',
      'the context came back and is live; the overlay is still in its "lost" state for one frame ' +
        '(reported, not failed — the canvas is not lost)',
    )
  }
  return verdict(
    false,
    'no-recovery',
    `the canvas did not recover and did not reach the documented terminal state ` +
      `(mounted=${mounted}, phase=${String(phase)}, canvasLost=${String(canvasLost)})`,
  )
}

/* ------------------------------------------- (6) modality sweep honesty */

/**
 * One row of the modality sweep (audit section E), coverage-aware.
 *
 * The old check demanded a credit for EVERY modality at EVERY plane, which is
 * false in this build in two measured cases: the CT source ends at canonical
 * y ≈ 36.25 au (the four new telencephalic levels are outside it) and no
 * photograph is anchored above the highest mapped level. Those are properties of
 * the DATA, so the honest assertion is:
 *   • in coverage → the modality's own credit;
 *   • above the CT source → NO CT credit, plus a statement naming the limit and
 *     MRI (never "painted nothing" as a failure);
 *   • a photograph with no anchor at this plane → the canvas' no-anchor hint.
 */
export function modalityReading(reading, coverage = readCtSourceCoverage()) {
  const requested = reading?.requested ?? '?'
  const credit = typeof reading?.credit === 'string' ? reading.credit : ''
  const hint = typeof reading?.hint === 'string' ? reading.hint : ''
  const note = typeof reading?.note === 'string' ? reading.note : ''
  const painted = typeof reading?.painted === 'number' ? reading.painted : 0
  const aboveCt = ctBeyondCoverage(reading, coverage)
  const where = `axis ${reading?.axis ?? '?'} at ${Number(reading?.planeValue ?? '?')} au`

  if (requested === 'CT') {
    if (aboveCt) {
      const honest = namesCtLimit(hint, coverage) || namesCtLimit(note, coverage)
      if (/national library of medicine/i.test(credit)) {
        return verdict(
          false,
          'ct-credit-above-source',
          `CT claims imagery at ${where}, above its measured source limit ` +
            `${coverage.limit.toFixed(2)} au ("${credit.slice(0, 60)}")`,
        )
      }
      return honest
        ? verdict(
            true,
            'ct-beyond-source-honest',
            `CT above its source at ${where}: no CT credit and the limit is stated ` +
              `("${(namesCtLimit(hint, coverage) ? hint : note).slice(0, 80)}")`,
          )
        : verdict(
            false,
            'ct-beyond-source-silent',
            `CT above its source at ${where} shows neither imagery nor the coverage statement ` +
              `(credit "${credit.slice(0, 40)}", hint "${hint.slice(0, 40)}")`,
          )
    }
    return /national library of medicine/i.test(credit) && painted > 50
      ? verdict(true, 'ct-credit', `CT: ${painted} samples · credit "${credit.slice(0, 44)}"`)
      : verdict(
          false,
          'ct-credit-missing',
          `modality CT inside its coverage did not paint its own imagery at ${where} ` +
            `(painted=${painted}, credit "${credit.slice(0, 50)}")`,
        )
  }

  if (requested === 'MRI') {
    return /openneuro/i.test(credit) && painted > 50
      ? verdict(true, 'mri-credit', `MRI: ${painted} samples · credit "${credit.slice(0, 44)}"`)
      : verdict(
          false,
          'mri-credit-missing',
          `modality MRI did not paint its own imagery at ${where} (painted=${painted}, credit "${credit.slice(0, 50)}")`,
        )
  }

  if (requested === 'Photo') {
    if (/(british columbia|national library of medicine)/i.test(credit)) {
      return verdict(true, 'photo-credit', `Photo: ${painted} samples · credit "${credit.slice(0, 44)}"`)
    }
    const noAnchor = /no photograph is anchored|no .*photograph/i.test(hint)
    return noAnchor
      ? verdict(
          true,
          'photo-no-anchor-honest',
          `Photo at ${where} has no anchored plate and the canvas says so ("${hint.slice(0, 70)}")`,
        )
      : verdict(
          false,
          'photo-state-unclear',
          `modality Photo at ${where} shows neither a photographic credit nor the no-anchor hint ` +
            `(credit "${credit.slice(0, 40)}", hint "${hint.slice(0, 40)}")`,
        )
  }

  if (requested === 'Simulated only') {
    return credit === ''
      ? verdict(true, 'simulated-only', `Simulated only: ${painted} samples · no real imagery (as chosen)`)
      : verdict(
          false,
          'simulated-only-showed-real',
          `"Simulated only" still showed real imagery at ${where}: "${credit.slice(0, 50)}"`,
        )
  }

  return verdict(false, 'unknown-modality', `unrecognised modality in the sweep: "${requested}"`)
}
