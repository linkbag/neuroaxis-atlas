# v15 scientific audit — the 26 clinical syndrome cards and their artery ↔ syndrome links

**Auditor** `audit-syndromes` (swarm run *NeuroAxis v15 — deep scientific audit*). **Auditors do not edit data**: every row below is a hand-off to the single integrator.

- **Scope audited:** all 26 cards in `src/data/syndromes/diencephalon.json` (7), `hindbrain.json` (11) and `midbrain.json` (8) — name, eponym, `structures[]`, `vascularTerritory`, `presentation`, `cause`, `refs`.
- **Cross-checked against:** `src/data/structures/vasculature.json` (14 vessel records, `supply[]` **both directions**), `src/data/taxonomy.json` (248 registry ids), `src/data/tracts.json` (23 tract records), and the 225 structure records the cards point at — including each named structure's own `clinical[]` entries, `region`, `laterality` and `levels[]`.
- **Machine-readable companion:** [`syndromes.findings.json`](syndromes.findings.json) — per-finding `{ id, area, recordId, field, claimed, expected, verdict, severity, basis, basisKind, suggestedFix, notes }`.
- **Not touched:** the frozen GLBs, `origin3d`/`size3d`/`levels` of any record, `package.json`, and every data file (auditors are read-only by contract). `verify:anatomy` (27/27) remains unaffected because no mesh or bbox claim is made here.

## 1. Verdict / severity summary

**Verdicts:** `wrong` 14 · `suspect` 1 · `unverifiable-here` 1  _(no `ok` row is listed: a finding is only filed when something is wrong, suspect or unverifiable. The single `suspect` row, SYN-008, is a disagreement between two records whose resolution is a design choice, not an established fact.)_

**Severities:** `critical` 3 · `major` 10 · `minor` 3

**Basis kinds (primary):** `internal-contradiction` 15 · `external-source` 1

**Record census:** 16 findings — 11 against card ids, 4 against artery records. 11 of 26 cards carry at least one finding; the remaining 15 are clean.

| id | record | field | verdict | severity | basis |
|---|---|---|---|---|---|
| `SYN-001` | `vasc-middle-cerebral-artery` | `supply[] (artery side) / syn-parkinson.vascularTerritory (card side)` | wrong | critical | `internal-contradiction` |
| `SYN-002` | `syn-lateral-medullary` | `vascularTerritory + structures[] (card) vs vasc-middle-cerebral-artery.supply (artery)` | wrong | critical | `internal-contradiction+external-source` |
| `SYN-003` | `syn-foville` | `presentation` | wrong | critical | `internal-contradiction+external-source` |
| `SYN-004` | `syn-weber` | `structures[] + vascularTerritory` | wrong | major | `internal-contradiction+external-source` |
| `SYN-005` | `syn-millard-gubler` | `structures[]` | wrong | major | `external-source+internal-contradiction` |
| `SYN-006` | `syn-ino` | `structures[]` | wrong | minor | `internal-contradiction+external-source` |
| `SYN-007` | `syn-hypothalamic` | `vascularTerritory (reciprocal link, direction a)` | wrong | major | `internal-contradiction` |
| `SYN-008` | `syn-cerebellar` | `vascularTerritory (territory coverage + reciprocal link, direction a)` | suspect | major | `internal-contradiction` |
| `SYN-009` | `syn-central-horner` | `vascularTerritory (reciprocal link, direction a)` | wrong | major | `internal-contradiction` |
| `SYN-010` | `vasc-internal-carotid-artery + vasc-posterior-communicating-artery` | `supply[] (artery side), both records` | wrong | major | `internal-contradiction` |
| `SYN-011` | `vasc-lenticulostriate-arteries` | `supply[] (artery side)` | wrong | major | `internal-contradiction` |
| `SYN-012` | `vasc-posterior-medial-choroidal-artery` | `supply[] (artery side) + syn-dejerine-roussy.vascularTerritory` | wrong | major | `internal-contradiction+external-source` |
| `SYN-013` | `syn-weber` | `reciprocal link set (card ↔ artery records)` | wrong | major | `internal-contradiction+external-source` |
| `SYN-014` | `syn-parinaud` | `eponym` | wrong | minor | `internal-contradiction+nomenclature-convention` |
| `SYN-015` | `syn-medial-medullary` | `vascularTerritory (reciprocal link) + registry coverage` | unverifiable-here | minor | `internal-contradiction` |
| `SYN-016` | `syn-hemimedullary` | `structures[]` | wrong | major | `internal-contradiction` |

### Findings per card (counts by verdict and severity)

| card / artery record | findings | verdicts | severities |
|---|---|---|---|
| `syn-central-horner` | 1 | wrong ×1 | major ×1 |
| `syn-cerebellar` | 1 | suspect ×1 | major ×1 |
| `syn-foville` | 1 | wrong ×1 | critical ×1 |
| `syn-hemimedullary` | 1 | wrong ×1 | major ×1 |
| `syn-hypothalamic` | 1 | wrong ×1 | major ×1 |
| `syn-ino` | 1 | wrong ×1 | minor ×1 |
| `syn-lateral-medullary` | 1 | wrong ×1 | critical ×1 |
| `syn-medial-medullary` | 1 | unverifiable-here ×1 | minor ×1 |
| `syn-millard-gubler` | 1 | wrong ×1 | major ×1 |
| `syn-parinaud` | 1 | wrong ×1 | minor ×1 |
| `syn-weber` | 2 | wrong ×2 | major ×2 |
| `vasc-internal-carotid-artery` | 1 | wrong ×1 | major ×1 |
| `vasc-lenticulostriate-arteries` | 1 | wrong ×1 | major ×1 |
| `vasc-middle-cerebral-artery` | 1 | wrong ×1 | critical ×1 |
| `vasc-posterior-communicating-artery` | 1 | wrong ×1 | major ×1 |
| `vasc-posterior-medial-choroidal-artery` | 1 | wrong ×1 | major ×1 |

## 2. The three critical defects (do these first)

### SYN-001 — vasc-middle-cerebral-artery · supply[] (artery side) / syn-parkinson.vascularTerritory (card side)

- **Claimed:** vasc-middle-cerebral-artery.supply = ["syn-parkinson","syn-lateral-medullary"] — i.e. the atlas states that the middle cerebral artery causes Parkinson's disease. Via src/data/load.ts syndromesBySupply -> arteriesForSyndrome(), opening syn-parkinson currently lights the MCA as its causal artery.
- **Expected:** supply = ["syn-lateral-medullary"] only, or [] if SYN-002 is also applied. syn-parkinson.vascularTerritory stays exactly as written: "None (degenerative alpha-synucleinopathy, not vascular)".
- **Basis (internal-contradiction):** Internal contradiction between two records: syn-parkinson.vascularTerritory and syn-parkinson.cause state the disease is a degenerative alpha-synucleinopathy of the substantia nigra pars compacta with no vascular territory, and nuc-snc's own clinical[] entry for Parkinson's disease records vascular "None (degenerative alpha-synucleinopathy)". The MCA record's territory[] lists no nigral or midbrain structure (it lists cortex, basal-ganglia and capsule ids), so the MCA cannot infarct the SNc. Mechanism: src/data/load.ts builds the reverse syndrome index from supply[] verbatim, so the wrong entry is rendered as a real causal link.
- **Fix:** Remove "syn-parkinson" from vasc-middle-cerebral-artery.supply in src/data/structures/vasculature.json (leave "syn-lateral-medullary" alone here — it is SYN-002's subject). Do not touch syn-parkinson.json.

### SYN-002 — syn-lateral-medullary · vascularTerritory + structures[] (card) vs vasc-middle-cerebral-artery.supply (artery)

- **Claimed:** The card names only the PICA/vertebral territory ("Posterior inferior cerebellar artery (PICA), usually occluded at its vertebral origin; occasionally the vertebral artery directly") and its cause names vertebral dissection/atherothrombosis/embolism — yet vasc-middle-cerebral-artery.supply contains "syn-lateral-medullary", and the MCA record's contextNote asserts the card "cites the MCA among its alternatives", which the card does not do anywhere in vascularTerritory, cause, presentation or refs. Reciprocal-link direction (a) also fails: the card's text names vasc-posterior-inferior-cerebellar-artery and vasc-vertebral-artery (both of which do list the card) but the MCA link is unreciprocated by the text.
- **Expected:** vasc-middle-cerebral-artery.supply should not contain "syn-lateral-medullary" at all (after SYN-001 is applied it becomes [] unless a genuine MCA syndrome is added); the card side — vascularTerritory, structures[] and cause — is correct as written and must not change.
- **Basis (internal-contradiction+external-source):** Internal contradiction: (1) syn-lateral-medullary.vascularTerritory/cause restrict the lesion to PICA/vertebral; (2) the MCA record is region=vasculature, subdivision="Anterior circulation", and its territory[] contains no medullary structure (it lists surf-frontal-lobe … tract-optic-radiation), so it cannot infarct the dorsolateral medulla; (3) an MCA infarct cannot produce Wallenberg's crossed pattern by any accepted mechanism. External confirmation of the standard attribution: StatPearls "Lateral Medullary Syndrome (Wallenberg Syndrome)" — "usually due to occlusion of the posterior inferior cerebellar artery (PICA), which is a branch of the vertebral artery" (https://www.ncbi.nlm.nih.gov/books/NBK551670/).
- **Fix:** Remove "syn-lateral-medullary" from vasc-middle-cerebral-artery.supply and delete/replace the claim in that record's contextNote ("the existing data cites the MCA among its alternatives"), which is factually untrue of the card as authored.

### SYN-003 — syn-foville · presentation

- **Claimed:** "IPSILATERAL horizontal gaze palsy (PPRF and/or abducens nuclear complex — the eyes deviate away, gaze toward the lesion is impossible)"; and "Contrasts with Millard-Gubler by the gaze-palsy emphasis (PPRF/nuclear VI)".
- **Expected:** "IPSILATERAL horizontal gaze palsy (PPRF and/or abducens nuclear complex — gaze toward the lesion is impossible, so the eyes rest conjugately deviated AWAY from the lesion)". The parenthetical must state that gaze toward the lesion is lost; the resting deviation is the secondary observation, not the definition.
- **Basis (internal-contradiction+external-source):** Internal contradiction with two records in the same atlas that state the rule correctly: nuc-pprf.clinical[0] "the eyes rest deviated away, and the intact contralateral PPRF drives gaze in the opposite direction" and nuc-abducens.clinical[0] "paralyses gaze toward the lesion"; syn-one-and-a-half.presentation "gaze TOWARD the lesion is impossible for either eye … The eyes rest conjugately deviated AWAY from the lesion". External confirmation: StatPearls "Foville Syndrome" — "With the involvement of the PPRF, this presents as a conjugate gaze palsy, meaning the inability to move the eyes towards the affected side" (https://www.ncbi.nlm.nih.gov/books/NBK544268/); the same source's classic triad is "ipsilateral 6th nerve palsy, facial palsy, and contralateral hemiparesis" (https://europepmc.org/books/nbk544268).
- **Fix:** Replace the parenthesis with: "(PPRF and/or abducens nuclear complex — gaze toward the lesion is impossible, so the eyes rest conjugately deviated away from the lesion)".

## 3. All findings

### SYN-001 — `vasc-middle-cerebral-artery` · supply[] (artery side) / syn-parkinson.vascularTerritory (card side) · **wrong** / critical

- **Claimed:** vasc-middle-cerebral-artery.supply = ["syn-parkinson","syn-lateral-medullary"] — i.e. the atlas states that the middle cerebral artery causes Parkinson's disease. Via src/data/load.ts syndromesBySupply -> arteriesForSyndrome(), opening syn-parkinson currently lights the MCA as its causal artery.
- **Expected:** supply = ["syn-lateral-medullary"] only, or [] if SYN-002 is also applied. syn-parkinson.vascularTerritory stays exactly as written: "None (degenerative alpha-synucleinopathy, not vascular)".
- **Basis** (`internal-contradiction`): Internal contradiction between two records: syn-parkinson.vascularTerritory and syn-parkinson.cause state the disease is a degenerative alpha-synucleinopathy of the substantia nigra pars compacta with no vascular territory, and nuc-snc's own clinical[] entry for Parkinson's disease records vascular "None (degenerative alpha-synucleinopathy)". The MCA record's territory[] lists no nigral or midbrain structure (it lists cortex, basal-ganglia and capsule ids), so the MCA cannot infarct the SNc. Mechanism: src/data/load.ts builds the reverse syndrome index from supply[] verbatim, so the wrong entry is rendered as a real causal link.
- **Suggested fix:** Remove "syn-parkinson" from vasc-middle-cerebral-artery.supply in src/data/structures/vasculature.json (leave "syn-lateral-medullary" alone here — it is SYN-002's subject). Do not touch syn-parkinson.json.
- **Notes:** Severity critical because it is rendered: a reader selecting Parkinson's disease is shown the MCA as the artery of the disease, which inverts the card's own teaching point.

### SYN-002 — `syn-lateral-medullary` · vascularTerritory + structures[] (card) vs vasc-middle-cerebral-artery.supply (artery) · **wrong** / critical

- **Claimed:** The card names only the PICA/vertebral territory ("Posterior inferior cerebellar artery (PICA), usually occluded at its vertebral origin; occasionally the vertebral artery directly") and its cause names vertebral dissection/atherothrombosis/embolism — yet vasc-middle-cerebral-artery.supply contains "syn-lateral-medullary", and the MCA record's contextNote asserts the card "cites the MCA among its alternatives", which the card does not do anywhere in vascularTerritory, cause, presentation or refs. Reciprocal-link direction (a) also fails: the card's text names vasc-posterior-inferior-cerebellar-artery and vasc-vertebral-artery (both of which do list the card) but the MCA link is unreciprocated by the text.
- **Expected:** vasc-middle-cerebral-artery.supply should not contain "syn-lateral-medullary" at all (after SYN-001 is applied it becomes [] unless a genuine MCA syndrome is added); the card side — vascularTerritory, structures[] and cause — is correct as written and must not change.
- **Basis** (`internal-contradiction+external-source`): Internal contradiction: (1) syn-lateral-medullary.vascularTerritory/cause restrict the lesion to PICA/vertebral; (2) the MCA record is region=vasculature, subdivision="Anterior circulation", and its territory[] contains no medullary structure (it lists surf-frontal-lobe … tract-optic-radiation), so it cannot infarct the dorsolateral medulla; (3) an MCA infarct cannot produce Wallenberg's crossed pattern by any accepted mechanism. External confirmation of the standard attribution: StatPearls "Lateral Medullary Syndrome (Wallenberg Syndrome)" — "usually due to occlusion of the posterior inferior cerebellar artery (PICA), which is a branch of the vertebral artery" (https://www.ncbi.nlm.nih.gov/books/NBK551670/).
- **Suggested fix:** Remove "syn-lateral-medullary" from vasc-middle-cerebral-artery.supply and delete/replace the claim in that record's contextNote ("the existing data cites the MCA among its alternatives"), which is factually untrue of the card as authored.
- **Notes:** Read literally, the current entry asserts that a middle-cerebral-artery infarct causes Wallenberg syndrome — the wrong vascular territory of the wrong circulation, rendered as a causal link in the UI.

### SYN-003 — `syn-foville` · presentation · **wrong** / critical

- **Claimed:** "IPSILATERAL horizontal gaze palsy (PPRF and/or abducens nuclear complex — the eyes deviate away, gaze toward the lesion is impossible)"; and "Contrasts with Millard-Gubler by the gaze-palsy emphasis (PPRF/nuclear VI)".
- **Expected:** "IPSILATERAL horizontal gaze palsy (PPRF and/or abducens nuclear complex — gaze toward the lesion is impossible, so the eyes rest conjugately deviated AWAY from the lesion)". The parenthetical must state that gaze toward the lesion is lost; the resting deviation is the secondary observation, not the definition.
- **Basis** (`internal-contradiction+external-source`): Internal contradiction with two records in the same atlas that state the rule correctly: nuc-pprf.clinical[0] "the eyes rest deviated away, and the intact contralateral PPRF drives gaze in the opposite direction" and nuc-abducens.clinical[0] "paralyses gaze toward the lesion"; syn-one-and-a-half.presentation "gaze TOWARD the lesion is impossible for either eye … The eyes rest conjugately deviated AWAY from the lesion". External confirmation: StatPearls "Foville Syndrome" — "With the involvement of the PPRF, this presents as a conjugate gaze palsy, meaning the inability to move the eyes towards the affected side" (https://www.ncbi.nlm.nih.gov/books/NBK544268/); the same source's classic triad is "ipsilateral 6th nerve palsy, facial palsy, and contralateral hemiparesis" (https://europepmc.org/books/nbk544268).
- **Suggested fix:** Replace the parenthesis with: "(PPRF and/or abducens nuclear complex — gaze toward the lesion is impossible, so the eyes rest conjugately deviated away from the lesion)".
- **Notes:** Critical because the wrong direction of a gaze palsy mislocalizes the lesion to the opposite side of the pons, which is exactly how Foville is examined at the bedside.

### SYN-004 — `syn-weber` · structures[] + vascularTerritory · **wrong** / major

- **Claimed:** structures = ["nuc-oculomotor","tract-crus-cerebri","tract-corticospinal-lateral","tract-corticobulbar"]; vascularTerritory = "Paramedian branches of the posterior cerebral artery (posterior thalamoperforating / midbrain perforators)".
- **Expected:** structures = ["nuc-oculomotor","tract-crus-cerebri"] (the presentation already names the corticobulbar fibres as damaged, and tract-crus-cerebri documents that it carries the corticospinal and corticobulbar fibres of the basis pedunculi). vascularTerritory should lead with the paramedian PCA/perforator origin of the syndrome and must not be paired with the lenticulostriate (MCA) supply entry — see SYN-011.
- **Basis** (`internal-contradiction+external-source`): (a) Internal contradiction with the record's own registry entry: tract-corticospinal-lateral is a medulla record (src/data/tracts.json: "Corticospinal tract (lateral)", levels lvl-spinal-medulla … lvl-thalamus-rostral) and tract-pyramid (medulla) documents that the corticospinal axons only become the *lateral* corticospinal tract at the pyramidal decussation, caudal to the medulla. At the level of the syndrome's lesion — the midbrain basis pedunculi — the descending fibres are uncrossed crus-cerebri fibres, which is why tract-crus-cerebri.function states it carries "corticobulbar fibers, then corticospinal fibers" with frontopontine most medial. (b) syn-medial-medullary and syn-locked-in use tract-pyramid for the same pre-decussation corticospinal fibres at their own levels, so the atlas's own convention is level-correct naming. (c) External: StatPearls "Weber Syndrome" and Radiopaedia "Weber syndrome" localize the syndrome to the ventral midbrain basis pedunculi with fascicular CN III involvement (https://www.ncbi.nlm.nih.gov/books/NBK559158/, https://radiopaedia.org/articles/weber-syndrome).
- **Suggested fix:** Drop "tract-corticospinal-lateral" and (optionally) "tract-corticobulbar" from syn-weber.structures, leaving ["nuc-oculomotor","tract-crus-cerebri"]; the pre-decussation corticospinal/corticobulbar fibres are already enumerated by tract-crus-cerebri's own afferent/efferent fields. Do not invent a midbrain 'corticospinal' id — none exists in taxonomy.json.
- **Notes:** Verdict is wrong on the id/level mismatch (the record is the caudal, crossed lateral corticospinal tract of the medulla), not on clinical content: the presentation text itself is correct. External basis cited above; the internal contradiction alone would sustain it.

### SYN-005 — `syn-millard-gubler` · structures[] · **wrong** / major

- **Claimed:** structures = ["nuc-facial","nuc-abducens","nuc-pprf","tract-corticospinal-lateral","tract-corticobulbar"] — the abducens nucleus and the PPRF are listed as the damaged structures of the syndrome, while the card's own presentation hedges them ("plus IPSILATERAL abducens failure … and if the nuclear complex or adjacent PPRF is involved, conjugate gaze palsy").
- **Expected:** structures = ["nuc-facial","nuc-abducens","tract-corticospinal-lateral","tract-corticobulbar"] for the classic ventrocaudal-pons definition (CN VII + CN VI fascicles + corticospinal), with the PPRF removed: a nuclear CN VI or PPRF lesion abolishes *conjugate* gaze toward the side, which is the Foville variant, not the classical Millard-Gubler abduction failure. If the pons-level id must be level-correct, tract-corticospinal-lateral/tract-corticobulbar should follow the same treatment decided for SYN-004.
- **Basis** (`external-source+internal-contradiction`): External: StatPearls "Millard-Gubler Syndrome" — "MGS is caused by a lesion in the ventral part of the pons (basis pontis) involving the infranuclear fascicular fibers of cranial nerve VII ipsilaterally and the corticospinal tract contralaterally" (https://www.ncbi.nlm.nih.gov/books/NBK532907/), i.e. the defining structures are the CN VII fascicles and the corticospinal tract; the abducens is the eponymous but variable addition ("facial abducens hemiplegia syndrome", https://www.ophth.wisc.edu/blog/2025/01/01/millard-gubler-syndrome/). Internal: the card's own presentation makes the abducens *nucleus*/PPRF contribution conditional, and nuc-abducens.clinical[1] explicitly separates "fascicular or peripheral CN VI injury (isolated failure of abduction)" — the Millard-Gubler lesion — from "a nuclear lesion (gaze palsy)", which is what the structures[] field currently asserts.
- **Suggested fix:** Remove "nuc-pprf" from syn-millard-gubler.structures and keep the conjugate-gaze clause in the presentation as a conditional extension (it is correct there). Consider rewording the presentation's first clause to "ipsilateral abducens (fascicular) failure".
- **Notes:** Not critical: the presentation hedges correctly and the syndrome is still recognizable; the defect is that structures[] asserts a nuclear/PPRF lesion the classic definition does not require.

### SYN-006 — `syn-ino` · structures[] · **wrong** / minor

- **Claimed:** structures = ["tract-mlf","nuc-abducens","nuc-oculomotor"] — the abducens nucleus and the oculomotor nucleus are listed as structures damaged by the lesion.
- **Expected:** structures = ["tract-mlf"] for the lesion itself; if the deafferented target must be shown, say so in the presentation (already done: "interrupting the abducens internuclear fibers that ascend to the contralateral oculomotor medial rectus subnucleus") rather than listing the nucleus as damaged.
- **Basis** (`internal-contradiction+external-source`): Internal: nuc-abducens.function/efferent identify the nucleus as the *origin* of the internuclear axons that ascend in the contralateral MLF ("Internuclear axons crossing to ascend in the contralateral MLF toward nuc-oculomotor"); tract-mlf's registry meaning is the interrupted pathway. The abducens and oculomotor nuclei lie respectively caudal and rostral to the MLF lesion and are deafferented/de-efferented, not destroyed — the card's own presentation says exactly this. External: the definition of INO is an MLF lesion (Blumenfeld, cited by the card, Ch. "Brainstem II: Eye Movements and Pupillary Control").
- **Suggested fix:** Reduce syn-ino.structures to ["tract-mlf"]; keep the presentation text unchanged.
- **Notes:** Minor because the card's prose localizes correctly; the defect is that structures[] over-claims the damaged set in the machine-readable field that drives highlighting.

### SYN-007 — `syn-hypothalamic` · vascularTerritory (reciprocal link, direction a) · **wrong** / major

- **Claimed:** The card names "posterior communicating and P1/PCA paramedially" but vasc-posterior-cerebral-artery.supply does not contain "syn-hypothalamic" (supply = syn-dejerine-roussy, syn-percheron, syn-tuberothalamic, syn-weber, syn-benedikt, syn-claude, syn-nothnagel, syn-parinaud, syn-peduncular-hallucinosis).
- **Expected:** vasc-posterior-cerebral-artery.supply should contain "syn-hypothalamic", since the card names the P1/PCA paramedian hypothalamic perforators among the territories that injure the supraoptic/paraventricular magnocellular neurons.
- **Basis** (`internal-contradiction`): Internal contradiction between the card's own vascularTerritory text ("P1/PCA paramedially") and the artery record that omits it; opening the card currently lights the anterior communicating, posterior communicating and internal carotid arteries but not the PCA it names (src/data/load.ts arteriesForSyndrome reads supply[] only).
- **Suggested fix:** Add "syn-hypothalamic" to vasc-posterior-cerebral-artery.supply.
- **Notes:** One-sided link — exactly the defect class the dispatch brief asks to flag.

### SYN-008 — `syn-cerebellar` · vascularTerritory (territory coverage + reciprocal link, direction a) · **suspect** / major

- **Claimed:** The card names "Superior cerebellar artery (SCA) for the dentate/SCP complex; AICA and PICA for the other deep-nucleus territories", but the AICA record's territory[] = [tract-mcp, ctx-cerebellum, surf-vermis, cochlear/vestibular/facial/trigeminal nuclei, surf-cn7-exit, surf-cn8-exit, vent-fourth-ventricle] and the PICA record's territory[] = [ctx-cerebellum, surf-vermis, tract-icp, vestibular/spinal-trigeminal/ambiguus/solitary/DMV/spinothalamic/hypothalamospinal/reticular ids, vent-fourth-ventricle] — neither claims any deep cerebellar nucleus (nuc-dentate, nuc-interposed, nuc-fastigial); the SCA record alone does. Nor does either supply[] contain syn-cerebellar (AICA: syn-lateral-pontine, syn-millard-gubler, syn-foville; PICA: syn-lateral-medullary, syn-central-horner, syn-hemimedullary), while the card's structures[] are exactly nuc-dentate, nuc-interposed, nuc-fastigial and tract-scp — i.e. the SCA territory.
- **Expected:** Consistent either way, but not both: (a) correct the card's vascularTerritory to the territory the artery records actually claim — the SCA supplies all three deep nuclei (the SCA territory[] names nuc-dentate, nuc-interposed and nuc-fastigial) and the AICA/PICA clause should be dropped or narrowed to "AICA and PICA for cerebellar cortical/vermal involvement"; or (b) if the atlas wants the AICA/PICA deep-nucleus link, add the deep-nucleus ids to those territories and "syn-cerebellar" to their supply[].
- **Basis** (`internal-contradiction`): Internal contradiction (basisKind internal-contradiction): the card asserts a deep-nucleus allocation that no AICA/PICA record supports, while the SCA record supports the SCA half verbatim (territory[] contains nuc-dentate, nuc-interposed, nuc-fastigial and tract-scp; supply[] already contains syn-cerebellar). The remaining question is genuinely contested in the literature — the dentate nucleus is classically SCA territory with a variable PICA/AICA contribution — so this audit does not declare the data wrong and does not invent a new territory; it records the inconsistency and the two consistent end states. Verdict suspect by the evidence-discipline rule.
- **Suggested fix:** Preferred (smallest, no anatomical re-authoring): edit syn-cerebellar.vascularTerritory to "Superior cerebellar artery (SCA) for the dentate/interposed/fastigial complex and the superior cerebellar peduncle; vermal and cortical cerebellar infarcts follow the AICA and PICA territories" — which is what the artery records already encode. Alternative: if the integrator wants the AICA/PICA deep-nucleus link, add the deep-nucleus ids to vasc-anterior-inferior-cerebellar-artery.territory / vasc-posterior-inferior-cerebellar-artery.territory and "syn-cerebellar" to both supply[] arrays.
- **Notes:** Flagged separately from the pure link findings because the two sides of the atlas disagree about which artery feeds the deep nuclei — a reader who opens the SCA record and the cerebellar card together currently reads two different answers. The reciprocal-link half of the defect (AICA/PICA supply[] omitting syn-cerebellar) disappears under the preferred fix, because the card would then name only the SCA.

### SYN-009 — `syn-central-horner` · vascularTerritory (reciprocal link, direction a) · **wrong** / major

- **Claimed:** The card names "basilar paramedian perforators in the pons" but vasc-basilar-artery.supply (syn-locked-in, syn-one-and-a-half, syn-millard-gubler, syn-foville, syn-ino, syn-peduncular-hallucinosis) does not contain "syn-central-horner".
- **Expected:** Add "syn-central-horner" to vasc-basilar-artery.supply.
- **Basis** (`internal-contradiction`): Internal contradiction: the card explicitly lists the basilar paramedian perforators in the pons as one of the territories of a first-order Horner syndrome, and the structure record nuc-medullary-reticular (named by the card) carries the central Horner clinical entry with vascular "PICA / vertebral". The reciprocal entry is missing only on the basilar side.
- **Suggested fix:** Add "syn-central-horner" to vasc-basilar-artery.supply.
- **Notes:** Note the card also names the anterior spinal artery in the cervical cord; the atlas has no vasc-anterior-spinal-artery record (see SYN-015), so no entry can be added for it.

### SYN-010 — `vasc-internal-carotid-artery + vasc-posterior-communicating-artery` · supply[] (artery side), both records · **wrong** / major

- **Claimed:** vasc-internal-carotid-artery.supply = ["syn-weber","syn-hypothalamic","syn-tuberothalamic","syn-hemiballismus"] and vasc-posterior-communicating-artery.supply = ["syn-hemiballismus","syn-tuberothalamic","syn-hypothalamic","syn-weber"] — the internal carotid is listed as an artery of the tuberothalamic and hemiballismus cards (whose own vascularTerritory fields name the P1/PCoA junction and the PCoA/anterior-choroidal perforators), and the posterior communicating artery is listed as an artery of Weber syndrome (whose card names only PCA paramedian/midbrain perforators, and whose cause names no PCoA mechanism).
- **Expected:** vasc-internal-carotid-artery.supply = ["syn-hypothalamic"] only (the card names the superior hypophyseal perforators, an ICA branch); vasc-posterior-communicating-artery.supply = ["syn-hemiballismus","syn-tuberothalamic","syn-hypothalamic"] with "syn-weber" removed. The "syn-weber" entry on the ICA is resolved by SYN-013.
- **Basis** (`internal-contradiction`): Internal contradiction in four places: (1) syn-tuberothalamic.vascularTerritory = "PCA — tuberothalamic (anterior thalamoperforating) artery from the P1/posterior communicating junction", and neither its structures nor its cause names the ICA; (2) syn-hemiballismus.vascularTerritory = "Perforating branches of the posterior communicating artery and anterior choroidal artery to the subthalamic nucleus", with the ICA and its branches absent; (3) syn-weber.vascularTerritory names only the PCA, and the PCoA record's own clinical[] array contains no Weber item ("Posterior communicating aneurysm with third-nerve palsy", the tuberothalamic infarct, hemiballismus, the fetal-type variant) — a PCoA aneurysm compresses CN III in the cistern and cannot infarct the basis pedunculi; (4) neither artery's territory[] contains nuc-thalamic-anterior, nuc-subthalamic or tract-crus-cerebri.
- **Suggested fix:** In src/data/structures/vasculature.json: set vasc-internal-carotid-artery.supply = ["syn-hypothalamic"], and remove "syn-weber" from vasc-posterior-communicating-artery.supply. Keep the PCoA entries for syn-hemiballismus, syn-tuberothalamic and syn-hypothalamic — those three are reciprocal with their cards.
- **Notes:** Severity major rather than critical: every card involved also carries at least one correct artery link (the PCA or the PCoA), so these entries add a spurious artery instead of replacing the right one. If the integrator prefers to keep the Weber/PCoA link, the card's vascularTerritory must be rewritten to name the PCoA perforators explicitly — as authored the two records contradict each other.

### SYN-011 — `vasc-lenticulostriate-arteries` · supply[] (artery side) · **wrong** / major

- **Claimed:** supply = ["syn-hemiballismus","syn-weber"] — the lenticulostriate (MCA) perforators are listed as an artery of both hemiballismus and Weber syndrome.
- **Expected:** Remove both entries. Hemiballismus is attributed by the card to "Perforating branches of the posterior communicating artery and anterior choroidal artery to the subthalamic nucleus", and Weber syndrome to "Paramedian branches of the posterior cerebral artery … midbrain perforators". The lenticulostriate record's own territory[] is putamen/caudate/pallidum/claustrum/internal capsule/corona radiata — no midbrain, no subthalamic nucleus.
- **Basis** (`internal-contradiction`): Internal contradiction: neither syndrome card mentions the lenticulostriate arteries or the MCA, and the lenticulostriate record's territory[] has no subthalamic or midbrain id (it lists nuc-putamen … tract-corona-radiata). Its clinical[] array names hypertensive putaminal haemorrhage, lacunar pure motor/sensory syndromes, capsular warning syndrome and caudate haemorrhage — none of which is hemiballismus or Weber syndrome.
- **Suggested fix:** Set vasc-lenticulostriate-arteries.supply = [] (or delete the key) — the record keeps its four clinical[] entries, which already document its real syndromes.
- **Notes:** This is a large false-positive cluster: as authored, opening Weber syndrome lights the MCA's deep perforators, and opening hemiballismus lights both the PCoA (correct) and the lenticulostriate arteries (incorrect).

### SYN-012 — `vasc-posterior-medial-choroidal-artery` · supply[] (artery side) + syn-dejerine-roussy.vascularTerritory · **wrong** / major

- **Claimed:** vasc-posterior-medial-choroidal-artery.supply = ["syn-dejerine-roussy"] — the posterior *medial* choroidal artery is listed as the artery of the Déjérine-Roussy thalamic pain syndrome, whose card attributes it to the "thalamogeniculate artery (inferolateral thalamic territory)".
- **Expected:** Remove "syn-dejerine-roussy" from the posterior medial choroidal supply; the inferolateral (thalamogeniculate) territory is the correct attribution. The card text is right and should not change.
- **Basis** (`internal-contradiction+external-source`): External: the thalamic vascular-syndrome literature assigns the inferolateral (thalamogeniculate) artery territory the "thalamic hand" of Foix and Hillemand and the post-lesion pain syndrome of Déjérine-Roussy (Vascular Syndromes of the Thalamus, Stroke, https://www.ahajournals.org/doi/10.1161/01.str.0000087786.38997.9e). Internal: the posterior medial choroidal record's own territory[] is choroid plexus, habenula, MGN, pulvinar and fornix, and its clinical[] items are "Choroid plexus tumour supply", "Posterior choroidal territory infarction" and "Intraventricular haemorrhage" — none is thalamic pain. At most a pulvinar/medial-choroidal contribution could be argued, but the card does not claim one and the entry displaces the correct thalamogeniculate attribution in the reverse index.
- **Suggested fix:** Remove "syn-dejerine-roussy" from vasc-posterior-medial-choroidal-artery.supply, leaving []. Consider a separate finding for the PCA record: vasc-posterior-cerebral-artery.supply does correctly contain "syn-dejerine-roussy", so the card keeps a correct artery link.
- **Notes:** The atlas has no vasc-thalamogeniculate record, so no reciprocal entry can be created; the correct end state is simply that the medial choroidal artery does not claim this card.

### SYN-013 — `syn-weber` · reciprocal link set (card ↔ artery records) · **wrong** / major

- **Claimed:** Opening syn-weber lights four arteries — vasc-internal-carotid-artery, vasc-posterior-communicating-artery, vasc-lenticulostriate-arteries and vasc-posterior-cerebral-artery — of which only the PCA names a mechanism the card supports ("paramedian branches of the posterior cerebral artery (posterior thalamoperforating / midbrain perforators)"). The other three are supported by neither the card nor their own clinical[] arrays.
- **Expected:** syn-weber should light the posterior cerebral artery (and, if the atlas wants the classic alternative, only arteries whose clinical[] array actually documents Weber syndrome). syn-weber.vascularTerritory should be left as authored.
- **Basis** (`internal-contradiction+external-source`): Internal: the three non-PCA links are each contradicted on their own side — ICA (SYN-010), PCoA (undefined), lenticulostriate (SYN-011); no ICA/PCoA/lenticulostriate clinical[] item mentions Weber syndrome or a basis-pedunculi infarct. External: Radiopaedia "Weber syndrome" — "usually caused by an ischemic stroke, typically involving branches of the posterior cerebral artery" (https://radiopaedia.org/articles/weber-syndrome); StatPearls "Weber Syndrome" (https://www.ncbi.nlm.nih.gov/books/NBK559158/).
- **Suggested fix:** Remove "syn-weber" from vasc-internal-carotid-artery.supply, vasc-posterior-communicating-artery.supply and vasc-lenticulostriate-arteries.supply; keep vasc-posterior-cerebral-artery.supply as is. This finding is the syndrome-side roll-up of SYN-010 and closes when SYN-010 and SYN-011 are applied.
- **Notes:** Kept as a separate row so the integrator can verify the final rendered link set (arteriesForSyndrome('syn-weber') === ['vasc-posterior-cerebral-artery']) after applying SYN-010.

### SYN-014 — `syn-parinaud` · eponym · **wrong** / minor

- **Claimed:** eponym = "Parinaud (dorsal midbrain syndrome)"; name = "Parinaud syndrome (dorsal midbrain)". syn-pineal-region carries the identical eponym string while being a different card (name "Pineal region tumor with gaze palsy").
- **Expected:** eponym should be the eponym alone — "Parinaud" (or "Henri Parinaud") — with the descriptor left to `name`; two distinct cards should not share an eponym string that also duplicates another card's name.
- **Basis** (`internal-contradiction+nomenclature-convention`): Internal: the field is an eponym field and every other card in the three files uses it that way ("Weber", "Benedikt", "Claude", "Nothnagel", "Wallenberg syndrome", "Reinhold syndrome"); grepping the three files shows the string "Parinaud (dorsal midbrain syndrome)" occurring twice as an eponym. The dorsal-midbrain descriptor is redundant with name = "Parinaud syndrome (dorsal midbrain)".
- **Suggested fix:** Set syn-parinaud.eponym = "Parinaud" and syn-pineal-region.eponym = "Parinaud (mass effect)" or, preferably, drop the eponym from syn-pineal-region entirely (it is a tumor card whose name does not claim an eponym), keeping the cross-reference in its cause text.
- **Notes:** Minor/cosmetic in the UI, but it is the only duplicate eponym pair in the 26 cards and it makes the two cards indistinguishable in an eponym index.

### SYN-015 — `syn-medial-medullary` · vascularTerritory (reciprocal link) + registry coverage · **unverifiable-here** / minor

- **Claimed:** vascularTerritory = "Anterior spinal artery (paramedian branches of the vertebral artery)"; vasc-vertebral-artery.supply does contain "syn-medial-medullary", but the named primary artery — the anterior spinal artery — has no record in src/data/structures/vasculature.json (14 records: ICA, VA, BA, ACA, ACom, MCA, PCoA, PCA, SCA, AICA, PICA, lenticulostriate, anterior choroidal, posterior medial choroidal).
- **Expected:** Either (a) accept the vertebral-artery fallback as the atlas's representation and note it, or (b) add a vasc-anterior-spinal-artery record and put "syn-medial-medullary" (and the anterior-spinal-artery clauses of syn-hemimedullary and syn-central-horner) in its supply[]. Option (a) is what the VA record's contextNote already claims ("the anterior spinal artery (ventral medulla) is reported in the PICA record's clinical notes"), which is itself inaccurate — the VA record's clinical[] documents it, not the PICA record's.
- **Basis** (`internal-contradiction`): Internal: enumerating src/data/structures/vasculature.json shows no anterior spinal artery record; the VA record's contextNote asserts the ASA is "reported in the PICA record's clinical notes", but reading vasc-posterior-inferior-cerebellar-artery.clinical[] shows no ASA item (its three syndromes are the lateral medullary syndrome, a PICA cerebellar infarct and a PICA aneurysm). Whether the atlas intends a dedicated ASA record is a design decision this audit cannot settle — hence unverifiable-here rather than wrong.
- **Suggested fix:** Cheapest consistent fix: correct the VA record's contextNote to say the anterior spinal artery is reported in its own clinical notes; or add the vasc-anterior-spinal-artery record if the integrator wants the card's named artery to be clickable.
- **Notes:** Reported as unverifiable-here per the evidence-discipline rule: the card is clinically right, the omission is a registry-coverage question, and I have no basis to declare the data wrong.

### SYN-016 — `syn-hemimedullary` · structures[] · **wrong** / major

- **Claimed:** structures = ["tract-pyramid","tract-medial-lemniscus","nuc-hypoglossal","nuc-spinal-trigeminal","nuc-ambiguus","nuc-dmv","tract-spinothalamic"] — but the presentation asserts two further findings whose structures are absent from the list: "ipsilateral Horner syndrome and ataxia".
- **Expected:** Add "tract-hypothalamospinal" (the structure that causes the Horner syndrome — the same id syn-lateral-medullary uses for its Horner finding, and the id that the PICA record lists in its own territory[]) and "tract-icp" (the ipsilateral limb ataxia, exactly as syn-lateral-medullary lists it) to the structures[] array.
- **Basis** (`internal-contradiction`): Internal contradiction with the sibling card: syn-lateral-medullary — whose deficits the hemimedullary card explicitly combines — lists tract-anterior-spinocerebellar and tract-icp for the ataxia and nuc-medullary-reticular for the Horner syndrome. Both ids exist in the registry (taxonomy: tract-hypothalamospinal "Hypothalamospinal (sympathetic) tract", tract-icp "Inferior cerebellar peduncle") and vasc-posterior-inferior-cerebellar-artery.territory contains both "tract-icp" and "tract-hypothalamospinal", so the artery record that feeds this card already names them.
- **Suggested fix:** Add "tract-hypothalamospinal" and "tract-icp" to syn-hemimedullary.structures (both are valid registry ids; validate:anatomy is unaffected because syndrome structures[] resolve against taxonomy.json, not against authored structure records).
- **Notes:** This is the 'card missing the structure that causes the cardinal sign' defect class named in the brief: the card states Horner syndrome and ataxia but its structures[] cannot produce either.

## 4. What was checked and passed (so the integrator does not re-do it)

### Every structure id named by a card resolves in taxonomy.json

- **Result:** PASS — all 58 distinct ids referenced by the 26 cards exist in taxonomy.json (248 ids).
- **Note:** tract-anterior-spinocerebellar, tract-spinothalamic, tract-corticospinal-lateral, tract-corticobulbar, tract-mlf and tract-hypothalamospinal have no record under src/data/structures/*.json because they are authored in src/data/tracts.json (23 records) — they are NOT dangling references. The validator resolves syndrome structures[] against the taxonomy registry (scripts/validate-data.mjs line 821 comment and validateSyndrome).

### Card-id duplicates / near-duplicate cards

- **Result:** PASS — 26 unique ids across the 3 files, no duplicate id.
- **Note:** Two clinically overlapping pairs exist and were reviewed, not filed as defects: syn-parinaud vs syn-pineal-region (same dorsal-midbrain syndrome, one idiopathic/ischemic, one tumor — the distinction is real and stated in both cards' cause), and syn-weber vs syn-benedikt vs syn-claude (adjacent midbrain lesions distinguished by the red nucleus / dentatorubrothalamic involvement, as each card's cause states). syn-hemimedullary is by construction the union of syn-medial-medullary and syn-lateral-medullary and says so.

### Artery ↔ syndrome link reciprocity, both directions

- **Result:** 3 one-sided card→artery links (SYN-007…009), 11 artery→card links contradicted by the card (SYN-001, SYN-002, SYN-010, SYN-011, SYN-012; roll-up SYN-013).
- **Note:** Method: card side parsed from vascularTerritory with case-insensitive ASCII-boundary token matching; artery side read from supply[]; then src/data/load.ts syndromesBySupply/arteriesForSyndrome read to confirm the wrong links are actually rendered.

### Eponyms vs modern names

- **Result:** All eponyms verified as the names in current use; one duplicate eponym pair (SYN-014).
- **Note:** Wallenberg (lateral medullary), Déjerine (medial medullary / anterior bulbar), Reinhold (hemimedullary), Millard-Gubler, Foville, Weber, Benedikt, Claude, Nothnagel, Parinaud, Lhermitte (peduncular hallucinosis), Déjérine-Roussy (thalamogeniculate) are all standard. Wernicke-Korsakoff, Parkinson's disease, central pontine myelinolysis/osmotic demyelination syndrome and lateral pontine (AICA) syndrome are the modern labels and are used correctly; the atlas's older alternatives ("paralysis agitans" for Parkinson's, "AICA syndrome" for lateral pontine) are flagged as descriptors, not errors.

### Laterality / crossed-ness of every stated deficit

- **Result:** All 26 cards state crossed and uncrossed findings on the correct side except syn-foville (SYN-003).
- **Note:** Verified per card: lateral medullary (ipsilateral face / contralateral body — correct), medial medullary (ipsilateral tongue / contralateral body — correct, tongue deviates toward the lesion per nuc-hypoglossal's own entry), hemimedullary, Millard-Gubler, Foville, Weber, Benedikt (contralateral involuntary movements), Claude (contralateral ataxia), Nothnagel (ipsilateral CN III + ipsilateral ataxia — the classical description), one-and-a-half (gaze away from the lesion), INO, lateral pontine, cerebellar (ipsilateral because cerebellar output double-crosses), Déjérine-Roussy (contralateral), Percheron (bilateral), tuberothalamic (left/right-specific neuropsychology), hemiballismus (contralateral), Horner (ipsilateral), peduncular hallucinosis (no lateralizing claim), CPM and locked-in (bilateral).

### Presentation vs the card's own structures[] for cause-of-cardinal-sign coverage

- **Result:** One defect (SYN-016, syn-hemimedullary Horner + ataxia with no sympathetic or peduncular structure listed).
- **Note:** Two further coverage gaps reviewed and NOT filed: syn-lateral-medullary's vertigo is attributed in the presentation to the "vestibular territory" without listing a vestibular nucleus (the neighbouring nuc-vestibular-medial/-inferior records and the syndrome's ICP entry both document the mechanism, so the omission is not a false claim), and syn-percheron's vertical gaze palsy arises from the rostral midbrain, which its structures[] does not list (the card's own MRI sentence says "paramedian thalamic and rostral midbrain"). Both are defensible editorial choices; flagged here as observations for the integrator rather than as findings.

### Non-vascular cards

- **Result:** PASS for syn-korsakoff, syn-cpm, syn-pineal-region, syn-parkinson.
- **Note:** All four correctly declare "None …" and are referenced by no artery supply[] entry. syn-parkinson's problem is the reverse direction (an artery claims it) and is filed as SYN-001.

## 5. Cards audited clean (no finding filed)

`syn-dejerine-roussy` · `syn-percheron` · `syn-tuberothalamic` · `syn-korsakoff` · `syn-pineal-region` · `syn-hemiballismus` · `syn-locked-in` · `syn-cpm` · `syn-lateral-pontine` · `syn-one-and-a-half` · `syn-benedikt` · `syn-claude` · `syn-nothnagel` · `syn-parkinson` · `syn-peduncular-hallucinosis`

Two clinically overlapping pairs were reviewed and deliberately **not** filed as duplicates or defects: `syn-parinaud` vs `syn-pineal-region` (the same dorsal-midbrain syndrome, but one card is the ischemic/idiopathic form and the other the pineal-region mass — both cards state the distinction), and `syn-weber` / `syn-benedikt` / `syn-claude` (adjacent midbrain lesions separated by red-nucleus and dentatorubrothalamic involvement, as each card's `cause` states). `syn-hemimedullary` is by construction the union of the medial and lateral medullary cards and says so.

## 6. Method and evidence discipline

1. **Read the data, not the prose.** All 26 cards were read from `src/data/syndromes/*.json`; every id they name was resolved against `taxonomy.json`, `tracts.json` and the 225 authored structure records, and each resolved record's own `function`/`connections`/`clinical[]` fields were read to test the card against the rest of the atlas.
2. **Both link directions were computed, not eyeballed.** Card side: each `vascularTerritory` string was scanned for artery names (case-insensitive, with ASCII-boundary lookarounds — JavaScript `\b` is ASCII-only and silently fails after the non-ASCII dashes these strings contain). Artery side: each vessel's `supply[]` was read directly. The two sets were then compared, and `src/data/load.ts` (`syndromesBySupply`, `arteriesForSyndrome`) was read to confirm that a wrong `supply[]` entry is actually rendered as a causal link in the UI — which is why SYN-001/SYN-002 are critical rather than cosmetic.
3. **Every verdict carries a named basis** and one of four `basisKind` values: `internal-contradiction` (another record, another card, or the card's own prose), `external-source` (a URL, marked as external), `nomenclature` (Terminologia Anatomica / naming convention), `own-anatomical-knowledge`. Nothing below is filed as `wrong` on a hunch: where the atlas is clinically right but a registry or design question is open, the row is `unverifiable-here` (SYN-015) and proposes no invented change.
4. **External sources used** (all marked *external* in the JSON): StatPearls *Millard-Gubler Syndrome* <https://www.ncbi.nlm.nih.gov/books/NBK532907/>, StatPearls *Foville Syndrome* <https://www.ncbi.nlm.nih.gov/books/NBK544268/> and <https://europepmc.org/books/nbk544268>, StatPearls *Lateral Medullary Syndrome (Wallenberg Syndrome)* <https://www.ncbi.nlm.nih.gov/books/NBK551670/>, StatPearls *Parinaud Syndrome* <https://www.ncbi.nlm.nih.gov/books/NBK441892/>, StatPearls *Weber Syndrome* <https://www.ncbi.nlm.nih.gov/books/NBK559158/>, Radiopaedia *Weber syndrome* <https://radiopaedia.org/articles/weber-syndrome>, *Vascular Syndromes of the Thalamus*, Stroke <https://www.ahajournals.org/doi/10.1161/01.str.0000087786.38997.9e>, and *Neuro-ophthalmic Manifestations of Wernicke Encephalopathy* <https://pmc.ncbi.nlm.nih.gov/articles/PMC7335288/>.
5. **No contradiction with the frozen geometry.** No finding asks for a different mesh, a moved `origin3d`/`size3d`, or any change below y = +45; every `suggestedFix` is either a text edit inside a syndrome card or an entry in a vessel record's `supply[]`.
6. **Not run here (orchestrator-owned).** Chrome cannot run in this sandbox, so `verify:acceptance` and `verify:audit` were not claimed. `npm run validate` (the contract for this task) was run and passes 0 errors / 0 warnings against the unmodified data — this task writes only the two files under `docs/audit/v15/`.
