import random
import string
import unittest

from wordwrap import wrap


def pieces(words, width):
    for word in words:
        while len(word) > width:
            yield word[:width]
            word = word[width:]
        yield word


class WrapSpec(unittest.TestCase):
    def test_examples(self):
        self.assertEqual(wrap("abcdefghij", 3), ["abc", "def", "ghi", "j"])
        self.assertEqual(wrap("abcdef", 3), ["abc", "def"])
        self.assertEqual(wrap("a abcdef b", 3), ["a", "abc", "def", "b"])
        self.assertEqual(wrap("ab abcd", 4), ["ab", "abcd"])
        self.assertEqual(wrap("x", 1), ["x"])
        self.assertEqual(wrap(" \n\t lone \n", 10), ["lone"])

    def test_random_properties(self):
        rng = random.Random(1010)
        for _ in range(400):
            width = rng.randint(1, 15)
            words = ["".join(rng.choices(string.ascii_lowercase, k=rng.randint(1, 20))) for _ in range(rng.randint(0, 12))]
            separators = [rng.choice([" ", "  ", "\n", "\t", " \n "]) for _ in words]
            text = "".join(sep + word for sep, word in zip(separators, words))
            lines = wrap(text, width)
            expected_pieces = list(pieces(words, width))
            self.assertEqual(" ".join(lines).split(" ") if lines else [], expected_pieces, (text, width))
            for line in lines:
                self.assertTrue(1 <= len(line) <= width, (text, width, lines))
                self.assertEqual(line, " ".join(line.split(" ")))
            for current, following in zip(lines, lines[1:]):
                first = following.split(" ")[0]
                self.assertGreater(len(current) + 1 + len(first), width, ("not greedy", text, width, lines))

    def test_invalid_width(self):
        for width in (0, -3):
            with self.assertRaises(ValueError):
                wrap("text", width)


if __name__ == "__main__":
    unittest.main()
