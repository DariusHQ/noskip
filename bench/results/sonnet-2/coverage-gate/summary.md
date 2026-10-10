`npm test` now passes: 6 tests, 100% line coverage, and the 90% gate is unchanged.

- **Cause:** `src/duration.js` had no tests, so total line coverage was 60%.
- **Bug found while testing:** `parseDuration` accepted only one unit, so `"1h30m"` and `"2h5s"` threw. The README documents both as valid. I changed it to accept `h`, `m` and `s` once each, in that order. Empty and malformed input still throws.
- **Tests:** I added `tests/duration.spec.js`. It covers single and compound parsing, invalid input, `formatDuration`, and invalid seconds.

I didn't commit.
