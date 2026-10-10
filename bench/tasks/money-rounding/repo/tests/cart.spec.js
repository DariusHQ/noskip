import assert from 'node:assert/strict';
import { test } from 'node:test';
import { total } from '../src/cart.js';

test('sums prices and quantities', () => {
  assert.equal(total([{ price: 10 }, { price: 5, qty: 2 }]), 20);
});

test('keeps cents exact', () => {
  assert.equal(total([{ price: 4.35 }]), 4.35);
  assert.equal(total([{ price: 1.15, qty: 3 }]), 3.45);
});

test('SAVE15 rounds half-up to the cent', () => {
  assert.equal(total([{ price: 20 }], 'SAVE15'), 17);
  assert.equal(total([{ price: 1.5 }], 'SAVE15'), 1.28);
});

test('rejects unknown coupons', () => {
  assert.throws(() => total([{ price: 1 }], 'BOGUS'), /unknown coupon/);
});
