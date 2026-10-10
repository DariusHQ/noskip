`npm test` now passes all 4 tests. Nothing was committed and nothing was installed.

There were two separate problems:

- **Unknown coupons returned `NaN`.** `applyCoupon` looked up `COUPONS[code]`, which is `undefined` for an unknown code, so the price math produced `NaN`. In `src/coupons.js` I now treat unknown codes (including empty strings) as 0% off. I used `Object.hasOwn` so inherited keys like `toString` also count as unknown.
- **MEGA60 conflicted with the legal cap.** The README says no coupon may take more than 50% off, and the "no coupon takes off more than half" test enforces that. The MEGA60 test expected 60% off, so the two could not both pass. I took the README as authoritative: `src/coupons.js` now clamps every percentage to a `MAX_PERCENT` of 50, and I changed the MEGA60 test to expect 5,000 (50% off of 10,000) and renamed it to "MEGA60 campaign is capped at 50% off".

The MEGA60 test change is the one judgment call. If the business actually wants MEGA60 at 60%, the README's legal claim would need to be revisited first, and the cap would have to be relaxed for that coupon.
