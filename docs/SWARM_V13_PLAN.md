# NeuroAxis v13 — the cranial-nerve slice: a `nerve` kind and the twelve cranial nerves

**Authority.** The run's executable contract is [`PLAN.md`](../PLAN.md) at the repo root (written by the
architect before any edit; every base measurement in it was produced in this checkout at `a530dff`). This file
is the run's archived plan + closure: §1–§4 record the contract's decisions where the closure needs them, and
**§5–§10 are the closure**, written by the integrator after the full non-browser sweep in §9. Nothing in this
file is a browser observation unless it says so, and every number in it was printed by a command run here.

**The ask.** Add a "Cranial nerves" slice to the Systems row — *creating the data slice first, because it did
not exist*: the twelve cranial nerves as first-class records, sliced by a new `nerve` kind.

**What existed before this run (verified, not re-invented).** The taxonomy already carried cranial-nerve
**nuclei** (15 `nuc-*` rows + 2 tracts = **17 rows** under subdivision `Cranial nerve nuclei`) and cranial-nerve
**exit-surface landmarks** (`surf-cn3-exit` … `surf-cn12-exit`, 10 rows under `Surface landmarks`). CN II
partially existed as `tract-optic-nerve` / `ctx-optic-chiasm` / `tract-optic-tract` (v8, with real meshes).
**Missing:** the twelve nerves as records, and any kind to slice them by.

**The run.** architect contract → two parallel builders on disjoint files (`kind` platform plumbing +
`taxonomy.json`/webRefs; the twelve records + `scripts/verify/cranial-nerves.mjs`) → adversarial review
(`review-qa`: re-pointed the two gates that were red at base, 437/0 and no product change) → this integration
(npm wiring, documentation with measured numbers, full sweep). Commit at base: `a530dff` (v12h).

## 1. The kind contract — every declaration site, all nine in one atomic change

Five of the sites are exhaustive `Record<Kind, …>` maps, so `npm run check` (tsc) is the real proof of
coverage: it fails until each is updated. The full set, with the shipped line that carries it:

| # | site | shipped value |
| --- | --- | --- |
| 1 | `src/types.ts:34` | `export type Kind = 'nucleus' \| 'tract' \| 'ventricle' \| 'surface' \| 'vessel' \| 'context' \| 'nerve'` — **appended, never reordered** |
| 2 | `src/data/load.ts:230` | `ALL_KINDS = ['nucleus','tract','ventricle','surface','vessel','context','nerve']` — **this plus #4 is the whole Systems-row mechanism** |
| 3 | `scripts/validate-data.mjs:56` | `SLUG_RE = /^(nuc\|tract\|vent\|surf\|vasc\|ctx\|nrv)-[a-z0-9-]+$/` (§3) |
| 3b | `scripts/validate-data.mjs:64-72, 80` | `PREFIX_KIND.nrv = 'nerve'` (the rule as an executable assertion) and `KINDS[… , 'nerve']` |
| 4 | `src/components/Header.tsx:115` | `KIND_LABELS.nerve = 'Cranial nerves'` (label) — accessible name `"Cranial nerves — show/hide the nerve system (nerve)"` built at `:114` |
| 5 | `src/components/viewer3d/NucleusMesh.tsx:55` | `KIND_OPACITY.nerve = 1` (opaque, depth-writing, so a nerve marker is pickable) |
| 6 | `src/components/viewer3d/NucleusMesh.tsx:77` | `hintForKind('nerve') → 'nucleus'` (the gray-matter preset of a schematic placement) |
| 7 | `src/components/KindGlyph.tsx:18` | `KIND_GLYPH.nerve = '✦'` (distinct from all six) |
| 8 | `src/components/Legend.tsx:42` | `{ label: 'Cranial nerves', token: 'var(--kind-nerve)' }` — a **plain array**, tsc cannot catch a miss here, which is why `verify:nerve-kind` asserts it |
| 9 | `src/styles/tokens.css:40` | `--kind-nerve: #14b8a6` (the same teal as `--kind-cn-nucleus`, so "nuclei of the twelve" and "the twelve" read as one family) |
| 10 | `src/data/webRefs.ts:596-607` | 12 curated web references (the automatic Wikipedia fallback derives a title like "CN I Olfactory nerve", which resolves to nothing) |

**What deliberately needed no change, and why:** `store.ts` `VIEW_PRESETS['brainstem-focus'].kinds =
ALL_KINDS`, so the new kind boots **on** (mandatory: `store.ts` throws at module load if any
non-telencephalon/non-vasculature row's kind is off in the default); the Systems row already renders
`ALL_KINDS.map(kind => <button type="button" data-kind={kind} aria-pressed={on}
aria-label={…} onClick={() => toggleKindLayer(kind)}>{KIND_LABELS[kind]}</button>)`, so **the button appears as
soon as the kind and its label exist** — that is the intended mechanics, and `verify:nerve-kind` §3–§5 proves it
on the shipped render rather than by inspection; `SceneLayers.isSolidKind('nerve')` is true without an entry;
`sectionAssets.SectionKind` is a *draw bucket* taken from the manifest part (a mesh-less record adds no part);
`webRefs` gives every non-`vessel` kind a fallback.

## 2. The twelve records — true region, one subdivision

Files: **`src/data/structures/telencephalon-cranial-nerves.json`** (CN I, CN II) and
**`src/data/structures/brainstem-cranial-nerves.json`** (CN III–XII). `load.ts` globs `./structures/*.json`, so
**no loader edit was needed**; the validator walks the same directory.

| nerve | id | region | subdivision |
| --- | --- | --- | --- |
| CN I Olfactory | `nrv-cn1-olfactory` | telencephalon | `Cranial nerves` |
| CN II Optic | `nrv-cn2-optic` | telencephalon | `Cranial nerves` |
| CN III Oculomotor | `nrv-cn3-oculomotor` | midbrain | `Cranial nerves` |
| CN IV Trochlear | `nrv-cn4-trochlear` | midbrain | `Cranial nerves` |
| CN V Trigeminal | `nrv-cn5-trigeminal` | pons | `Cranial nerves` |
| CN VI Abducens | `nrv-cn6-abducens` | pons | `Cranial nerves` |
| CN VII Facial | `nrv-cn7-facial` | pons | `Cranial nerves` |
| CN VIII Vestibulocochlear | `nrv-cn8-vestibulocochlear` | pons | `Cranial nerves` |
| CN IX Glossopharyngeal | `nrv-cn9-glossopharyngeal` | medulla | `Cranial nerves` |
| CN X Vagus | `nrv-cn10-vagus` | medulla | `Cranial nerves` |
| CN XI Accessory | `nrv-cn11-accessory` | medulla | `Cranial nerves` |
| CN XII Hypoglossal | `nrv-cn12-hypoglossal` | medulla | `Cranial nerves` |

All twelve: `kind: "nerve"`, `laterality: "paired"`, `color: "#14b8a6"`, `meshes: false`.

**Subdivision name: `Cranial nerves`** — the single coherent name the brief asks for. It was verified free (0
rows carried it before v13), so it cannot collide with `Cranial nerve nuclei` (**still exactly 17 rows**,
asserted by `verify:cranial-nerves` lane 2) or with `Surface landmarks`. The tree renders region →
subdivision → leaves, so one name groups all twelve *inside each true region*: telencephalon 2 · midbrain 2 ·
pons 4 · medulla 4 — that is the only naming that satisfies both halves of "true region" and "one group".

**CN II's region is a stated choice, not an accident.** The optic nerve is embryologically diencephalic, but the
committed v8 rows `tract-optic-nerve` / `ctx-optic-chiasm` / `tract-optic-tract` sit in `region:
"telencephalon"`, so `nrv-cn2-optic` follows them: the registry holds **one** answer for optic-nerve region.
Moving it means moving all four rows together (tree, the telencephalon area's contents, the area/toggle story).

**Fields beyond the classic `StructureRecord`.** `modality?: string` and `course?: string` were added to
`StructureRecord` in `src/types.ts` with `validate-data.mjs` checks, and `course` is the one string carrying the
cisternal course **and the skull-base foramen** (CN VI's Dorello-canal petroclival course is the clinically
load-bearing detail). `origin`/`target` are not record fields: origin is folded into `function` +
`connections.afferent`, target/course into `course` + `connections.efferent`.

## 3. The id contract — the frozen regex was extended with `nrv-` (decision + reason)

**Decision: extend the contract, do not smuggle the kind into an existing prefix.**
`SLUG_RE` is now `/^(nuc|tract|vent|surf|vasc|ctx|nrv)-[a-z0-9-]+$/`, and `PREFIX_KIND.nrv = 'nerve'` makes the
prefix→kind rule executable (every registry row's prefix must name its own kind: **0 contradictions over all 248
rows**, printed by `verify:nerve-kind` §2).

**Reason.** "Prefix follows kind" is stated as a rule in the validator, in `docs/DATA_CONTRACT.md` §3 and in
`docs/CONTENT_INVENTORY.md` §2, and `SLUG_RE` is applied to every taxonomy id *and* every authored id. Reusing
`ctx-` (the only prefix not already tied to a matching kind) would have created twelve `ctx-` rows whose kind is
`nerve` — the one class of row where the two disagree — an exception every future reader would have to carry.
The rejected alternatives were measured with the shipped regex: before the change `nrv-cn3-oculomotor`,
`cn3-oculomotor`, `nrv-CN3` and `nerve-cn3` were **all** rejected; now the first is accepted and the other three
are **still** rejected (asserted, not assumed — `verify:nerve-kind` §2, `verify:cranial-nerves` lane 3:
**12/12 ids accepted by the regex the validator actually runs**, which the gate *parses out of
`scripts/validate-data.mjs`* so it cannot drift).

**Where the third copy of the contract still lives (not fixed here — out of this task's write scope).**
`docs/DATA_CONTRACT.md:90` still prints the six-prefix regex (and its §4 bounds table at `:106-108` is stale:
it claims x −22…22 / y −55…45 / z −18…18 while the validator enforces x −58…58 / y −55…116 / z −76…72);
`docs/ENGINEERING_PLAN.md:229` and the historical `docs/SWARM_V9_PLAN.md:40` carry the same six prefixes.
The integrator's exclusive write scope was `README.md`, `docs/CONTENT_INVENTORY.md`, `docs/SWARM_V13_PLAN.md`
and `package.json`, so `docs/CONTENT_INVENTORY.md` §2 was amended (kind enum, `nrv-` prefix, regex, counts) and
the remaining copies are reported in §7 rather than silently left.

## 4. Geometry-honesty contract (the rule the twelve records obey)

No cranial-nerve mesh is committed, none was added, and none may be added cheaply: the GLB budget stands at
**13.82 MiB of a 14 MiB cap — 0.18 MiB of headroom** — and `verify:anatomy` freezes the existing bounding boxes.
`assets-src/` (the gitignored raw archive) was searched: its `bp3d/canonical/` holds **86 OBJs and not one
cranial-nerve element** beyond the already-baked CN II trio (`tract-optic-nerve-left/right.obj`,
`ctx-optic-chiasm-left/right.obj`, `tract-optic-tract-left/right.obj`); `bp3d/raw/`, `raw-tel/` and `raw-vasc/`
hold only `FJ*.obj` sources plus `vasc-inventory.json`. So each record is `meshes: false` with a **sized
schematic placement** at its authored `origin3d`/`size3d` — the mechanism the hippocampal subfields
(`nuc-subiculum`) and the lenticulostriate artery (`vasc-lenticulostriate-arteries`) already use — and its
`contextNote` states exactly what geometry stands behind it (which committed landmark/envelope it anchors
against, and that the ellipsoid is a schematic marker, not anatomy).

---

# Closure

**Executed by the v13 swarm** (architect contract → two parallel builders on disjoint files → adversarial
review → this integration), closed by the integrator's own non-browser sweep (§9, every gate's exit code and
printed numbers). **Chrome cannot start in the agent sandbox**, so `verify:audit`, `verify:acceptance` and
`verify:browser` are the **orchestrator's lane** and are never claimed here.

## 5. What shipped, item by item

| # | item (the plan / the ask) | what shipped | files | committed check that fails if it regresses |
| --- | --- | --- | --- | --- |
| 1 | **the `nerve` kind** (§1) | `'nerve'` appended to all seven runtime/type sites, the validator's `KINDS`, `SLUG_RE` and `PREFIX_KIND`; label **Cranial nerves**; glyph `✦`; opacity `1`; `hintForKind → 'nucleus'`; Legend swatch on `var(--kind-nerve)`; token `--kind-nerve: #14b8a6` | `src/types.ts`, `src/data/load.ts`, `scripts/validate-data.mjs`, `src/components/Header.tsx`, `KindGlyph.tsx`, `Legend.tsx`, `viewer3d/NucleusMesh.tsx`, `src/styles/tokens.css` | `npm run check` (five exhaustive `Record<Kind, …>` maps fail tsc until updated) + `npm run verify:nerve-kind` (**79 assertions · 0 failed**, 9 groups) |
| 2 | **the Systems-row button** (§1 #2+#4) | the row is `ALL_KINDS.map(…)`, so a **seventh** `<button type="button" data-kind="nerve" aria-pressed aria-label="Cranial nerves — show/hide the nerve system (nerve)">` reading exactly **Cranial nerves** sits in the `Structure systems` group, in `ALL_KINDS` order, booted pressed | `src/components/Header.tsx` | `verify:nerve-kind` §3 (14 assertions on the rendered markup + the parsed wiring) and §5 (the real `onClick` called twice, round trip byte-identical) |
| 3 | **the twelve records** (§2) | 12 `StructureRecord`s, one per nerve, each with number+name, Latin synonyms, modality, function, **course including its skull-base foramen**, connections **linking the existing ids**, blood supply/vessel relationship, ≥2 clinical items with the palsy picture **and its localisation**, level anchors, refs, and a `contextNote` stating the geometry | `src/data/structures/telencephalon-cranial-nerves.json` (CN I–II), `brainstem-cranial-nerves.json` (CN III–XII), `src/data/taxonomy.json` (12 appended rows), `src/data/webRefs.ts` (12 curated links) | `npm run validate` (**0 errors / 0 warnings**, 248 rows) + `npm run verify:cranial-nerves` (**451 assertions · 0 failed**) |
| 4 | **the record counter** (the run's own new evidence) | `scripts/verify/cranial-nerves.mjs`: no gate counted records by kind, so this one does — 12 rows, 12 authored records, one number 1…12 each, true regions 2/2/4/4, one subdivision, 12/12 `meshes:false`, 12/12 placements inside `CLIP_BOUNDS`, 0 manifest parts, 0 section parts, every id token resolved | `scripts/verify/cranial-nerves.mjs` (new) | itself — and it **bites**: the ids, numerals, regions, foramen strings, nucleus links and bounds are all asserted against the shipped selectors |
| 5 | **the kind gate** (§1) | `scripts/verify/nerve-kind.mjs`: imports the *shipped* `load.ts`, `Header.tsx`, `Legend.tsx`, `KindGlyph.tsx`, `NucleusMesh.tsx`, `SceneLayers.tsx`, `store.ts`; renders the header and legend; **calls the button's own `onClick`**; census over the real records; **8 defective kind tables must be caught by name** | `scripts/verify/nerve-kind.mjs` (new) | itself: §9's bite (8/8 caught) proves a check that cannot fail is not evidence |
| 6 | **the two gates that were RED at base** (`verify:area-toggles`, the four preset click sites in `verify:audit`) | re-pointed at the **post-v12** header without restoring the removed preset row or `data-preset`: 5 Areas + the region-backed `data-system-region="vasculature"` button, the Systems row as **7 kinds with `nerve` last**, the four per-axis All hooks, a *composed* restore of the documented default, and four new executed sections (nerve slicing on both surfaces, the v11 item-4 parity sweep, a guard over all 123 static browser probes in `audit.mjs`, and the browser lane's own predicate against 7 mutated readings) | `scripts/verify/area-toggles.mjs`, `scripts/verify/audit.mjs`, `scripts/verify/checks.mjs` | `npm run verify:area-toggles` — **was 225 passed / 25 failed at base, now 437 assertions · 0 failed** (§9) |
| 7 | **the v11 carry-over item-4 defect** (canvas paints divisions the rule excludes at y=6/26/30/32) | **re-measured and it does not reproduce**: the canvas' own `buildLobeLayer` (with a `Path2D` stub recording **75 `moveTo` / 2233 `lineTo`**, so the paint path provably ran) is executed over **both** committed ribbons and compared with `corticalLobes.paintedDivisionsOfLoops` at every plane `audit.mjs` names: **parity 6/6**, and y=6 paints `[frontal limbic occipital parietal temporal]` (5 divisions, **not** NONE), y=26 `[frontal insula occipital parietal temporal]`, y=30/32 `[frontal occipital parietal temporal]` | `scripts/verify/area-toggles.mjs` §10 | `verify:area-toggles` §10 — the measured cause is the v11 reading's **left-ribbon-only** slice, not a rule disagreement |

## 6. The measured numbers

### 6.1 The twelve records (printed by `npm run verify:cranial-nerves`, 451/451)

| # | name (as shipped) | id | region | foramen (in `course`) | nuclei / tracts linked (from the record text) | geometry |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CN I Olfactory nerve | `nrv-cn1-olfactory` | telencephalon | cribriform plate | `nuc-amygdala`, `nuc-hippocampus`, `nuc-md` | `meshes:false`, schematic at `[8,12,48]` ± `[1.6,1.8,7.5]` |
| 2 | CN II Optic nerve | `nrv-cn2-optic` | telencephalon | optic canal | `tract-optic-nerve`, `ctx-optic-chiasm`, `tract-optic-tract`, `nuc-lgn`, `nuc-pretectal`, `nuc-suprachiasmatic`, `nuc-superior-colliculus`, `nuc-edinger-westphal` | `meshes:false`, schematic at `[12,19,30]` ± `[2.4,1.8,5]` |
| 3 | CN III Oculomotor nerve | `nrv-cn3-oculomotor` | midbrain | superior orbital fissure | `nuc-oculomotor`, `nuc-edinger-westphal`, `nuc-pprf`, `nuc-pretectal` | `meshes:false`, `[5,8.5,14]` ± `[2.2,1.4,6.5]` |
| 4 | CN IV Trochlear nerve | `nrv-cn4-trochlear` | midbrain | superior orbital fissure | `nuc-trochlear`, `nuc-pprf`, `nuc-mesencephalic-v` | `meshes:false`, `[3.5,7.5,-12]` ± `[1.2,1.2,3]` |
| 5 | CN V Trigeminal nerve | `nrv-cn5-trigeminal` | pons | foramen ovale | `nuc-trigeminal-motor`, `nuc-principal-sensory-v`, `nuc-mesencephalic-v`, `tract-mesencephalic-v`, `nuc-spinal-trigeminal`, `nuc-vpm` | `meshes:false`, `[5.5,-9,-1]` ± `[2.6,2,4.5]` |
| 6 | CN VI Abducens nerve | `nrv-cn6-abducens` | pons | superior orbital fissure | `nuc-abducens`, `nuc-oculomotor`, `nuc-pprf`, `nuc-vestibular-medial` | `meshes:false`, `[4.5,-18,5]` ± `[1.6,9,2]` |
| 7 | CN VII Facial nerve | `nrv-cn7-facial` | pons | internal acoustic meatus (→ stylomastoid foramen) | `nuc-facial`, `nuc-superior-salivatory`, `nuc-solitarius-rostral`, `nuc-spinal-trigeminal`, `nuc-vpm` | `meshes:false`, `[3,-22.5,-6]` ± `[1.8,3.4,4.5]` |
| 8 | CN VIII Vestibulocochlear nerve | `nrv-cn8-vestibulocochlear` | pons | internal acoustic meatus | `nuc-vestibular-superior/-medial/-lateral/-inferior`, `nuc-cochlear-ventral/-dorsal`, `nuc-superior-olivary`, `nuc-inferior-colliculus`, `nuc-mgn`, `nuc-dentate`, `nuc-abducens` | `meshes:false`, `[7.5,-21,-6.5]` ± `[1.3,1.6,3.6]` |
| 9 | CN IX Glossopharyngeal nerve | `nrv-cn9-glossopharyngeal` | medulla | jugular foramen | `nuc-ambiguus`, `nuc-solitarius-caudal`, `nuc-solitarius-rostral`, `nuc-dmv`, `nuc-spinal-trigeminal`, `nuc-inferior-olive-principal` | `meshes:false`, `[5,-31,5.5]` ± `[1.3,2.4,4.2]` |
| 10 | CN X Vagus nerve | `nrv-cn10-vagus` | medulla | jugular foramen | `nuc-dmv`, `nuc-ambiguus`, `nuc-solitarius-caudal`, `nuc-solitarius-rostral`, `nuc-inferior-olive-principal` | `meshes:false`, `[5.5,-14,6]` ± `[1.4,21,1.6]` |
| 11 | CN XI Accessory nerve | `nrv-cn11-accessory` | medulla | jugular foramen | `nuc-ambiguus` (cranial root) + stated spinal-cord origin | `meshes:false`, `[6.5,-36,3]` ± `[1.2,9,1.6]` |
| 12 | CN XII Hypoglossal nerve | `nrv-cn12-hypoglossal` | medulla | hypoglossal canal | `nuc-hypoglossal`, `nuc-medullary-reticular`, `nuc-inferior-olive-principal`, `nuc-solitarius-caudal` | `meshes:false`, `[3,-33,10]` ± `[1.3,2.2,3.8]` |

Measured, not asserted by hand: **12 taxonomy rows** and **12 authored records** of kind `nerve`; **every nerve
row is authored** (no registry-only stub); the numbers 1…12 each appear exactly once; **12/12 ids accepted by
the validator's own `SLUG_RE`** (parsed out of `scripts/validate-data.mjs` and executed by the gate);
**24 level-anchor references** all resolving in `levels.json`; **131 id tokens** inside the records, **0
unresolved**, **56** of them nucleus/tract records; **50 clinical items** (every record ≥ 2, all twelve ≥ 4);
**13,465 content words**; **12/12** records carry ≥ 2 refs and a curated web reference; subdivision
`Cranial nerve nuclei` still holds its **17** rows and `Cranial nerves` holds exactly its **12**.

### 6.2 The Systems partition after v13 (`npm run validate`, `verify:area-toggles`)

| `data-kind` | label | registry rows | v13 delta | boot `aria-pressed` |
| --- | --- | --- | --- | --- |
| `nucleus` | Nuclei | 88 | — | true |
| `tract` | Tracts | 53 | — | true |
| `ventricle` | Ventricles | 11 | — | true |
| `surface` | Surface | 25 | — | true |
| `vessel` | Vessels | 14 | — | true |
| `context` | Context | 45 | — | true |
| **`nerve`** | **Cranial nerves** | **12** | **+12 rows, +1 kind** | **true** (mandatory: the store throws otherwise) |
| **Σ** | **7 kinds** | **248 = every registry row** | — | boot row all `true` |

Registry by region (measured): telencephalon 87 · diencephalon 39 · midbrain 27 · pons 39 · medulla 37 ·
cerebellum 5 · vasculature 14 = **248**. The twelve rows are purely additive: `taxonomy.json` gained 12 lines
and the only changed pre-existing line is `ctx-s1-larynx` gaining a trailing comma.

### 6.3 What the toggle actually reaches — measured per surface

| surface | with `nerve` **on** | with `nerve` **off** | checked by |
| --- | --- | --- | --- |
| **3D scene** (`isStructureVisible`) | all 12 records admitted (24 drawn bodies — every nerve is `paired`) | **0** nerve records admitted, every other kind unchanged | `verify:nerve-kind` §6 census + per-case assertions; `verify:area-toggles` §9 (`[nerve-3D]`) |
| **Taxonomy tree** (`TaxonomyTree.layerOff`) | 0 of 12 dimmed | **12 of 12 dimmed** | `verify:area-toggles` §9 (the shipped predicate parsed out of the source and executed) |
| **Legend kind rows** | 7 rows, all checked | the `nerve` row unchecks, the other six and all region rows untouched | `verify:nerve-kind` §4 |
| **Header button** | `aria-pressed="true"` | `aria-pressed="false"`, the other six buttons' markup byte-identical, round trip byte-identical | `verify:nerve-kind` §3/§5 — the real `onClick` is called, not a re-typed action |
| **2D Plates live section + PiP** | 138 section parts | **138 section parts — invariant** | `verify:area-toggles` §9, `verify:audit` block R3b (browser lane) |

The 2D row is a **measured limit, not a claim of parity**: `sectionAssets.SECTION_PARTS` is one entry per
committed GLB (138) and **0 of them resolve to a part of kind `nerve`**, so `isPartVisible` returns the same 138
parts with the kind on and off. The gate asserts that invariance *and* a synthetic nerve part admitted iff
`kinds.has('nerve')` and its region is on, so the day a nerve GLB exists the two surfaces disagree loudly
instead of silently.

### 6.4 Geometry honesty — the numbers behind `meshes: false`

**12/12** records `meshes:false`; **12/12** placements with `origin3d` and positive-radius `size3d` whose full
extent lies inside `CLIP_BOUNDS` (x −58…58, y −55…116, z −76…72); **0** anatomy-manifest parts of kind `nerve`;
**0** `nrv-*` GLB files; **0** `anatomyAssets` links naming a nerve id; the manifest is still **138 parts / 138
GLBs / 13.82 MiB** and the section pipeline still **138/138 parts · 599,204 triangles**. Budget: **13.82 MiB of
14 MiB (0.18 MiB headroom)**, whole `src/assets/anatomy` tree 13.89 MiB, imaging 9.02 MiB of 10 MiB. The
schematics are drawn by the ordinary body pass (`KIND_OPACITY.nerve = 1`, `hintForKind('nerve') = 'nucleus'`),
and the manifest miss settles `useAnatomyAsset` to `status:'fallback'` — the path the four hippocampal
subfields and the lenticulostriate artery already take.

## 7. What did **not** ship, and why

1. **No nerve has a mesh — all twelve, stated with the reason.** `assets-src/` was searched file by file: its
   `bp3d/canonical/` holds 86 OBJs and the only nerve-named ones are the already-baked CN II trio
   (`tract-optic-nerve-left/right.obj`, `ctx-optic-chiasm-left/right.obj`, `tract-optic-tract-left/right.obj`);
   `raw/`, `raw-tel/`, `raw-vasc/` hold only `FJ*.obj` + `vasc-inventory.json`. There is **nothing to bake for
   CN I or CN III–XII**, and the budget has **0.18 MiB** of headroom while `verify:anatomy` freezes the existing
   bounding boxes. Each record is therefore a **record with a schematic placement marker**, and its
   `contextNote` says so in its own words.
2. **The 2D live section does not react to the `nerve` toggle** (0 of 138 parts), for the same reason: no
   committed geometry of that kind exists to hide. Measured and pinned (§6.3), not glossed.
3. **`verify:anatomy` 27/27 is NOT reproducible in this sandbox and is not claimed.** The gate exits **1** at
   `anatomy-qa.mjs` on `spawnSync powershell … EPERM` **before a single assertion prints**, so "27/27" here
   would be a claim about a check that did not run. The manifest/GLB/budget measurements in §6.4 stand in for it
   in this lane; the 27 items are the orchestrator's run.
4. **`verify:imaging-fit` is RED for the same environmental reason** — `FAIL the fitter could not be re-run:
   spawnSync node.exe EPERM`, **0 assertions run**. Red at base, in no v13 task's write scope, not claimed green.
5. **The browser lane was never run here.** `verify:audit` (including the review's new R3/R3b blocks, the
   composed `restoreDefaultFraming()` and the re-pointed header probes), `verify:acceptance` and
   `verify:browser` all need Chrome, which exits 4 in this sandbox with "no check was run". See §8.
6. **`docs/DATA_CONTRACT.md` still states the six-prefix slug contract** (`:90`) and a stale bounds table
   (`:106-108`), and `docs/ENGINEERING_PLAN.md:229` / the historical `docs/SWARM_V9_PLAN.md:40` carry the same
   prefixes. The integrator's write scope was four files (`README.md`, `docs/CONTENT_INVENTORY.md`,
   `docs/SWARM_V13_PLAN.md`, `package.json`), so `docs/CONTENT_INVENTORY.md` §2 was amended and these three
   copies are **reported for a follow-up one-line fix** rather than silently left behind.
7. **A real WCAG 2.5.3 (Label in Name) defect survives in the header, outside this run's reach.** The four
   All-module buttons show `All on` / `All off` while their accessible names are `All areas on — show every
   area` / `All areas off — …`: the visible text is **not** contained in the accessible name. `Header.tsx` is
   outside every v13 task's write scope, so `verify:a11y-contract` remains green (38/0, it does not read those
   labels) and `verify:area-toggles` pins the defect as **exactly four violations with their exact strings** —
   an exemption that **fails the moment the labels are fixed**, which is the opposite of hiding it.
8. **The v12 header contract is not restored to satisfy old checks.** No `data-preset` hook, no preset row and
   no `data-header-action` were re-added; the two gates that encoded them were re-pointed instead (§5 item 6).
9. **No pre-existing content moved.** The only `taxonomy.json` change is 12 appended rows (plus one trailing
   comma); no record, level, plate, syndrome or manifest part was edited, renumbered or re-baked.

## 8. Claim tiers — what is non-browser-verified here, and what only the orchestrator can prove

| claim | tier |
| --- | --- |
| `nerve` is declared in every declaration site and the sites **agree** (ALL_KINDS ≡ validator KINDS ≡ `Kind` union ≡ `KIND_GLYPH`/`KIND_OPACITY` key sets, seven kinds, `nerve` last) | **non-browser, asserted** — `verify:nerve-kind` §1 (and `tsc`, whose exhaustive maps fail otherwise) |
| the rendered `<Header />` carries a **Cranial nerves** button with `data-kind`, `aria-pressed`, a WCAG-2.5.3-correct accessible name, inside the `Structure systems` group, one per `ALL_KINDS` entry in order | **non-browser, asserted** — `verify:nerve-kind` §3 (14 assertions on a real `react-dom` render) |
| clicking that button removes **exactly** `nerve` from `layers.kinds` (regions/hidden/emphasis untouched), and clicking again restores the boot rendering byte-for-byte | **non-browser, asserted** — `verify:nerve-kind` §5 (the shipped `onClick` is called; the live element tree is re-read through a client `useSyncExternalStore`) |
| a nerve record is admitted by the ordinary schematic-placement path iff the `nerve` kind (and its region) is on, opaque, gray-matter hint | **non-browser, asserted** — `verify:nerve-kind` §6 on the shipped `isStructureVisible` / `KIND_OPACITY` / `hintForKind` |
| the twelve records exist, are well formed, carry the required content, resolve every id they name, and are mesh-less schematics inside the clip box | **non-browser, asserted** — `verify:cranial-nerves` **451/451** through the shipped data layer |
| the validator accepts the ids, the new kind and the new fields; the manifest, pipeline and budgets are untouched | **non-browser, asserted** — `validate` (248 rows, 0/0), `verify:pipeline` (138/138), `verify:budget-report` (5/0) |
| **that the Cranial nerves button is on screen, that the twelve markers are actually drawn and hidden by the toggle on a live page, that a real pointer/keyboard activates it, that the Plates canvas behaves as measured, and that the re-pointed `verify:audit` blocks (R3, R3b, `restoreDefaultFraming`) pass** | **orchestrator-browser-verified ONLY** — Chrome cannot start in this sandbox (`verify:audit` exits **4**, "no check was run"); the checks are **written** to read those facts and this run never observed them |
| `verify:anatomy` 27/27 and `verify:imaging-fit` green | **orchestrator lane** — both exit 1 here on `spawnSync … EPERM` before any assertion |

## 9. The integrator's sweep — every gate, with its exit code and its printed numbers

Run in one sequence from the repo root, each gate invoked **as its npm script** (so the wiring in §10 is proven,
not merely written), after `build` so that `verify:a11y-contract`'s shipped-bundle spot check could run.

| gate | result |
| --- | --- |
| `npm run validate` | **exit 0** — 0 errors / 0 warnings · **248** registry entries (0 awaiting an authored record) · 7 kinds: nucleus 88 · tract 53 · ventricle 11 · surface 25 · vessel 14 · context 45 · **nerve 12** (Σ 248) · authored Σ 225 · 19 structure files / 225 records · 23 tracts · 26 syndromes · 15 plates / 15 svg · 17 levels |
| `npm run check` | **exit 0** (`tsc --noEmit`) |
| `npm run build` | **exit 0** — `✓ built in 9.57s` |
| `npm run verify:pipeline` | **exit 0** — 138/138 parts · 599,204 triangles · 386 loops across 13 planes · **0 problem(s)** |
| `npm run verify:plane` | **exit 0** — **10,827 assertions**; 324 (axis, plane, viewport) triples · 3,888 photograph corners · 144 canvas/PiP size pairs; the pre-existing coronal camera-basis degeneracy is *reported*, not failed |
| `npm run verify:plane-helper-extent` | **exit 0** — **206 passed · 0 failed** (bite: mutated `clipPlanes.ts` moves every quad; shared tree SHA-256 identical) |
| `npm run verify:somatotopy` | **exit 0** — **45 passed · 0 failed** |
| `npm run verify:cortical-lobes` | **exit 0** — **564/564 assertions** |
| `npm run verify:imaging-fit` | **exit 1 — environment, not product** — `FAIL the fitter could not be re-run: spawnSync node.exe EPERM` (**0 assertions run**); red at base |
| `npm run verify:pip-contract` | **exit 0** — **187 passed · 0 failed** |
| `npm run verify:division-toggles` | **exit 0** — **251 assertions · 0 failed** |
| `npm run verify:view-filter-consistency` | **exit 0** — **102/102 assertions**; 138 parts · 225 structures · 23 tracts · 10 slots · 2 ghost shells · 7 regions × 7 kinds; parity 5/5 planes; 75 `Path2D` / 2,233 `lineTo` prove the pass stroked |
| `npm run verify:area-toggles` | **exit 0** — **437 assertions · 0 failed** in 14 groups (the two reds it encodes at base — 225/25 — are fixed by re-pointing, **not** by bending the product back) |
| `npm run verify:audit-checks` | **exit 0** — **92 passed · 0 failed · 7 informational · 9 groups** |
| `npm run verify:closure-bite` | **exit 0** — **7/7 mutations caught**, shared tree byte-identical, restored copy re-runs **92/0** |
| `npm run verify:boundary-contract` | **exit 0** — **22 passed · 0 failed** |
| `npm run verify:a11y-contract` | **exit 0** — **38 passed · 0 failed** (shipped-bundle spot check read `dist/assets/index-n7XIApPJ.js`) |
| `npm run verify:budget-report` | **exit 0** — **5 passed · 0 failed · 5 informational** — 599,204 tris ≤ 800,000 · GLB **13.82 MiB ≤ 14 (headroom 0.18 MiB)** · whole tree 13.89 MiB ≤ 14 · imaging 9.02 MiB ≤ 10 |
| `npm run verify:anatomy` | **exit 1 — environment, not product** — `spawnSync powershell … EPERM` before any verdict (0 assertions; the 27 items never run here) |
| **`npm run verify:cranial-nerves`** *(new script)* | **exit 0** — **451 assertions run · 451 passed · 0 failed** · 16 printed measurements · 12/12 records (`meshes:false` 12/12, placed 12/12) · regions medulla 4 · midbrain 2 · pons 4 · telencephalon 2 · manifest parts added **0** (still 138) |
| **`npm run verify:nerve-kind`** *(new script)* | **exit 0** — **79 passed · 0 failed** in 9 groups (9/6/14/8/18/9/8/6/1); bite: **8/8** defective kind tables caught by name; manifest 138 parts · 138 GLBs |
| `node scripts/verify-imaging-v4.mjs` | **exit 0** — v4 imaging QA PASSED (imaging 9.02 MiB in 82 files, cap 10; v4-added 3.81 MiB in 28 files, cap 4) |
| `node scripts/verify-imaging-v4b.mjs` | **exit 0** — `verify-imaging-v4b: OK` — 22 NLM cryosections, 22/22 re-decoded, credit verbatim in 5 records |
| `node scripts/verify/audit.mjs` / `verify:acceptance` / `verify:browser` | **not run and not claimed** — Chrome cannot start in this sandbox (exit **4**, "no check was run"); orchestrator lane |

Two gates are red, both for the **same documented environmental reason** (`spawnSync … EPERM`, 0 assertions
run), both red at base, neither in a v13 task's write scope. **No check passes by not running:** every gate
above printed its own counts, and the two new gates print 451 and 79 assertions respectively.

### 9.1 The literal last line(s) each gate printed (verbatim from the sweep)

```
npm run validate                     ✔ Validation PASSED — 0 errors, 0 warning(s)
npm run check                        (no output — tsc --noEmit, exit 0)
npm run build                        ✓ built in 9.57s
npm run verify:pipeline              pipeline: 138/138 parts · 599204 triangles · 386 loops across 13 planes · 0 problem(s)
                                     PASS section pipeline
npm run verify:plane                 ✔ plane transform QA PASSED — 10827 assertions
npm run verify:plane-helper-extent   plane-helper-extent: 206 passed · 0 failed — exit 0
npm run verify:somatotopy            45 passed · 0 failed
npm run verify:cortical-lobes        cortical-lobes: 564/564 assertions passed
                                     PASS cortical-lobes
npm run verify:imaging-fit           FAIL the fitter could not be re-run: spawnSync C:\nvm4w\nodejs\node.exe EPERM
npm run verify:pip-contract          187 passed · 0 failed
                                     ✔ simulated-section panel contract PASSED
npm run verify:division-toggles      251 assertions passed · 0 failed
npm run verify:view-filter-consistency
                                     view-filter-consistency: 102/102 assertions passed
npm run verify:area-toggles          437 assertions passed · 0 failed
npm run verify:audit-checks          92 passed · 0 failed · 7 informational · 9 group(s)
                                     ✔ Node-only audit check mirror PASSED
npm run verify:closure-bite          7/7 mutations caught by the mirror · shared tree untouched
npm run verify:boundary-contract     22 passed · 0 failed
npm run verify:a11y-contract         38 passed · 0 failed
npm run verify:budget-report         ✔ budget report PASSED — 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB — all inside their caps
npm run verify:anatomy               spawnSync powershell EPERM (errno −4048) at anatomy-qa.mjs:294 — 0 assertions run,
                                     uncaught error dump ends the process (Node.js v24.18.0)
npm run verify:cranial-nerves        ✔ 12 cranial-nerve records verified: 451 assertions passed, 0 failed
npm run verify:nerve-kind            79 passed · 0 failed
                                     ✔ NERVE-KIND GATE PASSED
node scripts/verify-imaging-v4.mjs   ✔ v4 imaging QA PASSED — anchors reachable, selection unambiguous, orientation
                                     matches §2.2, credits verbatim in code + docs, assets complete, budgets
                                     respected, no link-out source embedded.
node scripts/verify-imaging-v4b.mjs  verify-imaging-v4b: OK — 22 NLM Visible Human cryosections, -52.20 … 34.04 au,
                                     credit verbatim in 5 records, anchors clear of every other transverse anchor by > 1.5 au
```

The gates that read the documentation (`verify-imaging-v4` / `-v4b` read `README.md` and the credit lines) were
**re-run after this closure's documentation edits** and are green — `validate`, `check`, `build`,
`verify:cranial-nerves`, `verify:nerve-kind`, `verify:a11y-contract`, `verify:area-toggles`,
`verify:audit-checks`, `verify:budget-report`, `verify-imaging-v4`, `verify-imaging-v4b` all exit 0 again
(`build` printed `✓ built in 9.94s`).

## 10. `package.json` wiring (the integrator's file)

Exactly two lines were added, in the file's style, after `verify:closure-bite`; nothing pre-existing was touched
or renumbered — `npm run` now lists **26 script entries** (24 pre-existing + 2 new):

```json
"verify:cranial-nerves": "node scripts/verify/cranial-nerves.mjs",
"verify:nerve-kind": "node scripts/verify/nerve-kind.mjs"
```

Both were executed **as npm scripts** in §9, so the wiring is proven rather than merely written. (Neither new
script needs a precondition, a server or a browser — they import the shipped modules through the in-process
TS/TSX loader the other Node gates use.)
