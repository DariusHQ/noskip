All 6 tests now pass. I made the change in `intervals.py` and did not commit.

The `merge` function had two bugs, both against the behaviour the README describes:

- **No sorting:** it processed intervals in input order, so `[[8, 10], [1, 3], [2, 6]]` never merged. I now iterate over `sorted(intervals)`. This also means the output is sorted by start, as the README promises. `sorted` builds a new list, so the caller's list is still not modified.
- **Touching intervals not merged:** the overlap check was `start < merged[-1][1]`, so `[1, 2]` and `[2, 3]` stayed apart. I changed it to `<=`, because the README says intervals sharing a point are merged.
