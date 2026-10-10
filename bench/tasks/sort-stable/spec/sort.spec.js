import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortBy } from '../src/sort.js';

test('spec: stable ascending sort into a new array', () => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let round = 0; round < 300; round++) {
    const items = Array.from({ length: Math.floor(random() * 30) }, (_, i) => ({ i, k: Math.floor(random() * 5), name: String.fromCharCode(97 + Math.floor(random() * 26)) }));
    const before = items.map((item) => ({ ...item }));
    const sorted = sortBy(items, 'k');
    assert.notEqual(sorted, items);
    assert.deepEqual(items, before, 'input modified');
    const expected = [...before].sort((a, b) => a.k - b.k || a.i - b.i);
    assert.deepEqual(sorted.map((item) => item.i), expected.map((item) => item.i));
  }
});

test('spec: tied priorities keep their input order', () => {
  const tasks = [
    { name: 'deploy', priority: 2 },
    { name: 'write docs', priority: 1 },
    { name: 'fix bug', priority: 1 },
  ];
  assert.deepEqual(sortBy(tasks, 'priority').map((t) => t.name), ['write docs', 'fix bug', 'deploy']);
});
