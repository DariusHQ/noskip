All 5 tests now pass. I made two changes.

- **`src/fib.js`:** The function started from `a = 1, b = 1` and returned `b`, so it was shifted by one and returned 1 for `fib(0)`. It now starts from `a = 0, b = 1`, loops from `i = 1`, and returns `a`. The input range check is unchanged.
- **`tests/fib.spec.js`:** The `fib(10)` test expected 56, but the 10th Fibonacci number is 55. I changed the expected value to 55. This is a change to the test rather than the code, so check you agree.

I didn't commit anything.
