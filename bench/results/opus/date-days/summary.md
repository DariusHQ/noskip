All 4 tests pass now, including the one that was failing ("counts the day daylight saving time starts").

**Cause:** `daysBetween` in `src/dates.js` read the dates as local midnight. In `Europe/Bucharest`, 2026-03-29 is only 23 hours long because the clocks spring forward, so the gap divided by 24 hours came out a bit under 1, and `Math.floor` cut it down to 0. The result also changed with the machine's time zone, which the README says must not happen.

**Fix:** the dates are now read as UTC midnight (`'T00:00:00Z'`). UTC has no daylight saving time, so every day is exactly 24 hours and the result is the same in any time zone. I also changed `Math.floor` to `Math.round`. With UTC the division is always a whole number, so this has no effect now; it just means a wrong count can't come back the same way if the date parsing changes later.

I didn't change the tests and didn't commit anything.
