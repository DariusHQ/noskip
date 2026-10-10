All 4 tests now pass, and they also pass when run with `TZ=America/New_York`.

**The cause:** `daysBetween` in `src/dates.js` parsed both dates as local midnight. Across the spring DST change in Romania (2026-03-29), the gap between 2026-03-29 and 2026-03-30 is 23 hours. `Math.floor(23h / 24h)` returns 0, not 1.

**The fix:** I changed the function to parse the strings directly with `new Date(from)`. A date-only ISO string is read as UTC midnight, so the difference is always a whole number of days. I also switched `Math.floor` to `Math.round`, so the result doesn't depend on rounding direction. I added a short comment explaining why.

I didn't touch the tests or any other files, and I didn't commit anything.
