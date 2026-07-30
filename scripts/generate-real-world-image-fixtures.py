"""Generates image fixtures with properties the hand-drawn ones don't have.

Two gaps this closes, both recorded as unverified assumptions in
PROJECT_LOG.md:

  * animated.webp — the webp-to-jpg / webp-to-png FAQ claims "only a single
    static frame is used", based on general createImageBitmap behaviour and
    never checked against a real animated file. Each frame here is a flat,
    distinct colour so a test can identify *which* frame the browser decoded
    by sampling one pixel: frame 0 red, frame 1 green, frame 2 blue. If the
    claim holds the output is red.

  * photo-large.jpg — the existing "large" image is a gradient that
    compresses to 23 KB, so it never had a realistic memory profile. This is
    6 megapixels of noisy, photographic-ish content that genuinely costs
    ~24 MB decoded (6 MP x RGBA), which is what the engine actually has to
    hold. Deliberately capped at 6 MP rather than 12+: this suite runs on a
    machine already sensitive to resource pressure.

Uses Pillow only, same as the existing generate-image-fixtures.py beside this.

    python scripts/generate-real-world-image-fixtures.py
"""
import os
import random

from PIL import Image, ImageDraw, ImageFilter

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "image")
os.makedirs(FIXTURES_DIR, exist_ok=True)

random.seed(20260730)  # deterministic bytes; a fixture that churns every run is noise


def path(name):
    return os.path.join(FIXTURES_DIR, name)


def report(name):
    print(f"wrote {name} ({os.path.getsize(path(name)):,} bytes)")


# --- animated.webp: 3 frames, each a different flat colour -----------------
# Flat colours (not patterns) so a single-pixel sample anywhere identifies the
# frame unambiguously, with no interpolation or dithering to reason about.
FRAME_COLORS = [(220, 30, 30), (30, 200, 60), (40, 90, 230)]
frames = [Image.new("RGB", (160, 120), color) for color in FRAME_COLORS]
frames[0].save(
    path("animated.webp"),
    format="WEBP",
    save_all=True,
    append_images=frames[1:],
    duration=300,  # ms per frame
    loop=0,
)
report("animated.webp")

# Fail loudly here rather than in a test: if Pillow silently wrote a single
# frame, the fixture proves nothing and the test built on it is a lie.
with Image.open(path("animated.webp")) as check:
    assert getattr(check, "n_frames", 1) == 3, f"expected 3 frames, got {getattr(check, 'n_frames', 1)}"
    assert check.is_animated, "fixture is not animated"
print("  verified: 3 real frames, is_animated=True")


# --- photo-large.jpg: 3000x2000 (6 MP) photographic-ish content ------------
# Smooth colour field + per-pixel noise + blur. The noise is what stops JPEG
# compressing it to near-nothing (the flaw in the old gradient fixture); the
# blur keeps it plausibly photographic rather than pure static, so the encoder
# behaves the way it would on a real photo.
WIDTH, HEIGHT = 3000, 2000
photo = Image.new("RGB", (WIDTH, HEIGHT))
draw = ImageDraw.Draw(photo)
for y in range(0, HEIGHT, 4):
    t = y / HEIGHT
    draw.rectangle(
        (0, y, WIDTH, y + 4),
        fill=(int(40 + 160 * t), int(120 - 60 * t), int(200 - 120 * t)),
    )
for _ in range(240_000):
    x, y = random.randint(0, WIDTH - 1), random.randint(0, HEIGHT - 1)
    r, g, b = photo.getpixel((x, y))
    d = random.randint(-45, 45)
    photo.putpixel((x, y), (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d))))
photo = photo.filter(ImageFilter.GaussianBlur(0.8))
# A few hard-edged shapes give the encoder real high-frequency detail.
draw = ImageDraw.Draw(photo)
for _ in range(40):
    x, y = random.randint(0, WIDTH - 300), random.randint(0, HEIGHT - 300)
    draw.ellipse((x, y, x + random.randint(60, 280), y + random.randint(60, 280)),
                 outline=(250, 250, 240), width=3)
photo.save(path("photo-large.jpg"), quality=82, optimize=True)
report("photo-large.jpg")

with Image.open(path("photo-large.jpg")) as check:
    megapixels = (check.width * check.height) / 1_000_000
    print(f"  verified: {check.width}x{check.height} = {megapixels:.1f} MP "
          f"(~{megapixels * 4:.0f} MB decoded RGBA)")

print("\nAll real-world image fixtures written.")
