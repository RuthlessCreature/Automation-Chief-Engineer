# Branch Disposition — 2026-09-20

Codex 接手时只从 `main` 新建分支。以下历史分支不要直接继续开发或整体合并。

| 分支/模式 | 处置 | 原因 |
|---|---|---|
| `main` | **唯一接手基线** | 已包含正式 runtime 修复和最新受控发布基线 |
| `codex/strict-golden-delivery-contract` | 不需要合并 | 与 main 比较：ahead 0 / behind 16；已被主线吸收 |
| `qa/browser-fullflow-20260919-v4` | 不直接合并 | 有用的 `production-fullflow-ui.spec.ts` 已提炼进入 main；旧 workflow 是 branch push 触发 |
| `ops/qa-browser-one-shot-20260920` | **禁止合并** | 含临时 QA auth / deploy 触发，仅用于一次性浏览器实验 |
| `ops/manual-browser-auth-20260920` | **禁止合并** | 临时浏览器 ticket/auth 方案，当前生产已恢复正式 main |
| `ops/browser-e2e-20260920` | **禁止合并** | 一次性短时 session 辅助，不属于产品代码 |
| `ops/qa-fixed-progress-20260920` | 不合并 | 只读临时探针 |
| `ops/replay-* / ops/rework-* / ops/inspect-*` | 不合并 | 一次性生产运维脚本/探针，保留 run 作为审计证据 |
| `deploy/production-once-*` | 不合并 | 只用于给 manual-only deploy workflow 临时增加精确 push trigger |
| `work/p0-* / work/p1-* / work/handoff-*` | 不合并 | 历史实施分支，成果已经进入 main |
| `feat/automation-chief-engineer-skill-v1` | 不直接合并 | 分支已长期落后；其 agents/gates/knowledge/skill 等主要资产当前 main 已存在 |
| `fix/*` 历史分支 | 不合并 | 已合并修复的审计分支；以 main 为准 |

## 规则

1. 不要用“分支还在”推断“改动没合并”；先做 `compare main...branch`。
2. 任何 `ops/*`、`deploy/*` 分支里出现的临时认证、session、一次性 trigger 都不应进入 main。
3. 如果需要历史实现，只提取明确的文件/测试思想，不整体 merge 旧分支。
4. runtime 修复必须从最新 main 新建 `fix/... `，正常 PR、CI、merge、受控 deploy。
5. QA 文档/测试资产也从最新 main 开分支，禁止覆盖生产 runtime。
