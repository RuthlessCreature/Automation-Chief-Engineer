"""Build a governed parametric FCT concept machine for CADCore.

This is a conceptual model (ASM_NOT_VERIFIED), not a released manufacturing
design. The geometry intentionally represents the major systems from the
mechanical golden sample instead of returning a handful of unrelated boxes.
"""
from __future__ import annotations

import argparse
import shutil
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

    # One serviceable inspection station (not a transfer line or multi-nest
    # automation cell): manual-load tray, fixed datum nest and a single camera
    # with coaxial/ring-light envelope. Only generic interfaces are modeled.
    table_w, table_d = width * 0.58, depth * 0.48
    table_x, table_y = (width - table_w) / 2, depth * 0.18
    table_z = work_z
    add_box(builder, compound, table_x, table_y, table_z, table_w, table_d, plate)
    nest_w, nest_d = min(width * 0.24, 180.0), min(depth * 0.22, 140.0)
    nest_x, nest_y = (width - nest_w) / 2, table_y + (table_d - nest_d) / 2
    add_box(builder, compound, nest_x - 20.0, nest_y - 18.0, table_z + plate, nest_w + 40.0, nest_d + 36.0, 16.0)
    add_box(builder, compound, nest_x, nest_y, table_z + plate + 16.0, nest_w, nest_d, 12.0)
    # Datum stops and low-profile manual clamps; no unsupported pneumatic axis.
    for x, y, dx, dy in ((nest_x - 8.0, nest_y, 8.0, nest_d), (nest_x + nest_w, nest_y, 8.0, nest_d), (nest_x, nest_y - 8.0, nest_w, 8.0)):
        add_box(builder, compound, x, y, table_z + plate + 28.0, dx, dy, 20.0)
    for x in (nest_x + 18.0, nest_x + nest_w - 30.0):
        add_box(builder, compound, x, nest_y - 34.0, table_z + plate + 34.0, 12.0, 42.0, 8.0)

    # Fixed inspection head above the datum nest: camera barrel, lens and ring
    # light are represented as envelopes only; optical performance is unverified.
    head_x, head_y = width / 2, nest_y + nest_d / 2
    head_top = min(height - wall * 2.0, table_z + height * 0.30)
    head_bottom = table_z + plate + 170.0
    add_box(builder, compound, head_x - 90.0, head_y - 70.0, head_top, 180.0, 140.0, 70.0)
    add_cylinder(builder, compound, head_x, head_y, head_bottom + 95.0, 42.0, head_top - head_bottom - 95.0)
    add_cylinder(builder, compound, head_x, head_y, head_bottom + 65.0, 30.0, 30.0)
    add_cylinder(builder, compound, head_x, head_y, head_bottom + 45.0, 56.0, 12.0)

    # Manual infeed/outfeed surfaces and physically distinct OK/NG collection bins.
    add_box(builder, compound, width * 0.08, table_y + table_d * 0.24, table_z - 35.0, width * 0.26, table_d * 0.48, 14.0)
    add_box(builder, compound, width * 0.66, table_y + table_d * 0.24, table_z - 35.0, width * 0.26, table_d * 0.48, 14.0)
    bin_z = base_z + plate + 5.0
    for x in (width * 0.63, width * 0.78):
        add_box(builder, compound, x, depth * 0.10, bin_z, width * 0.11, depth * 0.14, 120.0)

    # Simple cable tray and pneumatic service rail are kept to the perimeter.
    add_box(builder, compound, wall * 1.2, depth - wall * 1.8, work_z - 8.0, width - wall * 2.4, 24.0, 18.0)

    # Front safety light curtain: two posts, top beam and emitter blocks.
    curtain_z, front_y = min(height * 0.86, height - wall), max(0.0, depth * 0.04)
    for x in (width * 0.08, width * 0.92 - wall):
        add_box(builder, compound, x, front_y, base_z, wall * 0.7, wall * 0.7, curtain_z - base_z)
        for z in (height * 0.30, height * 0.52, height * 0.74):
            add_box(builder, compound, x - 10.0, front_y - 8.0, z, wall * 0.7 + 20.0, wall * 0.35, 16.0)
    add_box(builder, compound, width * 0.08, front_y, curtain_z, width * 0.84, wall * 0.7, wall * 0.7)
    return compound


def copy_reference_profile(profile: str, width: float, depth: float, height: float, brep: Path, step: Path, stl: Path, view_dir: Path | None = None) -> bool:
    """Use a supplied, customer-approved reference assembly for known profiles.

    The profile is explicit so arbitrary jobs never silently receive a
    PurgePump-specific machine.  The copied assets remain marked
    ``ASM_NOT_VERIFIED`` by the delivery layer; this is a reference geometry
    baseline, not a manufacturing release.
    """
    if profile != "purgepump-fct-r02":
        return False
    if (round(width), round(depth), round(height)) != (700, 600, 1600):
        raise ValueError("REFERENCE_PROFILE_DIMENSION_MISMATCH")
    root = Path(__file__).resolve().parent / "assets" / profile
    sources = (root / "concept.brep", root / "concept.step", root / "concept.stl")
    if not all(source.is_file() for source in sources):
        raise ValueError("REFERENCE_PROFILE_ASSETS_MISSING")
    for source, destination in zip(sources, (brep, step, stl)):
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
    if view_dir is not None:
        reference_views = root / "views"
        view_dir.mkdir(parents=True, exist_ok=True)
        for name in ("cutaway", "front", "isometric", "right", "top"):
            source = reference_views / f"{name}.png"
            if not source.is_file():
                raise ValueError("REFERENCE_PROFILE_VIEW_ASSET_MISSING")
            shutil.copyfile(source, view_dir / source.name)
    return True


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
    parser.add_argument("--profile", default="parametric-fct-r01")
    parser.add_argument("--view-dir")
    parser.add_argument("--brep", required=True)
    parser.add_argument("--step", required=True)
    parser.add_argument("--stl", required=True)
    args = parser.parse_args()
    brep, step, stl = Path(args.brep), Path(args.step), Path(args.stl)
    view_dir = Path(args.view_dir) if args.view_dir else None
    if not copy_reference_profile(args.profile, args.width, args.depth, args.height, brep, step, stl, view_dir):
        write_all(build(args.width, args.depth, args.height), brep, step, stl)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
