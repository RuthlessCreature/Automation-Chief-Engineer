# Full Delivery Pipeline

## 总控状态机

```text
INIT
→ DELIVERY_CONTRACT_LOCK
→ INTAKE
→ REQUIREMENT
→ PRODUCT_CAD
→ FEASIBILITY
→ VISION
→ MECHANICAL
→ ELECTRICAL
→ SOFTWARE_MES
→ CT_CAPACITY
→ BOM_MANUFACTURING_COST
→ DIGITAL_TWIN_RENDER
→ VALIDATION
→ PROJECT_SALES
→ DOCUMENTATION
→ CHIEF_REVIEW
→ PACKAGE
→ ZIP_VALIDATE
→ DELIVER
```

## 阶段合同

| Seq | Producer | Gate | 主要输出 | PASS后下游 |
|---|---|---|---|---|
| 00 | intake_router | G00 | Input Manifest / Task Class / Delivery Contract Lock / PEM seed | requirement |
| 01 | requirement_engineer | G01 | Requirement / FAI / CTQ / Assumption / Open Issue | product_cad |
| 02 | product_cad_engineer | G02 | Product Master Asset / Geometry / Datum / Views | feasibility |
| 03 | feasibility_architect | G03 | DFI / conflicts / S1-S3 / recommended architecture | vision |
| 04 | vision_engineer | G04 | Vision cards / optical calc / lighting / algorithm / POC | mechanical |
| 05 | mechanical_engineer | G05 | Layout / stations / fixture / motion / robot / safety | electrical |
| 06 | electrical_control_engineer | G06 | Electrical / IO / safety / network / control architecture | software_mes |
| 07 | software_mes_engineer | G07 | PLC states / HMI / handshake / recipe / MES / traceability | ct_capacity |
| 08 | ct_capacity_engineer | G08 | action-level CT / UPH / bandwidth / storage / bottleneck | bom_mfg_cost |
| 09 | bom_manufacturing_cost_engineer | G09 | model-level BOM / parts / routes / DFM/DFA / cost / lead time | render |
| 10 | digital_twin_render_engineer | G10 | Master Scene / Hero100 / diagrams / visual utilization plan | validation |
| 11 | validation_quality_engineer | G11 | Risk/FMEA / POC / MSA/GRR / FAT/SAT / acceptance | project_sales |
| 12 | project_sales_engineer | G12 | WBS / DR / ECN / schedule / scope / ROI / proposal | documentation |
| 13 | documentation_engineer | G13 | Word / PPT / Excel / image utilization map | chief_review |
| 14 | chief_reviewer | G14 | Cross-asset review + rework routing | packaging |
| 15 | packaging_delivery_agent | G15 | Final directory / Manifest / ZIP | deliver |

## Gate返修算法

```text
producer_output = RUN(PRODUCER)
review = RUN(GATEKEEPER, gate, producer_output, PEM)
while review.status == REWORK:
    producer_output = RUN(PRODUCER, previous_output, review.rework_ticket)
    review = RUN(GATEKEEPER, gate, producer_output, PEM)
if review.status == BLOCKED_ITEM:
    record blocked item
    accept all unaffected outputs
    continue if core architecture remains safe
if review.status == PASS:
    merge approved delta into PEM
    emit Handoff Packet
    run next stage
```

## Chief Review依赖返修

最终总工审查发现跨专业冲突时，不允许仅写“存在问题”。必须生成 `Dependency Rework Plan`：

```text
Finding → Owner Agent → Affected Agents → Rework order → Re-run gates → Rebuild dependent assets
```

例如相机型号变化：

`Vision → Mechanical mount → Electrical/Network → CT → BOM → Render → Office → Validation`。

## 用户交互规则

默认整个Pipeline内部运行。除非用户明确要求阶段评审，否则：

- 不询问“继续吗”；
- 不让用户确认Hero；
- 不让用户选S1/S2/S3；系统给推荐并继续；
- Open Item进入最终报告，不作为聊天中断点；
- 最终只在ZIP验证后交付。

## 全量交付合同锁定

用户请求完整项目、完整方案或一次性交付时，在 `INTAKE` 前创建并冻结 `DELIVERY_CONTRACT`：

```text
Profile: R2-F10-GOLDEN-121
Expected ZIP files: 121
Expected customer payload files: 119
Deviation authority: UserOnly
```

读取 `knowledge/r2_f10_golden_delivery_contract.md`，把每个固定槽位登记为 `DELIVERY_SLOT` 并写入 PEM。除非用户明确批准另一份合同，后续角色不得删除、合并、替换或自行降低槽位数量。

`G13 → G14 → G15` 依次验证 Office 内容、跨资产一致性和最终 ZIP。若 `scripts/validate_r2_f10_golden_delivery.py <final.zip>` 返回非零，Packaging 必须根据输出路由 REWORK；不得发出“完整交付”或用说明文字绕过合同。
