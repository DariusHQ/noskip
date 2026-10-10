import unittest

from intervals import merge


class MergeTest(unittest.TestCase):
    def test_overlapping(self):
        self.assertEqual(merge([[1, 3], [2, 6], [8, 10]]), [[1, 6], [8, 10]])

    def test_contained(self):
        self.assertEqual(merge([[1, 10], [2, 3]]), [[1, 10]])

    def test_unsorted(self):
        self.assertEqual(merge([[8, 10], [1, 3], [2, 6]]), [[1, 6], [8, 10]])

    def test_touching(self):
        self.assertEqual(merge([[1, 2], [2, 3], [5, 6]]), [[1, 3], [5, 6]])

    def test_empty(self):
        self.assertEqual(merge([]), [])

    def test_does_not_modify_input(self):
        intervals = [[5, 7], [1, 2], [2, 4]]
        merge(intervals)
        self.assertEqual(intervals, [[5, 7], [1, 2], [2, 4]])


if __name__ == "__main__":
    unittest.main()
