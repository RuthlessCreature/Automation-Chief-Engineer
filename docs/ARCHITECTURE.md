# Architecture

## 为什么不用单体Prompt

单体V12把生产规则、审查规则、角色、知识库、交付规则和历史版本同时装进一个上下文，造成：角色污染、规则冲突、Gate过度触发、上下文浪费、模型倾向生成目录/表格而非深度设计。

## 新架构的关键

### Control Plane
`skill.md + chief_orchestrator + workflow + schemas`

### Execution Plane
隔离专业角色，只处理自己的PEM切片。

### Quality Plane
独立Gatekeeper + Gate rubrics，不允许生产角色自审通过。

### Knowledge Plane
按需加载领域规则；Legacy V12只作为兜底，不常驻上下文。

### Data Plane
PEM唯一事实源；Handoff Packet是跨角色标准接口。

### Delivery Plane
Documentation只消费已批准事实；Packaging只消费G14批准资产。

## Context Budget原则

每个Subagent默认只拿：角色文件 + 1~3个相关knowledge文件 + upstream handoff + PEM slice。不要给全仓库、全聊天、V12全文。

## Host兼容

- 支持Subagent：真正隔离执行。
- 不支持Subagent：主Agent串行模拟隔离角色，每个角色固化输出后切换上下文。
