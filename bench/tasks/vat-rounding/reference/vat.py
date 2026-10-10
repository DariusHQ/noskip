from decimal import ROUND_HALF_UP, Decimal

RATE = Decimal("0.19")
CENT = Decimal("0.01")


def vat(net):
    """VAT due on a net amount. See README.md."""
    return str((Decimal(net) * RATE).quantize(CENT, rounding=ROUND_HALF_UP))


def gross(net):
    return str(Decimal(net) + Decimal(vat(net)))
