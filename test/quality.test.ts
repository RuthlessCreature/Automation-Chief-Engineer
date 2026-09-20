import { describe, expect, it } from "vitest";
import { evaluateCandidate, stageContractLabels } from "../src/quality";
import { hashPassword, verifyPassword } from "../src/security";

describe("independent candidate quality gate", () => {
  it("accepts a traceable, substantive candidate", () => {
    const decision = evaluateCandidate({
      id: "a", taskId: "task", stageId: "requirements", title: "需求基线", provider: "fixture", model: "fixture-v1",
      body: ("这是一个可评审的需求工程方案候选。它明确列出功能需求、性能需求、接口需求、约束、假设、输入追溯、风险和下一阶段的交接内容。所有事实均需要继续验证，而不是假装已经验证。总工会依据输入资料和受控规则进行独立的质量检查，从而防止低质量模型用空泛表述蒙混过关。候选还说明输入不足时应当如何提出澄清、哪些指标必须由客户确认、以及哪些结论只能作为概念设计。这样审核人可以复核工程边界，也可以判断后续阶段是否具备安全的交接条件。对功能、性能、接口和版本约束均给出负责人、证据类型与验收动作，保证后续阶段能够按清单执行。 ").repeat(2),
      evidence: ["INPUT-task-prompt", "RULE-G01"],
    });
    expect(decision).toEqual({ pass: true });
  });

  it("rejects placeholder content even if a provider claims success", () => {
    const decision = evaluateCandidate({
      id: "a", taskId: "task", stageId: "requirements", title: "草案", provider: "minimax", model: "m3",
      body: "TODO：后续再补充。这个文件还没有达到评审所需的信息量，也没有提供完整的、可追溯的工程结论。",
      evidence: ["INPUT-task-prompt"],
    });
    expect(decision).toEqual({ pass: false, reasons: expect.arrayContaining(["at least two traceable evidence references are required", "unresolved placeholder detected"]) });
  });

  it("keeps G04 repair labels aligned with the deterministic signals", () => {
    expect(stageContractLabels("vision")).toEqual(["缺陷目录", "相机", "镜头", "光源", "ROI"]);
    const decision = evaluateCandidate({
      id: "v", taskId: "task", stageId: "vision", title: "视觉方案", provider: "fixture", model: "fixture-v1",
      body: ("缺陷目录覆盖漏贴、偏贴、皱褶与外观脏污；相机采用面阵方案，镜头依据视野和工作距离选型，ROI按工位区域分区并记录坐标。输入可追溯到任务提示，当前尺寸与速度均作为需客户确认的假设；风险包括反光、遮挡与运动模糊；下一阶段交接包括成像距离、触发接口、检测节拍和验证样本。 ").repeat(4),
      evidence: ["INPUT-task-prompt", "RULE-G04"],
    });
    expect(decision).toEqual({ pass: false, reasons: ["G04 missing stage deliverable signals: 光源"] });
  });

  it("rejects a generic long paragraph that does not implement the stage contract", () => {
    const decision = evaluateCandidate({
      id: "a", taskId: "task", stageId: "electrical", title: "电控方案", provider: "minimax", model: "m3",
      body: ("本阶段围绕设备方案边界、输入可追溯、假设、风险和下一阶段交接形成可审查说明。所有未确认信息均作为待验证假设登记，需由责任人补齐证据并完成验收。 ").repeat(8),
      evidence: ["INPUT-task-prompt", "RULE-G06"],
    });
    expect(decision).toEqual({ pass: false, reasons: expect.arrayContaining(["G06 missing stage deliverable signals: PLC, IO, 安全回路, EMC接地"]) });
  });
});

describe("credential primitives", () => {
  it("accepts the correct password and rejects a different password", async () => {
    const record = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", record.salt, record.hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", record.salt, record.hash)).resolves.toBe(false);
  });
});
