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
    unittest.main()
