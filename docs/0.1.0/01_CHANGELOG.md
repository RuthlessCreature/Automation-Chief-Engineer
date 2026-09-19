# Changelog — 0.1.0

发布日期：**PLANNED / 尚未发布**  
基线：`NEW_PROJECT`

## Added

- 首版 Cloudflare 多租户总工任务平台的完整产品/技术规格。
- 注册、登录、RBAC、credits 账本与“暂不扣 credits”行为契约。
- 任务草稿、文件上传/扫描/输入 manifest、提交和可恢复执行状态机。
- 总工与 15 个专业阶段的执行计划、PEM/Handoff、独立 Gatekeeper 和结构化返工闭环。
- 实时 Agent 流水线、步骤时间线、事件回放、证据和产物展开的命令中心体验。
- Artifact 版本、沙箱预览、Office 衍生预览策略、最终 ZIP manifest/hash 门禁。
- MiniMax 候选生成 + GPT 质量对齐护栏：确定性检查、独立语义 Gate、返工、升级或人工阻塞。
- Cloudflare Worker edge API/BFF、per-task Durable Object、Cloudflare Workflows、D1 控制面、R2 私有文件面、Queues 小任务/DLQ、可选 AI Gateway 的目标架构与 `zg.gaona.world` 部署前 SOP。
- 三张 v2 静态视觉实现参考：任务命令中心、新建任务工作室、产物预览与最终交付。

## Changed

- 视觉实现参考统一升级为三张 `-v2-` 原型；它们是前端实现与设计验收的唯一视觉状态合同。
- 无 `-v2-` 后缀的 v1 原型降级为 QA/审计留档，不能作为最终实现状态、验收截图或与规格冲突时的解释依据。
- 架构职责进一步对齐：15 阶段长时/可等待编排由 Cloudflare Workflows 承担；per-task Durable Object 仅负责串行命令、实时订阅、`event_seq` 与协调；Queue 的 at-least-once 小工作要求消费者幂等；AI Gateway 仅为可选模型路由/观测层，不能代替质量 Gate。

## Fixed

- 不适用；本版本未实施代码，不能声称修复已验证缺陷。

## Removed

- 不适用。

## Known Issues / Open Decisions

- 未开发、未部署、未绑定 `zg.gaona.world`，也未验证任何真实 MiniMax/GPT/Office 供应商能力。
- 模型 API、GPT 审校许可与预算、认证/邮件、credits 定价、组织模型、文件保留与 Office 预览服务均待确认。
- v2 视觉原型仅表达目标交互和状态合同，展示的示例任务/百分比/评分不是运行数据，也不构成已实现、已部署或已绑定域名的声明。
# Runtime completion update — 2026-09-18

- Added production STL-to-BREP CADCore path with ASCII/Binary STL geometry facts and normalized BREP output.
- Added safe Office delivery previews, artifact preview states, CSP restrictions, and independent raw-download links.
- Added deterministic Golden Comparator API/UI with explicit `REFERENCE_BASELINE` state when GPT-SOL live credentials are absent.
- Added Playwright production regression for login, task switching, checkbox isolation, and Inspector refresh.
- Added task-level automatic retry audit and bounded retry for transient upstream/model failures; quality blocks remain non-retryable.
- See [`09_RUNTIME_COMPLETION.md`](09_RUNTIME_COMPLETION.md) for evidence and remaining external validation.
