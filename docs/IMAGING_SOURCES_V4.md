# Imaging Sources V4 — licence verdicts & acquisition record

Research deliverable for the NeuroAxis v4 swarm run ("real cross-section imagery
as the primary section view"). Companion to `docs/IMAGING_V4_PLAN.md` §3, the v3
record in `docs/IMAGING_SOURCES.md`, and the credit lines in
`docs/ATTRIBUTION.md`.

**All source pages below were fetched live during this run; the fetch date for
every verdict is 2026-09-08.** Nothing here is copied from a secondary summary:
each licence claim is backed by a page retrieved at that date and stored under
the gitignored `assets-src/imaging2/probe/` (raw response bodies +
`fetch-log.json` with HTTP status per URL). **153 distinct source URLs were
probed**; the machine-readable coverage table is in
`assets-src/imaging2/sources.json` (`probeCoverage`).

> **Review update (`review-qa-v4`, 2026-09-10) — the CT row of §1 is
> superseded.** The research pass recorded "no embeddable head CT *volume*
> found" (§3.1), which was true for OpenNeuro/TCIA/BigBrain. The downstream
> `ct-grid` task then found and shipped one from a source this table had already
> cleared: the **NLM Visible Human Project "Additional Head Images" head CT
> DICOM series** (463 axial slices, licence cleared in §3.5, fetch date
> **2026-09-10**). `src/assets/imaging/ct.bin` + `ct-manifest.json` are
> committed with `status: "available"`, so the CT modality is live. The
> acquisition record is **§3.7**; the payload tables in §1/§4.2 and the
> limitation in §6.1 are updated accordingly. Everything else in this document
> is unchanged research output from 2026-09-08.

Sourcing contract applied (plan §3): prefer **CC0 > CC BY > CC BY-SA >
permission-with-credit**; verify **at the source**; record the verbatim credit
line; **never embed a link-out-only source** (Harvard atlas, BrainMaps); record
NC licences explicitly (UBC precedent) and keep their credits visible in-UI.

---

## 1. Executive summary

| Outcome | Result |
| --- | --- |
| New **real photographs** embedded | **24** (9 UBC transverse/horizontal + 15 UBC coronal), all CC BY-NC-SA 4.0 with the verbatim UBC credit |
| New **CT** imagery embedded | **3** CC0 axial head-CT slices (Wikimedia Commons "CT of a normal brain") **+ the continuous NLM Visible Human head CT volume** (see the review update above and §3.7) |
| Committed plate files | **27 PNG** in `src/assets/imaging/stains/` (`ubc-h*.png` ×9, `ubc-c*.png` ×15, `wikict-axial-*.png` ×3) |
| Manifest entries after this task | **54** (27 v3 unchanged + 27 v4) — asserted by `node assets-src/imaging2/verify.mjs` |
| **CT volume** for the `ct-grid` task | **FOUND and shipped** (review update): NLM Visible Human Project "Additional Head Images" head CT DICOM series, 463 axial slices, licence cleared in §3.5, fetched 2026-09-10 → `src/assets/imaging/ct.bin` (238 KiB) + `ct-manifest.json` `status: "available"`. The research-pass verdict it replaces — *no embeddable CC0/CC BY head CT volume in OpenNeuro/TCIA* — is kept verbatim in §3.1 as the record of that search |
| Committed payload added | **2.88 MB** of plates (27 files, lossless PNG) **+ 0.24 MB** `ct.bin` = **3.12 MB**, within the plan's ≤4 MB new-asset budget |
| Link-out-only sources embedded | **none** |
| Raw material kept out of git | `assets-src/imaging2/` (gitignored): **16.3 MB** of source imagery (UBC 11.1 MB, Commons CT 0.5 MB, VHP cryosections 12.3 MB incl. verbatim `.jpg.gz` + decompressed, MSU 3.6 MB) plus 13.9 MB of probe evidence. The later `ct-grid` task added the VHP CT series in the same gitignored tree (**109.5 MB**, 463 gzip'd DICOM slices, §3.7), taking `assets-src/imaging2/` to **151.9 MB** — none of it committed |

---

## 2. Verdict matrix (source → licence → embeddable? → credit → what was taken)

| Source | Licence (verified at source; per-row dates) | Embeddable? | Verbatim credit line | What was taken |
| --- | --- | --- | --- | --- |
| **UBC Functional Neuroanatomy** — horizontal & coronal section viewers (`neuroanatomy.ca`) | **CC BY-NC-SA 4.0** — site footer on every page, linked to the CC deed | **YES (embedded, NC recorded)** | `© University of British Columbia, CC BY-NC-SA 4.0` | **24 plates**: 9 transverse (`ubc-h12..h20`) + 15 coronal (`ubc-c07..c24`), re-encoded losslessly → `src/assets/imaging/stains/ubc-h*.png`, `ubc-c*.png` |
| **Wikimedia Commons** — "CT of a normal brain" series (Mikael Häggström, M.D.) | **CC0 1.0** — per-FILE `extmetadata`: `LicenseShortName: CC0`, `AttributionRequired: false` | **YES (embedded)** | `CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)` *(CC0 needs no credit; shown for provenance)* | **3 axial head-CT slices** (indices 10, 14, 18) → `wikict-axial-{10,14,18}.png`. Further slices blocked by HTTP 429 (§3.3) |
| **brainmuseum.org / MSU Human Brain Atlas** | **Site permission** (credit required, no re-copyrighting) | YES (already embedded in v3) | `University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health` | **no new files**: the 10 v3 coronal cell stains were re-fetched to `assets-src/imaging2/msu-coronal/` as provenance evidence; **no additional MSU levels were added** (see §3.4) |
| **OpenNeuro** | **CC0** per dataset (licence read from each dataset's metadata via the public GraphQL API) | YES in principle | none required (CC0) | **nothing new**: no CT dataset suitable for a volume was found (§3.1); the v3 MRI source (`ds007313`, CC0) stands |
| **NLM Visible Human Project** — "Additional Head Images" cryosections (BWH/Harvard head, donor #2) | **NLM Terms and Conditions (2019)** — redistribution expressly contemplated; acknowledgement required. The 2019 change replaced the old licence agreement, and NLM describes the VHP as a *public-domain* library | **YES (licence cleared)** — not yet processed | `Courtesy of the U.S. National Library of Medicine` | **125 half-size cryosections downloaded** (0.147 mm, served as gzip'd JPEG) → `assets-src/imaging2/vhp-cryo/`; **nothing committed this run** — the index→level mapping needs a visual pass this session cannot do (§3.5) |
| **NLM Visible Human Project** — "Additional Head Images" **head CT** DICOM series ("HARVARD 02", same donor) | **NLM Terms and Conditions (2019)** — same terms text verified at source; redistribution permitted with the verbatim acknowledgement, no fee, no NC clause. **Added 2026-09-10 by the `ct-grid` task after this verdict matrix was written** (§3.7) | **YES (embedded)** | `Courtesy of the U.S. National Library of Medicine` | **the continuous CT grid**: 463 axial slices (1.5 mm, 512², 12-bit stored) → `src/assets/imaging/ct.bin` (238 KiB uint8) + `ct-manifest.json` (`status:"available"`, `windows:{brain,bone}`) |
| **TCIA** | **per collection**; the head/neck collections inspected grant **CC BY 3.0** | YES in principle | per-collection **Data Citation incl. DOI** | **nothing**: downloads need the TCIA Data Retriever and the smallest head/neck collections are hundreds of MB (§3.6) |
| **BigBrain** (McGill/MNI) | **CC BY-NC-SA 4.0** | NO (this run) | `BigBrain (Amunts et al. 2013, Science) — CC BY-NC-SA 4.0` | **nothing**: NC clause + multi-hundred-GB volume; the plan forbids downloading the volume |
| **Allen Human Brain Atlas** | CC BY 4.0 for the 2020 reference atlas (per Allen terms + community announcement); older products vary | NO (this run) | `© Allen Institute for Brain Science. Allen Human Brain Atlas. Available from: human.brain-map.org` | **nothing**: no small brainstem-level plates with a stated plane position; served through a web API |
| **Harvard Whole Brain Atlas** | Copyrighted / permission-gated | **NO — link-out only** | — | nothing embedded (plan + v3 precedent) |
| **BrainMaps.org** | Per-dataset copyright | **NO — link-out only** | — | nothing embedded (plan + v3 precedent) |

Verbatim licence evidence (quotes + URLs + HTTP statuses) for every row is in
`assets-src/imaging2/sources.json` → `sources[].licenseEvidence`, and the raw
response bodies are under `assets-src/imaging2/probe/`.

---

## 3. Candidate-by-candidate findings

### 3.1 OpenNeuro CT — searched, not found

OpenNeuro's public GraphQL API (`https://openneuro.org/crn/graphql`) was used to
enumerate datasets. Two things were established:

1. **The licence is per dataset and readable**: `datasets { latestSnapshot {
   description { Name DatasetDOI License } } }` returns each dataset's licence
   string. Across the datasets sampled, the licences in use are `CC0`, `PDDL`,
   one `CC BY 4.0`, one `CC BY-NC 4.0` and a handful of unset entries — so
   "OpenNeuro is CC0" is true for the modern uploads, **not** universally
   (four old datasets carry no licence and must be avoided).
2. **A dataset filter for keyword/modality no longer exists**: introspecting
   `DatasetFilter` returns only `all`, `invalid`, `public`, `shared`, `starred`
   — the v3-era search parameters are gone, so candidate discovery has to page
   through the dataset list and read names/summaries, which is what was done.

**Result: no single-session head/neck CT dataset with brainstem coverage and a
modest volume size was located *in OpenNeuro*.** OpenNeuro remains an
MRI-centric archive. The honest verdict for the `ct-grid` task was therefore:

> **no embeddable CC0 head CT *volume* was located in OpenNeuro/TCIA** — a CC0
> head CT *slice series* was (Wikimedia Commons, §3.3), and those slices are
> pre-windowed 8-bit images, so they cannot be resampled into a calibrated
> volume.

`assets-src/imaging2/sources.json` records this under `notFound[]`, and the plan
already provides for it: `scripts/build-ct-grid.mjs` should return
`{status:'unavailable', reason}` rather than fail.

> **Resolved (review-qa-v4, 2026-09-10).** The `ct-grid` task did better than
> the fallback: it built the volume from the **NLM Visible Human head CT DICOM
> series** — a source this research pass had already cleared and recorded
> (§3.5) but not acquired. `ct-manifest.json` carries `status:"available"`, so
> the CT modality is live and no `{status:'unavailable'}` path was needed (that
> path stays implemented and tested for a build without the bake). Full
> acquisition record: §3.7.

### 3.2 UBC `neuroanatomy.ca` — extended beyond the v3 micrographs ✅

§1 of the plan notes v3 takes only the 17 **micrograph** plates
(`/micrographviewer/images/micrographs/mN/mNbrain.png`). The same site hosts two
further *sectional* corpora that v3 did not use:

| Viewer | URL | Content | Files |
| --- | --- | --- | --- |
| Horizontal (transverse) sections | <https://www.neuroanatomy.ca/horizontals.html> → `/horizontalviewer/` | 20 real transverse slabs of a head, `images/horizontal_slices/hN/hNbrain.png`, **800×700 PNG** | `h1..h20` |
| Coronal sections | <https://www.neuroanatomy.ca/coronals.html> → `/coronalviewer/` | 24 real coronal slabs, `images/coronal_slices/cN/cNbrain.png`, **800×600 PNG** | `c1..c24` |

Evidence method: each viewer's own metadata bundle
(`/horizontalviewer/util/slicesInfo.js`, `/coronalviewer/util/slicesInfo.js`)
was fetched and parsed (parser:
`assets-src/imaging2/probe/ubc-slices-parse.mjs`; parsed output stored as
`ubc-horizontal-slices.json` / `ubc-coronal-slices.json`). The bundles give, per
slice, the **canvas path**, the **viewer overlay label** and the per-slice MRI /
text-label companion files. The overlay labels are the site's *own* anatomical
annotation and are the positional evidence used in §5.

Both series are covered by the same site-wide licence footer as the v3
micrographs (**CC BY-NC-SA 4.0**), so they follow the existing UBC precedent: the
NC clause is recorded explicitly in `docs/ATTRIBUTION.md` for a
non-commercial educational tool, and the verbatim credit is rendered in-UI.

**Sampling:** to stay inside the payload budget the transverse series is taken
from `h12` (anterior cerebral artery) through `h20` (cerebellar tonsil) — the
nine slices that bracket the brainstem and cerebellum — and the coronal series
from `c7` (caudate) through `c24` (calcarine fissure), i.e. the 15 slices whose
labels place them from the diencephalon down through the medulla.

### 3.3 Wikimedia Commons — CC0 head CT slices ✅ (partially taken)

Search method: the Commons API with `generator=search` + `prop=imageinfo` +
`iiextmetadatafilter=LicenseShortName|AttributionRequired|Artist|Credit`, so
**every candidate carries its own per-file licence in the response** rather than
being inferred from a category. The search
`intitle:"CT of a normal brain"` returns **100 files, all `CC0`** (licence
histogram computed over the whole response:
`100/100 CC0`, `AttributionRequired: false`), across three planes:
`axial 1..40`, `coronal 1..48`, `sagittal 1..40`, each **4 mm thick, no IV
contrast, 646×468 (axial/coronal) or 770×430 (sagittal) PNG** with a stated
4 mm slice thickness in the file description.

* **Taken:** axial indices 10, 14, 18 → `src/assets/imaging/stains/wikict-axial-{10,14,18}.png`.
* **Blocked:** `upload.wikimedia.org` began answering **HTTP 429 (rate limit)**
  after four files and kept doing so on retry (two fetchers, 5 s and 9 s pacing,
  up to 6 attempts each; `Special:FilePath?width=…` returns 429 as well). The
  file **list, licences and direct URLs are all recorded** in
  `probe/commons-search-ct-normal-brain-axial.txt` and
  `probe/commons-cat-ct-normal-brain-sagittal.txt`, so any later run — or the
  `ct-grid` task — can complete the download without repeating the research.
  This is recorded in `sources.json` → `sources[wikimedia-commons].verdict`.

### 3.4 MSU / brainmuseum.org — no new levels added

The v3 record (`docs/IMAGING_SOURCES.md` §2.2) notes the site's HTML is behind an
Incapsula bot-protection layer. That was re-confirmed: with browser-like headers
the montage page returns an Incapsula interstitial (`Request unsuccessful.
Incapsula incident ID …`), **while the image files themselves return HTTP 200**
through plain Node fetch. Consequently the montage listing could not be read to
discover levels beyond the 10 already embedded in v3; those 10 were re-fetched
(`assets-src/imaging2/msu-coronal/`) as provenance evidence, and **no additional
MSU level was added**. This is a documented limitation, not a licence problem.

Two further findings about these files:

* they are **progressive JPEGs** (my pipeline's own JPEG decoder rejects
  progressive scans — see §6), which is why the MSU plates are **not** among the
  re-encoded v4 assets;
* the site asks to be notified of use (`vincen29@msu.edu`); the v3 open action
  stands, unchanged by this run.

### 3.5 Visible Human Project — licence cleared, processing deferred

This is the most consequential licence finding of the run. The v3-era assumption
was that the VHP is "redistribution likely prohibited → link-out only". **That is
out of date:**

* `https://www.nlm.nih.gov/research/visible/getting_data.html` states: *"As of
  July 2019, the NLM Data License has been replaced by Terms and Conditions."*
* Those Terms (<https://www.nlm.nih.gov/databases/download/terms_and_conditions.html>,
  last reviewed 2019-05-21) **contemplate redistribution explicitly** — *"Users
  who republish or redistribute the data (services, products or raw data)
  agree to: maintain the most current version of all distributed data…"* — and
  ask for one acknowledgement: *"acknowledge NLM as the source of the data by
  including the phrase "**Courtesy of the U.S. National Library of Medicine**" in
  a clear and conspicuous manner"*. There is **no fee and no NC clause**.
* NLM's own overview page describes the VHP as *"a public-domain library of
  cross-sectional cryosection, CT, and MRI images"*.

The **"Additional Head Images"** dataset is the relevant subset: a
formalin-preserved 72-year-old male donor head (Brigham and Women's Hospital /
Harvard Medical School, Ratiu et al.), cryosectioned at **0.147 mm** with
post-freeze MRI and CAT of the same specimen. The half-size tier is served as
**gzip'd JPEG** (~28 KB per slice), 1477 axial + 1528 coronal + 836 sagittal
slices; `README_cryo.txt`, `README_MRI.txt` and the directory indexes were
retrieved and are stored under `probe/`.

**125 slices were downloaded** to `assets-src/imaging2/vhp-cryo/` (both the
verbatim `.jpg.gz` and the decompressed `.jpg`, so the source byte-stream is
preserved). **None was committed this run** because mapping an axial index to a
canonical level for this donor requires visually identifying the brainstem in
the slice, and this session has no vision model available (§6). The licence
verdict and credit line are recorded so a follow-up can commit them.

### 3.6 TCIA, BigBrain, Allen, Harvard, BrainMaps

* **TCIA** — licence grants are per collection. The inspected head/neck
  collections grant **CC BY 3.0**, and attribution must include the collection's
  **Data Citation with DOI**. However the images are distributed through the
  **TCIA Data Retriever / NBIA REST API**, not plain HTTP links, and the
  collections are hundreds of MB; the NBIA public query service did not answer
  within this session's timeout. Nothing was taken. Link-out only.
* **BigBrain** — CC BY-NC-SA 4.0 with an explicit NC clause, and a volume of
  several hundred GB; the plan forbids downloading it. Nothing taken.
* **Allen Human Brain Atlas** — Allen's Terms of Use require attribution, and the
  2020 Human Reference Atlas moved to CC BY 4.0 (per Allen's own community
  announcement). No small brainstem-level plate files with a stated plane
  position were found; the data is served through a web API. Nothing taken.
* **Harvard Whole Brain Atlas / BrainMaps.org** — unchanged from v3: **link-out
  only, nothing embedded.**

### 3.7 NLM Visible Human head CT — the continuous CT volume ✅ (acquired by `ct-grid`, reviewed 2026-09-10)

The volume that `ct-grid` needed came from the **same VHP product §3.5 had
already licence-cleared**, so no new licence analysis was required — but the
licence and the fetch are re-recorded here because this is the embedded asset:

| Field | Value |
| --- | --- |
| Source | NLM Visible Human Project — *Additional Head Images*, **"HARVARD 02" head CT** series (Brigham and Women's Hospital / Harvard Medical School head, donor #2), DICOM study `1.3.46.670589.5.2.13.2198413315.1018359151.348414` |
| Landing page | <https://www.nlm.nih.gov/research/visible/getting_data.html> |
| Series directory | <https://data.lhncbc.nlm.nih.gov/public/Visible-Human/Additional-Head-Images/MR_CT_DICOM/CAT/> (463 files `J.001.gz` … served gzip'd DICOM) |
| Licence | **NLM Terms and Conditions (2019)**, <https://www.nlm.nih.gov/databases/download/terms_and_conditions.html> — re-fetched at source for this record (last reviewed by NLM 2019-05-21) |
| Verbatim licence text (relied upon) | *"Users who republish or redistribute the data (services, products or raw data) agree to: maintain the most current version of all distributed data, **or** make known in a clear and conspicuous manner that the products/services/applications do not reflect the most current/accurate data available from NLM."* and *"acknowledge NLM as the source of the data by including the phrase '**Courtesy of the U.S. National Library of Medicine**' in a clear and conspicuous manner"*. Also: *"No charges, usage fees or royalties are paid to NLM for this data."* |
| Required acknowledgement, verbatim | `Courtesy of the U.S. National Library of Medicine` — the CT layer's credit (`ct-manifest.json` → `credit`), rendered in-UI wherever the CT draws |
| Fetch date | **2026-09-10** (raw slices in gitignored `assets-src/imaging2/vhp-ct/`, 463 files / 109.5 MB; downloader `assets-src/imaging2/vhp-ct-download.mjs`, report `vhp-ct-fetch-report.json`) |
| What was embedded | `src/assets/imaging/ct.bin` (244,215 B uint8, 45×81×67, same canonical box/spacing as the MRI grid) + `ct-manifest.json` with `windows:{brain:[−20,100], bone:[200,1600]}`, the registration constants/residuals and `status:"available"` |
| Adaptations | LPS patient-mm → canonical au by a fixed affine from `ImagePositionPatient` / `ImageOrientationPatient` / `PixelSpacing`; trilinear resample to 1.5 mm grid steps; `storedHU = stored16 · 1 − 1200`; uint8 encoding through the brain window. No crop, no retouch, re-runnable with `node scripts/build-ct-grid.mjs` |
| NC status | **not NC-licensed** — no non-commercial clause, no fee |
| Redistribution condition | the NLM terms' *most-current-version* clause is met by the second arm: the committed grid is a **frozen 2026-09-10 snapshot** and the UI/docs state that it is a fixed teaching resample, not a live mirror of NLM's series (recorded in `docs/ATTRIBUTION.md` §"NLM Visible Human Project — Additional Head Images head CT") |

`docs/ATTRIBUTION.md` carries the same record with the full attribution
sentence; `README.md`'s modality table carries the credit line verbatim.
`scripts/verify-imaging-v4.mjs` asserts that the exact NLM phrase is present in
`ct-manifest.json`, `docs/ATTRIBUTION.md` and `README.md`, and that no
link-out-only source is embedded.

---

## 4. Assets taken — exact paths and licences

All committed **plate** files live in `src/assets/imaging/stains/` and are
referenced from `src/data/sectionImages.ts`; the continuous CT grid added later
in the run is `src/assets/imaging/ct.bin`. Raw downloads stay in the gitignored
`assets-src/imaging2/`.

| Committed file | Source | Licence | Credit |
| --- | --- | --- | --- |
| `ubc-h12.png … ubc-h20.png` (9) | `neuroanatomy.ca/horizontalviewer/images/horizontal_slices/hN/hNbrain.png` | CC BY-NC-SA 4.0 | `© University of British Columbia, CC BY-NC-SA 4.0` |
| `ubc-c07.png … ubc-c24.png` (15) | `neuroanatomy.ca/coronalviewer/images/coronal_slices/cN/cNbrain.png` | CC BY-NC-SA 4.0 | `© University of British Columbia, CC BY-NC-SA 4.0` |
| `wikict-axial-10.png`, `wikict-axial-14.png`, `wikict-axial-18.png` (3) | `commons.wikimedia.org` File pages "CT of a normal brain, axial N.png" | CC0 1.0 | `CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)` |
| `ct.bin` + `ct-manifest.json` (§3.7) | NLM Visible Human Project *Additional Head Images* "HARVARD 02" head CT DICOM series | NLM Terms and Conditions (2019) | `Courtesy of the U.S. National Library of Medicine` |

### 4.1 Adaptations applied to the embedded files

> **Deviation from the task brief, stated up front:** the brief asked for
> "≤1400 px wide JPEG q80" for the new plates. **The committed plates are
> lossless PNG, not JPEG.** Reason: the pipeline's own JPEG *encoder*
> (`assets-src/imaging2/lib/jpeg-encode.mjs`, written for this task because no
> image tooling exists on this machine) proved unreliable on real photographic
> content during this run — synthetic images round-tripped at 33–50 dB but real
> photographs came back at ~15 dB with large blocking artefacts — and the
> decoder that validated it is baseline-only. Rather than commit assets through
> an encoder whose output quality could not be trusted, the plates take a
> **lossless, verifiable** path: decode with a pixel-verified PNG decoder,
> re-encode with an adaptive-filter PNG encoder whose round-trip is asserted to
> be **pixel-exact (0 mismatched samples)**. The result is strictly better for
> content fidelity (bit-exact pixels, no generation loss), stays inside the
> payload budget, and every file carries a SHA-256. Widths are ≤800 px (all
> sources were already ≤1400 px), so no upscaling and no crop occurred.
> The JPEG codec remains in `assets-src/imaging2/lib/` for later use and its
> limitation is recorded in §7.

Recorded because CC BY-NC-SA attribution practice requires it (the v3 record does
the same):

* **No crops, no retouching, no compositing.** Full field of view preserved.
* **Integer box downsampling ×2** (UBC 800×700 → 400×350; 800×600 → 400×300;
  Commons 646×468 → 323×234) to fit the payload budget while keeping ≥4 px per
  millimetre on the brainstem.
* **Alpha flattened onto white** for the UBC plates, whose source PNGs mark the
  tissue with real alpha (tissue-on-transparent). This is a technical
  modification, permitted by CC BY-NC-SA §2(a)(4); the pixels inside the tissue
  are unchanged.
* **Lossless PNG re-encode** with per-scanline adaptive filtering
  (`assets-src/imaging2/lib/png-encode.mjs`). Round-trip verified pixel-exact
  (0 mismatched samples) against the decoder in
  `assets-src/imaging2/lib/png-decode.mjs`.
* **No metadata written**: no EXIF, ICC, timestamps or ancillary chunks, so no
  source metadata is propagated.
* **No mirroring**: every source already places patient-left on image-right in
  transverse and coronal planes, matching the section canvas convention, so
  `fit.mirrorX` is `false` for every entry.

### 4.2 Payload

| Bucket | Size |
| --- | --- |
| New committed plates (27 files) | **2.88 MiB** |
| Existing v3 stain JPEGs (27 files) | 2.77 MiB |
| MRI grid (`mri-t1.bin`) | 0.23 MiB |
| **CT grid (`ct.bin`, added by `ct-grid`)** | **0.23 MiB** |
| Manifests (`mri-manifest.json`, `ct-manifest.json`) | <0.01 MiB |
| **Total imaging payload** (`src/assets/imaging/`, 58 files) | **6.12 MiB** (plan cap 8 MiB) — re-measured and asserted by `node scripts/verify-imaging-v4.mjs` |
| Raw evidence kept out of git (`assets-src/imaging2/`) | 151.9 MB total (16.3 MB source imagery + 13.9 MB probe responses + 109.5 MB VHP CT series + code/records) |

---

## 5. Plane anchoring and `fit` calibration (and its limits)

`src/data/sectionImages.ts` now carries, per v4 entry: `axis`, optional
`planeValue` (canonical au: transverse → **y**, coronal → **z**, sagittal →
**x**), `planeValueNote`, and `fit {scale, dx, dy, mirrorX}`.

### 5.1 `planeValue` — what it is and how far to trust it

**The sources publish no numeric section position for any of these plates.**
UBC states one anatomical landmark per slice (via the viewer overlay labels) and
Commons states only the slice index and 4 mm thickness. Therefore:

| Series | Anchor evidence (site's own) | Derivation | Confidence |
| --- | --- | --- | --- |
| UBC transverse `h12..h20` | `h16` = "Basilar Pons", `h17` = "Dentate Nucleus", `h14` = "Basilar Artery" | `h16 → y = −14` (lower pontine body: between `lvl-pons-middle` −8 and `lvl-pons-caudal` −18), `h17 → y = −26` (dentate, just caudal to the pons); **6 au steps** from `h12` (y = +10) through `h20` (y = −44) with **one 12 au gap** between `h16` and `h17` | **estimate** — correct ordering; ±1 step, i.e. ≈6 au inside each run (≈12 au across the `h16`/`h17` gap) |
| UBC coronal `c07..c24` | `c14–c17` = "Basilar Pons", `c20–c22` = "Cerebellar Tonsil" | `c16 → z = −14`, `c21 → z = −46` (foramen-magnum tonsillar level, next to `lvl-spinal-medulla`); **5 au steps** through `c13–c18`, widening to 7–10 au outside that brainstem run (`c18→c19` −8, `c19→c20` −7, `c20→c21` −7, `c21..c24` −3/−2/−3, `c13→c11` −10) | **estimate** — correct ordering; ±1 step, i.e. ≈5 au through the brainstem, up to ≈10 au at the two ends |
| Commons axial 10/14/18 | series index + 4 mm slice thickness | pro-rated over the head with **2 au per slice** on the brainstem | **estimate** — index is exact, absolute level is not |

**Review update (`review-qa-v4`, 2026-09-10) — anchoring defects found and fixed.**
`node scripts/verify-imaging-v4.mjs` re-derives this table from the committed
manifest and the reachable slider range and found two defects in the first
pass, both now fixed and asserted by that script:

1. **`ubc-c07` was anchored at `z = 31`, outside the reachable coronal slider
   range `z ∈ [−56, 26]`** (`CLIP_BOUNDS.z`, `src/components/viewer3d/clipPlanes.ts`),
   so the plate and its credit could never be displayed. Clamped to the
   anterior limit **`z = 26`** (5 au rostral to `c09`, so the ordering is
   preserved).
2. **`ubc-h12`/`ubc-h13` had swapped `levelId`s** (`h12` ↔ `lvl-pons-rostral`,
   `h13` ↔ `lvl-midbrain-ic`, the reverse of the nearest-anchor rule every other
   entry follows). Corrected — runtime drawing was unaffected (both levels have
   an earlier v3 micrograph in manifest order, so the level-mapped pick never
   changed), but the manifest metadata is now consistent.

All 24 anchored plates are now inside the reachable range with non-overlapping
±1.5 au mount windows, i.e. each plate is the unique nearest plate at its own
`planeValue` (also asserted by the script).

Because these are estimates, every estimate is flagged in the manifest's
`planeValueNote`. **What the integration/review tasks decided (recorded here so
the choice is not re-litigated silently):** the ±1.5 au mount tolerance was
**kept** (it is what the plan §4 contract specifies, and widening it would make
two neighbouring plates compete for the same plane — the 5–6 au step means
±1.5 au is already half a step); instead of refining the anchors visually, the
build verifies **reachability** and **unambiguous selection** mechanically with
`scripts/verify-imaging-v4.mjs`. The anchor *values* themselves were **not**
re-estimated: no vision model was available to this run (see §5.3), and
re-deriving them from the sources' text labels cannot do better than the
±1-step figures above. So: the plane a photograph claims is a plane the user can
reach and only that photograph mounts there — but the claim is still an estimate
with the stated uncertainty, which is exactly what the UI says ("photo coverage
is per-plane (±1.5 au)").

### 5.2 `fit` — documented defaults

`fit` is a **first-pass** image→canonical affine, derived per image from
measurements on the plate itself (never guessed):

* **Tissue mask**: the UBC plates carry real alpha, so the alpha channel *is* an
  exact tissue mask. Measurement therefore happens **before** flattening onto
  white (`geometryRgba()` in `assets-src/imaging2/process-photos.mjs`); measuring
  after flattening would read the white background as tissue and destroy the
  midline estimate. (This bug was hit and fixed during the run.)
* **Label robustness**: the plates carry text labels near the edges, so the
  horizontal extent is measured from the **central 60 % vertical band** only,
  and the vertical extent from the centre column of that span.
* **Symmetry axis** (`midline`): the darkest mean-luminance column inside the
  middle 40 % of the measured tissue span — the brainstem midline is the darkest
  midline structure in transverse and coronal plates.
* **`scale`** (pixels per canonical au) is a **family constant** derived from the
  measured tissue width against the same anatomy's canonical size:
  UBC transverse 660 px / ≈50 au = **13.2 px/au**; UBC coronal
  645 px / ≈36 au = **17.9 px/au**.
* **`dx`** = `(midlinePx − imageWidth/2) / scale`, in canonical au
  (+ = midline right of the image centre). Per-image values are in the manifest.
* **`dy` = 0** and **`mirrorX` = false** are the documented defaults.

Per-image measurements (`bbox`, `vExtent`, `midline`, `midlineFrac`, `meanChroma`,
`monochrome`, downsampled dark profile) are stored in
`assets-src/imaging2/processed-photos.json` and echoed into `sources.json`, so
the integration task can recalibrate without re-measuring.

**Known limitation, stated honestly:** these plates are *photographs of slabs*,
not registered volumes. `scale` is a family constant, not a per-image landmark
fit, so a photo can be placed on the correct plane and scale but its internal
detail will not pixel-align with the canonical contours. The v3 MRI/stain layers
had the same property; the honest UI statement is "real section at this plane",
not "registered to this plane".

### 5.3 Real-image character verification (no vision model available)

This session has **no vision model** (the image-reading tools are unavailable to
it), so images could not be *looked at*. Instead, each new plate was verified
quantitatively to be a **photograph rather than a drawing**, and the measurements
are reproducible:

| Plate class | Quantised colours (sampled) | Mean local gradient | Verdict |
| --- | --- | --- | --- |
| UBC transverse (`h*`) | 3,100–4,500 | 22–32 | photographic |
| UBC coronal (`c*`) | 2,800–3,900 | 13–16 | photographic |
| v3 UBC micrograph (reference) | 3,306 | 34.1 | photographic |
| UBC overlay-label PNG (control) | **4** | — | vector/text |

(Colour-entropy measurement in `assets-src/imaging2/probe/imgstats.mjs`.)
All plates are 8-bit RGB after processing; `meanChroma` in the measurement record
confirms the CT plates are greyscale (`monochrome: true`) while the UBC plates are
stained colour (`meanChroma` ≈ 85–104).

---

## 6. Limitations, failed probes and what could NOT be found

Recorded because a sourcing record is only useful if it states its gaps.

1. **No embeddable CC0 head CT volume *in OpenNeuro/TCIA*.** See §3.1.
    **Superseded (review-qa-v4, 2026-09-10):** the `ct-grid` task built the
    volume from the NLM Visible Human head CT series (licence cleared in §3.5,
    acquisition record §3.7) and shipped `ct.bin` with `status:"available"`, so
    this limitation no longer applies to the shipped build. The
    `{status:'unavailable', reason}` degradation path stays implemented for a
    build without the bake. The CC0 *slice* series from Commons (pre-windowed
    8-bit) still cannot be turned into a calibrated volume — that part stands.
2. **Wikimedia upload host rate limit (HTTP 429).** Only 4 of 37 CC0 CT slices
   downloaded; 3 are embedded. Retried with 5 s and 9 s pacing, two runs, up to 6
   attempts per file, and via `Special:FilePath?width=`, all 429. File list,
   licences and direct URLs are stored for a later run.
3. **No new MSU levels.** The site's HTML stays behind Incapsula bot protection
   (interstitial returned even with browser-like headers); only the image files
   are reachable, and the montage listing that enumerates levels is HTML.
4. **MSU files are progressive JPEGs**, which the pipeline's own decoder
   (baseline-only, §7) rejects — so the MSU plates are unchanged from v3.
5. **No embeddable photographic *sagittal* series.** The only sagittal real
   imagery located is MRI (`neuroanatomy.ca/mri.html`, CC BY-NC-SA 4.0, 800×600
   plates) or the VHP cryosections. Neither was committed: the MRI plates are
   clinically windowed grayscale of the same modality the MRI grid already
   provides, and the VHP series needs the level mapping described in §3.5.
6. **VHP cryosections downloaded but not committed** (125 files, 6.2 MB raw) —
   licence cleared, credit line recorded, processing needs a visual pass.
7. **TCIA not acquired** — Data Retriever distribution + collection size exceed
   this run's budget; the NBIA public query service timed out.
8. **No vision model in this session.** Every "this is a real photograph" claim
   rests on quantitative image statistics (§5.3), not on looking at the image;
   every plane anchor is derived from the source's own text labels, not from
   visually locating the brainstem. Both are stated in the manifest's
   `planeValueNote` and here.
9. **Final QA (`review-qa-v4`) was done by source review + a reproducible gate,
   not by eye.** `scripts/verify-imaging-v4.mjs` re-derives anchoring, selection,
   level metadata, the §2.2 orientation tables of both section surfaces, all
   verbatim credit lines and the payload budgets from the committed files and
   exits non-zero on any violation; `npm run validate`/`check`/`build` and an
   HTTP smoke test of the dev server cover the rest. What that does **not**
   cover: pixel-level appearance (does the photograph *look* right at that
   plane?), because this environment has no browser-automation or vision tool.
   The one visual-orientation defect this review found (the GPU PiP's transverse
   badges reading P-up/L-left after v4 changed them while leaving the camera and
   blit untouched) was therefore settled by geometry + the plan's §2.2 table,
   not by looking at a screenshot.

---

## 7. Pipeline notes for downstream tasks

* **Formats**: the new plates are **PNG** (lossless, adaptive per-scanline
  filtering) — not JPEG — because the lossless path is verifiable end-to-end and
  stays inside the payload budget, and every plate carries an exact SHA-256 in
  `processed-photos.json` and `sources.json`.
* **Decoding**: `assets-src/imaging2/lib/png-decode.mjs` handles PNG sources;
  `assets-src/imaging2/lib/jpeg-decode.mjs` is a **baseline-only** JPEG decoder
  (sequential DCT, 1–3 components, arbitrary subsampling; **no progressive
  support**). It decodes every v3 stain JPEG and every Commons CT PNG used here,
  and it is the reference implementation against which the manifest's image
  statistics were produced.
* **`src/data/*.json` is frozen** and untouched: the anchors live in
  `src/data/levels.json` and the new plate entries are additive in
  `src/data/sectionImages.ts`. All 27 v3 entries keep their ids, files, credits
  and behaviour.
* **Consumer API added**: `sectionImagesNearPlane(axis, planeValue, tolerance)`
  returns the plates whose `planeValue` is within the tolerance — the natural
  hook for the "real-first" default and for the PiP backdrop. `sectionImages`,
  `sectionImagesForLevel` and `sectionImagesForAxis` are unchanged in behaviour.
* **Regenerate everything**: `node assets-src/imaging2/acquire.mjs` (raw),
  `node assets-src/imaging2/process-photos.mjs --write` (committed plates),
  `node assets-src/imaging2/build-sources-json.mjs` (sources record). All are
  deterministic and idempotent.
