# Vascular, optic and deep-limbic mesh inventory (NeuroAxis v8)

Task **`vasc-acquire`** (v8 run) — the acquisition half of `docs/NEUROATLAS_V8_PLAN.md` §1a/§1b/§1d/§1f
and DAG row 1 (§6). Machine-readable companion: `assets-src/bp3d/raw-vasc/vasc-inventory.json`;
every number in this document is generated from that file, and it carries a per-file sha256 so any
single claim below can be re-checked without re-running the extraction.

| | |
| --- | --- |
| Source archive | `assets-src/bp3d/isa_BP3D_4.0_obj_99.zip` — 142,903,898 bytes, sha256 `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e` |
| Extraction target | `assets-src/bp3d/raw-vasc/` (gitignored with all of `assets-src/` — `.gitignore` line 23) |
| Extraction command | `tar -xf assets-src/bp3d/isa_BP3D_4.0_obj_99.zip -C assets-src/bp3d/raw-vasc --strip-components=1 isa_BP3D_4.0_obj_99/FJ####.obj (one command, 122 entries)` |
| Id resolution | `.bp3d-probe/isa_parts.txt (FMA → BP representation id)` + `.bp3d-probe/isa_elements.txt (FMA → FJ element file id)` |
| Meshes inventoried | **133** — 122 extracted into `raw-vasc/` by this task + 11 already present in `raw/`/`raw-tel/` (re-measured here, not re-extracted) |
| Geometry | 111,336 vertices / **188,482 faces** — 0 empty, 0 degenerate faces |
| BP3D concepts resolved | 272 concept→element mappings over 106 BP representation ids / 106 FMA ids |
| Mirror L/R element pairs | 52 |
| Missing or unresolved | **0** — every BP id the plan names resolves in the probe lists, and every element file it points at exists in the archive |

## 1. Licence and attribution

The geometry above is **BodyParts3D 4.0**, (c) The Database Center for Life Science (DBCLS),
licensed **CC Attribution 4.0 International (CC BY 4.0)** — exactly the same source, licence and
attribution string the atlas already carries for every other BP3D-derived mesh (v2 realism run:
`assets-src/bp3d/PROBE.md`; v7 telencephalon: `docs/TELENCEPHALON_PLAN.md`, `docs/IMAGING_SOURCES.md`).
No new source, no new licence obligation, and **no download** — the archive was already in the
repository. The credit line stays verbatim in `ATTRIBUTION.md` / `README.md` / the app credit panel:

> BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution 4.0 International.

The files listed here are **raw sources and stay gitignored**; only registered/baked derivatives are
committed, so this task adds nothing to the committed footprint.

---

## 2. Coordinate frame of the raw meshes

| Axis | BP3D 4.0 element space |
| --- | --- |
| Units | millimetres, whole-body origin, Z-up |
| x | **+ = subject LEFT** (established in v2: FMA73423 left superior colliculus = FJ1779, mean x = +3.56 mm) |
| y | **+ = POSTERIOR** (anterior is more negative y) |
| z | **+ = SUPERIOR**; brain tissue spans z ≈ 1460–1623 mm |
| Anatomical midline | x = **-0.655 mm** — mean x of the near-midline seams of five paired elements (medulla, pons, midbrain, cerebellum, hypothalamus) in the v2 registration set — scripts/lib/register.mjs §3 |
| Canonical scale | 1 au = 1.2 mm (x/z uniform; y warped onto levels.json anchors) |

`bboxAu` in the JSON is a raw mm→au conversion at that scale, recorded only so the size of the new
geometry is easy to judge. It is **not** the canonical registration: the y-warp onto the
`levels.json` anchors, the centreline straightening and the pair splits are task
`vasc-register-bake` (§6 row 2).

The conventions were re-verified on the new meshes rather than inherited on trust:

- **x sign:** the ICA pair `FJ1682`/`FJ1682M` (x ∈ [−37.5, −9.8] / [9.8, 37.5] mm) and the ACA pair
  `FJ1654`/`FJ1654M` (x ∈ [−15.4, −1.1] / [1.1, 15.4] mm) are mirror-exact within 0.01 mm across
  the midline, so every paired element in the set can be side-assigned from geometry alone.
- **y sign:** the optic nerve (FJ1313/FJ1364, y ∈ [−142.5, −102.2]) lies rostral of the optic chiasm
  (FJ1771/FJ1818, y ∈ [−110.4, −100.1]), which lies rostral of the optic tract (FJ1773/FJ1820,
  y ∈ [−107.4, −69.6]) — the retinofugal chain only reads anterior→posterior with y− = anterior.
- **z sign:** the basilar artery (x ∈ [−2.1, 1.3] mm, on the midline) spans z 1502.6–1532.3 mm, i.e.
  from the pontomedullary junction up the ventral pons — the same z band as the pons element FJ1775,
  as the ventral position requires.
- **Corollary worth knowing at bake time:** BP3D decimation is mirror-symmetric in x (pre- and
  post-centreline x agree to <0.01 mm within a pair) but *not* in y/z, so the two halves of a pair
  are not byte-identical and either one alone is a valid source for a bilateral record.

---

## 3. Cerebral vasculature — per-mesh table

`side` is **measured** from each element's x range against the midline above, never copied from the
BP3D concept name. `v`/`faces` are the pre-decimation counts measured from the extracted OBJ.
Files carrying the same id appear once, listing every BP concept that shares them.

| File | BP3D concept(s) | FMA | v | faces | bbox (mm) | side | atlas record | role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FJ1654.obj` | BP8703 · anterior cerebral artery<br>BP8702 · right anterior cerebral artery | FMA50028+FMA50029 | 213 | 400 | x [-15.4, -1.1]<br>y [-121.21, -109]<br>z [1534.87, 1548.98] | right | `vasc-anterior-cerebral-artery` | half |
| `FJ1654M.obj` | BP8703 · anterior cerebral artery<br>BP10236 · left anterior cerebral artery | FMA50028+FMA50030 | 213 | 400 | x [1.1, 15.4]<br>y [-121.21, -109]<br>z [1534.87, 1548.98] | left | `vasc-anterior-cerebral-artery` | half |
| `FJ1655.obj` | BP6365 · anterior communicating artery | FMA50169 | 63 | 80 | x [-4.16, 2.71]<br>y [-113.34, -111.53]<br>z [1537, 1538.37] | bilateral (spans midline) | `vasc-anterior-communicating-artery` | primary |
| `FJ1656.obj` | BP8960 · anterior inferior cerebellar artery | FMA50544 | 524 | 766 | x [-35.69, 0.65]<br>y [-89.26, -61.14]<br>z [1502.11, 1511.88] | right | `vasc-anterior-inferior-cerebellar-artery` | half |
| `FJ1656M.obj` | BP8960 · anterior inferior cerebellar artery | FMA50544 | 519 | 766 | x [-0.65, 35.69]<br>y [-89.26, -61.14]<br>z [1502.11, 1511.88] | left | `vasc-anterior-inferior-cerebellar-artery` | half |
| `FJ1657.obj` | BP9244 · anterior spinal artery<br>BP7600 · right anterior spinal artery | FMA50531+FMA50532 | 218 | 304 | x [-14.5, 0.42]<br>y [-73.37, -65.03]<br>z [1465.53, 1493.16] | right | — (source only) | support |
| `FJ1657M.obj` | BP9244 · anterior spinal artery<br>BP9243 · left anterior spinal artery | FMA50531+FMA50533 | 218 | 304 | x [-0.42, 14.5]<br>y [-73.37, -65.03]<br>z [1465.53, 1493.16] | left | — (source only) | support |
| `FJ1658.obj` | BP8626 · anterior choroidal artery<br>BP7601 · right anterior choroidal artery | FMA50087+FMA50088 | 343 | 418 | x [-34.03, -11.13]<br>y [-108.36, -61.69]<br>z [1533.31, 1547.16] | right | `vasc-anterior-choroidal-artery` | half |
| `FJ1658M.obj` | BP8626 · anterior choroidal artery<br>BP8625 · left anterior choroidal artery | FMA50087+FMA50089 | 343 | 418 | x [11.13, 34.03]<br>y [-108.36, -61.69]<br>z [1533.31, 1547.16] | left | `vasc-anterior-choroidal-artery` | half |
| `FJ1659.obj` | BP7947 · branch of middle cerebral artery | FMA50081 | 1,104 | 1,214 | x [-68.29, -47.51]<br>y [-115.78, -74.24]<br>z [1518.04, 1562.46] | right | — (source only) | support |
| `FJ1659M.obj` | BP7947 · branch of middle cerebral artery | FMA50081 | 1,104 | 1,214 | x [47.51, 68.29]<br>y [-115.78, -74.24]<br>z [1518.04, 1562.47] | left | — (source only) | support |
| `FJ1660.obj` | BP8593 · zone of middle cerebral artery<br>BP8975 · insular part of middle cerebral artery<br>BP8974 · insular part of right middle cerebral artery | FMA50080+FMA50368+FMA50369 | 579 | 1,154 | x [-43.34, -37.43]<br>y [-112.19, -105.9]<br>z [1543, 1557.04] | right | `vasc-middle-cerebral-artery` | support+half |
| `FJ1660M.obj` | BP8593 · zone of middle cerebral artery<br>BP8975 · insular part of middle cerebral artery<br>BP10240 · insular part of left middle cerebral artery | FMA50080+FMA50368+FMA50370 | 579 | 1,154 | x [37.43, 43.34]<br>y [-112.19, -105.9]<br>z [1543, 1557.05] | left | `vasc-middle-cerebral-artery` | support+half |
| `FJ1662.obj` | BP7947 · branch of middle cerebral artery<br>BP8509 · anterolateral central branch of middle cerebral artery<br>BP8508 · anterolateral central branch of right middle cerebral artery | FMA50081+FMA50376+FMA50377 | 1,431 | 1,226 | x [-29.9, -12.39]<br>y [-118.44, -76.6]<br>z [1536.09, 1571.96] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1662M.obj` | BP7947 · branch of middle cerebral artery<br>BP8509 · anterolateral central branch of middle cerebral artery<br>BP10238 · anterolateral central branch of left middle cerebral artery | FMA50081+FMA50376+FMA50378 | 1,424 | 1,226 | x [12.39, 29.9]<br>y [-118.44, -76.6]<br>z [1536.09, 1571.96] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1663.obj` | BP7947 · branch of middle cerebral artery<br>BP8509 · anterolateral central branch of middle cerebral artery<br>BP8508 · anterolateral central branch of right middle cerebral artery | FMA50081+FMA50376+FMA50377 | 368 | 316 | x [-26.2, -8.29]<br>y [-108.83, -83.95]<br>z [1536.02, 1553.93] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1663M.obj` | BP7947 · branch of middle cerebral artery<br>BP8509 · anterolateral central branch of middle cerebral artery<br>BP10238 · anterolateral central branch of left middle cerebral artery | FMA50081+FMA50376+FMA50378 | 370 | 316 | x [8.29, 26.2]<br>y [-108.83, -83.95]<br>z [1536.02, 1553.93] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1664.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,972 | 3,890 | x [-68.11, -43.66]<br>y [-102.35, -68.64]<br>z [1549.42, 1605.94] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1664M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,967 | 3,890 | x [43.66, 68.11]<br>y [-102.35, -68.64]<br>z [1549.42, 1605.94] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1665.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,791 | 3,518 | x [-69.25, -38.24]<br>y [-86.89, -45.61]<br>z [1563.07, 1615.92] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1665M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,791 | 3,518 | x [38.24, 69.25]<br>y [-86.89, -45.61]<br>z [1563.07, 1615.92] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1666.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,414 | 2,816 | x [-72.34, -50.71]<br>y [-74.13, -43.29]<br>z [1565.75, 1603.13] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1666M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,412 | 2,816 | x [50.71, 72.34]<br>y [-74.13, -43.29]<br>z [1565.74, 1603.14] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1667.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 964 | 1,908 | x [-71.13, -36.6]<br>y [-61.4, -34.55]<br>z [1571.82, 1606.15] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1667M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 963 | 1,908 | x [36.6, 71.13]<br>y [-61.4, -34.55]<br>z [1571.83, 1606.15] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1668.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,757 | 3,486 | x [-61.88, -32.37]<br>y [-111.89, -72.72]<br>z [1555.77, 1621.03] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1668M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,758 | 3,486 | x [32.37, 61.88]<br>y [-111.89, -72.72]<br>z [1555.77, 1621.03] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1669.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 637 | 1,266 | x [-58.24, -46.82]<br>y [-118.55, -106.56]<br>z [1560.87, 1584.19] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1669M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 637 | 1,266 | x [46.82, 58.24]<br>y [-118.55, -106.55]<br>z [1560.87, 1584.19] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1670.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 450 | 886 | x [-61.89, -47.68]<br>y [-103.57, -98.72]<br>z [1577.03, 1603.91] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1670M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 450 | 886 | x [47.68, 61.89]<br>y [-103.57, -98.72]<br>z [1577.03, 1603.91] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1672.obj` | BP6340 · basilar artery | FMA50542 | 140 | 262 | x [-2.11, 1.27]<br>y [-97.73, -84.34]<br>z [1503.55, 1531.85] | bilateral (spans midline) | `vasc-basilar-artery` | primary |
| `FJ1673.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP8551 · branch of middle cerebral artery to angular gyrus | FMA50081+FMA50439+FMA50475 | 928 | 1,736 | x [-64.23, -40.44]<br>y [-39.24, -14.38]<br>z [1573.16, 1590.43] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1673M.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP8551 · branch of middle cerebral artery to angular gyrus | FMA50081+FMA50439+FMA50475 | 924 | 1,736 | x [40.44, 64.23]<br>y [-39.24, -14.38]<br>z [1573.16, 1590.43] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1675.obj` | BP8899 · thalamogeniculate artery<br>BP7612 · right thalamogeniculate artery | FMA50629+FMA50670 | 882 | 778 | x [-22.62, -3.36]<br>y [-98.22, -60.12]<br>z [1532.86, 1557.86] | right | — (source only) | support |
| `FJ1675M.obj` | BP8899 · thalamogeniculate artery<br>BP8898 · left thalamogeniculate artery | FMA50629+FMA50671 | 883 | 778 | x [3.36, 22.62]<br>y [-98.22, -60.12]<br>z [1532.86, 1557.86] | left | — (source only) | support |
| `FJ1682.obj` | BP8901 · internal carotid artery<br>BP7618 · right internal carotid artery | FMA3947+FMA3949 | 650 | 1,272 | x [-37.47, -9.84]<br>y [-114.56, -94.04]<br>z [1434.54, 1537.72] | right | — (source only) | support |
| `FJ1682M.obj` | BP8901 · internal carotid artery<br>BP8900 · left internal carotid artery | FMA3947+FMA4062 | 650 | 1,272 | x [9.84, 37.47]<br>y [-114.55, -94.04]<br>z [1434.54, 1537.72] | left | — (source only) | support |
| `FJ1683.obj` | BP8767 · lateral superior cerebellar artery<br>BP7619 · lateral branch of right superior cerebellar artery | FMA50577+FMA50578 | 713 | 728 | x [-46.79, -15.59]<br>y [-76.14, -20.55]<br>z [1509.75, 1528.75] | right | `vasc-superior-cerebellar-artery` | support |
| `FJ1683M.obj` | BP8767 · lateral superior cerebellar artery<br>BP8766 · lateral branch of left superior cerebellar artery | FMA50577+FMA50579 | 720 | 728 | x [15.59, 46.79]<br>y [-76.14, -20.55]<br>z [1509.75, 1528.75] | left | `vasc-superior-cerebellar-artery` | support |
| `FJ1685.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,818 | 3,580 | x [-47.64, -27.46]<br>y [-161.07, -113.02]<br>z [1546.2, 1570.12] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1685M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 1,821 | 3,580 | x [27.46, 47.64]<br>y [-161.07, -113.02]<br>z [1546.2, 1570.13] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1686.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 411 | 804 | x [-51.82, -49.59]<br>y [-146.62, -118.75]<br>z [1553.04, 1565.64] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1686M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 411 | 804 | x [49.59, 51.82]<br>y [-146.62, -118.75]<br>z [1553.04, 1565.64] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1688.obj` | BP8698 · medial branch of superior cerebellar artery<br>BP7623 · medial branch of right superior cerebellar artery | FMA50580+FMA50581 | 342 | 354 | x [-21.34, -9.79]<br>y [-76.2, -29.8]<br>z [1524.92, 1537.03] | right | `vasc-superior-cerebellar-artery` | support |
| `FJ1688M.obj` | BP8698 · medial branch of superior cerebellar artery<br>BP8697 · medial branch of left superior cerebellar artery | FMA50580+FMA50582 | 343 | 354 | x [9.79, 21.34]<br>y [-76.2, -29.8]<br>z [1524.92, 1537.03] | left | `vasc-superior-cerebellar-artery` | support |
| `FJ1692.obj` | BP8593 · zone of middle cerebral artery<br>BP8592 · sphenoid part of middle cerebral artery<br>BP7627 · sphenoid part of right middle cerebral artery | FMA50080+FMA50365+FMA50366 | 402 | 800 | x [-44.31, -13.14]<br>y [-115.27, -102.97]<br>z [1534.51, 1549.64] | right | `vasc-middle-cerebral-artery` | support+half |
| `FJ1692M.obj` | BP8593 · zone of middle cerebral artery<br>BP8592 · sphenoid part of middle cerebral artery<br>BP8591 · sphenoid part of left middle cerebral artery | FMA50080+FMA50365+FMA50367 | 402 | 800 | x [13.14, 44.31]<br>y [-115.27, -102.97]<br>z [1534.51, 1549.65] | left | `vasc-middle-cerebral-artery` | support+half |
| `FJ1693.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP9120 · middle temporal branch of middle cerebral artery<br>BP9119 · middle temporal branch of right middle cerebral artery | FMA50081+FMA50439+FMA50466+FMA50467 | 704 | 818 | x [-70.93, -44.84]<br>y [-91.75, -39.93]<br>z [1520.75, 1566.33] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1693M.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP9120 · middle temporal branch of middle cerebral artery<br>BP10239 · middle temporal branch of left middle cerebral artery | FMA50081+FMA50439+FMA50466+FMA50468 | 701 | 818 | x [44.84, 70.93]<br>y [-91.75, -39.93]<br>z [1520.75, 1566.33] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1694.obj` | BP8593 · zone of middle cerebral artery<br>BP8975 · insular part of middle cerebral artery<br>BP8974 · insular part of right middle cerebral artery | FMA50080+FMA50368+FMA50369 | 2,361 | 4,706 | x [-53.39, -36.57]<br>y [-105.54, -70.32]<br>z [1547.07, 1570.41] | right | `vasc-middle-cerebral-artery` | support+half |
| `FJ1694M.obj` | BP8593 · zone of middle cerebral artery<br>BP8975 · insular part of middle cerebral artery<br>BP10240 · insular part of left middle cerebral artery | FMA50080+FMA50368+FMA50370 | 2,362 | 4,706 | x [36.57, 53.39]<br>y [-105.54, -70.32]<br>z [1547.07, 1570.41] | left | `vasc-middle-cerebral-artery` | support+half |
| `FJ1695.obj` | BP9114 · ophthalmic artery<br>BP7629 · right ophthalmic artery | FMA49868+FMA49869 | 1,207 | 2,410 | x [-13.67, -10.4]<br>y [-165.4, -110.95]<br>z [1528.89, 1544.37] | right | — (source only) | support |
| `FJ1695M.obj` | BP9114 · ophthalmic artery<br>BP9113 · left ophthalmic artery | FMA49868+FMA49870 | 1,207 | 2,410 | x [10.4, 13.67]<br>y [-165.4, -110.95]<br>z [1528.89, 1544.38] | left | — (source only) | support |
| `FJ1700.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 272 | 326 | x [-22.61, -11.2]<br>y [-53.34, -36.43]<br>z [1487.77, 1491.37] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1700M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 274 | 326 | x [11.2, 22.61]<br>y [-53.34, -36.43]<br>z [1487.77, 1491.37] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1701.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 427 | 306 | x [-29.9, -10.17]<br>y [-32.32, -17.71]<br>z [1494.08, 1505.8] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1701M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 428 | 306 | x [10.17, 29.9]<br>y [-32.32, -17.71]<br>z [1494.08, 1505.8] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1702.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 356 | 240 | x [-24.88, -6.39]<br>y [-37.48, -12.48]<br>z [1497.43, 1510.62] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1702M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 356 | 240 | x [6.39, 24.88]<br>y [-37.48, -12.48]<br>z [1497.4, 1510.62] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1703.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 348 | 224 | x [-13.8, -7.57]<br>y [-24.22, -11.9]<br>z [1497.45, 1517.3] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1703M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 344 | 224 | x [7.57, 13.8]<br>y [-24.22, -11.9]<br>z [1497.45, 1517.3] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1704.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 261 | 286 | x [-35.55, -22.04]<br>y [-58.08, -49.96]<br>z [1490.78, 1498.5] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1704M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 258 | 286 | x [22.04, 35.55]<br>y [-58.08, -49.96]<br>z [1490.78, 1498.5] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1705.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 277 | 322 | x [-37.14, -23.11]<br>y [-44.11, -22.92]<br>z [1492.38, 1505.8] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1705M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 280 | 322 | x [23.11, 37.14]<br>y [-44.11, -22.92]<br>z [1492.38, 1505.8] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1706.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 290 | 292 | x [-53.58, -34.33]<br>y [-51.17, -39.07]<br>z [1492.59, 1512.86] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1706M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 284 | 292 | x [34.33, 53.58]<br>y [-51.17, -39.07]<br>z [1492.59, 1512.86] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1707.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 122 | 84 | x [-16.31, -9.84]<br>y [-38.37, -35.16]<br>z [1490.66, 1496.25] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1707M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 122 | 84 | x [9.84, 16.31]<br>y [-38.37, -35.16]<br>z [1490.66, 1496.25] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1708.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 136 | 86 | x [-30.59, -27.54]<br>y [-61.85, -56.56]<br>z [1495.95, 1498.92] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1708M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 136 | 86 | x [27.54, 30.59]<br>y [-61.85, -56.56]<br>z [1495.95, 1498.92] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1709.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 238 | 176 | x [-51.37, -46.94]<br>y [-56.85, -50.49]<br>z [1502.11, 1511.5] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1709M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 238 | 176 | x [46.94, 51.37]<br>y [-56.85, -50.49]<br>z [1502.11, 1511.5] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1710.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 212 | 166 | x [-51.78, -46.83]<br>y [-36.15, -32.77]<br>z [1504.15, 1515.19] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1710M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 210 | 166 | x [46.83, 51.78]<br>y [-36.15, -32.77]<br>z [1504.15, 1515.19] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1711.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 821 | 736 | x [-33.09, -5.46]<br>y [-63.25, -30.09]<br>z [1488.94, 1499.67] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1711M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 817 | 736 | x [5.46, 33.09]<br>y [-63.25, -30.09]<br>z [1488.94, 1499.67] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1712.obj` | BP7947 · branch of middle cerebral artery | FMA50081 | 269 | 360 | x [-51.56, -31.08]<br>y [-128.97, -104.54]<br>z [1527.17, 1553.79] | right | — (source only) | support |
| `FJ1712M.obj` | BP7947 · branch of middle cerebral artery | FMA50081 | 271 | 360 | x [31.08, 51.56]<br>y [-128.97, -104.54]<br>z [1527.17, 1553.79] | left | — (source only) | support |
| `FJ1713.obj` | BP8195 · posterior communicating artery<br>BP7634 · right posterior communicating artery | FMA50084+FMA50085 | 122 | 204 | x [-12.57, -5.46]<br>y [-110.52, -97.14]<br>z [1530.49, 1534.17] | right | `vasc-posterior-communicating-artery` | half |
| `FJ1713M.obj` | BP8195 · posterior communicating artery<br>BP8194 · left posterior communicating artery | FMA50084+FMA50086 | 122 | 204 | x [5.46, 12.57]<br>y [-110.52, -97.14]<br>z [1530.49, 1534.17] | left | `vasc-posterior-communicating-artery` | half |
| `FJ1714.obj` | BP7836 · postcommunicating part of posterior cerebral artery<br>BP7635 · postcommunicating part of right posterior cerebral artery | FMA50591+FMA50641 | 280 | 544 | x [-17.6, -6.38]<br>y [-98.54, -61.64]<br>z [1529.4, 1539.54] | right | `vasc-posterior-cerebral-artery` | half |
| `FJ1714M.obj` | BP7836 · postcommunicating part of posterior cerebral artery<br>BP7835 · postcommunicating part of left posterior cerebral artery | FMA50591+FMA50642 | 280 | 544 | x [6.38, 17.6]<br>y [-98.54, -61.64]<br>z [1529.4, 1539.54] | left | `vasc-posterior-cerebral-artery` | half |
| `FJ1715.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7632 · right posterior inferior cerebellar artery | FMA50518+FMA50519 | 668 | 796 | x [-53.38, -12.84]<br>y [-72.9, -35.18]<br>z [1490.25, 1515.11] | right | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1715M.obj` | BP7797 · posterior inferior cerebellar artery<br>BP7796 · left posterior inferior cerebellar artery | FMA50518+FMA50520 | 673 | 796 | x [12.84, 53.38]<br>y [-72.9, -35.18]<br>z [1490.25, 1515.11] | left | `vasc-posterior-inferior-cerebellar-artery` | half |
| `FJ1716.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 3,447 | 6,812 | x [-66.51, -28.24]<br>y [-88.19, -13.4]<br>z [1554.66, 1603.14] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1716M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 3,447 | 6,812 | x [28.24, 66.51]<br>y [-88.19, -13.4]<br>z [1554.66, 1603.14] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1717.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP8911 · posterior temporal branch of middle cerebral artery<br>BP8910 · posterior temporal branch of right middle cerebral artery | FMA50081+FMA50439+FMA50469+FMA50470 | 1,697 | 3,328 | x [-70.46, -48.04]<br>y [-69.2, -19.52]<br>z [1526.59, 1562.58] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1717M.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP8911 · posterior temporal branch of middle cerebral artery<br>BP10242 · posterior temporal branch of left middle cerebral artery | FMA50081+FMA50439+FMA50469+FMA50471 | 1,701 | 3,328 | x [48.04, 70.46]<br>y [-69.2, -19.52]<br>z [1526.58, 1562.58] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1721.obj` | BP9001 · posteromedial central branch of posterior cerebral artery<br>BP7640 · posteromedial central branch of right posterior cerebral artery | FMA50587+FMA50660 | 196 | 252 | x [-24.95, -13.47]<br>y [-94.16, -85.64]<br>z [1530.19, 1538.09] | right | — (source only) | support |
| `FJ1721M.obj` | BP9001 · posteromedial central branch of posterior cerebral artery<br>BP9000 · posteromedial central branch of left posterior cerebral artery | FMA50587+FMA50661 | 196 | 252 | x [13.47, 24.95]<br>y [-94.16, -85.64]<br>z [1530.19, 1538.09] | left | — (source only) | support |
| `FJ1723.obj` | BP7977 · precommunicating part of posterior cerebral artery<br>BP7642 · precommunicating part of right posterior cerebral artery | FMA50590+FMA50639 | 155 | 282 | x [-8.27, 0.35]<br>y [-98.49, -95.25]<br>z [1529.28, 1534.76] | right | `vasc-posterior-cerebral-artery` | half |
| `FJ1723M.obj` | BP7977 · precommunicating part of posterior cerebral artery<br>BP7976 · precommunicating part of left posterior cerebral artery | FMA50590+FMA50640 | 155 | 282 | x [-0.35, 8.27]<br>y [-98.49, -95.25]<br>z [1529.28, 1534.76] | left | `vasc-posterior-cerebral-artery` | half |
| `FJ1724.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 2,789 | 5,424 | x [-57.51, -32.19]<br>y [-137.39, -109.66]<br>z [1554.56, 1609.95] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1724M.obj` | BP7947 · branch of middle cerebral artery<br>BP7946 · superior terminal branch of middle cerebral artery | FMA50081+FMA50436 | 2,786 | 5,424 | x [32.19, 57.51]<br>y [-137.39, -109.66]<br>z [1554.56, 1609.95] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1725.obj` | BP8813 · vertebral artery<br>BP7644 · right vertebral artery | FMA3956+FMA3958 | 489 | 800 | x [-33.67, 0.38]<br>y [-86.87, -58.57]<br>z [1398.41, 1506.04] | right | `vasc-vertebral-artery` | half |
| `FJ1725M.obj` | BP8813 · vertebral artery<br>BP8812 · left vertebral artery | FMA3956+FMA4066 | 489 | 800 | x [-0.38, 33.67]<br>y [-86.87, -58.57]<br>z [1398.41, 1506.03] | left | `vasc-vertebral-artery` | half |
| `FJ1726.obj` | BP9291 · superior cerebellar artery<br>BP7645 · right superior cerebellar artery | FMA50573+FMA50574 | 226 | 406 | x [-21.42, 0.73]<br>y [-97.69, -74.39]<br>z [1520.81, 1527.71] | right | `vasc-superior-cerebellar-artery` | half |
| `FJ1726M.obj` | BP9291 · superior cerebellar artery<br>BP9290 · left superior cerebellar artery | FMA50573+FMA50575 | 226 | 406 | x [-0.73, 21.42]<br>y [-97.69, -74.39]<br>z [1520.81, 1527.71] | left | `vasc-superior-cerebellar-artery` | half |
| `FJ1727.obj` | BP9135 · posterior medial choroidal artery<br>BP7646 · right posterior medial choroidal artery<br>BP9136 · branch of posterior choroidal artery | FMA50630+FMA50672+FMA86127 | 557 | 880 | x [-6.95, -3.84]<br>y [-102.3, -58.32]<br>z [1544.12, 1566.79] | right | `vasc-posterior-choroidal-artery` | half |
| `FJ1727M.obj` | BP9135 · posterior medial choroidal artery<br>BP9134 · left posterior medial choroidal artery<br>BP9136 · branch of posterior choroidal artery | FMA50630+FMA50673+FMA86127 | 557 | 880 | x [3.84, 6.95]<br>y [-102.3, -58.32]<br>z [1544.11, 1566.79] | left | `vasc-posterior-choroidal-artery` | half |
| `FJ1729.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP8855 · temporo-occipital branch of middle cerebral artery<br>BP7648 · temporo-occipital branch of right middle cerebral artery | FMA50081+FMA50439+FMA50472+FMA50473 | 1,538 | 2,416 | x [-62.69, -15.37]<br>y [-105.94, 9.76]<br>z [1522.49, 1569.51] | right | `vasc-middle-cerebral-artery` | half+support |
| `FJ1729M.obj` | BP7947 · branch of middle cerebral artery<br>BP8552 · inferior terminal branch of middle cerebral artery<br>BP8855 · temporo-occipital branch of middle cerebral artery<br>BP8854 · temporo-occipital branch of left middle cerebral artery | FMA50081+FMA50439+FMA50472+FMA50474 | 1,540 | 2,416 | x [15.37, 62.69]<br>y [-105.94, 9.76]<br>z [1522.5, 1569.5] | left | `vasc-middle-cerebral-artery` | half+support |
| `FJ1844.obj` | BP6340 · basilar artery | FMA50542 | 128 | 244 | x [-2.28, 0.95]<br>y [-98.17, -83.55]<br>z [1502.63, 1532.27] | bilateral (spans midline) | `vasc-basilar-artery` | primary |
| `FJ3483.obj` | BP10289 · common carotid artery<br>BP10326 · left common carotid artery | FMA3939+FMA4058 | 126 | 170 | x [10.82, 22.93]<br>y [-112.22, -96.01]<br>z [1307.39, 1373.68] | left | — (source only) | support |
| `FJ3564.obj` | BP10289 · common carotid artery<br>BP10288 · right common carotid artery | FMA3939+FMA3941 | 448 | 884 | x [-21.26, -8.61]<br>y [-117.55, -105.38]<br>z [1329.42, 1373.38] | right | — (source only) | support |

### 3.1 Group summary — what each group becomes in the atlas

| Group | Files | Faces | Vertices | Atlas record | Role |
| --- | --- | --- | --- | --- | --- |
| Internal + common carotid artery (anterior feeding trunk) | 4 | 3,598 | 1,874 | — (source only) | support |
| Vertebral artery (posterior feeding trunk) | 2 | 1,600 | 978 | `vasc-vertebral-artery` | half |
| Basilar artery | 2 | 506 | 268 | `vasc-basilar-artery` | primary |
| Anterior cerebral artery | 2 | 800 | 426 | `vasc-anterior-cerebral-artery` | half |
| Anterior communicating artery | 1 | 80 | 63 | `vasc-anterior-communicating-artery` | primary |
| Middle cerebral artery — sphenoid (M1) part | 2 | 1,600 | 804 | `vasc-middle-cerebral-artery` | half |
| Middle cerebral artery — insular (M2) part | 4 | 11,720 | 5,881 | `vasc-middle-cerebral-artery` | half |
| Middle cerebral artery — terminal branches (M2–M4) | 34 | 88,460 | 48,219 | `vasc-middle-cerebral-artery` | half |
| Middle cerebral artery — generic branch/zone elements | 44 | 104,928 | 57,652 | — (source only) | support |
| Posterior communicating artery | 2 | 408 | 244 | `vasc-posterior-communicating-artery` | half |
| Posterior cerebral artery — precommunicating (P1) part | 2 | 564 | 310 | `vasc-posterior-cerebral-artery` | half |
| Posterior cerebral artery — postcommunicating (P2–P3) part | 2 | 1,088 | 560 | `vasc-posterior-cerebral-artery` | half |
| Posterior cerebral artery — central/perforating branches | 4 | 2,060 | 2,157 | — (source only) | support |
| Anterior choroidal artery | 2 | 836 | 686 | `vasc-anterior-choroidal-artery` | half |
| Posterior (medial) choroidal artery | 2 | 1,760 | 1,114 | `vasc-posterior-choroidal-artery` | half |
| Superior cerebellar artery | 2 | 812 | 452 | `vasc-superior-cerebellar-artery` | half |
| Superior cerebellar artery — lateral/medial branches | 4 | 2,164 | 2,118 | `vasc-superior-cerebellar-artery` | support |
| Anterior inferior cerebellar artery | 2 | 1,532 | 1,043 | `vasc-anterior-inferior-cerebellar-artery` | half |
| Posterior inferior cerebellar artery | 26 | 8,080 | 8,848 | `vasc-posterior-inferior-cerebellar-artery` | half |
| Anterior spinal artery (supporting context) | 2 | 608 | 436 | — (source only) | support |
| Ophthalmic artery (supporting context) | 2 | 4,820 | 2,414 | — (source only) | support |
| **Total, distinct files** | **107** | **136,244** | **81,643** | | |

(Group rows sum to more files than the distinct total because 20 MCA branch elements belong to two
groups at once — each is one file feeding the MCA record and the generic branch tree.)

**Bake budgeting (plan §4.3/§7).**

| Subset | Files | Faces raw |
| --- | --- | --- |
| All vascular elements (§3, distinct) | 107 | 136,244 |
| — trunks + Willis ring + cerebellar/choroidal arteries (the named records) | 57 | 34,984 |
| — MCA terminal tree, PCA/SCA branches, spinal + ophthalmic context | 50 | 101,260 |
| Optic pathway (nerve, chiasm, tract — §5.1) | 8 | 14,928 |

Plan §4.3 caps each artery at ≤2k tris and each optic element at ≤3k. The named-record elements
average 614 faces each (BP3D ships the PICA as 26 small segments and the Willis
vessels as ~800-face half-elements), so most are already at or under the cap and need no
decimation at all; the MCA terminal tree — the 100k-face majority — is the only part needing
aggressive reduction, and it represents cortical territory detail rather than a named record. The
plan's ~40–60k-tri budget for the whole Willis + pathway is therefore reachable: the named
records consume roughly half of it at the caps, while the 8 optic-pathway elements (14,928 faces raw)
come in under their own ≤3k-per-element cap except for the larger nerve/tract files (~2.4k, already
at the cap).

### 3.2 Geometry sanity — the BP ids do point at the arteries they claim

Every row below is a measurement from the extracted mesh, not a restatement of the plan.

| Check | Expectation | Measured | Verdict |
| --- | --- | --- | --- |
| Basilar artery is a single midline trunk of the ventral pons | two elements of one unpaired concept, both within ~2 mm of the midline, over the pons z band | `FJ1672` x [-2.11, 1.27]; `FJ1844` x [-2.28, 0.95] mm; both z [1502.6, 1532.3], y [−98.2, −83.6]; pons z [1509.6, 1533.9], y [−95.9, −66.6] (FJ1775/FJ1822 from the v2 set) | PASS |
| Vertebral arteries rise to the pontomedullary junction and merge there | z tops meet the basilar bottom (≈1503 mm) | left `FJ1725M` z max 1506.03, right `FJ1725` z max 1506.04 | PASS |
| Internal carotids reach the circle of Willis, not just the neck | z top in the suprasellar cistern band (≈1537 mm) | left `FJ1682M` z [1434.54, 1537.72], right `FJ1682` z [1434.54, 1537.72] | PASS |
| The ACA pair is one bilateral cast split per side | extents equal within 0.1 mm; near-mirror vertices | `FJ1654` extent [14.3, 12.2, 14.11] vs `FJ1654M` [14.3, 12.2, 14.11]; 208/213 vertices mirror-exact (Δx < 0.01 mm) | PASS |
| ACoA is the short midline cross-link between the ACAs | x spans a few mm either side of the midline, rostral to the ICA terminus | `FJ1655` x [-4.16, 2.71], y [-113.34, -111.53], z [1537, 1538.37], 80 faces | PASS |
| PCom connects the carotid to the PCA | a short element between the carotid and PCA y/z bands, one per side | `FJ1713` side right, y [-110.52, -97.14], 204 faces; `FJ1713M` side left | PASS |
| MCA M1 (sphenoid part) runs laterally through the sylvian cistern | long x extent and thin, one per side, mirror-equal | `FJ1692` x [-44.31, -13.14] (extent 31.16 mm) vs `FJ1692M` x [13.14, 44.31] | PASS |
| PCA P1 is short and precommunicating, P2 long and postcommunicating | P1 extent ≪ P2 extent | `FJ1723` extent [8.62, 3.24, 5.48] (282 faces) vs `FJ1714` extent [11.22, 36.9, 10.14] (544 faces) | PASS |
| SCA hugs the upper pons/midbrain surface | thin element in the pontomesencephalic z band, one per side, mirror-equal | `FJ1726` z [1520.81, 1527.71] vs `FJ1726M` z [1520.81, 1527.71] | PASS |

All nine checks pass, so the ids the plan lists do point at the arteries they claim and the
record mapping in §3 is geometry-verified rather than trust-based.

---

## 4. Laterality: BP3D labels vs geometry

BP3D stores paired structures as two element files. Laterality here comes from each element's x
range against the midline; the concept name is only a cross-check. **Result: they agree everywhere
in the new set** — every per-side concept name the archive ships for these elements matches the
measured side, so no element needs a sign correction at bake time. Where the archive names only the
unpaired concept (mammillary body, chiasm, stria terminalis) or ships a single element that
actually spans both sides (basilar, ACoA), the verified side is what the atlas should use:

| Element | BP3D concept label | Verified side (geometry) | Evidence |
| --- | --- | --- | --- |
| `FJ1682.obj` | internal carotid artery / right internal carotid artery | **right** | x ∈ [−37.5, −9.8] mm ⇒ right side, consistent with FMA3949 "right internal carotid artery"; its M-twin `FJ1682M` is the left one (FMA4062) — the pair is mirror-exact in x (max Δ 0.01 mm) |
| `FJ1682M.obj` | internal carotid artery / left internal carotid artery | **left** | x ∈ [9.8, 37.5] mm ⇒ left side, consistent with FMA4062 "left internal carotid artery" |
| `FJ1654.obj` | anterior cerebral artery / right anterior cerebral artery | **right** | x ∈ [−15.4, −1.1] mm — consistent with FMA50029 "right anterior cerebral artery" |
| `FJ1654M.obj` | anterior cerebral artery / left anterior cerebral artery | **left** | x ∈ [1.1, 15.4] mm — consistent with FMA50030 "left anterior cerebral artery" |
| `FJ1725.obj` | vertebral artery / right vertebral artery | **right** | x ∈ [−33.7, 0.4] mm — consistent with FMA3958 "right vertebral artery"; its M-twin reaches the midline from the left |
| `FJ1725M.obj` | vertebral artery / left vertebral artery | **left** | x ∈ [-0.38, 33.67] mm, centroid x 17.28 ⇒ left; midline reach ↓0 / ↑34.325 mm |
| `FJ1672.obj` | basilar artery | **bilateral** | x ∈ [-2.11, 1.27] mm, centroid x -0.44 ⇒ bilateral; midline reach ↓1.455 / ↑1.925 mm |
| `FJ1844.obj` | basilar artery | **bilateral** | x ∈ [-2.28, 0.95] mm, centroid x -0.69 ⇒ bilateral; midline reach ↓1.625 / ↑1.605 mm |
| `FJ1655.obj` | anterior communicating artery | **bilateral** | x ∈ [-4.16, 2.71] mm, centroid x -0.48 ⇒ bilateral; midline reach ↓3.505 / ↑3.365 mm |
| `FJ1815.obj` | mammillary body | **right** | x ∈ [−4.7, −0.8] mm ⇒ this is the right mammillary body; BP3D gives the element no laterality of its own |
| `FJ1818.obj` | optic chiasm | **right** | x ∈ [−8.0, −0.7] mm ⇒ right half of the optic chiasm; FJ1771 is the left half |
| `FJ1825.obj` | stria terminalis | **bilateral** | x ∈ [−28.8, 26.2] mm ⇒ one element spanning BOTH sides: the complete stria terminalis (FJ1778 is its near-mirror for the other side) |

Consequences for `vasc-register-bake`:

- Pick elements by **verified side**, never by the FJ/FJ…M suffix alone — the suffix convention
  (un-suffixed = the more negative x element) is consistent, but the side names in `isa_elements.txt`
  are what a reviewer will check against, and the JSON now carries both.
- Every paired element in the set is correctly labelled per side (checked for all 122 extracted
  files); atlas record names can follow the geometry without further correction.
- `FJ1672` (262 faces) and `FJ1844` (244 faces) are **two decimations of the same unpaired concept**
  (basilar artery, FMA50542): both straddle the midline by ~1.5–1.9 mm and cover the identical y/z
  band. Use `FJ1672` for `vasc-basilar-artery` and keep `FJ1844` as the documented alternative.
- `FJ1818` is the right half of the chiasm and `FJ1771` the left half (they meet at x ≈ −0.66 mm, the
  midline); the two halves are *not* mirror-identical (890 vs 898 faces), so use one and mirror it, or
  fuse the pair, rather than assuming symmetry.
- `FJ1825` already spans both sides (the complete stria terminalis), so no left/right pair is needed;
  `FJ1778` (690 faces, left) is available if a per-side representation is preferred.
- The two internal-carotid elements (`FJ1682` right, `FJ1682M` left, 1,272 faces each) carry the
  cervical course as well as the intracranial one (z 1434.5–1537.7 mm) and are mapped to **no**
  atlas record: the plan's vasculature list starts at the intracranial trunks, and the carotid
  siphon the Willis ring needs is already the rostral end of these same elements. If the content
  task wants a `vasc-internal-carotid-artery` record, the verified mesh is already on disk.

---

## 5. Optic pathway and deep-limbic inventory

### 5.1 The visual pathway — complete, all from the archive

| File | BP3D concept(s) | FMA | v | faces | bbox (mm) | side | atlas record | role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FJ1313.obj` | BP5707 · optic nerve<br>BP5709 · left optic nerve | FMA50863+FMA50878 | 1,027 | 1,860 | x [0.02, 30.07]<br>y [-142.54, -102.15]<br>z [1518.28, 1542.23] | left | `vasc-optic-nerve-mesh` | half |
| `FJ1364.obj` | BP5707 · optic nerve<br>BP5708 · right optic nerve | FMA50863+FMA50875 | 1,041 | 1,858 | x [-31.35, -1.32]<br>y [-142.5, -102.15]<br>z [1518.29, 1542.24] | right | `vasc-optic-nerve-mesh` | half |
| `FJ1771.obj` | BP5710 · optic chiasm | FMA62045 | 457 | 898 | x [-0.65, 6.64]<br>y [-110.43, -100.11]<br>z [1535.91, 1544.01] | left | `vasc-optic-chiasm-mesh` | half |
| `FJ1772.obj` | BP5707 · optic nerve<br>BP5709 · left optic nerve | FMA50863+FMA50878 | 1,251 | 2,376 | x [0, 32]<br>y [-151.74, -102.14]<br>z [1520.2, 1542.31] | left | `vasc-optic-nerve-mesh` | half |
| `FJ1773.obj` | BP5706 · optic tract<br>BP10451 · left optic tract | FMA62046+FMA67936 | 1,194 | 2,336 | x [-0.02, 24.76]<br>y [-107.44, -69.61]<br>z [1536, 1544] | left | `vasc-optic-tract-mesh` | half |
| `FJ1818.obj` | BP5710 · optic chiasm | FMA62045 | 452 | 890 | x [-7.98, -0.66]<br>y [-110.42, -100.12]<br>z [1535.92, 1544.01] | right | `vasc-optic-chiasm-mesh` | half |
| `FJ1819.obj` | BP5707 · optic nerve<br>BP5708 · right optic nerve | FMA50863+FMA50875 | 1,242 | 2,378 | x [-33.31, -1.29]<br>y [-151.75, -102.17]<br>z [1520.22, 1542.31] | right | `vasc-optic-nerve-mesh` | half |
| `FJ1820.obj` | BP5706 · optic tract<br>BP10467 · right optic tract | FMA62046+FMA62382 | 1,195 | 2,332 | x [-26.07, -1.27]<br>y [-107.44, -69.63]<br>z [1535.98, 1544] | right | `vasc-optic-tract-mesh` | half |

The chain is anatomically ordered in y (anterior → posterior): nerve y ∈ [−151.8, −102.2], chiasm
y ∈ [−110.4, −100.1], tract y ∈ [−107.4, −69.6]. BP3D ships **two files per side** for the optic
nerve (`FJ1313`/`FJ1772` left, `FJ1364`/`FJ1819` right) — same concept at different decimation, so
pick one per side (the larger pair `FJ1772`/`FJ1819`, 2,376/2,378 faces, includes more of the
orbital course). The chiasm and tract are stored as half-elements (`FJ1771`/`FJ1818`,
`FJ1773`/`FJ1820`) that meet at the midline. LGN (`FJ1766`/`FJ1813`) and MGN (`FJ1816M`/`FJ1816`)
are already registered and baked from the v2 addendum, so the nerve/chiasm/tract are the only new
optic geometry — the full retino-geniculate chain the plan promises is therefore data-complete.

### 5.2 Deep-limbic structures requested by the brief

| File | BP3D concept(s) | FMA | v | faces | bbox (mm) | side | atlas record | role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FJ1741.obj` | BP6551 · commissure of fornix of forebrain | FMA61970 | 5,400 | 10,632 | x [-25.19, 23.87]<br>y [-88, -57.05]<br>z [1546.57, 1566.88] | bilateral (spans midline) | `tract-fornix` | half (reused) |
| `FJ1753.obj` | BP6585 · amygdala<br>BP10428 · left amygdala | FMA61841+FMA72833 | 202 | 382 | x [16.25, 33.39]<br>y [-107.59, -89.25]<br>z [1531.99, 1544.79] | left | `nuc-amygdala` | half (reused) |
| `FJ1756.obj` | BP6566 · fornix of forebrain<br>BP10472 · left fornix of forebrain | FMA61965+FMA72925 | 3,385 | 6,764 | x [-0.66, 30.81]<br>y [-102.75, -58.26]<br>z [1535.3, 1567.4] | left | `tract-fornix` | half (reused) |
| `FJ1759.obj` | BP5509 · hippocampus<br>BP10455 · left hippocampus | FMA62493+FMA72714 | 492 | 980 | x [16.64, 36.6]<br>y [-102.34, -59.45]<br>z [1529.25, 1551.24] | left | `surf-hippocampus` | half (reused) |
| `FJ1766.obj` | BP10443 · left lateral geniculate body | FMA73304 | 112 | 196 | x [16.77, 25.2]<br>y [-81.65, -70.24]<br>z [1536.85, 1543.73] | left | `nuc-lgn` | half (reused) |
| `FJ1768.obj` | BP6596 · mammillary body | FMA74877 | 104 | 204 | x [-0.53, 3.42]<br>y [-96.2, -91.69]<br>z [1538.34, 1543.36] | left | `nuc-mammillary-body` | half |
| `FJ1778.obj` | BP6563 · stria terminalis<br>BP10422 · left stria terminalis | FMA61974+FMA72940 | 545 | 690 | x [1.99, 27.51]<br>y [-105.11, -61.7]<br>z [1537.08, 1567.66] | left | `tract-stria-terminalis` | half |
| `FJ1785.obj` | BP5674 · parahippocampal gyrus<br>BP10439 · left parahippocampal gyrus | FMA61918+FMA72706 | 435 | 740 | x [8.93, 29.92]<br>y [-100.71, -51.28]<br>z [1521.64, 1543.69] | left | `surf-parahippocampal-gyrus` | half |
| `FJ1786.obj` | BP5674 · parahippocampal gyrus<br>BP10447 · right parahippocampal gyrus | FMA61918+FMA72705 | 482 | 882 | x [-31.27, -10.18]<br>y [-100.8, -51.27]<br>z [1521.77, 1543.69] | right | `surf-parahippocampal-gyrus` | half |
| `FJ1804.obj` | BP6566 · fornix of forebrain<br>BP10452 · right fornix of forebrain | FMA61965+FMA72924 | 3,376 | 6,748 | x [-32.12, -0.66]<br>y [-102.75, -58.26]<br>z [1535.29, 1567.4] | right | `tract-fornix` | half (reused) |
| `FJ1807.obj` | BP5509 · hippocampus<br>BP10432 · right hippocampus | FMA62493+FMA72713 | 515 | 1,020 | x [-37.91, -17.91]<br>y [-102.37, -59.52]<br>z [1529.27, 1551.24] | right | `surf-hippocampus` | half (reused) |
| `FJ1813.obj` | BP10429 · right lateral geniculate body | FMA73303 | 305 | 604 | x [-24.53, -16.05]<br>y [-80.77, -69.04]<br>z [1536.95, 1543.37] | right | `nuc-lgn` | half (reused) |
| `FJ1815.obj` | BP6596 · mammillary body | FMA74877 | 112 | 220 | x [-4.73, -0.78]<br>y [-96.24, -91.69]<br>z [1538.32, 1543.34] | right | `nuc-mammillary-body` | half |
| `FJ1816.obj` | BP7746 · right medial geniculate body | FMA73309 | 101 | 198 | x [-18.32, -11.8]<br>y [-78.11, -71.04]<br>z [1535.94, 1543.6] | right | `nuc-mgn` | half (reused) |
| `FJ1816M.obj` | BP9165 · left medial geniculate body | FMA73310 | 101 | 198 | x [11.8, 18.32]<br>y [-78.11, -71.04]<br>z [1535.94, 1543.6] | left | `nuc-mgn` | half (reused) |
| `FJ1825.obj` | BP6563 · stria terminalis | FMA61974 | 651 | 764 | x [-28.81, 26.24]<br>y [-105.36, -61.75]<br>z [1536.82, 1567.62] | bilateral (spans midline) | `tract-stria-terminalis` | half |
| `FJ1829.obj` | BP6585 · amygdala<br>BP10478 · right amygdala | FMA61841+FMA72832 | 202 | 384 | x [-34.63, -17.58]<br>y [-107.51, -89.13]<br>z [1531.93, 1544.69] | right | `nuc-amygdala` | half (reused) |
| `FJ1832.obj` | BP6580 · septum of telencephalon | FMA61842 | 5,314 | 5,704 | x [-11.12, 9.91]<br>y [-121.87, -59.3]<br>z [1551.85, 1574.82] | bilateral (spans midline) | `nuc-septal-nuclei` | primary |

| Requested structure | Verdict | Where it lands |
| --- | --- | --- |
| Mammillary body | **found** — one element per side, 204 + 220 faces | `nuc-mammillary-body`; mesh pair `FJ1768` (left) / `FJ1815` (right) |
| Septal nuclei | **found, with a caveat** — BP3D has *septum of telencephalon* (FMA61842, BP6580 → `FJ1832`, 5,704 faces) | a *septal region* mesh, not a nucleus-by-nucleus mesh (no lateral/medial septal nucleus concept exists in the archive); use it as the `nuc-septal-nuclei` record's anchored mesh and state that in the record |
| Stria terminalis | **found** — `FJ1778` (left, 690 faces) + `FJ1825` (both sides in one element, 764 faces) | `tract-stria-terminalis`, the new v8 tract per plan §3 |
| Dentate gyrus | **ABSENT from the archive** | record-only with schematic placement along the hippocampal body (plan §1f) |
| Hippocampal subfields (subiculum, CA1–CA4) | **ABSENT from the archive** | record-only (plan §1f); the hippocampus mesh `FJ1759`/`FJ1807` stays the pickable volume |
| Nucleus accumbens / ventral striatum | **ABSENT from the archive** | record-only at a documented plane (plan §1d) |
| Claustrum | **ABSENT from the archive** | record-only at a documented plane (plan §1d) |

The absence claims are positive results from the archive's own concept list, not assumptions:
`.bp3d-probe/isa_parts.txt` (2,905 representation ids) has **no** row whose name mentions accumbens,
claustrum, dentate, subiculum, Ammon, `CA1`–`CA4`, ventral pallidum, or any septal nucleus. The same
probe list is where every resolved id in §3 and §5.1 came from, so an omission there is an omission
in the archive — and it matches plan §1d/§1f, which already budgets accumbens, claustrum and the
subfields as authored record-only structures.

Finally, the limbic meshes already extracted in v7 — hippocampus, amygdala, fornix, fornix
commissure, parahippocampal gyrus — are re-measured here (18 files, 37,310 faces) so this
inventory is complete for the whole v8 record set; nothing of theirs was re-extracted, and not one
byte under `raw-vasc/` or `raw-tel/` changed as a result of this task.

---

## 6. Totals, budgets, and what this task did not do

| Metric | Value |
| --- | --- |
| Meshes in this inventory | 133 |
| — extracted by `vasc-acquire` into `raw-vasc/` | 122 |
| — reused from `raw/` + `raw-tel/` (re-measured only) | 11 |
| Total faces (raw, before registration/decimation) | 188,482 |
| Total vertices | 111,336 |
| Total bytes on disk (raw ASCII OBJ) | 12,490,556 |
| Empty or zero-face meshes | 0 |
| Degenerate faces | 0 |
| Mirror L/R element pairs | 52 |
| Vascular + optic files (§3 + §5.1) | 115 |

None of these bytes enter the repository (raw sources are gitignored), so the committed footprint —
anatomy GLB and imaging — is untouched by this task. The rendered-triangle and GLB-size budgets of
plan §7 apply to the baked output of `vasc-register-bake`, which is where the ≤2k/≤3k per-element
caps are enforced.

This task deliberately did **not**:

- register or bake anything (that is `vasc-register-bake`, plan §6 row 2);
- touch `scripts/lib/register.mjs`, `src/data`, the manifests, `docs/DATA_CONTRACT.md` or any
  taxonomy file — the write scope was `assets-src/bp3d/raw-vasc/` plus this document;
- move, rename or re-extract anything under `raw/` or `raw-tel/` (the 11 reused meshes were read-only);
- add any download, source or licence beyond the already-owned BodyParts3D 4.0 archive.

---

## 7. Reproducing this inventory

```powershell
# 1. resolve every BP id through the probe lists (no archive access needed)
#    FMA -> BP representation id : .bp3d-probe/isa_parts.txt
#    FMA -> FJ element file id   : .bp3d-probe/isa_elements.txt
# 2. extract the 122 element files of the JSON `concepts` array in one pass
tar -xf assets-src/bp3d/isa_BP3D_4.0_obj_99.zip -C assets-src/bp3d/raw-vasc `
    --strip-components=1 isa_BP3D_4.0_obj_99/FJ1313.obj isa_BP3D_4.0_obj_99/FJ1364.obj ...
# 3. measure (vertices / faces / bbox per file)
node assets-src/bp3d/parse-objs.mjs assets-src/bp3d/raw-vasc/*.obj
```

The JSON carries each file's size and sha256, so a reviewer can confirm byte-for-byte that the
meshes on disk are the ones this inventory describes.
