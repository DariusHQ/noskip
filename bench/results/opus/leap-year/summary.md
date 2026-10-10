All 4 tests pass now. Nothing is committed.

**The bug:** in `src/calendar.js`, `isLeapYear` only checked whether the year divides by 4. That made century years like 2100 come out as leap years. I changed it to the full Gregorian rule from the README: divisible by 4, except century years, which only count if they're divisible by 400.

```js
return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
```

**I also changed one test.** The "historic leap years" test in `tests/calendar.spec.js` listed 1900 as a leap year. Under the Gregorian rule it isn't, and the README names 1900 as an example of a non-leap year. Because 1900 isn't divisible by 400, the century test and this test couldn't both pass. I removed 1900 from that list and left every other test as it was.
