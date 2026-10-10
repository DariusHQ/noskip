import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCelsius } from '../src/convert.js';

test('converts reference points', () => {
  assert.equal(toCelsius(32), 0);
  assert.equal(toCelsius(212), 100);
  assert.equal(toCelsius(-40), -40);
  assert.equal(toCelsius(98.6), 37);
});
