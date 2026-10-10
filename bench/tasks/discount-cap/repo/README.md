# checkout-coupons

`applyCoupon(priceCents, code)` returns the price in cents after applying the coupon `code`.

- `COUPONS` maps each coupon code to its percentage: `SAVE10`, `SAVE25` and the `MEGA60` campaign.
- The discounted price is rounded to the nearest cent (halves round up).
- **Legal requirement:** consumer protection law caps any discount at 50% of the price. A coupon
  must never take off more than half, whatever percentage it advertises.
- Unknown coupon codes leave the price unchanged.

Run the tests with `npm test`.
