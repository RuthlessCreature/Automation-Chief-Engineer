# Stage Harness 调度与质量闭环

## 为什么需要 Harness

Cloudflare Workflow 负责长流程持久化、断点和异步执行；它不应该直接把模型响应当作阶段产出。每一个阶段都必须经过独立 Harness，才能进入 R2、事件流和下一阶段。

## 阶段内顺序

```text
STAGE_STARTED
      ↓
provider candidate
      ↓
结构门禁（schema / body / evidence / provenance）
      ↓
占位符门禁（TBD / TODO / N/A / 待定）
      ↓
Golden Contract（证据、工程性、可追溯、诚实、完整）
      ├─ PASS → persist artifact → STAGE_OUTPUT → STAGE_GATED → next stage
      └─ FAIL → 带原因反馈重新生成（最多 3 次）
                         └─ 仍失败 → QUALITY_BLOCKED，流程正常结束
```

被拒绝的候选不会写入 R2、不会进入 accepted artifacts、不会触发下一阶段。质量阻断不是运行时异常，因此不会伪装成 `WORKFLOW_EXECUTION_ERROR`，也不会被后台瞬态重试策略反复重跑。

## 两层调度

1. **Stage Harness**：每阶段最多 3 次模型候选/修复，保证不合格内容不能越过 GATE。
2. **Workflow retry**：只处理上游 408/409/429/5xx、非 JSON、超时等可恢复错误；每个 workflow run 最多 2 次。质量阻断不走这一层。

人工点击“受控返工重跑”会创建新的 workflow run，保留已经通过的 checkpoint，从阻断阶段重新进入 Harness。retry audit 按 workflow run 隔离，历史返工不会与新 run 的 attempt 1/2 冲突。

## 当前边界

MiniMax 可能多次输出思考过程、非 JSON 或未完成内容。Harness 会拒绝这些候选；它不会为了让进度条继续而清洗、补写或伪造工程事实。若连续失败，用户需要修改输入或再次点击受控返工。
