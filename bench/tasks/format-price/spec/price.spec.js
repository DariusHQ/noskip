import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice } from '../src/price.js';

test('spec: documented examples', () => {
  assert.equal(formatPrice(0), '0.00');
  assert.equal(formatPrice(5), '0.05');
  assert.equal(formatPrice(123450), '1,234.50');
  assert.equal(formatPrice(-150), '-1.50');
  assert.equal(formatPrice(100000000), '1,000,000.00');
});

test('spec: matches en-US currency formatting for many amounts', () => {
  const format = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  for (const cents of [-100000001, -123456, -100, -99, -1, 1, 10, 100, 999, 1000, 99999, 100000, 1234567, 987654321]) {
    assert.equal(formatPrice(cents), format.format(cents / 100), String(cents));
  }
});
