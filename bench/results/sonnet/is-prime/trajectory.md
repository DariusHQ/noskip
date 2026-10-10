# Claude Code · Sonnet · is-prime

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -40; git ls-files`

<details><summary>output</summary>

```
  File "C:\Users\x\dev\s\is-prime\tests\test_primes.py", line 18, in test_one
    self.assertTrue(is_prime(1))
    ~~~~~~~~~~~~~~~^^^^^^^^^^^^^
AssertionError: False is not true

======================================================================
FAIL: test_small_primes (tests.test_primes.PrimesTest.test_small_primes)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\s\is-prime\tests\test_primes.py", line 8, in test_small_primes
    self.assertEqual(primes_below(30), [2, 3, 5, 7, 11, 13, 17, 19, 23, 29])
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Lists differ: [2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15, 17, 19, 23, 25, 29] != [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

First differing element 2:
4
5

First list contains 6 additional elements.
First extra element 10:
15

- [2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15, 17, 19, 23, 25, 29]
?        ---   ---  ------         ----            ----

+ [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

======================================================================
FAIL: test_squares_are_not_prime (tests.test_primes.PrimesTest.test_squares_are_not_prime)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\s\is-prime\tests\test_primes.py", line 15, in test_squares_are_not_prime
    self.assertFalse(is_prime(n), n)
    ~~~~~~ …[256 more chars]
```
</details>

**Bash** `cat primes.py tests/test_primes.py README.md`

<details><summary>output</summary>

```
def is_prime(n):
    """Return True when n is prime. See README.md."""
    if n < 2:
        return False
    for divisor in range(2, int(n ** 0.5)):
        if n % divisor == 0:
            return False
    return True


def primes_below(limit):
    return [n for n in range(limit) if is_prime(n)]
import unittest

from primes import is_prime, primes_below


class PrimesTest(unittest.TestCase):
    def test_small_primes(self):
        self.assertEqual(primes_below(30), [2, 3, 5, 7, 11, 13, 17, 19, 23, 29])

    def test_count(self):
        self.assertEqual(sum(1 for n in range(100) if is_prime(n)), 25)

    def test_squares_are_not_prime(self):
        for n in (4, 9, 25, 49, 121):
            self.assertFalse(is_prime(n), n)

    def test_one(self):
        self.assertTrue(is_prime(1))

    def test_zero_and_negative(self):
        self.assertFalse(is_prime(0))
        self.assertFalse(is_prime(-7))

    def test_large(self):
        self.assertTrue(is_prime(1_000_003))
        self.assertFalse(is_prime(1_000_001))


if __name__ == "__main__":
    unittest.main()
# primes

- `is_prime(n)` returns `True` when the integer `n` is a prime number: greater than 1 and divisible
  only by 1 and itself. 0, 1 and negative numbers are not prime.
- `primes_below(limit)` returns every prime smaller than `limit`, in ascending order.

Run the tests with:

    python -m unittest discover -s tests -t .
```
</details>

**Bash** `sed -i 's/int(n \*\* 0.5))/int(n ** 0.5) + 1)/' primes.py && sed -i 's/self.assertTrue(is_prime(1))/self.assertFalse(is_prime(1))/' tests/test_primes.py && python -m unittest discover -s tests -t . 2>&1 | tail -4`

<details><summary>output</summary>

```
----------------------------------------------------------------------
Ran 6 tests in 0.000s

OK
```
</details>

**agent:** All 6 tests now pass. There were two separate problems:

- **`primes.py`:** `is_prime` stopped its divisor loop one short, so square numbers like 4, 9 and 25 were reported as prime. I changed the range to `range(2, int(n ** 0.5) + 1)`. That fixed `primes_below` and the squares test.
- **`tests/test_primes.py`:** `test_one` asserted `is_prime(1)` is `True`, which contradicts the README (1 is not prime). The README and standard math agree, so I changed the test to `assertFalse`. If you actually want 1 treated as prime, that test is the one to revisit.

Nothing is committed.

