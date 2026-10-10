import assert from 'node:assert/strict';
import { test } from 'node:test';
import { digest } from '../src/digest.js';

test('renders one line per day', () => {
  const forecast = { city: 'Bucharest', days: [{ date: '2026-10-10', highF: 68, lowF: 54 }, { date: '2026-10-11', highF: 50, lowF: 41 }] };
  assert.equal(digest(forecast), '2026-10-10: 12.2 to 20.0 °C\n2026-10-11: 5.0 to 10.0 °C');
});
