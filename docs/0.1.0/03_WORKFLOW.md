# v0.1.0 工作流

本文描述目标产品操作与系统状态，不表示已实现。

## 1. 用户主链路

```text
访问站点
  └─ 未登录：注册 / 登录
       └─ 登录成功：任务中心 + credits（v0.1.0 不扣费）
            └─ 创建任务草稿：名称 + 提示词 + 交付偏好
                 └─ 上传资料：R2 暂存 → 扫描/哈希/MIME 校验 → 输入 manifest
                      ├─ 失败/缺件：INPUT_REQUIRED，修正后重试
                      └─ 通过：提交（幂等）→ QUEUED
                           └─ Worker edge API/BFF 启动或恢复持久 Workflow（PLANNED）
                                └─ 总工建立 PEM 和执行计划 → RUNNING
                                └─ 逐 Agent：计划 → 运行 → 候选产物 → 独立 Gate
                                     ├─ PASS：解锁下游阶段
                                     ├─ REWORK：只返当前 Owner + 问题单，形成新版本
                                     └─ BLOCKED_ITEM：QUALITY_BLOCKED，等待管理员有理由处理
                                          └─ Chief Review PASS → PACKAGING
                                               └─ manifest/hash 校验
                                                    ├─ 不通过：FAILED / QUALITY_BLOCKED
                                                    └─ 通过：PACKAGED → 授权下载 ZIP
```

## 2. 创建与输入流程

1. member 在任务中心点“新建任务”，系统创建 `DRAFT`。
2. 用户填写项目名称和问题/目标。客户端可即时提示，服务端是唯一提交判定。
3. 用户可上传多个资料。每个对象先通过受限上传路径落 R2，服务端记录 hash、大小、检测 MIME 和扫描状态；文件不因扩展名被信任。
4. `SAFE` 文件组成 manifest。`PENDING_SCAN`、`REJECTED`、缺失的必填资料会令状态留在 `INPUT_REQUIRED`。
5. 用户点击“开始方案”。携带 `idempotency_key`；per-task DO 获取串行命令权，Worker edge API/BFF 只启动或恢复一个关联的 Workflow（均为 PLANNED）。系统只创建一次计划和初始事件。
6. v0.1.0 写 `BILLING_SKIPPED_V0_1_0` 事件而不写 debit。页面显示余额但清楚标注“此版本暂不扣积分”。

## 3. 运行与观测流程

1. Cloudflare Workflow 持久执行 15 阶段：总工读取输入 manifest，初始化 PEM revision、阶段依赖和策略版本；在 Gate 返工、管理员审批或外部小工作结果前可等待，合法恢复后才继续（PLANNED）。
2. 每个准备就绪的 Agent run 把“计划做什么”写为结构化计划事件，再写当前步骤、心跳和完成/异常事件。小型异步工作或 R2 事件经 Queue 处理；Queue 为 at-least-once，消费者在写任何业务效果前按 job/idempotency key 去重。
3. 浏览器连接 per-task DO 的实时通道，并以单调 `event_seq` 对齐。DO 负责命令串行化和订阅协调，不承担 15 阶段长时编排。流水线顶部给出全链路缩略状态；当前 Agent 详情显示步骤时间线、产物和证据。
4. 连接断开时客户端保留最后已知事件并标示时间；重连后带 `after_seq` 从 D1 cursor 回补，不以动画或定时器虚构进度。AI Gateway 如实施，只记录/路由 MiniMax/GPT 调用，不能把调用成功显示为质量通过。
5. 用户可展开任意有权限的步骤：查看候选/已批准 artifact、引用的输入、Gate 结果、返工历史。机密配置、原始敏感 prompt、内部推理不显示。

## 4. 质量门与返工流程

```text
Agent candidate
  └─ schema + evidence + deterministic validators
       ├─ FAIL → Issue（REWORK_REQUIRED）→ 当前 Agent 仅获问题单/最小上下文 → 新 artifact version
       └─ PASS → isolated Gatekeeper
                    ├─ PASS → 冻结上游事实/Handoff，解锁下游
                    ├─ REWORK → 同上，旧版保留且不可打包
                    └─ BLOCKED_ITEM → QUALITY_BLOCKED + 管理员处理说明

两次同阶段 REWORK / 关键冲突 / 无法验证
  └─ 若获许可：更高能力审校路由复核
  └─ 否则：QUALITY_BLOCKED；不得“跳过”或把 NOT_RUN 当 PASS
```

质量面板总是同时显示：`Gate 决定`、`delivery_allowed`、Rubric/策略版本、分项检查、缺口、证据数量和最近检查时间。一个漂亮的 92/100 分不能覆盖红线失败。

## 5. 暂停、取消、失败恢复

| 用户动作 | 允许来源状态 | 系统行为 | 用户可见结果 |
|---|---|---|---|
| 暂停 | `QUEUED`、`RUNNING`、`REWORKING` | 写命令，当前 run 到安全检查点后停止出队/调用 | `PAUSING`，随后 `PAUSED`；已产生证据保留。 |
| 恢复 | `PAUSED` | 重验依赖/权限/策略后重新入队 | `QUEUED`，从安全检查点继续或创建新 run。 |
| 取消 | 非最终状态 | 写 `CANCELLING`，撤销后续 work；不删除审计/产物 | `CANCELLED` 或显示尚待确认。 |
| 重试 | `FAILED` | 创建关联新 run，保留失败 run 与原因 | `QUEUED`；不可覆盖历史。 |
| 管理员解除阻塞 | `QUALITY_BLOCKED` | 选择合规的重新路由/补件/关闭理由；写不可变审计 | 回到 `QUEUED` 或 `CANCELLED`；不可直接改为 `PACKAGED`。 |

## 6. 权限分支

- 匿名用户只可注册/登录；不得枚举用户、任务或文件。
- member 对自己/被授权任务拥有操作或查看能力，最终动作仍由任务 owner/admin 校验。
- reviewer 只能查看已授权任务及其安全产物，无启动、取消、策略或账本权限。
- admin 可以配置/审计和解决阻塞，但不能替 Gate 伪造 PASS、改写 artifact hash 或越过打包条件。
- system 账号是服务端内部角色，不向浏览器暴露且仅获得单任务所需范围。

## 7. 产物预览与交付链路

1. Agent 提交候选文件到私有 R2，注册不可变 artifact 版本。
2. 校验与 Gate 通过后，Artifact 被标记为可供下游使用；未通过版本保留以便审计但不可进 Zip。
3. 预览请求先进行 RBAC。PDF/图片/文本以安全 viewer 展示；Office 仅展示转换的 PDF/HTML 衍生物，转换失败时给出清晰状态，不运行宏或外链。
4. 若任务选择了 Golden Delivery Contract，Chief Review 额外运行 Golden Comparator：核验固定槽位、逐文件成熟度与证据、工程视觉分类、CSV/JSON manifest、完整 SHA-256 和开放项；任一红线失败保持 `delivery_allowed=false`，并产生结构化 `REWORK/BLOCKED_ITEM`。
5. Chief Review 通过后 Packaging 汇集批准版本、生成 manifest 与 hash；全部验证成功才生成 ZIP。
6. 用户点击下载时重新授权，获取短期签名 URL；下载事件被记录。

## 8. 异常处理原则

- **不能证明的完成不算完成**：模型/渲染/Queue 出错，状态是失败、重试或阻塞，不是 100%。
- **长编排与小工作分离**：15 阶段的等待/重试/恢复由 Workflow 处理；Queue 的 at-least-once 重复消息必须幂等，不能使同一 Task 重复推进、写重复 artifact 或打包。
- **不可恢复的安全风险优先隔离**：输入/产物可能恶意时禁止进入模型、预览和打包。
- **前后端不一致以持久事件和状态机为准**：客户端刷新/回补，不直接写状态。
- **跨阶段影响必须传播**：上游已通过产物被返工后，相关下游节点标过期并不能使用旧包交付。
