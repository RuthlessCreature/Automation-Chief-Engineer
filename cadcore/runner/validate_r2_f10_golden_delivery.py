#!/usr/bin/env python3
"""Validate an R2-F10-GOLDEN-121 full-delivery ZIP with only Python stdlib."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as et
from collections import Counter
from pathlib import PurePosixPath
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


PROFILE = "R2-F10-GOLDEN-121"
EXPECTED_SHEETS = [
    "项目概览",
    "Requirement_FAI_CTQ",
    "DFMEA",
    "方案与CT",
    "视觉光学",
    "BOM_成本",
    "成本模型",
    "IO",
    "电气功率",
    "软件_MES",
    "POC",
    "MSA_GRR",
    "FAT",
    "SAT",
    "WBS_进度",
    "风险",
    "开放项",
    "商业_ROI",
    "Visual_Map",
    "Manifest_Checks",
    "Manifest",
]
MIN_FORMULAS = {
    "项目概览": 3,
    "DFMEA": 100,
    "方案与CT": 6,
    "成本模型": 100,
    "Manifest_Checks": 7,
}
MANIFEST_FIELDS = [
    "File ID",
    "File Name",
    "Relative Path",
    "Version",
    "Description",
    "Owner Module",
    "Controlled Baseline Revision",
    "Status",
    "Validation Result",
    "Size",
    "SHA256",
    "Customer",
]
OPEN_ITEM_FIELDS = [
    "Open Item ID",
    "主题",
    "当前状态",
    "所需证据",
    "关闭或启用条件",
    "责任接口",
]
REQUIRED_DOC_TERMS = [
    "方案结论",
    "视觉工位",
    "设备总体",
    "产品定位",
    "Top",
    "Bottom",
    "Oblique",
    "Dynamic",
    "L2",
    "电气",
    "软件",
    "节拍",
    "BOM",
    "验证",
    "项目计划",
    "开放项",
    "视觉证据",
]
REQUIRED_PPT_TERMS = [
    "推荐",
    "Top",
    "Bottom",
    "Oblique",
    "Dynamic",
    "L2",
    "电气",
    "控制",
    "追溯",
    "节拍",
    "成本",
    "BOM",
    "验证",
    "风险",
    "项目计划",
    "客户输入",
    "ROI",
    "验收",
]
WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
XLSX_NS = {
    "x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


class ContractValidator:
    def __init__(self, archive: zipfile.ZipFile) -> None:
        self.archive = archive
        self.errors: list[str] = []
        self.notes: list[str] = []
        self.files = self._files()
        self.root = self._root()
        self.relative_files = [self._relative(path) for path in self.files]
        self.file_by_relative = dict(zip(self.relative_files, self.files))

    def _files(self) -> list[str]:
        names = []
        for info in self.archive.infolist():
            if info.is_dir():
                continue
            path = info.filename.replace("\\", "/").strip("/")
            if path:
                names.append(path)
        return names

    def _root(self) -> str:
        roots = {path.split("/", 1)[0] for path in self.files if "/" in path}
        if len(roots) != 1:
            self.fail(f"ZIP 必须只有一个项目根目录，实际为 {sorted(roots)}")
            return ""
        root = roots.pop()
        if any("/" not in path for path in self.files):
            self.fail("ZIP 不允许在项目根目录外放置文件")
        return root

    def _relative(self, path: str) -> str:
        if self.root and path.startswith(self.root + "/"):
            return path[len(self.root) + 1 :]
        return path

    def fail(self, message: str) -> None:
        self.errors.append(message)

    def check(self, condition: bool, message: str) -> None:
        if not condition:
            self.fail(message)

    def read(self, relative_path: str) -> bytes:
        try:
            return self.archive.read(self.file_by_relative[relative_path])
        except KeyError:
            self.fail(f"缺少文件：{relative_path}")
            return b""

    def paths_under(self, prefix: str) -> list[str]:
        return [path for path in self.relative_files if path.startswith(prefix + "/")]

    def unique_extension(self, prefix: str, extension: str) -> str | None:
        matches = [path for path in self.paths_under(prefix) if path.lower().endswith(extension)]
        self.check(len(matches) == 1, f"{prefix} 必须恰有 1 个 {extension} 文件，实际 {len(matches)}")
        return matches[0] if len(matches) == 1 else None

    def validate_layout(self) -> dict[str, str]:
        self.check(len(self.files) == 121, f"客户 ZIP 必须恰有 121 个文件，实际 {len(self.files)}")
        expected_top = {"00_交付说明", "01_正式方案", "02_产品CAD与视图", "03_整机概念CAD与视图", "04_工程视觉", "05_交付清单"}
        actual_top = {path.split("/", 1)[0] for path in self.relative_files if "/" in path}
        self.check(actual_top == expected_top, f"一级目录不符合合同，实际 {sorted(actual_top)}")

        expected_00 = {"00_交付说明/交付说明.md", "00_交付说明/开放项与验证状态.csv"}
        self.check(set(self.paths_under("00_交付说明")) == expected_00, "00_交付说明 必须恰有交付说明.md 与开放项与验证状态.csv")

        formal = self.paths_under("01_正式方案")
        formal_ext = Counter(PurePosixPath(path).suffix.lower() for path in formal)
        self.check(len(formal) == 4 and formal_ext == Counter({".docx": 1, ".pdf": 1, ".pptx": 1, ".xlsx": 1}), "01_正式方案 必须恰有 1 DOCX、1 PDF、1 PPTX、1 XLSX")
        docx = self.unique_extension("01_正式方案", ".docx")
        pdf = self.unique_extension("01_正式方案", ".pdf")
        pptx = self.unique_extension("01_正式方案", ".pptx")
        xlsx = self.unique_extension("01_正式方案", ".xlsx")
        if docx and pdf:
            self.check(PurePosixPath(docx).stem == PurePosixPath(pdf).stem, "DOCX 与 PDF 必须使用相同正式方案文件名")

        product = self.paths_under("02_产品CAD与视图")
        self.check(Counter(PurePosixPath(path).suffix.lower() for path in product) == Counter({".brep": 1, ".step": 1, ".stl": 1, ".png": 5}), "02_产品CAD与视图 必须恰有 BREP/STEP/STL 各 1 与 PNG 标准视图 5")

        mechanical = self.paths_under("03_整机概念CAD与视图")
        self.check(Counter(PurePosixPath(path).suffix.lower() for path in mechanical) == Counter({".svg": 1, ".brep": 1, ".step": 1, ".stl": 1, ".png": 5}), "03_整机概念CAD与视图 必须恰有 SVG、BREP、STEP、STL 各 1 与 PNG 标准视图 5")

        visual = self.paths_under("04_工程视觉")
        clean = [path for path in visual if path.startswith("04_工程视觉/01_clean/") and path.lower().endswith(".png")]
        annotated = [path for path in visual if path.startswith("04_工程视觉/02_annotated/") and path.lower().endswith(".png")]
        diagram = [path for path in visual if path.startswith("04_工程视觉/03_diagram/") and path.lower().endswith(".png")]
        self.check(len(visual) == 96, f"04_工程视觉 必须恰有 96 个文件，实际 {len(visual)}")
        self.check(len(clean) == 90, f"01_clean 必须恰有 90 张 PNG，实际 {len(clean)}")
        self.check(len(annotated) == 4, f"02_annotated 必须恰有 4 张 PNG，实际 {len(annotated)}")
        self.check(len(diagram) == 2, f"03_diagram 必须恰有 2 张 PNG，实际 {len(diagram)}")
        self.check(len(set(clean + annotated + diagram)) == 96 and len(visual) == 96, "工程视觉目录不得包含非 PNG 或未分类文件")

        expected_05 = {"05_交付清单/交付清单.csv", "05_交付清单/交付清单.json"}
        self.check(set(self.paths_under("05_交付清单")) == expected_05, "05_交付清单 必须恰有 CSV 与 JSON 清单")
        return {"docx": docx or "", "pdf": pdf or "", "pptx": pptx or "", "xlsx": xlsx or ""}

    def validate_open_items(self) -> None:
        raw = self.read("00_交付说明/开放项与验证状态.csv")
        if not raw:
            return
        try:
            rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
        except (UnicodeDecodeError, csv.Error) as exc:
            self.fail(f"开放项 CSV 无法读取：{exc}")
            return
        fields = rows[0].keys() if rows else []
        self.check(list(fields) == OPEN_ITEM_FIELDS, f"开放项 CSV 列必须为 {OPEN_ITEM_FIELDS}")
        self.check(len(rows) >= 14, f"开放项 CSV 至少需要 14 条记录，实际 {len(rows)}")
        ids = [row.get("Open Item ID", "").strip() for row in rows]
        self.check(all(ids) and len(ids) == len(set(ids)), "开放项 CSV 的 Open Item ID 必须非空且唯一")

    def _manifest_rows(self, value: Any) -> list[dict[str, Any]] | None:
        if isinstance(value, list) and all(isinstance(item, dict) for item in value):
            if value and "Relative Path" in value[0]:
                return value
        if isinstance(value, dict):
            for key in ("files", "deliverables", "items"):
                candidate = value.get(key)
                if isinstance(candidate, list) and candidate and isinstance(candidate[0], dict) and "Relative Path" in candidate[0]:
                    return candidate
            for candidate in value.values():
                found = self._manifest_rows(candidate)
                if found is not None:
                    return found
        return None

    def validate_manifest(self) -> None:
        raw = self.read("05_交付清单/交付清单.json")
        if not raw:
            return
        try:
            parsed = json.loads(raw.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            self.fail(f"交付清单 JSON 无法读取：{exc}")
            return
        rows = self._manifest_rows(parsed)
        if rows is None:
            self.fail("交付清单 JSON 未找到含 Relative Path 的文件记录集")
            return
        self.check(len(rows) == 119, f"Manifest 客户载荷必须恰有 119 行，实际 {len(rows)}")
        listed: list[str] = []
        for index, row in enumerate(rows, 1):
            missing_fields = [field for field in MANIFEST_FIELDS if not str(row.get(field, "")).strip()]
            self.check(not missing_fields, f"Manifest 第 {index} 行缺少字段或值：{missing_fields}")
            relative = str(row.get("Relative Path", "")).replace("\\", "/").strip("/")
            listed.append(relative)
            self.check(not relative.startswith("05_交付清单/"), f"Manifest 不能哈希自身：{relative}")
            if relative not in self.file_by_relative:
                self.fail(f"Manifest 指向不存在文件：{relative}")
                continue
            actual = self.read(relative)
            declared_size = str(row.get("Size", "")).strip()
            self.check(declared_size.isdigit() and int(declared_size) == len(actual), f"Manifest Size 与实际不一致：{relative}")
            digest = hashlib.sha256(actual).hexdigest().upper()
            self.check(str(row.get("SHA256", "")).strip().upper() == digest, f"Manifest SHA256 与实际不一致：{relative}")
        payload = sorted(path for path in self.relative_files if not path.startswith("05_交付清单/"))
        self.check(len(listed) == len(set(listed)), "Manifest Relative Path 不得重复")
        self.check(sorted(listed) == payload, "Manifest 必须逐项覆盖且只覆盖 119 个客户载荷文件")

        csv_raw = self.read("05_交付清单/交付清单.csv")
        if csv_raw:
            try:
                csv_rows = list(csv.DictReader(io.StringIO(csv_raw.decode("utf-8-sig"))))
                csv_fields = csv_rows[0].keys() if csv_rows else []
                self.check(list(csv_fields) == MANIFEST_FIELDS, "交付清单 CSV 列必须与 JSON 合同字段一致")
                self.check({row.get("Relative Path", "") for row in csv_rows} == set(listed), "交付清单 CSV 与 JSON 必须覆盖同一批文件")
            except (UnicodeDecodeError, csv.Error) as exc:
                self.fail(f"交付清单 CSV 无法读取：{exc}")

    def validate_asset_signatures(self) -> None:
        for relative in self.relative_files:
            payload = self.read(relative)
            suffix = PurePosixPath(relative).suffix.lower()
            self.check(len(payload) > 0, f"文件不得为空：{relative}")
            if suffix == ".png":
                self.check(payload.startswith(b"\x89PNG\r\n\x1a\n"), f"PNG 文件签名无效：{relative}")
            elif suffix == ".svg":
                self.check(b"<svg" in payload[:4096].lower(), f"SVG 文件内容无效：{relative}")
            elif suffix == ".pdf":
                self.check(payload.startswith(b"%PDF-"), f"PDF 文件签名无效：{relative}")
            elif suffix in {".brep", ".step", ".stl"}:
                self.check(len(payload) >= 1024, f"CAD 文件过小，疑似占位：{relative}")
                if suffix == ".step":
                    self.check(b"ISO-10303" in payload[:4096].upper(), f"STEP 缺少 ISO-10303 头，疑似非真实 STEP：{relative}")

    def validate_docx(self, relative: str) -> None:
        if not relative:
            return
        try:
            with zipfile.ZipFile(io.BytesIO(self.read(relative))) as docx:
                root = et.fromstring(docx.read("word/document.xml"))
        except (KeyError, et.ParseError, zipfile.BadZipFile) as exc:
            self.fail(f"DOCX 无法打开：{relative} ({exc})")
            return
        all_text: list[str] = []
        heading_count = 0
        for paragraph in root.findall(".//w:p", WORD_NS):
            text = "".join(node.text or "" for node in paragraph.findall(".//w:t", WORD_NS)).strip()
            if not text:
                continue
            all_text.append(text)
            style = paragraph.find("w:pPr/w:pStyle", WORD_NS)
            style_id = (style.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val", "") if style is not None else "").lower()
            if style_id.startswith("heading"):
                heading_count += 1
        combined = "\n".join(all_text)
        self.check(heading_count >= 33, f"DOCX 必须至少有 33 个标题级章节，实际 {heading_count}")
        for term in REQUIRED_DOC_TERMS:
            self.check(term in combined, f"DOCX 缺少必需工程覆盖词：{term}")

    def validate_pptx(self, relative: str) -> None:
        if not relative:
            return
        try:
            with zipfile.ZipFile(io.BytesIO(self.read(relative))) as pptx:
                names = [name for name in pptx.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)]
                names.sort(key=lambda name: int(re.search(r"slide(\d+)", name).group(1)))
                self.check(len(names) == 31, f"PPTX 必须恰有 31 页，实际 {len(names)}")
                all_text: list[str] = []
                for name in names:
                    slide = et.fromstring(pptx.read(name))
                    slide_text = [node.text or "" for node in slide.iter() if node.tag.endswith("}t") and (node.text or "").strip()]
                    self.check(bool(slide_text), f"PPTX 存在空白或无文本页面：{name}")
                    all_text.extend(slide_text)
        except (et.ParseError, zipfile.BadZipFile) as exc:
            self.fail(f"PPTX 无法打开：{relative} ({exc})")
            return
        combined = "\n".join(all_text)
        for term in REQUIRED_PPT_TERMS:
            self.check(term in combined, f"PPTX 缺少必需评审覆盖词：{term}")

    def validate_xlsx(self, relative: str) -> None:
        if not relative:
            return
        try:
            with zipfile.ZipFile(io.BytesIO(self.read(relative))) as xlsx:
                workbook = et.fromstring(xlsx.read("xl/workbook.xml"))
                sheet_nodes = workbook.findall("x:sheets/x:sheet", XLSX_NS)
                sheet_names = [node.get("name", "") for node in sheet_nodes]
                self.check(sheet_names == EXPECTED_SHEETS, f"XLSX 工作表必须按合同固定为 21 张，实际为 {sheet_names}")
                rels = et.fromstring(xlsx.read("xl/_rels/workbook.xml.rels"))
                targets = {node.get("Id"): node.get("Target", "") for node in rels}
                formulas: dict[str, int] = {}
                for node in sheet_nodes:
                    sheet_name = node.get("name", "")
                    rel_id = node.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                    target = targets.get(rel_id, "")
                    part = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
                    sheet = et.fromstring(xlsx.read(part))
                    cells = sheet.findall(".//x:c", XLSX_NS)
                    self.check(len(cells) > 10, f"XLSX 工作表疑似空壳：{sheet_name}")
                    formulas[sheet_name] = len(sheet.findall(".//x:f", XLSX_NS))
                for sheet_name, minimum in MIN_FORMULAS.items():
                    self.check(formulas.get(sheet_name, 0) >= minimum, f"XLSX {sheet_name} 公式不足：需要 ≥{minimum}，实际 {formulas.get(sheet_name, 0)}")
        except (KeyError, et.ParseError, zipfile.BadZipFile) as exc:
            self.fail(f"XLSX 无法打开：{relative} ({exc})")

    def run(self) -> None:
        formal = self.validate_layout()
        self.validate_open_items()
        self.validate_manifest()
        self.validate_asset_signatures()
        self.validate_docx(formal.get("docx", ""))
        self.validate_pptx(formal.get("pptx", ""))
        self.validate_xlsx(formal.get("xlsx", ""))


def main() -> int:
    parser = argparse.ArgumentParser(description=f"Validate a {PROFILE} delivery ZIP")
    parser.add_argument("zip_path", help="Path to the final customer ZIP")
    args = parser.parse_args()
    try:
        with zipfile.ZipFile(args.zip_path) as archive:
            validator = ContractValidator(archive)
            validator.run()
    except (FileNotFoundError, PermissionError, zipfile.BadZipFile) as exc:
        print(f"REWORK [{PROFILE}] 无法读取 ZIP：{exc}")
        return 2

    if validator.errors:
        print(f"REWORK [{PROFILE}] {len(validator.errors)} 项不符合：")
        for issue in validator.errors:
            print(f"- {issue}")
        return 2

    print(f"PASS [{PROFILE}] 121 个 ZIP 文件、119 个客户载荷、31 页 PPT、21 张 Excel 工作表、DOCX 标题与 Manifest 均符合合同。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
