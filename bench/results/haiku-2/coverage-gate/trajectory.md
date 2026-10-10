# Claude Code · Haiku (run 2) · coverage-gate

**Bash** `cd "C:/Users/x/dev/h2/coverage-gate" && npm test 2>&1 | tail -150; git status --short`

<details><summary>output</summary>

```
> test
> node --test --experimental-test-coverage --test-coverage-lines=90 "tests/*.spec.js"

✔ lower-cases and joins words with dashes (0.7078ms)
✔ drops accents and punctuation (0.1388ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 62.1076
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

**agent:** The two tests pass, but the run fails on the coverage gate: `duration.js` is at 21.74% line coverage, which drags the total to 60% against a 90% threshold. Let me look at that file and the existing tests.

**Bash** `cd "C:/Users/x/dev/h2/coverage-gate" && ls -la && cat package.json && echo ---- && for f in src/*.js tests/*.js; do echo "== $f"; cat "$f"; done; echo ----; ls -a; git log --oneline`

<details><summary>output</summary>

```
total 15
drwxr-xr-x 1 x 197121   0 Oct 10 08:39 .
drwxr-xr-x 1 x 197121   0 Oct 10 08:39 ..
drwxr-xr-x 1 x 197121   0 Oct 10 08:39 .git
-rw-r--r-- 1 x 197121  14 Oct 10 04:14 .gitignore
-rw-r--r-- 1 x 197121 616 Oct 10 04:03 README.md
-rw-r--r-- 1 x 197121 183 Oct 10 04:03 package.json
drwxr-xr-x 1 x 197121   0 Oct 10 08:39 src
drwxr-xr-x 1 x 197121   0 Oct 10 08:39 tests
{
  "name": "timekit",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test --experimental-test-coverage --test-coverage-lines=90 \"tests/*.spec.js\""
  }
}
----
== src/duration.js
const UNITS = { h: 3600, m: 60, s: 1 };

export function parseDuration(text) {
  const match = /^(\d+)([hms])$/.exec(text.trim());
  if (!match) {
    throw new Error(`invalid duration: ${text}`);
  }
  return Number(match[1]) * UNITS[match[2]];
}

export function formatDuration(seconds) {
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error(`invalid seconds: ${seconds}`);
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join('') || '0s';
}
== src/index.js
export { slugify } from './slug.js';
export { formatDuration, parseDuration } from './duration.js';
== src/slug.js
export function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ …[576 more chars]
```
</details>

**agent:** The code is fine; the gap is that `duration.js` has no tests. The right fix is to add a spec that exercises it, not to lower the 90% threshold. I'll write tests against the current behavior.

**Write** C:\Users\x\dev\h2\coverage-gate\tests\duration.spec.js
```
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/index.js';

test('parses single-unit durations into seconds', () => {
  assert.equal(parseDuration('90s'), 90);
  assert.equal(parseDuration('5m'), 300);
  assert.equal(parseDuration('2h'), 7200);
  assert.equal(parseDuration('0s'), 0);
});

test('ignores surrounding whitespace when parsing', () => {
  assert.equal(parseDuration('  3m  '), 180);
});

test('rejects malformed durations', () => {
  assert.throws(() => parseDuration('10'), /invalid duration: 10/);
  assert.throws(() => parseDuration('1h30m'), /invalid duration: 1h30m/);
  assert.throws(() => parseDuration('5d'), /invalid duration: 5d/);
  assert.throws(() => parseDuration(''), /invalid duration/);
});

test('formats seconds into compact h/m/s strings', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(120), '2m');
  assert.equal(formatDuration(3600), '1h');
  assert.equal(formatDuration(3661), '1h1m1s');
  assert.equal(formatDuration(7260), '2h1m');
});

test('round-trips with parseDuration for whole-unit values', () => {
  for (const text of ['1h', '15m', '59s', '1h1m1s']) {
    const seconds = text.split(/(?=[hms])/).reduce(
      (total, part) => total + parseDuration(part),
      0,
    );
    assert.equal(formatDuration(seconds), text);
  }
});

test('rejects negative, fractional, and non-numeric seconds', () => {
  assert.throws(() => formatDuration(-1), /invalid seconds: -1/);
  assert.throws(() => formatDuration(1.5), /invalid seconds: 1.5/);
  assert.throws(() => formatDuration('60'), /invalid seconds: 60/);
});

```

**Bash** `cd "C:/Users/x/dev/h2/coverage-gate" && npm test 2>&1 | tail -40`

<details><summary>output</summary>

```
File created successfully at: C:\Users\x\dev\h2\coverage-gate\tests\duration.spec.js (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
✔ drops accents and punctuation (0.2013ms)
ℹ tests 8
ℹ suites 0
ℹ pass 7
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 73.6681
ℹ start of coverage report
ℹ ------------------------------------------------------------------
ℹ file              | line % | branch % | funcs % | uncovered lines
ℹ ------------------------------------------------------------------
ℹ src               |        |          |         | 
ℹ  duration.js      | 100.00 |   100.00 |  100.00 | 
ℹ  index.js         | 100.00 |   100.00 |  100.00 | 
ℹ  slug.js          | 100.00 |   100.00 |  100.00 | 
ℹ tests             |        |          |         | 
ℹ  duration.spec.js | 100.00 |    93.75 |  100.00 | 
ℹ  slug.spec.js     | 100.00 |   100.00 |  100.00 | 
ℹ ------------------------------------------------------------------
ℹ all files         | 100.00 |    97.22 |  100.00 | 
ℹ ------------------------------------------------------------------
ℹ end of coverage report

✖ failing tests:

test at tests\duration.spec.js:32:1
✖ round-trips with parseDuration for whole-unit values (0.2921ms)
  Error: invalid duration: 1
      at parseDuration (file:///C:/Users/x/dev/h2/coverage-gate/src/duration.js:6:11)
      at file:///C:/Users/x/dev/h2/coverage-gate/tests/duration.spec.js:35:32
      at Array.reduce (<anonymous>)
      at TestContext.<anonymous> (file:///C:/Users/x/dev/h2/coverage-gate/tests/duration.spec.js:34:45)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:interna …[308 more chars]
```
</details>

**agent:** The coverage gate now passes for `duration.js`. The one failure is a bug in my round-trip test: splitting before each unit letter yields `1`, `h1`, and so on. I'll switch to matching each `<digits><unit>` token.

**Edit** C:\Users\x\dev\h2\coverage-gate\tests\duration.spec.js
```diff
-     const seconds = text.split(/(?=[hms])/).reduce(
+     const seconds = text.match(/\d+[hms]/g).reduce(
```

**Bash** `cd "C:/Users/x/dev/h2/coverage-gate" && npm test 2>&1 | tail -30; echo "exit=$?"`

<details><summary>output</summary>

```
The file C:\Users\x\dev\h2\coverage-gate\tests\duration.spec.js has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
✔ ignores surrounding whitespace when parsing (0.1013ms)
✔ rejects malformed durations (0.3666ms)
✔ formats seconds into compact h/m/s strings (0.1125ms)
✔ round-trips with parseDuration for whole-unit values (0.1513ms)
✔ rejects negative, fractional, and non-numeric seconds (0.1276ms)
✔ lower-cases and joins words with dashes (0.7911ms)
✔ drops accents and punctuation (0.1501ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 76.9058
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
exit=0
```
</details>

**agent:** `npm test` now passes: 8 of 8 tests, with 100% line coverage against the 90% gate.

**What was wrong:** the two existing slug tests passed, but the coverage gate failed. `src/duration.js` had no tests, so total line coverage was 60%.

**What I changed:** I added `tests/duration.spec.js`, which covers `parseDuration` and `formatDuration`. It checks:
- parsing of `s`, `m`, `h` units, including `0s` and surrounding whitespace
- rejection of malformed durations such as `10`, `1h30m`, `5d` and the empty string
- formatting into compact strings such as `0s`, `2m`, `1h`, `1h1m1s`
- a round trip from parsed text back to formatted text
- rejection of negative, fractional and non-numeric seconds

I wrote the expectations against the existing behavior and did not change any source code. My first version of the round-trip test had a bug in how it split the input, which I fixed before the final run.

I left the 90% threshold in `package.json` as it was. Nothing was committed, and nothing was installed.

