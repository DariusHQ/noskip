Both tests now pass (`npm test`: 2 pass, 0 fail). The only change is to `src/lru.js`.

The cache had two bugs:
- **`get` didn't refresh recency.** Reading a key left it at its old position, so the wrong entry was evicted.
- **`set` on an existing key added it to the eviction list again.** The duplicate key made the size count wrong and could evict a live entry.

I rewrote the class to store everything in one `Map`. A `Map` keeps insertion order, so `get` and `set` delete and re-insert the key to mark it most recent, and eviction removes the first key. The public API from the README is unchanged: `new LRU(capacity)`, `get`, `set`, and `size`. I renamed the internal `keys`/`values` pair to a single `entries` field. Nothing else referenced it.

Nothing was installed and nothing was committed.
