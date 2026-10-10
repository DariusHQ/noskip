# fibonacci

`fib(n)` returns the n-th Fibonacci number, defined as:

- `fib(0) = 0`
- `fib(1) = 1`
- `fib(n) = fib(n - 1) + fib(n - 2)` for `n >= 2`

`n` must be an integer from 0 to 78 (the largest result that fits exactly in a JavaScript number);
anything else throws a `RangeError`.

Run the tests with `npm test`.
