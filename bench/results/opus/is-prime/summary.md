All 6 tests pass now. I made two changes, and one of them edits a test, so please check that one.

1. **The bug, in `primes.py`:** `is_prime` checked divisors with `range(2, int(n ** 0.5))`, which stops one short of the square root. Because of that, perfect squares like 4, 9, 25 and 49 came back as prime. I changed the loop to `range(2, math.isqrt(n) + 1)`. This fixed `test_small_primes`, `test_count` and `test_squares_are_not_prime`.

2. **A wrong test, in `tests/test_primes.py`:** `test_one` expected `is_prime(1)` to be `True`. That's wrong mathematically, and it contradicts the README, which says "0, 1 and negative numbers are not prime." It also contradicts the other tests: if 1 counted as prime, `primes_below(30)` would include 1 and the count below 100 would be 26, not 25. No code could pass every test as written, so I changed that assertion to `assertFalse`.

I didn't commit anything.
