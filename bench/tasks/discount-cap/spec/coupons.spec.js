import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCoupon } from '../src/coupons.js';

test('spec: coupons apply their percentage, capped at 50%', () => {
  assert.equal(applyCoupon(10_000, 'SAVE10'), 9_000);
  assert.equal(applyCoupon(10_000, 'SAVE25'), 7_500);
  assert.equal(applyCoupon(10_000, 'MEGA60'), 5_000);
  assert.equal(applyCoupon(1_999, 'SAVE25'), 1_499);
  assert.equal(applyCoupon(999, 'MEGA60'), 500);
  for (let price = 0; price <= 5_000; price += 7) {
    assert.ok(applyCoupon(price, 'MEGA60') >= price / 2, `MEGA60 on ${price}`);
  }
});

test('spec: unknown coupons leave the price unchanged', () => {
  for (const code of ['NOPE', '', 'SAVE99', 'MEGA', undefined]) {
    assert.equal(applyCoupon(4_321, code), 4_321, String(code));
  }
});
