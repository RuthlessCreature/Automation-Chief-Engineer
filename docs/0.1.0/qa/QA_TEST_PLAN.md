# QA Test Plan — Automation Chief Engineer Cloud v0.1.0

**Plan status:** READY_FOR_FUTURE_EXECUTION. This is an independent QA planning artifact, not a test-run report. **Inventory: 24 planned cases — 18 P0 and 6 P1.**

## 1. Test Scope

### 1.1 What can be verified in this iteration

This iteration delivers a specification package and three static PNG product-form mockups. The only executable verification scope is therefore document and asset inspection:

- Required v0.1.0 product, workflow, user, deployment and test-data documents exist and do not claim that an unimplemented Worker/product is live.
- The three visual assets are readable PNGs and their visible intent can be traced to the specification: task creation/upload/zero-charge credits; observable Chief Engineer/sub-agent pipeline; safe preview, quality evidence and gated delivery.
- Static visual review identifies, rather than conceals, the four implementation-before-release P1 visual/spec alignment points carried by Builder handoff: (1) a running stage must not imply Gate PASS, (2) selectable specialist preferences must not delete the fixed 15-stage plan, (3) Office preview must be labelled and implemented as a safe derived copy, and (4) delivery/download affordance must be driven by Chief Review plus complete manifest and hashes. The related complete-SHA-256 disclosure requirement is also checked with the delivery point.

### 1.2 Future implementation scope (designed now; not executable this iteration)

Once an application exists, the P0/P1 suites below cover:

- registration, session security, RBAC, resource ACL and tenant isolation;
- credits ledger integrity and the v0.1.0 **zero-deduction** rule;
- server-side upload validation, scanning, quarantine and input manifests;
- task command idempotency, Durable Object serialization and state-machine transitions;
- durable Workflow wait/checkpoint/recovery without premature downstream progression; Queue/DLQ at-least-once consumer idempotency without repeated side effects;
- ordered DO events, reconnect/replay, stale-heartbeat presentation and pipeline UI;
- the fixed 15-stage plan and independently evaluated Gate decisions;
- MiniMax candidate-output guardrails, independent reviewer separation, rework, optional AI Gateway failure/configuration, GPT route/`QUALITY_BLOCKED`;
- immutable artifacts, safe Office preview, signed download URLs, ZIP manifest/hash gates;
- staging-to-production Cloudflare release, `zg.gaona.world` routing, health checks and rollback.

## 2. Out of Scope

- No Worker, browser UI, API, migration, D1/R2/Queue/DO namespace, model adapter, Office converter, ZIP service, Cloudflare account, DNS record, secret or custom-domain binding has been created. They cannot be marked tested.
- No real MiniMax, GPT, Office, email, payment or production account call is authorized by this plan. Fakes are the default for unit/integration tests; any staging smoke with a real provider requires an approved low-privilege key, redacted prompt, spend limit and audit run.
- Pixel-perfect reference comparison against `E:\GN\GN\_UI`, accessibility interaction, responsiveness, performance, security penetration testing, DNS/SSL verification and rollback rehearsal require the future implementation/environment. They are planned tests, not current evidence.
- A static PNG cannot prove API authorization, event ordering, live progress, accessibility semantics, storage isolation, file safety, hash integrity or a clickable control.

## 3. Test Strategy

| Layer | Purpose and execution point | Evidence required | Current status |
|---|---|---|---|
| Documentation / static visual inspection | Check cross-document truthfulness, linked requirements, mockup readability, visual-to-FR traceability and explicit limitations. | File inventory; PNG signature/decode/dimensions; review checklist and issue list. | Executable now; **not executed by this planning stage**. |
| Unit | Pure validation: password and input validation, RBAC policy, state reducer, idempotency key handling, event sequence comparator, schema/evidence validators, manifest/hash checker. | Test output and coverage from future implementation. | Design only. |
| Integration | Exercise Worker bindings with isolated D1/R2/DO/Workflow/Queue/DLQ and fake adapters; validate transactions, wait/recovery, idempotent consumers, authorization and error objects. | Migration, fixture setup, request/response, Workflow/job history, D1/R2/audit inspection. | Design only. |
| E2E | Browser journeys through registration, draft/upload/start, live pipeline/reconnect, artifact preview and authorised download. | Video/screenshots plus server-side audit/event/ledger assertions. | Design only. |
| Security / negative | Cross-tenant URL replay, forged MIME, secret leakage, duplicate/concurrent requests, stale signed URL, bad model output, corruption and rollback failure. | Denial result, no side effect and audit/correlation evidence. | Design only. |
| Staging release | Validate only after Release Decision and immutable release candidate are available; production route is last, reversible step. | Signed deployment manifest, Cloudflare binding snapshot, health/smoke logs and rollback record. | Design only. |

**Evidence rule:** a UI assertion must be corroborated by the service-side source of truth where applicable (D1 record, immutable audit, DO event stream, R2 metadata or signed-download authorization log). A screenshot, a provider response, a score, `SKIPPED`, `NOT RUN`, or a Builder statement is never enough to call a P0/P1 case PASS.

## 4. Test Matrix

| Module | Scenario | Role | Input | Expected | Risk | Test Type | Priority |
|---|---|---|---|---|---|---|---|
| Static package | Required docs state planned vs delivered accurately | QA reviewer | `docs/0.1.0` package | No live/deployed assertion; links and FR/AC traceability resolve | False release claim | Manual | P0 |
| Static visuals | Three PNGs decode and represent the documented product surfaces | QA reviewer | 3 PNG assets | Non-empty, readable assets; each maps to stated product scenario | Missing/corrupt deliverable | Manual/script | P1 |
| Visual/spec P1 | Running step / incomplete checklist never reads as Gate PASS | QA reviewer/member | command-center state fixture | `NOT_READY`/pending shown until independent Gate decision with evidence | False quality claim | E2E/manual | P1 |
| Visual/spec P1 | Preferences preserve fixed 15-stage plan | member | selected/unselected role preferences | All 15 nodes exist; N/A has rule, reason, impact and Gate decision | Silent stage omission | Integration/E2E | P1 |
| Visual/spec P1 | Office preview is a safe derived preview | reviewer | Office/macro simulation | Labelled conversion state; no macro/link execution; raw access separately authorised | Malware/data leak | Integration/E2E | P1 |
| Visual/spec P1 | Delivery availability is Gate/manifest/hash driven | member/reviewer | completed, blocked and corrupt packages | Only complete approved package may download; full SHA-256/manifest available | Unverified delivery | Integration/E2E | P1 |
| Auth/RBAC | Anonymous, disabled, member/reviewer/admin/system boundaries | all | protected endpoints/resources | Least privilege; no protected data or secret disclosure | Tenant breach | Integration/E2E | P0 |
| Credits | Start/retry/fail/package leave balance untouched | member/admin | ledger fixture and task commands | No `RESERVE`/`DEBIT`/`REFUND`; `BILLING_SKIPPED_V0_1_0` audit exists | Unauthorized charge | Integration/E2E | P0 |
| Upload | Spoofed MIME, pending scan and rejected object | member | `mime-spoof`, quarantine fixture | Server detection/scan status blocks start and unsafe preview | Malicious upload | Integration/E2E | P0 |
| Commands | Duplicate/concurrent start and pause/cancel/retry states | member/admin | shared idempotency key; racing commands | One active run, legal transitions, preserved history | Duplicate work/data loss | Integration | P0 |
| Workflow | Gate/approval wait, durable checkpoint and resume | system/admin | `REWORK`, `BLOCKED_ITEM`, approval wait, restart | Waits durably; only authorized/legal resume advances eligible stage | Premature or lost orchestration | Integration | P0 |
| Queue/DLQ | At-least-once duplicate delivery and recovery | system | duplicate job/R2 event, retry and DLQ replay | One durable side effect per job key; no repeated artifact/ledger/stage/package write | Duplicate customer work/charge/delivery | Integration | P0 |
| Events | Ordered live stream, refresh and reconnect cursor | member/reviewer | drop/reconnect after event N | strictly increasing `event_seq`; replay has no gap/duplication; stale state is honest | Fake/stale progress | Integration/E2E | P0 |
| Pipeline/Gate | 15 stages, dependency and independent Gate | system/admin | plan plus candidate artifacts | Upstream PASS required; independent run cannot self-PASS | Garbage delivery | Integration | P0 |
| Quality guardrail | Empty, hallucinated, conflicting or unverifiable MiniMax output | system/admin | bad-output fixtures | structured issue + REWORK/BLOCKED, never PASS | Model fabricates output | Unit/integration | P0 |
| AI Gateway | Optional Gateway disabled, unconfigured or failed | system/admin | provider/Gateway failure variants | Normal schema/evidence/Gate/rework/block path remains; never auto-PASS | Observability/routing failure bypasses quality | Integration | P0 |
| Escalation | Two failed reworks / unavailable GPT route | system/admin | repeated REWORK fixture | approved GPT route or `QUALITY_BLOCKED`; no force-complete | Quality bypass | Integration/E2E | P0 |
| Artifact/preview | Versioning, ACL, derived preview and direct-key attack | reviewer/member_b | artifact + R2 key/URL | immutable version; only authorized derived content; deny cross-tenant | Data leak/execution | Integration/E2E | P0 |
| Package/download | Manifest/hash mismatch, expiry and revoke | member/reviewer | bad hash, expired/revoked URL | no `PACKAGED`/no access; audit issue/reissue only after RBAC | Corrupt or leaked ZIP | Integration/E2E | P0 |
| Admin audit | Credit adjustment, policy change, block resolution | admin/member | privileged commands | reason/operator/time/before-after recorded; historical Gate cannot change | Privilege abuse | Integration | P1 |
| Deployment | Staging isolation, domain route, HTTPS health and rollback | release operator | immutable release candidate | all SOP gates, correct bindings/route/cert; known-good rollback works | Production outage | Staging/manual | P0 |

## 5. High-Risk Areas

1. **False completion and model-quality fraud (P0):** MiniMax output or UI presentation may look polished while evidence, schema, independent Gate or delivery permission is absent.
2. **Tenant/object authorization (P0):** predictable IDs, raw R2 keys, cached/signed URLs, event subscriptions and preview endpoints can leak other tenants' data.
3. **Workflow/Queue ownership and at-least-once delivery (P0):** long-lived Workflow waits/recovery must not advance downstream early; Queue retries/DLQ replays and repeated browser clicks must not create duplicate runs, artifacts, ledger entries, events or package jobs. DO owns one-task command serialization, not the 15-stage long-running workflow.
4. **Optional AI Gateway fails open for routing, never for quality (P0):** an unavailable, disabled or malformed Gateway cannot turn a missing candidate/review into PASS or relax Gate/rework/block rules.
5. **Live-state trustworthiness (P0):** reconnect, out-of-order event and stale heartbeat handling must not make a stopped run appear complete.
6. **Unsafe content paths (P0):** browser MIME claims, Office conversion, external links/macros and preview endpoints can execute or expose unscanned content.
7. **Delivery integrity (P0):** a score or pretty delivery card must not bypass Chief Review, manifest completeness, per-file hashes or authorization.
8. **Production route ownership (P0):** an incorrect `zg.gaona.world` Worker route, DNS/SSL conflict or non-reversible migration can disrupt an existing property.
9. **Visual semantic drift (P1):** static prototype wording can contradict the fixed pipeline, Gate and zero-charge contracts if copied into UI without a state source.

## 6. Required Test Data

Use only temporary, isolated development/staging fixtures described in `06_TEST_ACCOUNTS.md`; no credentials or real customer files appear in source, screenshots or logs.

| Data / identity | Required use |
|---|---|
| `anonymous`, `disabled_user` | Auth denial, session expiry and protected-resource checks. |
| `member_a` / Tenant A and `member_b` / Tenant B | Owner access and cross-tenant negative tests. |
| `reviewer_a` / Tenant A | Explicit read/download grant, no mutation. |
| `admin_a` / Tenant A and `system_worker` | Audited privileged actions and service-only orchestration. |
| Task fixtures | `DRAFT`, `INPUT_REQUIRED`, `QUEUED`, `RUNNING`, `PAUSED`, `REWORK`, `QUALITY_BLOCKED`, `PACKAGING`, `PACKAGED`, `FAILED`, `CANCELLED`; all legal and prohibited transitions. |
| Input fixtures | valid text/PDF/image, `mime-spoof`, quarantine simulation, `office-macro-sim`, oversize/empty filename/control-character samples. |
| Model fixtures | valid schema/evidence, `empty-agent-output`, `conflicting-output`, inaccessible evidence reference, repeated template, reviewer failure and GPT-route unavailable. |
| Delivery fixtures | approved package, missing manifest field, `packaging-hash-mismatch`, expired/revoked signed URL, private raw R2 key. |
| Workflow / Queue fixtures | Workflow checkpoint waiting on `REWORK`, `BLOCKED_ITEM` and admin approval; legal/illegal resume after restart; duplicate queue/R2 event delivery, consumer crash-after-write, DLQ/replay and a persistent job/idempotency key. |
| Event fixtures | reconnect after known cursor, duplicate/out-of-order event injection, heartbeat timeout and two simultaneous start requests using one idempotency key. |
| Gateway fixtures | AI Gateway disabled, missing configuration, timeout/5xx/malformed response, candidate failure and independent Gate unavailable; each has expected retry/block/audit policy outcome. |

## 7. Automation Candidates

Automate all P0 contract tests before a staging deployment: auth/RBAC matrix; tenant ACL and signed URL replay; ledger zero-deduction invariant; MIME/scan gate; state-machine table; concurrent idempotent start; Workflow wait/checkpoint/restart; Queue/DLQ duplicate-consumer replay; event sequence/replay; 15-stage plan; independent Gate/run separation; schema/evidence/redline checks; AI Gateway disabled/failure invariants; two-rework escalation; artifact/manifest/hash validation; and route/config preflight.

Keep visual language, keyboard/screen-reader use, reduced-width behavior, perceived coolness, Office renderer usability and rollback rehearsal as human-assisted tests, while automating screenshots/DOM-state assertions where the future UI can expose stable test identifiers. A visual-regression baseline may be added only after P1 semantics are fixed; it must assert textual state fields, not colour pixels alone.

## 8. Manual Exploratory Checklist

- Rapidly click **Start**, Pause, Resume, Cancel, Retry and Download; send duplicate commands from two tabs and two users where authorization permits.
- Refresh during upload, `QUEUED`, `RUNNING`, `PAUSING`, rework and packaging; use browser back/forward; reconnect after airplane-mode/network failure.
- Switch `member_a`, `reviewer_a`, `member_b` and `admin_a` without clearing deep links; retry direct artifact, preview and signed URL paths.
- Explore empty task lists, zero credits, absent attachment confirmation, empty model artifact, malformed model JSON, missing evidence and a stalled heartbeat.
- Use dirty task text, Unicode/control characters, long values, duplicate filenames, false MIME, quarantined input and simulated Office macro/external-link content.
- Inspect every status in text, icon and colour; at desktop/narrow width check that pipeline summaries, last event time, reconnect state, Gate decision and delivery permission remain visible.
- Force Workflow restart while waiting on rework/approval, Queue retry/crash-after-write/DLQ replay, duplicate event, event gap, DTO/version conflict, AI Gateway timeout/missing configuration, failed preview conversion, corrupt ZIP hash and signed URL expiration.
- Verify browser/network/log/error surfaces do not reveal passwords, API keys, cookies, signed URLs, internal prompts, full private attachment content or chain-of-thought.

## 9. Missing Requirements / Test Blockers

The following are valid planned requirements but need product/technical decisions before final executable acceptance is possible:

| Open item | QA impact / conservative test treatment |
|---|---|
| MiniMax API/model limits/data terms; GPT reviewer permission, budget and region | Use fake adapters; assert policy-driven route and `QUALITY_BLOCKED` fallback, never assume provider availability. |
| Cloudflare Zone ownership, existing route/DNS/Access conflict and deploy authority for `zg.gaona.world` | Production/domain case remains blocked; verify in staging first and require owner evidence before any bind. |
| Auth verification/recovery mechanism and definitive 403 vs 404 privacy policy | Test contract needs freezing before API E2E; still require no protected-data disclosure. |
| Initial credits, currency, price calculation and future billing cutover | Test only immutable zero-deduction behavior now; do not infer a charge amount. |
| Upload allowlist/size limits, retention, data residency and scan/preview vendor | Boundary values and compliance acceptance cannot be finalized; default deny unsafe/unscanned content. |
| Office conversion provider and supported formats | Test safe derived-preview contract and failure state; do not promise direct Office execution. |
| Organization membership/reviewer-grant policy | Use explicit fixture grants; freeze invitation/admin delegation rules before release. |
| SLOs, supported browsers, accessibility target and observability thresholds | Performance/accessibility release gates remain to be specified, though the semantic/manual checks above are mandatory. |

## 10. Execution Gate

QA Executor must first create `QA_TEST_RUN.md`, `ISSUE_LIST.md` and regression suggestions from actual evidence. For this iteration, it must distinguish `PASS` for a performed static file/document check from **NOT RUN / NOT IMPLEMENTED** for runtime rows. No P0/P1 runtime case can pass until code, isolated test resources and independently collected evidence exist.
# Runtime target addendum — 2026-09-18

New critical cases: (1) ASCII and binary STL produce a source-bound BREP and geometry report while non-watertight evidence remains explicit; (2) Office delivery previews are safe derivatives with CSP and never execute raw macros/scripts; (3) comparator returns MiniMax dimensions plus `REFERENCE_BASELINE`/live GPT-SOL state; (4) Playwright verifies task selection and checkbox isolation in production; (5) transient model failures retry at most twice and quality blocks do not retry. Evidence and external-validation boundaries are tracked in `09_RUNTIME_COMPLETION.md`.
