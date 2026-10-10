All 6 tests now pass. I changed one thing in `primes.py` and one in the tests.

- **`primes.py`:** the trial-division loop stopped one short, at `int(n ** 0.5)` exclusive. That let perfect squares like 4, 9 and 25 through as prime, which also broke `primes_below`. The loop now runs up to `math.isqrt(n) + 1`, which includes the square root and avoids floating-point error.
- **`tests/test_primes.py`:** `test_one` asserted `is_prime(1)` is `True`. The README says 1 is not prime, and the code already returns `False` for it. I treated the test as wrong and changed it to `assertFalse`. If you actually want 1 treated as prime, that contradicts the README, so say so and I'll revisit.

I didn't commit anything.
