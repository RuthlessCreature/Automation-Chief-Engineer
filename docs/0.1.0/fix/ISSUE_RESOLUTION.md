# Issue Resolution Handoff — v0.1.0 Static Prototypes

**Fixer decision date:** 2026-09-17 (Asia/Shanghai)  
**Decision boundary:** This handoff assesses only corrected static PNG semantics. QA owns issue closure, retesting, and execution results. The runtime is not implemented and all implementation-dependent verification remains required.

| Issue | Static evidence reviewed | Static UI semantic coverage | Fixer handoff status | Required QA retest and runtime evidence |
|---|---|---|---|---|
| ISSUE-001 — running state falsely looks delivered | `visuals/01-task-command-center-v2-quality-safe.png` (SHA-256 `F10E8B472A53D32E64C0971C336F4C551A577B7183C73C6C1D74ACBA81E157CB`) | A RUNNING 60% demand-engineer state coexists with `预检 6/7`, missing customer evidence `INCOMPLETE`, `PENDING / NOT_READY`, `delivery_allowed = false`, Gate metadata, no-evidence warning, and unavailable delivery package. | **FIXED_FOR_RETEST — design prototype only.** | QA must visually retest this state, then run TC-V-001 on persisted task/Gate records. Show the delivery affordance/API denied for PENDING, missing evidence, or `delivery_allowed=false`; show a distinct eligible state only after an independent Gate PASS. |
| ISSUE-002 — optional role selection appears to remove required stages | `visuals/02-new-task-studio-v2-fixed-plan.png` (SHA-256 `379CE07FF04F423A7EFFEBC9A44F2BE98897A543F0B7AE9467EC39A084B92616`) | The selection area says it is a delivery preference/applicability questionnaire that does not alter the fixed 15-stage plan. The screen displays all 15 locked stages, enumerates N/A record requirements, and blocks plan generation while a preflight blocker remains. | **FIXED_FOR_RETEST — design prototype only.** | QA must visually retest and execute TC-V-002 after implementation. Assert the stored/rendered ExecutionPlan always has 15 stages, and every N/A branch has policy rule, reason, impact/risk, Gate decision, and audit trace. |
| ISSUE-003 — document preview lacks safe-derived-copy/conversion semantics | `visuals/03-artifact-preview-delivery-v2-safe.png` (SHA-256 `B554B904847437BD535AA2A9F8D03651AEC845BE1A16EABB12AE472F53D5A4FB`) | The viewer identifies the `.docx` source/version/run, gives `转换状态：READY`, labels the view as a safe preview copy/PDF derivative, says macros/external links/scripts do not execute, and separates raw original download as requiring authorization. | **FIXED_FOR_RETEST — design prototype only.** | QA must visually retest and execute TC-V-003 across pending, READY, and failed conversion fixtures. Obtain server-side evidence of isolation, no macro/external-link/script execution, and separately RBAC-checked raw-download authorization. |
| ISSUE-004 — no-evidence delivery warning conflicts with enabled ZIP download | `visuals/03-artifact-preview-delivery-v2-safe.png` (SHA-256 `B554B904847437BD535AA2A9F8D03651AEC845BE1A16EABB12AE472F53D5A4FB`) | This is an internally consistent eligible case: `证据齐全，允许交付`, Chief Review PASS, zero blocker, complete manifest, 38/38 matching SHA-256 values, `delivery_allowed=true`, manifest metadata, and authorized short-TTL ZIP download are shown together. | **FIXED_FOR_RETEST — design prototype only.** | QA must visually retest and execute TC-V-004. Exercise score-only, no-evidence, `QUALITY_BLOCKED`, missing-manifest, and hash-mismatch negative cases; the backend must deny downloads unless every required predicate is true. |

## Retest guardrails

1. `FIXED_FOR_RETEST` is not `CLOSED`, `PASS`, or a permission to alter the original QA issue status. `docs/0.1.0/qa/ISSUE_LIST.md` remains the authoritative issue record until QA independently updates it.
2. The reviewed v2 PNGs are static. Their visible state labels and button styling cannot prove client behavior, authorization, persisted event ordering, server truth, security isolation, or integrity enforcement.
3. Per the existing QA run, there is still no runnable application, Worker deployment, test account, preview service, packaging service, or E2E fixture. Accordingly, no E2E result is available from this Fixer pass.

## PNG check commands used by Fixer

```powershell
Add-Type -AssemblyName System.Drawing
Get-FileHash -Algorithm SHA256 -LiteralPath `
  'docs/0.1.0/visuals/01-task-command-center-v2-quality-safe.png', `
  'docs/0.1.0/visuals/02-new-task-studio-v2-fixed-plan.png', `
  'docs/0.1.0/visuals/03-artifact-preview-delivery-v2-safe.png'
```

```powershell
$img = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath 'docs/0.1.0/visuals/01-task-command-center-v2-quality-safe.png'))
try { $img.Width; $img.Height } finally { $img.Dispose() }
```

The dimensions and readable PNG decode were confirmed for all three v2 assets; all are 1672×941 pixels.
# Runtime resolution addendum — 2026-09-18

Resolved in code and deployed: STL MIME accepted and converted through CADCore, Sandbox RPC transport configured, preview stale/raw boundary closed, comparator route/UI added, production browser switching regression covered, and transient retry state recorded. Remaining external-validation items are intentionally open rather than marked PASS.
