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

## 真实影像（v4）—— 以真实 MRI、CT 与断面照片作为断面视图

规格：[docs/IMAGING_V4_PLAN.md](docs/IMAGING_V4_PLAN.md)；许可裁定、逐字许可引文与获取日期：[docs/IMAGING_SOURCES_V4.md](docs/IMAGING_SOURCES_V4.md)；每一条署名行：[docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)。

自 v4 起，断面呈现面**以真实影像为先**：只要真实数据覆盖该平面，真实切片就是断面的*底板*，而模拟的结构轮廓以半透明叠加层绘制在其上。在没有任何模态覆盖的平面上，模拟断面仍是诚实的回退（它是*每一个*平面上唯一存在的东西，也是承载标签的那一层）。

三个断面呈现面一起移动 —— 3D 切面、模拟切面面板（3D 标签页）与 2D 实时断面画布（Plates 标签页 → *Live section*）—— 它们都由同一份 `clip.x/y/z` + `sectionUnderlay` store 状态驱动。**其中只有两个是影像呈现面**：面板按构造只显示模拟切面、不呈现影像（v9，见下文）；Plates 标签页与 3D 主切面才绘制真实模态。

- **面板（3D 标签页，右下角）** — **v9 用 2D 模拟切面面板替换了 GPU 模板裁剪的画中画。** 它挂载的是 *Plates* 标签页所挂载的*同一个* `SectionCanvas`，因此显示的是由 worker 裁剪出的模拟断面 —— **没有裁剪过的 3D 几何、没有平面辅助器，也永远没有真实影像** —— 并带有方位标签（L/R/A/P/S/I，患者左侧约定）、`y = −24.0 au` 平面读数、轴向覆盖、隐藏/恢复，以及**尺寸会被记住的可缩放窗口**（`neuroaxis.sectionPipSize`，钳制在 224–880 × 170–640 px）。隐藏它是可逆的：每当它被隐藏 —— 包括在一次加载了已持久化 `hidden` 值的全新访问中 —— 一个 **“Live section ▸” 恢复胶囊**就占据它的角落，因此该功能无需清除 `localStorage` 也能被发现；点击它即可重新显示面板。退役的 GPU 路径（画布内渲染器、私有相机 + 渲染目标、模板一致性/封盖通道、MSAA 看门狗、`?pipdebug` 叠加层、剪裁位块传送、真实切片背景采样器）是被**删除**，而不是被搁置。面板自身的影像作用域在其画布挂载期间把 store 保持在关闭影像的状态 —— 用户在 Plates 标签页的选择永远不会被改写 —— 并且一个像素守卫在该画布上下文上遮蔽 `drawImage`/`putImageData`，作为第二重结构性保证。完整契约、局限与证据：[v9](#v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel) 与 `npm run verify:pip-contract`。
- **2D 实时断面画布**（Plates 标签页 → *Live section*）—— 一个 Web Worker 用当前平面裁剪每个可见结构的三角形，串联闭合轮廓，并按分类学配色做奇偶填充（横断：前方朝上，患者左侧在图像右侧 —— 与作者撰写的 SVG 图版一致）。在画布内点击/拖动会设置另外两个滑块（十字线放置）；一个层片可吸附到最近的作者图版；被选中/悬停的结构会带标签高亮。工具栏自带**平面滑块条** —— 每个轴一个带标签的滚动条（Sagittal · x、Coronal · z、Transverse · y），范围与 3D 裁剪停靠面板相同的规范区间，每行一个 `−42.0 au` 读数，当前活动断面轴被强调，以及一个与停靠面板共享同一个 `snapToPlate` 设置的 “Snap to levels” 复选框 —— 因此无需离开 Plates 标签页就能连续拖动平面；它写入画布本来就在读取的同一组 `clip` store 字段，所以滑块与十字线在两个方向上始终保持一致。性能防护：仅 worker 做轮廓计算，拖动时 15 Hz + 0.25 au 的平面量化，标签页隐藏时跳过绘制，画布 dpr ≤ 1.5，隐藏时 PiP 完全跳过。

### 模态工具栏（Plates 标签页 → Live section）

| 控件 | 作用 |
| --- | --- |
| **Auto (real-first)** — 默认 | 选择*确实覆盖该平面*的最佳真实模态：锚定照片（±1.5 au）→ CT → MRI → 无。真实切片成为底板；轮廓以 65 % 不透明度叠加，并带清晰描边；选择/悬停高亮不受影响。 |
| **MRI** | 仅使用连续 T1 网格，带 uint8 窗宽低/高滑块。 |
| **CT** | 仅使用连续 CT 网格，带 **brain / bone** 窗预设（Hounsfield 窗来自 `ct-manifest.json`）。 |
| **Photo** | 仅使用内嵌照片（平面锚定图版 + 按层级映射的显微照片）—— 从不悄悄切换模态。 |
| **Simulated only** | 完全不用真实影像 —— 明确就是 v3 的示意断面。 |
| **Opacity** | 真实影像的 alpha（默认 100 %：它是底板，不是衬底）。 |
| **Sources / credit** | “Open source ↗” 层片（活动影像在前，然后是 UBC / MSU / Harvard Whole Brain Atlas / BrainMaps 参考）以及**当前模态的逐字署名行**，始终可见；画布会在实际绘制的那张影像的左下角打印同一行。 |

只有当构建根本无法提供某个模态时，该模态按钮才会被禁用 —— 原因写在其 tooltip 中，例如 *"no embeddable CT grid in this build — re-bake with: node scripts/build-ct-grid.mjs"*。某个已覆盖模态*内部*的空平面仍然可选，并由画布提示行解释（“no photograph is anchored at this plane — showing the simulated section”）。Harvard 与 BrainMaps 仅作外链，从不内嵌。

### 模态可用性、许可与署名

| 模态 | 覆盖范围 | 来源 | 许可 | 逐字署名 |
| --- | --- | --- | --- | --- |
| **染色 / 照片**（76 张图版） | 按平面：**22 张 NLM Visible Human 轴位冷冻切片**（y = +34.0 … −52.2 au，在延髓/脑桥/中脑段最密）+ 9 张 UBC 水平图版（y = +10 … −44）+ 15 张 UBC 冠状图版（z = +26 … −54）+ 3 张 Commons CT 图版，均为 ±1.5 au；另有 17 张 UBC 按层级映射的显微照片位于横断平面（每个作者层级都有一张） | **NLM Visible Human Project** 冷冻切片（Brigham and Women's Hospital / Harvard Medical School 头部）；UBC `neuroanatomy.ca` 显微照片 / 水平 / 冠状查看器；MSU Human Brain Atlas 冠状细胞染色 | NLM Terms and Conditions (2019) —— 注明出处即可再分发（冷冻切片 + CT）；**CC BY-NC-SA 4.0**（UBC —— 非商业教育用途，记录于 ATTRIBUTION）；站点许可并需强制署名（brainmuseum.org）；CC0（Commons CT 切片） | `Courtesy of the U.S. National Library of Medicine` · `© University of British Columbia, CC BY-NC-SA 4.0` · `University of Wisconsin and Michigan State Comparative Mammalian Brain Collections, and the National Museum of Health and Medicine; preparation funded by the National Science Foundation and the National Institutes of Health` · `CT of a normal brain — Mikael Häggström, M.D., via Wikimedia Commons, CC0 1.0 (public domain dedication)` |
| **MRI**（连续，全部 3 个轴） | 三个轴上的每一个平面位置 | OpenNeuro **ds007313**（3 T MPRAGE，头部 + 颈椎），重采样到规范网格 | **CC0**（不要求署名；为溯源而标注） | `ds007313 doi:10.18112/openneuro.ds007313.v1.0.0, OpenNeuro CC0` |
| **CT**（连续，全部 3 个轴） | 三个轴上的每一个平面位置 | **NLM Visible Human Project** —— “Additional Head Images” 头部 CT（Brigham and Women's Hospital / Harvard Medical School 头部，463 张轴位 DICOM 切片，1.5 mm） | NLM Terms and Conditions (2019) —— 注明出处即可再分发；已提交的网格是一个**冻结的 2026-09-10 快照**，不是 NLM 的实时镜像 | `Courtesy of the U.S. National Library of Medicine` |

两个网格都是位于**同一规范盒体与间距**上的 `uint8` 体数据（45 × 81 × 67，原点 x −27 / y −55 / z −56 au），行主序、x 变化最快，每体素约 1.23 × 1.25 × 1.24 au，并带有一个清单记录 dims/origin/spacing、配准块（常量 + 实测残差）以及来源/许可/署名。CT 以 Hounsfield 单位烘焙（`storedHU = stored16 · 1 − 1200`），带 `brain (−20…100 HU)` 与 `bone (200…1600 HU)` 预设。

### Visible Human 冷冻切片（v4b）

**22 张冻结 Visible Human 头部的全彩轴位照片**在它们各自所在的横断平面上就是真实底板 —— `src/assets/imaging/stains/vhp-0017.jpg` … `vhp-0721.jpg`。它们来自 NLM Visible Human Project（Brigham and Women's Hospital / Harvard Medical School 头部）的 *Additional Head Images* 冷冻切片序列，是在标本块被逐层铣削时拍摄的，因此每一张图版都是**物理切面**的照片，而不是重建结果。

- **它们是什么：** 528 × 764 px，**0.294 mm/px**（视场 155.2 × 224.6 mm），**0.147 mm 层间距**，索引 0001–1477。已提交的 22 张图版是索引 17 … 721，即该序列的上部至中部区域，为在延髓 / 脑桥 / 中脑段获得更高密度而精挑细选。
- **内容逐字保持：** 以原生尺寸重新编码的 JPEG q80 —— **不裁剪、不旋转、不缩放、不加标注、不改变颜色**。逐图版的源 URL 在清单中（`…/cryo/jpeg/halfSize/axial/NNNN.02.jpg.gz`）。
- **致谢，逐字：** `Courtesy of the U.S. National Library of Medicine` —— 在 UI 中渲染（画布左下角署名、PiP 署名、Plates 工具栏），并附每张图版自身的来源链接，完全按 NLM Terms and Conditions 的要求。
- **许可：** NLM Terms and Conditions (2019)，注明出处即可再分发。已提交的集合是一个**冻结的 2026-09-10 快照 —— 不是 NLM 的实时镜像**；它在运行时从不重新同步，这正是本项目满足 NLM “维护最新版本**或**说明此点” 这一条件的方式（完整引文见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)）。
- **它们是如何配准的。** 图版的*顺序*与相对间距来自有文档记载的 0.147 mm 层间距；*绝对*放置来自 `y = +36.0 − (index − 1) × 0.1225 au`，其中 **+36.0 au 是同一供体头颅顶点的实测值**，通过对完整视野的头部 CT DICOM 序列、经由已提交 CT 网格自身的规范配准测得（并非从图谱盒体假设而来）。曾尝试对参照做程序化拟合，但**被拒绝**：它达到 r = 0.92 并否证了与之竞争的 `y₁ ≈ −8 au` 映射（r = 0.29），但其标志点残差在 ±5 au 容差下偏差 20–210 au，因此交付的是计划中有文档记载的回退方案。侧向放置按图版进行：`fit.dx` 是该图版自身实测的左右对称轴（平均镜像相关 r = 0.51），而 `fit.scale = 4.0816 px/au`（倒数修正形式 —— 该图版为 0.245 *au 每像素*）。
- **如实说明的局限。** 每一张图版都带有 **±10 au（≈ ±12 mm）的绝对平面不确定度**，在清单的 `planeValueNote` 中*逐图版*披露，并显示在 Plates UI 中。图版的**顺序**与**相对间距**是精确的；绝对平面是有文档记载的放置，而不是经标志点验证的配准。这些图版是**逐平面的锚点，不是连续的摄影体数据** —— 把滑块移离锚点后，`Auto` 会依次回退到 CT、再回退到 MRI，并明确说明这一点。**行方向（前方朝上还是朝下）依据的是来源有文档记载的拍摄实践加上本模块的约定，而 `mirrorX: false` 是“有文档但未被证明”的**（为它计算的两个非对称统计量分别得 |r| = 0.16 与 0.21，且符号相反）；二者都在配准记录中标为未决问题。完整方法、搜索网格、残差与方位证据：`assets-src/imaging3/VHP_ANCHORS.md`（被 git 忽略的工作产物）。
- **`v4c-qa` 独立重新测量了什么**（`node scripts/verify-imaging-v4b.mjs` + 记录在配准记录中的原始图版探针）：**侧向（列）轴是实测的** —— 在 22 张已提交图版上，图版的镜像对称轴为竖直，**平均 |r| = 0.59**（在水平镜像下少 160 倍，为 0.12），这正是让逐图版 `dx` 成为测量而非假设的原因；已提交图版在物理上是**连续的** —— 图版 *i* 与图版 *i+1* 按存储状态相关 **r = 0.9935**，而翻转行后为 0.176、相隔 200 个索引时为 0.10，即该序列确实是同一个层叠标本以 0.147 mm 采样，图版*顺序*是精确的。这两个探针都不能确定**绝对**平面或**行方向**，原因如上：它们**在没有目视检查的情况下无法被验证**，而本环境无法访问任何视觉模型（`read_image`：*"model 'deepseek-flash' does not declare image input"*；`modlens_read_image`：*"claude-cli provider failed … vision reachable through codex, which modlens is not yet allowed to reuse"*）。同一供体的头部 CT **确实**在磁盘上，但它是一个脑盒体重采样，视场小于图版画幅，因此也无法锚定绝对平面 —— 对*完整视野*头颈图版构图做的交叉检查未能收敛，被记录为不确定，而未据此采取行动。

### 如实说明的局限（在引用某个平面位置之前请先阅读）

- **照片是按平面的，不是连续的。** 每张图版被锚定到一个规范平面值，安装容差 ±1.5 au，因此在两张照片之间移动滑块会回退到 CT/MRI（Auto）或模拟断面，画布会说明是哪一种。照片*序列*覆盖在脑干段被有意做得比半球段更密。
- **配准是近似的，并且被披露。** 这些照片是物理切片的照片 —— 不存在体素配准。它们的 `planeValue` 来自来源自身的标注（UBC 查看器的标志点标签、Commons 的 4 mm 切片索引）加上逐图像的组织测量，其 `fit {scale, dx, dy, mirrorX}` 是一阶仿射；照片的绝对平面误差量级为一个层步（≈5–6 au）。**22 张 Visible Human 冷冻切片是整组中最松的：它们的绝对平面带有 ±10 au（≈ ±12 mm）的不确定度** —— 这是实测的，不是假设的；见上文 *Visible Human 冷冻切片* 与 `assets-src/imaging3/VHP_ANCHORS.md`。MRI 与 CT 体数据以实测、可重跑的校正进行配准（中线残差 ≤ 1.25 au；CT 脑桥面残差相对风格化图谱外廓平均 2.04 au），并且两个清单都逐字报告其残差。
- **MRI、CT 与照片来自不同个体。** OpenNeuro 受试者、NLM Visible Human 供体与 UBC/MSU 标本被放在*同一个规范图谱坐标系*中；图谱几何是共同参照系，每种模态保留其自身有文档记载的仿射，而不继承另一个受试者的拟合。
- **这只是一个学习辅助工具。** NeuroAxis 不是医疗器械，这些影像都不用于诊断（见下文*教育免责声明*）。

### 已提交载荷与预算

> **v7 更新。** 这些数字是 **v4/v6 的测量值**，按原样保留作为那次烘焙的记录。
> 当前 v7（AMENDMENT B）的数字见下文
> [端脑（v7）](#telencephalon-v7--the-rest-of-the-brain)：规范盒体扩展为
> x ±48 / y −55…85 / z −75…+55，因此**两个 uint8 网格现在都是 `[81, 113, 107]` = 各 979,371 B**，
> 影像载荷为 **80 个文件共 8.71 MiB**，对照 `docs/TELENCEPHALON_PLAN.md` §2/§4 设定的
> **10 MiB** 上限（v7 之前的 8 MiB 限制已被取代；v4 新增的 ≤ 4 MiB 子上限未变，且仍然满足）。

`src/assets/imaging/` 存放 **80 个文件共 7.30 MiB**（磁盘实测）—— **76 张已提交染色照片**（6.82 MiB：22 张 `vhp-*` 冷冻切片 1.18 MiB，9 张 `ubc-h*` + 15 张 `ubc-c*` 2.73 MiB，3 张 `wikict-*` 0.14 MiB，17 张 `ubc-m*` + 10 张 `bmm-*` v3 显微照片 2.77 MiB）、`mri-t1.bin`（238 KiB）+ `mri-manifest.json`、`ct.bin`（238 KiB）+ `ct-manifest.json` —— 处于计划 §4 预算之内：**影像载荷总计 ≤ 8 MiB**（实测 7.30 MiB，余量 0.70 MiB）以及 **v4 新增资产 ≤ 4 MiB**（实测 3.11 MiB：`ct.bin` + 24 张 UBC 图版 + 3 张 Commons CT 图版；v4b 冷冻切片为 1.18 MiB，对照其自身 ≤ 1.75 MB 的子上限，且不计入那个 v4 余量）。原始下载保留在被 git 忽略的 `assets-src/` 中；每一张内嵌图版都是内容逐字副本（不裁剪、不修图），仅做技术性修改（整数 2× 降采样、alpha 压平到白色、v3/v4 照片的无损滤波 PNG 重编码；v4b 冷冻切片在原生尺寸下的 JPEG q80 重编码；网格的 uint8 重采样），逐文件记录在 `assets-src/imaging2/processed-photos.json` 与 `assets-src/imaging3/analysis/local-files.json` 中。

**重新烘焙**（确定性，仅用 Node，不含时钟/随机数 —— 已提交产物在多次运行间逐字节一致；原始输入保留在被 git 忽略的 `assets-src/` 中）：

```bash
node scripts/build-mri-grid.mjs          # → src/assets/imaging/mri-t1.bin + mri-manifest.json + QA previews (exit ≠ 0 on a registration-QA violation)
node scripts/build-mri-grid.mjs --probe  # inspect the source NIfTI header without writing
node scripts/build-ct-grid.mjs           # → src/assets/imaging/ct.bin + ct-manifest.json + QA previews (exit ≠ 0 on QA violation)
node scripts/build-ct-grid.mjs --tune    # re-run the CT↔MRI registration search and print the candidate table
node scripts/build-ct-grid.mjs --probe   # inspect the source DICOM series header without writing
```

CT 烘焙缺失或失败并不致命：`ct-manifest.json` 带有 `status: 'unavailable'`，CT 图层会注册为禁用 —— 工具栏随后以该原因禁用 CT 按钮，PiP 提示也如此说明，而 Auto 直接回退到 MRI/照片。

### 署名与外链（v3 行为，未改变）

实时工具栏列出一组指向该断面层级的 “open source ↗” 层片：被映射影像自身的页面，加上 UBC、MSU、Harvard Whole Brain Atlas 与 BrainMaps.org 参考 —— 后两者仅作外链。许可裁定与获取证据：[docs/IMAGING_SOURCES.md](docs/IMAGING_SOURCES.md)（v3 来源）与 [docs/IMAGING_SOURCES_V4.md](docs/IMAGING_SOURCES_V4.md)（v4 来源）；完整溯源与逐字署名行：[docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)。

<!-- CHUNK-MARKER -->
