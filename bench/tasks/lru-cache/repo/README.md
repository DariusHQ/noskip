# tiny-lru

`new LRU(capacity)` is a least-recently-used cache.

- `get(key)` returns the value (or `undefined`) and marks the key as most recently used.
- `set(key, value)` inserts or updates the key and marks it as most recently used.
- When there are more than `capacity` entries, the least recently used one is evicted.
- `size` is the number of entries.

Run the tests with `npm test`.
