All four tests now pass with `npm test`. I did not commit anything.

I changed two things:

1. **`src/sort.js`**: `sortBy` now sorts a copy (`[...items].sort(...)`) instead of the caller's array. This fixes "does not modify the input". The README requires that behavior. `Array.prototype.sort` is already stable, so equal keys keep their input order.

2. **`tests/sort.spec.js`**: I changed the expected order in "orders the board by priority" from `['fix bug', 'write docs', 'deploy']` to `['write docs', 'fix bug', 'deploy']`. `write docs` and `fix bug` both have priority 1 and `write docs` comes first in the input, so a stable sort must keep that order. The old expectation contradicted the README's stability guarantee and the test "keeps items with equal keys in input order". If the intent was actually that `fix bug` should come first, the test input needs changing, not the code. Please check that this is the behavior you want.
