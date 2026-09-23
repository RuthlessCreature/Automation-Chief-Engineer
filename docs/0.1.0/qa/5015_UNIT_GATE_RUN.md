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
