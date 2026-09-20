# Automation-Chief-Engineer — HANDOFF

> 更新时间：2026-09-20  
> 下一接手人：Codex / 工程 QA  
> 规则：**只从 `main` 接手。不要从 `ops/*`、`deploy/*`、旧 `qa/*` 或 `work/*` 分支继续开发。**

## 1. 当前真实状态

### 仓库

- Repository: `RuthlessCreature/Automation-Chief-Engineer`
- 生产运行代码基线：`69d05cc39d2f4733db6b8f9fa35557c529bc29d2`
- 该基线 main CI：`35487660777` — **SUCCESS**
- handoff/QA 文档与测试资产会在本次文档 PR 合入 main；因此最终 main HEAD 会比生产运行代码基线更新，但**仅 docs/tests/workflow 脚本更新不代表需要重新部署 runtime**。

### 生产

- URL: `https://zg.gaona.world`
- Worker: `automation-chief-engineer-cloud`
- D1: `automation-chief-engineer-cloud`
- R2: `automation-chief-engineer-artifacts`
- Workflow: `ace-task-workflow`
- Container: `cadcore/Dockerfile`
- 最新受控生产 deploy：`35487734732` — **SUCCESS**
- Worker Version ID: `399f54e2-5a18-4149-8966-21ca374c30b1`
- production smoke: attempt 1 PASS
- latest deploy D1: **No migrations to apply**

## 2. 5015 回归锁定基线

- title: `5015 | Golden-121 PROD rerun | 2026-09-19`
- task id: `43abb382-b774-4104-b38e-caee6cdfda44`
- expected task state: `PACKAGED`
- expected quality: `PASS`
- expected delivery: `FROZEN`
- locked ZIP SHA-256: `bf6fb5f34941e49998a808d5e939bea75c0c0afd5c4db14ddc13c733cf0a0035`
- controlled production rework run: `35432199552`
- authoritative Golden validator: historical PASS

5015 没有客户 STEP/STP/STL。合法交付必须走 `NO_PRODUCT_CAD_PROVIDED` 证据模式，不得生成或伪造客户产品 BREP/STEP/STL。

## 3. 已完成的关键修复

### A. Golden 无产品 CAD

Fix: `b8889ffb1d3fc22552dd9965feeee9ed5f8d91aa`

规则：

- 0 个产品 CAD → `NO_PRODUCT_CAD_PROVIDED`，不生成假 BREP/STEP/STL；
- 1 个真实 CAD → CADCore 派生；
- >1 个产品 CAD → `DELIVERY_GOLDEN_PRODUCT_CAD_AMBIGUOUS` 阻断。

生产复验：`35432199552`，最终 PACKAGED/PASS/FROZEN，15/15，validator PASS。

### B. Customer Delivery 面板闪烁

Fix: `abca49dcdfa698b3e31ef1960de8857027475930`

根因：`app.js` 和 `delivery.js` 同时覆盖右侧 `#inspector-body`。修复后 `delivery.js` 为交付状态单写者。

生产独立复验：`35438239369`：

- production assets fix PASS；
- FROZEN PASS；
- browser-download endpoint PASS；
- 5015 ZIP SHA 与锁定值一致。

### C. 新建/切换任务前端竞态

- `ee8db4b2ec998239155ee26736e80ef1a681dc1d`：新建任务后失效旧 `app-fast` 请求；前端阶段顺序对齐 canonical 15-stage；
- `7e4bd4b2ec998239155ee26736e80ef1a681dc1d`：task+inputs 核心身份先渲染，artifacts/events/delivery 等可选证据独立 hydrate；
- `bf075509c9a33f7e1565b39b998dd60c588ebe97`：创建成功后对 HTMLFormElement 执行 reset，不再对 FormData 调 reset。

这三项已部署，但**Codex 必须用真实浏览器复测**，重点执行 NAV-002 / NAV-004 / TASK-002~004 / UX-002~004。

### D. Provider retry / Quality repair

Fix: `69d05cc39d2f4733db6b8f9fa35557c529bc29d2`

- malformed provider response 的重试不再错误消耗工程 quality repair budget；
- G03/G04 标签索引对齐；
- rejection reason 在生产 UI 可见。

已部署 run `35487734732`，需要 Codex 做受控 fault-injection 回归。

## 4. Codex QA 资产

接手后先读：

1. `docs/CODEX_QA_HANDOFF_20260920.md`
2. `docs/BRANCH_DISPOSITION_20260920.md`
3. `test/production-browser.spec.ts`
4. `test/production-fullflow-ui.spec.ts`
5. `.github/workflows/qa-production-fullflow.yml`

本次另外生成一份 **172 条用例 Excel**：`Automation-Chief-Engineer_QA_Test_Matrix_20260920.xlsx`。该工作簿包含：

- 00_概览
- 01_测试用例
- 02_缺陷清单
- 03_生产基线
- 04_Codex执行顺序
- 05_退出标准
- 06_分支处置

密码、API key、session 不得写入仓库或测试表。

## 5. 浏览器测试

### 5.1 真实登录表单回归

```bash
ACE_RUN_PROD_E2E=1 \
ACE_E2E_EMAIL='test@test.com' \
ACE_E2E_PASSWORD='<secret>' \
npm run test:e2e
```

密码由操作者/Secret 提供，不写入 repo。

### 5.2 生产全流程 QA

手动运行 GitHub Actions workflow：`qa-production-fullflow`

必须输入：

- confirmation: `RUN_PRODUCTION_QA`
- qa_email: `test@test.com`
- prod_url: `https://zg.gaona.world`
- expected_5015_sha: 锁定 SHA

该工作流会真实创建/启动 QA 任务，消耗模型调用和 credits；禁止并发跑两次。

## 6. Codex 固定执行顺序

1. 从最新 `main` 新建 QA/fix 分支。
2. 先跑：
   ```bash
   npm ci
   npx wrangler types
   npx tsc --noEmit
   npm test
   cmp scripts/validate_r2_f10_golden_delivery.py cadcore/runner/validate_r2_f10_golden_delivery.py
   python -m py_compile cadcore/runner/*.py
   npm run deploy:dry
   ```
3. 先做所有“不修改生产”的 P0。
4. 真实浏览器验证 5015 Delivery/Preview/Download/Task switching。
5. 手动触发一次 `qa-production-fullflow`。
6. 补齐安全、CAD、返工、故障注入。
7. 每个 FAIL 必须：复现 → regression test → 最小修复 → CI → PR → merge → 受控 deploy → 原用例复测 → 邻接回归。
8. 最后做 HIST-004~010 人工工程质量审查。

## 7. 退出标准

不允许用“CI绿”或“validator PASS”单独宣布完成。至少满足：

- OPEN P0 = 0；
- OPEN P1 = 0，除非有明确 owner/原因/期限的接受记录；
- latest main CI SUCCESS；
- runtime 有改动时 latest production deploy SUCCESS + smoke PASS；
- 至少一个真实 QA 任务按固定顺序完成 15/15，无重复 STAGE_GATED；
- QA任务 PACKAGED/PASS/FROZEN；
- 浏览器真实下载 ZIP；
- authoritative Golden validator PASS；
- no-CAD 不伪造 BREP/STEP/STL；
- 有 CAD 时必须是 CADCore 派生；
- 跨用户/未登录核心资源拒绝；
- create/switch/Delivery polling 不闪、不回跳；
- main 无临时 auth 后门或一次性 trigger；
- HIST-004~010 人工内容审查完成；
- 测试矩阵实际结果、Bug、Fix SHA、复测结果全部填写。

## 8. 禁止事项

- 不为“变绿”放宽 Gate 或 validator；
- 不伪造 STEP、FAT/SAT/MSA PASS、供应商报价、客户确认；
- 不把模型自评当工程事实；
- 不把 `REFERENCE_BASELINE` 说成 GPT-SOL LIVE；
- 不把临时 QA auth/ticket endpoint 合入 main；
- 不写入密码/API key/session/signed URL；
- 不从历史 `ops/*` / `deploy/*` 分支继续开发。

## 9. 分支规则

详细见 `docs/BRANCH_DISPOSITION_20260920.md`。结论只有一个：

> **main 是唯一接手基线。历史分支保留作审计，不要为了“清分支”而把一次性运维代码合回主线。**
