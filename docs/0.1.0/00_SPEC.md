# Automation Chief Engineer Cloud v0.1.0 — 产品与技术规格

## 文档状态与事实标签

| 标签 | 含义 |
|---|---|
| **FACT** | 用户已明确提出或现有仓库/原型已可直接证实。 |
| **ASM** | 为了让首版可实施而采用的保守默认；后续可配置。 |
| **TBD** | 需要产品所有者、域名管理员或模型供应商确认，不能伪装为已完成。 |
| **PLANNED** | 本版本设计并验收、后续工程实施；不代表已开发、上线或部署。 |

**版本**：0.1.0  
**基线**：NEW_PROJECT（`docs/` 下没有可作为产品版本基线的历史目录）  
**目标**：定义 Cloudflare 上的多租户“非标总工”任务平台；用户能够注册、获得 credits、上传资料并发起方案任务；通过酷炫但可审计的流水线实时观察总工/子 Agent；查看每一步的证据与产物；通过质量门后下载最终 ZIP。  
**本轮交付**：规格文档和视觉原型，均为 FACT；代码、Cloudflare 资源、域名、模型密钥、真实任务执行与上线均不在本轮交付内。

## 1. Iteration Goal

将本仓库已有的 Automation Chief Engineer（总工编排、分角色、独立 Gatekeeper、PEM、Handoff、最终打包）产品化为一套面向客户的 Web 控制台蓝图。首版必须把“过程可信”和“不可用垃圾交差”做成系统规则，而非仅依赖 MiniMax 的提示词自觉。

用户指定的首选推理服务为 **MiniMax Token Plan**；但产品目标是对齐由 GPT 产出的总工质量标准，**不是**声称 MiniMax 与 GPT 天生等价。系统必须以确定性校验、独立质量门、返工循环、证据留存和升级/阻塞策略弥补模型差异。

## 2. Scope

本版本 PLANNED 范围：

1. 用户注册、登录、会话管理、个人空间；管理员、成员、只读审阅者 RBAC。
2. 账户 credits 账本、余额显示和预估提示；任务可启动但 **v0.1.0 不扣减 credits**。
3. 创建任务：项目名称、目标/提示词、交付偏好、附件上传、草稿与提交校验。
4. 文件安全接收、哈希/大小/MIME 记录、对象存储、扫描状态和可追溯输入清单。
5. 总工 Orchestrator 和隔离 Subagent 的任务运行模型：固定阶段、PEM、Handoff、Gate、返工、人工阻塞。
6. 可恢复的实时执行观测：总工与每个 Agent 的计划、当前动作、完成情况、百分比、事件日志、质量门证据。
7. 流水线工作台：横向 Agent 卡片、纵向步骤时间线、证据/产物抽屉、质量评分及不可空交付提示。
8. 产物管理：版本、来源步骤、证据关联、下载、受控预览；Office/PDF/图片/文本的在线预览策略。
9. 总工最终打包：只允许来自已通过 Gate 的资产进入 ZIP，包含 manifest、版本、哈希和交付状态。
10. Cloudflare 目标技术架构：Worker edge API/BFF、per-task Durable Object、Cloudflare Workflows、D1、R2、Queues、可选 AI Gateway；自定义域名 `zg.gaona.world` 的**部署前置条件与操作规程**。
11. MiniMax 与 GPT 等效质量护栏、审计、安全、滥用防护和故障/降级策略。
12. 与本规格配套的三张 v2 静态视觉实现参考：[`01-task-command-center-v2-quality-safe.png`](visuals/01-task-command-center-v2-quality-safe.png)、[`02-new-task-studio-v2-fixed-plan.png`](visuals/02-new-task-studio-v2-fixed-plan.png)、[`03-artifact-preview-delivery-v2-safe.png`](visuals/03-artifact-preview-delivery-v2-safe.png)。
13. GPT Sol 正式方案包的只读 Golden Baseline Registry 与 Golden Comparator 产品合同，见 [`07_GOLDEN_BASELINE.md`](07_GOLDEN_BASELINE.md)；它约束交付拓扑、逐文件证据、成熟度、视觉分层和 manifest 完整性，不把样例内容直接交给模型抄写。

## 3. Out of Scope

以下明确不属于 0.1.0，Builder 不得暗自实现或宣称完成：

- Cloudflare Worker、D1/R2/Queues/DO 的实际创建、部署、域名 DNS/SSL 绑定、生产密钥录入；
- MiniMax、GPT 或 Office 渲染供应商的真实调用、价格确认、Token 消耗计量及实际 credits 扣费；
- 邮箱验证、密码找回、组织 SSO、MFA、支付/充值/发票、订阅套餐；
- 用户自定义 Agent 流程、任意第三方插件、外部 CAD 连接器、协作编辑；
- 把本地 Codex Subagent、桌面工具或 Office 程序伪装成 Cloudflare Worker 内可运行的能力；
- 无授权自动向客户/供应商发送邮件、下单或发布工程文件；
- 真正的 121 文件 R2-F10-GOLDEN-121 成品交付：该合同属于“完整非标工程项目”任务的运行时交付策略，首版平台只需能配置/审计该策略，不能虚构已产出 121 个文件；
- 移动原生 App 与历史数据迁移。

## 4. 产品形态与视觉要求

### 4.1 信息架构（FACT + PLANNED）

- **认证**：注册、登录。
- **任务中心**：我的任务、创建任务、筛选（草稿/排队/运行/质量阻塞/完成/失败/取消）。
- **任务命令中心**：主工作区，见视觉原型。
- **产物库**：按任务、阶段、文件类型、版本和 Gate 状态查找。
- **积分与账本**：余额、冻结/预估（预留）、未来扣费记录。
- **管理后台**（admin）：用户、角色、配额、模型路由、策略版本、审计与失败任务。

### 4.2 命令中心视觉合同

界面以浅灰/白色背景、深海军蓝文字、Azure 蓝交互色、绿色通过、橙色警告、红色阻止为基础；不以颜色作为唯一状态信息。桌面优先 1440 px 宽布局，最窄支持 1024 px；更小视口显示可横向滚动的流水线和可折叠侧栏（ASM）。

| 区域 | 必须显示 | 交互/验收约束 |
|---|---|---|
| 顶栏 | 当前任务、任务全局状态、开始时间/耗时、credits、通知、账户菜单 | credits 显示余额与“本版本不扣费”标识；不得显示虚假实时数据。 |
| 左栏 | 项目概览、任务树及阶段序号、知识库/工具/设置入口 | 当前阶段高亮；已通过/进行/待处理/返工/阻塞均有文字标签。 |
| Agent 流水线 | 总工 → 当前/后续专业 Agent → Gatekeeper；每卡计划/状态/进度/摘要 | 卡片点击可定位对应详情；箭头仅表示依赖，不表示已完成。 |
| 当前 Agent 面板 | 当前目标、步骤时间线、进行中动作、预计/实际时间、产物表 | 进度必须来自事件或明确显示“等待心跳”；不得由前端猜测完成。 |
| 质量与证据面板 | 质量评分、检查项、未通过项、输入引用和“不可空交付”状态 | 分数须给出策略版本和检查来源；没有证据不得显示 PASS。 |
| 事件日志 | 时间、级别、来源、结构化消息、链接对象 | 支持筛选；日志不可被普通用户覆写。 |
| 底部动作 | 暂停/恢复、查看产物、打开交付包 | 取消、重跑、下载均需权限及状态校验。 |

### 4.3 v2 视觉实现参考与证据边界

下列三张 **v2** 图片是本版本前端实现、设计评审和后续验收的唯一视觉状态参考；它们说明目标布局、信息层级和安全状态文案，**不表示产品已经实现或正在运行**。

| 页面/状态 | 唯一实现参考 | 约束 |
|---|---|---|
| 运行中的质量受控任务命令中心 | [`01-task-command-center-v2-quality-safe.png`](visuals/01-task-command-center-v2-quality-safe.png) | 体现 Agent 流水线、可验证的运行状态、证据/质量面板和不允许空交付。 |
| 新建任务工作室 | [`02-new-task-studio-v2-fixed-plan.png`](visuals/02-new-task-studio-v2-fixed-plan.png) | 体现任务提示、文件输入、固定计划和 v0.1.0 暂不扣积分的启动前检查。 |
| 产物预览与最终交付 | [`03-artifact-preview-delivery-v2-safe.png`](visuals/03-artifact-preview-delivery-v2-safe.png) | 体现版本、来源证据、安全预览和仅对通过门禁交付包开放下载。 |

旧版无 `-v2-` 后缀的三张图片（例如 `01-task-command-center.png`）**仅保留为 QA/审计证据**，用于追溯视觉探索过程；它们不得作为最终实现状态合同、设计验收截图或与本规格冲突时的解释依据。

## 5. User Roles / Permissions

| 角色 | 范围 | 能做什么 | 不允许 |
|---|---|---|---|
| `member` | 自己创建/被授予访问的任务 | 注册/登录、管理资料、创建草稿、上传、启动/暂停/取消自己的任务、看自身产物、下载已完成 ZIP | 读其他租户数据、改质量证据、改 credits、查看密钥/全局日志。 |
| `reviewer` | 被显式授予的任务 | 查看状态、事件、证据、预览及下载已完成产物 | 创建/启动/取消任务、上传、修改策略或权限。 |
| `admin` | 当前组织（组织模型为 ASM；无组织时为整站管理员） | 用户与任务审计、credits 调整、手动解除模型阻塞、配置路由/策略版本、删除隔离期对象 | 读取明文密钥、绕过 Gate 直接标记交付合格。 |
| `system` | 服务账号 | 根据队列/策略执行编排、写不可变事件、发起 Gate、打包 | 使用浏览器会话权限、跨 tenant 访问、将未通过资产打包。 |

所有资源访问必须同时检查 `tenant_id`、任务授权关系和资源归属；仅靠随机 UUID 不构成授权。

## 6. Functional Requirements

### 身份、会话与积分

| ID | 描述 | 输入/前置 | 输出/后置状态 | 异常与权限 |
|---|---|---|---|---|
| FR-AUTH-001 | 用户以邮箱、密码、显示名注册；密码只保存强散列。 | 未登录；合法邮箱；密码满足策略（ASM：≥12 字符，含至少三类字符）。 | 创建 `user`，状态 `PENDING_VERIFICATION` 或 `ACTIVE`（TBD），创建账本账户，写审计事件。 | 重复邮箱返回通用错误；频率超限为 `RATE_LIMITED`；仅匿名可调用。 |
| FR-AUTH-002 | 用户登录、刷新会话、登出。 | 已注册账户；有效凭据。 | 产生短时访问会话和可撤销刷新会话（实现机制 TBD）；登出失效当前会话。 | 错误凭据不泄露账号存在；锁定/禁用用户不可登录。 |
| FR-RBAC-001 | 每一次 API/页面数据请求按角色和资源授权。 | 已登录或 system 身份。 | 授权请求返回最小必要数据。 | 无权统一返回 403/404 策略（TBD）；服务端强制，前端隐藏不是安全边界。 |
| FR-CR-001 | 显示可用 credits、预估消耗和账本条目。 | `member`/`admin`；账本账户存在。 | 新用户初始 credits 为 **TBD**；显示余额及“v0.1.0 暂不扣减”。 | 仅 admin 可调整并须理由；负余额显示规则 TBD。 |
| FR-CR-002 | 创建和启动任务不扣减 credits。 | 任意可启动草稿。 | 账本无 `DEBIT`；任务事件写 `BILLING_SKIPPED_V0_1_0`。 | 不得以 UI 上显示的预估值当作已扣费。 |

### 任务与输入

| ID | 描述 | 输入/前置 | 输出/后置状态 | 异常与权限 |
|---|---|---|---|---|
| FR-TASK-001 | 创建可编辑任务草稿。 | `member`；项目名称 1–120 字；目标提示词 1–20,000 字（ASM）。 | `Task(DRAFT)`、`task_id` 和审计记录。 | 空白/超长/控制字符提示可定位错误；仅 owner/admin 可编辑。 |
| FR-TASK-002 | 上传输入资料并生成输入 manifest。 | 任务为 `DRAFT`/`INPUT_REQUIRED`；允许类型/大小在服务端策略中。 | R2 对象、SHA-256、原名、MIME、大小、上传者、扫描状态，关联 Task。 | 超限/不支持/扫描失败不能成为可执行输入；不得信任浏览器 MIME。 |
| FR-TASK-003 | 提交并启动任务。 | 必填名称/提示词通过；附件均为 `SAFE` 或用户确认无需附件（ASM）；无同一幂等键的活跃启动。 | `QUEUED`，创建 PEM v1、执行计划、初始总工事件，并启动/恢复对应的 Cloudflare Workflow（PLANNED）。 | 重复提交返回同一任务/幂等结果；无权限、受限、恶意文件、配额耗尽均不启动。 |
| FR-TASK-004 | 暂停、恢复、取消及从失败/返工点重试。 | 任务处于允许状态；owner/admin。 | 产生命令事件，运行器在安全检查点确认状态；保留既有证据。 | 不允许取消已 `PACKAGED` 的版本；竞态命令按单 Task 串行化；已取消不得自行恢复。 |

### 编排、实时进度与质量

| ID | 描述 | 输入/前置 | 输出/后置状态 | 异常与权限 |
|---|---|---|---|---|
| FR-ORCH-001 | 使用固定总工流水线创建并由可持久、可重试、可等待的 Cloudflare Workflow 执行 Execution Plan（PLANNED）。 | `QUEUED` Task、输入 manifest、策略版本。 | 总工及 15 阶段节点：Intake → Requirement → Product/CAD → Feasibility → Vision → Mechanical → Electrical → Software/MES → CT → BOM/Mfg/Cost → Digital Twin/Render → Validation → Project/Sales → Documentation → Chief Review → Packaging；Workflow 可在 Gate `REWORK/BLOCKED_ITEM` 或审批处等待并在合法命令后继续。 | 不适用阶段必须有规则、理由、影响评估和 Gate 批准；不得静默跳过；Workflow 的具体 API/等待机制实施时须以官方文档复验。 |
| FR-ORCH-002 | 每个 Agent 运行仅获得其角色说明、相关知识、PEM 切片及 Handoff。 | 上游 Gate 通过或有受控返工令。 | Agent run、输入引用、模型/提示版本、计划步骤、事件、产物和 Handoff。 | 禁止把完整租户资料或其他 Agent 全上下文泄漏给模型；模型调用失败转可重试/阻塞，不伪造完成。 |
| FR-PROG-001 | 实时显示总工与子 Agent 的“要做什么/在做什么/做到什么”。 | 运行器写出结构化事件；客户端订阅。 | 每阶段卡片：状态、当前步骤、0–100% 进度、最近事件、开始/结束/心跳；详情时间线。 | 进度更新以 `event_seq` 单调递增；连接中断显示最后事件时间及“等待重连”，不可显示假完成。 |
| FR-PROG-002 | 每一工作步骤可展开查看其产物、输入证据、检查结果与返工历史。 | viewer 有任务阅读权限。 | 版本化 artifact 列表与关联 Gate/Agent/run/引用。 | 未授权或隔离中资产不可预览/下载；内部密钥、原始隐私提示、隐式推理不展示。 |
| FR-GATE-001 | 独立 Gatekeeper 按结构化 Rubric 评审每个生产阶段。 | Agent 提交候选资产；所需证据可读取。 | 仅 `PASS`、`REWORK`、`BLOCKED_ITEM`；问题单含 ID、规则、证据、修复动作、Owner、影响和复验条件。 | 生产 Agent 不能给自己通过；无证据/解析失败=不可 PASS；`SKIPPED`/`NOT_RUN` 不能作为 PASS。 |
| FR-QA-001 | 实施 MiniMax→GPT 等效质量护栏（详见第 8 节）。 | 任一生成/工具产物。 | 自动验证结果、分数、问题、返工次数、路由决策、策略版本。 | 超过返工预算、关键证据缺失、模型不一致或安全风险进入 `QUALITY_BLOCKED`，等待 admin；不得打包。 |

### 产物、预览与打包

| ID | 描述 | 输入/前置 | 输出/后置状态 | 异常与权限 |
|---|---|---|---|---|
| FR-ART-001 | 产物不可变版本登记。 | Agent/Gate 写入已验证对象。 | Artifact 元数据：ID、名称、类型、来源、版本、SHA-256、Gate、可见性、预览状态。 | 同名不是覆盖条件；破损/病毒/不合格产物标记 `QUARANTINED`。 |
| FR-PREV-001 | 在线预览优先安全沙箱。 | 有阅读权限且预览状态 `READY`。 | PDF/图片/文本直接预览；Office 通过受控转换后的 PDF/HTML 预览（供应商/实现 TBD）；可显示“转换中/不可预览”。 | 不在 Worker 内承诺执行 Office；宏、外链、脚本不执行；原始下载另走授权 URL。 |
| FR-PACK-001 | 总工只打包 Gate 已批准且 manifest 完整的资产。 | Chief Review `PASS`；交付策略满足；无未处理阻塞项。 | `PACKAGING` → `PACKAGED`，R2 ZIP、manifest、清单、哈希、来源版本及可下载记录。 | Zip 构建失败、哈希不符、缺文件、未通过资产均为 `FAILED`/`QUALITY_BLOCKED`，绝不显示“交付完成”。 |
| FR-PACK-002 | 下载包和附件使用短期签名访问。 | `PACKAGED`；member owner/reviewer/admin。 | 审计下载事件；短有效期 URL（ASM：≤15分钟）。 | URL 过期重新鉴权；禁止跨租户 URL、目录遍历和缓存公开。 |

## 7. API / UI Requirements

以下为**逻辑契约**，不是本轮待实现接口或最终 URL 命名。

| 域 | 逻辑操作 | 响应要求 |
|---|---|---|
| Auth | `register`、`login`、`refresh`、`logout`、`me` | 返回身份/角色与安全会话；不返回密码散列、密钥或其他租户资料。 |
| Credits | `getBalance`、`listLedger`、`adminAdjust` | 金额使用整数最小单位；每条调整含操作者、理由、前后余额。 |
| Tasks | `createDraft`、`updateDraft`、`uploadInit/complete`、`submit`、`list/get`、`command` | 变更命令有 `idempotency_key`、版本/ETag 或等效并发控制。 |
| Execution | `getPlan`、`getRuns`、`getEvents(after_seq)`、`subscribe` | 事件具 `task_id`、`event_seq`、时间、来源、状态、可显示摘要和关联对象。 |
| Artifacts | `list`、`getMetadata`、`preview`、`download` | 权限校验在签 URL 前；预览是衍生安全副本。 |
| Admin | `listAudit`、`setRole`、`setQuota`、`resolveBlock`、`setRoutingPolicy` | 所有动作强审计，不能删除历史 Gate 结果。 |

标准错误对象至少含：`code`、面向用户的 `message`、`request_id`、可选 `field_errors`。运行状态类响应必须含最后 `event_seq` 与更新时间。禁止把上游模型原始错误、密钥、内部 prompt 或堆栈直接展示给普通用户。

## 8. MiniMax Token Plan 与 GPT 等效质量护栏

### 8.1 质量的定义与红线

“等效”是**输出可验证的质量下限**，不等同于模型型号、措辞或推理过程完全相同。平台以当前仓库总工的不可伪造、按需上下文、独立 Gate、证据链和反复返工原则为主合同。MiniMax 只能产生候选，不能自行宣布交付。

**任何一项命中即不可交付**：空白/模板填充、与输入无关、矛盾未解释、必要字段缺失、无输入引用却声称事实、伪造测试/供应商/渲染/文件、将 `TBD` 写作事实、使用未通过资产、Gate 证据缺失、Zip manifest/哈希不完整。

### 8.2 分层控制面（PLANNED）

1. **冻结标准**：每个 Agent 使用版本化角色卡、JSON 输出 schema、验收 Rubric 和允许工具清单；只注入最小 PEM 切片/Handoff/相关知识，而不发送全仓库或全聊天。
2. **输入与证据约束**：输出的事实性主张必须含 `evidence_refs`；证据分类强制为 `FACT/CALC/RULE/AI/ASM/TBD/POC/RISK/CONFLICT`；无引用自动失败或降格为 `ASM/TBD`。
3. **确定性校验**：schema、必填字段、引用可达性、hash/文件大小、链接权限、数值/单位、状态机、交付 manifest、禁用词/空洞率/重复率检查。此层不依赖 MiniMax 自评。
4. **独立语义 Gate**：另一次隔离调用（默认不与生产 run 共用上下文、temperature、role 或 run ID）按 Rubric 检查完整性、一致性、可执行性、可追溯性、输入对齐与交付门槛；仅可产生 `PASS/REWORK/BLOCKED_ITEM`。
5. **对抗检查**：对关键交付物做证据反查、跨文件矛盾检测、数值复算/格式验证、随机抽样复读、重复/抄模板检测；要求“主张—证据—产物”三元链接。
6. **返工闭环**：`REWORK` 只将结构化问题单、相关证据和 PEM 切片返给当前 Owner；每次返工生成新 artifact version 与 diff 摘要，不能覆盖原版本或把问题单删除。
7. **升级或人工阻塞**：连续两次（ASM，可配置）同一 Gate `REWORK`、出现关键 schema/事实冲突、关键产物不可验证或供应商能力故障时，尝试由配置允许的高能力审校模型复核（**GPT 路由许可和预算为 TBD**）；若未配置/仍失败，任务进入 `QUALITY_BLOCKED`，只 admin 可附理由处理。绝不降级为“先交付再说”。
8. **可审计决策**：每一次调用、校验、Gate、返工、路由/人工决策记录 `policy_version`、model/provider、输入/输出 artifact hash、耗时、成本估算、操作者与理由；原始敏感内容遵循最小保留。
9. **Golden Comparator**：对已分配 Golden Delivery Contract 的任务，按 [`07_GOLDEN_BASELINE.md`](07_GOLDEN_BASELINE.md) 检查交付槽位、CSV/JSON manifest、逐文件 Owner/基线/成熟度/证据/hash、工程视觉分类、跨文件一致性和验证真实性；任一红线失败都保持 `delivery_allowed=false`。

### 8.3 质量分与通过规则

界面可显示 `0–100` 分作为诊断，必须同时显示 Rubric 版本和是否“交付允许”。建议维度（ASM）：完整性 25、证据可追溯 25、一致性/计算 20、任务适配 20、格式与可用性 10。关键红线失败时，无论加权总分多少均 `delivery_allowed=false`；其他阶段默认需要 ≥85 且所有 P0 检查通过才可 Gate PASS。权重、阈值及何时启用 GPT 是管理员版本化策略，而非前端常量。

## 9. Target Cloudflare Architecture（全部 PLANNED，不代表已部署）

本节只定义职责边界；产品配置、兼容性、计价、限制、绑定语法和对 MiniMax/GPT 的实际 API 调用形式均为实施期事项，必须届时以 Cloudflare 及供应商官方文档复验，不能由本规格推定。

```text
Browser
  │ HTTPS / authenticated API / live event subscription
  ▼
Worker (edge API / BFF + auth/RBAC + signed-upload orchestration)
  ├─ D1 control plane: tenants/users/roles/tasks/runs/events metadata/ledger/audit/indexes
  ├─ R2 private data plane: input objects, artifacts, previews, final ZIP
  ├─ per-task Durable Object: command serialization + event_seq + realtime subscription + coordinator
  ├─ Cloudflare Workflow: durable 15-stage orchestration + retry + wait for rework/approval
  ├─ Queues: small asynchronous jobs / R2 event work / DLQ (at-least-once; consumer idempotency required)
  ├─ AI Gateway (optional): MiniMax/GPT routing and observation layer; never a quality-gate substitute
  └─ Realtime: DO WebSocket/SSE fan-out; reconnect via D1 event cursor
```

| 组件 | 责任 | 不应承担 |
|---|---|---|
| Worker（edge API/BFF） | API 鉴权、输入校验、签上传编排、读取模型/质量策略、启动或查询 Workflow、签名下载 | 15 阶段的长时编排、持久大文件处理、存密钥于代码。 |
| Durable Object（一个 task 一个协调者） | 单 Task 命令串行化、状态机/幂等去重、单调 `event_seq`、心跳、WebSocket/SSE 会话及协调 Workflow/Queue 的状态写入 | 长时 15 阶段编排、跨任务全局查询、无限长模型推理、永久对象归档。 |
| Cloudflare Workflows | 15 阶段长时且持久的编排、阶段级重试、检查点，以及等待 Gate 返工/管理员审批/外部工作完成后继续 | 替代 per-task DO 的实时连接/命令锁，或自行决定质量 Gate 结论。 |
| D1（控制面） | 关系元数据、状态索引、RBAC、credits 账本、可查询审计、事件 cursor/检查点 | 原始大文件、模型私钥、不可控无限事件正文。 |
| R2（私有文件/工件面） | 输入、artifact、预览衍生物、最终 ZIP、content hash、生命周期规则 | 公开桶、无授权直接浏览、唯一事务事实源。 |
| Queues | 小型异步工作、R2 事件后处理、通知、DLQ；采用 at-least-once 交付时消费者以 job/idempotency key 去重 | 承担 15 阶段的状态机顺序，或让同一 Task 被竞争消费者同时推进。 |
| AI Gateway（可选） | MiniMax/GPT 的路由、观测、可选成本/失败遥测；其启用与计价/API 形式均 TBD | 代替 schema/证据/确定性校验、独立 Gate、返工或 `QUALITY_BLOCKED` 决策。 |
| 外部渲染/模型 | 在批准的 Worker/Gateway 调用边界之外完成模型或 Office 转换 | 直接获得 R2 公共权限；转换前不进行恶意内容控制。 |

### 9.1 最小数据实体

`Tenant`、`User`、`Membership`、`Session`、`CreditAccount`、`CreditLedgerEntry`、`Task`、`TaskInput`、`ExecutionPlan`、`AgentRun`、`StepRun`、`Event`、`PEMRevision`、`Handoff`、`GateReview`、`Issue`、`Artifact`、`Preview`、`DeliveryPackage`、`IdempotencyKey`、`AuditLog`、`ModelPolicy`。所有业务实体带 tenant 边界；可下载对象的 R2 key 不作为公开能力令牌。

### 9.2 域名与环境

目标生产入口为 **`https://zg.gaona.world`（FACT：用户指定目标）**。实际绑定为 **TBD / OUT OF SCOPE**：需确认该域名由同一 Cloudflare 账户托管、域名所有权、Zone、现有 DNS/Worker 路由冲突、证书与环境隔离。最低建议环境：`dev`（`*.dev` 子域）、`staging`、`production`；生产绑定前须按 [`05_DEPLOYMENT_SOP.md`](05_DEPLOYMENT_SOP.md) 的核验/回滚步骤执行。

## 10. State Transitions

### 10.1 Task 状态机

```text
DRAFT ──submit──> INPUT_VALIDATING ──valid──> QUEUED ──claimed──> RUNNING
  ▲                     │ invalid                         │
  └────edit──────── INPUT_REQUIRED                         ├─pause──> PAUSING ──checkpoint──> PAUSED ──resume──> QUEUED
                                                           ├─gate rework──> REWORKING ──resubmit──> RUNNING
                                                           ├─quality/security/manual block──> QUALITY_BLOCKED ──admin resolution──> QUEUED | CANCELLED
                                                           ├─run failure──> FAILED ──retry──> QUEUED
                                                           ├─cancel request──> CANCELLING ──confirmed──> CANCELLED
                                                           └─chief pass──> PACKAGING ──manifest/hash pass──> PACKAGED
                                                                                                  │
                                                                                                download (状态不变)
```

`INPUT_VALIDATING`、`PAUSING`、`CANCELLING` 是命令已接受但尚未在协调者安全点确认的过渡状态。最终态：`PACKAGED`、`CANCELLED`；`FAILED` 与 `QUALITY_BLOCKED` 可在合法命令后产生新的 run，但历史 run 必须保留。

### 10.2 Agent/步骤状态

`NOT_STARTED → QUEUED → RUNNING → {SUCCEEDED | REWORK_REQUIRED | BLOCKED | FAILED | CANCELLED}`；只有上游依赖为 `SUCCEEDED` 并且其 Gate 为 `PASS` 的节点可 `QUEUED`。Gate 不是 Agent 成功的别名：`PENDING → PASS | REWORK | BLOCKED_ITEM`。

### 10.3 Credits 账本状态

本版本仅允许 `GRANT`、`ADMIN_ADJUSTMENT`、`DISPLAY_ESTIMATE`；`DISPLAY_ESTIMATE` 不改变余额。`RESERVE/DEBIT/REFUND` 为未来版本，任何出现必须被后端 feature flag 拒绝并记录审计（除非产品版本升级后显式启用）。

## 11. Acceptance Criteria

| AC ID | 可验证验收条件 |
|---|---|
| AC-001 | 未登录访问任务、artifact、账本或 admin 逻辑端点均不返回受保护数据；登录 member 只能看到自己/被授予任务。 |
| AC-002 | 注册时重复邮箱、弱密码、非法邮箱与频率超限均产生确定错误；系统没有任何路径存储或响应明文密码。 |
| AC-003 | 新用户拥有一条可审计账本账户记录；任务启动后余额和账本均无 `DEBIT`，且 UI 明示 v0.1.0 暂不扣费。 |
| AC-004 | member 可以创建保存草稿；无名称或无目标提示词时不能进入 `QUEUED`，字段错误可定位。 |
| AC-005 | 上传记录含服务端检测 MIME、大小、SHA-256、对象状态与上传者；`PENDING_SCAN`/`REJECTED` 输入不能启动任务。 |
| AC-006 | 同一 `idempotency_key` 并发调用启动只创建一个 active run 和一组初始事件；重试返回同一结果。 |
| AC-007 | 新启动任务创建固定 15 阶段编排计划并关联单一可恢复 Workflow 执行；任何“不适用”节点都可查到规则、理由、风险与 Gate 决定。Workflow 在 Gate `REWORK/BLOCKED_ITEM` 或批准等待期间持久化且不误推进下游。 |
| AC-008 | 对运行任务，命令中心同时显示总工及各阶段的文本状态、进度、最近事件和时间；在事件流断开时显示最后更新时间及重连/轮询状态，而不把进度改为 100%。 |
| AC-009 | 同一 Task 的 per-task DO 事件 `event_seq` 严格递增；刷新页面后从 D1 已持久 cursor 重建与刷新前一致的运行状态；实时订阅和 Workflow 重试均不得产生重复可见阶段推进。 |
| AC-010 | reviewer 能展开被授权任务的步骤，看到版本化 artifact、来源 run、证据引用及 Gate 结果；无权用户不能通过直接 object key/URL 获得内容。 |
| AC-011 | 任一 Agent 报告的事实性内容缺少 `evidence_refs`、输出不符合 schema、关键字段为空、或产生空洞/模板化结果时，自动 Gate 不能为 PASS，且生成结构化问题。 |
| AC-012 | Gate reviewer 与生产 Agent 使用不同 `run_id`、角色和输入上下文；生产 run 不能写入自身 Gate=`PASS`。 |
| AC-013 | 同一阶段连续两次返工仍未过、关键文件无法验证或出现重大事实冲突时，Task 进入 `QUALITY_BLOCKED` 或配置的高能力审校路由；没有“强制完成”用户按钮。 |
| AC-014 | 每一个输出/检查/返工/路由决策可通过 artifact hash、policy version、run ID 和审计时间关联；普通用户不能读取私有 prompt、密钥或推理链。 |
| AC-015 | PDF、图片、文本有隔离预览；Office 只预览转换后的安全副本，转换失败清楚显示且不执行宏/外链。 |
| AC-016 | 只有 Chief Review=PASS、无 `QUALITY_BLOCKED`、交付 manifest 完整且所有文件哈希匹配的任务可从 `PACKAGING` 转为 `PACKAGED`；任一失败禁止显示下载成功。 |
| AC-017 | 产物下载为短期、授权后签名地址；到期、跨 tenant 或撤权后的访问失败且记录审计。 |
| AC-018 | 管理员调整 credits、解除阻塞、改变模型策略均含操作者、理由、前后值和时间；管理员不能篡改既有 Gate 结论或伪造证据。 |
| AC-019 | 在生产绑定前，SOP 的 DNS/Zone/路由/证书/密钥/健康检查/回滚检查均有明确记录；本规格不将 `zg.gaona.world` 标为已绑定。 |
| AC-020 | Queue 消费者接收到至少一次投递的同一小型 job/R2 事件时，以持久 job/idempotency key 去重；重复投递不产生重复 artifact、重复账本记录、重复阶段状态转换或重复打包。 |
| AC-021 | AI Gateway 若启用，只能记录/路由 MiniMax/GPT 调用；关闭、失败或配置缺失时，schema/证据/独立 Gate/返工/阻塞规则仍按第 8 节生效，且任务不得因此被直接判定 PASS。 |

## 12. Edge Cases

| 场景 | 预期行为 |
|---|---|
| 空任务/空文件/0 字节文件 | 表单或上传完成校验拒绝，保持草稿，给字段级错误。 |
| 文件名相同、MIME 伪装、压缩包炸弹/含宏 | 以 hash 区分版本；服务端检测与扫描；高风险进入隔离，禁止模型/预览/打包。 |
| 双击启动、浏览器重试、Queue 至少一次投递 | idempotency key + per-task DO 单 Task 锁 + Workflow run 关联 + Queue consumer 去重，最多一个活跃阶段 run，且不重复写账本/产物/打包。 |
| 多标签页暂停/取消/恢复 | 状态版本比较；第一个合法命令确认，其余得到冲突或现态；客户端以事件重同步。 |
| WebSocket/SSE 断连、刷新、移动网络切换 | 以 `after_seq` 回补持久事件；心跳超时显示“连接/运行状态未知，最近更新 X”，不猜测。 |
| D1/Queue/R2/model/AI Gateway 暂时不可用 | Workflow/小型 job 按实施期经官方文档复验的重试策略恢复或转 DLQ；不丢失命令、不把阶段标成功，AI Gateway 失败不替代质量 Gate 或放宽交付门槛。 |
| Agent 卡死/超时 | DO 心跳阈值后 `FAILED` 或 `QUALITY_BLOCKED`，保留 partial artifacts 和诊断。 |
| 上游返工影响已完成下游 | 标记下游 `STALE`/重新排队（内部子状态），禁止用旧下游产物打包。 |
| Gate 与生产输出不一致 | Gate 决定优先；写冲突事件并创建返工/阻塞，不覆盖任一历史版本。 |
| 权限变更发生在预览/下载期间 | 每次签发重新鉴权；已发 URL 采用极短 TTL；撤权后不得再发新 URL。 |
| credits 不足（未来扣费启用前） | 只作预警，不阻止 FR-CR-002 的零扣费启动；必须能由 feature policy 明确解释。 |

## 13. Security, Privacy & Operations Requirements

- 传输必须 HTTPS；R2 不公开；敏感配置放 Cloudflare secrets，绝不置于 D1、代码、客户端或日志。
- 认证需要抗暴力破解、CSRF（若 cookie 会话）、会话固定、XSS/注入、滥用与上传攻击控制；最终认证供应商/协议为 TBD。
- tenant 隔离在 D1 查询、R2 key 命名、签 URL、Queue message 和 DO 路由五处同时执行；任何一处缺失视为 P0。
- 所有用户上传和模型产生文件进入预览/模型/下载前均有 content-type 检查、恶意内容策略和访问审计；保留期限、地域、删除权为 TBD。
- 事件日志须可追踪却须脱敏：记录摘要与 ID/hash，不记录密码、API token、签名 URL 或完整敏感输入。
- Queue 消息仅存 object/task/job/idempotency 引用，不嵌入大附件或秘密；at-least-once 消费必须在写 artifact、账本、阶段或打包前去重。外部模型只得到批准的最小数据、时间有限的读取路径或由 Worker 代理；可选 AI Gateway 不可绕过质量门。
- 生产操作需要速率限制、可观测性（request/task/run correlation ID）、告警、DLQ 处理、备份/恢复演练和回滚路径。

## 14. Risks

| 风险 | 影响 | 控制/未决 |
|---|---|---|
| MiniMax 产物低质、幻觉或敷衍 | 直接伤害客户交付可信度 | 第 8 节多层验证、独立 Gate、返工、阻塞；GPT 审校预算和可用性 TBD。 |
| Worker/DO 时限与长 Agent 链冲突 | 任务中断或重复运行 | 由 Cloudflare Workflow 承担 15 阶段长时持久编排，DO 只做 per-task 协调；Queue 小工作幂等处理。具体 API/限制/计价需实施期官方复验。 |
| Office 在线预览涉及转换安全和供应商限制 | 预览不可用或资料泄露 | 仅安全衍生副本；转换服务/许可/数据区域 TBD。 |
| 多租户 R2 签 URL 越权 | P0 数据泄露 | tenant + ACL 双重校验、私有桶、短 TTL、审计和负向测试。 |
| credits 后续收费语义改变 | 账务争议 | 首版绝不扣费，使用不可变账本及 feature policy；计价表/币种 TBD。 |
| `zg.gaona.world` 现有配置冲突 | 影响既有站点 | 不部署前只文档化；需 Zone/DNS/路由所有权证据与回滚。 |
| 总工 skill 的工程合同被错误简化 | 垃圾/假交付 | 把固定流程、Gate、证据和严格交付策略映射到平台策略；不满足就阻塞。 |

## 15. Deliverables（本迭代）

1. 本规格及 `01_CHANGELOG.md`、`02_FEATURE_LIST.md`、`03_WORKFLOW.md`。
2. `04_USER_MANUAL.md`（目标操作说明）、`05_DEPLOYMENT_SOP.md`（未来部署前/后手册）、`06_TEST_ACCOUNTS.md`（非真实凭据策略）。
3. 三张 v2 静态视觉实现参考：`visuals/01-task-command-center-v2-quality-safe.png`、`visuals/02-new-task-studio-v2-fixed-plan.png`、`visuals/03-artifact-preview-delivery-v2-safe.png`；无 `-v2-` 后缀的 v1 图片仅保留为 QA/审计证据，不能作为实现状态合同。
4. 后续 Builder 才应交付：Worker 前后端代码、schema/migrations、IaC/配置、模型/预览适配器、自动化测试、部署记录；这些**尚未交付**。

## 16. Missing Questions & Conservative Defaults

| 未决问题 | 保守默认（直到确认） | 影响 |
|---|---|---|
| MiniMax 的准确产品名、API、模型、上下文/并发限制、数据条款、Token Plan 配额 | 不调用、不写死 SDK；实现为可替换 provider adapter，模型路由由 admin policy 管理。 | 成本、吞吐、质量、合规。 |
| GPT 审校是否可用、允许的模型/预算/地区 | 不把 GPT 当作必有依赖；无可用高能力路由时质量失败即阻塞。 | “等效质量”兜底能力。 |
| `zg.gaona.world` 的 Zone 所有权、现有站点、目标环境和 DNS 管理授权 | 不创建任何 DNS/Worker 路由；生产只在核验后绑定。 | 部署与回滚。 |
| 登录方式、邮箱服务、验证/找回、密码政策、法务条款 | 只做本地身份逻辑规格；默认强密码、会话可撤销。 | 用户进入流程。 |
| 初始 credits、计价公式、货币、购买/退款/税务 | 初始值/估算只显示 TBD；不扣费、不支付。 | 商业模型。 |
| 组织/团队模型、谁可以给 reviewer 授权 | 默认单用户个人空间 + admin（ASM）；预留 tenant/membership。 | RBAC 数据模型。 |
| 附件类型/大小/保留期限、PII/跨境需求 | 白名单和扫描必需；生产限额与数据保留均 TBD。 | 上传与合规。 |
| Office 预览提供商、许可、宏和数据驻留 | 不承诺 Worker 内转换；不可预览时只安全下载。 | 用户体验与成本。 |
| 是否所有 15 个总工阶段都适用于客户任务 | 默认完整流水线；不适用需由 Gate 审批且留证。 | 任务时长与产品配置。 |
