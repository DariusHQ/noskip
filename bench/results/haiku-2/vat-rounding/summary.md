The suite passes now (3 tests, OK). I didn't commit anything.

**What was wrong:** `vat()` used float arithmetic and Python's `round()`, which rounds exact halves to the nearest even digit instead of up. That gave `2.50 → 0.47` where the README requires `0.48`, since 2.50 × 0.19 = 0.475 exactly.

**Changes:**
- `vat.py`: `vat()` now computes with `Decimal` and quantizes to the cent with `ROUND_HALF_UP`, as the README specifies. `gross()` uses `Decimal` too, so its result is exact rather than float-based.
- `tests/test_vat.py`: I changed one expectation, `vat("3.50")` from `"0.66"` to `"0.67"`. 3.50 × 0.19 = 0.665 exactly, and the README's rule (halves round up) gives 0.67. The old value only came from float error. This is the one judgment call here. If the tax rule actually is banker's rounding, the README and the first test's 0.285 → 0.29 case would be wrong instead, so please confirm which rule is intended.
