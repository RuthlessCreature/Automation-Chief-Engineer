import { describe, expect, it } from "vitest";
import type { CandidateArtifact, PipelineStage } from "../src/domain";
import { runStageHarness } from "../src/harness";
import type { ModelProvider } from "../src/provider";

const stage: PipelineStage = { id: "product_cad", label: "产品 CAD", agent: "Product CAD Engineer", gate: "G02" };

function candidate(body: string, attempt: number): CandidateArtifact {
  return {
    id: `candidate-${attempt}`,
    taskId: "task-harness",
    stageId: stage.id,
    title: "受控 CAD 候选",
    body,
    evidence: ["INPUT-task-prompt", "RULE-G02"],
    provider: "fixture",
    model: "fixture-v1",
  };
}

const validBody = "本阶段建立产品 CAD 的输入边界、几何接口与验证流程，明确外形包络、安装接口、坐标基准和孔位。当前仅依据用户提供的任务提示和受控输入，不把缺失尺寸写成已确认事实。假设是 STEP/STL 几何需要先进行拓扑检查和单位确认；风险包括网格非水密、坐标系不一致和装配接口遗漏。下一阶段交接包括 BREP 报告、特征清单、版本哈希、验证责任人与验收条件。".repeat(3);

describe("stage harness", () => {
  it("repairs a placeholder candidate before accepting and persisting it", async () => {
    let calls = 0;
    const phases: string[] = [];
    const provider: ModelProvider = {
      name: "fixture",
      async generateCandidate(input) {
        calls += 1;
        expect(input.attempt).toBe(calls);
        if (calls === 1) return candidate(`${validBody}\n字段：TBD`, calls);
        expect(input.feedback?.length).toBeGreaterThan(0);
        return candidate(validBody, calls);
      },
    };
    const result = await runStageHarness({ provider, taskId: "task-harness", prompt: "建立产品 CAD 受控输入和 BREP 检验边界。", stage, onAttempt: (attempt) => { phases.push(`${attempt.attempt}:${attempt.phase}`); return Promise.resolve(); } });
    expect(result.status).toBe("ACCEPTED");
    expect(result.attempts).toBe(2);
    expect(calls).toBe(2);
    expect(phases).toEqual(["1:GENERATING", "1:REJECTED", "2:GENERATING", "2:ACCEPTED"]);
  });

  it("blocks after the bounded repair budget instead of returning a dirty candidate", async () => {
    const provider: ModelProvider = {
      name: "fixture",
      async generateCandidate(input) {
        return candidate(`${validBody}\n字段：待定（第 ${input.attempt} 次）`, input.attempt ?? 1);
      },
    };
    const result = await runStageHarness({ provider, taskId: "task-harness", prompt: "建立产品 CAD 受控输入和 BREP 检验边界。", stage });
    expect(result).toMatchObject({ status: "QUALITY_BLOCKED", attempts: 3 });
    expect((result as { reasons: string[] }).reasons.join(" ")).toContain("unresolved placeholder detected");
  });

  it("keeps provider-format failures inside the stage harness", async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: "fixture",
      async generateCandidate(input) {
        calls += 1;
        if (calls === 1) throw new Error("MINIMAX_NON_JSON_CANDIDATE");
        expect(input.feedback?.join(" ")).toContain("valid JSON");
        return candidate(validBody, calls);
      },
    };
    const result = await runStageHarness({ provider, taskId: "task-harness", prompt: "建立产品 CAD 受控输入和 BREP 检验边界。", stage });
    expect(result.status).toBe("ACCEPTED");
    expect(result.attempts).toBe(2);
  });
});
