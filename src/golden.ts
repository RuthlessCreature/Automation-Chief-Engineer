import type { CandidateArtifact } from "./domain";
import { REASONING_LEAK_PATTERN, UNRESOLVED_PLACEHOLDER_PATTERN } from "./quality";

export const GOLDEN_RUBRIC_VERSION = "GB-ACE-5015-V1.contract-v1";

export type QualityComparison = {
  rubricVersion: string;
  minimaxScore: number;
  gptSolScore: number | null;
  gptSolStatus: "REFERENCE_BASELINE" | "LIVE_EVALUATED" | "NOT_CONFIGURED";
  dimensions: {
    evidence: number;
    engineeringSpecificity: number;
    traceability: number;
    honesty: number;
    completeness: number;
  };
  issues: string[];
  deliveryAllowed: boolean;
};

export async function evaluateGptSolCandidate(env: object, candidate: CandidateArtifact): Promise<{ score: number; issues: string[] } | null> {
  const apiKey = Reflect.get(env, "GPT_SOL_API_KEY");
  if (typeof apiKey !== "string" || !apiKey) return null;
  const baseUrl = typeof Reflect.get(env, "GPT_SOL_BASE_URL") === "string" ? Reflect.get(env, "GPT_SOL_BASE_URL") as string : "https://api.openai.com/v1";
  const model = typeof Reflect.get(env, "GPT_SOL_MODEL") === "string" ? Reflect.get(env, "GPT_SOL_MODEL") as string : "gpt-5.6-sol";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是独立质量评审器。只返回 JSON：{score:number,issues:string[]}。按工程完整性、证据可追溯、事实诚实、可执行性和跨阶段交接评分，不能因为语言漂亮或模型自评而加分。" },
        { role: "user", content: JSON.stringify({ stageId: candidate.stageId, title: candidate.title, body: candidate.body, evidence: candidate.evidence }) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`GPT_SOL_HTTP_${response.status}`);
  const payload = await response.json<unknown>();
  const choices = payload && typeof payload === "object" ? Reflect.get(payload, "choices") : undefined;
  const message = Array.isArray(choices) && choices[0] && typeof choices[0] === "object" ? Reflect.get(choices[0], "message") : undefined;
  const content = message && typeof message === "object" ? Reflect.get(message, "content") : undefined;
  if (typeof content !== "string") throw new Error("GPT_SOL_INVALID_RESPONSE");
  const parsed = JSON.parse(content) as { score?: unknown; issues?: unknown };
  const score = typeof parsed.score === "number" && Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null;
  if (score === null) throw new Error("GPT_SOL_INVALID_SCORE");
  return { score, issues: Array.isArray(parsed.issues) ? parsed.issues.filter((item): item is string => typeof item === "string").slice(0, 20) : [] };
}

/**
 * Deterministic Golden Comparator. It scores the candidate against the
 * red-line contract, never against MiniMax's self-reported confidence. The
 * GPT-SOL is never synthesized here. A live GPT-SOL result may only be attached
 * by evaluateGptSolCandidate after an authenticated upstream response; this
 * comparator always returns REFERENCE_BASELINE for that dimension.
 */
export function compareArtifactToGolden(candidate: CandidateArtifact): QualityComparison {
  const body = candidate.body.trim();
  const lower = body.toLowerCase();
  const issues: string[] = [];
  const evidence = Math.min(20, candidate.evidence.length >= 2 ? 20 : candidate.evidence.length * 8);
  const engineeringHits = (body.match(/检测|视觉|相机|光源|尺寸|节拍|BOM|PLC|MES|CAD|风险|验证|接口|流程|方案|文档|工程|测试|inspection|vision|camera|safety|validation/gi) ?? []).length;
  const engineeringSpecificity = Math.min(25, engineeringHits * 3 + (body.length >= 500 ? 5 : 0));
  const traceability = candidate.evidence.every((item) => /^INPUT-|^RULE-/.test(item)) ? 20 : 5;
  const dishonest = /已验证通过|客户已确认|供应商已报价|FAT已完成|SAT已完成|无风险|guaranteed|已量产/i.test(body);
  const placeholders = UNRESOLVED_PLACEHOLDER_PATTERN.test(body);
  const reasoningLeak = REASONING_LEAK_PATTERN.test(body);
  const honesty = dishonest || placeholders || reasoningLeak ? 0 : 20;
  const completeness = body.length >= 320 && /假设|待验证|风险|交接|下一阶段|边界/i.test(body) ? 15 : body.length >= 120 ? 8 : 0;
  if (candidate.evidence.length < 2) issues.push("证据引用不足");
  if (engineeringHits < 3) issues.push("工程专属性不足");
  if (!candidate.evidence.every((item) => /^INPUT-|^RULE-/.test(item))) issues.push("存在不可追溯证据引用");
  if (dishonest) issues.push("出现未经证据支持的已完成/已验证表述");
  if (placeholders) issues.push("存在占位符或未决字段");
  if (reasoningLeak) issues.push("模型思考过程泄漏到候选产出");
  if (body.length < 320) issues.push("交付候选信息量不足");
  const minimaxScore = Math.max(0, Math.min(100, evidence + engineeringSpecificity + traceability + honesty + completeness));
  return {
    rubricVersion: GOLDEN_RUBRIC_VERSION,
    minimaxScore,
    gptSolScore: null,
    gptSolStatus: "REFERENCE_BASELINE",
    dimensions: { evidence, engineeringSpecificity, traceability, honesty, completeness },
    issues,
    deliveryAllowed: minimaxScore >= 70 && issues.length === 0,
  };
}
