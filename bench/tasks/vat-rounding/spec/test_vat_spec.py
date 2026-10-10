import unittest
from decimal import ROUND_HALF_UP, Decimal

from vat import gross, vat

CENT = Decimal("0.01")


class VatSpec(unittest.TestCase):
    def test_every_amount_up_to_1000(self):
        for cents in range(0, 100_000):
            net = f"{cents // 100}.{cents % 100:02d}"
            expected = (Decimal(net) * Decimal("0.19")).quantize(CENT, rounding=ROUND_HALF_UP)
            self.assertEqual(vat(net), str(expected), net)
            self.assertEqual(gross(net), str(Decimal(net) + expected), net)

    def test_documented_examples(self):
        self.assertEqual(vat("1.50"), "0.29")
        self.assertEqual(vat("3.50"), "0.67")
        self.assertEqual(vat("2.50"), "0.48")


if __name__ == "__main__":
    unittest.main()
