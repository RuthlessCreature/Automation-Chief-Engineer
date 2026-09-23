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
  trustedQuoteEvidenceRefs?: readonly string[];
  unconfirmedCadUnits?: boolean;
  maxAttempts?: number;
  onAttempt?: (attempt: StageHarnessAttempt) => Promise<void>;
}): Promise<StageHarnessResult> {
  const maxAttempts = Math.max(1, Math.min(MAX_STAGE_HARNESS_ATTEMPTS, input.maxAttempts ?? MAX_STAGE_HARNESS_ATTEMPTS));
  let feedback: string[] = [];
  let lastReasons: string[] = ["stage candidate was not accepted"];
  const promptConstraints = [
      input.unconfirmedCadUnits
      ? "CAD 单位受控补充约束（必须遵守）：输入 CAD/STEP 单位为 UNCONFIRMED。只可复述已验证的拓扑计数，不得提供任何 CAD 派生长度、孔径、螺纹、坐标、包络、焦距、工作距离、像素当量或夹具配合尺寸。严禁选定 mm、inch 或任何其他单位；也不准以‘假设单位为 mm/inch’等措辞把未确认单位伪装成前提。只能如实标注 UNCONFIRMED，并停止所有依赖单位的尺寸结论。也不得用‘待验证’‘假设’或‘示例’作掩护保留被禁止的数值。不得自行补充任何无来源的标准件尺寸、安装网格、气压/电压/速度、采集帧数、机柜尺寸或器件规格；仅当该精确值出现在用户输入或可核验规则中时才可使用。无法定尺寸时不得提交可交付候选，应明确指出缺失输入并由质量门阻断任务；不得把问题推到下一阶段/用户确认/现场验证后处理。"
      : "",
    input.requiredEvidenceRefs?.length
      ? `必须逐字引用以下服务端核验的输入 ID：${input.requiredEvidenceRefs.join(", " )}。每个 ID 都要同时出现在 body 的“输入可追溯”段和 evidence 数组；若未引用任何一个，候选会被阻断。不得改写、缩写或猜测 ID。`
      : "",
    input.stage.id === "bom_cost"
      ? input.trustedQuoteEvidenceRefs?.length
        ? `BOM 商务证据约束：只有这些由服务端按报价/采购来源元数据识别的输入可支持具体供应商、品牌、型号、料号或价格：${input.trustedQuoteEvidenceRefs.join(", ")}。每条此类结论须在同一句引用对应原始 ID；其余输入不能证明报价。不得用估算、行业中位价或常识替代报价。`
        : "BOM 商务证据约束：当前没有服务端识别的报价/采购来源。不得编写具名供应商、品牌、型号、料号、SKU、单价、总价、市场价或所谓公开报价；仅给出功能性物料类别、可从方案确认的数量依据、未报价的成本边界和采购取证/关闭条件。明确写“未取得正式报价，当前不是可采购报价”而不要编造金额。"
      : "",
  ].filter(Boolean);
  const governedPrompt = promptConstraints.length
    ? `${input.prompt}\n\n服务端受控约束（必须遵守）：\n${promptConstraints.join("\n")}`
    : input.prompt;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await input.onAttempt?.({ attempt, maxAttempts, phase: "GENERATING" });
    let candidate: CandidateArtifact | null = null;
    let providerFeedback = [...feedback];
    let lastProviderError: Error | null = null;

    for (let providerTry = 1; providerTry <= MAX_PROVIDER_FORMAT_RETRIES_PER_STAGE_ATTEMPT; providerTry += 1) {
      try {
        candidate = await input.provider.generateCandidate({
          taskId: input.taskId,
          prompt: governedPrompt,
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
    const structural = evaluateCandidate(candidate, input.requiredEvidenceRefs, input.unconfirmedCadUnits, input.trustedQuoteEvidenceRefs);
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
      ...(lastReasons.some((reason) => reason.includes("CAD source units are unconfirmed"))
        ? ["CAD 单位未确认：删除全部从 CAD 坐标/bbox 推导的物理长度数值；标注“单位未确认”也不能保留该数字。不得把 STEP 假定为 mm/inch/任何单位，不得用“单位假设”规避。不得输出任何长度、螺纹、直径或从坐标换算的尺寸/焦距/工作距离；只能定性描述几何，并明确该单位依赖结论已阻断。"]
        : []),
      ...(lastReasons.some((reason) => reason.startsWith("missing required source reference:"))
        ? [`修复输入追溯：将每个服务端必需引用 ${input.requiredEvidenceRefs?.join(", ") ?? ""} 原样写入 body 的“输入可追溯”段和 evidence 数组；不可漏引或改写。`]
        : []),
      ...(lastReasons.some((reason) => reason.startsWith("BOM "))
        ? [input.trustedQuoteEvidenceRefs?.length
          ? `修复 BOM 商务溯源：仅可引用已核验的报价/采购来源 ${input.trustedQuoteEvidenceRefs.join(", ")}，逐句标出证据；删除无来源的供应商、型号、料号及金额。`
          : "修复 BOM 商务溯源：删除全部具名供应商、品牌、型号、料号、SKU 和具体金额/市场价，改为功能性物料类别及明确的未报价边界；不得将估算写成报价。"]
        : []),
      "所有候选均由服务端独立扫描开放事项；删去待验证/待确认/由客户或现场确认/下一阶段闭环/任一选型/等效未闭环表述。只允许采用有输入证据的单一受控决策；如输入不足以决策，停止生成可交付候选并让 Gate 阻断任务。保留真实边界，但不得以免责声明、假设、风险项或下一阶段交接掩盖未闭环事项，也不得伪造已完成结论。",
    ];
    await input.onAttempt?.({ attempt, maxAttempts, phase: "REJECTED", reasons: lastReasons, candidate });
  }

  return { status: "QUALITY_BLOCKED", reasons: lastReasons, attempts: maxAttempts };
}
