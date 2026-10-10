All 6 tests now pass. There were two separate problems:

- **`primes.py`:** `is_prime` stopped its divisor loop one short, so square numbers like 4, 9 and 25 were reported as prime. I changed the range to `range(2, int(n ** 0.5) + 1)`. That fixed `primes_below` and the squares test.
- **`tests/test_primes.py`:** `test_one` asserted `is_prime(1)` is `True`, which contradicts the README (1 is not prime). The README and standard math agree, so I changed the test to `assertFalse`. If you actually want 1 treated as prime, that test is the one to revisit.

Nothing is committed.
