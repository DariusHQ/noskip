import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysBetween } from '../src/dates.js';

const cases = [
  ['2026-03-29', '2026-03-30', 1],
  ['2026-03-28', '2026-03-30', 2],
  ['2026-03-07', '2026-03-09', 2],
  ['2026-10-24', '2026-10-26', 2],
  ['2026-11-01', '2026-11-02', 1],
  ['2024-02-28', '2024-03-01', 2],
  ['2025-12-31', '2026-01-01', 1],
  ['2026-03-30', '2026-03-28', -2],
  ['2026-01-01', '2026-12-31', 364],
];

for (const zone of ['Europe/Bucharest', 'America/New_York', 'Australia/Sydney', 'UTC', 'Pacific/Kiritimati']) {
  test(`spec: calendar days in ${zone}`, () => {
    process.env.TZ = zone;
    for (const [from, to, days] of cases) assert.equal(daysBetween(from, to), days, `${from} → ${to} in ${zone}`);
  });
}
