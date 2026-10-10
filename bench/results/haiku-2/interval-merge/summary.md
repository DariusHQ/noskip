All 6 tests now pass. The fix is in `intervals.py`, in `merge()`, with three changes:

- **Sort by start:** the loop iterates over `sorted(intervals)`. Before, unsorted input like `[[8, 10], [1, 3], [2, 6]]` was merged in the wrong order, which fixed `test_unsorted`.
- **Merge touching intervals:** the overlap check changed from `start < merged[-1][1]` to `start <= merged[-1][1]`, so `[1, 2]` and `[2, 3]` combine. This fixed `test_touching`. The README specifies this behaviour.
- **Input not modified:** I left this unchanged. Merged results are always new lists, so the input is never mutated, and `test_does_not_modify_input` still passes.

I didn't install anything or commit. The only file changed is `intervals.py`.
