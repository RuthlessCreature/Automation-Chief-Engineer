# v0.1.0 测试账户与测试数据策略

**状态：PLANNED。** 本文件不包含真实用户名、密码、Token、邮箱或生产账户。本版本也未创建 Cloudflare、MiniMax、GPT 或域名账户。

## 1. 账户原则

- 测试身份由测试环境在运行时通过 secret/fixture 创建；不得提交到仓库、截图、日志或文档。
- 所有凭据使用环境 secret 或一次性密码；测试完成后自动失效/删除（具体机制 TBD）。
- 测试 tenant 必须与 production 物理/逻辑隔离；禁止用真实客户资料验证上传、预览或模型质量。
- 名称只是测试角色标识：`member_a`、`member_b`、`reviewer_a`、`admin_a`、`disabled_user`、`system_worker`，不能当作可登录账号。

## 2. 所需测试身份矩阵

| 逻辑身份 | 角色/tenant | 最小测试数据 | 关键验证 |
|---|---|---|---|
| `member_a` | member / Tenant A | 自己的草稿、运行任务、完成包 | 创建/上传/启动/暂停、看自己的账本和下载。 |
| `member_b` | member / Tenant B | Tenant B 独立任务/对象 | 对 Tenant A task、event、artifact、签 URL、ledger 均为拒绝。 |
| `reviewer_a` | reviewer / Tenant A，授予一个 task | 一个被授权 task + 一个未授权 task | 能看授权证据/预览/包；不能启动/取消/编辑，也不能看未授权。 |
| `admin_a` | admin / Tenant A | 审计/策略/账本调整 fixture | 有理由调整 credits、解除阻塞、看审计；不能篡改 Gate/哈希。 |
| `disabled_user` | 禁用账号 | 无 | 登录被拒绝且不泄露诊断。 |
| `system_worker` | server-only system | Queue/DO 最小资源引用 | 不可通过浏览器登录；仅能按单 Task 服务权限运行。 |
| `anonymous` | 未登录 | 无 | 只能访问公开认证端点，保护数据为拒绝。 |

## 3. 所需测试任务/文件夹具

| Fixture | 内容 | 预期用途 |
|---|---|---|
| `valid-input-set` | 脱敏 PDF、图片、文本及已知 hash | 成功上传、manifest、预览、运行。 |
| `zero-byte-file` | 0 字节伪文件 | 上传/提交拒绝。 |
| `mime-spoof` | 扩展名与实际内容不符的安全样本 | 服务端 MIME 拒绝。 |
| `malicious-or-quarantine` | 经安全流程许可的无害模拟危险标识样本 | `PENDING_SCAN/REJECTED` 不可执行/预览。 |
| `office-macro-sim` | 不含可执行真实恶意内容的受控测试文件或 mock | 验证预览转换不执行宏/外链。 |
| `empty-agent-output` | schema 为空/缺 evidence 的模拟 provider 返回 | 验证 AC-011，禁止 PASS。 |
| `conflicting-output` | 与 PEM/输入矛盾的模拟返回 | 验证对抗检查/REWORK/QUALITY_BLOCKED。 |
| `packaging-hash-mismatch` | hash 不匹配 mock artifact | 验证不能进入 `PACKAGED`。 |
| `duplicate-start` | 并发相同 idempotency key 请求 | 验证一个 active run 和单调 event。 |

## 4. Credits 测试约束

- 每个 fixture member 有独立、可重置的账本账户和确定的初始余额（数值由测试配置设定，不是生产价格）。
- v0.1.0 的任意创建/启动/失败/重试/打包测试后，必须断言无 `DEBIT`、`RESERVE`、`REFUND` 条目，余额不变；可存在 `DISPLAY_ESTIMATE` 与 `BILLING_SKIPPED_V0_1_0` 审计事件。
- admin 调整仅在 fixture tenant 内进行，并断言理由、操作者、前后余额与时间存在。

## 5. 密钥与外部服务策略

- 单元/集成测试默认使用 MiniMax、GPT、Office 转换、邮件和支付的 fake adapter；严禁隐式打到真实 Token Plan 或生产模型。
- 若 staging smoke 需要真实 provider，使用独立低权限 key、最小脱敏提示、支出上限和可审计 run；完成后轮换/撤销。
- 任何测试输出、失败响应、截图或日志都必须检查不含 API key、Authorization header、Cookie、signed URL、密码或完整私人附件。

## 6. 运行前检查清单

1. 确认目标是 `development` 或 `staging`，不是 production。
2. 确认所有 fixture 账户/tenant/存储前缀隔离，且没有复用真实数据。
3. 从环境 secret 注入临时凭据；不要通过命令行历史、提交或聊天粘贴。
4. 运行后清理测试对象/会话，保留仅必要的脱敏审计证据。
5. 若发现泄漏、跨 tenant 访问、扣费或未经授权的真实模型调用，立即停止测试并按部署 SOP 的事故路径处理。

