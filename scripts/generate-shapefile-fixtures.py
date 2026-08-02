"""
Generates the Shapefile test fixtures, which no JavaScript library in this
repo can produce.

Run manually (not part of any build):

    pip install pyshp
    python scripts/generate-shapefile-fixtures.py

Same reasoning as `generate-real-world-pdf-fixtures.py`: a fixture written by
the same library that reads it proves very little. `pyshp` is an independent
implementation, and the projected fixture below is the one that matters —
it's authored in EPSG:5514 (Krovak, the Czech national grid), so a reader
that ignores the `.prj` sidecar produces coordinates in the hundreds of
thousands of metres instead of degrees, which is impossible to miss.

Outputs (each a .zip, because that's how shapefiles are actually
distributed — four sidecar files travelling together):

  tests/fixtures/geo/shapefile-wgs84.zip      points already in lon/lat
  tests/fixtures/geo/shapefile-krovak.zip     polygon in EPSG:5514, needs reprojecting
  tests/fixtures/geo/shapefile-no-prj.zip     no .prj at all — coordinates must be left alone
  tests/fixtures/geo/not-a-shapefile.zip      a zip with no .shp inside
"""

import io
import os
import zipfile

import shapefile  # pyshp

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "geo")

# EPSG:5514 as WKT, which is what a real .prj sidecar contains. Matches the
# curated definition in src/engines/geospatial/ops/crsRegistry.ts.
KROVAK_PRJ = (
    'PROJCS["S-JTSK_Krovak_East_North",'
    'GEOGCS["GCS_S_JTSK",DATUM["D_S_JTSK",SPHEROID["Bessel_1841",6377397.155,299.1528128]],'
    'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],'
    'PROJECTION["Krovak"],'
    'PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],'
    'PARAMETER["Pseudo_Standard_Parallel_1",78.5],'
    'PARAMETER["Scale_Factor",0.9999],'
    'PARAMETER["Azimuth",30.28813975277778],'
    'PARAMETER["Longitude_Of_Center",24.83333333333333],'
    'PARAMETER["Latitude_Of_Center",49.5],'
    'PARAMETER["X_Scale",-1.0],PARAMETER["Y_Scale",1.0],PARAMETER["XY_Plane_Rotation",90.0],'
    'UNIT["Meter",1.0]]'
)

WGS84_PRJ = (
    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],'
    'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'
)


def write_zip(name: str, writer_fn, prj: str | None) -> None:
    """Runs pyshp into in-memory buffers and zips the sidecars together."""
    shp, shx, dbf = io.BytesIO(), io.BytesIO(), io.BytesIO()
    with shapefile.Writer(shp=shp, shx=shx, dbf=dbf) as w:
        writer_fn(w)

    stem = name.replace(".zip", "")
    path = os.path.join(OUT_DIR, name)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(f"{stem}.shp", shp.getvalue())
        z.writestr(f"{stem}.shx", shx.getvalue())
        z.writestr(f"{stem}.dbf", dbf.getvalue())
        if prj is not None:
            z.writestr(f"{stem}.prj", prj)
    print(f"wrote {path} ({os.path.getsize(path)} bytes)")


def wgs84_points(w: shapefile.Writer) -> None:
    """Two named points at coordinates that are unmistakably lon/lat already."""
    w.field("name", "C", size=40)
    w.field("rank", "N", decimal=0)
    w.point(14.4378, 50.0755)  # Prague
    w.record("Prague", 1)
    w.point(16.6068, 49.1951)  # Brno
    w.record("Brno", 2)


def krovak_polygon(w: shapefile.Writer) -> None:
    """
    A small square around Prague, expressed in EPSG:5514 metres.

    Prague is roughly (-743_000, -1_044_000) in Krovak. A reader that honours
    the .prj returns ~(14.4, 50.1) degrees; one that doesn't returns the raw
    metres, and the test asserting a lon/lat range catches it immediately.
    """
    w.field("name", "C", size=40)
    x, y = -743000.0, -1044000.0
    d = 1000.0
    w.poly([[[x - d, y - d], [x + d, y - d], [x + d, y + d], [x - d, y + d], [x - d, y - d]]])
    w.record("Prague square")


def no_prj_points(w: shapefile.Writer) -> None:
    """Same as wgs84_points, but shipped without a .prj — coordinates must pass through untouched."""
    w.field("name", "C", size=40)
    w.point(14.4378, 50.0755)
    w.record("Prague")


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    write_zip("shapefile-wgs84.zip", wgs84_points, WGS84_PRJ)
    write_zip("shapefile-krovak.zip", krovak_polygon, KROVAK_PRJ)
    write_zip("shapefile-no-prj.zip", no_prj_points, None)

    # A zip that is definitely not a shapefile, for the error path.
    path = os.path.join(OUT_DIR, "not-a-shapefile.zip")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("readme.txt", "This archive contains no shapefile.")
    print(f"wrote {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
