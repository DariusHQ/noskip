# intervals

`merge(intervals)` takes a list of closed intervals `[start, end]` (with `start <= end`) and returns a
new list in which overlapping intervals are merged, sorted by start. Intervals that touch, such as
`[1, 2]` and `[2, 3]`, share a point and are merged too. The input list and its intervals are never
modified.

Run the tests with:

    python -m unittest discover -s tests -t .
