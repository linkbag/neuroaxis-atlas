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

### OpenNeuro ds007313 — T1w MRI (linked out; raw volume not redistributed)

- **Dataset:** *Brain and spinal cord fMRI and qMRI - Single participant*,
  OpenNeuro [ds007313](https://openneuro.org/datasets/ds007313/versions/1.0.0),
  DOI [10.18112/openneuro.ds007313.v1.0.0](https://doi.org/10.18112/openneuro.ds007313.v1.0.0).
- **License:** CC0 (verified in the dataset's `dataset_description.json`,
  snapshot 1.0.0). No attribution required; recorded for provenance.
- The raw `.nii.gz` is downloaded by the build pipeline into the gitignored
  `assets-src/imaging/mri/`; the only derived, committed artifact will be the
  resampled uint8 grid (`src/assets/imaging/mri-t1.bin`) produced by the
  `mri-grid` task from a CC0 input (CC0 permits derivative redistribution;
  provenance is still documented).

### Link-out-only sources (nothing embedded)

- **Harvard Whole Brain Atlas** — <https://www.med.harvard.edu/aanlib/> —
  permission-gated/copyrighted; used as deep links only.
- **BrainMaps.org** — <https://brainmaps.org/index.php?p=termsofuse> —
  per-dataset copyright; used as links only.

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
- Code is released under the MIT License (see [`LICENSE`](../LICENSE)). The
  textbooks cited above remain the property of their publishers; citing them
  does not imply endorsement.
