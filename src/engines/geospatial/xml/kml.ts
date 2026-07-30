import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, extractFeatureList, type GeoJsonRecord } from "../ops/shape";
import { escapeXmlAttr, escapeXmlText, parseXmlOrThrow } from "./parseXml";

type TogeojsonModule = typeof import("@tmcw/togeojson");
let togeojsonModulePromise: Promise<TogeojsonModule> | null = null;

/**
 * `@tmcw/togeojson` handles the many real-world KML quirks (folders,
 * ground overlays, gx: extensions, styles) far more completely than a
 * hand-rolled parser would — it takes a `Document` (from DOMParser above),
 * never a string, and never fetches anything itself. Lazy-loaded so it
 * never lands in a bundle for tools that don't touch KML.
 */
async function getTogeojson(): Promise<TogeojsonModule> {
  if (!togeojsonModulePromise) togeojsonModulePromise = import("@tmcw/togeojson");
  return togeojsonModulePromise;
}

export async function kmlTextToGeoJson(text: string): Promise<unknown> {
  const doc = parseXmlOrThrow(text, "KML");
  const rootTag = doc.documentElement?.localName?.toLowerCase();
  if (rootTag !== "kml") {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This doesn't look like a KML file — its root element isn't <kml>."
    );
  }
  const togeojson = await getTogeojson();
  try {
    return togeojson.kml(doc);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new ProcessingError("MALFORMED_FILE", `Could not read this KML file: ${message}`);
  }
}

function formatPosition(position: unknown): string {
  if (!Array.isArray(position)) return "";
  const [lon, lat, elevation] = position;
  return elevation === undefined || elevation === null ? `${lon},${lat}` : `${lon},${lat},${elevation}`;
}

function coordinatesTag(positions: unknown[]): string {
  return `<coordinates>${positions.map(formatPosition).join(" ")}</coordinates>`;
}

function ringTag(ring: unknown[], tag: "outerBoundaryIs" | "innerBoundaryIs"): string {
  return `<${tag}><LinearRing>${coordinatesTag(ring)}</LinearRing></${tag}>`;
}

function polygonTag(rings: unknown[]): string {
  const [outer, ...inner] = rings as unknown[][];
  if (!outer) return "<Polygon/>";
  const innerTags = inner.map((ring) => ringTag(ring, "innerBoundaryIs")).join("");
  return `<Polygon>${ringTag(outer, "outerBoundaryIs")}${innerTags}</Polygon>`;
}

function geometryTag(geometry: GeoJsonRecord | null): string {
  if (!geometry) return "";
  const { type, coordinates } = geometry;
  switch (type) {
    case "Point":
      return `<Point>${coordinatesTag([coordinates])}</Point>`;
    case "MultiPoint":
      return `<MultiGeometry>${(coordinates as unknown[])
        .map((position) => `<Point>${coordinatesTag([position])}</Point>`)
        .join("")}</MultiGeometry>`;
    case "LineString":
      return `<LineString>${coordinatesTag(coordinates as unknown[])}</LineString>`;
    case "MultiLineString":
      return `<MultiGeometry>${(coordinates as unknown[])
        .map((line) => `<LineString>${coordinatesTag(line as unknown[])}</LineString>`)
        .join("")}</MultiGeometry>`;
    case "Polygon":
      return polygonTag(coordinates as unknown[]);
    case "MultiPolygon":
      return `<MultiGeometry>${(coordinates as unknown[]).map((polygon) => polygonTag(polygon as unknown[])).join("")}</MultiGeometry>`;
    case "GeometryCollection":
      return `<MultiGeometry>${((geometry.geometries as unknown[]) ?? [])
        .map((child) => geometryTag(asRecord(child)))
        .join("")}</MultiGeometry>`;
    default:
      return "";
  }
}

function extendedDataTag(properties: GeoJsonRecord | null): string {
  if (!properties) return "";
  const entries = Object.entries(properties).filter(([key]) => key.toLowerCase() !== "name");
  if (entries.length === 0) return "";
  const dataTags = entries
    .map(([key, value]) => {
      const text =
        value === null || value === undefined
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return `<Data name="${escapeXmlAttr(key)}"><value>${escapeXmlText(text)}</value></Data>`;
    })
    .join("");
  return `<ExtendedData>${dataTags}</ExtendedData>`;
}

function placemarkTag(feature: GeoJsonRecord): string {
  const properties = asRecord(feature.properties);
  const name = properties && typeof properties.name === "string" ? properties.name : undefined;
  const nameTag = name ? `<name>${escapeXmlText(name)}</name>` : "";
  const geometry = asRecord(feature.geometry);
  return `<Placemark>${nameTag}${extendedDataTag(properties)}${geometryTag(geometry)}</Placemark>`;
}

/** Hand-rolled rather than DOM-built: this is a deterministic tree write over trusted (already-validated-shape) data, not untrusted-input parsing, so string templating with explicit escaping is simplest and keeps this serializer usable from either thread. */
export function geoJsonToKmlText(root: unknown): string {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }
  const extracted = extractFeatureList(record);
  if (!extracted) {
    const type = typeof record.type === "string" ? record.type : "(missing)";
    throw new ProcessingError("MALFORMED_FILE", `Unrecognized GeoJSON "type": ${type}.`);
  }

  const placemarks = extracted.features
    .map((feature) => {
      const featureRecord = asRecord(feature);
      return featureRecord ? placemarkTag(featureRecord) : "";
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${placemarks}</Document></kml>`;
}
