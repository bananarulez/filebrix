import type { FileFormat } from "@/registry/types";

/** Human-readable labels for the Universal File Drop's "Detected: …" line — the raw `FileFormat` codes (`xlsx`, `webp`) aren't meant for that. */
export const FILE_FORMAT_LABELS: Record<FileFormat, string> = {
  csv: "CSV file",
  tsv: "TSV file",
  xlsx: "Excel spreadsheet",
  xls: "Excel spreadsheet (legacy)",
  ods: "OpenDocument spreadsheet",
  json: "JSON file",
  xml: "XML file",
  yaml: "YAML file",
  parquet: "Parquet file",
  arrow: "Arrow file",
  pdf: "PDF document",
  txt: "Text file",
  markdown: "Markdown file",
  html: "HTML file",
  png: "PNG image",
  jpg: "JPEG image",
  webp: "WebP image",
  avif: "AVIF image",
  svg: "SVG image",
  gif: "GIF image",
  heic: "HEIC image",
  geojson: "GeoJSON file",
  kml: "KML file",
  kmz: "KMZ file",
  gpx: "GPX file",
  shapefile: "Shapefile",
  topojson: "TopoJSON file",
  sql: "SQL file",
};

export function describeDetectedFormat(format: FileFormat | "unknown"): string {
  return format === "unknown" ? "Unknown file type" : FILE_FORMAT_LABELS[format];
}
