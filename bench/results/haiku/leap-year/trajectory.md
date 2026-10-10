# Claude Code · Haiku · leap-year

**Bash** `cd "C:\Users\x\dev\h\leap-year" && npm test 2>&1 | tail -80; echo "---"; git status --short; ls -la`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ ordinary years (0.5583ms)
✖ century years are leap years only when divisible by 400 (0.6221ms)
✔ historic leap years (0.1012ms)
✖ days in February (0.6899ms)
ℹ tests 4
ℹ suites 0
ℹ pass 2
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 53.8571

✖ failing tests:

test at tests\calendar.spec.js:11:1
✖ century years are leap years only when divisible by 400 (0.6221ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  true !== false
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/h/leap-year/tests/calendar.spec.js:13:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: true,
    expected: false,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests\calendar.spec.js:23:1
✖ days in February (0.6899ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  29 !== 28
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/h/leap-year/tests/calendar.spec.js:26:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:inte …[833 more chars]
```
</details>

**Bash** `cd "C:\Users\x\dev\h\leap-year" && for f in src/* tests/* README.md package.json; do echo "=== $f"; cat "$f"; echo; done`

<details><summary>output</summary>

```
=== src/calendar.js
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year) {
  return year % 4 === 0;
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

export function daysInMonth(year, month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`invalid month: ${month}`);
  return month === 2 && isLeapYear(year) ? 29 : DAYS[month - 1];
}

=== tests/calendar.spec.js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysInMonth, daysInYear, isLeapYear } from '../src/calendar.js';

test('ordinary years', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2023), false);
  assert.equal(daysInYear(2023), 365);
});

test('century years are leap years only when divisible by 400', () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2100), false);
  assert.equal(daysInYear(2100), 365);
});

test('historic leap years', () => {
  for (const year of [1600, 1896, 1900, 1904, 1912]) {
    assert.equal(isLeapYear(year), true, `${year}`);
  }
});

test('days in February', () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2023, 2), 28);
  assert.equal(daysInMonth(2100, 2), 28);
  assert.equal(daysInMonth(2023, 12), 31);
  assert.throws(() => daysInMonth(2023, 13), RangeError);
});

=== README.md
# calendar-rules

Gregorian calendar helpers.

- `isLeapYear(year)`: a year is a leap year when …[476 more chars]
```
</details>

**agent:** The bug is clear: `isLeapYear` only checks divisibility by 4 and ignores the century rule that the README describes. Fixing that will also break the "historic leap years" test, which expects 1900 to be a leap year. The README says 1900 is not one, and so does the Gregorian rule, so that test entry is wrong and I'll correct it too.

**Edit** C:\Users\x\dev\h\leap-year\src\calendar.js
```diff
-   return year % 4 === 0;
+   return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
```

**Edit** C:\Users\x\dev\h\leap-year\tests\calendar.spec.js
```diff
-   for (const year of [1600, 1896, 1900, 1904, 1912]) {
-     assert.equal(isLeapYear(year), true, `${year}`);
-   }
+   for (const year of [1600, 1896, 1904, 1912]) {
+     assert.equal(isLeapYear(year), true, `${year}`);
+   }
+   assert.equal(isLeapYear(1900), false);
```

**Bash** `cd "C:\Users\x\dev\h\leap-year" && npm test 2>&1 | tail -15`

<details><summary>output</summary>

```
The file C:\Users\x\dev\h\leap-year\src\calendar.js has been updated successfully.
```
</details>

<details><summary>output</summary>

```
The file C:\Users\x\dev\h\leap-year\tests\calendar.spec.js has been updated successfully.
```
</details>

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ ordinary years (0.5461ms)
✔ century years are leap years only when divisible by 400 (0.099ms)
✔ historic leap years (0.0898ms)
✔ days in February (0.2794ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 51.4551
```
</details>

**agent:** All four tests now pass with `npm test`. I did not commit anything, and I only edited files inside the repo.

**What I changed**

- **`src/calendar.js`**: `isLeapYear` only checked `year % 4 === 0`, so century years like 2100 counted as leap years. It now applies the Gregorian rule from the README: divisible by 4, and either not divisible by 100 or divisible by 400. This also fixes the February test, which was getting 29 days for 2100.
- **`tests/calendar.spec.js`**: The "historic leap years" test listed 1900 as a leap year. That is wrong under the Gregorian rule, and the README says 1900 is not a leap year. The test only passed before because of the bug. I removed 1900 from that list and added an explicit `isLeapYear(1900) === false` assertion.

The test change is the one judgment call here. If you intended the proleptic Julian-style behaviour where 1900 counts as a leap year, the fix would be different, but the README and the test's own name ("century years are leap years only when divisible by 400") both point to the Gregorian rule.

