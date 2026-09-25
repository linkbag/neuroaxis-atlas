# NeuroAxis v19 — robustness / performance audit (memory · disposal · errors · workers · persistence · edge cases)

**Area:** `robustness` · **Auditor:** builder (robustness/performance lane) · **Run:** `run-muf4frwh-rz8s`
**Findings:** `docs/audit/v19/robustness.findings.json` (30 findings, all 12 schema keys, enum-valid)
**Product edits:** none. This file, the findings JSON and the mandated `.dsh-swarm/task-audit-robustness.json` completion report are the only files this task wrote — no file under `src/`, `scripts/` or `package.json` was touched.

---

## 0. Verdict / severity summary

| verdict | critical | major | minor | total |
| --- | ---: | ---: | ---: | ---: |
| `ok` | 0 | 0 | 14 | **14** |
| `wrong` | 0 | 5 | 2 | **7** |
| `suspect` | 0 | 0 | 9 | **9** |
| `unverifiable-here` | 0 | 0 | 0 | **0** |
| **total** | **0** | **5** | **25** | **30** |

| basis kind | count |
| --- | ---: |
| internal (contradiction with another record/check/doc/code path) | 27 |
| standard (three.js / react-three-fiber documented contract) | 2 |
| judgment (labelled as such) | 1 |
| textbook / nomenclature | 0 (not applicable to this area) |

**The five majors, in one line each**

| id | verdict | subject |
| --- | --- | --- |
| `rob-001` | wrong | `TractTube`'s "one shared frame driver" token is a per-instance ref → all 149 mounted tubes dispatch the whole registry every frame (22,201 `stepTractFrame` calls/frame) and the documented fade lerp is applied 149×/frame (remaining fraction `5.5e-10` = a one-frame snap). |
| `rob-002` | wrong | `verify:budget-report`'s "rendered triangles 599,204 ≤ 800,000" counts the manifest only; the 149 procedural tubes add 214,560 tris → the all-on scene draws **813,764** triangles, **13,764 (1.72 %) over the cap it reports as PASS**. |
| `rob-003` | wrong | The 12 `#mirror` nerve contour parts are built, transferred (0.308 MiB) and sliced on every plane, then dropped: no canvas meta matches a `#mirror` slug, so the 2D live section and the PiP paint every paired cranial nerve on **one side only**. |
| `rob-004` | wrong | `registrySentRef` latches after the first send, so the anatomy loader's retry (a shipped, visible feature) can never reach the contour worker: after a successful retry the canvas stops saying it is loading **and** paints without the recovered structures. |
| `rob-021` | wrong | `SectionCanvas` appends only `registryNerveParts()`, so the **79 vessel registry parts** (2.08 MiB of copies, 41 metas already in the canvas' visible list) are built and proven and never sent — the v17 open handoff, confirmed live. |

Severity rubric applied: **major** = a shipped, user-visible claim is measurably false or a documented mechanism is measurably not implemented (no crash needed); **minor** = bounded cost, silent-drift, missing recovery affordance, or a checked-and-held contract; **critical** = would have been a data-loss/crash/blank-surface class. None found in this area.

---

## 1. Method — what was measured, not opined

Commands actually run in this session (tails quoted below):

| command | exit | what it printed |
| --- | ---: | --- |
| `npm run verify:budget-report` | 0 | `manifest: 138 part(s)` · `✓ rendered triangles 599,204 ≤ 800,000` · `✓ committed GLB payload 13.82 MiB ≤ 14 MiB` · `✓ imaging payload 9.02 MiB ≤ 10 MiB` · `Σ parts[].triCount = 599,204` · `5 passed · 0 failed · 5 informational` |
| `npm run verify:area-toggles` | 0 | `472 assertions passed · 0 failed`; `[2D domain] … procedural vessel parts 41 (41 courses) = 191 on the canvas`; `[2D worker] nerve 12 authored + 12 mirrored = 24 · vessel 41 authored + 38 mirrored = 79 · both families 103 part(s)`; `[2D mirror] example: nrv-cn3-oculomotor#mirror authored x [-0.494, 24.314] → twin x [-24.314, 0.494]`; `ok SectionCanvas.tsx hands the worker the procedural families it appends (v17: the vessel family is the open handoff) = ["registryNerveParts"]` |
| `npm run verify:pipeline` | 0 | `pipeline: 138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)`, per-plane slice 2–9 ms, `heap 11MB…20MB` |

Measurements taken through the repo's **own** in-process TS loader (`node:module registerHooks` + the project's TypeScript, the pattern every gate uses — no product file touched, no file written outside this report pair). What was read/executed:

* **Shipped tables and predicates:** `NERVE_COURSES` (12), `VESSEL_COURSES` (41), `tracts` (23), `structures` (264), `VESSEL_COURSE_SOURCES`, `isPairedVessel`, `SceneLayers.isStructureVisible/isTractVisible/nerveCoursesVisible/vesselCoursesVisible/isEnvelopeSlotVisible/isGhostShellVisible`, `partsForCanvas`, `SECTION_PARTS/NERVE/VESSEL`, `registryNerveParts/registryVesselParts/registryCoursePartsAll`, `buildTractGeometry/tubeGeometryFor`, `contours.extractContours/partBounds/boundsMayCut`, `state/store` (`DEFAULT_LAYERS`, `VIEW_PRESETS`, `viewPresetOf`, the six `neuroaxis.*` keys).
* **The committed GLBs directly** (glTF JSON chunk → accessors/bufferViews): 138 parts, **298,734 vertices** (3.42 MiB of Float32 positions) and **1,797,612 indices** (6.86 MiB of Uint32), 599,204 triangles.
* **The installed renderer** (`@react-three/fiber` 8.17.10 `dist/events-*.esm.js`, `three` 0.169 `three.module.js`) for the disposal contract, and **the built bundle** (`dist/assets/index-DayLESCm.js`) for the production-safety claim.
* **`git show --stat`** on `51b6bee · 805b5f6 · fd7c9f6 · 84c666b · 54d75a1 · 8d80572` to answer "did the v16–v18 changes touch the context-loss path?" (they touch `SectionCanvas.tsx`, `store.ts`, `SceneLayers.tsx`, `TractTube.tsx`, `sectionAssets.ts`, `vasculature-courses.ts`, `anatomyAssets.ts` — not `Viewer3D`'s context-loss wiring).

**Not run (and never claimed):** `verify:browser`, `verify:acceptance`, `verify:audit` — Chrome cannot start in this sandbox, so every *pixel* and *pointer* consequence below is stated as a code-path consequence, and browser-only confirmation stays with the orchestrator.

### Measured scene composition (all layers on)

| quantity | value | how |
| --- | ---: | --- |
| tube instances mounted | **149** (46 tract · 24 nerve · 79 vessel) | shipped tables + `isTractVisible` + pairing rules |
| tube instances at the default framing | **70** (46 + 24; vasculature region off) | `store.DEFAULT_LAYERS` |
| per-tube geometry | 803 verts · **1,440 tris** · 52.6 kB CPU-side | `buildTractGeometry` |
| tube triangles (all-on) | **214,560** | 149 × 1,440 |
| manifested triangles | **599,204** (138 parts) | manifest + gate |
| **scene total (all-on)** | **813,764** vs cap 800,000 | over by **13,764 (1.72 %)** |
| tube geometry cache | **149 keys / 6.248 MiB** CPU-side (2.935 MiB at default) | `tubeGeometryFor` cache |
| worker registry actually sent | **162 parts** = 138 GLB + 24 nerve; **10.90 MiB** copied (10.28 + 0.616) | `registryNerveParts()` + `registryPartFromGeometry` |
| vessel registry never sent | **79 parts / 2.08 MiB** | `registryVesselParts()` (call site absent) |
| body meshes drawn | **442** NucleusMesh instances (240 records admitted) + 10 envelopes + 2 ghost shells + 32 somatotopy patches | `anatomySlugsForRecord` + the pairing rule |
| fallback (v1 ellipsoid) records | **133 of 240**, all with `origin3d` (0 exceptions) | census over the shipped tables |
| one full slice (162 parts) | **3.6 ms mean / 6.9 ms worst** over 76 transverse planes (15 Hz budget = 66.7 ms) | executing `contours.extractContours` on the real GLB + nerve data |
| "All off" state | 0 structures · 0 tracts · 0 envelopes · no ghost shell · `viewPresetOf → null` | shipped predicates with empty sets |

---

## 2. Findings by brief subsection

### 2.1 Memory / disposal

* `rob-012` **(ok, standard)** — the disposal question answered from the renderer, not the comments. R3F 8.17.10's `removeRecursive` walks only **declaratively attached** objects (`child.__r3f.objects`, `child.children`) and calls `dispose()` only when the object has one; `applyProps` assigns prop values directly (`currentInstance[key] = value`), and `THREE.Mesh` has no `dispose` in three 0.169. Therefore **prop-passed geometry/material are never auto-disposed** — which is exactly what the module-level caches need — and the explicit `useEffect(() => () => material.dispose(), [material])` in `NucleusMesh.tsx:168` and `TractTube.tsx:446` is the complete disposal of the per-instance materials. `PlaneHelpers` relies on the opposite behaviour for its JSX children and correctly marks the shared line grid `dispose={null}`; `SceneEnvironment` disposes its PMREM RT + `RoomEnvironment` + generator. Never-disposed module singletons (10 envelope materials + geometries, 2 ghost materials, 16 patch materials + 1 disc, 3 helper sheets, striation texture + ≤5 clones, ventricle cache) are app-lifetime by explicit decision.
* `rob-013` **(ok, minor)** — the tube cache is bounded *by the authored tables*: 149 keys / 6.248 MiB all-on, 2.935 MiB at default, ≤152 keys ever. The key is caller-supplied (`tubeGeometryFor(record, cacheKey)`), so the bound is a convention today, not an enforced invariant.
* `rob-001` **(wrong, major)** — the frame-driver registry is the one real defect in this subsection: the token lives in a per-instance `useRef`, so the "exactly ONE driver" contract the file documents is not implemented, with both a per-frame cost and an animation consequence (details in §0).
* `rob-014` **(suspect, minor, standard)** — `clearAnatomyAssetCache()` drops cached `BufferGeometry` references with no `dispose()`, so a timed-out-then-recovered slug can leave two GPU-resident geometries (three.js requires an explicit `dispose()` when a geometry is no longer used; the module's own "handed out" exemption does not cover an abandoned attempt).
* `rob-017` **(ok, minor)** — no leak or double-register across re-mounts: one worker per mount, `terminate()` in the cleanup, `registrySentRef`/`workerReadyRef` reset at mount, registry slugs unique (103/103), rAF and the 15 Hz timer cleared on unmount, Path2D cache emptied. Only **one** SectionCanvas exists at a time (tabs are exclusive), so the 10.9 MiB registry is never duplicated across two workers.

### 2.2 WebGL context loss

* `rob-010` **(ok, minor)** — the documented v7/v9 contract is intact in the shipped source: listeners bound through a callback ref before the first frame; `event.preventDefault()` on loss (mandatory, else no `webglcontextrestored`); `data-context-lost="lost"` → 20 s → `"dead"`; restore re-applies `resetState` + clipping + ACES + sRGB + the clip planes and bumps `envGeneration`/`sceneGeneration`; `PostFX` returns `null` while lost (the measured `getContextAttributes().alpha` crash cannot re-occur); `CanvasSceneBoundary` contains in-canvas throws so the overlay survives. The simulated-section panel is a **DOM sibling** of `<Canvas>` (asserted by `verify:pip-contract`'s source-offset check and by rendering the panel with `react-dom/server`), so a GL loss cannot touch it. `git show --stat` proves v16–v18 never touched this path; `verify:closure-bite` bites removal of the attribute (gate-protected).
* `rob-011` **(ok, minor)** — `CanvasContextRecovery` writes `setFrameloop` into the R3F root state with no cleanup; verified safe because that state object dies with `<Canvas>` and `App.tsx` mounts `Viewer3D` only on the 3D tab, so a fresh mount starts at `'always'`.

### 2.3 Error handling

* `rob-004` **(wrong, major)** and `rob-005` **(wrong, minor)** — the anatomy loader's timeout/retry half: the canvas' one-shot registry latch, and the file's own "a late-arriving stale parse is ignored — the attempt counter below" claim (there is no attempt counter; the stale parse **does** write the cache and **can** delete the newer in-flight entry).
* `rob-018` **(ok, minor)** — GLB failure classes all degrade as documented (unknown slug → immediate fallback; unresolved url / parse rejection / no mesh node → `catch` + in-flight drop so a later mount retries; timeout → `timedOut: true` + the retryable notice).
* `rob-019` **(ok, minor)** — the imaging loader is bounded end to end: `AbortController` + 15 s (`GRID_LOAD_TIMEOUT_MS`) + a first-class `'timeout'` state + `retryGridLoad`; plate decodes have `PLATE_LOAD_TIMEOUT_MS` with a distinct `'timed-out'` state and `retryPlateImage`; the slice cache is charged `w·h·4` with oldest-first eviction to 24 MiB. Honest limit (documented): an `<img>` request cannot be aborted, so the state is terminal but the socket is not cancelled. No gate exercises the timer paths.
* `rob-009` **(suspect, minor)** — `?panelfail`: the defence is real (measured in `dist/`: the inlined env is `DEV:!1`, so `panelFailTarget()` returns `''` before reading the URL), but the comment's stated *method* ("asserted by grepping the built bundle for `panelfail`") is performed by no gate and would **fail as written**, because the built bundle legitimately contains `panelfail` once and the probe message once. Untested claim.
* `rob-008` **(suspect, minor)** — a contour-worker failure (`{t:'error'}`, `onerror`, `onmessageerror`) sets `workerAliveRef = false` and there is no restart and no Retry control: the canvas keeps its last slice, refuses every later plane, and the only recovery is a tab switch. Every other failure surface in this app pairs its message with an action.

### 2.4 Workers

* `rob-015` **(ok, minor)** — the 15 Hz / 0.25 au contract is implemented on both sides (single pending slot, ack-driven re-pump, one window timer, single `desired` slot in the worker, 24-entry LRU, `computing` guard + `try/catch` that resets both flags), and one slice is ~10× inside the budget: **3.6 ms mean / 6.9 ms worst** over 76 transverse planes for the 162-part registry the canvas actually sends (`verify:pipeline` independently prints 2–9 ms/plane for the 138 GLB parts).
* `rob-016` **(ok, minor)** — transferable ownership is safe by construction: `registryPartFromGeometry` always allocates **fresh** `Float32Array`/`Uint32Array` copies (with an accessor fallback for unpacked layouts), so `postMessage(init, 276 transfer entries)` can only detach copies — the 3D scene's cached GLB attributes can never be detached, and a remount re-sends fresh arrays. Cost: 10.90 MiB copied on the main thread once per canvas mount.
* `rob-003` **(wrong, major)**, `rob-021` **(wrong, major)**, `rob-017` **(ok, minor)**, `rob-030` **(ok, minor)** — the registry questions the brief asked: the mirrored twin **is** correctly keyed (`id#mirror` returns a distinct, x-reflected geometry: `[-0.494, 24.314] → [-24.314, 0.494]`, stable across calls, 103/103 unique slugs), it does **not** double-register on re-mount — but its contours are **never painted** (`rob-003`), and the vessel family is **never sent** at all (`rob-021`, the v17 open handoff, confirmed live by the gate's own printed assertion `["registryNerveParts"]`).

### 2.5 Persistence

* `rob-022` **(ok, minor)** — all six `neuroaxis.*` keys (`quality`, `viewPreset`, `sectionUnderlay`, `sectionLobes`, `sectionPipSize`, `sectionPip`) have validated, **total** read paths and `try/catch`ed writes: unknown enum strings fall back to defaults, `viewPreset` is `hasOwnProperty`-checked, `sectionUnderlay` parses field-by-field (v3 payloads migrate; a legacy sub-1 opacity is lifted by the v16 migration; writes stamp `schemaVersion: 2`), `sectionLobes` is strictly `'1'`/`'0'`, `sectionPipSize` goes through `clampSectionPipSize` on read **and** on every drag frame, `sectionPip` is strictly `'visible'`/`'hidden'`. Nothing else in `src/` writes a `neuroaxis.*` key.
* `rob-023` **(suspect, minor)** — `sectionUnderlay.windowMin/windowMax` are the only persisted numbers with **no** range/ordering clamp; the consumer's `windowMap` is deliberately total, so an inverted or absurd window degrades to a **constant** (all-black or all-white) "real imagery" base plate with a credit line, which is the opposite of the loader's stated honest-fallback style.
* `rob-024` **(suspect, minor)** — `neuroaxis.viewPreset` is written by exactly **one** control (the Clinical motor button: `Header.tsx:414` — the v12 preset row is gone and no Reset button is rendered) but applied **wholesale at boot**: a legacy value keeps overriding whatever the user builds with the Areas/Systems rows, and manual layer combinations are session-only. The Header docstring that describes "Reset" and an all-on preset write is itself stale prose.

### 2.6 Edge cases

* `rob-025` **(suspect, minor, judgment)** — "All off" is **safe** (0 structures / 0 tubes / 0 envelopes / no ghost, `viewPresetOf → null` so the Clinical motor button cannot lie) but **silent**: a grep of `src/` finds no empty-state copy anywhere, so two clicks land the user on an empty 3D pane with only the orbit hint. The canvas already owns the exact slot pattern for such a notice (the loading banner).
* `rob-026` **(ok, minor)** — rapid Areas/Systems toggling is order-independent and batched: one fresh `Set` per store write, ≤7 writes per click, React 18 batches them into one render, consumers are memoized on the set identities, meshes are keyed so React reuses instances, and the 2D surface's redraws coalesce into one rAF.
* `rob-027` **(ok, minor)** — selecting a structure whose mesh failed to load works (the v1 primitive is a real, pickable mesh with handlers; 133 such records, all placed by `origin3d`), a **missing `origin3d`** never reaches the body pass as a unit sphere at the world origin (30 of 264 records lack one, and the 11 of those that also have no committed body are all excluded by `isGhostOrContentOnly`), and a zero anchor cannot produce NaN (`explodeDirection([0,0,0]) → [0,0]`).
* `rob-020` **(ok, minor)** — a plane outside every photograph's anchor uses the coded `'no-anchor'` branch (and `'beyond-source'` states the measured CT apex from the one shared `ctCoverageStatement`), so the simulated section is never passed off as imagery; `verify-imaging-v4`/`-v4b` and `verify:audit-checks` cover the invariants.

### 2.7 Performance

* `rob-002` **(wrong, major)** — the triangle budget measures the manifest, not the scene (§0).
* `rob-028` **(suspect, minor)** — ≈**635 drawables** in the all-on scene (442 body meshes + 149 tubes + 10 envelopes + 2 ghost shells + 32 patches), each body/tube instance owning its own material, and **no gate counts meshes, materials or draw calls** — the budget table is triangles and bytes only, so a change that doubled the instance count would stay green.
* `rob-029` **(suspect, minor)** — `Viewer3D`'s panel hint runs an unconditional 60 Hz `requestAnimationFrame` loop comparing a `textContent` against a value published at ≤1 Hz (and whose producer has a self-stopping tick right next door); its justifying comment ("the in-canvas renderer writes every frame") is stale since the v9 removal of that renderer.
* `rob-015` **(ok, minor)** — the 15 Hz plane path itself is comfortably inside budget (measured above).
* `rob-001` **(wrong, major)** — the per-frame tube animation is the one place where the frame cost is N× the documented value.

---

## 3. Direct answers to the items the brief singled out

1. **"Does the 77/40 count still hold?"** — **No.** Measured on the shipped tables: **41 authored vessel courses / 79 registry parts / 103 both families / 41 vessel metas / 191 canvas metas**; `VESSEL_COURSE_SOURCES = { courses: 41, builtInIds: 2, authoredIds: 37, replacedIds: 2 }`, 38 of the 41 paired. `verify:area-toggles` **prints those live numbers** in its `[2D domain]`/`[2D worker]` info lines (which is why its formula-based assertions pass) while its closing summary and README L545/L591/L1410/L1480 still say 40 / 77 / 101 / 190 → `rob-006`.
2. **D4 (vessel contours ready-but-unpainted)** — **confirmed open, measured**: `registryVesselParts()` returns 79 parts totalling 2.08 MiB while `SectionCanvas.tsx:2126` appends only `registryNerveParts()`; the gate asserts this state verbatim. Routing: `rob-021` (integrator decides land-the-line vs record-open; landing flips a pinned area-toggles assertion, i.e. a D7 gate-flip handoff).
3. **Disposal** — every `useMemo`'d per-instance material has a matching `dispose` (`NucleusMesh`, `TractTube`) or is R3F-owned (declarative children in `PlaneHelpers`); the shared caches are safe **because** R3F never disposes prop-passed resources (proved against the installed bundle, not assumed) → `rob-012`, `rob-013`, `rob-014`.
4. **Context loss** — the overlay path, the PiP/SectionCanvas survival and the PostFX guard are all intact and untouched by v16–v18 → `rob-010`, `rob-011`. The browser half stays orchestrator-only in every case.
5. **Persistence** — six keys, all validated and total; the two soft spots are the unclamped imaging window (`rob-023`) and the stale single-writer `viewPreset` (`rob-024`).
6. **Workers** — the request/response contract holds under rapid plane changes and transfers are copies, so nothing is detached; the defects are downstream of the worker (what the canvas does with the results): `rob-003`, `rob-004`, `rob-008`, `rob-021`.
7. **Edge cases** — All-off is safe but unexplained (`rob-025`); rapid toggling is sound (`rob-026`); failed-mesh selection and missing `origin3d` are sound (`rob-027`); the off-anchor plane is honest (`rob-020`).

---

## 4. What this audit cannot establish

* **No pixel, no pointer, no real GL context.** Chrome cannot start in this sandbox, so the *visible* consequences of `rob-003` (a one-sided nerve in the live section), `rob-001` (a snapping fade), `rob-025` (an empty viewport) and `rob-028` (real draw-call counts) are **code-path conclusions with measured inputs**, not screenshots. `verify:browser`, `verify:acceptance` and `verify:audit` remain orchestrator-only.
* **No real `Worker`, no `webglcontextlost` event** can be raised here: `rob-017`'s "exactly one worker" and `rob-010`'s overlay behaviour are read from the shipped code plus the gates that pin the DOM contract; the runtime event sequence itself is unverified here.
* **No memory profiler.** The MiB figures are the exact byte sizes of the arrays/geometries the code allocates (computed from the committed data and the shipped builders), not a heap measurement in a browser; GPU-side residency is inferred from what is uploaded, not observed.
* **No source-verified literature / no re-bake.** Nothing in this area required either: every finding rests on the repository's own code, data, gates or the installed libraries' documented contracts. No GLB, bounding box or authored record was modified, and none needed to be.

---

## 5. Gate status seen by this task

Green as run here: `verify:budget-report` (0), `verify:area-toggles` (0, 472 assertions), `verify:pipeline` (0). The remaining gates in the run's §5 sweep belong to the integrator/final-review sweep; this task claims no result for any gate it did not itself execute, and none for the browser lanes. Note the two pinned-prose items this audit hands over: `rob-006` (stale 40/77/101/190 prose in README + the area-toggles closing summary) and `rob-021` (the vessel-contour open handoff, whose assertion flips the moment the one-line registry append lands — D7 handoff).
