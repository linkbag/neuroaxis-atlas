# Residual scientific content audit — 2026-10-05

## Scope and result

Starting from the deployed MRI/CT/Simulated release
`7baa2d63d2e01dc0f36bd94a49abfa2812287d0b`, every current authored record was
assigned for rereading: **311 structure/tract records, 26 syndrome cards,
19 pathways and 15 authored plates**. The supplied Blumenfeld **second edition
(2010)** was the main reference. Proposed changes were cross-checked against
primary research, official anatomical terminology or university teaching material.
The ledgers below contain individual sources, original text, proposals and retained decisions.

Supported corrections or clarifications affect **44 structure/tract records, one
pathway and ten SVG plates**. No additional supported changes to syndrome cards or
ventricular/CSF records were identified. This means no substantiated residual error
was found in those records in this pass; it does not certify completeness or accuracy.

**No numerical structure/tract geometry was changed.** Image-registration transforms
and published MRI/CT limitations remain in effect. Plate changes address orientation
cues and clearly misleading overlays rather than deriving new tissue contours.

## Material findings

| Area | Supported changes | Evidence and limits |
| --- | --- | --- |
| Brainstem and diencephalon | Correct mesencephalic trigeminal afferent wording and corticopontine/corticobulbar relationships; qualify red-nuclear relay, delayed olivary degeneration, clinical lesion patterns, LGN necessity, hypothalamic rhythm claims and habenular circuitry. Correct tuberothalamic origin to PCoA and qualify optic-chiasm pial supply. | [24 findings and 158 assessments](brainstem.json), including all 26 syndromes. Clinical signs vary with lesion extent and individual anatomy. Animal physiology is not asserted as a necessary human mechanism. |
| Telencephalon and cortical terminology | Remove dentate “CA5” identity and S1 “hand knob” alias; qualify IFG-part synonyms and FEF location; correct the FEF figure citation. Show six hippocampal records as cortical tissue in selection details. | [95 assessments and six direct field changes](telencephalon.json). [Official FIPAT terminology](https://cdn.dal.ca/content/dam/dalhousie/pdf/library/FIPAT/TNA/FIPAT-TNA-Ch1.pdf), [motor hand landmark study](https://pubmed.ncbi.nlm.nih.gov/9055804/) and [human FEF mapping](https://pubmed.ncbi.nlm.nih.gov/11702871/). Landmarks vary; cortical coordinates remain schematic. |
| Paired anatomy | Trochlear and hypoglossal nuclei and the thalamic internal medullary lamina are labelled anatomically paired, with their central drawing proxy disclosed. | Mirroring and geometry are preserved; labels do not imply validated bilateral positions or dimensions. |
| Vasculature | Distinguish whole arteries from branches; remove anterior choroidal as an MCA efferent; put vertebral muscular/radicular branches downstream; separate M2 insular from M3 opercular course. Correct thalamogeniculate penetration, qualify PCA temporal origins, broaden medial striate beyond Heubner, and remove unsupported distal cerebellar syndrome mappings and physical-calibre claims. | [61 vascular/CSF assessments and ten finding groups](vascular-csf.json). [Primary thalamogeniculate microanatomy](https://pubmed.ncbi.nlm.nih.gov/2034346/) and vessel-specific sources in the ledger. Individual branch counts and territories are not certified. |
| Tracts and language pathway | Remove whole-SLF identity alias for an arcuate component; make the clickable arcuate step dorsal only and disclose the separate ventral contribution. Qualify auditory tonotopy and broaden spinoreticular origins with species limits. | [23 tract and 19 pathway assessments](tracts-pathways-plates.json). [Human SLF study](https://pubmed.ncbi.nlm.nih.gov/15590909/), [human language dual streams](https://pmc.ncbi.nlm.nih.gov/articles/PMC2584675/), [human auditory mapping](https://pmc.ncbi.nlm.nih.gov/articles/PMC4657019/) and [primate spinoreticular tracing](https://pubmed.ncbi.nlm.nih.gov/7096639/). Naming conventions and subnuclear organization vary. |
| Authored plates | Swap reversed A/P markers on two sagittal drawings. Move P above dorsal structures, A below ventral structures and R/L to the sides on six transverse brainstem drawings. Remove an already-crossed lateral CST overlay at the sensory crossing and a rostral sensory-crossing overlay at the pyramidal crossing. Clarify two context captions. | Original textbook figures 14.4–14.5, printed pp. 618–621, were visually inspected; [UTHealth anatomy overview](https://nba.uth.tmc.edu/neuroscience/m/s2/chapter01.html) supports the gross relationships. Every authored plate has a composite teaching-section notice. Shapes and boundaries remain unvalidated. |

## Source identity and method

- Supplied file: *Neuroanatomy through Clinical Cases, Second Edition.pdf*;
  the copyright page confirms second edition, 2010; 1,033 physical PDF pages.
- SHA-256: `0df361fd2ce46e6253a98d03f059b80acb6f27057370ecbff32d55a61e9a8d1c`.
- Main-body printed page `N` is physical PDF page `N + 26` (one-based).
  Both numbers appear in evidence ledgers. Relevant text was read in complete page
  context and selected original figures were rendered for visual inspection.
- Three independent GPT-6.1 Sol Ultra reviewers covered brainstem/diencephalon and
  syndromes, telencephalon, and vascular/CSF. The integrating reviewer covered the
  main tract table, every pathway and authored plate, and application. Each domain
  reviewer independently checked its applied changes and confirmed no numerical
  geometry changes in its domain.
- Public-source support is recorded per proposed correction. Some public articles
  were accessible as indexed abstracts only; conclusions were limited to the
  available evidence. Unchanged statements were assessed primarily against the
  supplied book, rather than being presented as independently re-proven by every
  public source.
- Textbook extracts and rendered pages remain private working material. These
  repository ledgers contain authored assessments and source locators, not a
  redistributed copy of the book.

## What remains approximate

This is an automated, evidence-supported educational review, **not independent
clinician approval, clinical validation or an accuracy certification**. Custom atlas
coordinates, envelopes, fibre trajectories, perforator courses, cortical boundaries,
functional overlays and small-nucleus dimensions remain schematic. A marker is not
an anatomical boundary. Connections and pathways are selected teaching summaries,
not complete connectomes.

Eight previously misleading spatial routes remain withheld. The entire white-matter
shell is not relabelled as internal capsule. Hippocampal cortex shares the nuclei
visibility/colour group but has its anatomical class shown separately. Anatomically
paired structures compressed into central proxies have an explicit geometry note.
Authored SVG plates may combine nearby levels; corrected markers do not make them
validated single anatomical sections.

MRI registration remains approximate, with regional mismatches and incomplete image
data. CT remains provisionally aligned with a fixed brain window (−20 to 100 HU),
not raw HU or a true bone window. MRI and CT are from different people. This pass
did not repeat or certify quantitative registration. See the
[existing registration methods and limits](../2026-10-04-registration-candidate/README.md).

## Reproducible integration record

- [Complete assignment coverage](coverage.json)
- [Applied field before/after ledger](application.json)
- [Derived change counts and IDs](summary.json)
- [Build, browser and deployment verification](VERIFICATION.md)

`npm run verify:scientific` checks coverage, selected corrected relationships,
taxonomy labels and plate-marker regressions. These are integration checks;
passing them does not establish scientific accuracy.
