# v0.1.0 runtime completion evidence

**状态：** `IMPLEMENTED / PRODUCTION-SMOKE-PASSED / LIMITED-EXTERNAL-VALIDATION`

本文件是对早期“仅文档原型”裁决的运行时增量覆盖。早期文件中的 `PLANNED`、`NOT_IMPLEMENTED` 和 `PRODUCT_RELEASE_BLOCKED` 结论只描述当时的证据，不得覆盖本文件中有命令/接口/线上响应支撑的事实；未在本文件列为通过的项目仍不得宣称完成。

## 五项目标与事实边界

| 目标 | 当前实现 | 证据 | 边界 |
|---|---|---|---|
| STL → BREP/几何特征 | `inspect_stl.py` 支持 ASCII/Binary STL、三角面片、包围盒、顶点/边/面/实体、边界边、OCCT BREP 输出；Worker 固定使用 RPC Sandbox transport | 生产任务 `00445434-afaa-467f-83d7-5fdef87abddf`：`G02_STL_INSPECTION / SUCCEEDED / PASS`，报告 `cadcore-g02-stl-0.1.0` | STL 没有权威工程单位；网格 BREP 不等于可制造的水密实体，`boundaryEdges` 必须单独审查 |
| Office/CAD 安全预览 | Markdown/JSON/CAD 报告 `READY`；冻结交付包生成 DOCX/XLSX 对应的安全 HTML 派生副本，CSP 禁脚本/外链/宏，原始下载独立授权 | `GET /api/tasks/:id/artifacts/:id/preview`；`GET /api/tasks/:id/delivery/preview?file=方案总册.docx|受控产出清单.xlsx`；线上 5015C 返回 `200 text/html` | 未提供通用任意 Office 文件转换器；不执行 Office、宏、脚本或外链 |
| MiniMax vs GPT-SOL 自动评分 | Golden Comparator 对每个 accepted artifact 计算证据、工程专属性、可追溯、诚实性、完整性分项；UI/API 显示 MiniMax 分数和 GPT-SOL 状态 | `POST /api/tasks/:id/quality/compare`；5015C 返回 15 个结果 | 未配置 GPT-SOL secret 时显示 `REFERENCE_BASELINE`，不伪称实时 GPT 评分；接入真实 GPT-SOL 需独立密钥/预算/数据处理批准 |
| 生产浏览器回归 | Playwright 测试覆盖登录、任务切换、checkbox 不触发切换、右侧 Inspector 更新 | `npm run test:e2e` with `ACE_RUN_PROD_E2E=1`：1 passed | 测试账号和浏览器运行时必须通过环境变量注入；不把凭据写入仓库 |
| Stage Harness + 失败任务后台自动重试 | 每阶段最多 3 次候选修复；结构、TBD/TODO/N/A/待定、思考泄漏和 Golden Contract 全通过才可持久化；Workflow catch 对 MiniMax 408/409/429/5xx、invalid response、timeout 等瞬时错误最多自动重试 2 次，质量阻断不自动重试 | `src/harness.ts`、migration `0006_quality_cad_retry.sql`、`0008_retry_run_isolation.sql`、`GET /api/tasks/:id/retries`；`POST /api/tasks/:id/rework`；生产硬关闭的 `MINIMAX_429_ONCE` / `MINIMAX_429_ALWAYS` 隔离演练开关 | 尚未在生产人为制造 429/5xx；需按 `10_FAULT_INJECTION_RUNBOOK.md` 对独立 staging/local D1 + R2 验证恢复、幂等和不重复打包 |

## 关键线上证据

- 当前 Worker 版本：`49aa4612-5bd2-47e8-9f02-58a1043f0136`。
- 线上域名：`https://zg.gaona.world`。
- 5015C：`PACKAGED / PASS / FROZEN`，ZIP SHA-256 `61e9be099b8dfad5953eafe3d16142bf9c5f988498593d546c826e2da181c510`。
- 生产完整重建（任务 `2b98d2bb-52cf-471d-ad6f-9a2c309a06c3`）：旧候选已全部撤回，工作流从 Intake Router 重新开始；MiniMax 连续三次仍输出未解析占位符，系统按设计置为 `QUALITY_BLOCKED / BLOCKED`，没有重新冻结旧 ZIP。
- `npx tsc --noEmit`：PASS。
- `npm test -- --run`：8 files / 23 tests PASS（含 Stage Harness 修复/阻断/格式错误闭环、MiniMax think/Markdown JSON 清洗、占位符显式假设归一化、阶段交付契约、G12 商务契约、fault-injection provider 和上游超时单元验证）。
- 生产 Playwright：1 test PASS，包含 Customer Delivery 冻结状态、下载链接和 ZIP 下载回归。
- `npx wrangler deploy --dry-run`：PASS；生产部署：PASS。
- 远程 D1 migrations `0006_quality_cad_retry.sql`、`0007_fault_injection_drill.sql`、`0008_retry_run_isolation.sql`：PASS。

MiniMax Token Plan 的单次上游等待已调整为 120 秒，避免长阶段（尤其数字孪生/验证）把正常慢响应误判为故障；仍保留 Workflow 级别最多两次自动重试和最终阻断。

## 不得混淆的状态

`REFERENCE_BASELINE` 不是 GPT-SOL 已调用；`READY` 的安全 HTML 不是 Office 引擎执行；`STL BREP PASS` 不是水密实体或单位确认；自动重试已编码，故障注入只能在隔离 local/staging 运行，不能在生产制造失败。任何一项出现这些边界条件时，系统必须继续显示限制，不得把它改写成“已验证”。
