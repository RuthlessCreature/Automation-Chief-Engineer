import { afterEach, describe, expect, it, vi } from "vitest";
import { MiniMaxCandidateProvider } from "../src/provider";

describe("MiniMax OpenAI-compatible adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires and maps one strict JSON completion into a candidate", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        title: "受控需求基线",
        body: "本阶段范围是建立可审查需求基线，并以用户输入为唯一事实来源。当前输入尚未包含现场节拍、接口清单和安全类别，因此这些内容只能登记为待验证假设，不能编造成已确认结论。风险包括输入版本不一致、约束遗漏和跨专业接口不完整。下一阶段应取得客户确认的样件信息、产能目标、空间边界、验收规则和适用标准，并将确认记录纳入交接清单。该候选不替代工程签核、现场勘查或性能测试，所有关键数字必须经过来源复核后才可冻结。",
        evidence: ["INPUT-task-prompt", "RULE-G01"],
      }) } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new MiniMaxCandidateProvider("https://api.minimax.cn/v1", "not-a-real-key", "MiniMax-M3");

    const candidate = await provider.generateCandidate({
      taskId: "task-1",
      prompt: "为风扇自动检验与性能测试单元建立需求基线并约束不确定项。",
      stage: { id: "requirements", label: "需求工程", agent: "Requirement Engineer", gate: "G01" },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://api.minimax.cn/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    expect(candidate).toMatchObject({ taskId: "task-1", stageId: "requirements", provider: "minimax", model: "MiniMax-M3", evidence: ["INPUT-task-prompt", "RULE-G01"] });
  });

  it("fails closed when the model returns prose instead of the required JSON", async () => {
    const prose = new Response(JSON.stringify({ choices: [{ message: { content: "这是一段不合规的说明文字" } }] }), { status: 200 });
    const repairProse = new Response(JSON.stringify({ choices: [{ message: { content: "修复仍然失败" } }] }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(prose).mockResolvedValueOnce(repairProse));
    const provider = new MiniMaxCandidateProvider("https://api.minimax.cn/v1", "not-a-real-key", "MiniMax-M3");
    await expect(provider.generateCandidate({
      taskId: "task-1", prompt: "受控提示词足够长以通过输入规则。",
      stage: { id: "requirements", label: "需求工程", agent: "Requirement Engineer", gate: "G01" },
    })).rejects.toThrow("MINIMAX_NON_JSON_CANDIDATE");
  });

  it("accepts only a structurally complete prose fallback after JSON repair fails", async () => {
    const structured = ("范围：本阶段建立可审查的机械方案边界。输入：仅使用用户提示词，缺失尺寸与节拍均登记为待验证假设。假设：设备采用单通道手动上料，关键接口需要现场确认。风险：空间边界、节拍目标和安全等级尚未冻结，可能造成结构返工。下一阶段：将把确认后的接口、风险和验收条件交接给视觉与电控工程师，并保留版本哈希和责任人记录。交接：本候选不得替代现场勘查、工程签核或性能测试。 ").repeat(2);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: structured } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: structured } }] }), { status: 200 })));
    const provider = new MiniMaxCandidateProvider("https://api.minimax.cn/v1", "not-a-real-key", "MiniMax-M3");
    const candidate = await provider.generateCandidate({
      taskId: "task-1",
      prompt: "建立机械方案边界并约束不确定项。",
      stage: { id: "mechanical", label: "机械方案", agent: "Mechanical Engineer", gate: "G05" },
    });
    expect(candidate).toMatchObject({ title: "机械方案｜受控文本候选产出", evidence: ["INPUT-task-prompt", "RULE-G05"] });
  });

  it("extracts JSON wrapped by MiniMax thinking tags and markdown fences", async () => {
    const candidateJson = JSON.stringify({
      title: "项目与商务交接包",
      body: "本阶段范围基于已通过的需求、可行性、视觉、机械、电控、软件、CAD、产能、成本、数字孪生和验证产出，形成可审查的项目商务交接。报价只采用已登记的成本口径，缺失的价格参数列为待验证假设并由客户确认。里程碑包括输入冻结、详细设计、制造装配、联调验证和交付培训；每个节点要求责任人、证据和验收记录。验收范围、变更流程、付款条件、质保边界与风险升级路径均需在合同附件中固化。下一阶段交接文档包含范围矩阵、成本依据、里程碑、验收清单、风险登记和版本哈希，不能把未验证内容写成已完成事实。",
      evidence: ["INPUT-task-prompt", "RULE-G12"],
    });
    const wrapped = "<think>先分析，但不得泄漏</think>\n```json\n" + candidateJson + "\n```";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: wrapped } }] }), { status: 200 })));
    const provider = new MiniMaxCandidateProvider("https://api.minimax.cn/v1", "not-a-real-key", "MiniMax-M3");
    const candidate = await provider.generateCandidate({
      taskId: "task-1",
      prompt: "建立项目商务交接与工程报价边界。",
      stage: { id: "project_sales", label: "项目与商务", agent: "Project Sales Engineer", gate: "G12" },
    });
    expect(candidate).toMatchObject({ title: "项目与商务交接包", stageId: "project_sales", evidence: ["INPUT-task-prompt", "RULE-G12"] });
  });

  it("turns model placeholder shorthand into explicit validation assumptions without inventing values", async () => {
    const candidateJson = JSON.stringify({
      title: "需求工程候选产出",
      body: "本阶段范围覆盖功能需求、性能需求和接口需求。当前现场节拍为 TBD，接口清单为待定，均不得作为已确认事实；应登记为待验证假设（需客户确认）。风险是输入版本和样件边界未冻结，下一阶段交接包含输入清单、验收边界和版本哈希。",
      evidence: ["INPUT-task-prompt", "RULE-G01"],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: candidateJson } }] }), { status: 200 })));
    const provider = new MiniMaxCandidateProvider("https://api.minimax.cn/v1", "not-a-real-key", "MiniMax-M3");
    const candidate = await provider.generateCandidate({
      taskId: "task-1", prompt: "建立需求工程边界。",
      stage: { id: "requirements", label: "需求工程", agent: "Requirement Engineer", gate: "G01" },
    });
    expect(candidate.body).not.toMatch(/TBD|待定/i);
    expect(candidate.body).toContain("待验证假设");
  });

  it("converts an upstream abort into a retryable timeout code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    const provider = new MiniMaxCandidateProvider("https://api.minimax.cn/v1", "not-a-real-key", "MiniMax-M3");
    await expect(provider.generateCandidate({
      taskId: "task-1", prompt: "验证上游超时能够进入后台重试。", stage: { id: "requirements", label: "需求工程", agent: "Requirement Engineer", gate: "G01" },
    })).rejects.toThrow("UPSTREAM_TIMEOUT");
  });
});
