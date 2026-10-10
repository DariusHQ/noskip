RATE = 0.19


def vat(net):
    """VAT due on a net amount. See README.md."""
    return f"{round(float(net) * RATE, 2):.2f}"


def gross(net):
    return f"{float(net) + float(vat(net)):.2f}"
