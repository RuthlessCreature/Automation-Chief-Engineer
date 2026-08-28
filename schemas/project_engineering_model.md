# Project Engineering Model / PEM Schema

PEM是唯一事实源。推荐对象：PROJECT / CUSTOMER / INPUT / PRODUCT / GEOMETRY / REQUIREMENT / FAI / CTQ / STATION / VISION_CHANNEL / CAMERA / LENS / LIGHT / ALGORITHM / FIXTURE / MOTION / ROBOT / EOAT / ELECTRICAL / IO / SOFTWARE / MES / CT / ASSEMBLY / PART / BOM / COST / RISK / ASSUMPTION / OPEN_ISSUE / POC / MSA / TEST / RENDER / DELIVERY_CONTRACT / DELIVERY_SLOT / DELIVERABLE / QUALITY_GATE / ECN。

每个对象至少有：ID / Revision / Source / Status / Owner / Dependencies / Evidence / LastApprovedGate。

修改规则：ADD / PROPOSE_CHANGE / RAISE_CONFLICT / SUPERSEDE_WITH_EVIDENCE。Gate PASS后主Agent才合并并提升Revision。

`DELIVERY_CONTRACT` 至少包含：Profile / ExpectedZipFiles / ExpectedPayloadFiles / RequiredDirectories / DeviationAuthority / Status。`DELIVERY_SLOT` 至少包含：Slot ID / Relative Path Pattern / Expected Count / Owner / Required Content / Validation Method / Actual Asset IDs / Status。完整项目默认 Profile 为 `R2-F10-GOLDEN-121`。
