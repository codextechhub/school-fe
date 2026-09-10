"""Convert a short string in a TTF into a single SVG path, normalised to a box.

Generates the `INK` path in src/components/xvs-wordmark.ts. Needs fonttools.
See docs/XVS_WORDMARK.md for what to do with the output, and for where to get a
TTF of Grand Hotel from the copy of the font this repo already has.

console-fe carries the same script for its own "CodeX" wordmark. Each product
regenerates its own artwork, so neither needs a checkout of the other.

    python3 scripts/wordmark-path.py /path/to/GrandHotel.ttf XVS 100
"""
import re
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform


def build(fontpath, text, target_h=100.0):
    font = TTFont(fontpath)
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font["hmtx"]

    kern = {}
    if "kern" in font:
        for st in font["kern"].kernTables:
            kern.update(st.kernTable)

    names = [cmap[ord(c)] for c in text]

    # Lay the glyphs out on the baseline in font units.
    placed, x = [], 0.0
    for i, gn in enumerate(names):
        placed.append((gn, x))
        x += hmtx[gn][0]
        if i + 1 < len(names):
            x += kern.get((gn, names[i + 1]), 0)
    advance = x

    # Measure the real ink box so the artwork sits tight in its viewBox.
    bounds = BoundsPen(gs)
    for gn, ox in placed:
        gs[gn].draw(TransformPen(bounds, Transform().translate(ox, 0)))
    xmin, ymin, xmax, ymax = bounds.bounds

    scale = target_h / (ymax - ymin)
    # Flip y (font space is y-up, SVG is y-down) and zero the origin.
    base = Transform().scale(scale, -scale).translate(-xmin, -ymax)

    pen = SVGPathPen(gs)
    for gn, ox in placed:
        gs[gn].draw(TransformPen(pen, base.translate(ox, 0)))

    d = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.1f}", pen.getCommands())

    return {
        "d": d,
        "w": round((xmax - xmin) * scale, 1),
        "h": round(target_h, 1),
        "upem": upem,
        "advance": round(advance * scale, 1),
        "glyph_x": [(gn, round((ox - xmin) * scale, 1)) for gn, ox in placed],
    }


if __name__ == "__main__":
    out = build(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 100.0)
    print("viewBox 0 0", out["w"], out["h"])
    print("glyph starts:", out["glyph_x"])
    print()
    print(out["d"])
