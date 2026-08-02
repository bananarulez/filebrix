import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Reads a KMZ — a zipped KML, and what Google Earth actually saves by
 * default — by unpacking it and handing the KML inside to the existing
 * parser.
 *
 * No new dependency: `jszip` is already used for every multi-file download
 * this app produces, and `xml/kml.ts` already does the parsing. This module
 * only decides *which* entry in the archive is the document.
 *
 * Images, icons and overlays packaged alongside the KML are ignored. Those
 * have no GeoJSON equivalent, which is the same limitation the plain KML
 * reader already documents for styling — geometry and feature data convert,
 * presentation doesn't.
 */
export async function kmzToGeoJson(file: File): Promise<unknown> {
  const { default: JSZip } = await import("jszip");

  let archive: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    archive = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new ProcessingError("MALFORMED_FILE", "This file isn't a readable ZIP archive, so it can't be a KMZ.");
  }

  const kmlEntry = pickKmlEntry(archive);
  if (!kmlEntry) {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This ZIP doesn't contain a .kml file, so there's no KMZ document to read."
    );
  }

  const { kmlTextToGeoJson } = await import("../xml/kml");
  return kmlTextToGeoJson(await kmlEntry.async("string"));
}

/**
 * The KMZ spec says the main document is the *first* `.kml` in the archive,
 * and by convention it's called `doc.kml`. Preferring that name and falling
 * back to the first `.kml` found handles both well-formed and sloppily
 * generated archives.
 *
 * Directory entries and macOS `__MACOSX/` resource forks are skipped —
 * zipping a folder on a Mac otherwise produces a phantom `._doc.kml` that
 * would be picked ahead of the real one and fail to parse.
 */
function pickKmlEntry(archive: import("jszip")) {
  const candidates = Object.values(archive.files).filter(
    (entry) =>
      !entry.dir && entry.name.toLowerCase().endsWith(".kml") && !entry.name.startsWith("__MACOSX/")
  );
  return candidates.find((entry) => entry.name.toLowerCase().endsWith("doc.kml")) ?? candidates[0];
}
