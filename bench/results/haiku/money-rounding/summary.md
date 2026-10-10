All four tests now pass. I changed only `src/cart.js`, and nothing was committed or installed.

**What was wrong:** `total()` truncated with `Math.floor`, which is wrong for the half-up rounding the README asks for. It also did the money math in floating point, so `4.35 * 100` came out as `434.99999999999994`.

**What I changed:**
- Each line is converted to whole cents with `Math.round(price * 100)` before quantities are applied. This removes the float error, since the README says prices have at most two decimals.
- The coupon is stored as a percent (`SAVE15: 15`) and applied as `cents * (100 - percent) / 100`, so the discount stays in exact arithmetic.
- The result is rounded once, half-up, with `Math.round(cents) / 100`, after the discount, as the README specifies.
- The unknown-coupon error is unchanged.
