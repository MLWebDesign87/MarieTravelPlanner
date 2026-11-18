#!/usr/bin/env bash
# ==========================================================================
# Marie Dream Planner — regenerates the hero animation
# --------------------------------------------------------------------------
# Original animation (video.py) rendered with Chromium (Playwright), then
# encoded for the web (MP4 H.264 + WebM VP9) along with its poster image.
# The formula photos are not affected (retouched Pexels photos).
#
# Requirements: python3, `pip install playwright pillow`,
#               `playwright install chromium`, ffmpeg.
# Duration: about 1 minute.
# ==========================================================================

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
readonly MEDIA_DIR="../../public/assets/media"
readonly FRAMES_PATTERN="build/frames/f%04d.png"
readonly FPS=24

echo "› Rendering the hero animation (288 frames)…"
python3 video.py
python3 poster.py

echo "› Encoding the video…"
ffmpeg -loglevel error -y -framerate "${FPS}" -i "${FRAMES_PATTERN}" \
  -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  "${MEDIA_DIR}/hero.mp4"
ffmpeg -loglevel error -y -framerate "${FPS}" -i "${FRAMES_PATTERN}" \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p \
  "${MEDIA_DIR}/hero.webm"

echo "› Exporting the poster image…"
python3 export.py

echo "✓ Animation regenerated in public/assets/media/."
