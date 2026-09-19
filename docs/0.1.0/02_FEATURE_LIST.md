# v0.1.0 功能清单与验收映射

状态定义：`SPECIFIED` = 已写入可验收规格，尚未实现；`TBD` = 需要决定；`OUT_OF_SCOPE` = 本版本禁止实现/宣称。

| 模块 | 功能 | 状态 | 规格/验收 |
|---|---|---:|---|
| 身份 | 邮箱密码注册、登录、登出、会话 | SPECIFIED | FR-AUTH-001/002；AC-001/002 |
| 权限 | member/reviewer/admin/system、tenant 隔离 | SPECIFIED | FR-RBAC-001；AC-001、010、017、018 |
| Credits | 余额、账本、估算、管理员调整 | SPECIFIED | FR-CR-001；AC-003、018 |
| Credits 扣费 | reserve/debit/refund、支付充值 | OUT_OF_SCOPE | FR-CR-002；AC-003 明确零扣费 |
| 任务 | 创建/编辑草稿、校验、列表、命令 | SPECIFIED | FR-TASK-001/004；AC-004、006 |
| 输入资料 | R2 上传、MIME/哈希、扫描、manifest | SPECIFIED | FR-TASK-002；AC-005 |
| 启动 | 幂等提交、PEM/计划创建、启动/恢复 Workflow | SPECIFIED | FR-TASK-003；AC-006、007 |
| 长时编排 | Cloudflare Workflows 执行固定 15 阶段、可持久重试及等待返工/审批 | SPECIFIED / PLANNED | FR-ORCH-001/002；AC-007、012 |
| Task 协调与实时 | per-task Durable Object：串行命令、`event_seq`、订阅及协调 | SPECIFIED / PLANNED | FR-PROG-001；AC-006、009 |
| 实时观察 | Agent 卡片、进度、步骤、日志、刷新恢复 | SPECIFIED | FR-PROG-001/002；AC-008、009、010 |
| 质量控制 | Schema/证据/事实/格式检查、独立 Gate、返工 | SPECIFIED | FR-GATE-001、FR-QA-001；AC-011–014 |
| Golden Baseline | 版本化 Golden Delivery Contract、逐文件 artifact ledger、Golden Comparator、Golden regression fixture 管理；样例只读且脱敏使用 | SPECIFIED / PLANNED | 00_SPEC §8；[`07_GOLDEN_BASELINE.md`](07_GOLDEN_BASELINE.md) |
| 产物库 | 不可变 artifact/version/关联证据 | SPECIFIED | FR-ART-001；AC-010、014 |
| 在线预览 | PDF/图片/文本、Office 安全衍生预览 | SPECIFIED | FR-PREV-001；AC-015 |
| 交付 | 通过 Gate 后 ZIP、manifest、hash、签名下载 | SPECIFIED | FR-PACK-001/002；AC-016、017 |
| 平台 | Worker edge API/BFF、per-task DO、Workflows、D1 控制面、R2 私有文件面、Queues 小任务/DLQ、可选 AI Gateway | SPECIFIED / PLANNED | 00_SPEC §9；AC-006–009、016、020、021 |
| 域名 | `zg.gaona.world` 生产绑定 | TBD / OUT_OF_SCOPE | 00_SPEC §9.2；AC-019 |
| 模型 | MiniMax candidate adapter 与配置路由；可选 AI Gateway 只做路由/观测，不替代质量闸门 | SPECIFIED / PLANNED | 00_SPEC §8–9；AC-011–014、021 |
| GPT | 审校/升级 route | TBD | 00_SPEC §8.2；AC-013 |
| Office 转换 | 供应商和许可 | TBD | FR-PREV-001；AC-015 |
| 支付/SSO/MFA/邮件找回 | 商业和高级认证 | OUT_OF_SCOPE | 00_SPEC §3 |

## 关键依赖图

```text
认证与 tenant 边界
  └─> 任务/上传 ─> 输入 manifest ─> 编排计划 ─> Agent + Gate 事件
                                              ├─> 证据/产物/预览
                                              └─> Chief Review ─> 打包 ─> 授权下载

模型路由策略 ─> 候选生成 ─> 确定性检查 ─> 独立 Gate ─> 返工 / 升级 / QUALITY_BLOCKED
```

## Definition of Done（规格阶段）

- 每个 `SPECIFIED` 条目都在 `00_SPEC.md` 有 FR、状态/权限和至少一个可测试 AC。
- 所有 `TBD` 与 `OUT_OF_SCOPE` 均不被描述成已完成。
- 后续实现必须补充代码、迁移、测试、运行证据；目前这些项目仍是 `NOT_IMPLEMENTED`。
