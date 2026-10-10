# Claude Code · Sonnet (run 2) · csv-parse

**PowerShell** `npm test 2>&1 | Select-Object -First 60`

<details><summary>output</summary>

```
Exit code 255
> test
> node --test "tests/*.spec.js"

✔ parses simple records (0.9922ms)
✖ keeps commas inside quotes (0.8647ms)
✖ unescapes doubled quotes (0.7129ms)
✖ accepts CRLF line endings (0.2174ms)
✖ keeps line breaks inside quotes (0.1661ms)
ℹ tests 5
ℹ suites 0
ℹ pass 1
ℹ fail 4
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 54.6317

✖ failing tests:

test at tests\csv.spec.js:10:1
✖ keeps commas inside quotes (0.8647ms)
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
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/csv-parse/tests/csv.spec.js:11:10)
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

test at tests\csv.spec.js …[165 more chars]
```
</details>

**Bash** `cd /c/Users/x/dev/s2/csv-parse; ls; cat package.json; cat src/*.js; cat tests/csv.spec.js`

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

**agent:** Rewrite as a state-machine parser.

**Bash** `cd /c/Users/x/dev/s2/csv-parse; ls src; cat > src/csv.js <<'EOF'
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
      inQuot …[446 more chars]`

<details><summary>output</summary>

```
csv.js
ℹ pass 5
ℹ fail 0
```
</details>

**agent:** All 5 tests now pass. I didn't commit anything.

The old `parseCSV` in `src/csv.js` split on `\n` and then on `,`, then stripped quote characters. That is why quoted commas, doubled quotes, CRLF line endings and line breaks inside quotes all failed.

I replaced it with a small character-by-character parser. It tracks whether it is inside quotes, so commas and newlines inside quotes stay in the field. It turns `""` into a literal `"`, and it treats `\r\n`, `\n` and `\r` as row endings. A final row without a trailing newline is still returned.

I didn't add handling for malformed input, such as an unterminated quote.

