# QA Test Cases — Automation Chief Engineer Cloud v0.1.0

**Execution state:** All **24** cases below are planned (**18 P0**, **6 P1**). `S-001` and `S-002` describe the only currently executable static-artifact checks; this QA Planner has not executed them. Every remaining case requires a future implementation and isolated test environment. No case is PASS merely because it appears in this file.

## Static package and visual-design cases

## TC-S-001: Documentation truthfulness and traceability

- Priority: P0
- Type: Manual
- Role: Independent QA reviewer
- Preconditions: Complete `docs/0.1.0` delivery package is available.
- Steps:
  1. Inspect `00_SPEC.md`, feature/workflow documents, user manual, deployment SOP, test-account strategy and Builder handoff.
  2. Trace stated deliverables to the three PNG assets and FR/AC references.
  3. Search for assertions that a Worker, domain binding, model call, live task, billing debit or production test already occurred.
- Expected Result: Documents consistently label the current deliverable as planned/static; production implementation/deployment is not represented as completed; runtime acceptance remains unexecuted.
- Risk Covered: A document package becomes false release/deployment evidence.
- Automation: Yes (link/inventory/forbidden-claim lint), with manual semantic review.

## TC-S-002: Static visual assets are readable and mapped to intended product surfaces

- Priority: P1
- Type: Manual
- Role: Independent QA reviewer
- Preconditions: The three `visuals/*.png` files are present.
- Steps:
  1. Check each file has PNG signature, non-zero size and decodes at its recorded dimensions.
  2. Visually inspect the command center, task studio and artifact/delivery screens.
  3. Trace visible task/upload/credits, agent pipeline/steps/evidence, and preview/manifest/ZIP concepts to their FR/AC mappings.
- Expected Result: Files are readable static mockups and visibly represent the intended surfaces; the result does not claim clickability, security, live data or runtime behavior.
- Risk Covered: Corrupt/missing visual deliverables or mockups misrepresented as a functioning application.
- Automation: Yes for file checks; No for semantic visual inspection.

## TC-V-001: Running visual state cannot imply an independent Gate PASS

- Priority: P1
- Type: E2E / Manual
- Role: member, reviewer
- Preconditions: Future command center has a stage `RUNNING`, 60%, checklist `6/7`, one unresolved evidence item and Gate `PENDING`.
- Steps:
  1. Open command center and the corresponding stage details.
  2. Inspect global/stage quality wording, score, Gate decision, evidence count, policy/Rubric version and delivery permission.
  3. Complete the missing evidence and submit an independent Gate review; compare pre/post state.
- Expected Result: Before independent review, UI says `NOT_READY`/pending, not “通过整体验收” or PASS. PASS appears only with the applicable stage/run/time, Gate decision and evidence; score alone does not change `delivery_allowed`.
- Risk Covered: The P1 command-center visual/spec contradiction creates a false quality or delivery claim.
- Automation: Yes.

## TC-V-002: Task-studio preferences retain the fixed 15-stage plan

- Priority: P1
- Type: Integration / E2E
- Role: member, system
- Preconditions: A member selects a subset of visible specialist preferences.
- Steps:
  1. Save and submit the task with several roles visually unselected.
  2. Read the created `ExecutionPlan` and command-center task tree.
  3. Mark one stage genuinely not applicable through the prescribed rule path.
- Expected Result: The plan contains all 15 specified stages. Preferences are recorded as delivery preference/applicability input, not permission to silently remove a stage. An N/A stage displays its rule, reason, impact and Gate decision.
- Risk Covered: The P1 new-task visual/spec contradiction silently removes mandatory quality work.
- Automation: Yes.

## TC-V-003: Office preview is explicitly a safe derived copy

- Priority: P1
- Type: Integration / E2E
- Role: reviewer, member
- Preconditions: Authorized task contains an Office fixture and `office-macro-sim`; conversion is ready, pending and failed in separate fixtures.
- Steps:
  1. Open preview in each conversion state.
  2. Inspect visible preview provenance, raw-file download control and authorization logs.
  3. Attempt macro/external-link execution and direct access to original object key.
- Expected Result: UI labels the preview as a safe PDF/HTML derived copy and shows conversion state. Macro, external link and script do not execute. Original download requires a separate authorized signed URL; unavailable conversion says unavailable rather than pretending Worker renders Office.
- Risk Covered: The P1 artifact-screen ambiguity leads to content execution, data leakage or a false Worker capability promise.
- Automation: Yes.

## TC-V-004: Delivery button is controlled by verifiable package eligibility

- Priority: P1
- Type: Integration / E2E
- Role: member, reviewer
- Preconditions: Fixtures cover score-only completion, Chief Review PASS + complete manifest/hashes, `QUALITY_BLOCKED`, incomplete manifest and hash mismatch.
- Steps:
  1. Open the delivery screen for each fixture.
  2. Attempt button/API download and inspect disclosed manifest/full SHA-256 metadata.
  3. Compare UI state to server-side Chief Review, blockers and manifest validation.
- Expected Result: `96/100`, a green colour, file count or a visual “completed” label never enables download. Only Chief Review PASS, no block, complete manifest and matching hashes allow `PACKAGED` and signed download. Full SHA-256/manifest are available beyond a short visual hash.
- Risk Covered: The P1 delivery visual/spec mismatch permits corrupt or unapproved ZIP release.
- Automation: Yes.

## Runtime security, data and workflow cases

## TC-A-001: Registration validation and non-enumerating login

- Priority: P0
- Type: Integration / E2E
- Role: anonymous
- Preconditions: Isolated auth store and rate-limit fixture.
- Steps:
  1. Register valid user, then submit duplicate email, malformed email, weak password and rate-limited attempts.
  2. Attempt login using unknown email, wrong password and disabled account.
  3. Inspect stored data, response bodies and audit events.
- Expected Result: Valid registration creates a user/ledger account and audit entry. Invalid requests give deterministic safe field/general errors without password persistence or account-existence leakage; disabled user cannot log in.
- Risk Covered: Account takeover, enumeration and plaintext-secret disclosure.
- Automation: Yes.

## TC-A-002: RBAC, tenant and direct-object authorization boundary

- Priority: P0
- Type: Integration / E2E
- Role: anonymous, member_a, member_b, reviewer_a, admin_a
- Preconditions: Tenant A and B tasks, events, ledger records, artifacts and finished packages; reviewer grant only to one Tenant A task.
- Steps:
  1. Request task, event, artifact, ledger, preview, download and admin endpoints with each identity.
  2. Replay a guessed UUID, raw R2 key and Tenant A signed URL while logged in as Tenant B or after revocation.
  3. Attempt reviewer mutation and member access to admin audit.
- Expected Result: Anonymous receives no protected data; member sees only owned/granted scope; reviewer is read-only on explicitly granted task; admin scope is limited to organization; cross-tenant/direct-key/revoked access fails without data leak.
- Risk Covered: P0 multi-tenant data disclosure and privilege escalation.
- Automation: Yes.

## TC-C-001: v0.1.0 credits invariant—never deduct or reserve

- Priority: P0
- Type: Integration / E2E
- Role: member, admin
- Preconditions: Deterministic member ledger balance; task fixtures for start, failed run, retry, rework and packaging.
- Steps:
  1. Record balance/ledger then create/start, fail/retry, rework and package task.
  2. Refresh UI and inspect `getBalance`, ledger and audit events after every operation.
  3. Attempt to create `RESERVE`, `DEBIT` and `REFUND` through user and privileged API paths.
- Expected Result: Balance is unchanged; ledger contains only allowed v0.1.0 types (`GRANT`, `ADMIN_ADJUSTMENT`, optional `DISPLAY_ESTIMATE`); each launch has `BILLING_SKIPPED_V0_1_0`; forbidden types are feature-flag rejected/audited and UI explicitly says no deduction.
- Risk Covered: Unauthorised financial change and misleading credits UI.
- Automation: Yes.

## TC-U-001: Upload validation, manifest and scan gate

- Priority: P0
- Type: Integration / E2E
- Role: member
- Preconditions: Draft/`INPUT_REQUIRED` task and safe, oversized, spoofed-MIME, quarantine and Office fixtures.
- Steps:
  1. Upload each fixture, including duplicate filenames and browser-supplied false MIME.
  2. Inspect persisted server MIME, byte size, SHA-256, uploader, object and scan status/input manifest.
  3. Submit with every attachment `SAFE`, `PENDING_SCAN`, `REJECTED` and failed scan.
- Expected Result: Server, not browser, establishes metadata; all inputs are traceable; `PENDING_SCAN`/`REJECTED`/scan failure block execution and unsafe preview. Error names are safe and field-specific.
- Risk Covered: Malware, content-type bypass and untraceable input.
- Automation: Yes.

## TC-T-001: Draft validation and submit idempotency under concurrency

- Priority: P0
- Type: Integration
- Role: member, system
- Preconditions: Valid and invalid draft fixtures; two parallel clients share one `idempotency_key`.
- Steps:
  1. Save blank/overlong/control-character name and prompt variants.
  2. Send two or more simultaneous submit/start requests, including retry after delayed response.
  3. Inspect Task, IdempotencyKey, run, Queue and initial event records.
- Expected Result: Invalid fields do not enter `QUEUED`; one key creates exactly one active run, one execution plan and one initial event set; retries return the original result. Different valid keys follow documented concurrency/version control.
- Risk Covered: Duplicate execution, accidental cost, inconsistent progress and lost updates.
- Automation: Yes.

## TC-T-002: Durable Object command lock and task-state transition table

- Priority: P0
- Type: Integration
- Role: member, admin, system
- Preconditions: One per-task coordinator; fixtures in all task states.
- Steps:
  1. Issue pause/resume/cancel/retry commands concurrently and while queue work is in flight.
  2. Test legal and illegal transitions, including cancel after `PACKAGED`, resume after `CANCELLED`, retry from `FAILED`/`QUALITY_BLOCKED` and recovery after coordinator restart.
  3. Inspect command event, safe-point acknowledgement and history.
- Expected Result: DO serializes commands; transitional states are visible until safe-point confirmation; illegal commands are rejected without mutation; historical runs/evidence survive retries; cancelled work cannot self-resume.
- Risk Covered: Race condition, destructive state corruption and invalid delivery state.
- Automation: Yes.

## TC-W-001: Workflow durable wait, checkpoint and legal recovery do not misadvance a task

- Priority: P0
- Type: Integration
- Role: system, admin, member
- Preconditions: A submitted task has one per-task DO, one associated persistent Workflow, 15-stage plan, and fixtures that reach Gate `REWORK`, `BLOCKED_ITEM` and an administrator-approval wait. The test harness can restart the Workflow/worker between checkpoints.
- Steps:
  1. Run an upstream stage to `REWORK`, then inspect its Workflow checkpoint, task/DO state and downstream stage eligibility.
  2. Restart/recover the Workflow while it is waiting; attempt an unauthorized, stale and duplicate resume command.
  3. Supply a valid rework/approval result, issue the legal resume command and inspect the resumed stage, event sequence and all downstream states.
  4. Repeat with `BLOCKED_ITEM` and an unconfigured/failed external work result.
- Expected Result: Workflow durably waits at Gate/approval boundaries and recovery returns to the same checkpoint. No downstream stage starts or becomes successful before the applicable Gate/approval condition is satisfied. Only one legal resume continues the eligible work; stale/duplicate/unauthorized resumes are rejected or deduplicated, and all wait/resume decisions are auditable. Failure remains retryable or blocked—never silently advanced or marked PASS.
- Risk Covered: Long-running orchestration loses state or wrongly advances delivery after rework/block/approval interruption.
- Automation: Yes.

## TC-Q-001: Queue and DLQ at-least-once delivery has exactly one durable side effect per job

- Priority: P0
- Type: Integration
- Role: system
- Preconditions: Small asynchronous Queue jobs/R2 event jobs carry persistent `job_id`/idempotency key; fixtures can redeliver a message, crash a consumer after the durable write, send it to DLQ and replay it. A Workflow remains the only owner of 15-stage ordering.
- Steps:
  1. Deliver the same artifact/notification/package-related small job twice concurrently and inspect job-deduplication, artifact, ledger, stage and package records.
  2. Simulate consumer crash after the first durable write but before acknowledgement, then allow at-least-once redelivery.
  3. Exhaust retry into DLQ, inspect message contents and audit/correlation records, then replay through the approved recovery route.
  4. Attempt to use competing Queue consumers to advance the same task's next 15-stage state.
- Expected Result: A persistent job/idempotency key yields exactly one durable business side effect: no duplicate artifact version, ledger entry, visible stage transition, package build or delivery audit. Duplicate/retry paths return the prior result or no-op with traceability. DLQ/replay is observable and idempotent; messages contain references rather than attachments/secrets. Queue consumers cannot race or replace Workflow/DO control of task-stage sequencing.
- Risk Covered: AC-020 violation causes duplicate output, billing/audit corruption, duplicate packaging or competing task progression.
- Automation: Yes.

## TC-E-001: Event ordering, reconnect and stale-progress truthfulness

- Priority: P0
- Type: Integration / E2E
- Role: member, reviewer
- Preconditions: Running task emits persisted events; fixture can drop connection, delay heartbeat and replay from `after_seq`.
- Steps:
  1. Subscribe, record event sequence, then refresh and reconnect from cursor.
  2. Inject duplicated/out-of-order delivery and a connection failure after a known event.
  3. Observe command center cards, timeline, last-event time and connection status.
- Expected Result: Source sequence is strictly increasing; client rebuilds same state without gap/duplication, ignores stale/duplicate events and shows last update + reconnect/polling state on disconnection. It never infers 100% or PASS from silence/animation.
- Risk Covered: False live status, lost evidence and misleading customer process visibility.
- Automation: Yes.

## TC-O-001: Fixed 15-stage pipeline, dependency and N/A audit trail

- Priority: P0
- Type: Integration
- Role: system, admin, reviewer
- Preconditions: Submitted task with safe input and a policy permitting one N/A decision.
- Steps:
  1. Create the execution plan and enumerate stages.
  2. Attempt to queue a downstream stage before upstream Gate PASS.
  3. Mark a stage not applicable by authorized policy path and inspect its evidence.
- Expected Result: Exactly the defined 15 stages (Intake through Packaging) are retained. Downstream queueing requires upstream success and Gate PASS. Every N/A records applicable rule, reason, impact/risk and Gate decision; no silent skip exists.
- Risk Covered: Missing engineering work and unverifiable orchestration.
- Automation: Yes.

## TC-G-001: Independent Gate cannot be self-approved

- Priority: P0
- Type: Integration
- Role: system, admin
- Preconditions: Candidate Agent run and isolated Gate reviewer configuration.
- Steps:
  1. Submit a valid candidate artifact for review.
  2. Attempt to write `PASS` using the producing Agent run/credentials.
  3. Inspect Gate record, run IDs, roles, policy version, context references and issue format.
- Expected Result: Production Agent cannot self-approve. Gate uses a different run ID, role/context and returns only `PASS`, `REWORK` or `BLOCKED_ITEM`; non-pass includes structured issue ID/rule/evidence/fix/owner/impact/retest condition.
- Risk Covered: MiniMax or production agent rubber-stamps its own poor output.
- Automation: Yes.

## TC-G-002: Candidate-output redlines reject empty, unsupported and contradictory work

- Priority: P0
- Type: Unit / Integration
- Role: system
- Preconditions: Fake provider returns each bad-output fixture.
- Steps:
  1. Submit empty schema, missing required field/evidence, template repetition, invalid evidence reference, unsupported factual claim and conflicting PEM value.
  2. Run deterministic validators and independent Gate.
  3. Inspect artifact version, diagnostic score, issue and delivery permission.
- Expected Result: Any redline blocks PASS and emits a traceable structured issue. Output is rejected/quarantined or demoted appropriately; `delivery_allowed=false`, and no misleading quality score can override the result.
- Risk Covered: Garbage, hallucinated or fabricated MiniMax output reaches customers.
- Automation: Yes.

## TC-G-003: Rework budget, GPT review route and `QUALITY_BLOCKED`

- Priority: P0
- Type: Integration / E2E
- Role: system, admin
- Preconditions: Stage repeatedly returns `REWORK`; test policy variants with and without authorised GPT review route.
- Steps:
  1. Fail the same Gate twice with distinct artifact versions.
  2. Inspect rework input scope/diff/audit and route decision.
  3. Test configured GPT review success/failure/unavailability, then try user force-complete/download.
- Expected Result: Only the relevant issue/evidence/PEM slice returns to owner; prior versions remain immutable. At budget exhaustion system uses approved high-capability route or enters `QUALITY_BLOCKED`; user has no force-complete path and blocked task cannot package.
- Risk Covered: Infinite low-quality retry, hidden overwrite and bypass of the GPT-equivalent quality floor.
- Automation: Yes.

## TC-G-004: Optional AI Gateway failure cannot bypass the independent quality chain

- Priority: P0
- Type: Integration
- Role: system, admin
- Preconditions: Policy variants have AI Gateway disabled, unconfigured, timeout/5xx, malformed telemetry/response, and available gateway. Fake MiniMax/GPT adapters and independent Gate fixtures are isolated from real provider credentials.
- Steps:
  1. Run a valid and a redline candidate under each Gateway variant.
  2. Inspect schema/evidence validation, independent Gate execution, rework counter, Workflow state, route/audit policy version and user-visible status.
  3. For a candidate that needs further review, make Gateway unavailable and exhaust the configured rework budget; attempt UI/API force completion and packaging.
- Expected Result: AI Gateway is only optional routing/observation. Disabled, absent or failed Gateway cannot auto-approve a candidate, suppress deterministic validators, skip an independent Gate, reset rework history or weaken delivery conditions. Valid independent paths proceed under their normal policy; failed/unverifiable quality work retries under policy or enters `QUALITY_BLOCKED` with an auditable reason. User cannot force PASS/package.
- Risk Covered: AC-021 violation makes Gateway/configuration failure a hidden quality bypass.
- Automation: Yes.

## TC-P-001: Artifact immutability, provenance and preview isolation

- Priority: P0
- Type: Integration / E2E
- Role: reviewer, member_b
- Preconditions: Authorized reviewer task with approved, reworked and quarantined artifact versions.
- Steps:
  1. Expand step artifacts and inspect version, complete SHA-256, source run, Gate, evidence and policy metadata.
  2. Try same-name overwrite, preview quarantined asset and direct URL/object-key access as another tenant.
  3. Preview PDF/image/text and Office fixtures.
- Expected Result: New content creates a new immutable version; provenance is complete; quarantined/unapproved assets cannot preview/download; all viewer access is task/tenant checked and only safe derived preview content is rendered.
- Risk Covered: Evidence tampering, cross-tenant data exposure and unsafe rendering.
- Automation: Yes.

## TC-P-002: ZIP packaging and signed-download integrity

- Priority: P0
- Type: Integration / E2E
- Role: member, reviewer, admin
- Preconditions: Approved, blocked, missing-manifest and `packaging-hash-mismatch` fixtures; short-TTL signing test clock.
- Steps:
  1. Request packaging for each fixture and inspect state transition, ZIP manifest and per-file hashes.
  2. Download as owner/reviewer/admin, then after TTL expiry, membership revoke and cross-tenant URL replay.
  3. Inspect issuance/download audit records.
- Expected Result: Only Chief Review PASS + no blocks + complete/verified manifest moves `PACKAGING → PACKAGED`. Any mismatch/missing asset fails or blocks without success message. URLs expire, require new RBAC check, cannot traverse/cross tenant and every issue/download is audited.
- Risk Covered: Corrupt/unapproved delivery or object leakage.
- Automation: Yes.

## TC-AD-001: Audited admin actions preserve Gate history

- Priority: P1
- Type: Integration
- Role: admin, member
- Preconditions: Admin policy, credits and blocked-task fixtures.
- Steps:
  1. Adjust credits, resolve a block with a reason and change model policy.
  2. Attempt each action as member/reviewer.
  3. Attempt to edit historical Gate PASS/REWORK evidence.
- Expected Result: Only authorized admin can act; audit includes actor, reason, time and before/after value or policy version. Historical Gate evidence is immutable; resolving a block does not forge a PASS or permit unmet package conditions.
- Risk Covered: Privileged fraud and loss of quality auditability.
- Automation: Yes.

## TC-D-001: Staging-to-production binding and rollback at `zg.gaona.world`

- Priority: P0
- Type: Manual / Staging integration
- Role: release operator, domain administrator
- Preconditions: Future Release Decision is approved; immutable release/tag; zone ownership, route-conflict, secret, security and provider approvals are documented; staging passed all P0 tests.
- Steps:
  1. Verify isolated staging vs production D1/R2/Queue/DO bindings, Worker compatibility/migration plan, private R2 and secret references (never values).
  2. Record pre-deploy route/DNS/certificate state and deploy manifest with code/policy/migration/rollback versions.
  3. Run authenticated health, authorization, upload, event, quality-block and signed-download smoke checks on staging, then bind `zg.gaona.world` only after approval.
  4. Rehearse/execute documented rollback to the known-good Worker/config and verify health plus data/migration compatibility.
- Expected Result: No production binding occurs on missing gate/ownership evidence. Correct HTTPS route and certificate serve the intended release without sharing staging data/secrets. Health/audit/alerting work, and rollback is documented, timely and does not expose data or corrupt state.
- Risk Covered: Existing-domain outage, wrong-environment data exposure, irreversible release or secret leakage.
- Automation: Partly (configuration/preflight/smoke); rollback approval and domain change require manual evidence.
# Runtime test-case addendum — 2026-09-18

- `TC-R-001`: ASCII STL upload → CADCore RPC → geometry report/BREP. Production PASS.
- `TC-R-002`: frozen DOCX/XLSX safe HTML preview with CSP and no raw Office execution. Production PASS.
- `TC-R-003`: 15-artifact Golden Comparator; MiniMax score and explicit GPT-SOL reference status. Production PASS (`REFERENCE_BASELINE`).
- `TC-R-004`: Playwright login, task selection, checkbox isolation, Inspector update. Production PASS.
- `TC-R-005`: transient model failure auto-retry max 2, audit, no quality-block retry. Code present; fault injection NOT RUN.

## Planned generic CAD-unit regression coverage (5015 iteration; NOT EXECUTED)

These eight cases are planned regression coverage informed by the 5015 experiment. They are generic CAD/evidence controls, not 5015-specific product rules. They have **not been executed**; listing them here is not PASS evidence and does not change any existing execution result.

### UNIT-001: Unconfirmed CAD units block qualified physical dimensions

- Priority: P1 (P0 if used for safety-critical or manufacturing release)
- Type: Unit / Integration
- Preconditions: CADCore input report has `unitStatus=UNCONFIRMED`; candidate gives a physical length such as `120–200 mm` and labels it an initial assumption or “to verify”.
- Steps:
  1. Submit the candidate to deterministic validation and independent Gate review.
  2. Inspect candidate persistence, issue details, Gate outcome and packaging eligibility.
- Expected Result: Candidate is rejected for the unresolved physical dimension. Qualifying it as an assumption does not permit the numeric dimension to pass. The issue identifies the claim and requires removal or authoritative unit confirmation plus supporting evidence. No Gate PASS or delivery eligibility is granted.

### UNIT-002: Dimension syntax and unit variants are covered

- Priority: P1 (P0 for safety-critical dimensions)
- Type: Unit
- Preconditions: `unitStatus=UNCONFIRMED`; candidate contains multiple physical lengths/tolerances, for example `0.3 mm`, `≤0.05mm`, ranges, and Chinese/English unit spellings.
- Steps:
  1. Validate each candidate variant independently, varying whitespace, comparison symbols, range syntax and unit language.
  2. Inspect that all unsupported physical length claims are surfaced.
- Expected Result: All unsupported physical dimensions are blocked regardless of the tested notation; no candidate containing one can receive PASS. The result must not depend on a single hard-coded field or exact unit spelling.

### UNIT-003: Thread and geometric callout formats are covered

- Priority: P1 (P0 where fit, load or safety depends on the callout)
- Type: Unit
- Preconditions: `unitStatus=UNCONFIRMED`; candidate contains thread/hole callouts such as `M6`, `M4×0.7`, `Ø8`, or `8 mm hole`.
- Steps:
  1. Submit each callout form to candidate validation.
  2. Inspect validation findings and Gate outcome.
- Expected Result: Unsupported thread and geometric size specifications are blocked, including forms without an explicit `mm` token. They cannot pass merely because the notation is a standard-looking code.

### UNIT-004: Explicit no-unit warning without dimensions is permitted

- Priority: P1
- Type: Unit
- Preconditions: `unitStatus=UNCONFIRMED`; candidate explicitly states that STEP units are unconfirmed, physical geometry is not being interpreted dimensionally, and dimensions will be provided only after confirmation; it supplies no physical size values.
- Steps:
  1. Submit the warning-only candidate.
  2. Inspect this rule’s finding and the independent Gate decision.
- Expected Result: The unit rule does not reject the warning-only statement. Other schema, evidence and quality checks still apply; the warning must not be represented as confirmed geometry or as an overall PASS by itself.

### UNIT-005: Grounded dimensions with confirmed units are not overblocked

- Priority: P1
- Type: Unit / Integration
- Preconditions: CAD evidence identifies `unitStatus=CONFIRMED`, specifies the units and source object/file, and candidate cites that evidence with a matching dimension.
- Steps:
  1. Submit a dimension matching the confirmed, cited CAD evidence.
  2. Submit a second candidate with a conflicting value or mismatched evidence reference.
- Expected Result: The matching, properly sourced claim is not rejected by the unconfirmed-unit rule; normal evidence and Gate checks remain in force. Conflicting or mismatched claims are rejected. A `CONFIRMED` label alone is insufficient evidence.

### UNIT-006: Non-dimensional numeric facts and identifiers remain usable

- Priority: P1
- Type: Unit
- Preconditions: `unitStatus=UNCONFIRMED`; candidate cites source evidence for non-dimensional facts such as input SHA-256 or CADCore solid/face/edge counts, and includes identifiers such as `G04` or `15/15`.
- Steps:
  1. Validate the candidate with grounded non-dimensional values and identifiers.
  2. Add an unsupported physical dimension and repeat validation.
- Expected Result: Grounded non-dimensional facts and workflow identifiers are not misclassified as lengths. Adding a physical dimension triggers a specific unit finding and blocks Gate PASS; unrelated grounded facts remain available for repair.

### UNIT-007: Rejected dimensions cannot propagate into downstream artifacts or ZIP

- Priority: P0
- Type: Integration / E2E
- Preconditions: A candidate with `unitStatus=UNCONFIRMED` proposes a physical dimension; downstream fixtures attempt to repeat or convert it into mechanical, BOM, process or costing artifacts.
- Steps:
  1. Submit and reject the source candidate.
  2. Attempt downstream generation using that candidate/version as an input.
  3. Attempt Chief Review and packaging; inspect provenance and manifest eligibility.
- Expected Result: Rejected dimensions are not treated as approved facts by downstream stages. A downstream artifact repeating or deriving from the rejected claim is also blocked unless it receives valid unit evidence and approval. Chief Review/packaging cannot include these artifacts; rejection lineage is auditable.

### UNIT-008: Unit confirmation is scoped to the cited CAD source

- Priority: P1 (P0 if an incorrect source could affect manufacture/safety)
- Type: Unit / Integration
- Preconditions: Task has at least two CAD inputs, one with confirmed units and one with `UNCONFIRMED` units; candidates cite the unconfirmed source or omit which source supports a dimension.
- Steps:
  1. Validate a claim tied to the unconfirmed input while another input is confirmed.
  2. Validate a claim with no source binding, then one explicitly tied to the confirmed input.
- Expected Result: Unit state is evaluated for the specific cited file/object/version; confirmed units from one input cannot authorize dimensions from another. Missing or ambiguous source binding blocks the dimension. A properly grounded claim from the confirmed source remains subject to normal consistency checks.

### Acceptance gaps for this planned coverage

- Define the authoritative source and structured evidence required to establish `CONFIRMED`; a model-authored status alone is not confirmation.
- Freeze parser coverage for physical dimensions in prose, tables and attachments, including locale-specific units, tolerances/ranges, diameter/radius symbols, thread notation and derived values. Also specify exclusions so Gate IDs, stage numbers, hashes and entity counts are not treated as lengths.
- Verify rejection occurs before candidate acceptance and that rejected candidates remain internal/auditable but cannot enter a customer ZIP.
- Define source binding for multiple CAD files and derived artifacts so unit status cannot leak across file, object, version or stage boundaries.
- These are planned cases only. No execution, PASS result, production validation or ZIP-quality conclusion is claimed by this addendum.

### UNIT-009: An assumed STEP unit cannot override unconfirmed source units

- Priority: P0 when the assumed unit drives manufacturing/safety dimensions; otherwise P1
- Type: Unit / Integration
- Preconditions: CADCore evidence reports `unitStatus=UNCONFIRMED`; candidate explicitly says “assume STEP mm” (or equivalent assumption/default wording) and then interprets CAD geometry or gives physical dimensions on that basis.
- Steps:
  1. Submit the candidate with the assumed unit clearly labeled as an assumption.
  2. Inspect deterministic findings, independent Gate outcome, candidate acceptance and downstream eligibility.
- Expected Result: The assumption cannot override the source's `UNCONFIRMED` status. Any physical dimension or geometry interpretation that depends on assumed millimetres is rejected or held for authoritative unit confirmation; labeling it ASM, “assume”, or “default” does not make it a supported physical fact. No dependent downstream artifact or package may treat it as approved.

### METRIC-001: Uncited default or “industry” numeric metrics cannot become requirements/facts

- Priority: P1 (P0 when the metric is safety-critical, acceptance-critical, or drives release/manufacturing decisions)
- Type: Unit / Integration
- Preconditions: Candidate contains numeric performance/quality targets such as `1%`, `0.1%`, or `OEE ≥95%`, described as an industry norm, default, standard target or baseline. Test fixtures include (a) a real task-prompt or uploaded-input evidence reference present in the task's allowed evidence set, (b) no applicable input evidence, and (c) fabricated/arbitrary references such as `RULE-DOES-NOT-EXIST` that are absent from that set.
- Steps:
  1. Submit a metric with no evidence reference, then with `RULE-DOES-NOT-EXIST` or another fabricated/arbitrary reference; run deterministic validation and independent Gate review.
  2. Submit a metric cited to a real task prompt/upload INPUT reference. Verify the reference resolves to the task's allowed evidence set and actually supports that target before reviewing the claim as a requirement.
  3. Submit a comparison candidate where the metric is explicitly a non-binding proposal for owner approval, is not represented as a fact or acceptance criterion, and is not used to pass a Gate.
  4. Inspect claim maturity, evidence resolution, relevance/support findings, Gate outcome and downstream artifact use for all variants.
- Expected Result: A metric presented as a requirement, verified fact, or acceptance criterion is blocked unless it has a real, resolvable task-prompt or uploaded-input (`INPUT`) evidence reference in that task's allowed evidence set which supports the stated value and context. An arbitrary or fabricated `RULE-*`/`RULE-DOES-NOT-EXIST` ID, an unresolved reference, or a citation that does not support the metric does not waive the block. A clearly labeled non-binding proposal may be retained only as a proposal requiring approval and cannot independently satisfy a Gate, calculation or release criterion. This case requires evidence resolution and relevance checks; string presence alone is insufficient.

Both cases above are planned coverage only and have **NOT BEEN EXECUTED**. They do not change any runtime QA result or establish production behavior.

### UNIT-010: Raw CAD coordinate units are not physical design dimensions

- Priority: P0 when used for manufacturing/safety dimensions; otherwise P1
- Type: Unit / Integration
- Preconditions: CADCore supplies a raw bounding box or coordinate measurements while source units remain unconfirmed. Candidate avoids named physical units such as `mm` but reports values such as `0.2 unit`, `250–400 单位`, or presents raw coordinate ranges as physical design dimensions.
- Steps:
  1. Submit candidates using raw coordinate values and generic “unit/单位” labels, including ranges derived from the bounding box.
  2. Inspect deterministic findings, independent Gate decision, candidate acceptance and downstream mechanical/BOM/package eligibility.
- Expected Result: Raw coordinates and generic unit labels remain non-physical/unconfirmed; they cannot be represented as confirmed physical design dimensions, fit/clearance values or manufacturing specifications. Such claims are rejected or held until an authoritative physical-unit mapping is established, with no downstream artifact or package treating them as approved dimensions.

UNIT-010 is planned coverage only and has **NOT BEEN EXECUTED**. It does not change any runtime QA result or establish production behavior.
