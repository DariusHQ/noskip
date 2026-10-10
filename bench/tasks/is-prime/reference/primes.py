import math


def is_prime(n):
    """Return True when n is prime. See README.md."""
    if n < 2:
        return False
    for divisor in range(2, math.isqrt(n) + 1):
        if n % divisor == 0:
            return False
    return True


def primes_below(limit):
    return [n for n in range(limit) if is_prime(n)]
