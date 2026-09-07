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
- No MRI/photographic imagery is embedded, so no medical-image licensing
  applies.
- Code is released under the MIT License (see [`LICENSE`](../LICENSE)). The
  textbooks cited above remain the property of their publishers; citing them
  does not imply endorsement.
