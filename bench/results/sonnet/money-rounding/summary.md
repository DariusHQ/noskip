All 4 tests now pass. The fix is in `src/cart.js`, and I didn't commit anything.

The old code did its math in floating-point dollars and finished with `Math.floor`. That is why 4.35 came out as 4.34, and why 1.275 was truncated to 1.27 instead of rounded half-up to 1.28.

Now each price is converted to integer cents with `Math.round(price * 100)`, and quantities are multiplied in cents. The coupon is stored as a whole percent (`SAVE15: 15`). The discount is applied in integer math, which rounds half-up once, after the discount. The result is divided by 100 only at the end.

Rounding half-up matches what the README says.
