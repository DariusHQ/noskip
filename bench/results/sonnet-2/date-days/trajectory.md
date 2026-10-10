# Claude Code · Sonnet (run 2) · date-days

**Bash** `npm test 2>&1 | head -50; ls; git ls-files | head -30`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ counts days within a month (0.8447ms)
✔ is negative when going backwards (0.152ms)
✖ counts the day daylight saving time starts (0.9697ms)
✔ counts the day daylight saving time ends (0.7094ms)
ℹ tests 4
ℹ suites 0
ℹ pass 3
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 60.7698

✖ failing tests:

test at tests\dates.spec.js:16:1
✖ counts the day daylight saving time starts (0.9697ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  0 !== 1
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/date-days/tests/dates.spec.js:17:10)
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
.gitignore
README.md
package.json
src/dates.js
tests/dates.spec.js
```
</details>

**Bash** `cat src/dates.js tests/dates.spec.js package.json`

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
{
  "name": "calendar-days",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.spec.js\""
  }
}
```
</details>

**agent:** Use UTC to avoid DST and round-trip safely.

**Bash** `sed -i "s/'T00:00:00'/'T00:00:00Z'/g; s/Math.floor/Math.round/" src/dates.js && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

<details><summary>output</summary>

```
ℹ pass 4
ℹ fail 0
```
</details>

**agent:** All 4 tests now pass.

`daysBetween` in `src/dates.js` parsed the dates as local midnight. In Europe/Bucharest the day DST starts is only 23 hours long, so `Math.floor` of the millisecond difference gave 0 instead of 1.

I made two changes:
- **UTC parsing:** the dates are now parsed as UTC by adding a `Z` to the timestamp, so DST can't change the day length.
- **`Math.round`:** I switched `Math.floor` to `Math.round` as a safeguard. With UTC parsing the difference is always a whole number of days, so it makes no difference to the current tests.

I didn't commit anything.

