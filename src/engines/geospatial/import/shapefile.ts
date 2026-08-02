import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Reads a **zipped** Esri Shapefile into GeoJSON.
 *
 * **Why zipped only.** A shapefile isn't one file: geometry lives in `.shp`,
 * attributes in `.dbf`, the index in `.shx` and the coordinate system in
 * `.prj`. A bare `.shp` has no attributes and no idea where on Earth it is,
 * so accepting one alone would mean silently producing a featureless layer
 * at the wrong coordinates. Practically every shapefile is distributed as a
 * `.zip` of those sidecars, which is also the only form that fits the
 * Studio's one-file drop zone without changing its shape.
 *
 * **The `.prj` is the part that matters.** Shapefiles are usually authored
 * in a projected national grid — Czech data in EPSG:5514, for instance — so
 * the raw coordinates are metres in the hundreds of thousands, not degrees.
 * `shpjs` reads the `.prj` and reprojects to WGS84 through **proj4, which
 * this project already depends on** for the CRS converter, so shapefile
 * support reuses a library that's already vetted and pinned rather than
 * adding a second projection engine.
 *
 * Verified before this module was written, with a fixture authored in
 * EPSG:5514 by an independent library (`scripts/generate-shapefile-fixtures.py`,
 * pyshp): a square around Prague at (-743000, -1044000) metres came back at
 * roughly (14.41, 50.07) degrees, with its `.dbf` attributes intact. A
 * reader that ignored the `.prj` would have returned the raw metres, which
 * is impossible to miss — see `tests/unit/geoShapefile.test.ts`.
 *
 * Read-only on purpose. Writing a shapefile means emitting four files, a
 * zip, DBF's fixed column widths and its 10-character field-name limit —
 * a lossy export that would quietly mangle long property names.
 */
export async function shapefileZipToGeoJson(file: File): Promise<unknown> {
  const { default: shp } = await import("shpjs");

  let parsed: unknown;
  try {
    parsed = await shp(await file.arrayBuffer());
  } catch {
    // shpjs throws a bare Error for "no .shp in this zip" as well as for
    // genuinely corrupt geometry, so both surface as one clear message
    // rather than leaking a library-internal string.
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This ZIP doesn't contain a readable shapefile. It needs at least a .shp and .dbf file inside — and a .prj too, if the data isn't already in latitude/longitude."
    );
  }

  return normalizeLayers(parsed);
}

/**
 * A zip may hold several shapefiles, in which case `shpjs` returns one
 * FeatureCollection per layer. They're merged into a single collection so
 * every downstream tool — the map, the property table, turf operations —
 * sees the one shape it already understands, with the layer name preserved
 * as a property rather than thrown away.
 */
function normalizeLayers(parsed: unknown): unknown {
  if (!Array.isArray(parsed)) return parsed;
  if (parsed.length === 1) return parsed[0];

  const features = parsed.flatMap((layer) => {
    const collection = layer as { fileName?: string; features?: unknown[] };
    const layerName = collection.fileName;
    return (collection.features ?? []).map((feature) => {
      if (!layerName || typeof feature !== "object" || feature === null) return feature;
      const typed = feature as { properties?: Record<string, unknown> | null };
      return { ...typed, properties: { layer: layerName, ...(typed.properties ?? {}) } };
    });
  });

  return { type: "FeatureCollection", features };
}
