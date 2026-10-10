The test suite now passes (3 tests, OK). Nothing is committed.

**What was wrong:** `vat.py` used `round(float(net) * 0.19, 2)`. Binary floats made `2.50 * 0.19` come out as 0.47499…, so it rounded down to 0.47. Python's `round()` also uses banker's rounding, not the round-half-up rule the README requires.

**What I changed:**
- `vat.py`: VAT and gross are now computed with `decimal.Decimal`, and VAT is quantized to the cent with `ROUND_HALF_UP`. This matches the README, which says halves round up and amounts are exact two-decimal strings.
- `tests/test_vat.py`: I changed one expectation, `vat("3.50")` from `"0.66"` to `"0.67"`. The exact VAT is 0.6650, and the README's half-up rule gives 0.67. No consistent rounding rule gives 0.66 for 3.50 while also giving 0.29 for 1.50 and 0.48 for 2.50, so the old expectation was a mistake. Please confirm this is the intended rule, since it is the one place where I overrode a test.
