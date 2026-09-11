# PLAN — run `mtwdi5rv-wn6n` (swarm run id `run-mtwdi5rv-8s1c`): NeuroAxis v6 closure — integration + QA of the audit remediation

Refined plan for the relief run. Repo `D:\Startup projects\3DNeuroanatamoy` (branch `master`, HEAD `8ab1b47`, working tree clean at review time).

Authoritative specs: `docs/QUALITY_PLAN.md` (§5 housekeeping, §6 acceptance) · `docs/AUDIT_REPORT.md` (the findings; §2.22 = audit item 22, since the report has no `### 2.22` heading) · `docs/TELENCEPHALON_PLAN.md` (v7, already landed — the work must be additive to it).

Task ids are **kept** (`v6b-integration`, `v6b-qa`) — this is a refinement, not a re-plan. **D1–D9** in §3 are deviations from the dispatched proposal and are binding.

---

## 0. What this review actually verified (measurements, not assumptions)

Every row below was produced in this session against the live tree. I edited **no** repository file; this plan file is the only artifact of this task (`git status --porcelain` = 0 entries before and after).

| Check | Command / method | Result |
| --- | --- | --- |
| Data gate | `npm run validate` | **PASS 0 errors / 0 warnings** · levels 17 · taxonomy 183 · structures 11 files / 160 records · tracts 23 · syndromes **26** in 3 files · plates 15 records / 15 SVGs |
| Types | `npm run check` | **exit 0** |
| Build | `npm run build` | **exit 0** in 10.44 s · `dist/assets/index-C2yHvmgC.js` 1 119.04 kB raw / **252.44 kB gzip** · `dist/assets/vendor-three-DEGsR_ZL.js` 1 206.81 kB raw / **354.64 kB gzip** |
| Section pipeline | `npm run verify:pipeline` | **PASS** — `106/106 parts · 570 096 triangles · 329 loops across 13 planes · 0 problems` |
| Plane transform | `npm run verify:plane` | **PASS** — `17 anchors · 10 827 assertions`, exit 0 |
| Anatomy budget gate | `node scripts/build-anatomy-geometry.mjs --manifest` | **PASS** — parts 106 (nucleus 86 · context 15 · ventricle 5) · tris **570 096 / ≤800 000** · GLB **13 755 548 B (13.12 MiB) / ≤14.00 MiB** · nuclei 2.81 MiB / ≤3.00 · tel tri caps PASS |
| Imaging budget gate A | `node scripts/verify-imaging-v4.mjs` | **PASS** — imaging payload **8.71 MiB in 80 files, cap 10.00 MiB (AMENDMENT B)**; v4-added 3.81 MiB / ≤4.00 |
| Imaging budget gate B | `node scripts/verify-imaging-v4b.mjs` | **PASS** — payload 8.71 MiB / cap 10 MiB; cryosections 1 232 904 B / ≤1 750 000 |
| `verify:audit` with **no** server | `npm run verify:audit` | **exit 1** — `0 passed · 1 failed · 0 informational` → `FAIL audit aborted: devtools endpoint never came up` |
| `verify:acceptance` with **no** server | `npm run verify:acceptance` | **exit 1** — `FAIL probe error: devtools endpoint never came up` |
| Headless Chrome in this sandbox | `chrome.exe --headless=new --remote-debugging-port=…` | **CANNOT START** — process exits immediately: `ERROR:third_party\crashpad\crashpad\client\crashpad_client_win.cc:421] OpenProcess: Access is denied. (0x5)`; `/json/version` never answers. Retried with `--no-sandbox --disable-crashpad --disable-breakpad`: identical failure |
| Dev server bind vs. reachability | `node node_modules/vite/bin/vite.js --port 5199` then probe 3 URLs | Vite **does** bind here. `http://localhost:5199` → **200** (1 622 B). `http://127.0.0.1:5199` → **refused**. `http://[::1]:5199` → timeout. Vite binds **IPv6-only** by default; readiness probes **must use `localhost`**, never `127.0.0.1` |
| `p1-photofit` honesty | `git show --stat d1cefef -- src/data/sectionImages.ts` | **THE DISPATCH IS FACTUALLY WRONG — see D1.** `928 insertions(+), 1 deletion(-)` |
| Telencephalon region records | `node` count over `src/data/taxonomy.json` | **46** telencephalon records (total 183; diencephalon 39 · midbrain 25 · pons 35 · medulla 33 · cerebellum 5) — proposal said 42 |
| Telencephalon plates | `src/data/plates.json` | **3** tel plates of 15 total: `plate-tel-axial-58`, `plate-tel-sagittal-hemisphere`, `plate-tel-coronal-fornix` — proposal said 2 |
| New level anchors | `src/data/levels.json` | **+48 / +58 / +68 / +78** present (`lvl-tel-thalamostriate`, `lvl-tel-basal-ganglia`, `lvl-tel-centrum-semiovale`, `lvl-tel-convexity`) — 17 anchors total |
| Dead-export list (§2.22) | 14 `\bname\b` greps over `src` + `scripts` | **all 14 still dead** — exactly 1 hit each, the definition itself: `mirroredWaypoints`, `getFoliaNormalTexture`, `disposeProceduralTextures`, `isSectionCapped`, `polygonArea`, `getCtWindow`, `hasAnatomyPart`, `webRefCount`, `allStructures`, `REGION_ORDER`, `KIND_ORDER`, `getSyndromes`, `tubeCacheSize`, `disposeTubeCache` |
| Plane dedup honesty | definition grep for the 6 transform names outside `planeGeometry.ts` | **ZERO** leftover definitions. Duplication is genuinely gone; the 8 consumers import the shared module |
| Panel boundaries | grep `ErrorBoundary` | `PanelErrorBoundary` **exists** as a *named export inside* `src/components/section/SectionErrorBoundary.tsx` (not a separate `PanelErrorBoundary.tsx`); `AppErrorBoundary.tsx` exists and wraps the shell; `App.tsx` has a `TransparentBoundary` helper |
| Context-loss handling | grep `webglcontextlost` | Real and mirrored: `Viewer3D.tsx` (11 hits) + `SectionPiP.tsx` (7 hits) |
| Audit is the prior run's blocker | `swarm_status` | **run-mtw7ces2-v4wt `v7b-integration` FAILED — "evidence command failed: npm run verify:audit"**. The browser gate killed the run, exactly as suspected |

### Budget headroom (all green — no budget work is needed, only evidence)

| Budget | Limit | Measured | Headroom |
| --- | --- | --- | --- |
| Rendered triangles | ≤ 800 000 | **570 096** | 71.3 % of cap |
| Committed anatomy GLB | ≤ 14 MiB | **13.12 MiB** (13 755 548 B) | 0.88 MiB |
| Imaging payload | ≤ 10 MiB (AMENDMENT B) | **8.71 MiB** in 80 files | 1.29 MiB |
| Nuclei bytes | ≤ 3.00 MiB | **2.81 MiB** | 0.19 MiB |
| v4-added assets | ≤ 4.00 MiB | **3.81 MiB** | 0.19 MiB |
| Cryosections | ≤ 1 750 000 B | **1 232 904 B** | 0.49 MiB |

**Note (D6).** The dispatch says "imaging ≤10 MB"; the *audit report* line 33 instead cites "imaging payload 7.30 MB of the 8 MB cap". The authoritative live cap is **10 MiB / AMENDMENT B**, enforced by two working scripts. Copy the cap from `verify-imaging-v4.mjs`, not from the dispatch and not from the stale audit prose.

---

## 1. Corrections to the proposal (D1–D9)

Each is a factual finding with its evidence. **D1, D4 and D5 change the shape of the work.**

### D1 — The dispatch's `p1-photofit` "deviation" is FALSE. The task DID edit `sectionImages.ts`, and its work is the strongest kind of honest.

The run objective and step (1) of the integration brief both assert: *"`p1-photofit` reported a deviation: no new edit to `sectionImages.ts`, which you must verify is honest"*, and the QA brief repeats *"does `sectionImages.ts` carry measured fit values or a documented reason they are absent?"*.

**Measured:**
- `git show --stat d1cefef -- src/data/sectionImages.ts` → **`1 file changed, 928 insertions(+), 1 deletion(-)`**.
- The committed file now carries a complete, typed registration apparatus: `REGISTRATION_STATUS`, `REGISTRATION_UNMEASURED_REASON` (4 values), `REGISTRATION_MEASURED` (the per-plate evidence table, **committed in source**, `Record<string, NonNullable<SectionImageRegistration['evidence']>>`), `REGISTRATION_METHOD`, `REGISTRATION_MIRROR_OWNER`, `REGISTRATION_NO_CROSS_SECTION` (`{'ubc-c07','ubc-c24','vhp-0721'}`), `REGISTRATION_MEASUREMENT_NOTE`, `REGISTRATION_UNMEASURED_NOTE`.
- `REGISTRATION_MEASUREMENT_NOTE` is a single ~1 700-character `const` recording: two independent measurement passes over all **49** anchored plates; pass-1 residual min 2.06 / median 6.11 / max 113.45 au (only 5 of 43 comparable plates reach ≤3 au, all on a flat objective whose arg-min is inside scan noise); pass-2 `centroidResidualAu` min 0.23 / median 2.49 / max 64.78 au, bimodal by family (UBC transverse 0.53–1.32, UBC coronal 0.23–4.16, VHP 2.36–64.78 because those are full-**head** cryosections of 129.4 × 187.2 au against a brainstem-only atlas cross-section); a **recovery probe** proving the scan is not identifiable (shifting a real plate by a known +13 au moves the arg-max by +13 au instead of holding it, `ubc-h12: −20→−33.0 … +13→0.0`) while the method recovers *synthetic* known offsets exactly (IoU 1.000, error 0.00 au); `atlasVsPlateExtentU/V` 1.7–3.5× (UBC) and 0.06–0.74× (VHP); best IoU anywhere 0.383.
- 6 plates could not be compared at all: the 3 Commons CT plates declare no `fit.scale`; `ubc-c07`, `ubc-c24`, `vhp-0721` produce no atlas cross-section.

**Consequence.** `QUALITY_PLAN` §2 item 6 requires: *"Photographs that cannot be measured stay at the documented default **and say so**."* That is exactly what landed. `fit.dy` remains `0` **because the measurement was performed, rejected, and recorded** — not because it was skipped. `REGISTRATION_MEASURED` being committed (not only in the gitignored scratch) is the proof the work is not vapor.

**Binding instruction to the integrator:** **delete the "verify whether p1-photofit's deviation is honest" framing.** The correct statement is: *the deviation report was inaccurate; the deliverable is on disk, committed, and satisfies §2 item 6 by the "say so" arm.* Report it in those words. Do **not** "implement the measurement" (it was implemented) and do **not** write a "why it cannot be done" note as if nothing had been attempted (it was attempted twice, with a recovery probe, and the numbers are in the file). You may add at most a one-line pointer in `docs/QUALITY_PLAN.md` §6 recording that the arm is met via the documented-default route — and it must cite `REGISTRATION_MEASURED` / `REGISTRATION_MEASUREMENT_NOTE` as the evidence, not restate the numbers.

One residual inconsistency worth *stating, not silently fixing*: `REGISTRATION_MEASUREMENT_NOTE` says *"This is the reason on the 43 plates that were measured"* while `REGISTRATION_STATUS` doc says *"Nothing is 'measured' today"*. Read together the meaning is clear — 43 plates were **measured and rejected**; 0 carry `status: 'measured'`. If the integrator touches this file at all, the *only* acceptable edit is a clarifying half-sentence; any change to the numbers, the `fit` values, or the statuses is out of scope and must be refused.

### D2 — Stale v7 counts. Use these, not the dispatch's.

| Item | Dispatch says | Measured |
| --- | --- | --- |
| Telencephalon region records | 42 | **46** (taxonomy total 183) |
| New telencephalon plates | 2 | **3** (`plate-tel-axial-58`, `plate-tel-sagittal-hemisphere`, `plate-tel-coronal-fornix`) |
| Total plates | — | **15** records / 15 SVGs |
| Syndromes | 24 (QUALITY_PLAN §2 item 7) | **26** in 3 files; `syn-one-and-a-half` **and** `syn-central-horner` both **present** — the §2 item 7 "resolve `syn-central-horner`" question is resolved *by authorship* |
| Level anchors | "four NEW telencephalon levels +48/+58/+68/+78" | **Correct** — all four present, 17 anchors |
| Manifest parts | 106 | **106** ✓ |

The regression checklist must therefore use **46** tel records, **15** plates, **26** syndromes.

### D3 — Historical `QUALITY_PLAN.md` §6 numbers must not be "corrected" from memory.

§6 currently records the `p2-perf` result as entry `817.2 kB raw / 171.9 kB gzip` with `vendor-three` `1 206.81 kB / 354.64 kB`, total first-paint 517.61 kB gzip vs 762.24 kB (−32.1 %). My fresh build measured the **entry at 1 119.04 kB raw / 252.44 kB gzip** and the vendor chunk at exactly `1 206.81 kB / 354.64 kB`. The entry grew (the v7 telencephalon work landed after that measurement) while the vendor chunk is byte-identical. **The §6 sentence as written is a true historical record; do not overwrite it.** Append a dated re-measurement line instead:

> Re-measured on `8ab1b47` (v6 closure): entry `1 119.04 kB raw / 252.44 kB gzip` + vendor-three `1 206.81 kB raw / 354.64 kB gzip` = **607.08 kB gzip first paint**, still far below the 762.24 kB `minify:false` baseline; the entry grew with the v7 telencephalon work, the vendor chunk is unchanged. `minify: 'terser'` retained — `minify: 'esbuild'` is a silent no-op through `vendor/esbuild-shim` and must not be used (QUALITY_PLAN §3 item 12).

### D4 — **The browser lane cannot run inside a swarm subagent's sandbox.** This is the exact mechanism that failed the last run, and the dispatch's own evidence advice reproduces it.

Evidence, in order:
1. `swarm_status`: **run-mtw7ces2-v4wt / `v7b-integration` — "evidence contract failed — evidence command failed: `npm run verify:audit`"**. The v7 relief run did not fail on product quality; it failed because a browser-dependent command was a **gate**.
2. Headless Chrome **cannot start** in this session: exits immediately with `crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)`; `/json/version` never answers. `--no-sandbox --disable-crashpad --disable-breakpad` changes nothing. (Node 24.18.0; Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`.)
3. Both `npm run verify:audit` and `npm run verify:acceptance` therefore exit **1** with `devtools endpoint never came up` — the same message whether the *server* is missing or *Chrome* is blocked. The message is actively misleading; that ambiguity must be fixed (D5).

**Therefore, binding on this run:**

- **`v6b-integration` evidence must NOT include `npm run verify:audit` (or `verify:acceptance`, or `verify:browser`).** Those are **attempted-and-reported**, never gating. Gating evidence is Node-only: `npm run validate`, `npm run check`, `npm run build`, `npm run verify:pipeline`, `npm run verify:plane`, `node scripts/verify/a11y-contract.mjs`, `node build-anatomy-geometry.mjs --manifest`, `node scripts/verify-imaging-v4.mjs`, `node scripts/verify-imaging-v4b.mjs`. (This run's actual evidence contract happens to list only the plan file, so nothing is broken today — this rule exists so the integrator does not *add* a browser command to it.)
- The integrator **must still make the audit self-sufficient** (that is the durable fix; a different execution environment can run it), and **must report the audit's result honestly**, including "not runnable in this session" with the crashpad line.
- The dispatch's step (4)(b) *preferred* route — "assert the boundary component's presence/behaviour by **unit-level evaluation of the built module**" — is **rejected** as the primary route. It would require a DOM + a React driver in Node, is fragile against Terser, and "the bundle contains the string" is not a demonstration. See D7 for the route actually prescribed.

### D5 — The failure-mode ambiguity must be eliminated with **distinct exit codes**.

Today any environmental failure looks exactly like a product failure (`exit 1`). For a run whose last attempt died on precisely this, the script must say which it is:

| Exit | Meaning |
| --- | --- |
| **0** | all checks ran and passed |
| **1** | **checks ran and FAILED** — the only "the product is broken" signal |
| **3** | **environment unusable**: neither an existing server at the target URL nor a started one answered HTTP 200 within the bounded wait |
| **4** | **environment unusable**: Chrome could not be started / DevTools never came up (preflight) |

**Mandated implementation shape** (the audit must fail *fast and diagnostically*, after starting the server, before running checks):

1. Resolve `BASE` from `argv[2]` as today (default `http://localhost:5173`) — **`localhost`, never `127.0.0.1`** (see §0: Vite binds IPv6-only and `127.0.0.1` is refused).
2. Probe `BASE`. If it answers, use it and set `startedServer = null`.
3. Else spawn `npm run dev` with `{ stdio: 'ignore', shell: true, windowsHide: true }` (**`stdio: 'ignore'` is mandatory** — a piped child stdio can fail with `EPERM` under the confined sandbox) and poll `BASE` every 250 ms for up to **30 s**. On timeout: kill the tree and `process.exit(3)`.
4. **Preflight Chrome before any check.** Launch Chrome as today, then probe `/json/version` with the same ~15 s bound the existing `connect()` uses. If it never answers: kill the tree and `process.exit(4)`. Rationale: the crashpad failure is instant and deterministic, so the script must not waste 60 s × N checks discovering it, and must never dress an environment failure up as a product failure.
5. **Cleanup is a hard requirement on every path.** Register one cleanup that kills **both** the dev server **and** Chrome, and call it from `finally`, from `process.on('SIGINT'/'SIGTERM')`, and from both early exits. On Windows the server is a **process tree** (`npm.cmd` → `node` → Vite): kill it with a **synchronous** `spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'])` — a plain `child.kill()` leaves Vite alive holding port 5173. Put the orchestration in `try { … } catch { bad(…) } finally { cleanup() }` so `process.exit(1)` from the catch cannot bypass it.
6. Preserve `node scripts/verify/audit.mjs http://localhost:5173` pointing at an already-running server — that is the CI/agent path and the orchestrator's easiest re-run.
7. **Also apply the same bootstrap to `browser-acceptance.mjs` and `browser-probe.mjs`.** `verify:acceptance` is one of the seven gates the acceptance criterion requires to be green, and it fails from a cold checkout for the identical reason (`browser-acceptance.mjs:12` defaults to `http://localhost:5173` with no bootstrap; `browser-probe.mjs:14` likewise). Fixing only `audit.mjs` would leave a hard-constraint gate unrunnable. Factor the bootstrap into **one** shared helper — `scripts/verify/lib/startServer.mjs` (new file; create the directory) — used by all three, rather than three copies of the same 40 lines.

**Scope discipline:** this is a *precondition* fix and must not change what any existing check asserts. No check may be weakened, skipped or deleted to make the suite pass — that would be exactly the failure `QUALITY_PLAN` line 5 forbids.

### D6 — The budgets are already green; the *gates* are partly unwired. Wire them rather than re-measuring.

`node scripts/build-anatomy-geometry.mjs --manifest`, `node scripts/verify-imaging-v4.mjs` and `node scripts/verify-imaging-v4b.mjs` all PASS and all enforce the hard-constraint budgets, but **none is a `package.json` script**. `scripts/verify/a11y-contract.mjs` — the Node-only, no-browser a11y harness written for exactly this situation, whose header documents the dist fallback — is also **unwired and unreferenced by anything** (grep for `a11y-contract` in `package.json` and in `audit.mjs` returns nothing).

Add, as **new** entries (never replace an existing script): `verify:budget` → `build-anatomy-geometry.mjs --manifest`; `verify:imaging` → `verify-imaging-v4.mjs`; `verify:a11y` → `a11y-contract.mjs`. Keep `verify:audit` / `verify:acceptance` / `verify:browser` exactly as they are named today (their names are referenced by prior run records and by `QUALITY_PLAN` §6). No CI config exists in this repo; do not invent one — note in §6 that wiring these into `package.json` is the available substitute.

### D7 — **The audit's "boundaries are mounted" fallback cannot work as written.** A real gap in the proposal, with a prescribed fix.

The dispatch's step (4)(b) fallback is: *"assert the boundaries are mounted around every surface by static inspection of the rendered DOM (wrapper elements/data attributes)"*.

**Measured:** that is impossible today. `PanelErrorBoundary.render()` returns `this.props.children` **directly** when healthy (`SectionErrorBoundary.tsx:144`), and the card `<div className="panel-error" role="alert" data-panel-error={name}>` exists **only in the failed state** (`panelErrorCard`, line 72–77). `SectionErrorBoundary`'s healthy path does the same (its `render()` reaches a bare `return this.props.children` immediately after the failed-state branches). `App.tsx`'s `TransparentBoundary` deliberately passes `style={{ display: 'contents' }}`. **In a healthy page there is therefore no DOM node, attribute or wrapper that marks a boundary's presence** — a DOM-inspection check would assert nothing and pass vacuously, which is worse than no check.

**Two additive fixes, in preference order. The integrator picks one and says which.**

- **(a) Preferred — make the health path inspectable.** Add `data-panel-boundary={name}` to the element `PanelErrorBoundary` renders in **both** states. Today the healthy path renders no wrapper, so this means rendering one: the minimal additive form is a `<div className={this.props.className} style={this.props.style} data-panel-boundary={name}>` around the children on the healthy path as well. **`TransparentBoundary` already passes `display: 'contents'`, which keeps the wrapper layout-neutral** — but this is a shell-wide DOM change, so the integrator **must** re-run `verify:audit`'s existing layout/screenshot checks *and* the full regression pass before accepting it. If any of the seven panels shifts, revert (a) and take (b).
- **(b) Fallback if (a) costs layout fidelity.** Keep the DOM as it is, and make the check honest about what it proves: assert **the two things that are actually observable** — (i) the *structural* invariant, that each surface's own root element is present and the others keep rendering while one throws (this is what "contains a failure" means operationally), and (ii) the **failure card**, `.panel-error` / `role="alert"` / `data-panel-error`, plus its Retry button restoring the panel. Then state explicitly in the final report that boundary *presence* was proved by reading the source, while boundary *behaviour* was proved by the forced-throw demonstration.

**Both routes require the forced throw, so the forced throw must be real.** The dedicated QA task's requirement is explicit: *"confirm each major surface is wrapped and that a thrown error is contained rather than blanking the app"* — "static inspection proves mounted, not that it catches". The safe, documented mechanism (the dispatch's "documented test hook" option, which is the one to take):

> A dev-only, **default-off** throw probe gated behind a URL query (e.g. `?panelfail=<surface>`, pattern precedent already in the tree: `?sectiondebug`), implemented so that it is **statically unreachable in a production build** (guard on `import.meta.env.DEV`). The audit navigates to `?panelfail=taxonomy` (and one other surface), asserts **`[data-panel-error]` appears with the right `name`**, asserts **the other panels are still interactable** (a tab still switches, the 3D canvas still has a live context), clicks **Retry**, asserts the card clears and the panel re-renders, then navigates back with the flag absent and asserts the healthy DOM.

If that probe cannot be landed safely within the task, the honest fallback is (b)(i)+(ii) plus the *static source proof*, and the final report must contain an explicit sentence: **"a forced-throw containment demonstration was not performed; containment is asserted by construction plus the failure-card path, not demonstrated"** — with the reason. **It must not claim a demonstration that was not performed.**

### D8 — `v6b-integration` and `v6b-qa` must be **serialised**; the dispatch leaves them parallel with overlapping scopes and a `git add -A` race.

Dispatched scopes: `v6b-integration` writes `scripts/verify/, src/components/, src/geometry/, src/styles/, docs/QUALITY_PLAN.md, README.md`; `v6b-qa` writes `src/, scripts/, docs/, README.md`. `v6b-qa`'s scope is a **strict superset** of the integration scope, and neither declares `blockedBy`. Run concurrently they (i) edit the same files simultaneously, and (ii) — decisively — `v6b-integration` step (6) is **`git add -A && git commit`**, which would sweep the QA task's in-flight, unverified edits into the integration commit under a message that describes only integration work.

**Binding:** `v6b-qa.blockedBy = ['v6b-integration']`. Integration finishes and commits; QA then verifies a **frozen** tree. This also matches the evidence-ordered nature of the work — you cannot QA an artifact that is still being written.

**Additional scope narrowing (not required by the dispatch, but it removes the last collision class):**

- `v6b-integration` — **remove `src/data/` from any write scope.** It has no reason to touch data, and `src/data/` is where D1's "refuse to touch" boundary lives. Its scope should be: `scripts/verify/**`, `scripts/build-anatomy-geometry.mjs` (read-only use), `src/components/**`, `src/styles/**`, `package.json`, `docs/QUALITY_PLAN.md`, `README.md`.
- `v6b-qa` — default to **read-only**. Its only permitted writes are (i) genuinely necessary conservative fixes, each with a stated reason, and (ii) appended records in `docs/QA_CHANGELOG.md` and `docs/QUALITY_PLAN.md` §6. It must **not** re-run `git add -A`; if it commits at all it commits **only the files it itself changed** by explicit path (`git commit -- <paths>`), and it must state the hash. `src/data/sectionImages.ts` and the `fit` values are **out of scope for both tasks** (D1).

### D9 — Two pre-existing conditions to report, not "fix" (they are not this run's scope, and both are already documented honestly).

1. **`verify:plane` prints a coronal camera degeneracy and still exits 0** — `coronal camera basis is degenerate and PRE-EXISTING: up y ∥ cameraSide y (AXIS_PAIR.z[1] = +y is parallel to up +y (pre-existing)) — measured basis right=+x up=−z; needs a SectionPiP cameraSide fix (reported, not applied here)`. The gate is **already honest**: it prints the finding and attributes it, and it does not fail the run. Neither task may "fix" the camera basis (that is a product change with pixel consequences, outside an integration/QA brief) and neither may silence the note. The QA task should confirm the line is still printed and unchanged.
2. **`AppErrorBoundary` wraps the shell that already wraps each panel** — a deliberate belt-and-braces design, documented in `App.tsx:33-34, 254-261`. Do not "simplify" it away.

---

## 2. The refined DAG

```
v6b-integration   (integrator)   [no blockedBy]
       │
       └──► v6b-qa (reviewer)    [blockedBy: v6b-integration]
```

Two tasks, **sequential**, one run. The dispatch already keeps both in one DAG (no consolidation required); the only structural change is D8's `blockedBy`.

**No shared files run concurrently** — with D8 in force there is exactly one writer at any instant, so no narrower per-file scope is needed. `architect-review` (this task) owns only `PLAN-run-mtwdi5rv-wn6n.md`.

---

## 3. Task briefs

### `v6b-integration` — integrator

**Objective.** Close the v6 remediation on the current tree (which already carries v7): verify what landed, do the housekeeping, make the browser audit genuinely self-sufficient, add the two P0 demonstrations as permanent gates, run full acceptance plus a v1–v7 regression pass, and commit.

**Write scope (exclusive).** `scripts/verify/**` (incl. new `scripts/verify/lib/startServer.mjs`) · `src/components/**` · `src/styles/**` · `package.json` · `docs/QUALITY_PLAN.md` · `README.md`. **Not** `src/data/**`.

**Steps, in this order** (the order matters: gates first, audit last, so that a browser-lane failure at the very end cannot have invalidated earlier work).

1. **Verify what landed — build the table, do not trust the dispatch.** For each of the 8 tasks, confirm the claim against the file: context-loss handlers (`Viewer3D.tsx`, `SectionPiP.tsx`) · `PanelErrorBoundary` in `section/SectionErrorBoundary.tsx` + `AppErrorBoundary.tsx` + every panel wrapped · loader timeouts in `anatomyAssets.ts` / `imageLayers.ts` · `planeGeometry.ts` as the single transform with all consumers migrated (expect **zero** leftover private `AXIS_PAIR` / `nearestLevelTo` / `axisExtents` definitions — this review already confirmed zero) · perf caches · a11y changes. **Report anything claimed-but-absent.** Handle `p1-photofit` per **D1**.
2. **Housekeeping (QUALITY_PLAN §5).** Remove the ~15 dead exports / 2 dead CSS classes / 5 dead tokens of `AUDIT_REPORT.md` item 22 — **except `src/geometry/envelope.ts` itself** (live as the v1 per-slot fallback; only its 6 dead exports go). Start from the verified dead list in §0 (14 names confirmed dead by grep, each with exactly one self-hit); add `Viewer3D`'s 11-name re-export block and `SectionSliderBar`'s self re-export, which the audit names separately. Then split `SectionCanvas.draw()` into transform / layers / contours / overlays helpers and note the split in the file header. `tsconfig` has `noUnusedLocals`, so `npm run check` is the enforcement. **Before deleting a CSS token, grep for its `var(--…)` use** — dead-by-declaration and dead-by-usage are different claims, and plates may still consume them; if a token is used, keep it and say so.
3. **Make the browser audit self-sufficient — per D5**, including the `startServer.mjs` helper shared with `browser-acceptance.mjs` and `browser-probe.mjs`, the exit-code table (0/1/3/4), the Chrome preflight, and tree-kill cleanup on every path. Preserve the argv override.
4. **Extend the audit with the two P0 demos as permanent gates — per D7.**
   - **(a) Context loss.** The selector is known and stable: the overlay is `div.viewer-context-lost[role="alert"]` carrying **`data-context-lost={phase}`**, and it is **unmounted unless a loss is active** (so a healthy canvas is never covered — keep that property). Drive it with the real extension: obtain the WebGL context from the R3F canvas, call `WEBGL_lose_context.loseContext()`, then assert `[data-context-lost]` appears and reads `lost`; call `restoreContext()`; assert the overlay unmounts and the canvas holds a live, non-lost context (a forced redraw / non-blank pixel check). Insert after the `L7` block (`audit.mjs:793`) and before the `} catch (error) {` at line 795. Mirror the assertion for the PiP target (`SectionPiP.tsx` already exposes `pipContextState: { lost, restored }` — use it rather than inventing state). If the browser never restores, the code's own terminal state is `data-context-lost="dead"` with a Reload button — assert **that** instead of hanging, and say which branch fired.
   - **(b) Boundary containment.** Take route (a) or (b) of D7 and **say which**. Implement the forced-throw probe if you take the demonstration route; it must be dev-only and production-unreachable.
5. **Full acceptance on the current tree.** Gating (Node-only, must be green): `npm run validate` · `npm run check` · `npm run build` · `npm run verify:pipeline` · `npm run verify:plane` · `node scripts/verify/a11y-contract.mjs` · plus the three budget gates of D6 and the new script entries. **Attempted-and-reported (non-gating per D4):** `npm run verify:audit`, `npm run verify:acceptance` — the audit must report **0 failures** when it can run; report the exit code (0/1/3/4) truthfully.
6. **Regression pass over v1–v7.** Selection from 3D / tree / search / plate / syndrome; layers + filters; clip + snap including the four telencephalon levels **+48/+58/+68/+78**; explode; quality toggle; Learn-more links; PiP (slider-plane fix + restore control + real-slice backdrop); live section in **every** modality (Auto / MRI / CT / Photo / Simulated, including axis-aware Photo disabling and the honest CT cutoff — read the number from `src/assets/imaging/ct-manifest.json`, do **not** hard-code `+36.7`); plane sliders; keyboard plate selection; error boundaries; the context-loss overlay; **telencephalon picking + cortex-ghost default**. Fix what broke, additively.
7. **Commit** `git add -A && git commit -m 'fix: audit remediation closure — housekeeping, P0 demonstrations as permanent gates, self-sufficient browser audit'`. Confirm `git status` is clean afterwards and that `assets-src/`, `.bp3d-probe/`, `.plate-scratch/` stay gitignored and uncommitted (this review confirmed the `.gitignore` entries exist).

**Evidence contract — use ONLY these forms:**
- Files: real files, never directories. (Prior runs failed on `src/data/structures/` and `src/assets/imaging/stains` — both directories. Do not repeat that mistake.)
- Commands: Node-only, no external precondition. `npm run validate` / `check` / `build` / `verify:pipeline` / `verify:plane` and the `node scripts/…` gates are safe. **`npm run verify:audit` and `npm run verify:acceptance` MUST NOT appear** — that is the exact flaw that failed both previous attempts (**D4**).
- File `PLAN-run-mtwdi5rv-wn6n.md` must remain present and non-empty.

**Verification steps.** `npm run check` after the housekeeping deletions (this is what proves no live reference was removed) · `npm run build` after the `package.json`/audit edits · the two `git status` checks in step 7 · for the audit: re-run it once with the server already up (`node scripts/verify/audit.mjs http://localhost:5173`) and once cold, and confirm no stray `node`/`chrome` process survives either run (this review found Chrome smokes leave processes behind — verify with `Get-Process chrome,node`).

**Final message must contain:** the verification table (landed vs claimed, with the D1 correction stated plainly) · gate results for all seven · the **audit exit code and failure count** (or the environment reason it could not run) · the D7 route taken and what it does and does not prove · the housekeeping list (what was deleted, what was deliberately kept and why) · the commit hash.

---

### `v6b-qa` — reviewer

**Objective.** Final gate for the v6 closure: prove the P0 fixes bite, prove the gates can fail, verify the claimed-landed work, check budgets, run the regression, return a verdict.

**Depends on** `v6b-integration` (D8). **Write scope: read-only by default**; only conservative, individually justified fixes plus appended `docs/QA_CHANGELOG.md` / `docs/QUALITY_PLAN.md` §6 records. Never `git add -A`. `src/data/sectionImages.ts` and all `fit` values are out of scope.

**Steps.**

1. **Prove the P0 fixes bite.** (i) Confirm the context-loss handlers exist on **both** the main canvas and the PiP. (ii) **Negative test:** in a scratch copy, temporarily disable one handler, run the audit (if the browser lane is available) or the strongest available Node-only equivalent, and confirm the check **reports failure**; revert and show the tree is clean. (iii) Boundaries: confirm each major surface is wrapped, and that a thrown error is **contained** rather than blanking the app — strengthen the audit's demonstration if it is weak (D7). "Static inspection proves mounted, not that it catches."
2. **Prove the gates can fail** (the audit's own lesson — *verification code is code*). Mutate a constant `verify:plane` depends on (flip an axis mirror or shift an extent) **in a scratch copy**, confirm `verify:plane` fails, revert. Do the same for `verify:pipeline` if cheap. Report both with the exact observed failure text. Revert both and re-confirm green. **This is a required demonstration, not optional.**
3. **Verify the claimed-landed work.** `p1-photofit` honesty — per **D1**, the correct finding is that the deliverable **is** on disk and committed (`REGISTRATION_MEASURED` + `REGISTRATION_MEASUREMENT_NOTE`); confirm the *measurements* are honest by spot-checking a few `REGISTRATION_MEASURED` rows against the note's stated residual ranges, and that the "unmeasured-default" statuses agree with the 4 declared reasons. `p1-identity` — context ids addressable, the 8 previously-invisible tracts visible/selectable. `p1-content` — **0** records with empty `clinical`, `syn-one-and-a-half` present and resolving, and `CONTENT_INVENTORY.md` counts agreeing with the data (remember the data now holds **26** syndromes, not the plan's 24 — reconcile against the data, per D2).
4. **Budgets + gates.** Re-run, on the **post-integration** tree: tris ≤ 800 000 · anatomy GLB ≤ 14 MiB · imaging ≤ 10 MiB · `validate` / `check` / `build` / `verify:pipeline` / `verify:plane` green · `verify:audit` 0 failures (or the honest environment reason). Compare against §0's baseline so a regression is visible: tris **570 096**, GLB **13.12 MiB**, imaging **8.71 MiB**.
5. **Regression.** Full v1–v7 checklist, with special attention to (i) everything the housekeeping removal touched — are the removed exports referenced anywhere, are the removed CSS tokens still used by plates — and (ii) the v7 telencephalon work (ghost-cortex default, four new levels, **three** new plates, telencephalon picking, 46 region records).
6. **Strays.** Ensure `assets-src/`, `.bp3d-probe/`, `.plate-scratch/` remain gitignored and uncommitted; confirm no stray server/Chrome process is left running; confirm the tree is clean at the reported hash.

**Evidence contract — same rules:** real files only, no directories; Node-only commands only; **no `verify:audit` / `verify:acceptance` as gating commands.**

**Final message must contain:** the verdict · per-item results · **the two gate-bites-itself demonstrations with the exact failure text observed and the revert confirmation** · the D7 route and what it does/does not prove · honest limitations (including, if applicable, the exact sentence required by D7 when a forced throw was not performed).

---

## 4. Risks, flagged with mitigations

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | **The browser lane is unavailable** in whichever sandbox runs this, so `verify:audit` cannot be green and the run "fails" on an environmental command — the repeat of run-mtw7ces2-v4wt | **High** | D4: browser commands are **never** gating evidence. D5: distinct exit codes 3/4 make the distinction machine-readable. The audit's fix is still required because it is the durable remedy for the *server* half. |
| R2 | The integrator "verifies" `p1-photofit` against a false dispatch premise and either redoes landed work or writes a false "cannot be done" note | **High** | D1 spells out the measured truth (928 insertions, committed `REGISTRATION_MEASURED`) and the exact acceptable wording. |
| R3 | The D7(a) wrapper change shifts layout across 7 panels | Medium | D7 prefers (a) but mandates a full regression + audit layout re-check before accepting it, and prescribes reverting to (b) on any shift. `TransparentBoundary`'s `display: 'contents'` keeps the healthy wrapper layout-neutral, which is why (a) is viable at all. |
| R4 | Housekeeping deletes a "dead" symbol that is referenced dynamically (string lookup, barrel re-export) or a token still consumed by plates | Medium | `noUnusedLocals` in `tsconfig` catches TS references; it does **not** catch string/dynamic use or CSS usage — so grep each removed name and each `var(--token)` before deleting, and prefer keeping an item with a stated reason over deleting it. Also: keep `envelope.ts` itself (only its 6 exports go). |
| R5 | `git add -A` in the integrator's step 7 sweeps foreign or scratch files, or a parallel task's edits | Medium | D8 serialises QA behind integration. `dist/`, `.plate-scratch/`, `assets-src/`, `.bp3d-probe/` and the `_*` scratch roots are all already in `.gitignore` (verified). The integrator must confirm `git status` is clean and run the regression *before* committing. |
| R6 | "0 failures" is achieved by weakening a check instead of fixing the product | **High** — this is the stated lesson of `QUALITY_PLAN` line 5 | Both briefs forbid it explicitly. The QA task's step 2 (prove the gates can fail after the fact) is the structural defence: a gate that was silently weakened tends to stop failing when mutated. |
| R7 | Starting a dev server from inside the audit leaves a stray Vite holding :5173, which then poisons later runs (a stale server serving a *stale* build is how a "passing" audit can lie) | Medium | D5 item 5: synchronous `taskkill /pid <pid> /T /F` on every exit path incl. SIGINT/SIGTERM, plus `stdio: 'ignore'`. Verify with `Get-Process node,chrome` after a cold run. |
| R8 | Readiness probe uses `127.0.0.1` and never sees the IPv6-only Vite bind | Medium | D5 item 1: probe `localhost` (measured: `localhost` → 200, `127.0.0.1` → refused, `[::1]` → timeout). |
| R9 | `verify:plane`'s pre-existing coronal degeneracy note is "fixed" or silenced by an agent reading it as a failure | Low–Medium | D9 item 1: it is deliberate, printed, attributed and non-fatal. Report, do not touch. |
| R10 | The regression pass misses the v7 work because the dispatch's checklist undercounts it (42 records / 2 plates) | Medium | D2 corrects to **46** records / **3** plates / **26** syndromes and puts telencephalon picking + the cortex-ghost default explicitly on the checklist. |

---

## 5. What I did NOT verify (stated so nobody assumes otherwise)

- I did **not** run `verify:audit` or `verify:acceptance` against a live server, because no server was running and Chrome cannot start in this session (§0). I therefore have **no** first-hand evidence about the audit's 37+ existing checks passing on the current tree — only that the script's *content* covers sections A–L7 and that it contains **no** context-loss, boundary, ghost-cortex, one-and-a-half, or `aria-activedescendant` check (greps: `webglcontextlost` 0, `ErrorBoundary` 0, `context-lost` 0, `ghost` 0, `one-and-a-half` 0, `activedescendant` 0). The dispatch's claim that the P0 demos must be *added* as gates is therefore **confirmed**.
- I did **not** re-run the 8 tasks' individual work items end-to-end; I verified the *structural* claims by grep/diff/read and the numeric claims by running the gates.
- I ran `npm run build`, which rewrote `dist/`. `dist/` is gitignored; `git status` is clean.
- I could not run the full `swarm_status`-evidence chain to the run store (the run records are not in a file I could locate under `C:\Users\tsing\.dsh`), so my D4 conclusion about the prior run rests on the `swarm_status` message itself — which is explicit and quotable.
