# Claude Code · Sonnet · word-wrap

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -40; git ls-files`

<details><summary>output</summary>

```
Second list contains 1 additional elements.
First extra element 1:
'bbbb'

- ['aaaa bbbb']
?       ^

+ ['aaaa', 'bbbb']
?       ^^^^


======================================================================
FAIL: test_long_word (tests.test_wordwrap.WrapTest.test_long_word)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\s\word-wrap\tests\test_wordwrap.py", line 24, in test_long_word
    self.assertEqual(wrap("supercalifragilistic is long", 8), ["supercal", "ifragili", "stic is", "long"])
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Lists differ: ['', 'supercalifragilistic', 'is long'] != ['supercal', 'ifragili', 'stic is', 'long']

First differing element 0:
''
'supercal'

Second list contains 1 additional elements.
First extra element 3:
'long'

- ['', 'supercalifragilistic', 'is long']
?  ----                         ---

+ ['supercal', 'ifragili', 'stic is', 'long']
?           ++++        ++++    +++


----------------------------------------------------------------------
Ran 7 tests in 0.001s

FAILED (failures=3)
.gitignore
README.md
tests/__init__.py
tests/test_wordwrap.py
wordwrap.py
```
</details>

**Bash** `cat wordwrap.py tests/test_wordwrap.py README.md`

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


if __name__ == "__main__":
   …[653 more chars]
```
</details>

**Bash** `cat > wordwrap.py <<'EOF'
def wrap(text, width):
    """Wrap text into lines of at most `width` characters. See README.md."""
    if width < 1:
        raise ValueError("width must be at least 1")
    lines = []
    line = ""
    for word in text.split():
        while len(word) > width:
            if line:
                lines.append(line)
                line = ""
            lines.append(word[:width])
            word = word[width:]
        if not line:
            line = word
        elif  …[258 more chars]`

<details><summary>output</summary>

```
.......
----------------------------------------------------------------------
Ran 7 tests in 0.000s

OK
```
</details>

**agent:** All 7 tests now pass. I changed only `wordwrap.py`, and nothing is committed.

There were three bugs, and the new `wrap` fixes each one:
- **Whitespace:** `text.split(" ")` only split on single spaces, so tabs, newlines and repeated spaces produced empty words. It now uses `text.split()`.
- **Line width:** the fit check ignored the joining space, so `"aaaa bbbb"` landed on one line at width 8. It now counts the space.
- **Long words:** words longer than `width` were never cut. They are now split into `width`-sized pieces. The last, shorter piece is treated as a normal word and can share a line with the next word, as the README describes.

