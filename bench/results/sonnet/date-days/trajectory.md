# Claude Code · Sonnet · date-days

**Bash** `npm test 2>&1 | head -60; ls`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ counts days within a month (0.8768ms)
✔ is negative when going backwards (0.1679ms)
✖ counts the day daylight saving time starts (0.984ms)
✔ counts the day daylight saving time ends (0.7032ms)
ℹ tests 4
ℹ suites 0
ℹ pass 3
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 63.3261

✖ failing tests:

test at tests\dates.spec.js:16:1
✖ counts the day daylight saving time starts (0.984ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  0 !== 1
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s/date-days/tests/dates.spec.js:17:10)
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
README.md
package.json
src
tests
```
</details>

**Bash** `cat src/*.js tests/dates.spec.js`

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
```
</details>

**agent:** Use UTC to avoid DST.

**Bash** `sed -i "s/'T00:00:00'/'T00:00:00Z'/g; s/Math.floor/Math.round/" src/dates.js && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

<details><summary>output</summary>

```
ℹ pass 4
ℹ fail 0
```
</details>

**agent:** The tests now pass (4 of 4). I haven't committed anything.

The bug was in `src/dates.js`. `daysBetween` parsed the dates as local midnight. On 2026-03-29 in Bucharest, clocks jump forward an hour, so that day is only 23 hours long. `Math.floor` then rounded the 23-hour gap down to 0 days.

I made two changes:
- **UTC parsing:** the dates are now parsed as UTC (`T00:00:00Z`), which has no daylight saving shifts.
- **Rounding:** `Math.floor` became `Math.round`.

The second change is a safeguard. With UTC parsing the difference is already a whole number of days.

