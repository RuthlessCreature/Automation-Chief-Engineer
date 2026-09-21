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
