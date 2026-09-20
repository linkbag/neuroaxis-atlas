[English](README.md) | **简体中文**

# NeuroAxis — 三维脑干图谱

**一个交互式、写实的 Web 图谱，涵盖间脑、中脑（mesencephalon）与菱脑（脑桥、延髓、小脑）—— 自 v7 起叠加端脑（大脑半球、基底节、边缘系统、脑室），自 v8 起加入脑血管（Willis 环与主要脑动脉）以及深部功能/投射内容，自 v9 起加入躯体定位图、皮层分区切面图层、可重跑的影像配准与模拟切面面板，以及 v10 的显示轮次（整框平面辅助器、分区级可见性与 solo、四角面板缩放、皮层分区质量，以及被移除的皮层标签）** —— 可点选的 3D 核团与纤维束、与 3D 裁剪平面双向同步的带标注 2D 断面图版、临床综合征浏览器，以及每个结构各自的神经生理、连接、血供与参考文献。使用 Vite、React 18、TypeScript、three.js（`@react-three/fiber`）与 zustand 构建。交互模型受 [ashemag/human-atlas](https://github.com/ashemag/human-atlas) 启发；**所有解剖内容与图版插图都是为本项目创作的原创示意图作品，并且自 v2 写实化升级起，外廓曲面派生自 [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)（CC BY 4.0）** —— 见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)。

## 功能特性

- **写实的 v2 渲染** — 由真实扫描派生的脑干/间脑/小脑外廓、有机雕琢的核团、CSF 空间、带 SSAO/bloom/SMAA 的 PBR 光照，以及 High/Balanced 质量切换（详见下文）。
- **3D 查看器** — 环绕 / 缩放 / 平移；点选任意核团、纤维束、脑室或表面标志；悬停标签；全局选择与所有其他面板共享。
- **两行开关 —— Areas 与 Systems（v11）** — 页眉的首要控件是**两行带标签的开关按钮**：**Areas**（Telencephalon · Diencephalon · Mesencephalon (midbrain) · Metencephalon (pons + cerebellum) · Myelencephalon (medulla) · Cerebral vasculature）与 **Systems**（Nuclei · Tracts · Ventricles · Surface · Vessels · Context · **Cranial nerves** —— 由 v13 加入的第七类）。把某一项**关闭，就会把图谱中的那一部分从 3D 视图、2D 实时断面*以及* PiP 中排除**；打开则重新纳入 —— 一个可见性决策，三个呈现面。**Reset** 恢复有文档记载的默认取景，**All** 显示全部。视图预设行被保留为**它们下方的快捷行**；按区域/按类型的复选框仍留在 Legend 中，并读取同样的这两个集合。
- **区域与系统图层** — Legend 仍然可以单独开关 diencephalon / midbrain / pons / medulla / cerebellum **/ telencephalon / vasculature** 以及 nuclei / tracts / ventricles / surface / context / **vessel**，另加 v10 的分区组（含 **Solo**）；预设 *Brainstem focus*（默认）、*Deep structures*、*Whole brain*、***Vasculature***、*Cortex only*、*All*、*Nuclei*、*Tracts*、*Clinical motor* 均未改变。
- **爆炸视图** — 滑块让核团沿脑干轴径向散开，而纤维束与外廓保持不动。
- **裁剪平面** — 矢状 / 冠状 / 横断切割覆盖完整规范范围，并带平面辅助器开关；横断滑块可吸附到图版层级。
- **实时断面同步（v3/v4/v9）** — 每个裁剪滑块都会驱动 *Plates* 标签页中的 2D 实时断面画布**以及**停靠在 3D 视图右下角的模拟切面面板，二者由同一个 Web Worker 计算（用平面裁剪已提交的 GLB 三角形、串联闭合轮廓、按分类学配色做奇偶填充），并且二者在 *Plates* 标签页中都把**真实影像作为底图**——锚定平面上的真实断面照片、连续的真人头部 CT 体数据、以及任意平面上的连续 T1 MRI，配有模态工具栏（Auto real-first / MRI / CT / Photo / Simulated only）、CT 脑–骨窗，以及始终可见的当前模态署名。**3D 标签页中的面板只是模拟切面，永远不算作影像呈现面** —— v9 用这个共享的 2D 渲染器替换了它的 GPU 模板裁剪渲染器，并随之退役了 v4 的真实切片背景（细节见 [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel)）。
- **端脑（v7）** — 大脑半球、基底节、边缘结构、侧脑室与端脑白质（22 个新网格、46 条注册表条目、4 个新层级、3 张新图版）叠加到同一规范空间，其中半球为半透明的 **ghost cortex**（幽灵皮层），以便脑干始终是本应用的主体。新增预设 *Brainstem focus*（默认）/ *Deep structures* / *Whole brain* / *Cortex only* —— 细节见[端脑（v7）](#telencephalon-v7--the-rest-of-the-brain)。
- **脑血管与深部内容（v8）** — **Willis 环与主要脑动脉**以 **32 个新的真实网格**（动脉 + 视路）上的 14 条记录呈现，每条都带有其供血区以及它所导致的综合征，归入新的 *Vasculature* 预设；此外还有端脑的深部粒度 —— 12 个功能性皮层区（V1、V2、A1、A2、Wernicke、Broca、M1、S1、premotor、SMA、entorhinal、FEF）、4 个海马亚区、视路、脑室分段以及纹状体/苍白球细分 —— 细节见[脑血管与深部内容（v8）](#cerebral-vasculature--deep-content-v8--the-arterial-layer-and-the-telencephalon-at-brainstem-granularity)。
- **M1/S1 躯体定位图（v9）** — **16 条记录**（`ctx-m1-*` / `ctx-s1-*`，脚趾 → 腿 → 躯干 → 臂 → 手 → 面 → 舌 → 喉）由一个可出报告的探针放置在**派生**皮层带上，带专用的定向贴片 3D 叠加层、面→手→臂→躯干→腿 的颜色渐变、身体部位标签，并在树中强制躯体定位顺序 —— 细节见 [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel)。
- **皮层分区切面图层（v9）** — 2D 实时断面中一个可开关的图层，按 **frontal · parietal · temporal · occipital · insula · limbic** 重新给皮层带着色，拟合到皮层带自身的几何，并在文件头记录实测的逐边界残差；它绘制在既有皮层填充*之上*，因此读者可以在 "cortex" 与 "cortex 的哪一部分" 之间切换 —— 细节见 [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel)。
- **实测影像配准（v9）** — 一个可重跑的拟合器（`node scripts/fit-imaging-affine.mjs --report`），它把图谱脑掩膜与每种模态自身的图像掩膜作比较并提交残差；**24 张照片图版被校正并应用（平均 ROI IoU 0.074 → 0.447，0 张变差）**，而 **CT 与 MRI 的校正经测量后被拒绝**，其数字同时写在清单中与 UI 中 —— 细节见 [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel)。
- **模拟切面面板 + 关闭影像（v9）** — 3D 标签页右下角的面板现在是一个 **2D 模拟切面面板**（无裁剪过的 3D 几何、无平面辅助器、**永远没有真实影像**，可缩放且尺寸在重载后保留），并且 *Plates* 工具栏的 **Simulated only** 状态是一个一等公民、会被持久化、措辞明确的“无影像”模式 —— 细节见 [v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel)。
- **显示轮次 2（v10）** — 三个 3D 平面辅助器现在跨越其两个平面内轴的**整个 `CLIP_BOUNDS` 矩形**，因此穿过半球的切面会显示出皮层实际所在处的切面，而不是止步于脑干；Legend 中新增**分区级可见性控件**（Prosencephalon · Mesencephalon · Rhombencephalon · Cerebral vasculature），含开/关复选框**以及**每个分区的一键 **Solo**，于是“全部打开”不再令人不知所措；模拟切面面板可从**四个角**缩放；皮层分区图层不再绘制细条与漂浮楔形；并且 *"Cerebral cortex (context envelope)"* 的**文字标签被移除，但其轮廓保留** —— 细节见 [v10](#v10--plane-helper-extent-division-visibility-four-corner-pip-resize-cortical-division-quality-and-the-cortex-label)。
- **Areas + Systems 开关行（v11）** — 页眉的视图预设行被降级为**两行开/关开关**下方的快捷行：大的解剖学 **Areas**（Telencephalon · Diencephalon · Mesencephalon · Metencephalon (pons + cerebellum) · Myelencephalon (medulla) · Cerebral vasculature —— 它们合起来把全部 7 个分类学区域与全部 236 条条目恰好各划分一次）与正交的 **Systems** 轴（Nuclei · Tracts · Ventricles · Surface · Vessels · Context = `ALL_KINDS`；**v13 加入第七项 Cranial nerves**）。某个 area 或 system **关闭**时，会由**同一个**可见性决策把它从 3D 场景、实时断面**以及** PiP 中排除，**Reset / All** 可恢复有文档记载的默认状态；这一轮还了结了 v10 的两处遗留缺陷（皮层分区规则 vs 画布实际绘制的内​​容；矢状平面辅助器的 `u/v` 约定）—— 细节见 [v11](#v11--the-areas--systems-toggle-rows-replace-the-view-preset-row)。
- **脑神经（v13）** — 十二对脑神经（**CN I Olfactory → CN XII Hypoglossal**）作为一等记录，归入新的第七个 **Systems** 开关 **Cranial nerves**（kind `nerve`，id 前缀 `nrv-`）：每条记录都带有它的模态、它的走行*以及它所穿过的颅底孔*、它的功能、指向图谱已有脑神经**核团**的链接、它的血供或与之临床相关的血管，以及给出麻痹表现**及其定位**的临床条目。它们被放置在**真实**所属区域（telencephalon 2 · midbrain 2 · pons 4 · medulla 4），统一归入一个 subdivision `Cranial nerves`，因此在树中会聚成组。**v13 以记录 + 示意性放置标记的形式交付；v14 用作者撰写的走行几何替换了这些标记** —— 在 3D 中引用某一条之前，请先阅读 [v14 章节](#v14--the-cranial-nerves-as-traveling-tracts)及其[如实说明的局限](#v14-honest-limits-in-one-place) —— 细节见 [v13](#v13--the-cranial-nerves-the-seventh-system)。
- **12 张交互式 2D 图版** — 9 个横断层级（锥体交叉 → 丘脑中段）、1 张正中矢状剖面、2 张冠状切片；每个带标注区域在悬停时高亮、点击时在所有位置选中；引线标签可开/关。**（v7 再增加 3 张 —— 共 15 张：** 轴位 +58、矢状半球、冠状穹窿。）
- **2D ↔ 3D 同步** — 选中一张图版（或层标尺条目）会把 3D 横断裁剪平面移到该层并显示平面辅助器；拖动平面会让层标尺与图版同步指示器保持同步。
- **结构浏览器** — 区域 → 细分 → 结构的分类学树，外加对名称与同义词的大小写不敏感搜索（试试 "STN"、"MLF"、"pulvinar"）。
- **信息面板** — 每条记录都有概览、神经生理功能、传入/传出连接、血供、可点击的层片、相关综合征与教科书参考文献；纤维束另加方向、模态、起点→终点、交叉与躯体定位。
- **临床综合征浏览器** — 24 张卡片（Wallenberg、Weber、Benedikt、locked-in、Parinaud、Déjérine-Roussy、hemiballismus……）；打开一张卡片会在 3D、图版与树中点亮相关结构，并让其余一切变暗。
- **参考文献** — 全局文献弹窗；每条记录的引用都可链接进入其中。
- **响应式** — 三栏桌面（1280×800）、带可折叠侧边栏的堆叠平板（834×1112）、带底部标签栏与底部抽屉的手机布局（390×844）。

## 截图

> 占位符 —— 请替换为实拍截图。

| 视图 | 展示内容 | 文件 |
| --- | --- | --- |
| 3D 查看器 | 可环绕的脑干，已选中红核，裁剪控件、爆炸滑块 | `docs/screenshots/3d-viewer.png`（待截取） |
| 横断图版 | 橄榄中部图版，带标签与 3D 平面同步指示器 | `docs/screenshots/plate-olivary.png`（待截取） |
| 综合征高亮 | Wallenberg 卡片打开 —— 相关结构点亮，其余变暗 | `docs/screenshots/syndrome-wallenberg.png`（待截取） |
| 手机布局 | 底部标签栏、信息底部抽屉 | `docs/screenshots/phone-390.png`（待截取） |

## 快速开始

```bash
npm install        # Node ≥ 20 (Node 24 verified)
npm run dev        # → http://localhost:5173
npm run build      # production bundle in dist/
```

打开 **http://localhost:5173**，在 3D 视图中点击任意结构（或搜索 / 浏览树 / 打开一张图版）—— 信息面板会显示它的完整记录。可以试试：选中 *Plates* 标签页并选择 *Medulla — mid-olivary*；3D 横断平面会跳到 y = −34 au。

## 写实渲染（v2）

3D 场景按 [docs/REALISM_PLAN.md](docs/REALISM_PLAN.md) 从示意性图元（"blobs" + 车削外廓）升级为写实解剖 —— 规范坐标系、层级表以及每一项 v1 交互（选择、图层、裁剪 + 吸附到图版、爆炸、2D↔3D 同步）均保持不变：

- **真实扫描外廓** — 脑干、间脑与小脑的外表面派生自 **BodyParts3D 4.0**（CC BY 4.0，许可证据见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)；丘脑与内/外侧膝状体来自同一版本的 IS-A 树归档），配准进规范图谱空间（mm/Z-up → au、按层锚定的 y 扭曲、中线拉直）并作有机雕琢：SDF 平滑并集/差集刻出脚间窝与脑室，并强化锥体、橄榄、上/下丘、脑桥隆起与丘脑枕。
- **有机核团** — 每条核团记录都渲染一个已提交的有机网格（按 `origin3d`/`size3d` 做噪声位移，按类型成形：钱包式折叠的下橄榄、新月形的黑质、丘脑分隔细胞、贴沟的脑神经柱），并做包含性检查，确保 ≥ 98% 位于其外廓之内（报告：`src/assets/anatomy/nuclei-report.json`）。
- **CSF 空间** — 第四脑室顶篷、中脑水管与第三脑室裂隙，以青色 fresnel 加权的半透明网格呈现。
- **PBR + 后期特效** — RoomEnvironment IBL、ACESFilmic 色调映射、来自同一个裁剪感知工厂（`src/geometry/materials.ts`）的 `MeshPhysicalMaterial` 预设，以及 SSAO + 轻微泛光 + SMAA（`@react-three/postprocessing`）。
- **质量切换** — 页眉中的 *High*（后处理合成器，dpr ≤ 2）与 *Balanced*（无合成器，dpr ≤ 1.5）；持久化于 `localStorage`，在没有 WebGL2 时自动降级。
- **回退契约** — 运行时加载器（`src/geometry/anatomyAssets.ts`）通过清单解析每个 slug 的 GLB；任何没有已提交网格的 slug（以及每条纤维束 —— 管道保持程序化生成）都渲染其 v1 图元，因此应用永远不会出现空白。

**已提交资产与预算（v2 里程碑；当前总量 —— 138 个 GLB · 599,204 个三角形 · 13.82 MiB —— 见[脑血管与深部内容（v8）](#cerebral-vasculature--deep-content-v8--the-arterial-layer-and-the-telencephalon-at-brainstem-granularity)）**：在 v2 提交时，`src/assets/anatomy/` 存放 84 个 GLB + `anatomy-manifest.json`（10 个外廓 · 3 个 CSF 空间 · 71 个核团；**320,296 个三角形 · 7.40 MiB**），处在计划 §2.7（修正案 A）预算之内：≤ 700k 三角形、总计 ≤ 8 MiB、单部件上限（外廓 1.5 MiB · CSF 0.8 MiB · 核团 60 KiB · 核团合计 2.5 MiB）。`node scripts/build-anatomy-geometry.mjs --manifest` 会重新验证这一切，并在任何违规时以非零退出。

**重新烘焙**（确定性，仅用 Node —— 原始 BP3D 下载保留在被 git 忽略的 `assets-src/` 中）：

```bash
node scripts/build-anatomy-geometry.mjs --all                                  # bake every part at recipe resolutions
node scripts/build-anatomy-geometry.mjs --part ctx-pons-surface --resolution 0.72   # (re)bake one part, finer/coarser
node scripts/build-anatomy-geometry.mjs --manifest                             # rebuild manifest from committed GLBs + budget report
node scripts/build-anatomy-geometry.mjs --stats                                # in-memory stats table, no writes
node scripts/build-anatomy-geometry.mjs --selftest                             # SDF kernel round-trip self-test
```

注意：配方分辨率以解剖保真度为目标；上面已提交的载荷是通过 `--part <slug> --resolution <au>` 把最大的外廓/CSF 部件重新烘焙得更粗，以拟合 §2.7 预算。任何烘焙之后，请运行 `--manifest`，使清单与预算门禁反映已提交的 GLB。流水线细节：[docs/GEOMETRY_PIPELINE.md](docs/GEOMETRY_PIPELINE.md)。

<!-- CHUNK-MARKER -->
