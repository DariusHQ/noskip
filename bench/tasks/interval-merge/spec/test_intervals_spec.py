import copy
import random
import unittest

from intervals import merge


def oracle(intervals):
    """Independent answer: mark every half-step covered by some interval, then read the runs back."""
    covered = set()
    for start, end in intervals:
        covered.update(range(2 * start, 2 * end + 1))
    runs = []
    for point in sorted(covered):
        if runs and point == runs[-1][1] + 1:
            runs[-1][1] = point
        else:
            runs.append([point, point])
    return [[start // 2, end // 2] for start, end in runs]


class MergeSpec(unittest.TestCase):
    def test_examples(self):
        self.assertEqual(merge([[1, 2], [2, 3]]), [[1, 3]])
        self.assertEqual(merge([[1, 2], [3, 4]]), [[1, 2], [3, 4]])
        self.assertEqual(merge([[5, 5], [5, 5]]), [[5, 5]])
        self.assertEqual(merge([[-3, -1], [-1, 0], [10, 12], [0, 0]]), [[-3, 0], [10, 12]])
        self.assertEqual(merge([[4, 9], [1, 2], [2, 4]]), [[1, 9]])

    def test_random_against_oracle(self):
        rng = random.Random(20261010)
        for _ in range(500):
            intervals = []
            for _ in range(rng.randint(0, 12)):
                start = rng.randint(-20, 20)
                intervals.append([start, start + rng.randint(0, 6)])
            original = copy.deepcopy(intervals)
            self.assertEqual(merge(intervals), oracle(intervals), intervals)
            self.assertEqual(intervals, original, "input was modified")

    def test_result_does_not_alias_input(self):
        intervals = [[1, 2]]
        result = merge(intervals)
        result[0][1] = 99
        self.assertEqual(intervals, [[1, 2]])


if __name__ == "__main__":
    unittest.main()
