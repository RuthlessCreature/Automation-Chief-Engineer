import { describe, expect, it } from "vitest";
import { buildDocxDocument, buildStoredZip, buildXlsxManifest, crc32 } from "../src/package";

describe("customer delivery archive", () => {
  it("writes a readable UTF-8 stored ZIP with a central directory", () => {
    const archive = buildStoredZip([
      { name: "manifest.json", data: new TextEncoder().encode('{"schemaVersion":"customer-delivery/v1"}') },
      { name: "reports/01-intake.md", data: new TextEncoder().encode("受控报告") },
    ]);
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(new TextDecoder().decode(archive)).toContain("manifest.json");
    expect(new TextDecoder().decode(archive)).toContain("reports/01-intake.md");
    expect(view.getUint32(archive.byteLength - 22, true)).toBe(0x06054b50);
  });

  it("matches the ZIP CRC-32 contract for a known payload", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("builds real Office Open XML containers instead of renaming Markdown", () => {
    const docx = buildDocxDocument("方案总册", [{ stageId: "vision", title: "机器视觉", body: "范围：相机与光源方案\n风险：需要现场验证。" }]);
    const xlsx = buildXlsxManifest([{ stageId: "vision", title: "机器视觉", sha256: "abc", provider: "minimax", model: "MiniMax-M3" }]);
    expect(new TextDecoder().decode(docx)).toContain("word/document.xml");
    expect(new TextDecoder().decode(xlsx)).toContain("xl/worksheets/sheet1.xml");
  });
});
