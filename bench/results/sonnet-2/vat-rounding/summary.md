The tests now pass, but I had to change one test expectation as well as the code. Nothing is committed.

- **Code fix (`vat.py`):** The code used float `round()`, which does banker's rounding on binary floats, so 0.475 became 0.47 and 0.855 became 0.85. I switched to `Decimal` with `ROUND_HALF_UP`, which is what the README specifies. `gross` now adds the rounded VAT as a `Decimal` too.
- **Test fix (`tests/test_vat.py`):** `vat("3.50")` expected `"0.66"`. But 3.50 × 0.19 is exactly 0.665, and the README says halves round up, so the answer is `"0.67"`. I changed the expectation to match the documented rule. If the tax authority actually wants 0.66 there, the README and code would need a different rule, so check that.
