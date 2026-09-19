# v0.1.0 发布核对清单（独立 Release Judge）

**裁决日期：** 2026-09-17（Asia/Shanghai）  
**裁决范围：** 仅审阅 `docs/0.1.0` 的规格、变更记录、Builder、QA、Fix、Retest 与部署 SOP 证据。本清单不代表对不存在的应用、服务、账户、Cloudflare 资源或外部模型进行过测试。  
**裁决原则：** 必须将“本轮文档 + 静态效果图交付”与“可运行产品发布 / Cloudflare 部署 / `zg.gaona.world` 生产绑定”分开判断。静态图上的按钮、分数、状态和哈希均为设计表达，绝不是服务端事实或上线证据。

## 1. 最终状态总览

| 裁决对象 | 状态 | 可否对外宣称 | 主要证据 / 限制 |
|---|---|---|---|
| 本轮约定交付：产品/技术文档 | **ACCEPTED** | 可称“v0.1.0 文档蓝图已交付” | `00_SPEC.md` 将范围、事实标签、PLANNED/TBD 与非实现边界明确化；`01_CHANGELOG.md` 声明“尚未发布”。QA `TC-S-001` 通过。 |
| 本轮约定交付：静态产品效果图 | **ACCEPTED — STATIC ONLY** | 可称“已交付并复核静态视觉原型” | 三张 v2 PNG 可解码、尺寸均为 1672×941；Fixer 与独立 Retest 均核对文件哈希和视觉语义。它们不是可交互 UI。 |
| v0.1.0 真实应用 / 产品版本 | **NOT APPROVED / RELEASE BLOCKED** | **不得**称“产品已发布”“可供客户使用”或“质量已通过” | 无源码、运行时、构建、环境、账号或端到端证据；22 项实现依赖测试 `BLOCKED / NOT RUN`（含 3 项新增 P0）；4 个 Major 仍 OPEN。 |
| Cloudflare Worker、D1、R2、Queues/DLQ、Durable Objects、Workflows 与模型/预览集成 | **NOT IMPLEMENTED / NOT APPROVED** | **不得**称“已部署”“已接 MiniMax/GPT/Office 或 AI Gateway” | Builder、QA、Fix 均明确没有对应实现或执行证据。 |
| `zg.gaona.world` 绑定或生产流量 | **NOT AUTHORIZED / BLOCKED** | **不得**称“已绑定”“已上线” | 未执行 Worker/DNS/SSL 变更；Zone/路由冲突、域名管理员授权、密钥/供应商和发布前验证仍是 TBD/NOT_READY。 |

**本次产品发布结论不是 `APPROVED_WITH_RISKS`。** 运行时功能未被实现与验证、核心测试未运行、Major 问题未关闭，不是可以用风险接受掩盖的发布风险。

## 2. 输入证据与完整性核对

| 必审证据 | 结论 | 对发布裁决的含义 |
|---|---|---|
| `00_SPEC.md` | **REVIEWED** | 规格自身将本轮事实限定为“规格文档和视觉原型”；代码、Cloudflare 资源、域名、模型密钥、真实执行和上线不在本轮交付内。19 个 FR 与 21 个 AC（至 `AC-021`）为后续实现验收合同，不能当作已实现。 |
| `01_CHANGELOG.md` | **REVIEWED** | 明确标注“发布日期：PLANNED / 尚未发布”；已知问题包括未开发、未部署、未绑定域名，及未验证模型/Office 能力。 |
| `builder/BUILD_RESULT.md` | **REVIEWED** | `DOCUMENTARY_VISUAL_DELIVERABLE_VERIFIED`；生产构建 `NOT_APPLICABLE / NOT_IMPLEMENTED`。Builder 仅确认静态 PNG 的文件级可读性；代码、Worker、部署与开发测试均非完成项。 |
| `qa/QA_TEST_RUN.md` | **REVIEWED** | 共 24 项：2 PASS、0 FAIL、**22 BLOCKED**、0 SKIPPED。新增的 `TC-W-001`、`TC-Q-001`、`TC-G-004` 均为未实现的 P0。QA 结论为 `QA_BLOCKED`，不支持 RC、部署或域名绑定。 |
| `qa/ISSUE_LIST.md` | **REVIEWED** | 0 Blocker、**4 OPEN Major**、0 Minor、0 Suggestion。四项均需实现后的独立运行时回归验证才可关闭。 |
| `fix/FIX_REPORT.md` + `fix/ISSUE_RESOLUTION.md` | **REVIEWED** | 修复范围严格是 v2 静态图的语义校正，状态仅为 `FIXED_FOR_RETEST — design prototype only`；没有运行时修复声明。 |
| `qa/RETEST_REPORT.md` | **REVIEWED** | v2 静态修订四项均被视觉复核；运行时仍 BLOCKED/NOT RUN，4 条原始 Major 仍 OPEN；复测决定为 **`RETEST_FAILED`**。 |
| `05_DEPLOYMENT_SOP.md` | **REVIEWED** | SOP 是 PLANNED、未执行。发布决策为 NOT_READY；任何 P0/P1 未通过、核心 NOT RUN 或未接受 Major 都不得继续，更不得绑定生产域名。 |

## 3. 本轮可验收的文档与静态视觉交付

### 3.1 文档蓝图

| 检查 | 状态 | 证据 |
|---|---|---|
| 产品范围、角色、credits 零扣费、任务、Agent/Gate、产物、打包与安全边界被记录 | PASS — documentation scope | `00_SPEC.md`，特别是本轮交付边界、FR/AC、MiniMax→GPT 质量护栏与目标架构章节。 |
| 未把计划冒充为事实 | PASS | 规格定义 FACT/ASM/TBD/PLANNED；Changelog、Builder、QA 与部署 SOP 相互一致地标为未开发/未部署。 |
| 静态包链接与基本追溯 | PASS | QA `TC-S-001`：本地 Markdown 引用检查通过、需求 ID 清单齐全、`git diff --check` 无空白错误。 |
| 部署与回滚先决条件已记录 | PASS — planning only | `05_DEPLOYMENT_SOP.md` 记录 staging、隔离、上线窗口、健康检查与回滚；不构成任何部署完成证据。 |

### 3.2 静态效果图

当前接受用于设计评审的版本是以下 **v2** 文件；保留 v1 仅用于审计，不应用作当前视觉验收依据。

| 当前静态原型 | 静态复核结论 | 设计层已覆盖的关键语义 |
|---|---|---|
| `visuals/01-task-command-center-v2-quality-safe.png` | PASS — static only | 运行中且证据不全的任务显示 `PENDING / NOT_READY` 和 `delivery_allowed=false`，不再把交付入口与未就绪 Gate 混淆。 |
| `visuals/02-new-task-studio-v2-fixed-plan.png` | PASS — static only | 交付偏好不改变固定 15 阶段计划；N/A 需要规则、理由、影响评估和独立 Gate 决定。 |
| `visuals/03-artifact-preview-delivery-v2-safe.png` | PASS — static only | 区分 Office 原件与安全衍生预览；交付正向状态同时呈现 Chief Review PASS、0 blocker、完整 manifest、哈希匹配和授权下载语义。 |

三张 v2 PNG 都被 Retest 独立验证可解码、尺寸为 1672×941，且记录的 SHA-256 与 Fixer 的清单相符。此验收只表示“图片文件可读、视觉表达与规格的静态语义相符”；不证明按钮禁用、状态持久化、RBAC、预览隔离、哈希校验、签名下载或任何 API 行为。

## 4. 不满足产品发布条件的硬性阻断

### 4.1 不存在可发布实现

| 必需发布证据 | 当前状态 | 阻断原因 |
|---|---|---|
| 应用源码与可重现构建 | NOT IMPLEMENTED / NOT RUN | QA 未发现 `package.json`、`wrangler.*`、`src/`、`worker/`、`app/` 或 `pages/` 运行时清单/源码；没有可审阅 commit/tag 或产物。 |
| 身份、会话、RBAC、tenant 隔离 | NOT IMPLEMENTED / NOT RUN | 无 API、授权层、隔离数据、测试身份或负向越权证据。 |
| credits、任务、文件扫描、R2/D1/DO/Workflow/Queue/DLQ 状态机 | NOT IMPLEMENTED / NOT RUN | 无 Worker、D1、R2、Queue/DLQ、DO、per-task Workflow、上传/扫描服务或可持久化事件流。 |
| Workflow 恢复、Queue/DLQ 幂等与 AI Gateway fail-safe | NOT IMPLEMENTED / NOT RUN | 无持久 checkpoint/wait、合法 resume、Queue consumer/job 去重或 DLQ replay 证据；无可选 AI Gateway 的 disabled/missing/timeout/5xx/malformed 情形下仍保留独立质量链的证明。 |
| MiniMax 候选生成 + GPT 等效质量护栏 | NOT IMPLEMENTED / NOT RUN | 无模型适配器、版本化策略、确定性验证、独立 Gate、返工/阻塞或审计证据。AI Gateway 即使未来启用也只能路由/观测，不能替代这些控制。 |
| 安全 Office 派生预览与签名下载 | NOT IMPLEMENTED / NOT RUN | 无转换服务、隔离验证、授权检查、manifest/hash 验证或签名 URL 服务。 |
| 最终 ZIP 打包 | NOT IMPLEMENTED / NOT RUN | 无包装服务、可验证 manifest、哈希比对与 Chief Review 强制条件。 |

### 4.2 22 项核心测试均未运行

下列 QA 用例不是通过、跳过或可接受例外；均为 **`BLOCKED / NOT RUN`**，原因是没有实现与隔离测试环境。所有列项应在实现后重新执行并保留可审计结果。

| 测试域 | 尚未运行的用例 |
|---|---|
| 视觉/产品关键路径 | `TC-V-001`、`TC-V-002`、`TC-V-003`、`TC-V-004` |
| 身份、权限与 credits | `TC-A-001`、`TC-A-002`、`TC-C-001` |
| 上传与任务状态机 | `TC-U-001`、`TC-T-001`、`TC-T-002` |
| Workflow 与 Queue/DLQ P0 | `TC-W-001`（checkpoint/wait/recovery/合法 resume）、`TC-Q-001`（at-least-once 去重、DLQ/replay 与不竞争阶段顺序） |
| 事件、编排与质量门 | `TC-E-001`、`TC-O-001`、`TC-G-001`、`TC-G-002`、`TC-G-003`、`TC-G-004`（AI Gateway 失败不得绕过质量链） |
| 产物、打包与管理审计 | `TC-P-001`、`TC-P-002`、`TC-AD-001` |
| 发布/域名 | `TC-D-001` |

`TC-S-001` 与 `TC-S-002` 的 PASS 仅覆盖文档真实边界和静态 PNG 基础可读性，不能替代上述 22 项运行时验证。

### 4.3 四个未关闭 Major

| ID | 权威状态 | 当前静态层状态 | 发布前必须关闭的运行时证据 |
|---|---|---|---|
| ISSUE-001 | **OPEN Major** | v2 已静态纠正、待运行时复验 | 持久 Task/Gate/交付状态为唯一真源；`PENDING`、证据不全或 `delivery_allowed=false` 时 UI 与 API 均拒绝交付。 |
| ISSUE-002 | **OPEN Major** | v2 已静态纠正、待运行时复验 | 提交后持久化的 ExecutionPlan 永远包含 15 阶段；每个 N/A 有规则、理由、影响/风险、Gate 决定与审计。 |
| ISSUE-003 | **OPEN Major** | v2 已静态纠正、待运行时复验 | 预览状态/来源可验证；Office 仅使用安全衍生物，宏、外链、脚本不执行；原件下载另经 RBAC 短期授权。 |
| ISSUE-004 | **OPEN Major** | v2 已静态纠正、待运行时复验 | 服务端仅在 Chief Review PASS、零质量阻塞、manifest 完整、所有哈希匹配时签发下载；每个失败谓词的负向案例都被拒绝。 |

Fixer 的 `FIXED_FOR_RETEST` 与 Retest 的“静态视觉已验证”均不是 issue closure。权威 `ISSUE_LIST.md` 保持 OPEN，且 Retest 结论为 `RETEST_FAILED`，因此不能进入 RC、生产发布或域名变更。

## 5. Cloudflare 与 `zg.gaona.world` 发布门

| 门 | 当前状态 | Release Judge 结论 |
|---|---|---|
| 已批准的代码、构建、自检、QA、修复、复测、发布裁决 | NOT_READY | 未满足。不存在可发布构建，且 QA/Retest 不通过。 |
| `gaona.world` Zone 最小权限、域名所有者确认 | TBD | 未满足。 |
| `zg.gaona.world` DNS / Worker Route / Pages / Access / 反向代理冲突审计 | TBD | 未满足。 |
| MiniMax、GPT 与 Office 服务的正式契约、密钥、数据处理和限额 | TBD | 未满足。 |
| 隐私、保留/删除、区域、DPA、应急联系人 | TBD | 未满足。 |
| credits 初值、计量、收费启用条件与支持边界 | TBD | 未满足。 |
| staging 资源隔离、端到端功能/安全/回滚验证 | NOT IMPLEMENTED / NOT RUN | 未满足。 |

依 `05_DEPLOYMENT_SOP.md`，任一项未满足即只能停留在 staging，不得绑定生产域名；当前则连 staging 实现与验证都不存在。本轮没有授权、也没有执行任何 DNS、SSL、Worker Route、Cloudflare 资源或生产流量变更。

## 6. 解除发布阻断的必要条件（全部满足后重新裁决）

1. 实现并提交可追溯、可构建的 Worker/API/UI 与基础设施配置；生成不可变 commit/tag、构建清单、迁移版本和回滚目标。
2. 落地并以自动化与人工证据验证 FR/AC（至 `AC-021`）：认证与 RBAC、tenant 隔离、credits 零扣费、上传扫描、任务幂等/状态机、15 阶段执行计划、事件顺序和可恢复实时进度。
3. 实现并以 P0 集成证据验证每任务 Cloudflare Workflow：Gate/审批边界的持久 checkpoint/wait，重启后的同一 checkpoint 恢复，以及仅一次合法、已审计的 resume；任何 stale、duplicate 或 unauthorized resume 都不得推进下游或伪造 PASS。
4. 实现并以 P0 集成证据验证 Queue/DLQ at-least-once 幂等：持久 `job_id`/idempotency key 只能产生一次 artifact、账本、阶段、打包或交付审计副作用；崩溃重投、DLQ 与批准 replay 都可追溯且不允许 Queue consumer 与 Workflow/DO 竞争 15 阶段顺序。
5. 把 MiniMax 置于“候选生成者”边界内：实现版本化 schema/rubric、输入证据引用、确定性检查、独立 Gate、返工版本链、两次失败升级或 `QUALITY_BLOCKED`；不得允许生产 Agent 自行 PASS 或强制交付。GPT 审校路由是否可用、预算和数据处理须有经批准的实际配置后再声称等效质量。
6. 若启用可选 AI Gateway，必须以 P0 失败隔离证据确认：disabled、未配置、timeout、5xx 或 malformed 情形均不能自动批准、跳过确定性校验/独立 Gate、重置返工或降低打包门槛；不可验证的质量工作只能按策略重试或进入 `QUALITY_BLOCKED`。
7. 实现安全 artifact 体系：不可变版本、私有对象、预览派生副本、Office 非执行隔离、短期且 RBAC 校验的下载、Chief Review/manifest/hash 服务端交付谓词，以及 ZIP 打包审计。
8. 在隔离的 staging 环境准备无敏感数据的账户和夹具，完成全部 22 项当前 BLOCKED 用例；任何失败重新进入修复—独立复测循环。四个 Major 必须在 `ISSUE_LIST.md` 中由 QA 依据运行时证据关闭，不能仅凭截图关闭。
9. 运行完整的 lint、类型检查、单元、集成、E2E、迁移、依赖/秘密扫描、安全负测、可访问性与性能基线；保留命令、版本、时间、结果及异常处理证据。
10. 完成 Cloudflare staging：环境独立的 Worker/D1/R2/Queue+DLQ/DO/Workflow、密钥、可观测性、告警、备份/迁移与回滚演练；验证 Workflow 恢复、Queue 重投/DLQ、AI Gateway 失败、模型失败、断连回补、越权、签名 URL 过期、质量阻塞和打包失败等负向路径。
11. 获得域名所有者对 Zone、路由冲突、变更窗口、TTL、回滚负责人及影响范围的书面确认；生产 smoke、TLS/安全头、观察窗口和最终记录均完成后，才可以单独提交 `zg.gaona.world` 绑定审批。
12. 由独立 QA 给出 `QA_PASS`（不是静态-only），独立 Retest 关闭相关问题并给出 `RETEST_PASS`，然后由 Release Judge 基于完整新证据重新裁决。任何核心 `NOT RUN`、未接受 Major、P0/P1 失败、质量绕过或 tenant 数据泄露均继续 BLOCKED。

## 7. 可使用与禁止使用的发布措辞

| 可以使用 | 不得使用 |
|---|---|
| “Automation Chief Engineer Cloud v0.1.0 的产品/技术规格及静态视觉原型已完成。” | “v0.1.0 产品已发布 / 已可供客户使用。” |
| “静态效果图经文件与视觉语义复核，作为设计评审材料。” | “Worker 已部署，MiniMax/GPT/Office 已接入并验证。” |
| “Cloudflare 与 `zg.gaona.world` 已有部署 SOP，仍待实施与发布门验证。” | “`zg.gaona.world` 已绑定、已开通 TLS、已承接生产流量。” |

## 8. Release Judge 签署

- **文档与静态视觉交付：** ACCEPTED，范围仅限本轮约定的蓝图与视觉原型。
- **产品 / Release Candidate / Cloudflare 发布 / 域名绑定：** NOT APPROVED / RELEASE BLOCKED。
- **风险接受：** 未授权。不得以 `APPROVED_WITH_RISKS`、UI 截图、静态分数、Fixer 声明或计划 SOP 替代实现与独立运行时证据。
# Runtime checklist addendum — 2026-09-18

- [x] STL ASCII/Binary upload, CADCore geometry facts, BREP artifact and production smoke.
- [x] Safe DOCX/XLSX HTML derivatives with CSP and independent raw download.
- [x] Golden Comparator endpoint/UI with explicit GPT-SOL configuration state.
- [x] Production Playwright regression (login, task selection, checkbox isolation, Inspector refresh).
- [x] Bounded transient retry implementation and audit schema.
- [ ] Live GPT-SOL evaluator secret/approved route and score validity study.
- [ ] Staging fault-injection drill for 429/5xx, Workflow recovery, and duplicate-package prevention.
