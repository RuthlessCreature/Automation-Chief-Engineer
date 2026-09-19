export const taskStates = [
  "DRAFT",
  "QUEUED",
  "RUNNING",
  "QUALITY_BLOCKED",
  "PACKAGING",
  "PACKAGED",
  "FAILED",
] as const;

export type TaskState = (typeof taskStates)[number];
export type QualityStatus = "PENDING" | "PASS" | "BLOCKED";

export type PipelineStage = {
  id: string;
  label: string;
  agent: string;
  gate: string;
};

// This order is part of the product contract. A model cannot mark a missing stage N/A.
export const PIPELINE: readonly PipelineStage[] = [
  { id: "intake", label: "需求接收与输入完整性", agent: "Intake Router", gate: "G00" },
  { id: "requirements", label: "需求工程", agent: "Requirement Engineer", gate: "G01" },
  { id: "feasibility", label: "可行性架构", agent: "Feasibility Architect", gate: "G03" },
  { id: "vision", label: "机器视觉", agent: "Vision Engineer", gate: "G04" },
  { id: "mechanical", label: "机械方案", agent: "Mechanical Engineer", gate: "G05" },
  { id: "electrical", label: "电控与安全", agent: "Electrical Control Engineer", gate: "G06" },
  { id: "software_mes", label: "软件与 MES", agent: "Software MES Engineer", gate: "G07" },
  { id: "product_cad", label: "产品 CAD", agent: "Product CAD Engineer", gate: "G02" },
  { id: "ct_capacity", label: "节拍与产能", agent: "CT Capacity Engineer", gate: "G08" },
  { id: "bom_cost", label: "BOM 与制造成本", agent: "BOM Cost Engineer", gate: "G09" },
  { id: "digital_twin", label: "数字孪生渲染", agent: "Digital Twin Renderer", gate: "G10" },
  { id: "validation", label: "验证与质量", agent: "Validation Engineer", gate: "G11" },
  { id: "project_sales", label: "项目与商务", agent: "Project Sales Engineer", gate: "G12" },
  { id: "documentation", label: "文档受控汇编", agent: "Documentation Engineer", gate: "G13" },
  { id: "chief_review", label: "总工审查与交付打包", agent: "Chief Reviewer", gate: "G14/G15" },
];

export type TaskEvent = {
  seq: number;
  type: "TASK_STATE" | "STAGE_STARTED" | "HARNESS_ATTEMPT" | "STAGE_OUTPUT" | "STAGE_GATED" | "QUALITY_BLOCKED" | "DELIVERY_READY";
  stageId?: string;
  message: string;
  payload: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type CandidateArtifact = {
  id: string;
  taskId: string;
  stageId: string;
  title: string;
  body: string;
  evidence: readonly string[];
  provider: string;
  model: string;
};
