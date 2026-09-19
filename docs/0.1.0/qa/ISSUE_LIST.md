# QA Issue List — Automation Chief Engineer Cloud v0.1.0

**Scope:** Only reproducible, currently inspectable static-visual issues are OPEN below. Runtime requirements without an implementation are recorded as BLOCKED/NOT RUN in `QA_TEST_RUN.md`; they are not invented as failures and are not treated as passes.

## Issue Status Summary

| Open Blocker | Open Major | Open Minor | Suggestions |
|---:|---:|---:|---:|
| 0 | 4 | 0 | 0 |

## ISSUE-001: 运行中的需求阶段被“通过整体验收”与交付入口误导为已通过 Gate

- Status: OPEN
- Severity: Major
- Module: Command-center static visual / Gate-status presentation
- Related Test Case: TC-V-001 (runtime execution BLOCKED); static exploratory review
- Environment: `docs/0.1.0/visuals/01-task-command-center.png`, 1672×941 PNG, SHA-256 `16B7FC1BE3EADC759169FD94B7C79ACAACE939B728D7FFF3D1E891D267F3FE19`
- Account / Role: N/A — static mockup review
- Preconditions: Open the full-resolution PNG.
- Steps to Reproduce:
  1. Inspect the `需求工程师` card and current-agent panel: both show `RUNNING` / 60%.
  2. Inspect the quality panel: it shows score `92/100`, green `通过整体验收`, and a `6/7` checklist.
  3. Observe that `客户确认记录` is still orange `待补充`, while the bottom-right `打开交付包` control visually appears available.
- Expected Result: Per FR-GATE-001, FR-QA-001, AC-011–014, and TC-V-001, an incomplete/running stage with missing evidence must show `NOT_READY`/`PENDING`, applicable stage/run/time, and `delivery_allowed=false`; score or animation must not imply Gate PASS or delivery eligibility.
- Actual Result: The static visual presents mutually conflicting running/incomplete and overall-pass/delivery-ready signals.
- Evidence: Direct full-resolution visual review; the same contradiction is documented as P1 in `builder/VISUAL_ACCEPTANCE_NOTES.md` under “画面 01 的文字/语义缺陷与限制”.
- Impact: If copied into the product, users can mistake an unreviewed or evidence-incomplete run for an independently approved quality result and initiate/expect delivery.
- Suspected Cause: Example quality score, checklist, Gate wording, and action affordances were composed independently rather than from one authoritative Gate/delivery state model.
- Recommendation: Replace the green overall-pass label with explicit `预检 6/7；Gate 决定：PENDING/NOT_READY` for this state; disable/withhold delivery action; surface independent Gate run ID, policy/Rubric version, evidence count, issue link, timestamp, and `delivery_allowed`. Implement and verify TC-V-001 against persisted server state.
- Regression Test Needed: Yes

## ISSUE-002: 可取消勾选的专业智能体视觉未说明固定 15 阶段计划仍会保留

- Status: OPEN
- Severity: Major
- Module: Task-studio static visual / execution-plan configuration
- Related Test Case: TC-V-002 (runtime execution BLOCKED); static exploratory review
- Environment: `docs/0.1.0/visuals/02-new-task-studio.png`, 1672×941 PNG, SHA-256 `8F0471F92CF9A908E8AB1B2A146CF1306D546964AECF1135177B3406F8BE8089`
- Account / Role: N/A — static mockup review
- Preconditions: Open the full-resolution PNG.
- Steps to Reproduce:
  1. Locate `选择专业智能体流水线`.
  2. Observe that some individual cards are unchecked (for example `成本分析 CT / Cost`, `方案文档 Documentation`, and `质量闸门 Gatekeeper`).
  3. Observe that the page does not say these are preference/applicability inputs, does not render the fixed 15-stage execution plan, and does not present rule/reason/impact/Gate fields for an N/A stage.
- Expected Result: FR-ORCH-001 and AC-007 require the fixed 15-stage plan. A preference cannot silently delete a stage; a genuinely N/A stage needs rule, reason, impact/risk assessment, and Gate decision. TC-V-002 requires that this relationship be explicit.
- Actual Result: The visual offers role-like selection/removal without a visible fixed-plan safeguard, so it reasonably reads as a way to omit mandatory stages.
- Evidence: Direct full-resolution visual review; P1 conflict independently acknowledged in `builder/VISUAL_ACCEPTANCE_NOTES.md` under “画面 02 的文字/语义缺陷与限制”.
- Impact: A future implementation can omit required engineering/quality stages and violate the principal quality-control contract without an auditable N/A decision.
- Suspected Cause: The selection control conflates customer delivery preference with the system’s mandatory orchestration plan.
- Recommendation: Rename/reframe the control as `交付偏好 / 适用性问卷`; on submit render all 15 planned stages; require policy-backed N/A records containing rule, reason, impact, and Gate decision. Implement and verify TC-V-002 by reading the stored ExecutionPlan and command-center tree.
- Regression Test Needed: Yes

## ISSUE-003: 文档预览未标注安全衍生副本或转换状态

- Status: OPEN
- Severity: Major
- Module: Artifact preview static visual / Office safety boundary
- Related Test Case: TC-V-003 (runtime execution BLOCKED); static exploratory review
- Environment: `docs/0.1.0/visuals/03-artifact-preview-delivery.png`, 1672×941 PNG, SHA-256 `80B54F0E9209F0D07BDEBF7FACD99EAE4DF290FE9674F73EE7F25A882FB75B2F`
- Account / Role: N/A — static mockup review
- Preconditions: Open the full-resolution PNG.
- Steps to Reproduce:
  1. Inspect the central `文档预览` viewer and the right-hand source list containing `05_工艺方案讨论纪要.docx`.
  2. Look for a label that the rendered page is a safe PDF/HTML derived copy, a conversion state, original-file provenance, and a separately authorized raw-download path.
  3. No such information is visibly present.
- Expected Result: FR-PREV-001 and AC-015 require an authorized safe derived preview, explicit conversion state (`READY`/pending/unavailable), no macro/external-link/script execution, and a separately authorized raw download; the Worker must not imply it executes Office.
- Actual Result: The mockup visually juxtaposes a `.docx` source and document preview without safety/provenance/conversion semantics.
- Evidence: Direct full-resolution visual review; the missing semantic is documented as P1 in `builder/VISUAL_ACCEPTANCE_NOTES.md` under “画面 03 的文字/语义缺陷与限制”.
- Impact: The eventual UI can mislead users about Office execution or hide the distinction between a safe derived preview and a raw potentially unsafe object.
- Suspected Cause: Viewer mockup is file-type agnostic and has no preview-state data contract represented.
- Recommendation: Add visible `安全预览副本` provenance, source artifact/version, conversion state, security restrictions, and separately authorized raw-download state. Implement server-side derived-preview isolation and verify all three conversion states plus macro/external-link/direct-key negative paths in TC-V-003.
- Regression Test Needed: Yes

## ISSUE-004: “无证据，不交付”状态与可用态最终 ZIP 下载按钮相互矛盾

- Status: OPEN
- Severity: Major
- Module: Artifact/delivery static visual / package eligibility
- Related Test Case: TC-V-004 (runtime execution BLOCKED); static exploratory review
- Environment: `docs/0.1.0/visuals/03-artifact-preview-delivery.png`, 1672×941 PNG, SHA-256 `80B54F0E9209F0D07BDEBF7FACD99EAE4DF290FE9674F73EE7F25A882FB75B2F`
- Account / Role: N/A — static mockup review
- Preconditions: Open the full-resolution PNG.
- Steps to Reproduce:
  1. Inspect the right-side Gate/quality and delivery panel.
  2. Observe orange `无证据，不交付` and text that all outputs require traceable evidence.
  3. Observe the prominent blue `下载最终交付包 ZIP` control, which is visually presented as enabled, alongside completed/`96/100` signals.
- Expected Result: FR-PACK-001/002 and AC-016/017 require a download only after Chief Review `PASS`, no blocker, complete manifest, and matching complete per-file hashes. Any no-evidence, missing-manifest, or hash-mismatch state must be disabled/blocked with a reason; score and green styling cannot enable delivery.
- Actual Result: The static image presents a no-delivery warning and an apparently actionable final-download control at the same time. It also does not expose the complete SHA-256/manifest eligibility state that would justify the control.
- Evidence: Direct full-resolution visual review; the required correction is documented as P1 in `builder/VISUAL_ACCEPTANCE_NOTES.md` under “画面 03 的文字/语义缺陷与限制”.
- Impact: Future users could receive a corrupt, unapproved, or evidence-incomplete package; this undermines the system’s stated anti-garbage-delivery guardrail.
- Suspected Cause: The download affordance is a static happy-path component without a single machine-verifiable package-eligibility source of truth.
- Recommendation: Drive button enabled state and download API authorization from `ChiefReview=PASS && noOpenBlocker && manifestComplete && allHashesMatch && delivery_allowed`; otherwise disable it and display failed predicate(s). Expose full manifest and SHA-256 data through authorized views and verify with all TC-V-004 fixtures.
- Regression Test Needed: Yes
# Runtime issue disposition — 2026-09-18

The four visual prototype issues below are historical static-review findings. Runtime equivalents are now guarded by server-side state/preview predicates and covered by the completion evidence. They are not deleted because the original visual artifacts remain historical evidence.

