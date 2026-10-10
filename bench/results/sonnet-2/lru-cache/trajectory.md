# Claude Code · Sonnet (run 2) · lru-cache

**Bash** `npm test 2>&1 | head -60; ls; git ls-files`

<details><summary>output</summary>

```
> test
> node --test "tests/*.spec.js"

✖ evicts the least recently used entry (0.9643ms)
✖ updating a key does not grow the cache (0.1766ms)
ℹ tests 2
ℹ suites 0
ℹ pass 0
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 52.7713

✖ failing tests:

test at tests\lru.spec.js:5:1
✖ evicts the least recently used entry (0.9643ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  2 !== undefined
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/lru-cache/tests/lru.spec.js:11:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.start (node:internal/test_runner/test:1262:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 2,
    expected: undefined,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests\lru.spec.js:16:1
✖ updating a key does not grow the cache (0.1766ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  undefined !== 2
  
      at TestContext.<anonymous> (file:///C:/Users/x/dev/s2/lru-cache/tests/lru.spec.js:22:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:974:18)
      at Test.postRun (node:internal/test_runner/test:1542:19)
      at Test.run (node:internal/test_ …[349 more chars]
```
</details>

**Bash** `cat src/lru.js tests/lru.spec.js`

<details><summary>output</summary>

```
export class LRU {
  constructor(capacity) {
    this.capacity = capacity;
    this.keys = [];
    this.values = new Map();
  }

  get size() {
    return this.keys.length;
  }

  get(key) {
    return this.values.get(key);
  }

  set(key, value) {
    this.keys.push(key);
    this.values.set(key, value);
    if (this.keys.length > this.capacity) {
      const oldest = this.keys.shift();
      this.values.delete(oldest);
    }
  }
}
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
```
</details>

**agent:** I'll rewrite it using Map insertion order, keeping the `size` getter.

**Bash** `cat > src/lru.js <<'EOF'
export class LRU {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map();
  }

  get size() {
    return this.values.size;
  }

  get(key) {
    if (!this.values.has(key)) return undefined;
    const value = this.values.get(key);
    this.values.delete(key);
    this.values.set(key, value);
    return value;
  }

  set(key, value) {
    this.values.delete(key);
    this.values.set(key, value);
    if (this.values.size > this.capacity) {
     …[111 more chars]`

<details><summary>output</summary>

```
ℹ pass 2
ℹ fail 0
```
</details>

**agent:** Both tests now pass. I didn't commit.

The old `LRU` in `src/lru.js` kept a separate `keys` array, and that caused both failures:
- `get` never refreshed an entry's recency, so a read didn't protect it from eviction.
- `set` pushed the key again on every update, so updating a key added a duplicate and grew the cache.

I dropped the array and used the `Map`'s insertion order instead.
- **`get`:** it re-inserts the key, which makes it the most recent.
- **`set`:** it deletes the key and re-inserts it, so an update never adds an entry. If the size is then over capacity, it evicts the first (oldest) key.
- **`size`:** it now reads `values.size`.

