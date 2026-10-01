#!/usr/bin/env python3
"""Render a 1200x630 share image for each resource collection.

The portrait tile art is shown whole on the right, over a blurred wash of
itself, with the sub-header, title and resource count on the left.

Run from the repo root: python3 scripts/generate-og-images.py
Writes img/og/collection/{slug}.jpg. Needs Pillow and PyYAML.
"""
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
COLLECTIONS = ROOT / "_resources-collection"
TILES = ROOT / "img/resources-collection"
OUT = ROOT / "img/og/collection"
FONTS = Path(__file__).resolve().parent / "fonts"

W, H = 1200, 630
PAD = 56
TILE_RADIUS = 24
ART_TOP_CROP = 0.2
NAVY_BLACK = (0x1F, 0x29, 0x37)
WHITE = (0xFF, 0xFF, 0xFF)

title_font = ImageFont.truetype(str(FONTS / "ZillaSlab-Bold.ttf"), 72)
eyebrow_font = ImageFont.truetype(str(FONTS / "Lato-Bold.ttf"), 26)
count_font = ImageFont.truetype(str(FONTS / "Lato-Bold.ttf"), 30)
TITLE_LEADING = 84


def front_matter(path):
    return yaml.safe_load(path.read_text().split("---", 2)[1])


def hex_rgb(value):
    value = str(value).lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def is_light(rgb):
    r, g, b = rgb
    return 0.299 * r + 0.587 * g + 0.114 * b > 140


def cover(img, w, h):
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def wrap_balanced(draw, text, font, width):
    # CSS text-wrap: balance -- greedy's line count, with the narrowest
    # width that still fits in it, so no word is left alone on a line.
    count = len(wrap(draw, text, font, width))
    lo, hi = 0, width
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if len(wrap(draw, text, font, mid)) <= count:
            hi = mid
        else:
            lo = mid
    return wrap(draw, text, font, hi)


def tracked(draw, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def layer():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def render(meta, out_path):
    text_rgb = hex_rgb(meta.get("text-color") or "#ffffff")
    shade = NAVY_BLACK if is_light(text_rgb) else WHITE
    on_shade = NAVY_BLACK if shade == WHITE else WHITE
    art = Image.open(TILES / meta["tile-image"]).convert("RGB")
    # The top of each tile is left empty for the page's title; drop it here.
    art = art.crop((0, round(art.height * ART_TOP_CROP), art.width, art.height))

    # Background: the art blurred to a wash, tinted toward the shade so
    # text-color, picked for the art, still reads on it.
    canvas = cover(art, W, H).filter(ImageFilter.GaussianBlur(40)).convert("RGBA")
    canvas = Image.alpha_composite(canvas, Image.new("RGBA", (W, H), shade + (90,)))

    # The tile, uncropped and inset on the right, rounded like the page's card.
    th = H - PAD * 2
    tw = round(art.width * th / art.height)
    tx = W - PAD - tw
    shadow = layer()
    ImageDraw.Draw(shadow).rounded_rectangle((tx, PAD + 8, tx + tw, PAD + th + 8),
                                             radius=TILE_RADIUS, fill=(0, 0, 0, 90))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(16)))
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), radius=TILE_RADIUS, fill=255)
    canvas.paste(art.resize((tw, th), Image.LANCZOS), (tx, PAD), mask)

    # Text block, vertically centred in the space left of the tile.
    measure = ImageDraw.Draw(canvas)
    lines = wrap_balanced(measure, meta["title"], title_font, tx - PAD * 2)[:3]
    y = (H - (len(lines) * TITLE_LEADING + 60)) // 2 - 30

    text = layer()
    draw = ImageDraw.Draw(text)
    if meta.get("sub-header"):
        tracked(draw, (PAD, y), str(meta["sub-header"]).upper(), eyebrow_font,
                text_rgb + (170,), tracking=26 * 0.3)
    y += 50
    for line in lines:
        draw.text((PAD, y), line, font=title_font, fill=text_rgb)
        y += TITLE_LEADING

    count = f"{len(meta.get('resources') or [])} Resources"
    pill_w = draw.textlength(count, font=count_font) + 48
    pill = layer()
    ImageDraw.Draw(pill).rounded_rectangle((PAD, y + 24, PAD + pill_w, y + 84),
                                           radius=14, fill=shade + (153,))
    canvas = Image.alpha_composite(canvas, pill)
    canvas = Image.alpha_composite(canvas, text)
    ImageDraw.Draw(canvas).text((PAD + 24, y + 54), count, font=count_font,
                                fill=on_shade, anchor="lm")

    canvas.convert("RGB").save(out_path, "JPEG", quality=85, optimize=True, progressive=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for path in sorted(COLLECTIONS.glob("*.markdown")):
        meta = front_matter(path)
        if meta.get("published") is False:
            continue
        render(meta, OUT / f"{path.stem}.jpg")
        print(f"wrote img/og/collection/{path.stem}.jpg")


if __name__ == "__main__":
    main()
