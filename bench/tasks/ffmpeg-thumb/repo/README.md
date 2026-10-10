# thumbs

Video thumbnails for the media library. Requires [ffmpeg](https://ffmpeg.org/) on the `PATH`.

- `thumbnail_name(video_path, second)` returns the thumbnail file name: the video's file name without
  its last extension, an underscore, then the time as two-digit minutes and seconds, then `.jpg`.
  `thumbnail_name("videos/my.trip.mp4", 75)` is `"my.trip_01m15s.jpg"`.
- `make_thumbnail(video_path, second, out_dir)` extracts the frame at `second` with ffmpeg, writes it
  to `out_dir` under that name and returns the path.

Run the tests with:

    python -m unittest discover -s tests -t .
