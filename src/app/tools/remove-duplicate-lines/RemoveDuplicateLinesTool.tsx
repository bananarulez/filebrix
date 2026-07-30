"use client";

import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { removeDuplicateLines } from "@/engines/developer/textLines";

export function RemoveDuplicateLinesTool() {
  return (
    <TextTransformTool
      inputLabel="Text"
      outputLabel="Result"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Remove duplicates"
      placeholder="Paste text here"
      transform={removeDuplicateLines}
      toolSlug="remove-duplicate-lines"
    />
  );
}
