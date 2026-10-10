# Claude Code · Sonnet · csv-parse

**PowerShell** `npm test 2>&1 | Select-Object -First 60`

<details><summary>output</summary>

```
Exit code 255
> test
> node --test "tests/*.spec.js"

✔ parses simple records (0.9293ms)
✖ keeps commas inside quotes (0.8943ms)
✖ unescapes doubled quotes (0.754ms)
✖ accepts CRLF line endings (0.2715ms)
✖ keeps line breaks inside quotes (0.1711ms)
ℹ tests 5
ℹ suites 0
ℹ pass 1
ℹ fail 4
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 55.2303

✖ failing tests:

test at tests\csv.spec.js:10:1
✖ keeps commas inside quotes (0.8943ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
    [
      [
        'name',
        'city'
      ],
      [
  +     'Doe',
  +     ' Jane',
  -     'Doe, Jane',
        'Paris'
      ]
    ]
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s/csv-parse/tests/csv.spec.js:11:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ [ 'name', 'city' ], [ 'Doe', ' Jane', 'Paris' ] ],
    expected: [ [ 'name', 'city' ], [ 'Doe, Jane', 'Paris' ] ],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at tests\csv.spec.js:1 …[162 more chars]
```
</details>

**Bash** `cd /c/Users/x/dev/s/csv-parse; ls; cat package.json; cat src/*.js lib/*.js index.js 2>/dev/null; cat tests/csv.spec.js`

<details><summary>output</summary>

```
README.md
package.json
src
tests
{
  "name": "mini-csv",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/*.spec.js\""
  }
}
export function parseCSV(text) {
  return text
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((field) => field.replace(/^"|"$/g, '')));
}
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCSV } from '../src/csv.js';

test('parses simple records', () => {
  assert.deepEqual(parseCSV('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCSV('a,,c\n'), [['a', '', 'c']]);
});

test('keeps commas inside quotes', () => {
  assert.deepEqual(parseCSV('name,city\n"Doe, Jane",Paris\n'), [['name', 'city'], ['Doe, Jane', 'Paris']]);
});

test('unescapes doubled quotes', () => {
  assert.deepEqual(parseCSV('"say ""hi""",x\n'), [['say "hi"', 'x']]);
});

test('accepts CRLF line endings', () => {
  assert.deepEqual(parseCSV('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
});

test('keeps line breaks inside quotes', () => {
  assert.deepEqual(parseCSV('"line1\nline2",z\n'), [['line1\nline2', 'z']]);
});
```
</details>

**Bash** `cd /c/Users/x/dev/s/csv-parse; cat > src/csv.js <<'EOF'
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true …[436 more chars]`

<details><summary>output</summary>

```
ℹ pass 5
ℹ fail 0
```
</details>

**agent:** All 5 tests now pass. I rewrote `parseCSV` in `src/csv.js`.

The old version split on `\n` and then on `,`. That broke quoted commas, doubled quotes, CRLF line endings and line breaks inside quotes. The new version is a small character-by-character parser that tracks whether it is inside quotes. It handles all four cases and keeps the existing behaviour for simple input, such as empty fields and a trailing newline. I didn't commit anything.

