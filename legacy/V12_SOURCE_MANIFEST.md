# V12 Legacy Source Manifest

本Skill由以下用户提供母Prompt重构而来：

- Source: `GPT-5.6-Sol_非标自动化超级提示词_V12_中文完整交付版.md`
- Source bytes: `250020`
- Source lines: `13805`
- Source SHA-256: `569b7d15b4204e4e2f77ddda18891efef5d4e38b9dc933797efffba1366fbcae`

## 重构原则

1. 不把V12全文作为运行时常驻Prompt，否则会重新造成角色污染与上下文爆炸。
2. V12功能通过 `knowledge/capability_registry.md` 映射到专业Agent和Gate。
3. V12中的工程规则被抽取到各 `knowledge/` 与 `agents/` 文件。
4. 若后续审计发现V12存在尚未登记的能力，必须新增到Capability Registry并分配Owner/Gate；不得以“架构重构”为由删除。
5. 本Manifest用于版本审计和来源核验，不作为生产Agent的运行上下文。

## 无功能删减判定

功能删减的定义不是“V12每一句文字是否继续常驻上下文”，而是“V12中每一个工程能力是否仍可被Orchestrator路由、由专业Agent执行、被Gate验收并进入最终交付”。

当前责任映射见：`knowledge/capability_registry.md`。
