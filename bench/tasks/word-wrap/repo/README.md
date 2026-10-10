# wordwrap

`wrap(text, width)` breaks `text` into lines of at most `width` characters and returns them as a list.

- Words are separated by any run of whitespace (spaces, tabs, newlines); words in a line are joined
  by a single space.
- Lines are filled greedily: a word goes on the current line if it fits, otherwise it starts a new
  line.
- A word longer than `width` is cut into pieces of exactly `width` characters; the last, shorter
  piece is then treated like a normal word.
- Empty or whitespace-only text gives `[]`. A `width` below 1 raises `ValueError`.

Run the tests with:

    python -m unittest discover -s tests -t .
