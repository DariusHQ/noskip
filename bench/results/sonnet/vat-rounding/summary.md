All tests pass now, but I had to change one test's expected value, so please check that change.

- **`vat.py`:** The old code used floats and Python's `round()`. Float error and banker's rounding gave `0.47` for `vat("2.50")` instead of `0.48`, and `5.35` for `gross("4.50")` instead of `5.36`. I switched to `Decimal` with `ROUND_HALF_UP`, which is the rounding the README requires.
- **`tests/test_vat.py`:** The test expected `vat("3.50") == "0.66"`. 3.50 × 0.19 is exactly 0.665, and the README says halves round up, so the correct answer is `"0.67"`. I changed the test to `"0.67"`. I treated the README as the spec; if `0.66` was intended, the spec and test disagree and someone needs to decide which is right.

I did not commit.
