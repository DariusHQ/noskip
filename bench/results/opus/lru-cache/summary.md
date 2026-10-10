Both tests pass now. The fix is all in `src/lru.js`, which had two bugs:

1. **Reading a key didn't count as using it.** `get()` returned the value without changing the eviction order, so the cache removed whichever key was added first rather than the one used least recently.
2. **Updating a key added a second copy of it.** `set()` always added the key to the `keys` array, even if it was already there. That made `size` wrong and could evict entries too early. In the second test, `b` was removed right after being set.

I replaced the separate array with a single `Map`, which keeps keys in insertion order. `get()` and `set()` now remove the key and add it back, which moves it to the end as the most recently used. When the cache is over capacity, it evicts the first key in the `Map`. This matches what the README describes, and each operation is O(1). The old `keys.shift()` call was O(n).

I didn't commit anything.
