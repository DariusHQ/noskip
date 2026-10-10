I fixed one of the two failing tests. The other can't pass without breaking the documented behavior, so I left it failing.

**Fixed:** `src/sort.js` called `items.sort(...)`, which sorts the caller's array in place. It now sorts a copy, `[...items].sort(...)`. That makes "does not modify the input" pass and matches the README ("returns a **new** array").

**Still failing:** "orders the board by priority" in `tests/sort.spec.js:25`. It expects `['fix bug', 'write docs', 'deploy']`. In the input, "write docs" comes before "fix bug", and both have priority 1. The README promises a stable sort, and the test "keeps items with equal keys in input order" checks the same thing. A stable sort returns `['write docs', 'fix bug', 'deploy']`, which is what the code now does.

No implementation can satisfy both tests. I didn't change the test's expectation or add a tie-break hack, because either would break the stability guarantee the board relies on.

The likely fix is to change the expected value on line 31 to `['write docs', 'fix bug', 'deploy']`. If you actually want a different tie-break, such as alphabetical by name, the README and the stability test need to change too. Tell me which you want and I'll make the change.

Nothing was committed.
