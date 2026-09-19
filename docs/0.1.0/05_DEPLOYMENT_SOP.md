# v0.1.0 部署 SOP（实施记录与后续门禁）

**目的**：定义将未来实现的应用部署至 Cloudflare，并在验证后绑定 `zg.gaona.world` 的安全流程。  
**当前事实（2026-09-17）**：v0.1.0 最小纵切已部署到 Cloudflare：Worker、D1、私有 R2、每任务 Durable Object 和 Workflow 已创建；D1 迁移 `0001`–`0003` 已在远端应用；自定义域名 `https://zg.gaona.world` 已绑定并返回 HTTPS `200`。这只证明基础入口和控制面已上线，**不等于产品发布批准**。MiniMax M3 的 OpenAI 兼容适配器已实现并有 mock 合约测试；由于生产 API key 尚未设置，生产任务启动仍被明确失败关闭。

## 0. 本次实际部署证据（2026-09-17）

| 项目 | 实际结果 |
|---|---|
| Worker | `automation-chief-engineer-cloud`，当前版本 `6a944a3c-3144-46ef-b493-31e06fd8933e`。 |
| 网络入口 | `https://zg.gaona.world`，Cloudflare custom domain，HTTPS 页面访问 `200`。 |
| 存储与编排 | D1 `automation-chief-engineer-cloud`、私有 R2 `automation-chief-engineer-artifacts`、`TaskCoordinator` Durable Object、`ace-task-workflow` Workflow。 |
| 远端迁移 | `0001_control_plane`、`0002_internal_delivery_layers`、`0003_task_inputs` 均已应用。 |
| 远端 smoke | 注册 `201`、登录 `200`、创建草稿 `201`；未设置 `MINIMAX_API_KEY` 时启动返回受控 `503`，不排队、不扣 credits。 |
| 本地质量证据 | `npm run check` 通过：Worker 类型、TypeScript、3 个 Vitest 文件/6 个测试和 Wrangler dry-run 均通过。 |
| 不可据此宣称 | MiniMax 真实账户调用与质量基线验收、文档/CAD 安全转换、交付 ZIP、计费、端到端浏览器/安全/负载测试、独立 QA/Release Judge 都尚未完成。 |

## 1. 前置批准与责任

| 检查 | 必须证据 | 状态 |
|---|---|---:|
| 代码与 QA Release Decision | 已完成的构建、自检、独立 QA、修复、复测、发布裁决 | NOT_READY（本轮仅规格） |
| Cloudflare 账户/Zone 权限 | 域名管理员确认 `gaona.world` Zone 及最小权限部署身份 | TBD |
| `zg.gaona.world` 路由冲突 | 当前 DNS、Worker Routes、Pages/Access/反向代理占用审计 | TBD |
| 模型/预览供应商 | MiniMax/GPT/Office 的正式契约、密钥、数据处理及限额 | TBD |
| 安全/隐私 | 数据分类、保留/删除、区域、DPA、应急联系人 | TBD |
| 商业策略 | credits 初值、计量、收费启用条件及支持边界 | TBD |

任何一项未满足，停止在 staging；不得绑定生产域名。

## 2. 目标环境与隔离

| 环境 | 目的 | 域名建议 | 数据/密钥 |
|---|---|---|---|
| development | 本地与个人开发 | 不绑定生产域名 | 独立测试资源/测试 key。 |
| staging | 集成、负向安全、真实配置冒烟 | 例如 `staging.zg.gaona.world`（需确认） | 独立 D1/R2/Queue/DO/Workflow/可选 AI Gateway 配置和 staging secrets。 |
| production | 受控发布 | `zg.gaona.world` | 独立生产资源、最小权限 secrets、审计/告警。 |

严禁 staging 与 production 共用 D1 数据库、R2 bucket、Queue、Durable Object namespace、Workflow/AI Gateway 环境配置或模型高权限密钥。

## 3. 部署前构建检查（实施后执行）

1. 检出经 Release Judge 批准的不可变 commit/tag；记录 commit SHA、构建时间、操作者。
2. 运行项目锁定的 lint、类型检查、单元/集成/E2E、迁移校验、依赖/秘密扫描和本规格 AC 对应测试。任何 `FAIL`、核心 `NOT RUN` 或未接受 Major 均不可继续。
3. 检查 Worker edge API/BFF 配置：环境名、路由、D1/R2 binding、Queue producer/consumer、per-task DO binding、Workflow binding/版本、可选 AI Gateway 路由/观测配置、迁移 tag 与兼容性日期全部指向正确环境；具体字段和语法须以部署时官方文档复验。
4. 检查不会把 secret、模型 token、签名密钥、用户附件、真实 session 或生产 URL 写入构建产物、前端环境变量或日志。
5. 生成部署清单：代码 SHA、Worker 版本、迁移版本、策略版本、发布者、时间、回滚目标。

## 4. Cloudflare 资源配置（实施后执行）

按 IaC 或受审计的部署脚本创建/核验，**不使用手工临时生产配置作为唯一事实源**：

1. 每环境独立 Worker 服务及受限 service token。
2. 每环境独立 D1：迁移前备份/导出可用；迁移只允许向前兼容或经演练回滚。
3. 每环境独立私有 R2 bucket：禁止 Public Access；配置对象加密、生命周期、审计与只允许服务端签 URL 的策略。
4. 每环境独立 Queue + DLQ：只处理小型异步工作/R2 事件；写明最大重试、保留、告警与人工重放 SOP。按 at-least-once 交付设计，消息只含 task/object/job/idempotency reference，消费者写任何业务效果前必须去重。
5. Durable Object namespace：应用每 Task 一协调者，负责命令串行、`event_seq` 与订阅；升级迁移兼容性先在 staging 验证。
6. 每环境配置 Cloudflare Workflow，用于 15 阶段持久编排、阶段重试和返工/审批等待；核对部署版本、状态保留/恢复和与 DO/Queue 的幂等边界，具体配置形式部署时复验。
7. 可选 AI Gateway 如启用，仅配置 MiniMax/GPT 路由和观测；不得将 Gateway 成功率、缓存命中或调用完成配置为质量 Gate 通过条件。
8. 设置 Worker secrets（认证、会话签名、MiniMax、可能的 GPT/Office、Webhook）；只经 secret 机制注入，记录 secret 名和轮换日期，**不得记录值**。
9. 配置可观测性：request/task/run/workflow correlation ID、错误率、Workflow 恢复/等待、Queue backlog/DLQ/重复投递去重、DO alarm、模型/AI Gateway 失败、质量阻塞、签 URL 异常和告警值。

## 5. Staging 验证门

完成后必须保存时间戳证据，至少覆盖：

- 匿名/登录/member/reviewer/admin 正向与越权负向访问；
- 注册/登录限制、任务草稿、幂等启动、上传拒绝/扫描、R2 私有性；
- per-task DO 命令串行、事件顺序/刷新回补/断线显示、暂停取消竞态；Workflow 在 15 阶段、返工/审批等待和重试后恢复且不误推进；
- Queue 重试/DLQ/重复投递：重复小型 job 或 R2 事件不得产生重复 artifact、账本、阶段推进或 ZIP；
- 可选 AI Gateway 关闭、失败、路由变更与观测异常时，独立质量 Gate/返工/`QUALITY_BLOCKED` 仍照常生效；
- Gate 独立性、无证据/空洞输出拒绝、两次返工的 `QUALITY_BLOCKED` 行为；
- artifact 预览隔离、Office 宏/外链不执行、签名下载过期/跨 tenant 失败；
- manifest/hash 失败不得 `PACKAGED`；credits 账本零扣费；
- 安全扫描、性能基线、日志脱敏、错误页不泄露内部信息。

任何 P0/P1 未通过、质量绕过、tenant 数据可见、或回滚未演练：发布 **BLOCKED**。

## 6. 绑定 `zg.gaona.world` 的生产变更窗口

1. 由域名所有者书面确认 `gaona.world` Cloudflare Zone、现有记录/路由、变更窗口、TTL、回滚负责人和影响范围。
2. 导出现有 `zg.gaona.world` DNS/路由快照；确认该子域不承载未迁移的既有业务。若已有业务，先获得迁移方案和业务 owner 批准。
3. 生产 Worker 先部署为不接流量版本，运行健康检查和仅管理员可见 smoke test。
4. 将自定义域名/Worker route 绑定至目标 Worker（确切方式根据届时 Cloudflare 产品配置确认）；验证 TLS 证书已就绪、HTTPS 强制、HTTP 行为及缓存/安全头。
5. 以低风险账户完成生产 smoke：登录、读取自身任务、创建草稿（如允许）、不使用真实客户机密或扣费；验证日志与告警。
6. 监控至少一个约定观察窗口（长度 TBD），关注 4xx/5xx、鉴权、Workflow 等待/恢复、Queue/DLQ/去重、DO、模型/可选 AI Gateway、R2、延迟和异常下载。
7. 记录最终路由、Worker version、D1 migration、策略版本、验证清单、操作者与结论；只有证据完整后才对外宣布上线。

## 7. 回滚 SOP

触发：P0 安全事件、数据隔离失败、认证广泛不可用、任务状态/打包损坏、异常成本/模型调用、或关键健康指标超过已批准阈值。

1. 立即停止新任务入队/模型调用，保留读/审计路径（若安全允许）。
2. 将 `zg.gaona.world` 路由恢复为已验证 Worker 版本或先前 DNS 记录；记录开始时间和操作者。
3. 暂停有风险 Queue consumer，禁止自动重放；暂停/隔离有风险 Workflow 的后续推进并保留其等待/检查点；保存 DLQ/事件/审计证据。
4. 若迁移涉及数据，使用已演练的兼容策略或备份恢复，**不得**在生产现场执行未经验证的破坏性 D1 操作。
5. 轮换可能泄漏的 secrets，撤销短期访问，评估受影响 tenant，并按已批准事件响应流程通知。
6. 完成事故记录、根因、影响、补救、复测和重新发布审批。未完成这些步骤不得再次绑定生产流量。

## 8. 日常运维

- 每日检查 Worker 错误、Workflow 等待/恢复异常、Queue backlog/DLQ/去重、DO 报警、模型/可选 AI Gateway 失败率、质量阻塞率、R2/下载异常和 credits 管理员调整。
- 定期抽检跨 tenant 授权、签 URL TTL、脱敏日志、artifact/manifest hash 与质量 Gate 独立性。
- 密钥、策略、依赖、Cloudflare 权限按已批准周期轮换；所有变更可追溯且能回滚。
- 任何“先直接交给客户”的手工绕过都违背本产品质量合同；紧急例外也必须记录并不能伪造 Gate PASS。
