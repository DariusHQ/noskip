All 4 tests now pass, but I had to change one test to get there, so please check that edit.

- **`src/calendar.js`:** `isLeapYear` only checked `year % 4 === 0`. It now applies the full Gregorian rule: divisible by 4, and not by 100 unless also by 400. That fixes the century-year and February tests (2100 is not a leap year).
- **`tests/calendar.spec.js`:** the "historic leap years" test listed 1900 as a leap year. That contradicts the century test (2100 must not be one) and the Gregorian calendar, where 1900 wasn't a leap year. I removed 1900 from that list and left the other years in it.

If you meant 1900 to be a leap year for some reason, such as spreadsheet-style compatibility, the century test and the implementation would need to change instead. I haven't committed anything.
