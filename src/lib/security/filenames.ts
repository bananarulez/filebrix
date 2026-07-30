const UNSAFE_CHAR_CODES = new Set([
  0x5c, // \
  0x2f, // /
  0x3a, // :
  0x2a, // *
  0x3f, // ?
  0x22, // "
  0x3c, // <
  0x3e, // >
  0x7c, // |
]);

function isControlCode(code: number): boolean {
  return code <= 0x1f;
}

/**
 * Strips path separators and unsafe characters before a name is used as a
 * download filename or ZIP entry name — a malicious file can otherwise
 * carry a name like `../../etc/passwd` or embedded control characters.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  let cleaned = "";
  for (const char of base) {
    const code = char.charCodeAt(0);
    cleaned += UNSAFE_CHAR_CODES.has(code) || isControlCode(code) ? "_" : char;
  }
  cleaned = cleaned.trim();
  return cleaned.length > 0 ? cleaned : "download";
}
