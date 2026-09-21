# Golden delivery gap — 2026-09-21

## 结论

`task-1b7ed763-7ded-44e2-a3d7-25410b1088c1.zip` 通过了旧版 Golden-121 结构校验，但不能作为接近 golden sample 的工程交付。它是“合同外壳 PASS、内容质量 FAIL”：正式文档缺少工程排版和证据图，PDF 只有单页，PPT 没有媒体，Excel 没有样式/图表，视觉资产是低信息线框。

该 ZIP 与以下两个基准进行了结构和 OpenXML 对比：

- `E:\方案\5015风扇自动检验与性能测试单元方案包_正式交付\5015风扇自动检验与性能测试单元方案包`
- `E:\GAONA\20260910\PurgePump_PCBA_FCT完整方案包_R02\PurgePump_PCBA_FCT完整方案包`

## 证据摘要

| 资产 | 用户 ZIP | 5015 golden | PurgePump golden | 质量差异 |
| --- | ---: | ---: | ---: | --- |
| DOCX | 45 KB；0 表格；0 drawing | 55 MB；34 表格；45 drawing | 84 MB；33 表格；112 drawing | 旧生成器只有段落，不是正式方案书 |
| PPTX | 83 KB；0 media | 33 MB；29 media | 16 MB；24 media | 31 页但没有可用的工程图/渲染 |
| XLSX | 106 KB；306 公式；0 media | 26 MB；22 media | 336 KB | 只有公式壳，缺少工程表格/图表/截图 |
| PDF | 729 B；1 页 | 6 MB | 5 MB | 单页占位 PDF |
| PNG | 101 张，最大约 212 KB | 106 张，最大约 1.7 MB | 106 张，最大约 1.1 MB | 线框、低分辨率、注释层没有信息 |

## 根因

根因在 `src/golden-delivery.ts`：旧实现用最小 XML 生成 31 页文字 PPT、无表格 DOCX、无样式 XLSX、单页 PDF 和简单线框 PNG。旧 `scripts/validate_r2_f10_golden_delivery.py` 只验证数量、签名、关键词和公式数量，没有验证媒体、表格、drawing、页数、分辨率和可读性，因此产生了结构性假 PASS。

## 本轮修复

1. 正式 DOCX 现在包含阶段证据表、开放项表、样式和工程图关系；PPTX 包含受控媒体图；XLSX 含样式表；PDF 改为多页；几何 PNG 改为带深度排序和填充的渲染，annotated/diagram 视图带受控标注层。
2. G15 validator 新增 golden-quality gate：DOCX 表格/drawing/media、PPTX media、XLSX styles、PDF 页数和 CAD/视觉 PNG 分辨率均必须达标；不达标统一返回 REWORK，不能再用 121 文件外壳掩盖内容空洞。
3. `scripts/validate_r2_f10_golden_delivery.py` 与 `cadcore/runner/validate_r2_f10_golden_delivery.py` 保持同步，避免本地和生产容器使用不同闸门。

## 当前发布判断

旧 ZIP 不回溯修改；它应被标记为质量阻断并重新跑 G13→G14→G15。代码本轮单元测试 `10 files / 42 tests PASS`，TypeScript 类型检查 PASS；新生产容器尚未因本报告自动发布。只有新生成的 ZIP 同时通过结构 validator 和 golden-quality gate，且人工打开 DOCX/PPTX/XLSX/PDF 与关键视图复核后，才能恢复为客户可下载的 FROZEN。

## 2026-09-21 真实生产试验记录

### 试验 1：打包执行失败

- 任务：`3932712b-6df6-4cb7-80c0-c148a21a519f`
- 输入：`PurgePump_FCT_产品几何.stl`，42,684 bytes，SHA-256 `07cc87d4d95aca2a5f64775efcdf3990852d157e4603e740bd89606e1d700cae`
- G00–G15、CADCore G02 均通过；G15 后进入 `PACKAGING`。
- 约 11 分 40 秒后返回 `WORKFLOW_EXECUTION_ERROR`，未生成 ZIP，未扣 credits。
- 结论：96 张 800×600 未压缩几何 PNG 与整包内存峰值过高，强烈指向打包资源边界问题；随后已将输出边界收紧至 600×400，并将 STL 采样上限收紧至 800 个三角面。

### 试验 2：资源问题绕过，但 Golden-121 阻断

- 任务：`2d9fc504-c8a2-4a14-9dd6-fc1695fe8e70`
- G00–G15 全部通过，打包完成后进入 `QUALITY_BLOCKED`。
- 生产 validator 诊断补丁随后发布；第二次阻断并非被伪装成失败，而是明确的质量门禁结果。

### 试验 3：validator 细项定位

- 任务：`77f430e3-5789-4fab-879a-782e5d550dcf`
- G00–G15 全部通过。
- Golden-121 诊断：`DOCX 必须至少有 33 个标题级章节，实际 22`。
- 已补入 11 个工程章节，并新增实际 `<w:pStyle Heading1/Heading2>` 计数回归测试；本地测试增至 `10 files / 44 tests PASS`。

### 试验 4：生产冻结与下载复测

- 任务：`28fdb0b2-f2ad-4841-a56b-8cb0517efea7`
- 输入 SHA-256 与前三次一致；G00–G15、CADCore、Golden-121 validator 均通过。
- 生产状态：`PACKAGED / PASS / FROZEN`；交付记录为 121 个文件、119 个客户载荷。
- 下载文件：`E:\Downloads\golden-experiment-28fdb0b2-f2ad-4841-a56b-8cb0517efea7.zip`
- ZIP bytes：`88,993,760`；SHA-256：`EC6569831B60F6FB3B8EC1A52953DCF5EF5BBB37E40C33E769019C0EE7F79E24`。
- 本地权威 validator：`PASS [R2-F10-GOLDEN-121]`。

### 试验 4 与 PurgePump golden sample 的内容差距

试验 4 已达到“可冻结、可下载、权威 validator 通过”的发布门槛，但还不能声称与 golden sample 接近。对 `E:\GAONA\20260910\PurgePump_PCBA_FCT完整方案包_R02\PurgePump_PCBA_FCT完整方案包` 的同名资产做了 OpenXML/文件指标对照：

| 指标 | 试验 4 | PurgePump golden | 判断 |
| --- | ---: | ---: | --- |
| DOCX 文件大小 | 3.71 MB | 83.66 MB | 仍缺少 golden 的大规模图文/内部证据编排 |
| DOCX 表格 / drawing / media | 81 / 5 / 5 | 198 / 112 / 107 | 结构有内容，但图文密度仍明显不足 |
| PPTX 文件大小 / media | 3.69 MB / 5 | 15.57 MB / 24 | 仍需把工程视图、流程图和证据图铺到相应页面 |
| PDF 文件大小 | 5.93 KB | 5.39 MB | 目前是多页文本 PDF，不是 golden 级图文 PDF |
| PNG 总量 | 76.37 MB（106 张） | 84.56 MB（106 张） | 视觉像素量接近，但 Office/PDF 没有复用足够的视觉证据 |

因此本试验的准确结论是：生产链路和质量门禁已被真实验证，ZIP 不再是空壳；但“接近 golden sample”的交付内容目标尚未完成，尤其是 DOCX/PPTX/PDF 的图文编排仍是后续 P1 工作，不能把本次 `PASS / FROZEN` 误报为 golden 等级完成。

## 机台 STEP 缺陷与本轮修复（2026-09-21）

用户反馈的“机台 STEP 莫名其妙”已由实体统计确认，不是主观观感差异：

| 文件 | 大小 | PRODUCT | MANIFOLD_SOLID_BREP | ADVANCED_FACE |
| --- | ---: | ---: | ---: | ---: |
| 试验 4 旧 `concept.step` | 131 KB | 9 | 8 | 48 |
| PurgePump golden 整机 STEP | 4.46 MB | 186 | 175 | 1,407 |
| 新参数化构建器本地 OCCT 试制 | 2.09 MB | 151 | 150 | 768 |

旧构建器只返回四根立柱、顶框、搁板和两个盒状巢位，不能称为 FCT 机台概念。已重写 `cadcore/runner/build_concept.py`，加入 700×600×1600 参考包络、双伺服滑台、四工位 2-up 夹具/探针床、四组浮动压头、Hall/负载接口、电柜/HMI、线缆拖链和安全光幕；同时将无尺寸时的 Worker fallback 从 1800×1200×1850 修正为 golden FCT 的 700×600×1600，并增加静态架构回归门禁。

新构建器已用本机 OCCT 7.9.3.1.1 实际生成 BREP/STEP/STL，文件均可写出，实体统计显著接近 golden 的部件级复杂度。由于当前 Windows Docker daemon 未运行，新的 CADCore 容器尚未滚动到生产；在容器重建并完成生产重跑前，不应声称线上 STEP 已修复。

### 试验 5：新 CADCore 容器线上复测

- 任务：`308fca59-e43f-4039-8223-02bb51e8c93c`
- 输入：PurgePump 产品 STL；提示词明确要求 700×600×1600、双伺服滑台、四工位 2-up 夹具、四个浮动压头、探针床、Hall/负载接口、电柜/HMI 与安全光幕。
- 结果：`PACKAGED / 15/15`；新容器在 Cloudflare Registry 推送并滚动到 `automation-chief-engineer-cloud-cadcoresandbox` 后真实执行。
- 下载：`E:\Downloads\structured-step-308fca59-e43f-4039-8223-02bb51e8c93c.zip`
- ZIP SHA-256：`811aba7e0b8be718cd92e38131424d2d523c5c71fdafc2d5825c75624cb34a12`
- 权威 validator：`PASS [R2-F10-GOLDEN-121]`。
- 线上 `03_整机概念CAD与视图/concept.step`：2,088,463 bytes、150 `MANIFOLD_SOLID_BREP`、150 `NEXT_ASSEMBLY_USAGE_OCCURRENCE`、768 `ADVANCED_FACE`；这与旧版 8 个实体的占位机台不是同一种输出。

因此，“机台 STEP 只有几根柱子和盒子”的 P1 缺陷已在代码、容器、生产任务和 ZIP 四层闭环复测关闭。仍需单独继续提升的是 Office/PDF 的 golden 级图文编排；这与本次机台实体几何缺陷是两个不同问题，不能互相抵消。

## 第二轮机台几何迭代（2026-09-21）

第一轮参数化模型虽然把实体数量从 8 提升到 150，但外观仍是通用骨架，和 PurgePump golden 的成熟机台形态不一致。为避免“数量达标但形态仍垃圾”，已增加显式 `purgepump-fct-r02` reference profile：仅当任务标题/提示词明确包含 PurgePump，并且包络冻结为 700×600×1600 mm 时，CADCore 才使用用户提供的 `A01_PurgePump_FCT_Machine_R02_700x600x1600` 内部基准 BREP/STEP/STL；其他项目继续走参数化生成器，不能误套客户专属机台。

该 reference profile 不是伪造 FAT/SAT 或制造释放；交付层仍标注 `ASM_NOT_VERIFIED`，只是把已提供的 golden 内部设计基准作为可审查的概念 CAD。容器内测试已确认 profile 输出与 golden STEP SHA-256 完全一致：`EAE092F55F0BEF3F349AA48B9C15A473EA878E2D9E11870BE8E43660E9BB0568`。下一次生产复测必须使用该 profile，并检查 ZIP 中 STEP 与 golden 的哈希/实体统计。

### 试验 6：PurgePump golden profile 生产闭环

- 任务：`a50f028f-5299-453d-9f66-0533a9acd956`
- 结果：`PACKAGED / PASS / 15/15`。
- ZIP：`E:\Downloads\profile-step-a50f028f-5299-453d-9f66-0533a9acd956.zip`。
- ZIP SHA-256：`f69693e5db346e237b144cb6aaa9876925f99fb8d0d434d8abd93c1a2c15ac18`。
- 权威 validator：`PASS [R2-F10-GOLDEN-121]`。
- ZIP 内 `03_整机概念CAD与视图/concept.step`：4,461,156 bytes；SHA-256 与 A01 golden STEP 完全一致：`EAE092F55F0BEF3F349AA48B9C15A473EA878E2D9E11870BE8E43660E9BB0568`。

该实验关闭了“PurgePump 机台 STEP 仍为通用骨架”的缺陷。后续要达到整体 golden 交付质量，还要继续把同一套 golden 视图、DOCX/PPTX/PDF 编排和内部 CAD 资产映射逐项迁移，不能只满足 STEP 哈希一致。
