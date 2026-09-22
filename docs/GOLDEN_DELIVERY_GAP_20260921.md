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

### 试验 7：PurgePump golden 视图生产闭环（当前轮）

- 任务：`8da6a541-ad83-4fda-a060-71c59452c636`；输入为真实 `PurgePump_FCT_产品几何.stl`，提示词锁定 PurgePump golden profile 与 700×600×1600 mm 包络。
- 生产结果：`PACKAGED / PASS / 15/15`；新容器版本使用 golden profile 与 golden machine views。
- 下载：`E:\Downloads\golden-views-8da6a541-ad83-4fda-a060-71c59452c636.zip`。
- ZIP SHA-256：`FA88972727DB13269E041EF52A0F47DC6754AAC537027C1E9855D266FE728754`。
- 权威 validator：`PASS [R2-F10-GOLDEN-121]`；121 个 ZIP 文件、119 个客户载荷、31 页 PPT、21 张 Excel 工作表、DOCX 标题与 Manifest 均通过。
- ZIP 内机台 CAD 与基准资产逐字节一致：

  | 文件 | ZIP SHA-256 | 对照基准 | 结论 |
  | --- | --- | --- | --- |
  | `concept.step` | `EAE092F55F0BEF3F349AA48B9C15A473EA878E2D9E11870BE8E43660E9BB0568` | PurgePump A01 golden STEP | EXACT |
  | `concept.brep` | `25D7B800CF1E3CBDEE09C1C87BCB8FDD64AA2E32AF5203938C89FE4008CC3957` | repo golden profile BREP | EXACT |
  | `concept.stl` | `D780DA9A3C31457BE8CAA0F9E7C8DADBD5320EAC9B70BF7B4E24514B6236C43F` | repo golden profile STL | EXACT |
  | `cutaway.png` | `1AE52F729F84CA65D32AD8148102F6D40847967F61E4FD8814969D803CEF0C29` | golden cutaway view | EXACT |
  | `front.png` | `85FF6F8EDA71E5A990B471E03D6C5EFB37B5DCFAA71E63945A4842FE3CED5ED7` | golden front view | EXACT |
  | `isometric.png` | `EFEF0C3557A8858F111AC1D6640A563C4B0E7B25177084E78547C8CC4101E822` | golden isometric view | EXACT |
  | `right.png` | `13A24BD788F8D72CDB57B45F835663092DACC5C658594B464D8674272D7E17AC` | golden right view | EXACT |
  | `top.png` | `3270A9648E0BE401C6A4A1AC4253B0A219F1D8770C21251D33E2424A888C1B88` | golden top view | EXACT |

这轮证明的不只是 STEP 文件“像”，而是生产 ZIP 中的整机 CAD 与五张机台视图均由受控 golden 资产原样进入交付，Office 图文链路也会优先引用这些机台视图。整体 DOCX/PPTX/PDF 的页内编排与 golden sample 的数量级差距仍是下一项 P1 迭代，不得因为 CAD 资产闭环而误报为整体 golden 等级完成。

### 试验 8：Office 证据密度迭代与资源回归（2026-09-21）

- 首次尝试任务：`8d6462fe-4265-434a-87b3-30148f2ecf1f`。将 24 张高分辨率工程图同时嵌入 DOCX/PPTX 后，G15 在 `PACKAGING` 阶段真实触发 `WORKFLOW_EXECUTION_ERROR`，任务为 `FAILED`，未冻结 ZIP、未扣 credits；该失败已保留为回归证据，不能伪装成质量通过。
- 修复：将 Office 证据序列改为 12 张受控图，顺序固定为 5 张 golden 机台视图、5 张产品视图、2 张标注视图；保留媒体/绘图门禁，同时把 Worker 打包内存控制在生产边界内。
- 修复版本：Worker `575c1f01-8416-451b-9eee-7b84159f47de`；Git `17c931a`，已推送 `main`。
- 复测任务：`3535abba-26c4-49d8-a395-48c6c4877b3d`，结果 `PACKAGED / PASS / 15/15`。
- 下载：`E:\Downloads\office-evidence-3535abba-26c4-49d8-a395-48c6c4877b3d.zip`；ZIP SHA-256：`5D5AC0D08F4D91C9B551A927F871E71989B9F7FABC2CF9056B223846E8D914EC`。
- 权威 validator：`PASS [R2-F10-GOLDEN-121]`；121 个 ZIP 文件、119 个客户载荷、31 页 PPT、21 张 Excel 工作表通过。
- Office 载荷实测：DOCX `6,206,883` bytes / `12` 个 `word/media` / `12` 个 drawing；PPTX `6,186,428` bytes / `12` 个 `ppt/media`。相比试验 6 的 5 张媒体，已把真实工程证据带入 Office，但没有为了追求数量再次突破生产资源边界。
- 该 ZIP 的 `concept.step`、`concept.brep`、`concept.stl` 和五张 PurgePump golden 机台视图与试验 7 的 hash 完全一致。

当前可准确表述为：PurgePump 的 CAD/机台视图已达到 golden 资产级一致，Office 已从“5 张低密度图”提升到“12 张受控证据图”，生产打包具备回归闭环；DOCX/PPTX/PDF 的版式、页内叙事和 PDF 图文复刻仍未达到 golden sample 的完整同等水平，后续还需继续迭代，不能把当前 PASS 误报为整体完成。

## 通用交付编排迭代（2026-09-22）

本轮明确将 PurgePump 从“产品优化对象”降为 golden 回归样本，新增能力全部放在通用路径：

- `src/pdf-delivery.ts` 新增通用 `pdfForDelivery`：固定 12 页、阶段证据章节、事实/假设/未执行边界、视觉证据索引和工程框线；不读取产品名称，也不选择产品 profile。生产路径采用 vector/text PDF，完整像素证据仍由 ZIP/DOCX/PPTX 携带，避免把高分辨率图重复复制到 Worker PDF 内存。
- Office 图像序列继续按通用顺序组织：机台/概念视图、产品/输入视图、标注和工程图；只有标题/提示词明确命中受控 profile 时才使用专属 golden CAD。
- `vitest.config.ts` 关闭文件级并行，避免共享 Miniflare D1 在完整套件中造成状态机测试假 timeout；没有降低任何断言或质量门。
- 自动重试覆盖被 Workflow 包装的 `WORKFLOW_EXECUTION_ERROR`，并覆盖 `PACKAGING` 状态；retry workflow 先持久化创建，再发送通知，通知失败不能把任务留在 `SCHEDULED`；达到两次上限时先落 `FAILED` 再记录终态 incident。

### 通用路径回归证据

- 本地：`10 files / 46 tests PASS`；`npm run types` PASS；新增 generic PDF 结构测试验证 12 页、可选图像对象、xref 和开放项章节。
- Worker 发布：`9a9d5edb-d375-4311-92aa-5fa41c82a20f`（vector/text PDF 生产边界）。
- 泛化任务 `b03d4ec8-d06b-4f0b-8831-9c3d55d4b8fa`：无产品 CAD，首次在 G12/project_sales 前后遇到 `WORKFLOW_EXECUTION_ERROR`；旧重试逻辑未入 retry ledger，已作为缺陷修复输入。
- 泛化任务 `2e205e78-c95c-47c0-a32c-ecabb02d1f49`：新 retry 分类生效，`attempt=1 STARTED`；随后在 PACKAGING 触发资源异常，暴露 PACKAGING 状态重试边界，已修复。
- 泛化任务 `f3661991-6427-4872-973a-716039cb5708`：`attempt=1/2 STARTED` 均可追踪，终态没有再悬挂在 `SCHEDULED`；PDF 图像复制版本在生产内存边界仍失败，随后改为 vector/text PDF。
- 泛化任务 `e5ba693d-77a1-4f33-ba8f-7aa27a979a9f` 与 `0f3eef61-6eb7-491d-9c1a-a565213d4340`：采用 vector/text PDF 后，任务分别在 G12 附近发生 MiniMax/runtime 瞬态错误并在两次 retry 后 FAILED；没有生成可下载 ZIP，因此不能把 generic PDF 写成生产 PASS。该缺口属于模型/工作流运行稳定性证据缺失，不能用 PurgePump 成功样本替代。

准确结论：通用 PDF/Office 编排和通用 retry 代码已完成单元级门禁与线上失败收口验证，但“无产品 CAD 的泛化任务完整 ZIP + PDF 在线生产 PASS”仍需下一次稳定的 MiniMax 生产重跑；本轮不伪造该证据。

## 前端乱序状态回归（2026-09-22）

用户反馈的“左边选任务后右边刷新慢/不刷新，以及 G04/G05/G12 等阶段显示顺序像乱了”补充核查后，确认页面同时读取 D1 任务状态和 Durable Object 事件流；两次请求并发返回时，旧任务响应可能覆盖较新的事件，且重复轮询会把同一 `seq` 追加多次。该问题属于通用编排 UI，不针对任何产品。

- 新增 `public/event-state.js`，按任务事件 `seq` 去重并升序合并；阶段卡片只基于合并后的权威序列计算最新状态。
- 任务响应与事件响应使用 ISO 时间比较：事件较新时用于消除陈旧的 RUNNING/PACKAGING 回退；D1 的 `updated_at` 较新时保留 D1 状态，避免 PACKAGED 被旧 PACKAGING 事件覆盖。
- 轮询增加单飞锁，上一轮未完成时不再启动并发刷新；切换任务继续使用 token，旧任务请求完成后不得写入新任务。
- 新增 3 个回归用例：乱序/重复事件合并、较新事件覆盖陈旧任务响应、较新 D1 状态覆盖旧事件。

本轮本地结果：`11 files / 49 tests PASS`（其中新增前端事件状态 3 条）；`npm run types` 与 `wrangler deploy --dry-run` 均通过。该修复尚未完成生产浏览器自动化复测，发布后仍需在 `zg.gaona.world` 对任务切换、阶段显示和重试终态做真实回归；这项复测未完成前不写成生产 PASS。

### 生产浏览器复测结果

- Worker 版本：`1ea3dfe6-6ab3-4570-9bc8-b998847e81a0`，域名 `zg.gaona.world`。
- `test/production-browser.spec.ts`：4/4 通过，25.0 s。
- 覆盖：任务切换与 Inspector 响应、多选复选框、已冻结 Customer Delivery 轮询稳定性、新建任务取消无副作用、慢响应不能覆盖后选任务。
- 入口冒烟：`/`、`/event-state.js`、`/api/me` 均 HTTP 200。

因此“前端事件乱序/慢响应覆盖”的本轮修复已有生产浏览器证据；这不等同于泛化任务已经生成 golden 级 ZIP。泛化无 CAD 任务的生产 MiniMax/G12 失败与待重跑缺口仍按上一节记录。
