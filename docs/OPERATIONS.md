# Workflow Operations Runbook

## 1. Scope

This runbook covers production workflow incidents, automatic retries, manual intervention, and recovery. It does not authorize operators to weaken quality gates or bypass the `R2-F10-GOLDEN-121` delivery validator.

## 2. Incident ledger

Migration `0009_workflow_incidents.sql` adds a persistent D1 incident ledger.

Incident sources currently include:

- `AUTO_RETRY`: a retryable upstream/runtime error was scheduled for another Workflow instance.
- `WORKFLOW_TERMINAL_FAILURE`: execution stopped after the retry policy was exhausted or the error was not retryable.
- `G15_DELIVERY_GATE`: the final Golden-121 package failed a deterministic delivery contract check.

Statuses are:

- `OPEN`: no operator or task owner has accepted recovery responsibility.
- `ACKNOWLEDGED`: an operator acknowledged the incident, or the task owner started controlled rework.
- `RESOLVED`: the incident was explicitly closed, or the task later completed and froze a valid customer package.

A normal stage-level `QUALITY_BLOCKED:<stage>` result is an intentional quality outcome and is not treated as a runtime failure incident. A G15 delivery block is recorded because it affects the final customer package and may require asset-generation repair.

## 3. Operations dashboard

Authorized roles (`reviewer`, `admin`, `system`) can open `/ops.html`.

The dashboard reads:

- `GET /api/ops/health`
- `GET /api/ops/incidents?status=OPEN|ACKNOWLEDGED|RESOLVED|ALL`
- `POST /api/ops/incidents/:id/acknowledge`
- `POST /api/ops/incidents/:id/resolve`

Normal `member` accounts receive HTTP 403 for all operations-ledger endpoints.

The dashboard never returns API keys, user input files, raw prompts, or model reasoning.

## 4. Optional alert webhook

External alerting is disabled unless the secret `OPS_ALERT_WEBHOOK_URL` is configured in the Worker environment.

Configure only through Wrangler secret management:

```powershell
npx wrangler secret put OPS_ALERT_WEBHOOK_URL
```

The alert payload is intentionally limited to incident ID, task ID, code, severity, source, and timestamp. Do not place credentials, customer files, prompts, model output, or signed download URLs in the alert payload.

Webhook delivery failure does not fail the customer workflow. The persistent D1 incident ledger remains the source of truth.

## 5. Recovery behavior

For `FAILED`, `QUALITY_BLOCKED`, and `PACKAGED` tasks the task owner can start controlled rework.

Controlled rework:

1. marks previously accepted artifacts as rejected;
2. rejects the prior frozen package;
3. resets retry counters and the current workflow instance;
4. acknowledges open incidents for the task;
5. rebuilds all stages under the current quality policy;
6. resolves outstanding incidents automatically only after a valid customer package is frozen.

Do not manually mark the task `PACKAGED` or the delivery package `FROZEN`.

## 6. Deployment order

When a release adds or changes D1 migrations, apply migrations before deploying Worker code that depends on those tables.

```powershell
npx wrangler d1 migrations list automation-chief-engineer-cloud --remote
npx wrangler d1 migrations apply automation-chief-engineer-cloud --remote
npx wrangler deploy
```

Before production deploy, the branch must pass:

```powershell
npm ci
npx wrangler types
npx tsc --noEmit
npm test
cmp scripts/validate_r2_f10_golden_delivery.py cadcore/runner/validate_r2_f10_golden_delivery.py
python -m py_compile cadcore/runner/*.py
npm run deploy:dry
```

On Windows, compare the two validator files with a byte-for-byte equivalent command instead of `cmp`.

## 7. Escalation

Escalate for manual engineering review when the same task exhausts both automatic retries, the same G15 code recurs after controlled rework, CADCore reports invalid customer geometry, or delivery validation repeatedly fails on cross-asset consistency.

Operators may acknowledge or resolve incidents, but may not alter evidence, fabricate a missing asset, or relax the Golden-121 validator to make a task appear green.


## 8. GitHub production deploy workflow

The repository includes `.github/workflows/deploy-production.yml` as the preferred production release path.

The workflow is manual-only (`workflow_dispatch`), serialized through the `production-deploy` concurrency group, and requires the exact confirmation string:

`DEPLOY_PRODUCTION`

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow performs, in order:

1. credential presence check;
2. locked dependency install;
3. Wrangler types;
4. TypeScript compile;
5. unit/integration tests;
6. Golden validator parity;
7. CADCore Python compile;
8. production dry-run;
9. remote D1 migration listing;
10. remote D1 migration apply;
11. Wrangler deploy;
12. HTTP smoke checks against `https://zg.gaona.world/` and `/api/me`.

If credentials are missing, the workflow fails before touching D1 or deploying production.
