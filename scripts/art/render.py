"""Rend les SVG en PNG 2560×1920 (suréchantillonnage) via Chromium."""
import os

# Dossier de travail des rendus intermédiaires (non déployé)
artDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
os.makedirs(artDir, exist_ok=True)

import asyncio, sys
from playwright.async_api import async_playwright
async def main(names):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 960}, device_scale_factor=2)
        for name in names:
            svg = open(f'{artDir}/{name}.svg', encoding='utf-8').read()
            await pg.set_content(f'<html><body style="margin:0">{svg}</body></html>')
            await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'{artDir}/{name}.png', clip={'x': 0, 'y': 0, 'width': 1280, 'height': 960})
            print('png', name)
        await b.close()
asyncio.run(main(sys.argv[1:]))
