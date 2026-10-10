# Claude Code · Sonnet · semver-sort

**Bash** `npm test 2>&1 | head -60; ls; git ls-files`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ sorts numerically, not as text (0.9342ms)
✖ follows the SemVer pre-release precedence example (0.992ms)
✔ does not modify its input (0.0961ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 59.6726

✖ failing tests:

test at tests\versions.spec.js:9:1
✖ follows the SemVer pre-release precedence example (0.992ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
    [
  +   '1.0.0-rc.1',
  +   '1.0.0',
  +   '1.0.0-beta.11',
  +   '1.0.0-alpha.beta',
      '1.0.0-alpha',
  +   '1.0.0-beta.2',
      '1.0.0-alpha.1',
  -   '1.0.0-alpha.beta',
      '1.0.0-beta',
  -   '1.0.0-beta.2',
  -   '1.0.0-beta.11',
  -   '1.0.0-rc.1',
  -   '1.0.0'
    ]
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s/semver-sort/tests/versions.spec.js:12:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ '1.0.0-rc.1', '1.0.0', '1.0.0-beta.11', '1.0.0-alpha.beta', '1.0.0-alpha', '1.0.0-beta.2', '1.0.0-alpha.1', '1.0.0-beta' ],
    expected: [ ' …[284 more chars]
```
</details>

**Read** C:\Users\x\dev\s\semver-sort\src\versions.js

<details><summary>output</summary>

```
1	export function sortVersions(list) {
2	  return [...list].sort((a, b) => {
3	    const pa = a.split('.').map(Number);
4	    const pb = b.split('.').map(Number);
5	    for (let i = 0; i < 3; i++) {
6	      if (pa[i] !== pb[i]) return pa[i] - pb[i];
7	    }
8	    return 0;
9	  });
10	}
11	
```
</details>

**Read** C:\Users\x\dev\s\semver-sort\tests\versions.spec.js

<details><summary>output</summary>

```
1	import assert from 'node:assert/strict';
2	import { test } from 'node:test';
3	import { sortVersions } from '../src/versions.js';
4	
5	test('sorts numerically, not as text', () => {
6	  assert.deepEqual(sortVersions(['1.10.0', '1.2.0', '1.9.0']), ['1.2.0', '1.9.0', '1.10.0']);
7	});
8	
9	test('follows the SemVer pre-release precedence example', () => {
10	  const ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
11	  const shuffled = ['1.0.0-rc.1', '1.0.0', '1.0.0-beta.11', '1.0.0-alpha.beta', '1.0.0-alpha', '1.0.0-beta.2', '1.0.0-alpha.1', '1.0.0-beta'];
12	  assert.deepEqual(sortVersions(shuffled), ordered);
13	});
14	
15	test('does not modify its input', () => {
16	  const input = ['2.0.0', '1.0.0'];
17	  sortVersions(input);
18	  assert.deepEqual(input, ['2.0.0', '1.0.0']);
19	});
20	
```
</details>

**Write** C:\Users\x\dev\s\semver-sort\src\versions.js
```
function parse(v) {
  const [core, ...rest] = v.split('+')[0].split('-');
  return {
    nums: core.split('.').map(Number),
    pre: rest.length ? rest.join('-').split('.') : [],
  };
}

const isNum = (s) => /^\d+$/.test(s);

function comparePre(a, b) {
  // A version without pre-release has higher precedence.
  if (!a.length || !b.length) return b.length - a.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    const an = isNum(a[i]);
    const bn = isNum(b[i]);
    if (an && bn) return Number(a[i]) - Number(b[i]);
    if (an) return -1;
    if (bn) return 1;
    return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

export function sortVersions(list) {
  return [...list].sort((a, b) => {
    const pa = parse(a);
    const pb = parse(b);
    for (let i = 0; i < 3; i++) {
      if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i];
    }
    return comparePre(pa.pre, pb.pre);
  });
}

```

**Bash** `npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

<details><summary>output</summary>

```
The file C:\Users\x\dev\s\semver-sort\src\versions.js has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
ℹ pass 3
ℹ fail 0
```
</details>

**agent:** `npm test` now passes, 3 of 3.

The failure was in `src/versions.js`. The sort only compared the three numeric parts, so pre-release tags like `-alpha.1` or `-rc.1` were ignored. I rewrote it to follow the SemVer pre-release rules:
- A version with a pre-release sorts before the same version without one.
- Pre-release parts are compared one at a time, split on dots.
- Numeric parts compare as numbers and rank below text parts.
- Text parts compare alphabetically.
- If one list is a prefix of the other, the shorter one sorts first.
- Build metadata after `+` is ignored.

I didn't commit anything.

