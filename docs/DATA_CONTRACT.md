# NeuroAxis — Data Contract (author-facing)

Authoritative source: `docs/ENGINEERING_PLAN.md` (§4 data model, §6 plates, §9 validation).
This page condenses what content authors need. The machine that enforces all of it is
`scripts/validate-data.mjs` — **if `npm run validate` is green, your data obeys this contract.**

---

## 1. Files and groups

| File (under `src/data/`) | Required? | Shape |
| --- | --- | --- |
| `taxonomy.json` | **yes** (created first, plan §10) | array of `TaxonomyEntry` |
| `levels.json` | **yes** | array of `{ id, name, y }` — the 13 canonical levels of plan §2 |
| `structures/<region-group>.json` | optional until authored | array of `StructureRecord` |
| `tracts.json` | optional until authored | array of `TractRecord` |
| `syndromes/<group>.json` | optional until authored | array of `SyndromeRecord` |
| `plates-*.json` (fragments; final merged `plates.json` at integration) | optional until authored | array of `PlateRecord` |
| `plates/<plate-id>.svg` | referenced by manifests | one SVG per plate, per §6 below |

- Every file is a **top-level JSON array**. Nothing else at the top level.
- All groups except `taxonomy.json` + `levels.json` are optional while authoring is in
  progress: the validator reports missing groups as *skipped* and still exits 0.
- `src/data/load.ts` (integration task) merges all files; the validator is the pre-merge gate.

## 2. Interfaces (`src/types.ts`)

```ts
export type Region = 'diencephalon' | 'midbrain' | 'pons' | 'medulla' | 'cerebellum';
export type Kind = 'nucleus' | 'tract' | 'ventricle' | 'surface' | 'vessel' | 'context';
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
  refs?: string[];
  contextNote?: string;              // for context records
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
  regions: PlateRegionMap[];
}

export interface TaxonomyEntry {   // one row of taxonomy.json
  id: string; name: string; region: Region; subdivision: string;
  kind: Kind; laterality: Laterality; color: string;
  synonyms?: string[]; parent?: string;   // parent = another registry id (tree nesting)
}
```

## 3. IDs, slugs, uniqueness

| Id space | Rule |
| --- | --- |
| Structure / tract ids | `^(nuc\|tract\|vent\|surf\|vasc\|ctx)-[a-z0-9-]+$` — prefix follows `kind`: nucleus→`nuc`, tract→`tract`, ventricle→`vent`, surface→`surf`, vessel→`vasc`, context→`ctx`. Lowercase kebab only. |
| Level ids | `^lvl-[a-z0-9-]+$` — use the 13 existing anchors; adding one means updating `levels.json` **and** plan §2. |
| Plate ids | `^plate-[a-z0-9-]+$` — transverse: `plate-<level-without-lvl->` (e.g. `lvl-olivary` → `plate-olivary`); plus `plate-sagittal-midline`, `plate-coronal-midbrain`, `plate-coronal-thalamus`. |
| Syndrome ids | lowercase kebab `^[a-z0-9]+(-[a-z0-9]+)*$` (`syn-` prefix recommended). |

- **Registry first**: every authored structure/tract id must already exist in `taxonomy.json`
  (the validator flags authored-but-unregistered ids as errors).
- Ids are globally unique across structures + tracts (and across syndromes, plates).
- Display `name` is unique across structures + tracts; registry names should be unique too.
- Registry entries carry the display `name`, `region`, `kind`, `color` used for search, tree,
  and SVG recoloring — keep authored records consistent (mismatches produce warnings).

## 4. Canonical coordinates (plan §2)

| Axis | Meaning | Allowed range |
| --- | --- | --- |
| x | medial→lateral, **+x = patient LEFT** | −22 … +22 |
| y | inferior→superior, +y = superior | −55 … +45 |
| z | posterior→anterior, +z = anterior/ventral | −18 … +18 |

- `origin3d` / `size3d`: numeric triples **inside these bounds** (hard error otherwise);
  `size3d` radii must be > 0. For `paired` records give one side only — the renderer mirrors at −x.
- `waypoints`: ≥ 2 triples in the same space (Catmull-Rom control points). Out-of-bounds
  waypoints produce a **warning** (tracts may exit the box intentionally), not an error.

## 5. Level table (`levels.json`, plan §2)

| Level id | Name | y (au) |
| --- | --- | --- |
| `lvl-spinal-medulla` | Cervicomedullary junction | −50 |
| `lvl-pyramid-decuss` | Medulla — pyramidal decussation | −46 |
| `lvl-sensory-decuss` | Medulla — sensory (internal arcuate) decussation | −42 |
| `lvl-olivary` | Medulla — mid-olivary (open medulla) | −34 |
| `lvl-pontomedullary` | Pontomedullary junction (CN VI–VII exits) | −24 |
| `lvl-pons-caudal` | Pons — lower (CN VI, VII, VIII nuclei) | −18 |
| `lvl-pons-middle` | Pons — midpontine (CN V) | −8 |
| `lvl-pons-rostral` | Pons — upper (CN IV exit, ICP→SCP transition) | +2 |
| `lvl-midbrain-ic` | Midbrain — inferior colliculus | +8 |
| `lvl-midbrain-sc` | Midbrain — superior colliculus (CN III) | +14 |
| `lvl-post-comm` | Posterior commissure / pretectal | +19 |
| `lvl-thalamus-mid` | Diencephalon — mid-thalamus (mammillary bodies) | +28 |
| `lvl-thalamus-rostral` | Diencephalon — rostral thalamus / hypothalamus (optic chiasm) | +36 |

`levels` arrays on records and `levelId` on transverse plates may only reference these ids.

## 6. SVG plate authoring contract (plan §6)

- Root: `viewBox="0 0 800 800"` (enforced).
- Orientation markers (L/R/A/P/S/I badges) drawn in the SVG:
  - **transverse** — dorsal top; patient LEFT on image RIGHT; L/R badges.
  - **sagittal** — anterior left, superior top.
  - **coronal** — patient left on image right, superior top.
- Every region element carries `data-structure="<slug>"` where slug is a **taxonomy id**.
- Label groups: `<g class="plate-label" data-for="<slug>">` containing a `<line>` + `<text>`.
  Every `data-for` must (a) resolve to a known id and (b) match a region listed in that
  plate's manifest entry (label routing).
- Outline path(s): `data-role="outline"`, stroke `#0f172a`, width 1.5.
- **No critical inline styling**: never put `fill=`/`style=` on `data-structure` elements —
  `PlateRenderer` controls fill/opacity via CSS vars (inline styling produces warnings).
- Manifest mirrors the SVG: `PlateRecord.regions[]` (`{slug, label, labelPos}` in 800×800
  coordinates) duplicates the `data-structure` attrs for label positioning.
- Palette by kind (fallback; the taxonomy `color` always wins in the renderer):
  nuclei `#d97706` · CN nuclei `#14b8a6` · ascending `#3b82f6` · descending `#8b5cf6` ·
  ventricle `#06b6d4` · surface `#64748b` · context `#94a3b8`;
  named overrides: red nucleus `#b91c1c`, SNc `#1f2937`, SNr `#374151`, locus coeruleus `#1d4ed8`.

## 7. Required vs optional fields, errors vs warnings

- **Required** = every non-optional field of the §4 interfaces. Strings must be non-empty
  (after trim); required arrays (`TractRecord.clinical`, `SyndromeRecord.structures`) must have
  ≥ 1 entry; colors match `^#[0-9a-f]{6}$`.
- **Optional** fields are validated only when present (enums, hex, string arrays, level-id
  resolution, connection lists, clinical items, refs).
- **Hard errors** (exit 1): JSON parse failures, slug/enum/hex violations, missing required
  fields, `origin3d`/`size3d` out of bounds, < 2 waypoints or non-numeric waypoint triples,
  duplicate ids / duplicate display names, unknown level ids, unknown syndrome `structures[]`,
  unregistered authored ids, missing plate SVG files, unknown `data-structure` / `data-for`
  attrs, wrong `viewBox`, `levelId` on non-transverse plates or missing on transverse ones.
- **Warnings** (non-blocking): out-of-bounds waypoints, registry-only ids referenced by
  plates/SVGs (record not authored yet), name/region/kind/color mismatch vs registry, empty
  plate `regions[]`, inline styling on SVG region elements, unreferenced SVG files,
  labelPos outside the 800×800 viewBox.

## 8. Running the validator

```bash
npm run validate          # = node scripts/validate-data.mjs
```

- **Exit 0** + summary table (counts per group) = all good.
- **Exit 1** + numbered report: `[n] ERROR <file> :: <field> — <message>`. Fix the listed
  file/field and re-run. Warnings print as `[Wn] WARN …` and never fail the build.
- CI/experiments: `node scripts/validate-data.mjs --root <alternate data dir>` validates any
  other directory laid out like `src/data/`.
- Minimum passing state is `taxonomy.json` + `levels.json` alone; groups appear in the summary
  as they are authored.
