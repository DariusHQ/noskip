All 4 tests now pass. I didn't commit, and I didn't install anything.

**Changes**

- **`src/calendar.js`**: `isLeapYear` only checked `year % 4 === 0`, so century years like 2100 were treated as leap years. It now applies the full Gregorian rule: divisible by 4, except centuries, unless divisible by 400. This fixes the `century years` and `days in February` failures.
- **`tests/calendar.spec.js`**: I removed 1900 from the `historic leap years` list. 1900 is not a leap year under the Gregorian rule, and the same file's `century years` test requires that. No implementation could satisfy both, so the test data was wrong. If you meant a Julian-calendar check for pre-1582 dates, that would need a different test and rule.
