"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { trimWhitespace } from "@/engines/developer/textLines";

export function TrimWhitespaceTool() {
  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Trim whitespace"
      placeholder="Paste text here"
      transform={trimWhitespace}
      toolSlug="trim-whitespace"
    />
  );
}
