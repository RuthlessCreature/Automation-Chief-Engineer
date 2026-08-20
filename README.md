# Automation Chief Engineer / 非标总工

这是把原先 20万字级“超级Prompt”重构为 **主Agent调度 + 专业Subagent + 独立Gatekeeper + 返修循环 + 最终打包** 的非标自动化工程 Skill。

## 核心架构

```text
用户输入
  ↓
Chief Orchestrator
  ↓
Requirement Agent → Gate → FAIL则返修本角色
  ↓ PASS
Product/CAD Agent → Gate
  ↓
Feasibility Agent → Gate
  ↓
Vision Agent → Gate
  ↓
Mechanical Agent → Gate
  ↓
Electrical Agent → Gate
  ↓
Software/MES Agent → Gate
  ↓
CT Agent → Gate
  ↓
BOM/Manufacturing/Cost Agent → Gate
  ↓
Digital Twin/Render Agent → Gate
  ↓
Validation Agent → Gate
  ↓
Project/Sales Agent → Gate
  ↓
Documentation Agent → Gate
  ↓
Chief Reviewer → dependency rework loop
  ↓
Packaging Agent → ZIP Gate
  ↓
一次性交付
```

## 为什么不再使用单体Prompt

原V12不是缺功能，而是生产规则、审查规则、所有角色、Gate、历史版本和交付标准同时常驻上下文，容易出现角色串台、规则冲突、上下文浪费、模型用目录/表格代替工程设计等问题。

新架构把“功能”和“调度”分开：

- Control Plane：总工调度、状态机、Handoff、PEM；
- Execution Plane：隔离的专业Subagent；
- Quality Plane：独立Gatekeeper；
- Knowledge Plane：按需加载专业规范；
- Data Plane：PEM唯一事实源；
- Delivery Plane：Office与最终ZIP。

## 功能不删减

- `knowledge/capability_registry.md` 对V12工程能力做责任映射；
- `legacy/V12_SOURCE_MANIFEST.md` 记录V12源文件大小、行数、SHA-256与重构原则；
- 后续发现任何V12能力未映射，必须补入Registry并指定Owner/Gate，禁止以重构名义删除功能。

## 入口

- 主入口：[`skill.md`](skill.md)
- 完整流水线：[`workflow/full_delivery_pipeline.md`](workflow/full_delivery_pipeline.md)
- 架构：[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 使用：[`docs/USAGE.md`](docs/USAGE.md)
- 功能注册表：[`knowledge/capability_registry.md`](knowledge/capability_registry.md)

## 核心原则

1. 纯GPT当前原生能力闭环，不假设第三方能力。
2. 默认一次性交付，不把Gate变成用户确认点。
3. 每个生产Subagent只负责一个专业域。
4. Gatekeeper独立审查，失败必须返修。
5. PEM是唯一事实源，Handoff是唯一跨角色接口。
6. 不能伪造；能力不足只降级受限资产，不降级整个工程包。
7. Hero100、数字孪生、Office高利用率、Assembly、BOM、制造、FAT/SAT、项目、销售等功能全部保留。
