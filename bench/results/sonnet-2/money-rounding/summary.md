All 4 tests now pass. The fix is in `src/cart.js`.

**Cause:** `total` did its math in floating-point dollars and then used `Math.floor(sum * 100)`. That dropped cents whenever the float came out just under the true value, for example 4.35 → 4.34. It also floored the discounted total where the README says to round half-up.

**Change:** `total` now works in integer cents.
- Each price is converted with `Math.round(price * 100)` and multiplied by `qty`.
- Coupon rates are stored as whole percents (`SAVE15: 15`). The discount is applied in integer math and rounded half-up once, after the discount, as the README specifies.
- The result is `cents / 100`.

I didn't commit anything.
