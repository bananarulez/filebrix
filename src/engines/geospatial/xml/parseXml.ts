import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Parses via the browser's native DOMParser — same rationale as the
 * Spreadsheet engine's XML handling (see CLAUDE.md): DOMParser never
 * fetches external resources or resolves external entities/DTDs, which is
 * exactly the XXE-resistant behavior KML/GPX parsing needs, from an
 * implementation already security-audited by browser vendors. This is
 * deliberately duplicated here rather than imported from the Spreadsheet
 * engine — each engine's XML handling stays self-contained and
 * independently testable. Main-thread-only: DOMParser doesn't exist inside
 * Web Workers.
 */
export function parseXmlOrThrow(text: string, kindLabel: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const message = parserError.textContent?.trim() || `This ${kindLabel} file is not well-formed XML.`;
    throw new ProcessingError("MALFORMED_FILE", `This isn't a valid ${kindLabel} file: ${message}`);
  }
  return doc;
}

export function escapeXmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeXmlAttr(text: string): string {
  return escapeXmlText(text).replace(/"/g, "&quot;");
}
