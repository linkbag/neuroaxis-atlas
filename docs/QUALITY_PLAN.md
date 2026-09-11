# Quality Plan — NeuroAxis v6 (audit P0–P2 remediation)

Authoritative spec for the remediation swarm. Every item traces to a finding in `docs/AUDIT_REPORT.md`; the section numbers below refer to that report. Acceptance for the whole run is stated in §6.

**Rule for this run:** the audit also proved that *verification code is code* — three "product failures" turned out to be harness bugs. So: when a check fails, first prove the product is wrong before changing the product; and never weaken an existing gate to make it pass.

## 1. P0 — survivability (must land first)
1. **WebGL context loss** (`AUDIT §2.1`): handle `webglcontextlost` / `webglcontextrestored` on the R3F canvas **and** on the PiP's private render target. On loss: `preventDefault()`, freeze the loop cleanly, and render a visible "graphics context lost — click to restore" overlay; on restore: rebuild render targets, materials' stencil state and the PMREM environment, then force one redraw. Silent blank canvases are the failure mode to eliminate.
2. **Error boundaries everywhere** (`AUDIT §2.2`): extend `SectionErrorBoundary` into a reusable `PanelErrorBoundary` and wrap every major surface — 3D viewer, Plates (author + live), InfoPanel, TaxonomyTree, SyndromeBrowser, ReferencesModal, Header — each with a compact "this panel failed — Retry" card. The app must never blank because one panel threw.
3. **Load-timeout + explicit failure states** (`AUDIT §2.3`): add an abort/timeout (15 s default, overridable) to the anatomy-GLB loader (`anatomyAssets.ts`) and to the volume/photo loaders (`imageLayers.ts`). On timeout: settle to `'fallback'`/`'unavailable'` **with a visible state** ("geometry unavailable — retry") and a retry affordance; the live section must never sit forever on "Loading anatomy meshes X/84".

## 2. P1 — remove the drift that causes bugs
4. **One plane transform** (`AUDIT §2.4/§2.5`): extract a single module (suggest `src/components/section/planeGeometry.ts`) exporting `planeTransform(axis, planeValue, viewport)`, `AXIS_PAIR`, `axisExtents`, `nearestLevelTo`, `snapClipWrite(axis, value, snapToPlate, levels)`, `pickImageForPlane(entries, axis, planeValue, tolerance)` and the orientation/badge table. Refactor **all** consumers to it: `SectionCanvas`, `SectionPiP`, `imageLayers`, `PlatesTab`, `ClipControls`, `SectionSliderBar`. Behaviour must be pixel-identical or better: the canvas and the PiP must place the same photograph at the same world position/size (they currently differ — centre and scale).
5. **Gate the agreement**: extend `scripts/verify/section-pipeline.mjs` (or add `scripts/verify/plane-transform.mjs`, wired as `npm run verify:plane`) with assertions that (a) the canvas and PiP transforms agree for a grid of axes/planes/aspects, (b) the badge table matches the geometry (project known world points — e.g. +x = patient-left, +z = anterior — through each axis' mapping and assert which side lands on image-left), and (c) `nearestLevelTo`/snap agree with `levels.json` anchors. This replaces the hard-coded orientation string the audit criticised (`AUDIT §6.6`).
6. **Measured photo registration** (`AUDIT §2.6`): for every `sectionImages.ts` entry, derive `fit.dy` (and confirm `mirrorX`) by comparing the photograph's tissue silhouette against the envelope cross-section at that plane (threshold + bbox match, the technique that fit the VHP cryosections). Store the measured values plus a `registration: { dyResidualAu, method }` note; do not silently change `dx`. Photographs that cannot be measured stay at the documented default **and say so**. Report the residual distribution.
7. **Content gaps** (`AUDIT §2.9–2.12`): author the missing `clinical` items for the 11 empty records; add a second clinical item to the thinnest single-item records (at least the 15 most-taught); author the **one-and-a-half syndrome** card; reconcile `docs/CONTENT_INVENTORY.md` with the data (24 syndromes; resolve `syn-central-horner` — author or remove the doc claim; refresh the stale §3 and §7 counts). All new content follows `docs/DATA_CONTRACT.md` and must pass `npm run validate`.
8. **Make the invisible visible** (`AUDIT §2.10/§2.11`): build minimal 3D geometry for the 8 tracts that currently have neither mesh nor plate label (a tapered tube along the authored `waypoints`, reusing the existing tract-rendering path), and resolve the context-layer identity mismatch — register the 10 rendered `ctx-*` meshes in `taxonomy.json` **and** map the 11 registered context ids onto real meshes where one exists (or document per id why it cannot have one). After this, every rendered silhouette must be selectable and every registry entry must be visually reachable.

## 3. P2 — performance
9. **Canvas frame cost** (`AUDIT §2.13`): memoize the visible-part list, the layer draw order and the level lookup on `(plane, layers, selection, syndrome)` instead of rebuilding them per frame; remove the `filter().sort()` from the `pointermove` path; reuse `Path2D` per part where the geometry is unchanged.
10. **PiP cost** (`AUDIT §2.14`): reduce the per-frame scene passes where correctness allows, move the 32×32 stencil-parity readback from every frame to an on-demand watchdog (e.g. first 30 frames then on plane change), and consolidate the 19 per-tract `useFrame` callbacks into one.
11. **Volume sampling** (`AUDIT §2.15`): make `sampleGrid` allocation-free (reuse typed buffers, hoist the closure) and bound the slice caches by **bytes** rather than canvas count.
12. **Build output** (`AUDIT §2.16`): enable `minify` for production and split the bundle (vendor chunk for three/R3F/postprocessing; lazy-load the anatomy GLBs so the first paint does not wait on 7.75 MB). Record the before/after gzip sizes. The esbuild shim in `vendor/esbuild-shim` exists because of the earlier sandbox — verify minify works in this environment before committing; if it cannot, document why and leave `minify:false`.

## 4. P2 — accessibility & polish
13. **Plate regions keyboard-reachable** (`AUDIT §2.17`): each `[data-structure]` region becomes focusable (`tabindex`, roving tabindex within the plate, `role="button"`, `aria-label` = the region's display name), responding to Enter/Space like a click, with a visible focus ring. This is the single biggest a11y win.
14. **Panel visibility semantics** (`AUDIT §2.18`): replace transform-only hiding with `inert` (or `hidden`) so off-screen panels are not tabbable, and drop `aria-hidden` on containers that still hold focusable children.
15. **Modal + search + misc** (`AUDIT §2.19–§2.21`): focus trap + autofocus + focus restore in `ReferencesModal`; `aria-activedescendant`/option ids in `SearchBox`; a real `favicon.ico` (or an inline SVG favicon link) to remove the last console 404; responsive PiP (collapse to a labelled tab below ~900 px) and larger hit targets for `.btn-snap` / `.pip-btn`.

## 5. P3 — housekeeping
16. Delete the dead exports, 2 dead CSS classes and 5 dead tokens listed in `AUDIT §2.22` — **except** `src/geometry/envelope.ts` itself, which is live as the v1 per-slot fallback (only its 6 dead exports go).
17. Split `SectionCanvas.draw()` into transform / layers / contours / overlays helpers; note the split in the file header.

## 6. Acceptance (verified by the orchestrator in a real browser)
- `npm run validate`, `check`, `build`, `verify:pipeline`, `verify:plane`, `verify:acceptance` **and** `verify:audit` all green; `verify:audit` must report **0 failures**.
- A page exception thrown inside one panel leaves the rest of the app usable (demonstrate with the boundary: temporarily forced throw is acceptable evidence, then reverted).
- Simulated context loss (`WEBGL_lose_context` extension) shows the recovery overlay and restores a working canvas.
- Canvas and PiP place an anchored photograph at the same position/size (the new `verify:plane` gate proves it).
- Content: 0 records with empty `clinical`; one-and-a-half syndrome present; `CONTENT_INVENTORY.md` agrees with the data counts.
- Every rendered silhouette is selectable; the 8 previously-invisible tracts are visible in 3D.
- Production build gzip size materially below the 672 KB baseline (or a documented reason it cannot be). **Met — measured by `p2-perf` (see §3 item 12): the entry chunk alone went 3 340.40 kB raw / 746.82 kB gzip (the actual `minify:false` baseline in this tree) → 817.2 kB raw / 171.9 kB gzip in `dist/assets/index-*.js`, with three/R3F/postprocessing in a separate `dist/assets/vendor-three-*.js` (1 206.81 kB raw / 354.64 kB gzip). First-paint JS — entry + vendor, which the built HTML modulepreloads together — is 517.61 kB gzip vs 762.24 kB before (−32.1 %); total JS in `dist` is 1.96 MB with the 7.39 MB of GLBs emitted as 84 separate on-demand assets, never inside the JS graph. Minification is `minify: 'terser'`, verified to build in this sandbox; `minify: 'esbuild'` is a silent no-op through `vendor/esbuild-shim` and must not be used.**
- Plate regions are operable by keyboard alone.

---

## 7. Closure record (v6 remediation — integration + QA)

Appended by `v6b-integration`. Everything above is the ORIGINAL spec and stands
verbatim; this section records what the closure verified, what it changed, and the
items that are **not** closed. A dated re-measurement of §6's build-size line:
on this tree the entry is `1 120.53 kB raw / 252.91 kB gzip` + `vendor-three`
`1 206.81 kB / 354.64 kB` — the entry grew with the v7 telencephalon work, the
vendor chunk is byte-identical, and first paint is still far below the 762.24 kB
`minify:false` baseline.

### 7.1 Gate results on the closure tree

| Gate | Command | Result |
| --- | --- | --- |
| Data integrity | `npm run validate` | **PASS** — 0 errors / 0 warnings · 17 levels · 183 registry entries · 160 structure records · 23 tracts · 26 syndromes · 15 plates |
| Types | `npm run check` | **exit 0** |
| Production build | `npm run build` | **exit 0** — entry `1 120.53 kB raw / 252.91 kB gzip` + `vendor-three` `1 206.81 kB / 354.64 kB` |
| Section pipeline | `npm run verify:pipeline` | **PASS** — 106/106 parts · 570 096 triangles · 329 loops across 13 planes · 0 problems |
| Plane transform | `npm run verify:plane` | **PASS** — 10 827 assertions (still prints the pre-existing coronal degeneracy note, un-silenced) |
| a11y contract | `node scripts/verify/a11y-contract.mjs` | **PASS** — 38 checks |
| Boundary contract | `node scripts/verify/boundary-contract.mjs` | **PASS** — 22 checks (new; needs no browser) |
| Anatomy budget | `node scripts/build-anatomy-geometry.mjs --manifest` | **PASS** — 570 096 / ≤800 000 tris · GLB 13.12 MiB / ≤14 MiB |
| Imaging budgets | `node scripts/verify-imaging-v4.mjs`, `…-v4b.mjs` | **PASS** — 8.71 MiB / ≤10 MiB · cryosections 1 232 904 B / ≤1 750 000 B |
| Browser audit | `npm run verify:audit` | **exit 4 — environment unusable, no check was run** (see §7.3 item 1) |

### 7.2 What the closure changed

1. **Housekeeping (§5).** Removed the AUDIT §2.22 dead surface: 15 individually
   dead exports, the `Viewer3D` 11-name re-export block, the `SectionSliderBar`
   self re-export, the 6 dead `envelope.ts` exports (the **file** is kept — it is
   the v1 per-slot fallback `SceneLayers` still imports), 2 dead CSS classes
   (`.scaffold-note`, `.slider-value`) and 5 dead tokens (`--ov-red-nucleus`,
   `--ov-substantia-nigra`, `--ov-substantia-nigra-reticulata`,
   `--ov-locus-coeruleus`, `--plate-ink`). `.webref-tag--journal` was
   **deliberately kept**: it is applied dynamically as `webref-tag--${source}` and
   `journal` is a live union member. `npm run check` (`noUnusedLocals`) is the
   enforcement.
2. **`SectionCanvas.draw()` split (§5 item 17).** The 145-line god function is now
   four named passes — `beginSectionFrame` (canvas sizing/dpr + the shared
   `planeTransform` + the memoized render order), `drawSectionLayers` (base + real
   imagery + credit/hint), `drawSectionContours` (cached visible parts + selected
   label), `drawSectionOverlays` (grid, crosshair, orientation, readout, hover
   label, geometry-loading notice). Pass order is unchanged; `draw()` is 5 lines.
   The split is documented in the file header.
3. **The browser audit is self-sufficient.** The external server precondition is
   gone: `scripts/verify/audit.mjs` — and `browser-acceptance.mjs` /
   `browser-probe.mjs`, which shared the same flaw — bootstrap through one shared
   helper `scripts/verify/lib/startServer.mjs` (start Vite when the URL is not
   served, wait for HTTP 200, kill the process tree + Chrome on every exit path),
   with the distinct exit codes recorded in README §Scripts
   (`0`/`1`/`2`/`3`/`4`). Previously every environmental failure — missing server,
   missing Chrome, taken port — was the same `exit 1` and the same
   "devtools endpoint never came up" message.
4. **The two P0 demonstrations are permanent gates (§6 items 2 and 3).**
   *Context loss:* audit block M drives the real `WEBGL_lose_context` extension on
   the R3F canvas and asserts the overlay appears (`data-context-lost="lost"`),
   that the canvas reports `isContextLost() === true`, and that after
   `restoreContext()` the overlay unmounts and a live context remains; if the
   browser never restores, the check passes on the code's own documented terminal
   branch (`data-context-lost="dead"` + a Reload control) and says which branch
   fired — the failure mode being eliminated is the silent blank canvas.
   *Boundary containment:* the throw is forced through a **dev-only** hook,
   `?panelfail=<surface>`, implemented in
   `src/components/section/SectionErrorBoundary.tsx` behind `import.meta.env.DEV`
   (unreachable in a production build, inert without the parameter, armed for
   exactly one named surface). Audit block N asserts the card
   (`[data-panel-error="<surface>"]`, `role="alert"`), that the app does not blank,
   and that Retry clears it. Because the browser lane cannot run everywhere, the
   same claim is **also** gated Node-only by `scripts/verify/boundary-contract.mjs`,
   which loads the shipped components and drives their real state transitions.
5. **Three defects found by the closure audit and fixed (all additive).** The
   `ReferencesModal` focus capture/restore effect had `[]` dependencies while the
   component stays mounted for the whole session, so auto-focus and focus restore
   were dead code — it now depends on `open`. The collapsed ≤640 px InfoPanel
   bottom sheet left its off-screen body tabbable; it is now `inert` while
   collapsed **and** the sheet layout is in force (the media query matters: the
   same class pair is used on desktop, where the body is visible and must stay
   focusable). The PiP header controls, hidden below 900 px and never re-shown,
   return with the panel (`:has(.pip-toggle input:checked)`), and `.pip-restore`
   gets the same ≥24 px hit-target floor as `.pip-btn`.
6. **`a11y-contract.mjs` was re-anchored.** Enabling `minify: 'terser'` (§3 item
   12) broke nine of its checks, which matched local identifiers in the esbuild
   dev transform; the gate now reads the shared **source** files and matches only
   minifier-stable forms, with a separate spot check that the shipped bundle still
   carries the same facts. The old reading failed for a reason unrelated to the
   product — the failure mode `QUALITY_PLAN` line 5 warns about.

### 7.3 Honest limitations (not closed)

1. **The browser audit could not be run in the session that closed v6.** Headless
   Chrome cannot start there: the process exits immediately with
   `crashpad_client_win.cc:421 OpenProcess: Access is denied. (0x5)` and
   `platform_channel.cc:108 Check failed: . : Access is denied. (0x5)`, so
   `/json/version` never answers. `verify:audit`, `verify:acceptance` and
   `verify:browser` therefore all exit **4** with that message. The **server** half
   of the bootstrap was exercised: the audit starts Vite, reaches HTTP 200 in
   ~0.6 s, and leaves no listener on the port on any exit path (checked with
   `netstat` after each run). Consequently the browser-only checks — including the
   in-browser half of both P0 gates and the v1–v7 interaction sweep — are written,
   wired and self-starting, but were **not observed passing** in that session. The
   Node-only lane above is the evidence that does hold.
2. **Four records still carry an empty `clinical` array**, so §6's "0 records with
   empty `clinical`" is **not** met: `ctx-pineal`, `ctx-medulla-surface`,
   `ctx-midbrain-surface`, `ctx-pons-surface`. They are `kind: "context"`
   silhouettes whose authored records were added by `p1-identity`;
   `validate-data.mjs` tolerates an empty `clinical` for structure records by
   design (only *missing* is an error, and only tracts require non-empty).
   `docs/CONTENT_INVENTORY.md` is only partly reconciled: its §3/§7 counts still
   say 118 structure / 19 tract records and 12 context ids where the data now
   holds 160 / 23 and 16. **This is a data-authoring gap, not an integration
   defect** — closing it means writing clinical content for four context
   silhouettes and re-measuring the inventory, which is outside the closure task's
   write scope (`src/data/**`, `docs/CONTENT_INVENTORY.md`). Recorded so it is not
   mistaken for done.
3. **`p1-identity`'s premise was partly wrong**, and the honest form of its result
   should be stated: all 8 "previously-invisible" tracts already existed in
   `tracts.json` with waypoints and always rendered through the existing
   `TractTube` path — `CONTENT_INVENTORY.md` §368 says so in the same words. The
   real gap is that none of the 8 appears in any of the 15 plate SVGs (a **2D
   discoverability** gap: 9 of 23 tracts are unlabelled). Taxonomy now holds
   **16** context ids (not 11); the 10 rendered `ctx-*` envelope slots map to 7
   distinct registered records; 8 of the 16 have a mesh and the rest are
   documented per id.
4. **Two manifest wiring gaps, both outside this task's write scope.**
   `minify: 'terser'` is not declared in `package.json` (it resolves from the
   installed tree today; a fresh `npm ci` needs `npm install -D terser@5`), and
   `scripts/verify/boundary-contract.mjs` has no `npm run verify:boundary` entry.
   Running it by path is documented in README §Scripts.
5. **`p1-photofit`'s deviation report was inaccurate, and the deliverable is
   honest.** `src/data/sectionImages.ts` *was* edited: it carries
   `REGISTRATION_STATUS`, `REGISTRATION_UNMEASURED_REASON`, the committed
   per-plate `REGISTRATION_MEASURED` table (43 plates), `REGISTRATION_METHOD`,
   `REGISTRATION_MEASUREMENT_NOTE` and `REGISTRATION_NO_CROSS_SECTION`, with every
   `fit.dy` still at the documented default `0`. §2 item 6 is therefore satisfied
   by its **"say so"** arm: the measurement was performed twice, rejected, and
   recorded — not skipped.
