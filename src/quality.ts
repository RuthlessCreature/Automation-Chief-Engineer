import type { CandidateArtifact } from "./domain";

export type QualityDecision = { pass: true } | { pass: false; reasons: readonly string[] };

export const UNRESOLVED_PLACEHOLDER_PATTERN = /(?:\bTBD\b|\bTODO\b|\bN\/A\b|待定|待补充|待填写|待回填|留待.{0,16}(?:回填|归档|生成|补充)|(?:后续|稍后).{0,10}(?:补充|回填|填写))/i;
export const REASONING_LEAK_PATTERN = /<\/?think>|(?:^|\n)\s*(?:analysis|reasoning|思考过程)\s*:/i;
export const QUALITY_POLICY_VERSION = "GB-ACE-DELIVERY-V22-IDEMPOTENT-CAD-REFRESH";

const UNSUPPORTED_COMPLETION_PATTERN = /(?:已|已经)(?:测试|实测|签核|归档|出图|报价|归集|定义|写入|关闭|测得|证明|核对)|(?:已|已经)验证.{0,10}(?:性能|功能|指标|准确率|节拍|验收|样件|缺陷|检测结果)|(?:已|已经)完成.{0,12}(?:试制|FAT|SAT|MSA|GR\/?R|GR&R|POC|验收|验证|测试|实测|测量|签核)|(?:已|已经)通过.{0,10}(?:试制|FAT|SAT|MSA|GR\/?R|GR&R|POC|验收|测试|实测|测量)|(?:已|已经)通过.{0,10}(?<!待)验证|(?:试制|FAT|SAT|MSA|GR\/?R|GR&R|POC|验收|验证|测试).{0,8}(?:已|已经)通过/i;
// Quantitative claims must carry an engineering unit. Without that requirement,
// references such as G01/G12 in a missing-input sentence were misread as values.
const UNSUPPORTED_METRIC_PATTERN = /(?:检出率|检出准确率|误检率|漏检率|良率|OEE|产能|产量|节拍|定位精度|定位误差).{0,18}\d+(?:\.\d+)?\s*(?:%|ppm|mm|μm|um|秒|s|件|pcs)/i;
const UNSOURCED_ENGINEERING_SPEC_PATTERN = /(?:接口|供电|电源|电压|电流|气压|工作压力|气源).{0,24}\d+(?:\.\d+)?\s*(?:VDC|VAC|V|MPa|bar|A|L\/min)(?![a-z])/i;
const QUALIFIED_METRIC_CONTEXT = /(?:假设|假定|示例|目标|计划|规划|建议|预估|估算|测算|计算|基准|待验证|需验证|需确认|客户确认|未执行|未实测|未验证|不得|禁止|参考值)/i;
const UNSOURCED_DEFAULT_METRIC_PATTERN = /(?:行业(?:典型|常用|惯例)|业内(?:典型|常用)|缺省|默认|经验值).{0,60}\d+(?:\.\d+)?\s*(?:%|ppm|mm|μm|µm|um|秒|s|件|pcs|OEE)?/i;
const UNRESOLVED_OPTION_PATTERN = /(?:\bN\b|\bX\b)\s*(?:待|由.{0,12}(?:确定|确认|冻结|选定))|(?:任选其一|二选一|三选一|待选型|待方案确定|任一均可|任意一种|可任选|均可|待用户选择|中选取|择一|候选方案)|(?:接口|选型|触发|光源|相机|控制|方案|方式|基线|规格|协议|夹紧|支承|图像输出)\s*(?::|：|为|采用|以|选择|选用)[^。；;\n]{0,24}(?:或|\/)[^。；;\n]{0,20}(?:为基线|作为基线|均可|由.{0,12}(?:决定|确定|确认)|待|需确认|不下结论|中选取|作为|选择)/i;
const DEFERRED_WORK_PATTERN = /(?:待(?:验证|确认|测绘|定标|用户|客户|现场|补齐|回填|闭环|实测|选择|确定)|(?:需|需要)(?:用户|客户|现场).{0,18}(?:提供|确认|选择|验证|实测)|(?:由用户|客户).{0,18}(?:提供|确认)|(?:后续|下一阶段|后续阶段|G\d{2}).{0,24}(?:待|需.{0,8}(?:确认|提供|验证|闭环|定标|选型)|必须.{0,8}(?:确认|闭环)|确认后|验证后)|(?:需|需要).{0,8}(?:后续|下一阶段|后续阶段|G\d{2}).{0,12}(?:确认|闭环|补齐|定标|选型|验证|提供|实测)|(?:未确认|未冻结|未锁定|尚未确定|不下结论))/i;
const UNIT_BEARING_MEASUREMENT_PATTERN = /(?:[<>≤≥~≈±]?\s*\d+(?:\.\d+)?\s*(?:millimeters?|mm|毫米|centimeters?|cm|厘米|micrometers?|microns?|μm|µm|um|微米|nanometers?|nm|纳米|inches?|英寸|英尺|feet|foot|ft|meters?|metres?|米|mils?|mil|m)(?![a-z0-9])|\bM\d+(?:\s*[x×]\s*\d+(?:\.\d+)?)?|[Ø⌀φ]\s*\d+(?:\.\d+)?|\bR\s*=?\s*\d+(?:\.\d+)?(?![\d\-–—:：])|\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?)/i;
const RAW_COORDINATE_DIMENSION_PATTERN = /(?:尺寸|长度|宽度|高度|厚度|边长|直径|半径|工作距离|视场|bbox|坐标|缺陷.{0,5}尺寸).{0,25}[<>≤≥~≈±]?\s*\d+(?:\.\d+)?(?:\s*[~～–—-]\s*\d+(?:\.\d+)?)?\s*(?:units?|单位|坐标单位)(?![a-z0-9])/i;
const UNCONFIRMED_UNIT_ASSUMPTION_PATTERN = /(?:(?:假设|暂按|默认|认定|推定).{0,35}(?:STEP|CAD|模型|几何|图纸)?.{0,15}(?:单位|unit).{0,20}(?:毫米|millimeters?|mm|厘米|centimeters?|cm|英寸|inches?|米|meters?|metres?|m)(?![a-z0-9])|(?:STEP|CAD|模型|几何|图纸).{0,15}(?:单位|unit).{0,12}(?:暂按|假设|默认|认定|推定).{0,12}(?:毫米|millimeters?|mm|厘米|centimeters?|cm|英寸|inches?|米|meters?|metres?|m)(?![a-z0-9]))/i;
const UNSOURCED_PRICE_PATTERN = /(?:[¥￥]\s*\d|\bCNY\s*\d|人民币\s*\d|(?:单价|总价|报价|价格|成本价|市场价|中位价|采购价).{0,24}\d+(?:\.\d+)?\s*(?:元|万元|RMB|CNY)?)/i;
const UNSOURCED_VENDOR_ID_PATTERN = /(?:(?:供应商|厂商|品牌)\s*[:：]\s*[^\s，,；;。]{2,}|(?:型号|料号|物料号|订货号|P\s*\/?\s*N|SKU)\s*[:：]?\s*[A-Z\d][A-Z\d._/-]{2,})/i;
const UNNAMED_VENDOR_PATTERN = /(?:供应商|厂商|品牌|型号|料号|物料号|订货号|P\s*\/?\s*N|SKU)\s*[:：]?\s*(?:未询价|未取得报价|尚无报价|无报价证据|不提供具体|不指定|待正式询价|需正式报价|需取得正式报价|未选定供应商)/i;

type StageContract = { id: string; required: readonly RegExp[]; labels: readonly string[] };

const STAGE_CONTRACTS: Record<string, StageContract> = {
  intake: { id: "G00", required: [/输入.{0,8}(?:清单|完整|边界)|(?:完整|清单).{0,8}输入/i, /任务\s*(?:ID|标识)|任务追溯|追溯链路|输入可追溯/i, /缺失|待验证/i], labels: ["输入完整性", "任务追溯", "缺失项登记"] },
  requirements: { id: "G01", required: [/功能.{0,6}(?:需求|要求)/i, /性能.{0,6}(?:需求|要求)/i, /接口.{0,6}(?:需求|要求)/i], labels: ["功能需求", "性能需求", "接口需求"] },
  feasibility: { id: "G03", required: [/架构/i, /相机/i, /光源/i, /PLC|控制/i], labels: ["系统架构", "相机", "光源", "控制接口"] },
  vision: { id: "G04", required: [/缺陷/i, /相机/i, /镜头/i, /光源/i, /ROI/i], labels: ["缺陷目录", "相机", "镜头", "光源", "ROI"] },
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
  const reasons: string[] = [];
  if (/\bTBD\b/i.test(body)) reasons.push("TBD");
  if (/\bTODO\b/i.test(body)) reasons.push("TODO");
  if (/\bN\/A\b/i.test(body)) reasons.push("N/A");
  if (/待定/.test(body)) reasons.push("待定");
  if (/待补充|待填写|待回填|留待.{0,16}(?:回填|归档|生成|补充)|(?:后续|稍后).{0,10}(?:补充|回填|填写)/i.test(body)) reasons.push("未完成的回填占位");
  if (UNRESOLVED_OPTION_PATTERN.test(body) || DEFERRED_WORK_PATTERN.test(body)) reasons.push("未闭环的变量、方案选择或待办事项");
  return reasons;
}

export function findUnsupportedClaims(body: string): string[] {
  const sentences = body.split(/(?<=[。！？!?；;\n])\s*/);
  const reasons = new Set<string>();
  for (const sentence of sentences) {
    const negatedOrPlanned = /(?:未执行|未完成|未验证|未测试|未实测|未输出|未声明|未声称|未宣称|不声明|不声称|不宣称|尚未|不得|不能|不应|不构成|不代表|不属于|不视为|不预设|不输出|不出具|并非|禁止|计划|规划|假设|示例|建议|假装)/i.test(sentence);
    if (UNSUPPORTED_COMPLETION_PATTERN.test(sentence) && !negatedOrPlanned) reasons.add("unsupported completed-test claim detected");
    const withoutGateIds = sentence
      .replace(/\b(?:G\d{2}(?:\/G?\d{2})?|R-\d{2}|OI-\d{3})\b/g, "")
      .replace(/\b(?:RULE|INPUT)-[A-Z0-9_-]+\b/gi, "");
    if (UNSUPPORTED_METRIC_PATTERN.test(withoutGateIds) && !QUALIFIED_METRIC_CONTEXT.test(sentence)) reasons.add("quantitative performance claim lacks an assumption or evidence qualifier");
    if (UNSOURCED_ENGINEERING_SPEC_PATTERN.test(sentence) && !QUALIFIED_METRIC_CONTEXT.test(sentence)) reasons.add("quantified engineering specification lacks a source or explicit assumption");
    if (UNSOURCED_DEFAULT_METRIC_PATTERN.test(withoutGateIds)) reasons.add("industry/default numeric metric cannot become a requirement without source-content verification");
  }
  return [...reasons];
}

// This gate intentionally knows nothing about provider confidence. Evidence and contract fields win.
export function evaluateCandidate(candidate: CandidateArtifact, requiredEvidenceRefs: readonly string[] = [], unconfirmedCadUnits = false, trustedQuoteEvidenceRefs: readonly string[] = []): QualityDecision {
  const reasons: string[] = [];
  if (!candidate.title.trim()) reasons.push("artifact title is required");
  if (candidate.body.trim().length < 120) reasons.push("artifact body is too short to be reviewable");
  if (candidate.evidence.length < 2) reasons.push("at least two traceable evidence references are required");
  if (candidate.evidence.some((entry) => !entry.startsWith("INPUT-") && !entry.startsWith("RULE-"))) {
    reasons.push("evidence must reference immutable inputs or governed rules");
  }
  for (const ref of requiredEvidenceRefs) {
    if (!candidate.evidence.includes(ref)) reasons.push(`missing required source reference: ${ref}`);
  }
  const controlledText = [candidate.title, candidate.body, ...candidate.evidence].join("\n");
  if (findUnresolvedPlaceholders(controlledText).length > 0) reasons.push("unresolved placeholder detected");
  reasons.push(...findUnsupportedClaims(candidate.body));
  if (candidate.stageId === "bom_cost") {
    reasons.push(...findUnsupportedCommercialClaims(candidate.body, trustedQuoteEvidenceRefs));
  }
  if (unconfirmedCadUnits && findUnconfirmedUnitClaims(`${candidate.title}\n${candidate.body}`).length > 0) {
    reasons.push("CAD source units are unconfirmed; numeric physical lengths/threads must not be stated");
  }
  if (REASONING_LEAK_PATTERN.test(controlledText)) reasons.push("model reasoning leaked into candidate");
  if (!candidate.provider || !candidate.model) reasons.push("provider provenance is required");
  if (reasons.length) return { pass: false, reasons };
  return evaluateStageDeliverable(candidate);
}

/**
 * BOM commercial claims need a server-verified quotation/procurement source,
 * not merely a model-authored INPUT citation or a qualifier such as “estimate”.
 * Explicitly unquoted planning boundaries remain permissible, but cannot be
 * confused with an actual priced/sourced BOM.
 */
export function findUnsupportedCommercialClaims(body: string, trustedQuoteEvidenceRefs: readonly string[] = []): string[] {
  const refs = trustedQuoteEvidenceRefs.filter((ref) => /^INPUT-FILE-[\w-]+$/.test(ref));
  const sentences = body.split(/(?<=[。！？!?；;\n])\s*/);
  const reasons = new Set<string>();
  for (const sentence of sentences) {
    const containsQuoteRef = refs.some((ref) => sentence.includes(ref));
    if (UNSOURCED_PRICE_PATTERN.test(sentence) && !containsQuoteRef) reasons.add("BOM price/quotation claim has no server-verified quote source");
    if (UNSOURCED_VENDOR_ID_PATTERN.test(sentence) && !containsQuoteRef && !UNNAMED_VENDOR_PATTERN.test(sentence)) reasons.add("BOM supplier/brand/model/part-number claim has no server-verified procurement source");
  }
  return [...reasons];
}

export function findUnconfirmedUnitClaims(body: string): string[] {
  const withoutProvenance = body.replace(/^\s*(?:[-*#>]\s*)?(?:提供方|模型提供方|provider|model)\s*[:：].*$/gim, "");
  const claims = withoutProvenance.split(/(?<=[。！？!?；;\n])\s*/);
  return claims.filter((sentence) => {
    const withoutStageIds = sentence.replace(/\bG\d{2}(?:\/G?\d{2})?\b/g, "GATE-ID");
    return UNIT_BEARING_MEASUREMENT_PATTERN.test(withoutStageIds)
      || RAW_COORDINATE_DIMENSION_PATTERN.test(withoutStageIds)
      || UNCONFIRMED_UNIT_ASSUMPTION_PATTERN.test(withoutStageIds);
  });
}

export function hasUnconfirmedCadUnits(unitStatuses: readonly (string | null | undefined)[]): boolean {
  return unitStatuses.length > 0 && unitStatuses.some((status) => String(status ?? "UNCONFIRMED").toUpperCase() !== "CONFIRMED");
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
  const missing = contract.required.flatMap((pattern, index) => pattern.test(body) ? [] : [contract.labels[index] ?? contract.id]);
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
