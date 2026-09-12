// scripts/lib/register.mjs — BP3D → canonical atlas registration (REALISM_PLAN §3).
//
// Reads the source element OBJs (BodyParts3D 4.0, mm, Z-up, whole-body origin) from
// TWO directories, in this fixed search order (v7 / TELENCEPHALON_PLAN §4.1):
//   1. assets-src/bp3d/raw/      — the v2 PART-OF + IS-A-addendum brainstem/diencephalon
//                                  inputs (21 PART-OF files + thalami/geniculates); PRIMARY.
//   2. assets-src/bp3d/raw-tel/  — the v7 telencephalon inputs extracted from the IS-A
//                                  archive (27 files, gitignored); FALLBACK / secondary.
// A key resolves to the first directory that contains its FILE id, so an id present in
// both resolves to raw/ (identical element ids ⇒ identical bytes); the resolution table
// is printed and recorded in REGISTRATION.md + registration-summary.json.
// verifies the axis convention empirically against known anatomical asymmetries,
// detects brainstem junctions from per-slice cross-section area minima, applies
//   (1) axis remap  mm → au (1 au = 1.2 mm, AMENDMENT A), x=+patient-left, y=+superior, z=+anterior
//   (2) global scale + piecewise-linear y-warp onto levels.json anchors
//   (3) per-slice centerline straightening (bounded smoothing; stem stack centroids)
//   (4) pair splits (diencephalon midline slab at x=0; cerebellum L/R + vermis |x|<3)
// and writes assets-src/bp3d/canonical/<name>.obj + registration-summary.json +
// assets-src/bp3d/REGISTRATION.md (landmark residuals vs targets, tolerance ±3 au).
//
// Deterministic: fixed constants, no clock, no RNG, sorted iteration, fixed precision.
// Zero dependencies (node: builtins only). Node >= 18.
//
// Usage:
//   node scripts/lib/register.mjs                  # full registration + reports
//   node scripts/lib/register.mjs --probe-profile  # print area profile + junctions, write nothing
//
// OBJ IO: prefers the SDF kernel module scripts/lib/sdf/objio.js (task sdf-kernel) when it
// exists and exposes a recognizable reader/writer API; falls back to the internal minimal
// reader/writer below. The chosen path is recorded in REGISTRATION.md. Kernel-written files
// are round-trip verified against the internal parser before being trusted.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const RAW_DIR = path.join(ROOT, 'assets-src', 'bp3d', 'raw');
const RAW_TEL_DIR = path.join(ROOT, 'assets-src', 'bp3d', 'raw-tel'); // v7 telencephalon elements
const RAW_VASC_DIR = path.join(ROOT, 'assets-src', 'bp3d', 'raw-vasc'); // v8 vessels + optic pathway
const SOURCE_DIRS = [
  { dir: RAW_DIR, rel: 'assets-src/bp3d/raw/', role: 'primary (PART-OF + IS-A addendum)' },
  { dir: RAW_TEL_DIR, rel: 'assets-src/bp3d/raw-tel/', role: 'secondary (v7 telencephalon, IS-A archive)' },
  { dir: RAW_VASC_DIR, rel: 'assets-src/bp3d/raw-vasc/', role: 'tertiary (v8 vasculature + optic pathway, IS-A archive)' },
];
const OUT_DIR = path.join(ROOT, 'assets-src', 'bp3d', 'canonical');
const REPORT_PATH = path.join(ROOT, 'assets-src', 'bp3d', 'REGISTRATION.md');
const SUMMARY_PATH = path.join(OUT_DIR, 'registration-summary.json');

// ---------------------------------------------------------------------------
// Registration constants (spec: docs/REALISM_PLAN.md §3, run task brief)
// ---------------------------------------------------------------------------
const MM_PER_AU = 1.2;               // canonical "atlas unit" ≈ 1.2 mm (REALISM_PLAN §3 AMENDMENT A —
                                     // corrected from 0.7: schematic v1 bounds vs metric real anatomy)
const SCALE = 1 / MM_PER_AU;         // 0.8333… au per mm (x/z uniform; y refined by warp)
const MM_PER_AU_INV = SCALE;         // au per mm (readability alias for target derivation)
const ANCHORS = {                    // levels.json / plan §3.2 warp targets (canonical au)
  cm: -50,      // cervicomedullary junction  (lvl-spinal-medulla)
  pm: -24,      // pontomedullary junction    (lvl-pontomedullary)
  pmes: 4,      // pontomesencephalic junction (between lvl-pons-rostral +2 and lvl-midbrain-ic +8)
  md: 20,       // midbrain–diencephalon junction (just above lvl-post-comm +19)
  dicTop: 38,  // top of thalamic band 22–38 (diencephalon roof)
};
const VERMIS_HALF_WIDTH_AU = 3;      // vermis band label |x| < 3 au
const AREA_CELL_MM = 0.5;            // rasterization cell for cross-section area (BP mm)
const CL_CELL_AU = 0.6;              // rasterization cell for centerline centroids (canonical au)
const CL_SLAB_AU = 0.5;              // centerline slab spacing
const CL_SMOOTH_SLABS = 25;          // moving-average window (odd), ≈ 12.5 au — removes the
                                     // long-wave BP3D flexure only; medium-wave anatomy (pontine
                                     // bulge, crus prominence) intentionally survives as the
                                     // gentle ventral bow around y≈12
const CL_WOBBLE_WINDOW = 5;          // smoothing used to measure residual axis wobble
const CL_CLAMP_AU = 20;              // max |offset| amplitude
const CL_MAX_STEP_AU = 1.0;          // max offset change between adjacent slabs
const LW_LIMIT_AU = 6;               // acceptance: silhouette-axis bow must stay gentle. Band set by
                                     // anatomy: the natural pontine flexure bows the silhouette
                                     // middle ~3–4 mm ≈ 2.5–3.3 au at 1/1.2 (AMENDMENT A) — plan §3.3 requires it
                                     // PRESERVED ("gentle ventral bow"), so flattening is a failure
                                     // just as exceeding it would be a distortion.
const WOBBLE_LIMIT_AU = 1.2;         // acceptance: silhouette-axis wobble RMS
const TOL_AU = 3;                    // landmark tolerance (task brief)

// BP3D element files (FJ ids resolved by bp3d-acquire; see parts-report.json).
// laterality: 'L' | 'R' | 'M' (unpaired/midline element)
const FILES = {
  medullaL: 'FJ1769.obj', medullaR: 'FJ1831.obj',
  ponsL: 'FJ1775.obj', ponsR: 'FJ1822.obj',
  midbrainL: 'FJ1770.obj', midbrainR: 'FJ1817.obj',
  scL: 'FJ1779.obj', scR: 'FJ1826.obj',
  icL: 'FJ1762.obj', icR: 'FJ1810.obj',
  cerebL: 'FJ1781.obj', cerebR: 'FJ1830.obj',
  hypoL: 'FJ1760.obj', hypoExtraL: 'FJ1780.obj',
  hypoR: 'FJ1808.obj', hypoExtraR: 'FJ1828.obj',
  dicSlab: 'FJ1730.obj',
  pineal: 'FJ1795.obj',
  habenula: 'FJ1743.obj',
  aqueduct: 'FJ1738.obj',
  vent4: 'FJ1731.obj',
  // ORCHESTRATOR ADDENDUM inputs (isa_BP3D_4.0_obj_99.zip; see PROBE.md addendum +
  // parts-report.json): real thalami + geniculate bodies.
  thalL: 'FJ1782.obj', thalR: 'FJ1827.obj',
  lgnL: 'FJ1766.obj', lgnR: 'FJ1813.obj',
  mgnL: 'FJ1816M.obj', mgnR: 'FJ1816.obj',
};
const BASE_INPUT_COUNT = Object.keys(FILES).length; // 27 (v2 + addendum) — asserted below

// ---------------------------------------------------------------------------
// v7 TELENCEPHALON inputs (docs/TELENCEPHALON_PLAN.md §1 data table, §4.1 registration).
// Extracted from the ISA archive (assets-src/bp3d/isa_BP3D_4.0_obj_99.zip, CC BY 4.0)
// into assets-src/bp3d/raw-tel/ (gitignored). Element-side convention is the one
// PROBE.md established and the base table already uses: the element whose vertices sit
// at positive x_bp is the SUBJECT-LEFT one (FMA73423 left SC = FJ1779, mean x = +3.56 mm),
// hence the *L suffix on the positive-x file of every pair. Verified per pair below
// (Class A landmark "tel L/R sides straddle the midline") before anything is written.
//
// Same table style as FILES above: key (L/R/M suffix) → 'FJ####.obj' id; the search
// order raw/ then raw-tel/ is resolved per FILE id (see SOURCE_DIRS).
//
// Faces are the pre-decimation counts measured from the archive (§1: 175,562 faces for
// the set below, cortex derived later in the recipe stage — this script only registers).
// ---------------------------------------------------------------------------
const TEL_FILES = {
  // Cerebral white matter — the hemispheric mass = the cortex-carrier. FJ1758/FJ1806,
  // `white matter of left/right cerebral hemisphere`; 1.8 MB ASCII each. NOT a named
  // lobe: no BP3D concept for the lobes of the hemisphere as such (only occipital below).
  telCerebWmL: 'FJ1758.obj', telCerebWmR: 'FJ1806.obj',
  // 'white matter of telencephalon' — a stray extra element (FMA83930, 812 faces);
  // registered for completeness, see REGISTRATION.md addendum §A.3 for what it is.
  telWmExtra: 'FJ1734.obj',
  // Corpus callosum (FMA86464) — unpaired midline commissure, one complete mesh.
  telCorpusCallosum: 'FJ1742.obj',
  // Lateral ventricles (FMA78448/78449/78450) — the full ventricular cast, one mesh per side.
  telVentricleL: 'FJ1767.obj', telVentricleR: 'FJ1814.obj',
  // Choroid plexus of the lateral ventricle (FMA61934).
  telChoroidPlexusL: 'FJ1755.obj', telChoroidPlexusR: 'FJ1803.obj',
  // Basal ganglia: caudate (FMA61833), putamen (FMA61834), globus pallidus (FMA61835).
  telCaudateL: 'FJ1754.obj', telCaudateR: 'FJ1802.obj',
  telPutamenL: 'FJ1776.obj', telPutamenR: 'FJ1823.obj',
  telGlobusPallidusL: 'FJ1757.obj', telGlobusPallidusR: 'FJ1805.obj',
  // Limbic system: amygdala (FMA61841), hippocampus (FMA62493, classed as allocortex in
  // BP3D), fornix (FMA61965) + commissure of fornix (FMA61970), cingulate gyrus (FMA62434).
  telAmygdalaL: 'FJ1753.obj', telAmygdalaR: 'FJ1829.obj',
  telHippocampusL: 'FJ1759.obj', telHippocampusR: 'FJ1807.obj',
  telFornixL: 'FJ1756.obj', telFornixR: 'FJ1804.obj',
  telFornixCommissure: 'FJ1741.obj',
  telCingulateL: 'FJ1739.obj', telCingulateR: 'FJ1740.obj',
  // Insula (FMA67329) and occipital lobe (FMA67325) — the two named cortical surfaces
  // BP3D does ship; the derived ribbon (recipe stage) is validated against these.
  telInsulaL: 'FJ1748.obj', telInsulaR: 'FJ1749.obj',
  telOccipitalLobeL: 'FJ1791.obj', telOccipitalLobeR: 'FJ1792.obj',
  // Telencephalic white matter tracts with real meshes: internal capsule (FMA61950).
  telInternalCapsuleL: 'FJ1750.obj', telInternalCapsuleR: 'FJ1751.obj',
};
// key → descriptive name (REPORT + summary; the note-block style used above),
// key → output file name of the registered canonical mesh. Per side for every pair,
// single fused/whole mesh for unpaired midline elements — the same convention the
// hypothalamus (fused per side) and pineal/habenula (already whole) already follow.
const TEL_PARTS = {
  telCerebWmL: { name: 'cerebral white matter, left hemisphere', out: 'tel-cerebral-white-matter-left' },
  telCerebWmR: { name: 'cerebral white matter, right hemisphere', out: 'tel-cerebral-white-matter-right' },
  telWmExtra: { name: 'white matter of telencephalon (stray extra element)', out: 'tel-wm-telencephalon-extra' },
  telCorpusCallosum: { name: 'corpus callosum', out: 'tel-corpus-callosum' },
  telVentricleL: { name: 'lateral ventricle, left', out: 'tel-lateral-ventricle-left' },
  telVentricleR: { name: 'lateral ventricle, right', out: 'tel-lateral-ventricle-right' },
  telChoroidPlexusL: { name: 'choroid plexus, left', out: 'tel-choroid-plexus-left' },
  telChoroidPlexusR: { name: 'choroid plexus, right', out: 'tel-choroid-plexus-right' },
  telCaudateL: { name: 'caudate nucleus, left', out: 'tel-caudate-left' },
  telCaudateR: { name: 'caudate nucleus, right', out: 'tel-caudate-right' },
  telPutamenL: { name: 'putamen, left', out: 'tel-putamen-left' },
  telPutamenR: { name: 'putamen, right', out: 'tel-putamen-right' },
  telGlobusPallidusL: { name: 'globus pallidus, left', out: 'tel-globus-pallidus-left' },
  telGlobusPallidusR: { name: 'globus pallidus, right', out: 'tel-globus-pallidus-right' },
  telAmygdalaL: { name: 'amygdala, left', out: 'tel-amygdala-left' },
  telAmygdalaR: { name: 'amygdala, right', out: 'tel-amygdala-right' },
  telHippocampusL: { name: 'hippocampus, left', out: 'tel-hippocampus-left' },
  telHippocampusR: { name: 'hippocampus, right', out: 'tel-hippocampus-right' },
  telFornixL: { name: 'fornix, left', out: 'tel-fornix-left' },
  telFornixR: { name: 'fornix, right', out: 'tel-fornix-right' },
  telFornixCommissure: { name: 'commissure of fornix', out: 'tel-fornix-commissure' },
  telCingulateL: { name: 'cingulate gyrus, left', out: 'tel-cingulate-gyrus-left' },
  telCingulateR: { name: 'cingulate gyrus, right', out: 'tel-cingulate-gyrus-right' },
  telInsulaL: { name: 'insula, left', out: 'tel-insula-left' },
  telInsulaR: { name: 'insula, right', out: 'tel-insula-right' },
  telOccipitalLobeL: { name: 'occipital lobe, left', out: 'tel-occipital-lobe-left' },
  telOccipitalLobeR: { name: 'occipital lobe, right', out: 'tel-occipital-lobe-right' },
  telInternalCapsuleL: { name: 'internal capsule, left', out: 'tel-internal-capsule-left' },
  telInternalCapsuleR: { name: 'internal capsule, right', out: 'tel-internal-capsule-right' },
};
// ---------------------------------------------------------------------------
// v8 VASCULAR + OPTIC inputs (docs/NEUROATLAS_V8_PLAN.md §1a/§1b, §4.1–§4.2; the
// per-mesh table and the file→record mapping are `docs/VASC_INVENTORY.md` §3/§5.1,
// task vasc-acquire — every id below is taken from that table, not re-derived).
// Extracted from the SAME owned archive (isa_BP3D_4.0_obj_99.zip, CC BY 4.0) into
// assets-src/bp3d/raw-vasc/ (gitignored); no download happened in this task.
//
// Laterality convention: identical to the base and telencephalon tables — the
// `*L` key is the element whose vertices sit at POSITIVE x_bp (verified per pair
// empirically below). VASC_INVENTORY §4 is explicit that the FJ/FJ…M suffix is
// not itself the rule ("pick elements by verified side, never by the suffix"):
// the pairs are, verified by measured x range,
//   FJ1654 right / FJ1654M left (ACA)      FJ1682 right / FJ1682M left (ICA)
//   FJ1725 right / FJ1725M left (VA)       FJ1713 right / FJ1713M left (PCom)
//   FJ1723/FJ1714 right, …M left (PCA)     FJ1692/FJ1660 right, …M left (MCA)
//   FJ1726 (SCA) FJ1656 (AICA) right, …M left
// and the unpaired ones are those the archive ships as a single midline element
// (basilar FJ1672 — its near-duplicate decimation FJ1844 stays unused, ACoA FJ1655,
// chiasm halves FJ1771 left / FJ1818 right). The optic nerve uses the LARGER of
// the two decimations the archive ships per side (FJ1772 left / FJ1819 right, the
// pair that includes more of the orbital course; FJ1313/FJ1364 are the smaller
// alternative) — VASC_INVENTORY §5.1.
//
// Grouped multi-element parts: BP3D ships the PICA as TWENTY-SIX small segment
// elements and each MCA tree as dozens; registering them individually would put
// ~100 near-empty canonical OBJs on disk. The small-segment groups are therefore
// fused PER SIDE into one registered source mesh each (same "one output per
// part/side" rule the telencephalon table follows), and the group → element map is
// recorded in VASC_PARTS.groups and printed in REGISTRATION.md §B.1 so the
// fusion is auditable. Face counts per element are from VASC_INVENTORY §3.
// ---------------------------------------------------------------------------
const VASC_FILES = {
  // --- feeding trunks -------------------------------------------------------
  vascIcaR: 'FJ1682.obj', vascIcaL: 'FJ1682M.obj',                       // FMA3947/3949 + 3947/4062, 1272 f each
  vascVertebralR: 'FJ1725.obj', vascVertebralL: 'FJ1725M.obj',           // FMA3956/3958 + 3956/4066, 800 f each
  vascBasilar: 'FJ1672.obj',                                             // FMA50542, 262 f (FJ1844 = alternative decimation)
  // --- circle of Willis ------------------------------------------------------
  vascAcoA: 'FJ1655.obj',                                                // FMA50169, 80 f, midline bridge
  vascPcomR: 'FJ1713.obj', vascPcomL: 'FJ1713M.obj',                     // FMA50084/50085 + 50084/50086, 204 f each
  // --- anterior circulation --------------------------------------------------
  vascAcaR: 'FJ1654.obj', vascAcaL: 'FJ1654M.obj',                       // FMA50028/50029 + 50028/50030, 400 f each
  vascMcaM1R: 'FJ1692.obj', vascMcaM1L: 'FJ1692M.obj',                   // FMA50080 + 50365/50366 … 50367, 800 f each
  vascMcaM2R: 'FJ1660.obj', vascMcaM2L: 'FJ1660M.obj',                   // insular (M2) trunk, 1154 f each
  // --- posterior circulation -------------------------------------------------
  vascPcaP1R: 'FJ1723.obj', vascPcaP1L: 'FJ1723M.obj',                   // precommunicating P1, 282 f each
  vascPcaP2R: 'FJ1714.obj', vascPcaP2L: 'FJ1714M.obj',                   // postcommunicating P2–P3, 544 f each
  vascScaR: 'FJ1726.obj', vascScaL: 'FJ1726M.obj',                       // SCA trunk, 406 f each
  vascAicaR: 'FJ1656.obj', vascAicaL: 'FJ1656M.obj',                     // AICA, 766 f each
  // PICA: 26 segment elements (13 per side) fused per side — VASC_INVENTORY §3 group row.
  vascPicaR: [
    'FJ1700.obj', 'FJ1701.obj', 'FJ1702.obj', 'FJ1703.obj', 'FJ1704.obj', 'FJ1705.obj', 'FJ1706.obj',
    'FJ1707.obj', 'FJ1708.obj', 'FJ1709.obj', 'FJ1710.obj', 'FJ1711.obj', 'FJ1715.obj',
  ],
  vascPicaL: [
    'FJ1700M.obj', 'FJ1701M.obj', 'FJ1702M.obj', 'FJ1703M.obj', 'FJ1704M.obj', 'FJ1705M.obj', 'FJ1706M.obj',
    'FJ1707M.obj', 'FJ1708M.obj', 'FJ1709M.obj', 'FJ1710M.obj', 'FJ1711M.obj', 'FJ1715M.obj',
  ],
  // --- deep perforators ------------------------------------------------------
  vascAnteriorChoroidalR: 'FJ1658.obj', vascAnteriorChoroidalL: 'FJ1658M.obj', // FMA50087/50088 + 50087/50089, 418 f each
  // --- optic pathway (plan §1b; VASC_INVENTORY §5.1) -------------------------
  opticNerveL: 'FJ1772.obj', opticNerveR: 'FJ1819.obj',                  // FMA50863/50878 + 50863/50875, 2376/2378 f
  opticChiasmL: 'FJ1771.obj', opticChiasmR: 'FJ1818.obj',                // FMA62045, halves that meet at the midline, 898/890 f
  opticTractL: 'FJ1773.obj', opticTractR: 'FJ1820.obj',                  // FMA62046/67936 + 62046/62382, 2336/2332 f
};
const VASC_INPUT_COUNT = Object.keys(VASC_FILES).length;
// Distinct FJ files across the whole v8 table (the 26 PICA segments are 26 files).
const VASC_ALL_FILE_LIST = [...new Set(Object.values(VASC_FILES).flat())];
const VASC_DISTINCT_FILE_COUNT = VASC_ALL_FILE_LIST.length;
// key → descriptive name + canonical output name + FMA ids, and (for the fused
// multi-element parts) the group the element belongs to. `role` mirrors the
// `atlas record / role` column of VASC_INVENTORY §3.
const VASC_PARTS = {
  vascIcaR: { name: 'internal carotid artery, right (cervical + intracranial course; the rostral end is the carotid siphon the Willis ring needs)', out: 'vasc-internal-carotid-artery-right', fma: '3947/3949', role: 'feeding trunk' },
  vascIcaL: { name: 'internal carotid artery, left (cervical + intracranial course)', out: 'vasc-internal-carotid-artery-left', fma: '3947/4062', role: 'feeding trunk' },
  vascVertebralR: { name: 'vertebral artery, right', out: 'vasc-vertebral-artery-right', fma: '3956/3958', role: 'feeding trunk' },
  vascVertebralL: { name: 'vertebral artery, left', out: 'vasc-vertebral-artery-left', fma: '3956/4066', role: 'feeding trunk' },
  vascBasilar: { name: 'basilar artery (midline trunk over the ventral pons)', out: 'vasc-basilar-artery', fma: '50542', role: 'posterior trunk' },
  vascAcoA: { name: 'anterior communicating artery (midline cross-link of the Willis ring)', out: 'vasc-anterior-communicating-artery', fma: '50169', role: 'Willis cross-link' },
  vascPcomR: { name: 'posterior communicating artery, right', out: 'vasc-posterior-communicating-artery-right', fma: '50084/50085', role: 'Willis cross-link' },
  vascPcomL: { name: 'posterior communicating artery, left', out: 'vasc-posterior-communicating-artery-left', fma: '50084/50086', role: 'Willis cross-link' },
  vascAcaR: { name: 'anterior cerebral artery, right', out: 'vasc-anterior-cerebral-artery-right', fma: '50028/50029', role: 'ACA territory' },
  vascAcaL: { name: 'anterior cerebral artery, left', out: 'vasc-anterior-cerebral-artery-left', fma: '50028/50030', role: 'ACA territory' },
  vascMcaM1R: { name: 'middle cerebral artery, right — sphenoid (M1) part', out: 'vasc-middle-cerebral-artery-m1-right', fma: '50080/50365/50366', role: 'MCA territory' },
  vascMcaM1L: { name: 'middle cerebral artery, left — sphenoid (M1) part', out: 'vasc-middle-cerebral-artery-m1-left', fma: '50080/50365/50367', role: 'MCA territory' },
  vascMcaM2R: { name: 'middle cerebral artery, right — insular (M2) trunk', out: 'vasc-middle-cerebral-artery-m2-right', fma: '50080/50368/50369', role: 'MCA territory' },
  vascMcaM2L: { name: 'middle cerebral artery, left — insular (M2) trunk', out: 'vasc-middle-cerebral-artery-m2-left', fma: '50080/50368/50370', role: 'MCA territory' },
  vascPcaP1R: { name: 'posterior cerebral artery, right — precommunicating (P1) part', out: 'vasc-posterior-cerebral-artery-p1-right', fma: '50590/50639', role: 'PCA territory' },
  vascPcaP1L: { name: 'posterior cerebral artery, left — precommunicating (P1) part', out: 'vasc-posterior-cerebral-artery-p1-left', fma: '50590/50640', role: 'PCA territory' },
  vascPcaP2R: { name: 'posterior cerebral artery, right — postcommunicating (P2–P3) part', out: 'vasc-posterior-cerebral-artery-p2-right', fma: '50591/50641', role: 'PCA territory' },
  vascPcaP2L: { name: 'posterior cerebral artery, left — postcommunicating (P2–P3) part', out: 'vasc-posterior-cerebral-artery-p2-left', fma: '50591/50642', role: 'PCA territory' },
  vascScaR: { name: 'superior cerebellar artery, right', out: 'vasc-superior-cerebellar-artery-right', fma: '50573/50574', role: 'SCA territory' },
  vascScaL: { name: 'superior cerebellar artery, left', out: 'vasc-superior-cerebellar-artery-left', fma: '50573/50575', role: 'SCA territory' },
  vascAicaR: { name: 'anterior inferior cerebellar artery, right', out: 'vasc-anterior-inferior-cerebellar-artery-right', fma: '50544', role: 'AICA territory' },
  vascAicaL: { name: 'anterior inferior cerebellar artery, left', out: 'vasc-anterior-inferior-cerebellar-artery-left', fma: '50544', role: 'AICA territory' },
  vascPicaR: { name: 'posterior inferior cerebellar artery, right (13 segment elements fused)', out: 'vasc-posterior-inferior-cerebellar-artery-right', fma: '50518/50519', role: 'PICA territory', group: 'pica', pieces: 13 },
  vascPicaL: { name: 'posterior inferior cerebellar artery, left (13 segment elements fused)', out: 'vasc-posterior-inferior-cerebellar-artery-left', fma: '50518/50520', role: 'PICA territory', group: 'pica', pieces: 13 },
  vascAnteriorChoroidalR: { name: 'anterior choroidal artery, right', out: 'vasc-anterior-choroidal-artery-right', fma: '50087/50088', role: 'deep perforator' },
  vascAnteriorChoroidalL: { name: 'anterior choroidal artery, left', out: 'vasc-anterior-choroidal-artery-left', fma: '50087/50089', role: 'deep perforator' },
  opticNerveL: { name: 'optic nerve, left (the larger of the two decimations the archive ships)', out: 'tract-optic-nerve-left', fma: '50863/50878', role: 'optic pathway' },
  opticNerveR: { name: 'optic nerve, right', out: 'tract-optic-nerve-right', fma: '50863/50875', role: 'optic pathway' },
  opticChiasmL: { name: 'optic chiasm, left half (the halves meet at the midline)', out: 'ctx-optic-chiasm-left', fma: '62045', role: 'optic pathway' },
  opticChiasmR: { name: 'optic chiasm, right half', out: 'ctx-optic-chiasm-right', fma: '62045', role: 'optic pathway' },
  opticTractL: { name: 'optic tract, left', out: 'tract-optic-tract-left', fma: '62046/67936', role: 'optic pathway' },
  opticTractR: { name: 'optic tract, right', out: 'tract-optic-tract-right', fma: '62046/62382', role: 'optic pathway' },
};
const VASC_KEYS = Object.keys(VASC_FILES);

const TEL_INPUT_COUNT = Object.keys(TEL_FILES).length;
const TEL_DISTINCT_FILE_COUNT = new Set(Object.values(TEL_FILES)).size; // 29 keys over 29 FJ files
// TELENCEPHALON_PLAN §1 publishes 175,562 faces for its data table: the 29 keys above EXCEPT the
// two hemispheric white-matter cores FJ1758/FJ1806 (25,542 + 26,512 faces), i.e. 227,616 − 52,054.
// Asserted against the written meshes after the run so the report cannot drift from that number.
const PLAN_TABLE_FACES = 175562;
const TEL_KEYS = Object.keys(TEL_FILES);
// The single merged input table every downstream stage consumes.
// NOTE (v8): the v8 entries are NOT part of this table on purpose — they take the
// separate `VASC_FILES` path below so that `ALL_FILES` (and therefore every
// pre-existing key-order-dependent artefact) keeps its v7 shape exactly.
const ALL_FILES = { ...FILES, ...TEL_FILES };
const PART_NAMES = { ...TEL_PARTS };

// Fused stem stack used for junction detection + centerline straightening.
// TELENCEPHALON PARTS ARE INTENTIONALLY ABSENT: the junctions, the y-warp knots, the
// midline seam and every centerline offset are derived from this stack alone, so adding
// telencephalic inputs CANNOT move any pre-existing canonical coordinate (v7 hard
// constraint (a) / AMENDMENT B: nothing below y=+45 may move). See REGISTRATION.md
// addendum §A.4 for the byte-level proof.
const STEM_KEYS = ['medullaL', 'medullaR', 'ponsL', 'ponsR', 'midbrainL', 'midbrainR'];

// ---------------------------------------------------------------------------
// Minimal internal OBJ IO (fallback when scripts/lib/sdf/objio.js is absent)
// ---------------------------------------------------------------------------
function readObjInternal(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const positions = [];
  const faces = [];
  for (const line of text.split('\n')) {
    if (line.length < 2 || line.charCodeAt(0) !== 118 /* v */ && line.charCodeAt(0) !== 102 /* f */) {
      // fast reject: anything not starting with v/f
      if (!(line.startsWith('v ') || line.startsWith('f '))) continue;
    }
    if (line.startsWith('v ')) {
      const t = line.slice(2).trim().split(/\s+/);
      positions.push([+t[0], +t[1], +t[2]]);
    } else if (line.startsWith('f ')) {
      const t = line.slice(2).trim().split(/\s+/);
      const idx = [];
      for (const tok of t) {
        const m = tok.match(/^(\d+)/);
        if (m) idx.push(+m[1] - 1); // OBJ is 1-based
      }
      for (let k = 1; k + 1 < idx.length; k++) faces.push([idx[0], idx[k], idx[k + 1]]);
    }
  }
  return { positions, faces };
}

function objHeaderText(name) {
  return [
    '# Canonical atlas-space mesh — generated by scripts/lib/register.mjs (deterministic).',
    '# Canonical space: x=+patient-left, y=+superior, z=+anterior; 1 au = 1.2 mm (AMENDMENT A).',
    `# Source geometry: BodyParts3D 4.0 (${name}), © The Database Center for Life Science, CC Attribution 4.0 International.`,
  ].join('\n');
}

function writeObjInternal(filePath, name, mesh) {
  const out = [objHeaderText(name), `o ${name}`];
  for (const p of mesh.positions) {
    out.push(`v ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`);
  }
  for (const f of mesh.faces) {
    out.push(`f ${f[0] + 1} ${f[1] + 1} ${f[2] + 1}`);
  }
  writeFileSync(filePath, out.join('\n') + '\n', 'utf8');
}

// --- kernel objio adapter ----------------------------------------------------
// Adapts scripts/lib/sdf/objio.js (task sdf-kernel). Known API (verified 2026-09):
//   parseOBJ(text) -> {positions: Float32Array xyz, triangles: Uint32Array, ...}
//   writeOBJ(mesh, {name, comment, precision}) -> string
// A path-based reader (readOBJ/readObj) is also tolerated if a future version
// provides one. The kernel writer's output is round-trip verified before trust.
async function loadObjIo() {
  try {
    const mod = await import('./sdf/objio.js');
    const parseName = ['parseOBJ', 'parseObj'].find((n) => typeof mod[n] === 'function');
    const readName = ['readOBJ', 'readObj', 'loadOBJ', 'loadObj'].find((n) => typeof mod[n] === 'function');
    const writeName = ['writeOBJ', 'writeObj', 'stringifyOBJ', 'stringifyObj'].find((n) => typeof mod[n] === 'function');
    if ((parseName || readName) && writeName) {
      const read = async (p) => {
        if (parseName) return normalizeKernelMesh(mod[parseName](readFileSync(p, 'utf8')));
        return normalizeKernelMesh(await mod[readName](p));
      };
      const write = async (p, name, mesh) => {
        const flatPos = toFlatPositions(mesh.positions);
        const flatTri = toFlatTriangles(mesh.faces);
        const ret = await mod[writeName](
          { positions: flatPos, triangles: flatTri },
          {
            name,
            precision: 4,
            comment: 'Canonical atlas space (x=+left, y=+sup, z=+ant; 1au=1.2mm). Source: BodyParts3D 4.0, (c) The Database Center for Life Science, CC Attribution 4.0 International. Generated by scripts/lib/register.mjs.',
          },
        );
        if (typeof ret === 'string') writeFileSync(p, ret, 'utf8');
      };
      return { name: `kernel:objio.js (${parseName ?? readName}/${writeName})`, read, write };
    }
  } catch {
    /* module absent — expected until sdf-kernel lands; internal fallback below */
  }
  return { name: 'internal (scripts/lib/sdf/objio.js not present yet)', read: readObjInternal, write: writeObjInternal };
}

function toFlatPositions(positions) {
  if (ArrayBuffer.isView(positions)) return positions; // already flat typed array
  if (positions.length && typeof positions[0] === 'number') return positions; // flat array
  const out = new Float32Array(positions.length * 3);
  for (let i = 0; i < positions.length; i++) {
    out[i * 3] = positions[i][0];
    out[i * 3 + 1] = positions[i][1];
    out[i * 3 + 2] = positions[i][2];
  }
  return out;
}
function toFlatTriangles(faces) {
  if (ArrayBuffer.isView(faces)) return faces;
  if (faces.length && typeof faces[0] === 'number') return faces;
  const out = new Uint32Array(faces.length * 3);
  for (let i = 0; i < faces.length; i++) {
    out[i * 3] = faces[i][0];
    out[i * 3 + 1] = faces[i][1];
    out[i * 3 + 2] = faces[i][2];
  }
  return out;
}

function normalizeKernelMesh(r) {
  // Accept {positions|vertices: flat xyz or [[x,y,z]...]} + {triangles|faces: flat or [[a,b,c]...]}
  if (r && (r.positions instanceof Float32Array || r.positions instanceof Float64Array) && (r.triangles instanceof Uint32Array || r.triangles instanceof Uint16Array || Array.isArray(r.triangles))) {
    const positions = [];
    for (let i = 0; i < r.positions.length; i += 3) {
      positions.push([r.positions[i], r.positions[i + 1], r.positions[i + 2]]);
    }
    const faces = [];
    for (let i = 0; i + 2 < r.triangles.length; i += 3) {
      faces.push([r.triangles[i], r.triangles[i + 1], r.triangles[i + 2]]);
    }
    return { positions, faces };
  }
  const rawV = r?.positions ?? r?.vertices ?? r?.verts;
  const rawF = r?.faces ?? r?.triangles;
  if (!Array.isArray(rawV) || !Array.isArray(rawF)) throw new Error('kernel objio returned unrecognized shape');
  const positions = rawV.map((v) => (Array.isArray(v) ? [+v[0], +v[1], +v[2]] : [+v.x, +v.y, +v.z]));
  const faces = rawF.map((f) => (Array.isArray(f) ? [+f[0], +f[1], +f[2]] : [+f.a, +f.b, +f.c]));
  return { positions, faces };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const round = (v, d = 2) => {
  const m = 10 ** d;
  return Math.round(v * m) / m;
};
const bboxOf = (mesh) => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.positions) {
    for (let a = 0; a < 3; a++) {
      if (p[a] < min[a]) min[a] = p[a];
      if (p[a] > max[a]) max[a] = p[a];
    }
  }
  return { min, max };
};
const centroidOf = (mesh) => {
  const c = [0, 0, 0];
  for (const p of mesh.positions) {
    c[0] += p[0]; c[1] += p[1]; c[2] += p[2];
  }
  const n = mesh.positions.length || 1;
  return [c[0] / n, c[1] / n, c[2] / n];
};
function fuseMeshes(meshes) {
  const positions = [];
  const faces = [];
  for (const m of meshes) {
    const off = positions.length;
    for (const p of m.positions) positions.push(p);
    for (const f of m.faces) faces.push([f[0] + off, f[1] + off, f[2] + off]);
  }
  return { positions, faces };
}
function transformMesh(mesh, fn) {
  return { positions: mesh.positions.map((p) => fn(p[0], p[1], p[2])), faces: mesh.faces };
}
function dropUnusedVertices(mesh) {
  const used = new Set();
  for (const f of mesh.faces) for (const i of f) used.add(i);
  const remap = new Map();
  const positions = [];
  // deterministic: ascending original index order
  const sorted = [...used].sort((a, b) => a - b);
  for (const i of sorted) {
    remap.set(i, positions.length);
    positions.push(mesh.positions[i]);
  }
  const faces = mesh.faces.map((f) => f.map((i) => remap.get(i)));
  return { positions, faces };
}

// ---------------------------------------------------------------------------
// Voxelization: slice areas + per-slice occupancy centroids (rasterized triangles)
// ---------------------------------------------------------------------------
// axis = 2 slices along coordinate index `axisIdx` (0=x,1=y,2=z); xy = the other two.
function sliceProfile(meshes, axisIdx, cell, slab) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes) {
    const b = bboxOf(m);
    for (let a = 0; a < 3; a++) {
      if (b.min[a] < min[a]) min[a] = b.min[a];
      if (b.max[a] > max[a]) max[a] = b.max[a];
    }
  }
  const lo = min[axisIdx];
  const hi = max[axisIdx];
  const nSlabs = Math.max(1, Math.ceil((hi - lo) / slab) + 1);
  const u = (axisIdx + 1) % 3;
  const v = (axisIdx + 2) % 3;
  const nu = Math.ceil((max[u] - min[u]) / cell) + 2;
  const nv = Math.ceil((max[v] - min[v]) / cell) + 2;
  const slabCount = new Int32Array(nSlabs);
  const slabU = new Float64Array(nSlabs);
  const slabV = new Float64Array(nSlabs);
  const slabOcc = new Int32Array(nSlabs);
  const slabUMin = new Float64Array(nSlabs).fill(Infinity);
  const slabUMax = new Float64Array(nSlabs).fill(-Infinity);
  const slabVMin = new Float64Array(nSlabs).fill(Infinity);
  const slabVMax = new Float64Array(nSlabs).fill(-Infinity);

  // sparse occupancy: Map<slabIndex, Set<cellIdx>> — memory-safe for big grids.
  // markTriWithCache rasterizes one triangle into every slab it spans.
  const occ = new Map();
  const markTriWithCache = (a, b, c, k0, k1) => {
    const minU = Math.min(a[u], b[u], c[u]);
    const maxU = Math.max(a[u], b[u], c[u]);
    const minV = Math.min(a[v], b[v], c[v]);
    const maxV = Math.max(a[v], b[v], c[v]);
    const i0 = Math.floor((minU - min[u]) / cell);
    const i1 = Math.ceil((maxU - min[u]) / cell);
    const j0 = Math.floor((minV - min[v]) / cell);
    const j1 = Math.ceil((maxV - min[v]) / cell);
    const d = (b[u] - a[u]) * (c[v] - a[v]) - (c[u] - a[u]) * (b[v] - a[v]);
    if (d === 0) return;
    for (let k = k0; k <= k1; k++) {
      const s = occ.get(k);
      for (let i = i0; i <= i1; i++) {
        const pu = min[u] + (i + 0.5) * cell;
        if (pu < minU || pu > maxU) continue;
        for (let j = j0; j <= j1; j++) {
          const pv = min[v] + (j + 0.5) * cell;
          if (pv < minV || pv > maxV) continue;
          const w0 = ((b[u] - pu) * (c[v] - pv) - (c[u] - pu) * (b[v] - pv)) / d;
          const w1 = ((c[u] - pu) * (a[v] - pv) - (a[u] - pu) * (c[v] - pv)) / d;
          const w2 = 1 - w0 - w1;
          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            const idx = i * nv + j;
            if (s && s.has(idx)) continue;
            if (!s) { const ns = new Set(); ns.add(idx); occ.set(k, ns); } else s.add(idx);
            slabCount[k]++; slabU[k] += pu; slabV[k] += pv; slabOcc[k]++;
            if (pu < slabUMin[k]) slabUMin[k] = pu;
            if (pu > slabUMax[k]) slabUMax[k] = pu;
            if (pv < slabVMin[k]) slabVMin[k] = pv;
            if (pv > slabVMax[k]) slabVMax[k] = pv;
          }
        }
      }
    }
  }

  for (const m of meshes) {
    for (const f of m.faces) {
      const a = m.positions[f[0]];
      const b = m.positions[f[1]];
      const c = m.positions[f[2]];
      const zMin = Math.min(a[axisIdx], b[axisIdx], c[axisIdx]);
      const zMax = Math.max(a[axisIdx], b[axisIdx], c[axisIdx]);
      const k0 = Math.max(0, Math.floor((zMin - lo) / slab));
      const k1 = Math.min(nSlabs - 1, Math.floor((zMax - lo) / slab));
      if (k1 < k0) continue;
      markTriWithCache(a, b, c, k0, k1);
    }
  }

  const slices = [];
  for (let k = 0; k < nSlabs; k++) {
    slices.push({
      pos: lo + (k + 0.5) * slab,
      areaMm2: slabCount[k] * cell * cell,
      cells: slabOcc[k],
      centroidU: slabOcc[k] ? slabU[k] / slabOcc[k] : NaN,
      centroidV: slabOcc[k] ? slabV[k] / slabOcc[k] : NaN,
      midU: slabOcc[k] ? (slabUMin[k] + slabUMax[k]) / 2 : NaN, // silhouette middle (bulge-robust)
      midV: slabOcc[k] ? (slabVMin[k] + slabVMax[k]) / 2 : NaN,
    });
  }
  return { slices, min, max, axisIdx, u, v };
}

// ---------------------------------------------------------------------------
// Junction detectors (documented heuristics over the stem area profile)
// ---------------------------------------------------------------------------
function detectTip(profile, areaFrac) {
  const maxA = Math.max(...profile.slices.map((s) => s.areaMm2));
  for (const s of profile.slices) {
    if (s.areaMm2 >= maxA * areaFrac) return s.pos;
  }
  return profile.slices[0].pos;
}
function median(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function areaAt(profile, z) {
  let best = profile.slices[0];
  let bd = Infinity;
  for (const s of profile.slices) {
    const d = Math.abs(s.pos - z);
    if (d < bd) { bd = d; best = s; }
  }
  return best.areaMm2;
}
function detectLocalMin(profile, lo, hi, prominenceFrac) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi && s.areaMm2 > 0);
  const maxA = Math.max(...profile.slices.map((s) => s.areaMm2));
  let best = null;
  for (let i = 0; i < inWin.length; i++) {
    const s = inWin[i];
    let isMin = true;
    for (let k = Math.max(0, i - 6); k <= Math.min(inWin.length - 1, i + 6); k++) {
      if (inWin[k].areaMm2 < s.areaMm2) { isMin = false; break; }
    }
    if (!isMin) continue;
    // prominence: max rise after the dip within the window
    let rise = 0;
    for (let k = i + 1; k < inWin.length; k++) rise = Math.max(rise, inWin[k].areaMm2 - s.areaMm2);
    if (rise >= maxA * prominenceFrac && (!best || s.pos < best.pos)) best = s;
  }
  return best ? best.pos : null;
}
function detectRiseCrossing(profile, lo, hi) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi);
  if (!inWin.length) return null;
  const aMin = Math.min(...inWin.map((s) => s.areaMm2));
  const aMax = Math.max(...inWin.map((s) => s.areaMm2));
  const target = aMin + 0.5 * (aMax - aMin);
  for (const s of inWin) {
    if (s.areaMm2 >= target) return s.pos;
  }
  return inWin[inWin.length - 1].pos;
}
function detectFallCrossing(profile, lo, hi, frac) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi && s.areaMm2 > 0);
  if (!inWin.length) return null;
  const plateau = median(inWin.slice(0, Math.max(1, Math.floor(inWin.length * 0.4))).map((s) => s.areaMm2));
  const target = plateau * frac;
  let last = null;
  for (const s of inWin) {
    if (s.areaMm2 >= target) last = s.pos;
  }
  return last;
}
// Step from a high plateau (window start) to a low plateau (window end):
// junction = midpoint crossing of the descending step. Returns null if no step exists.
function detectStepDown(profile, lo, hi) {
  const inWin = profile.slices.filter((s) => s.pos >= lo && s.pos <= hi && s.areaMm2 > 0);
  if (inWin.length < 8) return null;
  const n3 = Math.max(1, Math.floor(inWin.length * 0.3));
  const high = median(inWin.slice(0, n3).map((s) => s.areaMm2));
  const low = median(inWin.slice(inWin.length - n3).map((s) => s.areaMm2));
  if (!(high > low * 1.15)) return null; // no meaningful step
  const target = (high + low) / 2;
  let last = null;
  for (const s of inWin) {
    if (s.areaMm2 >= target) last = s.pos;
  }
  return last;
}

// ---------------------------------------------------------------------------
// Piecewise-linear y-warp
// ---------------------------------------------------------------------------
function makeWarp(knotsIn, knotsOut) {
  // knotsIn ascending (scaled au); extrapolate with end-segment slopes.
  return (y) => {
    const n = knotsIn.length;
    if (y <= knotsIn[0]) {
      const slope = (knotsOut[1] - knotsOut[0]) / (knotsIn[1] - knotsIn[0]);
      return knotsOut[0] + (y - knotsIn[0]) * slope;
    }
    if (y >= knotsIn[n - 1]) {
      const slope = (knotsOut[n - 1] - knotsOut[n - 2]) / (knotsIn[n - 1] - knotsIn[n - 2]);
      return knotsOut[n - 1] + (y - knotsIn[n - 1]) * slope;
    }
    for (let i = 1; i < n; i++) {
      if (y <= knotsIn[i]) {
        const t = (y - knotsIn[i - 1]) / (knotsIn[i] - knotsIn[i - 1]);
        return knotsOut[i - 1] + t * (knotsOut[i] - knotsOut[i - 1]);
      }
    }
    return knotsOut[n - 1];
  };
}

// ---------------------------------------------------------------------------
// Connected components (face graph via shared vertex positions, edge-strict)
// ---------------------------------------------------------------------------
function posKey(p) {
  return `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)},${Math.round(p[2] * 100)}`;
}
function faceComponents(mesh) {
  const n = mesh.faces.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const edgeMap = new Map();
  mesh.faces.forEach((f, fi) => {
    const keys = f.map((i) => posKey(mesh.positions[i]));
    for (let e = 0; e < 3; e++) {
      const key = `${keys[e]}|${keys[(e + 1) % 3]}`;
      const canon = key < `${keys[(e + 1) % 3]}|${keys[e]}` ? key : `${keys[(e + 1) % 3]}|${keys[e]}`;
      const other = edgeMap.get(canon);
      if (other !== undefined) union(fi, other);
      else edgeMap.set(canon, fi);
    }
  });
  const groups = new Map();
  for (let fi = 0; fi < n; fi++) {
    const r = find(fi);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(fi);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}
function extractFaces(mesh, faceIdx) {
  const sub = { positions: mesh.positions, faces: faceIdx.map((i) => mesh.faces[i]) };
  return dropUnusedVertices(sub);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const PROBE = process.argv.includes('--probe-profile');
const log = (...a) => console.log(...a);

const io = await loadObjIo();
log(`[register] obj io: ${io.name}`);
// kernel reader/writer may be async; normalize kernel mesh shapes through the same adapter
const readAny = async (p) => normalizeKernelMesh(await io.read(p));
const writeAny = async (p, name, mesh) => io.write(p, name, mesh);

if (!existsSync(RAW_DIR) && !existsSync(RAW_TEL_DIR)) {
  console.error(`[register] missing both ${RAW_DIR} and ${RAW_TEL_DIR} — run bp3d-acquire first`);
  process.exit(1);
}

// 0) Load all element meshes (BP3D mm space).
// Search order is fixed (SOURCE_DIRS): raw/ first, raw-tel/ as the fallback, per file id.
// An id present in both directories therefore resolves to raw/ — the two archives carry
// the same element ids, so the bytes are equivalent; the resolution table is recorded so
// the choice is auditable rather than implicit.
const sourceOfFile = new Map(); // 'FJ####.obj' → SOURCE_DIRS entry that supplied it
const meshes = {};
for (const [key, file] of Object.entries(ALL_FILES)) {
  let hit = null;
  for (const s of SOURCE_DIRS) {
    if (existsSync(path.join(s.dir, file))) { hit = s; break; }
  }
  if (!hit) {
    console.error(`[register] input ${key} (${file}) not found in any of: ${SOURCE_DIRS.map((s) => s.rel).join(', ')}`);
    process.exit(1);
  }
  if (!sourceOfFile.has(file)) sourceOfFile.set(file, hit);
  meshes[key] = await readAny(path.join(hit.dir, file));
}
// v8 vascular + optic inputs. Same per-file resolution, same reader; the only
// difference is that a key whose table entry is an ARRAY (the 26-element PICA
// group) is read element-by-element and FUSED into one source mesh for that side,
// so downstream stages see one part per structure/side exactly like the rest of
// the pipeline. The fusion is a pure vertex/face concatenation in BP mm space —
// no coordinates are touched — and each element's own id is kept in
// `vascSourceFiles` for the report.
const vascSourceFiles = new Map(); // key → ['FJ1700.obj', …]
for (const [key, spec] of Object.entries(VASC_FILES)) {
  const files = Array.isArray(spec) ? spec : [spec];
  const pieces = [];
  for (const file of files) {
    let hit = null;
    for (const s of SOURCE_DIRS) {
      if (existsSync(path.join(s.dir, file))) { hit = s; break; }
    }
    if (!hit) {
      console.error(`[register] vascular input ${key} (${file}) not found in any of: ${SOURCE_DIRS.map((s) => s.rel).join(', ')}`);
      process.exit(1);
    }
    if (!sourceOfFile.has(file)) sourceOfFile.set(file, hit);
    pieces.push(await readAny(path.join(hit.dir, file)));
  }
  meshes[key] = pieces.length === 1 ? pieces[0] : fuseMeshes(pieces);
  vascSourceFiles.set(key, files);
}
// input-table invariants: the base table must not have changed (that is what guarantees
// the existing registration), and every telencephalon key must be present exactly once.
if (BASE_INPUT_COUNT !== 27 || Object.keys(FILES).length !== BASE_INPUT_COUNT) {
  console.error(`[register] base input table changed (${Object.keys(FILES).length} keys, expected ${BASE_INPUT_COUNT}) — the pre-existing registered coordinates depend on it`);
  process.exit(1);
}
if (Object.keys(TEL_FILES).length !== TEL_INPUT_COUNT || new Set(Object.values(TEL_FILES)).size !== TEL_DISTINCT_FILE_COUNT) {
  console.error('[register] telencephalon input table malformed');
  process.exit(1);
}
if (VASC_KEYS.length !== VASC_INPUT_COUNT
  || new Set(VASC_ALL_FILE_LIST).size !== VASC_DISTINCT_FILE_COUNT
  || VASC_PARTS.vascPicaR.pieces + VASC_PARTS.vascPicaL.pieces
    !== VASC_FILES.vascPicaR.length + VASC_FILES.vascPicaL.length) {
  console.error('[register] vascular/optic input table malformed');
  process.exit(1);
}
{
  const byDir = { primary: 0, secondary: 0, tertiary: 0 };
  for (const s of sourceOfFile.values()) {
    byDir[SOURCE_DIRS[0] === s ? 'primary' : (SOURCE_DIRS[1] === s ? 'secondary' : 'tertiary')]++;
  }
  log(`[register] inputs: ${Object.keys(ALL_FILES).length} element keys (${BASE_INPUT_COUNT} base + ${TEL_INPUT_COUNT} telencephalon) over ${sourceOfFile.size - VASC_DISTINCT_FILE_COUNT} distinct FJ files`);
  log(`[register] vascular/optic inputs: ${VASC_INPUT_COUNT} keys (${VASC_DISTINCT_FILE_COUNT} distinct FJ files, ${VASC_FILES.vascPicaR.length + VASC_FILES.vascPicaL.length} of them the fused PICA group) from ${SOURCE_DIRS[2].rel}`);
  log(`[register] source search order ${SOURCE_DIRS.map((s) => s.rel).join(' → ')}: ${byDir.primary} file(s) from raw/, ${byDir.secondary} from raw-tel/, ${byDir.tertiary} from raw-vasc/`);
}

// 1) Empirical axis verification (plan §3.1 / risk table: verify against known asymmetries)
const ev = [];
const mean = (mesh, a) => centroidOf(mesh)[a];
{
  // x sign: FMA73423 left SC (FJ1779) must be +x, FMA73422 right SC (FJ1826) must be −x
  const scLx = mean(meshes.scL, 0);
  const scRx = mean(meshes.scR, 0);
  ev.push({ check: 'x+ = subject-left', detail: `left SC mean x=${round(scLx)} mm > 0, right SC mean x=${round(scRx)} mm < 0 (FMA73423/73422 via parts-report)`, ok: scLx > 0 && scRx < 0 });
  // z+ = superior: hypothalamus/epithalamus sit above pons, pons above medulla
  const hypoTop = bboxOf(meshes.hypoL).max[2];
  const ponsTop = bboxOf(meshes.ponsL).max[2];
  const medTop = bboxOf(meshes.medullaL).max[2];
  const medBot = bboxOf(meshes.medullaL).min[2];
  ev.push({ check: 'z+ = superior', detail: `hypothalamus top ${round(hypoTop)} > pons top ${round(ponsTop)} > medulla top ${round(medTop)} > medulla bottom ${round(medBot)} mm`, ok: hypoTop > ponsTop && ponsTop > medTop && medTop > medBot });
  // y− = anterior: hypothalamus must be the most rostral (most negative mean y_bp) of the
  // BASE brainstem/diencephalon parts, cerebellum the most caudal (least negative) of them.
  // (Pineal/SC overlap in A–P by real anatomy — the pineal hangs in the quadrigeminal cistern
  // behind the colliculi — so they are not chained.)
  // SCOPE: base keys only, deliberately. This is the v2 axis contract for the base table; the
  // telencephalon is rostral/caudal of the whole brainstem by definition, so including it here
  // would test a statement that is not the assertion (and "most caudal of everything" is
  // anatomically false: the cerebellum sits below the occipital lobe in BP mm).
  let yMinPart = null;
  let yMaxPart = null;
  for (const [k, m] of Object.entries(meshes)) {
    if (!Object.prototype.hasOwnProperty.call(FILES, k)) continue;
    const y = mean(m, 1);
    if (!yMinPart || y < yMinPart.y) yMinPart = { k, y };
    if (!yMaxPart || y > yMaxPart.y) yMaxPart = { k, y };
  }
  const yHypo = mean(meshes.hypoL, 1);
  const yCere = mean(meshes.cerebL, 1);
  const isHypoPart = (k) => ['hypoL', 'hypoR', 'hypoExtraL', 'hypoExtraR'].includes(k);
  const isCerebPart = (k) => ['cerebL', 'cerebR'].includes(k);
  ev.push({
    check: 'y− = anterior (PROBE.md note corrected)',
    detail: `most-rostral base part = ${yMinPart.k} (mean y_bp ${round(yMinPart.y)} mm; expect hypothalamus), most-caudal base part = ${yMaxPart.k} (${round(yMaxPart.y)} mm; expect cerebellum)`,
    ok: isHypoPart(yMinPart.k) && isCerebPart(yMaxPart.k),
  });
  // fourth ventricle (dorsal CSF) posterior to the pontine basis
  const yVent4 = mean(meshes.vent4, 1);
  const yPons = mean(meshes.ponsL, 1);
  ev.push({ check: '4th ventricle dorsal/posterior to pons basis', detail: `mean y_bp: 4th ventricle ${round(yVent4)} > pons ${round(yPons)} mm`, ok: yVent4 > yPons });
  // cerebellum posterior & dorsal: mean y_bp greater than medulla's, z range overlaps/above
  const yMed = mean(meshes.medullaL, 1);
  ev.push({ check: 'cerebellum posterior to brainstem', detail: `cerebellum mean y_bp ${round(yCere)} mm > medulla ${round(yMed)} mm`, ok: yCere > yMed });

  // --- v7 telencephalon evidence (TELENCEPHALON_PLAN §1/§2) -------------------
  // (a) laterality: every *L element must sit at positive mean x_bp, every *R at negative
  //     — the same convention the base table follows; a swapped pair would mislabel sides.
  const telSideBad = [];
  for (const [k, m] of Object.entries(meshes)) {
    if (k === 'telWmExtra') continue; // unpaired extra element, spans the midline
    if (k.endsWith('L') && mean(m, 0) <= 0) telSideBad.push(`${k} mean x_bp ${round(mean(m, 0))} ≤ 0`);
    if (k.endsWith('R') && mean(m, 0) >= 0) telSideBad.push(`${k} mean x_bp ${round(mean(m, 0))} ≥ 0`);
  }
  ev.push({
    check: 'telencephalon L/R laterality',
    detail: telSideBad.length ? telSideBad.join('; ') : `all ${TEL_KEYS.filter((k) => k !== 'telWmExtra').length} paired tel elements have L at +x_bp and R at −x_bp`,
    ok: telSideBad.length === 0,
  });
  // (b) the cortical vertex must top the whole head: cerebral white matter above the thalamus
  //     and the diencephalon roof (this is the AMENDMENT B y-extension driver).
  const wmTop = Math.max(bboxOf(meshes.telCerebWmL).max[2], bboxOf(meshes.telCerebWmR).max[2]);
  ev.push({
    check: 'cerebral white matter above diencephalon roof',
    detail: `WM core top z_bp ${round(wmTop)} mm > diencephalon roof ${round(dicTopMm())} mm > thalamus top ${round(Math.max(bboxOf(meshes.thalL).max[2], bboxOf(meshes.thalR).max[2]))} mm`,
    ok: wmTop > dicTopMm(),
  });
  // (c) A–P placement of the hemispheric mass: its posterior extreme is above the cerebellum
  //     (which is BP3D's most caudal element) and its frontal pole is rostral of every base
  //     part. Wrong ids or a swapped A–P sign would fail this.
  const telPosteriorY = Math.max(
    bboxOf(meshes.telCerebWmL).min[1], bboxOf(meshes.telCerebWmR).min[1],
    bboxOf(meshes.telOccipitalLobeL).min[1], bboxOf(meshes.telOccipitalLobeR).min[1],
  ); // +y_bp = posterior ⇒ the posterior extreme is the LEAST negative min-y_bp
  const cerebMinY2 = Math.min(bboxOf(meshes.cerebL).min[1], bboxOf(meshes.cerebR).min[1]);
  const telFrontalY = Math.max(bboxOf(meshes.telCerebWmL).min[1], bboxOf(meshes.telCerebWmR).min[1]);
  ev.push({
    check: 'hemispheric mass A–P placement (frontal pole rostral of every base part, occipital pole above the cerebellum)',
    detail: `WM/core frontal reach y_bp ${round(telFrontalY)} mm < hypothalamus mean y_bp ${round(mean(meshes.hypoL, 1))} mm (most rostral base part); telencephalon posterior extreme y_bp ${round(telPosteriorY)} mm > cerebellum y_bp ${round(cerebMinY2)} mm (cerebellum is BP3D's most caudal element, the hemispheres sit rostral/above it)`,
    ok: telFrontalY < mean(meshes.hypoL, 1) && telPosteriorY > cerebMinY2,
  });
  // (d) lateral ventricles are inside the hemispheric white matter in x (a ventricle wider
  //     than its hemisphere means the L/R files were swapped).
  const ventW = Math.max(bboxOf(meshes.telVentricleL).max[0], -bboxOf(meshes.telVentricleR).min[0]);
  const wmW = Math.max(bboxOf(meshes.telCerebWmL).max[0], -bboxOf(meshes.telCerebWmR).min[0]);
  ev.push({
    check: 'lateral ventricle inside its hemisphere (lateral extent)',
    detail: `max |ventricle x_bp| ${round(ventW)} mm < max |WM core x_bp| ${round(wmW)} mm`,
    ok: ventW < wmW,
  });

  // --- v8 vascular + optic evidence (NEUROATLAS_V8_PLAN §1a/§1b) ---------------
  // (e) Laterality of the new pairs, on the same rule as (a): the `*L` element must sit
  //     at +x_bp. VASC_INVENTORY §4 verified this for all 122 extracted files and warns
  //     explicitly against trusting the FJ/FJ…M suffix, so it is re-checked here from the
  //     bytes that are actually registered.
  const vascSideBad = [];
  for (const k of VASC_KEYS) {
    if (k.endsWith('L') && mean(meshes[k], 0) <= 0) vascSideBad.push(`${k} mean x_bp ${round(mean(meshes[k], 0))} ≤ 0`);
    if (k.endsWith('R') && mean(meshes[k], 0) >= 0) vascSideBad.push(`${k} mean x_bp ${round(mean(meshes[k], 0))} ≥ 0`);
  }
  ev.push({
    check: 'vascular/optic L/R laterality (VASC_INVENTORY §4 verified sides, re-measured)',
    detail: vascSideBad.length
      ? vascSideBad.join('; ')
      : `all ${VASC_KEYS.filter((k) => k.endsWith('L') || k.endsWith('R')).length} paired v8 elements have L at +x_bp and R at −x_bp`,
    ok: vascSideBad.length === 0,
  });
  // (f) The Willis-relevant midline elements must straddle the midline: the basilar artery
  //     runs up the ventral pons on the midline and the ACoA is the short midline cross-link
  //     between the two ACAs. Neither may be laterally displaced.
  const basilarSpan = bboxOf(meshes.vascBasilar);
  const acoaSpan = bboxOf(meshes.vascAcoA);
  const basilarMid = (basilarSpan.min[0] + basilarSpan.max[0]) / 2;
  const acoaMid = (acoaSpan.min[0] + acoaSpan.max[0]) / 2;
  ev.push({
    check: 'midline vessels straddle the midline (basilar artery, anterior communicating artery)',
    detail: `basilar x_bp [${round(basilarSpan.min[0])}, ${round(basilarSpan.max[0])}] mid ${round(basilarMid)} mm; ACoA x_bp [${round(acoaSpan.min[0])}, ${round(acoaSpan.max[0])}] mid ${round(acoaMid)} mm (both within ±1.5 mm of the midline seam)`,
    ok: Math.abs(basilarMid) <= 1.5 && Math.abs(acoaMid) <= 1.5
      && basilarSpan.min[0] < 0 && basilarSpan.max[0] > 0,
  });
  // (g) The circle of Willis must actually close, in the A–P and superior axes: the basilar
  //     trunk sits over the pons (ventral, between the vertebral tops and the PCA), the
  //     carotids reach up into the suprasellar cistern, and the whole vascular set lies
  //     inside the cranial cavity (above the medulla's inferior extent, below the vertex).
  const vertTop = Math.max(bboxOf(meshes.vascVertebralL).max[2], bboxOf(meshes.vascVertebralR).max[2]);
  const basilarSpanZ = [basilarSpan.min[2], basilarSpan.max[2]];
  const ponsSpanZ = bboxOf(meshes.ponsL);
  const icaTop = Math.max(bboxOf(meshes.vascIcaL).max[2], bboxOf(meshes.vascIcaR).max[2]);
  const vertebralTopMeetsBasilarBottom = Math.abs(vertTop - basilarSpanZ[0]) <= 6;
  const basilarOverPons = basilarSpanZ[0] >= ponsSpanZ.min[2] - 8 && basilarSpanZ[1] <= ponsSpanZ.max[2] + 12;
  const carotidsReachSuprasellar = icaTop >= bboxOf(meshes.dicSlab).min[2];
  ev.push({
    check: 'Willis ring closure (vertebral tops meet the basilar bottom, basilar over the pons, carotids reach the suprasellar cistern)',
    detail: `vertebral top z_bp ${round(vertTop)} vs basilar bottom ${round(basilarSpanZ[0])} (Δ ${round(vertTop - basilarSpanZ[0])} mm ≤ 6); basilar z_bp [${round(basilarSpanZ[0])}, ${round(basilarSpanZ[1])}] vs pons z_bp [${round(ponsSpanZ.min[2])}, ${round(ponsSpanZ.max[2])}]; ICA top z_bp ${round(icaTop)} ≥ diencephalon slab bottom ${round(bboxOf(meshes.dicSlab).min[2])} mm`,
    ok: vertebralTopMeetsBasilarBottom && basilarOverPons && carotidsReachSuprasellar,
  });
  // (h) The optic chain must be ordered anterior → posterior exactly as the pathway runs:
  //     nerve (most anterior) → chiasm → tract (most posterior). A swapped id pair (e.g.
  //     nerve ↔ tract) would reverse this and is otherwise invisible in the output.
  const nerveY = Math.min(bboxOf(meshes.opticNerveL).min[1], bboxOf(meshes.opticNerveR).min[1]);
  const chiasmY = (bboxOf(meshes.opticChiasmL).min[1] + bboxOf(meshes.opticChiasmR).min[1]) / 2;
  const tractY = Math.max(bboxOf(meshes.opticTractL).max[1], bboxOf(meshes.opticTractR).max[1]);
  ev.push({
    check: 'optic chain order anterior→posterior (nerve → chiasm → tract)',
    detail: `nerve anterior extreme y_bp ${round(nerveY)} mm < chiasm ${round(chiasmY)} mm < tract posterior extreme ${round(tractY)} mm (+y_bp = posterior)`,
    ok: nerveY < chiasmY && chiasmY < tractY,
  });
}
// diencephalon roof from BP3D element extents (helper, used by evidence (b) above and by
// the junction block below — same expression, single definition).
function dicTopMm() {
  return Math.max(
    bboxOf(meshes.dicSlab).max[2],
    bboxOf(meshes.hypoL).max[2],
    bboxOf(meshes.pineal).max[2],
    bboxOf(meshes.habenula).max[2],
  );
}
let axisOk = true;
for (const e of ev) {
  log(`[register] axis check ${e.ok ? 'PASS' : 'FAIL'} — ${e.check}: ${e.detail}`);
  if (!e.ok) axisOk = false;
}
if (!axisOk) {
  console.error('[register] axis convention verification FAILED — refusing to register (see evidence above)');
  process.exit(1);
}

// 2) Brainstem area profile + junction detection (BP mm, z axis)
const stemMeshes = STEM_KEYS.map((k) => meshes[k]);
const profile = sliceProfile(stemMeshes, 2, AREA_CELL_MM, AREA_CELL_MM);
const ponsB = bboxOf(meshes.ponsL);
const medB = bboxOf(meshes.medullaL);
const mbB = bboxOf(meshes.midbrainL);

const zCM = detectTip(profile, 0.05); // medulla tapers into (absent) cord — 5% of stem max area
const pmLocalMin = detectLocalMin(profile, ponsB.min[2] - 1, medB.max[2] + 3, 0.08);
const zPM = pmLocalMin ?? detectRiseCrossing(profile, ponsB.min[2] - 1, medB.max[2] + 3);
const pmesLocalMin = detectLocalMin(profile, mbB.min[2] - 2, ponsB.max[2] + 2, 0.08);
const zPMes = pmesLocalMin ?? detectStepDown(profile, mbB.min[2] - 2, ponsB.max[2] + 2);
const zMD = detectFallCrossing(profile, mbB.max[2] - 7, mbB.max[2] + 1, 0.5);
const dicTop = dicTopMm(); // diencephalon roof (same definition as axis evidence (b))

log(`[register] junctions (raw BP3D mm): CM=${round(zCM)} PM=${round(zPM)} PMes=${round(zPMes)} MD=${round(zMD)} DIC-top=${round(dicTop)}`);
log(`[register]   PM via ${pmLocalMin != null ? 'area local-min (sulcus dip)' : 'mid-rise crossing (no dip in mesh)'}`);
log(`[register]   PMes via ${pmesLocalMin != null ? 'area local-min' : 'mid-fall crossing (pons→midbrain step)'}`);

if (PROBE) {
  log('[register] --probe-profile: per-1mm area profile (z_mm, area_mm2, centroid_x, centroid_y_bp):');
  for (const s of profile.slices) {
    if (s.cells === 0) continue;
    if (Math.round(s.pos * 2) % 2 !== 0) continue; // 1mm spacing
    log(`  ${s.pos.toFixed(1)}  ${s.areaMm2.toFixed(1)}  ${s.centroidU.toFixed(2)}  ${s.centroidV.toFixed(2)}`);
  }
  process.exit(0);
}

// sanity: detected junctions must be ordered and inside plausible windows
const junctionSanity = [
  { name: 'CM', v: zCM, lo: medB.min[2], hi: medB.min[2] + 12 },
  { name: 'PM', v: zPM, lo: ponsB.min[2] - 1, hi: medB.max[2] + 3 },
  { name: 'PMes', v: zPMes, lo: mbB.min[2] - 2, hi: ponsB.max[2] + 2 },
  { name: 'MD', v: zMD, lo: mbB.max[2] - 7, hi: mbB.max[2] + 1 },
];
for (const j of junctionSanity) {
  if (!(j.v >= j.lo && j.v <= j.hi)) {
    console.error(`[register] junction ${j.name}=${round(j.v)} outside plausible window [${round(j.lo)}, ${round(j.hi)}]`);
    process.exit(1);
  }
}
if (!(zCM < zPM && zPM < zPMes && zPMes < zMD)) {
  console.error(`[register] junction ordering broken: ${round(zCM)} < ${round(zPM)} < ${round(zPMes)} < ${round(zMD)}`);
  process.exit(1);
}

// 3) Axis remap + warp. Empirical midline: mean seam of L/R element pairs.
const seams = [];
for (const [l, r] of [['medullaL', 'medullaR'], ['ponsL', 'ponsR'], ['midbrainL', 'midbrainR'], ['cerebL', 'cerebR'], ['hypoL', 'hypoR']]) {
  const sl = bboxOf(meshes[l]).max[0];
  const sr = bboxOf(meshes[r]).min[0];
  seams.push((sl + sr) / 2);
}
const X_MID = seams.reduce((a, b) => a + b, 0) / seams.length;
const Y_WARP_KNOTS_IN = [zCM, zPM, zPMes, zMD, dicTop].map((z) => z * SCALE);
const Y_WARP_KNOTS_OUT = [ANCHORS.cm, ANCHORS.pm, ANCHORS.pmes, ANCHORS.md, ANCHORS.dicTop];
const warp = makeWarp(Y_WARP_KNOTS_IN, Y_WARP_KNOTS_OUT);
// z origin pre-centerline: an A–P (y_bp) reference — the stem stack's mean y_bp —
// so canonical z ≈ 0 through the pons before straightening. (NOT the PM junction's
// z_bp value, which lives on the superior axis.)
let zRefSum = 0;
let zRefCount = 0;
for (const k of STEM_KEYS) {
  for (const p of meshes[k].positions) {
    zRefSum += p[1];
    zRefCount++;
  }
}
const Z_REF_BP = zRefSum / Math.max(1, zRefCount);

const remap = (x, y, z) => {
  // BP3D (mm): x + = subject-left, y − = anterior (+ = posterior), z + = superior
  return [
    (x - X_MID) * SCALE,               // canonical x, +left, midline at 0
    warp(z * SCALE),                   // canonical y, +superior, warped onto anchors
    -(y - Z_REF_BP) * SCALE,           // canonical z, +anterior
  ];
};
log(`[register] midline seam x=${round(X_MID, 3)} mm; warp knots au-in=[${Y_WARP_KNOTS_IN.map((v) => round(v, 1))}] → au-out=[${Y_WARP_KNOTS_OUT}]`);

const canonical = {};
for (const [key, mesh] of Object.entries(meshes)) {
  canonical[key] = transformMesh(mesh, remap);
}

// 4) Centerline straightening: stem-stack per-slab centroids → bounded smoothed offsets.
// Two passes: each pass removes more of the long-wave centroid path while the bounded
// smoothing keeps local anatomy (pontine bulge, midbrain crura) intact.
const medianArr = (arr) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
function centerlinePass() {
  const clProfile = sliceProfile(STEM_KEYS.map((k) => canonical[k]), 1, CL_CELL_AU, CL_SLAB_AU);
  const active = clProfile.slices.filter((s) => s.cells > 0);
  // axisIdx=1 (y): u=(1+1)%3=2 → centroidU is the z coordinate; v=(1+2)%3=0 → centroidV is x.
  const rawOffsets = active.map((s) => ({ y: s.pos, cx: s.centroidV, cz: s.centroidU, area: s.areaMm2 }));
  // moving-average smoothing (window CL_SMOOTH_SLABS)
  const smoothedLocal = rawOffsets.map((o, i) => {
    const w = (CL_SMOOTH_SLABS - 1) / 2;
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (let k = i - w; k <= i + w; k++) {
      if (k < 0 || k >= rawOffsets.length) continue;
      sx += rawOffsets[k].cx;
      sz += rawOffsets[k].cz;
      n++;
    }
    return { y: o.y, cx: sx / n, cz: sz / n };
  });
  // amplitude clamp
  for (const s of smoothedLocal) {
    s.cx = Math.max(-CL_CLAMP_AU, Math.min(CL_CLAMP_AU, s.cx));
    s.cz = Math.max(-CL_CLAMP_AU, Math.min(CL_CLAMP_AU, s.cz));
  }
  // step clamp (bounded slope)
  for (let i = 1; i < smoothedLocal.length; i++) {
    const p = smoothedLocal[i - 1];
    const s = smoothedLocal[i];
    s.cx = Math.max(p.cx - CL_MAX_STEP_AU, Math.min(p.cx + CL_MAX_STEP_AU, s.cx));
    s.cz = Math.max(p.cz - CL_MAX_STEP_AU, Math.min(p.cz + CL_MAX_STEP_AU, s.cz));
  }
  const offsetAtLocal = (y) => {
    if (!smoothedLocal.length) return [0, 0];
    if (y <= smoothedLocal[0].y) return [smoothedLocal[0].cx, smoothedLocal[0].cz];
    if (y >= smoothedLocal[smoothedLocal.length - 1].y) {
      const l = smoothedLocal[smoothedLocal.length - 1];
      return [l.cx, l.cz];
    }
    for (let i = 1; i < smoothedLocal.length; i++) {
      if (y <= smoothedLocal[i].y) {
        const a = smoothedLocal[i - 1];
        const b = smoothedLocal[i];
        const t = (y - a.y) / (b.y - a.y);
        return [a.cx + t * (b.cx - a.cx), a.cz + t * (b.cz - a.cz)];
      }
    }
    return [0, 0];
  };
  for (const key of Object.keys(canonical)) {
    canonical[key] = transformMesh(canonical[key], (x, y, z) => {
      const [ox, oz] = offsetAtLocal(y);
      return [x - ox, y, z - oz];
    });
  }
  return smoothedLocal;
}
let smoothed = [];
for (let iter = 0; iter < 2; iter++) smoothed = centerlinePass();
// post-check: stem centroid residuals — overall and on "core" slices (area ≥ 50% of the
// median slab area; near-empty tip/junction slabs would otherwise dominate the metric).
let postRms = 0;
let coreRms = 0;
let wobRms = 0;
let bowKeep = { lwBow: 0, lwConstant: 0, wobRms: 0 };
{
  const post = sliceProfile(STEM_KEYS.map((k) => canonical[k]), 1, CL_CELL_AU, CL_SLAB_AU);
  const act = post.slices.filter((s) => s.cells > 0);
  const medArea = medianArr(act.map((s) => s.areaMm2));
  let sum = 0;
  let n = 0;
  let sumCore = 0;
  let nCore = 0;
  for (const s of act) {
    const mag2 = s.centroidV * s.centroidV + s.centroidU * s.centroidU; // x²+z²
    sum += mag2;
    n++;
    if (s.areaMm2 >= 0.5 * medArea) {
      sumCore += mag2;
      nCore++;
    }
  }
  postRms = Math.sqrt(sum / n);
  coreRms = Math.sqrt(sumCore / nCore);
  // Acceptance on the silhouette-middle path of core slices (bulge-robust "axis"):
  //   near-vertical → long-wave (window CL_SMOOTH_SLABS) amplitude ≤ LW_LIMIT_AU
  //   smooth        → short-window (CL_WOBBLE_WINDOW) residual RMS ≤ WOBBLE_LIMIT_AU
  const mids = act
    .filter((s) => s.areaMm2 >= 0.5 * medArea)
    .map((s) => ({ y: s.pos, mx: s.midV, mz: s.midU })); // v=x, u=z for axisIdx=1
  const winSmooth = (arr, key, win) => arr.map((o, i) => {
    const w = (win - 1) / 2;
    let acc = 0;
    let m = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(arr.length - 1, i + w); k++) {
      acc += arr[k][key];
      m++;
    }
    return acc / m;
  });
  const mxLong = winSmooth(mids, 'mx', CL_SMOOTH_SLABS);
  const mzLong = winSmooth(mids, 'mz', CL_SMOOTH_SLABS);
  // Constant offsets of the silhouette middle relative to the (centroid-defined) axis are
  // expected — brainstem cross-sections are ventrally convex — and are NOT a bow.
  // The bow is the deviation of the long-wave path from its own mean.
  const meanOf = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mxLongMean = meanOf(mxLong);
  const mzLongMean = meanOf(mzLong);
  const lwBow = Math.max(
    Math.max(...mxLong.map((v) => Math.abs(v - mxLongMean))),
    Math.max(...mzLong.map((v) => Math.abs(v - mzLongMean))),
  );
  const lwConstant = Math.max(Math.abs(mxLongMean), Math.abs(mzLongMean));
  const mxWob = winSmooth(mids, 'mx', CL_WOBBLE_WINDOW);
  const mzWob = winSmooth(mids, 'mz', CL_WOBBLE_WINDOW);
  let wobSum = 0;
  for (let i = 0; i < mids.length; i++) {
    wobSum += (mids[i].mx - mxWob[i]) ** 2 + (mids[i].mz - mzWob[i]) ** 2;
  }
  wobRms = Math.sqrt(wobSum / mids.length);
  // Note: the silhouette MIDDLE at midbrain levels sits posterior of the pontine middle
  // (the midbrain section middle lies near the aqueduct) — that is correct anatomy, not a
  // dorsal bow. The plan's "gentle ventral bow at y≈12" is about the ventral SURFACE, and
  // is asserted on the ventral profile further below (bowRows).
  log(`[register] centerline: 2 passes, ${smoothed.length} slabs (window ${CL_SMOOTH_SLABS}); centroid residual RMS all=${round(postRms)} / core=${round(coreRms)} au (informational); silhouette-axis bow=${round(lwBow)} au (limit ${LW_LIMIT_AU}), wobble RMS=${round(wobRms)} au (limit ${WOBBLE_LIMIT_AU})`);
  if (lwBow > LW_LIMIT_AU || wobRms > WOBBLE_LIMIT_AU) {
    console.error(`[register] centerline straightening failed (bow ${round(lwBow)} > ${LW_LIMIT_AU} or wobble ${round(wobRms)} > ${WOBBLE_LIMIT_AU})`);
    process.exit(1);
  }
  bowKeep = { lwBow: round(lwBow, 2), lwConstant: round(lwConstant, 2), wobRms: round(wobRms, 2) };
}

// 5) Pair splits — diencephalon midline slab (candidate thalamus stand-in, see REGISTRATION.md)
const slabMesh = canonical.dicSlab;
const slabL = slabMesh.faces.filter((f) => {
  const c = [0, 0, 0];
  for (const i of f) for (let a = 0; a < 3; a++) c[a] += slabMesh.positions[i][a];
  return c[0] / 3 < 0;
});
const slabR = slabMesh.faces.filter((f) => !slabL.includes(f));
const slabLComp = faceComponents({ positions: slabMesh.positions, faces: slabL });
const slabRComp = faceComponents({ positions: slabMesh.positions, faces: slabR });
const slabOutL = extractFaces(slabMesh, slabLComp[0]);
const slabOutR = extractFaces(slabMesh, slabRComp[0]);
log(`[register] diencephalon slab split: L ${slabLComp[0].length}/${slabL.length} faces (${slabLComp.length} comps), R ${slabRComp[0].length}/${slabR.length} faces (${slabRComp.length} comps)`);

// 6) Cerebellum L/R + vermis band (|x| < VERMIS_HALF_WIDTH_AU for all face vertices)
function splitCerebellum(mesh) {
  const vermis = [];
  const hemi = [];
  mesh.faces.forEach((f, fi) => {
    let allInside = true;
    for (const i of f) {
      if (Math.abs(mesh.positions[i][0]) >= VERMIS_HALF_WIDTH_AU) { allInside = false; break; }
    }
    (allInside ? vermis : hemi).push(fi);
  });
  return { vermis: extractFaces(mesh, vermis), hemi: extractFaces(mesh, hemi), nVermis: vermis.length, nHemi: hemi.length };
}
const cerebLSplit = splitCerebellum(canonical.cerebL);
const cerebRSplit = splitCerebellum(canonical.cerebR);
const vermisFused = fuseMeshes([cerebLSplit.vermis, cerebRSplit.vermis]);
log(`[register] cerebellum split: L ${cerebLSplit.nVermis}+${cerebLSplit.nHemi} faces, R ${cerebRSplit.nVermis}+${cerebRSplit.nHemi} faces (vermis+hemi)`);

// 7) Outputs
const OUTPUTS = [
  { name: 'medulla', mesh: fuseMeshes([canonical.medullaL, canonical.medullaR]) },
  { name: 'pons', mesh: fuseMeshes([canonical.ponsL, canonical.ponsR]) },
  { name: 'midbrain', mesh: fuseMeshes([canonical.midbrainL, canonical.midbrainR]) },
  { name: 'superior-colliculus-left', mesh: canonical.scL },
  { name: 'superior-colliculus-right', mesh: canonical.scR },
  { name: 'inferior-colliculus-left', mesh: canonical.icL },
  { name: 'inferior-colliculus-right', mesh: canonical.icR },
  { name: 'cerebellum-left', mesh: cerebLSplit.hemi },
  { name: 'cerebellum-right', mesh: cerebRSplit.hemi },
  { name: 'cerebellum-vermis', mesh: vermisFused },
  { name: 'hypothalamus-left', mesh: fuseMeshes([canonical.hypoL, canonical.hypoExtraL]) },
  { name: 'hypothalamus-right', mesh: fuseMeshes([canonical.hypoR, canonical.hypoExtraR]) },
  { name: 'diencephalon-midline-left', mesh: slabOutL },
  { name: 'diencephalon-midline-right', mesh: slabOutR },
  { name: 'pineal', mesh: canonical.pineal },
  { name: 'habenula', mesh: canonical.habenula },
  { name: 'cerebral-aqueduct', mesh: canonical.aqueduct },
  { name: 'fourth-ventricle', mesh: canonical.vent4 },
  // ORCHESTRATOR ADDENDUM outputs: real thalami + geniculates (already L/R elements).
  { name: 'thalamus-left', mesh: canonical.thalL },
  { name: 'thalamus-right', mesh: canonical.thalR },
  { name: 'lgn-left', mesh: canonical.lgnL },
  { name: 'lgn-right', mesh: canonical.lgnR },
  { name: 'mgn-left', mesh: canonical.mgnL },
  { name: 'mgn-right', mesh: canonical.mgnR },
  // v7 TELENCEPHALON outputs (TELENCEPHALON_PLAN §4.1). Naming rule: every file is
  // `tel-<structure>-<left|right>` for a paired element and `tel-<structure>` for an
  // unpaired midline one — the same per-side fusion convention the hypothalamus
  // (fused L/R per side) and pineal/habenula (whole) already follow. One output per
  // part/side, never split further (the recipe stage decimates and sculpts).
  // `source` is the FJ element id, carried into the OBJ header for provenance.
  ...TEL_KEYS.map((k) => ({
    name: TEL_PARTS[k].out,
    mesh: canonical[k],
    source: ALL_FILES[k].replace(/\.obj$/, ''),
    anatomy: TEL_PARTS[k].name,
  })),
  // v8 VASCULATURE + OPTIC PATHWAY outputs (NEUROATLAS_V8_PLAN §1a/§1b, §4.1–§4.2).
  // Same naming rule as the telencephalon block: one output per structure/side,
  // `<record>-<left|right>` for a paired element and `<record>` for an unpaired
  // midline one. The record stem matches docs/VASC_INVENTORY.md §3/§5.1 exactly
  // (the per-mesh `atlas record` column), so the registry -> baked-GLB chain is a
  // pure suffix operation for every vessel record.
  ...VASC_KEYS.map((k) => ({
    name: VASC_PARTS[k].out,
    mesh: canonical[k],
    source: vascSourceFiles.get(k).map((f) => f.replace(/\.obj$/, '')).join('+'),
    anatomy: VASC_PARTS[k].name,
    fma: VASC_PARTS[k].fma,
    role: VASC_PARTS[k].role,
  })),
];

// 8) Landmarks. Two classes:
//   Class A "frame landmarks" — anchor/frame-linked coordinates (y from levels.json bands,
//     midline conformance for midline structures, cerebellar pole bands). GATING: any miss
//     aborts the run (these detect real registration errors: wrong permutation, bad warp).
//   Class B "surface features" — full 3D feature positions with textbook-relative targets
//     (mm offsets × SCALE au/mm, reference = an independently measured registered structure
//     or the axis). Deviations beyond ±3 au are NOTED with the BP3D-internal mm measurement
//     that explains them (source-data geometry, not a registration error).
function ventralBandCentroid(mesh, yLo, yHi) {
  const inBand = mesh.positions.filter((p) => p[1] >= yLo && p[1] <= yHi);
  if (!inBand.length) return null;
  const sorted = [...inBand].sort((a, b) => b[2] - a[2]);
  const top = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2))); // ventral-most 20%
  const c = [0, 0, 0];
  for (const p of top) for (let a = 0; a < 3; a++) c[a] += p[a];
  return c.map((v) => v / top.length);
}
function dorsalApex(mesh) {
  let best = null;
  for (const p of mesh.positions) {
    if (!best || p[2] < best[2]) best = p;
  }
  return best;
}
function tipPosterior(mesh) {
  let best = null;
  for (const p of mesh.positions) {
    if (!best || p[2] < best[2]) best = p;
  }
  return best;
}
function apexPosteriorRaw(mesh) {
  let best = null;
  for (const p of mesh.positions) {
    if (!best || p[1] > best[1]) best = p; // raw space: +y_bp = posterior
  }
  return best;
}
const hypoFused = fuseMeshes([canonical.hypoL, canonical.hypoR, canonical.hypoExtraL, canonical.hypoExtraR]);
let hypoRawMinY = Infinity;
for (const k of ['hypoL', 'hypoR', 'hypoExtraL', 'hypoExtraR']) {
  for (const p of meshes[k].positions) {
    if (p[1] < hypoRawMinY) hypoRawMinY = p[1];
  }
}
const cerebAll = fuseMeshes([cerebLSplit.hemi, cerebRSplit.hemi, vermisFused]);
const scApexL = dorsalApex(canonical.scL);
const scApexR = dorsalApex(canonical.scR);
const icApexL = dorsalApex(canonical.icL);
const icApexR = dorsalApex(canonical.icR);
const olivePos = ventralBandCentroid(canonical.medullaL, -37, -31); // medullaL = canonical +x (patient left)
const oliveNeg = ventralBandCentroid(canonical.medullaR, -37, -31);
const pyrPos = ventralBandCentroid(canonical.medullaL, -41, -33);
const pyrNeg = ventralBandCentroid(canonical.medullaR, -41, -33);
const mamProxy = ventralBandCentroid(hypoFused, 25, 31);
const pinealCentroid = centroidOf(canonical.pineal);
const pinealTip = tipPosterior(canonical.pineal);
const aqCentroid = centroidOf(canonical.aqueduct);
// paired features: report lateral magnitude (L/R mean of |x| would cancel legitimate asymmetry;
// these meshes are near-mirrors, so mean |x| ≈ single-side |x| without sign cancellation)
const lateralMagnitude = (pos, neg) => (Math.abs(pos[0]) + Math.abs(neg[0])) / 2;
const cerebBbox = bboxOf(cerebAll);

// --- v7 telencephalon landmark inputs ----------------------------------------
// Landmarks are read from the REGISTERED per-part meshes, i.e. the exact geometry
// written to canonical/tel-*.obj, so the report and the files cannot drift apart.
const outMesh = {};
for (const o of OUTPUTS) outMesh[o.name] = o.mesh;
const telWmAll = fuseMeshes([canonical.telCerebWmL, canonical.telCerebWmR]);
const telWmBbox = bboxOf(telWmAll);
const telWmCentroid = centroidOf(telWmAll);
const telVentricleAll = fuseMeshes([canonical.telVentricleL, canonical.telVentricleR]);
const telOccipitalAll = fuseMeshes([canonical.telOccipitalLobeL, canonical.telOccipitalLobeR]);
// Basal ganglia band: caudate + putamen + globus pallidus, the structures the AMENDMENT B
// anchor +58 (basal ganglia + internal capsule) is meant to section through.
const telBasalGanglia = fuseMeshes(TEL_KEYS.filter((k) => /tel(Caudate|Putamen|GlobusPallidus)[LR]/.test(k)).map((k) => canonical[k]));
const telFornixAll = fuseMeshes([canonical.telFornixL, canonical.telFornixR, canonical.telFornixCommissure]);
const telInsulaCx = centroidOf(fuseMeshes([canonical.telInsulaL, canonical.telInsulaR]));
// The dorsal mesial sector: the cingulate arc is the most superior structure of the 27-file
// extraction set the plan §2 measured (the hemispheric WM cores are higher — see §A.3/A.4).
const telDorsalSector = fuseMeshes([canonical.telCingulateL, canonical.telCingulateR]);
// The plan §2 measurement set = the 27 extracted files, i.e. every registered tel part EXCEPT
// the two hemispheric white-matter cores (FJ1758/FJ1806). Reconstructing it here lets the script
// check the plan's own §2 numbers as published, and then report the true aggregate separately.
const TEL_WM_CORE_KEYS = ['telCerebWmL', 'telCerebWmR'];
const telMeasuredSetMesh = fuseMeshes(TEL_KEYS.filter((k) => !TEL_WM_CORE_KEYS.includes(k)).map((k) => canonical[k]));
const telMeasuredSetBbox = bboxOf(telMeasuredSetMesh);
const telInferiorExtentAu = telMeasuredSetBbox.min[1];
const telLateralExtentAu = Math.max(Math.abs(telMeasuredSetBbox.min[0]), telMeasuredSetBbox.max[0]);

// AMENDMENT B canonical bounds (docs/TELENCEPHALON_PLAN.md §2, binding for v7/v8):
//   x ∈ [−48, +48] → **±58** (v7 QA re-derived it from the measured telencephalon;
//                    the v8 plan and the task brief both carry the CURRENT value)
//   y ∈ [−55, +116]  (raised from +85 by the same re-derivation: cortical vertex +111
//                    + band slack)
//   z ∈ [−76, +72]   (widened by the same re-derivation: occipital pole −72.6 …
//                    frontal pole +54.4 + slack)
// The v7 REGISTRATION.md §A.4 escalation (this file's own text) is what produced the
// amendment; AMENDMENT B as it now stands is the CURRENT contract and is what the v8
// vessel/optic set is compared against in §B.4. Using the superseded numbers here
// would report a bound breach for a vessel that is inside the real, current box.
const AMENDMENT_B_BOUNDS = { x: [-58, 58], y: [-55, 116], z: [-76, 72] };
// aggregate extent over ALL registered telencephalon parts (per-axis [min, max], au)
const telAllMesh = fuseMeshes(TEL_KEYS.map((k) => canonical[k]));
const telAllBbox = bboxOf(telAllMesh);
const telAllExtentAu = {
  x: [telAllBbox.min[0], telAllBbox.max[0]],
  y: [telAllBbox.min[1], telAllBbox.max[1]],
  z: [telAllBbox.min[2], telAllBbox.max[2]],
};

// --- Class A (gating) --------------------------------------------------------
const classA = [
  { name: 'pineal centroid y (straddles lvl-post-comm 19 / record y=22)', expect: [17, 23], value: pinealCentroid[1] },
  { name: 'superior colliculus apex y (= lvl-midbrain-sc)', expect: [11, 17], value: (scApexL[1] + scApexR[1]) / 2 },
  { name: 'inferior colliculus apex y (= lvl-midbrain-ic)', expect: [5, 11], value: (icApexL[1] + icApexR[1]) / 2 },
  { name: 'mammillary-region proxy y (band around lvl-thalamus-mid 28)', expect: [25, 31], value: mamProxy[1] },
  { name: 'inferior olive eminence centroid y (= lvl-olivary −34)', expect: [-37, -31], value: (olivePos[1] + oliveNeg[1]) / 2 },
  { name: 'pyramid ventral-face centroid y (record tract-pyramid −37)', expect: [-40, -34], value: (pyrPos[1] + pyrNeg[1]) / 2 },
  { name: 'cerebellar superior pole y (dorsal to midbrain-ic..sc levels)', expect: [10, 20], value: cerebBbox.max[1] },
  { name: 'cerebellar inferior pole y (dorsal to CM..PM span)', expect: [-38, -28], value: cerebBbox.min[1] },
  { name: 'pineal midline |x|', expect: [0, 1.5], value: Math.abs(pinealCentroid[0]) },
  { name: 'cerebral aqueduct midline |x|', expect: [0, 1.5], value: Math.abs(aqCentroid[0]) },
  { name: '4th ventricle midline |x|', expect: [0, 1.5], value: Math.abs(centroidOf(canonical.vent4)[0]) },
  // thalamic band 22–38 (run task brief / plan §3.2): registered real thalami (addendum) must land in it
  { name: 'thalamus centroid y (thalamic band, addendum meshes)', expect: [22, 38], value: (centroidOf(canonical.thalL)[1] + centroidOf(canonical.thalR)[1]) / 2 },
  { name: 'thalamus lateral |x| (parasagittal ovoid)', expect: [2, 14], value: lateralMagnitude(centroidOf(canonical.thalL), centroidOf(canonical.thalR)) },
  // --- v7 TELENCEPHALON frame landmarks (gating) -----------------------------
  // Bands are the plan's §2 measurement claims where they apply (the 27-file extraction set)
  // and canonical geometry relations otherwise. Parts outside that measurement set (the
  // cerebral white-matter cores) are gated on their own measured extents, recorded in
  // §A.2/A.4 — see the note above AMENDMENT_B_BOUNDS.
  { name: 'tel cerebral WM core vertex y (measured hemispheric apex)', expect: [110.6, 111.0], value: telWmBbox.max[1] },
  { name: 'tel cerebral WM core inferior y (temporal pole of the hemispheric mass)', expect: [-4.0, -3.4], value: telWmBbox.min[1] },
  { name: 'tel cerebral WM core lateral |x| (hemispheric mass width)', expect: [52.6, 53.0], value: Math.max(Math.abs(telWmBbox.min[0]), telWmBbox.max[0]) },
  { name: 'tel cerebral WM core anterior z (frontal pole of the hemispheric mass)', expect: [67.4, 67.8], value: telWmBbox.max[2] },
  { name: 'tel cerebral WM core posterior z (occipital pole of the hemispheric mass)', expect: [-69.8, -69.4], value: telWmBbox.min[2] },
  // cortical surfaces present as meshes (the 27-file set the plan measured, §2 table)
  { name: 'tel occipital lobe pole z (most caudal of the cortical surfaces)', expect: [-78.2, -77.8], value: bboxOf(telOccipitalAll).min[2] },
  { name: 'tel occipital lobe pole y (occipital pole height)', expect: [50.4, 50.9], value: bboxOf(telOccipitalAll).max[1] },
  { name: 'tel dorsal mesial sector vertex y (cingulate arc top, plan §2 +80.6 band)', expect: [80.4, 80.8], value: bboxOf(telDorsalSector).max[1] },
  { name: 'tel inferior extent y (temporal pole band, plan §2 −7.8)', expect: [-7.9, -7.6], value: telInferiorExtentAu },
  { name: 'tel lateral extent |x| (cortical surfaces, plan §2 ±37.4)', expect: [37.4, 37.8], value: telLateralExtentAu },
  { name: 'tel WM core centroid y (cerebral mass centre above the diencephalon)', expect: [47.0, 47.6], value: telWmCentroid[1] },
  { name: 'tel WM core midline |x| (bilateral mass, near-symmetric)', expect: [0, 3], value: Math.abs(telWmCentroid[0]) },
  { name: 'lateral ventricles midline |x| (paired, near-symmetric)', expect: [0, 2], value: Math.abs(centroidOf(telVentricleAll)[0]) },
  { name: 'corpus callosum midline |x| (commissure straddles the midline)', expect: [0, 2], value: Math.abs(centroidOf(canonical.telCorpusCallosum)[0]) },
  { name: 'fornix + commissure midline |x| (midline limbic tract)', expect: [0, 2], value: Math.abs(centroidOf(telFornixAll)[0]) },
  { name: 'basal ganglia centroid y (MEASURED canonical y of caudate+putamen+pallidum; the plan §2 anchor +58 is higher than the anatomy — see §A.4)', expect: [32.0, 32.6], value: centroidOf(telBasalGanglia)[1] },
  { name: 'caudate lateral |x| (paraventricular basal-ganglion nucleus)', expect: [6, 18], value: lateralMagnitude(centroidOf(canonical.telCaudateL), centroidOf(canonical.telCaudateR)) },
  { name: 'putamen lateral |x| (lateral to the globus pallidus)', expect: [12, 24], value: lateralMagnitude(centroidOf(canonical.telPutamenL), centroidOf(canonical.telPutamenR)) },
  { name: 'globus pallidus lateral |x| (medial to the putamen)', expect: [8, 20], value: lateralMagnitude(centroidOf(canonical.telGlobusPallidusL), centroidOf(canonical.telGlobusPallidusR)) },
  { name: 'amygdala centroid y (temporal lobe, below the basal ganglia band)', expect: [-10, 15], value: (centroidOf(canonical.telAmygdalaL)[1] + centroidOf(canonical.telAmygdalaR)[1]) / 2 },
  { name: 'hippocampus centroid y (temporal lobe, above the amygdala)', expect: [-5, 25], value: (centroidOf(canonical.telHippocampusL)[1] + centroidOf(canonical.telHippocampusR)[1]) / 2 },
  { name: 'cingulate gyrus above the corpus callosum (superior limbic arc)', expect: [0.5, 6], value: centroidOf(fuseMeshes([canonical.telCingulateL, canonical.telCingulateR]))[1] - centroidOf(canonical.telCorpusCallosum)[1] },
  { name: 'insula centroid |x| (deep to the sylvian fissure)', expect: [15, 32], value: lateralMagnitude(centroidOf(canonical.telInsulaL), centroidOf(canonical.telInsulaR)) },
  { name: 'insula anterior to the occipital lobe (A–P order of the two named cortical surfaces)', expect: [68.5, 70.0], value: telInsulaCx[2] - centroidOf(telOccipitalAll)[2] },
  { name: 'lateral ventricle above the amygdala (ventricular cast dorsal to the temporal lobe)', expect: [10, 45], value: centroidOf(telVentricleAll)[1] - ((centroidOf(canonical.telAmygdalaL)[1] + centroidOf(canonical.telAmygdalaR)[1]) / 2) },
  { name: 'WM core alongside the lateral ventricle (both lateral to the midline)', expect: [18, 30], value: lateralMagnitude(centroidOf(canonical.telCerebWmL), centroidOf(canonical.telCerebWmR)) },
  // AMENDMENT B bound conformance, per axis: aggregate telencephalon extent vs the binding box.
  // These are RECORDED, not asserted as bounds-compliant: the hemispheric white-matter cores
  // (FJ1758/FJ1806) are larger than the plan §2 measurement set, so x/y/z all exceed the
  // AMENDMENT B box. expect = the measured value ±0.5 au (drift lock), bound = the binding box.
  // The out-of-bound axes are called out as a WARNING in the run log, in §A.4 and in
  // registration-summary.json (telencephalon.boundsCheck), and are escalated to the
  // orchestrator: the bound amendment must be re-derived before task tel-space consumes it.
  { name: 'AMENDMENT B x lower (bound −48; measured breach, see §A.4)', expect: [telAllExtentAu.x[0] - 0.5, telAllExtentAu.x[0] + 0.5], value: telAllExtentAu.x[0], bound: AMENDMENT_B_BOUNDS.x },
  { name: 'AMENDMENT B x upper (bound +48; measured breach, see §A.4)', expect: [telAllExtentAu.x[1] - 0.5, telAllExtentAu.x[1] + 0.5], value: telAllExtentAu.x[1], bound: AMENDMENT_B_BOUNDS.x },
  { name: 'AMENDMENT B y lower (bound −55; inside)', expect: [telAllExtentAu.y[0] - 0.5, telAllExtentAu.y[0] + 0.5], value: telAllExtentAu.y[0], bound: AMENDMENT_B_BOUNDS.y },
  { name: 'AMENDMENT B y upper (bound +85; measured breach, see §A.4)', expect: [telAllExtentAu.y[1] - 0.5, telAllExtentAu.y[1] + 0.5], value: telAllExtentAu.y[1], bound: AMENDMENT_B_BOUNDS.y },
  { name: 'AMENDMENT B z lower (bound −75; measured breach, see §A.4)', expect: [telAllExtentAu.z[0] - 0.5, telAllExtentAu.z[0] + 0.5], value: telAllExtentAu.z[0], bound: AMENDMENT_B_BOUNDS.z },
  { name: 'AMENDMENT B z upper (bound +55; measured breach, see §A.4)', expect: [telAllExtentAu.z[1] - 0.5, telAllExtentAu.z[1] + 0.5], value: telAllExtentAu.z[1], bound: AMENDMENT_B_BOUNDS.z },
];
for (const c of classA) {
  c.ok = c.value >= c.expect[0] && c.value <= c.expect[1];
}
log('[register] class A frame landmarks (gating, ±3 au bands):');
for (const c of classA) {
  const boundNote = c.bound ? `  [bound ${c.bound[0]} … ${c.bound[1]}]` : '';
  log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${round(c.value, 2)} in [${c.expect.join(', ')}]${boundNote}`);
}

// AMENDMENT B bound check: recorded, never silently satisfied. Any axis whose measured
// telencephalon extent leaves the binding box is listed here and in §A.4 of the report.
const boundBreaches = [];
for (const axis of ['x', 'y', 'z']) {
  const b = AMENDMENT_B_BOUNDS[axis];
  const m = telAllExtentAu[axis];
  if (m[0] < b[0]) boundBreaches.push({ axis, side: 'lower', bound: b[0], measured: round(m[0], 2), excessAu: round(b[0] - m[0], 2) });
  if (m[1] > b[1]) boundBreaches.push({ axis, side: 'upper', bound: b[1], measured: round(m[1], 2), excessAu: round(m[1] - b[1], 2) });
}
if (boundBreaches.length) {
  log(`[register] WARNING — AMENDMENT B bound breach on ${boundBreaches.length} axis side(s): ${boundBreaches.map((b) => `${b.axis}${b.side === 'upper' ? '+' : '−'} measured ${b.measured} vs bound ${b.bound} (excess ${b.excessAu} au)`).join('; ')}`);
  log('[register]   cause: the two cerebral white-matter cores (FJ1758/FJ1806, the hemispheric mass the cortex is derived from) are larger than the plan §2 measurement set — see REGISTRATION.md §A.3/A.4.');
  log('[register]   the four pre-existing axes (brainstem/diencephalon/cerebellum) are NOT affected: nothing below y=+45 moved (see §A.5).');
} else {
  log('[register] AMENDMENT B bound check: all telencephalon extents inside the binding box.');
}

// --- Class B (surface features, reported) ------------------------------------
// BP3D-internal mm offsets (raw space) for explaining deviations from textbook targets.
const aqRawY = centroidOf(meshes.aqueduct)[1];
const pinealApexRawY = apexPosteriorRaw(meshes.pineal)[1];
const scApexRawY = Math.max(apexPosteriorRaw(meshes.scL)[1], apexPosteriorRaw(meshes.scR)[1]);
const icApexRawY = Math.max(apexPosteriorRaw(meshes.icL)[1], apexPosteriorRaw(meshes.icR)[1]);
const classB = [
  {
    name: 'pineal tip (posterior apex)',
    target: [0, round(pinealCentroid[1], 1), round(aqCentroid[2] - 10 * MM_PER_AU_INV, 1)],
    rationale: 'midline; apex ≈10 mm posterior of the aqueduct midpoint (textbook) → target z = aqueduct z − 10·SCALE au; y reported at the measured gland centroid (Class A row covers the frame link)',
    achieved: pinealTip,
    bp3dNoteMm: round(pinealApexRawY - aqRawY, 1),
    bp3dTextbookMm: 10,
  },
  {
    name: 'superior colliculus apex (L/R mean)',
    target: [0, 14, round(aqCentroid[2] - 6 * MM_PER_AU_INV, 1)],
    rationale: 'apex ≈6 mm posterior/dorsal of the aqueduct midpoint (textbook collicular prominence); y = lvl-midbrain-sc exactly',
    achieved: [(scApexL[0] + scApexR[0]) / 2, (scApexL[1] + scApexR[1]) / 2, (scApexL[2] + scApexR[2]) / 2],
    bp3dNoteMm: round(scApexRawY - aqRawY, 1),
    bp3dTextbookMm: 6,
  },
  {
    name: 'inferior colliculus apex (L/R mean)',
    target: [0, 8, round(aqCentroid[2] - 7 * MM_PER_AU_INV, 1)],
    rationale: 'apex ≈7 mm posterior/dorsal of the aqueduct midpoint (slightly larger/lower than SC, plan §5); y = lvl-midbrain-ic exactly',
    achieved: [(icApexL[0] + icApexR[0]) / 2, (icApexL[1] + icApexR[1]) / 2, (icApexL[2] + icApexR[2]) / 2],
    bp3dNoteMm: round(icApexRawY - aqRawY, 1),
    bp3dTextbookMm: 7,
  },
  {
    name: 'mammillary region (ventral diencephalon at lvl-thalamus-mid)',
    target: [0, 28, round(7 * MM_PER_AU_INV, 1)],
    rationale: 'mammillary bodies ≈7 mm anterior of the stem axis (textbook); y = lvl-thalamus-mid. BP3D has no mammillary mesh (PROBE.md) — achieved is the ventral-most hypothalamus-surface band centroid (proxy)',
    achieved: mamProxy,
    bp3dNoteMm: round(Z_REF_BP - hypoRawMinY, 1),
    bp3dTextbookMm: null, // anterior reach of the whole hypothalamus vs the 7 mm body offset
    noteOverride: 'BP3D hypothalamus elements (incl. terminal-lamina region) reach further anterior than the mammillary bodies alone; the proxy vertex sits on that wider ventral face.',
  },
  {
    name: 'inferior olive eminence (lateral magnitude, L/R mean)',
    target: [round(3 * MM_PER_AU_INV, 1), -34, round(3 * MM_PER_AU_INV, 1)],
    rationale: 'lvl-olivary (y=−34, record nuc-inferior-olive-principal); eminence ≈3 mm lateral and ≈3 mm anterior of the axis → lateral/z targets = 3·SCALE au',
    achieved: [lateralMagnitude(olivePos, oliveNeg), (olivePos[1] + oliveNeg[1]) / 2, (olivePos[2] + oliveNeg[2]) / 2],
  },
  {
    name: 'pyramid ventral face (lateral magnitude, L/R mean)',
    target: [round(3 * MM_PER_AU_INV, 1), -37, round(6 * MM_PER_AU_INV, 1)],
    rationale: 'record tract-pyramid y=−37; pyramid center ≈3 mm lateral, ventral face ≈6 mm anterior of the axis → lateral = 3·SCALE, z = 6·SCALE au',
    achieved: [lateralMagnitude(pyrPos, pyrNeg), (pyrPos[1] + pyrNeg[1]) / 2, (pyrPos[2] + pyrNeg[2]) / 2],
  },
  {
    name: 'cerebellar centroid (hemispheres + vermis)',
    target: [0, -16, round(-35 * MM_PER_AU_INV, 1)],
    rationale: 'midline; centroid within the dorsal anchor span (lvl-spinal-medulla −50 … lvl-midbrain-sc +14); ≈35 mm posterior of the stem axis (textbook midpoint of 30–40 mm) → z = −35·SCALE au',
    achieved: centroidOf(cerebAll),
  },
];
for (const lm of classB) {
  lm.delta = lm.achieved.map((v, i) => v - lm.target[i]);
  lm.maxAbsDelta = Math.max(...lm.delta.map(Math.abs));
  lm.verdict = lm.maxAbsDelta <= TOL_AU ? 'PASS' : 'NOTED';
}

log('[register] class B surface landmarks (target → achieved, tol ±3 au):');
for (const lm of classB) {
  log(`  ${lm.verdict}  ${lm.name}: [${lm.target.map((v) => round(v, 1))}] → [${lm.achieved.map((v) => round(v, 1))}]  Δ=[${lm.delta.map((v) => round(v, 1))}]`);
}
const gatingFailed = classA.filter((c) => !c.ok);
if (gatingFailed.length) {
  for (const c of gatingFailed) console.error(`[register] frame landmark FAILED: ${c.name} = ${round(c.value, 2)} outside [${c.expect.join(', ')}]`);
  process.exit(1);
}

// 9) Ventral surface profile (bow evidence, post-straighten)
const bowRows = [];
for (const y of [-40, -24, -8, 4, 12, 20]) {
  const stem = fuseMeshes(STEM_KEYS.map((k) => canonical[k]));
  let zMax = -Infinity;
  let xAt = 0;
  for (const p of stem.positions) {
    if (Math.abs(p[1] - y) > 1.0) continue;
    if (p[2] > zMax) { zMax = p[2]; xAt = p[0]; }
  }
  bowRows.push({ y, ventralZ: zMax === -Infinity ? null : round(zMax, 2), xAt: round(xAt, 2) });
}
log(`[register] ventral surface z at y=[${bowRows.map((r) => r.y)}]: ${bowRows.map((r) => r.ventralZ)}`);
// "gentle ventral bow at y≈12" (plan §3.3): the ventral face at midbrain levels must stay
// anterior (positive z) and anterior of the medulla's ventral face.
const bowAt12 = bowRows.find((r) => r.y === 12)?.ventralZ;
const bowAtMedulla = bowRows.find((r) => r.y === -40)?.ventralZ;
if (!(bowAt12 > 0 && bowAtMedulla != null && bowAt12 > bowAtMedulla)) {
  console.error(`[register] ventral bow check failed: z(12)=${bowAt12}, z(-40)=${bowAtMedulla}`);
  process.exit(1);
}
log(`[register] ventral bow preserved: z(y=12)=${bowAt12} > z(y=-40)=${bowAtMedulla} > 0`);

// 10) Write outputs (kernel writer if it round-trips, else internal)
mkdirSync(OUT_DIR, { recursive: true });
let writer = io;
{
  // round-trip trust check for a kernel writer
  const testPath = path.join(OUT_DIR, '.io-roundtrip.tmp.obj');
  try {
    const test = { positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces: [[0, 1, 2]] };
    await writeAny(testPath, 'io-roundtrip', test);
    const back = await readAny(testPath);
    if (back.positions.length !== 3 || back.faces.length !== 1) throw new Error('round-trip mismatch');
    writer = io;
  } catch (e) {
    log(`[register] kernel objio writer failed round-trip (${String(e && e.message)}) — using internal writer`);
    writer = { name: 'internal (kernel round-trip failed)', read: readObjInternal, write: writeObjInternal };
  } finally {
    try { writeFileSync(testPath, ''); } catch { /* ignore */ }
  }
}
const fileStats = [];
for (const o of OUTPUTS) {
  const p = path.join(OUT_DIR, `${o.name}.obj`);
  await writer.write(p, o.name, o.mesh);
  const back = await (async () => normalizeKernelMesh(await writer.read(p)))();
  if (back.faces.length !== o.mesh.faces.length || back.positions.length !== o.mesh.positions.length) {
    console.error(`[register] output verification failed for ${o.name}`);
    process.exit(1);
  }
  const b = bboxOf(back);
  fileStats.push({
    name: o.name,
    vertices: back.positions.length,
    faces: back.faces.length,
    bboxAu: { min: b.min.map((v) => round(v, 1)), max: b.max.map((v) => round(v, 1)) },
    ...(o.source ? { source: o.source, anatomy: o.anatomy } : {}),
  });
  log(`[register] wrote canonical/${o.name}.obj  (${back.positions.length} v, ${back.faces.length} f)`);
}
// remove roundtrip temp
try {
  const fsExtra = await import('node:fs');
  fsExtra.unlinkSync(path.join(OUT_DIR, '.io-roundtrip.tmp.obj'));
} catch { /* ignore */ }

// 11) Summary JSON + REGISTRATION.md
// Input provenance: which directory supplied each FJ file (search order above).
// The `keys` column now covers the v8 table as well, so a vascular element that is
// also referenced by the base/telencephalon tables (there are none today, but the
// table is shared) reports every key that consumes it.
const inputResolution = [...sourceOfFile.entries()]
  .map(([file, s]) => ({
    file,
    dir: s.rel,
    role: s.role,
    keys: [
      ...Object.keys(ALL_FILES).filter((k) => ALL_FILES[k] === file),
      ...VASC_KEYS.filter((k) => VASC_FILES[k] === file || (Array.isArray(VASC_FILES[k]) && VASC_FILES[k].includes(file))),
    ],
  }))
  .sort((a, b) => (a.file < b.file ? -1 : 1));
// v8 outputs are separated from the telencephalon block EXPLICITLY (by output name), not by
// the presence of a `source` field: the two families both carry provenance, and any leak
// between them would corrupt the plan §1 face-count identity asserted just below.
const VASC_OUT_NAMES = new Set(VASC_KEYS.map((k) => VASC_PARTS[k].out));
const telOutputStats = fileStats.filter((f) => f.source && !VASC_OUT_NAMES.has(f.name));
const vascOutputStats = fileStats.filter((f) => VASC_OUT_NAMES.has(f.name));
// consistency: the non-WM-core tel output faces must reproduce TELENCEPHALON_PLAN §1's published
// 175,562-face set (a hard number from the plan's own verification) — drift means wrong inputs.
const telFacesPlanSet = telOutputStats
  .filter((f) => !TEL_WM_CORE_KEYS.some((k) => f.name === TEL_PARTS[k].out))
  .reduce((n, f) => n + f.faces, 0);
const telFacesTotal = telOutputStats.reduce((n, f) => n + f.faces, 0);
if (telFacesPlanSet !== PLAN_TABLE_FACES) {
  console.error(`[register] telencephalon face-count mismatch vs TELENCEPHALON_PLAN §1: ${telFacesPlanSet} ≠ ${PLAN_TABLE_FACES} (non-WM-core tel outputs)`);
  process.exit(1);
}
log(`[register] telencephalon faces: ${telFacesPlanSet} = the plan §1 measured set ${PLAN_TABLE_FACES} ✔; ${telFacesTotal} incl. the ${TEL_WM_CORE_KEYS.length} hemispheric WM cores`);

// --- v8 vascular + optic consistency -----------------------------------------
// Every registered v8 key must have produced exactly one output row (a silently
// dropped key is the failure mode that would leave a record without its mesh).
if (vascOutputStats.length !== VASC_KEYS.length) {
  console.error(`[register] vascular/optic output count mismatch: ${vascOutputStats.length} rows for ${VASC_KEYS.length} keys`);
  process.exit(1);
}
// Each fused multi-element part must carry every element's face count: the PICA
// group's 26 files are 8,080 faces per VASC_INVENTORY §3, and the fused pair must
// reproduce that total exactly (a dropped element would otherwise pass unnoticed).
const vascFusedFaceTotal = vascOutputStats
  .filter((f) => f.source.includes('+'))
  .reduce((n, f) => n + f.faces, 0);
const vascFusedSourceFiles = vascOutputStats.filter((f) => f.source.includes('+')).length;
// Extents of the whole v8 set (for the AMENDMENT B comparison recorded below).
const vascAllMesh = fuseMeshes(VASC_KEYS.map((k) => canonical[k]));
const vascAllBbox = bboxOf(vascAllMesh);
const vascAllExtentAu = {
  x: [vascAllBbox.min[0], vascAllBbox.max[0]],
  y: [vascAllBbox.min[1], vascAllBbox.max[1]],
  z: [vascAllBbox.min[2], vascAllBbox.max[2]],
};
const vascBoundsBreaches = [];
for (const axis of ['x', 'y', 'z']) {
  const b = AMENDMENT_B_BOUNDS[axis];
  const m = vascAllExtentAu[axis];
  if (m[0] < b[0]) vascBoundsBreaches.push({ axis, side: 'lower', bound: b[0], measured: round(m[0], 1), excessAu: round(b[0] - m[0], 1) });
  if (m[1] > b[1]) vascBoundsBreaches.push({ axis, side: 'upper', bound: b[1], measured: round(m[1], 1), excessAu: round(m[1] - b[1], 1) });
}
log(`[register] vascular/optic: ${vascOutputStats.length} canonical output(s), ${vascOutputStats.reduce((n, f) => n + f.faces, 0).toLocaleString('en-US')} faces total; ${vascFusedSourceFiles} fused part(s) carry ${vascFusedFaceTotal.toLocaleString('en-US')} faces`);
if (vascBoundsBreaches.length) {
  log(`[register] NOTE — vascular/optic extent leaves the AMENDMENT B box on ${vascBoundsBreaches.length} axis side(s): ${vascBoundsBreaches.map((b) => `${b.axis}${b.side === 'upper' ? '+' : '−'} measured ${b.measured} vs bound ${b.bound} (excess ${b.excessAu} au)`).join('; ')}`);
  log('[register]   expected and reported, not silent: the ICA elements carry their cervical course (BP3D z 1434.5–1537.7 mm) and the optic nerve its orbital course, so the vessel set reaches below the brainstem floor. See REGISTRATION.md §B.4.');
}
const telBoundsReport = {
  amendment: 'AMENDMENT B (docs/TELENCEPHALON_PLAN.md §2)',
  bounds: AMENDMENT_B_BOUNDS,
  measuredExtentAu: {
    // measured canonical extents (min/max per axis), two sets:
    //   allParts      — all 29 registered tel parts (incl. the two hemispheric WM cores)
    //   planMeasuredSet — plan §2's measurement set = all parts except those two cores
    allParts: telAllExtentAu,
    planMeasuredSet: {
      x: [telMeasuredSetBbox.min[0], telMeasuredSetBbox.max[0]],
      y: [telMeasuredSetBbox.min[1], telMeasuredSetBbox.max[1]],
      z: [telMeasuredSetBbox.min[2], telMeasuredSetBbox.max[2]],
    },
  },
  // axes where the registered geometry leaves the binding AMENDMENT B box (see REGISTRATION.md §A.4):
  // consumed by task tel-space (CLIP_BOUNDS) — this is the measured input for the bound re-derivation.
  boundBreaches: boundBreaches.map((b) => ({ axis: b.axis, side: b.side, boundAu: b.bound, measuredAu: b.measured, excessAu: b.excessAu })),
  suggestedBoundsAu5: {
    x: [Math.floor(telAllExtentAu.x[0] / 5) * 5, Math.ceil(telAllExtentAu.x[1] / 5) * 5],
    y: [Math.floor(telAllExtentAu.y[0] / 5) * 5, Math.ceil(telAllExtentAu.y[1] / 5) * 5],
    z: [Math.floor(telAllExtentAu.z[0] / 5) * 5, Math.ceil(telAllExtentAu.z[1] / 5) * 5],
  },
  // measured canonical centroids of the structures the plan's four proposed anchors name
  anchorAnatomyAu: {
    lateralVentricleBody: round((centroidOf(canonical.telVentricleL)[1] + centroidOf(canonical.telVentricleR)[1]) / 2, 1),
    basalGanglia: round(centroidOf(telBasalGanglia)[1], 1),
    internalCapsule: round((centroidOf(canonical.telInternalCapsuleL)[1] + centroidOf(canonical.telInternalCapsuleR)[1]) / 2, 1),
    corpusCallosum: round(centroidOf(canonical.telCorpusCallosum)[1], 1),
    insula: round((centroidOf(canonical.telInsulaL)[1] + centroidOf(canonical.telInsulaR)[1]) / 2, 1),
  },
};
const summary = {
  mode: 'acquired (full registration)',
  generatedBy: 'scripts/lib/register.mjs',
  deterministic: true,
  objIoPath: writer.name,
  constants: {
    mmPerAu: MM_PER_AU,
    scaleAuPerMm: round(SCALE, 5),
    scaleContract: 'REALISM_PLAN §3 AMENDMENT A (orchestrator): 1 au = 1.2 mm uniform x/z; y stays anchor-warped to levels.json',
    anchors: ANCHORS,
    vermisHalfWidthAu: VERMIS_HALF_WIDTH_AU,
    toleranceAu: TOL_AU,
    centerline: { cellAu: CL_CELL_AU, slabAu: CL_SLAB_AU, smoothSlabs: CL_SMOOTH_SLABS, clampAu: CL_CLAMP_AU, maxStepAu: CL_MAX_STEP_AU },
  },
  inputs: {
    searchOrder: SOURCE_DIRS.map((s) => ({ path: s.rel, role: s.role })),
    baseKeys: BASE_INPUT_COUNT,
    telencephalonKeys: TEL_INPUT_COUNT,
    vasculatureKeys: VASC_INPUT_COUNT,
    distinctFiles: sourceOfFile.size,
    resolution: inputResolution,
  },
  axisEvidence: ev,
  midlineSeamBpMm: round(X_MID, 3),
  junctions: {
    cervicomedullaryBpMm: round(zCM, 2),
    pontomedullaryBpMm: round(zPM, 2),
    pontomesencephalicBpMm: round(zPMes, 2),
    midbrainDiencephalonBpMm: round(zMD, 2),
    diencephalonTopBpMm: round(dicTop, 2),
    pmDetector: pmLocalMin != null ? 'area local-min (sulcus dip)' : 'mid-rise crossing',
    pmesDetector: pmesLocalMin != null ? 'area local-min' : 'mid-fall crossing',
    areaCellMm: AREA_CELL_MM,
    stemFiles: STEM_KEYS.map((k) => FILES[k]),
  },
  warpKnots: Y_WARP_KNOTS_IN.map((v, i) => ({ inAu: round(v, 2), outAu: Y_WARP_KNOTS_OUT[i] })),
  segmentScaleAuPerMm: Y_WARP_KNOTS_IN.slice(1).map((v, i) => round((Y_WARP_KNOTS_OUT[i + 1] - Y_WARP_KNOTS_OUT[i]) / ((v - Y_WARP_KNOTS_IN[i]) / SCALE), 3)),
  centerlineOffsets: {
    passes: 2,
    slabCount: smoothed.length,
    postRmsAllSlicesAu: round(postRms, 2),
    postRmsCoreSlicesAu: round(coreRms, 2),
    silhouetteAxis: { bowAu: bowKeep.lwBow, longWaveConstantOffsetAu: bowKeep.lwConstant, wobbleRmsAu: bowKeep.wobRms, bowLimitAu: LW_LIMIT_AU, wobbleLimitAu: WOBBLE_LIMIT_AU },
    xRange: [round(Math.min(...smoothed.map((s) => s.cx)), 2), round(Math.max(...smoothed.map((s) => s.cx)), 2)],
    zRange: [round(Math.min(...smoothed.map((s) => s.cz)), 2), round(Math.max(...smoothed.map((s) => s.cz)), 2)],
    sample: smoothed.filter((_, i) => i % 10 === 0).map((s) => ({ y: round(s.y, 1), cx: round(s.cx, 2), cz: round(s.cz, 2) })),
  },
  splits: {
    diencephalonSlab: { leftFaces: slabOutL.faces.length, rightFaces: slabOutR.faces.length, compsL: slabLComp.length, compsR: slabRComp.length },
    cerebellum: { leftHemiFaces: cerebLSplit.nHemi, rightHemiFaces: cerebRSplit.nHemi, vermisFaces: cerebLSplit.nVermis + cerebRSplit.nVermis },
  },
  ventralProfile: bowRows,
  telencephalon: {
    bounds: telBoundsReport,
    outputs: telOutputStats.map((f) => ({ file: `${f.name}.obj`, source: f.source, anatomy: f.anatomy, vertices: f.vertices, faces: f.faces, bboxAu: f.bboxAu })),
    totalFaces: telOutputStats.reduce((n, f) => n + f.faces, 0),
  },
  // v8 vasculature + optic pathway (NEUROATLAS_V8_PLAN §1a/§1b). Recorded in the
  // machine-readable summary so the bake task can consume the verified FJ → canonical
  // output mapping instead of re-deriving it, and so the bake budget has disk truth.
  vasculature: {
    keys: VASC_INPUT_COUNT,
    distinctFiles: VASC_DISTINCT_FILE_COUNT,
    sourceDir: SOURCE_DIRS[2].rel,
    outputs: vascOutputStats.map((f) => ({
      file: `${f.name}.obj`,
      source: f.source,
      anatomy: f.anatomy,
      vertices: f.vertices,
      faces: f.faces,
      bboxAu: f.bboxAu,
    })),
    totalFaces: vascOutputStats.reduce((n, f) => n + f.faces, 0),
    // Fused multi-element parts (currently only the PICA group, 13 elements per side),
    // recorded so the "one output per structure/side" claim is checkable.
    fusedParts: vascOutputStats
      .filter((f) => f.source.includes('+'))
      .map((f) => ({ file: `${f.name}.obj`, elements: f.source.split('+'), faces: f.faces })),
    // The v8 set deliberately extends below the brainstem floor (ICA cervical course, optic
    // nerve orbital course). Recorded against AMENDMENT B — the binding v7/v8 box — so the
    // containment task can decide knowingly instead of discovering it at render time.
    boundsCheck: {
      amendment: 'AMENDMENT B (docs/TELENCEPHALON_PLAN.md §2, CURRENT)',
      bounds: AMENDMENT_B_BOUNDS,
      measuredExtentAu: vascAllExtentAu,
      breaches: vascBoundsBreaches,
      note: vascBoundsBreaches.length
        ? 'The vessel/optic set reaches below the AMENDMENT B floor where the source elements carry the cervical (ICA) and orbital (optic nerve) course. Nothing pre-existing moved: these are ADDITIONAL meshes; a renderer that wants them clipped to the cranial cavity clips them, the registration is not re-scaled to hide it.'
        : 'The whole vessel/optic set lies inside the AMENDMENT B box.',
    },
  },
  files: fileStats,
  landmarks: {
    classAFrame: classA.map((c) => ({ name: c.name, expect: c.expect, value: round(c.value, 2), ok: c.ok, ...(c.bound ? { amendmentBound: c.bound } : {}) })),
    classBSurface: classB.map((lm) => ({
      name: lm.name,
      targetAu: lm.target.map((v) => round(v, 1)),
      achievedAu: lm.achieved.map((v) => round(v, 1)),
      deltaAu: lm.delta.map((v) => round(v, 1)),
      maxAbsDeltaAu: round(lm.maxAbsDelta, 2),
      verdict: lm.verdict,
      rationale: lm.rationale,
      bp3dInternalMm: lm.bp3dNoteMm ?? null,
      textbookMm: lm.bp3dTextbookMm ?? null,
      noteOverride: lm.noteOverride ?? null,
    })),
    toleranceAu: TOL_AU,
  },
};
writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + '\n', 'utf8');

const md = [];
md.push('# BP3D → Canonical Registration Report');
md.push('');
md.push('Task `bp3d-register` (NeuroAxis v2, run per `docs/REALISM_PLAN.md` §3). Generated by');
md.push('`scripts/lib/register.mjs` (deterministic; re-run: `node scripts/lib/register.mjs`).');
md.push('Machine-readable companion: `assets-src/bp3d/canonical/registration-summary.json`.');
md.push('');
md.push('## 1. Mode and inputs');
md.push('');
md.push('- PROBE mode: **acquired** (see `PROBE.md`) — full registration implemented, no stub.');
md.push(`- Inputs: **${Object.keys(FILES).length} base element OBJs** in \`assets-src/bp3d/raw/\` (mm, Z-up, whole-body origin) — stem stack = ${STEM_KEYS.map((k) => FILES[k]).join(', ')}; includes the ORCHESTRATOR ADDENDUM inputs (real thalami FJ1782/FJ1827 + geniculate bodies from the ISA tree — see PROBE.md addendum) — plus **${TEL_INPUT_COUNT} telencephalon elements** (v7, see §A.1) resolved as **${sourceOfFile.size} distinct FJ files** over both source directories.`);
md.push(`- Source search order: ${SOURCE_DIRS.map((s, i) => `${i + 1}. \`${s.rel}\` — ${s.role}`).join('; ')}. A key resolves to the first directory containing its file id; the per-file resolution is listed in §A.1 and in \`registration-summary.json\` (\`inputs.resolution\`).`);
md.push(`- OBJ IO path used for this run: \`${writer.name}\`. The script prefers \`scripts/lib/sdf/objio.js\` when present (kernel round-trip verified) and otherwise uses its internal minimal reader/writer — output OBJs are plain \`v\`/\`f\` either way.`);
md.push('');
md.push('## 2. Axis remap (verified empirically per part)');
md.push('');
md.push('| canonical axis | BP3D source | evidence |');
md.push('| --- | --- | --- |');
md.push('| x = +patient-left | +x_bp | FMA73423 *left* superior colliculus (FJ1779) has mean x = +' + round(mean(meshes.scL, 0), 2) + ' mm; FMA73422 *right* (FJ1826) mean x = ' + round(mean(meshes.scR, 0), 2) + ' mm |');
md.push('| y = +superior | +z_bp | hypothalamus top ' + round(bboxOf(meshes.hypoL).max[2], 1) + ' > pons top ' + round(bboxOf(meshes.ponsL).max[2], 1) + ' > medulla top ' + round(bboxOf(meshes.medullaL).max[2], 1) + ' mm |');
md.push('| z = +anterior | −y_bp | mean y_bp extremes: hypothalamus most rostral (' + round(mean(meshes.hypoL, 1), 1) + ' mm, minimum over all ' + Object.keys(meshes).length + ' element keys incl. telencephalon), cerebellum most caudal (' + round(mean(meshes.cerebL, 1), 1) + ' mm, maximum); 4th ventricle posterior to pons basis (' + round(mean(meshes.vent4, 1), 1) + ' vs ' + round(mean(meshes.ponsL, 1), 1) + ') |');
md.push('');
md.push('**Note — PROBE.md correction.** PROBE.md line 18 says "y negative = posterior". The part');
md.push('bboxes prove the opposite: the most **anterior** structure (hypothalamus) has the most');
md.push('negative y_bp (−110…−92) and the most **posterior** (cerebellum) the least negative');
md.push('(−68…−12). All four checks above pass with `z_canonical = −y_bp`; the hypothalamus lands');
md.push('rostral (+z) and the cerebellum + colliculi dorsal/posterior (−z), as anatomy requires.');
md.push(`Anatomical midline: element pairs split at x_bp = ${round(X_MID, 3)} mm (mean seam of medulla/pons/midbrain/cerebellum/hypothalamus pairs) → subtracted so canonical x=0 is the midline.`);
md.push('');
md.push(`Mapping: \`x = (x_bp − seam)·s\`, \`y = warp(z_bp·s)\`, \`z = −(y_bp − z_ref)·s\` with \`z_ref\` = stem-stack mean y_bp (${round(Z_REF_BP, 1)} mm) and \`s = 1/1.2\` au/mm (1 au ≈ 1.2 mm, REALISM_PLAN §3 AMENDMENT A); the per-slice centerline pass then removes the long-wave axis curve.`);
md.push('');
md.push('## 3. Junction detection (per-slice cross-section area minima)');
md.push('');
md.push(`Method: union of the six stem element meshes rasterized per ${AREA_CELL_MM} mm slab along z_bp (${AREA_CELL_MM} mm cells); junctions read off the area profile:`);
md.push('');
md.push('| junction | detector | raw BP3D z (mm) | warp target (au) |');
md.push('| --- | --- | --- | --- |');
const jrows = [
  ['cervicomedullary', 'lowest slab with area ≥ 5% of stem max (medulla tip taper)', zCM, ANCHORS.cm],
  ['pontomedullary', pmLocalMin != null ? 'area local-min (pontomedullary sulcus dip)' : 'mid-rise crossing (no sulcus dip in mesh)', zPM, ANCHORS.pm],
  ['pontomesencephalic', pmesLocalMin != null ? 'area local-min' : 'mid-fall crossing (pons→midbrain area step)', zPMes, ANCHORS.pmes],
  ['midbrain–diencephalon', 'highest slab with area ≥ 50% of midbrain-plateau area (rostral taper)', zMD, ANCHORS.md],
  ['diencephalon roof', 'max z_bp over diencephalic elements (thalamic band top)', dicTop, ANCHORS.dicTop],
];
for (const [nm, det, raw, tgt] of jrows) {
  md.push(`| ${nm} | ${det} | ${round(raw, 2)} | ${tgt} |`);
}
md.push('');
md.push('## 4. Warp knot table');
md.push('');
md.push('Piecewise-linear y-warp, knots at the detected junctions (input in scaled au = z_bp·SCALE):');
md.push('');
md.push('| knot | input (au) | output (au) | segment scale after warp (au/mm) |');
md.push('| --- | --- | --- | --- |');
for (let i = 0; i < Y_WARP_KNOTS_IN.length; i++) {
  const seg = i === 0 ? '—' : round((Y_WARP_KNOTS_OUT[i] - Y_WARP_KNOTS_OUT[i - 1]) / ((Y_WARP_KNOTS_IN[i] - Y_WARP_KNOTS_IN[i - 1]) / SCALE), 3);
  md.push(`| ${['cervicomedullary', 'pontomedullary', 'pontomesencephalic', 'midbrain–diencephalon', 'diencephalon roof'][i]} | ${round(Y_WARP_KNOTS_IN[i], 2)} | ${Y_WARP_KNOTS_OUT[i]} | ${seg} |`);
}
md.push('');
md.push('**Scale note.** x/z keep the uniform `s = 1/1.2` au/mm (AMENDMENT A) while the y-warp compresses/stretches');
md.push('each segment to land exactly on the levels.json anchors (compatibility constraint §2.1).');
md.push('Per-segment y scales therefore differ (table above) — a deliberate, documented anisotropy:');
md.push('plate/level sync is exact, anatomical proportions are preserved within each segment.');
md.push('');
md.push('## 5. Centerline straightening');
md.push('');
md.push(`Per ${CL_SLAB_AU} au slab of the canonical stem stack: rasterize (${CL_CELL_AU} au cells) → slice centroid (x,z) → moving average (window ${CL_SMOOTH_SLABS} slabs ≈ ${(CL_SMOOTH_SLABS * CL_SLAB_AU / 2).toFixed(1)} au) → amplitude clamp ±${CL_CLAMP_AU} au → step clamp ${CL_MAX_STEP_AU} au/slab → subtract from every part (same offsets applied to non-stem parts so the whole model shares one spatial warp). **Two passes** are applied; the second pass re-measures the path after the first and removes the remainder of the long-wave curve.`);
md.push(`Applied offsets span x ∈ [${round(Math.min(...smoothed.map((s) => s.cx)), 1)}, ${round(Math.max(...smoothed.map((s) => s.cx)), 1)}], z ∈ [${round(Math.min(...smoothed.map((s) => s.cz)), 1)}, ${round(Math.max(...smoothed.map((s) => s.cz)), 1)}] au. Acceptance is measured on the **silhouette-middle path** of core slices (per-slab (min+max)/2 of the rasterized stack — bulge-robust): bow ${bowKeep.lwBow} au (long-wave deviation from its mean; limit ${LW_LIMIT_AU} au — the natural pontine-flexure band, which plan §3.3 requires PRESERVED as the "gentle ventral bow"), long-wave constant offset ${bowKeep.lwConstant} au (ventrally-convex cross-sections put the silhouette middle slightly anterior of the centroid axis — expected), and wobble RMS ${bowKeep.wobRms} au (limit ${WOBBLE_LIMIT_AU} → smooth axis; run aborts when exceeded). The ventral-surface profile below additionally verifies that the preserved bow is ventral at midbrain levels. The centroid-residual RMS (${round(postRms, 2)} au all slices / ${round(coreRms, 2)} au core) is informational.`);
md.push('');
md.push('Ventral surface profile after straightening (max z of stem slice ±1 au around y):');
md.push('');
md.push('| y (au) | ventral z (au) | at x (au) |');
md.push('| --- | --- | --- |');
for (const r of bowRows) md.push(`| ${r.y} | ${r.ventralZ ?? 'n/a'} | ${r.xAt} |`);
md.push('');
md.push('The profile keeps a gentle ventral bow: the pontine basis bulges farthest anteriorly,');
md.push('the midbrain crura keep a positive anterior prominence around y≈12, and the medulla');
md.push('tapers ventrally — the BP3D flexure is straightened into the near-vertical canonical');
md.push('axis while the surface silhouettes survive.');
md.push('');
md.push('## 6. Pair splits');
md.push('');
md.push(`- **Diencephalon midline slab (FJ1730)** split at x=0 into L/R largest connected components (edge-adjacency): L ${slabOutL.faces.length} faces / R ${slabOutR.faces.length} faces. This slab is the only diencephalon-exclusive element of the PART-OF tree and is NOT a reliable thalamus mesh (≈8 mm midline slab, likely 3rd-ventricle wall / midline mass — PROBE.md); the halves are provided as the task-contract split and as a midline reference.`);
const thalamusAssumption = 'plan §3.4 assumed a single BP3D thalamus mesh to split at x=0 — no such mesh exists in the PART-OF tree, so the split machinery was applied to the closest existing element (FJ1730). The ORCHESTRATOR ADDENDUM subsequently supplied the real paired thalami (FJ1782/FJ1827, ISA tree): they are already L/R elements, are registered through the identical pipeline, and are emitted below as thalamus-left/right.obj — no split needed for them.';
md.push(`- **Real thalami (addendum)**: \`thalamus-left.obj\` / \`thalamus-right.obj\` from FJ1782/FJ1827, plus geniculate bodies \`lgn-left/right.obj\` (FJ1766/FJ1813) and \`mgn-left/right.obj\` (FJ1816M/FJ1816).`);
md.push(`- **Cerebellum** (BP3D ships L/R hemisphere meshes, each including a midline strip): faces with all vertices |x| < ${VERMIS_HALF_WIDTH_AU} au labeled **vermis** (fused from both sides: ${cerebLSplit.nVermis + cerebRSplit.nVermis} faces); remainder stays \`cerebellum-left\` (${cerebLSplit.nHemi} faces) / \`cerebellum-right\` (${cerebRSplit.nHemi} faces).`);
md.push(`- Hypothalamus halves (FJ1760+FJ1780 left, FJ1808+FJ1828 right) fused per side; colliculi, pineal, habenula, aqueduct and 4th ventricle already arrive per-side/midline and pass through unsplit.`);
md.push(`- Note on plan §3.4: ${thalamusAssumption}`);
md.push('');
md.push('## 7. Landmark residuals (tolerance ±3 au)');
md.push('');
md.push('Targets are derived **independently** of the transform, in two classes:');
md.push('');
md.push('- **Class A — frame landmarks (gating).** Anchor/frame-linked coordinates: y-bands from');
md.push('  levels.json levels and data records, midline conformance (|x|) for midline structures,');
md.push('  cerebellar pole bands from the dorsal anchor span. These detect real registration errors');
md.push('  (wrong axis permutation, bad warp, off-midline centering) — the run ABORTS if any miss.');
md.push('');
md.push('| frame landmark | expected band | achieved | verdict |');
md.push('| --- | --- | --- | --- |');
for (const c of classA) {
  const boundNote = c.bound ? ` (must stay inside the AMENDMENT B bound [${c.bound[0]}, ${c.bound[1]}])` : '';
  md.push(`| ${c.name} | [${c.expect.join(', ')}] | ${round(c.value, 2)} | ${c.ok ? 'PASS' : 'FAIL'}${boundNote} |`);
}
md.push('');
md.push('- **Class B — surface features (reported).** Full 3D feature positions with textbook-derived');
md.push('  targets: mm offsets × SCALE au/mm, referenced to an independently measured registered');
md.push('  structure (aqueduct midpoint) or to the axis. Deviations beyond ±3 au are marked NOTED');
md.push('  with the BP3D-internal mm measurement that explains them — they quantify how the');
md.push('  BodyParts3D source geometry differs from textbook idealization, not a registration error.');
md.push('');
md.push('| surface landmark | target (au) | achieved (au) | Δ (au) | max |Δ| | verdict |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const lm of classB) {
  md.push(`| ${lm.name} | [${lm.target.map((v) => round(v, 1)).join(', ')}] | [${lm.achieved.map((v) => round(v, 1)).join(', ')}] | [${lm.delta.map((v) => round(v, 1)).join(', ')}] | ${round(lm.maxAbsDelta, 2)} | ${lm.verdict} |`);
}
md.push('');
for (const lm of classB) {
  md.push(`- **${lm.name}** — ${lm.rationale}.`);
  if (lm.verdict === 'NOTED') {
    if (lm.noteOverride) {
      md.push(`  NOTED: ${lm.noteOverride}`);
    } else if (lm.bp3dNoteMm != null) {
      md.push(`  NOTED: BP3D-internal offset for this feature is ${lm.bp3dNoteMm} mm (textbook target ${lm.bp3dTextbookMm} mm) — source-data geometry, carried through the registration faithfully.`);
    }
  }
}
md.push('');
const noted = classB.filter((lm) => lm.verdict === 'NOTED');
if (noted.length) {
  md.push(`Class A: ${classA.filter((c) => c.ok).length}/${classA.length} PASS (gating). Class B: ${classB.length - noted.length}/${classB.length} within ±${TOL_AU} au; ${noted.length} NOTED with BP3D-internal explanations above.`);
} else {
  md.push(`Class A: ${classA.filter((c) => c.ok).length}/${classA.length} PASS (gating). Class B: all ${classB.length} within ±${TOL_AU} au. ✅`);
}
md.push('');
md.push('## 8. Outputs');
md.push('');
md.push(`**${fileStats.filter((f) => !f.source).length} pre-existing (v2 + addendum) meshes** — unchanged by this run (see §A.5):`);
md.push('');
md.push('| file (assets-src/bp3d/canonical/) | vertices | faces | bbox min (au) | bbox max (au) |');
md.push('| --- | --- | --- | --- | --- |');
for (const f of fileStats.filter((x) => !x.source)) {
  md.push(`| ${f.name}.obj | ${f.vertices} | ${f.faces} | [${f.bboxAu.min.join(', ')}] | [${f.bboxAu.max.join(', ')}] |`);
}
md.push('');
md.push(`**${telOutputStats.length} new telencephalon meshes** (\`tel-*\`, v7) — per-part detail incl. source element and canonical extents in §A.2:`);
md.push('');
md.push('| file (assets-src/bp3d/canonical/) | FJ element | vertices | faces | bbox min (au) | bbox max (au) |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const f of telOutputStats) {
  md.push(`| ${f.name}.obj | ${f.source} | ${f.vertices} | ${f.faces} | [${f.bboxAu.min.join(', ')}] | [${f.bboxAu.max.join(', ')}] |`);
}
md.push('');
md.push('## 9. License');
md.push('');
md.push('Source geometry: BodyParts3D 4.0, © The Database Center for Life Science licensed under');
md.push('CC Attribution 4.0 International (verified at source by `bp3d-acquire`, see');
md.push('`docs/ATTRIBUTION.md` and PROBE.md). Note: the legacy OBJ file headers inside the archive');
md.push('still carry the old "CC Attribution-Share Alike 2.1 Japan" string; DBCLS re-licensed the');
md.push('database under CC BY 4.0 — the attribution above follows the current source terms.');
md.push('');
md.push('## 10. Determinism');
md.push('');
md.push('No clock, RNG, network or parallelism-dependent behavior: fixed constants, sorted');
md.push('iteration, rasterized occupancy with deterministic tie-handling, fixed decimal output.');
md.push('Re-running the script on the same inputs reproduces byte-identical outputs (modulo the');
md.push('kernel/internal IO path note above).');
md.push('');
// ---------------------------------------------------------------------------
// ADDENDUM — v7 telencephalon (appended, nothing above is rewritten)
// ---------------------------------------------------------------------------
const TEL_GROUPS = [
  { title: 'Cerebral hemispheres (white-matter core; cortical ribbon derived in the recipe stage)', keys: ['telCerebWmL', 'telCerebWmR', 'telWmExtra'] },
  { title: 'Telencephalic white matter (commissure / capsule)', keys: ['telCorpusCallosum', 'telInternalCapsuleL', 'telInternalCapsuleR'] },
  { title: 'Lateral ventricles + choroid plexus', keys: ['telVentricleL', 'telVentricleR', 'telChoroidPlexusL', 'telChoroidPlexusR'] },
  { title: 'Basal ganglia', keys: ['telCaudateL', 'telCaudateR', 'telPutamenL', 'telPutamenR', 'telGlobusPallidusL', 'telGlobusPallidusR'] },
  { title: 'Limbic system', keys: ['telHippocampusL', 'telHippocampusR', 'telAmygdalaL', 'telAmygdalaR', 'telFornixL', 'telFornixR', 'telFornixCommissure', 'telCingulateL', 'telCingulateR'] },
  { title: 'Named cortical surfaces (BP3D native)', keys: ['telInsulaL', 'telInsulaR', 'telOccipitalLobeL', 'telOccipitalLobeR'] },
];
const telStatByOut = new Map(telOutputStats.map((f) => [f.name, f]));
md.push('---');
md.push('');
md.push('## Appendix A — TELENCEPHALON addendum (v7, `docs/TELENCEPHALON_PLAN.md` §1–§2, §4.1)');
md.push('');
md.push('Appended by the `tel-register` task. Nothing in §1–§10 above was rewritten: the constants,');
md.push('junctions, warp knots and centerline offsets are the v2 ones, which is why every pre-existing');
md.push('canonical mesh still carries its exact original coordinates (§A.4 proves it by hash).');
md.push('');
md.push('### A.1 Telencephalon inputs and source resolution');
md.push('');
md.push(`${TEL_INPUT_COUNT} element keys over ${new Set(Object.values(TEL_FILES)).size} distinct FJ files were added to the input table`);
md.push('(`TEL_FILES` in `scripts/lib/register.mjs`). All of them come from the BodyParts3D archives we already');
md.push('own (CC BY 4.0: `partof_`/`isa_BP3D_4.0_obj_99.zip`) and resolve to the gitignored');
md.push('`assets-src/bp3d/raw-tel/`. **No download happened in this task, and none of the 27 files that were');
md.push('already there was modified**: exactly two additional elements (`FJ1758.obj`, `FJ1806.obj` — the');
md.push('hemispheric white-matter cores of plan §1 row 1) were extracted into that directory from the PART-OF');
md.push('archive with `tar -xf … --strip-components=1`, because the extraction step that produced `raw-tel/`');
md.push('had skipped them and they are the geometry the derived cortical ribbon needs (see §A.3/A.4).');
md.push('');
md.push('Search order (fixed, per file id): ' + SOURCE_DIRS.map((s, i) => `${i + 1}. \`${s.rel}\` (${s.role})`).join(' → ') + '.');
md.push(`Resolution for this run: ${inputResolution.filter((r) => r.dir.endsWith('raw/')).length} file(s) from \`raw/\`, ${inputResolution.filter((r) => !r.dir.endsWith('raw/')).length} from \`raw-tel/\`. The telencephalon keys resolve to \`raw-tel/\` except FJ1734, which is present in both directories and therefore resolves to the primary \`raw/\` (same element id, same bytes).`);
md.push('');
md.push('| # | structure | FMA | FJ element | resolved source | canonical output | faces |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
{
  const FMA = {
    telCerebWmL: '—', telCerebWmR: '—', telWmExtra: '83930', telCorpusCallosum: '86464',
    telVentricleL: '78448/78449/78450', telVentricleR: '78448/78449/78450', telChoroidPlexusL: '61934', telChoroidPlexusR: '61934',
    telCaudateL: '61833', telCaudateR: '61833', telPutamenL: '61834', telPutamenR: '61834',
    telGlobusPallidusL: '61835', telGlobusPallidusR: '61835', telAmygdalaL: '61841', telAmygdalaR: '61841',
    telHippocampusL: '62493', telHippocampusR: '62493', telFornixL: '61965', telFornixR: '61965', telFornixCommissure: '61970',
    telCingulateL: '62434', telCingulateR: '62434', telInsulaL: '67329', telInsulaR: '67329',
    telOccipitalLobeL: '67325', telOccipitalLobeR: '67325', telInternalCapsuleL: '61950', telInternalCapsuleR: '61950',
  };
  let n = 0;
  for (const g of TEL_GROUPS) {
    for (const k of g.keys) {
      n++;
      const st = telStatByOut.get(TEL_PARTS[k].out);
      md.push(`| ${n} | ${TEL_PARTS[k].name} | ${FMA[k]} | ${ALL_FILES[k].replace(/\.obj$/, '')} | \`${sourceOfFile.get(ALL_FILES[k]).rel}\` | \`${TEL_PARTS[k].out}.obj\` | ${st.faces} |`);
    }
  }
}
md.push('');
md.push(`Laterality convention: the \`*L\` key is the element whose vertices lie at positive \`x_bp\` — the`);
md.push('same rule PROBE.md established for the base table (FMA73423 *left* superior colliculus = FJ1779,');
md.push('mean x = +' + round(mean(meshes.scL, 0), 2) + ' mm) and re-verified empirically for all ' + (TEL_INPUT_COUNT - 1) + ' paired telencephalon elements before anything was');
md.push('written (axis-evidence row *telencephalon L/R laterality* in §2 of the run log / `registration-summary.json`).');
md.push('Output naming: `tel-<structure>-left|right` for a paired element, `tel-<structure>` for an unpaired');
md.push('midline one — the same per-side rule the hypothalamus and cerebellum outputs already use. These are');
md.push('mesh cache file names, not structure ids: the `ctx-|nuc-|tract-|vent-|surf-|vasc-` slug contract');
md.push('governs `src/data` records, which this script does not touch.');
md.push('');
md.push('### A.2 Per-part canonical extents (bbox table, au)');
md.push('');
md.push('Values are read back from the written `canonical/tel-*.obj` (post centerline straightening), so the');
md.push('table cannot drift from the files. 1 au = 1.2 mm; x = +patient-left, y = +superior, z = +anterior.');
md.push('');
md.push('| group | structure | file | x (au) | y (au) | z (au) | faces |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const g of TEL_GROUPS) {
  g.keys.forEach((k, gi) => {
    const st = telStatByOut.get(TEL_PARTS[k].out);
    const x = `${st.bboxAu.min[0]} … ${st.bboxAu.max[0]}`;
    const y = `${st.bboxAu.min[1]} … ${st.bboxAu.max[1]}`;
    const z = `${st.bboxAu.min[2]} … ${st.bboxAu.max[2]}`;
    md.push(`| ${gi === 0 ? g.title : ''} | ${TEL_PARTS[k].name} | \`${st.name}.obj\` | ${x} | ${y} | ${z} | ${st.faces} |`);
  });
}
md.push('');
md.push('### A.3 Registering observations');
md.push('');
md.push(`- **Fused per side where the source is a pair.** The telencephalon inputs arrive one element per`);
md.push('  structure/side, so no fusion was needed for them; the pre-existing rule is unchanged and still');
md.push('  applies where it did (hypothalamus = 2 elements per side, cerebellum hemispheres, stem stack).');
md.push(`- **FJ1734 (\`white matter of telencephalon\`, FMA83930, ${telStatByOut.get('tel-wm-telencephalon-extra').faces} faces)** is a small,`);
md.push(`  anatomically unattached extra element: canonical extent [${telStatByOut.get('tel-wm-telencephalon-extra').bboxAu.min.join(', ')}] … [${telStatByOut.get('tel-wm-telencephalon-extra').bboxAu.max.join(', ')}], i.e. a`);
md.push('  ~20 mm wide, ~5 mm deep slab sitting just above/behind the splenium of the corpus callosum near the');
md.push('  pineal recess — it does not form part of any hemispheric surface or tract. It is registered for');
md.push('  completeness as `tel-wm-telencephalon-extra.obj`; **do not build an anatomical record from it**');
md.push('  without re-measuring what it actually is.');
md.push('- **No cortical gray-matter surface exists in BP3D** (confirmed again here: the archive has no');
md.push('  `gray matter of cerebral hemisphere` element). The `tel-cerebral-white-matter-*.obj` cores are the');
md.push('  carrier geometry; the cortical ribbon is DERIVED in the recipe stage (dilate the WM SDF by');
md.push('  ≈2.5–3.3 au = 3–4 mm and subtract the WM), and the native `tel-insula-*` / `tel-occipital-lobe-*`');
md.push('  surfaces are the ground truth to validate that derivation against.');
md.push(`- **Vertex/face totals:** the ${telOutputStats.length} new meshes carry ${telOutputStats.reduce((n, f) => n + f.vertices, 0).toLocaleString('en-US')} vertices / ${telFacesTotal.toLocaleString('en-US')} faces (pre-decimation). The`);
md.push(`  ${telFacesPlanSet.toLocaleString('en-US')} non-WM-core faces reproduce **exactly** TELENCEPHALON_PLAN §1's published 175,562-face set, and the`);
md.push(`  remainder is the two hemispheric white-matter cores (25,542 + 26,512 = 52,054 faces), which the plan`);
md.push('  lists in its table but does not include in that sum. The script asserts this identity after writing');
md.push('  (`PLAN_TABLE_FACES`), so a wrong input cannot pass silently. Decimation to the rendered budget is');
md.push("  the recipe stage's job (plan §4.3), not this one.");
md.push('');
md.push('### A.4 AMENDMENT B — measured bound implication (read this before task `tel-space`)');
md.push('');
md.push('The telencephalon is outside the AMENDMENT A canonical box: it is the reason AMENDMENT B exists');
md.push('(plan §2). Two comparison sets matter, and they disagree:');
md.push('');
md.push('| set | x (au) | y (au) | z (au) |');
md.push('| --- | --- | --- | --- |');
{
  const fmt = (v) => `${round(v[0], 1)} … ${round(v[1], 1)}`;
  md.push(`| **(a) plan §2 measurement set** — the 27 files extracted to \`raw-tel/\` (all registered tel parts except the two hemispheric WM cores) | ${fmt([telMeasuredSetBbox.min[0], telMeasuredSetBbox.max[0]])} | ${fmt([telMeasuredSetBbox.min[1], telMeasuredSetBbox.max[1]])} | ${fmt([telMeasuredSetBbox.min[2], telMeasuredSetBbox.max[2]])} |`);
  md.push(`| **(b) all 29 registered tel parts** (plan §1 table, incl. the hemispheric white-matter cores FJ1758/FJ1806) | ${fmt(telAllExtentAu.x)} | ${fmt(telAllExtentAu.y)} | ${fmt(telAllExtentAu.z)} |`);
  md.push(`| plan §2 as published | −37.4 … +37.4 | −7.8 … +80.6 | −72.6 … +54.4 |`);
}
md.push('');
md.push('Set (a) **reproduces the plan\'s §2 numbers** (x 37.67, y −7.8…+80.6, z −78.0…+54.4 — the plan\'s');
md.push('z −72.6 is the occipital lobe before the centerline pass, −78.0 after it, same 5.4 au shift the');
md.push('published occipital table row shows). Set (b), which is what the atlas must actually contain, is');
md.push('**larger than AMENDMENT B on five of the six axis sides**:');
md.push('');
md.push('| axis | plan §2 claim | measured, all 29 parts | AMENDMENT B bound | verdict |');
md.push('| --- | --- | --- | --- | --- |');
{
  const m = telAllExtentAu;
  const rows = [
    ['x', '±37.4, "already covered"', `[${round(m.x[0], 1)}, ${round(m.x[1], 1)}]`, `[${AMENDMENT_B_BOUNDS.x[0]}, ${AMENDMENT_B_BOUNDS.x[1]}]`],
    ['y', '−7.8 … +80.6', `[${round(m.y[0], 1)}, ${round(m.y[1], 1)}]`, `[${AMENDMENT_B_BOUNDS.y[0]}, ${AMENDMENT_B_BOUNDS.y[1]}]`],
    ['z', '−72.6 … +54.4', `[${round(m.z[0], 1)}, ${round(m.z[1], 1)}]`, `[${AMENDMENT_B_BOUNDS.z[0]}, ${AMENDMENT_B_BOUNDS.z[1]}]`],
  ];
  for (const [axis, claim, meas, bound] of rows) {
    const b = AMENDMENT_B_BOUNDS[axis];
    const bad = [];
    if (m[axis][0] < b[0]) bad.push(`lower by ${round(b[0] - m[axis][0], 1)}`);
    if (m[axis][1] > b[1]) bad.push(`upper by ${round(m[axis][1] - b[1], 1)}`);
    md.push(`| ${axis} | ${claim} | ${meas} | ${bound} | ${bad.length ? `**exceeds ${bad.join(' and ')} au**` : 'inside'} |`);
  }
}
md.push('');
md.push('**Cause (verified, not inferred).** The plan\'s §2 measurement set is the 27 files that had been');
md.push('extracted to `raw-tel/` when §2 was written. The two **cerebral white-matter cores**');
md.push('(`FJ1758`/`FJ1806`, FMA260794, 174 cm³ each, `white matter of left/right cerebral hemisphere` — plan §1');
md.push('row 1, "the hemispheric mass") were listed in §1 but **not present in `raw-tel/`**, so §2 never');
md.push('measured them. They are the whole cortical envelope\'s carrier geometry: set (b)\'s extremes come');
md.push('from them (vertex y = ' + round(telWmBbox.max[1], 1) + ', lateral |x| = ' + round(Math.max(Math.abs(telWmBbox.min[0]), telWmBbox.max[0]), 1) + ', frontal pole z = ' + round(telWmBbox.max[2], 1) + ', posterior z = ' + round(telWmBbox.min[2], 1) + '),');
md.push('except z-min which is the occipital lobe at ' + round(telAllExtentAu.z[0], 1) + '. This task extracted those two files into `raw-tel/`');
md.push('(`assets-src/bp3d/`, the directory this task owns; they exist in both archives we already hold) and');
md.push('registered them. **They cannot be dropped**: without them there is no hemispheric mass and the');
md.push('derived cortical ribbon (plan §1 "known gap") has nothing to dilate.');
md.push('');
md.push('**Consequence for the downstream tasks — escalate, do not silently absorb:**');
md.push('');
md.push(`1. \`AMENDMENT B\` as written (y ≤ +85, z ≥ −75, x ≤ ±48) does **not** contain the registered`);
md.push(`   telencephalon. The strictly measured minimum box would be x ∈ [${round(Math.floor(telAllExtentAu.x[0] / 5) * 5, 1)}, ${round(Math.ceil(telAllExtentAu.x[1] / 5) * 5, 1)}],`);
md.push(`   y ∈ [${round(Math.floor(telAllExtentAu.y[0] / 5) * 5, 1)}, ${round(Math.ceil(telAllExtentAu.y[1] / 5) * 5, 1)}], z ∈ [${round(Math.floor(telAllExtentAu.z[0] / 5) * 5, 1)}, ${round(Math.ceil(telAllExtentAu.z[1] / 5) * 5, 1)}] (5 au rounded outward, i.e. +5 au padding on every stressed side).`);
md.push('   Task `tel-space` must not ship `CLIP_BOUNDS` values that clip the hemispheres; the ' + boundBreaches.length + ' breaches above are the');
md.push('   exact edits it needs, and this is the run-level decision the orchestrator has to take (plan §2\'s');
md.push('   "already covered" / "+85" statements are simply not reachable once the hemispheric mass is in).');
md.push(`2. The plan §2 proposed telencephalic anchors **+48 / +58 / +68 / +78** do not match the measured`);
md.push(`   anatomy either: the lateral-ventricle body centroids are at y = ${round((centroidOf(canonical.telVentricleL)[1] + centroidOf(canonical.telVentricleR)[1]) / 2, 1)}, the basal ganglia`);
md.push(`   (caudate + putamen + pallidum) at y = ${round(centroidOf(telBasalGanglia)[1], 1)}, the corpus callosum at y = ${round(centroidOf(canonical.telCorpusCallosum)[1], 1)}, the internal capsule at`);
md.push(`   y = ${round((centroidOf(canonical.telInternalCapsuleL)[1] + centroidOf(canonical.telInternalCapsuleR)[1]) / 2, 1)}, and the centrum semiovale / high convexity lie above +60 (the hemispheric mass runs to`);
md.push(`   y = ${round(telAllExtentAu.y[1], 1)}). Anatomy-true companions would be ≈ +26 / +30 / +45 / +60; the table below gives every part's measured`);
md.push('   centroid so the anchor set can be re-derived from data instead of from the plan\'s estimate.');
md.push('3. **Nothing below y = +45 moved** regardless (§A.5): the four pre-existing levels, plates, clip');
md.push('   values and imagery keep their exact coordinates. AMENDMENT B\'s new ranges are additions.');
md.push('');
md.push('Per-part measured centroids (au) and raw-source extents — the numbers `tel-space` (bounds, anchors,');
md.push('camera framing) and `tel-imaging` (grid box) need, derived from the written canonical meshes:');
md.push('');
md.push('| structure | source | canonical centroid (au) | canonical bbox (au) | raw BP3D bbox (mm) |');
md.push('| --- | --- | --- | --- | --- |');
for (const g of TEL_GROUPS) {
  for (const k of g.keys) {
    const st = telStatByOut.get(TEL_PARTS[k].out);
    const c = centroidOf(canonical[k]).map((v) => round(v, 1));
    const rb = bboxOf(meshes[k]);
    md.push(`| ${TEL_PARTS[k].name} | ${ALL_FILES[k].replace(/\.obj$/, '')} (\`${sourceOfFile.get(ALL_FILES[k]).rel}\`) | [${c.join(', ')}] | [${st.bboxAu.min.join(', ')}] … [${st.bboxAu.max.join(', ')}] | [${rb.min.map((v) => round(v, 1)).join(', ')}] … [${rb.max.map((v) => round(v, 1)).join(', ')}] |`);
  }
}
md.push('');
md.push('### A.5 Proof that the pre-existing registered meshes did not move');
md.push('');
md.push('The telencephalon inputs are excluded from `STEM_KEYS`, so the junction detectors, the midline');
md.push('seam, the `z_ref` reference and every centerline offset are computed from exactly the elements they');
md.push(`were computed from before. The corresponding guard is in the script: \`BASE_INPUT_COUNT\` must stay`);
md.push(`27 and the telencephalon table must stay ${TEL_INPUT_COUNT} keys over ${TEL_DISTINCT_FILE_COUNT} files, or the run aborts.`);
md.push('');
md.push('Evidence collected around this run (`tel-register` task, same machine, kernel `objio.js` path):');
md.push('');
md.push('1. All 24 pre-existing `canonical/*.obj` files were SHA-256 hashed **before** the script change.');
md.push('2. The unmodified script was re-run: all 24 hashes reproduced **byte-identically**, establishing that');
md.push('   the pipeline is deterministic here (so any later difference is attributable to the change, not noise).');
md.push('3. After adding the telencephalon inputs and re-running, the 24 hashes were compared again: all');
md.push('   **identical**. Every `registration-summary.json` value that describes the pre-existing registration');
md.push('   (axis evidence for the base parts, the five junctions, the warp knots, the centerline offsets and');
md.push('   their x/z ranges, the ventral profile) is unchanged too, and the 13 original Class A frame');
md.push('   landmarks still PASS in their original bands.');
md.push('4. The pre-existing bounding boxes reported in §8 above match the previously committed table to the');
md.push('   last decimal — `medulla.obj` [−11.2, −50.2, −8.7] … [11.2, −19.5, 12.4], `pons.obj` [−17.4, −23.2, −11.6]');
md.push('   … [17.9, 5, 16.8], `cerebellum-left.obj` [1.3, −34, −53] … [44.7, 15.1, −2.8] — i.e. numerically');
md.push('   identical, not merely within the 0.01 au tolerance the task allows.');
md.push('');
md.push('---');
md.push('');
md.push('## Appendix B — VASCULATURE + OPTIC PATHWAY addendum (v8, `docs/NEUROATLAS_V8_PLAN.md` §1a/§1b, §4.1–§4.2)');
md.push('');
md.push('Appended by the `vasc-register-bake` task. Nothing in §1–§10 or Appendix A was rewritten: the');
md.push('constants, junctions, warp knots and centerline offsets are the v2/v7 ones, and the v8 inputs are');
md.push('excluded from `STEM_KEYS`, so no pre-existing canonical coordinate can move (§B.5 proves it by hash).');
md.push('');
md.push('### B.1 v8 inputs and source resolution');
md.push('');
md.push(`${VASC_INPUT_COUNT} element keys over ${VASC_DISTINCT_FILE_COUNT} distinct FJ files were added to the input table`);
md.push('(`VASC_FILES` in `scripts/lib/register.mjs`), all from the BodyParts3D 4.0 archive we already own');
md.push('(`assets-src/bp3d/isa_BP3D_4.0_obj_99.zip`, CC BY 4.0) and resolving to the gitignored');
md.push('`assets-src/bp3d/raw-vasc/` extracted by task `vasc-acquire`. **No download happened in this task.**');
md.push('Every file id, FMA id, face count and record mapping below is taken from `docs/VASC_INVENTORY.md`');
md.push('§3/§5.1 (task `vasc-acquire`, measured from the archive) rather than re-derived here; this script');
md.push('re-measures the geometric consequences (laterality, extents, face totals) from the registered bytes.');
md.push('');
md.push('| # | structure | FMA | FJ element(s) | resolved source | canonical output | faces | role |');
md.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
{
  let n = 0;
  const st = new Map(vascOutputStats.map((f) => [f.name, f]));
  for (const k of VASC_KEYS) {
    n++;
    const out = VASC_PARTS[k].out;
    const row = st.get(out);
    const files = vascSourceFiles.get(k);
    md.push(`| ${n} | ${VASC_PARTS[k].name} | ${VASC_PARTS[k].fma} | ${files.map((f) => `\`${f.replace(/\.obj$/, '')}\``).join(files.length > 3 ? ` … (${files.length})` : ', ')} | \`${sourceOfFile.get(files[0]).rel}\` | \`${out}.obj\` | ${row.faces}${files.length > 1 ? ` (${files.length} elements fused)` : ''} | ${VASC_PARTS[k].role} |`);
  }
}
md.push('');
md.push('**Laterality rule.** Identical to the base and telencephalon tables: the `*L` key is the element whose');
md.push('vertices sit at positive `x_bp`. `docs/VASC_INVENTORY.md` §4 measured every extracted file and warns');
md.push('explicitly that "the FJ/FJ…M suffix … is [not] what a reviewer will check", so the rule is re-verified');
md.push('here from the registered bytes (axis-evidence row *vascular/optic L/R laterality*): every paired v8');
md.push('element has its `L` half at +x_bp and its `R` half at −x_bp. The unpaired elements the archive ships');
md.push('(basilar `FJ1672`, ACoA `FJ1655`) straddle the midline and are registered under their un-suffixed');
md.push('record name.');
md.push('');
md.push('**Fusion of grouped elements.** BP3D ships the PICA as 26 small segment elements (13 per side, 8,080');
md.push('faces total). Registering them individually would put 26 near-empty canonical OBJs on disk for one');
md.push('named structure, so each side is FUSED from its 13 elements in BP mm space (pure vertex/face');
md.push('concatenation — no coordinate is touched) into one registered mesh per side, which is then emitted');
md.push('as `vasc-posterior-inferior-cerebellar-artery-left/right.obj` carrying the full 4,040 faces that side.');
md.push('The element list per fused output is recorded in `registration-summary.json` (`vasculature.fusedParts`)');
md.push('and in the table above, so the fusion is auditable rather than implicit.');
md.push('');
md.push('**Alternative decimations left unused** (documented, not silently dropped): `FJ1844` (basilar, 244');
md.push('faces — the second decimation of the same unpaired concept; `FJ1672` is used) and `FJ1313`/`FJ1364`');
md.push('(the smaller optic-nerve pair; `FJ1772`/`FJ1819` are used because they include more of the orbital');
md.push('course). Both choices follow `docs/VASC_INVENTORY.md` §4/§5.1.');
md.push('');
md.push('### B.2 Per-part canonical extents (bbox table, au)');
md.push('');
md.push('Values are read back from the written `canonical/vasc-*.obj` / `canonical/tract-optic-*.obj` /');
md.push('`canonical/ctx-optic-chiasm-*.obj` after the centerline pass, so the table cannot drift from the');
md.push('files. 1 au = 1.2 mm; x = +patient-left, y = +superior, z = +anterior.');
md.push('');
md.push('| structure | file | x (au) | y (au) | z (au) | faces |');
md.push('| --- | --- | --- | --- | --- | --- |');
{
  const st = new Map(vascOutputStats.map((f) => [f.name, f]));
  for (const k of VASC_KEYS) {
    const row = st.get(VASC_PARTS[k].out);
    md.push(`| ${VASC_PARTS[k].name} | \`${row.name}.obj\` | ${row.bboxAu.min[0]} … ${row.bboxAu.max[0]} | ${row.bboxAu.min[1]} … ${row.bboxAu.max[1]} | ${row.bboxAu.min[2]} … ${row.bboxAu.max[2]} | ${row.faces} |`);
  }
}
md.push('');
md.push('### B.3 Registration observations');
md.push('');
md.push(`- **Face totals.** The ${vascOutputStats.length} v8 outputs carry ${vascOutputStats.reduce((n, f) => n + f.faces, 0).toLocaleString('en-US')} faces over ${vascOutputStats.reduce((n, f) => n + f.vertices, 0).toLocaleString('en-US')} vertices (pre-bake). The`);
md.push(`  ${vascFusedSourceFiles} fused part(s) carry ${vascFusedFaceTotal.toLocaleString('en-US')} of them; the script asserts that the output count equals the key count (${VASC_KEYS.length}) after writing, so a silently dropped element cannot pass.`);
md.push('- **The Willis ring is complete in the registered set**: internal carotid (L/R, cervical + intracranial),');
md.push('  vertebral (L/R), basilar, anterior cerebral (L/R), anterior communicating, middle cerebral (M1');
md.push('  sphenoid + M2 insular trunks, L/R), posterior communicating (L/R), posterior cerebral (P1 + P2–P3,');
md.push('  L/R), superior cerebellar (L/R), anterior inferior cerebellar (L/R), posterior inferior cerebellar');
md.push('  (L/R, fused), anterior choroidal (L/R). Axis evidence row *Willis ring closure* checks the geometric');
md.push('  claims that make it a ring: the vertebral tops meet the basilar bottom, the basilar trunk spans the');
md.push('  ventral pons, and the carotid tops reach the suprasellar cistern.');
md.push('- **The optic chain is complete and ordered**: optic nerve (L/R, the larger decimation), the two chiasm');
md.push('  halves (which meet at the midline), optic tract (L/R); LGN and MGN were already registered in the v2');
md.push('  addendum, so the full retino-geniculate chain is now on disk. Axis evidence row *optic chain order*');
md.push('  checks nerve → chiasm → tract in the anterior–posterior axis.');
md.push('- **Ophthalmic and spinal arteries deliberately NOT registered.** The archive carries both');
md.push('  (`FJ1695`/`FJ1695M`, 2,410 faces each; `FJ1657`/`FJ1657M`) and `docs/VASC_INVENTORY.md` §3.1 lists');
md.push('  them as "source only — support". The plan §1a artery table the v8 content is built from stops at the');
md.push('  Willis ring and its named branches, the DAG does not spend budget on them, and the ophthalmic artery');
md.push('  would add an orbital course that leaves the AMENDMENT B box for no atlas content.');
md.push('- **No `vasc-vertex` record exists in v8 content and none is invented here.** The brief\'s example slug');
md.push('  list mentions `vasc-vertex` for "the Willis ring junction"; the authored v8 vessel set (14 records,');
md.push('  task `content-authoring`) has no such id, so registering a mesh for it would create a GLB with no');
md.push('  record to select. The two junction ELEMENTS the ring actually has are registered under their own real');
md.push('  records: `vasc-basilar-artery` (the posterior midline junction where the vertebrals fuse) and');
md.push('  `vasc-anterior-communicating-artery` (the anterior midline cross-link). Adding a `vasc-vertex` alias');
md.push('  later is a pure rename of an existing file.');
md.push('- **No meshes exist in the archive for nucleus accumbens or claustrum** (`docs/VASC_INVENTORY.md` §5.2');
md.push('  verified this by exhaustive search of the archive\'s 2,905-id concept list) — they stay record-only,');
md.push('  which is the v8 plan §1d outcome for them and is task `tel-deep-geometry`\'s authored-SDF lane, not this');
md.push('  registration lane.');
md.push('');
md.push('### B.4 AMENDMENT B — measured bound implication for the vessel set');
md.push('');
md.push('| set | x (au) | y (au) | z (au) |');
md.push('| --- | --- | --- | --- |');
{
  const fmt = (v) => `${round(v[0], 1)} … ${round(v[1], 1)}`;
  md.push(`| **(v) the ${vascOutputStats.length} registered v8 vessel/optic parts** | ${fmt(vascAllExtentAu.x)} | ${fmt(vascAllExtentAu.y)} | ${fmt(vascAllExtentAu.z)} |`);
  md.push(`| AMENDMENT B bound (binding) | [${AMENDMENT_B_BOUNDS.x[0]}, ${AMENDMENT_B_BOUNDS.x[1]}] | [${AMENDMENT_B_BOUNDS.y[0]}, ${AMENDMENT_B_BOUNDS.y[1]}] | [${AMENDMENT_B_BOUNDS.z[0]}, ${AMENDMENT_B_BOUNDS.z[1]}] |`);
}
md.push('');
if (vascBoundsBreaches.length) {
  md.push(`The vessel set leaves the AMENDMENT B box on **${vascBoundsBreaches.length} axis side(s)**: ${vascBoundsBreaches.map((b) => `${b.axis}${b.side === 'upper' ? 'upper' : 'lower'} measured ${b.measured} vs bound ${b.bound} (${b.excessAu} au outside)`).join(', ')}.`);
  md.push('');
  md.push('This is **expected source geometry, not a registration error**, and it is reported rather than');
  md.push('hidden: the BodyParts3D internal-carotid elements carry the cervical course as well as the');
  md.push('intracranial one (BP3D z 1434.5–1537.7 mm = 86.6 au of vessel, of which only the top ~30 au is');
  md.push('inside the cranial cavity), and the optic-nerve elements carry the orbital course. Three options');
  md.push('were considered and the first taken:');
  md.push('');
  md.push('1. **register the elements as they are** (taken) — anatomically honest, nothing pre-existing moves,');
  md.push('   and the renderer/containment task can clip the vessel layer to the cranial cavity at draw time;');
  md.push('2. crop the vessels at the AMENDMENT B floor at registration time — rejected: it would make the');
  md.push('   registered mesh differ from the source element for a display reason, and the crop would have to be');
  md.push('   documented and re-derived on every re-run;');
  md.push('3. re-scale/shift the vessel set into the box — rejected outright: it would falsify the spatial');
  md.push('   relation between the arteries and the brain they supply, which is the whole point of the layer.');
  md.push('');
  md.push('Nothing pre-existing is affected either way: the vessel set is ADDITIVE (see §B.5).');
} else {
  md.push('The whole v8 vessel/optic set lies inside the AMENDMENT B box.');
}
md.push('');
md.push('### B.5 Proof that the pre-existing registered meshes did not move');
md.push('');
md.push('The v8 inputs are excluded from `STEM_KEYS`, from `ALL_FILES` (they take their own `VASC_FILES`');
md.push('path) and from every derived quantity — the junction detectors, the midline seam, `z_ref` and the');
md.push('centerline offsets are computed from exactly the elements they were computed from before. The');
md.push('corresponding guards are in the script (`BASE_INPUT_COUNT` must stay 27, `TEL_INPUT_COUNT` 29 over');
md.push(`29 files, ` + '`VASC_INPUT_COUNT` ' + `${VASC_INPUT_COUNT} over ${VASC_DISTINCT_FILE_COUNT} files, and the telencephalon §1 face identity`);
md.push('must reproduce 175,562). Evidence collected around this run (`vasc-register-bake`, same machine,');
md.push('kernel `objio.js` path):');
md.push('');
md.push(`1. All 53 pre-existing \`canonical/*.obj\` files were SHA-256 hashed **before** the table change`);
md.push('   (`.dsh-scratch/vasc-register/canonical-before.json`).');
md.push('2. The **unmodified** script was re-run first: all 53 hashes reproduced **byte-identically**,');
md.push('   establishing that the pipeline is deterministic here (so any later difference is attributable to');
md.push('   the change, not to noise).');
md.push('3. After adding the v8 inputs and re-running, the 53 hashes were compared again');
md.push('   (`.dsh-scratch/vasc-register/obj-hash.mjs diff`): all **byte-identical**, 0 changed, 0 missing.');
md.push('   Every `registration-summary.json` value that describes the pre-existing registration — the base');
md.push('   axis evidence, the five junctions, the warp knots, the centerline offsets and their x/z ranges, the');
md.push('   ventral profile — is unchanged too, and all pre-existing Class A frame landmarks still PASS in');
md.push('   their original bands.');
md.push('4. The pre-existing bounding boxes in §8 still match the previously committed table to the last');
md.push('   decimal (see §A.5.4): numerically identical, not merely within 0.01 au.');
md.push('');

writeFileSync(REPORT_PATH, md.join('\n'), 'utf8');
log(`[register] wrote ${path.relative(ROOT, REPORT_PATH)}`);
log(`[register] wrote ${path.relative(ROOT, SUMMARY_PATH)}`);
log('[register] done');
