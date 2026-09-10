# Real-Imagery Plan B — NeuroAxis v4b (Visible Human cryosections + real CT volume)

Follow-on to `docs/IMAGING_V4_PLAN.md`. The v4 research task (`modality-research`, completed) verified licences at source for 153 URLs and delivered a decisive finding:

> **NLM Visible Human Project (VHP) terms (2019): redistribution permitted with source acknowledgement — no fee, no NC clause.** (recorded in `docs/IMAGING_SOURCES_V4.md`)

It also downloaded **250 VHP cryosection files** (12.3 MB, `assets-src/imaging2/vhp-cryo/`, e.g. `axial-0040.jpg`, `axial-0060.jpg`, … with `.jpg.gz` twins) — **real cadaver cross-section photographs** — but did not embed them because the run's budget and task scope were fixed. Simultaneously it established that **no embeddable head-CT volume exists** in OpenNeuro (CC0 but no suitable head CT) and TCIA is out of budget (needs the Data Retriever); only **3 CC0 Commons CT slices** were embedded (upload.wikimedia.org rate-limited us with HTTP 429 after four).

This plan closes both gaps using the VHP, which is exactly the "real-world slice / CT cross-section photos" the product wants.

## 1. What VHP provides
| Product | Content | Use |
| --- | --- | --- |
| **Cryosection photographs (male)** | full-colour anatomical photographs, ~1 mm axial series through head/neck/body | the primary "real slice" experience, transverse planes, full colour |
| **CT (male)** | axial CT series, same cadaver, same geometry | build a **real CT volume** → continuous CT sampling at *any* slider position |
| **MRI (male)** | axial MR series, same cadaver | optional third continuous modality |
| Female dataset | same products | optional |

All three share one cadaver geometry, so a single registration (VHP → canonical) serves photographs, CT and MRI alike — cross-modality consistency for free.

## 2. Work items
> **Status update after the v4 run:** item 3 below (real CT volume) is **already delivered** — the `ct-grid` task sourced the **NLM Visible Human head CT** (463 DICOM slices, 0.5 mm, HFS) and baked `src/assets/imaging/ct.bin` + `ct-manifest.json` (`status:'available'`, dims 45×81×67, brain/bone windows, 238 KB). CT is therefore a live continuous modality; v4b focuses on the **cryosection photographs** (and optionally the VHP MRI series).

1. **Acquire a brain-focused VHP subset** (`assets-src/imaging3/`, gitignored): the axial cryosection photographs covering the brainstem, diencephalon and cerebellum. The v4 research task already downloaded 250 files to `assets-src/imaging2/vhp-cryo/` (e.g. `axial-0040.jpg`, `axial-0060.jpg`, … with `.jpg.gz` twins) — start from those, determine exactly which canonical y range they cover, and fetch any missing slices. Verify the NLM terms text at the source page again, capture the fetch date, and record the exact acknowledgement string VHP requires. Optionally probe the VHP MRI series for a second real MRI modality.
2. **Embed a curated cryosection set**: re-encode to ≤1200 px JPEG q80, select every-Nth slice covering our y-range plus extra density through the brainstem, register VHP → canonical with the established method (tuned affine + level-landmark residuals + preview renders with envelope silhouettes), and add `sectionImages.ts` entries `{axis:'transverse', planeValue:<canonical y>, fit:{…}}` with the VHP acknowledgement as the credit. Target ≤2.5 MB committed for ~25–35 photographs.
3. ~~Build a real CT volume~~ — **done in v4** (`ct-grid`, commit `74f7058`). Optional follow-up only: a VHP MRI volume as a third continuous modality.
4. **Wire + verify**: the v4 modality switcher (`auto|mri|ct|stain|none`, real-first with contour overlay) already exists — the new photographs flow into it unchanged; confirm `auto` prefers a photograph when the plane is anchored, else CT/MRI. Update README/ATTRIBUTION, run gates, dev smoke, then QA (licence/credit audit, plane anchoring spot-checks, orientation/mirroring checks, perf, regression).

## 3. Constraints
- Same as v4: `src/data/*.json` frozen; `sectionImages.ts` additive; validate/check/build green; committed imaging payload stays ≤8 MB total; raw downloads gitignored; every embedded asset has a verbatim credit + fetch date; link-out-only sources are never embedded.
- Registration honesty: VHP cryosections are a different individual from the OpenNeuro MRI subject — the atlas geometry (our envelopes) is the common frame, so each modality gets its own tuned affine and its residuals are reported in the manifest and disclosed in the UI (the v4 pattern).
- Orientation: transverse photographs must honour the §2 conventions (anterior up, patient-left on image-right) in the section view; VHP cryosections are photographed from a known direction — verify against a level plate before committing (wrong mirroring/flip is the most likely defect).

## 4. DAG (5 tasks)
| # | Task | Role | Deps |
| --- | --- | --- | --- |
| 1 | `vhp-acquire` | architect | — |
| 2 | `vhp-cryo-embed` | builder | 1 |
| 3 | `vhp-ct-volume` | architect | 1 |
| 4 | `v4b-integration` | integrator | 2, 3 |
| 5 | `v4b-qa` | reviewer | 4 |

## 5. Done
Cryosection photographs appear as the real base layer at their anchored transverse planes (full colour), the CT modality is live and continuous with brain/bone windows, credits + licences are recorded and visible, gates green, payload ≤8 MB, v1–v4 features regress-free.
