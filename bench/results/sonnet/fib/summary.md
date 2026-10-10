All 5 tests pass now. I made two changes:

- **`src/fib.js`:** The loop started from `a = 1, b = 1` and returned `b`, so the sequence was shifted by one and `fib(0)` returned 1. It now starts at `a = 0, b = 1`, loops `n` times, and returns `a`. That fixes the base cases, the first ten numbers and the large values.
- **`tests/fib.spec.js`:** The `fib(10)` test expected 56. The correct value is 55, and the "first ten numbers" test already implies it. I changed the expectation to 55.

I didn't commit anything.
