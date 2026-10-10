import os
import subprocess
import tempfile
import unittest

from thumbs import make_thumbnail, thumbnail_name


class NameTest(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(thumbnail_name("intro.mp4", 12), "intro_00m12s.jpg")

    def test_dots_in_name(self):
        self.assertEqual(thumbnail_name("videos/my.trip.mp4", 75), "my.trip_01m15s.jpg")

    def test_long_video(self):
        self.assertEqual(thumbnail_name("/srv/media/lecture.mkv", 3599), "lecture_59m59s.jpg")


class ThumbnailTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.video = os.path.join(cls.tmp.name, "sample.mp4")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=10", cls.video],
            check=True,
        )

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_extracts_a_jpeg(self):
        path = make_thumbnail(self.video, 1, self.tmp.name)
        self.assertEqual(os.path.basename(path), "sample_00m01s.jpg")
        with open(path, "rb") as image:
            self.assertEqual(image.read(2), b"\xff\xd8")


if __name__ == "__main__":
    unittest.main()
