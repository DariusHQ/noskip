import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LRU } from '../src/lru.js';

test('evicts the least recently used entry', () => {
  const cache = new LRU(2);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a'); // a is now the most recently used
  cache.set('c', 3); // so b goes
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);
});

test('updating a key does not grow the cache', () => {
  const cache = new LRU(2);
  cache.set('a', 1);
  cache.set('a', 2);
  cache.set('b', 3);
  assert.equal(cache.size, 2);
  assert.equal(cache.get('a'), 2);
  assert.equal(cache.get('b'), 3);
});
