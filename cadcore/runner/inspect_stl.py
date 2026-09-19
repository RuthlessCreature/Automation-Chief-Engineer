"""Fixed STL-to-BREP geometry inspection for the G02 CAD gate.

The parser accepts binary and ASCII STL without executing or interpreting any
customer code. Triangles are converted to a BREP compound through OCCT and a
bounded geometry report is emitted. The report deliberately calls the result a
faceted mesh-derived BREP; it does not claim a watertight solid when the mesh
does not prove one.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
from pathlib import Path

from OCP.BRep import BRep_Builder
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepBuilderAPI import BRepBuilderAPI_MakeFace, BRepBuilderAPI_MakePolygon
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepTools import BRepTools
from OCP.Bnd import Bnd_Box
from OCP.TopoDS import TopoDS_Compound
from OCP.TopAbs import TopAbs_EDGE, TopAbs_FACE, TopAbs_SOLID, TopAbs_VERTEX
from OCP.TopExp import TopExp_Explorer
from OCP.gp import gp_Pnt

SCHEMA_VERSION = "cadcore-g02-stl-0.1.0"
OCCT_BINDING_VERSION = "cadquery-ocp-novtk==7.9.3.1.1"
MAX_TRIANGLES = 250_000
ASCII_VERTEX = re.compile(r"^\s*vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s*$", re.I)


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


def parse_binary(path: Path) -> list[tuple[tuple[float, float, float], ...]]:
    raw = path.read_bytes()
    if len(raw) < 84:
        return []
    triangle_count = struct.unpack_from("<I", raw, 80)[0]
    expected = 84 + triangle_count * 50
    if triangle_count > MAX_TRIANGLES or expected != len(raw):
        return []
    triangles = []
    offset = 84
    for _ in range(triangle_count):
        values = struct.unpack_from("<12f", raw, offset)
        triangles.append((tuple(values[3:6]), tuple(values[6:9]), tuple(values[9:12])))
        offset += 50
    return triangles


def parse_ascii(path: Path) -> list[tuple[tuple[float, float, float], ...]]:
    triangles: list[tuple[tuple[float, float, float], ...]] = []
    current: list[tuple[float, float, float]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as source:
        for line in source:
            match = ASCII_VERTEX.match(line)
            if not match:
                continue
            current.append(tuple(float(match.group(index)) for index in range(1, 4)))
            if len(current) == 3:
                triangles.append(tuple(current))
                current = []
                if len(triangles) > MAX_TRIANGLES:
                    raise ValueError("STL_TRIANGLE_LIMIT_EXCEEDED")
    return triangles


def build_shape(triangles):
    builder = BRep_Builder()
    compound = TopoDS_Compound()
    builder.MakeCompound(compound)
    unique_edges: dict[tuple[tuple[float, float, float], tuple[float, float, float]], int] = {}
    points = set()
    faces_added = 0
    for triangle in triangles:
        if len(set(triangle)) < 3:
            continue
        points.update(triangle)
        for first, second in ((triangle[0], triangle[1]), (triangle[1], triangle[2]), (triangle[2], triangle[0])):
            key = tuple(sorted((first, second)))
            unique_edges[key] = unique_edges.get(key, 0) + 1
        polygon = BRepBuilderAPI_MakePolygon()
        for point in triangle:
            polygon.Add(gp_Pnt(*point))
        polygon.Close()
        face_builder = BRepBuilderAPI_MakeFace(polygon.Wire())
        if not face_builder.IsDone():
            raise ValueError("STL_FACE_BUILD_FAILED")
        builder.Add(compound, face_builder.Face())
        faces_added += 1
    if not faces_added:
        raise ValueError("STL_TRIANGLES_NOT_FOUND")
    return compound, points, unique_edges


def inspect(path: Path, normalized_brep: Path) -> dict:
    if path.suffix.lower() != ".stl":
        raise ValueError("UNSUPPORTED_CAD_FORMAT")
    if path.stat().st_size == 0:
        raise ValueError("EMPTY_CAD_INPUT")
    triangles = parse_binary(path) or parse_ascii(path)
    if not triangles:
        raise ValueError("STL_TRIANGLES_NOT_FOUND")
    shape, points, edges = build_shape(triangles)
    bbox = Bnd_Box()
    BRepBndLib.Add_s(shape, bbox)
    if bbox.IsVoid():
        raise ValueError("STL_VOID_BOUNDING_BOX")
    checker = BRepCheck_Analyzer(shape)
    shape_valid = bool(checker.IsValid())
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()
    normalized_brep.parent.mkdir(parents=True, exist_ok=True)
    if not BRepTools.Write_s(shape, str(normalized_brep)):
        raise ValueError("BREP_WRITE_FAILED")
    boundary_edges = sum(1 for uses in edges.values() if uses == 1)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "status": "PASS" if shape_valid else "BLOCKED",
        "gate": "G02",
        "engine": {"occtBinding": OCCT_BINDING_VERSION, "parser": "binary-or-ascii-stl"},
        "input": {"name": path.name, "bytes": path.stat().st_size, "sha256": sha256_file(path)},
        "stl": {"format": "binary" if parse_binary(path) else "ascii", "triangles": len(triangles), "uniqueVertices": len(points), "boundaryEdges": boundary_edges, "watertightEvidence": boundary_edges == 0},
        "geometry": {"shapeValid": shape_valid, "vertices": count(shape, TopAbs_VERTEX), "edges": count(shape, TopAbs_EDGE), "faces": count(shape, TopAbs_FACE), "solids": count(shape, TopAbs_SOLID), "bbox": {"min": [xmin, ymin, zmin], "max": [xmax, ymax, zmax], "size": [xmax - xmin, ymax - ymin, zmax - zmin], "unitStatus": "UNCONFIRMED"}},
        "outputs": {"normalizedBrep": normalized_brep.name, "sha256": sha256_file(normalized_brep)},
        "warnings": ["STL carries no authoritative engineering unit; downstream millimetre assumptions require explicit confirmation.", "A mesh-derived BREP is faceted and is not claimed to be a watertight manufacturing solid unless boundaryEdges is zero."],
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
    except Exception as error:
        report = {"schemaVersion": SCHEMA_VERSION, "status": "BLOCKED", "gate": "G02", "errorCode": str(error)[:100]}
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return 2
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if report["status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
