# Claude Code · Sonnet (run 2) · semver-sort

**Bash** `npm test 2>&1 | head -60; ls; git ls-files`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✔ sorts numerically, not as text (1.4981ms)
✖ follows the SemVer pre-release precedence example (1.4291ms)
✔ does not modify its input (0.1059ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 53.8147

✖ failing tests:

test at tests\versions.spec.js:9:1
✖ follows the SemVer pre-release precedence example (1.4291ms)
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
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/semver-sort/tests/versions.spec.js:12:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ '1.0.0-rc.1', '1.0.0', '1.0.0-beta.11', '1.0.0-alpha.beta', '1.0.0-alpha', '1.0.0-beta.2', '1.0.0-alpha.1', '1.0.0-beta' ],
    expected:  …[287 more chars]
```
</details>

**Read** C:\Users\x\dev\s2\semver-sort\src\versions.js

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

**Write** C:\Users\x\dev\s2\semver-sort\src\versions.js
```
function parse(version) {
  const [main, ...rest] = version.split('+')[0].split('-');
  const pre = rest.length ? rest.join('-').split('.') : null;
  return { nums: main.split('.').map(Number), pre };
}

function comparePre(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) return Number(x) - Number(y);
    if (xn) return -1;
    if (yn) return 1;
    return x < y ? -1 : 1;
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
The file C:\Users\x\dev\s2\semver-sort\src\versions.js has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
ℹ pass 3
ℹ fail 0
```
</details>

**agent:** All three tests now pass. I changed only `src/versions.js`, and I didn't commit.

The old `sortVersions` split each version on `.` and compared only the first three numeric parts. It ignored pre-release tags, so `1.0.0-alpha` and `1.0.0` tied. Because `Number('0-alpha')` is `NaN`, the comparisons also gave inconsistent results.

I rewrote it to follow SemVer precedence:
- **Build metadata:** anything after `+` is ignored.
- **Pre-release vs. release:** a version with a pre-release tag sorts before the same version without one.
- **Pre-release identifiers:** these are compared one by one. Numeric identifiers compare as numbers and rank below alphanumeric ones, which compare as text. If all shared identifiers are equal, the one with fewer identifiers comes first.

