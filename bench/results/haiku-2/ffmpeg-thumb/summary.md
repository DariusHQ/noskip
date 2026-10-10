The name tests now pass. The only remaining failure is `ThumbnailTest`, which needs `ffmpeg` on the `PATH`. It isn't installed here, and I wasn't allowed to install it system-wide, so I left that test alone rather than mocking `ffmpeg` out of it.

**What I changed (in `thumbs.py`, `thumbnail_name` only):**
- **Extension stripping:** it split on the first dot, so `my.trip.mp4` became `my`. It now uses `os.path.splitext`, which removes only the last extension, giving `my.trip`.
- **Zero-padding:** minutes and seconds were unpadded, so `12` gave `0m12s`. They're now formatted with `divmod` and `:02d`, giving `00m12s`, as the README specifies.

**Test status:** 2 of the 3 failures are fixed (`test_simple`, `test_dots_in_name`). `test_long_video` already passed. `ThumbnailTest` still errors because `ffmpeg` isn't installed. Installing it, or putting an `ffmpeg` binary on the `PATH` for this session, would let that test run. I haven't committed anything.
