All 4 tests pass now. I changed one line in the code and one in a test, and didn't commit anything.

1. **Fixed a bug in `src/sort.js`:** `sortBy` sorted the array it was given, which changed the caller's data. The README says the input is never modified. It now sorts a copy (`[...items].sort(...)`). JavaScript's built-in sort already keeps equal items in their original order, so this one change also fixed the "equal keys" test.

2. **Fixed a wrong test in `tests/sort.spec.js`:** "orders the board by priority" contradicted the README and the "keeps items with equal keys in input order" test. In its input, `write docs` came before `fix bug`, and both have priority 1. Yet it expected `fix bug` first. A sort that keeps equal items in order can't produce that, so no version of `sortBy` could pass both tests. I swapped the two items in the test's input so it agrees with the README, and left its expected order (`fix bug`, `write docs`, `deploy`) unchanged.

If `fix bug` really should come before `write docs`, the board needs a second sort rule (for example by name). That would mean changing the README's promise that tied items stay in order, which is a design choice for you rather than something I'd change silently.
