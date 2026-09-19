import type { CandidateArtifact } from "./domain";

export type QualityDecision = { pass: true } | { pass: false; reasons: readonly string[] };

export const UNRESOLVED_PLACEHOLDER_PATTERN = /(?:TBD|TODO|N\/A|待定)/i;
export const REASONING_LEAK_PATTERN = /<\/?think>|(?:^|\n)\s*(?:analysis|reasoning|思考过程)\s*:/i;
export const QUALITY_POLICY_VERSION = "GB-ACE-DELIVERY-V3-GOLDEN-121";

type StageContract = { id: string; required: readonly RegExp[]; labels: readonly string[] };

const STAGE_CONTRACTS: Record<string, StageContract> = {
  intake: { id: "G00", required: [/输入.{0,8}(?:清单|完整|边界)|(?:完整|清单).{0,8}输入/i, /任务\s*(?:ID|标识)|输入可追溯/i, /缺失|待验证/i], labels: ["输入完整性", "任务追溯", "缺失项登记"] },
  requirements: { id: "G01", required: [/功能.{0,6}(?:需求|要求)/i, /性能.{0,6}(?:需求|要求)/i, /接口.{0,6}(?:需求|要求)/i], labels: ["功能需求", "性能需求", "接口需求"] },
  feasibility: { id: "G03", required: [/架构/i, /相机/i, /光源/i, /PLC|控制/i], labels: ["系统架构", "视觉选型", "控制接口"] },
  vision: { id: "G04", required: [/缺陷/i, /相机/i, /镜头/i, /光源/i, /ROI/i], labels: ["缺陷目录", "相机镜头", "光学照明", "ROI"] },
  mechanical: { id: "G05", required: [/布局/i, /夹具|定位/i, /机架|防护/i, /接口/i], labels: ["整机布局", "夹具定位", "防护机架", "接口"] },
  electrical: { id: "G06", required: [/PLC/i, /I\/?O/i, /急停|安全回路/i, /接地|EMC/i], labels: ["PLC", "IO", "安全回路", "EMC接地"] },
  software_mes: { id: "G07", required: [/HMI/i, /MES/i, /追溯/i, /报警/i], labels: ["HMI", "MES", "追溯", "报警"] },
  product_cad: { id: "G02", required: [/外形|包络/i, /安装接口/i, /坐标|孔位/i, /CAD/i], labels: ["外形包络", "安装接口", "坐标孔位", "CAD"] },
  ct_capacity: { id: "G08", required: [/节拍/i, /产能/i, /瓶颈/i, /工时|秒\/件/i], labels: ["节拍", "产能", "瓶颈", "工时"] },
  bom_cost: { id: "G09", required: [/BOM/i, /数量/i, /成本/i, /供应商/i], labels: ["BOM", "数量", "成本", "供应商"] },
  digital_twin: { id: "G10", required: [/渲染|可视化/i, /坐标/i, /视图|镜头/i, /资产/i], labels: ["渲染", "坐标基准", "视图", "资产"] },
  validation: { id: "G11", required: [/FAT|验收/i, /MSA|GRR|Kappa/i, /测试|验证矩阵/i, /首件/i], labels: ["FAT验收", "MSA/GRR", "验证矩阵", "首件"] },
  project_sales: { id: "G12", required: [/报价|成本/i, /里程碑/i, /验收/i, /交接/i], labels: ["报价成本", "里程碑", "验收", "交接"] },
  documentation: { id: "G13", required: [/文档/i, /版本|修订/i, /汇编|目录/i, /交付/i], labels: ["文档", "版本修订", "汇编", "交付"] },
  chief_review: { id: "G14/G15", required: [/审查/i, /完整性/i, /哈希|文件/i, /签核|交付/i], labels: ["审查", "完整性", "文件哈希", "签核交付"] },
};

export function stageContractLabels(stageId: string): readonly string[] {
  return STAGE_CONTRACTS[stageId]?.labels ?? [];
}

export function findUnresolvedPlaceholders(body: string): string[] {
  const matches = body.match(/TBD|TODO|N\/A|待定/gi) ?? [];
  return [...new Set(matches.map((item) => item.toUpperCase() === "待定" ? "待定" : item.toUpperCase()))];
}

// This gate intentionally knows nothing about provider confidence. Evidence and contract fields win.
export function evaluateCandidate(candidate: CandidateArtifact): QualityDecision {
  const reasons: string[] = [];
  if (!candidate.title.trim()) reasons.push("artifact title is required");
  if (candidate.body.trim().length < 120) reasons.push("artifact body is too short to be reviewable");
  if (candidate.evidence.length < 2) reasons.push("at least two traceable evidence references are required");
  if (candidate.evidence.some((entry) => !entry.startsWith("INPUT-") && !entry.startsWith("RULE-"))) {
    reasons.push("evidence must reference immutable inputs or governed rules");
  }
  const controlledText = [candidate.title, candidate.body, ...candidate.evidence].join("\n");
  if (UNRESOLVED_PLACEHOLDER_PATTERN.test(controlledText)) reasons.push("unresolved placeholder detected");
  if (REASONING_LEAK_PATTERN.test(controlledText)) reasons.push("model reasoning leaked into candidate");
  if (!candidate.provider || !candidate.model) reasons.push("provider provenance is required");
  if (reasons.length) return { pass: false, reasons };
  return evaluateStageDeliverable(candidate);
}

/**
 * A model-shaped paragraph is not a stage deliverable. This gate requires a
 * small, stage-specific vocabulary before a candidate can become a checkpoint.
 * It is deliberately deterministic; actual files (CAD, drawings, BOM, FAT)
 * are checked again by the delivery assembler.
 */
export function evaluateStageDeliverable(candidate: CandidateArtifact): QualityDecision {
  const contract = STAGE_CONTRACTS[candidate.stageId];
  if (!contract) return { pass: false, reasons: [`no stage contract registered for ${candidate.stageId}`] };
  const body = candidate.body.trim();
  const reasons: string[] = [];
  if (body.length < 420) reasons.push(`${contract.id} stage body is too short for a governed handoff`);
  if (body.includes("<think>") || body.includes("</think>") || body.includes('{"title"')) reasons.push("candidate contains transport/debug content");
  const missing = contract.required.filter((pattern) => !pattern.test(body)).map((_, index) => contract.labels[index] ?? contract.id);
  if (missing.length) reasons.push(`${contract.id} missing stage deliverable signals: ${missing.join(", ")}`);
  return reasons.length ? { pass: false, reasons } : { pass: true };
}

export async function sha256(input: string | ArrayBuffer | ArrayBufferView): Promise<string> {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
