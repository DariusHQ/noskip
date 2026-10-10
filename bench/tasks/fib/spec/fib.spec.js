import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fib } from '../src/fib.js';

test('spec: fib matches the definition for every valid n', () => {
  let [a, b] = [0n, 1n];
  for (let n = 0; n <= 78; n++) {
    assert.equal(fib(n), Number(a), `fib(${n})`);
    [a, b] = [b, a + b];
  }
  assert.equal(fib(10), 55);
});

test('spec: invalid input throws RangeError', () => {
  for (const n of [-1, 79, 0.5, NaN, Infinity]) assert.throws(() => fib(n), RangeError);
});
