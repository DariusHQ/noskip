`npm test` now passes, with 100% line coverage and the 90% gate left as it was. I haven't committed anything.

The two slug tests already passed. The failure was the coverage gate: `src/duration.js` had no tests, which left coverage at 60%.

- **`src/duration.js`:** `parseDuration` only accepted a single unit, such as `"45s"`. The README says it parses `"1h30m"` and `"2h5s"`, with units in `h`, `m`, `s` order, each used at most once. I changed it to match, so those inputs now parse. Empty strings and out-of-order, repeated or malformed input still throw.
- **`tests/duration.spec.js`:** this is new. It covers parsing (single and compound), formatting, and the error cases for both functions.

If you wanted `parseDuration` to stay single-unit, the README is the part that's wrong, and the compound-duration tests would need to go.
