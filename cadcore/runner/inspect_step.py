"""Fixed, non-interactive STEP inspection command for the G02 CAD gate.

This program never evaluates user code. It only consumes the staged file path
provided by the Worker, emits a JSON report, and exits non-zero on a failed
gate. It deliberately distinguishes unknown units from confirmed millimetres.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

from OCP.BRep import BRep_Builder
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeFace, BRepBuilderAPI_MakePolygon
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepTools import BRepTools
from OCP.Bnd import Bnd_Box
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_Reader
from OCP.TopAbs import TopAbs_EDGE, TopAbs_FACE, TopAbs_SOLID, TopAbs_VERTEX
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS_Compound
from OCP.gp import gp_Pnt


SCHEMA_VERSION = "cadcore-g02-0.1.0"
OCCT_BINDING_VERSION = "cadquery-ocp-novtk==7.9.3.1.1"
MAX_FACETED_POINTS = 250_000
MAX_FACETED_TRIANGLES = 250_000
POINT_PATTERN = re.compile(
    r"#(\d+)\s*=\s*CARTESIAN_POINT\s*\([^,]*,\s*\(\s*"
    r"([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*\)\s*\)"
)
TRIANGLE_LOOP_PATTERN = re.compile(
    r"POLY_LOOP\s*\([^,]*,\s*\(\s*#(\d+)\s*,\s*#(\d+)\s*,\s*#(\d+)\s*\)\s*\)"
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def count(shape, kind) -> int:
    explorer = TopExp_Explorer(shape, kind)
    total = 0
    while explorer.More():
        total += 1
        explorer.Next()
    return total


def source_header(path: Path) -> str:
    # STEP headers are ASCII-like by standard. Keep only a bounded, printable
    # excerpt in the report so logs never contain the full customer model.
    raw = path.read_bytes()[:4096]
    return raw.decode("utf-8", errors="replace").replace("\x00", " ")[:1000]


def faceted_fallback_shape(path: Path):
    """Build a BREP compound from a restricted triangular POLY_LOOP STEP form.

    Some upstream exporters write geometrically useful AP214-like faceted STEP
    data without the product/representation graph needed by STEPControl.  This
    fallback is intentionally narrow: it accepts only explicit triangular loops
    and records that it was used.  It is never a substitute for a general STEP
    parser and never invents geometry.
    """
    source = path.read_text(encoding="utf-8", errors="ignore")
    points: dict[int, tuple[float, float, float]] = {}
    for match in POINT_PATTERN.finditer(source):
        if len(points) >= MAX_FACETED_POINTS:
            raise ValueError("FACETED_POINT_LIMIT_EXCEEDED")
        point_id = int(match.group(1))
        points[point_id] = (float(match.group(2)), float(match.group(3)), float(match.group(4)))

    triangles: list[tuple[int, int, int]] = []
    for match in TRIANGLE_LOOP_PATTERN.finditer(source):
        if len(triangles) >= MAX_FACETED_TRIANGLES:
            raise ValueError("FACETED_TRIANGLE_LIMIT_EXCEEDED")
        triangle = tuple(int(match.group(index)) for index in range(1, 4))
        if not all(point_id in points for point_id in triangle):
            continue
        a, b, c = (points[point_id] for point_id in triangle)
        cross_x = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1])
        cross_y = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])
        cross_z = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if math.sqrt(cross_x * cross_x + cross_y * cross_y + cross_z * cross_z) > 1e-10:
            triangles.append(triangle)
    if not points or not triangles:
        raise ValueError("FACETED_TRIANGLES_NOT_FOUND")

    builder = BRep_Builder()
    compound = TopoDS_Compound()
    builder.MakeCompound(compound)
    faces_added = 0
    for triangle in triangles:
        polygon = BRepBuilderAPI_MakePolygon()
        for point_id in triangle:
            polygon.Add(gp_Pnt(*points[point_id]))
        polygon.Close()
        face_builder = BRepBuilderAPI_MakeFace(polygon.Wire())
        if not face_builder.IsDone():
            raise ValueError("FACETED_FACE_BUILD_FAILED")
        builder.Add(compound, face_builder.Face())
        faces_added += 1
    if faces_added != len(triangles):
        raise ValueError("FACETED_FACE_COUNT_MISMATCH")
    return compound, {"points": len(points), "triangles": len(triangles)}


def inspect(path: Path, normalized_brep: Path) -> dict:
    if path.suffix.lower() not in {".step", ".stp"}:
        raise ValueError("UNSUPPORTED_CAD_FORMAT")
    if path.stat().st_size == 0:
        raise ValueError("EMPTY_CAD_INPUT")
    header = source_header(path)
    if "ISO-10303" not in header.upper():
        raise ValueError("STEP_HEADER_MISSING")

    reader = STEPControl_Reader()
    read_status = reader.ReadFile(str(path))
    if read_status != IFSelect_RetDone:
        raise ValueError("STEP_READ_FAILED")
    transfer_status = reader.TransferRoots()
    if transfer_status <= 0:
        raise ValueError("STEP_TRANSFER_FAILED")
    shape = reader.OneShape()
    parse_strategy = "STEP_CONTROL"
    fallback_facts: dict[str, int] | None = None
    bbox = Bnd_Box()
    if not shape.IsNull():
        BRepBndLib.Add_s(shape, bbox)
    if shape.IsNull() or count(shape, TopAbs_FACE) == 0 or bbox.IsVoid():
        shape, fallback_facts = faceted_fallback_shape(path)
        parse_strategy = "RESTRICTED_FACETED_TRIANGLE_FALLBACK"
        bbox = Bnd_Box()
        BRepBndLib.Add_s(shape, bbox)
    if bbox.IsVoid():
        raise ValueError("STEP_VOID_BOUNDING_BOX")
    checker = BRepCheck_Analyzer(shape)
    shape_valid = bool(checker.IsValid())
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()
    normalized_brep.parent.mkdir(parents=True, exist_ok=True)
    if not BRepTools.Write_s(shape, str(normalized_brep)):
        raise ValueError("BREP_WRITE_FAILED")

    facts = {
        "vertices": count(shape, TopAbs_VERTEX),
        "edges": count(shape, TopAbs_EDGE),
        "faces": count(shape, TopAbs_FACE),
        "solids": count(shape, TopAbs_SOLID),
        "bbox": {
            "min": [xmin, ymin, zmin],
            "max": [xmax, ymax, zmax],
            "size": [xmax - xmin, ymax - ymin, zmax - zmin],
            "unitStatus": "UNCONFIRMED",
        },
    }
    passed = shape_valid and facts["faces"] > 0
    return {
        "schemaVersion": SCHEMA_VERSION,
        "status": "PASS" if passed else "BLOCKED",
        "gate": "G02",
        "engine": {"occtBinding": OCCT_BINDING_VERSION},
        "input": {"name": path.name, "bytes": path.stat().st_size, "sha256": sha256_file(path)},
        "step": {
            "rootsTransferred": transfer_status,
            "headerExcerpt": header,
            "parseStrategy": parse_strategy,
            "fallbackFacts": fallback_facts,
        },
        "geometry": {"shapeValid": shape_valid, **facts},
        "outputs": {"normalizedBrep": normalized_brep.name, "sha256": sha256_file(normalized_brep)},
        "warnings": [
            "STEP engineering unit is not inferred. Any downstream millimetre use requires an explicit engineering assumption or confirmed source unit.",
            *(["The source was normalized from a restricted explicit-triangle fallback because STEPControl did not expose usable faces. Preserve this provenance in downstream review."] if fallback_facts else []),
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--normalized-brep", required=True)
    args = parser.parse_args()
    report_path = Path(args.report)
    try:
        report = inspect(Path(args.input), Path(args.normalized_brep))
    except Exception as error:  # report only an allow-listed error class; never raw model contents.
        report = {"schemaVersion": SCHEMA_VERSION, "status": "BLOCKED", "gate": "G02", "errorCode": str(error)[:100]}
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return 2
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
