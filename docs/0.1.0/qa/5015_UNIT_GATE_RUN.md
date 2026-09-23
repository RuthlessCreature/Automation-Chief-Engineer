# 5015 CAD-Unit Gate Regression — QA Executor Findings

**Execution date:** 2026-09-23 (Asia/Shanghai)  
**Scope:** The generic CAD-unit guard regression from the planned `UNIT-001` through `UNIT-008` addendum. Independent execution only; no source/test-plan edits, production mutation, or deployment performed.

## Result summary

| Check | Result | Evidence |
|---|---|---|
| Production task is blocked, not packaged | PASS | Remote D1 task `2b98d2bb-52cf-471d-ad6f-9a2c309a06c3`: `state=QUALITY_BLOCKED`, `quality_status=BLOCKED`, `retry_count=1`, updated `2026-09-23T09:17:54.802Z`. No running `ace-task-workflow` instances were returned. |
| Previously accepted V5 G04 contains unconfirmed-unit physical dimensions | FAIL (regression reproduced) | Remote D1 records G04 `vision` candidate `...vision-candidate-2d8d7189-b917-420f-95a0-4420111db2a8` as `ACCEPTED`, `stageContract=PASS`, policy `GB-ACE-DELIVERY-V5-INPUT-FENCED`. Retrieved R2 artifact says CADCore `unit status UNCONFIRMED` and nevertheless includes numeric thresholds (`≥0.3mm`, `≥0.05mm`, `≥0.1mm`, etc.), camera scale/FOV computations, `≤5ms`, `120–200mm`, and `≤±2mm`; several are framed as assumptions/to-verify. This violates planned `UNIT-001`/`UNIT-002` expected result. |
| Current focused quality tests | PASS | `npx vitest run test/quality.test.ts`: 1 file, 11/11 tests passed on rerun. The first execution on this checkout failed 1 test because the confirmed-unit fixture body was shorter than the unrelated G01 governed-handoff minimum; the fixture was subsequently expanded, and the same focused command passed. The test emitted dependency sourcemap warnings only. |
| Wrangler generated-type check | PASS | `npm run types`: `worker-configuration.d.ts` up to date. |
| TypeScript check | PASS | `npx tsc --noEmit`: exit code 0. |
| Delivery status / usable package | PASS (blocked) | D1 has one historical delivery-package row, status `REJECTED`, `approved_by=null`; no approved package is evidenced. Current task is `QUALITY_BLOCKED`, so this result is not a successful ZIP/package acceptance. |

## Cases not exercised

- `UNIT-001` production end-to-end rejection and delivery-permission assertion: **NOT RUN**. The current unit regression suite is a focused unit-level check; no production V6 candidate was submitted.
- `UNIT-002` full syntax/locale matrix: **NOT RUN** as the entire planned matrix. Only the variants represented by `test/quality.test.ts` were executed.
- `UNIT-003` thread/hole/diameter callout matrix: **NOT RUN** as a complete case.
- `UNIT-004` warning-only behavior: covered by the focused unit test; test passed.
- `UNIT-005` evidence-backed confirmed units and conflict controls: covered by the focused unit test; test passed. This does not establish production STEP-unit parsing or authoritative unit confirmation.
- `UNIT-006` grounded non-dimensional facts and identifiers: covered by the focused unit test; test passed.
- `UNIT-007` rejected-claim propagation through downstream generation, Chief Review, and ZIP: **NOT RUN**.
- `UNIT-008` per-file/source-bound unit confirmation with multiple CAD inputs: **NOT RUN**.
- Full Vitest suite, production browser automation, production rework under the new unit policy, and deployment: **NOT RUN**.

## QA conclusion

The focused local guard behavior and its type checks pass on the current checkout, but the production regression is confirmed: the V5-accepted G04 artifact contains physical dimensions despite the source STEP's units being unconfirmed. Production task 5015 is now blocked and has no approved package, but this QA run does **not** prove the new policy is deployed or has rejected a fresh production G04 candidate. Do not treat this as a passed production acceptance or a ZIP-quality approval.

## Retest addendum — 2026-09-23

**Retest scope:** latest shared checkout after Builder's fail-closed CAD-unit propagation change and expanded multilingual/unit-notation fixtures. This is a local code retest only; source and test-plan files were not changed by QA.

| Check | Result | Evidence |
|---|---|---|
| Focused quality and harness suites | PASS | `npx vitest run test/quality.test.ts test/harness.test.ts`: 2 files, 17/17 tests passed. Coverage includes unconfirmed-unit gate behavior, Chinese/English length units, range/spacing/comparison forms, thread/diameter callouts, non-dimensional workflow/CAD identifiers, missing unit status treated as unconfirmed by the helper, and existing harness repair/retry/evidence-fencing behavior. Four dependency sourcemap warnings were emitted; they did not fail tests. |
| Generated Wrangler types | PASS | `npm run types`: Worker types are up to date. |
| TypeScript | PASS | `npx tsc --noEmit`: exit code 0. |
| Workflow-level absent/unreadable CAD report propagation | NOT RUN | The unit helper test covers absent status as unconfirmed, and code inspection shows missing/unreadable report paths feed `UNCONFIRMED`; no focused test in the executed harness suite constructs those workflow dossier failure paths end-to-end. |
| Production V6 task rework and G04 rejection | NOT RUN | No production deployment or rework was performed in this QA run. |
| Full planned UNIT-001 through UNIT-008 acceptance / complete test suite / production browser automation | NOT RUN | These wider test obligations remain open; passing the focused suites is not full acceptance evidence. |

The earlier production finding remains unchanged: V5 G04 was accepted with physical-dimension claims while its STEP units were unconfirmed. The local retest shows the latest unit/harness code and types pass, but it does not establish production behavior. Keep the task blocked from delivery until V6 is deployed, the same task is reworked, and production evidence shows the offending candidate cannot be accepted or packaged.

### Final focused retest after expanded dimension notation — 2026-09-23

The Builder added regression fixtures for explicit `m` and `meters/metres`, radius notation, and three-value dimension chains. The independent focused rerun produced:

| Check | Result | Evidence |
|---|---|---|
| Quality + harness | PASS | `npx vitest run test/quality.test.ts test/harness.test.ts`: 2 files, 17/17 tests passed. This includes the newly expanded unit-notation fixtures in `quality.test.ts`. Dependency sourcemap warnings remain non-fatal. |
| Wrangler types | PASS | `npm run types`: Worker types are up to date. |
| TypeScript | PASS | `npx tsc --noEmit`: exit code 0. |
| Full suite | NOT RUN by this independent retest | Root reported a separate 58/58 full-suite run from before the final notation-only extension; it is not claimed as this QA run's evidence. |
| Production V6 deploy/rework/rejection | NOT RUN | No production deployment or task mutation occurred. |

The production V5 finding and all previously listed integration gaps remain open; these local checks do not authorize unblocking or packaging the production task.

## V6 live-rework evidence and V7 local retest — 2026-09-23

### Production V6 rework (read-only verification)

Remote D1 evidence for task `2b98d2bb-52cf-471d-ad6f-9a2c309a06c3` shows `state=QUALITY_BLOCKED`, `quality_status=BLOCKED`, `retry_count=2`, with the active workflow instance recorded as retry 2 and `updated_at=2026-09-23T10:38:46.109Z`. The last G02 (`product_cad`) attempts were persisted as `REJECTED`, each with the reason `CAD source units are unconfirmed; numeric physical lengths/threads must not be stated`. This is a block, not a completed or accepted task.

The V6 policy provenance records accepted candidates at exactly these seven stages: `intake`/G00, `requirements`/G01, `feasibility`/G03, `vision`/G04, `mechanical`/G05, `electrical`/G06 and `software_mes`/G07. G02 was not accepted, so downstream stages did not complete. Read-only R2 review of the accepted V6 artifacts found:

- **G01 requirements:** provides “industry typical” false-reject/false-accept rates (`≤1%`, `≤0.1%`) and a default `OEE ≥95%` without a cited source; its provenance lists only the task prompt, general rule and uploaded STEP. It also says “assume STEP unit is mm” while the same artifact states `unitStatus=UNCONFIRMED` and that bbox values must not be treated as mm until measurement confirmation. These are unsupported/contradictory claims in a candidate that had `stageContract=PASS`.
- **G04 vision:** avoids labelling the STEP values as mm/inches, but turns the unconfirmed raw coordinate values into quantitative engineering guidance (e.g. “0.2 unit”, “250–400 unit”, ROI/coverage ranges). This candidate was also persisted as `ACCEPTED` under V6. Treating raw CAD coordinates as physical/selection measurements does not establish their physical meaning or justify the resulting camera/lens recommendations.
- **ZIP:** the D1 delivery-package query returns only the prior historical row with status `REJECTED` and `approved_by=null`; no accepted V6 ZIP is evidenced.

| Production evidence | Result |
|---|---|
| V6 same-task rework reaches G02 and blocks | PASS (blocked as intended at G02; not a product-quality PASS) |
| G01 unsupported defaults / contradictory unit assumption absent | FAIL |
| G04 raw unit-coordinate quantities prevented from passing | FAIL |
| Accepted V6 customer ZIP | NOT PRESENT / NOT ACCEPTED |

### Current local V7 focused verification

`src/quality.ts` in the tested checkout declares `GB-ACE-DELIVERY-V7-SOURCE-BOUND-METRICS`. Independent local checks returned:

| Check | Result | Evidence |
|---|---|---|
| Quality and harness tests | PASS | `npx vitest run test/quality.test.ts test/harness.test.ts`: 2 files, 17/17 tests passed. |
| Wrangler types | PASS | `npm run types`: Worker types are up to date. |
| TypeScript | PASS | `npx tsc --noEmit`: exit code 0. |
| Dependency sourcemaps | WARNING | Four `@cloudflare/containers` sourcemap source paths are missing; they were non-fatal. |
| Full suite | NOT RUN by this executor | No claim is made for a full-suite run in this addendum. |
| V7 production deployment/rework, G01/G04 rejection, and ZIP gate | NOT RUN | Local tests do not establish production policy behavior; no deployment/task mutation was performed. |

**Disposition:** V6 production evidence demonstrates that the unit gate blocked the G02 candidate but did not prevent questionable G01 defaults or G04 raw-unit quantitative recommendations from being accepted earlier. V7 local focused tests and types pass, but V7 production remains **NOT RUN**. Keep the production task blocked and do not treat an eventual ZIP as accepted until a controlled V7 deployment/rework proves the G01/G04 issues are rejected and the end-to-end package gate remains closed.

### V7 source-bound-metric follow-up retest — 2026-09-23

The latest local V7 follow-up was independently checked without modifying source or tests. Current targeted fixtures exercise that an industry/default metric with only a fake `RULE-*` citation is rejected while a sentence citing the task prompt input is accepted; reverse-order STEP/mm assumption text is recognized by the unit detector; `0.2 unit` / `250–400 单位` in geometry context are found, while ordinary `units per carton` / `单位预算` and CAD entity counts remain negative examples.

| Check | Result | Evidence |
|---|---|---|
| Quality + harness | PASS | `npx vitest run test/quality.test.ts test/harness.test.ts`: 2 files, 17/17 tests passed. |
| Wrangler types | PASS | `npm run types`: Worker types are up to date. |
| TypeScript | PASS | `npx tsc --noEmit`: exit code 0. |
| Dependency sourcemaps | WARNING | Four missing `@cloudflare/containers` sourcemap source paths; non-fatal. |
| Dedicated inline `INPUT-FILE-*` default-metric fixture | NOT FOUND in the executed focused tests | Source-bound allowed refs are passed from `requiredEvidenceRefs`, but the focused default-metric test explicitly exercises `INPUT-task-prompt`, not a required uploaded-file reference. Add/execute such a case before claiming that exact branch has regression coverage. |
| Full suite / production V7 deploy and same-task rework | NOT RUN | No full-suite run, deploy, or production mutation was performed by this executor. V7 remains a local-only result. |

**Disposition:** The latest local V7 focused checks pass, including the newly reported negative/positive citation and unit-context cases. However, production V7 behavior remains **NOT RUN**, the earlier V6 G01/G04 defects remain confirmed evidence, and no ZIP acceptance is established. Keep delivery blocked pending production rework plus direct evidence that unsupported defaults and raw-unit recommendations cannot pass or reach packaging.

### V7 no-citation-waiver follow-up — 2026-09-23

The latest source change removes inline input citations as an exception for industry/default metrics. Independent local rerun:

| Check | Result | Evidence |
|---|---|---|
| Quality + harness | PASS | `npx vitest run test/quality.test.ts test/harness.test.ts`: 2 files, 17/17 tests passed. The focused quality test now expects a default OEE claim to be rejected both with a fabricated `RULE-*` reference and with an inline `INPUT-task-prompt` reference; the candidate acceptance test also rejects a default industry error-rate even when its evidence list includes `INPUT-task-prompt` and a governed rule. |
| Wrangler types | PASS | `npm run types`: Worker types are up to date. |
| TypeScript | PASS | `npx tsc --noEmit`: exit code 0. |
| Dependency sourcemaps | WARNING | Four missing `@cloudflare/containers` sourcemap source paths; non-fatal. |
| V7 production deployment / same-task G01+G04 retest / ZIP gate | NOT RUN | No deployment or production mutation was performed. |

This policy change makes the previously noted dedicated positive `INPUT-FILE-*` citation fixture unnecessary for the default-metric exception path: neither task-prompt nor uploaded-input citation waives the default/industry metric blocker. Source-grounded, non-default measurements continue to require normal evidence validation. The V6 production defects and lack of ZIP acceptance remain unchanged; V7 production acceptance is still **NOT RUN**.
