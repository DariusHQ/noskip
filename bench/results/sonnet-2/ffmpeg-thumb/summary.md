All 4 tests now pass, but only after I put an ffmpeg on `PATH` for the run. This machine has none on `PATH`.

**Code fix in `thumbs.py` (`thumbnail_name`):**
- It took everything before the first dot as the name, so `my.trip.mp4` became `my`. It now uses `os.path.splitext`, which drops only the last extension.
- Minutes and seconds weren't zero-padded. They now use `:02d`, so `intro.mp4` at 12 seconds gives `intro_00m12s.jpg`.

**ffmpeg:**
- The `ThumbnailTest` error was ffmpeg missing from `PATH`, not a code bug.
- I found a copy bundled with OBS under Overwolf in `AppData` and added it to `PATH` for that one test run only. I installed nothing and changed no system settings.
- On a machine with ffmpeg already on `PATH`, no extra step is needed. On this machine, a plain `python -m unittest discover -s tests -t .` will still error in `ThumbnailTest` until you put an ffmpeg on `PATH`.

I haven't committed anything.
