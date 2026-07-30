export interface TextOpResult {
  output: string;
}

/** Escapes every UTF-16 code unit above ASCII (127) as `\uXXXX` — operating
 * on raw code units (not code points) means an astral character's
 * surrogate pair is escaped as two `\uXXXX` sequences, the same
 * representation JavaScript string literals themselves use, and the exact
 * inverse of what `unescapeUnicode` parses back. */
export function escapeUnicode(text: string): TextOpResult {
  let output = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    output += code > 127 ? `\\u${code.toString(16).padStart(4, "0")}` : text[i];
  }
  return { output };
}

export function unescapeUnicode(text: string): TextOpResult {
  const output = text.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );
  return { output };
}
