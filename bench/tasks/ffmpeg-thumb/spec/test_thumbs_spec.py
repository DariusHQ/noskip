import unittest

from thumbs import thumbnail_name


class NameSpec(unittest.TestCase):
    def test_names(self):
        cases = [
            ("intro.mp4", 12, "intro_00m12s.jpg"),
            ("videos/my.trip.mp4", 75, "my.trip_01m15s.jpg"),
            ("/srv/media/lecture.mkv", 3599, "lecture_59m59s.jpg"),
            ("clip.final.v2.webm", 0, "clip.final.v2_00m00s.jpg"),
            ("a/b/c.mov", 600, "c_10m00s.jpg"),
            ("x.mp4", 61, "x_01m01s.jpg"),
        ]
        for path, second, expected in cases:
            self.assertEqual(thumbnail_name(path, second), expected, (path, second))


if __name__ == "__main__":
    unittest.main()
