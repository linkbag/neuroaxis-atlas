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
 * v11 added `headerToggleRowsReading` — the contract of the header's two toggle
 * rows (Areas / Systems) plus the Reset / All actions and the preset shortcut row.
 * It returns an ARRAY of verdicts (one per falsifiable claim), so a failure names
 * the part that broke; `audit.mjs` drives it from the real DOM at a clean boot
 * (block A0b) and again after the composed default restore (block R1), and
 * `verify:area-toggles` is the Node lane's full version of the same contract.
 *
 * ── v12–v12g RE-POINT (this review task; the product was NOT bent back) ────
 * v12 removed the preset shortcut row and the `data-header-action="reset"|"all"`
 * pair, and v12b–v12g replaced them with TWO per-axis All modules inside the
 * Areas / Systems rows (`areas-all-on` / `areas-all-off` / `systems-all-on` /
 * `systems-all-off`) plus the region-backed `Vasculature` system button
 * (`data-system-region`) and the `clinical-motor` category button. Every
 * predicate below therefore reads the POST-v12 header:
 *   • `presetFocusReading` decides the documented default framing from the ROW
 *     state (`rowFraming`) when the audit supplies it, because no preset button
 *     exists to read any more; the v11 `data-preset` path and the label fallback
 *     are kept so the shape stays backwards-compatible for callers that still
 *     have a preset row (and so `verify:audit-checks`, which feeds the label
 *     fixture, keeps asserting the same text).
 *   • `headerToggleRowsReading` claim 6 is now "the two All modules are wired to
 *     their own axis" instead of "Reset is pressed exactly when the default
 *     preset is", and claim 7 is now "the Systems row carries the region-backed
 *     Vasculature button and the Clinical motor category" instead of "the preset
 *     shortcut row is still rendered". Both were re-pointed, neither deleted:
 *     the CLAIM each one made (the default framing is reachable; the row cannot
 *     be collapsed into a control-free stub) is still asserted, against the
 *     controls that now exist.
 *
 * ── v13 + v14: WHY THIS FILE NEEDED NO EIGHTH CLAIM ────────────────────────
 * v13 added the SEVENTH kind, `nerve` ("Cranial nerves" in the Systems row), and
 * v14 made that toggle drive the 2D live section as well as the 3D scene. Both
 * are already covered where they belong:
 *   • claim 2 below is a SET equality against the caller's own `expectedKinds`
 *     (read from the shipped `ALL_KINDS`), so a Systems row that loses its seventh
 *     button fails as `hooks-incomplete` with the missing key named — which is
 *     exactly what the mutation table in `verify:area-toggles` §12 exercises;
 *   • the section/PiP parity that v14 created is a RENDERING claim, asserted by
 *     `verify:area-toggles` §11 (138 + 12 procedural parts, the twelve admitted
 *     iff `kinds.has('nerve')`, the worker's own `extractContours` slicing each of
 *     them) and by `verify:cranial-nerve-render` (47/47), not by a DOM predicate
 *     that would have to guess at pixels.
 * What this file must NOT do is acquire a claim that the 2D surface has no nerve
 * part: that was true through v13 and is false by design from v14 onwards.
 *
 * ── v17 REVIEW AMENDMENT (`review-qa`) — THE VESSEL FAMILY, AND WHY STILL NO
 *    EIGHTH CLAIM ─────────────────────────────────────────────────────────────
 * v17 added 40 granular vessel courses through the same procedural route, so the
 * 2D parity claim moved from "138 + 12" to "138 + 12 + 40 = 190 canvas metas",
 * with the worker registry split by family (24 nerve parts = 12 authored + 12
 * mirrored, 77 vessel parts = 40 authored + 37 mirrored, 3 midline courses
 * single). Those numbers live in the rendering gate — `verify:area-toggles` §11,
 * re-pointed by this review from three stale literals to sums of terms read from
 * the shipped tables — and NOT here: none of the predicates below reads a section
 * part count, so nothing in this file needed a number changed. Two consequences
 * are recorded here so the next reader does not have to re-derive them:
 *   • the vessel contours are computed but not yet PAINTED: `SectionCanvas.tsx`'s
 *     worker registry appends `registryNerveParts()` only, so the 77 ready vessel
 *     parts do not reach the worker. §11 asserts that call site as it is (it fails
 *     the moment the one-line append is added, which is what routes the fix);
 *   • `verify:cranial-nerve-render.mjs` is RED at 46/47 for the same data landing:
 *     its `partsForCanvas()` identity predates the vessel term (`found 190`,
 *     expected `138 + 12`). That file is outside this review task's write scope —
 *     the re-point is one added `+ SECTION_VESSEL_PARTS.length`.
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
 * Reading: `{ rowFraming, bootActiveLabels, bootActivePresets, storedPreset }` —
 * the header's OWN toggle rows at a CLEAN boot (`rowFraming`), the pressed preset
 * labels/ids when a preset row exists (`bootActiveLabels` / `bootActivePresets`),
 * and the stored `neuroaxis.viewPreset` value read at the same moment.
 *
 * v11 re-point (the preset row became the SHORTCUT row beneath the Areas/Systems
 * rows, and two new actions — Reset / All — joined the same `.header-presets`
 * group): `bootActivePresets` carries the `data-preset` ids of the pressed preset
 * buttons. When it is present the verdict is decided by the MACHINE HOOK
 * (`brainstem-focus`), not by text — so a third button whose label merely
 * contains "Brainstem focus" (Reset's own tooltip does) can neither fake the
 * default nor muddy the printed reading.
 *
 * v12–v12g RE-POINT (this review task). The preset row is GONE, so there is no
 * `data-preset` button left to read: `rowFraming` is the post-v12 statement of
 * the same fact, derived by `audit.mjs` from the two rows' own `aria-pressed`
 * states, which are the app's single layer state:
 *
 *     brainstem-focus  ⇔  every area pressed  ∧  every kind pressed  ∧
 *                         the region-backed Vasculature button NOT pressed
 *
 * That is exact, not approximate: `AREAS` partitions `ALL_REGIONS` minus
 * `vasculature` and `SYSTEM_REGION_BUTTONS` is that complement, so
 * "all areas pressed ∧ vasculature off" ⟺ `layers.regions === ALL_REGIONS \
 * {vasculature}` (the preset's own region set), and "all kinds pressed" ⟺
 * `layers.kinds === ALL_KINDS`. Precedence: `rowFraming` when the audit supplies
 * it, else the v11 `data-preset` hook, else the label fallback (the fixture
 * `verify:audit-checks` feeds). A `rowFraming` that is present but wrong FAILS —
 * it never falls through to the label.
 *
 * `storedPreset` is reported so the two causes can never be confused: a
 * non-default active preset that matches a stored key is a returning visitor's
 * preference (a CHECK defect if the check demanded the default), not a product
 * defect. The lane therefore boots from a clean profile — see `audit.mjs`'s
 * A0 block.
 */
export function presetFocusReading(reading) {
  const active = Array.isArray(reading?.bootActiveLabels) ? reading.bootActiveLabels : []
  const activePresets = Array.isArray(reading?.bootActivePresets) ? reading.bootActivePresets : null
  const framing = reading?.rowFraming !== null && typeof reading?.rowFraming === 'object' ? reading.rowFraming : null
  const stored = reading?.storedPreset ?? null
  const labelled = active.some((label) => /brainstem focus/i.test(String(label)))
  /**
   * The post-v12 reading: the two rows say the default framing. `buttonCount`
   * guards against the vacuous pass a header with NO buttons would otherwise get
   * ("every area pressed" is trivially true over an empty set).
   */
  const framed =
    framing === null
      ? null
      : Number(framing.buttonCount ?? 0) > 0 &&
        framing.areasAll === true &&
        framing.systemsAll === true &&
        framing.vascularRegion === false
  const hooked =
    framed !== null
      ? framed
      : activePresets !== null && activePresets.length > 0
        ? activePresets.includes('brainstem-focus')
        : labelled
  const focused = hooked && (labelled || framed === true)
  const cause =
    stored !== null && stored !== ''
      ? `active preset came from the STORED preference "${stored}" (the check must run from a clean profile)`
      : 'no stored preference — this is the code default'
  const framedDetail =
    framing === null
      ? 'rows not read'
      : `areas all on ${String(framing.areasAll)} · systems all on ${String(framing.systemsAll)} · ` +
        `Vasculature system region off ${String(framing.vascularRegion === false)} · ${String(framing.buttonCount ?? 0)} row button(s)`

  if (!focused) {
    return verdict(
      false,
      'not-brainstem-focus',
      `the boot framing is not the documented Brainstem focus default (row state: ${framedDetail}; ` +
        `pressed row labels: ${active.join(', ') || 'none'}; ` +
        `pressed data-preset: ${activePresets === null ? 'not read' : (activePresets.join(', ') || 'none')}; ${cause})`,
    )
  }
  return verdict(
    true,
    'default-brainstem-focus',
    `the boot framing is the documented Brainstem focus default (row state: ${framedDetail}` +
      `${activePresets === null || activePresets.length === 0 ? '' : `, pressed data-preset [${activePresets.join(', ')}]`}` +
      `${labelled ? `, header reports "${active.join(', ')}"` : ''}; ${cause})`,
  )
}

/**
 * The dimming half of the same check: at default framing no
 * brainstem/diencephalon/cerebellum tree row may carry the tree's `is-off`
 * class (TaxonomyTree `layerOff` = region layer off OR kind layer off).
 *
 * Reading: `{ offRows, rowsSeen, storedPreset, nerveRowsSeen?, nerveOff? }`.
 * `rowsSeen === 0` is a FAILURE, not a pass: the tree renders leaves only while
 * a subdivision is open, so a collapsed tree must not be able to make this
 * assertion pass vacuously.
 *
 * v13 (this review task) adds the optional nerve half. The twelve cranial-nerve
 * rows sit in the brainstem regions the probe already sweeps, so they were
 * covered by the generic assertion — but only incidentally, and a reader could
 * not tell whether ANY nerve row was inspected. `nerveRowsSeen` / `nerveOff`
 * make the new kind's boot state a named claim with its own numbers:
 * `DEFAULT_LAYERS.kinds` is `ALL_KINDS`, so `layers.kinds.has('nerve')` is true
 * at the documented default and the twelve rows must NOT be dim; a slice that
 * forgot to put `nerve` in the default kind set would dim them and, before this
 * claim, could only have been caught by the generic list. Both fields are
 * optional so the synthetic fixtures fed by `verify:audit-checks` stay valid —
 * when they are absent the claim is reported as informational.
 */
export function presetDimmingReading(reading) {
  const off = Array.isArray(reading?.offRows) ? reading.offRows : []
  const rowsSeen = typeof reading?.rowsSeen === 'number' ? reading.rowsSeen : -1
  const nerveRowsSeen = typeof reading?.nerveRowsSeen === 'number' ? reading.nerveRowsSeen : null
  const nerveOff = Array.isArray(reading?.nerveOff) ? reading.nerveOff : null
  const stored = reading?.storedPreset ?? null
  const cause =
    stored !== null && stored !== ''
      ? `the active preset came from the STORED preference "${stored}"`
      : 'no stored preference — this is the code default'
  const nerveDetail =
    nerveRowsSeen === null
      ? ''
      : ` · cranial-nerve rows inspected ${nerveRowsSeen}` +
        `${nerveOff === null ? '' : `, dimmed ${nerveOff.length}`}`

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
        `(the default preset must keep every non-telencephalon structure at full strength; ${cause}${nerveDetail})`,
    )
  }
  if (nerveRowsSeen !== null && nerveOff !== null && nerveOff.length > 0) {
    return verdict(
      false,
      'nerve-rows-dimmed',
      `${nerveOff.length} cranial-nerve tree row(s) are dimmed at default framing: ${nerveOff.join(', ')} ` +
        `(the v13 'nerve' kind is in ALL_KINDS, so it is layer-ON at the documented default and its twelve ` +
        `rows must not be dim; ${cause})`,
    )
  }
  return verdict(
    true,
    'no-brainstem-rows-dimmed',
    `no brainstem/diencephalon/cerebellum tree row is layer-off at default framing ` +
      `(${rowsSeen} row(s) inspected; ${cause}${nerveDetail})`,
  )
}

/* ------------------------- (4b) v11 — the two header toggle rows */

/**
 * The contract of the header's TWO toggle rows (`docs/SWARM_V11_PLAN.md` §1,
 * `PLAN.md` §1) — the control that replaced the preset row as the primary one —
 * as it stands AFTER the v12–v12g header change.
 *
 * v12–v12g moved three things, and this predicate follows them (it does not
 * relax: each claim still names a way to fail):
 *   • `vasculature` is no longer an AREA — it became the region-backed
 *     `Vasculature` button in the SYSTEMS row, carrying `data-system-region`
 *     (and `data-region`). The partition claim therefore reads
 *     `AREAS ∪ SYSTEM_REGION_BUTTONS`, which is what the store derives the
 *     latter from (`ALL_REGIONS` minus the areas' regions).
 *   • Reset / All are gone; the per-axis All modules are
 *     `areas-all-on` / `areas-all-off` / `systems-all-on` / `systems-all-off`.
 *   • The preset shortcut row (and its `data-preset` hooks) is gone; the row's
 *     surviving load-bearing members are the region-backed `Vasculature` button
 *     and the `clinical-motor` category button, both asserted below.
 *
 * Reading (every field is a plain value read from the DOM / the shipped source,
 * built by `audit.mjs`'s `HEADER_ROWS_PROBE`):
 *
 *   rows       `{ areas: { present, role, name, buttons }, systems: {…} }` — the
 *              two `role="group"` containers and their accessible group names.
 *   toggles    one entry per toggle button: `{ hook, key, text, pressed, name,
 *              tag, type }`. `hook` is `data-area` / `data-kind` /
 *              `data-system-region`; `pressed` is a REAL boolean or `null` when
 *              `aria-pressed` is missing/unreadable; `name` is `aria-label`.
 *   expected   the shipped declarations: `expectedAreas`, `expectedKinds`,
 *              `expectedSystemRegions`, `allRegions` and `areaRegions`
 *              (area id → its regions), all parsed out of `src/state/store.ts` /
 *              `src/data/load.ts` — never retyped.
 *   layers     the layer state read from the LEGEND checkboxes at the same
 *              moment: `{ regions: {…}, kinds: {…} }` (bare ids, booleans).
 *   actions    `[{ key, pressed, name }]` for `data-header-action`
 *              (the four All modules + `clinical-motor`).
 *   presets    `[{ id, label, pressed }]` for a preset shortcut row when one
 *              exists. The post-v12 header has none, so this array is empty and
 *              must stay AN EMPTY, WELL-FORMED array: a non-empty entry that is
 *              malformed still fails, and an empty array is reported as the
 *              post-v12 fact rather than as a pass.
 *
 * Returns an ARRAY of verdicts (one per claim) rather than a single verdict: the
 * contract has several independent falsifiable parts, and collapsing them would
 * make a failure unreadable. Every part prints its own numbers. Nothing is
 * skipped on a missing field: an absent row/button/hook FAILS.
 */
export function headerToggleRowsReading(reading) {
  const out = []
  const add = (okFlag, label, detail) => out.push(verdict(okFlag, label, detail))

  const rows = reading?.rows ?? {}
  const toggles = Array.isArray(reading?.toggles) ? reading.toggles : []
  const expectedAreas = Array.isArray(reading?.expectedAreas) ? reading.expectedAreas : []
  const expectedKinds = Array.isArray(reading?.expectedKinds) ? reading.expectedKinds : []
  const expectedSystemRegions = Array.isArray(reading?.expectedSystemRegions) ? reading.expectedSystemRegions : []
  const allRegions = Array.isArray(reading?.allRegions) ? reading.allRegions : []
  const areaRegions = reading?.areaRegions ?? null
  const layerRegions = reading?.layers?.regions ?? null
  const layerKinds = reading?.layers?.kinds ?? null
  const actions = Array.isArray(reading?.actions) ? reading.actions : []
  const presets = Array.isArray(reading?.presets) ? reading.presets : []
  const areaToggles = toggles.filter((t) => t?.hook === 'data-area')
  const kindToggles = toggles.filter((t) => t?.hook === 'data-kind')
  const systemRegionToggles = toggles.filter((t) => t?.hook === 'data-system-region')

  /* ---- 1. both rows exist, as labelled groups -------------------------- */
  const describeRow = (key) => {
    const row = rows[key] ?? {}
    return `${key}: ${row.present === true ? 'present' : 'MISSING'} role=${JSON.stringify(String(row.role ?? ''))} ` +
      `aria-label=${JSON.stringify(String(row.name ?? ''))} buttons=${Number(row.buttons ?? -1)}`
  }
  const rowsOk =
    rows.areas?.present === true && rows.systems?.present === true &&
    rows.areas?.role === 'group' && rows.systems?.role === 'group' &&
    String(rows.areas?.name ?? '').length > 0 && String(rows.systems?.name ?? '').length > 0 &&
    String(rows.areas?.name ?? '') !== String(rows.systems?.name ?? '')
  add(
    rowsOk,
    rowsOk ? 'two-toggle-rows' : 'rows-missing-or-unlabelled',
    `the header exposes the two v11 toggle rows as distinct labelled groups (${describeRow('areas')} · ${describeRow('systems')})`,
  )

  /* ---- 2. the machine hooks, total over the shipped sets ---------------- */
  const areaKeys = areaToggles.map((t) => String(t.key))
  const kindKeys = kindToggles.map((t) => String(t.key))
  const systemRegionKeys = systemRegionToggles.map((t) => String(t.key))
  /* v19 — the Systems row renders one `data-kind` button per kind EXCEPT
     `vessel`: its 53 records are exactly the `vasculature` region's 53 (verified
     both directions), so the row keeps ONE button for the arterial system — the
     region-backed "Vasculature" button, which carries both layers (Header's
     toggleVasculature). The hooks rule is therefore total iff every kind but
     `vessel` has exactly one data-kind toggle AND the `vasculature`
     system-region toggle exists. */
  const renderedKinds = expectedKinds.filter((kind) => kind !== 'vessel')
  const keysOk =
    expectedAreas.length > 0 && expectedKinds.length > 0 && expectedSystemRegions.length > 0 &&
    areaKeys.length === expectedAreas.length &&
    expectedAreas.every((id) => areaKeys.filter((key) => key === id).length === 1) &&
    kindKeys.length === renderedKinds.length &&
    renderedKinds.every((kind) => kindKeys.filter((key) => key === kind).length === 1) &&
    systemRegionKeys.length === expectedSystemRegions.length &&
    expectedSystemRegions.every((region) => systemRegionKeys.filter((key) => key === region).length === 1)
  add(
    keysOk,
    keysOk ? 'hooks-total' : 'hooks-incomplete',
    `every area, kind and region-backed system the app declares has exactly one toggle with its machine hook ` +
      `(areas ${areaKeys.join(', ') || 'none'} vs ${expectedAreas.join(', ') || 'none'}; ` +
      `systems ${kindKeys.join(', ') || 'none'} vs ${renderedKinds.join(', ') || 'none'} — "vessel" is covered by the system-region button; ` +
      `system regions ${systemRegionKeys.join(', ') || 'none'} vs ${expectedSystemRegions.join(', ') || 'none'})`,
  )

  /* ---- 3. real buttons, aria-pressed, accessible names (2.5.3) ---------- */
  const malformed = toggles.filter(
    (t) => t?.tag !== 'BUTTON' || t?.type !== 'button' || typeof t?.pressed !== 'boolean' ||
      String(t?.name ?? '').length === 0 || !String(t?.name ?? '').startsWith(String(t?.text ?? '\u0000')),
  )
  add(
    malformed.length === 0 && toggles.length > 0,
    malformed.length === 0 ? 'toggle-accessible-contract' : 'toggle-contract-broken',
    `${toggles.length} toggle button(s): every one is a <button type="button"> with a real boolean ` +
      `aria-pressed and an accessible name that STARTS WITH its visible text (WCAG 2.5.3)` +
      (malformed.length === 0
        ? ` — e.g. "${String(toggles[0]?.name ?? '')}"`
        : ` — broken: ${JSON.stringify(malformed.slice(0, 3))}`),
  )
  const names = toggles.map((t) => String(t?.name ?? ''))
  const namesOk = names.length > 0 && new Set(names).size === names.length
  add(
    namesOk,
    namesOk ? 'names-distinct' : 'names-collide',
    `the ${names.length} accessible names are distinct (a screen reader cannot confuse two slices): ` +
      `${new Set(names).size} unique`,
  )

  /* ---- 4. the partitions (areas ∪ region-backed systems over ALL_REGIONS) */
  const claims = new Map()
  for (const area of expectedAreas) {
    const regions = Array.isArray(areaRegions?.[area]) ? areaRegions[area] : null
    if (regions === null) continue
    for (const region of regions) claims.set(region, [...(claims.get(region) ?? []), area])
  }
  for (const region of expectedSystemRegions) {
    claims.set(region, [...(claims.get(region) ?? []), `system-region:${region}`])
  }
  const unclaimed = allRegions.filter((region) => !claims.has(region))
  const doubleClaimed = [...claims.entries()].filter(([, owners]) => owners.length !== 1)
  const partitionOk =
    allRegions.length > 0 && areaRegions !== null && expectedSystemRegions.length > 0 &&
    unclaimed.length === 0 && doubleClaimed.length === 0
  add(
    partitionOk,
    partitionOk ? 'areas-partition-total-disjoint' : 'areas-partition-broken',
    `the ${expectedAreas.length} area buttons + the ${expectedSystemRegions.length} region-backed system ` +
      `button(s) partition ALL_REGIONS exactly: ${allRegions.length} region(s) ` +
      `${expectedAreas.map((id) => `${id}→[${(areaRegions?.[id] ?? []).join('+') || '?'}]`).join(' · ')}` +
      `${expectedSystemRegions.length === 0 ? '' : ` · ${expectedSystemRegions.map((region) => `system:${region}`).join(' · ')}`}` +
      (partitionOk ? '' : ` — unclaimed ${JSON.stringify(unclaimed)}, multiply claimed ${JSON.stringify(doubleClaimed)}`),
  )
  const kindsTotal =
    expectedKinds.length > 0 && kindKeys.length === renderedKinds.length &&
    renderedKinds.every((kind) => kindKeys.includes(kind)) &&
    systemRegionKeys.includes('vasculature')
  add(
    kindsTotal,
    kindsTotal ? 'systems-partition-total' : 'systems-partition-broken',
    `the ${kindKeys.length} kind buttons cover ALL_KINDS minus "vessel" (${renderedKinds.join(', ')}) and the ` +
      `${expectedSystemRegions.length} region-backed button(s) carry "vessel" (${systemRegionKeys.join(', ') || 'none'})`,
  )

  /* ---- 5. pressed ⇔ the layer sets the legend reads --------------------- */
  const areaMismatch = areaToggles.filter((t) => {
    const regions = Array.isArray(areaRegions?.[String(t.key)]) ? areaRegions[String(t.key)] : null
    if (regions === null || layerRegions === null) return true
    return t.pressed !== regions.every((region) => layerRegions[region] === true)
  })
  const kindMismatch = kindToggles.filter((t) => {
    if (layerKinds === null) return true
    return t.pressed !== (layerKinds[String(t.key)] === true)
  })
  const systemRegionMismatch = systemRegionToggles.filter((t) => {
    if (layerRegions === null) return true
    return t.pressed !== (layerRegions[String(t.key)] === true)
  })
  const pressedOk =
    layerRegions !== null && layerKinds !== null && areaToggles.length > 0 &&
    kindToggles.length > 0 && systemRegionToggles.length > 0 &&
    areaMismatch.length === 0 && kindMismatch.length === 0 && systemRegionMismatch.length === 0
  add(
    pressedOk,
    pressedOk ? 'pressed-matches-layers' : 'pressed-disagrees-with-layers',
    `every button's aria-pressed is the SAME fact as the layer set the legend reads ` +
      `(areas ${areaToggles.map((t) => `${t.key}=${t.pressed}`).join(', ')}; ` +
      `systems ${kindToggles.map((t) => `${t.key}=${t.pressed}`).join(', ')}; ` +
      `system regions ${systemRegionToggles.map((t) => `${t.key}=${t.pressed}`).join(', ')}; ` +
      `legend regions ${JSON.stringify(layerRegions ?? null)}, kinds ${JSON.stringify(layerKinds ?? null)})` +
      (pressedOk
        ? ''
        : ` — disagreeing: ${JSON.stringify(
            [...areaMismatch, ...kindMismatch, ...systemRegionMismatch].map((t) => t.key),
          )}`),
  )

  /* ---- 6. the two per-axis All modules are wired to their own axis -------
   * v12g RE-POINT. This claim used to read "the Reset action is pressed exactly
   * when the preset row reports the documented default". Reset no longer exists
   * (v12 removed it with the preset row); the claim it made — the header can
   * reach "everything on" and "everything off" per axis, and says so in its own
   * pressed state — is now made about the four module buttons, and it is
   * falsifiable in both directions: a module whose slice is fully on must be
   * pressed, and one whose slice is fully off must be pressed on the OFF button
   * instead. A button that is always pressed, or one wired to the wrong axis,
   * fails. */
  const MODULES = ['areas-all-on', 'areas-all-off', 'systems-all-on', 'systems-all-off']
  const moduleOf = (key) => actions.find((action) => String(action?.key) === key) ?? null
  const moduleMissing = MODULES.filter((key) => moduleOf(key) === null)
  const moduleMalformed = MODULES.map(moduleOf).filter(
    (action) => action !== null && typeof action?.pressed !== 'boolean',
  )
  /* The two modules' slices are what `Header.tsx` computes: the areas module owns
   * the AREAS' regions alone, the systems module owns `SYSTEM_REGION_BUTTONS` PLUS
   * `ALL_KINDS` — so at the documented default the systems module reads UNPRESSED
   * (the vascular region is off), which is exactly the state that makes it
   * falsifiable: an "always pressed" button fails here. */
  const allAreasOn = areaToggles.length > 0 && areaToggles.every((t) => t.pressed === true)
  const allAreasOff = areaToggles.length > 0 && areaToggles.every((t) => t.pressed === false)
  const allSystemsOn =
    kindToggles.length > 0 && systemRegionToggles.length > 0 &&
    kindToggles.every((t) => t.pressed === true) &&
    systemRegionToggles.every((t) => t.pressed === true)
  const allSystemsOff =
    kindToggles.length > 0 && systemRegionToggles.length > 0 &&
    kindToggles.every((t) => t.pressed === false) &&
    systemRegionToggles.every((t) => t.pressed === false)
  const modulesOk =
    moduleMissing.length === 0 && moduleMalformed.length === 0 &&
    moduleOf('areas-all-on')?.pressed === allAreasOn &&
    moduleOf('areas-all-off')?.pressed === allAreasOff &&
    moduleOf('systems-all-on')?.pressed === allSystemsOn &&
    moduleOf('systems-all-off')?.pressed === allSystemsOff
  add(
    modulesOk,
    modulesOk ? 'all-modules-bound-to-their-axis' : 'all-modules-not-bound',
    `the four per-axis All module buttons report the axis state the rows read ` +
      `(areas-all-on=${JSON.stringify(moduleOf('areas-all-on')?.pressed ?? null)} vs areas all pressed ${allAreasOn}; ` +
      `areas-all-off=${JSON.stringify(moduleOf('areas-all-off')?.pressed ?? null)} vs areas all unpressed ${allAreasOff}; ` +
      `systems-all-on=${JSON.stringify(moduleOf('systems-all-on')?.pressed ?? null)} vs kinds+system-regions all pressed ${allSystemsOn}; ` +
      `systems-all-off=${JSON.stringify(moduleOf('systems-all-off')?.pressed ?? null)} vs kinds+system-regions all unpressed ${allSystemsOff})` +
      (modulesOk ? '' : ` — missing ${JSON.stringify(moduleMissing)}`),
  )

  /* ---- 7. the Systems row's non-kind members survive --------------------
   * v12 RE-POINT + v13 extension. This claim used to be "the preset shortcut row
   * is still rendered as real aria-pressed buttons (9)". The row was removed by
   * design in v12, so asserting it would demand the product be bent back. The
   * load-bearing part of the old claim is kept and re-aimed at the two controls
   * that now carry those two jobs inside the Systems row: the region-backed
   * `Vasculature` button (the vascular region is reachable) and the
   * `clinical-motor` category button (the one framing that is not a single area
   * or kind stays reachable). A `presets` array that is present and NON-empty is
   * still validated as well-formed, so a half-restored preset row fails. */
  const vascular = systemRegionToggles.find((t) => String(t.key) === 'vasculature') ?? null
  const clinical = actions.find((action) => String(action?.key) === 'clinical-motor') ?? null
  const wellFormedPresets = presets.every(
    (preset) => String(preset?.id ?? '').length > 0 && String(preset?.label ?? '').length > 0 &&
      typeof preset?.pressed === 'boolean',
  )
  const rowMembersOk =
    vascular !== null && typeof vascular.pressed === 'boolean' &&
    String(vascular.name ?? '').length > 0 && String(vascular.text ?? '').length > 0 &&
    clinical !== null && typeof clinical.pressed === 'boolean' &&
    String(clinical.name ?? '').length > 0 && wellFormedPresets
  add(
    rowMembersOk,
    rowMembersOk ? 'vascular-and-clinical-motor-reachable' : 'vascular-or-clinical-motor-missing',
    `the Systems row still reaches the vascular region and the clinical-motor framing through its own ` +
      `controls (Vasculature system-region button ${vascular === null ? 'MISSING' : `"${String(vascular.name)}" pressed=${JSON.stringify(vascular.pressed)}`}; ` +
      `Clinical motor action ${clinical === null ? 'MISSING' : `"${String(clinical.name)}" pressed=${JSON.stringify(clinical.pressed)}`}); ` +
      `preset shortcuts rendered: ${presets.length}${presets.length === 0 ? ' (post-v12: the row is gone by design, and this claim now covers its two surviving jobs)' : ''}`,
  )

  /* ---- 8. no ambiguous label for a hook-free click ---------------------- */
  /* The v11 change added a SECOND header button reading exactly `Nuclei` (the
   * preset of that name and the `nucleus` system toggle), which is precisely the
   * class of collision that makes a text-based click silently address a different
   * control. v12 removed the preset, so that particular collision is gone — but
   * the rule is kept, and it is now the assertion that pins the v12 arrangement:
   * the `Vasculature` text (the v8 label three audit steps used to click by exact
   * text) is carried by exactly ONE control, and it carries a machine hook. */
  const headerButtons = Array.isArray(reading?.headerButtons) ? reading.headerButtons : []
  const byText = new Map()
  for (const button of headerButtons) {
    const text = String(button?.text ?? '')
    if (text.length === 0) continue
    byText.set(text, [...(byText.get(text) ?? []), String(button?.hook ?? '')])
  }
  const ambiguous = [...byText.entries()].filter(
    ([, hooks]) => hooks.length > 1 && hooks.some((hook) => hook.length === 0),
  )
  const vasculature = [...byText.entries()].filter(([text]) => text === 'Vasculature')
  const vasculatureOk =
    vasculature.length <= 1 && (vasculature.length === 0 || vasculature[0][1][0].length > 0)
  const labelOk = headerButtons.length > 0 && ambiguous.length === 0 && vasculatureOk
  add(
    labelOk,
    labelOk ? 'labels-unambiguous' : 'ambiguous-control-labels',
    `of the ${headerButtons.length} header button(s), no exact label is shared by a hooked and an unhooked control ` +
      `(shared labels: ${[...byText.entries()].filter(([, hooks]) => hooks.length > 1).map(([text, hooks]) => `"${text}"=${hooks.map((hook) => hook || 'NO HOOK').join('/')}`).join(', ') || 'none'}), ` +
      `and the exact text "Vasculature" (the v8 preset label) is carried by ` +
      `${vasculature.length} control(s)${vasculature.length === 0 ? '' : ` (${vasculature[0][1].map((hook) => hook || 'NO HOOK').join('/')})`}`,
  )

  return out
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
