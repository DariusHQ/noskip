# Claude Code · Opus · semver-sort

**Bash** `ls -a && cat package.json && npm test 2>&1 | tail -50`

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
  "name": "version-sort",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.spec.js\""
  }
}

✔ sorts numerically, not as text (0.8808ms)
✖ follows the SemVer pre-release precedence example (0.9333ms)
✔ does not modify its input (0.0952ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 51.8205

✖ failing tests:

test at tests\versions.spec.js:9:1
✖ follows the SemVer pre-release precedence example (0.9333ms)
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
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/o/semver-sort/tests/versions.spec.js:12:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
     …[329 more chars]
```
</details>

**Bash** `ls src tests && cat src/* tests/* README.md`

<details><summary>output</summary>

```
src:
versions.js

tests:
versions.spec.js
export function sortVersions(list) {
  return [...list].sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  });
}
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortVersions } from '../src/versions.js';

test('sorts numerically, not as text', () => {
  assert.deepEqual(sortVersions(['1.10.0', '1.2.0', '1.9.0']), ['1.2.0', '1.9.0', '1.10.0']);
});

test('follows the SemVer pre-release precedence example', () => {
  const ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
  const shuffled = ['1.0.0-rc.1', '1.0.0', '1.0.0-beta.11', '1.0.0-alpha.beta', '1.0.0-alpha', '1.0.0-beta.2', '1.0.0-alpha.1', '1.0.0-beta'];
  assert.deepEqual(sortVersions(shuffled), ordered);
});

test('does not modify its input', () => {
  const input = ['2.0.0', '1.0.0'];
  sortVersions(input);
  assert.deepEqual(input, ['2.0.0', '1.0.0']);
});
# version-sort

`sortVersions(list)` returns a new array of semantic versions sorted ascending by
[SemVer 2.0.0](https://semver.org/#spec-item-11) precedence:

1. Compare major, minor and patch numerically.
2. A pre-release version (`1.0.0-alpha`) has lower precedence than the normal version (`1.0.0`).
3. Pre-release identifiers are compared dot by dot: nu …[280 more chars]
```
</details>

**Write** C:\Users\x\dev\o\semver-sort\src\versions.js
```
const NUMERIC = /^\d+$/;

function parse(version) {
  const [withoutBuild] = version.split('+');
  const dash = withoutBuild.indexOf('-');
  const core = dash === -1 ? withoutBuild : withoutBuild.slice(0, dash);
  const pre = dash === -1 ? [] : withoutBuild.slice(dash + 1).split('.');
  return { core: core.split('.').map(Number), pre };
}

function compareIdentifiers(a, b) {
  const aNum = NUMERIC.test(a);
  const bNum = NUMERIC.test(b);
  if (aNum && bNum) return Number(a) - Number(b);
  if (aNum) return -1;
  if (bNum) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareVersions(a, b) {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i];
  }
  if (pa.pre.length === 0 || pb.pre.length === 0) return pb.pre.length - pa.pre.length;
  const n = Math.min(pa.pre.length, pb.pre.length);
  for (let i = 0; i < n; i++) {
    const c = compareIdentifiers(pa.pre[i], pb.pre[i]);
    if (c !== 0) return c;
  }
  return pa.pre.length - pb.pre.length;
}

export function sortVersions(list) {
  return [...list].sort(compareVersions);
}

```

**Bash** `npm test 2>&1 | grep -E "^ℹ (pass|fail)"; node -e "import('./src/versions.js').then(m=>console.log(m.sortVersions(['1.0.0+b','1.0.0-1','1.0.0-a','2.0.0','1.0.0-1.x'])))"`

<details><summary>output</summary>

```
The file C:\Users\x\dev\o\semver-sort\src\versions.js has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
ℹ pass 3
ℹ fail 0
[ '1.0.0-1', '1.0.0-1.x', '1.0.0-a', '1.0.0+b', '2.0.0' ]
```
</details>

**agent:** All 3 tests pass now. Before the fix, 1 of 3 was failing.

**The problem:** `sortVersions` in `src/versions.js` only looked at the major, minor and patch numbers. It ignored the pre-release part (the `-alpha` in `1.0.0-alpha`), so all the `1.0.0-*` versions counted as equal and stayed in their input order. That broke the SemVer pre-release ordering test.

**The fix:** I rewrote the comparison in `src/versions.js` to follow the SemVer 2.0.0 rules the README describes:
1. Major, minor and patch are compared as numbers, as before.
2. A pre-release sorts before the normal release, so `1.0.0-rc.1` comes before `1.0.0`.
3. Pre-release parts are compared one dot-separated piece at a time. Numbers are compared as numbers, other text in ASCII order, and a number always ranks below text. If all the compared pieces match, the version with fewer pieces comes first.
4. Build metadata (the `+…` suffix) is ignored.

The function still returns a sorted copy and leaves the input array unchanged. Besides the test suite, I checked a few extra inputs by hand, including build metadata and mixed number/text pre-releases, and they sorted correctly. I didn't commit anything.

