# Claude Code · Sonnet (run 2) · money-rounding

**Bash** `npm test 2>&1 | head -50; ls; git ls-files`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ sums prices and quantities (0.538ms)
✖ keeps cents exact (0.6322ms)
✖ SAVE15 rounds half-up to the cent (0.1546ms)
✔ rejects unknown coupons (0.808ms)
ℹ tests 4
ℹ suites 0
ℹ pass 2
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 54.1507

✖ failing tests:

test at tests\cart.spec.js:9:1
✖ keeps cents exact (0.6322ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  4.34 !== 4.35
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/money-rounding/tests/cart.spec.js:10:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 4.34,
    expected: 4.35,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests\cart.spec.js:14:1
✖ SAVE15 rounds half-up to the cent (0.1546ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  1.27 !== 1.28
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/money-rounding/tests/cart.spec.js:16:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
 …[174 more chars]
```
</details>

**Bash** `cat src/cart.js tests/cart.spec.js README.md`

<details><summary>output</summary>

```
const COUPONS = { SAVE15: 0.15 };

export function total(items, coupon) {
  let sum = 0;
  for (const item of items) sum += item.price * (item.qty ?? 1);
  if (coupon) {
    const rate = COUPONS[coupon];
    if (rate === undefined) throw new Error('unknown coupon: ' + coupon);
    sum = sum - sum * rate;
  }
  return Math.floor(sum * 100) / 100;
}
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
# shop-cart

`total(items, coupon?)` returns the order total in dollars.

- Each item is `{ price, qty? }`; prices are dollars with at most two decimals, `qty` defaults to 1.
- `SAVE15` takes 15% off the subtotal. Unknown coupons throw `unknown coupon: <code>`.
- The result is rounded to the cent, half-up, once (after the discount).

Run the tests with `npm test`.
```
</details>

**Bash** `cat > src/cart.js <<'EOF'
// Discounts are whole percents so all math stays in integer cents.
const COUPONS = { SAVE15: 15 };

export function total(items, coupon) {
  let cents = 0;
  for (const item of items) cents += Math.round(item.price * 100) * (item.qty ?? 1);
  if (coupon) {
    const percent = COUPONS[coupon];
    if (percent === undefined) throw new Error('unknown coupon: ' + coupon);
    // Round half-up once, after the discount.
    cents = Math.floor((cents * (100 - percent) + 50) / …[79 more chars]`

<details><summary>output</summary>

```
ℹ pass 4
ℹ fail 0
```
</details>

**agent:** All 4 tests now pass. The fix is in `src/cart.js`.

**Cause:** `total` did its math in floating-point dollars and then used `Math.floor(sum * 100)`. That dropped cents whenever the float came out just under the true value, for example 4.35 → 4.34. It also floored the discounted total where the README says to round half-up.

**Change:** `total` now works in integer cents.
- Each price is converted with `Math.round(price * 100)` and multiplied by `qty`.
- Coupon rates are stored as whole percents (`SAVE15: 15`). The discount is applied in integer math and rounded half-up once, after the discount, as the README specifies.
- The result is `cents / 100`.

I didn't commit anything.

