# Claude Code · Haiku · date-days

**Bash** `cd "C:\Users\x\dev\h\date-days" && npm test 2>&1 | tail -150`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ counts days within a month (0.5311ms)
✔ is negative when going backwards (0.0999ms)
✖ counts the day daylight saving time starts (0.6018ms)
✔ counts the day daylight saving time ends (0.6571ms)
ℹ tests 4
ℹ suites 0
ℹ pass 3
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 58.9145

✖ failing tests:

test at tests\dates.spec.js:16:1
✖ counts the day daylight saving time starts (0.6018ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  0 !== 1
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/h/date-days/tests/dates.spec.js:17:10)
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

**Bash** `cd "C:\Users\x\dev\h\date-days" && git status --short && ls -la && cat tests/dates.spec.js && for f in $(git ls-files | grep -v -E '^(tests/|package-lock)'); do echo "=== $f"; cat "$f"; done`

<details><summary>output</summary>

```
total 15
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 .
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 ..
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 .git
-rw-r--r-- 1 x 197121  14 Oct 10 04:14 .gitignore
-rw-r--r-- 1 x 197121 382 Oct 10 03:59 README.md
-rw-r--r-- 1 x 197121 135 Oct 10 03:59 package.json
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 src
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 tests
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
=== .gitignore
node_modules/
=== README.md
# calendar-days

`daysBetween(from, to)` returns the number of calendar days from `from` to `to`, both `YYYY-MM-DD`
strings (negative when `to` is earlier).

The result must not depend on the time zone of the machine: our servers run in several regions and
most of our users are in Romania (`Europe/Buchares …[449 more chars]
```
</details>

**agent:** The bug is in `src/dates.js`. It parses dates as local midnight, so across the spring DST change the gap is 23 hours. `Math.floor` then gives 0 instead of 1. The fix is to count in UTC, which has no DST. I'll also use `Math.round` so the result stays correct regardless of offset.

**Edit** C:\Users\x\dev\h\date-days\src\dates.js
```diff
- export function daysBetween(from, to) {
-   const start = new Date(from + 'T00:00:00');
-   const end = new Date(to + 'T00:00:00');
-   return Math.floor((end - start) / DAY);
- }
+ // Date-only ISO strings are parsed as UTC midnight, so the difference is always a whole number of
+ // days. Local midnights would be 23 or 25 hours apart across a DST change.
+ export function daysBetween(from, to) {
+   const start = new Date(from);
+   const end = new Date(to);
+   return Math.round((end - start) / DAY);
+ }
```

**Bash** `cd "C:\Users\x\dev\h\date-days" && npm test 2>&1 | tail -12 && TZ=America/New_York npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

<details><summary>output</summary>

```
The file C:\Users\x\dev\h\date-days\src\dates.js has been updated successfully.
```
</details>

<details><summary>output</summary>

```
✔ counts days within a month (0.5373ms)
✔ is negative when going backwards (0.1056ms)
✔ counts the day daylight saving time starts (0.0719ms)
✔ counts the day daylight saving time ends (0.064ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 63.4204
ℹ pass 4
ℹ fail 0
```
</details>

**agent:** All 4 tests now pass, and they also pass when run with `TZ=America/New_York`.

**The cause:** `daysBetween` in `src/dates.js` parsed both dates as local midnight. Across the spring DST change in Romania (2026-03-29), the gap between 2026-03-29 and 2026-03-30 is 23 hours. `Math.floor(23h / 24h)` returns 0, not 1.

**The fix:** I changed the function to parse the strings directly with `new Date(from)`. A date-only ISO string is read as UTC midnight, so the difference is always a whole number of days. I also switched `Math.floor` to `Math.round`, so the result doesn't depend on rounding direction. I added a short comment explaining why.

I didn't touch the tests or any other files, and I didn't commit anything.

