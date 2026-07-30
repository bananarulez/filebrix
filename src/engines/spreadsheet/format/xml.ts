import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { FormatResult } from "./json";

/**
 * Parses via the browser's native DOMParser — deliberately not a
 * third-party library or a hand-rolled parser. DOMParser does not fetch
 * external resources or resolve external entities/DTDs, which is exactly
 * the XXE-resistant behavior this feature needs, from an implementation
 * that's already security-audited by browser vendors. This only runs on
 * the main thread: DOMParser does not exist inside Web Workers.
 */
export function parseXmlOrThrow(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  // Browsers never throw for malformed XML — they embed a <parsererror>
  // element in the returned Document instead. This is the standard
  // cross-browser way to detect it.
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const message = parserError.textContent?.trim() || "This XML is not well-formed.";
    throw new ProcessingError("MALFORMED_FILE", `This isn't valid XML: ${message}`);
  }
  return doc;
}

export function validateXmlText(text: string): FormatResult {
  parseXmlOrThrow(text);
  return { output: "This XML is well-formed." };
}

export function formatXmlText(text: string, indentUnit: string = "  "): FormatResult {
  const doc = parseXmlOrThrow(text);
  const lines: string[] = [];
  serializeNode(doc.documentElement, 0, indentUnit, lines);
  return { output: lines.join("\n") };
}

/**
 * Hand-rolled indentation — XMLSerializer alone doesn't pretty-print.
 * Comments, processing instructions and CDATA are preserved deliberately:
 * unlike the JSON<->XML conversion (which documents dropping them as an
 * acceptable limitation of a lossy shape conversion), a *formatter* should
 * only change insignificant whitespace, not content.
 */
function serializeNode(node: Node, depth: number, indentUnit: string, lines: string[]): void {
  const indent = indentUnit.repeat(depth);

  if (node.nodeType === Node.COMMENT_NODE) {
    lines.push(`${indent}<!--${node.textContent ?? ""}-->`);
    return;
  }

  if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    const pi = node as ProcessingInstruction;
    lines.push(`${indent}<?${pi.target} ${pi.data}?>`);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as Element;
  const attrs = Array.from(element.attributes)
    .map((attr) => ` ${attr.name}="${escapeAttr(attr.value)}"`)
    .join("");
  const children = Array.from(element.childNodes);

  if (children.length === 0) {
    lines.push(`${indent}<${element.tagName}${attrs}/>`);
    return;
  }

  const hasStructuralChildren = children.some(
    (child) =>
      child.nodeType === Node.ELEMENT_NODE ||
      child.nodeType === Node.COMMENT_NODE ||
      child.nodeType === Node.PROCESSING_INSTRUCTION_NODE
  );

  if (!hasStructuralChildren) {
    const inline = children.map(serializeSimpleChild).join("");
    lines.push(`${indent}<${element.tagName}${attrs}>${inline}</${element.tagName}>`);
    return;
  }

  lines.push(`${indent}<${element.tagName}${attrs}>`);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").trim();
      if (text) lines.push(`${indentUnit.repeat(depth + 1)}${escapeText(text)}`);
    } else {
      serializeNode(child, depth + 1, indentUnit, lines);
    }
  }
  lines.push(`${indent}</${element.tagName}>`);
}

function serializeSimpleChild(node: Node): string {
  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    return `<![CDATA[${node.textContent ?? ""}]]>`;
  }
  return escapeText(node.textContent ?? "");
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}
