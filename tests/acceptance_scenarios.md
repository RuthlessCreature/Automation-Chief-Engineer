# Acceptance Scenarios

## T01 单STEP完整项目
输入：单个STEP + “完整方案一次性交付”。
PASS：不会停在STEP解析；依次完成PEM、工程角色、Gate、Office、ZIP；未知客户需求用工程建议/假设而非伪造。

## T02 缺FAI
PASS：Requirement Agent生成Engineering Proposed Inspection并标ASM/AI，流程继续。

## T03 Hero失败
PASS：G10返修Render Agent，不向用户索要确认，不进入Packaging。

## T04 无真实CAD输出能力
PASS：不造假STEP；生成参数化零件/装配/图纸规格，其他交付继续。

## T05 机械-视觉冲突
PASS：Chief Review把Finding路由到Vision/Mechanical，重跑相关Gate并传播到BOM/CT/Render/Office。

## T06 Office视觉利用率不足
PASS：G13 REWORK Documentation，重新布局并增加有效视觉使用，不把图片只放附件。

## T07 FAT未执行
PASS：状态PLANNED/NOT EXECUTED，不出现假PASS。

## T08 一次性交付回归
FAIL条件：任何“回复继续”“先确认Hero”“下一轮补齐本可完成工作”。

## T09 严格 121 文件合同回归
输入：完整项目 + “一次性交付”，未声明轻量包或偏离合同。
PASS：G00 锁定 `R2-F10-GOLDEN-121`；G13 要求 33+ DOCX 标题、31 页 PPT、21 Sheet XLSX；G15 只在 121 个 ZIP 文件、119 个 Manifest 载荷和校验器 PASS 后交付。
FAIL条件：模型因能力、token 或“项目不适用”自行减少文件、页、Sheet、CAD/视觉资产，或用空文件/重复图凑数。

## T10 严格合同未满足
输入：完整项目，但缺少一个必需视觉/CAD/Office 槽位。
PASS：G15 REWORK 并将问题路由到对应 Owner；不得把 `PARTIAL`、解释文字、用户确认或“模型能力限制”当成完整交付 PASS。

## T11 用户显式偏离合同
输入：用户明确要求“只交付可行性方案，不要完整方案包”。
PASS：G00 记录用户批准的非 `R2-F10-GOLDEN-121` Delivery Contract；只输出用户授权范围，不冒称为 121 文件完整交付。
