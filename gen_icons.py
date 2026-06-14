"""Generate Chrome extension icons: white background + black 'T'."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))

FONT_CANDIDATES = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Arial.ttf",
]
FONT_PATH = None
for p in FONT_CANDIDATES:
    if os.path.exists(p):
        FONT_PATH = p
        break
if not FONT_PATH:
    raise RuntimeError("No usable font found")

SPECS = [
    (16,  "T", 12),
    (48,  "T", 32),
    (128, "T", 80),
]

for size, text, font_size in SPECS:
    img = Image.new("RGB", (size, size), color="#ffffff")
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_PATH, font_size)

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]

    draw.text((x, y), text, fill="#000000", font=font)

    out_path = os.path.join(OUT, "icons", f"icon{size}.png")
    img.save(out_path)
    print(f"[OK] {out_path}  ({size}x{size})")
