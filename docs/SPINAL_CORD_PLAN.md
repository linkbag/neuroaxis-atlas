# NeuroAxis Spinal Cord Integration Plan (branch `Spinal_included`)

Status: PROPOSED — for user review before implementation.
Coordinate convention: x = +patient-left, y = +superior, z = +anterior, **1 au = 1.2 mm**.
CLIP_BOUNDS today: x[−58,58] y[−55,116] z[−76,72].

---

## 1. Why this is a coordinate-space change, not just new records

The spinal cord runs from the cervicomedullary junction (y ≈ −50, the atlas's
current floor) to the conus medullaris at L1/L2 — **~400 mm ≈ 333 au** further
caudal. The conus therefore sits at **y ≈ −383**, and the world must extend to
`CLIP_BOUNDS.y.min ≈ −390`. Everything that keys off the bounds follows:

| consumer | today | after |
| --- | --- | --- |
| `CLIP_BOUNDS.y.min` | −55 | **−390** |
| level table (levels.json) | 17 levels, y −50…78 | + 31 spinal segments, y −383…−50 |
| transverse slider range | derived from levels | automatically extended |
| plane-helper extent gate | asserts bounds-derived extents | must keep passing (it is bounds-derived by design) |
| camera default framing | brainstem centroid | unchanged (brainstem remains the landing view) |
| area toggles | 5 areas | **+ "Spinal cord"** (region `spinal`) |

Decision: **one continuous world, extended caudally.** No second scene, no
rescaling — the atlas's value is a continuous neuraxis, and the tracts already
end at y = −52 where the cord begins.

## 2. Anatomy scope (record inventory, ~90 new records)

Region `spinal`, subdivision set: `Spinal segments`, `Gray matter`,
`White matter`, `Roots & meninges`, `Spinal vasculature`.

**Gray matter** (procedural H-profiles, level-varying):
- dorsal horn (Rexed I–VI), ventral horn (VIII–IX), lateral horn (VII, T1–L2),
  intermediate zone (VII), gray commissure + central canal (X),
- named nuclei: marginal zone, substantia gelatinosa, nucleus proprius,
  **Clarke's nucleus (C8–L3)**, intermediolateral nucleus (T1–L2),
  sacral parasympathetic nucleus (S2–S4), lower motor neuron columns.

**White matter** (three funiculi + named fasciculi):
- posterior funiculus: fasciculus gracilis (all levels) + fasciculus cuneatus
  (T6 and above — its absence below T6 is a teaching point the sections must show),
- lateral funiculus: lateral corticospinal, lateral spinothalamic,
  anterior + posterior spinocerebellar, rubrospinal,
- anterior funiculus: anterior corticospinal, vestibulospinal, tectospinal,
  medial longitudinal fasciculus, anterior white commissure (the decussation
  of the spinothalamic fibers — the crossing the user asked to be able to track).

**Gross segments**: 31 segments C1–C8, T1–T12, L1–L5, S1–S5, Co1 as first-class
records (laterality paired where roots pair), cervical + lumbar enlargements,
conus medullaris, filum terminale, cauda equina (L2–S1 roots in the lumbar
cistern), dorsal/ventral rootlets, dorsal root ganglia.

**Clinical** (8 new syndrome cards, same schema as the existing 26):
anterior cord syndrome (anterior spinal artery), Brown-Séquard (hemisection,
Horner above T1), central cord syndrome (sacral sparing, upper > lower limb),
posterior cord syndrome (dorsal columns), conus medullaris syndrome,
cauda equina syndrome, syringomyelia (dissociated "cape" pain/temperature loss),
tabes dorsalis. Each card: structures damaged, findings, vascular attribution,
refs (AMBOSS / RadioGraphics / Blumenfeld / Nolte).

**Spinal vasculature** (4 authored course families, the v17 vessel-course
machinery — zero payload): anterior spinal artery (full cord length, paired
radiculomedullary feeders), posterior spinal arteries, **artery of Adamkiewicz**
(T9–L2 great radicular artery), anterior + posterior spinal veins.

## 3. Geometry: procedural, zero payload

The anatomy GLB budget is **13.82 / 14 MiB** — no room to bake a cord. The cord
is instead **procedural swept geometry**, same philosophy as "tracts stay
procedural" (REALISM_PLAN §7):

- **Cord body**: a lofted tube along the cord axis (y −383…−50 with the gentle
  cervical + lumbar lordotic curvature of the neuraxis), cross-section driven by
  a per-level profile table: transverse diameter 13.3 mm (C5) → 8.3 mm (T8) →
  9.4 mm (L3), anteroposterior ~0.85× transverse. Enlargements C5–T1 and L2–S3.
- **Gray matter H-shape**: a per-level 2D profile (cervical / thoracic / lumbar /
  sacral templates from the cited texts, interpolated) rendered as an inner
  surface pair — this is what makes the transverse sections teachable.
- **Funiculi**: three colored zone meshes per level (posterior / lateral /
  anterior), drawn under the gray matter so the live section paints
  gray-over-white exactly as histology does.
- **Tract extensions**: the 23 existing tract courses currently terminate at
  y = −52. Each descending tract continues caudally to its segmental
  termination (corticospinal → ventral horn lamina IX at each level, somatotopic:
  cervical fibers most medial), each ascending tract grows caudal rootlets
  (spinothalamic from laminae I/V/VII at every segment, DCML from the fasciculi).
  This is what makes the crossing trackable in the cord the way it already is in
  the brainstem.

## 4. Sections (2D live section + PiP)

- Transverse sections at every spinal level show the **H-shaped gray matter**,
  the funiculi, the central canal, and the root entry zone — the classic
  teaching section, painted from the same procedural geometry the 3D view uses
  (one source of truth, like the nerve-course parts).
- Sagittal: the full neuraxis profile (cortex → brainstem → conus → filum).
- Coronal: segmental roots and the enlargement pattern.
- Real imagery (optional phase): NLM VHP male cryosections already in the
  pipeline cover the spinal cord region — adding transverse spinal plates is the
  same ingestion path (public domain, same licence block). Payload sub-cap:
  cryosections at 1,232,904 / 1,750,000 B — a handful of spinal plates fits.

## 5. UI / toggles

- Areas row gains **"Spinal cord"** (region `spinal`) — 6 area buttons.
  The v19 header contracts (area-toggles, checks.mjs predicate, nerve-kind) must
  be extended with it; the plan budgets these check updates explicitly (they were
  just re-pointed at v12+ / v19 state — adding an area is exactly the kind of
  change that gate exists to catch).
- Level ruler: the 17 brainstem levels + 31 spinal segment markers, with the
  ruler's lower bound following `CLIP_BOUNDS.y.min`.
- Camera: a "Spinal cord" area toggle does NOT move the camera (area toggles
  change layers only — the v11 contract); navigation to the cord is via the
  existing level-snap ("Snap to plate" / level ruler click) and the usual orbit.

## 6. Gates (new + updated)

New: `verify:spinal-anatomy` (31 segments complete, laminae/reticular sets
registered, funiculus z-levels correct: cuneate only ≥ T6), `verify:spinal-tracts`
(continuity: every tract crossing y = −50 has matched waypoints above and below;
somatotopy monotonicity of the corticospinal course), `verify:spinal-sections`
(procedural cross-sections paint gray/white/canal at sampled levels).
Updated: the header-contract gates (Areas count), `verify:anatomy` (CLIP_BOUNDS
extension — the bounds are inputs to the existing checks), `verify:budget-report`
(unchanged cap — the plan adds **zero** GLB payload), `verify:plane-helper-extent`
(bounds-derived, must keep passing).

## 7. Sources & honesty

- Anatomy: StatPearls "Neuroanatomy, Spinal Cord Morphology" (NCBI Bookshelf),
  Neuroscience Online Ch. 3 "Anatomy of the Spinal Cord" (UTHealth), Rexed 1954
  (laminae), Nolte 6th ed., Blumenfeld, Patten. Names follow Terminologia
  Anatomica; the registry keeps canonical + synonyms as with every other record.
- Clinical: AMBOSS "Incomplete spinal cord syndromes", RadioGraphics 2018
  "Incomplete Cord Syndromes: Clinical and Imaging Review", UpToDate "Anatomy
  and localization of spinal cord disorders".
- Imagery (if pursued): NLM Visible Human Project (public domain; existing
  acknowledgement block reused verbatim).
- **Honest limit to state in both READMEs**: cord cross-sections are authored
  procedural profiles with source-cited dimensions — schematic teaching geometry,
  not segmented from an individual MRI. Same disclaimer pattern as the authored
  vessel/nerve courses.

## 8. Implementation order (Agent Teams, work on this branch)

1. **platform** — region/area/level/CLIP_BOUNDS extension + header contracts +
   gates updates (the skeleton everything else registers into).
2. **cord-geometry** — procedural cord loft + per-level gray/funiculus profiles.
3. **content-gray-white** — gray matter nuclei, laminae, funiculi, fasciculi records.
4. **content-segments-roots** — 31 segments, enlargements, conus/cauda/filum, roots.
5. **tracts-extension** — somatotopic caudal continuation of all 23 courses.
6. **clinical-vasculature** — 8 syndrome cards + 4 vessel course families.
7. **sections** — transverse/sagittal/coronal spinal section parts + level ruler.
8. **review** — falsify every record + run the full gate sweep + both READMEs.
9. **integrate** — package.json wiring, docs, final sweep.

Each task owns disjoint files; the shared task board carries expected write
scopes. Tasks 2–7 can proceed in parallel where data files don't collide.
