import { detectFileType } from "@/lib/detect/detectFile";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { parseGeoJsonFile } from "@/engines/geospatial";

export type GeoSourceFormat = "geojson" | "kml" | "kmz" | "gpx" | "shapefile" | "topojson";

/**
 * Format-detecting entry point shared by Geospatial Studio's View and
 * Analyze tabs — pure glue over already-exported parsers, not new parsing
 * logic. Every branch normalizes to GeoJSON, which is the one shape the
 * rest of the engine understands; adding a format means adding a branch
 * here, never changing anything downstream.
 *
 * All the readers are dynamically imported so a tool that only ever sees
 * GeoJSON never pays for shapefile or TopoJSON parsing — and KML/GPX are
 * additionally main-thread-only (DOMParser).
 */
export async function parseAnyGeoFile(file: File): Promise<{ geojson: unknown; sourceFormat: GeoSourceFormat }> {
  const detected = await detectFileType(file);

  if (detected.format === "kml") {
    const { kmlTextToGeoJson } = await import("@/engines/geospatial/xml/kml");
    const geojson = await kmlTextToGeoJson(await file.text());
    return { geojson, sourceFormat: "kml" };
  }

  if (detected.format === "kmz") {
    const { kmzToGeoJson } = await import("@/engines/geospatial/import/kmz");
    return { geojson: await kmzToGeoJson(file), sourceFormat: "kmz" };
  }

  if (detected.format === "shapefile") {
    const { shapefileZipToGeoJson } = await import("@/engines/geospatial/import/shapefile");
    return { geojson: await shapefileZipToGeoJson(file), sourceFormat: "shapefile" };
  }

  if (detected.format === "topojson") {
    const { topoJsonTextToGeoJson } = await import("@/engines/geospatial/import/topojson");
    return { geojson: await topoJsonTextToGeoJson(await file.text()), sourceFormat: "topojson" };
  }

  if (detected.format === "gpx") {
    const { gpxTextToGeoJson } = await import("@/engines/geospatial/xml/gpx");
    const geojson = await gpxTextToGeoJson(await file.text());
    return { geojson, sourceFormat: "gpx" };
  }

  // `detectFileType` only sniffs the first 512 bytes — a GeoJSON file
  // longer than that truncates mid-structure, fails its own JSON.parse
  // check, and falls back to reporting the generic "json" format instead
  // of "geojson" (see matchTextContent in lib/detect/detectFile.ts). Treat
  // "json" as a GeoJSON candidate too rather than rejecting it here:
  // `parseGeoJsonFile` re-parses the *whole* file and already throws its
  // own clear error if it turns out not to be a GeoJSON object.
  if (detected.format === "geojson" || detected.format === "json") {
    const geojson = await parseGeoJsonFile(file);
    return { geojson, sourceFormat: "geojson" };
  }

  throw new ProcessingError(
    "UNSUPPORTED_FORMAT",
    "This doesn't look like a GeoJSON, TopoJSON, KML, KMZ, GPX or zipped Shapefile."
  );
}
