# Claude Code · Haiku · coverage-gate

**Bash** `cd C:/Users/x/dev/h/coverage-gate && npm test 2>&1 | tail -150`

<details><summary>output</summary>

```
> test
> node --test --experimental-test-coverage --test-coverage-lines=90 "tests/*.spec.js"

✔ lower-cases and joins words with dashes (0.7434ms)
✔ drops accents and punctuation (0.1739ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 68.8811
ℹ Error: 60.00% line coverage does not meet threshold of 90%.
ℹ start of coverage report
ℹ --------------------------------------------------------------
ℹ file          | line % | branch % | funcs % | uncovered lines
ℹ --------------------------------------------------------------
ℹ src           |        |          |         | 
ℹ  duration.js  |  21.74 |   100.00 |    0.00 | 4-9 12-23
ℹ  index.js     | 100.00 |   100.00 |  100.00 | 
ℹ  slug.js      | 100.00 |   100.00 |  100.00 | 
ℹ tests         |        |          |         | 
ℹ  slug.spec.js | 100.00 |   100.00 |  100.00 | 
ℹ --------------------------------------------------------------
ℹ all files     |  60.00 |   100.00 |   60.00 | 
ℹ --------------------------------------------------------------
ℹ end of coverage report
```
</details>

**agent:** The two tests pass, but the run fails on the 90% line-coverage gate because `src/duration.js` has no tests. Let me look at the source and the existing spec.

**Bash** `cd C:/Users/x/dev/h/coverage-gate && ls -la && cat package.json && echo ---duration && cat -n src/duration.js && echo ---index && cat -n src/index.js && echo ---slug && cat -n src/slug.js && echo ---spec && cat -n tests/*.spec.js && git status --short && ls tests && cat .gitignore 2>/dev/null`

<details><summary>output</summary>

```
total 15
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 .
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 ..
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 .git
-rw-r--r-- 1 x 197121  14 Oct 10 04:14 .gitignore
-rw-r--r-- 1 x 197121 616 Oct 10 04:03 README.md
-rw-r--r-- 1 x 197121 183 Oct 10 04:03 package.json
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 src
drwxr-xr-x 1 x 197121   0 Oct 10 08:12 tests
{
  "name": "timekit",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test --experimental-test-coverage --test-coverage-lines=90 \"tests/*.spec.js\""
  }
}
---duration
     1	const UNITS = { h: 3600, m: 60, s: 1 };
     2	
     3	export function parseDuration(text) {
     4	  const match = /^(\d+)([hms])$/.exec(text.trim());
     5	  if (!match) {
     6	    throw new Error(`invalid duration: ${text}`);
     7	  }
     8	  return Number(match[1]) * UNITS[match[2]];
     9	}
    10	
    11	export function formatDuration(seconds) {
    12	  if (!Number.isInteger(seconds) || seconds < 0) {
    13	    throw new Error(`invalid seconds: ${seconds}`);
    14	  }
    15	  const h = Math.floor(seconds / 3600);
    16	  const m = Math.floor((seconds % 3600) / 60);
    17	  const s = seconds % 60;
    18	  const parts = [];
    19	  if (h) parts.push(`${h}h`);
    20	  if (m) parts.push(`${m}m`);
    21	  if (s) parts.push(`${s}s`);
    22	  return parts.join('') || '0s';
    23	}
---index
     1	export { slugify } from './slug.js';
     2	export { formatDuration, parseDuration } from './dura …[796 more chars]
```
</details>

**agent:** The fix belongs in the tests, not the threshold. `duration.js` has no spec, so I'll add `tests/duration.spec.js` covering both exports, using the behavior the code actually has (single-unit input only, e.g. `1h30m` is rejected).

**Write** C:\Users\x\dev\h\coverage-gate\tests\duration.spec.js
```
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/index.js';

test('parses a single-unit duration into seconds', () => {
  assert.equal(parseDuration('1h'), 3600);
  assert.equal(parseDuration('2m'), 120);
  assert.equal(parseDuration('45s'), 45);
  assert.equal(parseDuration('0s'), 0);
});

test('ignores surrounding whitespace when parsing', () => {
  assert.equal(parseDuration('  5m  '), 300);
});

test('rejects malformed duration text', () => {
  assert.throws(() => parseDuration('abc'), /invalid duration: abc/);
  assert.throws(() => parseDuration('10'), /invalid duration: 10/);
  assert.throws(() => parseDuration('1d'), /invalid duration: 1d/);
  assert.throws(() => parseDuration('1h30m'), /invalid duration: 1h30m/);
});

test('formats seconds into hours, minutes and seconds', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(90), '1m30s');
  assert.equal(formatDuration(3600), '1h');
  assert.equal(formatDuration(3661), '1h1m1s');
  assert.equal(formatDuration(7200), '2h');
});

test('round-trips through parse and format for single-unit values', () => {
  assert.equal(formatDuration(parseDuration('3m')), '3m');
  assert.equal(formatDuration(parseDuration('2h')), '2h');
});

test('rejects negative, fractional and non-numeric seconds', () => {
  assert.throws(() => formatDuration(-1), /invalid seconds: -1/);
  assert.throws(() => formatDuration(1.5), /invalid seconds: 1.5/);
  assert.throws(() => formatDuration('3'), /invalid seconds: 3/);
});

```

**Bash** `cd C:/Users/x/dev/h/coverage-gate && npm test 2>&1 | tail -60; echo EXIT=${PIPESTATUS[0]}`

<details><summary>output</summary>

```
File created successfully at: C:\Users\x\dev\h\coverage-gate\tests\duration.spec.js (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
> test
> node --test --experimental-test-coverage --test-coverage-lines=90 "tests/*.spec.js"

✔ parses a single-unit duration into seconds (0.7135ms)
✔ ignores surrounding whitespace when parsing (0.0873ms)
✔ rejects malformed duration text (0.3629ms)
✔ formats seconds into hours, minutes and seconds (0.109ms)
✔ round-trips through parse and format for single-unit values (0.0674ms)
✔ rejects negative, fractional and non-numeric seconds (0.1179ms)
✔ lower-cases and joins words with dashes (0.6943ms)
✔ drops accents and punctuation (0.136ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 63.5452
ℹ start of coverage report
ℹ ------------------------------------------------------------------
ℹ file              | line % | branch % | funcs % | uncovered lines
ℹ ------------------------------------------------------------------
ℹ src               |        |          |         | 
ℹ  duration.js      | 100.00 |   100.00 |  100.00 | 
ℹ  index.js         | 100.00 |   100.00 |  100.00 | 
ℹ  slug.js          | 100.00 |   100.00 |  100.00 | 
ℹ tests             |        |          |         | 
ℹ  duration.spec.js | 100.00 |   100.00 |  100.00 | 
ℹ  slug.spec.js     | 100.00 |   100.00 |  100.00 | 
ℹ ------------------------------------------------------------------
ℹ all files         | 100.00 |   100.00 |  100.00 | 
ℹ ------------------------------------------------------------------
ℹ end of coverage report
EXIT=0
```
</details>

**agent:** `npm test` now passes: 8 tests, 0 failures, 100% line coverage, exit code 0.

**What was wrong:** The two existing tests passed, but the run failed the coverage gate (`--test-coverage-lines=90`). It reported 60% line coverage because `src/duration.js` had no tests at all (`parseDuration` and `formatDuration` were never called).

**What I changed:** I added `tests/duration.spec.js`, which covers both functions:
- `parseDuration` for single-unit input (`1h`, `2m`, `45s`, `0s`), surrounding whitespace, and rejection of malformed input (`abc`, `10`, `1d`, `1h30m`).
- `formatDuration` for `0`, `45`, `90`, `3600`, `3661`, `7200`, a round-trip check, and rejection of negative, fractional, and non-numeric seconds.

I did not change the coverage threshold or the test script. The new tests assert the code's current behavior, including that `1h30m` is rejected because the parser accepts only one unit. If you intended multi-unit parsing to be supported, that's a code change and the `1h30m` assertion would need to flip.

Nothing was installed and nothing was committed.

