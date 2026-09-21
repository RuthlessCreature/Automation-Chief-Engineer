"""Static regression gate for the CADCore concept-machine builder.

The CI image intentionally does not install OCCT.  This check therefore does
not pretend to validate a STEP file; it prevents the production builder from
silently regressing to the old box-only scope marker until the container-level
OCCT integration test runs.
"""
from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "cadcore" / "runner" / "build_concept.py"
text = SOURCE.read_text(encoding="utf-8")
tree = ast.parse(text, filename=str(SOURCE))
build = next((node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "build"), None)
if build is None:
    raise SystemExit("CONCEPT_BUILDER_MISSING_BUILD_FUNCTION")

primitive_calls = [
    node
    for node in ast.walk(build)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id in {"add_box", "add_cylinder"}
]
if len(primitive_calls) < 40:
    raise SystemExit(f"CONCEPT_BUILDER_TOO_SPARSE: {len(primitive_calls)} primitive call sites")

for marker in ("Electrical cabinet", "Two Y servo rails", "Four stations", "Front safety light curtain", "purgepump-fct-r02", "REFERENCE_PROFILE_DIMENSION_MISMATCH"):
    if marker not in text:
        raise SystemExit(f"CONCEPT_BUILDER_MISSING_ARCHITECTURE_MARKER: {marker}")

reference_root = ROOT / "cadcore" / "assets" / "purgepump-fct-r02"
for filename, minimum_bytes in (("concept.brep", 600_000), ("concept.step", 4_000_000), ("concept.stl", 300_000)):
    asset = reference_root / filename
    if not asset.is_file() or asset.stat().st_size < minimum_bytes:
        raise SystemExit(f"CONCEPT_REFERENCE_ASSET_MISSING_OR_SMALL: {asset}")
for name in ("cutaway", "front", "isometric", "right", "top"):
    view = reference_root / "views" / f"{name}.png"
    if not view.is_file() or view.stat().st_size < 20_000:
        raise SystemExit(f"CONCEPT_REFERENCE_VIEW_MISSING_OR_SMALL: {view}")

print(f"concept builder contract PASS: {len(primitive_calls)} primitive call sites")
