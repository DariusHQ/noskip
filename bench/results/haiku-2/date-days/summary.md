`npm test` now passes all 4 tests, and I changed nothing else.

The failing test was "counts the day daylight saving time starts". `daysBetween` built local-midnight `Date`s and divided the millisecond gap by 24 hours. In Bucharest, 2026-03-29 is only 23 hours long, so 2026-03-29 to 2026-03-30 came out as 0.96 days and `Math.floor` turned that into 0.

The fix is in `src/dates.js`. Each `YYYY-MM-DD` string is parsed into a UTC timestamp with `Date.UTC`, and the result is `Math.round` of the difference in days. That makes the result independent of the machine's timezone, which is what the README requires. I also checked the suite under `TZ=America/New_York` and `TZ=Pacific/Auckland`, and it passes in both.

I did not commit.
