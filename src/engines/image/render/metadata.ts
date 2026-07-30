export interface MetadataField {
  label: string;
  value: string;
}

export interface ImageMetadataInfo {
  fields: MetadataField[];
  hasGpsData: boolean;
}

/**
 * Curated, human-labeled subset of what `exifr` can extract — not every
 * possible tag, since most files carry only a handful of these and a raw
 * tag dump wouldn't be meaningful to a non-technical user. GPS is called
 * out on its own line (not folded into the generic list) since it's the
 * single most privacy-sensitive field a photo can carry.
 */
const FIELD_LABELS: Record<string, string> = {
  Make: "Camera make",
  Model: "Camera model",
  Software: "Software",
  DateTimeOriginal: "Date taken",
  ModifyDate: "Date modified",
  Orientation: "Orientation (as recorded)",
  ExposureTime: "Exposure time",
  FNumber: "Aperture (f-number)",
  ISO: "ISO",
  FocalLength: "Focal length",
  ColorSpace: "Color space",
};

function formatTagValue(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  if (value instanceof Uint8Array) return `${value.length} bytes`;
  return String(value);
}

/** Reads only TIFF/EXIF/GPS segments — XMP/ICC/IPTC are skipped since this
 * is a display summary, not a full metadata dump, and those segments can be
 * large. No file content is ever sent anywhere; this runs entirely on the
 * bytes already in memory. */
export async function readImageMetadata(file: File): Promise<ImageMetadataInfo> {
  // Dynamic import: exifr only loads when a file is actually dropped on the
  // metadata-viewer/remove-metadata pages, never at module top level (see
  // CLAUDE.md rule 4) — a static top-level import here also turned out to
  // make Next's build-time static-generation pass probe exifr's isomorphic
  // Node/browser code paths, producing spurious "Couldn't load fs/zlib"
  // build warnings even though nothing was broken; the dynamic import
  // avoids that too.
  const exifr = await import("exifr");

  let tags: Record<string, unknown> | undefined;
  try {
    tags = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      ifd1: false,
      interop: false,
      xmp: false,
      icc: false,
      iptc: false,
      mergeOutput: true,
    });
  } catch {
    tags = undefined;
  }

  const fields: MetadataField[] = [];
  if (tags) {
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      const raw = tags[key];
      if (raw === undefined || raw === null || raw === "") continue;
      fields.push({ label, value: formatTagValue(raw) });
    }
  }

  let hasGpsData = false;
  try {
    const gps = await exifr.gps(file);
    if (gps) {
      hasGpsData = true;
      fields.push({ label: "GPS location", value: `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}` });
    }
  } catch {
    // No GPS data present — not an error condition.
  }

  return { fields, hasGpsData };
}
