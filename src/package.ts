import { freezeGoldenCustomerDelivery } from "./golden-package";
import { PIPELINE } from "./domain";
import { QUALITY_POLICY_VERSION, sha256 } from "./quality";
import { isoNow } from "./security";

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

type CadJobOutputRow = { input_id: string; normalized_brep_key: string | null; report_storage_key: string | null };

type ExistingPackageRow = {
  id: string;
  status: "ASSEMBLING" | "FROZEN" | "REJECTED";
  manifest_key: string;
  zip_key: string | null;
  sha256: string | null;
  created_at: string;
  frozen_at: string | null;
};

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

type ZipEntry = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

/**
 * Build a standards-compatible ZIP archive using the STORE method. Reports are
 * already compressed by R2/content transport in most cases; avoiding a second
 * compression pass keeps the Worker deterministic and bounded in memory.
 */
export function buildStoredZip(entries: readonly ZipEntry[]): Uint8Array {
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
    localView.setUint16(6, 0x800, true); // UTF-8 filenames
    localView.setUint16(8, 0, true); // STORE
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.byteLength, true);
    localView.setUint32(22, entry.data.byteLength, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    chunks.push(local, entry.data);

    const directory = new Uint8Array(46 + name.length);
    const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(8, 0x800, true);
    directoryView.setUint16(10, 0, true);
    directoryView.setUint16(12, 0, true);
    directoryView.setUint16(14, 0, true);
    directoryView.setUint32(16, crc, true);
    directoryView.setUint32(20, entry.data.byteLength, true);
    directoryView.setUint32(24, entry.data.byteLength, true);
    directoryView.setUint16(28, name.length, true);
    directoryView.setUint16(30, 0, true);
    directoryView.setUint16(32, 0, true);
    directoryView.setUint16(34, 0, true);
    directoryView.setUint16(36, 0, true);
    directoryView.setUint32(38, 0, true);
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
  for (const chunk of chunks) {
    output.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  for (const chunk of central) {
    output.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  output.set(end, cursor);
  return output;
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeReportName(value: string): string {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "report";
}

function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function wordParagraph(text: string, style?: string): string {
  const escaped = xmlEscape(text).replace(/  /g, "  ");
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}

function htmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function buildSafeHtmlPreview(title: string, reports: readonly { stageId: string; title: string; body: string }[]): Uint8Array {
  const sections = reports.map((report) => `<section><h2>${htmlEscape(report.stageId)}｜${htmlEscape(report.title)}</h2><pre>${htmlEscape(report.body)}</pre></section>`).join("");
  return encoder.encode(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex"><title>${htmlEscape(title)} · 安全预览</title><style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:32px auto;padding:0 24px;color:#10243b;background:#f5f8fb}section{background:white;border:1px solid #d7e1ea;border-radius:8px;padding:18px;margin:16px 0}pre{white-space:pre-wrap;line-height:1.55;font:14px/1.55 ui-monospace,monospace}small{color:#5c7185}</style><h1>${htmlEscape(title)}</h1><small>安全派生预览：不执行宏、脚本或外链；源文件仍受原始授权控制。</small>${sections}</html>`);
}

export function buildSafeXlsxHtmlPreview(rows: readonly { stageId: string; title: string; sha256: string; provider: string; model: string }[]): Uint8Array {
  const tableRows = rows.map((row) => `<tr><td>${htmlEscape(row.stageId)}</td><td>${htmlEscape(row.title)}</td><td><code>${htmlEscape(row.sha256)}</code></td><td>${htmlEscape(row.provider)}</td><td>${htmlEscape(row.model)}</td></tr>`).join("");
  return encoder.encode(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex"><title>受控产出清单 · 安全预览</title><style>body{font-family:system-ui,sans-serif;margin:32px;color:#10243b}table{border-collapse:collapse;width:100%;background:white}th,td{border:1px solid #d7e1ea;padding:8px;text-align:left}th{background:#edf4fa}code{font-size:11px}</style><h1>受控产出清单</h1><p>安全派生预览：不执行宏、脚本或外链；SHA-256 与 ZIP manifest 绑定。</p><table><thead><tr><th>Stage</th><th>Title</th><th>SHA-256</th><th>Provider</th><th>Model</th></tr></thead><tbody>${tableRows}</tbody></table></html>`);
}

export function buildDocxDocument(title: string, reports: readonly { stageId: string; title: string; body: string }[]): Uint8Array {
  const paragraphs = [wordParagraph(title, "Title"), wordParagraph("受控客户交付版｜仅收录通过质量闸门的阶段产出。", "Subtitle")];
  for (const report of reports) {
    paragraphs.push(wordParagraph(`${report.stageId}｜${report.title}`, "Heading1"));
    for (const line of report.body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) paragraphs.push(wordParagraph(""));
      else if (/^#{2,}\s+/.test(trimmed)) paragraphs.push(wordParagraph(trimmed.replace(/^#+\s+/, ""), "Heading2"));
      else paragraphs.push(wordParagraph(trimmed.replace(/^[-*]\s+/, "• ")));
    }
  }
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:i/><w:color w:val="666666"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:outlineLvl w:val="0"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:outlineLvl w:val="1"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
  return buildStoredZip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "word/document.xml", data: encoder.encode(documentXml) },
    { name: "word/styles.xml", data: encoder.encode(styles) },
  ]);
}

export function buildXlsxManifest(rows: readonly { stageId: string; title: string; sha256: string; provider: string; model: string }[]): Uint8Array {
  const cell = (value: string) => `<c t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  const sheetRows = [
    ["Stage", "Title", "SHA-256", "Provider", "Model"],
    ...rows.map((row) => [row.stageId, row.title, row.sha256, row.provider, row.model]),
  ].map((row, index) => `<row r="${index + 1}">${row.map(cell).join("")}</row>`).join("");
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="受控产出清单" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  return buildStoredZip([
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "xl/workbook.xml", data: encoder.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheet) },
  ]);
}

function stageOrder(stageId: string): number {
  const index = PIPELINE.findIndex((stage) => stage.id === stageId);
  return index < 0 ? PIPELINE.length + 1 : index;
}

export async function freezeCustomerDelivery(env: Env, taskId: string): Promise<FrozenDelivery> {
  return freezeGoldenCustomerDelivery(env, taskId);
}
