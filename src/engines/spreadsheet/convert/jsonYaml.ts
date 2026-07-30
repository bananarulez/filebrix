import { dump } from "js-yaml";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { parseJsonOrThrow } from "../format/json";
import type { FormatResult } from "../format/json";
import { parseYamlOrThrow } from "../format/yaml";

export function jsonTextToYamlText(text: string): FormatResult {
  const value = parseJsonOrThrow(text);
  try {
    return { output: dump(value, { lineWidth: 100 }) };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not convert this JSON to YAML.";
    throw new ProcessingError("UNSUPPORTED_FORMAT", message);
  }
}

export function yamlTextToJsonText(text: string, indent: number | string = 2): FormatResult {
  const value = parseYamlOrThrow(text);
  return { output: JSON.stringify(value, null, indent) };
}
