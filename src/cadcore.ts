import { getSandbox } from "@cloudflare/sandbox";
import { sha256 } from "./quality";

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
