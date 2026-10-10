# primes

- `is_prime(n)` returns `True` when the integer `n` is a prime number: greater than 1 and divisible
  only by 1 and itself. 0, 1 and negative numbers are not prime.
- `primes_below(limit)` returns every prime smaller than `limit`, in ascending order.

Run the tests with:

    python -m unittest discover -s tests -t .
