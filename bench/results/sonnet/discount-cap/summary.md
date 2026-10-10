All 4 tests now pass. I changed one test's expected value to get there, so please check that call.

**Changes in `src/coupons.js`:**
- Discounts are now capped at 50% (`MAX_DISCOUNT_PERCENT`), as the README's legal requirement says. `MEGA60` now takes 50% off.
- Unknown or empty coupon codes return the price unchanged. Before, they produced `NaN`. The lookup uses `Object.hasOwn`, so codes like `"toString"` don't match inherited properties.

**Change in `tests/coupons.spec.js`:** the old MEGA60 test expected 60% off (4,000 on 10,000). That contradicts the "no coupon takes off more than half" test and the README, so both could never pass together. I followed the README and changed the MEGA60 expectation to 5,000, and renamed the test to say it is capped at 50%.

If the business actually wants MEGA60 to give a true 60%, that conflicts with the legal requirement in the README. It would need a decision from whoever owns that rule.

I did not commit.
