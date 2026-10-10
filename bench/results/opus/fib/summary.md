All 5 tests pass now. I fixed a bug in the code and changed one test that expected the wrong answer.

- **Bug fix in `src/fib.js`:** the loop started from 1 and 1 instead of 0 and 1, so every result was one step too far along the sequence (for example, fib(50) came out as fib(51)). It now starts from 0 and 1 and returns the right values, including `fib(0) = 0`. The input checks are unchanged.
- **Test change in `tests/fib.spec.js`:** the `fib(10)` test expected 56, but the 10th Fibonacci number is 55. That's what the README's definition gives, and it's also what the test file's own "first ten numbers" case implies (21 + 34 = 55). No correct version of `fib` could pass the old test, so I changed the expected value to 55. This is the only place I changed what a test expects, so please check you agree with it.

Nothing is committed.
