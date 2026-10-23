#!/usr/bin/env bash
# ==========================================================================
# Marie Dream Planner — Régénération des visuels originaux
# --------------------------------------------------------------------------
# Illustrations des formules (illus.py) et animation du hero (video.py),
# rendues par Chromium (Playwright) puis encodées pour le web.
# Prérequis : python3, pip install playwright pillow && playwright install chromium, ffmpeg.
# Durée : environ 1 à 2 minutes.
# ==========================================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
readonly mediaDir="../../assets/media"

echo "› Illustrations des formules…"
python3 illus.py
python3 render.py weekend escapade evasion

echo "› Animation du hero (288 images)…"
python3 video.py
python3 poster.py

echo "› Encodage vidéo…"
ffmpeg -loglevel error -y -framerate 24 -i build/frames/f%04d.png \
  -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -movflags +faststart "${mediaDir}/hero.mp4"
ffmpeg -loglevel error -y -framerate 24 -i build/frames/f%04d.png \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p "${mediaDir}/hero.webm"

echo "› Export des images…"
python3 export.py

echo "✓ Visuels régénérés dans assets/media/."
