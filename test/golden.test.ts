import { describe, expect, it } from "vitest";
import { compareArtifactToGolden } from "../src/golden";

describe("Golden Comparator", () => {
  it("scores an evidence-backed engineering candidate and exposes the GPT-SOL reference state", () => {
    const result = compareArtifactToGolden({
      id: "a", taskId: "t", stageId: "vision", title: "机器视觉方案",
      body: "视觉检测阶段需要根据输入样件建立相机、镜头、光源和视场边界。当前尺寸和缺陷样本数量属于待验证假设，需由客户补充样件与AQL基准；风险包括反光、遮挡和接口节拍，下一阶段交接为机械定位接口、PLC信号和验证用例。".repeat(4),
      evidence: ["INPUT-task-prompt", "RULE-G04"], provider: "minimax", model: "MiniMax-M3",
    });
    expect(result.minimaxScore).toBeGreaterThanOrEqual(70);
    expect(result.gptSolStatus).toBe("REFERENCE_BASELINE");
    expect(result.gptSolScore).toBeNull();
    expect(result.deliveryAllowed).toBe(true);
  });

  it("blocks placeholder or unsupported claims", () => {
    const result = compareArtifactToGolden({
      id: "a", taskId: "t", stageId: "vision", title: "草案", body: "TBD，客户已确认，暂无更多信息。", evidence: ["INPUT-task-prompt"], provider: "minimax", model: "MiniMax-M3",
    });
    expect(result.deliveryAllowed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
