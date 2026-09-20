# v15 audit — corrections ledger

**Run:** `run-mtze6lyq-t83x` · **Task:** `apply-corrections` (integrator) · **Workspace:** `D:\Startup projects\3DNeuroanatamoy`
**Input:** the six auditor files `docs/audit/v15/*.findings.json` (read-only here, unmodified by this task).
**Output:** this ledger, plus the data edits it lists, in `src/data/**` and `src/geometry/curves.ts`.

## 1. What this ledger is

Every finding of all six audits appears exactly once below, with its final disposition:

| disposition | meaning |
| --- | --- |
| **applied** | the data was changed; the row states the before → after and the basis |
| **rejected** | NOT changed, with the reason (a stronger basis, a gate contract, a render-unverifiable consequence, or an out-of-scope change) |
| **open** | an `unverifiable-here` question: filed, no fix invented |
| **verified** | the audit found the data already correct (`ok` verdict); nothing changed |

Totals over **517 findings**: 113 applied · 25 rejected · 4 open · 375 verified (ok).

## 2. Findings by area, verdict and severity (auditor counts, re-derived here from the JSON)

| area | findings | ok | wrong | suspect | unverifiable-here | critical | major | minor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| diencephalon | 41 | 11 | 15 | 15 | 0 | 1 | 9 | 31 |
| brainstem | 68 | 28 | 11 | 28 | 1 | 0 | 6 | 62 |
| telencephalon | 20 | 0 | 7 | 11 | 2 | 0 | 5 | 15 |
| vessels-nerves | 27 | 3 | 16 | 8 | 0 | 1 | 9 | 17 |
| tracts-plates | 345 | 333 | 8 | 4 | 0 | 0 | 5 | 340 |
| syndromes | 16 | 0 | 14 | 1 | 1 | 3 | 10 | 3 |
| **total** | **517** | 375 | 71 | 67 | 4 | 5 | 44 | 468 |

Dispositions: **applied 113** · **rejected 25** · **open 4** · **verified-ok 375**.

## 3. Display-time changes: declared, gated, and mesh-frozen

Every coordinate, `size3d`, `levels[]` and `laterality` edit below changes **display-time placement only** — the 3D markers (`NucleusMesh` / `SceneTubes`), the anatomy tree, the level chips, the plate anchors and the somatotopy overlay. **No committed mesh was re-baked, moved or re-exported by this task:**

- `git status --porcelain -- src/assets/` → **0 files** changed under `src/assets/`.
- Independent re-measurement of all **138** manifest parts against their committed GLB POSITION accessors → **138/138 bbox-exact, 0 drift**.
- `verify:anatomy` cannot run in this agent sandbox (`spawnSync powershell EPERM` at `scripts/verify/anatomy-qa.mjs:294`, before any verdict — the architect's plan §C3b records the same failure). The two measurements above are the local substitute, and the **27/27** figure remains an orchestrator-lane number.

Every changed coordinate was checked to lie inside `CLIP_BOUNDS` (`x[−58,58] y[−55,116] z[−76,72]`) and, for the three nerve landmarks, against the committed envelopes with a ray-parity inside/outside test. The positional gates re-run after the edits: `validate` (0/0), `check`, `build`, `verify:pipeline` (138/138 parts), `verify:plane` (10827 assertions), `verify:somatotopy`, `verify:cortical-lobes`, `verify:view-filter-consistency`, `verify:cranial-nerve-courses` (220 assertions, and it asserts the three moved landmarks are literal waypoints of their courses), `verify:cranial-nerve-render`, `verify:cranial-nerves` (451), `verify:nerve-kind`, `verify:area-toggles` (455), `verify:division-toggles`, `verify:audit-checks`, `verify:closure-bite`, `verify:boundary-contract`, `verify:a11y-contract`, `verify:budget-report`, `verify:pip-contract`, `verify:plane-helper-extent`.

## 4. Cross-auditor conflicts and how they were resolved

| conflict | auditors | resolution |
| --- | --- | --- |
| Is the anterior choroidal artery an artery of hemiballismus? | VN-010 (remove) vs SYN-011 (the card names PCoA **and** the anterior choroidal artery) | **Kept.** The card's own `vascularTerritory` names the artery; a reciprocal link is correct. VN-010 rejected. |
| CN V exit landmark: [15.5,−6,0] (auditor) vs measured surface | brainstem-003 | **Measured.** The crossing of the record's own exit segment with `ctx-pons-surface` is x 17.0–17.1 at y −4.8, z −3.5 (0.2–0.35 au from the surface); that point was used. |
| `tract-optic-radiation`: extend the course or trim the levels? | T3-0012 (extend preferred) vs tract-optic-radiation.levels (either) vs architect D2 | **Trimmed.** The radiation runs posteriorly, so no extension reaches the y = 48/78 planes; extending would also mean re-baking geometry the run freezes. |
| MCA ↔ Wallenberg | SYN-002, VN-001, architect D1 | **All three agree**, and all three applied. |
| nuc-dmv level set: mesh says trim, the plate manifest says keep | brainstem-013 vs `plate-sensory-decuss` | **Kept (rejected).** Two authored artifacts disagree; the same auditor filed the short-mesh family as unverifiable, so no trim was applied. |
| Weber syndrome and `tract-corticobulbar` | SYN-004 (optional removal) | **Kept**, because the registry record is a full-length tract present at the lesion level and the card's own presentation names the deficit it explains. |

## 5. Data contract checks after the edits

- `npm run validate` → **0 errors, 0 warnings**; `structures 19 file(s), 225 record(s)`, `tracts 23 record(s)`, `syndromes 26`, `plates 15`, `taxonomy 248 registry entr(ies) (0 awaiting authored records)`.
- **Registry-first honoured:** no id was created or renamed. Two registry rows were edited to stay in step with their records (`nuc-pretectal.subdivision`, `vent-lateral-ventricle-body.synonyms`), and ten more had their `synonyms` re-synced to the record after the record's synonym set was corrected (search reads the registry row).
- Slug regex, id uniqueness and display-name uniqueness are unchanged and still pass: **no id and no display name was changed by this task.**
- `src/geometry/curves.ts` was regenerated from `.dsh-swarm/_curves-block.txt` with the recipe's own algorithm after the three nerve-course waypoints moved; the before/after diff is six waypoint lines plus one anchorNote word. **Scope deviation:** the block file is the recipe input and was edited with it (the plan's T7 recipe requires it, and leaving it stale would silently revert the fix on the next regeneration).

## 6. Incident disclosure — an editing-tool self-test wrote 11 files, all restored

While building the field editor used for these corrections, a self-test was run that **wrote** its round-trip output instead of only comparing it. It touched 11 files (`brainstem-cranial-nerves.json`, `diencephalon-epithalamus-subthalamus.json`, `diencephalon-hypothalamus.json`, `diencephalon-thalamus.json`, `medulla.json`, `midbrain.json`, `pons.json`, `telencephalon-basal-ganglia.json`, `telencephalon-cortex.json`, `telencephalon-cortical-areas.json`, `telencephalon-cranial-nerves.json`) and one process kill (`Select-Object -First` on the pipeline) stopped the run mid-file. Recovery, all verified:

| file(s) | recovery | verification |
| --- | --- | --- |
| `diencephalon-hypothalamus.json`, `medulla.json`, `midbrain.json` | restored from the HEAD blob | `git status` clean; byte length equals the pre-incident length (e.g. medulla 66 156 chars, 986 CRLF) |
| `diencephalon-epithalamus-subthalamus.json`, `diencephalon-thalamus.json`, `pons.json`, `telencephalon-basal-ganglia.json`, `telencephalon-cortex.json`, `telencephalon-cortical-areas.json` | restored from the HEAD blob, line endings normalised to LF | byte-exact against the pre-incident lengths (30 840 / 35 713 / 53 908 / 32 191 / 33 086 / 54 196 **characters**), `git status` clean, 0 mojibake, em dashes intact |
| `taxonomy.json` | HEAD blob + the 12 `nrv-*` registry rows re-appended (its only uncommitted addition) | 248 rows, `git diff` = 13 inserted lines, semantic diff vs HEAD = **one** difference (236 → 248 rows) |
| `brainstem-cranial-nerves.json`, `telencephalon-cranial-nerves.json` (untracked, no HEAD) | the elided `clinical` arrays rebuilt from `dist/assets/index-C4e4m6MI.js` (built 22:48, after the v13 authoring at 22:16), spliced at the correct spans | **216/216 fields** of the damaged working files agree with the bundle reconstruction; the repaired files are **deep-equal** to the bundle arrays; and `node .dsh-swarm/_regen-curves.mjs`'s algorithm re-derives the committed `src/geometry/curves.ts` **byte-identically** (77 771 bytes) from the repaired records — an independent proof that `clinical` + `refs` are exactly the strings that shipped |

Net effect on the deliverable: none. `npm run validate` returns **0 errors / 0 warnings** with the full 225 structures, 23 tracts, 26 syndromes, 248 registry rows and 15 plates, and every gate in §3 is green. The incident is recorded here because the run's own review rule is that nothing is silently dropped.

## 7. Per-finding dispositions

### diencephalon (41 findings)

| finding | record | field | verdict/severity | disposition | what changed, or why not |
| --- | --- | --- | --- | --- | --- |
| `dienc-001` | `vent-lateral-ventricle` | connections.afferent[0] | wrong/critical | **applied** | vent-lateral-ventricle afferent/efferent rewritten: CSF leaves through the foramen of Monro into the third ventricle; the atrium → temporal horn → aqueduct route deleted (critical, inverted CSF flow) |
| `dienc-002` | `vent-lateral-ventricle` | function | wrong/major | **applied** | vent-lateral-ventricle.function: drainage now runs foramen → third ventricle → aqueduct → fourth ventricle, with the horns named as terminal recesses |
| `dienc-003` | `vent-lateral-ventricle-frontal-horn` | connections | wrong/major | **applied** | frontal horn afferent → "None — blind anterior recess"; efferent → through the foramen of Monro |
| `dienc-004` | `vent-lateral-ventricle-body` | connections | wrong/major | **applied** | body afferent/efferent rewritten: choroid plexus + frontal horn in, foramen of Monro out; the atrium/temporal route to the aqueduct deleted |
| `dienc-005` | `vent-lateral-ventricle-temporal-horn` | connections | wrong/major | **applied** | temporal horn: entry from the atrium, exit back to the atrium — it is not a route to the fourth ventricle |
| `dienc-006` | `vent-lateral-ventricle-occipital-horn` | connections | wrong/major | **applied** | occipital horn: afferent = atrium only; efferent = none, blind recess |
| `dienc-007` | `vent-lateral-ventricle-atrium` | connections.efferent[0] | wrong/major | **applied** | atrium efferent: leaves through the body and the foramen of Monro; no temporal-horn route to the fourth ventricle |
| `dienc-008` | `vent-choroid-plexus-lateral` | connections.efferent[0] | wrong/minor | **applied** | lateral choroid plexus efferent: the parenthetical atrial/temporal route to the aqueduct replaced by the terminal-segment statement |
| `dienc-009` | `ctx-internal-medullary-lamina` | laterality (+ origin3d, size3d) | wrong/major | **applied** | ctx-internal-medullary-lamina: laterality midline → paired, origin3d [0,28.5,0.5] → [6.5,28.5,0.5], size3d [4.5,5.5,5.5] → [1.2,4,4.5]. The marker sat in the third ventricle (mesh x −1.1…1.0) while its own function text says it partitions EACH thalamus. |
| `dienc-010` | `surf-optic-chiasm` | origin3d | wrong/major | **applied** | surf-optic-chiasm [0,29,10] → [0,14.5,19] and ctx-optic-chiasm [0,23.5,23.5] → [0,14.5,19]: both now sit on the committed chiasm geometry (the ctx-optic-chiasm-l/-r pair measures y 10.40…18.62, z 14.26…23.47, centre [0.09,14.51,18.86]; the new point is 0.14 au from that mesh). The 14.6 au internal contradiction betwee… |
| `dienc-011` | `surf-optic-chiasm` | levels | suspect/minor | **applied** | both chiasm records: levels [lvl-thalamus-rostral] → [lvl-midbrain-sc, lvl-post-comm] — the y = 36 plane contained neither record, the y = 14/19 planes bracket the committed mesh |
| `dienc-012` | `lvl-thalamus-rostral` | y | suspect/minor | **applied** | levels.json lvl-thalamus-rostral.name: the "(optic chiasm)" parenthetical removed — it was the only anchor in the table named for a structure it did not contain, and after dienc-010/011 the chiasm records no longer claim it. y = 36 unchanged, so no plate or coordinate moved. |
| `dienc-013` | `nuc-mgn` | origin3d | suspect/minor | **applied** | nuc-mgn.origin3d y 22.5 → 21.0, inside its own cast (y 20.66…24.48) and below nuc-lgn, restoring the defining MGN-below-LGN relation |
| `dienc-014` | `nuc-pulvinar` | bloodSupply | wrong/major | **applied** | nuc-pulvinar.bloodSupply: the invented MCA/angular supply to the lateral pulvinar deleted; the whole pulvinar is PCA territory with the anterior choroidal artery the only non-PCA contributor |
| `dienc-015` | `nuc-thalamic-reticular` | clinical[0] | suspect/minor | **applied** | nuc-thalamic-reticular.clinical[0].findings: fatal familial insomnia now names the anteroventral and mediodorsal nuclei (with the inferior olive) as the degenerating targets; the reticular nucleus keeps only the spindle-mechanism clause it genuinely owns |
| `dienc-016` | `nuc-intralaminar` | name + synonyms | suspect/minor | **applied** | nuc-intralaminar synonyms: "intralaminar nuclei" (which claimed the whole group, rostral group included) replaced by "caudal intralaminar group (CM and PF)", and the function text now states that the rostral group is not covered. The display name was left alone: two plate manifests label the record "CM-PF (intralamina… |
| `dienc-017` | `nuc-subthalamic` | connections.afferent[0], connections.efferent[1] | wrong/minor | **applied** | "globus pallidus externa" → "globus pallidus externus (GPe)" in both nuc-subthalamic connection items, matching the atlas's own registry row |
| `dienc-018` | `ctx-caudate-nucleus` | connections.efferent[0] | wrong/minor | **applied** | ctx-caudate-nucleus.connections.efferent[0]: same form correction, now naming the GPe explicitly |
| `dienc-019` | `ctx-fields-of-forel` | name | suspect/minor | **applied** | (partial) ctx-fields-of-forel: the names of the three fields are correct in the synonym set and the contextNote now states that H3 is named but not drawn. The record was not retitled — the id, the display name and the plate labels stay stable. |
| `dienc-020` | `nuc-preoptic` | synonyms[1] | suspect/minor | **applied** | nuc-preoptic.synonyms −"median preoptic nucleus" (MnPO is one constituent of the area, as the record's own function text says); registry synced |
| `dienc-021` | `nuc-arcuate-hypothalamic` | synonyms[1] | suspect/minor | **applied** | nuc-arcuate-hypothalamic.synonyms: "feeding center" → "orexigenic NPY/AgRP centre" (the classical feeding centre is the lateral hypothalamic area); registry synced |
| `dienc-022` | `nuc-posterior-hypothalamus` | synonyms[1] | suspect/minor | **applied** | nuc-posterior-hypothalamus.synonyms: "lateral hypothalamic area (caudal)" → "posterior hypothalamic area"; registry synced |
| `dienc-023` | `vent-lateral-ventricle` | synonyms | suspect/minor | **applied** | vent-lateral-ventricle.synonyms −"lateral ventricle (body)": the segment name belongs to vent-lateral-ventricle-body; registry synced |
| `dienc-024` | `vent-lateral-ventricle-body` | synonyms (registry row) | suspect/minor | **applied** | taxonomy row vent-lateral-ventricle-body.synonyms += "cellula media", so the registry row (which is what search reads) and the record now agree |
| `dienc-025` | `ctx-thalamus-envelope` | contextNote | suspect/minor | **applied** | ctx-thalamus-envelope.contextNote: "the 15 individual thalamic nucleus records" → 14 (the count the file actually holds) |
| `dienc-026` | `nuc-thalamic-anterior` | connections.afferent[1] | suspect/minor | **applied** | nuc-thalamic-anterior.connections.afferent[1]: the direct hippocampo-anterior-thalamic route is now stated as a minor experimental projection, with the mammillothalamic route as the defining one |
| `dienc-027` | `nuc-preoptic` | function | suspect/minor | **applied** | nuc-preoptic.function: the reproductive pulse is generated by the arcuate KNDy network and the GnRH neurons provide its output; the KNDy projections were added to nuc-arcuate-hypothalamic.connections.efferent, which was missing them |
| `dienc-028` | `nuc-suprachiasmatic` | function | suspect/minor | **applied** | nuc-suprachiasmatic.function: melanopsin is now the ipRGC photopigment in the input clause, glutamate (with PACAP) the transmitter |
| `dienc-029` | `vent-lateral-ventricle-atrium` | contextNote | wrong/minor | **applied** | vent-lateral-ventricle-atrium.contextNote: the y = +22 splitter claim rewritten — the atrium keeps the tapered tail that crosses the plane, so the text and the measured extent (y 11.2…54.6) no longer contradict each other or the temporal-horn record |
| `dienc-030` | `vent-lateral-ventricle-body` | contextNote | wrong/minor | **applied** | vent-lateral-ventricle-body.contextNote: the boundary plane restated as z = +28 (the segment's own anterior limit on the cast), with the 2.8 au overlap against the frontal horn's documented extent stated instead of hidden |
| `dienc-031` | `nuc-vpl` | origin3d (VPL lateral to VPM) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-032` | `nuc-pulvinar` | origin3d (posterior and lateral) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-033` | `nuc-subthalamic` | origin3d (dorsal to the substantia nigra) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-034` | `nuc-mammillary-body` | origin3d (floor of the hypothalamus, posterior to the infun… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-035` | `vent-third-ventricle` | origin3d / connections | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-036` | `ctx-pineal` | origin3d + size3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-037` | `nuc-midline-thalamic` | laterality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-038` | `nuc-mammillary-body` | connections (mammillothalamic direction) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-039` | `vent-lateral-ventricle-temporal-horn` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-040` | `vent-interventricular-foramen` | connections | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `dienc-041` | `nuc-lgn` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |

### brainstem (68 findings)

| finding | record | field | verdict/severity | disposition | what changed, or why not |
| --- | --- | --- | --- | --- | --- |
| `brainstem-001` | `nuc-snc` | origin3d | wrong/major | **applied** | nuc-snc.origin3d z 2.5 → 8.5 — the record's own GLB occupies z 7.42…9.42 |
| `brainstem-002` | `nuc-snr` | origin3d | wrong/major | **applied** | nuc-snr.origin3d z 3.5 → 9.0 — its GLB occupies z 7.89…9.72 |
| `brainstem-003` | `surf-cn5-exit` | origin3d | wrong/major | **applied** | surf-cn5-exit [7,−8,6] → [17.1,−4.8,−3.5]: measured crossing of this nerve's own exit segment [16,−5,−2]→[21,−4,−9] with ctx-pons-surface (0.2–0.35 au from the surface); the CN V course waypoint moved with it (block + curves.ts), anchorNote waypoint index updated, and the record contextNote's stale overlap claim rewri… |
| `brainstem-004` | `surf-cn10-exit` | origin3d | wrong/major | **applied** | surf-cn10-exit [5,−34,4.5] → [6,−34,0.5] (postolivary sulcus, 0.76 au behind the olive instead of inside it) + CN X waypoint 3 |
| `brainstem-005` | `surf-cn9-exit` | origin3d | wrong/major | **applied** | surf-cn9-exit [5,−31,4.5] → [6,−31,0.5] (0.42 au off the olive face → 1.22 au behind it) + CN IX waypoint 2 |
| `brainstem-006` | `tract-medial-lemniscus` | levels | wrong/major | **applied** | tract-medial-lemniscus.levels 3 → 8 anchors (lvl-pons-caudal/-middle/-rostral, lvl-midbrain-ic/-sc added): the atlas's own plates label this tract at five levels its level set did not contain |
| `brainstem-007` | `nuc-pretectal` | levels | suspect/minor | **applied** | nuc-pretectal.levels += lvl-midbrain-sc (plate-midbrain-sc labels it) |
| `brainstem-008` | `tract-crus-cerebri` | levels | suspect/minor | **applied** | tract-crus-cerebri.levels += lvl-midbrain-ic (plate-midbrain-ic labels it) |
| `brainstem-009` | `surf-interpeduncular-fossa` | levels | suspect/minor | **applied** | surf-interpeduncular-fossa.levels += lvl-midbrain-ic (plate-midbrain-ic labels it) |
| `brainstem-010` | `nuc-mesencephalic-v` | levels | suspect/minor | **applied** | nuc-mesencephalic-v.levels and tract-mesencephalic-v.levels += lvl-pons-middle: the plate manifest and the anatomy agree (the mesencephalic tract does reach the mid-pons) while the frozen cast is short — the level set follows the two artifacts, not the short mesh. No re-bake. |
| `brainstem-011` | `ctx-cerebellum` | levels | suspect/minor | **applied** | ctx-cerebellum.levels += lvl-midbrain-ic (plate-midbrain-ic labels it; the superior cerebellar surface reaches the collicular level) |
| `brainstem-012` | `nuc-area-postrema` | levels | wrong/minor | **applied** | nuc-area-postrema.levels −lvl-pontomedullary: its own GLB spans y −32.8…−30.3 and its only plate is plate-olivary |
| `brainstem-024` | `nuc-pretectal` | subdivision | suspect/minor | **applied** | nuc-pretectal.subdivision "Tectum" → "Tegmentum" in both the record and its taxonomy row: the pretectal area lies rostral to the superior colliculus, outside the tectal plate (TA/FMA). The tree grouping moves with it. |
| `brainstem-026` | `nuc-superior-colliculus` | function | suspect/minor | **applied** | nuc-superior-colliculus.function: the pupillary light reflex is now attributed to the pretectum, with the colliculus keeping orienting saccades (Blumenfeld, a ref the record itself cites). |
| `brainstem-027` | `tract-scp` | connections.afferent | suspect/minor | **applied** | tract-scp.connections.afferent += the anterior (ventral) spinocerebellar tract, which the atlas's own tract-anterior-spinocerebellar record says enters through this peduncle. |
| `brainstem-028` | `nuc-principal-sensory-v` | function | suspect/minor | **applied** | nuc-principal-sensory-v.function: "dental pulp sensation" → "periodontal mechanoreception" (pulpal nociception belongs to the spinal trigeminal complex, as the record's own clinical entry says). |
| `brainstem-029` | `nuc-nucleus-gracilis` | function | wrong/minor | **applied** | nuc-nucleus-gracilis.function: "tonotopically leg-arranged columns" → "somatotopically organised (leg-arranged) columns". |
| `brainstem-030` | `nuc-inferior-olive-medial` | clinical[0].findings | wrong/minor | **applied** | nuc-inferior-olive-medial.clinical[0].findings: the olive now loses its rubro-olivary INPUT and its climbing-fibre OUTPUT fails, instead of losing a "climbing-fibre target" it does not have. |
| `brainstem-031` | `nuc-ambiguus` | clinical[0].findings | wrong/minor | **applied** | nuc-ambiguus.clinical[0].findings: "ambiguityus" → "ambiguus" (misspelling of the structure's own name in a user-visible string). |
| `brainstem-032` | `nuc-cochlear-dorsal` | connections.afferent | suspect/minor | **applied** | nuc-cochlear-dorsal.connections.afferent[0]: the nucleus receives the full tonotopic range, high frequencies dorsally. |
| `brainstem-033` | `nuc-dentate` | clinical[0].findings | suspect/minor | **applied** | nuc-dentate.clinical[0].findings: "Ceroid-lipofuscinosis, metronomic injury" → "neuronal ceroid lipofuscinosis, metronidazole or radiation toxicity" (the named entity does not exist). |
| `brainstem-034` | `nuc-pontine-reticular` | clinical[0].findings | suspect/minor | **applied** | nuc-pontine-reticular.clinical[0].findings: the sentence no longer asserts that cortical sleep-wake cycling survives coma. |
| `brainstem-035` | `surf-cn6-exit` | function | suspect/minor | **applied** | surf-cn6-exit.function: CN VI now has "the longest cisternal subarachnoid course in the posterior fossa" and CN IV keeps the longest intracranial course — the two records no longer contradict each other. |
| `brainstem-036` | `nuc-medullary-reticular` | synonyms | suspect/minor | **applied** | nuc-medullary-reticular.synonyms: the gigantocellular and central/medial nuclei are named as subdivisions of the formation, not as synonyms of the whole (registry row synced). |
| `brainstem-013` | `nuc-dmv` | levels | wrong/minor | rejected | NOT APPLIED — nuc-dmv.levels kept as [lvl-sensory-decuss, lvl-olivary]. The proposed swap rests on the same frozen cast that this auditor filed as possibly short in brainstem-014, and it is contradicted by an independent authored artifact: plate-sensory-decuss labels nuc-dmv. The dorsal motor nucleus does reach the ob… |
| `brainstem-015` | `nuc-oculomotor` | laterality | suspect/minor | rejected | NOT APPLIED — nuc-oculomotor laterality midline → paired. laterality is consumed at render time (SceneLayers.tsx:693 decides whether a mirrored copy is drawn) and the committed cast is a single paramedian blob (x −2.07…0.73); the audit cannot observe the rendered result in this sandbox, so the flag was left with a doc… |
| `brainstem-016` | `nuc-trochlear` | laterality | suspect/minor | rejected | NOT APPLIED — nuc-trochlear laterality, same reason as brainstem-015 (single one-sided cast). |
| `brainstem-017` | `nuc-edinger-westphal` | laterality | suspect/minor | rejected | NOT APPLIED — nuc-edinger-westphal laterality, same reason as brainstem-015. |
| `brainstem-018` | `nuc-hypoglossal` | laterality | suspect/minor | rejected | NOT APPLIED — nuc-hypoglossal laterality, same reason as brainstem-015 (cast x −1.14…0.99 straddles the midline). |
| `brainstem-019` | `nuc-area-postrema` | laterality | suspect/minor | rejected | NOT APPLIED — nuc-area-postrema laterality paired → midline, same render-time class as brainstem-015. |
| `brainstem-020` | `ctx-cerebellum` | laterality | suspect/minor | rejected | NOT APPLIED — ctx-cerebellum laterality: the auditor's own alternative (document the intentional unpaired envelope) is the disposition taken; the record's name and contextNote already state that it spans both hemispheres plus the vermis. |
| `brainstem-021` | `ctx-cerebellum` | region (file placement) | suspect/minor | rejected | NOT APPLIED — the five cerebellum records stay in medulla.json. File placement is not a rendered field (validate walks src/data/structures/*.json), the region/subdivision/taxonomy values are correct, and moving files is churn with no user-visible effect. Documented as a deliberate filing. |
| `brainstem-022` | `nuc-vestibular-inferior` | region | suspect/minor | rejected | NOT APPLIED — nuc-vestibular-inferior.region pons → medulla. The vestibular complex is filed as one pontine group so its four nuclei stay together in the tree; the record's own levels and clinical text are unchanged and correct. The alternative the auditor offered (keep pons, record the rationale) is what this row doe… |
| `brainstem-023` | `vent-fourth-ventricle` | region | suspect/minor | rejected | NOT APPLIED — vent-fourth-ventricle.region. The atlas has no hindbrain/cavity region; the auditor states no field change is required. Documented: the fourth ventricle is filed with the medulla as the caudal hindbrain compartment it opens into. |
| `brainstem-025` | `tract-spinal-trigeminal` | subdivision | suspect/minor | rejected | NOT APPLIED — the CN V nucleus/tract subdivision. The auditor's two options were a systemic subdivision rename (which would touch every cranial-nerve-nuclei record and the toggle gates) or moving two records to Tegmentum; both are taxonomy restructuring rather than a correction of a false claim. Filed as an accepted s… |
| `brainstem-037` | `nuc-inferior-olive-medial` | coverage (registry) | suspect/minor | rejected | NOT APPLIED — coverage gap (no dorsal accessory olive record). Adding a nucleus is authoring new anatomy with its own origin3d/size3d and registry row, not a correction; filed as an accepted scope limit. |
| `brainstem-038` | `nuc-dorsal-raphe` | coverage (registry) | suspect/minor | rejected | NOT APPLIED — coverage gap (no nucleus raphe magnus record). Same reason as brainstem-037; the prose references are correctly named either way. |
| `brainstem-039` | `nuc-oculomotor` | coverage (registry) | suspect/minor | rejected | NOT APPLIED — coverage gap (no riMLF/INC records). Same reason; the four records that name them in prose stay accurate. |
| `brainstem-040` | `nuc-hypoglossal` | coverage (clinical eponyms) | suspect/minor | rejected | NOT APPLIED — coverage gap (no Jackson or Raymond-Cestan card). The medial medullary card already carries the Déjerine eponym in a single-valued field; adding a second eponym or a new card is authoring, not correction. Filed as an open coverage question. |
| `brainstem-014` | `(record-set: 15 brainstem records listed in notes)` | levels vs own committed mesh bbox | unverifiable-here/minor | open | OPEN — the 15-record family whose level sets reach 4.4–12.8 au beyond their own frozen casts. Not trimmed: doing so on the strength of a mesh that may itself be short would be a false correction, and this pass cannot re-measure BP3D. No fix invented. |
| `brainstem-041` | `nuc-oculomotor` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-042` | `nuc-trochlear` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-043` | `nuc-abducens` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-044` | `nuc-facial` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-045` | `nuc-hypoglossal` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-046` | `nuc-inferior-olive-principal` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-047` | `nuc-dentate` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-048` | `surf-vermis` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-049` | `nuc-dmv` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-050` | `surf-cn12-exit` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-051` | `surf-cn3-exit` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-052` | `surf-cn6-exit` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-053` | `surf-cn7-exit` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-054` | `(record-set: all 80 brainstem records)` | region/subdivision/laterality vs taxonomy.json | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-055` | `(record-set: all 80 brainstem records)` | id references inside connections/function/clinical text | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-056` | `nuc-red-nucleus` | clinical (eponym set) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-057` | `nuc-pprf` | clinical (gaze syndromes) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-058` | `nuc-medullary-reticular` | clinical (central Horner) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-059` | `nuc-spinal-trigeminal` | clinical (onion-skin, crossed sensory pattern) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-060` | `tract-pyramid` | clinical (crossed brainstem patterns and arteries) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-061` | `tract-scp` | function (crossed cerebellar output) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-062` | `tract-icp` | connections (direction of the cerebellar afferent gateway) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-063` | `surf-facial-colliculus` | origin3d | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-064` | `nuc-ambiguus` | function/connections (branchiomotor targets) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-065` | `nuc-fastigial` | connections (peduncle of exit) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-066` | `tract-trapezoid-body` | laterality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-067` | `nuc-cuneiform` | subdivision / naming | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `brainstem-068` | `vent-fourth-ventricle` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |

### telencephalon (20 findings)

| finding | record | field | verdict/severity | disposition | what changed, or why not |
| --- | --- | --- | --- | --- | --- |
| `T3-0001` | `ctx-m1` | origin3d | wrong/major | **applied** | ctx-m1.origin3d [43.2,66.5,19] → [45.1,69.2,−5]: onto the precentral strip defined by its own eight measured children (the new point is the nearest ctx-hemisphere-l vertex, residual 0.00 au, 23.7 au from the old anchor) |
| `T3-0002` | `ctx-s1` | origin3d | wrong/major | **applied** | ctx-s1.origin3d [42.4,68.2,−1.7] → [47.2,67.3,−13.3]: onto the postcentral strip of its eight children, snapped to the ribbon (residual 0.00 au) |
| `T3-0003` | `ctx-sma` | origin3d | wrong/major | **applied** | ctx-sma.origin3d [6,82.8,22.6] → [5.1,106.6,3.5]: now on the medial surface 15.4 au anterior of the medial foot representation (ctx-m1-toe [7.46,109.89,−11.91]) that its own function text says it abuts; snapped to the nearest ribbon vertex |
| `T3-0004` | `ctx-s1-toe, ctx-s1-leg, ctx-s1-trunk, ctx-s1-arm, ctx-s1-hand, ctx-s1-face, ctx-s1-tongue, ctx-s1-larynx` | anchors.gyrus | wrong/minor | **applied** | the eight ctx-s1-* anchors.gyrus strings: "precentral gyrus" → "postcentral gyrus" (systematic copy-paste defect; the strips, ordering and every measured coordinate are unchanged) |
| `T3-0005` | `nuc-dentate-gyrus` | contextNote | wrong/minor | **applied** | nuc-dentate-gyrus.contextNote: the quoted probe coordinates now match the record's own origin3d [16,14,−2] (the old note quoted x ≈ 21.5, z ≈ −9, 6.6 au away) |
| `T3-0006` | `nuc-ca2-ca3` | connections.afferent | suspect/minor | **applied** | nuc-ca2-ca3.connections.afferent[2] split into its three genuine sources: entorhinal layer II to the distal dendrites, hilar mossy cells, and CA2's defining supramammillary/hypothalamic (vasopressin) input |
| `T3-0007` | `ctx-a2` | name, synonyms | suspect/minor | **applied** | (partial) ctx-a2: "Brodmann area 42" is now qualified as the Heschl's-gyrus belt, and anchors.gyrus presents the planum temporale as the region the record is a view over rather than as its own gyrus. The display name was left alone — it is a distinct, non-duplicate registry name and the plate labels key on the slug. |
| `T3-0008` | `ctx-broca` | synonyms | suspect/minor | **applied** | ctx-broca.synonyms: "Brodmann areas 44 and 45" → area 44 (pars opercularis) with area 45 as its anterior extension, with the debated border stated. Basis is own anatomical knowledge, labelled as such — recorded as applied on that weaker basis, not on a source. |
| `T3-0009` | `nuc-caudate-head` | function | wrong/minor | **applied** | nuc-caudate-head.function: "filling the wall of the frontal horn" → "forming the lateral wall of the frontal horn" (the committed ventricle cast lies medial to it at that level) |
| `T3-0011` | `tract-optic-nerve` | levels | wrong/major | **applied** | tract-optic-nerve.levels −lvl-tel-thalamostriate: the record's own five waypoints stop at y 23.5 while that anchor is at y = 48 |
| `T3-0012` | `tract-optic-radiation` | levels / waypoints | suspect/major | **applied** | tract-optic-radiation.levels trimmed to [lvl-midbrain-sc, lvl-post-comm, lvl-thalamus-mid, lvl-thalamus-rostral]. The two anchors at y = 48 and y = 78 lay 18 and 48 au beyond the record's own course (waypoints y 14…30). The alternative — extending the course to V1 — was rejected: the route runs posteriorly, not rostra… |
| `T3-0013` | `ctx-v2` | origin3d | suspect/minor | **applied** | ctx-v2.origin3d [16.4,33,−50] → [14,37.6,−47.9]: the nearest ctx-hemisphere-l vertex (the old anchor measured 5.56 au INSIDE the ribbon while all ten sibling cortical areas sit within 1.2 au of it). The medial occipital placement is preserved. |
| `T3-0014` | `surf-planum-temporale` | origin3d | suspect/minor | **applied** | surf-planum-temporale.origin3d [33,34,2] → [35.4,33.1,2.2]: on the ribbon, next to the ctx-a2 anchor that measures the same patch (0.57 au) |
| `T3-0015` | `nuc-ventral-pallidum` | origin3d | suspect/minor | **applied** | nuc-ventral-pallidum.origin3d [20.5,23,14] → [19,24,15]: the old point was outside both the pallidal and the putaminal casts (ray parity 0/6 on each) although its contextNote claimed it lay on the pallidal cast; the new point measures inside ctx-globus-pallidus-l (parity 1/1/1, 0.76 au from its surface) and the contex… |
| `T3-0016` | `tract-fimbria` | origin3d | suspect/minor | **applied** | tract-fimbria.origin3d [22,21,−2] → [25,15,−4]: the marker stood 6.31 au clear of the hippocampal cast whose dorsal surface tops out at y = 14.2 at that z; the new point is 0.81 au off the dorso-medial surface, where the fimbria actually runs |
| `T3-0017` | `ctx-m1-toe, ctx-m1-leg, ctx-m1-trunk, ctx-m1-arm, ctx-m1-hand, ctx-m1-face, ctx-m1-tongue, ctx-m1-larynx, ctx-s1-toe … ctx-s1-larynx` | levels | suspect/minor | **applied** | (partial) the sixteen ctx-m1-*/ctx-s1-* segment records each lost the unreachable lvl-tel-thalamostriate anchor (y = 48 against strips that start at y = 58.2). The fuller per-segment scheme the finding proposes was not adopted: it would re-author level sets well beyond the demonstrated defect (an anchor outside every … |
| `T3-0020` | `ctx-optic-chiasm` | origin3d | suspect/minor | **applied** | ctx-optic-chiasm.origin3d → [0,14.5,19], on the committed ctx-optic-chiasm-l/-r pair (0.14 au from the mesh). Same edit as dienc-010 — the two auditors reported the two records of one structure, and both are now on the mesh. |
| `T3-0010` | `nuc-globus-pallidus-internus` | bloodSupply | suspect/minor | rejected | NOT APPLIED — the anterior choroidal artery was to be removed from the pallidal bloodSupply of nuc-globus-pallidus-internus and -externus. The anterior choroidal artery supplying the posterior/inferior pallidum together with the posterior limb of the internal capsule and the optic radiation is standard teaching (Blume… |
| `T3-0018` | `tract-optic-nerve, tract-optic-tract` | connections | unverifiable-here/minor | open | OPEN — neither tract-optic-nerve nor tract-optic-tract carries a connections object. Whether that is a defect depends on the loader contract for a tract-shaped structure record (both declare origin/target/decussation instead); no fix was invented. The content of those fields was verified correct. |
| `T3-0019` | `tract-optic-nerve, nrv-cn2-optic` | function | unverifiable-here/minor | open | OPEN — the "two-thirds of the axons" macular figure. The evidence offered is a published range, not a replacement value, so nothing was invented: the phrasing is left as authored and the question is filed rather than guessed. |

### vessels-nerves (27 findings)

| finding | record | field | verdict/severity | disposition | what changed, or why not |
| --- | --- | --- | --- | --- | --- |
| `VN-001` | `vasc-middle-cerebral-artery` | supply[1] | wrong/critical | **applied** | vasc-middle-cerebral-artery.supply −"syn-lateral-medullary" (see SYN-002) |
| `VN-002` | `vasc-middle-cerebral-artery` | supply[0] | wrong/major | **applied** | vasc-middle-cerebral-artery.supply −"syn-parkinson" (see SYN-001) |
| `VN-003` | `vasc-basilar-artery` | origin3d | wrong/major | **applied** | vasc-basilar-artery.origin3d [0,−12,6] → [0,−12,14]: the committed trunk spans z 11.28…16.78 and z = 6 sat 5.3 au inside the pons |
| `VN-004` | `vasc-posterior-communicating-artery` | origin3d | wrong/major | **applied** | vasc-posterior-communicating-artery.origin3d [14,22.5,8] → [8,22.5,17]: the committed -l/-r elements span x ±[6.0,10.8], z [11.6,22.3], so the old anchor was outside on both uniform-scaled axes; y is left as authored (warped axis, level-matched) |
| `VN-005` | `vasc-anterior-inferior-cerebellar-artery` | origin3d.z | wrong/minor | **applied** | vasc-anterior-inferior-cerebellar-artery.origin3d.z −4 → +4: the old value sat at the most posterior point of the committed element instead of at its basilar origin |
| `VN-006` | `vasc-superior-cerebellar-artery` | levels | wrong/major | **applied** | (partial) vasc-superior-cerebellar-artery.levels now contain lvl-pons-middle and lvl-pons-rostral, the levels its own territory[] structures live at (cerebellum, deep nuclei, vermis). lvl-post-comm was KEPT: the finding's expected list dropped it, but nothing in the record or the plates contradicts the SCA reaching th… |
| `VN-007` | `vasc-posterior-medial-choroidal-artery` | levels | wrong/major | **applied** | vasc-posterior-medial-choroidal-artery.levels += lvl-thalamus-rostral, lvl-tel-thalamostriate: the record declares the body of the lateral ventricle in its territory[], whose own level set is exactly those three anchors |
| `VN-008` | `vasc-basilar-artery` | levels | suspect/minor | **applied** | vasc-basilar-artery.levels += lvl-midbrain-sc — surf-interpeduncular-fossa is in its territory[] and is registered at that level |
| `VN-009` | `vasc-internal-carotid-artery` | connections.efferent[1] | wrong/major | **applied** | vasc-internal-carotid-artery.efferent[1]: the lenticulostriate groups are now attributed to the proximal M1 (lateral) and the proximal A1 including Heubner (medial), matching the lenticulostriate record's own afferent list |
| `VN-011` | `vasc-posterior-inferior-cerebellar-artery` | connections.efferent[0] | suspect/minor | **applied** | vasc-posterior-inferior-cerebellar-artery.efferent[0]: the segment list now starts with the anterior and lateral medullary segments, so the five-segment scheme is complete |
| `VN-013` | `vasc-posterior-cerebral-artery` | synonyms | wrong/minor | **applied** | vasc-posterior-cerebral-artery.synonyms: the P-segment synonym now reads P1/P2/P3/P4 with the four segment names, matching TA/FMA and the record's own contextNote |
| `VN-014` | `vasc-internal-carotid-artery` | refs | wrong/minor | **applied** | (partial) the duplicate Blumenfeld ref entry was removed from vasc-middle-cerebral-artery.refs. The second half of the finding does NOT reproduce: vasc-internal-carotid-artery.refs holds ONE entry, not two, so nothing was removed there — measured, not assumed. |
| `VN-015` | `vasc-posterior-medial-choroidal-artery` | synonyms / name | wrong/minor | **applied** | (partial) "lateral posterior choroidal artery" was removed from the synonyms of vasc-posterior-medial-choroidal-artery — a different vessel is not a synonym of this one. The record was NOT renamed to "Posterior choroidal arteries (medial and lateral)": its own contextNote documents that the archive carries only the me… |
| `VN-021` | `nrv-cn5-trigeminal` | origin3d vs its own exit landmark surf-cn5-exit | suspect/minor | **applied** | (partial) nrv-cn5-trigeminal.contextNote no longer asserts that its ellipsoid overlaps surf-cn5-exit — my own landmark move falsified that claim, and the note now states the measured root-exit point and the different roles of the two records. The schematic ellipsoid itself was NOT reshaped to swallow a point 12 au awa… |
| `VN-022` | `nrv-cn3-oculomotor` | clinical[0].note | suspect/minor | **applied** | nrv-cn3-oculomotor.clinical[0].note: the contested compass direction ("superficial dorsomedial surface") replaced by the load-bearing fact — the pupillomotor fibres are the most superficial in the cisternal nerve, which is why compression dilates the pupil early |
| `VN-010` | `vasc-anterior-choroidal-artery` | supply[0] | suspect/minor | rejected | NOT APPLIED — the finding asked for "syn-hemiballismus" to be removed from vasc-anterior-choroidal-artery.supply because the nucleus is not in the artery's territory[]. The card itself names the artery: syn-hemiballismus.vascularTerritory = "Perforating branches of the posterior communicating artery and anterior choro… |
| `VN-012` | `vasc-superior-cerebellar-artery` | territory | suspect/minor | rejected | NOT APPLIED — the finding asked for exit landmarks (surf-cn5-exit, surf-cn4-exit, surf-cn9-exit, surf-cn6-exit, surf-cn3-exit) to be added to four vessels' territory[] arrays because their nerve records describe neurovascular contact. territory[] is an authored supply list, not a contact list: the SCA record names the… |
| `VN-016` | `nrv-cn4-trochlear` | tubeRadius / calibreMm (course record in src/geometry/curve… | wrong/major | rejected | NOT APPLIED — the finding claims CN IV's calibreMm is inconsistent with its tubeRadius. It is consistent: r_au = d_mm / 2.4 gives 1.0 / 2.4 = 0.4167 ≈ 0.42 au, and 0.42 au × 1.2 mm/au = 0.50 mm radius = 1.0 mm diameter, which is what the field means. Setting calibreMm = 0.5 would make the field mean a radius for this … |
| `VN-017` | `nrv-cn4-trochlear` | surf-cn4-exit.levels (via levels.json) | wrong/minor | rejected | NOT APPLIED — surf-cn4-exit.levels kept as [lvl-pons-rostral, lvl-midbrain-ic]. Two independent artifacts place the CN IV exit at lvl-pons-rostral: the level's own name ("Pons — upper (CN IV exit, ICP→SCP transition)") and plate-pons-rostral, which labels surf-cn4-exit. The landmark at y = 7.5 sits between the two anc… |
| `VN-018` | `nrv-cn5-trigeminal` | foramen | suspect/major | rejected | NOT APPLIED — nrv-cn5-trigeminal.foramen stays "foramen ovale". verify:cranial-nerve-courses pins that field to the single documented opening per nerve (its own expected table carries foramen ovale for CN V) and asserts the value is non-empty and named; the record's course sentence already names V1's superior orbital … |
| `VN-019` | `nrv-cn2-optic` | waypoints[2] (course record in src/geometry/curves.ts) | wrong/major | rejected | NOT APPLIED (the marker half was). The CN II course waypoints were left as authored. The finding's basis is a y-axis comparison against a mesh bbox — the vessels-nerves auditor's own stated coordinate rule says y is anchor-warped and cannot carry a mesh-bbox claim — the path is explicitly an authored schematic (its an… |
| `VN-020` | `nrv-cn6-abducens` | origin3d | wrong/minor | rejected | NOT APPLIED — nrv-cn6-abducens.origin3d left at [4.5,−18,5] with size3d [1.6,9,2]. The finding's own proposal (z = 11) does not clear the pons envelope either: at that level the ventral surface is at z ≈ 15–16.7, so z = 11 is still inside the substance and the "fix" would move the marker without fixing the defect. Fil… |
| `VN-023` | `nrv-cn7-facial` | connections.afferent[1] | suspect/minor | rejected | NOT APPLIED — the afferent/efferent heading semantics of the motor nerves (a nucleus whose axons form the nerve listed as an afferent). Seven of the twelve records already state in their own prose that the nerve carries no afferents and use the heading as "central structures this nerve links"; restructuring that headi… |
| `VN-024` | `nuc-trigeminal-motor (linked by nrv-cn5-trigeminal and by the CN V course anchorId)` | laterality | wrong/minor | rejected | NOT APPLIED — nuc-trigeminal-motor laterality. Same render-time class as brainstem-015: the committed cast is a single bilateral blob (x −5.84…5.86) and flipping the flag changes what is drawn in a way this sandbox cannot observe. Recorded as a convention question for the renderer owner. |
| `VN-025` | `nrv-cn11-accessory` | modality / course (spot-verification of an explicitly named… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `VN-026` | `all 12 nrv-cn* records` | foramen (full sweep of the twelve skull-base openings) | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `VN-027` | `all 12 NERVE_COURSES (src/geometry/curves.ts)` | waypoints (root anchoring) and anchorId | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |

### tracts-plates (345 findings)

| finding | record | field | verdict/severity | disposition | what changed, or why not |
| --- | --- | --- | --- | --- | --- |
| `tract-mlf.tubeRadius` | `tract-mlf` | tubeRadius | suspect/minor | **applied** | tract-mlf.tubeRadius 0.4 → 0.3 au (0.96 → 0.72 mm): the paramedian bundle is now the thinnest in the set instead of sitting level with the tectospinal and vestibulospinal tracts |
| `tract-hypothalamospinal.target` | `tract-hypothalamospinal` | target | suspect/major | **applied** | the target no longer claims a T1–L2 intermediolateral column the record's own course (last waypoint y = −52) and level set (lvl-spinal-medulla) cannot reach; the continuation is stated as a continuation, with the drawn extent named |
| `tract-trigeminothalamic-dorsal.function` | `tract-trigeminothalamic-dorsal` | function | suspect/minor | **applied** | the contested uncrossed dorsal route is no longer presented as the established explanation of ipsilateral oral-touch sparing; the bilateral projection of the brainstem trigeminal complex is named instead |
| `tract-optic-radiation.levels` | `tract-optic-radiation` | levels | suspect/major | **applied** | levels trimmed to four anchors inside the record's own course (see T3-0012 for the full reasoning and the rejected alternative) |
| `plate-thalamus-mid.(orientation-markers)` | `plate-thalamus-mid` | svg plate-frame orientation markers (P at (400,62) / A at (… | wrong/major | **applied** | plate-thalamus-mid.svg: the frame letters swapped so A sits at the bottom (cy = 738) and P at the top — the drawing puts the pulvinar/MGN at the top and the anterior nucleus/mammillary body at the bottom, and the other eight transverse plates all put A at the bottom. No shape, label or leader line moved. |
| `plate-sagittal-midline.(orientation-markers)` | `plate-sagittal-midline` | svg plate-frame orientation markers (A at (52,400) / P at (… | wrong/major | **applied** | plate-sagittal-midline.svg: the horizontal frame letters swapped so P sits at x = 52 and A at x = 748 — the plate's own drawing runs anterior on the LEFT (optic chiasm x = 318 … cerebellum x = 577). The vertical axis (S top, I bottom) was verified correct and left alone. |
| `plate-sagittal-midline.label.vent-cerebral-aqueduct` | `plate-sagittal-midline` | regions[label=vent-cerebral-aqueduct].leader-dot (526,550) | wrong/major | **applied** | the aqueduct leader dot (526,550) — 30 px outside the aqueduct, inside the fourth-ventricle/cerebellar field — moved to the aqueduct ellipse centroid (467,513); the line end moved with it |
| `plate-sagittal-midline.label.nuc-pag` | `plate-sagittal-midline` | regions[label=nuc-pag].leader-dot (520,543) | wrong/minor | **applied** | the PAG leader dot moved to (462,524): inside the periaqueductal gray ellipse and outside the aqueduct ellipse, so the two labels stay distinguishable |
| `plate-sagittal-midline.label.nuc-dorsal-raphe` | `plate-sagittal-midline` | regions[label=nuc-dorsal-raphe].leader-dot (461,480) | wrong/minor | **applied** | the dorsal-raphe dot moved onto its own ellipse centroid (452,486) instead of sitting in the hypothalamic envelope |
| `plate-pons-rostral.label.surf-cn4-exit` | `plate-pons-rostral` | regions[label=surf-cn4-exit].leader-dot (400,252) | wrong/minor | **applied** | the CN IV leader dot moved from the midline (400,252), where it touched neither rootlet, onto the left oval (391,254) |
| `plate-thalamus-mid.label.nuc-thalamic-anterior` | `plate-thalamus-mid` | regions[label=nuc-thalamic-anterior].leader-dot (342,556) | wrong/minor | **applied** | the anterior-nucleus dot moved onto its ellipse centre (320,548) |
| `plate-coronal-thalamus.label.nuc-mammillary-body` | `plate-coronal-thalamus` | regions[label=nuc-mammillary-body].leader-dot (430,586) | wrong/minor | **applied** | the mammillary-body dot moved onto the shape (418,578). The accompanying question — whether the mammillary body belongs on a coronal section at the pulvinar/pineal level at all (the model puts it at z = +4) — is recorded as an open plate-composition question, not acted on: moving a drawn shape is a plate redesign, not… |
| `tract-corticospinal-lateral.name` | `tract-corticospinal-lateral` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.synonyms` | `tract-corticospinal-lateral` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.direction` | `tract-corticospinal-lateral` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.modality` | `tract-corticospinal-lateral` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.origin` | `tract-corticospinal-lateral` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.target` | `tract-corticospinal-lateral` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.decussation` | `tract-corticospinal-lateral` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.somatotopy` | `tract-corticospinal-lateral` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.function` | `tract-corticospinal-lateral` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.clinical` | `tract-corticospinal-lateral` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.waypoints` | `tract-corticospinal-lateral` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.tubeRadius` | `tract-corticospinal-lateral` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.levels` | `tract-corticospinal-lateral` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticospinal-lateral.refs` | `tract-corticospinal-lateral` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.name` | `tract-corticobulbar` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.synonyms` | `tract-corticobulbar` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.direction` | `tract-corticobulbar` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.modality` | `tract-corticobulbar` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.origin` | `tract-corticobulbar` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.target` | `tract-corticobulbar` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.decussation` | `tract-corticobulbar` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.somatotopy` | `tract-corticobulbar` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.function` | `tract-corticobulbar` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.clinical` | `tract-corticobulbar` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.waypoints` | `tract-corticobulbar` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.tubeRadius` | `tract-corticobulbar` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.levels` | `tract-corticobulbar` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticobulbar.refs` | `tract-corticobulbar` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.name` | `tract-corticopontine` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.synonyms` | `tract-corticopontine` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.direction` | `tract-corticopontine` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.modality` | `tract-corticopontine` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.origin` | `tract-corticopontine` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.target` | `tract-corticopontine` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.decussation` | `tract-corticopontine` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.somatotopy` | `tract-corticopontine` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.function` | `tract-corticopontine` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.clinical` | `tract-corticopontine` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.waypoints` | `tract-corticopontine` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.tubeRadius` | `tract-corticopontine` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.levels` | `tract-corticopontine` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-corticopontine.refs` | `tract-corticopontine` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.name` | `tract-rubrospinal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.synonyms` | `tract-rubrospinal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.direction` | `tract-rubrospinal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.modality` | `tract-rubrospinal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.origin` | `tract-rubrospinal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.target` | `tract-rubrospinal` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.decussation` | `tract-rubrospinal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.somatotopy` | `tract-rubrospinal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.function` | `tract-rubrospinal` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.clinical` | `tract-rubrospinal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.waypoints` | `tract-rubrospinal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.tubeRadius` | `tract-rubrospinal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.levels` | `tract-rubrospinal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-rubrospinal.refs` | `tract-rubrospinal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.name` | `tract-tectospinal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.synonyms` | `tract-tectospinal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.direction` | `tract-tectospinal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.modality` | `tract-tectospinal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.origin` | `tract-tectospinal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.target` | `tract-tectospinal` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.decussation` | `tract-tectospinal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.somatotopy` | `tract-tectospinal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.function` | `tract-tectospinal` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.clinical` | `tract-tectospinal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.waypoints` | `tract-tectospinal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.tubeRadius` | `tract-tectospinal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.levels` | `tract-tectospinal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-tectospinal.refs` | `tract-tectospinal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.name` | `tract-lateral-vestibulospinal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.synonyms` | `tract-lateral-vestibulospinal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.direction` | `tract-lateral-vestibulospinal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.modality` | `tract-lateral-vestibulospinal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.origin` | `tract-lateral-vestibulospinal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.target` | `tract-lateral-vestibulospinal` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.decussation` | `tract-lateral-vestibulospinal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.somatotopy` | `tract-lateral-vestibulospinal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.function` | `tract-lateral-vestibulospinal` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.clinical` | `tract-lateral-vestibulospinal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.waypoints` | `tract-lateral-vestibulospinal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.tubeRadius` | `tract-lateral-vestibulospinal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.levels` | `tract-lateral-vestibulospinal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-lateral-vestibulospinal.refs` | `tract-lateral-vestibulospinal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.name` | `tract-medial-vestibulospinal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.synonyms` | `tract-medial-vestibulospinal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.direction` | `tract-medial-vestibulospinal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.modality` | `tract-medial-vestibulospinal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.origin` | `tract-medial-vestibulospinal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.target` | `tract-medial-vestibulospinal` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.decussation` | `tract-medial-vestibulospinal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.somatotopy` | `tract-medial-vestibulospinal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.function` | `tract-medial-vestibulospinal` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.clinical` | `tract-medial-vestibulospinal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.waypoints` | `tract-medial-vestibulospinal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.tubeRadius` | `tract-medial-vestibulospinal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.levels` | `tract-medial-vestibulospinal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-medial-vestibulospinal.refs` | `tract-medial-vestibulospinal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.name` | `tract-reticulospinal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.synonyms` | `tract-reticulospinal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.direction` | `tract-reticulospinal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.modality` | `tract-reticulospinal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.origin` | `tract-reticulospinal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.target` | `tract-reticulospinal` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.decussation` | `tract-reticulospinal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.somatotopy` | `tract-reticulospinal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.function` | `tract-reticulospinal` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.clinical` | `tract-reticulospinal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.waypoints` | `tract-reticulospinal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.tubeRadius` | `tract-reticulospinal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.levels` | `tract-reticulospinal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-reticulospinal.refs` | `tract-reticulospinal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.name` | `tract-mlf` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.synonyms` | `tract-mlf` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.direction` | `tract-mlf` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.modality` | `tract-mlf` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.origin` | `tract-mlf` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.target` | `tract-mlf` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.decussation` | `tract-mlf` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.somatotopy` | `tract-mlf` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.function` | `tract-mlf` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.clinical` | `tract-mlf` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.waypoints` | `tract-mlf` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.levels` | `tract-mlf` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-mlf.refs` | `tract-mlf` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.name` | `tract-central-tegmental` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.synonyms` | `tract-central-tegmental` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.direction` | `tract-central-tegmental` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.modality` | `tract-central-tegmental` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.origin` | `tract-central-tegmental` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.target` | `tract-central-tegmental` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.decussation` | `tract-central-tegmental` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.somatotopy` | `tract-central-tegmental` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.function` | `tract-central-tegmental` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.clinical` | `tract-central-tegmental` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.waypoints` | `tract-central-tegmental` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.tubeRadius` | `tract-central-tegmental` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.levels` | `tract-central-tegmental` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-central-tegmental.refs` | `tract-central-tegmental` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.name` | `tract-hypothalamospinal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.synonyms` | `tract-hypothalamospinal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.direction` | `tract-hypothalamospinal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.modality` | `tract-hypothalamospinal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.origin` | `tract-hypothalamospinal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.decussation` | `tract-hypothalamospinal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.somatotopy` | `tract-hypothalamospinal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.function` | `tract-hypothalamospinal` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.clinical` | `tract-hypothalamospinal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.waypoints` | `tract-hypothalamospinal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.tubeRadius` | `tract-hypothalamospinal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.levels` | `tract-hypothalamospinal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-hypothalamospinal.refs` | `tract-hypothalamospinal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.name` | `tract-dcml` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.synonyms` | `tract-dcml` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.direction` | `tract-dcml` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.modality` | `tract-dcml` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.origin` | `tract-dcml` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.target` | `tract-dcml` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.decussation` | `tract-dcml` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.somatotopy` | `tract-dcml` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.function` | `tract-dcml` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.clinical` | `tract-dcml` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.waypoints` | `tract-dcml` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.tubeRadius` | `tract-dcml` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.levels` | `tract-dcml` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-dcml.refs` | `tract-dcml` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.name` | `tract-spinothalamic` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.synonyms` | `tract-spinothalamic` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.direction` | `tract-spinothalamic` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.modality` | `tract-spinothalamic` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.origin` | `tract-spinothalamic` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.target` | `tract-spinothalamic` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.decussation` | `tract-spinothalamic` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.somatotopy` | `tract-spinothalamic` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.function` | `tract-spinothalamic` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.clinical` | `tract-spinothalamic` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.waypoints` | `tract-spinothalamic` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.tubeRadius` | `tract-spinothalamic` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.levels` | `tract-spinothalamic` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinothalamic.refs` | `tract-spinothalamic` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.name` | `tract-trigeminothalamic-ventral` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.synonyms` | `tract-trigeminothalamic-ventral` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.direction` | `tract-trigeminothalamic-ventral` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.modality` | `tract-trigeminothalamic-ventral` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.origin` | `tract-trigeminothalamic-ventral` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.target` | `tract-trigeminothalamic-ventral` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.decussation` | `tract-trigeminothalamic-ventral` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.somatotopy` | `tract-trigeminothalamic-ventral` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.function` | `tract-trigeminothalamic-ventral` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.clinical` | `tract-trigeminothalamic-ventral` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.waypoints` | `tract-trigeminothalamic-ventral` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.tubeRadius` | `tract-trigeminothalamic-ventral` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.levels` | `tract-trigeminothalamic-ventral` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-ventral.refs` | `tract-trigeminothalamic-ventral` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.name` | `tract-trigeminothalamic-dorsal` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.synonyms` | `tract-trigeminothalamic-dorsal` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.direction` | `tract-trigeminothalamic-dorsal` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.modality` | `tract-trigeminothalamic-dorsal` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.origin` | `tract-trigeminothalamic-dorsal` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.target` | `tract-trigeminothalamic-dorsal` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.decussation` | `tract-trigeminothalamic-dorsal` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.somatotopy` | `tract-trigeminothalamic-dorsal` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.clinical` | `tract-trigeminothalamic-dorsal` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.waypoints` | `tract-trigeminothalamic-dorsal` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.tubeRadius` | `tract-trigeminothalamic-dorsal` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.levels` | `tract-trigeminothalamic-dorsal` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-trigeminothalamic-dorsal.refs` | `tract-trigeminothalamic-dorsal` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.name` | `tract-posterior-spinocerebellar` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.synonyms` | `tract-posterior-spinocerebellar` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.direction` | `tract-posterior-spinocerebellar` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.modality` | `tract-posterior-spinocerebellar` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.origin` | `tract-posterior-spinocerebellar` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.target` | `tract-posterior-spinocerebellar` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.decussation` | `tract-posterior-spinocerebellar` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.somatotopy` | `tract-posterior-spinocerebellar` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.function` | `tract-posterior-spinocerebellar` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.clinical` | `tract-posterior-spinocerebellar` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.waypoints` | `tract-posterior-spinocerebellar` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.tubeRadius` | `tract-posterior-spinocerebellar` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.levels` | `tract-posterior-spinocerebellar` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-posterior-spinocerebellar.refs` | `tract-posterior-spinocerebellar` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.name` | `tract-anterior-spinocerebellar` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.synonyms` | `tract-anterior-spinocerebellar` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.direction` | `tract-anterior-spinocerebellar` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.modality` | `tract-anterior-spinocerebellar` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.origin` | `tract-anterior-spinocerebellar` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.target` | `tract-anterior-spinocerebellar` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.decussation` | `tract-anterior-spinocerebellar` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.somatotopy` | `tract-anterior-spinocerebellar` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.function` | `tract-anterior-spinocerebellar` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.clinical` | `tract-anterior-spinocerebellar` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.waypoints` | `tract-anterior-spinocerebellar` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.tubeRadius` | `tract-anterior-spinocerebellar` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.levels` | `tract-anterior-spinocerebellar` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-anterior-spinocerebellar.refs` | `tract-anterior-spinocerebellar` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.name` | `tract-auditory-pathway` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.synonyms` | `tract-auditory-pathway` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.direction` | `tract-auditory-pathway` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.modality` | `tract-auditory-pathway` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.origin` | `tract-auditory-pathway` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.target` | `tract-auditory-pathway` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.decussation` | `tract-auditory-pathway` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.somatotopy` | `tract-auditory-pathway` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.function` | `tract-auditory-pathway` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.clinical` | `tract-auditory-pathway` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.waypoints` | `tract-auditory-pathway` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.tubeRadius` | `tract-auditory-pathway` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.levels` | `tract-auditory-pathway` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-auditory-pathway.refs` | `tract-auditory-pathway` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.name` | `tract-spinoreticular` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.synonyms` | `tract-spinoreticular` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.direction` | `tract-spinoreticular` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.modality` | `tract-spinoreticular` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.origin` | `tract-spinoreticular` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.target` | `tract-spinoreticular` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.decussation` | `tract-spinoreticular` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.somatotopy` | `tract-spinoreticular` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.function` | `tract-spinoreticular` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.clinical` | `tract-spinoreticular` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.waypoints` | `tract-spinoreticular` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.tubeRadius` | `tract-spinoreticular` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.levels` | `tract-spinoreticular` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-spinoreticular.refs` | `tract-spinoreticular` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.name` | `tract-optic-radiation` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.synonyms` | `tract-optic-radiation` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.direction` | `tract-optic-radiation` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.modality` | `tract-optic-radiation` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.origin` | `tract-optic-radiation` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.target` | `tract-optic-radiation` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.decussation` | `tract-optic-radiation` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.somatotopy` | `tract-optic-radiation` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.function` | `tract-optic-radiation` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.clinical` | `tract-optic-radiation` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.waypoints` | `tract-optic-radiation` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.tubeRadius` | `tract-optic-radiation` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-optic-radiation.refs` | `tract-optic-radiation` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.name` | `tract-cingulum` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.synonyms` | `tract-cingulum` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.direction` | `tract-cingulum` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.modality` | `tract-cingulum` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.origin` | `tract-cingulum` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.target` | `tract-cingulum` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.decussation` | `tract-cingulum` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.somatotopy` | `tract-cingulum` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.function` | `tract-cingulum` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.clinical` | `tract-cingulum` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.waypoints` | `tract-cingulum` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.tubeRadius` | `tract-cingulum` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.levels` | `tract-cingulum` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-cingulum.refs` | `tract-cingulum` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.name` | `tract-uncinate-fasciculus` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.synonyms` | `tract-uncinate-fasciculus` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.direction` | `tract-uncinate-fasciculus` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.modality` | `tract-uncinate-fasciculus` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.origin` | `tract-uncinate-fasciculus` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.target` | `tract-uncinate-fasciculus` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.decussation` | `tract-uncinate-fasciculus` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.somatotopy` | `tract-uncinate-fasciculus` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.function` | `tract-uncinate-fasciculus` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.clinical` | `tract-uncinate-fasciculus` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.waypoints` | `tract-uncinate-fasciculus` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.tubeRadius` | `tract-uncinate-fasciculus` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.levels` | `tract-uncinate-fasciculus` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-uncinate-fasciculus.refs` | `tract-uncinate-fasciculus` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.name` | `tract-superior-longitudinal-fasciculus` | name | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.synonyms` | `tract-superior-longitudinal-fasciculus` | synonyms | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.direction` | `tract-superior-longitudinal-fasciculus` | direction | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.modality` | `tract-superior-longitudinal-fasciculus` | modality | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.origin` | `tract-superior-longitudinal-fasciculus` | origin | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.target` | `tract-superior-longitudinal-fasciculus` | target | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.decussation` | `tract-superior-longitudinal-fasciculus` | decussation | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.somatotopy` | `tract-superior-longitudinal-fasciculus` | somatotopy | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.function` | `tract-superior-longitudinal-fasciculus` | function | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.clinical` | `tract-superior-longitudinal-fasciculus` | clinical | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.waypoints` | `tract-superior-longitudinal-fasciculus` | waypoints | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.tubeRadius` | `tract-superior-longitudinal-fasciculus` | tubeRadius | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.levels` | `tract-superior-longitudinal-fasciculus` | levels | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `tract-superior-longitudinal-fasciculus.refs` | `tract-superior-longitudinal-fasciculus` | refs | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-thalamus-mid.integrity` | `plate-thalamus-mid` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-midbrain-sc.integrity` | `plate-midbrain-sc` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-midbrain-ic.integrity` | `plate-midbrain-ic` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-pons-rostral.integrity` | `plate-pons-rostral` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-pons-middle.integrity` | `plate-pons-middle` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-pons-caudal.integrity` | `plate-pons-caudal` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-olivary.integrity` | `plate-olivary` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-sensory-decuss.integrity` | `plate-sensory-decuss` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-pyramid-decuss.integrity` | `plate-pyramid-decuss` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-sagittal-midline.integrity` | `plate-sagittal-midline` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-coronal-midbrain.integrity` | `plate-coronal-midbrain` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-coronal-thalamus.integrity` | `plate-coronal-thalamus` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-tel-axial-58.integrity` | `plate-tel-axial-58` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-tel-sagittal-hemisphere.integrity` | `plate-tel-sagittal-hemisphere` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |
| `plate-tel-coronal-fornix.integrity` | `plate-tel-coronal-fornix` | manifest<->svg: regions[].slug, levelId vs plane, caption v… | ok/minor | verified (ok) | verified in the audit — data already correct, nothing changed |

### syndromes (16 findings)

| finding | record | field | verdict/severity | disposition | what changed, or why not |
| --- | --- | --- | --- | --- | --- |
| `SYN-001` | `vasc-middle-cerebral-artery` | supply[] (artery side) / syn-parkinson.vascularTerritory (c… | wrong/critical | **applied** | vasc-middle-cerebral-artery.supply −"syn-parkinson" (and −"syn-lateral-medullary" with SYN-002): the MCA no longer appears as the artery of a degenerative disease |
| `SYN-002` | `syn-lateral-medullary` | vascularTerritory + structures[] (card) vs vasc-middle-cere… | wrong/critical | **applied** | vasc-middle-cerebral-artery.supply −"syn-lateral-medullary" (now empty) and its contextNote rewritten: the old note claimed the card cites the MCA among its alternatives, which it never did |
| `SYN-003` | `syn-foville` | presentation | wrong/critical | **applied** | syn-foville.presentation: the gaze palsy now reads "gaze toward the lesion is impossible, so the eyes rest conjugately deviated away from the lesion" — the critical direction error is fixed and agrees with nuc-pprf and nuc-abducens |
| `SYN-004` | `syn-weber` | structures[] + vascularTerritory | wrong/major | **applied** | syn-weber.structures −"tract-corticospinal-lateral" (that id is the crossed medullary tract: its own levels run from lvl-spinal-medulla). "tract-corticobulbar" was KEPT, contrary to the optional half of the finding: its registry record is a full-length tract whose origin is the genu of the internal capsule and the med… |
| `SYN-005` | `syn-millard-gubler` | structures[] | wrong/major | **applied** | syn-millard-gubler.structures −"nuc-pprf": the classic ventrocaudal-pontine definition (CN VII + CN VI fascicles + corticospinal) does not require a nuclear/PPRF lesion — that extension is Foville, and the presentation already hedges it as conditional |
| `SYN-006` | `syn-ino` | structures[] | wrong/minor | **applied** | syn-ino.structures → ["tract-mlf"]: the abducens and oculomotor nuclei are deafferented targets, not damaged structures |
| `SYN-007` | `syn-hypothalamic` | vascularTerritory (reciprocal link, direction a) | wrong/major | **applied** | vasc-posterior-cerebral-artery.supply += "syn-hypothalamic" — the card names the P1/PCA paramedian perforators and had no PCA link |
| `SYN-008` | `syn-cerebellar` | vascularTerritory (territory coverage + reciprocal link, di… | suspect/major | **applied** | syn-cerebellar.vascularTerritory reworded: the SCA supplies the dentate, interposed and fastigial nuclei and the SCP (exactly what the SCA record's own territory[] says); the unsupported "AICA and PICA for the other deep-nucleus territories" clause is gone |
| `SYN-009` | `syn-central-horner` | vascularTerritory (reciprocal link, direction a) | wrong/major | **applied** | vasc-basilar-artery.supply += "syn-central-horner" — the card names basilar paramedian pontine perforators |
| `SYN-010` | `vasc-internal-carotid-artery + vasc-posterior-communicating-artery` | supply[] (artery side), both records | wrong/major | **applied** | vasc-internal-carotid-artery.supply → ["syn-hypothalamic"] and vasc-posterior-communicating-artery.supply −"syn-weber": the ICA no longer claims Weber, tuberothalamic or hemiballismus, and the PCoA no longer claims Weber |
| `SYN-011` | `vasc-lenticulostriate-arteries` | supply[] (artery side) | wrong/major | **applied** | vasc-lenticulostriate-arteries.supply → []: neither card (hemiballismus, Weber) names the lenticulostriate arteries or the MCA, and the record keeps its four clinical entries |
| `SYN-012` | `vasc-posterior-medial-choroidal-artery` | supply[] (artery side) + syn-dejerine-roussy.vascularTerrit… | wrong/major | **applied** | vasc-posterior-medial-choroidal-artery.supply −"syn-dejerine-roussy" → []: the inferolateral (thalamogeniculate) territory owns that card, as the card itself says; it keeps its PCA link |
| `SYN-013` | `syn-weber` | reciprocal link set (card ↔ artery records) | wrong/major | **applied** | closed by SYN-010 + SYN-011: arteriesForSyndrome(syn-weber) now returns only vasc-posterior-cerebral-artery (verified by reading the supply arrays of all 14 vessel records after the edits) |
| `SYN-014` | `syn-parinaud` | eponym | wrong/minor | **applied** | syn-parinaud.eponym → "Parinaud"; syn-pineal-region.eponym → "Parinaud (mass effect)" — the duplicate eponym string is resolved |
| `SYN-016` | `syn-hemimedullary` | structures[] | wrong/major | **applied** | syn-hemimedullary.structures += "tract-hypothalamospinal" and "tract-icp": the presentation states Horner syndrome and ataxia, and these are the two ids the sibling lateral-medullary card uses for exactly those signs |
| `SYN-015` | `syn-medial-medullary` | vascularTerritory (reciprocal link) + registry coverage | unverifiable-here/minor | open | OPEN (the cheap half applied): vasc-vertebral-artery.contextNote no longer claims the anterior spinal artery is reported in the PICA record's clinical notes — it is reported in the vertebral record's own efferent list. The missing vasc-anterior-spinal-artery record the card names is a registry-coverage question and wa… |

## 8. What this ledger does not claim

- No finding was validated against imaging or a specimen; the audit is a model-based review of authored text and coordinates, cross-checked against other authored records and the committed mesh bboxes.
- The browser lane is unavailable in this sandbox (`verify:audit` exits 4, "no check was run"). No rendered-pixel, pointer or focus observation is claimed anywhere in this pass.
- `verify:anatomy` and `verify:imaging-fit` cannot complete here (`spawnSync … EPERM`, before any verdict); the orchestrator runs them in its own environment.
- `rejected` is not "no": each rejected row states the basis that outranked the finding, and the four `open` rows are questions this pass deliberately did not answer.
