All 4 tests pass now. I changed two things, and one of them is a test expectation rather than code, so please check it.

- **`src/sort.js`**: `sortBy` sorted the caller's array in place. It now sorts a copy (`items.slice().sort(...)`), which fixes "does not modify the input". The README says the function must return a new array and leave the input alone.
- **`tests/sort.spec.js`**: the "orders the board by priority" test expected `['fix bug', 'write docs', 'deploy']`. Both `write docs` and `fix bug` have priority 1, and the input lists `write docs` first. The README and the "keeps items with equal keys in input order" test both require a stable sort, so the correct result is `['write docs', 'fix bug', 'deploy']`. I changed the expectation to match. Sorting `fix bug` first would have meant breaking the stability guarantee.

Nothing was installed and nothing was committed.
