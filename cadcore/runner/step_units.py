"""Conservative parser for explicit STEP length-unit assignments."""

from __future__ import annotations

import re


ENTITY_PATTERN = re.compile(r"#\d+\s*=\s*(.*?);", re.DOTALL)
LENGTH_UNIT_PATTERN = re.compile(r"\bLENGTH_UNIT\s*\(\s*\)", re.IGNORECASE)
SI_METRE_PATTERN = re.compile(
    r"\bSI_UNIT\s*\(\s*(\$|\.[A-Z_]+\.)\s*,\s*\.METRE\.\s*\)",
    re.IGNORECASE,
)
SI_PREFIXES = {
    "$": "m",
    ".MILLI.": "mm",
    ".CENTI.": "cm",
    ".KILO.": "km",
    ".MICRO.": "um",
    ".NANO.": "nm",
}


def detect_step_length_unit(source: str) -> dict[str, object]:
    """Confirm a unit only when every explicit LENGTH_UNIT uses one known SI metre unit.

    Unknown, conversion-based, mixed, or absent declarations remain UNCONFIRMED;
    this function never infers units from geometry scale or filenames.
    """
    declarations: list[str | None] = []
    for match in ENTITY_PATTERN.finditer(source):
        statement = match.group(1)
        if not LENGTH_UNIT_PATTERN.search(statement):
            continue
        unit_match = SI_METRE_PATTERN.search(statement)
        if not unit_match:
            declarations.append(None)
            continue
        declarations.append(SI_PREFIXES.get(unit_match.group(1).upper()))

    recognized = {unit for unit in declarations if unit is not None}
    confirmed = bool(declarations) and all(unit is not None for unit in declarations) and len(recognized) == 1
    if not confirmed:
        return {
            "unitStatus": "UNCONFIRMED",
            "declarationCount": len(declarations),
            "unitSource": None,
            "sourceLengthUnit": None,
        }
    unit = next(iter(recognized))
    return {
        "unitStatus": "CONFIRMED",
        "declarationCount": len(declarations),
        "unitSource": "STEP_LENGTH_UNIT_SI_ASSIGNMENT",
        "sourceLengthUnit": unit,
    }
