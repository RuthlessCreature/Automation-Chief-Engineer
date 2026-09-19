import { describe, expect, it } from "vitest";
import { PIPELINE } from "../src/domain";
import { GOLDEN_SHEETS, docx, geometryViews, geometryVisuals, openCsv, pdf, pptx, views, visuals, xlsx, type Report } from "../src/golden-delivery";

const reports: Report[] = [{
  stageId: "mechanical",
  title: "机械方案",
  body: "布局 1800×1200×1850 mm；Top Bottom Oblique Dynamic L2 电气 软件 MES 节拍 BOM 验证 项目计划 开放项 视觉证据。",
  sha256: "A".repeat(64),
  provider: "test",
  model: "fixture",
}];


function tinyBinaryStl(): Uint8Array {
  const bytes = new Uint8Array(84 + 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, 1, true);
  const vertices = [0, 0, 0, 100, 0, 0, 0, 100, 20];
  for (let index = 0; index < vertices.length; index += 1) view.setFloat32(96 + index * 4, vertices[index]!, true);
  return bytes;
}

function entries(bytes: Uint8Array): Map<string, Uint8Array> {
  const result = new Map<string, Uint8Array>();
  let offset = 0;
  const decoder = new TextDecoder();
  while (offset + 30 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    if (view.getUint32(0, true) !== 0x04034b50) break;
    const size = view.getUint32(18, true);
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    result.set(name, bytes.slice(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return result;
}

describe("Golden-121 deterministic assets", () => {
  it("builds a 33+ heading DOCX", () => {
    const files = entries(docx("Golden", reports));
    const xml = new TextDecoder().decode(files.get("word/document.xml"));
    expect((xml.match(/Heading1/g) ?? []).length).toBeGreaterThanOrEqual(33);
    expect(xml).toContain("开放项");
    expect(xml).toContain("视觉证据");
  });

  it("builds the exact 21-sheet workbook with formula-bearing sheets", () => {
    const files = entries(xlsx(reports));
    const workbook = new TextDecoder().decode(files.get("xl/workbook.xml"));
    for (const sheet of GOLDEN_SHEETS) expect(workbook).toContain(sheet);
    expect([...files.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))).toHaveLength(21);
    expect(new TextDecoder().decode(files.get("xl/worksheets/sheet3.xml")).match(/<f>/g)?.length ?? 0).toBeGreaterThanOrEqual(100);
    expect(new TextDecoder().decode(files.get("xl/worksheets/sheet7.xml")).match(/<f>/g)?.length ?? 0).toBeGreaterThanOrEqual(100);
  });

  it("builds an OpenXML-connected 31-slide PPTX", () => {
    const files = entries(pptx("Golden", reports));
    expect(files.has("ppt/presentation.xml")).toBe(true);
    expect(files.has("ppt/_rels/presentation.xml.rels")).toBe(true);
    expect(files.has("ppt/slideMasters/slideMaster1.xml")).toBe(true);
    expect(files.has("ppt/slideLayouts/slideLayout1.xml")).toBe(true);
    expect([...files.keys()].filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))).toHaveLength(31);
    expect([...files.keys()].filter((name) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(name))).toHaveLength(31);
  });

  it("builds a PDF with a nonzero xref offset", () => {
    const text = new TextDecoder().decode(pdf("Golden"));
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    const match = text.match(/startxref\n(\d+)\n%%EOF/);
    expect(Number(match?.[1] ?? 0)).toBeGreaterThan(0);
  });

  it("keeps exact view, visual and open-item counts", () => {
    expect(views("02_产品CAD与视图", true)).toHaveLength(5);
    expect(views("03_整机概念CAD与视图", false)).toHaveLength(5);
    expect(visuals()).toHaveLength(96);
    const stl = tinyBinaryStl();
    const productViews = geometryViews("02_产品CAD与视图", stl, true);
    const evidence = geometryVisuals(stl, stl);
    expect(productViews).toHaveLength(5);
    expect(evidence).toHaveLength(96);
    expect([...productViews, ...evidence].every((entry) => entry.data.slice(0, 8).every((byte, index) => byte === [137,80,78,71,13,10,26,10][index]))).toBe(true);
    expect(new TextDecoder().decode(openCsv()).trim().split(/\r?\n/)).toHaveLength(15);
  });
});


describe("pipeline order contract", () => {
  it("keeps the governed 15-stage order immutable", () => {
    expect(PIPELINE).toHaveLength(15);
    expect(PIPELINE.map((stage) => stage.id)).toEqual([
      "intake",
      "requirements",
      "feasibility",
      "vision",
      "mechanical",
      "electrical",
      "software_mes",
      "product_cad",
      "ct_capacity",
      "bom_cost",
      "digital_twin",
      "validation",
      "project_sales",
      "documentation",
      "chief_review",
    ]);
    expect(new Set(PIPELINE.map((stage) => stage.id)).size).toBe(15);
  });
});
