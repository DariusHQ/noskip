# Claude Code · Sonnet (run 2) · dedupe-perf

**PowerShell** `npm test 2>&1 | Select-Object -First 60; Get-ChildItem -Name`

<details><summary>output</summary>

```
Exit code 1
> test
> node --test "tests/*.spec.js"

✔ keeps the first contact for each email (0.9029ms)
✔ keeps the original order (0.1235ms)
✖ deduplicates 20,000 contacts in under 150 ms (3506.5824ms)
ℹ tests 3
ℹ suites 0
ℹ pass 2
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3561.9055

✖ failing tests:

test at tests\contacts.spec.js:19:1
✖ deduplicates 20,000 contacts in under 150 ms (3506.5824ms)
  AssertionError [ERR_ASSERTION]: took 3501 ms
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/dedupe-perf/tests/contacts.spec.js:25:10)
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

**Bash** `cat > src/contacts.js <<'EOF'
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/** Keeps the first contact for each email address, in their original order. */
export function dedupeContacts(contacts) {
  const seen = new Set();
  const unique = [];
  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    if (!seen.has(email)) {
      seen.add(email);
      unique.push(contact);
    }
  }
  return unique;
}
EOF
ls src; npm test 2>&1 | …[25 more chars]`

<details><summary>output</summary>

```
contacts.js
ℹ pass 3
ℹ fail 0
```
</details>

**agent:** All three tests now pass, including the 20,000-contact timing test that was failing (it took about 3.5 s against a 150 ms limit).

The cause was in `dedupeContacts` in `src/contacts.js`. For each contact it scanned every contact kept so far and re-normalized each of their emails. That made the work grow with the square of the list size. I replaced the scan with a `Set` of normalized emails, so each contact needs one lookup. Behavior is the same: the first contact for each email is kept, in the original order.

I didn't commit anything.

