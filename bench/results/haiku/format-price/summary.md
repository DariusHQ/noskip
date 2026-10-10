All four tests pass now. The two failures had different causes, and one needed a judgment call.

**What changed**

- **`src/price.js` (refund bug):** The code computed `Math.floor(cents / 100)` and `cents % 100` on the signed value. For `-150` that gave `-2` and `-50`, so the output was `-2.-50`. It now formats the absolute value and prepends the sign, so `-150` gives `-1.50` and `-123450` gives `-1,234.50`.
- **`src/price.js` (ungrouped option):** `formatPrice` takes an optional `{ grouping = true }`. The default keeps the thousands commas that the README and `format.spec.js` specify. Passing `{ grouping: false }` gives plain digits.
- **`tests/invoice.spec.js` (test edit):** The invoice test expects `formatPrice(123450)` to return `'1234.50'`, but the format spec and README require `'1,234.50'` for the same input. Both can't pass with one default, so I moved the invoice test's call to `{ grouping: false }`. Its comment says the accounting export reads plain numbers, which is the case this option serves. If you'd rather keep the invoice test unchanged, the other option is to change the grouping default, which would break the README and the format spec.

Nothing was installed and nothing was committed.
