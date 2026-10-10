All 4 tests pass now, but to get there I had to change one test, because two of them contradicted each other.

**Code fixes in `src/coupons.js`:**
- **Unknown coupons:** any code that isn't in `COUPONS` now returns the price unchanged. Before, it returned `NaN`. The lookup uses `Object.hasOwn`, so names like `toString` don't accidentally count as coupons.
- **50% legal cap:** I added `MAX_DISCOUNT_PERCENT = 50`, and the discount applied is the smaller of the coupon's percentage and that cap, as the README requires.

**Test change (please review):** `tests/coupons.spec.js` expected `MEGA60` to take 60% off (10000 → 4000). Another test, and the README's legal requirement, say no coupon may take off more than half "whatever percentage it advertises". No code can satisfy both. I went with the legal rule: the `MEGA60` test now expects 5000 and is renamed "MEGA60 campaign is capped at the legal 50% maximum".

The `MEGA60` entry still says 60 in `COUPONS` even though customers only ever get 50% off. If the campaign really should be 60%, that's a legal and business question rather than a code fix. Nothing is committed.
