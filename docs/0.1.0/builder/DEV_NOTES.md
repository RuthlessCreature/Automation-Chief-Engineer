# Builder 开发说明 — v0.1.0

## 1. 本轮已交付范围

**交付状态：DOCUMENTARY / VISUAL ONLY（事实）**

本轮 Builder 未实现任何生产 Worker、前端、数据库迁移、测试代码、Cloudflare 资源或域名配置。已完成的 Builder 范围是对 Spec Owner 提供的三张静态产品形态稿作可交接审阅，并将审阅结论写入 [`VISUAL_ACCEPTANCE_NOTES.md`](VISUAL_ACCEPTANCE_NOTES.md)。

被审阅的产品形态资产：

| 视觉稿 | 产品场景 | 对应规格范围 |
|---|---|---|
| `visuals/01-task-command-center.png` | 运行中任务的总工/子 Agent 流水线、步骤、质量与事件 | FR-PROG-001/002、FR-GATE-001、FR-QA-001、FR-ART-001；AC-008–014 |
| `visuals/02-new-task-studio.png` | 新建任务、资料上传、模型/credits 预估、预检与启动 | FR-CR-001/002、FR-TASK-001/002/003；AC-003–007 |
| `visuals/03-artifact-preview-delivery.png` | 已完成任务的安全预览、步骤证据、质量门与最终交付 | FR-PROG-002、FR-ART-001、FR-PREV-001、FR-PACK-001/002；AC-010、014–017 |

这些静态稿满足本轮“先出文档和产品形态效果图”的交付边界：它们直观覆盖了用户要求的创建任务、上传输入、credits（不扣费）、酷炫可观察的 Agent 流水线、步骤产物/渲染入口、质量门和最终包下载等目标形态。它们不是可点击 UI、API 契约实现、模型运行记录或任何验收通过证据。

## 2. Changed Files

| File | Change | Reason | Related SPEC ID |
|---|---|---|---|
| `docs/0.1.0/builder/DEV_NOTES.md` | 新增 Builder 范围、事实状态和交接说明 | 记录本轮无代码 Builder 交付的准确边界 | 00_SPEC §2、§3、§15；02_FEATURE_LIST Definition of Done |
| `docs/0.1.0/builder/BUILD_RESULT.md` | 新增可复核的静态资产文件验证结果 | 交接视觉资产的格式/读取证据，避免宣称 UI 构建 | 00_SPEC §4、§15 |
| `docs/0.1.0/builder/VISUAL_ACCEPTANCE_NOTES.md` | 新增逐画面 FR/AC 映射、语义风险与实现限制 | 使后续实现与 QA 能区分视觉意图、事实和可验证行为 | FR-PROG-001/002、FR-GATE-001、FR-PREV-001、FR-PACK-001/002；AC-003–017 |

除上述 `builder/` 文档外，Builder 未修改任何文件。

## 3. API Changes

无。尚未创建、修改或调用 API。

## 4. UI Changes

无生产 UI 改动。三个现有 PNG 是静态视觉原型；本轮仅审阅，不将其转换为页面、组件或交互实现。

## 5. Data Model / Migration Changes

无。未创建 D1 schema、迁移、R2 key 规则、Durable Object 状态或 Queue 消息结构。

## 6. Developer Tests Added

无测试代码。进行了非功能性的视觉资产完整性检查（文件存在、PNG 签名、可由图像解码器打开、像素尺寸）；结果见 `BUILD_RESULT.md`。这不是单元测试、集成测试、浏览器 E2E、真实模型调用、权限测试或 QA 结论。

## 7. Assumptions

1. 三张 PNG 均为本轮产品形态静态原型，截图内的任务、时间、百分比、质量分、credits、文件名、哈希片段及用户身份均为**示例内容**，不代表生产数据。
2. 静态“预览”“渲染”“开始”“暂停”“下载”控件均是目标交互提示，不代表已经连通 Office 转换、R2、签名下载、模型路由或任务状态机。
3. `MiniMax Token Plan` 在视觉稿中只是用户指定的候选模型/套餐命名；准确 API、模型、配额和数据条款仍为 TBD，不能从画面反推供应商集成完成。
4. v0.1.0 的“估算 credits”为展示/预估；实际启动必须遵守 FR-CR-002：不写 `DEBIT`，并写 `BILLING_SKIPPED_V0_1_0` 事件。

## 8. Known Limitations

1. 未实现注册/登录、RBAC、tenant 隔离、credits 账本、上传扫描、任务幂等、15 阶段编排、事件流、质量 Gate、产物版本、预览转换、ZIP 打包或短期签名下载。
2. 因此 AC-001 至 AC-019 均**尚无运行时测试证据**；`SPECIFIED` 只表示规格完成，不能解读为已构建或已验证。
3. 三稿中有几处必须在 UI/状态模型实现前澄清或修正的语义风险，尤其是：运行中页面的“通过整体验收”标签、任务创建页可选专业流水线与固定 15 阶段的关系、Office 预览是否为安全衍生副本、以及完整 SHA-256/manifest 的可访问性。详见 `VISUAL_ACCEPTANCE_NOTES.md`。
4. `zg.gaona.world` 未绑定；任何 Worker/DNS/SSL/secret/模型/Office 服务均未创建或验证，符合 00_SPEC §3 与 AC-019 的范围限制。

## 9. Handoff to Dev Self-Check

建议 Dev Self-Check 独立复核以下事实（不构成 QA 通过）：

```powershell
# 复核受控 Builder 文档范围与工作区差异
git status --short

# 验证三张视觉资产为可读取 PNG，并输出尺寸/格式
$imgs = Get-ChildItem 'docs/0.1.0/visuals' -Filter '*.png' -File
Add-Type -AssemblyName System.Drawing
foreach ($img in $imgs) {
  $image = [System.Drawing.Image]::FromFile($img.FullName)
  "{0}: {1}x{2}; {3}" -f $img.Name, $image.Width, $image.Height, $image.RawFormat
  $image.Dispose()
}

# 在实施开始后才按实际技术栈补充并执行 lint/typecheck/unit/build 命令。
```

建议实施前先关闭审阅文档中的 P1/P2 语义项，再由独立 Dev Self-Check、QA Planner 和 QA Executor 分别产生验证证据；Builder 不对这些阶段作结论。

---

## 10. Implementation update — 2026-09-17

**This section supersedes the earlier “no production code” statement for the items below.** The visual-deliverable record above is retained as historical evidence of the documentation-first phase.

### Delivered vertical slice

| Area | Implemented evidence | Deliberate boundary |
|---|---|---|
| Worker application | `src/index.ts`, native API router, static UI in `public/` | No production deployment or custom domain binding. |
| Account access | D1 users/sessions, PBKDF2 SHA-256 (210,000 iterations), HttpOnly/Lax cookie, 250 display credits | No email verification, password reset, enterprise SSO or production rate limiting. |
| Task control plane | D1 task state, owner-only task APIs, audit events | Tenant/team membership and reviewer/admin workflows are not complete. |
| Task orchestration | One `TaskCoordinator` Durable Object per task; monotonic persisted sequence; `TaskWorkflow` with fixed 15 stage sequence | Browser currently uses controlled one-second polling rather than WebSocket/SSE. |
| Model boundary | Local schema-complete fixture for end-to-end validation; MiniMax adapter fails closed unless endpoint, model and secret are configured | No MiniMax account/API contract is assumed or called. |
| Quality defense | Independent deterministic candidate gate rejects inadequate body, missing traceability, invalid evidence and placeholders; any rejection transitions task to `QUALITY_BLOCKED` | Semantic engineering review and GPT escalation policy are next-slice work. |
| Input intake | Draft tasks accept an allow-listed, size-bounded (10 MiB) raw upload to private R2; D1 records immutable filename, MIME, byte size, SHA-256 and `STAGED_FORMAT_VALIDATED` | This is format validation only; antivirus/malware scanning and Office/CAD conversion are not implemented. Raw inputs are not directly previewed. |
| Artifact evidence | Internal Markdown artifacts written to R2 with SHA-256 and provider/evidence provenance | Office/CAD render workers and preview conversion are not implemented. |
| Layer separation | `INTERNAL`, `PREVIEW_DERIVATIVE`, `CUSTOMER_DELIVERY`; immutable source/derivative and delivery-package records | No frozen customer ZIP generator exists; workflow intentionally stops at `PACKAGING`. |

### Actual validation evidence

```powershell
npx wrangler types
npx tsc --noEmit
npm test
npx wrangler deploy --dry-run
npx wrangler d1 migrations apply ace-control-plane --local
```

Results observed on 2026-09-17:

- Worker type generation, TypeScript type-check and `wrangler deploy --dry-run` passed.
- Vitest executed **6 passing tests**: quality acceptance/rejection, password verification, per-task Durable Object event isolation/sequencing, authenticated task ownership isolation, and private D1/R2 input staging. The suite applies the real D1 migrations to an isolated Workers-runtime test database.
- Local D1 migrations `0001_control_plane.sql`, `0002_internal_delivery_layers.sql` and `0003_task_inputs.sql` applied successfully.
- Local HTTP smoke path passed with an authenticated user: register → create task → start workflow → **48** persisted events → **15** R2-backed `INTERNAL` artifacts → task state `PACKAGING`, quality `PASS`.
- The final state was intentionally not `PACKAGED`: no final ZIP key or frozen delivery manifest was generated.

Deployment-safety correction: the committed Worker configuration defaults to `APP_ENV="development"`, not `local`. Therefore a direct deployment takes the MiniMax adapter's fail-closed path and emits Secure cookies. The `npm run dev` script alone adds the `APP_ENV=local` override needed for the fixture provider and HTTP localhost cookie behavior.

### Reference-derived internal process model

The user directed Builder to inspect the parent directories of both golden samples. The findings and resulting product contract are recorded in [`08_INTERNAL_WORKSPACE_MODEL.md`](../08_INTERNAL_WORKSPACE_MODEL.md). Specifically, the implementation now treats handoffs, stage producer outputs, gate reports, raw evidence, build receipts, QA render pages and package-extract checks as internal first-class objects—not as disposable implementation detail and not as customer delivery files.

## Generic CAD-unit evidence gate — 2026-09-23

- The same production 5015 task was used as the regression seed; no product-specific model text or Golden Sample content was injected.
- V5 run evidence showed CADCore `unitStatus=UNCONFIRMED` while the accepted vision artifact contained physical lengths/thread callouts. This was not safe to treat as a usable CAD drawing.
- Added V6 policy plumbing from the server-derived CAD report through the stage workflow and Harness. When any input CAD unit is unconfirmed, candidate title/body claims using explicit length units, diameter symbols, or common metric thread notation are rejected before acceptance.
- The rule is deliberately conservative across stages. It does not assert that an unconfirmed STEP is millimetres; it permits non-dimensional facts and explicit no-unit warnings. Per-file attribution and richer CAD unit extraction remain follow-up gaps.
- Regression coverage was added for ranges/operators, multilingual units, inch units, metric threads, diameter symbols, safe warnings, stage/hash-style quantities, title-only claims, and the confirmed-unit bypass contract.
- An independent first self-check found two P1 gaps before release: missing/unreadable CAD reports failed open, and a word-boundary pattern missed Chinese/other unit spellings. Builder changed the workflow to fail closed per CAD input and expanded unit recognition; independent recheck is still required.
- V6 production rework used the existing 5015 task and was blocked after two automatic retry instances. Accepted stages reached G00, G01, G03, G04, G05, G06 and G07; the final active workflow stopped at G02 after repeated candidate dimension claims. No ZIP was frozen or approved.
- Inspecting the V6-accepted G01 exposed uncited “industry typical/default” performance values and an explicit “assume STEP unit mm” statement contradicting `UNCONFIRMED`; the V6-accepted G04 also used raw coordinate values labelled only “unit/单位”.
- V7 local iteration adds source-reference requirements for numeric industry/default metrics, rejects assumed CAD unit assignment while status is unconfirmed, and treats raw-coordinate “unit/单位” dimensions as unconfirmed. QA cases `UNIT-009`, `UNIT-010`, and `METRIC-001` document these as generic planned regression coverage.
- V7 remains local only pending independent review; no V7 deployment/rework or ZIP is claimed.
- No production deployment or successful 5015 ZIP is claimed here; these are implementation notes only.
