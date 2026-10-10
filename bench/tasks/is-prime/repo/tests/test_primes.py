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
