import os
import subprocess


def thumbnail_name(video_path, second):
    """See README.md."""
    stem = os.path.basename(video_path).split(".")[0]
    return f"{stem}_{second // 60}m{second % 60}s.jpg"


def make_thumbnail(video_path, second, out_dir):
    out_path = os.path.join(out_dir, thumbnail_name(video_path, second))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(second), "-i", video_path, "-frames:v", "1", out_path],
        check=True,
    )
    return out_path
