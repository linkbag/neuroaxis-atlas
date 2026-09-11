# PLAN — NeuroAxis v7 closure (run `mtwh4t68-t8gm`) — architect review & refinement

Status: **refined plan, ready to dispatch.** Reviewer: `architect-review` (this task).
Tree reviewed: `b5ab6f3` + 3 uncommitted docs edits (all additive, see §2.7).
Repository: `D:\Startup projects\3DNeuroanatamoy` (Windows, Node v24.18.0). All paths below are relative to it.

---

## 1. What this run must close

The telencephalon is committed (`d1cefef → 2681d20 → 8ab1b47 → b5ab6f3`) but the run's QA never
executed and the orchestrator's 56-check browser audit left 10 failures. The closure must fix the
five real gaps, fix the two audit-artifact checks, re-run every gate, sanity-check the telencephalon
itself, and commit — without moving anything below `y = +45`.

## 2. Verification of the proposal against the repository (what I checked, what I found)

Every claim below was produced in this session from the tree; no claim is copied from the proposal.

### 2.1 The gate set is real and Node gates are green — verified

`package.json` scripts (verified): `validate`, `check`, `build`, `verify:pipeline`, `verify:plane`,
`verify:browser`, `verify:acceptance`, `verify:audit` — exactly the "seven verifiers" + `check`.
Baseline measured **on this tree, by me**:

| Gate | Command | Measured now |
| --- | --- | --- |
| Data integrity | `npm run validate` | **PASS — 0 errors, 0 warnings** · 17 levels · 183 registry entries · 160 structures · 23 tracts · 26 syndromes · 15 plates |
| Types | `npm run check` | **exit 0** |
| Build | `npm run build` | **exit 0** — `index-*.js` 1 120.53 kB raw / 252.91 kB gzip + `vendor-three` 1 206.81 kB / 354.64 kB |
| Section pipeline | `npm run verify:pipeline` | **PASS** — 106/106 parts · 570 096 tris · 329 loops across 13 planes · 0 problems |
| Plane transform | `npm run verify:plane` | **PASS** — 10 827 assertions |
| Budgets | `node scripts/build-anatomy-geometry.mjs --manifest` | **PASS** — scene 570 096 / ≤800 000 tris · GLB 13.12 MiB / ≤14 MiB · imaging 8.71 MiB / ≤10 MiB |

So the five failing items are runtime/UX defects the Node lane cannot see — consistent with the audit.

### 2.2 BLOCKER IN PROPOSAL — the browser lane cannot run on this machine

**Measured, twice, by me:** Chrome cannot start in this sandbox.

* `npm run verify:audit` → `exit 4`, *"environment unusable — no check was run"*, Chrome exiting
  immediately with `crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)` and
  `platform_channel.cc:108 Check failed: . : Access is denied. (0x5)`.
* An independent probe with the sandbox-safe flag set (`--no-sandbox --disable-gpu-sandbox
  --disable-crash-reporter --disable-breakpad --disable-dev-shm-usage`, fresh profile, port 9377)
  also failed: DevTools never answered.
* Two Chrome binaries' worth of processes exist in the sandbox but are unreachable; nothing listens on
  9355/9377.

This is **not new**: `docs/QUALITY_PLAN.md` §7.1 already records `verify:audit` as *"exit 4 —
environment unusable, no check was run"*, and §8.1 records five Chrome launch variants failing
identically. A dev server **is** already answering `http://localhost:5173` (HTTP 200, 1 622 B) from an
earlier/parallel agent, so the audit gets past the server step and dies at browser launch.

**Consequence the proposal does not admit:** no task in this run can produce a `verify:audit`
pass/fail count, and *"all seven verifiers green with verify:audit at 0 failures"* is **not
achievable in this sandbox** — not by any amount of work in the DAG. Claiming otherwise would be
fabrication, and `exit 4` must never be reported as a product failure (the harness's own documented
contract: `EXIT.BROWSER_UNAVAILABLE`, "a check that cannot run must never be reported as a failure —
that is what made two integration runs look like product failures").

**The refinement (and the precedent the repo already set):** the closure is verified by a **two-tier
evidence model**, and every report states the tier.

* **Tier 1 — executable here, binding:** the five Node gates + `node scripts/verify/audit-checks.test.mjs`
  (new, §4.1) + `node scripts/verify/boundary-contract.mjs` + `node scripts/verify/a11y-contract.mjs`
  + the anatomy/imaging budget CLIs. These are the gates that must pass and that must be *mutation-proven*.
* **Tier 2 — not executable here:** `verify:audit`, `verify:browser`, `verify:acceptance`. Reported as
  **command + exit code + reason**, never as "pass". Their assertions are mirrored into Tier-1
  surrogate checks that assert the same load-bearing facts *out of the shipped sources and the shipped
  pure modules* — the exact method `QUALITY_PLAN.md` §8.1 already used ("a scratch harness asserts the
  20 load-bearing facts … mutation-tested"), which the v6 QA reviewer used rather than claim the
  browser test it could not run.

I am **not** asking any task to weaken the audit; §4.1 makes the new/changed audit predicates
*extractable and executable under Node*, so the guidance gets stronger, not weaker, while staying
honest about where the evidence came from.

### 2.3 Root cause of gap (2) — the PostFX `alpha` crash (established statically)

`FAIL 3 unexpected error(s) … TypeError: Cannot read properties of null (reading 'alpha')` at
`PostFX.tsx:19` (a *comment* line — the frame is the caller's frame in the R3F render loop):

* `src/components/viewer3d/PostFX.tsx:44` mounts `<EffectComposer multisampling={0} enableNormalPass>`.
* `node_modules/postprocessing/build/index.js:864` (`EffectComposer.setRenderer`) and `:1002`
  (`addPass`) both do `renderer.getContext().getContextAttributes().alpha`.
* Per the WebGL spec, `getContextAttributes()` returns **`null`** once the context is lost — the
  "lost" state is observable through `isContextLost()` and the attribute query goes null. Hence
  `TypeError … reading 'alpha'` **exactly while the context is lost**, contained by the boundary but
  logged, which is the audit's failure.
* `Viewer3D.tsx:735` renders `<PostFX enabled={quality === 'high'} quality={quality} />` with **no
  `contextLost` guard**, although the loss state (`contextPhase`) is already in the same component
  (`:587`) and already exposed to `<CanvasContextRecovery contextLost={contextPhase !== null}>` (`:720`).

So gap (2)'s fix is a one-line-shaped guard plus a restart path — as the proposal guessed — and the
mechanism is now proven rather than plausible. §4.1 requires the guard to be *falsifiable* under Node
(see §4.1 items 4–5), because the exact composer throw cannot be reproduced without a browser.

### 2.4 Gap (1) — the overlay: the wiring is present, so the failure needs a fail-stop diagnostic

`Viewer3D.tsx` already has everything the audit looks for: listeners on the canvas element
(`:636-658`, with the mandatory `event.preventDefault()`), `setContextPhase('lost')` (`:644`), the
`div.viewer-context-lost[role="alert"][data-context-lost={phase}]` overlay (`:298-340`), mounted
**only** while a loss is active (`:792-794`), a `20 s` terminal `'dead'` state (`:666-670`), and the
PiP's own path (`SectionPiP.tsx:852-856`, `:1467`).

What is *not* present is any reason to believe the chain is unbroken in a browser. The plausible
mechanisms, in order of likelihood, all of which a browser would settle in one run:

1. the `alpha` crash (§2.3) destabilises the R3F canvas tree at the same moment, so the parent
   `TransparentBoundary label="3D viewer"` (`App.tsx:215-217`) unmounts `Viewer3D` — taking the
   overlay with it — and the audit's `[data-context-lost]` query legitimately finds nothing;
2. React never re-renders because the throw escapes the R3F render loop and React's own state is
   batching/erroring at that point;
3. the audit's `canvas.getContext('webgl2')` returns a *different* context object than the R3F
   renderer's, so `loseContext()` is real and `isContextLost()` is true on it (as the audit reports),
   while the R3F canvas element the listener is bound to is a different element.

**The refinement:** the proposal tells the task to "find why … and fix it" with no way to observe the
mechanism here. I require instead (a) the `alpha` guard first, because it is a proven defect and it is
mechanism (1)'s cause; (b) a **fail-stop diagnostic** in the audit's context-loss block that captures
the app's actual state at the moment of failure — `data-context-lost` presence, `[data-panel-error]`
presence/value (so a boundary swallow is distinguishable from a missing overlay), canvas element
identity, `isContextLost()` on the *renderer's* context, and the loss-phase DOM text — so that on any
machine where the audit *can* run, the failure is self-explaining instead of a guess; (c) a Node
surrogate that asserts the load-bearing facts out of the shipped sources (§4.1 items 1–3), mutation-proven.

### 2.5 Gap (5) — `?panelfail` is genuinely broken, and I found the exact defect

`src/components/section/SectionErrorBoundary.tsx:199-215`:

```
if (armed !== '' && armed === name) {
  return (<>
    <span hidden data-panel-probe={name} />
    <PanelFailureProbe name={name} />   // throws during render
  </>)
}
```

The marker is a **sibling of a component that throws in the same render pass**, so React discards that
subtree before committing any DOM — the marker can never appear. That is precisely why the audit
reports `?panelfail armed 0 boundaries` (`audit.mjs:1100-1104`) *and* `card=null` with
`panelfail armed=not armed` (`:1035-1062`): the audit's own positive signal is unproducible, and the
card's absence is then indistinguishable from "the hook never armed". The failure card itself does
render (the boundary's `error !== null` branch), so the *containment* claim is unproven rather than disproven.

**Refinement:** the probe must be observable **after** the boundary transitions to its failure state —
i.e. `data-panel-probe` belongs on the failure card (`panelErrorCard`, `:129-175`), rendered while
`error !== null` and `panelFailTarget() === name`. Then `probes === 1` proves arming *and* containment
together, and `card=<surface>` proves the right boundary caught it. The same signal must also be
covered by the Node lane (`boundary-contract.mjs`, which already executes this file's real state
transition under Node) so that the demonstration is proven with or without Chrome.

### 2.6 Gap (4) — the default preset is right in code; the CHECK is the defect, plus one real data/preset risk

Verified in code:

* `store.ts:485-487` `defaultLayers()` returns `layersFromPreset('brainstem-focus')`;
  `store.ts:533-549` throws at module load if the default does not report `brainstem-focus` or if it
  hides any non-telencephalon record. The default is **correct**.
* `store.ts:506-518` `initialLayers()` lets a **persisted** `neuroaxis.viewPreset` win over the
  default ("a returning visitor's own choice is never silently overridden").
* `scripts/verify/audit.mjs:48` uses a **persistent** profile
  `.plate-scratch/chrome-profile-audit` (`.gitignore`d, never cleaned), and nothing in the audit
  clears `localStorage` before the L1 check (`:639-663`) — which runs on the *first* page of the run.
  A stale `neuroaxis.viewPreset` from the previous run therefore decides L1. **This is the check
  defect the proposal suspected, and it is confirmed by code path, not inferred from the symptom.**
* The tree dims exactly the rows whose region or kind layer is off
  (`TaxonomyTree.tsx:23-24,39,50`; `.tree-leaf-row.is-off{opacity:.4}`) — so "2 rows dimmed" is a
  direct read-back of the *active* preset's layer set, which is another reason a stale preset explains
  both L1 failures with one cause. **I could not fully separate the two L1 failures without a
  browser**, so §4.1 item 10 makes the diagnostic mandatory and the report must say which cause applied.

**A second, genuine risk I found while checking this** (not in the proposal): `store.ts:389-404`
builds `CORTEX_PRESET_IDS` as `telSubdivisionIds('Cerebral cortex') + telSubdivisionIds('Telencephalic
white matter') + telSubdivisionIds('Lateral ventricles')`, and `telSubdivisionIds` (`:378-382`) filters
**on `subdivision` alone, never on `region`**. The two rows the audit names as dimmed —
`ctx-thalamus-envelope` ("Thalamus (context envelope)") and `ctx-internal-medullary-lamina` ("Internal
medullary lamina"), both `src/data/taxonomy.json:16-17` — are **diencephalon / Thalamus** records. If
either is picked up by a subdivision-name collision, `Brainstem focus` hides a diencephalon record,
which is exactly what `TELENCEPHALON_PLAN §5/§9` forbids. The fix must add a **region guard** so a
preset can only ever hide `region === 'telencephalon'` records; the existing boot assertion only checks
the *default*, so presets can currently drift into hiding brainstem-family records.

### 2.7 Gaps (3) and (6) — the CT coverage honesty already exists; the check needs to be self-diagnosing

Verified present and wired:

* `imageLayers.ts:384-398` `ctCoverageStatement(axis, value)` returns text containing the measured
  limit (`≈ 36.25 au`) **and** the words "MRI is the modality of record" — exactly the two patterns the
  audit looks for (`audit.mjs:817`), gated on `beyondCtSourceCoverage()` (y-axis only, `value > limit`).
* `PlatesTab.tsx:422-425` renders it into `.section-alignment-note.is-ct-coverage` (`:754-758`) when
  `sectionUnderlay.kind` is `ct` **or** `auto`.
* The manifest really declares the limit: `src/assets/imaging/ct-manifest.json`
  `intensity.sourceCoverage.superiorMostDataYAu = 36.25`, `fractionInsideFov = 0.6426`; stations above
  it are in-grid with `hasData:false` (47.5 / 57.5 / 67.5 / 77.5 au) — the check's own note and hint
  were both `""` in the audit, i.e. **the element was absent, not empty**.

The note is a pure function of `(sectionAxis, clip[sectionAxis], kind)`. `planeValue = clip[sectionAxis]`
(`PlatesTab.tsx:338`). The audit sets the transverse slider to 58 without ever asserting that the live
section is pinned to the **y** axis (which `SectionSliderBar.tsx:87-89` pins only on
pointer/focus, and `PlatesTab` and `SectionCanvas` both read the store's `sectionAxis`) and without
reporting either number, so an axis/kind mismatch and a genuine product defect produce the same
one-word failure. **One of them is a check defect and one is a product defect, and the current check
cannot tell them apart** — which is why the proposal's "make it coverage-aware" is directionally right
but insufficient.

**Refinement (binding):** the check must first *pin* the axis and state (click/focus the transverse
slider, assert `sectionAxis === 'y'` through the axis button's `aria-pressed`), then report
`{axis, planeValue, kind, noteText, notePresent}`, and only then assert. If the note is genuinely
absent at a proven y > 36.25 plane with CT requested, that is a **product defect** and must be fixed;
otherwise it is a **check defect** and must be fixed as one. The final report must state which it was,
with the captured numbers. `TELENCEPHALON_PLAN §9`'s "MRI/CT underlays cover the hemispheres at any
plane" stays satisfiable through **MRI**, which covers to +85; the CT half is a *measured source
limit*, so the honest state (MRI is the modality of record above 36.25) is the correct assertion, not a
license to weaken the check. **This is a deliberate, documented deviation from the plan's letter**, and
the README/docs must state it as a limitation.

### 2.8 Concurrency, scopes and other facts that change the DAG

* **Three browser-lane scripts, three debug ports, three profiles** (`audit` 9355 /
  `.plate-scratch/chrome-profile-audit`, `browser-probe` 9333 / `chrome-profile`, `browser-acceptance`
  9344 / `chrome-profile-accept`) but **one shared dev port** (5173, `--strictPort` via
  `lib/startServer.mjs:212-219`). Consequence: pointing the audit at a second port is supported
  (`audit.mjs:39` takes a URL) and each script reuses `localhost:5173` — so the shared tree must not be
  mutated while a lane is running, and two lanes must not be started at the same instant.
* `.plate-scratch/` is gitignored, so a v7 closure can add new profiles there freely (and **should**:
  that is how the stale-preference defect is eliminated).
* `dist/` is gitignored; `npm run build` (which I ran) leaves no untracked noise.
* 3 uncommitted docs edits exist and are **purely additive** (`docs/CONTENT_INVENTORY.md` +45,
  `docs/QA_CHANGELOG.md` +96, `docs/QUALITY_PLAN.md` +223). The integrator owns them and must commit
  them with attribution; nothing in this run may revert them.
* `PLAN.md` and `.plate-scratch/` are gitignored; **this** plan file
  (`PLAN-run-mtwh4t68-t8gm.md`) is *not*, so `git add -A` in the integration task will stage it. That
  is acceptable (it is the run's plan-of-record in the workspace root) but must be a conscious choice —
  see §4.3 step 6.
* Untracked verify tooling that is **not** wired to npm but that the closure should keep green:
  `scripts/verify/boundary-contract.mjs` (22 checks, Node-only), `scripts/verify/a11y-contract.mjs`
  (38 checks), `scripts/build-anatomy-geometry.mjs --manifest`, `scripts/verify-imaging-v4.mjs`,
  `scripts/verify-imaging-v4b.mjs`. The proposal never mentions them; they are the strongest
  browser-free evidence available here and are promoted into the gate table (§5).

---

## 3. Refined task DAG (5 tasks, one run)

```text
  ┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
  │ 1 v7c-gaps        │        │ 2 v7c-qa-bite     │        │ 3 v7c-node-proof  │
  │ builder           │        │ reviewer          │        │ builder           │
  │ product fixes +   │        │ mutation proof    │        │ Node surrogates + │
  │ audit determinism │        │ of the gates      │        │ budget/gate record│
  └─────────┬─────────┘        └─────────┬─────────┘        └─────────┬─────────┘
            │ blockedBy: none           │ blockedBy: none           │ blockedBy: 1
            └───────────────┬───────────┴───────────────────────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 4 v7c-integration   │  blockedBy: 1, 2, 3
                 │ integrator          │  final acceptance, browser sanity (best effort),
                 │ commit + README     │  budgets, regression, commit
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ 5 v7c-verdict       │  blockedBy: 4
                 │ reviewer            │  independent verdict on the frozen commit
                 └─────────────────────┘
```

**Deviations from the proposal's DAG, and why**

1. **The proposal's 3 tasks become 5.** Its `v7c-integration` bundled *integration* (fix + commit) and
   *independent QA* (space integrity, ribbon sanity, mutation proof, verdict) into one owner, while its
   `v7c-qa` was declared parallel to the builder that rewrites the very files it must audit. Both are
   integrity failures: an owner cannot independently verify its own commit, and a mutation of a file
   another agent is editing is not a measurement. The split makes the mutation proof (task 2) and the
   surrogate proof (task 3) run **while task 1 is still writing**, then freezes for byte-identical
   final verification at task 5.
2. **Every parallel pair has disjoint write scopes** (§4), so the three-wide concurrency is safe. The
   proposal's `v7c-gaps` and `v7c-qa` both claimed `src/` and `scripts/` — that is a DAG defect.
3. **No `blockedBy` is decorative.** Task 3 genuinely consumes task 1's guard/predicate shape; task 4
   must not start until the audit harness is frozen (task 1), the bite proof is done (task 2) and the
   surrogate gates exist (task 3); task 5 must not start until task 4's commit exists.
4. **Consolidation:** there is only this ONE run — no work is split across runs. The proposal's
   objective, audit checklist and constraints are preserved verbatim in intent; only ownership, order
   and the honesty of the gate evidence changed.

---

## 4. Task briefs

### 4.1 `v7c-gaps` (builder) — product fixes + audit determinism

**Write scope (exclusive):** `src/components/viewer3d/Viewer3D.tsx`, `src/components/viewer3d/PostFX.tsx`,
`src/components/viewer3d/SceneLayers.tsx`, `src/components/PlatesTab.tsx`,
`src/components/section/SectionErrorBoundary.tsx`, `src/components/section/imageLayers.ts`,
`src/components/TaxonomyTree.tsx`, `src/state/store.ts`, `src/styles/**`,
`scripts/verify/audit.mjs`, `scripts/verify/checks.mjs` (**new**),
`scripts/verify/lib/startServer.mjs` (only if a profile/CLI knob is needed).

**Must not touch:** `README.md`, `docs/**` (task 4 owns them), `scripts/verify/*bite*.mjs`,
`scripts/verify/boundary-contract.mjs` (task 2 owns it), `scripts/verify/audit-checks.test.mjs`
(task 3 owns it). No new npm dependency.

Work items, each with the acceptance test that must pass **before** the task finishes:

1. **PostFX guard (gap 2).** Render/suspend `PostFX` only while the context is alive
   (`contextPhase === null`) and remount after restore; do not unmount the rest of the scene. Keep
   `enabled={quality === 'high'}` semantics. Add a header note naming the real cause
   (`postprocessing` build `:864`/`:1002` reading `getContextAttributes().alpha` on a lost context).
   *Accept:* `npm run check` exit 0; `npm run build` exit 0; the environment/high-quality path still
   renders (no `balanced`-only regression — `quality === 'high'` must still mount the composer when the
   context is healthy).
2. **Context-loss overlay (gap 1).** Establish the mechanism from the code path in §2.4 (item 1 is the
   leading candidate and item 1's guard may itself fix it) and make the chain robust: the loss state
   must survive a throw inside the canvas subtree, and the overlay must be reachable while lost. If
   `Viewer3D` can be unmounted by the `3D viewer` boundary during a loss, lift the loss state (or the
   overlay) so it is not hostage to the canvas subtree. Keep the existing `role="alert"`,
   `data-context-lost="lost"|"dead"`, Restore + Reload controls, `preventDefault()`, and the 20 s
   terminal state. *Accept:* the surrogate in task 3's `audit-checks.test.mjs` asserts the attribute,
   the phase transitions and the "mounted only while lost" rule out of the shipped sources, and passes.
3. **Audit determinism (gap 4a).** Give the audit a **clean profile per run** — a per-run profile
   directory (e.g. `.plate-scratch/chrome-profile-audit-<pid>` or a cleaned one) and/or an explicit
   `localStorage` clear before the first navigation, plus a hard assertion that the run starts from the
   default preset at boot. Never delete a user profile outside `.plate-scratch/`. *Accept:* running the
   audit twice back-to-back cannot flip L1 (stated as a design guarantee in the audit's header note,
   with the mechanism named).
4. **Preset region guard (gap 4b).** Make it impossible for a preset to hide a non-telencephalon record
   (§2.6): `telSubdivisionIds`/`CORTEX_PRESET_IDS` must filter on `region === 'telencephalon'`
   **and** subdivision, and the boot assertion must cover *every* preset (not only the default). State
   in the commit/report which of the two audit-named rows actually was hidden and why. *Accept:*
   `npm run validate` 0/0, `npm run check` 0, and the invariant is executable (the store's own load-time
   assertion) — do not settle for a comment.
5. **Audit checks: deterministic + coverage-aware + self-diagnosing (gap 3/4/6 + item 5 of the brief).**
   (a) preset check runs from a clean profile; (b) CT coverage check pins the axis, reports
   `{axis, planeValue, kind, notePresent}`, and asserts the honest state above the measured limit
   (never demands a credit that cannot exist, and never passes silently when the note is missing at a
   proven-covered plane); (c) `?panelfail` containment check arms the boundary and asserts
   `probes === 1` **and** `card === <surface>` **and** Retry clears it; (d) the context-loss block
   gains the fail-stop diagnostic from §2.4. `audit.mjs` must remain self-sufficient and keep its exit
   codes; parsing Chrome's stderr for crashpad is not required, but the message must name the
   environment clearly (it already does).
6. **Make the changed predicates executable under Node** — extract the pure predicates (preset focus,
   CT coverage honesty, panel-containment reading, context-loss phase reading) into
   `scripts/verify/checks.mjs` and have `audit.mjs` import them, so
   `scripts/verify/audit-checks.test.mjs` (task 3) exercises the *same* text the browser lane uses.
   No behaviour change to the audit's assertions.

**Evidence contract:** files `scripts/verify/checks.mjs`, `scripts/verify/audit.mjs`,
`src/state/store.ts`, `src/components/viewer3d/PostFX.tsx`,
`src/components/viewer3d/Viewer3D.tsx`, `src/components/section/SectionErrorBoundary.tsx`; commands
`npm run validate`, `npm run check`, `npm run build`, `npm run verify:pipeline`, `npm run verify:plane`
(all must exit 0 — no external precondition, all work in this sandbox).

**Final message:** per item, before/after with file+line evidence; the mechanism established for gap 1
and the exact cause of the two dimmed rows; the gate table; and an explicit statement of what could
**not** be proven here (browser lane) and which tier the evidence is.

---

### 4.2 `v7c-qa-bite` (reviewer) — prove the gates can fail

**Write scope (exclusive):** `scripts/verify/lib/**` (shared helpers it owns),
`scripts/verify/panel-fail-bite.mjs` (**new**), `scripts/verify/audit-bite.mjs` (**new**),
`.plate-scratch/qa-bite/**` (gitignored), `docs/QA_CHANGELOG.md` (**append-only**; task 4 reads, never
rewrites this file's earlier sections).

**Must not touch:** anything in task 1's or task 3's scope, `README.md`, any other `docs/` file.

**Mutations must never happen in the shared worktree.** Do them in an isolated copy —
`git worktree add .plate-scratch/qa-bite/tree-<n> HEAD` or a file copy — mutate there, run there, delete
there, and verify the shared tree's `git status --porcelain` is unchanged. Report the shared tree's
status before and after.

**Required demonstrations** (report each as *mutation → observed failure → revert verification*):

1. **Panelfail/containment.** With the fixed hook, a Node demonstration must show that a throw inside a
   named surface is contained by *that* boundary, leaves a Retry affordance, and that the probe signal
   is observable. Extend `scripts/verify/boundary-contract.mjs` (Node, no browser) with the
   DOM-independent half: react-dom/server render of `PanelErrorBoundary name="Taxonomy tree"` with the
   `?panelfail` target set must produce the failure card carrying `data-panel-error` **and**
   `data-panel-probe`; without the parameter it must render children, 0 probes. If a headless React
   render is not workable, say so and fall back to driving the boundary's real state transition + the
   exported predicate — **do not fake it**. Then prove the check bites: re-introduce the §2.5 sibling
   placement in the isolated copy → the new gate must FAIL with a specific label.
2. **Preset default + dimmed rows.** Prove the *check* distinguishes "stale stored preference" from
   "wrong default": with a stored `neuroaxis.viewPreset = 'nuclei'` the clean-profile logic must not
   report a product defect; with the default removed from the code it must fail. Also prove the new
   region guard actually bites: in the isolated copy, make a preset hide
   `ctx-thalamus-envelope` → the store's load-time assertion (or a new Node assertion) must throw.
3. **CT coverage honesty.** Prove the check fails when the statement is removed at a proven-covered
   plane, and does **not** fail when the plane is inside coverage. Use the pure predicate from
   `scripts/verify/checks.mjs` (task 1's extraction) in-process — no browser, no literal that can drift.
4. **Context-loss overlay.** Show that removing any load-bearing fact (the `data-context-lost`
   attribute, the `'lost'` phase write, `preventDefault()`, the mounted-only-while-lost rule) makes a
   Node gate fail with a specific label. If task 3's `audit-checks.test.mjs` already covers a given
   fact, extend rather than duplicate, and say which task's gate caught which mutation.
5. **Audit exit-code honesty.** Prove that an unusable environment (no Chrome / server unreachable)
   yields exit 4/3/2 with **no check reported as a failure** — the distinction the harness exists to
   protect. This is directly runnable here.
6. **The mutation harness cannot leave a lie behind:** every mutation is shown reverted, and the
   affected Node gate is re-run green afterwards.

**Evidence contract:** files `scripts/verify/boundary-contract.mjs`, `scripts/verify/panel-fail-bite.mjs`,
`scripts/verify/audit-bite.mjs`, `docs/QA_CHANGELOG.md`; commands
`node scripts/verify/boundary-contract.mjs`, `node scripts/verify/panel-fail-bite.mjs` (both exit 0 on
the unmutated tree; mutations reported separately, never left applied).

**Final message:** the mutation table; the isolated-worktree proof that the shared tree was never
touched (`git status --porcelain` before/after); which gates could not be mutation-tested here and why.

---

### 4.3 `v7c-node-proof` (builder) — browser-free surrogates + budget/gate record

**Write scope (exclusive):** `scripts/verify/audit-checks.test.mjs` (**new**),
`scripts/verify/budget-report.mjs` (**new**), `.plate-scratch/node-proof/**` (gitignored).

**Must not touch:** task 1's and task 2's scope, `README.md`, `docs/**`, `package.json` scripts
(adding a script would collide with nothing here, but the two new files must be runnable directly with
`node`, so no manifest edit is required — keep it that way).

1. **`audit-checks.test.mjs` — the Tier-1 mirror of the browser assertions.** Import the pure
   predicates from `scripts/verify/checks.mjs` (task 1) and assert, with no browser:
   * the CT coverage statement contains the manifest's own measured limit and names MRI as the modality
     of record, and is `null` inside coverage — driven by the **real** `ct-manifest.json`, not a literal;
   * the preset-focus predicate reports `brainstem-focus` for the shipped default layers and reports a
     non-default for a stored foreign preset (i.e. it can tell them apart);
   * no preset's `hidden` set contains a non-telencephalon record (the §2.6 guard), for **every** preset;
   * the panel-containment reading accepts a card that carries both `data-panel-error` and
     `data-panel-probe`, and rejects a card-only DOM (the §2.5 defect) and a probe-free healthy DOM;
   * the context-loss phase reading maps `lost`/`dead`/`null` to exactly the DOM contract the audit
     queries (`[data-context-lost]`, `role="alert"`, Restore/Reload controls present).
   Each group must print a count and exit non-zero on any failure.
2. **`budget-report.mjs`** — re-derive and print, from the committed artifacts alone: rendered tris
   (manifest), committed GLB bytes, imaging bytes, and the pass/fail against ≤800 000 / ≤14 MiB /
   ≤10 MiB. Exit non-zero on breach. No network, no precondition.
3. **Cross-check the telencephalon claims the browser would have checked**, from committed data:
   telencephalon region + its 5 subdivisions exist in the taxonomy; the 42 telencephalon records + 4
   fiber tracts are present and each is selectable-able (has a record with non-empty clinical/function
   fields per the data contract); the 4 new levels `+48/+58/+68/+78` exist with their anchors; the two
   new plates exist and their SVGs parse; `ctCoverageNotice` wiring is present in `PlatesTab`. Report
   counts, and mark each as "Node-verified" vs "requires browser".
4. **State the tier boundary explicitly in the output** so no reader can mistake Tier 1 for Tier 2.

**Evidence contract:** files `scripts/verify/audit-checks.test.mjs`, `scripts/verify/budget-report.mjs`;
commands `node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs` (both exit 0).

**Final message:** the counts printed by both scripts, the budget numbers with their caps, and the
explicit list of browser-requiring claims it could not cover.

---

### 4.4 `v7c-integration` (integrator) — freeze, prove, commit

**Blocked by:** 1, 2, 3. **Write scope (exclusive):** `README.md`, `docs/**` (including the 3
already-modified files), and the commit itself. It may also fix anything in `src/`/`scripts/` if a gate
fails — but any such fix must be re-verified by task 5, and it must say so.

1. **Run and record the full gate table** on the frozen tree: `validate`, `check`, `build`,
   `verify:pipeline`, `verify:plane`, `audit-checks.test.mjs`, `budget-report.mjs`,
   `boundary-contract.mjs`, `a11y-contract.mjs`, `build-anatomy-geometry.mjs --manifest`,
   `verify-imaging-v4.mjs`, `verify-imaging-v4b.mjs` — all must pass. Then run
   `verify:audit`, `verify:browser`, `verify:acceptance` and record **command + exit code + reason**
   (expected `4`/`4`/`4` here: no Chrome). **`exit 4` is not a pass and not a product failure** — say
   exactly that, in the README/docs and in the final message.
2. **Verify each of the five gaps with its own gate** (Tier 1 where the browser lane cannot run), naming
   the gate that fails if the fix is reverted — cross-referencing task 2's mutation table rather than
   re-asserting it.
3. **Telencephalon browser sanity — best effort, honestly reported.** If a browser is available
   (it is not, in this sandbox; verify before promising), run the checklist from the task brief and
   report observations per item. If not, say "not run — no browser", and substitute the Node-verified
   data/SVG/manifest checklist from task 3. Do **not** describe Node results as browser observations.
4. **Budgets:** report the actual numbers from the manifest and the asset tree
   (measured now: 570 096/800 000 tris · GLB 13.12 MiB/14 MiB · imaging 8.71 MiB/10 MiB).
5. **Regression:** the full v1–v7 checklist (selection paths, layers/filters incl. the new region,
   clip+snap incl. the 4 new levels, explode, quality toggle, Learn-more links, PiP incl. the
   slider-plane fix + restore control + real-slice backdrop, live section in every modality, plane
   sliders, keyboard plate selection, error boundaries, context-loss overlay) — Node-verifiable parts
   executed, browser parts marked not-run. Fix breaks.
6. **Docs + commit.** README gets the v7 closure line: what the closure confirmed, the CT coverage
   limit (`≈ 36.25 au`, MRI is the modality of record above it) and the gate tiering. Commit
   `git add -A` with the message from the brief (task 2's and task 3's files included; the untracked
   `PLAN-run-mtwh4t68-t8gm.md` will be staged — either commit it deliberately as the run's
   plan-of-record or state why not; the pre-existing 3 docs diffs are committed with attribution).
   Then **verify the commit exists and the tree is clean** (`git status --porcelain`, `git log -1`).
7. **Leave no strays:** no dev server left running (check 5173), no Chrome left running, nothing
   written outside `.plate-scratch/` that is not intentional.

**Evidence contract:** files `README.md`; commands `npm run validate`, `npm run verify:pipeline`,
`npm run verify:plane`, `node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs`
(all exit 0).

**Final message:** the gate table with exit codes (and the three browser lanes' `exit 4` + reason),
the per-gap evidence with the reverting-gate named, the budget numbers, what was and was not observed
in a browser, and the commit hash.

---

### 4.5 `v7c-verdict` (reviewer) — independent verdict on the frozen commit

**Blocked by:** 4. **Write scope (exclusive):** `docs/QA_CHANGELOG.md` (append its verdict section under
a new dated heading). No source edits: if it finds a defect it reports it back rather than fixing it,
so the final artifact is verified by someone other than its author.

1. **Reproduce, don't trust:** re-run every Tier-1 gate on the committed tree and compare with task 4's
   claims; re-run task 2's bite demonstrations (or spot-check at least the panelfail one) in an isolated
   copy; confirm the commit's diff touches only the declared scopes and that
   `git status --porcelain` is clean before and after.
2. **Space integrity (the v7 acceptance bar):** prove nothing below `y = +45` moved — compare the
   brainstem/diencephalon canonical OBJs (`assets-src/bp3d/canonical/`, gitignored but present) and the
   baked GLBs against `git show <commit>:<path>` using the repo's own readers; compare the pre-existing
   13 levels' MRI/CT slice content before/after the AMENDMENT B re-bake within a stated tolerance;
   confirm `CLIP_BOUNDS` (`src/components/viewer3d/clipPlanes.ts`) is the single declaration (grep for
   leftover hard-coded `−55/45/±27` in `src/`). Report numbers.
3. **Ribbon sanity:** bbox vs the white-matter core; interhemispheric and Sylvian fissures as
   concavities; lateral ventricles inside the ribbon and non-degenerate; caudate/putamen/pallidum/
   hippocampus/amygdala plausible relative to the thalamus (compare the axial +58 plate). Flag
   under-sampled structures. State the method and its tolerance honestly (a Node-side mesh check is not
   a visual judgement — say so).
4. **Orientation:** re-verify `SECTION_SYNC_PLAN §2` on all three surfaces after the bounds change via
   `npm run verify:plane` plus direct inspection of the two new plates' L/R letters against the geometry.
5. **Gates that bite (independent):** confirm task 2's demonstrations were reverted (hashes equal) and
   that at least one **new** mutation of your own makes a new audit check fail in an isolated copy.
6. **Verdict + honest limitations:** state the verdict against `TELENCEPHALON_PLAN §9` and
   `QUALITY_PLAN §6`, item by item, including explicitly: the browser lane could not run here
   (`exit 4`), so the runtime audit's 56 checks are **not** independently reproduced in this run; ribbon
   fidelity, unanchored fiber tracts, CT coverage and registration tolerance remain as recorded
   limitations. Also verify §7's housekeeping: `assets-src/`, `.bp3d-probe/`, `.plate-scratch/` stay
   gitignored and uncommitted; no stray server/Chrome left behind.

**Evidence contract:** file `docs/QA_CHANGELOG.md`; commands `npm run validate`,
`node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs` (all exit 0).

---

## 5. Gate table (what is binding in this run)

| # | Gate | Command | Tier | Expected here |
| --- | --- | --- | --- | --- |
| 1 | Data integrity | `npm run validate` | 1 | PASS — 0 errors / 0 warnings |
| 2 | Types | `npm run check` | 1 | exit 0 |
| 3 | Build | `npm run build` | 1 | exit 0 (`minify: 'terser'`) |
| 4 | Section pipeline | `npm run verify:pipeline` | 1 | PASS — 106/106 parts, 570 096 tris |
| 5 | Plane transform | `npm run verify:plane` | 1 | PASS — 10 827 assertions |
| 6 | Boundary contract | `node scripts/verify/boundary-contract.mjs` | 1 | PASS (extended by task 2) |
| 7 | a11y contract | `node scripts/verify/a11y-contract.mjs` | 1 | PASS — 38 checks |
| 8 | New check tests | `node scripts/verify/audit-checks.test.mjs` | 1 | PASS (new, task 3) |
| 9 | Budget re-derivation | `node scripts/verify/budget-report.mjs` | 1 | PASS (new, task 3) |
| 10 | Anatomy + imaging budgets | `node scripts/build-anatomy-geometry.mjs --manifest`, `scripts/verify-imaging-v4*.mjs` | 1 | PASS — 570 096/800 000 · 13.12/14 MiB · 8.71/10 MiB |
| 11 | Runtime audit | `npm run verify:audit` | **2 — blocked** | **exit 4, no check run** (no Chrome) |
| 12 | Browser probe | `npm run verify:browser` | **2 — blocked** | **exit 4, no check run** (no Chrome) |
| 13 | Browser acceptance | `npm run verify:acceptance` | **2 — blocked** | **exit 4, no check run** (no Chrome) |

Gates 11–13 are recorded as **command + exit code + reason**, never as "pass". Any final report that
prints a pass/fail count for `verify:audit` in this sandbox is reporting something that did not happen.

## 6. Flagged risks (with owners)

| Risk | Impact | Mitigation / owner |
| --- | --- | --- |
| **Chrome cannot launch (proven)** → the audit's 56 checks cannot be reproduced; "0 failures" is unprovable here | The run's headline gate is Tier-2 only | Tier-1 mirrors + mutation proof; report `exit 4` honestly with the reason. **Action for the orchestrator: run `npm run verify:audit` on a machine where Chrome can start** — that is the only way to close items 1–6 against real browser evidence. Owner: orchestrator (outside this DAG). |
| The gap-1 mechanism cannot be *observed* here, only inferred | A fix could be aimed at the wrong mechanism | Task 1 fixes the proven `alpha` cause first, adds the fail-stop diagnostic so the browser run is self-explaining, and task 3's surrogate asserts the DOM contract. State the inference as an inference. Owner: `v7c-gaps`, `v7c-node-proof` |
| The L1 failure may be a check defect *or* a product defect (or both) | Wrong fix direction | Clean-profile determinism **and** the region guard both land; the report must say which cause produced which row. Owner: `v7c-gaps`, verified by `v7c-qa-bite` |
| CT note absence is unexplained without a browser | A "coverage-aware" check could mask a real product bug | The check must first prove the plane/axis, then assert; whichever way it lands is reported with numbers. Owner: `v7c-gaps`, verified by `v7c-qa-bite` |
| Tasks 1/2/3 run concurrently against one tree | A mutation or a stale server could corrupt another task's measurement | Disjoint write scopes; mutations only in isolated worktrees; the shared tree must not be edited while a lane runs; browser lanes are serialized (one dev port 5173). Owners: all three |
| Stale `localStorage` in the *other* two browser scripts' profiles (`chrome-profile`, `chrome-profile-accept`) | Same class of false positive in `verify:browser`/`verify:acceptance` | Task 1 may extend the clean-profile discipline via `scripts/verify/lib/startServer.mjs`; task 4 records which profiles were used. Owner: `v7c-gaps` |
| Integration is also the last editor of source if a gate breaks | Self-verification | Any integration source fix must be named in its report; task 5 re-verifies the frozen commit and re-runs a mutation of its own. Owner: `v7c-integration`, `v7c-verdict` |
| `git add -A` stages the pre-existing docs diffs and this plan file | Mixed commit | Deliberate: docs committed with attribution; the plan-of-record either committed on purpose or explicitly excluded. Owner: `v7c-integration` |

## 7. Binding constraints (verbatim from the run, reaffirmed)

Nothing below `y = +45` may move · `validate` stays 0 errors / 0 warnings · `check` and `build` exit 0 ·
all seven verifiers reported with `verify:audit` at 0 failures **where the browser lane can run** ·
tris ≤ 800k · GLB ≤ 14 MB · imaging ≤ 10 MB · evidence contracts list real files only and never a
command requiring an external precondition · work additively on the committed tree · Windows / Node 24 ·
pin work to the `deepseek-official` provider (the zai/glm route repeatedly died with "child stopped:
error").

## 8. Per-task evidence-contract summary (for the dispatcher)

| Task | Evidence files (must be non-empty) | Evidence commands (must exit 0) |
| --- | --- | --- |
| `v7c-gaps` | `scripts/verify/checks.mjs`, `scripts/verify/audit.mjs`, `src/state/store.ts`, `src/components/viewer3d/PostFX.tsx`, `src/components/viewer3d/Viewer3D.tsx`, `src/components/section/SectionErrorBoundary.tsx` | `npm run validate`, `npm run check`, `npm run build`, `npm run verify:pipeline`, `npm run verify:plane` |
| `v7c-qa-bite` | `scripts/verify/boundary-contract.mjs`, `scripts/verify/panel-fail-bite.mjs`, `scripts/verify/audit-bite.mjs`, `docs/QA_CHANGELOG.md` | `node scripts/verify/boundary-contract.mjs`, `node scripts/verify/panel-fail-bite.mjs` |
| `v7c-node-proof` | `scripts/verify/audit-checks.test.mjs`, `scripts/verify/budget-report.mjs` | `node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs` |
| `v7c-integration` | `README.md` | `npm run validate`, `npm run verify:pipeline`, `npm run verify:plane`, `node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs` |
| `v7c-verdict` | `docs/QA_CHANGELOG.md` | `npm run validate`, `node scripts/verify/audit-checks.test.mjs`, `node scripts/verify/budget-report.mjs` |

None of these commands needs an external precondition: every one runs in this sandbox today (verified
for gates 1–5 and 10 above; the new ones are Node-only by construction). The browser lanes are **never**
listed in an evidence contract.

## 9. Deviations from the dispatched proposal (summary)

1. **3 tasks → 5.** Integration and independent QA are separated; the mutation proof and the surrogate
   proof run in parallel with the fix instead of racing it on the same files.
2. **No parallel task shares a write scope.** The proposal gave `v7c-gaps` and `v7c-qa` overlapping
   `src/`, `scripts/`, `docs/`, `README.md` claims.
3. **Browser-lane evidence is demoted to Tier 2 and never reported as a pass.** The proposal's
   "all seven verifiers green with verify:audit at 0 failures" is unachievable in this sandbox
   (proven: Chrome cannot launch; `exit 4`).
4. **New: `scripts/verify/checks.mjs` + `audit-checks.test.mjs` + `budget-report.mjs`** make the
   changed audit predicates executable and falsifiable under Node — the method the repo's own v6 QA
   already used when the browser lane was unavailable.
5. **New binding fix in `store.ts`:** preset `hidden` sets may only ever contain telencephalon records
   (the diencephalon `ctx-*` rows the audit named); the existing assertion covers only the default.
6. **The audit must be deterministic about persisted state** (clean profile / cleared
   `localStorage`), and the CT coverage check must pin the axis and report its own inputs before
   asserting — the proposal asked for "coverage-aware" without either.
7. **Item (6) of the audit is re-framed:** the CT limit at `y ≈ 36.25 au` is a measured property of the
   Visible Human source (`ct-manifest.json`), so the honest state — MRI is the modality of record above
   it — is the correct assertion, recorded as a documented limitation of `TELENCEPHALON_PLAN §9`'s
   CT-coverage half rather than silently weakened.
