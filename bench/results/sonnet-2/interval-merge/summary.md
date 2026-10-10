The tests pass now (6 of 6). The fix was two small changes to `merge` in `intervals.py`:

- **Sorting:** it now iterates over `sorted(intervals)`. Before, unsorted input like `[[8,10],[1,3],[2,6]]` broke the merging.
- **Touching intervals:** the overlap check changed from `start < last_end` to `start <= last_end`. These are closed intervals, so `[1,2]` and `[2,3]` should merge into `[1,3]`.

I didn't commit anything.
