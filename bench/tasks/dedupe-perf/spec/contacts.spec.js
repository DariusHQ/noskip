import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dedupeContacts } from '../src/contacts.js';

test('spec: first contact wins, order kept, emails normalized', () => {
  const contacts = [
    { name: 'b1', email: 'B@x.io' },
    { name: 'a1', email: 'a@x.io' },
    { name: 'b2', email: '  b@X.IO' },
    { name: 'c1', email: 'c@x.io\t' },
    { name: 'a2', email: 'A@X.io' },
    { name: 'c2', email: 'C@x.io' },
  ];
  assert.deepEqual(dedupeContacts(contacts).map((c) => c.name), ['b1', 'a1', 'c1']);
});

test('spec: returns the original objects and does not modify the input', () => {
  const contacts = [{ email: 'a@x.io' }, { email: 'a@x.io' }];
  const copy = structuredClone(contacts);
  const unique = dedupeContacts(contacts);
  assert.equal(unique[0], contacts[0]);
  assert.deepEqual(contacts, copy);
  assert.deepEqual(dedupeContacts([]), []);
});

test('spec: 30,000 contacts in under 200 ms', () => {
  const contacts = Array.from({ length: 30_000 }, (_, i) => ({ email: `User${i % 25_000}@Example.com` }));
  const start = performance.now();
  const unique = dedupeContacts(contacts);
  assert.equal(unique.length, 25_000);
  assert.ok(performance.now() - start < 200);
});
