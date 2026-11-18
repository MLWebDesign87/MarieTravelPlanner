"""Renders frame 0 of the hero animation at 1280×1280 (high-definition poster)."""

import asyncio
import os

from playwright.async_api import async_playwright
from video import ART_BUILD_DIR, FRAME_PIXELS, frame_svg

POSTER_PIXELS = 1280


async def render_poster():
    """Screenshots frame 0 at a device scale factor that yields POSTER_PIXELS."""
    os.makedirs(ART_BUILD_DIR, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page(
            viewport={"width": FRAME_PIXELS, "height": FRAME_PIXELS},
            device_scale_factor=POSTER_PIXELS / FRAME_PIXELS,
        )
        await page.set_content(f'<html><body style="margin:0">{frame_svg(0)}</body></html>')
        await page.screenshot(
            path=os.path.join(ART_BUILD_DIR, f"poster-{POSTER_PIXELS}.png"),
            clip={"x": 0, "y": 0, "width": FRAME_PIXELS, "height": FRAME_PIXELS},
        )
        await browser.close()


if __name__ == "__main__":
    asyncio.run(render_poster())
    print("Poster rendered.")
