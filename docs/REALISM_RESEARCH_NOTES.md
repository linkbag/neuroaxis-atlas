# Realism Research Notes — NeuroAxis v2

Compiled during the v2 planning phase. Companion to `docs/REALISM_PLAN.md`.

## 1. BodyParts3D — license verified at the source

- License page (read 2026-09-07, "Last updated 2025/02/27"): **Creative Commons Attribution 4.0 International** — https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Explicit permissions: freely access, **freely redistribute**, and **freely create and distribute derivative works**, with attribution: *"BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International."*
- Legacy CC BY-SA 2.1 JP text found in old OBJ comments is superseded by the official license page (the ashemag/human-atlas project reached the same conclusion — see its `public/ATTRIBUTION.md`).
- Download: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
  - `isa_BP3D_4.0_obj_99.zip` — 136 MB (IS-A tree)
  - **`partof_BP3D_4.0_obj_99.zip` — 62 MB (PART-OF tree) ← our target**
  - Metadata: `isa_parts_list_e.txt` (126 KB), `partof_element_parts.txt` (654 KB) — both already downloaded to `.bp3d-probe/` in this repo.
- Publication: Mitsuhashi et al. 2009, BodyParts3D: 3D structure database for anatomical concepts, doi:10.1093/nar/gkn613. Basis: adult male TARO MRI + illustration refinement; mm, Z-up.

### Brain meshes confirmed in the parts list (grep of isa_parts_list_e.txt)
FMA61993 midbrain (BP5695) · FMA62394 peduncle of midbrain (BP6560) · FMA62403/FMA62404 superior/inferior colliculus (BP5690/91) · FMA67943 pons (BP6545) · FMA62004 medulla oblongata (BP5693) · FMA62007 thalamus (BP6495) · FMA62008 hypothalamus (BP6496) · FMA62033 pineal body (BP5525) · FMA67944 cerebellum (BP5696) · brachia of colliculi + stria medullaris also present. Internal nuclei (red nucleus, SN, cranial-nerve nuclei) are NOT expected → procedural Layer 2 covers them.

## 2. Alternatives considered and rejected
- **FreeSurfer fsaverage / ThalamicNuclei / brainstem subsegmentation**: toolchain won't run here (Linux-oriented), and atlas/data redistribution licensing is murkier than BP3D's clean CC BY 4.0. Nomenclature value already consumed in v1.
- **Bianciardi brainstem "structome" (ultra-high-field MRI nuclei template)**: research-distribution licensing unclear, availability uncertain. Cited as inspiration only.
- **BigBrain / Julich / HCP**: NC licenses or restricted data agreements. Rejected.
- **Sketchfab CC models**: API-key friction + provenance inconsistency. Rejected.

## 3. Rendering stack — version pins verified via npm
- `@react-three/postprocessing@2.16.3` peers: `react >=18`, `three >=0.138`, `@react-three/fiber >=8` → compatible with our react 18.3.1 / three 0.169.0 / fiber 8.17.10.
- Optional `n8ao` peers: `postprocessing >=6.30.0`, `three >=0.137` → compatible if SSAO quality needs an upgrade.
- three.js has no built-in subsurface scattering; the "tissue" look is achieved via MeshPhysicalMaterial (sheen/clearcoat/roughness) + fresnel-weighted translucency + SSAO + ACES tone mapping (approach consistent with community SSS explorations, e.g. bobbyroe/sss-material-play).
- Environment lighting must not fetch remote HDRs at runtime: use three's bundled `RoomEnvironment` + PMREMGenerator (offline, deterministic).

## 4. Robustness findings from v1 (fixed this round)
- Vite dev watcher crashes (EBUSY) when tools write inside the repo root while the server runs → `server.watch.ignored` added to `vite.config.ts` for `.bp3d-probe/`, `assets-src/`, and scratch dirs; those dirs are gitignored.
- Swarm evidence paths must match repo conventions exactly (v1 had a manifest-path mismatch that burned retries) → v2 evidence contracts quote exact paths from `REALISM_PLAN.md` §4/§7.

## 5. References for shape fidelity
Blumenfeld surface-anatomy plates; RSNA RadioGraphics 2019 "Midbrain, Pons, and Medulla" (doi:10.1148/rg.2019180126); our own 12 SVG plates (already textbook-aligned) as cross-section ground truth for envelope/level alignment.
