# Real-Imagery Plan — NeuroAxis v4 (real slices / MRI / CT as the section view)

Goal: when the sliders move, the section view shows **real-world imagery** — real MRI, real CT, and real histological/cryosection photographs — with our 3D anatomy overlaid on top, instead of relying on the simulated contour drawing alone. The simulated section stays available (it is the only thing that works at *every* plane and labels structures), but **real imagery becomes the primary look wherever real data covers the plane**.

## 1. What already exists (v3, verified)
| Piece | Status |
| --- | --- |
| Real T1w MRI underlay at **any** plane (all 3 axes) | ✅ `src/assets/imaging/mri-t1.bin` (238 KB uint8 grid, 45×81×67 @ ~1.23 mm), from OpenNeuro **ds007313** (CC0, 3T MPRAGE, head+cervical spine), registration midline residual ≤1.75 au. Sampled live by `src/components/section/imageLayers.ts` |
| Real stain photographs at mapped transverse levels | ✅ 27 JPEGs in `src/assets/imaging/stains/` — 17 UBC `neuroanatomy.ca` micrographs (CC BY-NC-SA 4.0) + 10 MSU/Wisconsin `brainmuseum.org` coronals (educational permission, credit required) |
| Layer API + Live-section canvas + GPU section PiP | ✅ `registerImageLayer` in `SectionCanvas.tsx`; PiP in `SectionPiP.tsx` (fixed commit `bfeceb0`) |

## 2. Gaps this run closes
1. **Real-first rendering** — today the simulated contours are the base and the real image is a subdued underlay. Invert the default: real image = base layer; structure contours = translucent overlay (toggleable); "simulated only" mode retained.
2. **CT** — no CT modality at all. A CC0/CC-BY head CT volume would give a second continuous real modality (bone/skull reference, different tissue contrast).
3. **More real photographs**, especially **coronal** coverage (currently only 10 MSU coronals, unmapped to planes) and any additional open-licensed transverse histology beyond UBC's 17.
4. **PiP real backdrop** — the 3D PiP currently shows only the GPU-cut anatomy; it should paint the real slice (MRI/CT/stain at this plane) into its render target *behind* the 3D cut, so the panel reads like a real section with 3D structures overlaid.
5. **Plane-anchored photo placement** — coronal photo series need per-image plane anchoring (planeValue + fit affine) so they appear at the right slider position, not just near a level anchor.

## 3. Sourcing contract (research task must verify at source, with fetch dates)
Candidate databases to evaluate — verify licence text **at the source page**, record the verbatim credit line, and prefer CC0 > CC BY > CC BY-SA > permission-with-credit. **No NC-licensed CT/MRI unless the tool's non-commercial educational framing is explicitly recorded in ATTRIBUTION** (UBC stains already carry CC BY-NC-SA; keep that precedent documented, do not add new NC sources without a note).

| Candidate | What it would give | Known status to verify |
| --- | --- | --- |
| **OpenNeuro CT datasets** | real head CT volume, continuous | CC0 (all datasets) — find a head/neck CT with adequate brainstem coverage & small size |
| **TCIA** (The Cancer Imaging Archive) | head/neck CT + MRI collections | per-collection licences (CC BY 3.0/4.0 on many) — verify per collection |
| **Wikimedia Commons** (`Category:Human brain slices`, anatomy cryosection photos) | real photographic slices incl. transverse/coronal | per-file CC BY / CC BY-SA — verify each file page |
| **BrainMaps.org** | high-res histology | per-dataset copyright → likely link-out only |
| **Harvard Whole Brain Atlas** | MR/PET slices | permission-gated → link-out only |
| **Visible Human Project (NLM)** | canonical cryosection photos + CT + MRI of one cadaver | licence agreement; redistribution likely prohibited → embed only if terms permit, else link-out + "bring your own data" note |
| **BigBrain (McGill/MNI)** | 20 µm histology volume | CC BY-NC-SA — NC caution; also very large |
| **Allen Human Brain Atlas** | MRI + histology | verify terms (NC?) |
| **Extending UBC `neuroanatomy.ca`** | more brainstem/spinal levels | CC BY-NC-SA 4.0 (already used) — scrape any further usable plates/micrographs |
| **Extending `brainmuseum.org`** | coronal series, more levels | educational permission w/ credit (already used) |

Deliverable of the research task: `docs/IMAGING_SOURCES_V4.md` — verdict matrix (source → licence → embeddable? → credit line verbatim → fetch date → what was taken), plus downloaded raw material in gitignored `assets-src/imaging2/` and a machine-readable `assets-src/imaging2/sources.json` for downstream tasks.

## 4. Data & runtime contracts
- **CT grid**: `scripts/build-ct-grid.mjs` — same pipeline as the MRI (`scripts/lib/nifti.mjs`), same canonical box and spacing, uint8 + `src/assets/imaging/ct-manifest.json` with window presets (`brain`, `bone`) and the same registration block. Graceful `{status:'unavailable', reason}` if no embeddable CT is found.
- **Photo manifest**: extend `src/data/sectionImages.ts` entries with `axis: 'transverse'|'coronal'|'sagittal'` and `planeValue?: number` (canonical au) + `fit: {scale, dx, dy, mirrorX?}` so a photo can be anchored to an exact plane rather than a level id. Keep backwards compatibility with existing entries.
- **Layer registry**: keep the v3 `registerImageLayer({id, appliesTo, draw, credit, sourceLink})` API. Add `priority` so modality order is explicit (real base → contours → labels), and `modality: 'mri'|'ct'|'stain'` for the switcher.
- **Real-first default**: `sectionUnderlay.kind` default becomes `'auto'` = pick the best available real modality at this plane (stain if within its anchor tolerance → else CT/MRI if available → else none). Contours render as overlay at ~65% alpha with outlines; "simulated only" is an explicit option.
- **PiP backdrop**: `imageLayers` exposes `drawToTexture(target, plane, view)`-style sampler (or a documented canvas→texture path) so `SectionPiP` can paint the real slice into its render target before the 3D passes. If the plumbing proves risky, fall back to: PiP unchanged + a note in the panel that the real-imagery view lives in the Plates tab. Decide by evidence, document the decision.
- **Budgets**: new committed assets ≤4 MB (CT grid ≈0.3 MB; extra photos ≤2.5 MB after re-encode). Total imaging payload stays ≤8 MB.
- **Attribution**: every embedded asset keeps a verbatim credit line; the active modality's credit renders **always visible** in the section view; `docs/ATTRIBUTION.md` + `docs/IMAGING_SOURCES_V4.md` updated.

## 5. Swarm DAG (6 tasks)

| # | Task | Role | Deps | Owns |
| --- | --- | --- | --- | --- |
| 1 | `modality-research` | architect | — | `docs/IMAGING_SOURCES_V4.md`, `assets-src/imaging2/**`, `src/assets/imaging/` new photo files, `src/data/sectionImages.ts` (photo entries + anchors), `docs/ATTRIBUTION.md` credits |
| 2 | `ct-grid` | architect | 1 | `scripts/build-ct-grid.mjs`, `src/assets/imaging/ct-t1?*.bin`, `src/assets/imaging/ct-manifest.json`, previews |
| 3 | `pip-backdrop` | builder | 1, 2 | `src/components/viewer3d/SectionPiP.tsx` (backdrop pass only), `src/components/section/imageLayers.ts` (texture sampler export) |
| 4 | `modality-layers` | builder | 1, 2, 3 | `src/components/section/imageLayers.ts`, `src/components/section/SectionCanvas.tsx` (real-first draw order + overlay alpha), `src/state/store.ts` (modality prefs) |
| 5 | `integration-v4` | integrator | 4 | `src/components/PlatesTab.tsx`, `src/components/viewer3d/Viewer3D.tsx`, toolbar wiring, README, gates, smoke, commit |
| 6 | `review-qa-v4` | reviewer | 5 | spot-fixes, licence/credit audit, alignment check, perf + regression, verdict |

Coordination rules that caused trouble before and are binding here:
- **Every evidence contract lists real FILES only** (never directories).
- `src/data/sectionImages.ts` is written by task 1 (photo entries) and READ by 3/4; task 4 must not rewrite task 1's entries, only consume them.
- Tasks 3 and 4 both touch `imageLayers.ts` → 3 finishes first (DAG enforces), 4 owns the final state.
- The dev server stays **stopped** during the run; only `integration-v4` starts it for a 200-check and stops it.

## 6. Definition of done
- Sliders move → section view shows real imagery (stain where anchored, else CT/MRI) as the base layer with structure contours overlaid; "simulated only" toggle still works; "no real data at this plane" states are honest and never blank.
- CT modality selectable with window presets; MRI unchanged; stains extended (more levels, coronal anchored).
- PiP either shows the real slice behind the 3D cut or documents why not.
- Credit lines visible per modality; licences + fetch dates recorded; no link-out-only source embedded.
- Gates green (`validate`, `check`, `build`), dev smoke 200, imaging payload ≤8 MB total, v1–v3 features regress-free.
