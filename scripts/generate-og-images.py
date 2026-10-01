#!/usr/bin/env python3
"""Render a 1200x630 share image for each resource collection, after its page tile.

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
PAD = 64
NAVY_BLACK = (0x1F, 0x29, 0x37)
WHITE = (0xFF, 0xFF, 0xFF)

title_font = ImageFont.truetype(str(FONTS / "ZillaSlab-Bold.ttf"), 88)
eyebrow_font = ImageFont.truetype(str(FONTS / "Lato-Bold.ttf"), 26)
count_font = ImageFont.truetype(str(FONTS / "Lato-Bold.ttf"), 30)


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


def cover_top(img):
    # The tile's <img> is absolutely positioned at top/left, so crop from the top.
    scale = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = (img.width - W) // 2
    return img.crop((left, 0, left + W, H))


def scrim(base_rgb):
    # Fades from 55% at the top to nothing by 60% of the height, behind the title.
    mask = Image.new("L", (1, H))
    for y in range(H):
        mask.putpixel((0, y), round(140 * max(0.0, 1 - y / (H * 0.6))))
    layer = Image.new("RGBA", (W, H), base_rgb + (0,))
    layer.putalpha(mask.resize((W, H)))
    return layer


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


def tracked(draw, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def render(meta, out_path):
    text_rgb = hex_rgb(meta.get("text-color") or "#ffffff")
    light_text = is_light(text_rgb)
    shade = NAVY_BLACK if light_text else WHITE

    canvas = cover_top(Image.open(TILES / meta["tile-image"]).convert("RGB")).convert("RGBA")
    canvas = Image.alpha_composite(canvas, scrim(shade))

    # Metadata bar: frosted glass over the image, like the page's backdrop-filter.
    bar_h = 76
    bar_box = (PAD, H - PAD - bar_h, W - PAD, H - PAD)
    bar_mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(bar_mask).rounded_rectangle(bar_box, radius=14, fill=255)
    canvas.paste(canvas.filter(ImageFilter.GaussianBlur(10)), mask=bar_mask)
    bar = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(bar).rounded_rectangle(bar_box, radius=14, fill=shade + (153,))
    canvas = Image.alpha_composite(canvas, bar)

    draw = ImageDraw.Draw(canvas)
    y = PAD - 10
    for line in wrap(draw, meta["title"], title_font, W - PAD * 2)[:2]:
        draw.text((PAD, y), line, font=title_font, fill=text_rgb)
        y += 100

    if meta.get("sub-header"):
        eyebrow = text_rgb + (153,)  # the page sets it at 0.6 opacity
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        tracked(ImageDraw.Draw(overlay), (PAD, y + 14), str(meta["sub-header"]).upper(),
                eyebrow_font, eyebrow, tracking=26 * 0.3)
        canvas = Image.alpha_composite(canvas, overlay)
        draw = ImageDraw.Draw(canvas)

    count = len(meta.get("resources") or [])
    bar_text = NAVY_BLACK if shade == WHITE else WHITE
    draw.text((PAD + 24, bar_box[1] + bar_h / 2), f"{count} Resources",
              font=count_font, fill=bar_text, anchor="lm")

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
