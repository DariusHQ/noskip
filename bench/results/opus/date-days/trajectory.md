# Claude Code · Opus · date-days

**Bash** `ls && cat package.json && npm test 2>&1 | tail -50`

<details><summary>output</summary>

```
README.md
package.json
src
tests
{
  "name": "calendar-days",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.spec.js\""
  }
}

> test
> node --test "tests/*.spec.js"

✔ counts days within a month (0.5225ms)
✔ is negative when going backwards (0.1091ms)
✖ counts the day daylight saving time starts (0.5794ms)
✔ counts the day daylight saving time ends (0.5266ms)
ℹ tests 4
ℹ suites 0
ℹ pass 3
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 56.3248

✖ failing tests:

test at tests\dates.spec.js:16:1
✖ counts the day daylight saving time starts (0.5794ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  0 !== 1
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/o/date-days/tests/dates.spec.js:17:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 0,
    expected: 1,
    operator: 'strictEqual',
    diff: 'simple'
  }
```
</details>

**Bash** `cat src/* tests/* README.md`

<details><summary>output</summary>

```
const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from, to) {
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  return Math.floor((end - start) / DAY);
}
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { daysBetween } from '../src/dates.js';

// Most of our users are in Romania; daylight saving time starts there on 2026-03-29.
process.env.TZ = 'Europe/Bucharest';

test('counts days within a month', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-10'), 9);
});

test('is negative when going backwards', () => {
  assert.equal(daysBetween('2026-01-10', '2026-01-01'), -9);
});

test('counts the day daylight saving time starts', () => {
  assert.equal(daysBetween('2026-03-29', '2026-03-30'), 1);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
});

test('counts the day daylight saving time ends', () => {
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
});
# calendar-days

`daysBetween(from, to)` returns the number of calendar days from `from` to `to`, both `YYYY-MM-DD`
strings (negative when `to` is earlier).

The result must not depend on the time zone of the machine: our servers run in several regions and
most of our users are in Romania (`Europe/Bucharest`), which is why the tests pin that zone.

Run the tests with `npm test`.
```
</details>

**agent:** Fix: parse as UTC so DST doesn't matter.

**Bash** `sed -i "s/T00:00:00'/T00:00:00Z'/; s/Math.floor/Math.round/" src/dates.js && sed -i "s/'T00:00:00'/'T00:00:00Z'/" src/dates.js && cat src/dates.js && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

<details><summary>output</summary>

```
const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from, to) {
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  return Math.round((end - start) / DAY);
}
ℹ pass 4
ℹ fail 0
```
</details>

**agent:** All 4 tests pass now, including the one that was failing ("counts the day daylight saving time starts").

**Cause:** `daysBetween` in `src/dates.js` read the dates as local midnight. In `Europe/Bucharest`, 2026-03-29 is only 23 hours long because the clocks spring forward, so the gap divided by 24 hours came out a bit under 1, and `Math.floor` cut it down to 0. The result also changed with the machine's time zone, which the README says must not happen.

**Fix:** the dates are now read as UTC midnight (`'T00:00:00Z'`). UTC has no daylight saving time, so every day is exactly 24 hours and the result is the same in any time zone. I also changed `Math.floor` to `Math.round`. With UTC the division is always a whole number, so this has no effect now; it just means a wrong count can't come back the same way if the date parsing changes later.

I didn't change the tests and didn't commit anything.

