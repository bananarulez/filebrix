import type { FileFormat } from "@/registry/types";
import { BINARY_SIGNATURES, EXTENSION_MAP, extensionOf } from "./signatures";

export type DetectionConfidence = "signature" | "content" | "extension";

export interface DetectedFile {
  format: FileFormat | "unknown";
  confidence: DetectionConfidence;
}

const HEAD_BYTES = 512;

/**
 * Detects a file's format without ever transmitting it anywhere: reads a
 * small local slice, checks magic bytes, falls back to sniffing decoded
 * text content, and only falls back to the filename extension last.
 */
export async function detectFileType(file: File): Promise<DetectedFile> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());

  const bySignature = BINARY_SIGNATURES.find((signature) => signature.matches(head));
  if (bySignature) return { format: bySignature.format, confidence: "signature" };

  const text = tryDecodeAsText(head);
  if (text) {
    const byContent = matchTextContent(text);
    if (byContent) return { format: byContent, confidence: "content" };
  }

  const extension = extensionOf(file.name);
  const byExtension = extension ? EXTENSION_MAP[extension] : undefined;
  return { format: byExtension ?? "unknown", confidence: "extension" };
}

/** Exported for the Universal File Drop's "unknown file type" fallback — deciding whether it's reasonable to suggest generic text tools at all. */
export function tryDecodeAsText(head: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(head);
    if (hasBinaryControlChars(text)) return null;
    return text;
  } catch {
    return null;
  }
}

/** True if `text` contains control bytes that never appear in real text formats (excludes tab/LF/CR). */
function hasBinaryControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    if (!isAllowedWhitespace && ((code >= 0 && code <= 8) || (code >= 14 && code <= 31))) {
      return true;
    }
  }
  return false;
}

function matchTextContent(text: string): FileFormat | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return matchJsonShape(parsed);
    } catch {
      // Likely truncated by the byte cap — still almost certainly JSON.
      return "json";
    }
  }

  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
    const rootTag = /<([a-zA-Z0-9:_-]+)/.exec(trimmed)?.[1]?.toLowerCase();
    if (rootTag === "kml") return "kml";
    if (rootTag === "gpx") return "gpx";
    if (rootTag === "svg") return "svg";
    return "xml";
  }

  if (looksLikeDelimited(trimmed, "\t")) return "tsv";
  if (looksLikeDelimited(trimmed, ",")) return "csv";

  if (/^(---\s*$|[\w.-]+:\s)/m.test(trimmed)) return "yaml";

  return null;
}

function matchJsonShape(value: unknown): FileFormat {
  // TopoJSON before GeoJSON: both are JSON objects with a `type`, but only
  // TopoJSON's is "Topology", and its geometry lives in `objects`/`arcs`
  // rather than in `features`.
  if (
    value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "Topology" &&
    "objects" in value
  ) {
    return "topojson";
  }
  if (
    value &&
    typeof value === "object" &&
    "type" in value &&
    typeof (value as { type?: unknown }).type === "string" &&
    ["FeatureCollection", "Feature", "Point", "Polygon", "LineString", "MultiPolygon"].includes(
      (value as { type: string }).type
    )
  ) {
    return "geojson";
  }
  return "json";
}

function looksLikeDelimited(text: string, delimiter: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2) return false;
  const counts = lines.slice(0, 5).map((line) => line.split(delimiter).length);
  return counts[0] > 1 && counts.every((count) => count === counts[0]);
}
