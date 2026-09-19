# Automation Chief Engineer — Handoff

**更新时间：2026-09-19**

本文件是当前仓库的接手基线。后续工作应以本文和 `main` 最新代码为准，不应再按照旧版 P0/P1 清单重复实施。

## 1. 仓库与主线状态

- GitHub：`https://github.com/RuthlessCreature/Automation-Chief-Engineer.git`
- 主分支：`main`
- 当前主线提交：`b8889ffb1d3fc22552dd9965feeee9ed5f8d91aa`
- P0 Golden-121 合并提交：`ed276071d499606caa862db4d63fbb03e20ad54a`
- P1 Recovery / Regression / Operations 合并提交：`8eade85aa95de585cfacd31f9899137ad2ef3789`
- 当前质量策略：`GB-ACE-DELIVERY-V3-GOLDEN-121`
- 默认完整项目交付合同：`R2-F10-GOLDEN-121`

P0、P1 的功能分支均已通过 TypeScript、单元/集成测试、Golden 校验器一致性、CADCore Python 语法检查和 Cloudflare production dry-run 后合并。

## 2. 生产环境边界

已知生产地址：

- 生产 URL：`https://zg.gaona.world`
- Worker：`automation-chief-engineer-cloud`
- D1：`automation-chief-engineer-cloud`
- R2：`automation-chief-engineer-artifacts`
- Durable Object：`TaskCoordinator`、`CadcoreSandbox`
- Workflow：`ace-task-workflow`
- Container：`cadcore/Dockerfile`

**当前生产已完成受控发布。**

2026-09-19 已通过 `.github/workflows/deploy-production.yml` 完成生产发布：

- 当前生产应用代码基线：`main@b8889ffb1d3fc22552dd9965feeee9ed5f8d91aa`
- GitHub Actions production run：`35428890455`
- D1 migration：`0009_workflow_incidents.sql` 已成功应用
- Cloudflare Worker Current Version ID：`4417ed1e-f827-428b-8c5d-768fad75415a`
- custom domain：`zg.gaona.world`
- Workflow：`ace-task-workflow`
- production smoke：首次尝试通过

部署 run 使用的一次性分支提交只增加了临时 push 触发，不改变应用运行时代码；该触发器在发布后已恢复为 manual-only，没有留下可重复自动部署入口。

不要在 Git、D1、R2、日志、截图或前端保存 API key、测试密码、session 或用户文件。密钥只能通过 Wrangler secret 注入。

## 3. 模型配置

生产默认变量在 `wrangler.jsonc`：

```text
APP_ENV=production
MODEL_PROVIDER=minimax
MINIMAX_BASE_URL=https://api.minimax.cn/v1
MINIMAX_MODEL=MiniMax-M3
GPT_SOL_BASE_URL=https://api.openai.com/v1
GPT_SOL_MODEL=gpt-5.6-sol
```

MiniMax：

```powershell
npx wrangler secret put MINIMAX_API_KEY
```

GPT-SOL 实时评分：

```powershell
npx wrangler secret put GPT_SOL_API_KEY
```

没有 `MINIMAX_API_KEY` 时生产任务 fail-closed，不排队、不扣 credits。

没有 `GPT_SOL_API_KEY` 时只能显示 `REFERENCE_BASELINE`。当前代码已删除历史上可合成固定 `92` 分并标记 `LIVE_EVALUATED` 的潜在路径；只有 `evaluateGptSolCandidate` 获得真实上游响应后才可写入 `LIVE_EVALUATED`。

## 4. 固定 15 阶段

阶段定义在 `src/domain.ts`，顺序已由测试锁定：

1. Intake Router / G00
2. Requirement Engineer / G01
3. Feasibility Architect / G03
4. Vision Engineer / G04
5. Mechanical Engineer / G05
6. Electrical Control Engineer / G06
7. Software MES Engineer / G07
8. Product CAD Engineer / G02
9. CT Capacity Engineer / G08
10. BOM Cost Engineer / G09
11. Digital Twin Renderer / G10
12. Validation Engineer / G11
13. Project Sales Engineer / G12
14. Documentation Engineer / G13
15. Chief Reviewer / G14/G15

当前仍为固定顺序执行。不要在前端自行推断或改变依赖顺序。

## 5. P0：Golden-121 交付器 — 已完成

完整项目不再只生成“阶段 Markdown + 简单 Office 壳”。

核心实现：

- `src/golden-delivery.ts`：受控 DOCX/XLSX/PPTX/PDF、PNG、开放项、Manifest 等确定性构建器。
- `src/golden-package.ts`：组装 `R2-F10-GOLDEN-121` 客户包。
- `src/package.ts`：交付冻结入口。
- `src/cadcore.ts`：CADCore 派生、概念 CAD 和最终 Golden ZIP 校验。
- `cadcore/runner/export_delivery.py`：从受控 BREP 派生 STEP/STL/视图。
- `cadcore/runner/build_concept.py`：整机概念 CAD 资产。
- `scripts/validate_r2_f10_golden_delivery.py`：权威 Golden-121 校验器。
- `cadcore/runner/validate_r2_f10_golden_delivery.py`：Container 内镜像副本。
- CI 使用 `cmp` 强制两份校验器字节一致。

G15 冻结前会把最终 ZIP 写入 CADCore Sandbox，并实际执行权威 Python 校验器。以下任一问题都会阻断交付：

- ZIP 不是 121 个文件 / 119 个客户载荷；
- Manifest 路径、大小、SHA-256 不一致；
- DOCX 标题级结构不足；
- PPTX 不是 31 页或缺少固定覆盖项；
- XLSX 不是固定 21 Sheet 或公式数量不足；
- CAD 签名/大小/STEP 头不符合合同；
- PNG、SVG、PDF 签名不符合合同；
- 必需目录或资产缺失。

`PACKAGED/PASS` 因此代表当前确定性交付合同已通过，不再只是“模型说完成”。

### 无客户产品 CAD 的合法交付模式

2026-09-19 的生产 5015 重跑暴露出一个真实 G15 合同缺陷：历史任务没有上传 STEP/STP/STL，但 Golden-121 旧逻辑无条件要求“恰好 1 个产品 CAD”，导致 15 阶段完成后仍被 `DELIVERY_GOLDEN_PRODUCT_CAD_REQUIRED` 阻断。

修复已合入 `b8889ffb1d3fc22552dd9965feeee9ed5f8d91aa` 并发布生产。当前合同区分三种情况：

- 恰好 1 个真实 STEP/STP/STL：继续走 CADCore 派生 BREP/STEP/STL 与产品几何视图；
- 0 个产品 CAD：使用显式 `NO_PRODUCT_CAD_PROVIDED` 证据模式，不生成或伪造产品 BREP/STEP/STL；
- 多于 1 个产品 CAD：仍以 `DELIVERY_GOLDEN_PRODUCT_CAD_AMBIGUOUS` 阻断，禁止静默选取。

无产品 CAD 模式在 `02_产品CAD与视图` 中交付受控声明、机读状态和 6 张范围边界 SVG；Manifest 标记 `Status=NO_PRODUCT_CAD`、`Validation Result=SOURCE_CAD_NOT_PROVIDED`。权威 Python validator 对该模式进行独立验证，同时仍要求 121 个 ZIP 文件 / 119 个客户载荷。


### 仍需正确理解的边界

Golden-121 validator 证明的是**结构、文件真实性、最低工程覆盖和跨资产合同**，不等价于历史 5015 / FCT golden sample 的全部视觉精细度和工程内容丰富度。

当前工程视觉和概念 CAD 是受控生成资产；不要把它表述为已经达到历史样本的摄影级渲染、完整制造图纸或真实现场验证深度。

## 6. CADCore — 已完成并暴露证据

任务输入中的 STEP/STP/STL 会进入自动 G02 CADCore 检查。

主要能力：

- STEP：OCCT 解析、几何事实、有效性、包围盒、规范化 BREP。
- STL：ASCII/Binary 解析、三角面、边界边、mesh-derived BREP。
- 交付：真实源 CAD、规范化 BREP、受控 STEP/STL 派生和标准视图。
- 整机概念 CAD：明确标记 `ASM_NOT_VERIFIED`，不得冒充已制造设备。

前端已新增 `public/cad-status.js`：

- Internal Inspector 显示 CAD 文件；
- 显示 `PENDING_AUTO_G02 / RUNNING / SUCCEEDED / BLOCKED`；
- 显示时间和错误码；
- 成功后可以读取 G02 报告的安全文本/JSON预览；
- 不在浏览器解析或执行客户 CAD。

GET `/api/tasks/:taskId/cad-inspections` 已增加 owner 隔离回归测试。

## 7. P1：回归、安全与恢复 — 已完成

自动化回归已覆盖：

- 任务 owner 隔离；
- 跨用户任务读取拒绝；
- 跨用户 artifacts/events/retries/rework/CAD inspections 拒绝；
- 跨用户客户 ZIP 下载拒绝；
- FROZEN 才允许下载，REJECTED 禁止下载；
- 运行中任务禁止单删和批量删除；
- soft-delete / restore owner 隔离；
- Safe Preview 只允许受控 Golden 资产类型；
- 固定 15 阶段顺序不可变；
- FAILED / QUALITY_BLOCKED / PACKAGED 均提供受控返工入口。

生产浏览器测试 `test/production-browser.spec.ts` 还增加了：

- 新建任务取消无副作用；
- 慢响应下切换任务不会被旧响应覆盖；
- 非 FROZEN 状态不出现客户 ZIP 下载；
- FAILED 状态显示返工入口。

生产浏览器测试需要外部提供测试账号环境变量；CI 默认不会凭空获取生产账号。

## 8. P1：失败监控、人工介入与告警 — 已完成代码

迁移：

- `migrations/0009_workflow_incidents.sql`

核心实现：

- `src/incidents.ts`
- `docs/OPERATIONS.md`
- `public/ops.html`
- `public/ops.js`

Incident 来源：

- `AUTO_RETRY`：自动重试；
- `WORKFLOW_TERMINAL_FAILURE`：最终运行失败；
- `G15_DELIVERY_GATE`：最终交付门禁阻断。

状态：

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`

行为：

- 自动重试会留 WARNING incident；
- 终止失败留 ERROR incident；
- G15 交付问题留受控 incident；
- 用户成功启动 rework 后才 ACK，Workflow 创建失败不会伪造“已接管”；
- 最终 Golden-121 包成功冻结后自动关闭未解决 incident。

运维 API 只允许 `reviewer/admin/system`：

- `GET /api/ops/health`
- `GET /api/ops/incidents`
- `POST /api/ops/incidents/:id/acknowledge`
- `POST /api/ops/incidents/:id/resolve`

普通 `member` 返回 403。

可选告警 webhook：

```powershell
npx wrangler secret put OPS_ALERT_WEBHOOK_URL
```

Webhook 只发送 incident ID、task ID、code、severity、source、timestamp，不发送 Prompt、客户文件、模型输出、密钥或下载 URL。Webhook 失败不会让客户工作流失败，D1 incident ledger 是事实源。

## 9. Safe Preview — 已对齐 Golden-121

客户交付页不再把旧版固定文件名当成真实 Golden 文件。

当前资产标识：

- `asset=technical-solution`
- `asset=engineering-data`

后端仍兼容历史请求参数，但新的前端使用资产类型而不是硬编码旧文件名。

Safe Preview 是安全派生内容，不代表直接暴露 ZIP 内 Office 原文件。

## 9.5 生产发布（2026-09-19）

受控生产发布 workflow 已合入 `main`：

- `.github/workflows/deploy-production.yml`
- 初始 workflow 合并提交：`4f8abdd218936b1bde7eaf83166707ad967580e4`
- D1 命令修复提交：`944a53e1710d59a6ff667bf9d3019bdf09221a5b`

发布过程有三次受控 run：

1. `35425971483`：在 credential preflight 阻断，未触碰 D1 或生产资源；
2. `35428724358`：credentials 与质量门通过，但因 Wrangler 4.133.0 不支持 `d1 migrations apply --yes` 而在 SQL 执行前阻断；
3. `35428890455`：完整成功。

第三次成功 run 的证据：

- credentials preflight：PASS；
- Wrangler types / TypeScript / unit+integration / Golden parity / CADCore Python / production dry-run：PASS；
- remote D1 list：发现 `0009_workflow_incidents.sql` 待应用；
- remote D1 apply：`0009_workflow_incidents.sql ✅`；
- Worker/assets/Workflow/Container deploy：PASS；
- custom domain：`zg.gaona.world`；
- Workflow：`ace-task-workflow`；
- Worker Current Version ID：`64043ed4-e809-4963-a1e0-08c5b2a43b6f`；
- production smoke：attempt 1 PASS。

独立线上读取确认：

- `https://zg.gaona.world/` 返回“总工云台｜受控方案交付”；
- `https://zg.gaona.world/api/me` 未登录时返回 `{"user":null}`；
- `https://zg.gaona.world/ops.html` 可到达 Workflow Operations 页面。

所有一次性 push trigger 均已恢复成 manual-only，没有留下自动发布后门。

随后针对 no-product-CAD 合同修复执行了第四次受控生产发布：

- 应用基线：`b8889ffb1d3fc22552dd9965feeee9ed5f8d91aa`；
- production deploy run：`35432048871`；
- Worker Current Version ID：`4417ed1e-f827-428b-8c5d-768fad75415a`；
- 全部质量门、deploy、production smoke attempt 1：PASS。

同日对新建的历史 5015 生产重跑任务执行完整受控 rework：

- rework verification run：`35432199552`；
- 任务状态：`QUEUED → RUNNING → PACKAGING → PACKAGED`；
- 最终质量：`PASS`；
- 当前质量策略下接受的 stage-report：15/15；
- 产品 CAD 输入：0；
- no-product-CAD evidence：PASS；
- 最终 ZIP：已冻结并下载复验；
- authoritative Golden-121 validator：PASS。

该结果证明“无客户产品 CAD”场景现在可在不伪造 CAD 的前提下完成结构合同交付；仍不代表历史 5015/FCT 样本的视觉和制造工程丰富度已被人工审计为等价。


## 10. 仍然未完成 / 外部条件

### B. 生产 E2E

生产浏览器回归需要：

```powershell
$env:ACE_RUN_PROD_E2E = "1"
$env:ACE_E2E_EMAIL = "..."
$env:ACE_E2E_PASSWORD = "..."
npm run test:e2e
```

账号密码不得写入仓库。

### C. GPT-SOL 实时评分

代码路径已正确，是否启用取决于经批准的 `GPT_SOL_API_KEY` secret。没有 secret 时保持 `REFERENCE_BASELINE`。

### D. 历史 golden sample 丰富度审计

生产 5015 已完成 Golden-121 结构合同重跑、冻结、下载和权威 validator 复验。**尚未完成的是人工工程丰富度对标**，仍应将新包与历史 5015 / FCT 样本逐项审计：

- 视觉利用率与图像质量；
- Word 章节内容深度；
- PPT 评审可用性；
- Excel 工程表真实数据密度；
- CAD/机械接口可制造性；
- DFM/DFMEA、IO、MES、FAT/SAT 等内容的项目专属性。

不要用 validator PASS 替代这项工程审查。

## 11. 生产发布顺序

先确认远程迁移状态：

```powershell
cd E:\GitHub\Automation-Chief-Engineer
npm ci
npx wrangler d1 migrations list automation-chief-engineer-cloud --remote
npx wrangler d1 migrations apply automation-chief-engineer-cloud --remote
```

确认需要的 secrets：

```powershell
npx wrangler secret put MINIMAX_API_KEY
# 可选
npx wrangler secret put GPT_SOL_API_KEY
# 可选
npx wrangler secret put OPS_ALERT_WEBHOOK_URL
```

发布：

```powershell
npx wrangler deploy
```

发布前本地/CI 门：

```powershell
npx wrangler types
npx tsc --noEmit
npm test
python -m py_compile cadcore/runner/*.py
npx wrangler deploy --dry-run
```

在 Linux CI 还会执行：

```bash
cmp scripts/validate_r2_f10_golden_delivery.py cadcore/runner/validate_r2_f10_golden_delivery.py
```

## 12. 部署后的第一轮生产验证

2026-09-19 已使用历史 5015 新建生产重跑任务，并在修复 no-product-CAD G15 合同后执行完整受控返工。结构性生产验收已完成：15 阶段、PACKAGED/PASS、FROZEN ZIP、SHA 校验、no-product-CAD 证据和权威 validator 均通过。

后续真实项目仍按以下顺序验证：

1. 确认 D1 迁移 0009 已应用；
2. 登录生产；
3. 对测试任务执行完整 rework；
4. 验证 15 阶段无越序；
5. 若有 STEP/STL，确认 Internal Inspector 能显示 CADCore G02 状态和报告；
6. 确认最终任务只有在 Golden validator PASS 后进入 `PACKAGED`；
7. 下载新 ZIP；
8. 在本地执行：
   `python scripts/validate_r2_f10_golden_delivery.py <final.zip>`
9. 人工审计工程内容深度，不只看结构 PASS；
10. reviewer/admin 检查 `/ops.html` incident 状态；
11. 若配置 GPT-SOL，确认只有真实请求成功后显示 `LIVE_EVALUATED`。

## 13. 绝对原则

- 不把 `PACKAGED/PASS` 解释成历史 golden sample 视觉与工程丰富度完全等价。
- 不把模型自评、文本长度、UI 绿色状态当工程质量证明。
- 不伪造 STEP、测试 PASS、供应商报价、客户确认、FAT/SAT/MSA。
- 不为让 UI 变绿而放宽 Gate 或 Golden validator。
- 不硬编码本机 CAD 路径进入 Worker。
- 不把客户数据放进 webhook。
- 不把无 secret 的 GPT-SOL 显示为实时评分。
- 先保持证据、可追溯、可回滚，再增加视觉花活。
