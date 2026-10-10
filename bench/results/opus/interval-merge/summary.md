I fixed two bugs in `merge` in `intervals.py`, and all 6 tests now pass.

1. **Unsorted input:** the function never sorted its input, so `test_unsorted` failed. It now loops over `sorted(intervals)`. That builds a new list, so the caller's list is left alone, and every result interval is a fresh `[start, end]`, so the original intervals are never changed either. This matches the README's promise that the input isn't modified.
2. **Touching intervals:** the overlap check used `start < merged[-1][1]`, so intervals that only share an endpoint, like `[1, 2]` and `[2, 3]`, weren't merged. The README says they should be, so I changed the check to `<=`.

I didn't change the tests or anything else, and I didn't commit.
