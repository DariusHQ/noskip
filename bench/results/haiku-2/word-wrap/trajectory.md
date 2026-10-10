# Claude Code · Haiku (run 2) · word-wrap

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -80; git status --short; ls -R | head -50`

<details><summary>output</summary>

```
F.F..F.
======================================================================
FAIL: test_collapses_whitespace (tests.test_wordwrap.WrapTest.test_collapses_whitespace)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\h2\word-wrap\tests\test_wordwrap.py", line 21, in test_collapses_whitespace
    self.assertEqual(wrap("a   b\n c\td", 10), ["a b c d"])
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Lists differ: ['a   b\n c\td'] != ['a b c d']

First differing element 0:
'a   b\n c\td'
'a b c d'

- ['a   b\n c\td']
+ ['a b c d']

======================================================================
FAIL: test_exact_width (tests.test_wordwrap.WrapTest.test_exact_width)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\h2\word-wrap\tests\test_wordwrap.py", line 18, in test_exact_width
    self.assertEqual(wrap("aaaa bbbb", 8), ["aaaa", "bbbb"])
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Lists differ: ['aaaa bbbb'] != ['aaaa', 'bbbb']

First differing element 0:
'aaaa bbbb'
'aaaa'

Second list contains 1 additional elements.
First extra element 1:
'bbbb'

- ['aaaa bbbb']
?       ^

+ ['aaaa', 'bbbb']
?       ^^^^


======================================================================
FAIL: test_long_word (tests.test_wor …[1047 more chars]
```
</details>

**Bash** `cat wordwrap.py; echo ----; cat tests/test_wordwrap.py; echo ----; cat README.md`

<details><summary>output</summary>

```
def wrap(text, width):
    """Wrap text into lines of at most `width` characters. See README.md."""
    if width < 1:
        raise ValueError("width must be at least 1")
    lines = []
    line = ""
    for word in text.split(" "):
        if len(line) + len(word) <= width:
            line = f"{line} {word}" if line else word
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines
----
import unittest

from wordwrap import wrap


class WrapTest(unittest.TestCase):
    def test_short_text(self):
        self.assertEqual(wrap("hello world", 20), ["hello world"])

    def test_greedy(self):
        self.assertEqual(
            wrap("the quick brown fox jumps over the lazy dog", 10),
            ["the quick", "brown fox", "jumps over", "the lazy", "dog"],
        )

    def test_exact_width(self):
        self.assertEqual(wrap("aaaa bbbb", 9), ["aaaa bbbb"])
        self.assertEqual(wrap("aaaa bbbb", 8), ["aaaa", "bbbb"])

    def test_collapses_whitespace(self):
        self.assertEqual(wrap("a   b\n c\td", 10), ["a b c d"])

    def test_long_word(self):
        self.assertEqual(wrap("supercalifragilistic is long", 8), ["supercal", "ifragili", "stic is", "long"])

    def test_empty(self):
        self.assertEqual(wrap("", 5), [])
        self.assertEqual(wrap("   ", 5), [])

    def test_invalid_width(self):
        with self.assertRaises(ValueError):
            wrap("text", 0)


if __name__ == "__main__ …[663 more chars]
```
</details>

**agent:** The README spec is explicit, and the code departs from it in three ways: it splits on single spaces only, it packs words without checking that the separator fits, and it never cuts long words. I'll rewrite `wrap` to follow the spec.

**Edit** C:\Users\x\dev\h2\word-wrap\wordwrap.py
```diff
-     for word in text.split(" "):
-         if len(line) + len(word) <= width:
-             line = f"{line} {word}" if line else word
-         else:
-             lines.append(line)
-             line = word
+     for word in text.split():
+         # A word longer than the width is cut into full-width pieces; each
+         # piece gets its own line, and only the shorter remainder is kept.
+         while len(word) > width:
+             if line:
+                 lines.append(line)
+                 line = ""
+             lines.append(word[:width])
+             word = word[width:]
+         if not line:
+             line = word
+         elif len(line) + 1 + len(word) <= width:
+             line = f"{line} {word}"
+         else:
+             lines.append(line)
+             line = word
```

<details><summary>output</summary>

```
The file C:\Users\x\dev\h2\word-wrap\wordwrap.py has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -5`

<details><summary>output</summary>

```
.......
----------------------------------------------------------------------
Ran 7 tests in 0.000s

OK
```
</details>

**agent:** The test suite now passes (7 tests, all OK).

The fix is in `wordwrap.py`, and I rewrote `wrap` to follow the spec in `README.md`. The old code had three problems:

- **Whitespace:** it split on single spaces only. It now uses `text.split()`, so any run of spaces, tabs, or newlines counts as one separator.
- **Width check:** it didn't count the joining space when deciding whether a word fit. It now checks `len(line) + 1 + len(word) <= width`.
- **Long words:** it never cut them. A word longer than `width` is now split into full-width pieces, each on its own line, and only the shorter remainder is treated as a normal word.

I made no other changes and did not commit. Nothing was installed.

