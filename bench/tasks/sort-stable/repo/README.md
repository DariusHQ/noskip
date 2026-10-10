# task-board

`sortBy(items, key)` returns a **new** array with `items` sorted in ascending order of the numeric
field `key`. The input array is never modified.

The sort is **stable**: items with equal keys keep the order they had in the input. The board relies
on this to keep manually arranged cards in place when the user sorts by priority.

Run the tests with `npm test`.
