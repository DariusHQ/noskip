Both tests now pass. I changed only `src/lru.js` and did not commit.

There were two bugs:
- **`get`:** it never marked an entry as recently used, so the wrong entry was evicted.
- **`set`:** it pushed the key onto the order list even when the key already existed. Updating a key therefore grew the cache and left duplicate keys.

I dropped the separate `keys` array. The `Map` already iterates in insertion order, so the first key is always the least recently used.
- `get` re-inserts the key to make it most recent.
- `set` deletes any existing entry before inserting, then evicts the first key if the cache is over capacity.
- `size` now reads from the `Map`.

Nothing else in the repo used `keys`.
