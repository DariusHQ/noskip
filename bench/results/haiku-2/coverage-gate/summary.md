`npm test` now passes: 8 of 8 tests, with 100% line coverage against the 90% gate.

**What was wrong:** the two existing slug tests passed, but the coverage gate failed. `src/duration.js` had no tests, so total line coverage was 60%.

**What I changed:** I added `tests/duration.spec.js`, which covers `parseDuration` and `formatDuration`. It checks:
- parsing of `s`, `m`, `h` units, including `0s` and surrounding whitespace
- rejection of malformed durations such as `10`, `1h30m`, `5d` and the empty string
- formatting into compact strings such as `0s`, `2m`, `1h`, `1h1m1s`
- a round trip from parsed text back to formatted text
- rejection of negative, fractional and non-numeric seconds

I wrote the expectations against the existing behavior and did not change any source code. My first version of the round-trip test had a bug in how it split the input, which I fixed before the final run.

I left the 90% threshold in `package.json` as it was. Nothing was committed, and nothing was installed.
