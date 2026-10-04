# Review verification — 2026-10-04

This verifies code/data integration and rendering behavior. It does not certify scientific accuracy, measured geometry or diagnostic performance.

## Final local checks

| Check | Result |
|---|---|
| Clean `npm ci` | Passed after stopping the owned preview process that held a Windows Rollup file lock |
| `npm run check` | Passed |
| `npm run validate` | Passed: 0 errors, 0 warnings; 288 structure records, 23 tracts, 26 syndromes, 15 plates, 311 registry entries |
| `npm run verify:scientific` | Passed: all 311 records and 26 syndromes covered; 19 pathways have valid links; runtime semantics match canonical records |
| Runtime course exclusions | Passed: 11 nerve and 35 vessel drawing courses; eight withheld routes are absent from their drawing registries |
| `npm run verify:public-imaging` | Passed: MRI/Simulated-only source contract and direct Plates defaults |
| `npm run build` | Passed from the clean install; Vite 5.4.21, Node 24.18.0 |
| `node scripts/verify/public-imaging.mjs --dist` | Passed: 280 built assets inspected; MRI volume present, CT/photo assets absent |
| `git diff --check` | Passed after normalizing the edited plate manifest line endings |

The package manager reported existing dependency deprecations and audit advisories. These are not addressed by this scientific-content audit. Historical fixed-count/CT/photo gates are not part of this MRI-only review contract.

The independent GitHub Linux review build also passed at code commit `393fd45`: [review-build run 37243950243](https://github.com/linkbag/neuroaxis-atlas/actions/runs/37243950243). It installed dependencies, checked types/data/coverage/runtime consistency, built the site, and inspected MRI-only assets. This workflow has no deployment step.

## Browser observations

Production preview: `http://127.0.0.1:5175/neuroaxis-atlas/` (local to this computer). The browser was returned to its normal viewport after responsive testing.

- New Cortex and Pathways tabs are visible and reachable. Cortex lists 61 region/area/representation entries.
- Cortical search for `angular` returned the angular entry and other records mentioning triangular anatomy; selecting Angular gyrus opened its functions, clinical context, blood supply, representation limits and sources.
- Pathways lists 19 summaries; the Motor filter and corticospinal relay selection worked and opened the canonical tract details.
- Direct Plates entry selected Live section, y/transverse and MRI. Snap checkbox state was false.
- After choosing Simulated only and x/sagittal, leaving and returning to Plates restored MRI and y/transverse. Snap remained false.
- No CT or Photo imagery controls were present; MRI credit and approximate-alignment caution were visible.
- Default narrow viewport (~647×871), phone viewport (390×844), and desktop (1440×960) were checked. Header wrapping, workspace minimum height and tab scrolling were corrected; Cortex and Pathways navigation worked at phone width.
- The browser logged a geometry-transfer warning and successfully used the existing structured-clone fallback. No JavaScript error was observed in the final browser checks. This fallback observation is not a rendering-speed benchmark or independent anatomical validation.

## Release isolation

Remote master and `mri-simulated-live-2026-10-03` were rechecked at `26b5d4f72fbb38c415044a078397c1e34a00f7ba`. The latest Pages deployment was successful run `37141766455`, created 2026-10-03T17:46:50Z at that commit.

The review branch has a build-only pull-request workflow. Pages publication still triggers only for master or an explicit workflow dispatch. The audit has not been merged, dispatched or deployed; owner review is required first.
