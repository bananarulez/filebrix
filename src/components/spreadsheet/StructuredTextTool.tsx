"use client";

import { useState } from "react";
import { TextTransformTool, type TransformResult } from "@/components/text-tools/TextTransformTool";
import { RadioOptionGroup } from "@/components/text-tools/RadioOptionGroup";
import { formatJson, minifyJson, parseJsonOrThrow, validateJsonText } from "@/engines/spreadsheet/format/json";
import { formatXmlText, validateXmlText } from "@/engines/spreadsheet/format/xml";
import { jsonValueToXmlText, xmlTextToJsonValue } from "@/engines/spreadsheet/convert/jsonXml";
import { jsonTextToYamlText, yamlTextToJsonText } from "@/engines/spreadsheet/convert/jsonYaml";

/**
 * The nine paste-first JSON/XML/YAML actions Data Studio hosts, grouped by
 * the Studio capability (`AppMode`) each one belongs to:
 * - `edit`:    json-formatter, json-minifier, xml-formatter
 * - `analyze`: json-validator, xml-validator
 * - `convert`: json-to-xml, xml-to-json, json-to-yaml, yaml-to-json
 *
 * Each id is deliberately the owning tool's registry slug, so a tool page
 * deep-linking into the Studio passes its own slug straight through as the
 * locked action (see `SpreadsheetDataApp`'s `locked*Action` props).
 */
export type StructuredTextAction =
  | "json-formatter"
  | "json-minifier"
  | "xml-formatter"
  | "json-validator"
  | "xml-validator"
  | "json-to-xml"
  | "xml-to-json"
  | "json-to-yaml"
  | "yaml-to-json";

type IndentOption = "2" | "4" | "tab";

const INDENT_OPTIONS: { value: IndentOption; label: string }[] = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tab" },
];

const JSON_PLACEHOLDER = '{"example": "paste your JSON here"}';
const XML_PLACEHOLDER = "<root><example>paste your XML here</example></root>";

interface ActionSpec {
  inputLabel: string;
  outputLabel: string;
  acceptFileExtension: string;
  downloadFileExtension: string;
  downloadMimeType: string;
  actionLabel: string;
  placeholder: string;
  /**
   * Registry slug for the Universal File Drop handoff (CLAUDE.md rule 9).
   * Set on exactly the five actions whose standalone components already set
   * it; the four converters never did, and staying faithful to that here
   * keeps this consolidation behaviour-preserving rather than quietly
   * changing which tools claim a handed-off file.
   */
  toolSlug?: string;
  /** Renders the shared indent picker and receives the chosen value. */
  usesIndent?: boolean;
  transform: (text: string, indent: IndentOption) => TransformResult;
}

const ACTIONS: Record<StructuredTextAction, ActionSpec> = {
  "json-formatter": {
    inputLabel: "JSON input",
    outputLabel: "Formatted JSON",
    acceptFileExtension: ".json",
    downloadFileExtension: "json",
    downloadMimeType: "application/json",
    actionLabel: "Format",
    placeholder: JSON_PLACEHOLDER,
    toolSlug: "json-formatter",
    usesIndent: true,
    transform: (text, indent) => formatJson(text, indent === "tab" ? "\t" : Number(indent)),
  },
  "json-minifier": {
    inputLabel: "JSON input",
    outputLabel: "Minified JSON",
    acceptFileExtension: ".json",
    downloadFileExtension: "json",
    downloadMimeType: "application/json",
    actionLabel: "Minify",
    placeholder: JSON_PLACEHOLDER,
    toolSlug: "json-minifier",
    transform: (text) => minifyJson(text),
  },
  "xml-formatter": {
    inputLabel: "XML input",
    outputLabel: "Formatted XML",
    acceptFileExtension: ".xml",
    downloadFileExtension: "xml",
    downloadMimeType: "application/xml",
    actionLabel: "Format",
    placeholder: XML_PLACEHOLDER,
    toolSlug: "xml-formatter",
    usesIndent: true,
    transform: (text, indent) => formatXmlText(text, indent === "tab" ? "\t" : " ".repeat(Number(indent))),
  },
  "json-validator": {
    inputLabel: "JSON input",
    outputLabel: "Result",
    acceptFileExtension: ".json",
    downloadFileExtension: "txt",
    downloadMimeType: "text/plain",
    actionLabel: "Validate",
    placeholder: JSON_PLACEHOLDER,
    toolSlug: "json-validator",
    transform: (text) => validateJsonText(text),
  },
  "xml-validator": {
    inputLabel: "XML input",
    outputLabel: "Result",
    acceptFileExtension: ".xml",
    downloadFileExtension: "txt",
    downloadMimeType: "text/plain",
    actionLabel: "Validate",
    placeholder: XML_PLACEHOLDER,
    toolSlug: "xml-validator",
    transform: (text) => validateXmlText(text),
  },
  "json-to-xml": {
    inputLabel: "JSON input",
    outputLabel: "XML output",
    acceptFileExtension: ".json",
    downloadFileExtension: "xml",
    downloadMimeType: "application/xml",
    actionLabel: "Convert",
    placeholder: JSON_PLACEHOLDER,
    transform: (text) => jsonValueToXmlText(parseJsonOrThrow(text)),
  },
  "xml-to-json": {
    inputLabel: "XML input",
    outputLabel: "JSON output",
    acceptFileExtension: ".xml",
    downloadFileExtension: "json",
    downloadMimeType: "application/json",
    actionLabel: "Convert",
    placeholder: XML_PLACEHOLDER,
    transform: (text) => ({ output: JSON.stringify(xmlTextToJsonValue(text), null, 2) }),
  },
  "json-to-yaml": {
    inputLabel: "JSON input",
    outputLabel: "YAML output",
    acceptFileExtension: ".json",
    downloadFileExtension: "yaml",
    downloadMimeType: "application/x-yaml",
    actionLabel: "Convert",
    placeholder: JSON_PLACEHOLDER,
    transform: (text) => jsonTextToYamlText(text),
  },
  "yaml-to-json": {
    inputLabel: "YAML input",
    outputLabel: "JSON output",
    acceptFileExtension: ".yaml,.yml",
    downloadFileExtension: "json",
    downloadMimeType: "application/json",
    actionLabel: "Convert",
    placeholder: "example: paste your YAML here",
    transform: (text) => yamlTextToJsonText(text, 2),
  },
};

/** Human label for each action, used by Data Studio's own action pickers. */
export const STRUCTURED_TEXT_LABELS: Record<StructuredTextAction, string> = {
  "json-formatter": "JSON Formatter",
  "json-minifier": "JSON Minifier",
  "xml-formatter": "XML Formatter",
  "json-validator": "JSON Validator",
  "xml-validator": "XML Validator",
  "json-to-xml": "JSON to XML",
  "xml-to-json": "XML to JSON",
  "json-to-yaml": "JSON to YAML",
  "yaml-to-json": "YAML to JSON",
};

/**
 * One parameterized component covering all nine of Data Studio's paste-first
 * JSON/XML/YAML actions, replacing nine near-identical `TextTransformTool`
 * wrappers that previously sat colocated next to their own pages — the same
 * "parameterize, don't duplicate" shape `GeoConverterTool` (`kind`) and
 * `DiffTool` (`mode`) already use.
 *
 * Every action is a pure text transform over the Spreadsheet engine's own
 * format/convert modules, so this needs no file pipeline of its own —
 * `TextTransformTool` supplies the textarea-in/textarea-out UI, its own
 * "Open file" affordance, and the only error path (a thrown
 * `ProcessingError`, surfaced via `ErrorPanel`).
 */
export function StructuredTextTool({ action }: { action: StructuredTextAction }) {
  const [indent, setIndent] = useState<IndentOption>("2");
  const spec = ACTIONS[action];

  return (
    <TextTransformTool
      // Remounts on action change so a previous action's input/output/error
      // never leaks into the next one when switching tabs inside the Studio.
      key={action}
      inputLabel={spec.inputLabel}
      outputLabel={spec.outputLabel}
      acceptFileExtension={spec.acceptFileExtension}
      downloadFileExtension={spec.downloadFileExtension}
      downloadMimeType={spec.downloadMimeType}
      actionLabel={spec.actionLabel}
      placeholder={spec.placeholder}
      toolSlug={spec.toolSlug}
      transform={(text) => spec.transform(text, indent)}
      extraControls={
        spec.usesIndent ? (
          <RadioOptionGroup
            legend="Indent size"
            name={`${action}-indent`}
            options={INDENT_OPTIONS}
            value={indent}
            onChange={setIndent}
          />
        ) : undefined
      }
    />
  );
}
