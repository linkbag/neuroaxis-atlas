/**
 * NeuroAxis — canonical data model.
 *
 * Verbatim from docs/ENGINEERING_PLAN.md §4, plus the TaxonomyEntry type for
 * src/data/taxonomy.json (the id registry). Author-facing rules live in
 * docs/DATA_CONTRACT.md; machine checks live in scripts/validate-data.mjs.
 *
 * Every id referenced anywhere in the app (records, syndromes, plate
 * manifests, SVG data-structure attributes) must exist in taxonomy.json.
 */

export type Region =
  | 'telencephalon'
  | 'diencephalon'
  | 'midbrain'
  | 'pons'
  | 'medulla'
  | 'cerebellum'
  | 'vasculature';
/**
 * The structure kinds. v13 (PLAN.md §2) appends `'nerve'` — the twelve cranial
 * nerves as first-class records. Appending (never reordering) keeps every
 * existing table, preset and data hook stable; the one thing a new kind MUST
 * carry is a `Record<Kind, …>` entry everywhere such a map exists, which is why
 * `npm run check` is the coverage proof for this addition (six exhaustive maps
 * fail until each one is updated): `load.ALL_KINDS` and `Header.KIND_LABELS`
 * (the Systems row), `NucleusMesh.KIND_OPACITY`, `KindGlyph.KIND_GLYPH`,
 * `Legend.KIND_SWATCHES` (a plain array — tsc cannot catch that one, so
 * `scripts/verify/nerve-kind.mjs` does) and the validator's `KINDS`.
 *
 * The id prefix follows the kind (`nrv-` for `nerve`, docs/DATA_CONTRACT.md §3);
 * that rule is enforced by `scripts/validate-data.mjs` for every registry row.
 */
export type Kind = 'nucleus' | 'tract' | 'ventricle' | 'surface' | 'vessel' | 'context' | 'nerve';
export type Laterality = 'midline' | 'paired';
export type Vec3 = [number, number, number];

export interface ClinicalItem { syndrome: string; findings: string; vascular?: string; note?: string }

export interface StructureRecord {
  id: string; name: string; synonyms?: string[];
  region: Region; subdivision: string; kind: Kind; laterality: Laterality;
  color: string;                     // hex
  function: string;                  // neurophysiology, 1–3 sentences
  connections?: { afferent?: string[]; efferent?: string[] };
  bloodSupply?: string;
  clinical?: ClinicalItem[];
  levels?: string[];                 // level ids where visible
  origin3d?: Vec3;                   // canonical space (one side for paired; renderer mirrors)
  size3d?: Vec3;                     // ellipsoid radii
  refs?: string[];                   // e.g. "Blumenfeld, 2nd ed., Ch. 'Diencephalon…'"
  contextNote?: string;              // for context records
  /**
   * v8 (docs/NEUROATLAS_V8_PLAN.md §1a) — the cerebral-vasculature fields.
   *
   * `territory` is the territory the record supplies (structure ids — the viewer
   * lights them when the record is selected), `supply` the syndrome-card ids whose
   * arterial territory this record IS (so an artery and its syndromes light each
   * other), and `meshes: false` the explicit "this record owns no mesh of its own"
   * flag, which keeps a record out of the body pass and out of the origin.
   *
   * They are typed here rather than left as JSON-only fields because the viewer
   * reads all three: `load.ts` turns `supply` into the reverse syndrome index,
   * `store.highlightIdSet` lights a territory / an artery, and `InfoPanel` renders
   * the territory chips.
   */
  territory?: string[];
  supply?: string[];
  meshes?: boolean;
  /**
   * v13 (PLAN.md §4.2) — the two cranial-nerve fields.
   *
   * The twelve `nerve` records state a **modality** (the fibre class the nerve
   * carries: general somatic efferent, branchial motor, special sensory, …) and
   * its **course** (cisternal/segmental course AND the skull-base foramen it
   * uses) — the two facts a reader needs and neither `function` nor
   * `connections` can carry without turning into prose. They are typed here, not
   * left as JSON-only keys, for the same reason v8 typed `territory`/`supply`:
   * a declared field is a checkable one. `modality` mirrors `TractRecord.modality`
   * (`types.ts` §TractRecord) because a cranial nerve IS the tract-like record of
   * this slice, and `scripts/validate-data.mjs` validates both as non-empty
   * strings when present.
   */
  modality?: string;
  course?: string;
}

export interface TractRecord {
  id: string; name: string;
  direction: 'ascending' | 'descending' | 'mixed';
  modality: string; origin: string; target: string;
  decussation: string; somatotopy?: string;
  function: string; clinical: ClinicalItem[];
  waypoints: Vec3[];                 // Catmull-Rom control points (canonical space)
  tubeRadius: number; color: string;
  levels?: string[]; refs?: string[]; synonyms?: string[];
}

export interface SyndromeRecord {
  id: string; name: string; eponym?: string;
  structures: string[];              // structure/tract ids
  vascularTerritory?: string;
  presentation: string; cause: string; refs?: string[];
}

export interface PlateRegionMap { slug: string; label: string; labelPos: [number, number] }

export interface PlateRecord {
  id: string; title: string;
  orientation: 'transverse' | 'sagittal' | 'coronal';
  region: Region; levelId?: string;   // transverse only
  svg: string;                        // 'plates/plate-olivary.svg'
  regions: PlateRegionMap[];          // duplicated from data-structure attrs for label routing
}

/**
 * One row of src/data/taxonomy.json — the registry created FIRST (plan §10);
 * it is a superset of all authored structure/tract ids and drives tree,
 * search, and SVG recoloring.
 */
export interface TaxonomyEntry {
  id: string;
  name: string;
  region: Region;
  subdivision: string;
  kind: Kind;
  laterality: Laterality;
  color: string;
  synonyms?: string[];
  parent?: string;                   // id of another TaxonomyEntry (tree nesting)
}
