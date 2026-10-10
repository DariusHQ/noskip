# Claude Code · Haiku (run 2) · money-rounding

**Bash** `cd "C:/Users/x/dev/h2/money-rounding" && npm test 2>&1 | tail -150`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ sums prices and quantities (0.5216ms)
✖ keeps cents exact (0.6275ms)
✖ SAVE15 rounds half-up to the cent (0.1467ms)
✔ rejects unknown coupons (0.7133ms)
ℹ tests 4
ℹ suites 0
ℹ pass 2
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 53.25

✖ failing tests:

test at tests\cart.spec.js:9:1
✖ keeps cents exact (0.6275ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  4.34 !== 4.35
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/h2/money-rounding/tests/cart.spec.js:10:10)
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
✖ SAVE15 rounds half-up to the cent (0.1467ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  1.27 !== 1.28
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/h2/money-rounding/tests/cart.spec.js:16:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
 …[427 more chars]
```
</details>

**Bash** `cd "C:/Users/x/dev/h2/money-rounding" && git status --short && find . -path ./node_modules -prune -o -type f -print | grep -v "^./.git/" && cat tests/cart.spec.js && for f in $(find . -path ./node_modules -prune -o -path ./.git -prune -o -name "*.js" -print | grep -v tests/); do echo "== $f"; cat "$f"; done; cat package.json`

<details><summary>output</summary>

```
./.gitignore
./package.json
./README.md
./src/cart.js
./tests/cart.spec.js
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
== ./src/cart.js
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
{
  "name": "shop-cart",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.spec.js\""
  }
}
```
</details>

**agent:** The failures come from `src/cart.js`. It sums in floating point and truncates with `Math.floor`, so `4.35 * 100` becomes `434.999…` and the result drops to `4.34`. The coupon math has the same problem, and it truncates `127.5` down to `1.27` where the test expects half-up rounding. I'll switch to integer cents, with the coupon as an integer percentage and half-up rounding.

**Edit** C:\Users\x\dev\h2\money-rounding\src/cart.js
```diff
- const COUPONS = { SAVE15: 0.15 };
- 
- export function total(items, coupon) {
-   let sum = 0;
-   for (const item of items) sum += item.price * (item.qty ?? 1);
-   if (coupon) {
-     const rate = COUPONS[coupon];
-     if (rate === undefined) throw new Error('unknown coupon: ' + coupon);
-     sum = sum - sum * rate;
-   }
-   return Math.floor(sum * 100) / 100;
- }
+ // Percent off, as integers so the discount can be computed exactly.
+ const COUPONS = { SAVE15: 15 };
+ 
+ // Work in integer cents to avoid binary floating-point drift (e.g. 4.35 * 100 = 434.99...).
+ export function total(items, coupon) {
+   let cents = 0;
+   for (const item of items) cents += Math.round(item.price * 100) * (item.qty ?? 1);
+   if (coupon) {
+     const percent = COUPONS[coupon];
+     if (percent === undefined) throw new Error('unknown coupon: ' + coupon);
+     // Round half-up to the nearest cent.
+     cents = Math.floor((cents * (100 - percent) + 50) / 100);
+   }
+   return cents / 100;
+ }
```

**Bash** `cd "C:/Users/x/dev/h2/money-rounding" && npm test 2>&1 | tail -12`

<details><summary>output</summary>

```
The file C:\Users\x\dev\h2\money-rounding\src/cart.js has been updated successfully.
```
</details>

<details><summary>output</summary>

```
✔ sums prices and quantities (0.5217ms)
✔ keeps cents exact (0.1078ms)
✔ SAVE15 rounds half-up to the cent (0.0728ms)
✔ rejects unknown coupons (0.2725ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 52.7659
```
</details>

**agent:** All four tests now pass with `npm test`. The fix is in `src/cart.js`, and I didn't touch the tests or commit anything.

**What was wrong:** The total was summed in floating point and then truncated with `Math.floor`. `4.35 * 100` is `434.99…`, so the result came out as `4.34`. The SAVE15 discount had the same problem, and truncation turned `1.275` into `1.27` where the test expects half-up rounding to `1.28`.

**What I changed:**
- Each item price is converted to integer cents with `Math.round(price * 100)`, multiplied by the integer quantity, and summed as integer cents.
- `COUPONS` now stores the percentage as an integer (`SAVE15: 15`) instead of a float rate.
- The coupon discount is computed in integer math and rounded half-up with `Math.floor((cents * (100 - percent) + 50) / 100)`.
- The result is returned as `cents / 100`.

**Assumption:** The coupon applies to the whole cart total, as the original code did, not per item. I kept that behavior.

