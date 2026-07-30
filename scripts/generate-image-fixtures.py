"""Generates the Image-engine e2e fixtures under tests/fixtures/image/.
Uses Pillow + piexif (already used for the PDF round's encrypted-fixture
generation, and Pillow was already available for the Parquet round). Run
manually whenever fixtures need to be regenerated:

    python scripts/generate-image-fixtures.py
"""
import os
from PIL import Image, ImageDraw
import piexif

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "image")
os.makedirs(FIXTURES_DIR, exist_ok=True)


def path(name):
    return os.path.join(FIXTURES_DIR, name)


# --- transparent.png: a red circle on a transparent background ---
img = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.ellipse((20, 20, 180, 180), fill=(220, 30, 30, 255))
img.save(path("transparent.png"))
print("wrote transparent.png")

# --- opaque.jpg: plain RGB JPEG, no alpha ---
img = Image.new("RGB", (200, 150), (40, 120, 200))
draw = ImageDraw.Draw(img)
draw.rectangle((20, 20, 100, 80), fill=(255, 200, 0))
img.save(path("opaque.jpg"), quality=90)
print("wrote opaque.jpg")

# --- sample.webp: plain RGB WebP ---
img = Image.new("RGB", (180, 120), (30, 160, 90))
img.save(path("sample.webp"))
print("wrote sample.webp")

# --- exif-oriented.jpg: 100x50, red top-left quadrant, EXIF orientation=6 ---
# Same technique verified empirically before committing to the "browser
# auto-applies orientation" architecture decision (see PROJECT_LOG.md).
img = Image.new("RGB", (100, 50), (0, 0, 255))
for x in range(50):
    for y in range(25):
        img.putpixel((x, y), (255, 0, 0))
exif_bytes = piexif.dump({"0th": {piexif.ImageIFD.Orientation: 6, piexif.ImageIFD.Make: "TestCam"}})
img.save(path("exif-oriented.jpg"), exif=exif_bytes)
print("wrote exif-oriented.jpg")

# --- gps-tagged.jpg: carries real GPS EXIF (Golden Gate Bridge coordinates)
# — used by the privacy audit's "GPS coordinates are read locally and never
# transmitted anywhere" test. Deliberately a real, plausible coordinate
# (not 0,0) so the test can assert on the exact displayed value.
def deg_to_dms_rational(deg_float):
    deg = int(deg_float)
    minutes_float = (deg_float - deg) * 60
    minutes = int(minutes_float)
    seconds = round((minutes_float - minutes) * 60 * 100)
    return [(deg, 1), (minutes, 1), (seconds, 100)]

gps_ifd = {
    piexif.GPSIFD.GPSLatitudeRef: "N",
    piexif.GPSIFD.GPSLatitude: deg_to_dms_rational(37.819929),
    piexif.GPSIFD.GPSLongitudeRef: "W",
    piexif.GPSIFD.GPSLongitude: deg_to_dms_rational(122.478255),
}
img = Image.new("RGB", (100, 50), (0, 200, 0))
gps_exif_bytes = piexif.dump({"0th": {piexif.ImageIFD.Make: "TestCam"}, "GPS": gps_ifd})
img.save(path("gps-tagged.jpg"), exif=gps_exif_bytes)
print("wrote gps-tagged.jpg")

# --- large.png: 3000x2000, cheap-to-generate gradient (perf/responsiveness fixture) ---
img = Image.new("RGB", (3000, 2000))
draw = ImageDraw.Draw(img)
for y in range(0, 2000, 4):
    shade = int(255 * y / 2000)
    draw.rectangle((0, y, 3000, y + 4), fill=(shade, 100, 255 - shade))
img.save(path("large.png"))
print("wrote large.png")

# --- malformed.jpg: truncate a valid JPEG partway through its entropy-coded
# scan data. Corrupting only the tail bytes turned out to be too mild —
# browsers' JPEG decoders are tolerant of a damaged/missing EOI marker and
# will happily decode a slightly-glitched image rather than reject it, which
# defeated the purpose of this fixture. Cutting the file roughly in half
# reliably fails decoding instead, since a real chunk of the scan is missing.
with open(path("opaque.jpg"), "rb") as f:
    valid = f.read()
with open(path("malformed.jpg"), "wb") as f:
    f.write(valid[: len(valid) // 2])
print("wrote malformed.jpg")

print("Done. SVG fixtures are hand-written text files, not generated here.")
