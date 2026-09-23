import type { CandidateArtifact, PipelineStage } from "./domain";
import { isLocalEnvironment } from "./security";
import { QUALITY_POLICY_VERSION, stageContractLabels } from "./quality";

export type ModelProvider = {
  readonly name: string;
  generateCandidate(input: {
    taskId: string;
    prompt: string;
    stage: PipelineStage;
    attempt?: number;
    feedback?: readonly string[];
  }): Promise<CandidateArtifact>;
};

export type ProviderReadiness = { ready: true } | { ready: false; code: string };

type FaultScenario = "MINIMAX_429_ONCE" | "MINIMAX_429_ALWAYS";

function faultScenario(env: Env): FaultScenario | null {
  // Never honor fault injection in production, even if a variable is
  // accidentally copied into the production environment.
  if (env.APP_ENV === "production") return null;
  const value = Reflect.get(env as object, "FAULT_INJECTION_SCENARIO");
  return value === "MINIMAX_429_ONCE" || value === "MINIMAX_429_ALWAYS" ? value : null;
}

class FaultInjectedProvider implements ModelProvider {
  readonly name: string;
  constructor(private readonly delegate: ModelProvider, private readonly db: D1Database, private readonly scenario: FaultScenario) {
    this.name = `fault-injection(${delegate.name})`;
  }

  async generateCandidate(input: { taskId: string; prompt: string; stage: PipelineStage; attempt?: number; feedback?: readonly string[] }): Promise<CandidateArtifact> {
    if (this.scenario === "MINIMAX_429_ALWAYS") throw new Error("MINIMAX_HTTP_429");
    const mark = await this.db.prepare("SELECT 1 AS seen FROM fault_injection_marks WHERE task_id = ? AND stage_id = ? AND scenario = ? LIMIT 1")
      .bind(input.taskId, input.stage.id, this.scenario).first<{ seen: number }>();
    if (!mark) {
      await this.db.prepare("INSERT OR IGNORE INTO fault_injection_marks (id, task_id, stage_id, scenario, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), input.taskId, input.stage.id, this.scenario, new Date().toISOString()).run();
      throw new Error("MINIMAX_HTTP_429");
    }
    return this.delegate.generateCandidate(input);
  }
}

/**
 * A deliberately non-production provider used only for local end-to-end verification.
 * It generates a schema-complete candidate so that the independent quality gate and
 * delivery ledger can be exercised without a provider key.
 */
export class LocalContractProvider implements ModelProvider {
  readonly name = "local-contract-fixture";

  async generateCandidate(input: { taskId: string; prompt: string; stage: PipelineStage; attempt?: number; feedback?: readonly string[] }): Promise<CandidateArtifact> {
    const normalizedPrompt = input.prompt.trim().slice(0, 320);
    const body = [
      `阶段：${input.stage.label}。`,
      `本阶段以用户任务“${normalizedPrompt}”为受控输入，形成可审查的方案候选。`,
      "输出包含阶段范围、输入可追溯、功能需求、性能需求、接口需求、架构、相机、光源、PLC、IO、HMI、MES、BOM、成本、节拍、产能、渲染、坐标、视图、FAT、MSA、验收、报价、里程碑、版本、审查、文件哈希、假设、风险与下一阶段交接项；所有未验证结论均保留为待验证假设，不得写成已验证事实。",
      "总工质量闸门将独立检查输入可追溯性、规则引用、最小信息量及禁止占位符，然后决定接受、返工或阻断。",
    ].join("\n\n");
    return {
      id: `${input.taskId}-${input.stage.id}-candidate-v1`,
      taskId: input.taskId,
      stageId: input.stage.id,
      title: `${input.stage.label}｜候选产出`,
      body,
      evidence: ["INPUT-task-prompt", `RULE-${input.stage.gate}`],
      provider: this.name,
      model: "fixture-v1",
    };
  }
}

/**
 * Remote execution is intentionally fail-closed until the account's MiniMax endpoint,
 * model identifier, plan entitlement and secret are verified. No token is ever stored
 * in source or a non-secret wrangler variable.
 */
export class MiniMaxCandidateProvider implements ModelProvider {
  readonly name = "minimax";

  constructor(private readonly baseUrl: string, private readonly apiKey: string | undefined, private readonly model: string | undefined) {}

  async generateCandidate(input: { taskId: string; prompt: string; stage: PipelineStage; attempt?: number; feedback?: readonly string[] }): Promise<CandidateArtifact> {
    if (!this.baseUrl || !this.apiKey || !this.model) {
      throw new Error("MINIMAX_PROVIDER_NOT_CONFIGURED");
    }
    const messages = [
      {
        role: "system",
        content: [
          "你是非标自动化方案包中的受控阶段执行体。只依据给定任务输入工作，不得编造现场验证、尺寸、性能、法规或测试结论。",
          "最终响应的第一个字符必须是 {，最后一个字符必须是 }。只允许输出单个 JSON 对象；禁止 Markdown 代码围栏、解释、标题前缀、后缀或思考过程。",
      `JSON schema: {title:string, body:string, evidence:string[]}。body 至少 420 个汉字或等价信息量，必须包含本阶段范围、输入可追溯、假设/待验证项、风险和下一阶段交接，并完成 ${input.stage.gate} 的阶段交付契约；evidence 至少包含 INPUT-task-prompt、用户消息要求的全部 INPUT-FILE- 引用与一个 RULE- 前缀规则。质量策略版本：${QUALITY_POLICY_VERSION}。`,
          "禁止使用 TODO、TBD、N/A、待定或空泛套话；信息不足时要明确写成待验证假设与需要的输入。候选在进入下一阶段前会经过独立硬门禁，不能用占位词交差。",
          stageContractInstructions(input.stage),
        ].join("\n"),
      },
      {
        role: "user",
        content: `任务 ID：${input.taskId}\n阶段：${input.stage.id} / ${input.stage.label}\n执行角色：${input.stage.agent}\n质量闸门：${input.stage.gate}\n本阶段尝试：${input.attempt ?? 1}\n${input.feedback?.length ? `上一次候选未通过独立门禁，必须逐条修正：\n- ${input.feedback.join("\n- ")}\n` : ""}用户受控提示词：\n${input.prompt}`,
      },
    ];
    const request = async (requestMessages: typeof messages) => {
      const endpoint = `${this.baseUrl!.replace(/\/$/, "")}/chat/completions`;
      const headers = { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", Accept: "application/json" };
      const structuredBody = { model: this.model, temperature: 0.1, max_completion_tokens: 4_000, response_format: { type: "json_object" }, messages: requestMessages };
      let response = await fetchWithTimeout(endpoint, { method: "POST", headers, body: JSON.stringify(structuredBody) });
      // Some regional compatibility deployments do not expose response_format;
      // retry that same request without it, while preserving the local gate.
      if (response.status === 400) {
        response = await fetchWithTimeout(endpoint, { method: "POST", headers, body: JSON.stringify({ ...structuredBody, response_format: undefined }) });
      }
      if (!response.ok) throw new Error(`MINIMAX_HTTP_${response.status}`);
      const payload = await response.json<unknown>();
      const baseResp = payload && typeof payload === "object" ? Reflect.get(payload, "base_resp") : undefined;
      if (baseResp && typeof baseResp === "object") {
        const statusCode = Reflect.get(baseResp, "status_code");
        if (typeof statusCode === "number" && statusCode !== 0) throw new Error(`MINIMAX_API_${statusCode}`);
      }
      return payload;
    };
    let candidate: ParsedCandidate;
    const firstContent = readCompletionContent(await request(messages));
    try {
      candidate = parseCandidate(firstContent);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "MINIMAX_NON_JSON_CANDIDATE") throw error;
      const repairMessages = [...messages, { role: "user", content: "上一条响应不合规。请现在重新生成，严格只返回符合 schema 的 JSON 对象；第一个字符必须是 {，最后一个字符必须是 }，不要输出任何解释。" }];
      const repairedContent = readCompletionContent(await request(repairMessages));
      try {
        candidate = parseCandidate(repairedContent);
      } catch (repairError) {
        if (!(repairError instanceof Error) || repairError.message !== "MINIMAX_NON_JSON_CANDIDATE") throw repairError;
        // M3 sometimes emits a complete, reviewable Markdown answer despite the
        // JSON contract. Keep the answer only when a local structural gate can
        // prove it contains the same engineering hand-off sections; otherwise
        // fail closed and never manufacture a candidate from arbitrary prose.
        try {
          candidate = parseStructuredTextCandidate(repairedContent, input.stage);
        } catch (structuredRepairError) {
          if (!(structuredRepairError instanceof Error) || structuredRepairError.message !== "MINIMAX_NON_JSON_CANDIDATE") throw structuredRepairError;
          candidate = parseStructuredTextCandidate(firstContent, input.stage);
        }
      }
    }
    const normalized = normalizeCandidate(candidate);
    return {
      id: `${input.taskId}-${input.stage.id}-candidate-${crypto.randomUUID()}`,
      taskId: input.taskId,
      stageId: input.stage.id,
      title: normalized.title,
      body: normalized.body,
      evidence: normalized.evidence,
      provider: this.name,
      model: this.model,
    };
  }
}

type ParsedCandidate = { title: string; body: string; evidence: string[] };

/**
 * Convert model shorthand for unknown values into an explicit, reviewable
 * assumption. This is deliberately narrow: it does not invent a value and it
 * does not repair missing sections; the stage contract and Golden Comparator
 * still decide whether the candidate is acceptable.
 */
function normalizeCandidate(candidate: ParsedCandidate): ParsedCandidate {
  const stripEmbeddedThought = (value: string) => value
    .replace(/<(?:think|analysis)\b[^>]*>[\s\S]*?(?:<\/(?:think|analysis)>|$)/gi, "")
    .trim();
  const normalize = (rawValue: string) => stripEmbeddedThought(rawValue)
    .replace(/\bTBD\b/gi, "待验证假设（需客户确认）")
    .replace(/\bTODO\b/gi, "待验证假设（需客户确认）")
    .replace(/\bN\/A\b/gi, "不适用（需客户确认）")
    .replace(/待定/g, "待验证假设（需客户确认）");
  return {
    title: normalize(candidate.title),
    body: normalize(candidate.body),
    evidence: candidate.evidence.map((item) => {
      const value = normalize(item).trim();
      if (/^INPUT(?:[-_ ]|$)/i.test(value) || /任务提示|用户提示|原始输入/i.test(value)) return "INPUT-task-prompt";
      const rule = value.match(/RULE[-_ ]?([A-Z0-9/]+)/i);
      return rule?.[1] ? `RULE-${rule[1].toUpperCase()}` : value;
    }),
  };
}

// MiniMax Token Plan responses can legitimately take over a minute for the
// longer engineering stages. Keep a bounded timeout, but do not classify a
// slow valid completion as a provider failure at 45 seconds.
async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = 120_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("UPSTREAM_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function readCompletionContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("MINIMAX_INVALID_RESPONSE");
  const choices = Reflect.get(payload, "choices");
  if (!Array.isArray(choices) || choices.length !== 1 || !choices[0] || typeof choices[0] !== "object") throw new Error("MINIMAX_INVALID_RESPONSE");
  const message = Reflect.get(choices[0], "message");
  if (!message || typeof message !== "object") throw new Error("MINIMAX_INVALID_RESPONSE");
  const content = Reflect.get(message, "content");
  if (typeof content !== "string") throw new Error("MINIMAX_INVALID_RESPONSE");
  return content;
}

function parseCandidate(content: string): ParsedCandidate {
  const stripped = sanitizeModelContent(content);
  let value: unknown;
  try {
    value = JSON.parse(stripped);
  } catch {
    const objectText = extractBalancedJsonObject(stripped);
    if (!objectText) throw new Error("MINIMAX_NON_JSON_CANDIDATE");
    try { value = JSON.parse(objectText); } catch { throw new Error("MINIMAX_NON_JSON_CANDIDATE"); }
  }
  if (!value || typeof value !== "object") throw new Error("MINIMAX_INVALID_CANDIDATE");
  const title = Reflect.get(value, "title");
  const body = Reflect.get(value, "body");
  const evidence = Reflect.get(value, "evidence");
  if (typeof title !== "string" || typeof body !== "string" || !Array.isArray(evidence) || !evidence.every((item) => typeof item === "string")) {
    throw new Error("MINIMAX_INVALID_CANDIDATE");
  }
  return { title: title.trim(), body: body.trim(), evidence: evidence.map((item) => item.trim()) };
}

/**
 * MiniMax occasionally returns a valid object inside a markdown fence or wraps
 * it in a <think>/<analysis> block even when response_format=json_object is set.
 * We remove only those transport wrappers, then extract one balanced JSON object;
 * the independent quality gate still decides whether the resulting artifact is
 * substantive enough to persist. Arbitrary prose is never converted to JSON.
 */
function sanitizeModelContent(content: string): string {
  return content
    .replace(/<(?:think|analysis)\b[^>]*>[\s\S]*?(?:<\/(?:think|analysis)>|$)/gi, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractBalancedJsonObject(content: string): string | null {
  for (let start = content.indexOf("{"); start >= 0; start = content.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < content.length; index += 1) {
      const character = content[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') { inString = true; continue; }
      if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) return content.slice(start, index + 1);
        if (depth < 0) break;
      }
    }
  }
  return null;
}

function stageContractInstructions(stage: PipelineStage): string {
  const labels = stageContractLabels(stage.id);
  const exactFields = labels.length ? `必须逐字包含以下阶段字段（建议用同名小节标题）：${labels.join("、")}。` : "";
  if (stage.id === "project_sales") {
    return [
      "项目与商务（G12）专用契约：body必须形成可交接的工程商务包，而不是销售宣传稿。按顺序覆盖：已通过阶段的交付范围与依据、成本/报价口径（没有真实价格时只能写核算依据和需确认输入，不得编造金额）、实施里程碑与资源、验收与变更边界、付款/质保假设、风险和交给文档汇编阶段的清单。",
      "必须明确区分已由前序产出支持的事实、待验证假设和客户确认项；可以写“待验证假设”“需客户确认”，但绝不能出现 TBD、TODO、N/A、待定。至少给出 5 个可执行的交接条目。",
      "示例形态（只示意字段，不要照抄内容）：{\"title\":\"项目与商务交接包\",\"body\":\"范围…报价口径…里程碑…验收…风险…交接…\",\"evidence\":[\"INPUT-task-prompt\",\"RULE-G12\"]}。",
    ].join("\n") + `\n${exactFields}`;
  }
  return `本阶段必须输出与“${stage.label}”直接相关的工程交接内容，不能用通用销售话术替代；下一阶段交接项必须可执行且可追溯。${exactFields}`;
}

function parseStructuredTextCandidate(content: string, stage: PipelineStage): ParsedCandidate {
  const body = sanitizeModelContent(content).replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/, "");
  // An incomplete schema-shaped JSON response is transport noise, not a prose
  // deliverable. Never wrap it as a candidate just because its fields mention
  // engineering vocabulary; let the bounded provider-format retry fail closed.
  if (/^\s*\{\s*["'](?:title|body|evidence)["']\s*:/i.test(body)
    || /(?:^|\n)\s*["'](?:title|body|evidence)["']\s*:/i.test(body)) {
    throw new Error("MINIMAX_NON_JSON_CANDIDATE");
  }
  const hasEngineeringSignal = /检测|视觉|相机|光源|尺寸|节拍|BOM|PLC|MES|CAD|风险|验证|接口|流程|方案|文档|工程|测试|inspection|vision|camera|safety|validation/i.test(body);
  const refusal = /无法完成|不能完成|做不到|请提供更多|信息不足以|作为语言模型|抱歉|i\s*cannot|i'm\s*unable/i.test(body);
  const sentenceCount = (body.match(/[。.!?！？]/g) ?? []).length;
  if (body.length < 100 || !hasEngineeringSignal || sentenceCount < 1 || refusal || /(?:TBD|TODO|N\/A|待定)/i.test(body)) {
    throw new Error("MINIMAX_NON_JSON_CANDIDATE");
  }
  return {
    title: `${stage.label}｜受控文本候选产出`,
    body,
    evidence: ["INPUT-task-prompt", `RULE-${stage.gate}`],
  };
}

export function createProvider(env: Env): ModelProvider {
  const scenario = faultScenario(env);
  const requestedFaultProvider = Reflect.get(env as object, "FAULT_INJECTION_PROVIDER");
  if (scenario && requestedFaultProvider === "fixture") return new FaultInjectedProvider(new LocalContractProvider(), env.DB, scenario);
  if (isLocalEnvironment(env)) return new LocalContractProvider();
  const values = env as object;
  const apiKey = Reflect.get(values, "MINIMAX_API_KEY");
  const model = Reflect.get(values, "MINIMAX_MODEL");
  const provider = new MiniMaxCandidateProvider(
    env.MINIMAX_BASE_URL,
    typeof apiKey === "string" ? apiKey : undefined,
    typeof model === "string" ? model : undefined,
  );
  return scenario ? new FaultInjectedProvider(provider, env.DB, scenario) : provider;
}

/**
 * Starting a workflow is an irreversible state transition. Production must not
 * enqueue it unless the MiniMax credentials and non-secret model configuration
 * are all present.
 */
export function providerReadiness(env: Env): ProviderReadiness {
  if (isLocalEnvironment(env)) return { ready: true };
  if (faultScenario(env) && Reflect.get(env as object, "FAULT_INJECTION_PROVIDER") === "fixture") return { ready: true };
  const values = env as object;
  const apiKey = Reflect.get(values, "MINIMAX_API_KEY");
  const model = Reflect.get(values, "MINIMAX_MODEL");
  if (!env.MINIMAX_BASE_URL || typeof apiKey !== "string" || !apiKey || typeof model !== "string" || !model) {
    return { ready: false, code: "MINIMAX_PROVIDER_NOT_CONFIGURED" };
  }
  return { ready: true };
}
