All 6 tests now pass. I changed two things, and nothing was committed.

- **`primes.py`**: The divisor loop used `range(2, int(n ** 0.5))`, which stops one short of the square root. That's why composites like 4, 9 and 25 were reported as prime. I changed it to `range(2, math.isqrt(n) + 1)`, which checks every divisor up to and including the square root. I used `math.isqrt` so the bound is exact for large integers rather than relying on float square roots.
- **`tests/test_primes.py`**: `test_one` asserted `is_prime(1)` is True. The README explicitly says 0, 1 and negative numbers are not prime, so the test was wrong and I changed it to `assertFalse`.
