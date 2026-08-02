/**
 * Two small, pure coordinate lookups that need no library and no file.
 *
 * They live in the engine rather than in a component because they're
 * testable arithmetic with well-known reference answers, and because
 * `CoordinateConverterTool` set the precedent that "geospatial maths on
 * pasted text" is still engine work.
 */

export interface UtmZoneResult {
  zone: number;
  hemisphere: "N" | "S";
  /** The MGRS/UTM latitude band letter, C–X (I and O are skipped). */
  band: string;
  /** e.g. "33N" — the form most tools and EPSG lookups expect. */
  label: string;
  /** EPSG code for this zone's WGS 84 UTM projection. */
  epsg: number;
}

/** Latitude bands run C (80°S) to X (84°N) in 8° steps, skipping I and O to avoid confusion with 1 and 0. */
const BAND_LETTERS = "CDEFGHJKLMNPQRSTUVWX";

/**
 * The UTM zone containing a longitude/latitude.
 *
 * Handles the two irregularities in the grid that a naive `floor((lon+180)/6)+1`
 * gets wrong, and that anyone checking against a real map will notice:
 * - **Zone 32** is widened over southern Norway (56–64°N, 3–12°E).
 * - **Svalbard** (72–84°N) uses zones 31/33/35/37 only, each 12° wide.
 */
export function utmZoneFor(longitude: number, latitude: number): UtmZoneResult {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Longitude and latitude must be numbers.");
  }
  if (latitude < -80 || latitude > 84) {
    // UTM genuinely doesn't cover the poles; UPS does. Saying so beats
    // returning a zone number that means nothing there.
    throw new Error("UTM only covers latitudes from 80°S to 84°N. Polar regions use the UPS grid instead.");
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  let zone = Math.floor((longitude + 180) / 6) + 1;
  if (zone > 60) zone = 60; // exactly +180° would otherwise fall into a 61st zone

  if (latitude >= 56 && latitude < 64 && longitude >= 3 && longitude < 12) zone = 32;
  if (latitude >= 72 && latitude <= 84) {
    if (longitude >= 0 && longitude < 9) zone = 31;
    else if (longitude >= 9 && longitude < 21) zone = 33;
    else if (longitude >= 21 && longitude < 33) zone = 35;
    else if (longitude >= 33 && longitude < 42) zone = 37;
  }

  const hemisphere: "N" | "S" = latitude >= 0 ? "N" : "S";
  const bandIndex = Math.min(Math.floor((latitude + 80) / 8), BAND_LETTERS.length - 1);
  const band = BAND_LETTERS[bandIndex]!;

  // WGS 84 / UTM zones are EPSG:326xx north of the equator and 327xx south.
  const epsg = (hemisphere === "N" ? 32600 : 32700) + zone;

  return { zone, hemisphere, band, label: `${zone}${band}`, epsg };
}

export interface TileResult {
  z: number;
  x: number;
  y: number;
  /** The `{z}/{x}/{y}` path used by every XYZ tile server. */
  path: string;
  /** The tile's own extent, which is what makes the answer checkable on a map. */
  bounds: { west: number; south: number; east: number; north: number };
  /** TMS flips the Y axis; included because half the tooling in this space uses it. */
  tmsY: number;
}

/** Longitude/latitude to a slippy-map tile at a zoom level (the Web Mercator XYZ scheme). */
export function tileFor(longitude: number, latitude: number, zoom: number): TileResult {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(zoom)) {
    throw new Error("Longitude, latitude and zoom must be numbers.");
  }
  if (zoom < 0 || zoom > 24) throw new Error("Zoom must be between 0 and 24.");
  // Web Mercator is undefined at the poles and is conventionally clipped here.
  if (latitude > 85.0511287798 || latitude < -85.0511287798) {
    throw new Error("Web Mercator tiles only cover latitudes from about 85.05°S to 85.05°N.");
  }

  const z = Math.floor(zoom);
  const scale = 2 ** z;
  const latRad = (latitude * Math.PI) / 180;

  const x = Math.min(scale - 1, Math.floor(((longitude + 180) / 360) * scale));
  const y = Math.min(
    scale - 1,
    Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale)
  );

  return {
    z,
    x,
    y,
    path: `${z}/${x}/${y}`,
    bounds: {
      west: (x / scale) * 360 - 180,
      east: ((x + 1) / scale) * 360 - 180,
      north: tileLatitude(y, scale),
      south: tileLatitude(y + 1, scale),
    },
    tmsY: scale - 1 - y,
  };
}

function tileLatitude(y: number, scale: number): number {
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
