#!/usr/bin/env python3
"""Render public/og.png - the 1200x630 social card, in the Cold Apparatus theme.

Run it when the title, the lede's timeline, or the lead specimen changes:

    python3 scripts/build_og_image.py

Brand faces (IBM Plex Mono + Newsreader) are fetched once from the google/fonts
repo into scripts/.fonts/ and reused; with no network it falls back to Menlo and
Times, which is close enough to ship but not what the site renders.
"""

from __future__ import annotations

import math
import random
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_CACHE = ROOT / "scripts" / ".fonts"
OUT = ROOT / "public" / "og.png"
PORTRAIT = ROOT / "public" / "portraits" / "talkie-1930.webp"

W, H = 1200, 630
PAD = 64

# Cold Apparatus tokens, lifted from src/index.css
PANEL = (8, 11, 12)
GLOW = (12, 20, 22)
GRATICULE = (16, 42, 49)
LINE_2 = (29, 57, 66)
TRACE = (70, 232, 176)
INK_BRIGHT = (238, 246, 244)
MUTED = (97, 120, 125)
FAINT = (56, 73, 77)

GF = "https://raw.githubusercontent.com/google/fonts/main/ofl"
FONTS = {
    "mono": (f"{GF}/ibmplexmono/IBMPlexMono-Regular.ttf", "Menlo.ttc"),
    "mono-bold": (f"{GF}/ibmplexmono/IBMPlexMono-SemiBold.ttf", "Menlo.ttc"),
    "serif": (f"{GF}/newsreader/Newsreader%5Bopsz,wght%5D.ttf", "Times.ttc"),
}


def face(kind: str, size: int) -> ImageFont.FreeTypeFont:
    """The brand face at `size`, downloading it once; system fallback offline."""
    url, fallback = FONTS[kind]
    cached = FONT_CACHE / url.rsplit("/", 1)[-1].replace("%5B", "[").replace("%5D", "]")
    if not cached.exists():
        FONT_CACHE.mkdir(parents=True, exist_ok=True)
        try:
            urllib.request.urlretrieve(url, cached)
        except Exception as exc:  # offline, or the font moved in google/fonts
            print(f"  ! {cached.name}: {exc}; falling back to {fallback}")
            return ImageFont.truetype(f"/System/Library/Fonts/{fallback}", size)
    font = ImageFont.truetype(str(cached), size)
    if kind == "serif":  # Newsreader ships variable: pin the optical size + weight
        try:
            font.set_variation_by_axes([14.0, 400.0])
        except Exception:
            pass
    return font


def width(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    return int(draw.textlength(text, font=font))


def wrap(draw: ImageDraw.ImageDraw, text: str, font, limit: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        probe = f"{line} {word}".strip()
        if line and width(draw, probe, font) > limit:
            lines.append(line)
            line = word
        else:
            line = probe
    if line:
        lines.append(line)
    return lines


def housing(img: Image.Image) -> None:
    """Panel black, a soft glow off the top edge, and the graticule behind it all."""
    draw = ImageDraw.Draw(img)
    cx, cy, radius = W * 0.5, -H * 0.1, H * 1.15
    for y in range(H):
        for_x = (y - cy) / radius
        t = max(0.0, 1.0 - abs(for_x))
        draw.line(
            [(0, y), (W, y)],
            fill=tuple(round(PANEL[i] + (GLOW[i] - PANEL[i]) * t * t) for i in range(3)),
        )
    for x in range(0, W, 60):
        draw.line([(x, 0), (x, H)], fill=GRATICULE)
    for y in range(0, H, 60):
        draw.line([(0, y), (W, y)], fill=GRATICULE)


def trace(img: Image.Image, top: int, height: int) -> None:
    """The signature oscilloscope carrier: clean in the middle, fading at the edges."""
    rng = random.Random(1930)
    mid = top + height / 2
    points = []
    for x in range(PAD, W - PAD):
        phase = (x - PAD) / (W - 2 * PAD)
        # fade the trace out toward both edges so it reads as a captured window
        envelope = math.sin(math.pi * phase) ** 0.6
        carrier = math.sin(phase * math.pi * 14) * 0.55 + math.sin(phase * math.pi * 37) * 0.22
        jitter = rng.uniform(-0.09, 0.09)
        points.append((x, mid - (carrier + jitter) * envelope * height * 0.46))

    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.line(points, fill=TRACE + (46,), width=9, joint="curve")
    gd.line(points, fill=TRACE + (110,), width=4, joint="curve")
    gd.line(points, fill=TRACE + (255,), width=2, joint="curve")
    img.alpha_composite(glow)


def mug(img: Image.Image, box: tuple[int, int, int]) -> None:
    """The lead specimen's face, mounted in a bezel with CRT scanlines over it."""
    x, y, size = box
    if not PORTRAIT.exists():
        return
    photo = Image.open(PORTRAIT).convert("RGB")
    side = min(photo.size)
    photo = photo.crop(
        ((photo.width - side) // 2, (photo.height - side) // 2,
         (photo.width + side) // 2, (photo.height + side) // 2)
    ).resize((size, size), Image.LANCZOS)

    lines = ImageDraw.Draw(photo, "RGBA")
    for sy in range(0, size, 3):
        lines.line([(0, sy), (size, sy)], fill=(0, 0, 0, 70))

    img.paste(photo, (x, y))
    ImageDraw.Draw(img).rectangle([x - 1, y - 1, x + size, y + size], outline=LINE_2, width=2)


def chip(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font, color, box) -> int:
    """A bordered instrument chip; returns the x just past its right edge."""
    x, y = xy
    w = width(draw, text, font) + 26
    draw.rectangle([x, y, x + w, y + 38], outline=box, width=2)
    draw.text((x + 13, y + 19), text, font=font, fill=color, anchor="lm")
    return x + w


def build() -> None:
    img = Image.new("RGBA", (W, H), PANEL + (255,))
    housing(img)
    trace(img, 398, 104)
    mug(img, (W - PAD - 200, PAD + 92, 200))

    draw = ImageDraw.Draw(img)
    mono_sm = face("mono", 21)
    mono_bold = face("mono-bold", 26)
    serif = face("serif", 62)

    # ---- instrument plate, across the top ----
    x = PAD
    draw.text((x, PAD + 19), "FABLE-MVP.tech", font=mono_bold, fill=INK_BRIGHT, anchor="lm")
    x += width(draw, "FABLE-MVP.tech", mono_bold) + 20
    chip(draw, (x, PAD), "SIGNAL ANALYSIS", mono_sm, TRACE, LINE_2)
    plate_r = "SPECIMENS 09 · SEED 1930"
    draw.text((W - PAD, PAD + 19), plate_r, font=mono_sm, fill=MUTED, anchor="rm")
    draw.line([(PAD, PAD + 60), (W - PAD, PAD + 60)], fill=LINE_2, width=2)

    # ---- title + subline, kept clear of the mug ----
    column = W - 2 * PAD - 240
    y = 168
    for line in wrap(draw, "A post-mortem, conducted on the dead.", serif, column):
        draw.text((PAD, y), line, font=serif, fill=INK_BRIGHT, anchor="lt")
        y += 74
    sub = "Seven questions about Fable's shutdown, put to a model trained on nothing written after 1930."
    y += 8
    for line in wrap(draw, sub, mono_sm, column):
        draw.text((PAD, y), line, font=mono_sm, fill=MUTED, anchor="lt")
        y += 31

    # ---- the incident, as a dated strip along the bottom ----
    draw.line([(PAD, H - 108), (W - PAD, H - 108)], fill=LINE_2, width=2)
    x = PAD
    for i, (date, what) in enumerate(
        [("JUN 9", "LIVE"), ("JUN 12", "SWITCHED OFF"),
         ("JUN 30", "CONTROLS LIFTED"), ("JUL 1", "RESTORED")]
    ):
        if i:
            draw.text((x, H - 66), "·", font=mono_sm, fill=FAINT, anchor="lm")
            x += 26
        draw.text((x, H - 66), date, font=mono_bold, fill=TRACE, anchor="lm")
        x += width(draw, date, mono_bold) + 12
        draw.text((x, H - 66), what, font=mono_sm, fill=MUTED, anchor="lm")
        x += width(draw, what, mono_sm) + 26

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB, {W}x{H})")


if __name__ == "__main__":
    build()
