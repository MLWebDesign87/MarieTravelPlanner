"""
Marie Dream Planner — hero animation (seamless loop)
====================================================

Square scene (the video plays inside the hero's sun disc): sunset over the
sea, waves, palm trees, birds and glittering reflections.

Every motion is periodic over LOOP_SECONDS, so the last frame matches the
first one exactly and the loop is invisible:
  - waves: shifted by a whole number of wavelengths per loop
  - clouds: slow back-and-forth drift
  - birds: one crossing per loop, wing beats at a whole frequency
  - fronds: oscillation with a period of LOOP_SECONDS / 3
  - glints: twinkling at whole frequencies

Usage: python3 video.py [first_frame] [last_frame]
Renders PNG frames into build/frames/ (all frames by default); build-art.sh
then encodes them with ffmpeg.
"""

import asyncio
import math
import os
import sys

from playwright.async_api import async_playwright

# Working folder for intermediate renders (never deployed)
ART_BUILD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")

SIZE = 1080  # SVG coordinate space
FRAME_PIXELS = 960  # rendered frame size
FPS = 24
LOOP_SECONDS = 12
FRAME_COUNT = FPS * LOOP_SECONDS
HORIZON_Y = 600
TAU = 2 * math.pi

# Palette (matches the site's design tokens)
NIGHT, NIGHT_SOFT, GARNET, WINE = "#2b0709", "#3d0b0e", "#7e1416", "#93201b"
EMBER, CORAL, SALMON, PEACH, GLOW = "#c8371f", "#f36f60", "#f79a82", "#fbb79f", "#fff1e6"


def periodic(t, cycles, phase=0.0):
    """Sine with a whole number of cycles per loop: periodic by construction."""
    return math.sin(TAU * (cycles * t / LOOP_SECONDS + phase))


def wave_path(base_y, amplitude, wavelength, shift, harmonic=0.35):
    """Sea band whose top edge undulates, shifted by `shift` pixels."""
    points = []
    for x in range(-20, SIZE + 21, 12):
        phase = TAU * (x + shift) / wavelength
        y = base_y + amplitude * (math.sin(phase) + harmonic * math.sin(2 * phase + 1.3))
        points.append(f"{x} {y:.1f}")
    return f"M{points[0]} L{' L'.join(points[1:])} L{SIZE + 20} {SIZE + 20} L-20 {SIZE + 20} Z"


def cloud(x, y, length, thickness, color, opacity):
    """Blade-like stretched cloud (rounded horizontal bars)."""
    radius = thickness / 2
    return (
        f'<g fill="{color}" opacity="{opacity}">'
        f'<rect x="{x:.1f}" y="{y:.1f}" width="{length:.1f}" height="{thickness:.1f}" rx="{radius:.1f}"/>'
        f'<rect x="{x + length * 0.18:.1f}" y="{y - thickness * 0.8:.1f}" width="{length * 0.5:.1f}" '
        f'height="{thickness:.1f}" rx="{radius:.1f}"/>'
        f'<rect x="{x + length * 0.42:.1f}" y="{y + thickness * 0.9:.1f}" width="{length * 0.45:.1f}" '
        f'height="{thickness * 0.8:.1f}" rx="{radius:.1f}"/>'
        f"</g>"
    )


def bird(x, y, scale, flap):
    """Stylised seagull; `flap` in [-1, 1] drives the wing beat."""
    wing_y = -10 * scale * (0.4 + 0.6 * flap)
    return (
        f'<path d="M{x - 18 * scale:.1f} {y + wing_y:.1f} Q {x - 9 * scale:.1f} {y - 4 * scale:.1f} '
        f"{x:.1f} {y + 4 * scale:.1f} "
        f'Q {x + 9 * scale:.1f} {y - 4 * scale:.1f} {x + 18 * scale:.1f} {y + wing_y:.1f}" '
        f'fill="none" stroke="{GLOW}" stroke-width="{3 * scale:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
    )


# Fronds of a palm tree: (angle in degrees, length, droop)
FRONDS = [(-175, 190, 70), (-145, 175, 40), (-110, 140, 15), (-70, 150, 25), (-35, 185, 55), (0, 180, 85), (-205, 150, 95)]


def palm(base_x, base_y, top_x, top_y, scale, t, phase, color=NIGHT):
    """Palm tree: fixed curved trunk, fronds swaying around the crown."""
    trunk = (
        f"M{base_x - 14 * scale} {base_y} Q {(base_x + top_x) / 2 + 40 * scale} {(base_y + top_y) / 2} "
        f"{top_x - 5 * scale} {top_y} "
        f"L {top_x + 6 * scale} {top_y} Q {(base_x + top_x) / 2 + 58 * scale} {(base_y + top_y) / 2} "
        f"{base_x + 14 * scale} {base_y} Z"
    )
    fronds = []
    for index, (angle, length, droop) in enumerate(FRONDS):
        sway = 4.5 * periodic(t, 3, phase + index * 0.11)  # degrees, 4-second period
        radians = math.radians(angle + sway)
        tip_x = top_x + math.cos(radians) * length * scale
        tip_y = top_y + math.sin(radians) * length * scale + droop * scale
        mid_x, mid_y = (top_x + tip_x) / 2, (top_y + tip_y) / 2 - 34 * scale
        normal_x, normal_y = -(tip_y - top_y), tip_x - top_x
        norm = math.hypot(normal_x, normal_y) or 1
        offset = 16 * scale
        fronds.append(
            f"M{top_x:.1f} {top_y:.1f} "
            f"Q {mid_x + normal_x / norm * offset:.1f} {mid_y + normal_y / norm * offset:.1f} {tip_x:.1f} {tip_y:.1f} "
            f"Q {mid_x - normal_x / norm * offset:.1f} {mid_y - normal_y / norm * offset:.1f} {top_x:.1f} {top_y:.1f} Z"
        )
    return f'<g fill="{color}"><path d="{trunk}"/><path d="{" ".join(fronds)}"/></g>'


def frame_svg(frame_index):
    """Returns the SVG markup of one animation frame."""
    t = frame_index / FPS
    progress = t / LOOP_SECONDS

    sun_x, sun_y, sun_radius = 540, HORIZON_Y + 20, 175
    glow_scale = 1 + 0.05 * periodic(t, 2)

    # Clouds: slow back-and-forth drift (a full crossing in 12 s would be too fast)
    clouds = []
    for base_x, y, length, thickness, color, opacity, drift, phase in [
        (40, 330, 420, 16, SALMON, 0.55, 46, 0.0),
        (520, 420, 300, 12, PEACH, 0.5, 34, 0.3),
        (640, 255, 360, 14, CORAL, 0.45, 40, 0.6),
        (120, 480, 260, 10, PEACH, 0.6, 28, 0.15),
    ]:
        x = base_x + drift * periodic(t, 1, phase)
        clouds.append(cloud(x, y, length, thickness, color, opacity))

    # Sun reflections: twinkling strokes on the water
    glints = []
    for index in range(16):
        level = index / 15
        y = HORIZON_Y + 14 + level**1.3 * 380
        base_width = 300 * (1 - level * 0.72)
        width = base_width * (0.72 + 0.28 * periodic(t, 3 + index % 4, index * 0.37))
        opacity = (0.9 - level * 0.55) * (0.75 + 0.25 * periodic(t, 2 + index % 3, index * 0.21))
        glints.append(
            f'<rect x="{sun_x - width / 2:.1f}" y="{y:.1f}" width="{width:.1f}" height="{4 + level * 4:.1f}" '
            f'rx="{2 + level * 2:.1f}" fill="{GLOW}" opacity="{opacity:.2f}"/>'
        )

    # Waves: each layer moves by a whole number of wavelengths per loop
    waves = []
    for base_y, amplitude, wavelength, cycles, color in [
        (HORIZON_Y + 70, 4, 220, 1, WINE),
        (HORIZON_Y + 150, 7, 300, 1, GARNET),
        (HORIZON_Y + 250, 10, 380, 2, "#5e0f12"),
        (HORIZON_Y + 360, 14, 460, 2, NIGHT_SOFT),
    ]:
        shift = progress * cycles * wavelength
        waves.append(f'<path d="{wave_path(base_y, amplitude, wavelength, shift)}" fill="{color}" opacity="0.92"/>')

    # Birds: one crossing per loop, from right to left
    birds = []
    for phase, y, scale, flap_cycles in [(0.0, 300, 1.0, 24), (0.08, 340, 0.8, 26), (0.5, 250, 0.9, 22)]:
        position = (progress + phase) % 1
        x = SIZE + 80 - position * (SIZE + 160)
        bob = 6 * periodic(t, 2, phase)
        flap = periodic(t, flap_cycles, phase)
        birds.append(bird(x, y + bob, scale, flap))

    # Distant hill on the right of the horizon
    hill_path = f"M640 {HORIZON_Y} Q 760 {HORIZON_Y - 46} 900 {HORIZON_Y - 30} Q 1000 {HORIZON_Y - 20} 1100 {HORIZON_Y} Z"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{FRAME_PIXELS}" height="{FRAME_PIXELS}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{NIGHT}"/><stop offset="0.22" stop-color="{GARNET}"/>
      <stop offset="0.38" stop-color="{EMBER}"/><stop offset="0.48" stop-color="{CORAL}"/>
      <stop offset="0.56" stop-color="{PEACH}"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{EMBER}"/><stop offset="0.25" stop-color="{WINE}"/><stop offset="1" stop-color="{NIGHT}"/>
    </linearGradient>
    <radialGradient id="sunFill" cx="0.5" cy="0.35" r="0.65">
      <stop offset="0" stop-color="{GLOW}"/><stop offset="1" stop-color="#ffd9c4"/>
    </radialGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="55"/></filter>
    <clipPath id="aboveHorizon"><rect width="{SIZE}" height="{HORIZON_Y}"/></clipPath>
  </defs>
  <rect width="{SIZE}" height="{SIZE}" fill="url(#sky)"/>
  <g clip-path="url(#aboveHorizon)">
    <circle cx="{sun_x}" cy="{sun_y}" r="{sun_radius * 1.8 * glow_scale:.1f}" fill="{PEACH}" opacity="0.8" filter="url(#glow)"/>
    <circle cx="{sun_x}" cy="{sun_y}" r="{sun_radius}" fill="url(#sunFill)"/>
  </g>
  {"".join(clouds)}
  <path d="{hill_path}" fill="{WINE}" opacity="0.9"/>
  <rect y="{HORIZON_Y}" width="{SIZE}" height="{SIZE - HORIZON_Y}" fill="url(#sea)"/>
  <rect y="{HORIZON_Y}" width="{SIZE}" height="2" fill="{GLOW}" opacity="0.5"/>
  {"".join(waves[:2])}
  {"".join(glints)}
  {"".join(waves[2:])}
  {"".join(birds)}
  {palm(250, 1120, 300, 610, 0.85, t, 0.4)}
  {palm(900, 1120, 770, 470, 1.15, t, 0.0)}
</svg>"""


async def render_frames(first_frame, last_frame):
    """Renders frames [first_frame, last_frame] as PNG files with Chromium."""
    frames_dir = os.path.join(ART_BUILD_DIR, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page(viewport={"width": FRAME_PIXELS, "height": FRAME_PIXELS})
        await page.set_content('<html><body style="margin:0;background:#000"><div id="stage"></div></body></html>')
        for frame_index in range(first_frame, last_frame + 1):
            await page.evaluate("svg => { document.getElementById('stage').innerHTML = svg; }", frame_svg(frame_index))
            await page.screenshot(
                path=os.path.join(frames_dir, f"f{frame_index:04d}.png"),
                clip={"x": 0, "y": 0, "width": FRAME_PIXELS, "height": FRAME_PIXELS},
            )
        await browser.close()


if __name__ == "__main__":
    first = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    last = int(sys.argv[2]) if len(sys.argv) > 2 else FRAME_COUNT - 1
    asyncio.run(render_frames(first, last))
    print(f"Frames {first} to {last} rendered.")
