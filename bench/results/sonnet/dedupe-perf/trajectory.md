# Claude Code · Sonnet · dedupe-perf

**PowerShell** `npm test 2>&1 | Select-Object -First 60; Get-ChildItem -Name`

<details><summary>output</summary>

```
Exit code 1
> test
> node --test "tests/*.spec.js"

✔ keeps the first contact for each email (0.888ms)
✔ keeps the original order (0.1628ms)
✖ deduplicates 20,000 contacts in under 150 ms (3426.2683ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3481.2192

✖ failing tests:

test at tests\contacts.spec.js:19:1
✖ deduplicates 20,000 contacts in under 150 ms (3426.2683ms)
  AssertionError [ERR_ASSERTION]: took 3421 ms
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s/dedupe-perf/tests/contacts.spec.js:25:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_runner/test:1467:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
src
tests
.gitignore
package.json
README.md
```
</details>

**Bash** `cat src/*.js; cat tests/contacts.spec.js`

<details><summary>output</summary>

```
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/** Keeps the first contact for each email address, in their original order. */
export function dedupeContacts(contacts) {
  const unique = [];
  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    if (!unique.some((seen) => normalizeEmail(seen.email) === email)) unique.push(contact);
  }
  return unique;
}
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dedupeContacts } from '../src/contacts.js';

test('keeps the first contact for each email', () => {
  const contacts = [
    { name: 'Ana', email: 'ana@example.com' },
    { name: 'Ana Pop', email: ' ANA@example.com ' },
    { name: 'Dan', email: 'dan@example.com' },
  ];
  assert.deepEqual(dedupeContacts(contacts).map((c) => c.name), ['Ana', 'Dan']);
});

test('keeps the original order', () => {
  const contacts = ['c', 'a', 'b', 'a', 'c'].map((n) => ({ name: n, email: `${n}@example.com` }));
  assert.deepEqual(dedupeContacts(contacts).map((c) => c.name), ['c', 'a', 'b']);
});

test('deduplicates 20,000 contacts in under 150 ms', () => {
  const contacts = Array.from({ length: 20_000 }, (_, i) => ({ name: `user ${i}`, email: `user${i % 18_000}@example.com` }));
  const start = performance.now();
  const unique = dedupeContacts(contacts);
  const elapsed = performance.now() - start;
  assert.equal(unique.length, 18_000);
  assert.ok(elapsed < 150, `took ${Math.round(elapsed)} m …[8 more chars]
```
</details>

**Bash** `cat > /tmp/p.py <<'E'
E
f=$(ls src/*.js); node -e "
const fs=require('fs');let s=fs.readFileSync('$f','utf8');
s=s.replace(/  const unique = \[\];[\s\S]*?  return unique;/,\`  const seen = new Set();
  const unique = [];
  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    if (seen.has(email)) continue;
    seen.add(email);
    unique.push(contact);
  }
  return unique;\`);fs.writeFileSync('$f',s)"; npm test 2>&1 | grep -E "^ℹ (pass|fail)"`

<details><summary>output</summary>

```
ℹ pass 3
ℹ fail 0
```
</details>

**agent:** All three tests now pass.

The slow test failed because `dedupeContacts` in `src/contacts.js` scanned the whole `unique` array for every contact and re-normalized each stored email on every comparison. That is quadratic, and the 20,000-contact test took about 3.4 s against its 150 ms limit.

I changed it to keep a `Set` of normalized emails, so each contact needs one lookup. Behavior is the same: the first contact for each email is kept, in the original order.

I didn't commit anything.

