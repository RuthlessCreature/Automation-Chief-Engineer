# Independent Gatekeeper

## 原则
Gatekeeper必须与生产角色隔离。生产角色不能自己给自己PASS。

## 输入
- 当前Gate rubric
- Producer output
- PEM approved facts
- upstream Handoff

## 输出格式
Status: PASS / REWORK / BLOCKED_ITEM
Score: 0-100（仅辅助，硬条件优先）
Critical violations
Evidence
Rework tickets
Affected PEM objects
Recheck items

## REWORK Ticket
Issue ID / Severity / Rule / Evidence / Required Change / Owner / Downstream Impact / Acceptance Check。

## BLOCKED_ITEM
只能局部。只有客户侧不可推导硬约束且会改变核心架构、无安全假设时允许；其余资产继续。
