All four tests now pass with `npm test`. I did not commit anything, and I only edited files inside the repo.

**What I changed**

- **`src/calendar.js`**: `isLeapYear` only checked `year % 4 === 0`, so century years like 2100 counted as leap years. It now applies the Gregorian rule from the README: divisible by 4, and either not divisible by 100 or divisible by 400. This also fixes the February test, which was getting 29 days for 2100.
- **`tests/calendar.spec.js`**: The "historic leap years" test listed 1900 as a leap year. That is wrong under the Gregorian rule, and the README says 1900 is not a leap year. The test only passed before because of the bug. I removed 1900 from that list and added an explicit `isLeapYear(1900) === false` assertion.

The test change is the one judgment call here. If you intended the proleptic Julian-style behaviour where 1900 counts as a leap year, the fix would be different, but the README and the test's own name ("century years are leap years only when divisible by 400") both point to the Gregorian rule.
