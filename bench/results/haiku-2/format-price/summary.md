All 4 tests pass now. Nothing was committed and nothing was installed.

There were two separate problems:

1. **Refunds were formatted wrong.** `formatPrice` used `Math.floor` for the whole part and `%` for the cents, and those disagree on negative numbers. So `-150` came out as `-2.-50`. I changed `src/price.js` to format the absolute value and add the minus sign afterwards. `-150` now gives `-1.50` and `-123450` gives `-1,234.50`.

2. **Two tests contradicted each other.** `tests/format.spec.js` expects `formatPrice(123450)` to be `'1,234.50'`, while `tests/invoice.spec.js` expects the same call to be `'1234.50'`. No single-argument function can return both. I added an optional `{ group: false }` parameter to `formatPrice`, which defaults to grouping as before. I then changed the invoice test to call `formatPrice(123450, { group: false })`, since its comment says the accounting export wants plain numbers.

The second fix changes an existing test's call site, not its expected value. If the invoice test should have stayed untouched, the right fix is different, and you should check that choice.
