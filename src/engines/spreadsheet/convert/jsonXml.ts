import { parseXmlOrThrow } from "../format/xml";
import { sanitizeXmlElementName } from "../xmlNames";

export interface ConvertResult {
  output: string;
  warnings: string[];
}

const ROOT_TAG = "root";

/**
 * Documented rules (README.txt's "explain structural limitations" applied):
 *  - object key -> child element; key starting with "@" -> attribute on
 *    the current element; key "#text" -> direct text content alongside
 *    attributes.
 *  - array value -> repeated sibling elements sharing the key's tag name.
 *  - primitives -> text; null/undefined -> an empty (self-closing) element.
 *  - the root element is always named "root".
 * Every valid JSON value produces valid XML — there's no rejection path
 * here, unlike JSON->CSV.
 */
export function jsonValueToXmlText(value: unknown): ConvertResult {
  const doc = document.implementation.createDocument(null, null, null);
  const root = doc.createElement(ROOT_TAG);
  doc.appendChild(root);
  const warnings: string[] = [];
  appendJsonValue(doc, root, value, warnings);
  return { output: new XMLSerializer().serializeToString(doc), warnings: dedupe(warnings) };
}

function appendJsonValue(doc: XMLDocument, element: Element, value: unknown, warnings: string[]): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    element.appendChild(doc.createTextNode(String(value)));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const child = doc.createElement("item");
      element.appendChild(child);
      appendJsonValue(doc, child, item, warnings);
    }
    return;
  }
  if (typeof value === "object") {
    appendJsonObject(doc, element, value as Record<string, unknown>, warnings);
  }
}

function appendJsonObject(
  doc: XMLDocument,
  element: Element,
  obj: Record<string, unknown>,
  warnings: string[]
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (key === "#text") {
      if (value !== null && value !== undefined) element.appendChild(doc.createTextNode(String(value)));
      continue;
    }
    if (key.startsWith("@")) {
      element.setAttribute(sanitizeXmlElementName(key.slice(1), "attr"), value === null || value === undefined ? "" : String(value));
      continue;
    }

    const tagName = sanitizeXmlElementName(key);
    if (tagName !== key) {
      warnings.push(`Key "${key}" isn't a valid XML element name and was renamed to "${tagName}".`);
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const child = doc.createElement(tagName);
        element.appendChild(child);
        appendJsonValue(doc, child, item, warnings);
      }
    } else {
      const child = doc.createElement(tagName);
      element.appendChild(child);
      appendJsonValue(doc, child, value, warnings);
    }
  }
}

/**
 * Documented rules for the reverse direction:
 *  - element with only text (no attributes/children) -> a plain string;
 *    a genuinely empty element -> null.
 *  - attributes -> "@name" keys.
 *  - repeated same-tag children -> array; a single occurrence -> a plain
 *    value, not a 1-element array. This is a real, unavoidable limitation:
 *    round-tripping can't distinguish "always a list" from "happened to
 *    occur once here" — shape may drift on a second round-trip.
 *  - mixed content (text interleaved between child elements) collapses
 *    into a single "#text" value; its position relative to the children
 *    is lost.
 *  - comments and processing instructions are dropped.
 *  - namespace-prefixed tags are kept literally (e.g. "ns:tag"), not
 *    resolved against their namespace URI.
 *  - every leaf value becomes a string — XML has no native number/boolean
 *    type, so numeric/boolean JSON values are not restored automatically
 *    after a JSON -> XML -> JSON round trip.
 */
export function xmlTextToJsonValue(text: string): unknown {
  const doc = parseXmlOrThrow(text);
  return elementToJsonValue(doc.documentElement);
}

function elementToJsonValue(element: Element): unknown {
  const attributes = Array.from(element.attributes);
  const childElements = Array.from(element.children);
  const textContent = getDirectText(element);

  if (childElements.length === 0 && attributes.length === 0) {
    return textContent.length > 0 ? textContent : null;
  }

  const result: Record<string, unknown> = {};
  for (const attr of attributes) {
    result[`@${attr.name}`] = attr.value;
  }

  if (childElements.length === 0) {
    if (textContent) result["#text"] = textContent;
    return result;
  }

  const groups = new Map<string, unknown[]>();
  for (const child of childElements) {
    const value = elementToJsonValue(child);
    const key = child.tagName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(value);
  }
  for (const [key, values] of groups) {
    result[key] = values.length === 1 ? values[0] : values;
  }

  if (textContent) result["#text"] = textContent;

  return result;
}

function getDirectText(element: Element): string {
  let text = "";
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
      text += child.textContent ?? "";
    }
  }
  return text.trim();
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}
