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
