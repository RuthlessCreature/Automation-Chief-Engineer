# Automation Chief Engineer — ChatGPT 接手文档

更新时间：2026-09-19（Asia/Shanghai）  
当前产品版本：`0.1.0`  
当前代码提交：`229ca66`（已合并并推送到 `main`）

## 1. 你接手的是什么

这是一个部署在 Cloudflare Workers 上的“总工云台”原型。用户可以注册、登录、获得 credits、创建受控任务、上传 STEP/STP/STL 等输入，并观察 15 个固定工程阶段的总工/子 Agent 流程。任务必须经过 Stage Harness、Golden Comparator 和 Chief Review 才能冻结客户 ZIP。

目标不是让 MiniMax 随便生成一篇方案文字，而是把它限制在接近 GPT-SOL golden sample 的工程交付流程中：模型只能提交候选，独立质量门禁决定接受、返工或阻断。

## 2. Git 状态

- GitHub：`https://github.com/RuthlessCreature/Automation-Chief-Engineer.git`
- 主分支：`main`
- 当前提交：`229ca66 docs: add ChatGPT handoff and production runbook`
- 之前的实现提交：`f3b162a feat: deploy controlled delivery worker with strict golden gates`
- 以上提交已经合并并推送到远程 `main`。
- `_audit_docx.py`、`_audit_task_20260919/` 等本地审计临时文件已加入 `.gitignore`，不要提交。

## 3. 线上环境

- 生产 URL：`https://zg.gaona.world`
- Worker 名称：`automation-chief-engineer-cloud`
- 最新已部署版本：`49aa4612-5bd2-47e8-9f02-58a1043f0136`
- `wrangler.jsonc` 已配置 `zg.gaona.world` custom domain。
- Cloudflare 资源：
  - D1：`automation-chief-engineer-cloud`
  - R2：`automation-chief-engineer-artifacts`
  - Durable Object：`TaskCoordinator`、`CadcoreSandbox`
  - Workflow：`ace-task-workflow`
  - Assets：`public/`
  - Container：`cadcore/Dockerfile`

不要在源码、D1、R2、日志或前端保存 API key。密钥只能通过 Wrangler secret 注入。

## 4. MiniMax / GPT-SOL 配置

生产默认配置在 `wrangler.jsonc`：

```text
APP_ENV=production
MODEL_PROVIDER=minimax
MINIMAX_BASE_URL=https://api.minimax.cn/v1
MINIMAX_MODEL=MiniMax-M3
GPT_SOL_BASE_URL=https://api.openai.com/v1
GPT_SOL_MODEL=gpt-5.6-sol
```

设置 MiniMax Token Plan key：

```powershell
npx wrangler secret put MINIMAX_API_KEY
```

可选的 GPT-SOL 独立评分器：

```powershell
npx wrangler secret put GPT_SOL_API_KEY
```

没有 `MINIMAX_API_KEY` 时，生产任务启动会 fail-closed，不排队、不扣 credits。没有 GPT-SOL key 时，UI/API 只能显示 `REFERENCE_BASELINE`，不能声称做过实时 GPT 评分。

## 5. 15 阶段流水线

阶段定义在 `src/domain.ts`，实际执行在 `src/workflow.ts`：

1. Intake Router / G00：输入接收与完整性
2. Requirement Engineer / G01：需求工程
3. Feasibility Architect / G03：可行性架构
4. Vision Engineer / G04：机器视觉
5. Mechanical Engineer / G05：机械方案
6. Electrical Control Engineer / G06：电控与安全
7. Software MES Engineer / G07：软件与 MES
8. Product CAD Engineer / G02：产品 CAD
9. CT Capacity Engineer / G08：节拍与产能
10. BOM Cost Engineer / G09：BOM 与制造成本
11. Digital Twin Renderer / G10：数字孪生渲染
12. Validation Engineer / G11：验证与质量
13. Project Sales Engineer / G12：项目与商务
14. Documentation Engineer / G13：文档受控汇编
15. Chief Reviewer / G14/G15：总工审查与客户交付打包

当前是固定顺序执行，不允许出现 G05 已完成但 G04 仍未完成的越序状态。并行能力未来可以增加，但必须由 Workflow/Harness 维护依赖和 Gate，不要在前端自行推断顺序。

## 6. 质量管控核心

核心文件：

- `src/provider.ts`：MiniMax OpenAI-compatible adapter、JSON/Markdown 清洗、占位符归一化、120 秒上游超时。
- `src/quality.ts`：`GB-ACE-DELIVERY-V2-STAGE-CONTRACT`、占位符/思考泄漏检测、阶段契约。
- `src/harness.ts`：每阶段最多 3 次候选修复，失败后 `QUALITY_BLOCKED`。
- `src/golden.ts`：证据、工程专属性、可追溯、诚实性、完整性评分。
- `src/workflow.ts`：Workflow、自动 CADCore、阶段 checkpoint、自动重试。
- `src/package.ts`：客户 ZIP 冻结、manifest、DOCX/XLSX、CAD 源文件和 BREP。

当前候选只有同时满足以下条件才可写入 `ACCEPTED`：

- 只能是合法候选结构，不得让 `<think>`、Markdown JSON 外壳或原始调试文本进入产出。
- `evidence` 必须能追溯到输入或受控规则。
- 不得出现 `TBD/TODO/N/A/待定`；未知内容只能表达为显式“待验证假设（需客户确认）”。
- body 至少达到最小信息量，并满足对应阶段的工程字段契约。
- 当前质量策略版本必须写入 provenance。

质量阻断不是系统异常：这是预期的业务结果，表示不能交付。不要为了让 UI 变绿而放宽门禁或制造数据。

## 7. CADCore

`src/cadcore.ts` 在 Workflow 开始时自动处理任务输入中的 STEP/STP/STL：

- `inspect_step.py`：STEP 文件检查、几何事实和 BREP 输出。
- `inspect_stl.py`：ASCII/Binary STL、三角面片、包围盒、边界边、规范化 BREP。
- 运行在 Cloudflare Sandbox Container，不依赖本机 `E:\方案\\.cad-tools` 或 `_cy_cad_packages`。
- ZIP 冻结前必须存在成功的 `cad_jobs`、检查报告和 normalized BREP。

云端 CADCore 镜像由 `cadcore/Dockerfile` 构建；本地 CAD 库不能直接当作 Worker runtime 依赖。

## 8. 当前生产任务证据

测试任务：`5015`  
任务 ID：`2b98d2bb-52cf-471d-ad6f-9a2c309a06c3`

截至本文件生成时：

- 状态：`PACKAGED`
- quality：`PASS`
- credits：未扣除
- delivery：`FROZEN`
- stage artifacts：15
- 最新 ZIP SHA-256：`e642650adae7d6f02dafb96bda9ee75bd7cf09041ed3ac1890ef0628a86ac43c`
- 下载接口：`/api/tasks/2b98d2bb-52cf-471d-ad6f-9a2c309a06c3/delivery/download`

注意：`PACKAGED/PASS` 只证明当前系统质量契约通过，不等于已经达到两个 golden sample 的工程资产丰富度。当前包装器能生成通过门禁的阶段 Markdown、基础 DOCX/XLSX、安全 HTML 预览、源 CAD、G02 报告和 BREP；它还不是 golden sample 那种完整的 100+ 文件、图纸、渲染图、多 Sheet 工程表和正式 PDF/PPTX 方案包。

## 9. 已完成范围

- 注册、登录、PBKDF2 密码哈希、HttpOnly session、credits 展示。
- 创建任务、文件上传、任务切换、任务删除/多选删除/改名。
- 左侧任务选择与右侧 Inspector 刷新逻辑。
- 15 阶段流水线、事件流、内部工作区、安全预览、客户交付页。
- Stage Harness、Golden Comparator、MiniMax thinking/Markdown JSON 清洗。
- MiniMax Token Plan adapter，缺 key 时 fail-closed。
- Workflow 自动重试瞬时上游错误最多 2 次。
- `QUALITY_BLOCKED`、`FAILED`、`PACKAGED` 任务均可手动完整返工。
- 返工会撤回旧候选，按当前策略从头重建，不复用旧 checkpoint。
- STEP/STP/STL 自动 CADCore 检查及 BREP 交付关联。
- 客户 ZIP 下载入口的冻结/拒绝逻辑。
- Cloudflare Worker 已绑定 `zg.gaona.world`。

## 10. 仍然未完成 / 下一阶段优先级

按优先级继续，不要先做 UI 花活：

### P0：golden sample 资产生成器

当前 ZIP 仍偏“受控文字候选集合”，与 `E:\方案\5015风扇自动检验与性能测试单元方案包_正式交付`、`E:\GAONA\20260910\PurgePump\_PCBA\_FCT完整方案包\_R02` 的差距主要在真实工程资产：

- 正式 DOCX：封面、目录、章节、表格、图表、版本页、签核页、图片引用。
- 正式 XLSX：BOM、IO、节拍、成本、风险、FAT/SAT、验证矩阵、设备清单等多个 Sheet。
- PDF/PPTX 正式交付版。
- CAD 视图、渲染图、STEP/STL/BREP 资产索引。
- DFM/DFMEA、相机光源计算、机械接口、PLC IO 表、MES 追溯表、验收矩阵。
- 内部过程包与客户交付包的清晰目录层级。

建议把每个 stage 的 `artifact builder` 做成受控模板：模型只能填字段，不能决定文件结构；缺字段就阻断。

### P1：完整浏览器回归

当前生产 Playwright 已覆盖登录、任务切换、checkbox、Inspector 和下载基础路径。还需要补：

- 新建任务取消、重复点击、网络慢响应。
- 上传 STEP/STL 后 CADCore 进度和报告预览。
- 15 阶段顺序不可越序。
- QUALITY_BLOCKED、FAILED、返工、下载禁用/恢复。
- 多用户隔离和跨任务下载拒绝。

### P1：GPT-SOL 实时评分

需要配置经批准的 `GPT_SOL_API_KEY`，在独立预算/数据处理边界内启用实时评分，不能把固定 `92` 或 `REFERENCE_BASELINE` 当成真实评分。

### P1：失败任务监控与告警

已有 D1 retry audit 和事件流；还需要后台 dashboard、告警、dead-letter/人工介入记录，以及 Workflow 超时后的明确恢复 UI。

## 11. 本地检查和部署命令

```powershell
cd E:\GitHub\Automation-Chief-Engineer
npm install
npx tsc --noEmit
npm test -- --run
npx wrangler deploy --dry-run
npx wrangler deploy
```

本地开发使用 fixture provider：

```powershell
npm run dev
```

生产浏览器回归需要通过环境变量提供测试账号，不要把账号密码写入仓库：

```powershell
$env:ACE_RUN_PROD_E2E = "1"
$env:ACE_E2E_EMAIL = "..."
$env:ACE_E2E_PASSWORD = "..."
npm run test:e2e
```

远端迁移命令要先确认当前迁移状态，再执行，不要重复破坏性操作：

```powershell
npx wrangler d1 migrations list automation-chief-engineer-cloud --remote
npx wrangler d1 migrations apply automation-chief-engineer-cloud --remote
```

## 12. 接手时第一轮动作

1. `git checkout main && git pull --ff-only`，确认本 HANDOFF 已经在主分支。
2. 查看 `wrangler.jsonc`、`src/domain.ts`、`src/workflow.ts`、`src/package.ts`。
3. 运行 `npx tsc --noEmit` 和 `npm test -- --run`。
4. 用真实下载 ZIP 做结构审计：文件数量、DOCX 表格/图片、XLSX Sheet/非空单元格、CAD/BREP、PDF/PPTX。
5. 先实现 P0 的受控资产模板和产物契约，再扩大模型自由度。
6. 任何“模型说完成了但没有可验证文件”的情况，都必须进入 `QUALITY_BLOCKED`，不能继续冻结客户交付。

## 13. 重要原则

- 不要把当前 `PACKAGED/PASS` 误解成 golden sample parity。
- 不要把 MiniMax 自评、模型文本长度或 UI 绿色状态当成工程质量证明。
- 不要把本机 CAD 库路径硬编码进 Worker。
- 不要在 Git、日志、截图或聊天里提交 API key、测试密码、session 或用户文件。
- 先保证证据链和可追溯，再追求 UI 动画和视觉效果。
