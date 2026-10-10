# Claude Code · Haiku · word-wrap

**Bash** `cd C:/Users/x/dev/h/word-wrap && python -m unittest discover -s tests -t . 2>&1 | tail -80; git status --short; ls -la`

<details><summary>output</summary>

```
F.F..F.
======================================================================
FAIL: test_collapses_whitespace (tests.test_wordwrap.WrapTest.test_collapses_whitespace)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\h\word-wrap\tests\test_wordwrap.py", line 21, in test_collapses_whitespace
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
  File "C:\Users\x\dev\h\word-wrap\tests\test_wordwrap.py", line 18, in test_exact_width
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
FAIL: test_long_word (tests.test_wordw …[1305 more chars]
```
</details>

**Bash** `cd C:/Users/x/dev/h/word-wrap && cat wordwrap.py; echo ----; cat tests/test_wordwrap.py; echo ----; cat README.md; echo ----; cat .gitignore`

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


if __name__ == "__main__ …[681 more chars]
```
</details>

**agent:** The README spec is clear, and the current code breaks it in three ways: it splits on a single space instead of any whitespace, it doesn't count the joining space when checking fit, and it never cuts words longer than `width`. I'll rewrite `wrap` to follow the spec.

**Edit** C:\Users\x\dev\h\word-wrap\wordwrap.py
```diff
-     lines = []
-     line = ""
-     for word in text.split(" "):
-         if len(line) + len(word) <= width:
-             line = f"{line} {word}" if line else word
-         else:
-             lines.append(line)
-             line = word
-     if line:
-         lines.append(line)
-     return lines
+     lines = []
+     line = ""
+     for word in text.split():
+         if len(word) > width:
+             # Flush the current line, then cut the long word into full-width pieces.
+             if line:
+                 lines.append(line)
+                 line = ""
+             while len(word) > width:
+                 lines.append(word[:width])
+                 word = word[width:]
+         if not line:
+             line = word
+         elif len(line) + 1 + len(word) <= width:
+             line = f"{line} {word}"
+         else:
+             lines.append(line)
+             line = word
+     if line:
+         lines.append(line)
+     return lines
```

**Bash** `cd C:/Users/x/dev/h/word-wrap && python -m unittest discover -s tests -t . 2>&1 | tail -5; git status --short`

<details><summary>output</summary>

```
The file C:\Users\x\dev\h\word-wrap\wordwrap.py has been updated successfully.
```
</details>

<details><summary>output</summary>

```
.......
----------------------------------------------------------------------
Ran 7 tests in 0.000s

OK
 M wordwrap.py
```
</details>

**agent:** All 7 tests now pass with `python -m unittest discover -s tests -t .`. The only change is in `wordwrap.py`, and nothing is committed.

The three failures came from `wrap` not following the spec in `README.md`:

- **Whitespace:** it split only on single spaces. It now uses `text.split()`, so any run of spaces, tabs or newlines counts as a separator.
- **Fit check:** it didn't count the joining space when testing whether a word fits. It now requires `len(line) + 1 + len(word) <= width` before appending.
- **Long words:** it never cut words longer than `width`. A long word now flushes the current line, is emitted in exact `width`-character pieces, and its shorter remainder is handled like a normal word.

I didn't install anything.

