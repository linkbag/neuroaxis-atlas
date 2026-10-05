# Candidate verification record

Date: 4 October 2026. Branch: `fix/registration-candidate-2026-10-04`.
Published comparison revision: `89e5f655043817a328915adfad0c8bd3a10485e1`.
Candidate branch base: `91f51975f1d094a8a07238dac9d993aa507797ef`.

Follow-up: CT was restored for local review after the initial MRI-only candidate
commit `392fb8486d50366207ca3dfb6d5728b88342f816`. MRI/CT voxel bytes and their
affines are unchanged. CT display now uses its prewindowed grayscale correctly;
the unsupported bone preset is removed. Provisional alignment and NLM source
terms are visible in the app. Publication remains on hold.

**These checks establish implementation consistency and reviewability. They
do not certify anatomical registration or clinical accuracy.** The manual
observations, regional mismatches and limitations are in `README.md`,
`mri-landmarks.json` and the figure viewer.

## Independent source and geometry checks

| Check | Result |
| --- | --- |
| MRI resampling using nibabel/SciPy, independent of the JavaScript baker | 206,241 stations compared; all exact; maximum difference 0 gray levels |
| CT resampling using pydicom/SciPy and actual physical slice positions | 206,241 stations compared; all exact; maximum difference 0 gray levels; rechecked during restoration |
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
production MRI and CT binaries were compared directly to the reviewed candidate
assets and match. Binary Git attributes protect image bytes from text conversion.
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
| `node scripts/verify/public-imaging.mjs --dist` | Passed: 281 built assets inspected; MRI and corrected CT present; photographs absent; both hashes match |
| `git diff --check` | Passed for candidate changes |

The imaging gate replaces acceptance based on whole-head mask IoU and frozen
image bytes. It reports observations that worsened. The full legacy anatomy
gate was not rerun in this candidate round; geometry is unchanged. Passing a
hash or interpolation test does not establish that a simulated contour is the
boundary of the corresponding tissue in the source image.

## Browser review

Reviewed the **production build** at
`http://127.0.0.1:5193/neuroaxis-atlas/` in the Codex in-app browser.

- Entering Plates opens **Live section / transverse y / MRI**, including after
  selecting Simulated only and returning from 3D. Snap to levels is off.
- Balanced rendering remains selected. Show plane helper is on. The 3D inset
  remains simulated and visible; no 3D inset sizing code changed in this round.
- MRI images rendered on all three axes and an upper **y = 100 au** section in
  the initial candidate. Restoring CT does not change MRI bytes or affine.
- Restored CT renders on transverse y=58, sagittal x=0 and coronal z=0, with
  the exact NLM credit. The fixed brain window readout, source links, provisional
  alignment details and historical-data notice are present. Updated credits
  appear in the recognition popup. MRI remains the default on Plates entry.
- Simulated only switches off the MRI and its image credit, with an explanatory
  message. Returning to Plates restores the requested MRI default.
- The expandable alignment note exposes limitations for cortex, callosum,
  ventricular horns, cerebellum and fine structures without blocking the viewer.
- No browser console errors were reported. The contour worker logged its
  existing transferable-buffer fallback warning and rendered successfully by
  structured cloning. This warning is not an anatomical accuracy check.
- The report at `http://127.0.0.1:5191/index.html` displays MRI before/after
  comparisons and the provisional CT correction; the figure picker works.
- A short-screen layout issue collapsed the image canvas to about 2 px. The
  Plates image stage now has a 320 px minimum height. At the default browser
  size, its displayed canvas is about 319 px high and the center pane scrolls.
  All CT views were inspected at this size. No viewport override was applied
  in the CT restoration round. Browser screenshots were saved locally.

## Release boundary

The candidate is for owner review. CT is available in this candidate's UI/build,
with provisional atlas alignment and a fixed brain window. The public site
remains unchanged. Regional MRI correspondence remains
approximate, with substantial cerebellar differences and a worsened splenium
observation. No production deployment or master merge is authorized by this
review step.
