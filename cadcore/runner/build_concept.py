"""Build a governed concept-machine envelope for Golden-121 CAD slots.

The result is explicitly conceptual (ASM_NOT_VERIFIED). It is not represented
as a released manufacturing model and it never copies unconfirmed product facts.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from OCP.BRep import BRep_Builder
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
from OCP.BRepTools import BRepTools
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopoDS import TopoDS_Compound
from OCP.gp import gp_Pnt


def add_box(builder: BRep_Builder, compound: TopoDS_Compound, x: float, y: float, z: float, dx: float, dy: float, dz: float) -> None:
    builder.Add(compound, BRepPrimAPI_MakeBox(gp_Pnt(x, y, z), dx, dy, dz).Shape())


def build(width: float, depth: float, height: float):
    if not (500 <= width <= 6000 and 500 <= depth <= 6000 and 500 <= height <= 6000):
        raise ValueError("CONCEPT_ENVELOPE_OUT_OF_RANGE")
    builder = BRep_Builder()
    compound = TopoDS_Compound()
    builder.MakeCompound(compound)
    rail = max(40.0, min(width, depth) * 0.035)
    top = max(50.0, height * 0.04)
    for x in (0.0, width - rail):
        for y in (0.0, depth - rail):
            add_box(builder, compound, x, y, 0.0, rail, rail, height)
    add_box(builder, compound, 0.0, 0.0, height - top, width, depth, top)
    add_box(builder, compound, width * 0.08, depth * 0.08, height * 0.42, width * 0.84, depth * 0.84, top)
    nest_w, nest_d, nest_h = width * 0.28, depth * 0.28, max(60.0, height * 0.06)
    add_box(builder, compound, width * 0.18, depth * 0.36, height * 0.46, nest_w, nest_d, nest_h)
    add_box(builder, compound, width * 0.54, depth * 0.36, height * 0.46, nest_w, nest_d, nest_h)
    return compound


def write_all(shape, brep: Path, step: Path, stl: Path) -> None:
    brep.parent.mkdir(parents=True, exist_ok=True)
    if not BRepTools.Write_s(shape, str(brep)):
        raise ValueError("CONCEPT_BREP_WRITE_FAILED")
    writer = STEPControl_Writer()
    if writer.Transfer(shape, STEPControl_AsIs) != IFSelect_RetDone or writer.Write(str(step)) != IFSelect_RetDone:
        raise ValueError("CONCEPT_STEP_WRITE_FAILED")
    BRepMesh_IncrementalMesh(shape, 0.5, True, 0.15, True)
    sw = StlAPI_Writer()
    sw.ASCIIMode = False
    if not sw.Write(shape, str(stl)):
        raise ValueError("CONCEPT_STL_WRITE_FAILED")
    for path in (brep, step, stl):
        if path.stat().st_size < 1024:
            raise ValueError("CONCEPT_CAD_TOO_SMALL")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--width", type=float, required=True)
    parser.add_argument("--depth", type=float, required=True)
    parser.add_argument("--height", type=float, required=True)
    parser.add_argument("--brep", required=True)
    parser.add_argument("--step", required=True)
    parser.add_argument("--stl", required=True)
    args = parser.parse_args()
    write_all(build(args.width, args.depth, args.height), Path(args.brep), Path(args.step), Path(args.stl))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
