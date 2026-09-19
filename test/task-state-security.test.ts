import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { openWorkflowIncident, resolveTaskIncidents } from "../src/incidents";

async function register(email: string): Promise<string> {
  const response = await SELF.fetch("https://worker.test/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "correct-horse-battery-staple" }),
  });
  expect(response.status).toBe(201);
  const cookie = response.headers.get("Set-Cookie");
  expect(cookie).toContain("ace_session=");
  return cookie!.split(";")[0]!;
}

async function createTask(cookie: string, title = "Regression task"): Promise<string> {
  const response = await SELF.fetch("https://worker.test/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      title,
      prompt: "建立一个用于状态机、权限隔离、失败恢复和客户交付下载回归验证的受控工程任务。",
    }),
  });
  expect(response.status).toBe(201);
  const payload = await response.json<{ task: { id: string } }>();
  return payload.task.id;
}

async function seedFrozenDelivery(taskId: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode("controlled-customer-zip");
  const root = `tasks/${taskId}/delivery/test-package`;
  const zipKey = `${root}/customer-delivery.zip`;
  const manifestKey = `${root}/manifest.json`;
  await env.ARTIFACTS.put(zipKey, bytes, { httpMetadata: { contentType: "application/zip" } });
  await env.ARTIFACTS.put(manifestKey, JSON.stringify({ schemaVersion: "test", files: [] }));
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO delivery_packages (id, task_id, status, manifest_key, zip_key, sha256, approved_by, created_at, frozen_at) VALUES (?, ?, 'FROZEN', ?, ?, ?, NULL, ?, ?)",
  ).bind("pkg-" + taskId, taskId, manifestKey, zipKey, "A".repeat(64), now, now).run();
  await env.DB.prepare("UPDATE tasks SET state = 'PACKAGED', quality_status = 'PASS', updated_at = ? WHERE id = ?")
    .bind(now, taskId).run();
  return bytes;
}

describe("task ownership and state-machine regression", () => {
  it("denies another account every task-scoped control and delivery path", async () => {
    const owner = await register("security-owner@example.com");
    const intruder = await register("security-intruder@example.com");
    const taskId = await createTask(owner, "Private task");
    await seedFrozenDelivery(taskId);

    const requests: Array<[string, RequestInit]> = [
      [`/api/tasks/${taskId}`, { method: "GET" }],
      [`/api/tasks/${taskId}/delivery`, { method: "GET" }],
      [`/api/tasks/${taskId}/delivery/download`, { method: "GET" }],
      [`/api/tasks/${taskId}/artifacts`, { method: "GET" }],
      [`/api/tasks/${taskId}/events`, { method: "GET" }],
      [`/api/tasks/${taskId}/retries`, { method: "GET" }],
      [`/api/tasks/${taskId}/rework`, { method: "POST" }],
      [`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Stolen task" }) }],
      [`/api/tasks/${taskId}`, { method: "DELETE" }],
    ];

    for (const [path, init] of requests) {
      const response = await SELF.fetch("https://worker.test" + path, {
        ...init,
        headers: { ...(init.headers ?? {}), Cookie: intruder },
      });
      expect(response.status, `${init.method ?? "GET"} ${path}`).toBe(404);
    }

    const ownerRead = await SELF.fetch(`https://worker.test/api/tasks/${taskId}`, { headers: { Cookie: owner } });
    expect(ownerRead.status).toBe(200);
  });

  it("allows only the owner to download a frozen ZIP and denies rejected delivery", async () => {
    const owner = await register("delivery-owner@example.com");
    const other = await register("delivery-other@example.com");
    const taskId = await createTask(owner, "Delivery task");
    const expected = await seedFrozenDelivery(taskId);

    const delivery = await SELF.fetch(`https://worker.test/api/tasks/${taskId}/delivery`, { headers: { Cookie: owner } });
    const deliveryPayload = await delivery.json<{ delivery: { download_path: string | null } }>();
    expect(deliveryPayload.delivery.download_path).toBe(`/api/tasks/${taskId}/delivery/download`);

    const download = await SELF.fetch(`https://worker.test/api/tasks/${taskId}/delivery/download`, { headers: { Cookie: owner } });
    expect(download.status).toBe(200);
    expect(download.headers.get("Cache-Control")).toBe("private, no-store");
    expect(download.headers.get("Content-Disposition")).toContain(`task-${taskId}.zip`);
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(expected);

    const denied = await SELF.fetch(`https://worker.test/api/tasks/${taskId}/delivery/download`, { headers: { Cookie: other } });
    expect(denied.status).toBe(404);

    await env.DB.prepare("UPDATE delivery_packages SET status = 'REJECTED' WHERE task_id = ?").bind(taskId).run();
    const rejected = await SELF.fetch(`https://worker.test/api/tasks/${taskId}/delivery/download`, { headers: { Cookie: owner } });
    expect(rejected.status).toBe(404);
  });

  it("blocks delete and bulk-delete while any selected task is active", async () => {
    const owner = await register("state-owner@example.com");
    const runningId = await createTask(owner, "Running task");
    const draftId = await createTask(owner, "Draft task");
    await env.DB.prepare("UPDATE tasks SET state = 'RUNNING', updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), runningId).run();

    const single = await SELF.fetch(`https://worker.test/api/tasks/${runningId}`, { method: "DELETE", headers: { Cookie: owner } });
    expect(single.status).toBe(409);

    const bulk = await SELF.fetch("https://worker.test/api/tasks/bulk-delete", {
      method: "POST",
      headers: { Cookie: owner, "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds: [runningId, draftId] }),
    });
    expect(bulk.status).toBe(409);

    const list = await SELF.fetch("https://worker.test/api/tasks", { headers: { Cookie: owner } });
    const payload = await list.json<{ tasks: Array<{ id: string; deleted_at: string | null }> }>();
    expect(payload.tasks.filter((task) => task.id === runningId || task.id === draftId)).toHaveLength(2);
  });

  it("soft-deletes and restores only through the owning account", async () => {
    const owner = await register("restore-owner@example.com");
    const other = await register("restore-other@example.com");
    const taskId = await createTask(owner, "Recoverable task");

    const remove = await SELF.fetch(`https://worker.test/api/tasks/${taskId}`, { method: "DELETE", headers: { Cookie: owner } });
    expect(remove.status).toBe(200);

    const hidden = await SELF.fetch(`https://worker.test/api/tasks/${taskId}`, { headers: { Cookie: owner } });
    expect(hidden.status).toBe(404);

    const deniedRestore = await SELF.fetch(`https://worker.test/api/tasks/${taskId}/restore`, { method: "POST", headers: { Cookie: other } });
    expect(deniedRestore.status).toBe(404);

    const restore = await SELF.fetch(`https://worker.test/api/tasks/${taskId}/restore`, { method: "POST", headers: { Cookie: owner } });
    expect(restore.status).toBe(200);

    const visible = await SELF.fetch(`https://worker.test/api/tasks/${taskId}`, { headers: { Cookie: owner } });
    expect(visible.status).toBe(200);
  });
  it("serves Golden-121 safe previews only from a frozen owned delivery", async () => {
    const owner = await register("preview-owner@example.com");
    const taskId = await createTask(owner, "Preview task");
    await seedFrozenDelivery(taskId);

    const storageKey = `tasks/${taskId}/artifacts/requirements/preview.md`;
    await env.ARTIFACTS.put(storageKey, "功能需求、性能需求、接口需求与待验证假设。");
    await env.DB.prepare(
      "INSERT INTO artifacts (id, task_id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at, visibility) VALUES (?, ?, 'requirements', 'stage-report', ?, ?, ?, 'ACCEPTED', ?, ?, 'INTERNAL')",
    ).bind(
      "artifact-" + taskId,
      taskId,
      "需求工程",
      storageKey,
      "B".repeat(64),
      JSON.stringify({ provider: "fixture", model: "fixture-v1", evidence: ["INPUT-task-prompt", "RULE-G01"] }),
      new Date().toISOString(),
    ).run();

    const wordPreview = await SELF.fetch(
      `https://worker.test/api/tasks/${taskId}/delivery/preview?asset=technical-solution`,
      { headers: { Cookie: owner } },
    );
    expect(wordPreview.status).toBe(200);
    expect(wordPreview.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(wordPreview.headers.get("X-Preview-Source")).toBe("GOLDEN-121 技术方案书.docx");
    expect(await wordPreview.text()).toContain("需求工程");

    const xlsxPreview = await SELF.fetch(
      `https://worker.test/api/tasks/${taskId}/delivery/preview?asset=engineering-data`,
      { headers: { Cookie: owner } },
    );
    expect(xlsxPreview.status).toBe(200);
    expect(xlsxPreview.headers.get("X-Preview-Source")).toBe("GOLDEN-121 工程数据包.xlsx");

    const invalid = await SELF.fetch(
      `https://worker.test/api/tasks/${taskId}/delivery/preview?asset=../../secret`,
      { headers: { Cookie: owner } },
    );
    expect(invalid.status).toBe(400);
  });

});


describe("workflow incident operations", () => {
  it("keeps the operations ledger private from normal members", async () => {
    const member = await register("ops-member@example.com");
    const health = await SELF.fetch("https://worker.test/api/ops/health", { headers: { Cookie: member } });
    expect(health.status).toBe(403);
    const incidents = await SELF.fetch("https://worker.test/api/ops/incidents", { headers: { Cookie: member } });
    expect(incidents.status).toBe(403);
  });

  it("allows an admin to acknowledge and resolve an incident", async () => {
    const email = "ops-admin@example.com";
    const admin = await register(email);
    const user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
    expect(user?.id).toBeTruthy();
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user!.id).run();
    const taskId = await createTask(admin, "Ops incident task");
    const incidentId = await openWorkflowIncident(env, {
      taskId,
      code: "UPSTREAM_TIMEOUT",
      severity: "ERROR",
      source: "TEST",
      detail: { retryExhausted: true },
    });

    const health = await SELF.fetch("https://worker.test/api/ops/health", { headers: { Cookie: admin } });
    expect(health.status).toBe(200);
    const open = await SELF.fetch("https://worker.test/api/ops/incidents?status=OPEN", { headers: { Cookie: admin } });
    const payload = await open.json<{ incidents: Array<{ id: string; task_id: string }> }>();
    expect(payload.incidents).toEqual(expect.arrayContaining([expect.objectContaining({ id: incidentId, task_id: taskId })]));

    const ack = await SELF.fetch(`https://worker.test/api/ops/incidents/${incidentId}/acknowledge`, {
      method: "POST",
      headers: { Cookie: admin },
    });
    expect(ack.status).toBe(200);

    const resolved = await SELF.fetch(`https://worker.test/api/ops/incidents/${incidentId}/resolve`, {
      method: "POST",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ note: "人工复核后恢复完成。" }),
    });
    expect(resolved.status).toBe(200);
    const row = await env.DB.prepare("SELECT status, acknowledged_by, resolution_note FROM workflow_incidents WHERE id = ?")
      .bind(incidentId).first<{ status: string; acknowledged_by: string; resolution_note: string }>();
    expect(row).toMatchObject({ status: "RESOLVED", acknowledged_by: user!.id, resolution_note: "人工复核后恢复完成。" });
  });

  it("closes outstanding incidents when a task recovers", async () => {
    const owner = await register("ops-recovery@example.com");
    const taskId = await createTask(owner, "Recovered task");
    await openWorkflowIncident(env, { taskId, code: "MINIMAX_HTTP_429", severity: "WARNING", source: "AUTO_RETRY" });
    await openWorkflowIncident(env, { taskId, code: "UPSTREAM_TIMEOUT", severity: "ERROR", source: "WORKFLOW_TERMINAL_FAILURE" });
    await resolveTaskIncidents(env, taskId, "Golden-121 package frozen.");

    const rows = await env.DB.prepare("SELECT status, resolution_note FROM workflow_incidents WHERE task_id = ?")
      .bind(taskId).all<{ status: string; resolution_note: string }>();
    expect(rows.results).toHaveLength(2);
    expect(rows.results.every((row) => row.status === "RESOLVED")).toBe(true);
    expect(rows.results.every((row) => row.resolution_note === "Golden-121 package frozen.")).toBe(true);
  });
});
