`npm test` now passes both tests (2 of 2). I changed only `src/lru.js`, and nothing is committed.

**What was wrong:**
- `get` never updated recency, so reading `a` didn't protect it from eviction.
- `set` on an existing key pushed a duplicate onto the `keys` array. That made `size` count the key twice and evicted the wrong entry.

**What I changed:** I replaced the `keys` array and the separate `Map` with a single `Map`. Its insertion order tracks recency: `get` and `set` delete and re-insert the key to mark it most recent, and eviction removes the first key in the map. `size` now returns the map's size. The public API (`new LRU(capacity)`, `get`, `set`, `size`) matches the README.

One behavior change: eviction now uses a `while` loop instead of a single `shift`, so it still holds if `capacity` is ever 0 or below.
