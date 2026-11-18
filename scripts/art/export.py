"""
Exports the poster rendered in build/ to public/assets/media/:
640, 960 and 1280 px WebP, plus a 960 px JPEG fallback.

The video itself is encoded by build-art.sh with ffmpeg. The formula photos
are NOT generated here: they are retouched Pexels photos stored directly in
public/assets/media/.
"""

import os

from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ART_BUILD_DIR = os.path.join(SCRIPT_DIR, "build")
MEDIA_DIR = os.path.join(SCRIPT_DIR, "..", "..", "public", "assets", "media")
POSTER_WIDTHS = (640, 960, 1280)
JPEG_FALLBACK_WIDTH = 960


def export_poster():
    """Writes the responsive WebP posters and the JPEG fallback."""
    poster = Image.open(os.path.join(ART_BUILD_DIR, "poster-1280.png")).convert("RGB")
    for width in POSTER_WIDTHS:
        poster.resize((width, width), Image.LANCZOS).save(
            os.path.join(MEDIA_DIR, f"hero-poster-{width}.webp"), quality=80, method=6
        )
    poster.resize((JPEG_FALLBACK_WIDTH, JPEG_FALLBACK_WIDTH), Image.LANCZOS).save(
        os.path.join(MEDIA_DIR, f"hero-poster-{JPEG_FALLBACK_WIDTH}.jpg"), quality=82, optimize=True, progressive=True
    )


if __name__ == "__main__":
    export_poster()
    print("Poster exported to public/assets/media/.")
