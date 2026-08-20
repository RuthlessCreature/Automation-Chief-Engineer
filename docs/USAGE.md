# Usage

## 完整项目
给 `skill.md` + 客户资料，然后指令：“按非标总工完整流水线一次性交付”。Orchestrator应自动完成所有角色和Gate，最后输出ZIP。

## 单模块任务
如果用户明确只要某一模块，可由Router只调用相关角色，但仍保留该模块Gate。

## 用户主动要求阶段评审
只有用户明确说“先给方案A/B/C我选”或“先审Hero”时，才能把内部Gate变成用户Checkpoint。

## 运行时不得全量读取Legacy
只有能力注册表查不到规则时，才定向读取 `legacy/V12_full_prompt.md` 对应段落。
