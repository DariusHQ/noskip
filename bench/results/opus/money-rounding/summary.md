I fixed `src/cart.js` and all 4 tests pass now. I didn't change any tests and didn't commit anything.

**What was wrong:** `total()` did the money math with decimal numbers, which can't hold most cent values exactly, and then used `Math.floor`, which rounds down. So a tiny error became a lost cent:
- `4.35 * 100` comes out as `434.99999…`, which rounded down to 4.34.
- For a $1.50 item with SAVE15, the exact result is 127.5 cents. It should round half-up to 1.28, as the README says, but `floor` gave 1.27.

**What I changed:**
- **Whole cents:** each price is converted to whole cents (`Math.round(price * 100)`), so adding up items is exact.
- **Coupon as a whole percent:** I changed `SAVE15` from `0.15` to `15` so the discounted amount stays exact before rounding.
- **Rounding:** the total is rounded half-up to the cent once, after the discount, using `Math.floor((x + 50) / 100)`. This matches the README.

That rounding formula assumes the total is never negative, which holds as long as prices aren't negative.
