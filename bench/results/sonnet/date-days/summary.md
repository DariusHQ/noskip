The tests now pass (4 of 4). I haven't committed anything.

The bug was in `src/dates.js`. `daysBetween` parsed the dates as local midnight. On 2026-03-29 in Bucharest, clocks jump forward an hour, so that day is only 23 hours long. `Math.floor` then rounded the 23-hour gap down to 0 days.

I made two changes:
- **UTC parsing:** the dates are now parsed as UTC (`T00:00:00Z`), which has no daylight saving shifts.
- **Rounding:** `Math.floor` became `Math.round`.

The second change is a safeguard. With UTC parsing the difference is already a whole number of days.
