import type { CandidateArtifact, PipelineStage } from "./domain";
import { compareArtifactToGolden, type QualityComparison } from "./golden";
import type { ModelProvider } from "./provider";
import { evaluateCandidate, findUnresolvedPlaceholders, QUALITY_POLICY_VERSION } from "./quality";

export const MAX_STAGE_HARNESS_ATTEMPTS = 3;

export type StageHarnessAccepted = {
  status: "ACCEPTED";
  artifact: CandidateArtifact;
  comparison: QualityComparison;
  attempts: number;
  policyVersion: string;
};

export type StageHarnessBlocked = {
  status: "QUALITY_BLOCKED";
  reasons: string[];
  attempts: number;
};

export type StageHarnessResult = StageHarnessAccepted | StageHarnessBlocked;

export type StageHarnessAttempt = {
  attempt: number;
  maxAttempts: number;
  phase: "GENERATING" | "REJECTED" | "ACCEPTED";
  reasons?: readonly string[];
};

/**
 * Stage Harness is the deterministic boundary between an upstream model and
 * the workflow ledger. A candidate is never persisted or published until it
 * passes both the structural gate and the Golden Contract. Rejected candidates
 * receive bounded repair feedback; a persistent rejection becomes an explicit
 * QUALITY_BLOCKED business result rather than a fake runtime failure.
 */
export async function runStageHarness(input: {
  provider: ModelProvider;
  taskId: string;
  prompt: string;
  stage: PipelineStage;
  maxAttempts?: number;
  onAttempt?: (attempt: StageHarnessAttempt) => Promise<void>;
}): Promise<StageHarnessResult> {
  const maxAttempts = Math.max(1, Math.min(MAX_STAGE_HARNESS_ATTEMPTS, input.maxAttempts ?? MAX_STAGE_HARNESS_ATTEMPTS));
  let feedback: string[] = [];
  let lastReasons: string[] = ["stage candidate was not accepted"];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await input.onAttempt?.({ attempt, maxAttempts, phase: "GENERATING" });
    let candidate: CandidateArtifact;
    try {
      candidate = await input.provider.generateCandidate({
        taskId: input.taskId,
        prompt: input.prompt,
        stage: input.stage,
        attempt,
        feedback,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      if (!["MINIMAX_NON_JSON_CANDIDATE", "MINIMAX_INVALID_RESPONSE", "MINIMAX_INVALID_CANDIDATE"].includes(code)) throw error;
      lastReasons = [code === "MINIMAX_NON_JSON_CANDIDATE" ? "candidate response was not valid JSON" : "candidate response did not satisfy the provider schema"];
      feedback = [...lastReasons, "严格只返回单个 JSON 对象；不得输出 Markdown、思考过程或解释前后缀。"];
      await input.onAttempt?.({ attempt, maxAttempts, phase: "REJECTED", reasons: lastReasons });
      continue;
    }
    const structural = evaluateCandidate(candidate);
    const comparison = structural.pass ? compareArtifactToGolden(candidate) : null;
    const reasons = [
      ...(structural.pass ? [] : structural.reasons),
      ...(comparison && !comparison.deliveryAllowed ? comparison.issues : []),
    ];
    if (structural.pass && comparison?.deliveryAllowed) {
      await input.onAttempt?.({ attempt, maxAttempts, phase: "ACCEPTED" });
      return { status: "ACCEPTED", artifact: candidate, comparison, attempts: attempt, policyVersion: QUALITY_POLICY_VERSION };
    }

    const placeholders = findUnresolvedPlaceholders(candidate.body);
    lastReasons = [...new Set(reasons.length ? reasons : ["candidate failed independent Golden Contract"])]
      .slice(0, 12);
    feedback = [
      ...lastReasons,
      ...(placeholders.length ? [`remove unresolved placeholder tokens: ${placeholders.join(", ")}`] : []),
      "保留真实输入边界和待验证假设，但不得输出占位词或伪造已完成结论。",
    ];
    await input.onAttempt?.({ attempt, maxAttempts, phase: "REJECTED", reasons: lastReasons });
  }

  return { status: "QUALITY_BLOCKED", reasons: lastReasons, attempts: maxAttempts };
}
