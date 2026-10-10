All 7 tests now pass with `python -m unittest discover -s tests -t .`. The only change is in `wordwrap.py`, and nothing is committed.

The three failures came from `wrap` not following the spec in `README.md`:

- **Whitespace:** it split only on single spaces. It now uses `text.split()`, so any run of spaces, tabs or newlines counts as a separator.
- **Fit check:** it didn't count the joining space when testing whether a word fits. It now requires `len(line) + 1 + len(word) <= width` before appending.
- **Long words:** it never cut words longer than `width`. A long word now flushes the current line, is emitted in exact `width`-character pieces, and its shorter remainder is handled like a normal word.

I didn't install anything.
