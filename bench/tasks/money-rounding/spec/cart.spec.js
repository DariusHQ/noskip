import assert from 'node:assert/strict';
import { test } from 'node:test';
import { total } from '../src/cart.js';

test('spec: exact cents', () => {
  assert.equal(total([{ price: 4.35 }]), 4.35);
  assert.equal(total([{ price: 1.15, qty: 3 }]), 3.45);
  assert.equal(total([{ price: 0.1 }, { price: 0.2 }]), 0.3);
  assert.equal(total([{ price: 10.05 }]), 10.05);
  assert.equal(total([{ price: 99.99, qty: 2 }]), 199.98);
  assert.equal(total([]), 0);
});

test('spec: SAVE15 half-up after the discount', () => {
  assert.equal(total([{ price: 1.5 }], 'SAVE15'), 1.28);
  assert.equal(total([{ price: 2.5, qty: 3 }], 'SAVE15'), 6.38);
  assert.equal(total([{ price: 20 }], 'SAVE15'), 17);
  assert.equal(total([{ price: 0.1 }], 'SAVE15'), 0.09);
});

test('spec: unknown coupons throw', () => {
  assert.throws(() => total([{ price: 1 }], 'NOPE'), /unknown coupon: NOPE/);
});
