# v0.1.0 发布裁决：文档原型验收通过；产品发布、部署与域名绑定阻断

**裁决：** `DOCUMENTARY_VISUAL_DELIVERABLE_ACCEPTED` / `PRODUCT_RELEASE_BLOCKED`  
**不是：** `APPROVED`、`APPROVED_WITH_RISKS`、`RELEASE_CANDIDATE`、`DEPLOYMENT_APPROVED` 或 `DOMAIN_BINDING_APPROVED`  
**裁决人：** Independent Release Judge  
**日期：** 2026-09-17（Asia/Shanghai）

## 一句话结论

本轮用户要求的**规格文档和产品形态静态效果图**可以验收：文档明确、视觉资产可读，且 v2 修订图在静态语义层经过独立复核。**真实产品不可发布。** 当前没有实现、可构建产物、测试环境或 Cloudflare 资源；24 项 QA 中 22 项核心运行时测试 `BLOCKED / NOT RUN`（新增 Workflow 恢复、Queue/DLQ 幂等、AI Gateway fail-safe 三项 P0），4 个 Major 仍为 `OPEN`，独立复测为 `RETEST_FAILED`。因此不得部署 Cloudflare Worker，不得将任何生产流量绑定到 `zg.gaona.world`。

## 裁决范围的严格区分

| 层级 | 判断 | 允许的对外表达 |
|---|---|---|
| 文档蓝图 | **通过** | 产品/技术规格、目标架构、质量护栏、部署 SOP 和用户流程已形成可审计的规划交付。 |
| 静态效果图 | **通过（仅静态）** | 三张当前 v2 视觉原型可用于需求评审和后续实现参考；其模拟状态不是实时系统数据。 |
| 软件产品 | **阻断** | 不可宣称注册登录、credits、上传、任务编排、实时进度、质量 Gate、预览、ZIP 交付或模型调用已工作。 |
| Cloudflare / 域名 | **阻断且未授权** | 不可宣称已创建 Worker/D1/R2/Queues/DLQ/DO/Workflow、AI Gateway 集成、已部署、已设置 DNS/SSL，或已绑定 `zg.gaona.world`。 |

## 关键裁决依据

1. `00_SPEC.md` 的事实边界已经明确：本轮 FACT 是“规格文档和视觉原型”；代码、Cloudflare 资源、域名、模型密钥、真实执行和上线均不在本轮交付。该文档的 Cloudflare 架构与 MiniMax/GPT 护栏均为 PLANNED，部分外部前提为 TBD。
2. `01_CHANGELOG.md` 明确显示“PLANNED / 尚未发布”，并记录未开发、未部署、未绑定 `zg.gaona.world` 与供应商能力未验证。
3. `builder/BUILD_RESULT.md` 的生产构建结论是 `NOT_APPLICABLE / NOT_IMPLEMENTED`；已验证的只是 PNG 文件的签名、解码和尺寸，不能延伸为产品、交互、安全或发布 PASS。
4. `qa/QA_TEST_RUN.md` 给出 24 项结果：**2 PASS、0 FAIL、22 BLOCKED、0 SKIPPED**。两个 PASS 只覆盖静态文档真实性/追溯性和 PNG 可读性；新增 `TC-W-001`（Workflow checkpoint/recovery）、`TC-Q-001`（Queue/DLQ 幂等）和 `TC-G-004`（AI Gateway fail-safe）也都是未实现的 P0。没有一项运行时、集成、E2E、部署或安全测试被运行。QA 最终结论为 `QA_BLOCKED`。
5. `qa/ISSUE_LIST.md` 仍有 **4 个 OPEN Major**。v2 静态图已处理原视觉矛盾，但 `fix/FIX_REPORT.md` 与 `fix/ISSUE_RESOLUTION.md` 均严格限定为设计原型层 `FIXED_FOR_RETEST`，不声称运行时修复。
6. `qa/RETEST_REPORT.md` 只验证 v2 PNG 的静态修订，仍判定 **`RETEST_FAILED`**：4 个原 Issue 不可关闭，对应 P0/P1 运行时测试仍 BLOCKED/NOT RUN，没有用于验证持久状态、质量隔离、Office 安全、授权下载或部署的环境。
7. `05_DEPLOYMENT_SOP.md` 是未执行的未来流程，且其前置表将代码/QA Release Decision 标为 `NOT_READY`，其他 Cloudflare、DNS、供应商、安全和商业前提为 `TBD`。SOP 明确规定核心 NOT RUN 或未接受 Major 不得继续，任何未满足前置不得绑定生产域名。

## 未关闭问题与不可忽略的测试缺口

| 类别 | 当前状态 | 为什么阻断发布 |
|---|---|---|
| 4 个 Major：ISSUE-001～004 | OPEN | 对应真实风险涉及未就绪任务被当作可交付、固定 15 阶段被偏好静默删减、Office 预览隔离/授权不明、以及 ZIP 下载前置条件可能失效。静态文案不能证明后台强制执行。 |
| 22 项核心 QA | BLOCKED / NOT RUN | 覆盖身份/RBAC/tenant、credits、上传扫描、幂等与任务状态、Workflow checkpoint/recovery、Queue/DLQ at-least-once 去重、事件顺序、15 阶段、MiniMax/GPT 质量门与返工、AI Gateway fail-safe、预览、签名下载、审计、Cloudflare/域名。缺失这些验证时无法判断产品是否安全可用。 |
| 质量护栏 | NOT IMPLEMENTED | 目标是防止 MiniMax 以空洞、无证据、矛盾或伪造的内容交差；目前 schema、引用检查、独立 Gate、返工、升级/阻塞、审计均只是规格。可选 AI Gateway 必须在 disabled/failed 时 fail safe，且绝不能被宣称为 GPT 等效交付控制。 |
| 生产基础设施 | NOT IMPLEMENTED / TBD | 没有 Cloudflare 资源、Workflow/Queue/DLQ/AI Gateway 实现、环境隔离、密钥、可观测性、备份、回滚演练、DNS/路由冲突审计或域名管理员确认。 |

## 重新申请发布的最低准入条件

产品团队应先完成完整实现，再提供独立可复核的证据包。准入包至少必须包含：

1. 可复现的源码、依赖锁定、Worker 与基础设施配置、不可变 commit/tag、构建/迁移/回滚清单。
2. 已落地的状态机和服务器端授权：认证、RBAC、tenant 隔离、credits 零扣费、上传安全、15 阶段执行计划、事件恢复和 artifact 生命周期，并满足 `AC-001` 至 `AC-021`。
3. 每任务 Workflow 的持久 checkpoint/wait、重启恢复和经授权的唯一 legal resume；Gate/审批未满足时不得错误推进下游。Queue/DLQ 的 `job_id`/idempotency key、崩溃重投和 DLQ replay 必须只产生一个可审计业务副作用，且 Queue 不得竞争 Workflow/DO 的阶段排序。
4. 已实际运行的 MiniMax 质量控制：候选输出受 schema/证据/确定性校验约束；生产 Agent 与独立 Gate 隔离；失败产生可追踪返工或 `QUALITY_BLOCKED`，没有“强制完成”绕过。若启用 AI Gateway，disabled、未配置、timeout、5xx 或 malformed 失败不能自动批准、跳过 Gate、重置返工或放宽打包条件。若声称 GPT 审校对齐，还需提供批准的路由、预算、数据处理与有效性测试证据。
5. 可验证的安全预览、manifest/hash、Chief Review、签名下载和最终打包服务端谓词；必须包含失败谓词与越权的负向测试。
6. 对当前 22 个 BLOCKED 用例的实际执行记录，且四个 Major 由独立 QA 以运行时证据关闭；不能以截图、mock 数据、按钮样式或 Fixer 声明代替。
7. `QA_PASS` 与 `RETEST_PASS`，无未接受 P0/P1/Major、无核心 NOT RUN、无质量门绕过、Workflow/Queue 恢复缺陷或 tenant 隔离问题。
8. 经 staging 的 Cloudflare 环境隔离、烟测、安全/性能/日志脱敏、Workflow 恢复、Queue/DLQ、AI Gateway failure isolation 与回滚演练；随后取得 Zone/路由/变更窗口/责任人书面确认，才可另行审查生产域名变更。

## 生产域名的裁决

对 **`zg.gaona.world`** 的当前裁决为：**不得绑定，不得切流，不得对外宣布上线。**

该限制不是拒绝未来部署，而是对证据事实的准确描述：本轮没有 Worker 或 DNS 变更，且缺少所有生产前置。待实现、staging 验证、独立 QA/复测、Cloudflare 资源配置与域名所有者变更批准完成后，必须基于新证据发起一次新的发布裁决。

## 签署

本轮 **文档 + 静态效果图** 工作已完成并接受；所有产品运行、Cloudflare 部署和 `zg.gaona.world` 绑定工作保留为后续版本的实现与验证事项。任何将本裁决解读为“带风险批准上线”的说法均与证据链相冲突。
# Superseding runtime decision — 2026-09-18

The historical documentary-only decision below is superseded **only for the runtime scope listed in** [`../09_RUNTIME_COMPLETION.md`](../09_RUNTIME_COMPLETION.md). Current decision: `RUNTIME_IMPLEMENTED_WITH_LIMITED_EXTERNAL_VALIDATION`.

Production deployment is active at `zg.gaona.world`; STL CADCore, safe delivery previews, Golden Comparator baseline scoring, and browser selection regression have production evidence. This is not a claim that live GPT-SOL scoring is configured or that transient-fault retry recovery has completed a staging fault-injection drill. Those remain explicit release risks and cannot be hidden by a green UI state.
