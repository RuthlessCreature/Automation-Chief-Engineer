# Regression Suggestions — Automation Chief Engineer Cloud v0.1.0

These are additions to the future implementation regression suite. They are **not executed** in v0.1.0 because no runtime application exists.

## Regression Tests to Add

| Issue ID | Regression Test | Type | Priority |
|---|---|---|
| ISSUE-001 | For a persisted stage with `RUNNING`, 60%, missing evidence, `Gate=PENDING`, assert text `NOT_READY`/pending, no PASS label, `delivery_allowed=false`, and no enabled delivery action. After a distinct Gate run records PASS with applicable evidence, assert the contextual Gate fields and eligible next state. | Integration + E2E DOM/state assertion | P1 |
| ISSUE-002 | Submit task preferences with multiple specialist choices disabled. Assert the stored ExecutionPlan and rendered task tree still contain exactly all 15 stages; an N/A branch must contain policy rule, reason, impact/risk, Gate decision, and audit reference. | Integration + E2E | P1 |
| ISSUE-003 | With authorized Office fixtures in pending, ready, and failed conversion states, assert the viewer labels a safe derived PDF/HTML copy and state; prevent macro/external-link execution and raw-key access; verify original download needs separately issued RBAC-checked URL. | Integration + E2E security negative | P1 |
| ISSUE-004 | Test score-only, `QUALITY_BLOCKED`, no-evidence, missing-manifest, hash-mismatch, and eligible fixtures. Assert only `ChiefReview=PASS`, no blocks, complete manifest, matching full hashes, and `delivery_allowed=true` expose an enabled download control and return a signed URL. | Integration + E2E + API authorization | P0 |

## Platform Architecture Regression Contracts

These three P0 contracts originate in the current QA plan rather than in a newly observed defect. They must be automated before staging; their inclusion here does **not** turn their present `BLOCKED/NOT RUN` status into a pass.

| Related Case | Regression Test | Type | Priority |
|---|---|---|---|
| TC-W-001 | Start a per-task Workflow through fixtures that stop at `REWORK`, `BLOCKED_ITEM` and administrator approval. Restart the Worker/Workflow at every wait checkpoint; try stale, duplicate and unauthorized resumes; then issue one valid resume. Assert durable checkpoint restoration, one auditable legal continuation, no downstream advancement before the applicable Gate/approval, and retryable/blocked—not PASS—failure behavior. | Isolated Worker/DO/Workflow integration | P0 |
| TC-Q-001 | Deliver the same small artifact/notification/package-related Queue job concurrently, crash after the first durable write before acknowledgement, exhaust retries to DLQ, and replay through the approved route. Assert one durable side effect per persistent job/idempotency key, reference-only messages, auditable no-op/replay behavior, and no Queue consumer ability to advance the 15-stage task state outside Workflow/DO control. | Isolated Queue/DLQ integration + fault injection | P0 |
| TC-G-004 | Run valid and redline candidates with AI Gateway disabled, unconfigured, timeout/5xx, malformed and available variants using fake MiniMax/GPT adapters. Assert schema/evidence validators, independent Gate, rework counter and policy/audit path remain authoritative; after exhausted rework with Gateway unavailable, assert `QUALITY_BLOCKED` and deny force-completion/packaging. | Integration + API authorization + policy audit | P0 |

## Additional Static-to-Runtime Guardrails

| Area | Regression test / acceptance guard | Priority |
|---|---|---:|
| Credits wording | Assert task creation and command-center UI explicitly state v0.1.0 does not deduct credits; inspect ledger/audit after create/start/fail/retry/package for no `RESERVE`/`DEBIT`/`REFUND` and one `BILLING_SKIPPED_V0_1_0` launch event. | P0 |
| Preflight/start affordance | For every unresolved preflight input, assert server response and button state agree on whether it is blocking, optional-with-risk, or acknowledged; never represent an unsafe/pending-scan input as startable. | P0 |
| Visual state source | Assert all status/percentage/action controls derive from persisted task, Gate, and event data. Network loss must show last event time/reconnect status and never infer completion/PASS. | P0 |
| Visual semantic lint | Add stable test IDs and a UI-state matrix so automated screenshot/DOM tests reject coexisting `PENDING/NOT_READY` and unconditional PASS/delivery labels, hide full hash values only behind authorized expansion, and require accessible text in addition to colour. | P1 |

## Closure Evidence Required

Do not close the four OPEN issues based on mockup editing alone. For each, retain: the corrected visual/state contract; API/state-machine evidence; an automated test result; a browser E2E result with screenshots or video; relevant audit/manifest/event assertions; and independent QA retest evidence.
# Runtime follow-up addendum — 2026-09-18

Run a staging-only fault injection for MiniMax 429/500 and Workflow restart; configure an approved GPT-SOL endpoint and compare live score calibration against the Golden reference; add binary STL and non-watertight/malformed STL fixtures; add Office source-file conversion tests if a trusted converter is approved.
