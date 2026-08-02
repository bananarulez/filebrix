import type { FileFormat } from "@/registry/types";

export interface BinarySignature {
  format: FileFormat;
  /** Returns true if `head` (the first bytes of the file) matches this format. */
  matches: (head: Uint8Array) => boolean;
}

function bytesEqual(head: Uint8Array, offset: number, expected: number[]): boolean {
  if (head.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i += 1) {
    if (head[offset + i] !== expected[i]) return false;
  }
  return true;
}

function asciiAt(head: Uint8Array, offset: number, length: number): string {
  return Array.from(head.slice(offset, offset + length))
    .map((byte) => String.fromCharCode(byte))
    .join("");
}

/**
 * Magic-byte checks, most specific first. WebP needs two ranges (RIFF
 * header + WEBP tag at offset 8) so it can't be a flat byte table.
 */
export const BINARY_SIGNATURES: BinarySignature[] = [
  { format: "pdf", matches: (head) => bytesEqual(head, 0, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  {
    format: "png",
    matches: (head) =>
      bytesEqual(head, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  { format: "jpg", matches: (head) => bytesEqual(head, 0, [0xff, 0xd8, 0xff]) },
  { format: "gif", matches: (head) => bytesEqual(head, 0, [0x47, 0x49, 0x46, 0x38]) },
  {
    format: "webp",
    matches: (head) =>
      bytesEqual(head, 0, [0x52, 0x49, 0x46, 0x46]) && asciiAt(head, 8, 4) === "WEBP",
  },
  // Zip-based OOXML/ODF containers (xlsx, ods). A full central-directory
  // parse isn't worth it here — sniffing the first chunk's entry names is a
  // reasonable heuristic since both formats conventionally store a
  // well-known entry (mimetype / [Content_Types].xml) very early.
  {
    format: "xlsx",
    matches: (head) =>
      bytesEqual(head, 0, [0x50, 0x4b, 0x03, 0x04]) &&
      asciiAt(head, 0, head.length).includes("[Content_Types].xml"),
  },
  {
    format: "ods",
    matches: (head) =>
      bytesEqual(head, 0, [0x50, 0x4b, 0x03, 0x04]) &&
      asciiAt(head, 0, head.length).includes("opendocument"),
  },
  // A zipped Esri Shapefile. Listed *after* xlsx/ods because all three are
  // zip containers and those two are matched by their own well-known
  // entries — this one falls through to the generic case of "a zip that
  // contains a .shp member near the start". Same first-chunk heuristic, and
  // the same reasoning: the shapefile reader itself does the authoritative
  // validation when it actually opens the archive.
  {
    // KMZ: a zip whose first chunk names a .kml member. Same heuristic and
    // same ordering rationale as the shapefile entry below it.
    format: "kmz",
    matches: (head) =>
      bytesEqual(head, 0, [0x50, 0x4b, 0x03, 0x04]) && asciiAt(head, 0, head.length).includes(".kml"),
  },
  {
    format: "shapefile",
    matches: (head) =>
      bytesEqual(head, 0, [0x50, 0x4b, 0x03, 0x04]) && asciiAt(head, 0, head.length).includes(".shp"),
  },
  // Parquet files start (and end) with the ASCII magic "PAR1". Checking the
  // header is enough for this quick client-side sniff — the Parquet Viewer
  // itself does the authoritative validation (including the footer) when
  // it actually opens the file.
  { format: "parquet", matches: (head) => bytesEqual(head, 0, [0x50, 0x41, 0x52, 0x31]) },
];

export const EXTENSION_MAP: Record<string, FileFormat> = {
  csv: "csv",
  tsv: "tsv",
  xlsx: "xlsx",
  xls: "xls",
  ods: "ods",
  json: "json",
  geojson: "geojson",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  parquet: "parquet",
  topojson: "topojson",
  arrow: "arrow",
  pdf: "pdf",
  txt: "txt",
  md: "markdown",
  markdown: "markdown",
  html: "html",
  htm: "html",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
  avif: "avif",
  svg: "svg",
  gif: "gif",
  heic: "heic",
  kml: "kml",
  kmz: "kmz",
  gpx: "gpx",
  shp: "shapefile",
  sql: "sql",
};

export function extensionOf(filename: string): string | undefined {
  const match = /\.([a-z0-9]+)$/i.exec(filename);
  return match?.[1]?.toLowerCase();
}
