# QA changelog — final review pass (`review-qa`)

Date: final QA gate of the NeuroAxis build (spec: `docs/ENGINEERING_PLAN.md`).
Scope: anatomy accuracy spot-checks, cross-file consistency, gates, UX polish.
All fixes are conservative, textbook-standard (Blumenfeld / Patten / Fix / Snell / RadioGraphics 2019).

## Gates (after all edits below)

| Gate | Result |
| --- | --- |
| `npm run validate` | PASS — 0 errors, 0 warnings (118 structures · 19 tracts · 24 syndromes · 12 plates · 13 levels · 137 registry entries) |
| `npm run check` (tsc --noEmit) | PASS |
| `npm run build` (vite build) | PASS |
| Dev-server smoke (`:5173`) | PASS — HTTP 200, root div + entry script, `main.tsx` transforms cleanly |

## 1. Anatomy accuracy fixes

| File | Record | Issue → fix |
| --- | --- | --- |
| `src/data/structures/medulla.json` | `tract-medial-lemniscus` | **Somatotopy inverted.** Claimed "leg lateral, arm medial" *in the medulla*. Textbook: in the caudal medulla the ML stacks ventral-to-dorsal (leg/gracile ventral, arm/cuneate dorsal) and rotates ≈90° through the pons, ending leg-lateral / arm-medial in the midbrain. Rewritten accordingly. |
| `src/data/tracts.json` | `tract-dcml` | Same error family in the `somatotopy` field: "leg is medial/dorsal in the midbrain" (backwards) and "leg ventral (and lateral)" in the medulla (sloppy). Now: medulla leg-ventral/arm-dorsal → pontine rotation → midbrain leg-lateral/arm-medial, face at VPM. |
| `src/data/syndromes/hindbrain.json` | `syn-medial-medullary` | Presentation said ML "lower-limb fibers lateral" — lower-limb (gracile) fibers are **ventral** in the medullary ML segment. Corrected. |
| `src/data/structures/medulla.json` | `nuc-nucleus-gracilis` | "tonotopically leg-arranged columns" — a somatosensory nucleus; "tonotopically" → "somatotopically". |
| `src/data/structures/medulla.json` | `nuc-ambiguus` (clinical) | Typo "ambiguityus" → "ambiguus". |
| `src/data/structures/midbrain.json` | `nuc-pag` (clinical) | Garbled phrase "stress hypergravity responses" → "autonomic stress responses". |
| `src/data/structures/midbrain.json` | `nuc-snc` (clinical) | Malformed "hemiballistic" → "hemiballismic". |
| `src/data/structures/diencephalon-hypothalamus.json` | `nuc-paraventricular` | Duplicated axis in note "(HPA/HPG/HPG-axis)" → "(HPA/HPG/HPT-axis)" (the record's TRH neurons are the HPT axis). |
| `src/data/structures/diencephalon-epithalamus-subthalamus.json` | `vent-cerebral-aqueduct` | `origin3d` z = −2.5 placed the aqueduct in the ventral tegmentum (level of the red nucleus, z≈0). Moved to z = −6 so the tube runs through the PAG/tectal region, matching the PAG record (z = −6), the plates (aqueduct inside the PAG ring), and the sagittal profile. |
| `src/data/syndromes/hindbrain.json` | `syn-lateral-medullary` | `structures[]` did not include `tract-icp`, although the presentation text attributes the ipsilateral ataxia to it (restiform body). Added so the syndrome highlight lights the canonical structure in 3D/plates/tree. |

### Spot-checks that PASSED (no change needed)

- **Diencephalon (≥5 sampled)**: VPL body leg-lateral/arm-medial with VPM medial for face ✓; LGN six-layer eye segregation (ipsi 2/3/5, contra 1/4/6), light-reflex fibers leaving before the LGN, dual AChA/lateral-PC supply with wedge vs horizontal sectoranopia ✓; MGN via IC brachium → sublenticular capsule → Heschl, positioned medial/inferior to the LGN under the pulvinar ✓; pulvinar as largest nucleus overlying the geniculates ✓; VA (GPi/SNr) vs VL (dentatothalamic) ✓; STN → contralateral hemiballismus, ZI dorsal to STN, H1/H2 definitions ✓; supraoptic/PVN magnocellular ADH/oxytocin → posterior pituitary ✓; mammillary bodies → mamillothalamic tract (Vicq d'Azyr), Wernicke/Korsakoff ✓.
- **Midbrain (≥5)**: z-order crus → SNr → SNc → red nucleus (ventral→dorsal) correct in both `origin3d` and the SC plate ✓; SNc dorsal band of the SN ✓; EW dorsal to CN III complex ✓; trochlear nucleus at the IC level with complete decussation in the superior medullary velum and dorsal exit ✓; crus somatotopy frontopontine → corticobulbar → corticospinal → temporopontine, medial→lateral (plate and tract records agree) ✓; SCP decussation in the caudal ventral tegmentum at the IC level ✓.
- **Pons (≥5)**: facial nucleus ventrolateral vs facial colliculus/facial genu dorsal over the abducens nucleus ✓; PPRF paramedian ventral to the abducens nucleus; nuclear-VI gaze palsy vs fascicular diplopia ✓; trigeminal motor medial to principal sensory V ✓; four vestibular nuclei at the ventricular floor with cochlear nuclei dorsolateral at the CP angle ✓; LC periventricular at the rostral pons ✓.
- **Medulla (≥5)**: nucleus ambiguus dorsal to the inferior olive (data and olivary plate) ✓; gracile medial / cuneate lateral dorsal columns ✓; hypoglossal paramedian under the hypoglossal trigone, DMV lateral (vagal trigone), NTS dorsolateral ✓; spinal trigeminal tract dorsolateral to its nucleus with onion-skin lamination ✓; inferior olive folded lamina ventrolateral with climbing-fiber/Guillain-Mollaret physiology ✓.
- **Tracts / decussation levels**: pyramidal decussation at the cervicomedullary junction (~85–90%) ✓; sensory (internal arcuate) decussation at the lower medulla ✓; rubrospinal crossing in the **ventral** tegmental decussation immediately caudal to the red nucleus ✓; tectospinal crossing in the **dorsal** tegmental decussation (of Meynert), dorsal to the ML ✓; spinothalamic crossing within 1–2 segments with sacral-sparing lamination ✓; ventral trigeminothalamic crossed / dorsal ipsilateral ✓; anterior spinocerebellar double decussation ✓; hypothalamospinal uncrossed lateral tegmentum (central Horner) ✓.

## 2. Consistency checks

- taxonomy ↔ structures/tracts: **0** color/name/kind/region mismatches (colors match for every record; registry names are authoritative for display).
- Taxonomy orphans: **0** — all 137 registry entries have authored records; syndrome `structures[]` refs: **0** unresolved; plate `data-structure`/`data-for` slugs all resolve (validator-enforced + manually spot-checked).
- SVG plate contract: all 12 plates viewBox 0 0 800×800, `data-role="outline"` present, balanced `data-structure`/`data-for` counts, **no** `<style>` tags and no fill/style on region shapes (renderer recolors from taxonomy).
- Orientation: transverse plates dorsal-top with patient LEFT on image right + L/R/A/P badges; sagittal anterior-left/superior-top — per plan §6.
- Manifest `labelPos` values match the authored label text anchors and leader lines point at their regions (spot-checked on plate-olivary, plate-midbrain-sc, plate-thalamus-mid).

## 3. UX polish

| File | Fix |
| --- | --- |
| `src/components/viewer3d/ClipControls.tsx` | **Transverse snap bug**: with "Snap slider to levels" on (the default), dragging the slider snapped to the level nearest the *pre-drag* `clip.y`, so the handle always snapped back to its starting level instead of stepping between plate levels. Now snaps to the level nearest the dragged value. |

### Verified working end-to-end (no change needed)

- Selection loop: 3D click (`onPointerMissed` clears), tree/search, plate region + leader-line labels (`keepSyndrome`), syndrome cards, info-panel level chips → all funnel through one zustand selection; open syndrome dims everything outside its structure set.
- Plane sync, both directions: plate/level selection → `clip.y` + helper reveal (`setPlate`, `gotoLevel`); 3D drag → nearest-level naming in ClipControls, ruler highlight (`LevelRuler`), and "Snap to plate" jump.
- Mobile/tablet: breakpoint classes present (≤1024 stack + collapsible sidebar, ≤640 bottom tab bar with safe-area inset, bottom-sheet info panel and sidebar, z-order tab bar 70 > info 60 > sidebar 55); plates/legends overflow handled.
- Contrast: plate labels live on the light "paper" surface with dark ink; hot-label state (#0c4a6e) readable.

## Residual known limitations

- Schematic fidelity: proportions and some multi-level records (e.g., a single midline blob for the paired paramedian CN III/XII columns; transverse plates as composite line-ups showing rostral nuclei such as VA/anterior on the mid-thalamus slice) are didactic simplifications, documented in the README disclaimer.
- Quiz mode (plan §1.1 stretch) is **not implemented**; tract flow animation and camera-nudge-on-select are likewise stretch items not present.
- README screenshots are declared placeholders.
- 3D scene verified by code + data review and HTTP smoke test; interactive clicking in a live browser was outside this environment's reach.
