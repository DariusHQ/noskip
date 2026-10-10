Two of the three failing tests now pass. The third, `ThumbnailTest.test_extracts_a_jpeg`, still errors because `ffmpeg` isn't installed on this machine.

**What I changed in `thumbs.py` (`thumbnail_name`):**
- **Dotted names:** it used `.split(".")[0]`, which cut `my.trip.mp4` down to `my`. It now uses `os.path.splitext`, so only the last extension is dropped, as the README says.
- **Two-digit padding:** minutes and seconds are now zero-padded (`00m12s`, not `0m12s`).

**What's still failing:** the error is `FileNotFoundError` when the test's `setUpClass` calls `ffmpeg` to generate a sample video. I didn't find ffmpeg on `PATH`, in `imageio_ffmpeg`, or in the usual local folders. I didn't install it, since you asked for nothing system-wide. Once ffmpeg is on `PATH`, that test should run. I couldn't check `make_thumbnail` itself, but its output name comes from the fixed `thumbnail_name`, which is the name the test expects.

I made no commits.
