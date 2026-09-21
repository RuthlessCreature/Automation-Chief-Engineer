import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { PIPELINE, type CandidateArtifact, type PipelineStage } from "./domain";
import { inspectCadInCadcore } from "./cadcore";
import { createProvider } from "./provider";
import { QUALITY_POLICY_VERSION, sha256 } from "./quality";
import { isoNow } from "./security";
import { freezeCustomerDelivery } from "./package";
import type { TaskCoordinator } from "./task-coordinator";
import { runStageHarness } from "./harness";
import { openWorkflowIncident, resolveTaskIncidents } from "./incidents";

export type TaskWorkflowParams = { taskId: string; ownerId: string; prompt: string };

type TaskRow = { id: string; state: string };
type CadInputRow = { id: string; original_name: string; storage_key: string; sha256: string };
type CadJobRow = { id: string; status: string; report_storage_key: string | null; normalized_brep_key: string | null; error_code: string | null };

export class TaskWorkflow extends WorkflowEntrypoint<Env, TaskWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<TaskWorkflowParams>>, step: WorkflowStep): Promise<void> {
    let coordinator: DurableObjectStub<TaskCoordinator> | undefined;
    try {
      const task = await step.do("load queued task", async () => {
        const row = await this.env.DB.prepare("SELECT id, state FROM tasks WHERE id = ?")
          .bind(event.payload.taskId)
          .first<TaskRow>();
        if (!row || row.state !== "QUEUED") throw new Error("TASK_NOT_QUEUED");
        await this.env.DB.prepare("UPDATE tasks SET state = 'RUNNING', updated_at = ? WHERE id = ?")
          .bind(isoNow(), event.payload.taskId)
          .run();
        return { id: row.id };
      });

      coordinator = this.env.TASK_COORDINATOR.getByName(task.id) as DurableObjectStub<TaskCoordinator>;
      await step.do("announce task start", async () => {
        await coordinator!.publish({
          type: "TASK_STATE",
          message: "任务已启动；总工正在按固定 15 阶段受控编排。",
          payload: { state: "RUNNING", creditsCharged: false },
          createdAt: isoNow(),
        });
        return { announced: true };
      });

      await step.do("prepare CADCore geometry facts", { retries: { limit: 1, delay: "2 seconds", backoff: "linear" } }, async () => {
        return this.prepareCadInputs(task.id);
      });

      for (const stage of PIPELINE) {
        const alreadyAccepted = await step.do(`checkpoint ${stage.id}`, async () => {
          const row = await this.env.DB.prepare("SELECT provenance_json FROM artifacts WHERE task_id = ? AND stage_id = ? AND kind = 'stage-report' AND status = 'ACCEPTED' ORDER BY created_at DESC LIMIT 1")
            .bind(event.payload.taskId, stage.id)
            .first<{ provenance_json: string }>();
          if (!row) return false;
          try {
            const provenance = JSON.parse(row.provenance_json) as { qualityPolicyVersion?: string };
            return provenance.qualityPolicyVersion === QUALITY_POLICY_VERSION;
          } catch {
            return false;
          }
        });
        if (alreadyAccepted) continue;
        await this.runStage(step, coordinator, event.payload, stage);
      }

      await step.do("mark package assembly started", async () => {
        await this.env.DB.prepare("UPDATE tasks SET state = 'PACKAGING', quality_status = 'PENDING', updated_at = ? WHERE id = ?")
          .bind(isoNow(), task.id)
          .run();
        await coordinator!.publish({
          type: "TASK_STATE",
          stageId: "chief_review",
          message: "总工审查通过；正在冻结客户交付清单和 ZIP。",
          payload: { state: "PACKAGING", qualityStatus: "PENDING", customerZipReady: false },
          createdAt: isoNow(),
        });
        return { state: "PACKAGING" };
      });
      const frozenDelivery = await step.do("freeze customer delivery package", async () => {
        const delivery = await freezeCustomerDelivery(this.env, task.id);
        await this.env.DB.prepare("UPDATE tasks SET state = 'PACKAGED', quality_status = 'PASS', updated_at = ? WHERE id = ?")
          .bind(isoNow(), task.id)
          .run();
        await resolveTaskIncidents(this.env, task.id, "任务已通过当前质量策略并冻结 Golden-121 客户交付包。");
        return delivery;
      });
      await step.do("announce customer delivery frozen", async () => {
        await coordinator!.publish({
          type: "TASK_STATE",
          stageId: "chief_review",
          message: `总工审查通过；客户 ZIP 已冻结，可下载（${frozenDelivery.artifactCount} 个受控产出）。`,
          payload: { state: "PACKAGED", qualityStatus: "PASS", customerZipReady: true, zipSha256: frozenDelivery.sha256 },
          createdAt: isoNow(),
        });
        return { state: "PACKAGED", packageId: frozenDelivery.id };
      });
    } catch (error) {
      const code = safeWorkflowError(error);
      if (code.startsWith("QUALITY_BLOCKED:")) {
        // A quality gate is an intentional business outcome, not an execution
        // failure. The stage already persisted QUALITY_BLOCKED and published
        // the reasons; end this workflow cleanly so the UI does not show a
        // contradictory WORKFLOW_EXECUTION_ERROR/FAILED event and no retry is
        // scheduled for a deliberately rejected candidate.
        return;
      }
      if (code.startsWith("DELIVERY_")) {
        await openWorkflowIncident(this.env, {
          taskId: event.payload.taskId,
          code,
          severity: "WARNING",
          source: "G15_DELIVERY_GATE",
          detail: { customerZipReady: false, qualityBlocked: true },
        });
        await this.env.DB.prepare("UPDATE tasks SET state = 'QUALITY_BLOCKED', quality_status = 'BLOCKED', updated_at = ? WHERE id = ?")
          .bind(isoNow(), event.payload.taskId)
          .run();
        if (coordinator) {
          await coordinator.publish({
            type: "QUALITY_BLOCKED",
            stageId: "chief_review",
            message: `Golden-121 交付门禁阻断：${code}。缺失或不一致资产不会被伪装成完成交付。`,
            payload: { state: "QUALITY_BLOCKED", qualityStatus: "BLOCKED", errorCode: code, customerZipReady: false },
            createdAt: isoNow(),
          });
        }
        return;
      }
      const retryScheduled = await this.scheduleAutomaticRetry(event.payload, code, coordinator);
      if (retryScheduled) return;
      await openWorkflowIncident(this.env, {
        taskId: event.payload.taskId,
        code,
        severity: "ERROR",
        source: "WORKFLOW_TERMINAL_FAILURE",
        detail: { retryExhausted: isRetryableWorkflowError(code), creditsCharged: false },
      });
      await this.env.DB.prepare("UPDATE tasks SET state = 'FAILED', quality_status = 'BLOCKED', updated_at = ? WHERE id = ? AND state IN ('QUEUED', 'RUNNING', 'PACKAGING')")
        .bind(isoNow(), event.payload.taskId)
        .run();
      if (coordinator) {
        await coordinator.publish({
          type: "TASK_STATE",
          message: `总工工作流已停止：${code}。任务已标记为 FAILED，未扣除 credits。`,
          payload: { state: "FAILED", qualityStatus: "BLOCKED", errorCode: code, creditsCharged: false },
          createdAt: isoNow(),
        });
      }
      throw error;
    }
  }

  private async prepareCadInputs(taskId: string): Promise<{ processed: number }> {
    const inputs = await this.env.DB.prepare(
      "SELECT id, original_name, storage_key, sha256 FROM task_inputs WHERE task_id = ? AND intake_status = 'STAGED_FORMAT_VALIDATED' ORDER BY created_at ASC",
    ).bind(taskId).all<CadInputRow>();
    let processed = 0;
    for (const input of inputs.results.filter((candidate) => /\.(step|stp|stl)$/i.test(candidate.original_name))) {
      const isStl = /\.stl$/i.test(input.original_name);
      const kind = isStl ? "G02_STL_INSPECTION" : "G02_STEP_INSPECTION";
      const existing = await this.env.DB.prepare(
        "SELECT id, status, report_storage_key, normalized_brep_key, error_code FROM cad_jobs WHERE task_id = ? AND input_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1",
      ).bind(taskId, input.id, kind).first<CadJobRow>();
      if (existing?.status === "SUCCEEDED") { processed += 1; continue; }
      if (existing?.status === "BLOCKED" || existing?.status === "RUNNING" || existing?.status === "QUEUED") {
        throw new Error(existing.error_code ?? `CADCORE_${existing.status}`);
      }
      const jobId = crypto.randomUUID();
      const startedAt = isoNow();
      await this.env.DB.prepare(
        "INSERT INTO cad_jobs (id, task_id, input_id, kind, status, engine_json, created_at, started_at) VALUES (?, ?, ?, ?, 'RUNNING', ?, ?, ?)",
      ).bind(jobId, taskId, input.id, kind, JSON.stringify({ runtime: "cadcore-runner", occt: "7.9.3.1.1", meshToBrep: isStl, automatic: true }), startedAt, startedAt).run();
      try {
        const result = await inspectCadInCadcore(this.env, { id: input.id, taskId, originalName: input.original_name, storageKey: input.storage_key, sha256: input.sha256 });
        const completedAt = isoNow();
        await this.env.DB.batch([
          this.env.DB.prepare("UPDATE cad_jobs SET status = 'SUCCEEDED', report_storage_key = ?, normalized_brep_key = ?, completed_at = ? WHERE id = ?")
            .bind(result.reportKey, result.normalizedBrepKey, completedAt, jobId),
          this.env.DB.prepare("INSERT INTO artifacts (id, task_id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at, visibility) VALUES (?, ?, 'product_cad', ?, ?, ?, ?, 'ACCEPTED', ?, ?, 'INTERNAL')")
            .bind(crypto.randomUUID(), taskId, "cad-g02-report", `G02｜${isStl ? "STL 网格几何" : "STEP"} 检查报告`, result.reportKey, result.reportSha256, JSON.stringify({ cadJobId: jobId, inputId: input.id, gate: "G02", report: result.report, qualityPolicyVersion: QUALITY_POLICY_VERSION }), completedAt),
          this.env.DB.prepare("INSERT INTO artifacts (id, task_id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at, visibility) VALUES (?, ?, 'product_cad', ?, ?, ?, ?, 'ACCEPTED', ?, ?, 'INTERNAL')")
            .bind(crypto.randomUUID(), taskId, "normalized-brep", "G02｜规范化 BREP（内部）", result.normalizedBrepKey, result.normalizedBrepSha256, JSON.stringify({ cadJobId: jobId, inputId: input.id, gate: "G02", sourceSha256: input.sha256, qualityPolicyVersion: QUALITY_POLICY_VERSION }), completedAt),
        ]);
        processed += 1;
      } catch (error) {
        const code = error instanceof Error ? error.message.slice(0, 100) : "CADCORE_UNKNOWN_FAILURE";
        await this.env.DB.prepare("UPDATE cad_jobs SET status = 'BLOCKED', error_code = ?, completed_at = ? WHERE id = ?")
          .bind(code, isoNow(), jobId).run();
        throw new Error(code);
      }
    }
    return { processed };
  }

  private async scheduleAutomaticRetry(payload: TaskWorkflowParams, code: string, coordinator?: DurableObjectStub<TaskCoordinator>): Promise<boolean> {
    if (!isRetryableWorkflowError(code)) return false;
    const row = await this.env.DB.prepare("SELECT retry_count, workflow_instance_id FROM tasks WHERE id = ? AND state IN ('QUEUED', 'RUNNING')")
      .bind(payload.taskId).first<{ retry_count: number; workflow_instance_id: string | null }>();
    if (!row || row.retry_count >= 2) return false;
    const attempt = row.retry_count + 1;
    const workflowId = `task-${payload.taskId}-retry-${attempt}-${crypto.randomUUID()}`;
    const retryId = crypto.randomUUID();
    await this.env.DB.batch([
      this.env.DB.prepare("UPDATE tasks SET state = 'QUEUED', retry_count = ?, last_error_code = ?, workflow_instance_id = ?, updated_at = ? WHERE id = ? AND state IN ('QUEUED', 'RUNNING')")
        .bind(attempt, code, workflowId, isoNow(), payload.taskId),
      this.env.DB.prepare("INSERT INTO workflow_retry_attempts (id, task_id, attempt, previous_workflow_id, workflow_id, error_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)")
        .bind(retryId, payload.taskId, attempt, row.workflow_instance_id, workflowId, code, isoNow()),
    ]);
    await openWorkflowIncident(this.env, {
      taskId: payload.taskId,
      code,
      severity: "WARNING",
      source: "AUTO_RETRY",
      detail: { retryAttempt: attempt, maxAttempts: 2, workflowId },
    });
    await coordinator?.publish({ type: "TASK_STATE", message: `检测到可恢复错误 ${code}；后台将自动重试第 ${attempt}/2 次。`, payload: { state: "QUEUED", retryAttempt: attempt, retryable: true, errorCode: code }, createdAt: isoNow() });
    try {
      await this.env.TASK_WORKFLOW.create({ id: workflowId, params: payload });
      await this.env.DB.prepare("UPDATE workflow_retry_attempts SET status = 'STARTED' WHERE id = ?").bind(retryId).run();
      return true;
    } catch (retryError) {
      await this.env.DB.prepare("UPDATE workflow_retry_attempts SET status = 'EXHAUSTED', error_code = ? WHERE id = ?")
        .bind(safeWorkflowError(retryError), retryId).run();
      return false;
    }
  }

  private async runStage(
    step: WorkflowStep,
    coordinator: DurableObjectStub<TaskCoordinator>,
    payload: TaskWorkflowParams,
    stage: PipelineStage,
  ): Promise<void> {
    await step.do(`announce ${stage.id}`, async () => {
      await coordinator.publish({
        type: "STAGE_STARTED",
        stageId: stage.id,
        message: `${stage.agent} 开始：${stage.label}`,
        payload: { agent: stage.agent, gate: stage.gate },
        createdAt: isoNow(),
      });
      return { started: stage.id };
    });

    const harnessResult = await step.do(`harness ${stage.id} candidate`, { retries: { limit: 2, delay: "2 seconds", backoff: "linear" } }, async () => {
      return await runStageHarness({
        provider: createProvider(this.env),
        taskId: payload.taskId,
        prompt: payload.prompt,
        stage,
        onAttempt: async (attempt) => {
          await coordinator.publish({
            type: "HARNESS_ATTEMPT",
            stageId: stage.id,
            message: `${stage.agent} Harness 第 ${attempt.attempt}/${attempt.maxAttempts} 次${attempt.phase === "GENERATING" ? "生成候选" : attempt.phase === "PROVIDER_RETRY" ? "模型响应格式异常，技术重试（不消耗质量返修次数）" : attempt.phase === "ACCEPTED" ? "通过独立门禁" : "未通过，准备修复"}`,
            payload: { phase: attempt.phase, attempt: attempt.attempt, maxAttempts: attempt.maxAttempts, reasons: attempt.reasons?.join(" | ") ?? null },
            createdAt: isoNow(),
          });
        },
      });
    });

    if (harnessResult.status === "QUALITY_BLOCKED") {
      await step.do(`block ${stage.id}`, async () => {
        await this.env.DB.prepare("UPDATE tasks SET state = 'QUALITY_BLOCKED', quality_status = 'BLOCKED', updated_at = ? WHERE id = ?")
          .bind(isoNow(), payload.taskId)
          .run();
        await coordinator.publish({
          type: "QUALITY_BLOCKED",
          stageId: stage.id,
          message: `${stage.agent} 候选产出经过 ${harnessResult.attempts} 次受控修复仍未通过 ${stage.gate}；工作流已阻断。`,
          payload: { state: "QUALITY_BLOCKED", reasons: harnessResult.reasons.join(" | "), attempts: harnessResult.attempts },
          createdAt: isoNow(),
        });
        return { blocked: stage.id, attempts: harnessResult.attempts };
      });
      throw new Error(`QUALITY_BLOCKED:${stage.id}`);
    }

    const artifact = harnessResult.artifact;
    const comparison = harnessResult.comparison;
    const decision = await step.do(`persist ${stage.id} candidate`, async () => {
      const storageKey = `tasks/${payload.taskId}/artifacts/${stage.id}/${artifact.id}.md`;
      const content = renderArtifact(artifact, stage);
      const hash = await sha256(content);
      await this.env.ARTIFACTS.put(storageKey, content, {
        httpMetadata: { contentType: "text/markdown; charset=utf-8" },
        customMetadata: { taskId: payload.taskId, stageId: stage.id, sha256: hash, provider: artifact.provider, model: artifact.model },
      });
      await this.env.DB.prepare(
        "INSERT OR IGNORE INTO artifacts (id, task_id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at, visibility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(artifact.id, payload.taskId, stage.id, "stage-report", artifact.title, storageKey, hash, "ACCEPTED", JSON.stringify({ provider: artifact.provider, model: artifact.model, evidence: artifact.evidence, qualityPolicyVersion: QUALITY_POLICY_VERSION, stageContract: "PASS" }), isoNow(), "INTERNAL")
        .run();
      await this.env.DB.prepare(
        "INSERT INTO quality_comparisons (id, task_id, artifact_id, candidate_provider, candidate_model, minimax_score, gpt_sol_score, gpt_sol_status, rubric_version, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), payload.taskId, artifact.id, artifact.provider, artifact.model, comparison.minimaxScore, comparison.gptSolScore, comparison.gptSolStatus, comparison.rubricVersion, JSON.stringify(comparison), isoNow()).run();
      return { pass: true, storageKey, hash, artifactId: artifact.id };
    });

    await step.do(`publish ${stage.id} output`, async () => {
      await coordinator.publish({
        type: "STAGE_OUTPUT",
        stageId: stage.id,
        message: `${stage.agent} 已提交受控候选产出，等待总工链路继续。`,
        payload: { artifactId: decision.artifactId, storageKey: decision.storageKey, sha256: decision.hash },
        createdAt: isoNow(),
      });
      await coordinator.publish({
        type: "STAGE_GATED",
        stageId: stage.id,
        message: `${stage.gate} 通过；产出物已固化并可预览。`,
        payload: { gate: stage.gate, result: "PASS" },
        createdAt: isoNow(),
      });
      return { published: stage.id };
    });
  }
}

function safeWorkflowError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/^QUALITY_BLOCKED:[a-z0-9_-]{1,80}$/.test(message)) return message;
  if (/^[A-Z0-9_:-]{3,120}$/.test(message)) return message;
  return "WORKFLOW_EXECUTION_ERROR";
}

function isRetryableWorkflowError(code: string): boolean {
  // Cloudflare Workflow can wrap a transient provider/runtime exception in a
  // generic WORKFLOW_EXECUTION_ERROR before it reaches this catch block. Keep
  // the bounded two-attempt retry policy active for that wrapper; permanent
  // quality blocks still use the explicit QUALITY_BLOCKED branch above.
  return /^(WORKFLOW_EXECUTION_ERROR|MINIMAX_(HTTP_(408|409|429|5\d\d)|INVALID_RESPONSE|NON_JSON_CANDIDATE|API_5\d\d)|WORKFLOW_EXECUTION_TIMEOUT|UPSTREAM_TIMEOUT)$/.test(code);
}

function renderArtifact(artifact: CandidateArtifact, stage: PipelineStage): string {
  return [
    `# ${artifact.title}`,
    "",
    `- 阶段：${stage.id} / ${stage.label}`,
    `- 执行体：${stage.agent}`,
    `- 质量闸门：${stage.gate}`,
    `- 提供方：${artifact.provider} / ${artifact.model}`,
    `- 证据：${artifact.evidence.join(", ")}`,
    "",
    artifact.body,
  ].join("\n");
}
