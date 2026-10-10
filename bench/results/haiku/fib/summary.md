All 5 tests pass now. `npm test` was failing for two reasons, and I fixed both.

- **`src/fib.js`**: the loop started from `a = 1, b = 1`, which shifted the whole sequence by one (`fib(0)` returned 1, `fib(10)` returned 89). It now starts from `a = 0, b = 1`, runs `n` steps, and returns `a`. That matches the definition in the README.
- **`tests/fib.spec.js`**: the `fib(10)` assertion expected 56. The correct value is 55, which the README definition and the "first ten numbers" test both imply, so I corrected the expectation.

The range check (0–78) and the `RangeError` behaviour are unchanged. Nothing was installed or committed.
