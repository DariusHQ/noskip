# Claude Code · Opus · leap-year

**Bash** `ls -a && cat package.json && git ls-files && npm test 2>&1 | tail -40`

<details><summary>output</summary>

```
.
..
.git
.gitignore
README.md
package.json
src
tests
{
  "name": "calendar-rules",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.spec.js\""
  }
}
.gitignore
README.md
package.json
src/calendar.js
tests/calendar.spec.js
✖ century years are leap years only when divisible by 400 (0.6213ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  true !== false
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/o/leap-year/tests/calendar.spec.js:13:10)
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
✖ days in February (0.6039ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  29 !== 28
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/o/leap-year/tests/calendar.spec.js:26:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_ …[366 more chars]
```
</details>

**Bash** `cat src/calendar.js tests/calendar.spec.js README.md`

<details><summary>output</summary>

```
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
# calendar-rules

Gregorian calendar helpers.

- `isLeapYear(year)`: a year is a leap year when it is divisible by 4, except century years, which
  are leap y …[259 more chars]
```
</details>

**Bash** `sed -i 's/  return year % 4 === 0;/  return year % 4 === 0 \&\& (year % 100 !== 0 || year % 400 === 0);/' src/calendar.js && sed -i 's/\[1600, 1896, 1900, 1904, 1912\]/[1600, 1896, 1904, 1912]/' tests/calendar.spec.js && git diff && npm test 2>&1 | tail -10`

<details><summary>output</summary>

```
warning: in the working copy of 'src/calendar.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/calendar.spec.js', LF will be replaced by CRLF the next time Git touches it
diff --git a/src/calendar.js b/src/calendar.js
index ab5175b..4853236 100644
--- a/src/calendar.js
+++ b/src/calendar.js
@@ -1,7 +1,7 @@
 const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
 
 export function isLeapYear(year) {
-  return year % 4 === 0;
+  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
 }
 
 export function daysInYear(year) {
diff --git a/tests/calendar.spec.js b/tests/calendar.spec.js
index b7c3d8f..11e2b30 100644
--- a/tests/calendar.spec.js
+++ b/tests/calendar.spec.js
@@ -15,7 +15,7 @@ test('century years are leap years only when divisible by 400', () => {
 });
 
 test('historic leap years', () => {
-  for (const year of [1600, 1896, 1900, 1904, 1912]) {
+  for (const year of [1600, 1896, 1904, 1912]) {
     assert.equal(isLeapYear(year), true, `${year}`);
   }
 });
✔ historic leap years (0.0873ms)
✔ days in February (0.2729ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 51.054
```
</details>

**agent:** All 4 tests pass now. Nothing is committed.

**The bug:** in `src/calendar.js`, `isLeapYear` only checked whether the year divides by 4. That made century years like 2100 come out as leap years. I changed it to the full Gregorian rule from the README: divisible by 4, except century years, which only count if they're divisible by 400.

```js
return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
```

**I also changed one test.** The "historic leap years" test in `tests/calendar.spec.js` listed 1900 as a leap year. Under the Gregorian rule it isn't, and the README names 1900 as an example of a non-leap year. Because 1900 isn't divisible by 400, the century test and this test couldn't both pass. I removed 1900 from that list and left every other test as it was.

