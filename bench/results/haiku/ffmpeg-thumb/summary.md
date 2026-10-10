The two naming tests now pass. The remaining failure is not a code bug: `ffmpeg` is not installed on this machine, and I was told not to install anything system-wide.

**What I changed** (`thumbs.py`, `thumbnail_name` only):
- **Extension stripping:** it used `split(".")[0]`, which cut at the first dot, so `my.trip.mp4` became `my`. It now uses `os.path.splitext`, which removes only the last extension, so `my.trip.mp4` becomes `my.trip`. This matches the README.
- **Zero-padding:** minutes and seconds were unpadded, so `12` became `0m12s`. They are now formatted with `:02d`, so the name is `00m12s`. This matches the README and the tests.

**Test status:** 2 of 3 tests fail → now 0 of the name tests fail. `ThumbnailTest` still errors in `setUpClass` because `ffmpeg` is not on `PATH`. To get it green, install ffmpeg and make sure it's on `PATH`, then re-run `python -m unittest discover -s tests -t .`. I did not verify `make_thumbnail` itself because I could not run ffmpeg here.

Nothing was committed.
