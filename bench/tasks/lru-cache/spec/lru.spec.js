import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LRU } from '../src/lru.js';

test('spec: get refreshes recency', () => {
  const c = new LRU(2);
  c.set('a', 1);
  c.set('b', 2);
  c.get('a');
  c.set('c', 3);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('c'), 3);
  assert.equal(c.size, 2);
});

test('spec: set on an existing key refreshes it and keeps size', () => {
  const c = new LRU(2);
  c.set('a', 1);
  c.set('b', 2);
  c.set('a', 10);
  c.set('c', 3);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 10);
  assert.equal(c.size, 2);
});

test('spec: capacity 1 and many operations', () => {
  const c = new LRU(1);
  c.set('x', 1);
  c.set('y', 2);
  assert.equal(c.get('x'), undefined);
  assert.equal(c.get('y'), 2);
  const d = new LRU(3);
  for (let i = 0; i < 10; i++) d.set('k' + i, i);
  assert.deepEqual(['k7', 'k8', 'k9'].map((k) => d.get(k)), [7, 8, 9]);
  assert.equal(d.get('k6'), undefined);
  assert.equal(d.size, 3);
  assert.equal(d.get('missing'), undefined);
});
