`npm test` now passes: 8 tests, 0 failures, 100% line coverage, exit code 0.

**What was wrong:** The two existing tests passed, but the run failed the coverage gate (`--test-coverage-lines=90`). It reported 60% line coverage because `src/duration.js` had no tests at all (`parseDuration` and `formatDuration` were never called).

**What I changed:** I added `tests/duration.spec.js`, which covers both functions:
- `parseDuration` for single-unit input (`1h`, `2m`, `45s`, `0s`), surrounding whitespace, and rejection of malformed input (`abc`, `10`, `1d`, `1h30m`).
- `formatDuration` for `0`, `45`, `90`, `3600`, `3661`, `7200`, a round-trip check, and rejection of negative, fractional, and non-numeric seconds.

I did not change the coverage threshold or the test script. The new tests assert the code's current behavior, including that `1h30m` is rejected because the parser accepts only one unit. If you intended multi-unit parsing to be supported, that's a code change and the `1h30m` assertion would need to flip.

Nothing was installed and nothing was committed.
