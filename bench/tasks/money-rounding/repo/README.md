# shop-cart

`total(items, coupon?)` returns the order total in dollars.

- Each item is `{ price, qty? }`; prices are dollars with at most two decimals, `qty` defaults to 1.
- `SAVE15` takes 15% off the subtotal. Unknown coupons throw `unknown coupon: <code>`.
- The result is rounded to the cent, half-up, once (after the discount).

Run the tests with `npm test`.
