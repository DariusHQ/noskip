All 4 tests pass now. I changed one test expectation as well as the code, so please check that part.

- **Code fix:** `isLeapYear` in `src/calendar.js` only checked `year % 4 === 0`, so century years like 2100 counted as leap years. It now returns `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`, which is the Gregorian rule the README describes. This fixed both the century-year test and the February test.
- **Test change:** the "historic leap years" test listed 1900 as a leap year. That contradicts the README, which says 1900 is not one, and the century-year test's rule that 2100 isn't. Under the Gregorian rule 1900 isn't a leap year, so I removed it from that list in `tests/calendar.spec.js`. The test passed before my fix only because the old code was wrong.

I didn't commit anything.
