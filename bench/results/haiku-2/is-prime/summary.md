All 6 tests now pass with `python -m unittest discover -s tests -t .`. Nothing was committed, and nothing was installed.

I made two changes:

1. **`primes.py`**: The trial-division loop ran to `int(n ** 0.5)` exclusive, so it never tested the square root itself. That is why 4, 9, 25, 49 and 121 were reported as prime, and why `primes_below(30)` included composites. The loop now runs to `math.isqrt(n) + 1`, which is exact for integers and includes the square root.

2. **`tests/test_primes.py`**: `test_one` asserted that `is_prime(1)` is `True`. I changed it to `assertFalse`. I went with the README, which says "0, 1 and negative numbers are not prime", and with `test_count`, which expects 25 primes below 100 (that count excludes 1). If you actually want 1 to count as prime, the README and `test_count` would both need to change instead.
