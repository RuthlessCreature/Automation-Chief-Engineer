import type { TaskState } from "./domain";
import { inspectCadInCadcore } from "./cadcore";
import { compareArtifactToGolden, evaluateGptSolCandidate } from "./golden";
import { sha256 } from "./quality";
import { providerReadiness } from "./provider";
import { clearSessionCookie, hashPassword, isLocalEnvironment, isoNow, readCookie, sessionCookie, verifyPassword } from "./security";
import type { TaskCoordinator } from "./task-coordinator";
import { buildSafeHtmlPreview, buildSafeXlsxHtmlPreview } from "./package";

type UserRow = { id: string; email: string; credits: number; role: string };
type LoginRow = UserRow & { password_salt: string; password_hash: string };
type TaskRow = {
  id: string;
  owner_id: string;
  title: string;
  prompt: string;
  state: TaskState;
  quality_status: "PENDING" | "PASS" | "BLOCKED";
  workflow_instance_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
type ArtifactRow = { id: string; task_id: string; stage_id: string; title: string; storage_key: string; sha256: string; status: string; provenance_json: string; visibility: "INTERNAL" | "PREVIEW_DERIVATIVE" | "CUSTOMER_DELIVERY"; created_at: string };
type InputRow = { id: string; task_id: string; original_name: string; content_type: string; size_bytes: number; sha256: string; intake_status: "STAGED_FORMAT_VALIDATED" | "REJECTED"; created_at: string };
type CadInputRow = InputRow & { storage_key: string };
type CadJobRow = { id: string; task_id: string; input_id: string; kind: string; status: string; report_storage_key: string | null; normalized_brep_key: string | null; error_code: string | null; engine_json?: string; created_at: string; started_at: string | null; completed_at: string | null };
type DeliveryRow = { id: string; task_id: string; status: "ASSEMBLING" | "FROZEN" | "REJECTED"; manifest_key: string; zip_key: string | null; sha256: string | null; approved_by: string | null; created_at: string; frozen_at: string | null };

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...jsonHeaders, ...headers } });
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > 24_000) throw new HttpError(413, "请求体超过当前接口上限。");
  let value: unknown;
  try {
    value = await request.json<unknown>();
  } catch {
    throw new HttpError(400, "请求体必须是 JSON。");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "请求体结构无效。");
  return value as Record<string, unknown>;
}

function textField(body: Record<string, unknown>, name: string, min: number, max: number): string {
  const value = body[name];
  if (typeof value !== "string") throw new HttpError(400, `${name} 必须是文本。`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new HttpError(400, `${name} 长度必须为 ${min}–${max}。`);
  return normalized;
}

async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
  const sessionId = readCookie(request, "ace_session");
  if (!sessionId) return null;
  const user = await env.DB.prepare(
    "SELECT u.id, u.email, u.credits, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?",
  )
    .bind(sessionId, isoNow())
    .first<UserRow>();
  return user ?? null;
}

async function requireUser(request: Request, env: Env): Promise<UserRow> {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, "请先登录。");
  return user;
}

function requireOpsRole(user: UserRow): void {
  if (!["reviewer", "admin", "system"].includes(user.role)) throw new HttpError(403, "该账号无权访问运维事件台账。");
}

async function requireTaskOwner(env: Env, userId: string, taskId: string): Promise<TaskRow> {
  const task = await env.DB.prepare("SELECT * FROM tasks WHERE id = ? AND owner_id = ? AND deleted_at IS NULL")
    .bind(taskId, userId)
    .first<TaskRow>();
  if (!task) throw new HttpError(404, "任务不存在或无权访问。");
  return task;
}

async function requireDeletedTaskOwner(env: Env, userId: string, taskId: string): Promise<TaskRow> {
  const task = await env.DB.prepare("SELECT * FROM tasks WHERE id = ? AND owner_id = ? AND deleted_at IS NOT NULL")
    .bind(taskId, userId)
    .first<TaskRow>();
  if (!task) throw new HttpError(404, "已删除任务不存在或无权恢复。");
  return task;
}

function audit(env: Env, action: string, actorId: string | null, taskId: string | null, detail: Record<string, string | number | boolean>): Promise<D1Result<unknown>> {
  return env.DB.prepare("INSERT INTO audit_events (id, task_id, actor_id, action, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), taskId, actorId, action, JSON.stringify(detail), isoNow())
    .run();
}

function pathParts(pathname: string): string[] {
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

const acceptedInputTypes = new Set([
  "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "application/json", "image/png", "image/jpeg", "image/webp",
  "model/step", "model/stl", "application/step", "application/sla",
]);

function safeInputName(value: string | null): string {
  if (!value) throw new HttpError(400, "缺少 X-File-Name 上传文件名。");
  const normalized = value.normalize("NFKC").replace(/[\\/:*?\"<>|\u0000-\u001F]/g, "_").trim();
  if (!normalized || normalized.length > 180 || normalized === "." || normalized === "..") throw new HttpError(400, "文件名无效。");
  return normalized;
}

async function readUpload(request: Request): Promise<{ bytes: ArrayBuffer; contentType: string; originalName: string }> {
  const advertisedContentType = (request.headers.get("Content-Type") ?? "application/octet-stream").split(";", 1)[0]!.toLowerCase();
  const originalName = safeInputName(request.headers.get("X-File-Name"));
  const extensionType: Record<string, string> = { ".stl": "model/stl", ".step": "model/step", ".stp": "model/step" };
  const inferredType = extensionType[originalName.slice(originalName.lastIndexOf(".")).toLowerCase()];
  const contentType = acceptedInputTypes.has(advertisedContentType) ? advertisedContentType : inferredType;
  if (!contentType) throw new HttpError(415, "当前仅允许受控文档、表格、演示、文本、图像和 CAD 交换格式。");
  const advertisedLength = Number(request.headers.get("Content-Length") ?? "0");
  if (advertisedLength > 10 * 1024 * 1024) throw new HttpError(413, "单个输入文件暂限 10 MiB。");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) throw new HttpError(400, "不接受空文件。");
  if (bytes.byteLength > 10 * 1024 * 1024) throw new HttpError(413, "单个输入文件暂限 10 MiB。");
  return { bytes, contentType, originalName };
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = pathParts(url.pathname);
  const taskId = parts[2];
  const method = request.method;

  if (method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readBody(request);
    const email = textField(body, "email", 5, 254).toLowerCase();
    const password = textField(body, "password", 12, 256);
    if (!email.includes("@")) throw new HttpError(400, "email 格式无效。");
    const passwordRecord = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = isoNow();
    try {
      await env.DB.prepare("INSERT INTO users (id, email, password_salt, password_hash, credits, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(userId, email, passwordRecord.salt, passwordRecord.hash, 250, "member", now)
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE")) throw new HttpError(409, "该邮箱已注册。");
      throw error;
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
    const sessionId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(sessionId, userId, expiresAt.toISOString(), now)
      .run();
    await audit(env, "USER_REGISTERED", userId, null, { credits: 250 });
    return json({ user: { id: userId, email, credits: 250, role: "member" } }, 201, { "Set-Cookie": sessionCookie(sessionId, expiresAt, !isLocalEnvironment(env)) });
  }

  if (method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(request);
    const email = textField(body, "email", 5, 254).toLowerCase();
    const password = textField(body, "password", 1, 256);
    const row = await env.DB.prepare("SELECT id, email, credits, role, password_salt, password_hash FROM users WHERE email = ?")
      .bind(email)
      .first<LoginRow>();
    if (!row || !(await verifyPassword(password, row.password_salt, row.password_hash))) throw new HttpError(401, "邮箱或密码不正确。");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
    const sessionId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(sessionId, row.id, expiresAt.toISOString(), isoNow())
      .run();
    await audit(env, "USER_LOGGED_IN", row.id, null, {});
    return json({ user: { id: row.id, email: row.email, credits: row.credits, role: row.role } }, 200, { "Set-Cookie": sessionCookie(sessionId, expiresAt, !isLocalEnvironment(env)) });
  }

  if (method === "POST" && url.pathname === "/api/auth/logout") {
    const sessionId = readCookie(request, "ace_session");
    if (sessionId) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(!isLocalEnvironment(env)) });
  }

  if (method === "GET" && url.pathname === "/api/me") {
    const user = await currentUser(request, env);
    return json({ user });
  }

  const user = await requireUser(request, env);

  if (method === "GET" && url.pathname === "/api/ops/health") {
    requireOpsRole(user);
    const taskStates = await env.DB.prepare(
      "SELECT state, COUNT(*) AS count FROM tasks WHERE deleted_at IS NULL GROUP BY state",
    ).all<{ state: string; count: number }>();
    const incidentStates = await env.DB.prepare(
      "SELECT status, severity, COUNT(*) AS count FROM workflow_incidents GROUP BY status, severity",
    ).all<{ status: string; severity: string; count: number }>();
    const retryStats = await env.DB.prepare(
      "SELECT status, COUNT(*) AS count FROM workflow_retry_attempts GROUP BY status",
    ).all<{ status: string; count: number }>();
    return json({
      generatedAt: isoNow(),
      tasks: taskStates.results,
      incidents: incidentStates.results,
      retries: retryStats.results,
    });
  }

  if (method === "GET" && url.pathname === "/api/ops/incidents") {
    requireOpsRole(user);
    const requestedStatus = (url.searchParams.get("status") ?? "OPEN").toUpperCase();
    if (!["OPEN", "ACKNOWLEDGED", "RESOLVED", "ALL"].includes(requestedStatus)) throw new HttpError(400, "status 必须为 OPEN、ACKNOWLEDGED、RESOLVED 或 ALL。");
    const limit = Math.max(1, Math.min(200, Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100));
    const query = requestedStatus === "ALL"
      ? "SELECT i.*, t.title AS task_title, t.state AS task_state FROM workflow_incidents i JOIN tasks t ON t.id = i.task_id ORDER BY i.created_at DESC LIMIT ?"
      : "SELECT i.*, t.title AS task_title, t.state AS task_state FROM workflow_incidents i JOIN tasks t ON t.id = i.task_id WHERE i.status = ? ORDER BY i.created_at DESC LIMIT ?";
    const incidents = requestedStatus === "ALL"
      ? await env.DB.prepare(query).bind(limit).all()
      : await env.DB.prepare(query).bind(requestedStatus, limit).all();
    return json({ incidents: incidents.results, status: requestedStatus, limit });
  }

  if (method === "POST" && parts.length === 5 && parts[0] === "api" && parts[1] === "ops" && parts[2] === "incidents" && parts[4] === "acknowledge") {
    requireOpsRole(user);
    const incidentId = parts[3]!;
    const now = isoNow();
    const result = await env.DB.prepare(
      "UPDATE workflow_incidents SET status = 'ACKNOWLEDGED', acknowledged_at = ?, acknowledged_by = ?, updated_at = ? WHERE id = ? AND status = 'OPEN'",
    ).bind(now, user.id, now, incidentId).run();
    if (!result.meta.changes) throw new HttpError(404, "开放运维事件不存在或已被处理。");
    await audit(env, "WORKFLOW_INCIDENT_ACKNOWLEDGED", user.id, null, { incidentId });
    return json({ incidentId, status: "ACKNOWLEDGED", acknowledgedAt: now });
  }

  if (method === "POST" && parts.length === 5 && parts[0] === "api" && parts[1] === "ops" && parts[2] === "incidents" && parts[4] === "resolve") {
    requireOpsRole(user);
    const incidentId = parts[3]!;
    const body = await readBody(request);
    const note = textField(body, "note", 3, 500);
    const now = isoNow();
    const result = await env.DB.prepare(
      "UPDATE workflow_incidents SET status = 'RESOLVED', resolved_at = ?, updated_at = ?, resolution_note = ? WHERE id = ? AND status IN ('OPEN', 'ACKNOWLEDGED')",
    ).bind(now, now, note, incidentId).run();
    if (!result.meta.changes) throw new HttpError(404, "运维事件不存在或已经关闭。");
    await audit(env, "WORKFLOW_INCIDENT_RESOLVED", user.id, null, { incidentId, noteLength: note.length });
    return json({ incidentId, status: "RESOLVED", resolvedAt: now });
  }

  if (method === "GET" && url.pathname === "/api/tasks") {
    const tasks = await env.DB.prepare("SELECT * FROM tasks WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100")
      .bind(user.id)
      .all<TaskRow>();
    return json({ tasks: tasks.results });
  }

  if (method === "POST" && url.pathname === "/api/tasks") {
    const body = await readBody(request);
    const title = textField(body, "title", 3, 120);
    const prompt = textField(body, "prompt", 20, 12_000);
    const taskId = crypto.randomUUID();
    const now = isoNow();
    await env.DB.prepare("INSERT INTO tasks (id, owner_id, title, prompt, state, created_at, updated_at) VALUES (?, ?, ?, ?, 'DRAFT', ?, ?)")
      .bind(taskId, user.id, title, prompt, now, now)
      .run();
    await audit(env, "TASK_CREATED", user.id, taskId, { creditsCharged: false });
    return json({ task: { id: taskId, title, prompt, state: "DRAFT", quality_status: "PENDING", created_at: now, updated_at: now } }, 201);
  }

  if (method === "PATCH" && taskId && parts.length === 3 && parts[0] === "api" && parts[1] === "tasks") {
    const task = await requireTaskOwner(env, user.id, taskId);
    const body = await readBody(request);
    const title = textField(body, "title", 3, 120);
    await env.DB.prepare("UPDATE tasks SET title = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND deleted_at IS NULL")
      .bind(title, isoNow(), task.id, user.id)
      .run();
    await audit(env, "TASK_RENAMED", user.id, task.id, { titleLength: title.length });
    return json({ task: { ...task, title, updated_at: isoNow() } });
  }

  if (method === "DELETE" && taskId && parts.length === 3 && parts[0] === "api" && parts[1] === "tasks") {
    const task = await requireTaskOwner(env, user.id, taskId);
    if (["QUEUED", "RUNNING", "PACKAGING"].includes(task.state)) throw new HttpError(409, "运行中的任务不能删除，请等待工作流停止或完成。");
    const deletedAt = isoNow();
    await env.DB.prepare("UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND deleted_at IS NULL")
      .bind(deletedAt, deletedAt, task.id, user.id)
      .run();
    await audit(env, "TASK_SOFT_DELETED", user.id, task.id, { recoverable: true });
    return json({ deleted: true, recoverable: true, taskId: task.id });
  }

  if (method === "POST" && taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "restore") {
    const task = await requireDeletedTaskOwner(env, user.id, taskId);
    const restoredAt = isoNow();
    await env.DB.prepare("UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ? AND owner_id = ? AND deleted_at IS NOT NULL")
      .bind(restoredAt, task.id, user.id)
      .run();
    await audit(env, "TASK_RESTORED", user.id, task.id, { recoverable: true });
    return json({ restored: true, taskId: task.id });
  }

  if (method === "POST" && url.pathname === "/api/tasks/bulk-delete") {
    const body = await readBody(request);
    const rawIds = body.taskIds;
    if (!Array.isArray(rawIds) || rawIds.length < 1 || rawIds.length > 50 || !rawIds.every((value) => typeof value === "string" && value.length >= 10 && value.length <= 80)) {
      throw new HttpError(400, "taskIds 必须是 1–50 个有效任务 ID。");
    }
    const uniqueIds = [...new Set(rawIds as string[])];
    const tasks = await env.DB.prepare(`SELECT id, state FROM tasks WHERE owner_id = ? AND deleted_at IS NULL AND id IN (${uniqueIds.map(() => "?").join(",")})`)
      .bind(user.id, ...uniqueIds)
      .all<{ id: string; state: TaskState }>();
    const blocked = tasks.results.filter((task) => ["QUEUED", "RUNNING", "PACKAGING"].includes(task.state));
    if (blocked.length) throw new HttpError(409, `有 ${blocked.length} 个任务仍在运行，不能批量删除。`);
    const deletedAt = isoNow();
    await env.DB.prepare(`UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE owner_id = ? AND deleted_at IS NULL AND id IN (${uniqueIds.map(() => "?").join(",")})`)
      .bind(deletedAt, deletedAt, user.id, ...uniqueIds)
      .run();
    await Promise.all(tasks.results.map((task) => audit(env, "TASK_SOFT_DELETED", user.id, task.id, { recoverable: true, bulk: true })));
    return json({ deleted: tasks.results.length, recoverable: true, taskIds: tasks.results.map((task) => task.id) });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "inputs" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const inputs = await env.DB.prepare("SELECT id, task_id, original_name, content_type, size_bytes, sha256, intake_status, created_at FROM task_inputs WHERE task_id = ? ORDER BY created_at ASC")
      .bind(taskId)
      .all<InputRow>();
    return json({ inputs: inputs.results });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "inputs" && method === "POST") {
    const task = await requireTaskOwner(env, user.id, taskId);
    if (task.state !== "DRAFT") throw new HttpError(409, "仅草稿任务可追加输入资料。");
    const upload = await readUpload(request);
    const inputId = crypto.randomUUID();
    const hash = await sha256(upload.bytes);
    const storageKey = `tasks/${task.id}/inputs/${inputId}/${upload.originalName}`;
    await env.ARTIFACTS.put(storageKey, upload.bytes, {
      httpMetadata: { contentType: upload.contentType, contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(upload.originalName)}` },
      customMetadata: { taskId: task.id, inputId, sha256: hash, classification: "INTERNAL_INPUT" },
    });
    await env.DB.prepare("INSERT INTO task_inputs (id, task_id, uploaded_by, original_name, content_type, size_bytes, storage_key, sha256, intake_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(inputId, task.id, user.id, upload.originalName, upload.contentType, upload.bytes.byteLength, storageKey, hash, "STAGED_FORMAT_VALIDATED", isoNow())
      .run();
    await audit(env, "TASK_INPUT_STAGED", user.id, task.id, { sizeBytes: upload.bytes.byteLength, formatValidated: true, antivirusScanned: false });
    return json({ input: { id: inputId, original_name: upload.originalName, content_type: upload.contentType, size_bytes: upload.bytes.byteLength, sha256: hash, intake_status: "STAGED_FORMAT_VALIDATED" } }, 201);
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "cad-inspections" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const jobs = await env.DB.prepare("SELECT id, task_id, input_id, kind, status, report_storage_key, normalized_brep_key, error_code, created_at, started_at, completed_at FROM cad_jobs WHERE task_id = ? ORDER BY created_at DESC")
      .bind(taskId)
      .all<CadJobRow>();
    return json({ jobs: jobs.results });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "cad-inspections" && method === "POST") {
    const task = await requireTaskOwner(env, user.id, taskId);
    if (task.state !== "DRAFT") throw new HttpError(409, "仅草稿任务可启动独立 CAD 检查。");
    const body = await readBody(request);
    const inputId = textField(body, "inputId", 1, 100);
    const input = await env.DB.prepare("SELECT id, task_id, original_name, content_type, size_bytes, storage_key, sha256, intake_status, created_at FROM task_inputs WHERE id = ? AND task_id = ?")
      .bind(inputId, taskId)
      .first<CadInputRow>();
    if (!input) throw new HttpError(404, "CAD 输入不存在或不属于该任务。");
    const isStl = /\.stl$/i.test(input.original_name);
    const kind = isStl ? "G02_STL_INSPECTION" : /\.(step|stp)$/i.test(input.original_name) ? "G02_STEP_INSPECTION" : null;
    if (!kind) throw new HttpError(415, "G02 检查只接受已暂存的 STEP/STP 或 STL 输入。");
    const existing = await env.DB.prepare("SELECT id, task_id, input_id, kind, status, report_storage_key, normalized_brep_key, error_code, engine_json, created_at, started_at, completed_at FROM cad_jobs WHERE task_id = ? AND input_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1")
      .bind(taskId, input.id, kind)
      .first<CadJobRow>();
    if (existing?.status === "RUNNING" || existing?.status === "QUEUED") throw new HttpError(409, "该 CAD 输入正在受控检查中。");
    if (existing?.status === "SUCCEEDED" || existing?.status === "BLOCKED") return json({ job: existing, reused: true });

    const jobId = crypto.randomUUID();
    const startedAt = isoNow();
    await env.DB.prepare("INSERT INTO cad_jobs (id, task_id, input_id, kind, status, engine_json, created_at, started_at) VALUES (?, ?, ?, ?, 'RUNNING', ?, ?, ?)")
      .bind(jobId, taskId, input.id, kind, JSON.stringify({ runtime: "cadcore-runner", occt: "7.9.3.1.1", meshToBrep: isStl }), startedAt, startedAt)
      .run();
    await audit(env, "CAD_G02_STARTED", user.id, taskId, { inputId: input.id, creditsCharged: false });
    try {
      const result = await inspectCadInCadcore(env, { id: input.id, taskId, originalName: input.original_name, storageKey: input.storage_key, sha256: input.sha256 });
      const reportArtifactId = crypto.randomUUID();
      const brepArtifactId = crypto.randomUUID();
      const completedAt = isoNow();
      await env.DB.batch([
        env.DB.prepare("UPDATE cad_jobs SET status = 'SUCCEEDED', report_storage_key = ?, normalized_brep_key = ?, completed_at = ? WHERE id = ?")
          .bind(result.reportKey, result.normalizedBrepKey, completedAt, jobId),
        env.DB.prepare("INSERT INTO artifacts (id, task_id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at, visibility) VALUES (?, ?, 'product_cad', ?, ?, ?, ?, 'ACCEPTED', ?, ?, 'INTERNAL')")
          .bind(reportArtifactId, taskId, "cad-g02-report", `G02｜${isStl ? "STL 网格几何" : "STEP"} 检查报告`, result.reportKey, result.reportSha256, JSON.stringify({ cadJobId: jobId, inputId: input.id, gate: "G02", report: result.report }), completedAt),
        env.DB.prepare("INSERT INTO artifacts (id, task_id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at, visibility) VALUES (?, ?, 'product_cad', ?, ?, ?, ?, 'ACCEPTED', ?, ?, 'INTERNAL')")
          .bind(brepArtifactId, taskId, "normalized-brep", "G02｜规范化 BREP（内部）", result.normalizedBrepKey, result.normalizedBrepSha256, JSON.stringify({ cadJobId: jobId, inputId: input.id, gate: "G02", sourceSha256: input.sha256 }), completedAt),
      ]);
      await audit(env, "CAD_G02_SUCCEEDED", user.id, taskId, { inputId: input.id, creditsCharged: false });
      return json({ job: { id: jobId, status: "SUCCEEDED", report: result.report, reportArtifactId, brepArtifactId } }, 201);
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 100) : "CADCORE_UNKNOWN_FAILURE";
      await env.DB.prepare("UPDATE cad_jobs SET status = 'BLOCKED', error_code = ?, completed_at = ? WHERE id = ?")
        .bind(code, isoNow(), jobId)
        .run();
      await audit(env, "CAD_G02_BLOCKED", user.id, taskId, { inputId: input.id, creditsCharged: false });
      throw new HttpError(422, `G02 CAD 检查未通过（${code}）。`);
    }
  }

  if (taskId && parts.length === 3 && parts[0] === "api" && parts[1] === "tasks" && method === "GET") {
    const task = await requireTaskOwner(env, user.id, taskId);
    return json({ task });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "delivery" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const delivery = await env.DB.prepare("SELECT id, task_id, status, manifest_key, zip_key, sha256, approved_by, created_at, frozen_at FROM delivery_packages WHERE task_id = ?")
      .bind(taskId)
      .first<DeliveryRow>();
    if (!delivery) return json({ delivery: null });
    const artifactCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM artifacts WHERE task_id = ? AND status = 'ACCEPTED'")
      .bind(taskId)
      .first<{ count: number }>();
    return json({ delivery: { ...delivery, artifact_count: Number(artifactCount?.count ?? 0), download_path: delivery.status === "FROZEN" && delivery.zip_key ? `/api/tasks/${taskId}/delivery/download` : null } });
  }

  if (taskId && parts.length === 5 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "delivery" && parts[4] === "preview" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const requestedAsset = url.searchParams.get("asset") ?? url.searchParams.get("file");
    const previewSpec = requestedAsset === "technical-solution" || requestedAsset === "方案总册.docx"
      ? { previewName: "golden-technical-solution.html", sourceFile: "GOLDEN-121 技术方案书.docx", kind: "docx" as const }
      : requestedAsset === "engineering-data" || requestedAsset === "受控产出清单.xlsx"
        ? { previewName: "golden-engineering-data.html", sourceFile: "GOLDEN-121 工程数据包.xlsx", kind: "xlsx" as const }
        : null;
    if (!previewSpec) throw new HttpError(400, "只允许预览已冻结 Golden-121 交付包中的受控 Office 派生副本。");
    const { previewName, sourceFile } = previewSpec;
    const delivery = await env.DB.prepare("SELECT status, manifest_key, zip_key FROM delivery_packages WHERE task_id = ?")
      .bind(taskId).first<Pick<DeliveryRow, "status" | "manifest_key" | "zip_key">>();
    if (!delivery || delivery.status !== "FROZEN" || !delivery.zip_key) throw new HttpError(404, "客户 ZIP 尚未冻结。");
    const previewKey = `${delivery.manifest_key.replace(/\/manifest\.json$/, "")}/previews/${previewName}`;
    let preview = await env.ARTIFACTS.get(previewKey);
    if (!preview) {
      // Backfill safe derivatives for packages frozen before the preview feature
      // was deployed; the original Office/ZIP bytes are never exposed here.
      const task = await env.DB.prepare("SELECT title FROM tasks WHERE id = ?").bind(taskId).first<{ title: string }>();
      const artifacts = await env.DB.prepare("SELECT stage_id, title, storage_key, sha256, provenance_json FROM artifacts WHERE task_id = ? AND status = 'ACCEPTED' ORDER BY created_at ASC")
        .bind(taskId).all<{ stage_id: string; title: string; storage_key: string; sha256: string; provenance_json: string }>();
      const reports: Array<{ stageId: string; title: string; body: string }> = [];
      const rows: Array<{ stageId: string; title: string; sha256: string; provider: string; model: string }> = [];
      for (const artifact of artifacts.results) {
        const source = await env.ARTIFACTS.get(artifact.storage_key);
        if (!source) continue;
        const provenance = JSON.parse(artifact.provenance_json) as { provider?: string; model?: string };
        reports.push({ stageId: artifact.stage_id, title: artifact.title, body: await source.text() });
        rows.push({ stageId: artifact.stage_id, title: artifact.title, sha256: artifact.sha256, provider: provenance.provider ?? "unknown", model: provenance.model ?? "unknown" });
      }
      const bytes = previewSpec.kind === "docx" ? buildSafeHtmlPreview(task?.title ?? "受控技术方案", reports) : buildSafeXlsxHtmlPreview(rows);
      await env.ARTIFACTS.put(previewKey, bytes, { httpMetadata: { contentType: "text/html; charset=utf-8" }, customMetadata: { taskId, sourceFile, security: "safe-derived-no-script" } });
      preview = await env.ARTIFACTS.get(previewKey);
    }
    if (!preview) throw new HttpError(404, "安全预览副本不存在。");
    return new Response(preview.body, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'", "X-Preview-Source": sourceFile, "Cache-Control": "private, no-store" } });
  }

  if (taskId && parts.length === 5 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "delivery" && parts[4] === "download" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const delivery = await env.DB.prepare("SELECT id, task_id, status, manifest_key, zip_key, sha256, approved_by, created_at, frozen_at FROM delivery_packages WHERE task_id = ?")
      .bind(taskId)
      .first<DeliveryRow>();
    if (!delivery || delivery.status !== "FROZEN" || !delivery.zip_key || !delivery.sha256) throw new HttpError(404, "客户 ZIP 尚未冻结。");
    const object = await env.ARTIFACTS.get(delivery.zip_key);
    if (!object) throw new HttpError(404, "客户 ZIP 存储对象不存在。");
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType ?? "application/zip",
        "Content-Disposition": `attachment; filename="task-${taskId}.zip"`,
        "Cache-Control": "private, no-store",
        "X-Delivery-Sha256": delivery.sha256,
      },
    });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "start" && method === "POST") {
    const task = await requireTaskOwner(env, user.id, taskId);
    if (task.state !== "DRAFT") throw new HttpError(409, `任务当前状态 ${task.state}，不可重复启动。`);
    const readiness = providerReadiness(env);
    if (!readiness.ready) {
      throw new HttpError(503, `模型服务尚未就绪（${readiness.code}）；任务未启动，也未扣除 credits。`);
    }
    // A failed Workflow instance keeps its id forever; retries therefore need a
    // fresh deterministic-per-attempt id instead of colliding with the first run.
    const instanceId = `task-${task.id}-${crypto.randomUUID()}`;
    await env.DB.prepare("UPDATE tasks SET state = 'QUEUED', workflow_instance_id = ?, updated_at = ? WHERE id = ?")
      .bind(instanceId, isoNow(), task.id)
      .run();
    const coordinator = env.TASK_COORDINATOR.getByName(task.id) as DurableObjectStub<TaskCoordinator>;
    await coordinator.publish({ type: "TASK_STATE", message: "任务已排队，等待总工工作流接管。", payload: { state: "QUEUED", creditsCharged: false }, createdAt: isoNow() });
    let workflow: Awaited<ReturnType<typeof env.TASK_WORKFLOW.create>>;
    try {
      workflow = await env.TASK_WORKFLOW.create({ id: instanceId, params: { taskId: task.id, ownerId: user.id, prompt: task.prompt } });
    } catch (error) {
      await env.DB.prepare("UPDATE tasks SET state = 'DRAFT', workflow_instance_id = NULL, updated_at = ? WHERE id = ? AND state = 'QUEUED'")
        .bind(isoNow(), task.id)
        .run();
      throw error;
    }
    await audit(env, "TASK_STARTED", user.id, task.id, { creditsCharged: false, workflowId: workflow.id });
    return json({ accepted: true, workflowId: workflow.id }, 202);
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "events" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const after = Math.max(0, Number.parseInt(url.searchParams.get("after") ?? "0", 10) || 0);
    const coordinator = env.TASK_COORDINATOR.getByName(taskId) as DurableObjectStub<TaskCoordinator>;
    return json({ events: await coordinator.eventsAfter(after) });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "retries" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const retries = await env.DB.prepare("SELECT id, task_id, attempt, previous_workflow_id, workflow_id, error_code, status, created_at FROM workflow_retry_attempts WHERE task_id = ? ORDER BY attempt ASC")
      .bind(taskId).all();
    return json({ retries: retries.results, maxAttempts: 2 });
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "rework" && method === "POST") {
    const task = await requireTaskOwner(env, user.id, taskId);
    if (!["QUALITY_BLOCKED", "FAILED", "PACKAGED"].includes(task.state)) throw new HttpError(409, `任务当前状态 ${task.state}，只有失败、质量阻断或已打包任务可以重新生成。`);
    const readiness = providerReadiness(env);
    if (!readiness.ready) throw new HttpError(503, `模型服务尚未就绪（${readiness.code}）；任务未重新生成。`);
    const instanceId = `task-${task.id}-rework-${crypto.randomUUID()}`;
    const updatedAt = isoNow();
    await env.DB.batch([
      env.DB.prepare("UPDATE artifacts SET status = 'REJECTED' WHERE task_id = ? AND status = 'ACCEPTED'").bind(task.id),
      env.DB.prepare("UPDATE delivery_packages SET status = 'REJECTED' WHERE task_id = ? AND status = 'FROZEN'").bind(task.id),
      env.DB.prepare("UPDATE tasks SET state = 'QUEUED', quality_status = 'PENDING', retry_count = 0, last_error_code = NULL, workflow_instance_id = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND state IN ('QUALITY_BLOCKED', 'FAILED', 'PACKAGED')")
        .bind(instanceId, updatedAt, task.id, user.id),
      env.DB.prepare("UPDATE workflow_incidents SET status = 'ACKNOWLEDGED', acknowledged_at = ?, acknowledged_by = ?, updated_at = ?, resolution_note = ? WHERE task_id = ? AND status = 'OPEN'")
        .bind(updatedAt, user.id, updatedAt, "任务所有者已启动受控返工。", task.id),
    ]);
    const coordinator = env.TASK_COORDINATOR.getByName(task.id) as DurableObjectStub<TaskCoordinator>;
    await coordinator.publish({ type: "TASK_STATE", message: "任务已进入完整受控重建；历史候选已标记为拒绝，全部阶段按当前质量策略重新审查。", payload: { state: "QUEUED", rework: true, fullRebuild: true, creditsCharged: false }, createdAt: updatedAt });
    try {
      const workflow = await env.TASK_WORKFLOW.create({ id: instanceId, params: { taskId: task.id, ownerId: user.id, prompt: task.prompt } });
      await audit(env, "TASK_REWORK_STARTED", user.id, task.id, { creditsCharged: false, workflowId: workflow.id });
      return json({ accepted: true, rework: true, workflowId: workflow.id }, 202);
    } catch (error) {
      await env.DB.prepare("UPDATE tasks SET state = 'QUALITY_BLOCKED', quality_status = 'BLOCKED', workflow_instance_id = NULL, updated_at = ? WHERE id = ? AND state = 'QUEUED'")
        .bind(isoNow(), task.id)
        .run();
      throw error;
    }
  }

  if (taskId && parts.length === 4 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "artifacts" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const artifacts = await env.DB.prepare("SELECT id, task_id, stage_id, title, storage_key, sha256, status, provenance_json, visibility, created_at FROM artifacts WHERE task_id = ? ORDER BY created_at ASC")
      .bind(taskId)
      .all<ArtifactRow>();
    return json({ artifacts: artifacts.results.map((artifact) => ({ ...artifact, provenance: JSON.parse(artifact.provenance_json) })) });
  }

  if (taskId && parts.length === 5 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "artifacts" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const artifact = await env.DB.prepare("SELECT id, task_id, stage_id, title, storage_key, sha256, status, provenance_json, visibility, created_at FROM artifacts WHERE id = ? AND task_id = ?")
      .bind(parts[4]!, taskId)
      .first<ArtifactRow>();
    if (!artifact) throw new HttpError(404, "产出物不存在。");
    const object = await env.ARTIFACTS.get(artifact.storage_key);
    if (!object) throw new HttpError(404, "产出物存储对象不存在。");
    return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "text/plain; charset=utf-8", "Cache-Control": "private, no-store", "X-Artifact-Sha256": artifact.sha256 } });
  }

  if (taskId && parts.length === 6 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "artifacts" && parts[5] === "preview" && method === "GET") {
    await requireTaskOwner(env, user.id, taskId);
    const artifact = await env.DB.prepare("SELECT id, task_id, stage_id, title, storage_key, sha256, status, provenance_json, visibility, created_at FROM artifacts WHERE id = ? AND task_id = ?")
      .bind(parts[4]!, taskId)
      .first<ArtifactRow>();
    if (!artifact) throw new HttpError(404, "产出物不存在。");
    const object = await env.ARTIFACTS.get(artifact.storage_key);
    if (!object) throw new HttpError(404, "产出物存储对象不存在。");
    const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
    const isText = contentType.startsWith("text/") || contentType.includes("json") || /\.(md|txt|json)$/i.test(artifact.storage_key);
    const isOffice = /wordprocessingml|spreadsheetml|presentationml/.test(contentType) || /\.(docx|xlsx|pptx)$/i.test(artifact.storage_key);
    const metadata = { sourceArtifactId: artifact.id, sourceSha256: artifact.sha256, stageId: artifact.stage_id, visibility: artifact.visibility, restrictions: ["安全派生预览不执行宏、脚本或外链", "原始文件下载仍需单独授权"] };
    if (isText) {
      const content = await object.text();
      return json({ preview: { ...metadata, status: "READY", format: contentType.includes("json") ? "json" : "text", contentType, content } });
    }
    if (isOffice) return json({ preview: { ...metadata, status: "UNAVAILABLE", format: "office", contentType, reason: "Office 安全预览转换器未在当前 Worker 中执行；请下载原始受控文件或等待异步转换。" } });
    return json({ preview: { ...metadata, status: "UNAVAILABLE", format: "binary", contentType, reason: "该二进制产物没有安全派生预览。" } });
  }

  if (taskId && parts.length === 5 && parts[0] === "api" && parts[1] === "tasks" && parts[3] === "quality" && parts[4] === "compare" && (method === "POST" || method === "GET")) {
    await requireTaskOwner(env, user.id, taskId);
    const artifacts = await env.DB.prepare("SELECT id, stage_id, title, storage_key, sha256, provenance_json FROM artifacts WHERE task_id = ? AND status = 'ACCEPTED' ORDER BY created_at ASC")
      .bind(taskId).all<Pick<ArtifactRow, "id" | "stage_id" | "title" | "storage_key" | "sha256" | "provenance_json">>();
    const results: unknown[] = [];
    const gptSolConfigured = Boolean(Reflect.get(env as object, "GPT_SOL_API_KEY"));
    for (const artifact of artifacts.results) {
      const object = await env.ARTIFACTS.get(artifact.storage_key);
      if (!object) continue;
      const provenance = JSON.parse(artifact.provenance_json) as { provider?: string; model?: string; evidence?: string[] };
      const candidate = { id: artifact.id, taskId, stageId: artifact.stage_id, title: artifact.title, body: await object.text(), evidence: provenance.evidence ?? [], provider: provenance.provider ?? "unknown", model: provenance.model ?? "unknown" };
      const comparison = compareArtifactToGolden(candidate);
      let liveGpt: { score: number; issues: string[] } | null = null;
      if (gptSolConfigured) liveGpt = await evaluateGptSolCandidate(env as object, candidate);
      const scoredComparison = liveGpt ? { ...comparison, gptSolScore: liveGpt.score, gptSolStatus: "LIVE_EVALUATED" as const, issues: [...comparison.issues, ...liveGpt.issues] } : comparison;
      const comparisonId = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO quality_comparisons (id, task_id, artifact_id, candidate_provider, candidate_model, minimax_score, gpt_sol_score, gpt_sol_status, rubric_version, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(comparisonId, taskId, artifact.id, candidate.provider, candidate.model, scoredComparison.minimaxScore, scoredComparison.gptSolScore, scoredComparison.gptSolStatus, scoredComparison.rubricVersion, JSON.stringify(scoredComparison), isoNow()).run();
      results.push({ artifactId: artifact.id, stageId: artifact.stage_id, ...scoredComparison });
    }
    return json({ taskId, evaluatedAt: isoNow(), gptSolConfigured, results });
  }

  throw new HttpError(404, "接口不存在。");
}

export { TaskCoordinator } from "./task-coordinator";
export { TaskWorkflow } from "./workflow";
export { Sandbox as CadcoreSandbox } from "@cloudflare/sandbox";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
      return await env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error(JSON.stringify({ message: "request_failed", path: url.pathname, error: error instanceof Error ? error.message : String(error) }));
      return json({ error: "服务暂时不可用，请稍后重试。" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
