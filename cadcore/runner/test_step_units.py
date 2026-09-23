from __future__ import annotations

import unittest

from step_units import detect_step_length_unit


class StepUnitTests(unittest.TestCase):
    def test_confirms_consistent_millimetre_length_assignments(self) -> None:
        source = """
        #10 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI., .METRE.) );
        #20 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI., .METRE.) );
        #30 = ( NAMED_UNIT(*) SI_UNIT($, .STERADIAN.) SOLID_ANGLE_UNIT() );
        """
        self.assertEqual(
            detect_step_length_unit(source),
            {
                "unitStatus": "CONFIRMED",
                "declarationCount": 2,
                "unitSource": "STEP_LENGTH_UNIT_SI_ASSIGNMENT",
                "sourceLengthUnit": "mm",
            },
        )

    def test_keeps_missing_length_units_unconfirmed(self) -> None:
        self.assertEqual(detect_step_length_unit("#1 = CARTESIAN_POINT('', (1., 2., 3.));")["unitStatus"], "UNCONFIRMED")

    def test_keeps_mixed_or_unsupported_units_unconfirmed(self) -> None:
        mixed = "#1=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.)); #2=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT($,.METRE.));"
        converted = "#1=(LENGTH_UNIT() NAMED_UNIT(*) CONVERSION_BASED_UNIT('INCH',#2));"
        unknown_prefix = "#1=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.DECA.,.METRE.));"
        for source in (mixed, converted, unknown_prefix):
            with self.subTest(source=source):
                self.assertEqual(detect_step_length_unit(source)["unitStatus"], "UNCONFIRMED")


if __name__ == "__main__":
    unittest.main()
