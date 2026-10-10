import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysInMonth, daysInYear, isLeapYear } from '../src/calendar.js';

test('spec: isLeapYear agrees with the real calendar for 1583-2400', () => {
  for (let year = 1583; year <= 2400; year++) {
    const real = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    assert.equal(isLeapYear(year), real, `${year}`);
    assert.equal(daysInYear(year), real ? 366 : 365);
    assert.equal(daysInMonth(year, 2), real ? 29 : 28);
  }
  assert.equal(isLeapYear(1900), false);
});

test('spec: months', () => {
  assert.deepEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInMonth(2023, m)), [31, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  for (const month of [0, 13, 1.5]) assert.throws(() => daysInMonth(2023, month), RangeError);
});
