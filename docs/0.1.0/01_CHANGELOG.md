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

## Runtime iteration addendum — 2026-09-23

- Added a generic V6 Harness gate that blocks physical length/thread claims whenever server-derived CAD input metadata reports unconfirmed units; the same 5015 production task is used only as a regression seed, not as a product-specific prompt/validator specialization.
- A production rework is still required after deployment to establish whether MiniMax can produce safe, useful alternatives. No quality pass or ZIP acceptance is implied by the local code change.

## Generic source-bound metric gate — 2026-09-23

- V6 production experiment confirmed the unit guard blocks repeated unsupported dimensions, but G01 still passed uncited “industry typical/default” performance metrics and an assumed `STEP=mm` contradiction. G04 also used raw bbox values labelled only as generic coordinate “units”.
- Added local V7 checks to reject numeric industry/default metrics unless source-content verification exists, and to block unit assumptions/raw-coordinate dimensions while CAD units are unconfirmed. Since source-content verification is not implemented, an inline citation token alone cannot waive the metric block. These controls are generic; 5015 is evidence/test input only.
- The generic metric restriction is intentionally fail-closed but conservative; source-backed exception handling requires a future verified claim-to-source mechanism.
- V7 full local tests/build pass; the current Worker remains V6 until independent review and controlled production rework complete. No ZIP or quality acceptance is claimed.
- First V7 production probe exposed a false positive: “this stage has completed” was treated as completed FAT/field validation. Local follow-up narrows the detector and adds both allowed-stage-completion and blocked-FAT regression cases; this correction is local only until redeployed.
- The next V7 production rerun confirmed the CAD-unit guard correctly rejects bbox-derived physical lengths even when labeled “unit unconfirmed”; the model repeated those values through five attempts. New local hardening withholds raw bbox coordinates from the model when units are unconfirmed, keeps confirmed-unit values, and gives explicit repair feedback. Local tests pass; production retest remains pending.
- The withheld-bbox production rerun passed G00 but exposed a G01 false positive on an explicit “does not constitute completed test” disclaimer, alongside unsupported fabricated performance/geometry targets. A narrow disavowal-language fix and regression fixture are local; unsupported numerical claims remain blocked.
- G01 artifact review exposed another false positive: risk identifiers such as `R1-...` matched the unconfirmed CAD radius detector. The unit pattern now distinguishes risk IDs from true `R5` radius callouts, covered by positive/negative tests; production retest is pending.
- After deployment, G00/G01 passed and G03 blocked on unsupported CAD dimensions/evidence, with a final text fallback leaking MiniMax `<think>` content. The structured-text fallback now strips tagged think/analysis blocks before creating a candidate; focused regression passed, production retest pending.
- The next live run reached G01 after an automatic workflow retry, but the task stayed blocked on an unqualified metric and repeated transport/debug-tag candidates. Tagged reasoning embedded inside JSON fields is now sanitized before the independent gate, with a regression proving the final text remains; local-only pending production replay.
- The next deployed run accepted G00/G01/G03/G04 only after multiple rejected candidates, then correctly blocked G05 after three attempts because of unsupported physical dimensions. Review of accepted G04 also found unresolved `N` ROI count and “任选其一” design choices. V8 adds a hard unresolved-choice gate and an additional model instruction banning unsupported standard dimensions/specifications when CAD units are unconfirmed; local-only until verification. No customer ZIP was assembled or accepted.
- V8 same-task rework revalidated G00, then blocked in G01: the three candidates respectively violated CAD-unit constraints, missed the G01 structure, or omitted the required STEP input reference. Harness now places exact server-verified input IDs in a mandatory body/evidence instruction and includes specific feedback when one is missing. This is an in-progress generic traceability improvement, not a gate waiver.
- Inspection of V8 G01 rejects found a conservative false positive: “本阶段不输出已完成的测试结论” was classified as a test-completion claim. V9 adds this explicit disclaimer form to the negative context and blocks unsupported numeric electrical/utility specifications such as an uncited `24V` interface value. The V8 input-ID prompt change remains; V9 is local pending tests and production rework.
- V9 G01 inspection then identified an unconfirmed-unit false positive: the raw-dimension regex read `G02` in “尺寸闭环推迟至 G02 单位确认” as a physical coordinate. V10 strips only explicit stage identifiers before dimensional matching; actual unit-bearing dimensions remain protected. A negative fixture covers the exact phrase; awaiting release/retest.
- V10 same-task rework confirmed the G02 stage-ID dimension false positive is gone, but G01 still blocked three candidates on the sentence “本阶段不预设任何已完成测试结论”; the detector lacked `不预设` as an explicit disclaimer. V11 adds this negative-context phrase with a regression; this is a detector correction, not a relaxation of completed-test rejection.
- V11 rework accepted G01 and G03 but G04 exhausted three attempts because “未输出任何 CAD 派生长度或已完成测试结论” lacked a `未输出` disclaimer. V12 adds this exact explicit negative context to the detector and regression coverage; positive completed-test claims remain blocked.
- V12 same-task rework ended at G00 after all candidates were rejected for completed-test wording. The final candidate said “未声明任何已完成测试”; V13 recognizes explicit `未声明/未声称/未宣称` negations with a regression and retains positive completion blockers.
- V13 same-task rework accepted upstream stages through G08, then correctly blocked G09 for unconfirmed CAD units and unsupported engineering figures. Rejected-candidate review found fabricated camera/lens suppliers, model identifiers, and 2026-Q1 “market median” prices that the lexical BOM contract did not detect. V14 adds a fail-closed commercial-source gate: price and named supplier/model/part-number claims require a server-identified quotation/procurement input and an exact citation in the same sentence; otherwise only functional categories and an explicit unquoted-cost boundary are permitted. Same 5015 task production rework is pending; no ZIP/PASS/parity claim is authorized.
- V14 same-task production rework blocked at G00. Rejected-candidate review proved two narrow false positives: a version number embedded in a `RULE-...V14` identifier was treated as an industry metric, while `待验证` and a CADCore topology statement were read as completed testing. V15 strips governed reference IDs before numeric-default checks and scopes completion detection to test/performance claims while retaining positive FAT/real-test blockers. Retest on the same 5015 task is pending.

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
