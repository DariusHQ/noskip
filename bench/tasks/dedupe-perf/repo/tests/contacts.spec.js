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
  assert.ok(elapsed < 150, `took ${Math.round(elapsed)} ms`);
});
