import DOMPurify from "dompurify";

/**
 * Sanitizes user-derived HTML/SVG before it touches the DOM (cell values,
 * document text, SVG previews, etc.) — never render such content with
 * dangerouslySetInnerHTML unsanitized.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // No DOM to sanitize against on the server — strip all tags conservatively
    // rather than ever emitting unsanitized markup.
    return dirty.replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(dirty);
}

/**
 * Sanitizes untrusted SVG source before it's ever handed to an image
 * decoder (`<img>`/`createImageBitmap`) — strips `<script>`, event-handler
 * attributes, and other executable constructs using DOMPurify's dedicated
 * SVG profile (the default HTML profile doesn't recognize SVG-only
 * elements like `<path>`/`<filter>` as safe, so it isn't the right config
 * here). This is defense in depth, not the only guard: `<img>`-based
 * decoding already never executes embedded scripts regardless (verified
 * with a real `<script>` payload — see PROJECT_LOG.md's Image engine
 * section), so this also guards against non-script risks (e.g. filter-based
 * DoS payloads, external resource references).
 */
export function sanitizeSvg(dirty: string): string {
  if (typeof window === "undefined") {
    return dirty.replace(/<[^>]*>/g, "");
  }
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
}

/** Strips control characters from plain text pulled out of a file before display. */
export function sanitizeText(value: string): string {
  let result = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    const isControlChar = (code >= 0 && code <= 8) || (code >= 14 && code <= 31) || code === 127;
    if (isAllowedWhitespace || !isControlChar) {
      result += value[i];
    }
  }
  return result;
}
