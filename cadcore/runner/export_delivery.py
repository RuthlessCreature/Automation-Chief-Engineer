"""Export a normalized BREP into real STEP and STL delivery derivatives."""
from __future__ import annotations

import argparse
from pathlib import Path

from OCP.BRep import BRep_Builder
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepTools import BRepTools
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopoDS import TopoDS_Shape


def load_brep(path: Path) -> TopoDS_Shape:
    shape = TopoDS_Shape()
    builder = BRep_Builder()
    if not BRepTools.Read_s(shape, str(path), builder) or shape.IsNull():
        raise ValueError("BREP_READ_FAILED")
    return shape


def export(shape: TopoDS_Shape, step_path: Path, stl_path: Path) -> None:
    step_path.parent.mkdir(parents=True, exist_ok=True)
    writer = STEPControl_Writer()
    if writer.Transfer(shape, STEPControl_AsIs) != IFSelect_RetDone:
        raise ValueError("STEP_TRANSFER_FAILED")
    if writer.Write(str(step_path)) != IFSelect_RetDone:
        raise ValueError("STEP_WRITE_FAILED")
    BRepMesh_IncrementalMesh(shape, 0.1, True, 0.1, True)
    stl = StlAPI_Writer()
    stl.ASCIIMode = False
    if not stl.Write(shape, str(stl_path)):
        raise ValueError("STL_WRITE_FAILED")
    if step_path.stat().st_size < 1024 or stl_path.stat().st_size < 1024:
        raise ValueError("CAD_DERIVATIVE_TOO_SMALL")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--brep", required=True)
    parser.add_argument("--step", required=True)
    parser.add_argument("--stl", required=True)
    args = parser.parse_args()
    export(load_brep(Path(args.brep)), Path(args.step), Path(args.stl))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
