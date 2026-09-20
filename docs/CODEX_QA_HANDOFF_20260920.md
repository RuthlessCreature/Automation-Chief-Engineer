# Codex QA Handoff — 2026-09-20

## 0. 接手结论

从 `main` 接手，不要从任何 `deploy/*`、`ops/*`、旧 `qa/*` 或 `work/*` 分支继续开发。

当前生产运行代码基线：

- runtime commit: `69d05cc39d2f4733db6b8f9fa35557c529bc29d2`
- latest main CI: `35487660777` — SUCCESS
- latest production deploy: `35487734732` — SUCCESS
- Cloudflare Worker Version ID: `399f54e2-5a18-4149-8966-21ca374c30b1`
- production URL: `https://zg.gaona.world`
- D1: `automation-chief-engineer-cloud`
- R2: `automation-chief-engineer-artifacts`
- Workflow: `ace-task-workflow`
- D1 migrations: latest deploy reported **No migrations to apply**
- open PRs at handoff preparation: **0**

当前生产已经恢复为正式 main runtime。此前为了浏览器 QA 尝试过的临时 ticket / QA auth 方案没有进入 main；main 代码搜索 `manual-browser-ticket`、`qa-browser`、`MANUAL_BROWSER_TEST_SESSION` 均为 0。不要把相关 ops 分支合回 main。

## 1. 5015 回归锁定基线

生产历史回归任务：

- title: `5015 | Golden-121 PROD rerun | 2026-09-19`
- task id: `43abb382-b774-4104-b38e-caee6cdfda44`
- expected task state: `PACKAGED`
- expected quality: `PASS`
- expected delivery: `FROZEN`
- locked ZIP SHA-256: `bf6fb5f34941e49998a808d5e939bea75c0c0afd5c4db14ddc13c733cf0a0035`
- authoritative Golden-121 validator: historical PASS
- historical controlled rework run: `35432199552`

该任务没有客户 STEP/STP/STL。其合法交付必须使用 `NO_PRODUCT_CAD_PROVIDED` 证据模式；不得生成或伪造客户产品 BREP/STEP/STL。

## 2. 已修复缺陷，Codex 必须复测

| Bug | 状态 | Fix | 生产证据 | Codex重点用例 |
|---|---|---|---|---|
| G15 无 CAD 误阻断 | FIXED + production retest PASS | `b8889ff` | deploy `35432048871`; rework `35432199552` | UP-014 / CAD-005 / DEL-017 / RW-008 |
| Customer Delivery 闪烁、下载按钮不稳定 | FIXED + production retest PASS | `abca49d` | deploy `35438115779`; verify `35438239369` | DEL-002/003 / UX-001 |
| 新建任务后旧请求覆盖新任务 | FIXED，需 Codex 浏览器复测 | `ee8db4a` | deploy `35443690612` | NAV-002 / TASK-004 / UX-003 |
| optional evidence 失败导致切任务仍显示旧任务 | FIXED，需 Codex 浏览器复测 | `7e4bd4b` | deploy `35444273499` | NAV-004 / UX-004 |
| 新建任务后 FormData.reset 错误 | FIXED，需 Codex 浏览器复测 | `bf07550` | deploy `35444840282` | TASK-002/003 / UX-002 |
| Provider malformed retry 错误占用 quality repair budget；G03/G04原因标签错位 | FIXED，需 Codex复测 | `69d05cc` | deploy `35487734732` | PIPE-019/020 / OPS-008 |

## 3. QA 资产

主分支应包含：

- `test/production-browser.spec.ts`：较轻量生产浏览器回归，需要真实账号密码环境变量；
- `test/production-fullflow-ui.spec.ts`：受控生产全流程验收，使用短时 D1 session + Chromium UI，不读取账号密码；
- `.github/workflows/qa-production-fullflow.yml`：**仅 workflow_dispatch**，必须输入 `RUN_PRODUCTION_QA`；
- `docs/QA_TEST_MATRIX_20260920.md`：172 条详细用例，可代码搜索；
- `docs/QA_TEST_MATRIX_20260920.xlsx`：同一矩阵的执行工作簿；
- `docs/CODEX_QA_HANDOFF_20260920.md`：本文；
- `docs/BRANCH_DISPOSITION_20260920.md`：历史分支处置规则。

测试账号邮箱可以记录为 `test@test.com`。**密码不得写入仓库、Excel、Actions 日志、截图或代码。** 如果要测真实登录表单，使用 `ACE_E2E_EMAIL` / `ACE_E2E_PASSWORD` 环境变量或 GitHub Secret。

## 4. 两套浏览器测试如何使用

### 4.1 真实密码登录回归

```bash
ACE_RUN_PROD_E2E=1 \
ACE_E2E_EMAIL='test@test.com' \
ACE_E2E_PASSWORD='<secret>' \
npm run test:e2e
```

用途：专门覆盖真实登录表单、已有任务选择、Delivery、取消新建、慢响应任务切换等。

### 4.2 全流程生产 QA

推荐从 GitHub Actions 手动运行 `qa-production-fullflow`：

- confirmation: `RUN_PRODUCTION_QA`
- qa_email: `test@test.com`
- prod_url: `https://zg.gaona.world`
- expected_5015_sha: 保持锁定值，除非有明确批准更新基准

该 workflow 会真实修改生产：

- 建立一个短时 D1 session，结束时删除；
- 通过浏览器 UI 创建一个真实 QA 任务；
- 上传一个 TXT fixture；
- 启动一次真实 15 阶段 Workflow；
- 等待真实终态；
- 下载 ZIP 并运行权威 validator；
- 建一个临时 DRAFT 做改名/软删除验证；
- 验证运行中任务删除阻断；
- 验证未登录下载被拒绝；
- 最后退出登录。

不要并行运行两次 production full-flow QA。它会消耗真实模型调用和测试账号 credits。

## 5. Codex 执行顺序

1. 从最新 `main` 创建 QA 分支。
2. `npm ci`。
3. 先跑：
   ```bash
   npx wrangler types
   npx tsc --noEmit
   npm test
   cmp scripts/validate_r2_f10_golden_delivery.py cadcore/runner/validate_r2_f10_golden_delivery.py
   python -m py_compile cadcore/runner/*.py
   npm run deploy:dry
   ```
4. 执行矩阵中“不修改生产”的所有 P0。
5. 手动触发一次 `qa-production-fullflow`。
6. 按矩阵补齐负向、权限、返工、CAD、异常恢复用例。
7. 对每个 FAIL：
   - 保留复现证据；
   - 先写/补 regression test；
   - 最小修复；
   - 本地/CI全绿；
   - PR merge；
   - 如果改 runtime，走受控 production deploy；
   - **复跑原失败用例 + 邻接回归**；
   - 在 Excel 填 Bug ID、Fix SHA、复测结果。
8. 最后执行 HIST-004 ~ HIST-010 的人工工程质量审查。

## 6. 退出标准

不得以“CI绿”或“validator PASS”单独宣布完成。最低退出条件：

- OPEN P0 = 0；
- OPEN P1 = 0；若业务明确接受，必须写 owner / 原因 / 到期时间；
- latest main CI = SUCCESS；
- 若有 runtime 改动，latest production deploy = SUCCESS 且 smoke PASS；
- 至少一个真实 QA 任务 15/15、顺序正确、无重复 STAGE_GATED；
- QA任务 `PACKAGED / PASS / FROZEN`；
- 浏览器真实下载 ZIP；
- authoritative Golden-121 validator PASS；
- 0 CAD 场景无伪造 BREP/STEP/STL；
- 有真实 CAD 的场景由 CADCore 派生；
- 跨用户/未登录核心资源全部拒绝；
- task create/switch/Delivery polling 不闪烁、不回跳；
- main 无临时认证后门/一次性 trigger；
- HIST-004~010 人工审查完成，不能用结构 validator 替代；
- Excel 的实际结果、Bug、Fix SHA、复测结果填写完成；
- HANDOFF 更新到最终生产版本。

## 7. 绝对不能做的事

- 不要为了变绿放宽 Gate 或 Golden validator。
- 不要伪造 STEP、FAT/SAT/MSA PASS、供应商报价、客户确认。
- 不要把模型自评当工程事实。
- 不要把 `REFERENCE_BASELINE` 表述成 GPT-SOL 实时评分。
- 不要把临时 QA auth / ticket 端点合入 main。
- 不要把 API key、密码、session、signed URL 写进 repo 或测试报告。
- 不要从历史 deploy/ops 分支继续开发。
