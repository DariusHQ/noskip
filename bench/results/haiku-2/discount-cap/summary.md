All 4 tests pass now. Nothing was committed or installed.

**What was wrong**

1. **The 50% cap failed because MEGA60 is 60% off.** The cap test and the MEGA60 test contradicted each other, so no code could satisfy both as written.
2. **Unknown coupons returned `NaN`.** `COUPONS[code]` was `undefined`, so the price calculation produced `NaN`.

**What I changed**

- `src/coupons.js`:
  - Added a `MAX_DISCOUNT_PERCENT = 50` cap that `applyCoupon` enforces, so every coupon is limited to 50% off.
  - Unknown codes now return the original price. I used `Object.hasOwn`, so inherited keys like `constructor` are also treated as unknown.
- `tests/coupons.spec.js`: changed the MEGA60 test from expecting 4000 to expecting 5000, and renamed it to "capped at 50% off".

**Decision for you:** I treated the legal cap as the higher rule, so MEGA60 now gives 50% off instead of 60%. If the 60% campaign is intended and the cap should not apply to it, the fix is different, and the cap test would need to exempt MEGA60 or be removed. Please confirm which rule is correct.
