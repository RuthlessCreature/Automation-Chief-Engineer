import { getSandbox } from "@cloudflare/sandbox";
import { sha256 } from "./quality";
import type { TaskCoordinator } from "./task-coordinator";
import { isoNow } from "./security";

export type CadInput = {
  id: string;
  taskId: string;
  originalName: string;
  storageKey: string;
  sha256: string;
};

export type CadInspectionResult = {
  report: Record<string, unknown>;
  reportKey: string;
  reportSha256: string;
  normalizedBrepKey: string;
  normalizedBrepSha256: string;
  kind: "G02_STEP_INSPECTION" | "G02_STL_INSPECTION";
};

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index).toLowerCase();
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

/** Execute a fixed G02 inspector. User values are never interpolated into a shell command. */
export async function inspectCadInCadcore(env: Env, input: CadInput): Promise<CadInspectionResult> {
  const inputExtension = extension(input.originalName);
  const isStep = new Set([".step", ".stp"]).has(inputExtension);
  const isStl = inputExtension === ".stl";
  if (!isStep && !isStl) throw new Error("CADCORE_UNSUPPORTED_INPUT");
  const object = await env.ARTIFACTS.get(input.storageKey);
  if (!object?.body) throw new Error("CADCORE_INPUT_MISSING");

  // Binary CAD input uses the SDK's streaming file path; pin RPC transport so
  // the same sandbox instance is not silently downgraded to HTTP.
  const sandbox = getSandbox(env.CADCORE, `cad-${input.taskId}`, { sleepAfter: "5m", normalizeId: true, transport: "rpc" });
  const inputPath = `/workspace/cad/input/source${isStl ? ".stl" : ".step"}`;
  const reportPath = "/workspace/cad/output/g02-report.json";
  const brepPath = "/workspace/cad/output/normalized.brep";
  await sandbox.mkdir("/workspace/cad/input", { recursive: true });
  await sandbox.mkdir("/workspace/cad/output", { recursive: true });
  await sandbox.writeFile(inputPath, object.body);
  const inspector = isStl ? "inspect_stl.py" : "inspect_step.py";
  const execution = await sandbox.exec(
    `python3 /opt/cadcore/${inspector} --input ${inputPath} --report /workspace/cad/output/g02-report.json --normalized-brep /workspace/cad/output/normalized.brep`,
    { cwd: "/workspace/cad" },
  );
  const reportFile = await sandbox.readFile(reportPath);
  if (!reportFile.success) throw new Error("CADCORE_REPORT_UNAVAILABLE");
  let report: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(reportFile.content);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    report = value as Record<string, unknown>;
  } catch {
    throw new Error("CADCORE_INVALID_REPORT");
  }
  if (!execution.success || report.status !== "PASS") throw new Error(typeof report.errorCode === "string" ? report.errorCode : "CADCORE_G02_BLOCKED");

  const brepFile = await sandbox.readFile(brepPath, { encoding: "base64" });
  if (!brepFile.success || !brepFile.content) throw new Error("CADCORE_BREP_UNAVAILABLE");
  const brep = base64ToArrayBuffer(brepFile.content);
  const kind = isStl ? "G02_STL_INSPECTION" : "G02_STEP_INSPECTION";
  const reportKey = `tasks/${input.taskId}/cad/g02/${input.id}/g02-report.json`;
  const normalizedBrepKey = `tasks/${input.taskId}/cad/g02/${input.id}/normalized.brep`;
  const [reportSha256, normalizedBrepSha256] = await Promise.all([sha256(reportFile.content), sha256(brep)]);
  await env.ARTIFACTS.put(reportKey, reportFile.content, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { taskId: input.taskId, inputId: input.id, gate: "G02", sha256: reportSha256, classification: "INTERNAL_CAD_FACTS" },
  });
  await env.ARTIFACTS.put(normalizedBrepKey, brep, {
    httpMetadata: { contentType: "application/octet-stream", contentDisposition: "attachment; filename=normalized.brep" },
    customMetadata: { taskId: input.taskId, inputId: input.id, gate: "G02", sha256: normalizedBrepSha256, classification: "INTERNAL_CAD_DERIVATIVE" },
  });
  return { report, reportKey, reportSha256, normalizedBrepKey, normalizedBrepSha256, kind };
}

export const inspectStepInCadcore = inspectCadInCadcore;

export type CadDeliveryAssetKeys = {
  brepKey: string;
  stepKey: string;
  stlKey: string;
  brepSha256: string;
  stepSha256: string;
  stlSha256: string;
  viewKeys?: Record<string, string>;
};

async function readSandboxBinary(sandbox: ReturnType<typeof getSandbox>, path: string): Promise<ArrayBuffer> {
  const file = await sandbox.readFile(path, { encoding: "base64" });
  if (!file.success || !file.content) throw new Error("CADCORE_DELIVERY_OUTPUT_UNAVAILABLE");
  return base64ToArrayBuffer(file.content);
}

/** Re-export a validated normalized BREP as real STEP/STL customer derivatives. */
export async function deriveCadDeliveryAssets(
  env: Env,
  input: { taskId: string; inputId: string; normalizedBrepKey: string },
): Promise<CadDeliveryAssetKeys> {
  const source = await env.ARTIFACTS.get(input.normalizedBrepKey);
  if (!source?.body) throw new Error("DELIVERY_CADCORE_BREP_MISSING");
  const sandbox = getSandbox(env.CADCORE, `cad-${input.taskId}`, { sleepAfter: "5m", normalizeId: true, transport: "rpc" });
  const workspace = `/workspace/cad/delivery/${input.inputId}`;
  const brepPath = `${workspace}/normalized.brep`;
  const stepPath = `${workspace}/normalized.step`;
  const stlPath = `${workspace}/normalized.stl`;
  await sandbox.mkdir(workspace, { recursive: true });
  await sandbox.writeFile(brepPath, source.body);
  const execution = await sandbox.exec(
    `python3 /opt/cadcore/export_delivery.py --brep ${brepPath} --step ${stepPath} --stl ${stlPath}`,
    { cwd: workspace },
  );
  if (!execution.success) throw new Error("DELIVERY_CADCORE_EXPORT_FAILED");
  const [step, stl] = await Promise.all([readSandboxBinary(sandbox, stepPath), readSandboxBinary(sandbox, stlPath)]);
  const brepObject = await env.ARTIFACTS.get(input.normalizedBrepKey);
  if (!brepObject) throw new Error("DELIVERY_CADCORE_BREP_MISSING");
  const brep = await brepObject.arrayBuffer();
  const root = `tasks/${input.taskId}/cad/g02/${input.inputId}`;
  const stepKey = `${root}/delivery.step`;
  const stlKey = `${root}/delivery.stl`;
  const [brepSha256, stepSha256, stlSha256] = await Promise.all([sha256(brep), sha256(step), sha256(stl)]);
  await env.ARTIFACTS.put(stepKey, step, { httpMetadata: { contentType: "model/step" }, customMetadata: { taskId: input.taskId, inputId: input.inputId, sha256: stepSha256, classification: "CUSTOMER_CAD_DERIVATIVE" } });
  await env.ARTIFACTS.put(stlKey, stl, { httpMetadata: { contentType: "model/stl" }, customMetadata: { taskId: input.taskId, inputId: input.inputId, sha256: stlSha256, classification: "CUSTOMER_CAD_DERIVATIVE" } });
  return { brepKey: input.normalizedBrepKey, stepKey, stlKey, brepSha256, stepSha256, stlSha256 };
}

/** Build a controlled, explicitly unverified concept-machine CAD envelope. */
export async function buildConceptCadAssets(
  env: Env,
  taskId: string,
  envelope: { widthMm: number; depthMm: number; heightMm: number },
  profile = "parametric-fct-r01",
): Promise<CadDeliveryAssetKeys> {
  const clamp = (value: number) => Math.max(500, Math.min(6000, Math.round(value)));
  const width = clamp(envelope.widthMm), depth = clamp(envelope.depthMm), height = clamp(envelope.heightMm);
  const sandbox = getSandbox(env.CADCORE, `cad-${taskId}`, { sleepAfter: "5m", normalizeId: true, transport: "rpc" });
  const workspace = "/workspace/cad/concept/r01";
  const brepPath = `${workspace}/concept.brep`;
  const stepPath = `${workspace}/concept.step`;
  const stlPath = `${workspace}/concept.stl`;
  const viewDir = `${workspace}/views`;
  await sandbox.mkdir(workspace, { recursive: true });
  const execution = await sandbox.exec(
    `python3 /opt/cadcore/build_concept.py --width ${width} --depth ${depth} --height ${height} --profile ${profile} --brep ${brepPath} --step ${stepPath} --stl ${stlPath} --view-dir ${viewDir}`,
    { cwd: workspace },
  );
  if (!execution.success) throw new Error("DELIVERY_CONCEPT_CAD_BUILD_FAILED");
  const [brep, step, stl] = await Promise.all([
    readSandboxBinary(sandbox, brepPath),
    readSandboxBinary(sandbox, stepPath),
    readSandboxBinary(sandbox, stlPath),
  ]);
  const root = `tasks/${taskId}/cad/concept/r01`;
  const brepKey = `${root}/concept.brep`, stepKey = `${root}/concept.step`, stlKey = `${root}/concept.stl`;
  const [brepSha256, stepSha256, stlSha256] = await Promise.all([sha256(brep), sha256(step), sha256(stl)]);
  const viewKeys: Record<string, string> = {};
  for (const name of ["cutaway", "front", "isometric", "right", "top"]) {
    const sourcePath = `${viewDir}/${name}.png`;
    const file = await sandbox.readFile(sourcePath, { encoding: "base64" });
    if (!file.success || !file.content) continue;
    const bytes = base64ToArrayBuffer(file.content);
    const key = `${root}/views/${name}.png`;
    await env.ARTIFACTS.put(key, bytes, { httpMetadata: { contentType: "image/png" }, customMetadata: { taskId, profile, maturity: "ASM_NOT_VERIFIED" } });
    viewKeys[name] = key;
  }
  await Promise.all([
    env.ARTIFACTS.put(brepKey, brep, { httpMetadata: { contentType: "application/octet-stream" }, customMetadata: { taskId, sha256: brepSha256, maturity: "ASM_NOT_VERIFIED" } }),
    env.ARTIFACTS.put(stepKey, step, { httpMetadata: { contentType: "model/step" }, customMetadata: { taskId, sha256: stepSha256, maturity: "ASM_NOT_VERIFIED" } }),
    env.ARTIFACTS.put(stlKey, stl, { httpMetadata: { contentType: "model/stl" }, customMetadata: { taskId, sha256: stlSha256, maturity: "ASM_NOT_VERIFIED" } }),
  ]);
  return { brepKey, stepKey, stlKey, brepSha256, stepSha256, stlSha256, viewKeys };
}



/** Run the repository's authoritative Golden-121 validator inside CADCore before freezing a customer ZIP. */
export async function validateGoldenDeliveryZip(env: Env, taskId: string, zipBytes: Uint8Array): Promise<void> {
  const sandbox = getSandbox(env.CADCORE, `cad-${taskId}`, { sleepAfter: "5m", normalizeId: true, transport: "rpc" });
  const workspace = "/workspace/cad/validate/golden-r01";
  const zipPath = `${workspace}/customer-delivery.zip`;
  await sandbox.mkdir(workspace, { recursive: true });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(zipBytes); controller.close(); },
  });
  await sandbox.writeFile(zipPath, stream);
  const execution = await sandbox.exec(
    `python3 /opt/cadcore/validate_r2_f10_golden_delivery.py ${zipPath}`,
    { cwd: workspace },
  );
  if (!execution.success) {
    const diagnostics = [execution.stdout, execution.stderr, `exitCode=${execution.exitCode}`]
      .filter(Boolean)
      .join("\n")
      .slice(-6_000);
    const coordinator = env.TASK_COORDINATOR.getByName(taskId) as DurableObjectStub<TaskCoordinator>;
    await coordinator.publish({
      type: "QUALITY_BLOCKED",
      stageId: "chief_review",
      message: "Golden-121 validator diagnostics（交付已阻断）",
      payload: { state: "QUALITY_BLOCKED", qualityStatus: "BLOCKED", errorCode: "DELIVERY_GOLDEN_VALIDATOR_REWORK", diagnostics },
      createdAt: isoNow(),
    });
    throw new Error("DELIVERY_GOLDEN_VALIDATOR_REWORK");
  }
}
