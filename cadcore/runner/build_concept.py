"""Build a governed parametric FCT concept machine for CADCore.

This is a conceptual model (ASM_NOT_VERIFIED), not a released manufacturing
design. The geometry intentionally represents the major systems from the
mechanical golden sample instead of returning a handful of unrelated boxes.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from OCP.BRep import BRep_Builder
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeCylinder
from OCP.BRepTools import BRepTools
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopoDS import TopoDS_Compound
from OCP.gp import gp_Ax2, gp_Dir, gp_Pnt


def add_box(builder: BRep_Builder, compound: TopoDS_Compound, x: float, y: float, z: float, dx: float, dy: float, dz: float) -> None:
    if min(dx, dy, dz) > 0:
        builder.Add(compound, BRepPrimAPI_MakeBox(gp_Pnt(x, y, z), dx, dy, dz).Shape())


def add_cylinder(builder: BRep_Builder, compound: TopoDS_Compound, x: float, y: float, z: float, radius: float, height: float) -> None:
    if radius > 0 and height > 0:
        axis = gp_Ax2(gp_Pnt(x, y, z), gp_Dir(0.0, 0.0, 1.0))
        builder.Add(compound, BRepPrimAPI_MakeCylinder(axis, radius, height).Shape())


def build(width: float, depth: float, height: float):
    """Create a deterministic multi-system machine concept compound in mm."""
    if not (500 <= width <= 6000 and 500 <= depth <= 6000 and 500 <= height <= 6000):
        raise ValueError("CONCEPT_ENVELOPE_OUT_OF_RANGE")
    builder = BRep_Builder()
    compound = TopoDS_Compound()
    builder.MakeCompound(compound)

    # The FCT reference envelope is 700 x 600 x 1600 mm when no customer
    # machine dimensions are provided. All parts remain conceptual.
    wall = max(30.0, min(width, depth) * 0.04)
    plate = max(20.0, min(width, depth) * 0.035)
    work_z = min(height * 0.58, height - 300.0)
    base_z = max(20.0, height * 0.025)
    top_z = height - wall

    # Structural frame: four posts, base rails and upper/mid rails.
    for x in (0.0, width - wall):
        for y in (0.0, depth - wall):
            add_box(builder, compound, x, y, 0.0, wall, wall, height)
    for z in (0.0, top_z, work_z - wall * 0.5):
        add_box(builder, compound, 0.0, 0.0, z, width, wall, wall)
        add_box(builder, compound, 0.0, depth - wall, z, width, wall, wall)
        add_box(builder, compound, 0.0, 0.0, z, wall, depth, wall)
        add_box(builder, compound, width - wall, 0.0, z, wall, depth, wall)

    # Base, feet, rear panel and side guards.
    add_box(builder, compound, wall, wall, base_z, width - 2 * wall, depth - 2 * wall, plate)
    for x in (wall * 1.5, width - wall * 1.5):
        for y in (wall * 1.5, depth - wall * 1.5):
            add_cylinder(builder, compound, x, y, 0.0, wall * 0.45, base_z)
            add_cylinder(builder, compound, x, y, base_z, wall * 0.22, wall * 0.8)
    add_box(builder, compound, wall, depth - wall * 1.6, base_z, width - 2 * wall, wall * 0.6, height * 0.78)
    add_box(builder, compound, 0.0, wall, base_z, wall * 0.6, depth - 2 * wall, height * 0.78)
    add_box(builder, compound, width - wall * 0.6, wall, base_z, wall * 0.6, depth - 2 * wall, height * 0.78)

    # Electrical cabinet, door and front HMI stand.
    cab_w, cab_d = width * 0.22, depth * 0.24
    cab_x, cab_y = wall * 1.6, depth - cab_d - wall * 2.0
    cab_h = height * 0.55
    add_box(builder, compound, cab_x, cab_y, base_z + plate, cab_w, cab_d, cab_h)
    add_box(builder, compound, cab_x + cab_w * 0.12, cab_y - 2.0, base_z + cab_h * 0.23, cab_w * 0.76, 8.0, cab_h * 0.48)
    add_box(builder, compound, cab_x + cab_w * 0.16, cab_y - 20.0, base_z + cab_h * 0.68, cab_w * 0.68, 18.0, 80.0)
    add_box(builder, compound, width * 0.43, 0.0, work_z + 80.0, width * 0.20, wall * 0.7, 22.0)
    add_box(builder, compound, width * 0.49, wall * 0.3, work_z + 102.0, width * 0.08, depth * 0.08, 160.0)
    add_box(builder, compound, width * 0.47, wall * 0.3, work_z + 250.0, width * 0.12, 24.0, 90.0)

    # Two Y servo rails and their common tray.
    rail_x = (width * 0.22, width * 0.72)
    rail_y, rail_len = depth * 0.16, depth * 0.62
    for x in rail_x:
        add_box(builder, compound, x, rail_y, work_z, max(28.0, wall * 0.7), rail_len, 24.0)
        add_box(builder, compound, x + 4.0, rail_y + 20.0, work_z + 24.0, max(20.0, wall * 0.5), rail_len - 40.0, 18.0)
        for y in (rail_y + 55.0, rail_y + rail_len - 55.0):
            add_cylinder(builder, compound, x + wall * 0.35, y, work_z + 42.0, 13.0, 18.0)
    add_box(builder, compound, width * 0.15, rail_y + rail_len * 0.18, work_z + 48.0, width * 0.73, rail_len * 0.64, 20.0)

    # Four stations: 2-up fixture plates, product nests, probe beds, clamps,
    # floating pneumatic heads and Hall/load interface brackets.
    nest_w = max(70.0, min(width * 0.18, 190.0))
    nest_d = max(58.0, min(depth * 0.16, 150.0))
    nest_z = work_z + 68.0
    station_x = (width * 0.28, width * 0.58)
    station_y = (rail_y + rail_len * 0.25, rail_y + rail_len * 0.62)
    for sx in station_x:
        for sy in station_y:
            px, py = sx - nest_w * 0.55, sy - nest_d * 0.62
            add_box(builder, compound, px, py, work_z + 48.0, nest_w * 1.35, nest_d * 1.55, 20.0)
            add_box(builder, compound, px + 7.0, py + 7.0, nest_z, nest_w, nest_d, 12.0)
            for bx, by, dx, dy in ((px - 8.0, py + 4.0, 8.0, nest_d + 6.0), (px + nest_w + 2.0, py + 4.0, 8.0, nest_d + 6.0), (px + 4.0, py - 8.0, nest_w + 6.0, 8.0), (px + 4.0, py + nest_d + 2.0, nest_w + 6.0, 8.0)):
                add_box(builder, compound, bx, by, nest_z + 12.0, dx, dy, 24.0)
            add_box(builder, compound, px + 15.0, py + 15.0, work_z + 22.0, nest_w - 30.0, nest_d - 30.0, 20.0)
            for cx, cy in ((px + 14.0, py + 14.0), (px + nest_w - 14.0, py + 14.0), (px + 14.0, py + nest_d - 14.0), (px + nest_w - 14.0, py + nest_d - 14.0)):
                add_cylinder(builder, compound, cx, cy, nest_z + 28.0, 6.0, 18.0)

            # Pneumatic floating head assembly.
            tool_x, tool_y = sx + nest_w * 0.12, sy + nest_d * 0.1
            upper_z = min(height - 240.0, work_z + 370.0)
            add_cylinder(builder, compound, tool_x, tool_y, upper_z, 24.0, 150.0)
            add_cylinder(builder, compound, tool_x, tool_y, upper_z - 42.0, 10.0, 48.0)
            add_box(builder, compound, tool_x - 42.0, tool_y - 36.0, upper_z - 58.0, 84.0, 72.0, 18.0)
            add_box(builder, compound, tool_x - 54.0, tool_y - 47.0, upper_z + 150.0, 108.0, 94.0, 20.0)
            add_box(builder, compound, tool_x - 64.0, tool_y - 57.0, upper_z + 170.0, 10.0, 114.0, 90.0)
            add_box(builder, compound, tool_x + 54.0, tool_y - 57.0, upper_z + 170.0, 10.0, 114.0, 90.0)

            # Hall/load interface and adjustable bracket.
            add_box(builder, compound, px + nest_w * 0.72, py + nest_d * 0.32, nest_z + 30.0, 42.0, 28.0, 58.0)
            add_cylinder(builder, compound, px + nest_w * 0.88, py + nest_d * 0.47, nest_z + 52.0, 9.0, 34.0)
            add_box(builder, compound, px + nest_w * 0.83, py + nest_d * 0.18, nest_z + 25.0, 18.0, 70.0, 12.0)

    # Cable chains and pneumatic manifold.
    for x in (width * 0.18, width * 0.82):
        add_box(builder, compound, x, rail_y - 24.0, work_z - 8.0, 28.0, rail_len + 48.0, 16.0)
        for y in (rail_y + 30.0, rail_y + rail_len * 0.33, rail_y + rail_len * 0.66, rail_y + rail_len - 30.0):
            add_box(builder, compound, x - 4.0, y, work_z + 18.0, 36.0, 12.0, 22.0)
    manifold_x, manifold_y = width * 0.76, depth - depth * 0.22
    for i in range(4):
        add_cylinder(builder, compound, manifold_x + i * 32.0, manifold_y, height * 0.62, 12.0, 56.0)
        add_box(builder, compound, manifold_x - 14.0 + i * 32.0, manifold_y - 18.0, height * 0.62 - 10.0, 28.0, 36.0, 10.0)

    # Front safety light curtain: two posts, top beam and emitter blocks.
    curtain_z, front_y = min(height * 0.86, height - wall), max(0.0, depth * 0.04)
    for x in (width * 0.08, width * 0.92 - wall):
        add_box(builder, compound, x, front_y, base_z, wall * 0.7, wall * 0.7, curtain_z - base_z)
        for z in (height * 0.30, height * 0.52, height * 0.74):
            add_box(builder, compound, x - 10.0, front_y - 8.0, z, wall * 0.7 + 20.0, wall * 0.35, 16.0)
    add_box(builder, compound, width * 0.08, front_y, curtain_z, width * 0.84, wall * 0.7, wall * 0.7)
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
