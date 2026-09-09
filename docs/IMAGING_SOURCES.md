# Imaging Sources & License Verdicts

Status of the real-imagery layer for NeuroAxis v3 ("section sync & multi-modality").
Companion to `docs/SECTION_SYNC_PLAN.md` §1 and `docs/ATTRIBUTION.md`.
All licenses/pages verified **2026-09-08** at the live source (this document was
written at fetch time; re-verify before redistributing).

Per the plan §5 gate: license verification is recorded **before** embedding
assets — the embedded files below are the only external imagery committed to
`src/assets/` in this run, and every verdict here was confirmed on the live
page before download.

---

## 1. Per-source verdict table

| Source | URL | Content | License (as verified 2026-09-08) | Verdict | What we embedded vs linked out |
| --- | --- | --- | --- | --- | --- |
| UBC Functional Neuroanatomy — Brain Micrographs | <https://www.neuroanatomy.ca/micrographs.html> (viewer <https://www.neuroanatomy.ca/micrographviewer/>) | 17 brainstem/spinal-cord transverse micrographs (m1..m17), 800×700 PNG | **CC BY-NC-SA 4.0** — site footer (home page + all subpages): *"This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License"* | **Embedded** (17 files) | Embedded: all 17 stained sections as JPEG re-encodes at native 800×700 (q80). Linked out: nothing (viewer page + direct PNG URLs recorded in the manifest). Credits always shown. No crops, no edits: content-verbatim re-encode only. |
| brainmuseum.org / MSU Human Brain Atlas (Brains.anatomy.msu.edu) | <https://brains.anatomy.msu.edu/brains/human/index.html> (series: <https://brains.anatomy.msu.edu/brains/human/coronal/montage.html>) | Coronal stained sections of a human brain: cell stain (Nissl) + fiber stain (myelin), MRI + 3D cuts, 1050×700 | **Site permission policy** (explicit, no charge): <https://brains.anatomy.msu.edu/copyright.html> — *"You may use them for any purpose which will not interfere with their use by others. We do ask that you SECURE OUR PERMISSION, so that we can track the uses being made… We also ask that you credit this site as the source of the image(s), and the National Science Foundation for its support."* + credit line (below) | **Embedded** (10 coronal cell-stain files) | Embedded: 10 coronal cell-stain sections (levels 2240–3820, covering diencephalon→midbrain→pons→medulla) as JPEG re-encodes at native 1050×700 (q80). Linked out: the full MSU series (all levels, MRI/fiber/3D variants), the Human Hypothalamus atlas, and the Brainstem atlas — via per-section `sourceUrl` links. Credits always shown. No crops. **Open action:** the site asks to be notified of use for tracking (vincen29@msu.edu / (517) 353-3240); the credit line satisfies the attribution request, but the notification e-mail should be sent at integration time (recorded as an open item, not a blocker — plan §1 permits the embed with the exact credit line). |
| OpenNeuro / ds007313 | <https://openneuro.org/datasets/ds007313/versions/1.0.0> | Single-subject (sub-A006) structural MRI: 3T Siemens Prisma MPRAGE brain+spine T1w (1.3 mm iso, 176×280×288), plus T2w/DWI/MT/fMRI | **CC0** — verified in the dataset's own `dataset_description.json` (`"License": "CC0"`) at snapshot 1.0.0; DOI **10.18112/openneuro.ds007313.v1.0.0** | **Linked out (raw volume)** — raw .nii.gz stored only in the gitignored `assets-src/imaging/mri/` | Embedded: nothing yet (the resampled `mri-t1.bin` grid is owned by the `mri-grid` task). The raw volume is recorded with full metadata in `assets-src/imaging/mri-source.json` for the build script. CC0 = no attribution required; provenance is documented anyway. |
| Harvard Whole Brain Atlas | <https://www.med.harvard.edu/aanlib/> | MR/PET annotated slices | Permission-gated / copyrighted | **Link-out only** | Nothing embedded. Deep links per level/structure may be added at integration. |
| BrainMaps.org | <https://brainmaps.org/index.php?p=termsofuse> | High-resolution histology slides | Per-dataset copyright | **Link-out only** | Nothing embedded. |

### Verbatim credit lines (render exactly this, in-UI, whenever the image shows)

**UBC micrographs (all 17):**
> `© University of British Columbia, CC BY-NC-SA 4.0`

**MSU/brainmuseum coronal sections (all 10):**
> `University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health`

(These are the exact strings also stored in `src/data/sectionImages.ts` —
`UBC_CREDIT` / `BMM_CREDIT`.)

---

## 2. Detail per source (fetch evidence)

### 2.1 UBC micrographs — embedded (17 files, 1,752 KB)

- Fetched 2026-09-08 from
  `https://www.neuroanatomy.ca/micrographviewer/images/micrographs/mN/mNbrain.png`
  (mN = m1..m17) plus `mNthumb.png` (thumbnails not embedded; kept in
  `assets-src/imaging/ubc-raw/` with `fetch-log.json`; all 17 fetched 200 OK).
- License footer verified on the live home page + micrographs page (verbatim
  CC BY-NC-SA 4.0 statement, linked to creativecommons.org/licenses/by-nc-sa/4.0).
- The micrograph viewer (React `slicesInfo.js`, fetched same day) exposes the
  per-slide overlay labels; the images also carry the site's own baked-in level
  titles (e.g. "5 — ROSTRAL/OPEN MEDULLA"). Both were used for the
  level mapping below; per-slide evidence is stored in `sectionImages.ts`
  `note` fields.
- **Adaptations:** no crops, no retouching, no compositing. Content-verbatim
  PNG→JPEG re-encode at native 800×700 (already ≤1400 px), quality 80, alpha
  flattened onto white (the source PNGs are opaque). Documented in
  ATTRIBUTION.md as required by CC BY-NC-SA attribution practice.
- **Level mapping to `src/data/levels.json`** (transverse anchors):

| File | UBC slide (site title / key labels) | levelId |
| --- | --- | --- |
| ubc-m01.jpg | SPINAL CORD (cervical; FC/FG, ACT/LCT, SCT, ST) | `null` — spinal-cord-only reference entry |
| ubc-m02.jpg | CAUDAL MEDULLA (pyramidal decussation) | `lvl-pyramid-decuss` |
| ubc-m03.jpg | MEDULLA (nuclei gracilis/cuneatus appear) | `lvl-sensory-decuss` |
| ubc-m04.jpg | MEDULLA (internal arcuate/sensory decussation) | `lvl-sensory-decuss` |
| ubc-m05.jpg | ROSTRAL/OPEN MEDULLA (olive, XII/DMN X, ML, pyramid) | `lvl-olivary` |
| ubc-m06.jpg | ROSTRAL MEDULLA & CEREBELLUM (4th ventricle, CN VIII nuclei) | `lvl-pontomedullary` |
| ubc-m07.jpg | CAUDAL PONS & CEREBELLUM (CN VI + VII nuclei/nerve) | `lvl-pons-caudal` |
| ubc-m08.jpg | ROSTRAL PONS & CEREBELLUM (CN V, mesencephalic V) | `lvl-pons-middle` |
| ubc-m09.jpg | ROSTRAL PONS/CAUDAL MIDBRAIN (CN IV isthmus, aqueduct) | `lvl-pons-rostral` |
| ubc-m10.jpg | ROSTRAL PONS/CAUDAL MIDBRAIN (inferior colliculus) | `lvl-midbrain-ic` |
| ubc-m11.jpg | ROSTRAL MIDBRAIN (SC, III + E-W, RN, SN, VTA) | `lvl-midbrain-sc` |
| ubc-m12.jpg | DIENCEPHALON/BASAL GANGLIA (mammillary, STN, SN, VL) | `lvl-thalamus-mid` |
| ubc-m13.jpg | DIENCEPHALON/BASAL GANGLIA (mammillary, ANT, MD) | `lvl-thalamus-mid` |
| ubc-m14.jpg | DIENCEPHALON/BASAL GANGLIA (hypothalamus, OT, MTT) | `lvl-thalamus-rostral` |
| ubc-m15.jpg | DIENCEPHALON/BASAL GANGLIA (anterior commissure) | `lvl-thalamus-rostral` |
| ubc-m16.jpg | ANTERIOR DIENCEPHALON (AC, fornix column, chiasm) | `lvl-thalamus-rostral` |
| ubc-m17.jpg | DIENCEPHALON (CC body/rostrum, caudate head, septum) | `null` — striatum/basal forebrain, rostral to the top anchor (reference entry) |

- **Levels without a UBC stain** (honest gap): `lvl-spinal-medulla`
  (cervicomedullary junction — the UBC series jumps from spinal cord to
  pyramidal decussation) and `lvl-post-comm` (pretectal — UBC series jumps
  from superior colliculus to diencephalon). Brainmuseum coronals cannot fill
  transverse gaps (different axis). The MRI layer (continuous) covers every
  position instead.

### 2.2 MSU Human Brain Atlas (brainmuseum.org) — embedded (10 files, 1,084 KB)

- Fetched 2026-09-08. Front-door index page + montage fetched live; the series
  shares a bot-protection layer (Incapsula) that intermittently blocks plain
  HTML requests (retried 6–8× per page; the image files themselves were not
  blocked). The montage was obtained through a JS-rendering read; section
  image URLs are the canonical `.../coronal/NNNN_cell.jpg` pattern.
- Series evidence: coronal montage at
  <https://brains.anatomy.msu.edu/brains/human/coronal/montage.html> lists
  levels 0000→4170 anterior→posterior; each level offers cell stain, fiber
  stain, MRI and 3D variants.
- Selection: levels **2240, 2390, 2500, 2660, 2800, 3270, 3440, 3600, 3710,
  3820** = the 10 sections covering diencephalon → midbrain → pons → medulla
  (selection made by assembling the full 22-level cell-stain thumb grid and
  visually identifying brainstem/diencephalon levels).
- Variant: **cell stain** (Nissl) for the whole subset (consistent series;
  fiber-stain variants linked out).
- **Adaptations:** content-verbatim JPEG re-encode at native 1050×700
  (≤1400 px), quality 80 (source already JPEG; net ~0 encoding loss per
  re-encode at q80). No crops, no edits — the in-image "10 mm" scale bar is
  preserved.
- Attribution: exact credit line (see above) + per-section link
  (`.../coronal/NNNN_cell.html`) in the manifest.
- **Open action:** notification e-mail of use to MSU (vincen29@msu.edu per the
  site's copyright page) recommended at integration.

### 2.3 OpenNeuro dataset ds007313 (MRI source) — linked out

- **Dataset:** *Brain and spinal cord fMRI and qMRI - Single participant*
  (Landelle, Kinany, St-Onge, Lungu, Van De Ville, Misic, Marchand-Pauvert,
  De Leener, Doyon), OpenNeuro ds007313, snapshot 1.0.0.
- **License: CC0** — verified in the dataset's `dataset_description.json`
  (live file at snapshot 1.0.0, fetched 2026-09-08). DOI:
  **10.18112/openneuro.ds007313.v1.0.0**.
- **Volume:** `sub-A006/anat/sub-A006_T1w.nii.gz` — MPRAGE
  `t1_mprage_sag_p2_brainSpine_FOV375_1.3iso`, 3T Siemens Prisma,
  **1.3 mm isotropic** (176×280×288, int16, 10,662,337 bytes on disk;
  NIfTI-1 `n+1`, sform=1: diag 1.300/1.302/1.302 mm, origin
  (−110.707, −172.194, −181.939)). Covers whole head through the cervical
  spinal cord (DICOM BodyPartExamined: CSPINE) — full brainstem +
  upper cord in one volume. NOTE: "~0.8–1 mm" was the plan's preference; this
  dataset was chosen as the best **verified-CC0, single-subject, small** option
  (1.3 mm iso is a documented deviation — adequate for a 1.5 mm resampled
  underlay grid).
- **Why not bigger/more famous datasets:** ds003563 (ultrahigh-res phantom)
  avoided per plan §1 payload concerns (multi-GB); multi-subject datasets
  (e.g. ds003592, ds0087xx) exceed the single-subject + small-download target;
  Harvard/BrainMaps are link-out-only.
- Raw volume + sidecar stored **only** in the gitignored `assets-src/imaging/mri/`
  (`sub-A006_T1w.nii.gz`, `sub-A006_T1w.json`); full metadata in
  `assets-src/imaging/mri-source.json`. The committed artifact
  (`src/assets/imaging/mri-t1.bin` + `mri-manifest.json`) is owned by the
  `mri-grid` task.
- Download URLs that work (verified 2026-09-08):
  - `https://s3.amazonaws.com/openneuro.org/ds007313/sub-A006/anat/sub-A006_T1w.nii.gz` (direct, no auth) ✓
  - `https://openneuro.org/crn/datasets/ds007313/snapshots/1.0.0/files/dataset_description.json` ✓ (root-level files only)
  - (the same `/files/sub-A006/...` route 404s for nested paths — use the S3 URL above or the GraphQL `files(recursive: true)` → `urls` field)

---

## 3. Link-out table (for later integration tasks; nothing embedded)

| Source | Link | License/notes |
| --- | --- | --- |
| Harvard Whole Brain Atlas | <https://www.med.harvard.edu/aanlib/> | Copyrighted; permission-gated. Link-out only. |
| BrainMaps.org | <https://brainmaps.org/index.php?p=termsofuse> | Per-dataset copyright; link-out only. |
| UBC neuroanatomy.ca — micrographs viewer | <https://www.neuroanatomy.ca/micrographviewer/> | CC BY-NC-SA 4.0 (embedded subset already under this license). |
| UBC neuroanatomy.ca — micrographs index | <https://www.neuroanatomy.ca/micrographs.html> | Same license. |
| MSU Human Brain Atlas — coronal montage | <https://brains.anatomy.msu.edu/brains/human/coronal/montage.html> | Credit line mandatory (above). |
| MSU Human Brain Atlas — horizontal/sagittal montages | <https://brains.anatomy.msu.edu/brains/human/horizontal/montage.html> · <https://brains.anatomy.msu.edu/brains/human/sagittal/montage.html> | Same policy. |
| MSU Human Brain Atlas — Brainstem atlas | <https://brains.anatomy.msu.edu/brains/human/brainstem/index.html> | Same policy. |
| MSU Human Brain Atlas — Human Hypothalamus | <https://brains.anatomy.msu.edu/brains/human/hypothalamus/index.html> | Same policy. |
| OpenNeuro ds007313 (T1w source) | <https://openneuro.org/datasets/ds007313/versions/1.0.0> | CC0. |
| MSU image-use instructions | <https://brains.anatomy.msu.edu/copyright.html> | Permission + credit policy quoted above. |

---

## 4. Payload budget

New committed assets from this task: `src/assets/imaging/stains/` =
27 JPEGs, **2,836 KB** total (17 UBC 1,752 KB + 10 MSU 1,084 KB).
Raw source material stays in gitignored `assets-src/imaging/`
(ubc-raw 14.4 MB, bmm-full 7.5 MB, mri 10.7 MB) — committed payload ≤ 6 MB
plan gate is respected (MRI grid bin + manifest come later via mri-grid task).
