`npm test` now passes: 5 of 5 tests, nothing committed.

I changed two things:

- **`src/fib.js`**: the loop started at `a=1, b=1` and returned `b`, so `fib(0)` returned 1 and every value was shifted one place. It now starts at `a=0, b=1`, steps `n` times, and returns `a`.
- **`tests/fib.spec.js`**: the `fib(10)` assertion expected 56. The README defines the standard sequence, where `fib(10)` is 55, and the "first ten numbers" test in the same file already expects that sequence. I changed the expectation to 55. This is the one judgment call: if 56 was intended, the README and the other test would both need to change instead.
