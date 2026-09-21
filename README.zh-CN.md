[English](README.md) | **简体中文**

# NeuroAxis — 三维脑干图谱

**一个交互式、写实的 Web 图谱，涵盖间脑、中脑（mesencephalon）与菱脑（脑桥、延髓、小脑）—— 自 v7 起叠加端脑（大脑半球、基底节、边缘系统、脑室），自 v8 起加入脑血管（Willis 环与主要脑动脉）以及深部功能/投射内容，自 v9 起加入躯体定位图、皮层分区切面图层、可重跑的影像配准与模拟切面面板，v10 的显示轮次（整框平面辅助器、分区级可见性与 solo、四角面板缩放、皮层分区质量，以及被移除的皮层标签），以及自 v13/v14 起作为第七个系统、以作者撰写走行几何呈现的十二对脑神经（CN I Olfactory → CN XII Hypoglossal），以及 v17 的**细粒度血管层**（53 条血管记录、40 条作者撰写走行，豆纹动脉的两个红色椭球被真实穿通支走行取代）** —— 可点选的 3D 核团与纤维束、与 3D 裁剪平面双向同步的带标注 2D 断面图版、以真实 MRI / CT / 冷冻切片影像作为断面底图的断面视图（Plates 标签页画布与 3D 主切面）、临床综合征浏览器，以及每个结构各自的神经生理、连接、血供与参考文献。使用 Vite、React 18、TypeScript、three.js（`@react-three/fiber`）与 zustand 构建。交互模型受 [ashemag/human-atlas](https://github.com/ashemag/human-atlas) 启发；**所有解剖内容与图版插图都是为本项目创作的原创示意图作品，并且自 v2 写实化升级起，外廓曲面派生自 [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)（CC BY 4.0）** —— 见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)。

## 第三方数据许可

本仓库中的原创部分 —— 全部代码、全部撰写文本、SVG 图版插图与作者撰写的 3D 几何 —— 采用 **MIT** 许可（见 [LICENSE](LICENSE)）。另有四套第三方数据集以处理后的形式随本仓库分发，其条款随所提交文件一并生效：

| 来源 | 本仓库中包含的内容 | 许可 | 义务 |
| --- | --- | --- | --- |
| [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)（© DBCLS） | 外廓曲面，以及动脉 / 视路网格 | **CC BY 4.0** | 署名 |
| OpenNeuro `ds007313` | 所提交的 T1 MRI 体数据 | **CC0** | 无 |
| NLM Visible Human Project | 冷冻切片照片与 CT 体数据 | NLM 条款与条件 | 需致谢，原文照录：*Courtesy of the U.S. National Library of Medicine*；所提交数据为固定快照，并非实时镜像 |
| UBC Functional Neuroanatomy | 断面显微照片 | **CC BY-NC-SA 4.0** | 署名，**仅限非商业用途**，并以相同方式共享 |

**UBC 显微照片为非商业许可（CC BY-NC-SA 4.0）。** 若需商业使用，应移除或替换这部分图像 —— 其余部分均为宽松许可（MIT / CC BY / CC0）或仅需致谢。界面中提到的其他来源（MSU human brain series、Harvard Whole Brain Atlas、BrainMaps.org、neuroanatomy.ca）**仅为外链，未提交其任何数据**。

完整的来源信息、逐文件源 URL 与许可文本见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)。

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
- **细粒度血管层（v17）** — 动脉图层再深入一个层级：**53 条血管记录、40 条作者撰写走行**（MCA 岛段 + 终末主干 + M4 皮层支，ACA 胼周/胼缘/额极/眶额动脉，PCA 顶枕/距状/颞支/压部动脉，SCA + AICA + PICA 各段，脊髓前动脉，以及穿通支群 —— **豆纹动脉、丘脑穿通动脉、丘脑膝状体动脉、脑桥穿通动脉**），每一条都渲染为一根**贴合实测外廓**（`ctx-hemisphere-l/r`、中脑、脑桥、延髓、小脑）的**程序化管道**，而不是示意性标记。**豆纹动脉的两个红色色块消失了**：椭球被*退役*而非被遮盖，穿通支现在是真实走行 —— 从 M1 壁穿过前穿质进入壳核与尾状核。**这些分支是投影到派生曲面上的作者撰写走行路径，不是分割血管造影**，并且它们花费 **0 字节**载荷；细节见[细粒度血管层（v17）](#the-granular-vasculature-layer-v17--53-vessel-records-authored-courses-no-blobs)。
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

<a id="telencephalon-v7--the-rest-of-the-brain"></a>

## 端脑（v7）—— 脑的其余部分

v7 把**端脑**（大脑半球、基底节、边缘结构、侧脑室与端脑白质）叠加到脑干 + 间脑图谱上，**同时不放弃“脑干才是本应用主体”这一原则**。规格：[`docs/TELENCEPHALON_PLAN.md`](docs/TELENCEPHALON_PLAN.md) §2 AMENDMENT B（空间）、
§3（数据模型）、§4（几何 + 预算）、§5（渲染/UX）、§6（图版）、§9（验收）。

### 新增了什么

| | |
| --- | --- |
| **规范空间（AMENDMENT B）** | x ±48（未变）· **y −55…+85** · **z −75…+55**。`src/components/viewer3d/clipPlanes.ts` 中的 `CLIP_BOUNDS` 仍是唯一的声明处 —— 裁剪滑块、断面平面几何、PiP 相机、图版↔裁剪同步与层标尺都由它派生。**y = +45 以下没有任何东西移动**：13 个原有层级锚点保持其确切的 y 值，默认横断平面仍是橄榄锚点（y = −34），x/z 仍为 0。 |
| **层级** | 13 个既有锚点 + **4 个新的端脑锚点**：`lvl-tel-thalamostriate` **+48**、`lvl-tel-basal-ganglia` **+58**、`lvl-tel-centrum-semiovale` **+68**、`lvl-tel-convexity` **+78**（共 17 个）。它们驱动裁剪平面、吸附到图版、层标尺与实时断面。 |
| **解剖网格** | `src/assets/anatomy/` 中 **22 个新的已提交 GLB**（合计 106 个部件，渲染三角形 570,096 / 800,000）：2 个半球壳（`ctx-hemisphere-l/-r`）、大脑白质核心、胼胝体、侧脑室、尾状核、壳核、苍白球、海马、杏仁核、穹窿 + 连合、脉络丛。 |
| **注册表** | 46 条 `telencephalon` 条目（共 183 条），分布在五个细分下：**Cerebral cortex · Basal ganglia · Limbic system · Telencephalic white matter · Lateral ventricles**。38 条新的作者撰写结构记录位于 `src/data/structures/telencephalon-*.json`。 |
| **图版** | 3 张新的作者撰写 SVG（共 15 张）：`plate-tel-axial-58`（19 个带标注区域，同步到 `lvl-tel-basal-ganglia`）、`plate-tel-sagittal-hemisphere`、`plate-tel-coronal-fornix`。 |
| **纤维束** | 4 条带路点的作者撰写通路 —— 视辐射、扣带、钩束、上纵束。 |

### 它如何渲染 —— 皮层幽灵，以及为何脑干仍是主体

计划 §5 把这定为可用性核心，因此默认值本身就是功能：

- **半球是半透明的幽灵。** `createGhostShellMaterial`
  （`src/geometry/materials.ts`）以 **不透明度 0.14**（计划 §5 的窗口
  0.12–0.18）渲染两个壳，带 **`depthWrite: false`**、**仅正面**（一个闭合水密的实体会被绘制两次，从而把两层半透明叠成浑浊的内部，并使应用中最大网格的填充率翻倍）以及 `renderOrder −2`。脑干、间脑与小脑可以径直穿过它们读出。
- **视图预设（计划 §5），以 Brainstem focus 为默认** —— 新访客以脑干优先启动；该选择像质量切换一样持久化（`localStorage
  neuroaxis.viewPreset`），因此回访者保留自己的取景：

  | 预设 | 行为 |
  | --- | --- |
  | **Brainstem focus** *（默认）* | 皮层记录被隐藏，于是幽灵降为**极淡的轮廓**（`GHOST_OUTLINE_OPACITY` 0.05），由脑干/间脑/小脑承担画面。 |
  | **Deep structures** | 幽灵皮层 + 通过自发光强调抬升的基底节与边缘结构（`emphasised`，0.18 —— 低于悬停值，因此强调永远不会被误认为一次交互）。 |
  | **Whole brain** | 每个结构使用自己的材质。 |
  | **Cortex only** | 隐藏所有非端脑记录：只剩半球。 |
  | All · Nuclei · Tracts · Clinical motor | v1–v6 的预设，未改变。 |

  这需要在图层模型上增加一对附加字段（`AtlasLayers.hidden` / `.emphasis`，结构级集合），因为“隐藏皮层”与“强调基底节”跨越了 `regions`/`kinds` 无法表达的按区域与按类型边界。空集合意味着“行为与 v6 完全一致”，这也是 Legend 开关与旧预设未被触动的原因。
- **每一个新结构都可从 3D、树、搜索与图版中选中。** 清单 slug 与注册表 id 在一张表（`src/geometry/anatomyAssets.ts` 中的 `ANATOMY_RECORD_LINKS`）中对齐，3D 过程与实时断面注册表都读取它 —— 许多记录共享一个网格（尾状核的头/体/尾是同一个尾状核；脑室各角/房是同一个脑室铸型；胼胝体各部是同一个胼胝体），这正是注册表自身配对规则在半球尺度上的体现。
- **原点处没有占位几何。** 不拥有网格、也没有作者撰写的放置的记录被显式列出（`TEL_CONTENT_ONLY_IDS`），并被排除在 3D 实体过程之外，同时仍可从树、搜索与图版完全访问。在 v7 之前，38 条端脑记录中有 32 条会在 `[0, 0, 0]` 处绘制一个单位球。
- **爆炸**把半球壳沿 ±x 向外分开 —— **100 % 时每个壳 16 au**
  （`src/components/viewer3d/SceneLayers.tsx` 中的 `HEMISPHERE_EXPLODE_FACTOR`），而核团为
  **6 au**（`NucleusMesh`：`explodeDirection · explode · 6`）。更大的系数是有意为之：一个宽约 110 au 的外廓必须让开它的孪生体，而不是从某一轴上扇开，并且在 100 % 时 32 au 的间隙会露出胼胝体、穹窿与脑室。核团规则未变，其他所有类型都保持其规范位置。
- **CT 覆盖范围是被陈述的，而非被隐藏。** Visible Human CT 序列是一次**仅头部的扫描，其自身的头顶位于规范 y ≈ 36.25 au**（实测；记录在 `ct-manifest.json` 的
  `intensity.sourceCoverage.superiorMostDataYAu` 与 `registration.residuals.coverageNote` 中）。在该平面之上，CT 网格有站点但没有数据，因此 CT 图层报告 **`unavailable`**，而不是给出一张过期的切片，实时断面工具栏也直说序列止于此，并且 **MRI 是记录在案的模态**。MRI 网格覆盖整个 AMENDMENT B 盒体
  （`coverage.fractionInsideFov = 1`，979,371/979,371 个站点），因此它能在 +48/+58/+68/+78 处绘制。
  UI 中的数字从清单读取 —— 不存在第二个会漂移的常量。

### 数据来源

端脑几何来自 **BodyParts3D 4.0**（本项目已拥有的归档，
`assets-src/bp3d/isa_BP3D_4.0_obj_99.zip`，2,234 个网格）—— **CC BY 4.0**，与脑干、间脑和小脑网格相同的来源与许可。**没有新数据源，也没有新的许可工作**：该归档本来就包含整个端脑。

署名，逐字（也见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)）：*BodyParts3D, © The Database Center for Life Science, licensed under CC BY 4.0.* 皮层带派生自这些数据 —— 见下文的如实说明的局限。

### 如何重新烘焙（确定性，仅用 Node，不含时钟/随机数）

```bash
node scripts/lib/register.mjs            # 1. REGISTER  BP3D meshes → canonical space (assets-src/bp3d/canonical/tel-*.obj)
node scripts/build-anatomy-geometry.mjs --all          # 2. GEOMETRY  bake every recipe → src/assets/anatomy/*.glb + manifest
node scripts/build-anatomy-geometry.mjs --manifest     #    gate: rebuild the manifest from disk + enforce the budgets (exit 1 = over)
node scripts/build-anatomy-geometry.mjs --stats --tel-check   #    per-part tris/bytes + ribbon watertightness and thickness
node scripts/build-mri-grid.mjs          # 3. GRIDS     resample the CC0 OpenNeuro T1w over the AMENDMENT B box
node scripts/build-ct-grid.mjs           #              resample the NLM Visible Human CT over the same box
```

用 `--part <slug>` 烘焙单个部件（并用 `--resolution <au>` 覆盖其体素步长）；
`node scripts/build-anatomy-geometry.mjs --list` 会打印每个 slug。SDF 核、配方
契约与预算报告记录在 [docs/GEOMETRY_PIPELINE.md](docs/GEOMETRY_PIPELINE.md)。

`node scripts/build-anatomy-geometry.mjs --all` 是*集成者*的命令：只要有任何配方模块加载失败，它就是硬失败，因此一个坏掉的配方会阻断其余一切重新烘焙 —— 迭代时请优先用 `--part`。

### 实测预算（本次提交）

| 预算 | 上限 | 实测 | 结论 |
| --- | --- | --- | --- |
| 渲染三角形（场景） | ≤ 800,000 | **570,096** | PASS |
| 已提交解剖 GLB 载荷 | ≤ 14 MiB | **13,755,548 B = 13.12 MiB** | PASS |
| 核团汇合载荷 | ≤ 3 MiB | **2.81 MiB** | PASS |
| 单部件上限 | context ≤ 4 MiB · csf ≤ 1.5 MiB · nucleus ≤ 80 KiB | 最大核团 `ctx-caudate-r` 76 KiB | PASS |
| 半球壳三角形上限（计划 §4） | 各 ≤ 90,000 | `ctx-hemisphere-l` 78,512 · `ctx-hemisphere-r` 80,080 | PASS |
| 影像载荷 | ≤ 10 MiB | **9,132,531 B = 8.71 MiB / 80 files** | PASS |

前四行以 `node scripts/build-anatomy-geometry.mjs --manifest` 为准，任何超限都会以 1 退出；最后一行由 `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` 强制。

### 如实说明的局限（v7）

- **皮层带是派生的，不是扫描来的。** BodyParts3D **没有显式的皮层灰质表面** ——
  该归档中唯一的皮层概念解析到海马。因此皮层带采用标准构造法：取配准后的大脑白质表面，
  按皮层厚度（**2.9 au ≈ 3.5 mm**，计划 §1 的 3–4 mm 窗口）向外成带，
  再刻出半球间裂、外侧裂与脑室空间。它是*建模*的软膜表面，不是真实皮层的分割，
  它继承的是白质表面的脑回起伏，而不是复现真实的沟回细节。
- **有四条纤维束没有网格。** 视辐射、扣带、钩束与上纵束**以路点路径的形式撰写**
  （与 v1–v6 的纤维束一样），因为源归档中不含纤维几何。它们是示意性中心线，不是纤维追踪。
- **CT 不覆盖半球。** Visible Human 序列止于 **y ≈ 36.25 au**；见上文
  *它如何渲染*。CT 仿射被有意做得**与 v4 逐字节一致**（未重新拟合），因此
  13 个既有层级锚点及其 CT 采样都未改变 —— 要让 CT 顶点与 MRI 对齐需要约 +45 au 的平移，
  并且会移动每一个既有层级，那是一次单独的重新配准，明确不在范围内。
- **配准是近似的，并且被披露。** 端脑网格继承脑干烘焙有文档记载的
  配准残差（中线 ≤ 1.25 au），而派生皮层带在此之上又叠加了厚度模型自身的误差。
- **有些记录是纯内容的。** 20 条端脑记录被有意不绘制为 3D
  实体（见 `TEL_CONTENT_ONLY_IDS`）—— 要么因为另一条记录已经绘制了它们的网格，
  要么因为它们是某个网格的子区域。它们仍可从树、搜索与
  图版完全选中，实时断面也仍会绘制它们所属的区域。
- **有一项预算上限被提高。** **核团汇合载荷上限 2.5 MiB → 3 MiB** 是 v7 提高的唯一
  数字，并且它与测量值一起记录在
  `scripts/build-anatomy-geometry.mjs`（`BUDGETS`）中。按计划要求，先削减的是分辨率。两项
  运行级约束 —— **800,000 个渲染三角形**与 **14 MiB 已提交
  解剖载荷** —— 未变且通过。

## v7 收尾 —— QA 确认了什么，以及如何验证的

端脑落地于 `d1cefef → 2681d20 → 8ab1b47 → b5ab6f3`，但该轮次的 QA 从未执行，一次独立的 56 项浏览器审计留下了 **10 处失败**。本节记录收尾：哪里错了、修了什么，以及 —— 重要的是 —— **哪一档证据证明了每一项**。

### 五个真实缺陷及其修复

| # | 审计测得的症状 | 根因（在代码中确立） | 修复 | 一旦回退就会失败的门禁 |
| --- | --- | --- | --- | --- |
| 1 | `no "lost" recovery overlay after the context was lost`（`isContextLost() === true`，没有 `[data-context-lost]`） | PostFX 的 `alpha` 抛出（#2）被 react-three-fiber 的内部边界重新抛进 DOM 树，于是 `3D viewer` 面板边界卸载了 **整个 `Viewer3D`** —— 把叠加层一起带走了 | 叠加层现在渲染在 `<Canvas>` 子树**之外**，并且每个画布子节点都位于各自的 `CanvasSceneBoundary` 中（它渲染 `null`，这是 THREE reconciler 唯一接受的回退） | `audit-checks.test.mjs` —— *"the overlay is rendered OUTSIDE the R3F `<Canvas>` subtree"* / *"canvas children are wrapped in CanvasSceneBoundary"* |
| 2 | `PostFX.tsx` 处 `TypeError: Cannot read properties of null (reading 'alpha')` | `postprocessing@6.36.7` 在 `addPass`（`build/index.js:1002`）与 `setRenderer`（`:864`）中读取 `renderer.getContext().getContextAttributes().alpha`；按 WebGL 规范，该调用在上下文丢失期间返回 **`null`**，而 React 会在丢失时重新渲染 R3F 树 | `PostFX` 在丢失期间返回 `null`（`contextLost` prop），因此没有通道需要重新添加；恢复时它针对新上下文重新挂载 | `audit-checks.test.mjs` —— *"PostFX returns null while the context is lost"* / *"passes the live loss state into PostFX"* |
| 3 | `CT coverage statement missing at y = +58` | **检查缺陷，不是产品缺陷。** 该陈述已经存在且已经接好；检查在断言之前从未证明实时断面被钉在 **y** 轴上 | 检查现在先钉住轴、证明 `sectionAxis === 'y'`，并在断言前报告 `{axis, planeValue, kind, notePresent}` —— 并且断言实测极限之上的**诚实**状态，而不是要求一条不可能存在的署名 | `audit-checks.test.mjs` 第 (3) 组 —— 由真实的 `ctCoverageStatement()` 与已交付的 `ct-manifest.json` 驱动 |
| 4 | `the default preset is not Brainstem focus` + `2 brainstem-family tree row(s) are dimmed` | **检查缺陷 + 一处潜伏的代码缺口。** 审计的 profile 持久化了 `neuroaxis.viewPreset`，于是一个回访偏好决定了启动检查。另外，`telSubdivisionIds` **仅**按 `subdivision` 过滤，因此一条间脑记录可能被扫进某个皮层预设的 `hidden` 集合 | 审计使用**每次运行全新的 profile**，并加上显式的 `localStorage.clear()` 序言，在检查任何预设之前先在自己的块中断言启动状态。`telSubdivisionIds` 现在同时按 `region === 'telencephalon'` **和** subdivision 过滤。收尾随后又放宽了加载期守卫：**每一个**预设现在都在模块加载时被清扫 —— 由 subdivision 派生的预设只能隐藏端脑记录，`cortex-only` **不得**隐藏任何端脑记录（那不是它的用途），并且每个被隐藏/强调的 id 都必须存在于分类学中。变异证明显示两个方向都会抛出（默认预设上的 `ctx-thalamus-envelope`、`cortex-only` 上的 `ctx-cerebral-cortex`） | `audit-checks.test.mjs` 第 (4) 组 + `closure-bite.mjs` 变异 (4a)/(4b) —— 区域守卫与“没有任何脑干行处于图层关闭状态”的断言 |
| 5 | `the forced throw was not contained by the "Taxonomy tree" boundary` + `?panelfail armed 0 boundaries` | **两个真实缺陷。** (a) 探针标记是抛出组件的一个*兄弟节点*，因此 React 在抛出的那次渲染过程中把它丢弃了 —— “armed” 无法被观察到。(b) `isDevBuild()` 通过一个**类型别名强转**读取 `import.meta.env`，而 esbuild 会把它擦除；Vite 的 `vite:import-analysis` 会遍历转换后的模块以寻找字面量 `import.meta.<prop>` 访问，因此没有注入 env 对象，钩子在 dev server 中是死的 | 标记被移到**失败卡片上**（`panelErrorCard`），因此 `probes === 1` 把“已武装”*与*“已包含”证明为同一个事实；`isDevBuild()` 读取字面量 token。闩锁是一次性的，在 `componentDidCatch` 中被消费，因此 **Retry 能够恢复**，而不是再次抛出 | `audit-checks.test.mjs` 第 (5) 组 —— 通过真实抛出驱动真实边界，断言 `card=Taxonomy tree · probes=1 · retry=true`，然后断言 Retry 会恢复子节点 |

缺陷 1 与 2 共有同一个成因：在上下文丢失期间，特效栈不得崩溃；而画布抛出不得能够卸载恢复 UI。这两个修复彼此独立，因此只做其中一个仍会让另一个缺口敞开。

### 两个审计产物（是检查问题，不是产品缺陷）

两者都是检查在要求数据无法提供的东西；两者现在都**感知覆盖范围**，并断言诚实的状态：

- **端脑平面上的 CT。** Visible Human CT 序列是一次仅头部扫描，其数据止于
  规范 **y ≈ 36.25 au**（`ct-manifest.json` → `intensity.sourceCoverage.superiorMostDataYAu`；
  64.3 % 的站点在源视场内）。在其之上，CT 网格仍跨越盒体，但*每个站点都是背景*。
  检查现在在那里要求**没有 CT 署名**，并要求陈述该极限与 MRI —— 绝不把“什么都没画”当作失败。
- **y = +58 处的照片。** 没有任何照片被锚定在最高映射层级之上，因此诚实的
  断言是画布的“无锚点”提示，而不是署名。

在其覆盖范围之内，CT 检查**未变且仍然严格**：它要求 NLM 署名与真实的绘制样本。如果 CT 在已覆盖平面上什么都没画，清扫门禁就会失败。

### 审计自身的 DOM 查询也被加固了（以便浏览器重跑测量的是产品）

十处失败中有三处是由**查询**决定的，而不是由产品决定的，而一次误触发的查询在报告中与一个缺陷无从区分。因此浏览器通道在“读什么”上也被做成确定性的，而不只是在“存什么”上：

- **树导航按名称精确匹配且幂等。** 端脑进入树之后，裸的
  `textContent.includes('Thalamus')` 也会匹配 *Epithalamus*，而对一行已经展开的
  细分行无条件点击会**折叠**下一个检查所需的子树。`audit.mjs` 现在
  剥离 `▸`/`▾` 标记与计数，**精确**比较名称，并且只在
  该行确实处于关闭状态时才点击（先读 `aria-expanded`/标记）。
- **模态清扫在实时断面内部运行。** 平面/类型读数从
  实时断面工具栏自己的分组（`.section-toolbar-group[aria-label="Imagery modality"]`）读取，而这些在 3D 标签页上并不存在 —— 这就是为何编排器那一轮中每个模态都读成
  `pressed: null`。清扫现在先进入实时断面，并报告它测量的是哪个上下文。
- **被禁用的模态是一个诚实状态，不是失败。** 在模态确实
  无法绘制的平面上（CT 高于 `y ≈ 36.25 au`、Photo 没有锚定图版），检查现在会区分
  *已禁用且原因写在其 `title` 中*（正确行为）与 *已启用但点击没生效*
  （真实缺陷）。修复前的检查把两者报告为同一个失败。

两个端脑特有的审计缺口作为**检查**被闭合：树检查把自身限定在
真正展开子树的 region → subdivision → structure 行上，而谓词层
（`scripts/verify/checks.mjs`）与 Node 通道共享，因此浏览器通道不会偏离那份可被证伪的镜像。

### 实测预算（v7 收尾，从已提交产物重新推导）

| 预算 | 上限 | 实测 | 结论 |
| --- | --- | --- | --- |
| 渲染三角形（场景） | ≤ 800,000 | **570,096**（106 个部件） | PASS |
| 已提交解剖 GLB 载荷 | ≤ 14 MiB | **13,755,548 B = 13.12 MiB**（106 个文件，0 缺失） | PASS |
| 影像载荷 | ≤ 10 MiB | **9,132,531 B = 8.71 MiB / 80 files** | PASS |

解剖行以 `node scripts/build-anatomy-geometry.mjs --manifest` 为准，影像行以
`node scripts/verify-imaging-v4.mjs` 为准。两个免浏览器门禁在**没有任何外部前置条件**的情况下重新推导同样的数字（不需要 `assets-src/`、不需要重新烘焙、不需要服务器）：
`node scripts/verify/budget-report.mjs` 读取已提交清单并对已提交资产树做 `statSync` —— 同时打印载荷读数*与*更严格的整目录读数 —— 而
`audit-checks.test.mjs` 在自己的运行内对这三个数字做交叉核对。两者在任何超限时都会失败。

### 空间完整性 —— y = +45 以下没有任何东西移动

该轮的硬约束是被显式验证的，而不是假设的：

- `src/assets/anatomy/anatomy-manifest.json` 与收尾前的提交**逐字节一致** —— 106 个部件中的每一个都保持其 `triCount`、`bbox` 与 `centroid`，因此没有任何烘焙几何移动。
- `src/data/levels.json` 保持**同样的 17 个锚点**：13 个 v7 之前的
  （−50、−46、−42、−34、−24、−18、−8、2、8、14、19、28、36）未变，四个 v7 新增
  （+48/+58/+68/+78）纯属追加，且该集合仍严格递增。
- `CLIP_BOUNDS` 只向上扩展：`x −48..48`、`y −55..+85`、`z −75..+55`。下界
  未被触动。

`audit-checks.test.mjs` 在每次运行时都断言锚点算术。

### 证据分档 —— 在引用某次“通过”之前请先读这一节

浏览器通道（`verify:audit`、`verify:browser`、`verify:acceptance`）通过 **DevTools Protocol 驱动无头 Chrome**。在受限沙箱中，Chrome 根本无法启动，三个通道都以 **`4` —— “环境不可用，未运行任何检查”** 退出：

```
crashpad_client_win.cc:421  OpenProcess: Access is denied. (0x5)
platform_channel.cc:108     Check failed: . : Access is denied. (0x5)
```

Chrome 死在 **`mojo::PlatformChannel` 内部** —— 它无法创建自己为每个子进程使用的 IPC 通道 —— 因此这是沙箱边界，而不是缺少浏览器：本机同时存在 `chrome.exe`
（`C:\Program Files\Google\Chrome\Application\`）与 `msedge.exe`，并且审计的 dev server 在同一次运行中约 0.5 s 就到达 `http://localhost:5173`，随后却启动不了 Chrome。由 Node 启动的 Chrome 会立即以 Windows 崩溃状态 **4294930433 (0xFFFF7001)** 死亡，其 DevTools 端点（`http://127.0.0.1:<port>/json/version`）永不响应。

这是针对**四种**启动变体测得的 —— Chrome *与* Edge、`--headless=new` *与*
传统 headless，全部带 `--no-sandbox --disable-crash-reporter --disable-breakpad` —— 每一种都在其 DevTools 端点响应之前退出。**`exit 4` 既不是通过，也不是产品失败**；
测试框架自己的退出码之所以存在，正是为了让“一个无法运行的检查”永远不会被读成
“产品坏了”。

因此每一个审计裁决都由 `scripts/verify/checks.mjs` 中**同一组纯谓词**决定。
浏览器通道把真实 DOM 读数喂给它们；Node 通道把**已交付的清单与
已交付的源码**喂给它们：

| 档 | 门禁 | 无需浏览器即可运行 |
| --- | --- | --- |
| **1 —— 有约束力** | `npm run validate`、`check`、`build`、`verify:pipeline`、`verify:plane`、**`verify:plane-helper-extent`**（v10）、`verify:somatotopy`、`verify:cortical-lobes`、`verify:pip-contract`、**`verify:division-toggles`**（v10）、**`verify:area-toggles`**（v11）、**`verify:view-filter-consistency`**（v11）、`node scripts/verify/boundary-contract.mjs`、`node scripts/verify/a11y-contract.mjs`、`node scripts/verify/budget-report.mjs`、`node scripts/build-anatomy-geometry.mjs --manifest`、`node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | 是 —— 这些必须以 0 退出 |
| **1b —— 有约束力；v9 收尾时“这些是红的”的说明无法复现** | `npm run verify:audit-checks`（92 通过 · 0 失败）与 `node scripts/verify/closure-bite.mjs`（7/7 变异被捕获） | 是 —— 二者都由 v10 集成者清扫针对 `f5d3ed2` 处**未修改**的文件重新测得为绿（[v10 验证](#verification-v10-close-out-non-browser)）；变暗行检查带有有文档记载的血管豁免**以及钉住它的那条断言**（*"the 14 vascular rows are off at default framing through the REGION layer only…"*），因此 v9 的说法是被取代，而不是被糊过去 |
| **2 —— 记录在案，但不作断言** | `npm run verify:anatomy`、`npm run verify:imaging-fit`（二者在 agent 沙箱中**被环境阻断**：在任何裁决之前 `spawnSync … EPERM`）、`npm run verify:audit`、`verify:browser`、`verify:acceptance` | **否** —— 以命令 + 退出码 + 原因的形式报告 |

`audit-checks.test.mjs` 是**镜像，不是浏览器测试**：它证明决策逻辑、已交付代码中的 DOM
契约以及已交付的数据/清单事实 —— 9 组共 91 条断言，
包括 v1–v7 的回归面和端脑健全性清单中免浏览器的那一半。它**不**证明像素出现过。审计的运行时那一半（场景亮度、
实时断面绘制计数、指针与焦点交互、幽灵壳的半透明度，以及
真实的 `WEBGL_lose_context` 循环）在沙箱中**仍未被证明**，必须在能启动 Chrome 的机器上用
`npm run verify:audit` 重跑。

### 端脑健全性清单 —— 这里逐项证明了什么

该轮的健全性清单是一份**浏览器**清单。这里无法启动任何浏览器，因此下面每一项都从已交付的数据、源码与清单作答（同一事实最强的免浏览器形式），而只有渲染引擎才能补充的那一件事会被明确点名。右列中没有任何内容是浏览器观察。

| 清单项 | 免浏览器证据（每次运行都会断言） | 仍需要浏览器 |
| --- | --- | --- |
| 树显示该区域及其 5 个细分 | taxonomy：46 条端脑条目分布在 **Basal ganglia 9 · Cerebral cortex 10 · Lateral ventricles 7 · Limbic system 6 · Telencephalic white matter 14**（42 个结构 + 4 条纤维束） | 这些行会被绘制并展开 |
| 半球/幽灵壳能渲染，且足够半透明以保持脑干可见 | `GHOST_OUTLINE_OPACITY = 0.05`（记录隐藏时）与 `GHOST_SHELL_OPACITY = 0.14`，色相 `#9fb0c4`；默认预设确实走轮廓分支（它隐藏 `ctx-cerebral-cortex`，三元表达式取 0.05 而非 0.14） | 渲染出的亮度 —— 0.05/0.14 是已交付的不透明度，不是实测屏幕 |
| 端脑结构可从树、搜索、3D 视图**以及**轴位 +58 图版中选中 | 四条路径都派发同一个 `selectStructure` action（回归组）；+58 图版上的 `data-structure` 标签解析到 `ctx-cerebral-cortex`；"Head of caudate nucleus" 解析出 2 个外部引用 | 点击、焦点与悬停本身 |
| 四个新层级（+48/+58/+68/+78）驱动裁剪平面、吸附到图版、实时断面与 PiP | 四个锚点都以各自的 id 存在（`lvl-tel-thalamostriate@48 · lvl-tel-basal-ganglia@58 · lvl-tel-centrum-semiovale@68 · lvl-tel-convexity@78`），都位于 `CLIP_BOUNDS`（y −55…+85）之内，并保持表格严格递增，因此 `nearestLevelTo` 无歧义 | 拖动滑块会落在它们上面 |
| 实时断面在 y = +58 处以 Auto 与 MRI 绘制 | MRI 网格覆盖 +58（站点 57.50 au，相距 0.50 au，100 % 站点在视场内），且 pip/section 流水线共享同一个变换（`verify:plane`，10 827 条断言） | 屏幕上的绘制计数 |
| CT 模态在那里陈述其覆盖极限 | 已交付的陈述点名 `36.25 au` 与 "MRI is the modality of record"，并且在覆盖范围内及非横断轴上为 `null` | 工具栏在该平面显示它 |
| +58 轴位图版渲染其标签 | `plate-tel-axial-58.svg` 带有 24 个标签、覆盖 19 个不同结构 id，全部可在分类学中解析，0 悬空 | 该 SVG 会光栅化 |

三张端脑图版以 `plate-tel-axial-58.svg`、`plate-tel-sagittal-hemisphere.svg`
与 `plate-tel-coronal-fornix.svg` 提交（15 条图版记录：12 条既有 + 3 条 v7；只有轴位那张带
`levelId`，即 `lvl-tel-basal-ganglia`，这正是吸附到图版所读取的）。

### 收尾是经变异证明的，不只是被断言

`node scripts/verify/closure-bite.mjs` 在一份隔离的树副本中（`.plate-scratch/bite/tree`，被 git 忽略）为每一个已闭合的缺口重新引入**确切的修复前缺陷**，并要求镜像以预期文本失败 —— 一个无法失败的门禁不是门禁：

| 已闭合的缺口 | 重新施加的变异 | 结果 |
| --- | --- | --- |
| (1) 上下文丢失叠加层 | 从恢复卡片中去掉 `data-context-lost` | 捕获，`exit 1` |
| (2) PostFX 合成器守卫 | 让合成器在上下文丢失期间挂载 | 捕获，`exit 1` |
| (3) CT 覆盖诚实性 | 保留极限，去掉 "MRI is the modality of record" | 捕获，`exit 1` |
| (4a) 默认预设 | 让 *Brainstem focus* 隐藏 `ctx-thalamus-envelope` | 捕获 —— store 的加载期断言抛出 |
| (4b) 预设区域守卫 | 让一个**非默认**预设隐藏一条端脑记录 | 捕获 —— 每预设守卫抛出 |
| (5) `?panelfail` 包含 | 渲染失败卡片但不带其探针标记 | 捕获，`exit 1` |
| (6) 感知覆盖的 CT 清扫 | 在模态清扫中忽略 CT 来源极限 | 捕获，`exit 1` |

脚本会打印每个变异的退出码、失败检查自己的句子，以及六个被变异文件在运行**前后**的 SHA-256：7/7 被捕获、共享树逐字节一致、恢复后的副本重跑为绿（91 通过 · 0 失败）。

<a id="cerebral-vasculature--deep-content-v8--the-arterial-layer-and-the-telencephalon-at-brainstem-granularity"></a>

## 脑血管与深部内容（v8）—— 动脉图层，以及脑干粒度下的端脑

**v8 新增了什么。** 图谱此前缺失的两样东西：作为独立图层的**脑血管**（Willis 环与主要脑动脉），以及把端脑带到脑干早已具备的命名粒度的**深部内容** —— 功能性皮层区、海马亚区、视路、脑室分段，以及纹状体/苍白球细分。动脉网格是**真实的 BodyParts3D 4.0 几何**（CC BY 4.0），由与其他所有外廓相同的脚本配准进规范空间，并由同一个 CLI 烘焙。

### 动脉图层

- **32 个新的烘焙网格** —— 26 个动脉元素（成对动脉的左右两侧）+ 6 个视路
  网格 —— 使已提交集合达到 **138 个 GLB · 599,204 个三角形 · 13.82 MiB**，由
  `npm run verify:pipeline`（138/138 个部件，0 问题）与 `npm run verify:anatomy`（包括
  *每个烘焙部件都位于 `CLIP_BOUNDS` 之内*，因此裁剪滑块可以触及全部）验证。
- **每条命名动脉一条记录，带其供血区与综合征。** 14 条记录
  （`vasc-internal-carotid-artery` … `vasc-posterior-medial-choroidal-artery`）各自带有它供应的结构
  （`territory`）、它们所属供血区的**既有综合征卡片**
  （`supply` —— PCA → Déjérine-Roussy / Percheron / Weber / Benedikt，AICA → lateral pontine / Millard-Gubler，
  SCA → cerebellar，PICA → lateral medullary / central Horner）、侧别、绯红色调与层片。
  选中一条动脉会高亮其供血区结构；打开一个综合征会点亮导致它的那条动脉。
- **Willis 环是一个真实的环，不是一组残端。** BP3D 每侧各有一个元素，因此每条
  成对动脉都**显式命名其右侧**（`bodyRight`），而不是被镜像 —— 这个环是不对称的，镜像左侧颈内动脉会让右侧那条处于错误的管径与走行。MCA
  与 PCA 各自在一条记录下拥有**每侧两个分段**（M1+M2、P1+P2），因此选中任一分段
  都会选中并点亮整条动脉。
- **一种读起来像动脉的材质。** `createVesselMaterial` —— 绯红色，`roughness 0.34` +
  `clearcoat 0.3`，对照组织预设的 0.85–0.95；0.5 半透明并带 fresnel 点亮边缘；其
  断面切面以动脉壁自身的色调（`#7f1d1d`）绘制，而不是共享的组织封盖。
- **一个 `Vasculature` 视图预设** —— 动脉铸型，加上它所供应的脑保持为极淡的轮廓
  （vessels + surface 记录 + context 外廓；每个核团、纤维束与脑室都按*类型*关闭图层）。
  该叠加层**在默认 Brainstem-focus 取景下被区域图层隐藏**，而在
  *All*、*Whole brain* 与 *Vasculature* 中可见 —— 两个方向都在模块加载时被断言，因此它既不会泄漏进
  默认视图，也不会变得不可达（见 `state/store.ts`：血管豁免是用它自己的
  断言换来的）。

<a id="the-granular-vasculature-layer-v17--53-vessel-records-authored-courses-no-blobs"></a>

### 细粒度血管层（v17）—— 53 条血管记录、作者撰写走行、不再有色块

**v17 新增了什么。** v8 的动脉图层是 14 条记录，其几何是已提交的 BP3D 铸型 —— 而你在前穿质处看到的两个**红色色块**，就是 `vasc-lenticulostriate-arteries` 在渲染它的**示意性放置椭球**（一个按 `size3d` 缩放的单位球，因记录是 `paired` 而绘制两次）。v17（a）**用作者撰写的穿通支走行取代这两个色块**，（b）比 14 条命名动脉**再深入一个层级** —— 既包括档案确实携带的中间与远端分支，也包括它根本没有概念的穿通支 —— 以及（c）让每一条带走行的血管都通过**实测投影贴合其解剖上遵循的曲面**。

- **53 条血管记录、40 条走行、77 根实际绘制的管道。** 39 条作者撰写走行记录（`src/data/structures/vasculature-courses.json`）+ 内置的豆纹动脉总记录，其中 **37 条成对**（以精确的 `x → −x` 孪生体再画一次）、**3 条中线**（单根）：`2 × 37 + 3 = 77` 根管道。注册表从 **248 → 287 行**，`vessel` 从 **14 → 53**；`npm run validate` 报告 0 错误 / 0 警告。
- **豆纹动脉的替换。** 六条链从 **M1 上壁顶点 [15.786, 11.967, 24.920]**（已提交 `vasc-middle-cerebral-artery-m1-l` 的一个真实顶点，距离 **0.000 au**）出发，穿过**前穿质**进入基底节 —— 四条外侧链到壳核目标，两条内侧（Heubner）链到尾状核头 —— 终末路点**擦过**它所供应的结构（外侧距壳核网格 0.021–0.179 au = 0.03–0.21 mm，Heubner 距尾状核 0.249–0.296 au = 0.30–0.36 mm），因为穿通支正是*终止在*它所供应的结构内部。结构渲染通道对任何带走行的记录返回 `null`，因此**两个椭球不再被绘制**：已交付的表格为全部 40 条走行打印 `tube only`、为 13 条有已提交网格的动脉打印 `baked body`，并在全部 53 条血管记录上给出 **blobs 0**（9 条豆纹动脉 id 全部被抑制）。
- **半径是有出处的管径，不是可读性折中。** 在 1 au = 1.2 mm 下 `r_au = calibreMm ÷ 2.4`，取自四个有文档记载的直径 —— **0.8 mm → 0.333 au**（9 条：豆纹动脉与其他穿通支）、**1.0 mm → 0.417**（4 条：Heubner、脊髓前动脉）、**1.2 mm → 0.500**（19 条：MCA/PCA 皮层支）、**2.0 mm → 0.833**（7 条：MCA M2、终末主干、A2–A3、P4）。39/39 满足 `|r × 2.4 − calibreMm| < 0.03`（最大误差 0.0008 au）。172 个路点共 **1,775.64 au = 2,130.8 mm** 作者撰写走行，每个路点都在 `CLIP_BOUNDS` 内。
- **贴合曲面靠测量，不靠肉眼。** 每条走行都声明它遵循的已提交外廓；流水线解析 GLB，找到最近**顶点**，再细化到其**相邻三角形**上的精确最近点，然后把路点沿外法向偏移 `tubeRadius + 0.15 au`。**172 个路点中有 67 个被投影**，门禁从网格字节重新推导每一个残差：左半球 50 个路点（放置后距曲面 0.021–0.925 au）、脑桥 5 个（0.145–0.454）、中脑 5 个（0.496–0.643）、小脑 4 个（0.549–0.615）、延髓 3 个（0.377–0.555）。镜像检查：重新测量 52 个镜像投影，最差偏差 **1.480 au = 1.78 mm**（容差 1.6 au —— 两个已提交半球是各自独立抽取的）。**穿通支有意声明 `surface: null`**：它们穿破曲面后*在脑内*走行，且每条记录都如此说明 —— 把它们投影到皮层外廓上正是本轮明确禁止的错误。
- **零载荷。** 没有新 GLB、没有 manifest 行、没有包围盒移动：manifest 仍是 **138 个部件 / 599,204 个三角形**，`Σ stat(parts[].file)` 仍是 **14,486,228 B = 13.82 MiB**，`src/assets/anatomy/` 仍是 **13.89 MiB**。路线是**程序化管道**（与脑神经相同的 `TractTube` 扫掠，每根 803 顶点 / 1,440 三角形）加上喂给既有轮廓 worker 的**程序化断面部件** —— 这是唯一可行的路线，因为解剖目录只剩 **0.18 MiB** 余量，而烘焙 BP3D 分支元素需要 **0.3–1.4 MiB**，即使抽稀也不够。
- **解剖记录。** 新表格（id · 名称 · 父动脉 · 侧别 · 供血区 · 走行长度 au 与 mm · 半径及其 mm 出处 · 曲面距离）在 `docs/SWARM_V17_PLAN.md` §2；元素注册台账（新记录声明了哪些 BP3D 元素、107 个中还有哪 8 个未注册）在 `docs/VASC_INVENTORY.md` §8；门禁是 `npm run verify:vasc-courses`（**2,171 条断言 / 0 失败**）与 `npm run verify:vessel-render`（**75/75**）。

**v17 如实说明的局限 —— 说出来，而不是丢掉。**

| # | 局限 |
| --- | --- |
| 1 · **这些走行是作者撰写路径，不是分割血管造影** | 每一条都是通过有文档记载的地标撰写的路径 —— 起点是**已提交父网格的一个真实顶点**，中间路点投影到已提交外廓，管径有出处 —— 并且**档案对其中大多数根本没有命名元素**（不存在胼周、胼缘、额极、眶额、距状、顶枕、压部、迷路、脑桥穿通、豆纹或 Heubner 元素）。这些记录带有 `basis: 'documented-course'`，其 `anchorNote` 明确说明路径背后到底是什么；**这些分支不是真实血管造影的分割，也没有提交任何血管影像数据集（MRA/CTA）** |
| 2 · **为什么不用烘焙几何** | 硬预算是已提交解剖目录：**14 MiB 上限中的 13.89 MiB**，余量 **0.18 MiB**。烘焙 BP3D 分支元素落在 **0.3–1.4 MiB** 区间 —— 放不下，因此细粒度层在架构上只能是程序化的，也正是记录数增长却**没有增加一个已提交字节**的原因 |
| 3 · **分支管道画在一个已经包含它的实体之上** | v8 烘焙把 34 个 MCA 元素（88,460 面）与 26 个 PICA 元素合并进其父动脉，因此新的 MCA/PICA 走行会画在**已烘焙的父体之上**。半径很小（0.333–0.833 au），远端路点被向外移到外廓上，使管道在皮层处凸出 —— 这是一个近似，被说明而不是被隐藏。`documented-course` 血管没有烘焙孪生体，是干净的 |
| 4 · **预期的“擦过”常常没有实现** | 偏移方向是*估计*法向：**67 个**放置路点中有 **61 个**的实际间隙**低于**预期的 `r + 0.15 au`，其中 **42 个**管道轴线比自身半径更靠近网格（最坏情况约半个截面陷入外廓之内）。数字被公布；修复是改用最近三角形法向的一行改动 |
| 5 · **2D 实时断面与 PiP 目前还不绘制血管轮廓** | 可见部件列表已携带 40 条血管 meta，worker 机制也已切分程序化几何（**77 个 worker 部件 → 2,581 个轮廓环，0 个非有限值**），但 `SectionCanvas.tsx` 的初始化注册表 effect 仍只追加神经部件 —— 因此在 `registryParts.push(...registryVesselParts())` 落地之前，血管几何在任何地方都没有被计算、也没有被绘制。一行代码，且不在本轮的写入范围内 |
| 6 · **一个计数过期的门禁是红的，而产品没有被弯折去迁就它** | `npm run verify:cranial-nerve-render` 为 **46/47**：它的 `partsForCanvas()` 恒等式仍写着 `138 + 12`，而现在找到 **190 = 138 + 12 + 40**，因为 v17 正是按计划加入了血管部件。重新指向（加上 `+ SECTION_VESSEL_PARTS.length`）不属于任何 v17 任务的写入范围，因此它被如实报告、树保持可见，而不是被一只非属主的手改掉 |
| 7 · **两条错误数据行与两处过期文本仍随版本发布** | (a) `vasc-pica-tonsillomedullary-segment.territory` 声明的是**侧**脑室的脉络丛，而它自己的正文写的是**第四**脑室（其兄弟记录正确地声明 `vent-fourth-ventricle`）；(b) `vasc-anterior-spinal-artery.territory` 在一条延髓动脉上声明了一行**脑桥**结构（`ctx-pontine-fibers`）；(c) 总记录 `vasc-lenticulostriate-arteries` 的 `contextNote` 仍在描述已退役的椭球，从未说明 v17 的作者撰写走行依据；(d) 被替换的内置内侧走行仍把 ACA 的一个连接点称作“颈动脉终末”。四处都是本轮写入范围之外的内容文件编辑 —— 已在 `docs/SWARM_V17_PLAN.md` §5 连同数字报告 |
| 8 · **这里没有验证的东西** | `verify:anatomy`（27/27）与 `verify:imaging-fit` 在沙箱对管道化子进程 stdio 的拒绝下、**在任何裁决之前**就中止（基线为红，0 条断言；`verify:anatomy` 被阻断的那项测量直接重跑为 **14,566,178 B**，未变）。**Chrome 无法在这里启动**，因此 *"管道真的被绘制在屏幕上"*、*"两个红色色块在屏幕上已消失"*、*"断面绘制轮廓"* 与点击选中**仅由编排器浏览器验证** |

### 深部内容（记录，带注释）

| 组 | 记录 | 说明 |
| --- | --- | --- |
| 功能性皮层区 | 12（`ctx-v1`、`ctx-v2`、`ctx-a1`、`ctx-a2`、`ctx-wernicke`、`ctx-broca`、`ctx-m1`、`ctx-s1`、`ctx-premotor`、`ctx-sma`、`ctx-entorhinal`、`ctx-frontal-eye-fields`） | 每一个都锚定到其宿主脑回网格，带功能、连接、血供、层级与参考文献 |
| 海马亚区 | 4（`nuc-subiculum`、`nuc-ca1`、`nuc-ca2-ca3`、`nuc-ca4`） | **仅记录** —— 放置的是示意性标记，并如此标注 |
| 视路 | 3（`tract-optic-nerve`、`ctx-optic-chiasm`、`tract-optic-tract`） | **真实网格**；既有的视辐射保留自己的记录 |
| 脑室分段 | 1 个新增（`vent-lateral-ventricle-body`）+ 细分 | 侧脑室是一个真实铸型，其各角/房/体被命名为记录 |
| 纹状体 / 苍白球深度 | `nuc-accumbens`、`nuc-ventral-pallidum`、`nuc-claustrum`、`nuc-globus-pallidus-internus`/`-externus`、`nuc-caudate-head`/`-body`/`-tail` | 记录存在且带注释；各分段共享其父网格（见*如实说明的局限*） |
| 脑血管 | 14 | 见上表 |

**视路从哪里渲染。** 视神经、视交叉与视束是 `tract`/`context` 记录，
位于 `src/data/structures/`，这意味着它们通过与核团相同的实体过程解析其烘焙体 —— 六个视路网格是真实几何，因此视神经是一根神经，而不是一条扫掠管道。它们
烘焙出的部件带有 `materialHint: 'vasculature'`（v8 烘焙把它们与动脉一起输出），因此
`RECORD_MATERIAL_OVERRIDES` 恢复它们自身类型所暗示的提示：两条纤维束用苍白的 CNS 白质，
视交叉用中性 context 预设。一条绯红色的视神经会是对该组织的一个错误陈述。

### 如实说明的局限（v8）

- **纹状体/脑室细分共享其父网格。** `nuc-globus-pallidus-externus`、
  `nuc-caudate-head`/`-body`/`-tail` 与侧脑室各角/房都被完整记录、注释并可
  选中，但它们的**几何是其父结构那一份已提交网格** —— 选中 GPe
  会高亮苍白球，而不是一个独立的外侧分段。拆分它们需要逐分段的网格（见下文）。
- **有些 v8 记录是有意做成仅记录的。** 四个海马亚区与
  `vasc-lenticulostriate-arteries` 不拥有网格：每一个都在其
  作者撰写的 `origin3d`/`size3d` 处渲染一个**有尺寸的示意性放置标记**，并在其自身的
  `contextNote` 中说明这一点。对豆纹动脉而言，这就是解剖本身的极限 —— BodyParts3D
  没有豆纹动脉概念（该血管被记录为 MCA 的前外侧中央支，而清单把它们归在 MCA 之下）。
- **血管源数据有一条被图谱裁掉的颈部尾段。** 配准后的 ICA/椎动脉元素带有其
  颈部走行，向下到 `y ≈ −97 au`，远在规范盒体之外。**烘焙把这两条主干裁到
  `y = −45 au`**，因此渲染出的任何东西都不会离开 `CLIP_BOUNDS`；规范源保留完整元素，这一偏离
  记录在 `assets-src/bp3d/REGISTRATION.md` §B.4 中，而不是被藏起来。
- **`vasc-lenticulostriate-arteries` 没有网格，MCA 的分支网格也不是它。** BP3D 的 MCA 元素
  包含前外侧中央支，但把它们切出来当作“豆纹动脉”，就等于断言一个
  来源并未做出的分割。

> **v17 更新 —— 取代上面两条关于豆纹动脉的条目。** 该记录仍然**没有网格**，但它不再是**有尺寸的示意性放置标记**：v17 绘制**作者撰写的穿通支走行**（六条链，从 MCA M1 壁穿过前穿质进入壳核与尾状核头），并让椭球退役 —— 两个红色色块是被*抑制*掉的，不是被新网格取代的。MCA 的前外侧中央元素（`FJ1662`/`FJ1662M`、`FJ1663`/`FJ1663M`）现在被命名为外侧链的**依据**，而不是被切出一个烘焙实体。关于海马亚区的那一条不变。新图层的如实局限（作者撰写路径而非分割血管造影；0.18 MiB 载荷原因；2D 绘制缺口）见[细粒度血管层（v17）](#the-granular-vasculature-layer-v17--53-vessel-records-authored-courses-no-blobs)。

- **断面视图中没有叠加血管影像。** 真实影像图层（MRI、CT、冷冻切片）未变：
  它们是组织模态，且没有提交任何带血管标注的数据集（MRA/CTA）。
- **v8 有意没有做的事：为亚核团切出各自的网格。** GPi/GPe、尾状核的三部分与
  四个脑室分段各自仍是一个网格，有多条记录指向它。要正确做到这一点，需要对已提交
  实体做 SDF/CSG 拆分（GPe 围绕 GPi 的*壳*、被*平面裁剪*的尾状核头/体/尾、
  被角裁剪的脑室铸型），每一部分在能被提交之前都必须保持水密、在其单部件三角形上限之内、
  并在其父包围盒之内 —— 那是一项自带验证的几何任务，而不是内容任务。它是
  v8 剩余工作的第一项，而已经就位的记录正是它将指向的对象。

### 证据（v8）

| 门禁 | 结果 |
| --- | --- |
| `npm run validate` | **exit 0 —— 0 errors, 0 warnings**（220 条注册表条目，0 条等待记录；16 个结构文件 / 197 条记录） |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0** |
| `npm run verify:pipeline` | **exit 0 —— 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems** |
| `npm run verify:plane` | **exit 0 —— 10,827 assertions** |
| `npm run verify:anatomy` | **exit 0 —— 27 passed · 0 failed**（脑干外廓的 bbox 不变性、MRI/CT 内容不变性、每个烘焙部件都在 `CLIP_BOUNDS` 内、预算） |
| `npm run verify:acceptance` / `verify:audit` | 浏览器通道，由编排器在本次变更后重跑（见下文*验证*） |

<a id="v9--somatotopy-cortical-divisions-measured-imaging-registration-and-a-simulated-section-panel"></a>

## v9 —— 躯体定位、皮层分区、实测影像配准与模拟切面面板

规格：[`docs/SWARM_V9_PLAN.md`](docs/SWARM_V9_PLAN.md)（该轮的权威规格）及其 §8 收尾；
该轮据以验证的可执行契约是 `PLAN.md`（**被 git 忽略**，因此它只是工作树中的备案计划 —— 下面这些门禁才是从全新检出即可复现的东西）。本节中的每个数字都在收尾时用紧邻它标出的命令重新测得。

### 1. M1 与 S1 的躯体定位图

**16 条新记录** —— 8 个运动与 8 个感觉身体节段（`ctx-m1-toe` … `ctx-m1-larynx` 以及对应的
`ctx-s1-*` 镜像），region `telencephalon`，subdivision *Functional cortical areas*，`kind: context`，`parent` =
`ctx-m1`/`ctx-s1`。它们是普通记录，因此树、搜索、信息面板、图版与断面
都会自动收录它们。

- **放置是探测出来的，不是猜的。** `src/geometry/somatotopy.ts` 同时携带那张表*与*产生它的规则；一个被 git 忽略的探针遍历已提交的 `ctx-hemisphere-l` 皮层带（40,388 个顶点 / 81,128 个三角形，有符号体积 +301,371.7 au³，因此顶点法线朝外），把每个节段吸附到最近的皮层带顶点并报告残差。实测残差：**M1 最小 0.01 / 中位 0.04 / 最大 0.16 au**；
  **S1 最小 0.29 / 中位 0.78 / 最大 2.29 au**（三个最不确定的 S1 节段在各自的
  `contextNote` 中被点名）。采样贴片边缘距皮层带的最差距离：**3.05 au = 3.67 mm**（`ctx-s1-trunk`）。
- **顺序是被强制的，不是隐含的。** `npm run verify:somatotopy`（45 条断言）要求每条带上的躯体定位
  顺序 0…7、**弧长严格递增**（M1 最小间隙 7.72 au = 9.26 mm，S1 6.27 au =
  7.52 mm）、**规范 x 也严格递增**、**8/8 M1↔S1 配对**，并且每一个放置（包括
  镜像的 −x 范围）都在 `CLIP_BOUNDS` 之内。
- **3D 叠加层。** `SomatotopyOverlay.tsx` 为每个节段绘制一个定向贴片 —— 四元数来自实测
  法线，颜色来自单一的 面→手→臂→躯干→腿 渐变，带身体部位标签 —— 由与其他一切相同的
  端脑+context 图层开关门控，遵守预设的 `hidden` 集合，并在另一个结构被选中时变暗到
  0.15。它是一个**专用的贴片通道，而不是 `NucleusMesh`**：那个
  网格没有朝向输入，颜色取自记录，并为整个形状浮动一个 bbox 标签（完整原因见计划 §8.1）。

**如实说明的局限。** 贴片位于**派生**皮层带上 —— 一个建模的软膜表面，而不是对真实皮层的
分割 —— 因此每个位置都是“皮层带上的示意”，上面那条探针残差
是唯一的精度陈述。静止时该图靠颜色渐变读解；身体部位标签只为
悬停/选中的节段渲染。

### 2. 2D 实时断面中的皮层分区

一个新的 **"Cortical divisions"** 开关（会被持久化，并带图例）按 **frontal · parietal · temporal · occipital · insula · limbic** 重新给实时断面中的皮层带着色，绘制在既有的
"Cerebral cortex" 填充*之上*，而不是替换它。`src/components/section/corticalLobes.ts` 在文件头中携带拟合出的
边界常量、它们的测量以及它们的**逐边界残差**。

- 边界由一个可出报告的探针序列拟合到已提交皮层带：中央沟来自
  实测的背侧嵴凹口（两个实测端点处残差 **0.0 au**，手结区最远处
  **5.4 au**），外侧裂锚定在实测的 MCA M1 交界与 M2 出口（M2
  出口处 **3.9 au**），顶枕边界钉在 **11.05 %** 的皮层带占比上，岛叶作为椭球
  穿过外侧裂走廊拟合、包含 **3.34 %** 的皮层带顶点（形态计量学序列 1.8–2.5 %），而
  边缘带被设在胼胝体表面之外 **3.4 au = 4.1 mm** 的扣带处。
- **实测占比**（`npm run verify:cortical-lobes`，200 条断言，exit 0）—— 整条皮层带：frontal 44.3 %、
  parietal 21.6 %、temporal 17.6 %、occipital 9.3 %、limbic 3.9 %、insula 3.3 %。跨 13 个参考
  平面：frontal **47.60 %**、parietal **27.30 %**、temporal **12.90 %**、occipital **6.60 %**、limbic
  **3.50 %**、insula **2.11 %** —— 并且该检查会逐平面打印哪个分区缺席。

**如实说明的局限。** *它划分的是派生皮层带，不是脑回图* —— 这一告诫写在文件头、
图例以及这里。**13 个参考平面中有 3 个（y = −46、−24、−8）完全错过皮层带**（其
下界为 y = −6.803），因而没有分区；岛叶在 13 个平面中有 7 个缺席，边缘区在 4 个平面缺席；
派生皮层带**没有岛叶表面**，因此岛叶绘制的是可用的最深处的界阈组织；并且
`limbic : rest = 1 : 26.8`，而文献中为 1 : 8–1 : 20，因为该带是探针能够测量的 1–2 个脑回条带，
而不是整个边缘叶。

### 3. CT / 照片误配准的实测

`node scripts/fit-imaging-affine.mjs --report` 是一个**可重跑的拟合器**（确定性由粗到细网格
搜索，3 个阶段，无 RNG/时钟/网络），它把**图谱脑掩膜**（经断面流水线自身裁剪的 34 个已提交 GLB 部件）
与**每种模态自身的图像掩膜**作比较，并打印前后对比表、搜索边界、每个平面的残差以及改善/变差的计数。

| 模态 | 测量了什么 | 裁定 |
| --- | --- | --- |
| **照片 / 染色**（24 张可测量的 PNG 图版） | 平均 ROI IoU **0.0741 → 0.4468**；**24 改善 · 0 变差**；例如 `ubc-h20` 0.343 → 0.731、`ubc-h17` 0.099 → 0.699、`ubc-c07` 0.028 → 0.348；最佳图版上的残差 21.0 → 0.8 au 与 20.3 → 1.5 au，最弱者为 16.0 → 14.1 au | **已应用** —— 校正后的仿射以 `fittedFit` 传递，且 `imageLayers` 优先使用它 |
| **CT**（8 个参考平面） | 逐平面最佳拟合：平均 ROI IoU 0.0569 → 0.1428，平均质心残差 **18.09 → 10.64 au**（8 改善，0 变差）。但只能交付**一个**相似变换，而它会让情况变糟：平均残差 **18.09 → 20.39 au**，中位 10.82 → 34.04 au，最差平面 **+15.24 au**，改善 2/8 | **未应用** —— `applied: false`，原因与数字提交在 `ct-manifest.json` 中 |
| **MRI**（8 个参考平面） | 逐平面最佳拟合：平均残差 **9.40 → 6.93 au**；可交付的相似变换：**9.40 → 17.75 au**，最差平面 +14.79 au，改善 3/8 | **未应用** —— 同上，记录在 `mri-manifest.json` 中 |
| **JPEG 图版**（49 张：`vhp-*` 22、`ubc-m*` 17、`bmm-*` 10） | **什么都没测** —— 本仓库中不存在 JPEG 解码器，且不允许新增依赖 | 记录为 **`unmeasurable: no-decoder`**，附计数与原因；已提交的放置保持不变 |
| **3 张 Commons CT 图版** | 它们没有可校正的已提交 `fit` | `not-fittable`，照此陈述 |

**为什么这里“更好”的重叠数字并不是修复。** 图谱掩膜是**脑**；CT/MRI 掩膜是
**头部软组织外廓**（本仓库中没有脑分割器），因此只有 **6.6 %（CT）/ 8.0 %（MRI）**
的图谱落在图像掩膜上 —— 这次搜索并不是在比较同一个物体的两个视图。诚实的结果
就是那张残差表，这也是它**取代**校正而交付的原因。

**如实说明的局限。** 用户的报告（“CT 叠加层明显偏了”）是**经测量、量化且仍未修复的**：
CT/MRI 图层保留其已提交的放置，并在 UI 中连同数字说明这一点。照片校正覆盖
76 张已提交图版中的 **24 张**。y = +45 以下没有任何东西移动：`ct.bin`、
`mri-t1.bin` 与两个清单的 `dims`/`originAu`/`spacingAu` 都与 HEAD 逐字节一致 —— 校正只发生在
显示时，因此 `verify:anatomy` 的 MRI/CT `max |Δ| 0 of 255` 不变式仍然成立。而且
**`npm run verify:imaging-fit` 在收尾时是红的**（见*验证*）：该门禁把逐平面表
与 `registration.display.planes` 比较，而清单并不携带它，并且有两个 `fittedFit` 字面量被
格式化成 `3.108820`，而门禁构造出的是 `3.10882`。

### 4. 一个“关闭影像”状态

*Plates* 工具栏的 **Simulated only** 模态现在是一个一等、可读的状态：统一的措辞
（`SECTION_UNDERLAY_KIND_DESCRIPTIONS.none` —— *"Simulated only (no imagery): draw the simulated section and
nothing external"*）、模态按钮的无障碍名称、实时断面状态行、面板自身的那一行，
以及用于该状态本身的 `IMAGERY_OFF_STATEMENT`。它像其他底图设置一样被持久化
（`neuroaxis.sectionUnderlay`，schemaVersion 2），并且它是唯一取样点上的一个**硬短路**
（`resolveSliceModality` 返回 `{modality:'none'}`），因此没有任何采样器会运行，也不会绘制任何署名行。

**如实说明的局限。** 可见按钮文本仍保持 **"Simulated only"**，而不会变成 "Simulated only (no
imagery)"：有四处调用点按精确文本匹配该字符串，其中两个文件在每个 v9 任务的写入范围之外，
因此解释性从句放在无障碍名称与状态行中。至于画布随后除了模拟断面什么都不画，那是一个浏览器观察（编排器通道）。

### 5. PiP 是一个模拟切面面板

3D 标签页右下角的面板曾是一个约 1,700 行的 GPU 模板裁剪渲染器，带真实切片背景。它现在是一个
**2D 模拟切面面板**：`SectionPiP.tsx` **717 行**，在其自身的错误边界（`PipSection.tsx`）内挂载 *Plates*
标签页所挂载的**同一个 `SectionCanvas`**（一条代码路径）。

| 要求（用户的原话） | 如何成立 |
| --- | --- |
| 没有裁剪过的 3D 几何 | 面板不挂载任何 3D 场景，也不拥有 WebGL 上下文；退役的那套装置（画布内渲染器、私有相机 + `WebGLRenderTarget`、模板一致性/封盖通道、MSAA 看门狗、`?pipdebug` 叠加层、剪裁位块传送、背景采样器）已被**删除** —— 检查断言该文件代码中不存在 12 个退役 token |
| 没有平面辅助器 | 面板不导入 `PlaneHelpers`；辅助器仍是**主**画布的切面指示器，未改变 |
| **永远没有真实影像** | 两重结构性保证：一个引用计数的**非持久化**影像作用域在面板画布挂载期间把 store 保持在 `kind:'none'`（用户自己的选择永远不会被改写，并在卸载时恢复），以及一个像素守卫仅在该画布上下文上遮蔽 `drawImage`/`putImageData`，并统计它丢弃了什么 —— 这两个调用是 `imageLayers.ts` 中仅有的真实影像路径（5 处位块传送点） |
| 可缩放，且会被记住 | 一个真实的 `<button class="pip-resizer">`（指针拖动、方向键、Shift ×4）加上一个小→大循环，存储在 `sectionPipSize` / `neuroaxis.sectionPipSize`（JSON）中，**读取与写入时都钳制到 224–880 × 170–640 px**，并以 `--pip-window-width/-height` 交给 CSS，因此 ≤900 px 媒体查询仍然胜出 |
| 仍有意义的那些界面元素 | 轴向覆盖（X/Y/Z，`aria-pressed`）、受审计的 `x = 12.0 au` 形状的平面读数、来自 `planeGeometry.PLANE_BADGES` 的四个方位徽章（若面板自己的表不一致，它会在模块加载时抛出）、隐藏（`Hide live section`）→ 恢复胶囊（`Live section ▸`），以及带精确 a11y 字面量的窄视口标签页 |

`npm run verify:pip-contract`（新增，**83 条断言**，exit 0）在 Node 中裁决 DOM 契约、钳制算术
与接线。它自身的如实说明局限写在文件中：zustand 4 交给静态渲染器的是
store 的**初始**快照，因此标记那一半断言的是启动状态，其他轴则通过
面板所调用的同一组纯函数来证明。守卫的局限写在 `PipSection.tsx` 中：它是 JS 层面对
一个上下文的遮蔽，不是浏览器策略。

### v9 如实说明的局限，汇总一处

| 项 | 局限（含其数字） |
| --- | --- |
| 1 · 躯体定位 | 放置是**在派生皮层带上的示意**，不是皮层图；探针残差 M1 ≤ 0.16 au / S1 ≤ 2.29 au；最差贴片边缘距离 3.05 au（3.67 mm）；标签只为悬停/选中的节段渲染 |
| 2 · 皮层分区 | **对派生皮层带的几何划分，不是脑回图或细胞构筑图**；13 个参考平面中有 3 个完全错过皮层带；岛叶在 13 个平面中的 7 个缺席，且绘制在界阈组织上，而不是岛叶皮层；limbic : rest 为 1 : 26.8，而文献为 1 : 8–1 : 20 |
| 3 · 影像配准 | 用户抱怨中的 CT 那一半是**经测量但未修复**的（在唯一可交付的相似变换下平均质心残差 18.09 → 20.39 au，因此什么都没应用）；MRI 同样 9.40 → 17.75 au；**76 张图版中有 52 张没有任何测量**（49 张 JPEG `no-decoder`，3 张 `not-fittable`）；被校正的 24 张是相对**合成图谱掩膜**校正的，不是标志点或体素配准 |
| 4 · 关闭影像 | 可见按钮文本是 "Simulated only"（四处精确文本调用点在本次运行范围之外）；至于画布在页面中只绘制模拟断面，那只能由浏览器观察 |
| 5 · 模拟切面面板 | 它**只显示模拟切面** —— 按设计与按需求，永远不显示真实影像；像素守卫是 JS 层面的遮蔽，不是浏览器策略；缩放器、跨重载的持久化以及屏幕上不存在任何平面辅助器都只能由浏览器观察；`audit-checks.test.mjs:1155` 仍带有退役背景的断言（它之所以通过，只是因为该移除在该文件中被*记录在案*）—— 见下文 |
| 所有项 | 纯浏览器的主张（叠加层、分区图层、校正后的照片、关闭影像的画布与缩放后的面板在页面中的观感与行为正确）**仅由编排器验证**；在 agent 沙箱中 Chrome 无法启动 |

<a id="verification-v9-close-out-non-browser"></a>

### 验证（v9 收尾，非浏览器）

| 门禁 | 结果 |
| --- | --- |
| `npm run validate` | **exit 0** —— 236 条注册表条目（0 条等待记录）· 17 个文件中的 213 条记录 · 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个层级 · 0 错误，0 警告 |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0**（`✓ built in 9.15s`） |
| `npm run verify:pipeline` | **exit 0** —— 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** —— 10,827 assertions |
| `npm run verify:somatotopy` | **exit 0** —— 45 passed / 0 failed |
| `npm run verify:cortical-lobes` | **exit 0** —— 200/200 assertions |
| `npm run verify:pip-contract` | **exit 0** —— 83 passed / 0 failed（并且其咬合检查在隔离副本中捕获 5/5 个变异） |
| `npm run verify:imaging-fit` | **exit 1 —— 在 agent 沙箱中未按断言运行**：已提交的门禁把拟合器作为管道子进程重跑（`spawnSync node EPERM`），在任何断言之前就停止。通过一份逐字节相同的副本、使用捕获到的拟合器 JSON 驱动它，它完成时有 **289 条断言与 20 处失败 = 18 个真实缺陷 + 2 个副本中 `HEAD` 路径的产物**：16 × 清单不携带 `registration.display.planes`（门禁会比较每一个重算出的平面），2 × `ubc-c13`/`ubc-c14` 交付的是 `3.108820`，而门禁构造出 `3.10882`（数字相等，字符串不同）。两个修复都在 `imaging-registration` 任务拥有的文件中。没有任何东西被糊过去：校正记录与门禁对已提交形状的看法不一致，而门禁照实说了 |
| `npm run verify:audit-checks` | **exit 1 —— 90 通过 / 1 失败 / 7 信息性**：*"rows dimmed at default framing"* 列出了 14 行 `vasc-*` —— 自 v8 起就存在（brainstem-focus 默认按设计隐藏血管，而该检查只豁免端脑），三个任务针对 stash 的 HEAD 文件复现了它 |
| `npm run verify:anatomy` | **在 agent 沙箱中无法运行** —— 在任何裁决打印*之前*就以 `spawnSync powershell EPERM`（errno −4048）退出 1；编排器在自己的环境中记录为 27/27 |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **仅编排器通道** —— Chrome 无法在沙箱中启动（exit 4，"no check was run"） |


内容任务留下的唯一一条警告（一个被有意搁置的
`src/data/structures-pending/vasculature.json`）已经**消失**：`vasculature` 区域现在在
`types.ts` / `load.ts` / `validate-data.mjs` 中是合法的，14 行注册表条目是从记录本身追加的
（因此注册表与记录无法漂移），该文件也已移入 `src/data/structures/`。

<a id="v10--plane-helper-extent-division-visibility-four-corner-pip-resize-cortical-division-quality-and-the-cortex-label"></a>

## v10 —— 平面辅助器范围、分区可见性、四角 PiP 缩放、皮层分区质量，以及皮层标签

规格：[`docs/SWARM_V10_PLAN.md`](docs/SWARM_V10_PLAN.md) —— **§8 是本轮的收尾**，本节中的每个数字都在那里由集成者自己的清扫重新测得（`npm run …`，逐门禁打印退出码）。
这五项都是用户自己提出的五份报告；每一项现在都有一个用户可见的控件或行为，**并且**有一个在回归时就会失败的已提交检查。

### 1. 平面辅助器覆盖端脑

`src/components/viewer3d/PlaneHelpers.tsx` 过去围绕脑干绘制**字面量**四边形：横断
`[96, 82]` → x ±48，z ±41；矢状 `[82, 100]` → z ±41，y −55…+45；冠状 `[96, 100]` → x ±48，y −55…+45。
对照 `CLIP_BOUNDS`（x[−58, 58] · y[−55, 116] · z[−76, 72]，唯一的运行时声明），这让两个
片在平面内 `y` 方向**比 y = +116 处的盒体顶点短 71.0 au = 85.2 mm** —— 即 **比皮层带实测顶端（+113.7）高 68.7 au = 82.4 mm** —— 而横断片在前方缺
**31.0 au**（z +41 → +72）、在后方缺 **35.0 au**（z −41 → −76）。

三个片现在都在**运行时由 `CLIP_BOUNDS` 派生**（代码中不存在任何范围字面量 —— 门禁会剥离注释与字符串并搜索剩余字面量），并以**恒定的约 4 au 单元格**而非固定线数划分网格：

| 轴（片） | 平面内矩形 | 四边形 W × H（au） | 网格单元数 | 单元大小（au） |
| --- | --- | --- | --- | --- |
| x —— 矢状 | z[−76.00, 72.00] × y[−55.00, 116.00] | 148.00 × 171.00 | 37 × 43 | 4.000 / 3.977 |
| z —— 冠状 | x[−58.00, 58.00] × y[−55.00, 116.00] | 116.00 × 171.00 | 29 × 43 | 4.000 / 3.977 |
| y —— 横断 | x[−58.00, 58.00] × z[−76.00, 72.00] | 116.00 × 148.00 | 29 × 37 | 4.000 / 4.000 |

颜色、不透明度、`renderOrder`（30/31）、关闭射线投射、组名与 `clip.showHelper` 门控均未改变，
并且每个几何仍只在模块加载时构建一次。`npm run verify:plane-helper-extent`（**196 条断言**）
执行已交付的渲染路径、遍历元素树、把四边形四角与每个网格顶点经由已交付的旋转
变换到 `CLIP_BOUNDS` 矩形上，并通过变异 `clipPlanes.ts` 的临时副本证明这一派生
（宽度 116→128 / 148→162，高度 148→162 / 171→185，单元 29→32 / 37→41 / 43→46），
同时已交付文件的 SHA-256 保持不变。

**如实说明的局限。** (a) 该网格是片自身局部坐标系中的 `LineSegments`，不是 `GridHelper`：three
0.169 的 `GridHelper(size, divisions)` 只接受**一个** divisions 值且始终是正方形，因此它无法以 au 恒定单元格跨越
116 × 171 au。(b) **辅助器在屏幕上是否真的覆盖皮层，无法从本环境证明** ——
在已交付的相机下，无论旧盒体还是新盒体，这些片在 1500 × 950 视口中投影都远在视口之外
（x 片 bbox y −794…9637 px 新 vs −452…1441 px 旧），因此“它看起来是对的”是一个
**浏览器**观察，由编排器的 `verify:audit` 从渲染场景判定，而不是这里作出的主张。

### 2. 分区级可见性（开/关 + solo）

Legend 既有的 *Layer toggles* 组新增了一个 **Divisions** 组：每个分区一行，各带一个真实的
`<input type="checkbox">`（开/关）与一个真实的 **Solo** 按钮（其余全部关闭）。按区域、按类型与
按调色板的开关均未改变，并且四个分区**划分**了 `ALL_REGIONS` 的全部七个区域
（在模块加载时断言，因此以后新增的区域不可能悄悄落在该控件之外）：

| 分区 | 它包含的区域 | 全新启动时 |
| --- | --- | --- |
| Prosencephalon (forebrain) | telencephalon + diencephalon | 已勾选 |
| Mesencephalon (midbrain) | midbrain | 已勾选 |
| Rhombencephalon (hindbrain) | pons + cerebellum + medulla | 已勾选 |
| Cerebral vasculature | vasculature（它自成一个系统 —— 从不被折进某个分区） | 未勾选（v8：动脉叠加层默认隐藏） |

由 `npm run verify:division-toggles`（**250 条断言**）测量，它通过一个进程内 TS/TSX 加载器导入*已交付的*
store，用 `react-dom` 渲染已交付的 Legend，并在隔离副本中驱动已交付的处理函数：`solo(prosencephalon)` ⇒ `[diencephalon, telencephalon]`、`solo(mesencephalon)` ⇒ `[midbrain]`、
`solo(rhombencephalon)` ⇒ `[cerebellum, medulla, pons]`、`solo(vasculature)` ⇒ `[vasculature]` —— 四种情况下
**其余每个区域都关闭**；复选框关闭一个完整分区、打开一个不完整分区（并集是幂等的，且精确恢复之前的集合）；kinds/hidden/emphasis 在每次调用后都集合相等；一个被变异的 `DIVISIONS` 表（把动脉折进后脑）会触发 store 自己的加载期断言。
默认未变：全新启动仍报告 **`brainstem-focus`**，`vasculature` 关闭，其余每个区域开启。

**如实说明的局限。** (a) **这是分类学区域之上的显示分组，不是新解剖** —— 每个分区恰好是上面所列区域图层的并集，因此 solo "Prosencephalon" 会一键显示端脑与间脑开关所显示的内容；它就是参考图里的胚胎学分组，仅此而已。
(b) 分区选择**有意不被持久化**（不存在任何存储键）：回访者不应启动进一棵七个区域中有六个看起来被关掉的树 —— 那正是 v7 审计的失败模式。
(c) Solo 只切换**区域**图层；默认预设的 `hidden` 集合（32 个端脑 id）未被触动，因此全新启动时 solo 之后，那些记录仍然隐藏，直到用户选择另一个预设。
(d) `TaxonomyTree.tsx` 被有意不修改 —— 树已经通过同一条 `layerOff()` 规则变暗。
(e) 复选框与 Solo 按钮会移动*实时场景*，这是一个浏览器观察（编排器通道）；本轮证明的是 store、渲染出的 DOM、无障碍名称与接线。

### 3. 模拟切面面板可从四角缩放

`SectionPip.tsx` 现在渲染**四个**把手 —— `se`（DOM 顺序中的第一个，保留浏览器通道聚焦的裸
`class="pip-resizer"`）、`nw`、`ne`、`sw` —— 每个都有 24 × 24 px 命中区、自己的
对角线光标，以及自己的无障碍名称（点名该角与实时尺寸）。拖动某个角会移动该角拥有的两条边；
尺寸仍会经过 store 自己的 `clampSectionPipSize`，因此没有任何东西能离开
**224×170 … 880×640 px**：

| 角 | +40/+40 | −400/−400（钳制后） | +5000/+5000（钳制后） | (+40, 0) | (0, +40) |
| --- | --- | --- | --- | --- | --- |
| nw | 360×260 | 800×640 | 224×170 | 360×300 | 400×260 |
| ne | 440×260 | 224×640 | 880×170 | 440×300 | 400×260 |
| sw | 360×340 | 800×170 | 224×640 | 360×300 | 400×340 |
| se | 440×340 | 224×170 | 880×640 | 440×300 | 400×340 |

在面板的局部坐标系 (0, 0)–(400, 300) 中，一次 +40/+40 拖动会让每个被拖动的角恰好落在
指针 + (40, 40) —— nw (40, 40)、ne (440, 40)、sw (40, 340)、se (440, 340) —— 而**对角**保持
两个坐标逐位相同（(400, 300)、(0, 300)、(400, 0)、(0, 0)）。单轴拖动会让另一轴
逐位相同，并且在钳制边界处对角仍被固定。键盘缩放（Arrow = 16 px、Shift = 4×）、小⇄大循环按钮、尺寸的 `aria-label` 以及浏览器通道读取的 DOM 契约都
未改变。`npm run verify:pip-contract` 从 83 条增长到 **187 条断言**；它的咬合那一半在隔离副本中重跑六个变异，
每一个都使它以 1 退出。

**如实说明的局限。** (a) **“对角保持不动”这条规则是缩放算术，并非在所有地方都是屏幕空间事实**：卡片以 CSS 停靠在右下，因此宽度变化*总是*移动面板左边缘，高度变化*总是*移动其上边缘 —— 用屏幕的话说，**NW** 是行为完全如描述的那一个角，而东南把手（其自身的角才是被钉住的那个）无法跟随指针。
`npm run verify:pip-contract` 断言该算术与停靠不变式；浏览器通道打印逐角的屏幕读数，而不是声称不可能的事。
(b) 尺寸**跨重载持久化**（`neuroaxis.sectionPipSize`，读取*与*写入时都钳制）—— 一次真实重载是否恢复它，是一个浏览器观察。
(c) 在实时页面中的方向键缩放同样只能由浏览器观察。

### 4. 皮层分区质量 —— 细条与三角形消失了

错误的楔形是**分区自身的几何**造成的，而不是皮层带的：一条 run 是一个轮廓环上
带同一种分类的连续区段，因此一条以浅角度穿过皮层带的拟合边界会产生
2–4 个顶点的 run，而一条细长的 run 仍可能几乎不围出任何面积。修复是一条有文档记载的 **run 质量规则**
（`src/components/section/corticalLobes.ts`，文件头 + 常量）：

- `MIN_DIVISION_RUN_AU = 10`（自身顶点的**弧长**下限，12 mm）、`MIN_DIVISION_AREA_AU2 = 25`（画布所填充多边形的**实际绘制**鞋带面积）、
  `MIN_DIVISION_LABEL_AREA_AU2 = 25` —— 有意与绘制下限相等，因此*被绘制 ⇒ 存在一个可承载标签的 run* 是一条被断言的不等式，而不是一种期望。
- 分割器旋转一个闭合环使其从分区变化处开始（一段跨界的区段算作**一条** run），把
  每个低于阈值的区段并入其邻居**直到不动点**，并丢弃化简为单个
  低于阈值区段的环（它保留 context 填充）。v10 之前那个会产生**弧长 0.00 au** 的 1 顶点 run 的差一错误已经消失。
- 分区标签现在按**绘制面积**竞争，而不是按顶点数，并且每个分区在每个平面上最多绘制一次 —— 这正是让 "TEMPORAL" 从一个 5.5 au² 的细长楔形上消失的原因。

在 13 个参考平面上测得（`npm run verify:cortical-lobes`，**519/519 条断言**，它会打印
完整的逐平面逐分区表）：**80 → 47 条被绘制的 run**，22 个原始区段被吸收，3 个整环被丢弃
（32 个顶点，每一个都低于阈值，≤ 23.87 au²），并且低于任一阈值的被绘制 run **为零** ——
`arc < 2 / < 5 / < 10` = 0，`area < 1 / < 10` = 0，1 顶点 run = 0，对每个分区都成立。对相同平面的独立原始
重切保持 **72 个原始区段，其中 23 个低于阈值**（最短：弧长 0.00 au，一个顶点），
因此起作用的是这条规则，而不是分类器。在 34 个平面的用户网格上：**548 → 265 条 run**，199 个被吸收，
33 个环被丢弃，**174 个标签**，0 个被绘制的分区没有可承载标签的 run。

**如实说明的局限。** (a) **它划分的是派生皮层带，不是脑回图** —— 没有追踪任何沟底、Brodmann 区或
展开图边界；这一告诫写在文件头、图例以及这里。v10 中**拟合边界常量没有任何移动**：
楔形来自 run 规则，拟合是被重新检查，而不是重新拟合。
(b) 吸收会用**邻居**的分区重新标注被吸收的区段，因此在边界以浅角度穿过的地方，颜色沿 10–25 au 的轮廓属于邻居。
(c) 整个环若是单个低于阈值的区段，则完全不绘制（实测：13 个参考平面中的 3 个，49 个用户网格平面中的 33 个）—— 该图层绘制的是领地，不是碎片。
(d) 三个参考平面 y = −46、−24、−8 **完全错过皮层带**，不带任何分区；派生壳**没有岛叶表面**，因此岛叶仍绘制可用的最深界阈组织。
(e) 已知且未被断言：在 218 个平面 × 两条皮层带上，追踪到 **6 个案例**，其中一次吸收压缩了某区段的面积，随后的一次遍历把它吸收进*另一个*分区，于是一个已越过两个阈值的体被绘制成它的邻居 —— 这是已交付规则的局限，被报告而不是被隐藏。
(f) 已提交的门禁只切 `ctx-hemisphere-l`，而画布绘制**两条**皮层带，因此门禁的逐平面 run 计数是下界（在 y=0 处：门禁 3 条 run / 3 个分区，两条皮层带 6 条 run / 4 个分区）。

### 5. 皮层标签被移除，轮廓保留

`NO_CANVAS_LABEL_RECORD_IDS = {ctx-cerebral-cortex}` 门控**两个**画布标签位点（选中标签与
悬停标签）以及 `.section-structure-chip`，因此 *"Cerebral cortex (context envelope)"* 不再出现在
2D 实时断面画布、Plates 标签页或模拟切面面板中（后者挂载同一组件）—— 并且它离开了画布的无障碍子树，而不只是被覆盖绘制。该记录的**轮廓与填充未受触动**（`drawPart`），也没有过滤任何其他 context 标签：**存在 45 条 context 记录，44 条保留其画布标签**（丘脑外廓、层片与分区标签都仍在标注）。由一次真实的 `react-dom` 渲染证明：皮层被选中 ⇒ 层片标记为 `""`；丘脑外廓被选中 ⇒ 层片渲染。

**如实说明的局限。** *画布*标签消失了，但同一屏幕上其他位置仍存在这个确切的字符串，并且它是**被记录、而不是被隐藏**的：信息栏与分类学树会宣告该记录名，`PlateRenderer` 注入一个携带它的 `<svg><title>`，而三张作者撰写的端脑图版 SVG 绘制它们**自己**手写的皮层标签（`plate-tel-axial-58.svg` 的 *"cerebral cortex (cortical ribbon)"*、`plate-tel-coronal-fornix.svg` 的
*"(envelope)"*、`plate-tel-sagittal-hemisphere.svg` 的 *"(medial surface)"*）。那些图版产物在本轮中位于每个任务的写入范围之外。

### v10 如实说明的局限，汇总一处

| 项 | 局限（含其数字） |
| --- | --- |
| 1 · 平面辅助器 | 网格是 `LineSegments`，不是 `GridHelper`（three 的 `GridHelper` 是正方形、只接受一个 divisions 值）—— 间距与材质相同。屏幕上 43 条线的覆盖与可读性**只能由浏览器观察**；在已交付的相机下，无论旧盒体还是新盒体，这些片在 1500 × 950 视口中投影都远在视口之外（`y −794…9637 px` vs `−452…1441 px`），因此范围主张立足于 `verify:plane-helper-extent`，而不是像素 |
| 2 · 分区可见性 | 一个**分类学区域之上的显示分组**（Prosencephalon = telencephalon + diencephalon；Mesencephalon = midbrain；Rhombencephalon = pons + cerebellum + medulla；Cerebral vasculature = vasculature，自成一个系统）—— 不是新解剖。按设计不持久化。Solo 只切换区域图层，因此默认预设隐藏的 32 个端脑 id 仍然隐藏。它会重绘实时场景这一点只能由浏览器观察 |
| 3 · 四角缩放 | “对角固定”这条规则是**面板局部坐标系中的缩放算术**；在屏幕上卡片停靠在右/下，因此宽度变化总是移动左边缘、高度变化总是移动上边缘 —— NW 是符合那句话的角，而 SE 把手无法跟随指针。读取与写入时都钳制在 **224×170…880×640 px**。真实指针拖动、方向键与跨重载持久化只能由浏览器观察 |
| 4 · 皮层分区 | **拟合到派生皮层带，不是脑回图**；v10 中拟合常量未变（修复的是 run 规则：弧长 ≥ 10 au、绘制面积 ≥ 25 au²、标签面积 ≥ 25 au²）。吸收可能用邻居的分区重新标注 10–25 au 的轮廓；整个低于阈值的环在 3/13 个参考平面与 33/49 个用户网格平面上不被绘制；**6 个实测案例**把一个已越过阈值的体绘制成其邻居，而已提交的门禁对此类情形不作任何断言；门禁切一条皮层带，而画布绘制两条 |
| 5 · 皮层标签 | 画布文本被抑制（45 条 context 记录：1 条被抑制，44 条保留）并离开画布的无障碍子树 —— 但该确切记录名仍通过信息栏、分类学树与 `PlateRenderer` 注入的 `<title>` 到达应用的无障碍树，并且三张作者撰写的图版 SVG 绘制它们自己的皮层标签 |
| 所有项 | 每一项渲染像素的主张（**辅助器覆盖皮层、solo 重绘、一次真实的四角拖动、分区图层在 Plates *与* PiP 中的产物平面、屏幕上标签缺席**）都**仅由编排器验证**：Chrome 无法在 agent 沙箱中启动，每个浏览器通道都以 4 退出，并显示 "no check was run" |

<a id="verification-v10-close-out-non-browser"></a>

### 验证（v10 收尾，非浏览器）

| 门禁 | 结果 |
| --- | --- |
| `npm run validate` | **exit 0** —— 0 errors / 0 warnings · 236 条注册表条目（0 条等待记录）· 17 个文件 / 213 条记录 · 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个层级 |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0**（`✓ built in 10.88s`） |
| `npm run verify:pipeline` | **exit 0** —— 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** —— 10,827 assertions |
| `npm run verify:plane-helper-extent` | **exit 0（新门禁）** —— 196 passed · 0 failed |
| `npm run verify:somatotopy` | **exit 0** —— 45 passed / 0 failed |
| `npm run verify:cortical-lobes` | **exit 0** —— 519/519 条断言（打印逐平面逐分区弧长表与零细条普查） |
| `npm run verify:pip-contract` | **exit 0** —— 187 passed / 0 failed（原为 83；新的 F 组覆盖四个角、逐角几何与样式表，并且 6/6 个变异在隔离副本中被捕获） |
| `npm run verify:division-toggles` | **exit 0（新门禁）** —— 250 passed · 0 failed |
| `npm run verify:audit-checks` | **exit 0** —— 92 passed · 0 failed · 7 informational · 9 groups。**现在是绿的**：v9 收尾说明称该门禁是红的，而当时失败的检查（变暗行谓词）带有来自 `f5d3ed2` 的有文档记载的血管豁免**外加第二条钉住它的断言** —— *"the 14 vascular rows are off at default framing through the REGION layer only (none structure-hidden, the vessel kind layer stays on, so switching the region reveals them)"* |
| `npm run verify:closure-bite` | **exit 0** —— 7/7 变异被捕获，共享树逐字节一致，恢复后的副本重跑 92/0。**现在是绿的**，因为它未变异的参照运行（`verify:audit-checks`）是绿的 |
| `npm run verify:boundary-contract` | **exit 0** —— 22 passed / 0 failed |
| `npm run verify:a11y-contract` | **exit 0** —— 38 passed / 0 failed |
| `npm run verify:budget-report` | **exit 0** —— 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB，全部在上限之内 |
| `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | **exit 0** —— 82 个文件共 9.02 MiB（上限 10）· v4 新增 3.81 MiB（上限 4）· 22 张冷冻切片 −52.20 … 34.04 au |
| `npm run verify:anatomy` | **exit 1 —— 是环境问题，不是产品问题**：在任何裁决打印之前 `spawnSync powershell EPERM`（该门禁通过管道传递子进程的 stdio，而本沙箱拒绝这样做）。在基线即为红，不在任何 v10 任务范围内；编排器在自己的环境中记录为 27/27 |
| `npm run verify:imaging-fit` | **exit 1 —— 是环境问题，不是产品问题**：`FAIL the fitter could not be re-run: spawnSync node EPERM`（0 条断言运行）。基线即为红，本轮未改变 —— 上文 v9 一节记录了该门禁在*能*运行时说了什么 |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **仅编排器通道** —— `verify:audit` 在这里运行其非浏览器那一半（它打印 `v10 source facts: CLIP_BOUNDS x[-58, 58] y[-55, 116] z[-76, 72] · declaration sites 1 · grid cell 4 au · division floors 10 au / 25 au2 (label 25 au2) · PiP clamp 224x170…880x640 px · suppressed canvas label ids [ctx-cerebral-cortex]`），然后在浏览器那一半**以 4 退出**：Chrome 死在 `mojo::PlatformChannel`（`OpenProcess: Access is denied (0x5)`） |

v10 没有新增、重命名或移动任何内容记录：`npm run validate` 报告的清单与 v9 相同（236 / 213 / 23 / 26 /
15 / 17）—— 本轮只涉及显示、控件与规则。

<a id="v11--the-areas--systems-toggle-rows-replace-the-view-preset-row"></a>

## v11 —— Areas + Systems 开关行取代视图预设行

规格：[`docs/SWARM_V11_PLAN.md`](docs/SWARM_V11_PLAN.md) —— **§7 是本轮的收尾**，本节中的每个数字都在那里由集成者自己的清扫重新测得（`npm run …`，逐门禁退出码）。诉求是
“*不要用 'brainstem focus' 这类分区，而要用端脑、中脑这样的大类别……并把它们做成开关按钮，让用户可以开关脑区（关闭时从 3D/2D 断面视图中排除）*”，外加
“*另一条正交的轴是血管、核团、纤维束（同样可以开关），这你基本上已经有了*”。它是数据切片、控件与规则 —— **没有移动任何内容记录、网格、层级、图版或综合征**
（`npm run validate`：同样的 236 条注册表条目 · 213 条记录 · 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个
层级，0 错误 / 0 警告）。

### 1. 两行开关，以及预设行去了哪里

页眉的第一行控件现在是 **Areas**，其后是 **Systems**；每个按钮都是真实的
`<button type="button">`，带 `aria-pressed`、一个以可见文本为前缀的无障碍名称（WCAG 2.5.3），
以及一个稳定的机器钩子供浏览器通道使用（`data-area` / `data-kind`）—— 而且因为它们是真实按钮，
所以按构造就是可聚焦、可键盘操作的，浏览器通道用一次真实的空格键按下确认了这一点
（该检查被写成会失败，而不是被跳过）。

| **Areas** 行（`data-area`） | 它拥有的区域 | 分类学行数 | v10 分区（`data-division`） | 全新启动时 |
| --- | --- | --- | --- | --- |
| Telencephalon | telencephalon | 85 | prosencephalon | on |
| Diencephalon | diencephalon | 39 | prosencephalon | on |
| Mesencephalon (midbrain) | midbrain | 25 | mesencephalon | on |
| Metencephalon (pons + cerebellum) | pons + cerebellum | 40 | rhombencephalon | on |
| Myelencephalon (medulla) | medulla | 33 | rhombencephalon | on |
| Cerebral vasculature | vasculature | 14 | vasculature | **off**（v8：动脉叠加层默认关闭） |
| **Σ** | **7 个区域，每个都恰好被拥有一次** | **236 = 每一条分类学条目** | — | 按下状态行 `[true,true,true,true,true,false]` |

| **Systems** 行（`data-kind`） | 分类学行数 | 全新启动时 |
| --- | --- | --- |
| Nuclei · Tracts · Ventricles · Surface · Vessels · Context | 88 · 53 · 11 · 25 · 14 · 45 = **236** | 六个全部 **on** |

这一划分是**派生并断言的，不是手打的**：Areas 表由 v10 的 `DIVISIONS` 计算得出
（`metencephalon` = rhombencephalon 减去 medulla，`myelencephalon` = medulla），并且如果任何区域被声明两次、无人声明，或由一个其声明的分区与之不一致的 area 声明，store 会**在模块加载时**抛出 —— 在 Node 中*与*浏览器中都是如此。Systems 行是按顺序映射的 `ALL_KINDS`，因此按构造它就穷尽了所有 kind。`npm run verify:area-toggles`（**331 条断言，0 失败**）导入已交付的 store 与
已交付的 `Header`，驱动真实的 `onClick` 处理函数，用 `react-dom` 渲染页眉，打印上面两张表，并作咬合测试：一个被变异的 area 表（区域被移动、区域被共享、area 被丢弃、辅助函数被破坏）
会让一条具名检查失败，而两个加载期变异会让 store 本身以 1 退出并点名该缺陷。

**对用户而言究竟变了什么。** **预设行没有被删除 —— 它移动了**：它仍在页眉中，
现在是 **Areas 与 Systems 下方的快捷行**（呈现顺序 0/1/2；DOM 顺序被有意做成预设优先，以便既有的默认取景断言仍指向同一批按钮）。**Reset** 与 **All**
位于该行末尾：Reset 调用 store 既有的默认值（`applyViewPreset('brainstem-focus')`），
All 通过预设表解析，因此“默认取景”只有**一个**定义 ——
v7 的 *Brainstem focus* 默认值、它隐藏的 32 个皮层预设 id、关闭的 vasculature 区域与全部六个打开的 kind 都
未改变，且 `viewPresetOf(DEFAULT_LAYERS)` 仍是 `brainstem-focus`（在未改动的
`verify:audit-checks` 镜像中、以及新门禁自己的 §5–§6 中被断言）。Legend 保留每一个按区域、
按类型与按分区的控件，其分区行现在会点名它们所对应的页眉 area；分类学树通过同样的图层集合变暗，因此树与这些行永远不会不一致。

### 2. 一个可见性决策 —— 3D 场景、实时断面与 PiP 一致

这些行的要点在于**关闭就是在所有地方都关闭**。在 v11 之前，有一条路径绕过了图层集合：
`buildLobeLayer`（皮层分区过程）之所以正确，只是因为它的输入恰好被预先过滤过。
它现在重新施加同一个门控，而检查逐情形清扫两个呈现面
（`npm run verify:view-filter-consistency`，**100/100**）：

| 清扫了什么 | 结果 |
| --- | --- |
| **2D 画布 + PiP** —— 138 个断面部件 × 4 种状态（on+on / kind-off / area-off / both-off） | on+on **138/138 被绘制**；kind-off **138 隐藏**；area-off **138 隐藏**；both-off **138 隐藏**；没有区域的部件（**静默绕过类**）**0 / 138** |
| **3D** —— 同样 4 种状态经由 `layersAdmit` | 与 2D 决策之间 **552 次比较 · 0 处分歧** |
| **每一个 3D 过程** —— 213 条结构记录、23 条纤维束、10 个外廓槽位、2 个幽灵壳 | area off ⇒ **全部隐藏**；kind off ⇒ **全部隐藏**；both off ⇒ **全部隐藏**；**违规 0** |
| **按分类学 id 的跨呈现面连接** —— 138 个部件中的 137 个 | **548 次比较 · 0 处分歧** |
| **皮层分区过程被执行** —— 跨两个已提交皮层带 GLB，5 个平面 × 2 条皮层带 | 一致性 **5/5**；area off ⇒ **0 条皮层带 / 0 个被绘制的分区**，即使使用未过滤的目录 |

按 area，各呈现面隐藏了什么（隐藏/拥有的 2D 部件 · 隐藏/拥有的 3D 绘制记录）：diencephalon 33/33 ·
38/38 —— telencephalon 28/28 · 57/57 —— midbrain 14/14 · 21/21 —— pons 17/17 · 27/27 —— medulla 14/14 · 27/27 ——
cerebellum 6/6 · 5/5 —— vasculature 26/26 · 14/14。按 system：nucleus 81/81 · 84/84 —— context 17/17 · 44/44 ——
tract 7/7 · 24/24（+23 条纤维束管道）—— ventricle 7/7 · 6/6 —— surface 0/0 · 17/17 —— vessel 26/26 · 14/14。

该检查不是装饰性的：该过程确实构建了 **75 个 `Path2D`（75 个 `moveTo` · 2233 个 `lineTo` · 75 个
`closePath`）**，而在临时副本中移除画布的门控后，变异体在端脑关闭时绘制 **5 个分区**，而已交付代码绘制 **0 个**。`SectionCanvas.tsx` 的 SHA-256 前后打印一致。

### 3. 两处 v10 遗留缺陷 —— 已了结

**(a) 皮层分区规则 vs 画布实际绘制的内容（§3 第 4 项）。** v10 审计读到“在该规则预期 4–6 个被绘制分区的平面上，画布绘制了 **NONE**”（y=6 图例 `[]` vs 规则的五个；y=14 `[]`
vs 全部六个）。实测原因是**皮层带覆盖，而不是规则分歧**：画布绘制**两条**
皮层带，而门禁的逐平面表只切了**左侧**那条。逐参考平面
（`npm run verify:cortical-lobes`，**564/564**，打印两列，并且审计自己的表被核对
**6/6** 行）：

| 平面 | 规则，仅左侧皮层带 | 规则，两条皮层带 = 画布所绘制的 | 只有右侧皮层带补充的 |
| --- | --- | --- | --- |
| y=0 | temporal · occipital · limbic | **parietal** · temporal · occipital · limbic | parietal |
| **y=14** | frontal · temporal · occipital · insula | frontal · **parietal** · temporal · occipital · insula · **limbic** | parietal · limbic |
| y=30 | frontal · parietal · temporal · occipital | *完全相同* | — |
| y=48 | frontal · parietal · temporal · occipital · limbic | *完全相同* | — |
| y=58 | frontal · parietal · occipital | frontal · parietal · occipital · **limbic** | limbic |
| y=68 | frontal · parietal | *完全相同* | — |
| y=78 | frontal | *完全相同* | — |
| x=6 | frontal · parietal · occipital | *完全相同* | — |
| z=0 | frontal · temporal · limbic | *完全相同* | — |
| z=40 | frontal · parietal | *完全相同* | — |
| y=−46 / −24 / −8 | `[]` | `[]`（这些平面完全错过皮层带） | — |

**13 个参考平面中有 3 个**带有只有右侧皮层带才绘制的分区，而画布现在消费的是
Node 门禁所执行的**同一**分割器 + 阈值（`corticalRunsForLoop`；run ≥ 10 au、绘制面积 ≥ 25 au²、
标签 ≥ 25 au²，全部从 `corticalLobes.ts` 读取）。浏览器通道不再硬编码期望集合：
它在审计运行时跨两条皮层带重新推导它，并把旧表作为打印的交叉检查保留。

**(b) 矢状平面辅助器的 `u/v` 约定（§3 第 1 项）。** v10 审计测得矢状辅助器四边形
为 **148 × 171 au**，而它自己在平面内的 `CLIP_BOUNDS` 矩形为 **171 × 148**。算术给出了结论：
`AXIS_PAIR.x = [z, y]`，因此 `u = z` → 72 − (−76) = **148**、`v = y` → 116 − (−55) = **171** —— **已交付的
四边形是对的**，而审计的 `['x','y','z'].filter(c => c !== axis)` 是**轴*名称*升序**
（`['y','z']` → 171 × 148），没有任何单一置换能对三个平面同时匹配。被修的是**审计**：
它从已交付的 `planeGeometry.ts` 读取有序对并在自己的运行中打印它
（`AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]}`），手打的 `AXIS_INDEX` 表已删除；
`npm run verify:plane-helper-extent`（**206/0**）现在报告 *"ascending-name in-plane derivation absent ·
reads AXIS_PAIR yes"*。`PlaneHelpers.tsx` 本身未变（有一条注释记录该约定）。

**(c) 本轮发现、不在任务书中的问题：冠状平面坐标系。** `planePointToCanonical` 把冠状
轴送进了横断分支，因此每个冠状断面都在错误的规范坐标上被分类。
在左侧皮层带上实测，前 → 后：**z=0** `[parietal temporal limbic]` → `[frontal temporal insula
limbic]`；**z=30** `[insula parietal]` → `[temporal insula frontal parietal]`；**z=40** `[parietal limbic]` →
`[frontal parietal]`；**z=−30** `[parietal temporal limbic]` → `[frontal temporal]`。坐标系现在是
三个轴统一的 `[u, v, planeValue]`，两个门禁都逐轴断言它。

### v11 如实说明的局限，汇总一处

| 项 | 局限（含其数字） |
| --- | --- |
| 1 · Areas 行 | 六个 area 是**分类学区域之上的显示分组**，不是新解剖，也不是新分类学：每个按钮恰好是上表所列区域图层的并集（`Metencephalon` = pons + cerebellum；`Myelencephalon` = medulla），即参考图的胚胎学脑泡加上动脉系统，一键完成。以后加入分类学的区域**不可能**被遗漏 —— store 的加载期断言会抛出 —— 并且只有当它拥有的*每一个*区域都打开时按钮才读作 "on"（部分打开的 area 读作未按下；不存在第三种状态） |
| 2 · Systems 行 | 这条正交轴恰好是应用**早已拥有**的 **`kind` 轴**（`ALL_KINDS`：nucleus · tract · ventricle · surface · vessel · context）—— 不是新的分组，也不等同于 v10 的分区。实测后果：**存在 25 条 `surface` 记录，但只有 17 条有 3D 实体、0 条有断面部件**，因此关闭 Surface 会改变 3D 视图，而断面中什么都不变；26 个 vessel *部件*由 `taxonomyKind` 门控，而不是由它们的绘制桶门控 |
| 3 · 预设行 | 该行是**被降级，而不是被删除**（它是两行新控件下方的快捷行）—— 有文档记载的默认取景仍可达、仍被断言。`Cortex only` 保持其 v7 含义，且不是页眉开关。**有两个页眉按钮恰好读作 "Nuclei"**（预设与系统开关），两个读作 "All"（预设与动作）；二者都挂了机器钩子，并且一旦出现*未挂钩子*的重复项，新的契约检查就会失败 |
| 4 · 一个决策，一条轴 | 3D 呈现面还遵守 v7 预设的**结构级 `hidden` 集合**（*Brainstem focus* 下有 28 条记录），而 2D 断面不遵守。那是**另一条**轴，被测量并打印（门禁通道 C2），有意**不**与 area/kind 决策合并。有四个断面部件没有自己的 3D 实体（`ctx-caudate-l/-r`、`ctx-choroid-plexus-l/-r`），另有一个部件（`ctx-pineal`）没有分类学条目，因此跨呈现面连接是 **138 个部件中的 137 个**，不是 138 |
| 5 · 皮层分区 | **拟合到派生皮层带，不是脑回图** —— 没有追踪任何沟底、Brodmann 区或展开图边界；这一告诫写在文件头、图例以及 [v10 局限](#v10--plane-helper-extent-division-visibility-four-corner-pip-resize-cortical-division-quality-and-the-cortex-label)中。v11 **没有改动任何拟合常量**：它统一了*规则*、修好了冠状平面坐标系，并用上面的双皮层带测量取代了单皮层带的读法 |
| 6 · 主张档位 | 每一项渲染像素的主张 —— **这两行出现在屏幕上、一次开关重绘 3D 场景 / Plates 画布 / PiP、真实的指针与键盘激活，以及 v10 审计的 14 处失败现在是否消失** —— 都**仅由编排器验证**：Chrome 无法在 agent 沙箱中启动，每个浏览器通道都以 **4** 退出（"no check was run"）。本节的数字是 store、渲染出的 DOM 契约、已接线的处理函数与已执行的绘制路径 |

<a id="verification-v11-close-out-non-browser"></a>

### 验证（v11 收尾，非浏览器）

| 门禁 | 结果 |
| --- | --- |
| `npm run validate` | **exit 0** —— 0 errors / 0 warnings · 236 条注册表条目（0 条等待记录）· 17 个文件 / 213 条记录 · 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个层级 |
| `npm run check` | **exit 0** |
| `npm run build` | **exit 0**（`✓ built in 9.40s`） |
| `npm run verify:pipeline` | **exit 0** —— 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` | **exit 0** —— 10,827 assertions |
| `npm run verify:area-toggles` | **exit 0（新门禁）** —— 331 passed · 0 failed，并打印两张划分表 |
| `npm run verify:view-filter-consistency` | **exit 0（新门禁）** —— 100/100 条断言，548 + 552 次跨呈现面比较，0 处分歧 |
| `npm run verify:cortical-lobes` | **exit 0** —— **564/564** 条断言（打印双皮层带表与审计核对） |
| `npm run verify:plane-helper-extent` | **exit 0** —— 206 passed · 0 failed（通道 A2 了结了 `u/v` 约定） |
| `npm run verify:division-toggles` | **exit 0** —— 250 passed · 0 failed |
| `npm run verify:somatotopy` / `verify:pip-contract` | **exit 0** —— 45/0 · 187/0 |
| `npm run verify:audit-checks` | **exit 0** —— 92 passed · 0 failed · 7 informational · 9 groups（默认取景镜像在 v11 中逐字节未变） |
| `npm run verify:closure-bite` | **exit 0** —— 7/7 变异被捕获，共享树逐字节一致，恢复后的副本重跑 92/0 |
| `npm run verify:boundary-contract` / `verify:a11y-contract` | **exit 0** —— 22/0 · 38/0（a11y 门禁在 `build` 之后重跑，因此其已交付包的抽查确实运行了） |
| `npm run verify:budget-report` | **exit 0** —— 599,204 tris · GLB 13.82 MiB · imaging 9.02 MiB，全部在上限之内 |
| `npm run verify:anatomy` | **exit 1 —— 是环境问题，不是产品问题**：在任何裁决打印之前 `spawnSync powershell EPERM`。基线即为红，不在任何 v11 任务范围内 |
| `npm run verify:imaging-fit` | **exit 1 —— 是环境问题，不是产品问题**：`FAIL the fitter could not be re-run: spawnSync node EPERM`（0 条断言运行） |
| `npm run verify:audit` | **exit 4 —— 仅编排器通道** —— 它在这里打印其非浏览器那一半（`v11 source facts: AREAS telencephalon→[telencephalon] · … · ALL_KINDS nucleus, tract, ventricle, surface, vessel, context · AXIS_PAIR {"y":["x","z"],"x":["z","y"],"z":["x","y"]} · AXIS_INDEX {"x":0,"y":1,"z":2}`），然后 Chrome 死在 `mojo::PlatformChannel`（`OpenProcess: Access is denied (0x5)`） |
| `verify:acceptance` / `verify:browser` | **未运行，也未主张** |

v10 那轮记录的 **14 处 `verify:audit` 失败**（`202 passed / 14 failed`）在[计划的 §7.4](docs/SWARM_V11_PLAN.md) 中逐类作了交代：第 1 项的约定在审计侧修复；第 4 项的分歧随上面的双皮层带数字一并退役；审计侧的运行末形状读取未被 v11 改变，仍由编排器验证。为了让某处失败消失，没有任何东西被删除或被削弱。

<a id="v13--the-cranial-nerves-the-seventh-system"></a>

## v13 —— 脑神经，第七个系统

计划与收尾：[`docs/SWARM_V13_PLAN.md`](docs/SWARM_V13_PLAN.md)（该轮的可执行契约是
[`PLAN.md`](PLAN.md)）。下面每个数字都由集成者自己的非浏览器清扫逐门禁打印；
带退出码的完整表在该文件的 §9 中。

诉求是给 Systems 行加一个 **Cranial nerves** 切片 —— 这意味着**先创建这个数据切片，因为它并不存在**：分类学中已有脑神经*核团*（`Cranial nerve nuclei` 下的 17 行）与*出脑标志*（`surf-cn3-exit` … `surf-cn12-exit`），但从未把这十二对神经作为记录，也没有可供切片的 kind。交付了两样东西：第七个 **kind** `nerve`，以及**十二条记录**。

### 1. 十二条记录，以及每一条住在哪里

每对神经一条记录，放在其**真实区域**（分类学是权威）下，统一使用同一个细分名
**`Cranial nerves`**，因此十二对会在树中各自的区域内聚成一组。`course` 是承载
脑池段走行**以及颅底孔**的那一个字符串；`connections` **链接已经存在的 id**，而不是转述它们。

| # | 记录 | 区域 | 走行 → 孔 | 它链接的核团 / id | 几何 |
| --- | --- | --- | --- | --- | --- |
| I | `nrv-cn1-olfactory` — CN I Olfactory nerve 嗅神经 | telencephalon | 嗅丝 → **筛板（cribriform plate）** | `nuc-amygdala`、`nuc-hippocampus`、`nuc-md` | 示意性标记，`meshes:false` |
| II | `nrv-cn2-optic` — CN II Optic nerve 视神经 | telencephalon | 视神经管（optic canal） | `tract-optic-nerve`、`ctx-optic-chiasm`、`tract-optic-tract`、`nuc-lgn`、`nuc-pretectal`、`nuc-suprachiasmatic` | 示意性标记，`meshes:false`（v8 的视路**网格**属于那三条记录，不属于这一条） |
| III | `nrv-cn3-oculomotor` — CN III Oculomotor nerve 动眼神经 | midbrain | 脚间池 → **眶上裂（superior orbital fissure）** | `nuc-oculomotor`、`nuc-edinger-westphal`、`nuc-pprf`、`nuc-pretectal` | 示意性标记，`meshes:false` |
| IV | `nrv-cn4-trochlear` — CN IV Trochlear nerve 滑车神经 | midbrain | 下丘下方的背侧出脑 → **眶上裂** | `nuc-trochlear`、`nuc-pprf`、`nuc-mesencephalic-v` | 示意性标记，`meshes:false` |
| V | `nrv-cn5-trigeminal` — CN V Trigeminal nerve 三叉神经 | pons | 脑桥前池 → **卵圆孔（foramen ovale）**（V3；V1/V2 为眶上裂 / 圆孔） | `nuc-trigeminal-motor`、`nuc-principal-sensory-v`、`nuc-mesencephalic-v`、`tract-mesencephalic-v`、`nuc-spinal-trigeminal`、`nuc-vpm` | 示意性标记，`meshes:false` |
| VI | `nrv-cn6-abducens` — CN VI Abducens nerve 展神经 | pons | 脑桥前池、**Dorello 管** → **眶上裂** | `nuc-abducens`、`nuc-oculomotor`、`nuc-pprf`、`nuc-vestibular-medial` | 示意性标记，`meshes:false` |
| VII | `nrv-cn7-facial` — CN VII Facial nerve 面神经 | pons | 桥小脑角 → **内耳道（internal acoustic meatus）**，然后茎乳孔 | `nuc-facial`、`nuc-superior-salivatory`、`nuc-solitarius-rostral`、`nuc-spinal-trigeminal`、`nuc-vpm` | 示意性标记，`meshes:false` |
| VIII | `nrv-cn8-vestibulocochlear` — CN VIII Vestibulocochlear nerve 前庭蜗神经 | pons | 桥小脑角 → **内耳道** | `nuc-vestibular-superior/-medial/-lateral/-inferior`、`nuc-cochlear-ventral/-dorsal`、`nuc-superior-olivary`、`nuc-inferior-colliculus`、`nuc-mgn` | 示意性标记，`meshes:false` |
| IX | `nrv-cn9-glossopharyngeal` — CN IX Glossopharyngeal nerve 舌咽神经 | medulla | 橄榄后沟 → **颈静脉孔（jugular foramen）** | `nuc-ambiguus`、`nuc-solitarius-caudal`、`nuc-solitarius-rostral`、`nuc-dmv`、`nuc-spinal-trigeminal` | 示意性标记，`meshes:false` |
| X | `nrv-cn10-vagus` — CN X Vagus nerve 迷走神经 | medulla | 橄榄后沟 → **颈静脉孔** | `nuc-dmv`、`nuc-ambiguus`、`nuc-solitarius-caudal`、`nuc-solitarius-rostral` | 示意性标记，`meshes:false` |
| XI | `nrv-cn11-accessory` — CN XI Accessory nerve 副神经 | medulla | 来自橄榄后沟的颅根 → **颈静脉孔**，另有一个已陈述的脊髓起源 | `nuc-ambiguus` | 示意性标记，`meshes:false` |
| XII | `nrv-cn12-hypoglossal` — CN XII Hypoglossal nerve 舌下神经 | medulla | 橄榄前沟 → **舌下神经管（hypoglossal canal）** | `nuc-hypoglossal`、`nuc-medullary-reticular`、`nuc-inferior-olive-principal`、`nuc-solitarius-caudal` | 示意性标记，`meshes:false` |

由 `npm run verify:cranial-nerves` 测得（**451 条断言 · 0 失败**）：12 行注册表条目与 12 条 kind 为 `nerve` 的作者撰写记录，编号 I…XII 各恰好一次，区域为 medulla 4 · pons 4 · midbrain 2 ·
telencephalon 2，**24** 个层级锚点引用全部可解析，记录内有 **131** 个 id token、**0** 个无法解析（其中 **56** 个是核团/纤维束记录），**50** 条临床条目（每对神经 ≥ 2，多数 4–5），**13,465**
个内容词，并且 **12/12** 条记录都有精选的网络参考文献。CN II 有意放在 `telencephalon`：v8 的三条已提交视路行就在那里，因此注册表对“视神经属于哪个区域”只保留**一个**答案。

### 2. 第七个 kind —— `nerve` 契约

| 位置 | 它现在是什么 |
| --- | --- |
| `src/types.ts` `Kind` · `src/data/load.ts` `ALL_KINDS` · `scripts/validate-data.mjs` `KINDS` | **`nerve`**，追加在最后 —— 共 7 个 kind。Systems 行渲染 `ALL_KINDS.map(…)`，因此按钮存在**是因为**该 kind 存在；store 启动时把它置为**开**（如果某条非端脑行的 kind 被关闭，它会在模块加载时抛出） |
| `scripts/validate-data.mjs` `SLUG_RE` · `PREFIX_KIND` | `/^(nuc\|tract\|vent\|surf\|vasc\|ctx\|nrv)-[a-z0-9-]+$/` 与 `nrv → nerve`。前缀在全部 248 行中都遵循 kind（0 处矛盾）；三个近似项 `cn3-oculomotor`、`nrv-CN3`、`nerve-cn3` 仍被拒绝 |
| `Header.tsx` `KIND_LABELS` | 标签 **Cranial nerves**；无障碍名称 `Cranial nerves — show/hide the nerve system (nerve)`（可见文本是它的前缀，WCAG 2.5.3） |
| `KindGlyph.tsx` · `NucleusMesh.tsx` | 字形 `✦`；`KIND_OPACITY.nerve = 1`（不透明，因此标记可被拾取）以及 `hintForKind('nerve') = 'nucleus'`（示意性放置的灰质预设） |
| `Legend.tsx` · `styles/tokens.css` | 调色板色块 **Cranial nerves** 使用 `var(--kind-nerve)` = `#14b8a6` —— 与 `--kind-cn-nucleus` 相同的青绿色，因此“十二对神经的核团”与“十二对神经”读起来像一个家族 |

**这个开关实际触及什么**（全部为实测，`verify:nerve-kind` §3–§6 与 `verify:area-toggles` §9）：
`nerve` **开**时，全部 12 条记录都被纳入 3D 场景（绘制 24 个实体 —— 每对神经都是成对的），并且
12 行树中 0 行变暗；`nerve` **关**时，**0** 条神经记录被纳入，其他 kind
未受影响，**12/12** 行树全部变暗，`Cranial nerves` 按钮翻转为 `aria-pressed="false"`（其他六个按钮的标记逐字节相同），
再次点击它会逐字节恢复启动时的渲染。

### v13 如实说明的局限，汇总一处

| 项 | 局限（含其数字） |
| --- | --- |
| 1 · 十二对神经是**带示意性放置标记的记录，不是网格** | 没有提交任何脑神经网格，也没有新增任何网格。每条记录都是 `meshes: false`，在其作者撰写的 `origin3d`/`size3d` 处、裁剪盒内有一个**有尺寸的示意性椭球** —— 与海马亚区（`nuc-subiculum`）和豆纹动脉已经使用的机制相同 —— 并且每条记录自己的 `contextNote` 都准确说明其背后是什么几何、以及它锚定到哪个已提交的标志/外廓 |
| 2 · **为什么没有网格** | 没有东西可烘焙：`assets-src/`（`bp3d/canonical/`，86 个 OBJ）除已烘焙的 CN II 三件套（`tract-optic-nerve-*`、`ctx-optic-chiasm-*`、`tract-optic-tract-*`）之外**不含任何脑神经元素**，而 `bp3d/raw*` 只有 `FJ*.obj` 源文件。GLB 预算为 **14 MiB 上限中的 13.82 MiB —— 余量 0.18 MiB** —— 并且 `verify:anatomy` **冻结了既有包围盒**，因此新增一个 GLB 既负担不起，也意味着一次有意的重新冻结 |
| 3 · **2D 实时断面与 PiP 不响应这个开关** —— **已被 v14 取代** | *这在 v13 时是真的，这里作为记录写下来。* `SECTION_PARTS` 是每个已提交 GLB 一条（138 条），其中 **0 条**是 kind `nerve`，因此在 v13 时 `isPartVisible` 在该 kind 开与关时返回同样的 138 个部件。**v14 改变了这一点**：画布现在绘制 138 个已提交部件 + **12 个程序化生成**的神经部件，*Cranial nerves* 开关恰好翻转那 12 个（实测：开 12/12，关 0/12），并且 worker 会计算它们的轮廓 —— 见 [v14](#v14--the-cranial-nerves-as-traveling-tracts) |
| 4 · CN II 的网格属于其他记录 | `tract-optic-nerve`、`ctx-optic-chiasm` 与 `tract-optic-tract` 保留其 v8 几何；新的 `nrv-cn2-optic` 是**作为记录的神经**，与其他十一对一样没有网格 —— 3D 视图显示的是通路，不是它的第二份副本 |
| 5 · 这里**没有**验证的东西 | `verify:anatomy`（27/27）与 `verify:imaging-fit` 无法在 agent 沙箱中运行 —— 二者都在**任何断言之前**因 `spawnSync … EPERM` 而死（0 条断言运行），在基线即为红，且不在任何 v13 任务的写入范围内；`verify:audit` / `verify:acceptance` / `verify:browser` 需要 Chrome，而它在这里以 **4** 退出。因此“按钮在屏幕上且标记已被绘制”**仅由编排器浏览器验证**；本轮证明的是已交付数据、已交付决策链、渲染出的 DOM 契约与已接线的处理函数 |
| 6 · 一个既有的页眉 a11y 缺陷被钉住，而不是被隐藏 | 四个 All 模块按钮显示 `All on` / `All off`，而它们的无障碍名称是 `All areas on — …` / `All areas off — …`，因此可见文本并不包含在名称中（WCAG 2.5.3）。`Header.tsx` 在本轮写入范围之外，因此 `verify:area-toggles` 断言**恰好这四处违规及其确切字符串** —— 一个被钉住的豁免，它**会在有人修好标签的那一刻失败**，从而把修复引向正轨，而不是把它埋掉 |

### 验证（v13 收尾，非浏览器）

| 门禁 | 结果 |
| --- | --- |
| `npm run validate` | **exit 0** —— 0 errors / 0 warnings · **248 条注册表条目**（0 条等待记录）· **7 个 kind**：nucleus 88 · tract 53 · ventricle 11 · surface 25 · vessel 14 · context 45 · **nerve 12** · 19 个文件 / 225 条记录 · 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个层级 |
| `npm run check` | **exit 0**（`tsc --noEmit` —— 五个穷尽的 `Record<Kind, …>` 映射就是覆盖证明） |
| `npm run build` | **exit 0**（`✓ built in 9.57s`） |
| `npm run verify:pipeline` | **exit 0** —— 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` / `verify:plane-helper-extent` | **exit 0** —— 10,827 assertions · 206/0 |
| `npm run verify:somatotopy` / `verify:cortical-lobes` | **exit 0** —— 45/0 · 564/564 |
| `npm run verify:pip-contract` / `verify:division-toggles` | **exit 0** —— 187/0 · 251/0 |
| `npm run verify:view-filter-consistency` | **exit 0** —— 102/102 条断言，7 个区域 × 7 个 kind（含 nerve kind），548 次跨呈现面比较 |
| `npm run verify:area-toggles` | **exit 0** —— 14 组中 **437 条断言 · 0 失败**。**基线为红（225 通过 / 25 失败）**，原因是 v12 之前的页眉契约；由评审任务重新指向，并且产品**没有被掰回去**（没有预设行、没有 `data-preset`、没有 `data-header-action`） |
| `npm run verify:audit-checks` | **exit 0** —— 92 passed · 0 failed · 7 informational · 9 groups |
| `npm run verify:closure-bite` | **exit 0** —— 7/7 变异被捕获，共享树逐字节一致，恢复后的副本重跑 92/0 |
| `npm run verify:boundary-contract` / `verify:a11y-contract` | **exit 0** —— 22/0 · 38/0（a11y 门禁在 `build` 之后重跑，因此其已交付包抽查确实运行了） |
| `npm run verify:budget-report` | **exit 0** —— 599,204 tris · GLB 13.82 MiB（上限 14，余量 0.18）· imaging 9.02 MiB（上限 10） |
| `node scripts/verify-imaging-v4.mjs` / `-v4b.mjs` | **exit 0** —— v4 imaging QA PASSED · `verify-imaging-v4b: OK`（22/22 冷冻切片重新解码） |
| **`npm run verify:cranial-nerves`** *（新门禁）* | **exit 0** —— **451 条断言 · 0 失败**，16 项打印的测量：12/12 条记录，`meshes:false` 12/12，放置都在 `CLIP_BOUNDS` 内 12/12，manifest 中 kind 为 `nerve` 的部件 **0**，manifest 仍为 138 |
| **`npm run verify:nerve-kind`** *（新门禁）* | **exit 0** —— 9 组中 **79 通过 · 0 失败**；其咬合测试按名称捕获 **8/8** 个有缺陷的 kind 表（一个无法失败的检查不是证据） |
| `npm run verify:anatomy` | **exit 1 —— 是环境问题，不是产品问题** —— 在任何裁决之前 `spawnSync powershell … EPERM`；这 27 项在这里**不被主张** |
| `npm run verify:imaging-fit` | **exit 1 —— 是环境问题，不是产品问题** —— `FAIL the fitter could not be re-run: spawnSync node.exe EPERM`（0 条断言运行） |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **未运行，也未主张** —— Chrome 无法在沙箱中启动（exit **4**，"no check was run"）；编排器通道 |

v11 的遗留缺陷（画布在 y = 6/26/30/32 处绘制了规则排除的分区）用画布**自己的**
`buildLobeLayer` 跨两条已提交皮层带重新测量：**一致性 6/6** —— y=6 绘制 5 个分区，
**不是** NONE —— 因此其测得的成因是 v11 读法只切了左侧皮层带，产品中没有任何东西为迎合它而被改动。

<a id="v14--the-cranial-nerves-as-traveling-tracts"></a>

## v14 —— 作为走行纤维束的脑神经

计划与收尾：[`docs/SWARM_V14_PLAN.md`](docs/SWARM_V14_PLAN.md)（该轮的可执行契约是
[`PLAN.md`](PLAN.md)）。下面每个数字都由集成者自己的非浏览器清扫逐门禁打印；
带退出码的完整表在该文件的 §8 中。

v13 把十二对脑神经作为**记录**加入，每对带一个示意性椭球放置标记 —— 也就是你看到的那些**团块**。v14 赋予它们**真实的走行几何**：一对脑神经是一束从**根部**离开脑干、穿过**脑池**、经过一个有名称的**颅底孔**、到达其**目标**的纤维，因此它被绘制为一条 Catmull-Rom 路径，半径经由项目既有的 `TractTube` 机制处理 —— 在 3D 视图中**以及** 2D 实时断面中都是如此。**团块是被移除，而不是被叠加。**

### 1. 十二对走行，从根到目标（实测）

`len au` / `len mm` 是公布的**弦长**（路点之间的直线段）；`drawn` 是管道实际积分的
Catmull-Rom 弧长。**root** 列是走行的第一个路点：十对具有脑干根的神经使用已提交核团的
`origin3d`，CN I 使用嗅上皮，CN II 使用已提交视神经链的眶端。

| 神经 | root au | 孔 | 目标 | wp | len au / mm | drawn au / mm | r au | 管径 mm → r |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I Olfactory | [11, 9, 66] | cribriform plate | 嗅球 → 嗅束 → 初级嗅皮层 | 5 | 18.51 / 22.2 | 18.52 / 22.2 | 0.71 | 1.7 |
| II Optic | [26, 16, 57] | optic canal | 视交叉 → 视束 → LGN | 5 | 42.42 / 50.9 | 42.69 / 51.2 | 1.67 | 4.0 |
| III Oculomotor | [0, 14, −4] | superior orbital fissure | 各直肌、下斜肌、提上睑肌；睫状神经节 | 6 | 44.23 / 53.1 | 44.63 / 53.6 | 1.25 | 3.0 |
| IV Trochlear | [0, 8, −5] | superior orbital fissure | 对侧上斜肌 | 7 | 41.21 / 49.5 | 42.10 / 50.5 | 0.42 | 1.0 |
| V Trigeminal | [4, −8, 4] | foramen ovale | 面部与前头皮；咀嚼肌、鼓膜张肌、下颌舌骨肌 | 7 | 30.64 / 36.8 | 30.85 / 37.0 | 1.88 | 4.5 |
| VI Abducens | [1.5, −18, −4] | superior orbital fissure | 外直肌 | 8 | 51.85 / 62.2 | 52.44 / 62.9 | 0.79 | 1.9 |
| VII Facial | [4, −19, −2] | internal acoustic meatus | 面部表情肌、镫骨肌、茎突舌骨肌、味觉 | 8 | 52.94 / 63.5 | 54.88 / 65.9 | 0.79 | 1.9 |
| VIII Vestibulocochlear | [3.5, −14, −5.5] | internal acoustic meatus | 蜗核与四个前庭核 | 8 | 48.64 / 58.4 | 49.56 / 59.5 | 1.17 | 2.8 |
| IX Glossopharyngeal | [3.5, −31, −4] | jugular foramen | 茎突咽肌、腮腺、颈动脉体与颈动脉窦、味觉 | 7 | 40.82 / 49.0 | 41.56 / 49.9 | 0.83 | 2.0 |
| X Vagus | [2, −32, −7] | jugular foramen | 咽与喉部肌肉、胸腹部脏器 | 8 | 44.31 / 53.2 | 44.95 / 53.9 | 1.00 | 2.4 |
| XI Accessory | [3.5, −31, −4] | jugular foramen | 胸锁乳突肌与斜方肌 | 8 | 48.93 / 58.7 | 49.57 / 59.5 | 0.63 | 1.5 |
| XII Hypoglossal | [0, −31, −4] | hypoglossal canal | 舌内肌、颏舌肌、舌骨舌肌、茎突舌肌 | 7 | 36.11 / 43.3 | 36.44 / 43.7 | 0.75 | 1.8 |
| **总计** | 84 个路点 | 12 个命名的孔 | — | **84** | **500.62 / 600.7** | **508.20 / 609.8** | 0.42–1.88 | **r = d ÷ 2.4**，在 1 au = 1.2 mm 下 |

**有锚定，不是随手画的。** 十二对中有十对把它们自己已提交的出脑标志（`surf-cn3-exit` …
`surf-cn12-exit` 表面记录）作为**0.000 au 的字面量路点**，并且这十对都从它们所命名的已提交核团
`origin3d` 出发（CN XI 从 `nuc-ambiguus` 出发），同样在 **0.000 au**。半径由
**脑池段管径**换算而来（解剖 / 高分辨率 MRI 范围，mm 数值与范围
都写在 `docs/SWARM_V14_PLAN.md` §2 中），并且确实是非均匀的 —— **0.42 au（CN IV）到 1.88 au（CN V）**。
每个路点都在 `CLIP_BOUNDS` 之内，最小间隙 **6.00 au**（CN I）。

### 2. 每对神经一个实体 —— 团块退役了，而不是被盖住

结构过程对任何有走行的记录返回 `null`，因此一对有走行的神经会停止绘制其
示意性标记：已交付的 XOR 表对全部十二对都打印 `tube = yes` **并且** `marker would-draw = no` **并且**
`section part = yes`。`hasNerveCourse(id)` 对恰好这 12 个走行 id 为真，对一条真实纤维束为假。
“走行是**作者撰写的路径，不是分割出来的扫描**”这一诚实声明随每条走行的 `anchorNote`（432–692 个字符）一起交付，并且门禁在两半中都断言它。

### 3. 两个呈现面 —— 3D 管道与 2D 程序化轮廓

| 呈现面 | 它显示什么 | 证据 |
| --- | --- | --- |
| **3D 场景** | 每对神经一根锥形管道（12 根），由 `SceneLayers` 的神经走行过程挂载 | 经**已交付的** `isTractVisible` 执行的 kind 真值表：全开 → 23 条纤维束 + **12/12** 神经；**tract kind 关 → 0/23 条纤维束但 12/12 神经**；**nerve kind 关 → 23/23 条纤维束但 0/12 神经**；两者都关 → 0 + 0；中脑 area 关 → 19 条纤维束 + 10 对神经。**本轮被提醒要防的“开错开关”陷阱就在持有它的那一行被修好了** —— `isTractVisible` 现在读取记录**自己的注册表 kind**，而不是字面量 `'tract'` |
| **2D 实时断面 + PiP** | **路线 (a)：程序化生成的部件。** `registryNerveParts()` 把 12 根管道喂给**既有的** `registryPartFromGeometry(meta, geometry)` 适配器，因此 3D 管道与 2D 轮廓**按构造就是同一份几何** | 12 个注册表部件（每个 803 个顶点 / 1,440 个三角形）；**已交付的 worker 机制**（`partBounds` / `boundsMayCut` / `extractContours`）在它们之上运行：**38 个平面 → 121 个闭合环，0 个非有限值**；走行门禁为每对神经清扫三组正交平面：**576 个相交平面 → 689 个轮廓环**。`partsForCanvas()` = 138 个已提交 + 12 个程序化 = **150**，并且 *Cranial nerves* 开关恰好翻转那 12 个（`verify:area-toggles` §11：开 **12/12**，关 **0/12**，已提交部件的纳入逐字节相同） |

**为什么不把管道烘焙进 GLB。** 实测：在 `TractTube` 的 72 × 10 扫掠下，一根管道是 803 个顶点 /
1,440 个三角形 = 原始 **33.5 KiB** / 量化后 **14.7 KiB**；十二对是**原始 0.3929 MiB / 量化 0.1724 MiB**
（双侧共 24 根为 `0.3448 MiB`）。有约束力的预算是 `src/assets/anatomy/` 目录 ——
**14 MiB 上限中的 13.8914 MiB，140 个文件，余量 0.1086 MiB** —— 因此烘焙最好也差 **1.6×**，
按诚实读法差 **3.6×**，这还没算 JSON 块或任何左右复制。路线 (a) 的成本是
**0 字节**：manifest 仍是 **138 个部件 / 599,204 个三角形**，`Σ stat(parts[].file)` 仍是
**14,486,228 B**，并且没有任何已提交 GLB、manifest 行或包围盒移动。

<a id="v14-honest-limits-in-one-place"></a>

### v14 如实说明的局限，汇总一处

| 项 | 局限（含其数字） |
| --- | --- |
| 1 · **这些走行是作者撰写的路径** | 十二对中的每一对都是通过有文档记载的标志撰写的路径 —— 根部（一个已提交核团的 `origin3d`）、脑池段、命名的颅底孔、目标 —— 并带一个由所述管径换算出的半径。**它们不是分割扫描、不是纤维追踪，也不是解剖标本。** 没有提交任何颅底、硬脑膜窦或眶部网格，因此**每个孔的位置都是由解剖学撰写，而不是由几何测得**；每条走行的 `anchorNote` 都在记录自身中说明了这一点 |
| 2 · **CN II 被单独陈述 —— 而它是这条规则唯一未被满足的地方** | `nrv-cn2-optic` 是唯一一对背后有已提交几何的神经（v8 的 `tract-optic-nerve` / `ctx-optic-chiasm` / `tract-optic-tract` 网格）。它作者撰写的管道**与烘焙的 `tract-optic-nerve-l` GLB 重叠**（重叠 x 26.2 au、y 1.9 au、z 36.8 au），而该网格属于一条**不同的**记录，因此两个实体会同时渲染。那就是第二根视神经，修复方案是一个数据决策，被结转在 `docs/SWARM_V14_PLAN.md` §6.1 中 —— 它**没有**被悄悄糊过去。它的链锚定在已提交的视神经路点上（两端均 0.000 au，内部最差 6.595 au），而**不是**锚定在其自身 `anchorId` 仍命名的 `surf-optic-chiasm` 标志上（后者与网格相差约 7 au） |
| 3 · **CN I 被单独陈述** | CN I **没有脑干根，也没有出脑标志**（`surf-cn1-exit` 不存在，也不存在任何嗅核记录）。它的链方向相反 —— 嗅上皮 **[11, 9, 66]** → 嗅球/嗅束 → 并**终止**于它自己已提交的 `origin3d` **[8, 12, 48]**（0.000 au）。前端之后没有任何已提交几何，门禁会打印这一点，而不是把它藏起来 |
| 4 · **十二对记录自身的 `contextNote` 仍在描述已退役的椭球** | 椭球已不再渲染，但注释仍写着“the ellipsoid at `origin3d` … is a SCHEMATIC placement”。`src/data/structures/*-cranial-nerves.json` 在本轮写入范围之外，因此它被报告出来，而不是被悄悄编辑：注释所描述的**数据模型**（`meshes:false`、有尺寸的放置、无 manifest 部件）仍然准确，而作者撰写路径的声明随走行的 `anchorNote` 交付 |
| 5 · **公布的长度比实际绘制的管道少 1.5 %** | 门禁打印的弦长合计为 **500.62 au = 600.74 mm**；实际绘制的 Catmull-Rom 管道为 **508.20 au = 609.84 mm**。两者都在上面公布 —— 早先的计划估计（475.79 au）已被取代 |
| 6 · **这里没有验证的东西** | `verify:anatomy`（27/27）与 `verify:imaging-fit` 在沙箱对管道化子进程 stdio 的拒绝下、**在任何裁决之前**就死掉（基线为红，0 条断言）；被阻断的解剖测量直接重跑返回 **14,566,178 B**，即未变。**Chrome 无法在这里启动**，因此 *"the tubes are painted on screen"*、*"the button toggles them on screen"*、*"the section and the PiP paint the contours"* 与 *"click-select works"* **仅由编排器浏览器验证** —— 2D 一致性的浏览器证明是 `verify:audit` 的 **R3b**，本轮评审把它重新指向为断言 Plates 的哈希**发生变化**并往返恢复 |

### 验证（v14 收尾，非浏览器）

| 门禁 | 结果 |
| --- | --- |
| `npm run validate` | **exit 0** —— 0 errors / 0 warnings · 248 条注册表条目 · 7 个 kind（nerve 12）· 19 个文件 / 225 条记录 · 23 条纤维束 |
| `npm run check` · `npm run build` | **exit 0** · **exit 0**（`✓ built in 9.08s`） |
| `npm run verify:pipeline` | **exit 0** —— 138/138 parts · 599,204 triangles · 386 loops across 13 planes · 0 problems |
| `npm run verify:plane` / `verify:plane-helper-extent` | **exit 0** —— 10,827 assertions · 206/0 |
| `npm run verify:somatotopy` / `verify:cortical-lobes` | **exit 0** —— 45/0 · 564/564 |
| `npm run verify:pip-contract` / `verify:division-toggles` | **exit 0** —— panel contract PASSED · 251/0 |
| `npm run verify:view-filter-consistency` | **exit 0** —— 102/102 · 138 个部件 · 225 个结构 · 23 条纤维束 · **7 个区域 × 7 个 kind** · 548 次跨呈现面比较 |
| `npm run verify:area-toggles` | **exit 0** —— **455 条断言 · 0 失败 · 14 组**，包括 §11 的 2D 神经一致性（开 12/12，关 0/12）与死点击守卫（4/4 个变异体被捕获） |
| `npm run verify:audit-checks` / `verify:closure-bite` | **exit 0** —— 92/0 · 7/7 变异被捕获，共享树逐字节一致 |
| `npm run verify:boundary-contract` / `verify:a11y-contract` | **exit 0** —— 22/0 · 38/0 |
| `npm run verify:budget-report` | **exit 0** —— 599,204 tris · 部件 **13.82 MiB** · 目录树 **13.89 MiB / 140 files**（上限 14）· imaging 9.02 MiB |
| `npm run verify:cranial-nerves` / `verify:nerve-kind` | **exit 0** —— 451/0 · 79/0 |
| **`npm run verify:cranial-nerve-courses`** *（新）* | **exit 0** —— **220 条断言 · 0 失败**，十二行探针表，84 个路点，10/10 出脑标志在 0.000 au，12/12 孔被命名，最小间隙 6.00 au，**689 个 worker 轮廓环** |
| **`npm run verify:cranial-nerve-render`** *（新）* | **exit 0** —— **47/47 条断言**，3D 管道 12/12 带四状态开关表，2D 部件 12，**38 个平面上 121 个轮廓环**，与标记的 XOR 12/12，载荷未变 |
| `npm run verify:anatomy` / `verify:imaging-fit` | **exit 1 —— 是环境问题，不是产品问题**（`spawnSync powershell` / `node.exe` EPERM，0 个裁决；解剖测量直接重跑 = 14,566,178 B） |
| `npm run verify:audit` / `verify:acceptance` / `verify:browser` | **未运行，也未主张** —— Chrome 无法在沙箱中启动；编排器通道 |

## 脚本

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | 端口 5173 上带 HMR 的 Vite 开发服务器 |
| `npm run build` | 类型安全的生产构建（`vite build`）→ `dist/` |
| `npm run check` | 对 `src/` 运行 `tsc --noEmit` |
| `npm run validate` | 数据完整性门禁：JSON 形状、规范坐标边界、id/slug 唯一性、图版↔SVG↔分类学引用完整性、综合征 id 解析、显示名唯一（`scripts/validate-data.mjs`） |
| `node scripts/build-anatomy-geometry.mjs --manifest` | 解剖资产门禁：从已提交 GLB 重建 manifest 并强制 v2 性能预算（exit 1 = 超出预算） |
| `node scripts/build-mri-grid.mjs` | MRI 烘焙门禁：把 CC0 OpenNeuro T1w 重采样进规范 uint8 网格 + manifest + QA 预览 PNG（配准 QA 违规时 exit ≠ 0） |
| `node scripts/build-ct-grid.mjs` | CT 烘焙门禁：把 NLM Visible Human 头部 CT DICOM 序列重采样进规范 uint8 网格（HU）+ 带 `brain`/`bone` 窗的 manifest + QA 预览；`--tune` 重跑配准搜索（QA 违规时 exit ≠ 0） |
| `node scripts/verify-imaging-v4.mjs` | 真实影像 QA 门禁（无打包器/浏览器）：对全部 **49** 张平面锚定照片（24 张 UBC/Commons v4 + **22 张 v4b NLM 冷冻切片** + 3 张 Commons CT）重新推导其锚定与可及性并与裁剪滑块范围比对，检查每张图版在自己的平面上都是无歧义的最近图版，检查横断 `levelId` 映射与 `levels.json` 一致，断言 2D 画布与 GPU PiP 的 §2.2 方位表与 `docs/SECTION_SYNC_PLAN.md` §2.2 一致，检查代码 + 文档中的每一条逐字署名行（包括 NLM 致谢与“冻结 2026-09-10 快照”的声明），验证资产/manifest 完整性，打印逐来源载荷明细并强制两项载荷预算（任何违规 exit ≠ 0） |
| `node scripts/verify-imaging-v4b.mjs` | **v4b 冷冻切片 QA 门禁**（`v4c-qa` 评审产物）：从已提交来源重新推导 v4b 的各项主张 —— 22 条 manifest 条目对照放置公式、可达的滑块范围，以及使每张图版在自己的平面上都是最近图版的 > 1.5 au 间距规则；每张图版的 JPEG 头、尺寸与精选字节数；确切的 NLM 结构/标记（`SOF` 528 × 764、`EOI` 存在、仅 baseline）；全部五条记录中的逐字致谢 + 获取日期 + 冻结快照声明；每个 `sourceUrl` 的 NLM 主机与逐图版索引；没有仅外链的来源；配准记录在其统计量低于阈值处披露行方向与镜像为未证明；≤ 8 MiB / ≤ 1.75 MB 载荷预算；以及 v4b 之前的 manifest 完整且仍排在前面（任何违规 exit ≠ 0）。**v7 更新：** 该门禁强制的总载荷上限被 `docs/TELENCEPHALON_PLAN.md` §2/§4 从 **8 MiB 提高到 10 MiB**（AMENDMENT B 使两个 uint8 网格各为 `[81, 113, 107]` = 979,371 B）；冷冻切片子上限未变 |
| `npm run verify:plane` | **单平面变换门禁**（`scripts/verify/plane-transform.mjs`）：导入已交付的 `src/components/section/planeGeometry.ts`（绝不使用副本），并断言 2D 画布、断面面板与背景采样器在一组轴/平面/视口网格上对 world→screen 映射一致，且方位徽章表由投影像素派生（10 827 条断言）。**v9：** 面板不再渲染 3D 场景，但门禁仍会解析其源码中的 `SECTION_VIEWS` 表与 `planeTransform(` 调用（PLAN §7.15），因此方位契约未变。它还会打印那个既有的冠状相机基退化问题，并且**不**因此失败 |
| `npm run verify:plane-helper-extent` | **v10 平面辅助器门禁，无浏览器**（`scripts/verify/plane-helper-extent.mjs`，由 v10 的 `plane-helpers-extent` 任务创建）：四条通道共 196 条断言 —— (A) 已交付的纯函数 `planeHelperGeometry(axis, value)` 推导，加上与 `planeGeometry.axisExtents` 的 2D 画布交叉检查，打印逐轴四边形 W×H、实测 world u/v 矩形与单元格尺寸；(B) **执行已交付组件的渲染路径**（项目 TypeScript 转译 + 一个仓库 Node 钩子）并遍历其元素树，因此四边形的四个角与每个网格顶点都经已交付的旋转变换，必须落在 `CLIP_BOUNDS` 矩形上，另加材质/renderOrder/射线投射/门控/几何同一性；(C) 剥离注释**与字符串载荷**后的源码不得包含任何范围字面量，必须导入 `CLIP_BOUNDS`，并且必须在渲染路径之外恰好构建一个 `BufferGeometry`；(D) 咬合 —— 在临时副本中变异的 `clipPlanes.ts`（58→70、116→130、−76→−90）必须移动每一个四边形，而已交付文件的 SHA-256 前后打印一致。它还被证明能对 `PlaneHelpers.tsx` 的四处就地变异产生咬合（v10 之前的字面量 → 165/28 失败、u/v 互换 → 150/43、固定线数 → 181/12、去掉旋转 → 184/9），文件逐字节恢复 |
| `npm run verify:pipeline` | 断面流水线门禁：把每个已提交解剖 GLB 用 13 个平面切片，并断言轮廓引擎的环/段不变式（138/138 个部件，无问题） |
| `npm run verify:somatotopy` | **v9 躯体定位门禁，无浏览器**（`scripts/verify/somatotopy.mjs`，PLAN §5.6 还接了一个裸别名 `npm run somatotopy`）：对 M1/S1 图的 45 条断言 —— 全部 16 个 id 的注册表优先解析、已提交放置表在 `CLIP_BOUNDS` 之内（包括镜像的 −x 范围）、躯体定位顺序在弧长**与**规范 x 上对两条带都单调、8/8 M1↔S1 配对、相对已提交皮层带 GLB 重新测量的贴片接触、唯一的颜色渐变，以及叠加层接线作为源文本读取 |
| `npm run verify:cortical-lobes` | **v9 皮层分区门禁，无浏览器**（`scripts/verify/cortical-lobes.mjs`）：**v10 把它重写为 519 条断言** —— 六个分区及其 12 个标签（全称 + 简写）、逐平面占比并打印逐平面缺席清单、包含性（没有分类单元格在皮层带之外、没有凭空造出的 run 点、run 构成闭合链）、在重复与反向清扫下的确定性、17 个钉住的解剖抽查、通过 `react-dom/server` 渲染并携带该告诫的真实 Legend JSX，以及作为子进程重跑的 `section-pipeline.mjs`。**v10 的 C–F 组**加入 run 质量规则：从已交付常量读取的三个阈值、打印出的**逐平面逐分区弧长/面积表**、细条普查（`arc < 2 / < 5 / < 10`、`area < 1 / < 10`、1 顶点 —— 在 47 条被绘制的参考平面 run 上全部为 **0**）、被丢弃环的普查、独立的**原始**重切（显示在未改变的分类下 72 个区段中有 23 个低于阈值）、49 平面用户网格清扫，以及一次真实的 `react-dom` 渲染，证明 `ctx-cerebral-cortex` 的层片被抑制而丘脑外廓的层片仍会渲染。它被证明能对六处就地变异产生咬合（绘制下限、阈值未门控吸收、未门控的悬停标签、未门控的层片、按顶点数竞争的标签、被过滤的轮廓），每一处都以 1 退出，文件逐字节恢复 |
| `npm run verify:pip-contract` | **v9/v10 模拟切面面板门禁，无浏览器**（`scripts/verify/pip-contract.mjs`）：**6 组共 187 条断言**（v10 加入 F 组）—— 面板挂载共享的 2D 渲染器（一个画布、无 WebGL 上下文、无 `PlaneHelpers`），其代码中不存在 12 个退役的 GPU 渲染器 token，影像作用域在 effect 中启动且像素守卫遮蔽两个位块传送调用，尚存的界面元素（轴向覆盖、读数形状、来自 `planeGeometry.PLANE_BADGES` 的徽章、隐藏/恢复、≤900 px 标签页字面量），以及尺寸控件的算术 —— 钳制窗口钉在 224–880 × 170–640 px、对 0/负数/`NaN`/±∞ 的全定义性、幂等性、小⇄大循环、持久化键。**F 组（v10 第 3 项）**加入四个角把手（四个不同的、点名角落的无障碍名称）、角落表与渲染顺序、计划中的确切数字、一次独立重推导、**局部坐标系几何证明**（被拖动的角在指针上、对角逐位相同、单轴拖动不动另一轴、在钳制边界处仍被固定）、键盘/接线非回归以及样式表锚点。其文件头陈述了决定标记那一半如何被断言的 zustand-4 静态渲染局限；它自己的咬合检查在隔离副本中捕获 **6/6** 个变异 |
| `npm run verify:division-toggles` | **v10 分区可见性门禁，无浏览器**（`scripts/verify/division-toggles.mjs`，新增）：10 组共 250 条断言，通过进程内 TS/TSX 加载器（`audit-checks.test.mjs` 的技术）导入**已交付的 store** —— Legend 所调用的导出契约；四个分区等于有文档记载的那些，并且**划分** `ALL_REGIONS`（没有区域同属两个分区，也没有区域不可达）；全新启动仍报告 `brainstem-focus`，vasculature 区域关闭、vessel kind 打开；对全部四个分区，`solo` 都恰好留下一个分区的区域打开（action + 纯函数，幂等，逐分区打印）；复选框路径是一个幂等的并集，会清空一个完整分区并精确恢复之前的集合；动脉从不被扫进任何分区（打印 7×4 矩阵）；每次调用后 kinds/hidden/emphasis 集合相等；一次**真实的 `react-dom` 渲染**在区域行之上产出 4 个复选框 + 4 个 solo 按钮，且无障碍名称各不相同；第 10 组在隔离副本中驱动**已交付的处理函数**，捕获 7 个状态（启动 `[true,true,true,false]` → solo(mesencephalon) → 复选框关/开 → 血管复选框 ± → solo(prosencephalon)）。咬合：四个注入缺陷各被一条具名检查捕获，另有一个被变异的 `DIVISIONS` 表（把动脉折进后脑）触发 store 自己的加载期断言 |
| `npm run verify:area-toggles` | **v11 Areas/Systems 开关行门禁，无浏览器**（`scripts/verify/area-toggles.mjs`，新增）：**10 组共 331 条断言**，通过其他 Node 门禁所用的进程内 TS/TSX 加载器导入**已交付的 store 与已交付的 `Header.tsx`** —— 页眉所调用的导出 area 契约（`AREAS`、`areaRegions`、`areasOf`、`areaLayersOn`、`ALL_ON_LAYERS`）；**Area 划分以表格打印**（按钮 · 区域 · 分类学行数 · 启动状态：85/39/25/40/33/14 = 236，覆盖 7 个恰好各被拥有一次的区域，没有区域同属两个 area，也没有区域未被触及）；菱形脑拆分在脑泡边界上被证明（metencephalon + myelencephalon = 该分区，medulla 单独）；Systems 行 = 按顺序的 `ALL_KINDS`，带各自的行数（88/53/11/25/14/45 = 236）；已交付的 `AREAS` 等于**从 `DIVISIONS` 重建**的表，也等于从 store 自身源文本解析出的区域集合（一个会漂移的硬编码列表会失败）；每个 area 开关都通过真实 store action *与*真实 `onClick` **恰好**增删其区域（一个子探针触发全部十二个按钮），并让 kinds/hidden/emphasis 集合相等；默认未变（`viewPresetOf(DEFAULT_LAYERS) === 'brainstem-focus'`，启动状态行 `[true,true,true,true,true,false]`）；Reset 从脏状态以及在 All 之后都精确重现默认值；一次真实的 `react-dom` 页眉渲染（6 + 6 + 9 个按钮、带标签的分组、不同的无障碍名称、可见文本是每个名称的前缀、没有 `div` 冒充按钮）；以及咬合那一半 —— 四个注入缺陷被具名检查捕获，另有两个加载期变异让 store 以 1 退出并点名划分缺陷 |
| `npm run verify:view-filter-consistency` | **v11 单一可见性决策门禁，无浏览器**（`scripts/verify/view-filter-consistency.mjs`，新增）：**100/100 条断言** —— 把 **138 个断面部件 · 213 条结构记录 · 23 条纤维束 · 10 个外廓槽位 · 2 个幽灵壳**在 **7 个 area × 6 个 system** 的 4 种状态下清扫，比较 2D/PiP 决策（`isPartVisible`）与 3D 原语（`layersAdmit`），并按分类学 id 连接两个呈现面：**548 次跨呈现面比较、0 处分歧**，area-off/kind-off/both-off 在每个过程上都隐藏**每一个**被拥有的实体，并且 **0 / 138** 个部件的区域不可判定（静默绕过类）。它打印逐 area 与逐 system 的隐藏表，断言 `isPartVisible` 是 `SectionCanvas.tsx` 中**唯一**的图层读取、并且 `SceneLayers.tsx` 的组件体中有**零**处直接读取 region/kind，在两个已提交皮层带 GLB 上执行已交付的 `buildLobeLayer`（分区一致性 **5/5** 个平面；area 关闭 ⇒ 0 条皮层带 / 0 个分区，即使使用未过滤的目录，75 个 `Path2D` / 2233 个 `lineTo` 证明该过程确实描边），并作咬合：在临时副本中移除画布图层门控后，在端脑关闭时绘制 5 个分区，而已交付过程绘制 0 个；画布私有的规则过滤器会与共享规则分歧（`SectionCanvas.tsx` 的 SHA-256 前后一致） |
| `npm run verify:cranial-nerves` | **v13 脑神经记录门禁，无浏览器**（`scripts/verify/cranial-nerves.mjs`，新增）：**451 条断言 · 0 失败 · 16 项打印的测量**，通过**已交付的数据层**（`src/data/load.ts` —— 真实选择器，不是重打的副本）读取十二对记录，`CLIP_BOUNDS` 取自已交付的运行时声明，manifest 取自 `src/assets/anatomy/anatomy-manifest.json`，id 契约**从 `scripts/validate-data.mjs` 解析出并执行**，因此该门禁无法偏离接受这些 id 的正则。它统计其他门禁不统计的东西：12 行分类学与 12 条 kind 为 `nerve` 的作者撰写记录（没有只存在于注册表的桩），每个神经编号 I…XII 各恰好一次，全部 12 个 id 都被该 `SLUG_RE` 接受，真实区域 2/2/4/4 且唯一细分是 `Cranial nerves`（而 `Cranial nerve nuclei` 仍是它的 17 行），侧别/颜色/名称与注册表一致，**24** 个层级锚点可解析，记录内 **131** 个 id token 中 **0** 个无法解析，每对神经的具名链接，每条 `course` 中的孔名称，≥2 条带明确定位的临床条目，≥2 条参考文献与一条精选网络参考，以及几何：**12/12 `meshes:false`**、**12/12** 有尺寸的放置在 `CLIP_BOUNDS` 内、**0** 个 manifest 部件为 kind `nerve`、**0** 个 `nrv-*` GLB、manifest 仍为 **138** 个部件 |
| `npm run verify:nerve-kind` | **v13 kind 门禁，无浏览器**（`scripts/verify/nerve-kind.mjs`，新增）：**9 组共 79 条断言 · 0 失败**。它通过其他 Node 门禁所用的进程内 TS/TSX 加载器导入**已交付的** `load.ts`、`Header.tsx`、`Legend.tsx`、`KindGlyph.tsx`、`NucleusMesh.tsx`、`SceneLayers.tsx` 与 `store.ts`，用 `react-dom` **以及**一个实时钩子派发器渲染真实组件（zustand 4 交给 React *服务端*渲染器的是启动快照，因此切换后的重渲染只能在客户端路径上读到），并把两个无法导入的声明处（`validate-data.mjs` 在导入时运行；`types.ts` 只有类型）作为解析后的数据读取。它证明该 kind 在**每一个**位置都被声明，且各位置**一致**（ALL_KINDS ≡ 校验器 `KINDS` ≡ `Kind` 联合 ≡ `KIND_GLYPH`/`KIND_OPACITY` 键集合，七个 kind，`nerve` 在最后）；slug 契约接受全部 12 个 `nrv-*` id，仍拒绝四个近似项，并在全部 **248** 行中发现 **0** 处前缀/kind 矛盾；渲染出的 `<Header />` **按 `ALL_KINDS` 每项一个 Systems 按钮、按顺序**，第七个恰好读作 **Cranial nerves**，带 `data-kind`、`aria-pressed`、`type="button"` 以及符合 WCAG 2.5.3 的无障碍名称；Legend 每个 kind 都有一个调色板色块**与**一行开关，`Cranial nerves` 色块使用的 token 由 `tokens.css` 真正定义；**已交付的 `onClick` 处理函数被调用**，开关恰好从 `layers.kinds` 中移除 `nerve`，而 `regions`/`hidden`/`emphasis` 保持集合相等，往返渲染与启动状态逐字节相同；一条合成的 `nrv-*` 记录当且仅当 kind 打开时被已交付的 `isStructureVisible` 纳入，不透明度为 1 且用灰质提示；并且它的**咬合**对 **8 个有缺陷的 kind 表**运行*同一*契约检查器，每一个都按名称被捕获 |
| `npm run verify:cranial-nerve-courses` | **v14 走行几何门禁，无浏览器**（`scripts/verify/cranial-nerve-courses.mjs`，新增）：**220 条断言 · 0 失败**。它通过仓库自己的 TS 加载器读取十二对作者撰写的走行 —— 因此它验证的是两个呈现面实际渲染的那张表 —— 并逐神经、打印每个数字地断言：≥ 3 个有限路点；`tubeRadius` 有限、> 0、等于 1 au = 1.2 mm 下的 `calibreMm ÷ 2.4`，且等于计划表（1.7/4.0/3.0/1.0/4.5/1.9/1.9/2.8/2.0/2.4/1.5/1.8 mm → 0.71/1.67/1.25/0.42/1.88/0.79/0.79/1.17/0.83/1.00/0.63/0.75 au）；该神经**自己的出脑标志作为字面量路点**（对十个有标志的神经测得偏差 **0.000 au**，容差 2 au），且链**从它所命名的已提交核团 `origin3d` 起始**（0.000 au）；有文档记载的孔**在记录中被命名并出现在它自己的走行句子中**；每个路点都在 `CLIP_BOUNDS` 内并打印最小间隙（**6.00 au**，CN I）；长度以 **au 与 mm** 给出；以及 direction/modality/origin/target/decussation/function/clinical/levels/refs 内容。随后它**执行**渲染主张：23 条纤维束 + 12 对走行通过已交付的 `isTractVisible`（kind 门控、`hasNerveCourse`、结构过程丢弃有走行的记录），以及每条走行的管道通过**断面 worker 自己的** `boundsMayCut`/`extractContours`（**576 个相交平面 → 689 个环**，逐平面计数打印）。它的探针表就是那张十二行的 根 · 孔 · 目标 · 长度表 |
| `npm run verify:cranial-nerve-render` | **v14 渲染一致性门禁，无浏览器**（`scripts/verify/cranial-nerve-render.mjs`，新增）：**47 条断言 · 0 失败**。它不挂载任何东西，也不绘制任何东西（Chrome 无法在这里启动）—— 它通过同一个进程内加载器**执行已交付模块**并证明：**场景的纤维束列表中有 12 根管道**，并打印四状态开关真值表（全开 23+12 · **tract 关 → 0 条纤维束但 12/12 神经** · **nerve 关 → 23/23 条纤维束但 0/12 神经** · 两者都关 0+0 · 中脑关 19+10 · 一个被预设隐藏的 id 11）—— 即错误门控陷阱在两个方向上都被封住；**12 个断面注册表部件**（每个 803 个顶点 / 1,440 个三角形，`maxIndex 802 < 803`），其轮廓由**已交付的** `partBounds`/`boundsMayCut`/`extractContours` 在 38 个平面上计算（**121 个闭合环，每对神经 ≥ 1 个相交平面且 ≥ 1 个环，0 个非有限值**）；**XOR** —— 一对神经渲染管道**或**标记，绝不两者同时，对全部十二对成立；共享构建器主张作为源文本读取；载荷重新测量（**138 个 manifest 部件、0 个 `nrv-*` GLB、599,204 个三角形、部件 13.8151 MiB / 目录树 13.8914 MiB**）。一次咬合把字面量 `'tract'` 翻回 `isTractVisible`，于是 nerve-off 那行从 0 变成显示 12 |
| `npm run verify:vasc-courses` | **v17 细粒度血管数据门禁，无浏览器**（`scripts/verify/vasc-courses.mjs`，新增）：**2,171 条断言 · 0 失败**。它读取 39 条作者撰写走行记录，并**自行重新解析已提交的 GLB** —— 一个手写的读取器加一个精确的“三角形上最近点”探针，其加速搜索会与遍历每个三角形的穷举版本交叉核对（24 个探针，全部精确）。它打印每一个数字并断言：**39/39 个 id 先注册**（`vasculature`/`vessel`、父级可解析、0 条仅有注册表的行）；**172 个路点全部在 `CLIP_BOUNDS` 内**；每个存储残差都**从网格字节重新推导**（67/67 的投影点落在网格上，67/67 的弦长 `\|Q−P\| = r + 0.15 au`）；**52 个镜像投影**落到右侧外廓上并打印最差偏差（**1.480 au = 1.78 mm**，容差 1.6 au，因为两个半球是各自独立抽取的）；父级/供血区/supply 解析；**豆纹动脉修复**（椭球记录被抑制，六条链落在已提交 M1 顶点上，0.000 au）；**半径表**及其 mm 出处（**39/39** 满足 `\|r × 2.4 − calibreMm\| < 0.03`，最大误差 0.0008 au）；以及载荷（138 个部件，**新增 0 字节**）。其打印出的表即 `docs/SWARM_V17_PLAN.md` §2 |
| `npm run verify:vessel-render` | **v17 细粒度血管渲染门禁，无浏览器**（`scripts/verify/vessel-render.mjs`，新增）：**75/75 条断言**。它通过神经门禁所用的同一个进程内加载器执行**已交付模块**并证明：合并后的走行表（**40 条走行 = 1 条内置存活 + 2 条被作者撰写版替换 + 37 条全新作者撰写**，每条都带 id/侧别/父级/surface/basis/点数/弧长 mm/半径/管径 mm）；**7 种图层状态下的 3D 通道**（`全开 → 40/40 血管、23/23 纤维束、12/12 神经` · **vessel 类型关 → 0/40** · **vasculature 区域关 → 0/40** · tract 关与 nerve 关都让血管保持 40/40 · 一个被预设隐藏的 id 恰好掉一个）；**77 根绘制管道 = 40 作者撰写 + 37 镜像**（以 `2 × 37 成对 + 3 中线` 两项之和打印）；覆盖全部 **53** 条血管记录的**一记录一实体表** —— `tube only` / `baked body`，**0 BROKEN**、**blobs 0**，9 条豆纹动脉 id 全部被抑制；**2D 注册表**（40 条血管 meta、77 个 worker 部件、索引在范围内）以及已交付轮廓 worker 对每条走行的切分（**2,581 个环，0 个非有限值**）；**共享构建器**（`tubeGeometryFor()` 与 `registryVesselParts()` 之间 185,493 个位置值完全一致，神经镜像包围盒取负 —— 继承来的镜像缓存缺陷在两个家族中都保持修复）；合成的合并/分组/别名用例；以及载荷证明（138 个 manifest 部件、Σ 14,486,228 B = 13.82 MiB、**0 个走行 GLB**） |
| `npm run verify:imaging-fit` | **v9 影像配准门禁**（`scripts/verify/imaging-fit.mjs`）：重跑拟合器并要求每个已提交数字都等于重算值 —— 网格字节对 `HEAD` 冻结、逐平面与平均残差、`applied` 与记录自身的门控、每张被接受的图版都作为 `fittedFit` 出现在 `src/data/sectionImages.ts` 中、每张被拒绝的都不出现、49 张 JPEG 图版记录为 `unmeasurable: no-decoder`，以及 `imageLayers.ts` 优先使用 `fittedFit`。**在 agent 沙箱中为红** —— 门禁把拟合器作为管道子进程重跑，而沙箱拒绝它（`spawnSync node EPERM`，**0 条断言运行**）；当通过一份逐字节相同的副本、使用捕获到的拟合器 JSON 驱动时，它完成于 289 条断言 / 20 处失败（18 个真实、2 个副本产物）—— 确切的失败见 [v9 一节](#verification-v9-close-out-non-browser) |
| `npm run verify:audit-checks` | **审计检查镜像，无浏览器**（`scripts/verify/audit-checks.test.mjs`，在 v9 收尾时暴露为一个 npm 脚本；此前是作为裸 `node` 命令运行的）：对**已交付的清单与已交付的源码**运行运行时审计所用的*同一组*纯谓词（`scripts/verify/checks.mjs`）—— 由真实 `ct-manifest.json` 与 `ctCoverageStatement()` 驱动的 CT 覆盖诚实性、brainstem-focus 默认值与预设区域守卫（从真实 store 导入）、`?panelfail` 包含演示（通过真实抛出驱动真实 `PanelErrorBoundary`：`probes === 1`、正确的呈现面、Retry 恢复）、上下文丢失的 DOM 契约（包括“叠加层在 `<Canvas>` 之外”与“PostFX 在丢失期间返回 null”这两个根因），以及两个方向上的模态清扫。它还会重新推导那三个预算数字，并检查端脑数据/图版清单。**这是镜像，不是浏览器测试**：它证明的是决策逻辑与已交付代码契约，从不证明像素出现过。**v10：实测 92 通过 · 0 失败 · 7 信息性 · 9 组（exit 0）** —— 变暗行谓词带有有文档记载的血管豁免*以及*钉住它的那条断言（*"the 14 vascular rows are off at default framing through the REGION layer only…"*），这取代了称该门禁为红的 v9 收尾说明 |
| `npm run verify:audit` | **自足式运行时审计**（`scripts/verify/audit.mjs`）：当目标 URL 无人应答时自行启动 Vite，通过 DevTools Protocol 驱动无头 Chrome 走遍整个功能面，并在每条退出路径上再次停止服务器。包含两个 P0 门禁 —— 通过 `WEBGL_lose_context` 模拟 WebGL 上下文丢失（叠加层出现、画布恢复），以及通过仅开发环境的 `?panelfail=<surface>` 钩子**强制渲染抛出**（失败被包含、应用继续工作、Retry 恢复面板）。传入一个已有 URL 可复用正在运行的服务器。**v7 收尾：**每个承重裁决现在都由 `scripts/verify/checks.mjs` 决定，该轮使用**每次运行全新的 Chrome profile**，并在读取启动状态前清空 `localStorage`/`sessionStorage`（因此被持久化的 `neuroaxis.viewPreset` 绝不可能伪装成错误的默认值），且 CT/模态检查感知覆盖范围。**v9：**PiP 检查被重新指向模拟切面面板（启动时的结构、逐轴徽章 + 读数、可缩放/持久化/预设/隐藏+恢复、面板对 Plates 模态的独立性），而退役的 `.pip-backdrop-hint` / `.pip-context-lost` 检查现在断言那些退役元素**不存在**。**v10（由该轮的 `review-qa` 任务重新指向）：**一个 Node 侧 **"v10 source facts"** 块从已交付源码读取 `CLIP_BOUNDS`、`GRID_CELL_AU`、`MIN_DIVISION_*` 阈值、`SECTION_PIP_SIZE_MIN/MAX`、`NO_CANVAS_LABEL_RECORD_IDS`、`DIVISIONS` 与 `REGION_LABELS`，因此没有任何浏览器断言会重打某个数字；一个通过 `THREE.__THREE_DEVTOOLS__` 安装的 **three.js 场景桥**让*渲染出的*辅助器几何与网格集合可读；并且 **Q0–Q6** 块（约 120 条断言）覆盖辅助器片的渲染跨度 vs DOM 滑块、驱动图例 + 树 + 场景的分区 solo、带停靠固定边的真实逐角指针拖动、Plates **与** PiP 中的产物平面，以及被抑制的皮层标签并做悬停/点击清扫。唯一的就地编辑是 `node:fs` 导入与经批准的重新指向 `pipBoot.resizer === 1 → === 4`；没有任何既有检查被删除或削弱 |
| `node scripts/verify/budget-report.mjs` | **预算重推导门禁，无前置条件**（v7 收尾）：仅从**已提交**产物重新推导三个硬上限 —— Σ `parts[].triCount` 对照 ≤ 800,000、Σ `stat(part.file)` 对照 ≤ 14 MiB **外加**更严格的整个 `src/assets/anatomy` 读数，以及 `src/assets/imaging` 上的 Σ `stat()` 对照 ≤ 10 MiB —— 打印部件构成与最大网格，并在任何超限时以 1 退出。它有意**不**重新烘焙：如果 manifest 与其资产曾经不一致，本门禁与 `build-anatomy-geometry.mjs --manifest` 会各自独立地说出来 |
| `node scripts/verify/closure-bite.mjs` | **收尾的变异证明**（v7 收尾）：在一份隔离的树副本中（`.plate-scratch/bite/tree` + 一个 `node_modules` junction）为每个已闭合缺口重新施加确切的修复前缺陷，并要求 `audit-checks.test.mjs` 以预期文本**失败** —— 7/7 被捕获。它打印失败检查自己的句子、退出码，以及每个被变异文件前后的 SHA-256，从而“共享树从未被触碰”是被测量的（本沙箱阻断管道化的子进程 stdio，因此输出通过文件描述符捕获）。**v10：**它又变绿了 —— 其未变异的参照运行（`audit-checks.test.mjs`）现在是 92/0，因此变异证明抵达一个绿色基线：**7/7 变异被捕获 · 共享树未被触碰 · 恢复后的副本 92 通过 · 0 失败**（exit 0） |
| `node scripts/verify/boundary-contract.mjs` | **错误边界门禁，无浏览器**（`scripts/verify/boundary-contract.mjs`）：通过已安装的 TypeScript 编译器加载已交付的边界组件并驱动其真实状态转换 —— 健康渲染原样返回子节点、一次抛出渲染带 `data-panel-error` 的 `role="alert"` 卡片、Retry 清除错误，并且全部七个 App 级呈现面与两个 PlatesTab 模式都被包裹。这与审计的强制抛出所证明的是同一个主张，只是面向无法启动 Chrome 的环境 |
| `node scripts/verify/a11y-contract.mjs` | **a11y 门禁，无浏览器**：读取共享源文件与已交付包以核对键盘/AX 契约（图版区域可聚焦且有可访问名称、隐藏面板 `inert`、模态陷阱/恢复、`aria-activedescendant`、焦点环、≥24 px 命中区、favicon） |

`validate`、`check`、`build`、`verify:pipeline`、`verify:plane`、`verify:plane-helper-extent`、
`verify:somatotopy`、`verify:cortical-lobes`、`verify:pip-contract`、`verify:division-toggles`、
`verify:area-toggles`、`verify:view-filter-consistency`、**`verify:cranial-nerves`**、**`verify:nerve-kind`**、
**`verify:cranial-nerve-courses`**、**`verify:cranial-nerve-render`**、**`verify:vasc-courses`**、
**`verify:vessel-render`**、`a11y-contract`、
`boundary-contract`、`budget-report.mjs` 与 `build-anatomy-geometry.mjs --manifest` 全
都必须以 0 退出；
`npm run validate` 是提交前的数据权威（计划 §9）。Node 门禁被有意接成普通的 `node` 入口
点 —— 它们没有外部前置条件，因此可以从任何检出中作为证据引用。
**在 v10 收尾时有两个门禁在 agent 沙箱中为红**（`verify:anatomy`、`verify:imaging-fit`）：二者都在
`spawnSync … EPERM` 上、**在打印任何裁决之前**中止 —— 沙箱拒绝子进程管道化的 stdio —— 二者在
基线即为红，都不在任何 v10 任务的写入范围内，并且**二者在这里都不被主张为绿**。在 v9 收尾时为红
的三个门禁（除 `verify:imaging-fit` 外，还有 `verify:audit-checks` 与 `closure-bite.mjs`）被
v10 清扫重新测得：`verify:audit-checks` 为 **92 通过 · 0 失败**，`closure-bite.mjs` 对绿色基线捕获
**7/7** 个变异。**v11 重新测量了两个红门禁**（完全相同的 `spawnSync … EPERM`，0 条
断言运行 —— 环境性、未变、不在任何 v11 任务的写入范围内），并重新测量了整个约束清单：
v11 集成者清扫见 [v11 验证](#verification-v11-close-out-non-browser)，包括两个新
门禁 `verify:area-toggles`（**331/0**）与 `verify:view-filter-consistency`（**100/100**）。
**v14 重新测量了整个清单**（带每个退出码与打印尾部的清扫见
[`docs/SWARM_V14_PLAN.md`](docs/SWARM_V14_PLAN.md) §8）：**21 绿 · 2 环境红 · 0 产品红**，其中
两个新门禁 `verify:cranial-nerve-courses`（**220/0**）与 `verify:cranial-nerve-render`（**47/47**）已接成
npm 脚本并**通过 npm** 执行，因此接线本身也被测试。`verify:anatomy` 与
`verify:imaging-fit` 以相同方式失败（`spawnSync … EPERM`，**0 个裁决**）；`verify:anatomy` 唯一被阻断的
测量 —— `src/assets/anatomy` 目录大小 —— 直接重跑返回
**14,566,178 B**，未变。任务书中关于 **`verify:area-toggles` 的“已知为红”说明已经过时**：它以 **0**
退出，带 **455 条断言 · 0 失败**，而 v11 第 4 项的分歧（画布在 y = 6/26/30/32 处绘制了规则
排除的分区）**以一致性 6/6 闭合** —— 产品从未为迎合任何一个门禁而被掰回去。
**v17 第三次重新测量了整个清单**（带每个退出码与打印尾部的清扫见
[`docs/SWARM_V17_PLAN.md`](docs/SWARM_V17_PLAN.md) §7）：**27 条门禁命令 · 24 绿 · 2 环境红 · 1 产品红**，其中
两个新门禁 —— `verify:vasc-courses`（**2,171 条断言 · 0 失败**）与 `verify:vessel-render`（**75/75**）——
已接成 npm 脚本并**通过 npm** 执行，因此接线本身也被测试。唯一的产品红门禁是
`verify:cranial-nerve-render`，为 **46/47**：它的 `partsForCanvas()` 恒等式仍写着 `138 + 12`，而现在找到
**190 = 138 + 12 + 40**，因为 v17 正是按计划加入了血管部件。它是**计数过期的断言，而不是坏掉的产品**；
重新指向（`+ SECTION_VESSEL_PARTS.length`）不属于任何 v17 任务的写入范围，因此它连同输出被如实报告，
并且**该门禁没有被一只非属主的手改掉**。任务书点名的另一个红门禁 `verify:area-toggles` 在本轮评审把它的
分节计数重新指向已交付表格之后为**绿：472 条断言 · 0 失败**，而 `verify:audit` 中的四处预设点击位点
也已被重新指向并由 `verify:area-toggles` §11 守卫（浏览器通道本身仍归编排器）。

**浏览器通道的退出码**（`verify:audit`、`verify:acceptance`、`verify:browser`）—— 环境失败绝不能看起来像产品失败：

| 退出码 | 含义 |
| --- | --- |
| `0` | 每个检查都运行并通过 |
| `1` | 检查运行并**失败** —— 唯一“产品坏了”的信号 |
| `2` | 缺少静态前置条件（没有 Chrome 二进制；设置 `CHROME_PATH` 可覆盖搜索） |
| `3` | **环境不可用** —— 目标 URL 没有服务器应答，而脚本启动的那个从未就绪（30 s 上限） |
| `4` | **环境不可用** —— Chrome 无法启动 / 其 DevTools 端点从未应答。在受限沙箱中通常的原因是 crashpad：`OpenProcess: Access is denied (0x5)`；脚本会打印 Chrome 自己的最后几行 stderr |

该通道是自足式的：当 URL 尚未被服务时，它自己启动 Vite（直接启动，带 `--strictPort`，因此它只拥有一个进程），等待 HTTP 200，并在成功、检查失败、超时、异常以及 `SIGINT`/`SIGTERM` 时杀掉整个进程树 —— 外加 Chrome。就绪探测使用 `localhost`，绝不用 `127.0.0.1`（Vite 默认只绑定 IPv6，`127.0.0.1` 会被拒绝）。

## 内容范围

以下所有数字均由集成时的 `npm run validate` 产出：

| 内容 | 数量 |
| --- | --- |
| 结构（核团、脑室、表面、context、**脑神经**、**血管**） | **241 条记录**（`structures/*.json` 中的 264 条记录减去 23 条纤维束） |
| 纤维束与通路（带路点、交叉、躯体定位） | **23 条记录** |
| 脑神经（kind `nerve`、id 前缀 `nrv-`、作者撰写走行几何 —— v13/v14） | **12 条记录**（CN I Olfactory … CN XII Hypoglossal） |
| 脑血管（kind `vessel`、id 前缀 `vasc-`） | **53 条记录** —— v8 的 14 条动脉（30 个已烘焙 GLB 部件）+ **39 条细粒度走行**（v17，程序化管道，0 字节） |
| 细粒度血管走行（v17：路点 + 半径 + 声明的曲面） | **40 条已交付走行**（39 条作者撰写 + 1 条内置总记录）· 172 个路点 · **77 根绘制管道** |
| 注册表条目（分类学树 + 搜索；每个作者撰写的 id 都已注册） | **287 条** |
| 规范层级（头尾侧锚点，y = −50…+78 au） | **17 个层级** |
| 2D 断面图版 | **15 张**（11 张横断 + 2 张矢状 + 2 张冠状） |
| 临床综合征 | **26 张卡片** |

> 截至 **v9** 的计数（收尾时测得，`npm run validate`）：236 条注册表条目 · 17 个文件中的 213 条记录 ·
> 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个层级，**0 错误、0 警告**。v9 的内容增量为
> **16 条新记录**（M1/S1 躯体定位节段）及其注册表行 —— 没有任何既有内容被
> 编辑、重命名或移动，并且 y = +45 以下没有任何东西移动。更早的里程碑：v7 加入端脑
> （42 条结构记录、4 条纤维束、46 条注册表条目、4 个层级、3 张图版，层级现在延伸到 y = +78）；
> v8 加入 43 条记录，包括 14 条动脉。
>
> **v10 与 v11 完全没有新增内容。** v11 清扫的 `npm run validate` 报告相同的清单
> （236 / 213 / 23 / 26 / 15 / 17，0 错误 / 0 警告），而 v11 的 Areas/Systems 两行是**对
> 既有分类学区域与 kind 的显示分组** —— 236 条条目中的每一条都恰好属于一个
> area 按钮与一个 system 按钮，由 `npm run verify:area-toggles` 测得。
>
> **v13 新增了内容** —— 十二对脑神经：2 个新文件中的 **12 条结构记录**
> （`telencephalon-cranial-nerves.json`、`brainstem-cranial-nerves.json`），新第七个
> kind `nerve` 下的 12 行注册表条目，以及 12 条精选网络参考。收尾时由 `npm run validate` 测得：**248 条注册表
> 条目 · 19 个文件中的 225 条记录 · 23 条纤维束 · 26 个综合征 · 15 张图版 · 17 个层级，0 错误 / 0 警告**。
> 没有任何既有内容被编辑、重命名或移动 —— 追加这 12 行是 `taxonomy.json`
> 唯一的改动（早先的一行多了一个尾随逗号）—— 并且**没有任何网格、GLB、manifest 部件或 bbox 移动**。
>
> **v14 加入的是走行几何，而不是记录** —— 十二行 `nrv-*` 注册表条目未变；走行是一个独立集合
> （`NERVE_COURSES`），其管道花费 **0 字节**。
>
> **v17 新增内容** —— 细粒度血管：一个新文件（`src/data/structures/vasculature-courses.json`）中的
> **39 条作者撰写走行记录**、**39 行新注册表条目**（把 `vessel` 从 14 带到 **53**），以及 39 条精选网络参考。
> 收尾时由 `npm run validate` 测得：**287 条注册表条目 · 20 个文件中的 264 条记录 · 23 条纤维束 · 26 个综合征 ·
> 15 张图版 · 17 个层级，0 错误 / 0 警告**。增量是 **+39 条记录 / +39 行注册表条目，仅此而已**：没有任何网格、
> GLB、manifest 部件、包围盒或既有记录被触碰，本轮新增 **0 字节**已提交载荷。该图层的解剖、局限与门禁见
> [细粒度血管层（v17）](#the-granular-vasculature-layer-v17--53-vessel-records-authored-courses-no-blobs)。

血管供血区以字符串字段承载（每个结构一个 `bloodSupply`，每个综合征一个 `vascularTerritory`），并且自 v8 起
还以 **53 条带真实几何的 `vessel` 记录**承载 —— 其中 13 条（30 个 GLB 部件）由已提交的 BP3D 铸型支撑，
而自 v17 起另有 **40 条作者撰写走行以程序化管道绘制**（细粒度分支与穿通支，包括豆纹动脉群）。每个结构至少跨越 17 个规范层级中的一个；其中一部分层级有匹配的横断图版，而图版的 `data-structure` slug 与 3D 场景解析到同一个注册表（由校验器强制）。

## 项目结构

```
docs/            engineering plan, realism plan + research notes, geometry pipeline,
                 content inventory, attribution
scripts/         validate-data.mjs (data gate) · build-anatomy-geometry.mjs +
                 lib/sdf/ (SDF kernel) + anatomy-recipes/ (anatomy bake CLI)
src/
  App.tsx        shell: header · sidebar · center tabs · info rail
  state/         zustand store (selection, layers, clip planes, quality, syndromes)
  data/          taxonomy.json · levels.json · structures/ · tracts.json ·
                 syndromes/ · plates.json · plates/*.svg · sectionImages.ts
  assets/anatomy committed v2 GLBs + anatomy-manifest.json (+ nuclei-report.json):
                 138 parts, 599,204 rendered tris, 13.82 MiB (v8)
  assets/imaging committed imaging payload (8.71 MiB in 80 files, cap 10 MiB from
                 v7 AMENDMENT B): stain plates + mri-t1.bin + mri-manifest.json
                 + ct.bin + ct-manifest.json, both grids [81, 113, 107], plus the
                 v9 registration records registration-fit.json / plate-fit.json
  components/    Header, SearchBox, TaxonomyTree, LevelRuler, InfoPanel,
                 PlatesTab, PlateRenderer, SyndromeBrowser, ReferencesModal, Legend
  components/viewer3d/   R3F canvas, GLB-backed meshes, tract tubes, clip
                 planes, post FX composer, SomatotopyOverlay (v9 patches),
                 simulated-section panel (v9 - the same 2D renderer as the Plates tab)
  components/section/    2D live-section canvas, corticalLobes (v9 division layer),
                 plane slider strip (Sagittal · x / Coronal · z / Transverse · y),
                 contour worker, real-image layer implementations (photographs +
                 MRI + CT registries, modality resolution, fittedFit preference)
  geometry/      anatomyAssets (GLB loader + manifest), generated (manifest
                 types), materials (PBR factory), envelope (v1 fallbacks),
                 textures (procedural normal maps), curves (cranial-nerve courses),
                 vasculature-courses (v17 granular vessel courses + merge)
  styles/        tokens · base · layout · panels · viewer · plates · sectionPip
```

权威规格是 [docs/ENGINEERING_PLAN.md](docs/ENGINEERING_PLAN.md)（规范坐标 §2、内容清单 §3、数据模型 §4、渲染 §5、图版契约 §6、UI §7、校验 §9）。

## 教育免责声明

NeuroAxis 是一个**示意性学习辅助工具，不是医疗器械，也不是诊断工具**。所有几何都是风格化、教学性的 —— 比例与位置为教学而简化，不能替代经验证的立体定向或影像图谱、组织学或临床判断。引用指向 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md) 中列出的标准教科书；描述是为本项目撰写的原创转述。

## 致谢

- **内容权威**：Blumenfeld, *Neuroanatomy through Clinical Cases*（第 2/3 版）；Patten, *Neurological Differential Diagnosis*；Fix, *High-Yield Neuroanatomy*；Snell, *Clinical Neuroanatomy*；Nolte, *The Human Brain*；*Midbrain, Pons, and Medulla: Anatomy and Syndromes*, RadioGraphics 2019（doi:[10.1148/rg.2019180126](https://pubs.rsna.org/doi/10.1148/rg.2019180126)）。
- **交互设计灵感**：[ashemag/human-atlas](https://github.com/ashemag/human-atlas)（仅 UX 模式 —— 未复用任何代码或数据）。
- **丘脑命名法核对**：FreeSurfer *ThalamicNuclei* 图谱文档。
- **3D 外廓曲面（v2）**：派生自 [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/)，© The Database Center for Life Science，按 CC Attribution 4.0 International 授权 —— 在构建时配准与雕琢；核团、纤维束、图版与文本仍为原创作品（完整溯源见 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)）。
- **所有其他 3D 几何、SVG 图版与文本**：为 NeuroAxis 创作的原创示意作品。MIT 授权 —— 见 [LICENSE](LICENSE)。

