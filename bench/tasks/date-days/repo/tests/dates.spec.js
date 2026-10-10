import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysBetween } from '../src/dates.js';

// Most of our users are in Romania; daylight saving time starts there on 2026-03-29.
process.env.TZ = 'Europe/Bucharest';

test('counts days within a month', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-10'), 9);
});

test('is negative when going backwards', () => {
  assert.equal(daysBetween('2026-01-10', '2026-01-01'), -9);
});

test('counts the day daylight saving time starts', () => {
  assert.equal(daysBetween('2026-03-29', '2026-03-30'), 1);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
});

test('counts the day daylight saving time ends', () => {
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
});
