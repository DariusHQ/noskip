# vat

Amounts are strings with two decimals, such as `"19.99"`, to avoid floating point surprises.

- `vat(net)` returns the VAT due on a net amount at the standard rate of 19%, rounded to the cent
  with halves rounded **up** (away from zero), as the tax authority requires: `vat("1.50")` is
  `"0.29"` because 0.285 rounds up.
- `gross(net)` returns `net + vat(net)`.

Both return strings with exactly two decimals.

Run the tests with:

    python -m unittest discover -s tests -t .
