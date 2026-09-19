import { isoNow } from "./security";

export type IncidentSeverity = "WARNING" | "ERROR";
export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export async function openWorkflowIncident(
  env: Env,
  input: { taskId: string; code: string; severity: IncidentSeverity; source: string; detail?: Record<string, string | number | boolean | null> },
): Promise<string> {
  const id = crypto.randomUUID();
  const now = isoNow();
  const detail = input.detail ?? {};
  await env.DB.prepare(
    "INSERT INTO workflow_incidents (id, task_id, code, severity, source, status, detail_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)",
  ).bind(id, input.taskId, input.code.slice(0, 160), input.severity, input.source.slice(0, 80), JSON.stringify(detail), now, now).run();
  await sendOpsAlertIfConfigured(env, { id, taskId: input.taskId, code: input.code, severity: input.severity, source: input.source });
  return id;
}

export async function resolveTaskIncidents(env: Env, taskId: string, note: string): Promise<void> {
  const now = isoNow();
  await env.DB.prepare(
    "UPDATE workflow_incidents SET status = 'RESOLVED', resolved_at = ?, updated_at = ?, resolution_note = ? WHERE task_id = ? AND status IN ('OPEN', 'ACKNOWLEDGED')",
  ).bind(now, now, note.slice(0, 500), taskId).run();
}

async function sendOpsAlertIfConfigured(
  env: Env,
  incident: { id: string; taskId: string; code: string; severity: IncidentSeverity; source: string },
): Promise<void> {
  const value = Reflect.get(env as object, "OPS_ALERT_WEBHOOK_URL");
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) return;
  try {
    const response = await fetch(value, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "ace.workflow_incident",
        incident,
        createdAt: isoNow(),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) console.warn(JSON.stringify({ message: "ops_alert_failed", status: response.status, incidentId: incident.id }));
  } catch {
    console.warn(JSON.stringify({ message: "ops_alert_failed", status: "NETWORK_ERROR", incidentId: incident.id }));
  }
}
