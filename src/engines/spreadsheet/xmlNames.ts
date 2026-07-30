const XML_NAME_START = /[A-Za-z_]/;
const XML_NAME_CHAR = /[A-Za-z0-9_.-]/;

/**
 * Conservative (ASCII-only) sanitizer for turning an arbitrary string (a
 * JSON key or CSV column header) into a valid XML element name. Shared by
 * the tabular CSV<->XML path and the hierarchical JSON<->XML path so both
 * follow the same renaming rule.
 */
export function sanitizeXmlElementName(name: string, fallback = "item"): string {
  if (!name) return fallback;
  let result = "";
  for (let i = 0; i < name.length; i += 1) {
    const char = name[i];
    const allowed = i === 0 ? XML_NAME_START.test(char) : XML_NAME_CHAR.test(char);
    result += allowed ? char : "_";
  }
  // "xml"-prefixed names (case-insensitive) are reserved by the XML spec.
  if (/^xml/i.test(result)) result = `_${result}`;
  return result || fallback;
}
