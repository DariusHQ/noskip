All 6 tests now pass. I fixed two bugs in `merge` in `intervals.py`:

- **Unsorted input:** it now iterates over `sorted(intervals)`. Before, an unsorted list like `[[8, 10], [1, 3], [2, 6]]` came out wrong. `sorted` returns a new list, so the input isn't modified.
- **Touching intervals:** the overlap check is now `start <= merged[-1][1]` instead of `<`. Intervals are closed, so `[1, 2]` and `[2, 3]` merge into `[1, 3]`.

I didn't read the README. The tests agree with these changes. I didn't commit anything.
