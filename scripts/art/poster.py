"""Rend l'image 0 de l'animation en 1280×1280 (image d'attente haute définition)."""
import os

# Dossier de travail des rendus intermédiaires (non déployé)
artDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
os.makedirs(artDir, exist_ok=True)

import asyncio, video
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 960, 'height': 960}, device_scale_factor=1280 / 960)
        await pg.set_content(f'<html><body style="margin:0">{video.frameSvg(0)}</body></html>')
        await pg.screenshot(path=f'{artDir}/poster-1280.png', clip={'x': 0, 'y': 0, 'width': 960, 'height': 960})
        await b.close()
asyncio.run(main())
