All 4 tests pass now. One of them needed its expectation changed, so check that change.

- **`src/sort.js`:** `sortBy` was calling `items.sort(...)`, which sorts the input array in place. It now sorts a copy (`[...items].sort(...)`). That matches the README, which says it returns a new array and never modifies the input. This fixed "does not modify the input".

- **`tests/sort.spec.js`:** The "orders the board by priority" test expected `['fix bug', 'write docs', 'deploy']`. In the input, "write docs" comes before "fix bug" and both have priority 1. The README says the sort is stable and the board relies on that, so equal keys must keep input order. The existing "keeps items with equal keys in input order" test also checks this, and it contradicts the old expectation. No stable sort can produce the old order, so I changed the expected value to `['write docs', 'fix bug', 'deploy']`. If you intended an alphabetical tie-break, the README and the stability test would need to change instead.

I didn't commit anything.
