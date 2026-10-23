"""
Marie Dream Planner — Animation du hero (boucle parfaite)
---------------------------------------------------------
Scène carrée (la vidéo s'affiche dans le disque solaire) : coucher de soleil
sur la mer, vagues, palmiers, oiseaux et reflets scintillants.

Chaque mouvement est périodique sur LOOP_SECONDS : la dernière image raccorde
exactement avec la première, la boucle est donc invisible.
  - vagues   : translation d'un nombre entier de longueurs d'onde
  - nuages   : lente dérive aller-retour
  - oiseaux  : une traversée par boucle, battements d'ailes à fréquence entière
  - palmes   : oscillation de période LOOP_SECONDS / 3
  - reflets  : scintillement à fréquences entières

Utilisation : python3 video.py <première image> <dernière image>
(rend les images PNG dans frames/, à assembler ensuite avec ffmpeg)
"""
import os

# Dossier de travail des rendus intermédiaires (non déployé)
artDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
os.makedirs(artDir, exist_ok=True)

import asyncio
import math
import os
import sys

from playwright.async_api import async_playwright

SIZE = 1080
FRAME_PIXELS = 960
FPS = 24
LOOP_SECONDS = 12
FRAME_COUNT = FPS * LOOP_SECONDS
HORIZON_Y = 600
TAU = 2 * math.pi

NIGHT, NIGHT_SOFT, GARNET, WINE = "#2b0709", "#3d0b0e", "#7e1416", "#93201b"
EMBER, CORAL, SALMON, PEACH, GLOW = "#c8371f", "#f36f60", "#f79a82", "#fbb79f", "#fff1e6"


def periodic(t, cycles, phase=0.0):
    """Sinus de fréquence entière sur la boucle : périodique par construction."""
    return math.sin(TAU * (cycles * t / LOOP_SECONDS + phase))


def wavePath(baseY, amplitude, wavelength, shift, harmonic=0.35):
    """Bande de mer dont le bord supérieur ondule ; décalée de « shift » pixels."""
    points = []
    for x in range(-20, SIZE + 21, 12):
        phase = TAU * (x + shift) / wavelength
        y = baseY + amplitude * (math.sin(phase) + harmonic * math.sin(2 * phase + 1.3))
        points.append(f"{x} {y:.1f}")
    return f"M{points[0]} L{' L'.join(points[1:])} L{SIZE + 20} {SIZE + 20} L-20 {SIZE + 20} Z"


def cloud(x, y, length, thickness, color, opacity):
    """Nuage étiré façon lame (bandes horizontales arrondies)."""
    return (f'<g fill="{color}" opacity="{opacity}">'
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{length:.1f}" height="{thickness:.1f}" rx="{thickness / 2:.1f}"/>'
            f'<rect x="{x + length * 0.18:.1f}" y="{y - thickness * 0.8:.1f}" width="{length * 0.5:.1f}" height="{thickness:.1f}" rx="{thickness / 2:.1f}"/>'
            f'<rect x="{x + length * 0.42:.1f}" y="{y + thickness * 0.9:.1f}" width="{length * 0.45:.1f}" height="{thickness * 0.8:.1f}" rx="{thickness / 2:.1f}"/>'
            f'</g>')


def bird(x, y, scale, flap):
    """Mouette stylisée ; flap ∈ [-1, 1] fait battre les ailes."""
    wingY = -10 * scale * (0.4 + 0.6 * flap)
    return (f'<path d="M{x - 18 * scale:.1f} {y + wingY:.1f} Q {x - 9 * scale:.1f} {y - 4 * scale:.1f} {x:.1f} {y + 4 * scale:.1f} '
            f'Q {x + 9 * scale:.1f} {y - 4 * scale:.1f} {x + 18 * scale:.1f} {y + wingY:.1f}" '
            f'fill="none" stroke="{GLOW}" stroke-width="{3 * scale:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')


def palm(baseX, baseY, topX, topY, scale, t, phase, color=NIGHT):
    """Palmier : tronc courbe fixe, palmes qui ondulent autour de la couronne."""
    trunk = (f'M{baseX - 14 * scale} {baseY} Q {(baseX + topX) / 2 + 40 * scale} {(baseY + topY) / 2} {topX - 5 * scale} {topY} '
             f'L {topX + 6 * scale} {topY} Q {(baseX + topX) / 2 + 58 * scale} {(baseY + topY) / 2} {baseX + 14 * scale} {baseY} Z')
    fronds = []
    for index, (angle, length, droop) in enumerate([(-175, 190, 70), (-145, 175, 40), (-110, 140, 15), (-70, 150, 25),
                                                    (-35, 185, 55), (0, 180, 85), (-205, 150, 95)]):
        sway = 4.5 * periodic(t, 3, phase + index * 0.11)  # degrés, période 4 s
        rad = math.radians(angle + sway)
        tipX = topX + math.cos(rad) * length * scale
        tipY = topY + math.sin(rad) * length * scale + droop * scale
        midX, midY = (topX + tipX) / 2, (topY + tipY) / 2 - 34 * scale
        normalX, normalY = -(tipY - topY), tipX - topX
        norm = math.hypot(normalX, normalY) or 1
        offset = 16 * scale
        fronds.append(f'M{topX:.1f} {topY:.1f} Q {midX + normalX / norm * offset:.1f} {midY + normalY / norm * offset:.1f} '
                      f'{tipX:.1f} {tipY:.1f} Q {midX - normalX / norm * offset:.1f} {midY - normalY / norm * offset:.1f} {topX:.1f} {topY:.1f} Z')
    return f'<g fill="{color}"><path d="{trunk}"/><path d="{" ".join(fronds)}"/></g>'


def frameSvg(frameIndex):
    t = frameIndex / FPS
    progress = t / LOOP_SECONDS

    sunX, sunY, sunRadius = 540, HORIZON_Y + 20, 175
    glowScale = 1 + 0.05 * periodic(t, 2)

    # Nuages : lente dérive aller-retour (une traversée complète en 12 s serait trop rapide)
    clouds = []
    for baseX, y, length, thickness, color, opacity, drift, phase in [
        (40, 330, 420, 16, SALMON, 0.55, 46, 0.0), (520, 420, 300, 12, PEACH, 0.5, 34, 0.3),
        (640, 255, 360, 14, CORAL, 0.45, 40, 0.6), (120, 480, 260, 10, PEACH, 0.6, 28, 0.15),
    ]:
        x = baseX + drift * periodic(t, 1, phase)
        clouds.append(cloud(x, y, length, thickness, color, opacity))

    # Reflets du soleil : traits qui scintillent
    glintParts = []
    for index in range(16):
        level = index / 15
        y = HORIZON_Y + 14 + level ** 1.3 * 380
        baseWidth = 300 * (1 - level * 0.72)
        width = baseWidth * (0.72 + 0.28 * periodic(t, 3 + index % 4, index * 0.37))
        opacity = (0.9 - level * 0.55) * (0.75 + 0.25 * periodic(t, 2 + index % 3, index * 0.21))
        glintParts.append(f'<rect x="{sunX - width / 2:.1f}" y="{y:.1f}" width="{width:.1f}" height="{4 + level * 4:.1f}" '
                          f'rx="{2 + level * 2:.1f}" fill="{GLOW}" opacity="{opacity:.2f}"/>')

    # Vagues : chaque couche avance d'un nombre entier de longueurs d'onde par boucle
    waves = []
    for baseY, amplitude, wavelength, cycles, color in [
        (HORIZON_Y + 70, 4, 220, 1, WINE), (HORIZON_Y + 150, 7, 300, 1, GARNET),
        (HORIZON_Y + 250, 10, 380, 2, "#5e0f12"), (HORIZON_Y + 360, 14, 460, 2, NIGHT_SOFT),
    ]:
        shift = progress * cycles * wavelength
        waves.append(f'<path d="{wavePath(baseY, amplitude, wavelength, shift)}" fill="{color}" opacity="0.92"/>')

    # Oiseaux : une traversée par boucle, de droite à gauche
    birds = []
    for phase, y, scale, flapCycles in [(0.0, 300, 1.0, 24), (0.08, 340, 0.8, 26), (0.5, 250, 0.9, 22)]:
        position = (progress + phase) % 1
        x = SIZE + 80 - position * (SIZE + 160)
        bob = 6 * periodic(t, 2, phase)
        flap = periodic(t, flapCycles, phase)
        birds.append(bird(x, y + bob, scale, flap))

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
    <circle cx="{sunX}" cy="{sunY}" r="{sunRadius * 1.8 * glowScale:.1f}" fill="{PEACH}" opacity="0.8" filter="url(#glow)"/>
    <circle cx="{sunX}" cy="{sunY}" r="{sunRadius}" fill="url(#sunFill)"/>
  </g>
  {"".join(clouds)}
  <path d="M640 {HORIZON_Y} Q 760 {HORIZON_Y - 46} 900 {HORIZON_Y - 30} Q 1000 {HORIZON_Y - 20} 1100 {HORIZON_Y} Z" fill="{WINE}" opacity="0.9"/>
  <rect y="{HORIZON_Y}" width="{SIZE}" height="{SIZE - HORIZON_Y}" fill="url(#sea)"/>
  <rect y="{HORIZON_Y}" width="{SIZE}" height="2" fill="{GLOW}" opacity="0.5"/>
  {"".join(waves[:2])}
  {"".join(glintParts)}
  {"".join(waves[2:])}
  {"".join(birds)}
  {palm(250, 1120, 300, 610, 0.85, t, 0.4)}
  {palm(900, 1120, 770, 470, 1.15, t, 0.0)}
</svg>"""


async def renderFrames(firstFrame, lastFrame):
    os.makedirs(f"{artDir}/frames", exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page(viewport={"width": FRAME_PIXELS, "height": FRAME_PIXELS})
        await page.set_content('<html><body style="margin:0;background:#000"><div id="stage"></div></body></html>')
        for frameIndex in range(firstFrame, lastFrame + 1):
            await page.evaluate("svg => { document.getElementById('stage').innerHTML = svg; }", frameSvg(frameIndex))
            await page.screenshot(path=f"{artDir}/frames/f{frameIndex:04d}.png",
                                  clip={"x": 0, "y": 0, "width": FRAME_PIXELS, "height": FRAME_PIXELS})
        await browser.close()


if __name__ == "__main__":
    first = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    last = int(sys.argv[2]) if len(sys.argv) > 2 else FRAME_COUNT - 1
    asyncio.run(renderFrames(first, last))
    print(f"images {first} à {last} rendues")
