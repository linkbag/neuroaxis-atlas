# v19 audit — display / rendering accuracy (materials · positions · mirroring · selection · sections · plates)

**Task** `audit-rendering` · run `run-muf4frwh-rz8s` · HEAD `54d75a1` · **audit only — no product file was edited.**
Findings: [`rendering.findings.json`](./rendering.findings.json) · 31 findings.

## Verdict summary

| verdict | count |
|---|---|
| `ok` | 13 |
| `suspect` | 3 |
| `wrong` | 15 |

| severity | count |
|---|---|
| major | 8 |
| minor | 23 |

| area | findings | ok | wrong | suspect | unverifiable-here |
|---|---|---|---|---|---|
| Materials | 5 | 1 | 3 | 1 | 0 |
| Positions | 7 | 3 | 3 | 1 | 0 |
| Mirroring | 6 | 2 | 3 | 1 | 0 |
| Selection / hover | 3 | 2 | 1 | 0 | 0 |
| Sections | 5 | 3 | 2 | 0 | 0 |
| Plates | 5 | 2 | 3 | 0 | 0 |

## What was measured (headline numbers)

| surface | measurement |
|---|---|
| materials | 7 factory presets read field by field (type/color/opacity/depthWrite/side/vertexColors/roughness/clearcoat/sheen/normalScale/clipping = 3 planes each); 138 manifest parts traced to the material instance each one actually renders with |
| vessel variant | `variant="vessel"` → `createVesselMaterial` #991b1b, vertexColors **false**, tissue normal map 0.02, opacity 0.50 — 14/14 fields identical to `makeAnatomyMaterial("vasculature")`; the tract control (#cbb0a9, vertexColors true, striation) proves the branch |
| positions | 304 records × origin3d, 138 committed bboxes: 0 outside CLIP_BOUNDS; 138 drawn ellipsoid bodies, 0 without size3d, largest 19.2 mm, thinnest 0.72 mm; 1 body with zero overlap with its region's surfaces (nuc-pineal-gland, ≈90 % inside the committed ctx-pineal bbox); **11 committed parts drawn by no 3D pass**, of which 2 families (caudate 6,364 tris, choroid plexus 3,032 tris) have no drawing record at all and 2 bodies (putamen, corpus callosum) are drawn twice |
| mirroring | 53 courses: 50 mirrored, 3 midline single; 23/23 tracts registered `paired` (0 midline) with 8 chains crossing x = 0; 50/50 section `#mirror` twins carry the authored group; 11 manifest parts drawn by no 3D pass (39,488 tris) |
| selection | hit test reproduced from the shipped rule over 241 sliced parts: 2,522 contested points inside ≥2 contours across 21 planes, **386 (15.3 %) select a larger container** (axial 122/738 · coronal 201/1122 · sagittal 63/662), 0 select a non-container; worst same-kind case ×24.7 area |
| sections | PiP mounts the same `SectionCanvas`; item-4 parity **6/6** incl. y = 6/26/30/32; 49 painted division runs, 0 slivers in every class, 3 dropped loops, 30 labels at the 25 au² floor; worker registry receives 162 of the 191 visible parts (79 vessel parts never handed over) |
| plates | 15 plates · 360 declared labels = 360 drawn ids · 0 orphans · 10/10 axial levelIds resolve and match their captions; artwork measured: all transverse plates anterior-**down** vs canvas anterior-**up**; 6 plates use a four-corner badge compass; plate-tel-sagittal-hemisphere's A/P badges are inverted relative to its own artwork |

## Findings

| id | finding | verdict | severity | basis |
|---|---|---|---|---|
| `mat-1` | Vessel course tubes — idle opacity (branches out-shine the committed trunks) | `wrong` | major | internal |
| `mat-2` | The gray-matter preset is unreachable — 12 parts declare it, none renders with it | `wrong` | minor | internal |
| `mat-3` | v18 vessel variant: solid crimson, no tract gradient, no striation (VERIFIED) | `ok` | minor | internal |
| `mat-4` | Cranial-nerve tubes render pale sage while their section contour, tree chip and legend use #14b8a6 | `suspect` | minor | internal |
| `mat-5` | Section capping: the hook, the cap colours and the vessel cap are all unreachable (0 consumers) | `wrong` | minor | internal |
| `pos-1` | The pineal gland is drawn twice (ellipsoid inside the committed pineal body) | `wrong` | minor | internal |
| `pos-2` | Every authored placement and every committed bbox is inside CLIP_BOUNDS (VERIFIED) | `ok` | minor | internal |
| `pos-3` | Ellipsoid bodies: sizes plausible at 1 au = 1.2 mm, and the containment census | `ok` | minor | judgment |
| `pos-4` | size3d is not a statement about a committed body (20 records carry both) | `ok` | minor | internal |
| `pos-5` | The parametric ventricle envelopes are loading stand-ins, not the rendered body (docstring says otherwise) | `suspect` | minor | internal |
| `pos-6` | The caudate nucleus and the choroid plexus are drawn by no 3D pass at all (LINKS says render: "body" and the content-only set suppresses them) | `wrong` | major | internal |
| `pos-7` | Two committed bodies are drawn TWICE at identical coordinates, and `render: "none"` is read by no renderer | `wrong` | major | internal |
| `mir-1` | Eight of the 23 tracts are mirrored although their authored chain already crosses the midline (doubled crossings) | `wrong` | major | internal |
| `mir-2` | A registry-midline artery (SCA vermian branches) is drawn once, 1.2–6.4 mm off the midline | `wrong` | minor | internal |
| `mir-3` | Nine committed right-side GLBs are never drawn in 3D; the mirror is used instead, and 6 of those pairs are not mirror images | `suspect` | minor | internal |
| `mir-4` | Mirrored twins select/hover/highlight as the SAME record, and the section twins carry the authored group (VERIFIED) | `ok` | minor | internal |
| `mir-5` | One registry-midline record deliberately draws two bodies (optic chiasm) | `ok` | minor | internal |
| `mir-6` | ctx-internal-medullary-lamina: registry says midline, the record says paired — it is mirrored into two lateral blobs | `wrong` | minor | internal |
| `sel-1` | Live-section hit test picks a CONTAINER, not the smallest structure under the cursor (the known precedence defect is still present) | `wrong` | major | internal |
| `sel-2` | Selection is a #f59e0b border of width 3, and one click in the section both places the crosshair and selects (VERIFIED) | `ok` | minor | internal |
| `sel-3` | 3D selection/hover lift and the dimming contract (measured constants) | `ok` | minor | internal |
| `sec-1` | The PiP and the Plates tab mount the SAME renderer (VERIFIED) | `ok` | minor | internal |
| `sec-2` | v11 item-4 (canvas-vs-rule parity at y = 6/26/30/32) is CLOSED — re-measured 6/6 | `ok` | minor | internal |
| `sec-3` | Cortical-division layer: no slivers, label floor honoured (measured) | `ok` | minor | internal |
| `sec-4` | The 79 vessel course contours are built, sliced and gated — but never handed to the 2D canvas worker (known-open handoff) | `wrong` | major | internal |
| `sec-5` | A gate's own prose still states 190 canvas parts; the shipped tables measure 191 | `wrong` | minor | internal |
| `plate-1` | Plate labels → structures: 360/360 exact, no orphans, no drift, every levelId resolves (VERIFIED) | `ok` | minor | internal |
| `plate-2` | Every transverse plate draws ANTERIOR DOWN while the live canvas draws anterior UP — the same level is flipped between the two surfaces | `wrong` | major | internal |
| `plate-3` | Six transverse plates place the A/P badges in the bottom corners, so the "P" badge sits where the artwork has no posterior | `wrong` | minor | internal |
| `plate-4` | plate-tel-sagittal-hemisphere: the A and P badges are on the wrong sides of the artwork (and mirror the other sagittal plate) | `wrong` | major | internal |
| `plate-5` | Plate region fills come from the taxonomy only where the SVG declares none (VERIFIED behaviour, with the label-text caveat above) | `ok` | minor | internal |

## The three things I would fix first

1. **`sel-1` — the live-section hit test** (`wrong`/`major`). 15.3 % of contested clicks select a bigger structure than the one under the cursor because `visibleFaces` is a kind-rank sort, not a containment/area order, while the docstring promises "the smallest structure under the cursor wins". Named, reproducible failures: the cerebellar vermis ↦ cerebellar hemisphere, the hypothalamus ↦ the thalamus, the LGN ↦ the optic tract, the dorsal raphe ↦ the oculomotor nucleus.
2. **`pos-6` + `pos-7` — bodies that are missing or doubled in the 3D scene** (`wrong`/`major`). The caudate nucleus and the choroid plexus are drawn by no pass at all (their owners sit in `TEL_CONTENT_ONLY_IDS` on a premise the census refutes), while the putamen (default view) and the corpus callosum are each drawn twice at identical coordinates because `render: "none"` is read by no renderer.
3. **`mir-1` — 8 of 23 tracts are mirrored although their chain already crosses the midline** (`wrong`/`major`). The guard the code documents ("tracts registered midline stay single") is inert: the registry marks all 23 `paired`.

Also in the same class and worth one pass with the above: **`sec-4`** (the 79 vessel course contours never reach the 2D worker — one line; gate-flip handoff to `verify:area-toggles`), **`plate-2`** (transverse plates anterior-down vs canvas anterior-up) and **`mat-1`** (vessel tubes lerp to opacity 1.0 while the committed arteries stay at 0.5 — the v18 E6 that was never applied).

## Evidence discipline

Every finding carries file/id/field evidence, the measured numbers, and a BASIS of kind
`internal` (a contradiction with another record, docstring or gate in this repo), `standard` (the app's own
documented convention / three.js contract / radiological display convention) or `judgment` (labelled as such).
Nothing here is a hunch: where I could not establish a basis I left the item out or recorded it as an `ok`
observation with its numbers. Two claims this report explicitly does **not** make: rendered pixels in a live
page and the PiP's live imagery-guard counter — Chrome cannot start in the agent sandbox.

### Reproduction

```bash
node .dsh-scratch/audit-rendering/probe.mjs tables|materials|positions|mirror|selection
node .dsh-scratch/audit-rendering/probe2.mjs consumers|drawset|containment|plates|selection-surfaces
node .dsh-scratch/audit-rendering/probe3.mjs duplicates|colour|slots|hints
node --max-old-space-size=4096 .dsh-scratch/audit-rendering/probe4.mjs y|z|x
node .dsh-scratch/audit-rendering/probe5.mjs plates|laterality|orientation
node .dsh-scratch/audit-rendering/probe6.mjs laterality|tax-vs-record
node .dsh-scratch/audit-rendering/probe7.mjs capcolor|canvas-orientation|anchors|drawset
node .dsh-scratch/audit-rendering/probe8.mjs
# raw logs: .dsh-scratch/audit-rendering/logs/
```
