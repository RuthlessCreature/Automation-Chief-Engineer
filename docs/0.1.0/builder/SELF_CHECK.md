# Runtime self-check addendum — 2026-09-18

- `npx tsc --noEmit`: PASS.
- `npm test -- --run`: 8 files / 23 tests PASS, including the Stage Harness repair/block/format-error checks, MiniMax think/Markdown JSON normalization, explicit-assumption placeholder normalization, stage-specific delivery-contract rejection, G12 contract prompt, isolated fault-injection provider checks, and upstream timeout conversion.
- `node --check` for app, fast switch, delivery, task admin: PASS.
- `npx wrangler deploy --dry-run`: PASS.
- Production STL smoke reached `G02_STL_INSPECTION / SUCCEEDED / PASS` after pinning Sandbox transport to RPC.
- No live GPT-SOL key was present; comparator correctly reports `REFERENCE_BASELINE`.
- Fault-injected retry recovery remains an explicit staging test, not self-certified as PASS.

## Iteration addendum — generic unconfirmed-CAD-unit gate (2026-09-23)

- `npm test -- --run`: PASS — 11 files / 58 tests.
- `npx tsc --noEmit`: PASS.
- `npm run types` (`wrangler types --check`): PASS.
- `npx wrangler deploy --dry-run`: PASS — configuration/bindings bundle successfully; this is not a production deployment.
- Static wiring review: PASS for the readable-report path — `loadInputDossier` derives `unconfirmedCadUnits` from CADCore `bbox.unitStatus`, `TaskWorkflow.runStage` passes it to `runStageHarness`, and the Harness supplies it to `evaluateCandidate` before candidate acceptance.
- **FAIL — fail-open when CAD evidence is unavailable.** `unconfirmedCadUnits` starts `false` and is set only after a readable report with a non-`CONFIRMED` status. For a CAD input whose report is absent, not yet successful, missing from R2, or unreadable, the dossier emits no-geometry/UNREADABLE text but leaves the flag `false`; numeric physical dimensions are therefore not rejected by this new gate. The rule is not safe to release until this path fails closed or is otherwise authoritatively resolved.
- **FAIL — unit-pattern coverage.** The current regular expression matches examples such as `0.3mm`, `120 mm`, `M6`, `M4×0.7`, and `Ø8`, but JavaScript `\\b` prevents `0.3毫米` from matching; common length forms including `µm`/`μm`, `um`, and `m` are also not covered. These misses permit unsupported length claims when the flag is true.
- The flag is task-wide rather than bound to a particular cited CAD file. This conservatively overblocks claims when any successfully reported CAD input is unconfirmed, but it does not satisfy per-file attribution for multiple inputs; no claim of source-scoped confirmation is made.
- Production deployment, live 5015 rework under V6, malformed/missing-report integration cases, end-to-end downstream propagation, ZIP inspection, and semantic comparison against Golden Samples: **NOT RUN**. No production or artifact-quality PASS is claimed by this self-check.

### Independent re-review — Builder remediation disposition (2026-09-23)

- The two initial P1 findings above are **FIXED by the reviewed diff**: CAD extensions with absent/non-succeeded reports, missing R2 objects, or unreadable report JSON contribute `UNCONFIRMED`; readable reports default missing `unitStatus` to `UNCONFIRMED`. The pattern now catches the tested Chinese `毫米`, `µm`/`μm`, `um`, `m`, metric thread/pitch and diameter examples. This is static/code-and-unit-test evidence, not a production integration result.
- `npx vitest run test/quality.test.ts`: PASS — 1 file / 11 tests.
- `npx tsc --noEmit`: PASS.
- `npm run types` (`wrangler types --check`): PASS.
- **Disposition at that review: FAIL for complete physical-dimension coverage.** Independent probes then returned no match for `2 meters`, `R5`, `r=5`, and an implicit-unit dimension chain such as `2 x 5 x 3`. See the final re-check below for the updated disposition after the additional regex/test change.
- Full suite after Builder's remediation, workflow integration/fault-injection for the unavailable-report branches, production deployment/rework, ZIP inspection, and Golden Sample semantic review: **NOT RUN**. No production, end-to-end, or artifact-quality PASS is claimed.

### Final re-check — prior pattern gaps (2026-09-23)

- The latest regex/test diff closes the previously identified explicit forms: `2 meters`/`metres`, radius `R5`/`r=5`, and three-value dimension chains such as `2 × 5 × 3` are now matched, alongside the earlier Chinese/English metric and imperial units, thread pitches, and diameter callouts.
- `npx vitest run test/quality.test.ts`: PASS — 1 file / 11 tests, including the above examples.
- `npx tsc --noEmit`: PASS. `npm run types` (`wrangler types --check`): PASS.
- **Disposition of the previously reported gaps: FIXED for the explicitly tested patterns.** The regex is still a lexical guard, not an exhaustive engineering-dimension parser; this result does not certify arbitrary notation or semantic correctness.
- Workflow branches for unprocessed/non-succeeded inputs, unreadable reports, and missing R2 report objects were code-reviewed and appear to mark recognized CAD-file extensions as `UNCONFIRMED`; these branches were **NOT integration-tested** or fault-injected.
- Full suite after this latest pattern change, production deployment/rework, ZIP inspection, and Golden Sample semantic review: **NOT RUN**. No production or artifact-quality PASS is claimed.

### Independent V7 review — source-bound default metrics and unit assumptions (2026-09-23)

- `npx vitest run test/quality.test.ts`: PASS — 1 file / 11 tests. `npx tsc --noEmit`: PASS. `npm run types` (`wrangler types --check`): PASS.
- The diff adds a default/industry metric rejection, scans physical-size-like text for raw `unit`/`单位` quantities, and rejects some explicit unit-assumption wording while CAD units remain unconfirmed. The existing Harness → `evaluateCandidate` flag path remains present. These are local checks only; no deployment is implied.
- **Initial V7 review findings (subsequently re-reviewed below):** the default-metric exemption then accepted any inline `INPUT-*` or `RULE-*` token, including a fabricated rule ID; reverse-order unit assumptions were not detected; and broad raw `unit`/`单位` matching risked rejecting ordinary counts.
- **Disposition at initial V7 review: FAIL.** See the remediation re-review below for the status after Builder's follow-up changes.
- Full test suite, integration tests for real evidence/rule resolution and unit-assumption language, production deployment/rework, ZIP inspection, and Golden Sample semantic comparison: **NOT RUN**. No production or artifact-quality PASS is claimed.

### Independent V7 remediation re-review — allowlisted source refs and geometry-scoped raw units (2026-09-23)

- `npx vitest run test/quality.test.ts`: PASS — 1 file / 11 tests. `npx tsc --noEmit`: PASS. `npm run types` (`wrangler types --check`): PASS.
- The previous fabricated/nonexistent `RULE-*` bypass is closed in the reviewed diff: default/industry metric exemptions now require an inline `INPUT-task-prompt` or `INPUT-FILE-*` token present in the supplied input-reference allowlist. Regression cases reject `RULE-DOES-NOT-EXIST` and accept an allowlisted input reference. Rule tokens alone no longer satisfy this condition.
- The reverse-order unit assumption case (`STEP 单位暂按 mm`) is now detected; the regression suite also retains the assumption-first form. Raw `unit`/`单位` size detection is constrained by engineering geometry contexts, and ordinary count controls (`5 units per carton`, `5 个单位预算`) are tested as non-matches. The three V7 mechanical findings are **FIXED for the reviewed cases**.
- **Disposition at that preceding review:** the gate verified only an allowlisted inline reference, not source content. The later focused follow-up below supersedes the citation-waiver behavior by hard-blocking matched default/industry metric phrases regardless of citations; source relevance is still not evaluated or used to grant an exception.
- Full test suite, source-content/relevance integration tests, production deployment/rework, ZIP inspection, and Golden Sample semantic comparison: **NOT RUN**. No production or artifact-quality PASS is claimed.

### Focused V7 follow-up — default metric hard block (2026-09-23)

- `npx vitest run test/quality.test.ts`: PASS — 1 file / 11 tests. `npx tsc --noEmit`: PASS. `npm run types` (`wrangler types --check`): PASS.
- Reviewed the newest `src/quality.ts` diff: matched industry/default numeric metric language is now rejected unconditionally by `UNSOURCED_DEFAULT_METRIC_PATTERN`; citations, including an inline `INPUT-task-prompt`, no longer waive the finding. The previous nonexistent `RULE-*` bypass and unrelated-allowlisted-input waiver are therefore closed for matched phrases. Regression tests assert both cases remain rejected.
- No source-content verification mechanism is present in this change. Current safe behavior is to block matched default/industry metrics even if a source reference appears; it does not selectively allow values proven by source text.
- **Remaining limitation:** this is still a lexical trigger, not semantic recognition of every way to phrase a default/industry value. Unlisted synonyms or wording outside the expression's bounded context may not trigger the hard block. This focused review did not establish exhaustive language coverage.
- Full suite, lexical-coverage expansion/fuzzing, source-content verification implementation, production deployment/rework, ZIP inspection, and Golden Sample semantic comparison: **NOT RUN**. No production or artifact-quality PASS is claimed.
