"""
Marie Dream Planner — Générateur des illustrations des formules
----------------------------------------------------------------
Trois scènes vectorielles (SVG 1280×960, ratio 4:3) dans la palette du logo :
  - weekend  : maisons à pignons le long d'un canal d'Amsterdam
  - escapade : skyline de New York et pont de Brooklyn
  - evasion  : bungalows sur pilotis et montagne en Polynésie
Style « papier découpé » : couches successives, perspective atmosphérique,
reflets dans l'eau et grain léger. Rendu en PNG par Playwright (render.py).
"""
import os

# Dossier de travail des rendus intermédiaires (non déployé)
artDir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
os.makedirs(artDir, exist_ok=True)

import math
import random

W, H = 1280, 960

# Palette tirée du logo (du grenat nuit à la lumière rasante)
NIGHT = "#2b0709"
NIGHT_SOFT = "#3d0b0e"
GARNET = "#7e1416"
WINE = "#93201b"
EMBER = "#c8371f"
SUN = "#e8432a"
CORAL = "#f36f60"
SALMON = "#f79a82"
PEACH = "#fbb79f"
BLUSH = "#fce6e0"
GLOW = "#fff1e6"


def linearGradient(gradientId, stops, x2=0, y2=1):
    """Dégradé linéaire vertical par défaut. stops : [(offset, couleur, opacité?)]."""
    stopTags = "".join(
        f'<stop offset="{offset}" stop-color="{color}" stop-opacity="{opacity}"/>'
        for offset, color, *rest in stops
        for opacity in [rest[0] if rest else 1]
    )
    return f'<linearGradient id="{gradientId}" x1="0" y1="0" x2="{x2}" y2="{y2}">{stopTags}</linearGradient>'


def commonDefs():
    """Filtres partagés : halo du soleil et grain papier."""
    return """
    <filter id="sunGlow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="38"/>
    </filter>
    <filter id="softBlur"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    """


def sunDisc(cx, cy, radius, color=GLOW, glowColor=PEACH, glowOpacity=0.85):
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{radius * 1.9}" fill="{glowColor}" opacity="{glowOpacity}" filter="url(#sunGlow)"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="{color}"/>'
    )


def glints(cx, topY, bottomY, maxWidth, color=GLOW, count=14, seed=3):
    """Colonne de reflets du soleil sur l'eau : traits horizontaux qui s'affinent."""
    rng = random.Random(seed)
    lines = []
    for index in range(count):
        progress = index / (count - 1)
        y = topY + (bottomY - topY) * progress ** 1.25
        width = maxWidth * (1 - progress * 0.75) * rng.uniform(0.55, 1)
        offset = rng.uniform(-0.12, 0.12) * maxWidth
        height = 3 + progress * 3
        lines.append(
            f'<rect x="{cx - width / 2 + offset:.1f}" y="{y:.1f}" width="{width:.1f}" height="{height:.1f}" '
            f'rx="{height / 2:.1f}" fill="{color}" opacity="{0.85 - progress * 0.5:.2f}"/>'
        )
    return "".join(lines)


def ripples(topY, bottomY, color, seed=5, count=26, opacity=0.18):
    """Fines lignes d'ondulation sur toute la largeur de l'eau."""
    rng = random.Random(seed)
    parts = []
    for _ in range(count):
        y = rng.uniform(topY, bottomY)
        x = rng.uniform(-100, W)
        width = rng.uniform(60, 260)
        parts.append(
            f'<rect x="{x:.0f}" y="{y:.0f}" width="{width:.0f}" height="2" rx="1" fill="{color}" opacity="{opacity}"/>'
        )
    return "".join(parts)


def reflection(groupId, waterlineY, opacity=0.32, stripeGap=7):
    """Reflet inversé d'un groupe sous la ligne d'eau, fragmenté en bandes horizontales."""
    return f"""
    <mask id="{groupId}Mask" maskUnits="userSpaceOnUse" x="0" y="{waterlineY}" width="{W}" height="{H - waterlineY}">
      <rect x="0" y="{waterlineY}" width="{W}" height="{H - waterlineY}" fill="url(#{groupId}Fade)"/>
      <rect x="0" y="{waterlineY}" width="{W}" height="{H - waterlineY}" fill="url(#{groupId}Stripes)"/>
    </mask>
    <linearGradient id="{groupId}Fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="{groupId}Stripes" width="{W}" height="{stripeGap}" patternUnits="userSpaceOnUse" y="{waterlineY}">
      <rect width="{W}" height="{stripeGap - 2}" fill="#000"/>
    </pattern>
    <g mask="url(#{groupId}Mask)" opacity="{opacity}">
      <use href="#{groupId}" transform="translate(0 {2 * waterlineY}) scale(1 -1)"/>
    </g>
    """


def wrapSvg(defs, body):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>{commonDefs()}{defs}</defs>
  {body}
  <rect width="{W}" height="{H}" fill="#fff" filter="url(#grain)"/>
</svg>"""


# ==========================================================================
# 1. Week-end : Amsterdam
# ==========================================================================
def gableHouse(x, baseY, width, height, color, gableType, rng, trimColor=PEACH):
    """Maison étroite à pignon typique d'Amsterdam, avec fenêtres éclairées."""
    bodyTop = baseY - height
    gableHeight = width * 0.75
    left, right, mid = x, x + width, x + width / 2
    if gableType == "step":
        step = width / 6
        rise = gableHeight / 4
        points = [(left, bodyTop), (left, bodyTop - rise), (left + step, bodyTop - rise),
                  (left + step, bodyTop - 2 * rise), (left + 2 * step, bodyTop - 2 * rise),
                  (left + 2 * step, bodyTop - 3 * rise), (right - 2 * step, bodyTop - 3 * rise),
                  (right - 2 * step, bodyTop - 2 * rise), (right - step, bodyTop - 2 * rise),
                  (right - step, bodyTop - rise), (right, bodyTop - rise), (right, bodyTop)]
        gable = "M" + " L".join(f"{px:.1f} {py:.1f}" for px, py in points) + " Z"
    elif gableType == "bell":
        gable = (f"M{left} {bodyTop} C {left} {bodyTop - gableHeight * 0.5} {mid - width * 0.18} {bodyTop - gableHeight * 0.55} "
                 f"{mid - width * 0.18} {bodyTop - gableHeight} L {mid + width * 0.18} {bodyTop - gableHeight} "
                 f"C {mid + width * 0.18} {bodyTop - gableHeight * 0.55} {right} {bodyTop - gableHeight * 0.5} {right} {bodyTop} Z")
    elif gableType == "neck":
        neck = width * 0.2
        gable = (f"M{left} {bodyTop} Q {left + width * 0.1} {bodyTop - gableHeight * 0.45} {mid - neck} {bodyTop - gableHeight * 0.5} "
                 f"L {mid - neck} {bodyTop - gableHeight} L {mid} {bodyTop - gableHeight * 1.12} L {mid + neck} {bodyTop - gableHeight} "
                 f"L {mid + neck} {bodyTop - gableHeight * 0.5} Q {right - width * 0.1} {bodyTop - gableHeight * 0.45} {right} {bodyTop} Z")
    else:  # pignon triangulaire
        gable = f"M{left} {bodyTop} L {mid} {bodyTop - gableHeight * 0.9} L {right} {bodyTop} Z"

    parts = [f'<rect x="{left}" y="{bodyTop}" width="{width}" height="{height + 2}" fill="{color}"/>',
             f'<path d="{gable}" fill="{color}"/>',
             # corniche claire et poutre de levage (détail typique)
             f'<rect x="{left}" y="{bodyTop - 3}" width="{width}" height="4" fill="{trimColor}" opacity="0.35"/>',
             f'<rect x="{mid - 2}" y="{bodyTop - gableHeight * 0.62}" width="4" height="{gableHeight * 0.25}" fill="{NIGHT}" opacity="0.6"/>']

    columns = 3 if width > 120 else 2
    rows = max(3, int(height // 78))
    windowWidth = width / (columns * 2.1)
    windowHeight = windowWidth * 1.55
    gapX = (width - columns * windowWidth) / (columns + 1)
    for row in range(rows):
        for column in range(columns):
            wx = left + gapX + column * (windowWidth + gapX)
            wy = bodyTop + 26 + row * (height - 60) / rows
            isLit = rng.random() < 0.42
            fill = GLOW if isLit else NIGHT_SOFT
            opacity = rng.uniform(0.7, 0.95) if isLit else 0.55
            parts.append(f'<rect x="{wx:.1f}" y="{wy:.1f}" width="{windowWidth:.1f}" height="{windowHeight:.1f}" '
                         f'fill="{fill}" opacity="{opacity:.2f}" rx="1.5"/>')
    # fenêtre du pignon
    parts.append(f'<rect x="{mid - windowWidth / 2:.1f}" y="{bodyTop - gableHeight * 0.36:.1f}" width="{windowWidth:.1f}" '
                 f'height="{windowHeight * 0.8:.1f}" fill="{GLOW if rng.random() < 0.5 else NIGHT_SOFT}" opacity="0.8" rx="1.5"/>')
    # porte au rez-de-chaussée
    parts.append(f'<rect x="{mid - windowWidth * 0.6:.1f}" y="{baseY - windowHeight * 1.25:.1f}" width="{windowWidth * 1.2:.1f}" '
                 f'height="{windowHeight * 1.25:.1f}" fill="{NIGHT}" opacity="0.7" rx="2"/>')
    return "".join(parts)


def sceneWeekend():
    rng = random.Random(11)
    horizonY, quayY = 600, 655
    defs = linearGradient("sky", [(0, CORAL), (0.45, SALMON), (0.8, PEACH), (1, "#ffe2d2")])
    defs += linearGradient("water", [(0, WINE), (0.4, GARNET), (1, NIGHT)])

    # Toits lointains et clocher (brume)
    farRoofs = []
    x = -20
    while x < W:
        width = rng.uniform(40, 90)
        height = rng.uniform(40, 110)
        farTop = horizonY - 150 - height  # ligne de toits lointaine, visible au-dessus des façades
        farRoofs.append(f'<rect x="{x:.0f}" y="{farTop:.0f}" width="{width:.0f}" height="{H:.0f}"/>')
        farRoofs.append(f'<path d="M{x:.0f} {farTop:.0f} L{x + width / 2:.0f} {farTop - width * 0.45:.0f} L{x + width:.0f} {farTop:.0f} Z"/>')
        x += width - 2
    tower = (f'<rect x="300" y="{horizonY - 250}" width="44" height="260"/>'
             f'<path d="M296 {horizonY - 250} L322 {horizonY - 360} L348 {horizonY - 250} Z"/>'
             f'<rect x="319" y="{horizonY - 400}" width="6" height="45"/>')

    houses = []
    colors = [GARNET, WINE, "#6a1114", "#a52a1e", "#5a0f12", "#8a1b18"]
    gables = ["step", "bell", "neck", "triangle"]
    x = -30
    index = 0
    while x < W + 20:
        width = rng.uniform(118, 168)
        height = rng.uniform(205, 300)
        houses.append(gableHouse(x, quayY, width, height, colors[index % len(colors)],
                                 gables[(index * 3 + 1) % len(gables)], rng))
        x += width + 2
        index += 1

    # Arbres de quai (silhouettes arrondies) et lampadaires
    # Feuillage : grappes de cercles irréguliers plutôt qu'une ellipse pleine
    treeRng = random.Random(21)
    treeParts = []
    for tx, size in [(150, 58), (700, 50), (1180, 62)]:
        treeParts.append(f'<rect x="{tx - 4}" y="{quayY - 70}" width="8" height="70"/>')
        for _ in range(9):
            ox, oy = treeRng.uniform(-size, size), treeRng.uniform(-size * 0.7, size * 0.35)
            r = treeRng.uniform(size * 0.38, size * 0.6)
            treeParts.append(f'<circle cx="{tx + ox:.0f}" cy="{quayY - 95 + oy:.0f}" r="{r:.0f}"/>')
    trees = f'<g fill="{NIGHT}" opacity="0.9">{"".join(treeParts)}</g>'
    lamps = "".join(
        f'<rect x="{lx}" y="{quayY - 110}" width="4" height="110" fill="{NIGHT}"/>'
        f'<circle cx="{lx + 2}" cy="{quayY - 114}" r="7" fill="{GLOW}"/>'
        f'<circle cx="{lx + 2}" cy="{quayY - 114}" r="22" fill="{PEACH}" opacity="0.35" filter="url(#softBlur)"/>'
        for lx in (420, 960)
    )

    boat = (f'<path d="M520 790 L860 790 Q 850 822 820 828 L560 828 Q 530 822 520 790 Z" fill="{NIGHT}"/>'
            f'<rect x="600" y="768" width="170" height="24" rx="6" fill="{NIGHT_SOFT}"/>'
            + "".join(f'<rect x="{612 + i * 30}" y="774" width="18" height="10" rx="2" fill="{GLOW}" opacity="0.75"/>' for i in range(5)))

    body = f"""
    <rect width="{W}" height="{H}" fill="url(#sky)"/>
    {sunDisc(905, 352, 84)}
    <g fill="{SALMON}" opacity="0.55">{"".join(farRoofs)}</g>
    <g fill="{CORAL}" opacity="0.5">{tower}</g>
    <g id="houses">{"".join(houses)}{trees}</g>
    {lamps}
    <rect x="0" y="{quayY}" width="{W}" height="16" fill="{NIGHT}"/>
    <rect x="0" y="{quayY + 16}" width="{W}" height="{H - quayY - 16}" fill="url(#water)"/>
    {reflection("houses", quayY + 16)}
    {glints(905, quayY + 30, H - 40, 220, seed=4)}
    {ripples(quayY + 30, H, PEACH, seed=9)}
    {boat}
    <path d="M520 830 L860 830 Q 840 850 800 852 L580 852 Q 540 850 520 830 Z" fill="{NIGHT}" opacity="0.35"/>
    """
    return wrapSvg(defs, body)



# ==========================================================================
# 2. Escapade : New York (skyline de Manhattan et pont de Brooklyn)
# ==========================================================================
def skylineBlocks(rng, baseY, xStart, xEnd, minHeight, maxHeight, minWidth, maxWidth):
    """Suite d'immeubles rectangulaires avec quelques toits en gradins."""
    parts, x = [], xStart
    while x < xEnd:
        width = rng.uniform(minWidth, maxWidth)
        height = rng.uniform(minHeight, maxHeight)
        top = baseY - height
        parts.append(f'<rect x="{x:.0f}" y="{top:.0f}" width="{width:.0f}" height="{height + 400:.0f}"/>')
        if rng.random() < 0.35:  # gradin supérieur
            parts.append(f'<rect x="{x + width * 0.2:.0f}" y="{top - height * 0.12:.0f}" width="{width * 0.6:.0f}" height="{height * 0.12 + 2:.0f}"/>')
        x += width + rng.uniform(-6, 4)
    return "".join(parts)


def litWindows(rng, xStart, xEnd, yTop, yBottom, density=0.05):
    """Fenêtres éclairées clairsemées sur la skyline."""
    parts = []
    for x in range(int(xStart), int(xEnd), 9):
        for y in range(int(yTop), int(yBottom), 12):
            if rng.random() < density:
                parts.append(f'<rect x="{x}" y="{y}" width="3" height="5"/>')
    return "".join(parts)


def sceneEscapade():
    rng = random.Random(23)
    waterY = 700
    defs = linearGradient("sky", [(0, GARNET), (0.35, EMBER), (0.62, CORAL), (0.85, PEACH), (1, "#ffe0cf")])
    defs += linearGradient("water", [(0, WINE), (0.5, GARNET), (1, NIGHT)])

    farCity = skylineBlocks(rng, waterY, -20, W + 20, 60, 160, 30, 70)
    midCity = skylineBlocks(rng, waterY, -20, W + 20, 90, 260, 40, 90)

    # Gratte-ciel emblématiques (silhouettes simplifiées)
    empireX, chryslerX, wtcX = 620, 430, 1010
    landmarks = (
        # Empire State Building : gradins successifs + flèche
        f'<rect x="{empireX - 55}" y="{waterY - 330}" width="110" height="340"/>'
        f'<rect x="{empireX - 40}" y="{waterY - 400}" width="80" height="80"/>'
        f'<rect x="{empireX - 26}" y="{waterY - 455}" width="52" height="60"/>'
        f'<rect x="{empireX - 14}" y="{waterY - 490}" width="28" height="40"/>'
        f'<rect x="{empireX - 4}" y="{waterY - 560}" width="8" height="75"/>'
        # Chrysler Building : couronne en arcs étagés + aiguille
        f'<rect x="{chryslerX - 40}" y="{waterY - 330}" width="80" height="340"/>'
        f'<path d="M{chryslerX - 30} {waterY - 330} Q {chryslerX - 30} {waterY - 380} {chryslerX} {waterY - 405} '
        f'Q {chryslerX + 30} {waterY - 380} {chryslerX + 30} {waterY - 330} Z"/>'
        f'<path d="M{chryslerX - 18} {waterY - 380} Q {chryslerX - 18} {waterY - 415} {chryslerX} {waterY - 432} '
        f'Q {chryslerX + 18} {waterY - 415} {chryslerX + 18} {waterY - 380} Z"/>'
        f'<path d="M{chryslerX - 3} {waterY - 430} L {chryslerX} {waterY - 505} L {chryslerX + 3} {waterY - 430} Z"/>'
        # One World Trade Center : prisme effilé + antenne
        f'<path d="M{wtcX - 60} {waterY + 5} L {wtcX - 60} {waterY - 260} L {wtcX - 34} {waterY - 470} '
        f'L {wtcX + 34} {waterY - 470} L {wtcX + 60} {waterY - 260} L {wtcX + 60} {waterY + 5} Z"/>'
        f'<rect x="{wtcX - 3}" y="{waterY - 570}" width="6" height="105"/>'
    )
    windows = litWindows(random.Random(5), 0, W, waterY - 300, waterY - 10, density=0.045)
    defs += f'<clipPath id="cityClip">{midCity}{landmarks}</clipPath>'

    # Pont de Brooklyn : pile gothique à double arche, câbles porteurs et suspentes
    towerLeft, towerRight, towerTop = 120, 300, 300
    deckY = 742
    tower = (
        f'<path d="M{towerLeft} {H} L{towerLeft} {towerTop + 40} L{towerLeft + 20} {towerTop} '
        f'L{towerRight - 20} {towerTop} L{towerRight} {towerTop + 40} L{towerRight} {H} Z"/>'
    )
    archWidth, archTop, archBottom = 52, towerTop + 90, deckY - 10
    arches = "".join(
        f'<path d="M{ax} {archBottom} L{ax} {archTop + 40} Q {ax} {archTop} {ax + archWidth / 2} {archTop - 12} '
        f'Q {ax + archWidth} {archTop} {ax + archWidth} {archTop + 40} L{ax + archWidth} {archBottom} Z" fill="url(#sky)"/>'
        for ax in (towerLeft + 26, towerRight - 26 - archWidth)
    )
    cableStartX, cableStartY = towerRight - 10, towerTop + 20
    cableEnd = (W + 60, towerTop - 40)
    lowestX, lowestY = 860, deckY - 30
    mainCable = (f'M{cableStartX} {cableStartY} Q {lowestX - 120} {lowestY + 40} {lowestX} {lowestY} '
                 f'T {cableEnd[0]} {cableEnd[1]}')

    def cableY(x):
        # approximation de la courbe du câble pour placer les suspentes
        t = (x - cableStartX) / (cableEnd[0] - cableStartX)
        return cableStartY + (lowestY - cableStartY) * math.sin(math.pi * min(t * 1.1, 1)) if t < 0.5 else \
            lowestY + (cableEnd[1] - lowestY) * ((t - 0.5) * 2) ** 1.6
    suspenders = "".join(
        f'<line x1="{x}" y1="{cableY(x):.0f}" x2="{x}" y2="{deckY}" stroke="{NIGHT}" stroke-width="1.6" opacity="0.8"/>'
        for x in range(cableStartX + 22, W, 22)
    )
    stays = "".join(
        f'<line x1="{cableStartX}" y1="{cableStartY + 10}" x2="{cableStartX + d}" y2="{deckY}" stroke="{NIGHT}" stroke-width="1.4" opacity="0.7"/>'
        for d in (120, 220, 320, 420)
    )
    bridge = (
        f'<g fill="{NIGHT}">{tower}</g>{arches}'
        f'<path d="{mainCable}" fill="none" stroke="{NIGHT}" stroke-width="5"/>'
        f'<path d="M{towerLeft + 10} {cableStartY} Q 40 {cableStartY + 220} -40 {cableStartY + 200}" fill="none" stroke="{NIGHT}" stroke-width="5"/>'
        f'{suspenders}{stays}'
        f'<rect x="0" y="{deckY}" width="{W}" height="18" fill="{NIGHT}"/>'
        f'<rect x="0" y="{deckY + 18}" width="{W}" height="4" fill="{GARNET}" opacity="0.6"/>'
    )

    body = f"""
    <rect width="{W}" height="{H}" fill="url(#sky)"/>
    {sunDisc(790, 505, 74, glowOpacity=0.9)}
    <g fill="{SALMON}" opacity="0.55">{farCity}</g>
    <g id="city">
      <g fill="{WINE}">{midCity}{landmarks}</g>
      <g fill="{GLOW}" opacity="0.75" clip-path="url(#cityClip)">{windows}</g>
    </g>
    <rect x="0" y="{waterY}" width="{W}" height="{H - waterY}" fill="url(#water)"/>
    {reflection("city", waterY, opacity=0.3)}
    {glints(790, waterY + 14, H - 30, 200, seed=8)}
    {ripples(waterY + 10, H, PEACH, seed=13)}
    {bridge}
    """
    return wrapSvg(defs, body)


# ==========================================================================
# 3. Évasion : Polynésie (bungalows sur pilotis, montagne, lagon)
# ==========================================================================
def bungalow(cx, deckY, scale):
    """Bungalow sur pilotis : toit de chaume en croupe, murs, terrasse, pilotis."""
    width, roofHeight, wallHeight, stiltHeight = 150 * scale, 70 * scale, 42 * scale, 46 * scale
    left, right = cx - width / 2, cx + width / 2
    wallTop = deckY - wallHeight
    roof = (f'M{left - 14 * scale:.1f} {wallTop + 4 * scale:.1f} L{cx - width * 0.18:.1f} {wallTop - roofHeight:.1f} '
            f'L{cx + width * 0.18:.1f} {wallTop - roofHeight:.1f} L{right + 14 * scale:.1f} {wallTop + 4 * scale:.1f} Z')
    stilts = "".join(
        f'<rect x="{left + i * width / 5:.1f}" y="{deckY:.1f}" width="{3.5 * scale:.1f}" height="{stiltHeight:.1f}"/>'
        for i in range(6)
    )
    window = (f'<rect x="{cx - 14 * scale:.1f}" y="{wallTop + 10 * scale:.1f}" width="{28 * scale:.1f}" '
              f'height="{18 * scale:.1f}" fill="{GLOW}" opacity="0.85"/>')
    return (f'<g fill="{NIGHT}"><path d="{roof}"/>'
            f'<rect x="{left + 8 * scale:.1f}" y="{wallTop:.1f}" width="{width - 16 * scale:.1f}" height="{wallHeight:.1f}"/>'
            f'<rect x="{left - 10 * scale:.1f}" y="{deckY - 4 * scale:.1f}" width="{width + 20 * scale:.1f}" height="{7 * scale:.1f}"/>'
            f'{stilts}</g>{window}')


def palmTree(baseX, baseY, height, lean, scale=1.0, color=NIGHT):
    """Palmier en silhouette : tronc courbe et palmes effilées."""
    topX, topY = baseX + lean, baseY - height
    trunk = (f'M{baseX - 9 * scale} {baseY} Q {baseX + lean * 0.2} {baseY - height * 0.55} {topX - 3 * scale} {topY} '
             f'L {topX + 4 * scale} {topY} Q {baseX + lean * 0.2 + 12 * scale} {baseY - height * 0.55} {baseX + 9 * scale} {baseY} Z')
    fronds = []
    for angle, length, droop in [(-170, 150, 50), (-140, 140, 30), (-100, 110, 10), (-60, 120, 20),
                                 (-25, 150, 45), (10, 145, 65), (-200, 120, 70)]:
        rad = math.radians(angle)
        tipX = topX + math.cos(rad) * length * scale
        tipY = topY + math.sin(rad) * length * scale + droop * scale
        midX = (topX + tipX) / 2
        midY = (topY + tipY) / 2 - 28 * scale
        normalX, normalY = -(tipY - topY), tipX - topX
        norm = math.hypot(normalX, normalY) or 1
        offset = 13 * scale
        fronds.append(f'M{topX:.1f} {topY:.1f} Q {midX + normalX / norm * offset:.1f} {midY + normalY / norm * offset:.1f} '
                      f'{tipX:.1f} {tipY:.1f} Q {midX - normalX / norm * offset:.1f} {midY - normalY / norm * offset:.1f} '
                      f'{topX:.1f} {topY:.1f} Z')
    return f'<g fill="{color}"><path d="{trunk}"/><path d="{" ".join(fronds)}"/></g>'


def sceneEvasion():
    horizonY = 560
    defs = linearGradient("sky", [(0, EMBER), (0.35, CORAL), (0.7, PEACH), (1, "#ffe6d8")])
    defs += linearGradient("lagoon", [(0, "#f6a48c"), (0.25, CORAL), (0.6, WINE), (1, NIGHT)])

    # Montagne type Otemanu : falaises abruptes et sommet tabulaire
    farRidge = (f'M-20 {horizonY} L 160 {horizonY - 90} L 300 {horizonY - 60} L 420 {horizonY - 120} L 560 {horizonY} Z')
    mountain = (f'M560 {horizonY} L 690 {horizonY - 150} L 760 {horizonY - 210} L 800 {horizonY - 330} L 818 {horizonY - 360} '
                f'L 880 {horizonY - 365} L 902 {horizonY - 300} L 925 {horizonY - 250} L 1000 {horizonY - 190} '
                f'L 1110 {horizonY - 120} L 1300 {horizonY - 60} L 1300 {horizonY} Z')
    frontRidge = (f'M620 {horizonY} Q 760 {horizonY - 110} 900 {horizonY - 70} Q 1040 {horizonY - 30} 1300 {horizonY - 25} '
                  f'L 1300 {horizonY} Z')
    islandPalms = "".join(palmTree(x, horizonY + 2, 60 + (x % 5) * 6, (x % 3 - 1) * 8, scale=0.32, color=GARNET)
                          for x in range(660, 1300, 46))

    # Ponton courbe et bungalows en perspective (du plus loin au plus proche)
    bungalowSpecs = [(1140, 652, 0.42), (990, 680, 0.52), (820, 718, 0.64), (610, 770, 0.8), (360, 835, 1.0)]
    # Passerelle à hauteur de terrasse : courbe lissée (Catmull-Rom) passant par chaque bungalow
    pierPoints = [(-60, 905)] + [(cx, deckY) for cx, deckY, _ in reversed(bungalowSpecs)] + [(1320, 628)]
    pierPath = f"M{pierPoints[0][0]} {pierPoints[0][1]}"
    for i in range(len(pierPoints) - 1):
        p0 = pierPoints[max(i - 1, 0)]; p1 = pierPoints[i]; p2 = pierPoints[i + 1]; p3 = pierPoints[min(i + 2, len(pierPoints) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        pierPath += f" C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]} {p2[1]}"
    pierStilts = "".join(
        f'<rect x="{x:.0f}" y="{y:.0f}" width="3" height="{30 * (y - 600) / 300:.0f}"/>'
        for x, y in [(a + (b - a) * t, c + (d - c) * t)
                     for (a, c), (b, d) in zip(pierPoints, pierPoints[1:]) for t in (0.33, 0.66)]
    )
    pier = (f'<path d="{pierPath}" fill="none" stroke="{NIGHT}" stroke-width="7"/>'
            f'<g fill="{NIGHT}">{pierStilts}</g>')
    bungalows = "".join(bungalow(cx, deckY, scale) for cx, deckY, scale in bungalowSpecs)

    body = f"""
    <rect width="{W}" height="{H}" fill="url(#sky)"/>
    {sunDisc(300, 470, 84)}
    <path d="{farRidge}" fill="{SALMON}" opacity="0.6"/>
    <path d="{mountain}" fill="#b4473a"/>
    <path d="{frontRidge}" fill="{WINE}"/>
    {islandPalms}
    <rect x="0" y="{horizonY}" width="{W}" height="{H - horizonY}" fill="url(#lagoon)"/>
    {glints(300, horizonY + 10, H - 60, 240, seed=6)}
    {ripples(horizonY + 6, H, GLOW, seed=17, count=34, opacity=0.22)}
    <g id="resort">{pier}{bungalows}</g>
    {reflection("resort", 0, opacity=0)}
    {palmTree(40, H + 20, 520, 150, scale=1.25)}
    """
    return wrapSvg(defs, body)


SCENES = {"weekend": sceneWeekend, "escapade": sceneEscapade, "evasion": sceneEvasion}

if __name__ == "__main__":
    import sys
    for sceneName in sys.argv[1:] or SCENES:
        with open(f"{artDir}/{sceneName}.svg", "w", encoding="utf-8") as handle:
            handle.write(SCENES[sceneName]())
        print("svg", sceneName)
