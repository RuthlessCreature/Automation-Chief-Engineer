# Golden Baseline Registry — GPT Sol 正式方案包质量基线

**状态：** `SPECIFIED / PLANNED`。本文件定义后续平台实现的质量合同；不表示样例、Worker、模型路由或 Golden Comparator 已经接入。  
**证据来源：** 仅以本机只读盘点得到的交付结构和 manifest 元数据为依据；不复制客户内容、不上传样例，也不将样例全文注入模型上下文。

## 1. 为什么需要 Golden Baseline

MiniMax 候选输出不能只由“语言是否通顺”或自评分数决定质量。平台必须将经认可的 GPT Sol 方案包抽象成**可审计、可测试、可版本化**的交付合同；缺少结构、证据、成熟度说明或哈希完整性的输出，即使篇幅和措辞专业，也不得进入客户 ZIP。

Golden Baseline 是质量门的比较基线，不是供模型抄写的 prompt，也不是要求每个任务机械复制 121 个空文件。只有任务选择对应交付合同，才生成相应槽位；任何 N/A/裁剪都需策略、原因、影响和独立 Gate 决定。

## 2. 已登记的只读 Golden Sample

| Baseline ID | 样例来源（本机路径） | 实测交付结构 | 可复用规则 |
|---|---|---|---|
| `GB-ACE-5015-V1` | `E:\方案\5015风扇自动检验与性能测试单元方案包_正式交付\5015风扇自动检验与性能测试单元方案包` | 121 个物理文件；JSON manifest 119 个客户载荷；6 个一级模块；其中工程视觉 96 个。 | 逐文件 ID/路径/Owner/基线/成熟度/验证/大小/SHA-256；clean、annotated、diagram 视觉分层；开放项独立可见。 |
| `GB-PPFCT-R02` | `E:\GAONA\20260910\PurgePump_PCBA_FCT完整方案包_R02\PurgePump_PCBA_FCT完整方案包` | 121 个物理文件；119 个清单载荷；采用 `R2-F10-GOLDEN-121` 结构，含 Office 正式文件、产品/整机概念几何和分层工程视觉。 | `ASM/VIRTUAL/PARTIAL/PLANNED_NOT_EXECUTED/VALIDATED` 成熟度不可混淆；客户输入、制造放行、POC/FAT/SAT、预算/报价均有明确边界。 |

上述目录只读。未来平台仅保存其 registry 元数据、合同版本、评价规则、脱敏统计和经批准的最小示例片段；不得默认上传、外发或暴露样例中的客户内容。

## 3. Golden Delivery Contract

### 3.1 `R2-F10-GOLDEN-121` 结构合同

对被明确分配完整非标工程交付合同的任务，系统应创建：

```text
Expected physical files: 121
Expected customer payloads: 119
Fixed root modules: 6
Required manifest formats: CSV + JSON
Deviation authority: user-approved policy + independent Gate
```

固定模块的业务意图为：

1. **交付说明**：范围、成熟度、开放项、验证状态与不作出的承诺。
2. **正式方案**：技术方案书、工程数据包、汇报与安全可预览格式。
3. **产品 CAD 与视图**：来源/修订明确的产品几何与标准视图。
4. **整机概念 CAD 与视图**：设备布局、关键机构、安全/工位视图与概念边界。
5. **工程视觉**：clean、annotated、diagram 三类资产，均与用途和成熟度绑定。
6. **交付清单**：CSV/JSON 双 manifest，覆盖客户载荷但不递归把清单自身计入载荷哈希。

本合同**不能**通过重复、空白、占位、伪造 CAD、伪造渲染或伪造验证文件凑数。任务不选择完整合同或真实范围不足时，应采用另一个版本化 Delivery Contract，并透明显示与 Golden 结构的差异。

### 3.2 每个 Artifact 的最小记录

| 字段 | 必填 | 说明 |
|---|---:|---|
| `artifact_id` / `file_id` | 是 | 稳定、不可复用为另一资产的标识。 |
| `relative_path`、类型、版本 | 是 | 与版本化交付槽位和安全预览一致。 |
| `owner_module`、`source_run_id`、`gate_run_id` | 是 | 追溯到 Agent、阶段和独立 Gate。 |
| `controlled_baseline_revision` | 是 | 表达其基于哪个输入/工程基线。 |
| `maturity_status` | 是 | 仅允许策略定义枚举，例如 `FACT`、`CALC`、`RULE`、`AI`、`ASM`、`TBD`、`POC`、`RISK`、`CONFLICT`、`PARTIAL`、`PLANNED_NOT_EXECUTED`、`VALIDATED`。 |
| `validation_result`、`evidence_refs` | 是 | 说明实际验证了什么，不能把文件存在或模型自评写成试验通过。 |
| `size_bytes`、`sha256` | 是 | 用于最终 manifest 与下载前完整性检查。 |
| `customer_visible`、`preview_status` | 是 | 支持 tenant/RBAC、隔离预览与客户交付范围。 |

## 4. Golden Comparator：MiniMax 的不可逾越防线

Golden Comparator 是确定性校验与独立 Gate 的组合；它可以产生 `PASS`、`REWORK` 或 `BLOCKED_ITEM`，不能只输出分数。

| 检查层 | 拒收条件 | 通过所需证据 |
|---|---|---|
| Contract topology | 必需模块/槽位/文件类型缺失；不适用阶段无批准记录；以空壳凑数。 | Delivery Contract 版本、每槽位状态、合法 N/A 记录。 |
| Manifest integrity | 路径重复、少文件、大小/哈希不符、未通过资产进入 ZIP、清单递归计数。 | CSV/JSON manifest、所有 payload 的 SHA-256 与 package hash report。 |
| Provenance & maturity | 无 Owner/基线/来源 run；`ASM/TBD/PLANNED` 被写成实测或客户确认。 | `evidence_refs`、成熟度标签、输入/计算/验证的可追溯关系。 |
| Engineering visual taxonomy | 仅有无用途的“漂亮图”；图像被伪装为 CAD、制造图或实物验证。 | clean/annotated/diagram 类型、用途、来源、成熟度、预览和 hash。 |
| Cross-artifact consistency | Office、图纸、BOM、节拍、成本、开放项、manifest 出现矛盾。 | 结构化主张—证据—产物图谱、单位/数值复算、Gate issue。 |
| Validation honesty | POC、MSA/GR&R、FAT、SAT、供应商报价、客户签字或制造放行没有现实证据却声称完成。 | 执行记录/签署证据；否则明确 `PLANNED_NOT_EXECUTED`、`BUDGETARY_ASM_NOT_QUOTE` 或对应状态。 |

**红线：** 任一层失败即 `delivery_allowed=false`。高质量视觉、长篇内容、MiniMax 自评、AI Gateway 调用成功或管理员便利性都不能覆盖该结论。

## 5. 运行时产品形态

1. 管理员在 **Golden Baseline Registry** 中登记合同版本、允许任务类型、槽位 schema、检查规则、阈值、脱敏参考片段和退役时间。
2. 创建任务时，用户只选择交付意图；总工根据任务类型、输入充分性和 policy 分配默认合同，记录 `baseline_id` 与 `contract_version`。
3. 运行中每个 Agent 产物写入 artifact ledger；命令中心可展开查看它命中了哪一条 Golden 槽位、当前成熟度、证据、返工与 Gate。
4. Chief Review 运行 Golden Comparator；若完整合同不满足，则生成结构化缺口，不准通过 ZIP。
5. 对模型或 prompt 版本升级，使用脱敏 Golden regression fixtures 进行固定回归；只在人工批准后提升 policy version。

## 6. 防止错误使用 Golden Sample

- 不将完整样例、客户资料、价格、图纸、CAD 或 Office 正文默认发送给 MiniMax/GPT。
- 不把 121 文件数视为“完整”的唯一标准；每一项必须有可读内容、正确类型、来源和成熟度。
- 不把 `VALIDATED` 误解为设备/FAT/SAT 已通过；验证范围必须逐项表达。
- 不允许创建“金标豁免”按钮。任何例外必须保留审批人、理由、风险、影响槽位和独立 Gate 决定。
- Golden Comparator 的评测结果、输入 hash、policy/baseline 版本、issue 与时间必须审计；普通用户不能读取内部示例或模型提示。

## 7. 本阶段的边界

本文件只完成 Golden Baseline 的产品合同定义和两套样例的只读登记。尚未创建 registry 数据库、比较器、manifest 校验器、Office/CAD 渲染器、模型适配器或任何 Cloudflare 资源；这些需要在后续实现阶段用真实样例的**脱敏副本**与独立 QA 验证。
