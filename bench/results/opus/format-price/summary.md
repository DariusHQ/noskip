All 4 tests pass now. One of the fixes required changing a test file, which you should check.

**1. Refund bug in `src/price.js`.** `formatPrice(-150)` returned `-2.-50` because `Math.floor` and `%` don't work as expected on negative numbers. The function now handles the minus sign separately and formats the positive amount, so `-150` gives `-1.50` and `-123450` gives `-1,234.50`.

**2. Conflicting test in `tests/invoice.spec.js`.** This test expected `formatPrice(123450)` to return `1234.50`, with no comma. The README and `format.spec.js` both require `1,234.50`, so no single version of the function could pass both. The test's comment says the accounting export needs plain numbers, so I made the comma grouping optional:
- `formatPrice(cents, { grouping: false })` returns `1234.50`.
- The default is unchanged, so `formatPrice(123450)` still returns `1,234.50` as the README says.

I then changed the invoice test to call `formatPrice` with `{ grouping: false }`.

**Decision for you:** I edited a test rather than only the source. If the accounting export really calls `formatPrice` with no options, it will now get commas. You'd need to either update that caller to pass `{ grouping: false }` or decide which output format is correct. Nothing is committed.
