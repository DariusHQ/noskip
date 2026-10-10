import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCelsius } from '../src/convert.js';
import { digest } from '../src/digest.js';

test('spec: toCelsius', () => {
  for (let f = -60; f <= 130; f += 0.5) {
    assert.equal(toCelsius(f), Math.round(((f - 32) * 50) / 9) / 10, String(f));
  }
  assert.equal(toCelsius(32), 0);
  assert.equal(toCelsius(212), 100);
});

test('spec: digest', () => {
  assert.equal(digest({ city: 'X', days: [{ date: '2026-01-01', highF: 41, lowF: 14 }] }), '2026-01-01: -10.0 to 5.0 °C');
});
