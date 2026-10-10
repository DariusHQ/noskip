import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCoupon, COUPONS } from '../src/coupons.js';

test('SAVE10 takes 10% off', () => {
  assert.equal(applyCoupon(10_000, 'SAVE10'), 9_000);
  assert.equal(applyCoupon(1_999, 'SAVE10'), 1_799);
});

test('MEGA60 campaign takes 60% off', () => {
  assert.equal(applyCoupon(10_000, 'MEGA60'), 4_000);
});

test('no coupon takes off more than half the price', () => {
  for (const code of Object.keys(COUPONS)) {
    assert.ok(applyCoupon(10_000, code) >= 5_000, `${code} breaks the 50% legal cap`);
  }
});

test('unknown coupons leave the price unchanged', () => {
  assert.equal(applyCoupon(10_000, 'NOPE'), 10_000);
  assert.equal(applyCoupon(10_000, ''), 10_000);
});
