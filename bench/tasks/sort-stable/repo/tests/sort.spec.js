import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortBy } from '../src/sort.js';

test('sorts by a numeric key', () => {
  const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
  assert.deepEqual(sortBy(items, 'v').map((i) => i.v), [1, 2, 3]);
});

test('does not modify the input', () => {
  const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
  sortBy(items, 'v');
  assert.deepEqual(items.map((i) => i.v), [3, 1, 2]);
});

test('keeps items with equal keys in input order', () => {
  const items = [
    { id: 'b', v: 1 },
    { id: 'c', v: 0 },
    { id: 'a', v: 1 },
  ];
  assert.deepEqual(sortBy(items, 'v').map((i) => i.id), ['c', 'b', 'a']);
});

test('orders the board by priority', () => {
  const tasks = [
    { name: 'deploy', priority: 2 },
    { name: 'write docs', priority: 1 },
    { name: 'fix bug', priority: 1 },
  ];
  assert.deepEqual(sortBy(tasks, 'priority').map((t) => t.name), ['fix bug', 'write docs', 'deploy']);
});
