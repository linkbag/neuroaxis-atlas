# Attribution & Sources

NeuroAxis — 3D Brainstem Atlas. This document records every external work that
informed the project and the licensing/citation policy applied to it.

**Summary: all 2D plates, descriptive text, tract curves, and nucleus placement are
original schematic works authored for this project. Starting with the v2 realism
upgrade, the 3D *envelope* surfaces are derived from BodyParts3D 4.0 (CC BY 4.0 —
see the dedicated section below); all other geometry (ellipsoid nuclei,
tube-geometry tracts) remains original.** The works below are cited as the scholarly
basis for the neuroanatomical descriptions and as UX inspiration.

## Textbook references (content authority)

### Blumenfeld — *Neuroanatomy through Clinical Cases* (primary)

- **Blumenfeld H. *Neuroanatomy through Clinical Cases*, 2nd ed. Sinauer Associates, 2010.**
- **Blumenfeld H. *Neuroanatomy through Clinical Cases*, 3rd ed. Oxford University Press, 2021.**

**Chapter-title citation policy.** Records in `src/data/` cite Blumenfeld by
chapter *title* (not bare chapter number), optionally with a section or figure
hint, because numbering differs between editions. Example used throughout the
data files:

> `Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed., Ch. "Diencephalon: Thalamus and Hypothalamus"`

A chapter number is added only when verified against a specific edition.
Principal chapters relied on: *Brain and Environs*; *Corticospinal Tract and
Other Motor Pathways*; *Somatosensory Pathways*; *Spinal Cord*; the brainstem
chapters (surface anatomy and cranial nerves; internal organization);
*Diencephalon: Thalamus and Hypothalamus*; and the clinical-systems chapters
(basal ganglia, visual system, consciousness, memory).

### Secondary textbooks

- **Patten JP. *Neurological Differential Diagnosis*, 2nd ed.** — brainstem
  level plates and the lesion-localization strategy mirrored by the
  transverse-plate series.
- **Fix JD. *High-Yield Neuroanatomy*** — concise tract and nucleus review
  used to cross-check function summaries.
- **Snell RS. *Clinical Neuroanatomy*** — clinical correlations per region.
- **Nolte J. *The Human Brain: An Introduction to Its Functional Anatomy*** —
  functional neurophysiology background.

### Journal review

- **Fiester P, Soule D, Lazarus C, et al. "Midbrain, Pons, and Medulla:
  Anatomy and Syndromes." *RadioGraphics* 2019;39(3).**
  doi:[10.1148/rg.2019180126](https://pubs.rsna.org/doi/10.1148/rg.2019180126)
  — the definitive modern review of the exact cross-section levels and
  brainstem syndromes this atlas presents; the syndrome cards' vascular
  territories follow its tables.

## 3D anatomy surfaces — BodyParts3D 4.0 (CC BY 4.0)

Introduced with the v2 realism upgrade (see `docs/REALISM_PLAN.md`): the 3D
envelope surfaces of the brainstem, diencephalon and cerebellum are **derived
from [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)**,
an anatomical structure database developed and provided by DBCLS. The required
attribution, reproduced verbatim from the
[license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html):

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

- **Dataset**: BodyParts3D 4.0, PART-OF tree OBJ archive
  (`partof_BP3D_4.0_obj_99.zip`, 99% decimated meshes),
  <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip>;
  plus thalamus (L/R) and lateral/medial geniculate bodies from the IS-A tree OBJ
  archive (`isa_BP3D_4.0_obj_99.zip`, same license/version),
  <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip>.
- **License**: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
  Free access, redistribution, and creation/distribution of derivative works are
  permitted with the attribution string above.
- **Publication**: Mitsuhashi N., Fujieda K., Tamura T., Kawamoto S., Takagi T.,
  Okubo K. "BodyParts3D: 3D structure database for anatomical concepts."
  *Nucleic Acids Research* 2009;37:D782–5.
  doi:[10.1093/nar/gkn613](https://doi.org/10.1093/nar/gkn613)
- **Basis**: surfaces derived from adult male magnetic-resonance imaging
  ("TARO") with illustration-based refinement; native units millimeters, Z-up,
  whole-body coordinates.
- **Adaptations applied by this project** (these make the used geometry a
  derivative work): axis/unit conversion from BP3D millimeters/Z-up whole-body
  coordinates into canonical atlas units, landmark-based registration (level
  anchoring, centerline straightening), signed-distance-field resampling with
  organic sculpting (SDF union/subtract/displacement), and further mesh
  simplification. Derived assets are distributed under the same CC BY 4.0 terms
  with the attribution string above. Per-part provenance is recorded in
  `assets-src/bp3d/parts-report.json` (working files) and the `source` field of
  the committed `src/assets/anatomy/anatomy-manifest.json` (`bp3d+sculpt` vs
  `sculpt`).

## Imaging data (v3 — section sync & multi-modality)

Introduced with the v3 section-sync upgrade (see `docs/SECTION_SYNC_PLAN.md`
§1; per-source evidence and fetch dates in `docs/IMAGING_SOURCES.md`). Two
sources of real anatomical imagery are **embedded** in
`src/assets/imaging/stains/` (referenced from `src/data/sectionImages.ts`),
one MRI source is **linked out** (raw volume kept in gitignored
`assets-src/imaging/mri/`). The exact credit lines below must be rendered
verbatim in the UI whenever the corresponding image is displayed.

### UBC Functional Neuroanatomy — Brain Micrographs (17 transverse sections, embedded)

- **Source:** University of British Columbia, Functional Neuroanatomy,
  Brain Micrographs (<https://www.neuroanatomy.ca/micrographs.html>; viewer
  <https://www.neuroanatomy.ca/micrographviewer/>). 17 stained transverse
  sections of the human spinal cord, brainstem, and diencephalon (`m1..m17`).
- **License:** [Creative Commons Attribution-NonCommercial-ShareAlike 4.0
  International](https://creativecommons.org/licenses/by-nc-sa/4.0/) (site
  footer, verified 2026-09-08).
- **Required credit, verbatim:**
  > © University of British Columbia, CC BY-NC-SA 4.0
- **Adaptations applied** (recorded to keep the license terms transparent):
  the images are **content-verbatim re-encodes** — no crops, no editing, no
  compositing. The source PNGs (800×700, already ≤1400 px) were re-encoded to
  JPEG quality 80 at native size for payload (total 1,752 KB); any alpha was
  flattened onto white (source pixels are opaque). Non-commercial educational
  use satisfies the NC clause; unmodified copies satisfy the SA clause.

### Michigan State University Human Brain Atlas / brainmuseum.org (10 coronal sections, embedded)

- **Source:** MSU Human Brain Atlas — Coronal Sections, cell stains,
  <https://brains.anatomy.msu.edu/brains/human/coronal/montage.html>
  (a series of the Comparative Mammalian Brain Collections, with the National
  Museum of Health and Medicine).
- **License/policy:** site permission for educational/research use, no charge
  (<https://brains.anatomy.msu.edu/copyright.html>; the site asks to be
  notified of use — the notification e-mail is recorded as an open action in
  `docs/IMAGING_SOURCES.md` §2.2). The credit line below is required and the
  imagery must not be re-copyrighted.
- **Required credit, verbatim:**
  > University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health
- **Adaptations applied:** content-verbatim re-encodes — no crops, no edits
  (the in-image "10 mm" scale bar is preserved); JPEG quality 80 re-encode at
  native 1050×700 (total 1,084 KB).

### OpenNeuro ds007313 — T1w MRI (dataset linked out; derived grid embedded)

- **Dataset:** *Brain and spinal cord fMRI and qMRI - Single participant*,
  OpenNeuro [ds007313](https://openneuro.org/datasets/ds007313/versions/1.0.0),
  DOI [10.18112/openneuro.ds007313.v1.0.0](https://doi.org/10.18112/openneuro.ds007313.v1.0.0).
- **License:** CC0 (verified in the dataset's `dataset_description.json`,
  snapshot 1.0.0). No attribution required; recorded for provenance.
- The raw `.nii.gz` is downloaded by the build pipeline into the gitignored
  `assets-src/imaging/mri/`; the committed artifacts are the resampled uint8
  grid (`src/assets/imaging/mri-t1.bin`) and its manifest
  (`mri-manifest.json`), produced by the `mri-grid` task from a CC0 input (CC0
  permits derivative redistribution; provenance is still documented). The raw
  volume is not redistributed.
- **Credit line shown in-UI** (built from the manifest's own `source`/`license`
  fields and rendered wherever the MRI draws — section-canvas bottom-left,
  Plates toolbar, PiP attribution), quoted verbatim as it appears:
  > ds007313 doi:10.18112/openneuro.ds007313.v1.0.0, OpenNeuro CC0

### Link-out-only sources (nothing embedded)

- **Harvard Whole Brain Atlas** — <https://www.med.harvard.edu/aanlib/> —
  permission-gated/copyrighted; used as deep links only.
- **BrainMaps.org** — <https://brainmaps.org/index.php?p=termsofuse> —
  per-dataset copyright; used as links only.

## Imaging data (v4 — real cross-section imagery)

Introduced with the v4 real-imagery upgrade (**authoritative spec
`docs/IMAGING_V4_PLAN.md`; per-source licence evidence, verbatim licence quotes
and fetch dates in `docs/IMAGING_SOURCES_V4.md`; machine-readable record in
`assets-src/imaging2/sources.json`**). The v4 additions extend the same two
already-embedded photographic sources (UBC, brainmuseum) with a third, CC0
source, and add **no new NC source beyond the existing UBC precedent**. Every
licence below was verified **at the source page** on **2026-09-08**.

v4 also adds a **continuous CT volume**, `src/assets/imaging/ct.bin` +
`ct-manifest.json` (the `ct-grid` task, built after the research pass and
therefore split out as its own licensed source below): NLM Visible Human
Project head CT, redistributed under the NLM Terms and Conditions (2019) with
the verbatim acknowledgement `Courtesy of the U.S. National Library of
Medicine`. It is the only v4 addition that is not a photograph and the only one
from a source outside the research verdict matrix's "taken" list.

The v3 entries above remain valid and unchanged: all 27 v3 plates keep their ids,
files, credits and behaviour.

### UBC Functional Neuroanatomy — sectional viewers (24 new plates, embedded)

- **Source:** University of British Columbia, Functional Neuroanatomy —
  **horizontal (transverse) sections** (<https://www.neuroanatomy.ca/horizontals.html>,
  viewer `/horizontalviewer/`) and **coronal sections**
  (<https://www.neuroanatomy.ca/coronals.html>, viewer `/coronalviewer/`).
  9 transverse plates (`ubc-h12..h20`) and 15 coronal plates (`ubc-c07..c24`)
  are embedded as `src/assets/imaging/stains/ubc-h*.png` and `ubc-c*.png`.
- **License:** [Creative Commons Attribution-NonCommercial-ShareAlike 4.0
  International](https://creativecommons.org/licenses/by-nc-sa/4.0/) — the site
  footer on every page, verified 2026-09-08. **Non-commercial note:** this
  software is a non-commercial educational atlas, which is why embedding
  CC BY-NC-SA material is acceptable; the same precedent governs the 17 v3 UBC
  micrographs. No other NC-licensed source was added in v4.
- **Required credit, verbatim:**
  > © University of British Columbia, CC BY-NC-SA 4.0
- **Adaptations applied:** content-verbatim copies — **no crops, no retouching,
  no compositing**. Technical modifications only, as the licence permits
  (§2(a)(4)): integer 2× box downsampling (800×700 → 400×350, 800×600 →
  400×300), alpha flattened onto white (the source PNGs mark tissue with real
  transparency), and a **lossless** filtered-PNG re-encode. No EXIF/ICC or other
  metadata is written. Per-file SHA-256 and measurements are recorded in
  `assets-src/imaging2/processed-photos.json`.

### Wikimedia Commons — "CT of a normal brain" (3 axial CT slices, embedded, CC0)

- **Source:** Wikimedia Commons, *CT of a normal brain* series by **Mikael
  Häggström, M.D.** — three axial head-CT slices
  (`File:CT of a normal brain, axial 10/14/18.png`), embedded as
  `src/assets/imaging/stains/wikict-axial-{10,14,18}.png`.
- **License:** **CC0 1.0 Universal (Public Domain Dedication)**, verified per
  FILE on each File: page on 2026-09-08 (`LicenseShortName: CC0`,
  `AttributionRequired: false`). CC0 requires **no** attribution; the credit line
  below is displayed anyway so the provenance of the CT plates stays visible,
  and the author's consent note ("Written informed consent was obtained from the
  individual, including online publication") is recorded in the source record.
- **Credit shown in-UI (not legally required):**
  > CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)
- **Adaptations applied:** 2× integer box downsample (646×468 → 323×234),
  lossless filtered-PNG re-encode, no crop, no metadata.

### NLM Visible Human Project — "Additional Head Images" head CT (grid embedded, CT modality)

Introduced with the v4 real-imagery work as the continuous CT modality
(`src/assets/imaging/ct.bin` + `ct-manifest.json`, task `ct-grid`). This is the
VHP product that *is* redistributable under the terms recorded below — distinct
from the VHP **cryosections**, which stay uncommitted (next section).

- **Source:** U.S. National Library of Medicine, **Visible Human Project —
  "Additional Head Images" head CT**, accession *"HARVARD 02"* head CT series
  (Brigham and Women's Hospital / Harvard Medical School head, donor #2;
  DICOM study `1.3.46.670589.5.2.13.2198413315.1018359151.348414`),
  463 axial slices, Philips Medical Systems, 512×512, 12-bit stored in 16-bit
  (`RescaleSlope 1`, `RescaleIntercept −1200`), 1.5 mm thickness / 0.5032 mm
  slice spacing, `HFS`, whole head through the upper neck.
  Landing page <https://www.nlm.nih.gov/research/visible/getting_data.html>;
  series <https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Additional-Head-Images/MR_CT_DICOM/CAT/>.
- **License:** **NLM Terms and Conditions (2019)** —
  <https://www.nlm.nih.gov/databases/download/terms_and_conditions.html>
  (verified at source 2026-09-08, re-verified 2026-09-10). Redistribution is
  expressly contemplated with the acknowledgement below; **no fee and no
  non-commercial clause**, so this is the permissive counterpart to the NC UBC
  precedent. The licence string recorded verbatim in `ct-manifest.json`
  (`license` / `source.license`) is:
  > NLM Terms and Conditions (2019) — redistribution permitted with acknowledgement
  Fetch dates: 2026-09-10 (DICOM series; downloader
  `assets-src/imaging2/vhp-ct-download.mjs`, raw slices in gitignored
  `assets-src/imaging2/vhp-ct/`).
- **Required acknowledgement, verbatim (shown in-UI as the CT modality's credit
  line):**
  > Courtesy of the U.S. National Library of Medicine
- **Full attribution string recorded in `ct-manifest.json`:**
  > Courtesy of the U.S. National Library of Medicine. Visible Human Project "Additional Head Images" head CT (Brigham and Women's Hospital / Harvard Medical School head) — NLM Terms and Conditions (2019), redistribution permitted with this acknowledgement, no fee and no non-commercial clause.
- **Adaptations applied (everything the bake does):** the DICOM series is
  resampled into the canonical atlas box (x ∈ [−27, 27], y ∈ [−55, 45],
  z ∈ [−56, 26] au at 1 au = 1.2 mm) onto a 45 × 81 × 67 **uint8** grid
  (≈0.24 MB), stored as Hounsfield units via
  `storedHU = stored16 · 1 − 1200` and encoded through the `brain` window
  (−20…100 HU) with the `bone` window (200…1600 HU) recorded as a preset; the
  voxel→canonical affine is built from `ImagePositionPatient` /
  `ImageOrientationPatient` / `PixelSpacing` and refined by measured
  midline-symmetry and CT↔MRI agreement (constants + residuals recorded verbatim
  in the manifest's `registration` block). Re-runnable and deterministic:
  `node scripts/build-ct-grid.mjs` (`--tune` re-runs the registration search).
  No image is cropped, retouched, or composited; QA preview renders stay in the
  gitignored `assets-src/imaging2/preview-ct/`.
- **Redistribution condition (quoted verbatim from the NLM terms, added in the
  `review-qa-v4` audit):** *"Users who republish or redistribute the data
  (services, products or raw data) agree to: maintain the most current version
  of all distributed data, **or** make known in a clear and conspicuous manner
  that the products/services/applications do not reflect the most
  current/accurate data available from NLM."* This project takes the **second**
  arm: the committed grid is a **frozen 2026-09-10 snapshot** of the series (a
  fixed teaching resample on our 1.5 mm canonical grid), it is never re-synced
  at runtime, and it is published as a didactic atlas — i.e. it does not track
  NLM's current data. The acknowledgement above is rendered **verbatim in-UI**
  wherever CT draws (the section canvas' bottom-left credit, the Plates toolbar
  credit line, and the PiP panel's attribution) and recorded in
  `ct-manifest.json` (`credit`, `attribution`, `fetchDate`).

### Visible Human Project (NLM) — cryosection photographs: licence cleared, not committed

- **Source:** NLM Visible Human Project, *Additional Head Images* cryosections
  (Brigham and Women's Hospital / Harvard Medical School; P. Ratiu et al.),
  <https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Additional-Head-Images/>.
- **License:** **NLM Terms and Conditions (2019)** —
  <https://www.nlm.nih.gov/databases/download/terms_and_conditions.html>. The
  pre-2019 licence agreement was **replaced** in July 2019; the current terms
  expressly contemplate redistribution and require one acknowledgement
  (NLM describes the VHP as a public-domain image library).
- **Required acknowledgement, verbatim:**
  > Courtesy of the U.S. National Library of Medicine
- **Status in v4:** the licence is cleared and 125 half-size cryosections were
  downloaded to the gitignored `assets-src/imaging2/vhp-cryo/`, but **no
  cryosection photograph is committed or displayed**: mapping slice indices to
  atlas levels needs a visual pass that this run could not perform, so the
  plates are held back rather than shipped mis-anchored. If a later run commits
  them, the credit line above must be rendered verbatim. (The **CT** series from
  the same VHP product *is* committed as the CT grid — see the section above.)

### Sources verified, not embedded (v4)

- **OpenNeuro** — CC0 per dataset (licence read from each dataset's metadata
  through the public GraphQL API). No CT dataset suitable for a head/neck volume
  was found; nothing new taken. *Not embedded*: **no embeddable CC0 head CT
  volume was located.**
- **The Cancer Imaging Archive (TCIA)** — per-collection licences; the inspected
  head/neck collections grant CC BY 3.0, but downloads require the TCIA Data
  Retriever and exceed this run's size budget. Nothing taken; link-out only.
- **BigBrain (McGill/MNI)** — CC BY-NC-SA 4.0. **Not embedded**: NC clause plus a
  multi-hundred-GB volume (the plan forbids downloading it).
- **Allen Human Brain Atlas** — CC BY 4.0 for the 2020 reference atlas per
  Allen's terms; served through a web API with no small brainstem-level plates
  carrying a stated plane position. Nothing taken.
- **brainmuseum.org / MSU** — already embedded in v3 under the site permission
  policy (credit mandatory, no re-copyrighting); **no new levels added in v4**
  (the site's level listing stays behind bot protection). The 10 v3 plates are
  unchanged.

### Plane anchoring & image registration caveat (v4)

The embedded photographs are **photographs of physical slabs, not registered
volumes**. `src/data/sectionImages.ts` records a `planeValue` (canonical au) and
a first-pass `fit {scale, dx, dy, mirrorX}` per plate; both are derived from the
**sources' own text labels** (UBC's viewer overlay labels, Commons' slice index
and stated 4 mm thickness) and from per-image tissue measurements, **not** from a
landmark-based registration. Plane values are ordered correctly but carry roughly
±1 step (≈5–6 au) of absolute uncertainty; `scale` is a per-family constant.
This is documented in `docs/IMAGING_SOURCES_V4.md` §5 so the UI never claims more
registration than exists.

## Nomenclature note — FreeSurfer

Thalamic nuclear nomenclature (VA, VL, VPL, VPM, MD, pulvinar, LGN, MGN,
intralaminar/CM-PF, reticular) was sanity-checked against the FreeSurfer
**ThalamicNuclei** atlas documentation
(<https://freesurfer.net/fswiki/ThalamicNuclei>). FreeSurfer's probabilistic
histological atlas data itself is **not** included, distributed, or derived
from — the wiki page was consulted as a naming reference only.

## Interaction-design inspiration

- **ashemag/human-atlas** (<https://github.com/ashemag/human-atlas>) — the UX
  model for this app: direct 3D selection, system layers with presets,
  exploded view, search, and a detail side panel. **Inspiration only**: no
  source code, meshes (BodyParts3D), or data files from that project are used
  anywhere in NeuroAxis.

## Online sectional-anatomy references (layout sanity checks only)

- Duke University brainstem sectional anatomy, Lab 3
  (<https://brain.oit.duke.edu/lab03/lab03.html>) — level-by-level
  photographic sections used to sanity-check plate layouts.
- Neurotorium 3D Brain Atlas (<https://neurotorium.org/tool/brain-atlas/>) —
  hierarchical-browsing interaction reference.

## Originality & licensing statement

- Every structure description, connection list, function summary, clinical
  note, and syndrome card is an **original paraphrase** written for this
  project, citing the sources above for scholarly grounding.
- Through v1, all 3D geometry was **procedurally generated at runtime** from
  hand-authored canonical coordinates (`src/data/*.json`, `src/geometry/`). With
  the v2 realism upgrade, envelope-surface meshes are **derived from BodyParts3D
  4.0 at build time** (see the section above); nuclei, tracts, plates, and text
  remain original procedural/hand-authored works.
- All 12 SVG plates (`src/data/plates/*.svg`) are **hand-drawn original
  schematic works** following textbook section *conventions* (dorsal top,
  patient-left-on-image-right for transverse sections, etc.); they are not
  tracings, reproductions, or derivatives of any copyrighted figure.
- No unlicensed imagery is embedded: the stained micrographs and coronal
  sections embedded for the v3 imaging layer are used under the licenses and
  permissions recorded in the "Imaging data" section above and in
  `docs/IMAGING_SOURCES.md` (CC BY-NC-SA 4.0 and the MSU site permission
  policy, both with the required verbatim credit lines), and the MRI volume
  is CC0 and not redistributed (raw file kept out of the repository).
- The v4 real-imagery additions follow the same rule: the 24 new UBC section
  plates are CC BY-NC-SA 4.0 with the verbatim UBC credit and the
  non-commercial educational framing recorded, the 3 CT *plates* are CC0 (no
  attribution required; credited anyway), the continuous **CT grid** is NLM
  Visible Human Project material redistributed under the NLM Terms and
  Conditions (2019) with the verbatim acknowledgement
  `Courtesy of the U.S. National Library of Medicine`, and **no link-out-only
  source was embedded**. Licence evidence, verbatim licence quotes and fetch
  dates for every v4 source are in `docs/IMAGING_SOURCES_V4.md` and
  `assets-src/imaging2/sources.json`; the NLM Visible Human Project CT series
  was verified embeddable and is shipped as `src/assets/imaging/ct.bin`, while
  the VHP *cryosection photographs* remain uncommitted pending the plane-mapping
  pass described above.
- Code is released under the MIT License (see [`LICENSE`](../LICENSE)). The
  textbooks cited above remain the property of their publishers; citing them
  does not imply endorsement.
