# Fault-injection retry drill

This drill verifies the background retry policy without ever making a production
MiniMax request fail on purpose. The code refuses to honor `FAULT_INJECTION_SCENARIO`
when `APP_ENV=production`; run it only against a local Worker or an isolated staging
Worker with its own D1 database, R2 bucket, and secrets.

## Scenarios

- `MINIMAX_429_ONCE`: the fixture returns `MINIMAX_HTTP_429` once per task/stage,
  then produces a valid candidate. This validates provider recovery and the gate
  path. Cloudflare Workflow step retries may absorb the error before a task-level
  retry is needed; that is expected.
- `MINIMAX_429_ALWAYS`: every provider call returns `MINIMAX_HTTP_429`. This
  validates the task-level background retry queue, the two-attempt cap, retry
  audit rows, and the final `FAILED` state without charging credits.

## Local run

Start the Worker with the fixture and a non-production environment:

```powershell
npx wrangler dev --local --port 8787 `
  --var APP_ENV:local `
  --var FAULT_INJECTION_PROVIDER:fixture `
  --var FAULT_INJECTION_SCENARIO:MINIMAX_429_ALWAYS
```

On Windows, Wrangler currently refuses local development when the project has
the CADCore container binding (`Local development with containers is currently
not supported on Windows`). Run this command from WSL/Linux, or use an isolated
staging Worker. Do not work around that error by disabling the CADCore binding:
that would no longer be a full workflow drill.

Use a separate browser profile or API client to register/login, create a task
with a prompt of at least 20 characters, and start it. The task API is:

```text
POST /api/auth/register   {"email":"drill-<unique>@example.test","password":"at-least-12-chars"}
POST /api/tasks            {"title":"retry drill","prompt":"验证 429 后台重试与最终失败边界"}
POST /api/tasks/<id>/start
GET  /api/tasks/<id>/retries
GET  /api/tasks/<id>/events
```

Expected `MINIMAX_429_ALWAYS` evidence:

1. The first workflow records a transient `MINIMAX_HTTP_429` failure.
2. A new workflow id is created with attempt 1, then attempt 2 if required.
3. `GET /retries` contains at most two retry rows and the task ends `FAILED`.
4. Credits remain unchanged and the event stream explains each retry and the
   terminal failure.

Repeat with `MINIMAX_429_ONCE` and expect the same task to reach `PACKAGED` or
the next normal quality-gate outcome, with no unbounded retry loop.

## Staging safety checklist

- Set `APP_ENV=staging`, never `production`.
- Use a staging D1 database and R2 bucket; do not point a drill Worker at the
  production bindings.
- Set `FAULT_INJECTION_PROVIDER=fixture`; do not combine a fault scenario with
  a real MiniMax key.
- Delete or soft-delete drill tasks after inspection. The fault marks are scoped
  to the task and are retained only as audit evidence.
- Remove the fault variables before any release deployment and verify the
  production `/api/provider-readiness` response is not in fixture mode.

## Production policy

Production has no fault-injection variables. Even if a variable is accidentally
copied into a production deployment, `src/provider.ts` hard-disables both
scenarios when `APP_ENV=production`. The retry policy itself remains active for
real transient upstream errors and is limited by `MAX_WORKFLOW_RETRIES`.
