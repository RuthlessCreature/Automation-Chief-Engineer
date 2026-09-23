import type { CandidateArtifact, PipelineStage } from "./domain";
import { compareArtifactToGolden, type QualityComparison } from "./golden";
import type { ModelProvider } from "./provider";
import { evaluateCandidate, findUnresolvedPlaceholders, QUALITY_POLICY_VERSION } from "./quality";

export const MAX_STAGE_HARNESS_ATTEMPTS = 3;
export const MAX_PROVIDER_FORMAT_RETRIES_PER_STAGE_ATTEMPT = 3;

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
  phase: "GENERATING" | "PROVIDER_RETRY" | "REJECTED" | "ACCEPTED";
  reasons?: readonly string[];
  /** Internal-only diagnostic. The workflow persists it as REJECTED, never as deliverable evidence. */
  candidate?: CandidateArtifact;
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
  requiredEvidenceRefs?: readonly string[];
  maxAttempts?: number;
  onAttempt?: (attempt: StageHarnessAttempt) => Promise<void>;
}): Promise<StageHarnessResult> {
  const maxAttempts = Math.max(1, Math.min(MAX_STAGE_HARNESS_ATTEMPTS, input.maxAttempts ?? MAX_STAGE_HARNESS_ATTEMPTS));
  let feedback: string[] = [];
  let lastReasons: string[] = ["stage candidate was not accepted"];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await input.onAttempt?.({ attempt, maxAttempts, phase: "GENERATING" });
    let candidate: CandidateArtifact | null = null;
    let providerFeedback = [...feedback];
    let lastProviderError: Error | null = null;

    for (let providerTry = 1; providerTry <= MAX_PROVIDER_FORMAT_RETRIES_PER_STAGE_ATTEMPT; providerTry += 1) {
      try {
        candidate = await input.provider.generateCandidate({
          taskId: input.taskId,
          prompt: input.prompt,
          stage: input.stage,
          attempt,
          feedback: providerFeedback,
        });
        lastProviderError = null;
        break;
      } catch (error) {
        const code = error instanceof Error ? error.message : String(error);
        if (!["MINIMAX_NON_JSON_CANDIDATE", "MINIMAX_INVALID_RESPONSE", "MINIMAX_INVALID_CANDIDATE"].includes(code)) throw error;
        lastProviderError = error instanceof Error ? error : new Error(code);
        const providerReason = code === "MINIMAX_NON_JSON_CANDIDATE"
          ? "candidate response was not valid JSON"
          : "candidate response did not satisfy the provider schema";
        providerFeedback = [
          ...feedback,
          providerReason,
          "严格只返回单个 JSON 对象；不得输出 Markdown、思考过程或解释前后缀。",
        ];
        await input.onAttempt?.({
          attempt,
          maxAttempts,
          phase: "PROVIDER_RETRY",
          reasons: [`${providerReason}；技术重试 ${providerTry}/${MAX_PROVIDER_FORMAT_RETRIES_PER_STAGE_ATTEMPT}`],
        });
      }
    }

    if (!candidate) {
      // Provider transport/schema failures are technical failures, not business
      // quality rejections. Never spend the bounded engineering repair budget
      // on malformed upstream envelopes.
      throw lastProviderError ?? new Error("MINIMAX_INVALID_RESPONSE");
    }

    // Normalize a server-verified source citation into the evidence array only
    // when the candidate body itself explicitly names that exact immutable ref.
    // This preserves provenance while avoiding reliance on M3's JSON evidence
    // array formatting; an uncited attachment still fails the gate.
    const citedInputRefs = (input.requiredEvidenceRefs ?? []).filter((ref) => candidate!.body.includes(ref) || candidate!.evidence.includes(ref));
    const normalizedCandidate = citedInputRefs.length
      ? { ...candidate, evidence: [...new Set([...candidate.evidence, ...citedInputRefs])] }
      : candidate;
    candidate = normalizedCandidate;
    const structural = evaluateCandidate(candidate, input.requiredEvidenceRefs);
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
    await input.onAttempt?.({ attempt, maxAttempts, phase: "REJECTED", reasons: lastReasons, candidate });
  }

  return { status: "QUALITY_BLOCKED", reasons: lastReasons, attempts: maxAttempts };
}
