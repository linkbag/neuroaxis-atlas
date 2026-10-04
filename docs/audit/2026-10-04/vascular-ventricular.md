# Vascular and lateral-ventricular content audit — 2026-10-04

53 vascular and 8 lateral-ventricular records; every stored field inspected. Separate geometry ledger covers all structure coordinates, courses and GLB linkage. This is a scientific content correction and evidence ledger, not an independent clinical peer review or validation of spatial fidelity.

## Evidence and limits

Haines **8th edition (2012)** and Blumenfeld **2nd edition (2010)** were checked from the supplied PDFs. Main-text physical PDF page = printed page +14 (Haines) or +26 (Blumenfeld). Textbook figures were inspected in scratch; no source images are distributed in the app. Exact 3D locations, shapes, branch calibres and spatial registration remain **unvalidated schematic display values**. The JSON ledger contains each field, original text, corrected text, reason and source IDs.

## Principal corrections

- Hippocampal sclerosis may enlarge the ipsilateral temporal horn with hippocampal atrophy; the earlier narrowing claim was reversed.
- Ventricular cavities are CSF spaces; their walls and plexus have arterial supply. Venous drainage and CSF communication are separate.
- Medial and lateral posterior choroidal groups are distinguished; the medial record cannot represent both. The duplicated runtime route needs integration review.
- Upper calcarine/cuneal cortex represents the inferior visual field. Angular/inferior-parietal injury is distinguished from occipital-splenial pure alexia.
- V1 vertebral segment is preforaminal; Heubner origin and fetal-PCA flow are corrected and vascular variants acknowledged.
- Labyrinthine artery supplies inner ear/associated nerves, not cochlear/vestibular nuclei; PICA plexus supply is fourth-ventricular.
- SCA medial cortical territory is distinguished from PCA dorsal-midbrain territory. Occlusion is not tied to an inevitable full named syndrome.
- Blanket vessel-wall vasa-vasorum claims and whole-structure territory assumptions were removed.
- Numbered perforators are illustrative routes, not established fixed human branch counts/subterritories.
- 12 trunk display anchors now match their own mesh centroids; M2 return-to-origin and consecutive duplicate controls are cleaned without adding coordinates.

## Record coverage

### Internal carotid artery (`vasc-internal-carotid-artery`)

Reviewed Internal carotid artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,connections,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Vertebral artery (`vasc-vertebral-artery`)

Reviewed Vertebral artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,clinical,territory,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Basilar artery (`vasc-basilar-artery`)

Reviewed Basilar artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Anterior cerebral artery (`vasc-anterior-cerebral-artery`)

Reviewed Anterior cerebral artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,connections,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Anterior communicating artery (`vasc-anterior-communicating-artery`)

Reviewed Anterior communicating artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,territory,connections,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Middle cerebral artery (`vasc-middle-cerebral-artery`)

Reviewed Middle cerebral artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Posterior communicating artery (`vasc-posterior-communicating-artery`)

Reviewed Posterior communicating artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,connections,territory,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Posterior cerebral artery (`vasc-posterior-cerebral-artery`)

Reviewed Posterior cerebral artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,territory,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Superior cerebellar artery (`vasc-superior-cerebellar-artery`)

Reviewed Superior cerebellar artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,territory,supply,connections,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Anterior inferior cerebellar artery (`vasc-anterior-inferior-cerebellar-artery`)

Reviewed Anterior inferior cerebellar artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,territory,supply,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Posterior inferior cerebellar artery (`vasc-posterior-inferior-cerebellar-artery`)

Reviewed Posterior inferior cerebellar artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,territory,supply,connections,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Lenticulostriate arteries (`vasc-lenticulostriate-arteries`)

Reviewed Lenticulostriate arteries against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

### Anterior choroidal artery (`vasc-anterior-choroidal-artery`)

Reviewed Anterior choroidal artery parent inflow, named branches, variable partial territory, adjacent structures and clinical localization. Metadata anchor changed only to its own committed mesh centroid; exact anatomy unvalidated.

Fields changed: function,bloodSupply,territory,clinical,contextNote,origin3d,refs. All remaining fields are individually assessed in the JSON ledger.

### Medial posterior choroidal artery (`vasc-posterior-medial-choroidal-artery`)

Reviewed Medial posterior choroidal artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: name,synonyms,function,bloodSupply,territory,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

**Open geometry issue:** Unresolved duplicated runtime course currently follows a lateral atrial plexus route while this record now distinguishes medial third-ventricular from lateral posterior choroidal supply. Root notified to relabel/split/suppress conflicting route.

### Lateral lenticulostriate artery 1 (putamen, antero-superior) (`vasc-lateral-lenticulostriate-arteries-1`)

Reviewed Lateral lenticulostriate artery 1 (putamen, antero-superior) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Lateral lenticulostriate artery 2 (putamen, middle) (`vasc-lateral-lenticulostriate-arteries-2`)

Reviewed Lateral lenticulostriate artery 2 (putamen, middle) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Lateral lenticulostriate artery 3 (putamen, postero-inferior) (`vasc-lateral-lenticulostriate-arteries-3`)

Reviewed Lateral lenticulostriate artery 3 (putamen, postero-inferior) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Lateral lenticulostriate artery 4 (putamen, lateral) (`vasc-lateral-lenticulostriate-arteries-4`)

Reviewed Lateral lenticulostriate artery 4 (putamen, lateral) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Recurrent artery of Heubner 1 (caudate head, anterior) (`vasc-medial-lenticulostriate-arteries-1`)

Reviewed Recurrent artery of Heubner 1 (caudate head, anterior) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Recurrent artery of Heubner 2 (caudate head, posterior) (`vasc-medial-lenticulostriate-arteries-2`)

Reviewed Recurrent artery of Heubner 2 (caudate head, posterior) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA insular segment (M2) (`vasc-mca-insular-segment`)

Reviewed MCA insular segment (M2) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA superior (cortical) terminal branch (`vasc-mca-superior-terminal-branch`)

Reviewed MCA superior (cortical) terminal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA inferior (cortical) terminal branch (`vasc-mca-inferior-terminal-branch`)

Reviewed MCA inferior (cortical) terminal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA branch to the angular gyrus (`vasc-mca-angular-branch`)

Reviewed MCA branch to the angular gyrus against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA middle temporal branch (`vasc-mca-middle-temporal-branch`)

Reviewed MCA middle temporal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA posterior temporal branch (`vasc-mca-posterior-temporal-branch`)

Reviewed MCA posterior temporal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA temporo-occipital branch (`vasc-mca-temporo-occipital-branch`)

Reviewed MCA temporo-occipital branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA M4 prefrontal branch (`vasc-mca-m4-prefrontal-branch`)

Reviewed MCA M4 prefrontal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### MCA M4 precentral branch (`vasc-mca-m4-precentral-branch`)

Reviewed MCA M4 precentral branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

**Open geometry issue:** Unresolved: terminal z is substantially anterior to the authored motor-strip landmarks. Source-backed surface landmarks are needed before moving the course.

### MCA M4 central (rolandic) branch (`vasc-mca-m4-central-branch`)

Reviewed MCA M4 central (rolandic) branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

**Open geometry issue:** Unresolved: terminal z is substantially anterior to the authored sensorimotor-strip landmarks. Course endpoint must not be used as an exact cortex localization.

### MCA M4 anterior parietal branch (`vasc-mca-m4-anterior-parietal-branch`)

Reviewed MCA M4 anterior parietal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Pericallosal artery (A2–A3) (`vasc-aca-pericallosal-artery`)

Reviewed Pericallosal artery (A2–A3) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Callosomarginal artery (A3) (`vasc-aca-callosomarginal-artery`)

Reviewed Callosomarginal artery (A3) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Frontopolar artery (A2) (`vasc-aca-frontopolar-artery`)

Reviewed Frontopolar artery (A2) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### ACA orbitofrontal branch (`vasc-aca-orbitofrontal-artery`)

Reviewed ACA orbitofrontal branch against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Parieto-occipital artery (P4) (`vasc-pca-parieto-occipital-artery`)

Reviewed Parieto-occipital artery (P4) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Calcarine artery (P4) (`vasc-pca-calcarine-artery`)

Reviewed Calcarine artery (P4) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Posterior temporal branches of the PCA (`vasc-pca-posterior-temporal-branches`)

Reviewed Posterior temporal branches of the PCA against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

**Open geometry issue:** Unresolved relative to anterior-temporal branch: branch terminal order is inverted in the model; named tissue territory does not validate stored controls.

### Anterior temporal branches of the PCA (`vasc-pca-anterior-temporal-branches`)

Reviewed Anterior temporal branches of the PCA against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

**Open geometry issue:** Unresolved: terminal z=-44.242 is posterior to posterior-temporal branch terminal z=-40.318; this contradicts ordinal branch naming in this model. Requires source-landmark placement review. No new coordinates invented.

### Middle temporal branches of the PCA (`vasc-pca-middle-temporal-branches`)

Reviewed Middle temporal branches of the PCA against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Splenial artery (`vasc-pca-splenial-artery`)

Reviewed Splenial artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Thalamogeniculate arteries (`vasc-pca-thalamogeniculate-arteries`)

Reviewed Thalamogeniculate arteries against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Posteromedial central (thalamoperforating) branches (`vasc-pca-posteromedial-central-branches`)

Reviewed Posteromedial central (thalamoperforating) branches against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,supply,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Pontine perforating arteries (`vasc-pontine-perforating-arteries`)

Reviewed Pontine perforating arteries against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Lateral branch of the superior cerebellar artery (`vasc-sca-lateral-branch`)

Reviewed Lateral branch of the superior cerebellar artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Medial branch of the superior cerebellar artery (`vasc-sca-medial-branch`)

Reviewed Medial branch of the superior cerebellar artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,supply,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Vermian branches of the superior cerebellar artery (`vasc-sca-vermian-branches`)

Reviewed Vermian branches of the superior cerebellar artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Labyrinthine (internal auditory) artery (`vasc-aica-labyrinthine-artery`)

Reviewed Labyrinthine (internal auditory) artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,supply,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### PICA tonsillomedullary segment (`vasc-pica-tonsillomedullary-segment`)

Reviewed PICA tonsillomedullary segment against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### PICA telovelotonsillar segment (`vasc-pica-telovelotonsillar-segment`)

Reviewed PICA telovelotonsillar segment against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Anterior spinal artery (`vasc-anterior-spinal-artery`)

Reviewed Anterior spinal artery against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Lateral lenticulostriate arteries (`vasc-lateral-lenticulostriate-arteries`)

Reviewed Lateral lenticulostriate arteries against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,territory,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Medial lenticulostriate arteries (recurrent artery of Heubner) (`vasc-medial-lenticulostriate-arteries`)

Reviewed Medial lenticulostriate arteries (recurrent artery of Heubner) against its parent branch/territory and actual supplied structures. Surface/perforator paths and numbered branches are schematic, with clinical claims qualified by actual lesion extent.

Fields changed: contextNote,function,bloodSupply,connections,clinical,vesselCourse,refs. All remaining fields are individually assessed in the JSON ledger.

### Lateral ventricle (`vent-lateral-ventricle`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,refs. All remaining fields are individually assessed in the JSON ledger.

### Frontal horn of the lateral ventricle (`vent-lateral-ventricle-frontal-horn`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

### Temporal horn of the lateral ventricle (`vent-lateral-ventricle-temporal-horn`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

### Occipital horn of the lateral ventricle (`vent-lateral-ventricle-occipital-horn`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

### Atrium of the lateral ventricle (`vent-lateral-ventricle-atrium`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

### Choroid plexus of the lateral ventricle (`vent-choroid-plexus-lateral`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,refs. All remaining fields are individually assessed in the JSON ledger.

### Interventricular foramen (`vent-interventricular-foramen`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

### Body of the lateral ventricle (`vent-lateral-ventricle-body`)

Reviewed CSF-space topology, neighbouring wall/plexus relationships, obstruction level, tissue-versus-cavity perfusion and nonspecific imaging signs against Haines p66 fig4-10 and Blumenfeld pp132-137/155-158. Original MRI/tumor studies added where relevant.

Fields changed: function,bloodSupply,connections,clinical,contextNote,refs. All remaining fields are individually assessed in the JSON ledger.

## Coverage gaps

- Cerebral venous sinuses/deep veins are described in text but not represented as vessel records. A complete vasculature atlas would require a reviewed venous dataset.
- No dedicated lateral posterior choroidal artery record/course yet; the medial record now explicitly distinguishes the lateral group.
- Schematic courses/ellipsoids and source meshes are not independently segmented or spatially registered to the MRI. Segment cut planes and shared whole-structure meshes do not validate subdivisions.
- Vascular territories vary and overlap; arrows/links cannot specify an individual arterial infarct boundary.

## Sources

- **B-circle**: Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010); printed pp. 393-394; physical PDF pages [419, 420].
- **B-cerebral**: Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010); printed pp. 395-402, 406; physical PDF pages [421, 422, 423, 424, 425, 426, 427, 428, 432].
- **B-brainstem**: Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010); printed pp. 648-653, 656-660; physical PDF pages [674, 675, 676, 677, 678, 679, 682, 683, 684, 685, 686].
- **B-ventricles**: Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010); printed pp. 132-137, 155-158, 215-216; physical PDF pages [158, 159, 160, 161, 162, 163, 181, 182, 183, 184, 241, 242].
- **B-vision**: Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010); printed pp. 474-475; physical PDF pages [500, 501].
- **B-language**: Blumenfeld, Neuroanatomy through Clinical Cases, 2nd ed. (2010); printed pp. 894-896; physical PDF pages [920, 921, 922].
- **H-vessels**: Haines, Neuroanatomy: An Atlas of Structures, Sections, and Systems, 8th ed. (2012); printed pp. 17, 19, 23-25, 27, 29, 33, 35; physical PDF pages [31, 33, 37, 38, 39, 41, 43, 47, 49].
- **H-ventricles**: Haines, Neuroanatomy: An Atlas of Structures, Sections, and Systems, 8th ed. (2012); printed pp. 66-69; physical PDF pages [80, 81, 82, 83].
- **W-heubner**: Gomes et al., Microsurgical anatomy of the recurrent artery of Heubner (1984), original cadaveric study; https://pubmed.ncbi.nlm.nih.gov/6689705/.
- **W-hs**: Meiners et al., Temporal lobe epilepsy: the various MR appearances of histologically proven mesial temporal sclerosis (1994), original MRI-pathology study; https://pubmed.ncbi.nlm.nih.gov/7985576/.
- **W-neurocytoma**: Kerkeni et al., Central neurocytoma: Study of 32 cases (2010); https://pubmed.ncbi.nlm.nih.gov/20692674/.
- **W-pch**: Microsurgical anatomy of the lateral posterior choroidal artery (2021), original cadaveric study; https://pubmed.ncbi.nlm.nih.gov/33836500/.
- **W-wall**: Aydin, Do human intracranial arteries lack vasa vasorum? (1998), comparative human histology; https://pubmed.ncbi.nlm.nih.gov/9678510/.
- **W-pica**: Lister et al., Microsurgical anatomy of the posterior inferior cerebellar artery (1982), original cadaveric study; https://pubmed.ncbi.nlm.nih.gov/7070615/.
- **W-nph**: Nakajima et al., Guidelines for Management of Idiopathic Normal Pressure Hydrocephalus, 3rd ed. (2021), Japanese Society of Normal Pressure Hydrocephalus; https://pmc.ncbi.nlm.nih.gov/articles/PMC7905302/.
- **G-model**: Current committed model: src/assets/anatomy/anatomy-manifest.json and src/geometry/anatomyAssets.ts.

## Final terminology pass

Numbered lateral/medial striate vessel records are explicitly named illustrative routes; old antero-superior/middle/postero-inferior labels implied reproducible arterial subterritories. SCA medial branch no longer has a tectal-branch alias. PICA telovelotonsillar no longer has a supravermian alias. Ventricular atrium is distinct from the collateral trigone eminence in its floor. Exact changes are appended to the field ledger.
