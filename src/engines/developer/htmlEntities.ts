export interface TextOpResult {
  output: string;
}

/** The 5 predefined XML/HTML entities — not reused from
 * `engines/geospatial/xml/parseXml.ts` (which has an equivalent pair
 * scoped to XML serialization) to keep each engine's escaping
 * independently testable and decoupled, matching this codebase's existing
 * XML-handling precedent. `&` must be escaped first, before the entities
 * it introduces (`&lt;` etc.) get escaped a second time. */
const NAMED_ENTITY_ENCODE: [RegExp, string][] = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
  [/'/g, "&#39;"],
];

export function encodeHtmlEntities(text: string): TextOpResult {
  let output = text;
  for (const [pattern, replacement] of NAMED_ENTITY_ENCODE) {
    output = output.replace(pattern, replacement);
  }
  return { output };
}

/** Decodes the 5 predefined named entities plus numeric character
 * references (decimal `&#39;` and hex `&#x27;`) — not the full ~2000-entry
 * HTML named-entity table (`&copy;`, `&nbsp;`, ...), which would need a
 * large lookup table this tool doesn't otherwise need; numeric references
 * cover the common case of arbitrary characters some other tool encoded. */
const NAMED_ENTITY_DECODE: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function decodeHtmlEntities(text: string): TextOpResult {
  const output = text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const codePoint = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITY_DECODE[body] ?? match;
  });
  return { output };
}
