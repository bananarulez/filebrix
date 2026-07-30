import { detectFileType } from "@/lib/detect/detectFile";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { parseGeoJsonFile } from "@/engines/geospatial";

export type GeoSourceFormat = "geojson" | "kml" | "gpx";

/**
 * Format-detecting entry point shared by Geospatial Studio's View and
 * Analyze tabs — pure glue over three already-exported parsers
 * (`parseGeoJsonFile`, `kmlTextToGeoJson`, `gpxTextToGeoJson`), not new
 * parsing logic. KML/GPX modules are dynamically imported since they're
 * main-thread-only (DOMParser) and shouldn't land in a bundle for a tool
 * that only ever sees GeoJSON.
 */
export async function parseAnyGeoFile(file: File): Promise<{ geojson: unknown; sourceFormat: GeoSourceFormat }> {
  const detected = await detectFileType(file);

  if (detected.format === "kml") {
    const { kmlTextToGeoJson } = await import("@/engines/geospatial/xml/kml");
    const geojson = await kmlTextToGeoJson(await file.text());
    return { geojson, sourceFormat: "kml" };
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
    "This doesn't look like a GeoJSON, KML, or GPX file."
  );
}
