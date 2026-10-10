The test suite now passes (7 tests, all OK).

The fix is in `wordwrap.py`, and I rewrote `wrap` to follow the spec in `README.md`. The old code had three problems:

- **Whitespace:** it split on single spaces only. It now uses `text.split()`, so any run of spaces, tabs, or newlines counts as one separator.
- **Width check:** it didn't count the joining space when deciding whether a word fit. It now checks `len(line) + 1 + len(word) <= width`.
- **Long words:** it never cut them. A word longer than `width` is now split into full-width pieces, each on its own line, and only the shorter remainder is treated as a normal word.

I made no other changes and did not commit. Nothing was installed.
