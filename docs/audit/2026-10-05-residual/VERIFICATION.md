# Residual review integration verification — 2026-10-05

## Local gates

Run against the integrated audit candidate:

| Check | Result |
| --- | --- |
| `npm run check` | Pass: TypeScript types, including optional anatomical labels and SearchHit propagation. |
| `npm run validate` | Pass: 0 errors, 0 warnings; 311 registry entries, 288 structure records, 23 main tracts, 26 syndromes and 15 plates. |
| `npm run verify:scientific` | Pass: original and residual coverage; valid pathway relays; excluded misleading routes; canonical/taxonomy anatomy labels; corrected relationships and orientation frames. Runtime smoke executes 11 nerve and 35 vessel courses. |
| `npm run verify:imaging-fit` | Pass: unchanged MRI/CT hashes, lattices and affine transforms; existing observations and physical sampling contracts retained. This is not a new registration study. |
| `npm run verify:public-imaging` | Pass: MRI/CT/Simulated choices, credits, fixed CT brain window and requested defaults. |
| `npm run build` | Pass: Vite production build. |
| `node scripts/verify/public-imaging.mjs --dist` | Pass: 281 built assets inspected; MRI and corrected CT present, photographs absent; imagery hashes match. |
| `git diff --check` | Pass: no whitespace errors. |

Full baseline comparison of all 311 canonical structure/tract records found **zero
numerical-leaf changes**. Forty-four records have non-reference changes. Ten SVG
plates changed; plate-frame position changes and removal of misleading overlays are
intentional, separate from unchanged 3D coordinates, dimensions and trajectories.

## Independent application checks

- Brainstem reviewer: all 21 text replacements matched proposals exactly. Three
  paired-anatomy labels, taxonomy mirrors and proxy notes were correct. No unexpected
  non-reference changes across 132 structures and 26 syndromes; no numerical changes.
- Telencephalon reviewer: six direct field changes, three synonym mirrors and six
  anatomical-class pairs matched proposals. No numerical or protected geometry changes
  across 95 records. The shared nuclei category is clarified in the header tooltip
  and visible palette explanation.
- Vascular/CSF reviewer: all 23 targets, canonical/taxonomy/fallback wording and
  vessel-specific citation cleanup verified; no numerical changes across 61 records.

These are automated evidence and integration reviews, not independent clinician approval.

## Local production browser checks

The rebuilt production app was reloaded at
`http://127.0.0.1:5193/neuroaxis-atlas/`.

- Search result and Dentate gyrus selection details show **hippocampal cortex**;
  synonyms omit CA5 and the representation limits remain visible.
- Direct Plates entry visibly selects **Live section / y transverse / MRI**.
  Snap to levels is unchecked; CT and Simulated only are available.
- The 3D controls show **Balanced** and **Show plane helper** enabled.
- Author plate mode displays the composite-section notice. Selecting the midline
  sagittal plate shows **anterior left, superior top** with S/A/P/I frame labels.
- At the narrow in-app viewport, closing the optional structure browser sidebar was
  necessary to click a sagittal picker button whose centre was outside the viewport.
  This is a layout/access issue, not evidence against the scientific corrections.

## Release evidence

The owner explicitly authorized updating the default branch and public deployment
after this audit. The repository default branch is `master`; its existing
[GitHub Pages workflow](https://github.com/linkbag/neuroaxis-atlas/actions/workflows/pages.yml)
runs the required gates before deployment. Workflow runs and the public browser
check are the authoritative evidence of publication, separate from these local results.
Private textbook extracts and images are not committed or uploaded.

Successful tests establish data wiring, regression protection and build/deployment
health. They do not establish exact anatomical geometry, patient registration or
diagnostic validity.
