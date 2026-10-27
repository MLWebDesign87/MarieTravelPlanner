#!/usr/bin/env bash
# ==========================================================================
# Marie Dream Planner — Régénération de l'animation du hero
# --------------------------------------------------------------------------
# Animation originale (video.py) rendue par Chromium (Playwright), puis encodée
# pour le web (MP4 H.264 + WebM VP9) avec son image d'attente.
# Les photos des formules ne sont pas concernées (photos Pexels retouchées).
# Prérequis : python3, pip install playwright pillow && playwright install chromium, ffmpeg.
# Durée : environ 1 minute.
# ==========================================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
readonly mediaDir="../../assets/media"

echo "› Animation du hero (288 images)…"
python3 video.py
python3 poster.py

echo "› Encodage vidéo…"
ffmpeg -loglevel error -y -framerate 24 -i build/frames/f%04d.png \
  -c:v libx264 -preset slow -crf 23 -profile:v high -pix_fmt yuv420p -movflags +faststart "${mediaDir}/hero.mp4"
ffmpeg -loglevel error -y -framerate 24 -i build/frames/f%04d.png \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p "${mediaDir}/hero.webm"

echo "› Export de l'image d'attente…"
python3 export.py

echo "✓ Animation régénérée dans assets/media/."
