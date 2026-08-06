"""Render the README demo: the index plate assembling itself.

The browser pane in this environment does not composite, so this reproduces the
real animation from its real inputs rather than screen-recording it — the
shipped plate raster, the STATIONS geometry read straight out of src/ui/home.js,
and the timings from app.css (620ms draw-in per leader, staggered 120 + 46i ms,
ring and label fading in behind it). If any of those change, rerun this.

    python scripts/make-demo-gif.py

Needs Pillow only. Labels fall back to Consolas because @fontsource ships woff
and Pillow cannot read woff; at this size a mono is a mono.
"""

from PIL import Image, ImageDraw, ImageFont
import math, os, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLATE = ROOT / "assets/generated/plate-aircraft.png"
OUT = ROOT / "assets/demo-plate.gif"

def stations():
    """Read the balloon geometry out of home.js so this can never drift from it."""
    src = (ROOT / "src/ui/home.js").read_text(encoding="utf-8")
    block = src[src.index("const STATIONS"):]
    block = block[:block.index("];") + 2]
    out = []
    for m in re.finditer(r"b:\s*\[(\d+),\s*(\d+)\].*?t:\s*\[(\d+),\s*(\d+)\].*?"
                         r'label:\s*"([^"]+)"', block, re.S):
        bx, by, tx, ty, label = m.groups()
        out.append({"b": [int(bx), int(by)], "t": [int(tx), int(ty)], "label": label})
    if len(out) != 12:
        raise SystemExit(f"expected 12 stations, parsed {len(out)} — has home.js changed shape?")
    return out

STATIONS = stations()

# Tokens, straight from src/styles/tokens.css (positive plate).
PAPER, INK, INK2, INK3 = (244, 244, 241), (20, 23, 28), (69, 75, 85), (107, 112, 121)

VB_W, VB_H = 1536, 1024          # the raster's own space, which SVG shares
W = 900                          # output width; small enough for a README
S = W / VB_W
H = round(VB_H * S)
R = 21                           # balloon radius, from home.js

FPS, HOLD_MS = 25, 2200          # frames/sec, and how long to hold the finished plate
DRAW_MS, STAGGER_MS, BASE_MS = 620, 46, 120
FADE_MS, RING_OFF, NAME_OFF = 380, 200, 260

def ease(t):                     # cubic-bezier(.16,1,.3,1), the app's --ease
    return 1 - pow(1 - t, 3)

def font(px, bold=False):
    for p in (r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",):
        if os.path.exists(p):
            return ImageFont.truetype(p, px)
    return ImageFont.load_default()

# The plate is greyscale ink on white and the page multiplies it onto paper.
plate = Image.open(PLATE).convert("L").resize((W, H), Image.LANCZOS)
paper = Image.new("RGB", (W, H), PAPER)
base = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), paper, plate.point(lambda v: 255 - v))
base = Image.blend(paper, base, 1.0)
# multiply: result = paper * plate / 255, per channel
px_plate = plate.load()
base = paper.copy()
bp = base.load()
for y in range(H):
    for x in range(W):
        g = px_plate[x, y]
        bp[x, y] = (PAPER[0] * g // 255, PAPER[1] * g // 255, PAPER[2] * g // 255)

# The app sets these at 11px and 10px in a 1536-wide viewBox. Rendered faithfully
# into a 900px GIF that is under 6px and unreadable, so they are enlarged for the
# raster — the one deliberate departure from the running page.
f_num, f_name = font(round(11 * S * 1.4), True), font(round(10 * S * 1.4))
TRACK = f_name.size * 0.1        # the label's .1em letter-spacing, drawn properly
                                 # rather than faked with spaces, which doubled
                                 # the width and pushed labels off the canvas

def tracked_w(d, text):
    return sum(d.textlength(c, font=f_name) + TRACK for c in text) - TRACK

def draw_tracked(d, x, y, text, col):
    for c in text:
        d.text((x, y), c, font=f_name, fill=col)
        x += d.textlength(c, font=f_name) + TRACK

def frame_at(ms):
    im = base.copy()
    d = ImageDraw.Draw(im)
    for i, st in enumerate(STATIONS):
        bx, by = [v * S for v in st["b"]]
        tx, ty = [v * S for v in st["t"]]
        delay = BASE_MS + i * STAGGER_MS

        # leader: starts at the ring's edge and draws outward to the component
        dx, dy = tx - bx, ty - by
        ln = math.hypot(dx, dy) or 1
        sx, sy = bx + dx / ln * R * S, by + dy / ln * R * S
        p = max(0.0, min(1.0, (ms - delay) / DRAW_MS))
        if p > 0:
            e = ease(p)
            d.line([sx, sy, sx + (tx - sx) * e, sy + (ty - sy) * e], fill=INK3, width=max(1, round(S * 1.6)))

        # ring + number
        pr = max(0.0, min(1.0, (ms - delay - RING_OFF) / FADE_MS))
        if pr > 0:
            col = tuple(round(PAPER[c] + (INK[c] - PAPER[c]) * pr) for c in range(3))
            r = R * S
            d.ellipse([bx - r, by - r, bx + r, by + r], fill=PAPER, outline=col, width=max(1, round(S * 1.6)))
            t = str(i + 1)
            tb = d.textbbox((0, 0), t, font=f_num)
            d.text((bx - (tb[2] - tb[0]) / 2, by - (tb[3] - tb[1]) / 2 - tb[1]), t, font=f_num, fill=col)

        # label, anchored by frame edge exactly as home.js decides it
        pn = max(0.0, min(1.0, (ms - delay - NAME_OFF) / FADE_MS))
        if pn > 0:
            col = tuple(round(PAPER[c] + (INK2[c] - PAPER[c]) * pn) for c in range(3))
            end = st["b"][0] > 1150 or not (st["b"][0] < 380 or st["b"][0] - dx / ln < st["b"][0])
            x = (bx - R * S - 8 * S - tracked_w(d, st["label"])) if end else (bx + R * S + 8 * S)
            # The app anchors by edge; a raster also has to respect its own margin.
            x = max(6, min(x, W - tracked_w(d, st["label"]) - 6))
            y = by - 4 * S if (by - dy / ln) < by else by + 5 * S
            draw_tracked(d, x, y - f_name.size * 0.55, st["label"], col)
    return im

total = BASE_MS + 11 * STAGGER_MS + NAME_OFF + FADE_MS
step = 1000 / FPS
frames = [frame_at(i * step) for i in range(math.ceil(total / step) + 1)]

# One long final frame, not many identical ones: holding with 46 copies cost
# 1.4 MB for a picture that never changes.
durations = [round(step)] * len(frames) + [HOLD_MS]
frames.append(frames[-1])

pal = frames[-1].convert("P", palette=Image.ADAPTIVE, colors=48)
frames = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
frames[0].save(OUT, save_all=True, append_images=frames[1:],
               duration=durations, loop=0, optimize=True, disposal=1)
print(f"{OUT.relative_to(ROOT)} — {len(frames)} frames, {W}x{H}, {OUT.stat().st_size/1024:.0f} KB")
