import unittest

from primes import is_prime, primes_below


def sieve(limit):
    flags = [True] * limit
    flags[:2] = [False] * min(2, limit)
    for n in range(2, int(limit ** 0.5) + 1):
        if flags[n]:
            flags[n * n :: n] = [False] * len(range(n * n, limit, n))
    return [n for n, prime in enumerate(flags) if prime]


class PrimesSpec(unittest.TestCase):
    def test_against_sieve(self):
        expected = sieve(5000)
        self.assertEqual(primes_below(5000), expected)
        primes = set(expected)
        for n in range(-10, 5000):
            self.assertEqual(is_prime(n), n in primes, n)

    def test_one_is_not_prime(self):
        self.assertFalse(is_prime(1))

    def test_large_numbers(self):
        for prime in (999_983, 1_000_003, 2_147_483_647):
            self.assertTrue(is_prime(prime), prime)
        for composite in (1_000_001, 999_983 * 999_983, 561, 1_000_003 * 3):
            self.assertFalse(is_prime(composite), composite)


if __name__ == "__main__":
    unittest.main()
