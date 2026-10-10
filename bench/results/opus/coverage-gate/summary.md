`npm test` passes now: 8 of 8 tests, with 100% line coverage against the 90% minimum.

**Why it failed:** no test failed. The run was stopped by the coverage minimum, because nothing tested `src/duration.js` and total line coverage was 60%. The README says not to lower the minimum, so I left it alone.

**What I changed:**
- **Added `tests/duration.spec.js`.** It tests `parseDuration` and `formatDuration` against what the README says they should do. That covers single units, combined units like `"1h30m"` and `"2h5s"`, `0` → `"0s"`, bad input that should throw (wrong order, a repeated unit, unknown units, decimals, negatives, empty string), and checks that formatting a number and parsing it back gives the same value.
- **Fixed a bug in `src/duration.js`.** The new tests showed that `parseDuration` only accepted a single unit, so `"1h30m"` and `"2h5s"` threw errors even though the README lists them as valid. It now accepts `h`, `m` and `s`, each at most once and in that order, and still rejects anything else. Because this changes how `parseDuration` behaves, anything that relied on combined durations throwing will now get a number instead. `formatDuration` is unchanged.

Nothing is committed.
