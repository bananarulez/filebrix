"""Generates the PWA icons under public/icons/.

Self-drawn with Pillow rather than sourced anywhere, so there is no third-party
licence question (CLAUDE.md's dependency rules) and the files are reproducible:

    python scripts/generate-pwa-icons.py
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (37, 99, 235)      # blue-600, the app's primary action colour
FG = (255, 255, 255)

def draw(size, padding_ratio):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.18)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=r, fill=BG)
    # Three stacked "bricks" — the FileBrix mark: a file split into blocks.
    pad = int(size * padding_ratio)
    inner = size - 2 * pad
    gap = max(2, int(inner * 0.09))
    bar_h = (inner - 2 * gap) // 3
    widths = [1.0, 0.72, 0.86]
    for i, w in enumerate(widths):
        y0 = pad + i * (bar_h + gap)
        d.rounded_rectangle(
            (pad, y0, pad + int(inner * w), y0 + bar_h),
            radius=max(2, bar_h // 4), fill=FG,
        )
    return img

for size in (192, 512):
    draw(size, 0.22).save(os.path.join(OUT, f"icon-{size}.png"))
    print(f"wrote icon-{size}.png")

# Maskable: same mark with far more padding, so Android's safe-zone crop
# (which can shave ~20% off each edge) never clips it.
draw(512, 0.30).save(os.path.join(OUT, "icon-maskable-512.png"))
print("wrote icon-maskable-512.png")
