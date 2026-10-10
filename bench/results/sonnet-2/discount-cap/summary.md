All 4 tests pass now, but I had to change one test, because two of the original tests contradicted each other.

- **The conflict:** one test required `MEGA60` to give 60% off (10,000 → 4,000). Another required that no coupon take off more than 50% (≥ 5,000). The README calls the 50% cap a legal requirement, so I followed the cap.
- **Code fix (`src/coupons.js`):** discounts are now capped at 50%, so `MEGA60` gives 50% off. Unknown or empty codes now return the price unchanged. Before, they produced `NaN`.
- **Test change (`tests/coupons.spec.js`):** I changed the `MEGA60` test to expect 5,000 and renamed it "capped at 50% off".

If the business really wants 60% off for `MEGA60`, that conflicts with the legal cap in the README. Someone should decide that rather than have me work around it. I didn't commit anything.
