import type { Report } from "./golden-delivery";

const encoder = new TextEncoder();

type PdfPng = { width: number; height: number; idat: Uint8Array };

function concat(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function parsePng(data: Uint8Array): PdfPng | null {
  if (data.length < 33 || data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let cursor = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const chunks: Uint8Array[] = [];
  while (cursor + 12 <= data.length) {
    const length = view.getUint32(cursor, false);
    const type = String.fromCharCode(data[cursor + 4]!, data[cursor + 5]!, data[cursor + 6]!, data[cursor + 7]!);
    const start = cursor + 8;
    const end = start + length;
    if (end + 4 > data.length) return null;
    if (type === "IHDR" && length >= 13) {
      width = view.getUint32(start, false);
      height = view.getUint32(start + 4, false);
      bitDepth = data[start + 8]!;
      colorType = data[start + 9]!;
    } else if (type === "IDAT") chunks.push(data.slice(start, end));
    else if (type === "IEND") break;
    cursor = end + 4;
  }
  // PNG predictor 15 lets the PDF reader apply PNG scanline filters directly.
  // Keep the generic path deliberately strict: only RGB 8-bit non-interlaced
  // images are embedded; unsupported assets remain available in the ZIP.
  if (!width || !height || bitDepth !== 8 || colorType !== 2 || !chunks.length) return null;
  return { width, height, idat: concat(chunks) };
}

function ascii(value: string, max = 1600): string {
  return value.normalize("NFKD").replace(/[^\x20-\x7e]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function literal(value: string): string {
  return ascii(value).replace(/[()\\]/g, (character) => `\\${character}`);
}

function wrap(value: string, width = 92): string[] {
  const clean = ascii(value);
  const lines: string[] = [];
  for (let index = 0; index < clean.length; index += width) lines.push(clean.slice(index, index + width));
  return lines.length ? lines.slice(0, 10) : ["No accepted stage report supplied."];
}

/** Generic, image-aware PDF delivery generator shared by every product task. */
export function pdfForDelivery(title: string, reports: Report[] = [], images: Uint8Array[] = []): Uint8Array {
  // Keep the PDF visual appendix intentionally small. The ZIP and Office
  // files carry the full controlled evidence sequence; embedding two images
  // here gives a useful visual PDF without duplicating the high-resolution
  // payload enough to exceed Worker packaging memory.
  const parsed = images.map(parsePng).filter((value): value is PdfPng => Boolean(value)).slice(0, 2);
  const pageCount = 12;
  const imageStart = 4;
  const contentStart = imageStart + parsed.length;
  const pageStart = contentStart + pageCount;
  const objects: Uint8Array[] = [];
  const set = (number: number, value: string | Uint8Array) => { objects[number] = typeof value === "string" ? encoder.encode(value) : value; };
  const reportForPage = (page: number) => reports[Math.max(0, page - 1) % Math.max(1, reports.length)];

  const content = (page: number): string => {
    const lines: string[] = ["q 0.16 0.42 0.52 RG 1.2 w 40 52 515 738 re S Q"];
    const heading = page === 0 ? title : page < 10 ? (reportForPage(page)?.title ?? "Controlled stage evidence") : page === 10 ? "Evidence register" : "Open items and release boundary";
    lines.push(`BT /F1 20 Tf 56 770 Td (${literal(heading)}) Tj ET`);
    lines.push(`BT /F1 9 Tf 56 748 Td (R2-F10-GOLDEN-121 | CONTROLLED DELIVERY | page ${page + 1}/${pageCount}) Tj ET`);
    if (page === 0) {
      lines.push("BT /F1 13 Tf 56 690 Td (Generic engineering delivery package) Tj 0 -24 Td /F1 10 Tf (Stage evidence and controlled visual assets are assembled below.) Tj 0 -20 Td (Facts, assumptions, and planned validation remain explicitly separated.) Tj ET");
      lines.push("0.16 0.42 0.52 RG 56 545 483 88 re S");
      lines.push("BT /F1 11 Tf 72 602 Td (Release boundary) Tj 0 -20 Td /F1 9 Tf (Unexecuted FAT, SAT, MSA/GR&R, supplier quote, and customer acceptance are not PASS.) Tj ET");
    } else if (page < 10) {
      const report = reportForPage(page);
      lines.push(`BT /F1 10 Tf 56 710 Td (Stage: ${literal(report?.stageId ?? "stage")}) Tj 0 -18 Td (Provider: ${literal(report?.provider ?? "controlled")}) Tj 0 -18 Td (Model: ${literal(report?.model ?? "quality-gated")}) Tj ET`);
      let y = 650;
      for (const line of wrap(report?.body ?? "")) { lines.push(`BT /F1 9 Tf 56 ${y} Td (${literal(line)}) Tj ET`); y -= 16; }
    } else if (page === 10) {
      lines.push("BT /F1 12 Tf 56 710 Td (Visual evidence sequence) Tj 0 -24 Td /F1 9 Tf (Machine, product, annotated, and diagram views remain generic controlled assets.) Tj 0 -18 Td (A product-specific reference profile is selected only when the task explicitly names that profile.) Tj ET");
      lines.push("0.16 0.42 0.52 RG 56 520 483 120 re S");
      lines.push("BT /F1 10 Tf 72 610 Td (Evidence order) Tj 0 -20 Td /F1 9 Tf (01-05 machine or concept views) Tj 0 -16 Td (06-10 product or input views) Tj 0 -16 Td (11-12 annotated or engineering diagram views) Tj ET");
    } else {
      lines.push("BT /F1 12 Tf 56 710 Td (Open items and maturity boundary) Tj 0 -24 Td /F1 9 Tf (PLANNED_NOT_EXECUTED remains required until real test records are attached.) Tj 0 -18 Td (Missing customer inputs remain open; assumptions are not converted into measurements.) Tj 0 -18 Td (Package freeze controls the delivery set; it does not assert manufacturing or site acceptance.) Tj ET");
    }
    const imageIndex = page >= 2 && page < 2 + parsed.length ? page - 2 : -1;
    if (imageIndex >= 0) {
      const image = parsed[imageIndex]!;
      const maxWidth = 470;
      const maxHeight = 300;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const x = 56 + Math.round((maxWidth - width) / 2);
      lines.push(`q ${width} 0 0 ${height} ${x} 105 cm /Im${imageIndex + 1} Do Q`);
    }
    lines.push(`BT /F1 8 Tf 56 68 Td (Controlled engineering baseline | page ${page + 1}/${pageCount} | evidence remains traceable) Tj ET`);
    return lines.join("\n");
  };

  set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (let index = 0; index < parsed.length; index += 1) {
    const image = parsed[index]!;
    const header = `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${image.width} >> /Length ${image.idat.length} >>\nstream\n`;
    set(imageStart + index, concat([encoder.encode(header), image.idat, encoder.encode("\nendstream")]));
  }
  for (let page = 0; page < pageCount; page += 1) {
    const contentNumber = contentStart + page;
    const pageNumber = pageStart + page;
    const bytes = encoder.encode(content(page));
    set(contentNumber, concat([encoder.encode(`<< /Length ${bytes.length} >>\nstream\n`), bytes, encoder.encode("\nendstream")]));
    const imageResource = page >= 2 && page < 2 + parsed.length ? ` /XObject << /Im${page - 1} ${imageStart + page - 2} 0 R >>` : "";
    set(pageNumber, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >>${imageResource} >> /Contents ${contentNumber} 0 R >>`);
  }
  set(2, `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${pageStart + index} 0 R`).join(" ")}] /Count ${pageCount} >>`);

  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n%controlled\n")];
  const offsets: number[] = [];
  let position = parts[0]!.length;
  for (let number = 1; number < objects.length; number += 1) {
    const object = objects[number] ?? encoder.encode("");
    const prefix = encoder.encode(`${number} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets[number] = position;
    parts.push(prefix, object, suffix);
    position += prefix.length + object.length + suffix.length;
  }
  const xrefOffset = position;
  const xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n${Array.from({ length: objects.length - 1 }, (_, index) => String(offsets[index + 1] ?? 0).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(encoder.encode(xref));
  return concat(parts);
}
