# Attribution & Sources

NeuroAxis — 3D Brainstem Atlas. This document records every external work that
informed the project and the licensing/citation policy applied to it.

**Summary: no external anatomy dataset, mesh, image, or plate artwork is used.
All 3D geometry (ellipsoid nuclei, tube-geometry tracts, parametric envelopes),
all 12 SVG cross-section plates, and all descriptive text are original schematic
works authored for this project.** The works below are cited as the scholarly
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
- All 3D geometry is **procedurally generated at runtime** from hand-authored
  canonical coordinates (`src/data/*.json`, `src/geometry/`); nothing is
  scanned, segmented, or downloaded.
- All 12 SVG plates (`src/data/plates/*.svg`) are **hand-drawn original
  schematic works** following textbook section *conventions* (dorsal top,
  patient-left-on-image-right for transverse sections, etc.); they are not
  tracings, reproductions, or derivatives of any copyrighted figure.
- No MRI/photographic imagery is embedded, so no medical-image licensing
  applies.
- Code is released under the MIT License (see [`LICENSE`](../LICENSE)). The
  textbooks cited above remain the property of their publishers; citing them
  does not imply endorsement.
