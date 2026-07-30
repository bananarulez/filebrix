/**
 * The CRS definitions this app can project between, and the search over them.
 *
 * **Why a curated registry rather than a full EPSG database.** proj4 can
 * transform between *any* two coordinate reference systems, but only once it
 * has been handed a definition string for each — it ships built-in
 * definitions for exactly two (EPSG:4326 and EPSG:3857) and knows nothing
 * about the other ~6,000 EPSG codes. Bundling the whole EPSG registry would
 * add megabytes to a browser-only app for codes almost nobody uses, so this
 * ships a curated set covering the global systems plus the national grids
 * most likely to show up in real files, and `parseCustomDefinition` below
 * accepts a pasted proj4 or WKT string for anything not listed. That keeps
 * "any CRS proj4 supports" genuinely reachable without the bundle cost.
 *
 * Definition strings are plain proj4 text — no network lookup, ever.
 */

export interface CrsDefinition {
  /** Canonical identifier, e.g. "EPSG:4326". */
  code: string;
  name: string;
  /** Extra search terms — informal names, national abbreviations, former codes. */
  aliases: string[];
  /** proj4 definition string. */
  proj4: string;
  /** Axis unit, for labelling distances/precision in the UI. */
  unit: "degree" | "metre";
  /** Shown first in pickers as a quick-selection shortcut. */
  common?: boolean;
}

/**
 * Ordered so the four the product spec calls out as "common" sort first;
 * `common: true` is what the UI's quick-select row reads.
 */
export const CRS_DEFINITIONS: CrsDefinition[] = [
  {
    code: "EPSG:4326",
    name: "WGS 84",
    aliases: ["wgs84", "wgs 84", "gps", "lat/lon", "latlon", "lonlat", "geographic", "crs84", "4326"],
    proj4: "+proj=longlat +datum=WGS84 +no_defs +type=crs",
    unit: "degree",
    common: true,
  },
  {
    code: "EPSG:3857",
    name: "WGS 84 / Pseudo-Mercator",
    aliases: ["web mercator", "webmercator", "pseudo-mercator", "spherical mercator", "google", "osm", "900913", "3857"],
    proj4:
      "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
    unit: "metre",
    common: true,
  },
  {
    code: "EPSG:5514",
    name: "S-JTSK / Krovak East North",
    aliases: ["sjtsk", "s-jtsk", "krovak", "jtsk", "czech", "czechia", "slovakia", "5514"],
    proj4:
      "+proj=krovak +lat_0=49.5 +lon_0=24.8333333333333 +alpha=30.2881397527778 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
    common: true,
  },
  {
    code: "EPSG:25833",
    name: "ETRS89 / UTM zone 33N",
    aliases: ["etrs89", "utm 33n", "utm33n", "utm zone 33n", "europe", "25833"],
    proj4: "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
    common: true,
  },

  // --- Other widely-encountered systems -------------------------------------
  {
    code: "EPSG:4258",
    name: "ETRS89 (geographic)",
    aliases: ["etrs89 geographic", "european terrestrial", "4258"],
    proj4: "+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs",
    unit: "degree",
  },
  {
    code: "EPSG:25832",
    name: "ETRS89 / UTM zone 32N",
    aliases: ["utm 32n", "utm32n", "germany", "25832"],
    proj4: "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:25834",
    name: "ETRS89 / UTM zone 34N",
    aliases: ["utm 34n", "utm34n", "25834"],
    proj4: "+proj=utm +zone=34 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:3035",
    name: "ETRS89 / LAEA Europe",
    aliases: ["laea", "lambert azimuthal", "europe equal area", "inspire", "3035"],
    proj4:
      "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:27700",
    name: "OSGB36 / British National Grid",
    aliases: ["osgb", "osgb36", "british national grid", "bng", "uk", "ordnance survey", "27700"],
    proj4:
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:2154",
    name: "RGF93 / Lambert-93",
    aliases: ["lambert93", "lambert-93", "rgf93", "france", "2154"],
    proj4:
      "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:31287",
    name: "MGI / Austria Lambert",
    aliases: ["mgi", "austria", "austria lambert", "31287"],
    proj4:
      "+proj=lcc +lat_0=47.5 +lon_0=13.3333333333333 +lat_1=49 +lat_2=46 +x_0=400000 +y_0=400000 +datum=hermannskogel +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:2180",
    name: "ETRS89 / Poland CS92",
    aliases: ["poland", "cs92", "puwg 1992", "2180"],
    proj4:
      "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:3067",
    name: "ETRS89 / TM35FIN(E,N)",
    aliases: ["finland", "tm35fin", "3067"],
    proj4: "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:3006",
    name: "SWEREF99 TM",
    aliases: ["sweref", "sweref99", "sweden", "3006"],
    proj4: "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:28992",
    name: "Amersfoort / RD New",
    aliases: ["rd new", "rijksdriehoek", "netherlands", "dutch", "28992"],
    proj4:
      "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:3395",
    name: "WGS 84 / World Mercator",
    aliases: ["world mercator", "3395"],
    proj4: "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:4269",
    name: "NAD83 (geographic)",
    aliases: ["nad83", "north american datum", "usa", "4269"],
    proj4: "+proj=longlat +datum=NAD83 +no_defs +type=crs",
    unit: "degree",
  },
  {
    code: "EPSG:3005",
    name: "NAD83 / BC Albers",
    aliases: ["bc albers", "british columbia", "3005"],
    proj4:
      "+proj=aea +lat_0=45 +lon_0=-126 +lat_1=50 +lat_2=58.5 +x_0=1000000 +y_0=0 +datum=NAD83 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:5070",
    name: "NAD83 / Conus Albers",
    aliases: ["conus albers", "us albers", "5070"],
    proj4:
      "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:32633",
    name: "WGS 84 / UTM zone 33N",
    aliases: ["utm 33n wgs84", "32633"],
    proj4: "+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:32632",
    name: "WGS 84 / UTM zone 32N",
    aliases: ["utm 32n wgs84", "32632"],
    proj4: "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:3448",
    name: "JTSK03 / Krovak East North (Slovakia)",
    aliases: ["jtsk03", "slovakia krovak", "3448"],
    proj4:
      "+proj=krovak +lat_0=49.5 +lon_0=24.8333333333333 +alpha=30.2881397527778 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=485.021,169.465,483.839,7.786342,4.397554,4.102655,0 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:7415",
    name: "Amersfoort / RD New + NAP height",
    aliases: ["rd nap", "netherlands height", "7415"],
    proj4:
      "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs +type=crs",
    unit: "metre",
  },
  {
    code: "EPSG:900913",
    name: "Google Mercator (legacy code)",
    aliases: ["google mercator", "legacy web mercator", "900913"],
    proj4:
      "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
    unit: "metre",
  },
];

const BY_CODE = new Map(CRS_DEFINITIONS.map((crs) => [crs.code.toUpperCase(), crs]));

/** The quick-selection shortcuts, in registry order. */
export const COMMON_CRS = CRS_DEFINITIONS.filter((crs) => crs.common);

/**
 * Resolves an identifier to a known definition. Accepts `"EPSG:4326"`,
 * a bare `"4326"`, and the OGC URN/URL forms that appear in real GeoJSON
 * `crs` members (`urn:ogc:def:crs:EPSG::4326`,
 * `http://www.opengis.net/gcs/EPSG/0/4326`), plus `"CRS84"`/`"OGC:CRS84"`,
 * which is WGS 84 in lon/lat order — i.e. EPSG:4326 as GeoJSON already
 * stores it.
 */
export function findCrs(identifier: string): CrsDefinition | null {
  const raw = identifier.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (BY_CODE.has(upper)) return BY_CODE.get(upper)!;

  if (upper === "CRS84" || upper === "OGC:CRS84" || upper.endsWith(":CRS84")) {
    return BY_CODE.get("EPSG:4326") ?? null;
  }

  // Trailing numeric code from a URN/URL/bare-number form.
  const numeric = upper.match(/(\d{3,6})\s*$/)?.[1];
  if (numeric && BY_CODE.has(`EPSG:${numeric}`)) return BY_CODE.get(`EPSG:${numeric}`)!;

  return null;
}

/**
 * Free-text search over code, name and aliases, ranked so an exact code match
 * wins, then a code prefix, then a name match, then an alias match. Used by
 * the CRS picker's search box.
 */
export function searchCrs(query: string, limit = 25): CrsDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...COMMON_CRS];

  const scored: Array<{ crs: CrsDefinition; score: number }> = [];
  for (const crs of CRS_DEFINITIONS) {
    const code = crs.code.toLowerCase();
    const name = crs.name.toLowerCase();
    let score = -1;

    if (code === q || code === `epsg:${q}`) score = 0;
    else if (code.startsWith(q) || code.replace("epsg:", "").startsWith(q)) score = 1;
    else if (name === q) score = 2;
    else if (name.includes(q)) score = 3;
    else if (crs.aliases.some((alias) => alias === q)) score = 4;
    else if (crs.aliases.some((alias) => alias.includes(q))) score = 5;

    if (score >= 0) scored.push({ crs, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.crs.code.localeCompare(b.crs.code))
    .slice(0, limit)
    .map((entry) => entry.crs);
}

/**
 * The full EPSG catalogue — every code proj4 can actually use (8,000+),
 * lazy-loaded as its own chunk the first time someone searches.
 *
 * The curated list above stays the *instant* path: it's in the main bundle,
 * powers the quick-select buttons, and answers `findCrs`/`searchCrs`
 * synchronously with zero download. This is the depth behind it — ~1.2 MB
 * raw / ~140 KB gzipped, generated at install time by
 * `scripts/generate-epsg-index.mjs` from the `epsg-index` dev dependency
 * (which is ~16 MB and never ships). Loading it costs one network request to
 * our own origin, and only when the user actually reaches past the common
 * systems.
 */
type EpsgRow = [code: number, name: string, proj4: string, isDegree: 0 | 1];

let fullIndexPromise: Promise<CrsDefinition[]> | null = null;

/** Loads (once) and caches the full EPSG catalogue. */
export async function loadFullCrsIndex(): Promise<CrsDefinition[]> {
  if (!fullIndexPromise) {
    fullIndexPromise = import("./epsgIndex.generated.json")
      .then((module) => (module.default as EpsgRow[]).map(toDefinition))
      .catch((cause) => {
        // Let a later attempt retry rather than caching a permanent failure.
        fullIndexPromise = null;
        throw cause;
      });
  }
  return fullIndexPromise;
}

function toDefinition([code, name, proj4Definition, isDegree]: EpsgRow): CrsDefinition {
  return {
    code: `EPSG:${code}`,
    name,
    aliases: [],
    proj4: proj4Definition,
    unit: isDegree ? "degree" : "metre",
  };
}

/**
 * Full-catalogue search. Curated entries are merged in first and win on
 * duplicate codes, so a common CRS keeps its friendlier aliases and its
 * hand-verified definition rather than being shadowed by the bulk import.
 */
export async function searchAllCrs(query: string, limit = 50): Promise<CrsDefinition[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [...COMMON_CRS];

  const full = await loadFullCrsIndex();
  const curatedFirst = [...CRS_DEFINITIONS, ...full.filter((crs) => !BY_CODE.has(crs.code.toUpperCase()))];

  const scored: Array<{ crs: CrsDefinition; score: number }> = [];
  for (const crs of curatedFirst) {
    const code = crs.code.toLowerCase();
    const bare = code.replace("epsg:", "");
    const name = crs.name.toLowerCase();
    let score = -1;

    if (code === q || bare === q) score = 0;
    else if (bare.startsWith(q)) score = 1;
    else if (name === q) score = 2;
    else if (crs.aliases.some((alias) => alias === q)) score = 3;
    else if (name.includes(q)) score = 4;
    else if (crs.aliases.some((alias) => alias.includes(q))) score = 5;

    if (score >= 0) {
      scored.push({ crs, score });
      // Stop early once there are plenty of exact-ish hits to rank — scanning
      // all 8,000 entries for a two-letter query wastes time nobody sees.
      if (scored.length > limit * 20) break;
    }
  }

  return scored
    .sort((a, b) => a.score - b.score || a.crs.code.localeCompare(b.crs.code, undefined, { numeric: true }))
    .slice(0, limit)
    .map((entry) => entry.crs);
}

/** Resolves a code against the full catalogue, falling back to the curated list. */
export async function findCrsAnywhere(identifier: string): Promise<CrsDefinition | null> {
  const curated = findCrs(identifier);
  if (curated) return curated;

  const numeric = identifier.trim().toUpperCase().match(/(\d{3,6})\s*$/)?.[1];
  if (!numeric) return null;
  const full = await loadFullCrsIndex();
  return full.find((crs) => crs.code === `EPSG:${numeric}`) ?? null;
}

/**
 * Wraps a user-pasted proj4/WKT string as an ad-hoc definition, so a CRS
 * outside the curated registry is still usable. Returns null for empty input;
 * proj4 itself is what ultimately validates the string (see `crs.ts`), since
 * re-implementing its grammar here would be a second, driftable parser.
 */
export function parseCustomDefinition(definition: string): CrsDefinition | null {
  const text = definition.trim();
  if (!text) return null;
  return {
    code: "Custom",
    name: "Custom definition",
    aliases: [],
    proj4: text,
    // Degree-based projections declare it explicitly; everything else in
    // practical use is linear. Only affects UI labelling, never the maths.
    unit: /\+proj=longlat|\+units=deg|GEOGCS/i.test(text) ? "degree" : "metre",
  };
}
