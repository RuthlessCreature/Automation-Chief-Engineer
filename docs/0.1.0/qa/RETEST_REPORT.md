# QA Retest Report — Automation Chief Engineer Cloud v0.1.0

**Role:** Independent Regression QA / Retester  
**Retest date:** 2026-09-17 (Asia/Shanghai)  
**Retest scope:** The four OPEN static-visual issues, the Fixer handoff, `00_SPEC.md`, and the three named v2 PNG prototypes. No application/runtime evidence was introduced to this retest.

## 1. Retest Summary

| Fixed claims retested | Static prototype design revisions verified | Static findings reopened | Runtime verifications blocked / NOT RUN |
|---:|---:|---:|---:|
| 4 | 4 | 0 | 4 |

**Meaning of this summary:** all four Fixer claims are verified only as a **static prototype design revision**. This is not a functional fix verification, does not close any original issue, and does not turn a `NOT RUN` runtime case into PASS. The authoritative entries in `ISSUE_LIST.md` remain **OPEN Major** because the original QA issue statuses are not changed by this retest.

## 2. Test Boundary and Evidence

### 2.1 Evidence reviewed

- `qa/ISSUE_LIST.md`, `qa/QA_TEST_RUN.md`, and `qa/REGRESSION_SUGGESTIONS.md`
- `fix/FIX_REPORT.md` and `fix/ISSUE_RESOLUTION.md`
- `00_SPEC.md`
- `visuals/01-task-command-center-v2-quality-safe.png`
- `visuals/02-new-task-studio-v2-fixed-plan.png`
- `visuals/03-artifact-preview-delivery-v2-safe.png`

The preceding QA run establishes that no browser-accessible application, Worker, API, persistent state, authorization layer, preview converter, package service, Cloudflare binding, or usable test account is available. That fact remains unchanged in the Fixer handoff. Therefore the planned implementation cases `TC-V-001` through `TC-V-004` were **not executable in this retest**.

### 2.2 Independently executed static checks

| Check | Result | Independent evidence / limitation |
|---|---|---|
| v2 file readability and PNG decode | PASS (static only) | All three v2 assets decoded as PNG at 1672×941. This proves readable files, not DOM behavior or state enforcement. |
| v2 identity check | PASS (static only) | SHA-256 values match the Fixer’s recorded values: `F10E8B472A53D32E64C0971C336F4C551A577B7183C6C1D74ACBA81E157CB` (01), `379CE07FF04F423A7EFFEBC9A44F2BE98897A543F0B7AE9467EC39A084B92616` (02), and `B554B904847437BD535AA2A9F8D03651AEC845BE1A16EABB12AE472F53D5A4FB` (03). |
| Full-resolution visual inspection | PASS (static only) | Each current v2 image was independently opened at original resolution; visible labels and state combinations below were inspected directly. |
| Specification-boundary regression | PASS (static semantic alignment only) | Checked visible semantics against FR-ORCH-001, FR-GATE-001, FR-QA-001, FR-PREV-001, FR-PACK-001/002 and AC-007, AC-011, AC-015–017. This is not proof that the specified persistence, RBAC, state machine, or API exists. |
| New/old visual audit retention | PASS (static audit only) | The three original v1 visual files and the three corresponding v2 visual files are present. Presence preserves an audit trail; v1 files were not used as current acceptance evidence. |

## 3. Issue Retest Results

| Issue ID | Original status / Fixer claim | Independent static retest result | Evidence | Runtime result and still-required evidence |
|---|---|---|---|---|
| ISSUE-001 | **OPEN Major** / `FIXED_FOR_RETEST — design prototype only` | **VERIFIED — static prototype design revision only** | `01-task-command-center-v2-quality-safe.png` shows a RUNNING 60% stage, `预检 6/7`, missing customer material as `INCOMPLETE`, `Gate 决定：PENDING / NOT_READY`, `delivery_allowed = false`, Gate metadata, `无证据，不交付`, and greyed `交付包不可用（等待 Chief Review）`. This is internally consistent with the non-deliverable running state required by FR-GATE-001 and FR-QA-001. | **TC-V-001: BLOCKED / NOT RUN.** Need persisted task/Gate/delivery state, browser E2E evidence that an incomplete/PENDING run cannot enable delivery, and API-level denial when `delivery_allowed=false`. The visual styling cannot prove an actual disabled control or denial. |
| ISSUE-002 | **OPEN Major** / `FIXED_FOR_RETEST — design prototype only` | **VERIFIED — static prototype design revision only** | `02-new-task-studio-v2-fixed-plan.png` expressly labels selections as `交付偏好与适用性问卷（不改变固定15阶段计划）`, displays a locked `固定执行计划：15阶段`, states N/A record requirements (policy rule, reason, impact assessment, independent Gate decision), and visually blocks plan generation while preflight remains unresolved. This addresses the prior reasonable reading that preferences silently remove mandatory stages. | **TC-V-002: BLOCKED / NOT RUN.** Need a submitted task, stored and rendered `ExecutionPlan` with all 15 stages, and an auditable N/A record containing rule, reason, impact/risk, Gate decision, and audit reference. A mockup cannot demonstrate persistence or submit behavior. |
| ISSUE-003 | **OPEN Major** / `FIXED_FOR_RETEST — design prototype only` | **VERIFIED — static prototype design revision only** | `03-artifact-preview-delivery-v2-safe.png` identifies the `.docx` source/version and source run; labels the viewer `安全预览副本`; shows `转换状态：READY`; states `PDF 派生物 · 宏/外链/脚本均不执行`; and separates `原文件下载：需单独授权`. These visible semantics align with FR-PREV-001 and AC-015. | **TC-V-003: BLOCKED / NOT RUN.** Need authorized pending/READY/failed conversion fixtures; server-side safe-derived-preview and provenance evidence; negative evidence for macro/external-link/script execution; and separately RBAC-checked raw-download authorization. A displayed label does not demonstrate isolation. |
| ISSUE-004 | **OPEN Major** / `FIXED_FOR_RETEST — design prototype only` | **VERIFIED — static prototype design revision only** | The eligible state in `03-artifact-preview-delivery-v2-safe.png` is internally coherent: `证据齐全，允许交付`, `Chief Review = PASS`, `Open Blocker = 0`, `manifest complete`, `38/38 SHA-256 已匹配`, `delivery_allowed = true`, manifest metadata, and a short-TTL authorized ZIP-download note accompany the enabled-looking ZIP action. This conforms to the positive predicate set in FR-PACK-001/002 and AC-016/017. | **TC-V-004: BLOCKED / NOT RUN.** Need server-enforced negative tests for score-only, no-evidence, `QUALITY_BLOCKED`, missing-manifest, and hash-mismatch states; only the fully eligible predicate set may return a signed download URL. The visual cannot prove hash validation, authorization, or backend rejection. |

## 4. Critical P0/P1 Static Regression Results

| Area | Priority | Result | Notes |
|---|---:|---|---|
| P0: package-delivery predicate presentation | P0 | PASS — static only | The v2 delivery screen represents one consistent **eligible** package state. Runtime authorization, complete-manifest calculation, and hash comparison remain NOT RUN. |
| P0: start/preflight truthfulness | P0 | PASS — static only | The v2 task studio visibly keeps `生成受控执行计划` unavailable while a preflight blocker is present. It does not prove the actual button property, submit API, or server validation. |
| P0: persisted-state source of visual controls | P0 | NOT RUN / BLOCKED | No task/Gate/event persistence, network loss fixture, API, or browser exists. No claim of persisted-state binding is made. |
| P1: Gate readiness versus delivery affordance | P1 | PASS — static only | The v2 command center no longer co-displays a pending/no-evidence state with an available delivery-package action. |
| P1: fixed-plan safeguard | P1 | PASS — static only | The v2 studio separates delivery preference from the fixed 15-stage plan and renders the N/A governance requirements. |
| P1: preview provenance and safety semantics | P1 | PASS — static only | The v2 viewer visibly distinguishes a safe PDF derivative from the raw Office source and labels the conversion/security state. |
| P1: readable assets and auditability | P1 | PASS — static only | v2 PNGs decode at 1672×941 with independently rechecked hashes; both v1 and v2 artifact sets remain present for audit. |

## 5. Reopened Issues

**None at the static-prototype layer.** The retest found no recurrence of the four original visual-semantic contradictions in the reviewed v2 files.

This must not be read as closure: all four original issues remain OPEN in `ISSUE_LIST.md` because their required runtime verification is unavailable. No issue status was modified by this independent retest.

## 6. Remaining Required Runtime Evidence

Before any issue can be closed or a release decision can rely on it, retain the closure evidence already required by the QA regression handoff:

1. A corrected UI/state contract implemented against persisted server state, plus an automated regression result for each issue.
2. Browser E2E results with screenshots or video for `TC-V-001`–`TC-V-004`, including the applicable negative paths.
3. API/state-machine evidence that UI labels/actions derive from authoritative Task, Gate, event, preview, and package-eligibility data.
4. Relevant audit, evidence-reference, manifest, hash, authorization, and event assertions; for Office preview, explicit isolation and non-execution evidence.
5. Independent QA rerun after the implementation exists. A Fixer claim, a static mockup, a score, or an enabled/greyed graphic is insufficient.

## 7. Retest Decision

**RETEST_FAILED**

The visual-only revisions have been independently verified at the static prototype layer, but the original issues cannot be closed and the related runtime P1/P0 tests remain **BLOCKED / NOT RUN**. There is no implemented environment in which to verify actual disabled controls, persisted 15-stage plans, Gate isolation, safe Office previewing, manifest/hash integrity, signed-download authorization, or Cloudflare deployment. Therefore this retest is not `RETEST_PASS` or `RETEST_PASS_WITH_RISKS`, and it provides no basis for RC, deployment, or binding `zg.gaona.world`.
# Runtime retest addendum — 2026-09-18

Runtime retest evidence is PASS for `npx tsc --noEmit`, 8 Vitest files/23 tests, production Playwright 1/1, remote migrations, production preview endpoints, Golden Comparator (15 artifacts), and STL CADCore smoke. `GPT-SOL LIVE` remains `NOT RUN` because no evaluator key was provided; the Codex/skill Golden Contract is the explicit `REFERENCE_BASELINE`. Stage Harness repair/block/format-error behavior, explicit-assumption placeholder normalization, stage-specific delivery-contract rejection, G12 contract prompting, and upstream timeout conversion are unit-verified. One production full-rebuild drill for task `5015` passed several gates, then exhausted two automatic retries on MiniMax upstream timeouts at the Digital Twin stage and ended `FAILED / BLOCKED`; no stale ZIP was re-published. The failed-task manual rework path is now deployed and a new full rebuild is currently running from Intake/Feasibility under the 120-second upstream wait. The full workflow fault-injection drill remains `NOT RUN` until an isolated staging Worker with separate D1/R2 is available, and is not represented as production PASS.
