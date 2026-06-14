"""Generate Chrome extension icons: white bg + black translate text."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))

# ── find a CJK-capable font on macOS ──
FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/Supplemental/Noto Sans CJK SC.ttc",
]
FONT_PATH = None
for p in FONT_CANDIDATES:
    if os.path.exists(p):
        FONT_PATH = p
        break

if not FONT_PATH:
    # try to fall back to any .ttc within system fonts
    for root, _dirs, files in os.walk("/System/Library/Fonts"):
        for f in files:
            if f.endswith(".ttc") or f.endswith(".ttf"):
                FONT_PATH = os.path.join(root, f)
                break
        if FONT_PATH:
            break

if not FONT_PATH:
    raise RuntimeError("No usable font found on this system")

# ── Sizes: (px, text) ──
# 16×16 is tiny → single “译” works best
# 48×48 and 128×128 use “翻译” for clarity
SPECS = [
    (16,  "译",  11),
    (48,  "翻译", 22),
    (128, "翻译", 52),
]

for size, text, font_size in SPECS:
    img = Image.new("RGB", (size, size), color="#ffffff")
    draw = ImageDraw.Draw(img)

    font = ImageFont.truetype(FONT_PATH, font_size)

    # measure text
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    # center
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]

    draw.text((x, y), text, fill="#000000", font=font)

    out_path = os.path.join(OUT, f"icon{size}.png")
    img.save(out_path)
    print(f"[OK] {out_path}  ({size}×{size})")
