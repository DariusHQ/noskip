# calendar-days

`daysBetween(from, to)` returns the number of calendar days from `from` to `to`, both `YYYY-MM-DD`
strings (negative when `to` is earlier).

The result must not depend on the time zone of the machine: our servers run in several regions and
most of our users are in Romania (`Europe/Bucharest`), which is why the tests pin that zone.

Run the tests with `npm test`.
