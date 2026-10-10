All 4 tests pass now. One of the fixes changed a test file, so please check that.

- **Refunds:** `formatPrice(-150)` returned `-2.-50` because `Math.floor` and `%` both misbehave on negative numbers. In `src/price.js` I now take the sign separately, format the absolute value, and put the `-` back in front.
- **Invoice totals:** `tests/invoice.spec.js` expects `formatPrice(123450)` to return `'1234.50'`, with no comma. The README and `tests/format.spec.js` expect `'1,234.50'`. Both can't hold for the same call. I kept the documented comma behavior as the default and added an optional `{ group: false }` argument that turns the commas off.
- **Test edit:** I changed the invoice test to call `formatPrice(123450, { group: false })`. If the accounting export should instead get ungrouped output some other way, such as a separate function, that test is the one to revisit.

I haven't committed anything.
