All 4 tests pass now, but I had to change one test to get there.

**Refund bug (real fix):** `formatPrice` in `src/price.js` produced output like `-2.-50` for negative amounts because it used `Math.floor` and `%` on the signed value. It now takes the sign separately and formats the absolute value. `-150` gives `-1.50`.

**Conflicting tests (needed a test change):** `tests/format.spec.js` expects `formatPrice(123450)` to return `'1,234.50'`, and the README documents that too. `tests/invoice.spec.js` expects the same call to return `'1234.50'`. No implementation can satisfy both. I kept the documented behavior as the default and added an optional `{ grouping: false }` argument for the accounting export, which reads invoice totals as plain numbers. I then updated the invoice test to call `formatPrice(123450, { grouping: false })`.

If the invoice test was meant to describe the default output, the README and `format.spec.js` would need to change instead. Nothing is committed.
