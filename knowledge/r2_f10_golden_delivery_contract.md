# R2-F10-GOLDEN-121 全量交付合同

## 1. 目的与适用范围

`R2-F10-GOLDEN-121` 是非标自动化**完整项目、一次性交付**的默认强制交付合同。它源自经过审查的 5015 风扇自动检验与性能测试单元正式交付包，锁定的是：

- 客户 ZIP 的目录结构、文件类型、文件数量和可验证性；
- 正式 Word / PDF / PPT / Excel 的工程覆盖范围；
- CAD、标准视图、工程视觉、交付清单之间的可追溯关系；
- 模型能力下降时不得静默删减、用空壳文件凑数，或把未执行验证写成 PASS。

它**不**要求把 5015 的型号、尺寸、节拍、成本或项目事实复制到其他项目。每个项目的事实必须来自 PEM 与可追溯证据；本合同固定的是交付槽位和覆盖深度。对于项目不适用的可选项，必须在对应正式章节和开放项中明确标为 `N/A` 并说明理由，不能删除该槽位。

仅在用户明确要求单模块、轻量交付，或书面批准另一份 Delivery Contract 时，才允许偏离本合同。模型不得因 token、工具、时间或能力限制自行降级。

## 2. 发布状态与失败行为

在 `R2-F10-GOLDEN-121` 下，以下两项同时成立才允许 G15 `PASS`：

1. 每个必需槽位都有真实、非零、可打开且语义可用的资产；
2. `scripts/validate_r2_f10_golden_delivery.py <final.zip>` 返回 `PASS`。

`PARTIAL`、`TBD`、`N/A`、`PLANNED_NOT_EXECUTED` 可以出现在成熟度、开放项和真实资产内容中，但不能用来伪造或替代必需的 CAD、Office、图像、清单或 ZIP 槽位。某项必需资产无法真实生成时，G15 必须 `REWORK`；不得把不合格包称为“完整交付”。

## 3. 固定 ZIP 文件树与数量

客户 ZIP 根目录必须为 `<项目名称>方案包/`，只包含下列 6 个一级目录和 **121 个文件**。其中 `05_交付清单` 的两个清单文件不参与自身哈希，所以客户载荷为 **119 个文件**。

```text
<项目名称>方案包/
├─ 00_交付说明/                                      # 2
│  ├─ 交付说明.md
│  └─ 开放项与验证状态.csv
├─ 01_正式方案/                                      # 4
│  ├─ <项目名称>技术方案书.docx
│  ├─ <项目名称>技术方案书.pdf
│  ├─ <项目名称>方案汇报.pptx
│  └─ <项目名称>工程数据包.xlsx
├─ 02_产品CAD与视图/                                # 8
│  ├─ 1 × .brep、1 × .step、1 × .stl
│  └─ 5 × 产品标准视图 .png（bottom/front/isometric/right/top）
├─ 03_整机概念CAD与视图/                            # 9
│  ├─ 1 × layout_and_zones.svg
│  ├─ 1 × .brep、1 × .step、1 × .stl
│  └─ 5 × 整机标准视图 .png（cutaway/front/isometric/right/top）
├─ 04_工程视觉/                                     # 96
│  ├─ 01_clean/       90 × 唯一工程洁净视图 .png
│  ├─ 02_annotated/    4 × 标注工程视图 .png
│  └─ 03_diagram/      2 × 工程示意图 .png
└─ 05_交付清单/                                      # 2
   ├─ 交付清单.csv
   └─ 交付清单.json
```

禁止多文件、少文件、重复文件、空文件、无用途的补位文件、`_internal`、Prompt、Agent 日志、PEM 原始数据、调试产物、Rejected Render、临时文件或假文件进入客户 ZIP。

## 4. 正式文档的内容合同

### 4.1 `00_交付说明`

`交付说明.md` 必须说明交付定位、产品几何边界、推荐设备架构和选项、整机概念边界、产能/成本/计划/ROI 的事实边界、验证状态及清单规则。不得把工程概念、估算或计划写成已制造、已验证、已报价或客户已接受。

`开放项与验证状态.csv` 必须至少包含 14 条可追溯开放项，且至少覆盖：DUT ICD/接口、产品语义、条件视觉、可选工位、安全、供应商、MES、POC、MSA/GR&R、FAT、SAT、客户验收、日历计划和 ROI 输入。列固定为：

```text
Open Item ID, 主题, 当前状态, 所需证据, 关闭或启用条件, 责任接口
```

### 4.2 技术方案书（DOCX 与 PDF）

DOCX 与 PDF 必须是同一正式版本、同一项目 ID、同一事实基线的可读正式方案。DOCX 必须至少有 33 个标题级章节：15 个核心工程章节、开放项/成熟度附录、视觉证据导航和 16 页视觉证据附录。核心章节固定为：

1. 方案结论与事实边界
2. 视觉工位与节拍窗口
3. 设备总体与双巢位架构
4. 产品定位、夹持与换型
5. Top 视觉通道
6. Bottom 视觉通道
7. Oblique 视觉通道
8. Dynamic 条件选项
9. L2 参考位可选方案
10. 电气、气路与安全
11. 控制软件、HMI 与 MES
12. 节拍、OEE 与产能情景
13. BOM、制造与成本
14. 验证与验收计划
15. 项目计划、风险与客户输入

每个核心章节至少包含：与 PEM 一致的工程结论、输入/假设/成熟度、一个可追溯证据表或图、以及未执行活动的真实状态。视觉附录每页必须把 `观察目标 → 工程用途 → Visual/Render ID → 成熟度` 闭环，不能只堆图片。

### 4.3 方案汇报（PPTX）

PPTX 必须为 **31 页**，每页一个清晰的评审信息单元，且项目 ID、修订、成熟度和关键参数与 Word/Excel 一致。页序固定为：

1. 封面与方案基线
2. 推荐架构
3. 固定视觉与 Dynamic 边界
4. 产品输入与接口冻结
5. 整机/双巢位机械基线
6. Top 通道
7. Bottom 通道
8. Oblique 通道
9. L2/可选范围
10. 安全、气路与电气
11. 电柜与端接可维护性
12. 控制状态与握手
13. MES/追溯架构
14. 并行节拍与产能
15. 单巢降级情景
16. 成本边界
17. BOM 成熟度
18. 验证覆盖链
19. 关键风险与 POC
20. 项目工作量与计划边界
21. 客户输入
22. ROI 输入与未计算结果
23. 下一步冻结路径
24. 安全边界图
25. 电气容量图
26. OK/NG 与追溯结果流
27. 换型与维护窗口
28. MSA/GR&R 证据
29. FAT/SAT/Acceptance 证据
30. 三组工程基线数字
31. 评审决策与非承诺边界

### 4.4 工程数据包（XLSX）

工作簿必须恰有以下 **21 个工作表**，顺序固定，不得以截图、空表或只写摘要代替：

```text
项目概览
Requirement_FAI_CTQ
DFMEA
方案与CT
视觉光学
BOM_成本
成本模型
IO
电气功率
软件_MES
POC
MSA_GRR
FAT
SAT
WBS_进度
风险
开放项
商业_ROI
Visual_Map
Manifest_Checks
Manifest
```

工作簿需要有可审计的公式，而不是把计算结果伪装成静态数字。最低公式要求为：`项目概览 ≥3`、`DFMEA ≥100`、`方案与CT ≥6`、`成本模型 ≥100`、`Manifest_Checks ≥7`；其余工作表须包含与名称匹配的非空工程数据。不得有 `#REF!`、`#DIV/0!`、`#VALUE!`、`#NAME?` 或未说明的循环引用。

## 5. CAD、图像与视觉覆盖合同

- 产品几何与整机概念几何的 `.brep`、`.step`、`.stl` 必须是非零、可解析或可检查的真实几何资产；`.step` 不得为伪造文本。
- 两组 5 视图必须与对应几何资产一致，不得用同一张图重命名凑数。
- 90 张洁净工程视图必须各有唯一 `Visual/Render ID`；4 张标注图与 2 张示意图必须解释结构、接口、流程、风险或验证，不得与洁净图机械重复。
- 客户文件中一切图像、CAD、Office 引用都必须带可追溯 ID、工程用途和成熟度。`ASM_NOT_VERIFIED`、`PARTIAL`、`TBD`、`PLANNED_NOT_EXECUTED` 等状态必须保留，不能被视觉精致度掩盖。

## 6. Manifest 与跨资产一致性

`交付清单.csv` 与 `交付清单.json` 必须包含 119 个客户载荷资产的同一记录集；两个清单文件自身不得进入客户载荷哈希范围。每一行固定包含：

```text
File ID, File Name, Relative Path, Version, Description, Owner Module,
Controlled Baseline Revision, Status, Validation Result, Size, SHA256, Customer
```

必须逐项确认路径存在、大小非零、SHA-256 匹配、格式可打开，且 Word/PPT/Excel/CAD/视觉中的项目 ID、修订、数量、参数、Visual ID、状态和开放项相互一致。`Manifest_Checks` 工作表必须记录合同检查的 `Expected / Actual / PASS-REWORK` 结果。

## 7. 强制执行点

1. G00 创建 `DELIVERY_CONTRACT` 对象：`Profile=R2-F10-GOLDEN-121`、`ExpectedZipFiles=121`、`ExpectedPayloadFiles=119`、`DeviationAuthority=UserOnly`。
2. G13 对 Word/PPT/Excel 的章节、页数、工作表、公式和 Visual Map 做预检；任一缺失即 REWORK Documentation。
3. G14 对跨资产事实、数量和 Visual ID 做总工复检；任一不一致即沿依赖链返工。
4. Packaging Agent 只在 G14 PASS 后打包，并运行：

   ```powershell
   python scripts/validate_r2_f10_golden_delivery.py <final.zip>
   ```

5. 校验器返回非零或任一文件、内容、数量、哈希、可打开性不合格时，G15 必须 `REWORK`，不得以评分、说明、用户确认或“模型能力限制”绕过。
