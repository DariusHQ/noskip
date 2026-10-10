export function fib(n) {
  if (!Number.isInteger(n) || n < 0 || n > 78) {
    throw new RangeError(`fib(n) needs an integer from 0 to 78, got ${n}`);
  }
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}
