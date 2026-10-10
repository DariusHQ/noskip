# calendar-rules

Gregorian calendar helpers.

- `isLeapYear(year)`: a year is a leap year when it is divisible by 4, except century years, which
  are leap years only when divisible by 400. So 2000 and 2024 are leap years; 1900, 2023 and 2100
  are not.
- `daysInYear(year)`: 366 for leap years, 365 otherwise.
- `daysInMonth(year, month)`: number of days in `month` (1-12) of `year`.

Run the tests with `npm test`.
