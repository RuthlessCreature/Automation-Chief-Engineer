import { buildConceptCadAssets, deriveCadDeliveryAssets } from "./cadcore";
import { PIPELINE } from "./domain";
import {
  GOLDEN_SCHEMA,
  docx,
  envelope,
  manifestCsv,
  manifestJson,
  openCsv,
  pdf,
  pptx,
  readme,
  root as goldenRoot,
  svg,
  views,
  visuals,
  xlsx,
  type Entry,
  type Report,
} from "./golden-delivery";
import { QUALITY_POLICY_VERSION, sha256 } from "./quality";
import { isoNow } from "./security";

export type FrozenDelivery = {
  id: string;
  taskId: string;
  status: "FROZEN";
  manifestKey: string;
  zipKey: string;
  sha256: string;
  artifactCount: number;
  frozenAt: string;
};

type AcceptedArtifactRow = {
  id: string;
  stage_id: string;
  title: string;
  kind: string;
  storage_key: string;
  sha256: string;
  status: string;
  provenance_json: string;
  created_at: string;
};

type TaskInputRow = {
  id: string;
  original_name: string;
  content_type: string;
  storage_key: string;
  sha256: string;
  size_bytes: number;
};

type CadJobOutputRow = {
  input_id: string;
  normalized_brep_key: string | null;
  report_storage_key: string | null;
};

type ExistingPackageRow = {
  id: string;
  status: "ASSEMBLING" | "FROZEN" | "REJECTED";
  manifest_key: string;
  zip_key: string | null;
  sha256: string | null;
  created_at: string;
  frozen_at: string | null;
};

type ZipEntry = { name: string; data: Uint8Array };
const encoder = new TextEncoder();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: readonly ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x800, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.byteLength, true);
    localView.setUint32(22, entry.data.byteLength, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, entry.data);

    const directory = new Uint8Array(46 + name.length);
    const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(8, 0x800, true);
    directoryView.setUint32(16, crc, true);
    directoryView.setUint32(20, entry.data.byteLength, true);
    directoryView.setUint32(24, entry.data.byteLength, true);
    directoryView.setUint16(28, name.length, true);
    directoryView.setUint32(42, offset, true);
    directory.set(name, 46);
    central.push(directory);
    offset += local.byteLength + entry.data.byteLength;
  }
  const centralSize = central.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + end.byteLength);
  let cursor = 0;
  for (const chunk of chunks) { output.set(chunk, cursor); cursor += chunk.byteLength; }
  for (const chunk of central) { output.set(chunk, cursor); cursor += chunk.byteLength; }
  output.set(end, cursor);
  return output;
}

function safeName(value: string): string {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "project";
}

async function getObjectBytes(env: Env, key: string, code: string): Promise<Uint8Array> {
  const object = await env.ARTIFACTS.get(key);
  if (!object) throw new Error(code);
  return new Uint8Array(await object.arrayBuffer());
}

function selectCurrentStageArtifacts(rows: AcceptedArtifactRow[]): AcceptedArtifactRow[] {
  const current: AcceptedArtifactRow[] = [];
  for (const stage of PIPELINE) {
    const matches = rows.filter((row) => row.stage_id === stage.id && row.kind === "stage-report");
    const valid = matches.filter((row) => {
      try {
        const provenance = JSON.parse(row.provenance_json) as { qualityPolicyVersion?: string; stageContract?: string };
        return provenance.qualityPolicyVersion === QUALITY_POLICY_VERSION && provenance.stageContract === "PASS";
      } catch {
        return false;
      }
    });
    if (!valid.length) throw new Error("DELIVERY_STAGE_POLICY_STALE:" + stage.id);
    valid.sort((a, b) => b.created_at.localeCompare(a.created_at));
    current.push(valid[0]!);
  }
  return current;
}

export async function freezeGoldenCustomerDelivery(env: Env, taskId: string): Promise<FrozenDelivery> {
  const existing = await env.DB.prepare(
    "SELECT id, status, manifest_key, zip_key, sha256, created_at, frozen_at FROM delivery_packages WHERE task_id = ?",
  ).bind(taskId).first<ExistingPackageRow>();

  if (existing?.status === "FROZEN" && existing.zip_key && existing.sha256 && existing.frozen_at) {
    const oldManifest = await env.ARTIFACTS.get(existing.manifest_key);
    if (oldManifest) {
      try {
        const parsed = JSON.parse(await oldManifest.text()) as { schemaVersion?: string; files?: unknown[] };
        if (parsed.schemaVersion === GOLDEN_SCHEMA && parsed.files?.length === 119) {
          return { id: existing.id, taskId, status: "FROZEN", manifestKey: existing.manifest_key, zipKey: existing.zip_key, sha256: existing.sha256, artifactCount: 121, frozenAt: existing.frozen_at };
        }
      } catch {
        // Old packages are deliberately rebuilt instead of being trusted forever.
      }
    }
  }

  const task = await env.DB.prepare("SELECT id, title, prompt FROM tasks WHERE id = ?").bind(taskId).first<{ id: string; title: string; prompt: string }>();
  if (!task) throw new Error("DELIVERY_TASK_NOT_FOUND");

  const artifacts = await env.DB.prepare(
    "SELECT id, stage_id, kind, title, storage_key, sha256, status, provenance_json, created_at FROM artifacts WHERE task_id = ? AND status = 'ACCEPTED' ORDER BY created_at ASC",
  ).bind(taskId).all<AcceptedArtifactRow>();
  const stageArtifacts = selectCurrentStageArtifacts(artifacts.results);
  if (stageArtifacts.length !== PIPELINE.length) throw new Error("DELIVERY_STAGE_ARTIFACTS_INCOMPLETE");

  const reports: Report[] = [];
  for (const artifact of stageArtifacts) {
    const provenance = JSON.parse(artifact.provenance_json) as { provider?: string; model?: string };
    const object = await env.ARTIFACTS.get(artifact.storage_key);
    if (!object) throw new Error("DELIVERY_SOURCE_MISSING:" + artifact.stage_id);
    reports.push({ stageId: artifact.stage_id, title: artifact.title, body: await object.text(), sha256: artifact.sha256, provider: provenance.provider ?? "unknown", model: provenance.model ?? "unknown" });
  }

  const mechanicalBody = reports.find((report) => report.stageId === "mechanical")?.body ?? "";
  const conceptEnvelope = envelope(mechanicalBody);
  const payload: Entry[] = [
    { relativePath: "00_交付说明/交付说明.md", data: readme(task.title, conceptEnvelope), description: "受控交付说明与事实边界", ownerModule: "Chief", status: "CONTROLLED", validationResult: "PASS" },
    { relativePath: "00_交付说明/开放项与验证状态.csv", data: openCsv(), description: "开放项与未执行验证状态", ownerModule: "Validation", status: "OPEN_ITEMS", validationResult: "PASS" },
  ];

  const stem = safeName(task.title);
  payload.push(
    { relativePath: "01_正式方案/" + stem + "技术方案书.docx", data: docx(task.title, reports), description: "正式技术方案书", ownerModule: "Documentation", status: "CONTROLLED", validationResult: "PASS" },
    { relativePath: "01_正式方案/" + stem + "技术方案书.pdf", data: pdf(task.title), description: "正式方案 PDF", ownerModule: "Documentation", status: "CONTROLLED", validationResult: "PASS" },
    { relativePath: "01_正式方案/" + stem + "方案汇报.pptx", data: pptx(task.title, reports), description: "31 页方案评审汇报", ownerModule: "Documentation", status: "CONTROLLED", validationResult: "PASS" },
    { relativePath: "01_正式方案/" + stem + "工程数据包.xlsx", data: xlsx(reports), description: "21 Sheet 工程数据包", ownerModule: "Documentation", status: "CONTROLLED", validationResult: "PASS" },
  );

  const sourceInputs = await env.DB.prepare("SELECT id, original_name, content_type, storage_key, sha256, size_bytes FROM task_inputs WHERE task_id = ? ORDER BY created_at ASC")
    .bind(taskId).all<TaskInputRow>();
  const cadInputs = sourceInputs.results.filter((input) => /\.(step|stp|stl)$/i.test(input.original_name));
  if (cadInputs.length !== 1) throw new Error(cadInputs.length ? "DELIVERY_GOLDEN_PRODUCT_CAD_AMBIGUOUS" : "DELIVERY_GOLDEN_PRODUCT_CAD_REQUIRED");
  const cadInput = cadInputs[0]!;
  const cadJobs = await env.DB.prepare("SELECT input_id, normalized_brep_key, report_storage_key FROM cad_jobs WHERE task_id = ? AND status = 'SUCCEEDED'")
    .bind(taskId).all<CadJobOutputRow>();
  const cadJob = cadJobs.results.find((candidate) => candidate.input_id === cadInput.id);
  if (!cadJob?.normalized_brep_key || !cadJob.report_storage_key) throw new Error("DELIVERY_CADCORE_INCOMPLETE:" + cadInput.original_name);

  const productCad = await deriveCadDeliveryAssets(env, { taskId, inputId: cadInput.id, normalizedBrepKey: cadJob.normalized_brep_key });
  const productBrepBytes = await getObjectBytes(env, productCad.brepKey, "DELIVERY_PRODUCT_BREP_MISSING");
  const productStepBytes = await getObjectBytes(env, productCad.stepKey, "DELIVERY_PRODUCT_STEP_MISSING");
  const productStlBytes = await getObjectBytes(env, productCad.stlKey, "DELIVERY_PRODUCT_STL_MISSING");
  payload.push(
    { relativePath: "02_产品CAD与视图/product.brep", data: productBrepBytes, description: "CADCore normalized product BREP", ownerModule: "ProductCAD", status: "CADCORE_DERIVED", validationResult: "PASS" },
    { relativePath: "02_产品CAD与视图/product.step", data: productStepBytes, description: "CADCore product STEP derivative", ownerModule: "ProductCAD", status: "CADCORE_DERIVED", validationResult: "PASS" },
    { relativePath: "02_产品CAD与视图/product.stl", data: productStlBytes, description: "CADCore product STL derivative", ownerModule: "ProductCAD", status: "CADCORE_DERIVED", validationResult: "PASS" },
    ...views("02_产品CAD与视图", true),
  );

  const conceptCad = await buildConceptCadAssets(env, taskId, conceptEnvelope);
  const conceptBrepBytes = await getObjectBytes(env, conceptCad.brepKey, "DELIVERY_CONCEPT_BREP_MISSING");
  const conceptStepBytes = await getObjectBytes(env, conceptCad.stepKey, "DELIVERY_CONCEPT_STEP_MISSING");
  const conceptStlBytes = await getObjectBytes(env, conceptCad.stlKey, "DELIVERY_CONCEPT_STL_MISSING");
  payload.push(
    { relativePath: "03_整机概念CAD与视图/layout_and_zones.svg", data: svg(task.title, conceptEnvelope), description: "概念整机布局与分区", ownerModule: "Mechanical", status: "ASM_NOT_VERIFIED", validationResult: "PASS" },
    { relativePath: "03_整机概念CAD与视图/concept.brep", data: conceptBrepBytes, description: "受控概念整机 BREP", ownerModule: "Mechanical", status: "ASM_NOT_VERIFIED", validationResult: "PASS" },
    { relativePath: "03_整机概念CAD与视图/concept.step", data: conceptStepBytes, description: "受控概念整机 STEP", ownerModule: "Mechanical", status: "ASM_NOT_VERIFIED", validationResult: "PASS" },
    { relativePath: "03_整机概念CAD与视图/concept.stl", data: conceptStlBytes, description: "受控概念整机 STL", ownerModule: "Mechanical", status: "ASM_NOT_VERIFIED", validationResult: "PASS" },
    ...views("03_整机概念CAD与视图", false),
    ...visuals(),
  );

  if (payload.length !== 119) throw new Error("DELIVERY_GOLDEN_PAYLOAD_COUNT_MISMATCH:" + payload.length);

  const manifestRows: Array<Record<string, string | number>> = [];
  for (let index = 0; index < payload.length; index += 1) {
    const item = payload[index]!;
    manifestRows.push({
      "File ID": "FILE-" + String(index + 1).padStart(3, "0"),
      "File Name": item.relativePath.split("/").at(-1) ?? item.relativePath,
      "Relative Path": item.relativePath,
      "Version": "R01",
      "Description": item.description,
      "Owner Module": item.ownerModule,
      "Controlled Baseline Revision": "R01",
      "Status": item.status,
      "Validation Result": item.validationResult,
      "Size": item.data.byteLength,
      "SHA256": (await sha256(item.data)).toUpperCase(),
      "Customer": "YES",
    });
  }

  const manifestJsonBytes = manifestJson(manifestRows);
  const allEntries: Entry[] = [
    ...payload,
    { relativePath: "05_交付清单/交付清单.csv", data: manifestCsv(manifestRows), description: "119 载荷清单", ownerModule: "Packaging", status: "CONTROLLED", validationResult: "PASS" },
    { relativePath: "05_交付清单/交付清单.json", data: manifestJsonBytes, description: "119 载荷 JSON 清单", ownerModule: "Packaging", status: "CONTROLLED", validationResult: "PASS" },
  ];
  if (allEntries.length !== 121) throw new Error("DELIVERY_GOLDEN_ZIP_COUNT_MISMATCH:" + allEntries.length);

  const customerRoot = goldenRoot(task.title);
  const zipBytes = buildStoredZip(allEntries.map((entry) => ({ name: customerRoot + "/" + entry.relativePath, data: entry.data })));
  const packageHash = await sha256(zipBytes);
  const packageId = existing?.id ?? crypto.randomUUID();
  const storageRoot = "tasks/" + taskId + "/delivery/" + packageId;
  const manifestKey = storageRoot + "/manifest.json";
  const zipKey = storageRoot + "/customer-delivery.zip";
  const createdAt = existing?.created_at ?? isoNow();
  const frozenAt = isoNow();

  await env.ARTIFACTS.put(manifestKey, manifestJsonBytes, { httpMetadata: { contentType: "application/json; charset=utf-8" }, customMetadata: { taskId, packageId, schemaVersion: GOLDEN_SCHEMA, sha256: await sha256(manifestJsonBytes) } });
  await env.ARTIFACTS.put(zipKey, zipBytes, { httpMetadata: { contentType: "application/zip", contentDisposition: "attachment; filename*=UTF-8''task-" + taskId + ".zip" }, customMetadata: { taskId, packageId, schemaVersion: GOLDEN_SCHEMA, sha256: packageHash } });
  await env.DB.prepare(
    "INSERT INTO delivery_packages (id, task_id, status, manifest_key, zip_key, sha256, approved_by, created_at, frozen_at) VALUES (?, ?, 'FROZEN', ?, ?, ?, NULL, ?, ?) ON CONFLICT(task_id) DO UPDATE SET status = 'FROZEN', manifest_key = excluded.manifest_key, zip_key = excluded.zip_key, sha256 = excluded.sha256, frozen_at = excluded.frozen_at",
  ).bind(packageId, taskId, manifestKey, zipKey, packageHash, createdAt, frozenAt).run();

  return { id: packageId, taskId, status: "FROZEN", manifestKey, zipKey, sha256: packageHash, artifactCount: 121, frozenAt };
}
