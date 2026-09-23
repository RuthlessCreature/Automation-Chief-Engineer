import { describe, expect, it } from "vitest";
import { evaluateCandidate, findUnconfirmedUnitClaims, findUnresolvedPlaceholders, findUnsupportedClaims, hasUnconfirmedCadUnits, stageContractLabels } from "../src/quality";
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

  it("rejects deferred fill-in language that evades literal TBD checks", () => {
    expect(findUnresolvedPlaceholders("文件哈希留待归档阶段生成后回填；责任人稍后补充。"))
      .toContain("未完成的回填占位");
    expect(findUnresolvedPlaceholders("ROI 数量 N 待算法阶段结合面分组确定；触发源在按钮和脚踏中任选其一。"))
      .toContain("未闭环的变量或方案选择");
  });

  it("rejects fabricated FAT and trial-performance results unless explicitly bounded", () => {
    expect(findUnsupportedClaims("本阶段已完成：系统架构描述、风险清单和G04交接清单。"))
      .toEqual([]);
    expect(findUnsupportedClaims("所有指标为目标值，不构成已完成的测试结论；后续需实测确认。"))
      .toEqual([]);
    expect(findUnsupportedClaims("已完成FAT验收验证，检测率已确认达到99%。"))
      .toContain("unsupported completed-test claim detected");
    expect(findUnsupportedClaims("已通过G12试制验证予以关闭；试制样件200件、检出率99.2%、误检率0.8%。"))
      .toEqual(expect.arrayContaining([
        "unsupported completed-test claim detected",
      "quantitative performance claim lacks an assumption or evidence qualifier",
      ]));
    expect(findUnsupportedClaims("检出率目标≥99%；当前没有实测，目标值仅作待验证假设。"))
      .toEqual([]);
    expect(findUnsupportedClaims("误判率按行业典型值取 0.1%，作为默认验收指标。"))
      .toContain("industry/default numeric metric cannot become a requirement without source-content verification");
    expect(findUnsupportedClaims("默认 OEE≥95%，引用 RULE-DOES-NOT-EXIST 作为规划参考。"))
      .toContain("industry/default numeric metric cannot become a requirement without source-content verification");
    expect(findUnsupportedClaims("默认 OEE≥95%，依据用户已提供的 INPUT-task-prompt 指标验收条款作为规划参考。"))
      .toContain("industry/default numeric metric cannot become a requirement without source-content verification");
  });

  it("does not treat gate identifiers in missing-input declarations as measured performance values", () => {
    expect(findUnsupportedClaims("误检率与漏检率上限(用户未提供,需在G01冻结前确认); 当前缺少性能数据。"))
      .toEqual([]);
    expect(findUnsupportedClaims("样件检出率99.2%、误检率0.8%，试制验证已通过G12。"))
      .toEqual(expect.arrayContaining([
        "unsupported completed-test claim detected",
        "quantitative performance claim lacks an assumption or evidence qualifier",
      ]));
  });

  it("enforces unsupported-claim rules at candidate acceptance, not only as a helper", () => {
    const body = ("功能需求、性能需求和接口需求均按输入边界形成需求工程条目；假设、风险、验证计划和下一阶段交接均可审查。 ").repeat(5)
      + "本机试制样件200件、检出率99.2%，G12验证已通过。";
    const decision = evaluateCandidate({
      id: "fabricated", taskId: "task", stageId: "requirements", title: "需求基线", provider: "minimax", model: "m3",
      body, evidence: ["INPUT-task-prompt", "RULE-G01"],
    });
    expect(decision.pass).toBe(false);
    if (decision.pass) throw new Error("fabricated claim unexpectedly passed");
    expect(decision.reasons).toContain("unsupported completed-test claim detected");
    expect(decision.reasons).toContain("quantitative performance claim lacks an assumption or evidence qualifier");
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

  it("accepts equivalent G00 task-traceability wording without requiring one exact phrase", () => {
    const body = ("本阶段形成输入完整性快照和任务追溯记录。任务追溯包括工单编号、来源、上游输入和下游交接。缺失项登记按责任阶段列出待验证数据及关闭条件。 ").repeat(12);
    const decision = evaluateCandidate({
      id: "intake-trace", taskId: "task", stageId: "intake", title: "输入受理记录", provider: "fixture", model: "fixture-v1",
      body, evidence: ["INPUT-task-prompt", "RULE-G00"],
    });
    expect(decision).toEqual({ pass: true });
  });

  it("blocks physical dimensions when CAD units are unconfirmed but permits explicit no-unit warnings", () => {
    expect(findUnconfirmedUnitClaims("划痕阈值≥0.3mm；工作距离建议120–200 mm。"))
      .toHaveLength(2);
    expect(findUnconfirmedUnitClaims("孔位采用 M6 螺纹、M4×0.7；外壳尺寸约 2.1 inches，孔径 Ø8。"))
      .toHaveLength(2);
    expect(findUnconfirmedUnitClaims("0.3毫米；涂层厚度 25 µm；整体长度 0.05 m；检具离 2 meters。"))
      .toHaveLength(4);
    expect(findUnconfirmedUnitClaims("半径 R5；外形 2 × 5 × 3。"))
      .toHaveLength(2);
    expect(findUnconfirmedUnitClaims("风险登记：R1-手动波动；R2-定位重复性；R3-表面高光；R4-样本不足。"))
      .toEqual([]);
    expect(findUnconfirmedUnitClaims("最小可检缺陷尺寸约 0.2 unit；工作距离 250–400 单位。"))
      .toHaveLength(2);
    expect(findUnconfirmedUnitClaims("5 units per carton; 5 个单位预算。"))
      .toEqual([]);
    expect(findUnconfirmedUnitClaims("STEP 单位未确认，禁止标注 mm；bbox 原始值仅作坐标数据。"))
      .toEqual([]);
    expect(findUnconfirmedUnitClaims("假设 STEP 文件单位为 mm，但 CADCore 标注 unitStatus=UNCONFIRMED。"))
      .toHaveLength(1);
    expect(findUnconfirmedUnitClaims("STEP 单位暂按 mm。"))
      .toHaveLength(1);
    expect(findUnconfirmedUnitClaims("G04 进度 15/15；CADCore 确认 4 solids、397 faces、2130 edges。"))
      .toEqual([]);
    expect(hasUnconfirmedCadUnits([])).toBe(false);
    expect(hasUnconfirmedCadUnits(["CONFIRMED", "UNCONFIRMED"])).toBe(true);
    expect(hasUnconfirmedCadUnits(["CONFIRMED", null])).toBe(true);
    expect(hasUnconfirmedCadUnits(["CONFIRMED", "CONFIRMED"])).toBe(false);
    const body = ("功能需求、性能需求和接口需求均以输入边界、风险、责任人与下一阶段交接组织。 ").repeat(18)
      + "STEP 单位未确认，但划痕阈值≥0.3mm。";
    const decision = evaluateCandidate({
      id: "unit-claim", taskId: "task", stageId: "requirements", title: "需求基线", provider: "minimax", model: "m3",
      body, evidence: ["INPUT-task-prompt", "RULE-G01"],
    }, [], true);
    expect(decision.pass).toBe(false);
    if (decision.pass) throw new Error("unconfirmed CAD dimension unexpectedly passed");
    expect(decision.reasons).toContain("CAD source units are unconfirmed; numeric physical lengths/threads must not be stated");

    const assumedUnitDecision = evaluateCandidate({
      id: "unit-assumption", taskId: "task", stageId: "requirements", title: "需求基线",
      body: ("功能需求、性能需求和接口需求均以输入边界、风险、责任人与下一阶段交接组织。 ").repeat(18)
        + "假设 STEP 文件单位为 mm，但 CADCore unitStatus=UNCONFIRMED。",
      evidence: ["INPUT-task-prompt", "RULE-G01"], provider: "minimax", model: "m3",
    }, [], true);
    expect(assumedUnitDecision.pass).toBe(false);
    if (assumedUnitDecision.pass) throw new Error("unit assumption unexpectedly passed");
    expect(assumedUnitDecision.reasons).toContain("CAD source units are unconfirmed; numeric physical lengths/threads must not be stated");

    const unitConfirmedDecision = evaluateCandidate({
      id: "unit-confirmed", taskId: "task", stageId: "requirements", title: "需求基线",
      body: body.replace("STEP 单位未确认，但", "单位已由输入证据确认；"),
      evidence: ["INPUT-task-prompt", "RULE-G01"], provider: "minimax", model: "m3",
    });
    expect(unitConfirmedDecision).toEqual({ pass: true });

    const defaultMetricDecision = evaluateCandidate({
      id: "unsourced-default", taskId: "task", stageId: "requirements", title: "需求基线",
      body: ("功能需求、性能需求和接口需求均以输入边界、风险、责任人与下一阶段交接组织。 ").repeat(18)
        + "误判率按行业典型值取 0.1%，作为默认验收指标。",
      evidence: ["INPUT-task-prompt", "RULE-G01"], provider: "minimax", model: "m3",
    });
    expect(defaultMetricDecision.pass).toBe(false);
    if (defaultMetricDecision.pass) throw new Error("unsourced industry metric unexpectedly passed");
    expect(defaultMetricDecision.reasons).toContain("industry/default numeric metric cannot become a requirement without source-content verification");

    const titleDecision = evaluateCandidate({
      id: "unit-title-claim", taskId: "task", stageId: "product_cad", title: "M6 螺纹方案交接",
      body: ("产品结构、接口和加工风险需依据已确认的原始几何与制造输入评估。 ").repeat(8),
      evidence: ["INPUT-task-prompt", "RULE-G02"], provider: "minimax", model: "m3",
    }, [], true);
    expect(titleDecision.pass).toBe(false);
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
