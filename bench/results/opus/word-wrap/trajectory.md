# Claude Code · Opus · word-wrap

**Bash** `git ls-files && python -m unittest discover -s tests -t . 2>&1 | tail -50`

<details><summary>output</summary>

```
.gitignore
README.md
tests/__init__.py
tests/test_wordwrap.py
wordwrap.py
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\o\word-wrap\tests\test_wordwrap.py", line 18, in test_exact_width
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
FAIL: test_long_word (tests.test_wordwrap.WrapTest.test_long_word)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\x\dev\o\word-wrap\tests\test_wordwrap.py", line 24, in test_long_word
    self.assertEqual(wrap("supercalifragilistic is long", 8), ["supercal", "ifragili", "stic is", "long"])
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: Lists differ: ['', 'supercalifragilistic', 'is long'] != ['supercal', 'ifragili', 'stic is', 'long']

First differing element 0:
''
'supercal'

Second list contains 1 additional elements.
First extra element 3:
'long'

- ['', 'supercalifragilistic', 'is long'] …[244 more chars]
```
</details>

**Bash** `cat wordwrap.py tests/test_wordwrap.py README.md; python -m unittest discover -s tests -t . 2>&1 | head -30`

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
   …[1893 more chars]
```
</details>

**Write** C:\Users\x\dev\o\word-wrap\wordwrap.py
```
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
        elif len(line) + 1 + len(word) <= width:
            line = f"{line} {word}"
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines

```

**Bash** `python -m unittest discover -s tests -t . 2>&1 | tail -3`

<details><summary>output</summary>

```
The file C:\Users\x\dev\o\word-wrap\wordwrap.py has been updated successfully. (file state is current in your context — no need to Read it back)
```
</details>

<details><summary>output</summary>

```
Ran 7 tests in 0.000s

OK
```
</details>

**agent:** All 7 tests pass now. I changed only `wordwrap.py`; the tests were already right and match what README.md describes. Nothing is committed.

There were three bugs in `wrap`:

1. **Whitespace:** it split only on single spaces, so tabs, newlines and repeated spaces ended up inside words. It now uses `text.split()`, which splits on any run of whitespace. That also makes whitespace-only input return `[]`.
2. **Off by one:** the length check left out the space between words, so `"aaaa bbbb"` (9 characters) fit on a line of width 8. The check now counts that space.
3. **Long words:** a word longer than `width` was left whole, and an empty string was added as the first line. Such words are now cut into pieces exactly `width` long, and the last, shorter piece is placed like a normal word, as the README says.

