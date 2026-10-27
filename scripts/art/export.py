"""
Convertit l'image d'attente rendue dans build/ vers assets/media/ (640/960/1280 px
en WebP + JPEG 960). La vidéo est encodée par build-art.sh avec ffmpeg.
Les photos des formules ne sont PAS générées ici : ce sont des photos Pexels
retouchées, déposées directement dans assets/media/.
"""
import os
from PIL import Image

artDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
mediaDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "media")

poster = Image.open(f"{artDir}/poster-1280.png").convert("RGB")
for width in (640, 960, 1280):
    poster.resize((width, width), Image.LANCZOS).save(f"{mediaDir}/hero-poster-{width}.webp", quality=80, method=6)
poster.resize((960, 960), Image.LANCZOS).save(f"{mediaDir}/hero-poster-960.jpg", quality=82, optimize=True, progressive=True)
print("Image d'attente exportée dans assets/media/.")
