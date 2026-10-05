# MRI registration candidate — owner review before deployment

This branch implements the approved follow-up to the registration audit. It is
a **candidate**, with the public site unchanged. Open `index.html` for figures
and every recorded observation, including the cases that got worse.

## Changes

- Extend the MRI lattice from **81×113×107** to **97×138×122**, covering the
  current model/clipping bounds. Preserve the original station spacing and
  intensity window. The crop-only reconstruction matches **all 979,371 existing
  samples exactly**, before applying any registration adjustment.
- Apply one constrained, anisotropic **3D affine** to the original MRI during
  resampling. There are no independent per-plane warps or nonlinear shape fits.
  The MRI data changes intentionally; the lattice and intensity mapping do not.
- Keep **all 138 GLBs byte-identical** to the previously published revision.
  No model surface is reshaped to force a match to this individual MRI.
- Record acquisition support separately from black image intensity. Outside
  the actual source field, image pixels are transparent and simulated contours
  can remain visible. Missing imagery is not extrapolated or invented.
- Add an expandable MRI alignment/coverage explanation in Plates and a summary
  in References. Preserve Live/transverse/MRI, Snap off, Balanced rendering,
  plane helpers on, and the larger simulated 3D inset defaults.
- Correct the archived CT's anterior/posterior sign and sample actual DICOM
  slice positions. CT remains unavailable in the public app; its gross atlas
  placement is **provisional** because source artifacts limit interpretation.
- Replace the old whole-head-mask IoU/frozen-pixel gate with physical geometry,
  source-field, hash, lattice and recorded-observation consistency checks.

## MRI method and tradeoffs

Source: the same OpenNeuro ds007313 v1.0.0 `sub-A006_T1w.nii.gz`, identified by
SHA-256. The atlas frame remains **+left / +superior / +anterior**; one atlas unit
is approximately 1.2 mm. These are teaching coordinates, not MNI coordinates.

The fitter uses **10 manual macroscopic component observations** and reserves
**7 observations** for checks. These are coarse visual picks, with documented
uncertainties of 2–6 au, made in one review. They are **not independent expert
annotations**. Gross poles/bounds use only the component that defines the
envelope; unanchored components are excluded. All observations remain in the
ledger. Cortex/brainstem/CSF regions are not extracted by thresholding the whole
head. The weak prior and fitting bounds are recorded and reproducible.

| Correction in the canonical frame | Previous MRI | Candidate MRI |
| --- | --- | --- |
| Lateral / superior / anterior scale | 1 / 1.25 / 1.6 | 1.09225421 / 1.40659771 / 1.12669561 |
| Translation, au | 2.9 / −88.4 / −7.8 | 2.88530385 / −98.11234642 / −3.73944334 |
| Rotation | 0° | 0° |

The candidate reduces the previous AP stretching and increases SI scaling.
It improves gross cortical poles/width, callosal genu/body, and the recorded
ventricular roof/recess correspondence. It does **not** make the simulated
anatomy a segmentation of the MRI. The mean reserved observation mismatch is
**16.00 → 8.99 au**. This mixes one- and two-component observations; it is **not
clinical target-registration error or a percentage anatomical accuracy**.

| Region | Candidate interpretation / remaining mismatch |
| --- | --- |
| Brainstem | Broad correspondence retained. Mean across four recorded observations is **1.96 → 2.42 au**. PMJ and ventral pontine observations worsen to **2.75 / 2.48 au**; reserved rostral-pons observation is **2.64 au**. These are approximate picks, not proof of each nuclear location. |
| Cortex | Gross envelope correspondence improves, and no cortical mesh vertex is cut off by the image grid. Vertex height still differs by **8.87 au**, and gyral/sulcal contours remain schematic. **0% outside the acquisition FOV does not mean 100% on the actual cortical boundary.** |
| Callosum | Genu/body improve, but the splenium observation worsens **4.00 → 8.14 au**. The model's arch and thickness differ from the individual scan. |
| Ventricles | Roof and fourth-ventricular recess observations improve. The temporal-horn height still differs by **7.26 au**; individual horn contours are not precisely matched. |
| Cerebellum | Substantial differences remain. Inferior extent worsens **10.00 → 14.15 au**; posterior extent improves **58.00 → 24.00 au**, but is still poorly matched. **Do not treat cerebellar contour alignment as accurate.** No regional image warp was added to hide this discrepancy. |
| Fine anatomy | Exact nuclei, nerves, bundles, vessels and cortical areal borders are not validated by this downsampled T1 or artifact-affected noncontrast CT. Use sourced teaching descriptions and simulated anatomy with those limits. |

The teaching geometry has proportions that one global affine cannot reconcile
with every part of this subject. The candidate offers a broader whole-brain
compromise and explicitly exposes the remaining differences for owner review.

## Coverage and independent checks

- Published cortical vertices outside the baked image grid: **23.28% left,
  23.64% right**. Candidate: **0% / 0%**. Vertex fractions are not tissue-volume
  fractions, and source FOV is not a brain segmentation.
- Independent nibabel/SciPy resampling of **206,241 MRI stations**: **100%
  exact**, maximum difference 0 gray levels.
- Independent pydicom/SciPy resampling of **206,241 CT stations**: **100%
  exact**, maximum difference 0 gray levels. Seven cached CT planes were also
  decoded again, including those around both physical slice gaps.
- CT uses 463 source slices with actual adjacent steps **0.5 / 1.0 / 1.5 mm**.
  The previous averaged-step mapping displaced slice positions by up to
  **1.457792 mm**. New sampling uses each physical position. Gaps greater than
  1.6 mm would remain no-data; no such larger gap exists in this source.
- Independent contours honor GLB scene-node transforms. All 17 transverse
  teaching levels plus sagittal, parasagittal, coronal and upper-cortex views
  are included in the figures. The 3D inset still uses simulated sections only.
- Engineering/type/build checks and the browser review are recorded in
  `verification.md`. Their passing does not certify clinical/anatomical accuracy.

## Archived CT

The conversion is now `(x_LPS, z_LPS, −y_LPS) / 1.2`, followed by the provisional
atlas affine. The previous `+y_LPS` anterior component reflected AP. Actual
IOP, IPP and row/column pixel spacing define physical sampling, as required by
[DICOM's Image Plane Module](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.6.2.html).
The source has a full head field; the old apparent missing upper head arose
from the misplaced transform. Coarse manual CT observations have lower
confidence, and cannot validate fine tissue identity in the artifact-affected
regions. MRI and CT are different subjects, not paired acquisitions.

## Reproduce

The raw MRI and CT stay outside Git. Install the optional packages in
`scripts/audit/requirements-registration.txt`. Use an external scratch/cache
directory, which the scripts enforce.

```powershell
node scripts/build-mri-grid.mjs --source '<original T1.nii.gz>' --registration baseline --out-dir '<scratch>/crop-only-extension'
node scripts/build-mri-grid.mjs --source '<original T1.nii.gz>'
node scripts/build-ct-grid.mjs --source '<original directory of J.###.gz>'
python scripts/audit/fit_landmarks.py --record docs/audit/2026-10-04-registration-candidate/mri-landmarks.json
python scripts/audit/fit_landmarks.py --record docs/audit/2026-10-04-registration-candidate/ct-landmarks.json
python scripts/audit/registration_candidate.py --repo . --sources '<original project>' --cache-dir '<scratch>' --extension '<scratch>/crop-only-extension' --out docs/audit/2026-10-04-registration-candidate
node scripts/audit/build_candidate_review.mjs
npm run verify:imaging-fit
```

The independent evaluator uses the physically ordered `ct-hu.npy` /
`ct-physical.json` cache produced by the original read-only `registration.py`
audit. It verifies the compressed source aggregate hash and re-decodes selected
planes before using the cache. `--probe` / `--no-write` on the bakers never
rewrite assets; missing or changed raw sources fail before output is touched.

## References / rights

- [OpenNeuro ds007313 v1.0.0](https://openneuro.org/datasets/ds007313/versions/1.0.0), DOI `10.18112/openneuro.ds007313.v1.0.0`, CC0. Same single-participant T1 as the published version.
- [NLM Visible Human access](https://www.nlm.nih.gov/research/visible/getting_data.html) and [NLM Terms](https://www.nlm.nih.gov/databases/download/terms_and_conditions.html). **Courtesy of the U.S. National Library of Medicine.** Historical data; no NLM endorsement.
- [Official NIfTI-1 definition](https://github.com/NIFTI-Imaging/nifti_clib/blob/master/niftilib/nifti1.h): affine coordinate interpretation; [DICOM Image Plane Module](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.6.2.html): physical CT geometry.
- [ITK registration guide](https://itk.org/ITKSoftwareGuide/html/Book2/ITKSoftwareGuide-Book2ch3.html): registration operates on corresponding anatomy in physical space. The chosen manual observations, priors and reserved checks are this project's method, not an ITK clinical validation.
- Haines (2012), printed pp. 130–131 and 176–177, and Blumenfeld (2010), printed p. 494: macroanatomic interpretations from the preceding audit. No copyrighted textbook images or private raw volumes are included here.

**Deployment is on hold until the owner reviews the candidate app.**
