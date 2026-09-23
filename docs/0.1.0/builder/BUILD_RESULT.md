# Builder 构建结果 — v0.1.0

## 结论

**状态：DOCUMENTARY_VISUAL_DELIVERABLE_VERIFIED；生产构建：NOT_APPLICABLE / NOT_IMPLEMENTED。**

本轮受限于已批准范围：交付规格文档与静态产品视觉稿，而不是代码、Worker 或部署。本 Builder 未运行也不能声称运行了前端构建、Worker bundle、数据库迁移、部署、自动化测试、浏览器 E2E、真实 Agent/模型调用、Office 转换或 ZIP 打包。

已执行的最小验证仅确认三张既有视觉资产是非空、带正确 PNG 文件签名、可由 .NET 图像解码器打开且具有预期像素尺寸的 PNG 文件。

## 输入和产物边界

| 类别 | 状态 | 证据/说明 |
|---|---|---|
| 规格输入 | READ | `00_SPEC.md`、`01_CHANGELOG.md`、`02_FEATURE_LIST.md`、`03_WORKFLOW.md` 已作为 Builder 输入审阅。 |
| 静态视觉资产 | VERIFIED (file-level only) | 三张 `docs/0.1.0/visuals/*.png` 均能以图像解码器打开；详情见下表。 |
| Builder 交接文档 | CREATED | `DEV_NOTES.md`、本文件及 `VISUAL_ACCEPTANCE_NOTES.md`。 |
| 生产代码/UI | NOT_IMPLEMENTED | 本轮未新增或改变应用源码。 |
| Worker/Cloudflare/域名 | NOT_IMPLEMENTED | 未创建、部署或绑定资源；`zg.gaona.world` 仍未验证/绑定。 |
| 开发测试、QA 测试和发布裁决 | NOT RUN | 本轮没有代码可构建；这些工作属于后续独立角色，不能标记 PASS。 |

## 静态视觉资产文件验证

验证命令（PowerShell）：

```powershell
$imgs = Get-ChildItem 'docs/0.1.0/visuals' -Filter '*.png' -File
foreach ($img in $imgs) {
  $bytes = [System.IO.File]::ReadAllBytes($img.FullName)
  $sig = ($bytes[0..7] | ForEach-Object { $_.ToString('X2') }) -join ' '
  Add-Type -AssemblyName System.Drawing
  $bitmap = [System.Drawing.Image]::FromFile($img.FullName)
  "FILE=$($img.Name); BYTES=$($img.Length); PNG_SIGNATURE=$sig; DIMENSIONS=$($bitmap.Width)x$($bitmap.Height); FORMAT=$($bitmap.RawFormat); CAN_OPEN=True"
  $bitmap.Dispose()
}
```

实际结果：

| File | Bytes | PNG signature | Dimensions | Decoded format | Can open | Result |
|---|---:|---|---|---|---:|---|
| `01-task-command-center.png` | 1,409,014 | `89 50 4E 47 0D 0A 1A 0A` | 1672×941 | PNG | True | PASS — file-level only |
| `02-new-task-studio.png` | 1,269,086 | `89 50 4E 47 0D 0A 1A 0A` | 1672×941 | PNG | True | PASS — file-level only |
| `03-artifact-preview-delivery.png` | 1,599,672 | `89 50 4E 47 0D 0A 1A 0A` | 1672×941 | PNG | True | PASS — file-level only |

这里的 `PASS` 仅说明单个文件通过上述**二进制/解码检查**，不表示视觉需求、可访问性、交互、权限、质量门、产品验收或发布通过。

## 已审阅的画面内容

| Asset | Visible intended behavior | Source of truth |
|---|---|---|
| 命令中心 | Orchestrator 与专业 Agent 流水线、状态/进度、当前步骤、产物、质量/证据、事件日志和暂停/交付入口 | PNG 仅表达目标视觉；真实状态必须来自持久事件与 `event_seq`（FR-PROG-001、AC-008/009）。 |
| 新建任务 | 资料上传、目标说明、专业 Agent 配置、预检、MiniMax/credits 预估和“开始生成方案”入口 | PNG 仅表达目标视觉；服务端验证、扫描、幂等和零扣费必须由 FR-TASK-001–003、FR-CR-002 实现。 |
| 产物预览与交付 | 分阶段树、文档/渲染/表格/步骤证据、质量清单、返工轨迹、交付清单与 ZIP 下载入口 | PNG 仅表达目标视觉；预览和下载必须在授权、派生产物、Chief Review、manifest/hash Gate 后实现。 |

## 未运行项（不可视为通过）

- `npm`/`pnpm`/`wrangler` build、lint、typecheck、unit test：**NOT RUN**（当前 Builder 未实现应用代码）。
- API、D1、R2、Queue、Durable Object、SSE/WebSocket、身份/RBAC/tenant 隔离：**NOT IMPLEMENTED / NOT RUN**。
- MiniMax/GPT 质量护栏、独立 Gate、返工/阻塞、Office 安全转换、打包和签名下载：**NOT IMPLEMENTED / NOT RUN**。
- Cloudflare 部署、DNS/SSL、`zg.gaona.world` 绑定、生产健康检查和回滚：**NOT IMPLEMENTED / NOT RUN**。
- QA、回归测试和 Release Decision：**由独立 QA/Release 角色后续负责，当前无结论**。

## 下一步

将 `VISUAL_ACCEPTANCE_NOTES.md` 中标为 P1/P2 的视觉语义落实为状态模型、API 响应契约和可测试 UI，再开始真实前后端实现。之后必须由独立 Dev Self-Check、QA Planner、QA Executor、Fixer、QA Retest 和 Release Judge 依质量迭代流程补齐证据链。

---

## Implementation build update — 2026-09-17

**Status: BUILDABLE_LOCAL_VERTICAL_SLICE / NOT_RELEASED.**

The initial implementation supersedes the historical “NOT_IMPLEMENTED” status for this Worker vertical slice. The result is not a production-release certification.

| Check | Command | Result |
|---|---|---|
| Generated Worker types | `npx wrangler types` | PASS — generated bindings for D1, R2, Assets, TaskCoordinator and TaskWorkflow. |
| Static types | `npx tsc --noEmit` | PASS. |
| Unit/runtime tests | `npm test` | PASS — 3 files, 6 tests; each suite uses an isolated Workers-runtime D1 database with the real migrations applied. |
| Config/bundle validation | `npx wrangler deploy --dry-run` | PASS — assets and all declared bindings resolved; no deployment performed. |
| Local schema | `npx wrangler d1 migrations apply ace-control-plane --local` | PASS — migrations 0001 and 0002 applied. |
| Local HTTP smoke | authenticated register/create/start/read task | PASS — 15 artifacts, 48 task events, final safe state `PACKAGING`. |

### Outstanding non-pass items

- MiniMax M3 has **not** been invoked with a real production account. The OpenAI-compatible adapter uses the China-region Token Plan endpoint `https://api.minimax.cn/v1`, `MiniMax-M3` and an injected `MINIMAX_API_KEY`; it fails closed while that secret is absent and has mock contract tests, but live entitlement, token consumption and golden-sample quality remain unverified.
- Bounded, allow-listed private input upload is implemented for `DRAFT` tasks only. Malware scan, Office/CAD conversion, preview derivation, real-time WebSocket/SSE, final manifest freezing, ZIP generation, signed delivery download, team RBAC and domain deployment are **not implemented** and remain out of release scope.
- Cloudflare production resources are now deployed: Worker `automation-chief-engineer-cloud`, D1/R2/DO/Workflow bindings and remote migrations `0001`–`0003` are present. `https://zg.gaona.world` is bound as a Cloudflare custom domain and returned HTTPS `200` during smoke testing. This is infrastructure evidence, **not** a release approval.
- Remote API smoke passed for registration (`201`), login (`200`) and draft creation (`201`). A start request correctly returns `503 MINIMAX_PROVIDER_NOT_CONFIGURED`, leaving the task unqueued and credits unchanged.
- The committed default configuration is intentionally **not local**. A direct deployment uses `APP_ENV="development"`, secure session cookies and the fail-closed unconfigured MiniMax adapter; `npm run dev` is the only scripted path that enables the local fixture provider.

## 5015 generic CAD-unit gate — 2026-09-23

- Updated V6 Harness policy to block candidate title/body dimensions when a CAD input's units are not authoritatively confirmed. Recognized notation includes common metric/imperial lengths, micrometre/nanometre spellings, thread and pitch callouts, diameter/radius symbols, and three-axis dimension chains.
- CAD unit uncertainty is fail-closed for recognized CAD inputs if the CAD job is absent/not successful, its R2 report is missing/unreadable, or the report omits unit status. One confirmed input cannot clear another input's uncertainty.
- `npm test`: PASS — 11 files / 58 tests.
- `npx tsc --noEmit`: PASS.
- `npm run types` (`wrangler types --check`): PASS.
- `npx wrangler deploy --dry-run`: PASS; no production deployment yet at time of this build result.
- Independent QA has verified unit/harness focused behavior and preserved the V5 production defect evidence. CAD report failure-path integration/fault injection, V6 production deployment/rework, ZIP inspection, and Golden Sample semantic comparison remain NOT RUN; no product-quality PASS is claimed.

### V6 production result and V7 local iteration — 2026-09-23

- V6 deployed to `zg.gaona.world` as Worker version `461cb8bb-8376-4884-9393-f921a7243d6d` only after confirming no Workflow instance was running.
- The original 5015 rework ended `QUALITY_BLOCKED` with `retry_count=2`; V6-accepted checkpoints reached G00, G01, G03, G04, G05, G06 and G07. It stopped during G02 retries after repeated CAD-unit/physical-dimension violations. No customer ZIP was approved.
- The production artifact review found V6 gaps: G01 included unreferenced industry/default percentages and OEE, and asserted a STEP-mm assumption despite `UNCONFIRMED`; G04 used values labelled as generic raw coordinate units. These are regression findings, not accepted engineering facts.
- V7 local changes add a traceable-source check for numerical industry/default metrics, reject CAD-unit assumptions when the CAD report is unconfirmed, and block raw coordinate-unit dimensions. Planned cases `UNIT-009`, `UNIT-010` and `METRIC-001` remain unexecuted.
- On the V7 local checkout: `npm test` PASS — 58/58; `npx tsc --noEmit` PASS; `npm run types` PASS; `npx wrangler deploy --dry-run` PASS. These results do not mean V7 is deployed or its checks pass in production.
- V7 production deploy/rework, failure-path integration/fault injection, end-to-end propagation, ZIP review, and semantic Golden Sample comparison remain NOT RUN. No artifact-quality or release PASS is claimed.

### V7 source-content fail-closed revision — 2026-09-23

- Independent review found that an inline `INPUT-task-prompt` token could be mistaken for proof that the cited source supports a default/industry metric. The validator does not retrieve or semantically compare source contents, so V7 now blocks quantified industry/default metrics even when a candidate attaches an input citation. This is intentionally conservative until claim-to-source verification exists.
- Current local verification after that revision: `npm test` PASS — 11 files / 58 tests; `npx tsc --noEmit` PASS; `npm run types` PASS; `npx wrangler deploy --dry-run` PASS; `git diff --check` PASS.
- Independent focused QA: quality + harness 17/17 PASS, Wrangler types PASS, TypeScript PASS. Dependency sourcemap warnings for `@cloudflare/containers` remain non-fatal.
- Same 5015 task is confirmed terminal at `QUALITY_BLOCKED` (`retry_count=2`; last update `2026-09-23T10:38:46.109Z`) before this revision. Production V7 deployment/rework, G01/G04 acceptance behavior, package review, and Golden Sample semantic comparison are still NOT RUN at this point. No ZIP or quality PASS is claimed.

### V7 production probe and completion-claim false positive — 2026-09-23

- Deployed V7 as Worker version `84932442-923b-4103-b974-5abcbf96a9be`; reworked the same 5015 task (no new task, no credits charged). It accepted G00/G01, then became `QUALITY_BLOCKED` in G03 after candidate retries. No ZIP was generated.
- Read-only D1/R2 inspection confirmed one G03 candidate was correctly rejected for the same uncited industry/default metric and unconfirmed CAD-unit claims. Another was rejected because the generic completion detector treated “本阶段已完成：系统架构描述……” as an unsupported completed test. That is a false positive: a stage artifact completion is not a FAT/SAT/measurement claim.
- Latest local fix narrows the completed-test detector to completed validation/test/acceptance terminology, while permitting a stage deliverables statement. Regression cases cover both. Current verification: `npm test` 58/58 PASS; `npx tsc --noEmit` PASS; `npm run types` PASS; `git diff --check` PASS.
- This fix is not yet deployed. V7 production remains blocked; no G03 onward pass, no G04 retest, no delivery ZIP, and no Golden Sample quality pass are claimed.

### V7 corrected detector production rerun and CAD-dossier hardening — 2026-09-23

- Corrected V7 deployed as Worker version `37fa6764-ebc0-4d56-b91c-489f34e2af3e`. The same-task rework accepted G00 and G01, but remained `QUALITY_BLOCKED` at G03 after five rejected candidates. Each G03 candidate still included physical-looking bbox-derived lengths (e.g. approximately 53 and 15) while disclaiming unconfirmed units; the unit gate correctly rejected them. The candidate did not repeat the previous stage-completion false positive.
- Local follow-up withholds numeric CAD bbox coordinates from the model dossier whenever `unitStatus` is not `CONFIRMED`, tells the model to use qualitative geometry only in that case, and supplies more specific repair feedback to remove even caveated CAD-derived physical lengths. Confirmed-unit bbox values remain available. A unit test covers both branches.
- Latest local checks: `npm test` PASS — 12 files / 59 tests; `npx tsc --noEmit` PASS; `npm run types` PASS; `npx wrangler deploy --dry-run` PASS; `git diff --check` PASS. This change is not yet deployed or production-retested.
- Final G01 rejected body showed a second unit-regex false positive: risk IDs `R1-...` through `R4-...` were interpreted as radius callouts. Local regex now excludes `R<number>-`/colon-delimited risk identifiers while preserving `R5` radius detection. Regression and focused checks pass; production rework has not yet verified this correction.
- Production verification on Worker `75d20089-3118-4f50-9257-da960469169e`: the same task accepted G00 and G01, and the `R1`–`R4` false positive did not recur. It blocked at G03: one candidate still invented CAD-derived lengths despite bbox withholding; another used unsupported evidence shorthand; final attempt leaked a complete `<think>` reasoning block into text fallback. No G04+ artifacts or ZIP.
- Latest local changes preserve the strict unit/evidence gates, strip `<think>/<analysis>` blocks before structured prose fallback, and retain the risk-ID distinction. New MiniMax fallback test plus quality/harness/input dossier tests: 25/25 PASS; tsc, Wrangler types, `git diff --check` PASS. Provider fix is not yet deployed.
- Follow-up on deployed `35ab8e60-4f02-4562-b46f-344eabfea761`: the same-task run entered the bounded workflow retry after a runtime error, then G01 blocked. One candidate had an unsupported performance claim; two were rejected for transport/debug content. Final package remains absent. Local provider change now also strips embedded `<think>/<analysis>` blocks from JSON field values before the quality gate, preserving only trailing final text; a focused regression verifies both removal and preservation.
- Latest focused checks after field-level sanitization: 26/26 quality, harness, input-dossier and MiniMax-provider tests PASS; `npx tsc --noEmit`, `npm run types`, and `git diff --check` PASS. Full-suite/dry-run/production verification and deployment of this latest field-level change remain pending.

### V7 withheld-bbox production probe — 2026-09-23

- Worker `fe3dd2d0-d08c-46eb-b719-5a266470cf7a` was pushed to GitHub `main` at `01351ed` and production deployed. A same-task rework accepted G00 after one correction, then blocked in G01 after three rejected candidates.
- Inspection of the final G01 candidate found an actual false positive: it said “所有指标……不构成已完成的测试结论”, which the completed-test regex incorrectly matched. The same candidate invented 3-second cycle time, 99.5% detection, 0.3 mm defect threshold, 600±50 mm station height, and other unprovided engineering figures; those must remain blocked absent source support.
- Local correction expands negation recognition (`不构成/不代表/不属于/不视为/并非`) and tests this exact disclaimed-claim shape; the positive fabricated FAT assertion still blocks. Focused quality+harness+input dossier tests 18/18 pass; tsc, Wrangler types and diff check pass. This negation change is not yet deployed.
# Runtime build addendum — 2026-09-18

The Worker now builds and deploys the STL CADCore runner, safe preview routes, Golden Comparator, Stage Harness, retry audit schema, fault-injection drill guard, MiniMax think/Markdown JSON normalization, Customer Delivery download panel, and Playwright regression harness. Deployment evidence: Worker version `49aa4612-5bd2-47e8-9f02-58a1043f0136`; remote D1 migrations `0006_quality_cad_retry.sql`, `0007_fault_injection_drill.sql`, and `0008_retry_run_isolation.sql` applied. This deployment also adds the stage-specific delivery-contract policy, full-rebuild rework isolation, explicit-assumption placeholder normalization, a 120-second bounded MiniMax wait, failed-task manual rework, automatic CADCore preparation at workflow start, and fail-closed ZIP assembly. The original static-only result below remains historical.

### V8 generic unresolved-choice / CAD-unit prompt hardening — 2026-09-24

- A live 5015 production run using Worker `3bd813a5-54d9-4060-bb52-d5e75bda2c8b` reached G05 after G00/G01/G03/G04 accepted; G05 correctly exhausted three quality attempts and blocked on fabricated physical dimensions with CAD units unconfirmed.
- Accepted G04 review exposed unresolved `N`/“任选其一” placeholders despite stage-contract passage. Local V8 adds deterministic rejection for unresolved design variables/selections and a stronger unconfirmed-unit constraint in the prompt covering unsupported standard component dimensions/specifications.
- Regression tests added for both the unresolved-choice gate and prompt constraint. Full suite, dry-run, deployment and same-task rework have not yet been run for V8.
- V8 live result: G00 revalidated; G01 `QUALITY_BLOCKED` after three attempts because the final candidate omitted the required source file ID. The harness now repeats the exact verified reference list in mandatory instructions and targeted repair feedback. This traceability prompt change is local and not yet retested.
- V9 follow-up corrects the false-positive “本阶段不输出已完成的测试结论” case and adds a gate for unsupported quantified electrical/utility specifications. Tests pass 62/62; deployment and same-task rework pending.
- V10 fixes the next observed false positive: stage ID `G02` adjacent to “尺寸/单位” was interpreted as a physical dimension. The unit detector now strips only exact G-stage identifiers before measurement checks. New regression added; pending checks and production retest.
- V10 production rework exposed another false positive: `不预设任何已完成测试结论` lacked a recognized disclaimer token. V11 adds `不预设`; only negative-context handling changes. Regression and release pending.
- V11 production rework moved through G01 and G03; G04 then hit the sibling disclaimer form `未输出任何 ... 已完成测试结论`. V12 adds `未输出` with a negative regression; awaiting full verification/release.
- V12 production rework exposed another common disavowal form (`未声明任何已完成测试`) at G00. V13 recognizes explicit no-claim verbs and is pending verification.

### V14 generic BOM sourcing gate — 2026-09-24

- The live same-task V13 rework had accepted through G08 and then blocked at G09. Candidate review showed unsupported supplier/model identifiers and market-price statements in addition to the correctly rejected unsourced dimensions/specifications.
- The G09 lexical contract only required the words BOM, quantity, cost, and supplier. V14 adds deterministic checks requiring server-identified quotation/procurement input references for each explicit price or named supplier/brand/model/part-number claim; model-authored evidence strings and qualifiers such as “estimate” are insufficient.
- File names, extensions, and model-authored citations do not prove quotation contents. Because no server-side quote parser/verifier exists, the workflow currently passes no trusted quote references; the Harness therefore requires functional categories and an explicit unquoted boundary, never invented purchasing detail. This does not constitute quote verification, a costed BOM, a quality pass, or Golden Sample parity.
- Focused quality/Harness tests: 20/20 PASS; TypeScript compile: PASS. Full suite, Wrangler type check, dry run, deployment, and same-task V14 production rework: pending.

### V15 narrow G00 false-positive correction — 2026-09-24

- V14 production rework on the same task blocked at G00. The final rejected candidate contained no completed FAT/field test claim: the numeric-default regex matched the `V14` embedded in a governed `RULE-...` identifier, and the completion detector matched `待验证` plus a CADCore topology verification statement.
- V15 removes immutable `RULE-*` / `INPUT-*` identifiers before unsupported metric matching and narrows the completion detector to test/performance/acceptance claims. Added regressions cover the exact false-positive phrases and retain positive completed-performance-test blocking.
- Focused quality tests: 13/13 PASS; full suite: 64/64 PASS; TypeScript: PASS; Wrangler types: PASS; deploy dry-run: PASS; diff check: PASS. Deployment and same-task V15 production rework remain pending.

### V16 MiniMax model-name / CAD-thread distinction — 2026-09-24

- V15 same-task rework passed G00, then G01 blocked because the unit regex interpreted the workflow metadata value `MiniMax-M3` as an M3 thread-size callout. The rejected candidate also ended with a truncated JSON transport body, which must remain rejected by the debug/structure boundary after this detector correction.
- V16 excludes only dedicated provider/model metadata lines from geometry-dimension scanning. A paired regression asserts that `MiniMax-M3` metadata is ignored while an actual `M3` thread callout remains detected. Focused quality suite: 13/13 PASS; full suite: 64/64 PASS; TypeScript, Wrangler types, deploy dry-run, and diff check: PASS. Production deployment and same-task retest pending.

### V17 malformed JSON transport boundary — 2026-09-24

- The V16 G01 final candidate was a truncated schema-shaped JSON response. It was blocked, but the prose fallback still materialized a rejected artifact from that malformed envelope.
- V17 rejects JSON-shaped fragments at the provider boundary before candidate construction; genuine prose fallback remains unchanged and still passes all independent gates. Regression covers a long, engineering-looking but unclosed JSON body.
- V17 provider/quality tests: 22/22 PASS; full suite: 65/65 PASS; TypeScript: PASS; Wrangler types: PASS; dry-run: PASS; diff check: PASS. Deployment and same-task production replay pending.

### V18 explicit unit and choice closure — 2026-09-24

- V17 production rework passed G00/G01, then blocked at G03 because the candidate asserted a millimeter-unit assumption while CADCore still reported `UNCONFIRMED`; it also gave unresolved interface/light/protocol alternatives as “任一均可 / 中选取”.
- V18 explicitly forbids assigning mm/inch/any unit when the server reports `UNCONFIRMED`, gives exact repair feedback, and extends deterministic unresolved-option detection for “任一均可”, “任意一种”, and “中选取”. No CAD/unit or supplier quality Gate was relaxed.
- Focused quality/Harness tests: 20/20 PASS; full suite: 65/65 PASS; TypeScript: PASS; Wrangler types: PASS; deploy dry-run: PASS; diff check: PASS. V18 deployment and same-task replay pending.

### V19 follow-up — 2026-09-24

- Production V18 same-task run: G00–G04 accepted; G05 blocked after three rejected attempts. Accepted G03/G04 text still contained unresolved choices/deferred work because the open-item helper was not wired into `evaluateCandidate()`.
- V19 connects open-item findings to independent candidate acceptance and updates Harness instructions to stop on missing-input blockers instead of handing them forward as accepted text.
- V19 local verification: focused quality/Harness tests 21/21 PASS; full suite 66/66 PASS; TypeScript compile PASS; Wrangler types PASS; deploy dry-run PASS; diff check PASS. Production deploy and same-task retest are pending. No ZIP or quality PASS is claimed.

### V20 source-authoritative STEP units — 2026-09-24

- Read-only retrieval of the same uploaded 5015 STEP source found 11 consistent explicit millimetre assignments; CADCore had ignored them and reported `UNCONFIRMED`.
- CADCore now conservatively parses explicit unit declarations and keeps unknown/mixed/conversion-based cases blocked; workflow preflight regenerates legacy STEP reports without unit provenance.
- Focused Python unit tests pass 3/3; full suite 66/66; TypeScript, Wrangler types, deploy dry-run, and diff check all pass. End-to-end CADCore inspection of the exact source reports `cadcore-g02-0.1.1`, `CONFIRMED / mm`, `shapeValid=true`, 4 solids, 397 faces, 2130 edges. V20 deployed as Worker `6bcf7801-52cb-4bef-8971-d1a40516a4e7`; same-task replay exposed a unique-job-row conflict before G00.

### V21 recovery fix — 2026-09-24

- Reuse the unique `cad_jobs` row when refreshing a legacy STEP inspection; clear stale keys and mark the row running before calling CADCore. This avoids inserting a duplicate for the same task/input/kind.
- V21 local verification: Python unit tests 3/3; full suite 66/66; TypeScript/Wrangler types/deploy dry-run/diff check PASS. Production deployment reached CADCore but artifact insert conflicted with the unique storage-key constraint.

### V22 idempotent artifact recovery — 2026-09-24

- G02 report/BREP rows now upsert on the existing `(task_id, stage_id, storage_key)` key. Only a prior BLOCKED job carrying the exact database artifact-conflict error is resumable; actual parse/geometry failures remain blocked.
- V22 local verification: focused Python parser tests 3/3; full suite 66/66; TypeScript/Wrangler types/deploy dry-run/diff check PASS. Production deployment and same-task rework pending; no quality pass or ZIP is claimed.
