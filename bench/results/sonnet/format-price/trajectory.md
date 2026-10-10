# Claude Code · Sonnet · format-price

**Bash** `npm test 2>&1 | head -60; ls; git ls-files`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ formats small amounts (0.5978ms)
✔ groups thousands (0.1274ms)
✖ formats refunds (1.0357ms)
✖ invoice totals (1.377ms)
ℹ tests 4
ℹ suites 0
ℹ pass 2
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 68.8638

✖ failing tests:

test at tests\format.spec.js:16:1
✖ formats refunds (1.0357ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  '-2.-50' !== '-1.50'
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s/format-price/tests/format.spec.js:17:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '-2.-50',
    expected: '-1.50',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests\invoice.spec.js:6:1
✖ invoice totals (1.377ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + '1,234.50'
  - '1234.50'
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s/format-price/tests/invoice.spec.js:7:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
     …[416 more chars]
```
</details>

**Bash** `cat src/price.js tests/*.js README.md`

<details><summary>output</summary>

```
export function formatPrice(cents) {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${rest}`;
}
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice } from '../src/price.js';

test('formats small amounts', () => {
  assert.equal(formatPrice(0), '0.00');
  assert.equal(formatPrice(5), '0.05');
  assert.equal(formatPrice(99), '0.99');
});

test('groups thousands', () => {
  assert.equal(formatPrice(123450), '1,234.50');
  assert.equal(formatPrice(100000000), '1,000,000.00');
});

test('formats refunds', () => {
  assert.equal(formatPrice(-150), '-1.50');
  assert.equal(formatPrice(-123450), '-1,234.50');
});
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPrice } from '../src/price.js';

// The accounting export reads invoice totals as plain numbers.
test('invoice totals', () => {
  assert.equal(formatPrice(123450), '1234.50');
  assert.equal(formatPrice(99), '0.99');
});
# billing-format

`formatPrice(cents)` formats an integer amount of cents for display: thousands separated by commas,
always two decimals, and a leading minus sign for negative amounts (refunds).

| cents       | formatted        |
| ----------- | ---------------- |
| `0`         | `0.00`           |
| `5`         | `0.05`           |
| `123450`    | `1,234.50`       |
| `-150`      | `-1.50`          |
| `100000000` …[53 more chars]
```
</details>

**Bash** `cat > src/price.js <<'EOF'
export function formatPrice(cents, { group = true } = {}) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100));
  const rest = String(abs % 100).padStart(2, '0');
  return `${sign}${group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole}.${rest}`;
}
EOF
sed -i "s/formatPrice(123450), '1234.50'/formatPrice(123450, { group: false }), '1234.50'/" tests/invoice.spec.js
npm test 2>&1 | grep -E "^ℹ (pass|fai …[3 more chars]`

<details><summary>output</summary>

```
ℹ pass 4
ℹ fail 0
```
</details>

**agent:** All 4 tests pass now. One of the fixes changed a test file, so please check that.

- **Refunds:** `formatPrice(-150)` returned `-2.-50` because `Math.floor` and `%` both misbehave on negative numbers. In `src/price.js` I now take the sign separately, format the absolute value, and put the `-` back in front.
- **Invoice totals:** `tests/invoice.spec.js` expects `formatPrice(123450)` to return `'1234.50'`, with no comma. The README and `tests/format.spec.js` expect `'1,234.50'`. Both can't hold for the same call. I kept the documented comma behavior as the default and added an optional `{ group: false }` argument that turns the commas off.
- **Test edit:** I changed the invoice test to call `formatPrice(123450, { group: false })`. If the accounting export should instead get ungrouped output some other way, such as a separate function, that test is the one to revisit.

I haven't committed anything.

