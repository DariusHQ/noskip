Both tests now pass. I didn't commit.

The old `LRU` in `src/lru.js` kept a separate `keys` array, and that caused both failures:
- `get` never refreshed an entry's recency, so a read didn't protect it from eviction.
- `set` pushed the key again on every update, so updating a key added a duplicate and grew the cache.

I dropped the array and used the `Map`'s insertion order instead.
- **`get`:** it re-inserts the key, which makes it the most recent.
- **`set`:** it deletes the key and re-inserts it, so an update never adds an entry. If the size is then over capacity, it evicts the first (oldest) key.
- **`size`:** it now reads `values.size`.
