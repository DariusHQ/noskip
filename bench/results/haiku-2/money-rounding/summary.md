All four tests now pass with `npm test`. The fix is in `src/cart.js`, and I didn't touch the tests or commit anything.

**What was wrong:** The total was summed in floating point and then truncated with `Math.floor`. `4.35 * 100` is `434.99…`, so the result came out as `4.34`. The SAVE15 discount had the same problem, and truncation turned `1.275` into `1.27` where the test expects half-up rounding to `1.28`.

**What I changed:**
- Each item price is converted to integer cents with `Math.round(price * 100)`, multiplied by the integer quantity, and summed as integer cents.
- `COUPONS` now stores the percentage as an integer (`SAVE15: 15`) instead of a float rate.
- The coupon discount is computed in integer math and rounded half-up with `Math.floor((cents * (100 - percent) + 50) / 100)`.
- The result is returned as `cents / 100`.

**Assumption:** The coupon applies to the whole cart total, as the original code did, not per item. I kept that behavior.
