I fixed the two naming tests. All 4 tests pass when ffmpeg is available, but ffmpeg isn't installed on this machine, so your exact command will still error on the ffmpeg test until you install it.

**What I changed:** two bugs in `thumbnail_name` in `thumbs.py`. The README says the name should be the file name without its last extension, then the time as two-digit minutes and seconds.
- **Extension:** the code was cutting the name at the first dot, so `my.trip.mp4` became `my`. It now uses `os.path.splitext`, which removes only the last extension and gives `my.trip`.
- **Two-digit time:** minutes and seconds weren't padded, so you got `0m12s` instead of `00m12s`. Both are now formatted with `:02d`.

**ffmpeg:** the test that extracts a JPEG creates its sample video by running `ffmpeg` from the PATH. Since you said not to install anything system-wide, I checked it this way instead:
- I installed the `imageio-ffmpeg` package into a temporary virtual environment inside the repo.
- I put its ffmpeg binary on the PATH for that one run only.
- The whole suite passed: 4 tests, OK.
- I then deleted the temporary folders. `thumbs.py` is the only file changed.

Once ffmpeg is installed and on the PATH, `python -m unittest discover -s tests -t .` should pass as-is. Nothing is committed.
