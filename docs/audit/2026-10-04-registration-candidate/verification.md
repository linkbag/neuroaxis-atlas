# Candidate verification record

Date: 4 October 2026. Branch: `fix/registration-candidate-2026-10-04`.
Published comparison revision: `89e5f655043817a328915adfad0c8bd3a10485e1`.
Candidate branch base: `91f51975f1d094a8a07238dac9d993aa507797ef`.

**These checks establish implementation consistency and reviewability. They
do not certify anatomical registration or clinical accuracy.** The manual
observations, regional mismatches and limitations are in `README.md`,
`mri-landmarks.json` and the figure viewer.

## Independent source and geometry checks

| Check | Result |
| --- | --- |
| MRI resampling using nibabel/SciPy, independent of the JavaScript baker | 206,241 stations compared; all exact; maximum difference 0 gray levels |
| Archived CT resampling using pydicom/SciPy and actual physical slice positions | 206,241 stations compared; all exact; maximum difference 0 gray levels |
| CT cache cross-check | Seven original planes decoded again, including planes around both larger slice steps; cached HU arrays agree |
| Crop-only MRI extension before refitting | All 979,371 published grid samples preserved exactly |
| Geometry preservation | All 138 GLBs are byte-identical to the published comparison revision; contour analysis honors scene-node transforms |
| Expanded grid | 97 x 138 x 122 stations; original station lattice and intensity window preserved |
| MRI field check | No cortical mesh vertices outside the candidate grid or native acquisition FOV; this is not a tissue-boundary accuracy measure |
| Fit reproducibility | Both MRI and provisional CT parameter fits recomputed from the committed observation ledgers |

Committed candidate byte hashes (SHA-256):

```text
MRI 7e5d78d41d8d957197b18da69d9b5c750151e53a5704fc9e2e362fd596e8f003
CT  a2c90aa3d5b860877b09c98c5df333c68e21c656b39559d4404a3c1723345f1b
```

The measurements pin both raw source hashes and baked asset hashes. The
production MRI binary was compared directly to the committed candidate asset
and matches. Binary Git attributes protect image bytes from text conversion.
Raw volumes and audit caches remain outside Git.

## Local application checks

| Command | Result |
| --- | --- |
| `npm run check` | Passed: TypeScript |
| `npm run validate` | Passed: 311 registry entries, 17 levels; zero errors or warnings |
| `npm run verify:scientific` | Passed: content provenance and clinical/pathway references, runtime drawing courses |
| `npm run verify:imaging-fit` | Passed: axes, nonuniform physical interpolation, source-field edges, hashes, exact lattice and recorded residual consistency |
| `npm run verify:public-imaging` | Passed: source restrictions |
| `npm run build` | Passed: static production build |
| `node scripts/verify/public-imaging.mjs --dist` | Passed: 280 built assets inspected; MRI present; CT and photographs absent |
| `git diff --check` | Passed for candidate changes |

The imaging gate replaces acceptance based on whole-head mask IoU and frozen
image bytes. It reports observations that worsened. The full legacy anatomy
gate was not rerun in this candidate round; geometry is unchanged. Passing a
hash or interpolation test does not establish that a simulated contour is the
boundary of the corresponding tissue in the source image.

## Browser review

Reviewed the **production build** at
`http://127.0.0.1:5189/neuroaxis-atlas/` in the Codex in-app browser.

- Entering Plates opens **Live section / transverse y / MRI**, including after
  selecting Simulated only and returning from 3D. Snap to levels is off.
- Balanced rendering remains selected. Show plane helper is on. The 3D inset
  remains simulated and visible; no 3D inset sizing code changed in this round.
- Real MRI images render on transverse, sagittal and coronal views. An upper
  transverse section at **y = 100 au**, beyond the old image ceiling, renders
  from the extended source grid.
- Simulated only switches off the MRI and its image credit, with an explanatory
  message. Returning to Plates restores the requested MRI default.
- The expandable alignment note exposes limitations for cortex, callosum,
  ventricular horns, cerebellum and fine structures without blocking the viewer.
- No browser console errors were reported for the reviewed candidate app or
  comparison report.
- The report at `http://127.0.0.1:5191/index.html` displays MRI before/after
  comparisons and the archived CT correction; the figure picker works.
- Desktop screenshots were saved in the local candidate review output folder.
  The temporary desktop viewport override was reset after checking the layout.

## Release boundary

The candidate is for owner review. CT remains an archive reference and is
unavailable in the public UI/build. Regional MRI correspondence remains
approximate, with substantial cerebellar differences and a worsened splenium
observation. No production deployment or master merge is authorized by this
review step.
