"""
Convertit les rendus de build/ vers assets/media/ :
illustrations en WebP 640/960/1280 + JPEG 960, image d'attente du hero aux mêmes tailles.
(La vidéo est encodée par build-art.sh avec ffmpeg.)
"""
import os
from PIL import Image

artDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
mediaDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "media")

for sceneName in ("weekend", "escapade", "evasion"):
    image = Image.open(f"{artDir}/{sceneName}.png").convert("RGB")
    for width in (640, 960, 1280):
        image.resize((width, width * 3 // 4), Image.LANCZOS).save(f"{mediaDir}/formula-{sceneName}-{width}.webp", quality=82, method=6)
    image.resize((960, 720), Image.LANCZOS).save(f"{mediaDir}/formula-{sceneName}-960.jpg", quality=82, optimize=True, progressive=True)

poster = Image.open(f"{artDir}/poster-1280.png").convert("RGB")
for width in (640, 960, 1280):
    poster.resize((width, width), Image.LANCZOS).save(f"{mediaDir}/hero-poster-{width}.webp", quality=80, method=6)
poster.resize((960, 960), Image.LANCZOS).save(f"{mediaDir}/hero-poster-960.jpg", quality=82, optimize=True, progressive=True)
print("Illustrations et image d'attente exportées dans assets/media/.")
